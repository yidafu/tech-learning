---
sidebar_position: 3
---

# 3. PromQL 详解

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

---

## 12. 工程三陷阱

下面三个陷阱全部来自真实项目的反复踩坑，共同点是查询不报错、面板能出图，只是数字悄悄错了——这比白屏更难被发现，错误结论往往已经在群里流传了半小时才有人起疑。每个陷阱按触发场景、根因、规避三段拆解。

### 12.1 陷阱一：标签集变更导致曲线断崖

**触发场景**：给 `http_requests_total` 增加一个标签（例如上线多地域后新增 `region`），或者某次重构把既有标签值改掉（`service` 从 `orders-v1` 改成 `orders`）。发布完成后，Grafana 总量面板的请求速率出现断崖式下跌，值班同学以为流量腰斩，紧急扩容了一倍机器，事后复盘才发现是查询对象的标签变了。

**根因**：Prometheus 里一条时间序列的身份等于指标名加全部标签值的组合。标签一动，等于换了一批全新的序列：旧序列停止更新但仍在存储里留到过期，新序列从零开始攒样本。`rate()` 对样本少于两个的新序列直接返回空值，聚合求和的结果自然骤降；而新旧序列短暂并存的窗口期里，`sum()` 又会把两批序列加在一起，于是面板先虚高再跳水，形态非常像一次真实事故。

**规避**：把标签集改动当作数据模型变更来管理，而不是普通的代码重构。发布前评估影响面：有哪些面板、告警、recording rule 引用了这个标签，逐个登记；发布后把观察窗口拉长到至少抓取间隔加查询窗口的两倍；旧标签集淘汰之前，在团队文档里写清交接时间点。历史对比不要拿断点前后硬比，分两条曲线并排看，并在面板标题注明标签变更时间。

### 12.2 陷阱二：对分位数结果做二次聚合

**触发场景**：总览大屏想展示"全体服务的接口延迟水平"，有人写了把几十个服务的 p99 曲线取平均的表达式，得到一条看似合理的"总体延迟"线，挂在了管理层看板上。

**根因**：分位数不是可加量。p99 的含义是九成九的观测快于这个值，把不同服务、不同流量规模的 p99 直接取平均，得到的数字不对应任何一次真实观测：大流量服务的慢请求本应主导总体体验，但在简单平均里它和小流量服务权重相同。更隐蔽的变体是先对分位数结果按标签求和再求均值之类的嵌套组合，输出彻底失去物理意义，却因为"有图"而被当作结论引用。

**规避**：想要总体分位数，必须回到桶层面先聚合再计算：先 `sum by (le) (rate(x_bucket[5m]))` 把所有服务的同名桶加总，累积桶相加仍是合法的累积分布，再交给 `histogram_quantile`。一句话记住：聚合发生在桶层，不是分位数结果层。如果确实要呈现"每个服务的 p99 概览"，用表格面板逐行展示并按值排序，不要捏造一条平均线。

### 12.3 陷阱三：抓取间隔、step、窗口三者不成整数倍

**触发场景**：抓取间隔三十秒，面板 step 被随手填成十七秒，告警表达式用了四十五秒窗口。图形出现规律性锯齿，increase 数值忽大忽小，告警时灵时不灵，团队一度怀疑采集器在丢数据。

**根因**：PromQL 每个求值点取的是回看窗口内最新一个样本，而不是该时刻的精确值；两个相邻样本之间没有插值。step 与抓取间隔不成整数倍时，不同求值点取到的样本"年龄"不一样，同一份平稳数据在图上表现为周期性波动；窗口短于两倍抓取间隔时，部分窗口只覆盖一个样本，速率函数要么算不出、要么退化成两点的粗暴差商，抖动被放大。

**规避**：三条硬规矩。第一，step 至少等于抓取间隔，并且取抓取间隔的整数倍；第二，告警窗口至少覆盖四到五个采样点，给外推补偿稳定的输入；第三，怀疑数据问题时，先用即时查询单点核对原始样本值，再对照区间查询，确认图上的点和库里的样本对得上，然后再谈函数与聚合。

## 13. 手算走查配方：rate / increase / histogram_quantile 逐步代入

本节给三个可以完全脱机完成的推演配方，全部数字当场验算。练熟之后，看到面板上的可疑数值，两分钟内就能手算出理论值，快速判断是数据坏了还是查询写错了。

### 13.1 配方 A：手算 rate，含重启补偿

样本如下（示意；抓取间隔三十秒，查询窗口零到一百四十秒，共五个样本）：

| 时刻 | 计数器值 |
| --- | --- |
| 20 秒 | 1000 |
| 50 秒 | 1060 |
| 80 秒 | 1120 |
| 110 秒 | 30 |
| 140 秒 | 90 |

