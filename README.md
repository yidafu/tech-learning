# tech-learning · 技术学习笔记站群

八个方向的学习笔记站点，各自是独立的 [Docusaurus](https://docusaurus.io/) 站点，统一托管在一个 GitHub Pages 项目站下：

**https://yidafu.github.io/tech-learning/**

| 站点 | 目录 | 本地端口 | 内容 |
| --- | --- | --- | --- |
| [软件架构学习笔记](https://yidafu.github.io/tech-learning/architecture/) | `architecture/` | 8081 | 六阶段：架构思维 → 经典模式 → 分布式核心技术 → 方法论，附 Kotlin 示例与知识图谱 |
| [React 高阶学习课程](https://yidafu.github.io/tech-learning/react/) | `react/` | 3001 | 场景驱动的实战大纲：从基础编码到源码复刻 |
| [安全学习笔记](https://yidafu.github.io/tech-learning/security/) | `security/` | 3002 | 防御导向：从基础到 CTF 实战 |
| [可观测性学习站](https://yidafu.github.io/tech-learning/observability/) | `observability/` | 3003 | Metrics · Logging · Tracing 学习笔记与动手实验 |
| [JS/TS 深度学习笔记](https://yidafu.github.io/tech-learning/js-ts/) | `js-ts/` | 3004 | 笔记 + 可运行练习（`js-ts/exercises/`），含浏览器内 TS Playground |
| [RN 原理学习站](https://yidafu.github.io/tech-learning/react-native/) | `react-native/` | 3005 | 十个模块拆解 RN 底层：启动、Bridge、渲染、JSI/Fabric 新架构到 mini-react-native 实战 |
| [WebGL 与 3D 框架学习站](https://yidafu.github.io/tech-learning/webgl/) | `webgl/` | 3006 | 六阶段：渲染管线 → 核心渲染技术 → 自研数学库与迷你引擎 → Three.js 对标与毕业项目 |
| [编译原理学习站](https://yidafu.github.io/tech-learning/compiler/) | `compiler/` | 3007 | 八阶段：词法 → 语法 → 语义 → IR 与字节码 VM → GC → 优化 → Babel/tsc/esbuild 对标与毕业项目 |

## 本地开发

各站独立安装依赖（React 18/19 混用，刻意不做 workspaces 合并），端口已错开、可同时启动：

```bash
cd architecture    && npm install && npm run dev  # http://localhost:8081
cd react           && npm install && npm run dev  # http://localhost:3001
cd security        && npm install && npm run dev  # http://localhost:3002
cd observability   && npm install && npm run dev  # http://localhost:3003
cd js-ts/docs-site && npm install && npm run dev  # http://localhost:3004（笔记本体在 ../notes）
cd react-native    && npm install && npm run dev  # http://localhost:3005
cd webgl           && npm install && npm run dev  # http://localhost:3006
cd compiler        && npm install && npm run dev  # http://localhost:3007
```

## 部署（单 GitHub Pages，多站点子路径）

推送到 `main` 即触发 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

1. **build-site**（matrix 并行）：8 个站各自 `npm ci && npm run build`（baseUrl 均为 `/tech-learning/<站名>/`），产物上传为 artifact
2. **assemble-deploy**：落地页（`landing/index.html`）放站点根，各站 `build/` 合并到 `<站名>/` 子目录，经 `actions/deploy-pages` 发布

仓库设置（一次性）：Settings → Pages → Source 选 **GitHub Actions**。

### 目录约定与注意点

- `architecture/`：笔记正文（`01-第一阶段` ~ `06-第六阶段` 等）在目录根，`docs/` 以**相对符号链接**挂载（配 `resolve.symlinks: false`），构建前 `scripts/copy-samples.mjs` 会把 Kotlin 示例拷入 `static/`（已 gitignore）
- `react/`、`js-ts/docs-site/`、`react-native/`、`webgl/`、`compiler/`：使用 `docusaurus-graph` 插件，其注入脚本写死 `fetch('/docusaurus-graph.json')`，已通过 `patches/docusaurus-graph+2.0.0.patch`（patch-package）在构建时改写为 baseUrl 绝对路径；**改动 node_modules 后需重新 `npx patch-package docusaurus-graph`**
- `webgl/`、`compiler/`：阶段式笔记正文在 `docs/`（无 frontmatter，`NN-` 前缀决定顺序、URL 中自动剥离），`static/docusaurus-graph.json` 为构建产物快照（重建后 `cp build/docusaurus-graph.json static/` 更新）
- `js-ts/docs-site/`：浏览器内 TS 编译器资源（`static/ts/`，约 11MB）由 `scripts/gen-ts-libs.mjs` 在 `build`/`start` 时自动生成，不入库
