# React 源码学习：复刻一个简化版 React

> 定位：第六份文档。目标不是读源码，是**复刻**——从 200 行的 `render` 起步，到约 2000 行、带 Fiber/Hooks/调和的 mini React，每一步都解决一个"React 为什么要这样设计"的问题。
> 为什么复刻最优：React 源码 30 万+ 行，直接读必迷路；复刻时每个概念都是绕不过去的坎，**理解是被逼出来的**。
> 周期：4–5 周（复刻 2–3 周 + 对照真实源码 1 周 + 验收应用 1 周）。

---

## 1. 前置：真实 React 的架构地图（1 天，先有地图再上路）

### monorepo 分包
| 包 | 职责 | 复刻对应 |
|---|---|---|
| `react` | 入口 API（createElement/hooks 导出） | 我们的 `Didact.createElement` |
| `react-reconciler` | **调和器**：Fiber、diff、hooks（核心中的核心） | M3–M9 主体 |
| `scheduler` | 调度器：优先级、时间切片 | M3 的简化版 |
| `react-dom` | 渲染器：DOM 操作、合成事件 | M2 的 dom 操作 + M9 事件 |

### 核心分层与三个阶段
```
setState ──► Scheduler(调度: 何时开始、可否中断)
              └► Reconciler(调和: 构造 Fiber 树、打 effectTag)   ← 可中断
                    └► Renderer(commit: 一次性操作 DOM)            ← 不可中断
```
- **Fiber 双缓冲**：current（屏幕上）与 workInProgress（构造中）两棵树，`alternate` 互指——可中断而不撕裂的关键
- JSX 链路：`jsx-runtime` → `createElement` → `ReactElement` 普通对象 `{ type, props }`

✍️ 练习：用 `@babel/plugin-transform-react-jsx` 的 classic 模式把 JSX 指向自己的 `createElement`，打印 element 树看个明白。

---

## 2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）

### M1：createElement 与虚拟 DOM（0.5 天）
- 手写 `createElement(type, config, ...children)`：children 扁平化、文本包成 TEXT_ELEMENT、props 合并
- 验证：`console.log(element)` 与真实 React 的 element 对比

### M2：render v1 —— 递归直渲（0.5 天）
- `render(element, container)`：递归 createDOM / appendChild / 设置 props（含事件）
- **故意保留缺陷**：递归不可中断 → 渲染万级节点卡死主线程（亲身体验，Fiber 的动机就刻在心里了）

### M3：并发思路与 Fiber 数据结构（1 天）
- 为什么不用 `requestIdleCallback`（浏览器实现不稳定）/ rAF（节奏不对）/ `setTimeout`（最小间隔 & 优先级）：真实 scheduler 用 **MessageChannel 宏任务** 宏观讲解
- Fiber 节点：`{ type, props, dom, parent, child, sibling, alternate, stateNode, effectTag }`
- **链表化遍历**：`performUnitOfWork`——先 child、无 child 走 sibling、都无走 return（叔叔），单元工作可暂停
- workLoop：`while (nextUnitOfWork && deadline.timeRemaining() > 1)`

### M4：render 与 commit 分离（1 天）
- 问题：M3 中断时 DOM 改了一半 → 页面撕裂
- 方案：render 阶段只构造 fiber 树**不碰 DOM**，整棵完成后 commit 阶段一次性 append/patch
- 这就是 React "渲染与提交两阶段"的雏形；中断只可能发生在 render

### M5：Reconciliation —— diff 与复用（2 天）⭐核心
- `alternate` 指向旧 fiber，逐个对比：
  - same type → 复用 DOM，diff props 生成更新（UPDATE）
  - type 变了 → 新建（PLACEMENT）+ 旧树标 DELETION
- children 对比升级：v1 按 index 对比 → v2 **按 key 建映射对比**
- 亲手实现后你就明白：**key 不是"优化"，是复用的身份标识**——index 作 key 时删除中间项为什么错
- props diff：删除变 undefined 的、更新变化的

### M6：函数组件（1 天）
- 函数组件的 fiber **没有 dom**；`children = fiber.type(props)` 执行函数得来
- 更新 = 重新执行函数 → 天然引出" hooks 状态存在哪"的问题（引出 M7）

### M7：useState（1.5 天）⭐核心
- hooks 链表挂在 `fiber.memoizedState`，以 `hookIndex` 对齐新旧 hook
- `setState`：更新 hook.state + 把当前 fiber 设为新 wipRoot 触发调度
- 实现完立刻明白：**为什么 hooks 不能写在 if 里**——链表错位，答案在自己写的 20 行里
- 闭包旧值问题：setState 拿到的是本次 render 的闭包 → 引入 queue + 函数式更新

### M8：useEffect（1.5 天）⭐核心
- effect 挂到 fiber 的 effect 链，**commit 完成后统一执行**（用 `queueMicrotask`/宏任务模拟 paint 后的 passive 时机）
- 依赖数组浅比较决定是否重跑；重跑前先执行上一次的 cleanup
- 亲手做一次"依赖漏写导致闭包旧值"的复现实验

