---
sidebar_position: 6
---

# 6. 日志最佳实践清单：从"会打"到"打得对、打得省"

> 前四篇讲的是机制，本篇是**可以直接抄进团队规范文档**的操作清单。
> 每条都按"怎么做 / 为什么 / 反例"组织，code review 时可逐条对照。

- [1. 一条好日志的 Checklist](#1-一条好日志的-checklist)
- [2. 错误日志三要素：事件、上下文、动作](#2-错误日志三要素事件上下文动作)
- [3. trace_id 注入：跨服务关联预览（阶段 4 详讲）](#3-trace_id-注入跨服务关联预览阶段-4-详讲)
- [4. 日志量治理：采样、去重、分级保留](#4-日志量治理采样去重分级保留)
- [5. 从指标下钻到日志（Grafana 预览）](#5-从指标下钻到日志grafana-预览)
- [6. 团队落地：规范怎么变成习惯](#6-团队落地规范怎么变成习惯)
- [7. 常见坑](#7-常见坑)
- [8. 面试题小结](#8-面试题小结)
- [9. 参考资料](#9-参考资料)

---

## 1. 一条好日志的 Checklist

写完一行日志代码，过一遍这 10 条（前 6 条每条都必过，后 4 条视场景）：

| # | 检查项 | 判据 |
|---|--------|------|
| 1 | **结构化** | 走日志库的结构化 API（key-value），不是 f-string 拼句子 |
| 2 | **级别正确** | 按"需要人关注吗？"定级：自愈失败→ERROR，可自愈→WARN，正常事件→INFO（见 structured-logging.md 第 4 节） |
| 3 | **事件名可枚举** | `event="order_created"`，不是 `event=f"order {oid} ok"` |
| 4 | **有时间戳/级别/服务名/环境** | 库默认或 processor 统一注入，业务代码不手写 |
| 5 | **有定位上下文** | request_id / user_id / 关键业务键（order_id）至少其一 |
| 6 | **无敏感信息** | 对照敏感字段清单（密码/token/PII）——日志=组织内广播 |
| 7 | 数值字段是数值 | `duration_ms=34`，不是 `duration="34ms"` |
| 8 | 有错误细节 | 异常路径带 `exception`（堆栈）；每错误只打一次（最外层） |
| 9 | 频率可控 | 这行代码在最坏情况下每秒打多少条？会不会被日志风暴放大 |
| 10 | 可聚合 | 将来要按它统计吗？那它得是字段而不是句子里的一个词 |

### 正反例对照

```python
# 反例：句子拼接 + 级别滥用 + 高频 + 无上下文 + PII
logger.info(f"User {phone} logged in and did something, ok? {time.time()}")

# 正例：结构化、可枚举事件、上下文齐全、脱敏
log.info("user_login_succeeded", user_id="u1007", method="oauth", duration_ms=87,
         request_id=req_id)   # 不打手机号；要区分用户有 user_id 足够
```

一条"好日志"的自检问句：**"半夜被告警叫醒的人，只看这一条能开始排查吗？"**
不能 → 缺字段；不需要被叫醒 → 级别错了。

## 2. 错误日志三要素：事件、上下文、动作

ERROR 级日志的价值公式：**事件 + 上下文 + 动作**。

| 要素 | 回答的问题 | 落到字段 |
|------|-----------|---------|
| **事件（What）** | 发生了什么失败？ | `event`（可枚举）、`error`/`error_type`、`exception`（堆栈） |
| **上下文（Where/Who/When）** | 在什么请求、什么用户、什么输入、什么依赖上发生？ | `request_id`、`user_id`、`path`、`downstream`、关键参数、`timestamp`、`service`/`env`/`version` |
| **动作（Then what）** | 系统接下来做了什么/需要人做什么？ | `action="retried"`、`impact="order_cancelled"`、`runbook="https://wiki/runbooks/payment-gw-timeout"` |

三要素齐的样例：

```json
{
  "level": "error",
  "timestamp": "2026-11-04T21:00:05.123Z",
  "service": "payment-svc", "env": "prod", "version": "2.14.3",
  "event": "payment_failed",
  "request_id": "9f8e7d6c5b4a", "user_id": "u1007", "order_id": "ord-1a2b",
  "downstream": "payment-gw", "error": "connection reset by peer",
  "exception": "Traceback ... ConnectionResetError ...",
  "action": "retry_exhausted_order_queued", "runbook": "https://wiki/runbooks/payment-gw"
}
```

对比缺要素的坏例子及后果：

| 坏例子 | 缺什么 | 后果 |
|--------|--------|------|
| `ERROR: something failed` | 事件细节+全部上下文 | 无法定位是哪条链路、哪个依赖 |
| `ERROR payment-gw timeout req=9f8e... user=1007 oid=1a2b took=3001ms retries=3 dead=true` | 全挤在文本里 | 字段不可聚合，每次人肉正则 |
| 每层 catch 都打一条 ERROR | 一次错误 ×N 条 | error rate 指标虚高、告警风暴 |
| 只有 event 没有动作 | 不知道后果 | 无法判断是"已自动重试可忽略"还是"订单卡死需人工" |

**"动作"要素最常被忽视**：它决定读日志的人第一反应是"继续睡"还是"现在起来"。
高成熟团队会在 SDK 封装里要求 `action` 与 `runbook` 字段成对出现。

## 3. trace_id 注入：跨服务关联预览（阶段 4 详讲）

### 3.1 为什么需要

微服务里一次排障要横跨 5+ 服务。request_id 只在入口网关生成、靠业务代码透传，
链路一长就断；**trace_id 是行业标准（W3C Trace Context）的全局标识**，由 OTel SDK
随 HTTP header（`traceparent`）/gRPC metadata 自动传播，日志、trace、指标（exemplars）
三方共用一个 ID —— 这是阶段 4"三大支柱关联"的核心钥匙。

```mermaid
flowchart LR
    H["traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"]
    F1["版本<br/>00"]
    F2["trace_id<br/>4bf92f3577b34da6a3ce929d0e0e4736<br/>（128 bit，全程不变）"]
    F3["span_id<br/>00f067aa0ba902b7<br/>（本段 span）"]
    F4["采样标志<br/>01"]
    H --> F1
    H --> F2
    H --> F3
    H --> F4
```

规范：W3C Trace Context <https://www.w3.org/TR/trace-context/>（访问日期：2026-11-04）。

### 3.2 最小可用模式（Python，中间件 + contextvars）

```python
# 伪代码：真实生产用 OTel SDK 自动埋点（阶段 3/4 实战）
from opentelemetry import trace
import structlog

tracer = trace.get_tracer(__name__)

@app.middleware("http")
async def trace_middleware(request, call_next):
    with tracer.start_as_current_span(request.url.path) as span:   # 自动解析 traceparent
        structlog.contextvars.bind_contextvars(
            trace_id=format(span.get_span_context().trace_id, "032x"),  # 32 hex
            span_id=format(span.get_span_context().span_id, "016x"),
            request_id=request.headers.get("x-request-id", "-"),
        )
        try:
            return await call_next(request)
        finally:
            structlog.contextvars.unbind_contextvars("trace_id", "span_id", "request_id")
```

Go 一句话版：`slog` + `trace.SpanContext(ctx)` 注入 attr；Node 用 pino `mixIn` + AsyncLocalStorage。

### 3.3 本阶段的两个预埋动作

1. 日志 schema 里**现在就留 `trace_id`/`span_id` 字段**（哪怕暂时为空）——Grafana 数据源里配
   **derived field**（正则提取 trace_id → 一键跳转 Tempo/Jaeger），lab02 的数据源配置里已预置；
2. 入口网关先统一生成/透传 `X-Request-Id`——它是 trace_id 落地前的过渡钥匙。

阶段 4（[notes/04-integration/](../04-integration/README.md)）会完整讲 OTel 自动注入与 exemplars。

## 4. 日志量治理：采样、去重、分级保留

日志的三个失控维度：**条数（写入/查询成本）**、**重复（信息密度）**、**保留期（存储成本）**。

### 4.1 分层采样（Sampling by level）

| 层 | 策略 | 理由 |
|----|------|------|
| DEBUG | 采集前默认关闭；临时开（排障）限时回收；必须采时 1%–5% | 量大信息低 |
| INFO | 100% 或按 event 白名单；高频循环日志（每请求 5 条）考虑合并为 1 条摘要 | 量中信息中 |
| WARN | 100% | 趋势观察的原料 |
| ERROR/FATAL | **100% 永不采样** | 错误样本的完整性就是告警的准确性 |

实现位置（从前往后优先）：应用内（级别过滤+日志库 sampler，省 CPU）→ 采集器
（Vector `sample` + `exclude` 直通错误）→ 后端（Loki/CH 分租户分流，少见）。

### 4.2 去重与限流（采集层防线）

- **去重**：同一 `fingerprint`（如 level+event+error_type）在时间窗内只放第一条
  （Vector `dedupe`、Fluent Bit `rewrite_tag`+`grep` 组合）；防"一个数据库挂了打出 50 万条相同 ERROR"；
- **限流**：每服务每级别设每秒上限（Vector `throttle`），超限部分聚合成一条
  `"log flood: dropped 12345 events in 10s"` 摘要——**丢弃也要留账**。

### 4.3 分级保留（Retention tiers）

按"信息价值衰减速度"设保留期（示例基线，按合规调整）：

| 类别 | 保留期 | 说明 |
|------|--------|------|
| ERROR/FATAL + 安全审计流 | 90 天–1 年 | 事故复盘、合规追查 |
| WARN | 30 天 | 趋势回看 |
| INFO | 14–30 天 | 常规排障窗口 |
| DEBUG（若保留） | 1–3 天 | 复现细节 |

工程实现取舍（详见 elk-and-clickhouse.md 第 6 节决策树与 loki.md 第 6 节）：
单系统难做行级分级 → 常见"按 level 拆 label/租户/索引 + 各自 retention"，或接受统一保留靠压缩省钱。

### 4.4 从"逐条日志"升维到"指标"

排障时 95% 的问题只需要**计数与分布**：

```mermaid
flowchart TD
    A["每请求打 1 条 INFO order_created"] -->|"改造为"| B["1 条 INFO + 1 个 counter（orders_created_total）+ 1 个 histogram（duration）"]
```

原则：**能用指标回答的问题（速率/分位数/比例）不要靠扫日志回答**；日志负责"看单样本"，
指标负责"看总量"。这就是三大支柱分工在日志治理上的投影。

### 4.5 成本观测（治理要闭环）

给日志链路自己建三个指标 + 一块仪表盘：

1. 摄入速率（GB/天、条/秒）按服务分解 → 发现"谁在刷屏"；
2. 采集器丢弃/采样率（dropped vs delivered）→ 别让治理变成静默丢；
3. 单 GB 落地成本（存储单价 × 摄入）→ 让"删掉 10% 无效 DEBUG"变成可汇报的省钱数字。

## 5. 从指标下钻到日志（Grafana 预览）

排障的标准动线：**指标发现异常（面）→ 日志定位样本（点）→ trace 还原过程（线）**。
Grafana 里打通前两步：

### 5.1 Explore 的 Metrics → Logs 联动

在 Explore（Prometheus）查询旁点 **"Logs" 按钮标签**（metrics-to-logs）：
Grafana 按数据源配置的 **label 映射**（`job` → `job`、`instance` → `host`）自动生成对应的
Loki 查询（如 `{job="payment-svc", host="pod-1"}` + 时间范围），无需手抄标签。

### 5.2 Derived Fields（日志 → trace 一键跳转）

Loki 数据源配置里给 `trace_id` 建 derived field（lab02 的
`grafana/provisioning/datasources/loki.yaml` 已预置）：

```yaml
derivedFields:
  - name: TraceID
    matcherRegex: '"trace_id":\s*"([0-9a-f]+)"'
    url: '$${__value.raw}'        # 或完整 Tempo/Jaeger 深链
```

日志行旁出现可点击的 TraceID 徽章 → 直达该请求的完整调用链（阶段 4 完整实战）。

### 5.3 Dashboard 内联动

- 同一 dashboard 上放"指标面板 + 日志面板"，共享时间范围与变量（`$service`），
  日志查询写成 `{job="lab02", service="$service"} | json`；
- 日志面板配 **data link**：字段值（如 `user_id`）链接到预填该值的 Explore 查询；
- lab02 的仪表盘（`grafana/dashboards/lab02-logs.json`）就是这个结构的最小实现：
  错误速率曲线（指标视图，由 LogQL 聚合而来）+ 日志原始流 + p95 面板同屏。

### 5.4 告警回链

Alertmanager 告警注解里带**预填好的日志查询链接**（runbook 的一部分）：
`logs: {job="payment-svc"} | json | downstream="payment-gw" | status >= 500`，
被叫醒的人一次点击进入现场。

## 6. 团队落地：规范怎么变成习惯

1. **一页纸规范**：把本文第 1 节 checklist + 字段字典（structured-logging.md 3.1 表）
   固化为 `LOGGING.md` 放仓库，code review 引用条目编号（"违反 L3：event 不可枚举"）；
2. **统一 SDK 封装**：各语言封装团队 logger（公共字段注入、脱敏 processor、
   request_id/trace_id 中间件、默认 JSON），**让正确的事成为默认行为**；
   lab02 的 `app/app.py` 就是这种封装的最小样例；
3. **静态检查**：
   - Python：ruff/flake8 禁 f-string 直入 logger（`logging-fstring-interpolation`）、
     规定 `extra=` 或结构化库；
   - Go：lint 禁 `fmt.Println`（应用代码内），统一 slog；
4. **CI 红线扫描**：对新增日志语句跑敏感词表（password/token/bearer…），命中即 fail；
5. **日志评审例会**：季度性拉"日志 top 量服务 + top 贵查询"，删 DEBUG、拆高基数 label
   ——把第 4.5 节的成本观测变成固定议程；
6. **新人第一周任务**：用 lab02 跑一遍全链路，理解每个组件的配置项为什么存在。

## 7. 常见坑

1. **"先打上再说"式 DEBUG 上生产**：忘记摘除 → 量暴涨 + 可能带 PII；
   DEBUG 要有临时开关（配置中心）与自动回收（TTL）。
2. **脱敏只做在应用层**：第三方库（ORM 错误带连接串）照样漏；
   采集层兜底（lab02 Vector `redact_sensitive`）+ 红线扫描双保险。
3. **告警依赖日志文本**：`日志含 "timeout" 就告警` 在措辞微调后全体静默失效；
   告警应基于指标（含由日志聚成的指标），文本只做辅助。
4. **ERROR 当流程控制**：用 error 日志的副作用（触发某个监听程序）做业务逻辑——
   日志系统不可靠（见 structured-logging.md 第 8 节），业务逻辑请走正经消息通道。
5. **保留期一刀切 90 天**：INFO 也 90 天 → 存储账单 ×3；按 4.3 节分级。
6. **采样把错误也采没了**：全局 10% 采样把 ERROR 也丢了 90% → 告警失真。
   采样必须按级别分层且错误直通（4.1 节表）。
7. **字段字典没人维护**：半年后 event 出现 `orderCreated`/`order_created`/`create_order` 三种；
   字典要挂 CI 校验（枚举值变更走 PR）。
8. **runbook 链接腐烂**：错误三要素里的 runbook URL 404 —— 与代码同仓随版本发布。

## 8. 面试题小结

**Q1：设计一个日志规范，最先固化的五件事？**
A：①字段字典（timestamp/level/service/env/event/request_id 必有）+ 命名约定；
②级别判定规则（可自愈？需要人？）③敏感字段清单与脱敏四招；④错误日志三要素；
⑤采样与保留基线。配套统一 SDK 封装让规范自动执行。

**Q2：如何答"我们的日志存储太贵了"？**
A：四步：量化（GB/天×单价，按服务/级别分解）→ 削峰（DEBUG 关闭/采样、去重限流、
高频循环合并）→ 分级保留（ERROR 90d/INFO 14d）→ 换引擎评估（SSD 倒排 → 对象存储+压缩，
见选型决策树）。先治理后迁移，通常前两步就能省 50%+。

**Q3：ERROR 日志要包含哪三要素？为什么"动作"最重要？**
A：事件（发生了什么失败）、上下文（哪个请求/用户/依赖/输入）、动作（系统后续做了什么、
人要不要处理、runbook 在哪）。动作决定响应优先级与第一动作，缺它的人只能"猜影响面"。

**Q4：日志采样为什么必须分层？给一个具体策略。**
A：不同级别信息价值/量级差万倍，全局采样要么浪费（错误被丢）要么无效（DEBUG 还是太多）。
策略：ERROR/FATAL 100%、WARN 100%、INFO 100% 或白名单、DEBUG 1%–5%；
错误直通用采集器 exclude 条件实现（Vector sample + `exclude`）。

**Q5：指标和日志的边界？什么时候该把日志改成指标？**
A：指标回答"多少/多快/什么比例"（聚合视图），日志回答"具体哪一条/长什么样"（单样本）。
当你在用 LogQL/ES 聚合回答速率或分位数问题时，就该加 counter/histogram 指标了；
日志里保留样本与异常细节即可。

**Q6：trace_id 和 request_id 在日志里各扮演什么角色？**
A：request_id 是入口请求的业务追踪键（简单、单系统够用）；trace_id 是 W3C 标准的
分布式追踪键（跨服务自动传播，还能关联 trace 视图与 exemplars）。
成熟形态：两个都打，trace_id 用于跳转 trace，request_id 用于与用户反馈/工单对账。

**Q7：Grafana 里如何从"P99 延迟升高"走到"看到具体慢请求日志"？**
A：指标面板（P99）确认时间窗与标签 → Explore 的 metrics-to-logs 联动（label 映射生成 Loki 查询）
→ 日志流里按 `duration_ms > 阈值` 过滤拿样本 → 用行内 trace_id derived field 跳转 trace
（阶段 4）→ 定位慢 span。

## 9. 参考资料

- 本阶段其他笔记：[structured-logging.md](structured-logging.md)、[loki.md](loki.md)、
  [collectors.md](collectors.md)、[elk-and-clickhouse.md](elk-and-clickhouse.md)
- Google SRE Books（章节：Practical Alerting / Managing Incidents）：<https://sre.google/books/>（访问日期：2026-11-04）
- W3C Trace Context 规范：<https://www.w3.org/TR/trace-context/>（访问日期：2026-11-04）
- OpenTelemetry Logs 规范：<https://opentelemetry.io/docs/specs/otel/logs/>（访问日期：2026-11-04）
- Grafana Loki 数据源（derived fields / metrics-to-logs）：<https://grafana.com/docs/grafana/latest/datasources/loki/>（访问日期：2026-11-04）
- Vector sampling/dedupe transforms：<https://vector.dev/docs/reference/configuration/transforms/sample/>（访问日期：2026-11-04）
- 12-Factor App · Logs：<https://12factor.net/logs>（访问日期：2026-11-04）
- 本工作区配套实验：[labs/lab02-loki-vector-logging/](../../labs/lab02-loki-vector-logging/README.md)

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 3.1 为什么需要 | traceparent 头的字段分解标注（版本 / trace_id / span_id / 采样标志） | flowchart LR |
| 4.4 从“逐条日志”升维到“指标” | 「每请求一条 INFO」改造为「INFO + counter + histogram」的前后对比 | flowchart TD |

## 10. 工程三陷阱：采样丢错、字段静默漂移、跳转正则失配

三个在日志链路上"改一处、断一线"的高频陷阱，按触发场景、根因、规避三段展开，评审采集器与日志库变更时逐条对照。

### 陷阱一：采样把 ERROR 一起丢了，事故现场只剩十分之一

- **触发场景**：成本压力下给采集器加了按比例采样（10 条放 1 条），没配级别直通。一周后支付网关抖动，想翻 ERROR 定位根因——库里只剩一成错误样本，且丢弃是随机的，时间线拼不完整，复盘会开成了"罗生门"。
- **根因**：采样 transform 按条独立丢弃，不理解级别语义；"采样省成本"被误用成全局策略，而正确的形状是第 4.1 节的按级别分层。
- **规避**：任何采样配置旁必须显式写错误直通条件（Vector 的 sample transform 支持 exclude 参数，示意写法见 `vector.dev` 的 transforms 参考文档）；用 4.5 节的成本观测指标核对 dropped 与 delivered 的比例是否符合设计；把"ERROR/FATAL 永不采样"写进规范当红线，采集器配置纳入 CI 校验。

### 陷阱二：字段在管道里被静默改名，查询从此查空

- **触发场景**：应用一直输出 `level` 字段，某次采集器 remap 重构把输出改成了 `severity`，没人通知查询方——此后所有按 level 过滤的查询、告警、仪表盘一起静默失效，直到有人发现"错误日志怎么越来越少"。
- **根因**：日志 schema 没有"契约位"。管道中间一步改字段名属于无发布说明的接口变更；查询侧则默认"字段名永远不变"，两边错位无人兜底。
- **规避**：把第 6 节的 LOGGING.md 升格为管道契约——应用输出与采集器输出各维护一份字段清单，都进版本库；管道改动跑"金样本"回放：固定几条输入 JSON，断言输出字段名与取值；查询与告警里的字段引用从字典模板生成，禁止手抄。

### 陷阱三：跳转正则对序列化形态过敏，trace 联动悄悄断线

- **触发场景**：日志库升级后 JSON 输出从紧凑形态变为带空格形态（冒号后多了空格），derived field 的正则没写空白兼容，日志行旁的 TraceID 徽章整排消失——"指标下钻日志再跳 trace"的动线断了，却没有报障。
- **根因**：derived field 的匹配正则建立在字符串形态上，而序列化格式是日志库的实现细节，随版本漂移。
- **规避**：正则对冒号与空白做兼容并锚定字段边界；长期解法是不依赖正文——用 OTel LogRecord 的协议字段（TraceId 与 SpanId 是独立字段，机制见 [otel-metrics-and-logs-sdks.md](../00-concepts/otel-metrics-and-logs-sdks.md) 第 9 节），Loki native OTLP 接入时可直接查询；季度巡检加一条：用最近的真实日志样本回放 derived field 命中率。

## 11. 手算配方：日志管道的条数与字节账

治理不能拍脑袋，先学会算账。下面用一条"从应用到落地"的完整推演演示方法（数字全部为构造的示意值，算术每步可复算）。

**第 1 步：算原始产出。** 某服务每秒产生：INFO 500 条 × 400 字节（JSON 序列化后）；WARN 120 条 × 350 字节，其中 connection_reset 一个指纹就占满 120 条/秒；ERROR 5 条 × 1200 字节（含堆栈）。

- 原始条数：500 + 120 + 5 = 625 条/秒；
- 原始字节：500×400 + 120×350 + 5×1200 = 200,000 + 42,000 + 6,000 = 248,000 字节/秒；
- 折合每天：248,000 × 86,400 = 21,427,200,000 字节 ≈ 21.4 GB/天。

**第 2 步：应用层治理。** 高频 INFO 已按 4.1 节把每请求 5 条合并成 1 条摘要（本例假设已完成），DEBUG 生产默认关闭——此层无新增变化。

**第 3 步：采集层去重。** 对 WARN 按"级别 + event + error_type"做指纹去重，10 秒窗口只放第一条：connection_reset 从 120 条/秒降为每 10 秒 1 条，即 0.1 条/秒；字节 0.1 × 350 = 35 字节/秒。ERROR 直通不动。

- 治理后条数：500 + 0.1 + 5 = 505.1 条/秒；
- 治理后字节：200,000 + 35 + 6,000 = 206,035 字节/秒；
- 折合每天：206,035 × 86,400 ≈ 1.78×10¹⁰ 字节 ≈ 17.8 GB/天；
- 去重单环节节省：1 − 206,035 ÷ 248,000 ≈ 16.9%。

**第 4 步：分级保留的空间账**（未计压缩与副本，示意）。INFO 每天约 17.28 GB，保留 14 天 ≈ 242 GB；WARN 加 ERROR 治理后约 6,035 字节/秒 ≈ 0.52 GB/天，保留 90 天 ≈ 47 GB；热存储合计 ≈ 289 GB。对照组"全级别统一 90 天"：17.8 × 90 = 1,602 GB——分级保留省下约 82%。

**算术自验与推论**：

- 42,000 ÷ 248,000 ≈ 16.9%，与去重环节省下的 16.9% 几乎相等——WARN 风暴的占比与收益一一对应，说明治理动作精确命中了最贵的流；
- WARN 占总条数 120/625 ≈ 19%，却贡献了近 17% 的字节且全部是同一句话：同指纹高频流永远是去重收益最高的目标；
- 向管理层报预算时用"治理后 17.8 GB/天、热存储约 289 GB"的口径，别报压缩前理论值；真实落地还要乘压缩比与副本数，以自家存储实测为准。

## 12. 排查速查表

| 现象 | 可能原因 | 处置 |
| --- | --- | --- |
| 应用在打日志，Loki 查不到 | 采集器未运行；标签流不匹配；时间范围选错 | 先看采集器发送速率指标，再用标签浏览器列出实际存在的流 |
| 日志量比应用产出明显少 | 采样、去重、限流在丢弃 | 核对 dropped 与 delivered 指标差值，回溯采集器配置 |
| 同一条日志出现两份 | 控制台与 OTLP 双写都进了后端；或文件被重复采集 | 确认 handler 组合与采集位点记录，二选一收敛 |
| 结构化解析整行失败 | 多行堆栈混入或非 JSON 行 | 采集端先合并多行再解析，失败行单独分流统计 |
| 查询超时或极慢 | 时间范围过大且无标签收敛 | 收窄范围、增加标签等值条件；大范围统计改用指标 |
| 日志时间戳偏差数小时 | 时区约定不一致或解析失败回退到接收时间 | 检查时间戳解析与 UTC 约定，抽样比对前后端时钟 |
| 应用机磁盘被日志占满 | 控制台双写且轮转上限缺失 | 配置轮转与大小上限，应用侧降级输出 |
| 搜到了不该出现的敏感字段 | 脱敏只做在应用层 | 采集层加脱敏兜底（见第 7 节第 2 条），并回扫历史样本 |

采集器各 transform 的行为边界在同册 [collectors.md](collectors.md) 有逐个拆解；lab02 的管道配置是最小可跑样例（[labs/lab02-loki-vector-logging/README.md](../../labs/lab02-loki-vector-logging/README.md)），排查时可以拿它当对照组。

## 13. 反模式对照

| 反模式 | 典型症状 | 后果 | 改法 |
| --- | --- | --- | --- |
| 字符串拼接进日志库 | 查询只能靠正则猜 | 字段不可聚合，成本翻倍 | 结构化键值（第 1 节第 1 条） |
| 文本匹配当告警依据 | 措辞一改告警全哑 | 漏报且不可知 | 告警基于指标或日志计数聚合（参见 [alerting.md](../01-metrics/alerting.md)） |
| 每层 catch 都打 ERROR | 一次故障出现成串同类日志 | 错误率虚高、告警风暴 | 只在最外层打一次，内层降级并携带原因 |
| event 里嵌变量 | 事件名基数爆炸 | 无法按事件统计 | event 用枚举值，业务键独立成字段（第 1 节第 3 条） |
| 保留期一刀切 | 存储账单线性膨胀 | 花钱养没人看的 DEBUG | 分级保留（第 4.3 节表） |
| 日志当业务总线 | 下游监听错误日志触发动作 | 排障系统反被业务依赖 | 走消息队列或事件通道（第 7 节第 4 条） |
| 用日志算速率与分位数 | 每次统计都全量扫描 | 查询慢且贵 | 该类问题归指标（第 4.4 节） |
| 大字段整块入日志 | 单条几 MB、频繁被截断 | 现场反而丢失 | 大对象存引用，日志只留摘要与哈希 |

评审现场发现左列任何一项，直接引用对应章节号提意见；新条目出现频率高的，吸收进第 1 节 checklist 或第 6 节的静态检查规则，让规范滚动生长。

## 14. 输出自测题

本篇是清单型内容，读完容易"感觉都会"，用下面五道场景题检验是否真的能落地。每题都要求写出"动作 + 依据的章节"，答得出动作、说不出依据，说明只记住了结论。

**Q1：你的服务每秒产生约 800 条 INFO 且全部进了后端，月度存储账单超标。写出完整的降本动作清单与每一步的验证指标。**
解析：按治理优先级排序。第一步应用层合并高频循环日志（每请求多条合成一条摘要），验证指标是单请求日志条数；第二步采集层按级别分层处理（DEBUG 关闭、INFO 白名单、WARN 与 ERROR 直通），验证 dropped 与 delivered 的差值是否符合设计；第三步指纹去重与限流防风暴，验证同指纹聚合率；第四步分级保留（INFO 缩短、错误流保留更久），验证存储按级别分解的 GB 账；最后才评估更换存储引擎。顺序依据第 4 节：先治理再迁移，每一步都要用 4.5 节的成本观测指标收口，避免治理变成盲调。

**Q2：团队把"日志正文里出现 timeout 字样就告警"写进了值班制度，指出至少三个风险并给出替代方案。**
解析：风险一，文本匹配对措辞过敏——日志措辞微调或日志库升级后告警全体静默失效（第 7 节第 3 条）；风险二，没有分级与聚合，一次网关超时风暴会触发成百条同质通知，淹没有效告警；风险三，正文匹配表达不了"持续多久""比例多少"，误报率不可控。替代方案：用日志聚合出的计数告警（按 event 字段统计超时次数的速率与阈值比较），或者直接为下游依赖埋延迟指标配阈值——告警基于指标，日志只做下钻样本，边界见第 4.4 节。

**Q3：一次事故复盘发现 ERROR 日志丢了九成，列出三个可能环节与各自的取证方法。**
解析：环节一，应用内采样或级别开关——查应用日志库配置的版本与变更记录，确认 sampler 是否覆盖了错误级别；环节二，采集层采样、去重、限流——比对采集器的 dropped 与 delivered 指标差值，检查采样配置是否漏写错误直通条件（第 10 节陷阱一）；环节三，后端保留窗口——确认事故时间段是否落在最短保留期之外，或被分级保留策略错误排除。取证顺序与第 12 节速查表第二行一致：先做管道各环节的计数对账，再回放配置，最后查保留策略。

**Q4：日志行旁的 trace 跳转徽章突然全部消失，但日志本身查询正常。写出排查顺序。**
解析：第一步确认范围——是全部日志失配还是个别服务，缩小到具体日志库版本；第二步用最近的真实日志样本回放 derived field 的正则，确认 JSON 序列化形态是否变化（第 10 节陷阱三的场景）；第三步检查 Grafana 数据源里 derivedFields 配置是否被改坏（做配置 diff）；长期修复走协议字段路线——OTel LogRecord 的 TraceId 加 native OTLP 接入，让跳转不再依赖正文形态（[otel-metrics-and-logs-sdks.md](../00-concepts/otel-metrics-and-logs-sdks.md) 第 9 节）。

**Q5：为什么"半夜被叫醒的人只看这一条日志就能开始排查"是日志设计的第一性检验？结合错误三要素展开。**
解析：这条检验把日志价值翻译成了使用者视角。能开始排查，意味着三要素齐全：事件（发生了什么失败）、上下文（哪个请求、哪个用户、哪个依赖）、动作（系统已做了什么、人要不要处理，第 2 节）。缺事件要靠猜环节，缺上下文要跨服务人肉关联，缺动作只能猜影响面——三者缺一，被叫醒的人第一反应都是再开几个面板，响应时间直接变长。这也是把 runbook 链接写成日志字段的动机：让"下一步做什么"成为数据的一部分，而不是口头传承。

**Q6：成本观测仪表盘已经上线，但三个月没人看，账单还在涨。如何让日志成本治理从"一次性项目"变成"持续习惯"？**
解析：把观测变成议程而不是页面——月度例会固定两个榜单："日志量最大的三个服务"与"最贵的三条查询"（第 6 节第 5 条的日志评审例会正是为此设的）；把指标接到人——每个服务的摄入速率，owner 就是该服务负责人，超过基线自动开工单，而不是等人刷到图表；把节省变成可汇报的数字——每次删 DEBUG、收紧保留期都记录"每天省下多少 GB"，让治理在汇报层面可见、可积累。仪表盘只解决"看得见"，议程与责任人才能解决"有人管"；三件事缺任何一件，治理都会随项目结束而回潮。

六题覆盖治理、告警边界、排障与设计检验四个面向；全部答顺之后，回到第 6 节把答案里出现的动作固化进团队规范，才算真正闭环。
