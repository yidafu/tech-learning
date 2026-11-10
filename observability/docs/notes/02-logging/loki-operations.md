---
sidebar_position: 3
---

# Loki 运维深水区：部署模式、存储、调优与自监控

> [loki.md](loki.md) 回答"Loki 是什么、怎么查"；本篇回答"**怎么把它部署好、调优好、看住它**"：
> 三种部署模式怎么选、schema 与 chunk 存储怎么回事、ingester 内存怎么估、限流怎么配、
> 缓存怎么搭、ruler 怎么用 LogQL 做告警、以及用哪些指标监控 Loki 自己。
> 配套实验仍是 [lab02](../../labs/lab02-loki-vector-logging/README.md)（本篇多数指标可用 curl 在 lab02 里直接看到）。

## 目录

1. [部署模式：单二进制 → 读写分离 → 微服务](#1-部署模式单二进制--读写分离--微服务)
2. [存储进阶：schema、chunk 编码与对象存储布局](#2-存储进阶schemachunk-编码与对象存储布局)
3. [ingester 内存模型与 chunk 生命周期](#3-ingester-内存模型与-chunk-生命周期)
4. [写入限流与准入控制](#4-写入限流与准入控制)
5. [查询保护与并行化](#5-查询保护与并行化)
6. [缓存体系：index / chunks / results 三层](#6-缓存体系index--chunks--results-三层)
7. [ruler：用 LogQL 做日志告警](#7-ruler用-logql-做日志告警)
8. [容量规划速算](#8-容量规划速算)
9. [Loki 的自监控：指标与告警](#9-loki-的自监控指标与告警)
10. [故障场景与恢复手册](#10-故障场景与恢复手册)
11. [常见坑（运维向）](#11-常见坑运维向)
12. [面试题小结](#12-面试题小结)
13. [参考资料](#13-参考资料)

---

## 1. 部署模式：单二进制 → 读写分离 → 微服务

Loki 是**同一个二进制**，用 `deployment_mode` + `-target` 控制把哪些组件跑在哪个进程里。
三种官方拓扑，对应三个规模段：

| 模式 | `deployment_mode` | 进程拓扑 | 适用规模 | 伸缩方式 |
|------|-------------------|---------|---------|---------|
| **Monolithic** | `single-binary` | 一个进程含全部组件（target=all） | 实验/POC/每天 <~100GB | 整体垂直伸缩 |
| **Simple Scalable（SSM）** | `simple-scalable` | 三组：**read**（query-frontend+querier）、**write**（distributor+ingester）、**backend**（compactor+ruler 等） | 中型，每天 100GB~1TB 级 | read/write 各自水平扩，**读写分开扩容是它存在的意义** |
| **Microservices** | `micro-services` | 每个组件独立 Deployment/StatefulSet | 大型/SaaS，多租户，TB+/天 | 逐组件精细伸缩与隔离故障域 |

### 1.1 Simple Scalable 详解（最常被低估的模式）

```yaml
# 同一份配置，三组容器只是启动参数不同
common:
  path_prefix: /loki
  storage:
    s3: ...
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist      # 三组进程通过 memberlist gossip 互相发现

deployment_mode: simple-scalable
```

```yaml
# read  Deployment：args: ["-target=read"]
#   组件：query-frontend + querier（+ frontend worker）
# write Deployment：args: ["-target=write"]
#   组件：distributor + ingester（有状态：WAL 卷）
# backend StatefulSet：args: ["-target=backend"]
#   组件：compactor + ruler + query-scheduler 等"要有全局唯一性"的活
```

三条经验：

1. **write 是有状态的**（WAL + 内存 chunk），扩容要走哈希环再平衡，别频繁伸缩；
   read 是无状态的，查询高峰随时加副本——这就是读写分离的价值；
2. **ingester 的 WAL 目录必须挂持久卷**，否则一次重启丢最近未 flush 的日志；
3. memberlist 端口（默认 7946）在三个组之间要通，ring 不通的表现是
   distributor 报 `too many unhealthyreplicas` / ingester 互相看不见。

### 1.2 什么时候上 Microservices

信号很明确，出现其一就值得评估：

- 单一租户的突发查询把 SSM 的 read 打满，**影响面无法接受**（微服务可按租户限流、独立扩 querier）；
- 需要**独立的 query-scheduler** 队列、独立 index-gateway、独立 pattern-ingester；
- 多租户 SaaS 化，各组件需要独立升级/灰度。

代价：运维面 ×N（每个组件一套资源/监控/发版），memberlist/etcd 协调更复杂。
**没有对应规模就别上**——SSM 能撑的量级常被低估。

## 2. 存储进阶：schema、chunk 编码与对象存储布局

### 2.1 schema_config：Loki 的"存储版本控制"

```yaml
schema_config:
  configs:
    - from: "2024-01-01"     # 从该日期起的新数据用这套存储方案
      store: tsdb            # 索引类型（3.x 事实标准；别再选 boltdb-shipper）
      object_store: s3       # chunk 数据放哪（与 common.storage 对齐）
      schema: v13            # 索引结构版本：v13 = structured metadata 的前提
      index:
        prefix: index_
        period: 24h          # 每 24h 一个索引周期（compactor 会再合并）
```

三条铁律：

1. **历史条目不可修改**。要变更（如 v11 → v13、boltdb-shipper → tsdb）只能**追加一条
   `from: <未来日期>` 的新配置**，旧数据继续按旧 schema 读取——这是在线迁移的唯一正路；
2. **v13 是 3.x 的默认要求**（`allow_structured_metadata: true` 只在 v13+ 生效）；
   2.9 之前的老集群迁移路径：v11/boltdb-shipper → 追加 tsdb/v13 条目 → 历史数据自然过期；
3. `from` 是**按数据时间戳**生效的，不是写入时间——改配置当天，新 chunk 立即走新 schema。

### 2.2 chunk 编码：一个被忽视的成本开关

chunk flush 到对象存储前的压缩编码（`storage_config.chunk_encoding`，默认 `snappy`）：

| 编码 | CPU | 压缩比 | 建议 |
|------|-----|--------|------|
| `snappy`（默认） | 最低 | 差（日志常常只压 2~3×） | 默认可用，但浪费对象存储 |
| `gzip` | 高 | 好 | 历史选择，CPU 偏贵 |
| `zstd` | 中 | **最好** | **3.x 官方基准推荐**：空间比 gzip 更省、CPU 可接受 |

日志量大的集群把这一项从 snappy 换成 zstd，对象存储账单经常直接降 30%+，
是**性价比最高的一行配置改动**（注意：只影响改动后新写入的 chunk）。

### 2.3 对象存储里的布局（心智模型）

单租户本地模式（lab02）用 filesystem；生产用 S3/GCS/OSS，bucket 里的目录结构是
**按 `index/chunk → 租户 → 索引周期` 切分**的（具体路径随版本略有差异，以
`ls` 实际观察为准）。运维上需要知道的三件事：

- **对象不可变**：chunk 一旦 flush 就是只读对象，"删除"只发生在 compactor 层面；
- **S3 生命周期规则要与 Loki 的 retention 二选一**：让 compactor 管删除（精确到租户/流），
  或对整个 prefix 用桶生命周期兜底（粗粒度、零成本），**两者别同时对同一批数据精细操作**；
- 对象存储**不需要 SSD**：Loki 的读路径靠缓存与索引，对象存储吞吐是够的
  （这与 Elasticsearch 必须本地 SSD 形成鲜明对比，见 [elk-and-clickhouse.md](elk-and-clickhouse.md)）。

## 3. ingester 内存模型与 chunk 生命周期

ingester 是 Loki 里**唯一有状态、最容易 OOM** 的组件，内存 ≈ 活跃流 × 每流开销 + chunk 数据：

```
每条活跃 stream：固定槽位（索引/元数据，KB 级）
              + 未 flush 的 chunk（最大 ~1.5MB 解压数据，压缩后在途更小）
所以：内存 ≈ 活跃流数 × (槽位 + 平均在途 chunk 大小)
```
<!-- 保留原图：内存构成公式推演文本，非概念示意图 -->

由此推出两个结论：**内存压力的主变量是流数（stream 数），不是日志量**——再次呼应
[loki.md §4](loki.md#4-label-与内容字段loki-的第一军规) 的 label 军规；调参目标是
**让 chunk 尽快攒满、尽快 flush**。

### 3.1 chunk 的一生与关键参数

```yaml
ingester:
  # 一个 chunk 的封存（cut）条件，满足其一：
  #   1) 解压大小达到目标（约 1.5MB）
  #   2) 首条日志距今超过 max_chunk_age（默认 2h）
  #   3) 流 idle 超过 chunk_idle_period（默认 30m）→ 没有新日志也要封
  chunk_idle_period: 30m      # 冷流快速出内存的关键旋钮
  max_chunk_age: 2h           # 一个 chunk 最长寿命
  chunk_retain_period: 0s     # flush 后在内存多留一会儿（默认 0；重启频繁时可设 30s 减少回查）
  flush_check_period: 30s     # 检查上述条件的周期
  wal:
    enabled: true             # 先写 WAL 再进内存，崩溃恢复的保证
    dir: /loki/wal            # 必须持久卷！
```

**参数直觉**：

- 流很多但每条流日志稀疏（典型的高基数 label 事故）→ 大量 chunk 永远攒不满，
  只能等 `chunk_idle_period` 到期才 flush，期间一直占内存——**这就是高基数 label
  导致 ingester 内存暴涨的机制**，治本是砍 label，不是加内存；
- `chunk_idle_period` 调小（如 5m~15m）：冷流更快出内存，代价是 chunk 更小、
  对象更多（小对象放大 PUT 次数）——3.x 内部优化了大 chunk，此项别调太激进；
- `max_chunk_age` 调大：单 chunk 更大更省对象数，代价是数据在内存滞留更久、
  崩溃恢复窗口更长。一般保持 2h 默认。

### 3.2 WAL 与恢复

重启后的恢复流程：**读 checkpoint → 重放 WAL 日志 → 重建内存 chunk → 继续**。

- 重放耗时与 WAL 体积成正比：`/loki/wal` 目录增长速度 ≈ 写入吞吐，
  对象存储故障（flush 失败）时 WAL 会持续增长——**WAL 卷的磁盘告警是必备项**；
- ingester **优雅停机**很重要（SIGTERM 后主动把内存 chunk flush 完再退出）：
  `terminationGracePeriodSeconds` 要给够（官方建议 ≥ 2h？不——给 Pod 至少几分钟，
  并依赖 WAL 兜底；K8s 默认 30s 通常够，强杀则靠 WAL 重放）；
- `replication_factor: 3` 时，单 ingester 重启期间查询不受影响（querier 会从
  其他副本读），这就是副本数的意义。

## 4. 写入限流与准入控制

Loki 的限流都在 `limits_config`（可全局默认 + 按租户 override），分两层：

### 4.1 租户级（总量闸门）

```yaml
limits_config:
  ingestion_rate_mb: 20          # 每租户每秒平均写入上限（MB/s），默认很小（4），生产必须重估
  ingestion_burst_size_mb: 40    # 允许的突发
  ingestion_rate_strategy: global  # local=每个 distributor 各自算（默认）；global=全局精确（需 distributor 进 ring）
  max_global_streams_per_user: 30000   # 每租户全局活跃流上限（默认数千级，随版本不同，务必显式规划）
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

`ingestion_rate_strategy` 的取舍：`local` 无需协调但放大 N 倍（N=distributor 数）；
`global` 精确但依赖 distributor 全部加入 ring。**超限的表现是采集端收到 429**，
好的采集器（Vector/Alloy）会退避重试——所以限流几乎无感，直到你发现日志"晚了几分钟"。

### 4.2 流级（单流闸门）

```yaml
limits_config:
  per_stream_rate_limit: 3MB       # 单条流每秒写入上限
  per_stream_rate_limit_burst: 6MB # 单流突发
  max_line_size: 256KB             # 单行上限（超限整行被丢弃，注意不是截断）
```

单流限速防的是"一个失控服务的一条超大流把某个 ingester 打爆"。被限的行会计入
`loki_discarded_samples_total`（reason=`rate_limit`/`stream_limit`/`line_too_long` 等）
——**这个指标必须告警**，丢弃是无声的数据损失（见 §9）。

> 多租户覆盖：`limits_config.per_tenant_override_config: /etc/loki/overrides.yaml`，
> 按租户放宽/收紧上述所有项，例如给日志大户新团队单独配额。

## 5. 查询保护与并行化

大查询打垮 Loki 的路径是"一个 30 天全流扫描 → querier 全员拉满 → 其余查询排队"。
保护机制分四层：

```yaml
query_range:                        # 挂在 query-frontend 上
  align_queries_with_step: true
  split_queries_by_interval: 30m    # 把大时间窗切成 30m 子查询并行执行（3.x 可为指标查询单设更大间隔）
  cache_results: true
  results_cache:
    cache:
      embedded_cache:               # 实验用；生产换 redis/memcached
        enabled: true
        max_size_mb: 100
  max_outstanding_per_tenant: 100   # 排队上限，超出直接 429（保护 querier 的"保险丝"）

frontend:
  max_outstanding_per_tenant: 2048  # SSM read 目标的默认更宽

limits_config:
  max_query_series: 500       # 单查询最多涉及 500 条序列（指标查询保护）
  max_query_parallelism: 32   # 单查询最多拆多少子任务
  query_timeout: 30s          # 单子查询超时
```

分层理解：

| 层 | 机制 | 保什么 |
|----|------|--------|
| 切分 | `split_queries_by_interval` | 把大窗查询变并行小任务，也提高缓存命中（同窗+step 命中率极高） |
| 排队 | scheduler/frontend 的 outstanding 队列 | 公平性：单租户大查询不能饿死别人，满了回 429 |
| 限额 | `max_query_series`、`query_timeout` | 查询自身规模上限 |
| 缓存 | results cache | 重复查询（dashboard 刷新）不打后端 |

**429 太多怎么办**：先看是写入 429（ingestion 限流）还是查询 429（outstanding 队列满），
处理完全不同——前者调租户配额，后者拆时间窗/上 recording rule/扩 querier。
另：Loki 3.x 的 **query sharding** 会对指标类查询按时间自动再分片，SSM/微服务模式受益明显。

## 6. 缓存体系：index / chunks / results 三层

| 缓存 | 配置位置 | 缓存什么 | 后端 | 建议 |
|------|---------|---------|------|------|
| **index cache** | `storage_config.index_queries_cache_config` | TSDB 索引查询结果（"哪些流匹配"） | memcached/redis | **收益最大**：索引查询是每次查询的第一步 |
| **chunks cache** | chunk 存储客户端（memcached_chunks 等） | 对象存储里的 chunk 数据 | memcached | 2.x 时代小 chunk 收益高；3.x chunk 变大后命中率下降，优先级降低 |
| **results cache** | `query_range.results_cache` | 整条查询结果（按窗+step 键） | 任意 | dashboard 高频刷新场景收益大，注意改 retention 后要失效缓存 |

经验值：

- 小规模（lab02）：`embedded_cache` 全部内置，零依赖，够用；
- 中大规模：memcached 集群跑 index + results 两类（chunks 视预算），
  Loki 配置里分别指向不同 prefix，容量按查询 QPS × 平均结果集估；
- **缓存与数据正确性**：结果缓存按时间窗+query 哈希，刚写入的最新日志天然在窗内不受影响；
  但**执行 retention 删除后**旧缓存仍可能返回已删数据（有 TTL 兜底），合规敏感场景要
  把 results cache TTL 调小于 retention 执行周期，或删除期间禁用。

## 7. ruler：用 LogQL 做日志告警

ruler 让 Loki 像 Prometheus 一样**周期评估 LogQL 规则**——"日志里出现某种模式"本身成为告警源，
这是纯指标告警做不到的（指标要先有人埋点）。

### 7.1 典型规则集

```yaml
# rules/fake/app-logs.yaml（目录结构：<rules_dir>/<tenant>/<namespace>/<file>.yaml）
groups:
  - name: app-error-rules
    interval: 1m
    rules:
      - alert: HighErrorLogRate
        expr: |
          sum by (job) (rate({job=~"order|pay"} | json | level="ERROR" [5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.job }} 错误日志 >5 条/秒 持续 10 分钟"
          runbook_url: "https://wiki.example.com/runbooks/high-error-log"

      - alert: ServiceSilent
        expr: absent_over_time({job="order"} |= "service_started" [30m])
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: order 服务 30 分钟没有任何启动日志，疑似进程死亡
```

两条规则的范式值得记：**`rate(... | level="ERROR")` 是"日志派生错误率"告警**（不需要应用埋指标）；
**`absent_over_time` 是"心跳消失"告警**（日志断流本身就是故障信号，比如采集器挂了）。

### 7.2 ruler 配置要点

```yaml
ruler:
  storage:                    # 规则的持久化（重启后规则还在）
    type: s3                  # filesystem 仅单机；SSM/微服务必须对象存储
    s3: ...
  rule_path: /loki/rules      # 本地工作副本
  alertmanager_url: http://alertmanager:9093
  enable_api: true            # 开 /loki/v1/rules 供管理
  ring:
    kvstore:
      store: memberlist       # 多副本 ruler 自动分片评估，避免重复告警
```

- 规则文件结构与 Prometheus 基本一致（group/rule/expr/for/labels/annotations），
  区别是 expr 是 **LogQL 指标查询**（§7.1 的 `rate({...}[5m])` 形态）；
- ruler 也支持**录制规则**（`record:` 把高频 LogQL 聚合预计算成序列，查询端直接读），
  适合 dashboard 上的重查询——注意其结果存储与暴露端点以官方文档为准，别假设它能替代 Prometheus；
- 告警去 Alertmanager，**与 Prometheus 告警共用一棵路由树**（同一个 Alertmanager），
  注意两边的 label（severity/team）命名对齐，路由才好写。

## 8. 容量规划速算

不需要精确模型，只需要数量级正确（假设压缩后对象存储量 = 原始量 ÷ 8，zstd）：

```
写入侧
  原始日志 100GB/天 ≈ 1.2MB/s 平均（峰值按 ×5 估）
  ingester 数量 ≥ 活跃流数 / (单 ingester 可承载流数)
    —— 单 ingester 承载能力以实测为准（内存公式见 §3，官方基准 10 万级流/副本可达，
       但保守从 1~2 万流/ingester 起步，压测后再放宽）
  内存：每 ingester 8~16GB 是常见起点；WAL 卷 = 峰值吞吐 × flush 最大延迟 × 2

存储侧
  对象存储日增量 ≈ 原始量 ÷ 压缩比（zstd 约 8~12×）
  索引增量 ≈ 流数 × 周期系数（相对 chunk 可忽略，但 compactor 合并要留工作目录空间）
  retention 30 天 → 总量 ≈ 日增量 × 30（compactor 有滞后，多留 20%）

查询侧
  querier 数量 ≈ 目标 P95 查询并发 × 单查询并行度(split) / 单 querier 并发槽
  read 副本跟着 dashboard 使用习惯走：白天高峰 × 2~3 台
```
<!-- 保留原图：容量估算公式清单（写入/存储/查询三侧），非概念示意图 -->

**最重要的容量变量是流数，不是日志量**。1000 条流 × 1GB/天 和 100 万条流 × 10GB/天，
后者的 ingester 内存需求可能是前者的一百倍。容量评估前先做流基数审计
（[cardinality.md §4.4](../05-production/cardinality.md#44-loki-的流基数度量)）。

## 9. Loki 的自监控：指标与告警

"监控系统的监控系统"不是玄学，Loki 自身暴露完整 `/metrics`。

### 9.1 必看指标速查表

| 指标 | 组件 | 含义 / 用法 |
|------|------|------------|
| `loki_distributor_lines_received_total` / `loki_distributor_bytes_received_total` | distributor | 写入吞吐（按租户/agent 维度），容量趋势的分子 |
| `loki_discarded_samples_total{reason=...}` | distributor | **被丢弃的日志行**（流超限/行超长/太旧）。按 reason 增长即告警——静默丢数据的唯一信号 |
| `loki_ingester_memory_streams`（3.x；2.x 为 `loki_ingester_streams`） | ingester | 活跃流数，内存规划与基数事故的第一指标 |
| `loki_ingester_memory_chunks` | ingester | 内存中 chunk 数 |
| `loki_ingester_chunks_created_total` / `loki_ingester_chunks_flushed_total` | ingester | chunk 创建/落盘速率，两者长期背离 = flush 跟不上 |
| `loki_ingester_wal_records_logged_total` | ingester | WAL 写入速率；结合 WAL 目录大小监控磁盘 |
| `loki_distributor_ingester_append_failures_total` | distributor | 写入 ingester 失败（副本不健康/限流） |
| `cortex_request_duration_seconds{route=...}` | 全组件 | 内部 HTTP 路由延迟——**注意前缀是 `cortex_`**（Loki 源自 Cortex，大量内部指标沿用旧前缀，别在 dashboard 里只搜 `loki_`） |
| `loki_request_duration_seconds` | 部分入口 | 入口延迟（版本演进中逐步统一） |
| ruler `cortex_prometheus_rule_evaluation_failures_total` | ruler | 规则评估失败 |

### 9.2 官方 mixin 与告警规则

Grafana 官方维护 [loki-mixin](https://github.com/grafana/loki/tree/main/production/loki-mixin)
（Prometheus 告警规则 + Grafana dashboard 一体），覆盖 ingester OOM 前兆、ring 不健康、
compactor 停摆、查询 5xx 率等。**自建监控从导入 mixin 开始**，别从零手写。

### 9.3 在 lab02 里亲手看一遍

```bash
# 写入速率（每秒行数）
curl -s http://localhost:3100/metrics | grep -E '^loki_distributor_lines_received_total'
# 活跃流数 / chunk 数
curl -s http://localhost:3100/metrics | grep -E '^loki_ingester_memory_(streams|chunks) '
# 有没有被丢弃的行（本地模式几乎应为 0）
curl -s http://localhost:3100/metrics | grep loki_discarded_samples_total
# 内部路由延迟（cortex_ 前缀的实例）
curl -s http://localhost:3100/metrics | grep -E '^cortex_request_duration_seconds_count' | head -5
# 就绪探针（K8s 部署时的 /ready）
curl -s http://localhost:3100/ready
```

## 10. 故障场景与恢复手册

| 场景 | 症状 | 处置 |
|------|------|------|
| **对象存储不可达**（S3 故障/凭证过期） | ingester flush 失败重试、WAL 目录持续增长、查询旧数据报错 | 这是**最危险的故障**：写入还在成功（进内存+WAL），但数据落不了盘。盯 WAL 磁盘，超阈值要降级写入（暂停部分租户）而非让 WAL 涨满 |
| **ingester OOMKill 反复** | 流数暴涨 / 单流超大 | 看 `loki_ingester_memory_streams` 是否同步暴涨 → 查高基数 label；单流超大 → 收紧 `per_stream_rate_limit`；紧急时摘掉一个 ingester 让流再平衡（会触发副本迁移，谨慎） |
| **单个 ingester 磁盘满（WAL）** | 该 ingester 写入失败，distributor 报 unhealthy replicas | 清理磁盘 / 扩卷；ring 健康时其他副本兜住查询；恢复后 WAL 重放补数据 |
| **哈希环脑裂**（memberlist 网络分区） | distributor 找不满副本数、写入 5xx | 先查网络（7946 端口）；memberlist 节点表 `curl /memberlist`；必要时摘除僵尸节点 |
| **compactor 停摆** | 索引小文件膨胀、retention 不执行、磁盘渐涨 | compactor 是**单活跃**组件（有 ring 选主），看它的 metrics/日志确认是否卡在合并大周期；磁盘满时清理其 working_directory 可重跑 |
| **查询全 429** | dashboard 全空、`429 too many outstanding requests` | 一个租户的大查询堵队列：看 frontend/scheduler 队列指标，临时调低该租户 `max_query_parallelism`，长期用录制规则治大查询 |

**恢复总原则**：Loki 写路径是 at-least-once（WAL + 副本），组件重启不丢数据；
真正的风险是**对象存储长期不可写**和**磁盘（WAL/compactor 工作目录）写满**——
这两处的磁盘告警优先级高于一切。

## 11. 常见坑（运维向）

1. **SSM 模式忘了 backend 目标**：read/write 起了、compactor/ruler 没人跑，
   症状是 retention 永不执行、规则不评估——三组 target 一个都不能少；
2. **schema 迁移改了旧条目**：重启直接报错或新旧数据查询异常。只能追加，
   且新条目的 `from` 必须 ≥ 现在最后一个条目的 `from`；
3. **限流超限只看 429 日志**：采集器会退避重试，表象是"日志延迟几分钟"而非报错。
   以 `loki_discarded_samples_total` 和 distributor 429 计数为准；
4. **WAL 目录配了 emptyDir**：Pod 重启即丢最近未 flush 数据。必须 PVC/持久卷；
5. **retention 三件套缺一**（详见 [loki.md §6](loki.md#6-retention-与-compactor)）：
   磁盘只涨不跌的经典；
6. **memcached 缓存无淘汰压力测试**：缓存集群内存不足时命中率雪崩，查询延迟不升反暴增——
   容量按峰值查询结果集估，留 30% 余量；
7. **升级跨大版本不看 breaking changes**：Loki 大版本（2.x→3.x）常有 schema/默认值变更
   （如 3.0 强制 v13），先读官方 upgrade 指南再动手；
8. **拿 Elasticsearch 的思路选机器**：给 Loki 上本地 SSD 大盘——对象存储才是存储层，
   本地盘只服务 WAL 与临时目录，机型选择完全不同。

## 12. 面试题小结

**Q1：Loki 三种部署模式怎么选？**
A：同一个二进制按 target 组合。单二进制（实验）、Simple Scalable（读写分离三组，
读写独立伸缩，中型主力）、Microservices（逐组件伸缩，多租户 SaaS/超大流量）。
判断依据是读写两侧的伸缩与故障隔离需求，而不是日志量单一维度。

**Q2：ingester 内存主要消耗在哪？高基数 label 为什么打爆它？**
A：活跃流 ×（每流固定开销 + 在途未 flush chunk）。流数是主变量：高基数 label
让流数接近日志条数，且稀疏流攒不满 chunk 只能等 idle 超时，内存只进不出。
治本是 label 治理（低基数），不是无限加内存。

**Q3：WAL 在 Loki 里保证什么？什么时候失效？**
A：保证 ingester 崩溃/重启后，未 flush 到对象存储的日志可从本地 WAL 重放恢复
（at-least-once）。失效场景：WAL 目录不可持久化（emptyDir）、磁盘满、
对象存储长期不可写导致 WAL 无限增长被截断。

**Q4：租户写入限流的 local 与 global 策略差异？**
A：`local` 每个 distributor 独立计算（实际限额 × distributor 数，无协调）；
`global` 通过 distributor ring 共享计数，精确但要求 distributor 入 ring。
多 distributor 部署且配额接近真实预算时用 global。

**Q5：一个查询打垮 Loki 的完整链路，以及四层防护？**
A：链路：大时间窗 × 宽流选择器 → frontend 不切分 → querier 拉满 → 队列堵塞 →
其他查询 429。防护：时间窗切分（split_queries_by_interval 并行化+缓存友好）、
排队上限（outstanding per tenant 超限 429）、规模限额（max_query_series/timeout）、
结果缓存 + 录制规则预计算。

**Q6：怎么第一时间发现 Loki 在静默丢日志？**
A：`loki_discarded_samples_total` 按 reason（stream 限流/行超长/样本过旧）增长的告警。
429 会被采集器重试掩盖，丢弃是真正的数据损失，这个指标是唯一可靠信号。

**Q7：为什么 Loki 监控里要搜 `cortex_` 前缀的指标？**
A：Loki 基于 Cortex 演化，大量内部组件指标沿用 `cortex_` 前缀（如
`cortex_request_duration_seconds`）；只搜 `loki_` 会漏掉一半的内部延迟/队列指标。

**Q8：ruler 的告警规则与 Prometheus 告警的分工？**
A：Prometheus 管"指标超阈"（先有埋点）；ruler 管"日志模式本身"
（`rate({...}|json|level="ERROR")` 派生错误率、`absent_over_time` 心跳消失），
两者汇入同一个 Alertmanager 路由树，label 体系要对齐。

## 13. 参考资料

- Loki 部署模式（monolithic / SSM / microservices）：<https://grafana.com/docs/loki/latest/get-started/deployment-modes/>（访问日期：2026-11-04）
- Loki storage / schema 配置：<https://grafana.com/docs/loki/latest/configure/storage/>（访问日期：2026-11-04）
- ingester 与 chunk 生命周期参数：<https://grafana.com/docs/loki/latest/configure/#ingester>（访问日期：2026-11-04）
- Loki limits（ingestion / query limits）：<https://grafana.com/docs/loki/latest/configure/#limits_config>（访问日期：2026-11-04）
- Loki ruler（LogQL 告警规则）：<https://grafana.com/docs/loki/latest/alert/>（访问日期：2026-11-04）
- Loki 运维（WAL、更新、故障处理）：<https://grafana.com/docs/loki/latest/operations/>（访问日期：2026-11-04）
- loki-mixin（官方自监控告警与 dashboard）：<https://github.com/grafana/loki/tree/main/production/loki-mixin>（访问日期：2026-11-04）
- Loki 3.0 发布说明（zstd / 大 chunk / v13）：<https://grafana.com/blog/2024/04/08/how-loki-3.0-improves-performance-and-cost/>（访问日期：2026-11-04）
- 本工作区前置笔记：[loki.md](loki.md)、[cardinality.md](../05-production/cardinality.md)
- 本工作区配套实验：[labs/lab02-loki-vector-logging/](../../labs/lab02-loki-vector-logging/README.md)

## 附：ASCII 图替换清单

本文档没有需要替换的 ASCII 字符图。

### 保留说明

- 3. ingester 内存模型与 chunk 生命周期 开头的公式块：内存构成公式推演文本（非「对象+关系」结构），保留原样。
- 8. 容量规划速算：写入/存储/查询三侧的估算公式清单（平铺参数清单、无节点关系语义），保留原样。
