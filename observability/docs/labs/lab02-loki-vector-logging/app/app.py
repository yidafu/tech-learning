"""
Lab02 演示应用：一个模拟的"订单服务"。

职责：
1. 以结构化 JSON 格式把日志写到 stdout（12-factor：应用不直接写文件/发日志平台）；
   podman 环境下 Vector 的 docker_logs source 不可用（无 docker.sock），因此额外把
   同一份 stdout 双写到一个日志文件（LOG_FILE 环境变量指定，位于共享卷上），作为
   Vector file source 的采集通道——应用逻辑不变，只是多了一个"镜像出口"；
2. 每条日志携带 level / timestamp / event / service / request_id / user_id 等标准字段；
3. 模拟多种业务事件：正常请求、慢请求（WARN）、业务失败（WARN）、5xx 异常（ERROR + 堆栈）、
   DEBUG 级缓存细节；
4. 故意在部分日志里输出 user_email（"敏感字段"），用于演示在采集端（Vector VRL）统一删除——
   生产代码请从源头脱敏，这里仅为实验目的。

运行方式见 ../README.md。可调环境变量：
    LOG_LEVEL     日志级别（DEBUG/INFO/WARNING），默认 INFO
    ERROR_RATE    模拟 5xx 异常请求比例，默认 0.12
    WARN_RATE     模拟慢请求/业务失败比例，默认 0.15
    INTERVAL_S    每个请求之间的间隔（秒），默认 0.3
    LOG_FILE      可选；设置后每条日志在 stdout 之外再双写一份到该文件（容器内路径，
                  docker-compose.yml 已把它指向共享卷 /var/log/lab02/app.log）
"""

from __future__ import annotations

import logging
import os
import random
import sys
import time
import uuid
from contextvars import ContextVar

import structlog

# ---------------------------------------------------------------------------
# 基础配置
# ---------------------------------------------------------------------------

SERVICE_NAME = os.getenv("SERVICE_NAME", "demo-app")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
ERROR_RATE = float(os.getenv("ERROR_RATE", "0.12"))
WARN_RATE = float(os.getenv("WARN_RATE", "0.15"))
INTERVAL_S = float(os.getenv("INTERVAL_S", "0.3"))
LOG_FILE = os.getenv("LOG_FILE", "").strip()


class TeeWriter:
    """把 structlog 渲染好的日志行同时写到 stdout 与 LOG_FILE。

    podman 环境没有 docker.sock，Vector 的 docker_logs source 用不了；
    让应用把 stdout "tee" 一份到共享卷文件，Vector 用 file source 采集该文件。
    stdout 仍保留：`podman compose logs app` 随时能看，也符合 12-factor。
    （行缓冲：与 stdout 的逐行 flush 语义一致，采集端几乎实时可见。）
    """

    def __init__(self, path: str) -> None:
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        self._stdout = sys.stdout
        self._file = open(path, "a", buffering=1, encoding="utf-8")

    def write(self, s: str) -> None:
        self._stdout.write(s)
        self._stdout.flush()
        self._file.write(s)

    def flush(self) -> None:
        self._stdout.flush()
        self._file.flush()


# 设置 LOG_FILE 时双写文件；否则维持默认（纯 stdout）
LOGGER_FACTORY = (
    structlog.PrintLoggerFactory(file=TeeWriter(LOG_FILE))
    if LOG_FILE
    else structlog.PrintLoggerFactory()
)

# 模拟的用户池与路由（user_id 是低基数字符串，便于实验中按用户过滤）
USERS = [f"u{1000 + i}" for i in range(20)]
ROUTES = ["/api/orders", "/api/payments", "/api/cart", "/api/search", "/api/users"]
USER_AGENTS = ["ios/3.2.0", "android/2.9.1", "web/1.0.0"]
DOWNSTREAMS = ["inventory-svc", "payment-gw", "risk-engine"]

# request 上下文：模拟 Web 框架中间件把 request_id/user_id 放进 contextvars，
# 日志 processor 自动注入到每条日志，业务代码不需要每处都手写这两个字段。
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
user_id_var: ContextVar[str] = ContextVar("user_id", default="-")


def inject_request_context(
    logger, method_name: str, event_dict: dict
) -> dict:
    """structlog processor：把当前请求上下文注入每条日志。"""
    event_dict.setdefault("request_id", request_id_var.get())
    event_dict.setdefault("user_id", user_id_var.get())
    return event_dict


