---
sidebar_position: 4
---

# 4. Exporter 与应用埋点

> 指标从哪来？两条路：**exporter**（把第三方系统的指标翻译成 /metrics）与**client library**（应用代码内直接埋点）。
> 本篇覆盖 exporter 分类、node_exporter / blackbox_exporter 常用指标、中间件 exporter 一览，
> 以及 Go / Python 的完整埋点示例（含 HTTP 中间件），最后给出 RED 指标设计与命名规范。

## 1. 指标来源全景与 exporter 分类

官方 exporter 大全：<https://prometheus.io/docs/instrumenting/exporters/>（访问日期：2026-11-04）

| 分类 | 说明 | 例子 |
| --- | --- | --- |
| **直接埋点** | 应用集成 client library，自身暴露 /metrics | Go/Python/Java 应用 |
| **官方/社区 exporter（独立进程）** | 旁挂进程，把外部系统 API 翻译成指标 | node_exporter、mysqld_exporter、redis_exporter |
| **第三方系统内建 /metrics** | 系统原生支持 exposition 格式 | cAdvisor、kubelet、Traefik、Envoy、etcd、Prometheus 自身 |
| **黑盒探测 exporter** | 从外部主动探测目标 | blackbox_exporter（HTTP/TCP/DNS/ICMP） |
| **push 型** | 短任务推送 | Pushgateway（见架构篇） |

**优先级原则**：能用内建的用内建（少一个组件）；没有内建的选官方/社区 exporter；都没有才自写 exporter。

## 2. node_exporter：主机层指标

node_exporter 读取 `/proc`、`/sys` 暴露 Linux 主机指标（默认端口 9100）。注意：**在容器里跑 node_exporter，默认读到的是容器自己的 `/proc`、`/sys`**（PID/mount namespace 隔离，指标几乎全为 0 或仅容器视图）。要观测宿主机，必须把宿主的 `/proc`、`/sys` 以只读挂载进容器，并将 `--path.rootfs` 指向宿主根的挂载点（lab01 演示标准做法）。

### 2.1 CPU 相关

| 指标 | 类型 | 含义 / 典型用法 |
| --- | --- | --- |
| `node_cpu_seconds_total{cpu,mode}` | counter | 每核每模式（user/system/idle/iowait/softirq…）的累计 CPU 秒。**CPU 使用率的基础**：`1 - rate(idle)`；多核平均用 avg |
| `node_load1` / `node_load5` / `node_load15` | gauge | 1/5/15 分钟平均负载（含不可中断进程）。饱和度信号 |
| `node_procs_running` / `node_procs_blocked` | gauge | 可运行进程数 / 因 IO 阻塞的进程数 |

```promql
# CPU 使用率（非 idle 占比，多核平均）
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
```

### 2.2 内存相关

| 指标 | 含义 |
| --- | --- |
| `node_memory_MemTotal_bytes` | 总内存 |
| `node_memory_MemAvailable_bytes` | 可用内存（比 free 更接近"还能用多少"，含可回收缓存） |
| `node_memory_MemFree_bytes` | 完全空闲内存（往往偏小，别用它算使用率） |
| `node_memory_Buffers_bytes` / `Cached_bytes` | 内核缓冲/页缓存 |
| `node_memory_SwapTotal_bytes` / `SwapFree_bytes` | swap 总量/剩余（开始用 swap 常是内存压力信号） |

```promql
# 内存使用率：用 Available，不要用 Free
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
```

### 2.3 磁盘相关

| 指标 | 含义 |
| --- | --- |
| `node_filesystem_size_bytes{device,mountpoint,fstype}` | 文件系统总容量 |
| `node_filesystem_avail_bytes` | 可用空间 |
| `node_filesystem_readonly` | 是否只读挂载（变 1 常见磁盘故障征兆） |
| `node_disk_read_bytes_total{device}` / `write_bytes_total` | 读/写字节累计（速率 = 吞吐） |
| `node_disk_io_time_seconds_total{device}` | 设备做 IO 的累计秒数（速率 0~1/N，接近 1 即饱和） |
| `node_disk_io_now` | 当前在途 IO 请求数 |

```promql
# 磁盘使用率（排除伪文件系统）
100 * (1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|squashfs"}
         / node_filesystem_size_bytes{fstype!~"tmpfs|overlay|squashfs"})
```

