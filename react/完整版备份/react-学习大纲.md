# React 实战编码学习大纲（场景驱动版）

> 使用方式：每个场景 = 一个可运行的小 demo。先自己写，再对照官方文档修正。
> 预计周期：12–14 周（每天 1–2 小时），可按阶段跳过已掌握内容。
> 核心原则：**所有知识都落在"编码场景"上，不为学 API 而学 API。**

## 目录

- [如何使用本大纲](#如何使用本大纲)
  - [60/20/20 节奏怎么落地](#602020-节奏怎么落地)
  - [怎么判断"可以跳过"](#怎么判断可以跳过)
- [阶段 0：环境与工具（0.5 周）](#阶段-0环境与工具05-周)
  - [0.1 项目初始化：用 Vite 创建 React + TS 项目](#01-项目初始化用-vite-创建-react--ts-项目)
  - [0.2 目录组织：按功能分 vs 按类型分](#02-目录组织按功能分-vs-按类型分)
  - [0.3 代码规范：ESLint（含 eslint-plugin-react-hooks）+ Prettier](#03-代码规范eslint含-eslint-plugin-react-hooks-prettier)
  - [0.4 调试工具：React DevTools](#04-调试工具react-devtools)
- [阶段 1：渲染基础（1 周）](#阶段-1渲染基础1-周)
  - [编码场景清单](#编码场景清单)
  - [场景 1：JSX——表达式嵌入规则](#场景-1jsx表达式嵌入规则)
  - [场景 2：条件渲染全场景](#场景-2条件渲染全场景)
  - [场景 3：列表渲染](#场景-3列表渲染)
  - [场景 4：Props](#场景-4props)
  - [场景 5：事件处理](#场景-5事件处理)
  - [场景 6：组件通信](#场景-6组件通信)
- [阶段 2：状态与副作用 ⭐核心（2 周）](#阶段-2状态与副作用-核心2-周)
  - [useState 场景](#usestate-场景)
  - [useEffect 场景](#useeffect-场景)
  - [闭包陷阱专题（必练）](#闭包陷阱专题必练)
  - [useRef 场景](#useref-场景)
  - [useMemo / useCallback / memo](#usememo--usecallback--memo)
  - [自定义 Hook（从模仿到手写）](#自定义-hook从模仿到手写)
  - [✅ 产出：**TodoMVC**（增删改查 + 状态过滤 + localStorage 持久化 + useDebounce 搜索）](#-产出todomvc增删改查--状态过滤--localstorage-持久化--usedebounce-搜索)
- [阶段 3：组件设计模式（1.5 周）](#阶段-3组件设计模式15-周)
  - [模式 1｜受控 vs 非受控：输入框双模式实现（`value` + `defaultValue` + ref）](#模式-1受控-vs-非受控输入框双模式实现value--defaultvalue--ref)
  - [模式 2｜组合优于配置：用 `children`/具名 slot 替代一堆 props 的 Card、Layout](#模式-2组合优于配置用-children具名-slot-替代一堆-props-的-cardlayout)
  - [模式 3｜Compound Components：手写 Tabs](#模式-3compound-components手写-tabs)
  - [模式 4｜Render Props：手写 MouseTracker、滚动位置组件](#模式-4render-props手写-mousetracker滚动位置组件)
  - [模式 5｜Props drilling：先写一个透传 5 层的痛，再用 Context 解决](#模式-5props-drilling先写一个透传-5-层的痛再用-context-解决)
  - [模式 6｜状态提升 vs 下放：把"只影响子树"的状态下放以缩小渲染范围](#模式-6状态提升-vs-下放把只影响子树的状态下放以缩小渲染范围)
  - [模式 7｜容器/展示分离：数据逻辑与 UI 分层（不必教条）](#模式-7容器展示分离数据逻辑与-ui-分层不必教条)
  - [模式 8｜泛型组件（TS）：写一个 `List<T>` / `Select<T>`](#模式-8泛型组件ts写一个-listt--selectt)
  - [模式 9｜组件库思维：API 设计、`forwardRef` 透传 ref、受控+非受控双模式兼容](#模式-9组件库思维api-设计forwardref-透传-ref受控非受控双模式兼容)
- [阶段 4：高频业务场景 ⭐实战核心（3 周）](#阶段-4高频业务场景-实战核心3-周)
  - [4.1 表单全家桶](#41-表单全家桶)
  - [4.2 数据请求与服务器状态](#42-数据请求与服务器状态)
  - [4.3 列表场景](#43-列表场景)
  - [4.4 路由（React Router v6/v7）](#44-路由react-router-v6v7)
  - [4.5 弹层体系](#45-弹层体系)
  - [4.6 实时与异步](#46-实时与异步)
  - [4.7 其他高频场景](#47-其他高频场景)
- [阶段 5：状态管理（1 周）](#阶段-5状态管理1-周)
  - [1. **选型决策树**：组件内 state → 状态提升 → Context → Zustand/Redux](#1-选型决策树组件内-state--状态提升--context--zustandredux)
  - [2. Context 的性能陷阱（value 引用变化导致全量重渲染）与拆分方案](#2-context-的性能陷阱value-引用变化导致全量重渲染与拆分方案)
  - [3. **Zustand**：store 设计、selector 精确订阅、persist 持久化、immer 中间件](#3-zustandstore-设计selector-精确订阅persist-持久化immer-中间件)
  - [4. Redux Toolkit：slice、createAsyncThunk（旧项目维护必备）](#4-redux-toolkitslicecreateasyncthunk旧项目维护必备)
  - [5. Jotai 原子化状态（细粒场景）](#5-jotai-原子化状态细粒场景)
  - [6. **客户端状态 vs 服务器状态分离**：React Query 管服务器状态，状态库只管 UI 状态](#6-客户端状态-vs-服务器状态分离react-query-管服务器状态状态库只管-ui-状态)
  - [7. URL 也是状态：筛选/分页/Tab 放查询参数，可分享可回退](#7-url-也是状态筛选分页tab-放查询参数可分享可回退)
  - [✅ 产出：把阶段 4 的项目重构出 Zustand + React Query 分层。](#-产出把阶段-4-的项目重构出-zustand--react-query-分层)
- [阶段 6：性能优化与调试（1 周）](#阶段-6性能优化与调试1-周)
  - [优化](#优化)
  - [调试方法论](#调试方法论)
  - [✅ 产出：给阶段 4 项目做一次 Profiler 记录，写一份优化前后对比笔记。](#-产出给阶段-4-项目做一次-profiler-记录写一份优化前后对比笔记)
- [阶段 7：TypeScript + React（1 周）](#阶段-7typescript--react1-周)
  - [1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`](#1-props-类型children-reactnode事件类型-reactchangeeventhtmlinputelement)
  - [2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用](#2-usestatet-泛型类型收窄在-jsx-分支中的应用)
  - [3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）](#3-泛型组件listtselectt与泛型-hookuserequestt)
  - [4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍](#4-reactnode-vs-reactelement-vs-jsxelementcomponenttype--fc-的取舍)
  - [5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）](#5-样式-props模板字面量类型约束type-variant--small--large)
  - [6. 给第三方 JS 库写 `.d.ts` 声明](#6-给第三方-js-库写-dts-声明)
- [阶段 8：测试与质量（1 周）](#阶段-8测试与质量1-周)
  - [1. Vitest + Testing Library：按角色查询优先（`getByRole`）、`screen`、断言](#1-vitest--testing-library按角色查询优先getbyrolescreen断言)
  - [2. `user-event` 模拟交互（点击、输入、键盘）](#2-user-event-模拟交互点击输入键盘)
  - [3. mock：`vi.mock` 模块、mock fetch、测试异步加载完成态（`findBy` / `waitFor`）](#3-mockvimock-模块mock-fetch测试异步加载完成态findby--waitfor)
  - [4. 自定义 Hook 测试：`renderHook` + `act`](#4-自定义-hook-测试renderhook--act)
  - [5. 组件测试范式：测行为不测实现（不测内部 state）](#5-组件测试范式测行为不测实现不测内部-state)
  - [6. E2E：Playwright 写登录→操作→断言 流程](#6-e2eplaywright-写登录操作断言-流程)
  - [7. ErrorBoundary + window.onerror + Sentry 上报接入](#7-errorboundary--windowonerror--sentry-上报接入)
- [阶段 9：React 19 与服务端（2 周）](#阶段-9react-19-与服务端2-周)
  - [React 19 新特性](#react-19-新特性)
  - [Next.js（App Router）](#nextjsapp-router)
  - [✅ 产出：全栈小应用（Next.js + 数据库 + NextAuth 鉴权 + Vercel 部署），如博客、记账本。](#-产出全栈小应用nextjs--数据库--nextauth-鉴权--vercel-部署如博客记账本)
- [阶段 10：进阶原理（可选，面试导向）](#阶段-10进阶原理可选面试导向)
- [贯穿全程的项目线](#贯穿全程的项目线)
- [解决实际编码问题的工作流](#解决实际编码问题的工作流)
- [核心资源](#核心资源)
- [每周节奏建议](#每周节奏建议)
- [延伸篇：React 与其他框架的对比](#延伸篇react-与其他框架的对比)
  - [1. 为什么要对比：四个真实动机](#1-为什么要对比四个真实动机)
  - [2. 总览：三种响应式心智模型](#2-总览三种响应式心智模型)
  - [3. 场景对比｜计数器：状态更新的三种哲学](#3-场景对比计数器状态更新的三种哲学)
  - [4. 场景对比｜表单输入：受控组件 vs 双向绑定](#4-场景对比表单输入受控组件-vs-双向绑定)
  - [5. 场景对比｜列表与 key：diff 的输入从哪来](#5-场景对比列表与-keydiff-的输入从哪来)
  - [6. 场景对比｜派生与副作用：useEffect vs computed / watch vs $derived](#6-场景对比派生与副作用useeffect-vs-computed--watch-vs-derived)
  - [7. 场景对比｜组件通信：props 下行、事件上行、跨层注入](#7-场景对比组件通信props-下行事件上行跨层注入)
  - [8. 场景对比｜生命周期：组件函数到底跑几次](#8-场景对比生命周期组件函数到底跑几次)
  - [9. 生态对照：从状态库到元框架](#9-生态对照从状态库到元框架)
  - [10. 选型决策：什么时候选 React，什么时候不选](#10-选型决策什么时候选-react什么时候不选)
  - [11. 迁移指南：React 开发者的 Vue 速查（与反向）](#11-迁移指南react-开发者的-vue-速查与反向)
  - [12. 面试高频对比题：答题框架](#12-面试高频对比题答题框架)
  - [✅ 产出：TodoMVC 的框架移植实验](#-产出todomvc-的框架移植实验)
- [进阶篇：复杂业务场景](#进阶篇复杂业务场景)

---


## 如何使用本大纲

这份大纲不是"读完"的，是"写完"的。每一行知识点背后都假设你会打开编辑器敲一遍。在正式进入阶段 0 之前，先花五分钟搞清楚两件事：时间怎么分配（60/20/20），以及哪些内容可以跳过。这两件事直接决定你是 12 周学完，还是三个月后卡在"收藏夹里吃灰"。

### 60/20/20 节奏怎么落地

大纲末尾的《每周节奏建议》给出了比例：60% 写代码、20% 读官方文档、20% 复盘重构。比例本身简单，难点是落到每一天。推荐按"天"切片，而不是按"周"切片——按周规划很容易演变成"前六天摸鱼、周日赶工"。

以每天 90 分钟为例，切成三段：

- **前 50 分钟：写代码（60%）**。打开当天要做的场景，先不看任何资料，徒手写 15–30 分钟；写不出来或跑不通，再去查 react.dev 对应章节，查完回来继续写。这一段的核心纪律是"先动手后查资料"——查来的答案只有在你被卡住之后才会真正被记住。
- **中间 20 分钟：读文档（20%）**。只读当天场景对应的章节（比如今天做列表渲染，就只读 react.dev 的《Rendering Lists》），边读边回头对照自己刚写的代码，找出至少一处"官方做法和我不一样"的地方。禁止从文档第一页顺读到最后一页，那是最舒适也最低效的学习方式。
- **最后 20 分钟：复盘重构（20%）**。写完能跑不代表写好。问自己三个问题：命名能一眼看懂吗？有重复代码可以抽成组件或函数吗？有没有踩坑后绕过去、但没弄明白原因的地方？把绕过的坑补上注释，把"烂代码"改到自己愿意署名的程度。第二天开始新场景之前，先花 5 分钟再扫一眼昨天的文件——"把前一天写的烂代码改好，比多写新代码更有价值"。

如果每天只有 60 分钟，同样按 6:2:2 切：35 分钟写、12 分钟读、13 分钟改。比例比绝对时长重要，因为三个环节缺一不可：只写不读会形成错误的自创习惯；只读不写是"看得懂写不出"；不复盘则同样的错误会连犯三周。

另外，贯穿全程的项目线（TodoMVC → 迷你组件库 → 后台管理系统 → Next.js 全栈应用）不要等阶段结束才启动，而是每完成一个阶段就把学到的手法"回灌"进对应项目里。

### 怎么判断"可以跳过"

引言里说"可按阶段跳过已掌握内容"，但"已掌握"很容易被高估——看过 ≠ 会。判断标准用这三条自测，对着要跳过的场景逐条打分：

1. **盲写测试**：不看任何资料，能从空文件把这个场景写出来并跑通，且能解释每一行为什么这么写。
2. **坑位测试**：能主动说出这个场景的两个经典坑（症状和修法），而不是"好像有个什么坑"。
3. **讲授测试**：能给别人讲清楚这个场景，并回答"为什么必须这样、不这样会怎样"。

命中情况与对应策略：

- **三条全中**：跳过正文，只把这个场景的产出合并进项目（比如直接在商品卡片页里用上它，验证一遍就走）。
- **中两条**：不写独立 demo，但把场景塞进当周产出里顺手做一遍，做完对答案。
- **中一条或零条**：老实按基线流程写 demo。此处的"老实"是划算的——基础阶段的每个坑在后面项目阶段都会以十倍成本重现。

按背景的快捷跳读参考：有 Vue/Angular 经验的开发者，阶段 0、1 可以加速（框架间的"条件渲染/列表/组件通信"概念互通，重点是差异处，差异细节可对照文末《[延伸篇：React 与其他框架的对比](#延伸篇react-与其他框架的对比)》再回来读）；从 React 类组件时代过来的开发者，可以直接用函数组件写阶段 1，把全部时间押在阶段 2 的 hooks 心智模型上；完全的新手不要跳阶段 1，它只花一周，却是后面所有内容的语言基础。

最后：跳过不是永久跳过。如果在阶段 4 的项目里发现某个基础场景写不动，回到对应阶段补课，再继续往前——大纲是地图，卡壳点才是你真实的进度。

完成本大纲主体（阶段 1–4）后，Schema 动态表单、拖拽大盘、低代码等复杂场景见《[react-进阶大纲-复杂场景.md](react-进阶大纲-复杂场景.md)》，全景场景见《[react-高阶场景全景图.md](react-高阶场景全景图.md)》。

---

## 阶段 0：环境与工具（0.5 周）

| 场景 | 要做的事 |
|---|---|
| 项目初始化 | 用 Vite 创建 React + TS 项目，理解目录组织（按功能分 vs 按类型分） |
| 代码规范 | 配置 ESLint（含 `eslint-plugin-react-hooks`）+ Prettier |
| 调试工具 | 安装 React DevTools，学会看组件树、Props、高亮重渲染 |

表格三行分别对应"项目从哪来、代码怎么保持干净、出问题怎么查"。下面逐行展开：第 1 行对应 0.1（创建项目）与 0.2（目录组织）；第 2 行对应 0.3；第 3 行对应 0.4。

### 0.1 项目初始化：用 Vite 创建 React + TS 项目

**是什么**：用 Vite 的脚手架（create-vite）生成一个最小可运行的 React + TypeScript 项目，作为后续所有 demo 的宿主。

**为什么用 Vite 而不是其他**：Vite 是当前 React 官方生态事实上的默认脚手架（`react.dev` 的新建项目指引即指向它）。它在开发环境用原生 ES Module 按需编译——改一行代码，浏览器毫秒级热更新（HMR），不像旧工具链每次都要整体打包；生产构建则用 Rollup（Vite 6+）产出优化后的静态文件。对学习者还有一层价值：它生成的项目结构极简，没有隐藏的 webpack 配置，出问题时的因果链是可追的。

**怎么做**：

```bash
# 方式一：交互式创建，回车后按提示选择 React -> TypeScript
npm create vite@latest

# 方式二（推荐）：一步到位，直接指定项目名与 react-ts 模板
# 注意 npm 需要 "--" 把参数透传给脚手架；pnpm/yarn/bun 不需要
npm create vite@latest react-demo -- --template react-ts

cd react-demo
npm install      # 安装依赖
npm run dev      # 启动开发服务器，默认 http://localhost:5173
```

看到终端输出 `Local: http://localhost:5173/`，浏览器打开能看到一个转动的 React logo 页面，项目就建好了。加 `--host` 参数（`npm run dev -- --host`）可让同一局域网的手机访问，方便真机调试。

**产物结构逐项解说**。执行完后目录长这样：

```text
react-demo/
├── node_modules/         # 依赖（npm install 生成，不进 git）
├── public/               # 原样拷贝的静态资源
│   └── vite.svg
├── src/                  # 你的全部源码
│   ├── assets/           # 参与构建的静态资源
│   │   └── react.svg
│   ├── App.css           # App 组件的样式
│   ├── App.tsx           # 根组件
│   ├── index.css         # 全局样式
│   ├── main.tsx          # 应用入口：挂载点
│   └── vite-env.d.ts     # Vite 的 TS 类型补充
├── .gitignore
├── eslint.config.js      # ESLint 9 flat config（0.3 节细讲）
├── index.html            # 唯一的 HTML，与传统项目的最大差异
├── package.json
├── README.md
├── tsconfig.json         # TS 工程引用的入口
├── tsconfig.app.json     # src/ 下应用代码的 TS 配置
├── tsconfig.node.json    # vite.config.ts 这类 Node 环境代码的 TS 配置
└── vite.config.ts        # Vite 配置
```

逐项说明：

- **`index.html` 在项目根目录而不是 `public/` 里**——这是 Vite 与传统打包器（webpack）最直观的差异：Vite 把 HTML 当作"入口模块"，开发时它就是真实被浏览器加载的页面，JS 与 CSS 以 `<script type="module">` 的形式从 HTML 引出去。打开它可以看到关键的一行：

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <!-- React 应用的挂载点：main.tsx 会往这个 div 里渲染整棵组件树 -->
    <div id="root"></div>
    <!-- 以 ES Module 方式引入入口脚本，Vite 从这里开始按需编译 -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- **`src/main.tsx`** 是 JS 与 DOM 的交界处，只有几行，但每一行都值得认识：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// createRoot：React 18/19 的挂载 API，拿到根容器后整个应用由它驱动
// getElementById('root') 对应 index.html 里的 <div id="root">
// 末尾的 "!" 是 TS 语法：向编译器断言这个元素一定存在
createRoot(document.getElementById('root')!).render(
  // StrictMode：开发模式下会故意双调用渲染函数、双执行部分副作用，
  // 用来提前暴露不纯的写法；生产构建中它什么都不做
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- **`src/App.tsx`**：根组件，起步阶段你写 demo 就直接改它，或从它引入你的 demo 文件。
- **`public/` vs `src/assets/`**：两者都能放图片，机制完全不同。`public/` 里的文件构建时**原样拷贝**，用绝对路径引用（`/vite.svg`），不做任何压缩改名，适合 favicon、robots.txt 这类"就要这个路径"的文件；`src/assets/` 里的文件**参与构建管线**，通过 `import logo from './assets/x.png'` 引入，会被 hash 改名、可压缩，推荐业务资源都走这条路径。
- **`src/vite-env.d.ts`**：只有一行 `/// <reference types="vite/client" />`，它让 TS 认识 `import.meta.env` 环境变量和 `.svg/.png` 等资源的导入类型。没有它，IDE 会到处报红。
- **三个 tsconfig**：`tsconfig.json` 本身不配置任何东西，只通过 `references` 把工程拆成两半——`tsconfig.app.json` 管浏览器里跑的 `src/` 代码（`strict: true`、`jsx: "react-jsx"` 等），`tsconfig.node.json` 管构建期 Node 环境跑的 `vite.config.ts`。拆开的原因是两处的运行环境与模块机制不同，混在一套配置里必然顾此失彼。
- **`vite.config.ts`**：起步时只有 React 插件一项：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // react 插件负责两件事：JSX 转译 + 开发时的快速刷新（Fast Refresh，改代码不丢组件状态）
  plugins: [react()],
})
```

`package.json` 里预置的三个脚本：`npm run dev`（开发服务器）、`npm run build`（先 `tsc -b` 类型检查再 `vite build` 产出 `dist/`）、`npm run preview`（本地预览 `dist/` 构建产物）。

**常见坑**：

- 症状：本地一切正常，部署到 Linux 服务器/CI 后白屏，控制台报 `Failed to resolve module import`。根因：import 路径大小写与真实文件名不一致（macOS 文件系统默认大小写不敏感，`./Button` 能匹配 `button.tsx`；Linux 敏感，直接失败）。修法：统一文件名命名风格（组件 PascalCase、工具 kebab-case），并且 import 路径与文件名逐字符一致；平时留意 IDE 的路径自动补全，别手敲。
- 症状：改了 `vite.config.ts` 或 `.env` 文件后不生效。根因：这两个文件只在启动时读取一次。修法：重启 dev server（Ctrl/Cmd+C 后重新 `npm run dev`）。
- 症状：编辑器里类型报错但页面照常跑。根因：Vite 的开发转译用 esbuild，**不做任何类型检查**；`tsc` 只在 `npm run build` 时才跑。修法：把 IDE 的 TS 报错当真，别依赖页面能不能跑来判断对错；提交前跑 `npm run build` 让类型检查兜底。

### 0.2 目录组织：按功能分 vs 按类型分

**是什么**：随着文件增多，"新文件放哪"需要一个约定。社区主流两种：按文件**类型**分（所有组件一个目录、所有 hook 一个目录），或按**业务功能**分（一个功能的页面/组件/hook/API 全在一个目录）。

**为什么需要**：目录结构的本质不是"好看"，而是回答两个问题——"改一个功能时我要开几个目录？"和"这段代码被谁使用？"。结构错了，后期每个需求都要跨五六个目录跳转；结构对了，一个功能的高内聚变更落在一个文件夹里。

**怎么做（两种示例）**。按类型分（type-based）：

```text
src/
├── assets/                # 图片、字体
├── components/            # 全部"通用"组件
│   ├── Button.tsx
│   ├── Card.tsx
│   └── PriceTag.tsx
├── hooks/                 # 全部自定义 Hook
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
├── pages/                 # 全部页面
│   ├── Home.tsx
│   └── ProductList.tsx
├── services/              # 全部 API 请求
│   └── product.ts
├── utils/                 # 全部纯函数工具
│   └── format.ts
├── types/                 # 全局类型
│   └── product.ts
├── App.tsx
├── main.tsx
└── index.css
```

按功能分（feature-based / feature-first）：

```text
src/
├── app/                   # 应用级：入口、路由表、全局布局
│   ├── App.tsx
│   └── routes.tsx
├── features/              # 业务功能域，每个目录内部自治
│   ├── products/          # "商品"功能的页面、组件、hook、API、类型全在一起
│   │   ├── api.ts
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductFilter.tsx
│   │   ├── hooks/
│   │   │   └── useProducts.ts
│   │   ├── types.ts
│   │   └── ProductListPage.tsx
│   └── cart/
│       ├── CartButton.tsx
│       └── types.ts
├── components/            # 跨功能复用的通用组件仍然集中放
│   └── Button.tsx
├── hooks/                 # 跨功能复用的通用 Hook 仍然集中放
│   └── useDebounce.ts
├── main.tsx
└── index.css
```

注意按功能分的目录里**保留了**顶层 `components/` 与 `hooks/`——按功能分不是说"取消通用目录"，而是"只有真正被多个功能共享的东西才进通用目录"。

**优缺点对比与逐行解读**：

| 维度 | 按类型分 | 按功能分 |
|---|---|---|
| 上手成本 | 低，规则一句话说完 | 略高，需要先想清楚功能边界 |
| 改一个功能要开的目录 | 多（components/pages/services/types 各开一个） | 少（基本只开一个功能目录） |
| 删除一个功能 | 残留文件要到处找 | 删掉一个目录即净 |
| 命名冲突 | 少（同类型集中，重名显眼） | 多（各功能都有自己的 `types.ts`、`api.ts`，靠 import 路径区分） |
| 复用边界是否清晰 | 否：所有组件都在一个池子里，"能不能复用"全凭感觉 | 是：想跨功能使用时必须显式"提升"到通用目录，决策被强制做出来 |
| 适合阶段 | 起步期、页面 < 5 个、单人 | 多人协作、功能域明确、中大型项目 |

**演进建议**：不要在第一周就上按功能分——功能边界在没写过几屏代码之前是猜不准的，过早划分只会制造一堆只有一个文件的空目录。推荐路径：**起步用按类型分**（心智负担最小）；当出现"改一个商品需求要同时开 `components/`、`pages/`、`services/`、`types/` 四个目录"的实感时，再迁移到按功能分。迁移策略是增量式的：新功能一律按 feature 落地，旧功能在被大规模修改时顺手搬家，中间态（两种并存）是常态，不必一次性"大革命"。只有一条硬规则要遵守：**同类东西只有一个家**——不要 `components/Button.tsx` 和 `features/products/components/Button.tsx` 同时存在两份，双份必然走向分叉。

**常见坑**：

- 症状：`features/products/types.ts` 与顶层 `types/product.ts` 内容重复、改一处漏一处。根因：迁移期没有"唯一家"规则，新旧两处都在写。修法：明确"旧目录只出不进"，用 IDE 的查找引用把旧文件逐步清空后删除。
- 症状：组件循环依赖报警（A 引 B、B 又引 A）。根因：把"通用组件"反向依赖了某个 feature 的代码，层级倒挂。修法：依赖方向必须是 `features → components/hooks/utils`，通用目录永远不 import 功能目录；发现倒挂就把被依赖的部分下沉到通用层。

### 0.3 代码规范：ESLint（含 eslint-plugin-react-hooks）+ Prettier

**是什么**：ESLint 负责"对错"——找出危险或错误的写法（例如在条件分支里调用 Hook）；Prettier 负责"格式"——缩进、引号、换行，全部机器自动统一。

**为什么需要**：对学习者而言，ESLint 在这个阶段最值钱的能力不是风格检查，而是 **`eslint-plugin-react-hooks` 的两条规则会像贴身教练一样拦住你**：

- `react-hooks/rules-of-hooks`：Hook 只能在组件函数顶层调用。你一旦把 `useState` 写进 `if`/`for`/嵌套函数里，保存瞬间就报错——Hooks 的全部心智模型都建立在这条规则上，提前装好它，阶段 2 能少熬好几个夜。
- `react-hooks/exhaustive-deps`：`useEffect` 依赖数组缺项、多项都会警告。这是阶段 2 出镜率最高的警告，从第一天就让它陪着你。

Prettier 的价值则是消灭"格式讨论"：团队里（以及未来的你和自己）不再争论单引号还是双引号，保存即格式化，代码评审只看逻辑。

**怎么做**。create-vite 的 react-ts 模板已经内置了 ESLint（9 的 flat config），先补装 Prettier 及桥接包：

```bash
npm install -D prettier eslint-config-prettier
```

完整的 `eslint.config.js`（ESLint 9 flat config 写法，与 Vite/TS 模板同构，可直接抄）：

```js
// eslint.config.js —— ESLint 9 扁平配置（flat config）
// 旧版 .eslintrc.* 已废弃：这里导出一个配置数组，从上到下依次匹配合并
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 1. 全局忽略：构建产物与测试覆盖率不参与检查
  globalIgnores(['dist', 'coverage']),

  // 2. 对所有 TS/TSX 文件生效的规则集
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,                   // JS 语言层的基础规则（如 no-undef）
      tseslint.configs.recommended,             // TS 扩展规则（如 no-unused-vars 的 TS 版）
      reactHooks.configs['recommended-latest'], // 本节主角：rules-of-hooks + exhaustive-deps
      reactRefresh.configs.vite,                // 只允许组件文件导出组件，配合 Vite 热刷新不丢状态
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,                 // 告诉 ESLint 代码跑在浏览器：window/document 是内置全局
    },
  },

  // 3. Prettier 兼容层：关闭所有"与格式相关"的 ESLint 规则，必须放在最后
  prettier,
])
```

逐段说明：

- `defineConfig` / `globalIgnores` 是 ESLint 9.x 自带 `eslint/config` 导出的辅助函数（较新的 9.x 提供；若你的 ESLint 小版本较旧没有它们，退化为纯数组写法——把 `globalIgnores(['dist'])` 换成 `{ ignores: ['dist'] }`，去掉 `defineConfig` 包装，效果完全一致）。
- `extends` 数组顺序有意义：后面预设可以覆盖/补充前面的；`prettier` 放最外层最后，保证它"赢"过一切与格式相关的规则。
- 有意不装 `eslint-plugin-prettier`（把 Prettier 当 ESLint 规则跑）。推荐的做法是**两个工具彻底分工**：ESlint 只管逻辑与危险写法，Prettier 单独跑格式。混跑会让 lint 变慢，也让报错来源混乱。

Prettier 配置（项目根目录 `.prettierrc.json`，与 create-vite 模板代码风格一致）：

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all"
}
```

忽略文件 `.prettierignore`：

```text
dist
coverage
package-lock.json
pnpm-lock.yaml
```

在 `package.json` 补两个脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "preview": "vite preview"
  }
}
```

编辑器集成（VS Code，项目根 `.vscode/settings.json`）：保存时 Prettier 格式化 + ESLint 自动修复可修的问题，装好扩展 `esbenp.prettier-vscode` 与 `dbaeumer.vscode-eslint`（v3+ 默认就走 flat config，无需额外开关）：

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

装完自检：随便在一个组件里写 `if (cond) { const [x, setX] = useState(0) }`，保存后应立刻出现 `React Hook "useState" is called conditionally` 报错——看到它，说明 `rules-of-hooks` 已经在保护你了。

**常见坑**：

- 症状：`npm run lint` 报 `eslint.config.js` 找不到某些模块。根因：依赖没装全（模板只带了前五个，`eslint-config-prettier` 是我们后补的）或装完没重启编辑器的 ESLint 服务。修法：对照 import 逐个 `npm install -D`；VS Code 里 Cmd+Shift+P 执行 `ESLint: Restart ESLint Server`。
- 症状：ESLint 与 Prettier 互相打架（如 Prettier 删分号、ESLint 又要求加分号）。根因：没有 `eslint-config-prettier`，或它没放在配置最后。修法：确认 `prettier` 出现在配置数组末尾。
- 症状：跑 `eslint .` 时把 `dist/` 里的生成代码也检查了一遍，报一堆莫名错误。根因：忽略配置没生效（flat config 中 ignores 写在了带 files 的配置块里而不是全局块）。修法：用上面独立的 `globalIgnores(...)`（或 `{ ignores: [...] }`）作为数组第一项。

### 0.4 调试工具：React DevTools

**是什么**：浏览器扩展形态的官方调试器，让你"看见"组件树、每个组件当前的 props/state/hooks 值、以及谁在重渲染。它与 Elements 面板互补：Elements 看 DOM，DevTools 看**组件**。

**为什么需要**：React 的核心心智是"数据驱动视图"，出问题时 90% 的疑问其实是三个之一——"这个组件现在拿到什么 props？""它的 state 是什么值？""它为什么又渲染了？"DevTools 把这三个问题变成肉眼可见。

**安装**：Chrome/Edge/Firefox 应用商店搜索 "React Developer Tools" 安装。装好后打开你的 `npm run dev` 页面，按 F12，会多出 **Components** 与 **Profiler** 两个面板（页面上检测不到 React 时图标是灰色的）。Safari 无官方扩展，可用独立的 React DevTools 桌面应用通过 npm 启动后连接，初学期可先跳过。

**能力一：组件树检视（Components 面板）**。

1. 打开 Components 面板，左侧是从 `App` 开始的整棵组件树，点击任意组件节点。
2. 右侧面板分栏显示该组件的 **props / hooks / rendered（渲染出的 DOM）**：props 里每个值可展开（对象、数组、嵌套结构一目了然）；`useState` 在 hooks 栏显示当前值，还会标注它是第几个 hook。
3. 值可以直接**编辑**：点击一个 boolean 类型的 prop 值切换 true/false、点击字符串直接改文本，回车后组件立刻按新值重新渲染——这是"改一个 prop 看看效果"的最快实验手段，不用回编辑器改代码。
4. 右键组件节点选 "Store as global variable"，控制台里就有了一个 `$r` 变量指向该组件实例，可以打印它的 props 做进一步检查。

**能力二：高亮重渲染（怎么开、怎么读）**。

1. Components 面板右上角齿轮进入 Settings → General，勾选 **"Highlight updates when components render"（组件渲染时高亮更新）**。
2. 回到页面交互（点按钮、输入文字），每次有组件重新渲染，页面上对应区域会出现描边框。
3. 读法：颜色按更新频率从低到高在冷色到暖色之间变化（蓝/绿偏冷＝不频繁，黄/红偏暖＝高频，不同版本 UI 细节略有差异，记住"越暖越频繁"即可）。判断口径：
   - 静止不动的页面仍有持续暖色描边 → 有东西在周期性 setState（轮询、定时器、失控动画）；
   - 在输入框打一个字符、整页大面积变暖 → 状态放得太高，一个小 state 连坐了整棵树（阶段 2 讲"状态下放"、阶段 6 讲 memo 时回来对照）；
   - 只有目标组件及其必要子级描边 → 渲染范围健康。

**能力三：Profiler 的 "why did this render"（渲染原因分析）**。

1. 先开录制原因开关：Settings → **Profiler** 标签页 → 勾选 **"Record why each component rendered while profiling"（分析时记录每个组件的渲染原因）**。不开这个开关，Profiler 只能告诉你"谁渲染了"，开了才能告诉你"为什么"。
2. 切到 Profiler 面板，点左上角圆形录制按钮（变红表示录制中）。
3. 在页面上执行你要分析的操作（比如点一次"加入购物车"），点停止。
4. 顶部出现**提交（commit）列表**——React 每完成一次渲染就是一次提交，每条按耗时染色（越暖越慢）。逐条点选。
5. 选中某次提交后，下方火焰图/排行图展示这次提交中实际渲染的组件；点选单个组件，右侧即列出它本次渲染的原因，常见五种：
   - **Hooks changed** —— 某个 hook 的返回值变了（如 useState 的新值）；
   - **Props changed** —— 父组件传来的某个 prop 引用变了；
   - **State changed** —— 本组件 state 变了；
   - **The parent component rendered** —— 父组件渲染了，作为默认行为带着你一起渲染（这是最常见的"被连坐"）；
   - **Context changed** —— 消费的 context 值变了。
6. 读法示例：一个展示型组件频繁出现 "The parent component rendered"，说明它被父组件的无谓渲染连坐——阶段 6 的 `memo` 就是为此准备的；出现 "Props changed" 但你觉得值没变，多半是引用相等性问题（对象/函数每次都是新引用），那是阶段 2 `useMemo/useCallback` 的主场。现在只需要会"录制→点开→读原因"，解读手段后面阶段逐个补上。

**常见坑**：

- 症状：F12 里没有 Components/Profiler 面板。根因：扩展未安装、或页面用的是生产构建（生产构建不含调试信息，组件树功能受限）。修法：确认扩展已装且对 localhost 启用；调试一律在 `npm run dev` 的开发模式下进行。
- 症状：Profiler 里每个组件似乎都渲染了两次，怀疑性能灾难。根因：`main.tsx` 里的 `StrictMode` 在开发模式下故意双调用渲染函数，用来暴露不纯的副作用，生产构建不会发生。修法：无需修，读懂即可；做性能测量时对比提交列表要考虑这一因素。
- 症状：在 Components 面板里看不到自己组件的名字，只有 `Anonymous`/`_c` 之类。根因：组件用了匿名函数写法或被构建压缩改名。修法：组件永远用具名函数（`function ProductCard() {}` 而不是 `export default function () {}`），调试体验完全不同。

✅ 产出：一个干净可运行的项目骨架，后续所有 demo 都在这里写。

产出验收清单：

- [ ] `npm run dev` 可启动，页面正常渲染模板默认内容
- [ ] 能说出 `index.html`、`main.tsx`、`App.tsx`、`vite.config.ts` 各自的职责
- [ ] `npm run lint` 全绿；故意在条件分支里写 `useState` 能被 ESLint 拦下
- [ ] 保存任意文件时 Prettier 自动格式化生效
- [ ] DevTools 能看到组件树、能编辑一个 prop 并观察页面变化
- [ ] 已开启"高亮重渲染"与"记录渲染原因"两个开关，并各做过一次观察
- [ ] 已决定目录方案（建议先按类型分），并建好 `demos/` 目录准备放阶段 1 的 demo

---

## 阶段 1：渲染基础（1 周）

### 编码场景清单
1. **JSX**：表达式嵌入、`className`、内联样式对象、`Fragment`、条件展开（`{...spread}`）
2. **条件渲染全场景**：`&&` 陷阱（`count && <Tag/>` 当 count 为 0）、三元、提前 return、枚举映射（`statusMap[status]`）
3. **列表渲染**：key 的正确选择、为什么不能用 index、嵌套列表、列表中传事件参数
4. **Props**：解构 + 默认值、`children`、透传 rest props（`{...rest}`）
5. **事件处理**：合成事件与原生事件差异、传参的 3 种方式、阻止默认/冒泡
6. **组件通信**：父→子（props）、子→父（回调）、兄弟（状态提升）、跨层级（先手动传，体会 pain）

这六个场景是 React 的"字母表"：后面所有阶段——hooks、组件设计、性能优化——写的每一行代码都由这六个场景里的语法组成。建议每个场景单独建一个 demo 文件（`src/demos/scene-1-jsx.tsx` 起名），在 `App.tsx` 里切换渲染，做完一个换下一个。下面逐场景按"是什么 → 为什么需要 → 怎么做（机制分步）→ 代码示例 → 常见坑"展开。

---

### 场景 1：JSX——表达式嵌入规则

**是什么**：JSX 是 JavaScript 的语法扩展：写起来像 HTML，编译后是普通的 JS 函数调用（`<div>a</div>` 会变成形如 `jsx("div", { children: "a" })` 的代码）。浏览器并不认识 JSX，Vite 的 React 插件在你的浏览器拿到代码之前就把它转译好了。

**为什么需要**：UI 的本质是"结构 + 数据"，纯 JS 描述嵌套结构（`createElement('div', {...}, createElement('h1', ...))`）可读性极差；引入一套独立模板语言（如 Mustache）又要在模板里学第二套语法。JSX 取中间路线：结构长得像 HTML，数据与逻辑部分直接用 JS，两者可以无缝混写，模板里能用的东西（变量、函数、类型）JSX 里全能用。

**怎么做（机制分步）**：

1. **`{}` 是"回到 JS 世界的洞"**。JSX 标签之间的内容默认是文本，一旦出现 `{}`，里面的内容会被当作 JS 代码**求值**，结果插入到输出里。
2. **`{}` 里只能放"表达式"，不能放"语句"**。表达式 = 求值后能得到一个值的代码（变量、字面量、函数调用、三元、`&&`/`||`/`??`、`map`/`filter`、模板字符串、另一个 JSX）；语句 = 执行动作的代码（`if`/`for`/`while`/`switch`、变量声明）。判断口诀："这行代码能不能赋值给一个变量？能就是表达式。"所以 JSX 里看不到 `if` 和 `for`，它们的表达式替身分别是三元和 `map`。
3. **JSX 本身也是表达式**，所以它可以赋值给变量、作为函数返回值、塞进数组、嵌在另一个 `{}` 里。
4. **属性名遵循 JS 标识符规则，所以用驼峰**。JSX 的属性在编译后会变成一个 props 对象的键：`<div className="a" onClick={fn}>` 变成 `{ className: "a", onClick: fn }`。JS 里 `class` 是保留字、`tab-index` 这种连字符形式不是合法标识符，于是 HTML 的属性与事件名被映射成合法的驼峰键：`class`→`className`、`for`→`htmlFor`、`tabindex`→`tabIndex`、`onclick`→`onClick`。记住"JSX 属性 = JS 对象键"，驼峰就不再是需要背的清单，而是必然结果。
5. **内联样式必须传对象**：`style` prop 只接受一个样式对象，不能是字符串。`style={{ color: 'red' }}` 的两层括号不是特殊语法：外层 `{}` 是"进入 JS 表达式"，内层 `{}` 是一个对象字面量。属性名同样用驼峰（`backgroundColor`、`fontSize`），值大多为字符串；传数字时 React 会自动补 `px`，但 `flex`、`zIndex`、`opacity`、`lineHeight` 这类本就无单位的属性在白名单里、不会被拼 `px`；拿不准就写字符串（`width: '100%'`）。
6. **Fragment 解决"多根节点"**：组件返回的 JSX 以往要求单根，包裹一层 `<div>` 会污染 DOM 结构（布局被破坏、`<ul>` 里长出 `<div>` 是非法 HTML）。Fragment 让组件返回多个兄弟节点而不引入额外 DOM。短语法 `<></>` 是它的糖；**短语法不能接收任何 props**，因此需要 `key` 时必须写全 `<Fragment key={...}>`（`Fragment` 需从 `react` 导入）。
7. **`{...spread}` 把对象展开成一组 props**：`<Input {...commonProps} />` 等价于把 `commonProps` 的每个键值对作为独立 prop 传入。**覆盖顺序 = 书写顺序，后写的赢**：`<Input {...rest} placeholder="搜索" />` 中 `placeholder` 一定生效；反过来写则 `rest` 里的同名属性（如果有）会覆盖 `"搜索"`。

**代码示例**：

```tsx
// src/demos/scene-1-jsx.tsx
import { Fragment, useState, type CSSProperties } from 'react'

const user = { name: 'Yida' }

function JsxBasics() {
  const [liked, setLiked] = useState(false)
  const notices = 3

  return (
    // Fragment 短语法：包裹多个兄弟节点，DOM 里不会多出任何元素
    <>
      {/* 1. 表达式嵌入：变量、模板字符串、三元、&& 都可以放进 {} */}
      <h1 className="title">{user.name}</h1>
      <p>{`你有 ${notices} 条未读消息`}</p>

      {/* 2. JSX 本身是表达式，可以出现在任何"值"的位置 */}
      <p>今日心情：{liked ? '开心' : '平静'}</p>

      {/* 3. 内联样式：外层 {} 进 JS，内层 {} 是对象字面量；属性驼峰，数字自动补 px */}
      <span style={{ color: liked ? 'hotpink' : 'gray', fontSize: 14 }}>
        {liked ? '已赞' : '点赞'}
      </span>

      {/* 4. 自定义 CSS 变量：键名带连字符，TS 不认识，需要一次类型断言 */}
      <div className="card" style={{ '--card-gap': '8px' } as CSSProperties}>
        卡片内容
      </div>

      {/* 5. spread：展开成多个 props；后写的 placeholder 稳赢 */}
      <input
        {...{ type: 'text', maxLength: 20, placeholder: '会被覆盖的占位符' }}
        placeholder="搜索"
      />

      {/* 6. 事件也走同样的机制：onClick 的值是一个函数表达式 */}
      <button onClick={() => setLiked((v) => !v)}>切换状态</button>

      {/* 7. 注释必须写成 JSX 注释形式：{/\* \*}，直接写 // 会被当成文本 */}
    </>
  )
}

function PhotoAlbum({ photos }: { photos: string[] }) {
  return (
    <dl>
      {photos.map((src) => (
        // 列表里的 Fragment 不能用短语法——它收不了 key，必须写全 <Fragment>
        <Fragment key={src}>
          <dt>
            <img src={src} alt="" />
          </dt>
          <dd>照片说明</dd>
        </Fragment>
      ))}
    </dl>
  )
}

export default function Scene1() {
  return (
    <main>
      <JsxBasics />
      <PhotoAlbum photos={['/p1.png', '/p2.png']} />
    </main>
  )
}
```

**常见坑（症状→根因→修法）**：

- 症状：页面报错 `Objects are not valid as a React child (found: object with keys {...})`。根因：把一个普通对象直接放进了渲染位置——常见的是 `{product}`（想渲染商品名却传了整个对象）或 `{style}`（想传样式对象却渲染了它）。修法：渲染具体字段（`{product.name}`）；想调试对象内容用 `<pre>{JSON.stringify(product, null, 2)}</pre>`。
- 症状：写了 `class="title"` 页面样式不生效，控制台出现 `Invalid DOM property \`class\`. Did you mean \`className\`?` 警告（React 18 如此；React 19 对部分历史写法的处理有所放宽，但 `className` 仍是唯一正确写法）。根因：HTML 习惯带过来了；JSX 属性要变成 props 对象的键，`class` 是 JS 保留字。修法：改成 `className`；同理 `for` 改 `htmlFor`。
- 症状：`style="color:red"` 或 `style={color: 'red'}` 报错。根因：`style` 只接受对象，前者是字符串，后者是语法错误的"裸对象"。修法：写成 `style={{ color: 'red' }}`，并记住双括号的含义（表达式容器 + 对象字面量）。
- 症状：透传组件 `<Select {...rest} placeholder="请选择" />` 里自定义的 placeholder 怎么都不生效。根因：实际代码把顺序写反了（`placeholder` 在前、`{...rest}` 在后），`rest` 里同名属性覆盖了它——后写的赢。修法：把"定制项"放在 `{...rest}` 之后；并且遵守场景 4 会讲的约定：透传组件的显式 props 永远最后落笔。

---

### 场景 2：条件渲染全场景

**是什么**：根据数据的不同取值，让页面的不同部分"出现 / 消失 / 换形态"。JSX 里没有 `v-if` 或 `ng-if` 这类指令，条件渲染完全用 JS 表达式完成，主要四个工具：`&&`、三元、提前 return、枚举映射表。

**为什么需要**：真实界面到处是分支——有数据显示列表、没数据显示空态、加载中显示骨架、出错显示重试。React 的立场是"分支就是 JS 分支"，不发明新语法；代价是你要真正理解 JS 表达式的求值规则，其中最著名的一个坑就是 `&&` 陷阱。

**怎么做（机制分步）——先讲透 `&&` 陷阱**。

第一步，理解 JS 的 `&&`：**它返回的不是布尔值，而是两个操作数之一**。规则：左操作数可转布尔为 false 时，返回**左操作数本身**；否则返回**右操作数**。所以 `0 && <Tag/>` 的结果是 `0`，不是 `false`。同理 `'' && x` 得 `''`，`undefined && x` 得 `undefined`。

第二步，理解 React 的渲染白名单。React 遇到要渲染的值时，规则如下：

| 值 | 渲染结果 |
|---|---|
| `false` / `true` / `null` / `undefined` | 完全不渲染（连文本节点都没有） |
| 数字 `0`、`NaN` | 渲染为文本 `"0"`、`"NaN"` —— 肉眼可见！ |
| 字符串（含 `''`） | 渲染为文本；空字符串不可见，但会生成空文本节点 |
| 对象、数组以外的其他类型 | 按上述规则归类 |

第三步，两者相乘就是事故：`count && <Badge/>` 当 `count === 0` 时表达式结果是 `0`，React 如实把 `"0"` 渲染出来——你想"购物车为空就不显示角标"，页面上却出现一个孤零零的 `0`。复现代码：

```tsx
// ❌ 反面教材：购物车角标
// count 为 0 时，&& 左侧求值为 0 本身；0 是数字，不在 React 的"忽略名单"里
// 于是页面渲染出：<span class="badge">0</span>
function CartBadge({ count }: { count: number }) {
  return <span className="badge">{count && `${count} 件`}</span>
}
```

**三种修法与语义差异**：

```tsx
import { useState } from 'react'

function CartBadge({ count }: { count: number }) {
  // 修法一（推荐）：显式比较——表达式恒为 boolean，语义精确到"大于 0 才显示"
  return <span className="badge">{count > 0 && `${count} 件`}</span>
}

function CartBadgeCoerce({ count }: { count: number }) {
  // 修法二：强制转布尔——!! 或 Boolean()，语义是"一切 falsy 都不显示"
  // 会把 0、NaN、undefined 一并藏掉；注意它也可能掩盖数据异常（NaN 也被吞了）
  return <span className="badge">{Boolean(count) && `${count} 件`}</span>
}

function CartBadgeTernary({ count }: { count: number }) {
  // 修法三：三元显式写出两个分支——结构最明确，以后 else 侧要放内容不用改骨架
  return <span className="badge">{count > 0 ? `${count} 件` : null}</span>
}

export default function Scene2Badge() {
  const [count] = useState(0) // 试着把 0 换成 3，对比三种写法
  return <CartBadge count={count} />
}
```

三者怎么选：业务语义是"数量大于 0"这类明确条件时用修法一；值来源杂、任何 falsy 都不该显示时用修法二；预见到"否则显示 XXX"的需求在路上（如空态文案）时直接用修法三。团队里统一一种风格比争论哪种最好更有价值。

**同类陷阱清单**：`errors.length && <ErrorList/>`（`length` 是数字，空数组时页面上出现裸 `0`，这是 `&&` 陷阱最高发变种）；`price && <Price/>`（`price` 从接口来且可能为 `0`）；`items.length ? ... : ...` 无此问题（三元分支由你显式给）；`NaN` 会出现 `"NaN"` 字样；`''` 不可见所以没人报 bug，但性质相同。

**三元表达式的语义边界**：三元适合"两个分支都要渲染东西"的场景（`{dark ? <Moon/> : <Sun/>}`）；一支渲染一支为空的场景应该用修好陷阱的 `&&`；嵌套三元（`a ? b : c ? d : e`）在第二层就该重构成提前 return 或抽组件——JSX 里可读性衰减极快。

**提前 return**：卫语句风格，把异常/边界情况先打发出局，主干零缩进。它工作在**函数层面**而不是 JSX 表达式层面，所以适合"整个组件换形态"的场景：

```tsx
import { useState } from 'react'

type LoadStatus = 'loading' | 'error' | 'success'

interface ProductListProps {
  status: LoadStatus
  products: { id: string; name: string }[]
}

function ProductList({ status, products }: ProductListProps) {
  // 三个卫语句依次出局：加载中、出错、空数据
  if (status === 'loading') return <p>加载中…</p>
  if (status === 'error') return <p>出错了，请刷新重试</p>
  if (products.length === 0) return <p>暂无商品</p>

  // 主干逻辑在这里，没有被嵌套条件包住
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  )
}

export default function Scene2Return() {
  const [state] = useState<{ status: LoadStatus; products: { id: string; name: string }[] }>({
    status: 'success',
    products: [{ id: 'p1', name: '机械键盘' }],
  })
  return <ProductList status={state.status} products={state.products} />
}
```

**枚举映射（statusMap）**：当分支条件是"一个变量的多个取值"，且每个取值对应一段配置（文案、颜色、图标）时，if/else 链和嵌套三元都会失控。映射表把"状态 → 展示"的数据关系变成一张表，新增状态只加一行。配合 TS 的 `satisfies` 可以让这张表获得"键必须齐全、值形状必须正确"的编译期校验：

```tsx
import { useState } from 'react'

interface StatusMeta {
  label: string
  tone: 'gray' | 'blue' | 'green' | 'red'
}

// 模式一：先写表，用 satisfies 校验值的形状，再从表派生状态联合类型
// satisfies 的作用：类型检查（每个值都符合 StatusMeta），但不改变 TS 对对象的推断
// —— 写成 as const 则值被冻结成字面量，写成 as 则完全不检查，都有代价
const statusMap = {
  idle: { label: '未开始', tone: 'gray' },
  loading: { label: '加载中', tone: 'blue' },
  success: { label: '已完成', tone: 'green' },
  error: { label: '失败', tone: 'red' },
} satisfies Record<string, StatusMeta>

// keyof typeof 拿到的是精确的字面量联合，而不是宽泛的 string
type Status = keyof typeof statusMap // 'idle' | 'loading' | 'success' | 'error'

// 模式二：状态联合来自别处（比如接口文档已经定死取值），用 satisfies Record<OrderStatus, ...>
// 强制这张表配齐每个状态——故意注释掉下面任意一行，编译立刻报错，枚举映射永远与业务状态同步
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'done'

const orderStatusMap = {
  pending: { label: '待支付', tone: 'gray' },
  paid: { label: '已支付', tone: 'blue' },
  shipped: { label: '已发货', tone: 'green' },
  done: { label: '已完成', tone: 'green' },
} satisfies Record<OrderStatus, StatusMeta>

function StatusBadge({ status }: { status: Status }) {
  const meta = statusMap[status]
  return <span className={`badge badge--${meta.tone}`}>{meta.label}</span>
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMap[status]
  return <span className={`badge badge--${meta.tone}`}>{meta.label}</span>
}

export default function Scene2Map() {
  const [status, setStatus] = useState<Status>('idle')
  // setStatus('loading') 合法；setStatus('done') 直接编译报错——错误在编辑期就被拦下
  return (
    <div>
      <StatusBadge status={status} />
      <OrderStatusBadge status="paid" />
      <button onClick={() => setStatus('loading')}>开始加载</button>
    </div>
  )
}
```

`satisfies` 与两种旧写法的差别一句话记牢：`as const` 只冻结不校验；`as` 是"闭嘴断言"；`satisfies` 是"校验但保留推断"，因此 `statusMap['idle'].tone` 依旧保有精确类型。

**常见坑（症状→根因→修法）**：

- 症状：列表为空时页面出现裸 `0`。根因：`list.length && <List/>`，空数组 `length` 为 0，数字被渲染。修法：`list.length > 0 && <List/>`。
- 症状：`statusMap[status]` 运行时报 `Cannot read properties of undefined (reading 'label')`。根因：`status` 来自接口等外部数据，实际值超出了表的键集合（大小写不一致、新增状态忘了配表）。修法：入口处收窄类型（校验 `status in statusMap`），或查表时兜底 `statusMap[status] ?? statusMap.idle`；根本解法是让"状态联合类型 + satisfies 校验"在编译期挡住漏配。
- 症状：明明想隐藏元素却仍占着布局。根因：用 `style={{ display: 'none' }}` 或 CSS 类隐藏，元素仍在 DOM。修法：条件渲染（不渲染 = DOM 里根本没有）；两种手段用途不同——条件渲染适合"数据驱动的分支"，CSS 隐藏适合"纯视觉的暂时隐藏"。

---

### 场景 3：列表渲染

**是什么**：用数组的 `map` 把数据变成一组 JSX 元素，这是 React 渲染集合的唯一正统方式（没有 `v-for` 指令）。

**为什么需要**：商品、订单、消息……业务界面 80% 的内容是"同一结构重复 N 份"。命令式思路是拼 HTML 字符串或克隆 DOM 节点；React 的思路是声明式——`数据数组 --map--> 元素数组`，数据变了数组自动跟着变。而让这套机制正确又高效的关键，就是 `key`。

**怎么做（机制分步）**：

1. `todos.map(todo => <li>...</li>)` 返回一个 JSX 数组，React 把它渲染成一组兄弟节点。`{}` 里放的就是这个数组表达式。
2. React 渲染列表后，**下一次渲染**（比如删了一项）不是推倒重来，而是把"上一轮的元素数组"和"这一轮的元素数组"逐位对比（Diff），能复用的复用，不能复用的销毁/新建。
3. **`key` 是 React 在兄弟之间识别"这条数据还是不是原来那条"的身份标识**。匹配规则：type 相同且 key 相同 → 认为是同一个节点，复用（更新 props 后继续用）；否则销毁旧的、挂载新的。**身份标识 vs 位置**是本场景的核心：稳定 id 作 key，React 认的是"数据的身份"；index 作 key，React 认的就退化为"位置"——数据怎么变，位置 0 永远叫位置 0。
4. 由此推出 key 的选型规则：**来自数据的稳定唯一标识（id、slug）> 能唯一确定该项的其他字段组合 > index（仅当列表静态：不增删、不排序、不过滤、项无内部状态）**。随机数（`Math.random()`）作 key 禁用——每次渲染身份都变，等于每次全量重建。

**经典错案一：删除中间项，勾选状态错位**。每行数据带一个本地勾选状态（组件内部 `useState`，挂在"节点"上）：

```tsx
import { useState } from 'react'

interface Fruit {
  id: string
  name: string
}

function Row({ fruit }: { fruit: Fruit }) {
  // 勾选状态属于这个组件实例；实例 = "type + key" 识别出的那个节点
  const [checked, setChecked] = useState(false)
  return (
    <li>
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        {fruit.name}
      </label>
    </li>
  )
}

export default function FruitList() {
  const [fruits, setFruits] = useState<Fruit[]>([
    { id: 'f1', name: '苹果' },
    { id: 'f2', name: '香蕉' },
    { id: 'f3', name: '樱桃' },
  ])

  return (
    <>
      <ul>
        {/* ❌ 先看 index 作 key 的版本（把下行解除注释、注释掉 id 版本即可复现） */}
        {/* {fruits.map((f, i) => (
          <Row key={i} fruit={f} />
        ))} */}
        {/* ✅ 稳定 id 版本 */}
        {fruits.map((f) => (
          <Row key={f.id} fruit={f} />
        ))}
      </ul>
      <button
        onClick={() => setFruits((prev) => prev.filter((f) => f.id !== 'f2'))}
      >
        删除香蕉
      </button>
    </>
  )
}
```

先勾选"香蕉"，再点"删除香蕉"，用 index key 复现完整时序：

| 时刻 | 数据 | index key 的兄弟序列 | React 的匹配动作 | 用户看到的 |
|---|---|---|---|---|
| 初始渲染 | [苹果, 香蕉, 樱桃] | key 0→苹果节点, 1→香蕉节点(已勾), 2→樱桃节点 | — | 三行，香蕉已勾 |
| 删除香蕉后 | [苹果, 樱桃] | key 0→苹果, 1→樱桃 | key 0 命中旧"苹果"节点，不动；key 1 命中**旧香蕉的节点**——它身上的勾选状态跟着节点走，只是 props 换成了樱桃；key 2 的旧樱桃节点销毁 | 樱桃**莫名已勾** |

换稳定 id 作 key 后同一时序：`f1`/`f3` 各自命中自己的旧节点（状态原样保留），`f2` 的节点连同它的勾选状态一起被销毁——所见即所得。

**经典错案二：删除首行，输入框内容残留**。非受控 `<input>` 里用户敲的字保存在 DOM 节点上，而 DOM 节点跟着"key 识别出的节点"走：

```tsx
import { useState } from 'react'

interface Note {
  id: string
  label: string
}

export default function NoteList() {
  const [notes, setNotes] = useState<Note[]>([
    { id: 'n1', label: '购物清单' },
    { id: 'n2', label: '会议纪要' },
    { id: 'n3', label: '读后感' },
  ])

  return (
    <ul>
      {notes.map((note, index) => (
        // ❌ 故意用 index 作 key，复现"输入内容跟位置走"的错案
        <li key={index}>
          <span>{note.label}：</span>
          {/* 非受控输入：你敲进去的字存在 DOM 节点里，属于"这个位置" */}
          <input placeholder="备注" />
          <button onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}>
            删除
          </button>
        </li>
      ))}
    </ul>
  )
}
```

复现时序（逐步照做）：

1. 初始渲染：三行对应位置 0/1/2，DOM 节点记作 D0、D1、D2。
2. 在第二行（"会议纪要"，D1）的输入框里敲 `hello`——这个字现在物理地存在于 D1 里。
3. 点第一行的"删除"。数据变为 [会议纪要, 读后感]。
4. 新一轮渲染的 index key 序列：位置 0→会议纪要，位置 1→读后感。React 匹配：位置 0 命中 D0（原本是购物清单那行）——它上面的输入框是空的，但现在标签变成了"会议纪要"；位置 1 命中 D1——标签变成"读后感"，**但输入框里仍是你敲的 `hello`**。
5. 用户视角：第二行明明已经是"读后感"，输入框却残留着上一条的备注——数据与视图错位。

把 `key={index}` 改成 `key={note.id}`：删除后 n2、n3 各自命中原节点，`hello` 随 n2 所在行留在它该在的地方。补充一个进阶事实：如果输入框完全受控（`value` 与 `onChange` 全连到数据上），显示值会跟着数据走、错位被掩盖——但组件内部 `useState`、`useEffect`、非受控 DOM 依然挂在节点上，index key 的隐患并没有消失，只是这次没炸。

**嵌套列表的 key 唯一性范围**：key 只要求**同一父级下的兄弟之间**唯一。两个不同的 `<ul>` 里各自出现 `key="a"` 互不冲突；但两个分组里的商品 id 撞号时（A 组和 B 组都有 `id: 'p1'` 的商品），若它们恰好渲染在同一父级下就会冲突——稳妥做法是给 key 加上父级命名空间：

```tsx
interface Group {
  id: string
  name: string
  items: { id: string; name: string }[]
}

function Catalog({ groups }: { groups: Group[] }) {
  return (
    <ul>
      {groups.map((g) => (
        // 外层 key：分组之间唯一即可
        <li key={g.id}>
          {g.name}
          <ul>
            {g.items.map((p) => (
              // 内层 key：与父级 id 拼接，避免不同分组的同名 id 在兄弟间撞车
              <li key={`${g.id}-${p.id}`}>{p.name}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

export default function Scene3Nested() {
  const groups: Group[] = [
    { id: 'g1', name: '水果', items: [{ id: 'p1', name: '苹果' }] },
    { id: 'g2', name: '数码', items: [{ id: 'p1', name: '键盘' }] }, // 故意同 id
  ]
  return <Catalog groups={groups} />
}
```

**列表中传事件参数的三种方式**：

```tsx
import { useState } from 'react'
import type { MouseEvent } from 'react'

interface Todo {
  id: string
  title: string
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 't1', title: '学 JSX' },
    { id: 't2', title: '学列表渲染' },
  ])

  // 方式一的处理器：参数就是要用的数据，最直观
  function handleToggle(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: t.title + ' ✅' } : t)))
  }

  // 方式二的处理器：柯里化——先吃业务参数，返回一个"已绑定参数"的事件处理器
  const handleRemove = (id: string) => (e: MouseEvent<HTMLButtonElement>) => {
    // 阻止冒泡：不让这次点击传到 ul 的委托处理器（方式三），避免连锁触发
    e.stopPropagation()
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  // 方式三的处理器：委托——监听只挂在 ul 上，点击任何后代都能靠 data-id 找回数据
  function handleListClick(e: MouseEvent<HTMLUListElement>) {
    // e.target 是实际被点的后代元素，向上找携带 data-id 的 li
    const li = (e.target as HTMLElement).closest('li[data-id]')
    if (!li) return
    const id = li.dataset.id
    if (id) console.log('点击行预览：', id)
  }

  return (
    // 方式三：ul 一个监听器管住所有行，行元素本身不需要绑定任何 onClick
    <ul onClick={handleListClick}>
      {todos.map((todo) => (
        <li key={todo.id} data-id={todo.id}>
          <span>{todo.title}</span>
          {/* 方式一：箭头函数包装（最常用）——参数随意传，事件对象要才拿；
              stopPropagation 防止这次点击又冒到 ul 触发"预览" */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggle(todo.id)
            }}
          >
            完成
          </button>
          {/* 方式二：柯里化——调用即生成绑定好参数的处理器 */}
          <button onClick={handleRemove(todo.id)}>删除</button>
        </li>
      ))}
    </ul>
  )
}
```

三种方式对比：

| 方式 | 可读性 | 性能 | 适用场景 |
|---|---|---|---|
| 箭头函数包装 | 最好，一眼看懂 | 每次渲染创建新函数；只有子组件被 `memo` 包裹且作为 prop 传入时才有感知（阶段 2 详解），列表项内联使用无碍 | 默认选择 |
| 柯里化/工厂函数 | 好，但多一层跳转 | 同样每次生成新函数 | 处理器需要复用（同一工厂服务多个列表）、或参数较多想统一收口 |
| data-* + 委托 | 一般，多一步 closest 查找 | 一个监听器管 N 项；项数极大（上千行）或增删极频繁时才占优 | 长列表、表格体、项内结构复杂到不好逐个绑定时 |

类组件时代的 `this.handleToggle.bind(this, id)` 与方式二同思想，函数组件没有 `this`，不必再学，见得到能认出即可。

**常见坑（症状→根因→修法）**：

- 症状：控制台警告 `Each child in a list should have a unique "key" prop`。根因：map 出的元素没给 key，React 只能按位置兜底（等价于 index key 的全部风险）。修法：给稳定 id；警告里如果显示的是"unique"，还要检查兄弟间是否撞号（见嵌套一节）。
- 症状：删除/排序/过滤后，勾选、输入、展开等本地状态"跳"到了别的行。根因：index（或会变的值）作 key，状态跟着"位置"而不是"数据"走。修法：换成数据侧稳定唯一 id；没有 id 的数据在获取时生成一次并保存（`crypto.randomUUID()`），不要在 render 里现场生成。
- 症状：`key={Math.random()()}` 式写法导致每次渲染整列表重建、输入框频繁失焦。根因：随机数让每轮 key 全变，React 认为全是新节点。修法：同上，用稳定标识。
- 症状：列表渲染报 `Objects are not valid as a React child`。根因：map 里返回了对象（如 `todos.map(t => t)`）而不是 JSX。修法：map 的回调必须返回元素（`t => <li key={t.id}>{t.title}</li>`）。

---

### 场景 4：Props

**是什么**：props 是父组件传给子组件的只读输入——组件函数的参数。`<PriceTag price={399} />` 就是调用 `PriceTag({ price: 399 })`。子组件对 props 只有读权限，没有写权限。

**为什么需要**：组件要可复用，就必须把"结构"与"数据"分离——同一个 `ProductCard` 结构可以装任何商品的数据，靠的就是 props 这个参数化机制。它同时是组件通信的基础（场景 6 展开）：父→子传数据、子→父传回调，走的都是 props。

**怎么做（机制分步）**：

1. **解构 + 默认值**：直接在函数参数位解构，可选 prop 给默认值，函数体内用到的都是具名变量，省去满屏 `props.`。
2. 默认值只对 `undefined` 生效：不传（`undefined`）触发默认；显式传 `null` **不会**触发默认——这是高频意外，需要兜 null 时用 `??`。
3. **children**：开闭标签之间的内容会以 `children` 这个 prop 传入。children 的形态不限：普通 JSX、文本、JSX 数组、甚至**函数**——函数形态就是"render prop"模式的原型（阶段 3 正式展开）。
4. **rest props 透传**：参数位解构走一部分后，剩余属性用 `...rest` 收走；封装原生元素时把 `onClick`、`type`、`aria-*` 等原样转交给底层 `<button>`，调用方体验与原生一致。想禁止某些属性透传，在类型上用 `Omit` 移除。

**代码示例**：

```tsx
import { type ButtonHTMLAttributes, type ReactNode } from 'react'

// ① 解构 + 默认值：可选 prop 就地给默认值
interface ProductCardProps {
  title: string
  price: number
  currency?: string // 可选
  footer?: ReactNode // children 之外的第二个"插槽"
  children?: ReactNode
}

function ProductCard({
  title,
  price,
  currency = '¥', // 默认值只对 undefined 生效，传 null 拦不住
  footer = null,
  children,
}: ProductCardProps) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>
        {currency}
        {price.toFixed(2)}
      </p>
      {children}
      {footer}
    </article>
  )
}

// ② children 的函数形态：调用方传一个函数，组件在合适的时机调用它拿回渲染内容
//    这就是 render prop 模式的原型，阶段 3 会用它手写 MouseTracker 等组件
function DataList<T extends { id: string }>({
  items,
  children,
}: {
  items: T[]
  children: (item: T) => ReactNode // children 是"函数"而非节点
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{children(item)}</li> // 每一项的渲染权交给调用方
      ))}
    </ul>
  )
}

// ③ rest props 透传：没被解构的属性整体收进 rest，原样转交底层元素
type Variant = 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  // rest 里可能是 type / disabled / onClick / aria-label……全部透传给原生 button
  return <button className={`btn btn--${variant} ${className ?? ''}`} {...rest} />
}

// ④ 想禁止透传某些原生属性：类型上 Omit 掉，调用方一传就编译报错
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  icon: ReactNode
  label: string // 用受控的 label 代替原生 title
}

function IconButton({ icon, label, ...rest }: IconButtonProps) {
  return (
    <button aria-label={label} {...rest}>
      {icon}
    </button>
  )
}

export default function Scene4() {
  const products = [
    { id: 'p1', name: '机械键盘', price: 399 },
    { id: 'p2', name: '显示器', price: 1299 },
  ]
  return (
    <div>
      {/* children 传 JSX；footer 是第二个内容入口；currency 走默认值 */}
      <ProductCard title="机械键盘" price={399}>
        <p>热插拔轴体</p>
      </ProductCard>

      {/* children 传函数：列表怎么渲染每一项，由调用方决定 */}
      <DataList items={products}>
        {(p) => (
          <span>
            {p.name} - ¥{p.price}
          </span>
        )}
      </DataList>

      {/* rest 透传：和原生 button 用法一致，还多一个 variant */}
      <Button variant="ghost" type="button" disabled onClick={() => console.log('点了')}>
        取消
      </Button>

      <IconButton icon={<span>⭐</span>} label="收藏" type="button" />
    </div>
  )
}
```

**常见坑（症状→根因→修法）**：

- 症状：默认值没生效，页面显示空。根因：调用方显式传了 `null`（如 `currency={data.currency ?? null}`），而 ES 默认参数只拦 `undefined`。修法：组件内用 `currency ?? '¥'` 兜底；或约定团队里"缺省一律传 undefined、不传 null"。
- 症状：封装组件透传后，控制台报 `React does not recognize the X prop on a DOM element`（ Warning: Unknown prop）。根因：把非 DOM 属性（如 `variant`、自定义业务字段）也 spread 到了原生元素上。修法：像上面 Button 一样把自定义 prop 单独解构出来，只把合法的 `...rest` 交给 DOM。
- 症状：传给子组件的 `style`/`className` 被组件内部样式覆盖。根因：组件里 `<div className="my-class">` 写死，没给调用方覆盖入口，或合并顺序不对。修法：接受 `className` 并拼接（自定义类放后保证能覆盖），如 `className={`btn ${className ?? ''}`}`。

---

### 场景 5：事件处理

**是什么**：`onClick`、`onChange`、`onSubmit` 这些 `on` 开头的 props 是 React 的**合成事件（SyntheticEvent）**系统入口——你拿到的事件对象 `e` 是 React 包装过的跨浏览器统一对象，不是原生 DOM 事件。

**为什么需要**：直接用原生 `addEventListener` 需要手动管理"何时绑定、何时解绑"，忘了解绑就是内存泄漏；且不同浏览器（尤其历史版本）的事件对象行为有差异。React 把事件统一收口：声明式地在 JSX 上写处理器，绑定与解绑由 React 管理，事件对象统一包装，行为跨浏览器一致。

**怎么做（机制分步）**：

1. **委托机制**：React 并不把你写的 `onClick` 绑在每个 DOM 元素上，而是在应用**根容器**上绑定少数几个原生监听器。用户点击后，原生事件沿 DOM 冒泡到根容器，React 再沿**组件树**从内到外依次调用你写的合成事件处理器——所以你在子组件里调 `e.stopPropagation()` 能阻止外层组件的 `onClick` 触发，尽管两个处理器在 DOM 上都没有独立监听器。
2. **版本变化要知道**：React 16 及以前委托挂在 `document` 上；**React 17 起改为挂在 `createRoot` 的根容器元素上**（React 19 延续），好处是同页多个 React 应用互不干扰、与原生 `document` 监听器的触发顺序更符合直觉。另一个历史包袱——事件池（event pooling，17 之前的异步读取事件对象会得到 `null`）——在 React 17 已移除，现在异步代码里读 `e.target` 不会再炸（但取值仍以你处理那一刻为准，养成先取需要的字段再进异步的习惯）。
3. **`e.nativeEvent`**：合成事件对象上的这个属性指向底层原生事件。两个典型用途：合成事件没有逐一转发的字段要去原生对象上拿（例如指针类事件的 `e.nativeEvent.pointerId`）；第三方库只认原生事件时把 `e.nativeEvent` 递给它。第三个高频用途见下文"经典坑"。
4. **事件类型**：TS 里处理器的参数类型从 `react` 导入，常用：`MouseEvent<HTMLButtonElement>`、`ChangeEvent<HTMLInputElement>`（注意 change 在 React 里是受控的"输入即触发"，与原生 change 的"失焦触发"语义不同）、`FormEvent<HTMLFormElement>`、`KeyboardEvent<HTMLInputElement>`。尖括号里是绑定该事件的元素类型，写对了 `e.target` 才有精确类型。
5. **捕获阶段**：`onClickCapture` 在捕获阶段触发（外层先于内层），个别"必须在最外层先截住"的场景（全局埋点、点击外关闭）会用到。

**传参的三种方式**：与场景 3 的表格同一套（箭头包装 / 柯里化 / data-* 委托），事件语境下的补充是类型标注。完整示例：

```tsx
import { useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'

export default function SearchForm() {
  const [keyword, setKeyword] = useState('')

  // 表单提交：参数类型标注 FormEvent<HTMLFormElement>
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // 阻止默认行为：浏览器收到 submit 后默认会刷新页面/跳转，必须拦
    e.preventDefault()
    console.log('搜索：', keyword)
  }

  // 受控输入：React 的 onChange 是"每次键入都触发"，不是原生 change 的失焦触发
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value) // 元素类型标对了，e.target.value 才有类型提示
  }

  // 方式二示例：柯里化处理器——先吃业务参数，返回真正的事件处理器
  function track(action: string) {
    return (e: MouseEvent<HTMLButtonElement>) => {
      console.log('埋点：', action, '坐标', e.clientX, e.clientY)
    }
  }

  return (
    <div onClick={() => console.log('外层 div 的 onClick 触发了')}>
      <form onSubmit={handleSubmit}>
        <input value={keyword} onChange={handleChange} placeholder="请输入关键词" />
        {/* 方式一：箭头包装传业务参数 */}
        <button type="submit" onClick={() => console.log('点的是提交按钮')}>
          搜索
        </button>
        {/* 方式二：调用即生成绑定好参数的处理器 */}
        <button type="button" onClick={track('search_click')}>
          埋点按钮
        </button>
      </form>

      {/* 阻止冒泡：点击它时，外层 div 的 onClick 不会触发 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          window.scrollTo({ top: 0 })
        }}
      >
        回到顶部
      </button>
    </div>
  )
}
```

**preventDefault / stopPropagation 在 React 里的行为**：

- `e.preventDefault()`：阻止**默认行为**——表单提交刷新页面、`<a href>` 跳转、复选框勾选、右键菜单。它是"浏览器默认动作"开关，与事件传播无关。
- `e.stopPropagation()`：阻止**合成事件继续传播**——本元素之后（更外层）的 React 处理器不再收到这个事件。它不会阻止默认行为，两者是独立开关，别指望一个顶俩。
- 命名说明：这两个方法与原生 DOM 事件**同名同拼**，因为合成事件就是把原生 API 原样暴露给你；真正的差异不在名字，而在 `stopPropagation` 拦的是 **React 合成传播链**（见机制第 1 步与下方的 document 经典坑）。
- **经典坑——document 上的原生监听器拦不住**。React 的委托在根容器上；你的 `onClick` 处理器执行时，原生事件才刚冒泡到根容器，`e.stopPropagation()` 只掐断了 React 的合成传播链，原生事件会**继续从根容器冒泡到 document**。于是"点击弹层外关闭"这类绑在 `document` 上的原生监听器照样触发，点弹层内部按钮会把弹层一起关掉。修法：在 React 处理器里改用 `e.nativeEvent.stopPropagation()`，把原生传播也一并掐断在根容器。验证代码（其中 `useEffect` 的完整规则阶段 2 讲，现在先照抄）：

```tsx
import { useEffect, useState } from 'react'

export default function NativeListenerDemo() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // 原生监听器绑在 document 上（很多"点击外部关闭"的库就是这么做的）
    const onDocClick = () => setOpen(false)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div>
      <button
        onClick={(e) => {
          // 只用 e.stopPropagation() 时：React 合成链被拦，但原生事件仍冒到 document，
          // onDocClick 依旧执行——点"打开"的瞬间弹层又被关上，open 永远打不开
          // 修法：连原生一起拦
          e.stopPropagation()
          e.nativeEvent.stopPropagation()
          setOpen(true)
        }}
      >
        打开弹层
      </button>
      {open && <div className="dialog">我是弹层，点外面才会关</div>}
    </div>
  )
}
```

**常见坑（症状→根因→修法）**：

- 症状：`<button>` 没写 `type`，放在表单里点击触发整页刷新。根因：原生 button 默认 `type="submit"`，等于隐式提交表单。修法：非提交按钮一律显式 `type="button"`。
- 症状：想传参数写成了 `onClick={handleRemove(item.id)}`，页面一渲染函数就被执行了。根因：JSX 属性值是表达式，`handleRemove(item.id)` 是**调用**并把返回值（多半是 `undefined`）当作事件处理器。修法：包一层箭头函数 `onClick={() => handleRemove(item.id)}`——传的是函数本身。
- 症状：React 里 `onChange` 触发时机和 jQuery 时代记忆的不一样。根因：React 的 `onChange` 是受控语义（每次输入触发，对齐原生 `input` 事件）。修法：按受控模型使用；确需"失焦才触发"用 `onBlur`。
- 症状：在 `setTimeout`/请求回调里读 `e.target.value` 得到意外结果。根因：回调执行时事件早已结束，`e.target` 指向的可能是已被卸载/复用的节点。修法：进异步之前先把需要的值取出来存成局部变量（`const v = e.target.value`），或用函数式更新。

---

### 场景 6：组件通信

**是什么**：数据和控制指令在组件树里流动的方式。React 的默认数据流是**单向的**：props 从父到子一路向下；子组件想影响父组件，只能通过父组件传下来的**回调函数**上报。

**为什么需要**：理解"谁能改数据"是理解一切 React 应用的钥匙。单向数据流让每个组件的输入输出清晰可追踪——出问题时沿着 props 与回调的方向顺藤摸瓜即可，不会陷入"谁都有权改、谁改的说不清"的泥潭。本场景练四种通信形态，最后一种（跨层级）刻意用最笨的方式做，为的是攒出对 Context 的真实需求。

**怎么做（分四种形态，每种一套完整代码）**。

**形态一：父→子（props）**。父持有数据，子只负责展示：

```tsx
import { useState } from 'react'

// 子组件：纯展示，数据全部来自 props，自身没有任何状态
function PriceTag({ price, discount }: { price: number; discount?: number }) {
  const final = discount ? price * discount : price
  return (
    <span className="price">
      ¥{final.toFixed(2)}
      {discount && <s className="origin">¥{price.toFixed(2)}</s>}
    </span>
  )
}

// 父组件：数据的唯一持有者，决定"给哪个子组件、给什么"
export default function ProductRow() {
  const [price] = useState(399)
  return (
    <div className="row">
      <PriceTag price={price} />
      <PriceTag price={price} discount={0.8} />
    </div>
  )
}
```

要点：数据变化（`price` 改变）时 React 自动重新渲染子组件，你不需要手动通知——"UI = f(state)"是这套机制的全部。

**形态二：子→父（回调 prop）**。子组件不持有共享数据，把"发生了什么"上报给父：

```tsx
import { useState } from 'react'

// 子组件：不知道"总数"存在哪，只负责把"用户点了、带了几件"这件事报上去
function AddToCartButton({ onAdd }: { onAdd: (qty: number) => void }) {
  return <button onClick={() => onAdd(1)}>加入购物车</button>
}

// 父组件：持有 count，并提供 handleAdd 交给子组件调用
export default function CartBar() {
  const [count, setCount] = useState(0)

  function handleAdd(qty: number) {
    setCount((c) => c + qty) // 真正改状态的代码只在父组件里
  }

  return (
    <div>
      <AddToCartButton onAdd={handleAdd} />
      <span>购物车：{count} 件</span>
    </div>
  )
}
```

要点：回调命名约定用 `on` 前缀（`onAdd`），对应处理器用 `handle` 前缀（`handleAdd`）；子组件永远不直接改父的状态，只"举手报告"。

**形态三：兄弟（状态提升，lifting state up）**。两个兄弟组件要共享数据时，把状态搬到它们共同的父组件，再通过 props 分发下去：

```tsx
import { useState } from 'react'

// 兄弟 A：只负责把用户的筛选词"报上去"（自己不保存）
function FilterInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="按名称筛选" />
}

// 兄弟 B：只按收到的关键词展示列表
function ProductList({ keyword, products }: { keyword: string; products: string[] }) {
  const filtered = products.filter((p) => p.includes(keyword))
  return (
    <ul>
      {filtered.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  )
}

// 共同父组件：keyword 的唯一真相源（single source of truth）在这里
export default function ShopPage() {
  const [keyword, setKeyword] = useState('')
  const products = ['机械键盘', '无线鼠标', '显示器支架', '键帽']

  return (
    <section>
      {/* A 改变 keyword，B 消费 keyword，兄弟间没有任何直接连线 */}
      <FilterInput value={keyword} onChange={setKeyword} />
      <ProductList keyword={keyword} products={products} />
    </section>
  )
}
```

要点：状态提升后数据流是清晰的菱形——A 上报 → 父更新 → 分发 B 重渲染。反面做法（用全局变量、模块级可变对象在兄弟间直接同步）会绕过 React 的渲染机制，改了也不刷新。

**形态四：跨层级（先手动传，体会 pain）**。数据要跨越好几层、中间组件根本不需要它，却被迫层层接力和转发——这就是 props drilling（属性钻透）。完整痛感示例：

```tsx
import { type ReactNode } from 'react'

interface User {
  name: string
}

// 第 4 层：整棵树里真正需要 user 的地方，只有这一行问候语
function Greeting({ user }: { user: User }) {
  return <p>你好，{user.name}</p>
}

// 第 3 层：Sidebar 自己不用 user，纯属搬运工
function Sidebar({ user }: { user: User }) {
  return (
    <aside>
      <Greeting user={user} />
    </aside>
  )
}

// 第 2 层：Layout 也不用 user，为了让"别人"用而污染了自己的 props 签名
function Layout({ user, children }: { user: User; children: ReactNode }) {
  return (
    <div className="layout">
      <Sidebar user={user} />
      <main>{children}</main>
    </div>
  )
}

// 第 1 层：数据源头，开始向下钻
export default function App() {
  const user: User = { name: 'Yida' }
  return (
    <Layout user={user}>
      <p>正文内容</p>
    </Layout>
  )
}
```

请动手扩展一次再删掉，把痛感做实：给 `Greeting` 旁边加一个 `UserAvatar`（也需要 user），你会发现 `Sidebar` 的签名没变却要多传一份；再试着把 `user` 换成从接口异步获取（先 `null` 后有值），四个文件的类型都要跟着改成 `User | null`。数一数这份数据经过了几层"无关组件"的手。**痛感清单**：新增深层消费点要改沿途所有中间组件的签名与类型（N 个文件连锁）；`user` 变化时中间层组件全部跟着重渲染；`Layout` 的对外 API 被迫暴露"我依赖用户系统"这个实现细节。这份痛正是 Context 存在的理由——"供给一次、任意深层按需消费"，它在本大纲阶段 3（Props drilling 行）与阶段 5（状态管理）正式登场；现在只需要记住结论：**跨层传数据手动透传能跑，但每加一个消费点痛感翻倍，两到三层就该考虑 Context 了**。

**常见坑（症状→根因→修法）**：

- 症状：兄弟组件用模块级变量同步数据，一边改了另一边不刷新。根因：绕过了 React 的状态机制，普通变量变化不触发渲染。修法：状态提升到共同父组件；确有全局需求等阶段 5 的 Context/Zustand。
- 症状：子组件里直接改 props（`props.count++` 或对对象 prop 就地赋值），页面时对时错。根因：props 是只读的，就地的突变既不触发渲染，还会污染父组件传下来的对象。修法：任何"想改"的冲动都转成"上报"（回调）或"本地副本"（阶段 2 的不可变更新）。
- 症状：回调传成了 `onClick={handleAdd()}`，一进页面就执行、点击反而报错。根因：同场景 5 的传参坑——写成了调用而非引用。修法：`onClick={handleAdd}` 传引用，需要参数时包箭头。

---

✅ 产出：一个静态"个人主页/商品卡片列表"页，覆盖以上全部场景。

产出验收清单——做完后逐项打勾，两项内容（个人主页 / 商品卡片列表）任选其一或合并完成，但每个检查点必须真实出现过：

**结构与数据**

- [ ] 页面由一个数据数组驱动（至少 6 条记录），每条记录有稳定唯一的 `id`
- [ ] 存在至少一层嵌套列表（如分类 → 商品），内层 key 做了命名空间处理
- [ ] 页面被拆成至少 4 个组件（如 Layout、Card、FilterBar、Badge），`App.tsx` 只做组装

**场景 1（JSX）**

- [ ] 全部样式类名使用 `className`，页面无 `class` 相关警告
- [ ] 至少一处内联样式对象（含驼峰属性与一个数字值），一处 CSS 变量（带类型断言）
- [ ] 一处 Fragment 短语法 + 一处带 `key` 的 `<Fragment>`（列表中多节点项）
- [ ] 一处 `{...spread}`，且能说清楚它的覆盖顺序为什么安全

**场景 2（条件渲染）**

- [ ] "数量为 0 就隐藏"类需求（角标/徽章）不出现裸 `0`，用的是三种修法之一
- [ ] 至少一处三元（两个分支都有内容）、一处提前 return（加载/空态/错误态其一）
- [ ] 状态展示用 `statusMap + satisfies` 实现，且 `keyof typeof` 派生了状态联合类型；删掉表里一个键能看到编译报错

**场景 3（列表渲染）**

- [ ] 所有 `map` 出的元素 key 都来自数据 id；控制台零 key 警告
- [ ] 完成"删除中间项 → 勾选错位"与"删除首行 → 输入残留"两个错案的亲手复现（临时换 index key），再改回 id 并能口头讲出时序
- [ ] 列表事件传参至少用到两种方式，能说清各自适用场景

**场景 4（Props）**

- [ ] 卡片组件参数用解构 + 默认值；有一个默认值 prop 和一个 `?? null` 兜底的位置
- [ ] `children` 出现两种形态：普通 JSX 与函数（render prop 原型）
- [ ] 封装一个 Button：rest props 透传原生属性，且用 `Omit` 禁掉了一个原生属性

**场景 5（事件处理）**

- [ ] 表单/链接场景正确使用 `e.preventDefault()`，能指出它和 `stopPropagation` 的分工
- [ ] 至少一处 `e.stopPropagation()` 并能说出它拦住的是"合成传播链"；完成 document 原生监听器对照实验
- [ ] 所有事件处理器都标注了正确的 TS 事件类型

**场景 6（组件通信）**

- [ ] 父→子（props 展示）、子→父（回调上报）各有至少一处真实用例
- [ ] 兄弟组件通过状态提升联动（如筛选框影响列表），共同父是唯一真相源
- [ ] 跨层级手动透传至少 3 层，写下三条具体的痛感笔记（改了几处签名/几处类型），作为将来接受 Context 的"需求证据"

**工具回看（阶段 0 的验收）**

- [ ] 用 DevTools 组件树找到过卡片组件并现场改过它的一个 prop
- [ ] 开着"高亮重渲染"操作一次筛选，观察渲染波及范围，截图或记下结论

**最终验收方式**：对着页面给自己讲 5 分钟——每个区块用了哪个场景、踩过哪个坑、怎么修的（费曼检验，讲不顺的段落就是需要回炉的段落）。讲完后 `rm -rf node_modules && npm install && npm run dev`，项目应当依旧可跑。

## 阶段 2：状态与副作用 ⭐核心（2 周）

这一章是全书最核心的一章。前面阶段 1 学的渲染（JSX、props、事件）解决的是"界面长什么样"的问题，而本章解决的是 React 的另一半灵魂："数据从哪来、怎么变、变化之后界面如何正确地跟上"。后续所有章节——表单、数据请求、状态管理、性能优化——出问题时往下追究，最终几乎都会落到本章的两个知识点上：**state 的更新机制**与**effect 的执行时机**。面试中 React 的高频题（为什么连续三次 setState 只加一、为什么 effect 会无限循环、为什么定时器里读到旧值）全部出自这里。

本章按三条主线展开：

1. **useState 场景**：状态怎么存（不可变）、怎么改（函数式更新）、怎么初始化（惰性）、多次修改怎么合并（批处理）、放在哪个组件（状态位置）。
2. **useEffect 场景**：副作用怎么声明（依赖数组）、怎么撤销（清理函数）、怎么请求（数据链路与竞态）、依赖出错怎么办（exhaustive-deps 两类问题）、以及最重要的——什么时候根本不该用它。
3. **闭包陷阱专题**：上面两条线里所有"读到旧值"类 bug 的统一根源。学完这一节，你对"state 是一次渲染的快照"这个模型的理解会从"听过"变成"能推理"。

学习建议：本章每个 demo 都亲手敲一遍，并且刻意去制造 bug（把正确的写法改错，观察症状），比只看正确代码的收获大一个数量级。

---

### useState 场景

在展开五条之前，先建立总的心智模型。`useState` 做的事情只有一件：**让 React"记住"一个跨渲染存在的值，并在它变化时重新调用你的组件函数**。组件函数本身每次渲染都从头执行一遍，局部变量全部重建，唯独 `useState` 返回的第一个值能在多次渲染之间延续——这是它和"直接在函数体里写 `let count = 0`"的本质区别。五条场景分别回答五个工程问题：

| 场景 | 回答的问题 |
|---|---|
| 1. 函数式更新 | 新值依赖旧值时怎么改才不出错 |
| 2. 不可变更新 | 对象/数组这种"引用类型"怎么改才能被 React 感知 |
| 3. 惰性初始化 | 初始值计算很贵时怎么避免重复计算 |
| 4. 批处理 | 一次交互里改多个 state，渲染几次 |
| 5. 状态放哪 | state 应该住在哪个组件里 |

#### 1. 基础用法 + **函数式更新**（`setCount(c => c + 1)`）

**是什么。** `useState(initial)` 返回一个二元组：当前值与更新函数。更新函数有两种传参方式：

- **传值**：`setCount(1)`、`setCount(count + 1)` —— "把状态替换成这个值"。
- **传函数**（函数式更新 / functional update）：`setCount(c => c + 1)` —— "基于上一个状态计算新状态"。React 会在真正处理这次更新时调用你的函数，并把**队列中上一步的结果**作为参数传进来。

**为什么需要函数式更新。** 因为 `setState` 不是"立即修改变量"，而是"提交一次更新请求"。在同一个事件处理器里，`count` 这个变量从头到尾都是本次渲染快照里的那个值，不会因为中间调用了 `setCount` 而改变。所以当你在一次交互里连续多次更新、且新值依赖旧值时，"传值"写法每一步都基于同一个过时的快照计算，后一步无法站在前一步的肩膀上。"传函数"写法把"怎么算"的描述交给 React，React 在处理队列时按顺序把上一步的输出喂给下一步，形成真正的链式累加。

**怎么做（机制分步）。** 以点击一次按钮连调三次 `setCount` 为例：

1. 用户点击，React 调用你的事件处理器（React 会托管这个调用过程）。
2. 处理器里每次 `setCount(x)` 都只是把"一个动作"排入更新队列：要么是"替换为 x"，要么是"用函数 f 变换"。**当前函数里的 `count` 变量纹丝不动**。
3. 事件处理器执行完毕，React 从队列头部开始逐个处理：从当前 state 出发，"替换为 x"就取 x，"函数 f"就取 `f(上一步结果)`，得到最终 state。
4. React 拿最终 state 重新调用组件函数，界面更新一次。

**代码示例：完整复现"三次 `setCount(count + 1)` 只加一"。** 先看 bug 版，可直接运行：

```tsx
import { useState } from 'react';

export default function BuggyCounter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // 排队：替换为 0 + 1 = 1
    setCount(count + 1); // 排队：替换为 0 + 1 = 1（注意：count 还是 0！）
    setCount(count + 1); // 排队：替换为 0 + 1 = 1（count 依然是 0！）
    console.log('同步打印 count：', count); // 永远打印 0，见"常见坑"
  };

  return (
    <div>
      <p>count = {count}</p>
      <button onClick={handleClick}>点我 +3（期望）</button>
    </div>
  );
}
```

运行结果：点一次按钮，`count` 从 0 变成 **1**，不是 3。逐步解说如下表——关键在于"传值"模式下后一步**不会**引用前一步的结果，三次计算互相独立：

```text
事件处理器执行过程（count 是本次渲染快照里的 0）：

步骤  代码               队列内容（动作）          count 变量
 1    setCount(count+1)  [替换为 1]               0（未变）
 2    setCount(count+1)  [替换为 1, 替换为 1]     0（未变）
 3    setCount(count+1)  [替换为 1, 替换为 1,     0（未变）
                         替换为 1]
—— 处理器结束，React 处理队列 ——
处理：初始 state 0 → 替换为 1 → 替换为 1 → 替换为 1 → 最终 state = 1
—— 用 state = 1 重新渲染一次 → 界面显示 1
```

修正版——把每一步从"替换为某值"改成"在上一步基础上变换"：

```tsx
import { useState } from 'react';

export default function FixedCounter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(c => c + 1); // 排队：函数 c => c + 1
    setCount(c => c + 1); // 排队：函数 c => c + 1
    setCount(c => c + 1); // 排队：函数 c => c + 1
  };

  return (
    <div>
      <p>count = {count}</p>
      <button onClick={handleClick}>点我 +3</button>
    </div>
  );
}
```

```text
处理：初始 state 0
  → (0) => 1 → 1
  → (1) => 2 → 2
  → (2) => 3 → 3
最终 state = 3，界面显示 3
```

**什么时候必须用函数式更新**（满足任一条就该用）：

1. **同一交互里连续多次更新同一个 state**：如上面的一次 +3、一次提交里累加多条明细。
2. **新值依赖旧值**：开关 `setOn(on => !on)`、步进器、往数组追加 `setList(list => [...list, item])`。
3. **更新发生在"延后执行"的回调里**：`setTimeout`、`setInterval`、事件订阅、Promise `.then` 中——这些回调捕获的是定义那一刻的旧快照（机制详见本章末尾闭包陷阱专题），函数式更新是标准解法之一。
4. **希望更新逻辑纯粹、与渲染时机解耦**：函数式更新的函数应当是纯函数（不读外部可变量、不产生副作用），这样无论 React 何时、以何种顺序处理它都得到一致结果——这也是 React 严格模式（StrictMode）下能安全地双调用它的前提。

反过来，新值与旧值完全无关时（`setFormOpen(true)`、`setName(inputValue)`），传值更直白，不必强行包一层函数。

最后强调函数式更新的**纯度要求**：你传给 `setCount` 的更新函数必须是纯函数——只依赖传入的参数、不读组件里其他可变量、不产生副作用（不发请求、不打日志计数、不 mutate 参数）。原因有二：其一，React 可能以任意时机、任意次数调用它——严格模式（StrictMode）开发环境会刻意**双调用**每个更新函数以暴露不纯（生产环境只调一次），若函数里有 `console.log` 会计两次数、有副作用会执行两次；其二，并发渲染（阶段 10）下更新处理可能被中断重放，不纯的更新函数在重放时会污染外部世界。写 `setCount(c => { console.log('算了'); return c + 1; })` 这类代码时，把日志挪到事件处理器里去。

**常见坑。**

- 症状一：点一次按钮期望 +3 实际只 +1。
  根因：三次 `setCount(count + 1)` 基于同一快照计算，互相覆盖。
  修法：改函数式更新 `setCount(c => c + 1)`。
- 症状二：`setCount(count + 1)` 之后立刻 `console.log(count)`，打印的还是旧值，于是再补一次 `setCount` "纠正"，导致状态错乱。
  根因：不是 bug，是机制——批处理下当前函数剩余部分看到的永远是快照值。
  修法：需要"下一步的结果"就在 setState 时就算好（`const next = count + 1; setCount(next); ` 本地变量 `next` 立即可用），或改函数式更新；绝对不要靠"再 set 一次"来弥补。
- 症状三：把对象 state 用传值方式整体覆盖 `setUser({ name: '李四' })`，发现 `age`、`email` 全丢了。
  根因：传值是**整体替换**，不像类组件的 `this.setState` 那样做浅合并。
  修法：`setUser(u => ({ ...u, name: '李四' }))`，详见下一条不可变更新。

#### 2. 对象/数组状态的**不可变更新**（展开、`map`、`filter` 更新某一项）

**是什么。** 不可变更新（immutable update）指：修改对象或数组类型的 state 时，**不改动原对象，而是创建一个包含变更内容的新对象/新数组**，再把它传给 setState。原对象保持原样，像一张没动过的历史照片。

**为什么需要不可变更新。** 这不是风格洁癖，而是 React 的更新检测机制决定的：

1. React 判断"要不要重新渲染"的依据之一，是用 `Object.is(oldState, newState)` 比较新旧 state。`Object.is` 对对象/数组比较的是**引用**（内存地址），不是内容。
2. `arr.push(item)`、`obj.name = 'x'` 这类直接修改（mutate）不改变引用——修改前后是同一个对象，`Object.is` 返回 `true`，React 认为"状态没变"，于是**跳过这次渲染**。
3. `useState` 存的是"下一次渲染用的值"。React 需要能在任意时刻拿旧快照与新快照做比较，也依赖每个快照不被事后篡改。一旦 mutate，所有基于引用相等性的机制（跳过渲染、`React.memo`、`useEffect` 的依赖比较、`useMemo` 缓存、撤销/重做的历史快照）都会在某个时刻给出错误答案。

**怎么做（机制分步）。** 以 `arr.push(item); setTodos(arr)` 为例：

1. `push` 修改了堆上的原数组（数据层面确实加进去了）。
2. `setTodos(arr)` 传入的还是**同一个引用**。
3. React 处理这次更新时，用 `Object.is(prevTodos, nextTodos)` 比较——相等。
4. React 跳过重新渲染（bail out）：不重渲染子组件、不触发 effect。界面不更新。

于是出现一个典型的诡异现象：**第一次点"添加"没反应，之后随便触发一次别的 state 更新（比如点了一下别处），新任务突然出现了**——因为那次更新引发的重渲染读到的正是被你 push 过的数组（数据早就在里面了，只是没人来渲染）。这说明 mutate 不是"永远不生效"，而是"生效与否取决于运气"，这比稳定不生效更危险。

**代码示例。** 一个覆盖增/删/改的完整 Todo 组件，含错误演示按钮：

```tsx
import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

let nextId = 3; // 演示用自增 id

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: '学 useState', done: false },
    { id: 2, text: '学 useEffect', done: false },
  ]);
  const [text, setText] = useState('');

  // ❌ 错误演示：push 改的是原数组，setTodos 拿到同一引用，React 检测不到变化
  const addWrong = () => {
    todos.push({ id: nextId++, text: text || '错误演示', done: false });
    setTodos(todos); // Object.is(旧, 新) === true → 跳过渲染
  };

  // ✅ 正确：展开旧数组，创建新数组
  const add = () => {
    if (!text.trim()) return;
    setTodos(t => [...t, { id: nextId++, text: text.trim(), done: false }]);
    setText('');
  };

  // ✅ 更新某一项：map + 条件展开，只替换命中的那项，其余原样引用
  const toggle = (id: number) => {
    setTodos(ts =>
      ts.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // ✅ 删除某一项：filter 生成新数组
  const remove = (id: number) => {
    setTodos(ts => ts.filter(t => t.id !== id));
  };

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={add}>添加</button>
      <button onClick={addWrong}>添加（错误演示，点了没反应）</button>
      <ul>
        {todos.map(t => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
                {t.text}
              </span>
              <button onClick={() => remove(t.id)}>删除</button>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**数组操作速查表**（左边是直觉写法，右边是 React 里必须用的不可变写法；`setArr` 一律可再包函数式更新 `setArr(a => ...)`）：

| 目的 | ❌ mutate（UI 不更新） | ✅ 不可变更新 |
|---|---|---|
| 尾部追加 | `arr.push(x)` | `setArr([...arr, x])` |
| 头部插入 | `arr.unshift(x)` | `setArr([x, ...arr])` |
| 尾部删除 | `arr.pop()` | `setArr(arr.slice(0, -1))` |
| 头部删除 | `arr.shift()` | `setArr(arr.slice(1))` |
| 按 id 删除某项 | `arr.splice(i, 1)` | `setArr(arr.filter(x => x.id !== id))` |
| 更新某一项字段 | `arr[i].done = true` | `setArr(arr.map(x => x.id === id ? { ...x, done: true } : x))` |
| 整项替换 | `arr[i] = newItem` | `setArr(arr.map(x => x.id === id ? newItem : x))` |
| 任意位置插入 | `arr.splice(i, 0, x)` | `setArr([...arr.slice(0, i), x, ...arr.slice(i)])` |
| 原地排序 | `arr.sort(compare)` | `setArr([...arr].sort(compare))`（sort 会改原数组，必须先复制） |
| 原地反转 | `arr.reverse()` | `setArr([...arr].reverse())` |
| 清空 | `arr.length = 0` | `setArr([])` |
| 追加一批 | `arr.push(...xs)` | `setArr([...arr, ...xs])` |

注意 `sort`、`reverse`、`splice` 这三个"内奸"：它们是数组上少数会修改原数组的方法，即使写在新数组表达式里也可能踩坑（例如 `[...arr].sort()` 是对的，`arr.sort()` 是错的）。

**对象操作速查表**：

```tsx
import { useState } from 'react';

interface Address { city: string; street: string; }
interface Profile { name: string; age: number; address: Address; }

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({
    name: '张三',
    age: 25,
    address: { city: '北京', street: '中关村大街 1 号' },
  });

  // ✅ 浅更新一个字段：展开旧对象再覆盖目标字段
  // 注意：useState 对对象不做自动浅合并，漏掉展开会丢掉其余字段
  const rename = (name: string) => {
    setProfile(p => ({ ...p, name }));
  };

  // ❌ 对照：setProfile({ name }) 会把 age、address 全部丢掉，state 只剩 { name }

  // ✅ 嵌套对象更新：每一层都要重新展开（展开是"浅拷贝"）
  const moveCity = (city: string) => {
    setProfile(p => ({
      ...p,                                    // 第一层展开：保住 name、age
      address: { ...p.address, city },          // 第二层展开：保住 street
    }));
  };

  // ✅ 动态键名更新（表单里字段名来自变量时）
  const setField = (field: keyof Profile, value: string | number) => {
    setProfile(p => ({ ...p, [field]: value }) as Profile);
  };

  return (
    <div>
      <input value={profile.name} onChange={e => rename(e.target.value)} />
      <input value={profile.address.city} onChange={e => moveCity(e.target.value)} />
      <input
        type="number"
        value={profile.age}
        onChange={e => setField('age', Number(e.target.value))}
      />
      <pre>{JSON.stringify(profile, null, 2)}</pre>
    </div>
  );
}
```

两个必须记住的细节：

- 展开运算符是**浅拷贝**：`{ ...p }` 只复制第一层，嵌套对象（上面的 `address`）仍与旧 state 共享同一个引用。所以更新嵌套值时必须逐层展开；同理，`{ ...p, address: { ...p.address, city } }` 里若忘了展开 `p.address`，`street` 就没了。
- 只替换真正变化的部分是惯例：`map` 时未命中的项返回**原对象**（不是复制一份），这样 `React.memo`、依赖比较仍能识别"这些项没变"，是列表性能的基础（阶段 3 组件库与阶段 6 性能优化会反复用到）。

深层嵌套结构（三四层以上）逐层展开非常痛苦且易错，生产中常用 [Immer](https://github.com/immerjs/use-immer) 的 `produce` 以"看似 mutate、实际生成新对象"的方式书写；Zustand 也提供 immer 中间件（阶段 5 展开）。原理同样是产出新引用，只是写法更接近直觉。

顺带把 `Object.is` 的比较规则讲全。React 没有选 `===` 而选了 `Object.is`，两者几乎一致，只差两个特例：

| 比较 | `===` | `Object.is`（React 采用） |
|---|---|---|
| `NaN` 与 `NaN` | `false` | `true`（NaN 视为相等——合理：state 是 NaN 就别再渲染了） |
| `+0` 与 `-0` | `true` | `false`（罕见，理论区分，实践中可忽略） |

所以 `setCount(NaN)` 两次，第二次会被判为"没变"而跳过渲染；这也解释了为什么 `setX(x)` 传回同一个对象/数组引用必然 bail out——`Object.is` 比的是身份，不是内容。

还要建立一个全局认知：**"引用相等"是整个 React 优化体系的通货**。不只是 `useState` 的 bail out 靠它——`useEffect` 的依赖比较（本章下一节）、`React.memo` 的 props 浅比较、`useMemo`/`useCallback` 的缓存命中（本章后文），全部是同一套 `Object.is` 逐位比较。因此"不可变更新"不只是让某一次 setState 生效，它同时保住了依赖数组、memo 缓存、组件浅比较的判断正确性——一处 mutate，四处失明。

**常见坑。**

- 症状一：点了按钮 UI 没反应；过一会儿操作别的功能，之前"丢失"的修改突然全部冒出来。
  根因：mutate 后引用不变，`Object.is` 判等，React 跳过渲染；后续别的更新触发重渲染时读到了被改过的原数组。
  修法：全部改为不可变更新（速查表右列）。
- 症状二：更新对象后其他字段丢失（`setUser({ name })` 丢 `age`）。
  根因：传值是整体替换，`useState` 不做浅合并。
  修法：`setUser(u => ({ ...u, name }))`。
- 症状三：明明改了嵌套字段，`useEffect([profile]` 却没触发，或子组件没刷新。
  根因：嵌套 mutate（`profile.address.city = '上海'`）不改顶层引用，依赖比较认为没变。
  修法：逐层展开生成新引用；或上 Immer。
- 症状四（反向坑）：为了"不可变"在每次渲染中无脑 `{...obj}` 创建新对象放进 props/依赖，导致子组件与 effect 全部失效式重跑。
  根因：不可变更新是**更新时**的要求，不是渲染时的要求；渲染期间创建的新引用让"引用相等性优化"失去意义。
  修法：更新只发生在事件/`setState` 中；渲染期间需要稳定引用时用 `useMemo`（见本章后文 useMemo 场景）。

#### 3. 惰性初始化（`useState(() => expensive())`）

**是什么。** `useState` 的第一个参数除了传初始值，还可以传一个**函数**（惰性初始化函数 / lazy initializer）。React 只在组件**首次渲染**（mount）时调用这个函数，把返回值作为初始 state；之后的每次渲染直接忽略它。

**为什么需要。** 这里有一个 JavaScript 语言层面的陷阱：`useState(expensive())` 里的 `expensive()` 是**函数调用表达式**，它在 `useState` 被调用**之前**就必须求值完毕——而组件函数每次渲染都会完整执行一遍。也就是说：

- `useState(expensive())`：每次渲染都执行一次 `expensive()`，算出结果传给 `useState`，然后 React 只在第一次用这个结果，**之后每次的返回值都被白白扔掉**。
- `useState(() => expensive())` / `useState(expensive)`：传的是函数本身（注意第二种写法**不带括号**），只有第一次渲染时 React 才调用它。

当 `expensive()` 代价可忽略（如 `useState(0)`）时无所谓；当它是"解析一大段 localStorage JSON""对一个上千项的数组做复杂计算"时，浪费会被放大成用户可感知的卡顿——尤其配合受控输入：每敲一个字符 → setState → 组件重渲染 → `expensive()` 再跑一遍。

**怎么做（机制分步）。**

1. React 渲染组件 → 执行到 `useState` 这一行。
2. 若传入的是函数：首次渲染（没有 state）时调用它取初始值；非首次渲染时直接跳过，沿用已存 state。这就是"惰性"的含义——初始化被推迟到"确认真的需要"的那一刻，且只发生一次。
3. 初始化函数必须是**纯函数**：不接收参数、不修改外部状态、同样的输入返回同样的结果。React 严格模式（StrictMode）在开发环境会把它调用两次以暴露不纯（生产环境只调一次），如果你的初始化函数有副作用（如写 localStorage、打日志计数），会在开发期立刻现形。

**代码示例：用日志观察调用次数。**

```tsx
import { useState } from 'react';

interface Todo { id: number; text: string; done: boolean; }

// 一个昂贵的初始化函数：读 localStorage + 解析 JSON + 排序
function createInitialTodos(): Todo[] {
  console.log('createInitialTodos 执行了'); // 观察这一行打印几次
  const raw = localStorage.getItem('todos');
  const saved = raw ? (JSON.parse(raw) as Todo[]) : [];
  return saved.sort((a, b) => a.id - b.id);
}

export default function TodoApp() {
  // ❌ 写法 A：每次渲染都执行 createInitialTodos()
  //    控制台：挂载时 1 次，之后每敲一个字（keyword 变化触发重渲染）再来 1 次
  // const [todos, setTodos] = useState<Todo[]>(createInitialTodos());

  // ✅ 写法 B：惰性初始化，只在首次渲染执行 1 次，之后怎么重渲染都不再执行
  const [todos, setTodos] = useState<Todo[]>(createInitialTodos);

  // 注意：这里也可以写 useState(() => createInitialTodos())，两者等价；
  // 当初始化逻辑不是现成函数时用箭头函数包裹，如 useState(() => JSON.parse(bigJson))
  const [keyword, setKeyword] = useState('');

  return (
    <div>
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)} // 每敲一个字符都重渲染一次
        placeholder="输入关键字，观察控制台日志"
      />
      <ul>
        {todos.filter(t => t.text.includes(keyword)).map(t => (
          <li key={t.id}>{t.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

把写法 A 和 B 分别打开，在输入框里连续打字：A 的控制台每敲一个字符打印一次 `createInitialTodos 执行了`，B 只在进入页面时打印一次。差异一目了然。

**什么场景值得用。**

| 场景 | 值得吗 | 说明 |
|---|---|---|
| 初始值来自 `localStorage.getItem` + `JSON.parse`（购物车、草稿、主题） | ✅ 值得 | I/O 与解析成本随数据量增长 |
| 初始值需要大量计算（对大数组排序/建索引、生成大查找表） | ✅ 值得 | 典型的昂贵 CPU 计算 |
| 初始值来自 URL 查询参数解析 | ✅ 值得 | 每次渲染重复解析毫无意义 |
| `useState(0)`、`useState(false)`、`useState(null)`、字面量对象 | ❌ 不值得 | 字面量本身没有计算成本，包一层函数只是噪音 |
| 初始值依赖传入的 props | ⚠️ 慎用 | `useState(() => props.defaultValue)` 只在首次生效，之后 props 再变 state 不会跟着变——这通常说明你想要的是"派生状态"而非 state（见本章 useEffect 场景第 5 条） |

**常见坑。**

- 症状一：受控输入每敲一个字都掉帧，Profiler 显示时间耗在某个"初始化"函数上，且它被调用了 N 次。
  根因：`useState(expensive())` 表达式每次渲染求值，结果仅首次被采用。
  修法：改为惰性初始化。
- 症状二：`useState(expensive)` 写成了 `useState(expensive())` 或反过来，代码都能跑、看不出来。
  根因：两者只差一对括号，TypeScript 对"返回值恰好是函数"的类型没有防呆。
  修法：靠肉眼约定——**惰性初始化传"函数本身"，绝不加括号**；有条件时让初始化函数返回类型与 state 类型一致（返回函数类型的 state 是极少数场景，如 `useState<() => void>(() => handler)`，此时需显式标注泛型）。
- 症状三：把惰性初始化当 `componentDidMount` 用，在里面发请求、打日志、改外部变量。
  根因：误解了它的定位——它是"算初始值"的，不是生命周期钩子；副作用属于 `useEffect`。
  修法：初始化函数保持纯函数；副作用移到 effect。
- 症状四：期望 props 变化后 state 跟着重置，但 state 还是旧的。
  根因：惰性初始化只跑一次，props 变化不会重新初始化。
  修法：用 `key` 让组件重新挂载（见本章 useEffect 场景第 5 条的"用 key 重置状态"），或改为渲染期间调整 state 的模式。

#### 4. 批处理：一次点击里连续多次 setState 的表现

**是什么。** 批处理（batching）指 React 把一次交互中触发的多次 state 更新**合并到一次重新渲染**里处理。点了按钮调三次 setState，组件只渲染一次而不是三次。

**为什么需要。** 渲染是有成本的工作：执行组件函数、diff 新旧虚拟 DOM、提交到真实 DOM。如果每个 `setState` 都立刻同步渲染一次，一次表单提交改 5 个 state 就要渲染 5 次，其中前 4 次的结果全是中间态，用户根本看不到。批处理保证：**一次交互 → 一次渲染 → 一个一致的最终界面**，既省性能，也避免了界面闪现中间状态。

**怎么做（机制分步）。**

1. 用户事件触发，React 先接管调度（合成事件系统，统一委托挂载在根容器上——细节见阶段 1 事件处理与阶段 10 合成事件）。
2. 事件处理器执行期间，所有 `setState` 只把更新动作入队，标记"此组件待更新"。
3. 处理器返回后，React 一次性处理整个更新队列，算出所有受影响组件的最终 state。
4. 重新渲染受影响的组件树一次，DOM 一次提交。

**React 18 自动批处理前后差异。** 这是 React 18 最重要（也最容易被忽略）的行为变更，面试常考：

| 更新发生的位置 | React 17 及以前（`ReactDOM.render`） | React 18（`createRoot`，自动批处理） |
|---|---|---|
| React 事件处理器内（onClick 等） | ✅ 批处理，渲染一次 | ✅ 批处理，渲染一次 |
| `setTimeout` / `setInterval` 回调 | ❌ 不批处理，每次 setState 同步渲染一次 | ✅ 批处理，渲染一次 |
| `Promise.then` / `await` 之后 | ❌ 不批处理 | ✅ 批处理 |
| 原生事件监听（`addEventListener` 直接挂 DOM） | ❌ 不批处理 | ✅ 批处理 |
| 任意普通函数调用深处 | ❌ 不批处理 | ✅ 批处理 |

React 17 时代批处理依赖"React 事件系统的开区间"：React 在调用你的合成事件处理器前后开/关一个批处理开关，脱离这个区间（进了定时器、Promise 微任务）开关就失效。React 18 的自动批处理把"开区间"改为覆盖**所有**更新来源，代价是少数依赖"setState 后立刻同步看到 DOM"的老代码会失灵（见下方 `flushSync`）。

用下面的 demo 观察差异（在 React 18 里跑，所有按钮都只渲染一次；同样的代码在 React 17 沙箱里，后两个按钮会渲染两次）：

```tsx
import { useState } from 'react';

export default function BatchingDemo() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // 渲染计数：每次组件函数执行都会打印，用来数"渲染了几次"
  console.log('渲染：count =', count, ', flag =', flag);

  const handleSync = () => {
    // React 事件处理器：17 / 18 都只渲染一次（经典批处理）
    setCount(c => c + 1);
    setFlag(f => !f);
  };

  const handleTimeout = () => {
    setTimeout(() => {
      // React 17：两次渲染；React 18：一次渲染（自动批处理）
      setCount(c => c + 1);
      setFlag(f => !f);
    }, 0);
  };

  const handlePromise = async () => {
    await Promise.resolve(); // 跨过一个微任务边界
    // React 17：两次渲染；React 18：一次渲染
    setCount(c => c + 1);
    setFlag(f => !f);
  };

  return (
    <div>
      <button onClick={handleSync}>同步处理器里两次 setState</button>
      <button onClick={handleTimeout}>setTimeout 里两次 setState</button>
      <button onClick={handlePromise}>await 之后两次 setState</button>
      <p>count={count} flag={String(flag)}</p>
    </div>
  );
}
```

**强制同步渲染的边界情况：`flushSync`。** 自动批处理下，`setState` 之后 DOM 要等当前任务收尾才更新。极少数场景需要"setState 后**立刻**同步读 DOM"——最典型的是更新后马上测量新布局或滚动到新元素。`react-dom` 提供了显式退出批处理的逃生舱：

```tsx
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null); // ref 的系统讲解见下一节 useRef 场景

  const send = () => {
    const text = `消息 ${messages.length + 1}`;
    flushSync(() => {
      // flushSync 返回之前，React 已同步完成这次渲染并提交 DOM
      setMessages(msgs => [...msgs, text]);
    });
    // 没有 flushSync 的话，这里的 DOM 还是旧的，滚动的目标是"上一条消息"的位置
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <div style={{ height: 160, overflowY: 'auto', border: '1px solid #ccc' }}>
      {messages.map((m, i) => (
        <p key={i}>{m}</p>
      ))}
      <div ref={bottomRef} />
      <button onClick={send}>发送并滚到底部</button>
    </div>
  );
}
```

关于 `flushSync` 只强调两点：它是**性能逃生舱不是常规工具**（强制同步刷新放弃了批处理的全部好处），官方明确建议优先考虑 `useEffect` / `useLayoutEffect` 里做"渲染后处理"的方案，只有"必须在本次事件里读到最新 DOM"时才用。

**另一个"看起来渲染了两次"的边界情况：严格模式双调用。** 开发环境用 `<StrictMode>` 包裹应用时，React 会故意把每个组件渲染两次、把每个 effect 执行"挂载→清理→再挂载"一轮。这是刻意为之：用于暴露不纯的渲染逻辑与缺失的清理函数，**生产环境不会发生**。如果你在开发期看到"多了一次渲染/日志打了两遍"，先检查是不是 StrictMode，再去找性能问题（阶段 10 复刻 mini React 时你会亲手实现它）。

**用 React DevTools Profiler 验证批处理。** 口罩数日志不如工具直观，标准做法：

1. 安装 React DevTools 浏览器扩展（阶段 0 已装），打开 Profiler 面板，勾选 "Highlight updates when components render"（可选，会在页面上给重渲染区域着色）。
2. 点击左上角圆点（或 `Ctrl/Cmd + R` 区域的录制按钮）开始录制。
3. 回到页面点一次 `handleTimeout`（两次 setState 那个按钮）。
4. 停止录制。时间轴上应只出现**一个**commit 条（对应一次渲染提交）；点开该条，火焰图里 `BatchingDemo` 被标亮、其子树随之渲染一次。若你在 React 17 沙箱做同样实验，时间轴会出现两个 commit 条。

补充一个把"批处理"和日常体验连起来的观察：受控输入每敲一个字符就是一次 setState、一次渲染，听起来很贵，但打字依然顺滑——正是因为每次击键的更新被批成恰好一次渲染，且渲染的是轻量子树。反过来，若某天你发现"打字变卡了"，用 Profiler 录一下击键，看到一次击键出现**两个以上** commit，排查方向就是"渲染链路上谁在额外 setState"（典型元凶：effect 里 setState，见下一节第 4 条）。

**常见坑。**

- 症状一：`setCount(count + 1); console.log(count)` 打印旧值，误以为 setState "没生效"。
  根因：批处理机制下，state 在当前函数剩余生命周期内不变；setState 调度的是"下一次渲染"，不是"立即改值"。
  修法：本地变量接住新值（`const next = count + 1; setCount(next); `），或函数式更新；需要读 DOM 用 `flushSync`。
- 症状二：从 React 17 升到 18 后，某个"setState 后同步读 DOM/老第三方库初始化"的代码悄悄坏了。
  根因：17 下 Promise/定时器里的 setState 是同步渲染，DOM 立即可读；18 自动批处理把渲染推迟到任务收尾。
  修法：该处改用 `flushSync` 包裹；或重构为 effect 中处理。
- 症状三：开发环境日志/请求重复执行两次，以为逻辑写错。
  根因：StrictMode 开发期双调用。
  修法：让渲染与初始化保持纯净、给 effect 补全清理函数；不要关掉 StrictMode 来"修复"（阶段 2 产出 TodoMVC 前建议全程开启）。
- 症状四：传入与当前值相同的 state（`Object.is` 判等）后组件"又渲染了一次"。
  根因：React 对相同值的更新会跳过重渲染（bail out），但它仍可能需要先渲染该组件一次才能确认；确认后不会再提交、不会再触发子组件渲染与 effect。这是正常优化行为，不是 bug。
  修法：无需处理；但不要依赖"setState 同值必然不渲染"写出奇怪代码。

#### 5. **状态放哪**：状态提升、就地下放、为什么"能放局部就不放全局"

**是什么。** React 不像 Vue 有"中央 data"，state 住在你声明它的那个组件里。"放哪"因此是一个真实的架构决策，有三种基本操作：

- **局部状态**：只有本组件（含其子树）用，声明在本组件——默认选项。
- **状态提升（lifting state up）**：两个组件需要**同一个**状态的读写（典型是兄弟组件联动），把它搬到它们**最近的公共父组件**，通过 props 分发下去，修改通过回调 props 传上来。
- **状态下放（state colocation / pushing state down）**：父组件里某个 state 实际只服务于某一个子树，把它移进那个子树，让父组件不再因它重渲染。

更远的选项（Context、Zustand 等全局方案）属于阶段 5，本节先建立"为什么能不用就不用"的直觉。

**为什么这个决策重要：state 的位置决定重渲染的波及范围。** React 的默认渲染规则是：**父组件重渲染时，所有子组件都会跟着重渲染**（不管子组件的 props 有没有变，除非用 `React.memo` 显式拦截——见本章 useMemo 场景）。因此：

- state 放得离使用它的组件越近，变化时被拖累重渲染的组件越少；
- state 放得越"高"（越靠近根、越全局），一次变化引发的连锁重渲染范围越大。

**决策流程图（文字版）。** 遇到"这个 state 放哪"时按顺序问：

```text
Q1. 这个状态是"来自服务器的数据"（列表、详情、搜索结果）吗？
    └─ 是 → 交给数据层管理（TanStack Query 等），不要长期住在 state 里（阶段 4.2）。

Q2. 这个状态是"URL 的一部分"吗（当前 tab、筛选条件、页码、排序）？
    └─ 是 → 放 URL 查询参数：可分享、可回退、刷新不丢（阶段 4.3、阶段 5）。

Q3. 这个状态只有"一个组件及其子树"在用吗？
    └─ 是 → 就地声明在那个组件里（局部 state），完事。这是 80% 的情况。

Q4. 有两个"兄弟"或不相邻的组件需要同时读写它吗？
    └─ 是 → 提升到它们的最近公共父组件，props 下发 + 回调上传。
        └─ 提升后 props 要穿透四五层（props drilling 的痛）→ 考虑 Context（阶段 3）
           或状态库（阶段 5）。注意 Context 适合"读多写少"的值。

Q5. 它是几乎整个应用都要读、且变化频率低的值吗（主题、当前登录用户、语言）？
    └─ 是 → Context / Zustand 等全局方案（阶段 5），但仍要警惕 Context 的
       性能陷阱（value 引用变化会让所有消费者重渲染）。

Q6. 它变化极高频（鼠标移动、输入框每个字符）且消费方很少吗？
    └─ 是 → 越局部越好；必要时用 ref/非受控方案绕开 state（阶段 3 受控 vs 非受控）。
```

一句话原则：**state 应该住在"使用它的所有组件构成的子树"中尽可能低（深）的位置**。这就是"能放局部就不放全局"。

**代码示例一：状态提升。** 两个输入框，摄氏/华氏要互相换算——两个组件需要同一份数据，state 必须提到公共父组件：

```tsx
import { useState } from 'react';

// 子组件：纯展示 + 上报修改，自己不存温度
function ScaleInput({
  scale,
  value,
  onChange,
}: {
  scale: 'c' | 'f';
  value: string;
  onChange: (v: string) => void;
}) {
  const label = scale === 'c' ? '摄氏温度' : '华氏温度';
  return (
    <fieldset>
      <legend>{label}（{scale === 'c' ? '°C' : '°F'}）</legend>
      <input value={value} onChange={e => onChange(e.target.value)} />
    </fieldset>
  );
}

export default function Calculator() {
  // state 提升到这里：两个 ScaleInput 的唯一数据源（single source of truth）
  const [scale, setScale] = useState<'c' | 'f'>('c');
  const [temp, setTemp] = useState('');

  const celsius = scale === 'c' ? temp : String((Number(temp) - 32) / 1.8);
  const fahrenheit = scale === 'f' ? temp : String((Number(temp) * 1.8) + 32);

  return (
    <div>
      {/* 每个输入框读写的是同一个 state 的不同视图 */}
      <ScaleInput scale="c" value={celsius} onChange={v => { setScale('c'); setTemp(v); }} />
      <ScaleInput scale="f" value={fahrenheit} onChange={v => { setScale('f'); setTemp(v); }} />
      {temp !== '' && Number.isFinite(Number(temp)) && (
        <p>沸腾状态：{Number(celsius) >= 100 ? '水开了' : '还没开'}</p>
      )}
    </div>
  );
}
```

提升后两个输入框永远一致——因为它们读的**从来不是自己的副本**，而是同一份父组件 state 的两种换算视图。如果各存各的，同步两个副本迟早出 bug（这正是"单一数据源"原则的意义）。

**代码示例二：状态下放。** hover 高亮只影响列表的某一行，却放在了父组件里：

```tsx
import { useState } from 'react';

const items = Array.from({ length: 1000 }, (_, i) => `列表项 ${i + 1}`);

// ❌ 反例：hovered 放在父组件。
// 鼠标每划过一行 → setHovered → BadList 整个重渲染 → 1000 个 li 全部重新执行
function BadList() {
  const [hovered, setHovered] = useState<number | null>(null);
  console.log('BadList 重渲染（鼠标划过每行都会触发）');
  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{ background: hovered === i ? '#ffd' : 'transparent' }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

// ✅ 正例：hover 状态下放到每个 Row，谁 hover 谁自己重渲染。
// 父组件 GoodList 从不因 hover 重渲染，999 行安然不动。
function Row({ item }: { item: string }) {
  const [hovered, setHovered] = useState(false); // 状态与使用者住在一起
  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? '#ffd' : 'transparent' }}
    >
      {item}
    </li>
  );
}

function GoodList() {
  console.log('GoodList 渲染（只在挂载时）');
  return (
    <ul>
      {items.map((item, i) => (
        <Row key={i} item={item} />
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <>
      <BadList />
      <GoodList />
    </>
  );
}
```

打开控制台对比日志频率：鼠标在两个列表里滑动时，`BadList 重渲染`疯狂打印，`GoodList 渲染`纹丝不动。**同一个功能，state 放的位置不同，重渲染量差三个数量级。**

**为什么"能放局部就不放全局"。** 三条理由，从性能到架构：

1. **重渲染范围最小化**（性能）：局部 state 变化只重渲染本组件与子树；全局 store / 高层 Context 的值变化会牵动**所有**订阅/消费它的组件。高频变化的状态（输入、动画、hover）放到全局，等于让全应用为它陪跑。
2. **降低耦合**（可维护性）：state 放在哪个组件，就等于声明了"谁有权改它"。局部 state 的修改面只有本组件，代码怎么改都不容易伤及别处；全局状态任何人都能改，排查"谁把它改坏了"的成本随项目规模线性上升。
3. **可测试性**：一个组件的状态都靠自己 `useState` 声明时，单测只需渲染它自己；依赖一堆全局 store 的组件，测试前要先搭起整个环境。

**常见坑。**

- 症状一：输入框每敲一个字符，页面里无关的复杂区块（图表、大表格）跟着闪烁/掉帧。
  根因：把输入框的值放进了父组件甚至全局，每个字符驱动整棵树重渲染。
  修法：把输入状态下放到表单子组件；确有大区块受影响时，配合 `React.memo` 或 `useDeferredValue`（阶段 6）。
- 症状二：两个兄弟组件的数据"各改各的"，同步逻辑越补越乱。
  根因：同一份数据存了两份 state。
  修法：删掉副本，提升到公共父组件，单一数据源 + 派生显示。
- 症状三：为了"省事"把一堆无关状态塞进一个全局 store，最后任何一个小改动都让全站重渲染。
  根因：把全局当成了默认选项。
  修法：按上面的决策流程图逐项下放/拆分；全局只留真正全局的（主题、登录态、语言）。
- 症状四：无脑提升到 App 根组件，导致 props 穿透五六层。
  根因：把"提升"当成了唯一方向，忽略了"下放"。
  修法：先检查每个 state 的真实消费者，只提升到**最近**公共父组件；穿透严重的考虑 Context（阶段 3 Props drilling 一节会先体验这种痛再解决它）。

### useEffect 场景

展开五条之前，先回答"为什么会有 useEffect 这个东西"。React 对组件函数有一条铁律：**渲染必须是纯粹的**——同样的 props 和 state，渲染结果必须一样，且渲染过程不能产生任何可观察的副作用（改全局变量、操作 DOM、发请求、开定时器都不行）。这条铁律不是洁癖：React 18 之后渲染可能是并发的、可中断的，一次渲染的结果可能被丢弃后重放（StrictMode 开发期双调用就是在模拟这件事），如果渲染过程里夹了副作用，重放一次请求就发两次。

但真实应用必须与 React 之外的世界打交道：要订阅浏览器事件、要连 WebSocket、要请求数据、要让 `document.title` 跟上状态。`useEffect` 就是官方提供的"离开 React 世界"的出口：**渲染完成后，把指定的外部交互执行一遍，并且允许你登记"如何撤销它"**。正确的使用心智模型不是"生命周期钩子"（不是 `didMount`/`didUpdate`），而是——

> **useEffect 是让组件与某个外部系统保持同步的机制。依赖数组描述"同步的条件"，effect 体描述"怎么接上"，清理函数描述"怎么断开"。**

带着这个模型看五条场景：第 1 条讲同步条件的表达；第 2 条讲断开；第 3 条是完整实战（请求 + 断开防竞态）；第 4 条讲条件写错的两类后果；第 5 条讲"这根本不需要同步"的情况——那就一条都不该写。

#### 1. 依赖数组三种形态的含义（无 / `[]` / 指定）

**是什么。** `useEffect(setup, dependencies)` 的第二个参数有三种给法，分别声明三种同步策略：

| 形态 | 写法 | 执行时机 | 执行次数 | 语义 |
|---|---|---|---|---|
| 无依赖数组 | `useEffect(fn)` | **每次渲染提交后**都执行 | 每次渲染 1 次 | "渲染结果和外部系统有任何出入就重新同步"——最保守，代价最大 |
| 空数组 | `useEffect(fn, [])` | 仅**首次渲染提交后**执行（严格模式开发期为暴露问题会执行"effect→清理→再 effect"） | 1 次 | "外部系统只在挂载时接一次，之后永不重新同步"——用于订阅与组件生命周期一致的东西 |
| 指定依赖 | `useEffect(fn, [a, b])` | 首次 + 依赖变化后的渲染提交后 | 首次 1 次 + 每次依赖变化 1 次 | "当 a、b 变了，外部系统就过时了，需要断开重连"——最常用 |

**为什么需要依赖数组。** 因为"同步"是有条件的：`document.title = fullName` 只在 `fullName` 变化后才需要重做，每次渲染都重做是浪费；`roomId` 变了，聊天室连接必须重连，不重连就连错房间。依赖数组就是你告诉 React 的**同步条件声明**："这几个值是本 effect 与外部世界的一致性所系的，它们变了就重新执行"。

**怎么做（机制分步）。** 每次渲染提交后，React 执行这段逻辑：

1. 拿出**上一次渲染时记录的依赖值数组**与**本次的依赖值数组**。
2. 逐位用 `Object.is(prev, next)` 比较（所以对象/数组/函数类型的依赖，引用变了就算"变化"，哪怕内容相同——这是无数 bug 的来源，见第 4 条与本章 useMemo 场景）。
3. 只要**任意一位**不等：先执行上一次 effect 返回的**清理函数**，再执行本次的 effect 体，并记录本次依赖。
4. 全部相等：什么都不做（既不清理也不执行）。
5. 没有依赖数组：跳过比较，每次渲染后都执行 3 中的"清理→执行"。

**代码示例：三种形态对比。**

```tsx
import { useEffect, useState } from 'react';

export default function DepsDemo({ roomId }: { roomId: string }) {
  const [count, setCount] = useState(0);

  // 形态一：无依赖数组——每次渲染后都执行（含 count 变化引发的渲染）
  useEffect(() => {
    console.log('[无依赖] 每次渲染后都会跑');
  });

  // 形态二：空数组——只在挂载后执行一次
  useEffect(() => {
    console.log('[空数组] 只在挂载后执行一次');
    return () => console.log('[空数组] 卸载时执行清理');
  }, []);

  // 形态三：指定依赖——挂载后一次 + roomId 每次变化后
  useEffect(() => {
    console.log(`[指定依赖] 同步连接到房间 ${roomId}`);
    return () => console.log(`[指定依赖] 断开与房间 ${roomId} 的连接`);
  }, [roomId]);

  return (
    <div>
      <p>房间：{roomId}，count：{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1（触发一次渲染）</button>
    </div>
  );
}
```

把父组件里 `roomId` 从 `'general'` 改到 `'random'`，再点三次 +1，控制台输出序列是：

```text
挂载：
  [无依赖] 每次渲染后都会跑
  [空数组] 只在挂载后执行一次
  [指定依赖] 同步连接到房间 general
点击 +1 三次（roomId 没变，只有渲染在变）：
  [无依赖] 每次渲染后都会跑        ← 3 次
roomId 变为 random：
  [指定依赖] 断开与房间 general 的连接   ← 先清理旧的
  [指定依赖] 同步连接到房间 random       ← 再同步新的
  [无依赖] 每次渲染后都会跑
卸载：
  [空数组] 卸载时执行清理
  [指定依赖] 断开与房间 random 的连接
```

**"每次渲染都跑"的合法场景。** 无依赖数组不是禁用写法，只是用得少。合法场景比如：effect 的同步条件确实"包含所有渲染产物"时——调试日志、依据整棵渲染结果同步某外部缓存。但大多数"看似每次都要跑"的场景，写明依赖后性能更好且语义更准：`document.title = fullName` 写 `[fullName]` 就只在名字变化时执行一次，效果一样。

**常见坑。**

- 症状一：effect 只在挂载时跑了一次，之后 props 变了再也不跑（连接一直连着旧房间、日志一直打印旧 userId）。
  根因：写成 `[]` 但 effect 内部读了会变化的 props/state；`[]` 的语义是"永不需要重新同步"，React 说到做到。
  修法：把读到的值全部加入依赖（配合 eslint，见第 4 条）；"确实只想跑一次但想读最新值"的少数场景用 ref 存最新值（见闭包陷阱专题第 3 条）。
- 症状二：写了 `useEffect(fn, [user])`，`user` 是个对象，父组件每次渲染都传**新建的对象**（内容没变），导致 effect 每次渲染都在清理+重跑（WebSocket 反复断连重连）。
  根因：依赖比较用 `Object.is`，比的是引用；组件体内 `const user = { name } ` 每次渲染都是新引用。
  修法：依赖最小化——只依赖真正用到的字段 `user.id`；或渲染侧用 `useMemo` 稳定引用（本章 useMemo 场景）。
- 症状三：把依赖数组写成依赖"值"之外的变量个数不对（漏写、多写、写错顺序）导致 effect 行为漂移。
  根因：依赖数组是手写的，容易与 effect 体脱节。
  修法：启用 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则（阶段 0 已配置），让工具守住这层一致性。

#### 2. **清理函数**：定时器、`addEventListener`、WebSocket、`AbortController`

**是什么。** effect 的 setup 函数可以返回一个清理函数（cleanup）。React 会在两个时机调用它：

```text
effect 生命周期时序（以依赖 [roomId] 为例）：

挂载        :  effect(roomId=A)
roomId 变化 :  cleanup(A)          ← 先调用上一次的清理函数
              effect(roomId=B)     ← 再执行新一次 effect
roomId 再变 :  cleanup(B) → effect(roomId=C)
卸载        :  cleanup(最后一次)    ← 卸载时也会调用
```

一句话概括：**清理函数总在下一次 effect 执行之前、以及组件卸载时调用**。它的职责是把上一次 effect 对外部世界造成的改变恢复原状——解除订阅、关掉定时器、断开连接、取消请求——保证"每次 effect 都是从干净状态开始的同步"。

**为什么需要清理。** 因为 effect 是"重复发生"的（依赖变化就重跑）而外部资源是"累积存在"的：

- 定时器不 clear：每重跑一次 effect 就多一个定时器，旧的还在跑；
- 监听器不 remove：每重跑一次就多挂一个回调，一次事件触发 N 次 handler；
- WebSocket 不 close：连接对象越积越多，服务器连接数上涨；
- 请求不 abort：旧请求还在飞，回来时把新数据覆盖掉（第 3 条竞态专题）。

没有清理函数的 effect，等价于"只借不还"，早晚资源泄漏或行为错乱。React 官方把"setup 与 cleanup 成对"作为 effect 设计的第一原则，StrictMode 在开发环境强制"挂载→清理→再挂载"一轮，就是为了把缺失清理的代码在开发期暴露出来。

**场景一代码：定时器。**

```tsx
import { useEffect, useState } from 'react';

export default function Clock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // setup：开始一段外部交互——每秒读一次系统时钟
    // 新值不依赖旧值（时钟自己走），传值即可；若要"在上次基础上累加"才需要函数式更新
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      // cleanup：撤销这段交互——销毁定时器
      clearInterval(id);
    };
  }, []); // 时钟的同步条件是"组件存在"，所以 []（只挂一次，卸载时清理）

  return <p>当前时间戳：{now}</p>;
}
```

漏清理的症状与观察法：把 `return () => clearInterval(id)` 删掉，表面看不出异常（因为 `[]` 只跑一次）；但当依赖不是 `[]` 而是会变化的值（比如 props 里的刷新间隔）时，每变化一次就多一个 interval，时间跳越来越快、CPU 占用上升。观察法：在 setup 里 `console.log('interval 创建', id)`、清理里 `console.log('interval 清除', id)`，任何时刻"创建数 - 清除数"应恒等于 1。

**场景二代码：`addEventListener`。**

```tsx
import { useEffect, useState } from 'react';

export default function WindowWidth({ onResize }: { onResize?: () => void }) {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    // setup：向 window 挂一个 resize 监听（window 在组件卸载后依然存在！）
    const handleResize = () => {
      setWidth(window.innerWidth);
      onResize?.();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      // cleanup：移除监听。注意必须传同一个函数引用，
      // 若 cleanup 里现写一个新箭头函数，remove 无效（removeEventListener 按引用匹配）
      window.removeEventListener('resize', handleResize);
    };
  }, [onResize]); // onResize 是 prop：它变了就需要"换个回调重新同步"，所以进依赖

  return <p>窗口宽度：{width}px</p>;
}
```

两个工程要点：其一，cleanup 里移除的必须是 setup 里挂载的**同一个函数引用**（所以 `handleResize` 要先存成变量）；其二，`window` 这类"活得比组件久"的对象是泄漏重灾区——组件销了监听器还在，回调里再引用着 state/闭包，整条引用链都释放不掉。观察法：DevTools Console 执行 `getEventListeners(window)`（Chrome 专有 API，仅在 DevTools 控制台可用）查看 window 上挂的监听器数量，反复挂载/卸载组件，数量应回到初始值。

**场景三代码：WebSocket。**

```tsx
import { useEffect, useState } from 'react';

interface ChatMessage { user: string; text: string; }

export default function ChatRoom({ roomUrl }: { roomUrl: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    setStatus('connecting');
    // setup：连接指定房间。roomUrl 在依赖里——换房间必须重连
    const ws = new WebSocket(roomUrl);

    ws.onopen = () => setStatus('open');
    ws.onmessage = (event: MessageEvent<string>) => {
      // 用函数式更新追加消息：不依赖闭包里的旧 messages（闭包陷阱专题详解）
      const msg = JSON.parse(event.data) as ChatMessage;
      setMessages(prev => [...prev, msg]);
    };
    ws.onclose = () => setStatus('closed');

    return () => {
      // cleanup：断开连接。不关的话——换房间后旧房间的消息仍会涌入 setMessages
      ws.close();
    };
  }, [roomUrl]);

  return (
    <div>
      <p>连接状态：{status}</p>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m.user}：{m.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

漏清理的症状与观察法：删掉 `ws.close()`，快速在两个 `roomUrl` 之间切换几次，Chrome DevTools 的 Network 面板 → WS 过滤器里会看到 WebSocket 连接条目只增不减，旧连接的 Frame 仍在滚动收消息（消息还会继续 `setMessages`，两个房间的消息混在一起）；组件卸载后回调仍在更新 state，React 18 已不再为此报错（旧版本会警告 memory leak），但你的 UI 已经无人显示，纯属做无用功。观察法：Network → WS 看连接数；Console 里看卸载后是否仍打印消息日志。

**场景四代码：`AbortController`（取消 fetch 请求）。**

```tsx
import { useEffect, useState } from 'react';

interface User { id: number; name: string; }

export default function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // setup：为这一次请求配一个"中止器"，把 signal 关联到 fetch
    const controller = new AbortController();

    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`, {
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<User>;
      })
      .then(setUser)
      .catch((err: unknown) => {
        // 被 abort 的请求会以 AbortError 拒绝：这不是业务错误，静默忽略
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err as Error);
      });

    return () => {
      // cleanup：userId 变化或卸载时，中止仍在飞的请求
      controller.abort();
    };
  }, [userId]);

  if (error) return <p>加载失败：{error.message}</p>;
  return <p>{user ? user.name : '加载中…'}</p>;
}
```

四个场景一张表总结：

| 资源 | setup | cleanup | 不清理的后果 |
|---|---|---|---|
| 定时器 | `setInterval(fn, ms)` | `clearInterval(id)` | 定时器堆积，回调重复执行 |
| DOM/window 事件 | `addEventListener(type, fn)` | `removeEventListener(type, fn)`（同一引用） | 回调重复触发、闭包引用泄漏 |
| WebSocket | `new WebSocket(url)` | `ws.close()` | 连接数上涨、旧连接消息继续灌入 |
| fetch | `fetch(url, { signal })` | `controller.abort()` | 竞态：旧响应覆盖新数据 |

**漏清理的内存泄漏，DevTools 观察法汇总。**

1. **Console 计数法（最快）**：setup/cleanup 各打一条带自增编号的日志，任何时刻两者差值应等于"当前应有的资源数"。
2. **React DevTools Profiler**：录制期间反复挂载/卸载组件，若卸载后仍有该组件名下的提交（commit）出现，说明有回调仍在 setState。
3. **Chrome Performance → Memory**：拍 Heap snapshot（堆快照）两次（卸载组件前后各一次），用 Comparison 视图看 Detached（已脱离 DOM 树但仍被引用的）节点是否持续增长；Summary 里按 Retainers 追到持有者——通常就是没解绑的监听器或没关的连接。
4. **Network 面板**：WS 连接只增不减、卸载后请求仍在发出，都是清理缺失的直接证据。

**常见坑。**

- 症状一：组件卸载后控制台还在刷日志 / 请求还在发。
  根因：effect 建立的异步任务没有随卸载终止。
  修法：补 cleanup；无法 abort 的场景（如某些旧接口）用"忽略标志"（第 3 条）兜底。
- 症状二：`removeEventListener` 写了但监听器还在，事件触发两次。
  根因：cleanup 里传的箭头函数是**新建的引用**，与 setup 时挂的不是同一个函数，移除无效。
  修法：handler 提为 setup 内的具名变量，add/remove 用同一个变量。
- 症状三：依赖数组留空 `[]` 但 effect 里用了会变的 props，导致"清理"清理的永远是第一次的旧值资源。
  根因：`[]` 让 effect 与清理都只跑一次，后续变化既不重新同步也不重新清理。
  修法：补全依赖，让"清理旧的 + 建立新的"配对发生。
- 症状四：在 cleanup 里做了多余的事（重置 UI state、发埋点）导致切页时界面闪烁。
  根因：清理函数的职责被扩大。它只该"撤销 setup 建立的交互"。
  修法：埋点等"只在真正离开时做一次"的逻辑，放到卸载才执行的 effect（`[]`）里，或用 ref 标记依赖变化与卸载的区分。

#### 3. 数据请求完整链路：loading / error / success / 竞态取消（快速切换 tab 时旧请求覆盖新结果）

**是什么。** 把"请求"这件外部交互完整地纳入 React：用状态机描述请求的三种形态（进行中/失败/成功），用 cleanup（AbortController 或忽略标志）处理"请求未完成但组件已进入下一轮"的竞态。

**为什么需要。** 两个原因：

1. 请求是**异步**的：从发出到响应之间组件可能渲染任意次，必须有一个 state 表达"正在进行中"，否则 UI 无从显示骨架屏/禁用态；响应可能失败，失败必须可表达、可恢复（重试）。
2. 请求是**乱序返回**的：发出 A（慢）又发出 B（快）时，B 先回、A 后回，若不处理，最后留在界面上的会是 A 的旧数据——但用户当前选择的是 B。这就是竞态条件（race condition），数据请求里最经典的 bug。

**怎么做（机制分步）。** 以"请求参数 `url` 作为依赖"的 effect 为例：

1. `url` 变化 → React 调用 cleanup：abort 上一次请求（它已不代表用户当前意图）。
2. 执行新 effect：进入 loading 态，创建新 AbortController，发出带 signal 的新请求。
3. 响应到达 → 校验状态 → 进入 success 态写入 data；异常到达 → abort 引起的 AbortError 静默忽略，其他进入 error 态。
4. 组件卸载 → cleanup 同样 abort，防止"卸载后 setState"式的无用工。

**状态机建模。** 不要用三个平行布尔值（`loading && error` 同时为 true 的非法组合早晚出现），用一个可辨识联合（discriminated union）让非法状态不可表示：

```ts
// RequestState.ts —— 三态状态机：任一时刻恰好处于其中一种形态
export type RequestState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };
```

**竞态时序图解。** 无取消机制时，快速切换 tab：

```text
时间 ──────────────────────────────────────────────────────────────►

t0  用户点 Tab A
t0  effect#1：发出请求 A（命中慢接口，耗时 1500ms）  loading…
t1  用户等不及，点 Tab B（ta 只想看 B！）
t1  （没有 cleanup：请求 A 继续飞）
t1  effect#2：发出请求 B（缓存/快接口，耗时 300ms）
t2  请求 B 返回 → setData(B) → 界面显示 B 的数据 ✅ 符合用户预期
t3  请求 A 这才返回 → setData(A) → 界面被 A 的旧数据覆盖 ❌
    用户盯着 Tab B，看到的却是 Tab A 的内容 —— 竞态 bug 现场

有 cleanup（AbortController）时：
t1  cleanup#1：controller.abort() → 请求 A 在浏览器层面被中止
    （即使它已到达服务器并被响应，前端也会收到 AbortError 而不会走 then）
t1  effect#2：发出请求 B
t2  请求 B 返回 → setData(B) ✅ 界面稳定显示 B
t3  （A 早已被 abort，不存在 t3 的覆盖）
```

复现方法：真实网络里很难稳定复现竞态，用 Chrome DevTools Network 面板的 throttling 选 Slow 3G，或给接口 URL 加不同延迟参数（如 jsonplaceholder 响应本就偏慢），快速连点两个 tab 即可看到"显示的是先点那个 tab 的数据"。

**AbortController 版 useFetch 完整实现。**

```tsx
// useFetch.ts —— 通用数据请求 Hook：三态状态机 + AbortController 竞态取消
import { useEffect, useState } from 'react';

export type RequestState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

export function useFetch<T>(url: string): RequestState<T> {
  // 初始即 loading：组件一挂起就有请求要发
  const [state, setState] = useState<RequestState<T>>({ status: 'loading' });

  useEffect(() => {
    // 每轮 effect 配一个独立控制器：它的生命周期 = 本轮同步的生命周期
    const controller = new AbortController();
    setState({ status: 'loading' }); // url 变化后先回到 loading（清掉上一轮的 data/error）

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          // fetch 对 404/500 不会 reject！必须手动检查并抛出，否则会进 success
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<T>;
      })
      .then(data => {
        // 走到这里说明既成功又未被 abort，安全写入
        setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        // 被 abort 的请求抛 AbortError：它是"被我们主动取消"的，不算失败，静默返回
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ status: 'error', error: err as Error });
      });

    return () => {
      // cleanup：url 变化 / 组件卸载 → 中止本轮请求（竞态防线就在这一行）
      controller.abort();
    };
  }, [url]); // url 是唯一的同步条件：url 变 = 数据过时 = 必须重新请求

  return state;
}
```

配套使用它的 tab 组件：

```tsx
// UserTabs.tsx —— 快速切换也不怕：useFetch 内部已处理竞态
import { useState } from 'react';
import { useFetch } from './useFetch';

interface User { id: number; name: string; email: string; }

const TABS: Record<string, number> = { Alice: 1, Bob: 2, Carol: 3 };

export default function UserTabs() {
  const [tab, setTab] = useState<keyof typeof TABS>('Alice');
  // 请求 URL 由 tab 派生：tab 变 → url 变 → useFetch 内部 abort 旧的、发新的
  const state = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${TABS[tab]}`
  );

  return (
    <div>
      {Object.keys(TABS).map(name => (
        <button key={name} onClick={() => setTab(name as keyof typeof TABS)}>
          {name}
        </button>
      ))}
      {state.status === 'loading' && <p>加载中…</p>}
      {state.status === 'error' && <p>出错了：{state.error.message}</p>}
      {state.status === 'success' && (
        <dl>
          <dt>姓名</dt><dd>{state.data.name}</dd>
          <dt>邮箱</dt><dd>{state.data.email}</dd>
        </dl>
      )}
    </div>
  );
}
```

**备选方案：忽略标志（ignore flag）。** 当接口/库不支持 abort（如 JSONP、部分旧封装）时，用布尔标志实现"请求照飞、结果丢弃"：

```tsx
// useFetchIgnore.ts —— 不中断请求，但让迟到的旧响应被丢弃
import { useEffect, useState } from 'react';

export function useFetchIgnore<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false; // 本轮同步的"生死牌"：cleanup 一执行即翻转为 true

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(json => {
        if (!ignore) setData(json); // 只有这轮 effect 还"活着"才允许写入
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err as Error);
      });

    return () => {
      ignore = true; // url 变化/卸载：宣布上一轮结果作废
    };
  }, [url]);

  return { data, error, loading: data === null && error === null };
}
```

两种方案对比：ignore 标志**只丢弃结果**，请求本身仍会下载完（浪费带宽与服务器资源，但实现零依赖、处处可用）；AbortController **真正中止请求**（浏览器停止下载、服务器有机会中断处理），是首选。两者不冲突，`useFetch` 里 abort + catch AbortError 的组合已经同时起到了 ignore 的作用。

**常见坑。**

- 症状一：快速切换 tab 后显示的是"先点的那个 tab"的数据。
  根因：无取消机制，慢请求后到，把正确数据覆盖。
  修法：AbortController（首选）或 ignore 标志；生产项目直接上 TanStack Query，其内部已处理（阶段 4.2 展开）。
- 症状二：接口返回 404/500，界面却显示"成功"且数据为空。
  根因：`fetch` 只在网络层面失败时 reject，HTTP 错误状态码不会自动抛错。
  修法：`if (!res.ok) throw new Error(...)`（见 useFetch 实现）。
- 症状三：url 变化后界面上上一轮的 data 和这一轮的 loading 闪烁重叠。
  根因：effect 里忘了先 `setState({ status: 'loading' })`，旧数据残留到了新请求返回。
  修法：每轮 effect 开头重置为 loading（见实现）。
- 症状四：catch 里把 AbortError 当作错误显示给用户（切换越快越容易看到"请求被中止"的报错）。
  根因：abort 触发的 DOMException(AbortError) 走进了同一个 catch。
  修法：catch 首行过滤 `err.name === 'AbortError'` 直接 return。

#### 4. `exhaustive-deps` 警告：依赖"太多导致循环"与"太少导致旧值"两类问题的解法

**是什么。** `exhaustive-deps` 是 `eslint-plugin-react-hooks` 内置规则（阶段 0 已配置），它静态分析 effect 内部**实际读取**的响应式值（props、state 及由它们派生的局部变量），与依赖数组比对：漏了就警告"缺少依赖"，写了对内部没用的会提示"多余依赖"。它的立场很明确：**依赖数组不是"你希望 effect 什么时候跑"的开关，而是"effect 正确性所需条件"的如实申报**。警告出现时，正确动作不是删规则、加 `eslint-disable`，而是处理它。

为什么规则如此强硬？因为两类瞒报/误报会分别导致两种可复现的 bug：

**问题 A：依赖太少 → 读到旧值。**

复现：

```tsx
import { useEffect, useState } from 'react';

export default function MissingDep({ userId }: { userId: string }) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // effect 体读取了 userId，但依赖数组没申报
    setMessage(`欢迎你，${userId}`);
    console.log('欢迎消息已设置：', userId);
  }, []); // ⚠️ exhaustive-deps：React Hook useEffect has a missing dependency: 'userId'

  return <p>{message}</p>;
}
```

运行流程：挂载时 userId 是 `'alice'`，effect 跑一次，显示"欢迎你，alice"。父组件把 userId 换成 `'bob'` 组件重渲染——但依赖是 `[]`，React 比较 `[]` 与 `[]` 全等，**effect 不再执行**，界面仍显示 alice 的欢迎语。旧值从此凝固。修法：如实申报 `[userId]`，userId 变化时 effect 重新同步，欢迎语跟上。

```tsx
  useEffect(() => {
    setMessage(`欢迎你，${userId}`); // 依赖申报与读取一致，警告消失，行为正确
  }, [userId]);
```

**问题 B：依赖太多 → 无限循环。**

复现一（effect 里 setState 又依赖它）：

```tsx
import { useEffect, useState } from 'react';

export default function InfiniteLoop() {
  const [count, setCount] = useState(0);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(r => r + 1); // effect 里更新了 renderCount……
  }, [renderCount]);            // ……而又依赖了 renderCount

  // 死循环链：渲染 → effect 跑 → setRenderCount → 渲染 → 依赖变了 → effect 再跑 → ……
  // 表现：界面卡死/警告 "Maximum update depth exceeded"
  return <p>渲染了 {renderCount} 次（并持续增长）</p>;
}
```

复现二（对象引用依赖）：

```tsx
import { useEffect, useState } from 'react';

export default function ObjectDepLoop({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  // 每次渲染都在组件体内新建 options 对象（引用全新）
  const options = { q: query, pageSize: 10 };

  useEffect(() => {
    setResults(search(options)); // setState → 渲染 → 新 options → 依赖变 → 再跑……
  }, [options]); // ⚠️ 引用比较永不相等

  return <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>;
}

function search(o: { q: string; pageSize: number }): string[] {
  return [`${o.q}-结果1`, `${o.q}-结果2`];
}
```

**修法一：函数式更新，把 state 移出依赖。** 若 effect 更新 state 的逻辑不依赖读取该 state，用函数式更新即可删掉这个依赖（问题 B 复现一里 `setRenderCount(r => r + 1)` 本就不需要读 `renderCount`，依赖删成 `[]` 就修好了）：

```tsx
  useEffect(() => {
    setRenderCount(r => r + 1); // 函数式更新自带"上一步"，无需读取闭包里的值
  }, []); // 依赖里不再有 renderCount，循环断开
```

**修法二：依赖最小化——只依赖真正参与同步条件的值。** 问题 B 复现二里，effect 实际需要的只是 `query`（字符串，值相等即引用相等），把 `options` 移进 effect 内部构造：

```tsx
  useEffect(() => {
    const options = { q: query, pageSize: 10 }; // 移进 effect：不再是"每次渲染的新引用"
    setResults(search(options));
  }, [query]); // 只依赖原始值，语义更准、永不循环
```

**修法三：拆分 effect。** 一个 effect 干了多件事、互相牵连出依赖纠纷时，按"同步条件不同"拆开，各自依赖各自：

```tsx
  // ❌ 揉在一起：a 变化也会导致 b 的订阅重连
  useEffect(() => {
    subscribeTo(a);
    log(b);
  }, [a, b]);

  // ✅ 拆分：a 的重连不再被 b 的变化骚扰
  useEffect(() => {
    const unsub = subscribeTo(a);
    return unsub;
  }, [a]);
  useEffect(() => {
    log(b);
  }, [b]);
```

**修法四：确需"每次引用都稳定"时用 `useMemo` 包住对象/函数**（本章 useMemo 场景展开；函数可用 `useCallback`）。这是最后手段——先问自己能不能依赖更原始的值。

**两类问题对照速查：**

| | 依赖太少 | 依赖太多 |
|---|---|---|
| 典型症状 | 值凝固在旧数据、effect "不再跑" | 无限循环 / effect 频繁重跑 / 卡死 |
| 根因 | 依赖申报少于实际读取 → React 认为"无需重新同步" | 依赖了 effect 更新的 state，或依赖了每次渲染新建的对象引用 |
| 第一反应 | 补上缺的依赖 | 删掉不该有的依赖（移进 effect / 函数式更新 / 依赖原始值） |
| 拆东墙补西墙的伪修法 | 删依赖压警告（旧值 bug 被埋进去） | 把依赖写全却保留 setState（循环换了个形状） |

**常见坑。**

- 症状一：控制台 `Maximum update depth exceeded`。
  根因：effect 与自身依赖形成闭环（问题 B 复现一/二）。
  修法：按"修法一/二"断环；重新审视这段逻辑是否根本不该在 effect 里（见第 5 条）。
- 症状二：加了个 `setTimeout` 依赖"只跑一次"的 effect，后来发现读到旧 props。
  根因：`[]` 是"永不重同步"的强声明，不是"只跑一次的工具"。
  修法：补依赖；只在"同步条件确实是组件生命周期"时用 `[]`。
- 症状三：`eslint-disable-next-line react-hooks/exhaustive-deps` 满天飞。
  根因：把警告当噪音。绝大多数警告指向真实 bug 或设计问题。
  修法：先按规则修；确属例外（如第三方库文档要求）再 disable 并写明原因与风险。
- 症状四：依赖数组写了但顺序/内容不稳定（如依赖里混入条件表达式结果），effect 行为漂移难排查。
  修法：依赖数组只放"effect 里读取的响应式值"本体，不放表达式；靠 exhaustive-deps 兜底。

#### 5. **什么时候不该用 useEffect**：派生状态用普通变量/Memo、事件逻辑放事件处理器（react.dev《You Might Not Need an Effect》必读）

**是什么。** react.dev 官方文档专设一节《You Might Not Need an Effect》，核心论断：**effect 的唯一正当职责是"与 React 之外的系统同步"**（网络请求、DOM 浏览器 API、第三方 widget、计时器、订阅、日志）。以下三类需求都不该用 effect 实现：

1. 由 props/state **计算出来**的数据 → 普通变量（贵的加 `useMemo`）。
2. 响应**用户操作**的逻辑 → 事件处理器。
3. 因某个值变化而**调整/重置另一个 state** → 多数有更好的模式（`key` 重置、渲染期间调整、函数式更新）。

**为什么不该滥用。** 三条实打实的代价：

- **多余的渲染链**：先渲染一次（旧派生值）→ effect 跑 → setState → 再渲染一次（新派生值），本可一次完成的更新变成两跳，输入类高频场景直接掉帧。
- **旧值与时序 bug 的温床**：effect 与渲染之间存在一次提交的时间差，期间任何读取都可能拿到中间态；依赖写漏就是本章第 4 条的问题。
- **逻辑被藏进"数据流之外"**：事件处理器里的逻辑顺着"用户操作"能直接找到；藏进 effect 后，"谁触发的"要靠脑内模拟渲染序列，新人接手如读天书。

**反例一：用 effect 派生状态。** 错误写法（React 官方文档的头号反面教材）：

```tsx
import { useEffect, useState } from 'react';

export default function BadFullNameForm() {
  const [firstName, setFirstName] = useState('张');
  const [lastName, setLastName] = useState('三');

  // ❌ 用一整套 state+effect 去"手动同步"一个可以当场算出来的值
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName); // 每次名字变化：渲染(旧值)→effect→再渲染(新值)
  }, [firstName, lastName]);

  return (
    <form>
      <input value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      <p>全名：{fullName}</p>
    </form>
  );
}
```

重构后——派生值直接在渲染中计算，没有第二次渲染、没有依赖数组、没有旧值窗口：

```tsx
import { useState } from 'react';

export default function GoodFullNameForm() {
  const [firstName, setFirstName] = useState('张');
  const [lastName, setLastName] = useState('三');

  // ✅ 派生状态 = 普通变量：每次渲染现场计算，天然与源同步
  const fullName = firstName + ' ' + lastName;

  return (
    <form>
      <input value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      <p>全名：{fullName}</p>
    </form>
  );
}
```

判断口径："这个值能否用已有 props/state **直接算出来**？"能，就是派生状态，永远不要存进 state 再同步。计算昂贵（如对一万条数据过滤排序）时，用 `useMemo` 缓存计算结果——注意 memo 缓的是**计算成本**，语义仍是"派生"：

```tsx
import { useMemo, useState } from 'react';

const ALL_ITEMS = Array.from({ length: 10000 }, (_, i) => `商品 ${String(i + 1).padStart(5, '0')}`);

export default function ExpensiveList() {
  const [keyword, setKeyword] = useState('');

  // ✅ 派生 + 缓存：仅当 keyword 变化才重算，其余渲染直接复用上次结果
  const filtered = useMemo(
    () => ALL_ITEMS.filter(item => item.includes(keyword)),
    [keyword]
  );

  return (
    <div>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} />
      <p>共 {filtered.length} 件（来自 {ALL_ITEMS.length} 件）</p>
      <ul>{filtered.slice(0, 20).map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
```

**反例二：把事件逻辑放进 effect。** 错误写法——提交表单不写在提交事件里，而是"绕道 state 变化"触发：

```tsx
import { useEffect, useState } from 'react';

export default function BadSubmitForm() {
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  // ❌ "监听 submitted 变 true 就提交"：把用户动作翻译成 state 再翻译回来
  useEffect(() => {
    if (submitted) {
      submitForm(form); // 后果一：StrictMode 下开发期双执行，请求发两次
      setSubmitted(false); // 后果二：手动复位，多一次渲染，忘了就每次渲染都提交
    }
  }, [submitted, form]); // 后果三：form 也得进依赖，依赖越滚越多

  return (
    <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }}>
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <button type="submit">提交</button>
    </form>
  );
}

function submitForm(form: { name: string; email: string }) {
  console.log('提交到服务器：', form);
}
```

重构后——用户动作直接对接动作处理代码，可预测、不重复：

```tsx
import { useState } from 'react';

export default function GoodSubmitForm() {
  const [form, setForm] = useState({ name: '', email: '' });

  // ✅ 事件逻辑放事件处理器：谁触发、何时执行一目了然，StrictMode 双渲染也不会多发请求
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitForm(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <button type="submit">提交</button>
    </form>
  );
}

function submitForm(form: { name: string; email: string }) {
  console.log('提交到服务器：', form);
}
```

判断口径："这段逻辑是在**响应用户的操作**，还是在**和外部系统同步**？"响应用户（提交、购买、点赞、导航）→ 事件处理器。同一个需求里两类逻辑都可能存在：点击购买是事件逻辑，购买后同步购物车徽标到服务器才是 effect 关心的事。

**反例三：props 变化时重置 state。** 错误写法——用 effect"监听"userId，变了就清空评论草稿：

```tsx
import { useEffect, useState } from 'react';

export default function BadProfile({ userId }: { userId: string }) {
  const [comment, setComment] = useState('');

  // ❌ 先渲染一次带着旧用户的草稿，effect 再清空 → 又一次渲染，界面闪一下旧值
  useEffect(() => {
    setComment('');
  }, [userId]);

  return <textarea value={comment} onChange={e => setComment(e.target.value)} />;
}
```

重构方案 A（首选）——**用 `key` 重置整个组件**。父组件把 `userId` 同时作为 `key` 传入，key 变化时 React 会**卸载旧组件、挂载新组件**，所有 state 天然回到初始值，一行 effect 都不用写：

```tsx
// 父组件里：<Profile key={userId} userId={userId} />
import { useState } from 'react';

export default function Profile({ userId }: { userId: string }) {
  // userId 一变（经父组件 key），本组件整个重建，comment 自动是 ''
  const [comment, setComment] = useState('');
  return (
    <div>
      <p>用户：{userId}</p>
      <textarea value={comment} onChange={e => setComment(e.target.value)} />
    </div>
  );
}
```

重构方案 B——**渲染期间调整 state**（react.dev 认可的官方模式）：在渲染过程中比较"上一次的 props"与"本次的 props"，不一致就趁渲染内重置，无需第二次提交：

```tsx
import { useState } from 'react';

export default function List({ items }: { items: string[] }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [prevItems, setPrevItems] = useState(items); // 记住"这次 state 对应的 props"

  if (items !== prevItems) {
    // 渲染期间检测到 items 变化：直接调整本组件 state（React 会立刻丢弃本次输出重新渲染，
    // 不会提交中间态；只允许"改自己"且需能收敛，严禁改父级/全局）
    setPrevItems(items);
    setSelection(null);
  }

  return (
    <ul>
      {items.map(item => (
        <li
          key={item}
          onClick={() => setSelection(item)}
          style={{ fontWeight: selection === item ? 'bold' : 'normal' }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

**判别口诀（贴在工位上）：**

```text
想写 useEffect 前，按序三问：

1. 能用 props/state 直接算出来吗？      → 普通变量（贵的用 useMemo），删掉 effect
2. 是在响应用户的某个操作吗？           → 事件处理器，删掉 effect
3. 是要"重置/调整"某个 state 吗？        → key 重置 或 渲染期间调整，多数情况删掉 effect

三问都否，且确实要接触 React 之外的系统（请求/订阅/计时器/DOM API/第三方库/日志）
→ 这才是 useEffect 的本职，写吧——记得带清理函数，依赖如实申报。
```

**常见坑。**

- 症状一：输入框打字卡顿，Profiler 显示每次击键引发两次渲染。
  根因：派生值走 effect+setState 同步，多了一跳。
  修法：改普通变量/useMemo。
- 症状二：表单提交在开发环境发两次请求。
  根因：提交逻辑在 effect 里，StrictMode 双执行 effect 直接放大。
  修法：移入 `onSubmit`。
- 症状三：切换用户后表单里还残留上一个用户的草稿（或闪烁一下旧值才清空）。
  根因：用 effect "补丁式"重置 state，重置发生在提交之后。
  修法：`key` 重置组件（方案 A），一劳永逸。

---

### 闭包陷阱专题（必练）

前面 useState 与 useEffect 两节反复出现同一类怪现象："明明 state 已经变了，某段代码读到的还是旧值"。这类 bug 的统一根源是 **JavaScript 闭包 × React 渲染快照模型** 的相互作用。把它单独拎出来专题攻克，是因为它披着各种外衣出现——事件回调、定时器、effect、订阅——而本质只有一个。先讲透原理，再逐条拆解三个高频现场。

#### 原理：闭包为什么会捕获旧值——渲染快照模型

**先复习纯 JavaScript 层面的闭包。** 函数定义时会记住自己被创建时所在的词法环境（作用域链），此后无论这个函数被拿到哪里、何时执行，它访问的都是**定义那一刻**作用域里的那些变量绑定：

```ts
function createCounter() {
  let n = 0;                 // 这个变量属于 createCounter 的词法环境
  return () => ++n;          // 返回的函数"闭"住了这个环境
}
const counter = createCounter();
counter(); // 1 —— 即使 createCounter 早已返回，n 依然活着
```

闭包捕获的是**变量绑定（那间屋子的钥匙）**而不是某一刻的值的拷贝——但关键在于：**你拿到的是"哪一间屋子"的钥匙，取决于函数是"第几次调用"时创建的**。

**再看 React 层面：组件函数是"一次渲染调用一次"的普通函数。** 你写的组件：

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(count + 1);
  return <button onClick={handleClick}>{count}</button>;
}
```

在 React 眼里，它每渲染一次就**完整调用一遍** `Counter`。每次调用都有自己的一间屋子：自己的 `count` 局部绑定（值来自 `useState` 本轮返回的快照）、自己的 `handleClick` 函数实例。**第 1 次渲染创建的 `handleClick` 闭住的是第 1 次的 `count`，第 2 次渲染创建的 `handleClick` 闭住的是第 2 次的 `count`——它们是不同屋子里同名的变量，毫无关系。**

用一张时间线图把"渲染快照模型"画出来：

```text
render #1（count = 0）
│  创建本轮局部绑定：count = 0
│  创建本轮函数 handleClick₍₁₎（闭住 count = 0）  ← 这个函数这辈子看到的 count 都是 0
│  返回 JSX（按钮上显示 0，绑定的是 handleClick₍₁₎）
│
├── 用户点击按钮 → React 调 handleClick₍₁₎()
│       setCount(0 + 1)   // 它眼里的 count 是 0
│
├── React 处理更新：state = 1，重新调用 Counter()
│
render #2（count = 1）
│  创建全新一轮局部绑定：count = 1（与上一轮的 count 是两个不同变量）
│  创建全新函数 handleClick₍₂₎（闭住 count = 1）
│  返回 JSX（按钮显示 1，绑定换成 handleClick₍₂₎） ← 从此页面上响应点击的是它
│
├── 再点击 → 调 handleClick₍₂₎() → setCount(1 + 1) ✓ 正确
```

界面之所以"看起来正常"，是因为每次渲染后 React 都把页面上绑定的事件处理器**换成最新一轮创建的函数**——你永远点到"最新一间的屋子"。陷阱的全部秘密在于：**任何"越过本次渲染存活"的函数——`setTimeout` 回调、`setInterval` 回调、`useEffect` 里创建的订阅、存进第三方的回调——不会随重渲染被替换**，它们闭住的那间屋子就此定格。state 更新不会"追进"旧闭包去修改变量（那间屋子的 `count` 是 `const` 性质的历史照片），React 只是开一间新屋子重新渲染一遍。

**为什么 React 偏要这样设计？** 因为"一次渲染 = 输入确定 → 输出确定"的纯函数模型是 React 一切高级能力的地基：StrictMode 双调用校验纯度、并发渲染丢弃过期渲染重放、未来阶段的 Fiber 可中断调度（阶段 10 展开），都要求渲染过程不依赖、不修改任何可变的外部状态。state 作为"每次渲染的一张快照"，正是用"不可变的历史照片"换来了整套可预测性。你遇到的旧值问题是这个模型的副产品，而解法也全部来自模型内部：**要么让 React 在处理更新时把最新值喂给你（函数式更新），要么把最新值放进一个"跨渲染同一间屋子"的容器（ref，见下一节 useRef 场景）**。

判断"会不会踩闭包坑"只需一问：**"这段代码执行时，它闭住的是哪一次渲染？"**如果答案是"某一次过去的渲染"，而它又读取了那之后的 state/props——旧值陷阱成立。下面三条逐一现场验证。

#### 事件处理器里读到旧 state

**是什么。** 在事件处理器中启动的**延迟执行**逻辑（`setTimeout`、`Promise.then`、动画回调）里读取 state，读到的是"点击那一刻的渲染快照"，而非执行时刻的最新值。

**复现代码。** react.dev 的经典演示——点击按钮 3 秒后弹窗显示 count：

```tsx
import { useState } from 'react';

export default function DelayedAlert() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // setTimeout 的回调是"本次渲染"创建的函数，闭住本次的 count
    setTimeout(() => {
      alert('你点击按钮时，count 是：' + count); // 3 秒后执行，count 仍是点击那一刻的值
    }, 3000);
  };

  return (
    <div>
      <p>当前 count：{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={handleClick}>3 秒后显示 count</button>
    </div>
  );
}
```

复现步骤：点三次"+1"（count = 3）→ 点"3 秒后显示 count"→ **立刻**再点两次"+1"（count = 5）→ 3 秒后弹窗显示 **3**，不是 5。

**机制解释。** 点击"3 秒后显示"发生在 count = 3 的那次渲染里，`handleClick` 是那一轮创建的，它交给 `setTimeout` 的回调闭住的也是那一轮屋子的 `count = 3`。之后的两次"+1"开了两间新屋子（count = 4、5），但定时器里握着的还是旧屋子的钥匙。**这不是 React 的 bug，而是"闭包捕获定义时环境"这一 JS 语义的自然结果**——就像上面原理图里的 `handleClick₍₁₎` 永远看到 0 一样。

**修法。** 分两种诉求：

- 诉求是"**基于最新值更新**"：函数式更新，让 React 在处理更新时喂最新值——

```tsx
import { useState } from 'react';

export default function FixedUpdate() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setTimeout(() => {
      // 不再读取闭包里的 count，而是描述"基于最新值 +1"
      setCount(c => c + 1); // 3 秒后照样精确 +1，与点击时刻的快照无关
    }, 3000);
  };

  return <button onClick={handleClick}>3 秒后基于最新值 +1</button>;
}
```

- 诉求是"**读取执行时刻的最新值**"（弹窗场景）：普通函数式更新帮不上忙，需要 `useRef` 存最新值（ref 是跨渲染的同一间屋子，详见下一节 useRef 场景）——

```tsx
import { useEffect, useRef, useState } from 'react';

export default function FixedAlert() {
  const [count, setCount] = useState(0);
  // ref.current 是一个跨渲染共享的可变容器：所有渲染轮次里是同一个对象
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count; // 每次渲染后把最新值同步进 ref
  });

  const handleClick = () => {
    setTimeout(() => {
      // 执行时刻读 ref：永远拿到最新值
      alert('此刻最新的 count 是：' + countRef.current);
    }, 3000);
  };

  return (
    <div>
      <p>当前 count：{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={handleClick}>3 秒后显示最新 count</button>
    </div>
  );
}
```

**常见坑。** 症状：延迟逻辑里读到"点击那一刻"的旧值，且值越小（越早点击）越明显。根因：延迟回调闭住历史渲染的快照。修法：更新用函数式更新；读取用 ref 镜像最新值。额外提示：如果发现自己在到处写 ref 镜像，先回头想想是不是状态设计有问题（该提升的没提升、该下放的没下放）。

#### `setInterval` 里读旧值（两种解法：函数式更新 / ref）

**是什么。** `setInterval` 的回调**只会在 effect（或某次渲染）里创建一次**，之后无论组件重渲染多少次，执行的始终是那一个旧闭包里的回调——它读到的 state 永远定格在创建那一刻。这是三条陷阱中最"稳定复现"的一条，因为 interval 从不换屋子。

**复现代码。** 想做每秒 +1 的计时器：

```tsx
import { useEffect, useState } from 'react';

export default function StuckTimer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 回调只在挂载时创建一次，闭住的是"count = 0"那间屋子
    const id = setInterval(() => {
      setCount(count + 1); // 每一秒执行的都是：setCount(0 + 1) → count 永远是 1
    }, 1000);
    return () => clearInterval(id);
  }, []); // [] 意味着 interval 与它的回调只创建一次

  return <p>已运行 {count} 秒</p>;
}
```

运行结果：界面显示 0 → 1 → 1 → 1……永远卡在 1。逐帧拆解：

```text
挂载 render#1：count = 0；effect 创建 interval，回调闭住 count(=0)
第 1 秒：回调执行 setCount(0 + 1) → state 变 1 → render#2（显示 1）
         ⚠️ 但 effect 依赖是 []，不会因 count 变化而重跑——interval 还是旧的那个
第 2 秒：执行的仍是"旧回调"，它眼里的 count 还是 0 → setCount(0 + 1) → 还是 1
第 3 秒起：与第 2 秒完全相同，永远 1
```

**修法一：函数式更新（首选）。** 更新逻辑只需"最新值"时，把读取从闭包中拿掉：

```tsx
import { useEffect, useState } from 'react';

export default function FunctionUpdateTimer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + 1); // c 由 React 在每次处理更新时注入，永远是最新值
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>已运行 {count} 秒</p>;
}
```

改动只有一处，但含义深刻：回调不再**读取**任何渲染快照，它只**描述**一个变换。无论这个回调多老，变换作用在最新 state 上都是正确的。这就是"函数式更新是闭包陷阱标准解"的原因——它绕开了"读旧照片"，改成"委托 React 现算"。

**修法二：useRef 镜像最新值。** 当回调里要的不只是"更新"（比如要**读取**最新值参与判断、或调用接收最新值的函数）时：

```tsx
import { useEffect, useRef, useState } from 'react';

export default function RefTimer() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count); // 跨渲染同一间屋子

  // 每次渲染后，把最新 count 同步进 ref（这个 effect 没有依赖数组，每轮渲染都跑）
  useEffect(() => {
    countRef.current = count;
  });

  useEffect(() => {
    const id = setInterval(() => {
      // 读：从 ref 拿最新值（而不是闭包快照）
      const latest = countRef.current;
      // 写：同样用函数式更新（读到的 latest 仅用于展示/判断，不用于计算新值也可）
      setCount(latest + 1);
      console.log('这一秒开始时 count 是', latest); // 依赖最新值的日志，函数式更新做不到
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>已运行 {count} 秒</p>;
}
```

两种解法怎么选：

| | 函数式更新 | useRef 镜像 |
|---|---|---|
| 适用 | 更新逻辑只依赖最新 state 本身 | 回调需要**读取**最新值用于展示/判断，或要调用"必须拿最新值"的函数 |
| 改动量 | 一行 | 需要一个"每轮渲染同步"的 effect + ref |
| 心智负担 | 低（推荐默认） | 中（ref 更新不触发渲染，别把 ref 当 state 用，详见下一节 useRef 场景） |

顺带指出一个"看起来修好了"的第三种写法——把 `count` 加进依赖：

```tsx
  // ⚠️ 不推荐：值正确了，但每一秒都会"clear 旧 interval + 建新 interval"，
  // 计时被不断重置，间隔不再是稳定的 1 秒（且依赖任何其他 state 变化都会重建定时器）
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(id);
  }, [count]);
```

它确实能让数字走对（每轮渲染重建 interval，闭包换新），但代价是定时器寿命不再可控：interval 的语义从"每秒一次"退化成"从 count 最后一次变化起每秒一次"，并在任何导致渲染的 state 变化时被重置。定时器类"长寿资源"应配合函数式更新/ref 保持 `[]` 依赖，让资源生命周期与组件生命周期对齐。

**常见坑。** 症状一：计数器卡在 1 不动（上面的完整复现）。根因：interval 回调闭住首轮快照。修法：函数式更新。症状二：改用依赖 `[count]` 后数字正常，但计时间隔漂移、页面其他操作会重置计时节奏。根因：定时器随依赖频繁重建。修法：回到 `[]` + 函数式更新/ref。症状三：在 interval 回调里读取 props 或调用旧的处理函数（如"轮询接口直到满足某 props 阈值"）永远判断失败。根因：同源，闭住旧 props。修法：ref 镜像该值。

#### useEffect 捕获旧 props

**是什么。** effect 的 setup/cleanup 闭住的是"**本次执行它的那轮渲染**"的 props。当依赖数组没有如实申报某个被读取的 prop 时，effect 不再重跑，之后所有读取都停在旧 props 上——它与"事件处理器旧 state"同根同源，只是常量从 state 换成了 props，且受害者常常是**第三方库的连接/订阅**，更隐蔽。

**复现代码。** 聊天室连接：房间号换了，日志却一直打旧房间：

```tsx
import { useEffect, useState } from 'react';

// 模拟的第三方连接器：订阅外部系统（真实项目里是 socket.io-client 等）
function createConnection(roomId: string) {
  return {
    connect: () => console.log(`✅ 已连接到房间「${roomId}」`),
    disconnect: () => console.log(`❌ 已断开房间「${roomId}」`),
  };
}

export default function ChatRoom({ initialRoom }: { initialRoom: string }) {
  const [roomId, setRoomId] = useState(initialRoom);

  useEffect(() => {
    // setup 闭住"本轮渲染"的 roomId；依赖是 [] → 本 effect 及其闭包永不更新
    const conn = createConnection(roomId);
    conn.connect();
    return () => conn.disconnect();
  }, []); // ⚠️ 读取了 roomId 却未申报 → eslint 立刻警告 missing dependency

  return (
    <div>
      <p>当前选择房间：{roomId}</p>
      <select value={roomId} onChange={e => setRoomId(e.target.value)}>
        <option value="general">大厅</option>
        <option value="random">闲聊</option>
        <option value="music">音乐</option>
      </select>
    </div>
  );
}
```

运行：挂载连接"大厅"→ 下拉切到"音乐"→ 页面文字显示"音乐"，但控制台**没有任何新的连接日志**，消息仍从"大厅"涌来。更糟的是卸载时 `disconnect` 的也是"大厅"——如果内部真的持有连接，"音乐"从未连过，而用户以为自己在音乐房间。

**机制解释。** 依赖 `[]` 声明"此 effect 的同步条件与任何响应式值无关，永不重跑"。React 尊重声明：切换房间引发的重渲染只是又开了间新屋子（新 `roomId`），但 effect 判断 `[]` 与 `[]` 相等，不清理、不重跑——**仍在外部世界里活着的是首轮那间屋子里的连接**。与事件处理器旧 state 完全同构：长寿回调 + 未申报依赖 = 定格的快照。

**修法：如实申报依赖，让"断开旧 + 连接新"成对发生。**

```tsx
  useEffect(() => {
    const conn = createConnection(roomId);
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]); // roomId 变化：先 cleanup（断开旧房间）→ 再 setup（连接新房间）
```

切换到"音乐"后控制台输出：

```text
✅ 已连接到房间「大厅」        ← 挂载
❌ 已断开房间「大厅」          ← roomId 变化，先清理
✅ 已连接到房间「音乐」        ← 再同步
```

这正是"effect = 与外部系统保持同步"心智模型的兑现：props 变化意味着外部系统参数过时，正确的反应不是硬撑，而是断开重连。绝大多数"effect 旧 props"问题的正解就是**补依赖**；`exhaustive-deps` 警告（第 4 条）在复现代码里已经把问题指出来了——从"点灯"到"修灯"只差一行。

少数场景确实要"订阅一次、但读取最新值"（例如一个全局级单例订阅，不希望随 props 重订），才使用 ref 镜像方案：

```tsx
import { useEffect, useRef } from 'react';

// 订阅只建立一次，但回调里读取的是最新 roomId
export function useGlobalBusOnce(roomId: string, onEvent: (msg: string) => void) {
  const latest = useRef({ roomId, onEvent });

  useEffect(() => {
    // 每轮渲染把最新的 props 刷进 ref（无依赖数组的 effect：每次渲染后都执行）
    latest.current = { roomId, onEvent };
  });

  useEffect(() => {
    const handler = (msg: string) => {
      // 执行时从 ref 取"此刻最新"的值，而不是订阅建立那一刻的快照
      const { roomId: room, onEvent: emit } = latest.current;
      console.log(`房间 ${room} 收到：${msg}`);
      emit(msg);
    };
    window.addEventListener('bus-message', handler as EventListener);
    return () => window.removeEventListener('bus-message', handler as EventListener);
  }, []); // 订阅本身与组件生命周期一致，只建立一次
}
```

判断口径：**外部系统应该跟着值换（连接、请求、查询参数）→ 补依赖重跑；外部系统不该换、只有回调用值 → ref 镜像**。

**常见坑。** 症状一：切换筛选/房间/用户后，数据、日志、连接"没跟上"。根因：effect 依赖缺失，闭住旧 props。修法：补依赖（首选），例外场景用 ref 镜像。症状二：以为 `[]` 是"componentDidMount 的现代写法"，随手把所有一次性逻辑塞进去。根因：把 effect 当生命周期钩子，而 `[]` 的真实语义是"永不重新同步"。修法：按"这个 effect 同步的外部系统，参数会不会变"来决定依赖；参数会变就必须申报。症状三：cleanup 里引用旧 props 做清理（如 `disconnect(roomId)`），以为清理"拿错了房间"。根因：cleanup 与 setup 闭的是同一间屋子——**setup 连的哪个房间，cleanup 断的就是哪个房间，这是配对正确的表现**，不是 bug。修法：保持 setup/cleanup 同源；不要在 cleanup 里另外读 ref"最新值"去断连（会断错对象）。

---

至此，useState 的更新机制、useEffect 的同步与清理、闭包陷阱的快照模型三条主线合拢成一个闭环：**state 是渲染的快照，setState 是请求一次新渲染，effect 是渲染后与外部世界的受控握手，而一切"旧值"都是"长寿回调握着旧屋子的钥匙"**。带着这套模型进入下一节 useRef 场景——你会看到 ref 正是 React 为"跨渲染同一间屋子"提供的官方容器——以及随后的 useMemo/useCallback（用缓存换引用稳定）与自定义 Hook。本阶段收尾的 TodoMVC 作业会把这些知识全部压进一个真实应用里；日后排查"无限重渲染、闭包旧值、竞态"这类高频 bug 时（见阶段 6 调试方法论），本章就是你的索引。

### useRef 场景

上一节的闭包陷阱里，`ref` 已经以"解药"的身份出场过一次：`setInterval` 里读旧 state，除了函数式更新，另一种解法就是把最新值放进 ref。这一节系统性讲 ref 的三类用途，以及它和 state 的本质区别。先给一句总纲，后面所有内容都是它的展开：

> **state 是渲染的数据源；ref 是 React 渲染模型之外的储物间。** 放进 state 的东西必须"值得一次重渲染"，其余的（DOM 节点、定时器句柄、第三方实例、上一次的值）都该放 ref。

React 官方对 ref 的定位是"逃生舱（escape hatch）"：React 的声明式模型覆盖不到的需求——命令式操作 DOM、跨渲染持有可变数据——通过 ref 这条官方通道解决，而不是绕过 React 直接操作全局。

#### 1. DOM 操作：聚焦、滚动定位、测量尺寸

**是什么**

`useRef(initialValue)` 返回一个形如 `{ current: T }` 的普通 JS 对象，React 保证在组件整个生命周期内返回的是**同一个对象**。它有两类用法：保存任意可变值（第 2、3 条讲）；把 ref 对象作为 `ref` 属性挂到 JSX 元素上——React 会在该元素挂载完成后把**真实 DOM 节点**写进 `ref.current`，卸载时置回 `null`。本条讲第二种。

**为什么需要**

React 是声明式 UI："UI = f(state)"，你声明状态与模板，DOM 由 React 全权管理。但有一类需求天然是**命令式**的：聚焦输入框（`focus()`）、滚动到某个元素（`scrollIntoView()`）、读取元素实时尺寸（`getBoundingClientRect()`）——浏览器只提供了这些命令式 API，必须拿到真实节点才能调用。直接 `document.querySelector` 去查 React 渲染出来的节点是反模式：选择器脆弱（改个 className 就断）、可能命中条件渲染之外的元素、并且绕过了 React 对 DOM 的所有权（节点被替换后你手里的引用就失效了）。ref 是 React 提供的官方通道："节点归 React 管，但我借出来操作一下"。

**怎么做（机制分步）**

1. 声明容器：`const inputRef = useRef<HTMLInputElement>(null)`；
2. 绑定到 JSX：`<input ref={inputRef} />`；
3. 首次渲染**提交**后，React 执行 `inputRef.current = <input 真实节点>`；
4. 组件卸载时，React 执行 `inputRef.current = null`；
5. 你在**事件处理器或 useEffect** 里通过 `inputRef.current` 拿到节点做命令式操作。

两个关键时序必须记住：首次渲染函数执行期间 `current` 一直是 `null`（DOM 还没创建）；`current` 的写入发生在提交阶段之后——所以任何"挂载后立刻用节点"的逻辑，天然属于 `useEffect` 的领地。

**代码示例（demo 1：自动聚焦 + 手动聚焦）**

```tsx
import { useEffect, useRef } from 'react';

export default function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // effect 在提交后执行，此时 DOM 一定存在，focus 是安全的
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <input ref={inputRef} placeholder="挂载后我会自动聚焦" />
      {/* 事件处理器里访问 DOM 同样安全：事件发生时页面必然已提交 */}
      <button onClick={() => inputRef.current?.focus()}>失去焦点后点我重新聚焦</button>
    </div>
  );
}
```

**代码示例（demo 2：表单校验失败时滚动定位到第一个错误字段）**

这是长表单场景的经典需求：提交失败时页面有十几个字段，不能让用户自己找红字。

```tsx
import { useRef, useState, type FormEvent } from 'react';

interface FieldErrors {
  name: string | null;
  email: string | null;
  age: string | null;
}

const NO_ERRORS: FieldErrors = { name: null, email: null, age: null };

export default function ScrollToErrorForm() {
  // 三个字段各一个 ref，用于"滚动定位 + 聚焦"
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const next: FieldErrors = {
      name: String(fd.get('name')).trim() ? null : '姓名必填',
      email: /^\S+@\S+\.\S+$/.test(String(fd.get('email'))) ? null : '邮箱格式不正确',
      age: Number(fd.get('age')) >= 18 ? null : '未满 18 岁不能注册',
    };
    setErrors(next);

    // 按字段顺序找到第一个出错的 ref，滚动到它并聚焦
    const firstErrorRef = next.name
      ? nameRef
      : next.email
        ? emailRef
        : next.age
          ? ageRef
          : null;
    if (firstErrorRef?.current) {
      firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorRef.current.focus({ preventScroll: true }); // 已在平滑滚动，聚焦时别再瞬移
    }
  };

  return (
    // 故意把表单拉长，制造"错误字段在视口外"的效果
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 56 }}>
      <label>
        姓名 <input name="name" ref={nameRef} />
        {errors.name && <span role="alert"> {errors.name}</span>}
      </label>
      <label>
        邮箱 <input name="email" ref={emailRef} />
        {errors.email && <span role="alert"> {errors.email}</span>}
      </label>
      <label>
        年龄 <input name="age" type="number" ref={ageRef} />
        {errors.age && <span role="alert"> {errors.age}</span>}
      </label>
      <button type="submit">提交（留空试一试滚动定位）</button>
    </form>
  );
}
```

**代码示例（demo 3：测量尺寸——手动测量 + ResizeObserver 持续监听）**

`getBoundingClientRect()` 返回的是"调用那一刻"的尺寸快照，不会自动更新。要持续感知尺寸变化，标准做法是 `ResizeObserver`（观察元素自身尺寸，窗口变化、内容增长、字体加载都能捕捉到）。

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export default function MeasureDemo() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [lines, setLines] = useState(1); // 内容行数，用来"撑大"盒子

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return; // 挂载前/卸载后访问必须判空
    const rect = el.getBoundingClientRect(); // 视口坐标系下的位置与尺寸（小数精度）
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
  }, []);

  useEffect(() => {
    measure(); // 挂载后先测一次
    // resize 事件只能捕捉"窗口引起"的尺寸变化；
    // 内容展开、字体加载等引起的变化要靠 ResizeObserver
    const ro = new ResizeObserver(() => measure());
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect(); // 不 disconnect 会持有已卸载节点的引用，造成泄漏
  }, [measure]);

  return (
    <div style={{ padding: 16 }}>
      <div
        ref={boxRef}
        style={{ width: '60%', padding: 16, background: '#282c34', color: '#fff' }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <p key={i}>第 {i + 1} 行：拖动窗口宽度、或点下面的按钮，观察尺寸读数</p>
        ))}
      </div>
      <p>
        当前尺寸：{size.width} × {size.height} px
      </p>
      <button onClick={() => setLines((n) => n + 1)}>加一行（触发 ResizeObserver）</button>
      <button onClick={measure}>手动测量（getBoundingClientRect 快照）</button>
    </div>
  );
}
```

**常见坑**

- 坑 1：`Cannot read properties of null (reading 'focus')`。
  - 症状：渲染函数体内直接调用 `ref.current.focus()` 报空指针。
  - 根因：首次渲染执行期间 DOM 尚未创建，`current` 是 `null`；或该元素是条件渲染的，此刻根本没有挂载。
  - 修法：命令式操作一律放进事件处理器或 `useEffect`，并用 `?.` 判空；条件渲染元素的存在性用 state 驱动，先保证"该渲染"，再保证"可操作"。
- 坑 2：渲染期间读 `ref.current` 参与渲染，首帧显示 0、第二帧才正确。
  - 症状：`<div>{boxRef.current?.offsetWidth ?? 0}</div>` 首渲染为 0。
  - 根因：渲染期间读到的 `current` 是**上一次提交**写入的值（首次渲染就是 `null`），比"本次将要呈现的 DOM"旧一拍；渲染期间测量本质是把命令式读取混进了声明式渲染。
  - 修法：测量放 effect，结果存进 state，由 state 驱动渲染（demo 3 正是这个结构）。
- 坑 3：回调 ref 打印出一次 `null`。
  - 症状：`ref={(el) => console.log(el)}` 输出先节点后 `null`（或反之多出一次 null）。
  - 根因：元素卸载时 React 会以 `null` 调用回调 ref 做清理；React 18 中若回调是内联函数，每次重新渲染也会先以 `null` 调用旧函数、再以节点调用新函数。
  - 修法：回调 ref 内部按"节点 / null"两条分支写逻辑（null 分支做清理），或把回调 ref 定义成 `useCallback` 稳定引用，避免无谓的 detach/attach。

#### 2. 保存不触发渲染的值（定时器 id、上一次值 `usePrevious`）

**是什么**

`ref.current` 可以直接读写，写入**不会触发任何重渲染**。所以 ref 适合存放"只是记录、不驱动 UI"的数据：定时器 id、动画帧 id、订阅的取消函数、上一次渲染的值。`useState` 的 setter 则相反——每次调用都调度一次重渲染。

**为什么需要**

先看反例：把定时器 id 放进 state 会怎样？`setTimerId(id)` 触发一次毫无意义的重渲染（id 变了 UI 也没东西可显示）；更麻烦的是 setState 是异步调度的，你在当前渲染里读 `timerId` 拿到的还是旧值，没法立即用它 `clearInterval`。而 `ref.current = id` 立即可读、零渲染成本。判断标准就一条：**这个值变了，UI 需要变吗？需要 → state；不需要 → ref。**

**ref 与 state 的本质区别**（这张表值得抄进笔记）：

| 维度 | state | ref |
|---|---|---|
| 写入方式 | `setState(x)`，调度更新 | `ref.current = x`，直接赋值 |
| 写入后立即可读？ | 否（当前渲染仍读到旧值） | 是 |
| 触发重渲染 | 是 | 否 |
| 渲染期间读它 | 安全且应当（它就是渲染输入） | **不要**（见下文规则） |
| 典型内容 | 列表数据、表单值、开关 | DOM 节点、定时器 id、实例、旧值 |

**"渲染期间别读写 ref"的规则与原因**：渲染函数应当是纯函数——同样的 props/state 输入应产出同样的 JSX。`ref.current` 是可变的共享变量，在渲染期间读写它会破坏这个契约：(1) StrictMode 会双调用渲染函数，若渲染期间有写入，两次结果可能不同；(2) 并发渲染下一次渲染可能被丢弃重来，期间对 ref 的写入会污染这一次"作废"的渲染；(3) 渲染期间读到的永远是"上次提交"的值，比你以为的旧一拍。所以规则是：**读、写 ref 都只发生在事件处理器和 effect 里；渲染期唯一例外是首次初始化（`if (ref.current === null) ref.current = create()`）。**

**怎么做（机制分步）+ 代码示例（demo：跨事件共享定时器 id 的秒表）**

```tsx
import { useEffect, useRef, useState } from 'react';

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  // 定时器 id 只是"句柄"，UI 不展示它 → 放 ref；放 state 会多一次无意义渲染
  const timerRef = useRef<number | null>(null);

  const start = () => {
    if (timerRef.current !== null) return; // 已在计时，防止叠加第二个定时器
    timerRef.current = window.setInterval(() => {
      // 函数式更新：不依赖外部的 elapsed，天然免疫闭包陷阱（上一节专题的解法一）
      setElapsed((ms) => ms + 100);
    }, 100);
  };

  const stop = () => {
    if (timerRef.current === null) return;
    window.clearInterval(timerRef.current);
    timerRef.current = null; // 置空，"开始"才能再次生效
  };

  // 兜底：组件卸载时必须停表，否则定时器永远空转、闭包里的 setElapsed 变成无效功
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(1)} 秒</p>
      <button onClick={start}>开始</button>
      <button onClick={stop}>暂停</button>
      <button
        onClick={() => {
          stop();
          setElapsed(0);
        }}
      >
        重置
      </button>
    </div>
  );
}
```

什么时候必须用 ref 而不是 effect 局部变量：如果定时器"在 effect 里开、在同一个 effect 的 cleanup 里关"，id 放 effect 局部变量就够了；一旦像上面这样"开始/暂停分属两个事件处理器"，id 必须跨函数共享——这就是 ref 的领地。

**代码示例（`usePrevious` 最小版）**

保存"上一次渲染的值"是 ref 的招牌应用，最小实现只要 6 行（完整讨论与另一种"渲染期比较"写法见本章自定义 Hook 一节的 usePrevious）：

```ts
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value; // 提交之后才更新 → 返回值恰好是"上一次提交"的值
  }); // 故意不写依赖数组：每次提交都要同步
  return ref.current;
}
```

**常见坑**

- 坑 1：改了 `ref.current`，界面纹丝不动。
  - 症状：期待 UI 变化，但没有任何反应。
  - 根因：ref 不是响应式的，这是设计而非 bug。
  - 修法：需要驱动 UI 的数据用 state；若"实例内部状态"（如撤销栈的 canUndo）确实存在 ref 里，就必须在操作后手动触发一次渲染（下一节的 `setVersion` 技巧）。
- 坑 2：渲染函数里读 `ref.current` 得到"上一拍"的值。
  - 症状：显示的计数永远差一拍 / 首帧是 undefined。
  - 根因：渲染期间读 ref 读到的是上次提交的快照。
  - 修法：在 effect/事件里读，或改用 state。
- 坑 3：`useRef(new Something())` 每次渲染都白白 new 一个对象。
  - 根因：`useRef` 的参数**每次渲染都会求值**，只是求值结果被丢弃。
  - 修法：惰性初始化模式，见下一条。

#### 3. 跨渲染保存可变实例

**是什么**

`ref.current` 可以放任意对象：自己写的类实例、`Map`/`Set`、第三方库的控制器。React 完全不干涉它的内容，也**不会在卸载时帮你清理**——清理是 effect cleanup 的责任。

**为什么需要**

类实例天生可变、有内部状态，硬塞进 state 很荒谬：每次变更都得 `new` 一个全新实例副本（昂贵且丢失内部状态）；而有些实例必须"从生到死是同一个"才有意义（订阅器、撤销栈、缓存表）。ref 恰好承诺"整个生命周期同一个容器"，且允许你原地修改。

**怎么做（机制分步）**

1. 声明可空容器：`useRef<SomeClass | null>(null)`；
2. 首渲染惰性初始化：`if (ref.current === null) ref.current = new SomeClass()`——判断写在渲染期是官方认可的例外（仅初始化，无副作用外溢）；
3. 事件/效果中通过 `ref.current` 调用实例方法；
4. 若实例持有外部资源（订阅、observer、网络连接），在 effect cleanup 里显式释放；
5. 若 UI 依赖实例的内部状态（如 `canUndo`），在每次操作后手动 bump 一个 state 触发渲染。

**代码示例（demo：撤销/重做——可变实例与 state 的混合建模）**

```tsx
import { useRef, useState } from 'react';

/** 撤销/重做栈：纯可变实例，不驱动 UI → 放 ref 的标准候补 */
class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];

  /** 记录一次变更：把"变更之前"的值压入历史 */
  record(previous: T): void {
    this.past.push(previous);
    this.future = []; // 新动作会"封死"重做分支（与图形编辑器行为一致）
  }
  /** 撤销：传入当前值（将被记住以便重做），返回要恢复的旧值 */
  undo(current: T): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(current);
    return prev;
  }
  /** 重做：传入当前值，返回要恢复的值 */
  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    return next;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
}

export default function UndoableCounter() {
  const [count, setCount] = useState(0); // 数据本体：驱动 UI → state

  // 惰性初始化：只有首渲染真正 new，之后复用同一个实例
  const historyRef = useRef<HistoryStack<number> | null>(null);
  if (historyRef.current === null) {
    historyRef.current = new HistoryStack<number>();
  }
  const history = historyRef.current;

  // 实例内部状态（canUndo/canRedo）变化不触发渲染 → 用版本号手动"通知"React
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const increment = () => {
    history.record(count); // 先记"变更前"的值
    setCount((c) => c + 1);
    refresh(); // 不 refresh 的话，撤销按钮的 disabled 不会立刻更新
  };

  const undo = () => {
    const prev = history.undo(count);
    if (prev !== null) {
      setCount(prev);
      refresh();
    }
  };

  const redo = () => {
    const next = history.redo(count);
    if (next !== null) {
      setCount(next);
      refresh();
    }
  };

  // version 本身不展示也要"用"一下，避免 TS 报未使用（也可以用它渲染调试信息）
  return (
    <div>
      <h2>{count}</h2>
      <button onClick={increment}>+1</button>
      <button onClick={undo} disabled={!history.canUndo}>
        撤销
      </button>
      <button onClick={redo} disabled={!history.canRedo}>
        重做
      </button>
      <p>渲染版本 v{version}：实例内部状态的变化必须靠它推动</p>
    </div>
  );
}
```

这个 demo 浓缩了"ref 存实例"的全部要点：数据本体（count）在 state、可变附件（历史栈）在 ref、实例内部状态影响 UI 时手动 bump 渲染。

另一个常见形态是用 `Map` 收集列表项 DOM（回调 ref 写法）：

```tsx
import { useRef } from 'react';

interface Item {
  id: number;
  title: string;
}

export default function ItemRegistry({ items }: { items: Item[] }) {
  // 跨渲染保存的 Map：id → 真实 DOM 节点，供"跳转到某项"等命令式操作使用。
  // 用上面坑 3 的惰性初始化模式，而不是 useRef(new Map())——后者每次渲染都白白 new
  const nodeMapRef = useRef<Map<number, HTMLLIElement> | null>(null);
  if (nodeMapRef.current === null) {
    nodeMapRef.current = new Map(); // 只在首次渲染时创建
  }

  const scrollTo = (id: number) => {
    const el = nodeMapRef.current!.get(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div>
      <button onClick={() => scrollTo(items[items.length - 1].id)}>跳到最后一项</button>
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            ref={(el) => {
              // 回调 ref：挂载时 el 是节点，卸载时是 null（见上一节的坑 3）
              if (el) nodeMapRef.current.set(item.id, el);
              else nodeMapRef.current.delete(item.id);
            }}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**常见坑**

- 坑 1：`useRef(new Xxx())` 的隐性浪费。
  - 症状：Profiler 里渲染耗时莫名偏高，或构造函数有副作用（打日志/发请求）被重复执行。
  - 根因：参数每次渲染都求值，只有第一次的结果被保留。
  - 修法：惰性初始化三行套式（`null` 容器 + `if (ref.current === null)` + 赋值）。
- 坑 2：实例在组件卸载后仍然占着外部资源。
  - 症状：反复挂载/卸载组件后，订阅数只增不减、内存上涨。
  - 根因：React 只置空 `ref.current`，不会调用实例的任何销毁方法。
  - 修法：`useEffect(() => () => { instance.dispose(); }, [])`，把释放写进 cleanup。
- 坑 3：按钮状态（disabled 等）依赖实例内部状态但不刷新。
  - 症状：撤销栈明明空了，按钮还能点。
  - 根因：`ref.current` 内部变化不触发渲染。
  - 修法：操作后 `setVersion(v => v + 1)` 强制一次渲染；或者反过来审视设计——如果这个内部状态频繁驱动 UI，也许它该直接用 state 建模。

### useMemo / useCallback / memo

先立主线，三个 API 讲的是同一件事的三面：

> React 的默认规则是**父组件渲染时，所有子组件无论 props 变没变都会重新渲染**（重新执行函数）。要跳过这层"连坐"，用 `memo` 给子组件加浅比较；而浅比较能否通过，取决于 props 的**引用相等性**；要保住引用，靠 `useMemo`/`useCallback`。

先厘清"重渲染"的成本：重新执行组件函数 ≠ 重新创建 DOM ≠ 用户可见变化，React 还要 diff 决定是否动 DOM。所以**多数重渲染是便宜的**，只有渲染本身很贵（大列表、重计算、大量 diff）时才值得干预——这是第 3 条"过度优化的代价"的伏笔。

#### 1. 引用相等性问题：什么时候子组件会无谓重渲染

**是什么**

JS 的对象、数组、函数都是引用类型：`{a:1} !== {a:1}`，每次求值字面量都是新分配。`memo(Comp)` 让 React 在渲染 Comp 前先用 `Object.is` 逐个浅比较新旧 props，**全部相等才跳过渲染**。而父组件每次渲染时写在 JSX 里的 `style={{...}}`、`items={[...]}`、`onChange={() => ...}` 都是新引用——浅比较必然失败，memo 形同虚设。

**为什么需要**

理解这条，你就理解了"为什么我加了 memo 还是在渲染"这个高频疑问的大半。它也解释了 useCallback/useMemo 存在的根本理由：**不是为了"缓存计算"这个微观收益，而是为了维持引用稳定，让下游的 memo 链条成立。**

**怎么做（机制分步）**

1. 父组件 setState → 父函数重新执行；
2. JSX 里的对象/数组/函数字面量**每次求值都分配新引用**；
3. React 到达 memo 包裹的子组件，逐项执行 `Object.is(prevProp, nextProp)`；
4. 遇到引用类型：两个不同地址的对象 → `false`；
5. 只要有任意一项不相等 → 照常渲染子组件。原始类型（string/number/boolean）按值比较，内容相同即通过。

**代码示例（完整演示：同一组件的三个实例，memo 分别生效/失效）**

```tsx
import { memo, useState, type CSSProperties } from 'react';

interface AvatarProps {
  url: string;
  style?: CSSProperties;
  onReport?: () => void;
}

// memo 包裹：props 浅比较全等才跳过渲染
const Avatar = memo(function Avatar({ url, style, onReport }: AvatarProps) {
  // 用 url 尾号区分是哪一个实例在渲染
  console.log('Avatar 渲染：', url.slice(-2));
  return (
    <span>
      <img src={url} alt="头像" style={style} width={40} height={40} />
      {onReport && <button onClick={onReport}>举报</button>}
    </span>
  );
});

export default function MemoFailDemo() {
  const [count, setCount] = useState(0);

  const style = { borderRadius: '50%' }; // 反例：每次渲染都是新对象
  const onReport = () => console.log('举报'); // 反例：每次渲染都是新函数

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* count 与三个头像毫无关系，但它的变化会触发父渲染 */}
      <button onClick={() => setCount((c) => c + 1)}>无关计数：{count}</button>

      {/* ① 生效：props 只有字符串，值没变 → 浅比较通过 → 不再渲染 */}
      <Avatar url="https://picsum.photos/40" />

      {/* ② 失效：style 每次都是新引用 → Object.is(旧 style, 新 style) === false */}
      <Avatar url="https://picsum.photos/41" style={style} />

      {/* ③ 失效：onReport 每次都是新函数 */}
      <Avatar url="https://picsum.photos/42" onReport={onReport} />
    </div>
  );
}
```

反复点按钮、观察控制台：只有 ① 安静，② ③ 每次都打印"Avatar 渲染"。修复方式（预览下一节）：`style` 若真是常量就提到组件外；`onReport` 用 `useCallback` 包住。

结论速查：传**原始类型** → memo 天然有效；传**对象/数组/函数字面量** → memo 失效；`children` 里写了 JSX 内容 → 同样每次是新元素引用 → 失效。

**常见坑**

- 坑 1："我加了 memo 怎么还在渲染？"
  - 症状：子组件照常重渲染。
  - 根因：props 里存在每次都变的引用（内联对象/函数/JSX children）。
  - 修法：稳定引用（见第 2 条），或把 props 拆成原始类型传下去（传 `width: 40` 而不是 `style: {width: 40}`）。
- 坑 2：把"必要渲染"误判为"memo 失效"。
  - 症状：props 里确实有父组件的 state 值，值变了子组件渲染。
  - 根因：memo 只拦截"props 没变"的渲染；props 真变了，渲染是**应该的**。
  - 修法：用 DevTools Profiler 的 "Why did this render?" 区分原因（props changed / parent rendered），别看见渲染就想优化。

#### 2. `memo` + `useCallback` 配合生效的条件

**是什么**

让 memo 真正生效的完整条件：**在"逻辑上没变"的那些渲染之间，传给 memo 组件的每一个 prop 的引用都必须不变**。函数 props 用 `useCallback`，对象/数组 props 用 `useMemo`，常量提到模块顶层，children 保持稳定。

**为什么需要**

`useCallback(fn, deps)` 的行为：deps 逐项 `Object.is` 比较，没变就返回**同一个函数对象**（实现上等价于 `useMemo(() => fn, deps)`）；deps 变了才换新引用——注意这是正确行为：回调闭包的内容真的变了。`useMemo(() => value, deps)` 同理作用于任意计算结果。二者合起来，就是把"引用稳定性"显式管理起来。

**怎么做（条件清单 + 各类 props 的稳定方法）**

| prop 形态 | 稳定引用的办法 |
|---|---|
| 函数 | `useCallback(fn, deps)` |
| 对象 / 数组 / 派生数据 | `useMemo(() => ({ ... }), deps)`；真常量直接提到模块顶层 |
| 空集合兜底（如 `items={[]}`） | 模块级 `const NO_ITEMS: Item[] = []`，天生稳定 |
| JSX children | 作为"元素"传入且用 `useMemo` 稳定；或改用 children-as-props 模式（阶段 6 展开） |
| 自定义 Hook 返回的函数/对象 | Hook 内部就包好 `useCallback`/`useMemo`（下一节的 8 个 hook 全部示范） |

**代码示例（完整配合：无关状态变化时，memo 子组件真正安静）**

```tsx
import { memo, useCallback, useMemo, useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}
interface TodoFilter {
  keyword: string;
  onlyUndone: boolean;
}

const BASE_ITEMS: Todo[] = [
  { id: 1, text: 'Learn React', done: false },
  { id: 2, text: 'Learn refs', done: true },
];

const TodoList = memo(function TodoList({
  items,
  filter,
  onToggle,
}: {
  items: Todo[];
  filter: TodoFilter;
  onToggle: (id: number) => void;
}) {
  console.log('TodoList 渲染（点"无关计数"时这行不应出现）');
  const visible = items.filter(
    (t) => (!t.done || !filter.onlyUndone) && t.text.includes(filter.keyword),
  );
  return (
    <ul>
      {visible.map((t) => (
        <li key={t.id} onClick={() => onToggle(t.id)}>
          [{t.done ? 'x' : ' '}] {t.text}
        </li>
      ))}
    </ul>
  );
});

export default function MemoWorkingDemo() {
  const [count, setCount] = useState(0); // 无关状态：制造"无谓渲染"的压力源
  const [onlyUndone, setOnlyUndone] = useState(false);
  const keyword = 'Learn';

  // ① 数组：依赖为空（演示数据是常量），引用永远稳定
  const items = useMemo(() => BASE_ITEMS, []);
  // ② 对象：依赖 keyword/onlyUndone，逻辑变了引用才变
  const filter = useMemo<TodoFilter>(() => ({ keyword, onlyUndone }), [keyword, onlyUndone]);
  // ③ 函数：依赖为空 → 引用稳定；内部用函数式更新，不依赖外部 state
  const onToggle = useCallback((id: number) => {
    console.log('toggle（演示版，真实项目里是 setItems 更新）', id);
  }, []);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>无关计数：{count}</button>
      <button onClick={() => setOnlyUndone((v) => !v)}>只看未完成：{String(onlyUndone)}</button>
      <TodoList items={items} filter={filter} onToggle={onToggle} />
    </div>
  );
}
```

点"无关计数"：`TodoList 渲染` 不再出现——memo 链条真正闭合。点"只看未完成"：`filter` 引用变化 → 正常渲染（这是必要渲染）。

`memo` 还接受第二个参数自定义比较函数：`memo(Comp, areEqual)`，`areEqual(prevProps, nextProps)` 返回 **true 表示"相等、跳过渲染"**——与 `Array.filter` 的语义相反，极易写反；仅当需要对"深层相等进行精细化控制"时才用（更好的做法通常是重构 props 让浅比较够用）。

**常见坑**

- 坑 1：只 memo 了子组件，props 原样透传。
  - 症状：包了 memo 没效果。
  - 根因：链条上任意一个 prop 引用不稳定，浅比较就失败；memo 是"父传的每个 prop 都稳定"的与运算。
  - 修法：按上面的表格逐项排查。
- 坑 2：`useCallback` 的引用"莫名其妙"变了。
  - 症状：依赖里有对象/函数/每次新建的字面量，deps 项本身就是新引用。
  - 根因：deps 逐项浅比较，依赖不稳定则 useCallback 形同虚设。
  - 修法：把依赖也稳定化（再往上一层 useCallback/useMemo），这是"稳定引用需要自上而下贯穿"的原因，也是自定义 Hook 应当内部消化稳定性的原因。
- 坑 3：自定义比较函数写反。
  - 症状：加 `memo(Comp, (a, b) => a.id === b.id)` 后数据更新 UI 不动。
  - 根因：比较函数返回 true 意为"视为相等 → 跳过"，返回 false 才渲染；`a.id === b.id` 只覆盖了 id 一个维度。
  - 修法：确认所有"应触发渲染"的字段都参与比较并返回 false，或干脆放弃自定义比较、回归浅比较。

#### 3. **过度优化的代价**：不要默认全加

**是什么**

`useMemo`/`useCallback`/`memo` 不是免费的：每次渲染要维护 deps 数组并逐项比较、缓存占内存、代码可读性下降；更重的是**依赖数组写错引入"陈旧值"bug**——这类 bug 比性能问题难查得多。React 官方文档因此把它们定位为"性能优化手段而非语义保证"：未来版本在内存紧张时可能丢弃缓存重建，你的代码必须在没有记忆化时依然正确。

**什么时候值得加**（满足其一再动手）：

- Profiler 证明该组件/子树渲染确实昂贵（大列表、昂贵计算、复杂 DOM diff）；
- 存在 memo 化的子组件，需要父侧供给稳定引用（第 2 条的配合链条）；
- 一个昂贵计算在无关渲染中被反复执行（`useMemo` 的本义场景）。

**什么时候反而更慢**：

- 子组件极轻：比较 props 的成本约等于甚至高于直接渲染的成本，memo 纯付学费；
- props 每次都变：记忆永远 miss，白付"比较 + 存缓存"的成本；
- 到处 `useCallback` 小函数：函数对象创建本身极便宜， deps 维护与代码噪音的代价可能超过收益。

**怎么做（用 Profiler 验证再优化）**

1. 安装 React DevTools 浏览器扩展，切到 Profiler 面板；
2. 打开设置齿轮，勾选 "Highlight updates when components render" 与 "Record why each component rendered..."（后者能回答 Why did this render?）；
3. 点录制按钮 → 执行目标交互（如快速输入搜索词）→ 停止；
4. 读结果：顶部每次提交（commit）一根柱子，颜色越黄越耗时；点击任意组件看"为什么渲染"（Props changed / The parent rendered / State changed / Hooks changed）；
5. 加 memo 前后各录一次，对比目标组件的渲染次数与耗时，确认收益为正再保留代码。

也可以在代码里用 `<Profiler>` 组件埋点（无需扩展，适合自动采集）：

```tsx
import { Profiler, useState, type ReactNode } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
): void {
  // actualDuration：本次提交中该组件及其子树的实际渲染耗时（毫秒）
  console.log(`[Profiler ${id}] ${phase}，耗时 ${actualDuration.toFixed(2)}ms`);
}

export default function ProfilerDemo({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  return (
    <Profiler id="search-area" onRender={onRenderCallback}>
      <button onClick={() => setTick((t) => t + 1)}>触发更新：{tick}</button>
      <div>{children}</div>
    </Profiler>
  );
}
```

**经验法则**：默认不优化；先做结构性改善——状态下放（只影响子树的状态放子树里）、组件拆分、children 作为 props 传入（这些在阶段 6 系统展开）；出现可感知卡顿后用 Profiler 拿证据，只对热点路径加 memo；把"稳定引用"内聚到自定义 Hook 内部对外输出（下一节的 8 个 hook 全部遵守这一纪律），调用方就不必层层 useCallback。

### 自定义 Hook（从模仿到手写）

手写以下 Hooks 并写 demo 验证：`useFetch`、`useDebounce`、`useLocalStorage`、`useToggle`、`useWindowSize`、`useClickOutside`、`usePrevious`、`useInterval`

> 建议对照 [ahooks](https://ahooks.js.org/) 源码校对实现。

先把规则立清楚，否则写出来的东西会"看起来是 hook、用起来全是雷"：

- **是什么**：自定义 Hook = 名字以 `use` 开头、内部调用了其他 Hook 的普通函数。它复用的是**状态逻辑**而不是状态本身——每个组件调用它，都会得到一套完全独立的 state/ref 实例。
- **为什么需要**：组件里"三态请求、防抖、持久化、点外关闭"这类**带副作用的状态逻辑**无法用普通函数复用（函数里不能调 Hook），自定义 Hook 是 React 唯一的官方复用单元。
- **两条铁律**：只在函数组件或自定义 Hook 的**顶层**调用（不能放进 if/循环/回调里）；`eslint-plugin-react-hooks` 会强制检查，写的时候不要关掉它。
- **工程纪律**：对外返回的函数/对象必须包 `useCallback`/`useMemo`——上一节刚讲过，调用方的 memo 链条能不能闭合，取决于你吐出去的引用稳不稳定。

下面八个 hook，每个都按"解决什么场景 → 问题复现 → 实现 → 使用 demo → 常见坑"展开。

#### useFetch：把"请求三态 + 竞态取消 + 手动重发"收进一个函数

**解决什么场景**：每个数据页面都要 loading / error / data 三态样板、都要处理快速切换参数时的竞态、都想要一个"重试"按钮——把这些一次性收进 `useFetch(url)`。

**问题复现**（没有它时的日常写法，藏着竞态 bug）：

```tsx
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

// 反例：每个组件抄一遍三态样板，且没有取消逻辑
function UserPage({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then((r) => r.json())
      .then((data: User) => setUser(data)) // 隐患：快速切换 userId 时，慢的旧请求可能后到并覆盖新数据
      .catch((e: Error) => setError(e));
  }, [userId]);
  // ...渲染三态
  return loading ? <p>加载中…</p> : error ? <p>{error.message}</p> : <p>{user?.name}</p>;
}
```

快速点 1 → 2 → 3 切换用户：请求 1 的响应若最晚回来，页面最终显示用户 1——这就是阶段 2 useEffect 场景里点名的"竞态"。另外它还没有 refetch，卸载后 then 里的 `setUser` 也照样执行（React 18 起不再报警告，但纯属无效功）。

**实现**（含竞态取消与 refetch）：

```ts
import { useCallback, useEffect, useState } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** 手动重新请求（引用永远稳定，可直接传给 memo 子组件） */
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // tick 变化 → 依赖数组变化 → effect 重跑，这就是"手动重发"的全部机关
  const [tick, setTick] = useState(0);
  // useCallback + 空依赖：refetch 引用永远稳定（对上一节 memo 链条的交代）
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController(); // 每轮请求一个独立的取消器
    let outdated = false; // 双保险：即使忘了 abort，过期响应也不许落地

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`); // fetch 对 404/500 不 reject，必须手动抛
        return (await res.json()) as T;
      })
      .then((json) => {
        if (outdated) return; // 已被下一轮请求取代：丢弃
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // 主动取消（url 变了/卸载了/refetch 了）不是错误，静默返回
        if (err instanceof Error && err.name === 'AbortError') return;
        if (outdated) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      outdated = true; // 先立"过期"标志，再掐请求
      controller.abort(); // url/tick 变化或组件卸载时触发
    };
  }, [url, tick]);

  return { data, loading, error, refetch };
}
```

机制分步：url 或 tick 变化 → 旧 effect 先跑 cleanup（旧请求被 abort、旧响应即使到达也被 `outdated` 拦截）→ 新 effect 发起请求 → 三态更新。两条防线（AbortController 与 outdated 标志）各司其职：前者真正省流量，后者兜住"来不及取消就已经 resolve"的窗口。

**使用 demo**：

```tsx
import { useState } from 'react';
import { useFetch } from './useFetch';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function UserCard() {
  const [userId, setUserId] = useState(1);
  const { data, loading, error, refetch } = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
  );

  return (
    <div>
      {[1, 2, 3, 4].map((id) => (
        <button key={id} onClick={() => setUserId(id)}>
          用户 {id}
        </button>
      ))}
      <button onClick={refetch}>重新请求</button>
      {loading && <p>加载中…</p>}
      {error && <p>出错了：{error.message}</p>}
      {data && (
        <p>
          {data.name}（{data.email}）
        </p>
      )}
    </div>
  );
}
```

**常见坑**：

- 坑 1：竞态复现——快速点按钮时数据闪回旧用户。
  - 症状：明明选了用户 3，页面先显示 3 又跳回 1。
  - 根因：没有取消机制，慢的旧响应后到覆盖新响应。
  - 修法：cleanup 里 `abort()` + `outdated` 标志（本实现已内置）。
- 坑 2：HTTP 404/500 进了"成功"分支。
  - 症状：`data` 是 undefined 或报 JSON 解析错。
  - 根因：fetch 只在网络层失败时 reject，HTTP 错误码仍算 resolve。
  - 修法：`if (!res.ok) throw new Error(...)`（实现里的关键行）。
- 坑 3：refetch 每次渲染都是新函数，拖垮调用方的 memo。
  - 根因：直接暴露 `() => setTick(...)`。
  - 修法：`useCallback` 包住（对比：不包的话调用方必须自己再包一层）。

**对照 ahooks**：看 [ahooks](https://ahooks.js.org/) 的 `useRequest`——它是 useFetch 的超集：缓存、轮询、防抖节流、重试、分页都做成挂在请求生命周期上的插件；重点看它如何组织"插件接口"与卸载时的统一清理，这是从"能用"到"库级"的分水岭。手写版阶段 4.2 还会升级一次。

#### useDebounce：给"值"装一个延迟稳定器

**解决什么场景**：搜索框每敲一个字符就触发一次请求/过滤，需要"停止输入 N 毫秒后才算输入结束"。

**问题复现**：

```tsx
import { useEffect, useState } from 'react';

function SearchRaw() {
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (keyword) console.log('发起搜索：', keyword); // 输入 "react" 会打 5 次请求：r / re / rea / reac / react
  }, [keyword]);
  return <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />;
}
```

**实现**（值防抖——注意 cleanup 是正确性的核心）：

```ts
import { useEffect, useState } from 'react';

/**
 * 返回 value 的"防抖版"：value 停止变化 delay 毫秒后，返回值才跟上
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value); // 初始与源值同步，首渲染不延迟

  useEffect(() => {
    // 每轮 effect：设置一个"到点才生效"的定时器
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delay);
    // cleanup：value 或 delay 变化、以及组件卸载时，撤销上一个还没到点的定时器
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

**cleanup 的作用（必须讲透）**。effect 的执行顺序是：依赖变化 → 先执行**上一轮** effect 返回的 cleanup → 再执行本轮 effect。于是时间线变成：

```text
输入序列（间隔约 80ms）：r → e → a

t=0    value="r"   effect#1: setTimer(A, 300)
t=80   value="re"  先跑 effect#1 的 cleanup → clearTimeout(A)   ← A 永远不会到点
                   再跑 effect#2: setTimer(B, 300)
t=160  value="rea" cleanup#2 → clearTimeout(B)；effect#3: setTimer(C, 300)
t=460  C 到点 → setDebounced("rea")   ← 只有最后一次输入存活下来

若删掉 cleanup：A 在 t=300、B 在 t=380、C 在 t=460 依次触发
→ setDebounced 连打三次 → 下游请求照样打三次，防抖完全失效
```

结论：**cleanup 同时服务两条路径**——依赖变化时"撤销上一轮副作用"（防抖的核心），卸载时"撤销最后一轮副作用"（setDebounced 不再作用于已卸载组件）。防抖、节流、订阅、动画，全都靠这套"先收尾再开工"的机制才写得对。

**使用 demo**：

```tsx
import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

export default function SearchDemo() {
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 400); // 停顿 400ms 才更新

  useEffect(() => {
    if (!debounced) return;
    console.log('发起搜索：', debounced); // 连续输入只打印最后一次
    // 实战接法：const { data } = useFetch(`/api/search?q=${encodeURIComponent(debounced)}`)
    // useFetch 以 debounced 拼进 url → url 变化即 abort 旧请求，防抖与竞态取消无缝衔接
  }, [debounced]);

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索…" />
      <p>原始值：{keyword}</p>
      <p>防抖值（下游只认它）：{debounced}</p>
    </div>
  );
}
```

**常见坑**：

- 坑 1：防抖了，请求还是发了一串。
  - 症状：网络面板里仍能看到 r/re/rea 各一条。
  - 根因：下游 effect 依赖了**原始 keyword** 而不是 debounced；或者同时依赖了两者。
  - 修法：下游只订阅防抖值，让原始值只服务于受控输入框。
- 坑 2：最后一击丢失。
  - 症状：输入完立刻点"提交"，提交里读到的关键词是旧的。
  - 根因：最后一次输入的定时器还没到点。
  - 修法：提交动作直接用原始值，防抖值只用于"自动触发"类副作用。
- 坑 3：卸载后 setState。
  - 症状：离开页面瞬间输入，控制台提示对已卸载组件更新（取决于版本）。
  - 根因：没写 cleanup，最后一个定时器存活到到点。
  - 修法：cleanup 清理（本实现已内置）。

**对照 ahooks**：看 ahooks 的 `useDebounceFn`（函数防抖，基于 `useMemoizedFn` 与 debounce 库封装）与值版本 `useDebounce` 如何组合复用；再关注它额外的立即执行（leading）等配置。

#### useLocalStorage：把本地存储变成"响应式状态"

**解决什么场景**：让 `localStorage` 像 `useState` 一样用——读的时候容错、写的时候自动序列化、其他标签页改动时自动同步。

**为什么需要**：裸用 localStorage 的正确姿势太啰嗦：JSON 序列化/反序列化、SSR 环境没有 window、用户手改过的脏数据会让 JSON.parse 抛错、跨 tab 同步要监听 storage 事件——每一处都写一遍是灾难。

**实现**：

```ts
import { useCallback, useEffect, useState } from 'react';

/** 读：SSR 守卫 + JSON 容错 + null 兜底，任何异常都回退到默认值 */
function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback; // SSR / SSG 构建期没有 window
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T); // 没存过 → 默认值
  } catch {
    return fallback; // 脏数据（手动改坏）/ 隐私模式 / 超配额 → 容错回退
  }
}

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (next: T | ((prev: T) => T)) => void;
  remove: () => void;
}

const LOCAL_CHANGE_PREFIX = 'useLocalStorage:change:'; // 自定义事件前缀（见下文同页同步）

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageResult<T> {
  // 惰性初始化：只在首渲染读一次磁盘，之后全走内存 state
  const [value, setValueState] = useState<T>(() => readFromStorage(key, initialValue));

  const write = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next)); // 写盘
      } catch {
        // 写失败（隐私模式/超配额）不阻断内存状态更新，功能降级但不崩
      }
      // storage 事件只在"其他文档"触发，本页的其他组件听不到
      // → 手动 dispatch 一个自定义事件，实现同页多实例同步
      window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_PREFIX + key, { detail: key }));
    },
    [key],
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved = next instanceof Function ? next(prev) : next; // 支持函数式更新
        write(resolved);
        return resolved;
      });
    },
    [write],
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 同上，写类操作都可能被浏览器策略拦下
    }
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_PREFIX + key, { detail: key }));
    setValueState(initialValue);
  }, [key, initialValue]);

  // 订阅两类"外部变更"：跨标签页（原生 storage）+ 同页其他实例（自定义事件）
  useEffect(() => {
    const syncFromStorage = () => setValueState(readFromStorage(key, initialValue));

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) syncFromStorage(); // 其他标签页改了这个 key
    };
    const onLocalChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail === key) syncFromStorage(); // 本页其他实例改的
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_CHANGE_PREFIX + key, onLocalChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_CHANGE_PREFIX + key, onLocalChange);
    };
  }, [key, initialValue]);

  return { value, setValue, remove };
}
```

机制分步：读（惰性 + 三重容错）→ 写（state 与磁盘同步更新，再广播）→ 听（storage 跨 tab + CustomEvent 同页）。注意 `storage` 事件的浏览器约定：**只有其他文档的修改才会触发**，本页 `setItem` 不触发——所以同页同步必须自己造事件，这是本 hook 最容易漏的一块。

**使用 demo**（主题偏好持久化）：

```tsx
import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark';

export default function ThemeDemo() {
  const { value: theme, setValue: setTheme } = useLocalStorage<Theme>('app-theme', 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme; // 挂到根节点配合 CSS 变量
  }, [theme]);

  return (
    <div>
      <p>当前主题：{theme}</p>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>切换主题</button>
    </div>
  );
}
```

再开一个浏览器标签页访问同页面、切一次主题，两个页面会同时变化——storage 事件在起作用。

**常见坑**：

- 坑 1：SSR / Next.js 水合报 mismatch。
  - 症状：Hydration failed / 服务端 HTML 与客户端首渲染不一致。
  - 根因：服务端没有 window（返回 fallback），客户端首渲染直接读到 localStorage 真值，两端产出不同 HTML。
  - 修法：改成"两端首渲染都用 fallback，挂载后再读"：

```ts
import { useEffect, useState } from 'react';

export function useLocalStorageCSR<T>(key: string, fallback: T) {
  // 首渲染两端都用 fallback → HTML 必然一致
  const [value, setValueState] = useState<T>(fallback);
  useEffect(() => {
    setValueState(readFromStorage(key, fallback)); // 挂载后（仅客户端）读真值，多付一次渲染
  }, [key, fallback]); // 注意 fallback 必须是模块级常量或 memo 过的稳定引用，否则每次渲染都会重读覆盖
  // ...写与订阅逻辑与上面一致
  return [value, setValueState] as const;
}
```

- 坑 2：同页两个组件共用一个 key，互不同步。
  - 根因：storage 事件不触发本页文档。
  - 修法：本实现的 CustomEvent 广播；更系统的做法见下一条 ahooks 提示。
- 坑 3：存对象后页面白屏。
  - 症状：JSON.parse 抛 "Unexpected token"。
  - 根因：用户/旧版本代码写入了非 JSON 字符串。
  - 修法：readFromStorage 的 try/catch 回退默认值（已内置）。

**对照 ahooks**：看 `useLocalStorageState` 如何用 `useSyncExternalStore` 把 localStorage 桥接进 React（getSnapshot / getServerSnapshot / subscribe 三件套，天然解决同页多实例与 SSR），以及它开放的 `serializer/deserializer` 配置位。

#### useToggle：布尔开关的最小抽象

**解决什么场景**：Modal / 下拉 / 抽屉的开关逻辑——`setOpen(!open)` 到处写，还想要"直接设为某值 / 按前值计算"两种升级形态。

**实现**（支持 next 值与切换函数）：

```ts
import { useCallback, useState } from 'react';

export interface UseToggleResult<T> {
  state: T;
  /** 无参调用：布尔值取反；传值：直接设置；传函数：按前值计算 */
  toggle: (next?: T | ((prev: T) => T)) => void;
  /** 无脑设置（写起来比 toggle(值) 语义更直白时用） */
  set: (value: T) => void;
}

export function useToggle<T = boolean>(defaultValue: T = false as T): UseToggleResult<T> {
  const [state, setState] = useState<T>(defaultValue);

  const toggle = useCallback((next?: T | ((prev: T) => T)) => {
    setState((prev) => {
      if (typeof next === 'function') {
        // 形态三：函数式更新——prev 是最新的，天然免疫闭包陷阱，可表达三态循环等任意规则
        return (next as (p: T) => T)(prev);
      }
      if (next !== undefined) {
        // 形态二：显式目标值
        return next;
      }
      // 形态一：无参取反——只在值真的是布尔时有意义
      // 若 T 不是布尔（比如三态字符串），无参调用视为空操作，静默返回原值
      return typeof prev === 'boolean' ? ((prev as boolean) ? (false as T) : (true as T)) : prev;
    });
  }, []);

  const set = useCallback((value: T) => setState(value), []);

  // 返回对象：字段语义自解释；用 as const 需返回数组时再换
  return { state, toggle, set };
}
```

注意设计取舍：`toggle` 的三种形态对应三类真实用法——开关灯（无参）、点击遮罩强制关闭（传值）、"三态循环"（传函数，因为下一个状态依赖前一个状态，函数式更新避免读到旧值）。

**使用 demo**：

```tsx
import { useToggle } from './useToggle';

type Theme = 'light' | 'dark' | 'system';

export default function ToggleDemos() {
  // 用法 1：布尔开关（Modal）
  const modal = useToggle(false);
  // 用法 2：三态循环（主题：light → dark → system → light）
  const theme = useToggle<Theme>('light');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <button onClick={() => modal.toggle()}>打开弹窗（无参取反）</button>
        {modal.state && (
          <div
            role="dialog"
            style={{ padding: 24, border: '1px solid #888' }}
            onClick={() => modal.toggle(false)} /* 点遮罩：显式关闭（传值形态） */
          >
            <p>弹窗内容</p>
            <button onClick={(e) => e.stopPropagation()}>停在我身上点不会关（阻止冒泡）</button>
          </div>
        )}
      </div>

      <button
        onClick={() =>
          theme.toggle((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'))
        }
      >
        当前主题：{theme.state}（点我循环切换）
      </button>
    </div>
  );
}
```

**常见坑**：

- 坑 1：非布尔类型上无参调用没反应。
  - 症状：`theme.toggle()` 毫无变化、也不报错。
  - 根因：本实现把无参语义定义为"仅布尔可取反"，其他类型静默返回原值。
  - 修法：非布尔场景必须传值或传函数；开发期也可以选择在无参 + 非布尔时 `console.warn` 暴露误用。
- 坑 2：连续两次 toggle 只生效一次。
  - 症状：`toggle(); toggle();` 期望还原，结果没变。
  - 根因：这不是本 hook 的问题——两次 `setState(false)` 式调用会被批处理合并；若写成 `toggle(state)` 读外部变量，则读到同一个旧值。
  - 修法：凡"基于当前值"的更新都走函数形态 `toggle((v) => !v)`，或依赖无参取反（内部本就是函数式更新）。

**对照 ahooks**：看 `useToggle`——纯 boolean 版本，提供 `toggle() / set(state) / setLeft() / setRight()` 四个方法；体会"小 hook 也把 API 语义拆细"的设计品味。

#### useWindowSize：把视口尺寸变成响应式状态

**解决什么场景**：JS 里要根据视口宽度切换布局分支（移动/桌面）、把画布铺满可视区——需要把 `window.innerWidth/innerHeight` 变成响应式状态。

**为什么需要**：纯 CSS media query 覆盖不了"JS 逻辑分支"（比如移动端渲染另一套组件树）；而 resize 事件一秒能触发几十次，无脑 setState 会让整棵树跟着高频重渲染——所以提供"即时/防抖"两种模式，默认建议防抖。

**实现**（防抖/即时两种 + SSR 守卫）：

```ts
import { useEffect, useState } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * SSR 守卫哨兵值：服务端没有 window，用 Infinity 而不是 0——
 * 0 会被断点逻辑误判为"移动端"，Infinity 则落在最大断点，避免错误布局闪现
 * （这也是 ahooks useWindowSize 采用的约定值）
 */
const SERVER_SIZE: WindowSize = { width: Infinity, height: Infinity };

function getSize(): WindowSize {
  if (typeof window === 'undefined') return SERVER_SIZE;
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * @param debounceMs 0 = 即时模式（每次 resize 立刻更新）；>0 = 防抖模式
 */
export function useWindowSize(debounceMs = 0): WindowSize {
  // 初始化同样要守卫：SSR 首渲染走 getSize 的 SERVER_SIZE 分支
  const [size, setSize] = useState<WindowSize>(getSize);

  useEffect(() => {
    if (debounceMs <= 0) {
      // 即时模式：布局强一致场景（画布、拖拽辅助线），代价是拖拽窗口期间连续渲染
      const onResize = () => setSize(getSize());
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    // 防抖模式：拖拽停顿 debounceMs 毫秒才更新一次（与 useDebounce 的 cleanup 机制同理）
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSize(getSize()), debounceMs);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer); // 卸载时清掉挂着的定时器
      window.removeEventListener('resize', onResize);
    };
  }, [debounceMs]); // delay 变化会重绑监听（数字是原始类型，引用稳定，通常不会无谓触发）

  return size;
}
```

**使用 demo**：

```tsx
import { useWindowSize } from './useWindowSize';

export default function ResponsiveDemo() {
  const size = useWindowSize(200); // 防抖 200ms：拖拽结束才更新
  const isMobile = size.width < 768;

  return (
    <div>
      <p>
        视口：
        {Number.isFinite(size.width) ? `${size.width} × ${size.height}` : 'SSR 环境（哨兵值）'}
      </p>
      {/* JS 逻辑分支：CSS media query 做不到"渲染另一套组件" */}
      {isMobile ? <nav>移动端：底部 Tab</nav> : <nav>桌面端：侧边栏</nav>}
    </div>
  );
}
```

**常见坑**：

- 坑 1：SSR 水合后布局"闪一下"。
  - 症状：服务端渲染的桌面布局，客户端水合后变成移动布局。
  - 根因：两端首渲染值不同（Infinity vs 真实宽度）→ 这本质是"视口是客户端才有的状态"，与 useLocalStorage 的水合坑同源。
  - 修法：首渲染统一用哨兵/固定值渲染一个中性态，挂载后再切换；纯视觉差异优先交给 CSS media query。
- 坑 2：移动端地址栏伸缩导致高度抖动。
  - 症状：滚动时页面布局频繁重排。
  - 根因：移动浏览器滚动时 URL 栏收起会触发 resize，innerHeight 变化。
  - 修法：高度分支尽量用 CSS（`100dvh` 等），JS 只依赖宽度；确需精确视口可关注 `visualViewport` API。
- 坑 3：监听器泄漏。
  - 根因：effect 里 addEventListener 但 cleanup 忘了 remove。
  - 修法：永远成对出现（本实现的两个 return）。

**对照 ahooks**：看 `useWindowSize` 的 SSR 哨兵值处理与基于 `useEventListener` / `useSyncExternalStore` 的组合实现——多个小 hook 组装成稍大 hook 的典型范例。

#### useClickOutside：弹层的"点外面关闭"

**解决什么场景**：下拉菜单、浮层、行内编辑器打开后，点击"外部区域"应关闭——但"外部"必须先定义清楚（触发按钮算内部还是外部？）。

**mousedown vs click 怎么选**：

- `mousedown`：按下瞬间就触发。体验上"点到即关"没有迟滞；不受"按下后在弹层内拖出去松开"这类怪异交互影响；文本选择、拖拽场景配合更好。
- `click`：完整的一次"按下+抬起"才触发，与用户对"点击"的心智更一致；但按下弹层外、松开在别处时 click 目标是共同祖先，判断会变得微妙。
- 经验默认 `mousedown`；若产品语义是"完成一次点击才算"（如某些菜单约定），换 `click`。键盘可达性还要配 ESC 关闭与焦点管理（阶段 4.5 弹层体系展开）。

**实现**（支持 ref 数组）：

```ts
import { useEffect, useRef, type RefObject } from 'react';

export type ClickOutsideTarget = RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>;

function toRefArray(target: ClickOutsideTarget): Array<RefObject<HTMLElement | null>> {
  return Array.isArray(target) ? target : [target]; // 单 ref 与数组统一处理
}

/**
 * @param target  一个 ref 或 ref 数组——数组里所有元素围成的区域都算"内部"
 * @param handler 判定为"点在外面"时的回调
 * @param eventName 用 mousedown 还是 click（默认 mousedown，理由见上文）
 */
export function useClickOutside(
  target: ClickOutsideTarget,
  handler: (event: MouseEvent) => void,
  eventName: 'mousedown' | 'click' = 'mousedown',
): void {
  // Dan 模式提前登场：ref 保存最新回调，避免"handler 引用不稳定导致反复解绑重绑"
  // 也让调用方可以放心传内联函数（与 useInterval 的原理完全一致）
  const savedHandler = useRef(handler);
  useEffect(() => {
    savedHandler.current = handler;
  });

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const refs = toRefArray(target);
      // contains 走真实 DOM 层级：只要点击落点在任一"内部"元素里，就不算外部
      const clickedInside = refs.some((ref) => ref.current?.contains(event.target as Node));
      if (!clickedInside) {
        savedHandler.current(event); // 到点才执行"最新的"回调
      }
    };
    document.addEventListener(eventName, listener);
    return () => document.removeEventListener(eventName, listener); // 卸载/参数变化时解绑
  }, [target, eventName]); // 故意不含 handler：回调更新不需要重绑全局监听
}
```

为什么需要 ref 数组：下拉 = 触发按钮 + 弹出菜单两块 DOM。若只把菜单算"内部"，点按钮切换时这次点击会立刻被判定为"外部"把菜单关掉——菜单闪开闪关。把两个 ref 都放进数组即可。另外 `contains` 走的是**真实 DOM 层级**，所以菜单即使通过 `createPortal` 渲染到 `document.body`，ref 指向的仍是那个真实节点，判断不受 React 组件树结构影响。

**使用 demo**：

```tsx
import { useRef, useState } from 'react';
import { useClickOutside } from './useClickOutside';

export default function DropdownDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // 按钮和菜单都算"内部"：必须传数组（只传 menuRef 试试，点按钮会闪关）
  useClickOutside([buttonRef, menuRef], () => setOpen(false));

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={buttonRef} onClick={() => setOpen((o) => !o)}>
        选择动作
      </button>
      {open && (
        <ul
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            margin: 0,
            padding: '8px 16px',
            listStyle: 'none',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          {['复制', '移动', '删除'].map((action) => (
            <li key={action} onClick={() => setOpen(false)}>
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**常见坑**：

- 坑 1：点按钮打开菜单，菜单立刻又关了。
  - 症状：click 先开又瞬间关（闪烁）。
  - 根因：按钮不在"内部"集合里，mousedown 被判为外部 → 关闭回调与打开 setState 在同一次点击里竞争。
  - 修法：target 传 `[buttonRef, menuRef]`。
- 坑 2：内联 handler 导致监听反复解绑重绑。
  - 根因：把 handler 放进依赖数组，而内联函数每次渲染都是新引用（正是 memo 一节讲过的引用相等性问题）。
  - 修法：内部 savedHandler 模式（本实现），或调用方自行 useCallback。
- 坑 3：portal 弹层"点外面关不掉/误关"。
  - 症状：渲染到 body 的 Modal 上的点击也被判为外部。
  - 根因：只把触发器算内部、忘了把 portal 内容的 ref 也加入数组。
  - 修法：portal 不影响 contains 判断（它判断真实 DOM），把弹层 ref 一并传入即可。

**对照 ahooks**：看 `useClickOutside` 如何基于 `useEventListener` 实现（SSR 守卫、target 支持 ref/元素/函数等多种形态），事件名参数化与本文一致。

#### usePrevious：拿到"上一次渲染的值"

**解决什么场景**：展示变化方向（价格涨/跌、数值升降箭头）、对比前后两次输入——React 只给你"当前值"，"上一次"需要自己保存。

**实现一（ref 版：提交后更新，也就是 useRef 一节里的 6 行）**：

```ts
import { useEffect, useRef } from 'react';

export function usePreviousRef<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value; // effect 在"提交之后"执行 → 渲染期间读 ref.current 拿到的恰是上一轮的值
  });
  return ref.current;
}
```

原理：渲染第 N 轮时，第 N 轮的 effect 还没跑，`ref.current` 里存的是第 N-1 轮提交时写入的值——"晚一拍"从缺陷变成了特性。

**实现二（函数式更新内比较的经典写法：渲染期间调整 state）**：

```ts
import { useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  // 元组：[当前已确认的值, 它的上一个值]
  const [tuple, setTuple] = useState<[T, T | undefined]>([value, undefined]);

  // 渲染期间比较"本轮要渲染的值"与"已确认的值"：
  // 不相等 → 排队一次 setState，把 [新值, 旧确认值] 存好
  // React 会丢弃本轮渲染输出并用新 state 立即重渲一次（不会两棵子树都提交，也不会无限循环——
  // 因为第二轮比较时两者已相等，条件不再成立）
  if (tuple[0] !== value) {
    setTuple([value, tuple[0]]);
  }

  return tuple[1];
}
```

两版怎么选：ref 版简单，但它的返回值本质是"渲染期间读 ref"——在 effect / 事件处理器里用没有问题；如果返回值要**直接参与 JSX 计算**（涨跌颜色），React 官方文档推荐 setState 版（"渲染期间调整 state"是被官方认可的模式，而不是反模式），它保证渲染纯度：同样的输入在两次渲染中产出同样的结果。注意渲染期间 setState 的两条纪律：条件必须能收敛（否则死循环）；只允许更新**当前组件**的 state。

**使用 demo**：

```tsx
import { useState } from 'react';
import { usePrevious } from './usePrevious';

export default function PriceTicker() {
  const [price, setPrice] = useState(100);
  const prevPrice = usePrevious(price); // 首渲染是 undefined（没有"上一次"）

  const direction =
    prevPrice === undefined || price === prevPrice
      ? 'flat'
      : price > prevPrice
        ? 'up'
        : 'down';

  return (
    <div>
      <p style={{ color: direction === 'up' ? 'green' : direction === 'down' ? 'red' : 'inherit' }}>
        当前价格：{price}
        {direction === 'up' && '（涨）'}
        {direction === 'down' && '（跌）'}
      </p>
      <button onClick={() => setPrice((p) => Math.max(1, p + Math.round(Math.random() * 10 - 5)))}>
        模拟下一笔成交
      </button>
    </div>
  );
}
```

**常见坑**：

- 坑 1：首渲染拿到 undefined 直接参与计算。
  - 症状：`prevPrice.toFixed is not a function`。
  - 根因：第一次渲染没有"上一次"。
  - 修法：`prevPrice === undefined` 显式分支（demo 的写法）。
- 坑 2：ref 版返回值用于渲染，StrictMode 下行为差异引发困惑。
  - 症状：StrictMode 双渲染时两次输出一致（effect 未跑），但开发者误以为"每次渲染都该更新"。
  - 根因：ref 版语义就是"上次提交的值"，渲染期读 ref 不参与 React 的纯度保证。
  - 修法：渲染期依赖旧值就换 setState 版。
- 坑 3：期望"比较的是深层相等"。
  - 症状：对象每次都是新引用，`!==` 恒成立。
  - 根因：两版都用引用/浅层比较。
  - 修法：传入原始值或稳定化的引用（useMemo），深层比较自己按字段写。

**对照 ahooks**：看 `usePrevious` 的 ref + useEffect 实现（与实现一逐行同构），确认手写版与库一致。

#### useInterval：把 setInterval 变成声明式 Hook（闭包陷阱的标准解法案例）

**解决什么场景**：既要求**回调里永远读到最新的 state/props**，又要求 **delay 可以动态调整**——两个再朴素不过的需求，直接 `setInterval` 一个都做不到。这是 Dan Abramov 的经典案例（overreacted.io 的《Making setInterval Declarative with React Hooks》），必须讲透。

**问题复现**（错误写法一：空依赖 → 旧闭包）：

```tsx
import { useEffect, useState } from 'react';

export default function CounterBroken() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount(count + 1); // count 是"第一次渲染"的 0，永远停在 0
    }, 1000);
    return () => window.clearInterval(id);
  }, []); // 空依赖：effect 只跑一次，定时器里的闭包被冻结在第一帧

  return <h1>{count}</h1>; // 现象：永远显示 1，再也不涨
}
```

这就是上一节闭包陷阱专题的定时器版：effect 捕获的是**第一帧的 count**，每秒执行 `setCount(0 + 1)`。

两种"看起来能修"的朴素解法，各有局限：

- 解法 A：函数式更新 `setCount((c) => c + 1)` 能修这个**特例**——因为它不再依赖闭包里的 count。但回调一旦要做更复杂的事（读 props、调接口、连续操作多个 state），函数式更新就不够用了，总不能所有状态都塞进一个函数式更新。
- 解法 B：把 count 加进依赖数组。功能上"数字会动"，但每秒渲染一次 → 每秒 clear + set 一次定时器：**"每 1000ms 一拍"的节拍被不断重置**（变成"渲染后 1000ms"），依赖一多就变成"任何 state 变化都重置时钟"，高频时抖动明显；语义完全跑偏——回调变化 ≠ 频率变化。

**Dan 版完整实现**：

```ts
import { useEffect, useRef } from 'react';

/**
 * 声明式的 setInterval：
 * - 回调每次渲染更新，定时器到点执行的永远是"最新"的回调（解决旧闭包）
 * - delay 变化才重建定时器；传 null 表示暂停（解决动态频率）
 */
export function useInterval(callback: () => void, delay: number | null): void {
  // 通道一：保存"最新回调"的容器
  const savedCallback = useRef(callback);

  // 1️⃣ 每次渲染提交后，把最新的回调塞进 ref——回调再怎么变都追得上
  useEffect(() => {
    savedCallback.current = callback;
  });

  // 2️⃣ 定时器的生命周期只由 delay 决定：频率没变就不重建
  useEffect(() => {
    if (delay === null) return; // null = 暂停（不设定时器，已有的被 cleanup 清掉）

    const id = window.setInterval(() => {
      // 3️⃣ 到点执行的是 ref 里的"最新回调"，而不是 effect 创建时捕获的那个闭包
      savedCallback.current();
    }, delay);

    return () => window.clearInterval(id); // delay 变化或卸载时重建/清理
  }, [delay]);
}
```

**两步分别解决什么**（这个拆分是整个案例的灵魂）：

```text
直接 setInterval(fn, delay)：fn 是第一帧的闭包 → 永远读旧 state（错误写法一）
把 fn 挂进依赖：每次渲染 clear+set → 节拍被不断重置（错误写法二）

Dan 版把两件事拆成互不干扰的两条通道：
  通道一（回调新鲜度）：每次提交后 savedCallback.current = callback   → 修"旧闭包"
  通道二（定时器生命周期）：useEffect(..., [delay])                   → 修"动态频率"
回调变化 → 只走通道一（换回调，不动定时器）
频率变化 → 只走通道二（clear+set，重建定时器）
```

`savedCallback.current()` 之所以拿到的是新值：调用发生在**未来的某次 tick**，而每次渲染提交后 ref 都被刷新——执行时经由 ref 这个"中转站"，绕开了 effect 闭包的冻结。这正是"闭包陷阱的 ref 解法"的标准化形态，与 useRef 一节、useClickOutside 的 savedHandler 是同一个模式。

**使用 demo**（计数 + 滑块动态调频 + 暂停）：

```tsx
import { useState } from 'react';
import { useInterval } from './useInterval';

export default function DynamicTimer() {
  const [count, setCount] = useState(0);
  const [delay, setDelay] = useState(1000);
  const [running, setRunning] = useState(true);

  // 注意：这里的回调每次渲染都是新函数、且直接读 count——
  // 在 Dan 版 useInterval 里这完全没问题，内部 ref 会一直追最新闭包
  useInterval(() => {
    setCount(count + 1); // 直接读 state：不再是旧值（对比错误写法一）
  }, running ? delay : null); // 暂停 = 传 null，而不是条件渲染组件

  return (
    <div>
      <h2>计数：{count}</h2>
      <label>
        间隔：{delay}ms
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))} // 拖动滑块：定时器按需重建
        />
      </label>
      <button onClick={() => setRunning((r) => !r)}>{running ? '暂停' : '继续'}</button>
    </div>
  );
}
```

验证要点：拖滑块时计数节奏实时变化（通道二生效）；暂停/继续无损（null 分支 + cleanup）；回调里写 `count + 1` 或 `setCount((c) => c + 1)` 结果一致（旧闭包已不存在）。

**常见坑**：

- 坑 1：StrictMode 下"定时器跑了两份"。
  - 症状：开发模式日志/请求双份。
  - 根因：React 18/19 的 StrictMode 会挂载→卸载→再挂载 effect 来暴露缺失的清理，定时器被建两次；cleanup 保证最终只有一份存活。
  - 修法：无需修——这正是 cleanup 的价值；测试观察日志时知道这个现象即可。
- 坑 2：delay 传 `undefined` 与 `null` 行为不同。
  - 症状：期望暂停却跑了。
  - 根因：本实现只把 `null` 当暂停；`undefined` 传给 setInterval 会被浏览器当 0（立即、逐帧触发）。
  - 修法：类型上只收 `number | null`（TS 已拦截），运行时来自接口的话先归一化。
- 坑 3：回调里发请求但没处理竞态。
  - 根因：轮询场景回调每次都 fetch，慢响应可能乱序覆盖。
  - 修法：回调内用本节 useFetch（url 不变 + refetch），或自己加 AbortController。

**对照 ahooks**：看 `useInterval` 在 Dan 版之上补的 `immediate`（首次立即执行）配置，以及它如何统一处理 delay 为负数等边界。

#### 八个 hook 的公共收束

回看会发现两个反复出现的模式：**cleanup 先于下一轮执行**（useFetch 的 abort、useDebounce 的 clearTimeout、useWindowSize 的解绑）和 **ref 保存最新回调**（useClickOutside 的 savedHandler、useInterval 的 savedCallback）。把这两个模式练到肌肉记忆，绝大多数自定义 Hook 都能自己推导出来。

### ✅ 产出：**TodoMVC**（增删改查 + 状态过滤 + localStorage 持久化 + useDebounce 搜索）

现在把本节所有零件装到一辆整车上。TodoMVC 是验证"状态与副作用"掌握度的最小完整应用。

**功能拆解清单**（每项功能分别落在哪个知识点上）：

| 功能 | 用什么 | 要点 |
|---|---|---|
| 新增待办 | `useState` 受控 input + 回车提交 | 空白不新增；提交后清空输入框 |
| 删除 | `useState` 不可变更新（`filter`） | 每项一个删除按钮 |
| 编辑（双击进入） | `useToggle` 管编辑态 + 受控草稿 | 回车保存 / Esc 取消 / 失焦保存；保存为空 = 删除（TodoMVC 规范） |
| 勾选完成 | 不可变更新（`map` 替换某项） | 划线样式 |
| 状态过滤（全部/未完成/已完成） | `useState` 存 filter + `useMemo` 派生可见列表 | 派生数据用普通计算，不用 effect |
| localStorage 持久化 | `useLocalStorage` | 刷新不丢；跨标签页同步 |
| 防抖搜索 | `useDebounce(keyword, 300)` | 连续输入只过滤一次 |
| 列表性能 | `memo` + 父侧 `useCallback` | 搜索打字期间（防抖值未变时）列表不重渲染 |

**组件结构与状态设计建议**：

```text
App（持有跨组件共享的状态：todos / filter / keyword）
├── TodoInput    新增输入框 + 搜索输入框（受控）
├── TodoFilter   all / active / done 三态切换 + 剩余计数
├── TodoList     memo 化列表壳（props：visibleTodos / onToggle / onRemove / onRename）
│   └── TodoItem memo 化单条（双击编辑、勾选、删除；编辑态是本组件局部 state）
└── TodoFooter   剩余 n 项 + 清除已完成
```

状态归属判断（呼应 useState 场景第 5 条"状态放哪"）：`todos` 被 App 的多个子组件读写 → 提升到 App；`editing` 只影响单个 TodoItem 自身 → 下放为局部 state；`visibleTodos` 是派生值 → 永远现算，不落地成 state（"什么时候不该用 useEffect"的直接应用）。

**核心实现**（复用本章手写的 `useLocalStorage` / `useDebounce`）：

```tsx
// App.tsx
import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useDebounce } from './useDebounce';
import { TodoItem } from './TodoItem';

type Filter = 'all' | 'active' | 'done';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' },
];

export default function App() {
  // 数据本体：useLocalStorage 负责持久化 + 跨标签页同步
  const { value: todos, setValue: setTodos } = useLocalStorage<Todo[]>('todomvc-todos', []);

  const [filter, setFilter] = useState<Filter>('all');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300); // 停止输入 300ms 才参与过滤

  // 四个操作回调全部 useCallback：useLocalStorage 的 setValue 本身引用稳定，
  // 所以这些回调的引用也稳定 → 传给 memo 化的 TodoList/TodoItem 不会击穿浅比较
  const addTodo = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return; // 空白不新增
      setTodos((prev) => [...prev, { id: Date.now(), text: trimmed, done: false }]); // 展开追加
    },
    [setTodos],
  );

  const removeTodo = useCallback(
    (id: number) => setTodos((prev) => prev.filter((t) => t.id !== id)), // filter 删除
    [setTodos],
  );

  const toggleTodo = useCallback(
    (id: number) =>
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))), // map 替换某项
    [setTodos],
  );

  const renameTodo = useCallback(
    (id: number, text: string) =>
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t))),
    [setTodos],
  );

  const clearDone = useCallback(
    () => setTodos((prev) => prev.filter((t) => !t.done)),
    [setTodos],
  );

  // 派生数据：普通计算 + useMemo，绝不放进 effect
  const visibleTodos = useMemo(() => {
    const kw = debouncedKeyword.trim().toLowerCase();
    return todos.filter((t) => {
      const byFilter = filter === 'all' ? true : filter === 'done' ? t.done : !t.done;
      const bySearch = kw === '' || t.text.toLowerCase().includes(kw);
      return byFilter && bySearch;
    });
  }, [todos, filter, debouncedKeyword]);

  const leftCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <input
        placeholder="新增待办，回车提交"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            addTodo(e.currentTarget.value);
            e.currentTarget.value = ''; // 提交后清空（非受控的简单做法）
          }
        }}
      />
      <input
        placeholder="搜索（防抖 300ms）"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <div>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{ fontWeight: filter === key ? 'bold' : 'normal' }}
          >
            {label}
          </button>
        ))}
      </div>

      <ul>
        {visibleTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onRemove={removeTodo}
            onRename={renameTodo}
          />
        ))}
      </ul>

      <footer>
        <span>剩余 {leftCount} 项</span>
        <button onClick={clearDone}>清除已完成</button>
      </footer>
    </div>
  );
}
```

```tsx
// TodoItem.tsx
import { memo, useEffect, useRef, useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onRename: (id: number, text: string) => void;
}

// memo + 父侧稳定回调：todos 里其他项变化时，未变的项不重渲染
export const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onRemove,
  onRename,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false); // 编辑态只影响本组件 → 局部 state
  const [draft, setDraft] = useState(todo.text);
  const editInputRef = useRef<HTMLInputElement>(null); // 进入编辑态自动聚焦（useRef 场景 1）

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(todo.text); // 进入编辑时同步最新文本
    setEditing(true);
  };

  const commit = () => {
    const text = draft.trim();
    if (text === '') {
      onRemove(todo.id); // TodoMVC 规范：清空后保存 = 删除该项
    } else if (text !== todo.text) {
      onRename(todo.id, text);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <input
          ref={editInputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false); // Esc 放弃修改
          }}
        />
      </li>
    );
  }

  return (
    <li onDoubleClick={startEdit}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
      </label>
      <button onClick={() => onRemove(todo.id)}>删除</button>
    </li>
  );
});
```

**逐条验收标准**（全部通过才算完成）：

1. 新增：输入文本回车，列表出现新项、输入框清空；只输空格/空文本时不新增。
2. 删除：点某项"删除"，该项立即消失，其余项不受影响（key 用 id，无错乱）。
3. 编辑：双击文本进入编辑态且自动聚焦，原文本填入输入框；回车保存、Esc 放弃、失焦保存；清空文本后保存等于删除。
4. 勾选：checkbox 切换后文本出现/去除划线；"剩余 n 项"计数同步变化。
5. 过滤：三个 Tab 切换正确——"未完成"不含已勾选项，"已完成"只含已勾选项；勾选状态在过滤视图下依然可切换。
6. 持久化：新增几项后刷新页面数据还在；DevTools → Application → Local Storage 能看到 `todomvc-todos` 的 JSON；手动删掉该 key 再刷新，回到空列表。
7. 跨标签页：同一页面开两个标签页，在 A 标签新增，B 标签无需刷新即同步（storage 事件生效）。
8. 防抖：在搜索框快速连续输入（比如 1 秒内打完一个词），列表过滤只发生一次——可用一行日志或 Profiler 的提交次数验证；清空搜索框显示全部。
9. 性能（对照 memo 一节）：列表放 50 条以上数据，在搜索框连续打字（防抖值未变化期间），用 DevTools Profiler 录制，TodoItem 不应出现在提交记录里；点击勾选某项时，只有该项重渲染。
10. 零警告：控制台没有 key 警告、没有 `react-hooks/exhaustive-deps` 警告。

做到第 9 条，本节的 useRef、memo 三件套、八个自定义 Hook 就全部在一个真实应用里落过地了。

## 阶段 3：组件设计模式（1.5 周）

前两个阶段解决"能写出正确的组件"，本阶段解决"能设计出好用的组件"：当你要封装一个被 50 个页面复用的组件时，该暴露什么 API、状态放在哪、渲染权交给谁。下面 9 个模式每个都对应一类真实的"组件写烂了"的病：props 越加越多、透传越传越深、状态放错层导致全局重渲染、类型丢失只能 `any` 通关。每个模式按统一结构展开：**是什么 → 为什么需要 → 怎么做（机制分步）→ 代码示例 → 常见坑（症状 → 根因 → 修法）**。

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

### 模式 1｜受控 vs 非受控：输入框双模式实现（`value` + `defaultValue` + ref）

**是什么。** 表单控件的值有两条生命周期：归 React state 管——每次敲键 `setState`，`value` 永远等于 state，叫**受控**；归 DOM 自己管——React 只给首帧初始值 `defaultValue`，之后用 `ref` 读 DOM 真实值，叫**非受控**。

**为什么需要两种。** 受控的代价是每键一次重渲染，换来值永远在 state 里：格式化（卡号每 4 位加空格）、即时校验、条件禁用提交按钮都顺手。非受控的代价是 React 不知道值变了，换来零重渲染、代码极简、兼容浏览器行为（记住密码、输入法、回填）。只支持受控的 Input 会在超大表单里被重渲染拖死；只支持非受控的做不了实时过滤。所以成熟组件都做成**双模式**：传 `value` 走受控，传 `defaultValue` 走非受控，都不传也能用。

**怎么做（机制分步）。** ① 接收可选的 `value` / `defaultValue`；② `value !== undefined` 即受控——当前值直接用 `value`，`onChange` 只上报不落地；③ 否则非受控——内部 `useState(defaultValue ?? '')` 持镜像值，`onChange` 先更新内部再上报；④ `forwardRef` 把 ref 透传到原生 `<input>`，调用方可随时 `focus()`、直接读 DOM 值；⑤ 两种模式共用 `onChange(value: string)` 签名，调用方代码不因模式切换而改变。

**代码示例：完整双模式 Input。**

```tsx
// DualInput.tsx
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

// 从原生属性里抠掉三个"被我们接管签名"的属性，避免类型冲突
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> & {
  value?: string;                       // 受控：传了就生效
  defaultValue?: string;                // 非受控：仅首帧生效
  onChange?: (value: string) => void;   // 统一只回调字符串
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { value, defaultValue, onChange, ...rest },   // rest 原样透传
  ref,
) {
  const [inner, setInner] = useState(defaultValue ?? '');  // 非受控镜像值
  const isControlled = value !== undefined;                // 每次渲染重新判定模式
  const currentValue = isControlled ? value : inner;       // 双模式归一的当前值

  return (
    <input
      ref={ref}
      value={currentValue}
      onChange={(e) => {
        const next = e.target.value;
        if (!isControlled) setInner(next);   // 非受控：自己落地；受控：等父组件回写
        onChange?.(next);                    // 两种模式都上报
      }}
      {...rest}
    />
  );
});

export default Input;
```

```tsx
// DualInputDemo.tsx —— 两种模式用法对照
import { useRef, useState } from 'react';
import Input from './DualInput';

export default function DualInputDemo() {
  const [phone, setPhone] = useState('');   // 受控：值进 state，参与即时逻辑（格式化/校验随手可得）
  const nicknameRef = useRef<HTMLInputElement>(null);   // 非受控：提交时才用 ref 取值

  return (
    <div>
      <Input value={phone} onChange={setPhone} placeholder="受控：手机号" />
      <Input ref={nicknameRef} defaultValue="游客_9527" placeholder="非受控：昵称" />
      <button onClick={() => alert(`昵称：${nicknameRef.current?.value}`)}>读取昵称</button>
    </div>
  );
}
```

**适用场景速查。** 选受控：值要即时参与渲染逻辑（过滤、格式化、联动）、要程序化改值（重置、回填）、要裁剪输入或同步到 URL/store。选非受控：只在提交瞬间才需要值、几十上百字段的大表单（重渲染贵）、`<input type="file">`（浏览器限制只能非受控）。

**常见坑。**

- **症状**：输入框打不了字，控制台警告 `You provided a 'value' prop to a form field without an 'onChange' handler`。**根因**：给了 `value` 没给 `onChange`，state 不变则 DOM 值被永远拽回 state，表现即"锁死"。**修法**：补 `onChange`，或改 `defaultValue`，或确实只读就加 `readOnly`。
- **症状**：更新 `defaultValue` 后输入框纹丝不动。**根因**：`defaultValue` 只在首次挂载生效，这是非受控契约。**修法**：需要外部驱动值就升级为受控；或 `key={newDefaultValue}` 强制重挂载（慎用，丢焦点与内部状态）。
- **症状**：`type="number"` 输入框里 `value + 1` 变成字符串拼接。**根因**：DOM 没有真 number，`e.target.value` 永远是 string。**修法**：读 `e.target.valueAsNumber`（空值为 `NaN` 要判），或 `Number(v)` 并处理 `NaN`。
- **症状**：自封装受控组件"偶尔能打字偶尔不能"。**根因**：`onChange` 上报后父组件走了异步/条件分支才 setState，期间显示值被旧 state 覆盖。**修法**：受控契约要求 onChange → setState 同步完成；做不到就用非受控，别做半受控。

### 模式 2｜组合优于配置：用 `children`/具名 slot 替代一堆 props 的 Card、Layout

**是什么。**"配置式"组件把所有可变物抽成 props（标题字符串、按钮文案、图标全用 prop 传）；"组合式"组件只规定**结构骨架**（头部/正文/底部），每格内容由调用方用 JSX 塞进来——`children` 是匿名主插槽，`title`/`extra`/`footer` 这类 `ReactNode` prop 是具名插槽。

**为什么需要。** 配置式有一条必然的死亡曲线：第一版 5 个 props 很清爽；产品说"标题右边加标签"→ 加 `titleTag`；"封面要放轮播"→ `coverType` + `coverList`；"底部要两个按钮"→ 再加 `footerActions`……props 随需求线性膨胀，而 props 间的**合法组合**是指数级的，永远测不完；更致命的是调用方对"渲染什么"有想法时必须改组件源码。组合式倒转关系——组件只承诺"哪里有什么格子"，格子里放什么由调用方自由表达，新需求零改组件。

**怎么做（机制分步）。** ① 盘点结构区域（Card：头部/封面/正文/底部），区域即插槽；② 主区域用 `children`，次要区域用可选 `ReactNode` props；③ 真正的样式开关（边框、阴影档位）保留为封闭枚举——配置的合理残留；④ 空插槽要守卫，避免渲染空壳元素破坏布局。

**代码示例：配置爆炸的反例（15+ 个 props）。**

```tsx
// CardConfigured.tsx —— 反面教材：每个新需求都要"求组件作者开新口子"
import type { ReactNode } from 'react';

type CardConfiguredProps = {
  title?: string;                 // 标题只能是纯文本
  titleSize?: 'sm' | 'md' | 'lg';
  titleIcon?: ReactNode;          // 想加标签？得再加一个 titleTag
  subtitle?: string;
  extraText?: string;             // 右上角只放得下一个文本按钮
  extraType?: 'link' | 'button';
  onExtraClick?: () => void;
  coverUrl?: string;              // 封面只能是图片
  coverHeight?: number;
  coverOverlay?: ReactNode;
  banner?: ReactNode;             // 后来加的：封面与正文之间的公告条
  body?: ReactNode;               // 连正文都要从 prop 塞进来
  bodyPadding?: number | 'none';
  footer?: ReactNode;
  footerJustify?: 'start' | 'end' | 'between';
  bordered?: boolean;
  shadow?: 'none' | 'sm' | 'md';
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
};
```

```tsx
// 调用现场：一份"需求清单"式的 JSX
<CardConfigured
  title="项目报表"
  titleIcon={<ChartIcon />}
  extraText="导出"
  extraType="button"
  onExtraClick={handleExport}
  coverUrl="/cover.png"
  coverHeight={160}
  coverOverlay={<span className="tag">含敏感数据</span>}
  body={reportContent}
  bodyPadding={12}
  footer={<Pagination current={1} total={42} />}
  footerJustify="between"
  bordered
  shadow="md"
/>
{/* 下个迭代：标题旁加"周报"标签、右上角两个按钮、封面换轮播
    → 至少加 3 个 props，回头改类型、改默认值、改测试。 */}
```

**代码示例：组合式重构版。**

```tsx
// Card.tsx —— 具名插槽版：结构定死，内容放开
import type { ReactNode } from 'react';

type CardProps = {
  title?: ReactNode;    // 具名插槽：文本、图标、标签随便塞
  extra?: ReactNode;    // 右上角放几个按钮都行
  cover?: ReactNode;    // 图片/轮播/视频，调用方决定
  footer?: ReactNode;
  bordered?: boolean;              // 真正的样式开关保留枚举
  shadow?: 'none' | 'sm' | 'md';
  children: ReactNode; // 匿名主插槽：正文
};

export default function Card({ title, extra, cover, footer, bordered = true, shadow = 'sm', children }: CardProps) {
  const cls = ['card', `card--shadow-${shadow}`, bordered ? 'card--bordered' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {(title !== undefined || extra !== undefined) && (
        <div className="card__header">
          {title !== undefined && <div className="card__title">{title}</div>}
          {extra !== undefined && <div className="card__extra">{extra}</div>}
        </div>
      )}
      {cover}
      <div className="card__body">{children}</div>
      {footer !== undefined && <div className="card__footer">{footer}</div>}
    </div>
  );
}
```

```tsx
// 同样三个新需求，调用方自己组合，组件一行不改：
<Card
  title={<>项目报表 <Tag color="blue">周报</Tag></>}        {/* 标签塞进 title 插槽 */}
  extra={<><Button onClick={handleExport}>导出</Button><Button onClick={handleShare}>分享</Button></>}
  cover={<Carousel images={covers} height={160} />}          {/* 轮播封面 */}
  footer={<Pagination current={1} total={42} />}
>
  {reportContent}
</Card>
```

**代码示例：Layout。** 布局组件是组合式的主场——配置式 Layout 会产出 `layout="top" | "side"`、`showSidebar`、`sidebarWidth` 这类互相纠缠的开关；组合式只定网格，内容全交出去。

```tsx
// Layout.tsx
import type { ReactNode } from 'react';

type LayoutProps = {
  header?: ReactNode;    // 顶栏插槽
  sidebar?: ReactNode;   // 侧栏插槽（不传则主内容占满整行）
  children: ReactNode;   // 主内容
};

export default function Layout({ header, sidebar, children }: LayoutProps) {
  return (
    <div className={`layout ${sidebar ? 'layout--with-sidebar' : ''}`}>
      {header && <header className="layout__header">{header}</header>}
      <div className="layout__main">
        {sidebar && <aside className="layout__sidebar">{sidebar}</aside>}
        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
}

// 调用方：侧栏是菜单还是工具箱、顶栏放什么，Layout 一概不知——
// <Layout header={<TopBar user={user} />} sidebar={<SideMenu items={menus} />}><Outlet /></Layout>
// （路由内容作为主插槽，天然契合 React Router）
```

**什么时候配置式仍然合理。** 三种场景：其一，**刻意收紧自由度**的设计系统原子组件——`Button` 的 `variant/size` 用封闭枚举，就是要防止业务方塞任意结构保持视觉一致；其二，**本质是数据驱动的组件**——Table 的 `columns: Column[]` 是"用数据描述渲染"，不是配置爆炸；其三，**插槽数量失控**（超过 6–7 个）时，说明组件职责过多，该拆组件而不是继续加格子。判断标准一句话：调用方需要掌控**渲染结构**时用组合，只需要切换**预设样式**时用配置。

**常见坑。**

- **症状**：想"调用时才决定渲染内容"，但 `title={<Title/>}` 在父组件 render 时就执行了。**根因**：JSX 元素是描述，传入即创建；需要调用时求值应传函数。**修法**：类型写 `title?: ReactNode | ((data: T) => ReactNode)`，渲染时 `typeof title === 'function' ? title(data) : title`。（另一高频错觉是"插槽没生效"——插槽只透传不改变子组件，先裸渲染验证子组件自身再塞进插槽。）
- **症状**：重构后 Card 头部多了空 div 把布局顶出一条缝。**根因**：插槽守卫用了真值判断，`title={''}` 与"传了 extra 没传 title"等组合漏判。**修法**：守卫统一 `!== undefined`，并用"任一插槽存在才渲染容器"的组合条件。
- **症状**：为了塞更多区块，插槽从 3 个加到 7 个。**根因**：把组合当成了新的配置——插槽是有限的结构区域，不是逃生舱。**修法**：超过 5 个插槽就把内容区整体交给 `children`，由调用方自己堆叠。

### 模式 3｜Compound Components：手写 Tabs

**是什么。** 复合组件是一组**配套使用**的组件（`Tabs` / `Tabs.List` / `Tabs.Tab` / `Tabs.Panel`），对外是一个命名空间，对内通过 Context 隐式共享状态。HTML 原生就有这个模式：`<select>` 与 `<option>`——`<option>` 从不接收 `selected` props，谁被选中由 `<select>` 统一管。

**为什么需要。** 写 Tabs 有三条路。路一：单组件 + `items` 数组——把"页签怎么渲染、面板放什么"全收进组件，调用方想给某页签加小红点就得加 prop。路二：独立组件 + props 透传——`activeId`、`onChange` 由调用方在 List/Panel 间手动搬运，用一次接一次。路三（正解）：复合组件——根组件持有"当前激活 id"这一个事实，`Tab` 和 `Panel` 各自从 Context 订阅自己关心的部分：`Tab` 只关心"我是否激活"，`Panel` 只关心"要不要渲染"。调用方只声明结构，不搬运状态。

**怎么做（机制分步）。** ① 根组件持有 `activeId`，子组件挂载时注册 id（第一个注册者自动成为默认激活项）；② Context 下发 `activeId`（读）、`activate`（写）、`idsRef`（全部页签 id，供键盘导航）、`register`；③ `Tab` 渲染时对比 `activeId === id` 决定高亮与 `aria-selected`；④ `Panel` 在 `activeId !== id` 时 `return null`（要保留面板内部状态可改 `hidden`，见坑位）；⑤ 键盘导航挂 `List`：`ArrowLeft/ArrowRight/Home/End` 在 `idsRef` 里环形移动并让焦点跟随（roving tabindex：激活项 `tabIndex=0`，其余 `-1`）；⑥ `Tabs.List = TabsList` 等拼装命名空间。

**代码示例：完整可运行的 Tabs。**

```tsx
// Tabs.tsx
import {
  createContext, useContext, useState, useRef, useCallback, useEffect,
  type ReactNode, type KeyboardEvent, type HTMLAttributes,
} from 'react';

// ---------- 1. Context：内部共享的状态与操作 ----------
type TabsContextValue = {
  activeId: string | null;            // 当前激活的页签 id
  activate: (id: string) => void;     // 切换激活
  idsRef: { current: string[] };      // 按注册顺序收集的所有页签 id
  register: (id: string) => void;     // 页签挂载时注册
};

const TabsContext = createContext<TabsContextValue | null>(null);

// 内部工具：保证子组件一定在 <Tabs> 内使用，错误信息直接指路
function useTabsContext(part: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${part}> 必须作为 <Tabs> 的后代使用`);
  return ctx;
}

// ---------- 2. 根组件：唯一的状态持有者 ----------
function Tabs({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const idsRef = useRef<string[]>([]);

  // 注册即"报到"：第一个报到者自动成为默认激活项（prev ?? id 保证了这一点）
  const register = useCallback((id: string) => {
    if (!idsRef.current.includes(id)) {
      idsRef.current = [...idsRef.current, id];
    }
    setActiveId(prev => prev ?? id);
  }, []);

  const activate = useCallback((id: string) => setActiveId(id), []);

  return (
    <TabsContext.Provider value={{ activeId, activate, idsRef, register }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// ---------- 3. List：页签容器 + 键盘导航 ----------
function TabsList({ children, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const { activeId, activate, idsRef } = useTabsContext('Tabs.List');

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ids = idsRef.current;
    if (ids.length === 0) return;
    const current = ids.indexOf(activeId ?? '');
    let next: number;
    switch (e.key) {
      case 'ArrowRight': next = (current + 1) % ids.length; break;               // 右：环形下一个
      case 'ArrowLeft':  next = (current - 1 + ids.length) % ids.length; break;  // 左：环形上一个
      case 'Home':       next = 0; break;
      case 'End':        next = ids.length - 1; break;
      default: return;                 // 其余按键不拦截，交给浏览器
    }
    e.preventDefault();                // 阻止方向键滚动页面
    activate(ids[next]);
    document.getElementById(`tab-${ids[next]}`)?.focus();   // 焦点跟随（roving tabindex）
  };

  return <div role="tablist" onKeyDown={handleKeyDown} {...rest}>{children}</div>;
}

// ---------- 4. Tab：单个页签 ----------
function TabsTab({ id, children }: { id: string; children: ReactNode }) {
  const { activeId, activate, register } = useTabsContext('Tabs.Tab');

  useEffect(() => {
    register(id);   // 挂载报到：兄弟 effect 按序执行 → ids 顺序 = 渲染顺序
  }, [id, register]);

  const isActive = activeId === id;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}                     // 与 Panel 的 aria-controls 配对
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}         // 只有激活项进 Tab 序列
      className={isActive ? 'tab tab--active' : 'tab'}
      onClick={() => activate(id)}
    >
      {children}
    </button>
  );
}

// ---------- 5. Panel：内容面板 ----------
function TabsPanel({ id, children }: { id: string; children: ReactNode }) {
  const { activeId } = useTabsContext('Tabs.Panel');
  if (activeId !== id) return null;   // 不激活不渲染（换 hidden 可保留子树状态）
  return (
    <section role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </section>
  );
}

// ---------- 6. 命名空间拼装 ----------
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;

export default Tabs;
```

```tsx
// TabsDemo.tsx
import Tabs from './Tabs';

export default function TabsDemo() {
  return (
    <Tabs>
      <Tabs.List>
        <Tabs.Tab id="account">账号</Tabs.Tab>
        <Tabs.Tab id="security">安全</Tabs.Tab>
        <Tabs.Tab id="notify">通知</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="account"><AccountSettings /></Tabs.Panel>
      <Tabs.Panel id="security"><SecuritySettings /></Tabs.Panel>
      <Tabs.Panel id="notify"><NotifySettings /></Tabs.Panel>
    </Tabs>
  );
}

function AccountSettings() { return <p>账号设置：手机号、邮箱、注销…</p>; }
function SecuritySettings() { return <p>安全设置：改密码、两步验证、登录设备…</p>; }
function NotifySettings()   { return <p>通知设置：邮件、短信、站内信…</p>; }
```

注意调用方体验：没有任何"接线"代码——不知道也不需要知道 `activeId` 存在；每个 `Panel` 里放什么组件、什么结构，渲染权全在调用方手里。

**常见坑。**

- **症状**：`<Tabs.Tab>` 拿到别的组件里用，白屏并抛 `必须作为 <Tabs> 的后代使用`。**根因**：Context 默认值为 null，这是**故意的**——用 throw 替代静默降级。**修法**：这本身就是修法；给 Context 塞默认值会让误用变成难查的隐性 bug。
- **症状**：切换页签后，面板里填了一半的表单被清空。**根因**：`Panel` 用 `return null` 卸载子树，卸载即 state 销毁。**修法**：改常挂载 + 隐藏：`<section hidden={activeId !== id}>`，子树保留、状态不丢，代价是所有面板首渲染成本前置。
- **症状**：动态插入/删除页签时高亮错乱。**根因**：本实现假设页签集合基本静态，`idsRef` 只增不减。**修法**：静态页签够用；动态页签给 `register` 配 `unregister`（effect cleanup 里调用），或直接用 Radix UI / React Aria 这类处理了所有边角的实现。
- **症状**：键盘导航偶尔"跳两格"。**根因**：keydown 同时挂在 `List` 和每个 `Tab` 上，冒泡导致处理两次。**修法**：导航逻辑只挂一层（`List`），按钮上不重复挂。

### 模式 4｜Render Props：手写 MouseTracker、滚动位置组件

**是什么。** Render Props 指组件接收一个**函数 prop**（传统叫 `render`，或直接用 `children`），组件负责"行为"（监听鼠标/滚动），把行为产出的**状态**回传给函数，由函数决定渲染什么。签名：`(state) => ReactNode`。

**为什么需要。**"鼠标位置""滚动进度"这类行为天然可复用，但 UI 千变万化：跟随光标的圆点、坐标读数、视差背景。组件把 UI 写死则复用性为零；UI 配置化（`dotColor`、`showLabel`）就回到配置爆炸。Render Props 把行为和渲染切开：行为留在组件里，渲染通过函数彻底外包。

**怎么做（机制分步）。** ① `useEffect` 里订阅浏览器事件，最新值写 state；② 组件体内不写具体 UI，只执行 `render(state)` / `children(state)`；③ 卸载时解绑事件；④ 调用方用函数接收 state，返回任意 JSX——同一行为 N 种 UI。

**代码示例：MouseTracker 与 ScrollTracker。**

```tsx
// MouseTracker.tsx
import { useEffect, useState, type ReactNode } from 'react';

export type Position = { x: number; y: number };

type MouseTrackerProps = {
  children?: (position: Position) => ReactNode;   // children 直接是函数（函数式 children）
  // 想兼容传统命名再加一个 render?: (p: Position) => ReactNode，取 render ?? children 即可
};

export default function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);   // 卸载解绑，防泄漏
  }, []);

  if (!children) return null;
  return <>{children(position)}</>;   // 行为产出交给调用方的函数
}
```

```tsx
// ScrollTracker.tsx —— 当前 y + 全文阅读进度
import { useEffect, useState, type ReactNode } from 'react';

export type ScrollState = { y: number; progress: number };

export default function ScrollTracker({ children }: { children: (state: ScrollState) => ReactNode }) {
  const [state, setState] = useState<ScrollState>({ y: 0, progress: 0 });

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;    // 可滚动的总距离
      const y = window.scrollY;
      setState({ y, progress: max > 0 ? y / max : 0 });     // 0 ~ 1
    };
    onScroll();   // 挂载先同步一次，避免首帧永远是 0
    window.addEventListener('scroll', onScroll, { passive: true });  // passive：不拦截滚动
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <>{children(state)}</>;
}
```

```tsx
// TrackerDemo.tsx —— 同一行为，三种完全不同的 UI
import MouseTracker from './MouseTracker';
import ScrollTracker from './ScrollTracker';

export default function TrackerDemo() {
  return (
    <div>
      {/* UI 1：跟随光标的圆点 */}
      <MouseTracker>
        {({ x, y }) => (
          <span style={{
            position: 'fixed', left: x, top: y, width: 8, height: 8,
            borderRadius: '50%', background: 'tomato',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none',
          }} />
        )}
      </MouseTracker>

      {/* UI 2：坐标读数 */}
      <MouseTracker>{({ x, y }) => <code>x: {x}, y: {y}</code>}</MouseTracker>

      {/* UI 3：顶部阅读进度条 */}
      <ScrollTracker>
        {({ progress }) => (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: '#eee' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', background: 'rebeccapurple' }} />
          </div>
        )}
      </ScrollTracker>
    </div>
  );
}
```

**与自定义 Hook 的等价转换。** 任何不渲染自己 DOM、纯靠回调状态工作的 Render Props 组件，都能 1:1 翻译成 Hook：

```tsx
// useTrackers.ts —— 上面两个组件的 Hook 版
import { useEffect, useState } from 'react';

export function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);
  return position;
}

export function useScrollProgress() {
  const [state, setState] = useState({ y: 0, progress: 0 });
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setState({ y: window.scrollY, progress: max > 0 ? window.scrollY / max : 0 });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return state;
}

// 用法对比：产出完全等价
// Render Props 版：<MouseTracker>{({ x, y }) => <Dot x={x} y={y} />}</MouseTracker>
function Dot() {
  const { x, y } = useMousePosition();   // Hook 版：不引入额外 JSX 层级
  return <span style={{ position: 'fixed', left: x, top: y }}>●</span>;
}
```

怎么选：**Hook 版是更好的默认**——零额外 JSX 层级、多个 Hook 值可直接运算组合、能参与其他 Hook 的依赖。**Render Props 三个不可替代场景**：行为组件必须渲染**自己的 DOM** 并在其上挂事件（拖拽容器、虚拟滚动视口）；需要把状态喂给调用方在组件上下文里执行的渲染（少数老库 API）；以及其他极端约束。2020 年后新库基本都提供 Hook 形态（Downshift、react-virtual 双形态并存），但读老代码与组件库源码时它是必修词汇。

**常见坑。**

- **症状**：组件卸载后内存持续上涨（旧版 React 还有 unmounted setState 警告）。**根因**：事件订阅没写清理函数，回调闭包引用着已卸载组件的 setter。**修法**：`useEffect` 必须 `return () => removeEventListener(...)`，这是本模式的生命线。
- **症状**：函数 children 传给 `children: ReactNode` 类型的组件，类型报错或渲染出函数源码。**根因**：`ReactNode` 不含函数形态。**修法**：类型显式声明 `children: (state) => ReactNode`（如 `MouseTrackerProps`），TS 在调用方就拦住误用。
- **症状**：`React.memo` 的子组件接收 render props 时 memo 永远失效。**根因**：每次外层渲染都生成新的内联函数，引用必变，浅比较必失败。**修法**：调用方 `useCallback` 固定引用，或改 Hook 版让这层组件边界消失。另注意 ScrollTracker 若首屏进度不对，是漏了"挂载时先同步一次初值"（刷新后浏览器恢复滚动不触发 scroll 事件），effect 里先手动调一次即可。

### 模式 5｜Props drilling：先写一个透传 5 层的痛，再用 Context 解决

**是什么。** Props drilling（属性钻透）指数据从顶层出发，途经一串**自己不用这个数据**的中间组件层层转发到深层消费者。它不是语法错误，是维护性问题：中间每层都被迫在 props 签名里声明与自己无关的数据。

**为什么需要"先痛一下"。** Context 是解药，但吃多了有副作用（隐式依赖、大范围重渲染）。判断"该不该上 Context"的唯一可靠方法就是徒手透传一次：2 层是健康的显式数据流，5 层是灾难。没痛过的人会把所有状态塞进全局 Context，制造更大的灾难。

**怎么做（机制分步）——第一步：制造痛感。** 应用要切换主题，按钮埋在第 5 层：

```tsx
// DrillingPain.tsx —— 一份状态，五层传送
import { useState } from 'react';

// 第 1 层：App 是状态的主人
function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <PageLayout
      theme={theme}   // ↓ 开始下传（第 1 跳）
      onToggleTheme={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
    />
  );
}

// 第 2 层：PageLayout 只关心布局，却被迫接住并转发两个与它无关的 props
function PageLayout({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  return (
    <div className={`layout layout--${theme}`}>
      <Sidebar theme={theme} onToggleTheme={onToggleTheme} />   {/* ← 第 2 跳 */}
      <main>内容区（不关心主题，却因 App 状态变化跟着重渲染）</main>
    </div>
  );
}

// 第 3 层：纯过路费缴纳者
function Sidebar({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  return <nav className="sidebar"><NavMenu theme={theme} onToggleTheme={onToggleTheme} /></nav>;   // ← 第 3 跳
}

// 第 4 层：继续转发……
function NavMenu({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  return <ul><NavItem theme={theme} onToggleTheme={onToggleTheme} label="设置" /></ul>;   // ← 第 4 跳
}

// 第 5 层：终于有人用上了
function NavItem({ theme, onToggleTheme, label }: { theme: 'light' | 'dark'; onToggleTheme: () => void; label: string }) {
  return (
    <li>
      <span>{label}</span>
      <button onClick={onToggleTheme}>主题：{theme}（点击切换）</button>
    </li>
  );
}

export default App;
```

痛感清单：`theme`/`onToggleTheme` 出现在 **5 个组件签名**里，其中 3 个纯搬运；改字段名（`theme` → `colorMode`）连改 5 个文件；第 6 层再来一个消费者要再铺一条管线；中间任何一层多个本地 state 都会把整条链搅进无关重渲染。

**第二步：用 Context 拆掉传送带。**

```tsx
// ThemeContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

// 拆成两个 Context：只读主题的和只写主题的，消费端互不拖累（见下文"为什么拆"）
const ThemeContext = createContext<Theme>('light');
const ThemeDispatchContext = createContext<() => void>(() => {});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={toggle}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeContext.Provider>
  );
}

// 自定义 Hook 收口：调用方不需要知道 Context 的存在
export const useTheme = () => useContext(ThemeContext);
export const useToggleTheme = () => useContext(ThemeDispatchContext);
```

```tsx
// App.tsx —— 中间三层签名彻底干净
import { ThemeProvider, useTheme, useToggleTheme } from './ThemeContext';

function App() {
  return <ThemeProvider><PageLayout /></ThemeProvider>;
}

function PageLayout() {                                     // 不再认识 theme
  return <div className="layout"><Sidebar /><main>内容区</main></div>;
}
function Sidebar() { return <nav className="sidebar"><NavMenu /></nav>; }
function NavMenu() { return <ul><NavItem label="设置" /></ul>; }

// 第 5 层：Hook 直取，中间无感知
function NavItem({ label }: { label: string }) {
  const theme = useTheme();
  const toggle = useToggleTheme();
  return (
    <li>
      <span>{label}</span>
      <button onClick={toggle}>主题：{theme}（点击切换）</button>
    </li>
  );
}

export default App;
```

为什么拆两个 Context？合成一个 `value={{ theme, toggle }}` 的话，Provider 每次渲染都创建新对象，**所有**消费者重渲染——哪怕只是 `theme` 变了而某消费者只用 `toggle`。拆开后 `toggle` 引用稳定，只消费它的组件在主题切换时完全不重渲染。这是 Context 性能管理的第一课，阶段 5 系统展开。反向原则同样记牢：**1–2 层透传不是病**，`Parent → Child` 传两个 props 是最健康的数据流；Context 的适用线是"多个深层消费点 + 数据天然全局（主题、语言、当前用户、权限）"，不是"懒得传"。

**常见坑。**

- **症状**：上了 Context 后改一个输入框，全部消费者重渲染、输入卡顿。**根因**：高频变化的状态（输入值、鼠标位置）进了 Provider value，任何变化广播全场。**修法**：高频状态留在局部或用 `useDeferredValue`；必须全局的按"读/写拆分 + 精确订阅"重构（Zustand 的 selector 是这条路的终态，见阶段 5）。
- **症状**：忘了包 Provider，组件拿到默认值，不报错但行为诡异。**根因**：`createContext(defaultValue)` 的默认值在无 Provider 时静默生效，掩盖接线遗漏。**修法**：对"必须有 Provider"的 Context，默认值设 `null` 并在自定义 Hook 里 throw（Tabs 已示范）。
- **症状**：Provider 因别的 state 重渲染，value 没变消费者却全刷。**根因**：`value={{ a, b }}` 每次渲染都是新对象，引用相等性失效。**修法**：`useMemo` 包住 value；或拆 Context 让不变的那半天然稳定。

### 模式 6｜状态提升 vs 下放：把"只影响子树"的状态下放以缩小渲染范围

**是什么。** 同一份状态放的高度不同代价不同。**提升**：搬到公共祖先，兄弟都能读写——代价是祖先每次 state 变化重渲染整棵子树。**下放**：搬到"使用它的最小子树的根"——树外拿不到它，而拿不到恰恰说明它不该给它们。修炼点：**默认下放，兄弟确实共享才提升，提升后再用隔离手段收缩波及面**。

**为什么需要。** React 的重渲染单位是组件，触发条件是自身 state 变化或父组件重渲染。状态放得越高，每次变化拖下水的子树越大。"5000 行表格页面因为顶部搜索框每次击键而整页重渲染"是真实项目最常见性能事故，修法往往不是加 memo，而是搬家。

**怎么做（机制分步）。** ① 画出状态的消费范围（谁读、谁写）；② 找到消费范围的**最小公共祖先**——状态住这里（不是"整个应用的祖先"）；③ 祖先之上还有大片无关子树时，用 children 把无关子树隔离出去（元素引用稳定时 React 跳过其重渲染）；④ DevTools Profiler 验证：状态变化的高亮范围应与消费范围重合。

**代码示例：同一需求的两种摆法。** 需求：顶栏搜索框 + 侧栏 + 大表；搜索词目前只用于表头显示。

```tsx
// LiftVsDownA.tsx —— 版本 A：状态提升到 App（错误示范）
import { useState } from 'react';

export default function AppA() {
  const [keyword, setKeyword] = useState('');   // 状态住在最顶层
  return (
    <>
      <Toolbar value={keyword} onChange={setKeyword} />
      <Sidebar />        {/* 与 keyword 无关 */}
      <HugeTable />      {/* 与 keyword 无关，却每次击键都被拖下水 */}
    </>
  );
}

function Toolbar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder="搜索…" />;
}

function Sidebar()   { return <aside>{/* 200 个菜单项 */}</aside>; }
function HugeTable() { return <table>{/* 5000 行 */}</table>; }
```

文字版渲染路径分析（版本 A，每敲一键）：

```text
击键 → onChange → setKeyword 发生在 App
  → App 函数重新执行（state 属于它）
  → 三个子元素的引用都是本次 render 新建的 → React 逐个重渲染：
      Toolbar   ：显示 keyword，需要重渲染 ——合理
      Sidebar   ：不需要，但整棵子树照常重新执行 ——浪费
      HugeTable ：同上，5000 行 reconcile ——事故现场
结论：一次击键 = 1 次合理重渲染 + 2 次陪葬
```

```tsx
// LiftVsDownB.tsx —— 版本 B：状态下放到 Toolbar（消费范围的最小根）
import { useState } from 'react';

export default function AppB() {
  return (
    <>
      <Toolbar />        {/* 状态自包含，App 对 keyword 一无所知 */}
      <Sidebar />
      <HugeTable />
    </>
  );
}

function Toolbar() {
  const [keyword, setKeyword] = useState('');   // 只有 Toolbar 子树消费它
  return (
    <>
      <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索…" />
      <span>关键词：{keyword}</span>
    </>
  );
}
// Sidebar / HugeTable 同版本 A
```

```text
击键 → setKeyword 发生在 Toolbar 内部
  → App 根本不执行（它的 state 没变，也没人给它传新 props）
  → 只有 Toolbar 子树重渲染（input + span）
  → Sidebar / HugeTable 与事发地无任何数据通路，零感知
结论：重渲染范围 = 消费范围，这正是"状态下放"要达到的形态
```

**第三种情况：状态确实被两层共享。** 当下一迭代要求 HugeTable 按关键词过滤，keyword 的消费范围变成"Toolbar + HugeTable"，最小公共祖先是页面容器——提升到那里，且**只**到那里：

```tsx
// LiftVsDownC.tsx —— 提升到"消费范围的最小公共祖先"，并用 memo 保住无关子树
import { memo, useState } from 'react';

function SearchPage() {
  const [keyword, setKeyword] = useState('');
  return (
    <>
      <Toolbar value={keyword} onChange={setKeyword} />
      <MemoSidebar />                  {/* memo：props 恒为空 → 浅比较通过 → 跳过重渲染 */}
      <HugeTable keyword={keyword} />  {/* 消费者，重渲染合理；内部可再虚拟化（见 4.3） */}
    </>
  );
}
const MemoSidebar = memo(function Sidebar() { return <aside>{/* 200 个菜单项 */}</aside>; });
function HugeTable({ keyword }: { keyword: string }) { return <table>{/* 过滤后的行 */}</table>; }
```

```tsx
// LiftVsDownD.tsx —— 变体：状态必须在顶层时，用 children 隔离无关子树
import { useState, type ReactNode } from 'react';

function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);   // 只影响 Drawer 自身
  return (
    <>
      <button onClick={() => setDrawerOpen(v => !v)}>菜单</button>
      {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} />}
      {children}   {/* children 由父级创建，引用跨渲染稳定 → React 跳过这棵子树的重渲染 */}
    </>
  );
}
// 调用方：<AppShell><PageContent /></AppShell> —— drawerOpen 翻转时 PageContent 不重渲染
```

`children` 隔离的原理：`setDrawerOpen` 触发 AppShell 重渲染，但 children prop 是**调用方上一次渲染产出的同一个元素对象**，React 对相同引用直接跳过（bail out）。这正是模式 2"组合优于配置"在性能维度的红利：插槽内容天然与宿主状态变化隔离。

**常见坑。**

- **症状**：大页面打字卡顿，Profiler 显示每次击键整页 commits。**根因**：输入状态被提升到页面根组件（顺手放第一个组件里，或为了给兄弟用），整棵树陪葬。**修法**：按"最小公共祖先"搬家；搬不动的用 children 隔离或对无关子树 memo。顺序是先搬家、后 memo——memo 是给"必须留在高处"的状态善后，不是掩盖懒惰的绷带。
- **症状**：为了下放状态把组件拆得粉碎，props 反而多了一堆。**根因**：把"下放"执行成"无脑下沉到叶子"，破坏内聚。**修法**：下放目标是"消费范围的最小**根**"，不是"尽可能深"；某状态 80% 在叶子用、20% 要汇报父级的，用受控模式或回调上报，而不是两头都存。
- **症状**：加了 memo 的子组件还是重渲染。**根因**：memo 只挡浅比较通过的 props；每次传新的内联函数/对象字面量，比较必失败。**修法**：配合 `useCallback`/`useMemo` 稳定引用，或改 children 插槽让子树引用天然稳定（AppShell 例）。

### 模式 7｜容器/展示分离：数据逻辑与 UI 分层（不必教条）

**是什么。** 容器组件（Container）负责**怎么拿数据**：发请求、管 loading/error、订阅 store；展示组件（Presentational）负责**数据长什么样**：只吃 props 渲染 UI，自己不发起任何 IO。一个页面组件拆成"取数的壳 + 画面的芯"。

**为什么需要。** 三个实际收益：**可复用**——同一个 View 可配不同容器（搜索结果页、详情页、@提及弹窗共用一张用户卡片）；**可测试**——展示组件喂 props 断言 DOM 即可，不用 mock 网络；**可设计**——没有后端接口时用假 props 先把 UI 做完。"不必教条"的原因同样实际：一对一消费的容器/展示对只产出两份文件、双倍维护，什么也没换来。

**怎么做（机制分步）。** ① 取数与状态机收进容器，容器不写一行 UI；② 展示组件的 props 按 **UI 的需要**设计，不照抄接口返回结构；③ 容器把数据与回调喂给 View；④（现代版）容器逻辑再抽成自定义 Hook，容器退化成几行胶水——"Hook + View"是当下更常见的形态。

**代码示例：经典两层 + Hook 重构版。**

```tsx
// UserProfile.tsx —— ① 展示组件：纯 props 驱动，可直接进 Storybook
export type UserProfileViewProps = {
  user: { name: string; avatar: string; bio: string } | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function UserProfileView({ user, loading, error, onRetry }: UserProfileViewProps) {
  if (loading) return <p className="profile-loading">加载中…</p>;
  if (error) {
    return (
      <div className="profile-error">
        <p>加载失败：{error}</p>
        <button onClick={onRetry}>重试</button>
      </div>
    );
  }
  if (!user) return null;
  return (
    <div className="user-profile">
      <img className="user-profile__avatar" src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </div>
  );
}
```

```tsx
// ② 经典容器：取数与状态机 + 一行渲染 View（示意骨架；完整写法即把 ③ 的 Hook 逻辑平移进组件）
function UserProfileContainer({ userId }: { userId: number }) {
  const { user, loading, error, refetch } = useUserProfile(userId);   // ③ 的 Hook
  return <UserProfileView user={user} loading={loading} error={error} onRetry={refetch} />;
}
```

```tsx
// ③ 现代版：取数逻辑抽成自定义 Hook——"容器"退化成一个 Hook，页面组件三行接线
// useUserProfile.ts
import { useCallback, useEffect, useState } from 'react';

export function useUserProfile(userId: number) {
  const [user, setUser] = useState<{ name: string; avatar: string; bio: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUser(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refetch(); }, [refetch]);
  return { user, loading, error, refetch };
}

// 页面组件：Hook 负责数据、View 负责渲染，职责分明且不再有独立容器文件
import { useUserProfile } from './useUserProfile';

export function UserProfile({ userId }: { userId: number }) {
  const { user, loading, error, refetch } = useUserProfile(userId);
  return <UserProfileView user={user} loading={loading} error={error} onRetry={refetch} />;
}
```

**何时有价值 / 何时教条。** 有价值：同一 UI 有多数据源或多使用场景；UI 复杂到值得在后端就绪前独立开发；UI 与数据逻辑由不同人维护。教条：一对一消费也强行拆两个文件；展示组件的 props 是后端 DTO 的镜像（`dto1`、`extJson` 原样透传）——那不是分层是分层错觉；Next.js RSC 时代取数大量上移到 Server Component，客户端容器层进一步萎缩，"Hook + View"基本是客户端残留取数场景的最终形态。判断标准：**拆分的收益（复用/测试/并行开发）大于成本（文件数/跳转/双倍维护）才拆**。

**常见坑。**

- **症状**：所谓展示组件里出现了 `fetch`/`useQuery`，测试不得不 mock 一堆网络。**根因**：分层被"临时在这里取一下"渐进式侵蚀。**修法**：展示组件立规矩"只吃 props"；code review 看到展示组件 import 请求模块就是红旗。
- **症状**：容器与展示的 props 接口高度重合，改一个字段同步改三处。**根因**：View 接口照抄了后端 DTO。**修法**：View 的 props 表达"这块 UI 需要什么"（`avatar`、`displayName`），容器/Hook 层做一次映射，接口变更只改映射层。
- **症状**：全项目每个组件机械拆成 XxxContainer + XxxView，目录翻倍、大量 View 只有一个消费者。**根因**：把手段当目的。**修法**：一对一场景合并为"组件 + useXxx Hook"；出现第二个消费者或需要独立开发/测试时再拆。

### 模式 8｜泛型组件（TS）：写一个 `List<T>` / `Select<T>`

**是什么。** 泛型组件是带类型参数的组件：`List<T>` 不规定元素是什么，但保证"你传进来的 T 会在 `renderItem`、`keyOf` 等回调里原样还给你"。传 `User[]`，回调参数自动是 `User`；传 `Order[]`，自动是 `Order`——**类型从 props 自动推导**，调用方一行泛型都不用写。

**为什么需要。** 不用泛型只有两条路：`items: any[]`（类型全丢，字段拼错编译期不报）或为每种元素复制一套 `UserList`/`OrderList`。泛型组件是第三条路：**实现写一次，类型千次定制**。它也是阶段 7（TS 专题）的前哨。

**怎么做（机制分步）。** ① 用**函数声明** `function List<T>(...)` 定义组件（原因见坑位 2）；② 泛型出现在三处：props 类型 `ListProps<T>`、参数解构、约束 `T extends {...}`；③ 推导链：传 `items={users}` → TS 从 `items: T[]` 反解 `T = User` → 同一个 T 立刻约束 `renderItem: (item: User) => ReactNode` 与 `keyOf: (item: User) => string`；④ 推导失败或要收窄联合类型时可显式 `<List<User> .../>`，但好 API 应让推导默认成立。

**代码示例：`List<T>` 完整实现与推导演示。**

```tsx
// List.tsx
import type { ReactNode } from 'react';

type ListProps<T> = {
  items: T[];                                        // T 的"源头"：由它推导一切
  renderItem: (item: T, index: number) => ReactNode; // T 回流到回调
  keyOf: (item: T) => string;                        // key 提取交给调用方：不假设 T 有 id 字段
  empty?: ReactNode;                                 // 空态插槽
};

function List<T>({ items, renderItem, keyOf, empty }: ListProps<T>) {
  if (items.length === 0) {
    return <ul className="list">{empty ?? <li className="list__empty">暂无数据</li>}</ul>;
  }
  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={keyOf(item)} className="list__item">{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

export default List;
```

```tsx
// ListDemo.tsx —— 类型如何"从 props 长出来"
import List from './List';

type User = { id: number; name: string; vip: boolean };
type Order = { orderNo: string; amount: number };

const users: User[] = [
  { id: 1, name: '张三', vip: true },
  { id: 2, name: '李四', vip: false },
];
const orders: Order[] = [{ orderNo: 'A001', amount: 199 }];

export default function ListDemo() {
  return (
    <>
      {/* 传 items={users} 的瞬间 T 被推导为 User：
          renderItem 的 item 自动是 User，item.nmae 之类的拼写错误直接编译报错 */}
      <List
        items={users}
        keyOf={u => String(u.id)}
        renderItem={u => <span>{u.name} {u.vip && <strong>VIP</strong>}</span>}
      />

      {/* 同一个组件，T 变成 Order，回调参数随之变 */}
      <List
        items={orders}
        keyOf={o => o.orderNo}
        renderItem={o => <span>订单 {o.orderNo}：¥{o.amount}</span>}
      />
    </>
  );
}
```

**代码示例：带约束的 `Select<T>`（完整可运行的精简下拉）。**

```tsx
// Select.tsx
import { useEffect, useRef, useState } from 'react';

// 约束：T 至少有 value/label——没有这两个字段就没法渲染选项
type BaseOption = { value: string; label: string };

type SelectProps<T extends BaseOption> = {
  options: T[];
  value: T | null;                 // 选中项是完整的 T（而非只剩 value 字符串）
  onChange: (option: T) => void;   // 回调把完整对象还给调用方
  placeholder?: string;
};

function Select<T extends BaseOption>({ options, value, onChange, placeholder = '请选择' }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 点击组件外部时收起下拉
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="select" ref={rootRef}>
      <button type="button" className="select__trigger" onClick={() => setOpen(o => !o)}>
        {value ? value.label : placeholder}
      </button>
      {open && (
        <ul className="select__menu" role="listbox">
          {options.map(opt => (
            <li key={opt.value} role="option" aria-selected={value?.value === opt.value}>
              <button
                type="button"
                className="select__option"
                onClick={() => { onChange(opt); setOpen(false); }}   // 整个 T（含附加字段）回传
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Select;
```

```tsx
// SelectDemo.tsx —— 约束 + 扩展字段是泛型组件的甜点
import Select from './Select';

type UserOption = { value: string; label: string; avatar: string };   // 在 BaseOption 上扩展 avatar

const userOptions: UserOption[] = [
  { value: 'u1', label: '张三', avatar: '/avatars/zs.png' },
  { value: 'u2', label: '李四', avatar: '/avatars/ls.png' },
];

// T 被推导为 UserOption：onChange 的 opt 能访问 opt.avatar，而不是只剩 value/label
<Select options={userOptions} value={userOptions[0]}
         onChange={opt => console.log('选中', opt.label, opt.avatar)} placeholder="指派负责人" />
```

**进阶：泛型组件 + ref 透传。** `forwardRef` 的类型参数不认识外部泛型，直接套会丢类型，标准解法是"内部函数 + 类型断言包装"：

```tsx
// SelectWithRef.tsx —— 泛型不因 forwardRef 而丢失
import { forwardRef, type ReactElement, type Ref } from 'react';
import Select, { type SelectProps } from './Select';

// 内部函数保留泛型签名，ref 作为普通 prop（React 19 起函数组件可直接接收 ref prop）
function SelectInner<T extends { value: string; label: string }>(
  props: SelectProps<T> & { ref?: Ref<HTMLDivElement> },
): ReactElement {
  return <Select {...props} />;
}

// 兼容 React 18：forwardRef 包装后整体断言回泛型签名，调用方仍能拿到 T 的推导
export default forwardRef(SelectInner) as <T extends { value: string; label: string }>(
  props: SelectProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;
```

**常见坑。**

- **症状**：`.tsx` 里写 `const List = <T>(...) => {...}` 报语法错。**根因**：TSX 把 `<T>` 当 JSX 标签解析。**修法**：加逗号 `<T,>` 消歧，或（推荐）用函数声明 `function List<T>(...)`——组件库通行写法。
- **症状**：套了 `React.FC<ListProps<T>>`，T 变成 unknown，回调参数全丢。**根因**：`FC<P>` 是已填好具体类型的别名，不能携带未绑定泛型。**修法**：泛型组件用函数声明；`FC` 在 React 19 类型里也不再推荐。
- **症状**：`renderItem` 的 `item` 是 any，字段拼错不报。**根因**：`items` 类型被写成 `any[]`（未标类型的变量、`res.json()` 直接喂进来），推导链源头被污染，T = any 蔓延全身。**修法**：守好 `items` 的类型标注——请求层给 fetch 标注返回类型，推导链自然恢复。反向需求（限制"只能传 User"）则用约束 `T extends BaseOption`；单一用途组件干脆写死具体类型，别为了泛型而泛型。

### 模式 9｜组件库思维：API 设计、`forwardRef` 透传 ref、受控+非受控双模式兼容

**是什么。** 前八个模式练"单个组件怎么设计"，组件库思维是"一套组件的 API 怎么保持一致"：props 命名与形态的统一约定、事件与样式的透传规则、ref 的可达性、双模式兼容策略。业务组件写错影响一个页面，组件库 API 写错影响几百个调用点——API 每一寸都要有意为之。

**为什么需要。** 使用者对组件库的信任来自**可预测**：`Button` 上学到的 `size`、`Input` 上也能用；`onChange` 在任何组件上都回传字符串；`className` 永远是追加而不是覆盖。可预测性不是靠文档约束出来的，是靠设计原则约束出来的。

**怎么做（机制分步）：六条 API 设计原则。** ① **正交枚举替代布尔爆炸**：`variant: 'primary' | 'text' | 'danger'` 而非三个布尔——布尔合法组合 2^n（`primary` 和 `danger` 同 true 是什么？），枚举天然互斥；② **透传一切没接管的**：`{...rest}` 落到根元素、`className` 追加合并——调用方能加 `id`/`data-*`/`aria-*` 而不用提需求；③ **ref 必须可达**：`forwardRef` 转发到根 DOM（React 19 中 ref 可直接作为 prop，`forwardRef` 仍兼容但不再是必需）——调用方 `focus()`、量尺寸、挂 Popover 全靠它；④ **双模式兼容**：value/defaultValue 二选一（模式 1 的运行时判定）；⑤ **默认值兜底 + 无障碍默认**：`type="button"` 默认补上，`loading` 时自动 `disabled`；⑥ **不偷吃调用方的事件**：内部监听 `onClick` 做埋点也必须调用 `props.onClick?.(e)`——回调是调用方的财产。

**代码示例：综合以上原则的 Button。**

```tsx
// Button.tsx —— 正交枚举 + 透传 + ref + loading 语义
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'default' | 'danger';   // 互斥枚举，杜绝布尔组合爆炸
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;    // loading 语义：转圈 + 自动禁用 + 不吞点击
  block?: boolean;      // 是否撑满父容器宽度
  icon?: ReactNode;     // 图标插槽（组合式的最小体现）
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',    // 每个可变 prop 都有默认值：不传就是最常用形态
    size = 'md',
    loading = false,
    block = false,
    icon,
    className = '',
    disabled,
    children,
    ...rest,                // id/data-*/aria-*/style/onMouseEnter… 全部原样透传
  },
  ref,                      // ref 转发到原生 button：调用方可 focus/量尺寸/挂 Popover
) {
  const cls = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    block ? 'btn--block' : '',
    loading ? 'is-loading' : '',
    className,              // 调用方的 className 追加在默认类之后（合并而非覆盖）
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"                      // 关键默认值：不补这行，组件放进 <form> 就变成提交按钮
      className={cls}
      disabled={disabled || loading}     // loading 时自动禁用：调用方不必同时写两个条件
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {icon}
      {children}
    </button>
  );
});

export default Button;
```

双模式兼容的完整实现见模式 1 的 `Input`（`value`/`defaultValue` 运行时判定 + `forwardRef`），此处只强调组件库视角的要点：**双模式判定应沉到库的最底层输入组件**（Input/TextArea/Select），上层业务组件组合它们时自动继承双模式能力，而不是每层重写。完整的组件内功清单（受控/非受控、焦点管理、无障碍、样式方案、按需加载、Storybook 文档化）在《[react-组件库实战大纲.md](react-组件库实战大纲.md)》里系统展开。

**常见坑。**

- **症状**：Button 放进表单，一点就整表提交、页面刷新。**根因**：原生 `<button>` 默认 `type="submit"`。**修法**：`type="button"` 写死为默认；需要提交行为的显式传 `type="submit"` 覆盖（默认值在前、`{...rest}` 在后，调用方永远赢）。
- **症状**：调用方传的 `className` 生效但默认样式没了（或反之）。**根因**：className 被覆盖而非合并。**修法**：固定"默认类 + 调用方类"拼接顺序；Tailwind 项目可引入 `tailwind-merge` 处理同类冲突（`p-2 p-4` 取后者）。
- **症状**：组件内部要埋点，结果调用方的 `onClick` 不触发。**根因**：内部消费了事件没转发。**修法**：内部与外部并存：`onClick={(e) => { internalTrack(e); rest.onClick?.(e); }}`——事件是调用方的财产，组件只能顺便参与。
- **症状**：给库组件挂 ref 拿到的不是 DOM 节点，`focus()` 不存在。**根因**：忘了 `forwardRef`（React 18 及之前），或 ref 被转发到内部包装层而非根元素。**修法**：统一 `forwardRef` 到**根 DOM 元素**；React 19 可直接在 props 里解构 `ref`。

✅ 产出：手写一套迷你组件库（Button / Modal / Tabs / Select / Input），配 Storybook 文档。组件实现的完整功力清单与工程化见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》（通用内功 → 分级组件清单 → 工程化）。五个组件正好各验一个模式：Button→API 设计原则（模式 9）、Input→双模式（模式 1）、Tabs→复合组件（模式 3）、Select→泛型（模式 8）、Modal→Portal 与透传（阶段 4.5 展开）。

## 阶段 4：高频业务场景 ⭐实战核心（3 周）

阶段 1–3 练"零件"，本阶段造"整车"：真实业务界面 80% 是表单、数据请求、列表、路由弹层四类问题，本片段展开 4.1 表单全家桶（4.2 数据请求见下一片段）；学习路径是"徒手写 → 引出抽象 → 落到企业级方案"。4.1 的五条递进：先写痛感（第 1 条），再抽象自救，攻克字段增删（第 2 条）与步骤拆分（第 3 条），最后统一到企业级方案与联动（第 4、5 条）。

### 4.1 表单全家桶

1. 纯受控表单 → 抽象 `useForm`
2. 动态表单（字段动态增删、嵌套字段）
3. 多步表单（步骤间状态保留）
4. 校验：手写规则 → **react-hook-form + zod**（企业级标准）
5. 字段联动（省市区级联、某选项控制其他字段显隐）

#### 4.1.1 纯受控表单 → 抽象 `useForm`

**是什么。** 纯受控表单指每个字段的值都存在 React state 里、`value` 与 `onChange` 一对一接线的表单。它是所有表单方案的物理基础——后面不管是手写 `useForm` 还是 react-hook-form，本质都是在帮你**生成这套接线**。

**为什么需要抽象。** 先写徒手版看重复在哪：

```tsx
// SignupFormPlain.tsx —— 纯受控表单（徒手版）
import { useState, type FormEvent } from 'react';

export default function SignupFormPlain() {
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  // 每个字段都要有"写值 + 清错误"的样板
  const setField = (name: keyof typeof values, value: string) => {
    setValues(v => ({ ...v, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));   // 用户开始改了，先撤掉旧错误
  };

  // 校验规则全部堆在提交函数里
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
      const next: typeof errors = {};
      if (!values.username.trim()) next.username = '用户名必填';
      if (values.password.length < 8) next.password = '密码至少 8 位';
      if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = '邮箱格式不正确';
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;   // 有错误：拦下提交；全过则走提交逻辑
    };

  return (
    <form onSubmit={onSubmit} noValidate>
      <input value={values.username} onChange={e => setField('username', e.target.value)} placeholder="用户名" />
      {errors.username && <p className="form-error">{errors.username}</p>}
      <input value={values.email} onChange={e => setField('email', e.target.value)} placeholder="邮箱" />
      {errors.email && <p className="form-error">{errors.email}</p>}
      <input type="password" value={values.password} onChange={e => setField('password', e.target.value)} placeholder="密码" />
      {errors.password && <p className="form-error">{errors.password}</p>}
      <button type="submit">注册</button>
    </form>
  );
}
```

三个字段时还能忍，痛感在于：**每个字段三件套**（state 初始化、value 接线、onChange 接线）；**校验规则离字段十万八千里**（堆在 submit 里，想改失焦校验得另写一套）；**规则与字段名的关联靠字符串硬拼**（写错字段名 TS 不报）。字段到 15 个时这份样板 × 15。抽象方向也清晰了：把"值读写"和"规则注册"统一到一个 API——这正是 `useForm` 的雏形，也是 react-hook-form 的核心设计。

**怎么做（机制分步）：手写 mini useForm。** ① **values/errors 用 state**（渲染需要），**规则注册表用 ref**（注册发生在 render 里调用 `register` 时，用 state 会循环渲染，ref 不触发渲染且永远最新）；② `register(name, rules)` 在 JSX 里调用，返回 `{ name, value, onChange, onBlur }` 直接展开到 `<input>`——接线自动完成、规则就地注册；③ 校验时机三档：**失焦首验**（onBlur 标记 touched 并校验）+ **改动复验**（touched 的字段 onChange 时复验）+ **提交全验**（handleSubmit 跑完所有规则，全过才回调 onValid）；④ 声明式规则 `{ required, minLength, maxLength, pattern, validate }`，跨字段校验走 `validate(value, values)`。

**代码示例：mini useForm 完整实现。**

```tsx
// mini-use-form.ts
import { useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';

export type FormValues = Record<string, string>;

// 声明式规则：覆盖 90% 场景，剩下 10% 用 validate 函数兜底
export type FieldRules = {
  required?: string | true;   // true 用默认文案；传字符串即自定义文案
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;           // minLength/maxLength/pattern 的统一兜底文案
  validate?: (value: string, values: FormValues) => string | undefined;
};

// 规则执行器：返回错误文案（string）表示不通过，undefined 表示通过
function runRule(value: string, values: FormValues, rules?: FieldRules): string | undefined {
  if (!rules) return undefined;
  if (rules.required !== undefined && value.trim() === '') {
    return typeof rules.required === 'string' ? rules.required : '此项为必填';
  }
  if (value === '') return undefined;   // 非必填的空值跳过后续规则（空值不该报"格式不对"）
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    return rules.message ?? `长度不能少于 ${rules.minLength} 位`;
  }
  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    return rules.message ?? `长度不能超过 ${rules.maxLength} 位`;
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message ?? '格式不正确';
  }
  return rules.validate?.(value, values);   // 自定义规则（跨字段校验在这里做）
}

export function useForm(initialValues: FormValues = {}) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 规则表与 touched 表放 ref：render 期间写入，不触发重渲染，读取永远最新
  const rulesRef = useRef<Record<string, FieldRules>>({});
  const touchedRef = useRef<Record<string, boolean>>({});

  // 统一写值入口：更新值；已 touch 过的字段顺便复验（改动即反馈）
  const setValue = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touchedRef.current[name]) {
      const nextValues = { ...values, [name]: value };
      setErrors(prev => ({ ...prev, [name]: runRule(value, nextValues, rulesRef.current[name]) }));
    }
  };

  // 注册字段：返回可展开到原生控件上的接线属性
  const register = (name: string, rules?: FieldRules) => {
    if (rules) rulesRef.current[name] = rules;   // 就地注册（render 期间调用，写入 ref 安全）
    return {
      name,
      value: values[name] ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(name, e.target.value),
      onBlur: (_e: FocusEvent<HTMLInputElement>) => {
        touchedRef.current[name] = true;
        setTouched({ ...touchedRef.current });
        setErrors(prev => ({
          ...prev,
          [name]: runRule(values[name] ?? '', values, rulesRef.current[name]),
        }));
      },
    };
  };

  // 提交：全量校验，全过才回调 onValid
  const handleSubmit = (onValid: (values: FormValues) => void | Promise<void>) =>
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const nextErrors: Record<string, string | undefined> = {};
      for (const name of Object.keys(rulesRef.current)) {
        nextErrors[name] = runRule(values[name] ?? '', values, rulesRef.current[name]);
      }
      setErrors(nextErrors);
      setTouched(Object.fromEntries(Object.keys(rulesRef.current).map(n => [n, true])));
      if (Object.values(nextErrors).some(Boolean)) return;   // 有错：拦下
      void onValid(values);                                   // 无错：放行
    };

  // 重置（可选扩展）：回初始值、清错误与 touched；规则保留——它们是字段配置不是数据
  const reset = () => { setValues(initialValues); setErrors({}); touchedRef.current = {}; setTouched({}); };

  return { values, errors, touched, setValue, register, handleSubmit, reset };
}
```

```tsx
// SignupForm.tsx —— 用 mini useForm 重写：字段接线缩成一行，规则贴着字段声明
import { useForm } from './mini-use-form';

export default function SignupForm() {
  const { errors, register, handleSubmit, reset } = useForm({
    username: '', email: '', password: '', confirm: '',
  });

  const onSubmit = handleSubmit(v => { console.log('提交成功', v); reset(); });   // 走到这里 = 全部规则通过

  return (
    <form onSubmit={onSubmit} noValidate>
      <input {...register('username', { required: '用户名必填', minLength: 3 })} placeholder="用户名" />
      {errors.username && <p className="form-error">{errors.username}</p>}

      <input {...register('email', { required: '邮箱必填', pattern: { value: /^\S+@\S+\.\S+$/, message: '邮箱格式不正确' } })} placeholder="邮箱" />
      {errors.email && <p className="form-error">{errors.email}</p>}

      <input type="password" {...register('password', { required: '密码必填', minLength: 8 })} placeholder="密码" />
      {errors.password && <p className="form-error">{errors.password}</p>}

      {/* 跨字段校验：validate 的第二个参数是全表当前值 */}
      <input type="password" {...register('confirm', {
        required: '请再次输入密码',
        validate: (v, all) => (v === all.password ? undefined : '两次输入的密码不一致'),
      })} placeholder="确认密码" />
      {errors.confirm && <p className="form-error">{errors.confirm}</p>}

      <button type="submit">注册</button>
    </form>
  );
}
```

**常见坑。**

- **症状**：把 `rules` 注册表放进 `useState`，页面无限重渲染。**根因**：`register` 在 render 里调用，写 state → 重渲染 → 再调 register → 再写 state，死循环。**修法**：注册表用 `useRef`（本实现如此）——注册是配置声明，不该触发渲染。
- **症状**：输入时校验不触发，直到提交才显示错误。**根因**：改动复验只对已 touch 的字段生效，首验又设计在 blur 上——这是**故意的**（一进页面满屏报错是灾难）。**修法**：要输入即验就放宽 `if (touchedRef.current[name])` 条件，或用 4.1.4 的 mode 选项显式选校验时机。
- **症状**：条件渲染的字段消失了，提交却仍报它"必填"。**根因**：mini 版字段卸载不清理规则表（只增不减）。**修法**：教学版从略；生产环境这正是 react-hook-form `shouldUnregister` 解决的问题（见 4.1.5）。
- **症状**：快速连续输入时跨字段校验偶尔用旧值。**根因**：`setValue` 构造 `nextValues` 用的是闭包里的 `values`，同批多次输入读到上一次的值。**修法**：值镜像到 `valuesRef`（4.1.2 已示范）；或像 RHF 一样非受控（值存 DOM，天然最新）。

#### 4.1.2 动态表单（字段动态增删、嵌套字段）

**是什么。** 动态表单指字段的**数量与结构在运行时变化**："工作经历"能加能删（字段增删），值里出现 `user.profile.city`、`experiences[0].company` 这样的层级（嵌套字段）。前者考验列表状态管理，后者考验"按路径读写嵌套值"。

**为什么需要。** 简历、报销单、审批流——业务上"字段固定"才是特例。而 4.1.1 的 mini useForm 只支持一层 key：`values['experiences.0.company']` 只是字符串键，不会真的访问到嵌套对象。需要一对"按路径读写不可变嵌套结构"的工具函数，再把表单 Hook 升级成路径版。

**怎么做（机制分步）。** ① 写 `getIn`/`setIn`：路径归一化（`a[0].b` → `['a','0','b']`），读时逐层下钻，写时**逐层浅拷贝**（不可变更新）；② 把 useForm 的读写点替换为路径版，值镜像进 `valuesRef` 保证读到最新；③ 字段增删用"**唯一 id 当 key 与存储键**"模式：字段数组存 id、值按 id 存在嵌套对象里，删字段 = 删 id + 删对应键，绕开 index 当 key 的一切并发症；④ 新增字段时同步初始化嵌套值（避免 `undefined.company` 链）。

**代码示例：路径读写工具。**

```ts
// path-utils.ts
// 路径归一化：'experiences[0].company' → ['experiences', '0', 'company']
function toKeys(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
}

export function getIn(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of toKeys(path)) {
    if (cur === null || typeof cur !== 'object') return undefined;   // 中途断链：安全返回 undefined
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function setIn<T extends object>(obj: T, path: string, value: unknown): T {
  const keys = toKeys(path);
  // 递归克隆路径上的每一层：路径外的兄弟节点保持原引用（React 才能靠引用判断跳过无关更新）
  const walk = (node: any, i: number): any => {
    if (i === keys.length) return value;                              // 终点：替换为新值
    const key = keys[i];
    const base: any = Array.isArray(node) ? [...node] : { ...node };  // 不可变复制当前层
    base[key] = walk(node?.[key], i + 1);
    return base;
  };
  return walk(obj, 0);
}
```

**代码示例：路径版 Hook（在 mini useForm 上改三处）。**

```tsx
// use-path-form.ts —— 与 4.1.1 的差异集中在标注的三处；值放宽为 any 以容纳嵌套对象
import { useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { getIn, setIn } from './path-utils';
import { runRule, type FieldRules } from './mini-use-form';   // 规则执行器直接复用

export function usePathForm(initialValues: Record<string, any> = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const rulesRef = useRef<Record<string, FieldRules>>({});
  const touchedRef = useRef<Record<string, boolean>>({});
  const valuesRef = useRef(initialValues);   // 【改动 0】镜像：任何时刻读最新值，绕开闭包滞后

  const setValue = (path: string, value: string) => {
    valuesRef.current = setIn(valuesRef.current, path, value);   // 【改动 1】按路径不可变写入
    setValues(valuesRef.current);
    if (touchedRef.current[path]) {
      setErrors(prev => ({
        ...prev,
        [path]: runRule(value, valuesRef.current, rulesRef.current[path]),
      }));
    }
  };

  const register = (path: string, rules?: FieldRules) => {
    if (rules) rulesRef.current[path] = rules;
    return {
      name: path,
      value: String(getIn(values, path) ?? ''),                    // 【改动 2】按路径读取（可能 undefined）
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(path, e.target.value),
      onBlur: (_e: FocusEvent<HTMLInputElement>) => {
        touchedRef.current[path] = true;
        setErrors(prev => ({
          ...prev,
          [path]: runRule(String(getIn(valuesRef.current, path) ?? ''), valuesRef.current, rulesRef.current[path]),
        }));
      },
    };
  };

  const handleSubmit = (onValid: (values: PathValues) => void | Promise<void>) =>
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const nextErrors: Record<string, string | undefined> = {};
      for (const path of Object.keys(rulesRef.current)) {
        nextErrors[path] = runRule(                                 // 【改动 3】提交校验同样走路径读取
          String(getIn(valuesRef.current, path) ?? ''),
          valuesRef.current,
          rulesRef.current[path],
        );
      }
      setErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) return;
      void onValid(valuesRef.current);
    };

  // 任意类型的按路径写入：与 setValue 同机制，但不做 string 假设（对象/数组的增删改都走它）
  const setRaw = (path: string, value: unknown) => {
    valuesRef.current = setIn(valuesRef.current, path, value);
    setValues(valuesRef.current);
  };

  // 字段卸载时清理它的规则与错误（动态字段必需）
  const removePath = (path: string) => {
    delete rulesRef.current[path];
    delete touchedRef.current[path];
    setErrors(prev => { const n = { ...prev }; delete n[path]; return n; });
  };

  return { values, errors, register, setValue, setRaw, handleSubmit, removePath, valuesRef };
}
```

**代码示例：工作经历动态增删（字段增删 + 嵌套路径合体）。**

```tsx
// WorkExperienceForm.tsx
import { useRef, useState } from 'react';
import { usePathForm } from './use-path-form';

type Experience = { company: string; role: string };

export default function WorkExperienceForm() {
  // 值按字段 id 存在嵌套对象里（对象键天然支持增删）
  const { register, handleSubmit, setRaw, removePath, valuesRef } = usePathForm({
    name: '',
    experiences: {} as Record<number, Experience>,
  });

  // 字段数组只存 id：id 用自增计数器生成，永不重复、永不因删除而漂移
  const [expIds, setExpIds] = useState<number[]>([]);
  const nextIdRef = useRef(1001);

  const append = () => {
    const id = nextIdRef.current++;
    setExpIds(ids => [...ids, id]);
    setRaw(`experiences.${id}`, { company: '', role: '' });   // 同步初始化嵌套值，防 getIn 断链
  };

  const remove = (id: number) => {
    setExpIds(ids => ids.filter(x => x !== id));               // 字段数组移除
    removePath(`experiences.${id}.company`);                   // 清掉该字段的规则与错误
    removePath(`experiences.${id}.role`);
    const experiences = { ...(valuesRef.current.experiences as Record<number, Experience>) };
    delete experiences[id];                                    // 值层面不可变地删掉该 id 的键
    setRaw('experiences', experiences);
  };

  const onSubmit = handleSubmit(v => console.log('提交', v));

  return (
    <form onSubmit={onSubmit} noValidate>
      <input {...register('name', { required: '姓名必填' })} placeholder="姓名" />

      {expIds.map(id => (
        // key 是稳定 id：删除中间项时 React 按 id 对号入座，输入内容、焦点都不会串位
        <fieldset key={id}>
          <legend>工作经历 #{expIds.indexOf(id) + 1}</legend>
          <input {...register(`experiences.${id}.company`, { required: '公司必填' })} placeholder="公司" />
          <input {...register(`experiences.${id}.role`, { required: '职位必填' })} placeholder="职位" />
          <button type="button" onClick={() => remove(id)}>删除</button>
        </fieldset>
      ))}

      <button type="button" onClick={append}>+ 添加一段经历</button>
      <button type="submit">提交</button>
    </form>
  );
}
```

实际项目不必自己维护这一切——react-hook-form 的 `useFieldArray`（`append/remove/move` 一整套）与 `Path/FieldPath` 类型系统把上面全部生产化。但读过这套手写实现，你再看 `useFieldArray` 的 API 就知道每个方法在替你做什么、出问题时去哪里查。

**常见坑。**

- **症状**：删除第 2 段经历后，第 3 段内容"串"进第 2 段的输入框。**根因**：`key={index}`——删除后 index 重排，React 按 index 复用 DOM，把旧 value 塞进新数据。**修法**：永远用稳定唯一 id 当 key 与存储键（本例 `expIds` 模式），index 只用来算显示序号。
- **症状**：`setIn` 更新后无关的兄弟组件也重渲染了。**根因**：顶层整树重建（`{...obj}` 套满全层）或直接 mutate。**修法**：严格用逐层浅拷贝的 `setIn`——只有路径上的节点换新引用；直接 mutate 则相反：引用全不变，**该更新的也不更新**。
- **症状**：新 append 的字段输入时报 `Cannot read properties of undefined`。**根因**：加了字段 id 没初始化对应嵌套值，`getIn` 中途断链。**修法**：append 时同步 `setRaw('experiences.<id>', {...})`（本例已含）；`getIn` 断链返回 undefined 是防线不是解法。
- **症状**：删除字段后提交，报"公司必填"但输入框已不存在。**根因**：规则没随字段卸载清理。**修法**：卸载路径调 `removePath`（本实现已含）；RHF 对应 `shouldUnregister: true`（4.1.4/4.1.5 展开）。

#### 4.1.3 多步表单（步骤间状态保留）

**是什么。** 多步表单（向导/Wizard）把长表拆成多页：每步一个子表单，"下一步/上一步"来回走，已填内容不能丢。核心难题只有一个——**切换步骤时组件被卸载、state 随之销毁，怎么把状态留住**。三种方案：**提升**（状态集中到向导根组件）、**持久化**（写 sessionStorage）、**keepalive**（步骤常驻 DOM 只切可见性）。

**为什么需要。** 订单结算、开户、问卷——每步专注一小撮字段，转化率远高于一屏二十个输入框。而"状态保留"的方案选择决定代码结构、回退体验、刷新恢复能力，是典型的"先定架构再写码"场景。

**方案一：状态提升到向导根组件（默认首选）。** 每步组件用"草稿 + 提交"模式：本地 state 做草稿，点"下一步"才把草稿合并进根组件总数据；切回来时用总数据重新初始化草稿。卸载不丢，因为真相在根上。

```tsx
// CheckoutWizard.tsx —— 方案一完整实现：三步结算向导
import { useState } from 'react';

type FormData = {
  username: string;
  email: string;
  city: string;
  address: string;
  payment: 'alipay' | 'wechat' | 'card';
};

const initialData: FormData = { username: '', email: '', city: '', address: '', payment: 'alipay' };

type Step1Props = { data: FormData; onNext: (patch: Partial<FormData>) => void };
type Step2Props = Step1Props & { onBack: () => void };
type Step3Props = { data: FormData; onBack: () => void; onSubmit: (final: FormData) => void };

function Step1({ data, onNext }: Step1Props) {
  // 草稿从"已保存的总数据"初始化：回到这一步时，之前填的内容原样恢复
  const [draft, setDraft] = useState({ username: data.username, email: data.email });
  const [error, setError] = useState('');

  const next = () => {
    if (!draft.username.trim()) return setError('请填写用户名');
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) return setError('邮箱格式不正确');
    setError('');
    onNext(draft);   // 校验通过才提交给根组件
  };

  return (
    <section>
      <h3>第 1 步 / 共 3 步：账号信息</h3>
      <input value={draft.username} onChange={e => setDraft(d => ({ ...d, username: e.target.value }))} placeholder="用户名" />
      <input value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="邮箱" />
      {error && <p className="form-error">{error}</p>}
      <button type="button" onClick={next}>下一步</button>
    </section>
  );
}

function Step2({ data, onNext, onBack }: Step2Props) {
  const [draft, setDraft] = useState({ city: data.city, address: data.address });
  const [error, setError] = useState('');

  const next = () => {
    if (!draft.city.trim()) return setError('请填写城市');
    setError('');
    onNext(draft);
  };

  return (
    <section>
      <h3>第 2 步 / 共 3 步：收货地址</h3>
      <input value={draft.city} onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} placeholder="城市" />
      <input value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} placeholder="详细地址" />
      {error && <p className="form-error">{error}</p>}
      <button type="button" onClick={onBack}>上一步</button>
      <button type="button" onClick={next}>下一步</button>
    </section>
  );
}

function Step3({ data, onBack, onSubmit }: Step3Props) {
  const [payment, setPayment] = useState<FormData['payment']>(data.payment);
  const PAY_LABELS = { alipay: '支付宝', wechat: '微信', card: '银行卡' } as const;

  return (
    <section>
      <h3>第 3 步 / 共 3 步：支付与确认</h3>
      {(['alipay', 'wechat', 'card'] as const).map(p => (
        <label key={p}>
          <input type="radio" name="payment" checked={payment === p} onChange={() => setPayment(p)} />
          {PAY_LABELS[p]}
        </label>
      ))}
      <dl>
        <dt>用户名 / 邮箱</dt><dd>{data.username} / {data.email}</dd>
        <dt>地址</dt><dd>{data.city} {data.address}</dd>
      </dl>
      <button type="button" onClick={onBack}>上一步</button>
      <button type="button" onClick={() => onSubmit({ ...data, payment })}>提交订单</button>
    </section>
  );
}

export default function CheckoutWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);   // 唯一真相：向导根组件持有全部已保存数据

  const mergeAndNext = (patch: Partial<FormData>) => {
    setData(prev => ({ ...prev, ...patch }));   // 合并草稿
    setStep(s => s + 1);
  };
  const back = () => setStep(s => s - 1);

  return (
    <div>
      <progress value={step + 1} max={3} />
      {step === 0 && <Step1 data={data} onNext={mergeAndNext} />}
      {step === 1 && <Step2 data={data} onNext={mergeAndNext} onBack={back} />}
      {step === 2 && <Step3 data={data} onBack={back} onSubmit={final => console.log('下单：', final)} />}
    </div>
  );
}
```

机制要点：步骤组件**卸载不销毁数据**（真相在根）；回到上一步时草稿从 `data` 重建，天然"回退保留"；每步只校验自己的字段，错误不跨步污染。

**方案二：每步状态持久化到 sessionStorage。** 状态不靠"住在哪个组件"保命，而是变了就写、挂载时读回。适合"刷新页面也不能丢"的场景（方案一刷新即丢）。

```tsx
// usePersistedState.ts —— 方案二核心：状态即时落盘
import { useEffect, useState } from 'react';

export function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);   // 惰性初始化：只在首渲染读一次
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;   // 存储损坏/被禁用时退回初始值
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* 配额满：静默降级 */ }
  }, [key, state]);      // 状态一变就写盘

  return [state, setState] as const;
}

// 每一步自己用：const [step2, setStep2] = usePersistedState('wizard:step2', initialStep2);
// 刷新页面、组件卸载重挂，数据都从 sessionStorage 复活。
```

代价与边界：只存可 JSON 序列化的值（File、函数不行）；多标签页同时开向导会互相覆盖；敏感信息要不要进 sessionStorage 得过安全评审。

**方案三：keepalive 思路——步骤常驻，只切可见性。** React 没有 Vue 的 `<KeepAlive>`，等价做法是每步都渲染、用 CSS 隐藏非当前步：

```tsx
// WizardKeepalive.tsx —— 方案三核心片段（Step1/2/3 复用方案一实现，但状态可完全本地化）
import { useState } from 'react';

export function WizardKeepalive() {
  const [step, setStep] = useState(0);
  const steps = [   // 首渲染就挂载全部三步
    <Step1 key="s1" onNext={() => setStep(1)} />,
    <Step2 key="s2" onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <Step3 key="s3" onBack={() => setStep(1)} onSubmit={() => { /* … */ }} />,
  ];
  return (
    <div>
      <progress value={step + 1} max={3} />
      {steps.map((s, i) => (
        <div key={i} style={{ display: i === step ? 'block' : 'none' }} aria-hidden={i !== step}>
          {s}
        </div>
      ))}
    </div>
  );
}
```

隐藏的步骤仍在 DOM 里：内部 state、滚动位置、输入焦点原封不动，回退体验最"物理"。代价同样来自"仍在 DOM 里"：所有步骤首屏就渲染（重步骤拖慢首屏）、隐藏输入框仍可被 Tab 聚点（要配 `aria-hidden` + `tabIndex=-1` 或 `inert` 属性）、每步 useEffect 照常跑（轮询/请求不因"看不见"而暂停）。社区库 `react-activation` 把这套机制做成了 `<KeepAlive>` 组件（子树挂常驻容器、切换时搬运 DOM），要"Vue 体验"可直接采用，原理即上述思路的工程化。

三方案选型一句话：**提升到根**是默认首选（状态在向导 state，刷新不恢复，只渲染当前步）；要**刷新恢复**用 sessionStorage 持久化（只能存可序列化值）；步骤含重交互状态（富文本、滚动位置）且步骤数少时用 **keepalive**（全步骤首屏即渲染）。

**常见坑。**

- **症状**：方案一"上一步再下一步"，草稿被清空。**根因**：下一步时把本地草稿清掉、或草稿初始化没从 `data` 回填。**修法**：数据只单向流动——初始化读 `data`、提交合并回 `data`，永不互相清空。
- **症状**：方案二表单值显示 `[object Object]`。**根因**：往存储写了非序列化值或读取没 `JSON.parse`。**修法**：读写严格成对 `JSON.stringify/parse` 并 try/catch 兜底（用户可能禁用存储）。
- **症状**：方案三看不见的步骤还在发请求/定时器空转。**根因**：`useEffect` 只关心挂载与否，不关心可见性。**修法**：给步骤传 `active` prop，副作用内部 `if (!active) return`；或事件驱动（进入该步才触发）。

#### 4.1.4 校验：手写规则 → **react-hook-form + zod**（企业级标准）

**是什么。** react-hook-form（RHF）是非受控实现的表单管理库（值存 DOM、ref 收集，避开每键全表重渲染）；zod 是"schema 即类型"的校验库；`zodResolver` 把两者焊接起来——**一份 zod schema 同时产出校验规则和 TS 类型**。三件套是企业级表单事实标准。

**为什么 mini 版不够、要用库。** 4.1.1 的手写版覆盖了核心心智，但生产级还有一排硬需求：每键重渲染整张受控表单的性能问题（RHF 把重渲染压到字段级）；条件字段的注册/反注册（`shouldUnregister`）；异步校验（用户名是否被占用）；与 UI 库受控组件的桥接（`Controller`）；以及最重要的——**校验规则与类型定义双份维护**（zod 一份 schema 消灭这个重复）。

**怎么做（机制分步）。** ① `z.object({...})` 定义 schema，链式规则带中文文案，`z.infer` 直接得表单值类型；② `useForm<Values>({ resolver: zodResolver(schema), defaultValues, mode })`：resolver 接管校验、defaultValues 兜住全部字段初值、mode 定校验时机；③ 原生控件 `register(name)` 接线（非受控），UI 库受控组件用 `Controller` 桥接；④ 错误从 `formState.errors` 按字段展示；提交 `handleSubmit(onValid, onInvalid)`，`isSubmitting` 期间禁用按钮。

先装依赖：

```bash
npm install react-hook-form zod @hookform/resolvers
```

**校验时机（mode）对照表——选型比记 API 重要。**

| mode | 首次校验 | 之后的校验 | 体验 |
|---|---|---|---|
| `onSubmit`（默认） | 提交时 | 出错字段随输入复验 | 打扰最少，出错偏晚 |
| `onBlur` | 失焦 | 每次失焦 | 反馈温和 |
| `onChange` | 每次输入 | 每次输入 | 最即时也最吵，重渲染多 |
| `onTouched` | 首次失焦 | 之后随输入复验 | **多数业务表单的甜点位** |
| `all` | 失焦 + 输入 | 失焦 + 输入 | 关键字段单独设 |

**代码示例：企业级资料表单（完整）。**

```tsx
// ProfileForm.tsx —— RHF + zod 完整示例
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ① Schema：唯一事实来源。类型（z.infer）与校验规则都从这里出，改规则不用改两处
const profileSchema = z.object({
  nickname: z.string().min(2, '昵称至少 2 个字').max(20, '昵称最多 20 个字'),
  email: z.string().min(1, '邮箱必填').email('邮箱格式不正确'),
  // 数字输入的经典处理：先用 string 收（原生 input 拿到的本来就是字符串），提交时再转 number
  age: z
    .string()
    .min(1, '年龄必填')
    .regex(/^\d+$/, '年龄必须是整数数字')
    .refine(v => Number(v) >= 1 && Number(v) <= 150, '年龄范围 1–150'),
  // "可空网址"：空串或合法 URL 二选一
  website: z.union([z.literal(''), z.string().url('网址格式不正确，需以 http(s):// 开头')]),
  bio: z.string().max(200, '简介最多 200 字'),
});

// ② 表单值类型：从 schema 推导，字段增删这里自动跟着变
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),   // 校验全部交给 zod
    defaultValues: { nickname: '', email: '', age: '', website: '', bio: '' },   // 必须给全
    mode: 'onTouched',                      // 首次失焦校验，之后输入即复验
  });

  // ③ 提交：onValid 拿到的 values 一定通过了全部校验；onInvalid 可做错误聚焦/埋点
  const onSubmit = handleSubmit(
    (values) => {
      console.log('校验通过', values, Number(values.age));   // age 此刻再转 number
      reset();   // 提交成功后整表复位
    },
    (errs) => console.warn('校验失败', errs),   // errs 形如 { nickname: { message } }
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <label>昵称<input {...register('nickname')} placeholder="2–20 个字" /></label>
      {errors.nickname && <p className="form-error">{errors.nickname.message}</p>}

      <label>邮箱<input type="email" {...register('email')} /></label>
      {errors.email && <p className="form-error">{errors.email.message}</p>}

      <label>年龄<input inputMode="numeric" {...register('age')} /></label>
      {errors.age && <p className="form-error">{errors.age.message}</p>}

      <label>个人主页（选填）<input type="url" {...register('website')} placeholder="https://…" /></label>
      {errors.website && <p className="form-error">{errors.website.message}</p>}

      <label>简介（选填）<textarea rows={3} {...register('bio')} /></label>
      {errors.bio && <p className="form-error">{errors.bio.message}</p>}

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? '保存中…' : '保存资料'}
      </button>
    </form>
  );
}
```

**非原生组件用 Controller 桥接。** UI 库的 Select、DatePicker 不认 `register` 返回的 ref，改由 `Controller` 全权托管 value/onChange：

```tsx
// 桥接示意（Select 即模式 8 的泛型 Select）：field 是 { value, onChange, ref, name }
import { Controller, useForm } from 'react-hook-form';

function LevelForm() {
  const { control, register, handleSubmit } = useForm<{ nickname: string; level: string }>({
    defaultValues: { nickname: '', level: 'junior' },
  });
  return (
    <form onSubmit={handleSubmit(v => console.log(v))}>
      <input {...register('nickname')} placeholder="昵称" />
      <Controller
        control={control}
        name="level"
        rules={{ required: '请选择等级' }}     // Controller 自身的规则（与 zod 二选一即可）
        render={({ field, fieldState }) => (
          <Select
            options={[
              { value: 'junior', label: '初级' },
              { value: 'senior', label: '高级' },
              { value: 'expert', label: '专家' },
            ]}
            value={null}
            onChange={opt => field.onChange(opt?.value)}   // 受控接线由 field 打包提供
            placeholder="选择等级"
          />
        )}
      />
      <button type="submit">提交</button>
    </form>
  );
}
```

**常见坑。**

- **症状**：用 `z.coerce.number()` 处理年龄，空串提交时冒出"Expected number, received nan"之类英文错误。**根因**：`Number('')` 是 0、`Number('abc')` 是 NaN，coerce 后落进 zod 的类型错误默认分支，文案不可控。**修法**：如主示例——string 收、regex 验数字、refine 验范围，提交时再转；坚持 coerce 就配 `z.preprocess` 先把空串转 `undefined` 再接 `.optional()`。
- **症状**：`defaultValues` 少给某字段，出现受控警告、`reset()` 行为怪异等灵异现象。**根因**：defaultValues 是 RHF 的地基——受控初值、dirty 判定基准、reset 目标全靠它，缺项字段的值是 `undefined`，走另一套代码路径。**修法**：**每个字段都必须出现在 defaultValues 里**（选填给 `''`）。
- **症状**：条件渲染的字段隐藏后，提交仍被它拦住。**根因**：RHF 默认**不反注册**——字段从树上消失，注册与值仍在。**修法**：register 加 `shouldUnregister: true`（随卸载清值清规则），或 schema 侧 `superRefine` 条件校验（见 4.1.5）。另：校验时机不合产品预期多半是 mode 选错——默认 `onSubmit` 提交前完全不校验，按上面的 mode 对照表换（多数业务表单 `onTouched` 最舒服）。

#### 4.1.5 字段联动（省市区级联、某选项控制其他字段显隐）

**是什么。** 字段联动指一个字段的值/变化驱动另一个字段的**可选值、加载状态或存在与否**。两类最典型：级联加载（省 → 市 → 区，下级选项依赖上级取数）与显隐联动（勾选"邮件通知"才出现邮箱输入框）。

**为什么需要。** 联动的难点从来不是"显示谁隐藏谁"，而是三件配套事：**下级选项要重取**（上级变了，下级旧数据必须作废重查）、**下级已选值要清空**（旧省对应的市对新省无意义）、**异步要防竞态**（快速连切两个省，慢的旧响应不能覆盖新的）。漏任何一件都会出"选了广东省却显示浙江省的市"这类脏数据事故。

**怎么做（机制分步）：级联三步法。** ① 用 `watch('province')` 订阅上级值，值变即触发；② 在 `useEffect`（依赖上级值）里：**先清空下级已选值**（`setValue('city','')`，下下级也要清）→ 置 loading → 异步取新选项 → 写入选项 state；③ 用闭包布尔（`stale`）守卫竞态：effect cleanup 时置 true，迟到的响应检查后丢弃。

**代码示例：省市区三级级联（完整）。**

```tsx
// RegionCascadeForm.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

type RegionFormValues = { province: string; city: string; district: string };

// 模拟地区接口：真实项目换成 fetch('/api/regions?parent=' + encodeURIComponent(parent))
const REGION_DB: Record<string, string[]> = {
  '': ['浙江省', '江苏省', '广东省'],
  浙江省: ['杭州市', '宁波市'],
  江苏省: ['南京市', '苏州市'],
  广东省: ['广州市', '深圳市'],
  杭州市: ['西湖区', '滨江区', '余杭区'],
  宁波市: ['海曙区', '鄞州区'],
  南京市: ['玄武区', '鼓楼区'],
  苏州市: ['姑苏区', '工业园区'],
  广州市: ['天河区', '越秀区'],
  深圳市: ['南山区', '福田区'],
};

function fetchRegions(parent: string): Promise<string[]> {
  return new Promise(resolve => setTimeout(() => resolve(REGION_DB[parent] ?? []), 400));  // 模拟网络延迟
}

export default function RegionCascadeForm() {
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<RegionFormValues>({
    defaultValues: { province: '', city: '', district: '' },
    mode: 'onTouched',
  });

  const province = watch('province');   // 订阅省：值一变，下面两个 effect 重新评估
  const city = watch('city');           // 订阅市

  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // 联动一：省 → 市（选项重取 + 下两级已选值清空 + 竞态守卫）
  useEffect(() => {
    if (!province) { setCities([]); return; }
    let stale = false;                    // 竞态守卫：快速换省时丢弃上一个未完成的响应
    setLoadingCities(true);
    setValue('city', '');                 // 关键一：上级变化 → 下级已选值作废
    setValue('district', '');             // 关键二：下下级也要清（选项即将失效）
    setDistricts([]);
    void fetchRegions(province).then(list => {
      if (stale) return;
      setCities(list);
      setLoadingCities(false);
    });
    return () => { stale = true; };       // 依赖再次变化前调用：宣告上一次请求过期
  }, [province, setValue]);

  // 联动二：市 → 区（同一套三步法）
  useEffect(() => {
    if (!city) { setDistricts([]); return; }
    let stale = false;
    setLoadingDistricts(true);
    setValue('district', '');
    void fetchRegions(city).then(list => {
      if (stale) return;
      setDistricts(list);
      setLoadingDistricts(false);
    });
    return () => { stale = true; };
  }, [city, setValue]);

  const onSubmit = handleSubmit(v => console.log('所选地区', v));

  return (
    <form onSubmit={onSubmit} noValidate>
      <label>省
        <select {...register('province', { required: '请选择省' })}>
          <option value="">请选择</option>
          {REGION_DB[''].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {errors.province && <p className="form-error">{errors.province.message}</p>}

      <label>市
        <select {...register('city', { required: '请选择市' })} disabled={!province || loadingCities}>
          <option value="">{loadingCities ? '加载中…' : '请选择'}</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {errors.city && <p className="form-error">{errors.city.message}</p>}

      <label>区
        <select {...register('district', { required: '请选择区' })} disabled={!city || loadingDistricts}>
          <option value="">{loadingDistricts ? '加载中…' : '请选择'}</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      {errors.district && <p className="form-error">{errors.district.message}</p>}
      <button type="submit">提交</button>
    </form>
  );
}
```

**显隐联动：一个开关控制另一个字段。** 用 `watch` 读开关值做条件渲染即可，但**校验必须跟着显隐走**，否则出现"隐形字段拦截提交"。两种配套修法：

```tsx
// NotifyToggle.tsx —— 显隐联动的两种校验配套
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// 修法 A（推荐）：schema 侧 superRefine 条件校验——显隐条件与规则写在同一处
const notifySchema = z
  .object({
    notifyByEmail: z.boolean(),
    notifyEmail: z.string(),   // 不在这里写 required，交给 superRefine 按条件判
  })
  .superRefine((val, ctx) => {
    if (val.notifyByEmail) {
      const msg = !val.notifyEmail.trim()
        ? '开启邮件通知必须填邮箱'
        : /^\S+@\S+\.\S+$/.test(val.notifyEmail) ? undefined : '邮箱格式不正确';
      if (msg) ctx.addIssue({ code: 'custom', path: ['notifyEmail'], message: msg });
    }
  });

type NotifyValues = z.infer<typeof notifySchema>;

export default function NotifyToggle() {
  const { register, watch, handleSubmit, formState: { errors } } = useForm<NotifyValues>({
    resolver: zodResolver(notifySchema),
    defaultValues: { notifyByEmail: false, notifyEmail: '' },
  });

  const notifyByEmail = watch('notifyByEmail');   // 订阅开关 → 显隐联动

  return (
    <form onSubmit={handleSubmit(v => console.log(v))} noValidate>
      <label>
        <input type="checkbox" {...register('notifyByEmail')} />
        开启邮件通知
      </label>

      {notifyByEmail && (
        <>
          <input
            {...register('notifyEmail', { shouldUnregister: true })}   // 修法 B：卸载即反注册（值与校验一起清）
            placeholder="通知邮箱"
          />
          {errors.notifyEmail && <p className="form-error">{errors.notifyEmail.message}</p>}
        </>
      )}
      <button type="submit">保存</button>
    </form>
  );
}
```

A、B 二选一（同时写出是为了对照）：A 把"显隐条件 + 规则"集中在 schema，字段隐藏时值还在（开关关掉再打开，上次的邮箱还在）；B 让字段卸载即销值销规则，干净但状态不留——要"回填快"选 A，要"强制重填"选 B。

**常见坑。**

- **症状**：换了省，市的选择框里还是旧省的市，提交出"广东省-杭州市"这种脏组合。**根因**：effect 里只取了新选项，没清 `city` 的**已选值**——选项列表和已选值是两份状态，都要处理。**修法**：上级变化的 effect 第一件事 `setValue('city', '')`（连同下下级一起清），再异步取数。
- **症状**：快速连切"浙江省→江苏省"，市列表偶尔闪回浙江省的数据。**根因**：两个请求并发，慢的（浙江）后返回覆盖了快的（江苏）——4.2.1 竞态在表单里的翻版。**修法**：effect cleanup 的 `stale` 守卫（本例）或 AbortController；任何"取数跟随状态"的 effect 都默认带守卫。
- **症状**：勾掉开关后字段消失，提交仍报"邮箱必填"。**根因**：字段注销规则没跟着显隐走。**修法**：`shouldUnregister: true` 或 schema `superRefine` 条件校验（见上例）。

### 4.2 数据请求与服务器状态

四条是学习曲线：先手写（第 1 条）→ 再用标准库 TanStack Query（第 2 条）→ 对照生态另一极 SWR（第 3 条）→ 最后望向框架层新范式 Suspense/RSC（第 4 条）。

1. 手写 `useFetch`：loading / error / refetch / 竞态
2. **TanStack Query（React Query）**：缓存、失效重取、分页参数、无限加载、乐观更新、mutation 后刷新列表
3. SWR 对照使用
4. Suspense + 数据获取（配合 RSC 理解）

先立一个贯穿四条的认知：**服务器状态不是客户端状态**。列表数据、用户资料这些"住在服务器上的状态的快照"，与"弹窗开没开、输入框填了什么"有本质区别——前者会过期、会与他人并发冲突、需要缓存与重新验证；后者唯一真相就在内存里。把两者混在同一个 state 体系（Redux 里存接口返回值）是老项目复杂度失控的头号来源。本节主线就是把服务器状态交给专门的工具。

#### 4.2.1 手写 `useFetch`：loading / error / refetch / 竞态

**是什么与回顾要点。** `useFetch(url)` 是阶段 2 自定义 Hook 的收官作业，这里是战前点验，五个要点：① **三态完整建模**：loading/error/data 互斥推进；② **竞态守卫**：url 快速变化时（搜索框、Tab 切换）旧响应必须作废——用"请求序号"（或 AbortController）只认最后一次；③ **url 即依赖**：url 变化自动重取；④ **refetch 暴露**：错误态给用户"重试"出口；⑤ **错误归一**：HTTP 非 2xx 与网络异常统一抛成 Error。

**代码示例：序号守卫版完整实现。**

```tsx
// useFetch.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type FetchState<T> = { data: T | null; loading: boolean; error: Error | null };

export function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const seqRef = useRef(0);   // 递增请求序号：只有"当前最新一次请求"的响应才允许落进 state

  const load = useCallback(async () => {
    const seq = ++seqRef.current;                       // 发起请求前先占号
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`请求失败：HTTP ${res.status}`);   // HTTP 错误也走异常通道
      const data = (await res.json()) as T;
      if (seq !== seqRef.current) return;               // 过期响应：丢弃（期间已有新请求）
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (seq !== seqRef.current) return;               // 过期错误同样丢弃
      setState({ data: null, loading: false, error: err as Error });
    }
  }, [url]);                                            // url 变化 → load 重建 → 下面 effect 重跑

  useEffect(() => { void load(); }, [load]);

  return { ...state, refetch: load };                   // refetch 与初次加载同一条路径
}

// 使用：const { data, loading, error, refetch } = useFetch<User[]>('/api/users');
```

**为什么写完还要学 TanStack Query。** 把 useFetch 的局限列出来，就是 RQ 的功能清单：同一个 url 在两个组件里用会发**两次**请求（无缓存去重）；组件卸载重挂，数据从头 loading（无缓存复用）；列表新增一条后想刷新只能自造 refetch 事件总线（无失效模型）；翻页回来要重新 loading（无旧数据垫底）；写操作后哪些缓存该失效全靠人脑记（无 key 体系）。手写把这些全补齐是不可能的——"服务器状态管理"本身就是一门完整的学科。

**常见坑。**

- **症状**：快速切换 Tab，列表偶尔闪现上一个 Tab 的数据。**根因**：无竞态守卫，旧响应后到覆盖新响应。**修法**：序号守卫或 AbortController（如上）。
- **症状**：404/500 时 `data` 为 null 但 `error` 也是 null，页面白屏。**根因**：`fetch` 对 HTTP 错误状态码**不抛异常**（只有断网才 reject），漏了 `res.ok` 检查。**修法**：`if (!res.ok) throw new Error(...)`，把 HTTP 错误并入 error 通道（本实现已含）。另外若页面莫名多请求，查 useCallback 依赖数组是否写漏（把动态对象当依赖会导致每次渲染重建 load、effect 重跑）——开 `eslint-plugin-react-hooks` 盯着。

#### 4.2.2 **TanStack Query（React Query）**：缓存、失效重取、分页参数、无限加载、乐观更新、mutation 后刷新列表

**是什么。** TanStack Query（下称 RQ）把服务器状态的缓存建模成**客户端数据库**：数据按 `queryKey` 寻址存进 `QueryClient`，组件用 `useQuery` "订阅"——命中新鲜缓存直接用，陈旧了后台补，没了就发请求。v5 是当前主版本（API 全面对象化、命名规范化：`isPending`、`gcTime`），本文严格按 v5 写。

**为什么需要。** 4.2.1 的局限清单逐条被 RQ 内建解决：缓存与请求去重（同 key 同屏只发一次）、组件重挂即时复用、结构化失效（`invalidateQueries` 按前缀批量作废）、翻页垫底（`placeholderData`）、无限加载（`useInfiniteQuery`）、写操作编排（`useMutation` + 乐观更新）。中大型项目引入 RQ 通常还能顺带删掉一半 Redux/Context 里的"接口数据状态"。

**接入。**

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools   # 开发期强烈建议带上官方 DevTools
```

```tsx
// main.tsx —— 全局唯一的 QueryClient，挂在应用根部
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// 实例创建在组件外：保证全应用共享同一个缓存库
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 数据 1 分钟内视为新鲜（默认 0 = 永远陈旧）
      gcTime: 5 * 60 * 1000,       // 缓存无人使用后保留 5 分钟（默认值相同，显式写出便于理解）
      refetchOnWindowFocus: false, // 后台项目常关掉"聚焦窗口即重取"；retry 默认 3 次可按需调低
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

**（一）useQuery 与缓存键设计。**

```tsx
// UserProfile.tsx
import { useQuery } from '@tanstack/react-query';

type User = { id: number; name: string; email: string };

async function fetchUser(userId: number): Promise<User> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error(`加载用户失败：HTTP ${res.status}`);   // RQ 需要"真异常"驱动 error 态
  return res.json();
}

export function UserProfile({ userId }: { userId: number }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['users', userId],     // 缓存键：数组、层级化、含全部请求入参
    queryFn: () => fetchUser(userId),
  });

  if (isPending) return <p>加载中…</p>;          // v5：尚无数据（含首次请求进行中）
  if (isError) return <p>出错了：{error.message}</p>;
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}
```

v5 状态命名：`status` 只有 `'pending' | 'error' | 'success'`，对应 `isPending/isError`；`isFetching` 表示"请求进行中"（含后台重取）；派生态 `isLoading = isPending && isFetching`（首次加载中）。

`queryKey` 设计四原则：① **数组化、层级化**：`['users']`（列表）、`['users', 'detail', userId]`（详情）、`['todos', { status: 'done', page: 2 }]`（带筛选）——key 即地址，层级即分类；② **入参必须全进 key**：queryFn 用到的每个变量都是 key 的一部分，漏一个就出现"参数变了不重取"的脏缓存；③ **可序列化**：数组/字符串/数字/普通对象都行（对象属性书写顺序不影响哈希），函数、类实例不行；④ **为失效而设计**：`['users', 'detail', 1]` 天然能被 `['users']` 前缀匹配批量失效——key 层级按"业务实体"组织，这是失效重取的前提。

**（二）staleTime 与 gcTime：一条缓存的时间线。** 这两个参数是 RQ 心智模型的地基：

```text
一次成功请求后，缓存的生命周期：

 时间 ──────────────────────────────────────────────────────────────▶
      │←─ fresh（新鲜）─→│←──────── stale（陈旧）────────→│
      │  staleTime（默认0）│                              │
 请求成功              变陈旧                       （组件全卸载后开始计时）
      │                │                              │ gcTime（默认 5 分钟）
      │ 直接用缓存      │ 照常展示旧数据，满足条件时      │ 到期：缓存被物理删除
      │ 不发请求        │ 后台重取（重挂/聚焦/联网）      │ 下次 useQuery 变回 isPending
```

- `staleTime`（默认 0）：数据"保鲜期"。期内组件挂载/重挂**不发请求**直接给缓存；过期后数据仍**可用**（先展示再后台换新）。字典、配置、用户资料这类低频变化接口设 30s–5min，能砍掉大量无谓请求。
- `gcTime`（默认 5 分钟，v4 前叫 `cacheTime`）：**没有任何组件观察该缓存后**的保留期——期间组件回来仍秒开（先给旧数据再后台补），到期物理回收。它从"变为无观察者"起算，与 staleTime 完全正交。
- 陈旧缓存的三个默认重取触发：组件重新挂载（`refetchOnMount`）、窗口重新聚焦（`refetchOnWindowFocus`）、网络恢复（`refetchOnReconnect`）。后台系统常关掉后两者，改为显式失效驱动。

**（三）失效重取 invalidateQueries。** 写操作改了服务器数据，相关缓存全部作废：

```tsx
// useDeleteTodo.ts —— 失效的两种粒度
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todoId: number) => {
      const res = await fetch(`/api/todos/${todoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除失败：HTTP ${res.status}`);
    },
    onSuccess: async () => {
      // 前缀匹配：['todos']、['todos', {status:'done'}] 全部失效
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
      // 默认 refetchType: 'active'：当前挂载中的查询立即重取；
      // 未挂载的（inactive）只标记失效，等下次挂载再取
    },
  });
}
// 精确命中单个 key 时加 exact: true，例如 invalidateQueries({ queryKey: ['todos', { status: 'done' }], exact: true })
```

`await` invalidateQueries 表示等所有触发的重取落定——下一步有跳转/提示时有用。粒度纪律：删了一条待办只失效 `['todos']`，别无参 `invalidateQueries()`（失效全部）——那是"不知道谁受影响"的逃生门，用多了缓存体系名存实亡。

**（四）分页与 placeholderData。** 翻页的经典痛点：第 2 页请求期间整块闪 loading。v5 用 `placeholderData: keepPreviousData`（从包里导入哨兵值，替代 v4 的 `keepPreviousData: true`）让上一页数据垫底：

```tsx
// PaginatedProjects.tsx
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type Project = { id: number; name: string };
type ProjectsRes = { items: Project[]; total: number };

async function fetchProjects(page: number): Promise<ProjectsRes> {
  const res = await fetch(`/api/projects?page=${page}&size=20`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function PaginatedProjects() {
  const [page, setPage] = useState(1);

  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: ['projects', page],        // page 进 key：换页 = 换缓存条目
    queryFn: () => fetchProjects(page),
    placeholderData: keepPreviousData,   // v5 写法：请求期间先展示上一份数据（垫底不闪屏）
  });

  if (isPending) return <p>首次加载中…</p>;   // 只有第一页才看得到

  return (
    <div>
      {/* isPlaceholderData 为 true = 当前展示的是垫底旧页，可据此降透明度提示 */}
      <ul style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
        {data.items.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</button>
      <span>第 {page} 页</span>
      <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>下一页</button>
    </div>
  );
}
```

**（五）useInfiniteQuery 无限加载。** 分页参数从"点按钮换页"变成"滚到底自动续"：

```tsx
// InfiniteProjects.tsx
import { useInfiniteQuery } from '@tanstack/react-query';

type Project = { id: number; name: string };
type ProjectsPage = { items: Project[]; nextPage: number | null };

async function fetchProjectsPage(page: number): Promise<ProjectsPage> {
  const res = await fetch(`/api/projects?page=${page}&size=20`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function InfiniteProjects() {
  const {
    data,                // InfiniteData：{ pages: ProjectsPage[]; pageParams: number[] }
    fetchNextPage,      // 取下一页（可重复调用）
    hasNextPage,        // getNextPageParam 返回 undefined 时为 false
    isFetchingNextPage, // 仅"追加页"请求进行中（区别于整表 isFetching）
    status,
  } = useInfiniteQuery({
    queryKey: ['projects', 'infinite'],
    queryFn: ({ pageParam }) => fetchProjectsPage(pageParam),  // pageParam 由框架传入（首次 = initialPageParam）
    initialPageParam: 1,                     // v5 必填：起始页参数
    getNextPageParam: (lastPage) => lastPage.nextPage,   // 返回下一页参数；返回 undefined 即到底
  });

  if (status === 'pending') return <p>加载中…</p>;

  const projects = data.pages.flatMap(p => p.items);   // pages 是已取到的所有页，渲染前拍平

  return (
    <>
      <ul>{projects.map(p => <li key={p.id}>{p.name}</li>)}</ul>
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
        {isFetchingNextPage ? '加载中…' : hasNextPage ? '加载更多' : '没有更多了'}
      </button>
    </>
  );
}
```

两个要点：`getNextPageParam` 兼任"算下一页参数"与"判定到底"（返回 `undefined` 即无下一页）——页码分页返回 `lastPage.nextPage`，**游标分页**返回 `lastPage.nextCursor`，两种后端模型同一套 API；把"加载更多"按钮换成 `IntersectionObserver` 哨兵元素自动触发就是完整信息流（哨兵实现见 4.3，此处不重复）。缓存层面注意：`invalidateQueries` 命中无限查询会**从第一页开始重建**，长列表慎用整表失效，局部 `setQueryData` 更合适。

**（六）乐观更新：完整 onMutate / onError / onSettled。** 乐观更新指"不等服务器确认，先把 UI 改成预期成功的样子"，失败再回滚——点赞、收藏、勾选待办这类高频轻写的标准体验。三段生命周期各司其职：

```tsx
// useToggleTodo.ts —— 乐观更新完整实现
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type Todo = { id: number; title: string; done: boolean };

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    // ① 变更本体：与缓存无关的纯请求
    mutationFn: async (todo: Todo): Promise<Todo> => {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !todo.done }),
      });
      if (!res.ok) throw new Error(`更新待办失败：HTTP ${res.status}`);
      return res.json();
    },

    // ② onMutate：请求发出"之前"同步执行——先斩后奏，乐观写缓存
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });   // 抢先取消在途查询：防旧响应覆盖乐观值
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);   // 快照：失败回滚的唯一依据
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>       // 写入乐观结果：UI 立即呈现"勾选成功"
        (old ?? []).map(t => (t.id === todo.id ? { ...t, done: !todo.done } : t)),
      );
      return { previousTodos };   // 返回值 → 成为 onError/onSettled 的 context 参数
    },

    // ③ onError：请求失败——用快照整体回滚，用户几乎无感
    onError: (err, _todo, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      console.error('乐观更新失败，已回滚', err);
    },

    // ④ onSettled：无论成败最终执行——与服务器对账，消除一切可能的漂移
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

// 用法（组件里）：
// const toggleTodo = useToggleTodo();
// <input type="checkbox" checked={todo.done} onChange={() => toggleTodo.mutate(todo)} />
```

逐行理解：`onMutate` 返回的 context 是回滚通道；`cancelQueries` 防"旧响应晚到覆盖乐观值"（正是 4.2.1 的竞态，防守方换成写路径）；`onSettled` 的 invalidate 是安全网——哪怕乐观值就等于服务器终值，对账一次也无害。产品要求"服务器权威、不允许闪断"就去掉 onMutate 只留 onSuccess（退化为悲观更新，结构不变）。

**（七）mutation 后刷新列表的两种姿势。**

```tsx
// 姿势一：invalidateQueries —— 服务器是唯一事实源（默认推荐）
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['todos'] });
  // 一轮"标记失效 + 活动查询重取"换来绝对正确；代价是多一次往返
},

// 姿势二：setQueryData —— 用 mutation 的返回值直接改缓存（省一次往返）
onSuccess: (updatedTodo) => {
  queryClient.setQueryData<Todo[]>(['todos'], (old) =>
    (old ?? []).map(t => (t.id === updatedTodo.id ? updatedTodo : t)),
  );
  // 前提：后端返回完整实体；风险：本地推算与服务器实况可能漂移（别的端同时在改）
},
```

选型一句话：**写多、有一致性硬要求的列表用姿势一；高频轻写、接口返回完整实体、追求零延迟反馈用姿势二（常与乐观更新配合）；拿不准先一后二**。两者也可分层：乐观更新先 setQueryData 给即时反馈，onSettled 再 invalidate 对账——上面的 useToggleTodo 就是这个组合。另外，DevTools 值得第一天就装上：`<ReactQueryDevtools initialIsOpen={false} />` 放在 `QueryClientProvider` 内，能直接看到每个 key 的缓存内容、fresh/stale 状态与请求时间线。

**常见坑。**

- **症状**：请求明明成功，组件却显示 error 态。**根因**：v5 只认 `Error` 实例，queryFn 里 `throw '失败了'`（字符串）或 `throw { code: 500 }`（对象）不算数，`error.message` 读出 undefined。**修法**：所有失败路径 `throw new Error('可读文案')`（如各示例）。
- **症状**：改了查询参数（筛选条件），页面不刷新或仍展示旧条件数据。**根因**：参数没进 `queryKey`——key 相同就命中同一条缓存，queryFn 闭包换了也没用。**修法**：queryFn 用到的每个变量都写进 key：`queryKey: ['todos', { status, keyword }]`。
- **症状**：`staleTime` 设了 60 秒，每次进页面还是闪了一下 loading。**根因**：不是 staleTime 失效——是 gcTime 内缓存已被回收（组件离开超过 gcTime），或该 key 首次请求（isPending 是必经第一态）。**修法**：区分"首载"与"复访"：复访要免闪，确认 gcTime 覆盖离开时长，必要时配 `placeholderData`。
- **症状**：乐观更新偶发"勾选自动跳回去再跳回来"。**根因**：onMutate 漏了 `cancelQueries`——在途列表请求晚于乐观写入返回，把乐观值盖掉，随后 invalidate 又改回来。**修法**：onMutate 第一步必 `await cancelQueries`（示例已含），这是乐观更新的固定起手式。
- **症状**：v4 升 v5 后满屏 TS 报错（`isLoading` 不存在、`cacheTime` 不认识、`keepPreviousData` 报错）。**根因**：v5 破坏性改名——查询首载语义改 `isPending`（`isLoading` 变派生态、mutation 上改名 `isPending`）、`cacheTime` → `gcTime`、`keepPreviousData: true` → `placeholderData: keepPreviousData`、参数只能对象式传。**修法**：按本文 v5 写法逐项替换；官方迁移指南有完整对照表。

#### 4.2.3 SWR 对照使用

**是什么。** SWR（stale-while-revalidate）是 Vercel 出品的数据请求 Hooks 库，名字即策略：**先用缓存的旧数据（stale）渲染，同时后台重新验证（revalidate）**。它与 RQ 解决同一问题，哲学不同——SWR 追求最小 API 面积，RQ 追求完整的服务器状态管理模型。

**为什么需要对照。** 用过 RQ 再摸一遍 SWR，能看清哪些能力是这类库的本质（缓存 + 重验证），哪些是 RQ 的额外野心（变更、失效、乐观更新的体系化）；反过来写 SWR 时也不会把 RQ 的惯性带错地方。对照能力本身就是选型能力。

**代码示例：同一功能换 SWR 写一遍。**

```bash
npm install swr
```

```tsx
// SwrUserList.tsx
import useSWR from 'swr';

type User = { id: number; name: string };

// SWR 惯例：全局 fetcher，useSWR 只传 key（通常是 URL）
const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<User[]>;
  });

export function SwrUserList() {
  const { data, error, isLoading, mutate } = useSWR<User[]>('/api/users', fetcher, {
    revalidateOnFocus: false,   // 与 RQ 的 refetchOnWindowFocus 对应
  });

  if (isLoading) return <p>加载中…</p>;
  if (error) return <p>加载失败：{error.message}</p>;

  // mutate：本地改缓存 + 触发重验证（RQ setQueryData + invalidateQueries 的合体简化版）
  // const addAndRevalidate = () => mutate([...(data ?? []), { id: 0, name: '新用户' }], { revalidate: true });
  // 只想刷新不动数据：mutate() —— 与 RQ invalidateQueries(key) 的最小等价物

  return <ul>{data!.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

**定位对照表。**

| 对照维度 | TanStack Query | SWR |
|---|---|---|
| 定位 | 全功能服务器状态管理：缓存 + 变更 + 失效模型 | 极简数据获取 Hooks（SWR 策略参考实现） |
| 心智模型 | "缓存是客户端数据库，key 寻址、按前缀失效" | "每个 key 一份缓存，UI 是缓存的投影" |
| 读请求 | `useQuery`（对象式，key 数组） | `useSWR`（key 字符串或数组） |
| 写请求 | `useMutation` 一等公民，`onMutate/onError/onSettled` 完整生命周期 | `useSWRMutation` 后补；多数场景手写 fetch + `mutate` |
| 失效重取 | `invalidateQueries` 前缀批量失效，体系完整 | 逐 key 手动 `mutate(key)`，无批量失效模型 |
| 乐观更新 | 内建生命周期 + 快照回滚套路 | `mutate(data, { revalidate })` 本地写 + 回滚自理 |
| 无限加载 | `useInfiniteQuery`（页码/游标双模型，`initialPageParam`） | `useSWRInfinite` |
| 分页垫底 | `placeholderData: keepPreviousData` | `keepPreviousData: true` 选项 |
| DevTools | 官方 DevTools | 社区 swr-devtools |
| 概念量 / 体积 | 概念多、体积较大 | 概念少、体积小 |
| 甜区 | 后台管理、写操作密集、失效关系复杂 | 内容站、读多写少、追求极简接入 |

选型一句话：**写操作和失效关系复杂 → RQ；以读为主、要的是"数据自动保持新鲜" → SWR 的一百行能顶 RQ 的一千行**。两者没有代差；团队已重度用其一就别混用，两套缓存模型并存的心智成本高于任何一家的全部概念。

**常见坑。**

- **症状**：从 RQ 迁到 SWR 后，写操作完成列表不刷新。**根因**：把 RQ 的"自动失效"当成这类库的默认能力——SWR 没有 invalidateQueries，写完必须显式 `mutate('/api/users')` 触发对应 key 重验证（`isValidating` 含后台重验证，判断首载用 `isLoading`）。**修法**：封装项目级 `useCreateUser` 之类 Hook，内部统一"写接口 + mutate 相关 key"，别把刷新逻辑散在组件里。

#### 4.2.4 Suspense + 数据获取（配合 RSC 理解）

**是什么。** Suspense 是 React 的"渲染等待"协议：子树抛出一个 Promise（挂起），React 找最近的 `<Suspense>` 边界显示 `fallback`，Promise 了结后自动恢复渲染。React 19 的 `use()` API 让"组件里读 Promise"成为官方原语：`use(promise)`——未完成就挂起，完成就直接返回结果。注意 `use` 按 Hook 规则约束（不能在普通函数里调用），但**允许在条件分支和循环里调用**，这是它与普通 Hook 的关键差异。

**为什么需要。** 4.2.1/4.2.2 的加载模型是命令式三态：组件自己判 `isPending` 渲染 loading。一页有五块数据、先后不一时，loading 分支组合爆炸、瀑布式串行请求都由每个组件自理。Suspense 把"等数据"下沉为声明式协议：**组件只声明"我要什么"，等待的呈现方式由外层边界统一编排**——边界放得近则逐块出、放得远则整块出，加载策略成了布局问题而非 if 分支问题。

**怎么做（机制分步）。** ① 取数动作独立于渲染产出 Promise，组件内 `use(promise)` 解包——**Promise 引用必须在多次渲染间稳定**（否则每次渲染都"新开一个等待"）；② 外层 `<Suspense fallback={...}>` 接住挂起；③ 出错路径配 ErrorBoundary（Promise reject 抛给最近的错误边界，React 至今的官方错误边界仍是 class 组件）；④ 边界位置即加载策略：紧贴数据组件 = 局部骨架，包住整页 = 整页 loading。

**代码示例：use() + Suspense 边界 + ErrorBoundary。**

```tsx
// user-cache.ts —— 客户端 Promise 缓存：保证"同一 id 的 Promise 引用稳定"
type User = { id: string; name: string; email: string };

const userPromiseCache = new Map<string, Promise<User>>();

function getUserPromise(id: string): Promise<User> {
  if (!userPromiseCache.has(id)) {
    userPromiseCache.set(
      id,
      fetch(`/api/users/${id}`).then(res => {
        if (!res.ok) throw new Error(`加载用户失败：HTTP ${res.status}`);
        return res.json() as Promise<User>;
      }),
    );
  }
  return userPromiseCache.get(id)!;   // 命中即复用同一 Promise——use 的硬前提
}
export { getUserPromise };
```

```tsx
// ErrorBoundary.tsx —— React 没有函数组件版错误边界，class 是标准写法
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };   // 渲染前切换到降级态
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('边界捕获：', error, info);   // 接 Sentry 等上报写在这里
  }

  render() {
    if (this.state.error) return this.props.fallback ?? <p>出错了，请稍后重试。</p>;
    return this.props.children;
  }
}
```

```tsx
// UserSuspenseDemo.tsx —— 组装：错误边界在外、Suspense 在内、数据组件最深处
import { use, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { getUserPromise } from './user-cache';

function UserProfile({ id }: { id: string }) {
  const user = use(getUserPromise(id));   // 未完成 → 挂起最近 Suspense；完成 → 直接拿到值
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

function Dashboard({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<p>用户模块挂了，其余照常。</p>}>
      {/* 边界位置 = 加载策略：这里紧贴 UserProfile，等待期间页面其他部分先渲染出来 */}
      <Suspense fallback={<p>用户信息加载中…</p>}>
        <UserProfile id={userId} />
      </Suspense>
      <p>这一段不依赖数据，立即渲染，不等上面那块。</p>
    </ErrorBoundary>
  );
}

export default Dashboard;
```

与 RQ 的关系：RQ v5 提供 `useSuspenseQuery`——同一套缓存/失效体系，但用挂起代替 `isPending` 分支（`const { data } = useSuspenseQuery({...})`，data 一定有值）。已全站 RQ 的项目优先用它而不是手写 Promise 缓存；本节手写的价值在于理解挂起协议本身。

**与 RSC 的关系（一段认知）。** Suspense 数据获取的"完全体"在服务端：React Server Components 里**取数回归最朴素的 async/await**——Server Component 本身就是异步函数，在服务端请求数据后把渲染好的 UI（流）发给浏览器，客户端组件不再承担首屏取数；Next.js App Router 更把加载态做成文件约定（`loading.tsx` 即 Suspense 边界），配合流式渲染"服务端边取数边推送、哪块好了先显示哪块"。`use()` 在这条链路里扮演桥：Server Component 可以把未完成的 Promise 作为 prop 传给客户端组件，客户端组件用 `use()` 解包——等待与恢复的协议跨越了服务端与客户端边界。落到实践三句话：其一，服务端取数（RSC async 组件）与客户端缓存（RQ/SWR）不是二选一——首屏数据走服务端，交互后的增量数据走客户端缓存库，两者共存是 Next.js 项目常态；其二，`use()` 主要服务"从服务端/父级接住 Promise"与"读取 Context"两类场景，**不要**在客户端为每个请求手搓 Promise（那是在重造没有缓存、没有去重的轮子）；其三，无论哪一层，"Suspense 边界的位置决定加载体验"这个心智不变。

**常见坑。**

- **症状**：组件里直接 `use(fetch(...))`，页面永远卡在 fallback（或反复闪 loading）。**根因**：每次渲染都创建**新的** Promise，`use` 每次都拿到"未完成的新等待"，永远挂起。**修法**：Promise 必须跨渲染引用稳定——模块级缓存（本例）、父组件创建后 props 传入、或 `useMemo` 暂存；这是 `use` 的第一铁律。
- **症状**：数据报错后整页白屏，Suspense 的 fallback 没接住。**根因**：Promise reject 抛给**错误边界**而不是 Suspense；没包 ErrorBoundary 时异常继续上传直至根组件。**修法**：每个会失败的数据组件都要有 ErrorBoundary 兜底（Suspense 只管"等"不管"错"），二者总是成对出现。
- **症状**：多个数据组件先后挂起，请求一个接一个串行发出，总耗时相加。**根因**：上游组件先 `use(A)` 再用 A 的结果决定 B——串行依赖天然串行；或各组件的 Promise 在各自 render 里才创建，形成瀑布。**修法**：无依赖的取数在入口处并行发起（Promise.all 或让 RQ/框架并行调度）；有真依赖的串行本来就该串行，别误诊。

### 4.3 列表场景

列表页是后台系统的主体形态：一个数据表 + 搜索框 + 筛选器 + 分页器，就能覆盖 80% 的业务页面。但"把数据展示出来"只是及格线，生产级的列表要回答四个问题：**视图状态放哪**（URL 还是组件 state）、**数据量大了怎么办**（分页 / 无限滚动 / 虚拟列表怎么选）、**多个条件怎么组合**（搜索、筛选、排序互相联动）、**请求怎么治理**（防抖、取消、竞态）。本节四个场景分别回答这四个问题，它们共享同一个思想底座：**URL 是列表状态的唯一事实来源**（阶段 5 的"URL 也是状态"会从状态管理角度再展开一次）。

---

#### 1. 分页（页码 + 查询参数同步到 URL）

**是什么**：分页状态（页码 `page`、每页条数 `pageSize`）不存 `useState`，而是同步到 URL 查询参数里——`?page=3&pageSize=20`。URL 变化驱动数据请求，点分页器本质上是"改 URL"。

**为什么需要（为什么放 URL）**：如果把页码只放在组件 state 里，会出现三个真实痛点，而 URL 方案逐一化解：

| 痛点（state 方案的症状） | 根因 | URL 方案的表现 |
|---|---|---|
| 想把"第 3 页 + 筛选中"的列表发给同事，对方打开是第 1 页 | state 活在内存里，链接里没有 | 复制地址栏即完整状态，**可分享** |
| 用户从列表点进详情，按浏览器后退键，列表回到了第 1 页（或触发重新挂载） | 后退只回退 URL，state 不会跟着回退 | 后退回到 `/users?page=3`，**可回退** |
| 用户翻到第 5 页按 F5，一切归零 | state 随组件重新初始化 | URL 没变，刷新后仍请求第 5 页，**刷新不丢** |

此外还有第四个隐性收益：从通知、邮件、收藏夹里的链接进来能**直达某个视图状态**，这在运营类系统里是刚需。

**怎么做（机制分步）**：

1. **读**：组件用 `useSearchParams`（React Router v7 从 `react-router` 导入）解析 `page` / `pageSize`，解析时做合法性校验（非数字、越界都回退默认值）——因为 URL 是用户可以直接改的"外部输入"。
2. **写**：用户点分页器 → 调 `setSearchParams` 更新 URL → `page` 变化 → 数据 `useEffect` 依赖 `[page, pageSize]` 重新请求。
3. **历史记录策略**：翻页用 `{ replace: true }`（替换当前历史记录而不是压栈），否则用户按后退键会一页一页往回退，体验很差。
4. **数据层**：请求带分页参数，响应通常是 `{ list, total }`，用 `total` 计算总页数渲染分页器。

**代码示例**（完整的用户列表页，含校验、竞态取消、窗口式分页条）：

```tsx
// src/pages/UserListPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'member';
}
interface PageData<T> {
  list: T[];
  total: number;
}

/** 从查询参数解析一个受约束的正整数：缺失 / 非数字 / 越界一律回退默认值 */
function useIntParam(key: string, defaultValue: number, max: number): number {
  const [searchParams] = useSearchParams();
  const num = Number(searchParams.get(key));
  if (!Number.isFinite(num) || num < 1) return defaultValue; // ?page=abc → 1
  return Math.min(Math.floor(num), max);                     // ?page=99999 → 封顶
}

export default function UserListPage() {
  const [, setSearchParams] = useSearchParams(); // 只需要写，读交给 useIntParam
  const page = useIntParam('page', 1, 9999);
  const pageSize = useIntParam('pageSize', 20, 100);
  const [data, setData] = useState<PageData<User>>({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // 数据请求只依赖"从 URL 派生的值"，URL 不变就不会重复请求
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/users?page=${page}&pageSize=${pageSize}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<PageData<User>>)
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // 被取消的请求是正常流程，不算错误，更不能去动 state
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setData({ list: [], total: 0 });
        setLoading(false);
      });
    return () => controller.abort(); // page/pageSize 变化或卸载时，取消上一次请求
  }, [page, pageSize]);

  const goToPage = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev); // 基于现有参数改，保留其他筛选条件
          params.set('page', String(next));
          return params;
        },
        { replace: true }, // 翻页不进历史栈，避免后退键逐页回退
      );
    },
    [setSearchParams],
  );

  const changePageSize = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('pageSize', String(next));
          params.set('page', '1'); // 每页条数变化时必须回到第 1 页
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>角色</th>
          </tr>
        </thead>
        <tbody>
          {data.list.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p>加载中…</p>}
      <Pager page={page} pageSize={pageSize} total={data.total} onChange={goToPage} />
      <select
        value={pageSize}
        onChange={(e) => changePageSize(Number(e.target.value))}
        aria-label="每页条数"
      >
        <option value={10}>10 条/页</option>
        <option value={20}>20 条/页</option>
        <option value={50}>50 条/页</option>
      </select>
    </div>
  );
}

/** 窗口式分页条：始终最多显示 5 个页码，当前页居中 */
function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 2, totalPages - 4)); // 窗口起点，靠右时往回收
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  return (
    <nav>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      {pages.map((p) => (
        <button key={p} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
      <span>
        共 {total} 条 / {totalPages} 页
      </span>
    </nav>
  );
}
```

说明两点：`setSearchParams` 的**函数式更新**（`(prev) => next`）在 v7 可用，旧版 v6 请先读 `searchParams` 再构造新对象整体传入；`replace: true` 是产品决策——如果你希望"翻页历史可回退"（少数场景，比如审核流），去掉它即可。

**常见坑**：

1. **`setSearchParams({ page: '2' })` 把其他查询参数清空了**。症状：翻到第 2 页后，之前 URL 里的 `status=active`、`keyword=xx` 全部消失，列表条件被重置。根因：`setSearchParams` 传对象时是**整体替换**查询串，不是增量合并——这是最经典的误用。修法：始终用函数式更新 `setSearchParams((prev) => {...})`，在 `prev` 基础上改（见上面代码）。
2. **用户手改 URL 为 `?page=abc` 后请求发出 `page=NaN`**。症状：接口 400 或返回空列表且分页器坏掉。根因：`Number('abc')` 得 `NaN`，未经校验直接进模板字符串。修法：像 `useIntParam` 那样解析时校验回退，把查询参数当"不可信的外部输入"。
3. **删除最后一页的最后一条后页面空了**。症状：第 5 页只剩 1 条，删除后停留在第 5 页，列表空白。根因：删除后 `total` 减 1，第 5 页已不存在，但 URL 没变。修法：删除成功的回调里判断并回退页码：

```tsx
const onDeleted = () => {
  const totalPages = Math.max(1, Math.ceil((data.total - 1) / pageSize));
  if (page > totalPages) {
    goToPage(totalPages); // 回退到新的最后一页（会自动触发重新请求）
  } else {
    refresh(); // 仍在有效页，仅刷新当前页数据
  }
};
```

4. **翻页用 push 导致后退键灾难**。症状：用户翻了 20 页后按后退，要按 20 次才能离开列表。根因：每次 `setSearchParams` 默认压栈一条历史记录。修法：分页场景统一 `{ replace: true }`；而"进入详情页"应该用 push（回顾：push 用于"前进到新内容"，replace 用于"当前视图的微调"）。

---

#### 2. 无限滚动（`IntersectionObserver` 哨兵元素）

**是什么**：列表底部放一个看不见的"哨兵元素"（sentinel），用原生 `IntersectionObserver` 观察它；当它滚动进入（或接近）视口时，自动加载下一页并追加到列表。用户没有"点下一页"这个动作，数据随滚动不断出现。

**为什么需要（以及何时不该用）**：无限滚动的交互成本极低——拇指不用移动到分页器，特别适合移动端信息流、动态、消息列表这类"按时间线消费"的数据。但它的代价同样明确：

| 维度 | 分页 | 无限滚动 |
|---|---|---|
| 直达第 N 页 | 可以 | 不行（这正是 4.3.3 虚拟列表 + `scrollToIndex` 的主场） |
| 回找看过的内容 | 翻页码即可 | 越来越难（列表越长越卡） |
| 页脚 / 推荐位 | 永远够得着 | 常常永远够不着 |
| 数据总量感知 | 明确（共 X 页） | 模糊 |
| 适配场景 | 后台表格、需要导出/定位 | 信息流、移动端 |

选型结论：**桌面后台默认分页，移动端信息流默认无限滚动**，两者都不合适的大数据量定位场景（日志查看器、路由表）上虚拟列表。

**怎么做（机制分步）**：

1. 列表渲染完所有已加载数据后，末尾放一个高度为 0 或很小的 `div` 作为哨兵。
2. `new IntersectionObserver(callback, { rootMargin: '200px 0px' })` 观察哨兵——`rootMargin` 把"判定区域"向下扩 200px，实现**提前预加载**，用户几乎感知不到加载等待。
3. 回调里 `entry.isIntersecting` 为真时触发加载，但必须先过两道门槛：`!loading`（防重复请求）和 `hasMore`（到底不请求）。
4. 下一页数据**追加**（`setList(prev => [...prev, ...next])`），同时更新 `total`。
5. 组件卸载时 `observer.disconnect()`；每次请求配 `AbortController` 防止快速滚动时的乱序覆盖。

**代码示例**：先写哨兵 hook，再写完整页面。

```ts
// src/hooks/useSentinelObserver.ts
import { useEffect, useRef } from 'react';

/**
 * 观察哨兵元素，进入视口（提前 rootMargin）时调用 onIntersect。
 * enabled 为 false 期间不触发；enabled 从 false 变 true 时会重建 observer——
 * 这一步是关键：重新 observe 会立刻做一次交叉检测，
 * 从而解决"加载完成后哨兵仍在视口内、IO 不再回调导致卡住"的问题。
 */
export function useSentinelObserver(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cbRef = useRef(onIntersect);

  // 每次渲染后同步最新回调，避免闭包捕获旧的 state
  useEffect(() => {
    cbRef.current = onIntersect;
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && enabled) cbRef.current();
      },
      { rootMargin: '200px 0px' }, // 视口下方 200px 内即算"快看到了"
    );
    io.observe(el); // observe 时会立即执行一次交叉计算并回调（如果已相交）
    return () => io.disconnect(); // enabled 变化或卸载时断开，下次重新观察
  }, [enabled]);

  return sentinelRef;
}
```

```tsx
// src/pages/ActivityFeed.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSentinelObserver } from '../hooks/useSentinelObserver';

interface Activity {
  id: number;
  title: string;
}
interface FeedResponse {
  list: Activity[];
  total: number;
}
const PAGE_SIZE = 20;

export default function ActivityFeed() {
  const [list, setList] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // 到底判断：响应驱动，而不是猜
  const pageRef = useRef(0); // 当前已加载到第几页（不参与渲染，用 ref 即可）

  const loadNext = useCallback(async () => {
    if (loading) return; // 门槛一：正在加载不重复请求
    const nextPage = pageRef.current + 1;
    const controller = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/activities?page=${nextPage}&pageSize=${PAGE_SIZE}`, {
        signal: controller.signal,
      });
      const json = (await res.json()) as FeedResponse;
      pageRef.current = nextPage;
      // 追加而不是替换——无限滚动的核心语义
      setList((prev) => (nextPage === 1 ? json.list : [...prev, ...json.list]));
      setTotal(json.total);
      // 到底判断：以"已加载数量是否追上 total"为准；首屏空数据直接判到底
      setHasMore(json.list.length > 0 && nextPage * PAGE_SIZE < json.total);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setHasMore(false); // 真错误：停住，避免无限重试
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // 首屏加载一次（无限滚动的第一页没有"滚动触发"的机会）
  useEffect(() => {
    loadNext();
    // 哨兵兜底逻辑都在 loadNext 内部，这里留空依赖只在挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelRef = useSentinelObserver(loadNext, !loading && hasMore);

  return (
    <div>
      <ul>
        {list.map((a) => (
          <li key={a.id}>{a.title}</li>
        ))}
      </ul>
      {loading && <p>加载中…</p>}
      {!hasMore && <p>— 没有更多了（共 {total} 条）—</p>}
      {/* 哨兵元素：不需要可见内容，只要存在并能被观察 */}
      <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
    </div>
  );
}
```

关于"到底判断"多说一句：优先用响应里的 `total` 或 `hasNext` 字段做权威判断；不要用"返回了空数组就当到底"来推断——空页可能只是暂时的数据空洞，也可能是筛选条件写错，两种情况混在一起会掩盖 bug。

**常见坑**：

1. **加载一页后列表没撑满视口，滚动加载"卡住"**。症状：第一页只有 2 条，页面没有滚动条，也不再加载第二页。根因：`IntersectionObserver` 只在**交叉状态变化**时回调——数据追加后哨兵依然在视口内，状态没变化，回调不会再触发。修法：让 observer 的重建与加载状态联动（上面 hook 的 `enabled` 依赖设计：`loading` 结束后 `enabled` 变回 `true`，effect 重跑、重新 `observe`，IO 会对当前状态立即做一次评估，天然自愈）。
2. **快速滚动时数据乱序 / 重复**。症状：列表里出现重复项，或后加载的旧数据插到了新数据后面。根因：第 3、4 页请求并发，第 3 页后返回；如果用"请求完成 setList(prev => [...prev, ...json.list])"，后到的第 3 页会排在第 4 页后面。修法：同一时刻只允许一个在途请求（`if (loading) return` 门槛 + 请求完成后才允许下一次），或用 `AbortController` 在发新页前取消旧请求。本例用前者，够用且简单。
3. **开发环境首屏请求发两次**。症状：React 18 `StrictMode` 下 mount → unmount → mount，`useEffect` 跑两遍，第一页请求两次。根因：StrictMode 的故意行为，用于暴露"缺少清理逻辑"的问题。修法：保证 effect 的清理函数能取消未完成请求（本例 `AbortController` 模式）；生产构建不会有双调用，不必为它加 hack。
4. **滚动位置与锚点丢失**。症状：从详情页返回列表，从头开始了。根因：组件卸载即全部丢失，无限滚动的状态恢复成本比分页高得多。修法：把已加载数据和页码缓存到上层（`keepalive` 类方案或缓存到 store），或接受"返回即重载"的产品设定——这也是无限滚动在重后台系统里不主流的原因之一。

---

#### 3. 虚拟列表（`@tanstack/react-virtual` 渲染 1 万行）

**是什么**：虚拟列表（virtualization）只渲染"视口内 + 少量缓冲"的那几十行 DOM，其余 99% 的数据只参与高度计算、不生成节点。1 万行数据、屏幕上任何时刻真实存在的 DOM 行数不超过 30 行左右。

**为什么快**：浏览器渲染成本与 DOM 节点数正相关。1 万行 × 每行 5 个节点 ≈ 5 万个节点，带来三重开销：样式重算与布局（layout）要在整棵树上做、内存里每个节点都是真实对象（几 GB 量级页面的元凶）、即使不滚动也占绘制与合成成本。虚拟化后节点数骤降到 ~30 行，滚动时只更新这几十行的 `transform`（可被合成器线程直接处理，不走主线程布局），因此 1 万行和 10 万行的滚动帧率几乎没有差别。反过来说：**如果列表只有一两百条，不要上虚拟列表**——普通渲染远比引入虚拟化简单可靠，虚拟列表是"万级数据"的方案。

**怎么做（机制分步，先懂原理再用库）**：

1. 外层是**滚动容器**：固定高度 + `overflow: auto`，滚动条由它承担。
2. 内层是**撑高容器**：高度 = 总行数 × 行高（`getTotalSize()`），让滚动条长度反映全部数据——用户"以为"1 万行都渲染了。
3. 滚动位置 `scrollTop` 除以行高得到第一个可见行的下标 `startIndex`；视口高度除以行高得到可见行数——只渲染 `[startIndex - overscan, endIndex + overscan]` 这个切片。
4. 切片里每一行用 `position: absolute` + `translateY(start)` 精确摆到它"本来会在"的位置。
5. 行高不统一时，先按 `estimateSize` 估算撑住滚动条，行挂载后用 `measureElement` 实测修正（库内部基于 `ResizeObserver`）。

`@tanstack/react-virtual` v3 就是把上面 2–5 步封装成了 `useVirtualizer`。

**代码示例**（安装 → 1 万行数据 → 完整页面）：

```bash
npm i @tanstack/react-virtual
```

```tsx
// src/pages/BigTablePage.tsx
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Row {
  id: number;
  name: string;
  city: string;
  score: number;
}

const ROW_HEIGHT = 36;        // 行高：必须与 CSS 中实际行高一致（或走动态测量）
const CONTAINER_HEIGHT = 520; // 滚动容器高度

export default function BigTablePage() {
  // 生成 1 万行模拟数据：useMemo 保证重新渲染不重复生成
  const rows = useMemo<Row[]>(
    () =>
      Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `用户 ${i + 1}`,
        city: ['北京', '上海', '深圳', '杭州'][i % 4],
        score: (i * 37) % 100,
      })),
    [],
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,                        // 数据总量
    getScrollElement: () => parentRef.current, // 滚动容器（滚动事件与尺寸从它读）
    estimateSize: () => ROW_HEIGHT,            // 行高估算（px），动态行高时先估后测
    overscan: 8,                               // 视口两侧各多渲染 8 行，快速滚动不闪白
  });

  return (
    <div>
      <button
        onClick={() => virtualizer.scrollToIndex(4999, { align: 'start' })}
        style={{ marginBottom: 8 }}
      >
        跳到第 5000 行
      </button>
      {/* 外层：滚动容器。表头放它外面，才会固定不动 */}
      <div style={{ height: CONTAINER_HEIGHT, overflow: 'auto' }} ref={parentRef}>
        {/* 内层：撑高容器，高度 = 全部行的总高度，负责"制造"完整滚动条 */}
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {/* getVirtualItems() 返回当前需要渲染的行（视口 + overscan） */}
          {virtualizer.getVirtualItems().map((item) => (
            <div
              key={item.key}
              data-index={item.index} // measureElement 依赖这个属性定位行
              ref={(node) => {
                // 挂载后实测行高（动态行高场景必须；固定行高可省略）
                if (node) virtualizer.measureElement(node);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: ROW_HEIGHT,
                transform: `translateY(${item.start}px)`, // 移动用 transform，避免触发重排
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #eee',
                fontSize: 13,
              }}
            >
              <span style={{ width: 80 }}>{rows[item.index].id}</span>
              <span style={{ flex: 1 }}>{rows[item.index].name}</span>
              <span style={{ width: 120 }}>{rows[item.index].city}</span>
              <span style={{ width: 80, textAlign: 'right' }}>{rows[item.index].score}</span>
            </div>
          ))}
        </div>
      </div>
      <p>共 {rows.length} 行，实际渲染 {virtualizer.getVirtualItems().length} 行</p>
    </div>
  );
}
```

滚动这个页面时打开 DevTools 的 Elements 面板，可以看到行节点始终只有三十来个、`translateY` 在变——这就是"只渲染可视区"的直接证据。另外注意 `scrollToIndex` 这个 API：它是虚拟列表相对无限滚动的独特优势——**1 万行数据可以瞬间定位第 5000 行**（日志按级别跳转、通讯录按字母定位都靠它）。

顺带一提：如果想让整个页面（而不是某个 div）作为滚动容器，这个库提供了 `useWindowVirtualizer`（参数不含 `getScrollElement`，以 window 为滚动源），按需查官方文档即可，机制完全相同。

**常见坑**：

1. **内层容器忘了 `position: relative`**。症状：所有行叠在页面顶部某处，或"飞"到滚动容器外面。根因：行是 `position: absolute`，它的定位基准是**最近的 positioned 祖先**；内层容器没设 `relative`，基准就变成了更外层的某个定位元素。修法：撑高容器必须 `position: relative`（见代码注释）。
2. **`estimateSize` 与真实行高不一致，行与行重叠 / 出现空隙**。症状：滚动几屏后行高错乱，越滚偏差越大。根因：行高被 CSS 内容撑到 48px 而估算值还是 36，所有 `start` 偏移都按 36 算。修法二选一：固定行高场景让 CSS 与 `estimateSize` 严格一致（行内容 `ellipsis` 不许换行）；动态行高场景给行挂 `ref={node => virtualizer.measureElement(node)}` 并保留 `data-index`，库会实测修正。
3. **在弹层 / 抽屉 / 动画容器里初始化**。症状：弹层里的虚拟列表高度为 0、`getVirtualItems()` 为空。根因：挂载瞬间容器 `display: none` 或尺寸为 0，测量结果为空。修法：等弹层打开（动画结束、容器有真实尺寸）后再渲染列表，或给列表加一个由 `open` 控制的条件挂载。
4. **行内交互状态串位**。症状：勾选了第 3 行的复选框，滚动一段距离后勾选"跑"到了别的行上。根因：虚拟列表复用行节点（`item.key` 默认就是 index），行内部 state 跟着节点走而不是跟数据走。修法：**行组件不做状态自治**，勾选/展开等状态提升到父级用 `Map<rowId, state>` 管理，渲染时按 `rows[item.index].id` 读取。

---

#### 4. 搜索 + 筛选 + 排序组合（防抖搜索、条件放 URL）

**是什么**：一个真实列表页的完整状态机：搜索词 `keyword` + 筛选 `status` + 排序 `sort` + 分页 `page`/`pageSize`，五个条件互相联动（任何条件变化都回到第 1 页），全部同步到 URL 查询参数，请求做防抖与取消。

**为什么需要**：条件一多，"状态放哪"就不再是风格问题而是正确性问题。设计原则一句话：**URL 是"服务器状态"的镜像（决定请求什么数据的一切条件），组件 state 只放"客户端状态"（输入草稿、loading、选中的行）**。这样得到的收益：任何时刻刷新、分享、回退都还原同一个数据视图；排查问题时让用户把 URL 发给你，你能完整复现。防抖解决的是"输入即请求"的请求风暴（每个按键一发请求），取消解决的是慢请求返回后覆盖新结果的**脏数据竞态**。

**怎么做（机制分步）**：

1. 搜索框是**双层的**：本地 state `keywordInput` 负责输入即时回显（打字不卡）；经过 `useDebouncedValue` 300ms 防抖后得到 `keyword`，写入 URL。
2. 筛选（select）、排序（radio/select）是"点选即定"的交互，不需要防抖，直接写 URL。
3. **任何搜索/筛选/排序条件变化，同时把 `page` 重置为 1**——否则"第 5 页 + 新筛选"大概率是空页。
4. 全页只有一个数据 `useEffect`，依赖 `[keyword, status, sort, page, pageSize]`（全部从 URL 派生），URL 不变不请求。
5. 请求治理双保险：`AbortController` 取消上一个未完成请求 + 请求序号守卫（只接受最新序号的响应），二者留一个也行，都留最稳。

先写防抖 hook——它只有 8 行，但值得逐行理解：

```ts
// src/hooks/useDebouncedValue.ts
import { useEffect, useState } from 'react';

/** 返回 value 的防抖值：value 停止变化 delay 毫秒后才更新 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // value 再次变化时清掉上一个定时器——这就是防抖的全部本质
  }, [value, delay]);
  return debounced;
}
```

防抖的机制：每次 `value` 变化，effect 重跑，先清理上一个定时器再设新的。于是连续输入时前面的定时器永远活不到 300ms，只有"停下来"的最后一次才能触发更新。对比节流（throttle：固定间隔必发一次），搜索框要的是防抖——用户停止输入才有意义。

完整的商品列表页：

```tsx
// src/pages/ProductListPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface Product {
  id: number;
  title: string;
  price: number;
}
interface QueryResp<T> {
  list: T[];
  total: number;
}

// status 的合法值白名单：URL 是外部输入，必须校验
const STATUS_OPTIONS = ['all', 'on-sale', 'off-sale'] as const;
type Status = (typeof STATUS_OPTIONS)[number];
const SORT_OPTIONS = ['default', 'price-asc', 'price-desc'] as const;
type Sort = (typeof SORT_OPTIONS)[number];

function readParam<T extends readonly string[]>(
  params: URLSearchParams,
  key: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const v = params.get(key);
  return allowed.includes(v as T[number]) ? (v as T[number]) : fallback; // 非法值回退默认
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- 读：从 URL 派生全部查询条件（唯一事实来源）----
  const keyword = searchParams.get('keyword') ?? '';
  const status = readParam(searchParams, 'status', STATUS_OPTIONS, 'all');
  const sort = readParam(searchParams, 'sort', SORT_OPTIONS, 'default');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  // ---- 输入层：本地草稿 + 防抖 ----
  const [keywordInput, setKeywordInput] = useState(keyword); // 草稿只管回显，不直接发请求
  const debouncedInput = useDebouncedValue(keywordInput, 300);

  // 防抖值稳定后写入 URL（同时重置页码）
  useEffect(() => {
    if (debouncedInput === keyword) return; // 与 URL 已一致（首屏、清空）就不动
    setSearchParams(buildParams({ keyword: debouncedInput, page: '1' }), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput]);

  const setCondition = (patch: Record<string, string>) => {
    setSearchParams(buildParams({ ...patch, page: '1' }), { replace: true }); // 条件变化必回第 1 页
  };

  function buildParams(patch: Record<string, string>): URLSearchParams {
    // 以当前 URL 参数为底，应用补丁，去掉等于默认值的键——保持 URL 干净
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (next.get('keyword') === '') next.delete('keyword');
    if (next.get('status') === 'all') next.delete('status');
    if (next.get('sort') === 'default') next.delete('sort');
    if (next.get('page') === '1') next.delete('page');
    return next;
  }

  // ---- 数据层：唯一的请求 effect ----
  const [resp, setResp] = useState<QueryResp<Product>>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const lastSeq = useRef(0); // 请求序号守卫：只接受最新一次请求的响应

  const queryString = useMemo(() => {
    const qs = new URLSearchParams({ keyword, status, sort, page: String(page), pageSize: '20' });
    return qs.toString();
  }, [keyword, status, sort, page]);

  useEffect(() => {
    const seq = ++lastSeq.current; // 本次请求的序号
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/products?${queryString}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<QueryResp<Product>>)
      .then((json) => {
        if (seq !== lastSeq.current) return; // 保险 1：已有更新的请求，本响应作废
        setResp(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // 正常取消
        if (seq !== lastSeq.current) return;
        setResp({ list: [], total: 0 });
        setLoading(false);
      });
    return () => controller.abort(); // 保险 2：条件再变时取消上一个请求
  }, [queryString]);

  return (
    <div>
      <input
        value={keywordInput}
        placeholder="搜索商品名称"
        onChange={(e) => setKeywordInput(e.target.value)}
      />
      <select value={status} onChange={(e) => setCondition({ status: e.target.value })}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select value={sort} onChange={(e) => setCondition({ sort: e.target.value })}>
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {loading && <p>加载中…</p>}
      <ul>
        {resp.list.map((p) => (
          <li key={p.id}>
            {p.title} — ¥{p.price}
          </li>
        ))}
      </ul>
      <p>共 {resp.total} 条，第 {page} 页</p>
      <button disabled={page <= 1} onClick={() => setSearchParams(buildParams({ page: String(page - 1) }))}>
        上一页
      </button>
      <button onClick={() => setSearchParams(buildParams({ page: String(page + 1) }))}>下一页</button>
    </div>
  );
}
```

脏数据与请求取消的时序，值得在脑子里过一遍：用户输入 `a`，300ms 后发出请求 A（`keyword=a`）；紧接着输入 `ab`，再 300ms 后发出请求 B。如果 A 的服务器响应比 B 慢（大结果集往往更慢），没有治理时 A 会后到达并 `setState`，页面显示的是 `a` 的结果，而搜索框里明明写着 `ab`——这就是**脏数据**。`AbortController` 让 A 在 B 发出时被取消（若服务端支持取消，连接直接断开；即便不支持，前端的 `catch` 也吞掉了 AbortError）；序号守卫 `seq !== lastSeq.current` 则是纯前端兜底，连"取消失败/不可取消"的场景也覆盖。

**常见坑**：

1. **状态双写**。症状：URL 里是 `keyword=ab`，页面数据却是 `keyword=a` 的结果，或者两个搜索框显示不一致。根因：同一个条件同时存在 `useState` 和 URL 两份，更新时漏了一处。修法：严格执行"URL 是唯一事实源"，本地只存输入草稿和 loading 这类客户端态；凡是能从 URL 算出来的值，一律 `useMemo`/直接读，不落 state。
2. **筛选/搜索变化后忘记重置页码**。症状：停在第 5 页时输入新关键词，列表空了，URL 是 `keyword=x&page=5`。根因：新条件下的总页数可能小于 5。修法：所有条件变更统一走 `setCondition`（内部强制 `page=1`），不要在多处手写参数更新。
3. **防抖定时器没有清理**。症状：输入后 300ms 内卸载组件，控制台出现 "setState on unmounted component" 类警告（旧版 React）或内存泄漏提示。根因：自己写 `setTimeout` 时没在 effect 清理函数里 `clearTimeout`。修法：用上面的 `useDebouncedValue`（内部已清理），或遵循"每个 `setTimeout` 必配 `clearTimeout`"的肌肉记忆。
4. **深链接带脏参数**。症状：用户收藏的链接是 `?status=deleted`（后来这个枚举被下线了），页面静默渲染异常。根因：把 URL 参数当可信输入。修法：`readParam` 白名单校验回退默认值，和 4.3.1 的数字校验同一个思路——**凡是来自 URL 的值，都当作用户手敲的表单处理**。
5. **用 `useEffect` 监听多个条件分别发请求**。症状：一次筛选变化触发两次请求（先 keyword 变了发一次，page 重置又发一次）。根因：把"每个参数一个 effect"拆开写，条件联动时状态分步更新。修法：合并为唯一的请求 effect，依赖最终拼好的 `queryString`（或依赖全部条件数组），保证一次状态变化只发一次请求。

---

### 4.4 路由（React Router v6/v7）

写路由之前，先花一段话建立 **v6 → v7** 的版本认知，避免在新旧教程之间迷路：

- **包结构合并**：v7 里 `react-router-dom` 并入了 `react-router`，所有 API 从 `react-router` 一个包导入（`npm i react-router`）；`react-router-dom@7` 只剩一层 re-export 兼容垫片，老代码的 `from 'react-router-dom'` 还能跑，但新代码统一写 `from 'react-router'`。
- **数据路由（data router）是唯一主角**：`createBrowserRouter` + `RouterProvider` 从 v6.4 起就是官方主推形态，v7 把它确定为标准用法——路由对象上可以挂 `loader`/`action`/`errorElement`/`lazy` 这些数据层能力，而 `<BrowserRouter>` + `<Routes>` 的纯声明式写法仍可用，但享受不到这些能力（也用不了 4.4.3 的 `useBlocker`）。
- **API 转正与删除**：v6 后期标 `unstable_` 的 API（如 `useBlocker`）在 v7 转正；`usePrompt` 被彻底移除，离开拦截只有 `useBlocker` 一条路。v6 项目若开启了 `future.v7_*` 预警 flag，升级 v7 后行为零变化。
- **升级路径**：v6.4+ 项目基本只需改导入来源；更老的项目先把 `<Routes>` 改成 `createBrowserRouter` 配置数组。本节代码全部按 v7 写法（v6.4+ 几乎逐字兼容）。

#### 1. 路由配置、嵌套路由、`Outlet`、布局路由

**是什么**：路由不再写在 JSX 里，而是用一个对象数组描述整棵路由树，交给 `createBrowserRouter` 创建 router 实例，再用 `<RouterProvider>` 挂载。**布局路由**（layout route）是"不对应独立页面、只提供外壳"的路由（侧边栏、顶栏、面包屑），子路由的页面内容通过 `<Outlet />` 这个占位组件注入。**嵌套路由**即路由对象层层嵌 `children`，URL 的路径段与嵌套层级对应。

**为什么需要**：一是数据路由的所有能力（`loader`、`errorElement`、`lazy`、`useBlocker`）只认对象配置；二是布局与内容解耦后，**子路由切换时外壳不卸载**——顶栏的搜索框输入、侧边栏的展开状态、正在播放的背景音乐都不会因为切页面而丢失；三是导航高亮、面包屑这些"外壳级 UI"天然知道自己处于哪段子路由（配合 `NavLink`、`useLocation`）。

**怎么做（机制分步）**：

1. `createBrowserRouter(routes)` 在应用外部创建 router 实例（**模块级创建一次**，不要放进组件渲染过程）。
2. 匹配 URL 时，React Router 从根到叶算出一条"匹配链"：比如 `/settings/profile` 命中 `Layout → SettingsLayout → ProfilePage` 三层。
3. 渲染链层层嵌套：`Layout` 渲染时把 `<Outlet />` 放在内容区，`Outlet` 里渲染 `SettingsLayout`，它自己的 `<Outlet />` 再渲染 `ProfilePage`。
4. `index: true` 的**索引路由**处理"直接访问父路径本身"（如 `/settings`）的情况，通常用来重定向到默认子页。

**代码示例**（入口 → 路由表 → 两个布局，可直接跑）：

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router'; // v7：统一从 react-router 导入
import { routes } from './routes';
import './index.css';

// 数据路由自带 history 管理，不需要再包 <BrowserRouter>
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

```tsx
// src/routes.tsx
import { Navigate, RouteObject } from 'react-router';
import Layout from './layout/Layout';
import SettingsLayout from './layout/SettingsLayout';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AccountPage from './pages/AccountPage';
import UserDetailPage from './pages/UserDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',                // 一级布局路由：全站外壳（顶栏 + 内容区）
    element: <Layout />,
    children: [
      // 索引路由：访问 / 本身时重定向到 /dashboard（replace 避免多一条历史记录）
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'settings',     // 二级布局路由：设置页专属的左侧菜单
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> }, // 相对路径重定向
          { path: 'profile', element: <ProfilePage /> },               // /settings/profile
          { path: 'account', element: <AccountPage /> },               // /settings/account
        ],
      },
      { path: 'users/:id', element: <UserDetailPage /> }, // 动态参数（4.4.2 展开）
      { path: '*', element: <NotFoundPage /> },           // 兜底 404（4.4.5 展开）
    ],
  },
];
```

```tsx
// src/layout/Layout.tsx
import { NavLink, Outlet } from 'react-router';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'nav nav-active' : 'nav')}
        >
          仪表盘
        </NavLink>
        <NavLink
          to="/settings/profile"
          className={({ isActive }) => (isActive ? 'nav nav-active' : 'nav')}
        >
          设置
        </NavLink>
      </header>
      {/* 子路由内容在这里注入：切子路由时本组件不卸载、state 不丢 */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

```tsx
// src/layout/SettingsLayout.tsx
import { NavLink, Outlet } from 'react-router';

export default function SettingsLayout() {
  return (
    <div className="settings">
      <aside>
        <NavLink to="profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          个人资料
        </NavLink>
        <NavLink to="account" className={({ isActive }) => (isActive ? 'active' : '')}>
          账号安全
        </NavLink>
        {/* 注意 to="profile" 是相对路径：相对当前路由 /settings 解析为 /settings/profile */}
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
```

顺带两个 v7 风格说明：`element: <Layout />` 也可以写成 `Component: Layout`（属性风格，效果相同，可按团队喜好统一）；嵌套子路由的 `path` 不以 `/` 开头时自动拼接父路径，`'profile'` 挂在 `'settings'` 下就是 `/settings/profile`。

**常见坑**：

1. **访问 `/settings` 页面只有菜单没有内容**。症状：左侧菜单渲染了，右侧空白。根因：`/settings` 匹配到布局路由本身，但布局的 `Outlet` 里没有任何子路由可渲染——没配 `index` 索引路由。修法：加 `{ index: true, element: <Navigate to="profile" replace /> }`，让"访问父路径"有确定的去向。
2. **在组件渲染过程中调用 `createBrowserRouter`**。症状：路由状态（滚动位置、location state）随机丢失，或每次父组件渲染路由器被重建。根因：router 实例被当成"渲染产物"创建，`createBrowserRouter` 应在整个应用生命周期里只执行一次。修法：放到模块顶层（如 `routes.ts` 旁的 `router.ts`），组件只消费 `<RouterProvider router={router} />`。
3. **子路由 `path` 拼接错误**。症状：访问 `/settings/profile` 404。根因：子路由写了 `path: '/settings/profile'`（以 `/` 开头表示完整绝对路径，虽然恰好等价，但把同一段路径维护在两处，父路径改名时必漏）；或拼错成 `path: 'settings/profile'` 挂在了别处。修法：团队统一约定——嵌套路由一律用**相对路径**，只有根路由用 `/`。
4. **以为布局会随子路由切换重挂载**。症状：想当然把"每次进页面都要重置的筛选条件"放在布局组件里，结果没重置。根因：布局路由在子路由间切换时**保持挂载**（这正是它的价值）。修法：页面级一次性状态放子路由页面组件里，或用 `useEffect` 依赖 location 清理。

---

#### 2. 动态参数 `:id`、查询参数读写

**是什么**：路径里的变量段（`/users/:id`）通过 `useParams()` 读取；`?` 之后的查询参数（`?tab=logs&page=2`）通过 `useSearchParams()` 读写。两者语义不同：**路径参数标识"哪一个资源"（必填、参与路由匹配），查询参数描述"资源的哪个视图"（可选、不影响匹配哪个组件）**。

**为什么需要**：详情页（`/users/:id`）、多 Tab 的详情（`?tab=`）、可分享的列表筛选（4.3 整节的底座）都建立在这两个 API 上。关键认知：`useParams` 返回的每个值类型都是 `string | undefined`——路由配置里的 `:id` 只是"可能有"，TypeScript 不会替你保证它存在，**使用前必须收窄**。

**怎么做（机制分步）**：

1. 路由表声明 `path: 'users/:id'`，匹配 `/users/42` 时 `useParams()` 得到 `{ id: '42' }`——注意是**字符串** `"42"`，没有自动转数字。
2. 组件先校验再使用：缺失、非数字直接渲染兜底 UI，不发请求。
3. 参数变化（`/users/1` → `/users/2`）**不会卸载组件**，只会让 `useParams` 的返回值变化——数据要靠 `useEffect` 依赖 `id` 重新拉取。
4. 查询参数用 `useSearchParams()`，它返回 `[searchParams, setSearchParams]`：`get`/`getAll` 读，`setSearchParams` 写（对象形式**整体替换**、函数形式增量改，坑同 4.3.1）。

**代码示例**：

```tsx
// src/pages/UserDetailPage.tsx
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

interface UserDetail {
  id: number;
  name: string;
  email: string;
}

const TABS = ['overview', 'logs', 'security'] as const;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>(); // 类型：string | undefined，永远不能直接当 string 用

  // ---- 路径参数：先收窄再使用 ----
  const userId = Number(id);
  if (!id || !Number.isInteger(userId) || userId < 1) {
    // 兜底要在发请求之前：/users/abc、/users/0 都不允许往下走
    return <p>无效的用户 ID</p>;
  }

  // ---- 查询参数：读 ----
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'overview'; // 缺省值兜底
  const tags = searchParams.getAll('tags'); // 同名多值：?tags=vip&tags=beta → ['vip', 'beta']

  // ---- 查询参数：写（函数式，保留其他参数）----
  const switchTab = (t: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', t);
        return next;
      },
      { replace: true }, // 切 Tab 不产生历史记录，后退直接离开详情页
    );
  };

  // ---- 参数变化时重新取数：组件不会因 id 变化而卸载，必须靠依赖驱动 ----
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<UserDetail>)
      .then((json) => {
        setUser(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setUser(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [userId]); // /users/1 → /users/2 时这里重新执行

  return (
    <div>
      <nav>
        {TABS.map((t) => (
          <button key={t} aria-current={tab === t ? 'tab' : undefined} onClick={() => switchTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {loading && <p>加载中…</p>}
      {user && (
        <>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <p>
            当前 Tab：{tab}；标签：{tags.join(', ') || '无'}
          </p>
          {/* 列表页 → 详情页的链接写法：模板字符串拼 id */}
          <Link to="/users">返回列表</Link>
        </>
      )}
    </div>
  );
}
```

**常见坑**：

1. **`/users/1` 切到 `/users/2`，页面数据还是 1 号用户的**。症状：列表点不同行进详情，第一次正确，第二次开始内容"卡"在上一个用户；或者表单输入框残留上一个用户的值。根因：同一路由匹配同一组件，**参数变化只触发重渲染、不触发重新挂载**，`useState` 初始值不会重算。修法（三选一）：数据用 `useEffect([id])` 重拉（如上）；纯 UI 态在 `useEffect` 里随 `id` 重置；最粗暴的是给页面组件加 `key={id}` 强制整个子树重建——简单有效，代价是丢失所有内部状态与滚动位置，表单类详情页用它反而正确。
2. **`useParams()` 返回 `undefined` 导致白屏**。症状：控制台 `TypeError: Cannot read properties of undefined`，页面空白。根因：`const { id } = useParams()` 后直接 `fetch(`/api/users/${id}`)` 或 `id.toString()`，而该组件被复用到了不带 `:id` 的路由上，或路由表写错。修法：像上面一样在使用前收窄类型并渲染兜底；开启 TS 的 `noUncheckedIndexedAccess` 类严格选项有助于在编译期暴露。
3. **把查询参数当数字用没做校验**：`Number(searchParams.get('page'))` 得 `NaN` 继续参与计算。与 4.3.1 坑 2 同根同修——URL 一切皆外部输入。
4. **`setSearchParams({ tab: 'logs' })` 丢掉了 `tags` 等其他参数**。对象形式是整体替换，不是 merge。修法：函数式更新（本节与 4.3.1 已示范），把这个规则写进团队 ESLint 约定或封装 `useQueryParam(key)` 工具 hook。

---

#### 3. 编程式导航、离开拦截（表单未保存提示）

**是什么**：`useNavigate()` 在 JS 代码里执行跳转（登录成功后、提交后、定时跳转、`navigate(-1)` 回退）；离开拦截（`useBlocker`）在用户**试图离开当前页**时先拦下来，弹确认框——典型场景是表单有未保存的修改。

**为什么需要**：声明式导航（`<Link>`）覆盖不了"跳转发生在逻辑之后"的场景；而表单页如果没有离开拦截，用户误点侧边栏或后退键，半页输入瞬间蒸发——这是真实用户投诉率最高的一类事故。

**怎么做（机制分步）**：

1. `useNavigate()` 返回 `navigate` 函数：`navigate('/path')` 压栈跳转；`navigate('/path', { replace: true })` 替换当前记录（登录后、保存成功后用）；`navigate(-1)` 等价浏览器后退；`navigate('/path', { state: {...} })` 携带跳转附言，目标页用 `useLocation().state` 读取。
2. `useBlocker(blockerFunction)`：函数返回 `true` 时，本次导航被挂起，`blocker.state` 变为 `'blocked'`；调 `blocker.proceed()` 放行、`blocker.reset()` 取消并回到 `'idle'`。
3. **两道防线缺一不可**：`useBlocker` 只能拦**路由器管的导航**（应用内跳转、后退键）；浏览器刷新、关闭标签页、跳转外站路由器无能为力，要配 `useBeforeUnload`（对原生 `beforeunload` 事件的封装）。
4. 确认 UI 自己画（或用 4.5.2 的 confirm），原生 `confirm()` 虽然能用但样式不可控、阻塞主线程，生产上一般不用。

**代码示例**（完整编辑页：脏检查 + 双重拦截 + 确认弹层）：

```tsx
// src/pages/ArticleEditPage.tsx
import { useState } from 'react';
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router';

export default function ArticleEditPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const isDirty = title !== savedTitle; // 脏判断：当前值 ≠ 最后一次保存值

  // 防线一：拦截应用内导航（含后退键）。
  // 注意：useBlocker 只能在 createBrowserRouter 数据路由下使用
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // 防线二：拦截刷新 / 关闭标签 / 跳外站（浏览器原生能力，文案由浏览器决定）
  useBeforeUnload((e) => {
    if (isDirty) {
      e.preventDefault(); // 标准触发方式
      e.returnValue = ''; // 旧版 Chrome 必须设置 returnValue 才会弹确认
    }
  });

  const save = async () => {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSavedTitle(title); // 先把"干净基线"更新，isDirty 变 false
    navigate('/articles'); // 再跳转，此时不会再被自己拦住
  };

  return (
    <div>
      <h1>编辑文章</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        style={{ width: 320 }}
      />
      <button onClick={save}>保存并返回</button>

      {/* blocker.state 为 blocked 时渲染确认弹层（样式可用 4.5.1 的 Modal） */}
      {blocker.state === 'blocked' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <p>有未保存的修改，确定要离开吗？</p>
            <button onClick={() => blocker.proceed()}>放弃修改并离开</button>
            <button onClick={() => blocker.reset()}>留在此页</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

`useBlocker` 的边界必须心里有数：

- **只在数据路由下可用**。路由用 `<BrowserRouter>` 挂载时调用它会直接抛错——这不是 bug，是设计：拦截导航需要路由器接管 history，只有 `createBrowserRouter` 做得到。
- **拦不住刷新、关标签、跳外站**，这些交给 `useBeforeUnload`（原生弹窗，文案不可定制）；两道防线拦截的是不同世界。
- `blocker.state` 有三个值：`'idle'`（未拦截）、`'blocked'`（等待用户决定）、`'proceeding'`（已放行、目标路由加载中）。确认弹层只在 `blocked` 时出现。
- 保存成功后**先更新脏标记再导航**（见 `save` 的顺序），否则会被自己的拦截器拦住，用户刚保存完又看到"未保存"提示。
- 配合 react-hook-form 时，脏判断用 `formState.isDirty`，提交成功后它自动回到干净态（`isSubmitSuccessful` 后 reset），思路与上面的 `savedTitle` 基线完全一致。

**常见坑**：

1. **在 render 里调用 `navigate()`**。症状：控制台报 "Cannot update a component while rendering a different component" 或不跳转。根因：render 阶段只能产生"渲染结果"，不能触发副作用（导航本质是 state 更新）。修法：render 中的条件跳转用组件 `<Navigate to="..." replace />`；事件回调和 `useEffect` 里才用 `navigate()`。
2. **登录成功后忘了 `replace`**。症状：登录 → 首页，按后退回到登录页，再后退才退出，或配合鉴权重定向形成"登录页↔首页"循环。根因：登录页这条历史记录不该存在。修法：`navigate(redirectTarget, { replace: true })`。
3. **`navigate` 传参用查询字符串硬塞复杂对象**。症状：URL 又长又乱、对象还要序列化反序列化。修法：不进 URL 的"跳转附言"用 `navigate('/path', { state: { from: detail } })`，目标页 `const state = useLocation().state as { from?: string } | null` 读取；会话结束即失、刷新仍保留（history state 存在浏览器会话里）——但注意**它不出现在地址栏，不可分享**，需要分享的信息必须走查询参数。
4. **`useBlocker` 传了恒为 `true` 的值**。症状：保存成功后跳转也被拦。根因：拦截条件没有和"脏"状态联动。修法：条件里显式带上 `isDirty`（如上），或用函数形式精确比较 `currentLocation` / `nextLocation`。

---

#### 4. 路由懒加载 `lazy()` + Suspense、加载骨架

**是什么**：把每个路由的页面组件拆成独立的 JS 包（chunk），用户访问到该路由时才下载并执行。两种写法：React 的 `lazy()` + `<Suspense>`（组件级通用方案），或 React Router 的路由级 `lazy` 属性（数据路由专属，还能顺带懒加载 `loader`）。

**为什么需要**：后台系统动辄五六十个页面，首屏用户只用到登录页一个。不拆包时所有页面代码打进首屏 bundle，白屏时间随页面数线性增长；Vite 对动态 `import()` 自动做代码分割，路由是天然的分界线——**路由级分割是收益/成本比最高的优化**，通常一行改动换首包减半。

**怎么做（机制分步）**：

1. 把页面组件的静态 `import` 改成 `lazy(() => import('./pages/XxxPage'))`——`import()` 返回 Promise，首次需要组件时才去下载 chunk。
2. 懒组件不能直接渲染（可能还没加载完），必须包在 `<Suspense fallback={...}>` 里：加载期间显示 fallback。
3. fallback 放在**布局路由的内容区**（包住 `<Outlet />`），这样加载新页面时顶栏侧栏保持不动，只有内容区显示骨架——这是"局部加载"的正确粒度。
4. 骨架屏（Skeleton）与最终页面**结构对齐**（头部一条 + 三行卡片），避免内容到达时布局跳变。

**代码示例**：

```tsx
// src/layout/Layout.tsx（改造：内容区包 Suspense）
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { PageSkeleton } from './PageSkeleton';

export default function Layout() {
  return (
    <div className="app-shell">
      <header>
        <NavLink to="/dashboard">仪表盘</NavLink>
        <NavLink to="/settings/profile">设置</NavLink>
      </header>
      <main>
        {/* 加载期间：外壳不动，内容区显示骨架屏 */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
```

```tsx
// src/layout/PageSkeleton.tsx
export function PageSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="页面加载中">
      {/* 骨架与真实页面同构：标题一行 + 内容三行，减少加载完成时的布局跳动 */}
      <div className="skeleton-bar" style={{ width: '30%', height: 24 }} />
      <div className="skeleton-bar" style={{ width: '100%', marginTop: 16 }} />
      <div className="skeleton-bar" style={{ width: '90%' }} />
      <div className="skeleton-bar" style={{ width: '60%' }} />
    </div>
  );
}
```

```css
/* src/index.css */
.skeleton-bar {
  height: 14px;
  border-radius: 4px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: skeleton-wave 1.2s ease infinite; /* 微光扫过，明确告诉用户"在加载" */
}
@keyframes skeleton-wave {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
```

路由级 `lazy` 的写法（与 `React.lazy` 二选一，数据路由推荐）：

```tsx
// src/routes.tsx（节选）：路由级懒加载
import { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />, // 布局不懒加载：首屏立刻要有
    children: [
      {
        path: 'dashboard',
        // 模块的 default export 会被当作该路由的组件
        lazy: () => import('./pages/DashboardPage'),
      },
      {
        path: 'settings/profile',
        // 需要同时懒加载非组件导出（如 loader）时，返回路由属性对象：
        lazy: async () => {
          const { default: Component, loader } = await import('./pages/ProfilePage');
          return { Component, loader };
        },
      },
    ],
  },
];
```

两种方式怎么选：`React.lazy` 粒度自由（任何组件都能懒）、Suspense fallback 位置自定；路由级 `lazy` 少一层样板、能懒加载 `loader` 等 route 属性。实际项目里**页面级用路由 `lazy`，页面内超重的局部组件（图表编辑器、富文本）再用 `React.lazy`** 是常见组合。另一个 v7 细节：路由切换默认被包在 `startTransition` 里，慢的路由加载不会阻塞用户继续操作旧页面，体验上"点了没反应"的卡顿感比手动 `lazy` 时代轻得多。

**常见坑**：

1. **发版后旧页面点击导航报 "Failed to fetch dynamically imported module"**。症状：用户从昨天开着的标签页里点菜单，白屏或报错。根因：新版本部署后，旧的 chunk 文件名（带 hash）已不存在，浏览器按旧地址取 404。修法：在错误兜底里识别动态导入失败并整页刷新一次（拉到最新 HTML 与资源清单）：

```tsx
// src/utils/reloadOnChunkError.ts
export function reloadOnChunkError(message: string) {
  const patterns = [
    'Importing a module script failed',
    'Failed to fetch dynamically imported module',
    'Loading chunk',
  ];
  if (patterns.some((p) => message.includes(p))) {
    const key = 'chunk-reloaded';
    // sessionStorage 防止刷新后仍失败造成死循环：只自动刷一次
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
    return true;
  }
  return false;
}
```

（在 4.4.5 的 `errorElement` 错误页里对 `error.message` 调用它即可。）

2. **骨架屏闪烁**。症状：chunk 已被缓存，加载 20ms 就完成，骨架屏闪一下又消失，观感比直接白一下更差。根因：fallback 对"极快加载"没有消抖。修法：给骨架加最短展示时间（如用 state 让 fallback 至少停留 300ms），或依赖 v7 默认的 `startTransition` 行为（慢加载不再立刻切 fallback，旧页面保持可交互）。取舍在于：闪烁是视觉问题，不修也不影响功能。
3. **懒加载粒度过细**。症状：首屏没变大，但每次点页面都要等两三个 chunk 串行加载（页面 chunk → 页面里 lazy 的图表 → 图表里 lazy 的依赖）。根因：把 `lazy` 当免费优化到处撒。修法：以"路由"为单位分割；重组件单独分割；评估依赖关系避免请求瀑布（Vite 构建分析面板看 chunk 依赖图）。
4. **懒加载页面的默认导出写成了具名导出**。症状：控制台报 "lazy: Component must not be undefined" 之类的错。根因：`lazy: () => import('./pages/X')` 与 `React.lazy(() => import('./pages/X'))` 都约定模块有 **default export**。修法：页面组件 `export default function XxxPage()`；确实只有具名导出时，写成 `import('./pages/X').then(m => ({ default: m.XxxPage }))`。

---

#### 5. 鉴权路由（ProtectedRoute）、404、错误路由（errorElement）

**是什么**：三类"非正常页面流"的路由设施——鉴权路由（未登录访问受保护页时重定向到登录页，登录后回跳）、404（URL 匹配不到任何路由）、错误路由（路由渲染或数据加载抛异常时的兜底 UI，`errorElement`）。

**为什么需要**：鉴权放在每个页面里手写是重复且易漏的（总有新页面忘了加），统一在路由层拦截是唯一可维护的做法；404 与错误页则是"最后一道防线"——没有它们，用户看到的是白屏加一串控制台报错，而 `errorElement` 相比手写 ErrorBoundary 的优势是**能拿到路由上下文里的错误对象**（状态码、loader 错误），可以区分"404 没找到"和"500 服务器炸了"。

**怎么做（机制分步）**：

1. ProtectedRoute 做成**无 path 的布局路由**：自身只负责判断，通过则渲染 `<Outlet />`（子路由们），不通过渲染 `<Navigate to="/login" />`。
2. 鉴权是**三态**（checking / authed / unauth）而非两态——刷新页面时要先异步确认登录态，这个窗口期必须显示 loading，否则会"闪跳登录页"。
3. 重定向到登录页时用 `state` 记住"用户本来想去哪"，登录成功后跳回去。
4. 404 用 `path: '*'` 通配路由兜底；数据路由里任何 render/loader 抛出的错误冒泡到**最近的 `errorElement`**，错误页用 `useRouteError` 拿错误对象、`isRouteErrorResponse` 判断是否是带状态码的 `Response`。

**代码示例**（鉴权 → 路由表 → 登录回跳 → 错误页）：

```tsx
// src/auth/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

/** 三态鉴权守卫：以布局路由形态包裹一组需要登录的子路由 */
export function ProtectedRoute() {
  const { status, user } = useAuth(); // status: 'checking' | 'authed' | 'unauth'
  const location = useLocation();

  if (status === 'checking') {
    return <p>正在确认登录状态…</p>; // 刷新时的鉴权请求期：不能闪跳登录页
  }
  if (status === 'unauth' || !user) {
    // state 记住来路，登录后回跳；replace 让登录页不进历史，后退不会回到受保护页
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />; // 已登录：渲染子路由
}

/** 按钮级/页面级角色权限：包在具体页面外 */
export function RequireRole({
  role,
  children,
}: {
  role: 'admin' | 'member';
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user?.roles.includes(role)) {
    return <p>403：你的角色无权访问该页面</p>;
  }
  return <>{children}</>;
}
```

```tsx
// src/routes.tsx（鉴权 + 404 + errorElement 的完整骨架）
import { Navigate, RouteObject } from 'react-router';
import { ProtectedRoute, RequireRole } from './auth/ProtectedRoute';
import Layout from './layout/Layout';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RouteErrorPage from './pages/RouteErrorPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />, // 根级错误兜底：任何子路由的错误最后都会到这
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <ProtectedRoute />, // 无 path 布局路由：只做鉴权，不改 URL 结构
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          {
            path: 'admin',
            element: (
              <RequireRole role="admin">
                <AdminPage />
              </RequireRole>
            ),
          },
        ],
      },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <RouteErrorPage /> }, // 404 兜底也复用错误页（下方处理 404 分支）
    ],
  },
];
```

```tsx
// src/pages/LoginPage.tsx（登录成功回跳的关键三行）
import { useLocation, useNavigate } from 'react-router';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onLoginSuccess = () => {
    navigate(from, { replace: true }); // 回到用户原本想去的页；replace 甩掉登录页历史
  };
  return <button onClick={onLoginSuccess}>模拟登录成功</button>;
}
```

```tsx
// src/pages/RouteErrorPage.tsx（404 与错误路由统一处理）
import { isRouteErrorResponse, Link, useLocation, useRouteError } from 'react-router';
import { reloadOnChunkError } from '../utils/reloadOnChunkError';

export default function RouteErrorPage() {
  const error = useRouteError(); // 错误对象：可能是 Response、Error 或任意抛出值
  const location = useLocation();

  // 发版后旧 chunk 加载失败：自动刷新一次拉新资源（见 4.4.4 坑 1）
  if (error instanceof Error && reloadOnChunkError(error.message)) {
    return <p>正在刷新页面以加载最新版本…</p>;
  }

  if (isRouteErrorResponse(error)) {
    // loader 或组件里 throw new Response(null, { status: 404 }) 会走到这里
    if (error.status === 404) {
      return (
        <div>
          <h1>404</h1>
          <p>页面不存在：{location.pathname}</p>
          <Link to="/">回首页</Link>
        </div>
      );
    }
    return (
      <div>
        <h1>出错了 {error.status}</h1>
        <p>{error.statusText || '服务器开小差了'}</p>
        <Link to="/">回首页</Link>
      </div>
    );
  }

  if (error instanceof Error) {
    // 组件渲染抛出的 JS 异常
    return (
      <div>
        <h1>页面渲染出错</h1>
        <p>{error.message}</p>
        <Link to="/">回首页</Link>
      </div>
    );
  }
  return <h1>未知错误</h1>;
}
```

生产里一个常用技巧：详情页数据不存在时，直接 `throw new Response(null, { status: 404 })`（在 `loader` 里或组件里都行，数据路由都会把它交给最近的 `errorElement`），错误页统一渲染"404 页面不存在"——**用错误流替代每个页面自己写 if-else 空态**，路由结构即错误处理结构。`errorElement` 支持**就近捕获**：给某段子路由配更具体的 `errorElement`，就只接管那段的错误，其余继续冒泡到根级。

**常见坑**：

1. **鉴权只写了两态，刷新时闪跳登录页**。症状：已登录用户按 F5，页面先闪一下登录页又跳回来；或 worse，回跳时 `state.from` 丢了落在首页。根因：登录态存 token 时，刷新后需要异步验证（调 `/api/me`），验证返回前 `user` 是 `null`，两态逻辑把它当"未登录"。修法：`status: 'checking' | 'authed' | 'unauth'` 三态（如上），checking 期间渲染占位，不做任何重定向。
2. **在 render 里调用 `navigate('/login')` 做鉴权跳转**。症状：控制台警告且行为不可预期。根因：见 4.4.3 坑 1——render 阶段不能触发副作用。修法：条件跳转一律渲染 `<Navigate to="/login" replace />` 组件，让 React 在提交阶段处理。
3. **`path: '*'` 与嵌套路由的位置关系导致 404 页"丢外壳"**。症状：某些路径的 404 没有侧边栏、页面完全裸奔。根因：`'*'` 挂在根路由 children 下时，404 出现在根布局内（有外壳）；如果项目在多处（每个布局路由下）都放了 `'*'`， deepest 匹配优先，行为依路径而异。修法：约定只在需要外壳的层级放 `'*'`；要求"布局内 404"就放该布局 children 里，要求"全屏 404"就挂在根级、放在 `Layout` 之外的同级。
4. **errorElement 一处没配，生产环境直接显示 React Router 内置错误页**。症状：用户看到框架自带的深色错误页（开发态带堆栈，生产态也有兜底文案），显得产品"坏了"。根因：数据路由没配 `errorElement` 时走默认错误界面。修法：至少给根路由配一个统一的 `errorElement`；再按需给关键子树配就近的错误页。
5. **404 判断只依赖 `'*'` 兜底，详情页不存在的 ID 却渲染了空壳**。症状：`/users/99999999` 匹配到 `:id` 路由，页面渲染出来但数据全空——用户以为"这个用户真的存在但没内容"。根因：路由匹配成功 ≠ 资源存在。修法：请求返回 404 时 `throw new Response(null, { status: 404 })`，让错误页接管（见上文技巧）。

---

### 4.5 弹层体系

弹层（overlay）是 Modal、Drawer、Toast、Confirm、下拉菜单的统称。它们与普通组件最大的差别是：**渲染位置不在文档流的"当前位置"，行为规范也不归 HTML 默认逻辑管**——于是产生三条工程主线：挂到哪（`createPortal`）、怎么交互（键盘与鼠标的关闭约定）、副作用怎么治理（滚动锁定、层级、焦点）。本节按这三条线展开；完整的组件级实现（定位、退出动画、焦点陷阱）在《[react-组件库实战大纲.md](react-组件库实战大纲.md)》的 A 段有体系化清单，这里先把业务代码必须懂的部分吃透。

#### 1. Modal / Drawer：`createPortal`、ESC 关闭、点遮罩关、滚动锁定

**是什么**：Modal（对话框）与 Drawer（抽屉）是最常见的声明式弹层：以 `<Modal open={open} onClose={...} />` 的组件形态使用，内部解决四个问题——渲染到 `document.body`（`createPortal`）、按 ESC 关闭、点遮罩关闭、打开期间锁住背景滚动。Drawer 与 Modal 机制完全同源，只是容器定位（右侧/左侧滑入）与动画方向不同。

**为什么需要 `createPortal`**：`ReactDOM.createPortal(children, container)` 把 children 渲染到 DOM 树的任意节点下（而不是组件所在的当前位置），但**事件冒泡仍遵循 React 组件树**——portal 内部点击会先冒泡到定义它的组件的 onClick，再按真实 DOM 冒泡，这是 portal 最反直觉也最有用的特性。为什么弹层需要它：

1. **`overflow` 裁剪**：页面布局里滚动容器遍地都是（侧栏 `overflow: auto`、卡片 `overflow: hidden`）。弹层如果渲染在这些容器内部，`position: absolute/fixed` 都可能被祖先的 `overflow` 裁剪——弹层被"切"出一道口子，或者出现"容器内滚动"的诡异表现。
2. **`z-index` 层叠上下文**：任何创建了层叠上下文的祖先（`transform`、`filter`、`opacity < 1`、`isolation` 等）都会把内部元素的 `z-index` 困在里面——弹层写 `z-index: 9999` 也盖不住外面 `z-index: 10` 的元素，因为比的不是全局，是各自上下文内的排名。
3. portal 到 `document.body` 后，弹层是 body 的直接子节点，脱离了所有业务容器的约束，`fixed` 定位和全局 z-index 才真正生效。

**怎么做（机制分步）**：一个生产可用的 Modal 要依次解决四件事——

1. **挂载**：`createPortal(<div className="modal-mask">…</div>, document.body)`。
2. **ESC 关闭与多层叠加**：在 `document` 上监听 `keydown`，`e.key === 'Escape'` 时调 `onClose`。关键难点是**多层弹层同时打开时（Modal 里又开了个 Select 下拉或二级确认框），ESC 只应关最上层**。方案是维护一个模块级"弹层栈"：打开时入栈，ESC 时只有栈顶的实例响应对话。为什么不能用"子层先 `stopPropagation`"？因为两个监听器都直接挂在 `document` 上，`stopPropagation` 拦不住**同一节点上**的其他监听器（触发顺序取决于注册顺序，父弹层先挂载先触发，顺序恰好是错的），栈判断是唯一确定性方案。
3. **点遮罩关**：给遮罩 div 挂 click，判定 `e.target === e.currentTarget`（点的是遮罩本身而不是冒上来的弹层内容）。还要防一个边缘情况：用户在弹层内**框选文字**，松开鼠标时指针恰好在遮罩上——click 事件 target 是遮罩，会被误判为"点遮罩关闭"。解法是记录 `mousedown` 的起点，按下与松开都在遮罩上才算点击遮罩。
4. **滚动锁定**：打开期间禁掉背景滚动（下面单独深讲）。

先看弹层栈与滚动锁定这两个独立模块：

```ts
// src/overlay/layerStack.ts
// 模块级弹层栈：解决"多个弹层同时打开时 ESC 只关最上层"
type LayerHandle = {
  isTop: () => boolean; // 自己是否是栈顶（只有栈顶才响应 ESC）
  remove: () => void;   // 从栈中移除（关闭时调用）
};

const stack: { id: number; onClose: () => void }[] = [];
let seed = 0;

export function pushLayer(onClose: () => void): LayerHandle {
  const id = ++seed;
  stack.push({ id, onClose });
  return {
    isTop: () => stack[stack.length - 1]?.id === id,
    remove: () => {
      const i = stack.findIndex((l) => l.id === id);
      if (i >= 0) stack.splice(i, 1);
    },
  };
}
```

**滚动锁定深讲**（本条的重点，也是面试高频）。第一反应的实现是打开时 `document.body.style.overflow = 'hidden'`，它在 Windows Chrome 上会带来一个肉眼可见的 bug：**弹窗一开，整个页面横向抖一下**。

- **症状**：Modal 打开瞬间，居中的标题、`margin: auto` 的容器、用 `100vw` 定位的元素整体向右（或向左）跳动十几像素；关闭时再跳回来。
- **根因**：Windows（及 Linux）下浏览器滚动条是**占位滚动条**（classic scrollbar），宽度约 17px，从"文档可见宽度"里扣除。`overflow: hidden` 移除了滚动条，`documentElement.clientWidth` 瞬间变大 17px，所有随视口宽度布局的元素重新回流——这就是抖动。macOS 默认是 overlay 滚动条（悬浮、不占宽），所以 Mac 上开发的工程师常常复现不出，而 Windows 用户全员可见——典型的"我这里没问题"。
- **修法 A（JS 补偿，运行时按需）**：锁定前先量出滚动条宽度 `window.innerWidth - document.documentElement.clientWidth`（视口宽度 − 文档可见宽度），锁定时给 body 加同等宽度的 `padding-right` 占住空间，视口宽度不变、无回流。优点是只在弹层打开时生效、零视觉副作用；缺点是要写 JS 并处理两个工程细节——**嵌套弹层的引用计数**（Modal 里再开 Drawer，关掉内层时不能把外层的锁也解了，必须计数归零才恢复）和**样式恢复要还原原值**（不能无脑设 `''`，可能覆盖业务样式）。
- **修法 B（CSS `scrollbar-gutter`，预防式）**：给 `html` 常驻 `scrollbar-gutter: stable`，滚动条空间永远预留，滚动条出现/消失不引起宽度变化，锁定时就不需要任何补偿。优点零 JS、零回流；缺点：所有页面（包括根本不滚动的短页面）永远缺一条宽度的空间，视觉上未必接受，且 Safari 直到 18.2 才支持（老 iOS 用户覆盖不到）。两种方案可以并存：全局上 `scrollbar-gutter`，弹层代码里保留补偿逻辑作为兜底。
- **iOS 边界**：iOS Safari 里 `body { overflow: hidden }` **拦不住视口滚动**（触摸滚动手势由视口接管，body 的 overflow 管不到），弹层开着背景照样滚（页面还会被橡皮筋拉走）。通用解法是 `position: fixed` 冻结法：把 body 设为 `position: fixed; top: -scrollYpx; width: 100%`，整个文档被"钉"在当前滚动位置；关闭时恢复样式并 `window.scrollTo(0, scrollY)` 回到原位（fixed 期间浏览器认为页面在顶部，必须手动还原）。注意现代 iPadOS 伪装成 Mac 的 UA，检测时要补 `maxTouchPoints` 判断。

完整实现（引用计数 + 宽度补偿 + iOS 分支 + 原值恢复）：

```ts
// src/overlay/useScrollLock.ts
import { useEffect } from 'react';

let lockCount = 0; // 引用计数：嵌套弹层共享一把锁，最后一个关闭者负责恢复
let restore: (() => void) | null = null;

/** iOS Safari 的 body overflow:hidden 拦不住视口滚动，需要 fixed 冻结 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ 桌面模式伪装 Mac：触点数 > 1 判定为触屏设备
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** 真正执行锁定：记录原值 → 补偿 + 锁定 → 返回恢复函数 */
function applyLock(): () => void {
  const { body, documentElement } = document;
  // 1. 测量滚动条宽度：视口宽 - 文档可见宽（经典滚动条环境下 ≈ 17px）
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  const scrollY = window.scrollY; // fixed 前记住滚动位置
  const prev = {
    // 保存原值而不是清空：body 可能本来就有 padding 或业务样式
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  };

  // 2. 占位滚动条宽度，抵消 overflow hidden 引起的宽度回流（防抖动核心）
  body.style.paddingRight = `${scrollbarWidth}px`;

  if (isIOS()) {
    // 3a. iOS：overflow hidden 无效，用 fixed 整体冻结
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
  } else {
    // 3b. 桌面：直接禁掉滚动
    body.style.overflow = 'hidden';
  }

  return () => {
    // 4. 恢复到锁定前的原样
    body.style.overflow = prev.overflow;
    body.style.paddingRight = prev.paddingRight;
    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    if (isIOS()) window.scrollTo(0, scrollY); // fixed 解除后页面在顶部，手动还原位置
  };
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    if (lockCount === 1) restore = applyLock(); // 第一个加锁者才真正改样式
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        restore?.(); // 计数归零才恢复，保证嵌套弹层不互相解锁
        restore = null;
      }
    };
  }, [active]);
}
```

最后把四件事组装成完整的 Modal：

```tsx
// src/overlay/Modal.tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from './useScrollLock';
import { pushLayer } from './layerStack';
import './modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  const maskMouseDownOn = useRef<EventTarget | null>(null); // 记录按下起点，防"框选松手误关"
  useScrollLock(open); // 打开期间锁定背景滚动（含嵌套计数与 iOS 兼容）

  useEffect(() => {
    if (!open) return;
    // 入栈：ESC 只响应当前栈顶（多弹层叠加时只有最上层会关）
    const layer = pushLayer(onClose);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && layer.isTop()) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      layer.remove(); // 无论以何种方式关闭，都要出栈
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-mask"
      onMouseDown={(e) => {
        maskMouseDownOn.current = e.target; // 记下"按下发生在哪"
      }}
      onClick={(e) => {
        // 判定"点击遮罩"：target 是遮罩本身（不是冒泡上来的弹层内容），
        // 且按下时也在遮罩上（排除框选文字后的松手）
        if (e.target === e.currentTarget && maskMouseDownOn.current === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"       // 读屏软件据此识别为对话框
        aria-modal="true"   // 声明为模态（背景内容对辅助技术不可用）
        aria-label={title}
        className="modal"
        style={{ width }}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body, // 挂到 body：摆脱业务容器的 overflow 裁剪与层叠上下文
  );
}
```

```css
/* src/overlay/modal.css */
.modal-mask {
  position: fixed;
  inset: 0;                    /* 四边撑满视口，替代 top/left/width/height 四件套 */
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 1050); /* 用分层 token，见 4.5.3；禁止裸写 9999 */
}
.modal {
  background: #fff;
  border-radius: 8px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.modal-body {
  padding: 20px;
  overflow: auto; /* 弹层内容超高时在自己内部滚，而不是撑爆弹层 */
}

/* Drawer 只差容器定位与进出场方向：右侧滑入 */
.drawer-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: var(--z-drawer, 1030); }
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 480px;
  background: #fff;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.12);
}
```

Drawer 的 JSX 与 Modal 几乎逐字相同（把 mask+dialog 的类名换掉即可），所以真实项目里二者通常共享一套实现、只换定位样式——组件库的做法见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》。

**常见坑**：

1. **不用 portal，弹层被裁剪 / 盖不住**。症状：弹层在某卡片内被切掉一角；或 `z-index: 9999` 依然被页面头部盖住。根因：祖先 `overflow` 非 `visible`（裁剪）或祖先创建了层叠上下文（`transform`/`filter`/`opacity` 等，z-index 只在上下文内比较）。修法：`createPortal(..., document.body)` 一了百了；不要试图靠加大 z-index 硬调。
2. **弹层有进出场动画（transform）时，内部 `position: fixed` 元素错位**。症状：弹层里的下拉、tooltip 本应相对视口定位，却跟着弹层"歪了"。根因：CSS 规范中 `transform` 的元素会成为其内部 `fixed` 后代的**包含块**（当成 absolute 的定位基准）。修法：动画加在最外层、内部 fixed 元素移出动画容器；或动画结束（transitionend）后移除 transform 属性。
3. **ESC 一次关掉所有弹层**。症状：Modal 里再开一个确认框，按 ESC 两个全关。根因：每个弹层都在 document 上挂 keydown 且都判断 `Escape`，谁也不知道自己是不是最上层；`stopPropagation` 也救不了（同一节点的监听器都会执行，见上文机制分析）。修法：弹层栈（`layerStack`），只有 `isTop()` 才响应。
4. **点遮罩误关：框选弹层文字时松手在遮罩上**。症状：用户在弹层里选中一段文本，鼠标拖到遮罩上松开，弹层"自己关了"。根因：click 的 target 是遮罩（鼠标事件 target 取自共同祖先——按下与松开的公共容器）。修法：记录 mousedown 起点，按下和松开都在遮罩上才判定关闭（见 Modal 代码）。
5. **滚动锁不计数**。症状：Modal 里打开 Drawer，关掉 Drawer 后背景就能滚了，但 Modal 还开着。根因：两把锁各自为政，后关闭的把先前的恢复了。修法：模块级 `lockCount` 引用计数（见 `useScrollLock`）。
6. **弹层关闭后页面永久不能滚动**。症状：关掉弹层，body 还是锁死的。根因：恢复逻辑写在 `onClick` 里而非 effect 清理函数——非正常关闭路径（ESC、路由跳转导致的卸载）没走那段代码。修法：一切"锁定资源"的恢复都必须放 effect 的 `return` 清理函数（React 保证组件卸载必执行），这也是阶段 2 useEffect 清理函数专题的直属应用。
7. **打开弹层后焦点还在背景上**。症状：弹层开着，按 Tab 焦点跑到被遮住的背景按钮上（读屏用户彻底迷路）。这是焦点管理问题，4.5.3 展开。

---

#### 2. **命令式 Toast / Confirm**（`createRoot` 动态挂载，如 antd `message.success()` 原理）

**是什么**：不经过组件树、在任何 JS 模块里直接调用的通知 API——`toast.success('保存成功')`、`const ok = await confirm('确定删除吗？')`。它内部动态创建 DOM 节点，用 `createRoot` 渲染一个 React 通知容器，通知的增删由一个独立于组件树的数据仓库驱动。

**为什么需要**：声明式组件（`<Toast open={...} />`）必须由某个父组件渲染，但"发通知"的高发地恰恰在**组件树之外**——axios 拦截器、事件回调深处、路由 loader、工具函数。让这些地方反向去"找到某个组件并 setState"要穿透层层Context，既丑陋又脆弱。命令式 API 把"通知的发送方"（任何 JS 代码）与"通知的渲染方"（常驻 body 的容器组件）解耦：发送方只往仓库里塞一条数据，容器订阅仓库自己更新。antd 的 `message.success()` 正是这个结构：`message` 模块内部持有一个动态挂载的 Notice 容器（rc-notification 实现），`success/info/error` 只是往容器里 push 一条带自增 id 的通知，到期自动移除——我们用 60 行实现它的骨架。

**为什么 React 18 之后不能用 `ReactDOM.render`**：这是本条的必考认知点。`ReactDOM.render(<App />, dom)` 是 React 17 及以前的挂载方式，React 18 中它仍存在但以 **legacy 模式**运行——享受不到自动批处理、并发特性，`StrictMode` 的双调用检查全部失效；React 19 已把它**彻底删除**（连同 `unmountComponentAtNode`）。新 API 是 `createRoot(dom).render(<App />)`，它创建的根才具备并发能力。两个易错细节：同一个 DOM 容器只能 `createRoot` 一次（重复调用报 "container has already been passed to createRoot"），后续更新是**再次调用同一个 root 的 `.render()`**；React 18 之前"用 `ReactDOM.render` 反复调用更新同一容器"的习惯，对应到新 API 是"复用同一个 root 实例"，而不是"每次新建 root"——每次新建既浪费又泄漏。

**怎么做（机制分步）**：

1. **仓库层**（纯 TS，与 React 无关）：模块级数组存通知，`Set<() => void>` 存订阅者；增删时替换数组引用（不可变更新）并广播。这一层是"命令式 API"的落点。
2. **容器层**（React 组件）：用 `useSyncExternalStore(store.subscribe, store.getSnapshot)` 订阅仓库，渲染通知列表。`getSnapshot` 必须返回**缓存的同一个数组引用**——现场 `new` 一个数组会被 React 判定"store 每次都变了"，直接无限重渲染。
3. **挂载层**（惰性单例）：第一次调用 `toast.success()` 时才创建 div、append 到 body、`createRoot` 并渲染容器。惰性是为了兼容 SSR（模块顶层没有 `document`）；单例（容器与 root 都只建一次）是为了不泄漏。
4. **API 层**：`toast.success/error/info/warning` 各自 `store.add(type, msg)`，`add` 内部 `setTimeout` 到期 `remove`。
5. **Confirm 变体**：它的生命周期与一个 Promise 绑定（点确认/取消即结束），所以不用常驻容器，而是**一次性 root**——每次调用创建独立 root，用户选择后 `root.unmount()` 并 `div.remove()`，Promise 随之落定。

**代码示例**：

```ts
// src/overlay/toast/store.ts —— 仓库层：命令式 API 的数据落点，与 React 完全解耦
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  type: ToastType;
  content: string;
}

let items: ToastItem[] = []; // 模块级缓存：getSnapshot 返回它的引用，保证引用稳定
const listeners = new Set<() => void>();
let seed = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

export const toastStore = {
  /** useSyncExternalStore 的订阅入口 */
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** useSyncExternalStore 的快照入口：必须返回缓存引用，绝不能现场构造新数组 */
  getSnapshot(): ToastItem[] {
    return items;
  },
  add(type: ToastType, content: string, duration = 3000) {
    const item: ToastItem = { id: ++seed, type, content };
    items = [...items, item]; // 替换引用 → 容器才会重渲染
    emit();
    setTimeout(() => toastStore.remove(item.id), duration); // 到期自动消失
  },
  remove(id: number) {
    items = items.filter((it) => it.id !== id);
    emit();
  },
};
```

```tsx
// src/overlay/toast/index.tsx —— 容器层 + 挂载层 + API 层
import { useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toastStore, type ToastItem, type ToastType } from './store';
import './toast.css';

function ToastContainer() {
  // 订阅外部仓库：仓库变化即重渲染——正是 useSyncExternalStore 的教科书场景
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {/* aria-live：通知出现时读屏软件会自动播报，无障碍细节见组件库大纲 A5 */}
      {items.map((it) => (
        <div
          key={it.id}
          className={`toast toast-${it.type}`}
          onClick={() => toastStore.remove(it.id)} /* 点击可提前关闭 */
        >
          {it.content}
        </div>
      ))}
    </div>
  );
}

// ---- 挂载层：惰性 + 单例。容器和 root 都只创建一次 ----
let root: Root | null = null;

function ensureContainer() {
  if (root) return; // 已初始化，直接复用（也挡住了"对同一 div 二次 createRoot"的错误）
  const div = document.createElement('div');
  div.className = 'toast-portal';
  document.body.appendChild(div);
  root = createRoot(div); // React 18+ 唯一正确的动态挂载方式
  root.render(<ToastContainer />);
}

// ---- API 层：任何 JS 模块都能调 ----
function notify(type: ToastType, content: string, duration?: number) {
  ensureContainer(); // 惰性初始化：首次调用时才碰 document（兼容 SSR / 构建期执行）
  toastStore.add(type, content, duration);
}

export const toast = {
  success: (content: string, duration?: number) => notify('success', content, duration),
  error: (content: string, duration?: number) => notify('error', content, duration),
  info: (content: string, duration?: number) => notify('info', content, duration),
  warning: (content: string, duration?: number) => notify('warning', content, duration),
};
```

```css
/* src/overlay/toast.css */
.toast-portal { position: fixed; inset: 0; pointer-events: none; z-index: var(--z-toast, 1080); }
.toast-wrap {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto; /* 门户整体不拦截点击，单条通知可点击 */
}
.toast {
  padding: 8px 16px;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}
.toast-success { background: #52c41a; }
.toast-error { background: #ff4d4f; }
.toast-info { background: #1677ff; }
.toast-warning { background: #faad14; }
```

使用效果——注意调用方完全不知道 React 的存在：

```ts
// src/api/client.ts —— 请求拦截器里发通知：命令式 API 的主战场
import { toast } from '../overlay/toast';

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    toast.error(`请求失败（${res.status}），请稍后重试`);
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
```

```tsx
// 业务组件里：await 后给反馈
import { toast } from '../overlay/toast';

async function handleSave() {
  await request('/api/articles', { method: 'POST' });
  toast.success('保存成功');
}
```

再实现 `confirm`——一次性 root + Promise 的模式：

```tsx
// src/overlay/confirm.tsx —— 生命周期与 Promise 绑定的一次性弹层
import { createRoot } from 'react-dom/client';
import './confirm.css';

function ConfirmDialog({
  title,
  text,
  onOk,
  onCancel,
}: {
  title: string;
  text: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-mask">
      <div role="alertdialog" aria-modal="true" aria-label={title} className="confirm">
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="confirm-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={onOk}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/** 用法：const ok = await confirm('删除后不可恢复，确定？') */
export function confirm(text: string, title = '请确认'): Promise<boolean> {
  return new Promise((resolve) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div); // 每次调用一个独立 root：用完即毁，与 Promise 同生共死

    const cleanup = (result: boolean) => {
      root.unmount();  // 卸载 React 子树（清理内部 effect）
      div.remove();    // 移除宿主 div（unmount 不会自动删掉容器节点）
      resolve(result); // 让 await 侧继续执行
    };

    root.render(
      <ConfirmDialog
        title={title}
        text={text}
        onOk={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });
}
```

```tsx
// 业务里串进异步流程
import { confirm } from '../overlay/confirm';
import { toast } from '../overlay/toast';

async function handleDelete(id: number) {
  const ok = await confirm('删除后不可恢复，确定删除该记录吗？', '删除确认');
  if (!ok) return;
  await request(`/api/records/${id}`, { method: 'DELETE' });
  toast.success('已删除');
}
```

`confirm` 直接卸载意味着没有退出动画（淡出需要"先置 visible、动画播完再 unmount"的双状态机，完整解法见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》A3"退出动画难题"——那是初级与高级组件代码最显眼的分水岭）。Toast 容器是**常驻单例**、Confirm 是**一次性 root**，两种模式的取舍依据就是生命周期：Toast 的容器随应用存续；Confirm 的弹层随一次 Promise 开合。

与 antd `message` 对标，我们省掉的部分：进出场动画（需要上面的双状态机）、同屏数量上限（超过 N 条挤掉最旧的）、悬停暂停倒计时（鼠标移入时记下剩余时间，移出重新计时）、SSR 严格守卫。这些都不改变骨架——骨架就是"惰性单例 root + 外部仓库 + `useSyncExternalStore` 容器"。

**常见坑**：

1. **`getSnapshot` 现场返回新数组，页面卡死**。症状：接入 `useSyncExternalStore` 后控制台疯狂输出 `Maximum update depth exceeded`。根因：React 每次渲染都会调 `getSnapshot` 比较引用，如果它每次返回 `[...items]` 这种新引用，React 永远认为 store 变了，重渲染无终局。修法：快照必须是缓存引用（`items` 模块变量），只在真正变更时整体替换（见 store 代码）。
2. **模块顶层就初始化容器**。症状：SSR 或构建期单测报 `document is not defined`。根因：`import` 该模块时立即执行了 `createRoot` 相关代码，而服务端没有 DOM。修法：惰性初始化——把创建逻辑放进 `ensureContainer()`，首次调用 API 时才执行（见上文）。
3. **每次发通知都新建一个 root**。症状：通知一多，DOM 里冒出一堆 `toast-portal` div，内存持续上涨。根因：把"一次 root 多次 render 更新"的模型用成了"每次渲染建新 root"。修法：模块级单例 `let root: Root | null`，判空复用。
4. **confirm 弹层关了但遮罩还在**。症状：点击确定后功能正常执行，页面上却留下一个透明的全屏 div 挡住所有点击。根因：只 `root.unmount()` 没有移除宿主节点——`unmount` 只清 React 管理的子树，不动容器本身。修法：`cleanup` 里两步都做（`root.unmount(); div.remove()`）。
5. **用 `ReactDOM.render` 实现动态挂载**。症状：React 18 下控制台警告并发特性不可用，React 19 下直接 `TypeError: ReactDOM.render is not a function`。根因：旧根 API 已废弃/删除（见上文"为什么"）。修法：一律 `createRoot`。

---

#### 3. 弹层嵌套与焦点管理

**是什么**：当弹层套弹层（Modal 里开 Drawer、Drawer 里开 Select 下拉）、弹层类型混用（Toast 必须盖过一切、Tooltip 永远在菜单之上）时，两个系统性问题浮出水面：**键盘焦点去哪了**（焦点管理）与**谁盖过谁**（z-index 治理）。

**为什么需要**：焦点管理失职时，键盘用户与读屏用户会"失明"——弹层开着，Tab 却把焦点送到被遮住的背景按钮上，屏幕阅读器播报的是用户看不见的内容，表单根本没法用（无障碍评审必挂项）。z-index 失治时，则是经典的"9999 军备竞赛"：新弹层盖不住旧的，就再加个 9，半年后代码库里搜出 `z-index: 999999`，谁也不敢删。

**怎么做——焦点陷阱的思路（实现细节在《[react-组件库实战大纲.md](react-组件库实战大纲.md)》A4"焦点管理"完整展开）**：一个合格的模态弹层在焦点上要做三件事：

1. **打开时**：把焦点移进弹层——优先第一个可聚焦元素（输入框、按钮），没有就给弹层根容器设 `tabIndex={-1}` 并 focus 它（`-1` 允许编程聚焦但不进 Tab 序列）。
2. **打开期间（焦点陷阱 / focus trap）**：监听弹层上的 keydown，Tab 键将按下时计算"下一个焦点元素"；如果下一个跑出弹层（焦点在最后一个元素上按 Tab、或在第一个元素上按 Shift+Tab），就手动 focus 到另一端，形成循环。可聚焦元素的查询集合是：

```ts
// 弹层内可聚焦元素的标准查询：焦点陷阱、roving tabindex 都用它
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// 陷阱核心逻辑（示意）：Tab 在最后一个元素上 → 回到第一个；Shift+Tab 在第一个上 → 回到最后一个
function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null); // 过滤 display:none 的不可见元素
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !container.contains(active))) {
    e.preventDefault();
    last.focus(); // Shift+Tab 在头 → 跳到尾
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus(); // Tab 在尾 → 跳到头
  }
}
```

3. **关闭时**：把焦点还给打开它的触发元素（通常是那个"确定"按钮或列表行）——提前在打开时记下 `document.activeElement`，关闭时 `element.focus()`。少了这一步，键盘用户每次关弹层都会被扔回页面开头，重复劳作。

这套键盘模型来自 WAI-ARIA Authoring Practices 对 dialog 角色的规定（`role="dialog"` + `aria-modal` + focus trap + ESC 关闭是一整套约定），组件库里每个组件的对应规范见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》A5。

**怎么做——多层 z-index 治理**：核心思想是**按弹层类型分层，层内再解决先后**，而不是全局比大小：

1. **分层 token**：为每类弹层定义一个层级常量（CSS 变量），数值本身不重要（参考 antd 的量级即可），重要的是**类型之间的相对顺序是全局约定**：

```css
/* src/styles/z-index.css —— 全项目唯一的 z-index 定义处 */
:root {
  --z-dropdown: 1000;  /* 下拉菜单、Select 弹层 */
  --z-sticky: 1020;    /* 吸顶元素 */
  --z-drawer: 1030;    /* 抽屉 */
  --z-modal: 1050;     /* 对话框 */
  --z-popover: 1060;   /* 气泡提示（要盖过 Modal，因为常在 Modal 内出现） */
  --z-toast: 1080;     /* 全局通知（必须盖过一切） */
}
```

2. **层内先后**：同类型弹层叠加（连开两个 Modal）时，两个方案——动态序号（第二个 Modal 用 `--z-modal + 1`，入栈时自增，与 4.5.1 的弹层栈天然配合）；或依赖 DOM 顺序决胜：同为 fixed 且 z-index 相同时，**DOM 中靠后的元素在上**，而 portal 到 body 的顺序正好就是打开顺序（后开的自然后 append），所以"层内不写 z-index，让 DOM 顺序说话"反而最简单。
3. **规则固化**：业务组件禁止出现裸写数字的 `z-index: 9999`，一律引用 token（可用 stylelint 规则强制检查），新弹层类型先在表里登记层级，再开工写组件。

**常见坑**：

1. **transform 祖先把 z-index 困住**。症状：Modal（z-index 1050）里的 Select 下拉（z-index 1000）被页面顶栏（z-index 1020）盖住——按层级表 dropdown < sticky 是对的，可这是弹层内的下拉，理应盖过一切背景。根因：如果下拉没 portal、渲染在带动画（transform）的 Modal 内部，它被锁进 Modal 的层叠上下文，`z-index: 1000` 只在这个上下文内有效，跟外面的顶栏根本没有可比性。修法：弹层类组件**一律 portal 到 body** 再套层级 token，两件事配合才成立。
2. **两个 fixed 元素都没写 z-index，"有时在上有时在下"**。症状：难复现的遮挡 bug，刷新或某次条件渲染后顺序就变。根因：同 z-index（包括都没写）时 DOM 顺序决胜，而条件渲染让 append 顺序不稳定。修法：显式使用 token，不要依赖"碰巧"的文档顺序；必须依赖顺序时（层内策略），确保 append 顺序就是打开顺序（portal 的自然行为）。
3. **层级表没有覆盖新类型，随手加 99999**。症状：三个月后另一个弹层又盖不住了，再加 9，进入军备竞赛。根因：分层设计被绕过。修法：把"新增弹层类型必须先登记层级"写进规范，并让 lint 把裸数字拦在 CI。
4. **焦点陷阱只在桌面端无障碍审计时才算问题**。症状：开发自测全过（鼠标用户），上线后键盘用户/读屏用户完全无法使用弹层表单。根因：焦点管理是键盘与辅助技术的生命线，鼠标用户感知不到它的缺失。修法：自测清单里加一条——打开弹层后只按键盘走一遍 Tab 流程（能不能进去、会不会漏到背景、关了能不能回到原位）；三步实现见上文与组件库大纲 A4。

至此，弹层的三条主线（挂载位置、命令式 API、层级与焦点治理）在业务侧的关键决策都覆盖了。它们在组件库工程里的完整形态——弹层定位与 `useClickOutside`（A2）、退出动画双状态机（A3）、焦点管理（A4）、键盘模型与 ARIA（A5）——在《[react-组件库实战大纲.md](react-组件库实战大纲.md)》按组件逐个落地。阶段 4 的剩余部分（4.6 实时与异步、4.7 其他高频场景）继续沿着"场景 → 机制 → 完整代码 → 常见坑"的节奏推进。

### 4.6 实时与异步

这一节解决三类"请求—响应模型覆盖不了"的场景：**服务端主动推**（WebSocket/SSE）和**用户不等服务器**（乐观更新）。它们共同的难点不在 API 本身，而在于：连接是有生命周期的（会断、要保活、要重连），数据是持续到达的（渲染要跟得上），而用户的操作永远比网络快（UI 要先动、错了再改）。

#### 1. WebSocket：重连、心跳、消息列表性能（增量渲染）

**是什么。** WebSocket 是一条建立在 HTTP 握手之上的**全双工 TCP 长连接**：握手完成后，客户端和服务器可以在任意时刻互相发消息，不再有"一问一答"的约束。浏览器端 API 是全局的 `WebSocket` 类，通过 `onopen` / `onmessage` / `onclose` / `onerror` 四个回调驱动。

**为什么需要。** 用 HTTP 模拟实时推送只有两条路：**短轮询**（每隔 N 秒问一次"有新消息吗"）——绝大多数请求是空转，浪费带宽与服务器连接数，且有轮询间隔上限的延迟；**长轮询**（服务器 hold 住请求直到有数据才返回）——延迟低了，但每次返回后都要重建请求，且服务器维持大量挂起连接的成本不低。WebSocket 一条连接双向复用，消息即发即到，是聊天室、协作编辑、实时看板的标配。

但长连接引入三个 HTTP 时代不存在的新问题，这正是本条要练的三件事：

1. **连接会断**——网络切换、服务器重启、代理超时都会断开连接，你必须自动重连，否则用户只能刷新页面；
2. **连接会"假活"**——更糟的情况是连接已经死了但 `onclose` 不触发（下面细讲），你必须用心跳主动探测；
3. **消息持续到达**——聊天记录从 0 涨到几千条时，每条新消息如果让整个列表重渲染，页面会越来越卡，你必须做增量渲染。

**怎么做（机制分步）。**

*第一步：理解 TCP 长连接为什么会"静默断开"（心跳存在的根本原因）。*
客户端与服务器之间隔着家用路由器（NAT）、运营商网关、公司防火墙。这些中间设备为每条连接维护一张映射表（"外部端口 53211 → 内网 192.168.1.5:54321"），而**表项有空闲超时**——常见 1~5 分钟（部分运营商级 NAT 更激进）。连接上如果长时间没有任何字节流动，映射就被回收；之后任何一方发包，包都会在中间设备被丢弃，**双方收不到任何错误信号**。这就是"半开连接"：你以为连着，其实路早没了。TCP 协议自带 keepalive，但默认 2 小时才发探测包，且参数不可由网页控制——所以必须在**应用层自己实现心跳**。

*第二步：心跳间隔与 ping/pong 消息设计。*
心跳周期要**小于链路上最短 NAT 超时的一半**（留安全余量），工程惯例是 25~30 秒。消息层面约定两个类型：

```text
客户端 → 服务端：{"type":"ping","ts":1699000000000}     每 30s 一次
服务端 → 客户端：{"type":"pong","ts":1699000000001}     收到即回
```

判定规则：**收到任何下行消息（不止 pong）都证明链路活着**，重置计数器；连续 `missLimit` 次（通常 2 次）心跳窗口内没有收到任何下行消息，判定链路已死，主动 `close()` 以触发统一的重连流程。注意必须"连续 N 次无响应"才判死，而不是一次超时——偶尔的网络抖动、服务端 GC 停顿都会造成单次延迟，立刻重连反而制造风暴。

*第三步：重连退避（立即 → 指数 → 封顶 → 抖动）。*
异常断开后第 1 次重连用短延迟（如 1 秒）——大多数断开是瞬时的（服务器滚动重启），立刻连上体验最好；失败后指数增长（1s → 2s → 4s → 8s…）——服务器真宕机时避免每秒被打一次；达到上限封顶（如 30s）——再长用户感知不到差别；每次延迟加 ±20% 随机抖动——防止几千个客户端在同一毫秒重连（"雷群效应"）压垮刚恢复的服务器。**重连成功后退避计数归零**。重连成功后还要做业务恢复：重新订阅频道、按消息序号补拉断线期间的数据（本 demo 简化为重新拉全量）。

*第四步：消息列表增量渲染。*
关键认知：`setMessages(prev => [...prev, msg])` 之后，数组引用变了、`MessageList` 会重渲染，**但数组里旧消息对象的引用一个都没变**。只要每个消息项组件用 `React.memo` 包裹，React 对旧项做浅比较后发现 props 相同，就会跳过它们的重渲染——真正重新渲染的只有新增的那一条。这就是"增量渲染而非全量替换"的本质：**不是减少 setState，而是让旧项的 props 引用保持稳定**。反例是把所有消息拼成一个字符串再 setState（整块文本节点重排），或渲染时现场生成 id/时间戳（旧项 props 每次都变，memo 全部失效）。

**代码示例。** 完整的 `useWebSocket` Hook：

```tsx
// hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/** 连接状态机：connecting → open →（异常断开）→ reconnecting → open…；主动关闭后停在 closed */
export type WsStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface UseWebSocketOptions {
  /** 心跳间隔，默认 30s：必须显著小于常见 NAT 空闲超时（1~5 分钟） */
  heartbeatIntervalMs?: number;
  /** 连续多少个心跳周期未收到下行消息即判死，默认 2 */
  missLimit?: number;
  /** 重连延迟封顶，默认 30s */
  maxRetryDelayMs?: number;
  /** 业务消息回调（心跳 pong 之外的所有消息都会进来，由业务自己分发类型） */
  onMessage?: (event: MessageEvent) => void;
  /** 连接建立（含重连成功）后的回调：用于重新订阅频道、补拉数据 */
  onOpen?: () => void;
}

export interface UseWebSocketReturn {
  status: WsStatus;
  send: (data: unknown) => void;
  close: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const {
    heartbeatIntervalMs = 30_000,
    missLimit = 2,
    maxRetryDelayMs = 30_000,
    onMessage,
    onOpen,
  } = options;

  // 业务回调放 ref：业务层每次渲染传入新函数时，不需要（也不应该）重连 WebSocket
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;

  // status 是要展示给 UI 的，放 state；其余全部放 ref——它们变化不应触发重渲染/重连
  const [status, setStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pongMissRef = useRef(0);        // 连续未收到下行消息的心跳周期数
  const retryCountRef = useRef(0);      // 已重试次数，驱动指数退避
  const manualCloseRef = useRef(false); // 区分"用户主动关闭"与"异常断开"，决定要不要重连

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    manualCloseRef.current = false;
    setStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('open');
      retryCountRef.current = 0; // 连接成功，退避序列归零
      pongMissRef.current = 0;
      onOpenRef.current?.();     // 业务恢复：重新订阅/补拉
      // 心跳保活：固定间隔发 ping
      heartbeatTimerRef.current = window.setInterval(() => {
        // readyState 为 OPEN 才能发送；CLOSING/CLOSED 状态下 send() 会直接抛异常
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          pongMissRef.current += 1;
          if (pongMissRef.current >= missLimit) {
            // 连续 N 个周期没有任何下行消息：链路大概率已被中间设备静默丢弃。
            // 主动 close() → onclose 触发 → 走统一的重连流程
            ws.close();
          }
        }
      }, heartbeatIntervalMs);
    };

    ws.onmessage = (event) => {
      pongMissRef.current = 0; // 收到任何消息（含 pong）都证明链路活着
      onMessageRef.current?.(event);
    };

    ws.onclose = () => {
      clearTimers();
      if (manualCloseRef.current) {
        setStatus('closed'); // 用户主动关闭：不重连
        return;
      }
      // 异常断开：第 1 次 1s（立即档），之后指数增长，封顶 maxRetryDelayMs，加 ±20% 抖动
      const base = retryCountRef.current === 0 ? 1_000 : 1_000 * 2 ** retryCountRef.current;
      const delay = Math.min(base, maxRetryDelayMs);
      const jittered = delay * (0.8 + Math.random() * 0.4);
      retryCountRef.current += 1;
      setStatus('reconnecting');
      reconnectTimerRef.current = window.setTimeout(connect, jittered);
    };
    // 注意：onerror 之后浏览器必定会触发 onclose，统一在 onclose 里处理重连即可，
    // 在 onerror 里再连一次会导致双重连接
  }, [url, heartbeatIntervalMs, missLimit, maxRetryDelayMs, clearTimers]);

  useEffect(() => {
    connect();
    return () => {
      // 卸载清理：标记主动关闭、停掉所有定时器、断开连接。
      // 清理写对后，React 18 StrictMode 的"挂载→卸载→再挂载"也不会留下幽灵连接
      manualCloseRef.current = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, clearTimers]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('[useWebSocket] 连接未就绪，消息已丢弃：', data);
    }
  }, []);

  const close = useCallback(() => {
    manualCloseRef.current = true;
    clearTimers();
    wsRef.current?.close();
    setStatus('closed');
  }, [clearTimers]);

  return { status, send, close };
}
```

使用它的聊天面板（含增量渲染消息列表）：

```tsx
// components/ChatPanel.tsx
import { memo, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ChatMessage {
  id: string;
  from: 'me' | 'peer';
  content: string;
  at: number;
}

// 单条消息：memo 之后，props（消息对象）引用不变就完全跳过重渲染。
// 这是增量渲染的落点——列表再长，每条新消息也只渲染新增的一行
const MessageItem = memo(function MessageItem({ message }: { message: ChatMessage }) {
  return (
    <li className={message.from === 'me' ? 'msg msg-me' : 'msg msg-peer'}>
      {message.content}
    </li>
  );
});

export function ChatPanel({ url }: { url: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  const { status, send } = useWebSocket(url, {
    onMessage: (event) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        payload?: ChatMessage;
      };
      if (data.type === 'chat' && data.payload) {
        // 追加而不是替换：旧消息对象引用全部保持不变，memo 才能生效
        setMessages((prev) => [...prev, data.payload!]);
      }
    },
  });

  // 新消息到达后滚动到底部
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="chat">
      <header>连接状态：{status}</header>
      <ul ref={listRef} className="msg-list">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
      </ul>
      <button onClick={() => send({ type: 'chat', content: '你好' })}>发送</button>
    </div>
  );
}
```

配合调试用的本地回显服务器（Node 原生 `ws` 库）：

```bash
npm i ws
```

```ts
// server/chat-ws-server.ts（调试用：回显消息 + 响应心跳，30 秒静默后故意不发 pong 可验证判死逻辑）
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8081 });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      return;
    }
    // 回显给所有人（含发送者自己），模拟服务端推送
    const echo = { type: 'chat', payload: { ...msg, id: crypto.randomUUID(), from: 'peer', at: Date.now() } };
    wss.clients.forEach((client) => client.send(JSON.stringify(echo)));
  });
});
```

**常见坑。**

- **症状**：挂着不动，消息再也收不到，`onclose` 也没触发。**根因**：半开连接——NAT 表项已回收，断开信号根本到不了你这里。**修法**：就是心跳判死（上面 `pongMissRef` 的逻辑），没有心跳的长连接在生产环境等于没有重连。
- **症状**：React 18 StrictMode 下 Network 面板出现两条 WebSocket 连接。**根因**：开发模式挂载-卸载-再挂载，effect 清理函数没写或没关连接。**修法**：像上面那样在 effect cleanup 中 `close()` 并清定时器；这不是 React 的 bug，是它替你提前暴露了清理缺失。
- **症状**：消息越收越卡，Profiler 里整条列表都在重渲染。**根因**：消息项没 `memo`，或渲染时现场生成 `key`/内容处理导致旧项 props 引用变化。**修法**：`React.memo(MessageItem)` + 追加时保持旧对象引用不变；上千条再上虚拟列表（见 4.3 列表场景）。
- **症状**：服务器短暂重启后客户端永远不再重连。**根因**：在 `onerror` 里做了重连但 `onclose` 里没做，或重连用了递增 delay 却忘了在 `onopen` 归零计数之外重置定时器句柄。**修法**：重连统一收敛到 `onclose` 一处。
- **症状**：`InvalidStateError: WebSocket is already in CLOSING/CLOSED state`。**根因**：心跳定时器在 `CLOSING` 状态仍调用 `send`。**修法**：发送前检查 `readyState === WebSocket.OPEN`（上面 `send` 与心跳里都有）。

#### 2. SSE 流式输出（AI 对话界面场景）

**是什么。** SSE（Server-Sent Events）是 HTTP 上的**服务端单向推送协议**：客户端发一个普通请求，服务端不一次性返回，而是保持连接、持续写入一个个"事件帧"。响应头为 `Content-Type: text/event-stream`，每帧的格式是纯文本约定：

```text
id: 42                ← 可选：事件序号，断线重连时浏览器自动带上 Last-Event-ID: 42
event: delta          ← 可选：事件名，默认 message
data: 你好            ← 数据行；一帧里可以有多行 data，最终以 \n 拼接

                      ← 空行（\n\n）表示一帧结束
```

**为什么需要。** AI 对话产品的回答是逐 token 生成的，一段回答要 5~20 秒才完整生成完。等全部生成再返回，用户盯 10 秒空白；SSE 让服务器生成一段就推一段，界面逐字打出——体感等待时间下降一个量级。相比 WebSocket，SSE 走的就是普通 HTTP：经过 CDN、网关、鉴权中间件都不需要特殊配置，而且**浏览器原生自动重连**（带 `Last-Event-ID` 续传）。对于"服务端推、客户端只需发一次请求"的场景，SSE 比 WebSocket 简单一个量级。

**怎么做（机制分步）。**

浏览器有两种接 SSE 的方式，先说清取舍再上代码：

| 维度 | `EventSource` | `fetch` + `ReadableStream` 手动解析 |
|---|---|---|
| 请求方式 | 只能 GET，无法带 body | 任意方法、任意 header、任意 body |
| 鉴权 | 无法设置 `Authorization` 头（只能靠 cookie / URL 参数） | 自由 |
| 自动重连 | 内置（断开后自动重连，自动带 `Last-Event-ID`） | 没有，需自己实现 |
| 中断 | `es.close()` | `AbortController`（还能精确中断请求本身） |
| 帧解析 | 浏览器帮你做好 | 自己按 `\n\n` 切帧 |

结论：**简单的 GET 推送流（行情、进度、通知）用 `EventSource`；AI 对话必须 POST + 鉴权头，用 `fetch` 手动解析**。这也是为什么主流 AI 产品的网页端几乎都是 fetch 流。

`EventSource` 版要点：`readyState` 三态（`CONNECTING=0 / OPEN=1 / CLOSED=2`）；触发 `onerror` 后若 `readyState` 回到 `CONNECTING`，说明浏览器在自动重连中；服务端发的 `id:` 行会被记录，重连时以 `Last-Event-ID` 请求头带回。

`fetch` 版解析要点（最容易写错的地方）：**TCP 分块与 SSE 帧不对齐**。一次 `read()` 拿到的可能只有半帧（中文 token 被劈成两半）、也可能好几帧挤在一起，所以必须维护一个 `buffer`：把新字节 append 进去，按 `\n\n` 切出所有**完整帧**，最后一段不完整的留在 buffer 里等下一轮。`TextDecoder` 要传 `{ stream: true }`，否则一个跨块的中文（3 字节 UTF-8）会被解码成乱码。

React 侧的写法要点：assistant 的回答作为一条"流式中的消息"存在于消息列表，状态为 `streaming`，每收到一个 chunk 就 `setMessages(prev => prev.map(...))` 把 `content` 追加——**必须用函数式更新**，因为同一轮渲染周期内可能连续到达多个 chunk，读旧 state 会丢字。

**代码示例。** 先是通用 SSE 解析器（fetch 版的核心）：

```ts
// lib/sseParser.ts
export interface SseEvent {
  id?: string;
  event: string;
  data: string;
}

/**
 * 把 fetch 返回的 ReadableStream 解析为 SSE 事件流（异步迭代器形式）。
 * 协议规则：每帧由若干行（id:/event:/data:/retry:）组成，帧间用空行（\n\n）分隔；
 * TCP 分块与帧边界没有对齐关系，必须用 buffer 攒够再切。
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream:true 允许多字节字符跨 chunk 继续解码（不传会出乱码）
      buffer += decoder.decode(value, { stream: true });

      // 按 \n\n 切出所有完整帧；最后一段可能是半帧，留在 buffer 里
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
      }
    }
    // 流结束：处理服务端没以空行收尾的最后一帧
    const tail = parseFrame(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock(); // 无论正常结束还是中途抛错（abort），都释放流的锁
  }
}

/** 解析单帧：按行读取字段。data 可多行，最终以 \n join；冒号后允许一个可选空格 */
function parseFrame(frame: string): SseEvent | null {
  let id: string | undefined;
  let event = 'message'; // 不写 event: 行时，默认事件名就是 message
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line === '' || line.startsWith(':')) continue; // 空行与注释行（: 开头，常被用作保活注释）
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'data') dataLines.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
  }
  if (dataLines.length === 0) return null;
  return { id, event, data: dataLines.join('\n') };
}
```

`EventSource` 的最小 Hook（GET 场景）：

```tsx
// hooks/useEventSource.ts
import { useEffect, useState } from 'react';

/**
 * EventSource 版：浏览器自动重连、自动解析帧。
 * 代价：只能 GET、无法带自定义 header——鉴权只能靠 cookie 或把 token 拼在 URL 上。
 */
export function useEventSource(url: string) {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [state, setState] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    const es = new EventSource(url);

    const handleOpen = () => setState('open');
    const handleMessage = (e: MessageEvent<string>) => setLastEvent(e.data);
    const handleError = () => {
      if (es.readyState === EventSource.CLOSED) {
        setState('closed');            // 彻底失败（如 401/404），浏览器放弃重连
      } else {
        setState('connecting');        // readyState 回到 CONNECTING：浏览器在自动重连
      }
    };

    es.addEventListener('open', handleOpen);
    es.addEventListener('message', handleMessage); // 默认事件名 message
    es.addEventListener('error', handleError);

    return () => {
      es.close(); // 主动 close 后浏览器不再自动重连
      es.removeEventListener('open', handleOpen);
      es.removeEventListener('message', handleMessage);
      es.removeEventListener('error', handleError);
    };
  }, [url]);

  return { lastEvent, state };
}
```

AI 对话组件（fetch 流式 + 逐字追加 + AbortController 中断）：

```tsx
// components/AiChat.tsx
import { useEffect, useRef, useState } from 'react';
import { parseSseStream } from '../lib/sseParser';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'streaming' | 'done' | 'error' | 'aborted';
}

export function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  // 进行中请求的控制器：停止按钮与组件卸载都要用它中断
  const abortRef = useRef<AbortController | null>(null);

  async function ask(question: string) {
    const assistantId = crypto.randomUUID();
    // 1. 先插入用户消息，和一条空的 assistant 占位（status: streaming）
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: question, status: 'done' },
      { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 2. 发起流式请求——EventSource 做不到的 POST + 鉴权头，fetch 轻松做到
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ question }),
        signal: controller.signal, // 中断的开关挂在这里
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      // 3. 逐帧解析；abort() 会让 reader.read() 直接抛 AbortError，循环自然中断
      for await (const event of parseSseStream(res.body)) {
        const delta = (JSON.parse(event.data) as { delta: string }).delta;
        // 4. 函数式更新：同一轮可能连续多个 chunk，读外部变量会丢字
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m,
          ),
        );
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, status: 'done' } : m)),
      );
    } catch (err) {
      // 5. 区分"用户主动停止"与"真错误"：abort 抛的是 DOMException(name='AbortError')
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, status: aborted ? 'aborted' : 'error' } : m,
        ),
      );
    } finally {
      abortRef.current = null;
    }
  }

  // 卸载时中断进行中的流，避免卸载后 setState 与后台继续下载
  useEffect(() => () => abortRef.current?.abort(), []);

  const streaming = messages.some((m) => m.status === 'streaming');

  return (
    <div className="ai-chat">
      <ul className="ai-msgs">
        {messages.map((m) => (
          <li key={m.id} className={`ai-msg ${m.role} ${m.status}`}>
            {m.content}
            {m.status === 'streaming' && <span className="cursor">▍</span>}
            {m.status === 'aborted' && <em>（已停止生成）</em>}
            {m.status === 'error' && <em>（生成失败，请重试）</em>}
          </li>
        ))}
      </ul>
      <div className="ai-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim() && !streaming) {
              const q = input.trim();
              setInput('');
              ask(q);
            }
          }}
          placeholder="输入问题，回车发送"
        />
        {streaming ? (
          <button onClick={() => abortRef.current?.abort()}>停止</button>
        ) : null}
      </div>
    </div>
  );
}

// 从localStorage 取演示用 token（真实项目在登录态模块里统一管理）
function getToken(): string {
  return localStorage.getItem('token') ?? '';
}
```

本地联调可用的最小 SSE 服务端（Node 原生，逐字推送）：

```ts
// server/chat-sse-server.ts
import http from 'node:http';

http
  .createServer((req, res) => {
    if (req.url !== '/api/chat') {
      res.statusCode = 404;
      res.end();
      return;
    }
    // SSE 响应头：不缓存、保持连接
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    // 模拟逐 token 生成：每 100ms 推一个字
    const answer = '流式输出的价值在于把等待变成可见的进展。';
    let i = 0;
    const timer = setInterval(() => {
      if (i >= answer.length) {
        clearInterval(timer);
        res.end(); // 流结束，客户端 reader.read() 得到 done
        return;
      }
      res.write(`event: delta\ndata: {"delta":"${answer[i]}"}\n\n`); // 注意帧尾双换行
      i += 1;
    }, 100);
    // 客户端 abort 断开时停止推送
    res.on('close', () => clearInterval(timer));
  })
  .listen(8082);
```

**常见坑。**

- **症状**：用 `EventSource` 连 AI 接口，返回 405/404。**根因**：接口只接受 POST，`EventSource` 永远发 GET。**修法**：换 fetch 流式（上面的方案）；不要用"GET + URL 拼 token"凑合，token 进 URL 会进服务器日志。
- **症状**：输出的中文偶尔变乱码。**根因**：`decoder.decode(value)` 没传 `{ stream: true }`，一个多字节字符恰好被 TCP 分块劈开时被当成完整字符解码。**修法**：`decode(value, { stream: true })`。
- **症状**：偶发丢帧或界面"卡一下蹦好几个字"。**根因**：解析时假设"一次 read 等于一帧"，没有维护 buffer 处理半帧/多帧。**修法**：`buffer + split('\n\n') + pop()` 的攒帧模式（见 `parseSseStream`）。
- **症状**：点了"停止"后请求其实还在下载。**根因**：只改了 UI 状态（比如把按钮换掉），没有真正中断网络。**修法**：`AbortController` 从 fetch 一直传到读取循环，`abort()` 后 `read()` 会抛 `AbortError`。
- **症状**：组件卸载后控制台报 "setState on unmounted component" 或对话页面离开后仍在耗流量。**根因**：没有在 cleanup 里 abort。**修法**：`useEffect(() => () => abortRef.current?.abort(), [])`。

#### 3. 乐观更新 + 失败回滚（点赞/收藏）

**是什么。** 乐观更新（Optimistic Update）指：用户操作的瞬间**先改本地 UI，再发请求**；请求成功则用服务器返回的真实数据"对账"，失败则**回滚到操作前的快照**并提示用户。与之相对的是"悲观更新"：等服务器返回 200 才改 UI。完整时序如下：

```text
用户点击点赞
   │
   ├─(1) 快照当前状态 ──────────────► snapshots.push({liked:false, count:10})
   ├─(2) 立即写乐观值（UI 马上变红 +1） set({liked:true, count:11})
   ├─(3) 发起 POST /like ──────────► 服务器
   │                                      │
   │      ┌───────────────────────────────┤
   │      ▼ 成功                           ▼ 失败
   ├─(4a) 用服务器真值对账                ├─(4b) 弹出快照回滚 set({liked:false, count:10})
   │      set(服务器返回值)               │      + Toast「操作失败，已恢复」
   └─(5) 清理快照                         └─(5) 清理快照
```

**为什么需要。** 移动网络下一次请求 200~800ms。点赞后心形灰 500ms 才变红，用户会以为没点上、再点一次（造成取消点赞的误操作）。乐观更新把交互反馈压到 0ms，失败回滚保证最终正确——**绝大多数操作会成功的场景下，这是体验与正确性的最优折中**。反过来，成功率低或回滚代价大的操作（支付、删除）不适合乐观更新。

**怎么做（机制分步）。** 三个不变的要点：

1. **先快照再更新**：快照必须存在更新之前拿到的那份值（组件 state 之外的地方——局部变量或 ref，注意闭包里捕获的就是那一刻的值，恰好正确）；
2. **成功后对账而不是不管**：用服务器返回的 `count` 覆盖本地。因为并发存在（别人也在点赞），你本地的 +1 可能已经不是最新值；
3. **失败回滚 + 用户可见的提示**：静默回滚会让用户以为点赞成功了。

手写版本练完机制，再用 TanStack Query 的 `onMutate` 版本练工程化：`onMutate` 在请求发出**前**同步执行（取消进行中的相关 refetch → 快照缓存 → 写乐观值 → 把快照作为 context 返回），`onError` 用 context 回滚，`onSettled` 无条件 invalidate 保证与服务器最终一致。

**代码示例。** 先看手写版（不依赖任何库，理解时序）：

```tsx
// components/LikeButton.tsx（手写版，理解时序用）
import { useRef, useState } from 'react';

interface LikeState {
  count: number;
  liked: boolean;
}

export function LikeButton({ postId }: { postId: string }) {
  const [state, setState] = useState<LikeState>({ count: 10, liked: false });
  // 快照栈：快速连点时每个在途请求各存一份，失败时按序弹出回滚
  const snapshotsRef = useRef<LikeState[]>([]);

  async function toggle() {
    // (1) 快照：闭包捕获的 state 就是点击那一刻的值
    snapshotsRef.current.push(state);
    // (2) 乐观更新：函数式写法，叠加计算不依赖旧闭包
    setState((s) => ({ count: s.count + (s.liked ? -1 : 1), liked: !s.liked }));
    try {
      // (3) 真正的网络请求
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: !state.liked }), // 目标值取快照的反面
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const serverState = (await res.json()) as LikeState;
      // (4a) 成功：用服务器真值对账（别人可能也点了赞，本地的数不准）
      setState(serverState);
    } catch {
      // (4b) 失败：弹出快照回滚（Toast 的实现见 4.5 弹层体系，这里用 alert 演示）
      const snapshot = snapshotsRef.current.pop();
      if (snapshot) setState(snapshot);
      alert('操作失败，已恢复');
    }
  }

  return (
    <button className={state.liked ? 'like liked' : 'like'} onClick={toggle}>
      ♥ {state.count}
    </button>
  );
}
```

TanStack Query 版（生产推荐，缓存、竞态、回滚都由 `onMutate` 钩子统一管理）：

```tsx
// features/post/useLikePost.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PostDetail {
  id: string;
  title: string;
  likeCount: number;
  liked: boolean;
}

async function fetchPost(postId: string): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) throw new Error('加载失败');
  return res.json();
}

async function toggleLike(postId: string, liked: boolean): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ liked }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useLikePost(postId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['posts', 'detail', postId] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchPost(postId),
  });

  const likeMutation = useMutation({
    mutationFn: (liked: boolean) => toggleLike(postId, liked),

    // ① onMutate：请求发出前同步执行。在这里写乐观值
    onMutate: async (liked) => {
      // 取消这个 key 上进行中的 refetch：
      // 否则回滚刚写回旧值，一个迟到的 refetch 又把新值覆盖回来，界面"闪一下又变回去"
      await queryClient.cancelQueries({ queryKey });
      // 快照当前缓存
      const previous = queryClient.getQueryData<PostDetail>(queryKey);
      // 写入乐观值（likes/count 立即变化，UI 0ms 反馈）
      queryClient.setQueryData<PostDetail>(queryKey, (old) =>
        old ? { ...old, liked, likeCount: old.likeCount + (liked ? 1 : -1) } : old,
      );
      // 返回值会作为 onError / onSettled 的第三个参数 context 传下去
      return { previous };
    },

    // ② 失败：用快照回滚
    onError: (_error: Error, _variables: boolean, context: { previous?: PostDetail } | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    // ③ 无论成败都失效重取：乐观值只是猜测，最终以服务器为准
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  function toggleLikeNow() {
    if (!data) return;
    likeMutation.mutate(!data.liked); // 基于缓存当前值取反
  }

  return { post: data, toggleLike: toggleLikeNow, isPending: likeMutation.isPending };
}
```

使用侧只剩展示：

```tsx
// features/post/PostDetail.tsx
import { useLikePost } from './useLikePost';

export function PostDetail({ postId }: { postId: string }) {
  const { post, toggleLike } = useLikePost(postId);
  if (!post) return <p>加载中…</p>;
  return (
    <article>
      <h2>{post.title}</h2>
      <button className={post.liked ? 'like liked' : 'like'} onClick={toggleLike}>
        ♥ {post.likeCount}
      </button>
    </article>
  );
}
```

**常见坑。**

- **症状**：失败后回滚了一瞬间，界面又自己变回乐观值。**根因**：`onMutate` 里没 `cancelQueries`，一个在途的 refetch 携带旧数据晚到，把回滚结果覆盖了。**修法**：写乐观值之前先 `await queryClient.cancelQueries({ queryKey })`（上面步骤①）。
- **症状**：连点三次，第三次失败后回滚到了"第一次之前"的状态。**根因**：快照只存了一份（局部变量被后一次覆盖）。**修法**：快照用栈（手写版 `snapshotsRef`），或 TanStack Query 天然按 mutation 链传递 context。
- **症状**：明明失败了，计数却是 +2。**根因**：乐观更新写在 `onSuccess` 里——那已经晚了，而且失败分支没有回滚。**修法**：乐观值必须写进 `onMutate`（请求前），回滚写进 `onError`。
- **症状**：点赞成功后列表页的计数没同步。**根因**：只更新了详情缓存，列表缓存（`['posts','list']`）还是旧值。**修法**：`onSettled` 里把列表 key 一起 invalidate，或按前缀 `['posts']` 失效。
- **症状**：回滚后用户没有任何感知，以为点赞成功了。**根因**：只回滚不提示。**修法**：回滚的同时 Toast 提示（调用 4.5 里手写的命令式 Toast）。

### 4.7 其他高频场景

九个场景各自独立，都是"面试高频 + 业务必用"的投入产出比之王。建议每个场景先写最小 demo，再把产物合进阶段末尾的后台管理系统项目里。

#### 1. 文件上传：进度条、多文件、图片预览、大文件分片

**是什么。** 文件上传看似只是 `<input type="file">` + FormData，但完整实现要覆盖四件事：上传**进度**可视化、**多文件**的队列管理、图片**预览**的内存管理、**大文件**的分片断点策略。

**为什么需要。** 进度条解决"传 200MB 时用户不知道该不该关页面"的焦虑；多文件队列解决"10 个文件 3 个失败，哪些要重传"的可视化；`URL.createObjectURL` 预览解决"选完图立刻看到要传什么"的确认感；分片解决大文件的三个痛点——**浏览器/网关的请求体大小限制**、**弱网下一个包失败全部重来**、**无法利用带宽并发**。

**怎么做（机制分步）。**

*进度条*：关键事实是 **fetch 至今没有上传进度 API**（下载进度可以用 `res.body` 流统计，上传不行）。上传进度只能用 `XMLHttpRequest` 的 `xhr.upload.onprogress` 事件——它属于上传通道（`xhr.upload` 是一个 `XMLHttpRequestUpload` 对象），在请求体分块发出时触发，`e.loaded / e.total` 即百分比（`e.lengthComputable` 为 false 时拿不到 total，比如 chunked 编码）。

*多文件队列*：给每个文件建一条状态记录（排队中 → 上传中 → 成功/失败 + 百分比），UI 渲染队列而不是整页一个进度条。并发用简单的"游标 + 固定 worker 数"池子控制（浏览器对同域名 HTTP/1.1 也就 6 个并发，全并发反而互相挤占）。

*图片预览*：`URL.createObjectURL(file)` 为 Blob 生成一个 `blob:` 开头的内存 URL，**不读文件内容、同步返回**，比 `FileReader.readAsDataURL` 快得多。代价是这个 URL 对应的内存在 `revokeObjectURL` 之前一直被占着——**创建后必须在不再使用时（组件卸载/替换图片）手动 revoke**，这是本条最常见的内存泄漏。

*大文件分片*：三方协议（前端/后端约定三个接口）：

```text
① POST /api/uploads           { filename, size, chunkSize }        → { uploadId, chunkCount }
② POST /api/uploads/chunk     FormData{ uploadId, index, chunk }   → 每片可独立重试
③ POST /api/uploads/:id/complete { chunkCount }                    → 服务端按 index 顺序合并
```

前端用 `file.slice(start, end)` 切片——`slice` 返回的是**视图 Blob，不会把整个文件读进内存**，这是切 2GB 视频也不爆内存的原因。分片用固定并发池上传，每片成功累计字节数算总进度；单片失败只重试那一片；全部完成后调 complete 让服务端按 `index` 顺序拼接（**服务端必须按序拼，不能按到达顺序**）。

**代码示例。** 带 XHR 进度的单文件上传：

```ts
// lib/upload.ts
export interface UploadResult {
  url: string;
}

/** XHR 上传：fetch 没有上传进度事件，进度条只能走这条路 */
export function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';

    // upload.onprogress 是 fetch 至今缺失的能力
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as UploadResult);
      } else {
        reject(new Error(`上传失败：HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误，上传中断'));

    const form = new FormData();
    form.append('file', file); // FormData 会自动设置 multipart/form-data 边界
    xhr.send(form);
  });
}
```

多文件队列组件（含预览的创建与 revoke）：

```tsx
// components/UploadQueue.tsx
import { useEffect, useRef, useState } from 'react';
import { uploadWithProgress } from '../lib/upload';

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string | null; // blob: 预览 URL（非图片为 null）
  status: 'queued' | 'uploading' | 'success' | 'error';
  percent: number;
}

const CONCURRENCY = 3; // 并发上传数：对同域名 HTTP/1.1 超过 6 会排队，3~4 比较稳

export function UploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([]);
  // 保存待 revoke 的 URL，卸载时统一释放
  const objectUrlsRef = useRef<string[]>([]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: UploadItem[] = Array.from(files).map((file) => {
      const isImage = file.type.startsWith('image/');
      // createObjectURL 同步返回 blob: URL，不读文件内容，大图也瞬时
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      if (previewUrl) objectUrlsRef.current.push(previewUrl);
      return { id: crypto.randomUUID(), file, previewUrl, status: 'queued', percent: 0 };
    });
    setItems((prev) => [...prev, ...next]);
  }

  // 组件卸载时释放所有 blob: URL——不释放就是实打实的内存泄漏
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // 从队列里挑出 queued 的文件，按固定并发跑完（游标 worker 池）
  async function startUpload() {
    const pending = items.filter((i) => i.status === 'queued');
    let cursor = 0;

    function patch(id: string, part: Partial<UploadItem>) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...part } : i)));
    }

    async function worker() {
      while (cursor < pending.length) {
        const item = pending[cursor++];
        patch(item.id, { status: 'uploading', percent: 0 });
        try {
          await uploadWithProgress(item.file, '/api/upload', (percent) =>
            patch(item.id, { percent }),
          );
          patch(item.id, { status: 'success', percent: 100 });
        } catch {
          patch(item.id, { status: 'error' }); // 单文件失败不拖垮队列，可单独重传
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  }

  return (
    <div className="upload">
      <input type="file" multiple accept="image/*,.pdf" onChange={(e) => addFiles(e.target.files)} />
      <button onClick={startUpload} disabled={!items.some((i) => i.status === 'queued')}>
        开始上传
      </button>
      <ul className="upload-list">
        {items.map((item) => (
          <li key={item.id} className={`upload-item ${item.status}`}>
            {item.previewUrl ? (
              <img src={item.previewUrl} alt={item.file.name} width={48} height={48} />
            ) : (
              <span className="file-icon">📄</span>
            )}
            <span className="name">{item.file.name}</span>
            {item.status === 'uploading' && <progress value={item.percent} max={100} />}
            <span className="status">
              {item.status === 'queued' && '排队中'}
              {item.status === 'uploading' && `${item.percent}%`}
              {item.status === 'success' && '完成'}
              {item.status === 'error' && '失败'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

大文件分片上传：

```ts
// lib/chunkUpload.ts
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 一片：太小则请求数爆炸，太大则单片重试代价高

export async function uploadLargeFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  // ① 初始化：登记文件信息，服务端返回本次上传会话
  const init = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, size: file.size, chunkSize: CHUNK_SIZE }),
  }).then((r) => r.json() as Promise<{ uploadId: string; chunkCount: number }>);

  const { uploadId, chunkCount } = init;
  let uploadedBytes = 0;
  const indexes = Array.from({ length: chunkCount }, (_, i) => i);
  let cursor = 0;

  // ② 固定 3 并发上传分片；slice 返回视图 Blob，不把整个文件读进内存
  async function worker() {
    while (cursor < indexes.length) {
      const index = indexes[cursor++];
      const blob = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      const form = new FormData();
      form.append('uploadId', uploadId);
      form.append('index', String(index)); // 服务端合并时按 index 排序，不按到达顺序
      form.append('chunk', blob);

      // 单片失败重试 3 次，弱网下比"整文件重来"便宜几个量级
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('/api/uploads/chunk', { method: 'POST', body: form });
          if (!res.ok) throw new Error(`分片 ${index} HTTP ${res.status}`);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError) throw lastError;

      uploadedBytes += blob.size;
      onProgress(Math.round((uploadedBytes / file.size) * 100));
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  // ③ 全部就绪后通知服务端按 index 顺序合并
  const done = await fetch(`/api/uploads/${uploadId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunkCount }),
  }).then((r) => r.json() as Promise<{ url: string }>);
  return done.url;
}
```

**常见坑。**

- **症状**：进度条永远 0 或直接 100。**根因**：用了 fetch（无上传进度）；或监听写成 `xhr.onprogress`（那是**下载**通道）。**修法**：XHR 且绑定在 `xhr.upload.onprogress`。
- **症状**：传几十张图后页面越来越卡，Memory 面板里 blob 持续增长。**根因**：`createObjectURL` 之后从不 `revokeObjectURL`。**修法**：预览 URL 集中管理，卸载/替换时统一释放（队列组件里 `objectUrlsRef` 的做法）。
- **症状**：分片都传成功，合并后的文件打不开。**根因**：服务端按"到达顺序"拼接，并发导致顺序错乱。**修法**：每片带 `index`，服务端按 index 排序后拼接；前端 `slice` 的起止必须严格按 `index * CHUNK_SIZE` 对齐。
- **症状**：选完文件没点上传，列表里什么都没有。**根因**：把预览创建放在 `onChange` 之外（比如点了上传才建），或 `accept` 写错导致选择器里选不了。**修法**：预览在 `onChange` 时同步创建，体验即时。
- **症状**：上传接口 413。**根因**：请求体超过网关（nginx `client_max_body_size` 等）限制。**修法**：调大服务端限制或直接走分片上传——分片本来就是为绕开这个限制设计的。

#### 2. 拖拽排序（dnd-kit：列表拖拽 + 多容器移动）

**是什么。** dnd-kit 是目前 React 生态的拖拽标准库（`@dnd-kit/core` 抽象"拖"与"放"，`@dnd-kit/sortable` 提供"排序"语义）。两个核心概念：**Sensor（传感器）**回答"什么输入算拖拽"（鼠标/触摸/键盘），**collisionDetection（碰撞策略）**回答"松手时落在哪个目标上"（`closestCenter` 按中心距离、`rectIntersection` 按矩形相交）。

**为什么需要。** 原生 HTML5 Drag and Drop API 在移动端触摸设备上不工作、键盘完全无法访问、样式定制极其别扭。dnd-kit 用 Pointer Events 统一了鼠标/触摸、内置键盘传感器（可访问性）、用 transform 驱动动画（不触发布局重排），且按"渲染时才订阅"的方式组织，性能远好于老的 react-beautiful-dnd（后者已停止维护）。

安装：

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**怎么做（机制分步）。**

*单列表排序*的分工：`DndContext` 包住整棵树，持有 sensors 与碰撞策略，回调里拿到"谁（active）拖到了谁（over）上面"；`SortableContext` 圈定参与排序的集合（`items` 是 id 数组）；每个列表项用 `useSortable({ id })`，它返回 `attributes`（无障碍属性）、`listeners`（指针/键盘事件，决定按住哪里能拖）、`setNodeRef`、`transform/transition`（驱动位移的样式）与 `isDragging`。`onDragEnd` 里用 `arrayMove` 不可变地交换数组位置——**React 靠新数组引用触发重渲染，绝不能原地 splice**。

*点击与拖拽的冲突*：PointerSensor 默认按下即拖，列表项上的按钮会点不动。解法是 `activationConstraint: { distance: 8 }`——移动超过 8px 才判定为拖拽，否则按点击处理；或者把 `listeners` 只铺在"拖拽把手"元素上（`<span {...attributes} {...listeners}>⠿</span>`），内容区留给按钮。

*多容器（Kanban）的增量知识*：每列用 `useDroppable` 注册为放置目标；`DndContext` 的碰撞策略换 `rectIntersection`（跨容器时 `closestCenter` 只算中心距离，容易"吸到错误的列"）；**跨容器搬运放在 `onDragOver` 里做**——拖动经过另一列时立刻把卡片搬过去（实时预览），`onDragEnd` 只负责最终的同列排序，这是官方 Kanban 示例的标准结构。Sensors 深入（启动延迟/启动距离/自定义传感器）与碰撞策略深入，见《react-进阶大纲-复杂场景.md》1.6「拖拽原理（dnd-kit 精讲）」。

**代码示例。** 单列表拖拽排序（完整可运行）：

```tsx
// components/SortableList.tsx
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Item {
  id: string;
  title: string;
}

/** 单行：useSortable 把这一项注册进排序系统 */
function SortableRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      {...attributes} // 无障碍：role/tabIndex/aria 描述（键盘用户也能拖）
      {...listeners}  // 指针与键盘事件：决定"按住哪里拖"
      className={isDragging ? 'row row-dragging' : 'row'}
      style={{
        transform: CSS.Transform.toString(transform), // dnd-kit 用 transform 驱动位移（不触发重排）
        transition,                                    // 抹位让出空位时的补间动画
      }}
    >
      <span className="handle">⠿</span>
      {item.title}
    </li>
  );
}

export function SortableList() {
  const [items, setItems] = useState<Item[]>([
    { id: 'a', title: '给客户回电话' },
    { id: 'b', title: '写周报' },
    { id: 'c', title: '买菜' },
  ]);

  const sensors = useSensors(
    // distance:8 —— 移动 8px 才算拖拽，让点击/选择文本不被误判
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // 键盘传感器：方向键选目标、空格落下（sortableKeyboardCoordinates 定义按键到坐标的映射）
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const from = prev.findIndex((i) => i.id === active.id);
        const to = prev.findIndex((i) => i.id === over.id);
        // arrayMove 不可变地移动：返回新数组，旧数组不动
        return arrayMove(prev, from, to);
      });
      // 真实业务在此调用 PATCH /api/todos/order 保存顺序
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // 单列表：找中心最近的落点足够
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="sortable-list">
          {items.map((item) => (
            <SortableRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
```

多容器 Kanban 的要点骨架（三列互拖，完整逻辑核心在 `onDragOver` + `onDragEnd` 两个回调）：

```tsx
// components/KanbanBoard.tsx
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  id: string;
  title: string;
}
type ColumnId = 'todo' | 'doing' | 'done';
type Board = Record<ColumnId, Card[]>;

function CardItem({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? 'kanban-card dragging' : 'kanban-card'}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {card.title}
    </div>
  );
}

function Column({ id, title, cards }: { id: ColumnId; title: string; cards: Card[] }) {
  // 每列注册为放置目标：卡片可以拖进来
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? 'kanban-col over' : 'kanban-col'}>
      <h3>
        {title}（{cards.length}）
      </h3>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </SortableContext>
    </div>
  );
}

/** 工具：id 可能是列 id 也可能是卡片 id，统一解析出它所在的列 */
function findColumn(board: Board, id: string): ColumnId | undefined {
  if (id === 'todo' || id === 'doing' || id === 'done') return id;
  return (Object.keys(board) as ColumnId[]).find((col) =>
    board[col].some((c) => c.id === id),
  );
}

export function KanbanBoard() {
  const [board, setBoard] = useState<Board>({
    todo: [
      { id: 'c1', title: '画原型' },
      { id: 'c2', title: '写接口文档' },
    ],
    doing: [{ id: 'c3', title: '登录接口联调' }],
    done: [{ id: 'c4', title: '需求评审' }],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // onDragOver：拖动过程中卡片经过另一列时"即时搬运"——这是跨容器体验的关键，
  // 等到 onDragEnd 才搬，用户看不到实时预览
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeCol = findColumn(board, String(active.id));
    const overCol = findColumn(board, String(over.id));
    if (!activeCol || !overCol || activeCol === overCol) return;

    setBoard((prev) => {
      const moving = prev[activeCol].find((c) => c.id === active.id);
      if (!moving) return prev;
      return {
        ...prev,
        [activeCol]: prev[activeCol].filter((c) => c.id !== active.id),
        [overCol]: [...prev[overCol], moving], // 先入列尾，松手时 onDragEnd 再精排
      };
    });
  }

  // onDragEnd：只在同列内做最终排序
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const col = findColumn(board, String(active.id));
    if (!col) return;
    setBoard((prev) => {
      const list = prev[col];
      const from = list.findIndex((c) => c.id === active.id);
      const to = list.findIndex((c) => c.id === over.id);
      if (from === -1 || to === -1 || from === to) return prev;
      return { ...prev, [col]: arrayMove(list, from, to) };
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection} // 多容器：按矩形相交判定落点，避免"吸错列"
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban">
        <Column id="todo" title="待办" cards={board.todo} />
        <Column id="doing" title="进行中" cards={board.doing} />
        <Column id="done" title="已完成" cards={board.done} />
      </div>
    </DndContext>
  );
}
```

**常见坑。**

- **症状**：列表项上的按钮点不动，一按就变成拖拽。**根因**：PointerSensor 按下即拖，`listeners` 铺满整行。**修法**：`activationConstraint: { distance: 8 }`，或把 `listeners` 只挂在把手元素上。
- **症状**：拖完之后列表顺序错乱、勾选状态串行。**根因**：列表 `key` 用了 index——排序改变后 index 与数据错位，React 复用错元素。**修法**：永远用稳定业务 id 作 key（`items.map(i => i.id)` 的 id 同时喂给 `SortableContext` 和 `key`，两处必须一致）。
- **症状**：拖动时元素原地不动或瞬移。**根因**：忘了把 `transform/transition` 绑到 style 上。**修法**：`style={{ transform: CSS.Transform.toString(transform), transition }}`。
- **症状**：Kanban 拖到两列之间松手，卡片落在错误的列。**根因**：多容器用了 `closestCenter`，它只比较中心距离，与"视觉上压住哪列"不符。**修法**：`rectIntersection`；更精细的（重叠面积最大）见《react-进阶大纲-复杂场景.md》1.6。
- **症状**：拖拽过程中整页卡顿。**根因**：`onDragOver` 高频触发，每次都做重计算/请求。**修法**：`onDragOver` 里只做本地状态搬运，防抖后才发请求；`DragOverlay` 的用法进阶篇再展开。

#### 3. 动画：CSS transition 状态机、framer-motion 进出场、列表 FLIP（AnimatePresence）

**是什么。** 进出场动画的本质矛盾：**React 卸载组件是同步删 DOM，而动画需要元素"活着"一段时间播完**。两个解法：手写"CSS transition 状态机"（理解原理），或用 framer-motion 的 `AnimatePresence`（生产标配）。列表 FLIP（First-Last-Invert-Play）则解决"删除中间项时，后面兄弟项平滑上移"这类**位置变化动画**。

**为什么需要。** 没有 exit 动画时，弹窗、抽屉、Toast 是"瞬间消失"，用户眼睛跟不上因果（我刚点了什么？东西去哪了？）。动画在这里不是装饰，而是**操作反馈的延续**——研究共识是 100~300ms 的过渡能显著提升"因果可感知性"。而 FLIP 之于列表：`filter` 掉一项后 DOM 重排是瞬移的，用户丢失了"哪个元素去了哪"的追踪线索。

**怎么做（机制分步）。**

*CSS transition 状态机*。把一个组件的可见性拆成**可见性**（要不要渲染）与**过渡阶段**（enter / entering / exit）两个正交状态：

```text
show=true  → phase: enter（挂载，初始样式：透明）→ 下一帧 entering（目标样式：不透明，transition 触发）
show=false → phase: exit（回到透明样式）→ onTransitionEnd 后才真正卸载（phase: exited 返回 null）
```

关键点：从 `enter` 切到 `entering` 必须等浏览器**完成一次样式计算与绘制**——连续同步两次 setState，浏览器会把两次样式合并渲染，transition 不触发。用**双 `requestAnimationFrame`**（比 `setTimeout(0)` 可靠）保证中间那一帧被绘制。卸载同理反过来：不能直接条件渲染掉，要先切 `exit` 样式、监听 `transitionend` 再移除。

*framer-motion*。`motion.div` 组件把 `initial / animate / exit` 三个样式集映射到三个阶段；`<AnimatePresence>` 的职责只有一件事——**跟踪直接子组件的卸载**：子元素被移除时不立即删 DOM，先播 `exit` 动画再删。所以"条件渲染必须写在 `AnimatePresence` 的直接子级上"是铁律。

*列表 FLIP*。给每个列表项加 `layout` 属性：framer-motion 在每次提交后测量元素新旧位置（First/Last），先施加反向 transform（Invert，元素视觉上留在原位），再补间到 0（Play）。中间项被删、其余项上移的动画全自动。`mode="popLayout"` 让被删除的元素脱离文档流播 exit，兄弟项的 FLIP 与其并行动画，不会互相顶撞。

安装：

```bash
npm i framer-motion
```

**代码示例。** 先手写 CSS 状态机（原理）：

```tsx
// components/CssTransition.tsx
import { ReactNode, useEffect, useRef, useState } from 'react';

type Phase = 'enter' | 'entering' | 'exit' | 'exited';

/**
 * CSS transition 状态机：
 * enter（初始样式）→ 下一帧 entering（目标样式，transition 被触发）
 * show=false → exit（过渡回初始样式）→ onTransitionEnd 后才真正卸载
 */
export function CssTransition({ show, children }: { show: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(show ? 'entering' : 'exited');
  // 保存待取消的 rAF 句柄：show 快速切换时丢弃过期的切相请求
  const rafRef = useRef<number | null>(null);

  function cancelPendingRaf() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  useEffect(() => {
    if (show) {
      setPhase('enter');
      // 双 rAF：确保 enter 样式先被绘制一帧，再切 entering，transition 才能触发
      const raf1 = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setPhase('entering'));
      });
      rafRef.current = raf1;
    } else {
      setPhase((p) => (p === 'exited' ? 'exited' : 'exit'));
    }
    return cancelPendingRaf;
  }, [show]);

  if (phase === 'exited') return null;

  const className =
    phase === 'enter' ? 'fade fade-enter' // 初始态：透明 + 下移 8px
    : phase === 'entering' ? 'fade fade-entering' // 目表态：不透明 + 归位，transition 生效
    : 'fade fade-exit'; // 出场：回到透明 + 下移

  // 出场动画播完，真正卸载
  function handleTransitionEnd() {
    if (phase === 'exit') setPhase('exited');
  }

  return (
    <div className={className} onTransitionEnd={handleTransitionEnd}>
      {children}
    </div>
  );
}
```

`CssTransition` 配套样式：

```css
/* CssTransition 配套样式：transition 声明在基类上，三个阶段只切换"值" */
.fade {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-enter,
.fade-exit {
  opacity: 0;
  transform: translateY(8px);
}
.fade-entering {
  opacity: 1;
  transform: translateY(0);
}
```

framer-motion 版弹窗进出场（等价于上面整个状态机的两行声明）：

```tsx
// components/FadeModal.tsx
import { AnimatePresence, motion } from 'framer-motion';

export function FadeModal({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    // AnimatePresence 监听直接子组件的挂载/卸载：卸载时先播 exit 再删 DOM
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-mask"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-body"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{title}</h3>
            <button onClick={onClose}>关闭</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

列表 FLIP（AnimatePresence + `layout`，删除中间项时后面项平滑上移）：

```tsx
// components/FlipTaskList.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Task {
  id: number;
  title: string;
}

export function FlipTaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: '写周报' },
    { id: 2, title: '复盘会议' },
    { id: 3, title: '发版' },
  ]);
  const [title, setTitle] = useState('');

  function add() {
    if (!title.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now(), title: title.trim() }]);
    setTitle('');
  }

  return (
    <div className="task-list-wrap">
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="新任务"
        />
        <button onClick={add}>添加</button>
      </div>
      <ul className="task-list">
        {/* initial={false}：初次加载不播进场，只有后续变化才动画 */}
        {/* mode="popLayout"：被删项脱离文档流播 exit，兄弟项的 layout 动画与它并行不顶撞 */}
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            // layout 属性即 FLIP：每次提交后测量新旧位置差，先反向 transform 再补间归零
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="task-item"
            >
              {task.title}
              <button
                onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                aria-label={`删除 ${task.title}`}
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
```

**常见坑。**

- **症状**：CSS 版状态机进场动画不播，元素直接出现。**根因**：`enter` 与 `entering` 在同一次渲染批次里被合并，浏览器没机会绘制初始样式。**修法**：双 `requestAnimationFrame` 再切目标态（上面实现），或改用 framer-motion 的 `initial/animate`。
- **症状**：framer-motion 的 `exit` 完全不生效，组件瞬间消失。**根因**：条件渲染没有写在 `AnimatePresence` 的**直接子级**上（比如在更外层 if 掉了整个 AnimatePresence，或子级没 `key`）。**修法**：`<AnimatePresence>{open && <motion.div key="modal" .../>}</AnimatePresence>` 这个结构不能变。
- **症状**：初次进入页面，整页列表齐刷刷播了一遍进场动画，很吵。**根因**：默认 `initial` 动画在首挂载也会播。**修法**：`<AnimatePresence initial={false}>`。
- **症状**：FLIP 列表动画"飞来飞去"，元素乱窜。**根因**：`key` 用 index 或不稳定值，React 复用错元素，位置测量张冠李戴。**修法**：稳定 id 作 key——这条与 dnd-kit、虚拟列表的 key 规范是同一条。
- **症状**：`transitionend` 触发后组件闪了一下。**根因**：子元素（比如按钮 hover）的 `transitionend` 冒泡上来被当成容器动画结束。**修法**：在 handler 里校验 `e.target === e.currentTarget`，或只用 framer-motion 免疫这类时序问题。

#### 4. 主题切换（CSS 变量 + data-theme + 持久化）

**是什么。** 一套完整的主题切换方案由四层组成：**语义化 CSS 变量**做样式层（组件只写 `var(--color-bg)`，不知道具体色值）；**`data-theme` 属性**做开关层（`<html data-theme="dark">` 切换变量取值）；**localStorage** 做持久层（刷新后保持）；**首屏内联脚本**做 FOUC（Flash of Unstyled Content，首屏闪烁）防治层。

**为什么需要。** 如果颜色散落在各组件里写死（`background: '#fff'`），换肤等于全局搜替换，暗色模式根本做不动。CSS 变量把"色值定义"与"色值使用"分离：定义集中在 `:root[data-theme='xxx']` 两套，使用处全部 `var()`。而 FOUC 是指：主题脚本如果放在 React 的 `useEffect` 里执行，浏览器会先用默认亮色渲染几百毫秒（下载/解析 bundle 的时间），暗色用户每次刷新都被白色闪一下眼睛——夜间被闪是用户投诉率最高的暗色模式 bug。

**怎么做（机制分步）。**

*第一步*：颜色全部变量化，按"语义"而非"外观"命名——`--color-bg`（页面底色）、`--color-text`（正文）、`--color-primary`（品牌色），而不是 `--color-white`。命名的语义稳定，加第三套主题时组件一行不改。

*第二步*：默认值挂在 `:root`（亮色），暗色值挂在 `:root[data-theme='dark']`。切换主题只改 `document.documentElement.dataset.theme` 一个属性，DOM 不动、组件不重渲染，浏览器重算变量后整页换色——这是性能最优的换肤方式。

*第三步*：持久化写 localStorage；**首屏读取必须在 React 之前**——在 `index.html` 的 `<head>` 里放一段**内联同步脚本**（不引用外部文件、不 defer/async），它在浏览器渲染任何内容之前执行，把 `data-theme` 设好。CSS 加载时变量就已是暗色，一次闪烁都不会有。默认值策略：没存储过时跟随系统 `prefers-color-scheme`。

*第四步*：React 侧的 `useTheme` 做三件事：初始值**读 DOM**（`document.documentElement.dataset.theme`）而不是再读一遍 localStorage——保证与首屏脚本所见一致；`useEffect` 里同步写 DOM + localStorage；监听 `storage` 事件实现**多标签页同步**（一个标签切了主题，其他标签立即跟上）。

**代码示例。** 先看变量定义：

```css
/* styles/theme.css —— 语义化命名：组件永远只引用语义，不引用具体色值 */
:root,
:root[data-theme='light'] {
  --color-bg: #ffffff;
  --color-bg-elevated: #ffffff; /* 浮层（弹窗/下拉）底色 */
  --color-text: #1f2329;
  --color-text-secondary: #86909c;
  --color-border: #e5e6eb;
  --color-primary: #1677ff;
  --color-danger: #f53f3f;
}
:root[data-theme='dark'] {
  --color-bg: #17171a;
  --color-bg-elevated: #232326;
  --color-text: #e8e8ea;
  --color-text-secondary: #a9a9b0;
  --color-border: #3a3a3f;
  --color-primary: #4096ff;
  --color-danger: #f76560;
}
body {
  background: var(--color-bg);   /* 使用处与主题解耦 */
  color: var(--color-text);
}
```

FOUC 防治的核心——`index.html` 的内联阻塞脚本：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>后台管理系统</title>
    <link rel="stylesheet" href="/src/styles/theme.css" />
    <script>
      // 必须内联且同步执行：这段代码在任何 CSS/首帧渲染之前跑完，
      // data-theme 已就位，暗色用户刷新时不会先闪白屏（FOUC）
      (function () {
        try {
          var stored = localStorage.getItem('theme'); // 用户上次的选择
          var theme =
            stored === 'light' || stored === 'dark'
              ? stored
              : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark' // 没选过：跟随系统
                : 'light';
          document.documentElement.dataset.theme = theme;
        } catch (e) {
          /* localStorage 被禁用（隐私模式）时静默降级为默认亮色 */
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`useTheme` Hook（含多标签页同步）：

```tsx
// hooks/useTheme.ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

// 初始值读 DOM 而不是 localStorage：首屏脚本已经把 dataset.theme 设好，
// 直接读它保证 React 首帧与用户看到的完全一致
function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'; // SSR 环境兜底
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // theme 变化 → 同步到 DOM（驱动 CSS 变量切换）与 localStorage（下次首屏可读到）
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* 隐私模式下存储失败可接受 */
    }
  }, [theme]);

  // 多标签页同步：其他标签页改了 localStorage 会触发本页的 storage 事件
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggle };
}
```

切换按钮组件：

```tsx
// components/ThemeToggle.tsx
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {theme === 'dark' ? '🌙 暗色' : '☀️ 亮色'}
    </button>
  );
}
```

**常见坑。**

- **症状**：暗色用户每次刷新都先闪一下白屏。**根因**：切主题写在 React 的 `useEffect` 里——bundle 下载解析的几百毫秒里页面已经是亮色。**修法**：`index.html` 内联同步脚本（见上），这段代码不属于 React，也无法属于 React。
- **症状**：切了主题，个别组件颜色不变。**根因**：这些组件里硬编码了 `#fff`/`rgba(0,0,0,.5)` 之类的字面色值，绕过了变量体系。**修法**：全部改成语义变量；评审时用 grep 查十六进制色值可以兜底。
- **症状**：系统是暗色，但应用打开是亮色。**根因**：默认值写死 `'light'`，没有走 `prefers-color-scheme`。**修法**：首屏脚本里的三段式（存储值 → 系统偏好 → 默认亮色）。
- **症状**：两个标签页主题不同步。**根因**：只写了 localStorage，没监听 `storage` 事件（该事件只在**其他**标签页修改时触发，本页不触发）。**修法**：见 `useTheme` 的第二个 effect。
- **症状**：改成三态选择（亮/暗/跟随系统）后行为错乱。**根因**：把解析后的 `'dark'` 存进了 localStorage，"跟随系统"状态丢失，且系统切换主题时不再联动。**修法**：localStorage 存 `'light' | 'dark' | 'system'` 三态，渲染时再解析为实际主题，并监听 `matchMedia('(prefers-color-scheme: dark)')` 的 `change` 事件。

#### 5. 国际化 i18n（语言包组织、切换、格式化）

**是什么。** i18n（internationalization，i 到 n 中间 18 个字母）指界面文案的多语言支持，三件事：**语言包组织**（文案与代码分离）、**切换**（运行时换语言不刷新）、**格式化**（数字/日期/复数按 locale 呈现）。本条手写一个最小可用的 i18n，理解原理；生产一般直接用 react-i18next。

**为什么需要。** 文案写死在 JSX 里（`<button>确定</button>`）时，加第二种语言等于重写所有页面。i18n 的核心动作是把文案抽成 key：`<button>{t('common:ok')}</button>`，渲染时按当前语言查表。而**格式化**是最容易被忽略的部分：`12,345.67`、`¥12,345.67`、`3 分钟前`、`1 item vs 2 items`——这些不是翻译问题，是 locale 规则问题，浏览器内置的 `Intl` 对象就是干这个的，不需要任何库。

**怎么做（机制分步）。**

*语言包组织*：一个语言一个目录，一个 namespace（命名空间）一个 JSON 文件——`common`（通用按钮/状态）、`user`（用户模块）、`validation`（校验提示）……好处是模块 Ownership 清晰（用户模块的语言包跟着模块走）、加载粒度可控（首屏只加载 common + 首页模块）、避免单个巨型文件 merge 冲突。key 使用 `namespace:点路径` 形式：`t('user:list.title')`。

*切换*：locale 状态放 Context；语言包 JSON 用动态 `import()`（Vite 的 `import.meta.glob` 懒加载），切换时才拉取目标语言；同时更新 `document.documentElement.lang`（影响无障碍朗读、字体选择与搜索引擎）。持久化到 localStorage。

*格式化*：`Intl.NumberFormat`（货币/千分位）、`Intl.DateTimeFormat`（日期时间）、`Intl.RelativeTimeFormat`（"3 分钟前"）、`Intl.PluralRules`（复数类别判断）。它们都以 locale 为第一参数——**格式化天然跟随语言切换，不需要翻译**。

*回退策略*：key 缺失时显示 key 本身（而不是空白），方便发现漏译；生产可加"缺失上报"。

**代码示例。** 语言包（注意两个语言的 key 树必须同构）：

```json
// src/locales/zh-CN/common.json
{
  "ok": "确定",
  "cancel": "取消",
  "search": "搜索",
  "loading": "加载中…"
}
```

```json
// src/locales/zh-CN/user.json
{
  "list": { "title": "用户列表", "empty": "暂无用户", "createdAt": "创建于 {{time}}" },
  "action": { "create": "新建用户", "delete": "删除" }
}
```

```json
// src/locales/en-US/user.json
{
  "list": { "title": "Users", "empty": "No users yet", "createdAt": "Created at {{time}}" },
  "action": { "create": "New User", "delete": "Delete" }
}
```

最小 i18n 实现（Provider + t 函数 + 插值 + 懒加载）：

```tsx
// src/i18n/index.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'zh-CN' | 'en-US';

type Pack = Record<string, unknown>;

// Vite 的 import.meta.glob：把语言包收集为懒加载函数，切换语言时才真正请求
const modules = import.meta.glob<{ default: Pack }>('../locales/*/*.json');

/** 按 'a.b.c' 点路径在语言包里查找，返回字符串或 undefined */
function lookup(pack: Pack, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in (node as Pack)) {
      return (node as Pack)[key];
    }
    return undefined;
  }, pack);
  return typeof value === 'string' ? value : undefined;
}

/** 插值：把 { name: 'React' } 填进 "Hello {{name}}" */
function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => params[key] ?? `{{${key}}}`);
}

interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    return stored === 'en-US' || stored === 'zh-CN' ? stored : 'zh-CN';
  });
  // packs 按 namespace 存：{ common: {...}, user: {...} }
  const [packs, setPacks] = useState<Record<string, Pack>>({});

  useEffect(() => {
    let cancelled = false; // 防止快速连切语言时旧请求晚到覆盖
    (async () => {
      const entries = await Promise.all(
        Object.entries(modules)
          .filter(([path]) => path.includes(`/${locale}/`)) // 只加载当前语言的全部 namespace
          .map(async ([path, load]) => {
            const ns = path.split('/').pop()!.replace('.json', '');
            return [ns, (await load()).default] as const;
          }),
      );
      if (!cancelled) setPacks(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      // key 形如 'user:list.title'：冒号前是 namespace，后面是点路径
      const [ns, ...rest] = key.split(':');
      const template = packs[ns] ? lookup(packs[ns], rest.join('.')) : undefined;
      // 缺失回退到 key 本身：界面上直接暴露漏译，而不是白屏或英文混排
      return template ? interpolate(template, params) : key;
    },
    [packs],
  );

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem('locale', next);
    document.documentElement.lang = next; // 无障碍朗读与浏览器翻译都依赖 lang
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
```

使用侧 + `Intl` 格式化：

```tsx
// src/pages/UserListHeader.tsx
import { useI18n } from '../i18n';

export function UserListHeader({ total, updatedAt }: { total: number; updatedAt: Date }) {
  const { locale, t, setLocale } = useI18n();

  // Intl 格式化：跟随 locale，不需要进语言包
  const countText = new Intl.NumberFormat(locale).format(total);
  const dateText = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(updatedAt);
  const relativeText = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    -Math.round((Date.now() - updatedAt.getTime()) / 60000),
    'minute',
  );

  return (
    <header className="user-header">
      <h1>{t('user:list.title')}</h1>
      <p>
        {countText} · {t('user:list.createdAt', { time: dateText })}（{relativeText}）
      </p>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as 'zh-CN' | 'en-US')}
        aria-label="语言"
      >
        <option value="zh-CN">简体中文</option>
        <option value="en-US">English</option>
      </select>
    </header>
  );
}
```

`Intl` 三个常用对象的输出对照（直观感受 locale 规则差异）：

```ts
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(1234.5);
// → ¥1,234.50
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5);
// → 1.234,50 €（德语：句号分组、逗号小数、货币符号在后）

new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(-1, 'day'); // → 昨天
new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(-1, 'day'); // → yesterday

// 复数：英语有 one/other 之分，中文没有——这就是 ICU MessageFormat 存在的原因
new Intl.PluralRules('en-US').select(1); // → 'one'
new Intl.PluralRules('en-US').select(2); // → 'other'
new Intl.PluralRules('zh-CN').select(2); // → 'other'（中文只有 other 一类）
```

进阶主题——**运营可改的动态语言包、ICU MessageFormat 复数/性别语法、缺失文案上报、与 Schema 表单联动**，见《react-高阶场景-第二辑.md》场景 10「国际化与动态语言包」。

**常见坑。**

- **症状**：界面出现裸 key（`user:list.title`）。**根因**：语言包漏了这个 key，或 namespace 前缀拼错（`user:list.title` 写成 `users:list.title`）。**修法**：缺失回退显示 key 是特性不是 bug——让漏译立刻可见；上线前写个脚本对比两个语言包的 key 集合差异。
- **症状**：切语言后部分文案没变。**根因**：这些文案没走 `t()`（写死中文），或组件里把 `t()` 结果存进了 state/useMemo（依赖数组没含 locale）。**修法**：全部走 `t()`，`t` 已随 locale 变化，直接渲染即可。
- **症状**：数字/日期没跟随语言变。**根因**：手写格式化（`d.toLocaleDateString()` 传死 locale，或自己拼 `YYYY-MM-DD`）。**修法**：统一用 `Intl` 系列并把 locale 作为第一参数传入。
- **症状**：快速连切语言，界面语言和下拉框不一致。**根因**：异步加载语言包，旧语言的请求晚到覆盖了新的。**修法**：effect 里加 `cancelled` 标记（上面实现），或用 `AbortController`。
- **症状**：上线后才发现"初期写死中文"改造代价巨大。**根因**：文案渗透到了校验消息、枚举 label、后下发字段。**修法**：第一天就上 i18n 骨架，哪怕只有一种语言——这也是第二辑场景 10 反复强调的教训。

#### 6. 权限系统：路由级权限、按钮级权限（权限组件/usePermission）

**是什么。** 前端权限分两层：**路由级**——没有某模块权限的人进不了那个页面（守卫拦截 + 菜单隐藏）；**按钮级**——进了页面但没有"删除"权限的人看不到/点不了删除按钮。数据模型通常是登录接口返回的权限码数组：`permissions: ['user:list', 'user:create', 'user:delete', '*']`（`*` 表示超管）。

**为什么需要。** 前端权限**不是安全机制**——任何接口层面的越权都必须由服务端校验（用户可以绕过 UI 直接 curl）。前端权限的价值是**体验与效率**：不给用户看一个点了就报 403 的按钮、不给运营展示一辈子用不到的菜单。理解这一点，方案设计的取舍就清晰了：前端做展示层过滤，服务端做真正的鉴权，两边共用同一套权限码字典。

**怎么做（机制分步）。**

*第一步：权限的注入与查询。* 登录成功后拿 `permissions` 数组，塞进一个 Provider；查询用 `Set<string>`（`has` 是 O(1)，权限码几百个时比数组 `includes` 快一个量级），并提供 `has(code)`（单权限）与 `hasAny(codes)`（任一满足）两个查询函数。

*第二步：路由级守卫。* 路由配置里给每个路由加 `meta: { permission: 'user:list' }` 自定义字段；写一个 `RequirePermission` 守卫组件读取 meta 并判断：有权限渲染 `<Outlet/>`（子路由），无权限 `<Navigate to="/403" replace/>`。登录与否用同构的 `RequireAuth` 守卫先拦一层。菜单渲染时用同一份权限数据过滤，保证"菜单里看不到的，URL 也进不去"。

*第三步：按钮级。* 一个 `<Can>` 组件包住受限内容：有权限渲染 children，无权限渲染 fallback（默认不渲染，也可给禁用态按钮）；命令式场景用 `usePermission()` 直接拿 `has` 判断。

**代码示例。** 权限 Provider 与 Hook：

```tsx
// src/permission/index.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

interface PermissionContextValue {
  permissions: ReadonlySet<string>;
  has: (code: string) => boolean;
  hasAny: (codes: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: string[]; // 登录接口返回的权限码，如 ['user:list', 'user:delete', '*']
  children: ReactNode;
}) {
  // Set.has O(1)：权限码多时比数组 includes 快得多；useMemo 避免每次渲染重建
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const has = useCallback(
    (code: string) => permissionSet.has(code) || permissionSet.has('*'), // '*' 为超管通配
    [permissionSet],
  );
  const hasAny = useCallback((codes: string[]) => codes.some(has), [has]);

  const value = useMemo(
    () => ({ permissions: permissionSet, has, hasAny }),
    [permissionSet, has, hasAny],
  );
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission 必须在 PermissionProvider 内使用');
  return ctx;
}
```

`<Can>` 按钮级权限组件：

```tsx
// src/permission/Can.tsx
import type { ReactNode } from 'react';
import { usePermission } from './index';

export function Can({
  permission,
  any,
  fallback = null,
  children,
}: {
  /** 需要的单个权限码 */
  permission?: string;
  /** 满足其中任一即可 */
  any?: string[];
  /** 无权限时的替代渲染（可传禁用按钮、空节点等） */
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { has, hasAny } = usePermission();
  const allowed = any ? hasAny(any) : permission ? has(permission) : true;
  return <>{allowed ? children : fallback}</>;
}
```

路由级：带 `meta` 的路由配置 + 守卫组件：

```tsx
// src/router/index.tsx
import { Navigate } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './guards';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UserListPage } from '../pages/users/UserListPage';
import { UserDetailPage } from '../pages/users/UserDetailPage';
import { RoleListPage } from '../pages/roles/RoleListPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { ForbiddenPage } from '../pages/403';
import { NotFoundPage } from '../pages/404';

// 自定义路由类型：在官方 RouteObject 上扩展 meta 字段（结构类型兼容，useRoutes 直接可用）
interface AppRouteObject {
  path?: string;
  element?: React.ReactNode;
  children?: AppRouteObject[];
  meta?: { permission?: string }; // 路由级权限标记
}

export const routes: AppRouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth><AdminLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'users',
        element: <RequirePermission meta={{ permission: 'user:list' }} />,
        children: [
          { index: true, element: <UserListPage /> },
          { path: ':id', element: <UserDetailPage /> },
        ],
      },
      {
        path: 'roles',
        element: <RequirePermission meta={{ permission: 'role:list' }} />,
        children: [{ index: true, element: <RoleListPage /> }],
      },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];
```

守卫依赖的最小登录态（完整鉴权流程见产出项目的验收标准）：

```tsx
// src/stores/auth.tsx —— 最小登录态：token + 用户信息 + 权限码（阶段 5 会重构为 Zustand）
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  permissions: string[];
  isLoggedIn: boolean;
  login: (token: string, permissions: string[]) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 初始值读 localStorage：刷新后仍处于登录态（401 拦截时统一 logout）
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('permissions') ?? '[]') as string[],
  );

  const login = useCallback((nextToken: string, perms: string[]) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('permissions', JSON.stringify(perms));
    setToken(nextToken);
    setPermissions(perms);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    setToken(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({ token, permissions, isLoggedIn: token !== null, login, logout }),
    [token, permissions, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
```

守卫组件（登录守卫 + 权限守卫，同一套路的两个实例）：

```tsx
// src/router/guards.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/auth';       // 登录态：token + 当前用户信息
import { usePermission } from '../permission';

/** 登录守卫：未登录跳 /login，并记住来源页便于登录后跳回 */
export function RequireAuth() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />; // 放行：继续渲染子路由
}

/** 权限守卫：路由 meta 里声明了 permission 就校验，无权限跳 403 */
export function RequirePermission({ meta }: { meta?: { permission?: string } }) {
  const { has } = usePermission();
  if (meta?.permission && !has(meta.permission)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
```

使用侧（列表页里的删除按钮）：

```tsx
// src/pages/UserListPage.tsx（节选：按钮级权限的使用方式）
import { Can } from '../permission/Can';

export function UserListPage() {
  function deleteUser(id: string) {
    /* 调用删除接口并刷新列表（见 4.2 TanStack Query） */
  }

  return (
    <div>
      {/* 无 user:delete 权限时渲染禁用按钮，用户知道"这里有个操作但我没有权限" */}
      <Can
        permission="user:delete"
        fallback={<button disabled title="没有删除权限">删除</button>}
      >
        <button onClick={() => deleteUser('u_001')}>删除</button>
      </Can>
    </div>
  );
}
```

**常见坑。**

- **症状**：按钮藏了，但用户手敲 URL 直接进了页面。**根因**：只做了按钮级，路由没有 meta 守卫。**修法**：路由级（`RequirePermission`）与按钮级（`Can`）两层都要有，且菜单渲染用同一份权限过滤。
- **症状**：测试同学换账号登录后权限还是上一个账号的。**根因**：`PermissionProvider` 的 `permissions` 只在挂载时取值，退出登录没卸载/更新它。**修法**：把登录态（含 permissions）收敛到一个 Provider/Store，登出时整体重置；权限变化依赖数组要包含 `permissions`。
- **症状**：超管角色所有页面都 403。**根因**：后端给超管返回 `['*']`，前端 `has` 只做了精确匹配。**修法**：`has` 里处理通配 `'*'`（上面实现）；通配规则要和后端约定一致。
- **症状**：权限码字符串散落二十个文件，后端改名后全局崩。**根因**：`'user:delete'` 到处硬编码。**修法**：集中到 `src/permission/codes.ts` 的常量对象（`PERM.USER_DELETE`），改一处生效。
- **症状**：前端把用户挡住了，接口实际也没返回数据，但安全评审还是不过。**根因**：误解了前端权限的定位。**修法**：接受它只是 UX 层；接口鉴权在服务端做，前端永远不承担安全职责。

#### 7. 错误边界 ErrorBoundary + 降级 UI + 组件级上报

**是什么。** ErrorBoundary 是 React 内置的错误捕获机制：一个**类组件**，通过 `static getDerivedStateFromError` 和 `componentDidCatch` 两个生命周期捕获**子树在渲染期间抛出的异常**，把错误转换为降级 UI，避免整棵应用白屏。

**为什么需要。** 组件 render 期间的任何异常（`undefined.xxx`、map 之前没判空……）会让 React 卸载**整棵组件树**——一个图表组件的数据字段变了，整个后台白屏，用户只能刷新。函数组件与 Hook **无法**实现错误边界（React 官方明确：没有 plan 用 Hook 实现等价物），这是日常开发里你唯一必须写类组件的地方。降级 UI 决定"崩了之后用户看到什么"；上报接入点决定"崩了之后你能不能知道"。

**怎么做（机制分步）。** 两个生命周期各司其职：

- `static getDerivedStateFromError(error)`：在**渲染阶段**调用，返回值 merge 进 state。要求纯函数（不能再抛错、不能有副作用）——它唯一的职责是"让下一次渲染走降级分支"；
- `componentDidCatch(error, info)`：在**提交阶段**调用（此时 DOM 已经是降级 UI），适合副作用——这就是**上报接入点**。`info.componentStack` 是 React 组件堆栈（哪个组件链上炸的），比 `error.stack`（JS 调用栈，生产环境被压缩）更接近问题定位点。

再配合三个工程点：`fallback` 支持"节点或 `(error, reset) => ReactNode` 函数"双形态（函数形态可以渲染重试按钮）；`reset` 清空错误态重渲染 children；边界粒度按"页面级 + 关键 widget 级"两层布置，一个小图表崩了只降级它自己。

最后必须清楚**捕获边界**——ErrorBoundary 捕不到的有：**事件回调里的错误**（`onClick` 中 throw 不经过渲染管线）、**异步代码**（`setTimeout` / Promise reject / `await` 抛错）、**ErrorBoundary 自身**（而非子树）的错误、SSR。这些要靠 `window.onerror` + `unhandledrejection` 全局兜底，React 19 还提供了 `createRoot` 的 `onCaughtError` / `onUncaughtError` 回调统一上报。

**代码示例。** 完整实现：

```tsx
// src/components/ErrorBoundary/index.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * 降级 UI：传节点则原样渲染；
   * 传函数则拿到 error 与 reset（用于渲染"重试"按钮），是最常用的形态
   */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 上报接入点：接到 Sentry / 自建日志平台都从这里进 */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  // 渲染阶段调用：把错误转成 state，让下一次渲染走降级分支。必须纯函数、不能再抛
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  // 提交阶段调用（DOM 已是降级 UI）：副作用唯一合法位置——上报
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // info.componentStack 是组件级堆栈：定位"哪个组件渲染时炸的"比压缩后的 error.stack 更有用
    this.props.onError?.(error, info);
    // 接 Sentry 的示例（解开注释即可）：
    // Sentry.captureException(error, {
    //   contexts: { react: { componentStack: info.componentStack } },
    // });
  }

  // 恢复：清掉错误态，重新渲染 children（配合重试按钮）
  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return fallback(error, this.reset);
      if (fallback !== undefined) return fallback;
      // 内置降级 UI：说明发生了什么 + 给一条出路（错误信息在生产可能不友好，可只展示通用文案）
      return (
        <div role="alert" className="eb-fallback">
          <h2>这块内容出了点问题</h2>
          <p className="eb-message">{error.message}</p>
          <button onClick={this.reset}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

两层布置 + 上报用法：

```tsx
// src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';

const router = createBrowserRouter(routes); // routes 即上一段导出的路由配置数组

// 统一上报函数：真实项目里换成 Sentry/自建平台的 SDK
export function reportError(error: Error, info: { componentStack?: string | null }): void {
  console.error('[上报]', error, info.componentStack);
  // navigator.sendBeacon('/api/errors', JSON.stringify({ message: error.message, componentStack: info.componentStack }));
}

export default function App() {
  return (
    // 第一层：页面级兜底，任何路由渲染崩溃都不会白屏
    <ErrorBoundary onError={reportError} fallback={<h1>应用出错了，请刷新页面</h1>}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
```

第二层：关键 widget 独立边界——图表崩了只降级图表，页面其余部分照常工作。验证方法：临时把 `RevenueChart` 的数据改成 `undefined as unknown as { revenue: number[] }`，让它的 render 抛错。

```tsx
// src/pages/dashboard/DashboardPage.tsx
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { reportError } from '../../App';

/** 演示用图表组件：这里故意在 render 里抛错，用于验证 widget 级边界 */
function RevenueChart() {
  const data = undefined as unknown as { revenue: number[] }; // 模拟接口返回异常结构
  return <div>{data.revenue.length} 条数据</div>; // 渲染期间抛 TypeError，被下方边界捕获
}

export function DashboardPage() {
  return (
    <main>
      <h1>数据面板</h1>
      <section>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className="chart-fallback">
              <p>图表加载失败：{error.message}</p>
              <button onClick={reset}>重试</button>
            </div>
          )}
          onError={reportError}
        >
          <RevenueChart /> {/* 这个组件崩了只影响这一块 */}
        </ErrorBoundary>
      </section>
      <p>页面其余部分照常渲染——这就是两层边界的意义</p>
    </main>
  );
}
```

ErrorBoundary 捕不到的部分，用全局监听兜底：

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ① ErrorBoundary 之外的两类漏网之鱼：
//    window.onerror —— 同步错误（如事件回调里 throw，不经过渲染管线）
window.addEventListener('error', (event) => {
  reportError(event.error ?? new Error(event.message), {});
});
//    unhandledrejection —— 没有被 catch 的 Promise 拒绝（含 async/await 抛错）
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {});
});

const container = document.getElementById('root')!;
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ② React 19 起可再挂两个根级回调，与 ErrorBoundary 形成完整上报矩阵：
// createRoot(container, {
//   onCaughtError: (error, errorInfo) => reportError(error, errorInfo),      // 被边界捕获的
//   onUncaughtError: (error, errorInfo) => reportError(error, errorInfo),    // 没被任何边界接住的
// }).render(<App />);
```

**常见坑。**

- **症状**：在 `onClick` / `setTimeout` / `await` 里 throw，ErrorBoundary 没反应。**根因**：它只捕获**子树渲染期间**的错误，事件回调与异步代码不经过渲染管线。**修法**：异步/事件里的错误自己 try/catch；全局兜底 `window.onerror` 与 `unhandledrejection`（见上）。
- **症状**：开发环境一片红色遮罩，以为自己的 ErrorBoundary 没生效。**根因**：开发模式下 React 会额外把未捕获错误抛给 `window`，红色遮罩是开发提示。**修法**：`build` 后预览验证；或在事件回调/渲染里确认确实走了降级分支。
- **症状**：一个小组件崩了整页降级。**根因**：整个应用只有一层边界。**修法**：页面级 + 关键 widget 级两层布置（上面 DashboardPage 的做法）。
- **症状**：生产环境上报的 `error.stack` 全是 `min/a1b2.js:1:23456`，没法定位。**根因**：构建压缩。**修法**：上报 `info.componentStack`（组件堆栈不受压缩影响）+ Source Map 私有化部署回源。
- **症状**：点"重试"后立刻又崩，死循环。**根因**：错误根源是脏数据/接口返回异常结构，重渲染再炸一次。**修法**：`reset` 只对"瞬时渲染错误"有意义；对数据问题，降级 UI 里给"返回首页/刷新"，并在数据层加结构校验。

#### 8. 骨架屏 / 空态 / 错误态 / 加载态的统一设计

**是什么。** 任何异步数据在界面上的呈现都逃不开四种状态：**loading**（加载中，骨架屏）、**error**（加载失败，错误态 + 重试）、**empty**（成功但没有数据，空态 + 引导动作）、**success**（成功展示数据）。"四态统一设计"就是定义一个**判别联合类型** + 一个**容器组件**，让所有列表/详情页共享同一套状态渲染，消灭每个页面自己拼 `if (loading) ... if (error) ...` 的重复代码。

**为什么需要。** 类型层面的收益：用三个布尔（`isLoading/isError/isEmpty`）表达状态有 2³=8 种组合，其中"loading 且 error"这种矛盾态在代码里完全合法——bug 温床。判别联合（discriminated union）用 `status` 字段互斥，**矛盾态在编译期就被 TypeScript 排除**，且 narrow 后 `success` 分支自动收窄出 `data`。UI 层面的收益：四态的视觉规范（骨架形状、空态插画、错误按钮）收敛到一个组件，改一次全局生效。

**怎么做（机制分步）。**

*第一步：类型驱动*。定义 `AsyncState<T>`：四个分支，只有 `success` 携带 `data`，只有 `error` 携带 `error` 对象——"什么状态下能访问什么数据"由类型系统保证。

*第二步：状态生产*。写一个 `useAsync` 把任意请求函数转成 `AsyncState`，注意两个细节：**竞态防护**（快速切换参数时旧请求晚到覆盖新结果，用"代数 ref"只认最后一次调用）；**empty 的判定留给调用方**（`isEmpty?: (data) => boolean`），因为"列表 length===0 是空态"而"详情页永远不空"是业务语义。

*第三步：状态消费*。`<AsyncContainer state={...} render={data => ...}>` 容器组件 switch 四分支；骨架屏的**形状与真实内容同构**（表格骨架是行、卡片骨架是块），切换时才不跳版。

**代码示例。** 类型与容器：

```ts
// src/components/AsyncContainer/types.ts
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | { status: 'success'; data: T };
```

```tsx
// src/components/AsyncContainer/index.tsx
import type { ReactNode } from 'react';
import type { AsyncState } from './types';

/** 骨架行：形状与真实表格行同构，加载完成切换时不跳版 */
function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="加载中">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}

interface AsyncContainerProps<T> {
  state: AsyncState<T>;
  /** 错误态的重试回调（通常传 refetch） */
  onRetry?: () => void;
  /** 空态自定义内容（默认"暂无数据"） */
  empty?: ReactNode;
  /** 成功态渲染函数：narrow 之后这里一定能拿到 data，不再判空 */
  render: (data: T) => ReactNode;
}

export function AsyncContainer<T>({ state, onRetry, empty, render }: AsyncContainerProps<T>) {
  switch (state.status) {
    case 'loading':
      return <SkeletonRows rows={5} />;
    case 'error':
      return (
        <div className="state state-error" role="alert">
          <p>加载失败：{state.error.message}</p>
          {onRetry && (
            <button onClick={onRetry} className="retry-btn">
              重试
            </button>
          )}
        </div>
      );
    case 'empty':
      return (
        <div className="state state-empty">
          {empty ?? <p>暂无数据</p>} {/* 空态要给"下一步"：如"新建第一条记录" */}
        </div>
      );
    case 'success':
      return <>{render(state.data)}</>;
  }
}
```

状态生产方（`useAsync`，含竞态防护与 empty 判定）：

```ts
// src/hooks/useAsync.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AsyncState } from '../components/AsyncContainer/types';

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  isEmpty?: (data: T) => boolean,
): { state: AsyncState<T>; refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  // 代数 ref：每次请求自增，响应回来时只认最新一次——防止旧请求晚到覆盖新结果（竞态）
  const generationRef = useRef(0);

  const run = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: 'loading' });
    try {
      const data = await fetcher();
      if (generationRef.current !== generation) return; // 已被更新的请求取代，丢弃
      // empty 的判定是业务语义：列表 length===0 算空，详情页不算——由调用方注入
      setState(isEmpty?.(data) ? { status: 'empty' } : { status: 'success', data });
    } catch (error) {
      if (generationRef.current !== generation) return;
      setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { state, refetch: run };
}
```

使用侧（一个用户列表页，四态全部免费获得）：

```tsx
// src/pages/BookList.tsx
import { AsyncContainer } from '../components/AsyncContainer';
import { useAsync } from '../hooks/useAsync';

interface Book {
  id: string;
  title: string;
}

function fetchBooks(): Promise<Book[]> {
  return fetch('/api/books').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

export function BookList() {
  const { state, refetch } = useAsync(
    fetchBooks,
    [],
    (books) => books.length === 0, // 空列表判定为空态（业务语义在这里注入）
  );

  return (
    <AsyncContainer
      state={state}
      onRetry={refetch}
      empty={
        <div className="empty-books">
          <p>书架还是空的</p>
          <button>去添加第一本书</button> {/* 空态给行动入口，不是死胡同 */}
        </div>
      }
      render={(books) => (
        <ul className="book-list">
          {books.map((book) => (
            <li key={book.id}>{book.title}</li>
          ))}
        </ul>
      )}
    />
  );
}
```

**常见坑。**

- **症状**：页面同时出现"加载中"转圈和"加载失败"红字。**根因**：三个布尔状态并存（`isLoading` 还没置 false，`isError` 已置 true），布尔组合没有任何约束。**修法**：换 `AsyncState` 判别联合，互斥由类型保证。
- **症状**：接口成功返回空数组，页面显示"加载失败"。**根因**：把"没数据"当错误处理，或空态分支被漏写直接落到 error。**修法**：明确区分 error（请求没成功）与 empty（请求成功但无数据），empty 单列分支。
- **症状**：骨架屏切到真实内容时页面跳动。**根因**：骨架是一根大进度条，与内容布局不同构。**修法**：骨架按内容形状画（表格画 N 行、卡片画块），高度与真实内容一致。
- **症状**：快速切换筛选条件，最后显示的是第一次的结果。**根因**：`useAsync` 没做竞态防护，旧响应晚到覆盖。**修法**：generation ref 或 AbortController（4.2 的 useFetch 专题）。
- **症状**：空态是一句干巴巴的"暂无数据"。**根因**：把空态当"结束"，而不是"引导"。**修法**：区分两种空态——初始空（引导创建）与筛选后空（提供"清空筛选"）；空态永远给一个行动按钮。

#### 9. 复制到剪贴板、全屏、通知等浏览器 API 在 React 中的封装

**是什么。** 浏览器有一批"能力型 API"（剪贴板、全屏、通知、地理、录像……），它们的共同特征：**有权限门槛、返回 Promise、报错是 DOMException、状态不归 React 管**。把这类 API 封装成 Hook 的通用范式是本条的练习目标：**特性检测 → 权限申请 → 错误分类处理 → 与 React 生命周期整合（卸载清理）**。

**为什么需要。** 直接在事件回调里裸调 `navigator.clipboard.writeText` 的代码，会在这些场景下炸掉：HTTP 环境部署（clipboard 是 undefined）、用户拒绝授权（NotAllowedError）、组件已卸载但回调还在跑。裸调的代码还必须每个组件重复一遍 try/catch 与权限判断。封装成 Hook 后：权限与可用性检测一次性做好、错误统一分类打日志、副作用（定时器/事件监听/退出全屏）在卸载时清理——**调用方只面对"状态 + 动作"两个概念**。

**怎么做（机制分步）。** 通用范式四步：

1. **特性检测**：`typeof Notification === 'undefined'` / `navigator.clipboard` 是否存在——iOS Safari、HTTP 环境、旧浏览器都可能没有这个 API，先判断再调用；
2. **权限**：能预申请的预申请（Notification 必须 `requestPermission`，且**必须由用户手势触发**）；不能预申请的（clipboard 写入一般默认授予）捕获 `NotAllowedError` 再引导；
3. **错误分类**：Promise 拒绝的都是 `DOMException`，按 `name` 分支——`NotAllowedError`（用户拒绝）、`NotFoundError`（目标不存在）、`SecurityError`（非安全上下文）……统一出口便于打点上报；
4. **生命周期整合**：监听全局事件的（fullscreenchange）要在卸载时移除；占用系统资源的（Notification 实例、定时器）要在卸载时释放；卸载后禁止 setState。

**代码示例。** 剪贴板：

```tsx
// hooks/useClipboard.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 复制到剪贴板。
 * 限制：Clipboard API 只在安全上下文（https 或 localhost）可用；
 * "已复制"状态在 resetAfterMs 后自动复位，按钮文案随之切换。
 */
export function useClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // ① 特性检测：HTTP 环境或老浏览器没有 clipboard 对象
      if (!navigator.clipboard?.writeText) {
        console.warn('当前环境不支持 Clipboard API（需 https 或 localhost）');
        return false;
      }
      try {
        // ② 调用并等待；用户拒绝/页面失焦可能抛 NotAllowedError
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch (err) {
        // ③ 错误分类：NotAllowedError=权限被拒；其余（如文档失焦）打日志即可
        const name = err instanceof DOMException ? err.name : 'Unknown';
        console.warn(`复制失败（${name}）`, err);
        setCopied(false);
        return false;
      }
    },
    [resetAfterMs],
  );

  // ④ 卸载清理：清掉复位定时器，避免卸载后 setState
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, copy };
}
```

全屏：

```tsx
// hooks/useFullscreen.ts
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * 全屏控制。
 * 关键认知：用户按 ESC 退出全屏不会经过你的代码——
 * 所以必须监听 fullscreenchange 事件同步状态，而不是只在 enter/exit 里 setState。
 */
export function useFullscreen(target?: RefObject<HTMLElement | null>) {
  // 初始值读真实状态：mount 时可能已处于全屏（用户从前一页带过来）
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement !== null,
  );
  const exitedRef = useRef(false); // 标记是否由本 hook 进入的全屏（决定卸载时要不要退出）

  useEffect(() => {
    function onChange() {
      // fullscreenElement 指向当前全屏元素（null 表示已退出）——唯一可信来源
      setIsFullscreen(document.fullscreenElement !== null);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      // ④ 卸载清理：本 hook 进入的全屏在组件卸载时退出，别把用户困在全屏里
      if (exitedRef.current === false && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  const enter = useCallback(async () => {
    try {
      const el = target?.current ?? document.documentElement;
      // ② requestFullscreen 必须在用户手势（点击等）的调用栈里执行，返回 Promise
      await el.requestFullscreen();
      exitedRef.current = false;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'Unknown';
      console.warn(`进入全屏失败（${name}）`, err); // 常见：NotAllowedError（无手势）、TypeError（不支持）
    }
  }, [target]);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        exitedRef.current = true;
      } catch (err) {
        console.warn('退出全屏失败', err);
      }
    }
  }, []);

  return { isFullscreen, enter, exit };
}
```

通知：

```tsx
// hooks/useNotification.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * 桌面通知。两条硬约束：
 * 1. requestPermission 必须由用户手势触发（页面加载时直接弹会被浏览器忽略/拒绝）；
 * 2. 只有 granted 状态下 new Notification 才会真正展示。
 */
export function useNotification() {
  // ① 特性检测：iOS Safari 对 Web Notification 长期不支持
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  // 记录本 hook 创建的通知实例，卸载时统一关闭，避免系统通知堆积
  const notificationsRef = useRef<Notification[]>([]);

  useEffect(() => {
    const list = notificationsRef.current;
    return () => list.forEach((n) => n.close()); // ④ 卸载清理
  }, []);

  /** 权限申请：绑定在按钮 onClick 上调用；重复调用直接返回当前状态，不会反复弹窗 */
  const request = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission(); // 'granted' | 'denied' | 'default'
    setPermission(result);
    return result;
  }, []);

  /** 发送通知：仅在 granted 状态下有效，返回实例便于调用方继续绑定 onclick 等事件 */
  const notify = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        console.warn('通知未授权或不支持，无法发送');
        return null;
      }
      const n = new Notification(title, options); // options: body / icon / tag 等
      notificationsRef.current.push(n);
      n.onclose = () => {
        notificationsRef.current = notificationsRef.current.filter((item) => item !== n);
      };
      return n;
    },
    [],
  );

  return { permission, request, notify };
}
```

三个 Hook 的整合使用（一个"分享面板"）：

```tsx
// components/SharePanel.tsx
import { useRef, useState } from 'react';
import { useClipboard } from '../hooks/useClipboard';
import { useFullscreen } from '../hooks/useFullscreen';
import { useNotification } from '../hooks/useNotification';

export function SharePanel({ link }: { link: string }) {
  const { copied, copy } = useClipboard();
  const { isFullscreen, enter, exit } = useFullscreen();
  const videoRef = useRef<HTMLDivElement>(null); // 全屏目标：只让播放器区域全屏，而不是整页
  const { permission, request, notify } = useNotification();
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="share-panel">
      {/* 剪贴板 */}
      <button onClick={() => copy(link)}>
        {copied ? '已复制 ✓' : '复制链接'}
      </button>

      {/* 全屏：状态由 fullscreenchange 事件同步，ESC 退出也能正确回显 */}
      <div ref={videoRef} className="player-region">
        <p>播放器区域（可单独全屏）</p>
      </div>
      <button onClick={() => (isFullscreen ? exit() : enter())}>
        {isFullscreen ? '退出全屏' : '全屏播放'}
      </button>

      {/* 通知：先由用户点击申请权限，再订阅提醒 */}
      {permission === 'default' && <button onClick={request}>开启更新通知</button>}
      {permission === 'granted' && (
        <button
          onClick={() => {
            notify('已开启更新提醒', { body: '有新内容时会通知你', tag: 'subscribe' });
            setSubscribed(true);
          }}
        >
          {subscribed ? '已订阅' : '订阅更新'}
        </button>
      )}
      {permission === 'denied' && <span>通知权限被拒，可在浏览器设置中开启</span>}
    </div>
  );
}
```

**常见坑。**

- **症状**：`navigator.clipboard` 是 undefined，`TypeError: Cannot read properties of undefined`。**根因**：非安全上下文（http 部署到线上、局域网 IP 访问）。**修法**：特性检测 + 提示"需 https"；本地开发用 localhost（属于安全上下文）。
- **症状**：全屏后按 ESC 退出，按钮文字还显示"退出全屏"。**根因**：只在 enter/exit 里 setState，没监听 `fullscreenchange`；ESC 是浏览器行为，不经过你的 exit。**修法**：事件监听 + 以 `document.fullscreenElement` 为唯一可信状态源（上面实现）。
- **症状**：`requestPermission()` 返回的还是 `default`，从没弹过询问框。**根因**：在页面加载/`useEffect` 里调用——没有用户手势，浏览器直接忽略。**修法**：权限申请必须绑在用户点击上（SharePanel 的"开启更新通知"按钮）。
- **症状**：组件卸载后控制台仍报 warning / 通知一直挂着。**根因**：Hook 里创建的定时器、事件监听、Notification 实例没在卸载时清理。**修法**：每个 Hook 的 cleanup 分支（四个示例里都有标记 ④ 的位置）。
- **症状**：`requestFullscreen` 报 `NotAllowedError`。**根因**：调用不在用户手势栈里（比如先 `await` 了别的操作再调用，手势上下文已失效）。**修法**：全屏调用放在 onClick 的第一层同步执行，不要隔着 await。

✅ 产出：**后台管理系统**（登录鉴权 + 动态表格 + 增删改查弹窗 + 权限 + 主题），可参考 antd Pro 的结构自己从零实现。

这是阶段 4 的毕业项目：把 4.1–4.7 的所有场景整合进**一个真实工程形态**的应用。它不是"再学新知识"，而是检验你能否在多需求并存的约束下做取舍——这正是业务开发的日常。

**功能清单。**

| 模块 | 功能点 | 用到的本篇知识 |
|---|---|---|
| 登录鉴权 | 账号密码登录、token 存取与注入、401 统一拦截跳登录、登录后跳回来源页 | 4.4 路由守卫、4.2 数据请求 |
| 动态表格 | 列配置（columns）驱动渲染、服务端分页、筛选排序、分页/筛选参数同步到 URL | 4.3 列表场景、4.7-8 四态容器 |
| 增删改查弹窗 | 新建/编辑共用一个表单弹窗、zod 校验、提交 loading、成功后刷新列表 | 4.1 表单、4.5 弹层、4.2 mutation |
| 权限 | 路由级守卫 + 菜单按权限过滤 + 按钮级 `<Can>` | 4.7-6 权限系统 |
| 主题 | 亮/暗切换、localStorage 持久化、首屏无闪烁 | 4.7-4 主题切换 |
| 通用质量 | 全局错误边界 + 上报函数、四态、Toast 反馈 | 4.7-7、4.7-8、4.5 |

**页面结构树。** 推荐的工程目录（按功能聚合，而非按类型堆放）：

```text
src/
├── main.tsx                     # 入口：Provider 组合（Permission / Theme / I18n / QueryClient）
├── App.tsx                      # 全局 ErrorBoundary + RouterProvider
├── api/
│   ├── request.ts               # fetch 封装：baseURL、token 注入、401 统一跳登录
│   └── users.ts                 # 用户资源的 list/create/update/remove
├── router/
│   ├── index.tsx                # 路由配置数组（含 meta.permission）
│   └── guards.tsx               # RequireAuth / RequirePermission / 403 / 404
├── layouts/
│   └── AdminLayout.tsx          # 侧边菜单（按权限过滤）+ 顶栏（主题切换/退出）+ Outlet
├── stores/
│   └── auth.ts                  # 登录态：token + 用户信息 + permissions（阶段 5 换 Zustand）
├── components/
│   ├── AsyncContainer/          # 四态容器（4.7-8）
│   ├── Can/                     # 按钮级权限（4.7-6）
│   ├── ErrorBoundary/           # 错误边界（4.7-7）
│   ├── Toast/                   # 命令式 Toast（4.5）
│   └── CrudModal/               # 新建/编辑共用表单弹窗（4.1 + 4.5）
├── pages/
│   ├── login/                   # 登录页
│   ├── dashboard/               # 首页：统计卡片 + 图表占位
│   ├── users/
│   │   ├── UserListPage.tsx     # 动态表格主页
│   │   ├── userColumns.tsx      # 列配置（"动态表格"的动态所在）
│   │   └── UserFormModal.tsx    # 新建/编辑共用弹窗
│   ├── roles/                   # 角色与权限码配置页
│   ├── settings/                # 个人设置（主题切换入口）
│   ├── 403.tsx
│   └── 404.tsx
├── hooks/                       # useTheme / useClipboard / useWebSocket…（本篇产物沉淀）
└── styles/
    └── theme.css                # CSS 变量两套主题（4.7-4）
```

路由结构树（与上面目录对应）：

```text
/login                                  公开
/                                       RequireAuth（未登录 → /login?redirect=来源路径）
├─ AdminLayout（侧边菜单按 permissions 过滤）
│   ├─ index        → /dashboard        统计面板
│   ├─ /users       → RequirePermission('user:list')
│   │                 └─ /users/:id     用户详情
│   ├─ /roles       → RequirePermission('role:list')
│   └─ /settings                        个人设置（无需额外权限）
/403                                     无权限提示页
*                                        404
```

**与 antd Pro 的对照学习法。** 项目要求"自己从零实现，可参考 antd Pro 的结构"——正确姿势是**先自实现、后对照源码**，顺序不能反：

1. **从零实现**：组件层可用 antd 基础组件（Button/Table/Form/Modal），但**禁用 Pro 系列组件**（ProLayout/ProTable/PageContainer），逼自己把 4.x 各场景亲手拼装一遍；
2. **跑通官方演示**：clone [ant-design/ant-design-pro](https://github.com/ant-design/ant-design-pro) 本地跑起来，作为"标准答案"体验完整功能面；
3. **逐项对照**：按下表把你的手写实现与 Pro 的对应机制比对源码，思考"它多做了什么、为什么"：

| antd Pro 里的概念 | 你手写的对应物 | 对照看点 |
|---|---|---|
| ProLayout | AdminLayout | 菜单数据驱动生成、折叠态、面包屑与路由联动 |
| PageContainer | 页头区（标题+操作按钮） | 插槽设计：标题/额外内容/页脚怎么留扩展点 |
| ProTable | UserListPage + userColumns | columns 配置化的边界：搜索表单怎么从 columns 推导、request 协议怎么约定 |
| useRequest（ahooks） | 自写 useFetch / useAsync | 手动触发 vs 自动、缓存、防抖、轮询的取舍 |
| Access / useAccess | `<Can>` / usePermission | 权限数据从哪注入、 inaccessible 的渲染策略（隐藏 vs 禁用） |
| getInitialState（app.tsx） | auth store + Provider | 首屏"先拿登录态再渲染"的阻塞方案 |
| ProConfigProvider 暗色 | CSS 变量 + data-theme | 换肤作用在哪一层：token 系统对比 CSS 变量 |

4. **回填差距**：把对照中发现的机制（比如 ProTable 的 request 协议、ProLayout 的菜单渲染函数）回填到自己的项目里再实现一遍——这一步的收获远大于第一次实现。

**逐条验收标准。**

- [ ] **登录鉴权**：未登录访问任意受保护路由 → 跳 `/login` 且 URL 带 `redirect` 参数；登录成功跳回原页面；token 过期后任意请求收到 401 → 自动清除登录态并跳登录页。
- [ ] **动态表格**：列由 `userColumns.tsx` 配置驱动，增删一列不改组件代码；服务端分页正确（页码/每页条数变化触发请求）；分页与筛选条件同步在 URL 查询参数中——复制 URL 到新标签页能还原相同视图，浏览器后退能回到上一组条件。
- [ ] **四态齐备**：首次进入显示骨架屏；接口 500 显示错误态且点"重试"能恢复；空数据显示空态并带"新建用户"入口；表格 loading 时操作按钮禁用。
- [ ] **CRUD 弹窗**：新建与编辑共用 `UserFormModal`（编辑回填数据）；zod 校验不通过时提交按钮不触发请求；提交期间按钮 loading 且弹窗不可关；成功后 Toast 提示、弹窗关闭、列表自动刷新。
- [ ] **权限（路由级）**：用只有 `user:list` 权限的测试账号登录——菜单里不出现"角色管理"；手敲 `/roles` 跳转 403 页。
- [ ] **权限（按钮级）**：无 `user:delete` 权限的账号，用户行内删除按钮渲染为禁用态（title 提示无权限）；有权限则可删除且删除后有确认弹窗与 Toast。
- [ ] **主题**：亮/暗切换立即生效；刷新页面**无白屏闪烁**（暗色用户首帧即暗色）；新开标签页打开应用主题一致；两个标签页切换主题互相同步。
- [ ] **错误边界**：在某个图表组件里故意 `throw new Error('test')`——只有该区域显示降级 UI（含重试按钮），页面其余部分可用；控制台的 reportError 函数被调用且带 componentStack。
- [ ] **工程质量**：StrictMode 打开无控制台警告；`tsc --noEmit` 零错误；ESLint（含 react-hooks 插件）零 error；`npm run build` 产物可直接部署预览。

全部勾完，阶段 4 结业。这个项目会继续作为阶段 5（状态管理重构）、阶段 6（性能优化 Profiler 实录）、阶段 8（测试）的宿主项目，一路演进到毕业。

## 阶段 5：状态管理（1 周）

> 本阶段回答一个工程问题：**一份状态到底应该住在哪**。学完之后，你应当能对项目里的每一条状态说出它的"户口"——组件内、最近公共祖先、Context、外部 store、React Query 缓存，还是 URL。状态放错地方的代价不是立即报错，而是两种慢性病：要么 props 层层透传把代码拧成麻花，要么一处 setState 引发全页重渲染。本阶段七条就是一套完整的"分房"方案。

### 1. **选型决策树**：组件内 state → 状态提升 → Context → Zustand/Redux

**是什么**：一条"状态归属"的判断流程。按顺序自上而下询问，命中即停——绝大多数状态在前两步就该结束旅程，真正需要全局 store 的状态比直觉少得多。

**为什么需要**：初学者最常见的两个极端是"全塞 App 根组件"和"全塞全局 store"。前者让任何一次输入都触发整树重渲染，后者让一个弹窗开关都要走一套全局订阅。决策树的价值是给出**判断顺序**而不是工具偏好：先问作用域，再问更新频率，最后才问工具。

**怎么做（机制分步）**：完整文字版决策树如下。

```text
【第 0 问】这份状态本质上是哪类数据？
├── 它是服务器数据的本地副本（列表、详情、当前用户信息）
│     → 不进入本决策树，交给 React Query / SWR（见第 6 条）
├── 它能放进 URL（筛选、分页、Tab、排序）
│     → 放 URL（见第 7 条）
├── 它能由 props / 其他 state 直接推导（全选 = 每项都选中）
│     → 不存状态，render 里直接算或 useMemo（见阶段 2 useEffect 第 5 条）
└── 它是"真正需要存储的客户端状态" → 继续往下

【第 1 步】组件内 state（useState / useReducer）
判据：只有当前组件，或当前组件 + 它直接渲染的一两个子组件读写。
反判据（说明该走下一步）：兄弟组件也要读写；需要"记住"它的是另一棵子树。

【第 2 步】状态提升（提升到最近公共祖先）
判据：共享方集中在同一棵子树内；提升后中间透传层数 ≤ 2；
      提升后没有"无关组件"被连累重渲染（中间层都消费该状态或只是通道很短）。
反判据：透传要穿过 3 层以上与该状态无关的组件（props drilling 痛感出现）；
      最近公共祖先接近根组件，一变全页动。

【第 3 步】Context
判据：值的更新频率低——主题、语言、当前登录用户、主题配置、依赖注入的实例；
      消费方分散在多处，但"值变化时所有消费者都刷新"这件事本身是合理语义
      （切主题时全站组件本来就该重渲染）。
反判据：值高频变化（每次键入、每次滚动、每帧动画）；
      value 是每次渲染新建的对象且消费组件很多（见第 2 条的陷阱）。

【第 4 步】Zustand（新项目默认）/ Redux Toolkit（存量项目、大团队规范）
判据：跨路由/跨页面共享；更新频率高且需要精确订阅（谁订阅的切片变了谁渲染）；
      需要在 React 组件外读写（axios 拦截器、工具函数里拿 token）；
      需要持久化、跨 tab 同步这类"容器"能力。
反判据：只有一两个消费者（Context 或提升就够了，外部 store 是杀鸡用牛刀）；
      状态本质是服务器缓存（该去 React Query）。
```

把每一步的判据与反判据整理成速查表：

| 方案 | 适用判据 | 反判据（出现即降级/升级） | 典型例子 |
|---|---|---|---|
| 组件内 state | 单组件或浅层父子使用 | 兄弟也要用 | 输入框草稿、弹窗开关 |
| 状态提升 | 同一子树共享、透传 ≤ 2 层 | 透传 ≥ 3 层、祖先逼近根组件 | 表单整体与提交按钮 |
| Context | 低频变化、全量刷新语义合理 | 高频变化、value 引用不稳定 | 主题、语言、当前用户 |
| Zustand/Redux | 高频、跨路由、组件外读写、精确订阅 | 消费者极少、实为服务器缓存 | 购物车、编辑器画布状态 |

**代码示例**：用同一个"商品筛选"需求走完这条升级路，体会每一步什么时候"该走了"。

```tsx
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
}

const products: Product[] = [
  { id: 'p1', name: '机械键盘', category: '外设' },
  { id: 'p2', name: '显示器', category: '外设' },
  { id: 'p3', name: '咖啡豆', category: '食品' },
];

// 【第 1 步】筛选词只有 FilterPanel 自己用 → 就地 useState，到此为止
function FilterPanel({ onFilter }: { onFilter: (keyword: string) => void }) {
  const [draft, setDraft] = useState(''); // 输入草稿：只有本组件关心
  return (
    <div>
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          onFilter(e.target.value); // 提交给父级的是"筛选生效值"
        }}
      />
    </div>
  );
}

// 【第 2 步】FilterPanel 与 ProductList 是兄弟 → 提升到最近公共祖先 ProductsPage
function ProductList({ keyword }: { keyword: string }) {
  const visible = products.filter((p) => p.name.includes(keyword));
  return (
    <ul>
      {visible.map((p) => (
        <li key={p.id}>{p.name}（{p.category}）</li>
      ))}
    </ul>
  );
}

export function ProductsPage() {
  const [keyword, setKeyword] = useState(''); // 住在兄弟俩的公共父级，透传只有 1 层
  return (
    <section>
      <FilterPanel onFilter={setKeyword} />
      <ProductList keyword={keyword} />
    </section>
  );
}

// 【第 3 步的临界点】当"订单页"也要读这份 keyword、公共祖先变成 App 根组件、
// 且中间隔了 Layout/Sidebar 等不关心筛选的组件时 —— 提升/wiki props drilling 到头了。
// 此时若 keyword 是低频的页面级配置可考虑 Context；
// 若像"购物车"那样高频变更且多处精确订阅 → 第 4 步，Zustand（见第 3 条）。
```

**常见坑**：
- 症状：项目里建了一个"全局大 store"，连某个弹窗的开关都放进去了。
  根因：跳过决策树前三步，把"全局"当默认选项；没有先问作用域。
  修法：逐条盘点 store 里的字段，凡是只有一棵子树使用的就下放回组件/祖先（参考阶段 2 "状态放哪"）。
- 症状：用 Context 传"当前输入值"，每敲一个字全页重渲染。
  根因：Context 的更新语义是"所有消费者无差别刷新"，与高频变化天然冲突。
  修法：状态下放到真正消费它的子树；确需全局高频共享则换 Zustand 精确订阅。

---

### 2. Context 的性能陷阱（value 引用变化导致全量重渲染）与拆分方案

**是什么**：Context 的更新机制不是"谁用了哪个字段谁刷新"，而是——Provider 的 `value` 身份变化（`Object.is` 比较）时，**所有调用了 `useContext` 的组件全部重渲染**，哪怕它只用了一个没变的字段；同时这次重渲染**不经过 `React.memo` 的拦截**（memo 只能拦 props 驱动的重渲染，context 驱动的更新直接穿透）。

**为什么需要先懂机制**：因为陷阱几乎必现——只要 Provider 所在组件自己还有别的 state，每次渲染都会重新执行 `value={ { ... } }` 这个对象字面量，产生一个**全新的对象引用**，于是"Provider 侧无关的重渲染"也会广播给全部消费者。你看到的症状是：改了个八竿子打不着的计数器，主题相关组件全亮了。

**怎么做（机制分步）**：
1. Provider 组件因任何 state 变化而重渲染；
2. JSX 里的 `value={{ theme, toggle }}` 是普通对象字面量，**每次渲染都新建**；
3. React 用 `Object.is(新 value, 旧 value)` 判断是否通知，对象字面量永远不相等 → 判定"变了"；
4. 所有 `useContext(ThemeContext)` 的组件被调度重渲染，与它们各自是否 `memo`、是否用了变化的字段**无关**。

**代码示例（复现）**：

```tsx
import { createContext, useContext, useRef, useState } from 'react';

interface ThemeValue {
  theme: 'light' | 'dark';
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

// 渲染计数器：用最直白的方式把"重渲染"变成肉眼可见的日志
function useRenderCount(label: string): number {
  const ref = useRef(0);
  ref.current += 1; // ref 改变不触发渲染，只做计数
  console.log(`[${label}] 第 ${ref.current} 次渲染`);
  return ref.current;
}

function Navbar() {
  const ctx = useContext(ThemeContext)!;
  const count = useRenderCount('Navbar');
  return (
    <header>
      Navbar（渲染 {count} 次）当前主题：{ctx.theme}
    </header>
  );
}

function Sidebar() {
  const ctx = useContext(ThemeContext)!; // 只用了 theme，没用到 toggle
  const count = useRenderCount('Sidebar');
  return <aside>Sidebar（渲染 {count} 次）主题：{ctx.theme}</aside>;
}

function Footer() {
  const ctx = useContext(ThemeContext)!;
  const count = useRenderCount('Footer');
  return <footer>Footer（渲染 {count} 次）主题：{ctx.theme}</footer>;
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [unrelated, setUnrelated] = useState(0); // 关键道具：与主题毫无关系的计数器

  // ❌ 陷阱核心：对象字面量写在 JSX 里，App 每次渲染 value 都是新引用
  const value: ThemeValue = {
    theme,
    toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
  };

  return (
    <ThemeContext.Provider value={value}>
      <button onClick={() => setUnrelated((n) => n + 1)}>
        无关计数器：{unrelated}
      </button>
      <Navbar />
      <Sidebar />
      <Footer />
    </ThemeContext.Provider>
  );
}
```

运行后点"无关计数器"：`theme` 一字未动，控制台里 Navbar/Sidebar/Footer 的渲染计数照样 +1。**Profiler 证据**（React DevTools Profiler，操作见阶段 6 第 1 条）：录制一次点击，commit 火焰图里三个消费组件全部变色；选中 Navbar，右侧 "Why did this render?" 面板给出的原因是 **"The context value changed"**——这就是 value 引用变化全量广播的直接证据（若是 props 连带，原因会显示 "Its parent component rendered"）。

**怎么做（拆分方案，三选一或组合）**：

**方案 A：state 与 dispatch 分成两个 Context**。原理：`useState` 返回的 setter 引用在组件生命周期内**永远稳定**，把"会变的部分"（theme）和"不变的部分"（toggle）拆开后，dispatch Context 的 value 永不触发更新；只读 dispatch 的组件彻底免疫。

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

// 拆成两个 context：一个装"会变的值"，一个装"稳定的操作"
const ThemeStateContext = createContext<'light' | 'dark'>('light');
const ThemeDispatchContext = createContext<() => void>(() => {});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light')); // setState 的函数式更新保证不依赖闭包里的旧值

  return (
    <ThemeStateContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={toggle}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeStateContext.Provider>
  );
}

// 配套自定义 Hook：把"判空 + 断言"集中在一处，消费方写起来干净
export function useThemeState() {
  return useContext(ThemeStateContext); // 基本类型值：Object.is 比较内容，theme 不变就不广播
}
export function useThemeDispatch() {
  return useContext(ThemeDispatchContext); // 只取 toggle 的组件：value 稳定，永不因主题切换重渲染
}
```

代价：Context 数量翻倍；读取"值 + 操作"的组件要调两个 Hook；文件里多了样板。

**方案 B：children 提前（状态住进 Provider 内部）**。原理：`children` 是**在 Provider 的父组件渲染时**就创建好的 element 对象，引用固定；Provider 自己因内部 state 重渲染时，`children` prop 引用不变，React 对"相同引用的 element"直接复用上一次的渲染结果（跳过整棵子树的协调）。于是 Provider 内部 state 变化只重渲染 Provider 自身这层薄壳，再单独广播给真正 `useContext` 的组件——中间那大片子树纹丝不动。这也正是阶段 3 "组合优于配置"的同一原理。

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

const ThemeContext = createContext<{ theme: 'light' | 'dark'; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 状态住在 Provider 组件内部（而不是 App 根组件）：
  // 切主题只重渲染 ThemeProvider 这一薄层；children 是父级 JSX 传进来的同一引用，子树直接跳过
  const value = useMemo(
    () => ({ theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme] // useMemo 保证 theme 不变时 value 引用稳定，堵住"无关渲染触发广播"的口子
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext)!;
```

```tsx
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeButton() {
  const { theme, toggle } = useTheme(); // 真正的消费者：主题变了照常重渲染
  return <button onClick={toggle}>当前 {theme}，点击切换</button>;
}

export function App() {
  return (
    <ThemeProvider>
      <main>
        <h1>标题与正文不因主题切换重渲染</h1>
        <ThemeButton />
      </main>
    </ThemeProvider>
  );
}
```

代价：要求状态必须收敛到自制的 Provider 组件里；Provider 内一旦混入其他高频 state，`useMemo` 也救不了（依赖没变仍会复用，但如果依赖变了照样广播），所以一个 Provider 只管一件事。

**方案 C：memo 消费者**。原理：`React.memo` 让组件跳过 **props 驱动**的重渲染。它拦不住 context 更新（context 变化必须刷新，这是语义正确的），但能拦住"消费组件的父组件重渲染时把它连带下去"的那一半无谓渲染。

```tsx
import { memo, useContext } from 'react';
import { ThemeStateContext } from './ThemeProvider';

// memo 生效前提：传进来的 props 引用稳定（这里是基本类型，天然稳定）
const ThemeBadge = memo(function ThemeBadge({ size }: { size: number }) {
  const theme = useContext(ThemeStateContext);
  return <span className={`badge badge-${theme}`} style={{ fontSize: size }}>●</span>;
});
```

代价：只解决一半问题（props 连带），context 广播依旧全量；每个消费组件都要包一层，props 一旦不稳定（内联函数/对象）memo 立即失效。

三个方案的选择：**默认组合 A + B**（Provider 自制 + 值/操作分离），这是 react.dev 推崇的结构；C 作为局部补丁。若拆完仍嫌重——比如 value 高频变化（光标位置、滚动进度）——说明 Context 本身选型错了，回决策树第 4 步换外部 store。

**常见坑**：
- 症状：明明 `useMemo` 了 value，消费组件还是无缘无故重渲染。
  根因：`useMemo` 的依赖里有每次渲染都变的值（例如依赖了对象/数组 state 的引用，或依赖列表里混入了内联函数）。
  修法：检查依赖数组；让 value 只依赖真正影响它的最小集合；setter 类函数从依赖里拿掉（方案 A 直接把 dispatch 拆走）。
- 症状：value 是基本类型（`"dark"`），还是全量刷新。
  根因：刷新来自**props 连带**而不是 context——消费组件的父组件重渲染了。
  修法：这不是 Context 的锅；用 Profiler 的 "Why did this render?" 区分 "Context changed" 与 "parent rendered"，后者用阶段 6 第 2 条的四招处理。
- 症状：把受控输入的 value 放进全局 Context，表格页每敲一个字整页卡。
  根因：高频值 + 全量广播，双重命中反判据。
  修法：输入草稿下放到字段组件；提交后的"生效筛选值"进 URL（第 7 条）或 store（第 3 条）。

---

### 3. **Zustand**：store 设计、selector 精确订阅、persist 持久化、immer 中间件

**是什么**：一个约 1KB 的状态库。核心机制：状态放在组件树之外的普通对象里，组件通过 `useSyncExternalStore` 订阅 store 的**某个切片**——切片不变（`Object.is` 比较），组件不渲染。没有 Provider、没有 reducer 样板。

**为什么需要**：它一次性解决前面两条的痛点——比 Context 精确（订阅粒度到字段而非整个 value），比 Redux 轻（一个 `create` 函数出全套）。React 18+ 项目里它已是新项目默认的全局方案。本条用**一个购物车**贯穿四个知识点。

**怎么做（机制分步）**：
1. `create` 创建 store：一个带 `set`/`get` 的初始化函数返回"数据 + 操作"；
2. 组件里 `useCartStore(selector)` 订阅切片，selector 返回值不变则跳过渲染；
3. `persist` 中间件把 store（或其中一部分）自动同步到 localStorage；
4. `immer` 中间件让你在 `set` 里写"突变风格"代码，它负责转成不可变更新。

安装（v5 要求 React 18+）：

```bash
npm install zustand immer
```

**代码示例（第一步：create + store 设计）**。设计原则：一个领域一个 store（cart 一个、ui 一个），store 内"数据与操作同住"，操作全部用函数式更新避免闭包旧值：

```ts
// src/features/cart/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean; // 纯 UI 状态：购物车抽屉的开合
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  toggleDrawer: (open?: boolean) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    immer((set) => ({
      items: [],
      isDrawerOpen: false,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            existing.quantity += quantity; // immer 草稿上直接改，最终生成新的 items 数组
          } else {
            state.items.push({ ...item, quantity });
          }
        }),
      removeItem: (id) =>
        set((state) => {
          const index = state.items.findIndex((i) => i.id === id);
          if (index >= 0) state.items.splice(index, 1);
        }),
      setQuantity: (id, quantity) =>
        set((state) => {
          const hit = state.items.find((i) => i.id === id);
          if (hit) hit.quantity = Math.max(1, quantity); // immer 生效的前提：只改草稿、不返回值
        }),
      toggleDrawer: (open) =>
        set((state) => {
          state.isDrawerOpen = open ?? !state.isDrawerOpen;
        }),
      clear: () =>
        set((state) => {
          state.items = [];
        }),
    })),
    {
      name: 'app-cart',                                   // localStorage 的 key
      storage: createJSONStorage(() => localStorage),     // 也可换 sessionStorage
      version: 1,
      // partialize：只持久化 items。抽屉开合是瞬态 UI 状态，没资格进硬盘
      partialize: (state) => ({ items: state.items }),
    }
  )
);
```

三个工程细节：TypeScript 下同时用中间件必须写**柯里化形式** `create<CartState>()(...)`；中间件顺序 `persist(immer(...))` 表示"先让 immer 产出不可变新状态，再交给 persist 落盘"；`partialize` 防止 UI 瞬态（弹窗、悬停）污染持久化数据。

**第二步：selector 精确订阅**。

```tsx
import { useCartStore, type CartItem } from './store';
import { useShallow } from 'zustand/react/shallow';

function CartTotal() {
  // ✅ selector 返回基本类型：Object.is 比较，数字不变就不渲染——这是最理想的订阅
  const total = useCartStore(
    (s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  return <strong>合计：¥{total.toFixed(2)}</strong>;
}

function CartCount() {
  const count = useCartStore((s) => s.items.length); // 同上：基本类型，精确
  return <span>购物车（{count}）</span>;
}

function AddToCartButton({ product }: { product: Omit<CartItem, 'quantity'> }) {
  // 操作函数引用稳定（store 创建时就固定），订阅它永远不会引发渲染
  const addItem = useCartStore((s) => s.addItem);
  return <button onClick={() => addItem(product)}>加入购物车</button>;
}

function CartDebugList() {
  // ❌ 反面写法：selector 里返回新数组，引用每次都不同 → 每次任何字段变化都重渲染
  // const ids = useCartStore((s) => s.items.map((i) => i.id));
  // ✅ 要订阅"多个字段/由字段组成的新结构"时用 useShallow：浅比较结果内容而不是引用
  const ids = useCartStore(useShallow((s) => s.items.map((i) => i.id)));
  return <code>[{ids.join(', ')}]</code>;
}
```

`useShallow` 的机制：把 selector 的返回值与上次做**浅比较**（数组比每一项、对象比每个 key 的第一层），内容没变就不触发渲染。Zustand v5 默认就是 `Object.is`，没有旧版本的隐式浅比较——所以"selector 里 map/filter/拼对象"在 v5 必须显式包 `useShallow`（从 `zustand/react/shallow` 导入），否则等于订阅了整个 store 的所有变化。

**第三步：组件外读写 store**（Context 做不到的能力）：

```ts
import { useCartStore } from './store';

// 在 axios 拦截器、路由守卫、工具函数里直接读写，不需要任何 Hook 上下文
function reportCartOnExit() {
  const { items } = useCartStore.getState(); // 同步快照
  navigator.sendBeacon('/analytics/cart', JSON.stringify({ count: items.length }));
}

// 外部直接派发更新（同样走订阅广播，UI 会正常刷新）
function clearCartOnLogout() {
  useCartStore.getState().clear();
}

// 订阅变化（不渲染，只监听）：签名 (state, prevState)
useCartStore.subscribe((state, prev) => {
  if (state.items.length !== prev.items.length) {
    document.title = `购物车(${state.items.length})`;
  }
});
```

**第四步：persist 的水合与版本迁移**。刷新页面时 persist 会异步从 localStorage 恢复，首帧先渲染初始值再切换。SSR 或对首帧一致性敏感的场景，关掉自动水合、自己挑时机：

```tsx
import { useEffect } from 'react';
import { useCartStore } from './store';

export function useCartRehydrate() {
  useEffect(() => {
    // skipHydration: true 时 persist 不在启动时恢复，改由这里手动触发
    void useCartStore.persist.rehydrate();
  }, []);
}
```

```ts
// src/features/cart/persistOptions.ts —— 结构升级时的版本迁移配置
// 场景：v1 版本存的是 { cart: [...] }，v2 代码把字段改名成了 items
import type { CartItem } from './store';

export const cartPersistOptions = {
  name: 'app-cart',
  version: 2,
  migrate: (persisted: unknown, version: number) => {
    const old = persisted as { cart: CartItem[] } | undefined;
    if (version === 1 && old?.cart) {
      return { items: old.cart }; // 把 v1 数据搬进 v2 结构，用户刷新后购物车不丢
    }
    return undefined; // 无法识别的版本：放弃恢复，使用初始 state
  },
};

// 使用：create<CartState>()(persist(immer(...), cartPersistOptions))
// 机制：localStorage 里记录的版本号 < 配置的 version 时，persist 自动调用 migrate
```

**购物车收尾：把前面三块拼成一个抽屉组件**：

```tsx
import { useCartStore } from './store';

export function CartDrawer() {
  const items = useCartStore((s) => s.items);      // 订阅数组引用：immer 保证"没变就是同一个引用"
  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);
  const setQuantity = useCartStore((s) => s.setQuantity);

  if (!isOpen) return null;
  return (
    <div className="drawer">
      <button onClick={() => toggleDrawer(false)}>关闭</button>
      {items.map((item) => (
        <div key={item.id}>
          {item.name} ×
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => setQuantity(item.id, Number(e.target.value))}
          />
        </div>
      ))}
    </div>
  );
}
```

**常见坑**：
- 症状：组件"订阅了 total"却在 isDrawerOpen 变化时也重渲染。
  根因：selector 写成了 `(s) => s`（拿整个 store）或 selector 返回了每次新建的对象/数组。
  修法：selector 只取真正需要的最小切片；返回组合结构时包 `useShallow`。
- 症状：persist 恢复后一闪而过显示空购物车（或 SSR 水合警告）。
  根因：persist 默认异步水合，首帧是初始值。
  修法：`skipHydration: true` + 手动 `persist.rehydrate()`，并在水合完成前渲染骨架。
- 症状：忘了配 immer，却在 `set` 回调里 `state.items.push(...)`。
  根因：没有 immer 时这会**直接突变** store 的现有对象，订阅方拿到同一个引用，可能不触发渲染，还破坏了"不变性"假设。
  修法：要么加 immer 中间件（突变写法），要么老老实实展开（`set({ items: [...state.items, item] })`），两套风格不要混。
- 症状：同一个 store 塞了 cart + 用户 + 主题 + 全部弹窗，一个字段动全站订阅者都检查一遍。
  根因：store 领域划分过粗 + selector 退化成 `(s) => s`。
  修法：按领域拆 store（cartStore / uiStore / userStore），订阅永远落到字段级。

---

### 4. Redux Toolkit：slice、createAsyncThunk（旧项目维护必备）

**是什么**：Redux 的官方标准写法包。`configureStore` 一步配好 DevTools/中间件，`createSlice` 用"突变风格"写 reducer（内部 Immer 转不可变），`createAsyncThunk` 声明异步 action 并自动派发 pending/fulfilled/rejected 三部曲。

**为什么还要学**：新建项目你可以选 Zustand，但**存量项目大概率是 Redux/RTK**——据各类企业代码调查，Redux 系仍是存量占比最高的方案。读懂 slice、能顺着 `dispatch → thunk → extraReducers` 的链路改代码，是维护旧仓库的硬需求。另外大团队有时刻意选它：单一数据流、强约束、时间旅行调试、成熟的中间件生态（saga、listener）。

**怎么做（机制分步）**：完整走一遍"定义 slice → 异步 thunk → 接线 → 组件消费"：

```bash
npm install @reduxjs/toolkit react-redux
```

```ts
// src/store/productsSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  id: string;
  name: string;
  price: number;
}

interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// 模拟请求层（真实项目放在 src/api/products.ts）
async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error(`请求失败：${res.status}`);
  return res.json();
}

// 异步 thunk：第一个参数是 action 类型前缀，第二个是执行函数
export const loadProducts = createAsyncThunk(
  'products/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchProducts();
    } catch (err) {
      // rejectWithValue 让 rejected 分支拿到结构化错误，而不是只有 error.message
      return rejectWithValue(err instanceof Error ? err.message : '加载失败');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle', error: null } as ProductsState,
  reducers: {
    // 同步操作：Immer 让你写"突变"，实际生成新 state
    priceUpdated(state, action: PayloadAction<{ id: string; price: number }>) {
      const hit = state.items.find((p) => p.id === action.payload.id);
      if (hit) hit.price = action.payload.price;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // thunk resolve 的返回值在这里落地
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? action.error.message ?? '未知错误';
      });
  },
});

export const { priceUpdated } = productsSlice.actions;
export default productsSlice.reducer;
```

```ts
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import productsReducer from './productsSlice';

export const store = configureStore({
  reducer: { products: productsReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 官方推荐的类型化 Hook（react-redux 9.1+ 写法）：
// 旧版本等价写法是 TypedUseSelectorHook<RootState>
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```tsx
// src/main.tsx —— Provider 接线
import { Provider } from 'react-redux';
import { store } from './store';
import { App } from './App';

export default function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
```

```tsx
// src/features/products/ProductList.tsx —— 组件消费
import { useEffect } from 'react';
import { loadProducts } from './store/productsSlice';
import { useAppDispatch, useAppSelector } from './store';

export function ProductList() {
  const dispatch = useAppDispatch();
  // useSelector 天然是"精确订阅"：只选 status 与 items，别的 slice 变化不渲染本组件
  const status = useAppSelector((s) => s.products.status);
  const items = useAppSelector((s) => s.products.items);
  const error = useAppSelector((s) => s.products.error);

  useEffect(() => {
    if (status === 'idle') void dispatch(loadProducts()); // 惰性加载：仅首次触发
  }, [status, dispatch]);

  if (status === 'loading') return <p>加载中…</p>;
  if (status === 'failed') return <p>出错了：{error}</p>;
  return (
    <ul>
      {items.map((p) => (
        <li key={p.id}>{p.name} - ¥{p.price}</li>
      ))}
    </ul>
  );
}
```

**什么场景仍会遇见它**：接手存量中后台（大概率 RTK 或更老的 `connect` 写法）；团队已有 Redux 规范与 DevTools 调试流程；需要 saga 级别的复杂副作用编排；用 RTK Query 做缓存（RTK 家族的服务器状态方案，与 React Query 同类）。新项目评估时，"Zustand + React Query"组合的样板量显著更低，RTK 的不可替代性主要剩存量与团队约束。

**常见坑**：
- 症状：控制台刷屏 `A non-serializable value was detected in the state`。
  根因：往 state 里塞了函数、Promise、Date、Class 实例（Redux 要求 state 可序列化，时间旅行/持久化才成立）。
  修法：state 只放纯数据（时间戳用 number）；确有不可序列化需求时在 `configureStore({ serializableCheck: false })` 局部关闭并写注释说明。
- 症状：reducer 里既修改 `state.xxx` 又 `return {...state, ...}`，结果 state 诡异错乱。
  根因：Immer 规则二选一——**要么全程突变草稿不返回，要么返回全新对象不突变**；混用会得到不可预期结果。
  修法：统一风格，createSlice 内推荐全程突变写法。
- 症状：thunk 的组件里拿不到最新 dispatch 结果。
  根因：`dispatch(loadProducts())` 返回的 promise 未 await；或 fulfilled 后又立刻读了缓存旧值的闭包。
  修法：`await dispatch(loadProducts()).unwrap()`（unwrap 会把 fulfilled 的 payload / rejected 的错误抛出来）。

---

### 5. Jotai 原子化状态（细粒场景）

**是什么**：与"store 树"相反的自底向上模型——状态被拆成一个个**原子（atom）**，每个 atom 是独立的最小状态单元；组件订阅的是 atom 而不是 store；派生 atom 声明自己对其他 atom 的依赖，依赖图自动追踪。

**为什么需要**：Zustand 是"一棵树，向下查询"（top-down），Jotai 是"一张图，按需组合"（bottom-up）。当状态之间**依赖关系复杂但彼此独立**时——典型如表单字段级联动——Jotai 的粒度天然合身，而且 atom 可以只在组件树某个 `<Provider>` 作用域内存在（局部状态也能享受原子模型）。

**怎么做（机制分步）+ 最小示例**：
1. `atom(初始值)` 定义可写原子；
2. `atom((get) => ...)` 定义只读派生原子——依赖谁就 `get` 谁，依赖变化自动重算；
3. `atom(null, (get, set, ...args) => ...)` 定义可写派生原子——把一组原子更新封装成一个动作；
4. 组件用 `useAtom`（读+写）、`useAtomValue`（只读）、`useSetAtom`（只写）消费。

```tsx
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// ① 基础原子：状态的最小单元
const quantityAtom = atom(1);
const unitPriceAtom = atom(99);

// ② 只读派生原子：声明依赖，自动追踪，quantity 变了只有订阅它的组件更新
const subtotalAtom = atom((get) => get(quantityAtom) * get(unitPriceAtom));

// ③ 可写派生原子：把"一组原子更新"封装成一个语义动作
const addToCartAtom = atom(null, (get, set, step: number) => {
  set(quantityAtom, get(quantityAtom) + step);
});

function QuantityStepper() {
  const [quantity, setQuantity] = useAtom(quantityAtom); // 只有这里因 quantity 重渲染
  return (
    <>
      <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
      <span>{quantity}</span>
      <button onClick={() => setQuantity((q) => q + 1)}>+</button>
    </>
  );
}

function Subtotal() {
  const subtotal = useAtomValue(subtotalAtom); // 派生值：依赖变化才渲染
  return <strong>小计：¥{subtotal}</strong>;
}

function QuickAddButton() {
  const addToCart = useSetAtom(addToCartAtom); // 只写不读：永不因任何状态变化重渲染
  return <button onClick={() => addToCart(5)}>一次加 5 件</button>;
}
```

**与 Zustand 互补的场景**：
- 选 Jotai：表单字段级状态与联动（每个字段一个 atom，联动用派生 atom，改 A 只有依赖 A 的渲染）；组件树局部作用域状态（Provider 包住局部，不同实例互不干扰）；依赖关系是图不是树。
- 选 Zustand：领域级聚合状态（购物车、播放器、画布）——一棵结构化 store + 少量 action 更直观；需要组件外 `getState()` 读写；需要 persist/immer 这类中间件生态。
- 实战完全可以共存：领域用 Zustand，页面内细粒度联动用 Jotai。

**常见坑**：
- 症状：atom 定义写在组件函数体里，状态每渲染必丢。
  根因：atom 的**身份（引用）就是订阅键**，组件内每次渲染 `atom(0)` 都造了个"新原子"，等于每次重新开始。
  修法：atom 提到模块顶层；按 key 参数化时用工厂函数 + 稳定的调用位置（如 `useMemo(() => makeAtom(id), [id])` 或集中注册）。

---

### 6. **客户端状态 vs 服务器状态分离**：React Query 管服务器状态，状态库只管 UI 状态

**是什么**：把状态分成两类治理——**服务器状态**（来自接口、本质是"服务端数据的本地缓存"：列表、详情、用户信息）与**客户端状态**（只存在于浏览器：主题、购物车草稿、弹窗开关、向导步骤）。前者交给 React Query 这类缓存库，后者才轮到 Zustand/Context。

**为什么需要**：服务器状态有一堆"客户端状态没有"的天然属性——会过期要重新验证、同一数据多处引用要去重、写操作后要失效重取、要重试要缓存分页。把这些塞进 Redux 的结果是每个接口手写一遍 loading/error/success/缓存键/失效 的样板，这正是"Redux 项目 action 文件爆炸"的根源。分离之后，状态库的职责收缩到纯 UI 状态，代码量骤降、语义清晰。

**怎么做（机制分步）**：
1. 请求层（api/）只管"怎么发请求"；
2. `queryKey` 声明"这份缓存对应什么数据"（含参数），缓存、去重、后台刷新由 React Query 接管；
3. 变更走 `useMutation`，成功后 `invalidateQueries` 让相关缓存自动重取；
4. Zustand store 里只留 UI 状态，凡是"接口数据的副本"一律删除。

**分层目录结构示例**：

```text
src/
├── api/                        # 纯请求层：不含任何 React/状态代码
│   ├── http.ts                 # fetch 封装（baseURL、错误归一化）
│   └── products.ts             # 资源级请求函数：listProducts / createProduct
├── features/
│   ├── products/
│   │   ├── queries.ts          # 服务器状态：React Query 的 query/mutation 定义
│   │   ├── store.ts            # 客户端状态：该领域的 UI 状态（zustand）
│   │   ├── components/         # 展示组件：只消费 hooks，不关心数据从哪来
│   │   └── ProductsPage.tsx
│   └── cart/
│       ├── store.ts            # 购物车（客户端状态）—— 用户本地草稿
│       └── CartDrawer.tsx
├── shared/
│   ├── theme/                  # 主题（低频客户端状态，用 Context 即可）
│   └── hooks/
└── main.tsx                    # QueryClientProvider + 路由挂载
```

**代码示例（两侧各一层）**：

```tsx
// src/features/products/queries.ts —— 服务器状态全部住这里
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProducts, createProduct, type ProductInput } from '../../api/products';

export function useProducts(keyword: string) {
  return useQuery({
    // queryKey 含参数：不同关键词是不同缓存；切回旧关键词时命中缓存秒开
    queryKey: ['products', { keyword }],
    queryFn: () => listProducts(keyword),
    staleTime: 30_000, // 30 秒内视为新鲜，不长蹭请求
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      // 写后失效：所有 ['products', ...] 缓存标记过期，正在挂载的列表自动重取
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

```ts
// src/features/cart/store.ts —— 客户端状态：购物车在本地怎么改就怎么存
import { create } from 'zustand';

interface CartUiState {
  selectedIds: string[];      // 本地勾选
  isCheckoutOpen: boolean;    // 结算弹窗
  toggleSelected: (id: string) => void;
  setCheckoutOpen: (open: boolean) => void;
}

export const useCartUiStore = create<CartUiState>()((set) => ({
  selectedIds: [],
  isCheckoutOpen: false,
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  setCheckoutOpen: (open) => set({ isCheckoutOpen: open }),
}));
```

```tsx
// src/features/products/ProductsPage.tsx —— 组合两侧
import { useState } from 'react';
import { useProducts, useCreateProduct } from './queries';

export function ProductsPage() {
  const [keyword, setKeyword] = useState('');
  const { data, isPending, isError, error } = useProducts(keyword);
  const createProduct = useCreateProduct();

  if (isPending) return <p>加载中…</p>;
  if (isError) return <p>加载失败：{error.message}</p>;

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索" />
      <button onClick={() => createProduct.mutate({ name: '新商品', price: 10 })}>新增</button>
      <ul>
        {data.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

注意组件里已经**没有一行** loading state 管理、缓存判断、竞态处理——`isPending/isError` 是 React Query 给的，切换关键词的竞态由 queryKey 的缓存模型天然解决（每个 key 的请求各自归属，不会互相覆盖）。对照阶段 4.2 手写 `useFetch` 的完整链路，能直观看到职责迁移了多少。

**常见坑**：
- 症状：把 query 的 `data` 又 `useEffect` 同步进 Zustand，两份数据打架（展示旧值、刷新不齐）。
  根因：把"单一状态容器"的旧习惯带到了缓存模型上；缓存 + 副本 = 双写不一致。
  修法：服务器数据只存在 query 缓存里，需要转换就在派生层做（`useMemo`/`select` 选项）；UI 状态只存"用户在本地的动作"。
- 症状：所有查询 `staleTime: 0`、`refetchOnWindowFocus` 全开，接口量爆炸。
  根因：没按业务为不同资源设置新鲜度。
  修法：在 `QueryClient` 默认值 + 个别 query 覆盖，两级配置。

---

### 7. URL 也是状态：筛选/分页/Tab 放查询参数，可分享可回退

**是什么**：把"能描述当前视图的状态"写进查询参数（`?tab=done&page=3&keyword=react`），URL 本身就是持久化介质、分享介质与历史记录介质。

**为什么需要**：放进组件 state 的筛选条件有三个天然缺陷——刷新丢失、没法把"第 3 页 + 已完成 + 关键词 react"这个视图发给同事、浏览器后退键行为错误（后退的是页面而不是筛选）。URL 是浏览器免费送你的状态容器。

**三个判据**（满足任意一条就该考虑放 URL）：
1. **可分享**：用户可能把这个视图发给别人的（筛选结果、报表条件、详情定位）；
2. **可回退**：用户期望浏览器后退能撤销的（关闭筛选弹窗、Tab 切换）；
3. **刷新保持**：用户按 F5 期望还在原地的（分页、搜索词、排序）。

反之，不该进 URL 的：敏感信息（token）、高频中间态（输入框每一个字符——可以只提交防抖后的"生效值"）、纯视觉瞬态（动画进度）。

**怎么做（机制分步）+ 实现模式**：
1. 读：`useSearchParams().get(key)` 拿到字符串，做类型转换与默认值兜底；
2. 写：`setSearchParams(updater)`，**在旧参数基础上合并**（updater 收到当前实例），避免清掉兄弟参数；
3. `replace: true` 避免每次键入都塞一条历史记录（筛选类用 replace，翻页/切 Tab 可留历史）。

```tsx
// src/shared/hooks/useQueryParam.ts —— 单参数读写 Hook：类型转换 + 合并写入
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useStringParam(key: string, defaultValue: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue; // 缺参时兜底，组件永远拿到有效值

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev); // 关键：基于当前参数复制，保留兄弟参数
          if (next === defaultValue) {
            params.delete(key); // 等于默认值就删掉，保持 URL 干净
          } else {
            params.set(key, next);
          }
          return params;
        },
        { replace: true } // 筛选输入用 replace：不往历史里塞垃圾
      );
    },
    [key, defaultValue, setSearchParams]
  );

  return [value, setValue] as const;
}

// 数字参数（分页）在字符串 Hook 上薄薄包一层转换
export function useNumberParam(key: string, defaultValue: number) {
  const [raw, setRaw] = useStringParam(key, String(defaultValue));
  const parsed = Number.parseInt(raw, 10);
  const value = Number.isNaN(parsed) ? defaultValue : parsed;
  return [value, (next: number) => setRaw(String(next))] as const;
}
```

```tsx
// src/features/products/ProductsView.tsx —— 筛选 + Tab + 分页 全部状态化到 URL
import { useStringParam, useNumberParam } from '../../shared/hooks/useQueryParam';
import { useProducts } from './queries';

export function ProductsView() {
  const [tab, setTab] = useStringParam('tab', 'all');           // ?tab=done
  const [page, setPage] = useNumberParam('page', 1);             // ?page=3
  const [keyword, setKeyword] = useStringParam('keyword', '');   // ?keyword=react

  // 服务器状态部分与 URL 自然衔接：URL 变化 → queryKey 变化 → 自动请求对应数据
  const { data, isPending } = useProducts(`${tab}:${keyword}`);

  return (
    <div>
      <div role="tablist">
        {(['all', 'todo', 'done'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)} // 每次键入即写 URL（replace 模式不污染历史）
        placeholder="搜索"
      />
      {isPending ? <p>加载中…</p> : (
        <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      )}
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
      <span>第 {page} 页</span>
      <button onClick={() => setPage(page + 1)}>下一页</button>
    </div>
  );
}
```

现在这个页面：把地址栏复制给同事能还原一模一样的视图；F5 不丢；后退键撤销上一次 Tab 切换。这正是阶段 4.3"分页（页码 + 查询参数同步到 URL）"与"搜索 + 筛选 + 排序组合（条件放 URL）"两节的通用实现模式。

**常见坑**：
- 症状：设置 keyword 后 page（或其他参数）神秘消失。
  根因：`setSearchParams({ keyword: next })` 传对象是**整体替换**，兄弟参数被清空。
  修法：永远用 updater 形式 `setSearchParams(prev => ...)` 在旧参数上合并（见上方 Hook）。
- 症状：URL 又长又脏，充满 `a=1&b=2&tab=all&page=1` 这类默认值。
  根因：默认值也序列化进去了。
  修法：等于默认值时 `delete` 参数（见 Hook 里的分支）；组件侧永远读"兜底后的值"而不是假设参数存在。
- 症状：受控输入直接绑 URL，每敲一个字符发起一次请求。
  根因：URL 变化立刻传导到 queryKey。
  修法：输入草稿留组件内，防抖后的"生效值"再写 URL（阶段 2 的 `useDebounce` 在这里接上）；或用 `useTransition` 让列表更新降级（阶段 6 第 5 条）。

---

### ✅ 产出：把阶段 4 的项目重构出 Zustand + React Query 分层。

**作业说明**：这不是"再写一个新项目"，而是给阶段 4 的后台管理系统做一次状态治理手术。按以下四步交付。

**第一步：状态盘点（先诊断，后动刀）**。建一张 `state-inventory.md`，把项目里所有 state/useContext/store 字段逐条填表：

| 状态名 | 当前住所 | 读方（谁用） | 写方（谁改） | 变化频率 | 是服务器数据副本？ | 能进 URL？ | 目标住所 |
|---|---|---|---|---|---|---|---|
| 商品列表 items | `useProducts` 组件 state | 表格、统计卡 | 请求回调 | 中 | ✅ | ❌ | React Query |
| 分页 page | 组件 state | 列表 | 翻页按钮 | 低 | ❌ | ✅（可分享可回退） | URL |
| 编辑弹窗开关 | App 根 state | Modal | 按钮 | 低 | ❌ | ❌ | 下放至列表组件 |
| 主题 theme | Context | 全站 | 设置页 | 极低 | ❌ | ❌ | 保留 Context（拆值/操作） |
| 购物车草稿 | — | 抽屉、结算 | 用户操作 | 高 | ❌ | ❌ | Zustand（persist 只存 items） |

填表规则：第 6 列为 ✅ 的一律去 React Query；第 7 列为 ✅ 的一律去 URL；两者都 ❌ 再走阶段 5 第 1 条的决策树决定"组件内 / 提升 / Context / Zustand"。

**第二步：分层落地**。
1. 抽 `src/api/`：把散在组件里的 fetch 收敛成资源函数（纯 TS，无 React）；
2. 每个领域建 `queries.ts`（`useQuery`/`useMutation` + `queryKey` 约定）与 `store.ts`（Zustand UI 状态），目录结构对照第 6 条的分层示例；
3. 删除组件里所有手写的 loading/error/竞态处理代码（那是 React Query 的活）；删除所有"接口数据的本地副本" state；
4. 筛选、分页、Tab 迁入 URL（用第 7 条的 `useStringParam`/`useNumberParam`）；
5. Context 只保留主题/语言这类低频值，并按第 2 条的方案 A+B 拆分。

**第三步：验收清单**（逐项打勾）：
- [ ] 所有原有交互行为不变（登录、增删改查、权限、主题切换回归一遍）；
- [ ] Network 面板：相同操作序列下请求数**不增**（缓存生效，重复进入页面不重请求）；
- [ ] React DevTools 高亮渲染：修改"编辑弹窗开关"后只有弹窗相关组件渲染，页面其他部分不变色；
- [ ] 刷新页面：列表页的分页与筛选从 URL 还原；购物车从 localStorage 还原；
- [ ] `state-inventory.md` 里没有一条的"目标住所"是空的。

**第四步：复盘**。回答三个问题写进笔记：重构前哪个状态放得最离谱、症状是什么？React Query 接管后删掉了多少行手写异步代码（git diff 统计）？还有哪些状态你在"Zustand 还是 Context"之间犹豫过，最终依据决策树哪条判据定的？

---

## 阶段 6：性能优化与调试（1 周）

> 优化的第一原则是**测量先行**：没有 Profiler 数据之前，任何"我觉得这里卡"都只是猜测，而 React 性能问题的直觉命中率低得惊人——真正的热点经常不在你看着的那个组件里。本阶段前半是"测量 → 减少渲染 → 减少代码量 → 降低优先级"的完整优化工具箱，后半是把五种高频 bug 变成"条件反射式排查"的调试方法论。

### 优化

#### 1. 测量先行：React DevTools Profiler 录制火焰图、Performance 面板

**是什么**：React DevTools 的 Profiler 面板录制"每次提交（commit）里哪些组件渲染了、各花多久、为什么渲染"；浏览器 Performance 面板则录制整页的脚本/渲染/布局耗时，看 React 之外的开销。

**为什么需要**：两个反直觉事实决定了不能凭感觉优化。其一，React 的重渲染经常来自"父组件连坐"而非自身状态变化，肉眼盯着目标组件看不出真凶；其二，`useMemo`/`memo` 用在不该用的地方反而更慢（比较本身也有成本）。Profiler 的 "Why did this render?" 直接给出每次渲染的原因，把猜谜变成查证。

**怎么做（机制分步）——Profiler 录制操作步骤**：
1. 安装 React Developer Tools 浏览器扩展（Chrome/Edge/Firefox 应用商店），地址栏出现 React 图标即成功；
2. 打开你的应用（必须是 development 模式的构建，扩展在 production 构建里拿不到组件名），F12 打开 DevTools，会多出 **Components** 与 **Profiler** 两个标签页；
3. 进入 Profiler 面板，点右上角齿轮，勾选 **"Record why each component rendered"**（React 18+ 支持）——这是读图的关键开关，不开的话后面看不到渲染原因；
4. 点左上角的圆点按钮开始录制；
5. 在页面上做**一个最小操作**：只敲一个字符、只点一次按钮。一次录制只含一个动作，结论才干净；
6. 再次点击按钮停止录制，得到一帧帧 commit 记录。

**读图方法**：
- **顶部 commit 柱状图**：每根柱 = 一次提交。一个按键引发 3 根柱，说明这次交互触发了 3 轮渲染（常见于 effect 链式 setState，本身就是可疑信号）。柱越高这次提交越贵，用左右方向键在 commits 间切换；
- **火焰图（Flame graph）**：横条宽度 = 该组件**含子树**的渲染耗时，颜色越黄越贵，灰色 = 本次 commit 没渲染。自上而下是组件嵌套关系，一眼看出"时间花在哪一坨"；
- **排名图（Ranked chart）**：把组件按"自身渲染耗时"（不含子树）降序排列，找最贵组件用它最快；
- **选中某个组件**：右侧面板显示 **Why did this render?**，可能的原因有——`Its parent component rendered`（父连坐）、`Props changed: xxx`（props 变了，可展开看哪个 prop）、`State changed`、`Context changed`（context 广播）、`Hooks changed`、`The initial render`。**这一个面板就是优化路径的岔路口**：parent rendered → 去用第 2 条四招；props changed → 查那个 prop 的引用稳定性；context changed → 回阶段 5 第 2 条拆分；
- **Committed 耗时**：组件详情里 "Render duration" 是自身渲染耗时，配合火焰图区分"是自己慢"还是"子树慢"。宽而浅 = 你只是被连坐，真凶在下面；窄而深、最深处发黄 = 那个叶子才是热点；
- **Components 面板的 "Highlight updates when components render."**：勾选后回到页面操作，重渲染的组件会闪色边框——渲染**范围**的可视化，比耗时更适合回答"是不是整页都在跟着动"；
- **保存/载入 profile**：Profiler 支持 Save profile 导出，复查优化时把"优化前"的录制存档，改完代码再录一次对照（产出作业会用到）。

**Performance 面板**（看 React 之外的部分）：录制时勾选 CPU 降速（4x/6x）模拟弱设备；录制后看主线程时间轴里的长任务（Long Task，>50ms 红标），底部 Summary 区分 Scripting（JS/React 渲染）/ Rendering（布局计算）/ Painting（绘制）各占多少——如果 Scripting 只占 20% 而 Painting 占 70%，你该优化的可能是阴影/滤镜这类样式，加再多 memo 也白搭。

**常见坑**：
- 症状：开发模式录出来 8ms 的组件，线上只有 1ms（或反过来数字完全对不上）。
  根因：dev 构建含额外校验与开发警告，StrictMode 还会故意双调用渲染（本意就是帮你暴露副作用）。
  修法：Profiler 用于定位**相对热点与渲染原因**（这些在 dev 下依然成立）；绝对耗时结论用 `npm run build && npm run preview` 的生产构建复测，必要时换 `react-dom/profiling` 构建。

---

#### 2. 减少渲染范围：`memo`、组件拆分、状态下放、children 作为 props 传入

**是什么**：React 默认规则是"父组件渲染 → 所有子组件跟着渲染"（不管 props 变没变）。减少渲染范围就是用四种手段把这条"连坐"链剪断：`memo` 拦 props 未变的更新、拆分隔离变化源、下放缩小状态作用域、children 让中间层"碰不到"内容。

**为什么需要**（先记住这条心智模型）：渲染本身是递归的——`App` 渲染会带着整棵默认子树重新执行函数。四种招式分别在链条的不同位置剪断它：memo 剪在"子组件入口"，拆分/下放剪在"变化源头"，children 剪在"中间层"。

**招式一：`memo`**。原理：用浅比较包住子组件，父组件重渲染时若 props 逐项相等（`Object.is`），子组件直接复用上一次结果。

```tsx
import { memo, useMemo, useState } from 'react';

interface Row {
  id: string;
  name: string;
  price: number;
}

const rows: Row[] = [
  { id: 'r1', name: '键盘', price: 399 },
  { id: 'r2', name: '鼠标', price: 199 },
  { id: 'r3', name: '显示器', price: 1899 },
];

// 行组件的 props 全是基本类型 → memo 的浅比较天然有效
const PriceRow = memo(function PriceRow({ name, price }: { name: string; price: number }) {
  console.log('[PriceRow] render', name);
  return (
    <tr>
      <td>{name}</td>
      <td>{price.toFixed(2)}</td>
    </tr>
  );
});

export function PriceTable() {
  const [keyword, setKeyword] = useState('');
  const visible = useMemo(
    () => rows.filter((r) => r.name.includes(keyword)),
    [keyword]
  );
  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <table>
        <tbody>
          {visible.map((r) => (
            <PriceRow key={r.id} name={r.name} price={r.price} />
          ))}
        </tbody>
      </table>
    </>
  );
}
```

输入"鼠"：表格重渲染，但"键盘""显示器"两行**没有**打印日志——props 没变，memo 拦下了。生效前提务必记牢：**props 引用必须稳定**。一旦给 memo 组件传内联函数/对象（`onChange={(e) => ...}` 或 `style={{...}}`），浅比较永远失败，memo 形同虚设，此时要么 `useCallback`/`useMemo` 固定引用，要么传稳定的标识（`id`）让子组件内部自派发。

**招式二：组件拆分**。原理：把"高频变化的部分"隔离成小组件，让变化引起的渲染停止在小组件内部，不再波及周围。

```tsx
import { useEffect, useState } from 'react';

// 拆出去的"会动的部分"：每秒一跳，但只重渲染自己这几个标签
function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id); // 卸载时收干净（阶段 2 清理函数）
  }, []);
  return <span className="clock">{new Date(now).toLocaleTimeString()}</span>;
}

export function Header() {
  // 反面：如果 now 这个 state 放在 Header 里，标题、导航、用户头像全被每秒连坐一次
  return (
    <header>
      <h1>我的后台</h1>
      <nav>…导航…</nav>
      <Clock /> {/* 变化被隔离在这个叶子组件里 */}
    </header>
  );
}
```

**招式三：状态下放**。原理：状态放得离消费者越近，渲染波及面越小（回指阶段 2 第 5 条"状态放哪"、阶段 3"状态提升 vs 下放"）。典型错案：把"密码可见切换"放在 App 里。

```tsx
import { useState } from 'react';

// ✅ 正确：这个布尔只有输入框自己关心 → 住在输入框组件内部
function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      密码：
      <input type={visible ? 'text' : 'password'} />
      <button type="button" onClick={() => setVisible((v) => !v)}>
        {visible ? '隐藏' : '显示'}
      </button>
    </label>
  );
}

export function SettingsPage() {
  return (
    <form>
      {/* 若 visible 放在 SettingsPage：每切一次，整个表单所有字段全部重渲染 */}
      <PasswordField />
    </form>
  );
}
```

判断口诀：**只有一棵子树消费的状态，就住进那棵子树**。

**招式四：children 作为 props 传入（"内容不受控"技巧）**。这一招必须讲透原理，因为它看起来违反"父渲染带动子渲染"的直觉。

先建立两个事实：
1. `<Parent><Child/></Parent>` 里的 `<Child/>` 不是"子组件的化身"，而是 **Parent 渲染时创建的一个普通对象（React element）**，`children` 是 Parent 上的一个普通 prop；
2. React 协调时发现某个位置上的 element **与上次引用相同**（`===`），会直接跳过这棵子树的重新渲染（bailout）——引用相同意味着输出必然相同，再渲染纯属浪费。

于是推论：**中间组件自己重渲染时，它无权重新创建 children——children 是它的父级在更早时刻创建并传进来的，引用固定**。中间层再怎么因自身 state 翻天，也碰不到 children 的内容；children 的"更新权"始终握在创建它的父组件手里。这就是"内容不受控"。

```tsx
import { useRef, useState, type ReactNode } from 'react';

function useRenderCount(label: string): number {
  const ref = useRef(0);
  ref.current += 1;
  return ref.current;
}

// 中间层：跟随滚动高频更新自身（进度条），是个"渲染大户"
function ScrollLayout({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const count = useRenderCount('ScrollLayout');
  return (
    <div
      onScroll={(e) => {
        const el = e.currentTarget;
        const max = el.scrollHeight - el.clientHeight;
        setProgress(max > 0 ? el.scrollTop / max : 0); // 滚动中高频 setState
      }}
      style={{ height: '100vh', overflowY: 'auto' }}
    >
      <p>ScrollLayout 已渲染 {count} 次，进度 {(progress * 100).toFixed(0)}%</p>
      {children}
    </div>
  );
}

function HeavyContent() {
  const count = useRenderCount('HeavyContent');
  return <p style={{ height: 4000 }}>沉重内容已渲染 {count} 次（滚动时不增加）</p>;
}

export function App() {
  return (
    <ScrollLayout>
      {/* 这个 element 对象在 App 渲染时创建，之后引用固定；
          ScrollLayout 因 progress 重渲染时，children prop 引用没变，
          React 对相同引用直接 bailout —— HeavyContent 一次都不会重渲染 */}
      <HeavyContent />
    </ScrollLayout>
  );
}
```

运行后滚动：`ScrollLayout` 的计数飞涨，`HeavyContent` 纹丝不动。**边界条件**（这个技巧的适用范围）：如果 `App` 自己因某 state 重渲染，JSX 重新执行，`<HeavyContent/>` 会被重新创建（新引用），此时 HeavyContent 正常重渲染——"内容受控于创建它的那一层 render"。所以该技巧的正确描述是：**中间层的重渲染不波及 children；children 的更新权在写下这段 JSX 的父组件**。阶段 5 第 2 条方案 B（children 提前解决 Context 全量刷新）就是这一招的应用。

四招口诀：**memo 拦入口、拆分断源头、下放缩范围、children 隔中间**。

**常见坑**：
- 症状：给所有组件无脑加了 `memo` + `useCallback`，页面反而更卡。
  根因：比较与缓存本身有成本；props 里只要有一个稳不住的引用（内联对象、每次新建的数组），整层 memo 全部失效，只剩开销。
  修法：先 Profiler 确认热点，只对"渲染贵 + props 可稳定"的组件上 memo；props 天然是基本类型的（表格行）优先。

---

#### 3. 虚拟化长列表

**是什么**：只渲染视口内（及附近）的行，用容器总高度撑出滚动条，行绝对定位到"本来该在的位置"。万行数据实际渲染的永远是三四十行。

**为什么需要**：列表是"渲染范围"问题的极端形态——1 万行的 DOM 创建本身就是秒级开销，且滚动时内存占用高。memo 救不了"第一次渲染"，代码分割救不了"数据就是这么多"，此时只剩虚拟化。完整讲解与 `@tanstack/react-virtual` 的接入细节见阶段 4.3 列表场景第 3 条（渲染 1 万行），此处给核心模式回扣：

```tsx
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const rows = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  label: `第 ${i + 1} 行数据`,
}));

function BigList() {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current, // 滚动容器
    estimateSize: () => 36,                    // 行高估值：实测可用 measureElement 校准
    overscan: 6,                               // 视口外多备 6 行，滚动减少白屏
  });

  return (
    <div ref={parentRef} style={{ height: 480, overflow: 'auto' }}>
      {/* 占位撑高：让滚动条长度与 1 万行一致 */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={rows[virtualRow.index].id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`, // 定位到逻辑位置
            }}
          >
            {rows[virtualRow.index].label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**先用便宜的药**：几百行以内先考虑"行组件 memo + 分页"，虚拟化引入的定位/测量复杂度（不定高、动态行高、锚定滚动）是真实代价，确认列表量级（千行起步）再上。

**常见坑**：
- 症状：不定高列表滚动跳动、行叠行。
  根因：`estimateSize` 估值与真实行高偏差大，滚动过程中不断重排。
  修法：行内元素挂 `virtualizer.measureElement(ref)` 实测高度；或给行设固定高度。

---

#### 4. 代码分割：路由级 `lazy`、重组件动态 import、预加载策略

**是什么**：把一个巨型 bundle 切成按需加载的 chunk——首屏只拉当前路由需要的代码，其余代码等用户真的要去时再下载。React 侧的工具是 `lazy` + `Suspense`，构建侧的工具是动态 `import()`。

**为什么需要**：单页应用不分包的后果是首屏 JS 里塞满了后台管理页、图表库、富文本编辑器——用户在登录页就要为将来可能永远不用的代码付流量和时间。分包把"首屏体积"从全局问题变成各取所需。

**怎么做（机制分步）**：
1. `lazy(() => import('./mod'))` 把组件绑定到"一个异步 chunk"，首次渲染时触发下载；
2. 下载期间 `Suspense` 的 `fallback` 顶上（骨架/占位）；
3. 首次之后 chunk 被缓存，再次进入即时渲染。

**路由级 `lazy` 完整模式**（配合阶段 4.4 路由）：

```tsx
// src/router.tsx
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './pages/Layout';
import Home from './pages/Home'; // 首页不 lazy：首屏关键路径，直接打进主包

// 路由级分割：Dashboard / Admin / Settings 各自成 chunk，访问时才下载
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Settings = lazy(() => import('./pages/Settings'));

function PageSkeleton() {
  return <div style={{ padding: 24 }}>页面骨架加载中…</div>;
}

// 每个懒路由都要被自己的 Suspense 包住（也可在 Layout 的 Outlet 外统一包一层）
function lazyPage(node: ReactNode) {
  return <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'dashboard', element: lazyPage(<Dashboard />) },
      { path: 'admin', element: lazyPage(<Admin />) },
      { path: 'settings', element: lazyPage(<Settings />) },
    ],
  },
]);
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const container = document.getElementById('root')!;
createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

**重组件动态 import**：比路由更细的粒度——某个重组件（图表库、富文本、JSON 预览器）只在特定交互后才出现，就不必随页面一起下载：

```tsx
import { lazy, Suspense, useState } from 'react';

// 图表库体积大（如 echarts 封装），只有打开"数据大盘"弹窗的人才会为它付流量
const HeavyChart = lazy(() => import('./charts/HeavyChart'));

export function Workspace() {
  const [chartOpen, setChartOpen] = useState(false);
  return (
    <>
      <button onClick={() => setChartOpen(true)}>打开数据大盘</button>
      {chartOpen && ( // 条件为真才开始下载 chunk，fallback 期间显示占位
        <Suspense fallback={<div style={{ height: 320 }}>图表模块加载中…</div>}>
          <HeavyChart />
        </Suspense>
      )}
    </>
  );
}
```

**chunk 命名**（webpack）：

```ts
// webpack（CRA 等）：魔法注释给 chunk 命名，network 面板里一眼认出谁是谁
const Admin = lazy(() => import(/* webpackChunkName: "admin" */ './pages/Admin'));
```

Vite（Rollup）下不需要也**不识别** webpack 魔法注释：`import()` 自动按源文件名生成 chunk；要精细分组（比如把图表库单独拆出来）在 `vite.config.ts` 的 `build.rollupOptions.output.manualChunks` 里按模块路径划分。定位体积问题用可视化分析：

```bash
# webpack 项目
npx webpack-bundle-analyzer stats.json
# Vite 项目
npx vite-bundle-visualizer
```

**预加载策略（hover 预载）**：分割的代价是"第一次进入要等下载"。利用用户"悬停 → 点击"之间约 100–200ms 的空档提前把 chunk 拉下来，进入页面时已经就绪：

```tsx
import { Link } from 'react-router-dom';

// 把动态 import 提成独立函数：模块只会真正下载一次，构建器缓存 promise 结果
const loadAdmin = () => import('./pages/Admin');

export function AdminNavLink() {
  return (
    <Link
      to="/admin"
      onMouseEnter={loadAdmin} // 鼠标悬停：开始下载 admin chunk
      onFocus={loadAdmin}      // 键盘聚焦：无障碍场景同样预载
    >
      后台管理
    </Link>
  );
}
```

为什么这样就能命中缓存：`import()` 对同一模块说明符返回**同一个模块记录**，第一次调用发起下载、之后调用复用结果；`lazy(() => import('./pages/Admin'))` 内部执行的是同一个动态 import，所以悬停时拉过的 chunk 在点击进入路由时零等待。同类策略还有：空闲预载（`requestIdleCallback` 里提前 `import()` 下一个可能的页面）、webpack 的 `/* webpackPrefetch: true */`（浏览器空闲时下载，未来可能用）与 `/* webpackPreload: true */`（与本模块并行下载，马上要用）。

```ts
// 空闲预载：首屏稳定后，趁 CPU 空闲把"大概率会去"的模块拉下来
function preloadWhenIdle(load: () => Promise<unknown>) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void load(), { timeout: 3000 });
  } else {
    setTimeout(() => void load(), 1500); // 不支持的浏览器退化为定时
  }
}
preloadWhenIdle(() => import('./charts/HeavyChart'));
```

**常见坑**：
- 症状：切到懒路由时页面白屏一下（或 fallback 闪烁），体感比不分割还差。
  根因：chunk 下载发生在点击之后，慢网络下等待全部转嫁给用户；fallback 太轻没有延续感。
  修法：hover/focus 预载 + 骨架屏 fallback + 用 bundle 分析确认该页确实瘦了。
- 症状：分了很多 chunk，首屏体积却没降。
  根因：懒模块的依赖被主包同步引用（比如 Dashboard 与 Home 共享的重组件被 Home 直接静态 import），公共依赖仍进主包。
  修法：bundle 分析看主包构成，把重组件的引用全部改成动态；公共且小的依赖可接受进主包，公共且大的单独 manualChunks。

---

#### 5. `useTransition` / `useDeferredValue`（大列表搜索不卡输入框）

**是什么**：React 18 并发特性的两个入口。把一次更新标记为**低优先级（transition）**后，React 渲染它时是"可中断"的——期间来了更高优先级的更新（输入框受控值），React 会暂停/丢弃进行中的低优先级渲染，先处理高优先级，再重新调度低优先级。`useDeferredValue` 则是"值层面"的同一思想：给你一个延迟副本。

**为什么需要**：同步渲染的死穴是"一次更新必须完整跑完才能响应下一次"。搜索框里 2 万行列表的过滤渲染要 120ms，你连续敲 3 个字符 = 3 × 120ms 的连续卡顿，输入框本身也跟着卡——因为输入值和列表过滤在同一次渲染里，React 无法只更新输入框。transition 把"输入框更新"和"列表重渲染"拆成两个优先级，输入框永远跟手，列表在后台慢慢算、算一半被打掉重来。

**怎么做（机制分步）**：
1. `setKeyword(next)` 照常同步更新（高优先级，输入框立即响应）；
2. `startTransition(() => setQuery(next))` 把列表状态更新包进低优先级；
3. React 先提交高优先级（输入框动），再开始渲染低优先级（大列表）；
4. 渲染列表途中用户又敲了一个字符 → 新的高优先级进来 → **当前这轮列表渲染作废**（stale query 的结果不要了），先响应输入，再用最新 query 重新渲染；
5. 全程 `isPending` 为 true 表示低优先级更新还没最终提交，可用来显示"筛选中"。

**完整 demo（`useTransition` 版）**：

```tsx
import { memo, useMemo, useState, useTransition } from 'react';

interface Product {
  id: number;
  name: string;
}

// 造 2 万条数据：足以让"同步过滤 + 全量渲染"产生肉眼可见的卡顿
const allProducts: Product[] = Array.from({ length: 20_000 }, (_, i) => ({
  id: i,
  name: `商品-${String(10000 + i)}`,
}));

// 前提：列表必须是被 memo 的独立子组件。
// 若输入框和列表同处一个组件，一次 setState 两者同渲染，优先级拆分无从谈起
const ProductList = memo(function ProductList({ query }: { query: string }) {
  const visible = useMemo(
    () => allProducts.filter((p) => p.name.includes(query)),
    [query]
  );
  return (
    <ul style={{ height: 300, overflow: 'auto', border: '1px solid #ccc' }}>
      {visible.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
});

export default function App() {
  const [keyword, setKeyword] = useState('');      // 高优先级：输入框受控值，要求即时跟手
  const [query, setQuery] = useState('');          // 低优先级：列表实际使用的筛选值
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => {
          const next = e.target.value;
          setKeyword(next);                        // 高优先级：先渲染输入框
          startTransition(() => {
            setQuery(next);                        // 低优先级：大列表的重渲染可被下一次键入打断
          });
        }}
      />
      {isPending && <span aria-live="polite">筛选中…</span>}
      <ProductList query={query} />
    </div>
  );
}
```

体验对比：不加 transition 时快速输入"abc"，输入框每隔 100 多毫秒才蹦一个字符；加了之后输入框如常跟手，列表渐进地跟上（期间可能短暂显示旧结果——这是特性不是 bug，用户宁可看旧列表也不愿输入卡死）。

**`useDeferredValue` 版**（当你控制不了 setState 的位置时用它——例如值来自一个不方便改的受控子组件）：

```tsx
import { memo, useDeferredValue, useState } from 'react';

interface Product {
  id: number;
  name: string;
}

const allProducts: Product[] = Array.from({ length: 20_000 }, (_, i) => ({
  id: i,
  name: `商品-${String(10000 + i)}`,
}));

// ProductList 与 useTransition 版完全相同：memo 化的列表组件
const ProductList = memo(function ProductList({ query }: { query: string }) {
  const visible = allProducts.filter((p) => p.name.includes(query));
  return (
    <ul style={{ height: 300, overflow: 'auto' }}>
      {visible.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
});

export default function App() {
  const [keyword, setKeyword] = useState('');
  const deferredKeyword = useDeferredValue(keyword); // 关键：拿到一个"晚半拍"的副本
  const isStale = keyword !== deferredKeyword;       // 两者不相等 ⇒ 列表还在按旧值渲染（低优先级在路上）
  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {isStale && <span>筛选中…</span>}
      <ProductList query={deferredKeyword} />
    </div>
  );
}
```

`useDeferredValue(v)` 的语义：初次渲染返回 `v` 本身；之后 `v` 变化时，先用旧值（不阻塞高优先级渲染），再在低优先级里切到新值。它就是"自动帮你做 transition 的受控值"。

**与防抖的区别**（必考题，两个维度说清）：

| 维度 | 防抖（debounce 300ms） | useTransition / useDeferredValue |
|---|---|---|
| 机制 | **时间维度**：等输入停顿 300ms 才发起更新 | **优先级维度**：立即开始渲染，但随时给高优先级让路 |
| 输入框反馈 | 即时（受控值本来即时） | 即时 |
| 列表反馈 | 停顿 300ms 前列表完全不动 | 立即按旧值渲染、渐近切到新值 |
| 中断能力 | 无：一旦开始渲染照样卡 120ms | 有：渲染到一半可被打断重来 |
| 适用 | 网络/存储类副作用（请求搜索建议） | 纯渲染瓶颈（大列表过滤渲染） |

一句话：**防抖推迟"开始"，transition 允许"中断"**。列表渲染是 CPU 瓶颈时防抖只是把卡顿挪到 300ms 后，transition 才真正消除卡顿；发请求防抖不可替代（省流量），两者可叠加（防抖后的值再进 transition）。

**常见坑**：
- 症状：包了 `startTransition` 输入框还是卡。
  根因一：输入框与列表在**同一个组件**里，一次渲染必然连坐，优先级无从拆分；根因二：卡的是 onChange 里同步执行的重计算（transition 只调度渲染，救不了同步 JS）。
  修法：列表拆成 memo 子组件；把计算挪进列表组件内 `useMemo`，确保高优先级那次渲染只剩"更新一个 input 的 value"。
- 症状：在 `startTransition` 里 `await` 请求，以为请求也能让路。
  根因：transition 只影响 **setState 触发的渲染**优先级，网络请求照样同步等在事件里。
  修法：数据获取交给 Suspense/React Query（阶段 4.2、阶段 9），transition 管渲染优先级这一段。

---

#### 6. 图片懒加载、字体优化、防抖节流

**是什么**：React 渲染之外的三大常规资源优化——图片（页面字节量大头）、自定义字体（渲染阻塞与"文字隐形"）、高频事件（输入/滚动的触发频率）。

**为什么需要**：Profiler 里 Scripting 只占 30%、Network 里图片占 3MB——这类问题再怎么 memo 都没用，得在各自的层面解决。

**图片懒加载**。第一选择是原生属性，几乎零成本：

```tsx
function ProductCard({ url, name }: { url: string; name: string }) {
  return (
    <img
      src={url}
      alt={name}
      width={320}
      height={200}     // 占住尺寸：图片加载完成后布局不跳（CLS 指标）
      loading="lazy"   // 原生懒加载：接近视口才开始下载
      decoding="async" // 图片解码移出主线程，解码时页面不卡
    />
  );
}
```

需要占位/模糊过渡等定制时用 IntersectionObserver 自己控制（阶段 4.3 无限滚动的哨兵元素同一原理）：

```tsx
import { useEffect, useRef, useState } from 'react';

function LazyImage({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);        // 进入视口：切换到真实地址
          observer.disconnect();  // 一次性：加载过就不再观察
        }
      },
      { rootMargin: '200px' }     // 提前 200px 开始下载，滚动更顺滑
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={inView ? src : undefined} // 未进入视口不设置 src，浏览器无图可下
      alt={alt}
      width={width}
      height={height}
      style={{ background: '#eee' }} // 灰底占位，避免加载后跳版
    />
  );
}
```

**字体优化**：自定义字体默认行为是"字体没下载完之前文字不显示"（FOIT），弱网下标题能隐形两秒。两招组合：

```text
/* src/styles/fonts.css */
@font-face {
  font-family: 'CustomSans';
  src: url('/fonts/CustomSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* 关键：先用系统字体把文字渲染出来，字体到货后无缝替换，消灭"隐形期" */
}

body {
  /* 回退链兜底：字体没到时用系统字体，字形度量尽量接近可减少替换跳动 */
  font-family: 'CustomSans', system-ui, sans-serif;
}
```

```text
<!-- index.html：只对首屏必需的那一两个字重预加载。
     crossorigin 必须写——字体是匿名 CORS 资源，漏写会导致 preload 的这份缓存
     与 @font-face 的请求对不上号，同一文件被下载两次 -->
<link rel="preload" href="/fonts/CustomSans-Regular.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
```

原则：`font-display: swap` 保底不隐形；首屏关键字体 preload；非首屏字体不 preload（预载太多反而抢占首屏带宽）；能 `system-ui` 就别引网络字体。

**防抖与节流**：控制高频事件的触发频率。防抖 = "停下来了才算数"（搜索输入、窗口 resize 结束、表单自动保存）；节流 = "固定间隔最多一次"（滚动监听、mousemove 拖拽、滚动进度条）。

```ts
// src/shared/hooks/useDebouncedValue.ts
// 防抖值：值连续变化时不断重置定时器，只有"停够 delay"的最后一次才落地
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // 清理上一个定时器 = 作废中间值（阶段 2 清理函数思想）
  }, [value, delay]);
  return debounced;
}
```

```tsx
// 使用：搜索请求用防抖值触发，用户打完整词才发一次请求
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue';
import { useProducts } from './queries';

function ProductSearch() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const { data } = useProducts(debouncedKeyword); // 300ms 内的每次键入都不触发新请求
  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <ul>{(data ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}
```

```ts
// src/shared/utils/throttle.ts
// 节流：间隔内第一次立即执行 + 尾部补一次，保证高频事件（滚动）按固定频率触发且最后一次不丢
export function throttle<F extends (...args: never[]) => void>(fn: F, interval = 200): F {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<F>) => {
    const now = Date.now();
    const remaining = interval - (now - last);
    if (remaining <= 0) {
      last = now;
      timer = null;
      fn(...args);                 // 距上次执行已满间隔：立即执行
    } else if (!timer) {
      timer = setTimeout(() => {   // 间隔未满：安排一次"尾部执行"
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };

  return throttled as F;
}
```

```tsx
// 使用：滚动进度条用节流，一秒最多 5 次 setState，而不是每帧都渲染
import { useEffect, useState } from 'react';
import { throttle } from '../shared/utils/throttle';

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = throttle(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    }, 200);
    window.addEventListener('scroll', onScroll, { passive: true }); // passive：不阻止滚动，浏览器可优化
    return () => {
      window.removeEventListener('scroll', onScroll); // 解绑时记得移除的是同一个节流函数
    };
  }, []);
  return <div style={{ position: 'fixed', top: 0, left: 0, height: 3, width: `${progress * 100}%`, background: '#1677ff' }} />;
}
```

**常见坑**：
- 症状：防抖后搜索"更卡了"。
  根因：把"渲染慢"误诊成"请求多"，防抖只省了请求，每次触发的那次渲染照样卡 120ms。
  修法：渲染瓶颈用第 5 条 transition，请求浪费才用防抖——先分清瓶颈类型再选工具。

---

#### 7. 常见反模式清单：在 render 里创建重对象、context 放高频变化值、props 内联函数+未 memo 等

七条反模式，每条按"症状 → 根因 → 修法"过一遍，全部都在前文出现过原理，这里是速查汇总。

**① 在 render 里创建重对象/重复计算大数组**
- 症状：Profiler 显示某组件每次渲染都 50ms+，代码里却没有明显的副作用；传给子组件/memo 依赖的"看起来没变"的对象每次都不等。
- 根因：render 函数每次执行都会新建引用、重跑计算——`const config = { ... }`、`rows.filter(...)`、`new RegExp(...)` 全都是新东西。
- 修法：真正不变的常量提到**模块顶层**；依赖 state 的派生计算包 `useMemo`；能传基本类型（id）就别传对象，让子组件自己查。

**② Context 放高频变化值**
- 症状：输入框每敲一个字符/滚动每走一步，全站消费组件重渲染，Profiler 原因清一色 "Context changed"。
- 根因：Context 的更新语义是"全体消费者无差别刷新"，与高频变化天然冲突（阶段 5 第 2 条）。
- 修法：状态下放到消费子树；必须全局就换 Zustand selector 精确订阅；Context 只留主题/语言/当前用户这类低频值。

**③ props 内联函数 + 子组件已 memo**
- 症状：明明包了 `memo`，Profiler 里子组件照渲染，原因是 "Props changed: onClick"。
- 根因：内联箭头函数每次渲染都是新引用，memo 的浅比较必然失败——memo 与不稳定 props 组合等于"只有比较成本、没有拦截收益"。
- 修法：`useCallback` 固定引用；或改传稳定标识（`id`），回调由子组件内部自派发；或干脆别 memo（渲染便宜的组件 memo 本来就多余）。

**④ 在组件内部定义组件**
- 症状：子树里输入框的内容/滚动位置莫名丢失、进出场动画重复播放，表现像"组件被偷偷卸载重挂"。
- 根因：`function Parent() { function Child() {...} return <Child/> }` 每次渲染都造出一个**新的组件类型**，React 判定"旧 Child 卸载、新 Child 挂载"，所有内部 state 与 DOM 归零。
- 修法：组件定义一律提到模块顶层；需要"按参数生成组件"时用元素/props 区分而不是定义新组件。

**⑤ useEffect 里 setState 做派生计算**
- 症状：界面先闪一下旧值再变新值（多渲染一帧）；依赖数组稍写错直接无限循环（见调试方法论第 1 条）。
- 根因：能从现有 props/state 直接算出来的值被塞进了 state，多走一轮"渲染 → effect → 再渲染"。
- 修法：render 里直接算（便宜）或 `useMemo`（贵）；react.dev《You Might Not Need an Effect》整篇在讲这件事——事件驱动的逻辑回事件处理器，派生数据用变量。

**⑥ 大列表用 index 当 key + 行内有状态**
- 症状：删除第一行后各行输入框内容"串位"；拖拽排序后勾选状态错乱；控制台 key 警告。
- 根因：key 是 React 对齐"旧树的第 N 个元素"与"新树的哪个元素"的身份证；index 身份证随位置漂移，状态跟着位置走而不是跟着数据走。
- 修法：用稳定业务 id（`item.id`）当 key（阶段 1 列表渲染已埋点，这里是代价的完整解释）。

**⑦ 状态全部提升到顶层 / store 无 selector 全量订阅**
- 症状：页面任何角落一次 setState，Components 面板高亮渲染几乎全屏变色。
- 根因：状态作用域被无限放大——要么全塞 App，要么 `useStore((s) => s)` 拿整个 store，任何字段变化都广播到所有订阅者。
- 修法：状态下放（第 2 条招式三）；Zustand selector 落到字段级、组合结果包 `useShallow`（阶段 5 第 3 条）；store 按领域拆分。

---

### 调试方法论

#### 高频 bug 模式速查：

##### **无限重渲染**：effect 里 setState 且依赖了它 / 父子互相触发

**最小复现（形态 A：effect 自己咬自己）**：

```tsx
import { useEffect, useState } from 'react';

function BrokenClock() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now()); // setState → now 变 → effect 依赖 [now] → 重跑 → 再 setState……
  }, [now]);            // ❌ 依赖里放了自己更新的那个 state

  return <span>{new Date(now).toLocaleTimeString()}</span>;
}
```

**最小复现（形态 B：父子互相触发）**：

```tsx
import { useEffect, useState } from 'react';

function Parent() {
  const [, force] = useState(0);
  // ❌ 内联回调：Parent 每次渲染都产生新引用传给 Child
  return <Child onMount={() => force((n) => n + 1)} />;
}

function Child({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount(); // onMount 引用一变就重跑 → 调用 onMount → Parent 重渲染 → 新回调 → 循环
  }, [onMount]);
  return null;
}
```

**定位步骤**：1) 控制台一般直接抛 `Maximum update depth exceeded`，堆栈第一帧就指向肇事 setState；2) Profiler 录制看到同一组件连成串的 commit，柱高基本一致——像心电图；3) 选中组件看 Why did this render?（State changed / Props changed），顺着链条往上找闭环的那一环。
**修法**：形态 A 的正确需求是"定时刷新"，改成 `setInterval` + 清理函数且依赖 `[]`，或者根本别存派生值；形态 B 用 `useCallback` 稳住回调引用（给 Child 的 effect 依赖写 `[]` 也能止血，但那是掩盖问题的逃生舱，不推荐）。通则：**effect 里 setState 之前先问——这个值真的是"副作用产生的独立状态"吗，还是本可以在 render 里算出来**（反模式第 ⑤ 条）。

##### **闭包旧值**：定时器/订阅回调读 state

**最小复现**：

```tsx
import { useEffect, useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // ❌ count 是首次渲染捕获的 0，永远算 0 + 1
    }, 1000);
    return () => clearInterval(id);
  }, []); // 空依赖：effect 只跑一次，闭包里的 count 冻结在 0

  return <span>{count}</span>; // 页面显示到 1 就永远不动了
}
```

**定位步骤**：1) 症状极具辨识度——数字停在一个值、日志打印的值与 UI 对不上；2) 在回调里 `console.log('interval 里的 count =', count)`，看到永远打印 0 即确认；3) 检查该回调是在哪次渲染被创建的（interval/订阅/事件监听都是"注册时刻的快照"）。
**修法**：两选一——函数式更新 `setCount((c) => c + 1)`（要的是"基于最新值算新值"时首选）；或用 ref 镜像最新值（回调里还要**读**而非只**写**时）：`const countRef = useRef(count); countRef.current = count;` 然后回调里读 `countRef.current`。完整专题见阶段 2"闭包陷阱专题（必练）"。

##### **竞态**：快速切换请求覆盖

**最小复现**：

```tsx
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
}

function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((res) => res.json())
      .then((data) => setUser(data)); // ❌ 没有任何"我是否还是最新请求"的判断
  }, [id]);

  return user;
}
```

快速把 id 从 `1` 切到 `2` 再切到 `3`：若 `/users/3` 先返回、`/users/2` 后返回（网络抖动很常见），最终页面停在 **id=2 的数据**——最后到达的响应赢，而不是最新的请求赢。

**定位步骤**：1) Network 面板按时间排序看响应完成顺序，与页面最终显示的数据对不上即确认；2) 在 `.then` 里 `console.log('完成：', id)`，观察"完成顺序 ≠ 发起顺序"；3) 复现时给某个请求加人工延迟（DevTools 的 Network throttling 或后端 sleep）让交错必现。
**修法**：cleanup 里挂"过期标志"（React 官方解法）：

```tsx
useEffect(() => {
  let ignore = false; // 本轮 effect 的私有标记
  fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((data) => {
      if (!ignore) setUser(data); // cleanup 已执行过 ⇒ 这是过期响应，丢弃
    });
  return () => {
    ignore = true; // id 变化/卸载时：宣布上一轮的结果作废
  };
}, [id]);
```

需要真正中止请求（省流量）时用 `AbortController`：cleanup 里 `controller.abort()`。更彻底的方案是 React Query——queryKey 内建"每个 key 的请求各归各"，竞态在缓存模型层消失（阶段 5 第 6 条）。

##### **key 警告 / 列表状态错乱**

**最小复现**：

```tsx
import { useState } from 'react';

interface Todo {
  id: string;
  title: string;
}

function TodoList({ todos }: { todos: Todo[] }) {
  // ❌ index 当 key：删除第一行后，各行的 index 全部前移一位
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>
          {todo.title} <input placeholder="在这一行输入点什么" />
        </li>
      ))}
    </ul>
  );
}
```

在第一行的 input 打字，然后删除第一行：React 认为 "key=0 的元素还在（只是内容变了）"，于是第一行 input 的 DOM（连同你输入的文字）被保留并配给了**下一条** todo——内容与输入框错位串门。

**定位步骤**：1) 控制台的 key 警告是直接提示；2) "删除/排序后行内输入、勾选、动画状态错位"是行为指纹；3) 对照阶段 1 列表渲染第 3 条自查 key 来源。
**修法**：`key={todo.id}`（稳定、随数据走的业务标识）。没有 id 的数据要么后端补 id，要么在生成数据时用 `crypto.randomUUID()` 造一个并保持稳定——index 只在"列表纯展示、无行内状态、不增删排序"时勉强可用。

##### **事件不触发**：被覆盖/被阻止冒泡/条件卸载

三种子形态各给一个最小复现。

**形态 A：被覆盖（点不到）**——元素上面压了别的东西：

```tsx
function OverlayBug() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>提交</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0 }}> {/* loading 遮罩忘了关 */}
          loading…
        </div>
      )}
      <button onClick={() => console.log('保存')}>保存</button> {/* 点了没反应：被遮罩盖住 */}
    </div>
  );
}
```

定位：DevTools 元素面板选中该按钮，看计算样式 z-index 与实际命中的元素；或临时给可疑遮罩加 `outline: 2px solid red`。
修法：遮罩用完要卸载/隐藏（`open &&` 漏了复位，或 CSS `pointer-events: none` 该加的地方加上）。

**形态 B：被阻止冒泡**——监听在更外层，中途有人掐断了传播：

```tsx
function StopPropagationBug() {
  useEffect(() => {
    const onClick = () => console.log('document 收到点击'); // 需求：点任何按钮都上报
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return (
    <div onClick={(e) => e.stopPropagation()}> {/* 中间层为了"点卡片不触发背景关闭"而拦了冒泡 */}
      <button>点我（document 收不到）</button>
    </div>
  );
}
```

定位：在 document 监听与可疑中间层各打一行日志，看到"按钮 → 中间层"之后就断流即可确认。
修法：中间层只在需要的元素上拦（把 stopPropagation 移到真正要拦的子元素），或外层改用捕获阶段/统一状态管理关闭逻辑，而不是物理截断事件流。

**形态 C：条件卸载**——处理器挂在一个已被卸载/还没挂载的元素上，或事件绑定时机早于元素出现：

```tsx
function UnmountBug({ showInput }: { showInput: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // ❌ effect 跑的时候 showInput 还是 false，inputRef.current 是 null，绑定直接没发生
    inputRef.current?.addEventListener('focus', () => console.log('聚焦'));
  }, []);
  return <>{showInput && <input ref={inputRef} />}</>;
}
```

定位：打印 `inputRef.current` 发现是 null；或"第一次点击没反应、第二次才有"这类时机指纹。
修法：绑定逻辑跟随元素生命周期——直接用 JSX 的 `onFocus={...}` 让 React 管理绑定；确需手动绑定时把 `showInput` 加进 effect 依赖或用事件委托挂到稳定父节点。

#### 排查步骤：稳定复现 → 二分最小化（删代码到问题消失）→ 定位层（渲染/逻辑/环境）→ 查官方文档

把一句话方法论展开成可执行流程。

**第 0 步（前置）：先读警告**。控制台的红字与黄字警告经常直接给出答案——key 警告、`act` 警告、hydration 警告、`Each child...`、依赖数组提示。这一步零成本，却解决三成问题，对应"解决实际编码问题的工作流"第 1 条。

**第 1 步：稳定复现**。
- 写下**确切的操作序列**（含入口页面、点击路径、输入内容、账号与数据），让另一个人照着也能触发；
- 固化随机因素：同一份 mock 数据、关掉动画、固定窗口尺寸、同一浏览器配置（无痕窗口排除扩展干扰）；
- 偶现问题先"驯化"成必现：给可疑请求加延迟、放大触发频率（连点 20 次）、降低 CPU（DevTools Performance 面板的 4x/6x 降速）；
- 实在无法本地复现的，上埋点：Sentry breadcrumb、分层 console 日志（网络层/状态层/渲染层各打一行）拿回现场录像。

**第 2 步：二分最小化**。
- 代码二分：复制页面文件，注释掉一半（组件、effect、样式、第三方库逐层砍），问题仍在 → 凶手在剩下的一半；问题消失 → 凶手在被砍的那半；每轮砍半，通常 4–6 轮就能逼近；
- 提交二分：不知道何时引入的用 `git bisect`，让 git 替你二分历史提交；
- 终点：新开一个文件，把问题压到 **20 行以内**的最小 demo（对应工作流第 2 条）。此刻"原文件与最小 demo 的差异清单"就是嫌疑犯名单——多数时候真凶是差异里那个"看起来人畜无害"的写法；
- 额外收益：最小 demo 直接变成你提 issue 的复现材料与回归测试用例。

**第 3 步：分层定位**（对应工作流第 3 条的三层）。
- **渲染层（值对不对）**：React DevTools Components 面板选中问题组件，看 props/state/hooks 此刻的真实值——是"值就算错了"还是"值对但没渲染上"；
- **逻辑层/时机层（顺序对不对）**：在事件处理器、effect、cleanup、异步回调四处打日志或断点，还原真实执行顺序；重点检查闭包捕获值（打出来与 UI 对比）、effect 清理是否执行、异步回调是否过期（竞态那套定位法）；
- **环境层（是不是代码的锅）**：StrictMode 故意双调用（开发期待行为）、浏览器扩展注入、缓存/Service Worker 的旧产物、dev 与 prod 构建差异、依赖版本（`npm ls` 查幽灵版本）。最小 demo 在"纯净新项目"里跑不出来 → 基本锁定环境层。

**第 4 步：查官方文档**（对应工作流第 4 条，按顺序）：
1. react.dev 站内搜关键词（中文版可用），重点读 "You Might Not Need an Effect"、"Referencing Values with Refs"、"Pitfall" 提示块；
2. 库的 GitHub issues 搜**报错原文**（一字不改地搜，命中率远高于意译）；
3. Release Notes / 迁移指南——升级后突然坏的问题 90% 在这里（major 版本的 breaking changes）；
4. 还没解决就把官方最小示例抄进来，逐段替换成自己的代码，替换到哪一步坏了，问题就在那一步。

**第 5 步：沉淀**。解出问题只完成一半，按"症状 / 根因 / 修法 / 验证方式"四栏记进踩坑笔记（工作流第 5 条）——下次同样症状出现时，你的反应速度就是调试功力的度量。

---

### ✅ 产出：给阶段 4 项目做一次 Profiler 记录，写一份优化前后对比笔记。

**作业说明**：本作业交付两个文件——一份 Profiler 录制档案（可复现的数据），一份优化笔记（结论与证据链）。

**第一步：选定测量场景**。从阶段 4 的后台管理系统里挑 1–2 个"你主观觉得重/卡"的操作，推荐候选：商品表格的关键词筛选（连敲 5 个字符）、打开新增/编辑弹窗、切换侧边栏菜单。选定后写下操作脚本（在哪个页面、点什么、输入什么），保证前后两次测量执行完全相同的脚本。

**第二步：录制规范（前测）**。
1. 打开 Profiler 设置勾选 "Record why each component rendered"；
2. 每个场景连续录 3 次，取中位数那次作为样本（掐掉首次的模块加载噪音）；
3. 每次录制只包含一个动作，动作前后各留 1 秒空档；
4. 记录四个数字：该操作的 **commit 次数**（顶部柱子数量）、**最贵 commit 的耗时**、**最贵 commit 里渲染的组件数**、**Top3 组件及各自的 Why did this render? 原因**；
5. 用 Profiler 的 Save profile 导出存档为"优化前"基准（文件命名如 `filter-before.json`）。

**第三步：实施优化**。按阶段 6 的清单逐项处理，每项优化**单独提交一次代码**（方便归因与回滚）：渲染原因 "parent rendered" → 第 2 条四招；"Context changed" → 阶段 5 第 2 条拆分；列表渲染贵 → 第 3 条虚拟化或第 5 条 transition；chunk 体积 → 第 4 条分割。每项优化后立刻复测同一场景，别攒一堆改动一起测（无法归因）。

**第四步：后测与对比表**。同一脚本、同一录法再录 3 次，填表：

| 指标 | 优化前 | 优化后 | 变化 |
|---|---|---|---|
| commit 次数 | 例：5 | 例：2 | -60% |
| 最贵 commit 耗时 | 例：142ms | 例：23ms | -84% |
| 最贵 commit 渲染组件数 | 例：268 | 例：31 | -88% |
| Top1 组件及渲染原因 | 例：TableContainer / parent rendered | 例：TableContainer / props changed（仅筛选值） | 已剪断连坐链 |
| 主观卡顿（录屏对比） | 连敲卡顿明显 | 输入跟手 | 达标 |

**第五步：写优化笔记**。每条优化按下面模板记录（这个模板本身就是你今后的工作模板）：

```text
## 优化笔记：<场景名>（日期：____）
- 现象：用户操作 ____ 时出现 ____（主观感受 + 录屏链接）
- 测量证据：Profiler 第 __ 次 commit，最贵 __ms；Top 组件 ____ 的渲染原因是 ____
- 假设：因为 ____（引用阶段 6 对应条目，如"父组件连坐/props 引用不稳定"）
- 改动：____（commit 链接；一项改动一个 commit）
- 复测：同一脚本数字对比（前 __ms → 后 __ms）
- 副作用评估：memo 比较成本？可读性下降？边界情况（空列表/慢网络）是否回归？
- 结论：保留 / 回滚 / 需进一步（下一步：____）
```

**验收标准**：对比表至少一个场景的核心指标（commit 次数或最贵耗时）改善 50% 以上；每条优化都能用 "Why did this render?" 的前后变化说明因果（而不是"改完好像快了"）；有一项优化被你自己评估后**主动放弃或回滚**（能说明"为什么数字没变/副作用大于收益"，比全盘生效更能证明你会测量）。

---

## 阶段 7：TypeScript + React（1 周）

到阶段 6 为止，你已经能用 JavaScript 思维写出完整应用了。这一周要换一副眼镜：**TypeScript 视角下的 React**。前六个阶段解决"能不能写出来"，这一周解决"写出来的东西敢不敢让别人改"——当组件被第三个同事调用、当 props 有十几个字段、当一个 hook 要同时服务五种接口时，类型系统是唯一能在编译期把错误拦下来的防线。

先明确这一周的定位：它**不是** TypeScript 语言教程（默认你已掌握 `interface`、联合类型、泛型基础、`typeof`/`keyof` 这些语言特性），而是 TS 与 React 组件模型的**交叉地带**。这六个场景是从"会写组件"到"能设计被别人复用的组件 API"的门槛，也是你将来阅读任何主流库（react-hook-form、TanStack Query、antd）类型定义的钥匙——那些库的 `.d.ts` 里写的就是本节这六类东西的放大版。

学习方式建议：每个场景在阶段 0 建好的项目里开一个 demo 文件，**先故意写错**（传错类型、删掉泛型参数），看编译器报什么错、报在哪一行，再改对。对报错信息的熟悉程度，直接决定你将来排查类型问题的速度。

原大纲条目（骨架）：

1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`
2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用
3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）
4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍
5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）
6. 给第三方 JS 库写 `.d.ts` 声明

---

### 1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`

**是什么。** Props 类型就是给组件的"输入参数表"定义形状。React 组件本质上是一个函数，props 是它的参数；TS 对普通函数参数所做的一切（形状约束、自动补全、编译期报错、调用点检查），对 props 全部适用。一个组件的 Props 接口，就是这个组件对外的全部 API 文档。

**为什么需要。** 三个工程价值，缺一个都值得花这一周：

1. **自文档**：调用方把鼠标悬停在 `<Button ` 上，IDE 直接弹出字段列表与注释，不用翻实现代码。
2. **编译期拦截**：`size="middle"` 拼错一个字母，浏览器里表现为"样式没生效"这种很难追的 bug；有类型后，构建直接失败并指出那一个字符。
3. **重构安全**：把 `onSelect` 改名为 `onChange`，TS 会把所有漏改的调用点标红。项目越大，这一条的杠杆越高——没有类型的 React 项目改一个公共组件 props，只能靠全局搜索加人肉确认。

**怎么做（机制分步）。** 三步：

1. 用 `interface`（或 `type`）声明 Props 形状，可选字段加 `?`。
2. 组件参数处解构，并把类型标注上去；给可选字段设默认值。
3. 从 `react` 包用 `import type` 导入所需类型（`import type` 表示只导入类型、运行时不产生代码，是官方推荐的写法）。

**代码示例：一个 Props 定义规范的 Button。**

```tsx
// src/components/Button.tsx
import type { ReactNode, MouseEventHandler } from 'react';

/** 按钮组件的对外契约：调用方看这里就知道怎么用 */
interface ButtonProps {
  /** 子内容：字符串、JSX、多段混合都可以，所以用 ReactNode */
  children: ReactNode;
  /** 点击回调。等价手写形式：(event: React.MouseEvent<HTMLButtonElement>) => void */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** 原生 type 属性，默认 'button'，防止在 form 里被当成 submit 误触提交 */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({ children, onClick, type = 'button', disabled = false }: ButtonProps) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

**children 为什么是 `ReactNode`。** `ReactNode` 是"一切 React 能渲染的东西"的总类型：字符串、数字、JSX 元素、元素数组、`null`、`undefined`、布尔值，乃至它们的任意嵌套组合。对比两个常见错误选择：

- 写 `children: string`——`<Button><Icon />保存</Button>` 直接报错，把图标挡在门外。
- 写 `children: JSX.Element`——`<Button>保存</Button>` 报错，因为 `"保存"` 是 string 不是元素；而且只能装"一个"元素，`<Icon />保存` 两个节点也不行。

`ReactNode` 的宽泛在这里恰好是对的：组件对 children 的态度通常就是"原样放进来、渲染出去"，不需要知道它具体是什么。**特例**：如果组件要"处理"children（比如函数式 children `<Select>{(item) => <Row item={item} />}</Select>`），ReactNode 就不够了，必须显式声明函数形状：`children: (item: Item) => ReactNode`。判断标准：你是"透传"还是"调用"。

**常用事件类型速查表。** 给事件处理器标注类型是新手最常卡住的地方，规律只有一个：**类型名 = React + 原生事件类别，泛型参数 = 绑定事件的元素标签类型**。

| 场景 | 处理函数参数类型 | 备注 |
|---|---|---|
| input 的 `onChange` | `React.ChangeEvent<HTMLInputElement>` | 受控输入最常用 |
| textarea / select 的 `onChange` | `React.ChangeEvent<HTMLTextAreaElement>` / `React.ChangeEvent<HTMLSelectElement>` | 泛型参数跟着元素换 |
| 表单 `onSubmit` | `React.FormEvent<HTMLFormElement>` | 记得 `e.preventDefault()` |
| 按钮 `onClick` | `React.MouseEvent<HTMLButtonElement>` | div 上则是 `HTMLDivElement` |
| `onKeyDown` / `onKeyUp` | `React.KeyboardEvent<HTMLInputElement>` | 判断 `e.key === 'Enter'` |
| `onFocus` / `onBlur` | `React.FocusEvent<HTMLInputElement>` | 常用来控制校验时机 |
| `onScroll` | `React.UIEvent<HTMLDivElement>` | 滚动容器 |
| `onDragStart` / `onDrop` | `React.DragEvent<HTMLDivElement>` | 拖拽场景（阶段 4.7） |
| `onCopy` / `onPaste` | `React.ClipboardEvent<HTMLInputElement>` | 粘贴拦截 |
| `onAnimationEnd` / `onTransitionEnd` | `React.AnimationEvent<HTMLDivElement>` / `React.TransitionEvent<HTMLDivElement>` | 动画结束回调 |

逐行展开几个关键点：

- **泛型参数为什么是元素类型**：`React.ChangeEvent<HTMLInputElement>` 让 `e.target` 被收窄为 `HTMLInputElement`，于是 `e.target.value`、`e.target.checked` 都有类型。泛型填错（比如把 div 的事件写成 `HTMLInputElement`），`e.target.value` 处就会报错。
- **React 的 onChange 不是原生 change**：原生 `change` 事件要失焦才触发；React 的 onChange 实际代理的是 `input` 事件，输入每个字符都触发——这是受控组件"实时跟随输入"的底层原因（合成事件机制见阶段 10）。
- **e.target vs e.currentTarget**：`currentTarget` 的类型由泛型参数**保证**就是绑定处理器的那个元素；`target` 是"事件实际发生的元素"，可能是它的子元素（事件冒泡上来），类型是 `EventTarget`，取值前常需要收窄。要稳定拿到绑定元素，用 `e.currentTarget`。

**代码示例：受控输入 + 表单提交，事件类型齐全。**

```tsx
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');

  // 泛型参数写 HTMLInputElement，e.target.value 才有类型提示
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 阻止浏览器默认提交行为（整页刷新）
    console.log('提交邮箱：', email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        邮箱
        <input type="email" value={email} onChange={handleChange} />
      </label>
      <button type="submit">登录</button>
    </form>
  );
}
```

**偷懒技巧：从内置元素反查事件类型。** 不记得类型名时，用 `ComponentProps` 从原生元素身上"抄"：`type InputOnChange = ComponentProps<'input'>['onChange']`（等价于手写 `React.ChangeEvent<HTMLInputElement>`）。给第三方组件包 wrapper、复用某个 HTML 属性类型时非常好用；rest props 透传也靠它：`interface Props extends ComponentProps<'button'> { ... }` 一次拿到 button 的全部原生属性类型。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`e.target.value` 报错 `Property 'value' does not exist on type 'EventTarget'`。根因：处理器参数写成了原生 `Event`（或没标类型被推成别的），`target` 只是 `EventTarget`。修法：标注 `React.ChangeEvent<HTMLInputElement>`，或直接使用上面 `ComponentProps` 反查法。
2. 症状：给 `onClick` 的处理器标了 `MouseEvent` 却报类型不兼容。根因：没加 `React.` 前缀时，`MouseEvent` 解析到的是 **DOM 全局的** `MouseEvent`（构造函数类型），不是 React 的合成事件。修法：写 `React.MouseEvent<HTMLButtonElement>`，或 `import type { MouseEvent } from 'react'` 后用短名。
3. 症状：`<Select options={xs}>{(item) => <Row item={item} />}</Select>` 报 children 类型错。根因：`children: ReactNode` 不包含函数。修法：显式声明 `children: (item: Item) => ReactNode`——需要"调用"children 的组件永远不该用 ReactNode。
4. 症状：把 `onMouseEnter` 的事件参数当 `React.MouseEvent` 用一切正常，但同事的 `onScroll` 写成 `React.MouseEvent` 编译不过。根因：不同事件类别类型不同，鼠标/键盘/焦点/剪贴板各自一套。修法：对照上面速查表；TS 的报错信息本身会给出期望类型，直接照抄即可。

---

### 2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用

**是什么。** `useState` 是泛型函数：`useState<S>(initial: S | (() => S))`。多数时候 S 能从初始值自动推导，不需要手写；需要手写的场景恰恰是状态类型设计的关键点。类型收窄（narrowing）则是指：当一个联合类型状态的"当前分支"确定后，TS 自动知道这个分支上有哪些字段可用——在 JSX 的 if/switch 分支里这非常好用。

**为什么需要。** 先看推导规则表，理解什么时候 TS 帮你、什么时候必须自己写：

| 写法 | 推导出的状态类型 | 评价 |
|---|---|---|
| `useState(0)` | `number` | 正确，不用手写 |
| `useState<User \| null>(null)` | `User \| null` | 初始 null 时不写泛型就永远是 `null`，必须手写 |
| `useState<Level>('info')` | `Level`（字面量联合） | 想收窄取值范围时手写 |
| `useState<Cart>(() => loadCart())` | `Cart` | 惰性初始化时手写，顺便检查 initializer 的返回值 |

第二行是最高频的坑：`const [user, setUser] = useState<User>(null)` 直接编译报错——`null` 不是 `User`。"暂时没有、将来有"的状态，类型必须是 `User | null`，用的时候判空，判空之后 TS 自动收窄成 `User`。这一判一窄，就是本条目的核心机制。

**怎么做（机制分步）：用判别联合建模状态机。** 与其用三个布尔 `isLoading` / `isError` / `isSuccess` 组合状态（4 种组合里至少一种是非法的，比如 loading 和 error 同真），不如用一个"判别联合"（discriminated union）：

1. 定义若干互斥的"状态分支"，每个分支都有一个**字面量类型的公共字段**（如 `status`），这个字段叫判别字段（discriminant）。
2. 每个分支只携带该分支存在的数据：`success` 分支才有 `data`，`error` 分支才有 `message`。
3. `setState` 时必须提供完整分支对象；JSX 里根据 `status` 分支渲染，TS 在每个分支内自动收窄出对应字段。

非法状态（"加载中但已有数据"）在这个模型里**根本无法表达**——这就是"让非法状态不可表示"（make illegal states unrepresentable），它是 TS 建模业务状态最重要的一条思想。

**代码示例：完整的请求状态机组件。**

```tsx
import { useEffect, useState } from 'react';

/** 四个互斥状态：status 是判别字段；data 只在 success 分支存在，message 只在 error 分支存在 */
type TagsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

export function TagsPanel() {
  const [state, setState] = useState<TagsState>({ status: 'idle' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch('https://api.example.com/tags', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>; // 把 unknown 的 json() 断言为 string[]
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // 已被取消的请求不更新状态（竞态防护）
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : '未知错误',
        });
      });

    return () => controller.abort(); // 卸载时取消在途请求
  }, []);

  // switch 分支里，TS 根据 status 的字面量自动收窄每个分支的可用字段
  switch (state.status) {
    case 'idle':
      return <p>尚未开始加载</p>;
    case 'loading':
      return <p>加载中…</p>;
    case 'success':
      return (
        <ul>
          {state.data.map((tag) => (
            // 这里 state.data 一定是 string[]，不需要判空
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      );
    case 'error':
      return <p role="alert">出错了：{state.message}</p>; // state.message 一定是 string
  }
}
```

注意 `switch` 没有 default：因为四个分支穷尽了联合，TS 知道函数到这里必然返回。将来给 `TagsState` 加第五个分支（比如 `{ status: 'empty' }`）而忘了改 switch，函数"存在未返回的路径"会直接编译报错——又一个编译期兜底。想更严格，可以加"穷尽性检查"惯用法：

```ts
default: {
  const _exhaustive: never = state; // 若有分支漏判，state 不可能是 never，此行报错
  return _exhaustive;
}
```

**JSX 内联分支也支持收窄。** 判别联合的收窄不只发生在 switch 里，if、三元、`&&` 都行：

```tsx
{state.status === 'success' && <TagCount count={state.data.length} />}
```

这一行里 `state.data` 的收窄由 `state.status === 'success'` 这个条件自动完成。**但注意**：收窄只在"同一层控制流"里有效——把 `state` 解构出来（`const { status } = state`）再用，`data` 的依赖关系还在（TS 4.6+ 支持判别联合解构后的收窄）；但如果把 state 传进回调函数里，收窄丢失，需要重新判断。原则：**分支判断与字段使用写在同一个作用域，不要隔着一个函数边界**。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`useState(false)` 起手，后来想存对象，`setLoading({ ... })` 报错。根因：初始值把类型锁死为 `boolean`。修法：状态的"完整形状"一开始就设计好（用判别联合），宁可后面加分支，不要后面换类型。
2. 症状：`const [level, setLevel] = useState('info')`，把 `level` 传给要求 `'debug' | 'info' | 'error'` 的子组件时报错 `string 不能赋给联合`。根因：初始值推导出宽泛的 `string`，字面量类型丢了。修法：显式 `useState<Level>('info')`。
3. 症状：`setState({ status: 'success' })` 编译报错缺 `data`。根因：这不是坑，这是**这个模式的价值**——分支对象必须完整，运行时的"忘了带数据"被提前到编译期。修法：把数据带上；如果真的存在"成功但无数据"的语义，那应该是独立的 `empty` 分支。
4. 症状：在 `.then` 回调里访问 `state.data`，TS 说 data 可能不存在。根因：回调函数跨越了控制流边界，外面的收窄不可信（回调执行时机晚）。修法：在分支内部同步使用字段；异步回调里重新判断，或把需要的数据先存入局部变量。

---

### 3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）

**是什么。** 泛型组件/泛型 hook 是"类型参数由调用点决定"的组件与 hook：`<Select<Level> ...>` 或 `useRequest<Todo[]>(url)`。绝大多数时候泛型参数可以省略——TS 会从传入的 props/实参**推断**出来。

**为什么需要。** 看一个不用泛型的 Select 会烂在哪：

```tsx
// ❌ 非泛型版：value、options.value、onChange 的入参被迫用宽类型
interface SelectProps {
  value: string | number | null;
  options: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
}
```

后果：调用方传了 `{ value: 'debug' | 'info' | 'error' }` 的选项数组，回调拿到的参数却是 `string | number`，赋给自己的 `Level` 状态直接报错；更糟的是 `options` 里混进一个 `value: 1` 也没人管。**泛型的意义：让"同一个组件"里的多个位置共享同一个类型变量**——options 的 value 类型、受控 value 类型、onChange 回调参数类型，三者被 T 绑定为同一个东西，一处推断、处处一致。

**怎么做（机制分步）。**

1. 在函数签名上声明类型参数并约束：`function Select<T extends string | number>`（约束保证可比较、可作 key）。
2. Props 接口也带 `<T>`，凡"应该一致"的字段都用 T。
3. 调用点通常不写 `<Level>`：从 `options`/`value` 自动推断；推断退化时再显式标注。

**代码示例：泛型 Select 完整实现。**

```tsx
// src/components/Select.tsx
import { useState, type ReactNode } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

export interface SelectProps<T extends string | number> {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}

// 注意：泛型组件必须用函数声明（或函数表达式），不能标 FC，原因见第 4 节
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = '请选择',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="select">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {options.find((o) => o.value === value)?.label ?? placeholder}
      </button>
      {open && (
        <ul role="listbox">
          {options.map((option) => (
            <li key={String(option.value)} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value); // option.value 的类型就是 T，调用方拿到的不是宽类型
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

调用方视角——体会 T 的自动推断：

```tsx
import { useState } from 'react';
import { Select } from './Select';

type Level = 'debug' | 'info' | 'error';

// satisfies：检查数组形状满足 { value: Level } 的要求，同时保留每个 value 的字面量类型
const levelOptions = [
  { value: 'debug', label: '调试' },
  { value: 'info', label: '信息' },
  { value: 'error', label: '错误' },
] satisfies { value: Level; label: string }[];

export function LogFilter() {
  const [level, setLevel] = useState<Level>('info');

  return (
    <Select
      options={levelOptions} // T 被推断为 'debug' | 'info' | 'error'
      value={level}
      onChange={(next) => setLevel(next)} // next 自动是 Level，setLevel 不报错
    />
  );
}
```

这里有个关键细节：如果 `levelOptions` 没用 `satisfies`（或 `as const`）而是先声明成 `{ value: string; label: string }[]` 的变量，T 会被推断成 `string`，`setLevel(next)` 立刻报错。**泛型的推断质量取决于传入数据的字面量保留程度**——`satisfies` 是既检查形状又不丢字面量的最优解。

**泛型 Hook：`useRequest<T>` 完整实现。** 它把上一节的请求状态机封装成可复用的 hook，T 表示"接口响应体的类型"。请重点看三处泛型相关的注释：

```tsx
// src/hooks/useRequest.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/** 请求状态：判别联合（与上一节 TagsState 同一模式，data 换成了泛型 T） */
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export type UseRequestResult<T> = RequestState<T> & {
  /** 手动重新发起请求 */
  refetch: () => void;
};

export function useRequest<T>(url: string, init?: RequestInit): UseRequestResult<T> {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' });

  // 保存"当前这次请求"的 AbortController：url 变化或组件卸载时用来取消旧请求
  const controllerRef = useRef<AbortController | null>(null);

  // init 通常是调用方每次渲染新建的对象字面量，引用每次都变；
  // 直接放进 useCallback 依赖会导致请求函数每次渲染都重建、effect 反复重跑。
  // 存进 ref：只取"最新的值"，不参与依赖比较。
  const initRef = useRef(init);
  initRef.current = init;

  const run = useCallback(async () => {
    controllerRef.current?.abort(); // 发起新请求前取消上一个（竞态防护）
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: 'loading' });
    try {
      const res = await fetch(url, { ...initRef.current, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T; // 响应体按 T 解释（调用方负责与真实接口一致）
      if (!controller.signal.aborted) {
        setState({ status: 'success', data });
      }
    } catch (err) {
      if (controller.signal.aborted) return; // 已被更新的请求取消，丢弃过期结果
      setState({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [url]); // 依赖只有 url：URL 变化才应触发重新请求

  useEffect(() => {
    run();
    return () => controllerRef.current?.abort(); // 组件卸载时取消在途请求
  }, [run]);

  return { ...state, refetch: run };
}
```

使用示例——T 由调用点显式指定，从此 `data` 全链路有类型：

```tsx
import { useRequest } from './hooks/useRequest';

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export function TodoList() {
  // 显式写 <Todo[]>，请求结果在 success 分支就是 Todo[]
  const { status, data, error, refetch } = useRequest<Todo[]>(
    'https://jsonplaceholder.typicode.com/todos?_limit=5',
  );

  if (status === 'loading') return <p>加载中…</p>;
  if (status === 'error') {
    return (
      <button onClick={refetch}>加载失败：{error.message}，点击重试</button>
    );
  }
  if (status !== 'success') return null; // idle

  return (
    <ul>
      {/* data 已收窄为 Todo[]，todo.title、todo.completed 都有类型与补全 */}
      {data.map((todo) => (
        <li key={todo.id}>
          {todo.completed ? '✓' : '○'} {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

再强调一次诚实边界：`as T` 只是"你向编译器保证响应是这个形状"，运行时没人检查。线上接口悄悄改字段，类型不会救你；要真安全，在 `run` 里接一层运行时校验（如 zod：`TodoSchema.parse(raw)`，校验失败落入 error 分支），这也是阶段 9 Server Actions 里会用到的手法。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：想写 `const Select: FC<SelectProps<T>> = ...`，报 `Cannot find name 'T'`。根因：`T` 是**函数**的类型参数，而 FC 的写法把类型放在了值的类型标注位置，没有地方声明 T。修法：泛型组件必须写成函数声明/表达式 `function Select<T>(props: SelectProps<T>) {...}`——这也是"新代码不再推荐 FC"的直接原因之一，详见下节。
2. 症状：泛型推断出 `string` 而不是字面量联合，onChange 回调传给 `setLevel` 报错。根因：传入的 options 数组先被存成了宽类型变量，字面量信息丢失。修法：`satisfies` 约束形状、或 `as const` 断言，保证字面量保留。
3. 症状：把 `init` 对象直接写进 `useCallback` 依赖后，每次渲染都重新发请求。根因：调用处 `<Comp init={{ headers: {...} }} />` 每次渲染都是新对象，引用不等 → `run` 重建 → effect 重跑 → setState → 又渲染，形成循环。修法：如上用 ref 快照；或要求调用方 `useMemo` 住 init。这是自定义 hook 设计的通用课题：**哪些参数进依赖、哪些只取最新值**。
4. 症状：`useRequest<Todo>(url)` 少写了数组，`data.map` 报 `map 不存在于 Todo`。根因：接口返回数组时 T 应为 `Todo[]`。修法：泛型参数写完整形状；从接口文档复制示例 JSON 反推类型是好习惯。

---

### 4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍

**是什么。** 这三个类型描述"React 可渲染物"的三个层次，加上 `FC`/`ComponentType` 两个"组件类型"，构成 React 类型系统的主干。分不清它们的直接代价：props 类型写错位置、children 类型收不进来、接收组件的 prop 写成接收元素的类型。

**三者的定义与关系。** 看 `@types/react` 的简化定义：

```ts
// 简化示意，帮助理解层次关系
interface ReactElement<P = unknown> {
  type: string | ((props: P) => ReactNode); // 'div' 或组件函数
  props: P;                                 // 传给它的 props
  key: string | number | null;              // 列表 key
}

type ReactNode =
  | ReactElement        // 一个元素
  | ReactPortal         // createPortal 的返回值
  | string              // 文本节点
  | number              // 数字
  | boolean             // React 19 类型：渲染为空（{cond && <X/>} 的 false 分支）
  | Iterable<ReactNode> // Fragment、数组、嵌套组合
  | null
  | undefined
  | Promise<ReactNode>; // React 19 新增：异步组件的返回值也合法
```

一句话记住包含关系：**`JSX.Element` 是 `ReactElement` 的一种（默认泛型实例化），`ReactElement` 是 `ReactNode` 的一个成员**。`<div />` 求值后是一个 `JSX.Element`（一个普通对象）；而 `<div>总分：{score}</div>` 整体的类型是 `ReactNode`（元素 + 字符串 + 数字的混合物）。所以：

- children、插入点 `{...}` —— 用 **ReactNode**（要"装下一切"）。
- 变量里存"一个元素"、props 传插槽 —— 用 **ReactElement**（要"恰好一个元素"，比如传给 cloneElement）。
- `JSX.Element` —— 你几乎不需要直接写它；它是全局 JSX 命名空间下的产物，React 18 起全局 `JSX` 命名空间已迁移到 `React.JSX`（避免多框架同装时命名空间冲突），写 `React.JSX.Element`。判断标准很简单：如果你发现自己要写 `JSX.Element`，九成应该写 `ReactNode`。

**FC 的历史包袱与现状建议（本节重点）。** `FC`（FunctionComponent）曾是标注函数组件的标准姿势，它经历过一次重要的语义变化，理解这段历史才能理解今天的建议：

- **React 17 及更早的 @types/react**：`FC<Props>` 隐含了 `children?: ReactNode`（等价于自动 `PropsWithChildren<Props>`）。任何 FC 组件都"默默接受任意 children"。
- **代价**：设计上不该有 children 的组件（比如 `<Icon />`）写上 `<Icon>点我</Icon>` 不报错，"点我"被静默吞掉——这成了大量静默 bug 的来源。
- **@types/react 18（2022 年起）**：移除了隐含 children。`FC<Props>` 只表示 `(props: Props) => ReactNode`，要用 children 必须显式写 `PropsWithChildren<Props>` 或自己声明 children 字段。

FC 如今还提供什么、又失去什么：

| 维度 | FC | 普通函数（推荐） |
|---|---|---|
| 返回类型 | 自动约束为 ReactNode | 自动推导，同样安全（配 `react-jsx` 转换） |
| children | 不再隐含（需 PropsWithChildren） | 不隐含（需 PropsWithChildren） |
| 泛型组件 | **无法表达** | 直接 `function Select<T>()` |
| 异步组件（返回 Promise） | React 19 类型下兼容 | 兼容 |
| 可读性 | 多一层包装 | 函数签名即全部信息 |
| 官方示例 | 不使用 | react.dev 全部用普通函数 |

结论：**新代码用普通函数声明**，react.dev 的所有示例也是这么写的。FC 不是禁用项（老项目大量存在），但它的两个历史收益（隐含 children、早期 TS 无法推导 JSX 返回类型时提供标注）一个被移除、一个被现代 TS 取代，剩下的只有约束返回类型这一个边际好处，而它恰恰挡住了泛型组件。代码对照：

```tsx
import type { FC, PropsWithChildren } from 'react';

// —— FC 写法（历史姿势）——
// @types/react 18+ 里 FC 不再隐含 children：
const CardA: FC<{ title: string }> = ({ title }) => (
  <section><h2>{title}</h2></section>
);
// <CardA title="a">正文</CardA>  ← 现在会报错：children 不在 props 里

// 需要 children 的 FC 必须显式包 PropsWithChildren：
const CardB: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

// —— 普通函数写法（推荐，react.dev 风格）——
function Card({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

泛型与 FC 的冲突回看一眼（上一节坑 1 的根因）：

```tsx
// ❌ T 在 FC 的类型标注位置无处声明，直接编译错误
// const Select: FC<SelectProps<T>> = (props) => { ... }

// ✅ 泛型组件天然属于函数声明
function Select<T extends string | number>(props: SelectProps<T>) {
  /* ... */
}
```

**ComponentType：接收"组件"作为 props 时用。** 与 `ReactElement`（接收"已渲染的元素"）严格区分，二者不可互换：

```tsx
import type { ComponentType, ReactElement } from 'react';

interface RowProps<T> {
  item: T;
}

interface ListProps<T> {
  items: T[];
  /** 传"组件类型"（类或函数组件）：每个 item 需要单独实例化时用它 */
  RowComponent: ComponentType<RowProps<T>>;
  /** 传"元素"（已经渲染好的 JSX）：静态内容（空态兜底）用它 */
  emptyFallback?: ReactElement;
}

function List<T>({ items, RowComponent, emptyFallback }: ListProps<T>) {
  if (items.length === 0) return emptyFallback ?? <p>暂无数据</p>;
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          <RowComponent item={item} /> {/* 组件在此实例化，item 的类型就是 T */}
        </li>
      ))}
    </ul>
  );
}
```

三个"把渲染交给别人"的类型怎么选：

| props 类型 | 语义 | 典型用法 |
|---|---|---|
| `ComponentType<P>` | 传组件，组件会被 `<X {...P} />` 实例化 | 每行渲染器、图标组件映射表 |
| `ReactElement` | 传一个现成元素，直接放进树里 | fallback、空态、右侧插槽 |
| `(data: T) => ReactNode` | 传函数（render props） | 同样能按 item 实例化，且更轻量，不要求对方是"组件" |

**常见坑（症状 → 根因 → 修法）。**

1. 症状：项目从 @types/react 17 升到 18 后，一批 FC 组件的 children 用法集体报错。根因：FC 隐含 children 被移除。修法：需要 children 的组件补 `PropsWithChildren<...>`；不需要的组件顺手删掉误用的 children——这批报错正是当年埋下的静默 bug 被翻出来。
2. 症状：`<List RowComponent={<Row />} />` 运行时报 "Element type is invalid"。根因：把**元素**传给了期待**组件**的位置，`<RowComponent />` 处等于对元素再求值。修法：传 `RowComponent={Row}`（不带尖括号）；类型上 ComponentType 与 ReactElement 不兼容，故意写错会在编译期暴露，所以这种 bug 多发生在无类型的 JS 文件里。
3. 症状：`cloneElement(children, { onClick })` 时 props 类型全是 any。根因：children 被声明成了宽泛的 ReactNode。修法：窄化声明 `children: ReactElement`（cloneElement 本身已不推荐用于新代码，优先用 render props 或直接传函数）。

---

### 5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）

**是什么。** 组件的视觉变体（尺寸、色调、风格）用**字面量联合类型**表达，变体到类名/样式的映射用 `Record` 表达；再进一步，用**模板字面量类型**（template literal type）约束"由规则拼出来的字符串"（如 `"8px"`、`var(--space-md)`）。这两招是所有 CSS-in-TS 方案（含 tailwind-variants、cva）的类型基础。

**为什么需要。** 样式 props 的两大痛点：字符串魔法值（`size="大"` 拼错无人知道）和样式映射散落（if/else 三元连缀，新增一个变体要改五处）。类型约束把"允许哪些值"变成编译期契约，`Record` 把"值到样式的映射"变成一张必须填完整的表。

**怎么做（机制分步）。**

1. 变体定义为字面量联合：`type Variant = 'small' | 'medium' | 'large'`。
2. 类名映射定义为 `Record<Variant, string>`——Record 的 key 必须**穷尽**联合的每个成员，漏一个编译报错。
3. props 用联合类型 + 默认值；新增变体时先扩联合，编译器立刻标红所有要补的 Record。

**代码示例：Variant 联合 + Record 映射的 Badge。**

```tsx
// src/components/Badge.tsx
import type { PropsWithChildren } from 'react';

type Variant = 'small' | 'medium' | 'large';
type Intent = 'primary' | 'secondary' | 'danger';

// Record：key 必须覆盖联合的每一个成员。新增 'xlarge' 到 Variant 时，
// 这里会立刻报错"缺少 xlarge"，强迫你补全映射——穷尽性由编译器保证。
const variantClasses: Record<Variant, string> = {
  small: 'px-2 py-0.5 text-xs',
  medium: 'px-3 py-1 text-sm',
  large: 'px-4 py-1.5 text-base',
};

const intentClasses: Record<Intent, string> = {
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-slate-200 text-slate-800',
  danger: 'bg-red-600 text-white',
};

interface BadgeProps {
  variant?: Variant; // 不传则用默认值 medium
  intent?: Intent;   // 不传则用默认值 primary
}

export function Badge({ children, variant = 'medium', intent = 'primary' }: PropsWithChildren<BadgeProps>) {
  const className = [variantClasses[variant], intentClasses[intent]].join(' ');
  return <span className={`inline-flex rounded font-medium ${className}`}>{children}</span>;
}
```

对比一下没有 Record 的写法（if/三元连缀），新增变体的改动点从"1 处联合 + 1 处映射"退化成"5 处 if"，而且漏改哪一处都不会报错。**Record 映射的本质是把"样式分支"从控制流变成数据**，查表 O(1)，类型系统还能验证表的完整性。

**模板字面量类型：约束"拼出来的字符串"。** 当合法值是一个规则而不是有限集合时（比如任意合法 CSS 长度），用模板字面量类型描述规则：

```ts
/** 只接受 "8px"、"1.5rem" 这类合法长度字符串；"abc"、"8" 都不合法 */
type Length = `${number}px` | `${number}rem`;

/** 由基础 token 拼出 CSS 变量名 */
type Space = 'sm' | 'md' | 'lg';
type SpaceVar = `var(--space-${Space})`;
// 推导结果：'var(--space-sm)' | 'var(--space-md)' | 'var(--space-lg)'

/** Tailwind 式组合：基础色 × 明度档位 */
type Shade = 50 | 100 | 200 | 300;
type ColorToken = `bg-${'blue' | 'gray'}-${Shade}`;
// 推导结果：'bg-blue-50' | 'bg-blue-100' | ... | 'bg-gray-300' 共 8 个成员
```

放进组件 props：

```tsx
interface StackProps {
  /** 间距："8px" 合法，"abc" 编译报错 */
  gap?: Length;
  /** 内边距：只能引用设计 token，禁止随手写魔法数 */
  padding?: SpaceVar;
}

export function Stack({ gap = '8px', padding = 'var(--space-md)', children }: PropsWithChildren<StackProps>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, padding }}>
      {children}
    </div>
  );
}
```

**重要边界：模板字面量是编译期检查。** 来自接口、URL、localStorage 的字符串不会经过编译器。运行时入口必须配 guard：

```ts
function isLength(value: string): value is Length {
  return /^\d+(\.\d+)?(px|rem)$/.test(value);
}

const raw: unknown = JSON.parse(localStorage.getItem('gap') ?? '"8px"');
const gap = typeof raw === 'string' && isLength(raw) ? raw : '8px'; // 不合法就回退默认值
```

**cva 提及。** 上面"联合 + Record + 默认值"的三件套，社区库 cva（class-variance-authority）帮你标准化了，并额外解决"props 类型与类名映射要写两遍"的问题——用 `VariantProps` 从 cva 配置**反推** props 类型：

```tsx
// bash: npm install class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';
import type { PropsWithChildren } from 'react';

const badge = cva('inline-flex rounded font-medium', {
  variants: {
    intent: {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-slate-200 text-slate-800',
      danger: 'bg-red-600 text-white',
    },
    size: {
      small: 'h-5 px-2 text-xs',
      medium: 'h-6 px-3 text-sm',
      large: 'h-8 px-4 text-base',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'medium',
  },
});

// VariantProps<typeof badge> 自动得到 { intent?: 'primary'|'secondary'|'danger'; size?: ... }
// 变体清单只写一处：加变体时改 cva 配置即可，props 类型跟着变
export type BadgeVariants = VariantProps<typeof badge>;

export function CvaBadge({ children, ...variants }: PropsWithChildren<BadgeVariants>) {
  return <span className={badge(variants)}>{children}</span>;
}
```

组件库场景下 cva 的完整工程化（变体设计规范、与 tailwind-variants 对比、主题 tokens）见《[react-组件库实战大纲.md](react-组件库实战大纲.md)》。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：Record 缺 key 编译报错，新手用 `as Record<Variant, string>` 把报错"压掉"。根因：把类型系统当敌人。修法：这个报错是**功能不是故障**——它保证新增变体时映射必然补全。永远不要用 as 绕过穷尽性检查。
2. 症状：映射表对象被推断成宽类型，`variantClasses[variant]` 报"索引不存在"。根因：对象先存变量再标注时写成了 `const m = {...}; const variantClasses: Record<...> = m` 之外的奇怪路径，或中间夹了一层函数。修法：声明时直接标注（如示例那样一步到位）；对象需要保留字面量推导时配 `satisfies`。
3. 症状：模板字面量类型把 API 返回的字符串放行了，运行时样式坏了。根因：编译期类型对运行时数据无约束力。修法：运行时入口一律加 guard（如上 `isLength`），非法值回退默认值并上报日志。

---

### 6. 给第三方 JS 库写 `.d.ts` 声明

**是什么。** `.d.ts` 是"类型声明文件"（declaration file）：只有类型、没有实现，用来告诉 TS"这个模块长什么样"。给无类型的第三方 JS 库手写声明，核心语法是环境模块声明 `declare module '包名' { ... }`。

**为什么需要。** npm 生态里大量小而美的库是纯 JS 的（无类型、也无 @types 包）。`import toast from 'tiny-toast'` 一旦解析不到类型，整个 import 静默变成 `any`——不止这一个文件，**所有使用它的下游代码的检查全部失效**（`strict` 模式下污染沿调用链扩散）。补上 `.d.ts` 后，any 的洞被堵住，补全与报错全部恢复。这是渐进式类型系统的"补墙"工作。

**怎么做（流程分步）。** 动手写之前先按顺序排查，避免重复造轮子：

1. **查 DefinitelyTyped**：`npm install -D @types/包名`。社区类型仓库覆盖了绝大多数流行库，有现成的就不要自己写。
2. **查包本身**：看它的 package.json 有没有 `types`/`typings` 字段、仓库里有没有 `*.d.ts`——很多新库已内置类型。
3. **都没有才自己写**：在项目里建 `src/types/包名.d.ts`，按 README 的 API 写 `declare module`。
4. **（可选）回馈社区**：声明写稳定后，提 PR 到 DefinitelyTyped，别人就不用再写一遍。

**代码示例：为一个典型 JS 小库补全声明。** 假设项目用了虚构的纯 JS 库 `tiny-toast`，其 README 描述的 API 是：默认导出一个对象，`success/error/info(message, options?)` 返回数字 id，`dismiss(id)` 手动关闭，options 支持 `duration`（毫秒）、`position`（'top'/'bottom'）、`onClose` 回调。对应的声明文件：

```ts
// src/types/tiny-toast.d.ts
// 文件名任意、后缀必须是 .d.ts；这里的内容是对外部模块的"环境声明"（ambient declaration）

declare module 'tiny-toast' {
  /** 可配置项：与库 README 逐条对应，能可选的全部可选 */
  export interface ToastOptions {
    /** 显示时长（毫秒），默认 3000 */
    duration?: number;
    /** 出现位置，默认 'top' */
    position?: 'top' | 'bottom';
    /** 关闭回调，参数是这条 toast 的 id */
    onClose?: (id: number) => void;
  }

  /** 默认导出对象上的方法集合 */
  export interface ToastApi {
    success(message: string, options?: ToastOptions): number;
    error(message: string, options?: ToastOptions): number;
    info(message: string, options?: ToastOptions): number;
    /** 手动关闭指定 id 的 toast */
    dismiss(id: number): void;
  }

  const toast: ToastApi;
  export default toast;
}
```

写完立即生效（TS 会把项目内所有 `.d.ts` 自动纳入），使用体验的变化：

```tsx
import { useEffect } from 'react';
import toast from 'tiny-toast';

export function SaveButton() {
  useEffect(() => {
    const id = toast.success('保存成功', { duration: 2000 }); // id: number，options 有补全
    return () => toast.dismiss(id); // 组件卸载时关掉，避免僵尸提示
  }, []);

  // toast.succes('拼写错误'); // ❌ 编译期标红，而不是运行时 undefined is not a function
}
```

**确保声明被编译器看到。** `.d.ts` 必须落在 tsconfig 的 `include` 覆盖范围内。Vite + React 项目的常规配置（`src/types/` 在 `src` 下，天然被覆盖）：

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**两个进阶变体。**

其一，老旧 CommonJS 库用 `export =` 导出（module.exports = 整个函数）：

```ts
declare module 'old-cjs-lib' {
  interface Options { retries?: number }
  function main(input: string, options?: Options): Promise<string>;
  export = main; // CJS 风格导出：配合 tsconfig 的 esModuleInterop，import main from 'old-cjs-lib' 可用
}
```

其二，**模块扩充**（module augmentation）——库**已有**类型，你想补充（或给它的接口打补丁）。同样是 `declare module`，但因为目标模块存在类型，这里是"追加"而不是"凭空声明"：在 `declare module 'tiny-toast' { interface ToastApi { addToast(message: string): number } }` 里给 ToastApi 追加新方法（库新版加了方法、官方类型还没跟上的场景）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：写了 `.d.ts` 但 import 还是 any。根因（按概率排序）：声明文件不在 tsconfig `include` 范围内；`declare module 'tiny-toast'` 的模块名与 import 的字符串**不完全一致**（差一个 `@scope/` 前缀或子路径，比如声明了主包却 import 了 `tiny-toast/lite`）。修法：先确认 include，再逐字符比对模块名；子路径入口需要为 `'tiny-toast/lite'` 单独声明。
2. 症状：import 默认导出拿到 undefined。根因：库实际是 CJS（`export =`），声明却写成了 `export default`；或反之。修法：打开库的产物代码确认导出形式，声明与实现严格对应。
3. 症状：`declare module 'x' {}` 空着先"占个位"。根因：空花括号是合法的"简写环境模块"，效果是把整个模块声明为 any——比不写更糟（让 any 显得像有类型）。修法：占位也别用空壳，至少把已用到的函数签名写上。
4. 症状：改了 `.d.ts` 后 IDE 没更新。根因：TS 语言服务的缓存。修法：重启 TS Server（VS Code 命令面板 "TypeScript: Restart TS Server"）。

---

**阶段 7 收束。** 六个场景串起来是一条能力线：第 1、2 条让你**写对**自己的组件；第 3、4 条让你**设计**给别人用的组件与 hook（泛型与组件类型的取舍是库作者的基本功）；第 5 条把类型系统延伸到视觉层；第 6 条把类型边界修到第三方生态。检验这一周的标准很简单：打开你阶段 3 写的迷你组件库，给每个组件补齐完整的 Props 类型、把 Select 改造成泛型组件、给 useFetch 重构成本节的 `useRequest<T>`——改完之后，"调用方传错东西"这件事在你的项目里应该已经属于编译错误了。类型就位后，下一阶段进入质量保障的另一半：自动化测试。

## 阶段 8：测试与质量（1 周）

写到这里，你的项目已经有一定规模了。此刻问自己一个问题：**改一行共享组件的代码，你敢直接发布吗？** 如果答案是不敢，说明项目缺的正是这一周的内容——自动化质量保障。测试不是"额外的工作"，而是把"改代码后的手动回归"（点开每个页面看一遍）变成一条命令几秒钟跑完的机器。

先建立全局策略，避免在错误的层写测试：

- **组件测试（Vitest + Testing Library）是主力**：数量最多、跑得最快、失败定位最准，覆盖交互逻辑与渲染输出。
- **E2E 测试（Playwright）是主干**：只写最关键的几条用户路径（登录、下单、发布），它验证"整个应用拼起来能不能用"，但慢且脆，所以少而精。
- **线上监控（ErrorBoundary + 全局错误 + Sentry）是兜底**：再好的测试也拦不住所有问题，线上出错的最后一道感知线是错误上报。

原大纲条目（骨架）：

1. Vitest + Testing Library：按角色查询优先（`getByRole`）、`screen`、断言
2. `user-event` 模拟交互（点击、输入、键盘）
3. mock：`vi.mock` 模块、mock fetch、测试异步加载完成态（`findBy` / `waitFor`）
4. 自定义 Hook 测试：`renderHook` + `act`
5. 组件测试范式：测行为不测实现（不测内部 state）
6. E2E：Playwright 写登录→操作→断言 流程
7. ErrorBoundary + window.onerror + Sentry 上报接入

---

### 1. Vitest + Testing Library：按角色查询优先（`getByRole`）、`screen`、断言

**是什么。** Vitest 是测试运行器（由 Vite 团队开发，配置复用 Vite 的转译管线，与你的 React + TS 项目零摩擦）；Testing Library 是 DOM 查询与交互工具库（`@testing-library/react` 提供 `render`/`screen`，`@testing-library/jest-dom` 提供专门针对 DOM 的断言匹配器）。两者组合是当前 React 组件测试的事实标准。

**为什么需要。** 组件测试要回答的问题是："给定这些 props 与交互，**用户看到的**是什么"。这句话里最重的词是"用户看到的"——它决定了 Testing Library 的核心设计：**只暴露按用户可感知方式查询 DOM 的 API**（按角色、按文本、按标签），刻意不提供"按组件实例、按内部 state"查询的能力，从工具层面逼你写出健壮的测试（第 5 条会展开）。

**怎么做（环境配置分步）。**

第一步，安装依赖：

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

`jsdom` 提供浏览器 DOM 的 Node 实现——组件测试跑在 Node 里，需要它模拟出 `document`、`window`。

第二步，写 `vitest.config.ts`（与 `vite.config.ts` 分开，职责更清晰）：

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // 复用 Vite 的 JSX/TS 转译，测试文件里的 .tsx 不需要额外配置
  test: {
    environment: 'jsdom',          // 默认是 node，组件测试需要 DOM 环境
    globals: true,                 // 让 test/expect/vi 像全局变量一样可用（也可关掉改用显式 import）
    setupFiles: ['./src/setupTests.ts'], // 每个测试文件执行前先跑它
  },
});
```

第三步，写 setup 文件，注册 jest-dom 匹配器与组件清理：

```ts
// src/setupTests.ts
import '@testing-library/jest-dom/vitest';
```

这里有个值得讲清的机制：**组件清理（cleanup）**。`render` 会把组件真的挂到 jsdom 的 document 上，测试结束不清理，下一个测试的查询就可能命中上一个测试遗留的 DOM（同名按钮找到两个，测试诡异地时好时坏）。Testing Library 的处理方式：当检测到全局 `afterEach` 可用（即 `globals: true`）时**自动注册清理**；如果你把 `globals` 关掉，就必须手动注册：

```ts
// globals: false 时的 setupTests.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup(); // 每个 test 结束后卸载已渲染的组件
});
```

第四步，加脚本命令：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

`vitest` 默认进入 watch 模式（本地开发用），CI 里用 `vitest run` 跑一遍就退出。

**第一个测试。** 待测组件与测试文件：

```tsx
// src/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      {/* aria-label 让纯数字也有可访问名称，视觉与查询双受益 */}
      <span aria-label="当前计数">{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>加一</button>
    </div>
  );
}
```

```tsx
// src/Counter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { Counter } from './Counter';

test('点击按钮后计数加一', async () => {
  const user = userEvent.setup(); // 第 2 条详讲：所有交互都通过 user 实例发起
  render(<Counter />);

  // 按角色 + 可访问名称查询按钮——用户与读屏软件就是这样"看到"它的
  await user.click(screen.getByRole('button', { name: '加一' }));

  expect(screen.getByLabelText('当前计数')).toHaveTextContent('1'); // jest-dom 提供的匹配器
});
```

运行 `npm test`，看到绿色即通。`screen` 是全局查询入口：它持有 render 挂载的容器，让你不必在每个断言间传递 `container` 对象——凡是"查询"都从 `screen.` 开始，这也是社区统一的代码风格。

**查询优先级：为什么 `getByRole` 第一。** Testing Library 官方给查询排了优先级，依据只有一条原则：**查询方式越接近用户（和辅助技术）感知页面的方式，测试越可信**。

| 优先级 | 查询 | 适用场景 | 说明 |
|---|---|---|---|
| 1 | `getByRole` | 绝大多数交互元素 | 按可访问角色查（button/link/heading/textbox…），可加 `name` 选项精确定位；顺手暴露可访问性问题 |
| 2 | `getByLabelText` | 表单控件 | label 与 input 关联后按标签文字查，模拟"用户读标签找输入框" |
| 3 | `getByPlaceholderText` | 表单兜底 | 占位符会在输入后消失，且不是所有用户能看到，只作补充 |
| 4 | `getByText` | 非交互文本 | 静态文案、段落、标题内容 |
| 5 | `getByDisplayValue` | 表单当前值 | 断言输入框/下拉的当前值时用 |
| 6 | `getByAltText` | 图片 | img 的 alt |
| 7 | `getByTitle` | 悬浮提示 | title 属性与 svg 的 title |
| 8 | `getByTestId` | 最后手段 | 前七种都无法定位时才用，`data-testid="xxx"` |

逐条展开关键的几行：

- **第 1 行（byRole）为什么最优**：角色来自 HTML 语义（`button` 元素的角色就是 button），`name` 选项匹配的是可访问名称（按钮文字、aria-label）。用它查询有个极有价值的副产品——**查询本身就是可访问性检查**：一个用 `div` + onClick 假装的按钮，`getByRole('button')` 找不到它，测试写不下去，你会被迫改成真 `button`。测试质量与页面可访问性同向而行。
- **第 2 行（byLabelText）是表单首选**：`<label htmlFor="email">邮箱</label><input id="email">` 之后 `getByLabelText('邮箱')` 能定位输入框。它要求 label 正确关联——又一次"测试倒逼语义正确"。
- **第 4 行（byText）只用于非交互内容**：按钮、链接不要用 byText 查——同样文案"删除"可能既是按钮又是表格里的一行文字，byText 会命中多个；按角色 + 名称查则天然精确。
- **第 8 行（byTestId）是逃生舱不是默认项**：testid 不对应任何用户感知的东西，查询一旦依赖它，改文案、改语义测试都不受影响——看似稳定，实则放弃了"测试验证可访问结构"的全部价值。只有纯装饰性、无语义锚点的节点（比如某个图表容器）才退而求其次。

**六种查询函数变体。** 每种 `getByXxx` 都有六兄弟，行为差异是面试与实战双高频点：

| 变体 | 0 个匹配 | 1 个匹配 | 多个匹配 | 典型用途 |
|---|---|---|---|---|
| `getByRole` | **抛错** | 返回元素 | **抛错** | 默认选择：元素必须在场且唯一 |
| `queryByRole` | 返回 `null` | 返回元素 | 抛错 | 断言"**不存在**"：`expect(queryByRole(...)).not.toBeInTheDocument()` |
| `findByRole` | 超时后抛错 | Promise 返回元素 | 抛错 | 异步出现的元素：`await findByRole(...)` 自动重试 |
| `getAllByRole` | 抛错 | 元素数组 | 元素数组 | 列表断言：`getAllByRole('listitem')` 配 `.toHaveLength(5)` |
| `queryAllByRole` | 空数组 | 数组 | 数组 | 断言"一个都没有"或数量范围 |
| `findAllByRole` | 超时后抛错 | Promise 数组 | Promise 数组 | 异步列表 |

记忆要点：**get 断在场、query 断不在场、find 等异步**。最常见的误用是"想断言元素不存在却用了 getBy"——`getBy` 在 0 匹配时直接抛错，测试失败的原因会误导你以为是"没渲染出来"而不是"不该存在"。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`found multiple elements with role "button"`。根因：查询粒度太粗，页面上同角色按钮不止一个。修法：加 `name` 选项（`getByRole('button', { name: '删除' })`）；仍多个就用 `getAllBy` 配索引或 `within(某个容器)` 限定范围。
2. 症状：断言"不存在"的测试永远失败，报错却是"找不到元素"。根因：用了 `getBy`（0 匹配即抛错）。修法：不存在断言用 `queryBy`：`expect(screen.queryByText('加载中')).not.toBeInTheDocument()`。
3. 症状：测试时好时坏，报"找到多个同名元素"。根因：上一个测试的 DOM 没清理（globals 关了又没手动 cleanup，或某测试绕过了 setup）。修法：确认 cleanup 注册；不要在测试间共享已 render 的容器。
4. 症状：`toHaveTextContent` 等匹配器报 "not a function"。根因：没引入 `@testing-library/jest-dom/vitest`（或引的是不带 `/vitest` 后缀的老路径，匹配器类型没对上 Vitest）。修法：setup 文件第一行引入 `@testing-library/jest-dom/vitest`。

---

### 2. `user-event` 模拟交互（点击、输入、键盘）

**是什么。** `@testing-library/user-event` 用**模拟完整用户行为链**的方式驱动 DOM：`user.click` 会真的派发 pointerdown、mousedown、focus、mouseup、click 一整套事件；`user.type` 逐字符派发 keydown、输入、keyup 并更新输入框的 value。它替代了旧 API `fireEvent` 的位置。

**为什么需要，与 fireEvent 的差异。** `fireEvent` 是底层逃生舱：它对元素**只派发你指定的那一个事件**。差异表格：

| 维度 | `fireEvent.click(el)` | `await user.click(el)` |
|---|---|---|
| 事件序列 | 仅 click 一个事件 | pointerdown → mousedown → focus → pointerup → mouseup → click 全链 |
| 键盘输入 | 需手动拼 event（value 不会自动变） | `user.type` 每个字符走完整输入链，value 真实变化 |
| disabled 元素 | 照样触发（与浏览器行为不符） | 跳过（与真实浏览器一致） |
| 指针校验 | 无 | 检查 `pointer-events: none` 等条件（被遮住的元素点不中） |
| 与真实用户差距 | 大——依赖单事件的组件会漏测 | 小——绝大多数组件无法区分它和真人 |

真实案例：一个依赖 `focus` 事件显示建议列表的搜索框（阶段 4 的防抖搜索就是），`fireEvent.click` 不触发 focus，组件行为与你预期的"点击后"完全不同；`user.click` 则带出 focus，行为与真人一致。**结论：默认一律 user-event，fireEvent 只在模拟极端场景（某个单独的原生事件、自定义事件）时用。**

**怎么做（三个固定步骤）。**

1. `const user = userEvent.setup();`——在测试体内创建 user 实例（setup 里可传 `{ advanceTimers: vi.advanceTimersByTime }` 之类的选项与 fake timers 协作）。
2. 每次**交互都 await**——`await user.click(...)`、`await user.type(...)`。不 await 是本条最大的坑，见下。
3. 交互之后写断言；异步状态变化配 `findBy`/`waitFor`（第 3 条）。

**代码示例：搜索过滤的完整交互测试。**

```tsx
// src/FruitSearch.tsx
import { useState } from 'react';

const FRUITS = ['apple', 'banana', 'cherry', 'grape'];

export function FruitSearch() {
  const [keyword, setKeyword] = useState('');

  return (
    <div>
      <label htmlFor="fruit">水果搜索</label>
      <input
        id="fruit"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && keyword) {
            alert(`搜索：${keyword}`); // 演示键盘事件；测试里不必覆盖 alert
          }
        }}
      />
      <ul>
        {FRUITS.filter((f) => f.includes(keyword)).map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/FruitSearch.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FruitSearch } from './FruitSearch';

test('输入关键字后列表实时过滤', async () => {
  const user = userEvent.setup();
  render(<FruitSearch />);

  expect(screen.getAllByRole('listitem')).toHaveLength(4); // 初始 4 项

  // 输入 "an"：user.type 逐字符触发完整输入链，受控组件的 value 真实变化
  await user.type(screen.getByLabelText('水果搜索'), 'an');

  expect(screen.getAllByRole('listitem')).toHaveLength(2); // banana / cherry… 实际剩 banana、cherry
});

test('键盘事件：回车触发搜索', async () => {
  const user = userEvent.setup();
  render(<FruitSearch />);
  const spy = vi.spyOn(window, 'alert').mockImplementation(() => {}); // 拦住弹窗

  await user.type(screen.getByLabelText('水果搜索'), ' grape{Enter}'); // {Enter} 是特殊按键语法

  expect(spy).toHaveBeenCalledWith('搜索：grape');
  spy.mockRestore();
});
```

`user.type` 的第二参里，普通字符原样输入，特殊按键用花括号语法：`{Enter}`、`{Escape}`、`{Backspace}`、`{ArrowDown}`、`{Tab}`；修饰键用 `[Shift>]a[/Shift]` 这种成对标记。常用方法还有：`user.clear(el)` 清空、`user.dblClick(el)` 双击、`user.hover(el)` 悬浮、`user.selectOptions(el, '2')` 下拉选择、`user.tab()` 按 Tab 走焦点顺序（测弹层焦点管理常用）、`user.upload(input, file)` 文件上传（配 `new File([...], 'a.png', { type: 'image/png' })`）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：测试里 `user.click(...)` 之后立即断言，断言失败；但手动点页面正常。根因：**忘了 await**。user-event 的每次交互是异步的（涉及事件循环中的焦点转移、受控更新的 flush），不等待就断言，断在状态变化之前。修法：所有 user 方法前加 `await`（把 ESLint 规则 `@typescript-eslint/no-floating-promises` 打开，让它替你盯）。
2. 症状：`user.click` 没报错，但组件的 onClick 没执行。根因：元素 `disabled`、或 CSS `pointer-events: none`、或被透明遮罩盖住——user-event 按真实浏览器规则拒绝点击。修法：这通常是**被测代码的问题**（按钮在 loading 时禁用了），测试应改为断言"禁用状态下点击无效"；确需绕过时 `userEvent.setup({ pointerEventsCheck: 0 })`。
3. 症状：`user.type` 后输入框是空的。根因：组件是非受控 input 但用 `defaultValue` 只在首渲染生效之外的方式控制，或事件被 `e.preventDefault()` 拦截。修法：优先检查被测组件是否正确受控（阶段 3 的受控/非受控）；user.type 走的就是真实输入链，它暴露的问题基本是真问题。
4. 症状：控制台出现 "not wrapped in act(...)" 警告。根因：交互引发的更新没有在 act 内完成——九成是忘 await（坑 1），少数是组件内有定时器/异步回调在第 3、4 条展开。修法：先补 await；仍有警告按第 4 条的 act 机制排查。

---

### 3. mock：`vi.mock` 模块、mock fetch、测试异步加载完成态（`findBy` / `waitFor`）

**是什么。** mock = 用"可控的假实现"替换真实依赖，让测试只关注被测单元。React 组件测试的三类常用 mock：模块级（`vi.mock` 替换整个 import 的模块）、全局函数级（mock `fetch`）、以及断言异步的等待工具（`findBy`/`waitFor`，严格说不算 mock 但总在这一步配合用）。

**为什么需要。** 组件依赖接口、定时器、浏览器全局对象，不 mock 会带来三类问题：测试发真请求（慢、结果不稳定、CI 无外网就挂）；失败原因混淆（是组件逻辑错还是接口挂了）；无法控制分支（接口永远返回成功，错误分支永远测不到）。mock 的本质是把"外部世界"变成测试手里的旋钮。

**怎么做（三种手法分步）。**

**手法一：`vi.mock` 替换模块。** 待测组件从 `./api` 导入 `fetchUser`：

```tsx
// src/api.ts
export interface User { id: number; name: string }
export async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// src/UserCard.tsx
import { useEffect, useState } from 'react';
import { fetchUser, type User } from './api';

export function UserCard({ userId }: { userId: number }) {
  const [state, setState] = useState<{ user: User | null; error: Error | null }>({
    user: null,
    error: null,
  });

  useEffect(() => {
    fetchUser(userId)
      .then((user) => setState({ user, error: null }))
      .catch((error: Error) => setState({ user: null, error }));
  }, [userId]);

  if (state.error) return <p role="alert">加载失败：{state.error.message}</p>;
  if (!state.user) return <p>加载中…</p>;
  return <h2>{state.user.name}</h2>;
}
```

测试文件：

```tsx
// src/UserCard.test.tsx
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';
import { fetchUser } from './api';

// vi.mock 会被 Vitest 提升到整个文件最顶部执行（早于所有 import 语句），
// 所以工厂函数体里不能引用外面定义的变量——见"坑 1"的 vi.hoisted
vi.mock('./api', () => ({
  fetchUser: vi.fn(), // 生产实现被替换为可编程的 mock 函数
}));

test('成功态：展示用户名', async () => {
  // vi.mocked() 把类型收窄为 mock 函数，从而可以配置返回值
  vi.mocked(fetchUser).mockResolvedValue({ id: 1, name: '张三' });

  render(<UserCard userId={1} />);

  // findBy：异步等待元素出现（内部自动重试直到超时）
  expect(await screen.findByRole('heading', { name: '张三' })).toBeInTheDocument();
});

test('失败态：展示错误信息', async () => {
  vi.mocked(fetchUser).mockRejectedValue(new Error('HTTP 500'));

  render(<UserCard userId={1} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
});
```

注意测试之间 mock 状态是**文件内共享**的：Vitest 默认每个测试文件独立，但同文件内多个 test 共用同一个 mock 函数——所以要么每个 test 自己 `mockResolvedValue`（覆盖前值），要么配 `clearMocks: true`（vitest.config 的 `test` 选项里）让每个测试开始时自动清调用记录与返回值配置。

两个进阶写法。**部分 mock**（只替换其中一个函数，其余保持真实实现）：

```ts
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>(); // 拿到真实模块
  return { ...actual, fetchUser: vi.fn() }; // 只换 fetchUser，其余原样
});
```

**在工厂里引用外部变量**要用 `vi.hoisted`（它和 vi.mock 一起被提升，变量因此可用）：

```ts
const { mockFetchUser } = vi.hoisted(() => ({ mockFetchUser: vi.fn() }));
vi.mock('./api', () => ({ fetchUser: mockFetchUser }));
// 现在测试体内可以直接给 mockFetchUser 配返回值
```

**手法二：mock 全局 fetch。** 组件直接调 `fetch`（没有独立 api 模块）时，把 window 上的 fetch 整个换成 mock：

```tsx
// src/PriceList.test.tsx
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PriceList } from './PriceList';

afterEach(() => {
  vi.unstubAllGlobals(); // 恢复所有被 stub 的全局对象，防止污染其他测试
});

test('渲染接口返回的价格', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      // 用真的 Response 对象：res.ok / res.json() 行为与生产一致
      new Response(JSON.stringify([{ id: 1, price: 9.9 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  render(<PriceList />);

  await waitFor(() => expect(screen.getByText('¥9.9')).toBeInTheDocument());
});
```

需要"第一次失败、重试后成功"这类序列时，用 `vi.fn().mockResolvedValueOnce(失败响应).mockResolvedValueOnce(成功响应)` 串行配置——Once 队列消耗完后落到 `mockResolvedValue` 的兜底值。

**手法三：`findBy` vs `waitFor`——异步等待的两把刀。** 都解决"断言时机早于异步完成"的问题，分工不同：

| 维度 | `findByXxx` | `waitFor` |
|---|---|---|
| 本质 | `getBy` + 自动重试（官方明说就是二者的组合） | 对"任意断言/谓词"自动重试 |
| 返回值 | Promise<元素>（拿到元素本身） | Promise<void>（断言通过即返回） |
| 适用 | 等一个/一组元素**出现** | 等一个**条件**：元素消失、mock 被调用、`disabled` 变化等 getBy 表达不了的场景 |
| 默认超时 | 1000ms（可配 `{ timeout: 3000 }`） | 同左 |

```tsx
// findBy：等出现（最常用）
expect(await screen.findByText('¥9.9')).toBeInTheDocument();

// waitFor：等消失——"加载中"文案必须等接口回来后才不见
await waitFor(() => expect(screen.queryByText('加载中…')).not.toBeInTheDocument());

// waitFor：等非 DOM 条件，比如"确认按钮从禁用变为可用"
await waitFor(() =>
  expect(screen.getByRole('button', { name: '确认' })).toBeEnabled(),
);
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：vi.mock 工厂里引用了外部变量，报 `Cannot access ... before initialization`。根因：vi.mock 被提升到文件顶部执行，早于外部变量的初始化。修法：用 `vi.hoisted` 声明共享 mock（如上），或改在测试体内通过 `vi.mocked(导入的函数)` 配置。
2. 症状：用了 fake timers 后 `findBy`/`waitFor` 一直超时。根因：等待工具靠定时器轮询，fake timers 把轮询也冻结了。修法：`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` 协作；断言前手动 `act(() => vi.advanceTimersByTime(1000))` 推进时间（第 4 条的 debounce 测试是完整示范）。
3. 症状：第二个测试莫名其妙用到第一个测试的 mock 返回值。根因：同文件 mock 状态共享、`mockResolvedValueOnce` 的队列残留。修法：vitest.config 里 `test.clearMocks: true`，或 afterEach 里 `vi.resetAllMocks()`。
4. 症状：waitFor 默认 1 秒超时，CI 慢机器上偶发超时挂掉。根因：超时太紧 + CI 资源紧张。修法：对确实慢的等待显式 `{ timeout: 3000 }`；但先怀疑是被测代码请求串行过多——waitFor 应等"必要条件"而非"全部加载"。

---

### 4. 自定义 Hook 测试：`renderHook` + `act`

**是什么。** hook 只能在组件里调用（React 的规则），直接在测试里 `useCounter()` 是不合法的。`renderHook` 帮你把任意 hook 包进一个测试专用的宿主组件里渲染，并暴露 `result`（hook 的返回值）、`rerender`（换 props 重渲染）、`unmount`（卸载）三个操控点。`act` 则是 React 的"act 环境"：把状态更新包起来，让 React 同步完成渲染与 effect flush，保证断言看到的是"尘埃落定"后的状态。

**为什么需要。** 阶段 2 手写了 8 个自定义 hook，它们的正确性（useDebounce 的时序、useRequest 的竞态）很难只靠组件测试间接验证——组件测试里时序问题被 UI 渲染掩盖。renderHook 让 hook 的输入输出成为一等测试对象，改 props、推进时间、卸载，全部直接控制。

**怎么做。** 第一个例子，测 `useCounter`：

```tsx
// src/hooks/useCounter.ts
import { useCallback, useState } from 'react';

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const inc = useCallback(() => setCount((c) => c + 1), []);
  const dec = useCallback(() => setCount((c) => c - 1), []);
  return { count, inc, dec };
}
```

```tsx
// src/hooks/useCounter.test.tsx
import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useCounter } from './useCounter';

test('inc 与 dec 更新 count', () => {
  const { result } = renderHook(() => useCounter(10));

  expect(result.current.count).toBe(10); // result.current 是 hook 本次渲染的返回值

  act(() => {
    result.current.inc(); // 触发状态更新的调用必须包在 act 里
  });
  expect(result.current.count).toBe(11);

  act(() => {
    result.current.dec();
  });
  expect(result.current.count).toBe(10);
});
```

**act 警告到底在说什么。** 如果你忘了 act 包裹，控制台会出现：

```text
Warning: An update to TestComponent inside a test was not wrapped in act(...).
This is likely not a problem with your code, but it may indicate...
```

拆开理解：React 希望测试中所有"会导致渲染"的动作发生在 act 的边界内——act 结束时，React 会**同步 flush 完**本次更新与相关 effect，再交还控制权。警告的真正风险不是噪音：更新发生在 act 之外意味着**断言时刻的状态不确定**（渲染可能还没完成），测试会"时好时坏"。前两条里 render、user.click 内部已经包好 act，所以只有直接调 hook 函数、手动 dispatch 状态更新的场景需要你显式包。异步更新用异步版：

```tsx
// hook 内部有 await 的 action：用 await act 包住整个异步过程
await act(async () => {
  await result.current.refresh();
});
```

第二个例子，`useDebounce` + fake timers——这是自定义 hook 测试最经典的组合：

```tsx
// src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay); // 停止输入 delay 毫秒后才同步
    return () => clearTimeout(timer); // 新值到来时重置计时（防抖的本质）
  }, [value, delay]);
  return debounced;
}
```

```tsx
// src/hooks/useDebounce.test.tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebounce } from './useDebounce';

beforeEach(() => {
  vi.useFakeTimers(); // 冻结时间：不真实等待 300ms，测试瞬间完成
});
afterEach(() => {
  vi.useRealTimers(); // 恢复，避免影响后续测试
});

test('300ms 内连续变更只透出最后一个值', () => {
  const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
    initialProps: { value: 'r' }, // rerender 时可注入新 props
  });

  expect(result.current).toBe('r'); // 初始：原样透出

  rerender({ value: 're' });        // 模拟用户输入第二个字符
  act(() => vi.advanceTimersByTime(200));
  expect(result.current).toBe('r'); // 还没到 300ms：仍是旧值（防抖生效）

  rerender({ value: 'rea' });       // 第三个字符（重置了计时器）
  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toBe('rea'); // 300ms 无新输入，透出最终值
});

// 补充：测"卸载时清理定时器"——rerender 后 unmount()，再推进时间，
// result.current 保持旧值且控制台无 act 警告，即证明清理函数正确执行。
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：act 警告刷屏但测试都过。根因：某个更新路径没进 act 边界——最常见是 hook 里的异步回调（fetch 的 then、setTimeout）在 act 外 setState。修法：定位是哪个调用触发的（警告调用栈会给），显式 `await act(async () => { ... })` 包住触发源；组件层测试则改用 `findBy`/`waitFor` 让 RTL 替你等待。
2. 症状：fake timers 下 debounce 测试永远拿旧值。根因：advanceTimersByTime 推进了"被冻结的时钟"但没触发 React 的状态 flush。修法：推进时间的调用要包 `act(() => vi.advanceTimersByTime(...))`——例子里每一处都这么写，就是为此。
3. 症状：断言用的 `result.current` 是旧值。根因：`result.current` 是个 getter，每次访问取"当前渲染"的返回值，但你的闭包变量如果提前解构（`const { count } = result.current`）就定格在那一帧。修法：始终在 act 之后**现场**访问 `result.current.count`，不要提前解构保存。

---

### 5. 组件测试范式：测行为不测实现（不测内部 state）

**是什么。** 一条决定测试寿命的军规：断言**用户可见可感的输出**（渲染的文案、可访问属性、对回调的调用），而不是**组件内部的实现**（内部 state 的值、内部函数是否被调、DOM 结构的私有细节）。Testing Library 从 API 设计上强制了前半句（拿不到内部 state），这条军规管住后半句。

**为什么需要。** 实现会变，行为不该变。你会在阶段 5 把 useState 换成 Zustand、在阶段 6 给列表加虚拟化、在重构时把"span 显示计数"改成"图标 + 数字"——**内部实现怎么改是开发者的自由，只要用户看到的行为不变**。断言实现的测试会在每次重构时误报（测试挂了但功能没坏），团队对红灯脱敏后，真 bug 来了也没人理——坏测试比没测试更危险，原因就在这里。

**怎么做：一对好坏对照。** 待测组件用第 2 条的 LikeButton（点赞切换、计数联动）：

**坏测试**（断言实现细节，两处问题）：

```tsx
// ❌ 坏测试：和实现细节绑死
test('点赞后内部状态变为 liked', async () => {
  const user = userEvent.setup();
  render(<LikeButton initialCount={3} />);

  await user.click(screen.getByRole('button'));

  // 坏点 1：断言暴露到 DOM 上的"内部状态标记"（data-liked 是为测试加的实现细节）
  expect(screen.getByRole('button')).toHaveAttribute('data-liked', 'true');
  // 坏点 2：断言 DOM 结构（必须有个 .count 子元素）——把文案改成图标就挂
  expect(screen.getByRole('button').querySelector('.count')).toHaveTextContent('4');
});
```

它的问题：`data-liked` 与 `.count` 都不是用户感知的东西，是为了测试而暴露的内部结构。明天把按钮文案改成心形图标 + 数字角标，功能完全正常，这个测试**必须重写**——它测的是"代码长什么样"，不是"产品做什么"。

**好测试**（断言行为）：

```tsx
// ✅ 好测试：站在用户视角
test('点击后按钮文案从"点赞 3"变为"已赞 4"，再点变回', async () => {
  const user = userEvent.setup();
  render(<LikeButton initialCount={3} />);

  const button = screen.getByRole('button', { name: '点赞 3' });
  await user.click(button);

  // 用户看到的信息变化：文案与计数
  expect(screen.getByRole('button', { name: '已赞 4' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '已赞 4' }));
  expect(screen.getByRole('button', { name: '点赞 3' })).toBeInTheDocument(); // 可取消
});
```

验证"好"的标准很简单——**重构不变式**：把 LikeButton 的 `useState` 换成 Zustand store、把文案换成图标，只要产品行为（点击计数增减、可切换）不变，好测试依然绿、坏测试必红。写完任何测试都可以做一次这个思想实验。

**边界：什么算"行为"、什么算"实现"的判定表。**

| 断言对象 | 归类 | 说明 |
|---|---|---|
| 渲染出的文案、可访问角色与名称 | 行为 ✅ | 用户直接感知 |
| 对传入回调的调用与参数（`onSelect` 被以 `'b'` 调用） | 行为 ✅ | 组件对外契约 |
| aria 属性、disabled、href | 行为 ✅ | 用户/辅助技术感知 |
| 内部 state 值、是否调用了内部函数 | 实现 ❌ | 换个写法就变 |
| class 名、DOM 层级、为测试加的 data-* 标记 | 实现 ❌ | 样式重构即碎 |
| 快照整个 DOM 树（`toMatchSnapshot`） | 偏实现 ⚠️ | 大快照碎得毫无信息量；只对稳定的小片段用 |

**常见坑（症状 → 根因 → 修法）。**

1. 症状：每次改样式测试都红，改了十次后团队直接 `it.skip`。根因：断言穿透到 class/DOM 结构。修法：按判定表把断言上移到行为层；被 skip 的测试要么修要么删，留着只会麻木团队。
2. 症状：重构（逻辑等价）导致大面积测试失败。根因：同上，测试与实现耦合的群体爆发。修法：把这次重构当成测试体检，红的测试逐个问"它到底想保护什么行为"，改写成行为断言。
3. 症状：为让测试能查到元素，给组件加了 `data-testid`。根因：查询优先级没走完（第 1 条的表），过早退到逃生舱。修法：优先 role/label/text；真的无语义锚点（纯装饰容器）才用 testid，并接受它只定位不断言内容。

---

### 6. E2E：Playwright 写登录→操作→断言 流程

**是什么。** 端到端测试驱动**真实浏览器**访问**真实运行的应用**（前端 + 后端 + 数据库一起跑），从用户视角点击、输入、等待、断言。Playwright 是微软开源的 E2E 框架，当前主流选择；它的三级自动等待（等元素可见可点、等导航完成、断言自动重试）解决了 E2E 最经典的"时序脆弱"问题。

**为什么需要。** 组件测试 mock 掉了后端、路由、网络——这些接缝处的问题（登录后跳转丢参数、生产构建的基路径错、接口字段蛇形/驼峰不一致）只有 E2E 能拦住。策略上 E2E 只写**关键路径**：一条"登录 → 核心操作 → 断言结果"的用户旅程，价值超过二十个边角组件测试。

**怎么做（环境到用例分步）。**

第一步，初始化（会生成配置、示例目录，并提示安装浏览器内核）：

```bash
npm init playwright@latest
```

第二步，写配置：

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',              // E2E 用例与组件测试分开存放
  timeout: 30_000,               // 单条用例超时（E2E 慢，给足）
  retries: process.env.CI ? 2 : 0, // CI 上重试两次：E2E 允许极小概率的环境抖动
  use: {
    baseURL: 'http://localhost:5173', // 用例里 page.goto('/login') 用相对路径即可
    trace: 'on-first-retry',          // 重试时录追踪，失败后可视化回放每一步
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // 需要矩阵时再加 firefox / webkit / Mobile Safari
  ],
  // 自动拉起开发服务器：本地复用已在跑的，CI 每次新起
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

第三步，写完整 spec——登录 → 记一笔 → 断言列表 → 退出（对应阶段 9 产出的记账本）：

```tsx
// e2e/ledger.spec.ts
import { expect, test } from '@playwright/test';

// 一条完整用户旅程：登录 → 记一笔支出 → 断言列表与汇总 → 退出
test('登录后记一笔并出现在本月账单', async ({ page }) => {
  // —— 1. 登录 ——
  await page.goto('/login');
  await page.getByLabel('邮箱').fill('e2e@example.com');
  await page.getByLabel('密码').fill('correct-horse');
  await page.getByRole('button', { name: '登录' }).click();

  // web-first 断言：自动等待元素可见，替代手写 sleep
  await expect(page.getByRole('heading', { name: '本月账单' })).toBeVisible();

  // —— 2. 操作：记一笔 ——
  await page.getByRole('link', { name: '记一笔' }).click();
  await page.getByLabel('类型').selectOption('支出');
  await page.getByLabel('金额').fill('25.5');
  await page.getByLabel('备注').fill('午饭');
  await page.getByRole('button', { name: '保存' }).click();

  // —— 3. 断言：列表出现新记录，汇总金额变化 ——
  await expect(page.getByRole('cell', { name: '午饭' })).toBeVisible();
  await expect(page.getByTestId('month-total')).toContainText('25.5'); // 汇总无语义锚点，testid 合理

  // —— 4. 退出登录，回到登录页 ——
  await page.getByRole('button', { name: '退出' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('未登录访问记账页会被重定向到登录页', async ({ page }) => {
  await page.goto('/ledger');
  await expect(page).toHaveURL(/\/login/);
});
```

写法要点逐条说：

- **选择器策略与组件测试同源**：`getByRole`/`getByLabel` 优先，Playwright 的定位 API 与 Testing Library 的查询哲学一致（甚至支持 `page.getByText`、`page.getByAltText`），第 1 条学到的优先级表原样适用。
- **自动等待是 Playwright 的灵魂**：`click()` 前自动等元素"可见、稳定、可点"；`expect(...).toBeVisible()` 自动重试到超时。永远不要写 `page.waitForTimeout(2000)`（死等）——它是 E2E 变脆变慢的第一根源。
- **断言 URL**：`await expect(page).toHaveURL(/\/login/)` 验证跳转，比断言页面内容更能表达"路由行为"。
- **登录态复用**：多条用例都要登录时，用 Playwright 的 storageState 机制——先用一个 setup 用例登录并 `storageState('./e2e/.auth/user.json')` 存盘，其余项目在配置里 `use: { storageState: './e2e/.auth/user.json' }`，跳过每条用例重复登录。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：本地全绿，CI 上随机挂。根因：CI 机器慢，固定 sleep 不够；或 `reuseExistingServer` 在 CI 没关导致起服务竞态。修法：全部改成自动等待断言；确认 webServer 配置如上（CI 新起服务并等待 url 就绪）。
2. 症状：`strict mode violation: getByRole('button') resolved to 3 elements`。根因：Playwright 定位器默认要求唯一（strict mode）。修法：加 `name` 选项或 `nth(0)`（慎用），与组件测试的 multiple 报错同源。
3. 症状：跑一次几分钟，没人愿意本地跑。根因：用例数量失控（把组件测试该干的活写到 E2E 里了）。修法：执行纪律——E2E 只覆盖关键路径（登录、核心业务闭环、支付/提交类高危操作），交互细节回归交给组件测试。

---

### 7. ErrorBoundary + window.onerror + Sentry 上报接入

**是什么。** 这是"错误的三层防线"：ErrorBoundary 捕获**渲染期**错误并显示降级 UI；`window` 的 `error`/`unhandledrejection` 事件兜住**渲染期之外**的同步与 Promise 错误；Sentry 把两层捕获的错误收集、聚合并配回源码位置（sourcemap）。三者合起来，用户看到的不再是白屏，你也终于能在用户遇到错误**之前**从 Sentry 看到它。

**为什么需要三层。** 关键事实：**ErrorBoundary 不是万能的**。它只捕获"子树渲染、生命周期中的同步错误"；事件处理器里的 `throw`、`setTimeout`/`fetch` 回调里的异常、Promise 未处理的拒绝、以及 ErrorBoundary 自身渲染的错误，**都穿它而过**。所以架构必然是分工的：边界管"渲染期 + 降级 UI"，全局监听管"其余一切"，Sentry 管汇总。

**怎么做（三层各自实现）。**

**第一层：类组件 ErrorBoundary。** React 至今只有类组件能做错误边界（`getDerivedStateFromError` + `componentDidCatch` 两个静态/实例方法）：

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 降级 UI：给函数可以拿到 error 与重置方法，做出"重试"按钮 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** 捕获回调：在这里接 Sentry（保持组件纯净） */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  // 渲染期被调用：返回新的 state（触发降级 UI）。不能在这里做副作用
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  // 提交阶段被调用：适合上报（componentStack 是出错的组件链路，Sentry 定位神器）
  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => this.setState({ error: null }); // 降级后可重试

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback?.(this.state.error, this.reset) ?? <h1>页面出错了</h1>;
    }
    return this.props.children;
  }
}
```

使用与放置原则：**包住"可独立降级的区域"**，而不是包整个应用一个边界完事——侧边栏挂了不该连累正文：

```tsx
<ErrorBoundary fallback={(e, reset) => <PanelDead onRetry={reset} />}>
  <SlowPanel />
</ErrorBoundary>
```

**第二层：全局错误监听 + React 19 的 createRoot 错误回调。** 先是两个 window 事件（用 `addEventListener` 而不是直接赋值 `window.onerror =`，允许多个监听者共存）：

```ts
// src/monitor.ts
export function setupGlobalErrorReport(
  report: (error: unknown, context: Record<string, unknown>) => void,
): () => void {
  const onError = (event: ErrorEvent): void => {
    // 同步错误：事件处理器、setTimeout 回调等 ErrorBoundary 抓不到的场景
    report(event.error ?? new Error(event.message), { type: 'sync' });
  };
  const onRejection = (event: PromiseRejectionEvent): void => {
    // 未处理的 Promise 拒绝：fetch 失败没 catch、async 函数抛错没处理
    report(event.reason, { type: 'unhandledrejection' });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError); // 返回清理函数，测试/SSR 场景可撤销
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
```

React 19 起还可以在 `createRoot` 上声明错误回调，与 ErrorBoundary 形成精细分工（未捕获/被捕获/可恢复三类）：

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './instrument'; // Sentry 初始化，必须在所有业务代码之前 import

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error) => {
    // 没有任何 ErrorBoundary 接住的渲染错误 → 上报（Sentry.init 后自动上报的补充通道）
    console.error('[uncaught]', error);
  },
  onCaughtError: (error) => {
    // 被某个 ErrorBoundary 捕获的错误（降级 UI 已显示，仍可记录）
    console.warn('[caught]', error);
  },
  onRecoverableError: (error) => {
    // 可恢复错误：典型如 Suspense 场景中渲染被中断后重试
    console.info('[recoverable]', error);
  },
}).render(<App />);
```

**第三层：Sentry 接入。** 安装 `npm install @sentry/react`，写初始化文件并**在入口最先 import**：

```ts
// src/instrument.ts —— 必须在 main.tsx 的第一行 import 它
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // 环境变量注入；本地不配置即为关闭，不影响开发
  integrations: [
    Sentry.browserTracingIntegration(), // 性能追踪（页面加载、接口耗时）
    Sentry.replayIntegration(),         // 会话录像：出错时能"回看"用户操作序列
  ],
  tracesSampleRate: 0.1,          // 性能采样 10%（全量会超配额）
  replaysSessionSampleRate: 0.05, // 普通会话录像 5%
  replaysOnErrorSampleRate: 1.0,  // 出错的会话 100% 录像（出错才有价值）
});
```

初始化之后，"未被捕获"的错误（window error、unhandledrejection、ErrorBoundary 之外的渲染错误）Sentry 会自动收集；**ErrorBoundary 捕获的要接到上报回调**，事件处理器/异步代码里的要手动上报：

```tsx
import * as Sentry from '@sentry/react';

// ErrorBoundary 与 Sentry 的接法：onError 里上报（componentStack 会成为定位关键）
<ErrorBoundary
  onError={(error, info) => Sentry.captureException(error, { contexts: { react: info } })}
  fallback={(e, reset) => <ErrorPanel error={e} onRetry={reset} />}
>
  <App />
</ErrorBoundary>

// 事件处理器/异步 catch 里的手动上报——ErrorBoundary 管不到这里
async function handleDelete(id: string): Promise<void> {
  try {
    await api.deleteEntry(id);
  } catch (err) {
    Sentry.captureException(err); // 上报
    toast.error('删除失败，请重试'); // 同时给用户反馈
  }
}
```

**sourcemap 概念。** 生产构建会把代码压缩混淆，线上报错的堆栈形如 `at a.value (main-B3xK9.js:2:84512)`——没有 sourcemap，谁也不知道这是哪行代码。sourcemap 是构建时生成的"压缩产物 ↔ 源码"映射表；**上传给 Sentry（而不是部署到线上服务器）**，Sentry 展示错误时会自动把堆栈还原成 `at deleteEntry (src/api.ts:42:3)`。Vite 项目的接入：

```ts
// vite.config.ts（节选）：生成"隐藏"的 sourcemap——产物里没有 .map 引用，
// 浏览器用户拿不到映射表（不泄露源码），但构建目录里有，供上传工具读取
export default {
  build: {
    sourcemap: 'hidden',
  },
};
```

```bash
# 官方向导自动接入上传（识别 Vite、配置 auth token 与 release 关联）
npx @sentry/wizard@latest -i sourcemaps
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：明明加了 ErrorBoundary，某接口报错后页面还是白屏。根因：错误发生在 `fetch` 的 catch 之外的 Promise 拒绝（或事件处理器 throw）——**不在边界的捕获范围内**。修法：这正是分层的原因，全局监听兜底 + 关键路径 try/catch 上报；并把"异步错误如何触发降级 UI"设计为状态机（错误分支渲染降级组件，而不是依赖抛错）。
2. 症状：开发环境 ErrorBoundary 一闪而过，看到的是红色错误浮层。根因：开发模式的错误浮层优先展示，这是正常行为。修法：验证降级 UI 请用生产构建（`npm run build && npm run preview`）。
3. 症状：Sentry 上的堆栈全是 `main-B3xK9.js:2:84512`，无法定位。根因：sourcemap 没上传（或上传时 release 与部署产物不对应）。修法：跑 wizard 接入上传流程；确认构建与上传在同一 CI 步骤（同一份产物）。
4. 症状：上报量爆炸，配额一天用完。根因：采样全开 + 某个高频错误无限重放（用户每秒触发一次）。修法：调低 `tracesSampleRate`；高频错误在 Sentry 后台做频率限制/忽略规则，代码侧对已知噪音错误加过滤。

---

**阶段 8 收束。** 七条合成一条流水线：第 1、2、5 条是组件测试的"查询—交互—范式"三位一体，第 3、4 条补上 mock 与 hook 这两块硬骨头，第 6 条用少量 E2E 锁住关键路径，第 7 条把防线延伸到线上。验收这一周的方式：给阶段 4 的后台管理系统补 10 个组件测试（覆盖登录表单、表格增删改查弹窗）+ 1 条 Playwright 登录主流程 + Sentry 试接入（本地用 DSN 空值跑通不报错即可）。测试金字塔立起来之后，你才真正拥有"改代码的自由"——带着这份底气进入阶段 9 的 React 19 与服务端世界。

## 阶段 9：React 19 与服务端（2 周）

React 19 于 2024 年 12 月正式发布，这一阶段的前半周（约 5 天）在纯客户端环境（你阶段 0 的 Vite 项目）把六个新特性逐个 demo 一遍——它们不依赖任何框架；后半周（约 9 天）进入 Next.js 的 App Router。要建立一个正确认知：**RSC（React Server Components）不是 Next.js 的私有功能，而是 React 本身的渲染能力**；Next.js 只是当前最成熟的宿主（提供了路由、构建、缓存策略的完整工程化）。先在裸 React 里理解机制，再到 Next.js 里看工程化封装，顺序不要反。学习方式：每条新特性都写"最小 demo + 故意写错看报错"；Next.js 部分直接开新项目边读边搭，最后一节的全栈应用作业就是这个项目的验收形态。

### React 19 新特性

原大纲条目（骨架）：

1. `use()` 读取 Promise / Context
2. Actions + `useActionState`（表单提交状态）
3. `useOptimistic` 乐观 UI
4. ref 直接作为 prop（`forwardRef` 逐步退场）
5. 文档元数据（`<title>` 直接写组件里）
6. Suspense 进阶：占位、边界组合

---

#### 1. `use()` 读取 Promise / Context

**是什么。** `use` 是一个新 API，能读两类东西：**Promise**（结果未就绪时挂起组件，交给最近的 Suspense 边界显示 fallback）和 **Context**（作用与 `useContext` 相同）。它是"组件异步化"的基础原语：让"等待数据"从命令式的 loading state 变成声明式的"挂起"。

**为什么需要。** 阶段 4 你手写的 `useFetch` 要自己维护 loading/error/success 三态；`use` 配合 Suspense 后，loading 态由 Suspense 统一显示、error 态由 ErrorBoundary 统一捕获，组件函数体里**只剩下成功态的代码**——异步 UI 的样板代码被砍掉一大半。这也是阶段 4.2"Suspense + 数据获取"的正式答案。

**怎么做（机制与规则分步）。** 先看用法，规则放后面：

```tsx
import { Suspense, use, useMemo } from 'react';

/** 子组件：只写成功态。use() 在 promise 未完成时把整个组件挂起 */
function Comments({ commentsPromise }: { commentsPromise: Promise<string[]> }) {
  const comments = use(commentsPromise); // 未完成 → 挂起；完成 → 直接拿到结果
  return (
    <ul>
      {comments.map((c) => (
        <li key={c}>{c}</li>
      ))}
    </ul>
  );
}

export function ArticlePage() {
  // 关键：promise 必须跨渲染稳定（同一次数据请求只创建一次实例）
  // useMemo 保证组件重渲染时不会重新发请求
  const commentsPromise = useMemo(() => fetchComments(), []);
  return (
    <Suspense fallback={<p>评论加载中…</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

async function fetchComments(): Promise<string[]> {
  const res = await fetch('https://jsonplaceholder.typicode.com/comments?postId=1');
  const list = (await res.json()) as { id: number; body: string }[];
  return list.map((c) => c.body);
}
```

执行机制分步：1) `ArticlePage` 渲染时创建（并缓存）promise；2) `Comments` 里 `use(promise)` 发现未完成，**抛出这个 promise 本身**（React 内部机制，你 catch 不到）；3) 最近的 Suspense 边界接住，渲染 fallback；4) promise 完成后 React 重试 `Comments`，`use` 返回结果；5) promise 拒绝时，错误交给最近的 ErrorBoundary——所以完整形态是 Suspense 与 ErrorBoundary 双边界包住异步组件。

**调用规则——哪些依旧、哪些放开了。** 这组规则最容易以讹传讹，逐条对齐官方文档：

| 规则 | 状态 | 说明 |
|---|---|---|
| 只能在组件或自定义 Hook 的函数体内调用 | **依旧** | 不能在事件处理器、类组件、普通函数、事件回调里 `use()` |
| 不能在 try/catch 里读 Promise | **依旧** | 挂起用的 promise 是内部抛出机制，try/catch 接不住；错误应交给 ErrorBoundary |
| 传入的 Promise 必须跨渲染缓存同一实例 | **依旧** | 每次渲染新建 promise 会导致无限挂起（见坑 1） |
| 不要读 `promise.status` 手动绕过 `use` | **依旧** | 绕过会让 React 失去对挂起状态的跟踪 |
| 与其他 Hook 不同，**允许在条件与循环里调用** | **放开** | 这是 `use` 与 `useContext` 的核心差异，官方明确支持 |

条件调用 Context 的官方示例形态：

```tsx
import { use } from 'react';

function HorizontalRule({ show }: { show: boolean }) {
  if (show) {
    const theme = use(ThemeContext); // ✅ 合法：use 允许条件调用
    return <hr className={theme} />;
  }
  return false;
}
```

这条放宽是有代价换来的：正因为 `use` 每次调用都要"现场读"，React 才允许它出现在分支里。但习惯上仍建议：**Context 用 useContext（顶层声明更清晰），`use` 主要用来读 Promise**——让两个 API 各司其职。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：组件永远停在 fallback，网络面板却显示请求早就完成了。根因：promise 在组件体内直接创建（`use(fetchComments())`），每次渲染都是**新实例**，React 挂起等待的永远是"上一帧的 promise"。修法：`useMemo` 缓存创建动作；更好的形态是像示例那样**由父组件（或服务端组件）创建、作为 prop 传入**。
2. 症状：`try { const d = use(p) } catch` 捕获不到错误。根因：挂起与错误都走"抛出到边界"的内部机制。修法：删掉 try/catch，在组件外层放 ErrorBoundary（阶段 8 手写的那棵树可以直接复用）。
3. 症状：把 `use` 写进了事件处理器，报 "use() cannot be called from an event handler"。根因：`use` 只在渲染期间有意义。修法：事件处理器里直接 `await promise` 即可——那里本来就是异步上下文。

---

#### 2. Actions + `useActionState`（表单提交状态）

**是什么。** React 19 把"表单提交后执行异步函数"升级为一等公民：`<form action={fn}>` 的 `fn` 可以是任意（同步或）异步函数，称为 **Action**；`useActionState` 则包住 Action，给你三个回报：提交后的返回值 `state`、可直接绑给 form 的 `formAction`、提交是否进行中 `isPending`。

**为什么需要。** 对比阶段 4.1 你手写过的提交逻辑：onSubmit 里 preventDefault、手动 setLoading、手动 try/catch 收集错误信息、完成后手动清表单——这套样板在每个表单里重复一遍。Actions 把"提交 → 异步处理 → pending 态 → 结果回填"变成框架职责；而且 Action 被自动包在 transition 里（阶段 10 第 6 条），提交期间**界面不会卡死**，isPending 也不需要你额外造 state。

**怎么做（机制分步）。** 完整示例：

```tsx
import { useActionState } from 'react';

/** Action：签名固定为 (上一次的 state, 本次提交的 FormData) => 新 state */
type FormState = { ok: boolean; message: string };

async function addTodoAction(prev: FormState, formData: FormData): Promise<FormState> {
  // 表单数据靠 name 属性收集：input 没有 name，这里就取不到值
  const title = formData.get('title');
  if (typeof title !== 'string' || title.trim() === '') {
    return { ok: false, message: '标题不能为空' };
  }
  await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
  return { ok: true, message: `已添加：${title}` };
}

export function AddTodo() {
  // 初始 state 是第一条提交前的值
  const [state, formAction, isPending] = useActionState(addTodoAction, {
    ok: false,
    message: '',
  });

  return (
    <form action={formAction}>
      {/* 不写 onSubmit、不写 e.preventDefault()：框架全包了 */}
      <input name="title" placeholder="待办标题" />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中…' : '添加'}
      </button>
      {state.message && (
        <p role="status" style={{ color: state.ok ? 'green' : 'red' }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

执行机制分步：1) 用户点提交，React 收集表单字段为 `FormData`（按 name 属性）；2) 调用 `addTodoAction(上次返回值, formData)`，整个过程包在 transition 中，`isPending` 变 true；3) Action 返回值成为新的 `state`，组件重渲染，按钮恢复、消息显示；4) 连续快速提交时，多次提交**排队顺序执行**，每次 Action 拿到的 prev 是上一次的结果；5) Action 内 `throw` 的错误不会被 useActionState 变成 state，而是直接炸给最近的 ErrorBoundary，并取消后续排队的提交——**错误要么 return 成消息，要么 throw 成边界，别混用**。

不需要 state、只要"提交即执行"的轻量场景，可以不用 useActionState，直接给 action 传一个普通异步函数（这就是"裸 Action"，React 同样自动包 transition）：

```tsx
<form action={(formData) => saveDraft(formData.get('content') as string)}>
  <textarea name="content" />
  <button type="submit">保存草稿</button>
</form>
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`formData.get('xxx')` 拿到 null。根因：对应的 input 没写 `name` 属性（id/placeholder 都不算）。修法：表单控件必须带 name；TS 侧 `formData.get` 返回 `FormDataEntryValue | null`，永远先判空再用。
2. 症状：提交期间按钮没变化、页面还能乱点。根因：忘了用 `isPending` 禁用提交按钮。修法：`disabled={isPending}`，同时可加 `aria-busy={isPending}`（测试与可访问性双收益，阶段 8 的查询能直接用）。
3. 症状：在 Action 外面 `try { await formAction() } catch` 想捕获错误，捕不到。根因：formAction 是给 form 的 action 属性用的，不是普通函数；错误走 ErrorBoundary。修法：把可预期的失败做成返回值（如示例的 `{ ok: false, message }`），不可预期的异常交给边界。
4. 症状：用了 `useFormState` 报 "not exported from react"。根因：那是 React 19 RC 期的名字，正式版更名为 `useActionState`。修法：统一用 `useActionState`。

---

#### 3. `useOptimistic` 乐观 UI

**是什么。** 乐观 UI（阶段 4.6 手写过：点赞先加一、失败回滚）指"不等服务端确认就先按成功更新界面"。`useOptimistic` 把这个手写模式收编为 API：返回一个"乐观值"与一个"追加乐观更新"的函数，**在 transition 进行期间**渲染乐观值，transition 结束（无论成败）自动回到真实值。

**为什么需要。** 手写乐观更新要维护三份东西：真实数据、本地乐观副本、回滚逻辑，且失败回滚分支极易写漏。`useOptimistic` 的关键洞察是：乐观值只在"Action 进行中"有意义——那就把它的生命周期绑定到 transition 上，Action 一结束，乐观值自然失效，回滚代码一行都不用写。

**怎么做（完整点赞示例）。**

```tsx
import { useState, useTransition, useOptimistic } from 'react';

interface LikeButtonProps {
  /** 服务端确认后的真实点赞数（由父组件在请求成功后更新） */
  count: number;
  /** 切换点赞的请求，失败时 reject */
  onToggle: (liked: boolean) => Promise<void>;
}

export function LikeButton({ count, onToggle }: LikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 乐观副本：base 是真实 count；reducer 描述"一次乐观更新如何叠加"
  const [optimisticCount, addOptimisticCount] = useOptimistic(
    count,
    (current: number, delta: number) => current + delta,
  );

  async function handleClick(): Promise<void> {
    startTransition(async () => {
      const next = !liked;
      addOptimisticCount(next ? 1 : -1); // 立刻反映到界面（乐观 +1 / -1）
      setLiked(next);
      await onToggle(next); // 服务端确认；失败时这里的异常会让 transition 以失败结束
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending} aria-busy={isPending}>
      {liked ? '♥' : '♡'} {optimisticCount}
    </button>
  );
}
```

机制分步：1) 点击后 `startTransition` 开启一个带乐观上下文的 transition；2) `addOptimisticCount(+1)` 把增量交给 React，下一次渲染中 `optimisticCount` = 真实 count + 1（用户瞬间看到效果）；3) `await onToggle(next)` 期间界面持续显示乐观值；4) transition 结束：成功——父组件更新了真实 `count`，乐观值被丢弃，二者无缝衔接（可能恰好相等，视觉无跳变）；失败——`onToggle` 抛错，`count` 从未变过，乐观值被丢弃后界面**自动回到 +0**，且回滚与"保持旧 UI"发生在同一次渲染里，没有中间闪烁。若要失败提示，在 `onToggle` 内部 catch 后 toast 即可（别在组件里再包一层 try/catch 抢异常）。

两条官方红线：`addOptimistic` **必须在 Action（transition）内调用**，在外面调用会收到警告且乐观值闪现即回退；reducer 必须是**纯函数**（不得在里面发请求、改外部状态）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：乐观效果闪一下就消失，随后才是真实结果。根因：把 `addOptimisticCount` 写在了 `startTransition` 外面（乐观值没有 transition 可"依附"，立刻回滚）。修法：把所有"乐观更新 + 异步请求"整体放进 `startTransition(async () => {...})`。
2. 症状：失败了界面却停在 +1。根因：失败路径上父组件也把 count 更新了（catch 里误调了成功回调）。修法：约定清楚——`count` 只代表服务端确认过的值；失败时父组件不动它。
3. 症状：乐观列表新增项时 key 冲突或渲染错乱。根因：乐观项还没拿到服务端 id，用了 `key={undefined}` 或复用旧 id。修法：乐观项用带标记的临时 key（如 `` `optimistic-${Date.now()}` `` 或自增 ref），服务端结果回来后由真实 id 替换。

---

#### 4. ref 直接作为 prop（`forwardRef` 逐步退场）

**是什么。** React 19 之前，函数组件拿不到 `ref`（它被 React 截留，必须用 `forwardRef` 转发）；React 19 起 `ref` 成为**普通 prop**——函数组件直接在参数里解构它，`forwardRef` 进入废弃流程（仍可用，但新代码不再需要）。

**为什么需要。** `forwardRef` 有两宗罪：一是样板（每个需要暴露 DOM 的组件都多一层包装）；二是它让**泛型组件**的类型签名变成灾难（`forwardRef<HTMLInputElement, Props<T>>` 里外三层泛型，阶段 7 第 3 条的泛型 Select 在 18 时代几乎没法优雅地同时支持泛型与 ref）。`ref` 变普通 prop 后，这两个问题同时消失。

**怎么做（迁移对照）。**

React 18 及之前的写法：

```tsx
// 旧写法（18）：forwardRef 包装，ref 作为第二个参数
import { forwardRef } from 'react';

type InputProps = React.ComponentProps<'input'> & { label: string };

const OldInput = forwardRef<HTMLInputElement, InputProps>(function OldInput(
  { label, ...rest },
  ref, // ref 不在 props 里，靠第二个参数注入
) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  );
});
```

React 19 的写法：

```tsx
// 新写法（19）：ref 是普通 prop，直接解构
import type { ComponentProps, Ref } from 'react';

type InputProps = ComponentProps<'input'> & {
  label: string;
  ref?: Ref<HTMLInputElement>; // 显式声明（保持与 forwardRef 时代一致的对外 API）
};

function NewInput({ label, ref, ...rest }: InputProps) {
  return (
    <label>
      {label}
      <input ref={ref} {...rest} />
    </label>
  );
}
```

调用方完全不变：`<NewInput ref={inputRef} label="邮箱" />`。迁移建议：升级 React 19 后，官方升级指南与 codemod（`npx codemod react/19/...` 系列，见 react.dev 的 Upgrade Guide）能自动完成大部分机械改写；`eslint-plugin-react-hooks` 的新规则集也会指出残留的 forwardRef。老库里的 forwardRef 不必急着清——废弃不等于删除，按机会成本逐步迁移即可。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：升级 19 后控制台出现 "Unexpected return value from a callback ref"。根因：React 19 允许 ref 回调**返回清理函数**（节点卸载/换绑时自动调用），因此对返回值严格校验；旧代码的 ref 回调碰巧隐式返回了非函数值（如 `node.play()` 的返回值），旧版忽略、19 版报错。修法：ref 回调体用花括号包起来不隐式返回，或返回真正的清理函数。
2. 症状：泛型组件同时要 ref，类型怎么写都报错（旧版残留写法）。根因：还在用 `forwardRef` 包泛型组件。修法：迁移到新写法——泛型声明在函数上，`ref` 作为普通 prop 的类型 `Ref<HTMLDivElement>`，问题直接消失。
3. 症状：类组件的 ref 行为变了吗？没有——`ref` 作普通 prop 只针对**函数组件**；类组件的 ref 仍然指向实例。修法：无需处理，知道边界即可。

---

#### 5. 文档元数据（`<title>` 直接写组件里）

**是什么。** React 19 之前，`<title>`、`<meta>` 写在组件里会被渲染进 body 而不生效（head 只有 index.html 能写），SPA 改标题要靠 `useEffect` 手动 `document.title = ...` 或引入 react-helmet。React 19 起，这些标签无论写在组件树多深的位置，都会被**自动提升（hoist）到 `document.head`**。

**为什么需要。** SPA 的每个"页面"都是组件，页面的标题、描述、canonical 链接理应跟着组件走、随路由切换自动更新。框架内置后：不用 effect、不用第三方库、服务端渲染时直接输出在 head 里（SEO 与首屏分享卡片都正确）。

**怎么做。**

```tsx
function ProfilePage({ userId }: { userId: string }) {
  return (
    <main>
      {/* 元数据与使用它的组件写在一起，React 负责提升到 head 并处理去重 */}
      <title>用户 {userId} 的主页</title>
      <meta name="description" content={`用户 ${userId} 的公开资料与动态`} />
      <link rel="canonical" href={`https://example.com/users/${userId}`} />

      <h1>个人主页</h1>
      {/* ...页面内容 */}
    </main>
  );
}
```

机制要点：提升是渲染期的自动行为，标题会随组件卸载恢复；同名标签 React 做去重处理；`<link rel="stylesheet">` 还支持 `precedence` 属性控制样式插入顺序（组件库按需注入样式的底层支持）。注意两点边界：其一，纯 CSR 应用改 title 对部分爬虫无效（它们可能不执行 JS），SEO 严肃场景要服务端渲染——这正是下一半 Next.js 的主场；其二，在 Next.js App Router 中应优先用它的 Metadata API（第 6 条讲），直写 `<title>` 适合快速场景与组件库内部。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：组件里写了 `<title>` 但浏览器标签没变。根因：React 版本低于 19，标签被渲染进了 body 无效。修法：升级，或退回 `useEffect` + `document.title` 的旧写法。另外多个 `<title>` 并存时 React 保留后渲染的那个——title 的归属规划成"每路由一个"，深层组件只放 `<meta>`。

---

#### 6. Suspense 进阶：占位、边界组合

**是什么。** Suspense（React 18 起用于数据挂起、19 与 `use`/Actions 配合更紧密）你已经会基本用法了；"进阶"指两件事：**fallback 怎么设计**（占位）与**边界放在哪**（组合）。这两件事决定用户对异步页面的"体感"，是纯 API 之外的 UX 功夫。

**为什么需要。** 同样四个异步区块的页面，边界放得对不对，体验天差地别：整页一个边界 = 任何一处慢全部白屏（最差）；每个小图标一个边界 = 满屏 spinner 齐闪（"spinner 风暴"）；按数据区块划分 = 静态框架立即出现、各区块陆续就位（流式体验，最优）。这不是玄学，是边界划分的机械结果。

**怎么做。** 先看目标形态的树：

```text
<ArticlePage>                        ← 无边界：页面框架立即渲染
 ├── <Header />                        静态导航，秒出
 ├── <Suspense fallback={<ProfileSkeleton/>}>   边界 A：只等"作者卡片"
 │    └── <Profile userId={...} />        内部 use(profilePromise) 挂起
 ├── <Suspense fallback={<CommentsSkeleton/>}> 边界 B：只等"评论"，与 A 互不拖累
 │    └── <Comments commentsPromise={...} />
 └── <RelatedList />                 纯静态推荐位，秒出
```

边界放置的四条原则，逐条展开：

1. **静态内容不包边界**。Header、侧栏、页脚这些不依赖异步数据的部分放在任何 Suspense 之外，请求再慢它们也立即出现——这就是"页面外壳（shell）秒开"的来源。反面：整页包一个边界，等于宣布"我全部是骨架"。
2. **边界对齐"数据区块"而不是"组件"**。一个区块（作者卡、评论区）一个边界；不要给区块内部的小零件单独加边界（标题一个、头像一个、签名一个——三个 spinner 交替闪，就是风暴本暴）。
3. **平级边界互相独立**。边界 A 挂起不影响边界 B 的内容出现；渲染时已就位的区块先流入 HTML（服务端流式的分块单位就是边界）。
4. **更新优先用 startTransition 而不是新边界**。已在屏上的内容切换数据时（点 Tab 换列表），`startTransition` 会让 React 保留旧 UI 直到新数据就绪（不闪 fallback）；而新增一个边界只会显示又一片骨架。原则：**加载用 Suspense，切换用 transition**。

fallback 设计两条：优先**骨架屏**（Skeleton）而非 spinner——骨架模拟最终布局，不引起内容跳动（CLS 友好），且和边界原则天然配合（每个区块的骨架形状对应区块本身）；fallback 的尺寸尽量接近最终内容，避免"补齐瞬间页面跳一大截"。

**代码示例：一个符合上述原则的页面骨架。**

```tsx
import { Suspense, use, useMemo, useState, useTransition } from 'react';

interface Profile {
  name: string;
  bio: string;
}

function ProfileSkeleton() {
  return <div className="h-24 animate-pulse rounded bg-slate-200" aria-hidden />; // 骨架与成品同尺寸
}

export function ArticlePage({ fetchProfile }: { fetchProfile: () => Promise<Profile> }) {
  const [isPending, startTransition] = useTransition();
  const [profilePromise, setProfilePromise] = useState(() => fetchProfile());

  function switchTab() {
    // 切换数据：保留旧 UI（transition），而不是闪烁新的 fallback
    startTransition(() => {
      setProfilePromise(fetchProfile());
    });
  }

  return (
    <main>
      <Header />
      <button onClick={switchTab} disabled={isPending}>换个作者</button>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileBlock profilePromise={profilePromise} />
      </Suspense>
      <RelatedList />
    </main>
  );
}

function ProfileBlock({ profilePromise }: { profilePromise: Promise<Profile> }) {
  const profile = use(profilePromise); // 未完成则挂起，由最近的 Suspense 边界接管
  return <div>{profile.name} / {profile.bio}</div>;
}
```

这个例子同时示范了原则 2（边界只包 ProfileBlock）、原则 3（RelatedList 秒出）与原则 4（切换走 transition）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：页面一打开满屏小 spinner 齐闪。根因：边界切得太碎，每个小组件一个 Suspense。修法：按"数据区块"合并边界；把 fetch 的 promise 提升到区块级（多个组件共用同一个 promise，`use` 天然支持）。
2. 症状：切换 Tab 时内容闪回骨架。根因：切换数据源时组件因 key 变化或边界重新挂起，fallback 又出现了。修法：切换包进 `startTransition`（如上例），React 会保持旧内容直到新数据就绪。
3. 症状：fallback 消失瞬间页面布局大跳。根因：fallback（如一行小字）与最终内容（如 600px 高的列表）尺寸差距过大。修法：骨架屏与成品同构同尺寸；最小限度也用一个固定高度的占位容器。

---

### Next.js（App Router）

原大纲条目（骨架）：

1. **RSC vs 客户端组件**边界划分（`'use client'` 放哪）
2. SSR / SSG / ISR / 流式渲染的取舍
3. Server Actions（表单不写 API 也能提交）
4. 缓存与重验证（revalidate / revalidateTag）
5. 水合错误（hydration mismatch）的成因与排查
6. Metadata、路由组、中间件、动态路由

---

#### 1. **RSC vs 客户端组件**边界划分（`'use client'` 放哪）

**是什么。** App Router 里所有组件默认是**服务端组件（RSC）**：只在服务器执行，代码不进浏览器包，可以直接 `async/await` 访问数据库与密钥。文件顶部写 `'use client'` 后，该文件（及其 import 的一切）成为**客户端组件**：打进浏览器包，拥有 state、effect、事件、浏览器 API。

**为什么需要。** 划这条边界解决两个问题：包体积（不需要交互的页面不该把逻辑发到浏览器）与安全（密钥、直连数据库的代码不该有进浏览器的可能）。边界划在哪，直接决定产品三件事：首屏 JS 多大、数据在哪取、密钥暴露风险。

**执行模型（机制分步）。** 先把混合渲染的流程搞对，后面所有条目都建立在这上面：

```text
浏览器请求 /posts
   ↓
Next 服务器执行 RSC 树（page.tsx、无 'use client' 的组件，可 async、可查库）
   ↓ 产出两样东西：
   ① HTML（首屏可见内容 + 客户端组件的占位）
   ② RSC Payload（组件树的序列化数据——后续导航就靠它，不再要 HTML）
   ↓ 浏览器收 HTML 立即渲染，同时下载 JS
   ↓ 客户端组件 hydrate（接管交互；RSC 部分仍是"纯产物"，浏览器不执行其代码）
   ↓ 点链接导航到 /posts/1
   ↓ 服务器只返回该路由的 RSC Payload，客户端就地更新（无整页刷新）
```

**`'use client'` 的正确位置——叶子优先决策法。** 关键认知：`'use client'` 标记的是**边界入口**——该文件是边界，它 import 的所有模块（除非那些模块自己再被服务端以 children 方式喂进来）都会被拉进客户端。所以决策法只有一条：**从"谁需要交互"出发，把 'use client' 尽量推向树的叶子**。

判定清单，按顺序过：

| 组件需要什么 | 应该放哪 |
|---|---|
| useState / useEffect / 事件处理 / 浏览器 API（window、localStorage） | 客户端（叶子） |
| 只展示数据、格式化、map 渲染 | 服务端 |
| 直接 fetch/查数据库、读密钥、调内部服务 | **只能**服务端 |
| 大依赖库（图表、编辑器）且仅交互时用 | 客户端叶子 + 动态 import |

反模式对照：

```tsx
// ❌ 反模式：页面因为要一个搜索框就整页 'use client'
'use client';
export default async function Page() {        // 还顺带报错：client 组件不能 async
  const posts = await db.post.findMany();      // db 客户端（含密钥）打进浏览器！
  return <PostsPageClient posts={posts} />;    // 整树进客户端 bundle
}

// ✅ 正确：页面保持服务端，交互下沉成叶子
import { db } from '@/lib/db';
import { SearchBox } from './SearchBox'; // 内部 'use client'，只有它是客户端

export default async function Page() {
  const posts = await db.post.findMany(); // 服务端查库，密钥不出服务器
  return (
    <main>
      <h1>文章</h1>
      <SearchBox />                        {/* 交互叶子：很小一片客户端 */}
      <PostList posts={posts} />            {/* 其余全是 RSC，零客户端 JS */}
    </main>
  );
}
```

**children 模式：让"客户端壳"包住"服务端内容"。** 有时布局壳必须交互（主题切换的 header），但下面的内容不必跟着进客户端。利用 children：children 是**服务端渲染好再传进来**的，不算 client 组件的 import 依赖——

```tsx
// app/layout.tsx（服务端）
import { ThemeShell } from './ThemeShell'; // 'use client'：只管主题切换

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeShell>{children}</ThemeShell> {/* children 在服务端渲染，不进客户端包 */}
      </body>
    </html>
  );
}
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：客户端组件里 import 了含数据库连接的模块，构建报错或密钥进了 bundle。根因：`'use client'` 的 import 闭包整体进客户端。修法：依赖倒置——数据在服务端组件取好，作为**可序列化 props** 传下来。
2. 症状：给客户端组件传了函数/类实例 prop，报 "Functions cannot be passed directly to Client Components"。根因：跨边界的 props 要经过序列化。修法：传数据；确要传行为，把行为做成服务端 action 传引用（下一节）。
3. 症状：'use client' 写在了被服务端导入的文件的**子文件**里没生效。根因：'use client' 只认"模块文件顶部第一行"（注释除外）。修法：检查位置——必须在文件最顶、任何 import 之前。

---

#### 2. SSR / SSG / ISR / 流式渲染的取舍

**是什么。** 这是"页面的 HTML 在什么时机、由谁生成"的四种策略。App Router 的一大简化：**不再是 Pages Router 那样三选一函数（getStaticProps/getServerSideProps）**，而是由"页面里用了什么"自动推导，必要时用段配置（segment config）显式声明。

**对比表与逐行展开。**

| 渲染方式 | HTML 生成时机 | 首字节速度 | 数据新鲜度 | 典型场景 | App Router 写法 |
|---|---|---|---|---|---|
| SSG（静态） | 构建时一次 | 最快（CDN 直出） | 构建时快照 | 文档、博客、落地页 | 默认：不用动态 API 就是静态 |
| ISR（增量静态） | 构建时 + 之后按周期/按需再生 | 快（命中 CDN） | 秒级延迟可接受 | 商品页、榜单、热门文章 | `export const revalidate = 60` 或 fetch 配 tags |
| SSR（动态） | 每次请求时 | 取决于服务端耗时 | 实时 | 仪表盘、搜索结果、个性化页 | 页面里用了 `cookies()`/`headers()`/`searchParams`，或 `export const dynamic = 'force-dynamic'` |
| 流式 | 请求即推首字节，之后分块到达 | 首字节快 | 静态壳 + 各块各自新鲜 | 慢区块多的大页面 | RSC 默认支持，按上一节的边界切分块 |

选型决策清单（从上往下过，第一条命中即停）：

1. 内容对所有人一样且构建时可知 → **SSG**。
2. 对所有人一样但会变（分钟级容忍）→ **ISR**（配合下一节的 `revalidateTag` 做到"发布即更新"）。
3. 因人而异（登录态）或必须实时（搜索）→ **SSR 动态**。
4. 页面一部分慢（重查询、第三方接口）→ 保持前三种之一的同时，把慢块装进 Suspense 边界 → **流式**（流式不是独立选项，是叠加能力）。

注意一个高频误解：**用了 SSR（动态）不等于放弃 SEO**，动态页同样输出完整 HTML；同理 **SSG 页面里也可以有客户端交互叶子**（静态的是首屏 HTML，水合后照样交互）。四种方式说的是"HTML 何时生成"，与"组件在哪运行"（上一节）是两个正交维度。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：本想静态化的页面每次请求都重新渲染（构建输出里它是 ƒ Dynamic）。根因：页面里（哪怕在深层组件里）用了 `cookies()`/`headers()`/`searchParams` 之一——它们天然把路由拉成动态。修法：审视是否真需要；确实需要就接受动态，或把用动态 API 的部分拆成 Suspense 子块让其余部分保持静态。
2. 症状：`export const revalidate = 60` 没生效，数据永远不更新。根因：Next 15 起 fetch 默认不缓存（下一节详述），页面虽标记 ISR，数据本身每次 fetch 都新拉——页面 shell 再生但内容即时，让人误判。修法：明确数据缓存意图：`fetch(url, { cache: 'force-cache' })` 或 `next: { revalidate: 60 }`。
3. 症状：以为选了流式就解决了"慢"，页面还是整体很慢。根因：流式只是把"等待"分块并提前交付首字节，总工作量没少。修法：慢的根源（慢查询、慢接口）该优化优化，流式解决的是"体感"不是"算力"。

---

#### 3. Server Actions（表单不写 API 也能提交）

**是什么。** Server Action 是**在服务端执行的函数**，却能直接被客户端（表单、按钮、事件处理器）调用——Next.js 在构建期为它生成一个 RPC 端点，你不用手写 API 路由、不用手写 fetch 封装。定义方式：文件顶部 `'use server'`（文件内所有导出都是 action），或函数体第一行内联 `'use server'`。

**为什么需要。** 传统表单链路：客户端 onSubmit → fetch('/api/xxx') → 路由处理器 → 校验 → 写库 → 返回 → 客户端处理消息。六步里有四步是搬运样板。Server Actions 把链路压成：表单 `action={createPost}` → 完事。校验在服务端、数据库访问在服务端、返回值直接回到表单 state（配合阶段 9 前半的 `useActionState`），两端代码写在同一个函数里。

**怎么做（完整示例：发布文章）。**

```ts
// app/posts/actions.ts
'use server'; // 本文件所有导出都成为 Server Action：只在服务端执行

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';       // NextAuth（见本阶段产出作业）
import { db } from '@/lib/db';       // 数据库客户端（密钥只在服务端）

const CreatePostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(80, '标题最长 80 字'),
  content: z.string().min(1, '正文不能为空'),
});

export type CreatePostResult = { ok: boolean; message: string };

export async function createPost(formData: FormData): Promise<CreatePostResult> {
  // 第一道闸：权限。Server Action 是暴露在公网的 POST 端点，任何人不带表单也能直接调
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: '请先登录' };
  }

  // 第二道闸：输入校验。永远不要相信 FormData
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  await db.post.create({
    data: { ...parsed.data, authorId: session.user.id },
  });

  // 第三件事：让缓存知道数据变了（下一节展开）
  await revalidatePath('/posts'); // Next 15 起 revalidatePath 是异步的，必须 await

  return { ok: true, message: '发布成功' };
}
```

客户端用法：用阶段 9 前半学的 `useActionState` 直接包服务端 action，两端 API 无缝咬合——这正是 React 19 Actions 与 Server Actions 的设计意图。附带一个渐进增强红利：`action` 表单在禁用 JS 的浏览器里退化为原生表单提交（POST 到当前路由），依然工作。

```tsx
// app/posts/NewPostFormClient.tsx
'use client';

import { useActionState } from 'react';
import { createPost, type CreatePostResult } from './actions';

export function NewPostForm() {
  const [state, formAction, isPending] = useActionState<CreatePostResult, FormData>(
    createPost,
    { ok: false, message: '' },
  );

  return (
    <form action={formAction}>
      <input name="title" placeholder="标题" required />
      <textarea name="content" placeholder="正文" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '发布中…' : '发布'}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：action 里的代码在浏览器里执行了/构建报 "Server Actions must be async"。根因：`'use server'` 的函数必须是 async 且不能被客户端代码直接 import 执行体（调用会变成 RPC）。修法：确保 action 文件顶部声明、函数 async；客户端只能"引用"它（传给 action 或调用后 await 返回值）。
2. 症状：action 处理器没带任何参数，却被恶意直接 POST 调用成功写库。根因：Server Action 是公网端点，`<form>` 只是众多调用方式之一。修法：**每个 action 内部第一行做鉴权**（如上例），输入一律 zod 校验；中间件只是分流器，不是安全边界。
3. 症状：提交成功后列表没更新。根因：页面/数据被缓存（下一节的 Full Route Cache / Data Cache 命中旧值）。修法：在写操作后调用 `await revalidatePath('/posts')` 或按 tag 失效。

---

#### 4. 缓存与重验证（revalidate / revalidateTag）

**是什么。** Next.js 的缓存是**分层**的，理解分层才能解释"为什么改了数据页面不变"这类玄学。四层速览：

| 层 | 存在哪 | 缓存什么 | 失效手段 |
|---|---|---|---|
| 请求去重（Request Memoization） | 单次渲染内 | 同一 render 里相同的 fetch | 自动（仅当次渲染有效） |
| 数据缓存（Data Cache） | 服务端、跨请求 | fetch 的响应 | `revalidate` 时间 / `revalidateTag` / `revalidatePath` |
| 全路由缓存（Full Route Cache） | 服务端 | 静态页的 HTML + RSC Payload | 同上（连带失效） |
| 路由器缓存（Router Cache） | **浏览器** | 已访问路由的 Payload | 受 `staleTimes` 影响；`router.refresh()` 强刷 |

**先记一个版本关键点**：**Next.js 15 起，`fetch` 默认不缓存**（Next 14 及以前默认缓存，是一次著名的语义反转）。所以"缓存"在新项目里是**显式 opt-in** 的行为：

```ts
// 显式缓存（进入 Data Cache，跨请求复用）
await fetch('https://api.example.com/posts', { cache: 'force-cache' });

// 时间驱动：缓存 60 秒，到期后下次请求再生（ISR 的数据侧）
await fetch('https://api.example.com/hot', { next: { revalidate: 60 } });

// 默认：不缓存（Next 15 行为，每次都新拉）
await fetch('https://api.example.com/user/meal');
```

**revalidateTag 的心智模型：给缓存起组名，写操作后按组作废。** 时间驱动的 `revalidate: 60` 有个天然缺陷——发布文章后最多要等 60 秒才可见，运营无法接受。标签失效把时机交给你：

```ts
// 数据侧：缓存的同时打标签（标签是任意的组名）
const res = await fetch('https://api.example.com/posts', {
  cache: 'force-cache',
  next: { tags: ['posts'] }, // 所有命中此 URL 的缓存都归入 posts 组
});
```

```ts
// 写侧：在 Server Action 里按标签作废（Next 15：必须 await）
import { revalidateTag, revalidatePath } from 'next/cache';

export async function publishPost(formData: FormData) {
  await db.post.create({ data: { /* ... */ } });
  await revalidateTag('posts');          // 所有打 posts 标签的缓存全部作废，下次请求重拉
  await revalidatePath('/posts/[slug]', 'page'); // 或按路径作废整个路由的静态产物
}
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：调了 `revalidateTag` 但没生效，甚至构建/运行报错。根因：Next 15 起 `revalidateTag`/`revalidatePath` 返回 Promise，不 await 就调用会在请求结束时被取消。修法：一律 `await revalidateTag('posts')`。
2. 症状：数据明明 revalidate 了，客户端点导航看到的还是旧列表。根因：命中的是**浏览器里的 Router Cache**（第四层），服务端失效管不到它。修法：调用后 `router.refresh()`（强制重取当前路由的 Payload）；或依赖默认的 staleTimes 在短时间后自然过期。
3. 症状：从 Next 14 迁移来的代码处处依赖"fetch 默认缓存"，升级 15 后所有页面悄悄变成每次实时拉取、服务端压力大增。根因：默认值反转。修法：迁移期用 `next.config.js` 的 `experimental.fetchCache = 'default-cache'` 暂时恢复旧行为，然后逐个 fetch 明确意图后摘掉开关。

---

#### 5. 水合错误（hydration mismatch）的成因与排查

**是什么。** 水合（hydration）= 浏览器把服务端渲染的 HTML 与客户端 JS 连接起来（挂事件、赋状态）。前提是**两端渲染结果一致**；不一致时就报 hydration mismatch，React 19 的报错会直接 diff 出不一致的节点与属性，然后丢弃服务端 HTML 用客户端结果重渲染（白闪 + 性能损耗 + SEO 抖动）。

**为什么需要（成因表）。** 服务端与客户端是两台"机器"、两个时刻，一切依赖"哪台机器/哪个时刻"的值都可能两端不一致：

| 成因 | 例子 | 为什么两端不同 |
|---|---|---|
| 时间 | `new Date().toLocaleTimeString()` | 服务端与浏览器执行时刻不同 |
| 随机 | `Math.random()`、`crypto.randomUUID()` | 两次执行结果天然不同 |
| 浏览器环境 | `window.innerWidth`、`navigator.language` | 服务端没有 window/navigator（是 undefined） |
| 持久化 | `localStorage.getItem('theme')` | 服务端没有 localStorage |
| 第三方注入 | 浏览器插件往 DOM 塞属性（语法高亮、翻译） | 服务端渲染时不存在 |
| 非法 HTML 嵌套 | `<p>` 里放了 `<div>` | 浏览器解析 HTML 时"纠错"移动了节点，与 React 认知的结构不符 |

**排查法（操作步骤）。** 1) 读报错——React 19 会打印出两棵树的 diff（哪个标签、哪个属性不一致），从它指的组件下手；2) 检查该组件渲染路径上所有"非确定"来源（对照上表）；3) 仍然定位不到就二分：从页面顶层开始注释子组件，缩小到再注释就不再报错的最小子树；4) 修复时按下面的模式选。

**修复模式库。** 标准解法是"两端渲染一致的占位，挂载后再换成真实值"：

```tsx
'use client';

import { useEffect, useState } from 'react';

export function Clock() {
  // 首帧渲染 '--:--:--'（两端一致）；useEffect 只在客户端执行，绝不参与水合对比
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('zh-CN'));
    update(); // 挂载后立刻给真值
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return <time>{time}</time>;
}
```

模式速查：

- 时间/随机/window/localStorage → 上面的"稳定占位 + useEffect"。
- 动态生成的 `id`（表单与 label 关联）→ 用 `useId()`，它保证两端生成一致的 id。
- 确有少量文本级双端差异（如时间戳组件想服务端也出值）→ 该元素的文本加 `suppressHydrationWarning`——**只作用于当前元素的文本，且是最后手段**，滥用会把真 mismatch 也压下去。
- 纯浏览器组件（图表、地图）→ `next/dynamic` + `ssr: false`（注意：只能在客户端组件里用）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：整页报 mismatch 但报错指向一个很深的 `<span>`。根因：非法 HTML 嵌套被浏览器纠错（如 `<p><div/></p>`），位移从嵌套点开始波及后续。修法：检查报错位置之前的兄弟节点是否用了不能嵌套该子元素的标签（p、ul 的直接子元素等）。
2. 症状：本地开发一直正常，某用户浏览器必报。根因：浏览器插件注入（翻译、密码管理器高亮）。修法：给该容器加 `suppressHydrationWarning` 只针对注入点（这类 mismatch 无害）；注意 suppress 只该用于"确认无害的双端差异"，限定到最小文本节点，否则会把真正的 bug 一并掩盖。

---

#### 6. Metadata、路由组、中间件、动态路由

这一条是 App Router 文件约定与页面配套能力的"快速地图"——每项给最小可用写法与何时使用。

**Metadata：页面元数据。** 静态直接导出对象；动态（依赖路由参数）用 `generateMetadata`：

```tsx
// app/posts/[slug]/page.tsx
import type { Metadata } from 'next';
import { db } from '@/lib/db';

// 静态：export const metadata: Metadata = { title: '关于我们' };
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }, // Next 15：params 是 Promise
): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  return {
    title: post?.title ?? '文章',
    description: post?.summary, // 分享卡片与搜索摘要都用它
  };
}
```

约定式文件也属于这一族：`app/sitemap.ts`、`app/robots.ts`、`app/icon.png`，按文件名自动生效。

**文件树总览（其余三项的地图）。**

```text
app/
├── layout.tsx                    # 根布局（必有：<html><body>）
├── page.tsx                      # 首页 /
├── (marketing)/                  # 路由组：括号目录，不影响 URL
│   ├── layout.tsx                #   仅营销页共用的布局（带官网导航）
│   ├── about/page.tsx            #   → /about
│   └── pricing/page.tsx          #   → /pricing
├── dashboard/
│   └── page.tsx                  # → /dashboard
├── posts/
│   ├── page.tsx                  # → /posts
│   └── [slug]/page.tsx           # 动态路由 → /posts/hello-world
├── docs/
│   └── [...slug]/page.tsx        # 捕获所有段 → /docs/a/b/c（slug 是数组）
└── api/auth/[...nextauth]/route.ts  # Route Handler（API 路由）
middleware.ts（或 15.5+ 的 proxy.ts） # 请求进入前的拦截层，放项目根或 src/
```

逐项展开：

- **路由组 `(name)`**：唯一作用是"共享布局而不污染 URL"。典型用法：营销区与产品区分开两套 layout；后台的 `(admin)` 组强制鉴权布局。坑：两个组里不能有会撞成同一路径的 page（`/(a)/x/page.tsx` 与 `/(b)/x/page.tsx` 同时存在会构建报错）。
- **动态路由 `[slug]`**：一个方括号一段；Next 15 起 `params` 是 Promise，页面组件要 `await`：

```tsx
// app/posts/[slug]/page.tsx
export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next 15：必须 await
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) notFound(); // 触发 not-found.tsx
  return <article><h1>{post.title}</h1></article>;
}

// 纯静态内容想预渲染多个 slug：
export async function generateStaticParams() {
  const posts = await db.post.findMany();
  return posts.map((p) => ({ slug: p.slug })); // 构建时把这些 slug 全部 SSG
}
```

- **中间件（middleware.ts → proxy.ts）**：在请求进入路由前运行，做重定向/改写/加头，最典型是未登录拦截。**版本注意**：Next.js 15.5 起该约定更名为 `proxy.ts`（导出函数 `proxy`），16.0 起 `middleware.ts` 正式废弃——新项目直接用 proxy，老项目可用官方 codemod 迁移（`npx @next/codemod@canary middleware-to-proxy .`）。以 proxy 形态写的鉴权拦截：

```ts
// proxy.ts（项目根，与 app 同级；旧版本叫 middleware.ts、函数名 middleware）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 简化示例：检查会话 cookie（NextAuth 的会话校验实际用 auth 包装，见产出作业）
  const hasSession = request.cookies.has('authjs.session-token');
  if (!hasSession && request.nextUrl.pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname); // 登录后回跳
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next(); // 放行
}

export const config = {
  // matcher：只拦截需要的路径，务必排除静态资源（否则 CSS/图片都被拦）
  matcher: ['/dashboard/:path*'],
};
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：页面组件里直接 `params.slug` 用出 undefined。根因：Next 15 起 params/searchParams 是 Promise。修法：`const { slug } = await params;`（类型也是 `Promise<{...}>`）。
2. 症状：路由组里新建页面后构建报 "You cannot have two parallel pages that resolve to the same path"。根因：两个路由组里的 page 撞了同一路径。修法：路径错开，或合并到一个组。
3. 症状：middleware/proxy 写完后所有请求（含 `_next/static` 的 JS/CSS）都被重定向，页面裸奔无样式。根因：没配 matcher，拦截器跑了全量请求。修法：如上配 matcher 精确圈定，或用负向正则排除 `_next`。

---

### ✅ 产出：全栈小应用（Next.js + 数据库 + NextAuth 鉴权 + Vercel 部署），如博客、记账本。

这是基础篇的毕业作业。二选一（也允许自定主题，但技术验收项不变）：**博客** 或 **记账本**。

**功能清单（博客版）。**

| 模块 | 功能点 | 技术落点 |
|---|---|---|
| 文章 | 列表（分页）、详情（Markdown 渲染）、创建/编辑/删除 | RSC 数据页 + Server Actions |
| 标签 | 打标签、按标签筛选 | 动态路由 `[tag]` + URL 查询参数 |
| 鉴权 | 仅登录用户可写；游客只读 | NextAuth + proxy/middleware 拦截 |
| 体验 | 发布中状态、失败提示、乐观发布（可选加分） | useActionState / useOptimistic |
| 元数据 | 每篇文章独立的 title/description | generateMetadata |

**功能清单（记账本版）。**

| 模块 | 功能点 | 技术落点 |
|---|---|---|
| 记录 | 收入/支出录入（金额、分类、备注、日期） | Server Action 表单 + zod 校验 |
| 分类 | 分类管理（增删） | ISR + revalidateTag |
| 统计 | 月度汇总、分类占比图表 | RSC 聚合查询 + 客户端图表叶子 |
| 筛选 | 按月份/分类筛选，条件同步 URL | searchParams（记得 await） |
| 鉴权 | 数据按用户隔离 | NextAuth session.user.id 作数据属主 |

**技术验收清单（两版通用，逐项打勾）。**

1. 至少 1 个纯 RSC 数据页（无 'use client' 的页面级取数）与至少 1 个客户端交互叶子（图表/搜索框）。
2. 至少 2 个 Server Action 表单走通 `useActionState`（含 isPending 与错误消息）。
3. 至少 1 处 `revalidateTag`（或 `revalidatePath`）在写操作后正确刷新缓存。
4. NextAuth 登录可用，受保护路由未登录被重定向。
5. 无 hydration mismatch（构建 `next build` 通过且浏览器控制台干净）。
6. 阶段 8 的 Playwright 登录主流程（登录→操作→断言）在本应用上跑通。
7. 部署到 Vercel，线上可用。

**NextAuth 要点（Auth.js v5 形态）。** 四件套记牢：

```ts
// src/auth.ts —— 唯一的配置源
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub], // 本地开发可先配 Credentials 演示，GitHub 登录最省事
});
```

```ts
// src/app/api/auth/[...nextauth]/route.ts —— 把 handlers 挂到 API 路由
import { handlers } from '@/auth';

export const { GET, POST } = handlers; // 登录/登出/回调全部由它处理
```

```tsx
// 服务端组件读会话（RSC 的常规姿势）
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login'); // 服务端守卫，比纯前端守卫可靠
  return <h1>你好，{session.user.name}</h1>;
}
```

客户端登录/退出按钮：在 `'use client'` 组件里 `import { signIn, signOut } from '@/auth'`，按钮的 onClick 分别调 `signIn('github')` 与 `signOut()`——注意 signIn/signOut 也是从你自己的 `@/auth` 导出的，不来自 next-auth 包本体。

环境变量三件套（`.env.local`，部署时同样配进 Vercel）：`AUTH_SECRET`（`openssl rand -base64 32` 生成）、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`（GitHub OAuth App 里创建，回调地址 `http://localhost:3000/api/auth/callback/github`，线上加一条生产地址）。

**部署 Vercel 步骤概要。** 1) 代码推到 GitHub；2) vercel.com 上 Add New Project → 导入仓库（框架自动识别为 Next.js，构建零配置）；3) Environment Variables 里配 `AUTH_SECRET`/`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` 与数据库连接串；4) Deploy——此后每次 push 到 main 自动部署生产，每个 PR 自动生成 preview URL；5) 数据库用云 PG（Neon / Supabase 免费档即可），连接串入环境变量，`AUTH_TRUST_HOST=true` 让 NextAuth 在非 localhost 域名下正常工作；6) Settings → Domains 绑定自定义域名（自动签 HTTPS）。也可以全程 CLI：`npx vercel` 预览、`npx vercel --prod` 上生产。

---

## 阶段 10：进阶原理（可选，面试导向）

> 想真正吃透原理，直接走"复刻路线"：从 200 行 render 到带 Fiber/Hooks/调和的 mini React，见《[react-源码复刻大纲.md](react-源码复刻大纲.md)》——本阶段的概念在复刻中会全部自然获得。

这一阶段的定位是"概念层"：每条用 150–300 字讲清机制直觉，配一个小图或代码。它们足够撑起绝大多数面试问答；但若目标是"写得出"，请直接走上面引用的复刻路线——那是一条从零手写 mini React 的路径，本阶段每一条在复刻中都会变成你亲手敲过的代码。

1. **Fiber 架构通俗理解（可中断渲染、优先级）**

   Fiber 是"把一次大渲染切成小任务"的机制，对应两样东西：一种**数据结构**（组件树的链表化表示：每个节点通过 child/sibling/return 指针相连，取代不可中断的递归树）和一个**工作循环**（每次处理一个节点，处理完检查"该不该把主线程还给浏览器"）。渲染因此分成两阶段：render/协调阶段逐节点diff、可随时中断与重做；commit 阶段把算好的变更一次性同步写入 DOM（不可中断，避免用户看到半成品）。优先级通过 lanes（32 位位图）表达：用户输入是高优先级 lane，可以让低优先级的渲染作废重来——这就是"可中断渲染"的全部含义。

```text
Fiber 节点（简化）：                 工作循环（简化）：
{ type, key,                        while (有下一个节点 && !shouldYield()) {
  return: 父节点,                      处理当前节点（diff，标记副作用）;
  child: 第一个子节点,                  前进到下一个节点;
  sibling: 右侧兄弟,                 }
  stateNode: DOM 实例,               shouldYield() 为真 → 让出主线程 →
  flags: 副作用标记 }                浏览器处理输入/绘制 → 恢复循环
```

2. **Diff 算法与 key 的作用机制**

   React 的协调是 O(n) 的启发式算法，三条规则：不同类型的元素（div → span）整棵子树销毁重建；同类型元素复用 DOM 节点只更新变化的 props；同级子列表用 key 匹配身份——key 相同视为"同一个节点移动了位置"，只移动不重建；key 在旧列表消失则卸载、新出现则挂载。**key 的本质是身份标识，不是序号**：用 index 作 key 时，列表头部插入一项会让所有后续项的 key 错位，React 认为"B 变成了 C"，于是用 C 的内容更新 B 的 DOM 实例——DOM 复用了，但组件内部的 state（输入框草稿、勾选态）仍留在"位置"上，出现阶段 1 讲过的列表状态错乱。

```text
旧列表: [A(key=a), B(key=b), C(key=c)]
头部插入 X：
✅ key 正确: [x,a,b,c] → 只新增 1 个 DOM，a/b/c 原地保留（含内部 state）
❌ index 作 key: 位置 0 的 key 从 a 变 x、1 从 b 变 a…
   → React 逐位"更新"：B 的 DOM 被改成 C 的内容，内部 state 跟着位置错位
```

3. **批处理与自动批处理（React 18 前后差异）**

   批处理指"多次 setState 合并为一次渲染"。React 17 及以前：只有 **React 事件处理器内**的多次 setState 会合并；Promise.then、setTimeout、原生事件监听器里的每次 setState 都各自触发一次渲染——所以老代码里常见 `setA(...); setB(...);` 在 setTimeout 里造成两次渲染的性能坑，解法要手动包 `unstable_batchedUpdates`。React 18 起**自动批处理覆盖一切上下文**：事件、Promise、setTimeout、原生事件里的更新一律合并，一次渲染收尾。这也是升级 18 后"Profiler 里渲染次数变少"的原因。逆需求（确需同步读取 DOM 尺寸的场景）用 `flushSync` 强制立即渲染。

```tsx
// React 18+：无论这段代码在事件处理器、setTimeout 还是 .then 里，都只渲染 1 次
setCount((c) => c + 1);
setFlag((f) => !f);
setName('ada');
// React 17：在 setTimeout/then 里会渲染 3 次；18+ 渲染 1 次
```

4. **合成事件与事件委托**

   合成事件（SyntheticEvent）是 React 对原生事件的统一包装：跨浏览器一致的属性与方法（`preventDefault`/`stopPropagation` 行为统一）、以及统一的批量更新入口。实现方式是**事件委托**：React 不在每个节点上绑监听器，而是在应用挂载时于**根容器**（React 17 起从 document 下移到 root 容器，解决多应用共存与更精确的事件边界）绑定一套监听；事件发生时，从实际目标沿树向上模拟捕获与冒泡，按序调用各层 JSX 上写的事件处理器。两个实用推论：其一，事件处理器里连续 setState 之所以能批处理，正是因为它们都发生在同一个合成事件派发过程里（与上一条互为表里）；其二，需要原生行为时用 `e.nativeEvent` 拿到原生事件对象。

```text
点击 <button onClick={h}>：
原生 click 冒泡到 #root（React 在挂载时就监听了 root）
   → React 按树从根到目标"捕获"、再从目标到根"冒泡"，逐层调用你写的 onClick
   → 同一派发过程里的 setState 被收进同一批次 → 一次重渲染
```

5. **`useSyncExternalStore` 原理（外部 store 桥接）**

   Zustand、Redux 这些独立于 React 的 store，如何接进并发渲染而不出乱子？`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` 是官方桥：渲染期间调用 `getSnapshot` 读值并交给 React 做**一致性校验**——若渲染过程中外部 store 又变了（并发渲染的两次读取本可能"撕裂"成两个版本），React 丢弃本次渲染重来；`subscribe` 注册的回调在 store 变化时通知 React 用 `getSnapshot` 的最新值调度一次一致的更新；第三个参数 `getServerSnapshot` 让 SSR 与水合阶段读到同一个服务端值。使用上有条铁律：**getSnapshot 必须返回缓存的引用**（Object.is 比较），每次调用都 `new` 一个对象/数组，会被判定为"store 一直在变"，直接无限循环。

```tsx
import { useSyncExternalStore } from 'react';

// 最小实现：接住任何 (subscribe, getSnapshot) 形态的外部 store
export function useStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T): T {
  return useSyncExternalStore(subscribe, getSnapshot);
}
// 渲染时读快照并校验一致性；store 变化 → 回调 → 用新快照重新渲染——
// 并发模式下两次读到的快照永远同版本，不会出现"撕裂"
```

6. **并发特性：transition 调度原理**

   `useTransition`/`startTransition` 把更新分成两种优先级：**紧急更新**（用户输入、点击——必须立即反馈）与**过渡更新**（搜索结果列表、Tab 面板内容——可以稍等）。机制上，两种更新进入不同的 lanes；紧急更新插队时，正在进行的过渡渲染会被**作废丢弃**（而不是排队阻塞），等紧急渲染交付后基于最新 state 重新来过。这就是"大列表搜索不卡输入框"的原理：输入框的 setState 是紧急的，列表渲染是过渡的，两者互不阻塞；`isPending` 则是过渡渲染尚未交付的标志。`useDeferredValue` 是同一机制的值视角封装（推迟一个值的消费）。

```tsx
const [keyword, setKeyword] = useState('');
const [isPending, startTransition] = useTransition();

function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  setKeyword(e.target.value);                    // 紧急：输入框立即跟上手指
  startTransition(() => {
    setResults(filterHugeList(e.target.value));  // 过渡：重渲染可被打断、重做
  });
}
// {isPending && <Skeleton/>}——过渡未交付时可以显示轻量占位
```

读到这里，概念地图已经完整；下一步把地图变成肌肉记忆，就去《[react-源码复刻大纲.md](react-源码复刻大纲.md)》动手复刻。

---

## 贯穿全程的项目线

| 等级 | 项目 | 覆盖阶段 |
|---|---|---|
| Lv1 | TodoMVC | 阶段 1–2 |
| Lv2 | 迷你组件库 + Storybook | 阶段 3、7 |
| Lv3 | 后台管理系统 | 阶段 4–6、8 |
| Lv4 | Next.js 全栈应用 + 部署 | 阶段 9 |

这张表是整份大纲的"进度存档点"。逐行展开每一级的验收要点——**满足验收再进入下一级**，比赶进度重要得多：

**Lv1：TodoMVC（覆盖阶段 1–2）。** 验收清单：

1. 增删改、双击编辑、勾选完成、清除已完成，全部操作**无一处直接操作 DOM**（纯 state 驱动）。
2. 过滤 Tab（全部/未完成/已完成）的状态放 URL 查询参数，刷新后过滤器不丢。
3. localStorage 持久化：刷新后列表原样恢复（手写 useLocalStorage）。
4. 搜索框防抖 300ms（手写 useDebounce），快速输入只触发一次过滤。
5. 能口头回答三个问题：为什么 setState 后立刻读 state 是旧值；为什么 effect 清理函数能防竞态；`count && <Tag/>` 当 count 为 0 时渲染了什么。

**Lv2：迷你组件库 + Storybook（覆盖阶段 3、7）。** 验收清单：

1. Button / Input / Select / Modal / Tabs 五件套，每个都有完整 TS Props 类型与 JSDoc 注释。
2. Select 是泛型组件（阶段 7 第 3 条的形态），options/value/onChange 三处类型一致。
3. Input 与 Modal 支持 ref 透传（React 19 的 ref-as-prop 写法），Modal 用 createPortal 实现。
4. 每个组件至少一个 Storybook story；受控/非受控双模式至少在 Input 上实现并各有一个 story 演示。
5. 变体系统用 Record 映射或 cva，新增一个变体只改一处映射（阶段 7 第 5 条）。

**Lv3：后台管理系统（覆盖阶段 4–6、8）。** 验收清单：

1. 登录鉴权（受保护路由 + 401 跳转 + 退出），token 失效自动登出。
2. 动态表格：分页（页码同步 URL）、搜索（防抖）、筛选、排序组合生效。
3. 增删改查弹窗：Modal + 表单校验（react-hook-form + zod），删除有 Confirm。
4. 状态分层：服务器状态全走 React Query（含 mutation 后失效重取），UI 状态 Zustand，不互相渗透。
5. 质量线：至少 10 个组件测试 + 1 条 Playwright 登录主流程全绿；Profiler 录制一次并写优化笔记（哪几个组件白渲染了、怎么消掉的）。

**Lv4：Next.js 全栈应用 + 部署（覆盖阶段 9）。** 验收即上一节的"技术验收清单"七条（RSC/Server Action/缓存重验证/NextAuth/无水合错误/E2E/Vercel 线上可用），外加一条体验项：首屏有页面外壳与骨架，没有任何整页白屏或 spinner 风暴。

---

## 解决实际编码问题的工作流

遇到问题时按此顺序：

1. **读警告**：控制台/react-devtools 的 warning 往往直接指出原因
2. **最小复现**：新开一个文件，把问题缩到 20 行以内
3. **分层定位**：渲染层（值对不对）→ 时机层（effect/事件）→ 环境层（构建/缓存）
4. **查权威来源**：react.dev 搜索 → 该库 GitHub issues → Release Notes（升级踩坑）
5. **沉淀**：把解法记进自己的"React 踩坑笔记"，按场景归档

五步逐条展开成可执行的操作：

**第 1 步：读警告。** 操作：打开浏览器控制台（配合 React DevTools 的警告面板），把 warning 的关键句子**原文**复制出来，先当搜索词。要建立的心态是：React 的 warning 不是噪音，而是免费诊断书——每条警告都精确对应一类已知错误模式。对照速查：`Each child in a list should have a unique "key"` → 列表身份错乱（阶段 10 第 2 条）；`Can't perform a React state update on an unmounted component` → 卸载后 setState，effect 没清理异步回调；`Warning: An update ... not wrapped in act` → 测试里更新没进 act 边界（阶段 8 第 4 条）；`The final argument passed to useEffect changed size between renders` → 依赖数组长度变了。忽略警告的代价是：真正的信号混在噪音里被一起扔掉。

**第 2 步：最小复现。** 操作流程：(a) 新建 `src/debug/Bug.tsx`，把可疑组件**连同最少的数据**复制进来；(b) 从路由上只挂载这一个文件；(c) 循环做两件事——删掉一段代码 → 问题还在？继续删；问题消失？恢复刚才删的那段，往更深处删。20 行以内还复现不了时，结论同样宝贵：**问题不在组件本身，而在父级传参、Provider、路由层或构建配置**——排查方向立刻从"读组件代码"切换到"打印输入与检查环境"。

**第 3 步：分层定位。** 三层从便宜到贵，顺序不能反：

- **渲染层（值对不对）**：DevTools 选中组件看 props/state 的实际值。典型命中：传了 `0`/空数组/`NaN`、`&&` 短路成了 `0`、对象每次渲染都是新引用。
- **时机层（effect/事件）**：值都对，但出现的时机不对。命中竞态、闭包旧值、双执行（StrictMode 开发期故意双调用 effect 是特性不是 bug）、事件没触发（被 `preventDefault`/`stopPropagation`/条件卸载吞了）。
- **环境层（构建/缓存）**：代码"看起来对"但运行不对。命中依赖版本（升级后 API 变了）、构建缓存（`rm -rf node_modules` 重装试试）、浏览器缓存与 Service Worker、Next.js 的缓存分层（阶段 9 第 4 条那张表）。

**第 4 步：查权威来源。** 严格按顺序：react.dev 站内搜索（中文版可用，覆盖 90% 概念问题）→ 出问题的库的 GitHub Issues（搜**报错原文**，不是搜你的猜测）→ Release Notes（凡"升级后突然坏"的问题，先翻最近一版 changelog 的 Breaking Changes）。给自己设个止损：任何一条搜索链路超过 20 分钟没进展，就换下一条，不要在同一个帖子里面细抠。

**第 5 步：沉淀。** 格式建议固定五栏：场景（一句话）/ 症状（报错原文或现象）/ 根因（一句话机制）/ 修法（diff 或关键行）/ 参考链接。按场景归档（表单、请求、路由、SSR……）。判断一条记录"沉淀成功"的标准：三个月后自己只看前两栏就能想起修法。本文档每个知识点末尾的"常见坑（症状→根因→修法）"就是这个格式的公共版——你的笔记是它的私有版。

---

## 核心资源

- **react.dev**（中文版可用）—— 唯一必读，尤其是 "Learn React" 与 "You Might Not Need an Effect"
- TanStack Query / Zustand / React Router / react-hook-form 官方文档
- [ahooks](https://ahooks.js.org/)：自定义 Hook 最佳实践与源码
- Epic React（Kent C. Dodds 的实战 workshop）
- patterns.dev：组件模式与性能模式图解

逐条说明"读什么、解决什么问题"：

**react.dev（中文版可用）。** 读法：把 "Learn React" 整章按顺序过一遍（它是目前唯一把"思考模型"讲对的教程，如"state 是渲染快照""effect 是与外部系统同步"）；进阶读 "You Might Not Need an Effect"——它直接纠正"什么都往 useEffect 里塞"的本能，是阶段 2 第 5 条的完整版；遇到具体 API 就查 Reference 区（每个 hook 页尾部的"陷阱"小节是精华）。解决什么：90% 的概念疑惑与"React 推荐写法是什么"的权威裁决。

**四个库的官方文档，各读关键章节即可。** TanStack Query：读 "Query Keys" 与 "Query Invalidation" 两章就掌握 80% 日常（缓存的身份与失效是它的全部核心），配合 "Optimistic Updates" 补齐乐观场景——解决"服务器状态怎么管"。Zustand：整站只有十几页，读 "Write State"（含 selector 订阅）与 persist 中间件即可——解决"UI 状态放哪"。React Router：读 "Concepts" 的嵌套路由与 loaders/actions 哲学——解决"路由结构与数据加载的关系"。react-hook-form：读 Getting Started + zodResolver 一页——解决"受控表单性能与校验样板"，阶段 4.1 的终点形态。

**[ahooks](https://ahooks.js.org/)。** 读法：把你在阶段 2 手写过的每个 hook（useDebounce、useLocalStorage、useClickOutside……）在 ahooks 里找到对应实现，对照源码看三件事：边界条件处理（SSR、清理、竞态）、API 设计（为什么多那个 options 参数）、测试怎么写。解决什么：自定义 hook 的"标准答案"参照系——手写版与它的差距就是你的提升点。

**Epic React（Kent C. Dodds 的实战 workshop）。** 读（做）法：按顺序做 "React Hooks" 与 "React Fundamentals" 两个 workshop（免费部分即可），它的形式是"先给你一个会失败的测试，你把实现写绿"——与阶段 8 的测试观完全同构。解决什么：把知识从"看得懂"逼到"写得出"，尤其适合卡在"教程都懂、自己动手就懵"的阶段。

**patterns.dev。** 读法：把 "React Patterns" 与 "Rendering"（性能）两章当图解字典——Compound Components、Render Props、Container/Presentational 每个都有一页动图。解决什么：设计模式时的"命名检索"——你说不清要用的模式叫什么时，翻它最快。

---

## 每周节奏建议

- 60% 时间写代码（场景 demo / 项目）
- 20% 时间读官方文档对应章节
- 20% 时间复盘重构（把前一天写的烂代码改好，比多写新代码更有价值）

按每天 1–2 小时展开成落地方法：

**60% 写代码（约每天 45–70 分钟）。** 关键是"提前列清单、当天不开天窗"：每周日花 10 分钟把当周要做的 demo 抄成任务清单（每条对应大纲里一个场景，如"阶段 7 第 3 条：泛型 Select"），每天完成 1–2 条、勾掉。每个 demo 严格走三步——先自己写（不看任何参考）、再对照官方文档修正、最后**故意改坏一次**观察症状（比如删掉 key、去掉依赖数组）。故意制造 bug 的 10 分钟，比多看两遍正确代码的记忆深一个量级。

**20% 读文档（约每天 15–25 分钟）。** 不要"通读官方文档"，要**带着当天的代码读**：今天写了受控表单，晚上就读 react.dev 的 `<input>` 与"表单"章节对应小节。判断读到位的标准：能在文档里找到"你今天写的那行代码"对应的原则或反例。每周留一次 30 分钟的"补课位"，把这周遇到的警告逐条去文档里查到出处。

**20% 复盘重构（约每天 15–25 分钟）。** 固定动作：第二天开始新任务前，**先重构昨天的代码**——用今天新学的标准（比如今天学了类型收窄，回去给昨天的请求状态改成判别联合；学了测行为不测实现，回去改昨天的测试断言）。配合两件小工具：一个 `NOTES.md` 踩坑笔记（按上面工作流第 5 步的格式记），一个 git 习惯——每个 demo 单独 commit，commit message 写"当时为什么这么改"。三个月后回看这些 commit，就是一份私有的成长曲线图。

---

## 延伸篇：React 与其他框架的对比

> 定位：本篇不是"背对比题的资料汇编"，而是把大纲前几个阶段你**亲手写过的场景**（计数器、受控输入、TodoMVC、组件通信），用 Vue 3、Svelte 5、SolidJS、Angular 再写一遍——同一个问题、两种解法，差异会自己浮出来。建议在完成阶段 1–2（至少写过计数器、TodoMVC、受控输入）之后阅读，或在面试前集中读一遍。没有写过也能读，但所有"对比"都会失去锚点，退化成又一篇看过就忘的特性清单。

### 1. 为什么要对比：四个真实动机

学一种框架时，你会默认它的做法是"理所当然"的：state 不可变、`setState` 不立即生效、Hooks 不能写在条件语句里——你把这些当常识背下来，却说不出"为什么必须这样、不这样会怎样"。直到你看到另一个框架**反着做还同样成立**（Vue 的 state 可变、赋值立即生效、ref 可以在任意位置创建），你才第一次真正理解双方。这是最被低估的动机，其余三个都很现实：

1. **选型**：新项目技术评审、老项目重构论证，绕不开"为什么是 React 不是 Vue"这类问题。答"团队熟 React"是对的，但你得先知道"换另一个会损失什么、得到什么"，才能让这个答案站得住。
2. **协作**：国内大量团队 React/Vue 混用（甚至同公司不同产品线各一栈），换组、接手别人项目、做公共库时的第一道坎不是语法，而是心智模型切换。
3. **面试**：对比题（"React 和 Vue 的区别"）是中高级面试的常客。它考的不是特性清单，是你是否理解**每个设计选择付出的代价**——本篇第 12 节给答题框架。

方法论先立好：**对比单位是"场景"，不是"特性"。**"Vue 有 `v-model`、React 没有"这类特性表记三个月就忘；"同一个双输入框表单，React 怎么写、Vue 怎么写、各自的拦截点在哪、为什么 React 刻意不提供 `v-model`"才记得住。所以本篇每一节都是：先摆一个你写过的场景，再并排放各框架的实现，最后追问机制层面的"为什么"。

对比对象选四个，各有明确的"出场理由"：

- **Vue 3**（Composition API + `<script setup>`）：国内市占最高的替代品，你最可能真的遇到它；同时它和 React 构成"细粒度响应式 vs 重渲染"最经典的一组对照。
- **Svelte 5**（Runes）：编译器路线的代表——框架在构建期被"编译掉"，用来理解"运行时框架"这个前提本身是可以被挑战的。
- **SolidJS**：细粒度响应式 + JSX。它的价值在于破除一个误解："JSX = React 心智"。Solid 写的是 JSX，组件却从头到尾只执行一次——你会 JSX 不等于你会 Solid。
- **Angular**：企业级全家桶（DI、路由、表单、测试一体），大厂后台系统常见；选型讨论里它是"约定与规范"路线的极端代表。

不排 React Native / Flutter 这类跨端方案——那是"用 React 写原生界面"，属于另一条线，不是框架对比。

---

### 2. 总览：三种响应式心智模型

先给一张定位表当"地图"，后面所有场景对比都在验证这张地图。**看不懂中间两列没关系，本节末尾和后面每一节会把它们逐个讲透**：

| 框架 | 渲染单位 | 响应式原语 | UI 表达 | 一句话定位 |
|---|---|---|---|---|
| React | 组件函数整体重跑 | `useState` / `useReducer`（不可变快照） | JSX（就是 JS 表达式） | UI = f(state)：重渲染 + 虚拟 DOM diff 兜底 |
| Vue 3 | 组件（模板编译为渲染函数） | `ref` / `reactive`（Proxy 代理，**可变**） | SFC 模板（受限 DSL） | 响应式系统 + 编译期优化的渐进式框架 |
| Svelte 5 | 组件（编译为接近原生 DOM 操作的代码） | `$state` / `$derived`（Runes，信号） | 模板 + 块语法 | "消失的框架"：运行时逻辑在构建期做掉 |
| SolidJS | 组件函数**只跑一次** | `createSignal` / `createMemo`（信号） | JSX（但语义与 React 不同） | 细粒度响应式，JSX 皮、信号心 |
| Angular | 组件 + 变更检测 | `signal`（16+，之前靠 Zone.js） | 模板 + 指令 | 企业级全家桶：DI/路由/表单/测试开箱即用 |

主流方案实际上只分三种心智模型，上面五个框架是这三种模型在不同程度上的混合：

**模型 A：重渲染（React）。** 数据变化 → 重新调用组件函数 → 生成新的虚拟 DOM → diff 出差异 → 打补丁。你写的函数会被**反复从头执行**，所以必须不可变（否则 diff 输入没变化）、必须纯（会被双调用）；"闭包读到旧值"是这套模型的必然副产品（阶段 2 闭包陷阱专题）。React **不追踪**"哪个数据被哪段 UI 使用"，它用"整个函数重跑 + diff"来兜底正确性。代价是重渲染风暴与手动 `memo`/`useMemo`（阶段 6 的全部内容），收益是模型极其简单：任何时刻，UI 都是当前 state 的纯函数映射，调试时不存在"数据变了但界面没跟上"的玄学——有的只是"函数没被重跑"或"重跑了但 diff 没变"。

**模型 B：细粒度响应式（Vue 3 / Solid / Svelte 5 的 Runes / Angular Signals）。** 数据是"信号"（signal），UI 在读取信号时**自动登记订阅**；数据变了，只有真正用到它的那一小段 DOM 会更新——组件函数甚至可能从头到尾只执行一次（Solid 就是这样）。数据是**可变**的（`count.value++`），没有快照、没有闭包旧值问题；但它有自己的坑：解构丢响应性、依赖追踪的"魔法"边界（哪些写法会被追踪、哪些不会）。你在 React 里学的"谁订阅谁更新"在 Zustand 的 selector、TanStack Query 的按 key 订阅里已经出现过了——信号只是把这套思想推进到 DOM 粒度。

**模型 C：编译器路线（Svelte / Vue 模板编译 / React Compiler）。** Svelte 是激进派：没有虚拟 DOM、没有运行时 diff，编译器直接分析你的组件，产出"更新这个文本节点"这样的原生 DOM 操作代码，框架本身"被编译掉"，打包产物只剩你实际用到的几 KB。Vue 模板是温和派：模板里的表达式受限（每个绑定只能是单条表达式），正因受限，编译器能做静态分析——静态节点提升、patch flag 标记动态部分，diff 之前已经跳过大半工作。React 原本是"运行时兜底"派，React Compiler（已随 React 19 时代正式发布）代表它开始吸收编译器路线：静态分析你的组件，自动插入 memo 化，把阶段 6 里手动做的优化自动化。

由此得出本篇最重要的一个判断——**"表达能力 vs 优化能力"是根本权衡**：JSX 是完整的 JS，可以在列表里塞任意逻辑，但编译器几乎无法静态预测它会渲染出什么，所以 React 长期只能靠运行时重渲染 + diff 兜底；Vue/Svelte 模板的表达受限（不能随意写语句、指令集合固定），换来了编译期优化空间。两个方向都成立，也都付出了代价——这就是为什么"React 和 Vue 谁更好"是伪问题，"你的场景更吃哪边的代价"才是真问题。

还有一条贯穿全篇的提醒：**JSX ≠ React 心智**。Solid 用 JSX 但组件只跑一次，`{count()}` 是函数调用不是插值；反之模板 ≠ 简单。判断你是否理解一个框架，标准是开篇的三条自测（盲写/坑位/讲授），不是"语法长得像不像我已经会的"。

---

### 3. 场景对比｜计数器：状态更新的三种哲学

用阶段 2 的第一个场景开刀，因为它是所有差异的最小可复现单元。需求不变：**点一次按钮，count +3**。这个"点一次 +3"的写法差异，恰好把三大模型的状态更新哲学全部暴露出来。

React 版（阶段 2 已详述机制，这里只放结论代码）：

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const add3 = () => {
    setCount(c => c + 1); // 必须：函数式更新，站在上一步结果上算
    setCount(c => c + 1);
    setCount(c => c + 1);
    // 若写成 setCount(count + 1) ×3，只会 +1——count 是本次渲染的快照
  };

  return <p>count = {count}<button onClick={add3}>点我 +3</button></p>;
}
```

Vue 3 版：

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);

function add3() {
  count.value += 1; // 写入立即生效，count.value 此刻已经是 1
  count.value += 1;
  count.value += 1; // 结束时 count.value === 3，无需任何特殊写法
}
</script>

<template>
  <!-- 模板里自动解包，不用写 count.value -->
  <p>count = {{ count }}</p>
  <button @click="add3">点我 +3</button>
</template>
```

Svelte 5 版：

```svelte
<script>
  let count = $state(0); // Runes：看起来是普通变量，实际是编译器指令

  function add3() {
    count += 1; // 编译器把"对 $state 变量赋值"翻译成信号更新
    count += 1;
    count += 1;
  }
</script>

<p>count = {count}</p>
<button onclick={add3}>点我 +3</button>
```

SolidJS 版：

```jsx
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);

  const add3 = () => {
    setCount(count() + 1); // setCount 立即生效，count() 此刻已经是 1
    setCount(count() + 1); // 也可以写函数式 setCount(c => c + 1)，但这里不是"必须"
    setCount(count() + 1);
  };

  // 注意：这个组件函数整个生命周期只执行一次
  return <p>count = {count()}<button onClick={add3}>点我 +3</button></p>;
}
```

Angular（signal + `update`）：

```tsx
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>count = {{ count() }}</p>
    <button (click)="add3()">点我 +3</button>
  `,
})
export class CounterComponent {
  count = signal(0);

  add3() {
    this.count.update(c => c + 1);
    this.count.update(c => c + 1);
    this.count.update(c => c + 1);
  }
}
```

四个版本语义全部正确（都显示 3），但**底层发生的事完全不同**。逐动作对照：

| 动作 | React | Vue 3 | Svelte 5 | Solid / Angular |
|---|---|---|---|---|
| 读取状态 | 读渲染快照里的普通变量 | `count.value`：Proxy 的 get，**顺路收集依赖** | 读编译生成的信号 | `count()`：getter，同样收集依赖 |
| 写入状态 | `setCount` 只是**排队一个更新请求** | 赋值**立即改真实值**，触发订阅者 | 赋值经编译变成信号更新 | `setCount` 立即写真实值 |
| 写完立刻再读 | **旧值**（快照不变） | **新值** | **新值** | **新值** |
| 界面更新时机 | 重渲染（重跑组件函数）+ diff 之后 | 排队到微任务批量 flush | 编译期调度（微任务） | 同步细粒度更新 DOM |
| 是否需要函数式更新 | 新值依赖旧值时**必须** | 永远不需要 | 永远不需要 | 可选（两种都对） |

表格里最关键的一行是"写完立刻再读"。React 的 `setCount` 之后 `count` 纹丝不动——这不是实现细节没做好，而是设计：**state 是"本次渲染的快照"，更新是"提交一次请求"**，这个模型让渲染成为纯函数、让并发渲染成为可能（阶段 10 会看到这是 Fiber 时间切片的前提）。Vue/Solid/Svelte 的赋值立即生效——因为它们的模型是"信号 + 订阅"，写入就该立刻反映到数据本身，UI 的同步是订阅的事，与"读值"无关。

于是四个框架各有自己的"招牌坑"，而且坑与坑之间互为镜像：

- **React 的坑**：闭包旧值——`setTimeout`/事件订阅里读到过期 state（阶段 2 闭包陷阱专题的完整推理）。根源：快照模型。
- **Vue 的坑**：解构丢响应性——`reactive` 对象解构出来的是普通值：

  ```js
  const state = reactive({ count: 0 });
  const { count } = state; // ❌ count 是普通数字，与 state.count 断开连接
  count++;                 // state.count 仍是 0，界面也不会更新
  ```

  修法是 `toRefs(state)`，或者干脆全程用 `ref`。根源：响应性附着在 Proxy **对象**上，解构把值从对象里"拔"了出来。（注意区分：Vue 3.5 起 `defineProps` 的解构是**特例**，编译器会处理成保留响应性——这恰恰说明"解构丢响应"是心智负担，官方要专门做编译补偿。）
- **Svelte 5 的坑**：忘写 Runes——`let count = 0` 不加 `$state`，编译器把它当普通变量，改了不更新界面，且**没有任何报错**。根源：编译器路线的一切都建立在"你告诉了编译器什么"上。
- **Solid 的坑**：组件顶层解构 props——组件只跑一次，解构发生在"一次"里，之后 props 更新跟你解构出来的常量无关，官方文档用整页警告这件事。根源同 Vue：响应性附着在访问行为上，解构把"访问"固化成了"值"。

把这个场景收进面试题落点："为什么 React 同一函数里连调三次 `setState` 只加一？"——只答"因为批处理"得一半分；答出"因为快照模型 + 更新队列，函数式更新让每一步站在前一步的结果上"是满分；而能补一句"Vue 里不存在这个问题，因为 `count.value` 是立即生效的代理写入——两种模型各自催生了对方的经典坑（快照闭包 vs 解构丢响应）"，是把两个框架都真正学过的信号。

---

### 4. 场景对比｜表单输入：受控组件 vs 双向绑定

场景来自阶段 3 模式 1：一个文本输入框，且要求**过滤空白字符**——有拦截需求的表单才见真章，因为纯展示的双向同步用哪个框架都一样舒服。

React 版——没有"双向绑定"这个概念，数据永远单向：state → `value`；用户输入 → `onChange` → `setState` → 重渲染：

```tsx
function NameForm() {
  const [name, setName] = useState('');

  return (
    <input
      value={name}
      onChange={(e) => {
        const v = e.target.value;
        setName(v.replace(/\s/g, '')); // 拦截点：不 setState，界面就不变
      }}
    />
  );
}
```

Vue 3 版——`v-model` 及其展开：

```vue
<script setup>
import { ref } from 'vue';
const name = ref('');
</script>

<template>
  <!-- 语法糖形态 -->
  <input v-model="name" />

  <!-- 对文本框，等价于： -->
  <!-- <input :value="name" @input="name = $event.target.value" /> -->

  <!-- 要拦截时，拆开语法糖自己写（或用 watch）： -->
  <input :value="name" @input="name = $event.target.value.replace(/\s/g, '')" />
</template>
```

Svelte 5 版——`bind:` 指令：

```svelte
<script>
  let name = $state('');
</script>

<!-- 默认形态 -->
<input bind:value={name} />

<!-- 要拦截时，同样拆开：value 单向 + oninput 手动同步 -->
<input value={name} oninput={(e) => (name = e.currentTarget.value.replace(/\s/g, ''))} />
```

三个版本功能等价。真正的差异是**"你在哪一层看见数据流"**，这决定了拦截、联动、调试的手感：

1. **React 把每一步写在明面上，所以拦截是默认能力。** 受控组件的本质是"DOM 的值由 state 驱动"——`onChange` 里不调 `setState`，输入框就不变，天然是个过滤器/格式化器。阶段 3 模式 1 的"双模式 Input"、只允许输数字的金额框、输入时自动去首尾空格，全都是同一个模式的变体。Vue/Svelte 的 `v-model`/`bind:value` 把"读 DOM → 写数据"这一步藏进了语法糖，默认形态下 DOM 是源头、数据跟随——要拦截就得**主动拆开糖**（如上面代码），或绕到 `watch`/修饰符（Vue 的 `.lazy`、`.number` 本质是预制的拦截器）。
2. **谁拥有 input 的 DOM 值。** React 受控 = state 是唯一事实源，DOM 是投影；Vue 默认 = DOM 是源头，ref 是影子。做个思考题：在 Vue 里实现和 React 受控组件**完全一样**的"强制大写输入框"（用户敲小写，框里显示大写）——你会发现 `@input` 里改了 ref 之后，DOM 值不一定跟着回写（浏览器已把字符放进 input，Vue 不会无差别重设 `value`），要靠 `nextTick` 或强制赋值处理边界。亲手踩一遍，你就理解 React 为什么把"受控"做成默认路径：**它把"UI 是数据的投影"这条原则贯彻到了表单，代价是每个输入框都要手写 onChange。**
3. **组件层的双向绑定。** Vue 在组件上用 `v-model` 时，实际是 `modelValue` prop + `update:modelValue` 事件的合成；Vue 3.4+ 的 `defineModel()` 宏把这两步合成一步：

   ```vue
   <!-- 子组件 CustomInput.vue -->
   <script setup>
   const model = defineModel(); // 等价于：接 modelValue prop + emit('update:modelValue')
   </script>

   <template>
     <input v-model="model" />
   </template>
   <!-- 父组件：<CustomInput v-model="name" /> -->
   ```

   React 没有对应物——你在阶段 3 模式 9 写的"受控 + 非受控双模式组件"（接 `value`/`onChange`，内部再兼容 `defaultValue`），就是 Vue `defineModel` 展开后的样子，只是 React 要求你显式写全，也因此你能自由决定暴露几个控制点（`value` 之外再加 `open`、`activeIndex`……）。

生态映射一句话收尾：表单库的路线也跟着分野——React 的 react-hook-form 走**非受控优先**（注册 ref、少重渲染，阶段 4.1 讲过原因），Vue 的 vee-validate 跟随 `v-model` 直觉；Angular 更极端，官方直接内置两套表单体系（模板驱动 vs 响应式）让你选。框架的表单哲学，就是它的数据流哲学的投影。

---

### 5. 场景对比｜列表与 key：diff 的输入从哪来

场景来自阶段 1 场景 3：渲染 `todos` 列表，并保证插入/删除/排序时**带输入框的子组件状态不串位**（那个"删中间一项、底下输入内容错位"的经典 bug）。

React 版——列表就是普通 JS 表达式，`key` 是你唯一能递给 diff 的线索：

```tsx
{todos.map((todo) => (
  <TodoItem key={todo.id} todo={todo} />
))}
```

Vue 3 版——模板指令 + `:key`：

```vue
<TodoItem v-for="todo in todos" :key="todo.id" :todo="todo" />
```

Svelte 5 版——each 块，key 写在括号里：

```svelte
{#each todos as todo (todo.id)}
  <TodoItem {todo} />
{/each}
```

三个框架都要求"稳定唯一 id 作 key、别用数组索引"——因为列表更新的正确性都依赖 key 做新旧节点的配对。**但"diff 发生之前"的世界完全不同**，这是面试对比题的真正得分点：

1. **React：重渲染是常态，diff 是唯一防线。** `todos` 变化 → 组件函数重跑 → `map` 全量执行 → 生成全新的虚拟 DOM 树 → diff 逐个比对新旧 → 决定哪些真实 DOM 复用、哪些更新。key 决定配对关系，React 用"从左到右遍历 + key 索引映射"的方式配对。因为函数组件每次全量重跑，diff **没有**任何编译期信息可以借助——这就是阶段 6 里 `memo`、key 稳定性、列表项拆组件这些优化手段存在的原因。
2. **Vue：diff 之前已经跳过了大半工作。** 模板编译时，编译器标记了每个节点的性质：完全静态的节点被**提升**到渲染函数外（每次重渲染直接复用，不进 diff），动态节点被打上 **patch flag**（"只有 class 会变""只有文本会变"），diff 时按 flag 只比对会变的部分。列表 diff 用**最长递增子序列**算法找"不需要移动的节点"，移动次数比朴素配对少。Vue 3 渲染函数的重跑只发生在"依赖变化的组件"上，粒度已经比 React 小一层。
3. **Svelte：把"列表更新"编译成定向 DOM 操作。** `{#each}` 块编译后就是一段"根据 key 增删移动这些 DOM 节点"的原生代码，不存在"重跑组件、重新生成整棵虚拟树"这回事——更新成本的量级从"树 diff"降到"节点操作"。

补一个 Vue 特有的坑（React 里不存在对应物）：**同一标签上 `v-if` 与 `v-for` 同时使用**。Vue 3 中 `v-if` 的优先级**高于** `v-for`，所以 `v-if="todo.done"` 里引用迭代变量 `todo` 会直接报错——条件想依赖循环项，要套一层 `<template v-for>`。React 里条件渲染和列表是同一层 JS 表达式，优先级问题在语法上不可能发生——这是"模板受限换优化"的另一面账单。

最后看一眼 Solid，它把这个场景推到了逻辑终点：`<For each={todos}>` 组件用**引用相等**直接复用节点，数据变的时候，只有"值真的变了的那几个文本节点"被更新——没有"重渲染列表"这个概念，key 的意义退化成排序提示。你可以不喜欢它的抽象，但它清楚地展示了重渲染模型省掉的到底是哪些开销。

---

### 6. 场景对比｜派生与副作用：useEffect vs computed / watch vs $derived

场景来自阶段 2：商品单价 × 折扣 → 展示折后价（**派生值**）；购物车数量变化时上报埋点（**副作用**）。这组对比最值得做，因为两条路线的框架在这里**殊途同归**。

React 版（阶段 2 的结论：派生值不要存 state，渲染中直接算；副作用进 effect）：

```tsx
function Cart({ price, discount, quantity }) {
  const discounted = price * discount; // 派生：直接算，不用 useState 存

  useEffect(() => {
    track('cart_change', quantity); // 副作用：声明式地挂在依赖上
  }, [quantity]);

  return <p>折后价：{discounted}</p>;
}
```

Vue 3 版——两个原语分开：

```vue
<script setup>
import { computed, watch } from 'vue';

const props = defineProps(['price', 'discount', 'quantity']);

const discounted = computed(() => props.price * props.discount); // 派生：自动收集依赖 + 缓存

watch(
  () => props.quantity,
  (q) => track('cart_change', q) // 副作用：显式声明"谁变了就跑"
);
</script>

<template>
  <p>折后价：{{ discounted }}</p>
</template>
```

Svelte 5 版——Runes 一一对应：

```svelte
<script>
  let { price, discount, quantity } = $props();

  let discounted = $derived(price * discount); // 派生

  $effect(() => {
    track('cart_change', quantity); // 副作用
  });
</script>

<p>折后价：{discounted}</p>
```

逐概念对齐成一张表（这张表建议抄进 NOTES.md，比背任何对比文章都管用）：

| 意图 | React | Vue 3 | Svelte 5 | Solid |
|---|---|---|---|---|
| 派生值（有缓存、可共享） | 渲染中直接算；跨组件共享时 `useMemo` | `computed` | `$derived` | `createMemo` |
| 响应数据变化的副作用 | `useEffect` | `watch` / `watchEffect` | `$effect` | `createEffect` |
| 依赖怎么来 | **手写**依赖数组（错了不报错，靠 lint） | **自动收集**（读到了什么就追什么） | 自动收集 | 自动收集 |
| 派生值缓存语义 | 每次渲染重算（`useMemo` 按依赖缓存，但缓存不保证保留） | 依赖不变直接返回缓存 | 惰性按需重算 | 按依赖缓存 |
| 官方"能不用就不用"清单 | 《You Might Not Need an Effect》 | `watch` 文档同款提醒 | `$effect` 文档红字警告 | 同 |

几个值得停下来的点：

1. **`useMemo` ≈ `computed`，但差一个"自动"**。语义上它们都是"依赖不变的派生缓存"，区别只在依赖来源：Vue 读到什么追什么（运行时自动），React 要你手写数组（写错了靠 `exhaustive-deps` lint 兜底）。React Compiler 的核心卖点就是把这个手写自动化——等于官方承认"手写依赖数组"是这套模型的主要摩擦点。
2. **`useEffect` 在响应式框架里没有单一对应物**。Vue 把 React 一个 `useEffect` 承担的职责拆成了四个：`watch`（响应数据）、`watchEffect`（自动收集 + 立即跑一次）、`onMounted`（首次挂载）、`onUnmounted`（清理）。这不是 Vue 更啰嗦，而是"副作用"这个词在 React 里被一个 API 承载了太多含义——阶段 2 里你列过 useEffect 的五类用途（订阅、定时器、请求、DOM 测量、日志），在 Vue 里它们本来就分属不同的原语。
3. **纪律完全收敛**。三边的官方文档都有一页"什么时候不该用我"：派生就用派生原语、别在副作用里同步状态、别用副作用驱动渲染。你在 React 里背过的《You Might Not Need an Effect》清单，逐条翻译过去在 Vue/Svelte 依然成立——**框架会变，数据流的纪律不变**。这也是第 12 节对比题的高分心法。

---

### 7. 场景对比｜组件通信：props 下行、事件上行、跨层注入

场景来自阶段 1 场景 6 + 阶段 3 模式 5：`TodoList` 传项给 `TodoItem`，`TodoItem` 里点删除要通知回来；再往深处，主题配置要跨五层传递。

先说**不变量**：所有主流框架都是**单向数据流**——props 下行、事件上行、禁止子组件直接改父组件的数据。分歧只在"事件"怎么表达。

React 版（传回调 props）：

```tsx
function TodoItem({ todo, onRemove }: { todo: Todo; onRemove: (id: number) => void }) {
  return (
    <li>
      {todo.text}
      <button onClick={() => onRemove(todo.id)}>删除</button>
    </li>
  );
}
// 父组件：<TodoItem todo={t} onRemove={removeTodo} />
```

Vue 3 版——事件要**显式声明**（`emit`）：

```vue
<!-- 子组件 TodoItem.vue -->
<script setup>
defineProps(['todo']);
const emit = defineEmits(['remove']);
</script>

<template>
  <li>
    {{ todo.text }}
    <button @click="emit('remove', todo.id)">删除</button>
  </li>
</template>

<!-- 父组件 -->
<!-- <TodoItem v-for="t in todos" :key="t.id" :todo="t" @remove="removeTodo" /> -->
```

Svelte 5 版——用回调 props，**正在向 React 收敛**：

```svelte
<script>
  let { todo, onRemove } = $props();
</script>

<li>
  {todo.text}
  <button onclick={() => onRemove(todo.id)}>删除</button>
</li>
```

三个观察：

1. **React"一切皆 props（含回调）"的表达正在被吸收**。Svelte 4 的 `createEventDispatcher` 在 Svelte 5 已被标记为不推荐，官方推荐就是上面这种回调 props；Vue 社区也常在逻辑组件（headless 组件）里直接传函数 props。函数式表达（传函数）vs 声明式表达（声明事件名）之争，实践中正在向前者收敛——但模板生态里 `@event` 的可读性和 DevTools 的事件追踪仍有价值。
2. **跨层注入的差异直接反映响应式模型**。React 的 Context（阶段 3 模式 5、阶段 5 的性能陷阱）：Provider 的 `value` 是普通对象，引用一变，**所有消费组件全量重渲染**——所以要拆分 Context、要 memo value。Vue 的 `provide`/`inject`：传下去的是 ref，消费方拿到的是**订阅**，只有真正用到的那部分更新——React 阶段 5 里"拆 Context"的优化手段，在这里不需要，因为细粒度订阅是白送的。Svelte 的 `setContext`/`getContext` 同理（传 store/信号，天然按订阅更新）。
3. **插槽的表达**。React 用"组件即属性"表达插槽：`children`、具名 children（`<Card title={...} footer={<Footer />} />`，阶段 3 模式 2），没有专门语法；模板系有专门语法——Vue 的 `slot`/具名插槽/作用域插槽，Svelte 5 用 snippet（`{#snippet}` + `{@render}`）。React 的做法更"反直觉但更一致"（还是 props），模板系的做法更"直观但多一套 DSL"。

跨层传递在 Angular 里走的是 DI 容器（`inject()` 服务），把"共享"从组件树里拿出来放到依赖图里——这也是它"全家桶"定位的一个切片：配置、日志、HTTP 客户端都是可注入服务，组件树只负责渲染。

---

### 8. 场景对比｜生命周期：组件函数到底跑几次

不背生命周期 API 对照表（背了也会忘），只回答一个根问题：**组件的代码到底执行几次**。这是所有生命周期差异的源头，也是"hooks 为什么不能写在条件语句里"这道面试题的完整答案所在。

| 时机 | React | Vue 3 | Svelte 5 | Solid |
|---|---|---|---|---|
| 组件"初始化代码" | 首次渲染时函数体第一次执行 | `setup` 顶层（`<script setup>`）**只跑一次** | 组件初始化时执行 | 组件体**只跑一次** |
| 数据更新时 | **整个函数体重跑** | 只有模板渲染函数重跑（setup 不重跑） | 依赖变化时局部更新对应 DOM | 无"组件更新"概念 |
| 挂载完成 | `useEffect(() => {}, [])` | `onMounted` | `$effect` 首次运行 | `onMount` |
| 卸载清理 | effect 返回清理函数 | `onUnmounted` | `$effect` 返回清理函数 | `onCleanup` |

用这张表能一次性解释三件之前"背过但没懂"的事：

1. **为什么 React Hooks 不能写在条件/循环里？** React 靠调用顺序把"第 N 个 Hook"和"第 N 个状态槽"对上号（链表），重渲染时必须按同样的顺序调用同样的 Hooks——条件调用会让槽位错位。而 Vue 的 `ref()`/Solid 的 `createSignal()` 是普通函数调用，**与调用位置和顺序无关**，想放哪放哪——因为响应式框架的"状态"附着在信号对象本身上，不依附执行上下文。同一道面试题，React 侧答"链表顺序"，Vue/Solid 侧答"根本没有这个约束，因为模型不同"。
2. **为什么 Vue/Solid 的"自定义逻辑复用"（composable / 响应式函数）没有 React Hook 的那堆规则？** 它们就是普通函数，在 setup/组件体里调用一次，闭包捕获信号，没有"每次渲染重建"的问题。React 的自定义 Hook（阶段 2）之所以要讲那么久，正是因为"函数每次渲染都重跑"这个前提衍生出了闭包、依赖数组、调用顺序三整套纪律。
3. **为什么 Vue/Svelte 组件里"顶层代码"和 React 组件里"顶层代码"含义完全不同？** React 组件函数体每次渲染都执行——放逻辑会反复跑，所以才有 useMemo/useCallback；Vue 的 setup/Solid 的组件体只执行一次——放的是"初始化 + 建立订阅"，天然的"构造函数"语义。**把 React 代码翻译成 Vue 时，最危险的不是语法，是"这段代码会跑几次"的直觉全部要重装。**

---

### 9. 生态对照：从状态库到元框架

框架本体只解决"响应式 + 组件"，日常开发 80% 的时间在生态里。逐领域对照（加粗为各领域事实标准或官方推荐）：

| 领域 | React | Vue 3 | Angular | Svelte |
|---|---|---|---|---|
| 路由 | **React Router v7** | **vue-router** | Angular Router | SvelteKit 内置 |
| 全局状态 | **Zustand** / RTK / Jotai | **Pinia**（官方） | Signals + 服务 / NgRx | stores + runes |
| 服务器状态 | **TanStack Query** | TanStack Query（vue-query） | TanStack Query | TanStack Query |
| 表单 | **react-hook-form** + zod | vee-validate + zod | Reactive Forms（内置） | 生态较弱，常自写 |
| SSR / 元框架 | **Next.js** | **Nuxt** | Analog（老方案 Universal） | **SvelteKit** |
| 移动端 | **React Native** | uni-app（Vue 语法，多端） | Ionic/Angular | 生态弱 |
| 国内常用组件库 | Ant Design / MUI | Element Plus / Naive UI | Angular Material | Skeleton 等 |
| TypeScript 体验 | 原生好（JSX 即 TS） | 好，模板需 vue-tsc 辅助 | 最好（全 TS 起步） | 好 |

三个值得展开的观察：

1. **你在阶段 5 学的"客户端状态 vs 服务器状态分离"，是跨框架共识。** TanStack Query 五个框架全都有官方适配——服务器状态管理这块早就脱离了框架之争。Pinia 的 API（state/getter/action + 组合式 store）几乎就是 Zustand 思路的 Vue 翻译；学会一个，另一个半天上手。
2. **服务端方向的分野（衔接阶段 9）**：React 的 App Router 走得最激进——RSC（服务端组件）把"组件在服务端渲染、不进客户端 bundle"变成一等公民，代价是概念复杂度（Server/Client 边界、缓存语义）全行业最高；Nuxt/SvelteKit 是更传统的"同构应用"路线（SSR/SSG/水合），约定优于配置、目录即路由，上手曲线平缓。选型时"团队能否吃下 RSC 心智模型"是一个真实的成本项。
3. **生态位决定了"学哪个不亏"**：React 的生态广度（headless 库、AI 生成代码的质量、招聘池、跨端延伸 RN）仍然是最大护城河；Vue 的优势在"官方一体化"（Pinia/vue-router/Vite 全官方出品，版本对齐，文档中文一流）；Angular 赢在强约定带来的多人协作下限；Svelte 赢在产物体积与 DX，但生态深度（企业级组件库、跨端、招聘）短期是短板。

---

### 10. 选型决策：什么时候选 React，什么时候不选

把上面的机制差异落成决策表。先说总原则：**绝大多数业务系统里，React 和 Vue 的差距远小于"写得好与写得烂"的差距**——所以这张表里每一行的前提都是"团队能力相当"，如果团队只会其中一栈，答案立刻变成那一栈。

| 场景 | 倾向 | 理由 |
|---|---|---|
| 团队有 React 经验 / 代码资产 | React | 迁移成本 > 框架间理论差距 |
| 中后台管理系统（国内） | React 或 Vue | AntD 与 Element Plus 双雄并立，组件密度都够 |
| 重交互的编辑器/白板/可视化大屏 | Solid/Svelte 值得评估；React 走 Compiler + 细粒度拆分 | 高频细粒度更新是重渲染模型的痛点 |
| 超大型多人协作、强规范诉求 | Angular 有工程化优势（强约定、DI、全 TS） | 下限高、上限低，国内团队搭建成本高 |
| 内容站/营销页（SEO 优先） | Next.js 或 Astro | Astro 可混用 React 组件，按岛隔离水合 |
| 小程序/多端（国内现实） | uni-app（Vue 系）或 Taro（React 系） | 按团队栈选语法，底层同跨端 |
| 开源库 / 设计系统 | React 生态最大 | headless 基建（Radix/Headless UI）最厚 |
| 团队大多为新人和中级工程师 | React 或 Vue 都行，**避开过度抽象** | 简单可预测的心智 > 框架基准分 |

三条国内环境的现实补充：

1. **招聘池与协作惯性是硬约束**。一线城市两栈都好招；二线及外包链路里 Vue（尤其 Element 系中后台）存量极大。技术评审里"我们组 React 的人更多"是正当理由，不必包装成性能论证。
2. **小程序生态是隐形选票**。如果产品矩阵里有小程序，Taro（React 语法）和 uni-app（Vue 语法）的选择会反过来影响 Web 端框架——很多团队的栈是这么定下来的，坦诚面对它比假装"纯技术选型"更有用。
3. **真正的护城河是可迁移能力**。阶段 1–8 练的组件设计、状态建模、性能方法论、测试观，迁移成本很低；框架语法只占你能力的薄薄一层。这也是本篇安排"移植实验"（下一节产出）的原因——跨框架能力本身就是简历上的差异化项。

---

### 11. 迁移指南：React 开发者的 Vue 速查（与反向）

概念映射表（左边是你已掌握的，中间是 Vue 3 对应物，右边是关键差异）：

| React | Vue 3 | 关键差异 |
|---|---|---|
| `useState` | `ref()` / `reactive()` | 可变、赋值立即生效；模板自动解包 |
| `useMemo` | `computed` | 自动收集依赖，不用手写数组 |
| `useEffect` | `watch` / `watchEffect` / `onMounted` | 一个 API 的职责被拆成多个原语 |
| `useContext` | `provide` / `inject` | 细粒度订阅，无"value 引用变化全量重渲染"问题 |
| `children` / 具名 children | slot / 具名插槽 | 模板系有专门语法 |
| Render Props | 作用域插槽 | 概念等价 |
| HOC / 自定义 Hook | 组合式函数（composable，`useXxx()`） | 普通函数，无调用顺序规则 |
| `key` | `:key` | 语义相同 |
| `className` | `class` | |
| `dangerouslySetInnerHTML` | `v-html` | |
| `onClick` | `@click` | |
| 受控 input | `v-model` | 语法糖；拦截时拆开写 |
| `React.lazy` + `Suspense` | `defineAsyncComponent` | Vue 无 Suspense 级别的统一约定 |
| `<></>` Fragment | 多根节点（Vue 3 原生支持） | |
| StrictMode 双调用暴露副作用 | 无对应机制 | 自觉守纪律 |

**React → Vue 的五个高频坑**（每个都是真实迁移项目里反复出现的）：

1. **解构丢响应性**：`const { count } = reactive(...)` 之后 `count` 是死值（本篇第 3 节详述）。用 `toRefs`，或全程 `ref`。props 的解构是 Vue 3.5+ 特例（编译器补偿），但 `reactive` 对象的解构永远不保留。
2. **直接改 props**：Vue 里 props 可以读、改了会告警；子组件要改就 `emit` 或 `defineModel`——和 React 单向流的纪律一致，只是 Vue 给了更顺手的官方通道。
3. **`.value` 写错位置**：script 里忘写 `.value`（拿到的是 ref 对象不是值），template 里多写 `.value`（模板自动解包，写了反而是读对象属性）。初期 90% 的"界面不更新"都栽在这。
4. **watch 的依赖边界**：自动收集只追"响应式来源"——追不到解构出来的普通变量、追不到非响应式的普通对象。直觉来源是 React 的"依赖数组要写全"，在这里要反过来：**让响应式对象保持在原始形态被读取**，别在中途拔值。
5. **生命周期直觉重装**：setup 只跑一次。React 心智里"组件体 = 每次渲染"在这里不成立——把"每次数据变化都要重算"的逻辑写进 setup 顶层等于只算了一次。派生进 `computed`、响应进 `watch`。

**Vue → React 的三条**（反过来同样致命）：

1. **没有 `.value`、没有自动追踪**：所有"依赖变了就自动跑"的直觉失效，`useEffect` 靠手写依赖数组，漏写不报错、只产生 stale bug（阶段 2 闭包陷阱专题全部适用）。
2. **不许原地改 state**：把可变对象塞进 `useState` 然后 `state.list.push(x)`——引用没变，React 视为无更新。必须替换引用（阶段 2 不可变更新专题）。
3. **`v-model` 消失**：每个输入框都要 `value` + `onChange` 成对出现；表单量大直接上 react-hook-form，别手搓三十个受控 Input——阶段 4.1 的终点形态就是为此准备的。

---

### 12. 面试高频对比题：答题框架

五道最高频的题，给**答题骨架**（要点与推进顺序），不背全文——骨架 + 你亲手写过的场景例子，比背来的标准答案可信一个量级：

1. **"React 和 Vue 的响应式/更新机制有什么区别？"**
   骨架：快照重渲染（不可变 → setState 请求 → 函数重跑 → diff）vs 依赖追踪（可变 → Proxy/信号 → 细粒度更新）→ 各自的经典坑互为镜像（闭包旧值 vs 解构丢响应）→ React Compiler 在吸收对方优点 → 收尾：场景例子（三次 setCount 的机制分步，你亲手画过队列图）。
2. **"虚拟 DOM 是什么？Svelte 没有它为什么更快？"**
   骨架：VDOM 是"声明式 UI 的运行时兜底抽象"（用 diff 换正确性）→ Svelte 把这层工作搬到编译期（静态分析 → 定向 DOM 操作）→ 但代价是模板表达受限、动态性差的代码反而难优化 → 结论：不是"有没有 VDOM"分高下，是"运行时成本 vs 编译期约束"的取舍。
3. **"为什么 React Hooks 不能写在条件语句里？"**
   骨架：Hook 状态靠调用顺序对号（链表）→ 条件调用导致槽位错位 → 对照：Vue/Solid 的信号与调用位置无关，所以没有这条规则 → 延伸：这说明 Hook 的规则是 React"执行模型"的产物，不是函数式编程的教条。
4. **"React 和 Vue 的 diff 算法有什么区别？"**
   骨架：React 单向从左到右 + key 映射 → Vue 3 最长递增子序列 + 编译期 patch flag/静态提升，diff 前已跳过大半 → 落点：真正决定性能的是"重渲染范围"（React 组件级全量 vs Vue 细粒度 + 模板编译优化），比 diff 算法本身影响大。
5. **"新项目你会怎么选 React 还是 Vue？"**
   骨架：拒绝"X 更好"的开场 → 给决策维度（团队栈与招聘、存量资产、场景类型：中后台/编辑器/内容站、小程序多端诉求、生态基建）→ 用第 10 节决策表的 2–3 行举例 → 收尾：团队写得好的那个就是对的那个。

答题心法一句话：**对比题考的是"你是否理解每个设计选择付出的代价"，而不是"你背了多少特性"。** 每答一个差异，补一句"这个选择的代价是 X、收益是 Y"，立刻和背答案的候选人拉开差距。

---

### ✅ 产出：TodoMVC 的框架移植实验

把阶段 2 的产出（TodoMVC：增删改查 + 状态过滤 + localStorage 持久化）移植到另外两个框架，这是本篇唯一且必须动手的练习：

1. **Vue 3 版**：`<script setup>` + `ref`/`computed`，Vue 官方文档的"快速上手"章节够用。目标 ≤ 150 行。
2. **Svelte 5 版**：`$state`/`$derived`，Svelte 官方交互教程过一遍 Runes 章节即可。目标 ≤ 120 行。
3. 每个版本写三行对比笔记：哪一段最顺手（大概率是"不用手写依赖数组"）、哪一段需要换脑子、哪里踩了 React 心智的坑（大概率是 setup 顶层重算逻辑或 `.value`）。
4. **终极一问**（写进笔记）：状态过滤（all/active/done）在 React 里你怎么写的？在 Vue 里你会用 `computed` 吗？在 Svelte 里 `$derived` 吗？为什么三个框架最终收敛到同一个形态？（提示：第 6 节的"纪律收敛"。）
5. **加分**：把其中一个实现再移植回 React，体会"翻译腔"——逐行翻译出来的 React 代码会到处想找 `computed`，惯用写法是渲染中直接算 + `useMemo`。这个"翻译腔"的体感，就是本篇想给你的东西。

时间预算：Vue 一天、Svelte 一天、笔记半天。自测标准沿用开篇三条：能盲写 Vue 版计数器、能演示"解构丢响应"并说出修法、能讲清"Solid 组件为什么只跑一次"。

**延伸阅读**（各取所需，不必全读）：Vue 官方文档的《深入响应式系统》（理解 Proxy 依赖追踪的机制层）与《Vue 与其他框架对比》页（官方视角，克制且准确）；Solid 文档的《Comparison to React》（把"组件只跑一次"讲得最清楚的一页）；Svelte 官方交互教程（Runes 部分半天能过完，是四个框架里上手体验最好的）。

---

## 进阶篇：复杂业务场景

Schema 动态表单、Grafana 式拖拽大盘、拖拽式表单设计器、JSON 编辑器、低代码平台等高难度场景，见 [react-进阶大纲-复杂场景.md](react-进阶大纲-复杂场景.md)（建议完成本大纲阶段 1–4 后进入）。
