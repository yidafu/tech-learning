---
sidebar_position: 3
---

# PromQL 详解

> PromQL 是 Prometheus 的查询语言，也是 Grafana 面板、告警规则、recording rules 的共同基础。
> 本篇按"查询类型 → 核心函数 → 聚合 → 分位数推导 → 向量匹配/join → 高级特性 → 实战查询 → 反模式"展开。

## 1. 基础：即时查询 vs 区间查询

### 1.1 两类查询（API 层面就不同）

| | 即时查询（instant query） | 区间查询（range query） |
| --- | --- | --- |
| API | `/api/v1/query?query=...&time=...` | `/api/v1/query_range?query=...&start=&end=&step=` |
| 返回 | 每个序列在**单个时刻**的一个值 | 每个序列在时间轴上**多个点**（每个 step 一个点） |
| 典型消费方 | 告警规则、Grafana Stat/Table 面板、curl 排障 | Grafana Time series 面板 |
| 表达式里的 `[5m]` | 仍可用：表示"以该时刻为终点往回看 5 分钟" | 每个采样点各自回看 5 分钟 |

**range query 的 step 语义**：`step` 是采样间隔（如 15s/1m），每个采样点把表达式在该时刻求值。**step 不要小于抓取间隔**，否则会看到锯齿/空洞（数据点间隔 > step 时两个点之间无新样本）。

### 1.2 表达式语法速览

```promql
# 指标选择器
http_requests_total                          # 全部序列
http_requests_total{method="GET"}            # 等值匹配
http_requests_total{status=~"5.."}           # 正则匹配（=~），锚定全串
http_requests_total{status!~"4..|5.."}       # 正则排除（!~）
http_requests_total[5m]                      # 区间向量：最近 5 分钟所有样本

# 四种值
5                                            # 标量
http_requests_total                          # 即时向量（每个序列一个最新值）
http_requests_total[5m]                      # 区间向量（每个序列一组样本）
-1                                           # 负标量亦合法
```

**易错点**：
- `=` 是完整匹配，`=~` 是正则且**全串锚定**（`=~"5.."` 不匹配 "5001"，因为 `..` 只有两个点）。
- 含特殊字符的正则可用反引号字符串避免双重转义：`{path=~`/api/(v1|v2)/.+`}` 与 `{path=~"/api/(v1|v2)/.+"}` 等价。
- 复杂正则建议先在 Prometheus UI 的 Graph 页（或 Grafana Explore）里调试通过再放进面板/告警。

## 2. 核心函数：rate / irate / increase / resets

### 2.1 rate()：counter 的平均速率（最重要，没有之一）

```promql
rate(http_requests_total[5m])
```

**语义**：对区间内 counter 的增长量做**外推补偿**后除以时间，得到"每秒平均速率"。

- **外推补偿**：假设第一个样本前/最后一个样本后各有一个"虚拟样本"（按区间内平均速率外推到窗口边界）。所以 5 分钟窗口内只有 2 个样本也能算出平滑的 rate。
- **重启处理**：检测到 counter 变小（进程重启归零）时，假设重启前是从 0 一路涨上来的，自动补偿。
- **窗口选择**：常用 `[1m]`（灵敏）、`[5m]`（默认均衡）、`[10m]~[30m]`（平滑）。窗口至少要覆盖 2 个抓取点；窗口太短则抖动，太长则迟钝。

### 2.2 irate()：瞬时速率

只取区间内**最后两个样本**算速率。反应极快但抖动大，适合"看毛刺"，**不适合告警**（单点异常即触发）。

### 2.3 increase()：区间增长总量

```promql
increase(http_requests_total[1h])   # 最近 1 小时新增多少请求
```

= rate × 秒数（同样带外推）。适合回答"这一小时新增了多少"，展示整数时对结果 `/1` 并在 Grafana 设小数位 0。

### 2.4 resets()：检测计数器归零次数

