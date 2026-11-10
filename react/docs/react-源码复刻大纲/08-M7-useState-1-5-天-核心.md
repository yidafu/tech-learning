---
title: "M7：useState（1.5 天）⭐核心"
---

> 本文是《2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）》按小节拆分后的续篇，上一部分见 [07-M6-函数组件-1-天.md](07-M6-函数组件-1-天.md)。

### M7：useState（1.5 天）⭐核心

M6 结尾把问题钉死在了这一句话上：**函数组件的状态只能挂在 fiber 上，身份只能靠调用顺序**。本章把它实现出来。目标读完后你应该能不看书写出 useState，并且能向别人完整讲清两件 React 最著名的"规则"为什么成立：**为什么 hooks 不能写在 if 里**、**为什么 setState 会拿到旧值**——答案都在你自己写的这几十行里。

---

#### 1. hooks 链表挂 fiber.memoizedState，以 hookIndex 对齐

##### 1.1 数据结构：一条挂在 fiber 上的链表

真实 React 把每个 hook 存成一个对象，串成单链表挂在 `fiber.memoizedState` 上。我们按同样的形状实现（didact 原版教程用了数组 `fiber.hooks`，功能等价；我们选链表是为了和 `ReactFiberHooks.js` 的真实结构同构，对照路径 A 源码时零翻译成本）：

```text
fiber(App)
  └ memoizedState ──→ hook#0                          hook#1
                       { memoizedState: 0,     next ──→ { memoizedState: 'Ada',
                         queue: [...]  }                 queue: [...], next: null }
```

两个容易混淆的同名字段，先说清楚：`fiber.memoizedState` 指向 **hook 链表的头**；每个 hook 对象自己也有一个 `memoizedState` 字段，存的是**这一个 hook 的状态值**。真实 React 就是这么命名的（fiber 的记忆 = hook 链，hook 的记忆 = state 值），一层套一层。

为什么"身份 = 调用顺序"落到结构上就是链表？因为函数每次执行时，hooks 是**按调用顺序逐个执行**的：第 1 个执行的 useState 负责生成/接上链表第 1 个节点，第 2 个接第 2 个。对齐规则只有一条：**本轮第 N 次 useState 调用 ↔ 旧链（`fiber.alternate.memoizedState`）的第 N 个节点**。`hookIndex` 就是执行时的计数器。

##### 1.2 useState 第一版：先解决"存哪、怎么对齐"

第一版 setState 采取最直白的策略——收到新值立刻写进 hook。闭包问题留到第 4 节引爆，先把骨架立稳。

```js
let wipFiber = null; // M6 埋好的：当前正在执行的函数组件 fiber
let hookIndex = 0;   // M6 埋好的：本次执行中 hook 的调用序号

// 沿旧 fiber 的 hook 链走 index 步，取第 index 个旧 hook；没有则返回 null
function getOldHook(index) {
  const alternate = wipFiber.alternate;
  if (alternate == null || alternate.memoizedState == null) return null; // 首次渲染
  let oldHook = alternate.memoizedState;
  let i = 0;
  while (i < index && oldHook.next != null) {
    oldHook = oldHook.next;
    i++;
  }
  return i === index ? oldHook : null;
}

// 把新 hook 追加到 wipFiber.memoizedState 链表尾部
function appendHook(hook) {
  if (wipFiber.memoizedState == null) {
    wipFiber.memoizedState = hook; // 第一个 hook：成为链表头
  } else {
    let last = wipFiber.memoizedState;
    while (last.next != null) last = last.next;
    last.next = hook; // 后续 hook：接在尾部
  }
}

function useState(initial) {
  // ① 对齐：本轮第 hookIndex 次调用 → 旧链第 hookIndex 个节点
  const oldHook = getOldHook(hookIndex);

  // ② 建 hook：有旧值继承旧值，没有（首次渲染）用 initial
  const hook = {
    memoizedState: oldHook != null ? oldHook.memoizedState : initial,
  };

  // ③ setState：直接赋值版（第 4 节升级为队列版）
  const setState = newState => {
    hook.memoizedState = newState; // 直接写入
    // 触发一轮新的 render→commit：以当前已提交的树为旧树，新开 wipRoot
    // 这四行是"触发调度"的标准模式，第 2 节逐行拆解
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  // ④ 挂链 + 计数：本组件本轮的第 N 个 hook 就位
  appendHook(hook);
  hookIndex++;

  return [hook.memoizedState, setState];
}
```

**第 ① 步，对齐。** `getOldHook` 干的事：去 `wipFiber.alternate`（上一轮的同位置 fiber，M5 的复用机制保证它存在）的 hook 链上数出第 `hookIndex` 个节点。首次渲染 `alternate` 为 null，返回 null。注意"身份"从头到尾没有变量名什么事——useState 返回值解构叫什么都行，对齐只认**序号**。

**第 ② 步，继承。** 新 hook 是每轮 render 新建的（和 fiber 一样，旧对象保持冻结），状态值从旧 hook 抄过来。这一行就是"state 跨渲染存活"的全部实现——存活不是因为有什么魔法存储，而是每次都从上一轮的链上把值搬过来。

**第 ③ 步，setState 先看前一行。** `hook.memoizedState = newState` 是 v1 的全部"状态更新"——直接写。后面那四行 `wipRoot = {...}; nextUnitOfWork = wipRoot; deletions = [];` 是**触发调度**的标准模式，v1 就已经带上（不触发调度，写了状态也没有人重新渲染），它的逐行含义留到第 2 节展开。

**第 ④ 步，挂链。** 每执行一个 useState，链表长一格、计数加一。组件函数执行完毕时，本轮的 hook 链完整挂在新 fiber 上，随这棵 wip 树一起 commit、成为下一轮的"旧链"。

