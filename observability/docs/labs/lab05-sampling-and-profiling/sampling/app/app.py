"""
lab05 · 主题 A：tail_sampling 采样实验的示例应用。

行为：
- 提供 GET /work：按概率产生三类请求
    * 90% 正常（快速返回，几毫秒）
    *  5% 慢请求（sleep 1.2s，模拟依赖卡顿）
    *  5% 错误请求（HTTP 500，显式设置 span status = ERROR）
- 提供 GET /stats：返回本地请求计数，用于和两个 Jaeger 后端的 trace 数对照。
- 应用内置一个负载发生线程，持续请求自身（每 0.2s 一次，约 5 QPS），
  每个请求产生一条包含 2 个 span（client + server）的 trace。
- OTel SDK 同时向两个 Collector 导出（双路）：
    * collector-a（4317）：无采样，全量进 Jaeger A —— 基准组
    * collector-b（4317）：tail_sampling，错误/慢全保 + 正常 10% —— 实验组

关键点：SDK 端使用 ParentBased(ALWAYS_ON) 应用侧全采，把采样决策"后置"给
Collector B —— 这正是 tail-based 采样的标准接入方式
（见 notes/05-production/sampling.md 第 4 节）。
"""

import logging
import os
import random
import threading
import time

import requests
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased
from opentelemetry.trace import Status, StatusCode

# ---------------------------------------------------------------------------
# 基础配置（全部可用环境变量覆盖，便于不动代码调参数）
# ---------------------------------------------------------------------------
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "demo-app")
COLLECTOR_A_ENDPOINT = os.getenv("COLLECTOR_A_ENDPOINT", "http://collector-a:4317")
COLLECTOR_B_ENDPOINT = os.getenv("COLLECTOR_B_ENDPOINT", "http://collector-b:4317")
APP_PORT = int(os.getenv("APP_PORT", "8000"))

# 流量构成：正常 / 慢 / 错误（README 中的预期保留比例由此推算）
P_NORMAL = float(os.getenv("P_NORMAL", "0.90"))
P_SLOW = float(os.getenv("P_SLOW", "0.05"))
P_ERROR = float(os.getenv("P_ERROR", "0.05"))

# 慢请求时长必须大于 Collector B 的 latency 阈值（800ms）才能命中 latency policy
SLOW_SLEEP_SECONDS = float(os.getenv("SLOW_SLEEP_SECONDS", "1.2"))
LOAD_INTERVAL = float(os.getenv("LOAD_INTERVAL", "0.2"))  # 负载间隔秒数 -> ~5 QPS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("demo-app")

# ---------------------------------------------------------------------------
# OTel SDK：一个 TracerProvider 挂两个 BatchSpanProcessor（双路导出）
# ---------------------------------------------------------------------------
resource = Resource.create(
    {
        "service.name": SERVICE_NAME,
        "service.version": "1.0.0",
        "deployment.environment.name": "lab05",
    }
)

# SDK 端全采（ParentBased + 默认 AlwaysOn），采样决策后置到 Collector B
provider = TracerProvider(resource=resource, sampler=ParentBased())

exporter_a = OTLPSpanExporter(endpoint=COLLECTOR_A_ENDPOINT, insecure=True)  # -> 基准
exporter_b = OTLPSpanExporter(endpoint=COLLECTOR_B_ENDPOINT, insecure=True)  # -> tail_sampling
provider.add_span_processor(BatchSpanProcessor(exporter_a))
provider.add_span_processor(BatchSpanProcessor(exporter_b))

trace.set_tracer_provider(provider)

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)   # 产生 server span
RequestsInstrumentor().instrument()       # 产生 client span（负载线程里的 requests）

# 本地计数器：用来对照"应用真实发出了多少条 trace"
_counter = {"total": 0, "error": 0, "slow": 0, "normal": 0}


# ---------------------------------------------------------------------------
# 业务端点：制造 正常 / 慢 / 错误 三类 trace
# ---------------------------------------------------------------------------
@app.get("/work")
def work():
    dice = random.random()
    current_span = trace.get_current_span()
    _counter["total"] += 1

    if dice < P_ERROR:
        # 错误分支：显式把 span 状态置为 ERROR。
        # 现代 HTTP instrumentation 会自动把 5xx 映射为 ERROR，
        # 但显式设置可保证 tail_sampling 的 status_code policy 百分百命中
        # （不同语言/版本 semconv 行为有差异，显式 > 隐式，见 sampling.md 坑 7.6）。
        current_span.set_status(Status(StatusCode.ERROR, "simulated failure"))
        current_span.set_attribute("app.failure_type", "simulated_500")
        _counter["error"] += 1
        return JSONResponse(status_code=500, content={"status": "error", "detail": "boom"})

    if dice < P_ERROR + P_SLOW:
        # 慢分支：sleep 1.2s > Collector B 的 latency 阈值 800ms，
        # 客户端 span 时长约 1.2s，trace 总时长必然命中 latency policy。
        time.sleep(SLOW_SLEEP_SECONDS)
        current_span.set_attribute("app.slow", True)
        _counter["slow"] += 1
        return {"status": "slow", "slept": SLOW_SLEEP_SECONDS}

    # 正常分支：轻微计算，模拟真实工作量
    _ = sum(i * i for i in range(1000))
    _counter["normal"] += 1
    return {"status": "ok"}


@app.get("/stats")
def stats():
    """本地计数，用于和两个 Jaeger 后端的 trace 数量对照。"""
    return dict(_counter)


# ---------------------------------------------------------------------------
# 负载发生器：后台线程持续请求自己
# （必须使用被 RequestsInstrumentor 埋点的 requests，
#  这样 client span + server span 才能组成一条完整 trace）
# ---------------------------------------------------------------------------
def load_generator():
    base_url = f"http://127.0.0.1:{APP_PORT}"
    logger.info("load generator started: GET %s/work every %.2fs", base_url, LOAD_INTERVAL)
    while True:
        try:
            requests.get(f"{base_url}/work", timeout=10)
        except requests.RequestException:
            # 服务尚未就绪（启动窗口期）时静默重试
            pass
        time.sleep(LOAD_INTERVAL)


@app.on_event("startup")
def start_load():
    threading.Thread(target=load_generator, daemon=True).start()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=APP_PORT, log_level="warning")