```promql
resets(http_requests_total[1h])     # 最近 1h 内 counter 重置了 3 次 = 重启了 3 次
```

配合 `changes(process_start_time_seconds[1h])` 或 `process_uptime` 类指标可做**重启告警**。

### 2.5 对比表

| 函数 | 用的样本 | 平滑度 | 典型用途 |
| --- | --- | --- | --- |
| `rate` | 全部 | 平滑 | QPS、错误率、**告警首选** |
| `irate` | 最后 2 个 | 抖动 | 看瞬时毛刺、短窗口图形 |
| `increase` | 全部 | 平滑 | 时间窗内总量 |
| `resets` | 全部 | — | 重启检测 |

## 3. 聚合操作符

### 3.1 常用聚合

```promql
sum(rate(http_requests_total[5m]))                 # 总 QPS（全部序列求和）
sum by (job) (rate(http_requests_total[5m]))       # 按 job 分组求和 → 每服务 QPS
sum without (instance) (rate(http_requests_total[5m]))  # 去掉 instance 维度聚合（保留其他标签）

avg by (job) (process_resident_memory_bytes)       # 平均内存
max by (job) (process_resident_memory_bytes)       # 最大内存（找最胖实例）
count by (job) (up)                                # 实例数
count by (job) (up == 0)                           # 挂掉的实例数

topk(5, sum by (path) (rate(http_requests_total[5m])))   # 流量 Top5 路径
bottomk(3, ...)                                    # 倒数（流量最低，常用于发现僵尸接口）

quantile(0.99, http_request_duration_seconds)      # 对 gauge 型序列求 p99（少用）
stddev by (job) (node_load1)                       # 标准差（负载是否均衡）
group by (job) (up)                                # 只保留标签，值为 1：数"组数"
```

### 3.2 by / without 的区别（必考）

- `by (a, b)`：聚合后**只保留** a、b 标签。
- `without (c, d)`：聚合后**去掉** c、d，保留其余全部。

`sum by (job)` 与 `sum without (instance, method)` 在只剩 job/instance/method 三标签时等价。多实例聚合几乎总是 `without (instance)` 或显式 `by (期望维度)`——**注意默认 `up`/`instance` 会混进聚合结果导致面板一条线一个实例**。

### 3.3 聚合嵌套

聚合可以嵌套，先内后外：

```promql
# 每服务的"最大单实例 QPS"（找不均衡）
max by (job) (sum by (job, instance) (rate(http_requests_total[5m])))
```

## 4. histogram_quantile 计算 p99 完整推导

### 4.1 标准写法

```promql
histogram_quantile(
  0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket{job="myapp"}[5m]))
)
```

**为什么必须 `sum by (le)`**：histogram 桶要聚合，就是把各实例同名桶相加（累积桶相加仍是合法累积分布）。`by (le)` 保留桶维度、丢掉 instance 等维度。漏掉这一步（忘了 sum by le）会得到逐实例的多条 p99 曲线，且在不带 by 时可能直接报错或得到错误结果。

### 4.2 推导过程（以一个例子走一遍）

假设聚合后各桶的每秒速率：

| le | rate（次/秒） | 累积含义 |
| --- | --- | --- |
| 0.1 | 100 | ≤0.1s 的观测速率 |
| 0.25 | 160 | ≤0.25s |
| 0.5 | 190 | ≤0.5s |
| 1 | 199 | ≤1s |
| +Inf | 200 | 全部观测 |

p99 = 99% 分位 → 目标观测速率 = 0.99 × 200 = **198**。

1. 找到**第一个累积计数 >= 198 的桶**：le=1（199 ≥ 198）。即 p99 落在 (0.5, 1] 桶内。
2. 在该桶内做**线性插值**：
   - 桶区间：(0.5, 1]，宽度 0.5s
   - 桶内观测（本桶累积 - 上一桶累积）：199 - 190 = 9
   - 需要在桶内走的量：198 - 190 = 8
   - 插值位置：8 / 9 ≈ 0.889

   p99 ≈ 0.5 + 0.889 × (1 - 0.5) ≈ **0.944s**

