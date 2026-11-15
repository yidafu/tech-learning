---
sidebar_position: 2
---

# 2. Exemplars：把"那一次请求"钉在指标曲线上

> 阶段 4 · 笔记 2。指标是聚合的、匿名的——p99 直方图不会告诉你"是哪一次请求慢"。
> Exemplar（样本/示例）把**单个可定位的样本（通常带 trace_id）**挂在直方图桶上，
> 让"看曲线"到"看 trace"只需一次点击。本篇讲透概念、启用链路、版本兼容与价值边界。

## 目录

1. [概念：exemplar 到底是什么](#1-概念exemplar-到底是什么)
2. [格式与协议：OpenMetrics 与 OTLP](#2-格式与协议openmetrics-与-otlp)
3. [完整启用链路（四段缺一不可）](#3-完整启用链路四段缺一不可)
4. [PromQL / API / Grafana 中查看 exemplar](#4-promql--api--grafana-中查看-exemplar)
5. [OTel 链路如何透传 exemplar](#5-otel-链路如何透传-exemplar)
6. [版本兼容注意事项](#6-版本兼容注意事项)
7. [价值与限制](#7-价值与限制)
8. [常见坑](#8-常见坑)
9. [面试题小结](#9-面试题小结)
10. [参考资料](#10-参考资料)

---

## 1. 概念：exemplar 到底是什么

### 1.1 从一个痛点说起

`app_http_request_duration_seconds_bucket{le="1"}` 告诉你"过去 5 分钟有 12354 个请求
落在 1s 桶内"。但你盯着那个 2.4s 的尖峰想问的是：**"是哪几次请求贡献的？"**——
传统 Prometheus 回答不了：时序是聚合产物，个体信息在埋点瞬间就被扔掉了。

Exemplar 的定义（OpenMetrics/Prometheus 语境）：**时间序列上某个数据点附带的一个
"带标签的观测样本"**，包含三个要素：

| 要素 | 说明 | 例子 |
| --- | --- | --- |
| Value | 这次观测的值 | `0.087`（秒） |
| Timestamp | 观测发生的时间 | `1520879607.789` |
| LabelSet | 关联标签（几乎总是 trace 标识） | `trace_id="KOO5S4vxi0o"` |

最常见的载体是**直方图桶**：每个 `_bucket` 序列的数据点可以挂多个 exemplar，
Prometheus 只保留最近 N 个（环形缓冲）。这样"1s 桶"上的 exemplar 就是
"最近落进这个桶的真实请求样本"，点一下就进 trace。

### 1.2 与日志 trace_id 注入的区别

| 维度 | 日志带 trace_id | Exemplar |
| --- | --- | --- |
| 载体 | 单条日志行 | 指标数据点 |
| 覆盖率 | 每条日志都有（在 span 内） | 采样保留（有数量上限） |
| 语义 | "这件事发生了，证据在此" | "这个桶/曲线，由这类样本构成" |
| 典型入口 | 从错误日志点进 trace | 从延迟曲线上的点进 trace |
| 依赖 | 日志系统 | Prometheus 2.26+ / OTel 指标管线 |

两者互补：**排延迟看 exemplar（从指标到个体），排错误看日志（从证据到个体）**。

---

## 2. 格式与协议：OpenMetrics 与 OTLP

### 2.1 OpenMetrics 文本格式

Prometheus 抓取端要识别 exemplar，必须用 OpenMetrics 格式（抓取协商）。文本形态：

```text
# TYPE http_request_duration_seconds histogram
# UNIT http_request_duration_seconds
http_request_duration_seconds_bucket{le="0.1"} 12354 # {trace_id="KOO5S4vxi0o"} 0.087 1520879607.789
http_request_duration_seconds_bucket{le="+Inf"} 24054 # {trace_id="oHg5SJYRHA0"} 1.904 1520879610.112
http_request_duration_seconds_sum 7213.017
http_request_duration_seconds_count 24054
# EOF
```
<!-- 保留原图：OpenMetrics 抓取文本示例输出，非示意图 -->

语法要点：数据点之后 `#` 引出 exemplar，`{标签}` + 观测值 +（可选）时间戳；一条数据点
后可以跟多个 exemplar。规则原文见 OpenMetrics 规范 §Exemplars：
<https://github.com/OpenObservability/OpenMetrics/blob/main/specification/OpenMetrics.md#exemplars>（访问日期：2026-11-04）

### 2.2 OTLP 中的 exemplar

OTLP 指标协议里，每个 NumberDataPoint / HistogramDataPoint 都有 `exemplars` 数组：

```protobuf
message Exemplar {
  repeated KeyValue filtered_attributes = 1; // 附加维度（如 span.name）
  double value = 2;                          // 观测值
  fixed64 time_unix_nano = 3;                // 时间
  // 二选一：trace 关联
  bytes trace_id = 4;
  bytes span_id  = 5;
}
```

SDK 决定"往哪些点放 exemplar、放多少"（ExemplarReservoir 采样器），协议只管运输。
规范：<https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars>（访问日期：2026-11-04）

---

## 3. 完整启用链路（四段缺一不可）

Exemplar 是出了名的"配置链路长"，四段任何一段断了都静默失效：

```mermaid
flowchart TD
    A["① SDK/应用<br/>产出 exemplar（trace-based 采样保留）"] -->|"OTLP（exemplars 字段）"| B["② OTel Collector<br/>prometheus exporter：enable_open_metrics: true"]
    B -->|"抓取（OpenMetrics 协商）"| C["③ Prometheus<br/>--enable-feature=exemplar-storage<br/>（+抓取协商出 OpenMetrics 格式）"]
    C -->|"查询 /api/v1/query_exemplars"| D["④ Grafana<br/>数据源 exemplarTraceIdDestinations<br/>+ 面板开启 Show exemplars"]
```

### ① SDK 侧：让它产出

- **Java**：支持最成熟，`ExemplarFilter` 默认 `trace_based`（有活跃 span 就可能被选中），
  通常无需配置；
- **.NET**：同样内置支持；
- **Go**：写作本文时仍属实验性/未默认开启，关注 OTel Go 发行说明；
- **Python**：写作本文时 SDK 尚未实现 exemplar 输出（规范有、实现未跟上）——
  lab04 因此把链路全部配好但面板上暂无亮点，属预期；
- 规范环境变量（SDK 是否支持看语言）：`OTEL_METRICS_EXEMPLAR_FILTER=trace_based|always_on|always_off`。

### ② Collector 侧（lab04 已配）

```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    enable_open_metrics: true   # exemplar 只能通过 OpenMetrics 格式表达
```

只要 pdata 里指标带 exemplar，exporter 就会带出去；`enable_open_metrics` 决定的是
"以 OpenMetrics 格式暴露抓取端点"。

### ③ Prometheus 侧（lab04 已配）

```yaml
# docker-compose.yml 的 command 段:
- --enable-feature=exemplar-storage    # 持久化 + 更大容量（默认只有极小的内存缓冲）
```

同时确认抓取协商出 OpenMetrics：Prometheus 2.5x 默认支持 `OpenMetricsText1.0`，若你
显式配置了 `scrape_protocols`，不要把 OpenMetrics 从列表里删掉。容量上限由启动参数
`--storage.exemplars.exemplars-limit`（每序列最大 exemplar 数，默认建议显式设，如 100000 全局
用 `--storage.exemplars.max-exemplars`，按版本参数名有差异，以官方文档为准）。

### ④ Grafana 侧（lab04 已配）

```yaml
# Prometheus 数据源
jsonData:
  exemplarTraceIdDestinations:
    - name: trace_id            # exemplar 标签名（collector 输出的就是 trace_id）
      datasourceUid: tempo      # 点击后跳转的目标
      url: "${__value.raw}"
```

面板：Timeseries → Panel options → **Show exemplars** 打钩；exemplar 点位会以
高亮小点叠加在曲线上，悬停/点击跳 Tempo。Explore 查询时勾选 "Show exemplars" 同理。

---

## 4. PromQL / API / Grafana 中查看 exemplar

### 4.1 PromQL 本身查不了 exemplar

设计如此：exemplar 不是时间序列，不能参与 `rate()`/`sum()`。它是**序列数据点的附属物**，
只能通过专用 API 与 UI 消费。别写 `exemplar(...)` 这种幻觉查询。

### 4.2 HTTP API（排障/自动化好用）

```bash
curl -G 'http://localhost:9090/api/v1/query_exemplars' \
  --data-urlencode 'query=app_http_request_duration_seconds_bucket' \
  --data-urlencode 'start=2026-11-04T00:00:00Z' \
  --data-urlencode 'end=2026-11-04T23:59:59Z'
```

返回结构（节选）：

```json
{
  "status": "success",
  "data": {
    "seriesLabels": [
      {
        "__name__": "app_http_request_duration_seconds_bucket",
        "le": "1", "service_name": "demo-app", "http_route": "/api/orders"
      }
    ],
    "exemplars": [
      {
        "labels": { "trace_id": "3f9a8c..." },
        "value": "0.87",
        "timestamp": 1793577600.123
      }
    ]
  }
}
```

拿到 `trace_id` 就能直接查 Tempo（`/api/v2/traces/{traceID}`）——一条 curl 完成
"指标→trace"的闭环。

### 4.3 Grafana 三处入口

1. **Timeseries 面板**：开启 Show exemplars，点位叠加在曲线/柱子上；
2. **Explore（Prometheus）**：查询选项勾选 Show exemplars；
3. **Histogram 面板**：直方图视图下 exemplar 更贴合"桶"的语义（Grafana 10+）。

---

## 5. OTel 链路如何透传 exemplar

完整数据流（以 Java 应用 + lab04 栈为例）：

```mermaid
flowchart LR
    A["应用 histogram.record(0.87)<br/>当前 span active"] --> B["SDK ExemplarReservoir<br/>决定是否保留该样本"]
    B -- OTLP --> C["Collector otlp receiver<br/>pdata: metric.exemplars"]
    C --> D["prometheus exporter<br/>enable_open_metrics: true"]
    D -- "pull (OpenMetrics)" --> E["Prometheus<br/>exemplar-storage"]
    E --> F["Grafana Show exemplars<br/>点击 -> Tempo trace"]
```

两个细节：

- **ExemplarReservoir**（SDK 内部）：直方图默认 `AlignedHistogramBucketExemplarReservoir`
  ——**每个桶独立保留一个最新样本**，天然的桶对齐让"1s 桶上的 exemplar"永远代表
  慢请求；简单计数器则是固定大小随机/最新样本池；
- **过滤属性（filtered_attributes）**：exemplar 的标签不必与应用指标同基数——只放
  trace_id/span_id 这类"定位键"，别把 user_id 之类塞进去（它们应该走 trace/span 属性）。

### Collector 上还能"加工"吗？

可以但克制：`filter` processor 可裁剪指标（顺带丢弃其 exemplar）；`transform`/`metricstransform`
重命名/重标签通常保留 exemplar。**聚合类处理器（如 delta→cumulative 转换之外的降采样）
可能破坏 exemplar 语义**——exemplar 描述的是"个体观测"，聚合后的序列配旧 exemplar 就是
张冠李戴。原则：exemplar 链路上少做有损变换。

---

## 6. 版本兼容注意事项

| 组件 | 关键版本 | 说明 |
| --- | --- | --- |
| Prometheus | ≥ 2.26 | exemplar storage 引入（`--enable-feature=exemplar-storage`） |
| Prometheus | ≥ 2.50（scrape_protocols 可配） | 显式控制协商格式；确保 OpenMetrics 在列表内 |
| OpenMetrics | 1.0 | exemplar 语法标准化；旧 0.0.1 草案兼容但建议 1.0 |
| Grafana | ≥ 7.x 支持 UI；10/11 体验完善 | Explore/面板开关 + exemplarTraceIdDestinations |
| OTel Collector | prometheus exporter 的 `enable_open_metrics` 长期存在 | 版本间行为稳定；0.9x 后偶有输出格式微调，升级看 changelog |
| OTel Java SDK | 1.x 全系 | 默认 trace_based filter，开箱即用 |
| OTel .NET SDK | 1.x 全系 | 内置支持 |
| OTel Go SDK | 实验性 | 关注 release notes |
| OTel Python SDK | 写作时未实现 | `OTEL_METRICS_EXEMPLAR_FILTER` 变量遵循规范但无实现 |

三条实践建议：

1. **升级顺序**：先 Prometheus（存储端），再 Collector（格式端），最后动 SDK；
   反过来会出现"上游已产出、下游不识别"的静默丢弃；
2. **验收方法**：升级后 `curl /api/v1/query_exemplars?...` 确认 exemplar 真的在库里，
   不要只看 UI（UI 关闭开关也会显示"没有"）；
3. **多租户/联邦**：exemplar 不参与联邦（federation）转发，跨集群要靠远程查询或
   重复抓取，架构设计时别指望它像 metric 一样被复制。

---

## 7. 价值与限制

### 7.1 价值：排障动线的质变

| 场景 | 没有 exemplar | 有 exemplar |
| --- | --- | --- |
| p99 尖峰 | 猜原因：翻日志、翻 trace 列表碰运气 | 在尖峰时间点直接点 exemplar → 那次慢请求的 trace |
| 灰度对比 | 只能对比聚合曲线 | 新版本桶上的 exemplar 直接展示新版本慢请求样本 |
| 桶边界 bug（桶太粗） | 发现不了 | +Inf 桶上成串 exemplar 一眼看出分布越界 |
| 容量/性能回归 | 关联分析靠时间戳对齐 | 指标与个体证据同点共存，零对齐成本 |

### 7.2 限制（必须心里有数）

| 限制 | 说明 | 对策 |
| --- | --- | --- |
| **存储成本** | 每序列保留最近 N 个（默认上限很小，开启 feature 后由启动参数控制）；exemplar 本身 ~100B 级 | 容量参数显式规划；不要为所有序列开满 |
| **采样而非全集** | ExemplarReservoir 只留部分样本，"点到的"≠"唯一的" | 需要全量证据时下钻日志/trace，exemplar 是入口不是证据库 |
| **PromQL 不可查询** | 不能对 exemplar 做计算/告警 | 它只为"跳转"服务；分析仍用聚合指标 |
| **依赖 trace 采样** | exemplar 携带的 trace_id 可能未被后端采样（head sampling 拒绝） | 高价值路径保证采样率；或采用 tail-based 采样兜底（阶段 5） |
| **抓取间隔敏感** | exemplar 挂在数据点上，抓取间隔内的样本先经 SDK 池子 | 抓取间隔别拉太长（30s~60s 常见） |
| **直方图语义** | 桶边界不当会让 exemplar 失去分辨力（全挤进 +Inf） | 桶边界按业务分布设计（lab04 的 buckets 覆盖 5ms~10s） |

### 7.3 成本估算示例

假设 500 个直方图序列 × 每序列保留 10 个 exemplar × 每条 ~150B ≈ 0.75MB 常驻——
很便宜。真正的成本在于**高基数序列**（每个 label 组合一条序列），基数治理才是前提
（阶段 5 高基数主题）。

---

## 8. 常见坑

| # | 症状 | 根因 | 解法 |
| --- | --- | --- | --- |
| 1 | Grafana 面板没有 exemplar 点 | 四段链路任一断点：SDK 未产出 / collector 未开 open_metrics / Prometheus 未开 feature / 面板未开 Show exemplars | 从底往上验：`/api/v1/query_exemplars` 有没有 → 抓取端点 curl 看格式 → SDK 文档确认支持 |
| 2 | `query_exemplars` 返回空但指标正常 | 存储上限太满（环形缓冲覆盖）或查询窗口不含样本 | 扩大 start/end；检查启动参数容量 |
| 3 | exemplar 点了跳不到 Tempo | `exemplarTraceIdDestinations.name` 与 exemplar 标签名不一致（如 `traceID` vs `trace_id`），或 tempo uid 不对 | 对齐 name=trace_id、uid=tempo |
| 4 | exemplar 一直"最新一个" | SDK reservoir 策略（桶对齐=每桶最新） | 正常现象；想要多样性需 SDK 自定义 reservoir |
| 5 | 升级后 exemplar 消失 | 协商格式被改（scrape_protocols 里丢了 OpenMetrics）或 feature flag 改名 | 按官方 migration notes 核对 |
| 6 | Python 应用怎么配都没有 | Python SDK 未实现（写作时） | 换 Java/.NET 演示，或等实现；链路其余部分保持开启 |
| 7 | exemplar 时间戳和 trace 对不上 | 机器时钟漂移 / 抓取批次延迟 | NTP 校时；trace 查询窗口放宽 |

---

## 9. 面试题小结

**Q1：什么是 exemplar？解决什么问题？**
A：时间序列数据点上附带的"带标签的个体观测样本"（值+时间戳+trace 关联标签），
典型挂在直方图桶上。解决"聚合指标无法定位个体"的问题——从 p99 尖峰一次点击直达
那一次慢请求的 trace。PromQL 不能查询它，只能通过 API/UI 消费。

**Q2：要在 Prometheus + Grafana 栈里启用 exemplar，需要打开哪些开关？**
A：① SDK 产出（Java 默认开）；② Collector prometheus exporter
`enable_open_metrics: true`；③ Prometheus `--enable-feature=exemplar-storage`
（并保证抓取协商 OpenMetrics 格式）；④ Grafana 数据源
`exemplarTraceIdDestinations` 指向 Tempo 且面板开启 Show exemplars。四段缺一不可。

**Q3：exemplar 和把 trace_id 写进指标 label 有什么区别？**
A：label 参与序列切分，trace_id 做 label 等于基数爆炸（每请求一条序列）；
exemplar 不切序列，只是数据点的附属样本，容量受控。这是"个体关联"唯一正确的
指标侧姿势。

**Q4：exemplar 的数量如何控制？存满了怎么办？**
A：SDK 侧由 ExemplarReservoir 决定（直方图默认每桶保留最新一个）；Prometheus 侧
按序列维护环形缓冲，超出上限时最旧的被覆盖。它不是审计数据，丢了不补；需要全量
证据走日志/trace。

**Q5：head-based 采样对 exemplar 有何影响？**
A：exemplar 携带的 trace_id 可能属于未被采样的 trace（点过去查不到 trace）。
缓解：提高关键路径采样率、错误/慢请求走 tail-based 采样回捞（阶段 5 展开）。

---

## 10. 参考资料

- OpenMetrics 规范（Exemplars 章节）：<https://github.com/OpenObservability/OpenMetrics/blob/main/specification/OpenMetrics.md#exemplars>（访问日期：2026-11-04）
- Prometheus exemplars 存储特性开关：<https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage>（访问日期：2026-11-04）
- Prometheus exemplars API：<https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars>（访问日期：2026-11-04）
- OTLP 指标数据模型 Exemplars：<https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars>（访问日期：2026-11-04）
- OTel SDK 指标配置（OTEL_METRICS_EXEMPLAR_FILTER）：<https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#metrics-exemplar>（访问日期：2026-11-04）
- Grafana 配置 Prometheus exemplar 跳转：<https://grafana.com/docs/grafana/latest/datasources/prometheus/configure-prometheus-data-source/#exemplars>（访问日期：2026-11-04）
- OTel Collector prometheus exporter：<https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter>（访问日期：2026-11-04）
- 本工作区相关笔记：[三大支柱关联](correlation.md)、[采样策略（阶段 5）](../05-production/README.md)

---

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 3. 完整启用链路（四段缺一不可） | SDK → Collector → Prometheus → Grafana 四段纵向链路图（带交互协议边标注） | flowchart TD |

### 保留说明

- 2.1 OpenMetrics 文本格式：OpenMetrics 抓取文本的示例输出，属数据样例而非示意图，保留原样。

---

## 11. 工程三陷阱

第 8 节的坑表是"症状速查"，本节把其中最常见的三类失败模式放大成完整故事线，按触发场景、根因、规避三段展开。exemplar 陷阱的共同底色是静默：链路上没有报错、没有告警，只是点永远不出现，于是排查容易在错误的层位反复打转。读这三个故事时建议对照自己环境的链路清单，边读边勾——多数团队读完会发现自己至少踩过其中两个。

### 11.1 陷阱一：下游三段全配好了，SDK 根本没产出

**触发场景**：团队照着 Java 资料把 Collector 的 OpenMetrics 输出、Prometheus 的存储开关、Grafana 的跳转配置三段全部打开，自己的 Python 服务却始终没有 exemplar 点。排查在下游三层反复折腾两天，每一层单独看都"配置正确"。

**根因**：exemplar 的产出在 SDK 侧，而各语言的支持进度参差不齐——写作本文时 Python 尚未实现、Go 属实验性。下游配置再正确，上游没有数据可运就是没有；语言支持矩阵是整条链路的第一个检查项，却最容易被跳过，因为大家默认"SDK 当然支持"。

**规避**：验证顺序永远从最上游开始。把 Collector 的 prometheus exporter 暴露端点直接抓下来看 OpenMetrics 文本，目标桶序列的行尾有没有井号引出的花括号片段；没有就停止动下游，先确认语言实现进度与 `OTEL_METRICS_EXEMPLAR_FILTER` 环境变量在该语言里是否真实生效。演示与培训也要选已实现的语言栈，避免听众把"没点亮"误学成"配置错了"。

### 11.2 陷阱二：中间一跳的有损变换把 exemplar 洗掉

**触发场景**：指标在 Collector 里经过了一层聚合或降采样处理，或者应用把指标先推给了一个只支持纯指标的推送组件，之后 exemplar 全部消失，而指标本身完好无损。

**根因**：exemplar 依附于具体的数据点，描述的是"个体观测"。聚合产生的新序列与原个体不再一一对应，任何负责任的处理器的正确做法都是丢弃 exemplar 而不是把它们错误地挂到新序列上——张冠李戴比没有更糟。这类丢弃不产生任何日志或告警，链路审计缺位时无人察觉。

**规避**：给 exemplar 链路做一次显式的"链路审计"：从应用到后端列出每一跳组件，逐个确认是否透传 exemplar，形成一张链路清单；原则是 exemplar 链路上少做有损变换，确需变换时书面接受 exemplar 消失的后果。第 5 节末尾的处理器的行为差异，就是这张审计清单的原始素材。审计清单本身也要进版本管理，组件升级时同步复核，与第 6 节的升级顺序建议绑定执行。

### 11.4 三类失败的共同教训

三类失败串起来读，结论值得写在墙上：exemplar 是"搭便车"的数据，它自己从不发声，任何一段链路出问题都以"没有"为唯一症状。所以纪律的重点不是"出了错怎么修"，而是"接入与变更时怎么验"——每次改动指标链路上的组件，都重跑一遍第 12 节的六步走查，两分钟的确定性换来的是整条排障动线的可用性，性价比极高。

### 11.3 陷阱三：点得过去，trace 却查不到

**触发场景**：面板上 exemplar 点位正常，点击跳转后端后却提示找不到 trace。偶尔又能查到，时好时坏，规律难寻。

**根因**：exemplar 携带的 trace 标识是埋点瞬间记录的，这条 trace 事后是否被保留取决于采样决定：上游 head 采样直接拒绝的 trace，任何下游都无从恢复；采样决策与指标导出之间还存在时间差，配合机器时钟漂移与抓取批次延迟，查询窗口稍紧就会扑空。"时好时坏"往往就是采样率与窗口宽窄的叠加效果。

**规避**：把"exemplar 可跳转率"当作采样策略的验收指标——高价值路径提高采样比例，错误与慢请求用尾采样兜底（见 [sampling](../05-production/sampling.md)）；排障时把 trace 查询窗口放宽几分钟，容忍时钟与批次延迟；集群间做 NTP 校时，把时钟漂移这一变量先钉死。另外，采样率决策与 exemplar 可达性应写进同一份容量评审文档：采样率每调整一次，可跳转率的预期就跟着变，两个数字必须在同一处维护，否则半年后没人说得清"为什么点不到"究竟是配置问题还是策略问题。

## 12. 手算走查配方：exemplar 关联查询端到端走查

以 lab04 栈为例，把一条 exemplar 从诞生到点击的全链路走一遍，每一步都写清"成功长什么样"与"失败长什么样"，走完即可当作新环境的验收流程。走查的价值在于把"四段缺一不可"从口号变成肌肉记忆：四段中任何一段的失败形态都不止一种，只背配置项会在真实环境里失效；把每步的两种形态都见过一遍，现场排查就只剩下对号入座。

第一步，应用侧产出。Java 应用在活跃 span 内记录一次直方图观测，值 0.87 秒；桶对齐的样本池会把该观测保留在对应桶（一秒桶）上，并附带当前上下文的 trace 标识（示意值 3f9a8c 开头）。成功标志：SDK 导出的 OTLP 指标数据点带有 exemplars 数组。失败形态：数据点干净利落没有任何附加样本——回到语言支持矩阵与过滤器配置。

第二步，Collector 转格式。otlp receiver 收下指标，prometheus exporter 以 OpenMetrics 格式暴露在 8889 端口。验证方法：用 curl 抓取该端点，目标桶序列的行尾应出现井号加花括号的 trace 关联片段。这一步同时是陷阱一的判定点：抓下来的文本干净，说明问题在更上游，不必再看 Prometheus。

第三步，Prometheus 收库。抓取配置对该端点协商出 OpenMetrics 格式，启动参数已打开 exemplar 存储特性。验证：调用查询 exemplar 的专用接口，带上足够宽的时间窗，返回结构里应能看到标签中的 trace 标识与 0.87 这个值。失败形态：指标查询正常而 exemplar 查询为空——检查特性开关与抓取协议协商两个点。

第四步，顺带算一遍容量预算。设五百个直方图序列、每序列保留十个 exemplar、每条约一百五十字节：五百乘十乘一百五十等于七十五万字节，约合零点七五兆，与第 7.3 节的估算一致。若实际占用偏差几个数量级，先查序列基数是否失控，而不是怀疑 exemplar 本身贵——基数才是成本大头。

第五步，Grafana 呈现与点击闭环。数据源配置跳转目的地，name 字段与 exemplar 标签名逐字符一致（这里都是 trace_id），目标实例的 uid 指向 Tempo；面板开启 Show exemplars 后，曲线上出现高亮点。最终验证是点击：跳转后能打开对应瀑布图，才算端到端闭环。配置细节见 `https://grafana.com/docs/grafana/latest/datasources/prometheus/configure-prometheus-data-source/` 的 exemplars 小节。

第六步，自验回退顺序。中间任何一步失败，按"上游先于下游"回退排查：SDK 产出、Collector 格式、Prometheus 存储、Grafana 配置，四段各验一次，不跳段、不并行猜。把这套六步流程写进团队的接入文档，新环境接入 exemplar 就从"玄学点亮"变成"按表验收"。

### 12.7 时间戳换算的自验走查

第 2.1 节示例里 exemplar 的时间戳是 1520879607.789，这种 epoch 秒值在排查时经常需要换算成可读时间，顺手做一次完整的除法走查。取整数部分除以 86400（每天的秒数）：1520879607 除以 86400，商 17602 余 66807。商是天数：已知 2018 年 1 月 1 日是 epoch 后第 17532 天，17602 减 17532 等于 70；1 月走 31 天、2 月走 28 天，累计 59 天，剩下 11 天落在 3 月，于是得到 3 月 12 日。再看余数：66807 秒除以 3600，商 18 余 2007，即 18 时；2007 秒等于 33 分 27 秒。合起来就是协调世界时 2018 年 3 月 12 日 18 时 33 分 27.789 秒。自验：17602 乘 86400 等于 1520812800，加回 66807 恰好等于原值；两轮除法的余数均小于除数，拆分无误。这项小技能在"exemplar 时间与 trace 时间对不上"一类问题里特别好用：先把两边时间都摊开到秒级再谈漂移与延迟，避免在"看起来差了几个小时"的模糊表述里空转。顺带记住抓取间隔与样本保留的算术关系：抓取间隔三十秒、样本池每桶保留一条时，一条 exemplar 在桶上的最长存留约为间隔乘以保留条数，据此可以估算点位按预期速度滚动更新。

### 12.8 点击结果与证据边界的走查

拿到一条 exemplar 并点开 trace 之后，走查其实还没结束：要分清"看到的"与"全部的"之间的关系。样本池每桶只保留最新一个观测，抓取间隔三十秒意味着同一桶在两次抓取之间产生的所有样本里最多只有一条存留——所以"这条 trace 慢"能证明该桶确实存在慢样本，却不能推出任何"慢请求占比"的比例结论。比例与分布的结论必须回到聚合指标本身，个体 trace 只负责回答"慢在哪一跳、为什么慢"。判断口诀一句话：exemplar 管"有没有、长什么样"，指标管"有多少、占几成"。把这条证据边界写进团队的分析模板，能避免大量"以点代面"的错误结论，这也是第 7.2 节"采样而非全集"限制在操作层面的落点。

## 13. 排查速查表

| 现象 | 可能原因 | 处置 |
| --- | --- | --- |
| 面板始终无点位 | 四段链路任一断点，最常见是 SDK 未产出 | 从抓 exporter 端点开始逐段向上游验证 |
| 专用接口返回空但指标正常 | 查询窗口不含样本或存储容量翻页 | 拉宽时间窗；核对容量相关启动参数 |
| 点击跳转失败或跳错 | 跳转配置的 name 与标签名不一致、uid 不对 | 逐字符比对 trace_id 与目标数据源 uid |
| 只有大桶上有点位 | 桶边界过粗，观测全落最后一个桶 | 按第 7.2 节重设桶边界覆盖业务分布 |
| 点位时有时无 | 样本池只保留最新样本，属预期行为 | 需要多样性需自定义样本池策略 |
| 升级后点位消失 | 抓取协议列表丢失 OpenMetrics 或开关改名 | 核对抓取协议配置与特性开关迁移说明 |
| 跨集群查不到 | exemplar 不参与联邦转发 | 用远程查询或重复抓取重新设计链路 |

使用要领：先定位"链路哪一段断了"，再对照第 8 节的坑表找具体根因；本表负责缩小范围，坑表负责定性，两表配合的命中率远高于单表硬猜。给值班同学的建议是把本表与第 8 节合并进值班手册的指标页签，exemplar 类工单的定位时间通常能从小时级降到十分钟级，因为它把"先猜组件"变成了"先查段位"。

## 14. Code Review 检查单

涉及指标埋点与 exemplar 链路的改动，评审时按序过一遍：

- [ ] 直方图桶边界覆盖业务真实分布，最大桶不是唯一有样本的桶
- [ ] 指标标签白名单里没有 trace 标识、用户标识等高基数键
- [ ] exemplar 标签只放 trace_id、span_id 定位键，无业务敏感值
- [ ] Collector 的 prometheus exporter 显式开启 OpenMetrics 输出
- [ ] Prometheus 启动参数含 exemplar 存储开关，容量参数显式设置而非依赖默认
- [ ] Grafana 数据源跳转配置的 name 与实际 exemplar 标签名逐字符一致
- [ ] 新面板默认开启 Show exemplars，验收走专用接口而非只看界面
- [ ] 指标链路新增的处理器件不做聚合类变换，或已书面接受 exemplar 丢失
- [ ] 高价值路径的采样策略能保证 exemplar 点击可达，纳入采样验收指标
- [ ] 演示与培训使用已实现 exemplar 的语言栈，避免传播错误预期

这份清单与第 12 节的六步走查是一体两面：清单管"别把链路改坏"，走查管"确认链路是好的"。评审通过之后，建议当天在预发环境重跑一次走查，两张网先后收拢，exemplar 链路就能长期保持在"随时可点"的状态——这也是三支柱关联实验想要沉淀的最终形态。

延伸阅读：指标与 trace 关联的总体思路见 [correlation.md](./correlation.md)；上下文与 span 产出的 SDK 细节见 [otel-sdk](../03-tracing/otel-sdk.md)；把整条链路亲手点亮见 [lab04](../../labs/lab04-three-pillars/README.md)。