第一步，找重置点。110 秒处取值三十，小于前一时刻的 1120，判定进程重启归零。重置段按"重启后从零涨到当前值"补偿，该段增量记三十。

第二步，累加各段增量。第一段 1060 减 1000 等于 60；第二段 1120 减 1060 等于 60；重置段三十；末段 90 减 30 等于 60。总增长 60 加 60 加 30 加 60 等于 210。

第三步，不外推的朴素速率。样本跨度 140 减 20 等于 120 秒，210 除以 120 等于每秒 1.75。

第四步，套外推补偿。相邻样本平均间距为 120 除以 4 等于 30 秒；窗口起点距第一个样本 20 秒，终点恰好落在最后一个样本上（距离为零），两端都小于约一点一倍间距的外推阈值，因此有效时长为 120 加 20 加 0 等于 140 秒，rate 约等于 210 除以 140 等于每秒 1.5。

自验：四段增量之和 210 无误；两个除法的商分别是 1.75 与 1.5，外推版本略小，符合"分母变大"的方向。真实实现里外推还有按计数器类型收窄的细节，精确算法以 `https://prometheus.io/docs/prometheus/latest/querying/functions/` 的 rate 小节为准，本配方追求的是数量级与方向正确。

### 13.2 配方 B：手算 increase，理解"估计值"

样本（示意；窗口零到一百二十秒，三个样本）：10 秒为 100，60 秒为 130，110 秒为 145。

朴素理解是末值减首值等于 45。但 increase 带外推：样本跨度 110 减 10 等于 100 秒，相邻间距五十秒；窗口两端各距边界十秒，均小于约一点一倍间距（五十五秒）的外推阈值，于是有效时长 100 加 10 加 10 等于 120 秒；区间速率 45 除以 100 等于每秒 0.45；最终结果 0.45 乘 120 等于 54。也就是说面板会显示"两分钟新增约 54 个请求"，大于朴素差值，而且通常不是整数——这正是第 9 节反模式第 9 条"increase 期望精确整数"的算术根源。

自验：130 减 100 等于 30，145 减 130 等于 15，合计 45；45 除以 100 等于 0.45；0.45 乘 120 等于 54，全部闭合。

### 13.3 配方 C：手算 histogram_quantile，换一组数据互验

设 `sum by (le) (rate(x_bucket[5m]))` 聚合后的各桶每秒速率为：`le="0.05"` 是 40；`le="0.1"` 是 80；`le="0.5"` 是 180；`le="1"` 是 195；`le="2.5"` 是 199；`le="+Inf"` 是 200。

第一问，求 p99。目标累积速率 0.99 乘 200 等于 198。顺序扫描桶列表，第一个不小于 198 的桶是 2.5（值为 199）。该桶区间为 (1, 2.5]，宽度 1.5 秒；桶内真实观测为 199 减 195 等于 4；需要在桶内走过的量为 198 减 195 等于 3；插值位置 3 除以 4 等于 0.75；p99 等于 1 加 0.75 乘 1.5 等于 2.125 秒。

第二问，求 p50 做互验。目标 0.5 乘 200 等于 100。第一个不小于 100 的桶是 0.5（值为 180）。区间 (0.1, 0.5] 宽 0.4 秒；桶内观测 180 减 80 等于 100；需走 100 减 80 等于 20；位置 20 除以 100 等于 0.2；p50 等于 0.1 加 0.2 乘 0.4 等于 0.18 秒。同一份数据能同时算出 p50 与 p99，说明真正理解了"目标速率落在哪个桶"这一个核心动作。

第三问，边界退化情形。把 2.5 桶的速率改成 197（小于目标 198），目标就只能落入加无穷桶，算法退化成对最大桶边界的外推，p99 输出失去参考价值。这就是第 4 节"桶边界决定精度"的具象化：想精确监控两秒级的延迟承诺，边界表里必须有 2 附近的刻度。

自验：两问的插值乘积分别是 1.125 与 0.08，加上各自区间下界后得到 2.125 与 0.18，算术闭合。

### 13.4 手算常见错误清单

对照下面几条，检查自己的推演有没有踩同样的坑，每一条都对应一次真实的评审纠错经历。其一，忘记找重置点：看见序列变小就直接末值减首值，得到负数或者偏小的结果，正确做法是先扫描一遍确认单调性再动手。其二，把窗口时长当样本跨度：窗口是查询参数，样本跨度是首尾样本的时间差，两者通常不相等，而外推补偿恰恰发生在两者的差值上，混用会让结果系统性偏差。其三，插值方向搞反：histogram_quantile 的插值走的是"桶内计数"的比例，不是"桶宽度"的比例，两者只在桶内观测恰好均匀分布时才巧合相等。其四，忘记先乘目标百分位：不乘系数直接拿全量观测数去找桶，找到的是最大值所在的桶而不是分位数所在的桶，输出会大得离谱。手算训练的意义，就是把这类错误在纸面上先消灭一遍，而不是在生产面板上第一次遇见它们。

