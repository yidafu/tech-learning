---
title: "M4：render 与 commit 分离（1 天）"
---

> 本文是《2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）》按小节拆分后的续篇，上一部分见 [04-M3-并发思路与-Fiber-数据结构-1-天.md](04-M3-并发思路与-Fiber-数据结构-1-天.md)。

### M4：render 与 commit 分离（1 天）

- 问题：M3 中断时 DOM 改了一半 → 页面撕裂
- 方案：render 阶段只构造 fiber 树**不碰 DOM**，整棵完成后 commit 阶段一次性 append/patch
- 这就是 React "渲染与提交两阶段"的雏形；中断只可能发生在 render

#### 4.1 先把"撕裂"亲手复现出来

§1 双缓冲一节给出过不变量，M3 恰好违反了"屏幕只认 current 树"。两个实验让违反显形。

**实验一：半棵树可见（单次渲染内部撕裂）。** M3 代码下渲染万级节点，每个时间片结束时，那些已 `appendChild` 进文档的节点在下一次 paint 里就被画了出来。现象：列表"一截一截长出来"，每个中间状态都是真实可见的半成品。如果此时来了高优先级打断（比如用户疯狂点击），半成品会在屏幕上停留更久。用 MutationObserver 把它钉死：

```js
// 撕裂检测器：统计 root 下插入操作被分成多少批
const observer = new MutationObserver(mutations => {
  const added = mutations.reduce((n, m) => n + m.addedNodes.length, 0)
  console.log(`[MutationObserver] 本批插入 ${added} 个节点 @${(performance.now() / 1000).toFixed(2)}s`)
})
observer.observe(document.getElementById('root'), { childList: true, subtree: true })
```

（机制注解：MutationObserver 回调在微任务里触发，**同一宏任务内的所有 DOM 变更合并成一次回调**——所以"批次数"精确等于"宏任务数"，也就等于时间片数。）M3 版跑万节点：十几批、每批几百个，时间戳分散——**屏幕被中间态污染了十几次**。

**实验二：两个版本的混合（并发竞态撕裂，更严重）。** M3 的 `render` 每次都无条件重置 `wipRoot`。如果第一次大渲染进行到一半时第二次 `render` 到来：

```js
// M3 版撕裂复现
import { createElement, render } from './didact.js'

const bigList = n =>
  createElement(
    'ul', null,
    ...Array.from({ length: n }, (_, i) =>
      createElement('li', { key: 'a' + i, style: 'padding:2px' }, `列表 A - ${i}`)
    )
  )

render(bigList(5000), document.getElementById('root'))

// 故意卡在第一次渲染中途：第二次 render 重置 wipRoot，旧工作被半途抛弃
setTimeout(() => {
  render(bigList(30), document.getElementById('root'))
}, 50)
```

推演 + 现象：50ms 时第一次渲染大约进行到两三千个节点，这些 DOM **已经真实挂进了文档**；第二次 `render` 把 `wipRoot` 指向全新树，旧 wip 树连同"还没渲染的部分"一起被抛弃——但已挂进去的那两千多个 li 没有任何代码负责收尸。最终屏幕：**两千多个 A 列表项 + 完整的 30 项 B 列表共存**，新旧两个版本当场缝合。这就是撕裂的完整形态：不只是"闪一下半成品"，而是**持久的逻辑错误画面**。

对照 §1 不变量检查 M3 违反了哪条：实验一违反"屏幕只认 current 树"（render 阶段碰了文档）；实验二再加上"没有原子提交"（部分 DOM 提前生效且不可回滚）。两条一起修。

#### 4.2 方案：两阶段分离的完整实现

修复思路与 §1 三条不变量一一对应：render 阶段（`performUnitOfWork`）**只造游离 DOM 节点**——`document.createElement` 出来的节点在 `appendChild` 进文档之前属于游离态，不参与布局、不触发渲染、浏览器看不见，所以"创建"不算"碰"；全部单元完成后进入 commit 阶段（`commitRoot` → `commitWork`），**一段同步递归**把整棵树挂进文档。

`didact.js` M4 完整版（本里程碑终稿，从头到尾可整体替换）：

