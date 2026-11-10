# 可观测性（Observability）学习工作区

> 一个面向开发者的可观测性系统学习仓库：概念笔记 + 可本地一键运行的动手实验（lab）。
> 所有笔记使用中文撰写；实验优先采用 podman compose 一键运行方案（本工作区统一使用 podman，不使用 docker）。

## 学习路线总览

| 阶段 | 主题 | 笔记 | 实验 |
| --- | --- | --- | --- |
| 0 | 概念基础：可观测性 vs 监控、三大支柱、OpenTelemetry 基本概念 | [notes/00-concepts/](docs/notes/00-concepts/README.md) | [labs/lab00-otel-collector-basics/](docs/labs/lab00-otel-collector-basics/README.md) |
| 1 | 指标 Metrics：Prometheus 数据模型、PromQL、exporter、Grafana 可视化与告警 | [notes/01-metrics/](docs/notes/01-metrics/README.md) | [labs/lab01-prometheus-grafana/](docs/labs/lab01-prometheus-grafana/README.md) |
| 2 | 日志 Logging：结构化日志、Loki / ELK / ClickHouse 选型、采集器 | [notes/02-logging/](docs/notes/02-logging/README.md) | [labs/lab02-loki-vector-logging/](docs/labs/lab02-loki-vector-logging/README.md) |
| 3 | 链路追踪 Tracing：trace/span 模型、context 传播、OTel SDK + Collector、Jaeger / Tempo | [notes/03-tracing/](docs/notes/03-tracing/README.md) | [labs/lab03-otel-tracing-jaeger/](docs/labs/lab03-otel-tracing-jaeger/README.md) |
| 4 | 整合与告警：三大支柱关联（exemplars、日志带 trace_id）、统一仪表盘、SLO 与错误预算、Alertmanager | [notes/04-integration/](docs/notes/04-integration/README.md) | [labs/lab04-three-pillars/](docs/labs/lab04-three-pillars/README.md) |
| 5 | 生产进阶：采样策略、高基数问题、持续性能剖析（Pyroscope）、eBPF、Kubernetes 可观测性 | [notes/05-production/](docs/notes/05-production/README.md) | [labs/lab05-sampling-and-profiling/](docs/labs/lab05-sampling-and-profiling/README.md) |
| 6 | 系统设计（收官）：从零设计一个可观测系统——总体架构与容量、SDK 设计（服务端 + 前端 RUM）、接入管道、存储后端、查询与告警 | [notes/06-system-design/](docs/notes/06-system-design/README.md) | —（规划中：lab06 mini 可观测平台） |

## 建议学习顺序

1. **阶段 0 → 1 → 2 → 3** 顺序学习：概念 → 三大支柱逐个击破，每个阶段先读笔记，再跑对应 lab。
2. **阶段 4** 是收获阶段：把三大支柱关联起来（trace_id 串联日志与指标、exemplars、统一仪表盘），并落地 SLO 与告警。
3. **阶段 5** 按需深入：采样、高基数、持续剖析、eBPF、K8s 场景。
4. **阶段 6** 收官复盘：站在"自己造一个"的架构师视角，把 0–5 的组件翻转为设计决策（容量估算、SDK 内部机制、管道背压、存储引擎骨架、查询引擎），面试冲刺可只读各篇"面试题小结"。

## 目录结构

```
.
├── AGENTS.md                  # 工作区约定
├── README.md                  # 本文件：总索引
├── docusaurus.config.js       # 文档站配置（Docusaurus 3.x）
├── sidebars.js / babel.config.js / package.json
├── docs/                      # 文档站内容（侧边栏 = 目录结构自动生成）
│   ├── notes/                 # 学习笔记（按阶段编号）
│   │   ├── 00-concepts/
│   │   ├── 01-metrics/
│   │   ├── 02-logging/
│   │   ├── 03-tracing/
│   │   ├── 04-integration/
│   │   ├── 05-production/
│   │   └── 06-system-design/  # 收官：从零设计一个可观测系统
│   └── labs/                  # 动手实验（每个实验独立子目录，可一键 podman compose 运行）
│       ├── lab00-otel-collector-basics/
│       ├── lab01-prometheus-grafana/
│       ├── lab02-loki-vector-logging/
│       ├── lab03-otel-tracing-jaeger/
│       ├── lab04-three-pillars/
│       └── lab05-sampling-and-profiling/
└── src/                       # 站点首页与自定义样式
```
<!-- 保留原图：目录结构清单，非概念示意图，Mermaid 无原生文件树类型 -->

## 文档站（Docusaurus）

2026-11-06 引入 Docusaurus 3.x 文档站（搭建手册见另一仓库的 DOCUSAURUS-SETUP.md），笔记与实验文档可直接浏览：

```bash
npm install        # 首次（已装过可跳过）
npm run dev        # 本地开发，http://localhost:3000
npm run build      # 构建到 build/，验收标准：0 错误 0 警告
npm run serve      # 预览构建产物
```

站点约定：

- 侧边栏由目录结构自动生成：`_category_.json` 定分类排序，各目录 README.md 作分类索引，笔记 front matter 的 `sidebar_position` 定章内顺序（与各阶段 README「笔记索引」表保持一致，新增笔记时两处同步更新）
- `.md` 按纯 Markdown 解析（`markdown.format: 'detect'`），不走 MDX；需要嵌 React 组件再建 `.mdx`
- 笔记可直接写 ` ```mermaid ` 代码块（theme-mermaid 已装，客户端渲染成 SVG）
- 注意：正文裸 URL 后不要紧跟全角标点，URL 用反引号包成行内代码，否则构建报 `Can't parse URL`

## 环境要求

- podman ≥ 4.x + podman compose（macOS 上先 `podman machine init && podman machine start` 启动 Linux VM）
- 约 4GB 可用内存（阶段 4/5 的整合 lab 组件较多）
- 各 lab 的详细前置条件见其目录下 README

## 参考资料索引

各阶段笔记中引用的外部资料均附原文链接与访问日期。权威入口：

- OpenTelemetry 官方文档：<https://opentelemetry.io/docs/>（访问日期：2026-11-04）
- Prometheus 官方文档：<https://prometheus.io/docs/>（访问日期：2026-11-04）
- Grafana Loki 文档：<https://grafana.com/docs/loki/>（访问日期：2026-11-04）
- Jaeger 文档：<https://www.jaegertracing.io/docs/>（访问日期：2026-11-04）
-《Google SRE 书》中文版：<https://sre.google/books/>（访问日期：2026-11-04）

## 附：ASCII 图替换清单

本文件没有需要替换为 Mermaid 的 ASCII 示意图（「学习路线总览」为 Markdown 表格，未改动）。

### 保留说明

- 「目录结构」：仓库目录树（文件系统清单）。Mermaid 无原生文件树类型，转为 flowchart 会丢失清单可读性，保留原样；已在代码块结束后加 HTML 注释说明。
