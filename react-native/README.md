# ReactNative 原理学习站（文档站）

系统拆解 ReactNative 底层工作原理的十二个模块：从启动流程、Bridge 通信、渲染管线到新架构（JSI / Fabric / TurboModules），原理为主、源码关键路径为辅。使用 **Docusaurus 3** 构建。

## 本地运行

```bash
npm install    # 首次安装依赖
npm run dev    # 开发模式，http://localhost:3005
npm run build  # 构建静态站点到 build/
npm run serve  # 本地预览构建产物
```

## 目录结构

| 路径 | 说明 |
|------|------|
| `docusaurus.config.js` | 站点配置（标题 / 模块导航 / 站群互链） |
| `sidebars.js` | 侧边栏由 docs/ 目录结构自动生成 |
| `docs/` | 十二个原理模块（每模块一个目录，README.md 为索引页） |
| `src/pages/index.js` | 站群统一模板首页（阅读顺序 + 模块卡片） |
| `src/css/custom.css`、`src/components/site/`、`static/img/` | 站群统一主题（由 `shared/sync-theme.mjs` 同步，勿手改） |

## 十二个模块

| # | 模块 | 定位 | 站内路径 |
|---|------|------|----------|
| 1 | 全景与演进 | RN 技术本质、跨端方案对比、版本演进 | [/docs/rn-全景与演进](/docs/rn-全景与演进) |
| 2 | 启动流程原理 | Android / iOS 启动链路、Bundle 加载 | [/docs/rn-启动流程原理](/docs/rn-启动流程原理) |
| 3 | JS 引擎与线程模型 | JSC / Hermes、四线程模型 | [/docs/rn-JS引擎与线程模型](/docs/rn-JS引擎与线程模型) |
| 4 | Bridge 通信原理 | 旧架构消息队列与调用链 | [/docs/rn-Bridge通信原理](/docs/rn-Bridge通信原理) |
| 5 | 渲染原理 | 三棵树、Reconciler、Yoga | [/docs/rn-渲染原理](/docs/rn-渲染原理) |
| 6 | 事件系统原理 | 触摸链路、手势仲裁 | [/docs/rn-事件系统原理](/docs/rn-事件系统原理) |
| 7 | 新架构 | JSI / Fabric / TurboModules / Codegen | [/docs/rn-新架构](/docs/rn-新架构) |
| 8 | Metro 打包与热更新 | 打包管线、Bundle 结构、差分更新、OTA 工程实践 | [/docs/rn-Metro打包与热更新](/docs/rn-Metro打包与热更新) |
| 9 | 性能优化原理 | 定位方法论、剖析操作手册、列表虚拟化、掉帧归因 | [/docs/rn-性能优化原理](/docs/rn-性能优化原理) |
| 10 | 原理实战 | mini-react-native、TurboModule 开发 | [/docs/rn-原理实战](/docs/rn-原理实战) |
| 11 | 测试体系 | Jest / 组件测试渲染器、E2E 框架选型 | [/docs/rn-测试体系](/docs/rn-测试体系) |
| 12 | 混合开发 | RN 嵌入原生 App、多实例、混合导航与通信边界 | [/docs/rn-混合开发](/docs/rn-混合开发) |

## 约定

- 文章为纯 Markdown（`.md`），架构图 / 时序图优先使用 ` ```mermaid ` 代码块。
- 关键调用链标注 RN 源码位置（如 `Libraries/BatchedBridge/MessageQueue.js`），便于按图索骥。
- 站群统一主题改动请编辑 `shared/theme/` 后运行 `node shared/sync-theme.mjs`，不要直接改本站的主题产物。