一个组件多个 useState、多个组件各自的 useState，互不干扰：前者靠链上的位置区分，后者靠各自 fiber 的 `memoizedState` 区分（每个函数组件 fiber 一条链）。页面上三个 Counter 就是三个 fiber、三条链。

##### 1.3 嵌套与执行时机（回应 M6 的伏笔）

useState 里完全没出现"组件是谁"的参数，它靠的就是 `wipFiber`——M6 已经论证过：workLoop 逐个驱动组件执行，任意时刻只有一个组件函数在跑，`wipFiber` 永远指向正在执行的那个。所以 `useState` 必须且只能在组件函数执行期间调用（同步调用链里），这也顺便解释了为什么不能在 setTimeout 回调、事件处理器的异步部分里调用 hooks——那时 `wipFiber` 早已指向别处或为 null。

---

#### 2. setState：更新 hook.state，把当前 fiber 树设为新 wipRoot 触发调度

第 1 节 v1 的 setState 里，赋值之外的那几行就是"触发调度"的全部。把它们单独拿出来逐行拆解——这是我们在 `render` / 类组件 `setState` 里反复使用的同一个模式：**以当前已提交的树为旧树，新开一棵 wipRoot，交还给调度循环**：

```js
const setState = newState => {
  hook.memoizedState = newState; // v1：直接写入

  // 以"屏幕上这棵树"为旧树，从根新开一轮 render
  wipRoot = {
    dom: currentRoot.dom,   // 容器不变
    props: currentRoot.props, // 根的 props 不变（children 还是那个根 element）
    alternate: currentRoot, // ★ diff 的"旧"从这来
  };
  nextUnitOfWork = wipRoot; // 交还调度循环（workLoop 在 M3 起就自我续期，这里只需放入工作）
  deletions = [];           // 新一轮 render 的删除清单重新累计
};
```

逐行说清楚这个模式。

**为什么从根开始，而不是从当前组件开始？** 我们的迷你版没有"从某个 fiber 开始局部遍历"的调度能力，一切更新都从根整树重来。听起来低效，实际不亏：render 阶段走的虽是全树，但 M5 的 reconcileChildren 保证绝大多数 fiber 只是"抄旧建新、打 UPDATE 标记"的轻量操作，真正昂贵的 DOM 操作只发生在变化处。真实 React 会从持有更新的 fiber 开始遍历、并用 lane 优先级插队（M3 调度与 M10 优先级的话题），这是 mini 版刻意省略的深水区。

**`nextUnitOfWork = wipRoot` 就够了，不用手动调 workLoop？** 是。M3 的调度循环结尾有 `requestIdleCallback(workLoop)` 自我续期，它永远在空转等待工作——setState 只需要把工作放进 `nextUnitOfWork`，下一次空闲回调自然接手。这就是"触发调度"的全部内涵：**放入工作单元，不直接驱动渲染**。渲染永远由调度器择机执行。

**`deletions = []` 为什么在这里重置？** 和 `render` 里那行同义：每轮 render 的删除清单从空开始累计，commit 时统一消费。忘了这行，上一轮删过的 fiber 会被再删一次（`removeChild` 一个不在文档里的节点直接抛异常）——这是自己写一遍才能体会到的细节。

##### 2.1 一次点击的完整时间线

把 v1 全链路走一遍。组件就绪、用户点击一次，从 fiber 到像素：

```js
function Counter() {
  const [count, setState] = Didact.useState(0);
  return Didact.createElement('h1', {
    onClick: () => setState(count + 1), // 注意：闭包捕获的是本轮 render 的 count
  }, `count: ${count}`);
}
```

| 阶段 | 发生了什么 | 关键数据结构 |
|---|---|---|
| render #1 | `render(element)` 建 wipRoot R1（alternate:null）。workLoop 走到 CounterFiber F1 → `updateFunctionComponent(F1)`：`wipFiber=F1, hookIndex=0` → 执行 `Counter()` → `useState(0)`：`getOldHook(0)` 得 null → 建 `hook0{state:0}` 挂链 → 返回 `[0, setState₀]`。Counter 返回 h1 element → reconcileChildren 生成 H1{PLACEMENT}。commit：append h1；`currentRoot=R1 树` | `F1.memoizedState → h0{state:0}` |
| 用户点击 | 浏览器派发 click → 绑在 h1 上的处理器执行 → `setState₀(0 + 1)`：`hook0.memoizedState = 1`（v1 直接写入）；`wipRoot = R2{alternate: R1}`；`nextUnitOfWork = R2` | `h0.state = 1`（写进了 F1 的旧链） |
| render #2 | workLoop 接手：R2 → reconcileChildren 生成 F2（type 同为 Counter → UPDATE，`dom:null`，`alternate:F1`）→ `updateFunctionComponent(F2)`：`wipFiber=F2, hookIndex=0` → 执行 `Counter()` → `useState(0)`：`getOldHook(0)` 沿 **F1**.memoizedState 取 `h0{state:1}` → 新建 `hook0'{state:1}` 挂到 **F2** → 返回 `[1, setState₂]`。Counter 用 `count=1` 生成新 h1 element → H2{UPDATE, alternate:H1}。commit：`updateDom(H1的dom, 旧props, 新props)` 把文本节点改成 `count: 1`；`currentRoot=R2 树` | `F2.memoizedState → h0'{state:1}` |

把这个表走通，你就掌握了 useState 的全部骨架：**状态沿 alternate 链代代相传，setState 写入旧链上的 hook，下一轮 render 把值搬进新链**。v1 到这里已经能跑验收一的计数器了。但它埋着两颗雷，分别对应 React 两条最著名的规则——先拆第一颗。

---

#### 3. 为什么 hooks 不能写在 if 里——链表错位的文字推演

