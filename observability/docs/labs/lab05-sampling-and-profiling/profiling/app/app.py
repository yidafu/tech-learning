"""
lab05 · 主题 B：Pyroscope 持续性能剖析实验的示例应用。

我们在代码里"故意"埋了两个特征鲜明的函数：
- is_prime(): 刻意用低效的试除法判断质数 —— CPU 热点（火焰图上应该最宽）
- burn_cpu():  循环调用 is_prime 榨干 CPU（负责把热点持续"点燃"）
- nap():       睡眠 —— off-CPU 时间（CPU 火焰图上几乎不可见，用于对照）

负载构成：约 70% 请求打 /cpu（CPU 型），30% 打 /idle（等待型），
内置负载线程持续运行，打开 Pyroscope UI 即可看到一张"一眼定位"的火焰图。

Pyroscope Python SDK（pyroscope-io）会：
1. 在进程内以 100Hz 采样所有线程的调用栈（内嵌 py-spy）；
2. 按 10s 窗口聚合并推送到 Pyroscope server 的 /ingest 端点；
3. 附带 application_name 与 tags 作为 series 标签。
"""

import logging
import os
import random
import threading
import time

import pyroscope
import requests
from flask import Flask, jsonify

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
APP_PORT = int(os.getenv("APP_PORT", "5000"))
PYROSCOPE_SERVER = os.getenv("PYROSCOPE_SERVER", "http://pyroscope:4080")
SAMPLE_RATE = int(os.getenv("PYROSCOPE_SAMPLE_RATE", "100"))
LOAD_INTERVAL = float(os.getenv("LOAD_INTERVAL", "0.3"))  # 秒 -> ~3.3 QPS
P_CPU = float(os.getenv("P_CPU", "0.7"))  # 负载中 /cpu 的比例，其余打 /idle
CPU_BURN_MS = int(os.getenv("CPU_BURN_MS", "250"))  # 每次 /cpu 燃烧的时长

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("hotspot-app")

# ---------------------------------------------------------------------------
# Pyroscope 初始化（必须在被采样的工作发生之前完成）
# ---------------------------------------------------------------------------
pyroscope.configure(
    application_name="hotspot-app",
    server_address=PYROSCOPE_SERVER,
    sample_rate=SAMPLE_RATE,
    tags={
        "env": "lab05",
        "version": "1.0.0",
    },
)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# 故意制造的热点函数
# ---------------------------------------------------------------------------
def is_prime(n: int) -> bool:
    """低效试除法判断质数：O(sqrt(n)) 的纯 Python 循环 —— 我们的热点主角。"""
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True


def burn_cpu(target_ms: int) -> int:
    """在 target_ms 毫秒内不停地算质数。绝大多 CPU 样本会落在 is_prime 里。"""
    deadline = time.perf_counter() + target_ms / 1000.0
    n = 2
    found = 0
    while time.perf_counter() < deadline:
        if is_prime(n):
            found += 1
        n += 1
    return found


def nap(ms: int) -> None:
    """睡眠 —— off-CPU：在 CPU 火焰图上几乎不出现（对照实验用）。"""
    time.sleep(ms / 1000.0)


# ---------------------------------------------------------------------------
# HTTP 端点
# ---------------------------------------------------------------------------
@app.get("/cpu")
def cpu_route():
    found = burn_cpu(CPU_BURN_MS)
    return jsonify(status="ok", primes=found, burned_ms=CPU_BURN_MS)


@app.get("/idle")
def idle_route():
    nap(300)
    return jsonify(status="ok", slept_ms=300)


@app.get("/stats")
def stats():
    return jsonify(_counter)


_counter = {"cpu": 0, "idle": 0}


# ---------------------------------------------------------------------------
# 内置负载发生器：70% 打 /cpu，30% 打 /idle
# ---------------------------------------------------------------------------
def load_generator():
    base = f"http://127.0.0.1:{APP_PORT}"
    logger.info(
        "load generator started: %.0f%% GET /cpu + %.0f%% GET /idle every %.2fs",
        P_CPU * 100, (1 - P_CPU) * 100, LOAD_INTERVAL,
    )
    while True:
        try:
            if random.random() < P_CPU:
                requests.get(f"{base}/cpu", timeout=10)
                _counter["cpu"] += 1
            else:
                requests.get(f"{base}/idle", timeout=10)
                _counter["idle"] += 1
        except requests.RequestException:
            pass  # 启动窗口期重试
        time.sleep(LOAD_INTERVAL)


if __name__ == "__main__":
    threading.Thread(target=load_generator, daemon=True).start()
    # threaded=True：Flask 每请求一线程，负载线程与工作线程的栈都会被采样
    app.run(host="0.0.0.0", port=APP_PORT, threaded=True)
