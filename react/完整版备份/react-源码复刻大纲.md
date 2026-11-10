# React 源码学习：复刻一个简化版 React

> 定位：第六份文档。目标不是读源码，是**复刻**——从 200 行的 `render` 起步，到约 2000 行、带 Fiber/Hooks/调和的 mini React，每一步都解决一个"React 为什么要这样设计"的问题。
> 为什么复刻最优：React 源码 30 万+ 行，直接读必迷路；复刻时每个概念都是绕不过去的坎，**理解是被逼出来的**。
> 周期：4–5 周（复刻 2–3 周 + 对照真实源码 1 周 + 验收应用 1 周）。

## 目录

- [1. 前置：真实 React 的架构地图（1 天，先有地图再上路）](#1-前置真实-react-的架构地图1-天先有地图再上路)
  - [monorepo 分包](#monorepo-分包)
  - [核心分层与三个阶段](#核心分层与三个阶段)
- [2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）](#2-复刻路线十个里程碑每步可运行命名沿用经典-didact)
  - [M1：createElement 与虚拟 DOM（0.5 天）](#m1createelement-与虚拟-dom05-天)
  - [M2：render v1 —— 递归直渲（0.5 天）](#m2render-v1--递归直渲05-天)
  - [M3：并发思路与 Fiber 数据结构（1 天）](#m3并发思路与-fiber-数据结构1-天)
  - [M4：render 与 commit 分离（1 天）](#m4render-与-commit-分离1-天)
  - [M5：Reconciliation —— diff 与复用（2 天）⭐核心](#m5reconciliation--diff-与复用2-天核心)
  - [M6：函数组件（1 天）](#m6函数组件1-天)
  - [M7：useState（1.5 天）⭐核心](#m7usestate15-天核心)
  - [M8：useEffect（1.5 天）⭐核心](#m8useeffect15-天核心)
  - [M9：补全 API 与批处理（2 天）](#m9补全-api-与批处理2-天)
  - [M10：选修（各 1 天）](#m10选修各-1-天)
- [3. 验收：用你的 mini React 写真实应用（1 周）](#3-验收用你的-mini-react-写真实应用1-周)
  - [3.1 API 覆盖对照：TodoMVC 用到什么、验收哪个里程碑](#31-api-覆盖对照todomvc-用到什么验收哪个里程碑)
  - [3.2 TodoMVC 完整实现](#32-todomvc-完整实现)
  - [3.3 行为对齐测试清单：每条都有"如何验证"的具体操作](#33-行为对齐测试清单每条都有如何验证的具体操作)
  - [3.4 跑不通的地方 = 理解的盲区：症状 → 回炉映射表](#34-跑不通的地方--理解的盲区症状--回炉映射表)
- [4. 复刻之后：三条深化路径](#4-复刻之后三条深化路径)
  - [路径 A：对照真实源码（1 周）](#路径-a对照真实源码1-周)
  - [路径 B：精读 Preact 源码（从玩具到工业品）](#路径-b精读-preact-源码从玩具到工业品)
  - [路径 C：用官方 react-reconciler 写自定义渲染器（换一个方向证明你懂了）](#路径-c用官方-react-reconciler-写自定义渲染器换一个方向证明你懂了)
- [5. 自测题（复刻完应能脱口而出）](#5-自测题复刻完应能脱口而出)
- [6. 与前五份文档的连接](#6-与前五份文档的连接)
- [7. 节奏总表（约 5 周）](#7-节奏总表约-5-周)

---


先把这三行引言展开说透，你再决定要不要投入接下来五周的时间。

**"读源码"为什么低效。** 打开 facebook/react 仓库，`packages/` 下十几个包、核心的 `react-reconciler` 一个目录就有上百个文件，`ReactFiberWorkLoop.js` 单文件两千余行。你没有全局地图时读它，就像不看图纸去读一座城市的全部路牌——每个词都认识，走向却拼不出来。更糟的是，真实源码为了性能和边界情况写了大量与主线无关的代码（优先级、 Suspense、hydration、SSR 分支），它们会把"更新是怎么变成 DOM 的"这条主线淹没。

**"复刻"为什么高效。** 复刻把因果关系倒过来了。你写 `render` 的递归版本，渲染一万个节点把主线程卡死，亲眼看到页面冻结——这时你不需要任何人向你解释"Fiber 是为了什么"，你被问题本身逼到了答案门口。React 的每个设计（调度器、双缓冲、两阶段提交、hooks 链表）在你的复刻路线里都会变成**你自己的需求**，而不是别人塞给你的知识。这就是本篇的方法论：不背结论，重走一遍发明之路，每个里程碑解决一个当年 React 团队必须解决的问题。

**本篇与系列前五份文档的关系。** 这是第六份、也是最后一份。它不教任何新的"使用技巧"，而是把前五份里所有"React 为什么这样"的悬案收口：

- 《react-学习大纲.md》基础阶段 0–1 讲过 JSX 与虚拟 DOM 的概念、阶段 1 讲过"为什么不能用 index 当 key"——本篇 M1/M5 把这些使用规则还原为实现原理；
- 《react-高阶场景全景图.md》E1 长任务分帧、`useTransition` 的心智模型，底座就是本篇 M3 的调度器；
- 《react-进阶大纲-复杂场景.md》的 Suspense/RSC 理解需要 M10 的简化 Suspense 做前置。

**路线与节奏。** 全程十个里程碑（M1–M10），每个都可独立运行、可验收；命名沿用经典教学实现 **didact**（来自 Rodrigo Pombo 的 "Build Your Own React" 教程，本路线的骨架来源）。M1–M4 是第一周的内容，也是**本片段**覆盖的范围：从 `createElement` 写到 Fiber 双缓冲与两阶段提交——这四步走完，React 架构地图上的每一层你都亲手盖过一遍。M5 之后的 diff、函数组件、hooks 由后文续写。

---

## 1. 前置：真实 React 的架构地图（1 天，先有地图再上路）

为什么第一步不是写代码而是看地图：复刻的路线是"自底向上"（先 `createElement` 后 Fiber），但理解需要"自顶向下"——你得先知道真实 React 被拆成了哪几块、每块负责什么，后面每写一个函数时才能立刻对号入座"我在写哪个包的哪部分"。这一天不是读源码，是读**目录结构和模块边界**。

### monorepo 分包

| 包 | 职责 | 复刻对应 |
|---|---|---|
| `react` | 入口 API（createElement/hooks 导出） | 我们的 `Didact.createElement` |
| `react-reconciler` | **调和器**：Fiber、diff、hooks（核心中的核心） | M3–M9 主体 |
| `scheduler` | 调度器：优先级、时间切片 | M3 的简化版 |
| `react-dom` | 渲染器：DOM 操作、合成事件 | M2 的 dom 操作 + M9 事件 |

这四行表格是整份地图的骨架。下面逐行拆开：每个包**内部有什么**、**为什么值得单独成为一个包**、以及它在我们复刻路线里的落点。

#### 第一行：`react` —— 你 import 的那个包，其实是个"API 外壳"

从 `import React from 'react'` 拿到的东西，可能比你以为的少得多。这个包内部大致是：

- **元素工厂与工具**：`createElement`、`cloneElement`、`isValidElement`、`Children.map/forEach/count/toArray`；
- **组件类与包装器**：`Component` 基类、`memo`、`forwardRef`、`lazy`、`Suspense`；
- **hooks 的"转发口"**：`useState`、`useEffect` 等全部从这里导出，但**它们的实现不在本包**——`react` 包内部只持有一个可替换的 `ReactCurrentDispatcher`（调度分发器）对象，渲染期间由 `react-reconciler` 把它换成真正挂载在 fiber 上的实现（`ReactFiberHooks.js` 里的 mount/update 两套函数表）。这也是为什么 hooks 只能在组件渲染中调用：分发器只在那个窗口被装上；
- **并发 API**：`startTransition`、`useDeferredValue` 等导出口。

为什么单独成包：`react` 不依赖任何宿主环境（浏览器 DOM、Node、Native 一概不碰），它是**唯一一个所有渲染目标共用的包**。React Native 项目和 Web 项目 import 的是同一个 `react`，差异全在渲染层。API 声明与实现解耦，也让 `react` 与 `react-dom` 能以不同节奏发版（你 `npm i react@18 react-dom@18` 时它们是两个独立版本号）。

复刻落点：我们的 `didact.js` 对应它——一个纯 JS 模块，导出 `createElement`（M1）、`render`（M2）、后续的 `useState`/`useEffect`（M7/M8）。区别是我们把 reconciler 也写进同一个文件，教学代码不为分包而分包，但你要清楚边界在哪。

#### 第二行：`react-reconciler` —— 核心中的核心，React 的"大脑"

这是 30 万行里最重的一块，也是复刻路线 M3–M9 的主体。内部按职责再分几个子系统（对照源码文件名，后文"路径 A：对照真实源码"会精确到文件）：

- **Fiber 构造**：`ReactFiber.js` 定义节点结构（对应我们 M3 的 fiber 对象）；`ReactFiberBeginWork.js` 自顶向下处理每个节点（对应 `performUnitOfWork` 的"向下"半段）、`ReactFiberCompleteWork.js` 自底向上收尾（对应"回溯找叔叔"半段）；
- **工作循环**：`ReactFiberWorkLoop.js`——时间切片、中断、恢复、以及"什么时候开始 commit"（对应我们 M3/M4 的 `workLoop`）；
- **diff/调和**：`ReactChildFiber.js` 对比新旧 children 决定复用还是新建（对应 M5）；
- **hooks 实现**：`ReactFiberHooks.js`，以链表挂在 fiber 上（对应 M7/M8 的 `fiber.memoizedState`）；
- **优先级模型**：lane 模型（`ReactFiberLane.js`），决定谁先谁后（我们只在 M10 用最简方式摸一下）。

它最关键的设计是**完全不认识 DOM**。`react-reconciler` 通过一个注入的 hostConfig 对象与外界交互——"给我创建一个宿主节点""把这个节点挂到那个节点下"。谁注入 hostConfig，React 就渲染到谁：`react-dom` 注入 DOM 版，react-native 注入原生视图版，社区的 react-three-fiber 注入 Three.js 场景对象版。这就是"React 与渲染器分离"不是口号而是代码结构。

为什么单独成包：调和逻辑与渲染目标无关，一份代码服务所有宿主；`react-reconciler` 单独发包，任何人都能拿它写自定义渲染器（本篇末尾的深化路径 C）。

复刻落点：M3 的 fiber 结构与 `workLoop`、M4 的两阶段、M5 的 diff、M7/M8 的 hooks，全部是它的简化版。我们文件里除了 `createDom`/`updateDom` 这两个"DOM 专属"函数之外的部分，都属于 reconciler 的地盘。

#### 第三行：`scheduler` —— 通用调度器，甚至不叫 "react-scheduler"

注意包名：它不叫 react-scheduler，因为它不含任何 React 概念，是一个**通用任务调度库**——任何"长任务想切成小片、还想分优先级"的场景都能用。内部有：

- **五级优先级**：`Immediate`（同步，如离散输入的直系更新）、`UserBlocking`（用户交互）、`Normal`（默认）、`Low`、`Idle`；
- **任务队列**：按"过期时刻"组织的小顶堆，越紧急的任务越早出队；
- **时间切片**：默认每片 5ms（会按实际帧率自适应），干不完就让出主线程、预约下一个宏任务继续；
- **消息循环**：用 `MessageChannel` 制造宏任务（M3 会专门讲为什么是它）。

它解决的两个问题："**何时开始**"（高优先级任务可以插队到低优先级前面）与"**可否中断**"（时间片耗尽就停，浏览器先去渲染、处理输入，下一片再回来）。

为什么单独成包：调度是通用问题，与 React 概念解耦后别的库也能用，React 自己也便于独立测试与演进（它确实经历过从 requestIdleCallback 到自制时间切片的大转向，M3 讲这段历史）。

复刻落点：M3 的简化版——我们只有 `requestIdleCallback` 一档优先级、一个工作单元指针，没有堆、没有 lane。但"时间片 + 让出 + 恢复"的骨架一模一样。

#### 第四行：`react-dom` —— 唯一一个会碰 DOM 的包

浏览器专属代码全部集中在这里：

- **入口**：`createRoot(...).render(...)`（React 18 起，旧的 `ReactDOM.render` 已进入废弃流程）；
- **hostConfig 的 DOM 实现**：怎么 `document.createElement`、怎么 diff 属性、怎么 append/remove——对应我们 M2 的 `createDom`/`updateDom`；
- **事件系统**：React 17 起把事件委托从 document 收回到 root 容器上，合成事件、批处理入口都在这里（React 18 源码里又拆出一个 `react-dom-bindings` 目录承载事件绑定，对外仍从 `react-dom` 导出）——对应 M9；
- **服务端渲染**：`react-dom/server` 的 `renderToString`/`renderToPipeableStream`（本篇不涉及）。

为什么单独成包：平台代码高内聚——换宿主时只换这一层；同时它是四个包里体积最大、最不值得打进非 DOM 环境的，独立发包利于按需加载。

复刻落点：M2 的 `createDom`/`updateDom`/`appendChild` 就是它的雏形。复刻时你会体会到一个微妙的边界感：`didact.js` 里凡是出现 `document.` 的行，都属于"react-dom 的地盘"。

#### 分包的总原则：一句话版本

四个包回答四个问题：`react`——"开发者调用什么 API"；`react-reconciler`——"如何把描述变成操作计划"；`scheduler`——"什么时候干活、干多久"；`react-dom`——"如何在浏览器里执行计划"。API 与实现解耦（react 包）、计算与执行解耦（reconciler 与 renderer）、策略与机制解耦（scheduler 与 reconciler）——这三个解耦就是 React 架构的全部灵魂，也是我们这份 mini 复刻要在 2000 行内重现的东西。

### 核心分层与三个阶段

```
setState ──► Scheduler(调度: 何时开始、可否中断)
              └► Reconciler(调和: 构造 Fiber 树、打 effectTag)   ← 可中断
                    └► Renderer(commit: 一次性操作 DOM)            ← 不可中断
```

这张三层图是一次更新的完整旅程：`setState` 只是把"我有更新需求"登记给调度器；调度器决定何时开工；调和器构造一棵新树并计算差异；渲染器一次性执行差异。下面逐层拆解，重点是每层的"**为什么这样设计**"——三层图上每一个设计决策，都对应一种你不这样做就会亲身踩到的坑。

#### Scheduler：何时开始、可否中断

它管两件事：

- **何时开始**。如果 `setState` 一调用就立刻开始渲染，会出两个问题：一是同一次事件回调里往往有多个 `setState`（改三个状态），逐个渲染就是三次浪费——所以调度器把真正的渲染推迟到当前同步代码（微任务之后）再开始，多次 setState 就合并成一次工作（React 18 automatic batching 的入口，对应我们 M9）；二是不同来源的更新紧急程度不同——用户输入引发的更新必须先于数据刷新的更新，调度器让高优先级任务插队。
- **可否中断**。调度器对"正在干的活"实行时间片制：一片（约 5ms）干不完就让出主线程，把控制权还给浏览器去渲染、去响应输入，然后预约下一片继续。同时，如果干活期间来了更高优先级的任务，当前工作可以被整个丢弃重排。

为什么需要独立调度层——因为**主线程是独木桥**。JS 执行、样式计算、布局、绘制、输入响应全在同一条线程上排队。React 的工作（diff 一棵大树）天然是长任务，不给它装上"红绿灯"，它就会把浏览器堵死。调度器就是红绿灯：它不干活，它只决定"现在能不能干、干到几点必须停"。

#### Reconciler：可中断构造

它干的活：拿着新的 ReactElement 树和现有的 Fiber 树，自顶向下逐节点对比、构造一棵新的工作树（workInProgress），在这个过程中给每个发生变化的节点打上 `effectTag`（新增 PLACEMENT / 更新 UPDATE / 删除 DELETION），最后产出一条"带副作用的节点链"交给渲染器。

**为什么它敢可中断、可丢弃、可重来？** 因为整个阶段只操作内存中的 JS 对象（fiber 节点），一个真实 DOM 都不碰。中断 = 记住"我干到哪个节点了"（`nextUnitOfWork`）；恢复 = 从那个节点继续；作废 = 把工作树扔掉重建，最多浪费一些 CPU，屏幕上什么都不会发生错误。**无副作用，是可中断的前提**——这句话是理解整个 Fiber 架构的钥匙，M4 我们会用代码证明它。

#### Renderer：不可中断提交

它干的活：接过完整的工作树和副作用链，把 DOM 操作一口气执行完——appendChild、removeChild、改属性，以及同步执行 `useLayoutEffect`、异步调度 `useEffect`（这些时机细节属于 M8/M10，此处只需知道"提交阶段里还有收尾工作"）。

**为什么不可中断？** 三个原因叠加：

1. **DOM 是共享状态**。改了一半的 DOM 在下一帧 paint 时会被浏览器如实画出来——半个新 UI 夹着半个旧 UI，就是"撕裂"（M4 会亲手复现）；
2. **同步代码段是原子的**。JS 引擎在一段同步代码执行完之前不会把控制权交还浏览器，所以"一口气跑完"天然获得原子性——这是浏览器送的机会，不用白不用；
3. **提交阶段没有计算**。diff 都在 render 阶段做完了，这里只是机械执行一串已算好的操作，耗时可控，原子跑完不会造成新的长任务灾难。

于是整个架构形成一个漂亮的分工：**计算（重、可中断、可丢弃）与执行（轻、原子、不可分割）分离**。这与显卡的双缓冲、数据库"先写日志再落盘"是同构的思想：把昂贵的、不确定的准备工作放在幕后慢慢做，幕布拉开的一瞬间必须是一次完整的切换。

#### 三阶段的历史包袱：Stack Reconciler

顺带补一块背景：React 15 及之前用的是"Stack Reconciler"——递归遍历组件树、同步一次性完成 diff + DOM 更新，**没有这三层分工**。它的全部工作相当于我们的 M2（递归直渲）：一旦开始跑完为止，大更新会卡死主线程。Fiber 架构（React 16，2017）就是为了把这条同步递归链拆成"调度 + 可中断调和 + 原子提交"三段。所以复刻路线故意让你先写 M2 的递归版本——**你写的每一个 M2 缺陷，都是 React 16 重写的动机**。

#### Fiber 双缓冲：current / workInProgress / alternate

- **Fiber 双缓冲**：current（屏幕上）与 workInProgress（构造中）两棵树，靠 `alternate` 指针一一对应——可中断而不撕裂的关键

这行 bullet 是 §1 里密度最高的一句话，值得用一整节把它拆到分子级。先定义三个词：

- **current 树**：与屏幕上当前 UI 一一对应的 fiber 树。它的每个 fiber 的 `dom` 字段都指着文档里活生生的 DOM 节点。整棵树的持有者叫 `currentRoot`；
- **workInProgress 树（wip 树）**：正在内存中构造的下一版 UI，持有者叫 `wipRoot`。构造期间它**不拥有任何一个已插入文档的 DOM 节点**（M4 之后如此）；
- **alternate**：同一个逻辑位置在新旧两棵树上的两个 fiber 之间的对应指针。真实 React 双向维护（互指）；我们的 mini 版只在新建 wip fiber 时设单向指针 `newFiber.alternate = oldFiber`——diff、hooks 对齐只需"新找旧"，单向就够。

"双缓冲"这个词借自显卡：显卡渲染一帧画面时，front buffer 正在屏幕上显示，back buffer 在幕后被逐像素填充；填满后硬件 flip 一次，两块 buffer 角色互换——**观众永远看不到画了一半的帧**。Fiber 架构完全同构：current 树是 front buffer，workInProgress 树是 back buffer，commitRoot 就是那次 flip。

下面按时间线推演一次完整更新中三者的演化。例子：首次渲染 `<div><h1>标题</h1><p>正文</p></div>`，然后一次点击把 `p` 的文字改掉。这就是后面 M3/M4 代码运行时的真实内存状态，建议对照着读。

```text
── T0 · 首次渲染之前 ──────────────────────────────────────────────
currentRoot ──► null                     （屏幕：空）
wipRoot     ──► null
nextUnitOfWork ──► null

── T1 · 首次调用 render(element, container) ──────────────────────
render() 只做两件事（记住：它不渲染，它只"立项"）：
  wipRoot = 容器包装 fiber W0 = { dom: container, props: { children: [element] } }
  nextUnitOfWork = W0
然后调度器安排 workLoop 开工。

currentRoot ──► null                     （屏幕：仍为空，且会一直空到 T3）
wipRoot ──► W0 (dom = container)
            alternate = null             ← 首次渲染没有旧树可指

── T2 · workLoop 逐单元构造 wip 树（横跨多个时间片，随时可中断）──
每执行一个 performUnitOfWork，wip 树就长一点：

  W0 ──child──► F(div) ──child──► F(h1) ──sibling──► F(p)
                  │ alternate:null（首渲无旧节点可复用，全部走新建）
                  ▼
              F("标题"文本)   F("正文"文本)

每个单元做三件事：createDom（创建【游离】节点，不插入文档）、
为 children 建 newFiber、返回下一个单元。
中断任意次：屏幕始终是空的，wip 树的半成品全在堆内存里，一个不丢。

── T3 · nextUnitOfWork === null，触发 commitRoot() ───────────────
commitWork 同步递归，把整棵 wip 树的 dom 一次性 appendChild 到文档；
然后双缓冲"翻转"：
  currentRoot = wipRoot        ← back buffer 上岗成 front buffer
  wipRoot = null               ← 清空，防止重复提交
浏览器在下一次 paint 画出的就是完整新 UI。屏幕：一瞬间出现全部内容。

── T4 · 用户点击 → setState（双缓冲的第二幕从这里开始）───────────
currentRoot ──► C0 (旧树，就是 T3 的 W0，对应屏幕上的 UI)
                C0.dom 链接着文档里所有真实节点
新的更新触发新一轮 render（M7 之前我们用手动调 render 模拟 setState）：
  wipRoot = N0 = { dom: container, props: {...新 element} }
  N0.alternate = C0          新根单向指向旧根（mini 版不回写 C0.alternate），
                             diff 从 N0 出发即可沿 alternate 找到旧树同位置节点

── T5 · 第二轮 workLoop：逐节点"复用对比"，alternate 发挥真正作用 ──
对每个新 fiber N(x)，沿旧树同位置找到 oldFiber（N(parent).alternate 的
对应孩子），然后：
  · type 相同 → 复用：N(x).dom = oldFiber.dom（DOM 节点不重建！）
                N(x).alternate = oldFiber
                diff 双方 = N(x).props（用户想要的新的）
                         vs N(x).alternate.props（屏幕上现在的旧的）
                有差异 → 打 effectTag = 'UPDATE'
  · type 不同 → 新建打 'PLACEMENT'，旧节点打 'DELETION'
关键：**对比新旧 props 的能力完全来自 alternate 指针**——没有它，
"复用"就无从谈起，因为你在新 fiber 上根本找不到旧 props 在哪。

── T6 · 第二轮 commitRoot() ──────────────────────────────────────
DOM 只收到差异操作（更新 p 的文本；M5 实现完整的 update/deletions）；
  currentRoot = N0（翻转）
旧树 C0 整体失去引用 → 可被 GC 回收
屏幕：一次 paint，从旧 UI 原子地切换到新 UI。
```

把这套时序提炼成三条不变量，任何时刻问"会不会出问题"，都用这三条检验：

1. **屏幕只认 current 树**：render 阶段从头到尾不碰任何已插入文档的节点，所以无论怎么中断，屏幕上的画面始终是上一轮 commit 的完整结果；
2. **wip 树活在堆内存**：中断只是遍历暂停，已构造的 fiber 节点全部健在，`nextUnitOfWork` 指到哪，恢复就从哪继续——**中断恢复不会撕裂，因为"撕裂"的前提是屏幕看到了中间态，而不变量 1 保证屏幕永远看不到**；
3. **commit 是同步原子段**：一旦 `commitRoot()` 开始，它在同一段同步代码里跑完所有 DOM 操作，浏览器不可能 paint 到中间态。

反过来说，撕裂只会在同时违反不变量 1 和 3 时发生。M3 我们会故意写一个违反不变量的版本（边构造边把 DOM 挂上去），M4 再亲手修复——"为什么会撕裂"这个问题，你会先用手制造出来，再用架构消灭它。

最后强调 alternate 的第二个身份：它不只是"中断恢复"的一部分，更是**复用的桥梁**。M5 的 diff、M7 的 hooks 对齐（新旧 fiber 各自的 `memoizedState` 链表靠 alternate 找到彼此），全部建立在这根指针上。设计数据结构时"让新旧两版可以互相找到对方"，是增量计算系统的通用手法。

#### JSX 链路：从语法糖到普通对象

- JSX 链路：`jsx-runtime` → `createElement` → `ReactElement` 普通对象 `{ type, props }`

三个环节逐个说清。

**环节一：JSX 不是 JavaScript。** 浏览器不认识 `<div className="box">{list}</div>`，它必须先被编译器翻译成函数调用。历史上有两种翻译目标，也就是两种 runtime 模式：

| | classic（React 16 及之前） | automatic（React 17+ 默认） |
|---|---|---|
| `<div a=1/>` 编译产物 | `React.createElement('div', {a: 1})` | `import { jsx as _jsx } from 'react/jsx-runtime'` + `_jsx('div', {a: 1})` |
| 需要手动 `import React` | 需要（否则 ReferenceError） | 不需要（编译器自动注入 jsx-runtime 的 import） |
| 函数名可定制 | 可（pragma 配置，指向任何人） | 可（importSource 配置） |
| key 的位置 | 作为 createElement 第二参数的属性混入 | 独立参数，不进 props |

我们复刻走 classic 模式并把 pragma 指到自己的 `Didact.createElement`——因为 classic 的语义最直白（一行函数调用），最适合看穿 JSX 的本质；automatic 只是"编译器替你 import 了另一个工厂函数"，环节三末尾会给一个 8 行的 jsx-runtime 适配，两种模式都能玩。

**环节二：`createElement` 是个纯函数。** 输入 type、属性对象、若干孩子，输出一个普通对象。它不做任何 DOM 操作、不做任何递归渲染——这一步只负责"把 JSX 的嵌套语法翻译成对象字面量的嵌套"。我们的 M1 就写它，全文约 20 行。

**环节三：ReactElement 就是普通对象。** 这是最该破除的神秘感：element 树上没有任何魔法，`console.log` 打出来就是 `{ type, props }` 的嵌套 JSON（真实 React 多几个字段，M1 的对比实验会逐个看）。它**只描述"要什么"**（一个 div、class 是 box、里面三行文本），**不描述"怎么做"**（怎么建 DOM、何时更新、如何 diff——那是 fiber 和 reconciler 的事）。描述与执行分离，才使得同一份 element 树可以渲染到 DOM、canvas、终端、甚至转成字符串做 SSR。

真实 React 的 element 对象比我们的多一个 `$$typeof: Symbol.for('react.element')` 字段，值得单独解释：它是个**防伪标记**。如果用户输入被拼进某种存储再作为对象反序列化回来（典型 XSS 场景：攻击者向你的接口里塞一段 JSON，内容是 `{type: 'script', props: {...}}`，某个漏洞让它流进了 render），React 渲染前检查 `$$typeof`——而 JSON 里造不出 `Symbol`，伪造的 element 过不了安检。我们的教学版不加这个字段（没有攻击面），但你要知道生产库为什么加。

最后一个链路细节：**文本节点**。真实 React 的编译产物里，字符串孩子就是字符串，直到 reconciler 里才被包装成 HostText fiber；我们的 didact 在 `createElement` 阶段就提前包成 `TEXT_ELEMENT`。为什么提前？为了让下游（`createDom`/`updateDom`）只面对一种"有 type 有 props"的统一节点，省掉到处写 `typeof child === 'string'` 的分支——20 行代码的教学库，统一性比逐像素还原真实实现更重要。M1 实现时再看这段话会更清楚。

✍️ 练习：用 `@babel/plugin-transform-react-jsx` 的 classic 模式把 JSX 指向自己的 `createElement`，打印 element 树看个明白。

这个练习的目标：在写 M1 之前，先让你亲眼看到"JSX 编译 → 函数调用 → 对象树"的完整链路。下面给三套由轻到重的可抄配置，任选其一。

**方案一：零工程，单个 HTML 文件（5 分钟见效）**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>JSX 链路观察</title>
</head>
<body>
  <div id="root"></div>
  <!-- babel-standalone：浏览器里直接跑 Babel，仅限实验，勿上生产 -->
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script type="text/babel" data-presets="react">
    /* @jsx Didact.createElement */
    // ↑ classic 模式下，这行注释的优先级高于一切配置：
    //   本文件所有 JSX 都会编译成 Didact.createElement(...) 调用

    // M1 之前先用一个最小替身占位（M1 写好后整体替换）
    const Didact = {
      createElement(type, config, ...children) {
        console.log('createElement 被调用：', type)
        return { type, props: { ...config, children } }
      },
    }

    const element = (
      <div id="box" className="card">
        <h1>标题</h1>
        hello
        <button onClick={() => {}}>点我</button>
      </div>
    )

    console.log(JSON.stringify(element, null, 2))
  </script>
</body>
</html>
```

直接双击打开这个文件即可（无模块加载，不需要本地服务器）。打开 DevTools 控制台，你会先看到 4 次 `createElement 被调用`（div、h1、文本 hello 走不了 JSX 所以没有、button——顺序是 div 先被调用？不，**子先于父**：JSX 表达式求值天然自内向外，h1 和 button 的调用先发生，div 的调用最后收到已构造好的孩子）。这个求值顺序本身就值得看一眼：**element 树是自底向上构造的**。

**方案二：Vite + esbuild，改一行工厂函数（推荐作为后续里程碑的常驻环境）**

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    // classic 语义：JSX → Didact.createElement(type, props, ...children)
    jsx: 'transform',
    jsxFactory: 'Didact.createElement',
    jsxFragment: 'Didact.Fragment',
  },
})
```

```js
// src/index.jsx —— 注意：classic 模式不自动注入 import，必须自己引入
import * as Didact from './didact.js'

const element = (
  <div id="box">
    <h1>标题</h1>
  </div>
)

console.log(element)
```

**方案三：标准 Babel 工程（.babelrc，可迁移到 webpack/jest 等任何 babel 生态）**

先装依赖：

```bash
npm init -y
npm i -D @babel/core @babel/cli @babel/preset-env @babel/plugin-transform-react-jsx
```

```json
{
  "presets": [["@babel/preset-env", { "targets": "defaults" }]],
  "plugins": [
    [
      "@babel/plugin-transform-react-jsx",
      {
        "runtime": "classic",
        "pragma": "Didact.createElement",
        "pragmaFrag": "Didact.Fragment"
      }
    ]
  ]
}
```

```bash
npx babel src --out-dir lib --watch
# 之后任何 .js/.jsx 里的 JSX 都会编译成 Didact.createElement(...)
```

**automatic 模式的选修适配**（想对齐 React 17+ 的默认行为时用）：把上面的 plugin 配置换成 `{ "runtime": "automatic", "importSource": "./didact" }`，Babel 产物会 `import { jsx } from './didact/jsx-runtime'`，所以需要把目录组织成 `src/didact/index.js` + `src/didact/jsx-runtime.js`，后者只有几行：

```js
// src/didact/jsx-runtime.js —— automatic 模式的入口适配
import { createElement } from './index.js'

// Babel 约定：jsx 单孩子 / jsxs 多孩子 / jsxDEV 为开发版入口
export function jsx(type, config) {
  const { key = null, ...rest } = config
  return createElement(type, { ...rest, key }, ...(rest.children ?? []))
}
export const jsxs = jsx
export const jsxDEV = jsx
export const Fragment = Symbol.for('didact.fragment')
```

（此适配依赖 config.children 已经是数组的约定，属于选读内容；主线教学用 classic 模式即可。）

**观察任务**：配好任意一套环境后，写一段三、四层嵌套的 JSX（含文本、含属性、含布尔值与 `style`），打印整棵树；再打开 Babel 的[在线 REPL](https://babeljs.io/repl)（preset 选 react），左右对照"你写的 JSX"与"编译出的函数调用"。确认自己能回答：文本在哪一步变成了 TEXT_ELEMENT？key 出现在对象的哪一层？`onClick` 在 props 里的形态是什么？——三个问题都有答案，JSX 链路就通了，可以进 M1。

---

## 2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）

十个里程碑的顺序不是知识点的堆砌，而是一条严格的因果链：M1 造数据（element），M2 用递归消费它并暴露"卡死"问题，M3 用 Fiber 与调度解决卡死却引入"撕裂"，M4 分离 render/commit 消灭撕裂并搭出 React 架构的完整骨架，M5 之后（diff、函数组件、hooks）全都是在这个骨架上长肉。**每步的代码都完整可运行**，本片段展开 M1；M2–M10 由后续文件逐一展开，命名约定全书统一。

先搭好常驻工程（方案二 Vite 环境）：

```bash
mkdir mini-react && cd mini-react
npm create vite@latest . -- --template vanilla
# 覆盖生成的模板文件，最终目录结构：
```

```text
mini-react/
├── index.html          # 含 <div id="root"></div>
├── vite.config.js      # 上一节的 esbuild classic 配置
└── src/
    ├── didact.js       # 主角：从 ~20 行长到 ~2000 行
    └── index.jsx       # 试验场：每个里程碑的验收代码
```

一个说明：教学主线里，里程碑代码大量直接手写 `createElement(...)` 调用而不写 JSX——少一层编译转译，日志和报错都直指本源；JSX 管线已在 §1 练习打通，你想用随时可以换（两者产物完全一致，这本身就是本篇要建立的认知）。

### M1：createElement 与虚拟 DOM（0.5 天）

- 手写 `createElement(type, config, ...children)`：children 扁平化、文本包成 TEXT_ELEMENT、props 合并
- 验证：`console.log(element)` 与真实 React 的 element 对比

目标清单先读一遍：children 扁平化、文本包 TEXT_ELEMENT、props 合并——三条分别对应三个真实的编译期现实：`map` 会产生嵌套数组、文本没有 type/props 结构、key 不能混进业务属性。带着这三个问题看实现。

完整实现（这是 `didact.js` 的第一版，全文如下）：

```js
// src/didact.js —— M1 版本：JSX/手写调用 → element 树
export const TEXT_ELEMENT = 'TEXT_ELEMENT'

// 文本没有 type/props 结构，统一包一层，
// 让下游 createDom / updateDom 永远只面对"有 type 有 props"这一种节点
export function createTextElement(text) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text, // 属性名借用真实 DOM 文本节点的原生属性名，后面 diff 直接复用
      children: [],    // 文本没有孩子，但保持 props.children 恒为数组的不变量
    },
  }
}

export function createElement(type, config, ...children) {
  const props = {}
  let key = null

  // ① 处理 config：无属性的 JSX（<div>...</div>）编译后 config 是 null，必须判空
  //    key 从 config 摘出去放对象顶层：key 是给 M5 的 diff 用的"身份标识"，
  //    不属于业务属性，绝不能留在 props 里被当成 DOM 属性设置
  if (config != null) {
    key = config.key != null ? String(config.key) : null
    for (const name in config) {
      if (name !== 'key') {
        props[name] = config[name]
      }
    }
  }

  // ② 处理 children：rest 参数天然是数组，但要过三道工序
  props.children = children
    .flat(Infinity) // 工序一：折平嵌套数组——{list.map(item => <li/>)} 产物是数组的数组
    .filter(child => child !== false && child !== true && child != null) // 工序二：对齐真实 React 的行为——
    //   false / true / null / undefined 一律"不渲染"（条件渲染 {isOpen && <Panel/>} 的基础）
    //   注意 true 也要排除：{flag && <A/>} 写反成 {!flag || true} 之类的表达式可能产出 true
    .map(child =>
      typeof child === 'object' ? child : createTextElement(child)
    ) // 工序三：字符串/数字包装成 TEXT_ELEMENT；对象（element）原样保留
  //   注意工序二先执行：typeof null === 'object' 这个坑已被 filter 提前排掉

  // ③ 产出：一个彻头彻尾的普通对象。没有 $$typeof、没有 Symbol，够用
  return { type, key, props }
}
```

逐个要点深挖：

**为什么 `key` 要上提到顶层而不是留在 props？** `key` 的消费者是 M5 的 children diff——它需要在不碰任何业务属性的情况下拿到身份标识；且如果 key 留在 props 里，M2 的 `updateDom` 会尝试 `dom.key = 'root'` 这种无意义赋值。真实 React 同样把 `key`/`ref` 从 config 摘出放在 element 顶层。我们 M1 就保留 key（尽管 M5 之前没人消费它），是为了让你在对比真实 React 时看到完全同构的对象形状。

**为什么文本要包装、而且借名 `nodeValue`？** 两个收益：其一，下游全链路只处理一种节点形态（`type` + `props`），`createDom` 不需要 `if (typeof child === 'string')` 分支；其二，`nodeValue` 恰好是真实 DOM 文本节点（`Text` 实例）的原生属性——`textNode.nodeValue = '新文本'` 就是更新文本的标准 API，于是在 M2 的 `updateDom` 里，文本更新和普通属性更新走同一条赋值通道，零特判。

**`flat(Infinity)` 防的是什么？** `{[1,2].map(i => <li/>)}` 中 map 返回数组，编译产物里 children 会出现 `[[li, li]]` 这种嵌套；不折平的话，M2 递归渲染会把内层数组当成一个"孩子"去 `createDom`——直接崩溃。真实 React 在 createElement 内部同样有一步 normalize（折平 + 去掉无效值），行为与本实现一致。

**为什么 filter 掉布尔值？** `{count > 0 && <Badge text={count}/>}`：条件为假时表达式的值是 `false`。如果不滤掉，屏幕上会渲染出字符串 "false"（你大概在某个框架里见过这个经典 bug）。React 的约定是：布尔、null、undefined 都渲染为"无"。注意 `child !== false && child !== true && child != null` 同时排除了 `false`、`true`、`null`、`undefined`，而 `0` 和 `''` 会保留——React 同样会渲染数字 0，这是 infamous 的坑，行为对齐。

**与真实 React element 对比观察点。** 验收实验里跑这段代码：

```js
// src/index.jsx
import * as Didact from './didact.js'
import * as React from 'react' // npm i react

// 同一棵小树，分别用两家的 createElement 生成
const tree = (h) =>
  h(
    'div',
    { id: 'box', className: 'card', key: 'root' },
    h('h1', null, '标题'),
    'hello',
    h('button', { onClick: () => {} }, '点我')
  )

const mine = tree(Didact.createElement)
const theirs = tree(React.createElement)

console.log('Didact：', mine)
console.log('React ：', theirs)
```

两个对象并排看，五个观察点：

1. **`$$typeof: Symbol(react.element)`**：真实 element 的防伪标记（§1 环节三讲过），我们没有——生产库的安全设计；
2. **`key` 与 `ref` 的位置**：两者都在对象顶层、都不在 props 里——与我们的 `key` 处理完全同构；
3. **文本孩子的形态**：真实 React 的 children 里 `'hello'` 就是个字符串，直到 reconciler 才处理；我们提前包成了 `TEXT_ELEMENT`——位置不同、动机相同（下游统一处理）；
4. **`_owner`、`_store`、`_source`**：真实 React 在开发模式附加的调试字段（谁创建的、能否冻结、源码位置——`_source` 由 babel 插件注入行列号，DevTools 的组件跳转就靠它）；生产构建全部剔除；
5. **props 对象被冻结**：真实 React dev 模式 `Object.freeze(props)`，改它会报错——element 从诞生的那一刻起就是不可变的"快照"，之后所有的"变"都体现为新的 element 树，这是 React 数据模型的第一性原理。

**验收方式（M1）**：跑上面的对比代码，控制台两个对象都能展开，且你能向别人解释观察点 1–5 每一条"真实 React 有而我们没有/位置不同"的原因；再补一个小实验——`console.log(createElement('ul', null, ...[1, 2, 3].map(i => createElement('li', { key: String(i) }, i))))`，确认 children 已被折平成 3 个 li、数字 1/2/3 已被包成 TEXT_ELEMENT、key 出现在顶层。两个现象都对，M1 通过。

### M2：render v1 —— 递归直渲（0.5 天）

- `render(element, container)`：递归 createDOM / appendChild / 设置 props（含事件）
- **故意保留缺陷**：递归不可中断 → 渲染万级节点卡死主线程（亲身体验，Fiber 的动机就刻在心里了）

M1 产出的是"描述"（element 树），M2 写第一个"执行者"：把描述变成真实 DOM。实现策略是最朴素的深度优先递归——这个版本**在功能上是完整的**（能渲染任意大的树），**在架构上是 React 15 的化石**（Stack Reconciler 同款：一旦开始，跑完为止）。我们故意保留缺陷，因为它是全篇最重要的教具。

完整实现（在 M1 的 `didact.js` 末尾追加）：

```js
// —— M2 追加：递归直渲 ——
export function render(element, container) {
  // ① 为当前节点创建真实 DOM
  const dom = createDom(element)

  // ② 深度优先递归孩子：先让孩子在 dom 里长完，再把自己挂上
  //    （先递归后 append 与先 append 后递归，最终 DOM 相同；
  //     差别在"屏幕何时开始出现内容"，M4 的 MutationObserver 实验能看到）
  element.props.children.forEach(child => render(child, dom))

  // ③ 把自己挂进文档
  container.appendChild(dom)
}

// 约定签名是 createDom(fiber)：M2 传进来的是 element，
// M3 起传 fiber——两者都有 .type 与 .props，本函数一个字都不用改就能用到 M9。
// fiber 本来就是 element 的超集，这不是巧合，是设计
export function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('') // 文本：先建空节点，nodeValue 由 updateDom 设置
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props) // 首次渲染 = 一次"从空 props 到满 props"的全量更新
  return dom
}

// —— props 的应用与更新（M5 的 diff 将原样复用这四个过滤器）——
const isEvent = name => name.startsWith('on') // onClick / onInput ... 事件类 prop
const isProperty = name =>
  name !== 'children' && !isEvent(name) // 普通属性：排除 children（不进 DOM）与事件
const isNew = (prev, next) => name => prev[name] !== next[name] // 新增或值变了
const isGone = (prev, next) => name => !(name in next) // 旧有新无 → 应清除

export function updateDom(dom, prevProps, nextProps) {
  // ① 事件：先摘掉"被替换或被删除"的旧监听
  //    注意过滤条件——事件名还在但回调函数变了，也要先摘旧的，否则监听叠加
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(name => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2) // onClick → 'click'
      dom.removeEventListener(eventType, prevProps[name])
    })

  // ② 事件：挂上新增或变化的新监听
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // ③ 属性：清除旧有新无的
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '' // 置空而非 removeAttribute，简单且对多数属性有效
    })

  // ④ 属性：设置新增/变化的
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name] // className、id、href、value... 直接赋 DOM 同名属性
    })
}
```

几个实现细节值得停下来咀嚼：

**为什么事件要"先摘后挂"两趟？** `dom.addEventListener('click', fn)` 对同一函数引用是幂等的，但 JSX 每次渲染都产生**新的**函数引用（`onClick={() => {...}}` 的箭头函数每次求值都是新对象）。如果只挂不摘，三次渲染后一个按钮上摞着三个旧回调，点一次触发三次。真实 React 用事件委托从机制上绕开了这个问题（M9 展开），我们的直挂方案则必须老老实实先摘后挂。

**属性为什么用赋值而不是 `setAttribute`？** `dom.className = 'x'` 与 `setAttribute('class', 'x')` 等价，但赋值对 `value`、`checked` 这类"活属性"行为更符合直觉（`input.value = 'x'` 更新的是当前值，`setAttribute('value')` 只改默认值）。教学版统一走赋值通道，代价是少数属性（如 `data-*`、`aria-*`、SVG 属性）赋值无效——如实声明这是简化，真实 React 在 `ReactDOMHostConfig` 里维护着一张精细的属性分发表。另外 `style` 只支持字符串形式（`style: 'padding:2px'`）；对象形式需要遍历赋值到 `dom.style` 的各子属性，留给读者作课后小改。

**文本节点的 diff 思路**（此刻还没有 diff，但通道已铺好）：文本 fiber 的 props 是 `{ nodeValue: '新文本', children: [] }`。将来 M5 对比新旧 fiber 发现 `nodeValue` 变化时，调 `updateDom(dom, oldProps, newProps)`，第 ④ 趟过滤 `isProperty('nodeValue')` 为 true、`isNew` 为 true，执行 `dom.nodeValue = '新文本'`——这恰好是更新 Text 节点文本的原生 API。M1 借名 `nodeValue` 的伏笔在这里兑现：**文本更新与属性更新共用同一条通道，零特判**。

**递归结构就是调用栈结构。** `render` 自己调自己处理孩子，整棵树的遍历状态保存在 JS 调用栈里——栈有多深，树就有多深，中途想暂停？栈帧里的位置信息没有任何手段导出。**这就是"不可中断"的本质：遍历状态存在一个无法序列化、无法暂停的地方。** 记住这句话，M3 的链表方案就是对它的正面回答。

**亲手复现"渲染 1 万个节点卡死"。** 这是本篇最重要的实验，benchmark 代码：

```js
// src/index.jsx —— M2 卡死实验
import { createElement, render } from './didact.js'

// ① 屏幕上挂一个 100ms 跳一次的毫秒时钟：它是"主线程是否健康"的心电监护仪
const clock = document.createElement('div')
clock.style.cssText = 'position:fixed;top:0;right:0;font:14px monospace;background:#000;color:#0f0;padding:4px 8px;z-index:9999'
document.body.appendChild(clock)
setInterval(() => {
  clock.textContent = 'clock: ' + (performance.now() / 1000).toFixed(2) + 's'
}, 100)

// ② 造 1 万行列表的 element 树
const rows = Array.from({ length: 10000 }, (_, i) =>
  createElement(
    'li',
    { key: String(i), style: 'padding:2px 4px' },
    '第 ' + i + ' 行：',
    createElement('b', null, '这是一段有点长度的文本内容')
  )
)

// ③ 计时渲染
const start = performance.now()
render(createElement('ul', null, ...rows), document.getElementById('root'))
console.log('render() 同步耗时(ms)：', (performance.now() - start).toFixed(0))
```

跑起来你会看到（具体数字随机器浮动，量级稳定）：

- `render()` 同步耗时几百到几千毫秒——**期间整个页面纹丝不动**；
- 最有信息量的现象：右上角的 clock **停跳了**。100ms 一次的 `setInterval` 回调被排队但无法执行，等 render 返回后 clock 一次性跳到位。JS 执行与定时器同住主线程，长任务把所有人堵在门外；
- 打开 Performance 面板录一次：一条远超 50ms 阈值的红色 Long Task 横贯其中，期间的 Frames 轨道全部空白（浏览器没机会渲染一帧）；
- 渲染期间用鼠标点击页面任何按钮，click 回调同样排队等 render 结束——**用户眼里这就是"页面死了"**。

再叠加一个交互实验把体感做实：render 之前放一个按钮，`onclick` 里 `alert('clicked')`。render 卡死的几秒里点它，alert 要等渲染完才弹出来。你对"主线程被独占"的理解从此不再是名词解释，而是肌肉记忆。

把这个现象和 §1 的架构地图对上：M2 的递归 render 同时干了 Scheduler（立即开始）、Reconciler（递归 diff）和 Renderer（顺手 appendChild）三层所有的活，且以"一整条不可分割的同步调用栈"的形式——这正是 Stack Reconciler 的结构。React 16 的全部重写动机，就是你刚才那几秒的卡死放大到 Facebook 的信息流场景。**Fiber 的动机到此刻已经刻在你心里了，后面 M3/M4 的每一行代码都是在还这笔债。**

**验收方式（M2）**：① 跑 benchmark，控制台看到 render 同步耗时进入数百毫秒以上量级、clock 停跳后一次追平；② Performance 面板录到一条覆盖渲染全程的 Long Task；③ 把数量降到 100 行再跑，页面正常渲染出带样式的列表、`<b>` 嵌套正确——确认功能本身没坏，坏的只是"规模承受力"；④ （可选）给列表里某行加 `onClick`，DevTools Elements 面板确认监听挂在对应 li 上，点击有效。四项全过，M2 完成——带着那份"卡死的体感"进 M3。

### M3：并发思路与 Fiber 数据结构（1 天）

- 为什么不用 `requestIdleCallback`（浏览器实现不稳定）/ rAF（节奏不对）/ `setTimeout`（最小间隔 & 优先级）：真实 scheduler 用 **MessageChannel 宏任务** 宏观讲解
- Fiber 节点：`{ type, props, dom, parent, child, sibling, alternate, stateNode, effectTag }`
- **链表化遍历**：`performUnitOfWork`——先 child、无 child 走 sibling、都无走 return（叔叔），单元工作可暂停
- workLoop：`while (nextUnitOfWork && deadline.timeRemaining() > 1)`

M2 证明了"一口气干完"不行，M3 的任务是把一口气拆成许多小口气：**把整棵树的渲染工作切成一个个可暂停的"工作单元"**。这需要三样东西：一个能反复"借时间"的调度机制；一个能暂停/恢复的遍历结构；一个把两者粘起来的工作循环。依次来。

#### 3.1 调度机制：三个候选的落选理由与 MessageChannel 的当选理由

（先说明：本节教学主线最终用 `requestIdleCallback` 落地——它浏览器原生、自带 deadline 对象，代码最短；但必须先讲清楚**真实 React 为什么不敢用它**，否则你以为自己在学 React，其实只是在学 polyfill。）

**候选一：`requestIdleCallback`——为什么真实 React 不敢用。**

它的 API 形态最理想：`requestIdleCallback(deadline => ...)`，回调里 `deadline.timeRemaining()` 告诉你这一帧还剩多少毫秒可挥霍，完美匹配"把空闲时间借给 React"的构想。React 团队 2017 年 Fiber 刚落地时内部确实用过它。落选的硬伤：

- **兼容性**：Chromium 系早早支持，Firefox 跟进得晚，Safari 长期不实现——一个前端框架不能把心脏架在"Safari 某天可能支持"上；
- **语义太"谦让"**：它的约定是"浏览器空闲了才叫你"。像 Facebook 这种常年忙碌的页面，"空闲"是稀缺资源，回调触发频率极不稳定、不可依赖；
- **后台标签页大幅节流**：切走标签页后回调可能几十秒才来一次，React 希望后台还能低速率干活，rIC 给不了；
- **无优先级**：所有 rIC 回调一视同仁，表达不了"用户输入比数据刷新急"。

**候选二：`requestAnimationFrame`——节奏不对。**

rAF 的回调在"下一次 paint 之前"执行，跟帧率绑定。它的问题是**性质错位**：它是"画"的时机，不是"算"的时机。

- 回调跑在 paint 前的窗口里，你在里面塞重活，直接吃掉这一帧的 paint 预算——越用它越掉帧；
- 一帧只回调一次，无法表达"一帧内让出多次"；它不能帮你把长任务切片，它只负责告诉你"要画了"；
- 与显示器刷新率耦合（60Hz 屏 16.7ms/帧、120Hz 屏 8.3ms/帧，预算飘忽），且页面不可见时完全停止——React 的低优先级工作在后台就全停了；
- 它没有任何优先级语义。

**候选三：`setTimeout(fn, 0)`——最小间隔与优先级都不行。**

- **4ms 钳制**：HTML 规范规定，嵌套层级超过 5 层的 `setTimeout` 最小间隔被钳到 4ms——意味着每秒最多约 250 次调度。听起来不少，但 React 要的是"每个宏任务都借一小片"，4ms 的固定损耗在 16.7ms 的帧预算里占比过高，且调度吞吐被上限锁死；
- **后台节流到 1000ms****起**：后台标签页里 setTimeout 直接退化成秒级，低优先级工作全断；
- **任务源地位不可控**：setTimeout 的回调排在定时器任务源里，浏览器对各种任务源的执行顺序没有保证你优先的义务，输入事件、其他宏任务可能持续插到你前面——你表达不了"我想尽快但不堵塞别人"。

**当选者：`MessageChannel` 宏任务。**

真实 `scheduler` 包的核心循环（简化自 `performWorkUntilDeadline`）：

```js
// scheduler.js —— 真实 React scheduler 的最小示意（教学版，~30 行）
const channel = new MessageChannel()
const tickPort = channel.port2                        // 发消息的端口
channel.port1.onmessage = performWorkUntilDeadline   // 收消息：宏任务里干活

let deadline = 0               // 当前时间片的截止时刻（performance.now() 时间戳）
let scheduledCallback = null   // 待执行的工作循环（真实 React 这里是按优先级排的小顶堆）

export function scheduleCallback(callback) {
  scheduledCallback = callback
  tickPort.postMessage(null)   // 投递一个宏任务，立即返回，不堵塞当前代码
}

function performWorkUntilDeadline() {
  if (scheduledCallback == null) {
    return
  }
  deadline = performance.now() + 5  // 时间片：真实 React 默认 5ms，并按帧率自适应
  // 把"还剩多少时间"包装成与 rIC 同形的 deadline 对象传给工作循环
  const hasMoreWork = scheduledCallback({
    timeRemaining: () => Math.max(0, deadline - performance.now()),
  })
  if (hasMoreWork) {
    tickPort.postMessage(null) // 没干完：再约下一个宏任务，主线程先还给浏览器
  } else {
    scheduledCallback = null   // 干完了：进入待命，下次 scheduleCallback 再唤醒
  }
}
```

它凭什么赢？逐条对照三个落选者的伤疤：

- `port.postMessage` 触发 `onmessage` 是**宏任务**：浏览器事件循环保证每一帧都会处理宏任务（渲染间隙也在跑宏任务），所以"每帧都有机会干活"由事件循环模型本身背书——不依赖浏览器的"空闲施舍"，**从被动等空闲改为主动时间切片**；
- **没有 4ms 钳制**：postMessage 不属于定时器任务源，不受 setTimeout 那套嵌套钳制约束，连续投递畅通；
- **不与帧率耦合**：时间片自己用 `performance.now()` 算，5ms 就是 5ms，60Hz 屏和 120Hz 屏一视同仁，后台标签页也只是整体降速而非停摆；
- 为什么不用 `window.postMessage`？那是全页广播——页面上任何第三方脚本都可能监听 message 事件甚至干扰；MessageChannel 的两个端口是**私有点对点通道**，与外部世界零干扰。（补充：真实 scheduler 按环境择优选 `setImmediate`（Node/旧 IE）→ `MessageChannel`（现代浏览器）→ `setTimeout`（兜底），现代浏览器实际走的就是 MessageChannel。）

顺带划重点：M3 用 `requestIdleCallback` 与真实 React 用 MessageChannel，**形态不同、骨架相同**——都是"干一片、还主线程、预约下一片"，连传给工作循环的 deadline 对象形状都一样。学的是骨架，不是皮。

#### 3.2 Fiber 节点：数据结构逐字段精讲

先看契约中的完整结构（本篇全书统一使用）：

```js
// 一个 fiber 节点 = 工作树上的一个工作单元
{
  type: 'div' | TEXT_ELEMENT | 函数, // 元素类型：宿主标签字符串 / 文本标记 / 组件函数(M6)
  props: {...},                      // 属性与 children（承袭自 element）
  dom: HTMLElement | Text | null,    // 对应的真实节点；根 fiber 是容器；组件 fiber 没有(M6)
  parent: Fiber | null,              // 父 fiber（真实 React 叫 return——因为它指向回溯方向）
  child: Fiber | null,               // 第一个孩子（其余孩子靠 sibling 串起来）
  sibling: Fiber | null,             // 右侧兄弟
  alternate: Fiber | null,           // 上一轮的同一位置（双缓冲的另一半，§1/M5/M7 反复用）
  effectTag: 'PLACEMENT' | 'UPDATE' | 'DELETION' | null, // 提交阶段的操作指令(M4 起打标)
}
```

逐字段的设计动机：

- **`type` + `props`**：与 element 完全同形——fiber 是 element 的超集，element 只描述"要什么"，fiber 额外携带"干到什么程度了"（`dom` 建了没）和"身在何处"（parent/child/sibling）。M2 的 `createDom` 因此能原封不动接收 fiber；
- **`dom`**：fiber 与真实世界的锚点。`null` 表示"还没轮到我创建"；根 fiber 的 dom 是容器；将来函数组件的 fiber 干脆没有 dom（M6）。真实 React 这里叫 `stateNode`，语义更广（还可能是组件实例/class 实例）；
- **`parent` / `child` / `sibling` 三件套**：本节主角，见下文"为什么是链表不是数组"；
- **`alternate`**：§1 双缓冲时序图里那根贯穿始终的指针。M3 先把它放进结构里（构造时置 null），M5 的 diff 和 M7 的 hooks 对齐才会真正用起来；
- **`effectTag`**：render 阶段的"便签"——这个节点相对旧树是新增、更新还是删除？commit 阶段照单执行。真实 React 18 已把该字段改名为 `flags`，且用位标志支持多操作叠加，我们保持字符串最直白。

对照表（给将来走"路径 A 读真源码"的你）：

| 我们的字段 | 真实 React | 备注 |
|---|---|---|
| `type` | `type` | 同名 |
| `props` | `pendingProps` / `memoizedProps` | 真实版拆成"工作用/上次提交用"两个 |
| `dom` | `stateNode` | 语义更广 |
| `parent` | `return` | 名字即语义：回溯方向 |
| `child` / `sibling` | `child` / `sibling` | 同名 |
| `alternate` | `alternate` | 同名 |
| `effectTag` | `flags` | 18 起改名并位标志化 |
| （M7 加入 `memoizedState`） | `memoizedState` | hooks 链表头 |

**为什么用 child/sibling 链表而不是 children 数组？** 这是 M3 最核心的一个设计决策，理由要说到根上：

- 数组遍历依赖递归（或显式栈），遍历状态在**调用栈**里——M2 已经证明调用栈不可暂停；
- 链表把"下一步去哪"写进每个节点自身（child、sibling、parent 三个指针），遍历状态只需要**一个变量**（`nextUnitOfWork`）。暂停 = 把当前节点记进变量；恢复 = 读出来继续。状态从栈搬到了堆，从隐式变成了显式可序列化；
- 代价：随机访问第 i 个孩子要沿 sibling 走 i 步（O(n)）。React 甘愿付出这个代价，因为并发遍历的收益远大于按索引访问的需求——事实上 reconciler 从不需要随机访问孩子。

#### 3.3 链表化遍历：performUnitOfWork 的 child → sibling → return（叔叔）规则

先建直觉。一棵普通树：

```text
        A
       / \
      B   E
     / \   \
    C   D   F
```

转成链表视图（child 用竖线、sibling 用横向箭头）：

```text
A
│ child
▼
B ──sibling──► E
│ child            │ child
▼                  ▼
C ──sibling──► D   F
```

字段值：`A.child=B`；`B.sibling=E`；`B.child=C`；`C.sibling=D`；`E.child=F`。

`performUnitOfWork` 每次返回"下一个该处理的节点"，规则只有三条，按序判断：

1. **有 child 就下**：`return fiber.child`（深度优先）；
2. **没 child 有 sibling 就右**：`return fiber.sibling`（继续处理同一父的下一个孩子）；
3. **都没有就"回 return"**：沿 `parent` 一路上溯，遇到的第一个**有 sibling 的祖先**，返回它的 sibling——那个节点俗称"**叔叔**"（父的兄弟）。上溯到根还没有，遍历结束（返回 undefined，`nextUnitOfWork` 变 null）。

对上图按规则推演，完整遍历序列：

```text
A → B → C → D → E → F → (null，结束)

A：有 child → B
B：有 child → C
C：无 child、有 sibling → D        （规则 2）
D：无 child、无 sibling → 规则 3 回溯：
   D.parent=C，C 无 sibling → 再回溯 C.parent=B，B 有 sibling → E
   （E 是 D 的"叔叔"——父 B 的兄弟，这正是"叔叔"这个称呼的由来）
E：有 child → F                    （规则 1）
F：无 child、无 sibling → 回溯 F.parent=E，E 无 sibling → 再回溯 E.parent=A，
   A 无 sibling → 再回溯 A.parent=null → 遍历结束
```

再拿一个贴近页面的例子练手，这是后面验收时要对照的：

```text
<div>
  <h1>
    <span>标题文字</span>
  </h1>
  <p>段落文字</p>
</div>

fiber 链表：
div ──child──► h1 ──sibling──► p
                 │ child
                 ▼
               span ──child──► "标题文字"(TEXT)
                                 ──sibling──► null，回溯
                 p ──child──► "段落文字"(TEXT)

performUnitOfWork 返回序列：
div → h1 → span → "标题文字" → p → "段落文字" → (null)
       │       │                 │
       │       └ span 的 child   └ "标题文字"无 child 无 sibling，规则 3 回溯：
       └ div 的 child               "标题文字".parent=span，span 无 sibling →
                                  再回溯 span.parent=h1，h1 有 sibling → p
                                  （p 是"标题文字"的"叔叔"——父 h1 的兄弟）
                                  p：有 child → "段落文字"（规则 1）
                                  "段落文字"：无 child 无 sibling → 回溯 p → div →
                                  根 fiber 无 sibling → 结束
```

上面这个序列请务必亲手在纸上演一遍——M3 验收实验里 `console.log` 打出来的顺序必须和你手推的一模一样，这是"我真的懂链表遍历了"的检验。

#### 3.4 render v2、workLoop 与带缺陷的 performUnitOfWork

万事俱备，写 M3 主体。对 M2 的改动：`render` 不再递归（它退化成"立项"），递归遍历被 `performUnitOfWork` + `workLoop` 取代。

```js
// —— M3 追加/替换：didact.js（createElement/createDom/updateDom 均沿用 M1/M2）——

let nextUnitOfWork = null // 下一个工作单元；null = 本轮工作全部完成
let wipRoot = null        // work-in-progress 根：正在构造的 fiber 树（§1 双缓冲的主角）

export function render(element, container) {
  // render 不渲染，只立项：
  // 造一个"容器包装 fiber"，dom 直接指向容器本身，element 作为它唯一的孩子
  // （alternate 字段此刻置 null，M5 起会指向旧树根——§1 时序图 T4）
  wipRoot = {
    type: null,
    props: {
      children: [element],
    },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
    alternate: null,
    effectTag: null,
  }
  nextUnitOfWork = wipRoot
}

// 工作循环：调度器每次"借"来一段时间，就尽量多干几个单元
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork) // 干一个单元
    shouldYield = deadline.timeRemaining() < 1         // 没时间了：标记让出
  }
  // 干完 or 让出之后，都预约下一轮（没活时循环条件直接不进，空转一次判断，代价为零）
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop) // 启动常驻调度（真实 React：Scheduler 用 MessageChannel 投宏任务）

function performUnitOfWork(fiber) {
  // ① 为当前 fiber 创建真实 DOM
  //    根 fiber 的 dom 是容器（render 时已赋值），跳过创建
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  // ② 【M3 缺陷】边构造边把 DOM 挂进文档：
  //    时间片在这里耗尽时，浏览器下一帧 paint 出来的就是"半棵树"。
  //    这行故意留着——它是 M4 的靶子
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  // ③ 把 children（element 数组）转成 child/sibling 链表
  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber, // 指回父节点：规则 3 的"回 return"全靠它
      dom: null,     // DOM 延迟到这个 fiber 被轮到时再创建
      child: null,
      sibling: null,
      alternate: null, // M5 起指向旧树同位置
      effectTag: null,
    }

    if (index === 0) {
      fiber.child = newFiber         // 长子：挂到父的 child
    } else {
      prevSibling.sibling = newFiber // 其余：挂到左邻兄弟的 sibling
    }
    prevSibling = newFiber
    index++
  }

  // ④ 返回下一个工作单元：child → sibling → return（叔叔），3.3 节的三条规则
  if (fiber.child) {
    return fiber.child // 规则 1
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling // 规则 2（也覆盖"自己就有兄弟"的情况）
    }
    nextFiber = nextFiber.parent // 规则 3：一路回溯找"叔叔"
  }
  // 回溯到根的 parent(null) 也没找到兄弟 → 整棵树完成，返回 undefined
}
```

对照大纲那行 `while (nextUnitOfWork && deadline.timeRemaining() > 1)`：它与上面 `shouldYield = deadline.timeRemaining() < 1` 的写法完全等价（一个在 while 条件里查余额，一个在循环体里记让出标志；didact 采用后者，因为干完一个单元才有资格查余额）。

几个读代码的关键点：

- **`workLoop` 是"时间片消费者"**：一个片内能干几个单元干几个（每个单元约等于"一个节点建 DOM + 为孩子建链表"），干到 `timeRemaining() < 1` 立刻收手——哪怕下一单元只剩半步，也不抢浏览器的渲染窗口。之后 `requestIdleCallback(workLoop)` 把自己再挂回去，形成一个永续循环：**有活干活、没活待命、干活必让**；
- **中断点只可能出现在两个单元之间**——每个 `performUnitOfWork` 是原子的（一次同步调用），单元内部不存在被切断的可能。这就是"工作单元"的含义：**粒度是设计出来的安全边界**；
- **`render` 的身份变了**：M2 里它是"执行者"，现在它是"立项者"——只准备 wipRoot 与 nextUnitOfWork，实际工作由调度循环异步推进。调用 `render` 立刻返回，主线程立刻还给调用方。这个身份转变就是 §1 里 Scheduler 层"何时开始"的雏形；
- **M3 版仍然没有 commitRoot**：DOM 是在 ② 里被逐个挂进文档的。换句话说，M3 解决了"卡死"（M2 的债），却违反了 §1 双缓冲的不变量 1（"屏幕只认 current 树"）——**撕裂**，M4 的靶子已经立在代码里了。

**验收方式（M3）**：① 把 M2 的万节点 benchmark 原样重跑（`render` 接口没变）——现象质变：clock 全程稳定跳动，列表"逐帧生长"（每个时间片长一截），Performance 面板里原来的整条 Long Task 被切成一串 5ms 级的小任务，任务之间是浏览器正常的渲染帧；② 在 `performUnitOfWork` 开头加 `console.log(fiber.type === TEXT_ELEMENT ? 'TEXT:' + fiber.props.nodeValue : fiber.type)`，渲染 3.3 节那个 div/h1/span/p 的例子，核对输出序列与你手推的 `div → h1 → span → 标题文字 → p → 段落文字` 完全一致（链表遍历过关的凭证）；③ 观察撕裂预告：用 MutationObserver 统计 root 下插入操作的批次（代码见 M4 验收，可先抄去跑），会看到插入分散在多个批次——也就是说屏幕在多个时间片里被反复 paint 出"半成品"，这就是 M4 要消灭的现象；④ 回到 §1 的分层图自问自答：M3 版的 render+workLoop+performUnitOfWork 分别站在哪一层（答：render 是 Scheduler 与 Reconciler 的接口，workLoop 是 Scheduler 的消费端，performUnitOfWork 是 Reconciler）。四项全过，M3 完成。

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
    .filter(child => child !== false && child != null)
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

### M5：Reconciliation —— diff 与复用（2 天）⭐核心

从这一章开始，我们的 mini React 才真正开始"像 React"。M1 到 M4 解决的是"怎么把一棵 element 树变成页面"：递归改链表（Fiber）、边算边让出主线程（并发）、算完一次性提交（两阶段）。但到目前为止有一个致命缺陷：**每次更新都是推倒重来**——第二次调用 `render` 时，旧的那棵 fiber 树被整个丢弃，所有 DOM 节点新建、旧节点全部扔掉。这一章要补上 React 的心脏：**Reconciliation（调和）**——拿新 element 树和旧 fiber 树逐个对比，能复用的复用（UPDATE），该新建的新建（PLACEMENT），该删的删（DELETION），把"更新页面"的成本从"整棵树"降到"真正变化的那几个节点"。

先给这一章的心智模型，后面所有代码都围绕它展开：

```text
render 阶段（可中断）                commit 阶段（不可中断）
performUnitOfWork                    commitRoot / commitWork
  └ reconcileChildren                 ├ 先执行 deletions 里的删除
      ├ same type → 标 UPDATE          ├ PLACEMENT → insertBefore / appendChild
      ├ type 变了 → 标 PLACEMENT       ├ UPDATE   → updateDom（真正 diff props）
      │            旧 fiber 标 DELETION└ 顺序递归整棵 wip 树
      └ 没匹配上的旧 fiber → DELETION
```

记住一条铁律：**render 阶段只"打标记"，commit 阶段才"动 DOM"**。这是 M4 确立的分离原则，diff 属于 render 阶段，所以 reconcileChildren 里你看到的只是往 fiber 上写 `effectTag`，一行 DOM 操作都没有。

---

#### 0. 基线回顾：M4 末我们手里有什么

为了让你不用翻回 M4，先把基线代码摆出来（做了微缩，完整版见 M4 章）。此刻 `performUnitOfWork` 对 children 的处理是"无脑新建"：

```js
// ---------- M4 末的基线（节选） ----------
let nextUnitOfWork = null; // 下一个工作单元
let wipRoot = null;        // 正在构造的 fiber 树（workInProgress 树）的根
let deletions = [];        // 待删除的 fiber 列表（M4 里恒为空，本章开始真正使用）

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 做一个单元的工作
    shouldYield = deadline.timeRemaining() < 1;         // 没时间了就让出主线程
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot(); // 整棵 wip 树构造完，一次性提交
  }
  requestIdleCallback(workLoop); // 自我续期（M3 的调度循环）
}
requestIdleCallback(workLoop);

function render(element, container) {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: null, // M4 还没把新旧树连起来
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber); // 每个 fiber 都造一个真实 DOM 节点
  }
  // M4：不对比。children 一律新建 fiber、一律打 PLACEMENT
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;
  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
      alternate: null,
      effectTag: 'PLACEMENT', // 全部当作"新增"
    };
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
  // 下一个工作单元：优先 child，其次 sibling，都没有就顺着 parent 找"叔叔"
  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
  return null; // 整棵树遍历完毕
}

function commitRoot() {
  deletions.forEach(commitWork); // M4 时恒为空数组
  commitWork(wipRoot.child);
  wipRoot = null;
}

function commitWork(fiber) {
  if (fiber == null) return;
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom); // M4 只会走这一支
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

这个基线跑个时钟没问题，但只要"更新"就会露馅。做一个 10 秒就能复现的实验：

```js
// 每秒重新 render 一次：结构完全相同，只有文本在变
function tick() {
  const time = new Date().toLocaleTimeString();
  Didact.render(
    Didact.createElement('div', null,
      Didact.createElement('input', { placeholder: '在这里打几个字' }),
      Didact.createElement('h1', null, time)
    ),
    document.getElementById('root')
  );
}
tick();
setInterval(tick, 1000);
```

运行它，然后在输入框里打字：**每过一秒，焦点消失、你打的字也没了**。原因就在上面的代码里——第二次 `render` 建了一棵全新的 wip 树，所有 fiber 都是 `PLACEMENT`，commit 时把全新的 `<input>` append 进去；而 commit 完成后，旧的那棵树连同旧 DOM 一起被丢弃（没人再引用它们，浏览器随后回收）。用户看到的效果就是"整个界面每秒被替换一次"。一万节点的树每秒全部重建，Fiber 的可中断调度再精巧也救不了。

破局思路只有一个：**更新时不要从零建树，而是把旧树"抄"一遍——抄的过程中逐个位置对比，能复用的旧 fiber 与旧 DOM 直接沿用，只对变化的部分打特殊标记**。这就是 reconcileChildren 要做的事。

---

#### 1. `alternate` 指向旧 fiber，逐个对比 —— reconcileChildren 完整实现

##### 1.1 第一步：把新旧两棵树连起来

diff 需要同时拿到"新的"和"旧的"。新树是本轮正在构造的 wip 树；旧树是**上一轮已经 commit 的那棵**——它此刻就挂在页面上。我们用一个新全局变量 `currentRoot` 记住它，并让新树的根通过 `alternate` 指回去：

```js
let currentRoot = null; // 上一轮已提交的 fiber 树（"屏幕上"的那棵）

function render(element, container) {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot, // ★ 新树的根指回旧树的根，diff 的"旧"从这来
  };
  deletions = []; // 每轮 render 开始，清空上一轮的删除清单
  nextUnitOfWork = wipRoot;
}

function commitRoot() {
  deletions.forEach(commitWork); // ★ 先提交删除（见第 3 节）
  commitWork(wipRoot.child);
  currentRoot = wipRoot; // ★ 提交完成后，这棵树成为"屏幕上的树"
  wipRoot = null;        // wipRoot 置空，本轮结束
}
```

两行 `★` 就是 M1 里讲过的**Fiber 双缓冲**在代码里的样子：`currentRoot` 是 current 树（已上屏），`wipRoot` 是 workInProgress 树（构造中），根节点靠 `alternate` 互指。子节点层面的 `alternate` 由下面的 reconcileChildren 逐个建立。中断再多次也没关系——只要没走到 `commitRoot`，`currentRoot` 指向的旧树和它对应的 DOM 完好无损，页面永远不会出现改了一半的中间态。

##### 1.2 reconcileChildren：完整代码

现在把 `performUnitOfWork` 里那段"无脑新建"替换成真正的调和逻辑。函数签名按命名契约：`reconcileChildren(wipFiber, elements)`——`wipFiber` 是新树里正在处理的 fiber，`elements` 是它本次的 children（element 数组，来自 `wipFiber.props.children` 或函数组件的返回值）。

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  // 旧 children 的链表头：从 wipFiber 的旧身（alternate）的 child 开始
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  // v1：新旧两条链并肩前进，按"位置"对齐对比
  while (index < elements.length || oldFiber != null) {
    const element = index < elements.length ? elements[index] : null;
    const sameType =
      element != null && oldFiber != null && element.type === oldFiber.type;

    let newFiber = null;

    if (sameType) {
      // ① 同位置、同类型 → 复用：dom 沿用旧的，props 换成新的，打 UPDATE
      newFiber = {
        type: oldFiber.type,
        props: element.props,   // props 用新的
        dom: oldFiber.dom,      // ★ dom 用旧的——这一行就是"复用 DOM"
        parent: wipFiber,
        alternate: oldFiber,    // ★ 指回旧 fiber，commit 时 diff props 要用
        effectTag: 'UPDATE',
      };
    }

    if (element != null && !sameType) {
      // ② 这个位置要的是"另一个类型"，或者旧链已尽还有新增 → 新建，打 PLACEMENT
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,             // 新建：DOM 在 performUnitOfWork/createDom 阶段创建
        parent: wipFiber,
        alternate: null,       // 没有旧身
        effectTag: 'PLACEMENT',
      };
    }

    if (oldFiber != null && !sameType) {
      // ③ 这个位置上的旧 fiber 不再被复用 → 标 DELETION，收进 deletions 等待 commit
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // 挂链：第一个孩子接到 wipFiber.child，其余接到前一个兄弟的 sibling
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element != null) {
      prevSibling.sibling = newFiber;
    }
    if (element != null) {
      prevSibling = newFiber;
    }

    index++;
    if (oldFiber != null) {
      oldFiber = oldFiber.sibling; // 旧链也前进一格
    }
  }
}
```

`performUnitOfWork` 里对宿主元素的处理相应变成：

```js
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber); // 只有 dom 为 null（新建/换类型）时才创建 DOM
  }
  reconcileChildren(fiber, fiber.props.children); // ★ 对比代替无脑新建
}

function performUnitOfWork(fiber) {
  updateHostComponent(fiber);
  // 下一个工作单元的遍历逻辑与 M4 相同：child → sibling → 叔叔
  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
  return null;
}
```

（`updateHostComponent` 这个名字是为 M6 预留的——那时它会和 `updateFunctionComponent` 并列成两个分支，见下一章。）

##### 1.3 逐段拆解：三个判定分支各自意味着什么

**第一段：旧链从哪来。** `wipFiber.alternate && wipFiber.alternate.child`——新 fiber 的旧身的第一个孩子。如果这是首次渲染，`alternate` 是 null，旧链为空，循环里 `sameType` 恒为 false，所有 element 都走分支②（PLACEMENT），行为退化到 M4——所以这一版代码天然兼容首屏。如果 `wipFiber` 是被复用的（UPDATE），它的 `alternate` 就是上一轮同一个位置的旧 fiber，新旧两条链从这里开始"并肩走"。

**第二段：`sameType` 的判定。** 只比较 `element.type === oldFiber.type`，props 完全不参与。这背后是 React 的核心取舍：**type 是一个节点"是什么"的最小标识**——`div` 变 `div`，无论 props 差多少，都只是"同一个节点的属性变了"，DOM 可以留；`div` 变 `span`，哪怕内容一模一样，也是"换了种东西"，旧 DOM 必须拆掉（浏览器里不同标签的语义、默认样式、内部结构都不同，改造不如重建）。text 节点同理：`TEXT_ELEMENT` 对 `TEXT_ELEMENT`，即使文字不同也算 same type，文字变化属于 props（`nodeValue`）变化。

**第三段：分支①（UPDATE，复用）。** 注意 `newFiber` 是**新对象**——我们从不修改旧 fiber 来当新节点用，而是每轮 render 建一棵全新的 wip 树，只是把旧 fiber 的两个东西"抄"过来：`dom`（真实 DOM 节点直接沿用，这就是复用的本体）和 `alternate`（指回旧 fiber，commit 阶段 `updateDom` 要拿 `fiber.alternate.props` 和 `fiber.props` 做属性 diff）。为什么新建对象而不是复用旧对象？因为旧树必须保持完整、稳定地挂在 `currentRoot` 上，直到新树 commit 成功——如果直接在旧 fiber 上改，一旦 render 中断、下一轮从头再来，旧树就被污染了，双缓冲就失去了意义。

**第四段：分支②（PLACEMENT，新建）。** 触发条件有两个：这个位置上 element 的 type 和旧 fiber 不同（换类型），或者旧链已经走完但新 elements 还有剩余（纯新增）。新建 fiber 的 `dom` 是 null，`alternate` 是 null——它没有历史。

**第五段：分支③（DELETION，删除）。** 旧 fiber 存在但不被复用。关键问题来了：**被删的旧 fiber 不在新 wip 树上**，`commitWork(wipRoot.child)` 这条从新树根出发的递归天然走不到它，那 commit 阶段怎么知道要删它？答案就是那个贯穿全局的 `deletions` 数组——render 阶段把所有要删的旧 fiber 集中收进来，`commitRoot` 开头统一处理。这是"收集—延迟执行"模式在删除场景的又一次应用。

**第六段：挂链。** 新 fiber 们组成新的 child/sibling 链。注意条件 `else if (element != null)`——当新 children 比旧的短、循环纯粹在处理尾部旧 fiber 的删除时，不碰 `prevSibling`，此时也没有新 fiber 可挂。

##### 1.4 一次更新在 render 阶段的完整时序

用一个具体例子把流程走一遍。页面当前是 `<div><span>Hi</span></div>`（旧树已提交），下一轮 render 的 element 是 `<div><span>Hi!</span><button>点我</button></div>`：

```text
performUnitOfWork(根fiber)
  alternate=currentRoot(旧根) → 旧 child = 旧div fiber
  reconcileChildren(根fiber, [divElement])
    index0: div === div → UPDATE，新divFiber{dom:旧div的DOM, alternate:旧divFiber}
  下一个单元 = 新divFiber

performUnitOfWork(新divFiber)
  dom 已有（沿用的旧 DOM），不再创建
  reconcileChildren(新divFiber, [spanElement, buttonElement])
    旧链（旧divFiber.alternate.child 起）：旧spanFiber → null
    index0: span === span → UPDATE（文本变化留给 commit 阶段的 updateDom）
    index1: element=button，旧链已尽 → PLACEMENT
  下一个单元 = 新spanFiber …… buttonFiber ……
全部单元做完 → workLoop 发现 nextUnitOfWork 为 null 且 wipRoot 存在 → commitRoot()
```

到这里，render 阶段产出了三样东西：一棵带标记的新 wip 树（fiber 们通过 `effectTag` 声明自己是 UPDATE 还是 PLACEMENT）、一张 `deletions` 删除清单、以及沿 `alternate` 串起来的新旧对照关系。剩下的都是 commit 阶段的事。

---

#### 2. props diff：删除变 undefined 的、更新变化的 —— updateDom 完整实现

分支①只是宣布"这个节点可以复用"，但 props 从 `{style: 'a', onClick: f1}` 变成 `{className: 'b'}` 时，沿用 DOM 还不够，还得把属性差异落到 DOM 上。这件事发生在 commit 阶段的 `commitWork` 里（见第 3 节的调用点），执行者就是 `updateDom(dom, prevProps, nextProps)`。

四个判定用的谓词先写好，后面四段处理各取所需：

```js
const isEvent = name => name.startsWith('on');                    // onClick、onInput 等
const isProperty = name => name !== 'children' && !isEvent(name); // 普通属性（排除 children 和事件）
const isNew = (prev, next) => name => prev[name] !== next[name];   // 新旧值不同才算"变"
const isGone = (prev, next) => name => !(name in next);            // 新 props 里没有 = 被删除
```

完整实现，四段处理**按固定顺序**执行：

```js
function updateDom(dom, prevProps, nextProps) {
  // ── 第一段：移除旧的事件监听 ──
  // 覆盖两种情况：新 props 里没有这个事件了（删掉了），或处理函数变了（要重绑）
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(name => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2); // onClick → click
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // ── 第二段：删除消失的普通属性 ──
  // 旧有、新无 → 视为"显式删除"。didact 的简化处理是赋空字符串
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '';
    });

  // ── 第三段：设置新增或变化的普通属性 ──
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // ── 第四段：绑定新的事件监听 ──
  // 只绑"新增的或换过函数的"；没变的事件不动，避免无谓的 remove/add
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}
```

逐段说明设计原因。

**为什么事件要单独对待（第一、四段）？** 因为 DOM 的事件监听**不能靠赋值覆盖**。`dom.title = 'x'` 是属性赋值，赋两次就是覆盖；但 `addEventListener('click', f)` 调两次会注册两个监听器，同一个事件挂两个函数，点一次按钮触发两次。所以对事件必须走"先 `removeEventListener` 旧的，再 `addEventListener` 新的"的完整流程，而且判断标准是**函数引用是否相同**（`isNew` 用 `!==` 比较）。这也解释了一个使用层现象：如果组件每次 render 都生成一个全新的内联箭头函数 `onClick={() => ...}`，引用每次都变，每次更新都要拆一次监听再绑一次；真实 React 用事件委托规避了这一点（M9 的合成事件会展开，我们的 mini 版每次重绑，功能等价、性能不同）。

**为什么事件处理要放在最前和最后？** 把"移除旧事件"放第一段、"绑定新事件"放最后一段，中间隔开属性处理，是为了逻辑清晰：一个"处理函数变了"的事件会先被第一段摘掉旧函数，再被第四段绑上新函数，两个动作一先一后，互不干扰。顺序本身不是正确性关键（换成一、四相邻也对），关键的是"移除必须在绑定之前完成"。

**为什么删除属性是赋 `''` 而不是 `removeAttribute`？** didact 的简化选择：我们的属性是直接赋值到 DOM 对象上的（`dom[name] = value`），那么对称的"撤销"就是赋一个空值。真实 React 对不同属性类型有更精细的处理（attribute、property、style 对象逐项 diff 等），思想一致：**旧有新无的必须显式清理，否则上一个版本设置的属性会残留在复用的 DOM 上**——比如上一轮 `title='提示'`，这一轮 props 里没有 title，不清掉的话鼠标悬停还会冒出旧提示。

**`children` 被排除在外。** children 的"diff"不是在这里做的——子 element 的对比是 reconcileChildren 的事，它们会变成子 fiber 的 UPDATE/PLACEMENT/DELETION，各自由各自己的 commit 处理。updateDom 只负责**当前节点自身的属性**。这是一个非常清晰的责任划分：**attributes 归 updateDom，children 归 reconcile**。

**初建也走 updateDom。** `createDom` 创建完节点后调用 `updateDom(dom, {}, props)`——旧的属性集合是空对象，于是第二段无事可做、第三段全量设置、第四段全量绑定。一套代码同时服务"初建"和"更新"，这是把 updateDom 抽出来的原因：

```js
function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props); // 初建 = "从空 props 到有 props"的 diff
  return dom;
}
```

**性能小账。** 注意所有 filter 都带 `isNew`/`isGone`——值没变的属性一个都不碰。这就是 React "props diff" 的粒度：**属性级、浅比较**。对象属性（比如 style）是引用比较，引用变了就整体重设，不做深层递归——真实 React 对 style 有特殊处理，我们的 mini 版保持简单。

---

#### 3. commit 阶段如何处理 DELETION

render 阶段收集了 `deletions`，现在兑现。`commitRoot` 与 `commitWork` 的完整版本：

```js
function commitRoot() {
  deletions.forEach(commitWork); // ★ 第一件事：统一执行删除
  commitWork(wipRoot.child);     // 然后从新树根递归处理 UPDATE / PLACEMENT
  currentRoot = wipRoot;         // 新树上位
  wipRoot = null;
}

function commitWork(fiber) {
  if (fiber == null) return;

  // 宿主父节点：M5 阶段每个 fiber 的 parent 都有 dom；
  // M6 引入函数组件后这里要升级成"沿 parent 链向上找"，下一章展开
  const domParent = fiber.parent.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    // 新增：找右侧第一个已在文档里的宿主节点做锚点，保证插入位置正确
    const anchor = getNextHostDom(fiber);
    if (anchor != null) {
      domParent.insertBefore(fiber.dom, anchor);
    } else {
      domParent.appendChild(fiber.dom);
    }
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 更新：真正执行第 2 节的 props diff
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    // 删除：把旧 DOM 从父节点摘下来，子树 DOM 随之整体脱离
    domParent.removeChild(fiber.dom);
    return; // ★ 删除到此为止，不递归 fiber.child / fiber.sibling（原因见下）
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

// 找 fiber 右侧第一个可以当 insertBefore 锚点的宿主节点。
// 两个排除条件缺一不可：
//   1. 标了 PLACEMENT 的兄弟自己马上要被插入/移动，此刻的位置不算数，跳过；
//   2. 找到的 dom 必须已经挂在文档里（isConnected），游离节点不能当锚点。
function getNextHostDom(fiber) {
  let sibling = fiber.sibling;
  while (sibling != null) {
    if (sibling.effectTag !== 'PLACEMENT') {
      const dom = getSelfOrDescendantDom(sibling);
      if (dom != null && dom.isConnected) return dom;
    }
    sibling = sibling.sibling;
  }
  return null; // 右侧没有可用锚点 → 应该插到末尾
}

// 函数组件/类组件的 fiber 没有 dom，要下钻到子树里找第一个宿主节点（M6 后生效）
function getSelfOrDescendantDom(fiber) {
  let node = fiber;
  while (node != null && node.dom == null) {
    node = node.child;
  }
  return node != null ? node.dom : null;
}
```

四个要点。

**为什么删除要放在 commitRoot 的最前面？** 两个原因。其一，删除的是**旧树**上的 fiber，与新树的遍历无关，必须在从 `wipRoot.child` 出发的递归之外、用 `deletions` 数组单独驱动——这正是 deletions 数组存在的意义。其二，先删后插让"同位置换内容"的场景天然正确：`<span>a</span>` 换成 `<button>b</button>`（type 变了，span 标 DELETION、button 标 PLACEMENT），先摘掉旧 span 再插入新 button，不会出现两个节点短暂并存的错乱。

**为什么删除分支要 `return`、不递归 child 和 sibling？** 这是个容易踩的坑，值得单独讲。`deletions` 数组里**已经包含了所有**要删的旧 fiber——reconcileChildren 在处理每个父节点时，会把所有不被复用的旧 child（连同各自子树里后续 reconcile 出的删除项）逐个 push 进去。所以从任何一个被删 fiber 出发继续递归旧树都是多余的。更糟的是它有实际危害：旧 fiber 上的 `effectTag` 是它**上一次** render 时打的标记，commit 之后从不清除——一个上次是 PLACEMENT 的旧 fiber 如果在这里被再次访问，`PLACEMENT` 分支会把它的 dom `appendChild` 回文档，**已经删掉的子树被"复活"**；一个残留 UPDATE 标记的则会对着过时的 alternate 做一次无意义的 updateDom。经典 didact 教程的最终代码在这里是无条件递归的，复刻时把它收紧成"删除即返回"是这个教程修正的隐藏 bug 之一。原则一句话：**commitWork 的递归只服务新树，删除只认 deletions 数组**。

**为什么 PLACEMENT 要找锚点 insertBefore，而不是无脑 appendChild？** 考虑头部插入：列表 `[B, C]` 变 `[A, B, C]`（A 新增）。如果一律 appendChild，A 会排在 B、C 后面，DOM 顺序和新 element 顺序不一致——**fiber 树说 A 是老大，DOM 里 A 却是老三**，用户看到的项目顺序错乱。正确做法是找到 A 右侧第一个可作参照的宿主节点（这里是 B 的 DOM），`insertBefore(A的DOM, B的DOM)`。而"可作参照"有两个排除条件，缺一不可：其一，**标了 PLACEMENT 的兄弟不能当锚点**——它们自己也马上要被插入或移动，此刻的位置不算数（拿它们当参照，等于往一个"即将搬家"的邻居旁边安家）；其二，找到的 dom 必须已经挂在文档里（`isConnected`）——游离节点当锚点会把节点插进脱离文档的 DOM 片段里造成丢失。真实 React 的 `getHostSibling` 用的正是这套双重排除（源码注释原话："We skip host siblings marked with Placement because their host nodes are not inserted yet"），第 5 节的"移动"会大量依赖这条规则。

**UPDATE 分支为什么同时需要 alternate 和自身 props？** `updateDom(fiber.dom, fiber.alternate.props, fiber.props)`——prevProps 来自旧身、nextProps 来自新 fiber。这也解释了为什么 reconcileChildren 在复用时必须把 `alternate` 抄进新 fiber：props diff 的"旧值"全靠它。如果 alternate 是 null 还打了 UPDATE，这里就会炸——而按第 1 节的实现，UPDATE 必然伴随非空 alternate，不变式成立。

现在回头跑第 0 节的那个时钟 demo：每秒的 render 走的是 UPDATE 路径，`<input>` 的 DOM 被复用（fiber.dom 是旧节点），props diff 只改 h1 的 nodeValue——**焦点不丢、打字不丢**，这就是 diff 存在的全部意义。

---

#### 4. index 作 key 的灾难现场：v1 的隐藏假设

到目前为止的 reconcileChildren（称为 **v1**）看起来已经完备：能复用、能新增、能删除。但它有一个**悄悄做出的假设**：`index < elements.length || oldFiber != null` 这条并肩前进的循环，等价于宣称"**新 children 的第 i 个，对应旧 children 的第 i 个**"——位置就是身份。这个假设在"只往末尾加东西"的场景下无懈可击，而一旦列表发生**删除中间项、头部插入、排序**这类"位置重排"，它就会安静地生产 bug。下面把灾难现场完整推演一遍，这也是 React 面试最经典的问题：**index 作 key，删除中间项，到底错在哪一步？**

##### 4.1 现场：三行列表，每行一个带输入框的行

```js
// 数据：三个待办，每行 = 文本 + 一个输入框
let todos = [
  { id: 'a', text: '学习 M4' },
  { id: 'b', text: '学习 M5' },
  { id: 'c', text: '学习 M6' },
];

function TodoList() {
  return Didact.createElement('ul', null,
    ...todos.map(todo =>
      Didact.createElement('li', null, // 注意：v1 阶段我们还没有 key，先看无 key 的行为
        Didact.createElement('span', null, todo.text),
        Didact.createElement('input', { placeholder: todo.text + ' 的备注' })
      )
    )
  );
}
```

（组件写法 M6 才支持，这里只是用它表达 element 结构；实际 demo 用 `render` 直接渲染同一结构的 element 数组即可。）

首次渲染后，fiber 树和 DOM 的对照关系如下。注意每个 `<li>` 的 children 是两个：一个文本 span、一个 input，各自有自己的 fiber 与自己的 DOM：

```text
旧 fiber（ul 的 children，按位置）           页面上的 DOM                        input 中的用户输入
────────────────────────────────────────────────────────────────────────────────────────────
oldFiber-0  li  children:[span'M4', input]  <li><span>学习 M4</span><input></li>   "甲"
oldFiber-1  li  children:[span'M5', input]  <li><span>学习 M5</span><input></li>   "乙"
oldFiber-2  li  children:[span'M6', input]  <li><span>学习 M6</span><input></li>   "丙"
```

现在删除中间项：`todos = todos.filter(t => t.id !== 'b')`，重新 render。新的 elements 只有两个 li：`[学习 M4, 学习 M6]`。

##### 4.2 v1 逐位置判定：每个位置发生了什么

循环从 index=0 开始，新旧两条链并肩前进：

| 位置 | 新 element | 对位的旧 fiber | type 对比 | 判定 | 实际后果 |
|---|---|---|---|---|---|
| 0 | `li`（学习 M4） | oldFiber-0（li，M4） | li === li | **复用，UPDATE** | 沿用 oldFiber-0 的 DOM；span 文本 M4→M4 无变化；input 复用，**"甲"保留** |
| 1 | `li`（学习 M6） | oldFiber-1（li，M5） | li === li | **复用，UPDATE** | 沿用 oldFiber-1 的 DOM；它子树 reconcile：span 文本 'M5'→'M6'（props diff 改 nodeValue）；input 同 type 复用——**B 行那个写着"乙"的 input 被原样保留** |
| 2 | （已无） | oldFiber-2（li，M6） | 无 element | **DELETION** | oldFiber-2 连同它的 DOM 整个 removeChild——**C 行那个写着"丙"的 input 被销毁** |

看到了吗：**没有任何一步"错"**——每个位置都严格按规则判定，type 相同就复用。错的是规则本身的前提：位置 1 上，新来的是"C"这个身份的元素，我们却把"B 的旧 fiber"复用给了它。复用的粒度是"整个旧 fiber + 它的 DOM + 它的全部内部状态"，于是发生了**状态的错误迁移**：

- B 的 DOM（内含用户打的"乙"）被保留下来，从这一刻起**冒充 C 的 DOM**；
- C 真正的 DOM（内含"丙"）被当作多余项删除，"丙"永久丢失。

用户视角的最终画面：

```text
期望                          实际（index 对比）
<li>学习 M4 [甲]</li>          <li>学习 M4 [甲]</li>        ✓ 碰巧对
<li>学习 M6 [丙]</li>          <li>学习 M6 [乙]</li>        ✗ C 的行里躺着 B 的输入内容
                              （"丙"已随 C 的 DOM 被删除，找不回来了）
```

**为什么肉眼很难发现？** 因为 props 的 diff 会把"显示层"改对——span 里的文本确实从"学习 M5"更新成了"学习 M6"。如果每行只有纯展示文本，这个 bug 永远不会显形（这更危险：你以为没问题，直到某天加了输入框/勾选框/展开态）。**props 是 diff 的、会被改对；身份是复用的、一旦错配就无人纠正**——非受控 input 的 value 不在 props 里，它住在 DOM 节点自己身上，diff 根本看不见它。

补充一个 M7 之后才能复现、但原理此刻就能讲清的变体：如果每行是一个带 `useState` 的 `Row` 组件（比如记录"是否展开"），状态挂在 fiber 的 `memoizedState` 上——fiber 被错误复用，B 的"展开=true"就会原样迁移到 C 身上：**你明明从没展开过 C，它却自己展开了**。这是同一颗子弹的另一个弹孔。

##### 4.3 使用层结论

这正是基础大纲（react-学习大纲.md）阶段 1 里"为什么不能用 index 当 key"那条规则的出处，现在你已经能从实现层推出它了：

1. **index 作 key 在"位置稳定"时完全正确**（纯尾部追加、只读列表），React 内部处理无 key 子项的方式就是退化为按 index 对比——所以它不报错，只在重排时悄悄出错。
2. **只要列表可能发生删除非末尾项、头部插入、排序，key 就必须来自数据本身的稳定身份**（id、业务主键），而不是位置。
3. key 的作用范围是**兄弟之间**——同一父节点的 children 里唯一即可，不需要全局唯一。
4. 反过来的错误同样存在：用 `Math.random()` 当 key，每次 render 身份全变，所有旧 fiber 进 deletions、全部重建——性能比 index 还差，还丢状态。

问题诊断清楚了，修复方案也就唯一了：**对比时不能按位置对，要按身份对**。这就是 v2。

---

#### 5. v2：按 key 建映射对比 —— key 是身份标识，不是优化

##### 5.1 v2 的完整实现

先明确 key 从哪来。M1 的 `createElement` 就把 `key` 从 config 中剥离、放在 element 顶层（`element.key`），不进 props——和真实 React 同构，也避免了 updateDom 把 `key` 当普通属性赋到 DOM 对象上的副作用。reconcile 时读 `element.key`：element 有 key 用 key，没 key 退化用 index——**这个退化正好复现 4.2 节的行为**，也让你能在一个 demo 里随时切换两种命运。

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let prevSibling = null;

  // ── 第一步：把旧 children 从 sibling 链上摘进 Map，建立"身份 → 旧 fiber"索引 ──
  // 有 key 用 key，没 key 用它上一轮的 index（等价于 v1 的按位置对齐）
  const existingFibers = new Map();
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  while (oldFiber != null) {
    const oldKey = oldFiber.key != null ? oldFiber.key : oldFiber.index;
    existingFibers.set(oldKey, oldFiber);
    oldFiber = oldFiber.sibling;
  }

  // ── 第二步：逐个处理新 elements，用 Map 做 O(1) 的身份匹配 ──
  // lastPlacedIndex：到目前为止"保持相对顺序不变"的旧 fiber 里最大的旧位置。
  // 它是判断"要不要移动"的水位线——真实 React 的 ChildReconciler 用的同名变量
  let lastPlacedIndex = 0;

  while (index < elements.length) {
    const element = elements[index];
    const newKey = element.key != null ? element.key : index;
    const oldFiberForKey = existingFibers.get(newKey); // ★ 身份匹配：不再看位置

    const sameType =
      oldFiberForKey != null && oldFiberForKey.type === element.type;

    let newFiber;
    if (sameType && oldFiberForKey.index >= lastPlacedIndex) {
      // 身份命中、类型相同、且旧位置不低于水位线 → 顺序没乱，原地复用，UPDATE
      newFiber = {
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: oldFiberForKey.dom,        // 复用 DOM
        parent: wipFiber,
        alternate: oldFiberForKey,      // 指回旧 fiber，供 updateDom diff props
        effectTag: 'UPDATE',
        index,
      };
      lastPlacedIndex = oldFiberForKey.index; // 推进水位线
    } else if (sameType) {
      // 身份命中，但旧位置已经落在水位线之前 → 相对顺序变了：按"移动"处理。
      // 复用 dom（不重建），却打 PLACEMENT——commit 的 insertBefore 对"已挂载的节点"
      // 天然是移动语义，正好把旧节点挪到新位置
      newFiber = {
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: oldFiberForKey.dom,        // 还是复用 DOM——移动的是同一个节点
        parent: wipFiber,
        alternate: oldFiberForKey,      // 记下旧身：移动的同时 props 也可能变了
        effectTag: 'PLACEMENT',        // 用 PLACEMENT 驱动 insertBefore 完成移动
        index,
      };
    } else {
      // 身份没命中（全新增），或命中了但 type 变了（同一身份换了种节点）→ 新建
      newFiber = {
        type: element.type,
        key: element.key != null ? element.key : null,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
        index,
      };
      if (oldFiberForKey != null) {
        // key 相同但 type 不同：这个身份的旧实现作废，整棵旧子树删除
        oldFiberForKey.effectTag = 'DELETION';
        deletions.push(oldFiberForKey);
      }
    }

    existingFibers.delete(newKey); // ★ 用掉一个删一个，剩下的就是"新列表中不再存在"的

    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }

  // ── 第三步：Map 里剩下的旧 fiber，新列表中一个都不要了 → 全部标 DELETION ──
  existingFibers.forEach(remainingFiber => {
    remainingFiber.effectTag = 'DELETION';
    deletions.push(remainingFiber);
  });
}
```

相对 v1，fiber 结构多了两个字段：`key`（身份，可 null）和 `index`（本轮所在位置，供下一轮无 key 匹配退化使用）。其余字段与命名契约一致。

##### 5.2 逐段拆解：为什么这样设计

**第一步为什么要把旧 fiber 建成 Map？** v2 的核心问题是问 n 遍："**这个 element 的旧身是谁？**"如果保持 v1 的链表结构、对每个 element 都去 sibling 链上线性扫描找 key，是 O(n²)——1000 项的列表要做一百万次比较。而"身份 → 旧 fiber"的 Map 让每次询问变成 O(1) 查表，建表 O(n) + n 次查询 = 总共 O(n)。真实 React 的 ChildReconciler（`ReactFiberBeginWork` 里处理多子节点 diff 的部分）遇到非纯追加的场景时，同样是先把旧 children 建 Map 再匹配——我们的 v2 是它的最小同构版本。这也是"key 是身份标识不是优化"这句话的另一半含义：key 首先决定**对与错**（4.2 节），其次才顺带决定**快与慢**（O(n) vs O(n²)）。

**第二步：匹配规则是"key 优先、type 把关"。** 先按身份查 Map；查到了还要验 type——`key='row-1'` 上轮是 `<li>`、这轮是 `<div>`，身份虽然延续但宿主类型变了，旧 DOM 依然不能复用（同 1.3 节的取舍：type 是复用的底线）。此时旧 fiber 标 DELETION、新 fiber 标 PLACEMENT，"换种"处理。没查到就是纯新增。

**`lastPlacedIndex`：身份对了还不够，顺序也得对。** 只按 key 匹配、全部标 UPDATE 的话，"排序"类更新会静默失败——fiber 链已经把新顺序串好了，但每个 fiber 的 UPDATE 都不挪 DOM，页面顺序纹丝不动。所以匹配成功后还要检查**相对顺序**：维护一条水位线 `lastPlacedIndex`（目前保持原位的旧 fiber 中最靠后的旧位置），逐个 element 前进时，命中身份的旧 fiber 若旧位置低于水位线，说明它在新序列里"排到了某个后辈前面"——相对顺序变了，按移动处理：**复用 dom 但打 PLACEMENT**。这里利用了 DOM 的一个特性：`insertBefore`/`appendChild` 作用于**已挂载的节点**时是移动语义（节点从原位置脱离、插入新位置），于是"移动"复用了"新增"的 commit 通道，一行额外代码都不需要。拿 `[A, B, C]` 整体倒序成 `[C, B, A]` 走一遍：C 命中旧位置 2 ≥ 水位线 0 → 原位 UPDATE，水位线推到 2；B 命中旧位置 1 < 2 → 移动（PLACEMENT）；A 命中旧位置 0 < 2 → 移动。commit 按 fiber 顺序执行：DOM 初始 `[A, B, C]`；轮到 B 时，右侧兄弟 A 也标着 PLACEMENT——**不能当锚点**（它自己马上要被挪），再往右没有别人 → `appendChild(B)` 得 `[A, C, B]`；轮到 A 时右侧无兄弟 → `appendChild(A)` 得 `[C, B, A]`——最终顺序正确。注意这里的微妙之处：**跳过 PLACEMENT 兄弟的锚点规则是移动正确性的前提**，少了它 B 会以 A 的旧位置为参照 `insertBefore(B, A)`，最终得到 `[B, C, A]`——顺序错乱（第 3 节排除条件的用武之地）。真实 React 的 `ReactChildFiber` 处理多子节点 diff 用的正是这个同名水位线算法，我们这是它的最小同构。

**移动与更新可能同时发生，commit 侧要配合两行。** 移动复用的 fiber 带着 `alternate`（旧身）与沿用的新 props——位置挪了，props 若也变了得一并 diff。commitWork 的 PLACEMENT 分支补一个伴随处理（完整代码见第 5 节末与 M7 的最终汇总）：

```js
if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
  const anchor = getNextHostDom(fiber);
  if (anchor != null) {
    domParent.insertBefore(fiber.dom, anchor); // 对已挂载节点 = 移动
  } else {
    domParent.appendChild(fiber.dom);
  }
  if (fiber.alternate != null) {
    // 有旧身的 PLACEMENT = 移动：位置已挪好，把 props 的变化也补上
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }
}
```

（真正的新增 fiber 没有 alternate，这个 if 对它直接跳过，行为与第 3 节的版本完全一致。）

**`existingFibers.delete(newKey)` 这一行为什么要"用掉即删"？** 它让第三步变得极其干净：循环跑完后 Map 里**天然剩下的**就是新列表中再也没有出现的旧 fiber——不用额外的集合、不用二次过滤，删除清单自动浮出水面。同时它还防了一种重复：如果新列表里（错误地）出现了两个相同 key，第二个 element 查 Map 会 miss，按新增处理，而不会把同一个旧 fiber 复用两次。

**第三步：剩下的全删。** 对每个剩余旧 fiber 打 DELETION、push 进 deletions，等 commitRoot 统一执行。注意被删 fiber 的**整棵子树**不需要在这里递归标记——4.3 节的 commitWork 删除分支直接 removeChild 宿主节点，子树 DOM 随宿主节点一起脱离文档；至于旧 fiber 的子 fiber 们，它们根本不会被 commit 阶段的任何遍历触达（新树遍历走不到、deletions 数组里没有它们），随旧树一起被丢弃即可。

##### 5.3 同一场灾难在 v2 下的推演（key = id）

还是 4.1 节的数据，这回 li 都带上 `key: todo.id`。删除 B 前后：

```text
旧 children 的 Map:                      新 elements（带 key）:
  'a' → oldFiber-A(li, M4, input"甲")      [ {li, key:'a', '学习 M4'},
  'b' → oldFiber-B(li, M5, input"乙")        {li, key:'c', '学习 M6'} ]
  'c' → oldFiber-C(li, M6, input"丙")
```

逐个 element 判定：

| 新 element | 身份查询 | type 验证 | 判定 | 实际后果 |
|---|---|---|---|---|
| `li key='a'`（M4） | 命中 oldFiber-A | li === li | 复用，UPDATE | A 的 DOM 沿用，**"甲"保留** ✓ |
| `li key='c'`（M6） | 命中 oldFiber-C | li === li | 复用，UPDATE | **C 的 DOM 沿用**，props 无变化，**"丙"保留** ✓ |
| （循环结束，Map 剩余） | `'b' → oldFiber-B` | — | **DELETION** | B 的 DOM 连同"乙"整个移除 ✓ |

最终 DOM 与期望完全一致：两行，M4 带着甲、M6 带着丙，B 和乙干净消失。**注意最妙的一点：C 的 fiber 完全没有经历任何 props 变化，一次 updateDom 都不会跑**——身份对了，连"把 M5 改成 M6"那次多余的文本更新都省了。对比 v1 那次"位置 1 的错配复用 + 文本改写"，v2 不仅正确，还更省。

##### 5.4 key 的语义边界与常见误区

- **兄弟内唯一即可**。`key` 只在 reconcileChildren 的这张 Map 里生效，作用域是"同一个父节点的 children"，跨层级、跨组件互不干扰。
- **key 必须跨渲染稳定**。"稳定"的意思是：同一个数据项在这轮和下轮必须产生同一个 key。`Math.random()` 每轮都变，全部判为"新增+删除"，状态全丢、DOM 全重建，比 index 还糟。
- **混用有 key 与无 key 是隐性重排**。v2 的退化规则是"无 key 用 index"，如果上一轮 children 有 key、这一轮没写（或反过来），Map 的键空间都对着不上，结果是一次全删全建。真实 React 对"同一个列表一会儿传 key 一会儿不传"会给出告警，原因就在这里。
- **key 相同、type 不同 → 不复用**。身份只是入场券，type 是硬门槛（5.2 第二点）。
- **v2 的行为可以精确预测**，这也是写验收测试的依据：给每项一个稳定 key，任何"删、插、排序、原地改"组合都能按"身份命中即复用，否则增删"推理出来。

##### 5.5 汇总：v1 → v2 变了什么、没变什么

| 维度 | v1（按 index） | v2（按 key 建 Map） |
|---|---|---|
| 匹配依据 | 位置 i ↔ 位置 i | 身份（key，缺省退化为 index） |
| 复用判定 | type 相同即复用 | key 命中且 type 相同才复用 |
| 复杂度 | O(n) | O(n)（建 Map O(n) + n 次 O(1) 查询） |
| 尾部追加 | 正确 | 正确 |
| 删中间/头插/排序 | **身份错配，状态错乱**（4.2 节） | 正确 |
| 与真实 React | — | 同构（ChildReconciler 的 existingChildren Map） |

没变的：三分支标记体系（UPDATE/PLACEMENT/DELETION）、deletions 数组、commit 阶段的执行逻辑——v2 只换了"谁和谁比"，"比完之后干什么"原封不动。

---

#### 6. 验收方式

本章验收跑三个 demo，全部只依赖本章及之前的 API（`Didact.createElement`、`Didact.render`），不涉及函数组件。

**验收一：diff 生效——复用而非重建。**

```js
let count = 0;
function renderApp() {
  count += 1;
  Didact.render(
    Didact.createElement('div', null,
      Didact.createElement('input', { placeholder: '在这里打字，不许丢' }),
      Didact.createElement('h1', { title: `已更新 ${count} 次` }, `第 ${count} 次渲染`),
      Didact.createElement('button', {
        onClick: () => renderApp(), // 每次点击都生成新函数引用 → 验证事件重绑
      }, '更新')
    ),
    document.getElementById('root')
  );
}
renderApp();
```

验证行为：点击"更新"按钮 10 次，h1 的数字递增；**input 始终保有焦点和已输入内容**（证明 UPDATE 复用了 DOM）；鼠标悬停 h1，tooltip 文本随次数变化（证明普通属性 diff：title 被更新）；按钮每次点击仍然触发（证明事件被正确地"移除旧的、绑定新的"）。再加一个断言级检查：在浏览器控制台执行 `window.__probe = document.querySelector('input')`，点几次更新后再执行 `document.querySelector('input') === window.__probe`，应返回 `true`——DOM 节点是同一个对象，这就是"复用"的直接证据。

**验收二：key 的正确性——带输入框的三行列表删中间项。**

```js
let todos = [
  { id: 'a', text: '学习 M4' },
  { id: 'b', text: '学习 M5' },
  { id: 'c', text: '学习 M6' },
];

function renderTodos(useKey) {
  Didact.render(
    Didact.createElement('div', null,
      Didact.createElement('ul', null,
        ...todos.map(todo =>
          Didact.createElement('li',
            useKey ? { key: todo.id } : null, // 切换两种命运
            Didact.createElement('span', null, todo.text),
            Didact.createElement('input', { placeholder: todo.text + ' 备注' })
          )
        )
      ),
      Didact.createElement('button', {
        onClick: () => {
          todos = todos.filter(t => t.id !== 'b');
          renderTodos(useKey);
        },
      }, '删除中间项 B')
    ),
    document.getElementById('root')
  );
}
renderTodos(true); // 先验正确版本；再改成 renderTodos(false) 复现 4.2 节的错乱
```

验证行为：在三个 input 里分别打"甲、乙、丙"，点删除。`useKey=true` 时剩两行：M4/甲、M6/丙——正确。`useKey=false` 时剩两行：M4/甲、**M6 但 input 里是"乙"**，"丙"永久消失——亲手复现 4.2 节的推演，这个画面看一次，"为什么不能用 index"这辈子不用再背。

**验收三：插入位置正确——头部插入。**

```js
let names = ['B', 'C'];
function renderHead() {
  Didact.render(
    Didact.createElement('ul', null,
      ...names.map(n => Didact.createElement('li', { key: n }, n))
    ),
    document.getElementById('root')
  );
}
renderHead();
// 控制台执行：names = ['A', 'B', 'C']; renderHead();
```

验证行为：追加 A 到头部后，页面顺序必须是 A、B、C 而不是 B、C、A——这验证的是第 3 节 `getNextHostDom` + `insertBefore` 的锚点插入逻辑。可以再试 `names = ['C', 'B', 'A']`（整体倒序）验证 B、C 各自的 insertBefore 都落位正确。

三个 demo 全绿，M5 通过。此时你的 mini React 已经具备"可用的更新能力"——但也仅限原生标签，因为 `createDom` 里 `document.createElement(fiber.type)` 一旦遇到 `fiber.type` 是函数就会当场爆炸。怎么让组件函数跑起来，是 M6 的事。

### M6：函数组件（1 天）

M5 结束时，我们的 mini React 有了完整的 diff 能力：复用、更新、删除、按 key 对身份。但它只能渲染**原生标签**——`div`、`span`、`h1`、`input`。这一章把 React 世界的第一公民"函数组件"接进来。改动量不大（不到 30 行），但这一章会逼你回答一个此前被绕开的问题：**一个既不是 DOM 节点、又没有实例的对象，在 Fiber 树里到底算什么？** 答案将直接引出 M7 的 useState。

---

#### 1. 函数组件的 fiber 没有 dom；children = fiber.type(props)

##### 1.1 崩溃现场

拿 M5 的成品直接渲染一个组件函数，会发生什么：

```js
function App(props) {
  return Didact.createElement('h1', null, `你好，${props.name}`);
}

Didact.render(
  Didact.createElement(App, { name: 'Didact' }), // 注意：type 是函数 App，不是字符串
  document.getElementById('root')
);
```

reconcileChildren 不会觉得有任何异常——`element.type` 是 `App`，旧树为空（首次渲染），走 PLACEMENT 分支，生成 `fiber { type: App, dom: null }`。炸点在下一个工作单元：`performUnitOfWork` → `updateHostComponent` → `fiber.dom` 为 null → `createDom(fiber)` → `document.createElement(fiber.type)`，也就是 `document.createElement(App)`——浏览器抛出 `Uncaught DOMException: Failed to execute 'createElement' on 'Document': The tag name provided is not a valid name`。标签名得是字符串，你塞给它一个函数。

##### 1.2 为什么函数组件的 fiber 没有 dom

修复之前先把概念掰清楚，因为"没有 dom"不是实现技巧，而是本质属性。

React 世界里有两类东西：**宿主元素**（host element，浏览器世界里就是标签）和**组件**。宿主元素在宿主环境里有一个一一对应的实例——`<h1>` 对应一个真实的 `<h1>` DOM 节点，fiber 的 `dom` 字段指向它。而函数组件是"**描述的描述**"：`App` 本身不对应页面上的任何东西，它只是一个**产出描述的函数**——调用 `App(props)`，得到一棵 element 树，那棵树里的宿主元素才有对应实例。所以函数组件的 fiber 天然**没有 `dom`**，它存在的意义是：占住树上的一个位置（让 diff 有"身份"可对齐），并承载这个组件自己的信息（props、以及 M7 将加上的 `memoizedState`）。

```text
fiber: App          ← 函数组件：没有 dom，只是"调用"的记录
  └ child
    fiber: div      ← 宿主元素：dom = <div> 真实节点
      └ child
        fiber: h1   ← 宿主元素：dom = <h1> 真实节点
        └ sibling
          fiber: TEXT_ELEMENT  ← dom = 文本节点
```

两类 fiber 的对照表（这张表 M7 还会回来）：

| | type 是字符串（'div'） | type 是函数（App） |
|---|---|---|
| fiber 对应什么 | 一个宿主实例的"席位" | 一次组件调用 |
| 有 dom 吗 | 有 | **没有** |
| children 从哪来 | `fiber.props.children`（写 JSX 时塞进去的） | **执行 `fiber.type(fiber.props)` 的返回值** |
| 更新时做什么 | diff 自身 props + diff children | **重新执行函数**，再 diff 它返回的 children |

顺带一个使用层推论（真实 React 同样成立）：`sameType` 比较的是 `type` 引用，所以组件函数必须**稳定声明**——如果在别的组件体里定义组件（每次 render 都创建新函数引用），每轮 diff 的 type 都"变了"，整棵子树每轮全删全建。把组件声明在模块顶层。

##### 1.3 reconcile 侧：执行函数拿 children

`performUnitOfWork` 按"type 是不是函数"分派，两个更新函数各管一摊：

```js
let wipFiber = null; // 当前正在执行的函数组件的 fiber（M7 的 useState 靠它定位组件）
let hookIndex = 0;   // 本次执行中 hook 的调用序号（M7 的对齐依据，本章先立变量）

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber); // 分支：函数组件
  } else {
    updateHostComponent(fiber);     // 分支：宿主元素（M5 写好的那个）
  }
  // 下一个工作单元的推导不变：child → sibling → 叔叔
  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
  return null;
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber; // 登记目标：接下来执行的这个函数里如果调用了 useState，就往这个 fiber 上挂
  hookIndex = 0;    // 函数每次重新执行，hook 计数都从零开始
  const children = [fiber.type(fiber.props)]; // ★ 执行函数组件，返回值就是它的 children
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber); // 只有宿主元素的 fiber 才创建 dom
  }
  reconcileChildren(fiber, fiber.props.children);
}
```

三个要点。

**children = `[fiber.type(fiber.props)]`。** 函数组件只能返回一个根节点（和真实 React 一致），所以 children 是"包着一个 element 的数组"。执行时机在这个函数体里、workLoop 的调度之内——也就是说**组件函数的执行是可中断渲染流程的一部分**，一万行 render 逻辑的大组件同样受益于时间切片（这是真实 React "render 阶段执行组件函数"的同构）。

**`wipFiber` / `hookIndex` 两个全局变量是本章埋下的伏笔。** 函数组件正在执行的瞬间，它内部可能调用 `useState`——而 `useState` 是导出给用户代码的全局函数，它怎么知道"我是谁的状态、我是第几个"？答案就是这两个全局变量：`wipFiber` 告诉 useState 状态挂在哪个 fiber 上，`hookIndex` 告诉它对齐链表上的第几个节点。M6 阶段它们被赋值但没有消费者，M7 的 useState 是唯一读者。

**嵌套组件为什么不会把 `wipFiber` 弄乱？** 这是初学者最常见的疑问，值得说透。`App` 返回的 element 树里含着 `<Child />` 时，执行 `App(props)` **并不会执行 Child**——`createElement(Child, ...)` 只是造了一个 `{ type: Child }` 的普通对象，Child 的函数体要到 workLoop 稍后走到 `ChildFiber` 这个工作单元、`updateFunctionComponent(ChildFiber)` 时才执行，而那之前 `wipFiber` 已经被赋成 `ChildFiber`。也就是说：**组件函数的执行是严格串行的、由 workLoop 逐个驱动的**，任意时刻最多只有一个组件在执行，全局变量因此是安全的。函数式组件没有"调用栈里嵌套执行"这回事——嵌套关系被 Fiber 树的 child/sibling 链摊平成了工作单元队列。

##### 1.4 reconcile 的其余部分一行不用改

reconcileChildren 拿到 children 之后走的还是 M5 的三分支：App 这个 fiber 的 type 引用没变 → 复用（UPDATE）；变了 → 删旧建新。函数组件 fiber 复用时同样带着 `alternate`，M5 建立的整套 diff 对它照常生效。**这就是 M5 的投资在回收：调和逻辑对"fiber 是什么"完全无感，它只关心 type 与 children。**

---

#### 2. commit 的连锁修复：没有 dom 的 fiber 如何挂载与删除

reconcile 侧顺畅了，commit 侧立刻出现两个连锁问题，都源于同一个事实：**函数组件的 fiber 没有 dom**。

**问题一：新节点挂到哪？** `commitWork` 里 `domParent = fiber.parent.dom`——如果 fiber 的 parent 是函数组件（比如 `App` 的子 `div` 要挂载，`div.parent` 是 AppFiber，`AppFiber.dom` 是 null），`appendChild` 直接对着 undefined 报错。修复：**沿 parent 链向上找最近的有 dom 的祖先**。App 的子树最终都物理挂在这个祖先的 dom 下面——函数组件是"逻辑层"的包裹，不产生物理层。

**问题二：删函数组件删什么？** 删除分支原来写 `domParent.removeChild(fiber.dom)`，对函数组件 fiber 来说 `fiber.dom` 是 null，同样是空引用。修复：**没有 dom 就下钻，找到子树里第一个有 dom 的后代，删它**——宿主节点一摘，整个输出子树（包括更深处的所有 dom）随之脱离文档。

完整代码：

```js
function commitWork(fiber) {
  if (fiber == null) return;

  // ① 宿主父节点：parent 可能是函数组件（无 dom），向上找到最近的有 dom 的祖先
  let domParentFiber = fiber.parent;
  while (domParentFiber != null && domParentFiber.dom == null) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    // 宿主元素的新增 / 相对顺序变化时的"移动"：M5 的锚点插入逻辑原样保留
    const anchor = getNextHostDom(fiber);
    if (anchor != null) {
      domParent.insertBefore(fiber.dom, anchor);
    } else {
      domParent.appendChild(fiber.dom);
    }
    if (fiber.alternate != null) {
      // 有旧身的 PLACEMENT = 移动：位置挪好了，props 的变化也要补上（M5 第 5 节）
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 宿主元素的更新：props diff。函数组件 fiber 走不到这里（dom 为 null）
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent); // ② 删除交给专门函数处理无 dom 的情况
    return;                           // 删除不递归（M5 第 3 节的结论）
  }

  commitWork(fiber.child); // 函数组件 fiber 自身无操作，靠这两行继续深入子树
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom != null) {
    domParent.removeChild(fiber.dom); // 自己就是宿主节点：直接摘，子树 DOM 随之脱离
  } else {
    commitDeletion(fiber.child, domParent); // 函数组件没有 dom：删它子树里第一个宿主后代
  }
}
```

注意 UPDATE 分支的守卫 `fiber.dom != null` 天然把函数组件 fiber 排除在 props diff 之外——函数组件的"props 变化"不需要在 commit 阶段做任何事，它的意义在 render 阶段就已经兑现了（props 变 → 重新执行函数 → 返回不同的 children）。这也再次印证两类的分工：**宿主元素的变更在 commit 落到 dom 上，函数组件的变更在 render 落到 children 上**。

---

#### 3. 三分支全景：函数组件 / 类组件 / 原生元素

顺着"fiber.type 是什么"把第三类也补齐：类组件。React 判别类组件的依据是原型链上有没有 `isReactComponent` 标记（而不是 `typeof === 'function'`，因为函数组件的 type 同样是 function）；我们镜像这个设计，提供 `Didact.Component` 基类：

```js
class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  setState(partialState) {
    // 合并出新 state，然后以当前树为旧树、新开一轮调度（与 M7 的 setState 同一个模式）
    this.state = { ...this.state, ...partialState };
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  }
}
Component.prototype.isDidactComponent = true; // 对应真实 React 的 isReactComponent 判据

const isClassComponent = type =>
  type != null &&
  type.prototype != null &&
  type.prototype.isDidactComponent === true;
```

类组件与函数组件的关键差异只有一个：**它有实例**。实例只创建一次、跨渲染存活，children 从 `instance.render()` 拿。实例挂在 fiber 的 `stateNode` 上（真实 React 的字段名，M3 的 Fiber 字段表里出现过），复用方式与 dom 如出一辙——从旧身的 `stateNode` 上"偷"：

```js
function updateClassComponent(fiber) {
  // 实例只创建一次；后续渲染从旧身（alternate）的 stateNode 复用
  let instance = fiber.alternate && fiber.alternate.stateNode;
  if (instance == null) {
    instance = new fiber.type(fiber.props); // 首次：构造实例
  }
  instance.props = fiber.props; // props 每轮刷新到实例上
  fiber.stateNode = instance;   // 记回 fiber，下一轮从 alternate.stateNode 找回
  const children = [instance.render()]; // ★ children 由实例的 render() 返回值提供
  reconcileChildren(fiber, children);
}
```

`performUnitOfWork` 的分派最终成形为三分支：

```js
function performUnitOfWork(fiber) {
  if (isClassComponent(fiber.type)) {
    updateClassComponent(fiber);      // 分支一：类组件（有实例，无 dom）
  } else if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber);   // 分支二：函数组件（无实例，无 dom）
  } else {
    updateHostComponent(fiber);       // 分支三：宿主元素（有 dom）
  }
  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
  return null;
}
```

三分支全景表（本章的核心产出，值得抄在笔记本上）：

| | 原生元素 | 函数组件 | 类组件 |
|---|---|---|---|
| 判定 | type 是字符串 | type 是函数且非类 | `prototype.isDidactComponent` |
| fiber.dom | 有 | 无 | 无 |
| 跨渲染存活的东西 | dom（DOM 节点） | **只有 fiber 自己（经 alternate 传递）** | stateNode（实例，state 在实例上） |
| children 来源 | `fiber.props.children` | `fiber.type(fiber.props)` | `instance.render()` |
| 更新意味着 | diff props / children | **重新执行函数** | 复用实例，重调 render |
| commit 时自身要做的事 | UPDATE→updateDom / PLACEMENT→插入 | 无（子树挂上方宿主祖先） | 无（同左） |

看表中最关键的一行——"跨渲染存活的东西"：类组件的 state 活在实例上，天然跨渲染；**函数组件没有实例，它的 state 只能活在 fiber 上**。这个悬而未决的问题就是 M7 的全部内容。

---

#### 4. 更新 = 重新执行函数：状态存在哪？（引出 M7）

把这一章的更新机制用一句话说尽：**函数组件的更新 = 重新执行函数**。props 变了、父级重渲了、状态变了——不管因为什么，都是把 `fiber.type(props)` 再调用一遍，拿新的返回值去 reconcile。

现在写一个计数组件，用"最直觉"的写法：

```js
function Counter() {
  let count = 0; // ← 每次执行函数，这行都会重新跑一遍
  return Didact.createElement('button', {
    onClick: () => { count = count + 1; }, // 改的只是这次函数调用的局部变量
  }, `count: ${count}`);
}
```

点击按钮：`count` 确实变成了 1——但没有任何人知道要重新渲染，页面停在 `count: 0`；就算人为触发一次重渲，函数重新执行，`let count = 0` 又把它清零。**局部变量活不过一次函数调用**，这条路从原理上就是死的。那状态必须同时满足三个条件：活在函数体**外**（跨调用存活）、和**这个组件这一处调用**绑定（不能是全局变量——页面上有三个 Counter 就完了）、更新它能触发重新渲染。三个条件共同指向唯一的宿主：**fiber**。fiber 通过 `alternate` 链代代相传（M5 建立），是函数组件在 Fiber 架构里唯一的"化身"——类组件的实例对应函数组件的什么？答案就是 fiber。

剩下的问题是：状态挂在 fiber 的哪个字段、以什么为身份标识？函数每次重新执行，没有"实例字段名"可用，React 的答案是：**以 useState 的调用顺序为身份**——第 1 次调用的 useState 对应状态链上的第 1 个节点，第 2 次对应第 2 个。这个设计极其简单，也极其脆弱（它就是"hooks 不能写在 if 里"的根源），M7 会亲手把这个脆弱性推演给你看。

---

#### 5. 验收方式（M6）

**验收一：函数组件跑起来 + "更新 = 重新执行"的直接证据。**

```js
function App(props) {
  console.log('App 执行了一次，props.step =', props.step); // 每次 render 都会打印
  return Didact.createElement('div', null,
    Didact.createElement('input', { placeholder: '打字试试，更新时不许丢焦点' }),
    Didact.createElement('h1', null, `step: ${props.step}`)
  );
}

let step = 0;
function rerender() {
  step += 1;
  Didact.render(
    Didact.createElement(App, { step }),
    document.getElementById('root')
  );
}
Didact.render(Didact.createElement(App, { step }), document.getElementById('root'));
// 页面再放一个原生 <button id="btn">，用原生 addEventListener 触发 rerender：
document.getElementById('btn').addEventListener('click', rerender);
```

验证行为：每点一次按钮，控制台打印一条"App 执行了一次"（重新执行函数的直接证据，没有实例缓存渲染结果这回事）；input 的焦点和已输入内容在更新后保留（函数组件 fiber 走 UPDATE，其下的 div/h1/input 被复用）；h1 的 step 递增。再验证 M5 的验收一在这个 demo 里依然成立（`document.querySelector('input')` 的引用跨更新不变）——函数组件包了一层，diff 穿透了它。

**验收二：类组件三分支。**

```js
class Counter extends Didact.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  render() {
    return Didact.createElement('button', {
      onClick: () => this.setState({ count: this.state.count + 1 }),
    }, `类组件计数：${this.state.count}`);
  }
}

Didact.render(
  Didact.createElement('main', null, Didact.createElement(Counter)),
  document.getElementById('root')
);
```

验证行为：点击按钮计数递增（实例的 state 跨渲染存活、`setState` 触发新一轮 render→commit）；在 `updateClassComponent` 里打印 `instance` 可以确认多轮更新始终是同一个实例（从 `alternate.stateNode` 复用）。这个 demo 顺便告诉你：类组件的 state 方案（实例）与函数组件的 state 方案（fiber，M7）解决的是同一个问题，只是宿主不同。

---

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

---

### M9：补全 API 与批处理（2 天）

- `useRef`（{ current } 不参与 diff）、`useMemo`、`useReducer`、`useContext`（context 挂根、沿树下行）
- **批处理简化版**：一次事件里多个 setState 合并为一次调度（微任务收集）——React 18 automatic batching 的雏形
- **合成事件简化版**：事件委托到 root + 包装合成事件对象（讲清为什么 React 要自己搞事件系统：跨浏览器 + 批处理入口）

M8 之后我们的 mini React 已经"五脏俱全"但"四肢不全"：四个高频 hooks 缺了仨，更新调度是"来一次处理一次"，事件还是每个 DOM 节点各自 `addEventListener`。M9 一天补 hooks、一天补调度与事件——后面这两块恰好是 React 18 "automatic batching" 与合成事件系统的雏形，也是理解 React "统一入口"哲学的入口。

#### 9.1 useRef：一个不参与调和的可变盒子

`useRef` 的实现是所有 hooks 里最短的，但它要回答的问题一点也不浅：为什么 `{ current }` 不参与 diff？

```js
// —— M9 新增：useRef ——
function useRef(initialValue) {
  const oldHook = getOldHook(hookIndex)
  // 关键：有旧 hook 就直接复用同一个对象——current 的修改跨 render 存活
  const hook = oldHook || { tag: 'ref', current: initialValue }
  pushHook(hook)
  hookIndex++
  return hook // 直接返回 hook 对象本身，组件拿到 { current } 读写
}
```

**"不参与 diff"的原因有三层。** 第一层是设计意图：ref 是 React 生态的"逃逸舱"（escape hatch），它存在的意义就是"存一个可变值/一个 DOM 引用，但**不触发重新渲染**"。如果 `current` 的变化参与调和、触发 render，ref 就退化成了另一个 `useState`，逃逸舱失去意义。第二层是实现后果：正因为不触发 render，我们的调和器（reconciler）根本没有机会"看到" `current` 的变化——render 只在 setState 调度后发生，改 `current` 不调度，diff 自然永远不会为它生成 UPDATE。第三层是契约稳定性：新旧 fiber 的 `memoizedState` 链上，这个位置存的是**同一个对象引用**（`oldHook || {...}` 直接复用），两棵树、任意时刻的闭包拿到的都是同一个盒子——这也是 8.5.3 写法三能用它读最新值的原理。

配套实现一下宿主元素上的 `ref` prop（`<input ref={inputRef}>`），它是 `useRef` 的一半用途。改动三处，全部是"一两行"级别：

```js
// ① createDom 末尾追加：DOM 建好时把引用交给 ref
function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  if (fiber.props.ref) fiber.props.ref.current = dom // 新节点：建好即交付
  return dom
}

// ② commitWork 的 PLACEMENT 与 UPDATE 分支各加一行（UPDATE 时 dom 复用但 fiber 是新的）
if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
  domParent.appendChild(fiber.dom)
  if (fiber.props.ref) fiber.props.ref.current = fiber.dom
} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
  updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  if (fiber.props.ref) fiber.props.ref.current = fiber.dom
}

// ③ commitDeletion 里，摘除 dom 的同时置空 ref（别让使用者拿到已卸载的节点）
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    if (fiber.props.ref) fiber.props.ref.current = null
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}
```

验证组件——注意第二个按钮点击后 `countRef.current` 变了但页面没重渲染：

```js
/** @jsx createElement */
function RefDemo() {
  const countRef = useRef(0)
  const inputRef = useRef(null)
  const [, forceRender] = useState(0)
  return (
    <div>
      <input ref={inputRef} />
      <button onClick={() => { countRef.current++; console.log('ref 内部 =', countRef.current) }}>
        只改 ref（页面不变，日志递增）
      </button>
      <button onClick={() => { inputRef.current && inputRef.current.focus(); forceRender(1) }}>
        聚焦输入框（操作 DOM 的合法通道）
      </button>
    </div>
  )
}
```

#### 9.2 useMemo：带依赖缓存的计算

`useMemo` 与 `useEffect` 共用同一套依赖比较，区别只在"产物"：effect 的产物是**延迟执行的副作用**，memo 的产物是**当场算好的值**：

```js
// —— M9 新增：useMemo ——
function useMemo(factory, deps) {
  const oldHook = getOldHook(hookIndex)
  const hasChanged = hasDepsChanged(oldHook ? oldHook.deps : undefined, deps)
  const hook = {
    tag: 'memo',
    value: hasChanged || !oldHook ? factory() : oldHook.value, // 没变就整值复用，factory 不执行
    deps: deps,
  }
  pushHook(hook)
  hookIndex++
  return hook.value
}
```

与 `useState` 对比着看会更清楚：

| | useState | useMemo |
|---|---|---|
| 存什么 | 状态 + action 队列 | 值 + 依赖 |
| 谁能改它 | 只能通过 setState（action 入队） | 依赖变化时框架重算 |
| deps 不变时 | state 原样带过来（本来也不需要算） | **factory 根本不执行**，旧值直接复用 |
| 触发 render | 是（这是它的本职） | 否（它是为别的 render 服务的） |

最后一行的意思是：`useMemo` 自己永远不会触发渲染，它唯一的作用是**让别的渲染更便宜**——`props` 传给被 `memo` 包裹的子组件时保住引用相等性、跳过大计算。也因此 React 文档反复强调"不要把 `useMemo` 当语义保证"：未来版本可能为了性能把缓存丢掉（重新调用 factory），代码不能依赖"deps 没变就绝不重算"——把重计算写成幂等的，而不是写成依赖缓存副作用的。

#### 9.3 useReducer：useState 的推广形态

`useReducer` 把"下一个 state 怎么算"从组件里挪进 reducer 函数，其余机制与 `useState` 同构：

```js
// —— M9 新增：useReducer ——
function useReducer(reducer, initialArg, init) {
  const oldHook = getOldHook(hookIndex)
  const hook = {
    tag: 'state',
    state: oldHook ? oldHook.state : (init ? init(initialArg) : initialArg),
    queue: [], // dispatch 的 action 都进同一条队列，render 时统一重放
  }
  const actions = oldHook ? oldHook.queue : []
  actions.forEach((action) => {
    hook.state = reducer(hook.state, action) // 每个新 state 都由 reducer 从上一个算出
  })
  const dispatch = (action) => {
    hook.queue.push(action)
    scheduleUpdateFromCurrentRoot() // 9.5 会实现这个统一调度函数，先当作"发起渲染"即可
  }
  pushHook(hook)
  hookIndex++
  return [hook.state, dispatch]
}
```

写完立刻做一个"aha"观察——`useState` 其实就是 `useReducer` 的特例，reducer 是 React 内置的：

```js
// React 源码里真的有这个函数（ReactFiberHooks 的 basicStateReducer）：
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action // 函数式更新的真身
}
// 所以 useState(x) ≈ useReducer(basicStateReducer, x)，setState ≈ dispatch
```

回头看 8.5.3 的"函数式更新为什么能拿到最新值"：`setCount((prev) => prev + 1)` 的 action 是函数，重放时 `basicStateReducer` 把**队列消费到一半的、最新的** `hook.state` 传给它——M7 的 action queue + 这里的 reducer 视角，两块拼图在这一行合上了。`dispatch` 还有个工程上的红利：它的引用在每次 render 间**恒定不变**（闭包捕获的 `hook` 对象复用），所以传给子组件时永远不会因为"函数是新的"而破坏 `memo`/`useEffect` 的依赖比较——这是"组件库实战大纲"里 Toast 队列那类组件偏爱 `useReducer` 的直接原因。经典计数器示例：

```js
/** @jsx createElement */
function reducer(state, action) {
  switch (action.type) {
    case 'add': return { count: state.count + 1 }
    case 'addN': return { count: state.count + action.n } // 带 payload 的 action
    case 'reset': return { count: 0 }
    default: return state // 兜底：未知 action 原样返回，绝不产生 undefined state
  }
}
function ReducerDemo() {
  const [state, dispatch] = useReducer(reducer, { count: 0 })
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'add' })}>+1</button>
      <button onClick={() => dispatch({ type: 'addN', n: 10 })}>+10</button>
      <button onClick={() => dispatch({ type: 'reset' })}>归零</button>
    </div>
  )
}
```

#### 9.4 useContext：context 挂根、沿树下行

context 解决的是"深层传参"：主题、语言、登录态这类"祖上 18 代都要用"的值，靠 props 一层层凿下去（prop drilling）不可维护。实现的三个关键词各对应一段代码：

**① context 挂根**——`createContext` 返回一个独立于组件树的对象，当前值 `_currentValue` 挂在它自己身上（"挂根"：不属于任何组件，全局唯一），`Provider`/`Consumer` 是携带指向它的特殊 type：

```js
// —— M9 新增：createContext ——
function createContext(defaultValue) {
  const context = {
    _currentValue: defaultValue, // 当前"下行到此处"的值，Provider 会改写它
  }
  context.Provider = { kind: 'Provider', _context: context } // 特殊 type（对象，不是函数/字符串）
  context.Consumer = { kind: 'Consumer', _context: context }
  return context
}
const isProvider = (type) => typeof type === 'object' && type !== null && type.kind === 'Provider'
const isConsumer = (type) => typeof type === 'object' && type !== null && type.kind === 'Consumer'

// useContext 是所有 hook 里最"轻"的：读一下当前值，登记一下依赖
function useContext(context) {
  const hook = { tag: 'context', context } // 记下"我订阅了谁"（真实 React 靠它做精确更新，见下文差距说明）
  pushHook(hook)
  hookIndex++
  return context._currentValue
}
```

**② 沿树下行**——改造 `performUnitOfWork`：进入 Provider 子树前把值推上去，并记住父值；子树全部完成后恢复。这是 React 真实模型（pushProvider/popProvider）的最小形态：

```js
function performUnitOfWork(fiber) {
  if (isProvider(fiber.type)) {
    // 下行：进入子树前改写 context 的当前值；把旧值存进 fiber，离开时恢复
    fiber.providerParentValue = fiber.type._context._currentValue
    fiber.type._context._currentValue = fiber.props.value
    reconcileChildren(fiber, fiber.props.children)
  } else if (isConsumer(fiber.type)) {
    // Consumer：children 是函数，用当前值调用它（render props 风格）
    reconcileChildren(fiber, [fiber.props.children(fiber.type._context._currentValue)])
  } else if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  if (fiber.child) return fiber.child
  let nextFiber = fiber
  while (nextFiber) {
    if (isProvider(nextFiber.type)) {
      // 上行恢复：这个 Provider 的整棵子树已完成，把值还原给右边的兄弟子树
      nextFiber.type._context._currentValue = nextFiber.providerParentValue
    }
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}
```

恢复那一步为什么必不可少？想象两个并排的 `<Theme.Provider value="dark">` 和 `<Theme.Provider value="light">`：如果进了 dark 忘了还原，light 子树开头把值设成 light 之前，dark 与 light 之间那段代码读到的还是 dark——更隐蔽的是回溯到 dark 的 parent 时，外层所有后代都会永久读到 dark。push/pop 成对，值的变化范围才严格等于 Provider 子树的范围。注意 Provider/Consumer 分支**不走 `createDom`**，它们的 fiber 没有 dom——`commitWork` 里"向上找有 dom 的祖先"的逻辑（M6 为函数组件写的）天然兼容它们，一处不用改。

**③ Consumer 与 useContext 两个消费口**。`useContext` 走 hook（上面已给），Consumer 走 render props。用嵌套实验验证全部行为——四个 `ThemedLabel` 应分别读到 `light/dark/neon/dark`，最后恢复 light：

```js
/** @jsx createElement */
const ThemeContext = createContext('light')
function ThemedLabel() {
  const theme = useContext(ThemeContext)
  return <p>theme: {theme}</p>
}
function NestDemo() {
  return (
    <div>
      <ThemedLabel />
      <ThemeContext.Provider value="dark">
        <ThemedLabel />
        <ThemeContext.Provider value="neon">
          <ThemedLabel />
        </ThemeContext.Provider>
        <ThemedLabel />
      </ThemeContext.Provider>
      <ThemedLabel />
    </div>
  )
}
// 渲染结果：
// theme: light
// theme: dark
// theme: neon
// theme: dark    ← neon 子树结束，值已恢复
// theme: light   ← dark 子树结束，值已恢复
```

一个 Consumer 用法的小坑顺带修掉：`<ThemeContext.Consumer>{(v) => <p>{v}</p>}</ThemeContext.Consumer>` 的 child 是**函数**，而 M1 的 `createElement` 只认对象（函数会被包成 TEXT_ELEMENT）。给 `createElement` 的 children 处理打补丁：

```js
props.children = children.map((child) =>
  typeof child === 'object' || typeof child === 'function' ? child : createTextElement(child)
)
```

**诚实的差距说明**（这正是简化版的学费所在）：第一，中断安全。`_currentValue` 是可变全局状态，render 中断后从 `nextUnitOfWork` 恢复时，祖先 Provider 的 push 不会重放——若恢复点在某 Provider 深处，读到的可能是错的值。真实 React 同样用 push/pop，但它的中断恢复有完整的栈重放机制；教学版把 `workLoop` 的时间片设保守（或接受这一简化）。第二，精确更新。真实 React 里 Provider 的 value 变化时，React 会沿 fiber 的 `dependencies` 链找到所有订阅该 context 的组件强制更新，**哪怕它们被 `memo` 跳过**。我们的版本没有 memo 也没有依赖传播，靠的是"value 变化必然源自祖先 state 变化 → 祖先重渲染 → 整树重新调和 → 子组件重新执行时读到新值"——行为大体正确；但一旦将来给 mini 加 memo/bailout，useContext 就必须升级出依赖表。第三，作为对照，React 的 legacy context（`contextType` 时代之前）用的是另一种模型——render 时沿 parent 链**上行查找**最近的 Provider，几行就能实现、天然抗中断（无全局态），但每次读取 O(深度) 且无法支撑精确更新，最终被下行模型取代。两种模型你都见过了，React 的取舍就不再神秘。

#### 9.5 批处理：一次事件的 N 个 setState 只调度一次

先看病灶。M7 的 `setState` 每被调用一次就**立刻**造一棵 `wipRoot`、把 `nextUnitOfWork` 指过去：

```js
// M7 的 setState（有问题，每次调用都立刻发起渲染）
const setState = (action) => {
  hook.queue.push(action)
  wipRoot = { dom: currentRoot.dom, props: currentRoot.props, alternate: currentRoot, effects: [] }
  nextUnitOfWork = wipRoot
  deletions = []
}
```

一个按钮的 onClick 里连写两个 setState，会发生什么？第一次调用建了根 A 并把 `nextUnitOfWork` 指向 A；第二次调用**再建一个根 B 覆盖掉 A**。侥幸的是两个 action 都进了同一条 hook 队列，workLoop 从 B 开始消费时一起重放，行为碰巧正确——但这依赖"事件处理器是原子的、workLoop 不会插进来"这一巧合，而且我们完全无法演示/控制"合并渲染"这件事。批处理的正确姿势是把它变成**显式的调度逻辑**：setState 只负责入队，"何时开始 render"交给调度器，调度器保证一个收集窗口内只发起一次。

**收集窗口选微任务。** `queueMicrotask` 注册的回调在"当前宏任务的全部同步代码执行完"之后、浏览器 paint 之前运行——一个事件处理器里的 N 个 setState 全部同步执行完，微任务才动手，天然就是合并点。实现：

```js
// —— M9 新增：统一调度入口（automatic batching 的雏形） ——
let isRenderScheduled = false // 是否已经排了一次渲染

function scheduleUpdateFromCurrentRoot() {
  if (isRenderScheduled) return // ★ 批处理的心脏：已排队就直接返回，action 留在各自的队列里
  isRenderScheduled = true
  queueMicrotask(() => {
    isRenderScheduled = false
    // 走到这里时，同一事件里的所有 action 都已入队——只发起一次渲染
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
      effects: [],
    }
    deletions = []
    nextUnitOfWork = wipRoot
  })
}

// useState 的 setState 改为（useReducer 的 dispatch 同理，9.3 已改）：
const setState = (action) => {
  hook.queue.push(action)
  scheduleUpdateFromCurrentRoot() // 只入队 + 调度，不再立刻建 wipRoot
}
```

对照 React 的版本演进，这套小代码正好站在终点上：**React 17 及之前**，批处理靠事件系统进出口的一对开关（进入处理器时置 `isBatchingUpdates = true`，退出时置回并冲刷）——所以只有 React 事件里的 setState 会合并，`setTimeout`、Promise 回调、原生事件里的 setState 各渲染各的，一个回调两个 setState 就是两次 render。**React 18** 把合并点移到微任务调度（`scheduleMicrotask`），所有来源的更新一视同仁，故称 automatic batching。我们的 `scheduleUpdateFromCurrentRoot` 就是 18 的形态——`isRenderScheduled` 标志对应它的"已调度"位，微任务对应它的 `scheduleMicrotask`。

验证实验，用 `console.count` 数函数组件的实际执行次数：

```js
/** @jsx createElement */
function BatchDemo() {
  const [a, setA] = useState('a')
  const [b, setB] = useState('b')
  console.count('render 执行次数')
  return (
    <div>
      <button onClick={() => { setA('A'); setB('B') }}>一次点击、两个 setState</button>
      <p>{a}-{b}</p>
    </div>
  )
}
// 点击一次的控制台：
// render 执行次数: 2   ← 挂载 1 次 + 点击 1 次（无批处理会是 3 次，且中间态 'A-b' 曾上屏）
```

值得再做一步的对照实验：把两个 setState 挪进 `setTimeout(() => { setA('A'); setB('B') }, 0)`。我们的 mini React 依然只渲染一次（微任务在 setTimeout 回调结束后的检查点统一冲刷）——这正是 React 18 的行为；而如果你在 React 17 的沙盒里做同样的事，会看到两次渲染。一次实验看清一个版本升级。

#### 9.6 合成事件：委托到 root 的统一入口

M2 基线的 `updateDom` 给每个 DOM 节点单独 `addEventListener`，处理器变化时先卸再装。M9 把它换成**委托**：所有事件只在 root 容器上监听一次，事件发生时从 `e.target` 沿 DOM 树向上模拟冒泡，逐层查 fiber 的 props 调用处理器，并给处理器一个**包装过的合成事件对象**。

```js
// —— M9 新增：合成事件系统 ——
const supportedEvents = ['click', 'input', 'keydown'] // 教学版只支持三种，加类型即扩展
let eventsRoot = null

function ensureSyntheticEvents(rootDom) {
  if (eventsRoot === rootDom) return // 幂等：同一 root 只绑一次
  eventsRoot = rootDom
  supportedEvents.forEach((type) => rootDom.addEventListener(type, dispatchSyntheticEvent))
}

function dispatchSyntheticEvent(nativeEvent) {
  const propName = 'on' + nativeEvent.type[0].toUpperCase() + nativeEvent.slice(1) // click → onClick
  const syntheticEvent = createSyntheticEvent(nativeEvent)
  let dom = nativeEvent.target
  while (dom) { // 模拟冒泡：从触发元素沿真实 DOM 树向上，直到 document
    const fiber = dom._fiber // dom → 最新 fiber 的反向引用（commitWork 里维护，见下）
    const handler = fiber && fiber.props && fiber.props[propName]
    if (typeof handler === 'function') {
      syntheticEvent.currentTarget = dom
      handler(syntheticEvent)
      if (syntheticEvent._propagationStopped) break // stopPropagation 生效：不再向上
    }
    dom = dom.parentNode
  }
}

function createSyntheticEvent(nativeEvent) {
  return {
    type: nativeEvent.type,
    target: nativeEvent.target,
    nativeEvent, // 需要时可以掏原生事件，但组件代码平时不该碰它
    key: nativeEvent.key,
    get value() { return nativeEvent.target ? nativeEvent.target.value : undefined }, // input 场景
    _propagationStopped: false,
    preventDefault() { nativeEvent.preventDefault() },
    stopPropagation() {
      this._propagationStopped = true     // 掐断我们自己的冒泡循环
      nativeEvent.stopPropagation()       // 同时也拦住原生层继续向上
    },
  }
}
```

配套三处小改动：其一，`render()` 里调用 `ensureSyntheticEvents(container)`；其二，`commitWork` 里维护反向引用——PLACEMENT 与 UPDATE 分支各加 `if (fiber.dom) fiber.dom._fiber = fiber`（UPDATE 时 dom 复用但 fiber 是新的，不更新就会读到旧 props 上的处理器）；其三，`updateDom` **删掉**事件相关的两段 forEach，`isProperty` 改为 `(key) => key !== 'children' && !key.startsWith('on')`——事件从此不进属性 diff，委托方案下处理器永远从最新 fiber.props 现查现用，连"处理器变了要先卸再装"这一步都省了。

**为什么 React 要自己搞一套事件系统？** 三个理由按重要性排：**第一，批处理需要统一入口。** 9.5 的调度之所以能在"一个事件的所有 setState 之后"合并，前提是所有用户回调都从同一个门口进出——`dispatchSyntheticEvent` 就是这个门口。React 17 时代的 `isBatchingUpdates` 开关正是在这个门口打开和关闭的；没有统一入口，就得在每个节点的每个原生监听器上各做一遍进出逻辑。**第二，跨浏览器统一。** 事件对象的字段、冒泡行为、表单事件的细节在不同浏览器（尤其上古时代的 IE）差异很大，包一层合成对象后，组件代码只面对一套稳定接口（教学版的 `e.value`、`e.stopPropagation()` 就是这个接口的最小样本），浏览器差异被压在 `createSyntheticEvent` 一个文件里。**第三，性能与文档级拦截。** 一个 root 一个监听器替代千万个节点监听器，挂载卸载不再需要操作监听器；React 17 起监听器从 document 下放到 root，也是为了多 root 场景互不干扰。冒泡验证：

```js
/** @jsx createElement */
function EventDemo() {
  return (
    <div onClick={() => console.log('div：冒泡到我')}>
      <button onClick={(e) => { console.log('button：value=', e.value); e.stopPropagation() }}>
        点我（div 不会打印）
      </button>
      <input onInput={(e) => console.log('input 实时值：', e.value)} />
    </div>
  )
}
// 点按钮：只打印 button 一行；在 input 打字：逐字符打印 input 实时值
```

#### 9.7 M9 验收

| 验收项 | 怎么算过 |
|---|---|
| useRef 不触发渲染 | 9.1 的 RefDemo：点第一个按钮 N 次，日志递增但页面无任何重渲染痕迹 |
| ref prop 能拿到 DOM | 点第二个按钮，input 真的被聚焦 |
| useMemo 命中缓存 | factory 内打日志，依赖不变的重复 render 无新日志，依赖一变必有一条 |
| useReducer 全链路 | 9.3 计数器三按钮行为正确；连续点两次 +10，两次 action 都被重放（队列消费） |
| useContext 嵌套恢复 | 9.4 的 NestDemo 输出 light/dark/neon/dark/light 五行，一个不差 |
| 批处理 | 9.5 的 BatchDemo：一次点击 render 计数只 +1；setTimeout 里双 setState 也只 +1 |
| 合成事件 | 9.6 的 EventDemo：冒泡、stopPropagation、e.value 三件事全部符合预期 |

### M10：选修（各 1 天）

- `useLayoutEffect` 与 useEffect 的时机差（commit 的同步子阶段 vs passive）
- Suspense 简化：child throw promise → 捕获后显示 fallback → resolve 后重试（最难也最有趣）
- 优先级的最简表达：高优先级任务可抢占低优先级任务（跳过细节，理解 lane 的存在意义即可）

M9 结束时，mini React 的 API 面已经覆盖日常开发的八九成。M10 的三节选修都不是"再学一个 hook"，而是**撕开真实 React 三块最硬领地的口子**：useLayoutEffect 撕开 commit 阶段的内部分期；Suspense 撕开"渲染过程可以被异常打断再恢复"这个反直觉机制；优先级撕开并发 React 的存在理由。每一节都只需一天，但每一节都对应 React 源码里一个独立的子系统。

#### 10.1 useLayoutEffect 与 useEffect 的时机差

先给结论再给证明：两者的**登记、依赖比较、cleanup 语义完全相同**，唯一差别是执行时机——`useLayoutEffect` 在 commit 的**同步子阶段**执行（DOM 已更新、本轮 paint 之前），`useEffect` 在 commit 之后的 **passive 时机**异步执行（paint 前后，见 8.3 的时机讨论）。先把 M8 的 `commitRoot` 升级成最终形态，两条执行路径在同一个函数里分道扬镳：

```js
// —— M10 新增：useLayoutEffect ——
function useLayoutEffect(effect, deps) {
  const oldHook = getOldHook(hookIndex)
  const hasChanged = hasDepsChanged(oldHook ? oldHook.deps : undefined, deps)
  const hook = {
    tag: 'layoutEffect',
    effect: effect,
    deps: deps,
    cleanup: oldHook ? oldHook.cleanup : null,
    hasEffect: hasChanged,
  }
  if (hasChanged) wipRoot.layoutEffects.push(hook) // 登记表与 effects 分开：两者执行时机不同
  pushHook(hook)
  hookIndex++
}

// wipRoot 建根的两处（render 与 scheduleUpdateFromCurrentRoot）都补上字段：layoutEffects: []
// collectSubtreeCleanups 的判断同步扩展（卸载时两种 effect 的 cleanup 都要收集）：
//   if ((hook.tag === 'effect' || hook.tag === 'layoutEffect') && typeof hook.cleanup === 'function')

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  const effects = wipRoot.effects
  const layoutEffects = wipRoot.layoutEffects
  wipRoot = null
  flushLayoutEffects(layoutEffects) // ★ 路线一：同步、现在、paint 之前
  schedulePassiveEffects(effects)   // ★ 路线二：异步、微任务/宏任务、paint 附近
}

function flushLayoutEffects(effects) {
  // 与 passive flush 相同的"先全部清理、再全部执行"，唯一区别是：此刻、同步
  effects.forEach((hook) => {
    if (typeof hook.cleanup === 'function') hook.cleanup()
  })
  effects.forEach((hook) => {
    const returned = hook.effect()
    hook.cleanup = typeof returned === 'function' ? returned : null
  })
}
```

**实验一：顺序恒定。** 同一组件里两个 effect 都注册，无论渲染多少次、commit 多少次，输出顺序永远不变：

```js
/** @jsx createElement */
function OrderDemo() {
  useLayoutEffect(() => console.log('1. layout effect（同步，paint 前）'), [])
  useEffect(() => console.log('2. passive effect（异步，paint 附近）'), [])
  return <p>打开控制台看顺序</p>
}
// 挂载输出永远是：1 → 2。因为 flushLayoutEffects 在 commitRoot 的调用栈内同步执行，
// 而 passive flush 排在微任务里——同步代码一定先于微任务。
```

**实验二：什么时候"必须 layout"——测量尺寸。** 经典场景是 tooltip / 弹层定位：组件先渲染一个不可见/位置错误的元素，然后**读它的实际尺寸、同步修正位置**。如果修正发生在 paint 之后，用户就会看见"先错后对"的一帧闪烁。两种写法对照：

```js
/** @jsx createElement */
const FLUSH_MODE = 'timeout' // 'microtask'（不闪，演示性质）| 'timeout'（贴近真实，能复现闪烁）

function scheduleFlush(fn) {
  if (FLUSH_MODE === 'timeout') setTimeout(fn, 0) // 宏任务：浏览器有机会先 paint → 能复现闪烁
  else queueMicrotask(fn) // 微任务：paint 之前 → 两条路径都不会闪（教学默认值可改回这个）
}
// schedulePassiveEffects 内部把 queueMicrotask(...) 换成 scheduleFlush(...) 即可切换

function Tooltip({ anchorText }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const tipRef = useRef(null)

  // 写法 A：passive —— FLUSH_MODE='timeout' 时肉眼可见"错位一帧再弹回"
  useEffect(() => {
    const anchor = document.getElementById('anchor')
    const rect = anchor.getBoundingClientRect()
    setPos({ x: rect.left, y: rect.bottom + 8 })
  }, [])

  // 写法 B：layout —— 永不闪烁：修正发生在 paint 之前，浏览器只画最终那一帧
  // useLayoutEffect(() => {
  //   const anchor = document.getElementById('anchor')
  //   const rect = anchor.getBoundingClientRect()
  //   setPos({ x: rect.left, y: rect.bottom + 8 })
  // }, [])

  return (
    <span ref={tipRef} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
      [{anchorText} 的提示]
    </span>
  )
}
```

机制上把两条链路的时间线摆开就看懂了。**passive + 宏任务**：commit（DOM 上屏为错误位置）→ 当前宏任务结束 → **paint：用户看到错位的一帧** → setTimeout 回调执行 effect → `setPos` 调度（微任务）→ 再 render + commit → **paint：位置正确**。两次 paint 之间那帧错位，就是闪烁。**layout**：commit 同步走完 → `flushLayoutEffects` 同步执行 → `setPos` 调度微任务 → commitRoot 调用栈退出、宏任务收尾时微任务立刻冲刷 → 再 render + commit —— 全部发生在**同一次 paint 之前**，浏览器只画最终帧。顺带一提，写法 B 里 `setPos` 引发的第二次 render + commit 之所以能"赶在 paint 前"，靠的正是 9.5 的微任务调度——M9 与 M10 在这里咬合上了。

选用准则一张表收尾：

| 场景 | 用哪个 | 理由 |
|---|---|---|
| 订阅、请求、日志、定时器 | useEffect | 不需要 DOM 就位，别阻塞 paint |
| 读布局（尺寸/位置）并同步改 state/DOM | useLayoutEffect | 必须赶在 paint 前完成读→改闭环 |
| 手动操作第三方 DOM 库（图表初始化等） | 视库而定，常是 layout | 库内部常读尺寸 |
| 能用 useEffect 就先用 | useEffect | layout 是同步税：卡住的是用户看到结果的时间 |

#### 10.2 Suspense 简化：child throw promise

Suspense 的机制说出来只有一句话：**子组件渲染时 throw 一个 promise，调和器捕获它、就近找 Suspense 边界改挂 fallback，promise resolve 后从根重试**。但它反直觉的地方在于——"throw 一个还没完成的异步操作"竟能成为渲染流程的一部分。三个部件依次实现。

**部件一：lazy——第一次抛、之后直接渲染的组件包装器。**

```js
// —— M10 新增：lazy ——
function lazy(load) {
  let status = 'pending' // pending → done / error
  let value = null       // done 时存组件函数；error 时存错误对象
  let promise = null
  function LazyComponent(props) {
    if (status === 'done') return value(props) // 已就绪：当作普通函数组件执行
    if (status === 'error') throw value        // 失败：改抛错误（找 ErrorBoundary，简化版没有则崩）
    // pending：抛出 promise 本身——Suspense 靠 instanceof Promise 识别它
    throw (promise = promise || load().then(
      (module) => { status = 'done'; value = module.default }, // 约定 load() 的模块带 default 导出
      (error) => { status = 'error'; value = error }
    ))
  }
  return LazyComponent
}
```

注意三态都收敛在闭包里，`status === 'done'` 之后 `value` 直接就是真实组件——**lazy 组件自己不知道也不关心 Suspense 的存在**，它只负责"没好就 throw"。

**部件二：Suspense——正常时永远渲染 children 的薄壳。**

```js
// —— M10 新增：Suspense ——
const Suspense = Object.assign(
  function Suspense(props) {
    // 正常路径：永远渲染 children。fallback 不由它自己渲染——
    // 而是由调和器在"捕获到 promise"的那一刻亲手挂上去（见部件三）
    return props.children
  },
  { $$suspense: true }
)
const isSuspense = (type) => typeof type === 'function' && type.$$suspense === true
function findSuspenseParent(fiber) {
  let p = fiber.parent
  while (p && !isSuspense(p.type)) p = p.parent // 沿 fiber 树向上找最近的边界
  return p
}
```

**部件三：调和器的 catch——整个机制的心脏。** `updateFunctionComponent` 加 try/catch：

```js
function updateFunctionComponent(fiber) {
  workInProgressFiber = fiber
  hookIndex = 0
  workInProgressFiber.memoizedState = null
  try {
    const children = [fiber.type(fiber.props)] // 执行组件函数——lazy 组件在这里 throw
    reconcileChildren(fiber, children)
  } catch (thrown) {
    const suspense = thrown instanceof Promise ? findSuspenseParent(fiber) : null
    if (!suspense) throw thrown // 不是 promise / 没有 Suspense 祖先：原样上抛（简化版直接崩）
    // ① 把 Suspense 的 children 就地替换成 fallback：
    //    新旧 type 不同 → 旧的（含半途的 lazy fiber）标 DELETION、fallback 标 PLACEMENT
    reconcileChildren(suspense, [suspense.props.fallback])
    // ② resolve 后从根重试：那时 lazy 的 status 已是 done，children 这条路能走通了
    thrown.then(function retry() {
      scheduleUpdateFromCurrentRoot() // 复用 M9 的调度：以 currentRoot（此刻是 fallback 树）为起点
    })
  }
}
```

完整时间线推演（`<Suspense fallback={<p>加载中…</p>}><LazyPage /></Suspense>`）：

```text
T1  render#1：Suspense 函数执行 → 返回 children → lazy fiber 建立
T2  performUnitOfWork(lazy) → 执行 LazyComponent → status=pending → throw promise
T3  catch 接住：
      reconcileChildren(Suspense, [fallback]) → fallback 标 PLACEMENT
      （首次渲染 Suspense 无旧子树，没有东西可标 DELETION；
        若是更新中被挂起，旧子树才会在这一步标 DELETION）
      promise.then(retry) 注册重试
    遍历继续（Suspense 的兄弟们照常调和）→ render#1 完成
T4  commitRoot：fallback 上屏 —— 用户看到"加载中…"
T5  （异步）load() 的模块到位 → status='done' → then 链触发 retry
T6  retry → scheduleUpdateFromCurrentRoot → render#2：
      Suspense 函数重新执行 → 仍然返回 children →
      reconcileChildren：旧 child 是 fallback、新 children 是 LazyPage → type 不同 →
      fallback 标 DELETION、LazyPage 标 PLACEMENT
T7  执行 LazyComponent → status=done → 直接返回真实内容 → 调和、commit —— 真实页面替换 fallback
```

两个设计点值得咀嚼。**为什么"改挂 fallback"而不是"中止本次渲染等数据"？** 因为同步的调和流程无法原地等待；抛异常是 JS 里唯一能把"深层子树的状态"一口气递到"浅层边界"的通道——Suspense 本质上是**异常驱动的控制流**，这也是它"最难也最有趣"的原因。**为什么重试要"从根"而不是从 Suspense 继续？** 因为 render#1 里 LazyPage 以下的调和根本没发生，那部分 fiber 树是不完整的；从根重试用一次完整的调和保证一致性，代价（重复调和 Suspense 之外的部分）在教学版可以接受。

与真实 React 的差距记三笔：真实版删除 fallback 子树与恢复 children 用的是隐藏/复用（Offscreen 机制）而非卸载重建，切换成本更低；嵌套 Suspense 会挑"最近的能接住的"边界，且 throw 会带 thenable 判定与组件栈信息；错误路径（`status === 'error'`）在我们的版本里没有 ErrorBoundary 兜底会直接崩，真实 React 会继续向上找类组件的 `componentDidCatch`。尽管如此，"child throw promise → 捕获显示 fallback → resolve 后重试"这条主干你已经亲手写过了——进阶大纲阶段 9 的 RSC 流式渲染（服务端把"还没算完的部分"当作可挂起的子树，先发 fallback 的 HTML，算完再补流），内核就是这一套协议在服务器与浏览器之间的延伸。

#### 10.3 优先级的最简表达：lane 的存在意义

M3 的 workLoop 有时间切片，但**没有优先级**：一旦开始渲染一个大任务（比如一万行的过滤结果），哪怕用户此刻正在敲键盘，输入触发的更新也只能排队等它让出——"不卡"解决了（能分帧），"先响应谁"没有解决。优先级要补的就是这一刀：**高优先级任务可以抢占低优先级任务**。用一段思路级代码表达（刻意不并入主 workLoop，理解概念即可；`scheduleUpdateFromCurrentRoot` 仍是主线的调度入口）：

```js
// —— M10 演示模块：两级优先级 + 抢占（思路代码，未接入主 workLoop） ——
const HighLane = 0b0010 // 用户输入（离散事件）：最高
const LowLane  = 0b0001 // 大列表过滤（transition 类）：低
let pendingLanes = 0    // 掩码：当前排队了哪些优先级的更新
let wipLane = 0         // 正在渲染的是哪个优先级

function scheduleLane(lane) {
  pendingLanes |= lane // ★ 掩码合并：多个更新排队，一次位或就登记完毕
  requestAnimationFrame(laneWorkLoop) // 简化：真实 React 走 scheduler 的 MessageChannel
}

function laneWorkLoop() {
  // 抢占判定：正在跑的是低优先级，而高优先级已排队 → 丢掉进行中的树，先伺候高优先级
  if (nextUnitOfWork && wipLane === LowLane && (pendingLanes & HighLane)) {
    wipRoot = null
    nextUnitOfWork = null
    // 简化处理：直接丢弃。真实 React 不会真丢——低优先级更新记录在 lane 上，高优完成后"重放"
  }
  wipLane = pendingLanes
  const start = performance.now()
  while (nextUnitOfWork && performance.now() - start < 5) { // 5ms 时间片：给抢占留检查点
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
    pendingLanes = 0
    wipLane = 0
  }
  if (pendingLanes || nextUnitOfWork) requestAnimationFrame(laneWorkLoop)
}
// 使用侧的样子：
// 输入框 onChange → scheduleLane(HighLane)（几十个节点，毫秒级）
// 过滤计算 → scheduleLane(LowLane)（上万节点，分多帧）
// 用户在过滤进行到一半时打字：下一次时间片检查发现 HighLane 排队 → 丢弃过滤树 →
// 先渲染输入 → commit → 再从头跑过滤 → 用户输入永远先落地
```

最后回答标题里的问题：**为什么是 lane（位掩码），不是 1/2/3 这样的优先级数字？** 四个理由，前两个是核心。**一、一次渲染携带"一批"优先级。** 真实 React 的一次 render 不属于单一优先级，而是"所有不高于本次输入优先级的更新"的集合——掩码天然是集合：`pendingLanes |= lane` 登记、`lanes & ~doneLane` 剔除已完成、`lanes & InputLane` 一问便知有没有，全是 O(1) 位运算；数字优先级做集合就得排序、遍历。**二、过期提升（starvation 防护）。** 低优先级更新等太久会被"升级"，掩码上就是给位做时间衰减后重新归并，仍是位运算。**三、与调度器/事件系统对接。** 合成事件入口（9.6 的 `dispatchSyntheticEvent`）在真实 React 里会判定事件类型给出 lane（离散事件高、连续拖动中、其余低），一个数字贯穿"事件 → 调度 → 渲染"三层。**四、语义稳定。** React 17 之前用"过期时间戳"表达优先级，比较与换算繁琐，18 改成 lanes 后源码里再没有时间换算——你在全景图里学到的 `useTransition`，说到底就是把一次 setState 标记进低优先级 lane 而已（M10.3 与全景图 E1、`useTransition` 的心智模型在此合流）。

---

## 3. 验收：用你的 mini React 写真实应用（1 周）

- 用它实现 **TodoMVC**：useState 管列表/输入、useEffect 持久化 localStorage、列表渲染带 key、事件全走你的合成事件
- 行为对齐测试：与真 React 版本并排跑，重点验证——删除中间项（key）、连续 setState 批处理、effect 清理
- 能跑通 = 你的 React 知识闭环了；跑不通的地方 = 突破理解盲区，回炉对应里程碑

复刻跑通的每一步都是"在自己的规则里自洽"，只有写一个真实应用，规则之间打架的地方才会暴露：key 与删除的交互、批处理与事件系统的耦合、effect 清理与组件卸载的时序。验收周不需要新知识，需要的是把 M1–M10 的成果放到同一张页面上互相摩擦。

### 3.1 API 覆盖对照：TodoMVC 用到什么、验收哪个里程碑

| TodoMVC 里的用法 | 用到的 API | 验收的里程碑 |
|---|---|---|
| 输入框文本、待办列表、筛选状态 | `useState`（或 `useReducer` 重构） | M7（链表、队列、函数式更新） |
| localStorage 持久化、TodoItem 追踪日志 | `useEffect` + cleanup + 依赖数组 | M8 |
| 挂载后自动聚焦输入框 | `useRef` + ref prop | M9.1 |
| 筛选模式全局下发（三处按钮 + 列表过滤共用） | `useContext` + Provider | M9.4 |
| 筛选后的列表缓存 | `useMemo` | M9.2 |
| 添加/删除/切换的批量逻辑 | `useReducer`（推荐重构版） | M9.3 |
| 点击/输入/回车全部交互 | 合成事件（click/input/keydown） | M9.6 |
| 一次点击里"改列表 + 清输入" | 批处理（两次 dispatch 一次渲染） | M9.5 |
| 列表项的稳定身份 | `key={todo.id}` | M5 |

### 3.2 TodoMVC 完整实现

先打一个必要的补丁：JSX 里 `{todos.map(...)}` 会把**数组**作为单个 child 传给 `createElement`，M1 版本没处理数组。给 `createElement` 的 children 段打补丁（真实 React 的 jsx-runtime 同样会做扁平化）：

```js
props.children = children
  .flat(Infinity) // 摊平 {list.map(...)} 传入的嵌套数组
  .filter((child) => child != null && child !== false && child !== true) // 对齐 React：布尔/空不渲染
  .map((child) =>
    typeof child === 'object' || typeof child === 'function' ? child : createTextElement(child)
  )
```

然后是完整应用（可直接放进 8.0 基线 + M9/M10 增量的环境运行）：

```js
/** @jsx createElement */

// —— reducer：把"改列表"的三种动词集中到一个纯函数 ——
function todosReducer(todos, action) {
  switch (action.type) {
    case 'add':
      return [...todos, { id: Date.now(), text: action.text, done: false }]
    case 'remove':
      return todos.filter((t) => t.id !== action.id)
    case 'toggle':
      return todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t))
    case 'clearDone':
      return todos.filter((t) => !t.done)
    default:
      return todos
  }
}

function restore() {
  try {
    return JSON.parse(localStorage.getItem('mini-todos') || '[]')
  } catch (e) {
    return [] // 脏数据兜底：localStorage 里的旧格式不该炸掉整个应用
  }
}

function TodoItem({ todo, onToggle, onRemove }) {
  // effect 清理的验收载体：每条待办"开始/停止追踪"成对出现
  useEffect(() => {
    console.log(`[TodoItem ${todo.id}] effect：开始追踪「${todo.text}」`)
    return () => console.log(`[TodoItem ${todo.id}] cleanup：停止追踪`)
  }, [todo.text])
  return (
    <li data-id={todo.id} onClick={onToggle} style={{ cursor: 'pointer' }}>
      {todo.done ? '✓ ' : ''}{todo.text}
      <button
        style={{ marginLeft: 8 }}
        onClick={(e) => { e.stopPropagation(); onRemove(todo.id) }} // stopPropagation：删按钮不触发 li 的 toggle
      >
        x
      </button>
    </li>
  )
}

// context 提到模块顶层（"挂根"，9.4）：筛选模式由 Provider 下发、列表层消费，
// 三处筛选按钮与列表过滤共用一份状态，不靠 props 层层传递
const FilterContext = createContext('all')

function TodoList({ todos, dispatch }) {
  const filter = useContext(FilterContext) // 深层组件直接读，无需中间层转发
  const visible = useMemo(
    () =>
      filter === 'done' ? todos.filter((t) => t.done)
      : filter === 'active' ? todos.filter((t) => !t.done)
      : todos,
    [todos, filter]
  )
  return (
    <ul>
      {visible.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => dispatch({ type: 'toggle', id: todo.id })}
          onRemove={(id) => dispatch({ type: 'remove', id })}
        />
      ))}
    </ul>
  )
}