规则本身你在基础文档见过（"hooks 只能在顶层调用"），现在从实现层推演出它为什么成立。核心只有一个事实：**对齐依据是调用序号，不是变量名**。函数体里第几次执行到 useState，就取旧链第几个节点——一旦两次渲染的"调用序列"不一样，序号就会指向别人的 hook。

构造一个最小出错现场：第一个 hook 有条件地调用，第二个无条件调用。

```js
function Profile(props) {
  let nameState = null;
  if (props.vip) {
    nameState = Didact.useState('Ada'); // ← hook 写在 if 里：错位的根源
  }
  const [age, setState] = Didact.useState(18); // 每次渲染都执行

  const name = nameState != null ? nameState[0] : '游客';
  return Didact.createElement('div', null,
    Didact.createElement('p', null, `姓名：${name}`),
    Didact.createElement('p', null, `年龄：${age}`),
    Didact.createElement('button', { onClick: () => setState(age + 1) }, '长大一岁')
  );
}
```

三轮渲染逐步推演，盯紧每轮链表的内容与代码的读取位置：

**第一轮（vip=true，调用了 2 个 hook）。** 执行顺序：`useState('Ada')` 是第 1 次调用（序号 0）→ 建节点存 `'Ada'`；`useState(18)` 是第 2 次（序号 1）→ 建节点存 `18`。本轮链表：

```text
F1.memoizedState → [ 'Ada' ] → [ 18 ] → null
                     节点#0      节点#1
```

界面：姓名 Ada、年龄 18。一切正常。

**第二轮（vip 变为 false，只调用了 1 个 hook）。** if 不成立，`useState('Ada')` 没执行，唯一执行的 `useState(18)` 成了本轮**第 1 次**调用（序号 0）→ `getOldHook(0)` 沿旧链取**第 0 个节点**——那是上一轮的**姓名节点**，值是 `'Ada'`。于是新 hook 继承的状态不是 18，而是 `'Ada'`：

```text
旧链（F1）:   [ 'Ada' ] → [ 18 ]
               ↑ 被第 0 次调用读走
新链（F2）:   [ 'Ada' ]        ← 这个节点现在是"年龄"的化身
```

界面：姓名"游客"、**年龄显示 "Ada"**。张冠李戴实锤：`age` 变量拿着姓名节点的值在渲染。往下点一次"长大一岁"，`setState(age + 1)` 入队的是 `'Ada' + 1 = 'Ada1'`（字符串拼接），年龄栏开始显示 `Ada1`——错误沿着链表继续污染。

**第三轮（vip 变回 true，又调用 2 个 hook）。** 第 1 次调用（序号 0，代码上是姓名）取旧链第 0 个节点——那是第二轮那个被污染的"年龄"节点（`'Ada1'`），姓名显示 `Ada1`；第 2 次调用（序号 1，代码上是年龄）取旧链第 1 个节点——第二轮的链只有一个节点，取到 null，年龄回落到初始值 18（第二轮辛苦点出来的数字永久丢失）：

```text
旧链（F2）:   [ 'Ada1' ] → null
                ↑ 第0次读走（给姓名）   第1次读不到 → 18
新链（F3）:   [ 'Ada1' ] → [ 18 ]
```

三轮下来：姓名 Ada1（错）、年龄 18（丢）。**没有任何一步抛异常**——错位是静默的数据污染，这正是它危险的地方。真机验证的代码在第 6 节验收二。

推论把这个规则补完整：

- **不能放 if**，同理**不能放循环**（循环次数变化 = 调用序列变化）、**不能放在 return 之后的早退分支之后**（条件早退会跳过后面的 hook）。
- **可以放条件包裹的子组件里**（`{cond && <Child/>}`）——Child 整个 fiber 的出现与消失不影响别的组件的链表，每个函数组件一条链，互不牵连。规则的边界是"单个组件的函数体内"。
- 真实 React 的第一道防线是 ESLint 规则 `react-hooks/rules-of-hooks`（静态检查调用位置），第二道是运行时的 dispatcher 双表（`ReactFiberHooks.js` 里 mount/update 两套实现，mount 版第一课就是按序号建链）——对应本文路径 A 的第 3 项阅读材料。我们 20 行的链表就是它的最小模型。

---

#### 4. 闭包旧值问题：setState 拿到的是本次 render 的闭包 → queue + 函数式更新

##### 4.1 v1 的第二颗雷：引爆它

```js
function Counter() {
  const [count, setState] = Didact.useState(0);

  return Didact.createElement('div', null,
    Didact.createElement('h1', null, `count: ${count}`),
    Didact.createElement('button', {
      onClick: () => {
        setState(count + 1); // 闭包里的 count
        setState(count + 1); // 还是同一个闭包里的 count
      },
    }, '一次加二'),
    Didact.createElement('button', {
      onClick: () => {
        // 3 秒后才更新：这段时间里 count 早就变了，但闭包里的它不会变
        setTimeout(() => setState(count + 1), 3000);
      },
    }, '延迟 3 秒 +1')
  );
}
```

按钮一：期望 +2，实际 **+1**。两个箭头函数是同一次渲染里创建的，捕获的是**同一个 count 快照（0）**，两次 `setState(0 + 1)` 都写入 1，第二次覆盖第一次。按钮二：3 秒内你狂点"一次加二"把 count 加到 10，3 秒后定时器触发，`setState(count + 1)` 里的 count 还是**创建这个闭包那次渲染的 0**——界面从 10 直接跳回 1。

##### 4.2 机理：state 是快照，setState 是请求

