"""日志工具：让每条日志自带 trace_id / span_id / trace_flags。

这是"日志 ↔ 链路"关联的关键一环（详见 notes/04-integration/correlation.md）：
1. TraceContextFilter：从当前 logging 上下文里取出活跃 span 的上下文（contextvars），
   写入 LogRecord 的 trace_id / span_id / trace_flags 字段；
2. JsonFormatter：把记录序列化成单行 JSON（trace_id 就在日志正文里）；
3. JsonOtlpHandler：先格式化成 JSON 再通过 OTLP 上报 —— 这样落到 Loki 的日志行
   天然带 trace_id，Grafana 才能用 derivedFields 正则提取并跳转 Tempo。
"""

import json
import logging
from datetime import datetime, timezone

from opentelemetry import trace
from opentelemetry.sdk._logs import LoggingHandler


class TraceContextFilter(logging.Filter):
    """把当前 span 的 trace 上下文注入 LogRecord。

    OTel Python 的 span 上下文存在 contextvars 里，同步/异步请求处理过程中
    只要 span 处于 active 状态，这里就能取到。注意 Filter 要挂在 handler 上
    （挂 logger 上时对子 logger 传播的记录不生效，这是 Python logging 的坑）。
    """

    def filter(self, record: logging.LogRecord) -> bool:
        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:
            record.trace_id = f"{ctx.trace_id:032x}"
            record.span_id = f"{ctx.span_id:016x}"
            # trace_flags 两位 hex，01 = 已采样（sampled），00 = 未采样
            record.trace_flags = f"{ctx.trace_flags:02x}"
        else:
            record.trace_id = ""
            record.span_id = ""
            record.trace_flags = ""
        return True


class JsonFormatter(logging.Formatter):
    """紧凑单行 JSON：字段名与 Grafana derivedFields 正则严格对应。"""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", ""),
            "span_id": getattr(record, "span_id", ""),
            "trace_flags": getattr(record, "trace_flags", ""),
        }
        # extra={...} 传进来的业务字段一并带上（order_id / stock / duration_ms 等）
        for key, value in record.__dict__.items():
            if key not in payload and key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
                "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
                "created", "msecs", "relativeCreated", "thread", "threadName",
                "processName", "process", "taskName", "asctime", "message",
            ):
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # separators 去掉空格，保证 "trace_id":"xxx" 能被 derivedFields 正则命中
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


class JsonOtlpHandler(LoggingHandler):
    """先把记录格式化成单行 JSON（含 trace_id），再交给 OTLP 导出。

    背景：OTel 的 LoggingHandler 默认把 record.getMessage()（纯文本）作为
    LogRecord 的 body，trace 上下文只放在 OTLP LogRecord 的独立字段里——
    loki exporter 落盘时只写 body，trace_id 就丢了。这里我们在应用侧把
    trace_id 写进 body，Loki 里的日志行即可被正则提取（也可被 LogQL
    `| json | trace_id=...` 精确过滤）。
    """

    def __init__(self, logger_provider, formatter: JsonFormatter) -> None:
        super().__init__(level=logging.NOTSET, logger_provider=logger_provider)
        self._formatter = formatter

    def emit(self, record: logging.LogRecord) -> None:
        try:
            record.msg = self._formatter.format(record)
            record.args = None
            super().emit(record)
        except Exception:  # 日志绝不能搞挂业务
            self.handleError(record)