function TodoApp() {
  const [todos, dispatch] = useReducer(todosReducer, null, restore) // init 惰性恢复
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem('mini-todos', JSON.stringify(todos)) // deps=[todos]：只有列表变才写盘
  }, [todos])

  useEffect(() => {
    inputRef.current && inputRef.current.focus() // 挂载聚焦：一次性 effect
  }, [])

  function addTodo() {
    if (!text.trim()) return
    dispatch({ type: 'add', text: text.trim() })
    setText('') // 与上一行同一事件里两次更新 → 批处理验收点：只 render 一次
  }

  return (
    <FilterContext.Provider value={filter}>
    <div>
      <h1>mini-react todos</h1>
      <input
        ref={inputRef}
        value={text}
        onInput={(e) => setText(e.value)}        // 合成事件的统一 value
        onKeydown={(e) => { if (e.key === 'Enter') addTodo() }}
      />
      <button onClick={addTodo}>添加</button>
      <p>
        <button onClick={() => setFilter('all')}>全部</button>
        <button onClick={() => setFilter('active')}>未完成</button>
        <button onClick={() => setFilter('done')}>已完成</button>
        <button onClick={() => dispatch({ type: 'clearDone' })}>清除已完成</button>
      </p>
      <TodoList todos={todos} dispatch={dispatch} />
      <p>{todos.filter((t) => !t.done).length} 项未完成</p>
    </div>
    </FilterContext.Provider>
  )
}

