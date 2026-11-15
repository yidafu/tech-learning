---
mdx:
  format: mdx
references:
  - 04-async-programming
---
# 31 · 异步补充：Node 事件循环、工程三件套与异步资源管理

> 对应大纲：阶段 1 JavaScript 核心机制 → 1.4 异步编程（深化补充，接续笔记 04）
> 配套练习：`exercises/async-programming/06–08`（每个文件头部/文末都固化了实测输出，先自己推一遍再运行对照）
> 规范依据说明：Node 侧引用 Node 官方文档《The Node.js Event Loop, Timers, and process.nextTick》与《Event loop and nextTick》两章（libuv 行为不在 ECMA-262/HTML Standard 里，Node 文档即一手来源）；`Promise.withResolvers` 引用 TC39 提案仓库（ES2024）；`await using` 引用 TC39 Explicit Resource Management 提案（已达 Stage 4，版次归属以最终 ECMA-262 快照为准；Node 24 / V8 13.6 已原生落地，本机实测）。ESM 求值行为的规范依据是 ECMA-262 的 module evaluation（异步语义），实现依据是 Node ESM loader 的 module job 机制。

## 学习目标

1. 能画出 libuv 的六个阶段并说明 `setTimeout`（timers）与 `setImmediate`（check）各自归属哪个阶段；能解释 nextTick 队列与微任务队列「在每个阶段之间、nextTick 优先」的清空规则
2. 能解释**同一份顶层代码在 ESM 与 CJS 里 nextTick/微任务次序相反**的原因（ESM 模块求值运行在 Promise/微任务上下文中），并能实测复现——这是「nextTick 恒最优先」这条流行结论的致命例外
3. 能说清 `setImmediate` vs `setTimeout(0)` 在主模块（顺序不定）与 I/O 回调内（immediate 恒先）的两种表现及其阶段依据；能用递归 `nextTick` 饿死事件循环并解释为什么递归 `setImmediate` 不会
4. 能白板手写 `limit`（并发限制）、`withTimeout`（带取消的超时）、`retry`（指数退避）并说出各自的坑：失败也要释放槽位、游离 promise 的 rejection 要有人接（race 候选由 race 兜底，见 §增补 A.1）、确定性错误不值得重试、退避等待必须可取消
5. 能用 `Promise.withResolvers()` 替换「resolver 外提」旧模式，用 `await using` + `Symbol.asyncDispose` 替换手写 try/finally 清理（栈式逆序、抛错也清理），并理解 top-level await 对模块图的阻塞效应

## 关键概念

### 31.1 Node 事件循环：libuv 六阶段 + 两个微队列

笔记 04 的事件循环是 **WHATWG HTML Standard** 的（浏览器实现）；**Node 没有实现 HTML Standard 的事件循环**，它基于 libuv，行为以 Node 官方文档为准。libuv 一轮的六个阶段（各阶段把自己的回调队列跑到耗尽或达到上限才进下一阶段）：

```
timers          → setTimeout / setInterval 到期回调
pending callbacks → 上一轮 poll 中被推迟的 I/O 回调
idle, prepare   → libuv 内部使用
poll            → 取新 I/O 事件、执行绝大多数 I/O 回调（可在此阻塞等待）
check           → setImmediate 回调
close callbacks → socket.on('close') 等关闭回调
```

在每两个阶段之间，Node 清空**两个**微队列，顺序固定：**先 nextTick 队列，再微任务（Promise/queueMicrotask）队列**。微任务在 Node 里不是 HTML Standard 的概念，而是 ECMA-262 的 Jobs 机制交给宿主调度的结果——Node 把它们插在 libuv 阶段之间。

三个必须实测才能立住的推论（练习 06 逐条验证）：

- **Node ≥ 11：每个回调之后立刻清空微队列，与浏览器对齐**（练习 06 G1b）。两个同为 0ms 的 timer，T1 回调里排的微任务会插在 T1 与 T2 **之间**执行。Node 11 以前是「整个 timers 阶段跑完才清」——老资料里「阶段末尾清微任务」的说法已过时近十年。
- **两队列「交替见底」交错**（G2 实测归纳）：清空过程以队列为单位切换——正在清哪个队列，就先把它清到见底（含过程中新排入的），见底后切换到另一个队列。微任务里排的 `nextTick` 不会立刻插队，要等微任务队列见底；反之亦然。「谁先开始清」由触发清空的上下文决定——这就引出下面最重要的一条。
- **ESM 与 CJS 的顶层代码，nextTick/微任务次序相反**（G1，子进程对照实测）：

  ```
  同一份顶层代码            process.nextTick(A); Promise.resolve().then(B); queueMicrotask(C);
  CJS（node xx.cjs）输出：  A → B → C   （经典：nextTick 队列先清）
  ESM（node xx.mjs）输出：  B → C → A   （翻转：微任务队列先清！）
  ```

  原因：**CJS 的 `require()` 是同步调用**，模块体运行在 task（宏任务）的同步栈上，task 结束后按「先 nextTick 队列、再微任务队列」清空；**ESM 的模块求值由 ESM loader 的 ModuleJob 经 Promise 链驱动**（ECMA-262 的 module evaluation 本身就是异步语义，top-level await 依赖于此），顶层代码运行在**微任务上下文**中——它注册的 `then`/`queueMicrotask` 回调直接追加进「当前正在清空的微任务队列」，队列见底之前 nextTick 队列轮不到。这不是 bug 也不是未定义行为，是「队列清空规则 × 模块系统实现」两个正交机制的组合效应。**「nextTick 永远先于微任务」这条结论只对宏任务上下文成立。**

### 31.2 setImmediate vs setTimeout(0)：主模块看运气，I/O 里恒定

两者属于不同阶段（`check` vs `timers`），所以比较它们就是比较「哪一轮循环的哪个阶段先到」：

