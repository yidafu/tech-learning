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
4. 能白板手写 `limit`（并发限制）、`withTimeout`（带取消的超时）、`retry`（指数退避）并说出各自的坑：失败也要释放槽位、race 输家的 rejection 要有人接、确定性错误不值得重试、退避等待必须可取消
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

**`withTimeout` —— 带取消的超时**。单纯 `Promise.race([task, timeoutPromise])` 有两个坑：race 赢家定了之后**输家照常跑**（笔记 04「短路 ≠ 取消」）；输家若随后 reject 而 race 已定，没人接 → **unhandledRejection**（Node 15+ 默认崩进程）。正确形态三件事缺一不可：

1. **`AbortController` 传进任务**：超时 = abort 信号，通知任务自己清理副作用（clearTimeout / 断开请求）——真正的取消发生在任务内部；
2. **race 兜底**：保证调用方在期限内拿到确定的结局（abort 后 reject `TimeoutError`）；
3. **给输家挂 `.catch(() => {})`**：接管它迟到的 rejection。

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
6. **「race 输家的 rejection 无所谓」**——无人接管的迟到 rejection 是 unhandledRejection，Node 15+ 默认崩进程；给输家挂 `.catch(() => {})`。
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
- 若 slow 20ms 后 **reject**：race 已被 fast 定局，这个迟到的 rejection 没有任何 handler 接管 → Node 15+ 默认策略下进程以 unhandledRejection **非 0 退出**（除非挂了 `process.on('unhandledRejection')`）。修法即 31.3 的第 3 件事：包装函数里给输家挂 `.catch(() => {})`。

## 延伸阅读

- Node 官方文档《The Node.js Event Loop, Timers, and process.nextTick》（六阶段、setImmediate vs setTimeout 的 I/O 场景）：[https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- Node 官方文档《Event loop and nextTick》（API 参考里对 nextTick 队列/微任务队列清空顺序的正式定义与「递归 nextTick 饿死循环」警告）：[https://nodejs.org/api/process.html#event-loop-and-nexttick](https://nodejs.org/api/process.html#event-loop-and-nexttick)
- The Node Book 对 ESM 顶层求值运行于微任务机制的讨论（本书作者 Matteo Collina 系 Node TSC）：[https://www.thenodebook.com/async-patterns/promises-microtasks](https://www.thenodebook.com/async-patterns/promises-microtasks)
- Stack Overflow：process.nextTick vs queueMicrotask in CommonJS and ESM（同一现象的社区实证）：[https://stackoverflow.com/questions/70518968/process-nexttick-vs-queuemicrotask-in-commonjs-and-esm-what-is-the-execution-or](https://stackoverflow.com/questions/70518968/process-nexttick-vs-queuemicrotask-in-commonjs-and-esm-what-is-the-execution-or)
- TC39《promise-with-resolvers》提案仓库（ES2024）：[https://github.com/tc39/proposal-promise-with-resolvers](https://github.com/tc39/proposal-promise-with-resolvers)
- TC39《Explicit Resource Management》提案仓库（using / await using / DisposableStack / SuppressedError）：[https://github.com/tc39/proposal-explicit-resource-management](https://github.com/tc39/proposal-explicit-resource-management)
- p-limit（生产级并发限制器，对照练习 07 的手写版）：[https://github.com/sindresorhus/p-limit](https://github.com/sindresorhus/p-limit)
- web-infra-dev《Deep Dive into Top-level await》（模块求值与 Promise 机制的关系）：[https://github.com/orgs/web-infra-dev/discussions/9](https://github.com/orgs/web-infra-dev/discussions/9)
