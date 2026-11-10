---
title: "M8：useEffect（1.5 天）⭐核心"
---

> 本文是《2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）》按小节拆分后的续篇，上一部分见 [08-M7-useState-1-5-天-核心.md](08-M7-useState-1-5-天-核心.md)。

### M8：useEffect（1.5 天）⭐核心

- effect 挂到 fiber 的 effect 链，**commit 完成后统一执行**（用 `queueMicrotask`/宏任务模拟 paint 后的 passive 时机）
- 依赖数组浅比较决定是否重跑；重跑前先执行上一次的 cleanup
- 亲手做一次"依赖漏写导致闭包旧值"的复现实验

M7 结束时，我们的 mini React 已经能"记住状态"：`useState` 把状态存进 fiber 的 `memoizedState` 链表，`setState` 触发新一轮 render + commit。但真实应用里还有一大类工作它完全做不了——**副作用**：订阅外部数据源、开定时器、写 localStorage、操作非 React 管理的 DOM。这些事如果直接写在函数组件体里，每次 render 都会执行一遍（订阅会重复建立、定时器会越开越多），而且没有任何"清理"的时机。M8 要解决的就是三个问题：副作用**什么时候执行**（不是 render 时，是 commit 之后）、**什么时候重跑**（依赖数组说了算）、**什么时候清理**（重跑之前与组件卸载之时）。这三个问题各对应下面的 8.3、8.2、8.4 三节，8.5 节用一次完整的翻车实验把三个机制串起来。

#### 8.0 起点：M7 结束时的代码基线

为了让本节自包含，先把 M1–M7 的成果浓缩成一份可直接运行的基线（下文所有改动都标明"改哪里"）。如果你是跟着前面的里程碑一路写下来的，快速扫一遍确认命名一致即可跳到 8.1；如果某处实现细节与你的版本略有出入，以你手上的版本为准，概念对齐就行。

> **基线简化声明（重要）。** 为了把篇幅集中在 useEffect，这份基线的 diff/commit 是**简化版**，与 M5/M7 的完整版有两处刻意回退：① `reconcileChildren` 用 Map 按 key 对比，但 PLACEMENT 一律 `appendChild` 追加到末尾——丢掉了 M5 的 `lastPlacedChild` 移动检测与 `getNextHostDom` 锚点插入，所以 M5 验收三"把头部节点移到末尾"的用例在此基线上会得到错误顺序（新增节点永远出现在最后）；② `updateDom` 每次更新先移除全部旧事件再挂全部新事件，不做 M2 版的增删差量。key 的契约与 M1/M5 一致（存 element 顶层）。跟着 M8 往下写功能不受影响；若要跑 M5 的验收用例，请把 M5/M7 的 `reconcileChildren` 与 `commitWork` 原样替换回来。

