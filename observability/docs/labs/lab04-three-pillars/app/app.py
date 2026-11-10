"""Lab04 压轴实验：一个应用同时产出三大支柱信号。

角色（APP_ROLE 环境变量切换，两个服务共用本镜像）：
- web       demo-app       :8000  /api/orders（随机延迟 + 随机错误）、/chaos 混沌开关、
                             /webhook/alerts + /alerts（Alertmanager 通知展示页）
- inventory demo-inventory :8001  /api/inventory 下游服务（跨服务 trace / 服务图数据源）

信号链路：OTel SDK → OTLP(HTTP) → otel-collector → Prometheus / Loki / Tempo
"""

import html
import logging
import os
import random
import threading
import time
import uuid
from contextlib import asynccontextmanager

import requests as http_client
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.trace import Status, StatusCode

from telemetry import Telemetry, init_telemetry

logger = logging.getLogger("app")

ROLE = os.getenv("APP_ROLE", "web")
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://inventory:8001/api/inventory")
TRAFFIC_INTERVAL = float(os.getenv("TRAFFIC_INTERVAL", "0.4"))
SELF_URL = "http://localhost:8000/api/orders"

# 混沌开关：错误率（0.0~1.0），通过 POST /chaos 动态调整
CHAOS = {"error_rate": float(os.getenv("ERROR_RATE", "0.02"))}

# Alertmanager webhook 落地展示（最近 N 条）
ALERTS: list = []
ALERTS_MAX = 50

TELE: Telemetry = init_telemetry()
tracer = TELE.tracer


# ---------------------------------------------------------------------------
# 中间件：RED 指标（手动埋点，标签用 route 模板而非原始路径，避免高基数）
# ---------------------------------------------------------------------------
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        route = request.scope.get("route")
        labels = {
            "method": request.method,
            "route": route.path if route else "unmatched",
            "status": str(status_code),
        }
        TELE.request_counter.add(1.0, labels)
        TELE.duration_histogram.record(time.perf_counter() - start, labels)


# ---------------------------------------------------------------------------
# 后台流量发生器：让仪表盘开机即有数据，也让 burn-rate 告警可被触发
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    traffic_thread = None
    if ROLE == "web":
        def traffic_loop():
            while True:
                try:
                    http_client.get(SELF_URL, timeout=10)
                except Exception:  # noqa: BLE001  启动初期 collector 未就绪等，忽略
                    pass
                time.sleep(TRAFFIC_INTERVAL)

        traffic_thread = threading.Thread(target=traffic_loop, daemon=True, name="traffic")
        traffic_thread.start()
        logger.info(
            "background traffic generator started",
            extra={"interval_s": TRAFFIC_INTERVAL},
        )
    yield
    TELE.shutdown()  # 刷掉批处理器里残余信号