根因在 M6 就埋下了：**更新 = 重新执行函数**。每次渲染，函数从头到尾跑一遍，`count` 是这一次执行的局部绑定，`useState` 返回什么它就是什么；事件回调闭包捕获的永远是这个绑定。`setState` 从能力上就**不可能"修改 count 这个变量"**——它只能"安排一次新的渲染"。所以"连续两次 setState 为什么只加一"这类问题，在函数组件模型里的准确表述是：**两次更新请求基于同一份过时快照各自算好了结果，后写的覆盖先写的**。这也是基础大纲（react-学习大纲.md）阶段 2"闭包陷阱"专题的同源问题：那边从使用层给规则（"读最新值用函数式更新"），这边从实现层看清闭包到底旧在哪。

解法只有一个方向：**别在调用现场算结果，把"怎么算"描述出来、推迟到重放时算**——重放时拿到的一定是最新值。这就是函数式更新 `setState(c => c + 1)`，承载它的结构就是 action queue。

##### 4.3 setState 最终版：queue + 函数式更新的完整实现

改动只落在 useState 内部，`wipFiber`/`hookIndex`/链表结构全部不变：

```js
function useState(initial) {
  // ① 对齐（与 v1 相同）
  const oldHook = getOldHook(hookIndex);

  // ② 建 hook：state 继承旧值；queue 是全新的空队列
  const hook = {
    memoizedState: oldHook != null ? oldHook.memoizedState : initial,
    queue: [], // ★ action 队列：本轮渲染之后、下一轮重放之前，setState 的动作都存这里
  };

  // ③ 重放：把旧 hook 的队列按顺序应用一遍，得到本轮看到的 state
  const pendingActions = oldHook != null ? oldHook.queue : [];
  pendingActions.forEach(action => {
    hook.memoizedState = typeof action === 'function'
      ? action(hook.memoizedState) // 函数式更新：入参是重放流水线上的最新值
      : action;                    // 值式更新：直接替换（同批多个值式更新，后者覆盖前者）
  });

  // ④ setState 最终版：只入队 + 触发调度，不计算结果
  const setState = action => {
    hook.queue.push(action); // 值或函数都只是 action，原样入队
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  // ⑤ 挂链 + 计数（与 v1 相同）
  appendHook(hook);
  hookIndex++;
  return [hook.memoizedState, setState];
}
```

四个关键设计。

**入队时零计算。** `setState(action)` 只做两件事：push、触发调度。`action` 是值（`1`）还是函数（`c => c + 1`）此刻不重要——这就是"setState 是请求不是赋值"的字面实现。

**重放发生在下一轮 render 的 useState 里，而不是 setState 里。** 时机选择是正确性的核心：setState 被调用的瞬间，可能还有后续 setState 马上要来（同一个回调里的、别的组件的），此刻任何"现值"都可能是中间态；而下一轮 render 的 useState 执行时，旧 hook 的 `memoizedState` 是上一轮**完整提交后的终值**，从它出发按序重放，每一步的入参都是"到此为止的最新值"。按钮一的两次 `setState(c => c + 1)`：队列 `[f, f]`，重放 `0 → 1 → 2`，正确 +2。值式的两次 `setState(count + 1)`：队列 `[1, 1]`，重放 `0 → 1 → 1`——同样只 +1，和真实 React 行为一致（值式更新互相覆盖是语义，不是 bug）。

**重放顺便构成了批处理的雏形。** 一次事件回调里调 N 次 setState，产生 N 个入队 + N 次"放入工作"（都是把同一个 wipRoot 赋给 nextUnitOfWork，等价于一次），真正的计算与渲染只在下一轮 render 发生一次。React 18 automatic batching 的骨架就是这个形状，M9 会把"收集用微任务、刷新一次"补全。

**与真实 React 的一个已知差异（诚实声明）。** v2 的 setState 闭包捕获的是"本轮的 hook 对象"，动作 push 进这个对象的 queue。如果一个**过时好几轮**的闭包（比如 4.1 的 setTimeout 例子，且回调期间已经发生过多次渲染）才被调用，action 会 push 进一个孤儿 hook——它已不在任何 currentRoot 的链上，下一轮没人重放它，这次更新会静默丢失。didact 原版同样如此。真实 React 把更新队列挂在 fiber 的 updateQueue 上、以 lane 优先级合并，过时闭包发起的函数式更新依然会被应用。mini 版接受这个简化：**使用层结论不变——事件与异步回调里一律写函数式更新，两种实现下都正确**。

（另一处小差异：真实 React 的 useState 允许传函数做惰性初始化 `useState(() => expensive())`，只在首次渲染执行一次。实现与函数式更新同一个技巧——首次建 hook 时 `typeof initial === 'function' ? initial() : initial`——mini 版留给读者一行加上。）

---

#### 5. 最终代码汇总：M5–M7 之后的完整 didact

把三章的成果合成一份可直接运行的 `didact.js`。新建 `index.html`（含 `<div id="root">`）引入它，配合第 6 节的 demo 即可验收：

