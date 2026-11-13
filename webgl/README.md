# WebGL 与 3D 框架学习站（文档站）

从零掌握 WebGL 渲染原理，最终自研一个迷你 3D 框架（数学库 + 场景图 + 渲染器 + 材质/资源系统）的六阶段学习笔记，终点是 Three.js 源码对标与毕业项目。使用 **Docusaurus 3** 构建。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，http://localhost:3006
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

## 目录结构

| 路径 | 说明 |
|------|------|
| `docusaurus.config.js` | 站点配置（标题 / 六阶段导航 / 站群互链） |
| `sidebars.js` | 侧边栏顶层显式声明（大纲 → 六阶段），阶段内部按目录自动生成 |
| `docs/` | 学习大纲 + 六个阶段（每阶段 `01-导览.md` 为入口，笔记保持无 frontmatter） |
| `src/pages/index.js` | 站群统一模板首页（阅读顺序 + 阶段卡片） |
| `src/css/custom.css`、`src/components/site/`、`static/img/` | 站群统一主题（由 `shared/sync-theme.mjs` 同步，勿手改） |

## 六个阶段

| # | 阶段 | 定位 | 站内路径 |
|---|------|------|----------|
| 1 | 渲染管线与 WebGL 入门 | 管线全局观、GLSL、图形学数学 | [/docs/第一阶段/导览](/docs/第一阶段/导览) |
| 2 | WebGL 核心渲染技术 | 纹理、光照、FBO、WebGL2 | [/docs/第二阶段/导览](/docs/第二阶段/导览) |
| 3 | 自研数学库与引擎雏形 | minmath、引擎最小核心 | [/docs/第三阶段/导览](/docs/第三阶段/导览) |
| 4 | 框架架构与工程化 | 场景图、材质系统、发布 npm（重点） | [/docs/第四阶段/导览](/docs/第四阶段/导览) |
| 5 | 进阶渲染与性能 | 阴影、后处理、PBR、性能优化 | [/docs/第五阶段/导览](/docs/第五阶段/导览) |
| 6 | 源码对标与毕业项目 | Three.js 源码、毕业项目 | [/docs/第六阶段/导览](/docs/第六阶段/导览) |
| 附 | 数学专题 | 线性代数、频域、蒙特卡洛等补充 | [/docs/数学专题/线性代数深化](/docs/数学专题/线性代数深化) |
| 附 | 着色器语言专题 | GLSL 语法全集、内置函数深用、精度与编译器 | [/docs/着色器语言专题/导览](/docs/着色器语言专题/导览) |
| 附 | 实战专题 | 模型查看器、3D 数据可视化、全景查看器三个项目 | [/docs/实战专题/导览](/docs/实战专题/导览) |
| 附 | 资产管线专题 | glTF 2.0 深入、Draco/meshopt/KTX2 压缩与工具链 | [/docs/资产管线专题/导览](/docs/资产管线专题/导览) |
| 附 | 物理专题 | 数值积分、碰撞检测与响应、布料 PBD | [/docs/物理专题/导览](/docs/物理专题/导览) |
| 附 | 附录速查 | WebGL API / GLSL / 常用代码片段速查卡 | [/docs/附录速查/导览](/docs/附录速查/导览) |
| 附 | 技术专题 | GLSL Cookbook、文本/2D、GPGPU、WebGPU 迁移 | [/docs/技术专题/导览](/docs/技术专题/导览) |
| 附 | 工程专题 | 调试诊断、移动端兼容、测试质量 | [/docs/工程专题/导览](/docs/工程专题/导览) |

学习大纲（含逐条勾选的进度清单）：[docs/WebGL与3D框架学习大纲.md](docs/WebGL与3D框架学习大纲.md)。

## 可运行示例（`examples/`）

独立的 Vite + TypeScript 工程（与文档站无依赖关系），把分册代码落成 13 个递进示例：三角形 → 公转立方体 → 程序化纹理地球 → 数学库自检 → 轨道相机 → 微型场景图 → 射线拾取 → shadow map → IBL 环境光照 → SSAO → GPU 分段计时 → 级联阴影 → 视锥剔除。运行方式见 [examples/README.md](examples/README.md)。

## 约定

- 笔记为纯 Markdown（`.md`）、无 frontmatter，架构图 / 流程图优先使用 ` ```mermaid ` 代码块。
- 文件名 `NN-` 数字前缀决定侧边栏顺序，URL 中由 Docusaurus 自动剥离。
- 站群统一主题改动请编辑 `shared/theme/` 后运行 `node shared/sync-theme.mjs`，不要直接改本站的主题产物。