### 2.4 网络相关

| 指标 | 含义 |
| --- | --- |
| `node_network_receive_bytes_total{device}` / `transmit_bytes_total` | 收/发字节累计（速率 = 带宽用量） |
| `node_network_receive_packets_total` / `transmit_packets_total` | 收发包数 |
| `node_network_receive_errs_total` / `transmit_errs_total` | 收发错误累计（持续增长=网卡/线路问题） |
| `node_network_receive_drop_total` / `transmit_drop_total` | 丢包累计（buffer 不足） |
| `node_netstat_Tcp_CurrEstab` | 当前 TCP 连接数（ESTABLISHED） |

```promql
# 带宽（排除回环与虚拟网卡），单位 Mbps
rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*"}[5m]) * 8 / 1e6
```

## 3. blackbox_exporter：黑盒探测

从**外部视角**探测目标可用性（默认端口 9115）。与白盒指标互补：用户关心的是"能不能访问"，blackbox 就模拟用户。

探测模块（`blackbox.yml` 中定义，Prometheus 通过 params 传入）：

| module | 用途 | 关键探测指标 |
| --- | --- | --- |
| `http_2xx` | HTTP GET 探活/性能 | `probe_duration_seconds`、`probe_http_status_code`、`probe_ssl_earliest_cert_expiry`、`probe_dns_lookup_time_seconds` |
| `tcp_connect` | 端口连通性 | `probe_duration_seconds` |
| `icmp` | ping | `probe_duration_seconds` |
| `dns` | DNS 解析 | `probe_dns_lookup_time_seconds` |

Prometheus 侧配置（blackbox 的 target 在 relabel 里传参）：

```yaml
scrape_configs:
  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com/health
    relabel_configs:
      - source_labels: [__address__]        # 原目标地址存入参数
        target_label: __param_target
      - source_labels: [__param_target]     # 保留原始地址为 instance 标签
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115 # 真正抓取的地址是 exporter 自己
```

高频用法：站点可用性 `probe_success == 0` 告警、证书到期 `probe_ssl_earliest_cert_expiry - time() < 14d` 告警、DNS 慢 `probe_dns_lookup_time_seconds`。

## 4. 中间件 exporter 一览

| 系统 | exporter | 端口（默认） | 必看指标示例 |
| --- | --- | --- | --- |
| MySQL | mysqld_exporter | 9104 | `mysql_global_status_threads_connected`、`mysql_global_status_slow_queries`、`mysql_exporter_collector_success` |
| PostgreSQL | postgres_exporter | 9187 | `pg_stat_database_numbackends`、`pg_stat_database_deadlocks` |
| Redis | redis_exporter | 9121 | `redis_connected_clients`、`redis_memory_used_bytes`、`redis_keyspace_hits_total` / `misses_total`（命中率） |
| Nginx（stub_status） | nginx_exporter | 9113 | `nginx_connections_active`、`nginx_connections_reading/writing` |
| Kafka | kafka_exporter（消费组 lag） | 9308 | `kafka_consumergroup_lag`（积压告警核心） |
| MongoDB | mongodb_exporter | 9216 | `mongodb_connections`、`mongodb_op_counters_total` |
| RabbitMQ | 内建插件 rabbitmq-prometheus | 15692 | `rabbitmq_queue_messages_ready`（堆积） |
| 云/云原生 | cAdvisor / kube-state-metrics | 8080 / 8080 | `container_cpu_usage_seconds_total`、`kube_pod_status_phase` |

选型入口（官方整合列表）：<https://prometheus.io/docs/instrumenting/exporters/>（访问日期：2026-11-04）。

## 5. 应用内埋点：client library

### 5.1 Go 完整示例（net/http 中间件）