```js
// didact.js —— M7 末的完整实现（约 260 行，含注释）
function createElement(type, config, ...children) {
  const props = {};
  let key = null;
  if (config != null) {
    key = config.key != null ? String(config.key) : null; // key 上提 element 顶层（M1 契约）
    for (const name in config) {
      if (name !== 'key') props[name] = config[name];
    }
  }
  return {
    type,
    key,
    props: {
      ...props,
      children: children
        .flat(Infinity) // M1 契约：children 扁平化，数组子项摊平
        .filter((child) => child !== false && child !== true && child != null) // 布尔/null/undefined 不渲染
        .map((child) =>
          typeof child === 'object' ? child : createTextElement(child)
        ),
    },
  };
}

function createTextElement(text) {
  return { type: 'TEXT_ELEMENT', props: { nodeValue: text, children: [] } };
}

// ───────────────────────────── 调度（M3） ─────────────────────────────
let nextUnitOfWork = null;
let currentRoot = null; // 上一轮已提交的树（M5）
let wipRoot = null;     // 正在构造的树
let deletions = [];     // 本轮待删除的 fiber

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) commitRoot();
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

// ───────────────────────── 入口与提交（M4/M5/M6） ─────────────────────────
function render(element, container) {
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function commitRoot() {
  deletions.forEach(commitWork); // 先统一执行删除
  commitWork(wipRoot.child);     // 再处理新树的 UPDATE / PLACEMENT
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (fiber == null) return;

  // 函数/类组件的 fiber 没有 dom：向上找最近的有 dom 的祖先（M6）
  let domParentFiber = fiber.parent;
  while (domParentFiber != null && domParentFiber.dom == null) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    const anchor = getNextHostDom(fiber); // 头部插入 / 移动都要落在正确位置（M5）
    if (anchor != null) domParent.insertBefore(fiber.dom, anchor);
    else domParent.appendChild(fiber.dom);
    if (fiber.alternate != null) { // 有旧身的 PLACEMENT = 移动：补一次 props diff
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
    return; // 删除到此为止，不递归旧树
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom != null) domParent.removeChild(fiber.dom);
  else commitDeletion(fiber.child, domParent); // 无 dom 的 fiber 下钻找宿主后代
}

function getNextHostDom(fiber) {
  let sibling = fiber.sibling;
  while (sibling != null) {
    if (sibling.effectTag !== 'PLACEMENT') { // PLACEMENT 兄弟自己要被插/挪，不能当锚点
      const dom = getSelfOrDescendantDom(sibling);
      if (dom != null && dom.isConnected) return dom;
    }
    sibling = sibling.sibling;
  }
  return null;
}

function getSelfOrDescendantDom(fiber) {
  let node = fiber;
  while (node != null && node.dom == null) node = node.child;
  return node != null ? node.dom : null;
}

// ───────────────────────── DOM 创建与 props diff（M2/M5） ─────────────────────────
function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props); // 初建 = 从空 props 出发的 diff
  return dom;
}

const isEvent = name => name.startsWith('on');
const isProperty = name => name !== 'children' && !isEvent(name);
const isNew = (prev, next) => name => prev[name] !== next[name];
const isGone = (prev, next) => name => !(name in next);

function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps) // 1. 移除旧的/换过的事件监听
    .filter(isEvent)
    .filter(name => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach(name => dom.removeEventListener(name.toLowerCase().substring(2), prevProps[name]));

  Object.keys(prevProps) // 2. 删除消失的普通属性
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => { dom[name] = ''; });

  Object.keys(nextProps) // 3. 设置新增/变化的普通属性
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => { dom[name] = nextProps[name]; });

  Object.keys(nextProps) // 4. 绑定新的/换过的事件监听
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => dom.addEventListener(name.toLowerCase().substring(2), nextProps[name]));
}

// ─────────────────────── render 阶段：三分支 + 调和（M6/M5） ───────────────────────
let wipFiber = null; // 当前正在执行的函数组件 fiber（M7 的 useState 用）
let hookIndex = 0;   // 本次执行的 hook 序号

function performUnitOfWork(fiber) {
  if (isClassComponent(fiber.type)) updateClassComponent(fiber);
  else if (fiber.type instanceof Function) updateFunctionComponent(fiber);
  else updateHostComponent(fiber);

  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
  return null;
}

function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);
  reconcileChildren(fiber, fiber.props.children);
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  const children = [fiber.type(fiber.props)]; // 执行函数组件（M6）
  reconcileChildren(fiber, children);
}

function updateClassComponent(fiber) {
  let instance = fiber.alternate && fiber.alternate.stateNode;
  if (instance == null) instance = new fiber.type(fiber.props);
  instance.props = fiber.props;
  fiber.stateNode = instance;
  const children = [instance.render()];
  reconcileChildren(fiber, children);
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let prevSibling = null;

  // 旧 children 按 key（缺省 index）建 Map（M5 v2）
  const existingFibers = new Map();
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  while (oldFiber != null) {
    existingFibers.set(oldFiber.key != null ? oldFiber.key : oldFiber.index, oldFiber);
    oldFiber = oldFiber.sibling;
  }

  let lastPlacedIndex = 0; // 顺序水位线：判断命中的旧 fiber 是否需要"移动"（M5）

  while (index < elements.length) {
    const element = elements[index];
    const newKey = element.key != null ? element.key : index;
    const oldFiberForKey = existingFibers.get(newKey);
    const sameType = oldFiberForKey != null && oldFiberForKey.type === element.type;

    let newFiber;
    if (sameType && oldFiberForKey.index >= lastPlacedIndex) {
      newFiber = { // 身份命中、同类型、顺序未变：原地复用 dom，UPDATE
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: oldFiberForKey.dom,
        parent: wipFiber,
        alternate: oldFiberForKey,
        effectTag: 'UPDATE',
        index,
      };
      lastPlacedIndex = oldFiberForKey.index;
    } else if (sameType) {
      newFiber = { // 命中但顺序变了：复用 dom、打 PLACEMENT，commit 时 insertBefore 移动
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: oldFiberForKey.dom,
        parent: wipFiber,
        alternate: oldFiberForKey,
        effectTag: 'PLACEMENT',
        index,
      };
    } else {
      newFiber = { // 未命中或换了类型：新建，PLACEMENT
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
        index,
      };
      if (oldFiberForKey != null) { // 同身份不同类型：旧的整棵删除
        oldFiberForKey.effectTag = 'DELETION';
        deletions.push(oldFiberForKey);
      }
    }

    existingFibers.delete(newKey); // 用掉即删，剩下的就是该删的

    if (index === 0) wipFiber.child = newFiber;
    else prevSibling.sibling = newFiber;
    prevSibling = newFiber;
    index++;
  }

  existingFibers.forEach(remaining => { // 剩下的旧 fiber：新列表中已不存在
    remaining.effectTag = 'DELETION';
    deletions.push(remaining);
  });
}

// ───────────────────────── hooks：useState（M7） ─────────────────────────
function getOldHook(index) {
  const alternate = wipFiber.alternate;
  if (alternate == null || alternate.memoizedState == null) return null;
  let oldHook = alternate.memoizedState;
  let i = 0;
  while (i < index && oldHook.next != null) {
    oldHook = oldHook.next;
    i++;
  }
  return i === index ? oldHook : null;
}

function appendHook(hook) {
  if (wipFiber.memoizedState == null) wipFiber.memoizedState = hook;
  else {
    let last = wipFiber.memoizedState;
    while (last.next != null) last = last.next;
    last.next = hook;
  }
}

function useState(initial) {
  const oldHook = getOldHook(hookIndex); // ① 序号对齐

  const hook = { // ② 建 hook：继承旧值 + 全新队列
    memoizedState: oldHook != null ? oldHook.memoizedState : initial,
    queue: [],
  };

  const pendingActions = oldHook != null ? oldHook.queue : []; // ③ 重放
  pendingActions.forEach(action => {
    hook.memoizedState = typeof action === 'function'
      ? action(hook.memoizedState)
      : action;
  });

  const setState = action => { // ④ 只入队 + 触发调度
    hook.queue.push(action);
    wipRoot = { dom: currentRoot.dom, props: currentRoot.props, alternate: currentRoot };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  appendHook(hook); // ⑤ 挂链 + 计数
  hookIndex++;
  return [hook.memoizedState, setState];
}

// ───────────────────────── 类组件基类（M6） ─────────────────────────
class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    wipRoot = { dom: currentRoot.dom, props: currentRoot.props, alternate: currentRoot };
    nextUnitOfWork = wipRoot;
    deletions = [];
  }
}
Component.prototype.isDidactComponent = true;

const isClassComponent = type =>
  type != null && type.prototype != null && type.prototype.isDidactComponent === true;

// ───────────────────────── 导出 ─────────────────────────
const Didact = { createElement, render, useState, Component };
```

