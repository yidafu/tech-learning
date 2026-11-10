# React 高阶实战大纲：Schema 驱动的复杂业务场景

> 定位：基础大纲（`react-学习大纲.md`）之上的进阶篇，建议完成基础阶段 1–4 后进入。
> 覆盖：Schema 动态表单 / Grafana 式拖拽大盘 / 拖拽式表单生成器 / JSON 编辑器 / 低代码平台。
> 周期：8–10 周。每个场景 = 协议设计 + 实现路线 + 难点坑位 + 对标开源项目 + 产出物。

---

## 0. 全景认知：五大场景是一个内核

这五类场景看似不同，实际是同一条链路的不同切面：

```
┌─────────────┐     schema(JSON)     ┌─────────────┐
│  编辑器      │ ──────────────────► │  渲染器      │
│ (拖拽/配置)  │ ◄────────────────── │ (递归执行)   │
└─────────────┘    反向同步/选中      └─────────────┘
 表单设计器/大盘编辑/低代码编辑器        动态表单/大盘运行时/低代码页面
```

**内核六件套**（所有场景共用，先打地基）：

| 模块 | 解决什么 | 典型实现 |
|---|---|---|
| Schema 协议 | 声明式描述"页面/表单/面板" | JSON + TypeScript discriminated union |
| 组件注册表 | `type` 字符串 → 组件的映射 | `Record<string, ComponentType>` + 物料元信息 |
| 递归渲染器 | 把 schema 树变成组件树 | 布局容器与原子组件分离、递归 + memo |
| Setter 体系 | 属性面板 = 一张配置表单 | 属性面板本身复用"动态表单"（自举） |
| 表达式引擎 | 安全的联动/条件/绑定逻辑 | expr-eval / jsonata / 自研 mini 求值器 |
| Undo/Redo | 编辑器的底线能力 | immer patches / 命令模式 / zundo |

**学习总原则：先做渲染器，再做编辑器。** 编辑器本质是"生成 schema 的 GUI"，没有渲染器的编辑器是无根之木。

---

## 1. 通用底座（1.5 周，先于一切场景）

### 1.1 Schema 协议设计
- 设计原则：可序列化、声明式（不含可执行代码，逻辑走表达式）、带版本号、预留扩展字段（`x-*`）、节点有稳定 id
- 用 TS discriminated union 描述节点：`{ type: 'input'; props: {...} } | { type: 'grid'; children: Node[] }`
- ✍️ 练习：分别设计"表单字段协议"和"页面节点协议"，写出类型并手写 3 份合法 JSON 样例

### 1.2 组件注册表模式
```tsx
const widgetRegistry: Record<WidgetType, ComponentType<WidgetProps>> = {
  input: InputWidget, select: SelectWidget, grid: GridWidget,
}
```
- 注册表带物料元信息：label / icon / 默认 props / setters 声明
- TS 进阶：`type WidgetMap = { [K in WidgetType]: ComponentType<WidgetProps<K>> }`

### 1.3 递归渲染器
- `renderNode(node)`：布局容器递归 children，原子组件终止
- key 用 nodeId 绝不用数组 index（增删节点时状态错乱）
- Node 组件 memo：props 未变不重渲染（大树性能的第一道闸）

### 1.4 表达式引擎
- 为什么禁用 `eval`/`new Function`：安全 + 作用域失控
- 选型：expr-eval（轻）、jexl、jsonata（强）
- 求值上下文注入：`{ $form, $user, $now }`，表达式里能读变量
- ✍️ 练习：**手写一个 100 行的 mini 求值器**（词法 → AST → 递归求值，支持四则/比较/逻辑/属性访问），做完你对 Babel/模板引擎的理解会上一个台阶

### 1.5 Undo/Redo 三种实现
1. 命令模式：每个操作封装 `{ do(), undo() }` — 直观但样板多
2. **immer `produceWithPatches`（推荐）**：任何 mutation 自动生成正/反补丁
3. zundo：zustand 官方 temporal 中间件
- ⚠️ 坑：文本输入类操作必须**合并补丁**（300ms 防抖合并），否则 Cmd+Z 逐字符回退；产生新操作时清空 redo 栈

### 1.6 拖拽原理（dnd-kit 精讲）
- 核心概念：`DndContext` / `useDraggable` / `useDroppable` / `useSortable` / `DragOverlay`
- Sensors：Pointer / Keyboard（无障碍）/ Touch；启动延迟 vs 启动距离（点击与拖拽冲突）
- 碰撞算法选择：`closestCenter`（排序）vs `closestCorners` vs `pointerWithin`（嵌套容器必用组合策略）
- **DragOverlay 预览层**：拖动时渲染"替身"，避免原元素被拉伸导致布局跳动（高频坑）
- ✍️ 练习：两个列表互拖 + Kanban 多列嵌套排序（含键盘拖拽）