## 14. 决策速查表

**表一：查询窗口与 step**

| 场景 | 推荐配置 | 理由 |
| --- | --- | --- |
| 告警判据 | rate 配 2 到 5 分钟窗口 | 覆盖四到五个采样点，抗单点抖动 |
| 常规流量面板 | 5 分钟窗口，step 等于抓取间隔 | 灵敏与平滑的均衡默认值 |
| 容量规划与日报 | 30 分钟到 1 小时窗口 | 抹平短周期波动看趋势 |
| 现场看毛刺 | irate 配 1 到 2 分钟窗口 | 只关心最后一跳的瞬时变化 |

**表二：函数选型**

| 需求 | 用什么 | 不要用什么 |
| --- | --- | --- |
| 每秒速率、错误率 | rate | irate（不适合告警）、直接 sum counter |
| 区间内新增总量 | increase | 末值减首值 |
| gauge 的趋势与极值 | avg_over_time / max_over_time | rate（对 gauge 无意义） |
| 重启检测 | resets 或 changes 配启动时间 | 手工找负增量 |
| 百分位延迟 | 先 sum by (le) 再 histogram_quantile | 对分位数结果再做聚合 |

**表三：聚合维度写法**

| 想回答的问题 | 写法要点 |
| --- | --- |
| 全局总量一条线 | 先 rate 再 sum，标签全部丢弃 |
| 每服务一条线 | sum by (job) 显式列出保留维度 |
| 排除实例维度 | sum without (instance) |
| 找最不均衡的实例 | max by (job) 套 sum by (job, instance) |
| 数实例个数 | count by (job) 作用在 up 上 |

**表四：要不要固化成 recording rule**

| 判断 | 结论 |
| --- | --- |
| 同一表达式出现在三个及以上面板或告警 | 固化，改一处全局生效 |
| 含 subquery 或大范围聚合且加载超过一秒 | 固化，预计算换加载速度 |
| 一次性排障查询 | 不固化，避免规则垃圾堆积 |
| SLO 多窗口燃烧率 | 拆成多层 rule 逐级构建 |

四张表解决的是"大多数时候怎么办"：表一管灵敏度，表二管函数，表三管维度，表四管预计算。遇到表外情形时，回到第 2 节与第 4 节的语义推导，从定义出发现场推一次，比在搜索结果里翻半小时更可靠——这也是本篇坚持讲透推导、而不是只堆查询模板的原因；模板会过期，定义不会。

## 15. 排查速查表

| 现象 | 可能原因 | 处置 |
| --- | --- | --- |
| 曲线断崖下跌 | 标签集变更或实例缩容 | 对比序列标签集；核对发布与扩缩容记录 |
| rate 呈周期性锯齿 | step 与抓取间隔不成整数倍；窗口过短 | step 取抓取间隔整数倍；加长窗口 |
| p99 输出无穷大 | 目标观测全部落进最大桶 | 检查桶边界是否覆盖真实延迟分布 |
| 相除后序列数量变少 | 向量匹配键不一致且无修饰符 | 用 on/ignoring 对齐；确认是否需要 group_left |
| 告警误报频繁 | 窗口太短或用了 irate | 换 rate 加长窗口，配合 for 子句兜底 |
| 查询超时、面板加载慢 | 高基数分组或大范围 subquery | 删高基数维度；下沉为 recording rule |
| 图上出现空洞 | step 大于抓取间隔或目标掉线 | 核对 step 与抓取配置；用 up 指标定位掉线目标 |
| sum 结果虚高 | 新旧标签集并存或同目标被重复抓取 | 检查双份抓取配置与标签变更时间线 |

排查的整体思路是先分清"数据问题"与"查询问题"两类：拿即时查询核对原始样本，再拿区间查询核对聚合结果，两者的差异能把嫌疑范围缩小一半以上；剩下一半再靠本表逐行对号入座。多数疑难杂症的最后答案都很朴素——某个标签变了、某个窗口太短、某次发布改了指标名。

联动阅读：告警窗口与 for 的配合细节见 [alerting.md](./alerting.md)；基数治理的系统方法见 [cardinality](../05-production/cardinality.md)；把本节查询落到实验环境见 [lab01](../../labs/lab01-prometheus-grafana/README.md)。
