# GUI 框架原理学习站（文档站）

从零掌握 GUI 框架的核心概念，用 TypeScript 驱动纯图形库 raylib（经 ScriptC 编译为原生可执行文件，macOS / Linux），造一个自绘保留模式 GUI 框架（绘制层 → 文本排版 → 控件树与布局 → 事件系统 → 渲染调度 → signals 声明式层）的八阶段学习笔记，终点是对标 Flutter / Qt / Slint / GPUI / egui 并完成毕业项目。使用 **Docusaurus 3** 构建。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，http://localhost:3008
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

## 技术栈与实验平台

| 层 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript | 框架与应用全部用 TS 编写 |
| 编译器 | [ScriptC](https://scriptc.dev)（Vercel Labs） | TS → 原生可执行文件（C 后端，不内嵌 JS 引擎） |
| 图形库 | [raylib 6.0](https://raylib.com) + [scriptc-raylib](https://github.com/gccody/scriptc-raylib) 绑定 | 纯图形库：开窗、输入、2D 绘制原语、默认字体——只给原料，不给框架 |
| 实验平台 | macOS（本机实测）/ Linux x64·arm64（工具链支持） | 桌面原生窗口，无浏览器 |

> raylib 刻意「只有图形库没有 GUI 框架」：没有控件、没有布局、没有事件分发——这正好是要在课程里亲手补出来的每一层。

## 目录结构

| 路径 | 说明 |
|------|------|
| `docusaurus.config.js` | 站点配置（标题 / 八阶段导航 / 站群互链） |
| `sidebars.js` | 侧边栏顶层显式声明（大纲 → 八阶段），阶段内部按目录自动生成 |
| `docs/` | 学习大纲 + 八个阶段（每阶段 `01-导览.md` 为入口，笔记保持无 frontmatter） |
| `src/pages/index.js` | 站群统一模板首页（阅读顺序 + 阶段卡片） |
| `src/css/custom.css`、`src/components/site/`、`static/img/` | 站群统一主题（由 `shared/sync-theme.mjs` 同步，勿手改） |
| `patches/docusaurus-graph+2.0.0.patch` | 子路径部署补丁（fetch 路径 + README 节点 id，见仓库根 README） |

## 八个阶段

| # | 阶段 | 定位 | 站内路径 |
|---|------|------|----------|
| 1 | 全局观与第一个窗口 | 框架分层、保留 vs 立即模式、工具链跑通 | `/docs/第一阶段/导览` |
| 2 | 绘制层 | Painter API、裁剪变换、显示列表 | `/docs/第二阶段/导览` |
| 3 | 文本与排版 | 字形度量、断行、富文本 | `/docs/第三阶段/导览` |
| 4 | 控件树与布局 | 双树分层、约束布局协议、Flex/Stack | `/docs/第四阶段/导览` |
| 5 | 事件与交互 | 命中测试、焦点链、手势、滚动 | `/docs/第五阶段/导览` |
| 6 | 渲染管线与调度 | 脏标记、局部重绘、动画系统 | `/docs/第六阶段/导览` |
| 7 | 声明式与响应式层 | signals、树协调、主题 token | `/docs/第七阶段/导览` |
| 8 | 工程化与毕业项目 | 控件库、虚拟列表、测试、对标 | `/docs/第八阶段/导览` |
| 专题 | 布局算法专题（阶段四的算法纵深） | Flow 贪心装行 / Grid 轨道解算 / Constraint 方程求解 / Absolute 锚边算术 / Stack/Z 两序镜像，每册含手算用例与实跑断言 | `/docs/09-布局算法专题/01-导览` |

贯穿项目是一个自绘 GUI 框架（工作名 mini-gui），随阶段逐层生长：窗口与帧循环 → Painter → 文本排版 → 控件树 + 布局协议 → 事件系统 → 脏区重绘与动画 → signals 声明式层 → 控件库与毕业项目。布局算法专题对应 `gui/labs/mini-gui/src/core/render/` 下的 `flow.ts` / `grid.ts` / `constraint.ts`（Stack/Absolute 复用既有 `stack.ts`），vitest 全仓 201 断言全绿。
