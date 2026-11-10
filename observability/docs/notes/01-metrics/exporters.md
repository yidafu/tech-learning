---
sidebar_position: 4
---

# Exporter 与应用埋点

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
