"""手动实现的 WSGI tracing 中间件（三个服务共用）。

它演示了 SERVER span 的完整生命周期——也就是
opentelemetry-instrumentation-flask 这类库在背后帮你做的事：

1. 把 WSGI environ 里的 HTTP_* 转成标准头名，调用 propagate.extract()
   从 traceparent 头还原上游 SpanContext（没有则本服务成为根 span）
2. 创建 SERVER span（parent = 上游的 CLIENT span）
3. attach 当前 context，使路由处理代码里的 get_current_span() /
   start_as_current_span() 都自动成为它的子 span
4. 按响应状态码设置 span status（>=500 才标 Error，4xx 保持 Unset）
5. 响应头回写 x-trace-id，方便用 curl 验证同一 trace_id 贯穿三跳
"""

from opentelemetry import context as otel_context
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind, Status, StatusCode


def _carrier_from_wsgi_environ(environ):
    """WSGI environ（键形如 HTTP_TRACEPARENT）→ 小写标准头名的 dict carrier。

    W3C 传播器会在 carrier 里找键 "traceparent"；
    WSGI 把入站请求头都改成 HTTP_ 前缀大写形式，所以需要这一步转换。
    """
    headers = {}
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            headers[key[5:].replace("_", "-").lower()] = value
    if "CONTENT_TYPE" in environ:
        headers["content-type"] = environ["CONTENT_TYPE"]
    if "CONTENT_LENGTH" in environ:
        headers["content-length"] = environ["CONTENT_LENGTH"]
    return headers


class WSGITracingMiddleware:
    """包装 Flask/Werkzeug 的 app.wsgi_app：app.wsgi_app = WSGITracingMiddleware(app.wsgi_app, tracer)"""

    def __init__(self, wsgi_app, tracer):
        self.wsgi_app = wsgi_app
        self.tracer = tracer

    def __call__(self, environ, start_response):
        method = environ.get("REQUEST_METHOD", "GET")
        path = environ.get("PATH_INFO", "/")

        # 健康检查不产生 span：否则 Jaeger 里的 trace 列表会被 /health 淹没
        if path == "/health":
            return self.wsgi_app(environ, start_response)

        # ---- 1. 入站：extract 上游 context（traceparent 头 → SpanContext）----
        parent_context = propagate.extract(carrier=_carrier_from_wsgi_environ(environ))

        # ---- 2. SERVER span ----
        # 初始名先用"方法 + 实际路径"；inventory 服务会演示如何改成低基数的路由模板
        span = self.tracer.start_span(
            f"{method} {path}",
            context=parent_context,
            kind=SpanKind.SERVER,
        )
        span.set_attribute("http.request.method", method)
        span.set_attribute("url.path", path)
        span.set_attribute("url.scheme", environ.get("wsgi.url_scheme", "http"))
        if environ.get("HTTP_USER_AGENT"):
            span.set_attribute("user_agent.original", environ["HTTP_USER_AGENT"])

        # 本条 trace 的 id，随响应头 x-trace-id 返回，用于 curl 验证
        trace_id = format(span.get_span_context().trace_id, "032x")

        http_status_holder = {}

        def traced_start_response(status, response_headers, exc_info=None):
            # 捕获 Flask 返回的状态行（形如 "200 OK"），并追加 x-trace-id 头
            http_status_holder["status_line"] = status
            response_headers = list(response_headers)
            response_headers.append(("x-trace-id", trace_id))
            return start_response(status, response_headers, exc_info)

        # ---- 3. 让 span 成为"当前 span"，路由代码里创建的子 span 自动挂在它下面 ----
        token = otel_context.attach(trace.set_span_in_context(span, parent_context))
        try:
            result = self.wsgi_app(environ, traced_start_response)
            return result
        except Exception as exc:  # Flask 默认会吞掉异常转 500，这里兜底未捕获的异常
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise
        finally:
            otel_context.detach(token)
            status_line = http_status_holder.get("status_line", "500 INTERNAL SERVER ERROR")
            try:
                code = int(status_line.split(" ", 1)[0])
            except ValueError:
                code = 500
            span.set_attribute("http.response.status_code", code)
            if code >= 500:
                # 按语义约定：5xx/异常才标 Error；4xx 保持 Unset（见 notes/03-tracing/trace-model.md 4.3）
                span.set_status(Status(StatusCode.ERROR, f"HTTP {code}"))
            span.end()
