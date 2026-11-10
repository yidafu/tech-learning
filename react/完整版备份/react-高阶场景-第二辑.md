# React 高阶场景第二辑：搭建器族 × SaaS 平台能力族

> 定位：第四份文档，覆盖你点名的 9 个场景（编号沿用你的清单，7 缺号跳过）。
> 结构：场景 1–6 是"搭建器/编辑器族"——内核已在《进阶大纲》打好，本章只写**增量深挖**；场景 3、8、9、10 是新场景，**全量展开**。
> 一条暗线：场景 3 的条件树、场景 4 的 schema 树，都是《进阶大纲》§1 **递归渲染器内核的第 N 次复用**——这个内核的复利远超预期。

## 目录

- [引言：开工之前，先看清这条暗线](#引言开工之前先看清这条暗线)
  - [0.1 暗线是什么：递归渲染器内核的第 N 次复用](#01-暗线是什么递归渲染器内核的第-n-次复用)
  - [0.2 增量篇与全量篇的读法差异](#02-增量篇与全量篇的读法差异)
- [1. 低代码页面搭建器 / 可视化大屏编辑器](#1-低代码页面搭建器--可视化大屏编辑器)
  - [1.1 分辨率适配（大屏第一坑）：设计稿 1920×1080 → 任意屏幕/投屏](#11-分辨率适配大屏第一坑设计稿-19201080--任意屏幕投屏)
  - [1.2 自由画布 vs 栅格：绝对定位、八向缩放 handle、对齐吸附线、网格与标尺](#12-自由画布-vs-栅格绝对定位八向缩放-handle对齐吸附线网格与标尺)
  - [1.3 图层面板：z-index 管理、锁定、隐藏（树形 + 拖拽调序）](#13-图层面板z-index-管理锁定隐藏树形--拖拽调序)
  - [1.4 数据映射配置：API 响应字段 → 组件 props](#14-数据映射配置api-响应字段--组件-props)
  - [1.5 定时轮播多页大屏、全屏模式、截图导出](#15-定时轮播多页大屏全屏模式截图导出)
  - [验收清单](#验收清单)
- [2. 工作流编排器 / 节点图编辑器](#2-工作流编排器--节点图编辑器)
  - [2.1 节点 DSL：`{ id, type, position, data, next }` 与 DAG 校验（保存前必验）](#21-节点-dsl-id-type-position-data-next--与-dag-校验保存前必验)
  - [2.2 自定义节点 = 节点内嵌表单（mini Setter 面板）、折叠/展开、状态徽标](#22-自定义节点--节点内嵌表单mini-setter-面板折叠展开状态徽标)
  - [2.3 连线校验：handle 类型约束、onConnect 校验、isValidConnection](#23-连线校验handle-类型约束onconnect-校验isvalidconnection)
  - [2.4 自动布局：dagre vs ELK；用户手动布局后锁定](#24-自动布局dagre-vs-elk用户手动布局后锁定)
  - [2.5 运行态性能：后端高频推送节点状态 → rAF 聚合批量 setNodes（重点）](#25-运行态性能后端高频推送节点状态--raf-聚合批量-setnodes重点)
  - [2.6 撤销重做、小地图、快捷键（Cmd+D 复制节点带偏移）](#26-撤销重做小地图快捷键cmdd-复制节点带偏移)
  - [2.7 DSL 语义升级：条件分支、并行网关、循环节点怎么表达](#27-dsl-语义升级条件分支并行网关循环节点怎么表达)
  - [对标：n8n（源码可读性好）、Dify、Langflow、bpmn.js（重量级 BPMN，按需）](#对标n8n源码可读性好difylangflowbpmnjs重量级-bpmn按需)
- [3. 动态查询构建器 / 规则引擎 UI ★全量展开](#3-动态查询构建器--规则引擎-ui-全量展开)
  - [3.0 画像展开：四类业务与共同抽象](#30-画像展开四类业务与共同抽象)
  - [核心技术](#核心技术)
  - [坑](#坑)
  - [与内核的复用关系：为什么它被列为 ★★★](#与内核的复用关系为什么它被列为-)
- [4. JSON Schema 编辑器 / 配置可视化编辑器](#4-json-schema-编辑器--配置可视化编辑器)
  - [实现路线](#实现路线)
  - [路线 1：树形 schema 编辑器 —— 递归渲染 + dnd-kit 树拖拽](#路线-1树形-schema-编辑器--递归渲染--dnd-kit-树拖拽)
  - [路线 2：元信息面板 —— 每个元字段一个 Setter](#路线-2元信息面板--每个元字段一个-setter)
  - [路线 3：双视图同步 —— 切换时机与光标 ↔ JSONPath 互跳](#路线-3双视图同步--切换时机与光标--jsonpath-互跳)
  - [路线 4：ajv 实时校验闭环](#路线-4ajv-实时校验闭环)
  - [路线 5：`$ref` / `definitions` —— 折叠展示与跳转链接](#路线-5ref--definitions--折叠展示与跳转链接)
  - [难点与坑（本章汇总）](#难点与坑本章汇总)
  - [✅ 产出：验收清单](#-产出验收清单)
  - [对标：jsonschema.net、Stoplight Studio](#对标jsonschemanetstoplight-studio)
- [5. 无限画布 / 白板工具](#5-无限画布--白板工具)
  - [实现路线](#实现路线-0)
  - [路线 1：视口模型 `{ x, y, zoom }` —— 鼠标锚点缩放的完整推导](#路线-1视口模型--x-y-zoom---鼠标锚点缩放的完整推导)
  - [路线 2：双坐标系与平移交互](#路线-2双坐标系与平移交互)
  - [路线 3：视口裁剪渲染 —— 四叉树 / R-tree 空间索引](#路线-3视口裁剪渲染--四叉树--r-tree-空间索引)
  - [路线 4：交互全家桶 —— 选中、handle 缩放旋转、框选、对齐吸附线](#路线-4交互全家桶--选中handle-缩放旋转框选对齐吸附线)
  - [路线 5：手绘笔迹 —— 采样、道格拉斯-普克简化、贝塞尔平滑、压感](#路线-5手绘笔迹--采样道格拉斯-普克简化贝塞尔平滑压感)
  - [路线 6：命令栈 undo/redo、快捷键、右键菜单、小地图](#路线-6命令栈-undoredo快捷键右键菜单小地图)
  - [路线 7：性能分层 —— 静态层 + 交互层，rAF 合并重绘](#路线-7性能分层--静态层--交互层raf-合并重绘)
  - [路线 8：导出 PNG/SVG 与 Yjs 协同接入点](#路线-8导出-pngsvg-与-yjs-协同接入点)
  - [难点与坑](#难点与坑)
  - [✅ 产出：验收清单](#-产出验收清单-0)
  - [对标：tldraw（源码质量极高，本场景首选精读）、Excalidraw、Konva](#对标tldraw源码质量极高本场景首选精读excalidrawkonva)
- [6. 富文本 / 块级编辑器（类 Notion）](#6-富文本--块级编辑器类-notion)
  - [实现路线](#实现路线-1)
  - [路线 1：块模型 —— Enter / Backspace / 跨块删除的行为规格](#路线-1块模型--enter--backspace--跨块删除的行为规格)
  - [路线 2：Markdown 速记 —— Input Rule](#路线-2markdown-速记--input-rule)
  - [路线 3：Slash 命令 —— floating-ui 定位 + 模糊搜索 + 纯键盘导航](#路线-3slash-命令--floating-ui-定位--模糊搜索--纯键盘导航)
  - [路线 4：块拖拽 —— ⠿ handle、放置目标高亮、嵌套缩进](#路线-4块拖拽---handle放置目标高亮嵌套缩进)
  - [路线 5：块悬浮工具栏 —— ⠿ + ＋ + 菜单](#路线-5块悬浮工具栏------菜单)
  - [路线 6：选区浮动工具栏 —— 选区坐标计算与滚动跟随](#路线-6选区浮动工具栏--选区坐标计算与滚动跟随)
  - [路线 7：NodeView —— 用 React 渲染块内部](#路线-7nodeview--用-react-渲染块内部)
  - [路线 8：无限嵌套列表与折叠块](#路线-8无限嵌套列表与折叠块)
  - [路线 9：协同 —— y-prosemirror 双人编辑 + 他人光标](#路线-9协同--y-prosemirror-双人编辑--他人光标)
  - [难点与坑](#难点与坑-0)
  - [✅ 产出：验收清单](#-产出验收清单-1)
  - [对标：TipTap 官方示例（逐个 demo 复刻）、Notion 交互逐条拆解](#对标tiptap-官方示例逐个-demo-复刻notion-交互逐条拆解)
- [Part B 总论：先把"共同模式"讲透，三章都只是它的实例](#part-b-总论先把共同模式讲透三章都只是它的实例)
  - [模式的三个词，逐个拆开](#模式的三个词逐个拆开)
  - [抽象的注入流程图](#抽象的注入流程图)
  - [抽象代码范式：任何一个"平台能力"都能套进这个模具](#抽象代码范式任何一个平台能力都能套进这个模具)
  - [三章实例化对照表](#三章实例化对照表)
- [8. 细粒度权限控制](#8-细粒度权限控制)
  - [实现路线](#实现路线-2)
  - [坑](#坑-0)
- [9. 多租户动态主题](#9-多租户动态主题)
  - [实现路线](#实现路线-3)
  - [坑](#坑-1)
- [10. 国际化与动态语言包](#10-国际化与动态语言包)
  - [实现路线](#实现路线-4)
  - [坑](#坑-2)
- [组合毕业项目：多租户 SaaS 控制台](#组合毕业项目多租户-saas-控制台)
  - [0. 分层定位：平台层与业务层在哪里分界](#0-分层定位平台层与业务层在哪里分界)
  - [1. 启动时序总览](#1-启动时序总览)
  - [2. 启动时序逐段详解](#2-启动时序逐段详解)
  - [3. 目录结构建议](#3-目录结构建议)
  - [4. 每一层的章节索引](#4-每一层的章节索引)
  - [5. 验收清单](#5-验收清单)
  - [6. 面试时如何把这套讲成一个架构故事](#6-面试时如何把这套讲成一个架构故事)
- [与前几份的关系与优先级](#与前几份的关系与优先级)

---


---

## 引言：开工之前，先看清这条暗线

前三份文档的关系一句话说清：《学习大纲》给了你 React 本身的地图；《进阶大纲》用五大场景（动态表单 → 表单设计器 → 仪表盘 → JSON 编辑器 → 低代码平台）逼你写出了一个**通用内核**；《全景图》把这个内核放到 23 个高阶场景里定位。本篇是第四份，做两件事：把搭建器/编辑器族里剩下的 6 个场景**增量补完**（场景 1、2、4、5、6），再把 SaaS 平台能力三件套**全量展开**（场景 8、9、10）。

### 0.1 暗线是什么：递归渲染器内核的第 N 次复用

先回顾内核本体。《进阶大纲》§1.2（组件注册表）+ §1.3（递归渲染器）的成果，浓缩成下面这不到 30 行的代码——**本篇一切"树形协议 → UI"的场景，源头都是它**：

```tsx
import type { ComponentType, ReactNode } from 'react';

/** 任何树形协议的节点：类型 + props + 可选 children */
export interface SchemaNode {
  id: string;                     // 稳定 id：diff/key/撤销补丁全部依赖它
  type: string;                   // 物料类型，注册表的 key
  props: Record<string, unknown>; // 物料 props（场景 1 的数据映射就注入在这里）
  children?: SchemaNode[];        // 容器类物料才有，递归的来源
}

/** 物料组件统一签名：拿到自己的节点协议与子节点插槽 */
export interface WidgetProps {
  node: SchemaNode;
  children?: ReactNode;
}

/** §1.2 注册表：type → 组件 的映射，物料的唯一登记处 */
export const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  /* input: InputWidget, grid: GridWidget, kpi: KpiWidget, ... */
};

/** §1.3 内核本体：一个递归组件，吃任何符合 SchemaNode 协议的树 */
export function SchemaRenderer({ node }: { node: SchemaNode }) {
  const Widget = widgetRegistry[node.type];
  if (!Widget) return null; // 未注册物料：不渲染也不抛错（脏数据防线）
  return (
    <Widget node={node}>
      {node.children?.map(child => (
        // key 用 nodeId 绝不用数组 index——增删节点时状态错乱的根源（§1.3 铁律）
        <SchemaRenderer key={child.id} node={child} />
      ))}
    </Widget>
  );
}
```

它为什么值得反复复用？因为这个组件解决的是一类问题的**不动点**：只要你的业务数据满足三个条件——(1) 可序列化的树或图；(2) 渲染规则是"按 type 分发到组件"；(3) 声明式（协议里不含可执行代码，逻辑走 §1.4 的表达式引擎）——那么"协议 → UI"这一层就**永远不需要重写**，你写的只是新的注册表映射和新的交互外壳。

本篇 9 个场景与这个内核的复用关系，一张图看全：

```text
《进阶大纲》§1 通用底座
  ├── §1.2 组件注册表 ────────── widgetRegistry（type → 组件 的唯一登记处）
  ├── §1.3 递归渲染器 ────────── SchemaRenderer（内核本体）
  ├── §1.5 Undo/Redo ─────────── 命令栈/immer patches（场景 1、2 直接搬）
  ├── §1.6 拖拽原理 ──────────── dnd-kit（场景 1 图层调序、场景 4 字段排序复用）
  └── §3 Setter 体系 ─────────── 属性面板"字段声明 + 值编辑器"
        │
        ├── 第 1 次复用：§2 Schema 动态表单      schema → 表单控件树
        ├── 第 2 次复用：§3 表单设计器           画布 = 渲染器 + 选中/拖拽壳，右侧 = Setter
        ├── 第 3 次复用：§4 拖拽仪表盘           dashboard schema → 图表卡片布局
        ├── 第 4 次复用：§6 低代码平台           页面 schema → 组件树（含容器嵌套）
        │
        └── 本篇 = 第 N 次复用（9 个场景逐个对号）
              ├── 场景 1 大屏/低代码搭建器  页面 schema 照搬 §6；数据映射把接口数据注入 props；
              │                           图层面板 = 同一棵组件树的第二个视图
              ├── 场景 2 工作流编排器       节点 data 的编辑 = Setter；DSL 仍是"注册表 + 类型分发"
              │                           思想在图数据结构上的投影
              ├── 场景 3 条件树 ★全量      combinator/conditions 递归 → QueryGroup 嵌套 QueryGroup，
              │                           全新场景但零新内核——暗线的最佳例证
              ├── 场景 4 schema 树 ★全量   编辑的"对象"本身就是递归结构：用 schema 描述 schema（元编程）
              ├── 场景 5 无限画布/白板      不复用：视口数学/双坐标系是独立内核
              ├── 场景 6 富文本/块编辑器    不复用递归渲染器：ProseMirror 文档模型自带渲染体系
              ├── 场景 8 细粒度权限         声明式配置 + 渲染时统一过滤（Provider 模式的变体）
              ├── 场景 9 多租户主题         主题编辑器 = 给租户运营做的 Setter 表单，Setter 又登场
              └── 场景 10 动态 i18n         schema 的 label 存 i18n key，渲染器统一翻译（协议加一维）
```

注意图里两个"不复用"的场景并非失败案例：**判断"能不能复用"本身就是架构能力**。场景 5 的难点在几何与视口（连续数学），场景 6 的难点在文档模型与选区（ProseMirror 内核），它们的输入不是"声明式树形协议"，硬套递归渲染器只会两边都别扭。给你一个三问判断法，以后遇到任何新场景先过一遍：

1. 数据是不是**可序列化的树/图**？（能存 JSON、能 diff、能撤销）
2. 渲染是不是**按类型分发**？（type → 组件的映射稳定存在）
3. 协议是不是**纯声明**？（不含 `eval`，逻辑走表达式或独立引擎）

三个都 yes——写一份新的 registry 映射，复用 `SchemaRenderer` 与整套编辑器外壳；任何一个 no——老老实实为它找独立内核（本篇的场景 5、6 就是这么处理的）。

### 0.2 增量篇与全量篇的读法差异

本篇两类内容深度刻意不同，读法也不同：

- **增量篇（场景 1、2、4、5、6）**：假设你已做完《进阶大纲》对应章节。基本概念（注册表、Setter、拖拽、undo）不再重复教学，直接写"这一场景在上一个场景之上**多出来的那部分**"——所以你会看到大量"与 §x 的差异点"式表述。没做过前置场景也能读，但收获会打折。
- **全量篇（场景 3、8、9、10）**：从零讲起，协议、实现路线、坑完整给出，是本篇的"正文"。

两个场景（1 和 2）虽是增量篇，但增量幅度大到大屏/工作流几乎自成一个子领域，本篇给它们的篇幅并不"增量化"——它们是 Part A 的主角。

---

# Part A：搭建器族（增量篇）

Part A 收拢五类编辑器：大屏（场景 1）、工作流（场景 2）、查询构建器（场景 3）、schema 编辑器（场景 4）、白板（场景 5）、块级编辑器（场景 6）。它们共享一批"编辑器公因子"——选中态、拖拽、撤销重做、快捷键、网格吸附——这些公因子在《进阶大纲》§3 表单设计器里第一次集体亮相，本篇不再重教，只在新场景引入新公因子时展开（比如场景 2 的连线校验、场景 5 的视口模型）。

---

## 1. 低代码页面搭建器 / 可视化大屏编辑器

**基础**：《进阶大纲》§6（低代码平台）+ §4（拖拽大盘）。本章写**大屏编辑器特有增量**：

1. **分辨率适配（大屏第一坑）**：设计稿 1920×1080 → 任意屏幕/投屏。三方案对比：
   - 整体 `transform: scale()`：等比缩放，两侧留白，实现最快
   - vw/vh 单位：填满但大屏组件会拉伸变形
   - rem + postcss-pxtorem：折中
   - 注意 canvas 图表需监听容器尺寸重绘（ResizeObserver）
2. **自由画布 vs 栅格**：大屏组件是绝对定位（x/y/w/h/rotation），八向缩放 handle、对齐吸附线、网格与标尺
3. 图层面板：z-index 管理、锁定、隐藏（树形 + 拖拽调序）
4. **数据映射配置**：API 响应字段 → 组件 props 的映射规则（映射编辑器本质又是 Setter）；多组件共享一份数据源（数据转发/广播）
5. 定时轮播多页大屏、全屏模式、截图导出（html2canvas 的坑：跨域图片、字体渲染）

✅ 产出：在《进阶大纲》§4 的 dashboard 上叠加自由布局 + 分辨率适配 + 图层管理。

先把"大屏编辑器"和《进阶大纲》§4 的拖拽仪表盘做个切割，免得做重：§4 的 dashboard 是**栅格 + 流式布局**（组件按 12 栅格排队，容器变宽组件跟着重排），面向 PC 中后台；大屏编辑器是**自由画布 + 绝对定位**（每个组件有 x/y/w/h，像素级摆放），面向会议室投屏/指挥中心电视墙。两者共享"物料 + Setter + schema"三件套，差在画布模型与适配策略——这正是本章增量所在。

### 1.1 分辨率适配（大屏第一坑）：设计稿 1920×1080 → 任意屏幕/投屏

**是什么**：设计师按 1920×1080 出稿，开发者按设计稿坐标摆好每个组件；而最终运行环境可能是 2K/4K 显示器、超宽拼接屏、投影仪——分辨率与宽高比都不可控。适配方案要回答"整屏内容如何映射到任意视口"。

**为什么需要**：大屏是"给墙上看的"不是"给手上用的"。一台 1080p 投影和一面 3840×1600 拼接墙之间，如果不适配，要么内容只占左上角一小块，要么溢出被裁掉。大屏项目验收时第一个被演示的就是"换块屏看看"——所以它是"第一坑"：不解决，后面全部白做。

**三方案对比总表**（先给结论，再逐个展开）：

| 维度 | transform: scale 整体缩放 | vw/vh 视口单位 | rem + postcss-pxtorem |
|---|---|---|---|
| 还原度 | 等比 100% 还原，两侧/上下留白 | 填满视口，但两轴缩放比不同会变形 | 宽度方向等比，高度方向可滚动/流式 |
| 实现成本 | 一个容器组件 + 一个 hook | 样式全量改写为 vw/vh | 构建配置 + 运行时根字号 |
| 组件要求 | 零要求（px 写死即可） | 组件内部尺寸也要跟 vw 联动 | 样式走构建期 px→rem 转换 |
| canvas 图表 | 需注意缩放模糊 | echarts 内部 px 不跟随，要手动换算 | 同 vw，需 rem→px 换算注入 |
| 适用 | 指挥中心大屏、像素级还原 | 组件本身响应式的中后台 dashboard | 折中：要求铺满又不能明显变形 |

#### 方案一：整体 transform: scale()（等比缩放，两侧留白，实现最快）

**机制分步**：

1. 视口宽高分别除以设计稿宽高，得到两个缩放比 `scaleX`、`scaleY`；
2. 取**较小者**作为统一缩放比（等比的关键：保证内容完整可见，代价是另一维留白）；
3. 用较小比换算内容实际占用的宽/高，与视口的差值除以 2，得到居中偏移；
4. 容器按设计稿尺寸渲染，再 `translate(offset) scale(r)`，`transform-origin: left top`；
5. 监听 `window.resize`，任何一步变化都重算。

完整 hook 代码：

```tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react';

/** 缩放计算结果：scale 为缩放比，offsetX/Y 为居中留白量（屏幕像素） */
interface ScaleMeta {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 大屏等比缩放适配器：设计稿尺寸 → 当前视口的缩放比与居中偏移。
 * 策略：宽高两个缩放比取小者（等比），另一维居中留白。
 */
export function useScaleAdapter(designWidth = 1920, designHeight = 1080): ScaleMeta {
  const calc = useCallback((): ScaleMeta => {
    const scaleX = window.innerWidth / designWidth;
    const scaleY = window.innerHeight / designHeight;
    const scale = Math.min(scaleX, scaleY); // 等比：以更"挤"的那一维为准
    return {
      scale,
      // 内容实际尺寸 = 设计稿尺寸 × scale；与视口的差值一半即居中留白
      offsetX: (window.innerWidth - designWidth * scale) / 2,
      offsetY: (window.innerHeight - designHeight * scale) / 2,
    };
  }, [designWidth, designHeight]);

  const [meta, setMeta] = useState<ScaleMeta>(calc); // 初始值直接用首次计算结果，避免首帧闪烁

  useEffect(() => {
    const onResize = () => setMeta(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [calc]);

  return meta;
}

/** 缩放容器：大屏应用的根组件，内部一切按设计稿 px 摆放 */
export function ScreenContainer({
  designWidth = 1920,
  designHeight = 1080,
  children,
}: {
  designWidth?: number;
  designHeight?: number;
  children: ReactNode;
}) {
  const { scale, offsetX, offsetY } = useScaleAdapter(designWidth, designHeight);
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#05060a' }}>
      <div
        style={{
          width: designWidth, // 内部永远按设计稿尺寸布局
          height: designHeight,
          // transform 从右往左执行：先以左上角为原点缩放，再平移到居中留白后的位置
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: 'left top',
          background: '#0b1c3c',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

**常见坑（scale 方案）**：

- **症状**：echarts 文字与线条发虚。**根因**：canvas 先按设计稿 px 光栅化，再被 GPU 非整数倍缩放（如 0.667），插值采样丢失锐度。**修法**：初始化图表时把容器尺寸设为 `设计稿尺寸 × scale`、`devicePixelRatio` 传 `window.devicePixelRatio × scale`，让 canvas 物理像素与屏幕 1:1，再用反除补偿内部字号；或业务上接受轻微模糊（指挥中心观看距离远，多数可接受）。
- **症状**：弹窗/下拉菜单位置错乱，`position: fixed` 元素不跟随。**根因**：`transform` 会创建新的 containing block，其内的 `fixed` 元素改为相对该容器定位，且 portal 弹层挂在 body 上不受缩放，两套坐标系不一致。**修法**：弹层 portal 挂到缩放容器内部的专用节点；或对弹层单独按 scale 反算坐标。
- **症状**：点击命中偏移。**根因**：自研的画布交互若用 `getBoundingClientRect()` 换算坐标，读到的是缩放后的屏幕尺寸，而组件坐标是设计稿坐标。**修法**：所有屏幕坐标 → 画布坐标一律 `除以 scale`，封装成唯一的换算函数，禁止散落手算。

#### 方案二：vw/vh 视口单位（填满但会变形）

**机制**：样式尺寸不用 px，改用视口百分比单位——`1vw = 视口宽的 1%`。设计稿 1920 宽下，一个 480px 的卡片写成 `25vw`，在任何屏幕上都占视口宽的四分之一，天然"铺满"：

```text
/* 设计稿 1920×1080：480px 卡片 = 25vw；324px 高 = 30vh（CSS） */
.kpi-card {
  width: 25vw;
  height: 30vh;
  font-size: 1.2vw; /* 字号也跟视口宽走，避免与图形比例失衡 */
}
```

**变形的根因**：宽、高分别绑定 `vw`、`vh`，而 `scaleX = 视口宽/1920` 与 `scaleY = 视口高/1080` 通常不相等（如 2560×1080 的带鱼屏：scaleX≈1.33、scaleY=1.0）。任何"等比图形"——圆、图标、echarts 饼图、带边框的卡片——都会被两轴不同比例拉扯成椭圆/压扁。字号若用 px 写死，还会出现"容器变大字没变大"的失衡。

**适用边界**：组件本身响应式（内部布局流式、图形可拉伸）、不追求像素级还原的**中后台 dashboard**——正好就是《进阶大纲》§4 那类栅格仪表盘的场景。纯大屏慎用；要用，则必须把 echarts 的 `fontSize`、`grid` 边距等内部 px 一并按 vw 换算注入（`px2vw(12) => (12 / 1920) * 100 + 'vw'`），成本反而高于方案一。

**常见坑**：**症状**：换了超宽屏后饼图变椭圆、头像变胖。**根因**：两轴缩放比不等。**修法**：要么改用方案一保等比，要么对该组件局部改用单轴单位（只跟 vw）+ 高度自适应内容。

#### 方案三：rem + postcss-pxtorem（折中）

**机制**：构建期把样式里的 px 编译成 rem，运行时让根字号 `html { font-size }` 随视口宽度变化——于是"一切走 rem 的尺寸"都与视口宽等比。折中在于：**只有宽度方向严格等比**，高度方向内容可流式伸展（超出滚动或留白），兼顾了"铺满宽度"与"不明显变形"。

构建配置（postcss）：

```text
// postcss.config.cjs（CommonJS 版；ESM 工程写 export default）
module.exports = {
  plugins: {
    // 打包时把样式里的 px 编译为 rem
    'postcss-pxtorem': {
      rootValue: 192, // 1rem = 192px（设计稿 1920 / 10 列），与下方运行时基准对齐
      unitPrecision: 5, // rem 保留 5 位小数，减少转换精度误差
      propList: ['*'], // 转换所有 CSS 属性
      selectorBlackList: ['.no-rem'], // 例外类名（如需要固定 px 的边框装饰）
      replace: true, // 直接替换而非追加
      mediaQuery: false, // 媒体查询里的 px 不转换
      minPixelValue: 2, // 小于 2px 不转，保住 1px 边框
    },
  },
};
```

运行时的另一半——根字号跟随视口宽（少了这一步，构建配置只是空转）：

```ts
/**
 * rem 方案运行时基准：根字号 = 视口宽 / columns。
 * 与 postcss-pxtorem 的 rootValue 严格对应：1920 视口下 1rem = 192px。
 */
export function setupRemBaseline(designWidth = 1920, columns = 10): () => void {
  const apply = () => {
    document.documentElement.style.fontSize = `${window.innerWidth / columns}px`;
  };
  apply();
  window.addEventListener('resize', apply);
  // 返回清理函数，微前端/多次初始化场景下防重复监听
  return () => window.removeEventListener('resize', apply);
}
```

**常见坑**：**症状**：echarts 图表尺寸、字号完全不跟屏变。**根因**：postcss 只转换 CSS 里的 px，JS 里传给 echarts 的配置（`fontSize: 12`、`grid: { top: 40 }`）不经过构建管线。**修法**：封装 `rem(px) => px * (window.innerWidth / designWidth)` 换算函数，所有 JS 侧尺寸入参一律过它；或维护一份设计 token 的 rem 版本（场景 9 的 token mirror 是同一思想）。

#### canvas 图表的 ResizeObserver 重绘要点

**为什么 window.resize 不够**：大屏里图表容器的尺寸除了随视口变，还随**容器自身**变——缩放方案的 scale 变化、面板折叠、Tab 切换、自由画布里用户拖拽改了组件 w/h。`window.resize` 只覆盖第一种。`ResizeObserver` 监听的是元素自身 content box，三种全覆盖。

完整可用的 echarts 封装 hook：

```tsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

/**
 * echarts 实例生命周期 + 尺寸自适应：
 * 1. 挂载时 init；2. option 变化时 setOption；3. 容器尺寸变化时 resize 重绘；4. 卸载时 dispose。
 */
export function useEchart(option: EChartsOption) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;

    // 关键：监听"容器"而不是 window——自由画布里拖拽改宽高也要触发重绘
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);

    return () => {
      observer.disconnect(); // 先断开观察再销毁实例，避免销毁后回调踩空
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option);
  }, [option]);

  return containerRef;
}
```

**常见坑**：**症状**：控制台报 `ResizeObserver loop completed with undelivered notifications`。**根因**：resize 回调里同步改了容器尺寸（如设 height），触发下一轮观察，形成循环。**修法**：`chart.resize()` 只重绘画布不写布局，一般安全；自绘 canvas 若需改尺寸，用 `requestAnimationFrame` 包一层延后一帧。

### 1.2 自由画布 vs 栅格：绝对定位、八向缩放 handle、对齐吸附线、网格与标尺

**是什么**：两种画布模型。栅格（§4 已做）：组件占格子，容器决定位置；自由画布：每个组件自带几何 `{x, y, w, h, rotation}`，画布只提供坐标系与参考物（网格、标尺、吸附线）。Figma/PPT/大屏编辑器都是自由画布。

**为什么需要**：大屏的设计稿是像素级摆放的——KPI 卡片压着地图边缘、装饰线条斜穿画面，栅格模型表达不了；且指挥中心大屏组件数量少（一屏 10–30 个）、位置语义强（"左上角永远是核心指标"），绝对定位反而最简单可靠。

**元素几何模型**：

```ts
/** 画布坐标系下的矩形：所有交互计算的输入 */
interface ScreenRect {
  x: number; // 左上角 x
  y: number; // 左上角 y
  w: number;
  h: number;
}

/** 大屏组件完整模型：矩形 + 编辑器状态 + 物料配置 */
interface ScreenComponent extends ScreenRect {
  id: string;
  type: string; // 物料类型，注册表 key（暗线：与 SchemaNode 同构）
  rotation: number; // 旋转角（度），顺时针
  locked: boolean; // 锁定：画布上不可选中/拖动，图层面板可解锁
  hidden: boolean; // 隐藏：编辑态不渲染，运行态按配置决定
  props: Record<string, unknown>; // 物料 props，数据映射的注入点（1.4）
}

/** 一页大屏的 schema：自由画布是"扁平数组 + 数组顺序即层级"，不是嵌套树 */
interface ScreenSchema {
  id: string;
  version: 1;
  components: ScreenComponent[];
}
```

注意与大屏渲染的关系：渲染时不需要递归（扁平数组直接 `map`），但组件本身仍走注册表分发——暗线在"注册表 + 类型分发"这一层依然成立，只是这棵"树"退化成了深度为 1 的森林。

#### 八向缩放 handle：pointer 事件 + 反向拖拽计算

**机制分步**：

1. 选中组件后，在四角与四边中点渲染 8 个小方块 handle，每个 handle 用 `sx/sy` 标记自己控制哪条边（-1 起始边 / 1 结束边 / 0 不影响该轴）；
2. `pointerdown` 时记录"起始矩形 + 起始指针坐标"，并对 handle 元素 `setPointerCapture`——之后指针移出 handle、甚至移出窗口，事件仍派发到它，拖拽不丢；
3. `pointermove` 时算出指针位移 `(dx, dy)`，按 handle 方向换算新矩形。**反向拖拽计算**是核心：拖"西/北"把手时，固定的是**对侧边**——`x` 跟指针走而 `w = 起始宽 - dx`，与拖"东/南"把手（`x` 不动、`w = 起始宽 + dx`）方向相反；
4. 钳制最小尺寸，防止拖穿成负宽高；
5. `pointerup` 结束，写回正式状态（一次 undo 快照）。

```tsx
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/** 八个方向的把手：sx/sy 表示控制哪条边（-1 起始边 / 1 结束边 / 0 该轴不影响） */
const HANDLES = [
  { key: 'nw', cursor: 'nwse-resize', sx: -1, sy: -1 },
  { key: 'n', cursor: 'ns-resize', sx: 0, sy: -1 },
  { key: 'ne', cursor: 'nesw-resize', sx: 1, sy: -1 },
  { key: 'e', cursor: 'ew-resize', sx: 1, sy: 0 },
  { key: 'se', cursor: 'nwse-resize', sx: 1, sy: 1 },
  { key: 's', cursor: 'ns-resize', sx: 0, sy: 1 },
  { key: 'sw', cursor: 'nesw-resize', sx: -1, sy: 1 },
  { key: 'w', cursor: 'ew-resize', sx: -1, sy: 0 },
] as const;

const MIN_SIZE = 20; // 最小尺寸：拖穿的防线

/**
 * 指针位移 → 新矩形。核心是"反向拖拽计算"：
 * 西/北把手拖动时对侧边固定，x/y 与 w/h 反向联动——dx 向右为正时，西把手的宽度在减少。
 */
export function applyResize(
  start: ScreenRect,
  sx: number,
  sy: number,
  dx: number,
  dy: number,
): ScreenRect {
  let { x, y, w, h } = start;
  if (sx === -1) {
    x = start.x + dx; // 西把手：左边界跟随指针
    w = start.w - dx; // 宽度 = 固定的右边界 − 新左边界
  } else if (sx === 1) {
    w = start.w + dx; // 东把手：右边界跟随指针，左边界不动
  }
  if (sy === -1) {
    y = start.y + dy;
    h = start.h - dy;
  } else if (sy === 1) {
    h = start.h + dy;
  }
  // 防拖穿：宽/高小于最小值时，把对应边界钳回最小尺寸
  if (w < MIN_SIZE) {
    if (sx === -1) x = start.x + start.w - MIN_SIZE;
    w = MIN_SIZE;
  }
  if (h < MIN_SIZE) {
    if (sy === -1) y = start.y + start.h - MIN_SIZE;
    h = MIN_SIZE;
  }
  return { x, y, w, h };
}

/** 选中框 + 八向把手：包在物料外层的交互壳（与物料渲染解耦） */
export function ResizeFrame({
  rect,
  selected,
  onChange,
  children,
}: {
  rect: ScreenRect;
  selected: boolean;
  onChange: (next: ScreenRect) => void;
  children: ReactNode;
}) {
  const dragRef = useRef<{
    startRect: ScreenRect;
    startX: number;
    startY: number;
    sx: number;
    sy: number;
  } | null>(null);

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>, sx: number, sy: number) => {
    e.stopPropagation(); // 不冒泡给画布的"点空白取消选中"逻辑
    e.currentTarget.setPointerCapture(e.pointerId); // 指针捕获：移出把手也不丢事件
    dragRef.current = { startRect: rect, startX: e.clientX, startY: e.clientY, sx, sy };
  };

  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    onChange(
      applyResize(
        drag.startRect,
        drag.sx,
        drag.sy,
        e.clientX - drag.startX, // 位移量基于"按下时刻"，而非上一次 move——避免误差累积
        e.clientY - drag.startY,
      ),
    );
  };

  const onHandleUp = () => {
    dragRef.current = null;
  };

  return (
    <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      {children}
      {selected &&
        HANDLES.map(h => (
          <div
            key={h.key}
            onPointerDown={e => onHandleDown(e, h.sx, h.sy)}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              background: '#fff',
              border: '1px solid #1677ff',
              borderRadius: 2,
              cursor: h.cursor,
              // 按把手语义摆位：-1 起始边 / 1 结束边 / 0 居中
              left: h.sx === -1 ? -5 : h.sx === 1 ? rect.w - 5 : rect.w / 2 - 5,
              top: h.sy === -1 ? -5 : h.sy === 1 ? rect.h - 5 : rect.h / 2 - 5,
            }}
          />
        ))}
    </div>
  );
}
```

**带旋转角的进阶处理**：组件有 `rotation` 时，屏幕坐标系的 `(dx, dy)` 不能直接喂给 `applyResize`——要先把位移向量**反旋到元素本地坐标系**（元素顺时针转了 θ 度，就把指针位移按 −θ 旋转）：

```ts
/** 屏幕位移 → 元素本地位移（元素自身旋转了 rotationDeg 度） */
export function toLocalDelta(dx: number, dy: number, rotationDeg: number) {
  const rad = (-rotationDeg * Math.PI) / 180; // 屏幕坐标系 y 轴向下，顺时针为正，故取负角
  return {
    dx: dx * Math.cos(rad) - dy * Math.sin(rad),
    dy: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}
// 用法：
// const local = toLocalDelta(e.clientX - drag.startX, e.clientY - drag.startY, rotation);
// applyResize(drag.startRect, drag.sx, drag.sy, local.dx, local.dy);
```

同时"旋转后的 x/y 增量"也要做同样的反向补偿，因为视觉上把手指向的边在本地系里。旋转 + 缩放联合交互是自由画布里最绕的一块，建议实现顺序：先做纯平移拖拽 → 无旋转的八向缩放 → 旋转（单独的旋转 handle，绕中心点）→ 最后才把两者复合。

#### 对齐吸附线：算法逐层拆开

**是什么**：拖动组件时，与兄弟元素的边缘/中心线距离小于阈值（如 6px）就"吸附"过去，同时显示一条贯穿画布的红色参考线。Figma/PPT 的"对齐感"就是它。

**为什么需要**：绝对定位模型下，人眼摆放永远差几个像素——两个 KPI 卡"看起来对齐了"，放大后发现差 3px。吸附线把"目测对齐"变成"数学对齐"，是大屏编辑器从玩具到工具的分水岭。

**机制分步（按本节深度校准展开）**：

1. **候选线生成**：每个兄弟元素贡献 6 条线——竖直 3 条（左边缘、水平中心线、右边缘）+ 水平 3 条（上边缘、垂直中心线、下边缘）；
2. **移动中线**：被拖元素同样有 6 条线随指针移动；
3. **距离求解**：拖动的每一帧，被拖元素的每条竖线与所有候选竖线求差（水平线同理），在阈值内取**绝对差最小**的一条作为该轴的吸附目标；
4. **拖动量修正**：吸附不是改指针，而是改组件位置——`修正后 x = 原始 x + (候选线位置 − 移动线位置)`，让组件"跳"到对齐处；
5. **参考线渲染**：命中时把该候选线画成贯穿画布的 1px 线（只在编辑态、只在拖动中存在）；
6. **销毁**：`pointerup` 清空参考线集合。

核心代码：

```ts
/** 一条参考线：v 为竖直线（有 x 坐标），h 为水平线（有 y 坐标） */
interface Guide {
  axis: 'v' | 'h';
  offset: number; // 线的坐标：v 线用 x，h 线用 y
}

const SNAP_THRESHOLD = 6; // 吸附阈值（画布坐标 px），Figma 同量级

/** 一个元素贡献 6 条候选线：左/中/右 + 上/中/下 */
function guidesOfRect(rect: ScreenRect): Guide[] {
  return [
    { axis: 'v', offset: rect.x },
    { axis: 'v', offset: rect.x + rect.w / 2 },
    { axis: 'v', offset: rect.x + rect.w },
    { axis: 'h', offset: rect.y },
    { axis: 'h', offset: rect.y + rect.h / 2 },
    { axis: 'h', offset: rect.y + rect.h },
  ];
}

/** 单轴吸附求解：在阈值内找绝对差最小的候选线，返回修正量与命中的线 */
function snapAxis(
  movingLines: number[],
  candidates: Guide[],
  axis: 'v' | 'h',
): { delta: number; guide: Guide } | null {
  let best: { delta: number; guide: Guide } | null = null;
  for (const line of movingLines) {
    for (const candidate of candidates) {
      if (candidate.axis !== axis) continue;
      const delta = candidate.offset - line; // 正 = 组件需要向正向修正
      if (Math.abs(delta) > SNAP_THRESHOLD) continue;
      if (best === null || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, guide: candidate }; // 保留差值最小者：多个候选都在阈值内时选最近的
      }
    }
  }
  return best;
}

/**
 * 吸附主入口：moving 是"未吸附的原始位置"（跟随指针），siblings 不含被拖元素。
 * 返回修正后的矩形 + 应当高亮的参考线（渲染层用）。
 */
export function resolveSnap(
  moving: ScreenRect,
  siblings: ScreenRect[],
): { snapped: ScreenRect; guides: Guide[] } {
  const candidates = siblings.flatMap(guidesOfRect); // 步骤 1：收集全部候选线
  const guides: Guide[] = [];

  // 竖直方向：被拖元素的 3 条竖线 vs 候选竖线
  const v = snapAxis(
    [moving.x, moving.x + moving.w / 2, moving.x + moving.w],
    candidates,
    'v',
  );
  // 水平方向同理
  const h = snapAxis(
    [moving.y, moving.y + moving.h / 2, moving.y + moving.h],
    candidates,
    'h',
  );

  // 步骤 4：吸附修正——不动指针，改组件坐标
  const snapped: ScreenRect = {
    ...moving,
    x: v ? moving.x + v.delta : moving.x,
    y: h ? moving.y + h.delta : moving.y,
  };
  if (v) guides.push(v.guide); // 步骤 5：命中的线进入渲染集合
  if (h) guides.push(h.guide);
  return { snapped, guides };
}
```

与拖拽的集成 + 参考线渲染与销毁：

```tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * 带吸附的组件拖拽：
 * - 拖动中只更新"草稿态"（本地 state），pointerup 才写回正式 schema——保证 undo 粒度是"一次拖拽"而非每一帧；
 * - guides 随拖动实时增删，pointerup 清空（参考线只在拖动中存在）。
 */
export function useDragWithSnap(
  components: ScreenComponent[],
  commit: (next: ScreenComponent) => void, // pointerup 时写回正式状态（外部负责 push undo 快照）
) {
  const [guides, setGuides] = useState<Guide[]>([]); // 步骤 5/6：参考线的渲染与销毁
  const [draft, setDraft] = useState<ScreenComponent | null>(null); // 草稿层：拖动中的临时几何
  const dragRef = useRef<{ startX: number; startY: number; origin: ScreenComponent } | null>(null);

  const onPointerDown = (e: ReactPointerEvent, comp: ScreenComponent) => {
    if (comp.locked) return; // 锁定组件不可拖（1.3 的锁定语义）
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: comp };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // 原始位置：跟随指针，未吸附
    const raw: ScreenRect = {
      x: drag.origin.x + (e.clientX - drag.startX),
      y: drag.origin.y + (e.clientY - drag.startY),
      w: drag.origin.w,
      h: drag.origin.h,
    };
    const siblings = components.filter(c => c.id !== drag.origin.id); // 兄弟元素 = 同画布其余元素
    const { snapped, guides: hit } = resolveSnap(raw, siblings);
    setGuides(hit); // 命中时显示，未命中时自然清空
    setDraft({ ...drag.origin, ...snapped }); // 草稿 = 原组件 + 吸附修正后的几何
  };

  const onPointerUp = () => {
    if (dragRef.current && draft) commit(draft); // 写回正式状态
    setDraft(null); // 清空草稿层
    setGuides([]); // 步骤 6：拖动结束销毁全部参考线
    dragRef.current = null;
  };

  return { guides, draft, onPointerDown, onPointerMove, onPointerUp };
}
// 画布渲染层：const shown = draft ?? components.find(c => c.id === selectedId)，
// 即"拖动中画草稿几何，结束后画正式几何"，两者无缝衔接、只差一次 commit。

/** 参考线渲染层：贯穿画布的 1px 线，pointer-events 穿透，绝不挡交互 */
function GuideLayer({ guides, canvasW, canvasH }: { guides: Guide[]; canvasW: number; canvasH: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {guides.map((g, i) =>
        g.axis === 'v' ? (
          <div
            key={`${g.axis}-${g.offset}-${i}`}
            style={{ position: 'absolute', left: g.offset, top: 0, width: 1, height: canvasH, background: '#f5222d' }}
          />
        ) : (
          <div
            key={`${g.axis}-${g.offset}-${i}`}
            style={{ position: 'absolute', top: g.offset, left: 0, height: 1, width: canvasW, background: '#f5222d' }}
          />
        ),
      )}
    </div>
  );
}
```

说明两点工程决策：其一，`resolveSnap` 在拖动的**每个 pointermove** 上跑一遍，代价是 O(6 × 6 × n)；大屏一页组件数 10–30，完全无压力，上千元素才需要排序 + 二分或空间索引（那是场景 5 白板的课题）；其二，吸附命中后的"手感"取决于阈值——6px 是 Figma 量级，投屏编辑场景可放大到 8–10px。

**常见坑**：

- **症状**：吸附"抖动"——组件在两个位置间来回跳。**根因**：吸附修正把组件挪到了阈值边缘，下一帧指针反向移动 1px 又脱离吸附，状态来回翻转。**修法**：引入磁滞（hysteresis）——进入吸附用 6px 阈值，保持吸附用 10px 阈值，或在一次拖拽内锁定首个命中目标。
- **症状**：参考线时隐时现。**根因**：guides 存在子组件局部 state，React 批处理下时序错乱；或每帧创建新数组引发子树重渲染。**修法**：guides 提升到画布单一 state，`GuideLayer` 用 `memo` 包裹（props 只有数组引用与画布尺寸）。
- **症状**：拖动结束组件弹回原位。**根因**：吸附修正只改了草稿，`pointerup` 时 commit 的是原始 rect。**修法**：commit 必须取草稿层的最终值（上面代码中 `readDraft` 的意义）。

#### 网格与标尺

**网格**：给"手感对齐"提供背景参照，纯 CSS 即可（不开吸附时也有视觉引导）：

```text
/* 20px 网格：两条 1px 渐变线平铺（CSS） */
.screen-canvas {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

**网格吸附**：若要"位置永远落在网格倍数上"，在 `resolveSnap` 之前先做一次取整：`x = Math.round(raw.x / GRID) * GRID`——注意网格吸附与对齐吸附的优先级（对齐吸附优先，命中对齐就跳过网格取整）。

**标尺**：画布上边缘与左边缘的刻度条，编辑态帮助定位。实现是"按步长生成刻度数组再渲染"，大屏画布尺寸有限（设计稿尺寸），无需虚拟化：

```tsx
/** 横轴标尺：每 step 画一格刻度并标数值；纵轴同构（换成 top/left） */
function RulerX({ width, step = 100 }: { width: number; step?: number }) {
  const ticks: number[] = [];
  for (let x = 0; x <= width; x += step) ticks.push(x);
  return (
    <div style={{ position: 'relative', height: 20, borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>
      {ticks.map(x => (
        <div key={x} style={{ position: 'absolute', left: x, top: 0, bottom: 0, borderLeft: '1px solid #d9d9d9' }}>
          <span style={{ fontSize: 10, color: '#8c8c8c', marginLeft: 2 }}>{x}</span>
        </div>
      ))}
    </div>
  );
}
```

**常见坑**：**症状**：标尺与组件位置对不上。**根因**：标尺渲染在缩放容器外（屏幕坐标），组件在容器内（设计稿坐标）。**修法**：编辑器画布不做整体 scale（编辑态 1:1 + 可缩放视口），标尺与画布同坐标系；投屏运行态才用 1.1 的 ScreenContainer。

### 1.3 图层面板：z-index 管理、锁定、隐藏（树形 + 拖拽调序）

**是什么**：编辑器右/左侧的组件列表——PS 图层板的前端版：显示每页全部组件（名称 + 类型图标 + 锁定/隐藏开关），支持点选、拖拽调序（改层级）、重命名。

**为什么需要**：大屏组件互相叠加（装饰线条压在图表上、背景图垫底），画布上被盖住的组件点不到；图层面板是**第二选择入口**，也是层级顺序的唯一可视化工具。

#### z-index 管理策略：数组顺序即层级

三条路线对比后选第三条：

1. 每个组件存显式 `zIndex` 数字——要维护"插入时取 max+1"、调序时重排数字，两处状态（数组顺序与 zIndex 值）可能不一致，是经典 bug 源；
2. 渲染时 `zIndex = 数组 index`——可行但把"层级"与"渲染顺序"耦合在 DOM 属性上，编辑器高亮层、参考线层还要来抢 z-index 空间；
3. **数组顺序即层级**（推荐）：`components` 数组从先到后渲染，后者自然覆盖前者（CSS 同 positioned 上下文中后出现的 DOM 在上）。置顶 = 移到数组末尾，置底 = 移到头部。层级信息零冗余，undo/redo 也天然正确（数组快照自动携带层级）。

操作函数（全部返回新数组，配合不可变状态）：

```ts
/** 图层置顶：数组末尾 = 最上层（渲染顺序即覆盖顺序） */
export function bringToFront<T extends { id: string }>(items: T[], id: string): T[] {
  const index = items.findIndex(item => item.id === id);
  if (index === -1 || index === items.length - 1) return items; // 已在最顶层：返回原引用，避免无谓重渲染
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.push(moved);
  return next;
}

/** 图层置底：数组头部 = 最底层 */
export function sendToBack<T extends { id: string }>(items: T[], id: string): T[] {
  const index = items.findIndex(item => item.id === id);
  if (index <= 0) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.unshift(moved);
  return next;
}

/** 上移/下移一层：与相邻元素交换位置 */
export function moveOneStep<T extends { id: string }>(items: T[], id: string, step: 1 | -1): T[] {
  const index = items.findIndex(item => item.id === id);
  const target = index + step;
  if (index === -1 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
```

#### 锁定与隐藏

锁定（`locked: true`）：画布上不可点选、不可拖拽缩放（`onPointerDown` 直接 return，见 1.2 的 `useDragWithSnap`），但图层面板仍可选中编辑 props、可解锁——锁的是**画布交互**不是**编辑能力**。隐藏（`hidden: true`）：编辑态画布不渲染（或半透明幽灵渲染），运行态是否渲染由"编辑器隐藏 ≠ 投屏隐藏"的产品语义决定（多数产品把 hidden 仅作编辑辅助，投屏仍渲染——需要"投屏也隐藏"时另加 `visibleOnScreen` 字段，两个维度分开）。

#### 树形 + 拖拽调序：与大纲树复用

大屏是扁平数组（深度 1），但低代码页面（§6）是嵌套树——图层面板做成树形后两个场景共用。树形面板 = 递归渲染（暗线第 N+1 次复用）+ dnd-kit 排序（§1.6）。dnd-kit 部分与 §1.6/§3 的大纲树完全同构，这里只给扁平情形的完整实现（树形在此之上加 `children` 递归与"拖入分组"的碰撞策略，思路一样）：

```tsx
import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** 单行图层：名称 + 隐藏/锁定开关 + 拖拽把手 */
function LayerRow({
  comp,
  onToggleHidden,
  onToggleLocked,
}: {
  comp: ScreenComponent;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comp.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        background: isDragging ? '#e6f4ff' : undefined,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {/* 拖拽把手：只绑在把手上，行内按钮（锁定/隐藏）不触发拖拽——§1.6 的启动区域隔离 */}
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#8c8c8c' }}>⠿</span>
      <span style={{ flex: 1, opacity: comp.hidden ? 0.4 : 1 }}>{comp.type}（{comp.id}）</span>
      <button onClick={() => onToggleHidden(comp.id)}>{comp.hidden ? '显示' : '隐藏'}</button>
      <button onClick={() => onToggleLocked(comp.id)}>{comp.locked ? '解锁' : '锁定'}</button>
    </div>
  );
}

/** 图层面板本体：拖拽调序 = 直接改 components 数组顺序 = 改层级（1.3 的策略落地） */
export function LayerPanel({
  components,
  onReorder,
  onToggleHidden,
  onToggleLocked,
}: {
  components: ScreenComponent[];
  onReorder: (next: ScreenComponent[]) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), // 移动 4px 才算拖拽，避免误杀点击
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }), // 键盘拖拽（无障碍）
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // 排序场景：最近的交换目标
      onDragStart={e => setActiveId(e.active.id)}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;
        const from = components.findIndex(c => c.id === active.id);
        const to = components.findIndex(c => c.id === over.id);
        onReorder(arrayMove(components, from, to)); // 数组顺序 = 层级，调序即改层级
      }}
    >
      {/* 图层面板惯例：顶层在上，与画布覆盖顺序一致，故 reverse 展示 */}
      <SortableContext items={[...components].reverse().map(c => c.id)} strategy={verticalListSortingStrategy}>
        {[...components].reverse().map(comp => (
          <LayerRow key={comp.id} comp={comp} onToggleHidden={onToggleHidden} onToggleLocked={onToggleLocked} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

**常见坑**：

- **症状**：图层调序后画布层级不变。**根因**：画布渲染用了显式 `zIndex`（旧字段残留），与数组顺序双轨制打架。**修法**：删除 zIndex 字段做数据迁移，渲染层不再写 z-index（编辑器 chrome——选中框、参考线——用独立的兄弟层承载，见 GuideLayer 的 `zIndex: 9999` 写在画布坐标系之外）。
- **症状**：锁定组件还是能被框选。**根因**：框选按几何求交，没查 `locked`。**修法**：框选命中集合里过滤 `locked || hidden`。
- **症状**：图层面板顺序与画布相反，用户懵。**根因**：设计工具惯例是"顶层在列表最上方"，数组末尾（最上层）应显示在列表顶部。**修法**：展示时 reverse（上面代码），数据存储仍按渲染顺序。

### 1.4 数据映射配置：API 响应字段 → 组件 props

**是什么**：大屏组件不自己发请求。编辑器里配置"数据源"，再把数据源的**响应字段路径**映射到组件的 **props 名**；运行态由渲染器统一拉数、按映射注入。这是"静态原型"与"活的大屏"的分界线。

**为什么需要**：组件与数据解耦后，同一个 KPI 物料既能接"今日 GMV"也能接"在线人数"——物料只认 `props.value`，不关心数据从哪来。数据源变更（换接口、改轮询频率）不触碰组件；多组件共享一份数据只拉一次。这与《进阶大纲》§6 低代码数据绑定的思想同源，大屏侧把它简化成"单层映射 + 轮询"。

#### 映射规则协议设计（TS 类型 + JSON 示例）

```ts
/** 数据源配置：一个大屏页可配多个；kind 决定拉取方式 */
interface DataSourceConfig {
  id: string; // 数据源 id，绑定引用它
  kind: 'api' | 'static' | 'websocket'; // 静态 JSON / 轮询 API / 长连接推送
  url: string;
  method: 'GET' | 'POST';
  interval?: number; // 轮询间隔（ms），仅 kind=api；缺省不轮询
  body?: Record<string, unknown>; // POST 请求体模板
}

/** 单条字段映射：响应里的哪个路径 → 组件的哪个 prop */
interface FieldMapping {
  source: string; // 响应字段路径，如 "data.list.0.amount"（点分，数字为下标）
  target: string; // 组件 prop 名，如 "value"
  transform?: 'number' | 'percent'; // 轻量变换：数字化 / 格式化为百分比字符串
}

/** 一个组件与一个数据源的绑定关系 */
interface Binding {
  sourceId: string; // 引用 DataSourceConfig.id
  mappings: FieldMapping[];
}

/** 数据配置整体：挂在 ScreenSchema 上 */
interface DataBindingSchema {
  sources: DataSourceConfig[];
  bindings: Record<string, Binding>; // key = 组件 id
}
```

对应的 JSON（可直接当测试样例）：

```json
{
  "sources": [
    {
      "id": "ds-order-stats",
      "kind": "api",
      "url": "https://api.example.com/stats/orders",
      "method": "GET",
      "interval": 30000
    }
  ],
  "bindings": {
    "kpi-gmv": {
      "sourceId": "ds-order-stats",
      "mappings": [
        { "source": "data.today.amount", "target": "value", "transform": "number" },
        { "source": "data.today.delta", "target": "trend", "transform": "percent" }
      ]
    },
    "chart-week": {
      "sourceId": "ds-order-stats",
      "mappings": [{ "source": "data.weekly.series", "target": "series" }]
    }
  }
}
```

注意 `kpi-gmv` 与 `chart-week` 指向**同一个** `sourceId`——这就是多组件共享数据源在协议层的表达，运行态只发一次请求（下文广播机制）。

协议的三个执行函数：

```ts
/** 按点分路径取值：getByPath(res, 'data.list.0.amount')；支持数字下标，缺路返回 undefined */
export function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined; // 中途撞上原始值：路径越界
  }, source);
}

/** 变换器：目前两个够用，后续按需扩（格式化日期等），注意保持纯函数 */
function applyTransform(raw: unknown, transform: FieldMapping['transform']): unknown {
  if (raw === undefined || raw === null) return raw;
  switch (transform) {
    case 'number':
      return Number(raw);
    case 'percent': {
      const num = Number(raw);
      return Number.isFinite(num) ? `${(num * 100).toFixed(2)}%` : raw;
    }
    case undefined:
      return raw;
  }
}

/** 一组映射 → 一个 props 对象（渲染器注入组件前的最后一站） */
export function applyMappings(data: unknown, mappings: FieldMapping[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const mapping of mappings) {
    const raw = getByPath(data, mapping.source);
    props[mapping.target] = applyTransform(raw, mapping.transform);
  }
  return props;
}
```

#### 映射编辑器 = Setter 的论证

把这个编辑器拆开看：它要产出的是 `FieldMapping.source`（一个字段路径字符串）。按《进阶大纲》§3 的 Setter 定义——"给定字段元信息 `{ label, valueType, options }`，渲染对应的值编辑器"——逐项对号：

- 被编辑的字段：目标 prop 的映射（元信息来自物料 Setter 声明：`{ target: 'value', label: '数值', valueType: 'dataPath' }`）；
- 值编辑器类型：`dataPathSetter`——一个"从响应字段树里选路径"的专用编辑器，UI 形态是树形选择器（Cascader/TreeSelect），options 是**响应样例推导出的字段树**；
- 其余（transform 下拉）就是一个普通 `selectSetter`。

结论：所谓"数据映射编辑器"，就是给 Setter 体系**新增一种值编辑器类型**（`dataPathSetter`），协议上 `mappings[].source` 的值由它产出。这与《进阶大纲》§3 的论断一致——属性面板的一切扩展点最终都收敛为"新的 Setter 类型"。字段树推导函数：

```ts
/** 从 API 响应样例推导字段树：映射编辑器（dataPathSetter）的 options 来源 */
interface FieldNode {
  path: string; // 完整路径
  label: string; // 显示名（字段 key）
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: FieldNode[];
}

function typeOf(v: unknown): FieldNode['type'] {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  return typeof v as 'string' | 'number' | 'boolean';
}

export function inferFieldTree(value: unknown, path = '', depth = 0, maxDepth = 5): FieldNode[] {
  if (depth >= maxDepth) return []; // 深度截断：防超深结构与循环引用拖垮编辑器
  if (Array.isArray(value)) {
    const first = value[0];
    return first === undefined ? [] : inferFieldTree(first, `${path}0`, depth + 1, maxDepth); // 数组只采样首元素
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([key, v]) => {
      const childPath = path ? `${path}.${key}` : key;
      return {
        path: childPath,
        label: key,
        type: typeOf(v),
        children: v !== null && typeof v === 'object' ? inferFieldTree(v, childPath, depth + 1, maxDepth) : undefined,
      };
    });
  }
  return [];
}
```

#### 多组件共享数据源：数据转发/广播的实现思路

**问题**：5 个组件绑同一数据源，若各自订阅各自拉取，一次轮询变 5 次请求（接口压力、数据不一致——先后返回的瞬间同屏数字对不上）。**方案**：数据源管理器做**单点拉取 + 广播**——每个数据源至多一个活动请求/定时器，数据到达后 fan-out 给全部订阅组件。组件侧只订阅，不关心拉取。

```ts
type Listener = (data: unknown) => void;

/** 数据源管理器：单例。拉取唯一化 + 订阅广播 + 轮询生命周期 */
export class DataSourceManager {
  private data = new Map<string, unknown>(); // 最近一份数据（新订阅者立即回放）
  private listeners = new Map<string, Set<Listener>>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  subscribe(sourceId: string, listener: Listener): () => void {
    if (!this.listeners.has(sourceId)) this.listeners.set(sourceId, new Set());
    this.listeners.get(sourceId)!.add(listener);
    const cached = this.data.get(sourceId);
    if (cached !== undefined) listener(cached); // 首次订阅立即回放缓存，组件不闪空态
    return () => {
      this.listeners.get(sourceId)?.delete(listener); // 返回退订函数，useEffect 清理直接用
    };
  }

  /** 拉取一次并广播给该源的全部订阅者（数据转发：一次请求，多方分发） */
  async refresh(source: DataSourceConfig): Promise<void> {
    const res = await fetch(source.url, {
      method: source.method,
      headers: { 'Content-Type': 'application/json' },
      body: source.method === 'POST' ? JSON.stringify(source.body ?? {}) : undefined,
    });
    const json = await res.json();
    this.data.set(source.id, json);
    for (const listener of this.listeners.get(source.id) ?? []) listener(json);
  }

  /** 启动轮询：同 id 重复启动先清旧定时器（幂等） */
  start(source: DataSourceConfig): void {
    this.stop(source.id);
    void this.refresh(source); // 启动立刻拉一次，不等第一个 interval
    if (source.kind === 'api' && source.interval && source.interval > 0) {
      this.timers.set(source.id, setInterval(() => void this.refresh(source), source.interval));
    }
  }

  stop(sourceId: string): void {
    const timer = this.timers.get(sourceId);
    if (timer) clearInterval(timer);
    this.timers.delete(sourceId);
  }
}

export const dataSourceManager = new DataSourceManager();
```

React 侧的订阅 hook 与组件注入（运行态渲染器的一段）：

```tsx
import { useEffect, useMemo, useState } from 'react';
import { dataSourceManager } from './DataSourceManager';

/** 订阅一个数据源：挂载即订阅，卸载即退订，收到广播即更新 */
export function useDataSource(sourceId: string): unknown {
  const [data, setData] = useState<unknown>(() => undefined);
  useEffect(() => {
    return dataSourceManager.subscribe(sourceId, next => setData(next));
  }, [sourceId]);
  return data;
}

/** KPI 物料（运行态）：数据映射的终点——props 注入后当普通组件用 */
interface KpiProps {
  title?: string;
  value?: number;
  trend?: string;
}

function KpiWidget({ title = '—', value = 0, trend = '' }: KpiProps) {
  return (
    <div style={{ padding: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
      <div style={{ color: '#8c8c8c', fontSize: 14 }}>{title}</div>
      <div style={{ color: '#fff', fontSize: 42, fontWeight: 700 }}>{value}</div>
      <div style={{ color: trend.startsWith('-') ? '#ff4d4f' : '#52c41a', fontSize: 14 }}>{trend}</div>
    </div>
  );
}

/** 运行态包装：绑定 → 订阅 → 注入。编辑器里这个包装不生效（编辑态吃 mock 数据） */
export function BoundKpi({ binding }: { binding: Binding }) {
  const raw = useDataSource(binding.sourceId);
  const props = useMemo(
    () => (raw === undefined ? {} : applyMappings(raw, binding.mappings)),
    [raw, binding],
  );
  return <KpiWidget {...(props as KpiProps)} />;
}
```

websocket 型数据源同理——把 `refresh` 换成"建立连接，`onmessage` 写缓存并广播"，协议里 `kind: 'websocket'` 已预留。

**常见坑**：

- **症状**：换了数据源接口路径，全部 KPI 显示"—"。**根因**：映射的 `source` 路径悬空（接口响应结构调整），`getByPath` 返回 undefined。**修法**：编辑器保存时用 `inferFieldTree` 校验每条 mapping 的 source 是否存在于当前样例，悬空的标红警示（与场景 3"元数据删除字段后规则悬空"同款问题、同款解法）。
- **症状**：多组件数字"此起彼伏"不同步。**根因**：各组件各自拉取，返回时刻不同。**修法**：就是本节的广播机制——同源只有一份数据、一次更新、同时 fan-out。
- **症状**：轮询接口限流报 429。**根因**：多页大屏同屏轮询多个源、且 interval 配置过短。**修法**：编辑器对 interval 做下限校验（如 ≥10s）；能推不要轮（websocket）。

### 1.5 定时轮播多页大屏、全屏模式、截图导出

#### 定时轮播多页大屏

**是什么**：一个大屏应用包含多页 schema，按配置的停留时长自动切页——指挥中心"一屏看不完就轮着播"的标准玩法。

**机制**：页面数组 + 当前页 index + `setInterval`；用**函数式 setState** 避免闭包里的过期 index；切页即换 schema，整棵渲染树按页重建（`key` 用页 id，避免两页物料组件状态串台）。

```tsx
import { useEffect, useState, type ReactNode } from 'react';

interface CarouselScreenProps {
  pages: ScreenSchema[]; // 多页 schema
  duration?: number; // 每页停留毫秒，默认 15s
  /** 页渲染器：实际项目里 = SchemaRenderer + 数据绑定注入（1.4）*/
  renderPage: (schema: ScreenSchema) => ReactNode;
}

export function CarouselScreen({ pages, duration = 15000, renderPage }: CarouselScreenProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (pages.length <= 1) return; // 单页不需要轮播
    const timer = window.setInterval(() => {
      setIndex(i => (i + 1) % pages.length); // 函数式更新：不吃闭包里的旧 index
    }, duration);
    return () => window.clearInterval(timer);
  }, [pages.length, duration]);

  const page = pages[Math.min(index, pages.length - 1)];
  // key 用页 id：切页时整树重建，物料内部 state（echarts 动画等）不跨页残留
  return <div key={page.id}>{renderPage(page)}</div>;
}
```

**常见坑**：**症状**：轮播与数据轮询"打架"——切页瞬间数字闪烁归零。**根因**：切页卸载了订阅组件，`DataSourceManager` 若跟随停轮询、翻回来又冷启动。**修法**：轮询生命周期挂在大屏应用级（进入运行态 `start` 全部源，退出才 `stop`），与页码无关；组件只订阅。

#### 全屏模式

**是什么**：Fullscreen API——把指定 DOM 元素升为全屏（投屏大屏必配，浏览器地址栏/任务栏全部退场）。

**机制**：`element.requestFullscreen()` 进入（必须在**用户手势**里调用，否则被浏览器拒绝）；`document.exitFullscreen()` 退出；`fullscreenchange` 事件同步状态。三个注意点：`requestFullscreen` 返回 Promise（失败要 catch）；`document.fullscreenElement` 判当前态；Safari 老版本前缀 API 已基本退场，标准 API 够用。

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

export function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async () => {
    if (!document.fullscreenElement && ref.current) {
      try {
        await ref.current.requestFullscreen(); // 必须在点击等用户手势调用栈内
      } catch (err) {
        console.error('进入全屏失败', err); // 常见：iframe 未授权 / 非手势调用
      }
    }
  }, []);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    void (document.fullscreenElement ? exit() : enter());
  }, [enter, exit]);

  return { ref, isFullscreen, enter, exit, toggle }; // ref 挂到要全屏的容器上
}
```

**常见坑**：**症状**：全屏后大屏没重新适配，四周黑边或溢出。**根因**：全屏改变了视口尺寸，但 scale 方案的 `resize` 监听已覆盖——真正漏适配的往往是 vw/vh 方案下 echarts（JS 侧尺寸不跟随）。**修法**：全屏切换后手动触发一次全部图表 `resize()`（`fullscreenchange` 里调）。

#### html2canvas 截图导出

**是什么**：把大屏 DOM 栅格化为 canvas 再下载 PNG——"报表快照/汇报留档"功能。它**不是**浏览器原生截图，而是自己解析 DOM、逐层重绘到 canvas——两个著名大坑都源于这个实现方式。

```tsx
import html2canvas from 'html2canvas';

export async function exportDashboard(el: HTMLElement, filename = 'dashboard.png'): Promise<void> {
  // 坑 2 的第一道保险：等 web font 全部加载完成再截，否则用 fallback 字体绘制
  await document.fonts.ready;

  const canvas = await html2canvas(el, {
    useCORS: true, // 坑 1：图片请求带 CORS 凭证语义（要求图片响应头允许跨域）
    allowTaint: false, // 拒绝"污染画布"：跨域且无 CORS 的图片直接报错，而不是产出无法导出的画布
    backgroundColor: '#0b1c3c',
    scale: window.devicePixelRatio || 2, // 按设备像素比放大栅格化，避免高分屏导出发虚
    logging: false,
  });

  const url = canvas.toDataURL('image/png'); // 若画布已被污染，这一步抛 SecurityError
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

**坑 1：跨域图片。症状**：导出的 PNG 里图片区域空白，或控制台 `SecurityError: Failed to execute 'toDataURL'`。**根因**：canvas 的安全模型——画布里绘制了**跨域且未授权**的图片后画布被"污染"（tainted），任何导出操作被浏览器禁止；html2canvas 重绘时图片请求若不带 CORS 头，就会污染。**修法**：(a) 图片服务器返回 `Access-Control-Allow-Origin`，html2canvas 配 `useCORS: true`（让 img 以 CORS 模式加载）；(b) 无法改图片服务器的，走后端代理把图片转成同域/base64 再喂给页面；(c) `allowTaint: true` 只是"允许继续画"，导出照样失败，不要误用。

**坑 2：字体渲染。症状**：导出图里文字不是设计稿字体（变成宋体/默认无衬线）、图标字体变成方块。**根因**：html2canvas 自绘文本时读的是 `document.fonts` 里**当时**的字体；若 web font 异步还没加载完就截（尤其首次访问、字体文件大、CDN 慢），它拿 fallback 字体绘制。另外 iconfont 的 SVG 雪碧图在克隆 DOM 时可能丢 symbol 引用。**修法**：导出前 `await document.fonts.ready`（上面代码第一行）；字体文件尽量走同域/base64 内联（`@font-face` 的 `src: url(data:font/woff2;base64,...)`）；图标优先用 SVG 组件而非 iconfont。

### 验收清单

✅ 产出：在《进阶大纲》§4 的 dashboard 上叠加自由布局 + 分辨率适配 + 图层管理。逐条展开为可勾选的验收项：

- [ ] **分辨率适配**：把 §4 dashboard 的渲染树装进 `ScreenContainer`，在 1920×1080 / 2560×1440 / 1280×720（笔记本）三档下截图对比——等比、居中、无溢出；echarts 无明显发虚；
- [ ] **自由布局**：组件模型升级为 `{x, y, w, h, rotation}`，支持拖拽（含吸附线、6px 阈值、参考线渲染）、八向缩放（含最小尺寸钳制与旋转补偿）、`Cmd+D` 复制带偏移；
- [ ] **网格与标尺**：20px 网格背景 + 上/左标尺，位置读数与组件坐标一致；
- [ ] **图层面板**：数组顺序即层级；置顶/置底/上下移一层、锁定（画布不可选中）、隐藏（编辑态不渲染）、拖拽调序即时反映到画布覆盖关系；
- [ ] **数据映射**：配置一个轮询 API 源，两个组件共享同一源（网络面板确认**一次**轮询只发**一条**请求）；映射路径悬空时编辑器标红；
- [ ] **运行态三件套**：多页定时轮播（函数式 setState）、Fullscreen API 进入/退出（含失败 catch）、html2canvas 导出 PNG（跨域图片与字体双坑已处理，导出图肉眼比对无缺字无空白块）。

做到这里，你已经把《进阶大纲》§4 的栅格 dashboard 升级成了真正的"可视化大屏编辑器"——而物料、注册表、Setter、undo 这些底座一行没重写，这就是引言里那条暗线在场景 1 的兑现。

## 2. 工作流编排器 / 节点图编辑器

**基础**：全景图 A4 + F2。增量：

1. **节点 DSL**：`{ id, type, position, data, next: [...] }`；邻接表 → DAG 校验（拓扑排序 + 环检测，保存前必验）
2. **自定义节点 = 节点内嵌表单**（mini Setter 面板直接长在节点上）、折叠/展开、状态徽标（idle/running/success/error）
3. 连线校验：handle 类型约束（输出→输入、类型不匹配禁止连接）、连线规则回调
4. 自动布局：dagre（快）vs ELK（质量高）；用户手动布局后锁定
5. **运行态性能**：后端推送节点状态 → 高频 `setNodes` 必须合并批量更新（rAF 聚合，否则 100 节点流式更新直接卡死）
6. 撤销重做、小地图、快捷键（Cmd+D 复制节点带偏移）
7. DSL 语义升级：条件分支节点、并行网关、循环节点怎么表达

对标：n8n（源码可读性好）、Dify、Langflow、bpmn.js（重量级 BPMN，按需）

先对齐全景图的两个坐标：A4（节点编排画布）给出了 React Flow 的技术栈清单——自定义节点/边、连线校验、自动布局、运行态可视化；F2（Agent 工作流画布）进一步指出 Dify/Coze 的编排页 = A4 节点画布 + 低代码 Setter。本章就沿着这两条展开：先定协议（2.1），再把编辑器体验做全（2.2–2.6），最后给协议升级留出语义空间（2.7）。技术底座用 @xyflow/react（React Flow v12，包名从 reactflow 迁移而来，API 以 v12 为准）。

一个前置认知：工作流编辑器 = **图数据结构编辑器** + **每节点一个迷你表单**。前者是本章新知识（DAG、拓扑、连线校验、布局），后者是《进阶大纲》§3 Setter 的又一次复用——引言暗线在场景 2 的落点。

### 2.1 节点 DSL：`{ id, type, position, data, next }` 与 DAG 校验（保存前必验）

**是什么**：工作流的持久化协议。每个节点自带后继列表 `next`（邻接表），边不需要单独存储——渲染时从邻接表派生。画布坐标 `position` 只是编辑器视图信息，调度器执行时忽略它。

**为什么需要**：协议决定一切下游能力。`next` 放在节点里（而非独立的 edges 数组）有两个好处：校验时邻接表零转换成本；保存的 JSON 与调度器的输入是同一份数据，不存在"编辑器格式 → 执行格式"的双向同步。代价是 React Flow 需要 nodes/edges 两套视图状态——派生函数一行 `flatMap` 解决。

完整 TS 类型：

```ts
/** 节点类型枚举：协议演进的锚点，2.7 会在这里扩 condition/parallel/join/loop */
export type WfNodeType = 'start' | 'http' | 'condition' | 'parallel' | 'join' | 'loop' | 'end';

export interface WfNode {
  id: string;
  type: WfNodeType;
  position: { x: number; y: number }; // 画布坐标（编辑器专用，调度器忽略）
  data: Record<string, unknown>;      // 类型私有配置：url/method（http）、branches（condition）...
  next: string[];                     // 后继节点 id 列表 —— 邻接表本体
}

export interface WorkflowDSL {
  version: 1; // 协议版本号：迁移与兼容的依据（《进阶大纲》§1.1 的原则）
  name: string;
  nodes: WfNode[];
}

/** DSL → React Flow 的 edges：邻接表派生边，渲染层与协议层解耦 */
export function dslToEdges(dsl: WorkflowDSL): { id: string; source: string; target: string }[] {
  return dsl.nodes.flatMap(node =>
    node.next.map(target => ({ id: `${node.id}->${target}`, source: node.id, target })),
  );
}
```

#### 邻接表 → DAG 校验：Kahn 拓扑排序 + 环检测

**为什么保存前必验**：调度器按拓扑序推进执行（某节点完成后才调度其后继）。图里一旦有环，两种死法：按拓扑序调度 → 环上节点永远等不到"入度清零"，流程**卡死挂起**；按事件驱动调度 → 环上节点互相触发，**无限循环打爆下游**。而且工作流的执行通常发生在保存之后的某个异步时刻（定时触发/事件触发），运行期才发现环，代价是"失败的 run + 告警 + 人工回滚"；保存时前端拦截，代价是一次本地校验。此外后端也有校验，但前端先验能省一次网络往返，并把错误**定位到具体节点**（高亮成环路径），体验完全不同。

**Kahn 算法分步**：

1. 预检结构错误：`next` 指向不存在的 id（悬空边）、自环（`next` 含自身）、重复边——这些比环更常见，先挡掉；
2. 统计每个节点的**入度**（有多少条边指向它）；
3. 把入度为 0 的节点全部入队（没有前置依赖，可以立刻执行）；
4. 出队一个节点，"删掉"它的所有出边（后继入度减一），后继入度归零则入队；
5. 重复直到队空。**若出队数量 < 节点总数，说明剩下的是环**（环上节点入度永远无法归零）——被剩下的节点集合就是环成员，直接用于画布高亮。

完整代码：

```ts
export interface DagValidation {
  ok: boolean;
  cyclicNodes: string[]; // 参与环的节点 id（画布高亮用）
  errors: string[];      // 其它结构错误（人话报错，直接可展示）
}

export function validateDag(dsl: WorkflowDSL): DagValidation {
  const errors: string[] = [];

  // 步骤 1：结构预检——id 唯一性、悬空 next、自环、重复边
  const ids = new Set(dsl.nodes.map(n => n.id));
  if (ids.size !== dsl.nodes.length) errors.push('存在重复的节点 id');
  const edgeKeys = new Set<string>();
  for (const node of dsl.nodes) {
    for (const next of node.next) {
      if (!ids.has(next)) {
        errors.push(`节点 ${node.id} 的 next 指向不存在的节点 ${next}`);
        continue;
      }
      if (next === node.id) {
        errors.push(`节点 ${node.id} 自连（自环）`);
        continue;
      }
      const key = `${node.id}->${next}`;
      if (edgeKeys.has(key)) errors.push(`重复连线：${key}`);
      edgeKeys.add(key);
    }
  }
  if (errors.length > 0) return { ok: false, cyclicNodes: [], errors };

  // 步骤 2：入度表（邻接表就是 node.next，无需另建）
  const indegree = new Map<string, number>(dsl.nodes.map(n => [n.id, 0]));
  const nodeById = new Map(dsl.nodes.map(n => [n.id, n]));
  for (const node of dsl.nodes) {
    for (const next of node.next) {
      indegree.set(next, (indegree.get(next) ?? 0) + 1);
    }
  }

  // 步骤 3：入度为 0 的节点入队
  const queue: string[] = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const ordered: string[] = [];

  // 步骤 4：出队 → 后继入度减一 → 归零入队
  while (queue.length > 0) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const next of nodeById.get(id)!.next) {
      const remain = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remain);
      if (remain === 0) queue.push(next);
    }
  }

  // 步骤 5：摘不完 = 有环；剩下的就是环成员
  if (ordered.length === dsl.nodes.length) {
    return { ok: true, cyclicNodes: [], errors: [] }; // ordered 本身就是一个合法拓扑序，可直接喂给调度器
  }
  const cyclicNodes = dsl.nodes.filter(n => !ordered.includes(n.id)).map(n => n.id);
  return {
    ok: false,
    cyclicNodes,
    errors: [`检测到环，涉及节点：${cyclicNodes.join(' → ')}`],
  };
}
```

保存按钮的接线方式：`const check = validateDag(currentDsl)`；`!check.ok` 时保存按钮置灰 + 错误面板列出 `errors` + 画布上把 `cyclicNodes` 对应节点标红（把 id 集合存 state，自定义节点读它渲染红框）。

**常见坑**：

- **症状**：校验通过但运行时还是卡死。**根因**：环检对了，但流程没有 `start`/`end` 语义，调度器从"入度 0 节点"开始跑、到"出度 0 节点"结束，而协议里某些节点（如手动审批回调）入度不为 0 也没有 start 边。**修法**：校验里加业务断言——恰一个 `start`、至少一个 `end`、除 `end` 外节点必须有后继（`next.length > 0`）。
- **症状**：删除节点后 `next` 悬空，校验报错用户却看不到哪条边。**根因**：悬空边在 `dslToEdges` 派生时 target 不存在，画布上根本不渲染，错误不可见。**修法**：删除节点时**级联清理**所有指向它的 `next` 项（删除操作在协议层完成，而不是只删 nodes 数组）。
- **症状**：2.7 引入循环节点后，合法流程被环检测误杀。**根因**：循环的语义回边若写进 `next`，DAG 不再成立。**修法**：见 2.7——把循环语义放进节点 `data`，邻接表保持无环（这是协议设计的关键权衡）。

### 2.2 自定义节点 = 节点内嵌表单（mini Setter 面板）、折叠/展开、状态徽标

**是什么**：n8n/Dify 式节点——双击节点（或选中即）在节点卡片上直接编辑配置，而不是只能去右侧属性面板。节点 = 卡片头部（图标 + 标题 + 状态徽标）+ 可折叠的表单体（mini Setter 面板）。

**为什么需要**：工作流配置的上下文在"图"上——用户想一边看连线一边改某个节点的 URL，来回切换右侧面板会丢上下文；节点上直接改，视线不用离开图。而表单体本身不新做——就是《进阶大纲》§3 的 Setter 体系（字段声明 + 值编辑器）缩小尺寸嵌进节点，所以叫"mini Setter 面板直接长在节点上"。

**机制分步**：

1. 定义节点的 data 类型（协议与 UI 的契约）；
2. 写自定义节点组件：`NodeProps<TypedNode>` 泛型拿到类型安全的 data；修改 data 用 `useReactFlow().setNodes` 按节点 id 精确更新（只换这一个节点的 data，其它节点引用不变）；
3. 折叠/展开就是 data 里的一个布尔位，折叠时只渲染头部行（handle 必须始终渲染——连线依赖它，藏了 handle 已有连线会视觉断裂）；
4. 状态徽标：data.status 四态映射到颜色圆点。

```tsx
import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';

/**
 * http 节点的 data 协议：mini Setter 表单与状态徽标的数据来源。
 * 注意用 type 别名而不是 interface：v12 要求 data 满足 Record<string, unknown>，
 * type 别名有隐式索引签名、可直接满足；interface 需要额外声明索引签名。
 */
export type HttpNodeData = {
  title: string;
  method: 'GET' | 'POST';
  url: string;
  collapsed: boolean; // 折叠态：只渲染头部（2.2）
  status: 'idle' | 'running' | 'success' | 'error'; // 运行态徽标（2.5 推送）
};

/** 类型化节点：Node<data, type>，让 NodeProps 拿到精确类型 */
export type HttpNode = Node<HttpNodeData, 'http'>;

const STATUS_META: Record<HttpNodeData['status'], { color: string; label: string }> = {
  idle: { color: '#8c8c8c', label: '空闲' },
  running: { color: '#1677ff', label: '运行中' },
  success: { color: '#52c41a', label: '成功' },
  error: { color: '#ff4d4f', label: '失败' },
};

function HttpNodeView({ id, data, selected }: NodeProps<HttpNode>) {
  const { setNodes } = useReactFlow();

  /** mini Setter 的统一写入口：只改当前节点的某个字段，其它节点引用不动（性能关键，见 2.5） */
  const updateData = useCallback(
    <K extends keyof HttpNodeData>(key: K, value: HttpNodeData[K]) => {
      setNodes(nodes =>
        nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n)),
      );
    },
    [id, setNodes],
  );

  const badge = STATUS_META[data.status];

  return (
    <div
      style={{
        minWidth: 240,
        borderRadius: 8,
        background: '#fff',
        border: selected ? '2px solid #1677ff' : '1px solid #d9d9d9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontSize: 12,
      }}
    >
      {/* 输入/输出端口：id 携带数据类型（2.3 的协议），且任何渲染分支都必须保留 Handle */}
      <Handle type="target" position={Position.Left} id="in:json" />

      {/* 头部：标题 + 状态徽标 + 折叠开关（折叠态只渲染这一行） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: data.collapsed ? 'none' : '1px solid #f0f0f0',
        }}
      >
        <strong style={{ flex: 1 }}>{data.title}</strong>
        <span style={{ color: badge.color, whiteSpace: 'nowrap' }}>● {badge.label}</span>
        <button onClick={() => updateData('collapsed', !data.collapsed)} style={{ border: 'none', cursor: 'pointer' }}>
          {data.collapsed ? '展开' : '折叠'}
        </button>
      </div>

      {!data.collapsed && (
        <div style={{ padding: 12, display: 'grid', gap: 8 }}>
          {/* mini Setter 面板：字段声明 + 值编辑器。与右侧属性面板共用同一套 Setter 实现，
              区别只是"容器"从面板变成了节点卡片——暗线：Setter 第 N 次复用 */}
          <label style={{ display: 'grid', gap: 4 }}>
            请求方式
            <select value={data.method} onChange={e => updateData('method', e.target.value as 'GET' | 'POST')}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            URL
            <input value={data.url} onChange={e => updateData('url', e.target.value)} style={{ width: '100%' }} />
          </label>
        </div>
      )}

      <Handle type="source" position={Position.Right} id="out:json" />
    </div>
  );
}

// memo：props 不变不重渲染——2.5 的性能策略依赖这一点
export default memo(HttpNodeView);
```

`nodeTypes` 的定义位置是第一个高频坑，先立规矩：**必须定义在组件外（模块级）**。React Flow 内部按引用比较 nodeTypes，组件内定义 = 每次渲染新对象 = 控制台警告 `It looks like you've created a new nodeTypes or edgeTypes object` + **所有节点被卸载重建**（输入框焦点丢失、动画重放）：

```ts
// ✅ 模块级：引用永远稳定
import type { NodeTypes } from '@xyflow/react';
import HttpNodeView from './HttpNodeView';
export const nodeTypes: NodeTypes = { http: HttpNodeView };
```

**常见坑**：

- **症状**：在节点输入框打字，每敲一个字符画布轻微卡顿，节点多时明显。**根因**：`updateData` 每次都 `setNodes` 触发整个 nodes 数组协调。**修法**：节点数量在几十个时 React Flow + memo 的默认表现可接受（未变更节点引用不变、memo 跳过）；上百节点的高频编辑场景，把节点配置挪到外部 store（zustand），节点组件用 selector 只订阅自己的 data（思路同《进阶大纲》§1.7 path 级订阅）；文本输入的 undo 合并遵循 §1.5 的 300ms 防抖合并规则。
- **症状**：折叠节点后连线"消失"一半。**根因**：折叠分支里把 Handle 一起裁掉了。**修法**：Handle 永远渲染（上面代码的位置），折叠只裁表单体。

### 2.3 连线校验：handle 类型约束、onConnect 校验、isValidConnection

**是什么**：不是任意两端口都能连。三类规则：**方向**（输出→输入，React Flow 用 handle 的 `type="source"/"target"` 天然表达）、**数据类型**（`out:table` 只能接 `in:table`，不匹配禁止连接）、**拓扑**（连上会成环的禁止）。

**为什么需要**：工作流是有向无环图，坏连线在保存时被 2.1 校验拦下——但那是"最后一道门"；交互层的校验让用户**根本画不出**坏边（拖动时目标端口不响应/变灰），错误在发生前就被消灭。三层防线各司其职：拖动时实时校验（体验）→ connect 时兜底（防御）→ 保存时全量校验（正确性）。

**机制：handle id 协议**。端口的数据类型编码在 handle id 里——`in:json`、`out:table`，冒号后是类型标签。校验只做字符串比较，不需要额外的端口元数据表（也可以用 `data-*` 属性或独立注册表，id 内嵌最简单且序列化免费）：

```ts
/** 从 handle id 解析数据类型："out:table" → "table"；无协议前缀视为 any（兼容旧数据） */
function portType(handleId: string | null | undefined): string {
  return handleId?.includes(':') ? handleId.split(':')[1] : 'any';
}

/** 连线成环检测：若从 target 沿现有边可达 source，则新增 source→target 必成环（DFS 可达性） */
export function createsCycle(edges: { source: string; target: string }[], source: string, target: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }
  const visited = new Set<string>();
  const stack = [target]; // 从 target 出发找 source
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === source) return true; // target 的下游绕回了 source：闭环
    if (visited.has(id)) continue;
    visited.add(id);
    stack.push(...(adjacency.get(id) ?? []));
  }
  return false;
}
```

`isValidConnection`（React Flow 的连线规则回调）：拖动过程中每次悬停到候选端口都会调用，返回 false 则该端口不响应吸附，用户"连不上"——这是体验最好的一层。`onConnect` 是连线真正建立前的兜底：

```tsx
import { useCallback } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import HttpNodeView, { type HttpNode } from './HttpNodeView';

// 模块级定义（2.2 的规矩）：引用稳定，否则每次渲染都警告并重建全部节点
const nodeTypes: NodeTypes = { http: HttpNodeView };

const initialNodes: HttpNode[] = [
  {
    id: 'fetch-orders',
    type: 'http',
    position: { x: 0, y: 80 },
    data: { title: '拉取订单', method: 'GET', url: 'https://api.example.com/orders', collapsed: false, status: 'idle' },
  },
  {
    id: 'calc-metrics',
    type: 'http',
    position: { x: 360, y: 80 },
    data: { title: '计算指标', method: 'POST', url: 'https://api.example.com/metrics', collapsed: false, status: 'idle' },
  },
];

const initialEdges: { id: string; source: string; target: string }[] = [
  { id: 'fetch->calc', source: 'fetch-orders', target: 'calc-metrics' },
];

export function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<HttpNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  /** 规则回调：拖动中实时调用，false = 目标端口不吸附（画不出坏线的第一道防线） */
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // 规则 1：禁止自连
      if (connection.source === connection.target) return false;
      // 规则 2：端口数据类型匹配（out:json 只能接 in:json；any 万能）
      const from = portType(connection.sourceHandle);
      const to = portType(connection.targetHandle);
      if (from !== 'any' && to !== 'any' && from !== to) return false;
      // 规则 3：不能连出环（2.1 的环检测在这里前置到交互层）
      if (createsCycle(edges, connection.source, connection.target)) return false;
      return true;
    },
    [edges],
  );

  /** 兜底：即使程序化触发 connect（绕过拖拽），也过一遍同样的规则 */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      setEdges(eds => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [isValidConnection, setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} />
        <MiniMap pannable zoomable nodeColor={n => (n.type === 'http' ? '#e6f4ff' : '#f0f0f0')} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// 业务页面挂载（后续 toolbar/快捷键也要求在 ReactFlowProvider 内使用 useReactFlow）
export default function Page() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
```

补一个细节：`isValidConnection` 也可以挂在**单个 Handle** 上（v12 的 `<Handle isValidConnection={...}>`），用于"某个端口有专属规则"的场景（例如 join 节点只接受来自 parallel 的输入）；画布级与端口级同时存在时，两者都通过才可连。

**常见坑**：

- **症状**：用户反馈"明明类型一样还是连不上"。**根因**：handle 没写 `id`，React Flow 默认 id 为 `null`，`portType(null)` 走了 any 以外的分支或两边都成了 any 之外的空值比较失败。**修法**：所有自定义端口一律显式写 id 并遵守 `in:<type>`/`out:<type>` 协议；any 规则只放给显式声明的端口。
- **症状**：连线成环没被拦住。**根因**：只校验了类型没校验拓扑；或 `isValidConnection` 闭包里的 edges 是旧值（依赖数组漏了 edges）。**修法**：三条规则全上；`useCallback` 依赖 `[edges]`（上面代码）；保存前仍跑 2.1 全量校验兜底。
- **症状**：`onConnect` 里 `addEdge` 后边没出现。**根因**：`addEdge` 返回新数组，但写成了 `setEdges(addEdge(connection, eds))` 且参数里的 eds 来自外层闭包旧值。**修法**：永远用函数式更新 `setEdges(eds => addEdge(...))`。

### 2.4 自动布局：dagre vs ELK；用户手动布局后锁定

**是什么**：把"一坨随机坐标的节点"自动整理成分层清晰的正交流程图。两个引擎：dagre（快、简单）与 ELK/elkjs（慢、质量高）。

**为什么需要**：用户从模板/代码生成的 DSL 没有坐标（`position` 全 0）；导入别人的工作流想重排；画布连线交叉成蜘蛛网。自动布局是"导入即能用"的前提。

**选型对比**：

| 维度 | dagre（@dagrejs/dagre） | ELK（elkjs） |
|---|---|---|
| 算法 | Sugiyama 分层布局的精简实现 | ELK Layered（完整的分层+正交边路由） |
| 布局质量 | 边是直线/贝塞尔，交叉多 | 边走正交折线，同层对齐好，接近手画 |
| 性能 | 几十至几百节点瞬时 | 同规模慢一个量级（大图可考虑 web worker） |
| 包体 | 小 | 大（内嵌 Java 转译的 JS） |
| 端口/分组 | 不支持复杂端口约束 | 支持（ports、compound graph） |
| 建议 | 节点数 < 100 的常规工作流 | 追求 n8n 级观感、或有分组/复杂端口时 |

dagre 接入（注意 dagre 返回**节点中心点**坐标，React Flow 要**左上角**坐标，必须减半宽高）：

```ts
import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

/** dagre 自动布局：direction LR = 自左向右（贴合工作流阅读习惯），TB = 自上而下 */
export function layoutWithDagre(nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR'): Node[] {
  const g = new dagre.graphlib.Graph();
  // margin 留出画布内边距；nodesep 同层间距；ranksep 层间间距
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({})); // dagre 要求每条边有 label（可为空对象）

  for (const node of nodes) {
    // v12 里 React Flow 测量后的真实尺寸在 node.measured；未测量（未渲染过）时回退估算值
    g.setNode(node.id, { width: node.measured?.width ?? 260, height: node.measured?.height ?? 90 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map(node => {
    const { x, y, width, height } = g.node(node.id); // 中心点坐标
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } }; // 转左上角
  });
}
```

ELK 接入（异步 API；边必须带 id；返回的就是左上角坐标）：

```ts
import ELK from 'elkjs';
import type { Edge, Node } from '@xyflow/react';

const elk = new ELK(); // 模块级单例：实例化有成本，不要每次布局新建

/** ELK 分层布局：正交边路由，布局质量对标 n8n */
export async function layoutWithElk(nodes: Node[], edges: Edge[], direction: 'RIGHT' | 'DOWN' = 'RIGHT'): Promise<Node[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered', // 分层布局（Sugiyama 家族完整实现）
      'elk.direction': direction,
      'elk.layered.spacing.nodeNode.betweenLayers': '80', // 层间距
      'elk.spacing.nodeNode': '40', // 同层间距
    },
    children: nodes.map(n => ({
      id: n.id,
      width: n.measured?.width ?? 260,
      height: n.measured?.height ?? 90,
    })),
    // ELK JSON 图格式：sources/targets 为数组，且每条边必须有 id
    edges: edges.map((e, i) => ({ id: e.id || `elk-edge-${i}`, sources: [e.source], targets: [e.target] })),
  };

  const laid = await elk.layout(graph);
  const byId = new Map((laid.children ?? []).map(c => [c.id, c]));
  return nodes.map(node => {
    const pos = byId.get(node.id);
    // ELK 输出左上角坐标（与 dagre 的中心点不同），直接可用
    if (!pos || pos.x === undefined || pos.y === undefined) return node;
    return { ...node, position: { x: pos.x, y: pos.y } };
  });
}
```

**用户手动布局后锁定（用户位置优先策略）**：自动布局是"一次性重排"，它会**覆盖**用户辛苦拖好的位置——直接放一个"自动布局"按钮，用户点一次骂一次。策略三选一：

1. **全局标记 + 确认**（实现最简，推荐起步）：任何手动拖拽（`onNodeDragStop`）把画布标记为"手动布局过"；此后点自动布局先弹确认"将覆盖当前手动排列"；
2. **节点级锁定**：`data.positionLocked: true` 的节点不参与自动布局（dagre 仍会给它算位置，但布局后写回时跳过），适合"钉住"关键节点只整理其余；
3. **完全手动 opt-in**：导入 DSL 时自动布局一次，之后按钮藏进菜单——尊重"画布是用户的领地"。

实现（策略 1 + 策略 2 的写回跳过）：

```tsx
import { useCallback, useRef } from 'react';
import { Panel, ReactFlow, useReactFlow, type Node } from '@xyflow/react';

/** 布局工具栏：作为 <ReactFlow> 的子组件渲染（这样才能用 useReactFlow） */
export function LayoutToolbar() {
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow();
  const manuallyLaid = useRef(false); // 全局标记：true = 用户拖过，自动布局需确认

  const onAutoLayout = useCallback(() => {
    if (manuallyLaid.current && !window.confirm('自动布局会覆盖手动排列的位置，继续？')) {
      return; // 用户位置优先：宁可放弃自动布局，不悄悄毁掉手动成果
    }
    setNodes(nodes => {
      const laid = layoutWithDagre(nodes, getEdges());
      // 策略 2：钉住的节点不写回新坐标
      return nodes.map((node, i) =>
        (node.data as { positionLocked?: boolean }).positionLocked ? node : laid[i],
      );
    });
    manuallyLaid.current = false;
    // 下一帧再 fitView：等 setNodes 的状态落地，拿到的是新坐标
    requestAnimationFrame(() => void fitView({ padding: 0.15, duration: 300 }));
  }, [setNodes, getEdges, fitView]);

  return (
    <Panel position="top-right">
      <button onClick={onAutoLayout} style={{ padding: '4px 12px' }}>
        自动布局
      </button>
    </Panel>
  );
}

// ReactFlow 上监听拖拽结束，置手动标记：
// <ReactFlow onNodeDragStop={() => { manuallyLaid.current = true; }} ... />
```

**常见坑**：

- **症状**：布局后节点挤成一坨或尺寸全是默认值。**根因**：首次渲染前就布局——`node.measured` 还没填充，全部回退默认宽高，而实际节点（含展开的表单）高矮不一。**修法**：导入 DSL 后先渲染一帧（让 React Flow 完成测量）再触发布局；或在布局前手动遍历 DOM 读节点尺寸写入 measured。
- **症状**：ELK 布局抛"edge id 重复/缺失"。**根因**：边没 id 或复用了旧 id。**修法**：edges 生成时统一 `crypto.randomUUID()`（2.6 的 Cmd+D 复制同理）。
- **症状**：自动布局把 undo 栈打断——一次布局回退成几十步节点移动。**根因**：每个节点 position 变化被当作独立变更入栈。**修法**：布局操作在**快照级 undo** 里只记一次（2.6 的 commit 时机：布局前 commit 一次快照）。

### 2.5 运行态性能：后端高频推送节点状态 → rAF 聚合批量 setNodes（重点）

**场景还原**：点"运行"后，工作流引擎在后端执行，通过 WebSocket/SSE 把节点状态流式推给前端——`fetch-orders: running`、`calc-metrics: running`、`fetch-orders: success`……大工作流（100 节点）运行高峰期，每秒几十上百条消息。全景图 F2 把这一条列为 Agent 画布的核心技术点，原因就是它**最容易把编辑器做卡**。

**"100 节点流式更新直接卡死"的机理，用数字推演**。先看反例（多数人的第一版写法）：

```tsx
// 反例：每条推送一次 setNodes，且 map 里把所有节点都换成新对象
const ws = new WebSocket('wss://api.example.com/runs/run-42/stream');
ws.onmessage = event => {
  const patch = JSON.parse(event.data) as { nodeId: string; status: string };
  setNodes(nodes =>
    nodes.map(n => ({ ...n, data: { ...n.data, status: n.id === patch.nodeId ? patch.status : n.data.status } })),
  );
};
```

两个错误叠加：

1. **更新频率失控**：50 条消息/秒 = 50 次 `setNodes`/秒。每条 WS 消息是独立的宏任务，React 18 的自动批处理**跨不过**任务边界——50 次真实的 reconciliation。而屏幕只有 60fps，用户根本看不到两次渲染之间的中间态：这些更新里约 80% 是纯浪费的协调开销。
2. **重渲染范围失控**：`map` 里 `{...n}` 给**所有** 100 个节点都造了新对象。React Flow 内部对节点组件做了 memo（我们也给自定义节点包了 memo），但 memo 比较的是引用——引用全变，100 个节点的组件**全部重渲染**。50 msg/s × 100 节点 = 每秒 5000 次节点组件渲染，每次渲染又生成一批新对象喂给 GC。

60fps 的帧预算是 16.6ms。假设每次全图协调 2ms，仅协调就吃掉 50 × 2 = 100ms/s 看似不多，但它**挤占的是同一个主线程**：与拖拽、动画、canvas 绘制抢帧，帧时间一超 16.6ms 就掉帧；GC 停顿再来插一脚，用户感受到的就是"点运行，画布冻住"——卡死不是崩溃，是主线程持续过载。

**修法：rAF 聚合 + 引用稳定性**。两招分别对付上面两个错误：

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';

export type NodeRunStatus = 'idle' | 'running' | 'success' | 'error';

/** 后端单条推送的补丁 */
interface StatusPatch {
  nodeId: string;
  status: NodeRunStatus;
}

/**
 * 运行态状态同步器：高频推送 → rAF 聚合 → 每帧最多一次 setNodes。
 * 用法：const { applyPatch } = useStatusSync(); 然后 ws.onmessage 里 applyPatch(JSON.parse(e.data))。
 */
export function useStatusSync() {
  const { setNodes } = useReactFlow();

  // 帧内补丁队列：Map 的 key 去重——同一帧内同一节点的多次推送只保留最后一条
  const pendingRef = useRef(new Map<string, StatusPatch>());
  const rafIdRef = useRef<number | null>(null);

  /** 落盘：把这一帧攒的补丁一次性合并进 nodes */
  const flush = useCallback(() => {
    rafIdRef.current = null;
    const pending = pendingRef.current;
    if (pending.size === 0) return;
    const patches = new Map(pending);
    pending.clear();

    setNodes(nodes =>
      nodes.map((node): Node => {
        const patch = patches.get(node.id);
        // 关键：未命中补丁的节点返回原引用——memo 生效，只有真正变化的节点重渲染
        if (!patch) return node;
        return {
          ...node,
          data: { ...node.data, status: patch.status },
        };
      }),
    );
  }, [setNodes]);

  /** 入队：补丁先进帧队列，帧内第一次补丁才调度 rAF */
  const applyPatch = useCallback(
    (patch: StatusPatch) => {
      pendingRef.current.set(patch.nodeId, patch); // 同节点多次推送：Map 覆盖，只留最新
      if (rafIdRef.current === null) {
        // requestAnimationFrame：与浏览器渲染节拍对齐，每帧最多 flush 一次（≤60 次/秒）
        rafIdRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  // 卸载清理：取消未执行的帧回调，避免卸载后 setState
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { applyPatch };
}
```

与 WebSocket 的接线（含消息协议的判别联合类型）：

```tsx
import { useEffect } from 'react';

/** 与后端约定的流消息协议 */
type RunStreamMessage =
  | { kind: 'node-status'; payload: { nodeId: string; status: NodeRunStatus } }
  | { kind: 'run-finished'; runId: string }
  | { kind: 'run-failed'; runId: string; nodeId: string; message: string };

export function useRunStream(runId: string | null) {
  const { applyPatch } = useStatusSync();

  useEffect(() => {
    if (!runId) return;
    const ws = new WebSocket(`wss://api.example.com/runs/${runId}/stream`);
    ws.onmessage = event => {
      const msg = JSON.parse(event.data) as RunStreamMessage;
      // 每条消息只做"入队"这个 O(1) 动作，重活留给 rAF 的 flush
      if (msg.kind === 'node-status') applyPatch(msg.payload);
    };
    return () => ws.close();
  }, [runId, applyPatch]);
}
```

效果量化：50 msg/s 的推送被压到 ≤60 次/秒的 setNodes（通常一帧一次），每次只重建**发生变化**的节点对象（一帧内通常 1–5 个）——每秒节点组件渲染从 5000 次降到一两百次，且与渲染节拍对齐零浪费。三个工程要点再强调一遍：

1. **Map 去重的语义正确性**：一个节点在 16ms 内从 running→success→error，用户只应看到最终态，中间态本来就不该渲染——聚合不是妥协，是更正确的语义；
2. **未变更节点引用必须原样返回**：`if (!patch) return node` 这一行是整个策略的命门，删掉它 memo 全部失效；
3. **调度时机**：用 rAF 而不是 `setTimeout(0)`——后者仍可能一帧内触发多次；也不是节流（固定间隔），rAF 自动适配刷新率且在渲染前执行。

**常见坑**：

- **症状**：状态还是延迟好几秒才刷新。**根因**：聚合做在了**后端→前端**之间还有一层 100ms 的消息合并，或者 flush 里 `setNodes` 用了非函数式更新读到旧 nodes。**修法**：前端聚合保留（rAF），后端合并去掉或控制在 50ms 内；`setNodes` 一律函数式。
- **症状**：节点闪一下旧状态再变新状态。**根因**：推送乱序（WS 重连后重放），旧补丁覆盖新补丁。**修法**：补丁携带递增序号/时间戳，flush 时丢弃比已应用序号更老的补丁。
- **症状**：几百节点 + 运行态下拖拽画布仍然卡。**根因**：rAF 只解决了更新频率，节点渲染总量还在。**修法**：`<ReactFlow onlyRenderVisibleElements>`（视口裁剪）+ 折叠节点表单体（2.2 的 collapsed 默认 true，运行态全量折叠）双管齐下。

### 2.6 撤销重做、小地图、快捷键（Cmd+D 复制节点带偏移）

#### 撤销重做（复用《进阶大纲》§1.5）

§1.5 给了三种实现（命令模式 / immer produceWithPatches / zundo）。工作流编辑器的选型建议：**快照式**——nodes/edges 两个数组总量小（几十 KB），全量快照 + 50 步上限的内存代价可忽略，换来的是"任何操作（拖动、连线、删除、布局、批量粘贴）零差异接入"——不用为每种操作写 do/undo 对偶。immer patches 方案在"单字段编辑极多"的场景更省内存，但接入成本高；快照式是编辑器规模小几十倍于文档编辑器时的理性选择。

快照式通用 hook（无 React Flow 依赖，任何编辑器可搬）：

```tsx
import { useCallback, useRef, useState } from 'react';

const HISTORY_LIMIT = 50; // 50 步：再多内存不值、用户也回不去那么远

/** 泛型快照式历史栈：T 是被编辑状态的快照类型 */
export function useHistory<T>() {
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [, setVersion] = useState(0); // 仅用于驱动 canUndo/canRedo 重渲染

  /** 在"破坏性操作发生前"记录现状 */
  const commit = useCallback((present: T) => {
    pastRef.current = [...pastRef.current, present].slice(-HISTORY_LIMIT);
    futureRef.current = []; // 新操作清空 redo 栈（§1.5 的规则）
    setVersion(v => v + 1);
  }, []);

  /** 撤销：传入"当前状态"，返回要回到的快照 */
  const undo = useCallback((present: T): T | undefined => {
    const past = pastRef.current;
    if (past.length === 0) return undefined;
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [present, ...futureRef.current];
    setVersion(v => v + 1);
    return prev;
  }, []);

  /** 重做：传入"当前状态"，返回要前进到的快照 */
  const redo = useCallback((present: T): T | undefined => {
    const future = futureRef.current;
    if (future.length === 0) return undefined;
    const next = future[0];
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, present];
    setVersion(v => v + 1);
    return next;
  }, []);

  return {
    commit,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
```

与 React Flow 的接线——关键是**commit 时机选在破坏性操作发生前**（拿到的是"改之前"的快照），并用 `getNodes()/getEdges()` 这类命令式读取器避免闭包过期：

```tsx
import { useCallback, useEffect } from 'react';
import { useReactFlow, type Connection, type Node, type Edge } from '@xyflow/react';

interface FlowSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export function useFlowUndoRedo(
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
) {
  const { getNodes, getEdges } = useReactFlow();
  const { commit, undo, redo } = useHistory<FlowSnapshot>();

  /** 各破坏性操作的入口：先 commit 当前，再改。连线即"先快照再校验加边"（校验规则同 2.3） */
  const beforeConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return; // 与 2.3 相同的兜底规则
      commit({ nodes: getNodes(), edges: getEdges() }); // 连线前的快照
      setEdges(eds => [
        ...eds,
        {
          id: crypto.randomUUID(),
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'smoothstep',
        },
      ]);
    },
    [commit, getNodes, getEdges, setEdges],
  );
  const beforeDragStop = useCallback(() => {
    commit({ nodes: getNodes(), edges: getEdges() }); // 拖拽结束改坐标前（一次拖拽 = 一步 undo）
  }, [commit, getNodes, getEdges]);

  /** Cmd+Z / Cmd+Shift+Z */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      const present = { nodes: getNodes(), edges: getEdges() };
      const target = e.shiftKey ? redo(present) : undo(present);
      if (target) {
        setNodes(() => target.nodes.map(n => ({ ...n })));
        setEdges(() => target.edges.map(e2 => ({ ...e2 })));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, getNodes, getEdges, setNodes, setEdges]);

  return { beforeConnect, beforeDragStop };
}
```

注意 §1.5 的合并规则在这里的体现：**节点内文本输入**（mini Setter 的 URL 框）如果每次 keystroke 都 commit，undo 会逐字符回退——正确做法是输入防抖 300ms 合并为一次快照；拖拽天然是"结束时快照一次"（`onNodeDragStop`），不需要合并。

#### 小地图

`@xyflow/react` 内置，`<MiniMap>` 放进 `<ReactFlow>` 子组件即可（2.3 的编辑器里已接入）。两个实用 prop：`pannable`（拖动小地图视口平移画布）、`zoomable`（小地图内滚轮缩放）；`nodeColor` 按节点类型/状态着色——运行态把 running 节点染成品牌蓝，小地图就成了"运行进度总览"。节点很多时加 `nodeStrokeWidth={2}` 提升辨识度。

#### 快捷键 Cmd+D：复制选中节点带偏移

"带偏移"是产品语义：副本落在原位置右下 32px，用户一眼分辨"这是复制出来的"，并且可以连按 Cmd+D 连续铺开一排。实现要点：复制**节点**的同时复制**两端都在选区内的边**（只复制节点会得到一堆孤岛）；新 id 用 `crypto.randomUUID()`；副本成为新选区（原选中取消）：

```tsx
import { useEffect } from 'react';
import { useReactFlow, type Edge, type Node } from '@xyflow/react';

const DUPLICATE_OFFSET = 32; // 副本偏移：右下 32px，连按可铺开一排

export function useDuplicateShortcut() {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'd') return;
      // 正在输入类控件里打字时不触发（否则复制不了文字还误删节点）
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      ) {
        return;
      }
      e.preventDefault(); // 抢掉浏览器"添加书签"默认行为

      const nodes = getNodes();
      const edges = getEdges();
      const selected = nodes.filter(n => n.selected);
      if (selected.length === 0) return;

      // 新旧 id 映射：副本取全新 id
      const idMap = new Map<string, string>(selected.map(n => [n.id, crypto.randomUUID()]));

      const clones: Node[] = selected.map(n => ({
        ...n,
        id: idMap.get(n.id)!,
        selected: true, // 副本成为新选区
        position: { x: n.position.x + DUPLICATE_OFFSET, y: n.position.y + DUPLICATE_OFFSET },
        data: { ...n.data }, // data 浅拷贝；若 data 内含可变引用（数组/对象配置），按需深拷贝
      }));

      // 边：两端都在选区内才复制（孤立的选外边不跟）
      const clonedEdges: Edge[] = edges
        .filter(e => idMap.has(e.source) && idMap.has(e.target))
        .map(e => ({
          ...e,
          id: crypto.randomUUID(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          selected: false,
        }));

      setNodes(nds => [
        ...nds.map(n => (n.selected ? { ...n, selected: false } : n)), // 原选中取消；未选中的保持引用
        ...clones,
      ]);
      setEdges(eds => [...eds, ...clonedEdges]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [getNodes, getEdges, setNodes, setEdges]);
}
```

**常见坑**：

- **症状**：Cmd+D 后副本和原件叠在一起分不清。**根因**：忘了加偏移。**修法**：就是那 32px——它不是装饰，是可用性。
- **症状**：undo 一步回退了"半次"操作（节点回来了边没回来）。**根因**：nodes 与 edges 的快照来自不同时刻（一次 commit 只截了一个数组）。**修法**：快照必须**原子**——`{ nodes: getNodes(), edges: getEdges() }` 作为一个整体进出栈（上面 FlowSnapshot 的意义）。
- **症状**：删除节点后 undo，节点回来了但引用它的连线没了/悬空。**根因**：React Flow 删除节点时会级联删边，undo 只恢复了节点快照……实际上快照式会整体恢复——真正的坑是把删除入口做成了自定义逻辑只删节点。**修法**：一切破坏性操作走同一套"先 commit 再改"的入口，不自造旁路。

### 2.7 DSL 语义升级：条件分支、并行网关、循环节点怎么表达

**问题**：2.1 的 DSL 只有"顺序后继"（`next`），表达不了三种控制流——条件分支（走哪条路）、并行（同时走多条路）、循环（同一段路走多遍）。这一节回答"它们在协议里怎么表达"，顺带给出 2.1 留下的悬念的答案：**怎么表达循环而不破坏 DAG 校验**。

**总设计原则：把控制流语义放进节点 `data`，不放进边。** 边永远只表达"顺序邻接"（DAG 可校验）；分支/汇合/循环的"路由决策"是节点的运行时行为，由调度器解释执行。这样 2.1 的 Kahn 校验一行不用改，协议的静态可分析性保住了——这也是 n8n/BPMN 的共同做法（BPMN 的网关是图元素但语义在引擎）。

#### 条件分支节点：protocol + 语义

```json
{
  "id": "cond-pay",
  "type": "condition",
  "position": { "x": 640, "y": 120 },
  "data": {
    "branches": [
      { "id": "br-paid", "when": { "field": "status", "operator": "==", "value": "paid" }, "next": ["task-refund"] },
      { "id": "br-pending", "when": { "field": "status", "operator": "==", "value": "pending" }, "next": ["task-remind"] }
    ],
    "default": ["end"]
  },
  "next": []
}
```

**运行语义**：调度器执行到 condition 节点时，按 `branches` 数组**顺序求值** `when`（`field` 是从执行上下文取值的点分路径，如 `result.ok`），**第一个命中分支的 `next` 进入调度队列，其余分支不执行**（互斥单选，与并行网关的本质区别）；全不命中走 `default`（缺省必须存在，否则流程有断头路）。注意 `next` 数组留空——分支节点的出边全部由 `data.branches[].next` 与 `data.default` 携带。**DAG 校验口径**：condition 节点的有效邻接 = 所有 `branches[].next` ∪ `default`，校验器把它们并入邻接表即可（2.1 的校验函数给 condition 类型做一个 next 合并的预处理）。

条件谓词的类型与求值器（调度器与"试运行面板"共用——后者是给用户即时验证规则正确性的调试面板，思想同场景 3 的试运行）：

```ts
export interface ConditionWhen {
  field: string; // 从执行上下文取值的路径，如 "status" / "result.ok"
  operator: '==' | '!=' | '>' | '<' | 'in';
  value: unknown;
}

/** 谓词求值：operator 有限集，纯函数，前后端可共用同一实现 */
export function evalCondition(when: ConditionWhen, variables: Record<string, unknown>): boolean {
  const left = variables[when.field.split('.')[0]]; // 简化：完整实现应走 1.4 的 getByPath
  switch (when.operator) {
    case '==':
      return left === when.value;
    case '!=':
      return left !== when.value;
    case '>':
      return Number(left) > Number(when.value);
    case '<':
      return Number(left) < Number(when.value);
    case 'in':
      return Array.isArray(when.value) && when.value.includes(left);
  }
}
```

#### 并行网关：fork + join 成对

```json
{
  "id": "fanout-1",
  "type": "parallel",
  "position": { "x": 640, "y": 300 },
  "data": { "joinId": "join-1", "mode": "all" },
  "next": ["task-email", "task-sms", "task-report"]
}
```

```json
{
  "id": "join-1",
  "type": "join",
  "position": { "x": 1280, "y": 300 },
  "data": { "fanoutId": "fanout-1", "mode": "all" },
  "next": ["end"]
}
```

**运行语义**：`parallel` 是 fork——`next` 的**全部**后继并发入队（互斥分支的对照组：并行 = 多选全选）；`join` 是汇合点——调度器在 fork 时初始化计数器，每个分支执行到 join 时计一次数：`mode: 'all'` 表示收齐全部到达才放行 `join.next`（`Promise.all` 语义）；`mode: 'any'` 表示任一到达即放行并取消其余（`Promise.race` 语义，用于"超时或成功，先到先用"）。`joinId/fanoutId` 互相引用构成"网关对"——调度器据此知道"该等谁、等几个"，而不是"凡多入边就等全部"（后者无法表达 diamond 型汇聚）。**DAG 校验口径**：join 的入边正常入邻接表（parallel.next 已覆盖），无环问题；校验器加两条断言：`parallel.next.length >= 2`（单分支的并行没有意义）、`join.data.fanoutId` 指向的必须是 parallel 且其 `joinId` 指回自己（成对校验，防孤儿网关）。

#### 循环节点：子段引用而非回边（本节最重要的设计决策）

```json
{
  "id": "loop-retry",
  "type": "loop",
  "position": { "x": 320, "y": 460 },
  "data": {
    "kind": "count",
    "count": 5,
    "bodyStart": "task-call",
    "bodyEnd": "task-check",
    "breakWhen": { "field": "result.ok", "operator": "==", "value": true },
    "maxDurationMs": 600000
  },
  "next": ["end"]
}
```

**运行语义**：`bodyStart → bodyEnd` 是主图上的一个**节点区段**（不是子图——它们就是普通节点，别的工作流也可以引用它们）；调度器循环执行该区段：一轮跑到 `bodyEnd` 后求值 `breakWhen`，未命中且未达 `count` 上限（`kind: 'count'`）就"跳回" `bodyStart` 再来一轮；命中跳出条件或达到上限则从 `loop` 节点自身的 `next` 正常出口。`maxDurationMs` 是安全阀，防 breakWhen 永不命中的死循环。**为什么这样设计**：如果把"回边"写进 `bodyEnd.next`（`next: ["task-call", ...]` 指回循环头），邻接表立刻成环，2.1 的 DAG 校验要么误杀、要么对 loop 类型开洞——校验的完备性就破了。现在的方案里，**循环的"回"是调度器按 loop 节点语义驱动的运行时跳转，图结构上仍是 DAG**——表达力升级，校验规则零改动。代价是静态分析器（如"这个节点会被执行吗"）需要理解 loop 语义，但这是可接受的交换：正确性靠结构，灵活性靠语义。

#### 把语义跑起来：一个可运行的 mini 调度器

上面的语义说明浓缩成代码（http 节点真实 fetch，condition/parallel/loop 按上述规则路由，状态回调对接 2.5 的推送通道）：

```ts
/** 与 2.5 的 NodeRunStatus 同名同义；调度器与编辑器共用这套状态词汇 */
type NodeRunStatus = 'idle' | 'running' | 'success' | 'error';

interface ConditionData {
  branches: { id: string; when: ConditionWhen; next: string[] }[];
  default: string[];
}

interface ParallelData {
  joinId: string;
  mode: 'all' | 'any';
}

interface LoopData {
  kind: 'count' | 'while';
  count: number;
  bodyStart: string;
  bodyEnd: string;
  breakWhen: ConditionWhen;
  maxDurationMs: number;
}

/**
 * mini 调度器：解释执行 WorkflowDSL。
 * onStatus 对接 2.5 的 useStatusSync.applyPatch——运行态可视化就是"调度器回调 → rAF 聚合"这一条链。
 */
export async function runWorkflow(
  dsl: WorkflowDSL,
  onStatus: (nodeId: string, status: NodeRunStatus) => void,
): Promise<void> {
  const nodeById = new Map(dsl.nodes.map(n => [n.id, n]));
  const variables: Record<string, unknown> = {}; // 执行上下文：上游输出并入，供条件求值读取

  // 全局时长安全阀：整个 run 超过截止时间即抛错终止——
  // 与 loop 节点自身的 maxDurationMs 呼应，双保险防"breakWhen 永不命中"式死循环拖垮引擎
  const deadline = Date.now() + 10 * 60 * 1000; // 10 分钟
  const assertWithinDeadline = (): void => {
    if (Date.now() > deadline) throw new Error('运行超时：触发全局安全阀（10 分钟）');
  };

  /** 执行单节点，返回"路由结果"：接下来该入队的节点 id 列表 */
  const execute = async (node: WfNode): Promise<string[]> => {
    onStatus(node.id, 'running');
    assertWithinDeadline(); // 每个节点执行前检查一次
    try {
      switch (node.type) {
        case 'http': {
          const { url, method = 'GET' } = node.data as { url: string; method?: 'GET' | 'POST' };
          const res = await fetch(url, { method });
          Object.assign(variables, await res.json()); // 输出并入上下文
          break; // 落到末尾的"成功 + next"
        }
        case 'condition': {
          const { branches, default: fallback } = node.data as ConditionData;
          for (const branch of branches) {
            if (evalCondition(branch.when, variables)) {
              onStatus(node.id, 'success');
              return branch.next; // 互斥单选：第一个命中即路由
            }
          }
          onStatus(node.id, 'success');
          return fallback;
        }
        case 'parallel': {
          const { joinId } = node.data as ParallelData;
          onStatus(node.id, 'success');
          // fork：全部分支并发推进，每条分支各自执行到 join 前停下（runBranch 的 stopAt）
          await Promise.all(node.next.map(branchStart => runBranch(branchStart, joinId)));
          const join = nodeById.get(joinId);
          return join ? join.next : []; // 汇合后放行 join 的后继（mode: 'all' 语义）
        }
        case 'loop': {
          const data = node.data as LoopData;
          onStatus(node.id, 'success');
          for (let round = 0; round < data.count; round++) {
            await runBranch(data.bodyStart, data.bodyEnd); // 跑一轮循环体区段
            if (evalCondition(data.breakWhen, variables)) break; // 命中跳出条件提前结束
          }
          return node.next; // 正常出口
        }
        case 'start':
        case 'join':
        case 'end':
          break; // 纯控制节点：无副作用，直接走 next
      }
      onStatus(node.id, 'success');
      return node.next;
    } catch (err) {
      onStatus(node.id, 'error');
      throw err; // 上抛终止整个 run（生产实现应支持 error 分支续跑与超时控制）
    }
  };

  /** 沿单链推进：start 一路向后；分支/循环体场景下走到 stopAt 停 */
  const runBranch = async (startId: string, stopAt?: string): Promise<void> => {
    let cursor: string | undefined = startId;
    while (cursor !== undefined && cursor !== stopAt) {
      const node = nodeById.get(cursor);
      if (!node) throw new Error(`未找到节点 ${cursor}`);
      const next = await execute(node);
      cursor = next[0]; // 链内节点取首个后继推进；多后继的路由已在 execute 内处理
    }
  };

  const start = dsl.nodes.find(n => n.type === 'start');
  if (!start) throw new Error('缺少 start 节点');
  await runBranch(start.id);
}
```

（生产化清单：http 节点加超时与重试、condition 支持 &&/|| 组合谓词（届时直接复用场景 3 的条件树协议）、并行 `mode: 'any'` 的取消传播、断点续跑。这个 mini 版的价值在于**语义正确**——它就是上面三个 JSON 的可执行注释。）

**常见坑**：

- **症状**：并行分支里有一个节点失败，join 永远等不齐，流程挂起。**根因**：`mode: 'all'` 只数"到达"，失败分支抛错后没有 token 到达 join。**修法**：失败也计为一种到达（携带 error 状态），由 join 的失败策略（fail-fast 或忽略失败分支）决定放行行为。
- **症状**：循环体里的节点状态在画布上"闪"——running/success 高速交替。**根因**：每轮循环都推送状态，多轮循环在视觉上叠成频闪。**修法**：2.5 的 rAF 聚合天然把频闪压成最终态；再给 loop 节点的 data 加"当前轮次"徽标，比频闪更有信息量。
- **症状**：编辑器里 loop 的 bodyStart/bodyEnd 改了，画布上没有任何连线提示循环范围。**根因**：循环区段不占边，画布不可见。**修法**：渲染层给 `bodyStart..bodyEnd` 区段画一条**虚线回边**（仅视觉，不进邻接表）+ 区段底色蒙版——视觉有环、结构无环，两个世界各取所需。

### 对标：n8n（源码可读性好）、Dify、Langflow、bpmn.js（重量级 BPMN，按需）

对标行保留并展开——四个项目按"定位 + 对前端作者的参考价值 + 可读性"评价：

- **n8n**：工作流自动化平台，400+ 集成节点生态最大。前端 Vue 3（editor-ui 包），但**源码可读性是四者中最好的**：节点协议（`INodeType` 声明式描述 + `execute` 执行函数分离）、参数体系（`INodeProperties` 就是 Setter 的字段声明——声明式 schema 驱动表单）、连线校验、执行事件流（前端订阅 run data 更新节点状态，正是 2.5 的课题），目录结构按职责切分清晰。做通用工作流编辑器，**首选精读**——即便技术栈是 Vue，概念与 React Flow 完全同构。
- **Dify**：LLM 应用编排平台，定位是"AI 应用"而非通用自动化：节点粒度大（LLM/知识检索/HTTP/条件分支），DSL 是 YAML（应用导出格式），面向 AI 工程师。前端 React + React Flow，其自定义节点（参数面板内嵌节点、调试侧栏、单节点试运行）与 F2 画像完全对得上；monorepo 里前后端耦合较深，可读性中等，按需查阅（节点 UI 与运行日志面板值得抄）。
- **Langflow**：Python 生态的 LLM 流程编排（后端 Python，前端 React Flow）。前端代码对 React Flow 的用法覆盖全面——多 handle 类型、端口校验、拖入面板、聊天试运行；仓库以 Python 为主，前端阅读入口在 `frontend`，可读性中等偏上。适合对照"React Flow 的边界在哪"：它的节点参数面板比 Dify 薄，但画布交互做得很满。
- **bpmn.js**：Camunda 出品的 BPMN 2.0 标准编辑器/渲染器，重量级选手。定位是**标准业务流程**（审批流、跨系统流程），强在：符合 BPMN 2.0 XML 规范、可直接对接 Activiti/Flowable/Camunda 流程引擎、语义完备（事件、网关、泳道、边界事件）。代价：自定义节点要学它的扩展体系（moddle 定义、palette/provider 注册），改造成本显著高于 React Flow 从零写。**按需选择**：做"标准审批流对接流程引擎"上 bpmn.js；做"产品内的工作流编排"（本章语境）React Flow + 自定义 DSL 更自由、更轻。

一句话收束本章：n8n 教你节点协议怎么设计，Dify/Langflow 教你 AI 编排的节点形态怎么做，bpmn.js 提醒你标准化是有代价的——而这一切的底座，就是 2.1 的 DSL + 2.2 的自定义节点 + 2.5 的运行态更新管道。

## 3. 动态查询构建器 / 规则引擎 UI ★全量展开

**画像**："当 `amount > 100` 且 `city ∈ [北京, 上海]` 时触发告警"——告警规则、自动化条件、高级筛选、审批流条件分支，中后台高频刚需。

先把"画像"两个字拆开看：这一章做的不是"一个查询输入框"，而是**给非程序员用户一个图形化的布尔表达式编辑器**。用户在界面上点选字段、选操作符、填值、用"且/或"组织起来，最终产出一棵**可序列化为 JSON 的条件树**。这棵树可以被前端即时求值（试运行），也可以转换成 json-logic 交给后端规则引擎、转换成 SQL 交给数据库、转换成 ES DSL 交给搜索引擎——**编辑一次，处处可执行**。这就是它在全书场景表里被标为 ★★★（"新且高价值，优先做"）的原因：内核全是现成的，产出却是一个完整的高频业务功能。

### 3.0 画像展开：四类业务与共同抽象

#### 3.0.1 四类业务的产品形态

**① 告警规则（监控 / 风控 / SaaS 计费告警）**
产品形态：一个"规则列表页 + 配置抽屉"。用户创建规则时填三样东西——**触发条件（本章主角）**、通知方式（电话/短信/钉钉）、静默期（多久内不重复告）。执行方是后端规则引擎：数据流（指标、订单、日志）每来一条，后端取出该租户的规则集，逐条求值，命中则触发动作。典型条件："`cpu > 80%` 持续 5 分钟 **且** `env = 生产`"。特点：规则**低频编辑、高频执行**，一条规则一天可能被求值百万次——所以保存时转成 json-logic 这类可被后端直接执行的结构，而不是每次执行前再解析 UI 协议。

**② 自动化条件（营销自动化 / 工作流触发器，对标 n8n、HubSpot Workflow）**
产品形态：工作流编辑器（本书场景 2）里的"触发节点"或"条件分支节点"的配置面板。"当 `订单金额 > 1000` **且**（`客户等级 = VIP` **或** `复购次数 > 3`）时，发送感谢邮件并分配专属客服"。特点：条件树嵌在工作流 DSL 内部，是节点 `data` 的一部分；条件命中决定流程走哪条边——所以它和场景 2 的节点 DSL 是**嵌套关系**而非并列关系。

**③ 高级筛选（数据表格的 Filter，对标 Retool、Jira 的过滤面板）**
产品形态：表格上方的一组"过滤行 + 添加条件按钮"，支持把若干行包成一组切换且/或。用户想要的往往是一个**临时查询**："给我看 `金额 between 100–500` **且**（`城市 in [北京, 上海]` **或** `销售 = 张三`）的订单"。特点：**高频编辑、即编即用**，条件树通常序列化进 URL（分享筛选视图），提交时转换成 SQL/Mongo/ES 查询发给数据接口；用户不会点"保存规则"，关闭即丢。这对编辑器的"开箱即用性"要求最高——初始只渲染一行，不要一上来甩一个空组给用户。

**④ 审批流条件分支（OA / BPM）**
产品形态：流程设计器里的"条件网关节点"，每个出边挂一棵条件树。"金额 < 1000 → 主管直批；否则 → 部门总监 **与** 财务会签"。特点：多棵条件树并排展示（每条出边一棵），且通常要求**互斥且完备**（任何数据恰好命中一条边）——这引出独有的校验需求：分支覆盖检查（这属于工作流引擎范畴，本章只负责单棵树的编辑与校验）。

#### 3.0.2 共同抽象：一条公式

四类业务的"动作端"完全不同（通知 / 执行流 / 过滤 / 路由），但"条件端"完全同构：

```text
规则 = 条件树（何时） + 动作（做什么）
              ↑ 本章只做这一半
```

条件端可以抽象成四件套，也正是本章"核心技术"8 条的目录：

1. **协议**：一棵递归的条件树 JSON（§3.1）——所有业务的唯一数据契约；
2. **编辑器**：递归渲染的 QueryGroup/QueryRow（§3.2）+ 元数据驱动的字段/操作符/值联动（§3.3、§3.4）；
3. **转换层**：一棵树 → json-logic / Mongo / ES DSL / SQL（§3.5）——同一编辑器服务四种执行端；
4. **质量保障**：校验（§3.6）+ 试运行（§3.7）+ 模板与版本 diff（§3.8）。

还要点破一层：条件树是《进阶大纲》§1 递归渲染器内核的**第 N 次复用**——本文档开头那条"暗线"说的就是它。动态表单渲染的是"异构节点树"（每个 type 对应不同组件，靠注册表分发），条件树渲染的是"同构二态树"（只有组、行两类节点，靠 discriminated union 分发）。树更简单，但**编辑难度反而更高**：动态表单的树很少在运行时被用户增删挪，条件树的每一个节点都要支持增、删、复制、换位置——递归不止用在渲染，还要用在不可变更新上。

### 核心技术

#### 3.1 条件树协议（递归结构！）

**是什么**：一份 JSON，能表达任意深度的"且/或"条件组合。原文协议长这样：

```json
{ "combinator": "and", "conditions": [
  { "field": "amount", "operator": ">", "value": 100 },
  { "combinator": "or", "conditions": [ ... ] }
]}
```

**为什么需要**：先看一个真实业务需求，理解为什么**必须**递归，而不是"给一排条件行加一个全局且/或开关"就够了。

风控需求原文："订单金额大于 100，且（城市在北京或上海，或者客户是 VIP）时，人工复核"。翻译成逻辑式：

```text
amount > 100 AND (city IN [北京, 上海] OR isVip = true)
```

"且中带或"——`AND` 的一个操作数本身是一个 `OR` 表达式。如果协议只有一层（所有条件平铺 + 一个全局组合器），这个式子表达不出来。理论上可以用分配律展开成析取范式（DNF）：

```text
(amount > 100 AND city = 北京) OR (amount > 100 AND city = 上海) OR (amount > 100 AND isVip = true)
```

能表达了，但代价惨重：`amount > 100` 被复制了 3 份；每多一个 OR 内的分支，重复次数就翻一倍；用户在 UI 上看到的是三条"看起来无关"的规则，改阈值要改三处，漏改一处就是线上事故。**递归分组是唯一既无冗余、又与用户心智模型（"这堆条件是一伙的"）对齐的结构**。这也是为什么 Grafana、react-querybuilder、Retool 的过滤条件全部采用"可嵌套的条件组"。

**怎么做——原文 JSON 逐字段讲解**：

- `combinator`：组级组合器，`"and"`（组内所有子条件都满足，组才为真）或 `"or"`（任一满足即为真）。它属于**组**，不属于单个条件——这是新手最常画错的一笔：条件行自己没有"且/或"属性，行与行之间如何连接由父组的 combinator 决定。
- `conditions`：子节点数组，元素是**异质**的——既可以是条件，也可以是嵌套的组，顺序即求值展示顺序。
- 第 2 行 `field` / `operator` / `value`：条件三要素。`field` 是字段名（必须能在字段元数据表里查到，§3.3）；`operator` 是操作符字符串；`value` 是比较值，**类型随操作符变化**（`>` 配数字、`in` 配数组、`between` 配二元数组、`isEmpty` 配空）——这一条是后面坑 1 的伏笔。
- 第 3 行：又一个 `combinator + conditions` 的对象——递归发生的地方。这个内层组的组合器是 `"or"`，与外层的 `"and"` 独立，于是实现了"且中带或"。深度没有协议上限（上限由 §3.6 的校验把门）。

**这个最小协议有两个生产级缺陷**，扩写时必须补上：

1. **类型判别靠"有没有 `conditions` 键"**。TypeScript 写不出"有 conditions 键就是组"的宽松判别联合（能写，但要靠 `in` 操作符收窄，运行时一旦两个字段同时出现就静默判错）。更稳的做法是给每类节点一个显式的 `kind` 判别字段，形成标准的 discriminated union——`switch (node.kind)` 即可穷尽分支，编译器会强制你处理所有情况。
2. **节点没有 `id`**。没有 id，React 列表只能用数组下标当 key——增删行时 key 错位引发状态串行（输入框里上一位用户填的值跑到下一行）；错误无法定位到具体行（§3.6）；拖拽无法标识拖的是谁（§3.2）；复制粘贴无法去重。id 是整个编辑器交互层的地基。

**代码——完整 TS 协议**：

```ts
// condition-tree.ts —— 条件树协议：全章唯一的数据契约
export type Combinator = 'and' | 'or'

/** 操作符全集。注意：它同时是"协议常量"和"UI 下拉项来源"，扩操作符先扩这里 */
export type Operator =
  | '=' | '!=' | '>' | '>=' | '<' | '<='      // 数值/日期/字符串通用比较
  | 'in' | 'notIn'                            // 值 ∈ 数组（枚举多选）
  | 'contains' | 'notContains'                // 字符串包含
  | 'between' | 'notBetween'                  // 区间（value 恒为二元数组）
  | 'isEmpty' | 'isNotEmpty'                  // 无值操作符（value 恒为 null）

/** 单个条件：字段 + 操作符 + 值 */
export interface ConditionNode {
  kind: 'condition'                // 判别字段：TS 据此做类型收窄
  id: string                       // React key / 错误定位 / 拖拽标识
  field: string                    // 字段名，必须存在于字段元数据表
  operator: Operator
  value: unknown                   // 类型由 (field, operator) 二元组决定，§3.3
}

/** 条件组：组合器 + 任意数量的子节点（条件或更深的组）——递归发生地 */
export interface GroupNode {
  kind: 'group'
  id: string
  combinator: Combinator
  children: ConditionTreeNode[]
}

/** 判别联合：两种节点，一个 switch 穷尽 */
export type ConditionTreeNode = ConditionNode | GroupNode

/** 根必须是组：保证序列化结果永远是一个合法的"完整表达式"，而非裸条件 */
export type ConditionTree = GroupNode

/** id 生成：优先用平台随机 UUID，退化到时间戳+随机数（不引第三方依赖） */
export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
```

补齐 `kind` 与 `id` 后，本章开头的业务需求落成协议是这样（后面所有小节都拿它当贯穿示例，记作"金额复核规则"）：

```json
{
  "kind": "group",
  "id": "g_root",
  "combinator": "and",
  "children": [
    { "kind": "condition", "id": "c_1", "field": "amount", "operator": ">", "value": 100 },
    {
      "kind": "group",
      "id": "g_2",
      "combinator": "or",
      "children": [
        { "kind": "condition", "id": "c_3", "field": "city", "operator": "in", "value": ["北京", "上海"] },
        { "kind": "condition", "id": "c_4", "field": "isVip", "operator": "=", "value": true }
      ]
    }
  ]
}
```

**常见坑（协议层）**：
- 症状：后端反序列化报 `Cannot read properties of undefined`，排查发现某节点 `kind` 是 `"conditon"`（拼写错误）。
- 根因：协议没有运行时校验，畸形数据一路穿透到渲染层才炸。
- 修法：入口处用 ajv（或 zod）对 ConditionTree 做一次 schema 校验，不合法直接拒收并上报——后端回填的历史数据同样要过这道闸。协议是契约，契约必须有守门人。

#### 3.2 递归渲染 QueryGroup / QueryRow

**是什么**：把上面的协议树递归渲染成两组件树——`QueryGroup`（渲染组：头部工具条 + 子节点列表）与 `QueryRow`（渲染条件行：字段/操作符/值三个控件 + 复制删除拖拽把手）。组的增删、复制、嵌套生成子组、拖拽排序、组合器切换，全部发生在这两层。

**为什么需要**：树形数据配递归渲染，这正是《进阶大纲》§1.3 递归渲染器内核的本行。与动态表单那次的差别只有两点：节点种类从"N 种（注册表分发）"缩到"2 种（discriminated union 分发）"；交互从"只读渲染 + 少量编辑"升级为"每个节点可增删改挪"——于是**不可变树更新**成了与渲染同等重要的第二条递归链。

**怎么做（机制分步）**：

1. **单一数据源**：整棵树只存在根组件一个 `state` 里（受控：`value` + `onChange`），子组件不持有任何树数据，只通过 Context 调动作函数。任何编辑 = "一棵树 → 另一棵树"的纯函数变换。
2. **动作层**：增（`insertChild`）、删（`removeNodeById`，空组自动剪枝）、改（`updateNodeById`）、复制（`deepCloneWithNewIds`——id 必须重新生成，否则 React key 撞车、定位错乱）、挪（`moveNode`，含组内排序下标修正与防环）。
3. **渲染层**：`QueryGroup` 内部再渲染 `QueryGroup`——递归自然表达嵌套；条件行包一层可排序容器参与拖拽。
4. **组合器两处交互**：组头部一个下拉（显式切换），行与行之间一个小 chip（点击即切换所属组的组合器，react-querybuilder 的招牌交互）；两处操作的是同一个字段 `group.combinator`。
5. **视觉层级**：每层组左缩进 + 圆角边框 + 按深度渐变的背景色，深度以角标显示；缩进封顶策略在坑 3 详述。

先装依赖（拖拽用 dnd-kit，《进阶大纲》§1.6 拖拽原理精讲的同款库）：

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**代码——第一步：树的不可变更新工具集**（纯函数，可单测，与 React 解耦）：

```ts
// tree-ops.ts —— 所有编辑动作都归结为"一棵树 → 另一棵树"
import {
  type ConditionNode,
  type ConditionTree,
  type ConditionTreeNode,
  type Combinator,
  type GroupNode,
  type Operator,
} from './condition-tree'
import { genId } from './condition-tree'

export function createCondition(
  field: string,
  operator: Operator = '=',
  value: unknown = null,
): ConditionNode {
  return { kind: 'condition', id: genId(), field, operator, value }
}

export function createGroup(
  children: ConditionTreeNode[] = [],
  combinator: Combinator = 'and',
): GroupNode {
  return { kind: 'group', id: genId(), combinator, children }
}

/** 深拷贝并重新生成所有 id——复制行/组、套用模板（§3.8）都必须走这里，id 绝不能撞 */
export function deepCloneWithNewIds(node: ConditionTreeNode): ConditionTreeNode {
  if (node.kind === 'group') {
    return { ...node, id: genId(), children: node.children.map(deepCloneWithNewIds) }
  }
  return { ...node, id: genId() }
}

export function findNodeById(node: ConditionTreeNode, id: string): ConditionTreeNode | null {
  if (node.id === id) return node
  if (node.kind === 'group') {
    for (const child of node.children) {
      const hit = findNodeById(child, id)
      if (hit) return hit
    }
  }
  return null
}

/** 找父组：拖拽落点计算、错误路径展示都要用 */
export function findParentGroup(root: ConditionTree, nodeId: string): GroupNode | null {
  if (root.children.some(c => c.id === nodeId)) return root
  for (const child of root.children) {
    if (child.kind === 'group') {
      const hit = findParentGroup(child, nodeId)
      if (hit) return hit
    }
  }
  return null
}

/** candidateId 是否在 ancestorId 的子树内（不含自身）——拖拽防环用 */
export function isInSubtree(root: ConditionTree, ancestorId: string, candidateId: string): boolean {
  const ancestor = findNodeById(root, ancestorId)
  if (!ancestor || ancestor.kind !== 'group') return false
  return containsId(ancestor, candidateId)
}

function containsId(group: GroupNode, id: string): boolean {
  if (group.children.some(c => c.id === id)) return true
  return group.children.some(c => c.kind === 'group' && containsId(c, id))
}

/** 通用改写：按 id 找到节点，替换为新节点（不可变：一路浅拷贝路径上的节点） */
export function updateNodeById(
  root: ConditionTree,
  id: string,
  updater: (n: ConditionTreeNode) => ConditionTreeNode,
): ConditionTree {
  const walk = (n: ConditionTreeNode): ConditionTreeNode => {
    if (n.id === id) return updater(n)
    if (n.kind === 'group') return { ...n, children: n.children.map(walk) }
    return n
  }
  return walk(root) as ConditionTree
}

/** 删除：被掏空的组整组剪掉（用户删掉子组最后一行，预期子组也消失）；根组不可删，兜底空组 */
export function removeNodeById(root: ConditionTree, id: string): ConditionTree {
  const walk = (n: ConditionTreeNode): ConditionTreeNode | null => {
    if (n.id === id) return null
    if (n.kind === 'group') {
      const children = n.children
        .map(walk)
        .filter((c): c is ConditionTreeNode => c !== null)
      return children.length > 0 ? { ...n, children } : null
    }
    return n
  }
  return walk(root) ?? createGroup()
}

export function insertChild(
  root: ConditionTree,
  groupId: string,
  node: ConditionTreeNode,
  index?: number,
): ConditionTree {
  return updateNodeById(root, groupId, g => {
    if (g.kind !== 'group') return g
    const children = [...g.children]
    children.splice(index ?? children.length, 0, node) // 不传 index = 追加到末尾
    return { ...g, children }
  })
}

/** 拖拽统一入口：跨组移动 + 组内排序，含两处关键修正 */
export function moveNode(
  root: ConditionTree,
  sourceId: string,
  targetGroupId: string,
  targetIndex: number,
): ConditionTree {
  if (sourceId === targetGroupId) return root
  const source = findNodeById(root, sourceId)
  if (!source) return root
  // 修正一：把组拖进它自己的子树 = 制造环（组成为自己的祖先），直接拒绝
  if (source.kind === 'group' && isInSubtree(root, sourceId, targetGroupId)) return root

  const parent = findParentGroup(root, sourceId)
  if (parent?.id === targetGroupId) {
    // 同组内排序：不能"先删后插"（删除会让目标下标位移），一步完成并补偿下标
    return updateNodeById(root, targetGroupId, g => {
      if (g.kind !== 'group') return g
      const from = g.children.findIndex(c => c.id === sourceId)
      if (from < 0) return g
      const children = [...g.children]
      const [moved] = children.splice(from, 1)
      // 修正二：向下移动时，原位置的删除让目标位"前移"一位，这里减回来
      children.splice(from < targetIndex ? targetIndex - 1 : targetIndex, 0, moved)
      return { ...g, children }
    })
  }
  // 跨组：先摘下（原父组若被掏空会自动剪枝），再插入目标组
  const removedRoot = removeNodeById(root, sourceId)
  return insertChild(removedRoot, targetGroupId, source, targetIndex)
}

/** 条件总数与嵌套深度——§3.6 校验上限的计算基础 */
export function countConditions(node: ConditionTreeNode): number {
  if (node.kind === 'condition') return 1
  return node.children.reduce((sum, c) => sum + countConditions(c), 0)
}

export function treeDepth(node: ConditionTreeNode): number {
  if (node.kind === 'condition') return 0
  return 1 + Math.max(0, ...node.children.map(treeDepth)) // 空组深度记 1（根组 = 1）
}
```

**代码——第二步：编辑器组件族**。Context 下发动作与上下文，根组件组装状态、校验（§3.6 的 `validateTree` 此处先当黑盒，下一文件实现）与 DnD：

```tsx
// QueryBuilder.tsx —— 编辑器根组件：持有状态 + 组织拖拽 + 下发错误信息
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type Combinator,
  type ConditionNode,
  type ConditionTree,
  type ConditionTreeNode,
  type GroupNode,
  type Operator,
} from './condition-tree'
import {
  countConditions,
  createCondition,
  createGroup,
  deepCloneWithNewIds,
  findNodeById,
  findParentGroup,
  insertChild,
  moveNode as moveNodeInTree,
  removeNodeById,
  updateNodeById,
} from './tree-ops'
import {
  type FieldMeta,
  OPERATOR_LABELS,
  applyFieldChange,
  applyOperatorChange,
  resolveValueEditor,
} from './field-meta'
import { validateTree, type TreeValidationError, type ValidationOptions } from './validator'
import { valueEditorRegistry } from './value-editors'

/* ---------------- Context：动作 + 上下文，一次下发，深层取用 ---------------- */

interface QueryBuilderContextValue {
  fieldMap: Map<string, FieldMeta>
  fieldList: FieldMeta[]
  errors: Map<string, TreeValidationError> // nodeId → 错误（§3.6 产出，行内标红用）
  updateNode(id: string, updater: (n: ConditionTreeNode) => ConditionTreeNode): void
  removeNode(id: string): void
  addCondition(groupId: string): void
  addGroup(groupId: string): void
  duplicateNode(id: string): void
  setCombinator(groupId: string, combinator: Combinator): void
  moveNode(sourceId: string, targetGroupId: string, targetIndex: number): void
}

const QueryBuilderContext = createContext<QueryBuilderContextValue | null>(null)

function useQueryBuilder(): QueryBuilderContextValue {
  const ctx = useContext(QueryBuilderContext)
  if (!ctx) throw new Error('QueryGroup / QueryRow 必须渲染在 <QueryBuilder> 内部')
  return ctx
}

/* ---------------- 根组件 ---------------- */

export interface QueryBuilderProps {
  fields: FieldMeta[]                                  // 字段元数据表（§3.3）
  value: ConditionTree                                 // 受控：树由外部持有
  onChange: (next: ConditionTree) => void
  validation?: Partial<ValidationOptions>              // 深度/条件数上限（§3.6）
}

export function QueryBuilder({ fields, value, onChange, validation }: QueryBuilderProps) {
  const fieldMap = useMemo(() => new Map(fields.map(f => [f.name, f])), [fields])

  // 校验错误集中计算一次，按 nodeId 建索引下发给行（定位到行的 UI 提示，§3.6）
  const errors = useMemo(() => {
    const list = validateTree(value, fieldMap, {
      maxDepth: validation?.maxDepth ?? 5,
      maxConditions: validation?.maxConditions ?? 30,
    })
    return new Map(list.map(e => [e.nodeId, e]))
  }, [value, fieldMap, validation?.maxDepth, validation?.maxConditions])

  /* 动作层：全部是 tree-ops 纯函数的一行包装 */
  const updateNode = useCallback(
    (id: string, updater: (n: ConditionTreeNode) => ConditionTreeNode) =>
      onChange(updateNodeById(value, id, updater)),
    [value, onChange],
  )
  const removeNode = useCallback(
    (id: string) => onChange(removeNodeById(value, id)),
    [value, onChange],
  )
  const addCondition = useCallback(
    (groupId: string) => {
      const firstField = fields[0] // 新行默认选第一个字段，操作符/值由元数据推导
      const row = firstField
        ? createCondition(firstField.name, firstField.operators[0], firstField.defaultValue ?? null)
        : createCondition('')
      onChange(insertChild(value, groupId, row))
    },
    [value, onChange, fields],
  )
  const addGroup = useCallback(
    (groupId: string) => onChange(insertChild(value, groupId, createGroup([createCondition(fields[0]?.name ?? '')]))),
    [value, onChange, fields],
  )
  const duplicateNode = useCallback(
    (id: string) => {
      const node = findNodeById(value, id)
      if (!node) return
      const parent = findParentGroup(value, id)
      if (!parent) return
      const index = parent.children.findIndex(c => c.id === id)
      onChange(insertChild(value, parent.id, deepCloneWithNewIds(node), index + 1)) // 复制件紧跟原件
    },
    [value, onChange],
  )
  const setCombinator = useCallback(
    (groupId: string, combinator: Combinator) =>
      onChange(updateNodeById(value, groupId, g => (g.kind === 'group' ? { ...g, combinator } : g))),
    [value, onChange],
  )
  const doMove = useCallback(
    (sourceId: string, targetGroupId: string, targetIndex: number) =>
      onChange(moveNodeInTree(value, sourceId, targetGroupId, targetIndex)),
    [value, onChange],
  )

  const ctxValue = useMemo<QueryBuilderContextValue>(
    () => ({
      fieldMap, fieldList: fields, errors,
      updateNode, removeNode, addCondition, addGroup, duplicateNode, setCombinator, moveNode: doMove,
    }),
    [fields, fieldMap, errors, updateNode, removeNode, addCondition, addGroup, duplicateNode, setCombinator, doMove],
  )

  /* 拖拽：distance:5 激活约束——按下未移动 5px 内不算拖拽，保住行内控件的点击 */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return
      const activeId = String(active.id)
      const overId = String(over.id)
      if (activeId === overId) return

      if (overId.startsWith('group-body:')) {
        // 落在组的"身体"空白区（空组/折叠组的兜底落点）→ 追加到该组末尾
        const groupId = overId.slice('group-body:'.length)
        const group = findNodeById(value, groupId)
        if (group?.kind === 'group') doMove(activeId, groupId, group.children.length)
        return
      }

      const overNode = findNodeById(value, overId)
      if (overNode?.kind === 'group') {
        doMove(activeId, overId, overNode.children.length) // 落在组标题上 → 追加进该组
        return
      }
      const parent = findParentGroup(value, overId)
      if (!parent) return
      const index = parent.children.findIndex(c => c.id === overId)
      doMove(activeId, parent.id, index) // 落在某一行上 → 插到它前面
    },
    [value, doMove],
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <QueryBuilderContext.Provider value={ctxValue}>
        <style>{QB_CSS}</style>
        <div className="qb-root">
          <QueryGroup node={value} depth={1} isRoot />
        </div>
      </QueryBuilderContext.Provider>
    </DndContext>
  )
}

/* ---------------- 组：头部工具条 + 子节点列表 ---------------- */

function QueryGroup({ node, depth, isRoot = false }: {
  node: GroupNode
  depth: number
  isRoot?: boolean
}) {
  const { removeNode, addCondition, addGroup, duplicateNode, setCombinator } = useQueryBuilder()
  const sortable = useSortable({ id: node.id, disabled: isRoot }) // 根组没有同级，不可拖
  const body = useDroppable({ id: `group-body:${node.id}` })      // 空组的兜底落点

  return (
    <div
      ref={sortable.setNodeRef}
      className="qb-group"
      data-depth={Math.min(depth, 4)}                              // 深度 → 边框色阶（CSS 见下）
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }}
    >
      <div className="qb-group-header">
        {/* 组合器交互第 1 处：组头下拉，显式、可发现性好，适合新手 */}
        <select
          aria-label="组合器"
          className="qb-combinator"
          value={node.combinator}
          onChange={e => setCombinator(node.id, e.target.value as Combinator)}
        >
          <option value="and">全部满足（且）</option>
          <option value="or">任一满足（或）</option>
        </select>
        <span className="qb-depth-badge">L{depth} · {countConditions(node)} 条</span>
        <span className="qb-spacer" />
        {!isRoot && (
          /* 拖拽把手必须独立成元素：把 listeners 铺在整块容器上会吞掉组内按钮的点击 */
          <span className="qb-drag-handle" title="拖拽整组" {...sortable.attributes} {...sortable.listeners}>⠿</span>
        )}
        <button type="button" onClick={() => addCondition(node.id)}>+ 条件</button>
        <button type="button" onClick={() => addGroup(node.id)}>+ 子组</button>
        {!isRoot && (
          <>
            <button type="button" onClick={() => duplicateNode(node.id)}>复制组</button>
            <button type="button" onClick={() => removeNode(node.id)}>删除组</button>
          </>
        )}
      </div>
      <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="qb-group-body" ref={body.setNodeRef}>
          {node.children.map((child, i) => (
            <div className="qb-child" key={child.id}>
              {/* 组合器交互第 2 处：行间 chip，点击即切换所属组且/或——两处改的是同一个字段 */}
              {i > 0 && <InlineCombinator groupId={node.id} combinator={node.combinator} />}
              {child.kind === 'group'
                ? <QueryGroup node={child} depth={depth + 1} />
                : <SortableRow id={child.id}><QueryRow node={child} /></SortableRow>}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

/* 行间的且/或 chip：react-querybuilder 的招牌交互，高级用户最爱 */
function InlineCombinator({ groupId, combinator }: { groupId: string; combinator: Combinator }) {
  const { setCombinator } = useQueryBuilder()
  return (
    <button
      type="button"
      className={`qb-chip qb-chip--${combinator}`}
      title="点击切换 且/或"
      onClick={() => setCombinator(groupId, combinator === 'and' ? 'or' : 'and')}
    >
      {combinator === 'and' ? '且' : '或'}
    </button>
  )
}

/* ---------------- 条件行 ---------------- */

function QueryRow({ node }: { node: ConditionNode }) {
  const { fieldMap, fieldList, errors, updateNode, removeNode, duplicateNode } = useQueryBuilder()
  const field = fieldMap.get(node.field)
  const error = errors.get(node.id)                       // 校验错误定位到行（§3.6）
  const editorType = field ? resolveValueEditor(field, node.operator) : 'none'
  const ValueEditor = valueEditorRegistry[editorType]     // 元数据驱动：查表得组件（§3.3/§3.4）

  return (
    <div className={`qb-row${error ? ' qb-row--error' : ''}`}>
      <select
        aria-label="字段"
        value={node.field}
        onChange={e =>
          updateNode(node.id, n => applyFieldChange(n as ConditionNode, e.target.value, fieldMap))
        }
      >
        {/* deprecated 字段对"新选择"隐藏，但已选中时仍可见（坑 2 的下线策略） */}
        {fieldList.filter(f => f.deprecated !== true || f.name === node.field).map(f => (
          <option key={f.name} value={f.name}>{f.label}</option>
        ))}
      </select>
      <select
        aria-label="操作符"
        value={node.operator}
        disabled={!field}
        onChange={e =>
          updateNode(node.id, n =>
            applyOperatorChange(n as ConditionNode, e.target.value as Operator, field),
          )
        }
      >
        {(field?.operators ?? []).map(op => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>
      <ValueEditor
        value={node.value}
        onChange={next => updateNode(node.id, n => ({ ...(n as ConditionNode), value: next }))}
        field={field}
        operator={node.operator}
      />
      <button type="button" className="qb-icon-btn" title="复制" onClick={() => duplicateNode(node.id)}>⧉</button>
      <button type="button" className="qb-icon-btn" title="删除" onClick={() => removeNode(node.id)}>✕</button>
      {error && <div className="qb-row-error" role="alert">{error.message}</div>}
    </div>
  )
}

/* 行的可排序外壳：拖拽把手 + 位移动画 */
function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className="qb-sortable-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span className="qb-drag-handle" title="拖拽排序" {...attributes} {...listeners}>⠿</span>
      {children}
    </div>
  )
}

/* ---------------- 视觉层级：缩进 + 边框 + 深度色阶 ---------------- */
const QB_CSS = `
.qb-root { font: 13px/1.6 system-ui, 'PingFang SC', sans-serif; color: #1f2329; }
.qb-group {
  border: 1px solid #d8dde5; border-radius: 8px; padding: 8px;
  margin-left: 16px;                       /* 每深一层缩进 16px——封顶策略见坑 3 */
  background: #fff;
}
.qb-group[data-depth="1"] { margin-left: 0; background: #fafbfc; }
.qb-group[data-depth="2"] { background: #f7f9fb; }
.qb-group[data-depth="3"] { background: #f3f6f9; border-color: #c6d0dc; }
.qb-group[data-depth="4"] { background: #eff3f7; border-color: #b9c6d6; } /* 4 层以上同色，靠边框叠加表达层级 */
.qb-group-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.qb-depth-badge { font-size: 11px; color: #8a919c; }
.qb-spacer { flex: 1; }
.qb-child { display: flex; flex-direction: column; align-items: stretch; }
.qb-sortable-row { display: flex; align-items: center; gap: 6px; background: #fff; border-radius: 6px; }
.qb-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; flex: 1;
  padding: 4px 6px; border: 1px solid transparent; border-radius: 6px;
}
.qb-row--error { border-color: #f5222d; background: #fff1f0; }
.qb-row-error { flex-basis: 100%; color: #f5222d; font-size: 12px; }
.qb-chip {
  align-self: center; border: 1px dashed #b6bec9; background: #fff; border-radius: 10px;
  padding: 0 10px; font-size: 12px; color: #4e5969; cursor: pointer; line-height: 18px;
}
.qb-chip--or { border-color: #ff9c6e; color: #d4380d; }
.qb-drag-handle { cursor: grab; color: #98a2b3; padding: 0 2px; user-select: none; }
.qb-icon-btn { border: none; background: none; cursor: pointer; color: #667085; }
`
```

使用方式（受控组件，和任何表单库都能拼）：

```tsx
// App.tsx —— 最小使用示例：初始为"金额复核规则"
import { useState } from 'react'
import { QueryBuilder } from './QueryBuilder'
import { createCondition, createGroup, type ConditionTree } from './condition-tree'
import { ORDER_FIELDS } from './field-meta'

const initialTree: ConditionTree = createGroup([
  createCondition('amount', '>', null),
  createGroup([createCondition('city', 'in', [])], 'or'),
])

export function AlertRuleEditor() {
  const [tree, setTree] = useState<ConditionTree>(initialTree)
  return (
    <div>
      <QueryBuilder fields={ORDER_FIELDS} value={tree} onChange={setTree} />
      <pre>{JSON.stringify(tree, null, 2)}</pre> {/* 调试期永远把协议亮出来 */}
    </div>
  )
}
```

**拖拽要点小结**（上面代码里分散落位，这里收拢）：

1. **把手独立成元素**：dnd-kit 的 `listeners` 若铺在组/行整块容器上，会把子控件（select、按钮）的 pointerdown 一并吞掉——表现为"点开字段下拉就变成拖拽"。正解是把 listeners 只绑在 ⠿ 把手上。
2. **每个组一个 `SortableContext`**：dnd-kit 的排序是"组内"语义，嵌套组的正确模型是"每组一个上下文 + 根一个 `DndContext`"，跨组移动在 `onDragEnd` 里自己算（代码里的 `group-body:` 前缀 droppable 就是跨组落点的兜底）。
3. **防环**：组可以拖进组，但"组拖进自己的子树"必须拦截（`moveNode` 里的 `isInSubtree` 检查），否则树结构成环，递归渲染直接栈溢出。
4. **激活约束 `distance: 5`**：区分"点击行内控件"与"拖拽行"两种意图，没有它，select 一点开就触发拖拽取消。
5. 生产提示：条件行超过百级规模时，给 `QueryGroup`/`QueryRow` 包 `memo` 并把动作函数收敛到 reducer（动作随 `value` 每帧重建会击穿 memo）——思路同《进阶大纲》§1.7 大 Schema 树性能。

**常见坑（渲染层）**：
- 症状：删除第 2 行后，原第 3 行的输入框里显示着第 2 行填过的值；或拖拽后两行值互换错乱。
- 根因：`children.map((child, index) => <QueryRow key={index} ...>)` 用数组下标当 key。React diff 认为下标没变，复用了旧组件实例与未受控的内部状态。
- 修法：协议里必须有 `id`，渲染一律 `key={child.id}`（本文协议从 §3.1 起就带 id，正是为此）。顺带一条纪律：值编辑器全部做成受控组件，不留半受控状态，即便 key 错了也不会脏读。

#### 3.3 字段元数据驱动（field schema）

**是什么**：一张"字段元数据表"（field schema），每个字段声明自己的类型、可用操作符集合、值编辑器形态。UI 不写死任何业务字段——字段下拉、操作符下拉、值编辑器三者的内容全部由这张表推导。原文的声明式写法：

```ts
{ type, operators: [...], valueEditor: 'input' | 'select' | 'multi-select' | 'date-range' }
```

**为什么需要**：没有元数据表，每加一个可筛选字段就要改三处 UI 代码（字段下拉、操作符映射、值控件分支），业务字段几十上百个时彻底失控。元数据驱动的本质是**把"字段能怎么比"的知识从组件代码挪进数据**：换一张表，编辑器立刻变成"工单筛选器""日志检索器"，组件一行不改——这正是《进阶大纲》"Schema 驱动"主线在本章的延续。而且这张表与动态表单的 schema 是同源的：后端下发同一份字段定义，既驱动查询构建器，也驱动结果表的列渲染，前后端字段口径天然一致。

**怎么做（机制分步）**：

1. 定义 `FieldMeta` 类型：静态声明 + 函数声明两种形态（操作符不同 → 编辑器不同时用函数）。
2. 定义 `resolveValueEditor(field, operator)`：**二维查一维**——(字段， 操作符) 二元组唯一确定值编辑器。无值操作符（`isEmpty`）在这里统一短路。
3. 定义 `defaultValueFor(field, editor)`：每种编辑器的"干净默认值"。
4. 两个联动函数 `applyFieldChange` / `applyOperatorChange`：字段或操作符变化的瞬间，**原子地**重置其余联动项——这是坑 1（value 类型残留）的正解，所有变更必须走这两个门，禁止在组件里手改 `operator` 而不动 `value`。

**代码——元数据协议与联动规则**：

```ts
// field-meta.ts —— 字段元数据协议 + "二维查一维"的编辑器推导 + 联动重置
import type { ConditionNode, Operator } from './condition-tree'

export type ValueEditorType =
  | 'none'               // 无值操作符（isEmpty / isNotEmpty）→ 渲染 null
  | 'input'              // 单行文本（订单号、模糊匹配词）
  | 'number'             // 数字输入
  | 'number-range'       // 数字区间（between 两个输入框）
  | 'select'             // 单选下拉（枚举）
  | 'multi-select'       // 多选下拉（in / notIn）
  | 'date'               // 单日期（原生 <input type="date">）
  | 'date-range'         // 日期区间（between 两个日期框）
  | 'switch'             // 布尔开关
  | 'remote-select'      // 远程单选（外键引用，§3.4）
  | 'remote-multi-select'// 远程多选

export type FieldValueType = 'number' | 'string' | 'enum' | 'boolean' | 'date'

export interface FieldOption { label: string; value: string }

export interface RemoteSource {
  url: string            // 返回 { list: Record<string, unknown>[] } 的搜索接口
  labelKey?: string      // 用作 label 的响应键，默认 name
  valueKey?: string      // 用作 value 的响应键，默认 id
}

export interface FieldMeta {
  name: string           // 协议里的 field 值，必须与数据对象的键一致（json-logic {var} 靠它取值）
  label: string          // UI 展示名
  valueType: FieldValueType
  operators: Operator[]  // 该字段允许的操作符（操作符下拉的唯一来源）
  valueEditor: ValueEditorType | ((operator: Operator) => ValueEditorType)
  options?: FieldOption[]          // 枚举字段：本地选项
  remote?: RemoteSource           // 外键字段：远程选项（懒加载，§3.4）
  defaultValue?: unknown          // 新建行时的初始值建议（可以为空，交给校验兜底）
  deprecated?: boolean            // 已下线：新规则不可选，存量规则渲染时标红（坑 2）
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  '=': '等于', '!=': '不等于',
  '>': '大于', '>=': '大于等于', '<': '小于', '<=': '小于等于',
  in: '属于（任一）', notIn: '不属于',
  contains: '包含', notContains: '不包含',
  between: '介于', notBetween: '不介于',
  isEmpty: '为空', isNotEmpty: '不为空',
}

const VALUELESS_OPERATORS: Operator[] = ['isEmpty', 'isNotEmpty']
export function isValuelessOperator(op: Operator): boolean {
  return VALUELESS_OPERATORS.includes(op)
}

/** 元数据 + 操作符 → 值编辑器类型（二维查一维，全编辑器只有一个真相源） */
export function resolveValueEditor(field: FieldMeta, operator: Operator): ValueEditorType {
  if (isValuelessOperator(operator)) return 'none'
  if (typeof field.valueEditor === 'function') return field.valueEditor(operator)
  if (operator === 'between' || operator === 'notBetween') {
    // between 恒为二元值：日期字段给日期区间，其余给数字区间
    return field.valueType === 'date' ? 'date-range' : 'number-range'
  }
  return field.valueEditor
}

/** 每种编辑器的"干净默认值"——操作符/字段切换后，旧 value 必须回到这里 */
export function defaultValueFor(field: FieldMeta, editor: ValueEditorType): unknown {
  switch (editor) {
    case 'none': return null
    case 'multi-select': case 'remote-multi-select': return []
    case 'number-range': case 'date-range': return [null, null]
    case 'switch': return false
    case 'number': return null // 宁可空着交给校验报错，也不替用户编造一个业务值
    default: return field.defaultValue ?? ''
  }
}

/** 操作符变更：一次原子完成"换操作符 + 按新编辑器重置值"（坑 1 正解） */
export function applyOperatorChange(
  node: ConditionNode,
  nextOperator: Operator,
  field: FieldMeta | undefined,
): ConditionNode {
  if (!field) return { ...node, operator: nextOperator }
  const editor = resolveValueEditor(field, nextOperator)
  return { ...node, operator: nextOperator, value: defaultValueFor(field, editor) }
}

/** 字段变更：操作符退回该字段第一个合法操作符，值一并重置 */
export function applyFieldChange(
  node: ConditionNode,
  nextField: string,
  fieldMap: Map<string, FieldMeta>,
): ConditionNode {
  const field = fieldMap.get(nextField)
  if (!field) return { ...node, field: nextField } // 悬空字段：只改字段名，渲染层标红（坑 2）
  const operator = field.operators[0]
  const editor = resolveValueEditor(field, operator)
  return { ...node, field: nextField, operator, value: defaultValueFor(field, editor) }
}
```

**代码——五类典型字段的元数据示例**（数字 / 字符串枚举 / 日期 / 布尔 / 外键引用，覆盖中后台 90% 的字段形态）：

```ts
// fields-order.ts —— 订单域字段元数据表：换表即换产品
import type { FieldMeta } from './field-meta'

export const ORDER_FIELDS: FieldMeta[] = [
  {
    name: 'amount', label: '订单金额', valueType: 'number',
    operators: ['=', '!=', '>', '>=', '<', '<=', 'between', 'notBetween'],
    valueEditor: 'number',
  },
  {
    name: 'city', label: '城市', valueType: 'enum',
    operators: ['=', '!=', 'in', 'notIn'],        // 枚举字段没有 > 这类比较
    // 函数形态：= / != 单选，in / notIn 多选——同一字段按操作符切编辑器
    valueEditor: op => (op === 'in' || op === 'notIn' ? 'multi-select' : 'select'),
    options: [
      { label: '北京', value: 'BJ' }, { label: '上海', value: 'SH' },
      { label: '广州', value: 'GZ' }, { label: '深圳', value: 'SZ' },
    ],
  },
  {
    name: 'created_at', label: '下单时间', valueType: 'date',
    operators: ['>=', '<=', '>', '<', 'between', 'notBetween'],
    valueEditor: op => (op === 'between' || op === 'notBetween' ? 'date-range' : 'date'),
  },
  {
    name: 'is_vip', label: 'VIP 客户', valueType: 'boolean',
    operators: ['='],                              // 布尔只有等于（= false 即"非 VIP"）
    valueEditor: 'switch', defaultValue: false,
  },
  {
    name: 'owner_id', label: '所属销售', valueType: 'enum',
    operators: ['=', '!=', 'in', 'notIn'],
    // 外键引用：选项不在本地，搜索接口懒加载（§3.4 的 useRemoteOptions）
    valueEditor: op => (op === 'in' || op === 'notIn' ? 'remote-multi-select' : 'remote-select'),
    remote: { url: '/api/users/search', labelKey: 'name', valueKey: 'id' },
  },
  {
    name: 'order_no', label: '订单号', valueType: 'string',
    operators: ['=', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
    valueEditor: 'input',
  },
]
```

注意 `name` 的命名纪律：`created_at`、`owner_id` 用蛇形，与数据库行、后端事件流的键保持一致——§3.5 转成 json-logic 后 `{ "var": "created_at" }` 靠这个键取数，前端一份、样例数据一份、后端一份，三处必须同键，否则试运行面板测得好好的、上线取不到值。

**常见坑（元数据层）**：
- 症状：`isVip` 字段配了 `>` 操作符，运行期转换层抛"未支持的操作符"，或后端执行报类型错误。
- 根因：操作符数组是"协议自由度"声明，写错的组合在 TS 层无法拦截（`operators: Operator[]` 是宽类型）。
- 修法：用类型收紧——按 `valueType` 定义字面量联合（`type NumericOperator = '>' | '>=' | '<' | '<=' | 'between' | ...`，让 `operators: NumericOperator[]`），把"数字字段配 contains"这类错误赶到编译期；同时 §3.6 校验层做运行时兜底双保险。

#### 3.4 值编辑器体系 = Setter 复用；远程 options 懒加载（防抖 + 取消）

**是什么**：一族按 `ValueEditorType` 注册的值输入组件（文本/数字/区间/单选/多选/日期/区间日期/开关/远程单选/远程多选），经注册表查表取用。**它与《进阶大纲》§3 的 Setter 体系是同一套东西的两次出场**：Setter 是"属性名 → 编辑器"的一维映射（schema 声明字段类型，注册表给出组件），值编辑器是"(字段, 操作符) → 编辑器"的二维映射——映射维度多了一维，组件本身原封不动。真实工程里，`SelectEditor`/`MultiSelectEditor`/`DateEditor` 就是直接从 Setter 注册表 import 过来的同一些组件，本章为了片段自包含重新内联实现；工程落地时应回收到同一个注册表，避免两个平行体系各自长歪。

**为什么需要**：操作符切换时值编辑器必须跟着换（`>` 是数字框、`in` 是多选、`between` 是双框），如果用 if/else 散落在 QueryRow 里，每加一种编辑器改一次组件、回归一次全量。注册表模式把"类型 → 组件"的映射收敛成数据，QueryRow 永远只有一行 `valueEditorRegistry[editorType]`——这也是组件库"按协议分发"的通用解法。

**怎么做（机制分步）**：

1. 定义统一的 `ValueEditorProps`（value / onChange / field / operator 四个Props，受控）。
2. 实现各编辑器组件，组成 `Record<ValueEditorType, ComponentType<ValueEditorProps>>` 注册表。
3. 远程类编辑器：搜索关键词防抖 300ms → AbortController 取消上一次请求 → 序号守卫丢弃过期响应（乱序防御）→ loading/error 呈现。
4. 远程选项**首次聚焦才拉**（懒加载）：远程字段可能在树里出现几十行，一渲染就并发几十个搜索请求是事故级浪费。

**代码——值编辑器注册表**：

```tsx
// value-editors.tsx —— 值编辑器族：与《进阶大纲》§3 Setter 同构的注册表
import { useState, type ComponentType } from 'react'
import type { Operator } from './condition-tree'
import type { FieldMeta, ValueEditorType } from './field-meta'

export interface ValueEditorProps {
  value: unknown
  onChange: (next: unknown) => void
  field?: FieldMeta
  operator: Operator
}

/* 无值操作符：什么都不渲染 */
function NoneEditor(_props: ValueEditorProps) { return null }

function InputEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      placeholder="输入关键词"
    />
  )
}

function NumberEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="number"
      value={typeof value === 'number' ? value : ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

/* between 专用：双数字框，value 恒为 [min, max] */
function NumberRangeEditor({ value, onChange }: ValueEditorProps) {
  const pair = Array.isArray(value) ? (value as [number | null, number | null]) : [null, null]
  const set = (i: 0 | 1, v: number | null) => {
    const next: [number | null, number | null] = [pair[0], pair[1]]
    next[i] = v
    onChange(next) // 整体替换，保证协议形状不变
  }
  return (
    <span className="qb-range">
      <input type="number" placeholder="最小" value={pair[0] ?? ''} onChange={e => set(0, e.target.value === '' ? null : Number(e.target.value))} />
      <span>~</span>
      <input type="number" placeholder="最大" value={pair[1] ?? ''} onChange={e => set(1, e.target.value === '' ? null : Number(e.target.value))} />
    </span>
  )
}

function SelectEditor({ value, onChange, field }: ValueEditorProps) {
  return (
    <select value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="">请选择</option>
      {(field?.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function MultiSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <select
      multiple
      size={Math.min(4, Math.max(2, (field?.options ?? []).length))}
      value={selected}
      onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
    >
      {(field?.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/* 日期统一走 ISO-8601 字符串（yyyy-MM-dd）：字符串比较与字典序一致，转换层无需再转 */
function DateEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="date"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function DateRangeEditor({ value, onChange }: ValueEditorProps) {
  const pair = Array.isArray(value) ? (value as [string | null, string | null]) : [null, null]
  const set = (i: 0 | 1, v: string) => {
    const next: [string | null, string | null] = [pair[0], pair[1]]
    next[i] = v === '' ? null : v
    onChange(next)
  }
  return (
    <span className="qb-range">
      <input type="date" value={pair[0] ?? ''} onChange={e => set(0, e.target.value)} />
      <span>~</span>
      <input type="date" value={pair[1] ?? ''} onChange={e => set(1, e.target.value)} />
    </span>
  )
}

function SwitchEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="checkbox"
      checked={value === true}
      onChange={e => onChange(e.target.checked)}
    />
  )
}

/* 远程单选/多选：搜索框 + 结果下拉，选项来自懒加载接口 */
function RemoteSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const [keyword, setKeyword] = useState('')
  const { options, loading, error } = useRemoteOptions(field?.remote, keyword)
  return (
    <span className="qb-remote">
      <input placeholder="搜索…" value={keyword} onChange={e => setKeyword(e.target.value)} />
      <select value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
        <option value="">{loading ? '加载中…' : '请选择'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="qb-remote-error" role="alert">{error}</span>}
    </span>
  )
}

function RemoteMultiSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const [keyword, setKeyword] = useState('')
  const { options, loading, error } = useRemoteOptions(field?.remote, keyword)
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <span className="qb-remote">
      <input placeholder="搜索…" value={keyword} onChange={e => setKeyword(e.target.value)} />
      <select
        multiple
        size={4}
        value={selected}
        onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
      >
        <option disabled>{loading ? '加载中…' : `共 ${options.length} 项`}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="qb-remote-error" role="alert">{error}</span>}
    </span>
  )
}

/** 注册表：类型字符串 → 组件。QueryRow 永远只做一次查表 */
export const valueEditorRegistry: Record<ValueEditorType, ComponentType<ValueEditorProps>> = {
  none: NoneEditor,
  input: InputEditor,
  number: NumberEditor,
  'number-range': NumberRangeEditor,
  select: SelectEditor,
  'multi-select': MultiSelectEditor,
  date: DateEditor,
  'date-range': DateRangeEditor,
  switch: SwitchEditor,
  'remote-select': RemoteSelectEditor,
  'remote-multi-select': RemoteMultiSelectEditor,
}
```

**代码——远程 options 懒加载 hook（防抖 + 取消 + 乱序守卫）**：

```ts
// use-remote-options.ts —— 远程选项三件套：防抖、取消、过期丢弃
import { useEffect, useRef, useState } from 'react'
import type { FieldOption, RemoteSource } from './field-meta'

interface RemoteOptionsState {
  options: FieldOption[]
  loading: boolean
  error: string | null
}

interface SearchResponse { list: Record<string, unknown>[] } // 后端契约：{ list: [...] }

export function useRemoteOptions(
  source: RemoteSource | undefined,
  keyword: string,
  delay = 300,
): RemoteOptionsState {
  const [state, setState] = useState<RemoteOptionsState>({ options: [], loading: false, error: null })
  const seqRef = useRef(0) // 请求序号：只认最新一次，过期响应直接丢弃

  useEffect(() => {
    if (!source?.url) return
    const seq = ++seqRef.current
    const controller = new AbortController() // 取消上一次未完成请求
    const timer = setTimeout(async () => {    // 防抖：停止输入 300ms 才发请求
      setState(s => ({ ...s, loading: true, error: null }))
      try {
        const url = new URL(source.url, window.location.origin)
        url.searchParams.set('keyword', keyword)
        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(`搜索接口错误 HTTP ${res.status}`)
        const json = (await res.json()) as SearchResponse
        if (seqRef.current !== seq) return    // 乱序守卫：旧请求晚到，静默丢弃
        const labelKey = source.labelKey ?? 'name'
        const valueKey = source.valueKey ?? 'id'
        setState({
          loading: false,
          error: null,
          options: json.list.map(item => ({
            label: String(item[labelKey] ?? ''),
            value: String(item[valueKey] ?? ''),
          })),
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // 主动取消不算错误
        if (seqRef.current !== seq) return
        setState(s => ({ ...s, loading: false, error: (e as Error).message }))
      }
    }, delay)

    return () => {           // 清理函数：下一次 effect 前取消计时器与在途请求
      clearTimeout(timer)
      controller.abort()
    }
  }, [source?.url, keyword, delay, source])

  return state
}
```

三个防御缺一不可，对应三种真实事故：**防抖**治"每敲一个字一个请求"把搜索接口打爆；**取消**治用户已经切走、旧请求仍在占连接；**乱序守卫**治"搜`张`的响应比搜`张三`的先回来"导致下拉显示过时结果——取消只能终止未完成的请求，已经回到浏览器的响应 abort 管不到，必须靠序号比对。

**常见坑（编辑器层）**：
- 症状：多选框勾了三个城市，切换到 `=` 后页面崩溃：`value.includes is not a function`（编辑器拿到了数组却当字符串渲染）。
- 根因：编辑器切换入口不止一处（改操作符、改字段、回填历史规则），某一处忘了走 `applyOperatorChange` 的原子重置，旧类型 value 流进了新编辑器。
- 修法：所有切换路径收敛到 §3.3 的两个 apply 函数；同时在编辑器组件入口做防御性规整（`Array.isArray(value) ? ... : ...`），把"上游违约"降级为"显示为空"而非崩溃。

#### 3.5 协议转换层（前后端契约关键）：条件树 ↔ json-logic / Mongo query / ES DSL / SQL WHERE

**是什么**：一组纯函数，把同一棵条件树翻译成四种后端方言——json-logic（规则引擎通用格式）、Mongo query（文档库）、ES DSL（搜索）、SQL WHERE（关系库与参数化查询），以及一条反向链路：用 node-sql-parser 把 SQL WHERE 解析回条件树，实现"存量 SQL 规则回填进可视化编辑器"。

**为什么需要**：编辑器协议（带 id、kind、为 UI 服务）和执行协议（各引擎的方言）不该是同一个东西——前者改起来要顾 UI 状态，后者要顾执行效率与安全。转换层是两边之间**唯一**的翻译关口：关口唯一，才能统一做值类型矫正、注入防护、方言差异兜底；关口散落在各业务页面，每个页面都是一次安全事故的候选现场。回看 3.0.2 的抽象：四类业务执行端不同（规则引擎/数据库/搜索引擎/工作流引擎），靠这一层，**编辑器一份代码通吃**。

**怎么做（机制分步，以 json-logic 为标杆）**：

1. 组映射：`GroupNode` → `{"and":[...]}` / `{"or":[...]}`——json-logic 的 `and`/`or` 操作符恰好与 `combinator` 同名同义，直译即可。
2. 条件映射：`ConditionNode` → `{ 操作符: [{var: field}, value] }`——`{ "var": "amount" }` 是 json-logic 取数原语，等价于"从数据对象读 amount 键"。
3. 特殊操作符逐个对齐：`in` 的参数序是 `[needle, haystack]`（值在前数组在后，与直觉相反）；`between` 用 json-logic 的**三参链式比较** `{"<=":[min, {var}, max]}`；`contains` 复用 `in`（json-logic 的 `in` 同时支持字符串与数组）；取反类（`notIn`/`notContains`/`notBetween`）包一层 `{"!": ...}`；无值操作符转成与空串比较。
4. **value 类型必须在转换前与 json-logic 语义对齐**：json-logic 的比较运算走 JS 的隐式转换，`"100" > 99` 能侥幸为 true，但 `"9" > "10"` 按字符串比较得到 true（实际 9 < 10）——数字字段的 value 若是字符串（输入框没转数字）就会埋雷；日期必须统一 ISO-8601 才能靠字典序正确比较。所以转换函数接收 `fieldMap`，入口先做 `coerceValue` 矫正，**脏值在关口统一洗掉，而不是指望每个编辑器都守规矩**。

**代码——条件树 → json-logic（完整转换函数）**：

```ts
// converters.ts —— 协议转换层：一棵树，四种方言
import type { ConditionNode, ConditionTree, ConditionTreeNode, GroupNode, Operator } from './condition-tree'
import type { FieldMeta } from './field-meta'
import { isValuelessOperator } from './field-meta'

export type JsonLogicRule = Record<string, unknown>

/** 值矫正：转换关口的"洗手池"。数字字段串着来的值在这里转 number */
function coerceValue(field: FieldMeta | undefined, operator: string, value: unknown): unknown {
  if (isValuelessOperator(operator as Operator)) return null
  if (field?.valueType === 'number') {
    if (Array.isArray(value)) return value.map(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v))
    if (typeof value === 'string' && value.trim() !== '') return Number(value)
  }
  return value
}

export function toJsonLogic(tree: ConditionTree, fieldMap: Map<string, FieldMeta>): JsonLogicRule {
  const group = (g: GroupNode): JsonLogicRule => {
    // 空组/单子节点：json-logic 的 and/or 接受单元素数组，语义不受影响
    const parts = g.children.map(node => nodeToRule(node, fieldMap))
    return { [g.combinator]: parts } // combinator 恰为 'and' | 'or'，直译
  }
  return group(tree)
}

function nodeToRule(node: ConditionTreeNode, fieldMap: Map<string, FieldMeta>): JsonLogicRule {
  return node.kind === 'group' ? groupToRule(node, fieldMap) : conditionToRule(node, fieldMap)
}

function groupToRule(g: GroupNode, fieldMap: Map<string, FieldMeta>): JsonLogicRule {
  const parts = g.children.map(n => nodeToRule(n, fieldMap))
  return { [g.combinator]: parts }
}

/** 单条件 → json-logic 规则。§3.7 试运行面板也复用这个函数逐行求值，因此单独导出 */
export function conditionToRule(c: ConditionNode, fieldMap: Map<string, FieldMeta>): JsonLogicRule {
  const field = fieldMap.get(c.field)
  const varRef = { var: c.field }                       // 取数原语：读数据对象的 c.field 键
  const v = coerceValue(field, c.operator, c.value)

  switch (c.operator) {
    case '=': return { '==': [varRef, v] }              // json-logic 用 == 表示宽松相等
    case '!=': return { '!=': [varRef, v] }
    case '>': case '>=': case '<': case '<=':
      return { [c.operator]: [varRef, v] }              // 如 {">": [{"var":"amount"}, 100]}
    case 'in':
      return { in: [varRef, v] }                        // needle=字段值, haystack=选项数组
    case 'notIn':
      return { '!': { in: [varRef, v] } }
    case 'contains':
      return { in: [v, varRef] }                        // 注意参数序反转：子串在前, 整串在后
    case 'notContains':
      return { '!': { in: [v, varRef] } }
    case 'between': case 'notBetween': {
      const [min, max] = Array.isArray(v) ? v : [null, null]
      // 三参链式比较：min <= field <= max，json-logic 原生支持
      const rule: JsonLogicRule = { '<=': [min, varRef, max] }
      return c.operator === 'between' ? rule : { '!': rule }
    }
    case 'isEmpty':
      return { '==': [varRef, ''] }                     // 空定义：空串或 null（按业务口径可再并 null）
    case 'isNotEmpty':
      return { '!=': [varRef, ''] }
    default: {
      // 穷尽性防御：TS 的 never 检查在运行时兜一层显式报错
      const exhausted: never = c.operator
      throw new Error(`未支持的操作符: ${String(exhausted)}`)
    }
  }
}
```

**双向对照**——"金额复核规则"（§3.1 末尾那棵树）转出的 json-logic：

```text
条件树                                    json-logic
─────────────────────────────           ─────────────────────────────────────
group(and)                              {"and":[
 ├─ amount > 100                          {">":   [{"var":"amount"}, 100]},
 └─ group(or)                             {"or":[
     ├─ city in [北京, 上海]                {"in":  [{"var":"city"}, ["北京","上海"]]},
     └─ isVip = true                       {"==":  [{"var":"isVip"}, true]}
                                         ]}
```

对齐注意点再列三条：① `in` 的参数序（`contains` 与 `in` 同构但前后互换，写反了语义反转且不报错，最阴险）；② `==` 与 `===` 语义差异——json-logic 的 `==` 宽松相等（`1 == "1"` 为 true），若后端要严格相等应改用 `"==="` 操作符，这是接口契约里要写死的决定；③ 日期两侧必须同格式（都 `yyyy-MM-dd` 或都完整 ISO 时间戳），一边带时区一边不带，字典序比较就会错位。

**代码与对照——条件树 → Mongo query**：

```ts
type MongoQuery = Record<string, unknown>

/** 用户输入若含正则元字符，$regex 直拼会被注入/误匹配，先转义 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function toMongoQuery(tree: ConditionTree, fieldMap: Map<string, FieldMeta>): MongoQuery {
  const group = (g: GroupNode): MongoQuery => {
    const parts = g.children.map(n => nodeToMongo(n, fieldMap))
    return { [g.combinator === 'and' ? '$and' : '$or']: parts }
  }
  const nodeToMongo = (n: ConditionTreeNode, fm: Map<string, FieldMeta>): MongoQuery =>
    n.kind === 'group' ? group(n) : conditionToMongo(n, fm)
  const conditionToMongo = (c: ConditionNode, fm: Map<string, FieldMeta>): MongoQuery => {
    const v = coerceValue(fm.get(c.field), c.operator, c.value)
    switch (c.operator) {
      case '=': return { [c.field]: { $eq: v } }
      case '!=': return { [c.field]: { $ne: v } }
      case '>': return { [c.field]: { $gt: v } }
      case '>=': return { [c.field]: { $gte: v } }
      case '<': return { [c.field]: { $lt: v } }
      case '<=': return { [c.field]: { $lte: v } }
      case 'between': {
        const [min, max] = v as [unknown, unknown]
        return { [c.field]: { $gte: min, $lte: max } }   // between = 双边 range，一个算子收拢
      }
      case 'notBetween': {
        const [min, max] = v as [unknown, unknown]
        return { [c.field]: { $not: { $gte: min, $lte: max } } }
      }
      case 'in': return { [c.field]: { $in: v } }
      case 'notIn': return { [c.field]: { $nin: v } }
      case 'contains': return { [c.field]: { $regex: escapeRegExp(String(v)), $options: 'i' } }
      case 'notContains': return { [c.field]: { $not: { $regex: escapeRegExp(String(v)), $options: 'i' } } }
      case 'isEmpty': return { [c.field]: { $in: ['', null] } }
      case 'isNotEmpty': return { [c.field]: { $nin: ['', null] } }
      default: {
        const exhausted: never = c.operator
        throw new Error(`未支持的操作符: ${String(exhausted)}`)
      }
    }
  }
  return group(tree)
}
```

同一棵"金额复核规则"的对照：

```text
条件树片段                          Mongo query 片段
────────────────────────          ──────────────────────────────────────
group(and)                        { "$and": [
 ├─ amount > 100                     { "amount": { "$gt": 100 } },
 └─ group(or)                        { "$or": [
     ├─ city in [北京, 上海]             { "city": { "$in": ["北京","上海"] } },
     └─ isVip = true                     { "isVip": { "$eq": true } }
                                      ]}
```

差异注意：Mongo 的组合子是 `$and`/`$or` 算子对象（与 json-logic 结构同构）；同一字段多条件在 Mongo 里可合并进一个 `{field: {$gt, $lt}}`（between 就是这么干的），但跨字段必须用 `$and` 展开——转换层选择"永远显式 `$and`/`$or`"牺牲一点查询体积，换来结构完全同构、好排查。

**代码与对照——条件树 → ES DSL**：

```ts
export function toEsDsl(tree: ConditionTree, fieldMap: Map<string, FieldMeta>): Record<string, unknown> {
  const group = (g: GroupNode): Record<string, unknown> => {
    const clauses = g.children.map(n => nodeToEs(n, fieldMap))
    return g.combinator === 'and'
      ? { bool: { must: clauses } }
      // should 单独出现时默认 minimum_should_match=1，但一旦并入外层 bool 语境默认值会变 0——
      // 显式写死 1，防止"嵌套后或条件全部失活"的经典事故
      : { bool: { should: clauses, minimum_should_match: 1 } }
  }
  const nodeToEs = (n: ConditionTreeNode, fm: Map<string, FieldMeta>): Record<string, unknown> =>
    n.kind === 'group' ? group(n) : conditionToEs(n, fm)
  const conditionToEs = (c: ConditionNode, fm: Map<string, FieldMeta>): Record<string, unknown> => {
    const v = coerceValue(fm.get(c.field), c.operator, c.value)
    switch (c.operator) {
      case '=': return { term: { [c.field]: v } }            // 精确匹配：keyword 字段
      case '!=': return { bool: { must_not: { term: { [c.field]: v } } } }
      case '>': return { range: { [c.field]: { gt: v } } }
      case '>=': return { range: { [c.field]: { gte: v } } }
      case '<': return { range: { [c.field]: { lt: v } } }
      case '<=': return { range: { [c.field]: { lte: v } } }
      case 'between': {
        const [min, max] = v as [unknown, unknown]
        return { range: { [c.field]: { gte: min, lte: max } } }
      }
      case 'notBetween': {
        const [min, max] = v as [unknown, unknown]
        return { bool: { must_not: { range: { [c.field]: { gte: min, lte: max } } } } }
      }
      case 'in': return { terms: { [c.field]: v } }
      case 'notIn': return { bool: { must_not: { terms: { [c.field]: v } } } }
      case 'contains': return { wildcard: { [c.field]: `*${escapeRegExp(String(v))}*` } }
      case 'notContains': return { bool: { must_not: { wildcard: { [c.field]: `*${escapeRegExp(String(v))}*` } } } }
      case 'isEmpty': return { term: { [c.field]: '' } }
      case 'isNotEmpty': return { bool: { must_not: { term: { [c.field]: '' } } } }
      default: {
        const exhausted: never = c.operator
        throw new Error(`未支持的操作符: ${String(exhausted)}`)
      }
    }
  }
  return group(tree)
}
```

对照（bool/must/should 与且/或一一对应）：

```json
{
  "bool": {
    "must": [
      { "range": { "amount": { "gt": 100 } } },
      {
        "bool": {
          "should": [
            { "terms": { "city": ["北京", "上海"] } },
            { "term": { "isVip": true } }
          ],
          "minimum_should_match": 1
        }
      }
    ]
  }
}
```

两个 ES 特有差异要在转换层文档里写死：`term`/`terms` 只对 `keyword` 子字段精确命中，对分词的 `text` 字段要用 `match`（映射取决于索引 mapping，转换层可让 FieldMeta 增加 `esFieldType` 声明）；`wildcard` 带 `*` 前缀无法利用倒排索引，大数据量下应建议业务改用 `match_phrase`——转换层给 warning 而不是替用户决定。

**代码——条件树 → SQL WHERE（拼接思路与注入防护参数化）**：

```ts
export interface SqlWhereResult {
  where: string       // 只含占位符（PostgreSQL $1/$2…），不含任何用户值
  params: unknown[]   // 与占位符顺序一一对应的参数数组
}

export function toSqlWhere(tree: ConditionTree, fieldMap: Map<string, FieldMeta>): SqlWhereResult {
  const params: unknown[] = []
  const placeholder = (v: unknown): string => {
    params.push(v)
    return `$${params.length}`            // PostgreSQL 风格；MySQL 换成 '?' 即可
  }
  /** 值永远参数化；字段名无法参数化 → 白名单 + 命名规则双重校验，这是防注入的两半 */
  const identifier = (name: string): string => {
    if (!fieldMap.has(name)) throw new Error(`字段不在白名单: ${name}`)
    if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`非法字段名: ${name}`)
    return `"${name}"`
  }

  const condition = (c: ConditionNode): string => {
    const col = identifier(c.field)
    const v = coerceValue(fieldMap.get(c.field), c.operator, c.value)
    switch (c.operator) {
      case '=': return `${col} = ${placeholder(v)}`
      case '!=': return `${col} <> ${placeholder(v)}`
      case '>': return `${col} > ${placeholder(v)}`
      case '>=': return `${col} >= ${placeholder(v)}`
      case '<': return `${col} < ${placeholder(v)}`
      case '<=': return `${col} <= ${placeholder(v)}`
      case 'between': case 'notBetween': {
        const [min, max] = v as [unknown, unknown]
        const range = `${col} BETWEEN ${placeholder(min)} AND ${placeholder(max)}`
        return c.operator === 'between' ? range : `NOT (${range})`
      }
      case 'in': case 'notIn': {
        const list = (Array.isArray(v) ? v : []).map(x => placeholder(x))
        if (list.length === 0) return c.operator === 'in' ? 'FALSE' : 'TRUE' // 空集防御：IN () 是语法错误
        return `${col} ${c.operator === 'in' ? 'IN' : 'NOT IN'} (${list.join(', ')})`
      }
      case 'contains': case 'notContains': {
        const like = `${col} LIKE ${placeholder(`%${escapeRegExp(String(v))}%`)}`
        return c.operator === 'contains' ? like : `NOT (${like})`
      }
      case 'isEmpty': return `COALESCE(${col}, '') = ''`
      case 'isNotEmpty': return `COALESCE(${col}, '') <> ''`
      default: {
        const exhausted: never = c.operator
        throw new Error(`未支持的操作符: ${String(exhausted)}`)
      }
    }
  }

  const node = (n: ConditionTreeNode): string => (n.kind === 'group' ? group(n) : condition(n))
  const group = (g: GroupNode): string => {
    if (g.children.length === 1) return node(g.children[0]) // 单子节点不加括号，减少嵌套噪音
    const joiner = g.combinator === 'and' ? ' AND ' : ' OR '
    return '(' + g.children.map(node).join(joiner) + ')'   // 组 = 括号：优先级由结构保证，不靠运算符优先级心算
  }

  return { where: group(tree), params }
}
```

注入防护的两个半场：**值**走参数化占位符，值里藏 `'; DROP TABLE` 也只是一个普通字符串参数；**标识符**没法参数化（占位符不能出现在列名位置），必须"白名单（fieldMap 里必须有）+ 命名规则正则"双重校验——`"amount; DROP TABLE orders"`在第一关就被拒。使用侧：

```ts
import { toSqlWhere } from './converters'
import { ORDER_FIELDS } from './fields-order'

// const client = 数据库客户端（pg / postgres.js 等，参数化查询是标配能力）
const fieldMap = new Map(ORDER_FIELDS.map(f => [f.name, f]))
const { where, params } = toSqlWhere(tree, fieldMap)
const sql = `SELECT * FROM orders WHERE ${where} LIMIT 100`
// const rows = await client.query(sql, params)   // 永远 params 单独传，别拼进 sql 字符串
```

**代码——反向解析：node-sql-parser 把 SQL WHERE 解析回条件树**（存量 SQL 规则迁移进可视化编辑器的通路）：

```bash
npm i node-sql-parser
```

```ts
// sql-to-tree.ts —— SQL → 条件树（回填编辑器）。支持子集：AND/OR/比较/IN/BETWEEN/LIKE
import { Parser } from 'node-sql-parser'
import {
  type ConditionNode,
  type ConditionTree,
  type ConditionTreeNode,
  type Operator,
} from './condition-tree'
import { createCondition, createGroup } from './tree-ops'

interface AstNode {
  type: string
  operator?: unknown
  left?: unknown
  right?: unknown
  column?: unknown
  value?: unknown
}

const parser = new Parser()

export function sqlToConditionTree(sql: string): ConditionTree {
  const ast = parser.astify(sql) as { where?: AstNode }
  if (!ast.where) return createGroup() // 无 WHERE → 空组
  const node = exprToNode(ast.where)
  return node.kind === 'group' ? node : createGroup([node]) // 裸条件也包进根组
}

function exprToNode(expr: AstNode): ConditionTreeNode {
  if (expr.type !== 'binary_expr') {
    throw new Error(`暂不支持的表达式类型: ${expr.type}（子查询/函数等请人工迁移）`)
  }
  const op = String(expr.operator).toUpperCase()

  // AND / OR：left/right 各是一个表达式 → 收敛为组，天然表达优先级括号
  if (op === 'AND' || op === 'OR') {
    const children = [exprToNode(expr.left as AstNode), exprToNode(expr.right as AstNode)]
    return createGroup(children, op === 'AND' ? 'and' : 'or')
  }

  const left = expr.left as AstNode
  if (left.type !== 'column_ref') {
    throw new Error(`暂不支持：左侧必须是字段名，得到 ${left.type}`)
  }
  const field = String(left.column)
  const right = expr.right as AstNode

  switch (op) {
    case '=': case '!=': case '>': case '>=': case '<': case '<=':
      return createCondition(field, op as Operator, literalValue(right))
    case 'IN': case 'NOT IN': {
      const list = (right.type === 'expr_list' ? (right.value as AstNode[]) : [right]).map(literalValue)
      return createCondition(field, op === 'IN' ? 'in' : 'notIn', list)
    }
    case 'BETWEEN': {
      const [min, max] = (right.value as AstNode[]).map(literalValue) // BETWEEN 右侧是二元 expr_list
      return createCondition(field, 'between', [min, max])
    }
    case 'LIKE': case 'NOT LIKE': {
      const pattern = String(literalValue(right))
      let operator: Operator = 'contains'
      let needle = pattern
      if (pattern.startsWith('%') && pattern.endsWith('%') && pattern.length >= 2) {
        needle = pattern.slice(1, -1)          // %xx% → contains
      } else if (pattern.endsWith('%')) {
        operator = '='                          // xx% 前缀匹配：本章协议无 startsWith，退化为 = 并给出告警
        needle = pattern.slice(0, -1)
        console.warn(`字段 ${field} 的前缀 LIKE 已退化为 =，请人工确认`)
      } else if (pattern.startsWith('%')) {
        needle = pattern.slice(1)
      }
      return createCondition(field, operator, needle)
    }
    default:
      throw new Error(`暂不支持的操作符: ${op}`)
  }
}

function literalValue(node: AstNode): unknown {
  switch (node.type) {
    case 'number': return Number(node.value)
    case 'string': case 'single_quote_string': return String(node.value) // 新旧版本的字符串节点类型都认
    case 'bool': case 'boolean': return Boolean(node.value)
    case 'null': return null
    default: throw new Error(`暂不支持的值类型: ${node.type}`)
  }
}
```

反向解析的工程定位要说清：它**不是**完备的 SQL 兼容层——子查询、函数、算术表达式都超出"字段-操作符-值"三段式协议的表达力，代码里一律显式抛错提示人工迁移；它的价值是把"九十年代攒下的平面 WHERE 迁进编辑器"这件苦力活自动化掉九成，剩下的一成靠报错清单兜底。这也是协议设计能力的反面教材：**协议表达力决定生态兼容面**，当初若在协议里加 `startsWith`/`endsWith` 操作符，LIKE 的映射就不用退化。

**常见坑（转换层）**：
- 症状：联调时前端试运行全绿，后端规则引擎执行结果永远 false。
- 根因：前后端对"空"的口径不一致——前端 `isEmpty` 转成 `{"==":[{"var":"x"},""]}`，后端数据里该字段是 `null` 不是 `''`；或日期一边 `2026-01-01` 一边 `2026-01-01T00:00:00Z`，字典序比较错位。
- 修法：把"空值口径、日期格式、`==`/`===`、布尔字段类型"四项写进前后端契约文档并写成转换层的单测快照（同一棵树 × 四种方言的 golden case）；`isEmpty` 若业务上要覆盖 null，转成 `{"or":[{"==":[{"var":"x"},""]},{"==":[{"var":"x"},null]}]}` 并两边签字确认。

#### 3.6 校验：空值、类型不匹配（between 要两个值）、嵌套深度上限、条件数上限

**是什么**：一个纯函数 `validateTree`，输入条件树 + 字段元数据表 + 上限配置，输出错误数组（每条错误带 `nodeId` 定位与人类可读路径），UI 层把错误按 nodeId 精确投到出错的行上标红。

**为什么需要**：编辑器是给非程序员用的，"配出不合法规则"不是异常而是日常——空值、between 只填一端、嵌套八层、条件塞两百条。没有前置校验，这些问题会在两个更贵的环节爆发：§3.5 转换层抛异常（用户已点保存，体验断裂），或后端执行时静默查错数据（最坏：告警规则配错，该告的没告）。校验是**保存按钮的门卫**，也是试运行（§3.7）的前置条件——对一棵非法树求值没有意义。

**怎么做（机制分步）**：

1. 逐条件校验：字段存在（含悬空字段检测，坑 2）→ 操作符在该字段白名单内 → 按操作符家族校验值（无值家族跳过；between 要二元数组且下限 ≤ 上限；in 要非空数组且（枚举字段）取值都在 options 内；通用家族查空值与类型匹配）。
2. 逐组校验：空组报错；条件总数与嵌套深度对上限。
3. 错误对象带 `nodeId`（机器定位）+ `path`（人读路径，如"根组 › 2 › 内层组 › 1"）+ `message`（中文人话）。
4. UI 侧：根组件集中算一次（§3.2 已接入），行内红框 + 错误文案，组深度超标时组头部报错。

**代码——完整校验实现**：

```ts
// validator.ts —— 校验：保存前的门卫，错误定位到节点
import type { ConditionNode, ConditionTree, ConditionTreeNode } from './condition-tree'
import { countConditions, treeDepth } from './tree-ops'
import { type FieldMeta, isValuelessOperator } from './field-meta'

export interface TreeValidationError {
  nodeId: string   // 定位：QueryRow 据此标红（§3.2 的 errors 索引）
  path: string     // 人读路径："根组 › 2 › 内层组 › 1"
  message: string
}

export interface ValidationOptions {
  maxDepth: number       // 嵌套深度上限（根组记 1）
  maxConditions: number  // 条件总数上限
}

export function validateTree(
  root: ConditionTree,
  fieldMap: Map<string, FieldMeta>,
  options: ValidationOptions,
): TreeValidationError[] {
  const errors: TreeValidationError[] = []

  const total = countConditions(root)
  if (total > options.maxConditions) {
    errors.push({
      nodeId: root.id,
      path: '根组',
      message: `条件总数 ${total} 超过上限 ${options.maxConditions}，请拆分为多条规则`,
    })
  }
  const depth = treeDepth(root)
  if (depth > options.maxDepth) {
    errors.push({
      nodeId: root.id,
      path: '根组',
      message: `嵌套深度 ${depth} 超过上限 ${options.maxDepth}，深层逻辑建议拆分规则或改用表达式`,
    })
  }

  const walk = (node: ConditionTreeNode, path: string): void => {
    if (node.kind === 'group') {
      if (node.children.length === 0) {
        errors.push({ nodeId: node.id, path, message: '条件组不能为空，请添加条件或删除该组' })
      }
      node.children.forEach((child, i) => walk(child, `${path} › ${i + 1}`))
      return
    }
    validateCondition(node, path)
  }

  const validateCondition = (c: ConditionNode, path: string): void => {
    const field = fieldMap.get(c.field)

    if (!field) {
      errors.push({ nodeId: c.id, path, message: `未知字段「${c.field}」，可能已被下线，请重新选择字段` })
      return // 字段都悬空了，后续校验没有意义
    }
    if (field.deprecated) {
      errors.push({ nodeId: c.id, path, message: `字段「${field.label}」已下线，规则将失效，请替换字段` })
    }
    if (!field.operators.includes(c.operator)) {
      errors.push({ nodeId: c.id, path, message: `操作符「${c.operator}」不适用于字段「${field.label}」` })
      return
    }
    if (isValuelessOperator(c.operator)) return // 无值操作符到这里就是合法的

    const v = c.value
    switch (c.operator) {
      case 'between': case 'notBetween': {
        if (!Array.isArray(v) || v.length !== 2 || v[0] == null || v[1] == null) {
          errors.push({ nodeId: c.id, path, message: '区间条件需要完整的两个值（最小值与最大值）' })
          return
        }
        const [min, max] = v as [number | string, number | string]
        if (typeof min === 'number' && typeof max === 'number' && min > max) {
          errors.push({ nodeId: c.id, path, message: `区间下限 ${min} 不能大于上限 ${max}` })
        }
        if (typeof min === 'string' && typeof max === 'string' && min > max) {
          errors.push({ nodeId: c.id, path, message: `日期区间起止颠倒：${min} 晚于 ${max}` }) // ISO 字典序即时间序
        }
        return
      }
      case 'in': case 'notIn': {
        if (!Array.isArray(v) || v.length === 0) {
          errors.push({ nodeId: c.id, path, message: '请至少选择一个候选项' })
          return
        }
        if (field.options) { // 枚举字段：取值必须都在合法选项内（防脏数据回填）
          const legal = new Set(field.options.map(o => o.value))
          v.forEach(item => {
            if (!legal.has(String(item))) {
              errors.push({ nodeId: c.id, path, message: `选项「${String(item)}」不在字段「${field.label}」的合法取值内` })
            }
          })
        }
        return
      }
      default: {
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
          errors.push({ nodeId: c.id, path, message: '条件值不能为空' })
          return
        }
        if (field.valueType === 'number' && typeof v !== 'number') {
          errors.push({ nodeId: c.id, path, message: `字段「${field.label}」需要数字类型的值` })
        }
      }
    }
  }

  walk(root, '根组')
  return errors
}
```

错误定位到行的 UI 已在 §3.2 落位：`QueryBuilder` 里 `useMemo` 集中计算 → `Map<nodeId, error>` 进 Context → `QueryRow` 查 `errors.get(node.id)` 加红框与文案。保存按钮侧再取一次汇总：

```tsx
// SaveBar.tsx —— 保存门卫：有错禁用保存，并把错误列表摊给用户
import { validateTree, type ValidationOptions } from './validator'

export function SaveBar({ tree, fieldMap, onSave }: {
  tree: ConditionTree
  fieldMap: Map<string, FieldMeta>
  onSave: () => void
}) {
  const errors = validateTree(tree, fieldMap, { maxDepth: 5, maxConditions: 30 } satisfies ValidationOptions)
  return (
    <div className="qb-savebar">
      <button type="button" disabled={errors.length > 0} onClick={onSave}>
        保存规则{errors.length > 0 ? `（${errors.length} 处待修正）` : ''}
      </button>
      {errors.length > 0 && (
        <ul>
          {errors.map(e => <li key={e.nodeId + e.message}>【{e.path}】{e.message}</li>)}
        </ul>
      )}
    </div>
  )
}
```

**常见坑（校验层）**：
- 症状：校验全部通过，保存的规则后端执行报 `Invalid rule: {"var": "amount"}`。
- 根因：前端校验的是"UI 协议合法性"，后端校验的是"json-logic 可执行性"，两套标准没对齐——比如某自定义操作符（`startsWith`）前端认、后端规则引擎版本没有。
- 修法：保存链路改成"先 toJsonLogic → 后端 dry-run 校验 → 再落库"，前端校验只做体验层拦截（即时、免网络），后端校验是权威关卡（试运行面板同样走这条 dry-run，见 §3.7）；两边共享同一份操作符能力矩阵测试。

#### 3.7 试运行面板：json-logic-js 前端即时求值

**是什么**：编辑器旁边常驻一块"试验田"——左边是正在编辑的规则树（只读渲染），右边贴一份样例数据 JSON，中间用 json-logic-js **在浏览器里当场求值**：整树命中与否给一个大结果，同时**逐行高亮**每个条件/每个组的命中状态。原文的定位语原样保留：这是"用户信任感的来源，也是调试利器"。

**为什么需要它带来用户信任**：规则配置是高风险操作——配错的告警规则意味着漏报告警，配错的审批条件意味着单据走错流程。用户面对一堆且/或嵌套时的真实心理是"我配的这个东西到底会不会按我想的跑？"。没有试运行，用户只能在保存后去生产数据上"赌"；有了试运行，**"改一下、看一眼命中、再改一下"的秒级反馈闭环**把黑盒变成白盒，用户是在"验证过的确定性"上点保存，而不是在祈祷。对开发者它同样是调试利器：一套"规则 + 样例数据"天然就是回归测试用例，值得随规则一起存库（规则平台的高级形态：样例数据即断言）。

**怎么做（机制分步）**：

1. 装 json-logic-js（前端求值、后端同格式执行，一套规则两端跑）。
2. 样例数据输入防抖 300ms 后 `JSON.parse`，解析错误就地提示（不打断编辑）。
3. 求值复用 §3.5 的 `conditionToRule` 逐条件转 json-logic；组节点**先全量求子节点再聚合**（不能短路——短路了就拿不到每个子节点的命中状态用于高亮）。
4. 命中结果收进 `Map<nodeId, boolean>`，只读渲染器据此上色：命中绿、未命中灰。
5. 需要扩展操作符时用 `add_operation` 注册自定义算子（前后端各注册一份同名实现，口径一致）。

```bash
npm i json-logic-js
```

**代码——试运行面板完整实现**：

```tsx
// TrialRunPanel.tsx —— 试运行：左边规则右边样例数据，逐行高亮命中分支
import { useEffect, useMemo, useState } from 'react'
import jsonLogic from 'json-logic-js'
import type {
  ConditionTree,
  ConditionTreeNode,
  GroupNode,
} from './condition-tree'
import { countConditions } from './tree-ops'
import { type FieldMeta, OPERATOR_LABELS } from './field-meta'
import { conditionToRule } from './converters'

/** json-logic-js 的类型定义要求 RulesLogic，这里规则是动态生成的，做一次窄化断言 */
const applyLogic = (rule: Record<string, unknown>, data: unknown): boolean =>
  Boolean(jsonLogic.apply(rule as never, data))

/** 自定义算子示例：日期在某天之后。前后端必须注册同名实现，口径一致 */
jsonLogic.add_operation('dateAfter', (dateStr: unknown, boundary: unknown): boolean =>
  typeof dateStr === 'string' && typeof boundary === 'string' && dateStr > boundary,
)

/** 全树求值：返回根结果 + 每个节点的命中表。注意组节点不能短路（要拿全子节点状态做高亮） */
function evaluateTree(tree: ConditionTree, data: unknown, fieldMap: Map<string, FieldMeta>) {
  const hitMap = new Map<string, boolean>()
  const walk = (node: ConditionTreeNode): boolean => {
    if (node.kind === 'group') {
      const childHits = node.children.map(walk)         // 先全量求子节点
      const hit = node.combinator === 'and'
        ? childHits.every(Boolean)
        : childHits.some(Boolean)
      hitMap.set(node.id, hit)
      return hit
    }
    const rule = conditionToRule(node, fieldMap)        // 复用 §3.5 的单条件转换
    const hit = applyLogic(rule, data)
    hitMap.set(node.id, hit)
    return hit
  }
  const rootHit = walk(tree)
  return { rootHit, hitMap }
}

export function TrialRunPanel({ tree, fieldMap }: {
  tree: ConditionTree
  fieldMap: Map<string, FieldMeta>
}) {
  const [dataText, setDataText] = useState(
    '{\n  "amount": 150,\n  "city": "北京",\n  "isVip": false,\n  "order_no": "SO-2026-001",\n  "created_at": "2026-11-01"\n}',
  )

  // 防抖求值：输入停 300ms 再算，打字过程不卡
  const [state, setState] = useState<{
    parsed: Record<string, unknown> | null
    error: string | null
    rootHit: boolean | null
    hitMap: Map<string, boolean>
  }>({ parsed: null, error: null, rootHit: null, hitMap: new Map() })

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(dataText) as Record<string, unknown>
        const { rootHit, hitMap } = evaluateTree(tree, parsed, fieldMap)
        setState({ parsed, error: null, rootHit, hitMap })
      } catch (e) {
        setState({ parsed: null, error: `样例数据不是合法 JSON：${(e as Error).message}`, rootHit: null, hitMap: new Map() })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [dataText, tree, fieldMap])

  return (
    <div className="qb-trial">
      <div className="qb-trial-left">
        <div className={`qb-trial-result ${state.rootHit === null ? '' : state.rootHit ? 'is-hit' : 'is-miss'}`}>
          {state.error ? '—' : state.rootHit ? '命中：将执行动作' : '未命中：不执行'}
        </div>
        <PreviewNode node={tree} hitMap={state.hitMap} fieldMap={fieldMap} />
      </div>
      <div className="qb-trial-right">
        <label htmlFor="qb-sample">样例数据（模拟后端事件/数据行）</label>
        <textarea
          id="qb-sample"
          value={dataText}
          onChange={e => setDataText(e.target.value)}
          spellCheck={false}
          rows={14}
        />
        {state.error && <p className="qb-trial-error" role="alert">{state.error}</p>}
      </div>
    </div>
  )
}

/** 只读预览：条件行/组按命中状态上色——绿 = 命中，灰虚线 = 未命中 */
function PreviewNode({ node, hitMap, fieldMap, depth = 1 }: {
  node: ConditionTreeNode
  hitMap: Map<string, boolean>
  fieldMap: Map<string, FieldMeta>
  depth?: number
}) {
  const hit = hitMap.get(node.id)
  if (node.kind === 'condition') {
    const label = fieldMap.get(node.field)?.label ?? node.field
    const valueText = Array.isArray(node.value) ? `[${node.value.join(', ')}]` : String(node.value)
    return (
      <div className={`qb-preview-row ${hit ? 'is-hit' : 'is-miss'}`}>
        <code>{label} {OPERATOR_LABELS[node.operator]} {valueText}</code>
        <span className="qb-preview-hit">{hit === undefined ? '' : hit ? '✓ 命中' : '✗ 未命中'}</span>
      </div>
    )
  }
  return (
    <div className="qb-preview-group" data-depth={Math.min(depth, 4)}>
      <span className="qb-preview-comb">{node.combinator === 'and' ? '全部满足（且）' : '任一满足（或）'} · {countConditions(node)} 条</span>
      {node.children.map((child, i) => (
        <div key={child.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {i > 0 && <span className="qb-preview-chip">{node.combinator === 'and' ? '且' : '或'}</span>}
          <PreviewNode node={child} hitMap={hitMap} fieldMap={fieldMap} depth={depth + 1} />
        </div>
      ))}
    </div>
  )
}
```

配套样式要点（命中/未命中必须同时满足"色盲可辨"——不能只靠红绿）：

```text
.qb-preview-row.is-hit   { background: #e6f7ec; border-left: 3px solid #33a356; }  /* 绿底 + 实线左条 */
.qb-preview-row.is-miss  { background: #f7f8fa; border-left: 3px dashed #98a2b3; } /* 灰底 + 虚线左条 + ✓/✗ 文案 */
.qb-trial-result.is-hit  { color: #1f7a3d; font-weight: 600; }
.qb-trial-result.is-miss { color: #667085; }
```

**常见坑（试运行层）**：
- 症状：试运行显示命中，后端执行不命中（或反过来）。
- 根因：两端求值器不同——前端 json-logic-js 3.x、后端某个 Java 移植版旧版本；或前端注册了 `dateAfter` 自定义算子，后端没注册同名同义实现。
- 修法：自定义算子建立"算子注册表清单"（名字、语义、双端实现、单测用例）随契约文档维护；版本升级时跑同一套 golden case（一棵树 × N 份样例数据 × 双端结果比对）再发布。

#### 3.8 高级：规则模板库（协议 + 占位变量）、规则版本 diff（monaco diff 复用《进阶大纲》§5）

**是什么**：两个降本增效的增值件。**模板库**：把高频规则（"大额订单复核""工作时间告警""新客首单营销"）做成"协议 + 占位变量"的模板，一键套用后只填变量不搭结构。**版本 diff**：规则每次保存存一版，任意两版之间用 monaco 的 DiffEditor（复用《进阶大纲》§5 JSON 编辑器的同一套封装与 worker 配置）做并排对比，回答审计最高频的问题"这次到底改了什么"。

**为什么需要**：条件树对运营人员仍是有学习成本的构造物（嵌套组、且或组合），但 80% 的规则是 20% 的模式变体——模板把"结构知识"固化、只留"参数知识"给用户。版本 diff 则是合规刚需：审批流条件改了一行导致流程走错，回溯时要精确到"哪个操作者、哪个版本、改了哪个值"。

**怎么做（机制分步）**：

1. 模板协议：`RuleTemplate = { id, name, description, variables, tree }`，`tree` 就是标准条件树，值的位置嵌 `{{变量名}}` 占位符。
2. 套用 = `instantiateTemplate`：递归遍历，字符串值命中占位符则替换（数组里的占位符也要处理），同时 `deepCloneWithNewIds` 重新发 id。
3. diff 的关键预处理：**归一化**——去掉 id（每次保存 id 都变，不归一化 diff 全是噪音）、子节点按签名排序（顺序变化若语义无关就不该刷屏），再 `JSON.stringify(…, 2)` 喂给 DiffEditor。

**代码——模板协议与实例化**：

```ts
// rule-template.ts —— 模板：协议 + 占位变量
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import { deepCloneWithNewIds } from './tree-ops'

export interface TemplateVariable {
  key: string        // 占位符名，与树内 {{key}} 对应
  label: string      // 弹窗里的输入框标签
  defaultValue: string | number
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  variables: TemplateVariable[]
  tree: ConditionTree // 标准协议树，值里可嵌 {{key}} 占位符
}

/** 占位符替换：支持字符串值与数组元素两种位置 */
function resolvePlaceholder(v: unknown, values: Record<string, string | number>): unknown {
  if (typeof v === 'string') {
    const m = /^\{\{(\w+)\}\}$/.exec(v)
    if (m) return values[m[1]] ?? v // 没提供就保留原文，§3.6 校验会逼用户填
  }
  if (Array.isArray(v)) return v.map(item => resolvePlaceholder(item, values))
  return v
}

/** 套用模板：替换占位符 + 重新发 id（同一模板可反复套用而不撞 id） */
export function instantiateTemplate(
  tpl: RuleTemplate,
  values: Record<string, string | number>,
): ConditionTree {
  const cloned = deepCloneWithNewIds(tpl.tree)
  const walk = (n: ConditionTreeNode): ConditionTreeNode =>
    n.kind === 'group'
      ? { ...n, children: n.children.map(walk) }
      : { ...n, value: resolvePlaceholder(n.value, values) }
  return walk(cloned) as ConditionTree
}
```

一个真实模板的样子（"大额订单人工复核"，阈值与城市清单做成变量）：

```json
{
  "id": "tpl_large_order_review",
  "name": "大额订单人工复核",
  "description": "金额超过阈值，或命中重点城市 VIP 订单时，转人工复核",
  "variables": [
    { "key": "threshold", "label": "金额阈值（元）", "defaultValue": 1000 },
    { "key": "vipGrade", "label": "VIP 等级", "defaultValue": "GOLD" }
  ],
  "tree": {
    "kind": "group", "id": "tpl_root", "combinator": "or", "children": [
      { "kind": "condition", "id": "tpl_c1", "field": "amount", "operator": ">=", "value": "{{threshold}}" },
      { "kind": "group", "id": "tpl_g1", "combinator": "and", "children": [
        { "kind": "condition", "id": "tpl_c2", "field": "city", "operator": "in", "value": ["北京", "上海"] },
        { "kind": "condition", "id": "tpl_c3", "field": "vipGrade", "operator": "=", "value": "{{vipGrade}}" }
      ]}
    ]
  }
}
```

**代码——模板选择面板**（选中模板 → 填变量 → 灌入编辑器）：

```tsx
// RuleTemplatePanel.tsx —— 模板库面板
import { useState } from 'react'
import type { ConditionTree } from './condition-tree'
import { type RuleTemplate, instantiateTemplate } from './rule-template'

export function RuleTemplatePanel({ templates, onApply }: {
  templates: RuleTemplate[]
  onApply: (tree: ConditionTree) => void
}) {
  const [selected, setSelected] = useState<RuleTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string | number>>({})

  const pick = (tpl: RuleTemplate) => {
    setSelected(tpl)
    setValues(Object.fromEntries(tpl.variables.map(v => [v.key, v.defaultValue])))
  }

  return (
    <div className="qb-tpl">
      <ul>
        {templates.map(tpl => (
          <li key={tpl.id}>
            <button type="button" onClick={() => pick(tpl)}>
              <strong>{tpl.name}</strong>
              <span>{tpl.description}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="qb-tpl-form">
          {selected.variables.map(v => (
            <label key={v.key}>
              {v.label}
              <input
                value={values[v.key] ?? ''}
                onChange={e =>
                  setValues(prev => ({ ...prev, [v.key]: e.target.value }))
                }
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              onApply(instantiateTemplate(selected, values)) // 灌入编辑器，用户可继续微调
              setSelected(null)
            }}
          >
            套用模板
          </button>
        </div>
      )}
    </div>
  )
}
```

**代码——规则版本 diff（monaco DiffEditor 复用）**：

```tsx
// RuleVersionDiff.tsx —— 版本对比：monaco diff，复用《进阶大纲》§5 的封装与 worker 配置
import { useMemo } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { ConditionTree, ConditionTreeNode } from './condition-tree'

/** diff 前归一化：去 id、按签名排序——否则每次保存 id 全变，diff 全屏飘红 */
function normalizeForDiff(node: ConditionTreeNode): ConditionTreeNode {
  if (node.kind === 'condition') {
    return { kind: 'condition', id: '', field: node.field, operator: node.operator, value: node.value }
  }
  const children = node.children
    .map(normalizeForDiff)
    .sort((a, b) => signature(a).localeCompare(signature(b)))
  return { kind: 'group', id: '', combinator: node.combinator, children }
}

function signature(n: ConditionTreeNode): string {
  return n.kind === 'condition'
    ? `${n.field}|${n.operator}|${JSON.stringify(n.value)}`
    : `${n.combinator}:(${n.children.map(signature).join(',')})`
}

export function RuleVersionDiff({ current, previous, height = 420 }: {
  current: ConditionTree   // 当前版本（保存后的树）
  previous: ConditionTree  // 上一版本（规则历史表里取）
  height?: number
}) {
  const original = useMemo(() => JSON.stringify(normalizeForDiff(previous), null, 2), [previous])
  const modified = useMemo(() => JSON.stringify(normalizeForDiff(current), null, 2), [current])
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language="json"
      theme="vs"
      height={height}
      options={{
        readOnly: true,                 // diff 只读——版本内容不可在线篡改
        renderSideBySide: true,         // 并排视图：左旧右新，审计场景的标准姿势
        minimap: { enabled: false },    // 规则 JSON 不长，缩略图纯占地方
        fontSize: 12,
      }}
    />
  )
}
```

**常见坑（模板/diff 层）**：
- 症状：套用模板后保存报"未知字段 `vipGrade`"。
- 根因：模板内置的 `tree` 引用了当前环境字段表里不存在的字段——模板是"协议快照"，字段元数据演进（改名/下线）后模板过期了。
- 修法：模板入库与上线走同一套校验（`validateTree` + 字段表），管理端做"模板体检"批量扫描；这与坑 2 的存量规则悬空是同一个问题的两种形态，解法同源——**凡引用元数据的数据（规则/模板/看板），都要有元数据变更后的体检机制**。

### 坑

#### ⚠️ 坑 1：操作符切换后旧 value 类型残留（`>` 的数字 vs `in` 的数组）

- **症状**：用户把"金额 > 100"的操作符从 `>` 换成 `in`，值编辑器切成多选框但显示为空；保存后后端执行报 `{"in": [{"var": "amount"}, 100]}`——`100` 不是数组，规则引擎抛类型错误。或反向：`in` 换成 `>`，值编辑器是数字框却收到 `["BJ"]`，渲染 NaN。更隐蔽的变体：`between` 切到 `=`，value 是 `[100, 200]` 二元数组，比较永远为 false 且不报错。
- **根因**：`operator` 与 `value` 是状态里两个独立字段，编辑器各改各的。切操作符只写了 `operator`，旧 `value` 原地保留——它对新操作符来说类型是错的。UI 上"编辑器正确切换了"掩盖了"数据没清干净"：用户看到空的多选框以为没选值，不知道底下压着一个数字 100。根子是**联动变更被拆成了两次非原子更新**。
- **修法**：联动收敛为一次原子更新——§3.3 的 `applyOperatorChange` 是唯一出口，切换操作符的瞬间按新编辑器重置 value：

```ts
// 唯一合法的操作符切换路径（回顾 §3.3，坑 1 的正解）：
// QueryRow 里 onChange 调 applyOperatorChange，而不是手动 {...node, operator: next}
export function applyOperatorChange(
  node: ConditionNode,
  nextOperator: Operator,
  field: FieldMeta | undefined,
): ConditionNode {
  if (!field) return { ...node, operator: nextOperator }
  const editor = resolveValueEditor(field, nextOperator)
  // 关键：value 与 operator 在同一个新对象里落位，不存在"新操作符配旧值"的中间态
  return { ...node, operator: nextOperator, value: defaultValueFor(field, editor) }
}
```

再补两道纵深防御：值编辑器入口做类型规整（数组进单值编辑器按空处理而非崩溃）；§3.5 转换层对 in/between 的 value 做形状检查（非二元数组/非数组直接抛，脏数据死在关口不进后端）。

#### ⚠️ 坑 2：元数据删除字段后，存量规则条件悬空（需要迁移或标红提示）

- **症状**：某次需求迭代把字段表里的 `deptCode` 下掉了。之后打开两年前配置的告警规则，页面白屏（`fieldMap.get('deptCode')` 为 undefined，取 `field.operators` 崩溃）；修好白屏后又发现字段下拉显示空白行、操作符下拉是空的，用户不知道这行是什么、能不能删；最坏情况：后端规则引擎执行该规则时静默跳过悬空条件——该告的警没人告。
- **根因**：协议里的 `field` 是字符串引用，字段元数据表是独立演进的数据源，两者之间**没有外键约束**——元数据删除不级联、不检查存量引用。这是所有"数据引用另一份可变数据"系统的通病（模板过期、看板引用下线组件、菜单引用下线权限码，全是同构问题）。
- **修法**：三道防线，缺一不可。

第一道，**下线流程改为软删除**：元数据不物理删除，打 `deprecated: true`（§3.3 已支持）——新规则的字段下拉过滤掉它（§3.2 的 filter），存量规则渲染正常但标红提示"字段已下线"（§3.6 校验已产出该错误）。给元数据变更立规矩：删除必须先跑引用审计、观察一个发布周期、再物理清理。

第二道，**渲染容错**：渲染层对悬空字段永远不崩，降级为"红牌行"：

```tsx
// DanglingFieldRow.tsx —— 悬空字段的降级渲染：不崩溃、标红、可手动删除
import type { ConditionNode } from './condition-tree'

export function DanglingFieldRow({ node, onRemove }: {
  node: ConditionNode
  onRemove: () => void
}) {
  return (
    <div className="qb-row qb-row--error" role="alert">
      <span className="qb-dangling-field">未知字段「{node.field}」（已下线）</span>
      <span className="qb-row-error">该条件已失效，请删除此行或联系管理员迁移规则</span>
      <button type="button" onClick={onRemove}>删除此行</button>
    </div>
  )
}
// QueryRow 接入：const field = fieldMap.get(node.field);
// if (!field) return <DanglingFieldRow node={node} onRemove={() => removeNode(node.id)} />
```

第三道，**批量审计与迁移**：管理侧脚本扫全库规则，产出悬空报告，并提供自动剥离（剥离后必须重新过人工确认，因为删条件会改变规则语义——"且"关系里删一行，规则变宽松）：

```ts
// rule-audit.ts —— 存量规则体检：悬空字段审计 + 自动剥离
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import { createGroup } from './tree-ops'
import type { FieldMeta } from './field-meta'

export interface DanglingReport {
  ruleId: string
  nodeId: string
  field: string
}

export function auditTree(ruleId: string, tree: ConditionTree, fieldMap: Map<string, FieldMeta>): DanglingReport[] {
  const reports: DanglingReport[] = []
  const walk = (n: ConditionTreeNode): void => {
    if (n.kind === 'condition') {
      if (!fieldMap.has(n.field)) reports.push({ ruleId, nodeId: n.id, field: n.field })
      return
    }
    n.children.forEach(walk)
  }
  walk(tree)
  return reports
}

/** 自动剥离悬空条件（空组随之剪枝）。注意：剥离改变规则语义，产物必须走人工确认再落库 */
export function stripInvalidNodes(node: ConditionTreeNode, fieldMap: Map<string, FieldMeta>): ConditionTreeNode | null {
  if (node.kind === 'condition') return fieldMap.has(node.field) ? node : null
  const children = node.children
    .map(c => stripInvalidNodes(c, fieldMap))
    .filter((c): c is ConditionTreeNode => c !== null)
  return children.length > 0 ? { ...node, children } : null
}

// 迁移脚本主循环（Node 侧示例）：
// for (const rule of await db.rules.find()) {
//   const reports = auditTree(rule.id, rule.tree, fieldMap)
//   if (reports.length === 0) continue
//   const stripped = stripInvalidNodes(rule.tree, fieldMap) ?? createGroup()
//   await db.ruleMigrations.insert({ ruleId: rule.id, reports, proposal: stripped, status: 'pending_review' })
// }
```

#### ⚠️ 坑 3：深层嵌套 UI 溢出（缩进 + 折叠策略）

- **症状**：用户嵌了 6 层组，每层缩进 16px 加边框圆角，内容区被挤得只剩三分之一，第 5 层的值编辑器（尤其 between 的双输入框）横向溢出、被右边缘裁切；换成小屏笔记本或平板，第 4 层就开始溢出。滚动条出现后，用户拖拽排序时看不到目标组全貌，误操作率飙升。
- **根因**：横向空间是线性资源，嵌套深度每加一，内容区宽度就减 16px+边框——递归结构与有限视宽是天然矛盾。而"嵌套深度上限"校验（§3.6）挡的是协议层，用户在达到上限前就已经处在不可用的 UI 里了：**校验上限（协议健康）与视觉可用性（交互健康）是两条线，后者必须由渲染策略自己解决**。
- **修法**：缩进封顶 + 折叠 + 面包屑三招。

```tsx
// DeepGroupFrame.tsx —— 深层组的"封顶缩进 + 默认折叠 + 路径面包屑"策略
import { useState, type ReactNode } from 'react'
import type { GroupNode } from './condition-tree'
import { countConditions } from './tree-ops'

export function DeepGroupFrame({ node, depth, breadcrumb, children }: {
  node: GroupNode
  depth: number
  breadcrumb: string   // 如 "根 › 内层1 › 内层2"，渲染在折叠条上
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(depth > 3) // 第 3 层以下默认折叠：先给全景，再按需展开
  const indent = Math.min(depth - 1, 3) * 16            // 缩进第 3 层封顶，不再线性吃宽度

  return (
    <div
      style={{
        marginLeft: indent,
        // 超过封顶深度后改用左侧色条表达层级，宽度成本恒定（2px），与深度无关
        borderLeft: depth > 3 ? '2px solid #9aa8b8' : undefined,
        paddingLeft: depth > 3 ? 8 : undefined,
      }}
    >
      <button type="button" className="qb-collapse-toggle" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? '▸' : '▾'} {breadcrumb}
        <span className="qb-collapse-summary">
          {node.combinator === 'and' ? '且' : '或'} · {countConditions(node)} 个条件
        </span>
      </button>
      {!collapsed && <div className="qb-collapse-body">{children}</div>}
    </div>
  )
}
```

策略拆解：**封顶缩进**让宽度损失是 `O(min(depth, 3))` 而非 `O(depth)`，第 4 层起改用左色条+深度徽标表达层级，视觉信息不丢、宽度成本恒定；**默认折叠**（深于 3 层）保证用户看到的永远是一屏内的全景，折叠条上的"且/或 · N 个条件"摘要让不开折叠也能掌握结构；**面包屑**解决"我这是在第几层"的迷失问题。三招叠加后，再配合 §3.6 的 `maxDepth` 校验（默认 5），UI 可用性与协议健康同时闭环。产品层面还有一招治本：当检测到用户连续点"+ 子组"到第 3 层时，浮层提示"深层逻辑建议拆分为两条规则或使用表达式"——**在问题发生前引导，好过发生后补救**。

对标：**react-querybuilder（必读）**、json-logic.com、Retool 的 filter。

**react-querybuilder（架构必读）**：本章所有实现它的源码里都有对应物，读它的正确姿势是带着对照表读——`Rule`/`RuleGroup` 两个递归组件对应本章 QueryRow/QueryGroup；它的组合器模型在"组级 combinator"（默认）之外还提供 `independentCombinators` 模式（每两行之间独立放一个且/或选择器，表达力更强、复杂度也更高），本章行间 chip 是组级模型的轻量增强；它的可定制架构是精华——内部每一个控件（字段下拉、操作符下拉、值编辑器、拖拽把手、行/组容器）都通过 `controls` 属性可替换（v6 及之前叫 `controlElements`），配合按 UI 库分包的 `@react-querybuilder/antd`/`/material`/`/chakra`/`/mantine`/`/bootstrap`/`/dnd`，一套核心逻辑换皮即用——这正是"注册表换组件"思想推到极致的形态，本章 §3.4 的 `valueEditorRegistry` 是它的最小版。它的 `formatQuery` 能把内部查询对象导出为 sql / 参数化 SQL / MongoDB / json-logic / Elasticsearch / CEL / SpEL 等目标，`@react-querybuilder/parse` 提供 `parseSql` / `parseMongoDb` / `parseJsonLogic` / `parseSpel` / `parseCEL` 反向解析——与本章 §3.5 的转换层一一对位，读它的转换器源码（尤其各方言的边界 case 处理）等于给自研转换层做 code review。

**json-logic.com（执行端标准）**：它是"规则即 JSON"的跨语言标准——同一份规则，JS/Java/PHP/Python 都有实现，前后端可各自原生执行，这正是 §3.7 前端试运行与后端执行共用一份规则的基石。适用边界要认清：它擅长**对单条数据的布尔判定**（字段比较、且或非、嵌套），不擅长聚合与时间窗（"过去 5 分钟平均值 > 阈值"这类需要先聚合再判定的逻辑，属于流处理/规则引擎的职责，json-logic 只能表达聚合后的结果判定）；操作符集固定但可通过 `add_operation` 扩展（§3.7 的 `dateAfter` 示例）；深层数据取值靠 `"a.b.0.c"` 字符串路径，没有类型检查，字段名打错在编译期无感、只能靠试运行与 golden case 兜住。安全边界：规则是数据不是代码，不会像 eval 一样执行任意逻辑，但自定义算子若封装了危险能力（发请求、读文件）就等于开了口子——算子注册表要当攻击面管理。

**Retool 的 filter（交互参考）**：它的过滤面板是"渐进式披露"的教学样本——初始只有一行条件，第一行配置完才浮现"AND"按钮，用户从不需要面对一个空组；每个字段按类型给默认操作符（数字给 `=`、文本给 `contains`、枚举给 `in`），把最常用的路径铺到最短；无值操作符选中后值控件原地收起（对应本章 `none` 编辑器）；多条件升组时提供"advanced condition"入口把已有多行包进一个可切且/或的组（对应本章"+ 子组"的逆向操作，值得补一个"包组"交互）；全部操作 inline 在表格上方完成，绝不弹模态框。抄交互时抄的是这三条原则：渐进披露、按类型缩短路径、就地完成，而不是像素。

### 与内核的复用关系：为什么它被列为 ★★★

本文档开头那条暗线在这里兑现——本章一个新内核都没有造，全书三个内核各就各位：

1. **递归渲染器（《进阶大纲》§1.3）→ QueryGroup**：`node.kind === 'group' ? <QueryGroup/> : <QueryRow/>` 的判别分发，与动态表单 `registry[node.type]` 的注册表分发是同一台发动机的两种进气方式。而且本章把递归从"渲染"扩到了"更新"（§3.2 的 tree-ops 全是递归纯函数）与"转换"（§3.5 的 toJsonLogic 递归下降）——递归内核的复利在本章又复利了一次。
2. **Setter 体系（《进阶大纲》§3）→ 值编辑器**：`valueEditorRegistry` 就是 Setter 注册表的二维化（字段 × 操作符 → 组件），组件本体（单选/多选/日期/远程搜索）与属性面板是同一批；§3.0 画像里"高级筛选"业务的字段元数据表，与动态表单 schema 同源下发，一次定义两处消费。
3. **表达式引擎（《进阶大纲》§1.4）→ 试运行面板**：表达式引擎的"编译协议 → 运行时求值"链路，在试运行面板里落地为"条件树 → json-logic → `jsonLogic.apply`"——换了一种协议，跑的是同一条求值管线，而且这次求值结果直接变成 UI 高亮（§3.7 的 hitMap）。

所以优先级的账很好算：**三个已摊销的内核 + 一个新协议 + 一层转换 = 一个完整的高频业务功能**，新增学习成本只剩"条件树协议"与"协议转换层"两块，而这两块恰恰是可迁移资产——任何"前后端契约设计 + 多方言适配"的场景（报表查询、权限数据范围、CDP 人群圈选）都长这个样子。再叠加毕业项目的组装视角：登录后"告警规则配置页（3： 查询构建器）→ 保存为 json-logic 给后端执行"是整套 SaaS 底座里唯一把"编辑器族"和"平台能力族"缝起来的页面——做完它，前面所有章节的投入在这一个页面上完成合流，这就是 ★★★ 的成色。

## 4. JSON Schema 编辑器 / 配置可视化编辑器

**基础**：《进阶大纲》§5（monaco）+ §3（Setter）。增量——这次**编辑的对象是 schema 本身**（元编程视角）。

先把"元编程视角"说透，它决定了本章所有组件的分工。《进阶大纲》§2 里，schema 是**数据**——你写好一份 schema，动态表单把它渲染出来；§3 里，Setter 是**编辑值的控件**——Select、Switch、InputNumber。而本章，schema 变成了**被编辑的值**：树形编辑器在编辑一棵 schema 树，元信息面板是一堆 Setter 在编辑 schema 节点的字段——于是出现了一个套娃结构：**用 Setter 编辑 schema，schema 又驱动中间列的表单预览，预览表单里又是一堆 Setter**。三层各自独立：

```text
┌───────────┐  编辑   ┌────────────────────┐  驱动   ┌──────────────┐
│ 左：schema │ ──────→ │ schema（唯一数据源） │ ──────→ │ 中：表单预览   │
│ 树形编辑器  │ ←────── │                    │ ←────── │ （§2 渲染器） │
└────────────┘  读    └────────┬───────────┘  校验    └──────────────┘
                                  │ 序列化 / 反序列化
                              ┌───▼────────┐
                              │ 右：源码     │
                              │ （§5 monaco）│
                              └────────────┘
```

一个贯穿全章的决策：**不引入中间模型，直接以标准 JSON Schema（draft-07 子集）为唯一数据源**。好处是导出零转换、ajv 直接吃、与后端契约一致；代价是必须直面 schema 协议里几个"反直觉"的设计（后面会逐个踩到，第一个就是 `required` 不挂在字段上而挂在父对象上）。Stoplight、jsonschema.net 这类产品也是这么选的——编辑器壳再复杂，内核永远是"一份 schema JSON 的结构化编辑"。

### 实现路线

1. 树形 schema 编辑器：字段增删、类型切换、拖拽排序（树 = 递归渲染 + dnd-kit）
2. 元信息面板：type/title/required/enum/default/description 的 Setter 表单
3. **双视图同步**：左"表单树"右"源码"，切换时机（失焦切换/脏状态保护），源码光标 ↔ 树节点互跳（JSONPath 定位）
4. 实时校验闭环：编辑 schema → ajv 实时校验右侧样例数据 → 错误高亮
5. `$ref` / `definitions`：引用节点折叠展示与跳转链接

### 路线 1：树形 schema 编辑器 —— 递归渲染 + dnd-kit 树拖拽

**是什么**。把 `properties`/`items` 嵌套结构渲染成一棵可操作的树：每行显示字段名、类型徽标、title 预览；object 节点下挂子字段，array 节点下挂唯一的 `items` 行；行上可增删字段、改字段名、拖拽换位（同级排序 + 跨级移动）。

**为什么需要**。schema 的嵌套深度无上限，必然复用《进阶大纲》§1 的递归渲染器思路；而"拖拽排序"在树上有三种语义（拖到某行**上方**=成为其前兄弟、**下方**=后兄弟、**中间**=成为其子字段），比平铺列表的 dnd 复杂一层——这正是本章相对 §4 拖拽大盘的增量。

**怎么做（机制分步）**：

1. 定义 schema 类型（未 UI 化的关键字用索引签名保留，编辑器不许丢用户手写的 `minLength`）。
2. **扁平化**：递归渲染不等于递归挂 dnd。dnd-kit 需要一个平铺的行列表做碰撞检测，我们把"可见的"树节点拍平成 `Row[]`（折叠的不进列表），行的 id 直接用 JSONPath——这样行的地址和右侧源码的地址是**同一套坐标**，路线 3 的互跳就免费了。
3. 每行用 `useSortable` 注册；`DndContext.onDragMove` 里根据指针在目标行内的**纵向比例**计算落区（上 30% / 中 40% / 下 30%，中间区仅在目标是 object 时生效），画出插入线/高亮框。
4. `onDragEnd` 用不可变路径操作改 schema：同级重排 = 重排 `properties` 的键序（JS 对象键序即展示序）；跨级移动 = 从旧父级删除 + 插入新父级（键冲突自动改名）；同时**禁止把节点拖进自己的子孙**。
5. 删除/重命名字段时，同步维护父节点的 `required` 数组（本章第一坑，见"难点与坑"）。

**代码**。先定类型与路径工具（不可变操作是树编辑的地基，值得手写一遍而不是 immer 一把梭——路径语义要暴露给 dnd 落点计算）：

```ts
// src/schema-workbench/schemaTypes.ts
export type JsonType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface JsonSchemaNode {
  type?: JsonType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: (string | number)[];
  $ref?: string;
  properties?: Record<string, JsonSchemaNode>; // type=object：子字段（键序即展示序）
  items?: JsonSchemaNode;                      // type=array：唯一子节点
  required?: string[];                         // ★ 挂在 object 自身，不是挂在子字段上
  [key: string]: unknown;                      // minLength 等：原样保留，UI 不删用户数据
}

/** '$.properties.user.items' → ['properties','user','items']
 *  本编辑器的树只经 properties/items 下钻（无数组下标），按 '.' 切分即可 */
export function pathToSegs(path: string): string[] {
  return path.slice(2).split('.').filter(Boolean);
}

/** 不可变读取：按 segs 逐层下钻 */
export function getAt(root: JsonSchemaNode, segs: string[]): unknown {
  let cur: unknown = root;
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[s];
  }
  return cur;
}

/** 不可变写入：写时复制路径上的每一层（copy-on-write），返回新根 */
export function setAt<T extends object>(obj: T, segs: string[], value: unknown): T {
  const [head, ...rest] = segs;
  if (rest.length === 0) {
    const copy = Array.isArray(obj) ? ([...obj] as unknown as T) : { ...obj };
    (copy as Record<string, unknown>)[head] = value;
    return copy;
  }
  const child = (obj as Record<string, unknown>)[head];
  const copy = Array.isArray(obj) ? ([...obj] as unknown as T) : { ...obj };
  (copy as Record<string, unknown>)[head] = setAt(
    (child ?? {}) as Record<string, unknown>,
    rest,
    value,
  ) as unknown;
  return copy;
}

/** 删除属性节点时连带清理由此产生的 required 残留 */
export function deleteProperty(root: JsonSchemaNode, parentPath: string, key: string): JsonSchemaNode {
  const parentSegs = pathToSegs(parentPath);
  const parent = getAt(root, parentSegs) as JsonSchemaNode;
  const nextProperties = { ...(parent.properties ?? {}) };
  delete nextProperties[key];
  const nextRequired = (parent.required ?? []).filter((k) => k !== key);
  const nextParent: JsonSchemaNode = {
    ...parent,
    properties: nextProperties,
    ...(parent.required ? { required: nextRequired } : {}),
  };
  return setAt(root, parentSegs, nextParent);
}

/** 同级重排：利用"对象键序即展示序"重建 properties */
export function reorderProperty(
  root: JsonSchemaNode,
  parentPath: string,
  fromKey: string,
  toIndex: number,
): JsonSchemaNode {
  const parentSegs = pathToSegs(parentPath);
  const parent = getAt(root, parentSegs) as JsonSchemaNode;
  const entries = Object.entries(parent.properties ?? {});
  const from = entries.findIndex(([k]) => k === fromKey);
  if (from < 0) return root;
  const [moved] = entries.splice(from, 1);
  const adjusted = from < toIndex ? toIndex - 1 : toIndex; // 删除导致的索引前移要补偿
  entries.splice(adjusted, 0, moved);
  return setAt(root, parentSegs, { ...parent, properties: Object.fromEntries(entries) });
}

/** 跨级移动：删除 + 插入；目标已有同名键时自动改名（key、key-2、key-3…） */
export function moveProperty(
  root: JsonSchemaNode,
  fromParentPath: string,
  key: string,
  toParentPath: string,
  toIndex: number,
): JsonSchemaNode {
  if (fromParentPath === toParentPath) return reorderProperty(root, fromParentPath, key, toIndex);
  const fromSegs = pathToSegs(fromParentPath);
  const toSegs = pathToSegs(toParentPath);
  const fromParent = getAt(root, fromSegs) as JsonSchemaNode;
  const toParent = getAt(root, toSegs) as JsonSchemaNode;
  const movedNode = fromParent.properties?.[key];
  if (!movedNode) return root;

  // 防环：目标父级不能是自己的子孙
  if (toParentPath === `${fromParentPath}.${key}` || toParentPath.startsWith(`${fromParentPath}.${key}.`)) {
    return root;
  }

  const nextRoot = deleteProperty(root, fromParentPath, key);
  const freshTo = getAt(nextRoot, toSegs) as JsonSchemaNode; // 删除后父级对象已换新引用
  const entries = Object.entries(freshTo.properties ?? {});
  let finalKey = key;
  const existing = new Set(entries.map(([k]) => k));
  let n = 2;
  while (existing.has(finalKey)) finalKey = `${key}-${n++}`;
  entries.splice(Math.min(toIndex, entries.length), 0, [finalKey, movedNode]);
  const withInserted: JsonSchemaNode = { ...freshTo, properties: Object.fromEntries(entries) };
  const finalRoot = setAt(nextRoot, toSegs, withInserted);
  // 键改名时 required 同步迁移
  if (finalKey !== key && (fromParent.required ?? []).includes(key)) {
    const toRequired = [...(withInserted.required ?? []), finalKey];
    return setAt(finalRoot, toSegs, { ...withInserted, required: toRequired });
  }
  return finalRoot;
}
```

扁平化与递归渲染：

```ts
// src/schema-workbench/flatten.ts
import type { JsonSchemaNode } from './schemaTypes';

export interface Row {
  id: string;          // JSONPath，与右侧源码同一套地址系统
  parentPath: string | null;
  key: string;         // 字段名；array 的子行固定为 'items'
  node: JsonSchemaNode;
  depth: number;
  expandable: boolean; // 有 properties 或 items 即可展开
}

export function isExpandable(node: JsonSchemaNode): boolean {
  return Boolean(node.items) || Object.keys(node.properties ?? {}).length > 0;
}

export function flattenRows(root: JsonSchemaNode, expanded: Set<string>): Row[] {
  const rows: Row[] = [{ id: '$', parentPath: null, key: '$', node: root, depth: 0, expandable: isExpandable(root) }];
  const walk = (node: JsonSchemaNode, parentId: string, depth: number) => {
    const entries: [string, JsonSchemaNode][] = Object.entries(node.properties ?? {});
    if (node.items) entries.push(['items', node.items]);
    for (const [key, child] of entries) {
      const id = key === 'items' ? `${parentId}.items` : `${parentId}.${key}`;
      rows.push({ id, parentPath: parentId, key, node: child, depth, expandable: isExpandable(child) });
      if (isExpandable(child) && expanded.has(id)) walk(child, id, depth + 1);
    }
  };
  if (expanded.has('$')) walk(root, '$', 1);
  return rows;
}
```

dnd 树主体（落区计算 + 拖拽视觉 + 增删改的胶水）：

```tsx
// src/schema-workbench/SchemaTree.tsx
import { useState, useRef, useMemo } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragMoveEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JsonSchemaNode } from './schemaTypes';
import { flattenRows, isExpandable, type Row } from './flatten';
import { moveProperty, reorderProperty, deleteProperty, setAt, pathToSegs, getAt } from './schemaTypes';

type DropZone = { targetId: string; mode: 'before' | 'after' | 'inside' } | null;

const TYPE_COLORS: Record<string, string> = {
  string: '#1890ff', number: '#722ed1', integer: '#722ed1', boolean: '#13c2c2',
  object: '#fa8c16', array: '#eb2f96', null: '#8c8c8c',
};

export function SchemaTree({
  schema, expanded, selectedId,
  onSchemaChange, onExpandedChange, onSelect,
}: {
  schema: JsonSchemaNode;
  expanded: Set<string>;
  selectedId: string | null;
  onSchemaChange: (next: JsonSchemaNode) => void;
  onExpandedChange: (next: Set<string>) => void;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(() => flattenRows(schema, expanded), [schema, expanded]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // pointerSensor 设 5px 激活距离：避免点选行时误判为拖拽
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findRow = (id: string) => rows.find((r) => r.id === id);

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));

  // 核心：指针纵向位置 → before / inside / after 三落区
  const onDragMove = (e: DragMoveEvent) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || overId === draggingId || overId === '$') { setDropZone(null); return; }
    const rowEl = rowRefs.current.get(overId);
    const target = findRow(overId);
    if (!rowEl || !target || !draggingId) { setDropZone(null); return; }

    // 防环：目标在拖拽节点的子树里 → 不给任何落区
    if (overId === `${draggingId}` || overId.startsWith(`${draggingId}.`)) { setDropZone(null); return; }

    const rect = rowEl.getBoundingClientRect();
    const pointerY = (e.activatorEvent as PointerEvent).clientY + e.delta.y; // 起点 + 位移 = 当前指针
    const ratio = (pointerY - rect.top) / rect.height;
    const canInside = target.key !== 'items' && (target.node.type === 'object' || !target.node.type) && target.id !== '$';
    const mode: 'before' | 'after' | 'inside' =
      ratio < 0.3 ? 'before' : ratio > 0.7 ? 'after' : canInside ? 'inside' : ratio < 0.5 ? 'before' : 'after';
    setDropZone({ targetId: overId, mode });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    setDraggingId(null);
    const zone = dropZone;
    setDropZone(null);
    if (!zone || zone.targetId === activeId) return;

    const source = findRow(activeId)!;
    const target = findRow(zone.targetId)!;
    if (source.key === 'items' || target.id === '$') return; // items 行（array 的子节点）不参与移动

    if (zone.mode === 'inside') {
      // 成为目标的最后一个子字段
      const targetProps = Object.keys(target.node.properties ?? {}).length;
      onSchemaChange(moveProperty(schema, source.parentPath!, source.key, target.id, targetProps));
      onExpandedChange(new Set([...expanded, target.id])); // 落进去后自动展开，给用户即时反馈
    } else {
      // 同级：重排；跨级：插入为目标的前/后兄弟
      const sameParent = source.parentPath === target.parentPath;
      const targetIndex = Object.keys(
        (getAt(schema, pathToSegs(target.parentPath!)) as JsonSchemaNode).properties ?? {},
      ).indexOf(target.key);
      const insertAt = zone.mode === 'before' ? targetIndex : targetIndex + 1;
      if (sameParent) {
        onSchemaChange(reorderProperty(schema, source.parentPath!, source.key, insertAt));
      } else {
        onSchemaChange(moveProperty(schema, source.parentPath!, source.key, target.parentPath!, insertAt));
      }
    }
  };

  const addProperty = (parentId: string) => {
    const segs = pathToSegs(parentId);
    const parent = getAt(schema, segs) as JsonSchemaNode;
    const existing = new Set(Object.keys(parent.properties ?? {}));
    let key = 'field';
    let n = 2;
    while (existing.has(key)) key = `field${n++}`;
    const next = setAt(schema, segs, {
      ...parent,
      properties: { ...(parent.properties ?? {}), [key]: { type: 'string', title: key } },
    }) as JsonSchemaNode;
    onSchemaChange(next);
    onSelect(parentId === '$' ? `$.${key}` : `${parentId}.${key}`);
  };

  const draggingRow = draggingId ? findRow(draggingId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => { setDraggingId(null); setDropZone(null); }}
    >
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        {rows.map((row) => (
          <TreeRow
            key={row.id}
            row={row}
            schema={schema}
            expanded={expanded}
            selectedId={selectedId}
            dropZone={dropZone?.targetId === row.id ? dropZone.mode : null}
            registerRef={(el) => {
              if (el) rowRefs.current.set(row.id, el);
              else rowRefs.current.delete(row.id);
            }}
            onSelect={onSelect}
            onToggle={() => {
              const next = new Set(expanded);
              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
              onExpandedChange(next);
            }}
            onAdd={addProperty}
            onDelete={(rowToDelete) => onSchemaChange(deleteProperty(schema, rowToDelete.parentPath!, rowToDelete.key))}
          />
        ))}
      </SortableContext>
      {/* 拖拽幽灵：跟手预览，原行半透明 */}
      <DragOverlay>
        {draggingRow ? (
          <div style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4, padding: '4px 8px', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
            {draggingRow.key} : {draggingRow.node.type ?? 'object'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TreeRow({
  row, schema, expanded, selectedId, dropZone, registerRef,
  onSelect, onToggle, onAdd, onDelete,
}: {
  row: Row;
  schema: JsonSchemaNode;
  expanded: Set<string>;
  selectedId: string | null;
  dropZone: 'before' | 'after' | 'inside' | null;
  registerRef: (el: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onToggle: () => void;
  onAdd: (parentId: string) => void;
  onDelete: (row: Row) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const required = row.parentPath
    ? ((getAt(schema, pathToSegs(row.parentPath)) as JsonSchemaNode).required ?? []).includes(row.key)
    : false;

  return (
    <div
      ref={registerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        paddingLeft: row.depth * 18 + 4,
        height: 30, opacity: isDragging ? 0.4 : 1,
        transform: CSS.Transform.toString(transform), transition,
        background: selectedId === row.id ? '#e6f4ff' : undefined,
        borderTop: dropZone === 'before' ? '2px solid #1890ff' : undefined,
        borderBottom: dropZone === 'after' ? '2px solid #1890ff' : undefined,
        outline: dropZone === 'inside' ? '2px solid #1890ff' : undefined,
        cursor: 'default',
      }}
    >
      <span
        onClick={row.expandable ? onToggle : undefined}
        style={{ width: 16, cursor: row.expandable ? 'pointer' : 'default', color: '#999', fontSize: 10 }}
      >
        {row.expandable ? (expanded.has(row.id) ? '▼' : '▶') : ''}
      </span>
      {/* ⠿ 拖拽把手：把手才是 drag activator，行本体留给点击选中 */}
      <span ref={setActivatorNodeRef} {...attributes} {...listeners} style={{ cursor: 'grab', color: '#bbb', fontSize: 12 }}>⠿</span>
      <span onClick={() => onSelect(row.id)} style={{ cursor: 'pointer', fontWeight: 500 }}>
        {row.key}
        {required && <span style={{ color: '#ff4d4f' }}> *</span>}
      </span>
      <span style={{ fontSize: 10, padding: '0 6px', borderRadius: 3, background: TYPE_COLORS[row.node.type ?? 'object'] ?? '#d9d9d9', color: '#fff' }}>
        {row.node.type ?? 'object'}
      </span>
      {row.node.title && row.node.title !== row.key && (
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>{row.node.title}</span>
      )}
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {(row.node.type === 'object' || !row.node.type) && row.key !== 'items' && (
          <button onClick={() => onAdd(row.id)} title="加子字段">＋</button>
        )}
        {row.key !== 'items' && row.id !== '$' && (
          <button onClick={() => onDelete(row)} title="删除字段">×</button>
        )}
      </span>
    </div>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：拖拽跨级移动后，字段"消失"了，预览表单里却仍有一个同名的幽灵必填项。根因：`required` 挂在**旧父对象**上，移动只搬了 `properties`，没搬 `required`；`deleteProperty` 清了旧父的 required，但插入新父时若键被自动改名，required 没跟着改名。修法：上面 `moveProperty` 末尾的 required 迁移逻辑——**凡是动 `properties` 键的操作（删、改名、移动），都必须把 required 数组当作它的影子同步维护**。这是 schema 编辑器与普通树编辑器最大的协议差异。
- 症状：把字段拖进自己的子级，整棵子树凭空消失（数据没丢但渲染栈溢出或树断裂）。根因：树落点没有防环校验，`A.properties.self = A` 造成循环引用。修法：`onDragMove` 里判断目标 id 是否以 `${draggingId}.` 开头（同一地址系统的好处：字符串前缀判断就是子孙判断），是则不给落区。

### 路线 2：元信息面板 —— 每个元字段一个 Setter

**是什么**。右侧（或左侧第二栏）一张表单，编辑选中节点的元信息：`type`、`title`、`required`、`enum`、`default`、`description`。每个字段就是一个 §3 的 Setter——受控组件，`{value, onChange}` 签名。

**为什么需要**。树只解决"结构"（有哪些字段、怎么嵌套），元信息解决"语义"（这个字段叫什么、必填吗、枚举值有哪些）。把两者拆开，树保持轻（一行 30px 能塞下），元信息面板按 type 条件渲染——这是 schema 编辑器信息密度的关键取舍：**结构操作在树上、语义编辑在面板上**，比 Notion 式"全部内联"效率高得多。

**怎么做**。每个元字段一个小组件，全部遵循 §3 Setter 约定；面板按 `node.type` 决定显示哪些 Setter：

- `type`：Select。**切类型是破坏性操作**（object→string 会丢整棵子树），要二次确认；切换后清洗不兼容的元字段（见坑 3）。
- `title`：Input，失焦提交（避免每个字符触发一次全树重渲染）。
- `required`：Switch。写入位置在**父节点**的 `required` 数组—— Setter 操作的目标和它所在面板的节点不是同一个对象，这是元编程的典型错位。
- `enum`：标签编辑器（string 逐项 Input + 回车加入；number 用 InputNumber）。
- `default`：按 type 分发——string→Input、number→InputNumber、boolean→Switch、object/array→JSON 多行文本（带解析错误行内提示）。default 还要**过一遍 enum 校验**：default 不在 enum 里是用户最常见的自相矛盾。
- `description`：Textarea。

**代码**（面板主体 + 最有代表性的三个 Setter）：

```tsx
// src/schema-workbench/MetaPanel.tsx
import { useEffect, useState } from 'react';
import type { JsonSchemaNode, JsonType } from './schemaTypes';
import { setAt, pathToSegs, getAt } from './schemaTypes';

export function MetaPanel({
  schema, selectedId, onSchemaChange,
}: {
  schema: JsonSchemaNode;
  selectedId: string;
  onSchemaChange: (next: JsonSchemaNode) => void;
}) {
  const segs = pathToSegs(selectedId);
  const node = (segs.length === 0 ? schema : getAt(schema, segs)) as JsonSchemaNode;
  const parent = selectedId.includes('.')
    ? (getAt(schema, segs.slice(0, -1)) as JsonSchemaNode)
    : null;
  const key = segs.length ? segs[segs.length - 1]! : '$';

  // 局部写 helper：改当前节点的某个字段
  const patch = (partial: Partial<JsonSchemaNode>) => {
    const next = { ...node, ...partial };
    // type 切换时清洗不兼容元字段，避免残留脏数据
    if (partial.type && partial.type !== node.type) {
      if (partial.type !== 'string' && partial.type !== 'number' && partial.type !== 'integer') delete next.enum;
      if (next.type !== 'array') delete next.items;
      if (next.type !== 'object') { delete next.properties; delete next.required; }
      if (next.type === 'object' || next.type === 'array') delete next.default;
    }
    onSchemaChange(segs.length === 0 ? (next as JsonSchemaNode) : (setAt(schema, segs, next) as JsonSchemaNode));
  };

  // required 写在父节点上：读父算当前值，写父改数组
  const required = parent?.required?.includes(key) ?? false;
  const toggleRequired = (v: boolean) => {
    if (!parent) return;
    const segsParent = segs.slice(0, -1);
    const arr = new Set(parent.required ?? []);
    v ? arr.add(key) : arr.delete(key);
    const nextParent = { ...parent, required: [...arr] };
    onSchemaChange(setAt(schema, segsParent, nextParent) as JsonSchemaNode);
  };

  return (
    <div style={{ display: 'grid', gap: 12, padding: 12 }}>
      <Field label="字段名">
        <input
          defaultValue={key}
          disabled={!parent || key === 'items'}
          onBlur={(e) => {
            const nextKey = e.target.value.trim();
            if (!parent || !nextKey || nextKey === key) return;
            if (Object.keys(parent.properties ?? {}).includes(nextKey)) {
              e.target.value = key; // 重名：回滚 + 行内提示（真实项目换成受控错误态）
              return;
            }
            const entries = Object.entries(parent.properties ?? {}).map(([k, v]) => [k === key ? nextKey : k, v] as const);
            const nextParent: JsonSchemaNode = { ...parent, properties: Object.fromEntries(entries) };
            const withRequired = parent.required?.includes(key)
              ? { ...nextParent, required: (parent.required ?? []).map((k) => (k === key ? nextKey : k)) }
              : nextParent;
            onSchemaChange(setAt(schema, segs.slice(0, -1), withRequired) as JsonSchemaNode);
          }}
          style={inputStyle}
        />
      </Field>

      <Field label="类型">
        <select value={node.type ?? 'object'} onChange={(e) => {
          const nextType = e.target.value as JsonType;
          const willLoseChildren = (node.properties || node.items) && nextType !== 'object' && nextType !== 'array';
          if (willLoseChildren && !window.confirm(`切换为 ${nextType} 将丢弃子字段，确定？`)) return;
          patch({ type: nextType });
        }} style={inputStyle}>
          {(['string', 'number', 'integer', 'boolean', 'object', 'array'] as JsonType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>

      <Field label="标题（title）">
        <InputCommit initial={node.title} onCommit={(v) => patch({ title: v || undefined })} />
      </Field>

      <Field label="必填（required，写于父对象）">
        <input type="checkbox" checked={required} onChange={(e) => toggleRequired(e.target.checked)} />
      </Field>

      {(node.type === 'string' || node.type === 'number' || node.type === 'integer') && (
        <Field label="枚举（enum）">
          <EnumSetter value={node.enum} isNumber={node.type !== 'string'} onChange={(enum_) => patch({ enum: enum_ })} />
        </Field>
      )}

      <Field label="默认值（default）">
        <DefaultSetter node={node} onChange={(d) => patch({ default: d })} />
      </Field>

      <Field label="描述（description）">
        <textarea
          defaultValue={node.description}
          onBlur={(e) => patch({ description: e.target.value || undefined })}
          rows={3} style={inputStyle}
        />
      </Field>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4, boxSizing: 'border-box' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#555' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** 失焦才提交的受控 Input：打字不触发上层 schema 更新 */
function InputCommit({ initial, onCommit }: { initial: string | undefined; onCommit: (v: string) => void }) {
  const [text, setText] = useState(initial ?? '');
  useEffect(() => setText(initial ?? ''), [initial]);
  return <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onCommit(text)} style={inputStyle} />;
}

/** enum Setter：string 用标签流，number 强转数值；并联动校验 default 是否仍在枚举内 */
function EnumSetter({ value, isNumber, onChange }: { value: (string | number)[] | undefined; isNumber: boolean; onChange: (v: (string | number)[]) => void }) {
  const [draft, setDraft] = useState('');
  const items = value ?? [];
  const add = () => {
    const t = draft.trim();
    if (!t || items.includes(isNumber ? Number(t) : t)) return;
    onChange([...items, isNumber ? Number(t) : t]);
    setDraft('');
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {items.map((it, i) => (
        <span key={`${it}-${i}`} style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 3, padding: '1px 6px', fontSize: 12 }}>
          {String(it)}
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
        </span>
      ))}
      <input
        value={draft}
        type={isNumber ? 'number' : 'text'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="输入后回车"
        style={{ width: 110, padding: '2px 6px', border: '1px solid #d9d9d9', borderRadius: 4 }}
      />
    </div>
  );
}

/** default Setter：按 type 分发控件；object/array 走 JSON 文本 + 即时解析反馈 */
function DefaultSetter({ node, onChange }: { node: JsonSchemaNode; onChange: (d: unknown) => void }) {
  const [jsonText, setJsonText] = useState(node.default === undefined ? '' : JSON.stringify(node.default, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  useEffect(() => setJsonText(node.default === undefined ? '' : JSON.stringify(node.default, null, 2)), [node.default]);

  switch (node.type) {
    case 'boolean':
      return <input type="checkbox" checked={node.default === true} onChange={(e) => onChange(e.target.checked)} />;
    case 'object':
    case 'array': {
      const commit = (text: string) => {
        if (!text.trim()) { onChange(undefined); setJsonError(null); return; }
        try {
          const parsed = JSON.parse(text) as unknown;
          setJsonError(null);
          onChange(parsed);
        } catch (err) {
          setJsonError((err as Error).message); // 解析失败：不写回 schema，行内报错
        }
      };
      return (
        <div>
          <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} onBlur={(e) => commit(e.target.value)} rows={4} style={inputStyle} />
          {jsonError && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{jsonError}</div>}
        </div>
      );
    }
    case 'number':
    case 'integer': {
      const num = typeof node.default === 'number' ? node.default : undefined;
      const inEnum = !node.enum || num === undefined || node.enum.includes(num);
      return (
        <div>
          <input type="number" value={num ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} style={inputStyle} />
          {!inEnum && <div style={{ color: '#fa8c16', fontSize: 12 }}>default 不在 enum 内</div>}
        </div>
      );
    }
    default: // string
      return (
        <InputCommit initial={typeof node.default === 'string' ? node.default : undefined} onCommit={(v) => onChange(v || undefined)} />
      );
  }
}
```

**常见坑（症状 → 根因 → 修法）**：症状——type 从 string 切成 object 后，enum 标签还残留在 schema 里，导出给后端时被严格校验器拒绝。根因：元字段与 type 是**多对一**关系（enum 只对三种标量合法，items 只对 array 合法），Setter 各改各的，没人负责联动清理。修法：`patch` 里的类型切换清洗段——**type 变更必须携带一次元字段相容性清洗**，这段逻辑写在面板（唯一知道"变了什么"的地方），而不是分散在每个 Setter 里。

### 路线 3：双视图同步 —— 切换时机与光标 ↔ JSONPath 互跳

**是什么**。左树（含元信息面板）与右侧 monaco 源码编辑同一份 schema，两边要同步：结构同步（树改了，源码变；源码改了，树变）+ 光标同步（光标落在源码某属性上，树高亮该节点；点树节点，源码滚过去并选中）。

**为什么需要**。树视图善于结构操作但看不见"原始真相"；源码视图精确但手写嵌套 JSON 极易出错。双视图 = 两种用户（配置员 / 程序员）+ 两种任务（结构 / 精修）各取所需。同步做不好（互相覆盖、光标乱跳），双视图就从生产力变成数据丢失事故现场。

**怎么做——先解决"谁是权威"**。两套策略，代码里做成可切换：

- **策略 A：失焦切换（blur-commit）**。默认树是权威；用户点进源码 → 源码变权威，此刻把最新 schema 序列化进编辑器（一次性 `setValue`）；源码编辑期间树**冻结**在进入时的快照；源码失焦（blur）或切换回树时，尝试 `JSON.parse`：成功 → 写回 schema、树解冻；失败 → 阻止切换 + 错误提示。适合"偶尔去源码改一改"的团队。
- **策略 B：脏状态保护（dirty-guard）**。两个视图永远同时展示，源码一被编辑就置 `codeDirty`；dirty 期间禁止树编辑（树面板遮罩 + "源码有未应用的修改"），同时对源码做 400ms 防抖解析，一旦解析成功就自动应用回 schema 并清 dirty。好处是**任何时刻都不会有第二份真相**；代价是 dirty 期间树只读。Stoplight Studio 的表单/代码模式就是 B 的变体（显式"应用"按钮）。

两策略共用一个控制器：

```ts
// src/schema-workbench/useDualView.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { JsonSchemaNode } from './schemaTypes';

export type DualViewMode = 'tree' | 'code';
export type SyncStrategy = 'blur-commit' | 'dirty-guard';

export function useDualView(initialSchema: JsonSchemaNode, strategy: SyncStrategy) {
  const [mode, setMode] = useState<DualViewMode>('tree');
  const [schema, setSchema] = useState(initialSchema);            // 权威 schema（树消费）
  const [code, setCode] = useState(() => JSON.stringify(initialSchema, null, 2)); // 源码文本（monaco 消费）
  const [codeDirty, setCodeDirty] = useState(false);               // 源码有未应用修改
  const [codeError, setCodeError] = useState<string | null>(null); // 源码当前解析错误
  const lastGoodCode = useRef(code);                               // 最近一次可解析的源码（树冻结用）
  const timer = useRef<number | undefined>(undefined);

  // dirty-guard：源码编辑后防抖解析，合法即自动应用
  const onCodeChange = useCallback((next: string) => {
    setCode(next);
    setCodeDirty(true);
    setCodeError(null);
    if (strategy !== 'dirty-guard') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(next) as JsonSchemaNode;
        lastGoodCode.current = next;
        setSchema(parsed);   // 合法 → 立即成为新的权威
        setCodeDirty(false); // dirty 清除，树解除冻结
      } catch (err) {
        setCodeError((err as Error).message); // 非法 → 保持 dirty，树继续冻结
      }
    }, 400);
  }, [strategy]);

  // blur-commit：失焦时一次性提交
  const onCodeBlur = useCallback(() => {
    if (strategy !== 'blur-commit' || !codeDirty) return;
    try {
      const parsed = JSON.parse(code) as JsonSchemaNode;
      lastGoodCode.current = code;
      setSchema(parsed);
      setCodeDirty(false);
      setCodeError(null);
    } catch (err) {
      setCodeError((err as Error).message); // 失焦但非法：不切走、不丢字
    }
  }, [code, codeDirty, strategy]);

  // 树 → 源码：把权威 schema 序列化进源码（仅 blur-commit 且源码不脏时）
  const onSchemaChange = useCallback((next: JsonSchemaNode) => {
    setSchema(next);
    if (strategy === 'blur-commit' && !codeDirty) {
      const text = JSON.stringify(next, null, 2);
      setCode(text);
      lastGoodCode.current = text;
    }
    // dirty-guard 下 code 由防抖解析回写，树永远不改源码文本，避免覆盖用户输入
  }, [codeDirty, strategy]);

  const switchTo = useCallback((next: DualViewMode) => {
    if (next === 'tree' && codeDirty) {
      try {
        const parsed = JSON.parse(code) as JsonSchemaNode;
        setSchema(parsed);
        setCodeDirty(false);
        setCodeError(null);
        setMode('tree');
      } catch {
        setCodeError('源码不是合法 JSON，无法切回树视图'); // 拒绝切换：脏保护兜底
      }
      return;
    }
    setMode(next);
  }, [code, codeDirty]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    mode, switchTo, schema, onSchemaChange,
    code, onCodeChange, onCodeBlur, codeDirty, codeError,
    frozenCode: lastGoodCode, // 树冻结时渲染的快照
  };
}
```

**光标 ↔ JSONPath 互跳——地址系统**。双向同步的本质是给每个 schema 节点建一个"双地址"：树侧是 JSONPath（`$.properties.user.properties.name`，就是路线 1 的 Row.id），源码侧是文本 offset 区间。`JSON.parse` 不给位置，需要一个扫描器。生产可用 `json-source-map` 一步拿到 pointer→区间映射；这里手写（它同时是路线 4 把 ajv 错误映射回文本的基石）：

```ts
// src/schema-workbench/pathMap.ts —— 文本 offset ↔ JSONPath 的地址系统
export interface NodeRef {
  path: string;    // '$.properties.user.properties.name'
  isKey: boolean;  // true = 键名 token（"name" 这两个引号之间），false = 值或容器
  start: number;   // 文本区间 [start, end)，字符 offset
  end: number;
}
export interface PathMap {
  nodes: NodeRef[];  // 按 start 升序（递归下降天然有序）
  value: unknown;    // 顺手返回解析结果，省一次 JSON.parse
}

/** 简化 JSON 扫描器：对象/数组/字符串（含转义）/数字/true/false/null；不合法返回 null */
export function buildPathMap(text: string): PathMap | null {
  let pos = 0;
  const nodes: NodeRef[] = [];
  const ws = () => { while (pos < text.length && ' \t\r\n'.includes(text[pos]!)) pos++; };
  const ch = () => text[pos];

  function str(): { v: string; s: number; e: number } {
    const s = pos;
    pos++; // 开头引号
    let raw = '';
    while (pos < text.length && ch() !== '"') {
      if (ch() === '\\') { raw += text[pos]! + (text[pos + 1] ?? ''); pos += 2; } // 转义原样保留，反转义交给 JSON.parse
      else { raw += text[pos]!; pos++; }
    }
    if (ch() !== '"') throw new Error('字符串未闭合');
    pos++;
    return { v: JSON.parse(`"${raw}"`) as string, s, e: pos };
  }

  function val(path: string): unknown {
    ws();
    const c = ch();
    if (c === '{') return obj(path);
    if (c === '[') return arr(path);
    if (c === '"') { const t = str(); nodes.push({ path, isKey: false, start: t.s, end: t.e }); return t.v; }
    const m = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!m) throw new Error(`offset ${pos} 意外字符`);
    pos += m[0].length;
    nodes.push({ path, isKey: false, start: pos - m[0].length, end: pos });
    return m[0] === 'true' ? true : m[0] === 'false' ? false : m[0] === 'null' ? null : Number(m[0]);
  }

  function obj(path: string): Record<string, unknown> {
    const s = pos;
    pos++;
    const idx = nodes.length;
    nodes.push({ path, isKey: false, start: s, end: -1 }); // 容器 end 回填
    const out: Record<string, unknown> = {};
    ws();
    if (ch() === '}') { pos++; nodes[idx]!.end = pos; return out; }
    for (;;) {
      ws();
      const k = str();
      nodes.push({ path: `${path}.${k.v}`, isKey: true, start: k.s, end: k.e }); // 键单独记录：点树时高亮键更直观
      ws();
      if (ch() !== ':') throw new Error('对象缺少 :');
      pos++;
      out[k.v] = val(`${path}.${k.v}`);
      ws();
      if (ch() === ',') { pos++; continue; }
      if (ch() === '}') { pos++; break; }
      throw new Error('对象格式错误');
    }
    nodes[idx]!.end = pos;
    return out;
  }

  function arr(path: string): unknown[] {
    const s = pos;
    pos++;
    const idx = nodes.length;
    nodes.push({ path, isKey: false, start: s, end: -1 });
    const out: unknown[] = [];
    ws();
    if (ch() === ']') { pos++; nodes[idx]!.end = pos; return out; }
    for (;;) {
      out.push(val(`${path}[${out.length}]`));
      ws();
      if (ch() === ',') { pos++; continue; }
      if (ch() === ']') { pos++; break; }
      throw new Error('数组格式错误');
    }
    nodes[idx]!.end = pos;
    return out;
  }

  try {
    ws();
    const value = val('$');
    ws();
    if (pos !== text.length) throw new Error('根元素后有多余内容');
    return { nodes, value };
  } catch {
    return null; // 半成品文本（正删着括号）很常见：返回 null，调用方沿用旧映射
  }
}

/** 光标 offset → 命中的最深节点：nodes 有序，后命中（更深层）覆盖外层容器 */
export function pathAtOffset(nodes: NodeRef[], offset: number): NodeRef | null {
  let hit: NodeRef | null = null;
  for (const n of nodes) {
    if (n.start > offset) break;
    if (offset < n.end) hit = n;
  }
  return hit;
}

/** 反向：path → 文本区间（优先键名，键在行首更好认） */
export function rangeOfPath(nodes: NodeRef[], path: string): { start: number; end: number } | null {
  const keyNode = nodes.find((n) => n.path === path && n.isKey);
  const anyNode = nodes.find((n) => n.path === path);
  const t = keyNode ?? anyNode;
  return t ? { start: t.start, end: t.end } : null;
}
```

monaco 侧接线（两个方向 + 防环闸门）：

```tsx
// src/schema-workbench/CodePane.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { buildPathMap, pathAtOffset, rangeOfPath, type PathMap } from './pathMap';

export function CodePane({
  code, onChange, onBlur, highlightPath, onCursorPath,
}: {
  code: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  highlightPath: string | null;      // 树点击 → 要定位/高亮的 path
  onCursorPath: (path: string | null) => void; // 光标移动 → 通知树
}) {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decosRef = useRef<monacoEditor.IEditorDecorationsCollection | null>(null);
  const suppressUntil = useRef(0); // ★ 防环闸门：程序化定位后 150ms 内忽略光标事件

  const pathMap: PathMap | null = useMemo(() => buildPathMap(code), [code]);
  const mapRef = useRef(pathMap);
  mapRef.current = pathMap;

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decosRef.current = editor.createDecorationsCollection([]);

    // 方向一：源码光标 → JSONPath → 通知树
    editor.onDidChangeCursorPosition((e) => {
      if (Date.now() < suppressUntil.current) return; // 自己 setSelection 触发的：忽略
      const model = editor.getModel();
      const map = mapRef.current;
      if (!model || !map) return;
      const offset = model.getOffsetAt(e.position);
      const hit = pathAtOffset(map.nodes, offset);
      onCursorPath(hit?.path ?? null);
    });

    // 失焦提交钩子（blur-commit 策略用）：monaco 的失焦事件，不是 React 的 onBlur
    editor.onDidBlurEditorText(() => onBlur());
  };

  // 方向二：树点击 → revealRangeInCenter 定位（有精确区间时）
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model || !pathMap || !highlightPath) return;
    const range = rangeOfPath(pathMap.nodes, highlightPath);
    if (!range) return;
    suppressUntil.current = Date.now() + 150; // 先抬闸门再动光标
    const s = model.getPositionAt(range.start);
    const e = model.getPositionAt(range.end);
    const r = new monaco.Range(s.lineNumber, s.column, e.lineNumber, e.column);
    editor.setSelection(r);
    editor.revealRangeInCenter(r); // 精确区间 → 区间居中（比 revealLineInCenter 更准）
    editor.focus();
    decosRef.current?.set([{
      range: r,
      options: { className: 'schema-tree-highlight', overviewRuler: { color: '#f5c518', position: 4 } },
    }]);
  }, [highlightPath, pathMap]);

  return (
    <Editor
      defaultLanguage="json"
      value={code}
      onMount={handleMount}
      onChange={(v) => onChange(v ?? '')}
      options={{ automaticLayout: true, minimap: { enabled: false }, tabSize: 2 }}
    />
  );
}
```

树的选中 path 要传给 `highlightPath`；树侧收到 `onCursorPath` 后把该 id 滚动到可见并高亮（`expanded` 同步展开祖先链：`$.a.b.c` 逐级 `.slice` 入 set 即可）。**防环是双向同步的命门**：`setSelection` 会触发 `onDidChangeCursorPosition`，不加闸门就会"点树 → 源码定位 → 光标事件 → 树高亮 → …"循环跳动；闸门用时间戳（150ms）最简单，比 source 判断可靠——monaco 光标事件的 `source` 字段对程序化操作不保证有值。

**常见坑（症状 → 根因 → 修法）**：

- 症状：在源码里改了半个属性名，切回树视图，改动全没了。根因：blur-commit 策略下树是权威，切换时直接用权威 schema 重新 `setValue` 覆盖了源码。修法：切走前先 parse（`switchTo` 里的 try/catch），失败则**拒绝切换并报错**，任何情况下不允许"未解析成功就覆盖源码"。
- 症状：光标在源码里每动一下，整棵树重渲染卡顿。根因：`onDidChangeCursorPosition` 高频触发，每次都 setState 导致树全量重渲染。修法：path 不变就不 setState（在 `onCursorPath` 回调里比较），或对 path 变化做 50ms 节流；树的行组件用 `React.memo`。

### 路线 4：ajv 实时校验闭环

**是什么**。一条完整链路：编辑 schema → 校验 schema 自身合法性 → 编译 → 校验右侧样例数据 → 把错误定位回源码高亮。三秒内反馈，用户对 schema 的每次修改都立刻知道"这改对了没有、样例数据还满足吗"。

**为什么需要**。schema 是给程序消费的契约，写错的代价在下游（表单渲染异常、后端校验拒绝）。闭环把错误拦截在编辑时；同时"样例数据"是 schema 的可执行文档——ajv 报错比读十遍协议都快。这与场景 3 的"试运行面板"是同一信任感来源。

**怎么做（链路四步）**：

1. **schema 自检**：`ajv.validateSchema(schema)` 用 draft-07 元 schema 校验 schema 本身（type 拼错、required 不是字符串数组都在这步抓住）。
2. **编译**：`ajv.compile(schema)`。`$ref` 指向不存在的 definitions 会在这里抛异常——必须 try/catch，这是"schema 自身错误"的第二来源。
3. **样例数据语法层**：`JSON.parse(sampleText)`，语法错不让它进第 4 步。
4. **样例数据语义层**：`validate(sample)`，错误对象带 `instancePath`（指向**数据**的 JSON Pointer，如 `/user/name`）——把它转换成 JSONPath 后查路线 3 的 `PathMap`，得到文本区间，最后 `monaco.editor.setModelMarkers` 打上错误波浪线。

**代码**：

```ts
// src/schema-workbench/validateLoop.ts —— 编辑 schema → 校验样例 → 错误定位 全链路
import Ajv, { type ErrorObject } from 'ajv';
import type { NodeRef } from './pathMap';

const ajv = new Ajv({ allErrors: true, strict: false }); // allErrors：报全部错而不是第一个

export interface LoopResult {
  schemaErrors: { schemaPath: string; message: string }[]; // schema 自身非法
  dataErrors: { instancePath: string; message: string; keyword: string }[]; // 样例不满足 schema
  sampleSyntaxError: string | null;  // 样例 JSON 语法错
}

export function runValidateLoop(schema: unknown, sampleText: string): LoopResult {
  // 第 1 步：schema 自检（元 schema 校验）
  if (!ajv.validateSchema(schema)) {
    return {
      schemaErrors: (ajv.errors ?? []).map((e) => ({ schemaPath: e.schemaPath, message: e.message ?? '' })),
      dataErrors: [], sampleSyntaxError: null,
    };
  }
  // 第 2 步：编译（$ref 笔误在这抛异常）
  let validate: ReturnType<Ajv['compile']>;
  try {
    validate = ajv.compile(schema as object); // #/definitions/... 内部引用由 ajv 自动解析
  } catch (err) {
    return { schemaErrors: [{ schemaPath: '', message: (err as Error).message }], dataErrors: [], sampleSyntaxError: null };
  }
  // 第 3 步：样例语法
  let sample: unknown;
  try {
    sample = JSON.parse(sampleText);
  } catch (err) {
    return { schemaErrors: [], dataErrors: [], sampleSyntaxError: (err as Error).message };
  }
  // 第 4 步：样例语义
  const dataValid = validate(sample);
  const dataErrors = dataValid
    ? []
    : ((validate.errors ?? []) as ErrorObject[]).map((e) => ({
        instancePath: e.instancePath,
        message: e.message ?? '',
        keyword: e.keyword,
      }));
  return { schemaErrors: [], dataErrors, sampleSyntaxError: null };
}

/** instancePath（JSON Pointer）→ JSONPath：'/user/name/0' → '$.user.name[0]' */
export function pointerToJsonPath(pointer: string): string {
  if (!pointer) return '$';
  let p = '$';
  for (const seg of pointer.split('/').slice(1).map(decodeURIComponent)) {
    p = /^\d+$/.test(seg) ? `${p}[${seg}]` : `${p}.${seg}`;
  }
  return p;
}

/** ajv 数据错误 + 样例 PathMap → monaco marker（offset 区间） */
export function dataErrorsToMarkers(
  errors: LoopResult['dataErrors'],
  sampleNodes: NodeRef[],
): { start: number; end: number; message: string }[] {
  return errors.map((err) => {
    const path = pointerToJsonPath(err.instancePath);
    // required 缺字段的 instancePath 是父对象：标在父对象节点上，仍可定位
    const node = sampleNodes.find((n) => n.path === path && !n.isKey) ?? sampleNodes.find((n) => n.path === path);
    const range = node ? { start: node.start, end: node.end } : { start: 0, end: 1 }; // 定位失败退化为根
    return { ...range, message: `[${err.keyword}] ${err.message}${err.instancePath}` };
  });
}
```

把 marker 真正打到样例编辑器上（样例也是一个 monaco 实例，语法错误交给内置 json worker，语义错误由我们接管）：

```ts
// src/schema-workbench/applyMarkers.ts
import type { editor as monacoEditor } from 'monaco-editor';

export function applyAjvMarkers(
  monaco: typeof import('monaco-editor'),
  editor: monacoEditor.IStandaloneCodeEditor,
  items: { start: number; end: number; message: string }[],
) {
  const model = editor.getModel();
  if (!model) return;
  monaco.editor.setModelMarkers(
    model,
    'ajv', // owner 命名空间：与 json worker 的 'json' 分开，互不覆盖
    items.map((m) => {
      const s = model.getPositionAt(m.start);
      const e = model.getPositionAt(Math.max(m.end, m.start + 1)); // 空区间 monaco 不显示，兜底 +1
      return {
        startLineNumber: s.lineNumber,
        startColumn: s.column,
        endLineNumber: e.lineNumber,
        endColumn: e.column,
        message: m.message,
        severity: monaco.MarkerSeverity.Error,
        source: 'ajv',
      };
    }),
  );
}
```

编排层（300ms 防抖把三块屏幕串起来。schema 自身错误同时打到**源码编辑器**——`schemaPath` 如 `#/properties/age/type` 转成 `$.properties.age.type` 后走同一套 `rangeOfPath`；此处编排聚焦数据侧错误的高亮链路）：

```tsx
// src/schema-workbench/Workbench.tsx —— 左树 · 中表单预览 · 右源码 + 底部样例：ajv 闭环编排层
import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import type { JsonSchemaNode } from './schemaTypes';
import { SchemaTree } from './SchemaTree';
import { MetaPanel } from './MetaPanel';
import { CodePane } from './CodePane';
import { buildPathMap } from './pathMap';
import { runValidateLoop, dataErrorsToMarkers } from './validateLoop';
import { applyAjvMarkers } from './applyMarkers';

export function Workbench({ initialSchema }: { initialSchema: JsonSchemaNode }) {
  // 左：树 + 元信息面板
  const [schema, setSchema] = useState(initialSchema);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['$']));
  const [selectedId, setSelectedId] = useState('$');

  // 中：表单预览编辑的是"样例数据"——预览表单与样例 JSON 是同一份数据的两个视图
  const [sampleText, setSampleText] = useState('{}');
  const setSamplePath = (key: string, value: unknown) => {
    try {
      const obj = JSON.parse(sampleText) as Record<string, unknown>;
      obj[key] = value;
      setSampleText(JSON.stringify(obj, null, 2)); // 预览改动回写样例文本，右侧底栏即时可见
    } catch {
      // 样例当前是非法 JSON：忽略本次写入（底栏红线已在提示语法错误）
    }
  };

  // 右上：源码（本例直接展示权威 schema 的序列化结果；
  // 接入路线 3 的 useDualView 后，这里换成策略化的双视图控制器）
  const code = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  // 右下：样例数据编辑器 + ajv marker
  const sampleEditorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const sampleMount: OnMount = (editor, monaco) => {
    sampleEditorRef.current = editor;
    monacoRef.current = monaco;
  };

  // ★ 全链路 300ms 防抖：打字期间不跑 ajv、不重建映射
  const [debounced, setDebounced] = useState({ schema, sampleText });
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced({ schema, sampleText }), 300);
    return () => window.clearTimeout(t);
  }, [schema, sampleText]);
  const report = useMemo(() => runValidateLoop(debounced.schema, debounced.sampleText), [debounced]);
  const sampleMap = useMemo(() => buildPathMap(debounced.sampleText), [debounced.sampleText]);

  useEffect(() => {
    const editor = sampleEditorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !editor.getModel()) return;
    if (report.sampleSyntaxError || !sampleMap) {
      monaco.editor.setModelMarkers(editor.getModel()!, 'ajv', []); // 语法错交给内置 json worker 显示
      return;
    }
    applyAjvMarkers(monaco, editor, dataErrorsToMarkers(report.dataErrors, sampleMap.nodes));
  }, [report, sampleMap]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1.2fr', height: '100vh', fontSize: 14 }}>
      <aside style={{ borderRight: '1px solid #eee', overflow: 'auto' }}>
        <SchemaTree
          schema={schema}
          expanded={expanded}
          selectedId={selectedId}
          onSchemaChange={setSchema}
          onExpandedChange={setExpanded}
          onSelect={setSelectedId}
        />
        {selectedId !== '$' && (
          <MetaPanel schema={schema} selectedId={selectedId} onSchemaChange={setSchema} />
        )}
      </aside>
      <main style={{ borderRight: '1px solid #eee', overflow: 'auto', padding: 12 }}>
        <SchemaPreview schema={schema} sampleText={sampleText} onSamplePath={setSamplePath} />
      </main>
      <section style={{ display: 'grid', gridTemplateRows: '1fr 1fr' }}>
        <div style={{ borderBottom: '1px solid #eee', minHeight: 0 }}>
          <CodePane
            code={code}
            onChange={() => undefined}     // 只读镜像：策略 A/B 接入后换成 useDualView 的回调
            onBlur={() => undefined}
            highlightPath={selectedId}
            onCursorPath={(p) => p && setSelectedId(p)}
          />
        </div>
        <div style={{ minHeight: 0 }}>
          {report.sampleSyntaxError && (
            <div style={{ color: '#ff4d4f', fontSize: 12, padding: '2px 8px' }}>样例语法错误：{report.sampleSyntaxError}</div>
          )}
          {report.schemaErrors.length > 0 && (
            <div style={{ color: '#fa8c16', fontSize: 12, padding: '2px 8px' }}>
              schema 自身错误：{report.schemaErrors[0]?.message}
            </div>
          )}
          <Editor
            defaultLanguage="json"
            value={sampleText}
            onMount={sampleMount}
            onChange={(v) => setSampleText(v ?? '')}
            options={{ automaticLayout: true, minimap: { enabled: false }, tabSize: 2 }}
          />
        </div>
      </section>
    </div>
  );
}

/** 中列预览：§2 动态表单的最小子集——只处理顶层标量字段，演示"schema 驱动表单"这层套娃 */
function SchemaPreview({
  schema, sampleText, onSamplePath,
}: {
  schema: JsonSchemaNode;
  sampleText: string;
  onSamplePath: (key: string, value: unknown) => void;
}) {
  let value: Record<string, unknown> = {};
  try { value = JSON.parse(sampleText) as Record<string, unknown>; } catch { value = {}; }
  const entries = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  if (!entries.length) return <div style={{ color: '#999' }}>左侧先添加字段</div>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {entries.map(([key, node]) => {
        const label = (
          <span style={{ fontSize: 12, color: '#555' }}>
            {node.title ?? key}
            {required.has(key) && <span style={{ color: '#ff4d4f' }}> *</span>}
          </span>
        );
        const v = value[key];
        if (node.enum?.length) {
          return (
            <label key={key} style={{ display: 'grid', gap: 4 }}>
              {label}
              <select value={String(v ?? '')} onChange={(e) => onSamplePath(key, node.type === 'number' ? Number(e.target.value) : e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                <option value="">（未选择）</option>
                {node.enum.map((opt) => <option key={String(opt)} value={String(opt)}>{String(opt)}</option>)}
              </select>
            </label>
          );
        }
        if (node.type === 'boolean') {
          return (
            <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={v === true} onChange={(e) => onSamplePath(key, e.target.checked)} />
              {label}
            </label>
          );
        }
        if (node.type === 'number' || node.type === 'integer') {
          return (
            <label key={key} style={{ display: 'grid', gap: 4 }}>
              {label}
              <input type="number" value={typeof v === 'number' ? v : ''} onChange={(e) => onSamplePath(key, e.target.value === '' ? undefined : Number(e.target.value))}
                style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
            </label>
          );
        }
        return (
          <label key={key} style={{ display: 'grid', gap: 4 }}>
            {label}
            <input value={typeof v === 'string' ? v : ''} onChange={(e) => onSamplePath(key, e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
          </label>
        );
      })}
    </div>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——错误信息随光标移动不断闪烁、或 json worker 的语法错误和 ajv 的语义错误互相覆盖。根因：`setModelMarkers` 的 `owner` 是覆盖单位，不同来源共用一个 owner 就互相清掉；而每次 keystroke 都同步跑 ajv 也会和 worker 的异步校验赛跑。修法：owner 分命名空间（`'json'` / `'ajv'`），ajv 链路整体防抖 300ms；`compile` 抛出的异常必须捕获——它不是"校验失败"而是"无法校验"，混为一谈会让面板报错丢层级。

### 路线 5：`$ref` / `definitions` —— 折叠展示与跳转链接

**是什么**。真实 schema 一定有复用：`address` 在五处出现，就该在 `definitions`（draft-07）/`$defs`（2019-09+）定义一次、五处 `$ref: '#/definitions/Address'` 引用。编辑器要做两件事：树上把 `$ref` 节点渲染成**折叠芯片**（不递归展开引用体，否则循环引用直接栈溢出）；提供**跳转**（点击芯片 → 源码滚到定义处并高亮；源码里 Ctrl/Cmd+点击引用字符串 → 同样跳转）。

**为什么需要**。`$ref` 是 schema 的函数调用——不折叠则树指数级膨胀（自引用类型如树形结构直接无限展开）；不跳转则用户永远在"这个 `#/definitions/Address` 里到底定义了啥"的滚动地狱里。ajv 编译时自动解析内部 `$ref`（上一步已享受），编辑器 UI 只欠"人能看懂"这一层。

**怎么做**：

1. **树侧折叠**：递归渲染遇到 `node.$ref` 时渲染芯片行（显示 `→ Address`），其下**不再下钻 children**。想看引用体？点击芯片跳到 definitions；想在原地展开（deref 视图）属于进阶功能，实现是"渲染时把引用体按 path 内联为只读子树"，注意与编辑的边界（在 deref 视图上的编辑应写回 definitions 还是就地解除引用，需要产品决策——Stoplight 的做法是原地展开只读）。
2. **跳转（共用路线 3 的 reveal 基建）**：解析 `$ref` 得到目标 path——`#/definitions/Address` → `$.definitions.Address`（正则一位转换），然后走 `rangeOfPath` + `revealRangeInCenter`。
3. **源码侧 Ctrl/Cmd+点击**：monaco `onMouseDown` 里读按键修饰符与行内容，命中 `#/definitions/xxx` 字面量即跳转。

**代码**（芯片行 + Ctrl/Cmd 点击）：

```tsx
// src/schema-workbench/RefChip.tsx —— 树上的引用芯片
import type { NodeRef } from './pathMap';

export function refName(ref: string): string {
  // '#/definitions/Address' → 'Address'（兼容 '#/$defs/Address'）
  const m = /^#\/(?:definitions|\$defs)\/([A-Za-z0-9_-]+)$/.exec(ref);
  return m ? m[1]! : ref;
}

export function refToPath(ref: string): string {
  return `$.${ref.slice(2).replace('/', '.')}`; // #/definitions/Address → $.definitions.Address
}

export function RefChip({ ref, onJump }: { ref: string; onJump: (path: string) => void }) {
  return (
    <button
      onClick={() => onJump(refToPath(ref))} // 跳到 definitions 并展开/高亮
      style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, border: '1px dashed #722ed1', color: '#722ed1', background: '#f9f0ff', cursor: 'pointer' }}
      title={`跳转到定义 ${ref}`}
    >
      → {refName(ref)} ↗
    </button>
  );
}
```

```ts
// 源码侧：Ctrl/Cmd + 点击 $ref 字面量跳转（接在 CodePane 的 handleMount 里）
function bindRefJump(
  editor: monacoEditor.IStandaloneCodeEditor,
  reveal: (ref: string) => void,
) {
  editor.onMouseDown((e) => {
    const pos = e.target.position;
    if (!pos || !(e.event.ctrlKey || e.event.metaKey)) return; // 仅 Ctrl/Cmd+左键
    const model = editor.getModel();
    if (!model) return;
    const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
    const m = /(#\/(?:definitions|\$defs)\/[A-Za-z0-9_-]+)"?$/.exec(before); // 光标左侧紧邻的 ref 字面量
    if (m) reveal(m[1]!);
  });
}
```

跳转落地（复用路线 3 的 `highlightPath` 通道，同时展开树的 `$.definitions` 祖先链）。另外给 `$ref` 值加 decoration（下划虚线 class）提示可点击，体验对齐 IDE 的"转到定义"。

**常见坑（症状 → 根因 → 修法）**：症状——点击芯片后源码跳到了 definitions，但树上一片白，用户不知道自己到了哪。根因：只同步了源码视图，没同步树（definitions 默认折叠 + 选中态没变）。修法：跳转是**三视图广播**（树展开+选中、源码 reveal、元信息面板切到目标节点），单向同步是这类"导航型交互"最常见的半成品。

### 难点与坑（本章汇总）

1. **required 与 properties 影子同步**（路线 1 已展开）：删字段/改键名/移动字段都要同步维护父级 `required`。症状：预览表单出现幽灵必填项；根因：协议把"必填"存在父对象而 UI 把它画在子行上；修法：收口到 `deleteProperty` / `moveProperty` / 重命名三处统一处理，禁止组件直接改 `properties` 键。
2. **双视图互相覆盖丢改动**（路线 3 已展开）：症状：源码半成品被树状态覆盖；根因：没有"权威"概念，两视图都在写；修法：blur-commit / dirty-guard 任选其一，底线是**parse 不成功绝不覆盖**。
3. **元字段类型漂移**（路线 2 已展开）：症状：type 切换后 enum/default 残留脏值；根因：Setter 各自独立，无人负责相容性；修法：type 变更统一走带清洗的 `patch`。
4. **性能：每次键入全链路重跑**。症状：源码打字卡顿。根因：`buildPathMap` + `runValidateLoop` + 树全量重渲染都挂在每次 onChange 上。修法：三层防抖（映射 300ms、ajv 300ms、树的 `frozenCode` 快照兜底）；树行 `React.memo`；`pathAtOffset` 对大 nodes 数组可换二分（已有序）。

### ✅ 产出：验收清单

一个"Schema 工作台"：左树 · 中表单预览 · 右源码。逐条验收：

- [ ] 树：增删字段、改键名（重名被拒）、object/array 递归展开、同级拖拽排序、跨级拖入 object（含落区三态视觉：上边线/下边线/外框）
- [ ] 拖拽安全：不可拖入自身子树；跨级移动后 required 正确迁移；键冲突自动改名
- [ ] 元信息面板：六个 Setter 齐备；required 开关写父级；type 切换弹确认且清洗不兼容元字段；default 不在 enum 内有行内警示
- [ ] 双视图：树改 → 源码即时变（或按策略防抖变）；源码改 → 树按策略同步；源码非法时**拒绝**切回树并显示错误行
- [ ] 光标互跳：源码光标移动，树高亮对应节点并自动展开祖先；点树节点，源码 `revealRangeInCenter` 居中 + 装饰高亮；无循环跳动
- [ ] 校验闭环：改 schema 后 300ms 内，样例编辑器出现 ajv 语义错误（owner='ajv'）且定位到具体值；schema 自身错误（含 $ref 笔误）单独提示在源码侧
- [ ] $ref：树上芯片展示、点击三视图同步跳转；源码 Ctrl/Cmd+点击引用可跳转；自引用类型不导致树栈溢出
- [ ] 导出：工作台产出的 schema JSON 可直接被后端 `ajv.compile` 消费（手写的 minLength 等未 UI 化字段不丢失）

### 对标：jsonschema.net、Stoplight Studio

- **jsonschema.net**：在线 JSON Schema 编辑器，"左树/表单 + 右源码"布局的鼻祖级参照。重点体验它的双视图切换手感和 $ref 支持，注意它的"从 JSON 实例推断 schema"功能——这是本章没展开的方向（推断算法本质是：遍历实例值类型 → 归并出最小相容 schema，值得作为扩展练习）。
- **Stoplight Studio**（开源）：桌面级 API 设计工具，编辑 OpenAPI/JSON Schema。精读价值有三：① 表单/代码双模式的脏状态保护策略（切到代码模式后表单锁定，正是路线 3 策略 B 的工程级实现）；② 元信息面板按 type 条件渲染的密度控制；③ `$ref` 体系（内部/外部引用、引用自动补全）的完整产品化处理。源码在 GitHub `stoplightio/studio`，MIT，可跑起来打断点研究其双向同步的实现差异（它用 mobx-state-tree 做权威状态，值得对比本章的 reducer 方案）。

## 5. 无限画布 / 白板工具

**基础**：全景图 A3。增量（自研实现顺序）：

先给"无限"祛魅：画布无限的本质不是画布大，而是**渲染成本与可见元素数成正比、与画布总面积无关**。一个 10 万个形状、面积相当于几个足球场的白板，只要视口里只有 40 个形状，每帧就只画 40 个。支撑这一点的是三件事：视口模型（world/screen 两套坐标）、视口裁剪（空间索引）、分层重绘（静态/交互分离）。本章按自研顺序把这三件事和它们身上的全部交互讲透。

### 实现路线

1. **视口模型**：`{ x, y, zoom }`；wheel 缩放以鼠标为锚点（坐标换算公式是第一课）；空格/中键平移
2. **双坐标系**：元素一律存 world 坐标，渲染时 world↔screen 互转
3. **视口裁剪渲染**：只渲染可视区内元素（四叉树 / R-tree 空间索引）——"无限"画布的性能本质
4. 交互全家桶：选中、handle 缩放旋转、多选框选（几何求交）、对齐吸附线
5. 手绘笔迹：pointermove 采样 → 道格拉斯-普克简化 → 贝塞尔平滑；`pointerEvent.pressure` 压感
6. 命令栈 undo/redo、快捷键、右键菜单、小地图
7. **性能分层**：静态层（离屏 canvas 缓存）+ 交互层，rAF 合并重绘
8. 导出 PNG/SVG；协同接 Yjs（他人光标/视口同步）

### 路线 1：视口模型 `{ x, y, zoom }` —— 鼠标锚点缩放的完整推导

**是什么**。视口（camera）是三个数字：`x`、`y`（平移量）与 `zoom`（缩放系数）。它定义了 world 坐标系（元素的家，原点任意、范围无限）到 screen 坐标系（浏览器给你的 CSS 像素）的仿射映射。

**为什么需要**。白板的一切交互——平移、缩放、框选、吸附、命中、小地图——最终都归结为这两个坐标系之间的换算。公式不清楚，后面每个功能都会以"缩放后偏移"的鬼现象回报你。

**怎么做（约定与公式）**。约定 `camera.x / camera.y` 是"world 原点在屏幕上的位置"（屏幕像素单位），`zoom` 是缩放系数。则任意点：

```text
world → screen（正向）：  screen.x = world.x * zoom + camera.x
                          screen.y = world.y * zoom + camera.y
screen → world（逆向）：  world.x  = (screen.x - camera.x) / zoom
                          world.y  = (screen.y - camera.y) / zoom
```

**为什么 screenToWorld 必须先减 offset 再除 zoom**：从正向公式看，world 变成 screen 经历了两步——先乘 `zoom`（线性缩放），再加 `camera`（平移）。求逆就是**逆序执行逆运算**：先撤销加法（减 `camera.x`），再撤销乘法（除 `zoom`）。代数上：

```text
s = w * z + c
(s - c) = w * z        ← 第一步：先做加法的逆
(s - c) / z = w        ← 第二步：再做乘法的逆
```

两步不可交换：`(s - c) / z ≠ s / z - c`。减法和除法交换顺序后结果差了 `c - c/z`——只要 `c ≠ 0` 且 `z ≠ 1`，误差就存在，且随 `c`、`z` 增大而放大。

**锚点缩放的推导**（本路线的核心）：滚轮缩放的用户期望是"**鼠标指的地方不动，画布围绕它放大缩小**"。把它写成不变式——**缩放前后，鼠标屏幕位置 `m` 所对应的 world 点 `w` 相同**：

```text
已知：缩放前 zoom = z0，camera = c0；缩放后 zoom = z1，camera = c1（待求）；鼠标屏幕位置 m 不变。

缩放前，鼠标下的世界点：   w  = (m - c0) / z0                 …… ①
缩放后，同一点仍在鼠标下： m  = w * z1 + c1                   …… ②

把 ① 代入 ②：
m = (m - c0) / z0 * z1 + c1
c1 = m - (m - c0) * (z1 / z0)                                  …… 结论
```

读法：**新平移 = 鼠标位置 − 鼠标下的世界点 × 新缩放**。直觉校验：z1 = z0 时 c1 = m − (m − c0) = c0，不动，正确。

**核心代码（15 行）**：

```ts
// src/whiteboard/camera.ts
export interface Camera { x: number; y: number; zoom: number; }
export interface Pt { x: number; y: number; }

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function screenToWorld(p: Pt, cam: Camera): Pt {
  return { x: (p.x - cam.x) / cam.zoom, y: (p.y - cam.y) / cam.zoom }; // 先减平移，再除缩放
}

export function worldToScreen(p: Pt, cam: Camera): Pt {
  return { x: p.x * cam.zoom + cam.x, y: p.y * cam.zoom + cam.y };     // 先乘缩放，再加平移
}

/** 以屏幕点 anchor（通常是鼠标）为锚点缩放 factor 倍 */
export function zoomAt(anchor: Pt, factor: number, cam: Camera): Camera {
  const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const real = zoom / cam.zoom;               // clamp 命中后实际缩放比 ≠ factor，必须用 real
  return {
    zoom,
    x: anchor.x - (anchor.x - cam.x) * real,  // c1 = m - (m - c0) * (z1/z0)
    y: anchor.y - (anchor.y - cam.y) * real,
  };
}
```

**常见错误（症状 → 根因 → 修法）**。症状：缩放时内容"越缩越跑"——鼠标指着的一个字，每滚一格滚轮它就朝某个方向滑一点，几档之后滑出视口。根因：交换了减/除顺序（写成 `world = screen / zoom - camera`，或等价地在 zoomAt 里用 `c1 = m - m * real + c0 * (real - 1)` 之类推错的代数）。后果用数字算一遍就明白：设 `c0 = {x:100, y:50, zoom:1}`，鼠标 `m = (300, 200)`：

```text
正确：w = (300-100)/1 = 200；c1 = 300 - 200*2 = -100 → screenToWorld(300, c1) = (300+100)/2 = 200 ✓ 锚点纹丝不动
错误：w' = 300/2 - 100 = 50（先把 300 除以新 zoom 再减旧平移）
      c1' = 300 - 50*2 = 200 → screenToWorld(300, c1') = (300-200)/2 = 50 ≠ 200
      一次缩放锚点漂移 150 个世界单位，且每档都漂——"越缩越跑"
```

修法与验证：① 单元测试锚点不变式（这是白板工程里性价比最高的一个测试）：

```ts
// camera.test.ts —— 锚点不变式：缩放前后鼠标下的世界点必须相同
const cam0: Camera = { x: 100, y: 50, zoom: 1 };
const mouse: Pt = { x: 300, y: 200 };
const before = screenToWorld(mouse, cam0);
const cam1 = zoomAt(mouse, 2, cam0);
const after = screenToWorld(mouse, cam1);
console.assert(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9, '锚点漂移！');
```

② 手工验证：在画布上放一个唯一标记（写个"★"），把鼠标压在它上面连续滚轮缩放 5 档，★ 应始终在光标下不滑移。

**为什么不用"缩放中心点"参数（如 scale(s, cx, cy)）**：canvas 的 `ctx.scale` 没有中心参数，CSS transform 有 `transform-origin` 但和 translate 组合极易配错。统一收口到 camera 三元组后，DOM 渲染与 canvas 渲染共用一套数学（见路线 2），心智只有一份。

### 路线 2：双坐标系与平移交互

**是什么**。所有元素（矩形、文本、笔迹）一律存 world 坐标；渲染时套 camera 变换；指针事件进来先转 world 再参与业务。平移三种入口：空格+左键拖拽、中键拖拽、触控板双指滚动（wheel）。

**为什么需要**。如果元素存 screen 坐标，每次平移缩放都要改写全部元素数据——数据与视图耦合，undo/协同全部没法做。存 world 坐标则 camera 是纯视图状态，拖动视口一个数据都不用动。

**怎么做（机制分步）**：

1. DOM 渲染路径：内容层一个 `div`，`transform: translate(cam.x, cam.y) scale(cam.zoom)`、`transformOrigin: '0 0'`。CSS 变换从右往左作用：先 scale（把 world 放大）再 translate（平移到屏幕位），与 `worldToScreen` 公式严格一致。
2. canvas 渲染路径：`ctx.setTransform(zoom, 0, 0, zoom, cam.x, cam.y)`（dpr 的处理见坑 1，这里省略）。
3. 指针事件：`getBoundingClientRect` 拿 canvas 原点，`screen = { clientX - rect.left, clientY - rect.top }`，再 `screenToWorld`。
4. 空格平移：全局 keydown 记录空格按下（排除输入框焦点），光标变 `grab`，pointerdown 进入平移；中键：`e.button === 1` 且 `preventDefault()`（否则浏览器进入自动滚动模式——一个小放大镜图标接管页面，白板直接"失控"）。
5. wheel 平移：触控板双指滑动派发 wheel（无 ctrlKey），把它映射为 camera 平移：**内容跟手**意味着 camera 反向移动——`camera.x -= deltaX`。

**代码**（平移交互，与缩放共用一个 wheel 分发器）：

```tsx
// src/whiteboard/PanZoom.tsx —— 空格/中键平移 + wheel 缩放/平移 的交互层
import { useEffect, useRef, useState } from 'react';
import type { Camera, Pt } from './camera';
import { zoomAt } from './camera';

export function usePanZoom(
  stageRef: React.RefObject<HTMLDivElement | null>,
  camera: Camera,
  setCamera: (next: Camera) => void,
) {
  const [spaceDown, setSpaceDown] = useState(false);
  const panState = useRef<{ startCam: Camera; startScreen: Pt } | null>(null);
  const camRef = useRef(camera);
  camRef.current = camera;       // wheel 闭包里要用最新 camera，避免 React 批处理读到旧值
  const spaceDownRef = useRef(false);
  spaceDownRef.current = spaceDown; // pointerdown 闭包里要读最新空格状态

  // 空格键：进入/退出平移模式（输入框里按空格不算）
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) { e.preventDefault(); setSpaceDown(true); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    // ★ passive: false —— wheel 监听默认 passive，preventDefault 无效（坑 3 详述）
    el.addEventListener('wheel', onWheel, { passive: false });
    function onWheel(e: WheelEvent) {
      e.preventDefault(); // 无论如何都不许页面滚动/浏览器整页缩放
      const cam = camRef.current;
      const rect = el.getBoundingClientRect();
      const mouse: Pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (e.ctrlKey || e.metaKey) {
        // 触控板双指捏合（ctrlKey=true）或 Ctrl+滚轮：以鼠标为锚点缩放
        // exp 曲线：滚轮 delta 是"格"，指数映射让手感均匀（每格恒定放大 1.1 倍左右）
        const factor = Math.exp(-e.deltaY * 0.01);
        setCamera(zoomAt(mouse, factor, cam));
      } else {
        // 普通滚轮/触控板双指滑动：平移（内容跟手 = camera 反向）
        // deltaMode 0=像素 1=行 2=页；Firefox 常给"行"，×16 折算成像素量级
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
        setCamera({ ...cam, x: cam.x - e.deltaX * k, y: cam.y - e.deltaY * k });
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const wantPan = (e.button === 1) || (e.button === 0 && spaceDownRef.current);
      if (!wantPan) return;
      e.preventDefault(); // 中键：阻止浏览器"自动滚动"接管
      const rect = el.getBoundingClientRect();
      panState.current = {
        startCam: camRef.current,
        startScreen: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      };
      el.setPointerCapture(e.pointerId); // 指针移出元素也能持续收到 move/up
    };
    const onPointerMove = (e: PointerEvent) => {
      const st = panState.current;
      if (!st) return;
      const rect = el.getBoundingClientRect();
      setCamera({
        ...st.startCam,
        x: st.startCam.x + (e.clientX - rect.left - st.startScreen.x),
        y: st.startCam.y + (e.clientY - rect.top - st.startScreen.y),
      });
    };
    const onPointerUp = () => { panState.current = null; };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [stageRef, setCamera]);

  return { cursor: spaceDown ? 'grab' : 'default' };
}
```

**常见坑（症状 → 根因 → 修法）**：症状——中键拖拽时页面突然出现一个圆形罗盘图标，随鼠标移动整页滚动，白板事件全部失灵。根因：浏览器对中键 mousedown 有默认行为"autoscroll"，你的 `preventDefault` 放在了 pointerdown 之后的某个条件分支里或根本没调。修法：中键 pointerdown **无条件** `preventDefault()`（上面的 `onPointerDown` 在确认是中键后立即调用）；同理 `contextmenu` 事件要在画布上 `preventDefault`（右键留给自定义菜单，见路线 6）。

### 路线 3：视口裁剪渲染 —— 四叉树 / R-tree 空间索引

**是什么**。每帧渲染前，先算出当前视口的 world 矩形，只把与其相交的元素交给渲染器。为了不退化成"每帧遍历全部元素做矩形相交"，需要一个按空间组织的数据结构：四叉树或 R-tree。

**为什么需要**。10 万元素 × 每帧 O(n) 过滤 = 每帧 10 万次比较，60fps 下每秒 600 万次——手机直接躺平。空间索引把查询降到 O(log n + 命中数)：不是"每个元素问一遍在不在视口里"，而是"从上往下整块排除不在视口里的区域"。

**怎么做（原理）**。两种结构一张图看懂：

```text
四叉树：递归把平面一分为四（NW/NE/SW/SE），元素挂进所在象限，超容量（如 8 个）就再分
        ┌──────┬──────┐
        │  NW  │  NE  │   查询视口矩形：与视口不相交的象限整枝剪掉，
        ├──────┼──────┤   只递归相交象限。深度 ~log(范围/精度)。
        │  SW  │  SE  │   适合：元素小且分布均匀（海量点）
        └──────┴──────┘

R-tree：叶子存元素外接矩形，父节点存"罩住所有孩子的最小矩形"（MBR），B 树式自平衡
              [根 MBR]
            ┌────┴─────┐
        [MBR-1]      [MBR-2]    查询：MBR 与视口不相交 → 整棵子树剪掉；
         ├── A(矩形)   ├── C    插入：选"MBR 面积增量最小"的分支下沉；
         └── B        └── D     节点满了（如 9 项）分裂成两个。
```

**怎么选**：四叉树切的是**空间**（网格固定），R-tree 切的是**数据聚集**（MBR 随数据分布自适应）。白板元素大小悬殊（一个巨型流程图容器 vs 一个小图标）、分布极不均匀（用户画到哪算哪），且元素会被频繁增删改——R-tree 的动态聚簇更贴合。实现选 **rbush**：浏览器/Node 通用的 R-tree 高性能实现，API 极小（`load/insert/remove/search/all`）。

**代码**（rbush 用法 + 裁剪接入渲染循环）：

```ts
// src/whiteboard/spatialIndex.ts
import RBush from 'rbush';

export interface BBox { minX: number; minY: number; maxX: number; maxY: number; }
export interface Shape { id: string; x: number; y: number; w: number; h: number; rotation: number; kind: 'rect' | 'ellipse' | 'stroke'; }

/** 任意形状（含旋转）的外接矩形：旋转形状取四个角点的包围盒 */
export function shapeBBox(s: Shape): BBox & { id: string } {
  const rad = s.rotation;
  if (rad === 0) return { id: s.id, minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h };
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const hw = (s.w * cos + s.h * sin) / 2; // 旋转矩形的外接半宽
  const hh = (s.w * sin + s.h * cos) / 2; // 外接半高
  return { id: s.id, minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
}

/** 笔迹的外接矩形：简化后点集的极值（外扩半个线宽，粗笔画边缘才能被裁剪命中） */
export function strokeBBox(s: { id: string; points: { x: number; y: number }[]; baseWidth: number }): BBox & { id: string } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of s.points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const pad = s.baseWidth / 2;
  return { id: s.id, minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export class SpatialIndex {
  // rbush 泛型项必须带 minX/minY/maxX/maxY 四字段，多余字段原样保留
  private bush = new RBush<BBox & { id: string }>();
  private byId = new Map<string, BBox & { id: string }>();

  bulkLoad(shapes: Shape[]) {
    this.bush.clear();
    this.byId.clear();
    const items = shapes.map(shapeBBox);
    this.bush.load(items);           // load：批量建树，比逐个 insert 快一个量级
    for (const it of items) this.byId.set(it.id, it);
  }

  insert(s: Shape) {
    const item = shapeBBox(s);
    this.bush.insert(item);
    this.byId.set(s.id, item);
  }

  update(s: Shape) {
    const old = this.byId.get(s.id);
    if (old) this.bush.remove(old);  // rbush 按引用删除：必须先删旧项再插新项
    this.insert(s);                  // （拿着旧 bbox 的引用原地改字段会破坏树的不变量）
  }

  remove(id: string) {
    const old = this.byId.get(id);
    if (old) { this.bush.remove(old); this.byId.delete(id); }
  }

  /** 视口裁剪：只返回与 world 视口矩形相交的元素 id */
  queryVisible(viewportWorld: BBox): string[] {
    return this.bush.search(viewportWorld).map((it) => it.id);
  }

  /** 内容包围盒（小地图/导出用）：all() 拿全量再扫一遍极值 */
  contentBBox(): BBox {
    const all = this.bush.all();
    if (!all.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    return all.reduce((acc, it) => ({
      minX: Math.min(acc.minX, it.minX), minY: Math.min(acc.minY, it.minY),
      maxX: Math.max(acc.maxX, it.maxX), maxY: Math.max(acc.maxY, it.maxY),
    }));
  }
}
```

渲染循环接入（每帧的固定三步）：

```ts
// src/whiteboard/cull.ts —— 每帧渲染前的固定三步
import type { Camera } from './camera';
import { screenToWorld } from './camera';
import type { SpatialIndex } from './spatialIndex';

export function viewportWorldBBox(cam: Camera, width: number, height: number) {
  // 视口四角（screen）→ world，取包围盒
  const tl = screenToWorld({ x: 0, y: 0 }, cam);
  const br = screenToWorld({ x: width, y: height }, cam);
  return { minX: tl.x, minY: tl.y, maxX: br.x, maxY: br.y };
}

export function visibleShapes(index: SpatialIndex, cam: Camera, w: number, h: number): string[] {
  // 1) 算视口的 world 矩形 → 2) 空间索引查询 → 3) 只把命中 id 交给绘制器
  return index.queryVisible(viewportWorldBBox(cam, w, h));
}
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：拖动一个元素后偶发"元素消失/命中错乱"，直到整体刷新才恢复。根因：元素移动后直接改了缓存在树里的 bbox 对象字段（rbush 存的就是你的对象引用），父节点 MBR 不再罩住它，查询漏检。修法：移动必须走 `remove(旧) → 改数据 → insert(新)`（上面的 `update` 就是这个语义），拖拽过程中每帧 update 的成本完全可接受（rbush 单次操作微秒级）。
- 症状：视口裁剪后，"跨视口的巨大元素"（比如一条贯穿全图的长箭头）平移时突然消失。根因：裁剪用的是元素 bbox 与视口求交，逻辑没错——但如果索引里塞的是"元素局部 bbox"（未含旋转/线宽外扩），旋转后的真实覆盖超出索引矩形，视口交不到。修法：`shapeBBox` 必须算**旋转后的外接矩形**（见代码），笔迹类元素可额外外扩半个线宽。

### 路线 4：交互全家桶 —— 选中、handle 缩放旋转、框选、对齐吸附线

**是什么**。白板的"编辑四件套"：单击/Shift 单击选中；选中后围出一圈 handle（四角+四边=缩放，顶部悬出一个=旋转）；空白处拖拽出橡皮筋矩形多选（框选）；拖动/缩放时与其它元素边缘对齐并显示吸附线。

**为什么需要**。这是白板从"能画"到"能用"的分水岭。四件套共享同一个几何底座：**world 坐标下的矩形与点变换**——所以放在一起实现，先写几何函数再挂交互。

**怎么做（机制分步）**：

1. 命中测试：指针 → world 点 → 按 z 序从上往下问每个元素"点在你身上吗"。矩形（含旋转）的判定不是拿 bbox 凑合（旋转后 bbox 会虚胖），而是**把点变换到元素局部坐标系再比 w/h**。
2. 缩放 handle：8 个 handle 的语义是"对角（或对边）固定、拖拽点决定新尺寸"。旋转元素直接在世界系算会算错（拖拽方向和边长不共线），必须进局部系：`世界点 → 平移到中心 → 反旋转 → 得局部点`，用局部点重算 w/h/x/y，旋转角保持不变。
3. 旋转 handle：角度 = 当前指针方位角 − 起始方位角 + 起始旋转角；Shift 吸附 15° 步进。
4. 框选：拖拽矩形与元素 bbox 求交（注意拖拽矩形可能反向，先规范化 min/max）。
5. 吸附：移动中把选集 bbox 的 6 条参考线（left/centerX/right、top/centerY/bottom）与其它元素的同名线比对，距离小于阈值（**屏幕 6px 换算成 world：`6 / zoom`**）就吸附，并画辅助线。

**代码**（几何底座 + 缩放 + 旋转 + 求交 + 吸附）：

```ts
// src/whiteboard/geometry.ts —— 交互全家桶共用的几何底座
export interface Pt { x: number; y: number; }

/** world 点 → 元素局部坐标（原点在元素左上角、未旋转系）：先平移到中心，再反旋转 */
export function worldToLocal(p: Pt, s: { x: number; y: number; w: number; h: number; rotation: number }): Pt {
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const cos = Math.cos(-s.rotation), sin = Math.sin(-s.rotation);
  const dx = p.x - cx, dy = p.y - cy;
  return { x: dx * cos - dy * sin + s.w / 2, y: dx * sin + dy * cos + s.h / 2 };
}

/** 局部点 → world（渲染 handle、把局部结果还原时用） */
export function localToWorld(p: Pt, s: { x: number; y: number; w: number; h: number; rotation: number }): Pt {
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
  const dx = p.x - s.w / 2, dy = p.y - s.h / 2;
  return { x: dx * cos - dy * sin + cx, y: dx * sin + dy * cos + cy };
}

/** 命中：点是否在（可能旋转的）矩形内 —— 进局部系再比 w/h，不用（虚胖的）外接矩形凑合 */
export function hitRect(p: Pt, s: { x: number; y: number; w: number; h: number; rotation: number }, tolerance = 0): boolean {
  const l = worldToLocal(p, s);
  return l.x >= -tolerance && l.x <= s.w + tolerance && l.y >= -tolerance && l.y <= s.h + tolerance;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** 8 向缩放：锚点=被拖 handle 的对角（角柄）或对边中点（边柄）。旋转不变量：先转局部系改尺寸，再回世界系。 */
export function resizeRect(
  s: { x: number; y: number; w: number; h: number; rotation: number },
  handle: HandleId,
  worldPointer: Pt,
  opts: { minW: number; minH: number; keepRatio: boolean },
): { x: number; y: number; w: number; h: number } {
  // 1) 指针进局部系（局部系的 x/y 就是元素自己的宽/高方向，旋转干扰被消除）
  const local = worldToLocal(worldPointer, s);
  // 2) 锚点的局部坐标：拖 se → 锚 nw=(0,0)；拖 e（右边缘）→ 锚左边缘中点 (0, h/2)；n/s 类推
  const anchorX = handle.includes('w') ? s.w : handle.includes('e') ? 0 : s.w / 2;
  const anchorY = handle.includes('n') ? s.h : handle.includes('s') ? 0 : s.h / 2;
  // 3) 局部系里按指针重算尺寸：e/w 只改宽、n/s 只改高、角柄都改；拖过锚点取绝对值（允许翻转语义）
  let w = handle === 'n' || handle === 's' ? s.w : Math.max(Math.abs(local.x - anchorX), opts.minW);
  let h = handle === 'e' || handle === 'w' ? s.h : Math.max(Math.abs(local.y - anchorY), opts.minH);
  // 4) Shift 等比（仅角柄有意义）
  if (opts.keepRatio && handle.length === 2) {
    const ratio = s.w / s.h;
    if (w / h > ratio) w = h * ratio; else h = w / ratio;
  }
  // 5) 锚点在世界系的位置固定不动：先把锚点从局部系换到世界系
  const anchorWorld = localToWorld({ x: anchorX, y: anchorY }, s);
  // 6) 新中心 = 锚点 + "元素轴系下的 (±w/2, ±h/2)"再按 rotation 旋转到世界（边柄未动的那轴偏移为 0）
  const signX = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
  const signY = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
  const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
  const relX = (signX * w) / 2, relY = (signY * h) / 2;
  const center = { x: anchorWorld.x + relX * cos - relY * sin, y: anchorWorld.y + relX * sin + relY * cos };
  // 7) 存储约定：x/y 是"未旋转时的左上角"，中心减半宽半高反算（渲染时绕中心转 rotation）
  return { x: center.x - w / 2, y: center.y - h / 2, w, h };
}

/** 旋转：指针方位角差值叠加到起始旋转；Shift 吸附 15° */
export function rotateRect(
  s: { x: number; y: number; w: number; h: number; rotation: number },
  startPointer: Pt, startRotation: number, pointer: Pt, snap: boolean,
): number {
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const a0 = Math.atan2(startPointer.y - cy, startPointer.x - cx);
  const a1 = Math.atan2(pointer.y - cy, pointer.x - cx);
  let next = startRotation + (a1 - a0);
  if (snap) {
    const step = Math.PI / 12; // 15°
    next = Math.round(next / step) * step;
  }
  return next;
}

/** 矩形求交（框选核心）：a/b 均为规范化 bbox */
export function rectsIntersect(a: { minX: number; minY: number; maxX: number; maxY: number },
                                b: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/** 把拖拽出的可能反向的矩形规范化成 bbox */
export function normalizeRect(p1: Pt, p2: Pt) {
  return { minX: Math.min(p1.x, p2.x), minY: Math.min(p1.y, p2.y), maxX: Math.max(p1.x, p2.x), maxY: Math.max(p1.y, p2.y) };
}
```

吸附线（拖动时调用，返回修正后的位移与要画的辅助线）：

```ts
// src/whiteboard/snap.ts —— 对齐吸附：6 条参考线 × 其它元素同名线，阈值内吸附
export interface Guide { axis: 'x' | 'y'; at: number; } // at：world 坐标位置

export function computeSnap(
  movingBBox: { minX: number; minY: number; maxX: number; maxY: number },
  staticBBoxes: { minX: number; minY: number; maxX: number; maxY: number }[],
  zoom: number,
): { dx: number; dy: number; guides: Guide[] } {
  const threshold = 6 / zoom;              // 屏幕恒定 6px → world 阈值随 zoom 反比（坑 2 的正面应用）
  const myX = [movingBBox.minX, (movingBBox.minX + movingBBox.maxX) / 2, movingBBox.maxX];
  const myY = [movingBBox.minY, (movingBBox.minY + movingBBox.maxY) / 2, movingBBox.maxY];
  let bestX: { d: number; at: number } | null = null;
  let bestY: { d: number; at: number } | null = null;

  for (const b of staticBBoxes) {
    const xs = [b.minX, (b.minX + b.maxX) / 2, b.maxX];
    const ys = [b.minY, (b.minY + b.maxY) / 2, b.maxY];
    for (const mine of myX) for (const theirs of xs) {
      const d = theirs - mine; // 正负皆可，取绝对值最小者
      if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, at: theirs };
    }
    for (const mine of myY) for (const theirs of ys) {
      const d = theirs - mine;
      if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, at: theirs };
    }
  }
  const dx = bestX?.d ?? 0;
  const dy = bestY?.d ?? 0;
  const guides: Guide[] = [];
  if (bestX) guides.push({ axis: 'x', at: bestX.at });
  if (bestY) guides.push({ axis: 'y', at: bestY.at });
  return { dx, dy, guides };
}
```

**常见坑（症状 → 根因 → 修法）**：症状——旋转 30° 的矩形拖它的"东"边缘 handle，结果矩形一边转一边斜着长。根因：在世界坐标系里直接拿指针 x 改宽度——旋转后元素的"宽"方向不与世界 x 轴共线，世界系的 Δx 混入了两个局部轴的分量。修法：如上 `resizeRect`，**一律先 worldToLocal 再动尺寸**，改完再把新中心 localToWorld 回去；旋转角全程不变。

### 路线 5：手绘笔迹 —— 采样、道格拉斯-普克简化、贝塞尔平滑、压感

**是什么**。自由画笔：`pointerdown` 落笔、`pointermove` 采样、`pointerup` 收笔；收笔后对折线做**道格拉斯-普克（Douglas–Peucker）简化**（去掉不携带形状信息的密集中间点），渲染时用**二次贝塞尔**过中点法平滑，线宽随 `pressure` 变化。

**为什么需要**。pointermove 在快速运笔时每秒可产生 200+ 事件（合并事件里更多），不简化的话：数据体积爆炸（协同同步每笔几十 KB）、命中检测多边形复杂、渲染 path 指令数巨大。DP 简化能在目视无损的前提下去掉 80%–95% 的点——这是手绘功能的"性能存档"步骤。平滑则是因为折线段直接连线在手绘里会显出明显折角（尤其简化后），贝塞尔用中点法重建顺滑曲线。

**怎么做（机制分步）**：

1. **采样**：`pointermove` 里把事件坐标转 world 存入当前笔迹数组。高价值细节：`getCoalescedEvents()` 拿到浏览器合并派发前的**中间采样点**——普通 move 事件只有最后一个位置，快速甩笔的弧线中间点全靠它补齐。
2. **简化**：收笔时对整条折线跑 DP（epsilon 用世界单位，经验值 0.5–1.5，约等于 zoom=1 时的 1px；或按线宽 20% 取）。
3. **平滑**：简化后的折线用"过中点的二次贝塞尔"重建：以相邻点中点为曲线端点、原采样点为控制点，首尾直线段收边。
4. **压感**：数位笔/触控的 `pressure`（0–1，鼠标按下的恒为 0.5），存进每个采样点；渲染时分段画，每段线宽 = 基准宽 ×（0.4 + 0.9 × 两端平均压感），圆头衔接。

**代码**（DP 完整实现 + 平滑 + 分压感渲染）：

```ts
// src/whiteboard/freehand.ts
export interface StrokePoint { x: number; y: number; pressure: number; }
export interface Stroke { id: string; points: StrokePoint[]; color: string; baseWidth: number; }

/** 点 p 到线段 ab 的距离（叉积法，避免开方前的精度损失） */
function segDist(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y); // 退化：a、b 重合
  // 叉积 / |ab| = 点到直线的距离；再钳到线段（此处手绘场景取垂线距离即可）
  const cross = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx);
  return cross / Math.sqrt(lenSq);
}

/** 道格拉斯-普克：保留使折线形状偏差 ≤ epsilon 的最少点集（递归实现，万点级也无栈忧） */
export function douglasPeucker(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  // 1) 找到离首尾连线最远的点——它是这条折线上"最不可丢弃"的形状点
  for (let i = 1; i < points.length - 1; i++) {
    const d = segDist(points[i]!, first, last);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  // 2) 最远点都容得下 → 首尾直线足够近似，中间全部丢弃
  if (maxDist <= epsilon) return [first, last];
  // 3) 容不下 → 最远点必保，分治两半各自递归
  const left = douglasPeucker(points.slice(0, index + 1), epsilon);
  const right = douglasPeucker(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right]; // 拼接处（最远点）去重
}
```

```ts
// src/whiteboard/drawStroke.ts —— 平滑渲染（过中点二次贝塞尔 + 分段压感线宽）
import type { Stroke } from './freehand';

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 1) {
    // 单点：点一个圆点（轻点）
    const p = pts[0]!;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, stroke.baseWidth * (0.4 + 0.9 * p.pressure) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = stroke.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 分段画：每段是"上一中点 → 本中点"的二次贝塞尔，控制点为当前采样点
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    const m1 = { x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2 }; // 段内中点=曲线端点
    // 端点：起点用前一段中点（i==1 时即 prev 本身），终点用 m1
    const start = i === 1 ? prev : { x: (pts[i - 2]!.x + prev.x) / 2, y: (pts[i - 2]!.y + prev.y) / 2 };
    const width = stroke.baseWidth * (0.4 + 0.9 * ((prev.pressure + cur.pressure) / 2)); // 压感→线宽
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(prev.x, prev.y, m1.x, m1.y); // 采样点做控制点，曲线不过它但被它"拉弯"
    ctx.stroke();
  }
  // 收尾：最后一段中点→末点直线，避免笔锋戛然而止
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const m = { x: (prev.x + last.x) / 2, y: (prev.y + last.y) / 2 };
  ctx.lineWidth = stroke.baseWidth * (0.4 + 0.9 * last.pressure);
  ctx.beginPath();
  ctx.moveTo(m.x, m.y);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}
```

采样侧（含 coalesced events）：

```ts
// 挂在交互层的 pointermove 分支里：当前进行中笔迹 currentStroke
function samplePointer(e: PointerEvent, screenToWorldFn: (p: { x: number; y: number }) => { x: number; y: number }) {
  // getCoalescedEvents：一次 move 事件里浏览器攒下的所有中间采样，快笔弧线不丢点
  const events: PointerEvent[] = e.getCoalescedEvents?.().length ? e.getCoalescedEvents() : [e];
  for (const ev of events) {
    currentStroke.points.push({
      ...screenToWorldFn({ x: ev.offsetX, y: ev.offsetY }),
      pressure: ev.pressure > 0 ? ev.pressure : 0.5, // 鼠标恒 0（未按下时）→按 0.5 常规处理
    });
  }
  requestInteractRedraw(); // 只重绘交互层（见路线 7），本体等收笔再提交
}
// pointerup：currentStroke.points = douglasPeucker(points, 1.2) → 提交到 shapes + 索引 + 命令栈
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：快速画一条长弧，弧顶"削平"成直线段。根因：只用了 move 事件的最终位置（合并派发），中间采样丢了；DP 的 epsilon 又把残存的弧顶点判为"可丢弃"。修法：`getCoalescedEvents()` 补齐采样，**先简化后**检查弧顶；epsilon 不要贪大（1.5 以上肉眼可见变形）。
- 症状：简化和压感都做了，但笔迹"粗细抖动"像心电图。根因：压感原始值噪声大（廉价触控笔），逐点映射线宽放大了噪声。修法：渲染前对 pressure 做一次 3 点滑动平均，或线宽改为每 5 个点取一次区间均值（Excalidraw 的做法是干脆全局等宽 + 末端 taper，工程上更省心）。

### 路线 6：命令栈 undo/redo、快捷键、右键菜单、小地图

**是什么**。四件配套：命令栈（一切修改过它的手，可退可复）；快捷键（⌘Z/⇧⌘Z/Delete/⌘D…）；右键菜单（上下文操作入口）；小地图（右下角缩略图+视口框，可点击跳转）。

**为什么需要**。没有 undo 的编辑器没人敢用（拖错一步全毁）；没有小地图的无限画布等于在黑暗里走路——用户缩放到 0.2 倍后根本不知道自己在哪。

**怎么做（命令模式）**。每笔修改封装成 Command：`{ label, undo(), redo() }`，栈只管倒放。两个工程要点：① **拖拽合并**——一次拖拽从 pointerdown 到 pointerup 是一个命令（按下记 before，抬起记 after），否则拖一个元素 60 帧就是 60 步 undo；② **快捷键别劫持输入框**——⌘Z 在文本编辑场景应归文本框自己。

```ts
// src/whiteboard/commandStack.ts
export interface Command {
  readonly label: string;   // 菜单展示："移动 矩形3" / 面板计数
  undo(): void;
  redo(): void;
}

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners = new Set<() => void>();

  push(cmd: Command) {
    this.undoStack.push(cmd);
    this.redoStack = [];         // 新命令使 redo 分支作废（线性历史的经典语义）
    if (this.undoStack.length > 100) this.undoStack.shift(); // 上限防内存膨胀
    this.emit();
  }

  undo() { const c = this.undoStack.pop(); if (c) { c.undo(); this.redoStack.push(c); this.emit(); } }
  redo() { const c = this.redoStack.pop(); if (c) { c.redo(); this.undoStack.push(c); this.emit(); } }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
  private emit() { for (const fn of this.listeners) fn(); }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

/** 快捷键绑定：输入场景不劫持 */
export function bindShortcuts(stack: CommandStack, actions: { deleteSelected: () => void; duplicate: () => void }) {
  const onKey = (e: KeyboardEvent) => {
    const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (typing) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? stack.redo() : stack.undo();
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      actions.duplicate();
    } else if ((e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      actions.deleteSelected();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
```

右键菜单（受控组件，三处关闭入口）：

```tsx
// src/whiteboard/ContextMenu.tsx
import { useEffect, useRef, useState } from 'react';

export interface MenuState {
  x: number; y: number;              // 屏幕坐标（菜单左上角）
  targetId: string | null;           // 右键落在元素上还是空白
}

export function ContextMenu({ state, onClose, actions }: {
  state: MenuState | null;
  onClose: () => void;
  actions: {
    duplicate: (id: string) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;
    delete: (id: string) => void;
    pasteHere: (x: number, y: number) => void;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // 三处关闭：任意 pointerdown（capture 阶段，赶在菜单项 onClick 前不误触）、Esc、窗口失焦
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  }, [state, onClose]);

  if (!state) return null;
  const item = (label: string, fn: () => void) => (
    <button key={label} onClick={() => { fn(); onClose(); }} style={itemStyle}>{label}</button>
  );
  return (
    <div ref={ref} style={{ position: 'fixed', left: state.x, top: state.y, zIndex: 1000, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.14)', padding: 4, display: 'grid' }}>
      {state.targetId
        ? [
            item('复制', () => actions.duplicate(state.targetId!)),
            item('置于顶层', () => actions.bringToFront(state.targetId!)),
            item('置于底层', () => actions.sendToBack(state.targetId!)),
            item('删除', () => actions.delete(state.targetId!)),
          ]
        : [item('在此粘贴', () => actions.pasteHere(state.x, state.y))]}
    </div>
  );
}
const itemStyle: React.CSSProperties = { textAlign: 'left', padding: '6px 16px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 };
```

小地图（世界 → 缩略图映射是 worldToScreen 的第二次出场，注意它是**另一套 camera**）：

```ts
// src/whiteboard/minimap.ts
import type { Camera, Pt } from './camera';
import type { BBox } from './spatialIndex';

export interface MinimapTransform { scale: number; offsetX: number; offsetY: number; }

/** 内容 bbox → 适配进 w×h 的缩略图：等比缩放 + 居中 */
export function minimapTransform(content: BBox, w: number, h: number, padding = 8): MinimapTransform {
  const scale = Math.min((w - padding * 2) / Math.max(content.maxX - content.minX, 1),
                         (h - padding * 2) / Math.max(content.maxY - content.minY, 1));
  const offsetX = padding + (w - padding * 2 - (content.maxX - content.minX) * scale) / 2 - content.minX * scale;
  const offsetY = padding + (h - padding * 2 - (content.maxY - content.minY) * scale) / 2 - content.minY * scale;
  return { scale, offsetX, offsetY };
}

export const worldToMini = (p: Pt, t: MinimapTransform): Pt => ({ x: p.x * t.scale + t.offsetX, y: p.y * t.scale + t.offsetY });

/** 小地图 → 世界（点击跳转用），并给出新 camera：让点击点成为视口中心 */
export function miniToWorldCenterCamera(
  miniClick: Pt, t: MinimapTransform, cam: Camera, viewportW: number, viewportH: number,
): { world: Pt; camera: Camera } {
  const world: Pt = { x: (miniClick.x - t.offsetX) / t.scale, y: (miniClick.y - t.offsetY) / t.scale };
  // camera.x = 视口中心屏幕坐标 - 中心world坐标*zoom（worldToScreen 的中心点版）
  return { world, camera: { ...cam, x: viewportW / 2 - world.x * cam.zoom, y: viewportH / 2 - world.y * cam.zoom } };
}
```

小地图画法：底图把每个元素 bbox 用 `worldToMini` 画色块；视口框 = 主视口四角（screen (0,0)/(w,h) → world → mini）连成的矩形。交互：点击/拖动小地图调用 `miniToWorldCenterCamera` 直接换 camera。

**常见坑（症状 → 根因 → 修法）**：症状——undo 一步，画布没变；再 undo 一步，两步的变化一起回来。根因：拖拽过程的每个 pointermove 都 push 了命令（60 帧 60 条），而中间态命令的 undo/redo 数据互相覆盖。修法：命令只在"操作完成"时入栈（pointerdown 记 before 快照，pointerup 用 `{before, after}` 构造一条命令），过程态直接改数据不入栈——**命令栈的粒度是"用户意图"，不是"帧"**。

### 路线 7：性能分层 —— 静态层 + 交互层，rAF 合并重绘

**是什么**。两层叠放的 canvas：**静态层**画已提交的形状本体（变化少），**交互层**画高变动的东西——选区框、handle、橡皮筋、吸附线、进行中的笔迹。两层共用一个"脏标记 + 单 rAF"的调度器：任何子系统标脏，下一帧统一重绘对应层，同帧多次标脏只画一次。

**为什么需要**。单层 canvas 下，选区框每帧跟随鼠标重绘 = 全部形状每帧重画；形状一多（裁剪后仍可能有几百个复杂形状）帧率崩塌。分层后鼠标交互只重绘交互层（通常 <10 个图元）；静态层只在形状数据或 camera 变化时重绘。这是"渲染成本与交互频率解耦"的标准解法。

**怎么做（机制分步）**：

1. 两 canvas 绝对定位叠放（交互层在上），外层 div 负责 ResizeObserver + 接事件。
2. 调度器：`staticDirty` / `interactDirty` 两个布尔 + 一个挂起的 rAF；`scheduleStatic()` / `scheduleInteract()` 只标脏 + 惰性挂 rAF；rAF 回调按标志重绘并清标志。
3. 静态层绘制顺序：clear → 套 camera 变换 → 裁剪（`visibleShapes`）→ 逐形状画。
4. 手绘进行中的笔迹画在交互层，收笔提交后才 `scheduleStatic()`——分层收益的最小验证用例。

**代码**：

```tsx
// src/whiteboard/CanvasStage.tsx —— 双层 canvas + rAF 合并重绘 + dpr
import { useEffect, useRef } from 'react';
import type { Camera } from './camera';
import type { Shape } from './spatialIndex';
import { SpatialIndex } from './spatialIndex';
import { visibleShapes } from './cull';
import { drawStroke } from './drawStroke';
import type { Stroke } from './freehand';

export function CanvasStage({
  camera, shapes, index,
  renderOverlay,          // 交互层绘制回调（选区/handle/吸附线，由交互系统注入）
}: {
  camera: Camera;
  shapes: Map<string, Shape | Stroke>;
  index: SpatialIndex;
  renderOverlay: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}) {
  const staticRef = useRef<HTMLCanvasElement>(null);
  const interactRef = useRef<HTMLCanvasElement>(null);
  const dirty = useRef({ static: true, interact: true });
  const rafId = useRef(0);
  const stateRef = useRef({ camera, shapes, index, renderOverlay });
  stateRef.current = { camera, shapes, index, renderOverlay };

  useEffect(() => {
    const staticCanvas = staticRef.current!;
    const interactCanvas = interactRef.current!;
    const container = staticCanvas.parentElement!;

    const resize = () => {
      // dpr 处理：物理像素 = CSS 像素 × dpr，见"坑 1"的完整推导
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth, h = container.clientHeight;
      for (const c of [staticCanvas, interactCanvas]) {
        c.width = Math.round(w * dpr);          // 物理分辨率
        c.style.width = `${w}px`;               // CSS 尺寸
        c.style.height = `${h}px`;
        c.height = Math.round(h * dpr);
        const ctx = c.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 之后一律按 CSS 像素画
      }
      dirty.current = { static: true, interact: true };
      schedule();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function drawStatic() {
      const ctx = staticCanvas.getContext('2d')!;
      const { camera: cam, shapes: all, index: idx } = stateRef.current;
      const w = staticCanvas.clientWidth, h = staticCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // 套 camera：ctx 上所有后续绘制自动 world→screen（与 DOM transform 等价的 canvas 版）
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);
      const visible = visibleShapes(idx, cam, w, h); // 视口裁剪：只画看得见的
      for (const id of visible) {
        const s = all.get(id);
        if (!s) continue;
        if (s.kind === 'stroke') drawStroke(ctx, s as Stroke);
        else if (s.kind === 'rect') { ctx.fillStyle = '#dbeafe'; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1 / cam.zoom; ctx.strokeRect(s.x, s.y, s.w, s.h); }
        else { ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }

    function drawInteract() {
      const ctx = interactCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, interactCanvas.clientWidth, interactCanvas.clientHeight);
      renderOverlay(ctx, interactCanvas.clientWidth, interactCanvas.clientHeight);
    }

    function frame() {
      rafId.current = 0;
      if (dirty.current.static) drawStatic();
      if (dirty.current.interact) drawInteract();
      dirty.current = { static: false, interact: false };
    }
    function schedule() {
      if (!rafId.current) rafId.current = requestAnimationFrame(frame); // 一帧最多画一次
    }

    // camera/形状变化 → 静态层脏；纯交互 → 交互层脏。这里简单起见都监听
    const tick = () => { dirty.current = { static: true, interact: true }; schedule(); };
    const interval = window.setInterval(tick, 1000); // 教学版：轮询 props 变化。生产应在上游变更处显式调 schedule*
    return () => { window.clearInterval(interval); cancelAnimationFrame(rafId.current); ro.disconnect(); };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={staticRef} style={{ position: 'absolute', inset: 0 }} />
      <canvas ref={interactRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
```

（教学版用 `setInterval` 轮询 props 简化接线；生产实现应把 `scheduleStatic/scheduleInteract` 通过 ref 暴露给交互系统，在**变更发生处**精确标脏——这正是分层架构的意图：变更源知道自己动了哪层。）

**常见坑（症状 → 根因 → 修法）**：症状——明明只动了鼠标（拖选区框），GPU/CPU 占用却和全量重绘一样。根因：调度器按"任何变化都刷两层"实现，或者两个 rAF 各自为政。修法：脏标记必须**分层分通道**，且 rAF 句柄全局唯一（同帧内第二次 schedule 只是空转）；用 Performance 面板验证：拖选区框时 `drawStatic` 不应出现在帧Profile里。

### 路线 8：导出 PNG/SVG 与 Yjs 协同接入点

**导出 PNG**。思路：算内容包围盒 → 建一张"以导出 camera 渲染"的离屏 canvas → 复用同一套绘制函数 → `toBlob`。关键：导出时 dpr 固定为 1，清晰度由 `scale` 参数承担（2 = 两倍图）。

```ts
// src/whiteboard/exportPng.ts
import type { Shape, BBox } from './spatialIndex';
import type { Camera } from './camera';
import type { Stroke } from './freehand';
import { drawStroke } from './drawStroke';

export async function exportPNG(
  shapes: (Shape | Stroke)[], bbox: BBox, opts: { padding: number; scale: number },
): Promise<Blob> {
  const { padding, scale } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((bbox.maxX - bbox.minX + padding * 2) * scale);
  canvas.height = Math.ceil((bbox.maxY - bbox.minY + padding * 2) * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 导出 camera：让 bbox 左上角（减 padding）对齐 canvas 原点
  const cam: Camera = { x: -(bbox.minX - padding) * scale, y: -(bbox.minY - padding) * scale, zoom: scale };
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.zoom, cam.zoom);
  for (const s of shapes) {
    if (s.kind === 'stroke') drawStroke(ctx, s as Stroke);
    else { const r = s as Shape; ctx.fillStyle = '#dbeafe'; ctx.fillRect(r.x, r.y, r.w, r.h); }
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob 失败'))), 'image/png');
  });
}
```

**导出 SVG**。SVG 是世界坐标的原生居民——**导出时完全不需要 camera**，元素坐标直接写进 `viewBox`（这是 SVG 导出比 PNG 简单的原因）：

```ts
// src/whiteboard/exportSvg.ts
import type { Shape, BBox } from './spatialIndex';
import type { Stroke } from './freehand';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const f = (n: number) => Math.round(n * 100) / 100;

export function exportSVG(shapes: (Shape | Stroke)[], bbox: BBox, padding = 32): string {
  const body = shapes.map((s) => {
    if (s.kind === 'stroke') {
      const pts = (s as Stroke).points.map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${esc((s as Stroke).color)}" stroke-width="${f((s as Stroke).baseWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const r = s as Shape;
    const transform = r.rotation ? ` transform="rotate(${f((r.rotation * 180) / Math.PI)} ${f(r.x + r.w / 2)} ${f(r.y + r.h / 2)})"` : '';
    if (s.kind === 'ellipse') {
      return `<ellipse cx="${f(r.x + r.w / 2)}" cy="${f(r.y + r.h / 2)}" rx="${f(r.w / 2)}" ry="${f(r.h / 2)}" fill="#fde68a"${transform}/>`;
    }
    return `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" rx="4" fill="#dbeafe"${transform}/>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(bbox.minX - padding)} ${f(bbox.minY - padding)} ${f(bbox.maxX - bbox.minX + padding * 2)} ${f(bbox.maxY - bbox.minY + padding * 2)}">\n  ${body}\n</svg>`;
}
```

**Yjs 协同接入点**（本章只画接口，协同内核在场景 6 富文本会再遇一次同款思想）：

```ts
// src/whiteboard/collab.ts —— Yjs 接入点：数据面 + 感知面 + 撤销面
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Shape } from './spatialIndex';
import type { Camera } from './camera';

export function createCollab(room: string, onRemoteChange: () => void) {
  const ydoc = new Y.Doc();
  const provider = new WebsocketProvider('wss://collab.example.com', room, ydoc);
  const yShapes = ydoc.getMap<Shape>('shapes'); // ★ 数据面：每个形状一个 entry（按 id 键控）
  // 为什么是 Map<id, Shape> 而不是 Y.Array：白板元素是"无序集合 + 按 id 寻址"，
  // 并发移动同一元素时 CRDT 按 entry 合并；z 序用单独的 Y.Array<string> 存 id 顺序。

  yShapes.observe(() => onRemoteChange()); // 远端变更 → 拉全量/增量刷本地 store + 索引 + scheduleStatic()

  const undoManager = new Y.UndoManager(yShapes); // ★ 撤销面：Y.UndoManager 管 CRDT 级 undo
  undoManager.trustedOrigins.add(provider);       //   自己命令栈与 Y.UndoManager 二选一，别双轨

  // ★ 感知面（awareness）：光标/选区/视口这类"不属于文档"的瞬态
  const awareness = provider.awareness;
  awareness.setLocalStateField('presence', { name: '我', color: '#f5c518' });
  const publishCamera = (cam: Camera) => awareness.setLocalStateField('viewport', cam); // 拖动时节流 100ms
  const publishCursor = (world: { x: number; y: number }) => awareness.setLocalStateField('cursor', world);

  // 本地写入入口：命令栈的 apply 应改为写 Y.Map（本地 observe 同样触发，渲染统一走观察者）
  const upsertShape = (s: Shape) => yShapes.set(s.id, s);
  const deleteShape = (id: string) => yShapes.delete(id);

  return { ydoc, provider, yShapes, undoManager, awareness, upsertShape, deleteShape, publishCamera, publishCursor };
}
```

接入点三句话：**数据面**（Y.Map<id, shape> + Y.Array 存 z 序）、**感知面**（awareness 发光标/视口/名字颜色，100ms 节流，远端渲染画在交互层）、**撤销面**（本地 CommandStack 换成 Y.UndoManager，或让 Command 的 undo 改为写反向 diff——两者不混用）。

### 难点与坑

- ⚠️ **高 DPI（devicePixelRatio）下模糊与线宽**——症状 → 根因 → 修法：

  症状：Retina 屏（dpr=2）上 canvas 画的内容发虚，文字像蒙了层纱；画 1px 的线实际渲染出来是 2 物理像素宽的灰线。根因：canvas 有两套尺寸——`width/height` 属性是**物理像素**，CSS 尺寸是显示大小。默认 `width=300` 在 dpr=2 下被 CSS 拉伸到 600 物理像素显示，每个 canvas 像素被插值放大成 2×2，于是糊；而"1px 线"落在物理像素边界时跨两个物理像素行，各渲染 50% 透明度，看起来是 2px 灰线。修法（CanvasStage 已内置，这里单看关键三行）：

  ```ts
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);            // ① 物理分辨率放大
  canvas.style.width = `${cssW}px`;                 // ② CSS 尺寸不变
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);           // ③ 绘制坐标全按 CSS 像素写，内部自动×dpr
  ```

  线宽修正：套了 camera 之后总变换是 `zoom × dpr`，`lineWidth = 1` 意味着 1 个 world 单位；想要"屏幕恒定 1 CSS 像素"的线（选中框、吸附线、网格），要写 `ctx.lineWidth = 1 / cam.zoom`（dpr 那份由 ③ 的基变换自动承担）。
- ⚠️ **缩放后 1px 线宽/命中区域随 zoom 变化（反补偿）**——症状 → 根因 → 修法：

  症状：zoom=4 时选中框细得看不见、手柄小到点不中；zoom=0.2 时选中框粗成色带、命中区域大到"隔空选中"。根因：这些"屏幕语义"的量（线宽、手柄边长、命中容差）写死在 world 坐标里，随 camera 缩放同倍放大缩小。修法：**一切"以像素体验为单位"的量都除以 zoom**——渲染侧 `lineWidth = 1.5 / zoom`、手柄绘制尺寸 `8 / zoom`；命中侧把容差定义为屏幕像素、判定前先换算 `const tol = 4 / zoom`（路线 4 的 `computeSnap` 阈值同理）。验证方法：从 0.2 到 4 逐档缩放，选中框边框的屏幕观感、手柄的可点面积应全程一致。
- ⚠️ **触控板双指缩放手势是 `wheel + ctrlKey`（不是 gesture 事件）**——症状 → 根因 → 修法：

  症状：Mac 触控板双指捏合时，要么白板没反应、浏览器把**整个网页**缩放了；要么自己监听 `gesturestart/gesturechange`（Safari 私有事件）在 Chrome 上完全无效。根因：Chrome/Edge/Firefox 把触控板捏合合成为 **wheel 事件**，特征是 `e.ctrlKey === true` 且 `deltaY` 连续变化；`gesture*` 系列是 Safari 历史私有 API，Chrome 从未支持。同时 wheel 监听默认 `passive: true`，你的 `preventDefault()` 静默失效，于是浏览器执行默认行为（整页缩放）。修法（路线 2 的分发器已实现，要点单列）：

  ```ts
  // ① 非 passive 监听是 preventDefault 生效的前提
  el.addEventListener('wheel', onWheel, { passive: false });
  function onWheel(e: WheelEvent) {
    e.preventDefault();                        // ② 无条件阻止默认（页面滚动/整页缩放）
    if (e.ctrlKey || e.metaKey) {              // ③ 捏合（或 Ctrl+滚轮）：缩放
      setCamera(zoomAt(mouse, Math.exp(-e.deltaY * 0.01), cam)); // exp 曲线手感均匀
    } else {                                   // ④ 普通滚动：平移
      setCamera({ ...cam, x: cam.x - e.deltaX, y: cam.y - e.deltaY });
    }
  }
  // ⑤ 别忘了 CSS：容器 touch-action: none，阻止触屏双指手势的浏览器默认处理
  ```

  判定细节：捏合的 deltaY 与"滚轮格"量级不同（连续小数值），`Math.exp(-deltaY * 0.01)` 的系数 0.01 是在 Mac 触控板上手感调出来的经验值，可按设备调整；验证方法——触控板捏合时在控制台打印 `e.ctrlKey`（恒 true）与 `e.pointerType`（wheel 事件无此属性，别找它）。

### ✅ 产出：验收清单

一块可用的自研白板，逐条验收：

- [ ] 视口：`zoomAt` 通过锚点不变式单测；鼠标压住任意元素角点连缩 5 档不滑移；zoom 夹在 [0.1, 4]
- [ ] 平移：空格+左键、中键拖拽、触控板双指滑动三入口可用；中键不触发浏览器自动滚动
- [ ] 坐标：元素全存 world 坐标；camera 是纯视图状态（拖视口零数据写入）
- [ ] 裁剪：rbush 索引 + 视口 world 矩形查询；10 万形状下平移缩放帧率 ≥ 50fps（Performance 面板验证 drawStatic 只画可见集）
- [ ] 交互：点选/Shift 加选/点空白清选；8 向 handle 缩放（旋转 30° 的矩形缩放不歪）；旋转 Shift 吸附 15°；框选与旋转元素求交正确
- [ ] 吸附：拖动时元素边/中线对齐出辅助线，吸附阈值屏幕 6px（0.2 与 4 倍缩放下观感一致）
- [ ] 手绘：快笔弧线不丢中间点（coalesced events）；收笔 DP 简化点数下降 ≥ 80% 且目视无变形；压感影响线宽
- [ ] 命令栈：拖拽一次 = undo 一步；⌘Z/⇧⌘Z 在输入框内不劫持；栈深 100
- [ ] 右键菜单：元素上/空白处两套菜单；Esc、任意点击、失焦三路关闭
- [ ] 小地图：内容包围盒等比适配；视口框随 camera 实时更新；点击/拖动小地图跳转视口
- [ ] 分层：拖选区框时帧 Profile 中无 drawStatic；形状提交与交互重绘互不拖累
- [ ] Retina：dpr=2 下无模糊；屏幕恒定线宽在全 zoom 档位一致
- [ ] 触控板：双指捏合走 `wheel+ctrlKey` 分支且不触发浏览器整页缩放
- [ ] 导出：PNG（含 padding、scale=2 清晰）、SVG（viewBox 精确、旋转元素 transform 正确）
- [ ] 协同：Y.Map 数据面 + awareness 光标视口 + Y.UndoManager 三面接线清楚（本地跑通双端）

### 对标：tldraw（源码质量极高，本场景首选精读）、Excalidraw、Konva

- **tldraw**——本场景**首选精读**，理由三条：① 它是"自研白板"这件事的最完整答案：视口/几何/命中/手绘/协同/性能分层全部自研且开源（大部分核心包 MIT），你能看到的不是"怎么用库"，而是**这些库是怎么被写出来的**；② 代码组织即教学大纲——几何数学（`Vec`/`Mat` 向量与矩阵）、反应式系统（signals 驱动"camera 变了只有依赖它的形状重渲"）、渲染缓存（形状级离屏缓存，比本章"整层静态缓存"更细）、手绘（perfect-freehand：把 DP+压感做成输入即用的库，建议直接用）分层清晰，每一层对应本章一条路线；③ 测试密度高，`camera` 相关的不变式单测可以直接对照本章路线 1 的验证方法。精读入口：仓库 `examples` → editor 的选区/变换状态机 → 渲染路径。（包名与目录随版本演进，以仓库 README 为准。）
- **Excalidraw**：手绘风格白板的事实标准。精读价值在**工程取舍**：它没有上协同 CRDT 硬骨头前的版本，用不可变 scene + 全量重渲染 + 逐元素 diff 撑到十万级，证明"简单方案 + 认真优化"的边界在哪；roughjs 的手绘风笔画是它另一个看点。当你犹豫"要不要一步到位上复杂架构"时，先读它。
- **Konva**（配 react-konva）：canvas 场景图库——如果白板元素是"图形元件"（流程图节点、仪表盘部件）而非自由笔迹，用 Konva 的 SceneGraph + 事件冒泡能省掉本章路线 3/4 的大半手写量。边界：极度定制的交互（不规则命中、手绘笔迹）仍要自己下沉到几何层。选型口诀：**元件图用 Konva，自由画布学 tldraw，快速原型看 Excalidraw**。

## 6. 富文本 / 块级编辑器（类 Notion）

**基础**：全景图 A1。增量——把 Notion 交互拆成**可实现清单**逐条做。

先定技术底盘，这决定后面九条路线的语言。选 **TipTap**（ProseMirror 内核的 headless 封装）：富文本四座大山——中文输入法（IME）协调、撤销重做、粘贴清洗、协同冲突——ProseMirror 都已经打磨了近十年，TipTap 在其上补齐了 TypeScript 类型、模块化扩展（Extension）和 React 绑定（NodeView/BubbleMenu）。对比项一句话带过：Slate/Lexical 灵活但 IME 与协同要自己趟坑，Plate 是 Slate 的组件层（自带组件多但定制深水区同样深），milkdown 基于 PM 偏 Markdown 场景。**本场景的定位是"产品级块编辑器"，不是"研究编辑器内核"**——内核研究归全景图 A1 的消化任务，这里全部用 PM 生态的现成抽象。

一个贯穿性认知：Notion 的"块"= ProseMirror 的**顶层 Node**（doc 的直接子节点）。你看到的每一段、每个标题、每张图、每个待办，在文档树里都是 `doc.content` 数组的一项。于是"块交互"全部翻译成 Node 级操作：整块选中（NodeSelection）、整块删除（deleteRange）、整块拖动（pos + nodeSize）、块内 UI（NodeView）。

### 实现路线

1. 块模型：每块一个 PM Node；Enter 开新块 / Backspace 合并到上一块 / 跨块选区删除
2. **Markdown 速记**：输入 `# ` 即时转标题（Input Rule）、`- ` 转列表、`[] ` 转待办
3. **Slash 命令**：输入 `/` 弹浮层菜单（floating-ui 定位到光标、模糊搜索、纯键盘导航）
4. **块拖拽**：左侧 ⠿ handle → 拖拽排序/嵌套缩进（放置目标高亮、父子层级缩进提示）
5. 块悬浮工具栏：⠿ + ＋ + 菜单（复制/删除/转换为…）
6. 选区浮动工具栏：选中文本浮出 B/I/U/链接（选区坐标计算）
7. **NodeView**：用 React 渲染块内部 UI（图片上传进度条、代码块语言选择器）
8. 无限嵌套列表与折叠块
9. 协同：y-prosemirror 双人编辑 + 他人光标

### 路线 1：块模型 —— Enter / Backspace / 跨块删除的行为规格

**是什么**。先把文档结构立起来，再把三个最基础的键的行为规格写死——它们是所有块交互的地基，规格含糊，后面每条路线都会在边界情况上翻车。

**为什么需要**。用户对"按 Enter 会发生什么"的预期来自 Notion/Word 十年训练，任何偏离都会被立刻感知。行为规格 = 把这些预期写成可测试的条目。

**文档结构**（JSON 形态直观看一眼）：

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "周会纪要" }] },
    { "type": "paragraph" },
    { "type": "taskList", "content": [
      { "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph" }] }
    ]},
    { "type": "codeBlock", "attrs": { "language": "ts" } }
  ]
}
```

**行为规格表**（默认由 PM/TipTap 扩展提供，自定义点在括号里）：

| 操作 | 规格 |
|---|---|
| 段落中按 Enter | `splitBlock`：光标处一分为二，后半成为新段落；行尾按 Enter 则下方插入空段落 |
| 标题中按 Enter | 新块**回落为段落**（官方 Heading 内置：标题不无限延续） |
| 列表项按 Enter | 同级续一项；**空列表项**按 Enter = 退出列表转段落（lift 语义） |
| Shift+Enter | 硬换行（hardBreak），不新开块 |
| Backspace（块首 + 空块） | 删除本块，光标落上一块末尾 |
| Backspace（块首 + 有内容） | 与上一块合并：类型不同先按 joinBackward 规则降级（标题并入段落成普通文本） |
| Backspace（列表项首） | 先 `liftListItem` 退一级缩进；已是顶层列表项且为空 → 转段落 |
| 跨块选区删除 | `deleteSelection`：整块被选中则块消失；部分选中则该块保留、文本截断；列表结构删除后仍自洽（schema 兜底：listItem 至少含一个 paragraph，不会留下空壳） |

**代码**（验证/定制这些行为的入口——自定义 keymap；其余默认行为建议先全部接受，别重复造）：

```ts
// src/notion-clone/blockKeymap.ts —— 自定义键行为的标准入口
import { Extension } from '@tiptap/core';

export const BlockKeymap = Extension.create({
  name: 'blockKeymap',
  addKeyboardShortcuts() {
    const editor = this.editor;
    return {
      // 例：把"空块按 Backspace"定制为"先转段落再等第二次 Backspace 删除"（更接近 Notion 手感）
      Backspace: () => {
        const { empty, $from } = editor.state.selection;
        const atBlockStart = empty && $from.parentOffset === 0;
        const inEmptyTextblock = empty && $from.parent.content.size === 0;
        if (inEmptyTextblock && $from.parent.type.name !== 'paragraph') {
          // 非段落空块（空标题/空引用）→ 先转段落，而不是直接删除
          return editor.commands.setNode('paragraph');
        }
        if (atBlockStart && editor.isActive('listItem')) {
          // 列表项首：默认已是 lift 语义，这里显式化（返回 false 即交给默认）
          return editor.commands.liftListItem('listItem');
        }
        return false; // 其余情况：交给 PM 默认（合并/删字/删除选区）
      },
      // 例：Cmd+Enter 在任意块上切换待办勾选（Notion 行为）
      'Mod-Enter': () => {
        if (editor.isActive('taskItem')) {
          return editor.commands.updateAttributes('taskItem', { checked: !editor.getAttributes('taskItem').checked });
        }
        return false;
      },
    };
  },
});
```

**常见坑（症状 → 根因 → 修法）**：症状——在待办项按 Enter 有时生成普通段落而不是新待办。根因：taskList/taskItem 扩展没装齐（`@tiptap/extension-task-list` + `@tiptap/extension-task-item` 要成对），schema 里 taskItem 的 `content: 'paragraph block*'` 与续行逻辑都在扩展里。修法：成对安装并在 StarterKit 之外显式注册（v2 的 StarterKit 不含 taskList）；用 `editor.isActive('taskItem')` 在控制台自检 schema 是否到位。

### 路线 2：Markdown 速记 —— Input Rule

**是什么**。行首输入 `# ` 立即变成 H1、`- ` 变无序列表、`[] ` 变待办——机制是 ProseMirror 的 **Input Rule**：监听文本输入，当"刚输入的那段文本"匹配模式时，用一个原子 transaction 把它替换为对应的节点/标记。

**为什么需要**。这是"键盘流用户"的核心效率来源，也是 Markdown 用户迁移的全部心智成本补偿。更重要的是它**免费且安全**：匹配发生在 PM 的事务系统内，自动进 undo 栈、自动协同、自动避开 IME 组合期（PM 输入法协调器的分内事，详见坑 1）。

**怎么做**。TipTap 三种 Input Rule 助手，按目标节点类型选：

- `textblockTypeInputRule`：改变**当前文本块**的类型（`# ` → heading）；
- `wrappingInputRule`：把当前块**包进**一个容器节点（`- ` → bulletList>listItem、`> ` → blockquote）；
- `nodeInputRule`：替换为一个独立节点（`---` → 分割线，官方已内置）。

`#`、`-`、`` ``` ``、`>`、`1.` 这些官方扩展已经内置；下面代码讲清机制并补齐 `[] ` 待办速记：

```ts
// src/notion-clone/markdownShorthands.ts
import { Extension, textblockTypeInputRule, wrappingInputRule } from '@tiptap/core';

export const MarkdownShorthands = Extension.create({
  name: 'markdownShorthands',
  addInputRules() {
    const nodes = this.editor.schema.nodes;
    return [
      // `> ` → 引用块：wrapping（把当前段落包进 blockquote）
      wrappingInputRule({ find: /^\s*>\s$/, type: nodes.blockquote! }),
      // `1. ` / `23. ` → 有序列表（序号交给列表自身维护，不需要捕获回填）
      wrappingInputRule({ find: /^(\d+)\.\s$/, type: nodes.orderedList! }),
      // `[] `/`[x] `/`[X] ` → 待办：捕获组带出勾选状态
      wrappingInputRule({
        find: /^\s*\[( |x|X)?\]\s$/,
        type: nodes.taskItem!,
        getAttributes: (match) => ({
          checked: match[1] ? match[1].toLowerCase() === 'x' : false,
        }),
      }),
      // 机制展示：把官方 Heading 的规则抄出来——textblockTypeInputRule 改的是块类型
      // （heading 官方已内置，这行只是让你看清 `# ` → heading 是怎么发生的）
      textblockTypeInputRule({
        find: /^(#{1,6})\s$/,
        type: nodes.heading!,
        getAttributes: (match) => ({ level: match[1]?.length ?? 1 }),
      }),
    ];
  },
});
```

要点：`find` 必须以 `\s$`（刚敲下的那个空格）收尾——Input Rule 匹配的是"从块首到光标"的文本，空格是触发器；`getAttributes` 的 `match` 就是 `find` 的捕获组数组，正则分组怎么设计、属性就怎么来。

**常见坑（症状 → 根因 → 修法）**：症状——`[x] ` 在**非空段落**中间输入时也触发，把整段错误地包成待办。根因：`find` 没锚定块首（少了 `^\s*`），或匹配了"光标前的所有文本"里恰好含有模式的子串。修法：模式一律 `^` 锚定块首 + 明确以触发空格结尾；测试用例覆盖"块中间输入"与"中文后跟 `# `" 两种边界。

### 路线 3：Slash 命令 —— floating-ui 定位 + 模糊搜索 + 纯键盘导航

**是什么**。输入 `/` 在光标处弹出命令浮层（插入图片/表格/代码块、转标题…），继续输入即过滤，↑↓ 选择、Enter 执行、Esc 关闭。TipTap 侧用官方 `@tiptap/suggestion` 工具（它就是为 Slash/@ 提及这类"字符触发浮层"设计的），浮层定位用 `@floating-ui/dom`。

**为什么需要**。块编辑器的功能入口有三种：菜单栏（低效）、右键（藏得深）、Slash（键盘流直达 + 可发现性好）。Notion、飞书文档、Craft 全都收敛到 Slash，因为它同时解决"插入什么"和"转成什么"两类意图。

**怎么做（机制分步）**：

1. `Suggestion` 负责监听字符 `/`：给出 `range`（要删掉的 `/query` 区间）、`query`、`view`、生命周期回调（onStart/onUpdate/onKeyDown/onExit）；
2. `render` 适配器负责浮层的生死与定位：创建容器 → React 渲染菜单 → **虚拟锚点**（光标处的零宽矩形，`view.coordsAtPos(range.from)`）交给 `computePosition`，`flip + shift` 中间件处理边缘翻转；
3. 命中执行：先 `deleteRange(range)` 删掉 `/query`，再执行条目的命令；
4. 键盘导航：Suggestion 会把按键先交给 `onKeyDown`，菜单组件用 `useImperativeHandle` 暴露处理器，返回 `true` 表示已消费（↑↓Enter），`false` 放行给编辑器。

**代码**。命令清单与模糊搜索：

```ts
// src/notion-clone/slash/items.ts
import type { Editor } from '@tiptap/core';

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  keywords: string[]; // 拼音/英文别名，模糊搜索语料
  command: (editor: Editor) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', title: '标题 1', description: '大节标题', keywords: ['h1', 'heading', 'biaoti'],
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2', title: '标题 2', description: '小节标题', keywords: ['h2', 'heading', 'biaoti'],
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'todo', title: '待办列表', description: '可勾选的任务项', keywords: ['todo', 'task', 'daiban'],
    command: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'bullet', title: '无序列表', description: '圆点列表', keywords: ['bullet', 'list', 'liebiao'],
    command: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'quote', title: '引用', description: '引用块', keywords: ['quote', 'yinyong'],
    command: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', title: '代码块', description: '带高亮的代码', keywords: ['code', 'daima'],
    command: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'image', title: '图片', description: '上传或拖入图片', keywords: ['image', 'tupian', 'img'],
    command: (e) => e.chain().focus().setImageBlock().run() }, // setImageBlock 来自路线 7 的自定义扩展
  { id: 'divider', title: '分割线', description: '水平分隔', keywords: ['divider', 'hr'],
    command: (e) => e.chain().focus().setHorizontalRule().run() },
];

/** 轻量模糊搜索：前缀 > 包含 > 关键词前缀 > 首字母缩写，四级打分 */
export function fuzzyFilter(query: string, items: SlashItem[]): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items
    .map((it) => {
      const title = it.title.toLowerCase();
      let score = -1;
      if (title.startsWith(q)) score = 100;
      else if (title.includes(q)) score = 70;
      else if (it.keywords.some((k) => k.toLowerCase().startsWith(q))) score = 60;
      else {
        // 首字母缩写：query 每个字符都能在关键词首字母集合中找到（bd → 便签/待办）
        const initials = it.keywords.map((k) => k[0] ?? '').join('');
        if ([...q].every((c) => initials.includes(c))) score = 40;
      }
      return { it, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}
```

菜单组件（纯键盘导航 + active 项滚动跟随）：

```tsx
// src/notion-clone/slash/SlashMenu.tsx
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { fuzzyFilter, SLASH_ITEMS, type SlashItem } from './items';

export interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SuggestionProps<SlashItem>>(
  ({ query, command }, ref) => {
    const filtered = useMemo(() => fuzzyFilter(query, SLASH_ITEMS), [query]);
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setActive(0), [query]); // 查询变化重置选中项
    useEffect(() => {
      // active 项滚进可视区：长列表键盘导航不"盲选"
      listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.isComposing) return false; // ★ IME 守卫：组合期间的按键不归菜单（见坑 1）
          const n = Math.max(filtered.length, 1);
          if (event.key === 'ArrowDown') { setActive((i) => (i + 1) % n); return true; }
          if (event.key === 'ArrowUp') { setActive((i) => (i - 1 + n) % n); return true; }
          if (event.key === 'Enter') {
            const item = filtered[active];
            if (item) command(item); // command 回调内会先 deleteRange('/query') 再执行（见扩展装配）
            return true;
          }
          if (event.key === 'Escape') return false; // 交给 Suggestion 关闭
          return false;
        },
      }),
      [active, filtered, command],
    );

    return (
      <div ref={listRef} className="slash-menu">
        {filtered.length === 0 && <div className="slash-empty">没有匹配的命令</div>}
        {filtered.map((item, i) => (
          <button
            key={item.id}
            data-index={i}
            className={i === active ? 'slash-item active' : 'slash-item'}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => e.preventDefault()} // ★ 防止点击使编辑器失焦（浮层点击经典坑）
            onClick={() => command(item)}
          >
            <strong>{item.title}</strong>
            <span className="slash-desc">{item.description}</span>
          </button>
        ))}
      </div>
    );
  },
);
SlashMenu.displayName = 'SlashMenu';
```

floating-ui 渲染适配器与扩展装配：

```tsx
// src/notion-clone/slash/render.tsx —— Suggestion 的 render 适配器（官方 demo 用 tippy，这里换 floating-ui）
import { createElement, createRef, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { computePosition, flip, shift } from '@floating-ui/dom';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { SlashMenu, type SlashMenuHandle } from './SlashMenu';
import type { SlashItem } from './items';

export function slashRender() {
  let root: Root | null = null;
  let el: HTMLElement | null = null;
  let menuRef: RefObject<SlashMenuHandle | null> = createRef();

  const position = (props: SuggestionProps<SlashItem>) => {
    if (!el) return;
    // ★ 虚拟锚点：光标处的零宽矩形。coordsAtPos 返回 {left, top, right, bottom}
    const coords = props.view.coordsAtPos(props.range.from);
    const anchor = {
      getBoundingClientRect: () => ({
        width: 0, height: 0,
        top: coords.top, bottom: coords.bottom,
        left: coords.left, right: coords.right,
        x: coords.left, y: coords.top,
        toJSON: () => ({}),
      }) as DOMRect,
    };
    computePosition(anchor, el, {
      placement: 'bottom-start',
      middleware: [flip(), shift({ padding: 8 })], // 底部放不下翻上方；左右出界平移
    }).then(({ x, y }) => {
      if (el) Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    });
  };

  return {
    onStart(props: SuggestionProps<SlashItem>) {
      el = document.createElement('div');
      Object.assign(el.style, { position: 'fixed', zIndex: '1000', left: '0px', top: '0px' });
      document.body.appendChild(el);
      root = createRoot(el);
      menuRef = createRef();
      root.render(createElement(SlashMenu, { ...props, ref: menuRef }));
      position(props);
    },
    onUpdate(props: SuggestionProps<SlashItem>) {
      root?.render(createElement(SlashMenu, { ...props, ref: menuRef }));
      position(props); // 继续输入时光标移动，浮层跟随
    },
    onKeyDown(props: SuggestionKeyDownProps): boolean {
      return menuRef.current?.onKeyDown(props) ?? false;
    },
    onExit() {
      root?.unmount();
      el?.remove();
      root = null;
      el = null;
    },
  };
}
```

```ts
// src/notion-clone/slash/slashExtension.ts
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { slashRender } from './render';
import { SLASH_ITEMS, type SlashItem } from './items';

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',                            // 触发字符（行中/行首均可，Notion 行为）
        items: () => SLASH_ITEMS,             // 过滤交给菜单组件（也可在此按 query 过滤）
        command: ({ editor, range, props }: { editor: import('@tiptap/core').Editor; range: { from: number; to: number }; props: SlashItem }) => {
          editor.chain().focus().deleteRange(range).run(); // ① 先删掉 '/query' 文本
          props.command(editor);                                 // ② 再执行条目动作
        },
        render: slashRender,
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion<SlashItem>({ ...this.options.suggestion, editor: this.editor })];
  },
});
```

**常见坑（症状 → 根因 → 修法）**：症状——鼠标点菜单项，编辑器失焦、命令作用在了错误位置。根因：点击按钮触发 mousedown → 编辑器 blur → selection 丢失，而 `command` 里的 chain 依赖编辑器选区。修法：菜单项 `onMouseDown={(e) => e.preventDefault()}`（阻止焦点转移，上面代码已内置），并且命令一律 `editor.chain().focus()...` 显式回焦。

### 路线 4：块拖拽 —— ⠿ handle、放置目标高亮、嵌套缩进

**是什么**。鼠标悬停块左侧出现 ⠿ 把手，按住拖动：块之间出现蓝色放置线/目标块高亮；松手完成排序；拖到目标块左侧缩进档位上松手则形成嵌套（Notion 的父子层级）。

**为什么需要**。长文档里"把这段挪到上面第三段后面"用剪切粘贴要 5 次操作且不可视；拖拽是 1 次且全程所见即所得。这是块编辑器区别于传统富文本的招牌交互。

**怎么做（机制分步）**。用 ProseMirror 插件 + Decoration 实现，三块拼图：

1. **Widget Decoration**：给每个顶层块头部挂一个不可编辑的 ⠿ div（`draggable`、`contentEditable=false`）。注意 widget 的 DOM 构造函数能拿到 `view`——dragstart 时就能 dispatch 元数据。
2. **拖拽协议**：dragstart 把"源块的 pos"写进 `dataTransfer`；dragover 用 `view.posAtCoords` 算落点 → 找到落点所在的顶层块 → 按指针在块内的纵向位置决定 before/after → dispatch plugin meta 更新高亮；drop 时删旧插新（**删除导致的 pos 偏移要补偿**）。
3. **高亮**：`Decoration.node` 给目标块挂 class；嵌套缩进 = drop 后按悬停的水平档位执行 N 次 `sinkListItem`（列表场景）或包进容器块（通用块场景需要目标类型支持 `content: 'block+'`，与路线 8 的折叠块共用这套容器）。

**代码**（顶层块排序 + 高亮的完整插件；嵌套缩进给接入点）：

```ts
// src/notion-clone/blockDrag.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface DragState {
  dragging: { pos: number } | null;
  dropTarget: { pos: number; place: 'before' | 'after' | 'inside' } | null; // inside = 嵌套意图
}

export const blockDragKey = new PluginKey<DragState>('blockDrag');

export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',
  addProseMirrorPlugins() {
    return [
      new Plugin<DragState>({
        key: blockDragKey,
        state: {
          init: () => ({ dragging: null, dropTarget: null }),
          apply(tr, value) {
            const meta = tr.getMeta(blockDragKey) as Partial<DragState> | undefined;
            return meta ? { ...value, ...meta } : value; // 拖拽不改文档，pos 无需 map
          },
        },
        props: {
          decorations(state) {
            const st = blockDragKey.getState(state)!;
            const decos: Decoration[] = [];
            // ① 每个顶层块头挂 ⠿ widget
            state.doc.forEach((node, offset) => {
              decos.push(
                Decoration.widget(
                  offset,
                  (view) => {
                    const handle = document.createElement('div');
                    handle.className = 'block-drag-handle';
                    handle.draggable = true;
                    handle.contentEditable = 'false'; // 装饰性 DOM 必须退出 contentEditable
                    handle.textContent = '⠿';
                    handle.addEventListener('dragstart', (ev) => {
                      ev.dataTransfer?.setData('application/x-block-pos', String(offset));
                      if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
                      view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: { pos: offset } }));
                    });
                    return handle;
                  },
                  { side: -1 }, // 挂在块首之前
                ),
              );
            });
            // ② 放置目标高亮
            if (st.dragging && st.dropTarget) {
              const node = state.doc.nodeAt(st.dropTarget.pos);
              if (node) {
                decos.push(
                  Decoration.node(st.dropTarget.pos, st.dropTarget.pos + node.nodeSize, {
                    class: st.dropTarget.place === 'inside' ? 'block-drop-inside' : 'block-drop-target',
                  }),
                );
              }
            }
            return DecorationSet.create(state.doc, decos);
          },
          handleDOMEvents: {
            dragover: (view, event) => {
              const e = event as DragEvent;
              const st = blockDragKey.getState(view.state)!;
              if (!st.dragging) return false;
              e.preventDefault(); // 允许 drop
              const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
              if (!coords) return true;
              let targetOffset = -1;
              view.state.doc.forEach((node, offset) => {
                if (coords.pos >= offset && coords.pos < offset + node.nodeSize) targetOffset = offset;
              });
              if (targetOffset < 0 || targetOffset === st.dragging.pos) return true;
              const dom = view.nodeDOM(targetOffset) as HTMLElement | null;
              if (!dom) return true;
              const rect = dom.getBoundingClientRect();
              // 落点判定：块左缘 24px 缩进带 = 嵌套（inside）；否则按纵向上下半区 = before/after
              const place: 'before' | 'after' | 'inside' =
                e.clientX < rect.left + 24 ? 'inside'
                : e.clientY > rect.top + rect.height / 2 ? 'after'
                : 'before';
              if (!st.dropTarget || st.dropTarget.pos !== targetOffset || st.dropTarget.place !== place) {
                view.dispatch(view.state.tr.setMeta(blockDragKey, { dropTarget: { pos: targetOffset, place } }));
              }
              return true;
            },
            drop: (view, event) => {
              const e = event as DragEvent;
              const st = blockDragKey.getState(view.state)!;
              if (!st.dragging) return false;
              e.preventDefault();
              const target = st.dropTarget;
              if (!target) {
                view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
                return true;
              }
              const from = st.dragging.pos;
              const node = view.state.doc.nodeAt(from);
              const targetNode = view.state.doc.nodeAt(target.pos);
              if (!node || !targetNode) return true;
              // 删旧 → 插新；删除使目标 pos 前移时补偿
              const shift = from < target.pos ? node.nodeSize : 0;
              const base = target.pos - shift;
              const insertPos = target.place === 'before' ? base : base + targetNode.nodeSize;
              const tr = view.state.tr;
              tr.delete(from, from + node.nodeSize);
              tr.insert(insertPos, node);
              // 嵌套（inside）：把刚插入的块包成 目标块的"子"——
              // PM 里"任意块可嵌套"的通用落地 = 包进 bulletList>listItem（listItem 收 block 组的任意块）
              if (target.place === 'inside') {
                const { bulletList, listItem } = view.state.doc.type.schema.nodes;
                if (bulletList && listItem) {
                  tr.wrap(insertPos, insertPos + node.nodeSize, [{ type: bulletList }, { type: listItem }]);
                }
              }
              view.dispatch(tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
              return true;
            },
            dragend: (view) => {
              view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
              return false;
            },
          },
        },
      }),
    ];
  },
});
```

配套样式与嵌套缩进接入点：

```css
/* src/notion-clone/block-editor.css */
.ProseMirror > * { position: relative; }        /* 每个顶层块成为把手的定位上下文 */
.block-drag-handle {
  position: absolute; left: -36px; top: 2px;
  width: 26px; height: 20px; line-height: 20px; text-align: center;
  color: #bbb; cursor: grab; opacity: 0; user-select: none; transition: opacity .12s;
}
.ProseMirror > *:hover > .block-drag-handle { opacity: 1; }
.block-drag-handle:active { cursor: grabbing; }
.block-drop-target { outline: 2px solid #1890ff; outline-offset: 2px; background: #f0f7ff; }
.block-drop-inside { box-shadow: inset 0 0 0 2px #722ed1; background: #f9f0ff; } /* 嵌套目标：紫色内框 */
```

```ts
// 多级嵌套（进阶）：上面的 inside 落点只包一层；要按"悬停 x 的缩进档位"决定层级，
// 在 drop 的 wrap 之后，把选区放进刚移动的块内，再执行 (档位-1) 次 sinkListItem：
const contentLeft = editor.view.dom.getBoundingClientRect().left;
const level = Math.max(1, Math.floor((e.clientX - contentLeft) / 36)); // 36px 一档
for (let i = 1; i < level; i++) {
  editor.chain().focus().sinkListItem('listItem').run(); // 选区已在被移动块内，每层一次 sink
}
// 通用容器块的嵌套（toggle/章节等接受 content: 'block+' 的自定义节点）同理：
// wrap 的目标类型从 bulletList/listItem 换成你的容器节点即可。
```

生产提示：TipTap v2.5+ 官方提供了 `@tiptap/extension-drag-handle` 与 `@tiptap/extension-global-drag-handle`，把上面这套插件工程化（虚拟化、多点触控、嵌套判定都更完善）——自研一遍的意义在于理解它调不通时该怎么修。

**常见坑（症状 → 根因 → 修法）**：症状——把块 A 拖到紧随其后的块 B 后面，结果顺序没变或 B 消失了。根因：先插后删/先删后插的 pos 补偿写错——插入使源块 pos 偏移，删除位置随之错位，误删了邻居。修法：固定"先删后插"次序并只做一次补偿（`shift = from < target.pos ? node.nodeSize : 0`）；用 `tr.mapping` 也可（删完后 `tr.mapping.map(target.pos)`），但两种补偿**不要混用**。测试用例：相邻上移、相邻下移、跨半文档移动三例必须全绿。

### 路线 5：块悬浮工具栏 —— ⠿ + ＋ + 菜单

**是什么**。光标进入某块时，块左侧浮出一列小按钮：⠿（拖拽把手，即路线 4）、＋（在下方插入空块）、⧉ 复制块、H 转标题、🗑 删除块、"转换为…"菜单。

**为什么需要**。块级操作（整块复制/删除/换类型）在选区模型里没有自然入口（选区是文本级的）；悬浮工具栏把"块"作为一等操作对象暴露出来，与 Slash（插入）、Bubble（文本格式化）三者分工。

**怎么做**。定位公式：`view.nodeDOM($from.before(1))` 拿到当前顶层块的 DOM → `getBoundingClientRect()` → 相对编辑器容器（`position: relative`）绝对定位到块左侧。监听 `selectionUpdate` + `transaction` 更新。

**代码**：

```tsx
// src/notion-clone/BlockToolbar.tsx
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface BlockInfo { top: number; left: number; pos: number; }

export function BlockToolbar({
  editor, containerRef,
}: {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [info, setInfo] = useState<BlockInfo | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { state, view } = editor;
      const { $from } = state.selection;
      const container = containerRef.current;
      if (!container) return;
      // 光标所在最外层块（depth=1）的起点 pos：$from.before(1) 是"块"的地址
      const topPos = $from.before(1);
      const topNode = state.doc.nodeAt(topPos);
      const dom = view.nodeDOM(topPos) as HTMLElement | null;
      if (!dom || !topNode) { setInfo(null); return; }
      const blockRect = dom.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setInfo({
        top: blockRect.top - containerRect.top,
        left: blockRect.left - containerRect.left - 56, // 悬在块左侧留白
        pos: topPos,
      });
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update); // 滚动/输入都会触发 transaction，顺带覆盖滚动跟随
    return () => { editor.off('selectionUpdate', update); editor.off('transaction', update); };
  }, [editor, containerRef]);

  if (!info || !editor) return null;
  const node = editor.state.doc.nodeAt(info.pos);
  const nodeSize = node?.nodeSize ?? 0;

  const duplicate = () => {
    if (!node) return;
    editor.chain().focus().insertContentAt(info.pos + nodeSize, node.toJSON()).run(); // JSON 克隆插到身后
  };
  const remove = () => editor.chain().focus().deleteRange({ from: info.pos, to: info.pos + nodeSize }).run();
  const insertBelow = () => editor.chain().focus()
    .insertContentAt(info.pos + nodeSize, { type: 'paragraph' }).run();

  return (
    <div style={{ position: 'absolute', top: info.top, left: info.left, display: 'flex', gap: 2, opacity: 0.55 }}>
      <button title="拖拽排序（路线 4 把手）">⠿</button>
      <button title="下方插入块" onClick={insertBelow}>＋</button>
      <button title="复制块" onClick={duplicate}>⧉</button>
      <button title="转为 H2" onClick={() => editor.chain().focus().setNode('heading', { level: 2 }).run()}>H</button>
      <button title="删除块" onClick={remove}>🗑</button>
    </div>
  );
}
// 编辑器容器：<div ref={containerRef} style={{ position: 'relative' }}> 才能让上面的绝对定位生效
```

**常见坑（症状 → 根因 → 修法）**：症状——工具栏位置在滚动后漂移/定格在旧位置。根因：只监听了 `selectionUpdate`，滚动不改变选区。修法：加 `transaction` 监听（PM 滚动伴随 transaction 的 scrollIntoView），或容器 `scroll` 事件里强制重算（生产建议用 floating-ui 的 `autoUpdate`，它把 scroll/resize/DOM 变动全包了）。

### 路线 6：选区浮动工具栏 —— 选区坐标计算与滚动跟随

**是什么**。选中一段文字，选区上方浮出 B/I/U/链接 小条。选区消失，小条隐藏。

**为什么需要**。格式化是富文本第一高频操作；顶部固定工具栏要把视线拽离文本，浮动工具栏贴着操作对象。

**怎么做（坐标计算）**。核心是 `view.coordsAtPos`：给一个文档 pos，返回该光标位置的**视口坐标**矩形。选区两端各取一次，包络出选区矩形，工具条定位于其上方居中。滚动跟随 = 容器 scroll 时重算（坐标是视口系的，滚动即失效）。

**代码**（手写版，理解原理；生产可直接用 BubbleMenu 组件）：

```tsx
// src/notion-clone/BubbleToolbar.tsx
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export function BubbleToolbar({ editor }: { editor: Editor | null }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) { setPos(null); return; }
      // ★ 选区两端坐标：to 传 side=-1 取"终点前侧"，跨行选区时包络矩形更贴近直觉
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to, -1);
      const centerX = (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2;
      const top = Math.min(start.top, end.top) - 44; // 工具条高 ~36 + 间距 8
      setPos({ left: centerX, top });
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    // ★ 滚动跟随：coordsAtPos 是视口坐标，容器一滚就过期
    const scroller = editor.view.dom.closest('.notion-scroll') ?? document.scrollingElement ?? document;
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editor]);

  if (!pos || !editor) return null;
  const btn = (label: string, title: string, onClick: () => void, active = false) => (
    <button key={title} title={title} onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} /* 同 Slash：防止失焦 */
      style={{ border: 'none', background: active ? '#e6f4ff' : 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 4 }}>
      {label}
    </button>
  );
  return (
    <div style={{
      position: 'fixed', left: pos.left, top: Math.max(pos.top, 8),
      transform: 'translateX(-50%)', background: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,.14)', borderRadius: 6, padding: 4,
      display: 'flex', gap: 2, zIndex: 900,
    }}>
      {btn(<b>B</b>, '加粗', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn(<i>I</i>, '斜体', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn(<u>U</u>, '下划线', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      {btn('🔗', '链接', () => {
        const url = window.prompt('链接地址');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }, editor.isActive('link'))}
    </div>
  );
}
```

生产捷径（TipTap 自带组件，v2 从 `@tiptap/react` 导出；v3 迁至 `@tiptap/react/menus`）：

```tsx
import { BubbleMenu } from '@tiptap/react';

<BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
  {/* 同上按钮组：shouldShow / tippy 选项控制出现条件 */}
</BubbleMenu>
```

**常见坑（症状 → 根因 → 修法）**：症状——跨行选区时工具条定位到两行之间的"中缝"，或全选时飞到页面外。根因：`coordsAtPos(from)` 与 `coordsAtPos(to)` 分别在首行行首和末行行尾，二者包络可能覆盖整页；`side` 参数取错侧时视觉跳跃。修法：`to` 用 `side: -1`；跨行/块时改用 `window.getSelection().getRangeAt(0).getBoundingClientRect()`（浏览器原生选区矩形，跨行时浏览器给的是视觉包络），两种来源互为兜底。

### 路线 7：NodeView —— 用 React 渲染块内部

**是什么**。ProseMirror 允许任意节点用自定义 UI 渲染，TipTap 的 `ReactNodeViewRenderer` 把这块 UI 变成 React 组件：块外壳（NodeViewWrapper）+ 可编辑内容区（NodeViewContent）+ 周边任意 React 交互。两个经典应用：图片块（上传进度条）、代码块（语言选择器）。

**为什么需要**。纯 PM 渲染的节点只能是"标签+属性"，做不了进度条、下拉框这类富交互；把块内部交给 React，等于给文档树开了一个 React 世界的洞——上传中的进度是 React state，落库的 src 是文档 attr，边界清晰（attr 变更走 `updateAttributes`，进 undo/协同；UI 态不进文档）。

**怎么做（机制分步）**：

1. 定义 Node：`atom: true`（图片块整块选中，内部无文本位）；attributes 声明进文档 schema；
2. `addNodeView: () => ReactNodeViewRenderer(组件)`；
3. 组件收到 `NodeViewProps`：`node`（只读文档节点）、`updateAttributes`（写 attr，产生 transaction）、`selected`（块是否被选中，画选中框用）、`deleteNode`；
4. 装饰性控件（按钮、select）必须 `contentEditable={false}`，否则点击会破坏文档选区。

**代码**。图片块（含上传进度条）：

```tsx
// src/notion-clone/ImageBlock.tsx
import { useRef } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,          // 整块选中/删除/拖动，内部不参与文本编辑
  draggable: true,
  addAttributes: () => ({
    src: { default: null },
    status: { default: 'idle' },  // idle | uploading | done | error：UI 态存 attr，协同端可见"对方在传图"
    progress: { default: 0 },     // 0-100
  }),
  parseHTML: () => [{ tag: 'img[data-type="image-block"]' }],
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes({ 'data-type': 'image-block' }, HTMLAttributes)];
  },
  addCommands() {
    return {
      // 供 Slash 命令调用：在光标处插入一个待上传的图片块
      setImageBlock: () => ({ commands }: import('@tiptap/core').CommandProps) =>
        commands.insertContent({ type: this.name }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function ImageBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const src = node.attrs.src as string | null;
  const status = node.attrs.status as string;
  const progress = node.attrs.progress as number;

  const upload = async (file: File) => {
    updateAttributes({ status: 'uploading', progress: 0 });
    try {
      const url = await uploadFile(file, (pct) => updateAttributes({ progress: pct }));
      updateAttributes({ src: url, status: 'done', progress: 100 });
    } catch {
      updateAttributes({ status: 'error' });
    }
  };

  return (
    <NodeViewWrapper className="image-block" data-selected={selected || undefined}>
      {src ? (
        <img src={src} alt="" style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
          style={{ border: '1px dashed #d9d9d9', borderRadius: 6, padding: 24, textAlign: 'center', cursor: 'pointer' }}
        >
          {status === 'uploading' ? (
            <>
              <div style={{ height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#1890ff', transition: 'width .2s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>上传中 {progress}%</div>
            </>
          ) : status === 'error' ? (
            <span style={{ color: '#ff4d4f', fontSize: 13 }}>上传失败，点击重试</span>
          ) : (
            <span style={{ color: '#999', fontSize: 13 }}>点击选择或拖入图片</span>
          )}
        </div>
      )}
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void upload(f); }}
      />
    </NodeViewWrapper>
  );
}

/** XHR 上传：fetch 没有 upload progress，进度条必须用 XMLHttpRequest */
function uploadFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve((JSON.parse(xhr.responseText) as { url: string }).url);
      else reject(new Error(`上传失败：HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('网络错误'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
```

代码块语言选择器（语法高亮交给 `@tiptap/extension-code-block-lowlight` 的 decoration 插件，NodeView 只加 UI 壳）：

```tsx
// src/notion-clone/CodeBlock.tsx
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

const lowlight = createLowlight(common);

const LANGUAGES = ['ts', 'js', 'json', 'bash', 'css', 'html', 'python', 'go', 'rust', 'sql'];

export const NotionCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight });

function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string) || 'ts';
  return (
    <NodeViewWrapper as="pre" className="code-block">
      <select
        contentEditable={false} /* ★ 下拉必须退出编辑区 */
        value={language}
        onChange={(e) => updateAttributes({ language: e.target.value })}
        className="code-lang-select"
      >
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      {/* 高亮 spans 由 lowlight 的 ProseMirror decorations 注入 contentDOM，与 React 无关 */}
      <NodeViewContent as="code" />
    </NodeViewWrapper>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——点击语言下拉，代码块内容被清空/光标跳丢。根因：select 没有 `contentEditable={false}`，点击被 PM 当作文档交互处理。修法：NodeView 内**一切装饰性控件**显式 `contentEditable={false}`；包裹它们的 `NodeViewWrapper` 天然隔离（contentDOM 只在 `NodeViewContent` 处）。

### 路线 8：无限嵌套列表与折叠块

**是什么**。两层能力：① 列表可无限嵌套（Tab 降级/Shift+Tab 升级），PM schema 的 `listItem content: 'paragraph block*'` 天然支持；② 折叠块：点击标题/列表项左侧三角，其下属内容收起——文档数据不变，只是视觉隐藏。

**为什么需要**。嵌套列表是文档信息结构的骨架；折叠是长文档导航的刚需。关键认知：**折叠必须是"视图状态"而不是"文档编辑"**——用 CSS 隐藏（Decoration 加 class）而不是从文档删节点，否则协同端会收到一场"把别人内容全删了"的假编辑风暴。

**怎么做**。嵌套：装好 list 扩展即得（Tab/Shift+Tab 是内置快捷键），`@tiptap/extension-list-keymap` 可以让 Backspace/Enter 在列表里的行为更贴近 Notion。折叠：plugin state 存"已折叠的标题 pos 集合"（本地状态，不进文档），decorations 给"标题 + 其覆盖范围"挂 class，CSS `display: none`。**pos 必须随文档编辑 mapping**（这也是坑 3 的正面教材）。

**代码**：

```ts
// src/notion-clone/foldHeadings.ts —— 折叠块：plugin state + decorations + CSS 隐藏
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface FoldState {
  folded: Set<number>;      // 已折叠标题的 pos（本地视图状态，不进文档）
  decos: DecorationSet;
}
export const foldKey = new PluginKey<FoldState>('foldHeadings');

export const FoldHeadings = Extension.create({
  name: 'foldHeadings',
  addProseMirrorPlugins() {
    return [
      new Plugin<FoldState>({
        key: foldKey,
        state: {
          init: () => ({ folded: new Set<number>(), decos: DecorationSet.empty }),
          apply(tr, value, _old, newState) {
            // ① pos 随 mapping 平移：编辑后折叠点必须跟着走（否则折叠错位/失效）
            const folded = new Set<number>();
            for (const pos of value.folded) {
              const mapped = tr.mapping.map(pos, -1);
              const node = newState.doc.resolve(mapped).nodeAfter;
              if (node?.type.name === 'heading') folded.add(mapped); // 标题被删/转型 → 丢弃该折叠态
            }
            // ② 显式切换（来自 handleClick 的 meta）
            const meta = tr.getMeta(foldKey) as { toggle?: number } | undefined;
            if (meta?.toggle !== undefined) {
              folded.has(meta.toggle) ? folded.delete(meta.toggle) : folded.add(meta.toggle);
            }
            // ③ 重建 decorations：每个折叠标题算一次"覆盖范围"，成本 ∝ 折叠数而非文档长度
            const decos: Decoration[] = [];
            for (const pos of folded) {
              const $pos = newState.doc.resolve(pos);
              const headingSize = $pos.nodeAfter?.nodeSize ?? 0;
              const level = ($pos.nodeAfter?.attrs.level as number) ?? 1;
              let end = newState.doc.content.size;
              newState.doc.nodesBetween(pos + headingSize, newState.doc.content.size, (n, offset) => {
                // 覆盖到"下一个同级或更高级标题"为止
                if (n.type.name === 'heading' && (n.attrs.level as number) <= level && offset > pos) {
                  end = Math.min(end, offset);
                }
              });
              decos.push(Decoration.node(pos, pos + headingSize, { class: 'heading-folded' }));
              if (end > pos + headingSize) {
                decos.push(Decoration.node(pos + headingSize, end, { class: 'heading-body-folded' }));
              }
            }
            return { folded, decos: DecorationSet.create(newState.doc, decos) };
          },
        },
        props: {
          decorations(state) { return foldKey.getState(state)?.decos ?? DecorationSet.empty; },
          // 点击标题块的起始 pos → 切换折叠（生产换成块首的三角按钮 widget）
          handleClick: (view, pos) => {
            const node = view.state.doc.nodeAt(pos);
            const $pos = view.state.doc.resolve(pos);
            if (node?.type.name === 'heading' && pos === $pos.before()) {
              view.dispatch(view.state.tr.setMeta(foldKey, { toggle: pos }));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
```

```css
/* 折叠块的本质：视图层隐藏，文档一个字节不动 */
.heading-body-folded { display: none; }
.heading-folded::before { content: '▸'; margin-right: 6px; color: #999; }
```

**常见坑（症状 → 根因 → 修法）**：症状——折叠一段后在别处打字，折叠的内容突然弹出来/折叠跳到别的标题上。根因：折叠态存的是**绝对 pos**，编辑使 pos 过期，没有随 `tr.mapping` 平移。修法：见上面 ①——`tr.mapping.map(pos, -1)` 后还要校验"映射后仍然是标题"，被删/被转换的折叠点直接丢弃。

### 路线 9：协同 —— y-prosemirror 双人编辑 + 他人光标

**是什么**。两个浏览器同时编辑同一文档：字符级实时同步、互不覆盖（CRDT）、能看到对方名字牌和光标、离线编辑重连自动合入。技术栈：Yjs（CRDT 内核）+ y-prosemirror（PM 绑定）+ TipTap 的两个封装扩展（Collaboration / CollaborationCursor）+ 一个连接层（y-websocket 自建、Hocuspocus 自托管、或商业托管）。

**为什么需要**。块编辑器的主战场是协作文档；而且协同不是"最后加上的功能"——undo、光标、选区在协同下都有专门语义（本地 undo 不能撤销别人的输入），第一天就要选对架构。

**怎么做（代码 + 要点）**：

```tsx
// src/notion-clone/CollabEditor.tsx
import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
// 上文各路线的扩展也在此一并注册（SlashCommand、BlockDragHandle、ImageBlock…）

export function CollabEditor({ room, user }: { room: string; user: { name: string; color: string } }) {
  // Y.Doc/Provider 必须保持引用稳定：绝不能放进 useState 每次渲染重建
  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('wss://collab.example.com', room, ydoc);
    return { ydoc, provider };
  }, [room]);

  useEffect(() => () => { provider.destroy(); ydoc.destroy(); }, [provider, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),   // ★ 必须关掉内置 undo：双 history 会撕碎 CRDT 状态
      Placeholder.configure({ placeholder: "输入 '/' 唤起命令…" }),
      Collaboration.configure({ document: ydoc }),        // = y-prosemirror 的 ySyncPlugin
      CollaborationCursor.configure({ provider, user }),  // = yCursorPlugin：他人光标/名字牌
    ],
    editorProps: { attributes: { class: 'notion-editor' } },
  });

  // undo/redo 走协同扩展提供的命令（背后是 Y.UndoManager：只回滚"自己"的编辑）
  // editor.chain().focus().undo().run() / editor.chain().focus().redo().run()

  return (
    <div className="notion-scroll" style={{ maxWidth: 720, margin: '0 auto' }}>
      {editor && <EditorContent editor={editor} />}
    </div>
  );
}
```

五个要点（面试高频）：① **相对位置**——CRDT 的位置锚定在邻居字符上而非绝对偏移，两人同时在同段插字互不丢；② **undo 语义**——Y.UndoManager 只撤销自己的操作，且可配置 `trustedOrigins` 让"程序化写入"（如 AI 插入）不污染用户撤销栈；③ **awareness 瞬态**——光标/选区/在线名单走 awareness（不持久化、断线即逝），文档数据走 Y.Doc（持久化）；④ **离线**——断网照常编辑，本地 Y.Doc 缓存（IndexedDB 可选 y-indexeddb），重连自动 merge；⑤ **服务端无脑转发**——自建 y-websocket/Hocuspocus 只需要广播消息，不理解文档（CRDT 的精髓：一致性计算全在客户端）。

**常见坑（症状 → 根因 → 修法）**：症状——双人编辑时对方的光标渲染成"一长条选区"或位置漂移。根因：CollaborationCursor 没配 user（名字/颜色缺失时退化渲染），或与 `editorProps.decorations` 里自己的全量 decorations 冲突（光标也是 decorations，被你的整组 set 覆盖）。修法：用 `Plugin` 维护的独立 DecorationSet（走 `.map()`，见坑 3 与路线 8 的写法），不要在 editorProps 里整组覆盖 decorations。

### 难点与坑

- ⚠️ **中文 IME 组合期间 Input Rule 误触发**——症状 → 根因 → 修法：

  症状：用拼音输入"标题"二字，敲到中间态（如拼音串 "biaoti" 某刻显示成 "b"）时页面突然把整块变成了标题；或候选框开着按 Enter 选词，结果 Slash 菜单把 Enter 消费了、执行了命令。根因：IME 组合（composition）期间，浏览器每个按键仍派发 keydown，且 `event.isComposing === true`、`keyCode === 229`；ProseMirror 内核的 input rule 和命令系统会正确跳过组合期（它有专门的输入法协调器），**但你自己的代码不会**——extension 的 `addKeyboardShortcuts`、Slash 菜单的 keydown、window 级监听，都会在组合期间照常触发。修法：给所有自定义键盘路径加同一道闸：

  ```ts
  // 判定：composition 期间的事件特征是 isComposing=true 或 keyCode=229（Safari 老版本只给 229）
  export const isComposingEvent = (e: KeyboardEvent) => e.isComposing || e.keyCode === 229;

  // 用法一：Suggestion 菜单的 onKeyDown（Slash 菜单就是在这里吃掉 Enter 的）
  // SlashMenu 里已经内置：组合期的按键一律不消费，还给浏览器继续选词
  onKeyDown: ({ event }) => {
    if (isComposingEvent(event)) return false;
    if (event.key === 'Enter') { /* ...执行选中项 */ return true; }
    return false;
  },

  // 用法二：window 级自定义快捷键/浮层（Bubble 工具栏等）
  window.addEventListener('keydown', (e) => {
    if (isComposingEvent(e)) return; // 组合期不消费、不 preventDefault
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openQuickFind(); }
  });

  // 用法三：React 组件层维护组合状态（需要连续判定时比单事件判断更稳）
  import { useEffect, useState } from 'react';
  export function useIsComposing() {
    const [composing, setComposing] = useState(false);
    useEffect(() => {
      const on = () => setComposing(true);
      const off = () => setComposing(false);
      window.addEventListener('compositionstart', on);
      window.addEventListener('compositionend', off);
      return () => {
        window.removeEventListener('compositionstart', on);
        window.removeEventListener('compositionend', off);
      };
    }, []);
    return composing;
  }
  ```

  三条纪律：组合期间**不消费按键**（上面的闸）、**不 preventDefault**（会打断候选框）、**不 dispatch transaction**（PM 正在缓冲组合文本，外部写入会与提交时序赛跑）。
- ⚠️ **粘贴 Excel/Word 富文本清洗（白名单 schema）**——症状 → 根因 → 修法：

  症状：从 Excel 粘一段，文档里出现成百上千个 `<span>`、字号/字体全乱；从 Word 粘贴带出 `mso-*` 私有样式与隐藏元素；偶尔还有整段内容凭空消失。根因：PM 的 schema 本身就是白名单（未知标签解析时会被丢弃或拆解），但两个漏洞让它失效：① 某些扩展的 `parseHTML` 规则太宽（`tag: 'span'`、getAttrs 透传 style/class），把垃圾当合法内容收进来；② 拆解顺序问题——`<o:p>`、条件注释这类 Office 私有标签被"拆出子树"后其中的 style 级联污染后续解析。修法分两层：

  ```ts
  // 第一层：粘贴 HTML 进编辑器前先做 DOM 白名单清洗（编辑器 props）
  import { sanitizePastedHTML } from './sanitizePaste';

  const editor = useEditor({
    editorProps: {
      transformPastedHTML: (html) => sanitizePastedHTML(html), // ★ 粘贴专用管道，不影响本编辑器自身 HTML
    },
  });
  ```

  ```ts
  // src/notion-clone/sanitizePaste.ts —— DOM 白名单清洗：标签级 + 属性级
  const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'A', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
  ]);
  const DROP_WITH_SUBTREE = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'O:P']);
  const ALLOWED_ATTRS: Record<string, Set<string>> = {
    A: new Set(['href']),            // 链接只留 href（target/rel 由编辑器补）
    TD: new Set(['colspan', 'rowspan']), // 表格只留跨度
    TH: new Set(['colspan', 'rowspan']),
  };

  export function sanitizePastedHTML(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walk = (el: Element): void => {
      for (const child of Array.from(el.children)) { // 快照：改结构不影响迭代
        if (DROP_WITH_SUBTREE.has(child.tagName)) { child.remove(); continue; }
        if (!ALLOWED_TAGS.has(child.tagName)) {
          // 不在白名单：保留子树（文字不能丢），把自己拆掉；拆完重扫本层（新上来的元素还没过审）
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          walk(el);
          return;
        }
        for (const attr of Array.from(child.attributes)) {
          if (!ALLOWED_ATTRS[child.tagName]?.has(attr.name)) child.removeAttribute(attr.name); // style/class/on* 全清
        }
        walk(child);
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }
  ```

  第二层：schema 收口——每个自定义扩展的 `parseHTML` 规则加 `getAttributes` 白名单（只取需要的属性），并且永远不要透传 `style`。Excel 的"纯文本列"粘贴路径再补一条：无格式粘贴（⌘⇧V）引导或 `clipboardTextParser` 兜底。
- ⚠️ **超长文档性能（避免全量 decorations）**——症状 → 根因 → 修法：

  症状：文档几百块后，每敲一个字卡 100–300ms，且卡顿随文档长度线性增长；协同开启时更明显。根因三连：① 某插件（常见是自写的"给每块加 class/decoration"）在 `apply()` 里**每次事务都对全文档重建 DecorationSet**——O(块数)，输入又是高频事务，二者相乘；② 代码里每次 update 都 `editor.getHTML()/getJSON()`（克隆整棵树，O(n) 且产生大字符串）做副作用（同步预览/字数统计）；③ 语法高亮（lowlight）对未变化的代码块重复 parse。修法：

  ```ts
  // ① DecorationSet 的正道：增量 map + 局部重建（路线 8 的 FoldHeadings 是完整模板）
  apply(tr, value, _old, newState) {
    // 先随编辑平移，O(受影响 decoration 数)：
    let decos = value.decos.map(tr.mapping, tr.doc);
    const meta = tr.getMeta(myKey);
    if (meta?.dirtyRange) {
      // 只在"受影响的范围"重建：clear 该区间的旧 decorations，再对新区间 create
      decos = decos.remove(decos.find(meta.dirtyRange.from, meta.dirtyRange.to));
      decos = decos.add(newState.doc, buildDecosFor(newState.doc, meta.dirtyRange));
    }
    return { ...value, decos };
  }

  // ② 副作用别用 getHTML：字数统计直接数 doc
  const words = editor.state.doc.textContent.length;
  // 需要局部数据时用 nodesBetween 而不是全树克隆：
  editor.state.doc.nodesBetween(from, to, (node) => { /* 只扫区间 */ });

  // ③ 高亮缓存：以"代码块文本 hash + language"为 key 缓存 parse 结果，未变不重算
  ```

  验证方法：React Profiler + Performance 面板录一次键入，长事务应全部落在 `apply`/`DecorationSet.create` 之外；文档 500 块时单次键入的 JS 耗时应与 5 块时同数量级。

### ✅ 产出：验收清单

一个可用的类 Notion 块编辑器，逐条验收：

- [ ] 块模型：Enter/Backspace/跨块删除按行为规格表全绿（空标题转段落、列表 lift、跨块删除结构自洽三例必测）
- [ ] Markdown 速记：`# `/`- `/`1. `/`> `/`[] `/`[x] ` 全部即时转换；块中间输入不误触发；中文 IME 全程无干扰
- [ ] Slash：`/` 触发、模糊搜索（拼音/英文缩写可搜到）、↑↓ 循环高亮、Enter 执行、Esc 关闭、空 query 显示全量；点击菜单项编辑器不失焦
- [ ] 块拖拽：⠿ 悬停出现；拖拽时目标块高亮（上/下半区判定）；相邻上移/下移/远距离移动三例排序正确；列表内 Tab/Shift+Tab 嵌套升降级
- [ ] 块悬浮工具栏：⠿/＋/复制/转 H2/删除五动作正确；随滚动跟随不漂移
- [ ] 选区工具栏：选中浮出、取消隐藏；跨行选区定位正确；B/I/U/链接生效且按钮态同步
- [ ] NodeView：图片块上传进度条实时更新、上传完成 src 落文档（undo 一步可回滚整个插入）；代码块语言下拉切换后高亮即时变化；装饰控件不破坏编辑
- [ ] 嵌套与折叠：列表三层嵌套 + Backspace 逐级退出；标题折叠/展开后内容零丢失；折叠态在编辑后不错位
- [ ] 协同：双浏览器实编互见；对方光标/名字牌渲染；undo 只回滚自己的操作；断网编辑重连合入
- [ ] 粘贴：Excel 表格进来自带结构无样式污染；Word 文档粘贴白名单清洗后干净；⌘⇧V 纯文本路径可用
- [ ] 性能：500 块文档键入无可感知卡顿（Performance 面板验证无全量 DecorationSet 重建）

### 对标：TipTap 官方示例（逐个 demo 复刻）、Notion 交互逐条拆解

- **TipTap 官方示例**：本章 80% 的交互在官方文档/示例里都有可运行版本，复刻路径按依赖排序：Basic（StarterKit + 占位符）→ Markdown Shortcuts（看清 input rule 默认行为）→ Slash Commands（官方 demo 用 tippy，我们换成 floating-ui 正是理解 render 适配器的练习）→ Bubble/Floating Menu → Task List → Code Block Lowlight → Drag Handle（v2.5+ 官方扩展，对照路线 4 的手写版找差距）→ Collaboration（官方有 y-websocket 演示房间，双开浏览器即可测）。复刻纪律：**每个 demo 先抄后改**——抄通后再按 Notion 行为改判定细节，比凭空写省一个数量级时间。进阶阅读：每个 `@tiptap/extension-*` 包的源码都在几百行以内，是"如何写一个 PM 扩展"的最佳范文。
- **Notion 交互逐条拆解**：拿真 Notion 当验收基准，逐条对照——Enter 在标题/列表/待办三种块的行为、Backspace 空块三连退（待办→列表→段落→删除）、块拖拽的缩进档位提示线、选区工具栏的浮动延迟、Slash 的分组与排序。拆解方法：每个交互写三行记录（触发条件 / 预期结果 / 我的实现差在哪），这份 diff 清单就是本章的毕业答辩材料。

# Part B：SaaS 平台能力族（8/9/10 全量展开）

> 三章合称 **"SaaS 企业能力三件套"**，共同模式：**声明式配置 + 运行时注入 + 全局 Provider**。做完这三章，你就懂了企业级 SaaS 前端的"平台层"和"业务层"如何分离。

## Part B 总论：先把"共同模式"讲透，三章都只是它的实例

这三章表面上做的是三件不相干的事——权限（谁能做什么）、主题（界面长什么样）、国际化（文案说什么语言）。但如果只学三个孤立方案，你到了下一家公司的 SaaS 项目还是要重新摸索一遍。真正值得带走的是一个共同模式，这三章只是它的三次实例化。

### 模式的三个词，逐个拆开

**第一个词：声明式配置（Declarative Config）**。"声明式"的反面是"命令式"。命令式的权限代码是 `if (user.canExport) showButton()`——把"谁有权限"的知识散落在几百个组件里；声明式则是一份**数据**：

```ts
// 权限的声明式配置：它只是一份可序列化的数据，不是代码
const accessConfig = {
  roles: {
    operator: ['order:read', 'order:export'],
    admin:    ['order:*', 'refund:audit'],
  },
};
```

同样，主题的声明式配置是 `{ brand: { primary: '#0A7CFF' }, radius: { card: 12 } }`，语言包是 `{ 'order.export': '导出订单' }`。它们共同的特征：**JSON 可序列化、可存数据库、可由运营后台修改、可不发版下发**。这是 SaaS 的商业需求倒逼出来的技术形态——租户 A 要绿色主题、租户 B 的管理员要英文界面、某客户临时收回导出权限，这些都不可能等一个前端发版。

**第二个词：运行时注入（Runtime Injection）**。配置是数据，数据必须在**运行时**变成界面可用的东西，这个转变过程叫注入。权限码数组注入成 `Set<string>`、主题 schema 注入成一批 CSS 变量、语言包合并进 i18n 实例。注入这个动作有三个关键属性：一是**时机**（登录后、切换租户后、运营下发变更后都会再注入一次）；二是**幂等**（同一份配置注入两次结果相同，否则热更新就会错乱）；三是**有 normalize 层**（远端数据不可信，要补默认值、做校验，坏数据不能打挂整个应用）。

**第三个词：全局 Provider**。注入后的运行时结构放在哪？React 的答案只有一个：Context。因为这三样东西都是"全局单例语义"——当前用户是谁、当前租户什么主题、当前什么语言，整个应用在任一时刻只有一份真相。Provider 之下所有组件通过 hook 消费（`usePermission()` / `useTheme()` / `useTranslation()`），**组件永远不直接碰远端接口**——它拿到的永远是"已经注入完成的运行时结构"。

### 抽象的注入流程图

```text
┌─────────────────────────────────────────────────────────────────┐
│                        平台层（写一次，全公司复用）                  │
│                                                                 │
│  ① 声明式配置（数据，可来自构建期常量 / 远端运营后台 / 租户定制）      │
│        permissionCodes.ts / tenant-theme.json / zh-CN.json      │
│                        │                                        │
│                        ▼                                        │
│  ② 拉取与合并（默认值兜底 + 远端覆盖 + schema 校验，产出规范结构）    │
│        fetchXxx() + normalizeXxx()                              │
│                        │                                        │
│                        ▼                                        │
│  ③ 运行时结构（幂等转换：数组→Set、schema→CSS 变量批、包→i18n 实例） │
│                        │                                        │
│                        ▼                                        │
│  ④ 全局 Provider（Context 挂载，就绪前 Suspense 挡住业务组件）      │
│        <AuthProvider> <ThemeProvider> <I18nProvider>            │
│                        │  context value 向下广播                 │
├────────────────────────┼────────────────────────────────────────┤
│                        ▼          业务层（每个页面各写各的）         │
│                                                                 │
│  ⑤ 声明式消费：useXxx() hook ／ <Can>、<ThemedCard>、<Trans> 组件   │
│     业务组件只说"我要什么"，不说"它从哪来、怎么算出来的"              │
└─────────────────────────────────────────────────────────────────┘
```

这张图的分界线（⑤ 上面那条横线）就是"平台层与业务层分离"的物理位置。分离的含义有三条：

1. **数据流单向**：业务层永远不直接发请求拿配置，只能通过 hook 读 Provider 里的值；要改也只能调 Provider 暴露的方法（如 `refreshPermissions()`），由平台层重新走 ①→④。谁绕过 Provider 直接 `fetch('/api/permissions')`，谁就制造了第二份数据源，从此两处开始漂移。
2. **知识单向**：权限码叫什么、主题有哪些 token、文案 key 怎么命名，这些**契约**定义在平台层（通常是一份带 TS 类型的常量文件），业务层 import 它，而不是自己发明字符串。反过来平台层不知道任何具体业务页面的存在。
3. **变更隔离**：运营后台改了配置 → 只有平台层重新注入 → 业务层因 context 变化自动重渲染。业务层代码零改动，这就是"不发版生效"的实现机制。

### 抽象代码范式：任何一个"平台能力"都能套进这个模具

```tsx
// platform/PlatformFeature.ts —— 平台能力通用范式（三章共用的模具）
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** 一个平台能力的完整定义：配置长什么样、怎么拉、怎么转、怎么消费 */
export interface PlatformFeature<TConfig, TRuntime> {
  /** 构建期默认配置：远端挂了/没配的时候兜底，保证应用永远可用 */
  defaultConfig: TConfig;
  /** 拉取远端配置（登录后/租户切换后调用） */
  fetchConfig: () => Promise<TConfig>;
  /** 注入的核心：数据 → 运行时结构。必须幂等（同样输入产出同样输出） */
  normalize: (raw: TConfig) => TRuntime;
}

/** 通用的平台 Provider 工厂：三个平台能力共用这一套状态机 */
export function createPlatformProvider<TConfig, TRuntime>(
  feature: PlatformFeature<TConfig, TRuntime>,
) {
  const Context = createContext<TRuntime | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    // ready=false 表示"配置还没注入完成"，业务层会被 Suspense 挡住（坑 2 的解法）
    const [runtime, setRuntime] = useState<TRuntime | null>(
      () => feature.normalize(feature.defaultConfig), // 先注入默认值，避免首帧空白
    );

    useEffect(() => {
      let alive = true; // 防止卸载后 setState
      feature.fetchConfig().then((raw) => {
        if (alive) setRuntime(feature.normalize(raw)); // 远端到达后重新注入（幂等保证安全）
      });
      return () => { alive = false; };
    }, []);

    return <Context.Provider value={runtime}>{children}</Context.Provider>;
  }

  /** 业务层唯一的消费入口：拿不到值时 throw，交给最近的 Suspense 兜底 */
  function useRuntime(): TRuntime {
    const value = useContext(Context);
    if (value === null) {
      throw new Error('PlatformProvider 未挂载：请检查应用入口的 Provider 嵌套顺序');
    }
    return value;
  }

  return { Provider, useRuntime, Context };
}
```

这个 80 行的模具，接下来三章各实例化一次：权限章的 `TRuntime` 是 `Set<PermissionCode>`，主题章是 `Record<cssVarName, string>`，i18n 章是合并后的 messages 对象。读懂这个范式，三章的骨架你就都懂了，剩下的是各章特有的难点（权限的粒度分级、主题的 CSS 变量体系、语言包的合并策略）。

### 三章实例化对照表

| | 场景 8 权限 | 场景 9 主题 | 场景 10 国际化 |
|---|---|---|---|
| 声明式配置 | 权限码表 + 角色定义 | `{ brand, logo, radius, font }` | 静态基线包 + 远端覆盖包 |
| 配置来源 | 登录接口返回 / 角色管理后台 | 租户运营后台 | 翻译平台 CMS |
| 运行时结构 | `Set<PermissionCode>` | CSS 变量批（+ antd token） | i18next 实例的 resources |
| Provider | AuthProvider | ThemeProvider | I18nProvider |
| hook 消费 | `usePermission().has(...)` | `useTheme().token(...)` | `useTranslation().t(...)` |
| 声明式组件 | `<Can I a>` | `<ThemedXxx>`（组件内部消费语义 token） | `<Trans>` |
| 动态变更 | 切角色热更新 / 权限下发 | 运营改主题不发版生效 | 切语言不刷新 |
| 就绪前表现 | Suspense + 骨架屏 | 骨架屏 + 首屏变量内联 | Suspense + 默认语言 |

最后一点提醒：这三章共用模式，也共用**坑的形态**——"数据未就绪时闪烁"（权限的 403 闪现 = 主题的 FOUC = i18n 的 key 裸奔）、"字符串写错无报错"（权限码 typo = CSS 变量名 typo = i18n key typo）。所以坑的解法也是通用的：Suspense 统一挡加载态、TS 字面量类型统一管字符串契约。第 8 章会把这个解法讲透，9/10 两章直接复用。

---

## 8. 细粒度权限控制

**画像**：六个粒度——路由级 / 页面区块级 / 按钮级 / 字段级 / 数据行级 / 动作级。

这六个粒度不是并列关系，而是**从粗到细、层层递进**的关系，实现成本和收益都逐级递增。用一个订单管理页把它们全部串起来：运营专员打开 `/orders`（路由级：没有 `order:read` 直接 403）；页面里"退款审核"整块卡片看不见（页面区块级）；列表上方"导出订单"按钮置灰（按钮级）；表格里"成本价"这一列不渲染（字段级）；操作列里只有自己创建的订单才显示"编辑"（行级）；批量操作下拉里"删除"点不了（动作级）。大多数项目做到按钮级就停了，但 SaaS 多租户场景里字段级是刚需（租户 A 买了进销存模块才看得见"库存"字段），行级是协作场景刚需。本章六种粒度全做一遍，做完你对"权限"的理解会从"if 判断"升级为"一套声明式协议"。

**底线认知**：前端权限只是**体验层**（隐藏/禁用），真正安全永远在服务端。前端做的是"不给用户看他没有的能力"。

这句话必须放在一切代码之前。前端代码在用户手里：打包产物可以被反编译、网络请求可以被重放、React DevTools 可以直接改组件 state 让隐藏的按钮现形。所以前端隐藏"删除"按钮挡住的只是"不知道这条路的人"，恶意用户会直接 `curl -X DELETE /api/orders/123`——这一下必须被服务端拦住。前端权限的真实价值有三个：一是**体验**——不给用户看他没有的能力，避免"点了按钮才报 403"的挫败；二是**引导**——菜单即能力地图，用户看到的就是他能做的全部；三是**一致性**——界面元素与服务端权限口径一致，客服排查问题不用猜"他到底有没有这个权限"。面试时能把"前端权限为什么不可作为安全边界"讲清楚（隐藏 ≠ 拦截，UI 状态可被篡改，接口必须独立鉴权），比背出六个粒度更能证明你做过真实系统。

### 实现路线

1. **权限数据结构**：扁平权限码 `Set<string>`，命名规范 `资源:动作`（`order:export`）；角色只是权限集合的别名（RBAC）
2. **三件套**：AuthProvider（Context）+ `usePermission()` + 声明式组件：
```tsx
<Can I="export" a="order"><Button>导出订单</Button></Can>
```
3. **单一数据源**：一份路由表（含 `meta.permission`）同时生成三样东西——路由守卫、侧边菜单、面包屑——三处永远一致（散落维护是最大灾难）
4. 路由级：守卫组件 + 403 页面；菜单按同一权限源过滤
5. 按钮级：AuthButton 封装或 useCan hook（禁用 vs 隐藏两种策略，产品语义不同）
6. **字段级**：表格列/表单字段的 schema 挂 `permission` → 与动态表单联动（渲染时统一过滤/禁用）
7. 行级：表格操作列按行内数据判断（如 `row.ownerId === me` 才显示编辑）——这已经是 ABAC 的味道
8. 动态权限：登录拉取、切换角色热更新、权限变更事件广播
9. **与低代码联动**：物料与 schema 节点挂权限码，渲染器统一执行过滤（协议里加一维）

九条路线有依赖顺序：1 是数据地基，2 是消费基建，3 是防灾难的核心架构，4–7 是六粒度逐个落地，8 让权限活起来，9 把权限能力输出给低代码平台（《进阶大纲》§6 的渲染器）。下面逐条展开。

#### 路线 1：权限数据结构——扁平权限码、`资源:动作`、RBAC 里角色的真实定位

**是什么**：权限体系的最底层是一份"权限码清单"，每个权限码是一个 `资源:动作` 格式的字符串；角色（role）不发明新权限，只是给若干权限码起的一个别名；用户最终持有的是把他的所有角色的权限码并起来、去重后的一个扁平集合，运行时用 `Set<string>` 承载。

**为什么需要**：新手做权限最常见的三种烂起点，每一种都会在半年后崩掉——①用**布尔值数组**（`{ canRead: true, canExport: false }`）：每加一个功能加一个字段，接口协议天天改，且表达不了"订单能导出但退款不能"；②**按角色写 if**（`user.role === 'admin'`）：角色是公司组织概念，会频繁增删改名，写死在代码里意味着每次组织调整都发版；③**权限码随手命名**（`exportOrder`、`order_export`、`btn-export` 混用）：三个月后没人说得清全系统一共有多少权限、哪个和哪个是一个意思。`资源:动作` 命名 + 扁平 Set 同时解决这三个问题：资源维度对齐后端数据模型（order/refund/user），动作维度对齐 HTTP 语义（read/create/update/delete/export/audit），权限码清单可以做到前后端同一份。

**怎么做（机制分步）**：

1. 枚举出系统的资源清单和动作清单，用 TS 模板字面量类型推导出全部合法权限码（这一步同时是坑 3"typo 无报错"的解药）；
2. 定义角色：每个角色是一组权限码的别名，新增权限时只改角色定义，不改任何组件代码；
3. 登录后把用户的角色并集成 `Set<PermissionCode>`，全应用只此一份。

```ts
// src/auth/permissions.ts —— 权限码与角色定义（全系统权限契约的唯一出处）
// ---- 第一层：资源与动作的枚举。资源对齐后端数据模型，动作对齐操作语义 ----
export const RESOURCES = ['order', 'refund', 'user', 'tenant-setting', 'report', 'alert-rule'] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ['read', 'create', 'update', 'delete', 'export', 'audit'] as const;
export type Action = (typeof ACTIONS)[number];

// ---- 模板字面量类型：合法权限码 = 资源:动作，共 6×6=36 种组合的全集 ----
// 写 'order:expotr'（typo）在编译期直接红线，这是坑 3 的根治方案
export type PermissionCode = `${Resource}:${Action}`;

// ---- 第二层：角色 = 权限集合的别名。RBAC 的 R（Role）只是管理手段，不是运行时概念 ----
export type RoleKey = 'operator' | 'auditor' | 'admin' | 'viewer';

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionCode[]> = {
  // 运营专员：看订单、导出订单，不能碰退款审核
  operator: ['order:read', 'order:create', 'order:update', 'order:export', 'report:read'],
  // 审核员：只管退款与告警规则，不碰订单写操作
  auditor:  ['order:read', 'refund:read', 'refund:audit', 'alert-rule:read', 'alert-rule:update'],
  // 租户管理员：本租户内全部业务权限（逐个列出而非想象中的 *，见下方"为什么不用通配符"）
  admin:    ['order:read', 'order:create', 'order:update', 'order:delete', 'order:export',
             'refund:read', 'refund:audit', 'refund:delete',
             'user:read', 'user:create', 'user:update', 'user:delete',
             'tenant-setting:read', 'tenant-setting:update',
             'report:read', 'report:export', 'alert-rule:read', 'alert-rule:update', 'alert-rule:delete'],
  // 只读访客
  viewer:   ['order:read', 'report:read'],
};

// ---- 第三层：用户持有多个角色时，并集去重。Set 天然去重，add 已存在的码是 no-op ----
export function buildPermissionSet(roleKeys: readonly RoleKey[]): ReadonlySet<PermissionCode> {
  const set = new Set<PermissionCode>();
  for (const role of roleKeys) {
    for (const code of ROLE_PERMISSIONS[role]) {
      set.add(code); // "角色只是别名"的运行时证据：此刻角色名已经消失了，只剩扁平码
    }
  }
  return set;
}

// ---- 运行时判定：O(1) 的 Set.has。权限判断是全应用调用频率最高的函数之一，
// 用数组 includes 是 O(n)，几百个权限码 × 每帧几百次判定不是免费的 ----
export function createChecker(permissions: ReadonlySet<PermissionCode>) {
  return {
    /** has 接收完整权限码：has('order:export') */
    has: (code: PermissionCode) => permissions.has(code),
    /** can 接收动作 + 资源两个参数：can('export', 'order')，声明式组件 <Can I a> 用这个 */
    can: (action: Action, resource: Resource) => permissions.has(`${resource}:${action}`),
  };
}
```

对应的登录接口 mock（后端只需要返回角色，权限码到角色的映射由这份前端契约文件定义；也可以反过来由后端直接返回展开的权限码数组，见路线 8 的讨论）：

```ts
// src/auth/api.ts —— 登录与权限拉取的 mock（替换成你项目的真实请求层）
import { buildPermissionSet, type RoleKey, type PermissionCode } from './permissions';

export interface LoginResponse {
  userId: string;
  name: string;
  tenantId: string;
  roles: RoleKey[];        // 后端只管角色；权限码展开在前端做（同表同源，见路线 8）
}

export interface AuthSnapshot {
  user: { userId: string; name: string; tenantId: string };
  roles: RoleKey[];
  permissions: ReadonlySet<PermissionCode>; // 展开后的扁平权限码集合
}

export async function login(username: string, password: string): Promise<AuthSnapshot> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then((r) => r.json()) as LoginResponse;
  return {
    user: { userId: res.userId, name: res.name, tenantId: res.tenantId },
    roles: res.roles,
    permissions: buildPermissionSet(res.roles), // 注入时机①：登录成功即展开
  };
}
```

三个设计决策的"为什么"，值得逐条想清楚：

- **为什么角色只是"别名"，运行时消失**：RBAC（Role-Based Access Control）解决的是**管理成本**问题——一千个用户 × 两百个权限码，管理员不可能逐用户逐码勾选，所以发明角色当批量操作的别名。但运行时判定只需要"这一码有没有"，跟角色无关。把 `role === 'admin'` 写进组件等于把管理概念泄漏进运行时，后患是：某天 admin 拆成 `admin-ops` 和 `admin-fin` 两角色，所有写了角色判断的组件全部失准。判定永远基于权限码，角色只在"分配权限"这一个场景出现。
- **为什么不用 `order:*` 通配符**：通配符让权限语义变成"运行时才知道的全集"——`order:*` 到底包含 6 个动作还是 7 个，取决于未来谁往 ACTIONS 里加东西。新加一个 `order:refund-audit` 动作，所有持 `order:*` 的角色瞬间获得它，这是隐式授权事故。显式列举 36 个组合虽然啰嗦，但**权限审计**（"谁能导出订单"一查便知）和**最小意外原则**值这个啰嗦。若权限码超过百个、确实需要通配符，则必须在管理后台"展开成显式码"后再下发，前端运行时仍只见扁平码。
- **为什么前端也要有这份 ROLE_PERMISSIONS 契约**：角色 → 权限码的映射放在前端文件里，意味着加权限要发版。它的好处是权限码受 TS 类型约束（typo 编译期报错）、离线可测。更大的团队通常把这个映射放后端（角色管理后台可配），登录接口直接返回展开的 `PermissionCode[]`，前端只保留类型定义。两种都合法，但**只能有一个映射源头**：如果前端有一份映射、后端又有一份，两份必然漂移——这与路线 3"单一数据源"是同一条哲学。

#### 路线 2：三件套——AuthProvider（登录拉取 + 热更新）、usePermission()、声明式 `<Can I a>`

**是什么**：权限的消费基建，三个角色分工明确——AuthProvider 持有并维护权限状态（登录拉取、热更新、事件广播）；`usePermission()` 是函数式消费入口（给事件回调、hooks 逻辑用）；`<Can I a>` 是声明式消费入口（给 JSX 用）。三者读的是同一份 context，没有第二份数据。

**为什么需要**：没有三件套时，每个页面自己 `fetch('/api/me')` 拿权限存进自己的 state——十份拷贝十个刷新时机，权限变了只有碰巧重新请求的页面知道。三件套的本质是把 Part B 总论的 Provider 范式实例化：**状态只有一份、消费只有两个入口、变更只有一个通道**。

**怎么做（机制分步）**：

1. Context 的 value 不是裸 Set，而是一个"快照 + 判定函数 + 刷新函数"的稳定对象；
2. 判定函数 `has`/`can` 用 `useCallback` 包住并依赖 permissions，保证权限热更新后所有消费组件自动重渲染；
3. 热更新 `refresh()` 覆盖式替换整个快照（不是往里 add），保证幂等与可回滚——管理员收回权限的下一毫秒，按钮就消失。

```tsx
// src/auth/AuthProvider.tsx —— 三件套之一：状态持有者
import {
  createContext, useCallback, useContext, useMemo, useState,
  type ReactNode,
} from 'react';
import {
  buildPermissionSet, createChecker,
  type Action, type PermissionCode, type Resource, type RoleKey,
} from './permissions';
import { login as apiLogin, type AuthSnapshot } from './api';

interface AuthContextValue {
  /** 当前快照。未登录时为 null——消费侧据此跳转登录页 */
  snapshot: AuthSnapshot | null;
  /** 权限未就绪（未登录或正在刷新）时为 false，消费侧用于骨架屏（坑 2） */
  ready: boolean;
  /** 判定：完整权限码。任意字符串调用点请先想办法拿到 PermissionCode 类型 */
  has: (code: PermissionCode) => boolean;
  /** 判定：动作 + 资源。<Can I a> 内部就是它 */
  can: (action: Action, resource: Resource) => boolean;
  /** 热更新入口：重新拉取当前用户权限，覆盖式替换（路线 8 复用它） */
  refresh: () => Promise<void>;
  /** 登录（演示用；真实项目通常独立登录页 + 路由跳转，见路线 4） */
  signIn: (u: string, p: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot | null>(null);

  // 判定函数随快照重建：permissions 变 → 新函数引用 → 所有消费组件重渲染。
  // 空集合兜底：未登录时 has/can 返回 false 而不是抛错，页面可以在未登录状态安全渲染
  const checker = useMemo(() => createChecker(snapshot?.permissions ?? new Set<PermissionCode>()), [snapshot]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/me', { credentials: 'include' }).then(
      (r) => r.json() as Promise<{ userId: string; name: string; tenantId: string; roles?: RoleKey[] }>,
    );
    if (!res.roles) { setSnapshot(null); return; }          // 登录态失效：清空快照
    setSnapshot({                                           // 覆盖式替换：旧权限整体作废
      user: { userId: res.userId, name: res.name, tenantId: res.tenantId },
      roles: res.roles,
      permissions: buildPermissionSet(res.roles),           // 与 login 走同一个展开函数（单一逻辑源）
    });
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setSnapshot(await apiLogin(username, password));        // 注入时机①：登录
  }, []);

  const signOut = useCallback(() => setSnapshot(null), []);

  const value = useMemo<AuthContextValue>(() => ({
    snapshot, ready: snapshot !== null,
    has: checker.has, can: checker.can, refresh, signIn, signOut,
  }), [snapshot, checker, refresh, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

两个容易被忽略的要点：第一，`refresh` 是**覆盖式替换**（`setSnapshot(全新对象)`），绝不写 `setSnapshot(s => ({ ...s, permissions: 并集 }))` 之类的增量合并——增量合并会让"收回权限"永远不生效。第二，`refresh` 与 `signIn` 都调用 `buildPermissionSet` 这一个展开函数——角色到权限码的展开逻辑在代码里也只能有一份。

```tsx
// src/auth/usePermission.ts —— 三件套之二：函数式消费入口
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}

/** 页面逻辑里最常用的形态：解构出 has/can 直接调用 */
export function usePermission() {
  const { has, can, snapshot, ready } = useAuth();
  // has/can 是随权限快照重建的稳定引用，可安全放进 deps
  return { has, can, ready, user: snapshot?.user ?? null };
}
```

```tsx
// src/auth/Can.tsx —— 三件套之三：声明式消费入口
import { isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import { useAuth } from './usePermission';
import type { Action, Resource } from './permissions';

interface CanProps {
  I: Action;                          // 动作（导出/删除/审核…）
  a: Resource;                        // 资源（订单/退款/用户…）
  children: ReactNode;
  /** 无权限时的替代内容。不传 = 直接隐藏（不渲染） */
  fallback?: ReactNode;
  /** 无权限时不禁用也不隐藏，而是渲染 disabled 态子元素（需产品确认语义，见路线 5） */
  behavior?: 'hide' | 'disabled';
}

export function Can({ I, a, children, fallback = null, behavior = 'hide' }: CanProps) {
  const { can } = useAuth();
  const allowed = can(I, a);

  if (allowed) return <>{children}</>;

  // 行为一：隐藏（默认）。fallback 默认 null，即整块消失
  if (behavior !== 'disabled') return <>{fallback}</>;

  // 行为二：禁用。要求 children 是单个可接收 disabled 的元素（如 antd Button）
  if (isValidElement(children)) {
    const child = children as ReactElement<{ disabled?: boolean; style?: React.CSSProperties }>;
    return (
      <Tooltip title="暂无权限，请联系管理员">  {/* 禁用态必须告诉用户"为什么" */}
        {cloneElement(child, {
          disabled: true,
          style: { ...child.props.style, cursor: 'not-allowed' },
        })}
      </Tooltip>
    );
  }
  return <>{fallback}</>;
}
```

使用侧的对比，一眼看清两种消费入口各自的适用面：

```tsx
// src/pages/OrderListPage.tsx —— 三件套使用示意
import { Button, Modal, Table } from 'antd';
import { usePermission } from '../auth/usePermission';
import { Can } from '../auth/Can';

export function OrderListPage({ onExport }: { onExport: () => void }) {
  const { has, user } = usePermission();

  return (
    <div>
      {/* 声明式：JSX 里的按钮。读代码的人一眼看出"这个按钮要 order:export" */}
      <Can I="export" a="order">
        <Button onClick={onExport}>导出订单</Button>
      </Can>

      {/* 声明式禁用态：产品希望用户知道"有这个功能但你没权限"（升级引导场景） */}
      <Can I="delete" a="order" behavior="disabled">
        <Button danger>批量删除</Button>
      </Can>

      {/* 函数式：事件回调里。钩子给逻辑用，组件给结构用，别混 */}
      <Button
        onClick={() => {
          if (has('refund:audit')) {
            Modal.confirm({ title: '确认转入退款审核？' /* ... */ });
          } else {
            Modal.warning({ title: '你没有退款审核权限' });
          }
        }}
      >
        转审核
      </Button>

      <span>当前用户：{user?.name}</span>
    </div>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——某个页面的按钮权限永远显示/永远隐藏，清缓存也没用。根因——该页面绕过了三件套，自己 `useState` 存了一份登录时拉的权限数组，管理员热更新权限后 context 变了、它那份没变。修法——全局搜索 `useState` + `'/api/me'` 的组合，把一切局部权限状态删掉，只允许 `usePermission()` 一个入口；用 ESLint `no-restricted-imports` 把权限接口封死，除 AuthProvider 外任何文件 import 即报错。

#### 路线 3：单一数据源——一份路由表同时生成路由守卫、侧边菜单、面包屑

**是什么**：中后台的导航信息（有哪些路由、每个路由叫什么、需要什么权限、菜单归在哪个分组）只定义**一次**——一份带 `meta` 的路由配置树；路由守卫、侧边菜单、面包屑三样 UI 全部从这一份配置**派生**生成，运行时不存在任何"手工维护的第二份菜单"。

**为什么需要**：这是权限章（乃至整个 Part B）最大灾难的防范点。侧边菜单、`App.jsx` 里的路由注册、面包屑映射表，这三处天然长得像、又天然分属三个文件，几乎每个项目初期都是"复制三份各自维护"。腐化不需要恶意，只需要时间。下面先把事故推演做完，再写正确实现。

**事故推演：三处散落维护如何必然导致"菜单可见但点击 403"**

设项目初期 `App.tsx`（路由）、`SideMenu.tsx`（菜单）、`Breadcrumb.tsx`（面包屑映射）三处各自维护：

```text
第 1 周（初始一致）：
  路由：/orders          meta 无权限要求
  菜单：[「订单管理」→ /orders]
  面包屑：{ '/orders': ['订单管理'] }
  三处一致 ✓

第 6 周（需求：订单页仅运营可见）：
  开发 A 改了路由守卫：/orders 需要 order:read
  忘了改菜单——菜单对所有角色仍然渲染「订单管理」
  viewer 角色点击菜单 → 守卫拦截 → 403 页面
  ★ 事故形态一：菜单可见但路由 403（用户视角：系统坏了）

第 12 周（需求：新增「退款审核」页面）：
  开发 B 在菜单里加了「退款审核」，路由注册漏了
  所有人点击菜单 → 白屏（匹配不到路由）
  ★ 事故形态二：菜单可见但路由不存在

第 20 周（权限回收）：
  管理员收回某角色 order:export，页面按钮热更新消失了 ✓
  但路由级权限没人记得同步——/orders/export 页面裸奔
  ★ 事故形态三：按钮藏了、页面还在（靠 URL 直达）

第 26 周（改名）：
  产品把「订单管理」改成「订单中心」
  菜单改了，面包屑映射漏改 → 同一页面菜单叫「订单中心」、面包屑叫「订单管理」
  ★ 事故形态四：同一页面两个名字（客服截图排查时对不上口径）
```

四起事故没有一起来自"笨"，全部来自**同一信息存在 N 份拷贝**。信息 duplicated，不一致只是时间问题——这就是"散落维护是最大灾难"的准确含义：它不是可能出事，而是必然出事，且每起事故都发生在用户最常走的路径上。修法不是"加强 code review"（人守不住结构性缺陷），而是**消灭拷贝**：信息只写一次，其余全是派生。

**怎么做（机制分步）**：

1. 定义 `RouteConfig`（含 `meta.permission` / `meta.title` / `meta.icon` / `meta.hideInMenu`），这是唯一数据源；
2. `generateRoutes(configs, has)`：权限过滤 + 懒加载 + 守卫包装 → 交给 router；
3. `generateMenu(configs, has)`：树形化 + 权限过滤 + `hideInMenu` 过滤 → antd Menu items；
4. `generateBreadcrumb(configs, pathname)`：按路径拆段回查配置树 → 面包屑数据。

```ts
// src/router/routes.ts —— 唯一数据源：路由配置树（权限、标题、图标全在这里声明一次）
import * as React from 'react';
import type { ReactNode } from 'react';
import type { PermissionCode } from '../auth/permissions';
import { OrderIcon, RefundIcon } from './icons';

export interface RouteMeta {
  /** 菜单与面包屑共用的标题——改这里，两处同步变 */
  title: string;
  /** 路由级权限码。省略 = 登录即可访问（如首页、个人设置） */
  permission?: PermissionCode;
  /** 菜单图标（仅菜单消费，路由/面包屑无视它） */
  icon?: ReactNode;
  /** true = 出现在路由里但不进菜单（详情页、编辑页挂在子路由） */
  hideInMenu?: boolean;
  /** true = 菜单分组标题（自身不是路由，仅组织菜单结构） */
  groupHeader?: boolean;
}

export interface RouteConfig {
  /** 路径段（子路由写相对段 'detail'，最终由 generateRoutes 拼接） */
  path: string;
  /** 路由组件。list 页直接 import；详情等重页用 lazy */
  element?: React.LazyExoticComponent<React.ComponentType> | React.ComponentType;
  children?: RouteConfig[];
  meta: RouteMeta;
}

// 懒加载工厂：把动态 import 收口到一个函数，滚动行为统一
const lazy = (loader: () => Promise<{ default: React.ComponentType }>) =>
  React.lazy(loader) as React.LazyExoticComponent<React.ComponentType>;

export const routeConfigs: RouteConfig[] = [
  {
    path: 'dashboard', element: lazy(() => import('../pages/Dashboard')),
    meta: { title: '工作台' },                       // 无 permission = 登录即可见
  },
  {
    path: 'orders',
    meta: { title: '订单管理', icon: <OrderIcon />, permission: 'order:read' },
    children: [
      {
        path: '', element: lazy(() => import('../pages/OrderList')),   // index 路由
        meta: { title: '订单列表', permission: 'order:read' },
      },
      {
        path: 'export', element: lazy(() => import('../pages/OrderExport')),
        meta: { title: '订单导出', permission: 'order:export', hideInMenu: true },
      },
    ],
  },
  {
    path: 'refund',
    meta: { title: '退款审核', icon: <RefundIcon />, permission: 'refund:read' },
    children: [
      {
        path: '', element: lazy(() => import('../pages/RefundList')),
        meta: { title: '退款列表', permission: 'refund:read' },
      },
    ],
  },
];
```

```tsx
// src/router/generateRoutes.tsx —— 派生物 1：路由树（权限过滤 + 守卫包装）
import { Navigate, type RouteObject } from 'react-router-dom';
import type { RouteConfig } from './routes';
import { PermissionGuard } from './PermissionGuard';
import type { PermissionCode } from '../auth/permissions';

type Has = (code: PermissionCode) => boolean;

/**
 * 配置树 → react-router RouteObject 树。
 * 两层处理：先按权限过滤（没权限的子树整体不注册——URL 直达也是 403/404，防"按钮藏了页面还在"），
 * 再给需要权限的路由包守卫（父级已判过则子级复用，避免同一权限判 N 遍）。
 */
export function generateRoutes(
  configs: RouteConfig[],
  has: Has,
  /** 父链上已通过校验的权限码（父级 permission 已含子级时跳过重复包装） */
  inheritedPermission?: PermissionCode,
): RouteObject[] {
  return configs
    .filter((c) => !c.meta.permission || has(c.meta.permission)) // 过滤①：无权限的分支整棵剪掉
    .map((config) => {
      const needPermission = config.meta.permission;
      const route: RouteObject = { path: config.path };

      if (config.element) {
        const Element = config.element;
        // 守卫包装：本级有权限要求、且不是从父级继承来的，才包一层 Guard
        route.element =
          needPermission && needPermission !== inheritedPermission ? (
            <PermissionGuard permission={needPermission}>
              <Element />
            </PermissionGuard>
          ) : (
            <Element />
          );
      }
      if (config.children) {
        // 递归：子级继承父级权限（父级 order:read 已挡住的人，子级 order:read 不必再挡）
        route.children = generateRoutes(
          config.children,
          has,
          needPermission ?? inheritedPermission,
        );
        // 有 children 但没有 index element 时，默认重定向到第一个子路由
        if (!config.element && config.children.length > 0) {
          const first = config.children.find((c) => c.path === '') ?? config.children[0];
          route.element = <Navigate to={first.path} replace />;
        }
      }
      return route;
    });
}
```

```tsx
// src/router/PermissionGuard.tsx —— 守卫组件（路线 4 展开 403 策略，这里先给出本体）
import type { ReactNode } from 'react';
import { usePermission } from '../auth/usePermission';
import type { PermissionCode } from '../auth/permissions';
import { ForbiddenPage } from '../pages/ForbiddenPage';

export function PermissionGuard({
  permission, children,
}: { permission: PermissionCode; children: ReactNode }) {
  const { has, ready } = usePermission();
  if (!ready) return null;        // 权限未就绪：渲染空白，外层 Suspense 会替换成骨架（坑 2）
  if (!has(permission)) return <ForbiddenPage need={permission} />;  // 判定失败 → 403
  return <>{children}</>;
}
```

```tsx
// src/router/generateMenu.tsx —— 派生物 2：侧边菜单（同一权限源过滤 + 树形化）
import type { ItemType } from 'antd/es/menu/interface';
import type { RouteConfig } from './routes';
import type { PermissionCode } from '../auth/permissions';

type Has = (code: PermissionCode) => boolean;

/**
 * 配置树 → antd Menu items。
 * 与 generateRoutes 用同一个 has 函数、同一份配置——这就是"永远一致"的机制保证，
 * 不是"人肉保证"。子项全部无权限时父级整个不渲染（不出现"能点开但里面是空的"的分组）。
 */
export function generateMenu(configs: RouteConfig[], has: Has): ItemType[] {
  const items: ItemType[] = [];
  for (const config of configs) {
    // 过滤②：菜单维度。路由维度不过滤 hideInMenu（详情页要注册路由），菜单维度要过滤
    if (config.meta.hideInMenu) continue;
    if (config.meta.permission && !has(config.meta.permission)) continue;

    if (config.children?.length) {
      const children = generateMenu(config.children, has);
      if (children.length === 0) continue;            // 空分组不渲染（防"孤儿分组"）
      items.push({
        key: config.path,
        icon: config.meta.icon,
        label: config.meta.title,
        children,                                     // 有子项 → antd 渲染为 SubMenu
      });
    } else if (config.element) {
      items.push({ key: config.path, icon: config.meta.icon, label: config.meta.title });
    }
  }
  return items;
}
```

```tsx
// src/router/generateBreadcrumb.ts —— 派生物 3：面包屑（按当前路径回查配置树）
import type { RouteConfig } from './routes';

export interface Crumb { title: string; path?: string }   // 有 path = 可点击回跳

/** 深度优先查找路径段所在的配置链：'/orders/export' → [订单管理, 订单导出] 的配置链 */
function findConfigChain(
  configs: RouteConfig[], segments: string[], parentPath: string,
): { config: RouteConfig; fullPath: string }[] | null {
  for (const config of configs) {
    const fullPath = config.path === '' ? parentPath : `${parentPath}/${config.path}`;
    const [head, ...rest] = segments;
    if (config.path === head) {
      if (rest.length === 0) return [{ config, fullPath }];          // 命中叶子
      const deeper = config.children ? findConfigChain(config.children, rest, fullPath) : null;
      // 子级没匹配到也返回本级（容错：路由参数段如 /orders/:id 不在配置里，挂到最近一级）
      return deeper ? [{ config, fullPath }, ...deeper] : [{ config, fullPath }];
    }
  }
  return null;
}

/** pathname → 面包屑数据。标题永远来自同一份 meta.title，改名一处生效 */
export function generateBreadcrumb(configs: RouteConfig[], pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const chain = findConfigChain(configs, segments, '') ?? [];
  return chain.map(({ config, fullPath }, i) => ({
    title: config.meta.title,
    path: i < chain.length - 1 ? fullPath : undefined,  // 最后一段不可点
  }));
}
```

三个消费方接线——注意它们**谁也不认识谁**，都只认识 `routeConfigs`：

```tsx
// src/App.tsx —— 三派生物接线
import { Suspense, useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Breadcrumb, Skeleton } from 'antd';
import { AuthProvider, usePermission } from './auth';
import { routeConfigs } from './router/routes';
import { generateRoutes } from './router/generateRoutes';
import { generateMenu } from './router/generateMenu';
import { generateBreadcrumb } from './router/generateBreadcrumb';
import { useLocation } from 'react-router-dom';

function Shell() {
  const { has } = usePermission();
  const location = useLocation();

  // 权限变化（登录/热更新）→ 三个 useMemo 重算 → 路由重建、菜单重渲染、面包屑重取，天然同步
  const routes = useMemo(() => generateRoutes(routeConfigs, has), [has]);
  const menuItems = useMemo(() => generateMenu(routeConfigs, has), [has]);
  const crumbs = useMemo(() => generateBreadcrumb(routeConfigs, location.pathname), [location.pathname]);
  const router = useMemo(() => createBrowserRouter([{ path: '/', children: routes }]), [routes]);

  return (
    <Layout>
      <Layout.Sider>
        <Menu items={menuItems} mode="inline" />
      </Layout.Sider>
      <Layout>
        <Breadcrumb items={crumbs} />
        <Layout.Content>
          <Suspense fallback={<Skeleton active />}>
            <RouterProvider router={router} />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ConfigProvider>
  );
}
```

回看事故推演的四种形态，在这套实现里的结局：菜单与路由**同一个 has 过滤同一份配置**——形态一、二不可能发生；`order:export` 页面的权限就在 `/orders/export` 的 `meta.permission` 里，路由生成时整棵剪枝——形态三不存在；面包屑标题就是 `meta.title` 本身——形态四不存在。信息只写一次，不一致就失去了存在的物理基础。

#### 路线 4：路由级——守卫组件、403 页面的两种策略、菜单过滤

**是什么**：路由级是六粒度中最粗的一级——URL 维度的准入控制。三件事：守卫组件（未通过时渲染什么）、403 页面（给用户看什么）、菜单过滤（别让用户点进一条会被拦截的路）。

**为什么需要**：路由级权限失败的体验设计直接影响用户对系统的信任。直接渲染 `null`（白屏）用户以为系统崩了；直接 `navigate('/login')`（跳登录页）用户以为登录态丢了；正确的做法是明确告诉他"你没有权限 + 这个权限叫什么 + 找谁能开"。

**怎么做**：守卫组件在上文已给出，这里补全 403 页面与"拦截 vs 重定向"的策略选择。

```tsx
// src/pages/ForbiddenPage.tsx —— 403 页面：说清楚三件事（没有权限、权限是什么、找谁）
import { Result, Button } from 'antd';
import type { PermissionCode } from '../auth/permissions';
import { usePermission } from '../auth/usePermission';

const PERMISSION_LABELS: Partial<Record<PermissionCode, string>> = {
  'order:export': '导出订单',
  'refund:audit': '退款审核',
  'order:read': '查看订单',
};

export function ForbiddenPage({ need }: { need: PermissionCode }) {
  const { user } = usePermission();
  return (
    <Result
      status="403"
      title="403"
      subTitle={`你没有「${PERMISSION_LABELS[need] ?? need}」权限。当前账号：${user?.name ?? '未知'}。如需开通，请联系租户管理员。`}
      extra={<Button type="primary" onClick={() => history.back()}>返回上一页</Button>}
    />
  );
}
```

两种拦截策略的取舍：

| 策略 | 实现 | 适用 |
|---|---|---|
| **渲染 403**（上文实现） | Guard 渲染 `<ForbiddenPage>` | 菜单已过滤、用户通过 URL 直达才触发——说明用户在主动探测，明确告知 403 最诚实 |
| **重定向回首页** | Guard 渲染 `<Navigate to="/dashboard" replace />` | 菜单入口收起、用户从收藏夹/历史记录进入——他并非有意越权，弹 403 反而惊吓 |

菜单过滤已在 `generateMenu` 实现，补充一个产品细节：**被过滤掉的菜单要不要留占位**？一般不留（菜单即能力地图），但"付费功能"例外——租户没购买的模块在菜单里展示带"付费"角标的禁用项，点击跳购买页，这是 SaaS 的转化设计。技术上它不是权限过滤，而是 `meta` 加 `marketing?: { badge: string; link: string }` 字段、`generateMenu` 不按权限过滤而按 marketing 渲染禁用态——同一个机制，两套产品语义，别混在 `permission` 字段里。

#### 路线 5：按钮级——AuthButton 封装 vs useCan hook；禁用 vs 隐藏的产品语义

**是什么**：按钮级（动作级）是权限落到 UI 的最常见粒度。两种封装形态——组件封装（`<AuthButton I a>`）和 hook（`useCan(action, resource)` 返回 boolean）；两种无权限表现——禁用（disabled + 提示）和隐藏（不渲染）。

**为什么需要**：按钮级权限是散落 `if` 的重灾区（坑 1 的主战场）。封装的意义不只是少写代码，更是把"禁用 vs 隐藏"这个**产品决策**从随手行为升级为显式声明——两种表现对用户的沟通完全不同。

**怎么做**：hook 形态其实就是 `usePermission().can`，包一层语义化：

```tsx
// src/auth/useCan.ts —— hook 形态：逻辑里用
import { usePermission } from './usePermission';
import type { Action, Resource } from './permissions';

export function useCan(I: Action, a: Resource): boolean {
  return usePermission().can(I, a);
}
```

```tsx
// src/auth/AuthButton.tsx —— 组件形态：结构里用（基于 antd Button 的薄封装）
import { Button, Tooltip, type ButtonProps } from 'antd';
import { usePermission } from './usePermission';
import type { Action, Resource } from './permissions';
import type { ReactNode } from 'react';

interface AuthButtonProps extends ButtonProps {
  I: Action;
  a: Resource;
  /** 默认 'hide'。选 'disabled' 时无权限渲染禁用态并带解释气泡 */
  noAccess?: 'hide' | 'disabled';
  /** 禁用态气泡文案，默认通用话术；高价值动作建议写具体引导（如"升级行政版可解锁"） */
  disabledReason?: ReactNode;
}

export function AuthButton({ I, a, noAccess = 'hide', disabledReason, children, ...rest }: AuthButtonProps) {
  const { can } = usePermission();
  const allowed = can(I, a);

  if (allowed) return <Button {...rest}>{children}</Button>;
  if (noAccess === 'hide') return null;
  return (
    <Tooltip title={disabledReason ?? '暂无权限，请联系管理员'}>
      <Button {...rest} disabled>{children}</Button>
    </Tooltip>
  );
}
```

**禁用 vs 隐藏的产品语义差异**——这不是技术选择，是信息设计选择：

| | 隐藏 | 禁用 |
|---|---|---|
| 用户认知 | "系统没有这个功能" | "系统有这个功能，但我没资格" |
| 适用 | 该角色与功能完全无关（viewer 看不见"删除"） | 用户群体应该知道功能存在（试用期/降级后/待审批） |
| 营销价值 | 无 | 有——升级入口、付费引导 |
| 风险 | 功能"隐形"，用户可能反复提需求要一个已有功能 | 过多禁用让界面充满灰色，产生"这软件什么都干不了"的挫败感 |
| 判据 | 权限是**角色边界**（天然没有） | 权限是**状态门槛**（曾经有/即将有/付费可解锁） |

经验法则：管理后台内部角色差异用隐藏；商业化权限（版本差异、增值包、试用期）用禁用 + 引导文案。整页 30 个按钮全禁用是设计事故——那说明该用路由级/区块级直接隐藏整块（回到画像的粒度分级思想）。

#### 路线 6：字段级——schema 挂 permission，渲染时统一过滤/禁用（与动态表单联动）

**是什么**：表格的列定义、表单的字段 schema 里加一个 `permission?: PermissionCode` 字段，渲染层在拿到 schema 后、渲染组件前统一执行"有权限→保留；无权限→过滤或禁用"。业务代码不再出现"成本价列只有 admin 能看"的 if。

**为什么需要**：字段级是 SaaS 多租户的刚需（模块购买差异）与数据合规的刚需（薪酬字段仅 HR 可见）。它和《进阶大纲》§2 动态表单、§6 低代码渲染器是天然同盟——那些章节的 schema 协议里加一个可选维度，渲染器统一消费，权限能力就自动覆盖了所有 schema 驱动的页面。反之，如果列定义里写 `render: (_, row) => has('order:cost') && <span>{row.cost}</span>`，那么导出 Excel、搜索排序、列宽配置全都要再各自判一遍——每个消费 schema 的地方都要抄一遍 if。

**怎么做**：

1. 列/字段 schema 类型加 `permission`；
2. 写一个纯函数 `applyPermission`（schema, has, mode）→ 过滤后的 schema，`mode: 'filter' | 'disable'` 二选一（表格列默认 filter，表单字段默认 disable——列禁用没意义、字段禁用能保留布局）；
3. 渲染入口（表格组装 columns 的地方、动态表单 renderer）调一次，业务无感。

```ts
// src/schema/permissionAware.ts —— schema 级权限的统一执行器（纯函数，可单测）
import type { PermissionCode } from '../auth/permissions';

/** 表格列 schema：与《进阶大纲》§2 字段协议同构，多一维 permission */
export interface ColumnSchema {
  key: string;
  title: string;
  dataIndex: string;
  permission?: PermissionCode;   // 缺省 = 所有人可见
  /** 无权限时列内渲染占位符（仅 disable 模式使用） */
  placeholder?: string;
}

/** 表单字段 schema：直接复用动态表单协议（§2），同样多一维 */
export interface FieldSchema {
  key: string;
  label: string;
  component: 'Input' | 'Select' | 'DatePicker' | 'NumberInput';
  permission?: PermissionCode;
  disabledExpression?: string;   // §6 的表达式绑定不受影响，两维正交
}

type Has = (code: PermissionCode) => boolean;

/** 表格列：无权限直接剔除。列是"数据的投影"，禁用一列没有任何信息量 */
export function filterColumns<T extends ColumnSchema>(columns: T[], has: Has): T[] {
  return columns.filter((col) => !col.permission || has(col.permission));
}

/** 表单字段：无权限字段置为禁用占位（保留布局与"存在感"，与列的策略刻意不同） */
export function disableFields<T extends FieldSchema>(
  fields: T[],
  has: Has,
): Array<T & { disabled?: boolean; placeholder?: string }> {
  return fields.map((field) => {
    if (!field.permission || has(field.permission)) return field;  // 公开字段原样通过
    return {
      ...field,
      disabled: true,
      placeholder: field.label,  // 显示字段名但不可编辑——用户知道"这里有字段但被锁"
    };
  });
  // 注意：表单字段默认不剔除（剔除会破坏布局、用户不知道信息缺口）。真正敏感到
  // "不该让该角色知道存在"的字段（薪酬、成本），更强做法是服务端按角色下发不同 schema、
  // 甚至接口就不返回该字段——前端过滤只是体验层，这与"底线认知"一脉相承。
}
```

两个策略刻意不同的理由再强调一遍：列是"数据的投影"，一列被锁住没有任何信息量（禁用的列只会出现一排"暂无权限"），所以 `filter`；表单是"操作的入口"，字段占位告诉用户"这个属性存在但不可改"（避免用户找不到提交入口），所以 `disable`。

与动态表单渲染器的联动点（接《进阶大纲》§2 的 `FormRenderer`）：

```tsx
// src/schema/FormRenderer.tsx —— 动态表单渲染器：入口处统一执行字段权限
import { Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { usePermission } from '../auth/usePermission';
import { disableFields, type FieldSchema } from './permissionAware';

const COMPONENTS = { Input, Select, DatePicker, NumberInput: InputNumber } as const;

export function FormRenderer({ fields }: { fields: FieldSchema[] }) {
  const { has } = usePermission();
  // 唯一的权限执行点：业务页面传进来的 fields 不含任何权限逻辑
  const resolved = disableFields(fields, has);

  return (
    <Form>
      {resolved.map((field) => {
        const Cmp = COMPONENTS[field.component];
        return (
          <Form.Item key={field.key} label={field.label} name={field.key}>
            <Cmp disabled={field.disabled} placeholder={field.placeholder} />
          </Form.Item>
        );
      })}
    </Form>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——表格列被过滤了，但"导出 Excel"导出的数据里仍然带着无权查看的列。根因——导出走的是原始 `columns`/原始 rows，`filterColumns` 只作用于了渲染分支；字段级权限被实现成了"渲染级权限"。修法——把 `filterColumns` 的调用点提到"列定义的消费总入口"（渲染与导出都从同一函数取列），并在导出函数里对 `rows` 数据按同一 `permission` 维度做字段裁剪（更彻底的是后端导出接口按角色裁剪字段——再次回到底线认知）。

#### 路线 7：行级——`row.ownerId === me` 与 ABAC 的引入

**是什么**：前六种粒度判定的都是"用户能不能做某类事"，行级判定的是"用户能不能对**这一条**数据做事"——同一张表里，自己创建的订单显示"编辑"，别人的不显示。判定依据从"用户的属性（角色/权限码）"扩展到了"用户的属性 × 数据行的属性"。

**为什么需要**：协作型系统（工单、内容、CRM）里权限的最小单位是记录而非资源。"订单编辑权限"在行级世界里根本不是一个布尔值——它是 `row.ownerId === me.userId || has('order:update:all')` 这样的**谓词**。这时候纯 RBAC 表达力不够了，需要 ABAC（Attribute-Based Access Control，基于属性的访问控制）的思想：判定 = 对主体属性（谁）、资源属性（哪条数据）、动作、环境属性（几点/哪个租户）一起求值的一个函数。

**怎么做**：先写朴素实现，再看它如何自然长成 ABAC 谓词。

```tsx
// src/pages/OrderTable.tsx —— 行级权限：操作列按行判定
import { Table, Button, type ColumnsType } from 'antd';
import { usePermission } from '../auth/usePermission';
import { AuthButton } from '../auth/AuthButton';

interface OrderRow {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
}

export function OrderTable({ rows, onEdit }: { rows: OrderRow[]; onEdit: (row: OrderRow) => void }) {
  const { can, has, user } = usePermission();

  /** 行级判定谓词：主体属性（me）× 资源属性（row）× 动作。
   *  这一行就是 ABAC 的最小形态——虽然全项目可能只有这一处用到 row 属性。 */
  const canEditRow = (row: OrderRow) =>
    row.ownerId === user?.userId      // 维度一：我是这单的创建者
    || can('update', 'order');        // 维度二：我有全局编辑权（覆盖维度一）

  const columns: ColumnsType<OrderRow> = [
    { title: '订单号', dataIndex: 'id' },
    { title: '创建人', dataIndex: 'ownerName' },
    { title: '金额', dataIndex: 'amount' },
    {
      title: '操作',
      render: (_, row) => (
        // 注意：操作列的按钮不用 AuthButton——行级判定每个 row 都不同，
        // 组件级的 permission 声明表达不了行维度，必须走函数谓词
        canEditRow(row)
          ? <Button size="small" onClick={() => onEdit(row)}>编辑</Button>
          : <Button size="small" disabled title="仅创建人可编辑">编辑</Button>
      ),
    },
  ];

  return <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} />;
}
```

从 RBAC 到 ABAC 的概念阶梯，用同一个例子串起来：

- **RBAC**：`has('order:update')`——只看主体角色。"谁能编辑订单？"
- **行级 RBAC 扩展**：`has('order:update') && row.ownerId === me`——主体角色 × 资源归属。"谁能编辑**自己的**订单？"
- **ABAC**：`can(act, row, env)` 是任意谓词——主体属性（部门/职级）× 资源属性（归属/金额/状态）× 动作 × 环境（工作时间/IP 段/租户）。"金额超 10 万的订单，仅财务部门在工作时间可编辑。"

工程上不必一步跳到完整 ABAC 框架——大多数系统 90% 的行级需求就是"本人 or 管理员"二元谓词，写普通函数即可。判断升级时机：当谓词开始出现第三、第四个维度（金额阈值、部门、状态机阶段），且同类谓词复制到了五个页面，就把它收敛成一个 `canRow(action, row)` 纯函数挂进 auth 模块（参数化、可单测）——这就是 CASL 用 `conditions` 解决的问题，见本章对标段。

#### 路线 8：动态权限——登录拉取、切角色热更新、权限变更事件广播

**是什么**：权限不是登录时算一次的死数据。三个动态场景：①登录后拉取（AuthProvider 首次注入）；②用户拥有多角色时**切换当前角色**——不重登录、整树热更新；③管理员在后台改了权限，在线用户**下一秒生效**——权限变更事件广播。

**为什么需要**：SaaS 的权限是运营资产（付费随时升降级），"改权限要用户重新登录"在多租户商业场景不可接受。技术上这要求权限注入是**可重复的覆盖式操作**（路线 2 的 `refresh` 已为此设计），并且有把"变了"这件事通知到在线实例的通道。

**怎么做（机制分步）**：

1. 切角色：调接口让后端记录当前角色 → 前端 `refresh()` 覆盖快照 → `generateRoutes/generateMenu` 因 `has` 变化重算——热更新无需额外代码，这是路线 2/3 投资的回报；
2. 广播通道：优先服务端推送（SSE 足够：权限变更频率低、只需服务器→客户端单向）；降级方案 30~60s 轮询 `/api/me?version=local`；
3. 多标签页同步：BroadcastChannel 把变更广播给同源其他标签页（每页都有自己的 AuthProvider）。

```tsx
// src/auth/PermissionEvents.ts —— 权限变更的三条通道（SSE / 轮询降级 / 多标签页）
import { useEffect } from 'react';
import { useAuth } from './usePermission';

const CHANNEL_NAME = 'auth-sync';

// 模块级单例 channel：本页发送、本页不接收（BroadcastChannel 不回投给发送者自身所在对象），
// 其他标签页的同名 channel 正常接收——天然防自环
let channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

/** 挂在 AuthProvider 内部的 useEffect 里：三条通道都汇到同一个 refresh() */
export function usePermissionSync() {
  const { refresh, ready } = useAuth();
  const loggedIn = ready; // 已注入快照 = 已登录

  useEffect(() => {
    if (!loggedIn) return; // 未登录不订阅

    // ---- 通道一：SSE。服务端在管理员改权限后向该租户推 event: permission-changed ----
    const es = new EventSource('/api/permission-events');
    es.addEventListener('permission-changed', () => { void refresh(); });

    // ---- 通道二：BroadcastChannel。切角色/主动刷新的标签页广播，其他标签页收到后 refresh ----
    const onBroadcast = (e: MessageEvent) => {
      if (e.data === 'permission-changed') void refresh();
    };
    channel?.addEventListener('message', onBroadcast);

    // ---- 通道三：visibilitychange 兜底。标签页切回前台时拉一次，
    //      补上 SSE 断线/休眠期间（笔记本合盖、手机切后台）错过的变更 ----
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      es.close();
      channel?.removeEventListener('message', onBroadcast);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loggedIn, refresh]); // 登录→登出的状态翻转时重挂/卸载订阅
}

/** 供"切角色"等主动变更处调用：自己已 refresh，再把变更通知其他标签页 */
export function broadcastPermissionChanged() {
  channel?.postMessage('permission-changed');
}
```

```tsx
// src/components/RoleSwitcher.tsx —— 切角色热更新的完整闭环
import { Select, message } from 'antd';
import { useAuth } from '../auth/usePermission';
import { broadcastPermissionChanged } from '../auth/PermissionEvents';

export function RoleSwitcher() {
  const { snapshot, refresh } = useAuth();
  if (!snapshot || snapshot.roles.length <= 1) return null; // 单角色用户不显示切换器

  return (
    <Select
      defaultValue={snapshot.roles[0]}
      style={{ width: 160 }}
      options={snapshot.roles.map((r) => ({ value: r, label: r }))}
      onChange={async (role) => {
        // ① 通知后端持久化当前角色（下次登录保持）
        await fetch('/api/me/active-role', {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        // ② 覆盖式拉取新权限快照——AuthProvider 状态更新 → has 重建 →
        //    路由/菜单/按钮三级全部自动重渲染（路线 2/3 的复利）
        await refresh();
        // ③ 同步其他标签页
        broadcastPermissionChanged();
        message.success(`已切换到 ${role}，权限已生效`);
      }}
    />
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——切角色后菜单变了，但点进新角色的页面报 403，刷新浏览器又正常。根因——路由树 `generateRoutes` 的结果被 `useMemo([has])` 缓存，但 `createBrowserRouter` 的 router 实例创建在 `useMemo` 里**不会自动热替换**已挂载的 RouterProvider 的旧 router（或相反：路由重建了而守卫读的是旧 context）。修法——保证派生链每一环的依赖都包含 `has`：`routes → router` 同在一个 useMemo，或 router 用 state 持有并随 routes 重建；开发期用两个角色互相切换 20 次作为回归手测脚本。更稳的方案是不重建 router，而是守卫组件内动态判定（上文 PermissionGuard 已是如此）——路由树可以不过滤权限、只由守卫拦截，牺牲"URL 直达 404"的彻底性换取路由实例稳定，两种取舍按团队口味选，但必须选一种并全链路一致。

#### 路线 9：与低代码联动——物料与 schema 节点挂权限码，渲染器统一过滤

**是什么**：《进阶大纲》§6 的低代码平台，其协议（schema 节点）与物料注册表各加一个可选 `permission` 维度；渲染器在递归执行时统一检查——无权限的节点按配置过滤/禁用。搭建者在编辑器里配置权限，业务页面零代码获得权限能力。

**为什么需要**：低代码平台产出的页面同样有权限诉求（运营搭的活动页要按角色可见），如果渲染器不支持，搭建者只能在节点 props 里写表达式 `$auth.has('xxx')`——又回到了命令式散落。协议里加一维，是《进阶大纲》"协议驱动"哲学的标准操作：**横切能力进协议，不进业务**。

**怎么做**：

1. 物料定义（meta）加 `defaultPermission?: PermissionCode`——该物料全实例默认需要的权限（如"支付配置面板"物料挂 `tenant-setting:update`）；
2. schema 节点加 `permission?: PermissionCode | null`——`null` 显式豁免物料默认值，undefined 跟随物料；
3. 渲染器在递归渲染入口统一执行：节点权限 = `node.permission !== undefined ? node.permission : material.defaultPermission`。

```ts
// src/lowcode/permissionNode.ts —— 协议升级：节点与物料各加一维
import type { PermissionCode } from '../auth/permissions';

/** 物料注册表条目（节选自《进阶大纲》§6 物料协议） */
export interface MaterialMeta {
  type: string;
  displayName: string;
  /** 该物料的默认权限：所有实例默认需要（如支付、导出类物料）。缺省 = 无要求 */
  defaultPermission?: PermissionCode;
}

export interface SchemaNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: SchemaNode[];
  /** 节点级覆盖：设值 = 覆盖物料默认；null = 显式豁免（本实例不要权限）；undefined = 跟随物料 */
  permission?: PermissionCode | null;
}

/** 解析节点的最终生效权限——三级覆盖规则全部收口在这一个纯函数 */
export function resolveNodePermission(
  node: SchemaNode,
  materials: Record<string, MaterialMeta>,
): PermissionCode | null {
  if (node.permission !== undefined) return node.permission; // 节点显式声明优先
  return materials[node.type]?.defaultPermission ?? null;    // 否则跟物料默认；都无 = null（不设限）
}
```

```tsx
// src/lowcode/Renderer.tsx —— 渲染器：唯一的权限执行点（协议里声明，渲染器里执行）
import { useMemo } from 'react';
import { Tooltip } from 'antd';
import { usePermission } from '../auth/usePermission';
import { resolveNodePermission, type SchemaNode, type MaterialMeta } from './permissionNode';

interface RendererProps {
  node: SchemaNode;
  materials: Record<string, MaterialMeta & { component: React.ComponentType<Record<string, unknown>> }>;
  /** 无权限节点的表现，整棵渲染树统一配置（低代码平台通常由页面级配置下发） */
  noAccessMode?: 'filter' | 'disable';
}

export function Renderer({ node, materials, noAccessMode = 'filter' }: RendererProps) {
  const { has } = usePermission();

  // 判定逻辑在组件函数体顶层（不在 map 里散写）——权限语义只有一个实现点
  const effectivePermission = useMemo(
    () => resolveNodePermission(node, materials), [node, materials],
  );
  const allowed = effectivePermission === null || has(effectivePermission);

  if (!allowed && noAccessMode === 'filter') return null;  // 过滤：整棵子树消失

  const material = materials[node.type];
  if (!material) return <div>未知物料：{node.type}</div>;

  const Cmp = material.component;
  const rendered = (
    <Cmp {...(node.props ?? {})}>
      {node.children?.map((child) => (
        <Renderer key={child.id} node={child} materials={materials} noAccessMode={noAccessMode} />
      ))}
    </Cmp>
  );

  // 禁用：外层挡 pointer-events，子树完整渲染但不可交互（保留布局）
  if (!allowed && noAccessMode === 'disable') {
    return (
      <Tooltip title="当前角色无权使用该区块">
        <div style={{ pointerEvents: 'none', opacity: 0.55 }}>{rendered}</div>
      </Tooltip>
    );
  }
  return rendered;
}
```

与编辑器（搭建器）侧的分工：编辑器里**所有物料对搭建者可见**（否则没法搭页面），但属性面板显示每个节点的生效权限角标（`permission-aware` 的 Setter 又一次登场——《进阶大纲》§3 的 Setter 体系加一个 PermissionSetter，下拉选择权限码，选项来自 `RESOURCES × ACTIONS` 组合）；预览按钮提供"以某角色视角预览"，本质是把预览渲染器的 `has` 换成目标角色的 checker。这两个能力都建立在本章三件套上——权限体系先立起来，编辑器才有词可挂。

### 坑

- ⚠️ `if (hasPermission(...))` 散落百处 → 必须收敛为声明式
- ⚠️ 权限接口未返回时页面闪烁 → Suspense + 骨架
- ⚠️ 权限码字符串 typo 无报错 → TS 字面量联合类型约束权限码

**坑 1｜`if (hasPermission(...))` 散落百处（症状 → 根因 → 修法）**

- 症状：需求"viewer 角色隐藏所有删除入口"，全文件搜索 `delete` 找到 47 处——antd Table 操作列 render 里的、AuthButton 风格的、`style={{ display: can ? ... }}` 的、事件回调里 `if (!can) return` 的，写法五花八门；改漏 3 处，两周后又被客服截图打回。更深的症状：新页面复制旧页面的 if 改一改，权限语义在复制中变异（有的判 `order:delete`、有的判角色名、有的判 `user.isAdmin` 布尔）。
- 根因：权限判定是**横切关注点**（cross-cutting concern），横切关注点用命令式写法必然散落——每个消费点都要主动"想起来"写 if，遗忘一个点就是一个漏洞。而且散落的 if 无法回答审计问题："系统里哪些地方依赖 `order:export`？"没有清单，就没有安全的权限回收。
- 修法：三层收敛，本章已全部给出——①判定收敛：只有 `usePermission()` 一个判定入口（ESLint `no-restricted-imports` 封死权限接口的散 import）；②结构收敛：JSX 里只用 `<Can I a>` / `<AuthButton I a>`（声明式，可 grep：`grep -r "I=\"export\""` 一秒列出全部导出按钮）；③协议收敛：路由级在 `meta.permission`、字段级/低代码节点在 schema 的 `permission` 维——声明在数据里，执行在生成器/渲染器的唯一入口。收敛后"回收某权限"的操作路径：权限码全局搜索 → 命中清单即全部受影响点 → 逐点产品确认 → 改一处（角色定义或 meta）。命令式到声明式的迁移可以渐进：新代码强制声明式，旧 if 按文件逐步替换，ESLint 规则 `no-restricted-syntax` 禁止新增 `hasPermission` 裸调用（允许存量）。

**坑 2｜权限接口未返回时页面闪烁（症状 → 根因 → 修法）**

- 症状：刷新页面，菜单先完整渲染（含"退款审核"），100ms 后该项消失；或页面先渲染 403 页面、权限到达后又变成正常内容——用户看到"403 → 内容"的闪变，以为进错了系统。测试环境网络快不易复现，弱网/移动端必现。
- 根因：权限是**异步数据**，但渲染没有被"权限未就绪"这个状态挡住。`ready === false` 时 `has()` 对所有码返回 false——这个兜底语义对"已确认无权限"和"尚未加载"不加区分，于是"加载中"被渲染成了"无权限"的最终 UI。
- 修法：把"未就绪"提升为一等状态，用 Suspense 统一挡住。核心手法：`has()` 对"未就绪"返回 false 是问题的根源，改成"未就绪时 throw 一个 Promise"——React 18 的 Suspense 协议会接管：最近的 `<Suspense>` 边界显示 fallback（骨架屏），权限到达（provider 状态更新）后自动恢复渲染。这样"未就绪"和"无权限"两个语义被彻底分开，前者根本轮不到 `has()` 被调用。

```tsx
// src/auth/AuthProvider.tsx —— Suspense 版 AuthProvider（完整实现，与路线 2 二选一或共存）
import {
  createContext, useCallback, useContext, useMemo, useState,
  type ReactNode,
} from 'react';
import {
  buildPermissionSet, createChecker,
  type Action, type PermissionCode, type Resource, type RoleKey,
} from './permissions';

interface UserInfo { userId: string; name: string; tenantId: string }
interface RuntimeAuth {
  user: UserInfo;
  roles: RoleKey[];
  permissions: ReadonlySet<PermissionCode>;
  has: (code: PermissionCode) => boolean;
  can: (action: Action, resource: Resource) => boolean;
}

interface AuthContextValue {
  status: 'loading' | 'ready';
  /** 首次拉取的 promise（惰性创建且永不重建）：Suspense 的抛出物 */
  bootPromise: Promise<void>;
  /** status === 'ready' 时非空 */
  runtime: RuntimeAuth | null;
  refresh: () => Promise<void>;
}

async function fetchRuntime(): Promise<RuntimeAuth | null> {
  const res = await fetch('/api/me', { credentials: 'include' }).then(
    (r) => r.json() as Promise<{ userId: string; name: string; tenantId: string; roles?: RoleKey[] }>,
  );
  if (!res.roles) return null; // 未登录
  const permissions = buildPermissionSet(res.roles);
  const { has, can } = createChecker(permissions);
  return { user: { userId: res.userId, name: res.name, tenantId: res.tenantId }, roles: res.roles, permissions, has, can };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<RuntimeAuth | null>(null);

  // useState 惰性初始化：组件首次渲染即发起请求，promise 实例只创建一次、
  // resolve 后再 throw 它 Suspense 也不会回退（React 对已 settle 的 promise 缓存语义）
  const [bootPromise] = useState(() =>
    fetchRuntime().then((r) => setRuntime(r ?? emptyRuntime())),
  );

  const refresh = useCallback(async () => {
    const next = await fetchRuntime();
    setRuntime(next ?? emptyRuntime()); // 覆盖式替换（同路线 2）
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status: runtime ? 'ready' : 'loading', bootPromise, runtime, refresh }),
    [runtime, bootPromise, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 未登录时给一个"空权限但函数可用"的运行时，消费侧永远不用判空 */
function emptyRuntime(): RuntimeAuth {
  const { has, can } = createChecker(new Set<PermissionCode>());
  return { user: { userId: '', name: '', tenantId: '' }, roles: [], permissions: new Set(), has, can };
}

/** Suspense 消费入口：未就绪时 throw promise，交给最近的 <Suspense> */
export function usePermissionSuspense(): RuntimeAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('usePermissionSuspense 必须在 <AuthProvider> 内使用');
  if (ctx.status === 'loading') throw ctx.bootPromise; // React 18 Suspense 协议
  return ctx.runtime!; // 'ready'：has/can 是权威结果，绝不闪烁
}
```

应用入口接线——Suspense 边界放在 AuthProvider 之内、Shell 之外，骨架屏与最终布局同构（侧边菜单 5~8 条灰条 + 内容区表格骨架）：

```tsx
// src/App.tsx —— 入口接线（节选）
import { Suspense } from 'react';
import { Skeleton, Layout, Menu } from 'antd';
import { AuthProvider } from './auth/AuthProvider';

function PageSkeleton() {
  return (
    <Layout>
      <Layout.Sider>
        <Skeleton active paragraph={{ rows: 8 }} />  {/* 菜单骨架 */}
      </Layout.Sider>
      <Layout.Content>
        <Skeleton active paragraph={{ rows: 6 }} />  {/* 内容区骨架 */}
      </Layout.Content>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageSkeleton />}>
        {/* Shell 内所有 usePermissionSuspense() 在权限到达前都被骨架屏挡住，403 不可能闪现 */}
      </Suspense>
    </AuthProvider>
  );
}
```

两个工程细节：一是 React 19 里可直接用 `use(ctx.bootPromise)` 替代 throw 写法，语义相同且对已 resolve 的 promise 立即同步返回；二是经验值——权限接口 P95 在 300ms 内时骨架反而造成视觉噪声，可给 fallback 包一个 200ms 延迟显示组件（`useDeferredValue` 或 CSS 动画延迟），超过 1s 再升级为进度条。同样的"未就绪挡 Suspense"模式在场景 9（主题 FOUC）与场景 10（语言包懒加载）原样重现——Part B 开头说"三章共用坑的形态"即此。

**坑 3｜权限码字符串 typo 无报错（症状 → 根因 → 修法）**

- 症状：`<Can I="expotr" a="order">` 拼错了动作，无编译错误、无运行时告警，按钮永远不显示；两周排查才发现一个字母顺序问题。或者后端下发的权限码是 `order.Export`（大小写不一致），前端永远匹配不上。
- 根因：权限码是**字符串契约**，TS 对裸 `string` 类型不做内容检查；而契约的两端（前端代码、后端数据库、运营后台配置界面）各自手打字符串，typo 概率是"人手输入次数 × 手滑率"，项目规模下必然发生。
- 修法：让权限码从"字符串"升级为"字面量联合类型"，typo 从运行时静默失败变成编译期红线。完整写法：

```ts
// src/auth/permissions.ts —— 字面量联合的完整治理链（在路线 1 基础上补全）

// 第一层：模板字面量类型（路线 1 已给）——编译期约束所有前端手写的权限码
export type PermissionCode = `${Resource}:${Action}`;
// 效果：<Can I="expotr" a="order" /> → TS2322: '"expotr"' 不能赋给 'Action'

// 第二层：约束"动态拼出来的"权限码——高危点是变量拼接
function openDetail(resource: string) {            // ← string 类型：拼出来的码不受约束！
  return `detail:${resource}` as PermissionCode;   // ← as 断言更是自欺欺人
}
// 修法：入参用 Resource 类型，拼接自然落在模板字面量的监督下
function openDetail2(resource: Resource): PermissionCode {
  return `${resource}:read`;                        // ✓ 合法组合才有类型
}

// 第三层：后端下发的数据无法编译期检查 → 运行时守卫 + 白名单清洗
export function isPermissionCode(v: unknown): v is PermissionCode {
  if (typeof v !== 'string') return false;
  const [resource, action] = v.split(':');
  return (RESOURCES as readonly string[]).includes(resource)
      && (ACTIONS as readonly string[]).includes(action);
}

/** 后端返回的 roles/permissions 进 Provider 前，一律过这个清洗器：
 *  非法码丢弃 + 开发期 console.error 定位（生产环境上报监控） */
export function sanitizePermissionCodes(raw: unknown[]): PermissionCode[] {
  const valid = raw.filter(isPermissionCode);
  if (import.meta.env.DEV && valid.length !== raw.length) {
    console.error('[auth] 后端下发非法权限码，已丢弃：', raw.filter((c) => !isPermissionCode(c)));
  }
  return valid as PermissionCode[];
}

// 第四层：角色定义的"完整性"检查——satisfies 让 ROLE_PERMISSIONS 既保留字面量推断又接受约束检查
export const ROLE_PERMISSIONS = {
  operator: ['order:read', 'order:create', 'order:update', 'order:export', 'report:read'],
  auditor:  ['order:read', 'refund:read', 'refund:audit', 'alert-rule:read', 'alert-rule:update'],
  viewer:   ['order:read', 'report:read'],
} satisfies Record<string, readonly PermissionCode[]>;
// 写 'order:expotr' → 编译错误；且数组的元素类型被收窄为具体字面量，可用于派生 RoleKey：
export type RoleKey = keyof typeof ROLE_PERMISSIONS; // 'operator' | 'auditor' | 'viewer'
```

第四层的关键是 `satisfies`（TS 4.9+）：它比 `: Record<RoleKey, readonly PermissionCode[]>` 好在**保留字面量信息**——`keyof typeof` 能从值推导出 RoleKey，角色与权限码两个类型从同一份常量生长出来，单一数据源原则在类型层的延伸。若权限码全集以后端为准（角色后台可配），则用 codegen 把数据库导出成这份 TS 文件（CI 里跑 `npm run gen:permissions`），前端类型永远跟着后端走，typo 在生成环节被消灭。

对标：CASL（`@casl/react` 的 ability 建模思想）、蚂蚁 Pro 的 access 模型。

**CASL 的 ability 建模思想**。CASL 是前端权限库的事实标准（`@casl/ability` 核心 + `@casl/react` 绑定），它的核心抽象不是权限码，是**规则（rule）**：

```ts
// CASL 的规则：动作 × 主体 × 条件 × 字段 —— 四个维度可选地组合
import { createMongoAbility, AbilityBuilder } from '@casl/ability';

const { can, cannot, build } = new AbilityBuilder(createMongoAbility);
can('read', 'Order');                                        // 能读所有订单（≈ order:read）
can('export', 'Order', ['id', 'amount'], { ownerId: '{{user.id}}' }); // 能导出**自己的**订单的**这两个字段**
cannot('delete', 'Order');                                    // 显式拒绝（优先级高于上面的 can）
export const ability = build();
```

四点建模思想值得逐条消化，并和本章实现对镜：

1. **action × subject 替代权限码**：CASL 不拼 `order:export` 字符串，而是结构化的 `can('export', 'Order')`——顺序即语义（先动作后主体），不需要命名规范约定，也就没有分隔符/大小写之争。我们用模板字面量类型把字符串约束回安全区，CASL 用结构化从根上消灭了字符串。两者判定等价：`ability.can('export', 'Order')` ≈ `has('order:export')`。
2. **conditions 是 ABAC 的内置一等公民**：`{ ownerId: '{{user.id}}' }` 是 Mongo query 风格的条件，`ability.can('update', someOrderInstance)` 传入实例时按条件求值——路线 7 手写的 `row.ownerId === me` 谓词，CASL 声明在了规则里。代价是条件求值有运行时开销、且规则散在多处后审计难度上升；好处是行级权限不用每个页面写谓词。项目判据：行级谓词多于 5 种 → 引入 conditions 划算；只有"本人 or 管理员"→ 手写谓词更直白。
3. **fields 维度**：`can('read', 'Order', ['id', 'amount'])` 直接表达字段级白名单，`ability.can('read', order, 'costPrice')` 按字段判定——路线 6 的 `filterColumns` 换成 CASL 就是列 schema 不挂 permission、判定时问 ability。表达能力更强，但列过滤的**批量执行**（一次过滤整个 columns 数组）仍要自己写循环——库解决判定，不解决渲染策略。
4. **热更新是 `ability.update(rules)`**：CASL 的 Ability 实例可整体替换规则集并通知所有订阅者——与路线 8 的覆盖式 `refresh()` 同构。

React 绑定的消费侧（`@casl/react`，当前版本 API）：

```tsx
// Can.tsx —— CASL 官方绑定范式（与本章 <Can> 对照）
import { createContext } from 'react';
import { createMongoAbility, type MongoAbility } from '@casl/ability';
import { createContextualCan } from '@casl/react';

export type AppAbility = MongoAbility;
// 注意 default 必须给 null（@casl/react 的 Context 消费约束），否则 TS 报 defaultValue 缺失
export const AbilityContext = createContext<AppAbility | null>(null);

// createContextualCan 接收 Context.Consumer，返回绑定该 Context 的 <Can> 组件
export const Can = createContextualCan(AbilityContext.Consumer);

// 使用（App 里 <AbilityContext.Provider value={ability}> 包裹后）：
// <Can I="export" a="Order">{() => <Button>导出订单</Button>}</Can>
// children 是渲染函数（render prop）：只有判定通过才会执行，避免无权限时还渲染子树的性能浪费
```

**蚂蚁 Pro 的 access 模型**。UmiJS/Pro 体系把权限做成了约定式插件：`src/access.ts` 导出一个函数，返回"权限名 → 布尔/函数"的普通对象；框架生成 `useAccess()` hook 与 `<Access>` 组件：

```ts
// src/access.ts —— 蚂蚁 Pro 的权限定义（约定文件）
export default function access(initialState: { currentUser?: API.CurrentUser }) {
  const { currentUser } = initialState;
  return {
    canAdmin: currentUser?.role === 'admin',                    // 布尔：路由/菜单用
    canExportOrder: currentUser?.permissions?.includes('order:export'),
    canEditRow: (row: { ownerId: string }) =>                    // 函数：行级用（ABAC 由此进入）
      row.ownerId === currentUser?.userId || currentUser?.role === 'admin',
  };
}

// 路由配置直接挂 access 字段（Pro 的路由约定）：
// { path: '/orders/export', access: 'canExportOrder', component: './OrderExport' }
// 无权限时框架层拦截（可配 fallback 到 403）

// 组件内：
// const access = useAccess();
// <Access accessible={access.canExportOrder} fallback={<div>暂无权限</div>}>
//   <Button>导出订单</Button>
// </Access>
```

三个模型放在一起看，光谱就清晰了：**Pro access** 把权限定义为一堆命名布尔（最直白，团队零学习成本，但没有 `资源:动作` 的结构约束、没有行级条件建模，权限多了后 access.ts 膨胀成上百个布尔）；**CASL ability** 用结构化规则统一 RBAC/ABAC/字段级（表达力最强，但 Mongo query 条件对后端同学有门槛，且规则多了审计靠工具）；**本章实现**是两者之间的工程折中——权限码 Set 保 RBAC 的判定 O(1) 和可审计性，行级谓词用普通函数保可读性，schema 维度把权限接进低代码协议。选型建议：管理后台内部权限用 Pro 风格够用；多租户 SaaS 或需要行级/字段级组合的，用权限码或 CASL。无论选哪个，路线 3 的"单一数据源路由表"和三件套的收敛思想不变——它们与具体权限模型正交。

## 9. 多租户动态主题

**画像**：SaaS 每个租户品牌定制——色板/logo/圆角/字体，运营配置后不发版即时生效。

把这句话拆成技术指标：**色板/logo/圆角/字体**是四个可变维度（其实是一份主题 schema 的四个字段）；**运营配置**意味着修改发生在管理后台而不是代码仓库；**不发版即时生效**意味着主题数据与代码彻底解耦——运行时从远端拉取、注入、渲染，全链路没有一个 `if (tenant === 'acme')`；**每个租户**意味着同一份代码同时服务 N 套主题（并发正确性：切租户/亮暗切换时不能出现两套主题的混色帧）。它与场景 8 是同一个 Part B 模式的两次实例化：权限注入的是"能力集合"，主题注入的是"视觉常量"；Provider 消费、单一数据源、热更新的骨架完全一致，本章不再重复论证这些，专注主题特有的三个难题——**Token 分层、两个正交维度的组合、canvas 世界的同步**。

### 实现路线

1. **Design Token 三层体系**：
   - 基础 token（色板：blue-500...）
   - 语义 token（`--color-primary`、`--radius-card`）
   - 组件只消费语义 token——**这是铁律**，违反一处主题就漏一处
2. **租户主题 schema**：`{ brand, logo, radius, font }` → 生成器输出 CSS 变量批 + 组件库配置（antd v5 `ConfigProvider theme` 动态 token / 自研主题算法）
3. 运行时注入：`:root[data-tenant="acme"] { --color-primary: ... }` 或 JS `setProperty` 批量写
4. **亮暗模式 × 租户主题正交组合**：两个独立维度，2×2 组合都要正确（暗色下的租户品牌色可能对比度不足）
5. **FOUC 防治**：主题配置异步拉取期间用骨架屏；首屏关键变量内联（SSR 场景从 cookie 注入，服务端就知道租户）
6. echarts 等 canvas 渲染的组件读不到 CSS 变量 → 维护一份 JS 侧 token mirror 同步
7. **主题编辑器 = Setter 又登场**：给租户运营做的主题配置后台，就是一个配置可视化编辑器
8. lint 守护：stylelint 规则禁硬编码色值（漏网之鱼是主题系统的头号敌人）

八条路线的数据流全景：**租户主题 schema（运营后台产出）→ 生成器（schema → CSS 变量批 + antd token）→ 注入（data-tenant 选择器 / setProperty）→ 消费（语义 token / ConfigProvider / token mirror）**，路线 7 是这条流水线的供给侧（编辑器），路线 8 是消费侧的纪律保障。

#### 路线 1：Design Token 三层体系——为什么"组件只消费语义 token"是铁律

**是什么**：Token 是"设计决策的变量化"。三层各有职责：**基础 token 层**（palette）是原材料——`--blue-500`、`--gray-100` 这些与任何品牌无关的色阶（或一个租户的品牌色阶 `--tenant-primary-500`）；**语义 token 层**（semantic）是角色——`--color-primary`（主操作色）、`--color-bg-page`（页面底色）、`--color-text-danger`（危险文案）这些"在这个界面里承担什么职责"的命名；**组件消费层**——所有业务组件的样式里只允许出现语义 token，出现基础 token 即违规。

**为什么需要**：换主题 = 重定义"语义 → 具体值"的映射。组件只依赖语义层，映射一改全线生效；任何组件直接依赖基础层，就绕过了映射——换租户时它不换。铁律的理由不是美学，是**完备性**：主题系统是一个"全量替换"的合同，每个消费点要么在合同里（语义层），要么是合同外的钉子户。

**违反一处漏一处的具体例子**：

```css
/* 订单页的成本徽标，开发者图省事直接用了色板 token */
.cost-badge {
  color: var(--blue-500);          /* ← 违规：直接依赖基础层 */
  background: var(--color-bg-elevated); /* ✓ 合规 */
}
```

租户 Acme 品牌色是绿色，主题生成器把 `--color-primary` 重映射到 `--tenant-green-500`。上线当天全站变绿——唯独成本徽标还是蓝色。更隐蔽的变体：租户 B 同时要求"危险色改用品牌橙"，语义层有 `--color-text-danger` 可以重映射，而某处写了 `color: red`（连基础层都没走），第三种主题又漏一处。**漏的不是"一处样式"，是"主题合同的一个条款"**——这类 bug 的排查成本极高（要等每个租户各自配置后才会暴露），所以用铁律 + 路线 8 的 lint 在写代码当下拦截，而不是等租户反馈。

**怎么做**：三层的完整 CSS（默认主题作为基线，租户注入只是覆盖语义层）：

```css
/* src/theme/tokens.css —— 三层 Token 体系（默认主题基线） */

/* ========= 第一层：基础 token（色板）。只描述"有什么颜色"，不描述"用在哪" ========== */
:root {
  /* 中性灰阶 */
  --gray-50: #f7f8fa;  --gray-100: #f0f1f3; --gray-200: #e5e6eb;
  --gray-400: #a9aeb8; --gray-700: #4e5969; --gray-900: #1d2129;
  /* 品牌色阶：默认主题用蓝色系（租户注入时整组替换为 --tenant-* 系列） */
  --brand-100: #e8f3ff; --brand-300: #94c1ff; --brand-500: #0a7cff;
  --brand-600: #0064d8;  --brand-700: #004eb0;
}

/* ========= 第二层：语义 token。只描述"这个值在界面里扮演什么角色" ========== */
/* 换主题（租户/亮暗）只动这一层的映射，第一层与第三层都不动 */
:root {
  --color-primary: var(--brand-500);          /* 主操作色：主按钮、链接、选中态 */
  --color-primary-hover: var(--brand-300);
  --color-primary-active: var(--brand-700);
  --color-on-primary: #ffffff;                /* 主色上的文字（按钮字色） */
  --color-bg-page: var(--gray-50);            /* 页面底 */
  --color-bg-elevated: #ffffff;               /* 卡片/弹层底 */
  --color-bg-hover: var(--gray-100);
  --color-text: var(--gray-900);              /* 主文案 */
  --color-text-secondary: var(--gray-700);
  --color-text-disabled: var(--gray-400);
  --color-text-danger: #f53f3f;
  --color-border: var(--gray-200);
  --radius-card: 12px;                        /* 语义层不只颜色：圆角/间距同体系 */
  --radius-button: 6px;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 6%);
}

/* ========= 第三层：组件消费。业务样式只写语义 token ========== */
/* 好的组件库也这么做——自研组件的样式文件里搜不到任何 --brand-* / --gray-* / 裸色值 */
.order-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.order-card__export-btn {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-button);
}
```

命名判据可以一句话记住：**语义层命名回答"这是什么"，基础层命名回答"这是哪个"**。`--color-bg-elevated` 是"这是什么"（一个悬浮层底色），`--gray-100` 是"这是哪个"（灰阶第 100 号）。组件里问自己"我在用什么"而不是"我在用几号灰"，写出来的就自然是语义层。

#### 路线 2：租户主题 schema 与生成器——schema → CSS 变量批 + antd v5 动态 token

**是什么**：运营后台配置的是一份**业务友好的粗粒度 schema**（品牌色、logo、圆角、字体），而界面需要的是**全量语义 token**。生成器（generator）负责这个升维：从"一个品牌主色"推导出整套色阶、映射出全部语义 token，同时输出 antd v5 的 `theme` 配置让组件库一起换肤。

**为什么需要**：不能要求运营理解 30 个语义 token。也不能让每个组件自己从"品牌色"推导衍生色（hover 色、active 色、禁用色……）——推导逻辑散落到组件里，等于三层体系名存实亡。推导必须是**纯函数**：同一份 schema 永远产出同一批 token（幂等，可测试，可缓存——Part B 总论 normalize 的要求）。

**怎么做（机制分步）**：

1. 定义 schema 类型（运营后台的表单协议就是它，路线 7 的 Setter 也由它驱动）；
2. 色阶推导：从单一品牌色生成 1~10 号色阶（本教程用 HSL 亮度插值，够用且无依赖；产品级建议 OKLCH，见对标段）；
3. 语义映射：色阶 + 圆角 + 字体 → `Record<语义token名, 值>`，亮暗两套；
4. antd 接入：同一份 schema 构造 `ConfigProvider` 的 `theme`。

```ts
// src/theme/tenantTheme.ts —— 租户主题 schema 与类型
export interface TenantThemeSchema {
  /** 发布版本号：坑 3 的主角。每次发布 +1，用于缓存键与 CDN 破缓存 */
  version: number;
  brand: {
    primary: string;    // 品牌主色 hex，如 '#0ea5a4'
    secondary?: string; // 辅助色（图表第二序列等），缺省由主色推导
  };
  logo: {
    /** logo 的 CDN 相对路径；完整 URL = `${cdnBase}/tenants/{tenantId}/logo.svg?v={version}` */
    path: string;
    cdnBase?: string;
  };
  radius: { card: number; button: number };  // px
  font: { family: string; baseSize: number }; // 逻辑字号（rem 基准）
  /** 运营手工微调语义层的逃生舱：覆盖生成器对个别 token 的推导结果 */
  overrides?: Partial<Record<string, string>>;
}

/** 语义 token 名的全集（TS 字面量联合——和权限码同款治理：typo 编译期报错） */
export type SemanticTokenName =
  | '--color-primary' | '--color-primary-hover' | '--color-primary-active'
  | '--color-bg-page' | '--color-bg-elevated' | '--color-bg-hover'
  | '--color-text' | '--color-text-secondary' | '--color-text-danger'
  | '--color-border' | '--radius-card' | '--radius-button'
  | '--shadow-card' | '--font-family';

export type ThemeMode = 'light' | 'dark';
```

```ts
// src/theme/generator.ts —— 生成器核心：schema → CSS 变量批（纯函数，可单测）
import type { SemanticTokenName, TenantThemeSchema, ThemeMode } from './tenantTheme';

// ---- 步骤 1：品牌色 → 10 级色阶（HSL 亮度插值。够用的教程实现，生产建议 OKLCH） ----
function hexToHsl(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l]; // 灰色无色相
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  // h：0~360 度；s、l：0~100（百分比）。约定与 buildScale 的锚点表一致
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  s /= 100; l /= 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(p, q, h / 360 + 1 / 3))}${to(f(p, q, h / 360))}${to(f(p, q, h / 360 - 1 / 3))}`;
}

/** 从品牌主色生成 1（最浅）~10（最深）色阶：500 号 = 主色本身 */
export function buildScale(primary: string): Record<`${number}`, string> {
  const [h, s] = hexToHsl(primary); // hslToHex 的 s 约定是 0~100，此处换算
  // 手工调的亮度锚点：浅端接近白、深端可作文字色。饱和度在两端略微收敛（避免荧光浅色）
  const anchors: Record<string, number> = {
    '100': 96, '200': 90, '300': 82, '400': 70, '500': 52,
    '600': 44, '700': 36, '800': 28, '900': 20, '1000': 14,
  };
  const out: Record<string, string> = {};
  for (const [step, l] of Object.entries(anchors)) {
    const sat = s * 100 * (l > 90 ? 0.7 : 1); // 极浅端降饱和
    out[step] = hslToHex(h, sat, l);
  }
  return out;
}

// ---- 步骤 2：色阶 + schema → 语义 token 映射（亮暗两套，正交设计见路线 4） ----
export function generateCssVars(
  schema: TenantThemeSchema,
  mode: ThemeMode,
): Record<SemanticTokenName | `--tenant-brand-${number}`, string> {
  const scale = buildScale(schema.brand.primary);
  const vars: Record<string, string> = {};

  // 先输出租户色阶（基础层）：租户维度只负责"提供原材料"
  for (const [step, color] of Object.entries(scale)) vars[`--tenant-brand-${step}`] = color;

  // 再输出语义映射：mode 维度决定"原材料里选哪一号"（铁律：语义层引用基础层变量而非复制值，
  // 这样运营微调色阶时语义层自动跟随）
  if (mode === 'light') {
    vars['--color-primary'] = 'var(--tenant-brand-500)';
    vars['--color-primary-hover'] = 'var(--tenant-brand-400)';
    vars['--color-primary-active'] = 'var(--tenant-brand-600)';
    vars['--color-bg-page'] = '#f7f8fa';
    vars['--color-bg-elevated'] = '#ffffff';
    vars['--color-bg-hover'] = '#f0f1f3';
    vars['--color-text'] = '#1d2129';
    vars['--color-text-secondary'] = '#4e5969';
    vars['--color-border'] = '#e5e6eb';
  } else {
    // 暗色映射：主色取更浅一号（深底上提亮），底色翻深、文字翻浅
    vars['--color-primary'] = 'var(--tenant-brand-400)';
    vars['--color-primary-hover'] = 'var(--tenant-brand-300)';
    vars['--color-primary-active'] = 'var(--tenant-brand-500)';
    vars['--color-bg-page'] = '#101418';
    vars['--color-bg-elevated'] = '#1a2029';
    vars['--color-bg-hover'] = '#232a35';
    vars['--color-text'] = '#f2f3f5';
    vars['--color-text-secondary'] = '#a9aeb8';
    vars['--color-border'] = '#333a45';
  }
  // mode 无关的维度直接透传
  vars['--color-text-danger'] = mode === 'light' ? '#f53f3f' : '#ff6b4a';
  vars['--radius-card'] = `${schema.radius.card}px`;
  vars['--radius-button'] = `${schema.radius.button}px`;
  vars['--shadow-card'] = mode === 'light'
    ? '0 1px 2px rgb(0 0 0 / 6%)'
    : '0 1px 2px rgb(0 0 0 / 40%)';
  vars['--font-family'] = schema.font.family;

  // 逃生舱最后应用：运营的手工微调优先级最高
  return { ...vars, ...schema.overrides } as Record<SemanticTokenName | `--tenant-brand-${number}`, string>;
}
```

antd v5 的接入——同一份 schema 喂给 `ConfigProvider` 的 `theme`，让组件库与自研组件同源换肤（antd v5 的动态主题是运行时能力，`token` 变化会通过 cssinjs 重新生成样式并缓存）：

```tsx
// src/theme/AntdThemeBridge.tsx —— schema → antd v5 ConfigProvider theme
import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { TenantThemeSchema, ThemeMode } from './tenantTheme';
import { buildScale } from './generator';

export function AntdThemeBridge({
  schema, mode, children,
}: { schema: TenantThemeSchema; mode: ThemeMode; children: ReactNode }) {
  const scale = buildScale(schema.brand.primary);

  return (
    <ConfigProvider
      theme={{
        // algorithm 决定 antd 从 seed token 派生 map token 的规则：亮/暗模式的关键开关
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          // seed token：只给种子值（品牌主色/圆角/字体），色阶由 antd 的算法派生，
          // 派生结果与我们的 CSS 变量体系同源（同一 buildScale 输入）
          colorPrimary: scale['500'],
          colorInfo: scale['500'],
          borderRadius: schema.radius.button,
          fontFamily: schema.font.family,
        },
        // 组件级 token：个别组件与自研 token 对齐（antd 的 map token 名是公开契约）
        components: {
          Card: { borderRadiusLG: schema.radius.card },
          Button: { borderRadius: schema.radius.button },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
```

这里有个必须想清楚的取舍：antd 的 `colorPrimary` 是**具体色值**，绕过了 CSS 变量——切租户时 React 重渲染、cssinjs 重新生成样式，链路成立；但 antd 组件内部弹层（Modal、Select 下拉）在 v5 默认渲染在当前 React 树里（非 v4 的 body 直挂），所以同树生效。若你的项目里 antd 弹层被 `getPopupContainer` 挂去了 body 外的静态节点，要确认该节点仍在 ConfigProvider 的 hash 作用域内（antd v5 通过 className 而非 DOM 层级关联样式，一般无碍，但老项目升级时要测）。

#### 路线 3：运行时注入两法——`[data-tenant]` 选择器块 vs JS `setProperty` 批量

**是什么**：生成器产出的是 `Record<token名, 值>`，把它变成"页面真正生效的 CSS"有两条路。方法 A：拼成一段 `:root[data-tenant="acme"] { --color-primary: ...; }` 的 CSS 文本塞进 `<style>`（或由主题服务预构建成 `https://cdn/tenants/acme/theme.css` 由 `<link>` 引入）；方法 B：遍历 Record 逐个 `document.documentElement.style.setProperty(name, value)`。

**为什么需要分开讲**：两法的生效时机、缓存行为、SSR 兼容性完全不同，选错会在 FOUC（路线 5）和缓存（坑 3）上还债。先给代码再给对比。

```ts
// src/theme/inject.ts —— 两法实现
import type { SemanticTokenName, ThemeMode, TenantThemeSchema } from './tenantTheme';
import { generateCssVars } from './generator';

/** 方法 A：构造 [data-tenant] 选择器块，替换页面上专用 <style id="tenant-theme"> 的内容。
 *  优点：整批原子生效（一次 style 更新，浏览器同一帧应用全部变量——不存在半套主题的中间态）；
 *  选择器带 data-tenant，留了 CSS 层面的调试入口。 */
export function injectThemeBlock(tenantId: string, schema: TenantThemeSchema, mode: ThemeMode) {
  const vars = generateCssVars(schema, mode);
  const decls = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  const css = `:root[data-tenant="${tenantId}"][data-mode="${mode}"] {\n${decls}\n}`;
  let styleEl = document.getElementById('tenant-theme') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'tenant-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css; // 整体替换：同租户重复注入天然幂等
}

/** 方法 B：JS 逐变量 setProperty 到根元素。
 *  优点：不需要拼 CSS 字符串、对每个变量可单独控制（动画式换肤——逐个过渡时唯一选择）。
 *  缺点：N 次 DOM API 调用之间理论上存在中间态（实际上浏览器同步样式计算，一次 task 内完成，
 *  渲染前不会出现"半套主题"，但要注意别在循环里夹杂 await）。 */
export function injectThemeByJS(schema: TenantThemeSchema, mode: ThemeMode) {
  const vars = generateCssVars(schema, mode);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  // 换租户时必须先清旧值：setProperty 是覆盖式，但"上一租户有、这一租户没有"的 token 会残留
  for (const stale of Array.from(root.style)) {
    if (stale.startsWith('--') && !(stale in vars)) root.style.removeProperty(stale);
  }
  // 通知 canvas 世界同步（路线 6）
  window.dispatchEvent(new CustomEvent('theme:changed'));
}
```

两法对比与选型：

| | A：`[data-tenant]` 选择器块 | B：JS `setProperty` |
|---|---|---|
| 生效方式 | CSS 文本替换，一次原子生效 | N 次 DOM API，循环内需保证同步完成 |
| HTTP 缓存 | 可预构建成租户 CSS 文件走 CDN（`theme.css?v=版本`），二次访问零生成成本 | 配置走 API JSON，每次登录都要重算 |
| SSR 兼容 | 服务端可直接输出 `<link>` 或内联 `<style>`（渲染前生效，无 FOUC） | 必须客户端脚本执行后生效，纯 SSR 场景有闪烁窗口 |
| 属性管理 | `data-tenant`/`data-mode` 写在 `<html>` 上，选择器自动隔离 | 变量直接挂在 root 的 style 上，切租户要记得清残留 |
| 粒度 | 整批替换 | 可逐 token 操作（做颜色过渡动画的唯一选择） |

选型结论：**默认 A**（生产 SaaS 的主流做法：主题服务把生成器跑在发布时，CDN 发 CSS）；**B 作为运行时补充**——主题编辑器实时预览（未发布的 schema 没有对应 CDN 文件）、局部 token 动画（如"夜间模式渐变过渡"）。两法注入的 token 名必须同源（都来自 `generateCssVars`），否则两套注入互相打架。

#### 路线 4：亮暗模式 × 租户主题正交——2×2 组合的变量命名设计与对比度检测

**是什么**：主题有两个独立的开关——租户（tenant，N 选 1）和外观模式（mode，亮/暗 2 选 1）。**正交**的意思是：任一租户 × 任一模式都必须正确，即 2N 种组合全部要成立，而不是"每个租户调一次亮色主题就完了"。变量命名的设计目标是让两个维度**各自只写自己的那一层**，互不干扰。

**为什么需要**：非正交的典型烂法是给每个 (tenant, mode) 组合生成一整套平铺变量（`--acme-dark-primary`、`--acme-light-primary`、`--beta-dark-primary`……）——租户数 ×2 的组合爆炸，且加第 11 个租户时暗色忘了调，第 11 个租户的暗色模式就是蓝底黑字的灾难。正交设计（上文生成器已经体现）只有两步：**租户维度提供原材料（`--tenant-brand-*` 色阶），模式维度定义映射（`--color-primary` 在 light 下指向 500 号、dark 下指向 400 号）**。`--color-primary` 的最终值由两个维度共同决定，但每个维度只改自己那一层的变量：

```css
/* 维度一：租户。data-tenant 只替换基础层（原材料） */
:root[data-tenant='acme'] { --tenant-brand-400: #5eead4; --tenant-brand-500: #0ea5a4; /* ...整组色阶 */ }
:root[data-tenant='beta'] { --tenant-brand-400: #a5b4fc; --tenant-brand-500: #6366f1; /* ... */ }

/* 维度二：模式。data-mode 只替换语义映射（选材规则），不认识任何具体租户 */
:root[data-mode='light'] {
  --color-primary: var(--tenant-brand-500);
  --color-bg-page: #f7f8fa;  --color-text: #1d2129;
}
:root[data-mode='dark'] {
  --color-primary: var(--tenant-brand-400);  /* 深底提亮一号 */
  --color-bg-page: #101418;  --color-text: #f2f3f5;
}
```

2×2 验证矩阵（Acme 绿 × Beta 紫两个租户，写单测断言 `getComputedStyle` 结果）：

| | light | dark |
|---|---|---|
| acme | `--color-primary` = 绿500 ✓ | = 绿400（提亮）✓ |
| beta | = 紫500 ✓ | = 紫400 ✓ |

组合切换（同租户切模式）只改 `data-mode` 属性——CSS 变量级联自动重算，React 层甚至不用 re-render，这是把正交性做进 CSS 命名而不是 JS 状态的最大红利。

**暗色下租户品牌色对比度不足的检测**：深色底上"500 号品牌色按钮"很可能对比度不足（WCAG 要求文本对比 ≥ 4.5:1，大字号/图形 ≥ 3:1）。租户是运营随便选的颜色，**不能假设它可读**，所以生成器/编辑器必须内置检测。思路：对"主色 × 按钮文字色"和"主色 × 页面底色"两对组合各算一次对比度，不足则自动向色阶的更亮端借一档并在编辑器里提示：

```ts
// src/theme/contrast.ts —— WCAG 对比度检测与自动修正
/** 相对亮度（WCAG 2.x 定义）：先线性化 RGB，再按系数加权 */
function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); // gamma 线性化
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 对比度：(亮者+0.05) / (暗者+0.05)，范围 1~21 */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 主色在暗色底上不够亮时，沿色阶向浅端找第一个达标档位 */
export function pickAccessibleStep(
  scale: Record<string, string>,
  background: string,
  minRatio = 3,            // 图形/大字号标准；文本场景请传 4.5
): { step: string; color: string; autoAdjusted: boolean } {
  if (contrastRatio(scale['500'], background) >= minRatio) {
    return { step: '500', color: scale['500'], autoAdjusted: false }; // 本来就达标
  }
  for (const step of ['400', '300', '200', '100']) {
    if (contrastRatio(scale[step], background) >= minRatio) {
      return { step, color: scale[step], autoAdjusted: true };  // 编辑器提示"已为你提亮至 N 档"
    }
  }
  return { step: '100', color: scale['100'], autoAdjusted: true }; // 兜底：最浅档
}

// 编辑器保存前的校验（路线 7 的一环）：
// const { autoAdjusted, step } = pickAccessibleStep(buildScale(schema.brand.primary), '#101418');
// if (autoAdjusted) warning(`暗色模式下品牌色对比度不足，已自动提亮至 ${step} 档（可手动覆盖）`);
```

检测的三组关键配对别漏：主色 × 按钮文字（`--color-on-primary` 是否仍是白色？深黄品牌色上白字会挂）、主色 × 页面底（链接可读性）、文字 × 背景（正文，一般由暗色算法保证，但运营 `overrides` 可能改坏）。

#### 路线 5：FOUC 防治——异步拉取期间骨架屏、首屏关键变量内联、SSR cookie 注入

**是什么**：FOUC（Flash of Unstyled Content，无样式内容闪现）在本场景的具体形态——主题配置是异步拉的，首帧可能渲染出"默认蓝色主题"，300ms 后 Acme 的绿色变量到达、整页闪变。用户感知是"这网站是假的/被劫持了"。防治三件套：**首屏关键变量内联**（HTML 里带上默认主题的十几个关键 token，保证首帧"有主题"，只是可能不是租户主题）、**骨架屏**（租户主题到达前，强品牌区（logo、导航、主视觉）用中性骨架，不渲染带色内容）、**SSR 从 cookie 注入**（服务端就知道租户，直接把租户变量内联进 HTML，连"默认主题闪一下"都没有）。

**怎么做**：先讲清三者的适用梯度，再给 SSR 流程。

- **纯 CSR 项目**：`index.html` 的 `<head>` 里静态内联默认主题关键变量（构建时从 `generateCssVars(默认schema, 'light')` 生成），首帧即有完整默认主题；租户配置到达后 `injectThemeBlock` 覆盖语义层。闪烁从"无主题 → 租户主题"变成"默认主题 → 租户主题"，观感弱很多；再配合强品牌区骨架（logo 位给灰块）就基本无感。
- **SSR/同构项目**：请求带 `tenant_id` cookie，服务端取租户 schema、跑同一个生成器、把租户变量内联进首屏 HTML——首帧就是租户主题，零闪烁。流程：

```text
浏览器请求 GET /orders（自动带 Cookie: tenant_id=acme; theme_mode=dark）
   │
   ▼
SSR 服务端：cookie 解析 → tenantId=acme
   │  ├─ 缓存命中（Redis 按 tenantId+version）→ 直接拿生成好的变量批
   │  └─ 未命中 → 读租户主题 schema（DB/主题服务）→ generateCssVars(schema, mode)
   │
   ▼
HTML 模板 <head> 内联（渲染前生效，先于任何绘制）：
   <style>:root[data-tenant="acme"][data-mode="dark"]{ --color-primary: ...; ... }</style>
   <style>:root{ --radius-card:12px; --font-family:...; /* 全部语义 token */ }</style>
   │
   ▼
首帧 = Acme 绿 × 暗色。客户端 hydrate 后若 schema 有热更新，走路线 3 注入覆盖
```

```tsx
// server/render.tsx —— SSR 侧关键代码（Node/Express 形态，Next.js 同理放进根 layout）
import type { Request, Response } from 'express';
import { generateCssVars } from '../src/theme/generator';
import { fetchTenantTheme, type TenantThemeSchema } from './tenantThemeService'; // 读 DB/缓存

function parseCookie(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const idx = pair.indexOf('=');
      return idx === -1 ? [pair.trim(), ''] : [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()];
    }),
  );
}

export async function renderPage(req: Request, res: Response) {
  const cookie = parseCookie(req.headers.cookie ?? '');
  const tenantId = cookie['tenant_id'] ?? 'default';
  const mode = (cookie['theme_mode'] as 'light' | 'dark') ?? 'light';

  const schema: TenantThemeSchema = await fetchTenantTheme(tenantId); // 内部按 version 做 Redis 缓存
  const vars = generateCssVars(schema, mode);
  const decls = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  // 变量内联进 head；data-tenant/data-mode 同时打到 <html> 上（antd 算法开关也要这两个值）
  const html = `<!doctype html>
<html data-tenant="${tenantId}" data-mode="${mode}">
<head>
  <style>:root{${decls}}</style>
</head>
<body><div id="root"></div><script src="/app.js" defer></script></body>
</html>`;
  res.type('html').send(html);
}
```

注意两个细节：一是 CSS 变量内联后仍可能 FOUC——如果你的 JS 产物是阻塞渲染的 `<script>`（非 defer/async），把它挪走；二是 cookie 里只有 `tenant_id`，**用户未登录也能拿到租户主题**（租户由访问域名决定，`acme.app.com` → tenant=acme，比 cookie 更可靠——多租户 SaaS 通常按子域名路由，服务端从 Host 头解析，cookie 只存 mode）。

#### 路线 6：canvas 组件读不到 CSS 变量——JS 侧 token mirror 同步

**是什么**：echarts（canvas 渲染）里的颜色不会跟随 CSS 变量变。原因在渲染机制：CSS 变量的求值发生在 **CSS 级联**里，作用域是 DOM 树；而 canvas 是一张**位图**，绘图 API（`fillStyle`/`strokeStyle`）接收的是"绘制那一刻的具体颜色字符串"，传 `var(--color-primary)` 过去只会得到一个非法值或按字面量处理的黑色。换主题时 DOM 侧变量变了、canvas 已画好的像素不会自动重画。

**为什么需要 mirror（镜像）而不是每次绘制时现读**：技术上 `getComputedStyle` 确实能读到 CSS 变量的**计算值**（已解析的具体色值），所以"每次 setOption 前现读一次"可行。但图表的主题色用在几十处（坐标轴、图例、系列色、tooltip 边框……），散在各组件里现读等于"权限 if 散落"的换皮重演——收敛为一个全局 mirror 对象 + 变更事件，图表组件只订阅不取数：

```ts
// src/theme/tokenMirror.ts —— JS 侧 token 镜像：CSS 变量 → JS 常量的唯一桥梁
/** 需要暴露给 canvas/WebGL/图表世界的语义 token 清单（显式列举，而非全量复制——
 *  全量复制会在 token 改名时静默漏更，显式列举配合启动期校验零漂移） */
const MIRRORED_TOKENS = [
  '--color-primary', '--color-primary-hover',
  '--color-bg-elevated', '--color-bg-page', '--color-bg-hover',
  '--color-text', '--color-text-secondary', '--color-border',
] as const;

export type MirroredToken = (typeof MIRRORED_TOKENS)[number];
export type TokenMirror = Record<MirroredToken, string>;

/** 全局唯一镜像。图表组件从这里读色值，永不直接 getComputedStyle */
export const tokenMirror: TokenMirror = Object.fromEntries(
  MIRRORED_TOKENS.map((t) => [t, '']),
) as TokenMirror;

/** 从 CSS 重新读一遍全部镜像 token 并广播变更。注入主题（路线 3）后必须调用 */
export function syncTokenMirror(): TokenMirror {
  const computed = getComputedStyle(document.documentElement);
  for (const name of MIRRORED_TOKENS) {
    tokenMirror[name] = computed.getPropertyValue(name).trim();
  }
  window.dispatchEvent(new CustomEvent<TokenMirror>('theme:changed', { detail: { ...tokenMirror } }));
  return tokenMirror;
}
```

echarts 侧的接入——把 mirror 转成 echarts 主题并注册，图表实例订阅变更事件重绘：

```ts
// src/charts/echartsTheme.ts —— mirror → echarts 主题注册与热更新
import * as echarts from 'echarts';
import { tokenMirror, syncTokenMirror, type TokenMirror } from '../theme/tokenMirror';

/** mirror → echarts 主题对象（registerTheme 的第二参是普通对象，只声明颜色/字体的
 *  全局默认，具体图表不再写死任何颜色） */
function buildEchartsTheme(t: TokenMirror): Record<string, unknown> {
  return {
    color: [t['--color-primary'], '#94a3b8', '#f59e0b', '#10b981'], // 系列色：第一序列跟主题
    backgroundColor: 'transparent',
    textStyle: { color: t['--color-text'], fontFamily: 'inherit' },
    legend: { textStyle: { color: t['--color-text-secondary'] } },
    // 坐标轴与分隔线
    categoryAxis: {
      axisLine: { lineStyle: { color: t['--color-border'] } },
      axisLabel: { color: t['--color-text-secondary'] },
      splitLine: { lineStyle: { color: t['--color-border'] } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: t['--color-border'] } },
      axisLabel: { color: t['--color-text-secondary'] },
      splitLine: { lineStyle: { color: t['--color-border'] } },
    },
  };
}

let themeVersion = 0;
/** 注册（或重注册）主题。重注册用新名字（v+版本号）——echarts 主题注册表按名字缓存，
 *  同名覆盖对已初始化实例不生效，换名 + setOption 才会真正重算 */
export function applyEchartsTheme(): string {
  syncTokenMirror(); // 确保镜像最新（幂等）
  const themeName = `tenant-v${++themeVersion}`;
  echarts.registerTheme(themeName, buildEchartsTheme(tokenMirror));
  return themeName;
}
```

```tsx
// src/charts/ThemedChart.tsx —— 图表组件：订阅 theme:changed，自动换主题重绘
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { applyEchartsTheme } from './echartsTheme';

export function ThemedChart({ option }: { option: echarts.EChartsOption }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const themeRef = useRef<string>(''); // 主题名在 effect 里注册（渲染期不能有 getComputedStyle 副作用）

  useEffect(() => {
    if (!ref.current) return;
    themeRef.current = applyEchartsTheme(); // 初次挂载即注册主题（含一次 mirror 同步）
    chartRef.current = echarts.init(ref.current, themeRef.current); // 按主题名初始化
    return () => { chartRef.current?.dispose(); };
  }, []);

  // option 变化 → setOption
  useEffect(() => { chartRef.current?.setOption(option); }, [option]);

  // 主题变化 → dispose + 按新主题名重建（echarts 实例初始化后不能换主题，重建是官方推荐路径）
  useEffect(() => {
    const onThemeChanged = () => {
      const next = applyEchartsTheme();
      if (next === themeRef.current) return;
      themeRef.current = next;
      if (ref.current) {
        chartRef.current?.dispose();
        chartRef.current = echarts.init(ref.current, next);
        chartRef.current.setOption(option); // 重建后必须重新 setOption
      }
    };
    window.addEventListener('theme:changed', onThemeChanged);
    return () => window.removeEventListener('theme:changed', onThemeChanged);
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height: 320 }} />;
}
```

mirror 的适用面不止 echarts：SVG 图表（`fill="currentColor"` 可以吃 CSS 变量）、WebGL（three.js 材质颜色同理要 mirror）、`canvas.drawImage` 自绘仪表盘——一切"像素/绘图 API 接收具体值"的世界都靠这个模式同步。反过来的纪律：**mirror 只读不写**——JS 侧永远不要成为 token 的第二定义处。

#### 路线 7：主题编辑器 = Setter 又登场——主题配置后台的构成

**是什么**：给租户运营做的主题配置后台。论证它的身份：它就是一个**配置可视化编辑器**——《进阶大纲》§3 的 Setter 体系 + 场景 4 的"schema 工作台"（左配置 / 中实时预览 / 右源码）换了个领域。主题编辑器的"配置对象"是 `TenantThemeSchema`，"预览对象"是运行真实渲染器的预览页。

**为什么是 Setter 复用而不是新写一套**：Setter 的定义就是"某种类型的值 → 专用编辑 UI"（《进阶大纲》§3）。主题 schema 的字段类型恰好都是 Setter 覆盖过的：`brand.primary: string`（hex）→ ColorSetter（色板 + 取色器 + 对比度实时校验，路线 4 的 `pickAccessibleStep` 就是它的校验器）；`radius.card: number` → NumberSetter（滑杆 + 单位）；`font.family: string` → SelectSetter（字体选项 + 预览字形）；`logo.path: string` → UploadSetter（上传到租户 CDN，回填 URL）；`overrides` → KVSetter（token 名下拉 + 色值）。**一个新 Setter 都不用写，主题编辑器就"长"出来了**——这是搭建器族的复利在本章的兑现。

界面构成（三栏，与场景 4 同构）：

```text
┌──────────────┬───────────────────────────┬──────────────┐
│ 左：Setter   │  中：实时预览（iframe）     │ 右：源码/版本  │
│ 表单面板      │  真实页面 × 真实渲染器       │ JSON schema   │
│ ┌──────────┐ │ ┌───────────────────────┐ │ 发布历史       │
│ │主色  ●────│ │ │ [Acme 控制台演示页]     │ │ diff 对比      │
│ │圆角  ──○──│ │ │  按钮/表格/图表/空态    │ │ （场景 4 的     │
│ │字体  [下拉]│ │ │  light/dark 切换       │ │  monaco diff） │
│ └──────────┘ │ └───────────────────────┘ │               │
└──────────────┴───────────────────────────┴──────────────┘
```

关键机制是**实时预览链路**：编辑器的 schema 变更 → `generateCssVars`（与生产完全同一个生成器函数——编辑器所见即生产所得的唯一保证）→ 通过 `iframe.contentWindow.postMessage` 发给预览 iframe → 预览页收到后 `injectThemeBlock` + `syncTokenMirror`。预览页就是路线 3/6 的消费者，编辑器只是往它肚子里喂 schema：

```ts
// src/theme-editor/previewBridge.ts —— 编辑器 → 预览 iframe 的单向投递
import type { TenantThemeSchema } from '../theme/tenantTheme';

export function pushSchemaToPreview(iframe: HTMLIFrameElement, schema: TenantThemeSchema, mode: 'light' | 'dark') {
  iframe.contentWindow?.postMessage({ type: 'theme-preview', schema, mode }, '*'); // 同源部署可用具体 origin
}

// 预览页侧（iframe 内）：
// window.addEventListener('message', (e) => {
//   if (e.data?.type !== 'theme-preview') return;
//   injectThemeBlock('preview', e.data.schema, e.data.mode);
//   syncTokenMirror();  // 图表也跟着变
// });
```

版本发布按钮的语义：`schema.version + 1` → 写入主题服务 → 主题服务重建租户 CSS（若走 CDN 方案）→ 通知在线用户（BroadcastChannel/SSE，同场景 8 路线 8 的两条通道原样复用）。编辑器里的"保存草稿/发布"分离是运营后台标配——草稿只进编辑器自己看，发布才动生产。

#### 路线 8：lint 守护——stylelint 禁硬编码色值

**是什么**：路线 1 的铁律（组件只消费语义 token）靠自觉守不住，用 stylelint 的 `stylelint-declaration-strict-value` 插件把"color 类属性必须写 `var(--...)`（或合法具名值）"变成 CI 红灯。

**为什么需要**：铁律违反的成本发生在"下个租户上线时"，而违反的收益（少敲几个字符）发生在写代码当下——时间差决定了纯靠 review 必然漏。lint 把违规成本提前到提交瞬间。这就是"漏网之鱼是主题系统的头号敌人"的工程化表述。

**怎么做**：

```json
// .stylelintrc.json —— 禁硬编码色值规则
{
  "plugins": ["stylelint-declaration-strict-value"],
  "rules": {
    "scale-unlimited/declaration-strict-value": [
      ["color", "background-color", "border-color", "outline-color", "fill", "stroke", "box-shadow"],
      {
        "ignoreValues": [
          "transparent", "inherit", "currentColor",
          "none",
          "/^var\\(--/"
        ],
        "expandShorthand": true,
        "message": "禁止硬编码色值：请使用语义 token（var(--color-*)）；确需新颜色，先在 tokens.css 补 token 并说明用途"
      }
    ]
  }
}
```

配置逐项解说：`expandShorthand: true` 让 `border: 1px solid #e5e6eb` 这种简写里的颜色也被检查（默认只查完整属性名）；`ignoreValues` 白名单放行 `transparent/inherit/currentColor`（这些是"语义性"的具名值，不是硬编码）与任何 `var(--` 开头的值（合法消费）；`box-shadow` 一并纳入（阴影色是漏网高发区——暗色模式下浅色阴影在深底上会变成刺眼的亮边）。

误报的两类豁免姿势（不要用 `// stylelint-disable-line` 满天飞）：一是确实只有一处使用的装饰色（如某营销页的特效光晕）——正确姿势仍是加语义 token（`--glow-hero`），语义层就是"全站变体清单"，孤例也入册；二是第三方覆盖文件（坑 1 的 `!important` 补丁层）——单独目录 `src/theme/overrides/` 配 `"ignoreFiles": null` 之外，在根 stylelintrc 用 `overrides` 给该目录单独放宽：

```json
{
  "overrides": [
    {
      "files": ["src/theme/overrides/**/*.{css,less}"],
      "rules": {
        "scale-unlimited/declaration-strict-value": null
      }
    }
  ]
}
```

再补一条 TS 侧的守护（自研组件库走 CSS-in-JS 时 stylelint 管不到）：把语义色收敛成一个 TS 常量对象并只导出类型，组件里 `color: tokens.semantic.primary`——对 `tokens.raw.blue500` 的直接引用靠 lint 规则 `no-restricted-properties` 封死。双引擎（CSS 文件走 stylelint、JS 走 ESLint）才没有缝。

### 坑

- ⚠️ 第三方组件内联样式无法换肤
- ⚠️ 图片类资源换肤（logo 按租户 CDN 路径，非 CSS）
- ⚠️ 主题配置缓存与版本（改了主题用户看不到 → 版本号破缓存）

**坑 1｜第三方组件内联样式无法换肤（症状 → 根因 → 修法）**

- 症状：全站切到租户主题，某第三方库的日历弹层/水印组件纹丝不动保持蓝色；切暗色模式，它保持白底黑字，在暗色页面里像一块发亮的补丁。开发者工具一看，它的元素上挂着 `style="color: #1890ff"` 的内联样式。
- 根因：内联 style 属性的优先级高于任何选择器（除 `!important`），第三方库把颜色作为运行时值直接写在 DOM 的 style 上，CSS 变量体系对它天然失效。这类库内部往往维护一份 JS 常量色板，不走任何样式层。**买组件时的技术尽调项就该包括"是否支持 CSS 变量/主题 API"**——事后发现是最贵的发现时机。
- 修法：按代价从低到高四选。①**主题 API**：正规库（echarts、monaco、video.js）都有主题配置入口，用路线 6 的 token mirror 喂给它——首选；②**CSS 覆盖层**：库若用 class 而非内联（部分内联），在 `src/theme/overrides/` 里写高优先级选择器 + `!important` 强制指向语义 token，该目录豁免 stylelint（见路线 8）；③**props 传值**：React 组件库常接受 `style`/`color` props，包一层适配组件把 token mirror 的值传进去；④**换库/fork patch**：全是内联样式的库没有别的路——这也是把"主题兼容性"写进选型清单的原因。

**坑 2｜图片类资源换肤（症状 → 根因 → 修法）**

- 症状：租户主题已生效，但浏览器标签页 favicon、登录页大 logo、PDF 导出的页眉图标还是默认品牌的；或者反过来：logo 换了但缓存了 7 天，新租户主题发布后所有用户还看着旧 logo。
- 根因：**CSS 变量只管得了 CSS 渲染的属性**。logo 是 `<img src>`、favicon 是 `<link rel="icon" href>`、PDF 页眉是绘图库里的图片对象——它们换肤的唯一途径是"换 URL"，这与变量体系是两套机制。而 URL 一旦进了 CDN/浏览器缓存，"改配置"与"用户看到"之间隔着缓存 TTL。
- 修法：把图片资源纳入主题 schema 统一管理（`logo.path` 本来就在 schema 里），URL 由版本号参与拼装：

```ts
// src/theme/assets.ts —— 换肤资源 URL 的统一出口
import type { TenantThemeSchema } from './tenantTheme';

/** 资源 URL 三要素：租户隔离路径 + 版本破缓存 + 加载失败兜底 */
export function tenantAssetUrl(schema: TenantThemeSchema, tenantId: string, file: string): string {
  const base = schema.logo.cdnBase ?? 'https://cdn.example.com';
  // ?v= 每次发布变化 → CDN 与浏览器把新版本当新资源，旧缓存自然失效（坑 3 同款思路）
  return `${base}/tenants/${tenantId}/${file}?v=${schema.version}`;
}

// 消费侧：<img src={tenantAssetUrl(theme, 'acme', 'logo.svg')} onError={e => { e.currentTarget.src = '/default-logo.svg'; }} />
// favicon：<link rel="icon" href={tenantAssetUrl(theme, 'acme', 'favicon.ico')} /> —— 需用 useEffect 动态改 link 节点
```

配套两个实践：单色图标优先"CSS mask + currentColor"方案（图标 SVG 转成 mask-image，颜色走 CSS——图标就回到了变量体系内，且支持亮暗自适应）；彩色 logo 的暗色版本进 schema 二选一（`logo.path` 按 mode 出两个变体，或暗色直接用白色反色版）。

**坑 3｜主题配置缓存与版本（症状 → 根因 → 修法）**

- 症状：运营在后台把品牌色从绿改成紫、点了发布，测试同学刷新页面看到了新主题，但昨天访问过的老用户刷新后还是绿色；客服让"强刷（Cmd+Shift+R）"就好了——但不可能让全租户用户强刷。
- 根因：主题配置走了**三层缓存**——浏览器 HTTP 缓存（CDN 的 `Cache-Control: max-age`）、租户 CSS 文件的 CDN 边缘缓存、应用内的 localStorage 启动缓存（为了 FOUC 防治路线 5 里"首帧内联"的 CSR 版本，常用 localStorage 存上一份变量批）。三层里任何一层没有"发布事件"感知，改配置就到不了用户。**缓存的失效从来不能靠 TTL 到期，要靠"内容变了身份就变"**。
- 修法：给每次发布分配单调递增 `version`，让版本号参与**每一层的资源身份**：

```ts
// src/theme/themeClient.ts —— 带版本的启动加载（CSR 版）
import type { TenantThemeSchema } from './tenantTheme';

const CACHE_KEY_PREFIX = 'tenant-theme:'; // 完整键 = tenant-theme:{tenantId}:v{version}

/** 启动序列：先用缓存版本画首帧（无 FOUC），再验证最新版本（无陈旧） */
export async function loadTenantTheme(tenantId: string): Promise<{
  firstPaint: TenantThemeSchema | null;   // 立即可用的（可能陈旧）
  latest: TenantThemeSchema;              // 确认最新的
}> {
  // ① 先问"当前生效版本号"——这个轻请求必须禁缓存（时间戳参数），它是唯一不能陈旧的信息
  const { version } = await fetch(`/api/tenants/${tenantId}/theme/version?_=${Date.now()}`)
    .then((r) => r.json() as Promise<{ version: number }>);

  // ② 按版本命名的 localStorage 键：新版本 = 新键 = 旧缓存自然作废
  const key = `${CACHE_KEY_PREFIX}${tenantId}:v${version}`;
  const cached = localStorage.getItem(key);
  const firstPaint = cached ? (JSON.parse(cached) as TenantThemeSchema) : null;
  // 顺手清理旧版本的键（前缀相同但版本不同），避免 localStorage 无限膨胀
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(`${CACHE_KEY_PREFIX}${tenantId}:v`) && k !== key) localStorage.removeItem(k);
  }

  // ③ 拉全量 schema。URL 带版本 → 浏览器/CDN 缓存对新版本天然 miss，对同版本天然 hit
  const latest = await fetch(`/api/tenants/${tenantId}/theme?v=${version}`)
    .then((r) => r.json() as Promise<TenantThemeSchema>);
  localStorage.setItem(key, JSON.stringify(latest)); // 写入"版本命名"的新键

  return { firstPaint, latest };
}
```

CDN 层同理：租户 CSS 的 URL 固定为 `.../theme.css?v={version}`（发布时主题服务重算并刷新 CDN），版本号变了 URL 变了，边缘缓存对新 URL miss、回源取新文件；同版本用户继续命中旧缓存零成本。三层缓存的失效策略统一为"**版本号进身份**"这一条规则——运营点发布 → version+1 → 三层缓存同时自然过期，不需要任何"清缓存"操作。版本号的分发本身（①步）是唯一的非缓存请求，保持它轻量（只回 `{version}`）。

对标：antd v5 动态主题、Radix Colors 语义色阶设计。

**antd v5 动态主题**：v5 全面转向 cssinjs（`@ant-design/cssinjs`），主题从"构建期换 less 变量"变成"运行时换 token 配置"。它的内部机制值得借走三层思想：**Seed Token**（种子，`colorPrimary`/`borderRadius`，即路线 2 里我们喂的 `theme.token`）→ **算法**（`defaultAlgorithm`/`darkAlgorithm`/`compactAlgorithm`，从种子派生出几百个 **Map Token**——hover 色、禁用色、各组件间距；这正是我们 `buildScale` 的官方版本）→ **组件 Token**（`theme.components` 按组件微调）。性能上它用 `useCacheToken` 按"种子+算法"生成 hash 缓存派生结果——同一主题只算一次，这与"生成器必须幂等可缓存"是同一课。切暗色的正确姿势就是路线 2 代码里的 `algorithm: theme.darkAlgorithm`（暗色不是把颜色反转，而是换一套派生规则——租户品牌色交给暗色算法后自动产出暗色下的 Map Token，对比度问题它处理了大部分，路线 4 的检测兜运营选的极端色）。组件内取派生后的真实值用 `theme.useToken()`（`const { token } = antdTheme.useToken()`，返回该上下文里 `colorPrimary` 派生后的具体值）——这其实就是 antd 官方版的"token mirror"（喂 canvas 图表时正好用）。

**Radix Colors 语义色阶设计**：Radix 的 Colors 体系是"语义色阶"的教科书——每个颜色不是单值而是 **12 步色阶**，且**每一步都有固定的语义角色**：1–2 页面底色，3 组件底色/hover，4 低强调边框，5–6 常规边框，7–8 低对比文字，9 **实心背景色（品牌色的"正身"所在档）**，10 实心 hover，11 实心底上的低对比文字，12 高对比文字。它回答了本章两个悬而未决的问题：一是"`--color-primary` 的 hover/active 到底该取色阶哪一档"——按步号语义映射（9→10 作 hover），而不是凭感觉调亮度；二是"暗色模式怎么用同一体系"——Radix 每个色阶都提供 `dark` 变体（同为 12 步但明度分布重排：浅档在暗色下反而承担"高对比文字"角色），租户品牌色若要接入 Radix 风格体系，生成器应做"品牌色 → OKLCH 空间向白/黑两端插值出 12 步"（OKLCH 感知均匀，插值出来的中间色不会像 HSL 那样发灰发脏），而不是本章教程级的 HSL 亮度锚点——这是从"能跑的 demo"到"产品级主题系统"的最短升级路径。

## 10. 国际化与动态语言包

**画像**：多语言，且**语言包由运营/租户随时改，不发版生效**（静态 i18n 与动态语言包是两个难度）。

这句话里的括号是全章的题眼。"静态 i18n"是工程问题：把写死的中文换成 key，接入 react-i18next，随构建打包语言资源——一次性劳动，做完就结束。"动态语言包"是**架构问题**：语言包变成一份**运行时数据**，由运营在 CMS、租户在管理后台随时修改，立即对所有在线用户生效。它带来三个静态方案里不存在的要求：

1. **容错**：远端数据可能拉取失败、格式错误、被人误传坏包——静态包不可能坏，远端包一定会坏（不是会不会，是什么时候）；
2. **合并**：代码里还有一份随构建发布的"基线"文案，远端只是"覆盖增量"，两份如何合成一份、谁优先；
3. **观测**：文案缺失从"编译期就能发现"变成"线上运行时才暴露"，必须有缺失 key 的上报与监控闭环。

本章按"实现路线"的 9 条逐条展开，其中第 3 条（合并策略）是灵魂，密度最高；Intl/RTL/工程化各自独立成节，读完即可直接落地一套生产级方案。

### 实现路线

1. 基础：react-i18next + **ICU MessageFormat**（复数/性别/选择：`{count, plural, =0 {无订单} other {# 条订单}}`）
2. 命名空间：按页面/组件域拆包，路由级懒加载 namespace
3. **动态语言包合并策略（本章灵魂）**：
   - 静态基线包：随构建发布，**保底**
   - 远端覆盖包：CMS/翻译平台下发，**优先**
   - merge 后注入 i18n 实例；fallback 链：远端 → 基线 → key 本身 + 缺失上报（文案缺失监控面板）
4. 运行时切换语言：语言 Context，切换不刷新页面；Suspense 处理加载态；`<html lang>` 同步
5. 格式化 Intl 全家桶：日期/数字/货币/复数规则；**时区**（用户时区显示 vs 数据存储时区，两个概念）
6. 富文案：Trans 组件内嵌 JSX/链接；同名中文不同英文的上下文消歧 key
7. **RTL**：`dir="rtl"` + CSS 逻辑属性迁移（`margin-inline-start`、`text-align: start`）、方向性图标镜像
8. 工程化：key 扫描 lint（未使用/缺失）、TS 类型化 key（`as const`）、**伪语言测试**（pseudo-loc 把文案拉长 40% 提前暴露布局溢出）、翻译平台流程概念（Crowdin/Lokalise）
9. 与 schema 联动：动态表单 label 存 i18n key，渲染时翻译；切语言后 schema 表单整体重渲染

下面 10.1–10.10 与上述 9 条一一对应（路线 1 拆为 10.1/10.2 两节）。

---

#### 10.1 基础接入：react-i18next 与 t 函数

**是什么**。react-i18next 是 i18next 核心的 React 绑定：核心负责资源管理、语言切换、插值与查找；React 侧提供 `useTranslation` hook（订阅语言变化、组件级重渲染）、`Trans` 组件（富文案）、`I18nextProvider`（实例注入）。它是 React 生态事实标准，命名空间、后端加载、ICU 插件、TypeScript 类型增强等生态位全部齐备——这是相对 FormatJS/Lingui 的决定性优势。

**为什么需要**。没有 i18n 层时，文案散落在 JSX 里，"翻译"意味着逐文件人工替换，且翻译完成后没有任何机制保证"改一处两种语言同步更新"。i18n 层的本质是给每条文案一个**稳定 ID（key）**，代码只引用 ID，各语言文件按 ID 提供值——ID 与值的分离是后面一切（远端覆盖、翻译平台、类型化 key、缺失监控）的地基。

**怎么做（机制分步）**：

1. 安装：`npm i i18next react-i18next`（10.2 再加 `i18next-icu`）；
2. 建立基线语言包（随构建发布，10.4 的"保底"就是它）；
3. 模块级 `init`，把资源、默认语言、fallback 语言一次性交给 i18next；
4. 组件里 `useTranslation` 拿 `t`，按 key 渲染。

**代码示例**——完整的最小接入：

```ts
// src/i18n/index.ts —— i18n 实例：模块级单例，main.tsx 里 import 一次即可生效
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 基线包：import JSON 要求 tsconfig 开 "resolveJsonModule": true
import zhCommon from './locales/zh-CN/common.json';
import enCommon from './locales/en-US/common.json';

/** 默认命名空间，见 10.3 */
export const defaultNS = 'common' as const;

/** 项目支持的语言列表：一处定义，语言切换器 / RTL 判断 / 远端拉取都用它 */
export const SUPPORTED_LNGS = ['zh-CN', 'en-US'] as const;
export type AppLanguage = (typeof SUPPORTED_LNGS)[number];

/** 初始语言：登录用户偏好 > 浏览器语言 > 中文兜底 */
function detectInitialLanguage(): AppLanguage {
  const stored = window.localStorage.getItem('app:lng');
  if (stored && (SUPPORTED_LNGS as readonly string[]).includes(stored)) {
    return stored as AppLanguage;
  }
  const nav = window.navigator.language; // 如 "zh-CN" / "en-US" / "zh"
  const hit = SUPPORTED_LNGS.find((l) => l === nav || l.startsWith(nav));
  return hit ?? 'zh-CN';
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { common: zhCommon },
    'en-US': { common: enCommon },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'zh-CN', // 某语言缺 key 时回退到中文基线
  supportedLngs: [...SUPPORTED_LNGS],
  defaultNS,
  ns: [defaultNS],
  interpolation: {
    // React 渲染文本本身会做 XSS 转义，i18next 侧再转义一次是画蛇添足
    escapeValue: false,
  },
  react: {
    useSuspense: true, // 资源未就绪时组件走 Suspense（10.5 详述）
  },
  // fallback 链的最后一环：key 彻底找不到时返回什么（10.4 详述）
  parseMissingKeyHandler: (key) => key,
});

export default i18n;
```

```json
// src/i18n/locales/zh-CN/common.json —— 基线包（节选）
{
  "app": { "title": "运维控制台" },
  "action": { "save": "保存", "cancel": "取消" },
  "order": {
    "list": {
      "title": "订单列表",
      "total": "共 {{count}} 条订单"
    }
  }
}
```

```json
// src/i18n/locales/en-US/common.json
{
  "app": { "title": "Ops Console" },
  "action": { "save": "Save", "cancel": "Cancel" },
  "order": {
    "list": {
      "title": "Orders",
      "total": "{{count}} orders in total"
    }
  }
}
```

```tsx
// main.tsx —— 只需 import 一次实例
import React from 'react';
import { createRoot } from 'react-dom/client';
import './i18n'; // 副作用导入：模块内完成 init
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
// 使用方：useTranslation 拿 t
import { useTranslation } from 'react-i18next';

export function OrderListHeader({ count }: { count: number }) {
  // 参数是命名空间；不给则用 defaultNS
  const { t } = useTranslation('common');
  return (
    <header>
      {/* key 用点路径；插值用 {{ }}（i18next 原生语法，10.2 换 ICU 后统一为 { }） */}
      <h1>{t('order.list.title')}</h1>
      <span>{t('order.list.total', { count })}</span>
    </header>
  );
}
```

**机制说明（为什么切语言组件会自动重渲染）**：`useTranslation` 内部用 `useSyncExternalStore` 订阅 i18next 实例的 `languageChanged` 事件——`changeLanguage` 一旦完成，所有调用过该 hook 的组件整体重渲染，`t` 返回新语言的文案。这个机制是 10.10（schema 联动）与 10.5（无刷新切换）的共同基础。

**常见坑（症状 → 根因 → 修法）**：

- 症状：页面直接显示 `order.list.title` 这样的 key。
  根因：当前语言资源里没有该 key，且 `fallbackLng` 也没有；i18next 默认返回 key 本身。
  修法：这是设计行为（让缺失可见），配套方案是 10.4 的缺失上报与 CI key 扫描（10.9），不要试图把 missing 值写成中文——那会掩盖问题。
- 症状：`t` 返回的插值出现 `[object Object]`。
  根因：把对象传进了插值：`t('k', { user })` 而文案里写 `{{user}}`。
  修法：插值只传标量，展开为 `{{user.name}}` 时传 `{ user: { name } }` 或直接 `{ name: user.name }`。

---

#### 10.2 ICU MessageFormat 专题

**是什么**。ICU MessageFormat 是 Unicode CLDR 定义的"消息语法标准"，专门描述**自然语言里依赖变量而变化的语法现象**：复数（plural）、序数（selectordinal）、选择（select，如性别）、嵌套组合。浏览器侧由 `IntlMessageFormat`（FormatJS 维护）实现，`i18next-icu` 插件把它接入 i18next。

**为什么需要——为什么中文拼接"共" + n + "条"无法翻译**。这是全章最重要的认知，展开讲三层：

第一层：**语序**。中文"共 3 条订单"的语序是"前缀 + 数字 + 量词 + 名词"；英语是"3 orders in total"（数字开头）；日语是「合計 3 件の注文」。拼接模板假设了"数字夹在固定前后缀中间"这一中文语序，换成任何语序不同的语言直接报废。翻译的本质单位是**整句**，不是碎片。

第二层：**复数类别**。CLDR 把世界语言的名词复数分为 6 个语法类别：zero / one / two / few / many / other。每种语言启用其中若干个：

| 语言 | 启用类别 | 例子 |
|---|---|---|
| 中文（zh） | other（仅 1 类） | 1 条订单 / 3 条订单——数量词不变 |
| 英文（en） | one / other | 1 item / 2 items |
| 法文（fr） | one / many / other | 0 jour / 1 jour / 2 jours（0 和 1 都算 one） |
| 俄文（ru） | one / few / many / other | 1 товар / 2 товара / 5 товаров / 1.5 товара |
| 波兰文（pl） | one / few / many | 1 produkt / 2 produkty / 5 produktów |
| 阿拉伯文（ar） | 全部 6 类 | zero/one/two/few/many/other 各有词形 |

英语至少要 2 个分支，俄语 4 个，阿拉伯语 6 个。`"共" + n + "条"` 这种拼接连英语的 2 分支都表达不了，更别提 6 分支。而且这些"数字落到哪个类别"的规则（俄语：末位 1 且非 11 为 one；末位 2-4 且非 12-14 为 few；其余 many）**不可能也不应该由前端手写**——CLDR 已经写好了，ICU 运行时自动判类别。

第三层：**数字本身的本地化**。同一个 1234567.89，德语渲染为 `1.234.567,89`，印地语分组是 `12,34,567.89`（ lakh 分组）。ICU 复数分支里的 `#` 占位符会自动按当前 locale 格式化数字，拼接 `n.toString()` 做不到。

**怎么做（语法逐个讲）**。以下所有示例都假定接入了 `i18next-icu`（安装见本节末尾），插值统一用 ICU 的 `{var}` 写法。注意：接入 ICU 插件后消息由 `IntlMessageFormat` 解析，**同一 key 里不要再混用 i18next 原生的 `{{var}}`**——团队约定一套语法用到底，本章约定 ICU 风格。

**plural（基数复数）**——`{变量, plural, 分支…}`，分支写法是"类别或精确匹配 { 文案 }"，文案里的 `#` 表示当前数字：

```json
// zh-CN
{ "order": { "totalIcu": "{count, plural, =0 {无订单} other {共 # 条订单}}" } }
```

```json
// en-US
{ "order": { "totalIcu": "{count, plural, =0 {No orders yet} one {# order} other {# orders in total}}" } }
```

```json
// ru-RU（演示 4 分支）
{ "order": { "totalIcu": "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}" } }
```

渲染结果对照（`t('order.totalIcu', { count })`）：

| count | zh-CN | en-US | ru-RU |
|---|---|---|---|
| 0 | 无订单 | No orders yet | 0 товаров |
| 1 | 共 1 条订单 | 1 order | 1 товар |
| 2 | 共 2 条订单 | 2 orders in total | 2 товара |
| 5 | 共 5 条订单 | 5 orders in total | 5 товаров |
| 21 | 共 21 条订单 | 21 orders in total | 21 товар |

注意两条：`=0` 是精确匹配（优先于类别，中文用 `other` 一个分支 + `=0` 特判就是惯用法）；21 在俄语落回 one 类别（末位 1 且非 11）——这就是"手写 if (n === 1) 必挂"的铁证。

**select（选择/性别）**——`{变量, select, 值1 {…} 值2 {…} other {…}}`，用于枚举型变量决定文案，**必须有 other 分支**：

```json
// zh-CN
{ "invite": { "message": "{gender, select, male {他} female {她} other {该用户}}邀请你协作「{docName}」" } }
```

```json
// en-US
{ "invite": { "message": "{gender, select, male {He} female {She} other {They}} invited you to collaborate on \"{docName}\"" } }
```

```json
// fr-FR —— 法语里"邀请"过去分词要随性别变位，拼接方案在此彻底死亡
{ "invite": { "message": "{gender, select, male {Il t'a invitée} female {Elle t'a invitée} other {Invitation à collaborer}} sur « {docName} »" } }
```

渲染：`t('invite.message', { gender: 'female', docName: 'Q3 复盘' })` → 中文"她邀请你协作「Q3 复盘」"。

**selectordinal（序数）**——结构与 plural 相同，但分支按"序数语法类别"匹配：

```json
// en-US：1st / 2nd / 3rd / 4th / 21st
{ "rank": "{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} in the leaderboard" }
```

```json
// zh-CN：序数在中文不变形，一个 other 即可，但保留写法统一
{ "rank": "排行榜第 {place, selectordinal, other {#}} 名" }
```

渲染：place=1 → "1st in the leaderboard" / "排行榜第 1 名"；place=21 → "21st …"。

**嵌套**——分支内部可以继续放复数/选择/插值，解决"性别 × 复数"叠加的真实难题：

```json
// zh-CN
{
  "team": {
    "host": "{gender, select, female {{name} 和她的 {count, plural, one {# 位同事} other {# 位同事}}} male {{name} 和他的 {count, plural, one {# 位同事} other {# 位同事}}} other {{name} 和 {count, plural, one {# 位同事} other {# 位同事}}}}在等你会面"
  }
}
```

```json
// en-US：英文里嵌套复数直接决定 colleague 的单复数
{
  "team": {
    "host": "{gender, select, female {{name} and her {count, plural, one {colleague} other {colleagues}}} male {{name} and his {count, plural, one {colleague} other {colleagues}}} other {{name} and {count, plural, one {one colleague} other {# colleagues}}}} are waiting"
  }
}
```

**其他占位符**（知道即可）：`{ts, date, long}` 按当前 locale 格式化日期，`{ratio, number, percent}` 格式化百分比，`{count, number, integer}` 强制整数格式。

**与 i18next 的集成**：

```bash
npm i i18next-icu
```

```ts
// src/i18n/index.ts —— 在 init 之前 use(ICU)，注意顺序：插件在 react 绑定之前或之后均可，但都必须在 init 前
import i18n from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

void i18n
  .use(ICU) // 关键：消息解析交给 IntlMessageFormat
  .use(initReactI18next)
  .init({ /* 10.1 的配置原样不变 */ });
```

接入后调用方式不变：`t('order.totalIcu', { count: 5 })`，i18next-icu 自动把 options 传给 IntlMessageFormat 渲染。还有一个隐性收益：**Crowdin / Lokalise 等翻译平台原生支持 ICU 语法编辑**（对译者高亮显示复数分支表单）——远端语言包（10.4）里的 ICU 语法因此是安全可下发的。

**常见坑（症状 → 根因 → 修法）**：

- 症状：控制台报 `SyntaxError: EXPECT argument style` 或消息原样输出带 `{count, plural...}` 字样。
  根因：ICU 语法写错——最常见的是分支间漏空格（`other{#}` 应为 `other {#}`）、`#` 写在 select（只有 plural/selectordinal 支持 `#`）、花括号不配对。
  修法：语法错误发生在**运行时渲染每条消息时**，静态包能靠 code review + 单测兜住，远端包要靠 10.4 的合并前校验 + CI 里对基线包跑一遍"全 key 渲染冒烟"。
- 症状：英文正确、法文/俄文数量词仍错。
  根因：译者按英文模板只翻了一个分支，few/many 分支缺失。
  修法：`IntlMessageFormat` 对缺失类别会回退 other，因此要靠翻译平台"分支覆盖率"检查 + 对关键 key 的多语言单测（枚举 count = 0/1/2/5/21 渲染快照）。

---

#### 10.3 命名空间拆包与路由级懒加载

**是什么**。i18next 的 namespace（ns）是语言包内的二级拆分维度：资源结构是 `resources[语言][命名空间][key 路径]`。一个 ns 就是一个 JSON 文件、一个独立加载与覆盖的单元。

**为什么需要**。所有文案塞一个 `translation.json`，很快会膨胀到几千 key：首屏要背着"告警规则页"的文案加载；远端覆盖（10.4）的 diff 粒度太粗，改一条文案要下发全量包；多人协作翻译时的文件冲突也集中在一个文件。按"页面/组件域"拆 ns 后，加载、覆盖、权限（谁能翻哪个域）都以 ns 为单位，三个问题一起解决。

**怎么做（机制分步）**：

1. 拆分约定：`common`（全局：按钮/菜单/通用提示，**始终随首屏加载**）+ 每个页面域一个 ns（`dashboard`、`alertRule`、`member`……）；
2. 基线包按 `locales/{lng}/{ns}.json` 组织，用**动态 import** 实现按 ns 代码分包；
3. 路由声明自己依赖的 ns，进入路由前保证 ns 就绪；
4. 运行时用模块内的 Set 记录"页面用过的 ns"，供语言切换时对目标语言补加载（10.5 用到）。

**代码示例**——目录与懒加载器：

```text
src/i18n/
├── index.ts            # 实例与 init（10.1）
├── lazyLoad.ts         # 本节：按 ns/lng 动态加载基线包
├── applyRemote.ts      # 10.4：远端覆盖包拉取/校验/合并
├── missingReport.ts    # 10.4：缺失 key 上报
├── pseudoLoc.ts        # 10.9：伪语言
└── locales/
    ├── zh-CN/
    │   ├── common.json     # 首屏静态 import（进主包）
    │   ├── dashboard.json  # 路由级动态 import（独立 chunk）
    │   └── alertRule.json
    └── en-US/
        ├── common.json
        ├── dashboard.json
        └── alertRule.json
```

```ts
// src/i18n/lazyLoad.ts —— 命名空间级懒加载（基线包路线：走构建器代码分包）
import i18n from './index';
import type { AppLanguage } from './index';

/** 记录"本会话用过的 ns"：语言切换时要为新语言补齐同一批 ns（见 10.5） */
const touchedNamespaces = new Set<string>(['common']);

/** 语言 → 命名空间 → 动态 import 的映射表（构建器靠静态字符串生成 chunk） */
const loaders: Record<string, Record<string, () => Promise<{ default: object }>>> = {
  'zh-CN': {
    common: () => import('./locales/zh-CN/common.json'),
    dashboard: () => import('./locales/zh-CN/dashboard.json'),
    alertRule: () => import('./locales/zh-CN/alertRule.json'),
  },
  'en-US': {
    common: () => import('./locales/en-US/common.json'),
    dashboard: () => import('./locales/en-US/dashboard.json'),
    alertRule: () => import('./locales/en-US/alertRule.json'),
  },
};

/** 幂等加载一个 ns：已在内存则直接返回；并发调用只触发一次网络/chunk 请求 */
export async function lazyLoadNamespace(lng: string, ns: string): Promise<void> {
  touchedNamespaces.add(ns);
  if (i18n.hasResourceBundle(lng, ns)) return; // 已加载（含 10.4 注入的合并包）
  const loader = loaders[lng]?.[ns];
  if (!loader) throw new Error(`未注册的命名空间: ${lng}/${ns}`);
  const mod = await loader(); // 动态 import：该 ns 单独一个 chunk
  // overwrite=true：远端合并包（10.4）可能先到，这里基线只补缺不覆盖远端
  i18n.addResourceBundle(lng, ns, mod.default, true, true);
}

/** 路由进入前调用：保证一组 ns 就绪 */
export async function ensureNamespaces(lng: string, nss: readonly string[]): Promise<void> {
  await Promise.all(nss.map((ns) => lazyLoadNamespace(lng, ns)));
}

/** 语言切换前调用：为新语言补齐本会话用过的所有 ns */
export async function ensureLanguageLoaded(lng: AppLanguage): Promise<void> {
  await ensureNamespaces(lng, [...touchedNamespaces]);
}
```

路由侧的接入——两种模式：

```tsx
// 模式 A（推荐）：路由懒加载与 ns 懒加载合并在一个 lazy 里
import { lazy } from 'react';
import { lazyLoadNamespace } from '../i18n/lazyLoad';
import i18n from '../i18n';

export const AlertRulePage = lazy(async () => {
  // 先保证语言包 chunk 就绪，再加载组件 chunk，组件首帧就有文案
  await lazyLoadNamespace(i18n.language, 'alertRule');
  const mod = await import('../modules/alert-rule/AlertRulePage');
  return { default: mod.AlertRulePage };
});
```

```tsx
// 模式 B：包裹 Gate 组件（适合 ns 由后端路由配置下发的场景，如低代码页面）
import { useTranslation } from 'react-i18next';
import { ensureNamespaces } from '../i18n/lazyLoad';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export function NamespaceGate({ ns, children }: { ns: string | string[]; children: ReactNode }) {
  const nss = Array.isArray(ns) ? ns : [ns];
  const { i18n } = useTranslation();
  // 手动管理就绪态，不走 Suspense：适合"整页骨架屏"由页面自己控制的团队规范
  const [ready, setReady] = useState(() => nss.every((n) => i18n.hasResourceBundle(i18n.language, n)));

  useEffect(() => {
    void ensureNamespaces(i18n.language, nss).then(() => setReady(true));
  }, [i18n.language]); // 语言切换时对新语言重复保证（10.5）
  void ready;
  return ready ? <>{children}</> : <PageSkeleton />;
}

function PageSkeleton() {
  return <div aria-busy="true" className="page-skeleton">加载中…</div>;
}
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：页面闪现一帧裸 key 再变正常。
  根因：组件 chunk 与 ns chunk 并行加载，组件先渲染而资源未就绪。
  修法：模式 A 把两次 await 串行（先 ns 后组件）；或 `react.useSuspense: true` 让组件挂起在 Suspense 边界，显示骨架而非裸 key。
- 症状：`i18n.addResourceBundle` 加载了新 ns，但已挂载组件不刷新。
  根因：i18next 只在 `languageChanged` 等事件时通知订阅者，新增资源不触发。
  修法：手动 `i18n.emit('languageChanged', i18n.language)` 强制订阅组件重渲染（10.4 注入远端包后就是这么刷新的）。

---

#### 10.4 动态语言包合并策略（本章灵魂）

**是什么**。"静态基线包 + 远端覆盖包"的双包架构：基线包随前端构建发布，覆盖所有 key、保证**永远可用**；远端覆盖包由 CMS / 翻译平台 OTA 下发，只包含"运营改过的 key"，优先级更高。运行时把两份**深合并**成一份注入 i18n 实例，并补全 fallback 链与缺失上报。

**为什么需要**。只用静态包：运营改一条"法务要求的免责声明"要等一次发版，多语言 SaaS 里这种小改每天发生，发版节奏被文案绑架。只用远端包：远端挂了/错了整站文案全灭——把可用性押在一条网络请求上。双包的本质是**把"可用性"与"时效性"解耦**：基线保证可用性（永远有底），远端提供时效性（改完即生效），合并策略保证两者同时成立。

**怎么做（机制分步）**。整条链路分五步，时序图如下：

```text
应用启动
  │
  ├─ (1) 基线包已随构建在内存（init 时静态 import + 路由级懒加载补充）
  │        ↓ 页面立即可用，不等远端 —— "保底"
  ├─ (2) fetch 远端覆盖包（带超时）
  │        ├─ 成功 → (3) 结构校验（JSON 形状 / 原型污染键 / 叶子类型）
  │        │          ├─ 通过 → (4) 逐语言逐 ns 深合并（远端优先）→ addResourceBundle 注入
  │        │          │        → emit('languageChanged') 触发已挂载组件刷新 —— "优先"
  │        │          └─ 失败 → 丢弃该语言/该 ns 的远端数据，console.error，继续用基线
  │        └─ 失败（网络/超时/HTTP 非 200）→ 记 warn，静默用基线
  └─ (5) 之后每次 t() 查询都走"合并后的资源树"
           ├─ 命中 → 返回文案
           └─ 未命中 → parseMissingKeyHandler → 上报 + 返回 key 本身
```

**（一）两份包的 JSON 结构**。

基线包（随构建发布，10.3 的 `locales/` 目录，完整覆盖所有 key）：

```json
// src/i18n/locales/zh-CN/alertRule.json（基线，节选）
{
  "title": "告警规则配置",
  "field": {
    "amount": "订单金额",
    "city": "下单城市"
  },
  "total": "{count, plural, other {共 # 条订单}}"
}
```

远端覆盖包（CMS 下发，**顶层带版本元信息，packages 按语言→ns 组织，只含被改过的 key**）：

```json
// GET /api/i18n/overrides?app=console&since=<本地版本>
{
  "version": "2026.11.05-rc3",
  "updatedAt": "2026-11-05T08:00:00Z",
  "packages": {
    "zh-CN": {
      "alertRule": {
        "title": "告警规则配置（内测话术 v3）",
        "total": "{count, plural, =0 {暂无订单} other {当前共 # 条订单}}"
      }
    },
    "en-US": {
      "alertRule": {
        "title": "Alert Rule Builder (Beta wording v3)"
      }
    }
  }
}
```

读结构要注意三点：`title` 是覆盖（基线还在，被压住）；`field.*` 远端没有 → 合并后仍取基线；`total` 远端覆盖的同时**保持了 ICU 语法**——远端是运行时数据，语法错了就是线上事故，所以第 (3) 步校验不能省（见坑 4）。

**（二）深合并函数（远端优先）**：

```ts
// src/i18n/merge.ts
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 深合并：远端（override）优先，基线（baseline）保底。
 * 规则：
 *  1. 两侧都是普通对象 → 逐 key 递归；
 *  2. override 里 undefined（不会出现在 JSON，防御性保留）→ 取基线；
 *  3. 其余（字符串/数字/数组）→ 远端整体替换，不与基线"拼接"。
 *     文案树里数组本不该出现；万一出现，半新半旧的拼接比整体替换危险得多。
 */
export function deepMerge<T>(baseline: T, override: unknown): T {
  if (override === undefined) return baseline;
  if (isPlainObject(baseline) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...baseline };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge((baseline as Record<string, unknown>)[key], (override as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return override as T;
}
```

**（三）合并前校验**。校验目标不是"内容对不对"（那是翻译平台的事），而是"**结构是否足以安全进入资源树**"：顶层形状、叶子类型、原型污染键。任何一条不过，整个语言的远端数据作废，回退基线。

```ts
// src/i18n/validate.ts
import { isPlainObject } from './merge';

export interface PackValidation {
  ok: boolean;
  errors: string[];
}

/** 原型污染键：JSON.parse 理论上不会产出，但 CMS 的存储层（NoSQL/深拷贝库）可能注入，必须挡 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** 递归校验一个"命名空间包"：叶子必须全是 string */
export function validateNamespacePack(pack: unknown, path = ''): PackValidation {
  const errors: string[] = [];
  if (!isPlainObject(pack)) {
    return { ok: false, errors: [`${path || '<root>'} 必须是 JSON 对象，实际是 ${Array.isArray(pack) ? '数组' : typeof pack}`] };
  }
  for (const [key, value] of Object.entries(pack)) {
    const p = path ? `${path}.${key}` : key;
    if (FORBIDDEN_KEYS.has(key)) {
      errors.push(`${p} 是被禁止的键（疑似原型污染）`);
      continue;
    }
    if (isPlainObject(value)) {
      errors.push(...validateNamespacePack(value, p).errors); // 嵌套对象：递归
    } else if (typeof value !== 'string') {
      errors.push(`${p} 的值必须是 string，实际是 ${typeof value}`); // 数字/布尔/null 一律拒绝
    }
  }
  return { ok: errors.length === 0, errors };
}

/** 顶层结构校验：packages 字典 + 每个语言的值是 ns 字典 */
export function validateRemotePayload(payload: unknown): PackValidation {
  const errors: string[] = [];
  if (!isPlainObject(payload)) return { ok: false, errors: ['远端包顶层必须是对象'] };
  if (typeof payload.version !== 'string') errors.push('缺少 string 类型的 version 字段');
  if (!isPlainObject(payload.packages)) {
    return { ok: false, errors: [...errors, 'packages 必须是对象（语言 → 命名空间 → key 树）'] };
  }
  for (const [lng, nsMap] of Object.entries(payload.packages)) {
    if (!isPlainObject(nsMap)) {
      errors.push(`packages.${lng} 必须是对象`);
      continue;
    }
    for (const [ns, pack] of Object.entries(nsMap)) {
      errors.push(...validateNamespacePack(pack, `packages.${lng}.${ns}`).errors);
    }
  }
  return { ok: errors.length === 0, errors };
}
```

**（四）完整注入流程（try/catch 时序，含失败回退）**：

```ts
// src/i18n/applyRemote.ts —— 把远端覆盖包安全地叠到基线之上
import i18n from './index';
import { deepMerge, isPlainObject } from './merge';
import { validateRemotePayload, validateNamespacePack } from './validate';

export type RemoteStatus = 'applied' | 'partially-applied' | 'skipped' | 'fetch-failed';

export interface RemoteResult {
  status: RemoteStatus;
  version?: string;
  appliedLngs: string[];
  reason?: string;
}

/** 带超时的 fetch：远端语言包是"锦上添花"，绝不允许拖慢或卡死启动 */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
}

export async function applyRemoteLocales(
  url: string,
  supported: readonly string[],
  timeoutMs = 5000,
): Promise<RemoteResult> {
  // ---- 第 1 步：拉取。失败 → 整体跳过，基线照常工作 ----
  let payload: unknown;
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    payload = await res.json();
  } catch (err) {
    // 注意日志级别：远端包拉不到是"预期内的降级"，warn 而非 error，不触发告警
    console.warn('[i18n] 远端语言包拉取失败，使用基线包。原因：', err);
    return { status: 'fetch-failed', appliedLngs: [], reason: String(err) };
  }

  // ---- 第 2 步：顶层结构校验。失败 → 丢弃整个 payload ----
  const top = validateRemotePayload(payload);
  if (!top.ok) {
    // 这里是 error 级：数据到达了但格式错误，说明下发链路坏了，需要人介入
    console.error('[i18n] 远端语言包结构校验失败，已整体回退基线：', top.errors.slice(0, 20));
    return { status: 'skipped', appliedLngs: [], reason: top.errors[0] };
  }
  const { packages, version } = payload as { packages: Record<string, Record<string, object>>; version: string };

  // ---- 第 3 步：逐语言、逐命名空间校验 + 深合并 + 注入 ----
  // 粒度到"语言"：一个语言的包坏了，不影响其他语言生效
  const appliedLngs: string[] = [];
  for (const lng of supported) {
    const nsMap = packages[lng];
    if (!nsMap || Object.keys(nsMap).length === 0) continue;

    const lngCheck = validateNamespacePack(nsMap);
    if (!lngCheck.ok) {
      console.error(`[i18n] ${lng} 的远端包校验失败，该语言回退基线：`, lngCheck.errors.slice(0, 20));
      continue;
    }

    for (const [ns, remotePack] of Object.entries(nsMap)) {
      // 基线可能尚未懒加载（比如 dashboard ns 还没进路由）→ getResourceBundle 返回 undefined，
      // 此时直接把远端包作为该 ns 的首个 bundle 注入；基线后到时 deep=true 会补齐缺的 key
      const baseline = i18n.getResourceBundle(lng, ns) ?? {};
      const merged = deepMerge(baseline, remotePack);
      i18n.addResourceBundle(lng, ns, merged, true, true); // deep=true, overwrite=true
    }
    appliedLngs.push(lng);
  }

  // ---- 第 4 步：触发已挂载组件刷新（i18next 新增资源不自动通知）----
  if (appliedLngs.includes(i18n.language)) {
    i18n.emit('languageChanged', i18n.language);
  }

  const status: RemoteStatus =
    appliedLngs.length === 0 ? 'skipped' : appliedLngs.length === supported.length ? 'applied' : 'partially-applied';
  return { status, version, appliedLngs };
}
```

关键设计取舍说明：`fetch 失败 → warn + 基线`（网络问题太常见，不是事故）；`校验失败 → error + 基线`（数据链路坏了，要告警）；`粒度到语言`（en 包坏了不影响 zh 的运营改动生效）；`addResourceBundle(deep, overwrite)` 双 true 保证"远端优先、基线补缺"的语义在注入层再次成立。

**（五）fallback 链与缺失 key 上报**。合并后的查询路径就是标题里的链：**远端 → 基线 → key 本身 + 上报**。

```text
t('alertRule.total', { count: 5 })
  │
  ├─ 合并资源树命中（远端覆盖值或基线值）→ 渲染文案，结束
  │
  └─ 未命中（远端与基线都没有这个 key）
       │
       └─ i18next 依次尝试：
          ① 当前语言资源树（含远端覆盖）……miss
          ② fallbackLng（zh-CN）资源树……miss
          ③ parseMissingKeyHandler(key) 被调用
             ├─ console.error：开发期立刻可见
             ├─ 上报队列 push：生产环境进入监控闭环（下方代码）
             └─ return key：页面显示 key 本身——"丑但可定位"，逼人修复
```

```ts
// src/i18n/missingReport.ts —— 缺失 key 上报：批处理 + sendBeacon
type Ns = string;

export interface MissingKeyRecord {
  key: string;
  ns: Ns;
  lng: string;
  url: string;
  appVersion: string;
  ts: number;
}

const QUEUE: MissingKeyRecord[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_BATCH = 20;
const FLUSH_INTERVAL = 10_000;
const APP_VERSION = __APP_VERSION__; // 由构建器 DefinePlugin/Vite define 注入，如 "3.8.1"

/** 由 index.ts 的 parseMissingKeyHandler 调用 */
export function reportMissingKey(key: string, ns: Ns = 'common', lng: string): string {
  // 1) 开发期：只打 console（红色波浪线都不用等，终端里直接炸出来）
  console.error(`[i18n] missing key: ${ns}:${key} (lng=${lng})`);

  // 2) 生产期：进入上报队列（开发环境不上报，避免污染监控数据）
  if (import.meta.env.PROD) {
    QUEUE.push({ key, ns, lng, url: window.location.pathname, appVersion: APP_VERSION, ts: Date.now() });
    if (QUEUE.length >= MAX_BATCH) {
      void flush();
    } else if (flushTimer === null) {
      flushTimer = setTimeout(() => void flush(), FLUSH_INTERVAL);
    }
  }
  // 3) 返回给 i18next 的"兜底文案"：key 本身
  return key;
}

async function flush(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  const body = JSON.stringify(batch);
  // sendBeacon：页面关闭/切后台也能发出去，适合"捎带式"遥测
  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon('/api/i18n/missing-keys', new Blob([body], { type: 'application/json' }));
  } else {
    await fetch('/api/i18n/missing-keys', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
  }
}

// 页面切到后台立刻冲队列：visibilitychange 比 unload 可靠（移动端）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flush();
});
```

```ts
// src/i18n/index.ts 里接入（替换 10.1 的占位实现）
import { reportMissingKey } from './missingReport';

void i18n.use(initReactI18next).init({
  // ...其余配置同 10.1
  parseMissingKeyHandler: (key, fallbackValue) => {
    // 通过 options 里的 nsHint 拿到命名空间（i18next 会把解析失败的完整 key 传进来，
    // 形如 "alertRule.total" 或 "namespace:key" 两种形式都可能出现，这里做一次归一）
    const [maybeNs, ...rest] = key.split(':');
    const ns = rest.length > 0 ? maybeNs : 'common';
    const bareKey = rest.length > 0 ? rest.join(':') : key;
    void fallbackValue;
    return reportMissingKey(bareKey, ns, i18n.language);
  },
});
```

**（六）文案缺失监控面板的数据结构**。后端把上报按 `(appVersion, key, lng, ns)` 聚合，面板按版本透视——每个版本上线第一天扫一眼"新增缺失数"，是国际化质量的日常巡检：

```json
// GET /api/i18n/missing-keys/panel?appVersion=3.8.1 返回
{
  "appVersion": "3.8.1",
  "totalMissing": 6,
  "items": [
    {
      "key": "alertRule.builder.addField",
      "ns": "alertRule",
      "lngs": { "en-US": 37, "de-DE": 12 },
      "firstSeen": "2026-11-01T02:11:00Z",
      "lastSeen": "2026-11-05T09:40:00Z",
      "topUrls": [{ "url": "/alert-rule/new", "count": 31 }],
      "status": "open",
      "owner": "intl-guild",
      "suspectedCause": "3.8.0 新增页面未同步 en 包（CI key 扫描未开启）"
    }
  ]
}
```

配套两条告警规则：单日新增缺失 key > 5 → 群通知；缺失 key 涉及 `common` ns → 直达值班（公共文案缺失影响全站）。

**常见坑（症状 → 根因 → 修法）**：

- 症状：远端包生效了，但部分页面要刷新一次才显示新文案。
  根因：注入发生在某些路由懒加载**之前**，那些 ns 的基线包在注入后通过 `addResourceBundle` 补进来，且 `overwrite=true` 把远端值盖掉了；或者注入完成后没有 `emit('languageChanged')`。
  修法：保证注入用"合并后的完整树"一次性写入（`deepMerge` 后再 add），并且懒加载器只写"内存里没有的 ns"（10.3 的 `hasResourceBundle` 判断 + 本节 deep/overwrite 语义）；注入后必须手动 emit 刷新。
- 症状：远端包里一个 key 拼错了层级（如把 `title` 放在了 `alertRule.title` 之外的同名节点下），用户看到基线旧文案但运营以为已生效。
  根因：结构校验只保证"形状安全"（都是 string），不保证"key 路径正确"（路径错误 = 合法但无效）。
  修法：校验层加第三道——**路径白名单**：远端包的每个叶子路径必须存在于基线包（`hasPath(baseline, path)`），对"新增 key"（基线没有）的策略按团队定：默认拒绝，显式放开则要求 CMS 勾选"新增 key"并说明原因。

---

#### 10.5 运行时切换语言

**是什么**。用户点一下语言选择器，全站文案、格式化（10.6）、方向（10.8）立即切换，**不刷新页面**、不丢表单状态、不打断当前操作。

**为什么需要**。整页 reload 切换是最省事的做法，代价是：当前页面临时状态全丢（填了一半的高级筛选、滚动位置）、白屏等待、多租户场景下"预览租户语言"这种运营操作每次都要付出 reload 成本。i18next 的事件驱动机制（10.1 机制说明）本来就能做到无刷新，工程上要做的是把"切换瞬间"的体验处理干净。

**怎么做（机制分步）**：

1. 先 `ensureLanguageLoaded(next)`：为目标语言补齐本会话用过的所有 ns（10.3 的 `touchedNamespaces`）；
2. 再 `i18n.changeLanguage(next)`：资源已在内存，`t` 同步返回新语言文案，零空白；
3. `languageChanged` 事件里同步 `<html lang>` 与 `<html dir>`（无障碍与字体选择都依赖它）；
4. 持久化用户选择（localStorage + 服务端用户资料）。

**切换瞬间的两种策略对比**——这是本节的核心决策点：

| 策略 | 做法 | 体验 | 适用 |
|---|---|---|---|
| A. Suspense 加载态 | 直接 `changeLanguage`，未加载的 ns 让组件挂起，显示 Suspense fallback | 切换瞬间**旧界面整块换成骨架屏**，加载完弹出新语言 | ns 很大/网络慢、接受闪断 |
| B. 预载 + 保留旧文案（推荐） | 先 `ensureLanguageLoaded` 再切换，期间旧文案保持可交互 | 旧界面保持到最后一刻，然后**一次性原子切换** | 绝大多数产品 |

策略 B 的"切换按钮转圈 200ms + 原子切换"远好于"整页骨架 800ms"——用户对"按下后界面仍可读"的容忍度远高于"按下后界面消失"。

**代码示例**：

```ts
// src/i18n/syncDocument.ts —— languageChanged 时同步 <html lang> 与 <html dir>
import i18n from './index';

const RTL_LANGS = new Set(['ar', 'ar-SA', 'he', 'he-IL', 'fa', 'fa-IR', 'ur', 'ur-PK']);
export function dirFor(lng: string): 'rtl' | 'ltr' {
  return RTL_LANGS.has(lng) ? 'rtl' : 'ltr';
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng; // 读屏软件选语音、浏览器翻译建议、CSS :lang() 都依赖它
  document.documentElement.dir = dirFor(lng); // 10.8 的总开关
  window.localStorage.setItem('app:lng', lng); // 持久化（10.1 的 detectInitialLanguage 读它）
});
```

```tsx
// src/i18n/LanguageSwitcher.tsx —— 策略 B 完整实现
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LNGS, type AppLanguage } from './index';
import { ensureLanguageLoaded } from './lazyLoad';

const LNG_LABEL: Record<AppLanguage, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [switching, setSwitching] = useState(false); // 切换按钮自身的 pending 态（策略 B 的"转圈"）

  async function switchTo(next: AppLanguage) {
    if (next === i18n.language || switching) return;
    setSwitching(true);
    try {
      // 步骤 1：为目标语言补齐本会话用过的全部 ns —— 期间旧文案保持不变、页面可交互
      await ensureLanguageLoaded(next);
      // 步骤 2：资源就绪后原子切换。重渲染由 useTranslation 的订阅自动驱动（10.1 机制说明），
      //         无需手动 setState，也不会出现 Suspense 闪断
      await i18n.changeLanguage(next);
      // 步骤 3：同步服务端偏好（失败不影响本地体验）
      void fetch('/api/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      }).catch(() => undefined);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <select
      aria-label="language"
      value={i18n.language}
      disabled={switching}
      onChange={(e) => void switchTo(e.target.value as AppLanguage)}
    >
      {SUPPORTED_LNGS.map((lng) => (
        <option key={lng} value={lng}>
          {LNG_LABEL[lng]}
          {switching && i18n.language === lng ? ' …' : ''}
        </option>
      ))}
    </select>
  );
}
```

如果选择策略 A（Suspense），只需两件事：`react.useSuspense: true`（10.1 已配）+ 在路由外层包 `<Suspense fallback={<AppSkeleton />}>`；`changeLanguage` 后未加载的 ns 会让组件挂起。再补一个官方备选：接了 i18next-http-backend 的团队可以直接 `await i18n.loadLanguages([next])` 再 `changeLanguage`，语义与 `ensureLanguageLoaded` 相同。

**常见坑（症状 → 根因 → 修法）**：

- 症状：切换后部分组件（表格列头、菜单）还是旧语言，刷新才对。
  根因：这些组件在 `useMemo(..., [])` 里调了 `t`，把首语言的字符串"冻结"进了闭包——订阅机制只重渲染组件，不会重算不带依赖的 memo。
  修法：把 `i18n.language` 加入 useMemo 依赖，或列定义只存 key、渲染期再 `t`（10.10 展开完整对照）。
- 症状：`<html lang>` 一直是 `zh-CN`，读屏软件用中文语音读英文界面。
  根因：忘记在 `languageChanged` 里同步 `document.documentElement.lang`，框架不会替你做。
  修法：10.5 的 `syncDocument.ts`，init 后立即手动触发一次（`i18n.emit('languageChanged', i18n.language)`）覆盖首屏。

---

#### 10.6 Intl 全家桶与时区专题

**是什么**。`Intl` 是浏览器内置的国际化 API 族（底层是 ICU/CLDR 数据）：`DateTimeFormat`（日期时间）、`NumberFormat`（数字/货币/单位/紧凑计数）、`RelativeTimeFormat`（相对时间）、`Collator`（排序）、`ListFormat`（列表连接词）。**不需要任何 npm 依赖**，且和 ICU 消息语法共享同一套 CLDR 数据。

**为什么需要**。10.2 解决"句子怎么变"，Intl 解决"数字和日期怎么变"。同一个值，各语言的"正确写法"差异巨大且不可推导：千分位符号、货币符号位置、周首日、上午/下午有无——任何一处手写 switch 都是给未来埋雷。另一个工程理由：日期/数字格式化是高频调用（表格每行一次），原生 API 比 dayjs + 插件组合更快、体积为零。

**怎么做（机制分步 + locale 差异演示）**。固定使用输入 `2026-11-05T12:00:00Z`，显式指定 `timeZone: 'Asia/Shanghai'`（不指定则跟运行机器走，输出不可复现——演示与快照测试都应显式指定）。

日期——同一时刻、同一显示时区，四种 locale 的输出：

```ts
const t12 = new Date('2026-11-05T12:00:00Z');
const zone = 'Asia/Shanghai';

new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full', timeZone: zone }).format(t12);
// → "2026年11月5日星期四"
new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: zone }).format(t12);
// → "Thursday, November 5, 2026"
new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeZone: zone }).format(t12);
// → "Donnerstag, 5. November 2026"
new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full', timeZone: zone }).format(t12);
// → "2026年11月5日木曜日"

new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: zone }).format(t12);
// → "8:00 PM"（12 小时制 + AM/PM）
new Intl.DateTimeFormat('zh-CN', { timeStyle: 'short', timeZone: zone }).format(t12);
// → "20:00"（24 小时制）
```

差异点一眼可见：年月日语序、星期书写、是否 12 小时制。还有 `weekday: 'narrow'`、`calendar`（佛历/伊斯兰历）、`hourCycle: 'h23'` 强制覆盖等选项，按需查表。

数字与货币——分组符、小数点、货币符号位置、四舍五入全随 locale：

```ts
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5);
// → "¥1,234.50"
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5);
// → "$1,234.50"
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5);
// → "1.234,50 €"（点做分组、逗号做小数、符号在后）
new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(1234.5);
// → "1 234,50 €"（窄不换行空格做分组）
new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(1234.5);
// → "￥1,235"（日元无小数，注意直接四舍五入进位！）

// 纯数字分组的极端例子：印地语的 lakh 分组（两位一组）
new Intl.NumberFormat('hi-IN').format(1234567.89); // → "12,34,567.89"
new Intl.NumberFormat('en-US').format(1234567.89); // → "1,234,567.89"
```

单位与相对时间：

```ts
new Intl.NumberFormat('zh-CN', { style: 'unit', unit: 'kilobyte', unitDisplay: 'long' }).format(5);
// → "5 千字节"
new Intl.NumberFormat('en-US', { style: 'unit', unit: 'kilobyte', unitDisplay: 'long' }).format(5);
// → "5 kilobytes"

const rtfZh = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
rtfZh.format(-1, 'day');   // → "昨天"
rtfZh.format(3, 'hour');   // → "3 小时后"
const rtfEn = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
rtfEn.format(-1, 'day');   // → "yesterday"
```

工程上封装一个随语言自动变化的 hook，全站统一走它：

```ts
// src/i18n/useFormatters.ts —— 语言切换时格式化器自动换新（Intl 实例有缓存，重建成本低）
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_TIME_ZONE_FALLBACK } from '../config';

export function useFormatters(timeZone?: string) {
  const { i18n } = useTranslation();
  const lng = i18n.language;
  return useMemo(() => {
    const tz = timeZone ?? APP_TIME_ZONE_FALLBACK; // 显式时区，输出可复现
    return {
      date: (d: Date, style: 'full' | 'long' | 'medium' | 'short' = 'medium') =>
        new Intl.DateTimeFormat(lng, { dateStyle: style, timeZone: tz }).format(d),
      dateTime: (d: Date) =>
        new Intl.DateTimeFormat(lng, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(d),
      currency: (n: number, currency: string) =>
        new Intl.NumberFormat(lng, { style: 'currency', currency }).format(n),
      relative: (ms: number) => {
        const diffMin = Math.round((ms - Date.now()) / 60000);
        return new Intl.RelativeTimeFormat(lng, { numeric: 'auto' }).format(diffMin, 'minute');
      },
    };
  }, [lng, timeZone]);
}
```

**时区专题（路线 5 加粗部分的展开）**。原则一句话：**存储与传输一律 UTC（推荐 ISO 8601 带 Z 或带 offset），展示时才换算到用户时区**。"用户时区"与"数据时区"是两个概念：数据时区是后端契约（全系统一个，就是 UTC）；用户时区是显示参数（每个用户一个，取浏览器 `Intl.DateTimeFormat().resolvedOptions().timeZone` 或用户资料里的显式设置，如 `America/New_York`）。两者永远不在同一层出现：API 层不出现"本地时间字符串"，展示层不关心"存的是什么时区"。

为什么不用"统一北京时间"：跨国团队的用户在纽约看"11-05 08:00"会误以为是纽约时间，基于它做"今天"的筛选（"今天的告警"）就会错 12 个小时——**"今天"本身是时区相关的概念**，凡是"按天分组/筛选"都必须先明确"按谁的时区算天"，再把天数边界换算成 UTC 时间戳区间发给后端。

dayjs + utc/timezone 插件的转换示例：

```bash
npm i dayjs
```

```ts
// src/utils/datetime.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/zh-cn';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn'); // 月份名、星期名走中文（与 Intl 的 locale 选择保持同一来源）

const iso = '2026-11-05T12:00:00Z'; // 后端下发的标准形态：带 Z 的 UTC

// UTC → 各用户时区展示
dayjs.utc(iso).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm');     // → "2026-11-05 20:00"
dayjs.utc(iso).tz('America/New_York').format('YYYY-MM-DD HH:mm');  // → "2026-11-05 07:00"（11 月已结束夏令时）
dayjs.utc(iso).tz('Europe/Berlin').format('YYYY-MM-DD HH:mm');     // → "2026-11-05 13:00"

// 用户浏览器时区（展示层默认值）
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone; // 如 "Asia/Shanghai"
dayjs.utc(iso).tz(userTz).format('YYYY-MM-DD HH:mm ddd');        // → "2026-11-05 20:00 周四"

// 反向：用户在柏林时区选了"2026-11-06 09:00" → 转成 UTC 发给后端
dayjs.tz('2026-11-06 09:00', 'Europe/Berlin').utc().format();    // → "2026-11-06T08:00:00Z"

// "按天筛选"的正确姿势：先算用户时区的当天边界，再转 UTC 区间发给后端
function todayRangeUtc(tz: string): { start: string; end: string } {
  const nowInTz = dayjs().tz(tz);
  return {
    start: nowInTz.startOf('day').utc().format(),
    end: nowInTz.endOf('day').utc().format(),
  };
}
```

**常见 bug：服务器返回不带 Z 的字符串**（症状 → 根因 → 修法）：

- 症状：同一条"订单创建时间"，北京用户看到 20:00、纽约用户看到 07:00，而运营在后端日志里看到的是 12:00——三个"真相"。更隐蔽的变体：测试环境（统一时区）一切正常，上线后海外用户时间全偏。
  根因：后端返回 `"2026-11-05 12:00:00"`——**无 Z、无 offset** 的"裸本地时间"字符串。`new Date("2026-11-05 12:00:00")` 会按**浏览器本地时区**解释它（各浏览器对空格分隔格式的行为历史上还有差异），于是每个人都在"用自己所在的时区读一个其实是 UTC 的时间"。根子在后端把 `DATETIME`（无时区类型）直接序列化了。
  修法：分三层堵——①契约层：接口规范写死"时间字段一律 ISO 8601 带 Z（UTC）或带 offset"，新接口 code review 卡死；②后端层：`DATETIME` 改 `TIMESTAMP` 或序列化时显式按 UTC 输出；③前端防御层：对历史接口的裸字符串**显式声明语义**再解析——确认它是 UTC 就 `dayjs.utc(str)`，绝不允许 `new Date(str)` 裸吃：

```ts
// 前端防御：把"裸 UTC 字符串"安全地转成标准 ISO
function parseLegacyUtc(raw: string): dayjs.Dayjs {
  // 历史接口约定：无时区标记即 UTC。显式加 Z，杜绝按本地时区解析
  const normalized = /[Z+]|GMT|UTC$/i.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  return dayjs.utc(normalized);
}
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：`toLocaleDateString()` 在不同用户机器上输出不一样，快照测试时好时坏。
  根因：不传参数的 `toLocaleString` 系列走"机器 locale + 机器时区"，等于把渲染结果交给用户环境掷骰子。
  修法：全站禁用无参调用（lint 自定义规则扫 `toLocale`），统一走 `useFormatters`，locale 与 timeZone 永远显式。

---

#### 10.7 富文案：Trans 组件与上下文消歧 key

**是什么**。`Trans` 是 react-i18next 处理"文案里嵌 JSX"的组件：整句仍然是**一条翻译**（语序自由），但句中的链接、加粗、图标等结构由组件在渲染时"克隆"回来。上下文消歧 key 是 key 命名的组织约定，解决"两个场景同一条中文、却需要不同英文"的冲突。

**为什么需要**。"阅读并同意**服务条款**和**隐私政策**"——服务条款是链接。若拆成三段 key 拼接（`agreePrefix` + `terms` + `and` + `privacy`），英文就得接受中文语序，且链接与文字的包裹关系（链接包哪几个词）无法表达。`Trans` 的机制：把组件 children 编号（文本节点与元素节点都占号），翻译文件里用 `<1>…</1>` 引用编号，渲染时 i18next 按 key 找到译文、解析编号占位、把**原 JSX 元素克隆**进对应位置——译者可以任意调整编号位置（换语序），但不能改结构。

**怎么做（代码示例）**：

```tsx
// src/pages/login/AgreementNotice.tsx
import { Trans, useTranslation } from 'react-i18next';

export function AgreementNotice() {
  const { t } = useTranslation('common'); // Trans 需要拿到对应 ns 的 t（或用 ns prop）
  return (
    <p className="agreement">
      <Trans i18nKey="login.agreement" t={t}>
        登录即表示同意
        <a href="https://example.com/legal/terms" target="_blank" rel="noreferrer">
          服务条款
        </a>
        和
        <a href="https://example.com/legal/privacy" target="_blank" rel="noreferrer">
          隐私政策
        </a>
      </Trans>
    </p>
  );
}
```

children 的编号规则（编号按出现顺序，文本节点也占号）：`"登录即表示同意"`=0、第一个 `<a>`=1、`"和"`=2、第二个 `<a>`=3。翻译文件里引用 1 和 3：

```json
// zh-CN/common.json
{
  "login": {
    "agreement": "登录即表示同意<1>服务条款</1>和<3>隐私政策</3>",
    "unread": "你有 <1>{{count}}</1> 条未读公告，详见<3>公告中心</3>"
  }
}
```

```json
// en-US/common.json —— 注意英语语序与中文完全不同，这正是 Trans 存在的意义
{
  "login": {
    "agreement": "By signing in, you agree to our <1>Terms of Service</1> and <3>Privacy Policy</3>",
    "unread": "You have <1>{{count}}</1> unread announcements — see the<3>Announcement Center</3>"
  }
}
```

```tsx
// 插值对象（{{count}}）同样占编号：<1>；第二个示例的用法
export function UnreadNotice({ count }: { count: number }) {
  const { t } = useTranslation('common');
  return (
    <span>
      <Trans i18nKey="login.unread" t={t} values={{ count }}>
        你有 <b>{{ count }}</b> 条未读公告，详见
        <a href="/announcements">公告中心</a>
      </Trans>
    </span>
  );
}
```

使用守则（写给翻译协作的队友）：①编号标签只能移动位置/增删包裹文本，**不能改变编号对应的结构**（不能把 `<1>` 变成两个）；②不要在 Trans 里放含内部状态的组件（会被克隆两份语义混乱），图标类无状态组件安全；③同一句里结构超过 5 个编号就该拆句子——译者的可维护性也是指标。

**上下文消歧 key 的组织方式**。"同名中文不同英文"的典型：按钮"删除"（Delete）与列表项"移除出团队"（Remove from team）——中文里两个场景都习惯叫"删除"。反过来也有："开票"在财务页是 invoice（动词）、在设置页是 receipt（名词）。这类冲突说明**按中文原文建 key 是错的**，key 应该按"语义位置"建：

```json
// zh-CN/common.json —— 语义化 key：域 + 实体 + 意图
{
  "action": { "delete": "删除" },
  "member": { "list": { "remove": "移除" } }
}
```

```json
// en-US/common.json —— 英文各自最优，互不牵连
{
  "action": { "delete": "Delete" },
  "member": { "list": { "remove": "Remove from team" } }
}
```

判断口诀：**两个场景的同一段中文，如果英文需要不同译法，那它们在语义上就是两条文案，应该有两个 key**——中文恰好同字只是巧合，不要让巧合合并语义。i18next 也内置了 context 参数做轻量消歧：`t('invite', { context: 'email' })` 会优先查 `invite_email`，适合"同一动作在不同渠道提示语微调"这种不想拆 key 的小场景；默认仍推荐独立 key，可读性与删除的自由度都更好。

**常见坑（症状 → 根因 → 修法）**：

- 症状：切语言后链接没了，只剩纯文本。
  根因：翻译文件里的编号与组件 children 对不上（组件加了一个 `<b>`，编号整体后移，旧译文引用的 1 变成了文本节点），i18next 静默降级为纯文本。
  修法：children 结构变更必须同步所有语言的编号（CI 里用 babel 解析组件 children 数量与各语言 JSON 引用编号做交叉校验，i18next-parser 提取时也会重新生成默认值辅助发现）；结构稳定后编号视为接口契约，改动走"加新 key"而非原地改。

---

#### 10.8 RTL 双向排版

**是什么**。RTL（right-to-left）是阿拉伯语、希伯来语、波斯语、乌尔都语的排版方向。支持 RTL 不是"把文字右对齐"，而是整个布局镜像：行进方向、图标指向、面包屑分隔符、进度条方向全部反转，由 `<html dir="rtl">` 一个总开关驱动。

**为什么需要**。出海中东的产品这是硬需求；即使当前不支持，CSS 写法的选择也决定未来迁移成本——用了物理属性（`left`）的代码在迁移时要逐行改，用了逻辑属性（`inline-start`）的代码零改动。

**怎么做（机制分步）**：

1. `dir` 属性挂到 `<html>`（10.5 的 `syncDocument.ts` 已完成切换）；组件内局部覆盖用 `<div dir="ltr">` 包裹（如代码块、电话号码）；
2. CSS 全部迁到**逻辑属性**（对照表见下）；
3. 方向性图标按清单镜像，对称图标不动；
4. 混排文本（用户昵称等未知方向的内容）用 `dir="auto"` 或 `<bdi>` 让浏览器自行判断。

**CSS 逻辑属性迁移对照表**：

| 物理属性（勿用） | 逻辑属性（改用） | 语义 | LTR 下等于 | RTL 下等于 |
|---|---|---|---|---|
| `margin-left` | `margin-inline-start` | 行首外边距 | 左 | 右 |
| `margin-right` | `margin-inline-end` | 行尾外边距 | 右 | 左 |
| `padding-left` | `padding-inline-start` | 行首内边距 | 左 | 右 |
| `padding-right` | `padding-inline-end` | 行尾内边距 | 右 | 左 |
| `border-left` | `border-inline-start` | 行首边框 | 左 | 右 |
| `border-left-width` | `border-inline-start-width` | 行首边框宽 | 左 | 右 |
| `border-top-left-radius` | `border-start-start-radius` | 块首-行首圆角 | 左上 | 右上 |
| `left`（定位） | `inset-inline-start` | 行首偏移 | 左 | 右 |
| `right`（定位） | `inset-inline-end` | 行尾偏移 | 右 | 左 |
| `text-align: left` | `text-align: start` | 行首对齐 | 左 | 右 |
| `text-align: right` | `text-align: end` | 行尾对齐 | 右 | 左 |
| `float: left` | `float: inline-start` | 行首浮动 | 左 | 右 |
| `flex-direction: row` | 默认即逻辑方向 | 主轴随 dir 反转 | → | ← |

注意两类例外：`top/bottom`、块轴方向（`margin-top` 等）没有逻辑属性的必要，照旧用；`width`/`height` 与方向无关，照旧用。stylelint 加一条规则（`property-no-unknown` 组合自定义 or 用 plugin 如 `stylelint-logical-properties` 思路）禁止物理方向属性出现在新代码，是防止回退的唯一可靠手段。

**方向性图标镜像**——先分诊再处理：

```text
需要镜像（表达了"前进/返回"的方向语义）：
  返回箭头 ←/→、chevron、面包屑分隔符 /、进度指示 →→→、
  撤销↶/重做↷、列表缩进、发送纸飞机、喇叭开口方向
不要镜像（方向无关或物理/时间约定）：
  时钟、日历、垃圾桶、放大镜、齿轮、加号、对勾、
  播放▶（媒体惯例保留 LTR）、logo、数字/代码内容
```

```css
/* 方向性图标镜像：只给明确标记的图标加，禁止一刀切 transform */
.icon--directional {
  /* LTR 下原样 */
}
[dir='rtl'] .icon--directional {
  transform: scaleX(-1); /* 水平镜像 */
}

/* 图标带文字时的间距也走逻辑属性 */
.btn {
  display: inline-flex;
  gap: 4px;
  padding-inline: 12px 16px; /* 行首 12 行尾 16，方向反转后自动正确 */
}
```

**常见坑（症状 → 根因 → 修法）**：

- 症状：切到阿拉伯语，布局整体镜像了，但弹层定位飘了（`position: fixed; left: 0` 的抽屉现在从右边推入，遮罩还在左边）。
  根因：`left/right` 物理属性不随 `dir` 反转，与逻辑属性混用后一半镜像一半不镜像。
  修法：弹层定位统一迁 `inset-inline-start`；全仓库 grep `\b(left|right)\s*:` 逐个分诊（CSS in JS 同样处理）。
- 症状：RTL 下列表里混排的英文昵称显示顺序错乱（"张三 replied to John"渲染成 "John replied to 张三" 的错觉）。
  根因：RTL 段落里嵌入 LTR 文本，Unicode 双向算法对"标点 + 混排"的组合会猜错边界。
  修法：用户生成内容一律 `<bdi>` 包裹或容器 `dir="auto"`，把方向判断交给浏览器而不是 CSS。

---

#### 10.9 工程化：key 扫描 / 类型化 key / 伪语言 / 翻译平台

国际化从"功能"变成"长期不出事的系统"，靠的是这四件工程化工具。它们共同守护一件事：**key 的一致性**（代码引用、基线包、远端包、类型定义四者对齐）。

**（一）key 扫描 lint（未使用 / 缺失检查脚本）**。思路：静态扫描代码里的 `t('...')`、`<Trans i18nKey="...">`、`useTranslation('ns')` 收集"已用 key 集合"，与基线包扁平化后的"已定义 key 集合"做双向 diff——已用未定义 = 缺失（运行时会显示 key），已定义未用 = 冗余（翻译成本浪费 + 干扰译者）。脚本版实现：

```js
// scripts/check-i18n-keys.mjs —— node scripts/check-i18n-keys.mjs；CI 中非零退出码即失败
// 升级路线：正则换 ts-morph/babel AST 解析，可消除注释/字符串里的误报，原理不变
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'src';
const LOCALE_DIR = 'src/i18n/locales';
const BASE_LNG = 'zh-CN';

// ---------- 1. 收集已定义 key：扁平化基线包 ----------
function flatten(node, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(node)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out.add(p);
  }
  return out;
}

function loadDefined() {
  const dir = path.join(LOCALE_DIR, BASE_LNG);
  const defined = new Map(); // ns -> Set<key>
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const ns = path.basename(file, '.json');
    defined.set(ns, flatten(JSON.parse(readFileSync(path.join(dir, file), 'utf8'))));
  }
  return defined;
}

// ---------- 2. 收集已用 key：扫描源码 ----------
const T_CALL = /\bt\(\s*['"`]([^'"`\n]+)['"`]/g;             // t('a.b')
const TRANS_KEY = /\bi18nKey=\{?\s*['"`]([^'"`\n]+)['"`]/g; // <Trans i18nKey="a.b" />
const NS_OF_FILE = /useTranslation\(\s*\[?\s*['"`]([^'"`]+)['"`]/g; // 文件级 ns 推断
// 动态 key 白名单：schema.label 等运行时拼接的 key 无法静态扫出，按 ns 前缀放行
const DYNAMIC_ALLOW = [/^alertRule\.field\./, /^common\.(enum|unit)\./];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

/** 在一段源码里用给定正则收集命中结果（复用 lastIndex 继续扫的写法要求每次传入同一份 code） */
function collect(re, code) {
  const hits = [];
  let m;
  while ((m = re.exec(code)) !== null) hits.push(m[1]);
  return hits;
}

function loadUsed() {
  const used = new Map(); // `${ns}:${key}` -> 引用它的文件（输出定位信息用）
  const fileNss = new Map();

  for (const file of walk(SRC_DIR)) {
    const code = readFileSync(file, 'utf8');
    // 文件级 ns 推断：该文件 useTranslation 声明了哪些 ns（没声明则归 defaultNS）
    const nss = collect(NS_OF_FILE, code);
    fileNss.set(file, nss.length ? nss : ['common']);

    const record = (rawKey) => {
      if (rawKey.includes(':')) {
        used.set(rawKey, file); // 显式 'ns:key' 写法（t('alertRule:title')）
      } else {
        for (const ns of fileNss.get(file)) used.set(`${ns}:${rawKey}`, file);
      }
    };
    for (const raw of [...collect(T_CALL, code), ...collect(TRANS_KEY, code)]) record(raw);
  }
  return used;
}

// ---------- 3. 双向 diff ----------
const defined = loadDefined();
const used = loadUsed();
const missing = [];
for (const full of used.keys()) {
  const [ns, key] = full.split(/:(.+)/);
  if (DYNAMIC_ALLOW.some((re) => re.test(`${ns}.${key}`))) continue;
  if (!defined.has(ns)) { missing.push(`未知命名空间 ${full}`); continue; }
  if (!defined.get(ns).has(key)) missing.push(`缺失 ${full}（基线包无此 key）`);
}
const unused = [];
for (const [ns, keys] of defined) {
  for (const key of keys) {
    if (!used.has(`${ns}:${key}`) && !DYNAMIC_ALLOW.some((re) => re.test(`${ns}.${key}`))) {
      unused.push(`冗余 ${ns}:${key}（代码未引用）`);
    }
  }
}

console.log(`已定义 ${[...defined.values()].reduce((s, x) => s + x.size, 0)} 个 key，已引用 ${used.size} 处`);
if (missing.length) console.error('\n[缺失] 运行时会直接显示 key，必须修复：\n' + missing.join('\n'));
if (unused.length) console.warn('\n[冗余] 翻译成本浪费，确认后删除：\n' + unused.join('\n'));
process.exit(missing.length > 0 ? 1 : 0); // 缺失阻断 CI，冗余仅警告
```

对 `common.json` 之外的命名空间同样适用（按文件遍历 locales 目录）。提取侧的标准工具是 **i18next-parser**（`npx i18next-parser --config i18next-parser.config.js`）：按 AST 提取 `t`/`Trans` 用法，自动把新 key 合并进基线包（标记 `_unused` 供冗余检测）——脚本负责"校验"，parser 负责"提取"，两者互补。另一个补充工具：翻译平台侧的 CLI（如 Crowdin 的 `crowdin-cli`、Lokalise 的 CLI）在 CI 上做"基线包与平台侧同步校验"，见本节（四）。

**（二）TS 类型化 key（`as const` + 模块增强）**。让 `t('xxx')` 的参数获得字面量联合类型：typo、删掉的 key、不在当前 ns 的 key，全部编译报错。完整写法：

```json
// tsconfig.json 需开启
{ "compilerOptions": { "resolveJsonModule": true } }
```

```ts
// src/i18n/resources.d.ts —— 用"中文基线"作为 key 的唯一真源做类型
// 原理：i18next 暴露 CustomTypeOptions 接口供项目 augment，t/useTranslation 的泛型据此收窄
import type common from './locales/zh-CN/common.json';
import type alertRule from './locales/zh-CN/alertRule.json';
import type dashboard from './locales/zh-CN/dashboard.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      alertRule: typeof alertRule;
      dashboard: typeof dashboard;
    };
  }
}
```

```ts
// 资源定义侧配合 as const（TS 文件内联资源的写法；JSON import 自带字面量类型，不需要）
import zhCommon from './locales/zh-CN/common.json';

export const resources = {
  'zh-CN': { common: zhCommon },
} as const; // as const 把推断锁到字面量层级，后续 typeof 才能拿到具体 key 而不是 string
```

```tsx
// 使用效果：
import { useTranslation } from 'react-i18next';

function Demo() {
  const { t } = useTranslation('alertRule', { keyPrefix: 'field' }); // keyPrefix 也参与类型收窄
  t('amount');        // ✔ 'alertRule.field.amount'
  t('amout');         // ✘ 编译错误：不存在于 alertRule.field 下的字面量联合
  t('title');         // ✘ 编译错误：title 在 ns 根下，不在 field 前缀内
  const { t: tCommon } = useTranslation('common');
  tCommon('action.save'); // ✔
  tCommon('save');        // ✘ 编译错误：路径少了一级
  return <span>{t('amount')}</span>;
}
```

一个重要的边界认知：**类型化 key 只守护"代码里写死的 key"，不约束远端覆盖包**——远端是运行时数据，TS 管不到。这恰好与双包架构自洽：类型保证"基线里必有这个 key"，而远端的语义是"覆盖已有 key"，所以远端永远不需要提供"新增的必需 key"，类型与运行时各守一层，互不越界。

**（三）伪语言测试（pseudo-loc）**。原理：在开发环境造一门"伪语言"（前缀标记 + 重音字符 + **拉长约 40%** 的填充），把 UI 切到伪语言走一遍，所有"按中文两三个字定宽"的按钮、标签、导航全部当场溢出——**在真翻译进来之前**暴露布局的长度脆弱性。德语平均比英语长 35%，中文到德语常翻 3-5 倍长度，伪语言用 40% 的确定性膨胀把这个风险提前变成肉眼可见的 bug。

```ts
// src/i18n/pseudoLoc.ts —— 仅开发环境使用
const LOWER: Record<string, string> = {
  a: 'à', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î',
  j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'õ', p: 'ƥ', q: 'ǫ', r: 'ŕ',
  s: 'š', t: 'ţ', u: 'ů', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ẑ',
};

/** 单条文案伪化：重音化 + 对称填充拉长 expandRatio + 括号标记 */
export function pseudoLoc(text: string, expandRatio = 0.4): string {
  // 1) 拉丁字符换重音形态：肉眼立刻识别"这是伪语言"，同时模拟变音符号的行高压力
  const accented = Array.from(text, (ch) => {
    const mapped = LOWER[ch.toLowerCase()];
    if (!mapped) return ch; // 中文、数字、标点原样
    return ch === ch.toUpperCase() ? mapped.toUpperCase() : mapped;
  }).join('');
  // 2) 按比例拉长：两侧对称填充，模拟德语/芬兰语复合词的长度
  const padLen = Math.max(1, Math.round((accented.length * expandRatio) / 2));
  const pad = '≈'.repeat(padLen);
  // 3) 方括号包裹：截图/录屏里一眼可辨，防止伪语言内容混进真文案
  return `[${pad}${accented}${pad}]`;
}

/** 递归伪化整棵语言包树（叶子才处理） */
export function pseudoTransformTree(node: unknown): unknown {
  if (typeof node === 'string') return pseudoLoc(node);
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = pseudoTransformTree(v);
    return out;
  }
  return node;
}
```

接入方式——注册一门开发专属语言，切换器只在 DEV 暴露：

```ts
// src/i18n/index.ts 末尾（模块顶层 await，目标 ES2022）
if (import.meta.env.DEV) {
  // 以英文包为底（拉丁字母才能吃到重音化），生成伪语言并注册
  const enCommon = await import('./locales/en-US/common.json');
  i18n.addResourceBundle('zz-PSEUDO', 'common', pseudoTransformTree(enCommon.default), true, true);
}
```

```tsx
// 语言切换器的开发选项（与 10.5 的 LanguageSwitcher 合并使用）
const OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  ...(import.meta.env.DEV ? [{ value: 'zz-PSEUDO', label: '🧪 Pseudo (布局压力测试)' }] : []),
];
```

两点务实说明：伪化对中文无效（中文没有重音形态、填充符也只能机械加长），所以中文产品的做法是**伪化英文包**——用"膨胀后的最长语言"做全局压力测试；更深一层，把"zz-PSEUDO 语言全页面截图"挂进 Playwright CI，布局溢出就从"人肉巡检"变成"像素级断言"。另外伪语言还有一种冷门用法：**检测硬编码英文**——伪化后页面上仍是"正常英文"的文案，一定是绕过 i18n 层写死的（对应坑 2）。

**（四）翻译平台流程概念（Crowdin / Lokalise 的 key 同步机制）**。双包架构里"远端覆盖包"的工业级来源就是这类平台。流程与机制概念：

```text
代码仓（zh-CN 基线包 = 源语言）
   │  ① CI 上传 sources（crowdin-cli upload / lokalise2 file upload，按 key 对齐历史）
   ▼
翻译平台：key 是稳定 ID；记忆库（TM）自动复用历史译法；MT 预翻；译者按 key 领任务
   │  ② 导出两条路径：
   │     a) PR 回源码仓 → 更新各语言基线包 → 随版本发布（低频、稳）
   │     b) OTA/CDN 分发 → 即远端覆盖包（高频、即时生效，对接 10.4 的 applyRemoteLocales）
   ▼
线上：基线兜底 + 远端优先
```

key 同步机制的三个要点：**key 是稳定 ID**——重命名 key 在平台侧等价于"删除 + 新增"，翻译记忆全部断链，所以约定"key 一旦下发线上永不改名，只加新 key、废弃 key 打标停用"；**双向校验**——CI 里 `download --dry-run` 对比平台与仓库 diff，防止有人在平台直接改了源语言文案却没人审；**上下文**——平台的截图/评论挂在 key 上（配合 10.7 的消歧），译者的歧义在平台内消化而不是甩回开发群。

---

#### 10.10 与 Schema 联动：动态表单的国际化

**是什么**。Schema 驱动体系（本篇场景 4、以及《进阶大纲》§3 的 Setter）里，表单结构是运行时数据。联动方式：**schema 的 `label`/`placeholder`/`description` 字段不存文案，存 i18n key**，渲染器渲染时翻译。

**为什么需要**。schema 若直接存中文文案，多语言就断了：一份 schema 只能服务一种语言；要么为每种语言复制一份 schema（字段变更要改 N 份，必然漂移）。存 key 则 schema 与语言正交——结构只有一份，语言是渲染参数。另一个收益：**租户定制**走 10.4 的远端覆盖包就能改表单文案（覆盖 `alertRule.field.amount` 这个 key），不需要动 schema 本身。

**怎么做（机制分步）**：

1. schema 约定：文案类字段（label 等）一律是"合法 i18n key"，编辑器侧（场景 4 的 Schema 编辑器）用下拉选择已有 key 而不是自由文本，从源头防脏数据；
2. 渲染器在**渲染期**调用 `t(field.label)`——不是加载期翻译一次存起来；
3. 语言切换的"整体重渲染"不需要额外代码：渲染器组件调用了 `useTranslation`，`languageChanged` 事件自动触发它们重渲染，key 重新走 `t`，文案即变。

**代码示例**：

```ts
// src/modules/alert-rule/schema.ts —— label 存 key
export interface FieldSchema {
  name: string;
  /** 约定：必须是 alertRule 命名空间下已存在的 key（类型化 key 守护，见 10.9） */
  label: string;
  type: 'number' | 'string' | 'select';
  required?: boolean;
}

export const alertRuleSchema: FieldSchema[] = [
  { name: 'amount', label: 'field.amount', type: 'number', required: true }, // → t 后 "订单金额"
  { name: 'city', label: 'field.city', type: 'select' },                     // → "下单城市"
];
```

```tsx
// src/modules/alert-rule/SchemaField.tsx —— 渲染期翻译 + keyPrefix
import { useTranslation } from 'react-i18next';
import type { FieldSchema } from './schema';
import { ValueEditor } from './ValueEditor';

export function SchemaField({ field }: { field: FieldSchema }) {
  // keyPrefix 让 schema 里的 label 只需存 'field.amount' 的尾段，类型也随 keyPrefix 收窄
  const { t } = useTranslation('alertRule', { keyPrefix: '' });
  return (
    <div className="field">
      <label htmlFor={field.name}>{t(field.label)}</label>
      {/* 校验错误文案同样走 key：errors.required = "{label} 为必填项"，label 复数嵌套插值 */}
      <ValueEditor field={field} id={field.name} />
    </div>
  );
}
```

**切语言后表单整体重渲染的机制与一个高发坑**。机制如上：订阅驱动，无需手动刷新。坑在"预翻译缓存"——任何把 `t()` 结果**存进数据**的地方都会脱离订阅：

```tsx
// ❌ 症状代码：切语言后列头不变，仍是旧语言
function OrderTable() {
  const { t } = useTranslation('common');
  const columns = useMemo(
    () => [
      { title: t('order.col.amount'), dataIndex: 'amount' },
      { title: t('order.col.city'), dataIndex: 'city' },
    ],
    [], // ← 根因：依赖数组为空，t 在首语言时被求值一次，结果字符串被冻结
  );
  return <Table columns={columns} />;
}

// ✅ 修法一：把 i18n.language 纳入依赖，语言变了列定义重算
function OrderTable() {
  const { t, i18n } = useTranslation('common');
  const columns = useMemo(
    () => [
      { title: t('order.col.amount'), dataIndex: 'amount' },
      { title: t('order.col.city'), dataIndex: 'city' },
    ],
    [i18n.language, t], // 语言变化 → memo 失效 → 重算 → 新文案
  );
  return <Table columns={columns} />;
}

// ✅ 修法二（更优）：列定义只存 key，渲染期翻译——数据与文案彻底解耦
{ titleKey: 'order.col.amount', dataIndex: 'amount' }
// Table 的 render/title 处统一 t(titleKey)
```

修法二是 schema 联动的正统姿势：**数据里永远只有 key，翻译只发生在渲染的最后一刻**。这也解释了为什么 schema 存 key 是唯一正确解——key 是数据，文案是视图。

---

### 坑

- ⚠️ 中文拼接写法（"共" + n + "条"）无法翻译 → 必须 ICU
- ⚠️ 初期写死中文，回头改造是地狱 → 第一天就上 i18n
- ⚠️ 德语等长文案撑爆按钮布局
- ⚠️ 远端语言包格式错误把整站文案打挂 → 合并前校验 + 基线兜底

四个坑不是并列的"注意事项"，而是一条时间线上的四个阶段：**写代码时**的拼接（坑 1）→ **项目早期**的欠债（坑 2）→ **接入新语言时**的布局（坑 3）→ **上线动态包之后**的容错（坑 4）。逐个按"症状 → 根因 → 修法"展开。

#### 坑 1：中文拼接写法无法翻译

- **症状**：中文一切正常；上英文后出现"Total 3 items"勉强能用，但 1 条时显示"Total 1 items"（单复数错）；上俄语/阿拉伯语后数量词全错；日语语序别扭（"合計 3 件の注文"被拼成"3 合计 件 订单"式的怪句）。另一个变体：不同语言下日期与数字的千分位、货币符号位置各写一套 switch，越写越多。
- **根因**：把中文的语法特性当成了世界通用特性。具体三条（10.2 已详述）：①语序假设——拼接假设"数字夹在前后缀之间"，多数语言不成立；②复数类别——俄语 4 类、阿拉伯语 6 类的词形变化在拼接模型里没有表达位置；③数字格式化——`n.toString()` 不走 locale。本质是**把"翻译单位"搞错了：句子才是翻译单位，碎片不是**。
- **修法**：一律改为整句 key + ICU MessageFormat（10.2 全节）。落地三条纪律：code review 见到 `+ n +` 或模板串里夹变量直接打回；存量代码用 grep `'[^']*'\s*\+` 找疑似拼接点人工分诊；对数量词类 key 补多语言单测（count 取 0/1/2/5/21 断言渲染快照），因为这类错误编译期和 lint 都发现不了，只有渲染能暴露。

#### 坑 2：初期写死中文，回头改造是地狱

- **症状**：项目"先做国内"，三个月后宣布出海。全量扫描发现 4000+ 处中文散落在 JSX 文本、`message: '成功'` 对象字面量、`placeholder="请输入"` 属性、报错字符串里。改造预估三周，实际两个月：每处要判断语境起 key（10.7 消歧）、要处理拼接改 ICU（坑 1）、要处理藏在三元表达式和工具函数里的深层文案；改造期间新旧两种写法并存，merge 冲突不断。
- **根因**：把 i18n 当"翻译需求"而不是"架构约束"。写死中文的成本是 0，改造的成本是 O(全部文案数) 且要补做所有本该顺手做的语境判断——**欠的是认知债，还的是全量人工**。
- **修法**：分三层。**事前**：第一天就接 i18n（哪怕只有中文一种语言），空翻译层也比没层强——`t()` 从第一行业务代码就存在；用 10.9 的扫描脚本加一条"裸中文检测"（扫 JSXText 与字符串字面量中的 CJK 字符，白名单放行正则/单位/测试），新代码零容忍。**事中**（已经写死、尚未出海）：按页面分批改造，先改高频页面，改造一个页面就把该页面的 key 归入对应 namespace（顺手完成 10.3 拆包）。**配套**：翻译层就位后立即启用 pseudo-loc（10.9），让"布局从未考虑过长度"的存量问题同步暴露，而不是等德语翻译回来才炸。

```js
// scripts/no-raw-chinese.mjs —— 坑 2 的自动化守护：扫描写死的 CJK 文案（节选核心逻辑）
import { readFileSync } from 'node:fs';
const CJK = /[\u4e00-\u9fff]/;
const ALLOW = [/\/\*[\s\S]*?\*\//g, /\/\/[^\n]*/g]; // 先剥注释再扫
for (const file of walk('src')) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  let code = readFileSync(file, 'utf8');
  for (const re of ALLOW) code = code.replace(re, '');
  if (CJK.test(code)) {
    const line = code.split('\n').findIndex((l) => CJK.test(l)) + 1;
    console.warn(`[raw-chinese] ${file}:${line} 存在写死的中文，请改为 i18n key`);
  }
}
// JSX 文本、字符串字面量都会命中；单位（"GB"）、注释已剥；正则匹配中文日期等场景进白名单配置
```

#### 坑 3：德语等长文案撑爆按钮布局

- **症状**：中文验收全绿。上线德语第一周收到截图：工具栏按钮 "Speichern" 没事，但"Einstellungen zurücksetzen"（重置设置）把按钮撑成两行或直接溢出被 `overflow: hidden` 裁掉一半字母；侧边导航"导出"（2 字）变"Exportieren"（13 字）后换行，整栏菜单高度翻倍；表格操作列三个按钮挤在一起触发省略号。芬兰语、希腊语同样重灾区。
- **根因**：**布局是按中文的字符宽度定的**。中文信息密度极高（"重置设置" 4 字），德语是复合词语言，同样语义平均 3-5 倍长度；而 CSS 里写死了 `width: 72px`、`max-width`、单行 `nowrap + ellipsis`。固定宽度把"文案长度"这个变量焊死成了中文常量。
- **修法**：三个层面。**CSS 层**：按钮/标签禁 `width` 定宽，改 `min-width + padding` 自适应；必须限制时用 `max-width` + 提示完整的 `title` 属性 + `text-overflow: ellipsis`（注意：截断的按钮等于功能消失，只用于次级文案）；flex 布局给文本节点加 `min-width: 0` 才能让省略号生效；允许换行的场景检查 `line-height` 与容器高度的联动。**流程层**：pseudo-loc 40% 拉长（10.9）进日常开发与 CI 截图，让"长度"从验收惊喜变成日常约束；设计侧接受"按钮宽度不一致"（等宽按钮本来就是对拉丁文字的不合理假设）。**文案层**：和译者约定 UI 控件文案的字符预算（如按钮 ≤ 20 字符），超长时译者给缩写方案——i18n 是产品行为，不只是技术改造。

```css
/* ❌ 症状代码：按中文定宽，德语必炸 */
.toolbar-btn { width: 72px; white-space: nowrap; overflow: hidden; }

/* ✅ 修法：min-width 自适应 + 允许换行的兜底 */
.toolbar-btn {
  min-width: 72px;            /* 只定下限，不定上限 */
  padding-inline: 12px 20px;  /* 逻辑属性，RTL 顺带正确（10.8） */
  white-space: normal;        /* 允许两行，line-height 撑高按钮而非溢出 */
}
.ellipsis-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 坑 4：远端语言包格式错误把整站文案打挂

- **症状**：下午 3 点运营在 CMS 改了一条文案并发布，10 分钟后客诉涌入：整站按钮显示成 key（`action.save`）、部分页面白屏、控制台刷 `Cannot read properties of undefined`。回滚 CMS 无效（因为坏包已进客户端内存/CDN 缓存）；前端发版回滚要 20 分钟。根因排查发现 CMS 的"富文本编辑器"把某个 value 存成了 `{"html": "..."}` 对象而非 string——一个非 string 叶子。
- **根因**：三个假设叠加出错。①信任假设——远端数据被当成可信输入直接 `addResourceBundle`，没有任何校验；②爆炸半径假设——一个坏 value 只该影响一个 key，实际注入后整棵资源树结构异常，所有查询该 ns 的 `t` 全部 miss 或抛错；③缓存假设——坏包进入了 CDN 与客户端内存，"回滚源头"不等于"收回坏包"。**远端语言包是全站所有文案的唯一上游，它是单点，且是运行时单点**——静态包坏不了（有构建与测试把关），远端包一定会坏（CMS 的人肉操作没有类型系统）。
- **修法**：合并前校验 + 基线兜底，即 10.4 的完整实现。浓缩为必须守住的时序：

```text
远端包到达
  │
  ├─ try: JSON.parse
  │    └─ 失败 → warn + 全量用基线（网络/格式问题按降级处理，不告警）   ┐
  │                                                                    ├ 合并永远不裸奔
  ├─ validateRemotePayload（顶层形状 / version / packages 结构）        │ 基线永远在内存
  │    └─ 失败 → error 上报 + 丢弃整个 payload + 用基线                 ┘
  │
  ├─ 逐语言 validateNamespacePack（叶子必须 string / 禁 __proto__ 等键 / 路径白名单）
  │    └─ 某语言失败 → 只回退该语言，其他语言照常生效（爆炸半径从"整站"缩到"一个语言"）
  │
  └─ deepMerge(基线, 远端) → addResourceBundle 注入 → emit 刷新
       （校验已保证结构安全，注入才执行——顺序不可颠倒）
```

三条补充加固：**CDN 侧发布卡口**——平台导出到 CDN 前跑同一个校验函数（校验逻辑放共享包，前端与发布流水线复用），坏包根本到不了线上；**版本协商**——客户端按 `version` 拉增量（`?since=`），坏版本可被精确跳过；**可灰度**——远端包支持按租户/百分比发布，新包先到内部租户，把"整站打挂"的概率再砍一个数量级。这个坑是双包架构存在的根本理由：**基线包买到的不是"保底文案"，是"远端随便坏、站点都不倒"的鲁棒性**。

---

对标：react-i18next、FormatJS、lingui。

- **react-i18next**（本章主线）：生态最全——namespace、backend 插件、ICU 插件、Trans、TypeScript CustomTypeOptions、Susense 支持、调试工具一应俱全；学习它时精读 `useTranslation` 的实现（`useSyncExternalStore` 订阅 `languageChanged`），能彻底理解"切语言全站重渲染"的机制边界（哪些写法不重渲染，见 10.10 的坑）。
- **FormatJS**（react-intl）：ICU 的正统阵营——`<FormattedMessage>` 的消息格式就是 ICU MessageFormat 本体，配套 `eslint-plugin-formatjs`（ICU 语法 lint）、babel 插件（编译期提取 key）、`@formatjs/intl` 的完整 API。如果团队从第一天就全量 ICU、且主要面向 Web 标准，它的工具链比 i18next 的"插件拼装"更一体。迁移成本高，已用 i18next 的团队重点借鉴它的 lint 与提取工具。
- **lingui**：编译期阵营代表——`t` 宏 + swc/babel 插件在编译期完成提取与编译，运行时极小、消息天然 ICU、TS 体验好。对标点是它的设计取舍："把尽可能多的工作移到编译期"换运行时性能与包体，代价是工具链约束（必须过它的编译器）。三个库的选型本质是同一个问题的三个答案：**动态性（i18next）vs 标准（FormatJS）vs 编译期（lingui）**——而 10.4 的"基线 + 远端合并"策略在三者上都能落地，因为它是架构层的，不绑定任何库。

---

## 组合毕业项目：多租户 SaaS 控制台

把 Part B + 场景 3 组装成一个完整企业 SaaS 前端底座：

```text
登录 → 并行拉取[权限(8) / 租户主题(9) / 语言包(10)] → 动态路由生成+权限过滤
     → 告警规则配置页(3: 查询构建器) → 保存为 json-logic 给后端执行
```

这一套覆盖了企业 SaaS 的"平台层"标准能力，面试讲述时是一个完整的架构故事。

原文这段的精髓在"组装"两个字：8/9/10 三个场景各自做成 Provider/模块并不难，难的是**它们在启动阶段互相纠缠**——路由生成依赖权限、文案依赖语言包、皮肤依赖租户配置、而业务页（场景 3）同时依赖前三者。毕业项目要练的就是把这段时序工程化。下面把 ASCII 图的每一段箭头展开成完整的启动时序说明。

### 0. 分层定位：平台层与业务层在哪里分界

动手前先明确装配边界，这决定目录怎么切（见第 3 节）：

- **平台层（platform/）**：与具体业务无关、可整体复用到任何 SaaS 产品的能力——权限、租户主题、i18n、启动编排。它们只认识"配置数据"，不认识"告警规则"。
- **业务层（modules/）**：告警规则配置这类领域功能。业务层**只消费平台层暴露的 API**（`useCan`、`useTranslation`、语义 token），永远不反向触碰平台层的实现。
- **装配层（app/ + router/）**：把平台层初始化好、把业务模块挂上路由的"胶水"。启动时序（下文）全部发生在这一层。

这样分层的检验标准：把 `modules/alert-rule` 整个目录删掉，平台层照常启动；把 `platform/` 拷到另一个 SaaS 项目，只改 fetcher 的 URL 就能跑。

### 1. 启动时序总览

先把 ASCII 图放大成带编号的时序，再逐段实现：

```text
(1) 登录页
      │ 拿到 token（并从登录响应/域名中得知 tenantId）
      ▼
(2) bootstrap 启动编排：Promise.allSettled 并行拉三份配置
      ├─ ① 权限    GET /api/me/permissions      —— 阻塞级：重试 1 次，仍失败 → 错误页
      ├─ ② 租户主题 GET /api/tenant/theme        —— 降级级：失败 → 默认主题
      └─ ③ 语言包  GET /api/i18n/overrides       —— 降级级：失败 → 基线包（10.4 内建）
      ▼
(3) 注入：权限进 AuthProvider / 主题写 CSS 变量 + ConfigProvider / 语言包已进 i18n 实例
      ▼
(4) 动态路由生成：单一路由表 × 权限过滤 → <Route> 树 + 菜单（同一数据源）
      ▼
(5) 进入 /alert-rule：懒加载 alertRule 命名空间 + 页面组件 → 查询构建器（场景 3）
      ▼
(6) 保存：条件树 → json-logic → POST /api/alert-rules → 后端订阅数据流执行告警
```

关键设计决策先行：**为什么三份配置用 `Promise.allSettled` 而不是 `Promise.all`**——`all` 是"一荣俱荣、一损俱损"，主题接口抖动会把权限正常的用户也挡在门外；`allSettled` 让三份配置的失败彼此隔离，然后按"失败等级"分别处理。这是整个启动时序的灵魂。

### 2. 启动时序逐段详解

#### 2.1 登录与引导（时序第 1 段）

```tsx
// src/pages/login/LoginPage.tsx —— 只做两件事：换 token、确定租户
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@acme.com', password: 'demo123' }), // 实际项目接表单
      });
      if (!res.ok) throw new Error(`login failed: ${res.status}`);
      const data = (await res.json()) as { token: string; tenantId: string };
      // token 与租户身份落本地：后续所有请求的鉴权头与租户上下文都从这来
      window.localStorage.setItem('app:token', data.token);
      window.localStorage.setItem('app:tenant', data.tenantId);
      navigate('/', { replace: true }); // 进入 App，触发第 2 段 bootstrap
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
    </form>
  );
}
```

#### 2.2 bootstrap：并行拉取与失败策略（时序第 2 段，项目核心）

三份配置的**失败等级表**——先定策略再写代码，这是"平台层"思考方式：

| 配置 | 失败等级 | 策略 | 为什么是这个等级 |
|---|---|---|---|
| ① 权限 | **阻塞** | 超时 5s + 重试 1 次 → 仍失败 → 错误页（重试/退出登录） | 没有权限集，路由无法过滤、菜单无法生成，"进入哪个页面"都无法决定；且权限缺失可能导致越权 UI 暴露，宁可拒绝服务 |
| ② 租户主题 | 降级 | 超时 5s，失败 → 默认品牌主题，后台静默补拉 | 视觉定制缺失不阻碍任何功能；把用户挡在外面换一块品牌色，得不偿失 |
| ③ 远端语言包 | 降级 | 超时内建（10.4），失败 → 基线包 | 10.4 的双包架构已经把"远端失败"设计成预期路径，这里零额外代码 |

```ts
// src/platform/bootstrap/bootstrap.ts —— 启动编排：唯一的"知道三份配置都存在"的地方
import { fetchPermissions, fetchTenantTheme, type TenantThemeTokens } from './fetchers';
import { applyThemeTokens } from '../theme/apply';
import { applyRemoteLocales, type RemoteStatus } from '../i18n/applyRemote';
import { SUPPORTED_LNGS } from '../i18n';

export interface BootstrapOutcome {
  auth: { ok: true; permissions: Set<string> } | { ok: false; reason: string };
  theme: { ok: boolean; tokens: TenantThemeTokens | null };
  locale: { status: RemoteStatus; version?: string };
  elapsedMs: number;
}

/** 带超时的包装：三份配置都不许把启动卡成黑洞。
 *  注意：race 超时只是"不再等待"，底层请求仍会跑完（fetcher 内部如需真取消，请用 AbortSignal 贯穿）。 */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/** 只给"值得重试"的请求用：权限是阻塞级所以重试，两个降级级不值得让用户多等 */
async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= times; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err; // 上一轮失败，稍等后重试（这里简单立刻重试；生产可加退避）
    }
  }
  throw lastError;
}

export async function bootstrap(tenantId: string): Promise<BootstrapOutcome> {
  const startedAt = performance.now();

  // ---- 三份配置并行，失败互不传染（Promise.allSettled 是刻意的，见第 1 节说明）----
  const [permRes, themeRes, localeRes] = await Promise.allSettled([
    withTimeout(retry(() => fetchPermissions(), 1), 5000),          // 阻塞级：重试 1 次
    withTimeout(fetchTenantTheme(tenantId), 5000),                   // 降级级：不重试
    applyRemoteLocales(`/api/i18n/overrides?app=console`, SUPPORTED_LNGS, 5000), // 自带降级，永不 reject
  ]);

  // ---- 权限：阻塞级，失败即返回错误页所需信息 ----
  const auth: BootstrapOutcome['auth'] =
    permRes.status === 'fulfilled'
      ? { ok: true, permissions: new Set(permRes.value) }
      : { ok: false, reason: String(permRes.reason) };

  // ---- 主题：降级级，失败用 null（调用方回落默认主题），但先尽力应用远端结果 ----
  let theme: BootstrapOutcome['theme'] = { ok: false, tokens: null };
  if (themeRes.status === 'fulfilled') {
    theme = { ok: true, tokens: themeRes.value };
  } else {
    console.warn('[bootstrap] 租户主题拉取失败，使用默认主题', themeRes.reason);
  }
  if (theme.tokens) applyThemeTokens(theme.tokens); // 场景 9：写 CSS 变量批，立即生效

  // ---- 语言包：降级级，applyRemoteLocales 内部已完成"校验+合并+注入"，这里只收结果 ----
  const locale: BootstrapOutcome['locale'] =
    localeRes.status === 'fulfilled'
      ? { status: localeRes.value.status, version: localeRes.value.version }
      : { status: 'fetch-failed' }; // 理论上不发生（applyRemoteLocales 捕获一切），防御性兜底

  return { auth, theme, locale, elapsedMs: performance.now() - startedAt };
}
```

```ts
// src/platform/bootstrap/fetchers.ts —— 三个数据源的具体形态
export interface TenantThemeTokens {
  brand: { primary: string; primaryHover: string };
  logo: string;
  radius: string;
}

async function authedFetch(url: string): Promise<Response> {
  const token = window.localStorage.getItem('app:token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res;
}

export async function fetchPermissions(): Promise<string[]> {
  const res = await authedFetch('/api/me/permissions');
  const data = (await res.json()) as { permissions: string[] };
  return data.permissions; // 扁平权限码数组：['alert:rule:view', 'alert:rule:edit', ...]
}

export async function fetchTenantTheme(tenantId: string): Promise<TenantThemeTokens> {
  const res = await authedFetch(`/api/tenant/${tenantId}/theme`);
  return (await res.json()) as TenantThemeTokens;
}
```

App 侧的门禁装配——bootstrap 期间整页骨架（这也顺带完成了场景 9 的 FOUC 防治：主题未决时不渲染真实内容）：

```tsx
// src/app/App.tsx —— 启动门禁：三态（加载中 / 权限失败 / 正常进入）
import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { bootstrap, type BootstrapOutcome } from '../platform/bootstrap/bootstrap';
import { AuthProvider } from '../platform/auth/AuthProvider';
import { AppRouter } from '../router/AppRouter';
import { tenantThemeToAntd } from '../platform/theme/apply';

function getTenantId(): string {
  return window.localStorage.getItem('app:tenant') ?? 'acme';
}

export function App() {
  const [outcome, setOutcome] = useState<BootstrapOutcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setOutcome(null); // 重试时先回到骨架态
    void bootstrap(getTenantId()).then(setOutcome);
  }, [attempt]);

  // 状态一：配置未决 → 骨架屏（不许白屏，也不许无主题的真实内容闪现）
  if (!outcome) return <BootstrapSkeleton />;

  // 状态二：阻塞级失败 → 明确的错误页，给"重试"出路
  if (!outcome.auth.ok) {
    return (
      <div className="bootstrap-error">
        <p>权限加载失败，无法进入控制台</p>
        <p className="bootstrap-error__reason">{outcome.auth.reason}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>重试</button>
      </div>
    );
  }

  // 状态三：正常进入。降级级失败（主题/语言包）不影响走到这里
  return (
    <AuthProvider permissions={outcome.auth.permissions}>
      <ConfigProvider theme={tenantThemeToAntd(outcome.theme.tokens)}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ConfigProvider>
    </AuthProvider>
  );
}

function BootstrapSkeleton() {
  return (
    <div className="bootstrap-skeleton" aria-busy="true">
      <div className="bootstrap-skeleton__sidebar" />
      <div className="bootstrap-skeleton__main" />
    </div>
  );
}
```

#### 2.3 注入：三份配置各自落到哪里（时序第 3 段）

| 配置 | 注入方式 | 消费方 | 详见 |
|---|---|---|---|
| 权限 | `AuthProvider` 的 Context 持有 `Set<string>` | `useCan()` / `<Can>` / 路由过滤 | 场景 8 |
| 主题 | `applyThemeTokens` 写 CSS 变量批 + antd `ConfigProvider theme` | 所有组件（只消费语义 token） | 场景 9 |
| 语言包 | `applyRemoteLocales` 已把合并包写进 i18n 实例资源树 | 所有 `useTranslation` 组件 | 场景 10 |

注意三者的注入时机不同：语言包在 bootstrap 内部完成（2.2 里 applyRemoteLocales 自含）；主题在 bootstrap 返回后、渲染前同步写（CSS 变量写入是同步的，保证首帧正确）；权限必须先于路由生成（2.4 的第一行就是它）。

#### 2.4 动态路由生成与权限过滤（时序第 4 段）

单一数据源原则（场景 8 第 3 条）：路由表是唯一真源，路由守卫、菜单、面包屑全部从它派生——三处永远一致，散落维护是最大灾难。

```ts
// src/router/routes.ts —— 唯一的路由数据源
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { lazyLoadNamespace } from '../platform/i18n/lazyLoad';
import i18n from '../platform/i18n';

export interface AppRouteMeta {
  /** 菜单/面包屑标题：存 i18n key（场景 10 与场景 8 的交叉点） */
  titleKey: string;
  /** 无此字段 = 登录即可见；有则校验权限码 */
  permission?: string;
  hideInMenu?: boolean;
}

export interface AppRoute {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  /** 该路由依赖的 i18n 命名空间（场景 10：路由级懒加载） */
  ns: string;
  meta: AppRouteMeta;
  children?: AppRoute[];
}

/** 组件懒加载与 ns 懒加载合并：首帧就有文案（10.3 模式 A） */
const withNs = (ns: string, load: () => Promise<{ default: ComponentType }>) =>
  lazy(async () => {
    await lazyLoadNamespace(i18n.language, ns);
    return load();
  });

export const routes: AppRoute[] = [
  {
    path: '/dashboard',
    element: withNs('dashboard', () => import('../modules/dashboard/DashboardPage')),
    ns: 'dashboard',
    meta: { titleKey: 'menu:dashboard', permission: 'dashboard:view' },
  },
  {
    path: '/alert-rule',
    element: withNs('alertRule', () => import('../modules/alert-rule/AlertRulePage')),
    ns: 'alertRule',
    meta: { titleKey: 'menu:alertRule', permission: 'alert:rule:view' },
  },
];

/** 权限过滤：递归剔除无权路由（菜单生成复用同一函数，见 AppRouter） */
export function filterRoutesByPermission(
  routes: AppRoute[],
  can: (permission: string) => boolean,
): AppRoute[] {
  return routes
    .filter((r) => !r.meta.permission || can(r.meta.permission))
    .map((r) => (r.children ? { ...r, children: filterRoutesByPermission(r.children, can) } : r));
}
```

```tsx
// src/router/AppRouter.tsx —— 路由树 + 菜单 + 403 兜底，全部从 routes 派生
import { Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../platform/auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import { filterRoutesByPermission, routes } from './routes';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { PageSkeleton } from '../components/PageSkeleton';

export function AppRouter() {
  const { can } = useAuth();
  // 语言切换不重建路由表（路径与权限都不变），只重算菜单文案 → 依赖里不放 i18n.language
  const visibleRoutes = useMemo(() => filterRoutesByPermission(routes, can), [can]);

  return (
    <div className="app-shell">
      <SideMenu routes={visibleRoutes} />
      <main>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {visibleRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<r.element />} />
            ))}
            {/* 有权限语义的兜底：直接访问无权路由 → 403 而不是静默跳走（用户需要知道"没权限"） */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

/** 菜单：同一数据源派生（场景 8"三处一致"的另外两处是守卫和面包屑） */
function SideMenu({ routes }: { routes: ReturnType<typeof filterRoutesByPermission> }) {
  const { t } = useTranslation('menu');
  const location = useLocation();
  return (
    <nav className="side-menu">
      {routes
        .filter((r) => !r.meta.hideInMenu)
        .map((r) => (
          <a
            key={r.path}
            href={`#${r.path}`}
            aria-current={location.pathname === r.path ? 'page' : undefined}
          >
            {t(r.meta.titleKey.replace(/^menu:/, ''))} {/* titleKey 约定挂在 menu ns 下 */}
          </a>
        ))}
    </nav>
  );
}
```

（真实项目把 `<a href="#...">` 换成 react-router 的 `Link`；上面为聚焦主干省去菜单组件库细节。）守卫的另一半：`AlertRulePage` 内部对**按钮级**动作再用 `useCan('alert:rule:edit')` 禁用"保存"——路由级挡"进不来"，按钮级挡"进来了改不了"，两层各司其职（场景 8 第 4/5 条）。

#### 2.5 告警规则配置页（时序第 5 段，场景 3 的组装点）

路由命中 `/alert-rule` 后：`withNs('alertRule', ...)` 先加载语言包 chunk 再加载组件 chunk（组件首帧就有文案）；页面主体是场景 3 的查询构建器。这里是字段元数据与 i18n 的另一个交叉点——字段声明里存 key：

```ts
// src/modules/alert-rule/meta.ts —— 字段元数据：label 是 i18n key（10.10 联动）
import type { FieldMeta } from './types';

export const FIELD_META: FieldMeta[] = [
  {
    name: 'amount',
    type: 'number',
    labelKey: 'field.amount', // → t('field.amount') = "订单金额"
    operators: ['>', '>=', '<', '<=', 'between'],
    valueEditor: 'input',
  },
  {
    name: 'city',
    type: 'string',
    labelKey: 'field.city', // → "下单城市"
    operators: ['in', '='],
    valueEditor: 'multi-select',
    options: [
      { labelKey: 'city.bj', value: '北京' },
      { labelKey: 'city.sh', value: '上海' },
    ],
  },
];
```

```tsx
// src/modules/alert-rule/AlertRulePage.tsx —— 页面骨架：构建器 + 试运行 + 保存
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jsonLogic from 'json-logic-js';
import { useAuth } from '../../platform/auth/AuthProvider';
import { QueryBuilder } from './QueryBuilder';
import { toJsonLogic } from './toJsonLogic';
import { FIELD_META } from './meta';
import type { ConditionNode } from './types';

const SAMPLE_DATA = { amount: 320, city: '上海' }; // 试运行样例数据

export function AlertRulePage() {
  const { t } = useTranslation('alertRule');
  const { can } = useAuth();
  const editable = can('alert:rule:edit');

  const [tree, setTree] = useState<ConditionNode>({
    combinator: 'and',
    conditions: [{ field: 'amount', operator: '>', value: 100 }],
  });
  const [saving, setSaving] = useState(false);

  const logic = useMemo(() => toJsonLogic(tree), [tree]);      // 条件树 → json-logic
  const sampleHit = useMemo(() => jsonLogic.apply(logic, SAMPLE_DATA) === true, [logic]); // 前端即时试运行

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${window.localStorage.getItem('app:token')}` },
        body: JSON.stringify({ name: '高额订单告警', logic, enabled: true }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>{t('title')}</h1>
      <QueryBuilder node={tree} onChange={setTree} fields={FIELD_META} />
      <aside className="try-run" data-hit={sampleHit}>
        <pre>{JSON.stringify(logic, null, 2)}</pre>
        <p>{sampleHit ? t('tryRun.hit') : t('tryRun.miss')}（样例 {JSON.stringify(SAMPLE_DATA)}）</p>
      </aside>
      <button disabled={!editable || saving} onClick={() => void handleSave()}>
        {t('common:action.save')}
      </button>
    </section>
  );
}
```

#### 2.6 保存：条件树 → json-logic → 后端执行（时序第 6 段）

前后端契约的关键一环（场景 3 第 5 条"协议转换层"）：前端配置的是**条件树**（人好编辑），传输与执行用 **json-logic**（机器好执行、语言无关、后端有成熟实现）。转换器是纯函数，可单测：

```ts
// src/modules/alert-rule/toJsonLogic.ts —— 条件树 → json-logic（场景 3 协议转换层）
import type { ConditionNode } from './types';

type JsonLogic = Record<string, unknown>;

export function toJsonLogic(node: ConditionNode): JsonLogic {
  // 组节点：{ "and": [子条件...] } / { "or": [...] }（json-logic 原生支持任意深度嵌套）
  if ('combinator' in node) {
    return { [node.combinator]: node.conditions.map(toJsonLogic) };
  }
  // 叶节点：{ "操作符": [{ var: "字段" }, 值] }
  const left: JsonLogic = { var: node.field };

  // 特判 1：between 拆成 >= 与 <= 的 and（json-logic 无原生 between）
  if (node.operator === 'between') {
    const [min, max] = node.value as [number, number];
    return { and: [{ '>=': [left, min] }, { '<=': [left, max] }] };
  }
  // 特判 2：in 的操作数顺序是 [值, 集合]，UI 语义"field ∈ values"恰好同序，直接映射
  if (node.operator === 'in') {
    return { in: [left, node.value] };
  }
  return { [node.operator]: [left, node.value] };
}
```

保存后的分工：**前端只负责"造规则"，后端负责"执行规则"**——规则存库后由后端订阅业务数据流（订单事件），逐条对 `logic` 求值，命中则触发通知。前端不做任何常驻执行（刷新就停了），试运行面板的 `jsonLogic.apply` 只服务于配置期的即时反馈。这个"配置在前端、执行在后端"的分离，正是第 4 章告警类需求的标准架构。

对照样例——配置"当 `amount > 100` 且 `city ∈ [北京, 上海]` 时触发告警"：

```json
{
  "and": [
    { ">": [{ "var": "amount" }, 100] },
    { "in": [{ "var": "city" }, ["北京", "上海"]] }
  ]
}
```

### 3. 目录结构建议

```text
src/
├── platform/                    # 平台层：与业务无关，可整体复用
│   ├── auth/                    #   场景 8：AuthProvider / useCan / <Can> / 权限码类型
│   ├── theme/                   #   场景 9：token schema / applyThemeTokens / antd 主题桥接
│   ├── i18n/                    #   场景 10：index / lazyLoad / merge / validate /
│   │                            #           applyRemote / missingReport / pseudoLoc
│   └── bootstrap/               #   本项目：bootstrap.ts / fetchers.ts（启动编排独占）
├── router/                      # 装配层：routes.ts（单一数据源）/ AppRouter.tsx
├── modules/                     # 业务层：按领域切，只 import platform 的公共 API
│   ├── dashboard/
│   └── alert-rule/              #   场景 3：types / meta / QueryBuilder / toJsonLogic / AlertRulePage
├── pages/                       # 通用页面：403 / 登录 / 错误页
├── components/                  # 跨业务的展示组件（PageSkeleton 等）
└── app/                         # 入口：App.tsx（门禁装配）/ main.tsx
```

两条目录纪律：`modules/*` 之间禁止互相 import（跨领域复用的东西下沉到 platform 或 components）；`platform/*` 禁止 import `modules/*` 与 `router/*`（平台层不知道任何业务的存在，依赖方向单向）。

### 4. 每一层的章节索引

| 层/目录 | 用到的能力 | 章节索引 | 组装时的关键动作 |
|---|---|---|---|
| platform/auth | 权限三件套、单一数据源消费 | 场景 8 | `Set<string>` 进 Context；`useCan` 供路由过滤与按钮禁用复用 |
| platform/theme | token 三层、CSS 变量注入、FOUC 防治 | 场景 9 | bootstrap 里"先应用再渲染"；canvas 侧 token mirror 若有 echarts 则接入 |
| platform/i18n | init/合并/懒加载/上报 | 场景 10（全章） | `applyRemoteLocales` 直接作为第 ③ 份配置接进 `allSettled`；路由表 `ns` 字段驱动懒加载 |
| platform/bootstrap | 编排与失败分级 | 本毕业项目第 2 节 | 全项目唯一同时 import 三份配置的地方 |
| router | 路由生成 + 权限过滤 + 菜单派生 | 场景 8 第 3/4 条 | `meta.permission` 过滤；`meta.titleKey` 让菜单走 i18n |
| modules/alert-rule | 条件树递归渲染、字段元数据、值编辑器 | 场景 3；《进阶大纲》§1（递归渲染器内核）+ §3（Setter 体系） | QueryGroup/QueryRow 递归组件即 §1 内核第 N 次复用（本篇开篇"暗线"） |
| app | 门禁三态装配 | 本毕业项目第 2.2 节 | 骨架屏同时覆盖场景 9 的 FOUC 问题 |

### 5. 验收清单

逐项可手工验证，全部打勾即毕业（括号内为对应能力）：

| # | 验收项 | 对应场景 |
|---|---|---|
| 1 | 未登录访问任何路由被重定向到 /login | 8 |
| 2 | 登录后三份配置并行拉取，Network 面板可见同时发出 | 毕业项目 |
| 3 | 权限接口断网（DevTools offline）→ 出现错误页而非白屏；点重试可恢复 | 毕业项目 |
| 4 | 主题接口 500 → 站点以默认主题正常进入，无品牌色闪烁（FOUC） | 9 |
| 5 | 语言包接口 500 → 全站文案为基线包内容，功能正常 | 10 |
| 6 | 语言包接口返回坏 JSON（本地 mock）→ 站点正常，console 有校验错误日志 | 10 |
| 7 | 无 `alert:rule:view` 的账号：菜单不显示告警入口，直接输 URL 得到 403 | 8 |
| 8 | 有 view 无 edit 的账号：页面可见，"保存"禁用并带 tooltip 说明 | 8 |
| 9 | 首次进入 /alert-rule：alertRule ns chunk 与页面 chunk 依次加载，首帧无裸 key | 10 |
| 10 | 语言切换为 en-US：菜单、表头、按钮一次性原子切换，无刷新、无骨架闪断 | 10 |
| 11 | 切语言后已填写的规则条件不丢失 | 10 |
| 12 | 运营改远端包文案并发布 → 不刷新页面（等待或触发 languageChanged）后文案更新 | 10 |
| 13 | 人为删除基线包一个 key（本地构建）→ 页面显示 key 本身，监控接口收到上报 | 10 |
| 14 | 构建器可增删组、切换 and/or、嵌套两层以上；between 需两个值、空值不可保存 | 3 |
| 15 | 试运行面板：样例命中/未命中分支高亮正确 | 3 |
| 16 | 保存后的规则 JSON 与配置一致（DevTools 查看请求体，与 2.6 样例结构相同） | 3 |
| 17 | 字段元数据删除 city 后，存量含 city 的规则回显标红提示而非崩溃 | 3 |
| 18 | pseudo-loc 语言下走通主要页面，无按钮溢出/文本截断 | 10 |
| 19 | `npm run check:i18n` 在 CI 通过（无缺失 key；冗余 key 仅警告） | 10 |
| 20 | 删除 modules/alert-rule 目录，站点可正常构建启动（分层检验） | 毕业项目 |

### 6. 面试时如何把这套讲成一个架构故事

面试官问"你做过什么有架构感的项目"时，不要按功能清单报菜名（"我做了权限、主题、国际化……"），要讲成一个有矛盾、有决策、有权衡的故事。推荐框架：

**一句话定位**："我做过一个多租户 SaaS 控制台的前端底座，解决'租户级配置——权限、品牌、文案——在不发版的前提下安全生效'的问题。"

**30 秒电梯版**（HR 面/开场）：

> "SaaS 产品每个租户能自定义权限集、品牌主题和文案，这些配置由运营随时改。我的工作是前端底座：登录后并行拉三份配置，权限决定路由和菜单怎么生成，主题和文案以'基线加远端覆盖'的方式注入，任何一份配置失败都不会打挂整站。业务上第一个跑在这套底座上的，是告警规则配置页——用户配条件树，前端转成 json-logic 交给后端执行。"

**3 分钟完整版**（按五段推进，每段都有"决策点"）：

1. **问题与约束**（30s）：多租户 SaaS，运营要随时改配置且不发版；约束是三份配置来自三个独立服务，可用性等级不同——权限是安全相关的，主题文案是体验相关的。
2. **关键决策一：启动编排**（40s）：三份配置 `Promise.allSettled` 并行拉取、按失败等级分级处理——权限失败重试后阻塞进错误页，主题和文案降级到默认值。"为什么不用 Promise.all""为什么权限阻塞而主题不阻塞"，这两个问题的答案本身就是架构判断力的展示。
3. **关键决策二：基线 + 远端覆盖**（40s）：文案与主题都是"静态基线保底、远端覆盖优先"的双包结构；远端包合并前做结构校验，校验失败回退基线——"远端是运行时数据，一定会坏，架构要保证坏的时候站点不倒"。配缺失 key 的上报与监控闭环。
4. **难点与解决**（50s）：挑两个最深的讲透——a) 切语言不刷新页面：预载目标语言命名空间后原子切换，解决 Suspense 闪断与 useMemo 冻结旧文案两类问题；b) 告警规则的前后端契约：条件树对人、json-logic 对机器，转换器纯函数可测，试运行面板用 json-logic-js 前端即时求值建立用户信任。
5. **结果与反思**（20s）：可量化的收尾（"新租户上线从发版等待变为运营自助，当天完成"；"文案缺失从客诉发现变为监控面板发现"），加一个真实反思（"类型化 key 引入太晚，前期 key typo 靠运行时发现，后来 CustomTypeOptions 收口"）——有反思的故事才可信。

**高频追问与答法要点**：

- "为什么权限失败要阻塞，而不是也给个默认权限？" → 默认权限只能两个方向：全给（越权 UI 暴露）或全不给（等于锁死），都违背"体验层不给看没有的能力"；正确语义是"不知道用户有什么时，不进入"。
- "为什么 json-logic 而不是直接传 SQL WHERE？" → json-logic 是封闭的 JSON 结构，天然免注入（无字符串拼接）、语言无关（前后端都有实现）、可安全存储与 diff；SQL 是给人执行权限的接口，把用户输入导向 SQL 生成是把注入面焊在架构里。
- "为什么切语言不整页刷新，值得吗？" → 值得，但成本要讲：整页刷新丢运行时状态（填了一半的规则）；代价是要处理订阅重渲染的边界（useMemo 冻结问题），这是可控的、有测试兜底的工程问题。
- "三份配置为什么不用一个聚合接口？" → 反问式回答：聚合接口把三个独立服务的可用性焊成一个，还引入接口层的权限问题（语言包不该看到权限码）；如果平台有 BFF 层可以聚合，但失败分级逻辑不会消失，只是搬家。
- "远端包万一被人投毒呢？" → 校验挡的是格式错误；完整性靠传输层 HTTPS + 内容签名（版本号 + hash 校验），纵深防御；这也是为什么合并永远不执行包里任何代码——语言包只是数据。

---

## 与前几份的关系与优先级

| 场景 | 内核复用 | 建议优先级 |
|---|---|---|
| 3 查询构建器 | 递归渲染器 + Setter + json-logic | ★★★ 新且高价值，优先做 |
| 8 权限 | 单一数据源 + Provider 模式 | ★★★ 每个中后台都需要 |
| 10 动态 i18n | Provider + 合并策略 | ★★☆ SaaS 刚需 |
| 9 多租户主题 | Token 体系 + Setter | ★★☆ 相对薄，快学 |
| 1/2/4 | 进阶大纲 §3/§4/§5/§6 直接延伸 | 已有基础，按需 |
| 5/6 白板与 Notion | 画布/PM 独立内核 | 长线深扎（4–6 周/个） |

表下逐行展开论证——为什么是这个顺序，而不是拍脑袋：

**行 1：3 查询构建器 ★★★，新且高价值，优先做。** 三个理由叠加。其一，它是本篇唯一全量展开的搭建器新场景：条件树协议是《进阶大纲》§1 递归渲染器内核的第 N 次复用（本篇开篇暗线），你已经为这个内核付过学习成本，这里是复利兑现最猛的地方——QueryGroup/QueryRow 的递归结构与表单渲染器、schema 树同构，做一遍等于把内核再内化一遍。其二，json-logic 协议转换层（条件树 ↔ 后端可执行规则）是"前后端契约能力"的代表作，面试里"高级筛选/告警规则怎么设计"是中后台岗位高频题，且追问链条深（协议设计、校验、试运行、存量规则迁移），做得越深越能区分度。其三，投入产出比好：核心是递归渲染 + 字段元数据 + 纯函数转换器，1–2 周可产出完整可演示的 Demo，不像白板/富文本那样要 4–6 周才见轮廓。它也是毕业项目的业务主角，先做它，毕业项目随时可以收口。

**行 2：8 权限 ★★★，每个中后台都需要。** 普适性是第一理由：权限不是"某类产品"的需求，是所有中后台的地基，学会即终身受用。第二，它是"模式密度"最高的一章：单一数据源（一份路由表生成守卫/菜单/面包屑三样）、Provider 模式、声明式组件（`<Can>`）、TS 字面量约束——每个模式都能迁移到权限之外的无数场景（feature flag、租户功能开关、向导步骤 gating）。第三，实现成本最低：扁平权限码 + Set 查询 + Context，一周内可完成全六粒度，但它展示的"深度"不输任何复杂场景——从路由级到行级 ABAC 的六层递进，每层都有真实的权衡（禁用 vs 隐藏的语义差异、前端权限只是体验层的底线认知）。与行 1 并列 ★★★，建议先做 8 再做 3：8 更小、更快建立正反馈，且它是毕业项目启动时序的第一依赖（权限不通，路由都无法生成）。

**行 3：10 动态 i18n ★★☆，SaaS 刚需。** 必要性毋庸置疑——出海产品这是 P0，"语言包不发版生效"是多租户 SaaS 的硬需求。优先级排在 8 之后的理由是**难度结构**：它的"灵魂"（10.4 合并策略）本质上是一个深合并函数 + 一套校验时序 + 一条 fallback 链，核心代码两三百行就到底了；剩下的宽度（ICU、Intl、RTL、Trans、伪语言）是"面"的知识而非"深"的算法，每个点理解半天即可，真正难的是工程纪律（key 扫描进 CI、类型化 key 从第一天用、pseudo-loc 常态化）——纪律靠习惯不靠智力。建议投入约一周：把 10.4 做透（这是可进简历的架构点），ICU/Intl 过一遍建立"拼接不可翻译"的肌肉记忆，RTL 与翻译平台流程留作认知储备，需要时半天捡起。

**行 4：9 多租户主题 ★★☆ 相对薄，快学。** "相对薄"是准确的自我评估：技术内核就是 token 三层体系（基础 → 语义 → 组件只消费语义）+ CSS 变量注入 + antd ConfigProvider 桥接，没有算法、没有复杂状态，2–3 天可走完主线。它的真正难点不在写代码而在**纪律与边角**：语义 token 铁律（组件硬编码一处色值，主题就漏一处）要靠 stylelint 守护；暗色模式 × 租户品牌色的 2×2 组合要靠对比度检查；canvas 组件读不到 CSS 变量要维护 JS 侧 token mirror；FOUC 要靠"先应用再渲染"的启动时序（毕业项目 2.3 顺带解决）。这些是"知道就有、不知道就翻车"的知识点，密度低但每一颗都是雷。作为热身或穿插任务（比如等 3 的设计稿期间）做掉最合适；也因为它是毕业项目第 ② 份配置，早做完早拼装。

**行 5：1/2/4 已有基础，按需。** 这三个场景分别是《进阶大纲》§6+§4（低代码+拖拽 → 大屏编辑器）、全景图 A4/F2（节点图）、§5+§3（monaco+Setter → schema 编辑器）的直接延伸——内核都学过了，剩下的增量各有侧重：1 的增量集中在分辨率适配三方案与 canvas 重绘；2 的增量在 DAG 校验、自动布局与运行态高频合并更新；4 的增量是"元编程"视角（编辑对象是 schema 本身）。它们的定位是"加深已有技能树"，优先级自然让位于全新场景；按你目标岗位挑（做可视化平台选 1/2，做配置系统选 4）。其中 2（工作流编排器）的协议设计与 json-logic 同构（`{ id, type, next: [...] }` 的邻接结构与条件树、schema 树是一家的），做完 3 再看 2 会有强烈的既视感。

**行 6：5/6 白板与 Notion 长线深扎（4–6 周/个）。** 压轴但必须压后，因为它们与前五个场景**几乎没有内核复用**：白板的视口模型/双坐标系/空间索引是一套几何系统，Notion 类的 PM 文档模型/输入规则/选区协同是一套文本编辑系统——各自都是独立领域的入门费（本篇场景 5、6 的自研实现清单就是那 4–6 周的路线图）。在 SaaS 主线（3/8/9/10 + 毕业项目，约 3–4 周）完成之前启动它们，只会两头都半生不熟。但如果你目标是编辑器类产品岗位（Figma/Notion/白板赛道），这两个场景的简历权重最高，值得在主线收口后作为"第二阶段"整块投入，并把 tldraw（源码质量极高）与 TipTap 官方示例作为精读底本。

一句话总结学习路径：**3 → 8 → 10 → 9 → 毕业项目拼装 →（按岗位）1/2/4 或长线 5/6**。前三步做完，"SaaS 平台层"的完整心智模型就立起来了；毕业项目不是新的学习任务，而是对这条主线的验收仪式。