render(<TodoApp />, document.getElementById('root'))
```

看几个实现选择：`FilterContext` 与 `TodoList` 的拆分是 9.4 机制的实战形态——筛选按钮在 `TodoApp` 层改 state，`value={filter}` 从 Provider 下行，`TodoList` 里 `useContext` 直接读，中间不需要任何转发 props；`TodoItem` 故意接收 `onToggle`/`onRemove` 回调 props 而不从 context 拿 `dispatch`，是为了演示"props 传行为、context 传环境值"这条惯用分界；`useReducer(todosReducer, null, restore)` 的第三个参数是惰性初始化——localStorage 只在挂载时读一次，而不是每次 render 都解析一遍 JSON。

### 3.3 行为对齐测试清单：每条都有"如何验证"的具体操作

与真 React 版并排跑（两个 iframe 或并排两个 root，各挂一份实现），逐条对照。

**A. 删除中间项（key 的正确性）——验证 M5。** 操作：依次添加 A、B、C 三条待办，点 B 的 x。验证分两层。第一层（数据）：剩 A、C，未完成计数减一，两个版本一致——这层只能证明"没算错"，证明不了"复用对了"。第二层（DOM 身份）：给每个 li 打开 DevTools Elements 面板，观察 `data-id="b"` 的节点。正确行为（`key={todo.id}`）：B 节点被移除，A、C 节点**原样保留**——进一步，在控制台先执行 `const a = document.querySelector('[data-id="a"]')` 保存引用，删除后再执行 `a.isConnected`，返回 `true` 说明 A 的 DOM 从未被重建。错误行为对照（把 `key={todo.id}` 改成 `key={index}` 再跑一遍）：控制台同样先存 A 的引用，删除后 `a.isConnected` 仍是 `true`，但 A 节点里渲染的文本变成了 C 的内容——因为 index 对比下"key=1 的那条"被理解为"内容从 B 更新成 C"、末位"key=2"被删除，三条数据串了位。在受控输入场景（每行一个 input）里这个串位会直接导致输入内容跟错行。两个版本并排各跑一遍，"为什么不能用 index"从口诀变成肌肉记忆。

**B. 连续 setState 批处理——验证 M9.5。** 操作：在 `TodoApp` 函数体第一行加 `console.count('render')`，然后点一次"添加"按钮（内部 `dispatch` + `setText` 两次更新）。验证：mini 版计数恰好 +1，React 18 版同样 +1，且中间不出现"列表已加、输入框未清"的中间态上屏。加测一档：把两次更新包进 `setTimeout(addTodo, 0)`，两边计数仍应各 +1——如果 mini 版变成 +2，说明你的微任务调度入口没有统一（回炉 9.5：是不是有某个 setState 还在直接建 `wipRoot`？）。

**C. effect 清理——验证 M8.4 与卸载时机。** 操作：添加 A、B、C 三条，然后删掉 B。验证：控制台出现 `[TodoItem <B的id>] cleanup：停止追踪`，且**只有 B 的**——A、C 的 effect 不重跑（它们的 deps `[todo.text]` 没变）。再验证成对性：把 A 的文本相关的 effect 依赖换成 `[todo]`（对象每次更新都是新引用），点 A 切换完成状态，应看到"A 的 cleanup → A 的 effect"成对出现，顺序绝不颠倒。最后验证不泄漏：删掉全部待办后，控制台不再有任何 TodoItem 日志增量。

**D. localStorage 持久化——验证 M8.2 的依赖粒度。** 操作：添加两条待办 → 刷新页面 → 列表恢复。反向验证粒度：在输入框打字（触发 `setText`，组件重渲染，但 `todos` 未变）→ Network/Application 面板观察 localStorage 的 `mini-todos` 值不变，effect 没有执行（deps `[todos]` 命中缓存路径）。如果每次打字都写盘，说明依赖写成了 `undefined` 或漏了。

**E. 合成事件三件套——验证 M9.6。** 回车添加（keydown + `e.key`）、输入实时上屏（input + `e.value`）、点 x 不触发外层 toggle（stopPropagation）。三件事同时验一个系统：如果回车无效但点击有效，先查 `supportedEvents` 是否包含 `keydown`；如果 stopPropagation 失效，查 `dispatchSyntheticEvent` 的 `_propagationStopped` 检查是否写在了 handler 调用之后。

### 3.4 跑不通的地方 = 理解的盲区：症状 → 回炉映射表

| 症状 | 大概率的盲区 | 回炉 |
|---|---|---|
| 列表删除后内容串位 / 输入跟错行 | key 的身份语义、index 兜底的退化行为 | M5 |
| 一次点击渲染两次 / 中间态上屏 | 调度入口未统一、微任务收集窗口理解偏差 | M9.5 |
| effect 重复执行不清理 / 卸载后定时器还在跑 | cleanup 收集路径（deletions 子树遍历） | M8.3/8.4 |
| effect 读到旧值 | 闭包与依赖数组的配合 | M8.5 |
| hooks 顺序报错、状态错乱 | memoizedState 链表对齐、hookIndex 游标 | M7 |
| 事件处理器不触发 / 冒泡异常 | dom._fiber 维护、委托冒泡循环 | M9.6 |
| 抖一下才到正确位置 | 两个 effect 的时机差 | M10.1 |

---

## 4. 复刻之后：三条深化路径

复刻完成意味着你拥有一副"概念骨架"。接下来三条路径都是往骨架上"贴肉"，方向不同、互补不互斥：路径 A 回到 React 源码本身，把每个简化实现对号入座到工业实现；路径 B 读 Preact，看"同样的问题，3KB 预算下怎么答"；路径 C 写自定义渲染器，从"理解调和器"升级到"能驾驭调和器"。按兴趣三选一深入，其余两条做浅层涉猎即可。

### 路径 A：对照真实源码（1 周）

按此顺序读 `facebook/react` 的 packages：

1. `scheduler`：`MessageChannel` 调度、优先级队列（对应 M3）
2. `react-reconciler`：`ReactFiberWorkLoop.js`（workLoop/中断/恢复）、`ReactFiberBeginWork`/`CompleteWork`（对应 M3–M5）、`ReactFiberCommitWork`（commit 三子阶段：beforeMutation / mutation / layout，对应 M4）
3. `ReactFiberHooks.js`：真实 hooks 的 dispatcher 双表（mount/update 两套），对应 M7–M8
4. `react-dom-bindings` 的事件系统 `DOMPluginEventSystem`（对应 M9）

把这份顺序展开成源文件级的地图（这是本周的"寻宝图"，逐行读什么、看什么都写明了）：

| 源文件 | 对应里程碑 | 读什么、看什么 |
|---|---|---|
| `packages/scheduler/src/Scheduler.js` | M3 | `performWorkUntilDeadline` 里 `MessageChannel` 的 port 通信如何驱动每一帧的工作循环；`taskQueue`（小顶堆）如何按过期时间排序；`needsYield` 的 5ms 判断。对照你的 `workLoop` 的 `deadline.timeRemaining() < 1`——你写的是"还剩多久该让"，它写的是"已花多久该让"，语义同源 |
| `packages/scheduler/src/SchedulerMinHeap.js` | M3 | 小顶堆的 push/pop：优先级队列的具体数据结构。mini 版没有队列（单任务），这里补上"多任务如何排序"的想象 |
| `packages/react-reconciler/src/ReactFiberWorkLoop.js` | M3/M4 | `workLoopSync`（`while (workInProgress !== null)`——你的 while 循环的同步版）与 `workLoopConcurrent`（多了 `shouldYield()` 检查）；`prepareFreshStack` 如何重置 `workInProgress`（对照你重建 `wipRoot`）；`commitRootImpl` 里 beforeMutation → mutation → layout 三个子阶段的**顺序调用**就在一个函数里排着，往下翻还能看到 passive effects 的 `scheduleCallback` 调度 |
| `packages/react-reconciler/src/ReactFiberBeginWork.js` | M3–M6 | `beginWork` 按 `workInProgress.tag`（FunctionComponent/HostComponent/SuspenseComponent…）分派——你的 `performUnitOfWork` 的 if-else 是它的两分支版；它把 children 对比委托给 `ChildReconciler`，注意看 `reconcileChildren` 的调用点如何贯穿所有组件类型 |
| `packages/react-reconciler/src/ReactChildFiber.new.js` | M5 | `ChildReconciler` 里的 keyed 对比：`Map` 建映射、`placeChild` 决定复用还是新建、尾部剩余旧节点的删除——与你的 `reconcileChildren` 逐行对得上，但多了"移动检测"（lastPlacedIndex 单调性判断），这是你下一步可以给 mini 加的作业 |
| `packages/react-reconciler/src/ReactFiberCompleteWork.js` | M5 | `completeWork`：叶子回填阶段如何创建 DOM 实例（`createInstance`）、`bubbleProperties` 如何把子树的变化标记向根聚合（React 17 是 effectList 链、18 起改为 subtreeFlags 位标记——你收集 `deletions`/`effects` 数组的做法是它的雏形） |
| `packages/react-reconciler/src/ReactFiberCommitWork.js` | M4/M10 | `commitMutationEffectsOn`（mutation：真正动 DOM、删节点时递归调 destroy）与 `commitLayoutEffectsOn`（layout：同步调 `useLayoutEffect`/`componentDidMount`）两个函数，就是你的 `commitWork` + `flushLayoutEffects` 拆开的两个工业化版本 |
| `packages/react-reconciler/src/ReactFiberHooks.js` | M7/M8 | 开头两个 dispatcher 表 `HooksDispatcherOnMount` / `HooksDispatcherOnUpdate`——**同名 hook 两套实现**，render 前 `ReactCurrentDispatcher.current` 按新旧切换。你的"一套函数 + `getOldHook(hookIndex)` 对齐"与它语义等价：mount 版负责建链、update 版负责走链。重点读 `mountEffectImpl`/`updateEffectImpl` 与 `pushEffect`：effect 挂 hook 链、`fiber.updateQueue` 收集 effectList，与你 `wipRoot.effects` 数组一一对应 |
| `packages/react-dom-bindings/src/client/events/DOMPluginEventSystem.js` | M9 | `listenToAllSupportedEvents`（root 上一次性委托全部事件类型——你的 `ensureSyntheticEvents` 的完全体）、`createEventListenerWrapperWithPriority`（按事件离散/连续包不同优先级的 dispatch——连接 M10.3 的 lane）、`dispatchDiscreteEvent` 里事件处理器执行前后的优先级切换。看懂它，"React 为什么自己搞事件系统"的第三层（优先级入口）就补全了 |

阅读方法给两条实用的：第一，别顺着文件读，按上表"带着你写过的代码去找对应物"，每找到一个就在自己的 mini 版注释里标上源码文件名——一周下来你的 mini React 会变成一份活的源码索引。第二，用 debugger 验证而非纯目测：在 `commitRootImpl` 打断点跑一次 `setState`，调用栈从事件 dispatch 到 workLoop 到 commit 一路看下来，比读十遍代码都清楚。

- 中文向导：卡颂《React 技术揭秘》、7kms《图解 React 源码》

两个中文向导的用法不同。**卡颂《React 技术揭秘》**（在线免费，react.iamkasong.cn）按"架构篇 → 渲染流程 → 专项（State/hooks/并发）"组织，强项是把 workLoop、lane、Scheduler 三者的协作画成大图，适合在读 ReactFiberWorkLoop 卡住时当"地图"翻；**7kms《图解 React 源码》**（GitHub：7kms/react-illustration-series）每节配流程图与关键源码摘录，先图后码的顺序特别适合 Fiber 树结构与 commit 阶段这种"纯想象容易错"的主题。建议：整体流程看 7kms 的图，卡在调度优先级看卡颂的第 x 章（并发更新），两者交叉印证再回源码。

### 路径 B：精读 Preact 源码（从玩具到工业品）

- Preact：3KB 的 React 兼容实现——你的 mini 与真 React 之间的完美桥梁
- 重点：它的 diff（带 key 的 children 对比）、hooks 实现、和 React 的行为差异清单

Preact 的价值在于"体积预算逼出来的极简"：它保留了 React 的全部核心决策（vdom、diff、hooks、批处理），但每个机制都用最少代码表达——正好比 mini React 工业一级、比 React 源码可读十倍。精读入口与看什么：

| 文件 | 看什么 |
|---|---|
| `preact/src/core.js` | `render`/`diff` 主流程：buildDomFromVNode 一路走完"创建-对比-挂载"，相当于你的 performUnitOfWork+commitWork 压缩进一个函数；注意它没有 Fiber 双缓冲，用的是"新旧 vdom 直接对比 + 子树级 diff"，比较两种取舍 |
| `preact/src/diff/children.js` | keyed diff：`diffChildren` 用 Map 按 key 索引旧孩子、就地对位复用，多余的删除、缺少的新建——与你的 `reconcileChildren` 同构但处理了移动与占位（`placeChild` 逻辑），是你 mini 版 diff 的"下一版参考答案" |
| `preact/src/diff/index.js` | 单节点 diff：属性对比 `diffProps`（对照你的 `updateDom`）、事件绑定方式（直接 addEventListener，见下面差异表） |
| `preact/src/hooks/index.js` | hooks 全家桶不到 300 行：`getHookState(index)` 按**下标**取 hook（列表而非链表——与我们用 hookIndex 对齐链表的思想一致，数据结构更简单）；`useState` 的 setter 恒定引用 + `rerender` 触发重新 diff；`useEffect` 的依赖比较 `argsChanged` 与我们的 `hasDepsChanged` 几乎逐行相同 |

与 React 的行为差异清单（读源码时逐条找到对应实现）：

| 维度 | React | Preact | 差异的代价/收益 |
|---|---|---|---|
| 事件系统 | 合成事件 + root 委托 | 原生事件直接绑到节点 | Preact 省掉一整个子系统；代价是没有统一入口，批处理与优先级要另找挂点 |
| 批处理 | 微任务调度（automatic batching，M9.5 形态） | `options.debounceRendering` 钩子（默认以微任务方式合并多次 rerender） | 思路殊途同归：都是"同一轮同步代码里的多次更新合并成一次渲染" |
| hooks 存储 | `memoizedState` 链表 | 组件实例上的列表按下标取 | 列表更省内存也更易懂；链表为并发特性留了空间 |
| 架构 | Fiber 双缓冲 + 可中断 render | 同步渲染、无 workInProgress 树 | Preact 主线程一次跑完；React 换来时间切片与优先级 |
| 并发特性 | lanes、`useTransition`、Suspense 完整体系 | 无优先级模型，Suspense 提供核心行为 | "要不要并发"是体量与场景的取舍，不是对错 |
| ref | `forwardRef` 显式转发 | ref 可作为普通 prop 直接传 | Preact 砍掉了 forwardRef 这层仪式（新版 React 也开始用 ref as prop 的方向收敛） |

精读顺序建议两天走完：第一天 core.js + diff/（对照 M5），第二天 hooks/index.js（对照 M7–M8），最后半天把上表差异逐条在源码里定位到行。读完你会获得一个珍贵的能力：面对"React 为什么这么重"的讨论，你能精确指出哪些重量换来什么能力、哪些在 Preact 里被证明可以省掉。

### 路径 C：用官方 react-reconciler 写自定义渲染器（换一个方向证明你懂了）

- 用 `react-reconciler` 的 hostConfig 把 React 渲染到 **canvas / 终端 / 音乐序列**（官方有 react-three-fiber 这个成功先例）
- 写过自定义 renderer，"React 与渲染器分离"的架构就从知识变成经验

复刻时你也许隐约觉得：`createDom`/`updateDom`/`appendChild` 这些 DOM 操作和"React 本体"是可以解耦的——路径 C 就是把这个直觉变成实践。`react-reconciler` 把所有"平台相关"的操作抽成一个 hostConfig 对象，你实现它，React 就把组件树调和到你的目标平台。核心方法清单（按职责分组，实现一个最小渲染器通常只需要前四组）：

| 分组 | 方法 | 作用（对照 mini 版的位置） |
|---|---|---|
| 实例创建 | `createInstance(type, props)` / `createTextInstance(text)` | 造一个"平台节点"（你的 `createDom`） |
| 树组装 | `appendChild(parent, child)`、`insertBefore(parent, child, before)`、`removeChild(parent, child)`；容器版 `appendChildToContainer` / `removeChildFromContainer` / `insertInContainerBefore` | 挂/挪/摘节点（你的 `commitWork` 三分支） |
| 更新 | `prepareUpdate(instance, type, oldProps, newProps)`（返回变更载荷或 null）、`commitUpdate(instance, payload, ...)`、`commitTextUpdate(textInstance, oldText, newText)` | 对比与落盘 props（你的 `updateDom`，真实版把"算 diff"与"应用 diff"拆成两步以保持 commit 纯净） |
| 提交钩子 | `prepareForCommit(containerInfo)`、`resetAfterCommit(containerInfo)` | commit 前后的钩子——passive effect 调度、以及"整树画一帧"（canvas 渲染器的重绘点）都挂这里 |
| 上下文与杂项 | `getRootHostContext`、`getChildHostContext`、`shouldSetTextContent`、`clearContainer`、`supportsMutation: true`、`isPrimaryRenderer`、`scheduleTimeout` / `cancelTimeout` / `noTimeout` | 宿主上下文、能力声明（声明支持"变更"模式而非"持久化"模式）、定时器抽象 |

一个最小但完整的 canvas 渲染器骨架（配合宿主组件 `<box>` / `<label>`，把组件树画成色块与文字）：

```js
import Reconciler from 'react-reconciler'
import React from 'react'