```js
// ============================================================
// mini React 基线（M1–M7）：约 220 行，可直接在浏览器跑
// ============================================================

// —— M1：element 工厂（含 key 提取，M5 的 children 按 key 对比要用） ——
function createElement(type, config, ...children) {
  const props = Object.assign({}, config)
  const key = props.key != null ? '' + props.key : null // key 不进 props，单独挂 element
  delete props.key
  props.children = children.map((child) =>
    typeof child === 'object' ? child : createTextElement(child)
  )
  return { type, props, key }
}
function createTextElement(text) {
  return { type: 'TEXT_ELEMENT', props: { nodeValue: text, children: [] }, key: null }
}

// —— M2：DOM 创建 / 属性更新 ——
function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  return dom
}
const isEvent = (key) => key.startsWith('on')
const isProperty = (key) => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => (key) => prev[key] !== next[key]
const isGone = (prev, next) => (key) => !(key in next)

function updateDom(dom, prevProps, nextProps) {
  // 事件（M9 的合成事件小节会把这里整个换掉）
  Object.keys(prevProps)
    .filter(isEvent)
    .forEach((key) =>
      dom.removeEventListener(key.toLowerCase().substring(2), prevProps[key])
    )
  Object.keys(nextProps)
    .filter(isEvent)
    .forEach((key) =>
      dom.addEventListener(key.toLowerCase().substring(2), nextProps[key])
    )
  // 属性：删掉消失的，更新变化的
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((key) => (dom[key] = ''))
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((key) => (dom[key] = nextProps[key]))
}

// —— M3：调度循环（教学版用 requestIdleCallback，Safari 需换 setTimeout 兜底） ——
let nextUnitOfWork = null // 下一个工作单元：为 null 表示本轮 render 结束
let currentRoot = null   // 上一次 commit 到屏幕的 fiber 树（双缓冲的"旧树"）
let wipRoot = null       // 正在构造的 fiber 树（双缓冲的"新树"）
let deletions = null     // 本轮要删除的旧 fiber 列表

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1 // 时间片耗尽就暂停，下一帧继续
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot() // render 全部完成后一次性提交 DOM
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber) // 函数组件：没有 dom，执行函数拿 children
  } else {
    updateHostComponent(fiber)     // 宿主组件：创建 dom，直接调和 children
  }
  // 链表遍历：先孩子，再弟弟，都没有就往上找"叔叔"
  if (fiber.child) return fiber.child
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}

function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber)
  reconcileChildren(fiber, fiber.props.children)
}

// —— M4：render 与 commit 分离 ——
function render(element, container) {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot, // 指向旧树，M5 的 diff 靠它逐节点对比
    effects: [],            // ★ M8 会用到：本轮登记的 effect（此时先占位，8.3 讲）
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

function commitRoot() {
  deletions.forEach(commitWork)      // 删除要先行：旧节点不摘掉，新节点插进去会错位
  commitWork(wipRoot.child)
  currentRoot = wipRoot              // 新树成为"屏幕上的树"
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) return
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) domParentFiber = domParentFiber.parent // 函数组件无 dom，向上找
  const domParent = domParentFiber.dom
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
function commitDeletion(fiber, domParent) {
  if (fiber.dom) domParent.removeChild(fiber.dom)
  else commitDeletion(fiber.child, domParent) // 函数组件：真正的 dom 在孩子里
}

// —— M5：diff 与复用（v2：按 key 建映射对比） ——
function reconcileChildren(wipFiber, elements) {
  // 旧 children 全部收进 Map：key（无 key 用下标兜底）→ 旧 fiber
  const oldFiberMap = new Map()
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let keylessIndex = 0
  while (oldFiber) {
    const oldKey = oldFiber.key != null ? oldFiber.key : keylessIndex++
    oldFiberMap.set(oldKey, oldFiber)
    oldFiber = oldFiber.sibling
  }
  let prevSibling = null
  elements.forEach((element, index) => {
    const newKey = element.key != null ? element.key : index
    const oldFiber = oldFiberMap.get(newKey)
    oldFiberMap.delete(newKey) // 消费掉的从 Map 拿掉，剩下的就是该删的
    const sameType = oldFiber && element.type === oldFiber.type
    let newFiber = null
    if (sameType) {
      newFiber = { // 类型相同：复用 dom，进入 UPDATE 流程
        type: oldFiber.type, key: element.key, props: element.props,
        dom: oldFiber.dom, parent: wipFiber, alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    } else if (element) {
      newFiber = { // 新节点：PLACEMENT
        type: element.type, key: element.key, props: element.props,
        dom: null, parent: wipFiber, alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }
    if (index === 0) wipFiber.child = newFiber
    else if (prevSibling) prevSibling.sibling = newFiber
    prevSibling = newFiber || prevSibling
  })
  oldFiberMap.forEach((leftOldFiber) => { // 新 children 里找不到的旧 fiber：删除
    leftOldFiber.effectTag = 'DELETION'
    deletions.push(leftOldFiber)
  })
}

// —— M6/M7：函数组件 + useState ——
let workInProgressFiber = null // 正在执行的函数组件 fiber
let hookIndex = null           // 当前是第几个 hook（沿链表对齐新旧 hook 的游标）

function updateFunctionComponent(fiber) {
  workInProgressFiber = fiber
  hookIndex = 0
  workInProgressFiber.memoizedState = null // 新链从空开始，逐个 hook 接上
  const children = [fiber.type(fiber.props)] // ★ 重新执行函数 = 一次 render
  reconcileChildren(fiber, children)
}

function getOldHook(index) {
  // 从旧树（alternate）的 hook 链头走 index 步——hook 顺序错位 = 一切怪异的根源
  const alternate = workInProgressFiber.alternate
  if (!alternate || !alternate.memoizedState) return null
  let oldHook = alternate.memoizedState
  for (let i = 0; i < index && oldHook; i++) oldHook = oldHook.next
  return oldHook || null
}

function pushHook(hook) {
  // 把新 hook 接到当前 fiber 的 memoizedState 链尾
  if (!workInProgressFiber.memoizedState) {
    workInProgressFiber.memoizedState = hook
  } else {
    let last = workInProgressFiber.memoizedState
    while (last.next) last = last.next
    last.next = hook
  }
}

function useState(initial) {
  const oldHook = getOldHook(hookIndex)
  const hook = {
    tag: 'state', // M8 起链上会有多种 hook，用 tag 区分种类
    state: oldHook ? oldHook.state : initial,
    queue: [],    // action 队列：函数式更新的载体
  }
  const actions = oldHook ? oldHook.queue : []
  actions.forEach((action) => {
    // action 是函数就基于最新 state 计算——这就是函数式更新（M7 的重点）
    hook.state = typeof action === 'function' ? action(hook.state) : action
  })
  const setState = (action) => {
    hook.queue.push(action)
    wipRoot = { // 以屏幕上的树为起点，发起一轮新的 render
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
      effects: [],
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  pushHook(hook)
  hookIndex++
  return [hook.state, setState]
}

// 导出给 JSX 用：/** @jsx createElement */
const MiniReact = { createElement, render, useState }
```