# ---------------------------------------------------------------------------
# structlog 配置：所有输出都是单行 JSON
# ---------------------------------------------------------------------------
structlog.configure(
    processors=[
        # 1) 合并 structlog.contextvars 中绑定的上下文
        structlog.contextvars.merge_contextvars,
        # 2) 注入 level 字段（小写字符串：debug/info/warning/error）
        structlog.processors.add_log_level,
        # 3) 注入 timestamp（UTC, RFC3339 ISO8601）
        structlog.processors.TimeStamper(fmt="iso", utc=True, key="timestamp"),
        # 4) 注入 request_id / user_id
        inject_request_context,
        # 5) exc_info=True 时附带调用栈信息（stack_info）
        structlog.processors.StackInfoRenderer(),
        # 6) 把异常对象渲染成 exception 字段（字符串化的堆栈）
        structlog.processors.format_exc_info,
        # 7) 最终序列化为单行 JSON（key 顺序稳定，便于阅读）
        structlog.processors.JSONRenderer(sort_keys=True),
    ],
    # 应用内日志级别过滤（低于设定级别的日志根本不会产生，配合采集端采样理解差别）
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, LOG_LEVEL, logging.INFO)
    ),
    logger_factory=LOGGER_FACTORY,
    cache_logger_on_first_use=True,
)

# logger 初始上下文：service 字段贯穿本进程所有日志
log = structlog.get_logger(service=SERVICE_NAME, env=os.getenv("ENV", "local"))


# ---------------------------------------------------------------------------
# 模拟的异常类型：让 ERROR 日志的 exception 堆栈更真实
# ---------------------------------------------------------------------------
class DownstreamTimeout(Exception):
    """下游服务调用超时（模拟网络问题）。"""


class InsufficientStock(Exception):
    """库存不足（模拟依赖服务返回错误）。"""


class SerializationError(Exception):
    """响应序列化失败（模拟代码缺陷）。"""


SIMULATED_EXCEPTIONS = [
    DownstreamTimeout,
    InsufficientStock,
    SerializationError,
]


# ---------------------------------------------------------------------------
# 模拟业务请求：一次请求会打多条日志（开始 → 业务细节 → 完成/失败）
# ---------------------------------------------------------------------------
def handle_request() -> None:
    request_id = uuid.uuid4().hex[:12]
    user_id = random.choice(USERS)

    rid_token = request_id_var.set(request_id)
    uid_token = user_id_var.set(user_id)
    try:
        route = random.choice(ROUTES)
        method = "GET" if route != "/api/orders" else "POST"
        log.info(
            "request_started",
            method=method,
            path=route,
            http_user_agent=random.choice(USER_AGENTS),
        )

        # DEBUG 级：内部执行细节，量大利大，生产默认关闭（这里由 LOG_LEVEL 控制）
        log.debug(
            "db_query",
            table=random.choice(["orders", "users", "inventory"]),
            duration_ms=random.randint(1, 40),
        )

        time.sleep(random.uniform(0.02, 0.1))  # 模拟处理耗时

        roll = random.random()
        if roll < ERROR_RATE:
            # ---- 5xx：异常路径，ERROR + 完整堆栈（exc_info=True）----
            exc_class = random.choice(SIMULATED_EXCEPTIONS)
            try:
                raise exc_class(f"simulated failure in {route}")
            except Exception as exc:
                log.error(
                    "request_failed",
                    method=method,
                    path=route,
                    status=random.choice([500, 502, 503]),
                    downstream=random.choice(DOWNSTREAMS),
                    error=str(exc),
                    # 故意输出敏感字段：演示 Vector 采集端删除（生产勿学！）
                    user_email=f"{user_id}@example.com",
                    exc_info=True,
                )
        elif roll < ERROR_RATE + WARN_RATE * 0.4:
            # ---- 慢请求：可自动恢复，不需要人处理，WARN 而非 ERROR ----
            log.warning(
                "slow_request",
                method=method,
                path=route,
                status=200,
                duration_ms=random.randint(800, 3000),
                threshold_ms=800,
            )
        elif roll < ERROR_RATE + WARN_RATE:
            # ---- 业务失败：客户端问题（余额不足等），4xx，WARN 而非 ERROR ----
            log.warning(
                "payment_failed",
                method=method,
                path=route,
                status=402,
                reason=random.choice(["insufficient_funds", "card_expired", "risk_rejected"]),
            )
        else:
            # ---- 正常完成：INFO，带可量化字段（duration_ms 数值便于 LogQL 聚合）----
            log.info(
                "request_completed",
                method=method,
                path=route,
                status=200,
                duration_ms=random.randint(5, 500),
                order_id=f"ord-{uuid.uuid4().hex[:8]}",
                amount=round(random.uniform(10, 2000), 2),
            )
    finally:
        request_id_var.reset(rid_token)
        user_id_var.reset(uid_token)


def main() -> None:
    log.info(
        "service_started",
        pid=os.getpid(),
        config={
            "log_level": LOG_LEVEL,
            "error_rate": ERROR_RATE,
            "warn_rate": WARN_RATE,
        },
    )
    try:
        while True:
            handle_request()
            time.sleep(random.uniform(INTERVAL_S * 0.5, INTERVAL_S * 1.5))
    except KeyboardInterrupt:
        log.info("service_stopped")


if __name__ == "__main__":
    main()
