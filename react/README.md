# React 高阶学习课程（文档站）

八份场景驱动的 React 学习大纲，使用 **Docusaurus 3** 构建为文档站，站点配置直接位于本仓库根目录。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，默认 http://localhost:3000
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

## 目录结构

| 路径 | 说明 |
|------|------|
| `docusaurus.config.js` | 站点配置（标题 / 导航 / zh-Hans） |
| `sidebars.js` | 侧边栏由 docs/ 目录结构自动生成 |
| `docs/` | 八份大纲的正文（每份一个目录，README.md 为分章索引） |
| `src/pages/index.js` | 文档站首页（阅读顺序 + 大纲卡片） |
| `src/css/custom.css` | 主题色与首页样式 |
| `完整版备份/` | 拆分前的完整原件（未纳入文档站） |
| `大纲原件备份/` | 更早的精简版大纲（未纳入文档站） |
| `DOCUSAURUS-SETUP.md` | 站点搭建手册：在其他项目复刻本站的完整步骤与踩坑清单 |

## 八份大纲

| # | 文档 | 定位 | 站内路径 |
|---|------|------|----------|
| 1 | React 实战编码学习大纲（场景驱动版） | 阶段 0–10 全基础，12–14 周 | [/docs/react-学习大纲](/docs/react-学习大纲) |
| 2 | React 高阶实战大纲：Schema 驱动的复杂业务场景 | 通用底座 + 五大场景 | [/docs/react-进阶大纲-复杂场景](/docs/react-进阶大纲-复杂场景) |
| 3 | 前端高阶场景全景图 | 7 大族群 23 个高阶场景选型地图 | [/docs/react-高阶场景全景图](/docs/react-高阶场景全景图) |
| 4 | React 高阶场景第二辑 | 搭建器族 × SaaS 平台能力族 | [/docs/react-高阶场景-第二辑](/docs/react-高阶场景-第二辑) |
| 5 | React 组件库实战大纲 | 组件实现的功力清单 | [/docs/react-组件库实战大纲](/docs/react-组件库实战大纲) |
| 6 | React 源码学习：复刻一个简化版 React | didact 式 mini React，M1–M13（含并发三部曲）+ React Compiler 专题 | [/docs/react-源码复刻大纲](/docs/react-源码复刻大纲) |
| 7 | React 复杂场景项目复刻手册 | 拖拽仪表盘 / 低代码平台整合 | [/docs/react-复杂场景-项目复刻](/docs/react-复杂场景-项目复刻) |
| 8 | React 高阶场景第二辑项目复刻手册 | 大屏搭建器 / 工作流节点图 / 查询构建器等 9 场景施工手册 | [/docs/react-高阶场景-第二辑-项目复刻](/docs/react-高阶场景-第二辑-项目复刻) |

## 约定

- 章节顺序沿用文件名数字前缀（`01-`、`02-` …），Docusaurus 自动解析为侧边栏顺序。
- 每份大纲目录内有 `_category_.json` 控制侧边栏中的排列（即上表 #1–#7 的阅读顺序）。
- `.md` 文件按纯 Markdown 解析（`markdown.format: 'detect'`），不要求 MDX 语法；如需嵌 React 组件，新建 `.mdx` 或在 front matter 加 `format: mdx`。
- 已启用 `@docusaurus/theme-live-codeblock`：```` ```jsx live ```` / ```` ```js live ```` 代码块在页面内直接运行。注意 react-live 4.x 规则：inline 模式整段代码必须是一个表达式；多语句用 `noInline` + `render()`；求值结果必须是 React 元素才会显示。详见站内 [写作指南](/docs/写作指南-MDX-与在线代码块)。
- 已启用 `@docusaurus/theme-mermaid`：```` ```mermaid ```` 代码块渲染为图表（`.md` 直接可用）。
- 已启用 `docusaurus-graph`：构建后生成 `build/docusaurus-graph.json`，站点右上角图视图入口看全站知识图谱。节点的边只来自 front matter `sources:` / `references:` 标签（值为目标文件名去 `.md`）；八份大纲 README 已注入 `references:` 指向各章。
- `@docusaurus/plugin-rsdoctor` 为按需启用：`npm run build:analyze`（即 `RSDOCTOR=true`）生成 `build/.rsdoctor/` 产物分析报告。⚠️ 不要放进常规构建——instrument 开销大（构建 80 秒 → 15+ 分钟），且其 SDK 会让构建进程写完报告后不退出（需手动 Ctrl-C）。
- 通用 React 组件放 `src/components/`（如 `Callout`），供 `.mdx` 静态嵌入。
- `docusaurus.config.js` 中的 `url` 为占位地址，部署时替换为实际域名。

## 建议阅读顺序

1. **打基础**：《react-学习大纲》阶段 0–4（必须），阶段 5–8 按需。
2. **上难度**：《react-进阶大纲-复杂场景》—— schema 内核是后面所有场景的公共底座。
3. **扩视野**：《react-高阶场景全景图》选方向；《react-高阶场景-第二辑》吃透搭建器族与 SaaS 三件套。
4. **练功力**：《react-组件库实战大纲》Part A → Lv 阶梯，与场景线并行。
5. **懂原理**：《react-源码复刻大纲》可随时穿插，复刻完回头看前五份会更透。其中并发三部曲（M11–M13：调度器、lane、可中断渲染与 transition）对齐阶段 6 的 `useTransition`；第 8 章 React Compiler 专题是阶段 6 第 10 条评估清单的原理篇。
