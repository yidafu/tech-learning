"""共享的 OpenTelemetry 引导模块（frontend / orders / inventory 三个服务通用）。

生产项目里这一段通常封装为内部公共库或由平台注入；本实验放在
services/common/ 目录，让大家看清"一个 Python 服务接入 OTel"的最小组件：

1. Resource          —— 我是谁（service.name 等，Jaeger 服务列表的来源）
2. TracerProvider    —— 进程级 provider，持有采样器与导出器
3. SpanProcessor     —— Batch：攒批导出，降低开销（默认每 5s 或每 512 条）
4. OTLP/HTTP 导出器  —— 发往 otel-collector:4318（生产标准做法）
5. 传播器            —— W3C Trace Context（traceparent 头），显式声明以便观察
6. 优雅退出          —— SIGTERM / atexit 时 flush 缓冲区里最后一批 span
"""

import atexit
import os
import signal
import sys

from opentelemetry import propagate, trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator


def init_tracing(service_name: str, service_version: str = "1.0.0") -> trace.Tracer:
    """初始化进程级 tracing 并返回 Tracer。整个进程只应调用一次（应用入口处）。"""
    # 1) Resource：所有 span 都会携带这些静态属性
    resource = Resource.create(
        {
            "service.name": service_name,          # 最关键：后端服务列表/筛选的主键
            "service.version": service_version,
            "deployment.environment": "lab03",
        }
    )

    # 2) TracerProvider + 采样器
    #    ParentBased(TraceIdRatioBased(1.0)) = 全量采样，但尊重上游决定：
    #    若请求头 traceparent 的 trace-flags 是 00（不采样），本条链路不产生任何 span
    provider = TracerProvider(
        resource=resource,
        sampler=ParentBased(TraceIdRatioBased(1.0)),
    )

    # 3) OTLP over HTTP 导出器（4318 端口，路径 /v1/traces）
    #    本地（不在容器里）运行时回退到 localhost
    endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
    )
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    )

    # 注册为全局 provider（进程内只能注册一次；之后 trace.get_tracer() 都取自它）
    trace.set_tracer_provider(provider)

    # 4) 传播器：显式使用 W3C Trace Context（写入/读取 traceparent 头）
    #    这也是 OTel 的默认值；显式写出是为了让"传播靠什么头"一目了然
    propagate.set_global_textmap(TraceContextTextMapPropagator())

    # 5) 优雅退出：Batch 缓冲区里最多还压着几秒的 span，
    #    podman compose down/stop 发 SIGTERM -> sys.exit(0) -> atexit -> shutdown() 强制导出
    atexit.register(provider.shutdown)

    def _handle_sigterm(signum, frame):  # noqa: ANN001
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle_sigterm)

    return trace.get_tracer(service_name, service_version)
