# React 实战编码学习大纲（场景驱动版）

> 使用方式：每个场景 = 一个可运行的小 demo。先自己写，再对照官方文档修正。
> 预计周期：12–14 周（每天 1–2 小时），可按阶段跳过已掌握内容。
> 核心原则：**所有知识都落在"编码场景"上，不为学 API 而学 API。**

---

## 阶段 0：环境与工具（0.5 周）

| 场景 | 要做的事 |
|---|---|
| 项目初始化 | 用 Vite 创建 React + TS 项目，理解目录组织（按功能分 vs 按类型分） |
| 代码规范 | 配置 ESLint（含 `eslint-plugin-react-hooks`）+ Prettier |
| 调试工具 | 安装 React DevTools，学会看组件树、Props、高亮重渲染 |

✅ 产出：一个干净可运行的项目骨架，后续所有 demo 都在这里写。

---

## 阶段 1：渲染基础（1 周）

### 编码场景清单
1. **JSX**：表达式嵌入、`className`、内联样式对象、`Fragment`、条件展开（`{...spread}`）
2. **条件渲染全场景**：`&&` 陷阱（`count && <Tag/>` 当 count 为 0）、三元、提前 return、枚举映射（`statusMap[status]`）
3. **列表渲染**：key 的正确选择、为什么不能用 index、嵌套列表、列表中传事件参数
4. **Props**：解构 + 默认值、`children`、透传 rest props（`{...rest}`）
5. **事件处理**：合成事件与原生事件差异、传参的 3 种方式、阻止默认/冒泡
6. **组件通信**：父→子（props）、子→父（回调）、兄弟（状态提升）、跨层级（先手动传，体会 pain）

✅ 产出：一个静态"个人主页/商品卡片列表"页，覆盖以上全部场景。

---

## 阶段 2：状态与副作用 ⭐核心（2 周）

### useState 场景
1. 基础用法 + **函数式更新**（`setCount(c => c + 1)`）
2. 对象/数组状态的**不可变更新**（展开、`map`、`filter` 更新某一项）
3. 惰性初始化（`useState(() => expensive())`）
4. 批处理：一次点击里连续多次 setState 的表现
5. **状态放哪**：状态提升、就地下放、为什么"能放局部就不放全局"

### useEffect 场景
1. 依赖数组三种形态的含义（无 / `[]` / 指定）
2. **清理函数**：定时器、`addEventListener`、WebSocket、`AbortController`
3. 数据请求完整链路：loading / error / success / 竞态取消（快速切换 tab 时旧请求覆盖新结果）
4. `exhaustive-deps` 警告：依赖"太多导致循环"与"太少导致旧值"两类问题的解法
5. **什么时候不该用 useEffect**：派生状态用普通变量/Memo、事件逻辑放事件处理器（react.dev《You Might Not Need an Effect》必读）

### 闭包陷阱专题（必练）
- 事件处理器里读到旧 state
- `setInterval` 里读旧值（两种解法：函数式更新 / ref）
- useEffect 捕获旧 props

### useRef 场景
1. DOM 操作：聚焦、滚动定位、测量尺寸
2. 保存不触发渲染的值（定时器 id、上一次值 `usePrevious`）
3. 跨渲染保存可变实例

### useMemo / useCallback / memo
1. 引用相等性问题：什么时候子组件会无谓重渲染
2. `memo` + `useCallback` 配合生效的条件
3. **过度优化的代价**：不要默认全加

