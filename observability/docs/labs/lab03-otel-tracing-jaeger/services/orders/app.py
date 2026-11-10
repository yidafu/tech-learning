"""orders 服务（链路第 2 跳）：订单服务。

路由：
  GET /health          健康检查（不产生 span）
  /orders (GET/POST)   创建订单：
                       1) INTERNAL 数据库写入模拟（按语义约定 DB span 用 CLIENT kind + db.* 属性）
                       2) 作为 CLIENT 调用 inventory 服务查询库存
                       3) 用 event 记录业务里程碑（order.accepted / order.rejected）

演示的错误形态：
  ?fail=1              orders 自身在下单校验阶段失败（错误发生在中间层，不再调 inventory）
  item=boom            上游传来的 sku 导致 inventory 出错（错误发生在最深层）
"""

import os
import random
import time

from flask import Flask, jsonify, request
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode

from http_client import traced_get
from otel_setup import init_tracing
from wsgi_tracing import WSGITracingMiddleware

SERVICE_NAME = "orders"
INVENTORY_URL = os.environ.get("INVENTORY_URL", "http://localhost:8002")

tracer = init_tracing(SERVICE_NAME)

app = Flask(__name__)
app.wsgi_app = WSGITracingMiddleware(app.wsgi_app, tracer)


@app.get("/health")
def health():
    return jsonify({"service": SERVICE_NAME, "status": "ok"})


@app.route("/orders", methods=["GET", "POST"])
def create_order():
    item = request.args.get("item", "widget")
    fail = request.args.get("fail") == "1"
    slow = request.args.get("slow") == "1"

    # ---- 1) 本地"数据库"写入模拟：DB span ----
    # 按语义约定：数据库调用用 SpanKind.CLIENT（它是一次出站调用），
    # 名称用 "操作 + 表"，语句原文放 db.query.text 属性（低基数 + 可排障）
    with tracer.start_as_current_span("INSERT orders", kind=SpanKind.CLIENT) as db:
        db.set_attribute("db.system", "postgresql")
        db.set_attribute("db.operation", "INSERT")
        db.set_attribute("db.name", "orders")
        db.set_attribute(
            "db.query.text",
            "INSERT INTO orders (item, status) VALUES (:item, 'CREATED')",
        )
        time.sleep(random.uniform(0.02, 0.05))  # 模拟 DB 写入耗时
        order_id = random.randint(1000, 9999)
        db.set_attribute("order.id", order_id)  # 业务标识放属性，不放 span 名

    # ---- 2) 人为失败（演示"错误发生在中间层"的 trace 形态）----
    if fail:
        server_span = trace.get_current_span()
        exc = RuntimeError(f"order validation failed for item {item!r}: payment quota exceeded")
        server_span.record_exception(exc)               # 生成带堆栈的 exception 事件
        server_span.set_status(Status(StatusCode.ERROR, str(exc)))
        server_span.set_attribute("order.reject_reason", "payment_quota")
        server_span.add_event("order.rejected", {"reason": "payment_quota", "order.id": order_id})
        return (
            jsonify({"service": SERVICE_NAME, "error": str(exc), "order_id": order_id}),
            500,
        )

    # ---- 3) 出站调用 inventory：CLIENT span + inject(traceparent) ----
    params = {}
    if slow:
        params["slow"] = "1"
    resp = traced_get(tracer, f"{INVENTORY_URL}/inventory/{item}", params=params)

    if resp.status_code >= 500:
        server_span = trace.get_current_span()
        server_span.set_status(
            Status(StatusCode.ERROR, f"inventory lookup failed: HTTP {resp.status_code}")
        )
        server_span.add_event(
            "order.rejected",
            {"reason": "inventory_error", "order.id": order_id},
        )
        return (
            jsonify(
                {
                    "service": SERVICE_NAME,
                    "error": "inventory lookup failed",
                    "order_id": order_id,
                    "inventory_body": resp.json() if resp.content else None,
                }
            ),
            502,
        )

    # ---- 4) 业务里程碑用 event 记录（值得记，但不值得单开一个 span）----
    stock = resp.json().get("stock", 0)
    trace.get_current_span().add_event(
        "order.accepted", {"order.id": order_id, "inventory.stock": stock}
    )
    return jsonify({"service": SERVICE_NAME, "order_id": order_id, "item": item, "stock": stock})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, threaded=True)