```js
// src/didact.js —— M4 完整版：render/commit 两阶段
export const TEXT_ELEMENT = 'TEXT_ELEMENT'

export function createTextElement(text) {
  return {
    type: TEXT_ELEMENT,
    props: { nodeValue: text, children: [] },
  }
}

export function createElement(type, config, ...children) {
  const props = {}
  let key = null
  if (config != null) {
    key = config.key != null ? String(config.key) : null
    for (const name in config) {
      if (name !== 'key') {
        props[name] = config[name]
      }
    }
  }
  props.children = children
    .flat(Infinity)
    .filter(child => child !== false && child !== true && child != null)
    .map(child => (typeof child === 'object' ? child : createTextElement(child)))
  return { type, key, props }
}

export function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  return dom
}

const isEvent = name => name.startsWith('on')
const isProperty = name => name !== 'children' && !isEvent(name)
const isNew = (prev, next) => name => prev[name] !== next[name]
const isGone = (prev, next) => name => !(name in next)

export function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(name => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
}

// —— 调度与工作循环（Scheduler + Reconciler 的 render 阶段）——
let nextUnitOfWork = null // 下一个工作单元
let wipRoot = null        // 正在构造的树；commit 完成前屏幕与它完全无关

export function render(element, container) {
  wipRoot = {
    type: null,
    props: { children: [element] },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
    alternate: null,
    effectTag: null,
  }
  nextUnitOfWork = wipRoot
  // 注意：这里没有 requestIdleCallback——workLoop 已在模块底部常驻启动
}

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  // 新增：整棵树构造完成（且确实存在待提交的树）→ 进入提交
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

// —— Reconciler 的 render 阶段：只造树，不碰文档 ——
function performUnitOfWork(fiber) {
  // ① 创建游离 DOM：createElement/textNode 不插入文档，
  //    不参与布局与渲染——"造节点"不是"碰屏幕"
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // 【M3 的 appendChild 在这里被删除——这就是本里程碑的核心改动】

  // ② children → child/sibling 链表（与 M3 完全相同）
  const elements = fiber.props.children
  let index = 0
  let prevSibling = null
  while (index < elements.length) {
    const element = elements[index]
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
      child: null,
      sibling: null,
      alternate: null,
      effectTag: 'PLACEMENT', // M4 起打标：新建节点 = "放置"（无旧树可对比，全部是放置）
    }
    if (index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }

  // ③ 下一个单元：child → sibling → return（叔叔）
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

// —— Renderer 的 commit 阶段：同步、原子、一次性执行 ——
function commitRoot() {
  // wipRoot 本身是容器包装，真正要提交的是它的孩子
  commitWork(wipRoot.child)
  wipRoot = null // 提交完立刻清空：双缓冲完成翻转，也防止下一轮空转重复提交
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  // 按 effectTag 执行操作。M4 只有 PLACEMENT 一条指令；
  // UPDATE（调 updateDom）与 DELETION（连同 deletions 数组）由 M5 在此扩展
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  }
  // 先深度提交孩子，再提交兄弟——与 render 阶段的遍历顺序同构
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
```

逐块讲清"为什么这样修"：

**`performUnitOfWork` 里删掉的那行 appendChild 是全部要义。** render 阶段从"边算边写屏"变成"只算不写屏"。游离节点的关键性质：`document.createElement('li')` 返回的对象尚未接入文档树，浏览器渲染管线（样式计算、布局、paint）完全忽略它，对它做任何设置属性的操作都零渲染成本。于是中断一万次，屏幕也一帧未变——不变量 1 修复。

**`commitRoot` / `commitWork` 是"一次性"的技术保障。** 它们是一段普通同步递归：JS 引擎保证同步代码执行期间不发生渲染、不插入其他任务——所以从第一个 appendChild 到最后一个之间，浏览器没有任何机会画中间态。这段代码有多长就多原子。commit 完成后 `wipRoot = null`，一来防重复提交，二来语义上宣告"这棵工作树已毕业为 current 树"（M5 会正式引入 `currentRoot` 变量完成双缓冲的翻转登记）——不变量 3 落地。

**`effectTag` 从 M4 起启用。** M4 场景里没有旧树可对比，所有新 fiber 一律 `'PLACEMENT'`，commitWork 只执行放置。看起来"多此一举"，但它是为 M5 铺的关键轨道：下个里程碑 diff 出 UPDATE/DELETION 后，commitWork 的结构一个字不用大改、只是加两个分支。先立规矩再加内容，这正是 render 阶段"打标"、commit 阶段"照单执行"的分工雏形。

