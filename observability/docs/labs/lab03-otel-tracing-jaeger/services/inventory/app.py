"""inventory 服务（链路第 3 跳/叶子）：库存服务。

路由：
  GET /health                健康检查（不产生 span）
  GET /inventory/<sku>       查询库存：
                             1) DB 读取模拟 span（SELECT inventory）
                             2) sku == "boom" 时抛错 → record_exception + status=ERROR + HTTP 500
                             3) ?slow=1 时 SELECT 额外多睡 ~0.8s，制造"慢 trace"

本服务还演示了 span 命名低基数化的标准手法：
before_request 钩子在路由匹配完成后，用 update_name 把 SERVER span 名
从"方法 + 实际路径"（GET /inventory/boom）改成"方法 + 路由模板"
（GET /inventory/<sku>），变化的 sku 值仍然可以通过 url.path 属性看到。
"""

import random
import time

from flask import Flask, jsonify, request
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode

from otel_setup import init_tracing
from wsgi_tracing import WSGITracingMiddleware

SERVICE_NAME = "inventory"

tracer = init_tracing(SERVICE_NAME)

app = Flask(__name__)
app.wsgi_app = WSGITracingMiddleware(app.wsgi_app, tracer)


@app.get("/health")
def health():
    return jsonify({"service": SERVICE_NAME, "status": "ok"})


@app.before_request
def rename_span_to_route_template():
    """把 SERVER span 名改成低基数的路由模板（span 命名最佳实践的标准实现）。

    为什么重要：如果直接用实际路径当名字，Jaeger 的 Operation 列表会出现
    GET /inventory/widget、GET /inventory/gadget、GET /inventory/boom……
    每个 SKU 一个"操作"，聚合与筛选全部失效。
    框架的路由模板（Flask 的 <sku>）天然是低基数的。
    """
    if request.url_rule is None:  # 没匹配到路由（最终 404），保持原路径
        return
    span = trace.get_current_span()
    if span.is_recording():
        span.update_name(f"{request.method} {request.url_rule.rule}")


@app.get("/inventory/<sku>")
def get_inventory(sku):
    slow = request.args.get("slow") == "1"

    # ---- DB 读取模拟：SELECT span（kind=CLIENT + db.* 属性）----
    with tracer.start_as_current_span("SELECT inventory", kind=SpanKind.CLIENT) as db:
        db.set_attribute("db.system", "sqlite")
        db.set_attribute("db.operation", "SELECT")
        db.set_attribute("db.name", "inventory")
        # 注：真实系统不要拼接用户输入（SQL 注入）；本实验仅模拟语句内容
        db.set_attribute("db.query.text", "SELECT stock FROM inventory WHERE sku = :sku")
        db.set_attribute("inventory.sku", sku)
        # 正常查询 30~60ms；slow=1 时额外 +0.8s，用于制造"慢在数据库"的 trace
        latency = random.uniform(0.03, 0.06) + (0.8 if slow else 0.0)
        time.sleep(latency)
        stock = random.randint(0, 42)

    # ---- 人为失败：演示"错误发生在最深层"的 trace 形态 ----
    if sku == "boom":
        exc = RuntimeError(f"inventory record for sku {sku!r} is corrupted")
        server_span = trace.get_current_span()
        server_span.record_exception(exc)  # 事件：exception.type/message/stacktrace
        server_span.set_status(Status(StatusCode.ERROR, str(exc)))
        server_span.set_attribute("error.type", "inventory_corrupted")
        return (
            jsonify({"service": SERVICE_NAME, "error": str(exc), "sku": sku}),
            500,
        )

    trace.get_current_span().add_event(
        "inventory.served", {"inventory.sku": sku, "inventory.stock": stock}
    )
    return jsonify({"service": SERVICE_NAME, "sku": sku, "stock": stock})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8002, threaded=True)
