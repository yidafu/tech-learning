---
sidebar_position: 8
---

# 8. 指标长期存储与水平扩展：Thanos / VictoriaMetrics / Mimir

> 单机 Prometheus 有三个天花板：**保留期**（本地盘放不下 13 个月）、**高可用**
> （一个实例挂了查询就断）、**全局视图**（100 个实例 = 100 个孤岛 TSDB，跨集群查不了）。
> 本篇讲主流的三条突破路线：**Thanos**（Sidecar 复用对象存储）、**VictoriaMetrics**
> （重写存储引擎，单二进制）、**Mimir**（Grafana 的多租户集群方案），
> 以及贯穿三者的公共机制：remote write、降采样、去重与多租户。
> 前置：[prometheus-architecture.md](prometheus-architecture.md)、[cardinality.md](../05-production/cardinality.md)。

## 目录

1. [问题定义：单机 Prometheus 的三个天花板](#1-问题定义单机-prometheus-的三个天花板)
2. [公共机制一：remote write 与外部标签](#2-公共机制一remote-write-与外部标签)
3. [Thanos：Sidecar 模式的鼻祖](#3-thanossidecar-模式的鼻祖)
4. [VictoriaMetrics：换个引擎的路线](#4-victoriametrics换个引擎的路线)
5. [Mimir（Cortex）：Grafana 的集群化路线](#5-mimircortexgrafana-的集群化路线)
6. [三方对比与选型决策树](#6-三方对比与选型决策树)
7. [降采样：成本与精度的交易](#7-降采样成本与精度的交易)
8. [常见坑](#8-常见坑)
9. [面试题小结](#9-面试题小结)
10. [参考资料](#10-参考资料)

---

## 1. 问题定义：单机 Prometheus 的三个天花板

| 天花板 | 表现 | 规模触发点 |
|---|---|---|
| **保留期** | 本地 TSDB 一般留 15~30 天，审计/年报/容量规划需要 1 年+ | 监控是"只增"数据，100 万 series × 15s 间隔 ≈ 每天 57.6 亿样本（10⁶ ÷ 15 × 86400 ≈ 5.76×10⁹） |
| **高可用** | 官方明确不做 Prometheus 自身集群；双跑两个相同实例又带来两倍查询目标 | 任何把监控用于"值班呼叫"的团队（监控自己不能是单点） |
| **全局视图** | 每个 Prometheus 只看自己 scrape 的目标；跨集群/跨实例聚合（`sum` 全公司 QPS）做不到 | 第 2 个集群出现的那天 |

三条路线的本质差异在于**"把哪一层搬到对象存储/集群"**：

```
Thanos      ：Prometheus 原封不动，把"已落盘的 block"搬对象存储，查询层做全局聚合
VictoriaMetrics：扔掉 Prometheus 的存储与查询层，换一个更高压缩的引擎（采集端不变）
Mimir       ：把 Prometheus 的 TSDB 内存块搬进集群组件（ingester），对象存储兜底
```
<!-- 保留原图：三条路线的文字对照清单（无箭头/框线结构），非示意图 -->

## 2. 公共机制一：remote write 与外部标签

三条路线里 Thanos(Receive)/VM/Mimir 都吃 Prometheus 的 **remote write** 协议
（HTTP + snappy 压缩的 protobuf 时序写请求），这是 Prometheus 官方的标准出口：

```yaml
# prometheus.yml
global:
  external_labels:
    cluster: prod-a          # ★ 关键：双跑实例必须用 external_labels 区分（cluster+replica）
    replica: "$(POD_NAME)"
remote_write:
  - url: http://vminsert:8480/insert/0/prometheus/api/v1/write
    queue_config:
      max_shards: 30           # 并行分片数（吞吐上限）
      capacity: 10000          # 队列缓冲
      max_samples_per_second: 0
    write_relabel_configs:     # 出口裁剪：不上报的指标根本不离开本机
      - source_labels: [__name__]
        regex: 'go_.*'
        action: drop
```

三条经验：

1. **`external_labels` 是长期存储的身份系统**：少了 `replica` 标签，双跑去重无从谈起；
   少了 `cluster`，全局聚合的分组维度就丢了。第一天就要定好命名规范（与
   [cardinality.md](../05-production/cardinality.md) 的治理一脉相承）；
2. **`write_relabel_configs` 是第一道成本闸门**：`go_.*`/`process_.*` 这类对全局无用
   的指标在出口就 drop，比在存储端丢弃便宜一个数量级；
3. remote write 是**异步队列**：下游故障时样本在内存队列堆积，堆满后**丢弃最旧样本**
   ——监控自身要有 `prometheus_remote_storage_samples_pending` / `dropped` 告警。

## 3. Thanos：Sidecar 模式的鼻祖

### 3.1 架构与组件

```mermaid
flowchart LR
    PA["Prometheus A（replica=a）─ Sidecar"] -->|"2h block 上传"| OS["对象存储（S3）"]
    PB["Prometheus B（replica=b）─ Sidecar"] -->|"2h block 上传"| OS
    CP["Compactor（降采样）"] --> OS
    OS --> SGW["Store Gateway<br/>（读对象存储里的历史 block）"]
    GF["Grafana"] --> Q["Thanos Query"]
    Q --> SAPI["StoreAPI"]
    SAPI -->|"实时数据，Sidecar 代理"| PA
    SAPI -->|"实时数据，Sidecar 代理"| PB
    SAPI --> SGW
    SAPI --> RC["Receive<br/>（可选：接收 remote write 的实时数据）"]
    Q --> QF["Query Frontend<br/>（缓存/时间分片，Grafana 指向它）"]
```

| 组件 | 职责 | 一句话 |
|---|---|---|
| **Sidecar** | 与 Prometheus 同 Pod，把 TSDB 每 2h 的 block 上传对象存储 | "Prometheus 不动，历史搬走" |
| **Query / Query Frontend** | 全局 PromQL 引擎：聚合多个 StoreAPI、去重、缓存 | Grafana 的真正数据源 |
| **Store Gateway** | 把对象存储里的历史 block 以 StoreAPI 暴露出来 | 冷数据的门卫 |
| **Compactor** | block 合并 + 降采样（5m/1h） | 存储账单的调节阀 |
| **Receive**（可选） | 接收 remote write，写自己的 TSDB 再上传 | 推模式（vs Sidecar 拉模式） |

### 3.2 两种 HA 形态（经典面试题）

| | Sidecar 模式（默认） | Receive 模式 |
|---|---|---|
| 数据到达路径 | 双 Prometheus 各自 scrape → 各自上传 block | Prometheus remote write → **单个** Receive（分片集群） |
| 去重 | Query 开 `deduplication`，按 `replica` 外部标签取一份 | 不需要（数据只有一份），但 Receive 成为新组件 |
| 复杂度 | 低（无状态 Sidecar） | 高（Receive 是有状态、要扩缩容） |
| 适用 | 大多数场景 | 边缘集群网络差、或要做"写路径多租户" |

**去重的正确理解**：`replica=a/b` 双跑时对象存储里有两份几乎相同的 block，
Query 的 dedup 是**查询时**按去重窗口取样本，不是物理删除——存储成本仍是 ×2
（这就是有人用 `--deduplication.func=penalty` 等精细化参数省存储的原因，慎用）。

## 4. VictoriaMetrics：换个引擎的路线

### 4.1 单机版与集群版

```mermaid
flowchart LR
    subgraph SG1["单机版（一个二进制，最省心的形态）"]
        A1["vmagent<br/>（可选：采集/remote_write 接收）"] --> B1["vmsingle"] --> C1["Grafana（VM 数据源）"]
    end
    subgraph SG2["集群版"]
        A2["vmagent ×N"] --> B2["vminsert ×N"] --> C2["vmstorage ×N（有状态）"]
        D2["vmselect ×N"] --> C2
        E2["Grafana"] --> D2
        C2 --> F2["vmalert（规则评估） + vmauth（鉴权/路由）"]
    end
```

### 4.2 为什么流行：三个工程判断

1. **压缩率与写吞吐**：自研存储引擎对高基数写入做了大量优化，官方基准称平均
   每样本 ~0.4 字节级（Prometheus TSDB 通常 1~2 字节级）——**同样的对象存储预算能放
   2~5 倍的样本量**（以自己数据实测为准，但方向性结论稳定）；
2. **MetricsQL**：兼容绝大多数 PromQL，额外提供生产高频函数
   （`rollup_rate`、`histogram_quantile` 高效实现、`keep_metric_names` 等），
   以及更宽松的 `+Inf`/`-Inf` 处理；迁移成本主要是边缘语法；
3. **运维单元少**：单机版一个进程搞定采集接收存储查询告警，小团队从单机版起步，
   长大后再拆集群版，**数据模型与 API 不变**。

内置能力（对应 Thanos 要拼装的件）：retention 精确到月（如 `-retentionPeriod=25m`）、
按保留期自动降采样、多租户（URL 路径 `/insert/<tenant>/prometheus/...`）、
`/api/v1/status/tsdb` 风格的基数自检。

### 4.3 注意事项

- **兼容是"高度"而非"完全"**：个别 PromQL 细节（边界函数、某些 `absent` 语义）有差异，
  迁移时把现有 dashboard 与告警规则在 VM 上全量回归一遍；
- vmagent 的 stream aggregation（预聚合降基数）等高级特性部分在 Enterprise 版，
  开源版规划时确认功能边界；
- 生态位：VM 是"Loki 之前 Grafana 生态外"的成功者，Grafana 数据源与 kube-prometheus
  社区 helm chart 都有良好支持，但**若团队已全面 Grafana OSS，Mimir 的整合体验更顺**。

## 5. Mimir（Cortex）：Grafana 的集群化路线

Mimir 是 Grafana 2022 年在 Cortex（社区多租户 Prometheus 后端）基础上的继任项目，
架构与 Loki 同族（ring/memberlist/对象存储/SSM→微服务），读一遍 [loki-operations.md §1](../02-logging/loki-operations.md#1-部署模式单二进制--读写分离--微服务) 会发现是同一套思维：

```mermaid
flowchart LR
    RW["remote_write"] --> DIS["distributor"] --> ING["ingester（内存 TSDB 块）"] -->|"flush"| OSB["对象存储（block）"]
    GRA["Grafana"] --> QFE["query-frontend"] --> QU["querier"]
    QU -->|"热数据"| ING
    QU --> SGW["store-gateway（对象存储冷数据）"]
    OSB --> SGW
    AUX["compactor（合并/降采样）· ruler（规则）· alertmanager（可选内嵌）"]
```

特点：

- **写路径换 ingester**：不像 Thanos Sidecar 依赖 Prometheus 本地 TSDB，
  Mimir 自己管理数据（ingester 攒块 flush 对象存储）——**Prometheus 可以退化为
  纯采集器（agent mode）甚至被 vmagent/OTel Collector 替代**；
- **多租户是一等公民**（`X-Scope-OrgID`，与 Loki 一致），大组织/SaaS 场景的默认答案；
- 与 Grafana 生态深度协同（与 Loki/Tempo 同一套运维心智、LTS 版本承诺）。

代价：组件最多、运维面最大，**中小团队直接上 Mimir 通常是过度设计**。

## 6. 三方对比与选型决策树

| 维度 | Thanos | VictoriaMetrics | Mimir |
|---|---|---|---|
| 核心思路 | 复用 Prometheus 本地数据 + 对象存储 | 重写引擎，替代存储+查询 | 集群化重写（Cortex 系） |
| Prometheus 角色 | 保持完整（含本地 TSDB） | 可降级为纯采集器 | 可降级为纯采集器 |
| 部署最小集 | Sidecar+Query+StoreGW | **单进程**（vmsingle） | distributor+ingester+querier+... |
| 多租户 | 弱（靠分集群） | URL 租户（简单） | 强（一等公民） |
| 全局查询去重 | ★ 查询时 dedup（学这个概念） | 无需（单写路径） | 无需（单写路径） |
| 降采样 | Compactor 显式 | 按保留期内置 | Compactor 内置 |
| PromQL 兼容 | 100%（就是 Prometheus 引擎） | 高度（MetricsQL 增益） | 高度 |
| 存储/压缩 | 对象存储 ×2（双跑副本） | 同预算更多样本 | 对象存储 |
| 适合 | 已重投资 Prometheus、要保留 scrape 语义 | 小→大平滑、成本敏感、少运维 | 多租户/全 Grafana OSS 栈 |

选型决策（经验版）：

```mermaid
flowchart TD
    Q1{"单 Prometheus 15 天够用吗？"} -->|"够"| R1["什么都不用上（别过度设计）"]
    Q1 -->|"不够"| Q2{"只有“保留期”痛点，团队小（&lt;3 人运维）？"}
    Q2 --> R2["VM 单机版（最低成本起步）"]
    Q2 -->|"还有 HA / 全局查询"| Q3{"两个以内集群、能接受查询时去重？"}
    Q3 --> R3["Thanos Sidecar（双跑 + Query）"]
    Q3 -->|"多租户 / SaaS / 全家桶 Grafana OSS"| R4["Mimir（或 Grafana Cloud）"]
    Q3 -->|"成本与吞吐是第一矛盾，且愿意换引擎"| R5["VM 集群版"]
```

## 7. 降采样：成本与精度的交易

长期存储省钱的终极手段是**用低精度换存储**（ Thanos Compactor / VM 自动降采样）：

- 原始 15s 样本 → 保留 30~90 天；聚合为 5m 样本 → 保留 1 年；1h → 更久；
- counter 类指标降采样为 `rate` 结果（`max_over_time`/`sum` 等聚合策略依配置），
  **降采样后的数据不能再算 `rate()`**（已经是导数），只能画趋势——所以"最近 30 天走原始、
  年报走 5m"的路由要在 Query Frontend/查询习惯里体现；
- **有损且不可逆**：降采样跑过之后原始明细没了（该周期内）。审计/计费类指标要明确
  排除在降采样之外（Thanos `-- Downsampling.disable` 全局关 / 或对特定 bucket 策略）。

一句话：**降采样解决的是"看一年前的图"，不是"精确复现一年前的每个点"**。

## 8. 常见坑

1. **双跑忘了 `replica` 外部标签**：Thanos Query 收到两份无法区分的数据，
   dedup 失效、面板数值×2，且混入存储后不可洗（只能靠时间淘汰）；
2. **对象存储 bucket 混用**：Thanos/Tempo/Loki 各自的 bucket 分开，retention 与
   lifecycle 策略不同，混在一个 bucket 里用前缀区分是排障噩梦；
3. **remote write 队列堆积无告警**：下游存储慢时 Prometheus 静默丢最旧样本，
   `prometheus_remote_storage_samples_dropped_total` 必须告警；
4. **把降采样数据当原始数据用**：一年前的 `rate()` 突然返回空/异常——是降采样粒度
   不支持，不是数据丢了；
5. **高基数照搬进长期存储**：本地 15 天能扛的基数，×25 的保留期后账单/磁盘×25。
   长期存储上线前先做 [基数治理](../05-production/cardinality.md)；
6. **VM 迁移只测大盘不测告警**：MetricsQL 边缘差异最先炸的是告警规则里的表达式，
   迁移回归清单里告警规则优先级最高；
7. **Thanos Receive 与 Sidecar 混用同一份数据**：两条路径写同一租户导致重复样本
   （两种模式是替代关系，不是叠加）。

## 9. 面试题小结

**Q1：单机 Prometheus 的局限，以及三种主流扩展路线？**
A：保留期/高可用/全局查询三个天花板。Thanos：Prometheus 不动，block 上传对象存储 +
查询层聚合去重；VictoriaMetrics：替换存储与查询引擎（高压缩、单二进制起步）；
Mimir：集群化重写（ingester 攒块 flush 对象存储，多租户一等公民）。

**Q2：Thanos 的两种 HA 模式及去重机制？**
A：Sidecar 模式双跑 Prometheus（相同 scrape、不同 `replica` 外部标签），Query 查询时
按标签去重；Receive 模式收 remote write 单份写入（无重复但引入有状态组件）。
去重是查询时语义，存储成本仍是双份。

**Q3：external_labels 为什么是长期存储的第一配置？**
A：它是数据的身份系统：`cluster` 提供全局聚合分组维度，`replica` 是去重键。
缺失或命名不一致会直接导致重复计数与无法下钻，且错误数据会长期留存。

**Q4：VictoriaMetrics 相比 Prometheus 存储的核心卖点与风险？**
A：卖点：更高压缩（同预算更多样本）、单二进制低运维、MetricsQL 生产函数增强、
内置多租户/降采样。风险：PromQL 兼容是高度而非完全，迁移要全量回归告警规则与面板。

**Q5：降采样的收益与代价？**
A：收益：长期保留的成本降一个数量级。代价：有损不可逆——counter 变成聚合值后
不能再 `rate()`，审计/计费类数据要排除在降采样外；"精确复现历史每个点"的需求
只能靠保留原始粒度。

**Q6：remote write 的可靠性语义？丢了怎么发现？**
A：异步队列、at-least-once 方向（下游故障时堆内存队列，满了丢最旧）。
监控 `prometheus_remote_storage_samples_pending/dropped_total` 与 shard 饱和度，
配合 `write_relabel_configs` 在出口裁剪无用指标降低队列压力。

**Q7：什么时候不该上这三件套？**
A：单 Prometheus + 本地 15 天已满足需求时（成本与运维复杂度不划算）；
或需求只是"偶尔查半年前的数据"（对象存储 + vmctl/importer 做批量冷归档更轻）。

## 10. 参考资料

- Thanos 官方文档（架构/组件）：<https://thanos.io/tip/thanos/design.md/>（访问日期：2026-11-04）
- Prometheus remote write 配置：<https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write>（访问日期：2026-11-04）
- VictoriaMetrics 官方文档（单机/集群/MetricsQL）：<https://docs.victoriametrics.com/>（访问日期：2026-11-04）
- Mimir 官方文档（架构/多租户）：<https://grafana.com/docs/mimir/latest/>（访问日期：2026-11-04）
- Thanos 与 VictoriaMetrics 对比（社区视角）：<https://thanos.io/tip/thanos/comparison.md/>（访问日期：2026-11-04）
- 本工作区相关笔记：[prometheus-architecture.md](prometheus-architecture.md)、[cardinality.md](../05-production/cardinality.md)、[loki-operations.md](../02-logging/loki-operations.md)

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 3.1 架构与组件 | Thanos 双副本 Sidecar 上传 block、Query 经 StoreAPI 聚合实时/历史数据的架构 | flowchart LR |
| 4.1 单机版与集群版 | VictoriaMetrics 单机版与集群版组件数据流 | flowchart LR（双 subgraph） |
| 5. Mimir（Cortex） | Mimir 写路径（distributor→ingester→对象存储）与读路径（querier 双源） | flowchart LR |
| 6. 三方对比与选型决策树 | 长期存储方案选型的决策流程 | flowchart TD |

### 保留说明

| 位置 | 内容 | 保留原因 |
| --- | --- | --- |
| 1. 问题定义 | Thanos/VM/Mimir 三条路线的文字对照 | 平铺文字清单（无箭头/框线结构），非示意图 |

### 收尾一句话（增补）

长期存储选型的全部分歧，都是"时间序列三要素——时间戳、标签集、值——怎么落到存储引擎的物理结构上"的不同答案；把三要素的访问模式写清楚，引擎选型只剩查表。

## 11. 工程三陷阱：身份后补、Compactor 双跑、双层闸门打架

### 陷阱一：external_labels 事后补配，历史 block 成了无身份数据

- **触发场景**：单实例跑三个月后扩第二实例，此时才补 `external_labels`（cluster 与 replica）——新 block 有身份，老三个月的 block 元数据里没有这些标签；Thanos Query 同时读到两种代际的数据，去重对老数据不生效，跨集群聚合的分组维度也缺了一角。
- **根因**：external_labels 在 block 生成时被固化进元数据，Prometheus 不会回写历史 block；事后修正需要离线改写 block 元数据的工具（见 `thanos.io` 文档的 tools 部分），有操作风险且不能在线做。
- **规避**：第一天就配 external_labels，哪怕当时只有一个实例；确要给历史数据补身份，先在测试 bucket 演练元数据改写，验证 Query 行为后再动生产；例行用 Query 检查重复序列与标签完整性，把它加进上线检查单。

### 陷阱二：Compactor 跑了两份，对象存储里出现重叠 block

- **触发场景**：为了"高可用"给 Compactor 也部署了两个副本；几天后查询开始报重复样本冲突，部分面板变慢甚至报错。
- **根因**：Compactor 是对同一 bucket 的**单写者**组件，负责 block 合并与降采样；并发运行会写出时间范围重叠的 block，查询层无法消歧。它的故障安全设计是遇到异常就暂停（halted），暂停后合并任务积压，问题进一步放大。
- **规避**：Compactor 实例数固定为 1，用部署编排保证全局唯一；对 Compactor 的存活与 halted 状态配置告警（指标口径以 `thanos.io` 文档为准）；已出现重叠 block 时按官方运维手册处理，不要手工删对象。

### 陷阱三：引擎 retention 与对象存储 lifecycle 两层闸门打架

- **触发场景**：引擎配了 90 天保留，云上 bucket 的 lifecycle 规则却按团队"统一 30 天清理"的惯例删除对象——30 到 90 天之间的数据被基础设施静默删掉，面板出现凭空缺段，且没有任何组件报错。
- **根因**：数据寿命由两层闸门的**交集**决定：引擎侧 retention 与对象存储 lifecycle 各自独立生效，后者的删除不经过引擎记账，天然是静默的。
- **规避**：唯一权威的保留策略写在引擎侧；对象存储 lifecycle 只做兜底且时长必须不小于引擎保留值；定期抽查"最旧可查时间戳"（挑一个老指标画一年图）；共享云账号时 lifecycle 规则按 bucket 前缀隔离并纳入评审（与第 8 节的 bucket 混用坑同源）。

## 12. 手算配方：保留期与降采样的空间估算

预算谈判需要一张"多少 GB"的估算表。五步算清（系数为工程粗估，**务必以自家数据实测校准**，压缩率与序列 churn 强相关）：

1. **数清样本产出**：设治理后活跃序列 50 万条、抓取间隔 15s，每序列每天样本 = 86,400 ÷ 15 = 5,760；全局每天 = 500,000 × 5,760 = 2.88×10⁹ 样本。
2. **换算字节**：按每样本压缩后 2 字节粗估（TSDB 量级的保守口径）：2.88×10⁹ × 2 B = 5.76 GB/天。
3. **原始层保留 90 天**：5.76 × 90 = 518.4 GB；Sidecar 双跑副本 ×2 ≈ 1.04 TB。对照"不降采样直接保一年"：5.76 × 365 = 2,102.4 GB——这就是保留期天花板的直接成本。
4. **降采样层**：5m 粒度每序列每天 = 86,400 ÷ 300 = 288 样本，全局 50 万 × 288 = 1.44×10⁸ 样本/天 → 0.288 GB/天 → 一年 ≈ 105.1 GB；1h 粒度每序列每天 24 样本 → 0.024 GB/天 → 三年 ≈ 26.3 GB。注意降采样 block 每序列还带 min/max/count 等汇总字段，真实占用比纯样本估算高，按 2~3 倍留余量（示意系数）。
5. **合计与对比**：518.4 + 105.1 + 26.3 ≈ 649.8 GB（单副本口径），约为全原始保一年（2,102.4 GB）的 31%——分层保留加降采样省下约 69%，还把查询视野从一年扩到三年。

**算术自验**：86,400 ÷ 15 = 5,760；50 万 × 5,760 = 2.88×10⁹；5.76 × 90 = 518.4；86,400 ÷ 300 = 288；0.288 × 365 = 105.12；0.024 × 1,095 = 26.28；649.8 ÷ 2,102.4 ≈ 0.309。每一步都可以口算复核。

**第 6 步（规划口径）：加上副本与增长余量。** 前五步算出的是单副本"存了多少"，预算要报的是"要买多少"：Sidecar 双跑天然双份数据，×2 得约 1,299.6 GB；再留 30% 的增长与运维余量（新服务接入、基数缓涨，示意系数）约 1,689.5 GB，也就是 1.69 TB。报数时把"存量估算"与"采购口径"分开说，评审的人才不会拿 649.8 GB 去质疑 1.69 TB 的账单——两个数字回答的是两个问题。

**两个前置推论**：其一，基数翻倍整张表翻倍——未治理的 200 万序列（4 倍）会把上面所有数字乘四，预算谈判当场翻车，所以长期存储上线前先做 [基数治理](../05-production/cardinality.md)；其二，审计与计费类指标明确排除在降采样外（第 7 节的不可逆性），它们的"全原始保留"成本要在预算表里单列一行。

## 13. 决策速查表

**方案选型**（把第 6 节决策树压成查表版）：

| 你的处境 | 结论 |
| --- | --- |
| 单实例本地保留已够用 | 什么都不上，警惕过度设计 |
| 只缺长保留、运维 3 人以内 | VM 单机版起步，长大换集群版（接口不变） |
| 双跑 HA 加全局视图，已重投 Prometheus | Thanos Sidecar 加 Query |
| 多租户、SaaS、全 Grafana OSS 栈 | Mimir 或托管服务 |
| 边缘集群带宽差、要集中存储 | Thanos Receive 或 agent 推送路线 |
| 只是偶尔查半年前的数据 | 批量冷归档工具更轻，别为低频需求养集群 |

**参数基线**（示意起点，逐项按实测调整）：

| 参数 | 起点 | 依据 |
| --- | --- | --- |
| 本地 retention | 15 天以内（本地只是热层） | 长期数据在对象存储 |
| 原始粒度保留 | 30~90 天 | 覆盖排障与月度复盘 |
| 5m 降采样保留 | 1 年 | 季度与年度趋势 |
| 1h 降采样保留 | 3 年以上 | 年报与容量规划 |
| remote_write 队列参数 | 从默认起步，按 pending 指标扩 | 盲调分片数会放大抖动 |
| write_relabel | 出口 drop 全局无用的 go_ 与 process_ 族 | 出口裁剪最便宜 |
| Compactor 实例数 | 1（全局单写者） | 重叠 block 无法自动修复 |
| bucket 规划 | 各组件独立 bucket | lifecycle 与权限按组件隔离 |

**升级触发器**：出现跨集群聚合需求、保留需求突破本地盘、或监控被写进值班承诺（监控自身不能单点）三者之一时，回到第 6 节决策树重评；一个都不满足就维持现状。队列堆积告警的规则写法见同册 [alerting.md](alerting.md) 的元告警小节；存储层更宏观的对比在 [storage-backends.md](../06-system-design/storage-backends.md)。

**降配触发器**：扩容有触发器，降配也该有。若连续数个季度原始层查询的最长时间窗不超过两周、5m 层问询寥寥，保留基线就可以收紧——降配与扩容走同一个评审流程，用第 12 节的估算表反向算出可省的空间与费用。只增不减的保留策略是另一种形式的浪费：它不仅推高账单，还会让下一次扩容论证失去参照——因为没人说得清现在的空间到底被谁用掉了。保留策略和告警一样，需要有人对"这一层还该不该存在"负责。

## 14. 排查速查表

| 现象 | 可能原因 | 处置 |
| --- | --- | --- |
| 面板数值是预期的两倍 | 双跑去重失效 | 查 external_labels 的 replica 与 Query 去重开关 |
| 一年前的 rate 返回空或锯齿 | 查询落在降采样层 | 降采样数据只能画趋势；精确计算改查原始层时间窗 |
| 查询报重叠 block 或重复样本 | Compactor 未运行或并发运行 | 单实例重启 Compactor，按官方手册处理重叠 |
| 待发送样本持续堆积 | 下游写吞吐不足或网络受限 | 看队列指标，扩分片或下游副本，检查出口 relabel |
| 某集群数据在全局视图消失 | 外部标签缺失或 Store Gateway 未覆盖该前缀 | 核对标签与 bucket 配置 |
| 迁移 VM 后告警不响 | MetricsQL 边缘差异或规则未加载 | 告警规则全量回归优先于面板迁移 |
| 对象存储账单跳涨 | 高基数乘长保留叠加 | 出口 relabel 加基数治理双管齐下 |
| 保留期内出现凭空缺段 | lifecycle 闸门早于引擎 retention 删数据 | 对齐两层保留策略（本篇第 11 节陷阱三） |

表里任何一行若反复出现，说明对应的上线检查缺项：外部标签、出口裁剪、Compactor 单例、双层保留一致——这四项是长期存储的四条上线红线，建议直接固化进发布流程。

## 15. 输出自测题

长期存储的概念密度高、参数多，用五道场景题检验是否能把第 2、6、7、11、12 节串起来用。答题标准同样是"结论 + 依据的小节"。

**Q1：双跑 Prometheus 加 Thanos 之后，Grafana 面板的数值全部变成原来的两倍。写出从配置到存储的排查链。**
解析：先查两个实例的 external_labels 是否都带 replica 且取值不同——这是去重键（第 2 节）；再确认 Thanos Query 的去重是否启用、去重所用的标签名与实际标签是否一致；然后排查是否混入了没有身份标签的历史 block（第 11 节陷阱一的场景）；最后理解一个反直觉点：查询时去重只是查询语义，对象存储里仍然是两份数据，存储成本不会因为去重减半。排查顺序从配置（改起来最便宜）到数据（改起来最贵），每一步都可以独立验证。

**Q2：预算评审要求"指标保留两年、总额给定"。写出你的五步估算，并列出需要向需求方确认的三个前提。**
解析：五步照抄第 12 节：数活跃序列、按字节系数换算每日样本量、算原始层成本、算各降采样层成本、合计对比全原始方案。三个前提必须先确认：一是基数口径——序列数用治理后的实测值还是需求方拍的数（基数翻倍整表翻倍，见 [cardinality.md](../05-production/cardinality.md)）；二是精度要求——两年数据是要原始精度还是趋势即可，这决定降采样比例与预算量级；三是不可逆约束——审计、计费类指标是否必须排除在降采样外，它们的原始保留成本要在预算表里单列。

**Q3：为什么降采样后的 counter 不能再算 rate？如果年报需要"去年的 QPS 趋势"怎么办？**
解析：降采样把原始 counter 聚合成了周期汇总值，本身已经是"导数"意义上的量，再求 rate 等于对导数再求导，结果要么为空要么语义错乱（第 7 节）。年报趋势的正确做法：直接画 5m 或 1h 层的聚合序列（sum、max 这类函数在降采样层可用）；确实要精确重算的少数关键指标，只回原始层做有限时间窗的查询。原则重申：降采样解决"看一年前的图"，不解决"精确复现一年前的每个点"。

**Q4：有同事提议把 Compactor 也部署两副本以"消除单点"，你怎么说服他？**
解析：三个论据。其一，Compactor 是同一 bucket 的单写者，并发会写出时间范围重叠的 block，制造比单点更难收拾的查询冲突（第 11 节陷阱二）；其二，它的 halted 机制本身就是故障安全设计——宁可暂停也不能写坏数据，真正需要高可用的是 Prometheus 与 Query 层；其三，Compactor 短暂不可用的后果只是合并与降采样延迟，原始数据不受影响，风险量级与查询中断完全不同。替代方案：单实例加存活与 halted 告警，配快速恢复预案。

**Q5：对象存储 lifecycle 30 天与引擎 retention 90 天同时生效时，哪一层说了算？如何系统性防止这类静默截断？**
解析：取交集——对象先碰到哪层寿命就终结在哪层，lifecycle 30 天会静默删掉 30 到 90 天之间的数据且引擎不报任何错（第 11 节陷阱三）。系统性防御四件套：保留策略的唯一权威写在引擎侧；lifecycle 只做兜底且时长不小于引擎值；变更评审把"两层寿命"列为必查项；上线后定期抽查最旧可查时间戳，把数据寿命对账变成例行检查，而不是事故后的复盘动作。

**Q6：团队决定从 Prometheus 直连迁移到 VM 集群版，写出迁移回归清单与回滚预案要点。**
解析：回归清单按优先级排——告警规则全量回归（MetricsQL 边缘差异最先炸在告警表达式上，见第 8 节第 6 条）；面板与录制规则逐条对数，同一时间窗、同一表达式比对两个后端的端点值，差异应在抓取噪声范围内；remote_write 双写并行期做对账，两个后端跑同一查询看曲线重合度；最后做序列数与基数自检对账，确认没有序列在转换中丢失或变形。回滚预案三要点：迁移期本地 Prometheus 的抓取与保留一律不动，随时可切回直连；Grafana 做双数据源变量切换，而不是逐面板改查询；回滚触发条件提前写死并全员知晓（例如出现第一次告警漏报即回切），不留给现场临时争论。

答完六题再回头看第 6 节决策树，会发现每一片叶子背后都有本篇的某段算术或陷阱在支撑——选型从来不是凭印象，是把账算清之后的自然结论。