**workLoop 的那个新判断**：`if (!nextUnitOfWork && wipRoot) { commitRoot() }`——"工作做完了，且确实有一棵待提交的树"。两个条件缺一不可：没有第一个条件会在树没造完时提交半成品（撕裂回归）；没有第二个条件会在空转周期里反复提交空树。

#### 4.3 对应到 React：这就是 render/commit 两阶段的雏形

把 M4 的结构与真实 React 摆在一起对齐：

| 本篇（M4） | 真实 React | 说明 |
|---|---|---|
| `performUnitOfWork` 构造 wip 树 | render 阶段：`beginWork`（向下）+ `completeWork`（向上收尾） | 我们用一个函数吞了两段 |
| `workLoop` 的时间片循环 | `ReactFiberWorkLoop.js` 的 workLoop（带优先级、可丢弃重来） | 骨架相同，真实版多了 lane 与饥饿处理 |
| `commitRoot` + `commitWork` | commit 阶段：`commitRoot` 入口 | 真实版分 beforeMutation / mutation / layout 三个同步子阶段 |
| `effectTag`（字符串） | `flags`（位标志） | 18 起改名并支持多操作叠加 |
| （M5 加入 `deletions`、`updateDom` 调用） | mutation 子阶段的 Placement/Update/Deletion | M5 扩展 commitWork |

真实 commit 阶段为什么再拆三个子阶段（一句话版，M8/M10 展开）：beforeMutation 要在动 DOM 之前读取布局信息（`getSnapshotBeforeUpdate`）；mutation 才真正动 DOM；layout 在 DOM 已更新后同步执行 `useLayoutEffect`（组件里能立刻读到新 DOM）；`useEffect` 则被推迟到 paint 之后异步执行（passive effect）。我们 M4 的 `commitWork` 大致是 mutation 子阶段中 Placement 那部分的雏形。

最后回答本里程碑标题里那个断言：**中断为什么只可能发生在 render 阶段？**

1. **技术上**：render 阶段的工作被切成了一个个工作单元，单元之间是调度器插进来的让出点——存在"可停的缝"；而 commit 阶段是一整段同步代码，JS 引擎不在同步代码中间交还控制权，**根本没有缝**，浏览器不可能在 commit 的半中间 paint 或插队；
2. **设计上**：render 阶段无副作用（只碰内存与游离节点），停下来、扔掉、重来都安全；commit 阶段全是副作用（改的是文档里的共享状态），一旦开始就必须走完，否则就回到撕裂。**"有副作用的代码必须原子执行"是被 M3 的两个实验换来的设计纪律**；
3. **React 的补充保证**：真实 React 里，即便更高优先级的更新在 commit 途中到达（比如 commit 前一微秒用户点了按钮），React 也不会中断正在执行的 commit——它会让本次 commit 跑完，然后**立刻开始下一轮更高优先级的 render**。打断的是"下一轮"，不是"当轮"。这个细节在自测题 2（"Fiber 双缓冲如何做到可中断但不撕裂"）里是完整答案的最后一块。

**验收方式（M4）**：① **实验一复检**——万节点渲染 + MutationObserver：输出从 M3 的十几批变为**一次回调、一批一万个节点**（所有 appendChild 都在同一段同步代码里，微任务合并为一次回调），肉眼看页面是"空白 → 一瞬间整树出现"；② **实验二复检**——重跑双 render 竞态：50ms 时第二次 render 重置 wipRoot，旧工作树整体作废（它的游离节点从未进过文档，直接被 GC），最终屏幕**只有 30 项 B 列表**，无任何 A 的残留；clock 全程未停（render 阶段照常让出时间片）；③ **断点验证原子性**——在 `commitRoot()` 第一行下断点，此刻 DevTools Elements 面板里 root 是空的；单步放过整个 `commitWork` 递归后再看，一万节点整树出现——中间任何时刻刷新 Elements 都看不到半成品；④ **回归检查**——M3 的验收项 2（遍历顺序 log）在 M4 版上原样通过（render 阶段的遍历逻辑未动，只是搬家）。四项全过，M4 完成：**至此 React 架构地图的三层（Scheduler / Reconciler / Renderer）你都亲手写过一遍，M5 起的所有工作都是在"复用对比"这条新轨道上继续跑**。

