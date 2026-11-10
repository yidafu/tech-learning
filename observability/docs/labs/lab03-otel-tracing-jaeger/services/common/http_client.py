"""带 trace 注入的出站 HTTP 调用（演示 CLIENT span + propagate.inject）。

前端调 orders、orders 调 inventory 都通过本函数，等价于
opentelemetry-instrumentation-httpx 帮你做的事，核心只有一行：
    propagate.inject(headers)   # 把当前 SpanContext 写成 traceparent 头

教学彩蛋：把发出的 traceparent 原文记为 span 属性，
在 Jaeger 里可以肉眼核对"CLIENT span 的 span_id == 头里的 parent-id 部分"。
"""

from urllib.parse import urlparse

import httpx
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind, Status, StatusCode


def traced_get(tracer, url, params=None, timeout=10.0):
    """发起 GET 请求：创建 CLIENT span，注入 traceparent，返回 httpx.Response。"""
    parts = urlparse(url)
    # 低基数 span 名：方法 + scheme://host/path，不含查询串（变化的值放属性）
    span_name = f"GET {parts.scheme}://{parts.netloc}{parts.path}"

    # with 块内：本 span 是"当前 span"，inject 取到的就是它的 context
    with tracer.start_as_current_span(span_name, kind=SpanKind.CLIENT) as span:
        span.set_attribute("http.request.method", "GET")
        span.set_attribute("url.full", url)
        span.set_attribute("server.address", parts.hostname or "")
        if parts.port:
            span.set_attribute("server.port", parts.port)

        # ---- 关键一步：出站传播 ----
        headers = {}
        propagate.inject(headers)
        sent = headers.get("traceparent", "")
        if sent:
            # 教学属性：发出的 traceparent 长这样（00-<trace_id>-<本span_id>-01）
            span.set_attribute("http.request.header.traceparent", sent)

        try:
            resp = httpx.get(url, params=params, headers=headers, timeout=timeout)
        except Exception:
            # 连接失败等异常由 start_as_current_span 的 with 语义自动
            # record_exception + set_status(ERROR)，再原样抛出
            raise

        span.set_attribute("http.response.status_code", resp.status_code)
        if resp.status_code >= 500:
            span.set_status(Status(StatusCode.ERROR, f"HTTP {resp.status_code}"))
        return resp