// 宿主实例：不做真 DOM，只记"要画什么"，resetAfterCommit 时统一上屏
let hostConfig = {
  supportsMutation: true,
  isPrimaryRenderer: true,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  now: Date.now,
  getRootHostContext: () => null,
  getChildHostContext: (parentCtx) => parentCtx,
  shouldSetTextContent: () => false, // 文字一律走 createTextInstance（教学简化）
  clearContainer: () => {},
  prepareForCommit: () => null,
  resetAfterCommit: (container) => drawScene(container), // ★ commit 完成：整树重绘一次
  createInstance: (type, props) => ({ type, props, children: [] }),      // <box> / <label>
  createTextInstance: (text) => ({ type: 'TEXT', text: String(text) }), // 文本节点
  appendInitialChild: (parent, child) => parent.children.push(child),
  appendChild: (parent, child) => parent.children.push(child),
  appendChildToContainer: (container, child) => container.children.push(child),
  insertBefore: (parent, child, before) => {
    const i = parent.children.indexOf(before)
    parent.children.splice(i === -1 ? parent.children.length : i, 0, child)
  },
  removeChild: (parent, child) => {
    const i = parent.children.indexOf(child)
    if (i !== -1) parent.children.splice(i, 1)
  },
  removeChildFromContainer: (container, child) => {
    const i = container.children.indexOf(child)
    if (i !== -1) container.children.splice(i, 1)
  },
  prepareUpdate: () => true, // 简化：永远返回"有更新"（真实版做 props 逐项对比）
  commitUpdate: (instance, payload, type, oldProps, newProps) => { instance.props = newProps },
  commitTextUpdate: (instance, oldText, newText) => { instance.text = newText },
  finalizeInitialChildren: () => false,
}

