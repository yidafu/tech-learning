---
sidebar_position: 1
---

# 结构化日志：从"能看"到"能查"

> 一句话：**日志是写给机器读的，顺便给人看**。结构化日志就是让每条日志成为一条带类型字段的记录，
> 而不是一串人类自然语言句子。这是日志能被索引、过滤、聚合、关联（trace_id）的前提。

- [1. 为什么需要结构化：从一次排障说起](#1-为什么需要结构化从一次排障说起)
- [2. 非结构化 vs 结构化：正面对比与 grep 演示](#2-非结构化-vs-结构化正面对比与-grep-演示)
- [3. 字段设计：标准字段表](#3-字段设计标准字段表)
- [4. 日志级别语义与使用规范](#4-日志级别语义与使用规范)
- [5. 多语言结构化日志库一览](#5-多语言结构化日志库一览)
- [6. 完整示例：Python structlog 与 Go slog](#6-完整示例python-structlog-与-go-slog)
- [7. 日志内容规范：不要打敏感信息](#7-日志内容规范不要打敏感信息)
- [8. 边界：日志不是审计数据库](#8-边界日志不是审计数据库)
- [9. 常见坑](#9-常见坑)
- [10. 面试题小结](#10-面试题小结)
- [11. 参考资料](#11-参考资料)

---

## 1. 为什么需要结构化：从一次排障说起

周五晚上 21:00，支付成功率掉了 3 个点。你拿到的是这样的日志：

```
2026-11-04 21:00:03 WARN request slow, user=1007 took 950ms
2026-11-04 21:00:04 ERROR payment failed for user 1008!!! reason=insufficient_funds
2026-11-04 21:00:04 [PaymentService] ERROR: Failed to process payment, order ord-1a2b, status=502
2026-11-04 21:00:05 ERROR upstream timeout (payment-gw) user=1009 order=ord-1c3d took 3001ms
```
<!-- 保留原图：文本日志行样例（数据示例），非概念示意图 -->

想回答三个最基本的问题，都做不到"一条命令"：

1. 21:00-21:10 之间到底有多少笔支付失败？—— `grep ERROR` 会把"expected 的 402"和
   "真的 5xx"混在一起，数量全靠数；
2. user 1007 后续的请求都成功了吗？—— `grep 1007` 会误伤订单号、时间戳里恰好含 1007 的行；
3. 把失败按"原因"分组统计？—— 每行格式都不一样，正则写到天亮。

根因：**信息被编码进了自由文本，没有字段**。结构化日志解决的就是这个问题——
每条日志是一个对象（通常序列化为单行 JSON），排障时用字段过滤、数值比较、分组聚合，
而不是肉眼 + 正则。

## 2. 非结构化 vs 结构化：正面对比与 grep 演示

### 2.1 同一件事的两种写法

非结构化（字符串拼接）：

```python
logger.info(f"Order {order_id} created for user {user_id}, amount={amount} yuan, took {duration_ms}ms")
```

```json
{"timestamp":"2026-11-04T12:00:00.123Z","level":"info","service":"order-svc","event":"order_created","order_id":"ord-1a2b","user_id":"u1007","amount":259.9,"duration_ms":34,"request_id":"9f8e7d6c"}
```

### 2.2 典型任务对照实验

假设 `app.log` 同时存在两种格式（前 4 行非结构化，后 4 行 JSON）。做四个日常任务：

**任务 A：找出所有支付失败且状态码为 5xx 的日志**

```bash
# 非结构化：格式不统一，只能堆正则，误报/漏报难评估
grep -E "payment.*(500|502|503)|status=5[0-9]{2}" app.log

# 结构化：语义精确——status 是数值字段，直接比较
jq -c 'select(.event=="payment_failed" and .status >= 500)' app.log
```

**任务 B：统计每个用户的失败次数，取 top 5**

```bash
# 非结构化：先写提取正则再 sort | uniq -c | sort -rn | head -5
grep ERROR app.log | grep -oE 'user=[0-9]+' | sort | uniq -c | sort -rn | head -5

# 结构化：按字段分组，一处不改就能换成按 event / path / downstream 分组
jq -r 'select(.level=="error") | .user_id' app.log | sort | uniq -c | sort -rn | head -5
```

**任务 C：找出耗时超过 800ms 的请求**

```bash
# 非结构化：单位写没写、took/ms/毫秒 格式飘忽，正则脆
grep -oE 'took ([0-9]+)ms' app.log | awk -F'[ m]' '$2 > 800'

# 结构化：数值字段直接比，还能顺带求 p95
jq -c 'select(.duration_ms != null and .duration_ms > 800)' app.log
jq -s '[.[].duration_ms] | sort | .[length*95/100 | floor]' app.log   # p95
```

**任务 D：在日志平台（Loki）里查**

```
# 非结构化只能全文正则（贵且慢，扫全部日志行）
{job="order"} |~ "payment.*5[0-9]{2}"

# 结构化：json 解析器提取字段后精确过滤（先按 label 缩小流，再过滤行）
{job="order"} | json | event="payment_failed" and status >= 500
```

### 2.3 总结对比表

| 维度 | 非结构化（文本拼接） | 结构化（JSON/key-value） |
|------|---------------------|--------------------------|
| 可检索性 | 靠正则，格式漂移即失效 | 字段精确匹配、数值比较、范围查询 |
| 可聚合性 | 几乎不能（需先解析） | 按 event/user/level 分组、sum/avg/quantile |
| 关联性（trace） | 无法可靠注入 | `trace_id` 字段天然可关联（阶段 4） |
| 人类初读体验 | 更"顺口" | 稍冗长（Grafana/IDE 可格式化展示） |
| 体积 | 略小 | 多 20%–50%（key 重复；可压缩缓解） |
| 日志平台兼容 | ELK 需 grok 解析、Loki 只能行过滤 | 开箱即用（`| json` / logfmt / OTLP） |
| 时区/格式漂移 | 常见坑（不同服务格式不同） | schema 约束后统一 |
| 更新演进 | 改一句话全员重学正则 | 增删字段不影响既有查询 |

结论：**新项目一律结构化；老项目增量改造**（最低限度：统一时间戳格式 + level + event 字段）。

## 3. 字段设计：标准字段表

字段设计三原则：

1. **有限词汇表**：`event`、`level` 这类字段的取值必须是可枚举集合，禁止把变量内容当事件名
   （`event=f"order_{order_id} created"` 是反面教材）；
2. **snake_case 全小写**：跨语言统一（JSON 字段区分大小写，`userId` 与 `user_id` 是两个字段）；
3. **数值不带单位后缀**：`duration_ms=34`（数值），而不是 `duration="34ms"`（字符串）——
   单位写进字段名。

### 3.1 标准字段表（建议每个团队固化前 8 个为"必有"）

| 字段 | 类型 | 必有 | 说明与示例 |
|------|------|------|-----------|
| `timestamp` | RFC3339 字符串（UTC） | ✅ | `2026-11-04T12:00:00.123Z`。毫秒精度；**禁止本地时区无时区后缀** |
| `level` | 枚举字符串 | ✅ | `debug / info / warn(warning) / error / fatal`（全团队统一大小写与拼写） |
| `service` | 字符串 | ✅ | 服务名（如 `order-svc`），与部署清单一致；多团队共享查询的锚点 |
| `env` | 枚举 | ✅ | `dev / staging / prod`，防止测试日志混入生产索引 |
| `event` | 字符串 | ✅ | **事件名**，动宾结构、有限集合：`order_created`、`payment_failed`、`config_reloaded` |
| `msg` / `message` | 字符串 | 建议 | 人类可读摘要（可与 event 合一，选一种风格坚持） |
| `request_id` | 字符串 | ✅（Web 服务） | 入口生成、全链路透传（网关/Trace 传播），排障定位一次请求的第一钥匙 |
| `trace_id` / `span_id` | 字符串 | 有 Trace 时 | W3C Trace Context 语义，阶段 4 详讲关联方法 |
| `user_id` | 字符串 | 按需 | 已脱敏的用户标识（内部 ID；**不要打手机号/邮箱明文**） |
| `duration_ms` | 数值 | 按需 | 耗时类字段统一毫秒；`_s`/`_us` 同理 |
| `status` | 数值 | 按需 | HTTP 状态码（数值！），便于 `status >= 500` 比较 |
| `method` / `path` | 字符串 | 按需 | `path` 建议**路由模板**（`/api/orders/{id}`）而非真实 URL，避免高基数与 PII |
| `http.route` | 字符串 | 按需 | 同上的语义化约定（OTel Semantic Conventions 风格） |
| `error` | 字符串 | 异常时 | `str(exc)`；类型放 `error_type` |
| `exception` | 字符串 | 异常时 | 格式化堆栈（多行合并成 `\n` 转义，仍是单行 JSON） |
| `version` | 字符串 | 建议 | 服务版本/commit，发布回归排查神器 |

> 参考 OpenTelemetry Semantic Conventions 的日志字段定义：
> <https://opentelemetry.io/docs/specs/semconv/general/logs/>（访问日期：2026-11-04）

### 3.2 事件命名示例

| 场景 | 好 | 坏（为什么坏） |
|------|----|----------------|
| 订单创建 | `order_created` | `Order created successfully!!!`（信息在 message，不可枚举） |
| 下游超时 | `downstream_timeout` | `timeout`（缺主体）、`inventory_svc_timeout`（主体应放 `downstream` 字段） |
| 配置热加载 | `config_reloaded` | `config v2 loaded`（版本放 `version` 字段） |
| 定时任务 | `cron_job_finished` | `done`（无信息量） |

## 4. 日志级别语义与使用规范

级别回答的问题是：**这条日志需要人/系统以什么紧迫度对待**。最常见的混乱是 WARN/ERROR 边界。

### 4.1 级别语义表

| 级别 | 语义 | 典型例子 | 默认是否落盘/保留 |
|------|------|---------|------------------|
| DEBUG | 内部执行细节，**仅在排查时开** | SQL 参数、缓存命中、循环每步 | 通常不落或短保留 |
| INFO | 业务里程碑：**发生了值得记录的正常事件** | 请求完成、订单创建、任务结束、启动/停止 | 落盘，中保留 |
| WARN | **异常但可自动恢复/预期内的失败**，当下不影响正确性；需要被观察的趋势 | 慢请求、重试成功、缓存降级、余额不足(4xx)、配置用了默认值 | 落盘，中保留 |
| ERROR | **需要人关注的失败**：功能受损且系统自己救不回来 | 5xx 未捕获异常、下游连续失败熔断、消息消费失败入死信 | 落盘，长保留 + 告警 |
| FATAL/CRITICAL | 进程无法继续，**即将退出** | 启动依赖缺失、端口占用、致命一致性破坏 | 落盘，最长保留 + 电话级告警 |

### 4.2 WARN 还是 ERROR？五问决策法

依次自问，第一个"是"即定级：

1. **系统会自动恢复吗？** 不会（重试已穷尽、数据已错）→ ERROR；
2. **是客户端的错误吗？**（参数非法、权限不足、余额不足 → 4xx）→ WARN 甚至 INFO，别污染 ERROR 指标；
3. **是预期内高频事件吗？**（每秒上万次的限流拒绝）→ WARN/DEBUG + 聚合成指标，ERROR 会制造告警风暴；
4. **需要有人在值班时看吗？** 需要 → ERROR；白天有人处理的队列积压告警 → WARN + 周期性（非每条）；
5. **只是"值得注意"吗**（首次触发缓存、fallback 到只读副本）→ WARN。

### 4.3 ERROR 该不该带堆栈？

| 情况 | 建议 |
|------|------|
| 异常路径（未捕获/捕获后上抛前的最终记录点） | **带**：`exception` 字段含完整堆栈。堆栈是定位代码位置的最快途径 |
| 业务失败（余额不足、校验不过） | **不带**：这不是代码缺陷，堆栈是噪音；`error` 字符串 + 业务字段足够 |
| 高频预期错误（每秒 >100 条） | **降级为 WARN 或不打**，改打聚合计数；或采样 1% 附堆栈 |
| 每层都 catch 每层都 error | **只在最终处理点打一次** ERROR，中间层 debug/warn；否则一个错误 N 条 ERROR，error rate 虚高 |

```python
# 反面教材：三层嵌套，一个超时打出 3 条 ERROR，堆栈 x3
def handler():
    try: call_a()
    except TimeoutError: log.error("call_a failed", exc_info=True); raise
def call_a():
    try: call_b()
    except TimeoutError: log.error("call_b failed", exc_info=True); raise

# 正确姿势：中间层传递上下文（warn 或不打），最外层统一记录一次 ERROR + 堆栈 + request_id
```

## 5. 多语言结构化日志库一览

| 语言 | 库 | 特点 | 备注 |
|------|----|------|------|
| Python | **structlog** | processor 链设计，与 stdlib logging / asyncio 深度整合，支持 contextvars 绑定 | 事实标准；lab02 采用 |
| Python | stdlib `logging` + JSON formatter | 零依赖：自写 `Formatter` 或用 `python-json-logger` | 老项目改造首选 |
| Go | **`log/slog`**（标准库，Go 1.21+） | 官方结构化日志，`slog.JSONHandler`，强类型 attr | 新项目默认选择 |
| Go | **zap**（uber-go） | 零分配、极高性能，`zapcore` 可定制 | 高吞吐服务主力 |
| Go | zerolog | 更极致的分配优化，链式 API | 与 zap 二选一 |
| Java | **logback + logstash-logback-encoder** | `LogstashEncoder` 直接输出 JSON（ELK 生态标配） | Spring Boot 3 内置支持结构化（`logging.structured.format`） |
| Java | log4j2 | 自带 `JsonLayout` | 存量系统多 |
| Node.js | **pino** | 极低开销（异步 transport），`pino(...)` + child logger | 性能最佳实践 |
| Node.js | winston | 生态大、transport 丰富 | 传统选择 |
| Rust | tracing + tracing-subscriber | 与 async/生态一体（tokio 时代事实标准） | span 与日志统一模型 |
| 通用 | OTel SDK logs API/bridge | 统一导出 OTLP，直接对接 Collector | 长期方向（阶段 0/4 详讲） |

选择建议：**没有特殊理由就用语言生态的默认项**（Go→slog、Python→structlog/stdlib、Java→logback JSON、Node→pino），
让"结构化"成为框架自带行为而不是每人手写。

## 6. 完整示例：Python structlog 与 Go slog

### 6.1 Python：structlog（带上下文注入与脱敏）

```python
"""最小可运行示例：pip install structlog && python demo.py"""
import logging
import uuid
from contextvars import ContextVar

import structlog

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def add_request_context(logger, method_name, event_dict):
    """processor：把请求上下文自动注入每条日志"""
    event_dict.setdefault("request_id", request_id_var.get())
    return event_dict


def redact(logger, method_name, event_dict):
    """processor：统一脱敏（纵深防御，详见第 7 节）"""
    for key in ("password", "token", "authorization"):
        if key in event_dict:
            event_dict[key] = "REDACTED"
    if "user_email" in event_dict:
        del event_dict["user_email"]  # PII：直接删除
    return event_dict


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True, key="timestamp"),
        add_request_context,
        redact,                                        # 脱敏放在渲染前
        structlog.processors.format_exc_info,          # exc_info=True -> exception 字符串
        structlog.processors.JSONRenderer(sort_keys=True),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    cache_logger_on_first_use=True,
)

log = structlog.get_logger(service="demo-app", env="local")


def handle_order(user_id: str):
    token = request_id_var.set(uuid.uuid4().hex[:12])
    try:
        log.info("order_created", user_id=user_id,
                 order_id="ord-123", amount=259.9, duration_ms=34)
        try:
            risky()
        except ValueError as e:
            # ERROR + 堆栈 + 业务上下文（阶段 2 lab 的 app.py 就是这个模式）
            log.error("order_failed", user_id=user_id, error=str(e), exc_info=True,
                      user_email="u@example.com")  # 故意违规，redact 会删掉
    finally:
        request_id_var.reset(token)


def risky():
    raise ValueError("inventory lock expired")


if __name__ == "__main__":
    handle_order("u1007")
```

输出（单行，此处展开注释）：

```json
{"duration_ms": 34, "env": "local", "event": "order_created", "level": "info",
 "order_id": "ord-123", "request_id": "a1b2c3d4e5f6", "service": "demo-app",
 "timestamp": "2026-11-04T12:00:00.123Z", "user_id": "u1007", "amount": 259.9}

{"env": "local", "error": "inventory lock expired", "event": "order_failed",
 "exception": "Traceback (most recent call last):\n  File \"demo.py\", line 50, in handle_order\n    ...\nValueError: inventory lock expired",
 "level": "error", "request_id": "a1b2c3d4e5f6", "service": "demo-app",
 "timestamp": "2026-11-04T12:00:00.456Z", "user_id": "u1007"}
```

注意 `user_email` 没有出现——processor 链在渲染前删除了它。

### 6.2 Go：标准库 slog

```go
// go run main.go  （Go >= 1.21）
package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
)

func main() {
	// JSON handler；AddSource 便于排障时定位文件行号
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	// 进程级公共字段：logger.With 复用，避免每次手写
	logger = logger.With("service", "order-svc", "env", "local")

	// 请求级上下文：context 携带 request_id（生产中由中间件注入）
	ctx := context.WithValue(context.Background(), "request_id", "a1b2c3d4")
	l := logger.With("request_id", ctx.Value("request_id"))

	l.Info("order_created",
		"user_id", "u1007",
		"order_id", "ord-123",
		"amount", 259.90,
		"duration_ms", 34,
	)

	err := processPayment()
	if err != nil {
		// ERROR + 堆栈：errors.Join/包装 + slog 的 attr
		l.Error("payment_failed",
			"user_id", "u1007",
			"error", err.Error(),
			"status", 502,
		)
	}
}

func processPayment() error {
	return errors.New("payment-gw: connection reset by peer")
}
```

输出：

```json
{"time":"2026-11-04T12:00:00.123+00:00","level":"INFO","msg":"order_created","service":"order-svc","env":"local","request_id":"a1b2c3d4","user_id":"u1007","order_id":"ord-123","amount":259.9,"duration_ms":34}
{"time":"2026-11-04T12:00:00.456+00:00","level":"ERROR","msg":"payment_failed","service":"order-svc","env":"local","request_id":"a1b2c3d4","user_id":"u1007","error":"payment-gw: connection reset by peer","status":502}
```

Go 侧注意：slog 默认 key 是 `time/level/msg`；要与 Python 侧字段名对齐，
用 `slog.NewJSONHandler` 后包一层替换 key 的 Handler（ReplaceAttr）统一成 `timestamp/level/event`。

### 6.3 Node.js：pino（三行版）

```javascript
// npm i pino
const pino = require("pino");
const log = pino({ base: { service: "order-svc", env: "local" }, timestamp: pino.stdTimeFunctions.isoTime });
const child = log.child({ request_id: "a1b2c3d4" });
child.info({ event: "order_created", user_id: "u1007", amount: 259.9 }, "done");
// => {"level":30,"time":"2026-11-04T12:00:00.123Z","service":"order-svc","env":"local","request_id":"a1b2c3d4","event":"order_created","user_id":"u1007","amount":259.9,"msg":"done"}
```

## 7. 日志内容规范：不要打敏感信息

**原则：日志一旦进入集中式日志平台，就等于在组织内广播**。任何不想让全员看到的字段，都不要打。

### 7.1 常见敏感字段清单

| 类别 | 示例 | 处理 |
|------|------|------|
| 凭证 | `password`、`token`、`api_key`、`authorization`、cookie、session_id | **绝不打印**（连打码都别打，存在性也会泄漏） |
| PII 直接标识 | 手机号、邮箱、身份证、护照号、银行卡号 | 删除或脱敏（部分遮蔽 / hash） |
| PII 准标识 | IP 地址、设备号、精确地理位置 | 保留末段 / 截断 / hash（各国法规要求不一） |
| 合规特殊类 | 病历（HIPAA）、种族、宗教、生物特征 | 禁止入日志 |
| 业务机密 | 完整价目表、密钥材料、第三方回调签名 | 禁止 |

### 7.2 脱敏四招（按优先级）

1. **不打（源头裁剪）**：问一句"排障真的需要它吗？"——90% 的敏感字段答案是"不需要"；
2. **替代（用稳定假名）**：要区分用户但不看真值 → 打 `user_id`（内部 ID）或 `hash(手机号)`；
3. **遮蔽（部分保留）**：`138****1234`、`ord-****4567`；只用于确需肉眼比对少量字符的场景；
4. **采集端兜底（纵深防御）**：在 Vector/Fluent Bit 层 `del`/redact，
   能接住第三方库打进来的敏感行——lab02 演示的就是这一层
   （见 `labs/lab02-loki-vector-logging/vector/vector.toml` 的 `redact_sensitive` transform）。

```python
# Python 兜底脱敏 processor（配合 6.1 示例使用）
SENSITIVE = {"password", "token", "authorization", "cookie", "set-cookie"}
PII_DELETE = {"user_email", "phone", "id_card", "bank_card"}

def redact(logger, method_name, event_dict):
    for k in SENSITIVE:
        if k in event_dict:
            event_dict[k] = "REDACTED"
    for k in PII_DELETE:
        event_dict.pop(k, None)
    return event_dict
```

### 7.3 易漏点

- **HTTP 请求体/响应体整包打印**：一次违规全带上（token + PII）；
- **异常消息里嵌着 SQL/连接串**：`Connection refused user=root password=xxx`；
- **debug 级别"暂时"打印密码**：级别过滤在生产被临时打开就泄漏；debug 也要遵守规范；
- **URL query string 打日志**：`?token=...`、`?email=...`；只打路由模板 + 白名单参数。

## 8. 边界：日志不是审计数据库

结构化日志很容易让人产生"可以拿它当审计记录"的错觉。明确边界：

| 维度 | 日志（Logging） | 审计（Audit） |
|------|----------------|---------------|
| 目的 | 排障、观察系统行为 | 事后追责、合规取证 |
| 数据完整性 | **尽力而为**：进程崩溃时缓冲区丢失、采集端可能丢弃/采样 | **必须完整、不可篡改**：WORM 存储、签名/链式哈希 |
| 顺序与一致性 | 容忍乱序、重复 | 要求严格有序、恰好一次 |
| 保留策略 | 成本驱动（7–90 天常见） | 法规驱动（金融常 5–10 年） |
| 用户可见性 | 内部工具 | 可能需要向用户/监管出示 |

工程结论：

1. "谁在什么时候改了这条订单的状态"这类**审计需求单独建表/建流**（数据库审计表 + 事务保证，
   或专用 audit pipeline），不要靠 grep 日志；
2. 日志可以被采样、降级、删除——任何建立在"日志必然完整"之上的业务逻辑都是错的；
3. 反过来，日志里也不该出现审计级敏感明细（第 7 节），两者职责分开各自合规。

> 延伸阅读：Google SRE Book 第 16 章 "Practical Alerting" 及日志章节
> <https://sre.google/books/>（访问日期：2026-11-04）

## 9. 常见坑

1. **多行 JSON 被日志驱动拆散**：`JSONRenderer` 输出单行没问题，但异常堆栈若用 `print` 打印
   就会被逐行采集（容器 json-file / k8s-file 驱动按行切割）。方案：堆栈 `\n` 转义进单个字段，
   或采集端配多行合并（见 [collectors.md](collectors.md)）。
2. **时间戳没时区**：`2026-11-04 12:00:00` 在 UTC+8 与 UTC 的系统间差 8 小时，Grafana 里"日志比告警晚 8 小时"。统一 UTC + RFC3339。
3. **级别拼写混乱**：`WARN`/`WARNING`、`Error`/`error` 混用 → LogQL `level="ERROR"` 匹配不全。
   全链路约定一种（lab02 在 Vector 里 `upcase` 统一）。
4. **字段名跨服务不一致**：`user` / `userId` / `user_id` 三种并存，查询要写三个 or。
   建团队字段字典 + review 检查。
5. **`f-string` 直接拼 JSON 字符串当日志**：`log.info(json.dumps({...}))` 是字符串不是结构化字段，
   下游还得再 parse 一次（虽然比纯文本好）。用库的结构化 API。
6. **高基数内容写进 event**：`event=f"user_{uid}_login"` 使事件集合无限膨胀，无法按 event 聚合。
7. **stdout 缓冲未关**：Python 容器没加 `-u`（或 `PYTHONUNBUFFERED=1`），日志"延迟几十秒才出现"甚至
   崩溃时整段丢失。
8. **日志里打整个数组/大对象**：一条日志几 MB，打爆采集管道与单行限制（Loki 单行默认 256KB 截断）。

## 10. 面试题小结

**Q1：为什么生产推荐 JSON 结构化日志？它比文本日志贵在哪，怎么缓解？**
A：结构化把信息从文本提升为字段，检索/过滤/聚合/关联（trace_id）无需正则解析，
日志平台（Loki `| json`、ES direct indexing、ClickHouse 列）都能直接消费。
代价是体积增大（key 重复、引号转义）与人类初读体验差；缓解：压缩（gzip/snappy，JSON 压缩率高）、
字段裁剪（不打整个对象）、Grafana/IDE 侧格式化展示。

**Q2：WARN 和 ERROR 的分界线？**
A：ERROR = 需要人关注且系统自愈不了的失败（5xx、未捕获异常、熔断）；
WARN = 异常但可自恢复或预期内的失败（重试成功、慢请求、4xx 业务拒绝）。
判据："这条日志会不会触发值班告警？"会→ERROR；"它是不是每秒成千上万条？"是→考虑 WARN/指标化。

**Q3：ERROR 日志一定要带堆栈吗？**
A：异常路径（代码缺陷、未知错误）要——堆栈是定位最快的字段；业务失败（余额不足）不要——噪音；
高频错误降级（WARN/采样）——避免告警风暴和存储浪费。同一异常只在一个最终处理点打 ERROR。

**Q4：如何防止敏感信息进日志？说至少三层防线。**
A：① 源头规范 + code review（不打）；② 库层 processor/hook 统一脱敏（structlog processor、
Java Layout wrapper）；③ 采集层兜底删除/redact（Vector VRL `del`、Fluent Bit filter）。
另加"红线扫描"：CI 或采集端对已知名词（password/token）报警。

**Q5：日志为什么不能当审计系统用？**
A：日志链路是尽力而为（缓冲丢失、采样、保留期短、可被运维删除），不满足审计的
完整性/不可篡改/长期保留/严格有序要求；审计需求应走带事务与 WORM 存储的专用链路。

**Q6：`request_id` 和 `trace_id` 的区别？**
A：request_id 是"这一次入口请求"的业务标识（网关生成即可，无标准格式要求）；
trace_id 是分布式追踪全局标识（W3C Trace Context，128-bit，随 context 传播跨服务，
还能关联 span）。单体应用 request_id 够用；微服务要跨服务串联时用 trace_id（阶段 3/4 展开）。

**Q7：Go 里 slog 相比 zap 的取舍？**
A：slog 是标准库、API 稳定、生态统一（Handler 接口），性能足够大多数场景；
zap 在极限吞吐（百万条/秒级、零分配敏感）与成熟生态（hook/sampler）上仍占优。
新项目默认 slog，存量 zap 不必迁。

**Q8：一条"慢请求" WARN 日志应该包含哪些字段？**
A：`timestamp/level/service/env` 基本字段 + `event=slow_request`、`duration_ms`（数值）、
`threshold_ms`（阈值，说明为什么它在这）、`path`（路由模板）、`request_id`/`user_id`（定位样本）、
如涉及下游加 `downstream`。核心是"拿到这条日志不需要再查第二次就能开始分析"。

## 11. 参考资料

- structlog 官方文档（processors、stdlib 整合）：<https://www.structlog.org/en/stable/>（访问日期：2026-11-04）
- Go `log/slog` 标准库文档：<https://pkg.go.dev/log/slog>（访问日期：2026-11-04）
- uber-go/zap：<https://github.com/uber-go/zap>（访问日期：2026-11-04）
- pino：<https://github.com/pinojs/pino>（访问日期：2026-11-04）
- logstash-logback-encoder（Java JSON 日志）：<https://github.com/logfellow/logstash-logback-encoder>（访问日期：2026-11-04）
- OpenTelemetry Logs 规范：<https://opentelemetry.io/docs/specs/otel/logs/>（访问日期：2026-11-04）
- OpenTelemetry 语义约定（日志字段）：<https://opentelemetry.io/docs/specs/semconv/general/logs/>（访问日期：2026-11-04）
- 12-Factor App · Logs（stdout 原则）：<https://12factor.net/logs>（访问日期：2026-11-04）
- Google SRE Books：<https://sre.google/books/>（访问日期：2026-11-04）
- 本工作区配套实验：[labs/lab02-loki-vector-logging/](../../labs/lab02-loki-vector-logging/README.md)

## 附：ASCII 图替换清单

本文档没有需要替换的 ASCII 字符图。

### 保留说明

- 1. 为什么需要结构化：从一次排障说起 开头的日志块：文本日志行样例（数据示例，非示意图），保留原样。