def create_app() -> FastAPI:
    app = FastAPI(title="Lab04 Demo App", lifespan=lifespan)
    FastAPIInstrumentor.instrument_app(app, tracer_provider=TELE.tracer_provider)
    app.middleware("http")(metrics_middleware)

    # --------- 公共：两个角色都有 ---------
    @app.get("/healthz")
    def healthz():
        return {"status": "ok", "role": ROLE}

    if ROLE == "inventory":
        # ================================================================
        # 下游库存服务：小延迟 + 低概率 503，制造跨服务 trace 与服务图边
        # ================================================================
        @app.get("/api/inventory")
        def inventory():
            time.sleep(random.uniform(0.005, 0.03))
            sku = f"SKU-{random.randint(1, 9)}"
            if random.random() < CHAOS["error_rate"] * 0.5:
                logger.warning("inventory lookup degraded", extra={"sku": sku})
                raise HTTPException(status_code=503, detail="inventory degraded")
            stock = random.randint(3, 99)
            logger.info("inventory checked", extra={"sku": sku, "stock": stock})
            return {"sku": sku, "stock": stock}

        return app

    # ================================================================
    # web 角色：订单接口（本实验主角）
    # ================================================================
    @app.get("/")
    def index():
        return {
            "service": "demo-app",
            "endpoints": {
                "traffic": "GET /api/orders",
                "chaos_get": "GET  /chaos",
                "chaos_set": "POST /chaos?rate=0.6   # 错误率设为 60%，触发 burn-rate 告警",
                "alerts": "GET /alerts              # Alertmanager 通知展示页（自动刷新）",
            },
        }

    @app.get("/api/orders")
    def list_orders():
        order_id = uuid.uuid4().hex[:8]
        # 手动子 span：模拟一次内部处理（自动 span 由 FastAPI instrumentation 提供）
        with tracer.start_as_current_span("orders.process") as span:
            span.set_attribute("app.order.id", order_id)

            # 1) 调下游库存服务（requests 已被 instrument，自动生成 CLIENT span 并注入 traceparent）
            try:
                inv = http_client.get(INVENTORY_URL, timeout=5)
                stock = inv.json().get("stock", 0)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "inventory call failed", extra={"order_id": order_id, "error": str(exc)}
                )
                raise HTTPException(status_code=502, detail="inventory unavailable") from exc

            # 2) 模拟业务延迟：92% 快请求（20~90ms），8% 长尾（300~900ms）
            if random.random() < 0.08:
                delay = random.uniform(0.30, 0.90)
                span.set_attribute("app.slow_tenant", True)
            else:
                delay = random.uniform(0.02, 0.09)
            time.sleep(delay)

            # 3) 随机失败（错误率由 /chaos 控制）—— 注意日志带 trace_id，span 标 ERROR
            if random.random() < CHAOS["error_rate"]:
                logger.error(
                    "order processing failed",
                    extra={"order_id": order_id, "stock": stock, "reason": "payment_gateway_timeout"},
                )
                span.record_exception(TimeoutError("payment gateway timeout"))
                span.set_status(Status(StatusCode.ERROR, "simulated failure"))
                raise HTTPException(status_code=500, detail="simulated failure")

            logger.info(
                "order processed",
                extra={"order_id": order_id, "stock": stock, "duration_ms": round(delay * 1000, 1)},
            )
            return {
                "order_id": order_id,
                "stock": stock,
                "items": [{"sku": "SKU-1", "qty": 1}],
            }

    # --------- 混沌开关 ---------
    @app.get("/chaos")
    def get_chaos():
        return {"error_rate": CHAOS["error_rate"]}

    @app.post("/chaos")
    def set_chaos(rate: float = Query(ge=0.0, le=1.0)):
        CHAOS["error_rate"] = rate
        logger.warning("chaos error rate changed", extra={"error_rate": rate})
        return {"error_rate": CHAOS["error_rate"]}

    # --------- Alertmanager webhook 接收 + 展示页 ---------
    @app.post("/webhook/alerts")
    async def receive_alerts(request: Request):
        payload = await request.json()
        for alert in payload.get("alerts", []):
            labels = alert.get("labels", {})
            annotations = alert.get("annotations", {})
            ALERTS.append(
                {
                    "received_at": time.time(),
                    "status": alert.get("status", "unknown"),
                    "severity": labels.get("severity", "-"),
                    "alertname": labels.get("alertname", "-"),
                    "summary": annotations.get("summary", ""),
                    "description": annotations.get("description", ""),
                    "starts_at": alert.get("startsAt", ""),
                }
            )
        del ALERTS[:-ALERTS_MAX]  # 只保留最近 N 条
        return {"received": True, "total": len(ALERTS)}

    @app.get("/alerts", response_class=HTMLResponse)
    def alerts_page():
        rows = "".join(
            f"<tr class='{html.escape(str(a['status']))}'>"
            f"<td>{html.escape(str(a['status']))}</td>"
            f"<td>{html.escape(str(a['severity']))}</td>"
            f"<td>{html.escape(str(a['alertname']))}</td>"
            f"<td>{html.escape(str(a['summary']))}</td>"
            f"<td>{html.escape(str(a['starts_at']))}</td></tr>"
            for a in reversed(ALERTS)
        ) or (
            "<tr><td colspan='5'>暂无通知。触发方式：<code>curl -X POST "
            "'http://localhost:8000/chaos?rate=0.6'</code>，等 3~5 分钟。</td></tr>"
        )
        return f"""<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="10">
<title>Lab04 · Alertmanager 通知</title>
<style>
 body {{ font-family: -apple-system, "PingFang SC", sans-serif; margin: 2rem; background:#111; color:#eee; }}
 h1 {{ font-size: 1.3rem; }}
 table {{ border-collapse: collapse; width: 100%; font-size: 0.9rem; }}
 th, td {{ border: 1px solid #333; padding: 6px 10px; text-align: left; }}
 th {{ background: #222; }}
 tr.firing td:first-child {{ color: #ff5252; font-weight: bold; }}
 tr.resolved td:first-child {{ color: #66bb6a; }}
 code {{ background:#333; padding:2px 6px; border-radius:4px; }}
</style></head><body>
<h1>Lab04 · Alertmanager 通知（最近 {ALERTS_MAX} 条，10 秒自动刷新，时间为 UTC）</h1>
<p>来源：alertmanager webhook → POST /webhook/alerts。同时可在
<a href="http://localhost:9093" style="color:#8ab4f8">localhost:9093</a> 查看 Alertmanager 原生 UI。</p>
<table><thead><tr><th>状态</th><th>severity</th><th>告警</th><th>summary</th><th>startsAt</th></tr></thead>
<tbody>{rows}</tbody></table></body></html>"""

    return app


# requests 客户端埋点：自动创建 CLIENT span + 注入/提取 W3C traceparent
# （排除 localhost，避免后台流量发生器给自己造客户端 span 噪声）
if ROLE == "web":
    RequestsInstrumentor().instrument(excluded_urls="localhost")

app = create_app()
