"""
lab01 示例应用：一个带完整 RED 指标埋点的模拟业务服务（FastAPI + prometheus_client）。

暴露的端点：
  GET  /metrics            Prometheus 抓取端点（prometheus_client 生成）
  GET  /api/orders         模拟业务接口：随机延迟 + 按可配置错误率随机 5xx
  POST /api/orders         模拟创建订单（业务指标 orders_created_total）
  GET  /api/slow           模拟慢接口（延迟集中在 0.3~0.9s，用于观察延迟分布）
  GET  /healthz            存活检查
  GET  /faults             查看当前注入的故障参数
  POST /faults             动态注入故障：?error_rate=0.5&extra_latency_seconds=2
  POST /faults/reset       恢复默认（error_rate=0.02, extra_latency=0）
  GET  /webhook/alerts     查看 Alertmanager 推送过来的告警（lab 演示用）
  POST /webhook/alerts     接收 Alertmanager webhook（lab 演示用）

指标设计（RED + 业务指标 + 演示用故障状态）：
  http_requests_total{method,path,status}          counter   —— Rate & Errors
  http_request_duration_seconds{method,path}       histogram —— Duration
  orders_created_total                             counter   —— 业务指标示例
  demo_fault_error_ratio                           gauge     —— 当前注入的错误率
  demo_fault_extra_latency_seconds                 gauge     —— 当前注入的额外延迟
"""

import logging
import os
import random
import threading
import time
import urllib.request
from collections import deque

from fastapi import FastAPI, HTTPException, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    Info,
    generate_latest,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("lab01-app")

PORT = int(os.environ.get("PORT", "8000"))
TRAFFIC_ENABLED = os.environ.get("TRAFFIC_ENABLED", "true").lower() == "true"

# ---------------------------------------------------------------------------
# 1. 指标定义（命名遵循最佳实践：counter 以 _total 结尾、单位用基础单位 seconds）
# ---------------------------------------------------------------------------

# Rate / Errors：请求计数。path 标签必须是"路由模板"（/api/orders），
# 而不是原始 URL（/api/orders?user=123），否则标签值无界 → 高基数事故。
REQUESTS = Counter(
    "http_requests_total",
    "HTTP 请求总数（按方法/路由模板/状态码）",
    ["method", "path", "status"],
)

# Duration：耗时直方图。桶边界按"接口 SLO 在几百毫秒"设计，
# 并包含 1 / 2.5 / 5 / 10 秒长尾桶，便于 p99 插值与告警（HighLatencyP99 阈值 1s）。
DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP 请求耗时分布（秒）",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

# 业务指标示例：不只是 HTTP 层，业务事件也可以（也应该）埋 counter。
ORDERS_CREATED = Counter(
    "orders_created_total",
    "创建订单总数（模拟业务指标）",
)

# 演示用：当前故障注入状态（gauge：瞬时值、可升可降）
FAULT_ERROR_RATIO = Gauge(
    "demo_fault_error_ratio",
    "当前注入的 5xx 错误概率（0~1，演示用）",
)
FAULT_EXTRA_LATENCY = Gauge(
    "demo_fault_extra_latency_seconds",
    "当前注入的额外延迟（秒，演示用）",
)

# 构建信息：常见模式，用 label 暴露版本，便于按版本分组对比
BUILD_INFO = Info("app_build_info", "应用构建信息")
BUILD_INFO.info({"version": "1.0.0", "lang": "python", "lab": "lab01"})


# ---------------------------------------------------------------------------
# 2. 可动态调节的故障注入状态（演示"如何触发告警"）
# ---------------------------------------------------------------------------

