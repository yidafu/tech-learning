#!/usr/bin/env python3
"""
lab00 · OpenTelemetry Collector 基础实验的示例应用
================================================

一个最小的 Flask 应用，用 **手动 SDK 埋点** 同时产生三种遥测信号：

- Traces : 一次 /order 请求 = 一条 trace（3~4 个 span，含随机的"慢支付"和"支付失败"）
- Metrics: Counter `app.request.count` + Histogram `app.request.duration` + Gauge `app.uptime`
- Logs   : 标准 logging（经 LoggingHandler 桥接为 OTLP LogRecord，自动携带 trace_id/span_id）

三种信号全部通过 OTLP/gRPC (端口 4317) 发给 otel-collector 容器。

用法（容器内）：
    python app.py        # 监听 0.0.0.0:8000
然后从宿主机制造流量：
    curl http://127.0.0.1:8000/order
"""

import atexit
import logging
import os
import random
import time
import uuid

from flask import Flask, jsonify, request

# --- OpenTelemetry: API 层 ---------------------------------------------------
from opentelemetry import trace, metrics, _logs
from opentelemetry.trace import Status, StatusCode

# --- OpenTelemetry: SDK 层（装配真实的采集引擎）--------------------------------
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

# --- OpenTelemetry: OTLP exporters (gRPC) ------------------------------------
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

# =============================================================================
# 0. 基础配置
# =============================================================================

OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "lab00-app")
APP_PORT = int(os.getenv("APP_PORT", "8000"))

# 进程内共享同一个 Resource：三种信号在后端靠它对上"同一个服务"
RESOURCE = Resource.create(
    {
        # 遵循语义约定（Semantic Conventions）的 Resource 属性
        "service.name": SERVICE_NAME,
        "service.version": "0.1.0",
        "service.instance.id": os.getenv("HOSTNAME", "local"),
        "deployment.environment.name": "lab",
    }
)

# =============================================================================
# 1. 装配三种信号的 Provider（进程启动时做一次）
# =============================================================================

# ---- 1.1 Traces ----
tracer_provider = TracerProvider(resource=RESOURCE)
tracer_provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint=OTLP_ENDPOINT),  # OTLP/gRPC -> collector:4317
        schedule_delay_millis=2000,                # 每 2s 尝试导出一批
    )
)
trace.set_tracer_provider(tracer_provider)
tracer = trace.get_tracer(__name__, "0.1.0")  # scope name + version

# ---- 1.2 Metrics ----
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint=OTLP_ENDPOINT),
    export_interval_millis=5000,  # 每 5s 收集并导出一次（默认 60s，实验里调短便于观察）
)
meter_provider = MeterProvider(resource=RESOURCE, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
meter = metrics.get_meter(__name__, "0.1.0")

# ---- 1.3 Logs：把标准 logging 桥接为 OTLP LogRecord ----
logger_provider = LoggerProvider(resource=RESOURCE)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(OTLPLogExporter(endpoint=OTLP_ENDPOINT))
)
_logs.set_logger_provider(logger_provider)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
# 普通的控制台 handler（应用自己的输出，与遥测互不影响）
_console = logging.StreamHandler()
_console.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
root_logger.addHandler(_console)
# OTel 桥接 handler：LogRecord 会自动带上当前 context 的 trace_id / span_id
root_logger.addHandler(LoggingHandler(level=logging.INFO, logger_provider=logger_provider))

log = logging.getLogger("lab00.app")

# =============================================================================
# 2. 声明指标仪表（Instrument）
# =============================================================================

request_counter = meter.create_counter(
    name="app.request.count",
    unit="{request}",
    description="Number of handled requests, labeled by route and status.",
)

duration_histogram = meter.create_histogram(
    name="app.request.duration",
    unit="s",
    description="End-to-end request duration in seconds.",
)


# Observable Gauge：即使没有流量，每 5s 也会随 Reader 导出一次，
# 这样不制造请求也能在 Collector 里看到 metrics 心跳。
def _uptime_callback(options):
    yield metrics.Observation(value=time.monotonic() - _START_TIME, attributes={})


_START_TIME = time.monotonic()
meter.create_observable_gauge(
    name="app.uptime",
    unit="s",
    description="Seconds since the app process started.",
    callbacks=[_uptime_callback],
)

# =============================================================================
# 3. 业务逻辑（模拟一个下单接口：查库存 -> 落库 -> 支付）
# =============================================================================

app = Flask(__name__)

SLOW_PAYMENT_PROB = float(os.getenv("SLOW_PAYMENT_PROB", "0.10"))  # 10% 慢支付
FAIL_PAYMENT_PROB = float(os.getenv("FAIL_PAYMENT_PROB", "0.05"))  # 5% 支付失败