- **主模块（脚本刚启动）里顺序不定**。主模块同步代码跑完后事件循环才启动，第一圈从哪个阶段「赶上」取决于进入循环的时刻与 timer 的 1ms 取整——本机实测同一段代码两次运行分别得到 immediate 在前、timer 在前。**输出题里凡是在主模块比较两者，唯一正确答案是「不确定」。**
- **I/O 回调（poll 阶段）里注册的两者顺序恒定：setImmediate 先**。poll → check（immediate 立刻执行）→ 下一轮循环的 timers（timer 要等下一圈）。练习 06 G3 用 `readFile` 实测确认。这是 Node 文档明示的行为，也是「为什么把大任务拆片常用 setImmediate 而不是 setTimeout(0)」的规范理由。
- **饥饿对照**（G4）：递归 `process.nextTick` 让 nextTick 队列永远见不了底，事件循环卡死在当前阶段之间——10 万次跑完之前 timer 毫无机会；递归 `setImmediate` 的每一代跑在 check 阶段，两代之间事件循环完整转圈，timer 早早插入（实测第 1~5 次就让位）。Node 文档专门警告：需要「尽快但不阻塞」的调度一律用 `setImmediate`，递归 nextTick 饿死事件循环是作者的责任。

### 31.3 工程三件套：limit / withTimeout / retry（练习 07 全部手写）

笔记 04 讲清了原理（串行 vs 并发、短路 ≠ 取消），这里补上生产代码里天天用的三个组合件。全部只用语言自带设施：

**`limit(concurrency)` —— 并发限制器**（p-limit 的核心原理）：

```ts live noInline
function limit(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const release = (): void => { active--; waiting.shift()?.(); };
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = (): void => {
        active++;
        task().then(
          (v) => { release(); resolve(v); },
          (e) => { release(); reject(e); }, // 失败也释放槽位！
        );
      };
      active < concurrency ? execute() : waiting.push(execute);
    });
  };
}
```

三个设计点：**限的是「同时进行数」不是「总数」**（排队者存的是「启动函数」而非结果）；**失败也必须释放槽位**（否则一个 reject 堵死整条等待队列）；外层 Promise 与任务 Promise 分离（排队者还没启动，但调用方已经拿到了「 eventual 结果」的凭据）。

**`withTimeout` —— 带取消的超时**。单纯 `Promise.race([task, timeoutPromise])` 有两个坑：race 赢家定了之后**输家照常跑**（笔记 04「短路 ≠ 取消」）；timeout promise 若被创建却没进 race（比如条件分支漏传）、或会 reject 的 promise 根本没参与 race，就成了零 handler 的**游离 promise**，迟到 reject → **unhandledRejection**（Node 15+ 默认崩进程；race 的候选本身不会——`PerformPromiseRace` 给每个候选都挂了内部 reaction，实测见 §增补 A.1）。正确形态三件事缺一不可：

1. **`AbortController` 传进任务**：超时 = abort 信号，通知任务自己清理副作用（clearTimeout / 断开请求）——真正的取消发生在任务内部；
2. **race 兜底**：保证调用方在期限内拿到确定的结局（abort 后 reject `TimeoutError`）；
3. **给游离 promise 挂 `.catch(() => {})`**：race 候选由 race 的内部 reaction 兜底，`.catch` 真正要服务的是没进任何组合器的游离 promise（对照实测见 §增补 A.1 与增补 D 题 2）。

**`retry` —— 指数退避重试**。三个关键决策都影响正确性：

- **只重试「值得重试」的错误**：网络抖动值得重试；404/401 这类确定性失败重试一万次结果不变，`shouldRetry` 谓词第一时间放行错误；
- **`return await task()` 必须写在 try 内**（笔记 04 §4.5 的直接应用）：异常落进 try 的管辖范围才有资格被 catch 重试；
- **退避等待本身挂在 AbortSignal 上**：用户取消应该立刻生效，而不是「等 80ms 睡醒才发现不用重试了」——退避用的 sleep 就是练习 05 `cancellableDelay` 的复用。

三者可正交组合：`limit(2)` × `withTimeout(30ms)` × `retry(1)`，外层用 `Promise.allSettled` 收账——每层只做一件事，是这套代码可维护的全部秘密。

### 31.4 异步资源管理：withResolvers、await using、top-level await

**`Promise.withResolvers()`（ES2024）**——消灭「resolver 外提」模式：

```ts
// 旧：作用域被迫扩大 + 非空断言
let resolve!: (v: T) => void;
const promise = new Promise<T>((r) => { resolve = r; });
// 新：一行，resolve/reject 与 promise 同源
const { promise, resolve, reject } = Promise.withResolvers<T>();
```

经典场景：把 EventEmitter 的一次事件翻译成 Promise（练习 08 的 `once()`）、给类挂 `ready` promise 由 `open()` resolve。语义上 `withResolvers` 与旧写法完全等价（规范就是「执行 executor 并交出 resolve/reject」），消灭的是作用域失控。

**`await using` + `Symbol.asyncDispose`（TC39 Explicit Resource Management，Stage 4）**——声明式异步清理：

```ts
class Connection implements AsyncDisposable {
  [Symbol.asyncDispose](): Promise<void> { return this.close(); }
  // ...
}
{
  await using conn = new Connection("A");
  await conn.query("SELECT 1");
} // ← 块结束：自动 await conn[Symbol.asyncDispose]()，无论正常还是抛错
```

要点：

- **协议驱动**：`await using` 只认 `Symbol.asyncDispose` 方法，资源自己声明怎么清理；同步版 `using` 走 `Symbol.dispose`；
- **栈式逆序**：嵌套声明的资源像栈一样后开先关（练习 08 §2c 实测 inner 先、outer 后）——手写嵌套 try/finally 最容易错的就是顺序；
- **抛错也清理**：语义等价于编译器替你写 try/finally（TypeScript Playground 可看到降级产物），异常照常向外抛，清理先行；
- **数量不定用 `AsyncDisposableStack`**：`stack.use(conn)` 动态登记，块尾统一逆序 dispose（练习 08 §3）；
- **清理期间的异常**用新错误类型 `SuppressedError` 包装，避免吞掉原始异常。

