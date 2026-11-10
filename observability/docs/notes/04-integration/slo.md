---
sidebar_position: 3
---

# SLO 与错误预算：把"系统好不好"变成可计算的工程问题

> 阶段 4 · 笔记 3。监控回答"现在发生了什么"，SLO 回答"这对用户造成了多大伤害、
> 我们还能承受多少"。本篇讲透 SLI 的选取与 PromQL 落地、SLO 制定方法论、
> 错误预算与燃烧率（burn rate）计算、Google SRE 的多窗口多燃烧率告警，
> 以及错误预算政策与反模式。所有示例与
> [lab04 的 slo-burn-rate.yml](../../labs/lab04-three-pillars/prometheus/rules/slo-burn-rate.yml)
> 口径一致，可直接动手验证。

## 目录

1. [从"监控一切"到"承诺某事"：为什么需要 SLO](#1-从监控一切到承诺某事为什么需要-slo)
2. [SLI / SLO / SLA：一张表分清](#2-sli--slo--sla一张表分清)
3. [SLI：定义与常见选取（含 PromQL 实例）](#3-sli定义与常见选取含-promql-实例)
4. [SLO 制定方法论：用户视角、时间窗、目标值](#4-slo-制定方法论用户视角时间窗目标值)
5. [错误预算：概念与计算](#5-错误预算概念与计算)
6. [燃烧率（burn rate）与多窗口多燃烧率告警](#6-燃烧率burn-rate与多窗口多燃烧率告警)
7. [完整 recording rules YAML（与 lab04 一致）](#7-完整-recording-rules-yaml与-lab04-一致)
8. [错误预算政策（Error Budget Policy）](#8-错误预算政策error-budget-policy)
9. [反模式清单](#9-反模式清单)
10. [常见坑与排查](#10-常见坑与排查)
11. [面试题小结](#11-面试题小结)
12. [参考资料](#12-参考资料)

---

## 1. 从"监控一切"到"承诺某事"：为什么需要 SLO

没有 SLO 的监控体系长这样：面板几百张、告警上千条、每个人都被抄送，
凌晨三点的电话一半是"CPU 80% 了但用户毫无感觉"。问题的根源是
**监控在描述系统内部状态，而用户只关心结果**：

- 用户不关心某台实例 CPU 多高，只关心"下单能不能成功"；
- 用户不关心 p99 这个数字，只关心"点了按钮多久有反馈"；
- 运维不应该是"消灭一切红色"，而是"在用户可感知的伤害超过承诺之前动手"。

SLO（Service Level Objective）把这件事变成一道算术题：

```text
承诺：28 天内，99.9% 的订单请求成功且耗时 < 1s
推论：28 天内允许 0.1% 的"坏请求" —— 这就是错误预算
约束：预算烧完了，就停止发版、全力还债；预算富余，才允许冒险
```

三个直接收益：

1. **告警有了统一度量衡**：不再对每个指标拍阈值，而是对"预算消耗速度"告警
   （见 §6，这正是 lab04 的做法）；
2. **可靠性与迭代速度有了谈判筹码**：产品要快、SRE 要稳，错误预算是双方都
   认账的"货币"——预算内随便发，预算外冻结变更；
3. **排障有了优先级**：影响 SLO 的事故先处理，不影响 SLO 的告警降级为工单。

---

## 2. SLI / SLO / SLA：一张表分清

| 概念 | 全称 | 是什么 | 谁关心 | 违约后果 | 例子 |
| --- | --- | --- | --- | --- | --- |
| **SLI** | Service Level Indicator | 一个可测量的"好事件比例"指标（分子/分母） | 工程师 | 无（它只是测量） | 非 5xx 响应占比 99.95% |
| **SLO** | Service Level Objective | 对 SLI 在某时间窗内的目标值（内部承诺） | 工程 + 产品 | 冻结发版、还技术债 | 28 天内 SLI ≥ 99.9% |
| **SLA** | Service Level Agreement | 与客户签订的合同条款（含赔偿） | 法务 / 客户 / 销售 | 赔钱、条款处罚 | 月度可用性 < 99.9% 赔服务费 x% |

三条经验法则：

1. **SLA 的目标值应比 SLO 更宽松**：SLO 是"内部及格线"，SLA 是"对外违约线"。
   内部跑在 99.95%，合同承诺 99.9%，留出缓冲，绝不把两个数字设成一样；
2. **没有 SLI 的 SLO 是空头支票**：先想清楚分子分母怎么从现网数据里算出来；
3. **SLO 是对"用户可感知健康度"的代理指标**，每季度复盘一次"SLI 还能代表
   用户体验吗"（用户路径变了，SLI 要跟着变）。

补充一个常一起出现的词：**SLT（Service Level Target）**，指短期内盯的运行目标
（如"本周错误预算剩余 ≥ 50%"），通常不对外。

---

## 3. SLI：定义与常见选取（含 PromQL 实例）

### 3.1 通用形式：好事件 / 总事件

几乎所有 SLI 都能写成"好事件数 ÷ 总事件数"（或对时间型：可用分钟数 ÷ 总分钟数）。
设计一个 SLI 只需要回答三个问题：

1. **分母是什么**（一次请求？一次会话？一分钟？）
2. **什么算"好"**（2xx？<1s？数据正确？）
3. **在哪测**（服务端日志 / 网关 / 拨测 / 客户端 SDK——测量点不同，数字可差一个量级）

> 测量点选择原则：**越靠近用户越真实，越靠近服务端越便宜**。生产惯例是
> 网关/边缘层测可用性（接近用户视角），服务端指标测延迟（维度全），
> 客户端 RUM 做校准。

### 3.2 三类经典 SLI 与 PromQL

以下 PromQL 与 lab04 的指标口径一致（应用经 OTel Collector 暴露：
`app_http_requests_total{service_name,method,route,status}` 计数器与
`app_http_request_duration_seconds_*` 直方图，`le="1"` 桶恰对齐 1s 目标）。

**① 可用性（Availability）——最常用，"请求成功了吗"**

```promql
# SLI：非 5xx 响应占比（窗口 5m）
1 - (
  sum(rate(app_http_requests_total{service_name="demo-app", status=~"5.."}[5m]))
  /
  clamp_min(sum(rate(app_http_requests_total{service_name="demo-app"}[5m])), 1e-9)
)
```

- 坏事件定义成 `5xx` 还是"非 2xx"是团队决策：404 可能是用户输错 URL（不算服务失败），
  也可能是路由 bug（算）。**默认建议 5xx + 明确的业务错误码**；
- `clamp_min(..., 1e-9)` 防零流量时除零产生 NaN/Inf——低流量服务必须处理。

**② 延迟（Latency）——"快不快"**

```promql
# SLI：耗时 < 1s 的请求占比（好事件 = 落在 le="1" 桶内）
sum(rate(app_http_request_duration_seconds_bucket{service_name="demo-app", le="1"}[5m]))
/
clamp_min(sum(rate(app_http_request_duration_seconds_count{service_name="demo-app"}[5m])), 1e-9)

# 等价的"坏事件比例"写法（lab04 recording rule 采用这种，见 §7）
1 - (
  sum(rate(app_http_request_duration_seconds_bucket{service_name="demo-app", le="1"}[5m]))
  /
  clamp_min(sum(rate(app_http_request_duration_seconds_count{service_name="demo-app"}[5m])), 1e-9)
)
```

- 为什么用"<=1s 占比"而不是 p99？分位数无法跨窗口聚合（5m p99 与 1h p99 不能
  加权合并），而桶比例可以任意窗口直接算——SLO 场景直方图是唯一正解；
- 前提：直方图桶边界必须包含目标值（lab04 的桶 `[..., 0.8, 1.0, 2.0, ...]`
  恰好有 1.0，`le="1"` 精确可用）。桶没对齐目标值是常见翻车点（见 §10）。

**③ 正确性（Correctness）——"对不对"**

```promql
# SLI：订单落库成功占比（业务级好事件：payment_status="ok"）
sum(rate(business_orders_total{service_name="demo-app", result="ok"}[5m]))
/
clamp_min(sum(rate(business_orders_total{service_name="demo-app"}[5m])), 1e-9)

# SLI：异步对账差异率（数据质量型：消息积压/丢失）
sum(rate(mq_messages_consumed_total{topic="orders"}[5m]))
/
clamp_min(sum(rate(mq_messages_produced_total{topic="orders"}[5m])), 1e-9)
```

- 正确性 SLI 通常要**业务埋点**（HTTP 状态码看不出"扣款成功但订单没建"）；
- 对账型 SLI 分子分母来自不同系统，要容忍少量窗口内乱序（用更长窗口或滞后对齐）。

**④ 新鲜度（Freshness）——数据/内容型服务的特例**

```promql
# SLI：数据龄 <= 60s 的 key 占比（缓存/推荐/行情类服务）
max_over_time(data_last_refresh_timestamp_seconds[5m]) > time() - 60
```

### 3.3 SLI 选取速查表

| 用户问的问题 | SLI 类型 | 好事件定义 | 测量点建议 |
| --- | --- | --- | --- |
| "我点得动吗" | 可用性 | 非 5xx（+业务错误码） | 网关 / 服务端 |
| "是不是很快" | 延迟 | 耗时 ≤ 目标（按端点分级） | 服务端直方图 |
| "结果对不对" | 正确性 | 业务结果 = ok / 对账一致 | 业务埋点 / 异步对账 |
| "数据是最新的吗" | 新鲜度 | 数据龄 ≤ 阈值 | 存储侧打点 |
| "整个链路通吗" | 拨测可用性 | 合成请求成功 | 全球拨测点 |

选型原则：**一个用户旅程 1~2 个 SLI 起步，宁缺毋滥**。覆盖"登录、下单、支付"
三个核心旅程的 3 个 SLI，好过 30 个没人看的指标。

---

## 4. SLO 制定方法论：用户视角、时间窗、目标值

### 4.1 第一步：从用户旅程出发，而不是从现有指标出发

错误示范："我们有 `http_requests_total`，那就做个 99.9% 吧。"
正确示范："用户的核心旅程是下单。他关心两件事：成功、1 秒内响应。
于是定义可用性 SLI（非 5xx 占比）与延迟 SLI（≤1s 占比）。"

一张 SLO 登记表（建议放 wiki，每条 SLO 一行）：

| 字段 | 示例值 |
| --- | --- |
| 旅程 / 服务 | demo-app · 下单 |
| SLI | 非 5xx 响应占比 / ≤1s 请求占比 |
| 时间窗 | 28 天滚动 |
| 目标 | 99.9% / 99% |
| 错误预算 | 0.1% / 1% |
| 评审周期 | 每月一次（预算会议） |
| owner | trade-platform 团队 |

### 4.2 第二步：选时间窗

| 窗口 | 优点 | 缺点 | 适用 |
| --- | --- | --- | --- |
| 28 天滚动（4 周） | Google 推荐；平滑周内周期；足够长能容纳发版节奏 | 早期数据不足；滚动窗口计算稍复杂 | 大多数在线服务的默认选择 |
| 30 天日历月 | 与商业报表/SLA 对账方便；实现简单（每 25 日重置） | 月末预算"重置"会诱发冲刺心理 | 对外 SLA 对账场景 |
| 90 天 | 稳定，适合慢变更系统 | 对事故反应迟钝 | 基础设施类（DNS、存储） |

注意：**Prometheus 原生对 28 天滚动窗口的"预算剩余"计算比较吃力**
（`rate()[28d]` 对 counter 重置敏感且数据量大），生产上常用
 Sloth / Pyrra / slo-compute 等 SLO 生成器，或用"窗口烧掉多少预算"的
 burn-rate 视角替代绝对剩余量（lab04 即采用 burn-rate 视角，见 §6）。

### 4.3 第三步：定目标值（不是越高清越好）

目标值选择的三条约束：

1. **过去 N 周的实际表现**：目标应高于当前均值、低于历史最好值。
   现状 99.5%，定 99.95% 意味着立刻进入长期违约；定 99.6% 则"跳一跳够得着"；
2. **用户真实承受力**：搜索框 99% 可能够了（用户会重试），支付 99.95% 起步
   （失败直接丢钱）。按旅程分级，而不是一刀切；
3. **成本曲线**：99.9% → 99.95% → 99.99%，每上一个 9，架构成本大约翻倍
   （跨可用区、多活、更快的回滚）。先问"多一个 9 值多少钱"。

经验对照表（行业粗略水位，仅做起点参考，务必用自身数据校准）：

| 服务类型 | 可用性常见目标 | 备注 |
| --- | --- | --- |
| 内部工具 / 后台 | 99% | 挂了发工单即可 |
| 一般在线服务 | 99.5% ~ 99.9% | 多数业务落这里 |
| 交易 / 支付 | 99.95% ~ 99.99% | 配合多活 |
| 基础设施（DNS/网关） | 99.99%+ | 影响面是所有上层服务 |

一个重要推论：**99.9% 可用性 = 28 天内允许约 40.3 分钟全损**（40320min × 0.001）。
把 9 换算成分钟，跟管理层沟通比说"四个九"有效得多。

### 4.4 组合 SLO：多 SLI 怎么合成一个结论

一个旅程定义了可用性 + 延迟两个 SLI 时，错误预算怎么算？两种流派：

- **独立预算**（lab04 / Google 默认）：每个 SLI 一份预算，分别告警、分别冻结。
  简单、可解释，推荐起步；
- **合并预算**：总预算 = 1 − (可用性 SLI × 延迟 SLI)，即"又快又成功"才算好。
  更贴近单次用户体验，但归因麻烦（不知道烧的是哪份）。

---

## 5. 错误预算：概念与计算

### 5.1 定义

```text
错误预算 = 1 − SLO 目标
        = 允许的坏事件比例 × 窗口内总事件量（换算成"坏事件个数"更直观）
```

以 lab04 可用性 SLO（99.9%，28 天）为例：

| 量 | 计算 | 结果 |
| --- | --- | --- |
| 预算比例 | 1 − 0.999 | 0.1%（0.001） |
| 窗口总请求（按 100 QPS 恒定估算） | 100 × 86400 × 28 | 2.4192 亿 |
| 预算个数 | 2.4192 亿 × 0.001 | ≈ 24.19 万个坏请求 |
| 全损时长等价 | 40320min × 0.001 | ≈ 40.3 分钟 |

### 5.2 预算消耗与燃烧率

**燃烧率（burn rate）= 实际错误率 ÷ 允许错误率（预算比例）**

- burn rate = 1：恰好按预算速度消耗，28 天刚好用完；
- burn rate = 10：预算 2.8 天烧完；
- burn rate = 14.4：以 14.4 倍速燃烧，1 小时烧掉 2% 预算（推导见下）。

推导"burn 14.4 ⇔ 1h 烧约 2% 预算"：

```text
Google SRE Workbook 档位表的推导基准是 30d = 720h 窗口。设预算比例 b（如 0.1%），错误率恒为 e：
  预算消耗比例/小时 = (e × 1h) / (b × 720h) = burn / 720
反解：想让 1h 恰好烧掉 2% 预算 → burn = 720 × 2% = 14.4（精确值，并非取整）
档位表其余数字同理精确反解：
  6h 烧 5%  → burn = 720 × 5% / 6  = 6
  1d 烧 10% → burn = 720 × 10% / 24 = 3
  3d 烧 10% → burn = 720 × 10% / 72 = 1
注：lab04 的 SLO 窗口是 28d（672h），严格反解应得 13.44/5.6/2.8/0.93，
但业界约定俗成沿用这套 30 天推导出的档位值（偏差 <8%，被档位本身的粗糙度覆盖）。
```

Google SRE Workbook 的经典档位表（lab04 完整实现）：

| 档位 | 预算消耗 | 长窗口 | 短窗口 | burn rate 阈值 | 页呼语义 | lab04 对应告警 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2% / 1h | 1h | 5m | 14.4 | 立即打电话 | `SLOAvailabilityBurnRateFast` |
| 2 | 5% / 6h | 6h | 30m | 6 | 工作时间页呼 | `SLOAvailabilityBurnRateSlow` |
| 3 | 10% / 1d | 1d | 2h | 3 | 建工单 | `SLOAvailabilityBurnRateTicket1d` |
| 4 | 10% / 3d | 3d | 6h | 1 | 建工单/周会看一眼 | `SLOAvailabilityBurnRateTicket3d` |

为什么阈值是 14.4 / 6 / 3 / 1 这组数：它们使得**每个档位在对应长窗口内消耗的
预算比例**（2%、5%、10%、10%）都是"值得被人看见"的量，同时短窗口保证
"现在仍在烧"而非历史残留。数字不是圣旨，是可以按 oncall 承受力调的参数。

### 5.3 剩余预算可视化

burn rate 告警之外，仪表盘上常放两个派生指标：

```promql
# 预算消耗比例（28d 窗口累计烧掉多少预算；>=1 表示预算耗尽）
# 思路就是 burn rate：窗口内实际错误率 ÷ 预算比例 0.001
sum(rate(app_http_requests_total{service_name="demo-app", status=~"5.."}[28d]))
  / clamp_min(sum(rate(app_http_requests_total{service_name="demo-app"}[28d])), 1e-9)
  / 0.001

# 预算可维持时间（按当前 6h 燃烧速度外推，剩余预算还能烧多久）
# 生产建议直接用 Pyrra/Sloth 生成，手写 PromQL 只做示意
```

---

## 6. 燃烧率（burn rate）与多窗口多燃烧率告警

### 6.1 为什么"错误率 > 0.1% 就告警"是错的

对 99.9% 的 SLO，如果设"错误率 > 0.1% 持续 1 分钟就页呼"：

- 低流量服务：1 个错误就超 0.1%，天天误呼；
- 高流量服务：0.1% 意味着每分钟几百个坏请求持续发生——这时才呼已经太晚；
- 单窗口无法区分"瞬时抖动"与"持续性故障"。

正确姿势是问两个问题：**烧得多快（burn rate）？烧了多久（长窗口）？现在还在烧吗（短窗口）？**

### 6.2 多窗口（multi-window）：短窗口保灵敏，长窗口保置信

单看 1h 窗口：故障开始后最多要等 1h 错误率才稳定超阈值——太迟钝。
单看 5m 窗口：任何一次抖动都触发——太敏感。
**双窗口与（AND）** 同时满足才告警：

```promql
# lab04 档位 1（真实文件节选）
(
  slo:demo_app_availability:error_ratio_rate1h > (14.4 * 0.001)
  and
  slo:demo_app_availability:error_ratio_rate5m > (14.4 * 0.001)
)
```

- 长窗口（1h）：错误率在整段窗口平均后仍超 14.4 倍 → 置信"这是一次大故障"；
- 短窗口（5m）：最近 5 分钟仍超 → 置信"现在还在烧，页呼有意义"；
- 短/长窗口比例经验值 **1/12**（5m/1h、30m/6h、2h/1d、6h/3d 都是 1:12）。

### 6.3 多燃烧率（multi-burn-rate）：不同速度，不同响应

小故障慢烧（burn 3）不需要凌晨页呼，大故障快烧（burn 14.4）不能等工单。
四档位 × 双窗口 = 8 个条件，覆盖"快/中/慢/长尾"四种消耗模式（完整表见 §5.2）。
响应动作分层：

| burn 速度 | 人 | 动作 | 通知渠道 |
| --- | --- | --- | --- |
| 14.4（1h 烧 2%） | 值班 oncall | 立即介入，跑排障 SOP | 电话 / 页呼 |
| 6（6h 烧 5%） | oncall | 工作时间处理 | IM 强提醒 |
| 3（1d 烧 10%） | 团队 | 建工单排期 | 工单系统 |
| 1（3d 烧 10%） | 团队 | 周会看预算曲线 | 周报 |

### 6.4 延迟 SLO 的 burn-rate 写法

延迟的"坏事件比例"（>1s 占比）与可用性同构，只是预算换成 1%（99% 目标）：

```promql
# lab04：SLOLatencyBurnRateFast（节选）
(
  slo:demo_app_latency:bad_ratio_rate1h > (14.4 * 0.01)
  and
  slo:demo_app_latency:bad_ratio_rate5m > (14.4 * 0.01)
)
```

注意 `14.4 * 0.01` 中 0.01 是延迟预算——**两个 SLO 的阈值基数不同**，复制粘贴
规则时最容易漏改的就是这个数字（见 §10 常见坑）。

### 6.5 动手验证（lab04 环境）

```bash
# 1. 注入 60% 错误率
curl -X POST "http://localhost:8000/chaos?rate=0.6"

# 2. 观察 5m 窗口错误比例 recording rule（≈0.6，即 burn ≈ 600）
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=slo:demo_app_availability:error_ratio_rate5m' | python3 -m json.tool

# 3. 等 3~5 分钟（满足 for: 2m），看告警状态
curl -s http://localhost:9090/api/v1/rules | python3 -m json.tool | grep -E 'alertname|state'

# 4. 恢复
curl -X POST "http://localhost:8000/chaos?rate=0.02"
```

为什么是 3~5 分钟而不是立刻：5m 窗口的 rate() 需要积累样本（2 个以上抓取点），
`for: 2m` 要求条件持续为真——**短窗口长度 + for 时长共同决定了告警延迟下限**。

---

## 7. 完整 recording rules YAML（与 lab04 一致）

把 §6 的表达式直接写进告警规则的问题是：每个窗口的表达式又长又重复，
而且每次评估都要现算 `rate()[3d]`——昂贵且难维护。**先录制（recording）、
再告警（alert on recorded series）** 是标准工程化姿势。

以下为 lab04 的完整骨架（完整文件见
[labs/lab04-three-pillars/prometheus/rules/slo-burn-rate.yml](../../labs/lab04-three-pillars/prometheus/rules/slo-burn-rate.yml)，
口径完全一致，此处做注释化讲解）：

```yaml
groups:
  # ---------- 第一组：SLI 录制规则（每 30s 预计算各窗口错误比例） ----------
  - name: slo-demo-app-recording
    interval: 30s
    rules:
      # 可用性：7 个窗口一次配齐（5m/30m/1h/2h/6h/1d/3d）
      # 命名规范：slo:<服务>_<sli>:<分子描述>_<窗口>
      - record: slo:demo_app_availability:error_ratio_rate5m
        expr: |
          sum(rate(app_http_requests_total{service_name="demo-app", status=~"5.."}[5m]))
          /
          clamp_min(sum(rate(app_http_requests_total{service_name="demo-app"}[5m])), 1e-9)
      # ...（30m/1h/2h/6h/1d/3d 同构，仅窗口不同）

      # 延迟：坏事件 = 耗时 > 1s（1 - le="1" 桶占比）
      - record: slo:demo_app_latency:bad_ratio_rate5m
        expr: |
          1 - (
            sum(rate(app_http_request_duration_seconds_bucket{service_name="demo-app", le="1"}[5m]))
            /
            clamp_min(sum(rate(app_http_request_duration_seconds_count{service_name="demo-app"}[5m])), 1e-9)
          )
      # ...（30m/1h/6h 同构）

  # ---------- 第二组：燃烧率告警（读录制序列，表达式极简） ----------
  - name: slo-demo-app-burn-rate-alerts
    interval: 30s
    rules:
      # 档位 1：burn > 14.4，双窗口 1h + 5m 同时满足
      - alert: SLOAvailabilityBurnRateFast
        expr: |
          (
            slo:demo_app_availability:error_ratio_rate1h > (14.4 * 0.001)
            and
            slo:demo_app_availability:error_ratio_rate5m > (14.4 * 0.001)
          )
        for: 2m                      # 再加一道持续性保险（抑制秒级抖动）
        labels:
          severity: critical         # 参与 Alertmanager 路由（见 alertmanager-in-depth.md）
          service: demo-app
          slo: availability
        annotations:
          summary: "可用性 SLO 预算高速燃烧（burn rate > 14.4，约每小时烧掉 2% 的 28d 预算）"
          description: >-
            近 1h 错误比例 {{ $value | humanizePercentage }}，SLO 目标 99.9%。
            下钻：http://localhost:3000/d/lab04-three-pillars
      # 档位 2/3/4（SLOW/Ticket1d/Ticket3d）与延迟双档同理，见源文件
```

工程要点：

1. **录制规则命名要可预测**：`slo:<service>_<sli>:<what>_rate<window>`，
   告警规则只引用录制名，改 SLI 定义时只动录制组；
2. **告警 `for` 与档位反相关**：快档 `for: 2m`（要快），慢档 `for: 1h/3h`
   （防骚扰）。lab04 四档分别是 2m / 15m / 1h / 3h；
3. **`annotations.description` 里的 `{{ $value | humanizePercentage }}`**：注意
   `$value` 是 and 表达式的结果（取第一个向量的值，即 1h 窗口错误比例），
   展示时写清楚"近 1h"避免误读；
4. **每个 SLO 一份规则文件**，服务多了以后用 Sloth（YAML 生成器）或 Pyrra
   （带 UI 与预算计算）管理，别手抄几百行。

---

## 8. 错误预算政策（Error Budget Policy）

错误预算只有配上一份**各方签字的政策**才有牙齿。政策回答"预算烧完了怎么办"。
Google SRE Workbook 给出的框架（简化版）：

```text
《demo-app 错误预算政策》

1. 预算来源：28 天滚动窗口的可用性 SLO（99.9%）与延迟 SLO（99%）。
2. 例外原则：若某次发布导致 SLO 违约（预算耗尽），后续发布冻结，
   直到 burn rate 降到 1 以下并保持 24h。
3. 冻结范围：仅影响该 SLO 的服务（demo-app），不牵连无关服务。
4. 例外审批：真有紧急安全修复需要发布？SRE owner + 产品 owner 双签可放行，
   并记录到事后复盘。
5. 预算富余时：允许提高发布频率、承接风险更高的重构（这就是预算的"福利面"）。
6. 每月预算例会：过一遍各 SLO 消耗、超支原因、下月计划。
```

要点拆解：

| 政策要素 | 为什么 |
| --- | --- |
| 触发条件量化（burn > 1 持续 24h 解冻） | 避免"感觉好了就解冻"的扯皮 |
| 冻结范围最小化 | 不能一个服务超支全公司停发 |
| 双签例外通道 | 政策要为安全修复留活口，否则会被绕过 |
| 富余时明确"可以冒险" | 预算不是只罚不赏，否则没人愿意定 SLO |
| 定期复盘会议 | 政策本身也要迭代（目标值、档位、冻结规则） |

**失败预告**：如果组织没有产品/管理层背书，错误预算政策会退化成
"又一份没人看的 wiki"。推行建议：从一个服务、一个 SLO、一次真实的"预算耗尽
→ 冻结发版"案例开始，让团队先尝到"数字替人吵架"的甜头。

---

## 9. 反模式清单

| # | 反模式 | 为什么错 | 正确做法 |
| --- | --- | --- | --- |
| 1 | **100% 目标** | 预算 = 0：任何一次发版抖动都违约，最终只能把 SLO 做成摆设；也不给维护窗口留空间 | 目标留出预算；计划内维护走预算扣除或静默窗口 |
| 2 | **内部指标当 SLI**（CPU、队列长度、GC 次数） | 用户感知不到 CPU 90%；这类指标是**原因维度**，适合排障不适合承诺 | SLI 用用户可见结果（成功、延迟、正确性）；内部指标做"病因告警"或 dashboard 维度 |
| 3 | **SLO = SLA 照抄合同** | 对外违约线当内部及格线，没有缓冲，赔款风险高 | SLO 严于 SLA（如 SLA 99.9%，SLO 99.95%） |
| 4 | **指标太多，每个都是 SLO** | 30 个 SLO = 没有 SLO：预算稀释、告警爆炸、无人认领 | 每旅程 1~2 个核心 SLI；其余降级为普通监控 |
| 5 | **平均值当 SLI**（平均延迟 < 300ms） | 平均值掩盖长尾，1% 用户 30 秒超时它毫无反应 | 用比例型 SLI（≤1s 占比）或分位数监控（只做面板） |
| 6 | **时间窗太短**（1 天 99.9%） | 低流量服务一天预算只有几十个请求，天天违约 | 窗口 ≥ 28 天（或按流量量级评估） |
| 7 | **只定目标不做告警** | 违约一个月后才知道 | 目标定完立刻配 burn-rate 告警（§6） |
| 8 | **把计划内变更也算坏事件** | 发版重启必然抖动，预算被日常操作吃光 | 维护窗口从预算中排除（或用拨测在窗口期静默） |
| 9 | **SLO 定完不复盘** | 用户旅程变了、流量形态变了，SLI 失真 | 每月预算例会年审 SLI 代表性 |
| 10 | **拿 SLO 考核个人绩效** | 会诱导"调高预算、压低分母、少接流量"等数字游戏 | SLO 度量系统与流程，不直接挂钩个人 KPI |

---

## 10. 常见坑与排查

| # | 症状 | 根因 | 解法 |
| --- | --- | --- | --- |
| 1 | 延迟 burn-rate 告警永远不触发 | 直方图桶边界没有目标值（如桶是 `[0.5, 1.5]`，查 `le="1"` 拿到的是空/插值语义错误） | 桶边界必须包含 1.0（lab04 的 `LATENCY_BUCKETS` 特意对齐）；先在 Prometheus 手查 `le="1"` 有数据 |
| 2 | 复制可用性规则做延迟 SLO，阈值忘改 | `14.4 * 0.001` 没换成 `14.4 * 0.01`，延迟预算被收紧 10 倍 | 预算基数显式写在表达式里并注释；用 Sloth 生成避免手抄 |
| 3 | 低流量服务告警抽风 | 5m 窗口只有个位数请求，1 个错误 = 20% 错误率 → burn 200 | 短窗口加 `for`；或按流量分层：低流量服务用长窗口（30m/6h）起步档 |
| 4 | `rate()` 在 counter 重置后产生尖刺 | 重启/容器重建导致计数器归零 | `rate()` 自带重置处理，但**实例标签变化**（pod 重建换名字）会让分子分母口径漂移；SLI 聚合时固定 `service_name` 维度 |
| 5 | 告警恢复了又立刻再触发（flapping） | 错误率在阈值附近抖动；`for` 太短 | 快档保留 `for: 2m`；必要时对 recording rule 用 `avg_over_time` 平滑 |
| 6 | 手写"28d 预算剩余"查不出来 | Prometheus 对超长窗口 rate 的保留期/性能限制 | retention ≥ 窗口 + 缓冲；或改用 Pyrra/Sloth 的实现；或用 burn-rate 视角替代绝对剩余 |
| 7 | 除零 NaN 导致告警静默失效 | 零流量时段分母为 0 | `clamp_min(denominator, 1e-9)`（lab04 全部规则都做了） |
| 8 | burn 14.4 告警触发但值班不知道该干什么 | annotations 里没有下钻链接与 SOP | description 写 dashboard 链接 + runbook_url（见 [unified-dashboard.md](unified-dashboard.md)） |
| 9 | 404 计入可用性 SLI，预算被爬虫烧光 | 坏事件定义过宽 | SLI 分母排除已知健康检查/爬虫 UA；或好事件定义为 `status !~ "5.."` 且业务错误码白名单 |
| 10 | 多团队对同一 SLO 各算一套数 | 测量点不同（网关 vs 服务端） | SLO 登记表写死测量点与 PromQL；录制规则唯一化 |

**5 分钟自检（lab04 环境）**：

```bash
# 各窗口错误比例一次性看全（应随 /chaos 注入同步变化）
for w in 5m 30m 1h; do
  curl -s 'http://localhost:9090/api/v1/query' \
    --data-urlencode "query=slo:demo_app_availability:error_ratio_rate$w" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["data"]["result"][0]["value"])'
done

# 告警规则加载是否成功
curl -s http://localhost:9090/api/v1/rules | python3 -m json.tool | grep -c alertname
```

---

## 11. 面试题小结

**Q1：SLI、SLO、SLA 的区别？**
A：SLI 是测量指标（好事件/总事件的比例）；SLO 是对 SLI 在时间窗内的内部目标值；
SLA 是对外的合同承诺（含违约赔偿）。数值关系通常是 SLA 宽于 SLO（留缓冲），
SLO 又高于当前实际平均水平（跳一跳够得着）。

**Q2：什么是错误预算？它怎么驱动工程决策？**
A：错误预算 = 1 − SLO 目标，即窗口内允许的坏事件配额。它把"可靠性"变成可
消耗、可核算的资源：预算内可以激进发版，预算耗尽触发冻结（错误预算政策）、
全力偿还技术债。它也是 SRE 与产品谈判的共同货币。

**Q3：什么是 burn rate？为什么用多窗口多燃烧率告警而不是直接对错误率设阈值？**
A：burn rate = 实际错误率 ÷ 允许错误率，表示预算消耗速度倍数。单阈值告警无法
同时满足灵敏度与置信度：短窗口灵敏但误报多，长窗口可信但迟钝。多窗口（如
1h AND 5m 同时超 14.4 倍）用长窗口保证"烧得足够多"、短窗口保证"现在还在烧"；
多燃烧率（14.4/6/3/1 四档）按消耗速度分流响应方式——快档页呼、慢档工单，
既不漏报也不骚扰。

**Q4：为什么延迟 SLO 用"≤1s 请求占比"而不是 p99 < 1s？**
A：① 分位数不可跨窗口/跨实例聚合（p99 的平均不是 p99），而直方图桶比例可以
在任意窗口直接计算与合并；② 分位数只描述分布的一个点，比例型 SLI 直接给出
"坏事件率"，可与错误预算、burn rate 无缝衔接；③ p99 面板适合人看，不适合做
告警语义。前提是直方图桶边界包含目标值。

**Q5：一个 99.9% 可用性的服务，28 天的错误预算折合成"全损时间"是多少？**
A：28d = 40320min，预算 0.1% → 约 40.3 分钟完全不可用（或等价的局部坏事件
累积）。这个换算用于沟通：每多一个 9，预算减为十分之一。

**Q6：有人提出把 SLO 定成 100%，你怎么回应？**
A：100% 意味着零预算：任何变更抖动、任何单次错误都构成违约，唯一"达标"
方式是不再变更或把 SLI 测量得失真。合理做法是按用户承受力定 99.x%，把计划内
维护放进维护窗口/预算扣除机制，并为 100% 需求的场景（极少数，如安全控制面）
用架构冗余逼近而非用 SLO 承诺。

**Q7：错误预算告警触发后，你的处理顺序是什么？**
A：① 确认告警（哪个 SLO、哪个档位、燃烧多快）；② 打开统一 dashboard 收敛
范围（时间/服务/路由，见 [unified-dashboard.md](unified-dashboard.md) 的 SOP）；
③ 若是主动变更引起 → 直接回滚（预算燃烧的头号原因）；④ 修复并观察 burn rate
回落至 1 以下；⑤ 复盘：这次烧了多少预算、政策是否需要升级（如触发发版冻结）。

---

## 12. 参考资料

- Google SRE Workbook · Alerting on SLOs（多窗口多燃烧率原始论述）：
  <https://sre.google/workbook/alerting-on-slos/>（访问日期：2026-11-04）
- Google SRE Workbook · Alerting on SLOs 中文要点与实现（Sloth 文档）：
  <https://sloth.dev/slo-alerting/multi-window-multi-burn-rate-alerts/>（访问日期：2026-11-04）
- Google SRE Book · Service Level Objectives（错误预算政策）：
  <https://sre.google/sre-book/service-level-objectives/>（访问日期：2026-11-04）
- Google SRE Workbook · Error Budgets 政策示例：
  <https://sre.google/workbook/error-budget-policy/>（访问日期：2026-11-04）
- Prometheus recording rules 官方文档：
  <https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/>（访问日期：2026-11-04）
- Prometheus alerting rules 官方文档：
  <https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/>（访问日期：2026-11-04）
- Pyrra（SLO 生成与看板工具）：<https://github.com/pyrra-dev/pyrra>（访问日期：2026-11-04）
- Sloth（SLO 生成器）：<https://sloth.dev/>（访问日期：2026-11-04）
- 本工作区相关笔记：[Alertmanager 深入](alertmanager-in-depth.md)、[统一仪表盘与排障 SOP](unified-dashboard.md)、[告警体系（阶段 1）](../01-metrics/alerting.md)、
  配套规则文件：[lab04 slo-burn-rate.yml](../../labs/lab04-three-pillars/prometheus/rules/slo-burn-rate.yml)
