"""OTel 三信号初始化：Traces / Metrics / Logs 一次接好。

环境变量（docker-compose.yml 中统一设置）：
- OTEL_SERVICE_NAME            服务名（demo-app / demo-inventory）
- OTEL_EXPORTER_OTLP_ENDPOINT  Collector OTLP HTTP 地址，默认 http://localhost:4318

导出的指标名（经 Collector prometheus exporter 转换后）：
- app_http_requests_total{service_name,method,route,status}                    counter（RED · Rate/Error）
- app_http_request_duration_seconds_{bucket,sum,count}{...}                     histogram（RED · Duration）
"""

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Optional

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.aggregation import ExplicitBucketHistogramAggregation
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from logging_utils import JsonFormatter, JsonOtlpHandler, TraceContextFilter

# 直方图桶边界（秒）：覆盖 5ms ~ 10s，1s 桶正好对齐延迟 SLO 目标（<1s 视为"好"请求）
LATENCY_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.0, 2.0, 5.0, 10.0]


@dataclass
class Telemetry:
    tracer_provider: Any = None
    meter_provider: Any = None
    logger_provider: Any = None
    tracer: Any = None
    request_counter: Any = None
    duration_histogram: Any = None
    _extra: dict = field(default_factory=dict)

    def shutdown(self) -> None:
        """优雅关闭：把批处理器里残余的 span / metric / log 刷出去。"""
        for provider in (self.meter_provider, self.tracer_provider, self.logger_provider):
            if provider is None:
                continue
            try:
                provider.shutdown()
            except Exception as exc:  # noqa: BLE001
                logging.getLogger("telemetry").warning("shutdown error: %s", exc)


def init_telemetry() -> Telemetry:
    resource = Resource.create(
        {
            "service.name": os.getenv("OTEL_SERVICE_NAME", "demo-app"),
            "service.version": "1.0.0",
            "deployment.environment": "lab04",
        }
    )

    # ---------- Traces ----------
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    # ---------- Metrics ----------
    # 用 View 显式指定直方图桶：OTel 默认桶（0~10000，按毫秒设计）对"秒"单位完全不适用
    latency_view = View(
        instrument_name="app.http.request.duration",
        aggregation=ExplicitBucketHistogramAggregation(boundaries=LATENCY_BUCKETS),
    )
    reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(), export_interval_millis=10_000
    )
    meter_provider = MeterProvider(
        resource=resource, metric_readers=[reader], views=[latency_view]
    )
    metrics.set_meter_provider(meter_provider)

    # ---------- Logs（OTLP）----------
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter())
    )

    # ---------- 接线 Python 标准 logging ----------
    json_formatter = JsonFormatter()
    trace_filter = TraceContextFilter()  # 同一个 filter 实例挂到两个 handler 上

    console = logging.StreamHandler()  # podman logs 里直接看 JSON
    console.setFormatter(json_formatter)
    console.addFilter(trace_filter)

    otlp_logs = JsonOtlpHandler(logger_provider=logger_provider, formatter=json_formatter)
    otlp_logs.addFilter(trace_filter)

    root = logging.getLogger()
    root.handlers = [console, otlp_logs]
    root.setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # 压掉访问日志噪声

    # ---------- 仪表（instruments）----------
    meter = meter_provider.get_meter("lab04.app")
    return Telemetry(
        tracer_provider=tracer_provider,
        meter_provider=meter_provider,
        logger_provider=logger_provider,
        tracer=trace.get_tracer("lab04.app"),
        request_counter=meter.create_counter(
            "app.http.requests",
            unit="1",
            description="HTTP requests processed (RED: Rate / Error)",
        ),
        duration_histogram=meter.create_histogram(
            "app.http.request.duration",
            unit="s",
            description="HTTP request duration (RED: Duration)",
        ),
    )