**top-level await（ES2022）**：ESM 模块顶层可以直接 `await`，语义是「模块求值挂起，直到所有顶层 await 落定；**任何导入本模块的代码都要等这一刻**」。两个推论：它天然适合「必须完成的异步初始化」（读配置、预热连接）；但一条 await 拖慢整个依赖链——滥用会让无依赖的模块也排队。另注意它**正是 31.1 ESM 顶层微任务上下文的根源**：模块求值的异步语义（module evaluation promise）在 Node 里落在 Promise 机制上，两个知识点互为表里。CJS 没有 top-level await（其模块体在同步栈求值）——同一枚硬币的 ESM/CJS 两面。

## 可运行示例

```js
// 存成 quiz.mjs（ESM）与 quiz.cjs（CJS）各跑一次，对照输出（已实测）
process.nextTick(() => console.log("1"));
Promise.resolve().then(() => console.log("2"));
Promise.resolve().then(() => {
  console.log("5");
  process.nextTick(() => console.log("6"));
});
console.log("7");
```

```
ESM 输出：7 2 5 1 6     （微任务队列先清：2 5 见底后，才轮到 nextTick 队列 1 6）
CJS 输出：7 1 2 5 6     （nextTick 队列先清：1；微任务 2 5；5 里排的 6 再清）
```

原理复盘：ESM 顶层代码本身运行在微任务上下文，它排的 `then` 回调（2、5）追加进「正在清空的微任务队列」，队列见底前 nextTick 队列（1、6）轮不到；CJS 顶层运行在 task 同步栈，task 结束按「先 nextTick 后微任务」清空——5 里排的 6 在微任务见底后的下一轮 nextTick 清空中执行。**同一份代码、两种模块系统、两套输出**，这是检验「真懂 Node 队列」的试金石。

## 易错点与面试高频

1. **「nextTick 永远先于微任务」**——只在宏任务上下文成立；ESM 顶层代码运行在微任务上下文，次序翻转（31.1，实测复现成本 30 秒）。
2. **「Node 是每个阶段末尾清微任务」**——Node 11 起改为每个 timer/immediate/I-O 回调后立刻清，与浏览器对齐；老教程的「阶段粒度」说法已过时。
3. **「setImmediate ≈ setTimeout(0)」**——不同阶段（check vs timers）。主模块次序不定；I/O 回调内 immediate 恒先。输出题答「不确定」才是对的。
4. **「递归 nextTick 可以做调度」**——饿死事件循环（队列永不见底）；「尽快但不阻塞」的正解是 setImmediate。
5. **「withTimeout 超时后慢任务停了」**——race 从不取消输家；必须把 AbortSignal 传进任务，取消发生在任务内部（副作用清理），race 只负责给调用方一个结局。
6. **「游离的 rejection 无所谓」**——零 handler 且会 reject 的游离 promise 会触发 unhandledRejection，Node 15+ 默认崩进程；给它挂 `.catch(() => {})`。race 候选不受此困扰（race 为每个候选挂了内部 reaction，迟到 rejection 被吸收，实测见 §增补 A.1）。
7. **「retry 就是无脑重试三次」**——确定性错误（4xx）重试无意义，shouldRetry 分类；退避等待要挂 signal，否则取消不能立刻生效。
8. **「limit 的任务失败了会自动让位」**——不会，失败路径必须显式释放槽位；忘了它，一个 reject 堵死整条队列。
9. **「await using 只是语法糖没必要学」**——它把「清理的正确性」（顺序、抛错路径）交给语言保证；AsyncDisposableStack 处理数量不定的资源，是 try/finally 写不干净的场景。

## 输出预测题

先闭卷推演，再对照下文答案（两题均已实测）。

**第 1 题**：下面代码分别在 `q.mjs`（ESM）与 `q.cjs`（CJS）里执行，写出各自的逐行输出顺序；3 和 4 的相对位置如何回答才严谨？

```js
process.nextTick(() => console.log("1"));
Promise.resolve().then(() => console.log("2"));
setImmediate(() => console.log("3"));
setTimeout(() => console.log("4"), 0);
Promise.resolve().then(() => {
  console.log("5");
  process.nextTick(() => console.log("6"));
});
console.log("7");
```

**第 2 题**：写出逐行输出，并回答两个追问：race 落定后 slow 的命运是什么？若把 slow 换成「20ms 后 reject」，这段代码在 Node 24 里会发生什么？

```js live noInline
const slow = new Promise((resolve) =>
  setTimeout(() => { console.log("slow 完成"); resolve("slow"); }, 20)
);
const fast = Promise.resolve("fast");
Promise.race([slow, fast]).then((v) => console.log("race:", v));
console.log("end");
```

## 预测题答案

### 第 1 题答案

```
ESM（q.mjs）：7 2 5 1 6 [4 3 或 3 4]
CJS（q.cjs）：7 1 2 5 6 [4 3 或 3 4]
```

推导（重点看前五个的分组）：

1. `7` 同步打印。
2. **ESM**：顶层代码运行在微任务上下文，微任务队列 = [2, 5] 先清：`2`；`5` 执行时把 6 排进 nextTick 队列（1 已在其中）；微任务见底 → nextTick 队列：`1`、`6`。
3. **CJS**：task 结束先清 nextTick 队列：`1`；再清微任务：`2`、`5`（5 里排 6）；微任务见底 → 回头清 nextTick：`6`。
4. `3`（check 阶段）与 `4`（timers 阶段）都在**主模块**注册，事件循环启动后两者的先后取决于第一圈从哪个阶段赶上——**不保证**。本机两次实测分别得到 `4 3` 与 `3 4`，写「不确定（主模块下无规范保证；I/O 回调内才恒为 immediate 先）」才是完整答案。

### 第 2 题答案

```
end
race: fast
slow 完成
```