---

#### 6. 验收方式（M7）

引入上面的 didact.js，跑三个 demo，每个都对应本章拆过的一颗雷。

**验收一：计数器 + 函数式更新。**

```js
function Counter() {
  const [count, setState] = Didact.useState(0);
  return Didact.createElement('div', null,
    Didact.createElement('h1', null, `count: ${count}`),
    Didact.createElement('button', {
      onClick: () => { setState(count + 1); setState(count + 1); }, // 值式 ×2
    }, '值式双击（期望只 +1）'),
    Didact.createElement('button', {
      onClick: () => { setState(c => c + 1); setState(c => c + 1); }, // 函数式 ×2
    }, '函数式双击（期望 +2）')
  );
}
Didact.render(Didact.createElement(Counter), document.getElementById('root'));
```

验证行为：值式双击每次点击只 +1（两个 action 都是"替换为同一个快照值+1"，重放后者覆盖前者）；函数式双击每次 +2（队列 `[f, f]` 顺序重放）。两组按钮对照点，4.1/4.3 节的推演全程可见。

**验收二：if 里的 useState——链表错位复现。** 用第 3 节的 `Profile` 组件（vip 开关 + 长大一岁），操作序列与期望现象：

1. 初始（vip=true）：姓名 Ada、年龄 18。
2. 点"长大一岁"三次：年龄 21。
3. 切换 vip（false）：姓名"游客"、**年龄显示 "Ada"**（第 3 节第二轮推演）。
4. 再点"长大一岁"：年龄显示 `Ada1`（字符串拼接，污染加深）。
5. 再切换 vip（true）：姓名 `Ada1`、年龄 `18`（21 永久丢失，第三轮推演）。

五步全部命中推演，说明你亲手造出的错位与 React 的警告条款一一对应；然后给组件加上"把 if 里的 useState 提到顶层"的修复（用 `useState(props.vip ? 'Ada' : null)` 之类的常序结构），五步全部恢复正常——规则从"背下来的"变成"推导出来的"。

**验收三：延迟闭包。** 4.1 节按钮二的代码：点击"延迟 3 秒 +1"后立刻狂点"函数式双击"把数字抬高，3 秒后观察——若写成 `setState(count + 1)`，数值会被旧闭包里的 0 拉回 1；改成 `setState(c => c + 1)` 后，延迟到达时在最新值上 +1。两个版本各跑一遍，闭包旧值的机理就长在经验里了。

三个 demo 全绿，M7 通过。至此你的 mini React 已经能支撑真实交互：diff 复用（M5）、组件化（M6）、状态（M7）。但组件里还只能写"渲染逻辑"——订阅、定时器、请求这些**渲染之外的事**依然无处安放（写在外面每次重执行都会重复执行）。下一章 M8 的 useEffect 解决它：把副作用也挂到 fiber 上，在 commit 之后统一执行。

---

#### 7. 高频坑位补遗：四种最常见的错误实现（错误代码 vs 正确代码）

以下四个坑全部来自真实的复刻过程，共同点是：**demo 能跑，换一个场景才爆**。每个坑先给错误代码与症状，再给正确代码与机理——四个坑的爆炸点都在同一处：链表对齐。

##### 坑一：hookIndex 没有在"每个函数组件开始执行"时清零

```js
// ✗ 错误：把清零放在 render 入口，一轮只清一次
function render(element, container) {
  hookIndex = 0;
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
  deletions = [];
  nextUnitOfWork = wipRoot;
}
```

