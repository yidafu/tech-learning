---
sidebar_position: 4
---

# 4. 语义约定（Semantic Conventions）

> 阶段 0 · 概念基础 / 笔记 4
>
> 一句话总结：**语义约定 = 遥测数据的"命名规范字典"**，规定 `service.name`、`http.request.method`、`db.system` 这些名字怎么取、取值长什么样。有了它，不同语言、不同团队、不同后端的遥测数据才能互相看懂。

---

## 目录

1. [为什么需要统一命名](#1-为什么需要统一命名)
2. [概念层级：Resource / Scope / Record / Attribute](#2-概念层级resource--scope--attribute)
3. [Resource 约定：描述"数据来自谁"](#3-resource-约定描述数据来自谁)
4. [常见属性约定速查（带实例）](#4-常见属性约定速查带实例)
5. [Attribute 命名空间与命名规范](#5-attribute-命名空间与命名规范)
6. [版本化与稳定性现状](#6-版本化与稳定性现状)
7. [常见误区](#7-常见误区)
8. [面试常见问题小结](#8-面试常见问题小结)
9. [参考资料](#9-参考资料)

---

## 1. 为什么需要统一命名

设想没有约定的世界：同样是"一次 HTTP 请求的方法名"，不同框架/埋点可能写成：

```text
method          （Go net/http 探针随手写）
http_method     （Python requests 埋点）
httpMethod      （Java 驼峰习惯）
request.method  （Node.js 社区）
http.request.method   （OpenTelemetry 语义约定 ✅）
```

<!-- 保留原图：不同框架的属性命名变体平铺清单，无层级语义，非概念示意图 -->

后果：

1. **仪表盘不可复用**：每个团队写一遍"错误率按路由聚合"的查询，字段名各不相同；
2. **告警规则不可移植**：换一个 SDK/后端，规则全部重写；
3. **关联分析失效**：日志说 `httpMethod=GET`，trace 说 `http.request.method=GET`，同一事实两个名字，无法 join；
4. **机器学习/自动分析无能为力**：工具无法内置"看到 `db.system=mysql` 就知道这是数据库调用"的常识。

语义约定（Semantic Conventions，社区常缩写为 **semconv**）就是 OTel 规范里的一份**属性名字典 + 取值词典**：

- **名字**：属性叫什么（`http.response.status_code`）；
- **类型**：整型/字符串/布尔/枚举；
- **取值**：枚举的合法值（`db.system = postgresql | mysql | mssql | redis | mongodb | ...`）；
- **要求级别**：Required（必须）/ Conditionally Required（条件下必须）/ Recommended（推荐）；
- **稳定性**：Stable（稳定）/ Development（开发中，可能变）。

一句话：**信号模型（trace/span/metric）是"语法"，语义约定是"词汇表"。**

## 2. 概念层级：Resource / Scope / Attribute

理解语义约定前，先看清 OTel 数据模型的层级（三种信号通用）：

```mermaid
flowchart TB
    subgraph RES["Resource（进程级，描述“谁”）"]
        R1["service.name=order-api<br/>service.version=2.3.1<br/>k8s.pod.name=order-7f9c-x2rl<br/>deployment.environment.name=prod<br/>telemetry.sdk.language=python"]
        subgraph SCO["Scope（仪表库级，描述“哪段代码产生的”）"]
            S1["name=io.opentelemetry.instrumentation.flask<br/>version=0.40b0"]
            subgraph REC["Record：Span / LogRecord / Metric"]
                A1["记录级 attributes（描述“这一次发生了什么”）<br/>http.request.method=POST<br/>http.response.status_code=500<br/>url.full=https://shop.example.com/order"]
            end
        end
    end
```

三个层级的语义与约束：

| 层级 | 回答的问题 | 典型内容 | 基数要求 | 生命周期 |
| --- | --- | --- | --- | --- |
| **Resource** | 这批数据**来自哪个实体**？ | 服务名、版本、实例 ID、Pod、区域、运行时 | **必须低基数**（实例级，数量有限） | 进程启动时确定，整个进程共享 |
| **Scope** | 由**哪个仪表库**产生？ | 库名 + 版本（如 flask 插桩、你自写的 tracer） | 极低 | 装配时确定 |
| **Record attributes** | **这一次**事件/请求的细节 | HTTP 方法、SQL、订单号、错误原因 | 可以高基数（如 `order.id`） | 随每条记录产生 |

为什么 Resource 必须低基数？因为 Resource 主要用于后端**索引与路由**（按 service 分流、分表）。把 `user.id` 放进 Resource 等于给存储制造百万级"服务身份"，是可观测性后端的经典性能事故。

## 3. Resource 约定：描述"数据来自谁"

最常用的 Resource 属性（均为小写点分命名）：

| 属性 | 含义 | 示例值 | 说明 |
| --- | --- | --- | --- |
| `service.name` | 逻辑服务名 | `order-api` | **最重要**的一条；无它几乎无法查询。可由 `OTEL_SERVICE_NAME` 环境变量注入 |
| `service.namespace` | 服务分组/命名空间 | `shop.prod` | 多环境多租户时消歧义 |
| `service.version` | 版本 | `2.3.1` | 发布对比、回滚验证的关键维度 |
| `service.instance.id` | 实例唯一 ID | `order-7f9c-x2rl` | 区分同服务不同副本（K8s 中通常取 Pod 名） |
| `deployment.environment.name` | 部署环境 | `prod` / `staging` | **注意**：旧名 `deployment.environment` 已被改名，新代码用带 `.name` 的版本 |
| `telemetry.sdk.name/language/version` | 采集 SDK 自描述 | `opentelemetry` / `python` / `1.29.0` | SDK 自动注入 |
| `process.pid`、`process.command` | 进程信息 | `12345` | 主流语言 SDK 默认注入一批 process.* |
| `container.id`、`k8s.pod.name`、`k8s.namespace.name` | 容器/K8s 坐标 | `…` | 多由 Collector 端 `resourcedetection`/`k8sattributes` 处理器富化补全 |

Python 里构造 Resource 的实际代码（lab00 会用到）：

```python
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "lab00-app",
    "service.version": "0.1.0",
    "deployment.environment.name": "lab",
})
# Resource.create 会自动合并 OTEL_RESOURCE_ATTRIBUTES / OTEL_SERVICE_NAME 环境变量
# 以及 SDK 默认注入的 telemetry.sdk.* 等标准属性
```

也可以在 **Collector 端**统一补 Resource（应用零改动）：

```yaml
# otel-collector-config.yaml 片段：给所有途经数据盖上统一标记
processors:
  resource:
    attributes:
      - key: deployment.environment.name
        value: lab
        action: upsert
```

## 4. 常见属性约定速查（带实例）

以下按技术域列出高频约定（**以官方 registry 为准**，这里给 2026-11 时点的常用快照；标 ⚠ 的属于仍在演进的迁移区，见第 6 节）。

### 4.1 HTTP（span / log / metric 通用）

一次 `POST https://shop.example.com:443/v1/orders` 的 server span 应当带上：

```yaml
# 伪 YAML 展示一个 span 的 attributes（真实数据里是扁平 key-value）
http.request.method: POST                 # 枚举：GET/POST/…；非标准方法用 _OTHER
http.route: /v1/orders                    # 路由模板（非原始路径！避免高基数）
url.scheme: https
server.address: shop.example.com
server.port: 443
url.full: https://shop.example.com/v1/orders
network.protocol.version: 1.1
http.response.status_code: 201
user_agent.original: "Mozilla/5.0 (Macintosh; ...) Chrome/130.0"
```

要点：

- `http.route` 记**路由模板**（`/v1/orders`），不要记原始路径（`/v1/orders/1029384`）——后者高基数，指标里尤其致命；
- 旧属性名 `http.method`、`http.status_code`、`http.url` 属于**上一代约定**，已废弃（见第 6 节迁移说明）；
- 客户端 span 另有 `server.socket.address`（对端真实地址）等。

### 4.2 数据库（db）

一次 PostgreSQL 查询的 span：

```yaml
db.system: postgresql            # 枚举：postgresql|mysql|mssql|oracle|db2|redis|mongodb|elasticsearch|...
db.operation.name: SELECT        # 操作名
db.collection.name: orders       # 表/集合（旧名 db.sql.table 已废弃）
db.query.text: "SELECT id, amount FROM orders WHERE user_id = $1"   # ⚠ 新名；旧名 db.statement
db.response.status_code: 200     # 部分系统有协议级状态
network.peer.address: 10.2.3.4:5432
db.query.parameter: '["u-88123"]'   # 绑定参数（新名，旧名 db.statement.parameter；务必脱敏后上报）
```

要点：

- `db.system` 是**路由与聚合**的关键枚举：后端凭它知道"这是 Redis 还是 PG"；
- SQL 全文放 `db.query.text`（⚠ 由 `db.statement` 迁移而来），**务必脱敏参数**（Collector 端有 `redaction`/`attributes` 处理器可用）；
- `db.namespace` 表示连接的 database/schema 名。

### 4.3 RPC / 消息 / 异常 / 生成式 AI

```yaml
# gRPC 调用
rpc.system: grpc
rpc.method: ReserveStock
rpc.service: inventory.v1.InventoryService
rpc.grpc.status_code: 14          # UNAVAILABLE

# Kafka 消息（producer span）
messaging.system: kafka
messaging.destination.name: order.created
messaging.operation.type: publish
messaging.message.id: "…"

# 异常事件（span event / log 的标准载荷）
exception.type: "exceptions.InsufficientStockError"
exception.message: "sku=SKU-42 stock=0"
exception.stacktrace: |
  Traceback (most recent call last):
    File "app.py", line 88, in checkout
      reserve(pid)
  exceptions.InsufficientStockError: sku=SKU-42 stock=0

# 生成式 AI（2024 起的新约定域，仍在演进）
gen_ai.system: openai
gen_ai.request.model: gpt-4o
gen_ai.usage.input_tokens: 812
```

### 4.4 通用横切属性

| 属性 | 用途 |
| --- | --- |
| `error.type` | 错误类型归类（异常类名或状态码），指标侧推荐使用 |
| `thread.name` / `thread.id` | 记录产生事件的线程 |
| `http.request.body.size` / `http.response.body.size` | 请求体大小（用于容量分析） |

## 5. Attribute 命名空间与命名规范

### 5.1 命名语法（官方规范）

属性名** SHOULD **满足：

1. 仅由**小写字母、数字、`.`、`_`、`-`** 构成（禁止大写、空格、`/`）；
2. 采用**点分层级**的命名空间：`<域>.<对象>.<属性>`，如 `http.request.method`；
3. 常见后缀语义：`*.id`（标识符）、`*.name`（人可读名）、`*.type`、`*.url`、`*.duration`；
4. 单位含义进名字：`duration` 默认可能带单位后缀（如 `http.request.duration`，配合明确的 unit 字段），不要起 `time` 这种含糊名。

### 5.2 命名空间治理：谁能发明名字？

| 命名空间 | 归属 | 例子 |
| --- | --- | --- |
| `http.*`、`db.*`、`messaging.*`、`rpc.*`、`url.*`、`server.*`、`network.*`、`process.*`、`container.*`、`k8s.*`、`gen_ai.*` | **官方注册表**，社区评审后进入 | `db.system` |
| `otel.*` | OTel 自身保留 | `otel.scope.name` |
| `mycompany.*`（如 `shop.*`、`acme.*`） | 组织命名空间，**应向官方 registry 登记**，避免冲突 | `shop.order.channel` |
| `own.*` | **实验性自定义**专用前缀，官方承诺永不占用 | `own.debug_flag` |

实践建议：**先查注册表，再自造名字**。90% 的业务属性都能映射到既有约定（如"调用方 IP"→ `client.address`），自定义名只用于真正的业务概念（`shop.order.channel`）。

### 5.3 同名不同值的坑：Resource vs Record

`service.name` 只能出现在 Resource；`db.system` 只该出现在 span attributes。**不要把 Resource 属性重复塞进每条记录**（浪费体积），也不要把每请求变化的值放进 Resource（基数灾难）。判断口诀：

> **进程内不变的 → Resource；每次请求变的 → Record attributes。**

## 6. 版本化与稳定性现状

语义约定按**域（domain）**独立演进、独立宣布稳定，整体状态（截至 2026-11，以官方 registry 为准）：

| 域 | 状态 | 说明 |
| --- | --- | --- |
| Resource（`service.*` 等） | **Stable** | 已广泛实现 |
| HTTP | **Stable**（v1.23 起，2023-07 宣布） | 稳定版采用 `http.request.method` 等新名 |
| Exceptions（`exception.*`） | **Stable** | 2023 年初稳定 |
| Logs（日志正文/级别约定） | **Stable** | 2024 年稳定；与 `LogRecord` 模型配套 |
| DB / Messaging / RPC | 部分 Stable、部分迁移中 ⚠ | 如 `db.statement` → `db.query.text`、`deployment.environment` → `deployment.environment.name` 属于"稳定过程中的改名" |
| `gen_ai.*`、profiling 相关 | Development | 快速演进，勿硬编码依赖 |

### 6.1 兼容机制：Schema URL 与"双发"

1. **Schema URL**：每条导出的数据可携带 `schema_url`（如 `https://opentelemetry.io/schemas/1.26.0`），声明"我按哪一版约定命名"。Collector/后端可据此做**schema 转换**（旧名 → 新名），官方发布机器可读的 schema 文件；
2. **双发（dual emission）**：在 HTTP 约定从旧名（`http.method`）切到新名（`http.request.method`）的过渡期，多数语言 SDK 提供开关同时上报新旧两组属性，例如环境变量：

```bash
# Java / Python 等支持：同时输出稳定版与旧版 HTTP 属性，便于后端渐进迁移
OTEL_SEMCONV_STABILITY_OPT_IN=http
OTEL_SEMCONV_STABILITY_OPT_IN=http/dup
```

### 6.2 给使用者的三条行动建议

1. **新代码一律写新名**（`http.request.method`、`deployment.environment.name`、`db.query.text`），旧名只出现在兼容代码里；
2. **别在业务逻辑里硬编码 semconv 字符串拼查询**——把属性名收敛到常量模块，升级时只改一处；
3. 升级 SDK/插桩库前读一眼 release note 的 semconv 变更段，仪表盘查询同步改。

## 7. 常见误区

### 误区 1："属性名随便起，反正是自己查"

自造名（`reqMethod`）导致：自动插桩的属性与你的属性对不上、社区仪表盘/告警库不可复用、多团队数据无法聚合。**先查 registry，再造词。**

### 误区 2："把原始 URL 路径放进 `http.target`/指标维度"

`/orders/1029384` 每单一个值，指标序列爆炸；trace 里也污染聚合。路由模板（`http.route`）进维度，原始路径只留 span/log。

### 误区 3："Resource 里塞了 user.id 方便过滤"

Resource 是实例级索引信息，塞请求级高基数属性会拖垮后端路由。请求级细节放 span/log attributes。

### 误区 4："语义约定已经全部稳定，随便依赖"

只有部分域 Stable；`gen_ai.*` 等仍在 Development，升级可能改名。生产硬依赖前看该域状态标记。

### 误区 5："用了 OTel SDK 就自动符合语义约定"

SDK 保证**骨架字段**（trace/span 结构、Resource 基础属性）符合；**业务属性**靠你自己遵循命名与脱敏约定；Collector 端还可能需要 processors（`redaction`、`transform`）兜底清洗。

### 误区 6："驼峰/下划线无所谓"

规范要求小写点分。`httpRequestMethod`、`http_request_method` 都会被视为不合规范的私有命名，丧失互操作价值（工具会按 `http.*` 域识别）。

## 8. 面试常见问题小结

**Q1：什么是语义约定？为什么需要？**

> 答：OTel 规范中的属性命名与取值字典（如 `service.name`、`http.request.method`、`db.system` 及其枚举值）。需要它是因为：多语言/多团队/多后端的遥测数据只有统一词汇才能聚合查询、复用仪表盘与告警，并让工具内置"常识"（识别 DB 调用、HTTP 请求）。

**Q2：Resource 属性和 Span 属性有什么区别？**

> 答：Resource 描述数据来源实体（service/pod/version），进程级、低基数、用于索引路由；span attributes 描述单次事件细节，可高基数。判断口诀：进程内不变放 Resource，每请求变化放 Record。

**Q3：`service.name` 从哪里来？**

> 答：最佳来源是部署环境注入的 `OTEL_SERVICE_NAME` 环境变量（SDK 自动读取），其次代码构造 Resource 显式指定，也可由 Collector 的 resource processor 统一补盖。

**Q4：HTTP 语义约定的旧名和新名分别是什么？迁移期怎么处理？**

> 答：旧名 `http.method/http.status_code/http.url` → 新名 `http.request.method/http.response.status_code/url.full`（v1.23 起稳定）。迁移期多数 SDK 提供 `OTEL_SEMCONV_STABILITY_OPT_IN` 开关做双发；数据侧可依 Schema URL 做转换。

**Q5：属性命名有哪些规则？**

> 答：小写字母/数字/`.`/`_`/`-`，点分层级命名空间；先使用官方注册表命名空间（`http.`、`db.` 等），组织名应登记（`mycompany.*`），临时自定义用 `own.*`；避免高基数值进入 Resource 和指标维度。

## 9. 参考资料

1. OpenTelemetry 语义约定总入口（含 registry）：
   <https://opentelemetry.io/docs/specs/semconv/> （访问日期：2026-11-04）
2. General Attributes（命名规范、命名空间治理）：
   <https://opentelemetry.io/docs/specs/semconv/general/attributes/> （访问日期：2026-11-04）
3. Resource 语义约定：
   <https://opentelemetry.io/docs/specs/semconv/resource/> （访问日期：2026-11-04）
4. HTTP 语义约定（Stable 版）：
   <https://opentelemetry.io/docs/specs/semconv/http/http-spans/> （访问日期：2026-11-04）
5. Database 语义约定（含 `db.query.text` 迁移说明）：
   <https://opentelemetry.io/docs/specs/semconv/database/database-spans/> （访问日期：2026-11-04）
6. HTTP 语义约定稳定公告（2023）：
   <https://opentelemetry.io/blog/2023/http-semconv-stability/> （访问日期：2026-11-04）
7. Schema 与版本转换（OTLP `schema_url`、schema 文件）：
   <https://opentelemetry.io/docs/specs/otel/schemas/overview/> （访问日期：2026-11-04）

---

> 上一篇：[opentelemetry-overview.md](./opentelemetry-overview.md)
> 下一篇：[otel-quickstart-concepts.md](./otel-quickstart-concepts.md) —— 核心对象速查：Provider / Tracer / Meter / Logger 一图流。

## 附：ASCII 图替换清单

| 原 ASCII 图位置（章节标题） | 原图内容简述 | 替换结果 |
| --- | --- | --- |
| 2. 概念层级：Resource / Scope / Attribute | Resource ⊃ Scope ⊃ Record 三层嵌套包含关系及各层示例属性 | flowchart TB（嵌套 subgraph） |

### 保留说明

| 位置 | 内容 | 原因 |
| --- | --- | --- |
| 1. 为什么需要统一命名 | 各框架对“HTTP 方法名”的命名变体清单（method/http_method/httpMethod/…） | 平铺字段清单，无真实层级语义，非概念示意图 |

---

## 10. 工程三陷阱

第 7 节讲的是认知误区，本节换成工程视角：三个在真实项目里反复造成损失的陷阱，按触发场景、根因、规避三段拆解。语义约定的陷阱有个共同特点：违规当时没有任何报错，代价延迟几个月才以"存储成本"或"查不到数据"的形式出现，复盘时很难追溯到当初的命名决定。

### 10.1 陷阱一：高基数属性进了指标维度

**触发场景**：业务团队想按用户分析接口耗时，把用户标识当普通属性塞进了直方图的标签集合。上线头一天一切正常，一周后 Prometheus 内存占用与查询延迟持续上涨，序列数以每日数十万的规模增长，最终触发存储告警。

**根因**：指标的每个标签值组合都是一条独立时间序列。请求级标识的组合空间是无限或准无限的，进维度等于宣告序列数不可控；更糟的是这些序列每个抓取周期只产生一个数据点，存储与查询效率都极差，属于典型的"高成本低价值"数据。

**规避**：请求级标识只进 span 与日志属性，聚合分析用低基数维度替代，例如路由模板、租户类型、地域；指标维度实行白名单制，新增维度必须过评审并预估基数上界；线上部署序列增长速率告警兜底，让失控在小时级被发现而不是月级。基数治理的完整方法见 [cardinality](../05-production/cardinality.md)。识别这类陷阱还有一个朴素信号：当有人以"方便过滤"为由往指标上加标签时，先追问一句这个标签有多少个可能的取值，答不上来就先回去数清楚。

### 10.2 陷阱二：新旧属性名混用导致仪表盘查空

**触发场景**：SDK 版本升级滚动推进到一半，一半实例按旧约定上报 `http.method`，另一半按新约定上报 `http.request.method`。按新名写的仪表盘只显示一半流量，错误率曲线莫名掉半截，值班以为新版把错误"修没了"。

**根因**：属性名是聚合键，两个名字就是两条不同的序列族，任何按名过滤的查询都只能命中其一。"数据变好了"的假象比"数据缺失"更危险，因为它会直接污染发布判断。

**规避**：升级前先查清所用 SDK 版本的语义约定行为，统一选择双发开关或统一等待全员到位后再改仪表盘；查询层的属性名收敛到常量模块，杜绝散落的字符串字面量（第 6.2 节行动建议第二条）；迁移期间用一条对比查询同时统计新旧名的样本量，把"迁移进度"本身变成可观测的数字。

### 10.3 陷阱三：Resource 与记录属性放反

**触发场景**：两个方向都会踩。其一，把每请求变化的值写进 Resource，比如有人图方便把最近一次请求的用户标识放进了进程级属性，等于给索引层制造海量"服务身份"；其二，把进程级常量复制进每条记录，每个 span 都重复写一遍服务名与版本，传输体积白白膨胀百分之几十。

**根因**：两层属性的用途不同——Resource 是后端索引与路由的主键，必须低基数且进程内稳定；记录属性描述单次事件，允许高基数。放反之后，要么索引失控，要么体积失控，而且因为两边"都能查到"，问题长期不被察觉。

**规避**：用第 5.3 节的口诀做放置判断：进程内不变的进 Resource，每请求变化的进记录属性；拿不准时问一句"换个请求这个值会变吗"。代码评审时对 Resource 构造处的任何新增键做基数审查，一行注释说明"这个值为什么进程内不变"。

三个陷阱串起来看，语义约定工程的本质是"约束放在哪里执行"的选择：陷阱一靠放置规则约束写入端，陷阱二靠版本策略约束升级流程，陷阱三靠评审纪律约束日常增量。这三条约束都必须落进自动化或流程才可靠——放置规则固化进埋点封装函数，版本策略写进发布检查单，命名判定进评审模板——指望每个工程师背下全部约定，等于指望没有人犯错。事后复盘也按这三条约束回溯，多数命名事故都能找到对应的流程缺口，补上缺口比批评当事人有用得多。

## 11. 手算走查配方：属性命名合规性逐步判定

判定一个属性名是否合规，按下面六步走查，每步只回答一个是非题，全部通过才算合格：

1. 字符合法性：是否仅含小写字母、数字、点、下划线、连字符？出现大写、空格、斜杠即直接出局；
2. 前缀归属：前缀是否落在官方命名空间（http、db、url、server、network、messaging、rpc、k8s 等）？
3. 若属官方命名空间：完整键名能否在官方注册表查到？查得到就按官方定义使用，包括它的类型与枚举值，不要自造同义键；
4. 查不到且确属组织业务概念：改用组织前缀（如 shop、acme 开头），并考虑向注册表登记；
5. 临时调试用途：用 own 前缀，官方承诺永不占用该空间；
6. 值校验：枚举型属性的值是否采用官方枚举拼写，值域是否在约定范围内。

然后拿六个真实感很强的例子逐个判定：

**例一：httpRequestMethod。** 第一步即出局：含大写驼峰。合规写法是 `http.request.method`，且值要落在官方方法枚举内，非标准方法按约定记为 _OTHER。

**例二：db.system，值写成 pg。** 键名合规且是官方键；卡在第六步——官方枚举拼写是 postgresql。查询里写 `db.system="pg"` 会静默查空，这类值域错误在多语言团队极其常见，因为不同语言的社区文档各有各的习惯缩写。

**例三：url.full 的值里含用户令牌。** 名与值格式都合规，但把查询串里的访问令牌原样上报违反了脱敏纪律。命名之外还有一条平行规则：敏感信息必须先脱敏再进属性，Collector 端可用正则处理兜底清洗。

**例四：shop.order.channel。** 第一步通过；第二、三步不属官方命名空间；第四步判定为真实业务概念（订单渠道），使用组织前缀，合规。这是自定义命名的标准路径。

**例五：own.debug_heap_dump。** 实验性开关，走 own 前缀，合规；但应登记在团队的清理清单里，实验结束及时下线，避免实验属性常年滞留生产数据。类似的还有调试期的采样开关、临时灰度标记，一律先走 own 空间，确认要长期保留时再评估迁移到组织命名空间。

**例六：http.route 记成了原始路径。** 键名合规、值违规：路由属性必须记模板，记原始路径等于把高基数从 span 带进指标聚合，是第 7 节误区二的直接翻版。

官方注册表入口与命名规范原文见 `https://opentelemetry.io/docs/specs/semconv/general/attributes/` 的命名与命名空间小节。判定练习做熟之后，评审属性相关代码的时间能缩短一半以上，因为多数问题集中在同样的几种违规形态上。最后给一张判定速记卡：形式看第一步，归属看前缀，官方键查注册表，业务词加组织头，调试词挂 own 头，枚举值按官方拼写——六句对应六步，贴在团队评审文档里即可当 checklist 用。

## 12. 决策速查表

**表一：一个值应该放在哪一层**

| 值的特征 | 放置层 | 例子 |
| --- | --- | --- |
| 进程生命周期内不变、实例级 | Resource | `service.version`、`k8s.pod.name` |
| 每请求变化、用于定位与下钻 | 记录属性（span 或日志） | `http.route`、`db.query.text` |
| 低基数、用于指标聚合 | 指标标签 | `http.route`、`error.type` |
| 个体定位键、不参与序列切分 | exemplar 标签 | `trace_id` |

**表二：命名空间选择**

| 你要表达的东西 | 用什么前缀 |
| --- | --- |
| 技术域通用概念 | 官方命名空间（http、db、messaging 等） |
| 组织业务概念 | 组织前缀并考虑登记 |
| 临时实验与调试 | own 前缀 |
| OTel 自身内部机制 | otel 前缀（保留，业务代码别碰） |

**表三：新旧名迁移期怎么写**

| 情形 | 建议 |
| --- | --- |
| 全新服务 | 一律新名，不留旧名兼容代码 |
| 升级中的存量集群 | 开双发开关，仪表盘按新名渐进改写 |
| 查询层 | 属性名收敛为常量模块，升级只改一处 |
| 跨团队复用仪表盘 | 明确声明依赖的约定版本或 schema 地址 |

**表四：值要不要脱敏后再上报**

| 属性 | 处理 |
| --- | --- |
| `db.query.text` | 参数化或脱敏，避免明文业务数据 |
| `url.full` | 剥离查询串中的令牌与个人标识 |
| `user_agent.original` | 原样保留即可，本身不含敏感主体 |
| 异常消息 | 截断堆栈中的路径与内网地址 |

放置层的判断若仍拿不准，回到第 2 节的三层模型图看一眼数据流向；命名与取值的最终裁判永远是官方注册表，而不是某篇博客或某个 SDK 的既有行为。四张表覆盖了日常百分之九十的决策场景，剩下的一成多是真正的新问题，走评审并沉淀成第五张表的候选条目，团队的决策资产就是这样一题一题积累起来的。

## 13. 输出自测题

读完本篇后合上笔记作答，再对照解析。这五道题分别覆盖属性放置、维度取舍、新旧迁移、命名判定与兼容机制，全部答对说明本篇的核心动作已经内化：

**题一**：一次 PostgreSQL 查询的 span，至少应带哪三个官方属性？各自回答什么问题？

**解析**：`db.system` 标识数据库种类，是路由与聚合的关键枚举；`db.operation.name` 或 `db.query.text` 描述这次做了什么操作；`db.namespace` 或 `db.collection.name` 定位到库或集合。三者齐备之后，后端才能把这条 span 归入"某类数据库的某类操作"统一统计，缺任何一个都会让对应的聚合视角失效。

**题二**：为什么 `http.route` 可以进指标维度，`url.full` 不可以？

**解析**：维度决定序列基数。路由模板是有限集合，基数受接口数量约束；完整地址含原始路径与查询串，每个不同参数的请求都可能产生新值，进维度即序列爆炸。完整地址只留在 span 或日志属性里供下钻，指标侧用路由模板承载聚合视角。

**题三**：`deployment.environment` 与 `deployment.environment.name` 什么关系？新代码用哪个？

**解析**：后者是改名后的稳定写法，前者属于上一代拼写。迁移期靠双发开关与 schema 转换过渡；新代码一律用带 name 后缀的版本，查询层用常量收敛避免散落字符串。判断"哪个是新名"不要靠记忆，查注册表该属性的稳定状态标记即可。

**题四**：有团队提议在 Resource 里加发布渠道属性用于灰度过滤，判定其合理性。

**解析**：方向合理：发布渠道是实例级、进程内不变的属性，基数极低（稳定与灰度两三个值），符合"进程内不变进 Resource"的口诀，而且是发布对比、灰度排障的高价值维度。但注意它不是官方键，按第 11 节配方第四步应落在组织前缀之下，并顺手登记；反例是同场景下把灰度批次号这类高基数值塞进 Resource，那就从合理变成了灾难。

**题五**：双发开关解决什么问题？它有什么代价？

**解析**：解决新旧属性名并存的过渡问题：SDK 同时输出两套名字，旧仪表盘不断线、新仪表盘先建好。代价是每条记录体积变大、下游存储双份，指标侧还可能短暂翻倍序列数，因此只能作为过渡手段，全员切换完成后尽快关闭，并把关闭动作写进迁移计划的验收项。
