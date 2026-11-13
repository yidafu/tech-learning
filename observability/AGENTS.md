# AGENTS.md

## 工作区用途

这是开发者的**可观测性（Observability）学习工作区**，非代码仓库（尚无 git）。
内容以中文学习笔记、动手实验（lab）和示例代码为主。2026-11-06 起引入 Docusaurus 3.x 文档站（npm 构建系统），笔记与实验文档通过站点浏览。

## 学习大纲（后续内容的组织骨架）

- **阶段 0 · 概念基础**：可观测性 vs 监控；三大支柱 Metrics / Logging / Tracing；OpenTelemetry 基本概念（Signals、Semantic Conventions、Collector 架构）
- **阶段 1 · 指标 Metrics**：Prometheus 数据模型（counter/gauge/histogram/summary）、PromQL、exporter 埋点、Grafana 可视化与告警
- **阶段 2 · 日志 Logging**：结构化日志、Loki / ELK / ClickHouse 选型、采集器（Vector / Fluent Bit）
- **阶段 3 · 链路追踪 Tracing**：trace/span 模型、context 传播（W3C Trace Context）、OTel SDK + Collector 实战、Jaeger / Tempo
- **阶段 4 · 整合与告警**：三大支柱关联（exemplars、日志带 trace_id）、统一仪表盘、SLO 与错误预算、Alertmanager
- **阶段 5 · 生产进阶**：采样策略（head/tail-based）、高基数问题、持续性能剖析（Pyroscope）、eBPF、Kubernetes 可观测性
- **阶段 6 · 系统设计（收官）**：从零设计一个可观测系统——总体架构与容量估算、SDK 设计（服务端三信号 + 前端 RUM）、接入管道（拓扑/背压/尾部采样）、存储后端（TSDB/Loki/ClickHouse/Tempo 骨架）、查询与告警引擎（2026-11-06 新增，暂无专属 lab）
- **阶段 7 · 横向专题**：跨阶段的资深工程师日常——混沌工程与故障演练（稳态假设、爆炸半径、实验设计，反向检验可观测性本身）、事件响应与值班（事件生命周期、严重度分级、告警疲劳治理、无责复盘闭环）、大模型应用可观测性（gen_ai 语义约定、token 成本与质量信号、隐私脱敏）（2026-11-13 新增，暂无专属 lab）

## 约定

- 笔记与文档一律使用中文；代码注释可中英混用
- 建议目录结构：`docs/notes/`（按阶段编号，如 `docs/notes/01-metrics/`）、`docs/labs/`（每个实验独立子目录，含自己的 README 与运行方式）——两者同属 Docusaurus 的 `docs/` 内容目录，保持同级以便 `../../` 相对链接互引
- 实验优先选择可本地 podman compose 一键运行的方案；容器工具一律使用 podman（macOS 上先 `podman machine init && podman machine start`），不使用 docker
- 引用外部资料时附上链接和访问日期

## 文档站（Docusaurus）

- 站点根 = 仓库根：配置在 `docusaurus.config.js` / `sidebars.js` / `babel.config.js`，内容全在 `docs/`，首页与样式在 `src/`
- 命令：`npm run dev`（开发，:3000）/ `npm run build`（验收标准 0 错误 0 警告）/ `npm run serve`
- 侧边栏自动生成：目录 `_category_.json` 定分类排序；目录内 README.md 作分类索引；笔记 front matter `sidebar_position` 定章内顺序，须与各阶段 README「笔记索引」表一致，新增笔记两处同步
- `.md` 按纯 Markdown 解析（`format: 'detect'`），不走 MDX； mermaid 代码块可直接用（theme-mermaid 已装）
- 避坑：正文裸 URL 后不要紧跟全角标点（用反引号包 URL，否则构建报 `Can't parse URL`）；`onBrokenLinks: 'throw'`，新增互链先确认目标文件存在；数字前缀目录（如 `01-metrics`）的路由 slug 会剥掉前缀（路由为 `/docs/notes/metrics`）

## 未来 agent 注意事项

- 本目录不是 git 仓库（已有 `.gitignore` 备用）；如用户初始化 git，更新本文件
- 新增内容应对应上方大纲的某个阶段，并在相关 `docs/notes/` 目录维护索引（README 索引表 + sidebar_position）
- `node_modules/`、`build/`、`.docusaurus/` 为构建产物，不要手工改动
- 用户是开发者，偏好动手实战：讲解概念时配最小可运行示例
