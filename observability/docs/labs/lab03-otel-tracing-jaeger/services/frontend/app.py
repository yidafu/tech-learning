"""frontend 服务（链路第 1 跳）：入口服务。

路由：
  GET /health          健康检查（不产生 span）
  GET /checkout        下单入口：作为 CLIENT 调用 orders 服务

用法（compose 内端口 8000）：
  curl 'http://localhost:8000/checkout?item=widget'          # 正常
  curl 'http://localhost:8000/checkout?item=widget&slow=1'   # 慢 trace
  curl 'http://localhost:8000/checkout?item=boom'            # 错误 trace（inventory 出错）
  curl 'http://localhost:8000/checkout?item=widget&fail=1'   # 错误 trace（orders 自身出错）
"""

import os
import random
import time

from flask import Flask, jsonify, request
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from http_client import traced_get
from otel_setup import init_tracing
from wsgi_tracing import WSGITracingMiddleware

SERVICE_NAME = "frontend"
ORDERS_URL = os.environ.get("ORDERS_URL", "http://localhost:8001")

# ---- 初始化 tracing（进程入口一次）----
tracer = init_tracing(SERVICE_NAME)

app = Flask(__name__)
app.wsgi_app = WSGITracingMiddleware(app.wsgi_app, tracer)


@app.get("/health")
def health():
    return jsonify({"service": SERVICE_NAME, "status": "ok"})


@app.get("/checkout")
def checkout():
    item = request.args.get("item", "widget")
    fail = request.args.get("fail") == "1"
    slow = request.args.get("slow") == "1"

    # 模拟入口自身的一点工作（这个空隙会体现在 SERVER span 的 self time 上）
    time.sleep(random.uniform(0.01, 0.03))

    # ---- 出站调用 orders：CLIENT span + inject(traceparent) ----
    params = {"item": item}
    if fail:
        params["fail"] = "1"
    if slow:
        params["slow"] = "1"
    resp = traced_get(tracer, f"{ORDERS_URL}/orders", params=params)

    # 当前 span 就是本服务的 SERVER span（中间件里 attach 的）
    server_span = trace.get_current_span()
    server_span.set_attribute("checkout.item", item)  # 变化的值放属性而不是 span 名
    server_span.add_event(
        "checkout.completed",
        {"checkout.item": item, "orders.http.status_code": resp.status_code},
    )

    if resp.status_code >= 500:
        server_span.set_status(Status(StatusCode.ERROR, "orders service failed"))
        return (
            jsonify(
                {
                    "service": SERVICE_NAME,
                    "error": "orders service failed",
                    "orders_body": resp.json() if resp.content else None,
                }
            ),
            502,
        )

    return jsonify({"service": SERVICE_NAME, "item": item, "orders": resp.json()})


if __name__ == "__main__":
    # Werkzeug 开发服务器，仅用于实验；threaded=True 允许健康检查与业务请求并发
    app.run(host="0.0.0.0", port=8000, threaded=True)