### 1.7 大 Schema 树性能
- zustand + **path 级 selector 订阅**：每个字段只订阅自己的路径（formily 的核心思想）
- 不可变按路径更新（immer）
- 大纲树虚拟化（react-arborist）
- ✍️ 练习：渲染 1000 节点树，修改单个节点，用 Profiler 验证只有 1 个组件重渲染

✅ **阶段产出**：一个能渲染嵌套 schema 的 mini renderer + 全局 undo/redo + 表达式求值器。

---

## 2. Schema 动态表单（2 周）

**业务画像**：中后台 50+ 字段配置化表单、SaaS 让接入方自定义字段、一个页面跑 N 套表单配置。

### 实现路线（顺序即依赖）
1. 字段协议：`{ id, type, label, required, default, options, visibleWhen, disabledWhen, rules }`
2. registry + 递归渲染器（复用底座 1.2/1.3）
3. formData 管理：zustand 单 store，`setValue(path, value)` 用 immer 按路径更新
4. **Field 组件模式**：每个字段组件用 selector 只订阅自己的 `value` 和 `error`
5. 联动：`visibleWhen` 表达式求值显隐；想清楚"隐藏字段的值保留还是清空"
6. 校验：required/正则/自定义函数，区分"失焦校验"与"提交校验"，维护 touched 状态
7. 数组字段：FieldArray 动态增删、上移下移，路径 `users.2.name` 的渲染与校验
8. 异步 options：远程搜索 Select（防抖 + AbortController 取消）
9. 布局升级：分组、栅格、嵌套对象

### 难点与坑
- ⚠️ **输入一个字符、全表 50 个字段重渲染**：全量受控 state 的经典灾难 → path 级订阅是本章灵魂
- ⚠️ 联动循环依赖（a 依赖 b、b 依赖 a）→ 限制单轮求值或建依赖图
- ⚠️ `undefined / null / ''` 初始值不一致导致受控告警与回显 bug

### 对标开源（按可读性排序）
react-jsonschema-form（rjsf，**先读这个**）→ Formily（path 订阅 + 响应式，深度参考）→ FormKit 思想

✅ **产出**：mini formily——用 JSON 配置渲染一个 20 字段、含联动与数组字段的表单，输入任意字段时 Profiler 里只有该字段重渲染。

---

## 3. 拖拽式表单设计器 Form Builder（2 周）

**业务画像**：问卷/审批流配置页，运营拖组件生成表单，产线开发者只维护渲染器。

### 结构：三栏（物料区 / 画布 / 属性区）

### 实现路线
1. **物料协议**：`{ name, label, icon, defaultProps, setters, isContainer? }`，注册进物料库
2. 画布 = schema 树 + 递归渲染；**编辑模式下子组件 `pointer-events: none`**，画布统一接管点击做选中（否则会触发组件自身行为）
3. 拖拽（dnd-kit）：
   - 物料区 → 画布：拖入 = 向 schema 插入节点（目标 droppable = 各容器节点）
   - 画布内排序：`useSortable`
   - 嵌套容器拖放：**`pointerWithin` + `closestCorners` 组合碰撞策略**（本章最大坑）
   - 拖动预览用 DragOverlay
4. 选中态：outline + 节点类型角标 + 悬浮操作条（复制/删除/上移/下移）
5. **Setter 体系**：属性面板 = 用第 2 章动态表单渲染 settable 字段声明 —— 属性面板本身就是一张 schema 表单（**自举闭环**）
6. 快捷键：Cmd+Z / Cmd+Shift+Z / Delete / Cmd+D 复制
7. undo/redo 接底座（注意 setter 输入的补丁合并）
8. 预览：schema 交给第 2 章渲染器跑起来；导入/导出 JSON

### 难点与坑
- ⚠️ 嵌套容器"拖到哪个容器里"判定错误 → 碰撞策略组合 + 容器权重
- ⚠️ 编辑模式下阻止组件内部事件 → capture 阶段 `stopPropagation`
- ⚠️ 撤销逐字符 → patch 合并（底座 1.5）

✅ **产出**：拖 5 种物料搭建表单 → 导出 schema → 用第 2 章渲染器渲染并提交，**设计器↔渲染器闭环**。

---

## 4. Grafana 式拖拽仪表盘（2 周）

**业务画像**：数据可视化大盘、BI 工具、监控面板，编辑态拖拽布局配图表，运行态定时刷新。

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

### 难点与坑
- ⚠️ react-grid-layout 容器宽度需正确测量（ResizeObserver 驱动），响应式断点列数切换
- ⚠️ echarts 实例复用与 `setOption` 的 merge 模式（notMerge 时机）
- ⚠️ 高频刷新 + 大数据量 tooltip 卡顿 → 数据抽样/downsampling
- ⚠️ 删除面板后 layout 数组残留脏数据