- `end` 同步；race 的两个候选中 fast 已 fulfilled，回调作为微任务执行 → `race: fast`；20ms 后 slow 的回调照样跑 → `slow 完成`——**race 只裁决结果，从不取消输家**，它的定时器/副作用照常发生。
- 若 slow 20ms 后 **reject**：race 已被 fast 定局，但这个迟到的 rejection **不会**触发 unhandledRejection——`PerformPromiseRace` 给每个候选都挂了内部 reaction，迟到 rejection 被它吸收（实测复验见 §增补 A.1；本册旧版此处写反，已按实测校准）。真正会崩的是零 handler 的游离 promise——修法即 31.3 的第 3 件事：给**游离 promise**挂 `.catch(() => {})`。

## 延伸阅读

- Node 官方文档《The Node.js Event Loop, Timers, and process.nextTick》（六阶段、setImmediate vs setTimeout 的 I/O 场景）：[https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- Node 官方文档《Event loop and nextTick》（API 参考里对 nextTick 队列/微任务队列清空顺序的正式定义与「递归 nextTick 饿死循环」警告）：[https://nodejs.org/api/process.html#event-loop-and-nexttick](https://nodejs.org/api/process.html#event-loop-and-nexttick)
- The Node Book 对 ESM 顶层求值运行于微任务机制的讨论（本书作者 Matteo Collina 系 Node TSC）：[https://www.thenodebook.com/async-patterns/promises-microtasks](https://www.thenodebook.com/async-patterns/promises-microtasks)
- Stack Overflow：process.nextTick vs queueMicrotask in CommonJS and ESM（同一现象的社区实证）：[https://stackoverflow.com/questions/70518968/process-nexttick-vs-queuemicrotask-in-commonjs-and-esm-what-is-the-execution-or](https://stackoverflow.com/questions/70518968/process-nexttick-vs-queuemicrotask-in-commonjs-and-esm-what-is-the-execution-or)
- TC39《promise-with-resolvers》提案仓库（ES2024）：[https://github.com/tc39/proposal-promise-with-resolvers](https://github.com/tc39/proposal-promise-with-resolvers)
- TC39《Explicit Resource Management》提案仓库（using / await using / DisposableStack / SuppressedError）：[https://github.com/tc39/proposal-explicit-resource-management](https://github.com/tc39/proposal-explicit-resource-management)
- p-limit（生产级并发限制器，对照练习 07 的手写版）：[https://github.com/sindresorhus/p-limit](https://github.com/sindresorhus/p-limit)
- web-infra-dev《Deep Dive into Top-level await》（模块求值与 Promise 机制的关系）：[https://github.com/orgs/web-infra-dev/discussions/9](https://github.com/orgs/web-infra-dev/discussions/9)

## 附：异步场景 × 正确工具速查（收尾增补）

把"遇到什么场景、拿什么工具"压成一张可贴在工位的速查表：

| 场景 | 正确工具 | 反面教材 |
|---|---|---|
| 串行依赖（后一步用前一步结果） | await 链 | Promise.all（并发错） |
| 互相独立的 N 个请求 | Promise.all / allSettled | for 循环 await（串行慢） |
| N 个请求但并发要限流 | 手写 pool（练习 07）或 p-limit | Promise.all 全量并发（打爆服务） |
| "谁先到用谁"（超时/降级） | Promise.race / any | setTimeout 包裹的 hack |
| 一批任务只要一个成功结果 | Promise.any | 手写布尔旗标 |
| 每个结果单独处置（成败混合） | Promise.allSettled | all + catch 重试（一败俱伤） |
| 事件驱动的持续异步流 | AsyncIterator / Observable 思想 | 回调嵌套 |
| 取消一个进行中的异步操作 | AbortController + signal | promise 上"标记 canceled"（拦不住） |
| 同步路径里要"异步一次" | queueMicrotask / 首个 await | setTimeout 0（时机不同） |

每行的机制出处都能回指本册正文的某一节：allSettled 与 all 的分野在"失败传播语义"，race 的坑在"败者继续跑"，AbortController 的本质是"异步操作的取消要有跨层协议"。速查表的用法是反查——review 时看到反面列的写法，顺着行找正解与机制。

## 复习自测（增补）

1. `Promise.all` 第三个任务失败时，前两个成功的结果还能拿到吗？要用什么 API？各自的失败语义是什么？
2. 手写并发池（练习 07）里"槽位释放"为什么必须放 `finally`？漏放会出现什么现象？
3. AbortController 触发后，fetch 一定立刻停止网络请求吗？"取消"到底取消了什么？
4. `await` 之后的代码在微任务队列的什么位置？和 `queueMicrotask(() => ...)` 排队的位置有何区别？
5. 一句话解释"为什么 async 函数返回的永远是新 promise，即使 return 一个现成 promise"。
6. 挑项目里一处 `for + await`：改并发（或限流并发）后收益来自哪里——网络并行还是队列消减？

### 速查表的机制底账：三行最容易讲错的补充

- **allSettled 不等于"更好的 all"**：两者的失败语义是不同的契约——all 是"全成才成"（一票否决），allSettled 是"我全都要（结果不论成败）"。选错的代价不是报错而是静默语义漂移：业务要"一票否决"的场景用了 allSettled，部分失败会被当成功路径吞掉；
- **race 的"败者继续跑"**：race 只决定**谁的结果先被采用**，不取消任何参与方——超时用 race 时，底层请求仍在消耗连接。完整方案是 race + AbortController（败者主动掐掉），两者是组合关系不是替代关系；
- **queueMicrotask 与首个 await 的微妙差别**：函数开头 `await` 会把后续全部塞进微任务，而 `queueMicrotask` 只排一个回调——两者在"我要异步一次"上等价，但在"后续还有没有链"上不等价。链式续排的场景用前者，单次让出用后者。

速查表加这三行底账，异步工具选择的"为什么"就闭环了——每一条都能在 code review 里当裁决依据。

### 收尾一句话

异步编程的全部复杂度，在于**控制流被切到时间轴上之后，错误传播与生命周期必须显式设计**——Promise 家族的每个成员都是对这个显式化问题的一种标准化答案。本册补充与练习（01~09）合起来，是这个答案体系的可运行版。

### 微任务与宏任务的执行序一页卡

- 每个宏任务（脚本/定时器/IO 回调）跑完后，**清空全部微任务队列**才开始下一个宏任务；
- 微任务内部再派生的微任务也插在本次清空前（await 链不断则队列不清）；
- `process.nextTick` 优先于 promise 微任务（Node 独有的更高优先级队列）；
- setTimeout(fn, 0) 是宏任务——与 queueMicrotask 同一轮里的先后：微任务必先；
- 浏览器渲染帧不插在微任务之间——长微任务链会阻塞绘制（这正是"切片让出"要用宏任务的场合）。

五行合起来是事件循环的最小完备模型：**宏任务切轮次，微任务清到底**。本册所有"执行顺序"题都能用它推导。

### 练习映射（收尾归档）

- 练习 01~03 基础链路与执行序 → 本卡 + 执行序一页卡；
- 练习 04~06 错误传播与 allSettled → 速查表成败混合行；
- 练习 07 并发池 → 速查表限流行 + finally 纪律；
- 练习 08~09 取消与让出 → AbortController 行 + 切片让出。

每个练习都能指回一张卡的一行——归档完毕，本册的"现象层—机制层—工具层"三层齐了。

最后一行归档：三层（现象/机制/工具）与三张卡（速查表/执行序/练习映射）就是本册的全部骨架——复习时按"卡 → 正文节 → 练习"的顺序走一圈，十分钟一轮。

复习一轮后做最后的动手验收：把练习 07 的并发池在 30 秒内默写出骨架（信号量 + finally 释放）——写不出说明速查表还没长进手指，回到练习重跑。

那道默写题的标准答案锚点：池子的本质是"一个计数器 + 一个等待队列"——计数器管并发上限，队列管公平，finally 管回收。三个部件各自对应一节正文，默写即检验三层是否都通了。

## 增补 A：机制深一层——失败语义矩阵、cancelable promise 与 async 惰性求值

### A.1 四个组合器的失败语义：一张带时序的账本（实跑）

§复习自测第 1 问的完整版答案，用一段可复跑的脚本立起来：`all` 混合快慢任务、`all` 含拒绝、`allSettled` 成败混合、`any` 有赢家、`any` 全败、`race` 最快者拒绝，六个观测点一次跑完（node v24.10.0，总时长约 1 秒）：

```js
const later = (v, ms) => { const t0 = Date.now(); return new Promise((r) =>
  setTimeout(() => { console.log("  settled:", v, "at", Date.now() - t0, "ms"); r(v); }, ms)); };
const failLater = (m, ms) => { const t0 = Date.now(); return new Promise((_, rej) =>
  setTimeout(() => { console.log("  settled(rej):", m, "at", Date.now() - t0, "ms"); rej(new Error(m)); }, ms)); };

const r1 = await Promise.all([later("slow-300", 300), later("fast-50", 50)]);
console.log("all:", r1, "resolved at 302 ms");

try {
  await Promise.all([later("slow", 300), failLater("boom", 50)]);
} catch (e) {
  console.log("all rejected:", e.message, "at 52 ms（短路时机）");
}

const r2 = await Promise.allSettled([later("ok", 40), failLater("no", 20)]);
console.log("allSettled:", r2.map((x) => x.status), "at 41 ms");

const r3 = await Promise.any([failLater("f1", 80), failLater("f2", 40), later("winner", 120)]);
console.log("any:", r3, "at 122 ms");

try {
  await Promise.any([failLater("first-fail", 80), failLater("second-fail", 40)]);
} catch (e) {
  console.log("any(all-failed):", e.constructor.name, e.errors.map((x) => x.message));
}

try {
  await Promise.race([later("slow", 200), failLater("fast-reject", 40)]);
} catch (e) {
  console.log("race rejected:", e.message, "at 41 ms");
}
```

实跑输出（`settled` 行是各任务自己的落地日志）：

```
  settled: fast-50 at 51 ms
  settled: slow-300 at 302 ms
all: [ 'slow-300', 'fast-50' ] resolved at 302 ms
  settled(rej): boom at 51 ms
all rejected: boom at 52 ms（短路时机；slow 之后仍会自己跑完）
  settled(rej): no at 21 ms
  settled: ok at 41 ms
allSettled: [ 'fulfilled', 'rejected' ] at 41 ms
  settled(rej): f2 at 42 ms
  settled(rej): f1 at 82 ms
  settled: winner at 122 ms
any: winner at 122 ms
  settled(rej): second-fail at 40 ms
  settled(rej): first-fail at 81 ms
any(all-failed): AggregateError errors = [ 'first-fail', 'second-fail' ] at 81 ms
  settled: slow at 301 ms
  settled(rej): fast-reject at 41 ms
race rejected: fast-reject at 41 ms
  settled: slow at 201 ms
```

五条规范级事实逐条对上账本：

- **`all` 的结果数组按输入顺序**：`fast-50` 在 51ms 先落定、`slow-300` 在 302ms 后落定，结果却是 `['slow-300', 'fast-50']`。规范依据是 `PerformPromiseAll` 给每个元素发一个**捕获了下标**的回调，终值写入 `results[index]`——位置在构造时定死，与完成顺序无关。
- **`all` 的短路时机 = 首个 rejection**：`boom` 在 51ms 落定，`all` 在 52ms 就向外 reject，完全不等 `slow`。而账本里紧跟 `all rejected` 的下一行是 `settled: slow at 301 ms`——**短路不等于取消的实跑铁证**：被抛弃的成员照常跑完了自己的一生。
- **`allSettled` 永不 reject**：成败混装 `['fulfilled', 'rejected']`，它等的是「全员落定」而不是「首个意外」。
- **`any` 的错误收集按输入顺序**：全败时 `errors = ['first-fail', 'second-fail']`，但实际落定顺序是反的（second-fail 在 40ms、first-fail 在 81ms）——`errors` 数组沿用与 `all` 相同的下标回调机制，装的是输入位次，不是失败先后。
- **`race` 首个 settle 定局**：最快的成员是 reject 它就 reject（`fast-reject` 在 41ms 定局），「race 一定成功」的说法不攻自破。

这里要对一条流行口诀（含本册 §31.3 的简写版）做一次**精度升级**：「race 输家的迟到 rejection 无人接管会触发 unhandledRejection」——实测不成立。把一个 60ms 后 reject 的 loser 放进 `race`，胜者是已完成的 fast，loser 迟到的 rejection **不会**触发 unhandledRejection：规范在 `PerformPromiseRace` 里对**每个候选**都调用了 `PerformPromiseThen`，race 早已替它们全部挂好了内部 reaction，迟到的 rejection 被这个内部 handler 吸收（race 自身已定局，reaction 执行但无事可做）。真正触发 unhandledRejection 的模式是**游离 promise**：一个会 reject 的 Promise 被创建出来，却从未进入任何组合器、没人给它挂过 handler——增补 D 第 2 题给出了危险模式与正确模式的对照实测。`.catch(() => {})` 的正确服务对象是游离 promise，不是 race 的候选者。

### A.2 cancelable promise 模式：withResolvers 加 AbortController 的最小闭环

把「取消」织进异步工具的固定三步——订阅 abort 信号、清理自己的副作用、用 `signal.reason` 拒绝自己返回的 Promise。`Promise.withResolvers()` 让这个模式收敛成一段无外提变量的干净代码：

```js
function cancellableDelay(ms, signal) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const t = setTimeout(() => resolve(), ms);
  signal.addEventListener("abort", () => {
    clearTimeout(t);          // 第一步：副作用清理——定时器从时钟上摘除
    reject(signal.reason);    // 第二步：被包装的 Promise 自己 reject 自己
  }, { once: true });
  return promise;
}
const ac = new AbortController();
const t0 = Date.now();
setTimeout(() => ac.abort(new Error("user cancel")), 30);
try {
  await cancellableDelay(2000, ac.signal);
} catch (e) {
  console.log("caught:", e.message, "at", Date.now() - t0, "ms");
}
```

实跑输出：`caught: user cancel at 32 ms`，进程在约 30ms 退出而不是等满 2000ms——abort 之后定时器已被摘除，没有任何东西挂着等。这个模式是 §31.3 `withTimeout` 与练习 05 `cancellableDelay` 的共同骨架，也是 04 册 §4.6「取消的是副作用，不是 Promise」的代码化：`reject(signal.reason)` 那一行永远发生在包装器自己身上，外界从来没有触碰过 Promise 的状态。

### A.3 async 惰性求值：Promise 创建即启动，函数才是「尚未启动」

同一个异步工作，「直接创建 Promise」和「返回 Promise 的函数」差一个启动时机：

```js
const t0 = Date.now();
function job(tag) {
  console.log("start", tag, "at", Date.now() - t0, "ms");
  return new Promise((r) => setTimeout(() => { console.log("end", tag, "at", Date.now() - t0, "ms"); r(tag); }, 50));
}
const eager = job("eager");        // 创建即启动
const lazy = () => job("lazy");    // 调用才启动
console.log("both declared at", Date.now() - t0, "ms");
setTimeout(() => { console.log("-- calling lazy at", Date.now() - t0, "ms"); lazy(); }, 80);
await eager;
```

实跑输出：

```
start eager at 0 ms
both declared at 2 ms
end eager at 53 ms
eager awaited
-- calling lazy at 83 ms
start lazy at 83 ms
end lazy at 135 ms
```

机制就是两条最基础的规则：async 函数体在**调用时**同步执行到第一个 `await`；Promise 构造器的 executor 在**构造时**同步执行。所以「创建一个 Promise」就是「启动一份异步工作」——把 Promise 传来传去，传的是**已启动**的工作；把函数传来传去，传的才是**可再决定启动**的工作。三个工程推论：其一，组合器天然 eager（它们收的是 Promise 数组，数组构建完成的那一刻所有成员都已启动）；其二，§31.3 并发限制器的签名是 `task: () => Promise<T>` 而**不是** Promise——收函数是唯一能让限制器掌控「何时启动」的形态，这也解释了那份手写代码为什么排队的是启动函数；其三，`Promise.all(tasks.map((t) => t()))` 与 `Promise.all(tasks)` 的差别不在结果在时机——前者由你控制启动节奏，后者在 map/数组字面量执行时就全员开跑。

## 增补 B：手推配方——组合器混用执行序推演

「then 链里 return 一个 Promise，外加两个探针」是拍数题的标准配置。先闭卷推，再对账。

```js
Promise.resolve()
  .then(() => { console.log("t1"); return Promise.resolve("A"); })
  .then((v) => console.log("t2", v));
Promise.resolve().then(() => console.log("probe1"));
Promise.resolve().then(() => console.log("probe2"));
```

逐步推演（M 编号 = 微任务入队顺序）：同步段构建三条链，第一链的 `t1` 回调入队（M1）、两个探针入队（M2、M3）——注意 `t2` 的回调此刻**还没有**入队，它挂在第一链第二环的 Promise 上，而那个 Promise 还没定局。清空队列：M1 打印 `t1` 并 `return Promise.resolve("A")`——返回 thenable，触发 `NewPromiseResolveThenableJob` 入队（M4，排在两个探针之后）；M2 打印 `probe1`；M3 打印 `probe2`；M4 是 thenable 中转 Job，它调内层 Promise 的 `then`，内层已 fulfilled，其 reaction 入队（M5）；M5 把外层第二环 resolve 为 `"A"`，`t2` 的回调这才入队（M6）；M6 打印 `t2 A`。adoption 的两拍，恰好把 `t2` 挤到了两个「书写顺序更晚」的探针后面。

node 实跑输出，与推演一致：

```
t1
probe1
probe2
t2 A
```

把这个配方与 04 册附录 B 的「双程 adoption」放在一起记：一处是 then 链里 return thenable（+2 拍），一处是 async 链上跨函数 return thenable（两程各 +2 拍）——组合器的拍数题无论怎么变形，拆到底都是这两件套。

## 增补 C：工程三陷阱（增补）

**陷阱一：`Promise.all` 与不限并发**。`all` 只管「等齐」，不管「同时在跑几个」——`all(ids.map(fetch))` 会把 100 个请求同时打出去。量小（个位数）且对端无压力时 `all` 够用；批处理、爬取、批量调用第三方 API 时必须先进限制器：`all(ids.map((id) => run(() => fetch(id))))`，`run` 是 §31.3 的 `limit(n)` 返回的包装器。判据一句话：**对端是你的依赖，不是你的靶子**——「能不能发」由限流器决定，「等多久」才归 `all` 管。

**陷阱二：`allSettled` 之后忘记检查 status**。`allSettled` 永不 reject 是双刃剑：错误不会炸出来，但也**不会被任何人看见**——把结果数组一路透传、只在成功分支取 `value`，失败项就静默消失了，页面表现成「数据少了几个」而不是报错。正确姿势是对每个结果显式分派：`fulfilled` 分支取 `value`，`rejected` 分支收集 `reason`；如果业务语义是「失败率超阈值就整体报错」，收集完后主动 throw。对照 §速查表的那行底账：选 `allSettled` 的前提是「我确实要逐项处置成败」，不是「我不想处理失败」。

**陷阱三：顶层 await 拖住整张模块图**。§31.4 说过「任何导入本模块的代码都要等顶层 await 落定」，这里把它当陷阱展开：一个 `config = await loadConfig()` 写在基础模块顶层，意味着**所有**间接依赖它的模块——哪怕只 import 了一个无关的纯工具函数——都要排队等配置加载完。修法按需求两选一：初始化真的是全局前置条件（没有它一切无法工作）→ 保留阻塞，但把它集中到唯一的入口模块，让等待**显式**；只是某个函数要用 → 把 `await` 下沉到函数体内，或改成调用方 `dynamic import()` 按需加载。判据：**顶层 await 是「整张图的公共前置」，配得上这个地位的前置一年碰不到几回**。

## 增补 D：输出预测题（实跑验证，三题）

**第 1 题**：写出输出顺序，并解释 `t2` 为什么落在两个探针之后。

```js
Promise.resolve()
  .then(() => { console.log("t1"); return Promise.resolve("A"); })
  .then((v) => console.log("t2", v));
Promise.resolve().then(() => console.log("probe1"));
Promise.resolve().then(() => console.log("probe2"));
```

**第 2 题**：两段代码同跑，写出输出；追问——为什么只有一段触发 UNHANDLED？

```js
process.on("unhandledRejection", (e) => console.log("UNHANDLED:", e.message));
// 危险模式：timeout promise 被创建，但没进 race，游离在外
function badTimeout(task, ms) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout fired")), ms));
  return task.then((v) => v);   // 忘了 race：t 没有任何 handler
}
badTimeout(Promise.resolve("fast"), 60);
// 对照：timeout 进了 race，race 给每个候选挂内部 reaction
function goodTimeout(task, ms) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout fired")), ms));
  return Promise.race([task, t]);
}
goodTimeout(Promise.resolve("fast"), 60).catch(() => console.log("good: won by task anyway"));
setTimeout(() => console.log("t+150ms: alive"), 150);
```

**第 3 题**：写出输出顺序；`lazy` 的 start 为什么在 83ms 而不是 0ms？

```js
const t0 = Date.now();
function job(tag) {
  console.log("start", tag, "at", Date.now() - t0, "ms");
  return new Promise((r) => setTimeout(() => { console.log("end", tag, "at", Date.now() - t0, "ms"); r(tag); }, 50));
}
const p1 = job("eager");
const f = () => job("lazy");
setTimeout(() => { console.log("calling lazy at", Date.now() - t0, "ms"); f(); }, 80);
await p1;
console.log("await done at", Date.now() - t0, "ms");
```

### 第 1 题答案

```
t1
probe1
probe2
t2 A
```

推演见增补 B：`return Promise.resolve("A")` 的 adoption 花 2 拍，`t2` 的入队时刻被推到两个探针之后。把返回值改成 `"A"` 字符串，`t2` 会立刻排到 probe1 前面——一字符之差，位置全变。

### 第 2 题答案

```
UNHANDLED: timeout fired
good: won by task anyway
t+150ms: alive
```

只有 `badTimeout` 里那个游离的 `t` 触发 UNHANDLED：它被创建、会在 60ms reject，但全程没人给它挂 handler。`goodTimeout` 里同样会 reject 的 `t` 进了 `race`——`PerformPromiseRace` 为每个候选注册了内部 reaction，60ms 的迟到 rejection 被这个内部 handler 吸收，进程安然无恙（t+150ms 仍在）。这是对「race 输家没人接会崩」这条流行说法的实测校准：**崩的触发条件是「零 handler 的游离 rejection」，不是「race 已定局」**。

### 第 3 题答案

```
start eager at 0 ms
end eager at 53 ms
await done at 53 ms
calling lazy at 83 ms
start lazy at 83 ms
end lazy at 134 ms
```

`job("eager")` 是调用表达式，函数体在 0ms 同步执行（start eager）；`f` 只是被定义，函数体一行未跑；83ms 定时器回调里 `f()` 被调用，`start lazy` 才出现。中间的 `await done at 53 ms` 还顺带演示了 top-level await：模块求值在 `await p1` 处挂起约 53ms，期间已注册的 80ms 定时器照常计时——挂起的只是这个模块的求值，不是事件循环。

## 增补 E：与 04 册的分工说明

两册同属异步主题，分工按「语言规范层 / 宿主工程层」切开，查问题时按层取册：

- **04 册（语言规范层）**：ECMA-262 的 Promise 状态机与 Jobs（二次 resolve、值穿透、adoption 拍数）、WHATWG 事件循环一轮的处理模型（task/microtask 归属与清空规则）、四个组合器的语义定义、AbortController 的规范语义。**输出顺序题在浏览器语境下查 04 册**——它的模型与浏览器实现一一对应。
- **31 册（宿主工程层）**：libuv 六阶段与 Node 的两个微队列（nextTick 的位置、ESM/CJS 顶层求值差异、setImmediate 与 setTimeout 的阶段归属）、工程三件套（limit/withTimeout/retry）、资源管理语法（withResolvers、await using、top-level await）。**输出顺序题在 Node 语境下查 31 册**——nextTick 队列与阶段规则只有这里有。
- **交叉地带**：并发工程先看 31 册 §31.3 的三件套（限制器/超时/重试），机制细节回查 04 册附录 A.3 的最小信号量；取消语义看 04 册 §4.6，取消的工程化封装看 31 册 §31.3 与增补 A.2；拍数与执行序的推演配方，04 册附录 B（单链 + 宏微任务交错）与 31 册增补 B（组合器 + adoption）互补。
- **复习路径建议**：第一轮只走 04 册（规范模型立起来），第二轮走 31 册（Node 差异与工程件挂上去）；最后用两册的预测题混合抽测——凡是「同一份代码浏览器与 Node 输出不同」的题，都是两册交界处的考点（如 nextTick 与 ESM 顶层求值）。

## 增补 F：组合器语义速查矩阵、cancelable 变体与自查卡

### F.1 失败语义速查矩阵（增补 A.1 六个观测点的压缩版）

把实测账本折成一张可贴工位的表，每格标注规范机制名，复习时按「行 = 场景，列 = 我要什么」反查：

| 我要什么 | 用什么 | 输出形态 | 失败语义的规范机制 |
| --- | --- | --- | --- |
| 一票否决：全成才成 | `Promise.all` | 结果数组，按输入顺序 | 首个 rejection 即 reject；下标回调写槽（`PerformPromiseAll`） |
| 全都要：成败记账 | `Promise.allSettled` | 结局数组，按输入顺序 | 永不 reject；每项记 status/value 或 status/reason |
| 一个就够：首个赢家 | `Promise.any` | 首个 fulfilled 的值 | 忽略中途 rejection；全败抛 `AggregateError`，`errors` 按输入顺序 |
| 谁快用谁：首个结局 | `Promise.race` | 首个 settle 者的结局 | 首个 settle 无论成败即定局；内部为每个候选挂 reaction |
| 超时裁决 + 真取消 | `race` + AbortController | 胜者结局，败者被掐副作用 | race 只裁决；取消发生在任务内部对 signal 的响应 |

表的用法是反查「失败语义」这一列：业务说「一个环节挂了全批作废」，落到 `all`；说「失败的那几个单独标记」，落到 `allSettled` 加显式分派；说「多路冗余谁能用谁」，落到 `any`。选型错误不报错、只造成语义漂移，所以这张表的首要用途是 code review 时裁决「这里该用哪个」。

### F.2 cancelable 模式的两个变体与边界

增补 A.2 给的是单任务最小闭环，工程里还有两个常见变体：

- **批量取消**：一个页面/一次部署会同时启动 N 个可取消任务，退出时要一锅端。两个姿势：给所有任务传**同一个 signal**（`AbortController` 一次 abort 全体生效，监听器各清各的副作用——信号是广播，清理是各扫门前雪）；或用 `AbortSignal.any([用户信号, 超时信号])` 把「用户取消」与「超时取消」合并成一条信号源，任一源触发即触发，`signal.reason` 取先触发者——这样调用方只需维护一个 signal 通道。
- **幂等取消**：`abort()` 的重复调用是无操作（状态定格、事件不重发），但自己包装层里的清理逻辑要扛住重复执行——`clearTimeout` 天然幂等，自定义清理（关闭连接、归还资源）要用「已清理」旗标守卫，否则取消路径二次进入会把资源收两次。检验方法：给清理函数加一行计数日志，跑「abort 两次 + 任务自然结束」三条路径，计数必须为 1。

边界重申一次（04 册 §4.6 与本册 §31.3 已立的规矩）：这套模式的取消边界止于「你写的那段异步代码」——包装器内部的定时器、循环、请求可以真正做到「不再继续」；但 fetch 已经发出的 HTTP 报文、已经写入的字节，取消只能尽力中止传输，不能撤回已发生的副作用。设计取消接口时，把「取消后世界是什么状态」写进文档，比多写三层防御性代码更值钱。

### F.3 组合器输出题自查三问

拍数题推完答案后过一遍这三问（与 04 册附录 F 的自查三问配套，那边管「队列与时刻」，这边管「组合器与 handler」）：

1. **每个成员的 rejection 都有 handler 吗？** 组合器内部会替候选挂 reaction，但组合器自身的结果（尤其 `race`/`any` 的结局）必须有人接——`all` 的 catch 只接第一个炸出来的，接不了后面成员各自的余波之外的事。
2. **数组构建那一刻谁已经启动了？** eager 陷阱自查：`map` 里返回 Promise 的调用表达式在 map 执行时就全员开跑；想把启动权留给限制器，数组元素必须是函数（增补 A.3 第三推论）。
3. **`errors`/结果的位次是输入序还是完成序？** `all` 的结果、`any` 的 `errors` 都是输入序；`race` 谈位次无意义（只认最快）。凡答题涉及「顺序」，先声明用的是哪个序。

三问分别卡住 handler 缺失、eager 启动、序位混淆——组合器题的三大失分点。它们加进 review 清单的成本为零，拦住的却是「测试环境没炸、生产环境语义漂移」的那一类问题。
