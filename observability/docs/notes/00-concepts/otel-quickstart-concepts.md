---
sidebar_position: 5
---

# 5. OpenTelemetry 核心对象速查（Quickstart Concepts）

> 阶段 0 · 概念基础 / 笔记 5
>
> 一句话总结：三种信号的 SDK 都是同一个套路——**Provider 全局装配 → 拿 Instrument（Tracer/Meter/Logger）→ 产生记录 → Processor 批处理 → Exporter 发出去**，而把它们跨进程串起来的是 context 传播。

---

## 目录

1. [核心对象一览：Provider / Instrument / Record](#1-核心对象一览provider--instrument--record)
2. [Context 传播](#2-context-传播)
3. [Exporter](#3-exporter)
4. [Processor](#4-processor)
5. [采样器概念预览](#5-采样器概念预览)
6. [信号从应用到后端的全链路图](#6-信号从应用到后端的全链路图)
7. [常见误区](#7-常见误区)
8. [面试常见问题小结](#8-面试常见问题小结)
9. [参考资料](#9-参考资料)

---

## 1. 核心对象一览：Provider / Instrument / Record

三种信号的对象严格平行，对照记忆：

| | Traces | Metrics | Logs |
| --- | --- | --- | --- |
| **Provider（装配点，全局一次）** | `TracerProvider` | `MeterProvider` | `LoggerProvider` |
| **Instrument（工厂/仪表，按库名取用）** | `Tracer`（以 scope 命名） | `Meter` → Counter / Histogram / Gauge / ObservableCounter… | `Logger` |
| **Record（产生的记录）** | `Span`（含树结构） | Measurement（随时间聚合成时间序列） | `LogRecord` |
| **导出单位** | ReadableSpan | Metric（聚合后的数据点，含属性维度） | LogRecord |
| **典型 SDK 处理器** | `BatchSpanProcessor` | `PeriodicExportingMetricReader` | `BatchLogRecordProcessor` |

### 1.1 Provider：全局装配点

Provider 持有 Resource、Sampler、Processor 链，是 SDK 的"总开关"。**每个进程每种信号一个全局 Provider**，在应用启动时装配（通常在 main/import 早期），之后库代码只通过 API 取用：

```python
# lab00/app/app.py 的真实装配骨架（Python）
import logging

from opentelemetry import trace, metrics, _logs
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

resource = Resource.create({"service.name": "lab00-app", "service.version": "0.1.0"})

# --- Traces ---
tp = TracerProvider(resource=resource)
tp.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))     # 默认 OTLP endpoint 走 env
trace.set_tracer_provider(tp)

# --- Metrics ---
mp = MeterProvider(resource=resource,
                   metric_readers=[PeriodicExportingMetricReader(OTLPMetricExporter(),
                                                                 export_interval_millis=5000)])
metrics.set_meter_provider(mp)

# --- Logs：把 stdlib logging 桥接为 OTel LogRecord ---
lp = LoggerProvider(resource=resource)
lp.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))
_logs.set_logger_provider(lp)
logging.getLogger().addHandler(LoggingHandler(level=logging.INFO, logger_provider=lp))
```

要点：

- **先装配再使用**：Provider 未装配时 API 返回 no-op 对象（不报错、也不出数据——最常见的"为什么没数据"原因之一）；
- 三种 Provider 共享同一个 Resource（`service.name` 一致，后端才能把三种信号对上号）；
- **退出时要 `shutdown()`**：批处理器里有未发送的缓冲数据，进程直接被 kill 会丢最后一批。

### 1.2 Instrument：以 Scope 命名的"仪表"

```python
tracer = trace.get_tracer("shop.checkout", "1.0.0")   # scope name + version
meter  = metrics.get_meter("shop.checkout", "1.0.0")
logger = logging.getLogger("shop.checkout")           # logs 侧 scope 即 logger 名
```

scope（name+version）会作为 `otel.scope.name/otel.scope.version` 随数据导出，用于区分"这段 span 是 flask 插桩产生的还是业务代码产生的"。

### 1.3 记录的产生：以 span 为例

```python
with tracer.start_as_current_span("checkout") as span:      # 进入作用域自动挂到 context
    span.set_attribute("shop.order.id", "A-1029384")        # 结构化属性（低/高基数皆可）
    span.set_attribute("shop.payment.method", "credit_card")
    span.add_event("coupon_applied", {"coupon.code": "BLACKFRIDAY"})   # 时间点事件
    try:
        pay()
    except PaymentError as e:
        span.record_exception(e)                            # 记录异常（exception.* 属性）
        span.set_status(trace.Status(trace.StatusCode.ERROR, "payment failed"))
        raise
# 离开 with 块，span 自动 end，随后交给 Processor 链
```

Metrics 侧的仪表（阶段 1 深入，先认识四个）：

```python
request_count = meter.create_counter("app.request.count", unit="{request}",
                                     description="处理完成的请求数")
duration_hist = meter.create_histogram("app.request.duration", unit="s",
                                       description="请求耗时分布")
request_count.add(1, attributes={"route": "/order", "status": "200"})   # 属性=指标维度
duration_hist.record(0.182, attributes={"route": "/order"})
```

## 2. Context 传播

### 2.1 隐式 context：为什么 span 能"自动"串起来

SDK 里有一个**进程内全局的 Context**（Python 里基于 contextvars，Go 里显式传 `context.Context`）。`start_as_current_span` 会把新 span 设为"当前 span"；同线程内后续所有 `start_*` 调用默认以它为父——这就是你不用手动传 parent 的原因。

```mermaid
flowchart TD
    M["main"] --> A["span A (current)"]
    A -->|"调用 f()：进程内自动以 A 为父"| B["span B (current)"]
    B --> C["HTTP 调用下游：需要“跨进程”传播"]
```

### 2.2 跨进程传播：inject / extract + Propagator

跨进程时，把 context 塞进请求头（**inject**），对端再从请求头取回（**extract**）：

```python
# 客户端：发请求前注入
from opentelemetry.propagate import inject
headers = {}
inject(headers)                      # 默认 W3C TraceContext + baggage
requests.post(url, headers=headers)  # headers 里已带 traceparent

# 服务端：收到请求后提取
from opentelemetry.propagate import extract
ctx = extract(request.headers)
with tracer.start_as_current_span("POST /orders", context=ctx):   # 以远程 span 为父
    ...
```

默认协议是 **W3C Trace Context** 的 `traceparent` 头：

```text
traceparent: 00-3382e10b1b4c6f5d8c0a4e2f1a3b4c5d-5b8ad3c7d1e94f2a-01
             │  └──────────── trace_id (32 hex / 16 字节) ─────┘ └─ parent_id ─┘ └└ flags: bit0=采样
             └ version
tracestate:  vendor1=opaque-value          # （可选）厂商扩展信息
baggage:     user.plan=pro,experiment=zz9  # （另一个独立头）业务键值上下文
```

<!-- 保留原图：traceparent/tracestate/baggage 头格式标注示例，属协议格式示例输出，非概念示意图 -->

三个易错点：

1. `trace_id`/`span_id` 是 **hex 字符串**，全程小写、长度固定（32/16），别自造格式；
2. **任何一环没 inject/extract，链路就断在那里**——常见断点：自研 HTTP client 封装、消息队列（要把 context 塞进消息 header）、异步线程/协程（Python 的 contextvars 在新线程要显式复制 context）、跨存储中转（把 trace_id 落库再取回，用 `links` 关联而非 parent）；
3. `baggage` 与 trace 传播是**两条独立通道**（两个头），baggage 装业务标签、会全链路传播，**不要放敏感信息**。

## 3. Exporter

### 3.1 SDK 侧 Exporter：把记录编码发出

| Exporter | 用途 |
| --- | --- |
| `OTLPSpanExporter` / `OTLPMetricExporter` / `OTLPLogExporter` | **生产标配**：OTLP（gRPC 或 HTTP）发给 Collector/后端 |
| `ConsoleSpanExporter` 等 | 打印到 stdout，学习/调试用（lab00 里 Collector 的 `debug` exporter 起类似作用，但发生在 Collector 侧） |
| Jaeger / Zipkin / Prometheus exporter | 直连传统后端（可省掉 Collector，但失去解耦层，不推荐新项目使用） |

OTLP 目标通常用环境变量配置（跨语言一致，运维友好）：

| 环境变量 | 作用 | 示例 |
| --- | --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 所有信号的统一端点 | `http://otel-collector:4317`（gRPC）|
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` 或 `http/protobuf` | `grpc` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | 仅 traces 覆盖 | `http://collector:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | 附带头（如鉴权 token） | `api-key=xxx` |
| `OTEL_SERVICE_NAME` | 覆盖 `service.name` | `order-api` |
| `OTEL_TRACES_SAMPLER` 等 | 采样配置（见第 5 节） | `parentbased_always_on` |

### 3.2 注意：SDK Exporter ≠ Collector Exporter

同名但不同层：

```mermaid
flowchart LR
    A["SDK 的 exporter（进程内）<br/>Span/Metric/LogRecord"] -->|"OTLP"| B["Collector"]
    C["Collector 的 exporter（进程外）<br/>TraceData/MetricData/LogData"] -->|"多协议"| D["后端<br/>（otlp/debug/file/prometheus/…）"]
```

## 4. Processor

### 4.1 SDK 侧 Processor（每条记录流过）

| SDK Processor | 行为 |
| --- | --- |
| `SimpleSpanProcessor` | 同步逐条导出：**仅用于开发调试**（阻塞、低效，但即时可见） |
| `BatchSpanProcessor` | **生产默认**：攒批 + 后台线程发送（默认约 5s / 512 条一批），失败重试；代价是退出前必须 `shutdown()`/`force_flush()` 否则丢尾部数据 |

metrics 侧的对应物是 **MetricReader**（`PeriodicExportingMetricReader`：每隔 N 毫秒做一次收集+导出，默认 60s，lab00 调成 5s 便于观察）。

### 4.2 Collector 侧 Processor（数据离开应用之后）

| Collector Processor | 作用 | 常见用法 |
| --- | --- | --- |
| `batch` | 跨请求攒批，大幅降低导出开销 | **几乎必配**（官方建议默认带） |
| `memory_limiter` | 内存超限先丢数据/拒收，保护 Collector 不 OOM | 生产必备，放管道最前 |
| `attributes` / `resource` | 增删改 span/资源属性 | 补环境标签、删敏感字段 |
| `filter` / `transform`(OTTL) | 按条件丢弃/改写数据 | 噪声治理、统一命名 |
| `tailsampling` | **尾采样**：看到整条 trace 后再决定保留与否 | 错误 trace 100% 保留（阶段 5） |
| `k8sattributes` / `resourcedetection` | 富化 K8s/主机元数据 | gateway 层统一补全 |

记忆方式：**SDK 侧管"攒批与退出语义"，Collector 侧管"批量、保护与治理"。**

## 5. 采样器概念预览

细节（head vs tail、各采样器实现、动态采样）留到阶段 3/5，这里只建立最小模型：

- **采样发生在 span 产生时**（head-based）或整条 trace 完成后（tail-based，只能在 Collector 做）；
- 采样决策随 context 传播（`traceparent` 的 flags 位），**子 span 尊重父决策**（ParentBased），否则同一 trace 会出现"一半有一半没有"的破碎链路；
- 常见采样器：

| 采样器 | 行为 | 适用 |
| --- | --- | --- |
| `AlwaysOn` | 全采 | 开发/低流量/初上生产 |
| `AlwaysOff` | 全不采 | 临时关闭 |
| `TraceIdRatioBased(p)` | 按 trace_id 哈希均匀采 p 比例 | 生产常规 |
| `ParentBased(根采样器)` | 有父随父，无父用根采样器 | **默认**，保链路完整 |

lab00 不配置采样（默认 ParentBased+AlwaysOn，全采）。

## 6. 信号从应用到后端的全链路图

```mermaid
flowchart TB
    subgraph Code["业务代码 / 自动插桩"]
        T["tracer.start_span()"]
        M["counter.add() / histogram.record()"]
        L["logging.info(...)"]
    end
    subgraph SDK["OTel SDK（进程内）"]
        API["API（no-op 或转发）"]
        SAMP["Sampler<br/>(ParentBased…)"]
        RES["Resource<br/>service.name=…"]
        P1["BatchSpanProcessor"]
        P2["PeriodicExportingMetricReader<br/>(每 5s 收集)"]
        P3["BatchLogRecordProcessor"]
        E1["OTLP Exporter"]
    end
    subgraph Agent["Collector（agent/gateway）"]
        R["receiver: otlp<br/>:4317 gRPC / :4318 http"]
        PP["processors<br/>memory_limiter→batch"]
        EE["exporters<br/>debug / file / otlp / prometheus…"]
    end
    subgraph Backends["后端"]
        J["Jaeger / Tempo<br/>(traces)"]
        PR["Prometheus / Mimir<br/>(metrics)"]
        LO["Loki / ClickHouse<br/>(logs)"]
        UI["Grafana / 查询"]
    end
    T --> API --> SAMP --> P1
    M --> API --> P2
    L --> API --> P3
    P1 & P2 & P3 --> E1
    E1 -- "OTLP (protobuf)" --> R
    R --> PP --> EE
    EE -->|traces| J
    EE -->|metrics| PR
    EE -->|logs| LO
    J & PR & LO --> UI
```

读图要点：

1. **同一条 trace 走完全程**：代码产生 span → SDK 采样/批处理 → OTLP → Collector → 后端；三种信号平行流动、共享 Resource；
2. 每一层都可能"没有数据"：API 未接 SDK（no-op）、采样全拒、Exporter 端点配错、Collector 管道没引用组件——排障时**沿这条链逐层验证**（lab00 的验证步骤就是这么设计的）；
3. context 传播不在这张竖直图里（它发生在**请求的水平方向**），两者叠加才是完整链路。

## 7. 常见误区

### 误区 1："装配顺序无所谓"

Provider 装配前 import 的库若缓存了 Tracer/Meter 引用（no-op），后续装配可能不生效。正确姿势：**在进程入口最早期完成装配**（自动探针就是干这个的）。

### 误区 2："进程退出时数据自然会发出去"

Batch*Processor 是异步攒批发送，`kill -9` 必丢尾部数据。要在退出钩子里调用各 Provider 的 `shutdown()`（或 `force_flush()`），lab00 的 app 里用 `atexit` 演示了这一点。

### 误区 3："指标必须自己定时上报"

OTel metrics 是**拉模型抽象下的推实现**：仪表只管 `add()/record()`，`PeriodicExportingMetricReader` 定期"收集"当前聚合值再导出。自己起线程 sleep-send 是对模型的误解（也是重复计数的常见来源）。

### 误区 4："span 的 parent 会自动跨进程"

不会。跨进程必须显式 `inject`/`extract`（或依赖自动插桩替你做）。链路断链九成发生在自研封装、MQ、线程切换三处。

### 误区 5："Sampler 配在 Collector 上就能减少 SDK 开销"

head 采样减少的是**应用内产生/处理 span 的开销**，必须在 SDK 侧配置；Collector 侧的 `tailsampling` 只能减少**发给后端的数据量**，应用内 span 已经产生过了。这是 head vs tail 的本质区别。

### 误区 6："日志桥接后原来 logging 的行为全变了"

`LoggingHandler` 是**新增一个 handler** 把记录同时导出为 LogRecord，原有 stdout/文件输出不受影响；但注意去重（别把同一个 logger 挂两个 OTel handler）和级别（handler 有自己的 level 过滤）。

## 8. 面试常见问题小结

**Q1：TracerProvider / MeterProvider / LoggerProvider 的职责？**

> 答：三种信号各自的 SDK 全局装配点：持有 Resource、采样器（trace）、处理器/读数器链，负责生命周期（shutdown/force_flush）。进程内全局唯一，启动时装配；未装配时 API 层返回 no-op。

**Q2：`start_as_current_span` 做了哪三件事？**

> 答：(1) 基于"当前 context"决定 parent（并咨询 Sampler 是否创建真实 span）；(2) 创建 span 并**设为当前 context**（这就是"隐式传播"）；(3) 退出作用域时自动 end 并交给 processor 链。异常路径上应 `record_exception` + `set_status(ERROR)`。

**Q3：traceparent 头的格式？flags 位什么含义？**

> 答：`00-<32位hex trace_id>-<16位hex parent_id>-<2位hex flags>`；flags 的 bit0 是 sampled 位，采样决策随传播，配合 ParentBased 保证整条链要么采要么不采。

**Q4：BatchSpanProcessor 和 SimpleSpanProcessor 怎么选？**

> 答：开发调试用 Simple（同步、即时、阻塞）；生产用 Batch（攒批+后台线程+重试）。用 Batch 就必须在退出时 shutdown/force_flush，否则丢尾部数据。

**Q5：head-based 与 tail-based sampling 的区别？**

> 答：head 在 span 创建时（SDK 内）决策，省应用开销，但看不到请求结果（错误请求可能被丢）；tail 在整条 trace 汇聚后（Collector）决策，可以按"有错误/足够慢"保留，代价是全量 span 先要送到 Collector。生产常组合：head 低比例采样兜底 + tail 保错误。

**Q6：三种信号怎么保证在后端能对上同一实体？**

> 答：共享同一个 Resource（尤其 `service.name`/`service.instance.id`），且日志桥接自动注入 trace_id/span_id（trace 关联），指标侧可用 exemplar 关联 trace。装配时用一个 Resource 对象传给三个 Provider。

## 9. 参考资料

1. OpenTelemetry 概念文档 *Instrumentation* / *API & SDK*：
   <https://opentelemetry.io/docs/concepts/instrumentation/> （访问日期：2026-11-04）
2. 规范 *API Overview*（Tracer/Provider/Context 抽象）：
   <https://opentelemetry.io/docs/specs/otel/overview/#api-overview> （访问日期：2026-11-04）
3. W3C Trace Context（`traceparent` 格式）：
   <https://www.w3.org/TR/trace-context/> （访问日期：2026-11-04）
4. W3C Baggage 规范：
   <https://www.w3.org/TR/baggage/> （访问日期：2026-11-04）
5. SDK 环境变量（自动配置）清单：
   <https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/> （访问日期：2026-11-04）
6. Sampling 规范（head/tail、ParentBased 等）：
   <https://opentelemetry.io/docs/specs/otel/trace/sampling/> （访问日期：2026-11-04）
7. Python SDK 快速入门（本笔记代码片段的语言参照）：
   <https://opentelemetry.io/docs/languages/python/getting-started/> （访问日期：2026-11-04）

---

> 上一篇：[semantic-conventions.md](./semantic-conventions.md)
> 动手实验：[../../labs/lab00-otel-collector-basics/](../../labs/lab00-otel-collector-basics/README.md) —— 亲手跑通三种信号。

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 2. Context 传播 / 2.1 隐式 context：为什么 span 能“自动”串起来 | main → span A → span B → HTTP 调用下游的进程内父子链与跨进程传播起点 | flowchart TD |
| 3. Exporter / 3.2 注意：SDK Exporter ≠ Collector Exporter | SDK 侧 exporter（进程内，OTLP 到 Collector）与 Collector 侧 exporter（进程外，多协议到后端）两条平行流 | flowchart LR |

### 保留说明

| 位置 | 内容 | 原因 |
| --- | --- | --- |
| 2. Context 传播 / 2.2 跨进程传播：inject / extract + Propagator | traceparent 头的字段标注示例（含 tracestate/baggage 注释行） | 属协议格式示例输出（对字符串各段的标注说明），非对象+关系示意图 |

---

## 10. 手算/走查配方

### 配方一：traceparent 逐段走查

把 §2.2 的示例串当成"从线上抓到的一条真实请求头"来逐段验看（字段标注在 §2.2 已给出，这里走的是拿到串之后的检查流程）：

```text
00-3382e10b1b4c6f5d8c0a4e2f1a3b4c5d-5b8ad3c7d1e94f2a-01
```

1. **切段**：按连字符切成四段：`00`、`3382e10b1b4c6f5d8c0a4e2f1a3b4c5d`、`5b8ad3c7d1e94f2a`、`01`。段数不是四、或出现非十六进制字符的，直接判非法，服务端应按"无父上下文"处理并新开 trace。
2. **验版本**：第一段 `00` 是当前规范版本；`ff` 是保留的非法值。遇到不认识的版本时按规范降级处理、只提取能确定的字段。
3. **验 trace_id**：第二段 32 个 hex 字符。自验字节数：32 × 4 bit = 128 bit = 16 字节；全零非法。
4. **验 parent_id（上游 span_id）**：第三段 16 个 hex 字符 = 16 × 4 bit = 64 bit = 8 字节；全零非法。
5. **验 flags**：第四段 `01` 展开成二进制是 00000001，第 0 位是 sampled 位，1 表示"根采样器决定采这条链"。下游若配置了 ParentBased，会原样继承这个决定。
6. **推演下游行为**：B 服务 extract 之后，trace_id 原样沿用（所以整条链属于同一个 trace），span_id 换成 B 自己生成的新值，flags 又随 B 的出站请求继续向外传播。

**排查应用**：拿到一条断链的 trace（前半有、后半无），第一步是比对断点两侧 span 的 trace_id 是否一致——不一致说明断点处有人"另起炉灶"，通常是自研 HTTP 封装没有透传请求头，或网关把非标准头过滤了；一致但层级缺失，则查 extract 是否执行、线程切换是否丢了 context（§2.2 的三个易错点）。

**顺带把两个"邻居头"分清**：`traceparent` 管的是"这条链是谁的"，`tracestate` 管的是"厂商扩展信息"（由注册过的厂商键值组成，顺序有意义），`baggage` 管的是"随链传播的业务键值"（完全独立的另一个头）。排查时三者分开看：链路断没断只看 traceparent；baggage 里的键值丢不丢与链路完整性无关——它是随请求转发、没有也不影响采样与父子关系。§2.2 易错点 3 的"不要放敏感信息"约束的正是 baggage 这个通道。

### 配方二："为什么没数据"逐层走查

§6 的全链路图就是排查地图：数据在哪一层消失，就在哪一层修。按固定顺序走六层，每层只问一个"有没有"的问题：

1. **API 层：代码真的在产生数据吗？** 检查 Provider 是否在进程入口最早期装配——未装配时 API 返回 no-op，调用不报错、也不出数据（§7 误区 1）。证据：在埋点行旁边加一条日志，确认它确实被执行。
2. **采样层：产生了但被拒了吗？** 检查根采样器配置与 ParentBased 包裹。证据：临时换成 AlwaysOn 再观察一次，数据出现了就是采样配置的问题。
3. **处理层：缓冲到批了吗？** Batch 处理器默认攒批约 5 秒或 512 条，进程退出前没有 shutdown/force_flush 就丢尾部数据（§7 误区 2）。证据：开发期临时换 SimpleSpanProcessor 立即导出对照。
4. **导出层：SDK 发出去了吗？** 检查 `OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_EXPORTER_OTLP_PROTOCOL` 等环境变量是否真的生效（在进程里打印出来核对，别只看部署清单里的声明），端口号与协议是否匹配（4317 对 gRPC、4318 对 HTTP）。
5. **Collector 层：管道引用了吗？** Collector 的 service.pipelines 里没有被引用的 receiver/processor/exporter 等于不存在。证据：临时挂一个 debug exporter 直接观察收到的数据（lab00 用的就是这一招）。
6. **后端层：查的方式对吗？** 时间范围、service.name 标签取值、租户与权限，都是"数据在但查不到"的高频原因。

六层走完仍无数据的情况极少；多数卡在第 1、4、5 层。把这张清单放进团队 wiki，新成员接入时先自走一遍，能省掉大量"帮我看看为什么没数据"的求助。

**为什么顺序不能乱**：数据流是单向的，前一层没有产出，后一层的任何检查都是空转；而且越靠前的层验证成本越低（进程内加一行日志），越靠后的层成本越高（要登 Collector、查后端）。从第 1 层开始走，既是逻辑上的必然，也是成本上的最优。反例是很多新手的直觉：先去后端改查询条件折腾半小时，最后发现 Provider 根本没装配。

### 配方三：ParentBased 采样决策走查

先记住一个准确的事实：TraceIdRatioBased 的判定是**对 trace_id 的确定性运算**——同一个 trace_id 配同一个比例，在任何服务、任何时间判定结果都相同，不是掷骰子。理解这一点，三种典型场景就能手推：

**场景 A（标准姿势）**：入口配 `ParentBased(TraceIdRatioBased(0.1))`。

1. 入口请求无父上下文 → 使用根采样器 → 对该 trace_id 做比例判定 → 假设判"采"→ sampled 位写 1 随 traceparent 传播；
2. 下游 B 配同样的 ParentBased → extract 到父决策 → 有父随父 → 直接采；
3. 无论链路经过多少服务，整条链要么全采、要么全不采——这就是"链路完整性"。

**场景 B（断裂姿势一）**：入口 ratio = 0.1，下游 B 裸配 TraceIdRatioBased(0.5)（没有 ParentBased 包裹）。B 忽略父决策、按自己的比例对 trace_id 独立判定：两个比例不一致时，必然存在"父采子不采"与"父不采子采"的 trace_id 集合——前者链路后半截丢失，后者凭空出现无父的孤儿链。

**场景 C（断裂姿势二）**：入口按比例拒绝了某条 trace，下游 B 却配 AlwaysOn。B 无条件采，于是被入口拒绝的链路在 B "从天而降"，后端里出现只有中段的半截 trace。

**修复都一样**：所有服务统一 `ParentBased(同一个根采样器)`，把决策权收回入口；按服务重要性差异化比例属于进阶话题，见 sampling.md 的动态采样部分。

**场景 D（隐蔽姿势）**：链路中间有一个自研网关，网关自己"从零起 trace"（没有对入站请求 extract，出站又 inject 了新 trace 的头）。后果是每经过一次网关，后端的 trace 就被切成两段——两段各自完整、各自有根，看起来"链路断在网关"。识别方法正是配方一的比对法：网关两侧的 trace_id 不同，且断点稳定出现在同一跳。治理：把网关也纳入统一的 extract/inject 规范，而不是把它当旁观者。

## 11. 决策速查表

**表一：SDK 组件怎么选**

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| Simple vs Batch 处理器 | 开发调试用 Simple，生产一律 Batch | Simple 同步阻塞但即时可见；Batch 攒批高效但必须配退出钩子（§4.1） |
| 指标导出间隔 | 默认 60 秒；本地实验可调小观察，上生产回默认 | 间隔越小导出越频繁，Collector 与网络的代价越高（lab00 调成 5 秒仅因教学需要） |
| OTLP gRPC 还是 HTTP/protobuf | 内网低延迟环境 gRPC（4317）；要过代理或穿透中间件时 HTTP（4318） | 两者载荷同为 protobuf，差异只在传输层与端口号（§3.1） |
| 配置写在代码还是环境变量 | 端点、协议、鉴权头一律环境变量 | 跨语言一致、换环境不改代码（§3.1 的变量表） |
| Console exporter | 只用于教学与排障 | 打到 stdout 会淹没日志且无聚合价值，生产禁用 |
| Resource 属性放什么 | 放启动期就确定的常量（服务名、版本、环境） | 每请求变化的数据属于 span attribute；放 Resource 会让所有信号带上错误维度 |

**表二：部署拓扑怎么选**

| 处境 | 选择 | 理由 |
| --- | --- | --- |
| 本地学习/原型 | SDK 直连后端（或 Console） | 少一个组件，快速看到数据 |
| 单体自托管生产 | SDK → Collector（单实例） | 解耦后端选择、统一出口，重试不占应用资源 |
| 微服务/中大型集群 | SDK → DaemonSet agent → gateway → 后端 | agent 就近接收，gateway 统一做尾采样、脱敏与 K8s 元数据富化（§4.2、§3） |
| 只想卸载 SDK 导出开销 | agent 只做转发加 batch | 不需要治理能力时 gateway 可以省 |
| agent 与 gateway 各自的资源预算 | 按流量与治理需求分别评估，别默认两套都上 | 治理需求不强时单层 Collector 更省，两层意味着双倍的队列与内存配置工作 |

gateway 与 agent 的详细分工见 [otel-collector-deep-dive.md](./otel-collector-deep-dive.md)，K8s 部署形态见 [kubernetes-observability.md](../05-production/kubernetes-observability.md) §3。组件行为的权威定义以 `https://opentelemetry.io/docs/` 为准，本篇只收敛决策口径。

**表三：采样参数怎么定**

| 阶段 | 根采样器 | 说明 |
| --- | --- | --- |
| 开发/联调 | AlwaysOn | 全采，问题当场看 |
| 初上生产、流量小 | TraceIdRatioBased(1.0)（等价全采） | 保留全量观察期，同时验证 ParentBased 链路完整 |
| 流量上来后 | TraceIdRatioBased(0.1) 起步，按后端容量与成本调节 | head 采样在 SDK 侧决策，直接降低应用开销（§7 误区 5） |
| 错误与慢请求 | Collector 侧 tailsampling 保 100% | head 比例兜底 + tail 保错误，两者组合（细节见 [sampling.md](../05-production/sampling.md)） |

## 12. code review 检查单

评审 OTel 接入相关 PR 时逐条过。使用方式：作者在 PR 描述里贴出勾选结果，不通过的条目写明豁免理由；检查单本身随踩坑持续增补。前四条管"数据对不对"，中间四条管"链路通不通"，最后两条管"成本与安全"：

- [ ] 三种 Provider 在进程入口最早期装配，且共享同一个 Resource 对象（service.name 一致，后端才能把三种信号对上号）？
- [ ] span 名称是低基数的操作名或路由模板，没有把动态 ID、原始 URL 拼进 span 名？
- [ ] attribute 只放有界或必要字段，没有 token、手机号等敏感信息？baggage 同查？
- [ ] 异常路径成对出现 record_exception 与 set_status(ERROR)，而不是只打日志？
- [ ] 使用 Batch 处理器时，退出钩子调用了各 Provider 的 shutdown 或 force_flush？
- [ ] OTLP 端点、协议、鉴权头走环境变量，代码里没有硬编码的 collector 地址？
- [ ] 所有跨进程边界（自研 HTTP 封装、MQ 生产与消费、线程池/协程切换）有 inject/extract，关键路径有测试覆盖？
- [ ] 采样器是 ParentBased 包裹的统一根采样器，各服务比例一致或分层有据（配方三的场景 B、C 都已避开）？
- [ ] 指标名与单位遵循语义约定（对照 [semantic-conventions.md](./semantic-conventions.md)），没有自造单位与命名空间？
- [ ] 未装配 SDK 时（no-op 态）应用行为不变：不报错、不阻塞、无副作用？

前三条对应的是历史事故的最高频来源（no-op 装配、断链、退出丢尾），任何一条不通过都建议阻断合入；涉及 attribute 与 baggage 敏感信息的条目属于安全合规范畴，豁免需要单独审批，不能以"先上线再说"为由跳过。

## 13. 输出自测题

**题一**：一个命令行工具进程生命周期约两秒，接入了 OTel：trace 在后端能看到，metrics 一条都没有。最可能的原因是什么？

> 解析：指标侧的 `PeriodicExportingMetricReader` 是周期性收集导出（默认 60 秒），两秒的进程活不到第一个导出周期；Batch 处理器的缓冲也随进程消亡丢弃。修法：退出前对各 Provider 调用 shutdown 或 force_flush 强制清空缓冲，或把导出间隔调到小于进程寿命（§7 误区 2、配方二第 3 层）。注意一个细节：题面说 trace 能看到，说明退出钩子至少对 TracerProvider 生效过——根因多半是只给 tracer 挂了退出钩子、meter 和 logger 没挂，这正是"三种 Provider 要逐一 shutdown"的原因。

**题二**：A → B → C 三级调用，后端里 C 的 span 全部是根 span（没有父）。断点最可能在哪一层？给出排查顺序。

> 解析：断点在 B 侧。排查顺序：先比对 B 与 C 的 trace_id 是否一致（不一致说明请求头没到达 C，或 C 没 extract）；再查 B 的出站客户端是否 inject（自研封装最常见）；最后查中间的代理或网关是否把 traceparent 当非标准头过滤。另外别忘了线程池异步发请求的场景：contextvars 里的上下文在新线程不会自动复制，需要显式传（§2.2 易错点 2、配方一的应用）。

**题三**：入口服务配了 TraceIdRatioBased(0.1)，下游配了 TraceIdRatioBased(0.5)，两边都没有 ParentBased 包裹。线上会出现哪几类链路异常？

> 解析：比例判定是对 trace_id 的确定性运算（配方三场景 B），两个比例不一致时会出现：入口采、下游不采——链路后半截丢失；入口不采、下游采——凭空出现孤儿链。修复：所有服务统一 `ParentBased(同一个根采样器)`，决策权收回入口。

**题四**：同事提议"把 user_id 放进 baggage，全链路都能拿到，日志关联就方便了"。这个方案有什么风险？

> 解析：三个风险。其一，baggage 全链路传播、进入每个下游的处理上下文，等于把敏感信息扩散给所有经过的服务与日志（§2.2 易错点 3 明确警告不放敏感信息）；其二，baggage 头随请求膨胀，个别老网关对 header 大小敏感，会造成隐性故障；其三，若下游把 baggage 值写成 span attribute 或指标标签，会引入高基数。正确做法：跨服务关联用 trace_id（自动存在），用户维度信息在需要处单独打日志字段。

**题五**：Collector 上配了 tailsampling processor（错误 trace 100% 保留）之后，为什么应用进程里 span 序列化的 CPU 开销并没有下降？

> 解析：尾采样发生在 Collector，前提是全量 span 已经产生并送达 Collector——应用内的创建、属性处理、序列化、网络发送一个都没省（§7 误区 5）。要降应用侧开销必须用 head 采样（SDK 侧、span 创建时决策）；tail 的价值是省后端存储并做到"错误必留"，两者解决的是不同环节的成本。