### 自定义 Hook（从模仿到手写）
手写以下 Hooks 并写 demo 验证：`useFetch`、`useDebounce`、`useLocalStorage`、`useToggle`、`useWindowSize`、`useClickOutside`、`usePrevious`、`useInterval`
> 建议对照 [ahooks](https://ahooks.js.org/) 源码校对实现。

✅ 产出：**TodoMVC**（增删改查 + 状态过滤 + localStorage 持久化 + useDebounce 搜索）。

---

## 阶段 3：组件设计模式（1.5 周）

| 模式 | 场景 |
|---|---|
| 受控 vs 非受控 | 输入框双模式实现（`value` + `defaultValue` + ref） |
| 组合优于配置 | 用 `children`/具名 slot 替代一堆 props 的 Card、Layout |
| Compound Components | 手写 Tabs：`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>` 共享状态不靠 props 透传 |
| Render Props | 手写 MouseTracker、滚动位置组件 |
| Props drilling | 先写一个透传 5 层的痛，再用 Context 解决 |
| 状态提升 vs 下放 | 把"只影响子树"的状态下放以缩小渲染范围 |
| 容器/展示分离 | 数据逻辑与 UI 分层（不必教条） |
| 泛型组件（TS） | 写一个 `List<T>` / `Select<T>` |
| 组件库思维 | API 设计、`forwardRef` 透传 ref、受控+非受控双模式兼容 |

✅ 产出：手写一套迷你组件库（Button / Modal / Tabs / Select / Input），配 Storybook 文档。组件实现的完整功力清单与工程化见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》（通用内功 → 分级组件清单 → 工程化）。

---

## 阶段 4：高频业务场景 ⭐实战核心（3 周）

### 4.1 表单全家桶
1. 纯受控表单 → 抽象 `useForm`
2. 动态表单（字段动态增删、嵌套字段）
3. 多步表单（步骤间状态保留）
4. 校验：手写规则 → **react-hook-form + zod**（企业级标准）
5. 字段联动（省市区级联、某选项控制其他字段显隐）

### 4.2 数据请求与服务器状态
1. 手写 `useFetch`：loading / error / refetch / 竞态
2. **TanStack Query（React Query）**：缓存、失效重取、分页参数、无限加载、乐观更新、mutation 后刷新列表
3. SWR 对照使用
4. Suspense + 数据获取（配合 RSC 理解）

### 4.3 列表场景
1. 分页（页码 + 查询参数同步到 URL）
2. 无限滚动（`IntersectionObserver` 哨兵元素）
3. 虚拟列表（`@tanstack/react-virtual` 渲染 1 万行）
4. 搜索 + 筛选 + 排序组合（防抖搜索、条件放 URL）

### 4.4 路由（React Router v6/v7）
1. 路由配置、嵌套路由、`Outlet`、布局路由
2. 动态参数 `:id`、查询参数读写
3. 编程式导航、离开拦截（表单未保存提示）
4. 路由懒加载 `lazy()` + Suspense、加载骨架
5. 鉴权路由（ProtectedRoute）、404、错误路由（errorElement）

### 4.5 弹层体系
1. Modal / Drawer：`createPortal`、ESC 关闭、点遮罩关、滚动锁定
2. **命令式 Toast / Confirm**（`createRoot` 动态挂载，如 antd `message.success()` 原理）
3. 弹层嵌套与焦点管理

### 4.6 实时与异步
1. WebSocket：重连、心跳、消息列表性能（增量渲染）
2. SSE 流式输出（AI 对话界面场景）
3. 乐观更新 + 失败回滚（点赞/收藏）

### 4.7 其他高频场景
1. 文件上传：进度条、多文件、图片预览、大文件分片
2. 拖拽排序（dnd-kit：列表拖拽 + 多容器移动）
3. 动画：CSS transition 状态机、framer-motion 进出场、列表 FLIP（AnimatePresence）
4. 主题切换（CSS 变量 + `data-theme` + 持久化）
5. 国际化 i18n（语言包组织、切换、格式化）
6. 权限系统：路由级权限、按钮级权限（权限组件/`usePermission`）
7. 错误边界 ErrorBoundary + 降级 UI + 组件级上报
8. 骨架屏 / 空态 / 错误态 / 加载态的统一设计
9. 复制到剪贴板、全屏、通知等浏览器 API 在 React 中的封装

✅ 产出：**后台管理系统**（登录鉴权 + 动态表格 + 增删改查弹窗 + 权限 + 主题），可参考 antd Pro 的结构自己从零实现。

---

## 阶段 5：状态管理（1 周）

1. **选型决策树**：组件内 state → 状态提升 → Context → Zustand/Redux
2. Context 的性能陷阱（value 引用变化导致全量重渲染）与拆分方案
3. **Zustand**：store 设计、selector 精确订阅、persist 持久化、immer 中间件
4. Redux Toolkit：slice、createAsyncThunk（旧项目维护必备）
5. Jotai 原子化状态（细粒度场景）
6. **客户端状态 vs 服务器状态分离**：React Query 管服务器状态，状态库只管 UI 状态
7. URL 也是状态：筛选/分页/Tab 放查询参数，可分享可回退

✅ 产出：把阶段 4 的项目重构出 Zustand + React Query 分层。

---

## 阶段 6：性能优化与调试（1 周）

### 优化
1. 测量先行：React DevTools Profiler 录制火焰图、Performance 面板
2. 减少渲染范围：`memo`、组件拆分、状态下放、children 作为 props 传入
3. 虚拟化长列表
4. 代码分割：路由级 `lazy`、重组件动态 import、预加载策略
5. `useTransition` / `useDeferredValue`（大列表搜索不卡输入框）
6. 图片懒加载、字体优化、防抖节流
7. 常见反模式清单：在 render 里创建重对象、context 放高频变化值、props 内联函数+未 memo 等

### 调试方法论
- 高频 bug 模式速查：
  - **无限重渲染**：effect 里 setState 且依赖了它 / 父子互相触发
  - **闭包旧值**：定时器/订阅回调读 state
  - **竞态**：快速切换请求覆盖
  - **key 警告 / 列表状态错乱**
  - **事件不触发**：被覆盖/被阻止冒泡/条件卸载
- 排查步骤：稳定复现 → 二分最小化（删代码到问题消失）→ 定位层（渲染/逻辑/环境）→ 查官方文档

✅ 产出：给阶段 4 项目做一次 Profiler 记录，写一份优化前后对比笔记。

---

## 阶段 7：TypeScript + React（1 周）

1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`
2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用
3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）
4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍
5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）
6. 给第三方 JS 库写 `.d.ts` 声明

---

## 阶段 8：测试与质量（1 周）

1. Vitest + Testing Library：按角色查询优先（`getByRole`）、`screen`、断言
2. `user-event` 模拟交互（点击、输入、键盘）
3. mock：`vi.mock` 模块、mock fetch、测试异步加载完成态（`findBy` / `waitFor`）
4. 自定义 Hook 测试：`renderHook` + `act`
5. 组件测试范式：测行为不测实现（不测内部 state）
6. E2E：Playwright 写登录→操作→断言 流程
7. ErrorBoundary + window.onerror + Sentry 上报接入

---

## 阶段 9：React 19 与服务端（2 周）

### React 19 新特性
1. `use()` 读取 Promise / Context
2. Actions + `useActionState`（表单提交状态）
3. `useOptimistic` 乐观 UI
4. ref 直接作为 prop（`forwardRef` 逐步退场）
5. 文档元数据（`<title>` 直接写组件里）
6. Suspense 进阶：占位、边界组合

### Next.js（App Router）
1. **RSC vs 客户端组件**边界划分（`'use client'` 放哪）
2. SSR / SSG / ISR / 流式渲染的取舍
3. Server Actions（表单不写 API 也能提交）
4. 缓存与重验证（revalidate / revalidateTag）
5. 水合错误（hydration mismatch）的成因与排查
6. Metadata、路由组、中间件、动态路由

✅ 产出：全栈小应用（Next.js + 数据库 + NextAuth 鉴权 + Vercel 部署），如博客、记账本。

---

## 阶段 10：进阶原理（可选，面试导向）

> 想真正吃透原理，直接走"复刻路线"：从 200 行 render 到带 Fiber/Hooks/调和的 mini React，见《[react-源码复刻大纲.md](react-源码复刻大纲.md)》——本阶段的概念在复刻中会全部自然获得。

1. Fiber 架构通俗理解（可中断渲染、优先级）
2. Diff 算法与 key 的作用机制
3. 批处理与自动批处理（React 18 前后差异）
4. 合成事件与事件委托
5. `useSyncExternalStore` 原理（外部 store 桥接）
6. 并发特性：transition 调度原理

---

## 贯穿全程的项目线

| 等级 | 项目 | 覆盖阶段 |
|---|---|---|
| Lv1 | TodoMVC | 阶段 1–2 |
| Lv2 | 迷你组件库 + Storybook | 阶段 3、7 |
| Lv3 | 后台管理系统 | 阶段 4–6、8 |
| Lv4 | Next.js 全栈应用 + 部署 | 阶段 9 |

---

## 解决实际编码问题的工作流

遇到问题时按此顺序：
1. **读警告**：控制台/react-devtools 的 warning 往往直接指出原因
2. **最小复现**：新开一个文件，把问题缩到 20 行以内
3. **分层定位**：渲染层（值对不对）→ 时机层（effect/事件）→ 环境层（构建/缓存）
4. **查权威来源**：react.dev 搜索 → 该库 GitHub issues → Release Notes（升级踩坑）
5. **沉淀**：把解法记进自己的"React 踩坑笔记"，按场景归档

## 核心资源

- **react.dev**（中文版可用）—— 唯一必读，尤其是 "Learn React" 与 "You Might Not Need an Effect"
- TanStack Query / Zustand / React Router / react-hook-form 官方文档
- [ahooks](https://ahooks.js.org/)：自定义 Hook 最佳实践与源码
- Epic React（Kent C. Dodds 的实战 workshop）
- patterns.dev：组件模式与性能模式图解

---

## 每周节奏建议

- 60% 时间写代码（场景 demo / 项目）
- 20% 时间读官方文档对应章节
- 20% 时间复盘重构（把前一天写的烂代码改好，比多写新代码更有价值）

---

## 进阶篇：复杂业务场景

Schema 动态表单、Grafana 式拖拽大盘、拖拽式表单设计器、JSON 编辑器、低代码平台等高难度场景，见 [react-进阶大纲-复杂场景.md](react-进阶大纲-复杂场景.md)（建议完成本大纲阶段 1–4 后进入）。