```go
// main.go —— Go 应用 RED 指标埋点（prometheus/client_golang）
package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// Rate：请求计数（counter）
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total", // 惯例：counter 以 _total 结尾
			Help: "HTTP 请求总数",
		},
		[]string{"method", "path", "status"}, // 标签：path 必须是路由模板而非原始 URL！
	)
	// Duration：耗时直方图（histogram）
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds", // 单位放名字：seconds
			Help:    "HTTP 请求耗时分布",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path"},
	)
	// Errors：错误计数（可从 requests_total 派生，单列更直观）
	httpRequestErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_request_errors_total",
			Help: "HTTP 5xx 错误数",
		},
		[]string{"method", "path"},
	)
)

// metricsMiddleware 通用埋点中间件：一次包裹，全部接口生效
func metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rw, r)

		elapsed := time.Since(start).Seconds()
		path := routePattern(r) // 拿路由模板，如 /api/orders/{id}
		httpRequestsTotal.WithLabelValues(r.Method, path, strconv.Itoa(rw.status)).Inc()
		httpRequestDuration.WithLabelValues(r.Method, path).Observe(elapsed)
		if rw.status >= 500 {
			httpRequestErrors.WithLabelValues(r.Method, path).Inc()
		}
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func routePattern(r *http.Request) string { return r.URL.Path } // 简化：生产请用路由模板

func main() {
	prometheus.MustRegister(httpRequestsTotal, httpRequestDuration, httpRequestErrors)

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler()) // 暴露 /metrics
	mux.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"orders": []}`))
	})
	http.ListenAndServe(":8080", metricsMiddleware(mux))
}
```

要点：`statusWriter` 包装是为了**捕获真实状态码**（Handler 不返回它）；`path` 用路由模板防高基数；`Observe` 接秒。

### 5.2 Python 完整示例（lab01 采用同款思路，FastAPI + middleware）

```python
# app.py —— Python RED 埋点（prometheus_client）
import time
from prometheus_client import Counter, Histogram, start_http_server

REQUESTS = Counter(
    "http_requests_total",
    "HTTP 请求总数",
    ["method", "path", "status"],
)
DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP 请求耗时分布",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

def instrument(method: str, path: str, status: int, elapsed: float):
    """埋点函数：中间件/装饰器调用。labels() 每次调用代价高，
    高性能场景可缓存 label 实例（prometheus_client 内部有优化，一般够用）。"""
    REQUESTS.labels(method=method, path=path, status=str(status)).inc()
    DURATION.labels(method=method, path=path).observe(elapsed)

# 业务代码中：
start = time.perf_counter()
# ... 处理请求 ...
instrument("GET", "/api/orders", 200, time.perf_counter() - start)