### M9：补全 API 与批处理（2 天）
- `useRef`（{ current } 不参与 diff）、`useMemo`、`useReducer`、`useContext`（context 挂根、沿树下行）
- **批处理简化版**：一次事件里多个 setState 合并为一次调度（微任务收集）——React 18 automatic batching 的雏形
- **合成事件简化版**：事件委托到 root + 包装合成事件对象（讲清为什么 React 要自己搞事件系统：跨浏览器 + 批处理入口）

### M10：选修（各 1 天）
- `useLayoutEffect` 与 useEffect 的时机差（commit 的同步子阶段 vs passive）
- Suspense 简化：child throw promise → 捕获后显示 fallback → resolve 后重试（最难也最有趣）
- 优先级的最简表达：高优先级任务可抢占低优先级任务（跳过细节，理解 lane 的存在意义即可）

---

## 3. 验收：用你的 mini React 写真实应用（1 周）

- 用它实现 **TodoMVC**：useState 管列表/输入、useEffect 持久化 localStorage、列表渲染带 key、事件全走你的合成事件
- 行为对齐测试：与真 React 版本并排跑，重点验证——删除中间项（key）、连续 setState 批处理、effect 清理
- 能跑通 = 你的 React 知识闭环了；跑不通的地方 = 理解的盲区，回炉对应里程碑

---

## 4. 复刻之后：三条深化路径

### 路径 A：对照真实源码（1 周）
按此顺序读 `facebook/react` 的 packages：
1. `scheduler`：`MessageChannel` 调度、优先级队列（对应 M3）
2. `react-reconciler`：`ReactFiberWorkLoop.js`（workLoop/中断/恢复）、`ReactFiberBeginWork`/`CompleteWork`（对应 M3–M5）、`ReactFiberCommitWork`（commit 三子阶段：beforeMutation / mutation / layout，对应 M4）
3. `ReactFiberHooks.js`：真实 hooks 的 dispatcher 双表（mount/update 两套），对应 M7–M8
4. `react-dom-bindings` 的事件系统 `DOMPluginEventSystem`（对应 M9）
- 中文向导：卡颂《React 技术揭秘》、7kms《图解 React 源码》

### 路径 B：精读 Preact 源码（从玩具到工业品）
- Preact：3KB 的 React 兼容实现——你的 mini 与真 React 之间的完美桥梁
- 重点：它的 diff（带 key 的 children 对比）、hooks 实现、和 React 的行为差异清单

### 路径 C：用官方 react-reconciler 写自定义渲染器（换一个方向证明你懂了）
- 用 `react-reconciler` 的 hostConfig 把 React 渲染到 **canvas / 终端 / 音乐序列**（官方有 react-three-fiber 这个成功先例）
- 写过自定义 renderer，"React 与渲染器分离"的架构就从知识变成经验

---

## 5. 自测题（复刻完应能脱口而出）

1. 为什么 hooks 不能放条件语句里？（M7 链表对齐）
2. Fiber 双缓冲如何做到"可中断但不撕裂"？（M4 + alternate）
3. commit 为什么分 beforeMutation/mutation/layout 三个子阶段？useLayoutEffect 在哪个？（M4/M10）
4. useEffect 为什么在 paint 之后执行？passive 的意义是什么？（M8）
5. key 到底解决什么问题？index 作 key 删除中间项会发生什么？（M5）
6. React 18 的 automatic batching 靠什么合并多次 setState？（M9）
7. 为什么 React 要造合成事件而不是直接用原生？（M9：统一入口 + 批处理）
8. setState 拿到旧闭包值的原因与两种解法？（M7）
9. scheduler 为什么用 MessageChannel 而不是 setTimeout/rAF？（M3）
10. 函数组件和类组件在调和层的本质区别？（M6：无 stateNode，重执行函数）

---

## 6. 与前五份文档的连接

- M5 的 diff/key → 基础大纲阶段 1 的"为什么不能用 index"，从使用规则升级为实现原理
- M7 闭包旧值 → 基础大纲阶段 2 的闭包陷阱专题，同源不同层
- M9 批处理 → 组件库 Toast 队列、长列表高频更新的理解底座
- M3 调度 → 全景图 E1 长任务分帧、`useTransition` 的心智模型
- M10 Suspense → 进阶大纲阶段 9 RSC/Suspense 的前置理解

## 7. 节奏总表（约 5 周）

| 周 | 内容 |
|---|---|
| 1 | M1–M4（element → render → Fiber → 两阶段提交） |
| 2 | M5–M7（diff/key、函数组件、useState）——最硬的一周 |
| 3 | M8–M9（useEffect、批处理、合成事件）+ 选修 M10 |
| 4 | 验收：mini React 版 TodoMVC + 行为对齐 |
| 5 | 三选一深化：真实源码 / Preact / 自定义 renderer |

> 参考实现：pomber/didact（本路线的骨架来源，经典教程 "Build Your Own React"）；卡颂《React 技术揭秘》；7kms/react-illustration-series。