function drawScene(container) {
  const ctx = container.canvas.getContext('2d')
  ctx.clearRect(0, 0, container.canvas.width, container.canvas.height)
  const walk = (nodes, offset) => {
    nodes.forEach((node) => {
      if (node.type === 'TEXT') {
        ctx.fillStyle = '#333'
        ctx.font = '13px sans-serif'
        ctx.fillText(node.text, offset.x + 4, offset.y + 16)
      } else {
        const p = node.props || {}
        ctx.fillStyle = p.color || '#ddd'
        ctx.fillRect(offset.x, offset.y, p.w || 60, p.h || 24)
        walk(node.children, { x: offset.x + 4, y: offset.y + 24 }) // 子元素画在父盒子下方
      }
    })
  }
  walk(container.children, { x: 8, y: 8 })
}

const reconciler = Reconciler(hostConfig)
// 胶水层：createContainer/updateContainer 的参数个数随 react-reconciler 版本变化，
// 以 node_modules/react-reconciler/README.md 的当前示例为准对齐（hostConfig 才是学习目标）
const canvas = document.createElement('canvas')
canvas.width = 400
canvas.height = 300
document.body.appendChild(canvas)
const container = reconciler.createContainer(
  { canvas, children: [] }, // containerInfo：整个 hostConfig 都会收到它
  0,                        // tag：0 = LegacyRoot（教学最稳）；1 = ConcurrentRoot
  false, false, false, '', () => {}
)
reconciler.updateContainer(
  React.createElement(() => (
    <box color="#bde0fe" w={200} h={120}>
      <label>hello, custom renderer</label>
      <box color="#ffc8dd" w={160} h={40} />
    </box>
  )),
  container,
  null,
  null
)
```

写完这个 90 行的渲染器，回头看 mini React 你会发现 `createDom`/`updateDom`/`commitWork` 的每一行都能在 hostConfig 的方法表里找到"官方问你的同一道题"。先例方面值得走访三个项目：**react-three-fiber**（把 hostConfig 实现为 three.js 对象的创建与属性设置——目前最成功的自定义渲染器，其 hostConfig 是最佳阅读材料）、**ink**（渲染到终端，用 Yoga 做布局，佐证"宿主甚至不需要视觉"）、**react-pdf**（渲染成 PDF 文档）。做完路径 C，"React 是 UI 库还是运行时"这个问题你会有自己的答案——它是调和运行时，DOM 只是它众多后端之一。

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

**参考答案（对照自测，每题都能在对应里程碑的代码里指出行号才算过关）：**

**1.** hooks 状态不存在组件局部变量里，而是串在 `fiber.memoizedState` 链表上，render 时靠 `hookIndex` 游标从旧树（alternate）的链头逐个对位取 `getOldHook(index)`。条件语句会让两次 render 的链长度或顺序不同，第 N 个 hook 对上"别人的"旧 hook——state 读到别人的值、effect 拿到别人的依赖，且不报错、只表现诡异。M7 的 `getOldHook` 那个 for 循环就是这条规则的物证。

**2.** 屏幕上的是 `currentRoot`，构造中的是 `wipRoot`，两棵树通过 `alternate` 互指。render 阶段只写 wip 树、绝不碰 DOM；中断时 current 完好、DOM 与 current 始终一致，浏览器画的永远是完整的旧树；整棵 wip 完成后 commit 阶段一次性、不可中断地切换。撕裂只能发生在"改了一半 DOM"时，而我们的 DOM 只在 commit 里动——M4 的 `commitRoot` 把这条铁律写在结构里。

**3.** 三个子阶段各司其职：beforeMutation 在动 DOM 前读最后一份快照（如 `getSnapshotBeforeUpdate`）；mutation 真正放置/更新/删除 DOM（此时新 DOM 就位但 effect 未跑）；layout 在 DOM 已确定后**同步**执行 `useLayoutEffect` 与 `componentDidMount`——所以 useLayoutEffect 在 layout 子阶段，能安全读布局且赶在 paint 前。拆三段是因为"读快照→改结构→读新结构"三类操作对 DOM 状态的要求不同，混在一起就无法保证各自看到的世界一致。M4 的"commit 不可中断"与 M10.1 的 `flushLayoutEffects` 对应第三段。

**4.** effect 可能耗时（请求、订阅、大计算），若在 commit 里同步执行会把 paint 一起拖住——用户先看到结果再付副作用的成本，才是更好的顺序。passive 的含义是"不在渲染主线上、可以被更高优先级的工作推迟"：它由调度器在 paint 之后择机冲刷（mini 版用微任务/宏任务模拟）。M8.3 的 `schedulePassiveEffects` 里那句"commit 全部完成后才安排执行"就是被动性的全部。

**5.** key 解决的是"跨渲染的身份"：children 对比时按 key 在旧 fiber 里找到"同一个"节点，从而复用它的 DOM 与 state——key 不是优化项，是复用的身份标识。index 作 key 删除中间项时，后续每项的 key 整体前移，对比结果变成"key=1 的内容从 B 更新成 C、key=2 删除"，于是所有后续项都被 UPDATE 串位、末项被删：受控输入跟错行、动画错乱。M5 的 `oldFiberMap` 与 §3.3A 的 `data-id` 实验是机制与复现两端。

**6.** 靠"统一调度入口 + 微任务收集窗口"：所有 setState 只把 action 入队并调用调度，调度器发现已排队（`isRenderScheduled` 标志）就直接返回；微任务在"当前宏任务同步代码全部结束后"才发起一次 render——同一事件里 N 个更新天然合并成一次。React 18 把这个入口从"事件系统进出口"移到微任务调度，于是任何来源（setTimeout、Promise）的更新都自动合并，是为 automatic。M9.5 的 `scheduleUpdateFromCurrentRoot` 是它的雏形。

**7.** 两个原因：一是**统一入口**——所有用户回调都从 `dispatchSyntheticEvent` 这一个门口进出，批处理的收集窗口、优先级的判定、（历史版本的）isBatchingUpdates 开关才有唯一的挂点；二是**跨浏览器统一**——把事件对象的差异（字段名、冒泡行为、表单细节）包进合成对象，组件代码只面向一套稳定接口。顺带的收益是 root 一处监听替代每节点监听、处理器永远从最新 props 现取。M9.6 的委托循环就是这三句话的代码化。

**8.** 原因：setState 是当次 render 环境里创建的函数，闭包捕获的 state 是那一次的值；组件重渲染后旧闭包不会更新，异步回调/连点场景里连续使用就踩旧值。解法一：函数式更新 `setState(prev => prev + 1)`——action 入队后在重放时执行，M7 的 action queue 保证它拿到的 `hook.state` 永远是队列消费至今的最新值。解法二：把依赖写进 useEffect 依赖数组（让新闭包被执行，M8.5）或用 ref 读最新值（M9.1）。按"要变化还是要最新值"选路。

**9.** setTimeout 有嵌套调用下的 4ms 最小间隔、且优先级低（浏览器可能延迟更多），高频调度下浪费帧；rAF 的节奏绑定垂直同步、后台标签页会被暂停，且它"每次 paint 前必跑"的语义不适合"空闲时跑"；requestIdleCallback 各浏览器实现不稳定、回调时机不可控。MessageChannel 的宏任务在渲染完成后尽快触发、无最小间隔、不受页面可见性影响——是"又快又稳的让出主线程"手段。M3 的 workLoop 讲了取舍，路径 A 的 Scheduler.js 是工业答案。

**10.** 函数组件在调和层**没有实例**：fiber 的 stateNode 为空、没有 dom，beginWork 靠执行 `fiber.type(props)` 得到 children，"更新"就是"重新执行函数"，状态全部外置在 memoizedState 的 hooks 链上。类组件有实例（stateNode 指向它），state 存实例上、更新走生命周期。这个差别是 hooks 存在的原因：函数每次重执行，状态必须有链表这样"活在组件之外"的家。M6 的 `updateFunctionComponent` 两个分支就是分水岭。

---

## 6. 与前五份文档的连接

- M5 的 diff/key → 基础大纲阶段 1 的"为什么不能用 index"，从使用规则升级为实现原理
- M7 闭包旧值 → 基础大纲阶段 2 的闭包陷阱专题，同源不同层
- M9 批处理 → 组件库 Toast 队列、长列表高频更新的理解底座
- M3 调度 → 全景图 E1 长任务分帧、`useTransition` 的心智模型
- M10 Suspense → 进阶大纲阶段 9 RSC/Suspense 的前置理解

逐行展开这五条连接，它们是六份文档的"接线图"：

**第一行（M5 ↔ 基础大纲阶段 1）**：基础大纲阶段 1 教的是使用规则——"列表渲染要给稳定 key、别用 index"；当时你只能背。复刻 M5 之后这条规则变成了可推导的定理：key 的本质是 children 对比时的**身份标识**，`oldFiberMap` 按 key 找到旧节点才能复用 DOM 与 state；index 作 key 时"删除中间项"会让后续项的 index 整体前移，diff 把它解读成"内容变了要 UPDATE"，于是串位与多余删除（§3.3A 的实验）。从"记住规则"到"能在自己代码里指出哪一行造就了这条规则"，是这两个文档之间最重要的一次认知升级。

**第二行（M7 ↔ 基础大纲阶段 2）**：基础大纲的闭包专题讲语言层——词法环境、函数对其创建环境的引用；M7/M8 讲框架层——函数组件每次 render 创建新环境，setState 与 useEffect 捕获的都是"那一次"的环境，于是有旧值陷阱与函数式更新的解法。同一个闭包原理，基础大纲问"JS 里闭包是什么"，本篇问"React 的渲染模型为什么会把闭包陷阱放大到日常必须处理"——同源（闭包）、不同层（语言机制 vs 渲染机制的交互）。两边对照着读，闭包这个知识点才算立体。

**第三行（M9 ↔ 组件库实战大纲）**：组件库里的两个高频难题其实都坐在批处理这块底座上。Toast 队列：业务代码在一瞬间连发多条 `push(toast)`，若没有批处理，每条都触发一次 render、队列动画会抖；有了"同一事件 N 次更新合并为一次"，一帧一弹的体验才成立。长列表高频更新：滚动/拖拽过程中每秒几十次 setState，批处理把每个事件循环里的多次更新压成一次 render，是"还能用"与"卡死"的区别。做了 M9.5 你再读组件库大纲里"合并状态、降频更新"的配方，能看出哪些是框架已代劳、哪些仍需自己动手。

**第四行（M3 ↔ 全景图 E1）**：全景图 E1 讲长任务分帧（把 100ms 的任务切成 5ms 片）与 `useTransition`。复刻 M3 之后这两者不再是玄学：workLoop 的 `while (nextUnitOfWork && !shouldYield)` 就是长任务分帧的机制原型——"干 5ms、让一让、接着干"；而 `useTransition` 的心智模型就是 M10.3 的 lane——把一次 setState 标进低优先级、允许被用户输入抢占。全景图给的是"什么时候用"，本篇给的是"里面到底发生了什么"，两页对着看。

**第五行（M10 ↔ 进阶大纲阶段 9）**：进阶大纲阶段 9 的 RSC/Suspense 讲"流式渲染：服务端先发骨架、算完的部分陆续补上"。它的交互协议内核就是 M10.2 你写过的那一套——未就绪的子树 throw promise、边界先渲染 fallback、就绪后重试填充。区别只在尺度：你的 promise 是一个动态 import，RSC 的 promise 是一台服务器上的渲染任务。亲手实现过简化版，"流式 SSR 怎么不闪""Suspense 边界怎么摆"这类问题就从背答案变成推机制。

## 7. 节奏总表（约 5 周）

| 周 | 内容 |
|---|---|
| 1 | M1–M4（element → render → Fiber → 两阶段提交） |
| 2 | M5–M7（diff/key、函数组件、useState）——最硬的一周 |
| 3 | M8–M9（useEffect、批处理、合成事件）+ 选修 M10 |
| 4 | 验收：mini React 版 TodoMVC + 行为对齐 |
| 5 | 三选一深化：真实源码 / Preact / 自定义 renderer |

逐行看这张表的安排逻辑：**第 1 周**是从"数据"到"结构"的四步——element（虚拟 DOM 的形状）、render（递归直渲，故意体验不可中断之痛）、Fiber（链表化 + 调度循环）、两阶段提交（render 与 commit 分离）——每周产出一个可运行版本，痛点驱动下一步设计。**第 2 周**最硬，因为 diff、函数组件、useState 三者互相咬合：diff 复用要靠 alternate，函数组件引出"状态存哪"，useState 又依赖链表对齐——啃下这周，后面的都是变奏。**第 3 周**的 M8/M9 是把"能跑"升级为"像样"：effect 补齐副作用模型，批处理与合成事件补齐调度与事件两大子系统，M10 选修按兴趣取用。**第 4 周**验收的意义在 §3 开头讲透了：不是再学新东西，而是让已有零件互相摩擦、暴露盲区。**第 5 周**三选一深化，对应 §4 的三条路径，方向不同但共同点都是"把 mini 的概念骨架对到工业实现上"。如果只能挤出更少时间，压缩第 5 周与 M10，前四周与 M8 是不可让渡的核心。

> 参考实现：pomber/didact（本路线的骨架来源，经典教程 "Build Your Own React"）；卡颂《React 技术揭秘》；7kms/react-illustration-series。

尾注的三个名字各取所需：pomber/didact（Rodrigo Pombo 的 didact 系列与 "Build Your Own React" 一文）是本路线 M1–M7 的骨架来源，我们的命名契约（`createElement`/`performUnitOfWork`/`commitRoot`…）即沿它而来，卡住时对照原仓库最直接；卡颂《React 技术揭秘》与 7kms《图解 React 源码》是走向路径 A 时的两份中文向导，用法见 §4 路径 A 的说明。至此，从 200 行的 `render` 到约 2000 行带 Fiber/Hooks/调和/事件/批处理的 mini React——每一个"React 为什么要这样设计"的问题，答案都在你亲手写下的代码里。