对着这份基线记住三个"动刀点"，后面所有改动都发生在这三处：**① `updateFunctionComponent`**（effect 的登记入口）；**② `commitRoot`**（effect 的执行调度入口）；**③ hook 链表节点结构**（新增 `tag: 'effect'` 类型的节点）。另外 M8 起每个 hook 节点都带 `tag` 字段——真实 React 的 hook 链上不同 hook 的 `memoizedState` 字段含义本就不同（useState 存值、useEffect 存 effect 对象），`tag` 是我们让初学者能一眼分辨的简化手段。

#### 8.1 设计起点：effect 为什么不能在 render 阶段执行

写代码前先想清楚时机。候选时机有三个，逐个排除：

| 候选时机 | 问题 |
|---|---|
| render 阶段（执行函数组件时同步跑） | render 可能被中断、重放——订阅类副作用会执行多次且无法撤销；副作用还会反过来改外部世界，导致"同输入不同输出"，破坏 render 的纯度 |
| commit 阶段（DOM 操作中间同步跑） | effect 可能耗时（网络请求、大计算），同步跑会拖住 commit，而 commit 是不可中断的——paint 被推迟，用户看到的就是"点了没反应" |
| commit 完成之后（异步执行） | DOM 已就位、屏幕即将/已经绘制，effect 出问题也不影响已上屏的结果——唯一正确的选择 |

第三条正是 React 术语里 **passive effects（被动副作用）** 的含义：它们"被动地"在某个稍晚的时间点被统一冲刷（flush），而不是作为渲染主线的一部分。React 官方对 `useEffect` 的描述——"它不会阻塞浏览器更新屏幕"——说的就是这个。我们的实现也照这个时机来：render 阶段只**登记**，commit 完成后**统一异步执行**。

#### 8.2 useEffect：登记在 hook 链上的"延迟任务"