# 单独线程暴露 /metrics（默认 8000 端口，与业务端口分离）
start_http_server(8000)
```

框架化（FastAPI）时用 `@app.middleware("http")` 统一包裹（lab01 有完整可运行版本）。

### 5.3 自定义 Collector（了解）

对"只能从管理接口拉全量状态"的系统（如内部网关），可实现自定义 Collector：把现有状态数据**翻译**成指标。注意必须幂等、快速，且优先用 client library 的 `Gauge/Counter` 注册而非直接拼文本。

## 6. RED 指标设计

RED 是服务监控的标准视图（Tom Wilkie 提出，微服务场景最常用），另有资源视角的 USE（Utilization/Saturation/Errors）：

| RED | 回答 | 指标 | PromQL 形态 |
| --- | --- | --- | --- |
| **Rate**（速率） | 流量多大 | `http_requests_total` | `sum by (job)(rate(http_requests_total[5m]))` |
| **Errors**（错误） | 错多少 | 同上按 status 过滤 | `5xx / 全部`（比率比绝对数更可比） |
| **Duration**（耗时） | 多快 | histogram | `histogram_quantile(0.99, sum by(le)(rate(..._bucket[5m])))` |

设计清单：

1. 每个服务至少一组 RED 指标，标签统一 `method + 路由模板 + status`。
2. **不加** user_id / request_id / 原始 query string。
3. duration 用 histogram（要聚合 p99），单位秒。
4. 错误同时保留绝对 counter（可告警）与派生比率（可看板）。
5. 外部依赖（DB/缓存/下游 RPC）同样各一组 RED——故障时才能快速定位"慢在哪一层"。

USE 方法（Brendan Gregg，面向资源）：Utilization（利用率）、Saturation（饱和度，如队列/负载）、Errors（错误数）。主机层监控（node_exporter 那节）本质就是 USE。

## 7. 命名最佳实践

官方规范：<https://prometheus.io/docs/practices/naming/>（访问日期：2026-11-04）

### 7.1 规则清单

1. **指标名**：`<命名空间>_<域>_<单位/语义>` 小写下划线，如 `http_request_duration_seconds`。
2. **counter 一律 `_total` 结尾**（OpenMetrics 强制）：`http_requests_total`。
3. **单位进名字**：`_seconds`、`_bytes`、`_requests`、`_errors`；**禁止** `_ms`、`_kb`（非基础单位）、`_seconds_total`（histogram 的 sum/count 后缀自动追加，不要手动重复）。
4. **比率用 ratio（0~1）**：`memory_usage_ratio` 而非 `memory_usage_percent`；百分比交给 Grafana unit。
5. **标签名**：小写驼峰禁用、用下划线；语义标签（`job`/`instance` 由系统占用）。
6. **标签值**：有界集合；status 用 `"200"`/`"500"`，method 用大写 `"GET"`（社区惯例）。
7. histogram 的 bucket/sum/count 由 client 自动生成，**不要自己再造**。

### 7.2 好名字 vs 坏名字

| 坏 | 好 | 原因 |
| --- | --- | --- |
| `reqs` | `http_requests_total` | 缺命名空间、缺类型后缀 |
| `latency_ms` | `http_request_duration_seconds` | 毫秒非基础单位；duration 比 latency 语义明确 |
| `error_percent` | `http_request_errors_total`（派生比率） | 客户端预计算比率锁死了窗口 |
| `data` | `node_filesystem_size_bytes` | 单位缺失 |

## 8. 常见坑（FAQ）

1. **path 标签用原始 URL**：`/orders/12345`、`/orders/98765`……序列爆炸。必须用路由模板 `/orders/{id}`。
2. **status 用 int 而非 string**：prometheus_client 的 labels 接受 str，int 会报错或隐式转换不一致；统一 `str(status)`。
3. **在 except 里埋错误指标但不 re-raise**：吞异常导致指标有了、日志没了，排障信息减半。
4. **/metrics 端口暴露在公网**：指标可能含内网拓扑信息。容器网络内访问即可，或加基本认证（client_golang 有 promauth、Python 用反向代理）。
5. **node_exporter 容器看到的是容器自己的 /proc**：没挂宿主 `/proc:/host/proc` + `--path.procfs=/host/proc`（新版统一用 `--path.rootfs`），指标全是容器视角。
6. **Exporter 起不来/部分 collector 失败没发现**：盯 `up` 与 exporter 自身的 `*_collector_success` / `*_scrape_errors_total`。
7. **middleware 里 labels() 在请求路径上每次创建**：极端高 QPS 下有开销；可对固定 label 组合缓存 `.labels()` 返回值。
8. **blackbox 探测打生产接口产生写流量**：probe 用 GET 只读路径；注意频率（默认 15s 足够）。
9. **histogram 桶照抄默认值与业务无关**：接口 P99 在 80ms，默认桶最细 0.005~0.1 之后直接跳 0.25，插值失真。按 SLO 定桶。

## 9. 面试题小结

1. **Q：exporter 与 client library 的区别与选择？**
   A：client library 在应用进程内埋点（细粒度、含业务维度）；exporter 独立进程翻译外部系统指标（不改被监控系统代码）。能内建优先内建，不能则官方 exporter，最后自写。
2. **Q：node_exporter 的 CPU 使用率怎么算？为什么用 MemAvailable 而不是 MemFree？**
   A：`1 - rate(node_cpu_seconds_total{mode="idle"})`（多核再 avg）；MemAvailable 含可回收缓存，反映"还能给进程多少"，MemFree 在页缓存大的机器上误导。
3. **Q：blackbox 与白盒监控的差别？**
   A：blackbox 从外部探测，视角=用户，验证"端到端可用"；白盒读内部指标，用于定位根因。两者互补，可用性告警优先 blackbox 视角。
4. **Q：RED 是什么？为什么这么流行？**
   A：Rate/Errors/Duration 三个维度覆盖服务对外表现的全部核心问题（多大流量、错多少、多快），标签统一即可横向覆盖所有微服务，是服务监控的事实标准模板。
5. **Q：为什么 path 标签必须用路由模板？**
   A：原始 URL 含参数，标签值无界 → 时间序列数爆炸（高基数）。路由模板保证标签取值集合有限。
6. **Q：counter 为什么必须 `_total` 结尾？单位为什么强制 seconds/bytes？**
   A：`_total` 是 OpenMetrics 对 counter 的强制约定，工具链依赖它识别类型；基础单位全局统一后，跨指标运算（sum/比/乘）不需要换算，展示层再由 Grafana 换算单位。

## 10. 参考资料

- Exporters and integrations（官方列表）：<https://prometheus.io/docs/instrumenting/exporters/>（访问日期：2026-11-04）
- node_exporter：<https://github.com/prometheus/node_exporter>（访问日期：2026-11-04）
- blackbox_exporter：<https://github.com/prometheus/blackbox_exporter>（访问日期：2026-11-04）
- client_golang：<https://github.com/prometheus/client_golang>；prometheus_client(Python)：<https://github.com/prometheus/client_python>（访问日期：2026-11-04）
- 命名最佳实践：<https://prometheus.io/docs/practices/naming/>（访问日期：2026-11-04）
- RED 方法：Tom Wilkie《RED Method: How to instrument your services》<https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/>（访问日期：2026-11-04）
- USE 方法：Brendan Gregg <http://www.brendangregg.com/usemethod.html>（访问日期：2026-11-04）

---

## 11. 工程三陷阱

前文 §8 的 FAQ 收录的是"现象级"小坑，这一节把三个会造成系统性损失的陷阱按「触发场景 → 根因 → 规避」完整展开。它们共享一个特征：**出问题时没有任何报错，只有数据在悄悄变差**，等你发现时损失已经发生。

### 陷阱一：一个"临时"标签把基数打爆

**触发场景**：为了排查一次线上问题，开发顺手在 `http_requests_total` 上加了 `user_type` 标签（当时只有三个取值）。问题解决后没人记得删。三个月后市场接入一个新的开放注册渠道，`user_type` 开始携带外部输入的渠道编号，标签值从 3 涨到上万；`prometheus_tsdb_head_series` 一路爬升，Prometheus 内存告警、查询开始超时，最后只能紧急回滚或在采集端裁剪。

**根因**：基数风险从来不在"这个标签**现在**有几个值"，而在"这个标签的取值**由谁决定**"。三个取值、由代码里的枚举决定的标签是安全的；三个取值、但未来会被塞进外部输入的标签是定时炸弹。评审时只看当下取值数，就会漏判——因为爆炸发生在未来的某次业务变更里，而不是埋点代码本身。

**规避**：
1. 评审时对每个标签回答两个问题：取值集合由谁维护？上限写在哪份约定里？答不上来就按无界处理。
2. 外部输入（渠道号、商户号、错误文案、URL 参数）一律不许直接做标签。确实需要这个维度，先收敛成有界分类（如"自有/投放/合作"三类）再进标签，明细放日志。
3. 上线后持续巡检：用 `topk(20, count by (user_type) (http_requests_total))` 观察标签值数量，并对 `prometheus_tsdb_head_series` 的环比增长设告警。
4. 事后补救手段是采集端 metricRelabelings（drop 或改写标签），但那意味着污染数据已经入库一段时间——把拦截做在 PR 评审，成本最低。基数治理的完整手段见 [cardinality.md](../05-production/cardinality.md)。

### 陷阱二：中间件没兜 panic，错误率被系统性低估

**触发场景**：错误率大盘常年接近零，但用户投诉、工单和日志里的异常数量明显对不上。值班同学按"先看指标再翻日志"的标准流程走，每一轮结论都是"指标正常"，于是排障方向被整体带偏。

**根因**：埋点中间件的计数代码写在 `next.ServeHTTP` **之后**。handler 一旦 panic，控制流直接被上层的 recover 接走，中间件后半段的 `Inc()` 根本不执行——这类请求既不计入总数、也不计入错误，错误率被系统性低估。再叠加一个细节：`statusWriter` 把初始状态码设成 200，只要 handler 没显式调用 `WriteHeader`，"写了半个响应就崩"的请求也会被记成成功。两个因素相乘，指标从"偏低"变成"失真到不可信"。

**规避**：
1. 中间件里加 `defer` 的 recover 分支：在分支里补计一次 5xx、写异常日志，再决定是否继续上抛或转成 500 响应。异常日志一条都不能少，否则回到 §8 坑 3 的老问题。
2. `statusWriter` 初始状态码设为 0 而非 200：请求结束时仍是 0，说明 handler 没有写出任何响应，单独按"未完成"状态计数——宁可多一条序列，也不要静默美化。
3. 建立对账机制：blackbox 探测失败率（§3）与白盒错误率长期背离，就是埋点有系统性遗漏的信号。两个视角每天都会出现在同一块大盘上，背离一眼可见。

### 陷阱三：指标改名，告警与面板"无声死亡"

**触发场景**：服务重构时把 `http_request_duration_seconds` 改成更"贴业务"的 `order_request_duration_seconds`。上线后没有任何报错——但 Grafana 面板空白、告警规则匹配不到任何序列。恰好当天有发布在扩容，整个发布过程所有监控盲飞。

**根因**：指标名是监控系统与代码之间的**契约**。Prometheus 里新旧名字是两条完全独立的时间序列，不会自动续接；所有引用旧名的告警规则、recording rule、面板 JSON 全部静默失效。而"监控变更"通常不在发布评审的检查范围里，于是出现"代码改了、没人知道监控坏了"的最坏组合：失效本身不产生任何信号。

**规避**：
1. 把指标名当公共 API 对待：改名属于破坏性变更，PR 描述必须列出全部引用点（告警规则、recording rule、dashboard JSON、runbook）并同步修改，评审人逐项核对。
2. 确需迁移时双写过渡一两个发布周期：新旧名字并存，先把消费方切到新名字并观察一周，再删旧埋点。
3. 给核心指标配存在性告警兜底：`absent(http_request_duration_seconds)` 这类表达式在指标消失时触发。"监控挂了"本身必须是一条告警，这是最后的安全网。

**怎么发现已经踩了**：面板报"No data"而服务明明正常时，先做一次名字比对——把面板与告警规则里引用的指标名，和 `curl /metrics` 的实际输出逐一对照，名字级漂移（改名、后缀 `_total` 丢失、大小写不一致）一眼可见。把它做成发布前脚本：从 dashboard JSON 与告警规则中提取指标名清单，在目标 /metrics 里逐一核对，缺一个就拦下发布。这条检查与 §14 检查单最后一条是一件事的两个阶段（评审时人工过、发布前机器拦）。

## 12. 手算/走查配方

### 配方一：histogram 分桶手算 P95（histogram_quantile 的内部逻辑）

`histogram_quantile` 不是黑盒，它做的是"定位桶 + 桶内线性插值"两步。走查一遍，你会立刻明白为什么桶必须按 SLO 设计。

**第 1 步，准备数据（示意值）**。某 5 分钟窗口内 `http_request_duration_seconds_bucket` 的 rate 结果：

| le（桶上限，秒） | 累计计数 |
| --- | --- |
| 0.1 | 50 |
| 0.5 | 180 |
| 1 | 195 |
| +Inf | 200 |

`_bucket` 是**累计**的：`le="0.5"` 的 180 表示"耗时不超过 0.5s 的请求共 180 个"，已经包含 `le="0.1"` 的那 50 个；总样本数取 `+Inf` 桶，即 200。

**第 2 步，定位桶**。目标分位 q=0.95，rank = 0.95 × 200 = 190。从左向右找第一个累计数 ≥ 190 的桶：0.1 桶只有 50，不够；0.5 桶 180，不够；1 桶 195，够了。P95 落在 (0.5, 1] 区间。

边界特例走查：若 q 取 0.9，rank = 0.9 × 200 = 180，恰好等于 `le="0.5"` 桶的累计数——这时不需要插值，结果就是该桶上沿 0.5s 整。换句话说，**分位数落在桶边界上时估计是无误差的**，这正是配方三把 SLO 值放进桶边界的数学依据；反过来说，真实值离桶边界越远，插值失真的空间越大。

**第 3 步，桶内插值**。在这个桶里还要"再走" 190 − 180 = 10 个样本；桶内总增量 195 − 180 = 15；桶宽 1 − 0.5 = 0.5。插值公式与代入：

P95 = 桶下沿 + (桶内名次 ÷ 桶内增量) × 桶宽 = 0.5 + (10 ÷ 15) × 0.5 ≈ 0.5 + 0.667 × 0.5 ≈ 0.833 秒

自验算：10 ÷ 15 = 0.6667；0.6667 × 0.5 = 0.3333；0.5 + 0.3333 = 0.8333。`histogram_quantile` 返回的就是同一个数。

**第 4 步，读出设计含义**。0.833s 是"假设桶内均匀分布"得到的估计值。如果真实样本挤在桶的上沿（比如这 15 个里有 12 个都接近 1.0s），估计值会明显偏低。因此工程上把 SLO 阈值本身设为桶边界：SLO 是"P95 < 1s"就让 1 成为边界——是否越线直接看累计数，插值误差不再影响判断。PromQL 语法细节见 [promql.md](promql.md)，SLO 与错误预算的衔接见 [slo.md](../04-integration/slo.md)。

### 配方二：counter 重置时 rate 的推演

一组抓取样本（示意，抓取间隔 15s）：

| 时刻 | 0s | 15s | 30s | 45s | 60s |
| --- | --- | --- | --- | --- | --- |
| counter 值 | 100 | 105 | 110 | 2 | 9 |

t=45s 处值从 110 跳到 2：进程重启，counter 归零重计，这就是 **counter reset**。`rate()` 的处理规则：相邻两点的差值为负时判定发生重置，改用重置后的**新值本身**作为该段增量——重启前的计数无法恢复，新值就是重启后已经累计的量。

逐段走查：0→15s 增量 5；15→30s 增量 5；30→45s 差值 2−110 为负，记 +2；45→60s 增量 7。窗口内总增量 = 5 + 5 + 2 + 7 = 19；覆盖 4 个采样间隔共 60s；rate ≈ 19 ÷ 60 ≈ 0.32（次/秒）。自验算：19 ÷ 60 = 0.3167，四舍五入到两位小数即 0.32。

两个工程推论：其一，每次重置都丢一段计数，重置越频繁 rate 越偏低——频繁重启的服务其 QPS 曲线不可信，先修稳定性再谈指标；其二，`increase()` 与 `rate()` 同源同规则，`increase(x[1m])` ≈ `rate(x[1m]) × 60`，区别只是"次数"与"每秒"两种形态。数据模型层面的解释见 [data-model.md](data-model.md)。

### 配方三：按 SLO 定桶的三步推演

设 SLO 为"P95 < 300ms"，压测显示主要耗时集中在 50~400ms：

1. **SLO 进桶**：把 0.3 设为桶边界，保证"是否越线"零插值误差——这是唯一不可妥协的一条。
2. **高频区加密**：0.05、0.1、0.2、0.3、0.4、0.5 六档覆盖主体分布，插值误差控制在相邻档距内。
3. **长尾留档**：1、2.5、10 三档覆盖慢请求尾部，不为极端值铺一堆桶——每个桶都是一条时间序列，尾部桶的边际信息量很低。

### 配方四：采集健康三件套巡检

exporter 装好不等于采到了。每新接一个 exporter，按这四步走查：

1. **up**：`up{job="redis"}` 必须恒为 1；为 0 表示抓取完全失败（网络不通、端口不对、服务发现没找到目标）。这是 §8 坑 6 的第一步排查项。
2. **抓取耗时**：`scrape_duration_seconds` 的 P99 应远小于抓取间隔；一旦逼近间隔，说明 exporter 响应慢或目标暴露的指标太多，容易出现超时与样本缺口。
3. **样本规模**：`scrape_samples_scraped{job=...}` 突增通常意味着对面新增了指标或基数暴涨，及时对账，别等 Prometheus 内存告警才发现。
4. **exporter 自报健康**：多数官方 exporter 提供 `*_collector_success`（1 正常 / 0 失败）与 `*_scrape_errors_total`。注意"部分 collector 失败时 up 仍为 1"——只有自报指标能暴露这种"半失明"状态（§8 坑 6 的第二层）。

四项各配一条告警，exporter 层的问题就不会与业务问题混作一团。

上线一周后回检：若 `histogram_quantile` 的输出长期贴着某个桶边界波动，说明该区间失真，加一档即可。桶的取舍要与告警窗口（见 [alerting.md](alerting.md)）一起评审，因为分位数告警的灵敏度同时取决于桶和窗口。

**附带一笔基数账**：桶数 × 标签组合数 = 序列数。配方三的 9 档加上隐含的 +Inf 共 10 个桶，若服务有 20 条路由模板、4 种 method，单个实例的 duration 序列 = 10 × 20 × 4 = 800 条（histogram 还各带一条 `_sum`、一条 `_count`，实际更多）。所以"高频区加密"不是免费的：加密前先算这笔账，必要时只对核心路由加密、其余路由共用粗桶。自验算：10 × 20 × 4 = 800。

## 13. 决策速查表

**表一：指标从哪来（exporter 选型）**

| 处境 | 首选 | 理由与代价 |
| --- | --- | --- |
| 目标系统自带 /metrics | 直接抓 | 零新增组件；先确认指标覆盖是否够用再定 |
| 无内建，有官方/社区 exporter | 独立 exporter | 口径成熟、社区维护；多一个进程要管端口、版本与自监控 |
| exporter 指标冗余 | 官方 exporter + 采集端裁剪 | 不要 fork 改源码，用 metricRelabelings 控制入库量 |
| 内部系统只有管理接口 | 自写 Collector | 用 client library 的 Gauge/Counter 承载，翻译逻辑要幂等且快速（§5.3） |
| 要验证"用户视角"可用性 | blackbox_exporter | 白盒说"我没病"、黑盒说"用户能用"，互补不互替（§3） |
| 一次性短任务要出指标 | Pushgateway | 只服务批处理场景；常驻服务禁用，原因见 [prometheus-architecture.md](prometheus-architecture.md) |

**表二：抓取间隔怎么定**

| 对象 | 建议 | 说明 |
| --- | --- | --- |
| 常规业务服务 | 15s~30s | 告警窗口按间隔的 4 倍起步，保证窗口内样本充足 |
| 控制面组件（etcd、apiserver） | 30s | 变化慢，缩短间隔收益低、压力大 |
| 容量与成本类指标 | 60s | 长趋势不需要秒级精度 |
| blackbox 探测 | 15s~30s | 注意探测频率与只读路径（§8 坑 8） |

**表三：histogram 桶是否自定义**

| 场景 | 建议 |
| --- | --- |
| SLO 恰好落在默认桶边界 | 沿用默认桶，省一次评审 |
| SLO 不在任何边界上 | 必须自定义，且 SLO 值设为桶边界 |
| 已知典型分布区间 | 高频区加密、长尾稀疏（配方三） |
| 完全没把握 | 先上默认桶观察一周分布，再调整 |

**表四：错误指标怎么设计**

| 决策点 | 建议 | 理由 |
| --- | --- | --- |
| 告警用绝对数还是比率 | 比率告警，绝对数兜底 | 比率跨实例可比；低流量时段比率易抖动，绝对数补盲区 |
| 单独 errors 指标还是从 status 过滤 | 两者都留 | 单独指标语义直白、可直接告警；status 维度支撑按状态码分解 |
| 4xx 算不算错误 | 不计入错误率，单列序列 | 4xx 多是调用方问题，混入会稀释甚至掩盖 5xx |
| 慢但成功算不算错误 | 不算错误，另设延迟分位告警 | 慢是 Duration 维度的问题，别混进 Errors（§6 的 RED 分工） |

命名与单位层面的规则（与上面四张表配套使用）已在 §7 收录，官方文档入口为 `https://prometheus.io/docs/` 的 Instrumenting 与 Practices 章节。