3. 结论：p99 ≈ 944ms。若 198 恰好 ≤ 某桶累积计数的下界之外（如全落在最后一个桶），会返回 +Inf 桶的线性外推（受最大桶边界限制）。

**记住两点**：分位数永远是**估计值**（桶内线性分布假设）；**桶边界决定精度**——想精确监控 300ms SLA，就让桶边界有 0.3。

官方文档：<https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile>（访问日期：2026-11-04）

## 5. 向量匹配与 join（on / ignoring / group_left）

### 5.1 为什么要 join

很多真实问题需要**两个指标相除/相关联**：错误数 / 总数、已用 / 容量。二向量运算要求**标签完全一致**才能配对，实际往往不一致 → 用修饰符调整匹配。

```promql
# 错误率（5xx ÷ 全部）
# 陷阱：分子匹配 500/502/503 等多个 series，分母也带 status 标签，
# 直接相除是"多对一"匹配（无 group_left 会报 duplicate series 错误）。
# 最稳写法：两侧各自 sum 掉 status，标签集自然一致，无需 on/ignoring
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# 容量使用率（一多配一：每 Pod ÷ 节点容量）
node_namespace_pod_container:container_memory_working_set_bytes
  / on(namespace, pod) group_left(node)
kube_pod_container_resource_limits{resource="memory", unit="byte"}
```

| 修饰符 | 语义 |
| --- | --- |
| `on(a,b)` | 只用 a,b 标签匹配 |
| `ignoring(c)` | 匹配时忽略 c 标签 |
| `group_left(额外标签)` | many-to-one：左边多、右边一，可把右边标签带过来 |
| `group_right(...)` | one-to-many（镜像场景） |

**没有 group 修饰的一对一匹配**：若某标签组合在另一侧找不到配对，该序列**被丢弃且无提示**（排查"面板少了一条线"的常见根因）。

### 5.2 label_replace()：改标签再匹配

```promql
# 从 instance="10.0.0.5:9100" 提取出 host 标签，再与另一指标按 host join
label_replace(up{job="node"}, "host", "$1", "instance", "(.+):.*")
```

`label_replace(向量, 新标签, 替换模板, 源标签, 正则)`：正则捕获组 `$1` 填充新标签。常用于打通 `instance` 与 `nodename`、`namespace` 命名不一致的两套指标。

## 6. offset / @ / subquery

### 6.1 offset：看过去

```promql
rate(http_requests_total[5m])                    # 现在
rate(http_requests_total[5m] offset 1h)          # 一小时前
rate(http_requests_total[5m] offset -1h)         # 未来（需启用 --enable-feature=promql-negative-offset，测试用）
```

典型用法：同比环比面板（今天 vs 昨天叠加）、"发布前后对比"。

### 6.2 @：取指定时间戳的值

```promql
http_requests_total @ end()          # 区间末端值（range query 有意义）
rate(http_requests_total[5m] @ start())
process_start_time_seconds @ 1700000000   # 指定 epoch 秒
```

适合"快照值"对比。默认未启用时需 `--enable-feature=promql-at-modifier`（2.25+，近版本默认开启；以版本文档为准）。

### 6.3 subquery：对"函数结果"再求函数

想对 `rate()` 的结果再算 `max_over_time`（如"5 分钟窗口的 rate，在过去 1 小时内的最大值"）：

```promql
max_over_time(
  rate(http_requests_total[5m])[1h:15s]     # [范围:步长]，步长可省略（自动）
)
```

语法：`<表达式>[<范围>:<步长>]`。把内层即时查询按步长在范围内逐点求值成新区间向量。代价高（每个点都执行内层查询），**面板里慎用大范围 subquery**，优先用 recording rules 固化内层结果。

## 7. Recording rules：什么时候用