先给完整实现，再逐块拆解。effect 与 state 住在**同一条链**上（都挂在 `fiber.memoizedState`），用 `tag` 区分——这就是"effect 挂 fiber 的 effect 链"的具体形态：每个 fiber 的 hook 链里 `tag === 'effect'` 的那几个节点，按 `useEffect` 的调用顺序排成一串，就是该组件的 effect 链。

```js
// —— M8 新增：useEffect 与依赖比较 ——
function useEffect(callback, deps) {
  const oldHook = getOldHook(hookIndex)
  const hasChanged = hasDepsChanged(oldHook ? oldHook.deps : undefined, deps)
  const hook = {
    tag: 'effect',
    effect: callback,                          // 当次 render 创建的函数（连同它的闭包一起被保存）
    deps: deps,                                // 记住本轮依赖，供下一次 render 比较
    cleanup: oldHook ? oldHook.cleanup : null, // ★ 继承上一次执行留下的清理函数，与本次跑不跑无关
    hasEffect: hasChanged,                     // true = commit 后要（重）跑
  }
  if (hasChanged) {
    wipRoot.effects.push(hook) // render 阶段只登记进本轮根节点，绝不执行
  }
  pushHook(hook)
  hookIndex++
}

function hasDepsChanged(prevDeps, nextDeps) {
  // 依赖数组浅比较，规则与真实 React 对齐
  if (nextDeps === undefined) return true // 不传依赖：每次 render 后都跑
  if (prevDeps === undefined) return true // 首次挂载：必跑
  if (prevDeps.length !== nextDeps.length) return true // 长度不同直接视为变化
  for (let i = 0; i < nextDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) return true // 逐位浅比较
  }
  return false
}
```

四个要点值得停下来细看：

**第一，`getOldHook` 完全复用 M7 的函数。** effect hook 与 state hook 在链上按调用顺序混排，第 3 个 hook 是 state 还是 effect 无关紧要——对齐靠的只是"位置"。这也再次解释了 M7 的结论：hooks 不能放进 if 里，否则位置错位，`useEffect` 可能对上别人的 `useState`，依赖比较就成了笑话。

**第二，`deps` 的三种传法在 `hasDepsChanged` 里走向完全不同。** 不传（`undefined`）：每次 render 都重跑——订阅会被反复拆建，cleanup 兜底所以不泄漏，但浪费；传 `[]`：首跑之后 `[]` 与 `[]` 逐位比较恒为"没变"，永不重跑——适合"只做一次"的副作用（全局事件监听、首屏打点）；传 `[a, b]`：只有 `a` 或 `b` 变化才重跑。8.5 节的翻车实验，翻的正是第二种与第三种的混淆。

**第三，`Object.is` 而不是 `===`。** 两者只差两处：`Object.is(NaN, NaN)` 是 `true`（`===` 是 `false`）、`Object.is(+0, -0)` 是 `false`（`===` 是 `true`）。React 选 `Object.is` 是因为"NaN 依赖"在语义上应当视为"没变"（它永远等于自己），而正负零在绝大多数业务场景应当被区分。细节，但真实源码就是这么写的。

**第四，`cleanup` 的继承是本实现最容易写错的一行。** 新 hook 节点每次 render 都新建，但 `cleanup` 必须从旧节点**原样搬过来**——它是上一次 effect 执行时返回的函数，是"已经存在于外部世界里的未了结"。哪怕本次依赖没变、effect 不重跑，这个 cleanup 也必须在链上继续存着，因为组件卸载时还要用它（8.4 节）。

#### 8.3 commit 完成后统一执行：passive 时机模拟

render 阶段登记完毕，执行要等 commit。修改 `commitRoot`：

```js
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  const effects = wipRoot.effects // 树即将"销毁"（wipRoot 置 null），先把登记表转移出来
  wipRoot = null
  schedulePassiveEffects(effects) // ★ commit 全部完成后，才安排 effect 的执行
}
```