## 14. code review 检查单

评审埋点相关 PR 时逐条过（涉及改名/删除的 PR 加做最后一条）：

- [ ] 每个标签的取值集合有界且来源可控？路由类标签用的是模板而非原始 URL？
- [ ] counter 以 `_total` 结尾、单位进名字（`_seconds`/`_bytes`）？没有预计算的百分比指标？
- [ ] duration 用 histogram 且桶覆盖 SLO 边界？没有用 gauge 或 summary 记需要跨实例聚合的分位数？
- [ ] status 标签统一字符串化？错误计数与总请求计数来自同一中间件、同一过滤范围（口径一致才能做比率）？
- [ ] 中间件有 panic 兜底：recover 分支补计错误、保留异常日志、不吞调用栈？
- [ ] /metrics 监听地址不暴露公网，共用业务端口时有明确的安全前提说明？
- [ ] 每个新指标有一句话 Help，讲清"是什么、单位是什么"？
- [ ] 有最小验证凭据：本地 `curl /metrics` 能看到新指标且标签值符合预期（贴一条样例）？
- [ ] 业务 RED 与外部依赖（DB/缓存/下游 RPC）的 RED 分开命名，没有混用一套指标？
- [ ] 若涉及指标改名/删除：告警规则、recording rule、dashboard 引用是否全部同步更新？