症状：页面有**两个**函数组件时，第二个组件的 useState 全部失灵——永远显示初始值、setState 后界面不动。推演：第一个组件有 3 个 hook，执行完 `hookIndex` 停在 3；第二个组件的第 1 次 `useState` 拿序号 3 去旧链取节点，返回 null，落回 initial。setState 之后也不动：下一轮重放时 `getOldHook(3)` 还是 null，`pendingActions` 为空，入队的 action 永远无人消费。正确写法是 M6 定下的位置——`updateFunctionComponent` 里，**每个函数组件执行前**清零：

```js
// ✓ 正确：清零的粒度是"一次函数组件的执行"，不是"一轮 render"
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
```

对照真实 React：`renderWithHooks` 在每次执行组件函数前重置 `workInProgressHook` 游标，粒度与此一致——**链是每 fiber 一条，游标是每执行一次归零一次**，两个"每"缺一不可。

##### 坑二：queue 直接继承旧数组，action 被每轮重复重放

```js
// ✗ 错误：queue 复用旧 hook 的数组
const hook = {
  memoizedState: oldHook != null ? oldHook.memoizedState : initial,
  queue: oldHook != null ? oldHook.queue : [],
};
```

症状：`setState(c => c + 1)` 只调了一次，之后**任何**更新（哪怕来自别的组件）都会让 count 再 +1——旧动作像被"记住"了一样反复生效。机理：新旧 hook 共用同一个数组后，每轮重放消费的都是同一批 action；函数式更新每轮都基于最新值再算一遍，效果就是叠加。正确写法是 4.3 的原版：**队列每轮新建**（`queue: []`），重放读的是旧链那次的队列，消费完随旧 hook 一起退役。"代际隔离"是队列版正确性的隐形前提，错在这里的版本往往单组件测不出、多组件联调时才炸。

##### 坑三：setState 在调用时刻现查 hook，而不是闭包捕获

```js
// ✗ 错误：以为 setState 可以"现用现查"
const setState = action => {
  const target = getOldHook(hookIndex); // 调用时刻 hookIndex / wipFiber 早已指向别处
  target.queue.push(action);            // TypeError：null 上没有 queue
};
```

症状：点击按钮报 `Cannot read properties of null (reading 'queue')`；即使碰巧不炸（`wipFiber` 还停在最后一次渲染的函数组件上、序号恰好落在链内），更新也会记到**别人的 hook** 头上——点 A 的按钮，B 的状态变了。机理：事件回调执行在 render 之后，`hookIndex` 与 `wipFiber` 是渲染期的临时游标，事件时刻早已失义。正确写法是 4.3 的原版：setState 在 render 期间被创建时**闭包捕获自己的 hook 对象**，此后无论隔多少轮，action 都准确落在当初那条链的队列上。这也是 1.3"hooks 只能在组件执行期间调用"的另一个侧面：不只是 useState，**setState 携带的链路身份同样是 render 期定格的**。

##### 坑四：getOldHook 沿链时不设"链不够长"的保护

```js
// ✗ 错误：无 null 保护
function getOldHook(index) {
  let oldHook = wipFiber.alternate.memoizedState;
  for (let i = 0; i < index; i++) {
    oldHook = oldHook.next; // 旧链 1 个节点、index 到 2：null.next 直接抛异常
  }
  return oldHook;
}
```

症状：把组件从 1 个 hook 重构成 3 个 hook（例如把两个散变量提升为 state）之后，**第一次更新就崩**——旧链只有 1 个节点，第 3 次 `useState` 的序号 2 要沿链走两步，第二步在 null 上取 `next`。这一步是第 3 节"第三轮推演"的代码化镜像：条件增删 hook 必然造成新旧链不等长，**短的一方必须优雅地返回 null**（useState 落回 initial），而不是崩掉。正确写法即 1.2 原版的 `while (i < index && oldHook.next != null)` 加 `return i === index ? oldHook : null`。真实 React 里这类错误通常先被 ESLint 的 `rules-of-hooks` 静态拦下，运行时防线很薄——mini 版必须自己兜底。

---

#### 8. 断点调试指南：五个断点看穿 useState 的一生

调试目标：一次点击 `setState(c => c + 1)`，在 DevTools 里亲眼看它走完"入队 → 对齐 → 重放 → 挂链 → 提交"五站。建议把 Counter 扩成 3 个 useState 的组件，顺带验证序号对齐。

先在控制台准备一个链表 dump 工具（兼容 mini 各版本的字段命名）：

```js
// 控制台执行：打印某个 fiber 的整条 hook 链
function dumpHooks(fiber) {
  const rows = [];
  let hook = fiber && fiber.memoizedState;
  let i = 0;
  while (hook) {
    rows.push({
      index: i++,
      state: hook.memoizedState != null ? hook.memoizedState : hook.state,
      queueLength: hook.queue ? hook.queue.length : '-',
    });
    hook = hook.next;
  }
  console.table(rows);
}
```

五个断点（DevTools → Sources → didact.js → 行号上右键可加条件/日志断点）：

| # | 断点位置 | 条件（可选） | 看什么 | 预期 |
|---|---|---|---|---|
| ① | `updateFunctionComponent` 的 `hookIndex = 0` 行 | `fiber.type.name === 'Counter'` | `wipFiber` 切换、`wipFiber.alternate` 是否存在 | 首次渲染 alternate 为 null；每次更新都非 null 且指向旧 fiber |
| ② | `getOldHook` 的 return 前 | — | `hookIndex`、`oldHook && oldHook.memoizedState` | 首次渲染恒为 null；更新时是旧值（点击后的第一次命中应显示 0） |
| ③ | `setState` 入口 | `hook.memoizedState === 0`（只看首轮） | `action`、`hook.queue.length`、hook 的对象引用 | 一次事件里两个函数式更新：length 依次 0→1→2，两个 action 进**同一个** hook 对象（闭包捕获的物证） |
| ④ | 重放 `pendingActions.forEach` 内部 | — | 循环中 `hook.memoizedState` 的中间值 | 队列 `[f, f]` 时依次 0→1→2，函数式更新链式累加 |
| ⑤ | `commitRoot` 的 `currentRoot = wipRoot` 行 | — | 控制台执行 `dumpHooks(currentRoot)` 与 `dumpHooks(wipRoot)` | 两表行数相同、index 一一对应；wip 树的 hook 已带新值，current 即将换代 |