然后是本节的主角——调度与冲刷：

```js
// —— M8 新增：passive effects 的调度与执行 ——
function schedulePassiveEffects(effects) {
  // 收集阶段（同步）：被卸载组件的 cleanup。deletions 里是被删除的顶层 fiber，
  // 删除一个子树 = 卸载子树里的所有组件，所以要沿 child 下钻整棵子树收集
  const unmountCleanups = []
  deletions.forEach((fiber) => collectSubtreeCleanups(fiber, unmountCleanups))
  if (effects.length === 0 && unmountCleanups.length === 0) return

  // 执行阶段（异步）：模拟 React "paint 之后的 passive 时机"
  queueMicrotask(() => {
    // ① 先全部清理：卸载的 + 即将重跑的（对应真实 React 的 commitPassiveUnmountEffects）
    unmountCleanups.forEach((fn) => fn())
    effects.forEach((hook) => {
      if (typeof hook.cleanup === 'function') hook.cleanup()
    })
    // ② 再全部执行（对应 commitPassiveMountEffects）
    effects.forEach((hook) => {
      const returned = hook.effect()
      hook.cleanup = typeof returned === 'function' ? returned : null // 记录新的清理函数
    })
  })
}

function collectSubtreeCleanups(fiber, out) {
  // 深度优先收集子树内所有 effect hook 的 cleanup
  let hook = fiber.memoizedState
  while (hook) {
    if (hook.tag === 'effect' && typeof hook.cleanup === 'function') {
      out.push(hook.cleanup)
      hook.cleanup = null // 置空：防止同一清理被执行两次
    }
    hook = hook.next
  }
  // 只沿 child 下钻、不走 sibling：deletions 里的每个顶层删除项都会被单独遍历，
  // sibling 属于"别人家的删除项"，串过去会误删
  if (fiber.child) collectSubtreeCleanups(fiber.child, out)
}
```

关于执行时机的选择，必须诚实地说清楚一层区别：**`queueMicrotask` 严格说发生在 paint 之前，不是之后。** 微任务在当前宏任务（事件处理器 / 我们的 workLoop tick）的同步代码一结束就清空，而浏览器绘制要等宏任务与微任务都安静下来才发生。真实 React 的 passive effects 用 scheduler 的 `MessageChannel` 宏任务调度，宏任务之间浏览器有机会 paint，所以严格落在"paint 之后"。我们选 `queueMicrotask` 是教学取舍：它最直观地演示了"effect 不阻塞 commit、不在 DOM 操作中间执行"这一核心性质。要模拟真实时序，把 `queueMicrotask(fn)` 换成 `setTimeout(fn, 0)` 即可——M10 的 useLayoutEffect 一节会用到这个开关做闪烁对照实验。

还有一条生命周期要说明：`deletions` 数组在每次发起 render 时被重置为 `[]`（`render()` 和 `setState` 里），`schedulePassiveEffects` 在 commit 结束的同步段就读完了它，异步执行时引用已被 `slice` 语义地保存在局部数组里，所以不会读到脏数据。

#### 8.4 cleanup 的两个调用时机与顺序保证

cleanup（effect 返回的清理函数）只在这两个时机被调用，此外没有任何路径会碰它：

| 时机 | 触发条件 | 在代码里的位置 |
|---|---|---|
| ① 下一次 effect 执行之前 | 依赖变化导致重跑 | flush 的第 ① 步，紧跟在卸载清理之后 |
| ② 组件卸载之时 | fiber 进入 `deletions` | `collectSubtreeCleanups` 收集，flush 的第 ① 步执行 |