class FaultState:
    """线程安全的故障参数容器（lab 演示用，生产代码不存在这种东西）。"""

    def __init__(self, error_ratio: float, extra_latency: float):
        self._lock = threading.Lock()
        self.error_ratio = error_ratio
        self.extra_latency = extra_latency

    def set(self, error_ratio: float, extra_latency: float) -> None:
        with self._lock:
            self.error_ratio = max(0.0, min(1.0, error_ratio))
            self.extra_latency = max(0.0, extra_latency)
        FAULT_ERROR_RATIO.set(self.error_ratio)
        FAULT_EXTRA_LATENCY.set(self.extra_latency)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "error_ratio": self.error_ratio,
                "extra_latency_seconds": self.extra_latency,
            }


DEFAULT_ERROR_RATIO = float(os.environ.get("ERROR_RATE", "0.02"))
faults = FaultState(DEFAULT_ERROR_RATIO, 0.0)
faults.set(DEFAULT_ERROR_RATIO, 0.0)  # 初始化 gauge 值


def simulate_latency(kind: str) -> None:
    """构造有层次感的延迟分布，让直方图/分位数图更好看。

    orders 接口：94% 落在 10~50ms；6% 落在 250~800ms；0.5% 长尾 1.5~3s（喂给 p99）。
    slow 接口：  集中在 300~900ms（模拟一个天生较慢的接口）。
    """
    r = random.random()
    if kind == "slow":
        time.sleep(random.uniform(0.3, 0.9))
    elif r < 0.005:
        time.sleep(random.uniform(1.5, 3.0))
    elif r < 0.06:
        time.sleep(random.uniform(0.25, 0.8))
    else:
        time.sleep(random.uniform(0.01, 0.05))

    # 故障注入的额外延迟（对所有接口生效）
    extra = faults.snapshot()["extra_latency_seconds"]
    if extra > 0:
        time.sleep(extra * random.uniform(0.8, 1.2))


# ---------------------------------------------------------------------------
# 3. FastAPI 应用与埋点中间件（HTTP middleware：一次包裹，全部接口生效）
# ---------------------------------------------------------------------------

app = FastAPI(title="lab01 demo app", docs_url="/docs")


@app.middleware("http")
async def instrument_requests(request: Request, call_next):
    """RED 埋点中间件：记录每个请求的计数、状态码与耗时。"""
    start = time.perf_counter()
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        # 未捕获异常：记为 500 并继续抛出（由 FastAPI 的 ServerErrorMiddleware 兜底）
        status = 500
        _record(request, status, start)
        raise
    _record(request, status, start)
    return response


def _record(request: Request, status: int, start: float) -> None:
    elapsed = time.perf_counter() - start
    # 路由模板：FastAPI 在路由匹配后 scope 中有 route 对象；
    # 未匹配到路由的请求统一记作 "unmatched"，避免原始 URL 造成高基数。
    route = request.scope.get("route")
    path = getattr(route, "path", None) or "unmatched"
    method = request.method
    REQUESTS.labels(method=method, path=path, status=str(status)).inc()
    DURATION.labels(method=method, path=path).observe(elapsed)


# ---------------------------------------------------------------------------
# 4. 业务接口
# ---------------------------------------------------------------------------

FAKE_ORDERS = [
    {"id": i, "item": random.choice(["keyboard", "mouse", "monitor", "ssd"]), "amount": random.randint(1, 5)}
    for i in range(1, 101)
]


@app.get("/api/orders")
def list_orders():
    """模拟查询订单：随机延迟 + 按错误率随机 500。"""
    simulate_latency("orders")
    if random.random() < faults.snapshot()["error_ratio"]:
        # 模拟内部错误（下游超时/依赖故障等）
        raise HTTPException(status_code=500, detail="simulated internal error")
    return {"orders": FAKE_ORDERS[:3], "total": len(FAKE_ORDERS)}


@app.post("/api/orders", status_code=201)
def create_order():
    """模拟创建订单：成功后业务计数 +1。"""
    simulate_latency("orders")
    if random.random() < faults.snapshot()["error_ratio"]:
        raise HTTPException(status_code=500, detail="simulated internal error")
    ORDERS_CREATED.inc()
    return {"id": random.randint(100, 9999), "status": "created"}