class PaymentError(Exception):
    """模拟第三方支付网关返回失败。"""


def _sleep_ms(lo: float, hi: float) -> None:
    time.sleep(random.uniform(lo, hi) / 1000.0)


@app.route("/healthz")
def healthz():
    """给容器 healthcheck / 编排系统用的探针，刻意不产生遥测数据。"""
    return jsonify(status="ok", service=SERVICE_NAME)


@app.route("/")
def index():
    return jsonify(
        message="lab00 demo app",
        endpoints={
            "GET /order": "place an order (generates traces/metrics/logs)",
            "GET /healthz": "liveness probe",
        },
    )


@app.route("/order", methods=["GET", "POST"])
def place_order():
    start = time.monotonic()
    order_id = f"A-{uuid.uuid4().hex[:8]}"
    route = "/order"

    # 根 span：kind=SERVER，属性遵循 HTTP 语义约定的命名
    with tracer.start_as_current_span(
        "POST /order", kind=trace.SpanKind.SERVER
    ) as span:
        span.set_attribute("http.request.method", request.method)
        span.set_attribute("http.route", route)
        span.set_attribute("url.scheme", request.scheme)
        span.set_attribute("server.address", request.host.split(":")[0])
        span.set_attribute("url.full", request.url)
        span.set_attribute("shop.order.id", order_id)  # 自定义业务属性

        log.info("order received", extra={"shop.order.id": order_id})

        status_code = 200
        try:
            # ---- 环节 1：查库存（子 span，5~30ms）----
            with tracer.start_as_current_span("inventory.check_stock") as s:
                s.set_attribute("db.system", "postgresql")
                s.set_attribute("db.operation.name", "SELECT")
                s.set_attribute("db.collection.name", "inventory")
                s.set_attribute("shop.sku.id", "SKU-42")
                _sleep_ms(5, 30)

            # ---- 环节 2：订单落库（子 span，10~40ms）----
            with tracer.start_as_current_span("db.insert_order") as s:
                s.set_attribute("db.system", "postgresql")
                s.set_attribute("db.operation.name", "INSERT")
                s.set_attribute("db.collection.name", "orders")
                _sleep_ms(10, 40)

            # ---- 环节 3：支付（随机慢 / 随机失败）----
            with tracer.start_as_current_span("payment.charge") as s:
                s.set_attribute("rpc.system", "grpc")
                s.set_attribute("rpc.method", "Charge")
                s.set_attribute("rpc.service", "payment.v1.PaymentService")
                roll = random.random()
                if roll < FAIL_PAYMENT_PROB:
                    _sleep_ms(30, 80)
                    err = PaymentError(f"gateway declined order {order_id}")
                    # 异常写进当前 span（exception.* 事件 + ERROR 状态）
                    s.record_exception(err)
                    s.set_status(Status(StatusCode.ERROR, str(err)))
                    raise err
                if roll < SLOW_PAYMENT_PROB:
                    s.set_attribute("shop.payment.slow", True)
                    log.warning("payment gateway is SLOW this time", extra={"shop.order.id": order_id})
                    _sleep_ms(700, 900)
                else:
                    _sleep_ms(40, 120)

            log.info("order completed", extra={"shop.order.id": order_id})

        except PaymentError as err:
            # 根 span 标记错误（异常已由内部 span 记录，这里补状态与日志）
            span.set_status(Status(StatusCode.ERROR, str(err)))
            log.error("order failed: %s", err, extra={"shop.order.id": order_id})
            status_code = 500

        # ---- 无论成败都记录指标（成功/失败分开打标，黄金信号实践）----
        attrs = {"http.route": route, "http.response.status_code": status_code}
        duration = time.monotonic() - start
        request_counter.add(1, attributes=attrs)
        duration_histogram.record(duration, attributes={"http.route": route})

        return jsonify(order_id=order_id, status=status_code, duration_ms=round(duration * 1000, 1))


# =============================================================================
# 4. 优雅退出：把批处理器里未发送的数据冲出去（否则 kill 会丢最后一批）
# =============================================================================


@atexit.register
def _shutdown_telemetry() -> None:
    log.info("shutting down OpenTelemetry providers (flushing pending data)...")
    tracer_provider.shutdown()
    meter_provider.shutdown()
    logger_provider.shutdown()


# =============================================================================
# 5. main
# =============================================================================

if __name__ == "__main__":
    log.info("lab00 app starting: service=%s otlp_endpoint=%s port=%d",
             SERVICE_NAME, OTLP_ENDPOINT, APP_PORT)
    # 生产建议 gunicorn；实验用开发服务器即可（单进程足够）
    app.run(host="0.0.0.0", port=APP_PORT, threaded=True)