两个时机都落在 flush 的"第 ① 步"不是巧合，这是**顺序保证**：**先对本轮涉及的所有组件执行全部清理，再执行全部新 effect**——跨组件也是这个顺序，而不是"A 清理 → A 执行 → B 清理 → B 执行"的交错顺序。为什么？考虑一个聊天室场景：组件 A 订阅了房间 1，B 订阅了房间 2，依赖变化导致两者都要重订。交错顺序下可能出现"A 已订到新版房间 1，B 的旧订阅还没拆"的中间态——如果重跑的 effect 会触发对方关心的通知，B 的旧 handler 就会在已不该存在的订阅上多跑一次。全部先拆再全部重建，则任何新 effect 开始执行时，旧世界的订阅已经清零。真实 React 源码里这就是两个独立的函数：`commitPassiveUnmountEffects`（全部 destroy）和 `commitPassiveMountEffects`（全部 create），我们的 flush 把它们排成先后两段，语义对齐。

配套一条实验日志（在 flush 的 ① ② 两步各加一行 `console.log` 即可验证）：

```text
[flush ①] unmount: <Timer/> 的 cleanup 执行
[flush ①] rerun-destroy: <ChatRoom/> 旧订阅拆除
[flush ②] rerun-create: <ChatRoom/> 新订阅建立
```

永远看不到"② 跑完了又出现 ①"，也看不到"ChatRoom 已建新订、Timer 旧订未拆"的交错——顺序保证就在这两段 `forEach` 的先后里。

#### 8.5 复现实验：依赖漏写导致闭包旧值（M8 密度最高的一节）

这是 useEffect 最高频的真实事故，值得我们用最完整的方式推演一遍。实验组件如下，依赖数组**故意漏写** `count`：

```js
/** @jsx createElement */
function StaleCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('effect 看到的 count =', count)
    return () => {
      console.log('cleanup 看到的 count =', count)
    }
  }, []) // ← 漏写了 count

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  )
}

render(<StaleCounter />, document.getElementById('root'))
// 点击 +1 三次后，控制台实际输出：
// effect 看到的 count = 0        ← 只有挂载时这一次
// 页面上 count: 3，但 effect 再也没打印过
```

页面明明显示 3，effect 的日志却永远停在 0。逐渲染推演，看每次 render 里各发生了什么：

| 时刻 | 第几次 render | 函数执行时 count 的值 | 本次创建的 effect 闭包 | hasDepsChanged 结果 | 实际执行的是谁 |
|---|---|---|---|---|---|
| 首次挂载 | 1 | 0 | `effect₁`（捕获 count=0） | `prevDeps=undefined` → true | `effect₁`，打印 0 |
| 点击 +1 | 2 | 1 | `effect₂`（捕获 count=1） | `[]` vs `[]` → 长度相等、零次比较 → false | 没人执行 |
| 点击 +1 | 3 | 2 | `effect₃`（捕获 count=2） | `[]` vs `[]` → false | 没人执行 |
| 点击 +1 | 4 | 3 | `effect₄`（捕获 count=3） | `[]` vs `[]` → false | 没人执行 |

**8.5.1 闭包机制：effect 看到的不是"变量"，是"那一次 render 的环境快照"。** 函数组件每执行一次，JS 引擎就为这次调用创建一个新的词法环境（作用域），`count`、`setCount` 都是这个环境里的绑定。`useEffect(callback, [])` 里的 `callback` 是在这个环境里**创建**的函数对象，它对 `count` 的引用永远指向该环境的绑定——这就是闭包。第 1 次 render 的环境里 `count` 是 0，`effect₁` 从出生起就"活在 1998 年"：无论后来第 2、3、4 次 render 创建了多么新的环境，`effect₁` 与它们毫无关系。而 `useEffect` 的工作只是决定**执行哪个函数对象**：依赖没变，它就一次也不执行新函数，于是被执行过的永远是 `effect₁`，打印的自然永远是 0。页面显示 3 是因为 render 阶段（第 4 次函数执行）返回的 `<p>{count}</p>` 用的是**第 4 次的环境**——同一个组件、两套时间线，这就是"页面是新的、effect 是旧的"的全部机制。