### 7.1 是什么

把一个 PromQL 的结果**预计算并存成新指标**，按固定间隔评估：

```yaml
# /etc/prometheus/rules/requests.yml
groups:
  - name: http.rules
    interval: 30s
    rules:
      - record: job:http_requests:rate5m          # 命名惯例 level:metric:operations
        expr: sum by (job) (rate(http_requests_total[5m]))
      - record: job:http_request_duration_seconds:p99
        expr: |
          histogram_quantile(0.99,
            sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

### 7.2 使用时机（满足其一）

1. **面板/告警复用**：同一条复杂查询出现在多个 dashboard 与告警里 → 固化一份，改一处生效。
2. **查询太贵**：subquery / 大范围聚合导致面板加载秒级 → 预聚合后面板只查新指标。
3. **组合表达式太长难维护**：多层嵌套（如 SLO 错误预算燃烧率）拆成多条 rule 逐层构建。

### 7.3 命名惯例

`level:metric:operations`，如 `job:http_requests:rate5m`、`instance_path:request_failures:ratio_rate5m`。冒号在 PromQL 指标名中**只允许出现在 recording rule 名里**，天然与原始指标区分。

## 8. 实战查询示例集（10+）

以下查询在 lab01 中可直接验证（指标来自 Python 示例应用 + node_exporter）：

```promql
# ── 1. 总 QPS ─────────────────────────────────────────────
sum(rate(http_requests_total[1m]))

# ── 2. 按服务(job)聚合的 QPS ──────────────────────────────
sum by (job) (rate(http_requests_total[5m]))

# ── 3. 按 path 的 Top5 热点接口 ──────────────────────────
topk(5, sum by (path) (rate(http_requests_total[5m])))

# ── 4. 错误率（5xx 占比，0~1 之间的小数）─────────────────
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# ── 5. 分服务的错误率（Grafana 里配 unit=Percent(0.0-1.0)）─
sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
  / sum by (job) (rate(http_requests_total[5m]))

# ── 6. p99 延迟（秒）──────────────────────────────────────
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# ── 7. 平均延迟（sum/count 派生，比 p50 更平滑）───────────
rate(http_request_duration_seconds_sum[5m])
  / rate(http_request_duration_seconds_count[5m])

# ── 8. 慢请求占比：超过 1s 的请求比例 ─────────────────────
#  (全部 - le=1 的累积) / 全部
(
  sum(rate(http_request_duration_seconds_count[5m]))
  - sum(rate(http_request_duration_seconds_bucket{le="1.0"}[5m]))
) / sum(rate(http_request_duration_seconds_count[5m]))

# ── 9. CPU 使用率（node_exporter，多核平均；用 1-idle 而不是非 idle 求和）
# 陷阱：mode!="idle" 会匹配 user/system/iowait/softirq 等 7~9 个模式再 avg，
# 结果被模式数稀释（约 7~9 倍低估）。正确姿势是 1 - idle 占比
1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

# ── 10. 内存使用率（可用/总量 → 1-可用比）
1 - avg by (instance) (
  node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes
)

# ── 11. 磁盘空间使用率（按挂载点）
1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}
    / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}

# ── 12. 饱和度：CPU 负载 / 核数（>1 说明排队）
node_load1 / count without (cpu, mode) (node_cpu_seconds_total{mode="idle"})

# ── 13. 网络入/出流量（MB/s）
rate(node_network_receive_bytes_total{device!~"lo|veth.*"}[5m]) / 1024 / 1024
rate(node_network_transmit_bytes_total{device!~"lo|veth.*"}[5m]) / 1024 / 1024

# ── 14. 可用性：每个 job 的"存活实例占比"
avg by (job) (up)

# ── 15. 发布前后对比（offset 的用法）
sum(rate(http_requests_total[5m]))
sum(rate(http_requests_total[5m] offset 1h))