@app.get("/api/slow")
def slow_endpoint():
    """天生较慢的接口：延迟集中 300~900ms，用于观察延迟面板上的分层。"""
    simulate_latency("slow")
    return {"ok": True, "took": "by design"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 5. 故障注入控制端点（演示触发告警用）
# ---------------------------------------------------------------------------

@app.get("/faults")
def get_faults():
    return faults.snapshot()


@app.post("/faults")
def set_faults(error_ratio: float = None, extra_latency_seconds: float = None):
    """注入故障。示例：
    curl -X POST 'http://localhost:8000/faults?error_ratio=0.5&extra_latency_seconds=1.5'
    只传出现的参数，未传的参数保持不变。"""
    cur = faults.snapshot()
    faults.set(
        error_ratio=cur["error_ratio"] if error_ratio is None else error_ratio,
        extra_latency=cur["extra_latency_seconds"] if extra_latency_seconds is None else extra_latency_seconds,
    )
    logger.warning("faults updated: %s", faults.snapshot())
    return faults.snapshot()


@app.post("/faults/reset")
def reset_faults():
    faults.set(DEFAULT_ERROR_RATIO, 0.0)
    logger.warning("faults reset: %s", faults.snapshot())
    return faults.snapshot()


# ---------------------------------------------------------------------------
# 6. /metrics 端点（Prometheus 抓取入口）
# ---------------------------------------------------------------------------

@app.get("/metrics", include_in_schema=False)
def metrics():
    """返回 exposition 格式文本。curl http://localhost:8000/metrics 可直接查看。"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ---------------------------------------------------------------------------
# 7. Alertmanager webhook 接收端点（lab 演示：验证告警链路终点）
# ---------------------------------------------------------------------------

_alerts_received: deque = deque(maxlen=50)  # 最近 50 条告警通知（内存态，重启即清）


@app.post("/webhook/alerts")
async def receive_alerts(request: Request):
    """接收 Alertmanager 的 webhook POST（JSON 结构见官方 receiver 文档）。"""
    payload = await request.json()
    for alert in payload.get("alerts", []):
        entry = {
            "received_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": alert.get("status"),
            "alertname": alert.get("labels", {}).get("alertname"),
            "severity": alert.get("labels", {}).get("severity"),
            "summary": alert.get("annotations", {}).get("summary"),
        }
        _alerts_received.append(entry)
        logger.warning("ALERT received: %s", entry)
    return {"ok": True, "count": len(payload.get("alerts", []))}


@app.get("/webhook/alerts")
def list_alerts():
    return {"count": len(_alerts_received), "alerts": list(_alerts_received)}


# ---------------------------------------------------------------------------
# 8. 内置流量生成器（podman compose up 后面板立即有数据，无需手动压测）
# ---------------------------------------------------------------------------

def traffic_loop() -> None:
    """后台线程：模拟真实流量，请求自身 HTTP 接口（走完整中间件埋点链路）。"""
    base = f"http://127.0.0.1:{PORT}"
    while True:
        try:
            for _ in range(random.randint(3, 8)):
                # orders:slow = 8:2 的流量比例
                path = random.choices(["/api/orders", "/api/slow"], weights=[8, 2])[0]
                req = urllib.request.Request(base + path, method="GET")
                urllib.request.urlopen(req, timeout=30).read()
            if random.random() < 0.2:  # 偶尔创建订单，喂业务指标
                req = urllib.request.Request(base + "/api/orders", method="POST")
                urllib.request.urlopen(req, timeout=30).read()
        except Exception as exc:  # 启动早期 server 未就绪等，忽略即可
            logger.debug("traffic generator request failed: %s", exc)
        time.sleep(0.5)


@app.on_event("startup")
def start_traffic_generator():
    if TRAFFIC_ENABLED:
        threading.Thread(target=traffic_loop, daemon=True, name="traffic").start()
        logger.info("traffic generator started (TRAFFIC_ENABLED=true)")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