日志断点（不打断执行、只打印）的推荐配置：③④ 用日志断点，表达式填 `` `[setState] queue=${hook.queue.length} action=${String(action)}` ``。一次点击的完整输出：

```text
[setState] queue=0 action=c => c + 1
[setState] queue=1 action=c => c + 1
[replay]   0 -> 1 -> 2     （④ 处打的中间值，重放共两步）
```
<!-- 保留原 ASCII 图：此处本质是日志断点的控制台输出示例，Mermaid 无等价图表类型（转图表会丢失输出原样的格式语义），故不做替换 -->

两个收尾的验证动作：其一，断点 ③ 处右键 Copy object 记下 `hook` 的引用，到断点 ⑤ 展开 `currentRoot.memoizedState`，确认就是同一个对象——"setState 闭包捕获的 hook，下一轮就是旧链节点"这句结论有了实锤。其二，断点 ② 处手动执行 `dumpHooks(wipFiber.alternate)` 与 `dumpHooks(wipFiber)` 对比，两表逐行对齐——hookIndex 对齐机制从"读代码理解"升级为"看数据确认"。

---

#### 9. 与真实 React 源码对照：ReactFiberHooks 的四张关键牌

读完本章，你就具备了直接读 `packages/react-reconciler/src/ReactFiberHooks.js`（约 4000 行）的资格。带着 mini 版去对号入座，四组对应物：

| mini 版 | 真实 React | 关键差异 |
|---|---|---|
| 一套 `useState` 函数，内部用 `getOldHook(hookIndex)` 判新旧 | `HooksDispatcherOnMount` / `HooksDispatcherOnUpdate` **两张同名 hook 的实现表**，`renderWithHooks` 在执行组件前按"current 树上有没有旧 hook"切换 `ReactCurrentDispatcher.current` | React 把"第一次"与"更新"拆成两套函数；我们是一套函数内部分支。语义等价，读源码时把 mount 版当"建链"、update 版当"走链"即可 |
| `hook = { memoizedState, queue: [] }`，数组队列 | `hook.memoizedState = baseState`；`hook.queue = { pending: 环形链表, lanes, dispatch, lastRenderedReducer, lastRenderedState }` | 队列是**环形链表**（`pending` 指向最后一个 update，`pending.next` 即队头），入队 O(1) 且便于中断时合并；`baseState/baseQueue` 专门服务"render 被打断后从断点续算"，mini 版没有可中断 render 所以用不上 |
| `pendingActions.forEach` 重放 | `updateReducer` 里展开 `queue.pending` 环，逐个 `lastRenderedReducer(hook.memoizedState, action)` | 重放思想完全一致；真实的 reducer 可插拔——传 `basicStateReducer` 就是 useState，传用户 reducer 就是 useReducer（9.3 的"aha"在源码里就是换一个参数） |
| `setState = push + 触发调度` | `dispatchSetState`：本 fiber 无挂起更新（`fiber.lanes === NoLanes`）时**eager 预计算**，`Object.is` 相等则只入队不调度 | 这就是"setState 同值不重渲染"的实现（mini 版要在 M9.5 的统一调度入口上才能补齐，见 M9 的变体章节）；预计算用的 reducer 与重放是同一个，保证"现在算的"与"重放算的"必然一致 |

`dispatchSetState` 的简化伪码，重点行已标注：

```js
function dispatchSetState(fiber, queue, action) {
  const alternate = fiber.alternate;
  if (fiber.lanes === NoLanes && (alternate === null || alternate.lanes === NoLanes)) {
    // ★ eager 优化：该 fiber 没有排队的更新 → 当前 memoizedState 就是全局最新
    const eagerState = queue.lastRenderedReducer(queue.lastRenderedState, action);
    if (is(eagerState, queue.lastRenderedState)) {
      // 更新仍然入队（保持队列完整），但不发起渲染——一次 render 都省掉
      return;
    }
  }
  // 常规路径：入队 + scheduleUpdateOnFiber（lane 优先级体系，M10.3 的完全体）
}
```

4.3 诚实声明里"过时闭包 push 进孤儿 hook"的偏差，为什么在真实 React 里不存在？答案也在源码里：`updateWorkInProgressHook` 从 current 树克隆新 hook 时写的是 `queue: currentHook.queue`——**新旧两棵树上同位置的 hook 共享同一个 queue 对象**。dispatch 闭包捕获的 queue 永远还被"活着的" hook 引用，过时闭包发起的更新必然被下一轮重放。mini 版每轮新建队列（代际隔离换来实现简单），代价就是隔代闭包丢更新——两版的权衡摆在一起看，"函数式更新无论哪版都正确"这条使用层结论为什么如此强调，也就有了实现层的答案。能在 `mountState`/`updateReducer`/`dispatchSetState` 三个函数旁边标出 mini 版对应的行号，M7 才算真正学透。

---

## 附:ASCII 图替换清单

本文档图形化改版,原 ASCII 字符图与 Mermaid 图表对应关系如下:

| 原图位置 / 标题 | 处理结果 |
| --- | --- |
| §8 断点调试:一次点击的完整日志输出([setState]/[replay] 三行) | 保留原图(本质是控制台日志输出示例,转图表会丢失输出原样的格式语义) |
