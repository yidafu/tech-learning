# 阶段 6 · 系统设计：从零设计一个可观测系统（收官）

> 前五个阶段学"怎么用"（Prometheus / Loki / OTel / Jaeger / Grafana / Tempo），本阶段换成**架构师视角**：如果自己造一个可观测系统（mini-Datadog），每一层该怎么设计？
> 以"自研设计为主线、对照开源真实实现"：每个子系统先给最小可用骨架与决策表，再对照 Prometheus / Mimir / Loki / Tempo / OTel 的工业级做法。

## 本阶段笔记

| # | 笔记 | 回答的问题 | 对照实现 | 前置 |
| --- | --- | --- | --- | --- |
| 1 | [总体设计](architecture-overview.md) | 需求怎么从排障工作流反推？容量怎么估？架构怎么分层？自研/组装/购买怎么选？ | Mimir / Thanos / Grafana 栈 | 阶段 0 |
| 2 | [服务端 SDK 设计](sdk-design-server.md) | API/SDK 分离、context 机制、采样一致性、导出管线状态机、自动埋点原理 | OTel SDK / javaagent | [otel-sdk](../03-tracing/otel-sdk.md) |
| 3 | [前端 RUM SDK 设计](sdk-design-rum.md) | Web Vitals 测量原理、错误采集与 Source Map、上报通道、前后端 trace 串联、隐私合规 | Grafana Faro / web-vitals | [frontend-rum](../04-integration/frontend-rum.md) |
| 4 | [接入管道设计](ingestion-pipeline.md) | 拓扑怎么选？过载时拒绝还是排队？尾部采样为何在这层？要不要 Kafka？ | OTel Collector / loadbalancing | [otel-collector-deep-dive](../00-concepts/otel-collector-deep-dive.md) |
| 5 | [存储后端设计](storage-backends.md) | TSDB 倒排索引与 Gorilla、日志三路线（ES/Loki/ClickHouse）、Tempo 扁平索引、保留与降采样 | Prometheus / Mimir / Loki / Tempo | 阶段 1–3 |
| 6 | [查询与告警引擎](query-and-alerting.md) | 查询语言三层共性、拆分并行缓存、记录规则、告警状态机与收敛、三大信号互跳 | PromQL/LogQL/TraceQL / Alertmanager | 阶段 1、4 |

## 建议学习顺序

1. 学完阶段 0–5 后，把本阶段当**收官复盘**读：每篇都会把前面某个组件的"用法"翻转成"为什么这样设计、还能怎么设计"。
2. 顺序：总体设计 → 服务端 SDK → RUM SDK → 接入管道 → 存储 → 查询与告警（与数据流向一致：采集 → 管道 → 存储 → 查询）。
3. 读法建议：每篇先看决策表和"常见坑"，能对上自己的经验再回头看机制细节；面试冲刺只看各篇"面试题小结"。

## 贯穿全系列的三条设计公理

- **永不伤害宿主/业务**：SDK 有界队列自损，网关过载拒绝（429）推回退避——数据完整性永远让位于业务存活；
- **按访问模式设计存储**：metrics 窗口聚合、logs 标签过滤+内容扫描、traces ID 点查——三种访问模式决定三副引擎，统一的是 trace_id 关联而非存储；
- **成本是第一等设计约束**：采样率、降采样、保留策略、预聚合四个阀门必须租户级可配，容量表（不是架构图）是设计的第一张表。

## 动手实验

专属 lab：[lab06-mini-platform](../../labs/lab06-mini-platform/README.md)——零依赖 Node.js 实现"OTLP/JSON 接收 + 内存/SQLite 存储 + 查询 API + 瀑布图页面"的 mini 可观测平台后端，对应 [sdk-design-server](sdk-design-server.md) 第 9 节的骨架；demo 应用使用 [llm-observability](../07-topics/llm-observability.md) §3.3 的手写埋点（含 gen_ai span）。
另一个好练习：把阶段 4 的 [lab04-three-pillars](../../labs/lab04-three-pillars/README.md) 当作"迷你平台"逐层拆解对照本系列笔记。

## 与其他阶段的关系

- 阶段 0–3：三大支柱与 OTel 的**用法**（本阶段是其设计视角续篇）
- 阶段 4：关联、SLO、统一仪表盘（本阶段 [查询与告警](query-and-alerting.md) 的产品化落点）
- 阶段 5：采样、高基数、剖析、eBPF（本阶段反复引用的成本与扩展性主题）