**8.5.2 为什么"cleanup + 重跑"救不了。** 一个常见的侥幸想法是："就算 effect 旧了，cleanup 或多或少能补救吧？"推演一遍会发现连补救的机会都不存在。第一，cleanup₁ 与 effect₁ 创建于同一个环境（第 1 次 render），它捕获的同样是 count=0——就算执行，看到的还是旧值。第二，更根本的：cleanup 只在"下一次 effect 执行前"或"卸载时"才被调用，而依赖 `[]` 没变意味着**重跑这件事本身不会发生**——`hasEffect` 为 false，effect₂/₃/₄ 从未被登记，cleanup₁ 也就永远挂着不触发。也就是说，依赖漏写的问题不是"重跑时拿了旧值"，而是"该重跑的那次 render 创建的新闭包被静默丢弃了"。想让新闭包被执行，唯一通路就是让 `hasDepsChanged` 返回 true——把 `count` 写进依赖。这也顺带解释了为什么 React 无法自动帮你收集依赖：函数组件每次 render 都完整重执行，React 无法静态分析出"effect 的闭包里引用了哪些外层变量"（Vue 能用 Proxy 拦截做到，React 的函数式模型做不到），只能把声明依赖的责任交给开发者，再用 ESLint 规则兜底。

**8.5.3 正确写法与两种替代方案。** 按场景三选：

```js
// 写法一：把 count 写进依赖——最直接的修正，"count 变了就重跑"
useEffect(() => {
  console.log('effect 看到的 count =', count) // 永远是触发重跑那次的值
  return () => console.log('cleanup 看到的 count =', count)
}, [count])
// 输出：0 →（点击）cleanup 0、effect 1 →（点击）cleanup 1、effect 2 ……
```

```js
// 写法二：函数式更新——当副作用的目的是"基于最新 state 计算下一个 state"时，
// 根本不需要让 effect 重跑。经典场景：只建一次的定时器
useEffect(() => {
  const id = setInterval(() => {
    // setCount(count + 1)     // ✗ 拿到的是本环境（首次 render）的 count=0，永远是 1
    setCount((prev) => prev + 1) // ✓ action 执行时，hook.state 一定是最新的（M7 的 action queue）
  }, 1000)
  return () => clearInterval(id)
}, []) // ← 这里的 [] 是正确意图：定时器本来就只该建一次，不是漏写
```

```js
// 写法三：ref 逃逸——当 effect 需要的是"最新值"而完全不关心"变化"时
//（M9 实现 useRef 之后可用）
const countRef = useRef(null)
countRef.current = count // 每次 render 同步刷新（写在组件体里，render 阶段执行）
useEffect(() => {
  const handler = () => console.log('最新 count =', countRef.current) // 永远读到最新
  window.addEventListener('mousemove', handler)
  return () => window.removeEventListener('mousemove', handler)
}, []) // 监听只建一次是正确意图，读值走 ref 不走闭包
```

三者的分界线一句话总结：**关心"变化"（每次变化要重新做事）→ 写进依赖；只关心"最新值"（基于最新值计算）→ 函数式更新；两者都不关心、纯粹要读一下 → ref**。日常开发中把 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则打开，它会在编译期指出所有漏写——而你现在知道了它每一条警告背后，都是本节推演的这套闭包机制。

#### 8.6 M8 验收

- 依赖变化重跑：写一个 `useEffect(..., [n])`，点按钮改 n，控制台按"cleanup（旧 n）→ effect（新 n）"成对出现，绝不只出现一半。
- 依赖不变不跑：改成 `[ ]` 后无论点多少次按钮，effect 只在挂载时打印一次（8.5 已完整推演）。
- 卸载清理：条件渲染一个带定时器的组件（外层用 state 控制挂载/卸载），卸载后定时器日志停更——cleanup 生效。
- 顺序保证：flush 两段日志中，所有 ① 在所有 ② 之前（8.4）。
- 不阻塞 commit：在 effect 里写一个 `console.timeEnd` 对比，确认 effect 执行时 DOM 已经上屏（`commitWork` 早已同步返回）。