### 对标开源
Grafana 前端（panel/datasource 插件化架构教科书）

✅ **产出**：4 种面板 + 拖拽缩放布局 + 全局时间范围联动 + 自动刷新 + dashboard JSON 导出/导入。

---

## 5. JSON 编辑器（1 周）

**业务画像**：schema 配置编辑、接口调试、第 3/4 章产物的源码级编辑入口。

### 选型对比
| | Monaco | CodeMirror 6 |
|---|---|---|
| 体验 | VSCode 级 | 优秀但轻量 |
| 体积 | 大（worker 按需） | 小、tree-shakable |
| JSON Schema 补全 | 官方 json worker | codemirror-json-schema |
| 适合 | 重度 IDE 场景 | 嵌入业务系统 |

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

### 难点与坑
- ⚠️ Vite 下 monaco worker 打包配置
- ⚠️ 中文输入法 composition 期间的变更处理
- ⚠️ 外部数据变化如何安全写回编辑器（`executeEdits` 保撤销栈）

✅ **产出**：带 Schema 校验/补全/格式化/diff 的 JSON 编辑器组件，接入第 3、4 章的 schema 导入导出（形成"可视化编辑 ↔ 源码编辑"双入口）。

---

## 6. 低代码平台整合（2–3 周）

**业务画像**：让非开发者拖组件搭页面；这是前 5 章能力的总装。

### 架构
```
编辑器（画布 + 物料面板 + 属性面板 + 大纲树 + 工具栏）
   │ 产出
Schema 协议（组件树 + props + style + events + dataSource + 变量）
   │ 消费
渲染器（递归执行 + 表达式绑定 + 动作引擎）
```

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

### 难点与坑
- ⚠️ iframe 画布的事件与选中态同步（坐标换算、postMessage 协议设计）
- ⚠️ 事件链死循环（A 触发 B、B 触发 A）→ 动作执行深度上限
- ⚠️ 协议无版本管理，旧页面打不开 → 一开始就带 version

### 对标开源
amis（渲染协议最全，必读）→ 阿里 lowcode-engine（编辑器工程化标准 + 《中后台搭建协议规范》）→ Appsmith / ToolJet（开源全栈低代码）

✅ **产出**：mini 低代码平台——10+ 物料、拖拽搭建、属性/样式/事件配置、变量与接口绑定、预览发布、schema 导入导出与版本迁移。

---

## 7. 扩展场景（同难度梯度，可选方向）

> 完整的高阶场景地图（7 大族群 23 个场景：富文本/协同/音视频/GIS/3D/微前端/在线 IDE/百万级性能/AI 原生前端等）见 [react-高阶场景全景图.md](react-高阶场景全景图.md)。

| 场景 | 核心技术 | 对标 |
|---|---|---|
| 节点编排画布（n8n/Dify 式工作流） | reactflow（自研节点/边/自动布局/小地图） | n8n、Dify |
| 富文本/文档编辑器 | prosemirror 生态（tiptap）、协同（Yjs） | Notion 类 |
| 复杂数据表格 | tanstack table（分组/虚拟/行内编辑/列拖拽），ag-grid | 飞书表格 |
| 画布类编辑器（白板/海报） | react-konva / Pixi、坐标系与缩放平移变换 | excalidraw、稿定 |
| 公式编辑器 | 语法树 + monarch/lezer | Excel 公式栏 |

---

## 8. 源码阅读地图（按难度递增）

1. **rjsf**：schema form 最易读，先看 renderer 与 ajv 校验链路
2. **react-grid-layout**：栅格布局/碰撞/compact 算法，纯逻辑好啃
3. **dnd-kit**：现代拖拽的 sensor/碰撞抽象
4. **amis**：schema 协议大全，重点看渲染器目录组织
5. **formily**：path 订阅 + reactive 性能设计
6. **lowcode-engine**：编辑器骨架、setter、协议版本
7. **grafana frontend**：panel/datasource 插件化 + 大盘状态

读法：从渲染入口顺着一条 schema 的处理链路读到副作用出口；带着一个具体 issue 去读效率最高。

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

---

## 10. 节奏安排（10 周）

| 周 | 内容 | 里程碑 |
|---|---|---|
| 1–2 | 底座 + Schema 动态表单 | mini formily（性能达标） |
| 3–4 | 表单设计器 | 设计器↔渲染器闭环 |
| 5–6 | 拖拽仪表盘 | dashboard JSON 进出 |
| 7 | JSON 编辑器 | 可视化/源码双入口 |
| 8–10 | 低代码整合 | mini 低代码平台发布 |

每章节奏：**协议设计（半天）→ 按路线逐步实现（主体）→ 对照对标开源校验设计 → 写一篇复盘**。
复盘必须回答：我的协议和 formily/amis 的差距在哪？哪里的性能没做 path 订阅？