# ── 16. 重启检测
changes(process_start_time_seconds[10m]) > 0
```

## 9. 常见反模式

1. **对 gauge 求 rate**：`rate(node_memory_MemTotal_bytes[5m])` 毫无意义。gauge 趋势用 `avg_over_time` / `max_over_time` / `last_over_time`。
2. **忘了 rate 直接 sum counter**：`sum(http_requests_total)` 把不同启动时间的累计值加总，数值无意义。永远先 rate 再聚合。
3. **聚合时丢掉/留下错误维度**：p99 忘了 `sum by (le)`；QPS 忘了去掉 instance 导致"每实例一条线"却误以为在"聚合"。
4. **窗口太短告警**：`rate(x[30s])` 只覆盖 2 个样本，一个抖动就告警。告警至少 `[2m]~[5m]`。
5. **step 设置过密**：range query 的 step=10s 而抓取间隔 60s → 图上 5/6 的点是插值或空洞。
6. **用 `==` 匹配正则意图**：`{path="5.."}` 想匹配 5xx 永远配不上，正则要用 `=~`。
7. **exemplars/高基数标签塞进查询分组**：`by (request_id)` 产生上万条序列，面板超时。
8. **拿即时查询当历史**：instant query 只有一个点；要趋势必须 range query。
9. **increase 期望精确整数**：increase 带外推，是估计值（38.2 个请求"增加"是正常的）。
10. **subquery 滥用**：嵌套大范围 subquery 拖垮服务端；用 recording rule 固化。

## 10. 面试题小结

1. **Q：rate 和 irate 的区别？什么时候用哪个？**
   A：rate 用窗口内全部样本（含外推补偿）算平均速率，平滑，告警与常规面板首选；irate 只用最后两个样本，灵敏但抖动，仅适合观察瞬时毛刺。
2. **Q：increase 是怎么算的？为什么不是"末值-首值"？**
   A：counter 可能重启归零，末减首会得出负数或偏小值。increase 检测 reset 并假设重启后从 0 增长到当前值补偿，同时向窗口两端外推。
3. **Q：写一条多实例聚合的 p99 查询。**
   A：`histogram_quantile(0.99, sum by (le) (rate(x_bucket[5m])))`，要点：先 rate、再按 le 聚合、最后 histogram_quantile。
4. **Q：`by` 和 `without` 的区别？**
   A：by 是白名单（保留指定标签），without 是黑名单（去掉指定标签，保留其余）。
5. **Q：两个指标标签不一致怎么相除？**
   A：用 `on(...)` / `ignoring(...)` 对齐匹配键；多对一加 `group_left`（可携带右侧标签）；必要时 `label_replace` 先改标签。
6. **Q：recording rule 什么时候用？命名惯例是什么？**
   A：查询复用多、表达式昂贵、组合复杂时固化预计算；命名 `level:metric:operations`（冒号只能出现在 rule 名中）。
7. **Q：offset 和 @ 的区别？**
   A：offset 把整个选择器的时间窗平移（查过去一段）；@ 直接取指定时间戳处的值（快照）。
8. **Q：为什么告警不建议用 irate？**
   A：irate 只看最后两个样本，单个异常抖动即可触发，误报率高；告警需要平滑窗口确认持续性（还有 for 子句兜底）。

## 11. 参考资料

- PromQL 基础：<https://prometheus.io/docs/prometheus/latest/querying/basics/>（访问日期：2026-11-04）
- 操作符（含向量匹配 on/group_left）：<https://prometheus.io/docs/prometheus/latest/querying/operators/>（访问日期：2026-11-04）
- 函数（rate/histogram_quantile/label_replace…）：<https://prometheus.io/docs/prometheus/latest/querying/functions/>（访问日期：2026-11-04）
- Recording rules：<https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/>（访问日期：2026-11-04）
- PromQL 官方教程（交互式）：<https://prometheus.io/docs/prometheus/latest/querying/examples/>（访问日期：2026-11-04）
