# 编译原理学习站（文档站）

从零掌握编译器核心原理，用 TypeScript 实现一门完整 mini 语言（词法 → 语法 → 语义 → IR → 字节码 VM → GC → 优化）的八阶段学习笔记，终点是对标 Babel / TypeScript / esbuild 源码与毕业项目。使用 **Docusaurus 3** 构建。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，http://localhost:3007
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

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
| 1 | 编译器全局观与语言基础 | 流水线全景、文法与形式语言 | `/docs/第一阶段/导览` |
| 2 | 词法分析 | 正则 → 自动机、手写 lexer | `/docs/第二阶段/导览` |
| 3 | 语法分析与 AST | LL / Pratt / LR、错误恢复 | `/docs/第三阶段/导览` |
| 4 | 语义分析与类型系统 | 符号表、类型检查与推导 | `/docs/第四阶段/导览` |
| 5 | 中间表示与字节码虚拟机 | IR 家族、栈式 VM、闭包 | `/docs/第五阶段/导览` |
| 6 | 运行时与内存管理 | 对象模型、垃圾回收 | `/docs/第六阶段/导览` |
| 7 | 优化技术 | 数据流、SSA、经典 pass | `/docs/第七阶段/导览` |
| 8 | 现代编译器与前端工程实战 | Babel / tsc / esbuild / WASM | `/docs/第八阶段/导览` |

贯穿项目是一门 mini 语言，随阶段逐层生长：token 流 → AST → 类型检查 → 字节码 → VM + GC → 优化 → （选做）WASM 后端。
