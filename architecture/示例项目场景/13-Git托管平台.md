# Git 托管平台（GitHub / GitLab / Gitea）：代码怎么存、协作怎么管

> 返回：[示例项目场景](01-导览.md) · [软件架构学习大纲](../软件架构学习大纲.md)
> 定位：研发团队的“代码资产与协作中枢”——仓库存储、PR/MR 评审、CI/CD、Webhook 事件外发。三家代表同一业务的三种架构形态：GitHub（SaaS 巨型服务）、GitLab（自托管全家桶）、Gitea（轻量单体二进制），是“架构形态跟着规模走”的最佳对照组。它宕机，全公司研发停摆——一-3 可用性最硬核的活教材。主要对应大纲：一-2 设计模式（状态机/观察者/策略/责任链）、一-3 质量属性、二-1/2/3 模块化单体与微服务形态对照、二-3 事件驱动（消费语义）、三-2 最终一致、三-3 分片、三-5 限流与队列、五-3 安全架构（Webhook 签名）。

## 业务画像

Git 托管平台管理的是研发组织的“生产资料”：源码、提交历史、评审记录、流水线与制品、Issue 讨论，全部沉淀在这里。业务看似只有“存代码”一件小事，拆开看是四个域：**存**（Git 对象库与复制）、**管**（权限、分支保护）、**协作**（Issue/PR/MR 评审流）、**联动**（CI 触发与 Webhook 外发）——每个域都是一类典型架构问题的化身。

**三家对照（本场景独有的教学价值）**：

| 平台 | 形态 | 技术画像 |
|---|---|---|
| GitHub | SaaS 多租户巨型服务 | 从 Rails 单体起步，随规模把存储、认证、搜索等逐步拆为独立服务；仓库按分片集群多副本存储 |
| GitLab | 自托管“全家桶”单体 | Rails 单体应用 + Gitaly（存储服务化，gRPC）+ Sidekiq（后台任务队列）+ Workhorse（HTTP 前置代理）+ PostgreSQL/Redis |
| Gitea | 轻量自托管单体 | Go 单二进制 + SQLite/PostgreSQL，内置 SSH 服务，一个进程跑完全部功能 |

同一个业务域，三种规模的三个答案：Gitea 是模块化单体的教科书（二-1），GitLab 是“单体 + 存储服务化 + 任务队列”的渐进拆分样本（二-2 绞杀者思想的温和版），GitHub 是演进到大规模服务化的远端形态。讲“什么时候该拆”时，三家就是现成的对照实验。

**用户角色**：开发者（clone/push/发 PR）、评审者（code review）、机器人消费者（CI/CD、部署系统，经 API 与 Webhook 驱动，是流量占比最高的“用户”）、平台管理员（权限、配额、存储运维）、合规审计（企业版需求）。

**教学量级假设**：组织 1000 个、仓库 5 万个、日 push 10 万次、日流水线 5 万条、日 Webhook 投递 100 万次；单仓库中位数 50MB、最大 10GB；push 响应 P99 < 5s；API 限流数千次/小时量级。

**核心业务流**：

1. 写：clone（协议协商）→ 分支开发 → commit → push（上传对象 + 钩子检查 + 引用原子更新）；
2. 协作：发 PR/MR → 评审（approve / changes requested）→ CI 检查全绿 → 合并（merge/squash/rebase）→ 删分支；
3. 集成：push/PR 事件触发流水线 → Runner 领任务执行 → 状态回报挂到 PR 上作为合并门禁；
4. 外发：平台事件按订阅生成 Webhook 投递 → 第三方系统（IM 机器人、缺陷单、部署系统）消费；
5. 治理：权限与分支保护规则变更、仓库归档/转移、存储扩容与灾备演练。

**外部交互系统**：企业 SSO/LDAP（认证源）、对象存储（LFS 大文件与制品）、第三方集成（Webhook 消费者）、容器镜像仓库（CI 产物）。

## 模块总览

| 模块 | 一句话职责 | 关键数据 |
|---|---|---|
| 仓库存储引擎 | Git 对象读写、引用管理、分片与复制 | blob/tree/commit、ref |
| 接入与协议层 | SSH / HTTP(S) 智能协议接入、认证卸载 | 凭证、协议会话 |
| 权限与分支保护 | 谁能读谁谁能推、什么分支过什么门禁 | 协作权限、保护规则 |
| 协作流（Issue/PR） | 评审与讨论的状态机 | PR、评审、评论 |
| CI/CD 编排 | 流水线解析、任务队列、Runner 调度 | 流水线、任务、制品 |
| Webhook 事件外发 | 平台事件可靠投递给第三方 | 投递任务、签名密钥 |
| API 层 | REST/GraphQL 出口、令牌与配额 | 访问令牌、限流配额 |

## 核心模块

### 仓库存储引擎（本场景的灵魂模块）

**职责**：Git 四类对象（blob 文件内容、tree 目录快照、commit 提交、tag 注解标签）的内容寻址存储，引用（分支/标签）的原子更新，仓库的分片存放与多副本复制。

**关键实体与数据**：Git 对象按内容哈希寻址——对象标识 = 哈希（类型 + 长度 + 内容），同名必同内容；引用 `refs/heads/main` → commit id，是全库唯一的“可变指针”；仓库元数据 `repositories`（`repo_id`、`storage_node`（所在存储分片）、`default_branch`、`size_bytes`）。

**典型流程**（一次 push 的内幕）：客户端本地算出新增对象 → 打包上传（receive-pack）→ 服务端解包写入对象库 → pre-receive 钩子做权限与规则检查 → 引用更新（compare-and-swap：预期旧 commit id 对上才提交）→ post-receive 触发下游（PR 刷新、CI 触发、Webhook 入队）→ 响应客户端。

Kotlin 骨架（内容寻址 + 引用 CAS）：

```kotlin
import java.security.MessageDigest

// Git 对象模型骨架：内容寻址——哈希即身份，同名必同内容、写入后不可变，只有引用是可变状态
class GitObj(val type: String, private val body: ByteArray) {
    val oid: String = run {
        val md = MessageDigest.getInstance("SHA-1")
        md.update("$type ${body.size}".toByteArray())   // 对象头：类型 + 长度
        md.update(byteArrayOf(0))
        md.update(body)
        md.digest().joinToString("") { "%02x".format(it) }
    }
}

class ObjectStore {
    private val map = HashMap<String, GitObj>()
    fun put(obj: GitObj): String { map.putIfAbsent(obj.oid, obj); return obj.oid }  // 同哈希=同内容，天然去重
    val count: Int get() = map.size
}

fun main() {
    val store = ObjectStore()
    val oidA = store.put(GitObj("blob", "fun hello() {}\n".toByteArray()))
    val oidB = store.put(GitObj("blob", "fun hello() {}\n".toByteArray()))  // 内容相同 → oid 相同
    println("两次写入相同内容：oid 相等=${oidA == oidB}，对象库实际存储=${store.count} 份")

    val tree = GitObj("tree", "main.kt -> $oidA".toByteArray())
    val c1 = GitObj("commit", "tree=${tree.oid} parent=none  msg=init".toByteArray())
    val c2 = GitObj("commit", "tree=${tree.oid} parent=${c1.oid} msg=fix typo".toByteArray())
    listOf(tree, c1, c2).forEach(store::put)
    println("追加 tree + 两个 commit（内容各不相同）后对象库 = ${store.count} 份")

    var refMain = c1.oid
    if (refMain == c1.oid) refMain = c2.oid   // push 的本质：引用以旧值比对（CAS）方式前移
    println("main 引用 CAS 前移 → ${refMain.take(8)}…（对象本身从未被修改）")
}
```

**设计要点与典型陷阱**：

- **内容寻址是存储设计的降维打击**：相同内容全平台只存一份（去重不需要发明任何机制）；对象一旦写入永不修改（缓存、复制、完整性校验全都因此变简单）；把“不变的大头”（对象）和“可变的针尖”（引用）分开——不可变数据设计的一号范本。
- **反例——“把 Git 仓库当普通文件存”**：早期自建服务把所有裸仓库放一块 NFS 共享盘：仓库一多 IO 互相争抢，全量备份时所有人都 push 不动；仓库数据在文件系统、权限与 PR 在数据库，两个世界靠约定同步，删库后两边对不上。**修正**：仓库按分片集群存放（repo → `storage_node`），分片内多副本；对象库与元数据以 `repo_id` 关联，删除走两阶段（先标记、确认无引用后物理清理）。
- **为什么按“仓库”分片、而不是按“对象”分片**：一个 push 的事务边界是仓库——引用更新要求本次 push 的对象全部就位；对象图彼此引用把仓库内对象绑成一个整体，按对象打散会让每次 push 跨多个节点。分片键选“聚合根”的原则在这里再次出现（与 Feed 流按用户分片同构，三-3 分库分表）。
- 复制走最终一致：引用更新以主副本为准，向从副本异步复制；读从副本可能落后几秒，对 Git 场景完全可接受——非交易场景选最终一致的典型案例（三-2）。
- 大文件治理：视频、模型、设计稿塞进 Git 对象库会把仓库拖到 GB 级——LFS 的解法是“指针进仓库、内容外置对象存储”，浅克隆/部分克隆则救 CI（只拉最近 N 层）。教学点：不是所有数据都该进同一个存储引擎，先分型再选型。

### 协作流：PR/MR 评审状态机

**职责**：以 PR（GitHub/Gitea）/MR（GitLab）为中心的评审与合并生命周期管理。

**关键实体与数据**：`pull_requests`（`pr_id`、`source_branch`、`target_branch`、`state`（draft/open/merged/closed）、`merge_base`）；评审 `reviews`（`reviewer_id`、`state`（approved/changes_requested/commented）、`commit_sha`（评审针对哪个提交））；状态检查 `check_runs`（`pipeline_id`、`conclusion`——CI 结果挂回 PR 作门禁）。

**典型流程**：开 PR（draft → open）→ 评审人提交意见（changes requested → 作者修改 → 重新 approve）→ 保护规则校验（必需评审数 + 必需检查项全绿）→ 合并（merge commit 保留拓扑 / squash 压成一个 / rebase 拉直）→ state=merged，触发下游（部署、通知、自动关单）。

**设计要点与典型陷阱**：

- **PR 状态是状态机，不是一堆布尔标记**——反例：用 `is_open`、`is_approved`、`is_merged` 三个布尔字段表达状态，“approved 之后又 push 了新提交还算不算 approved”全靠读代码猜，组合出一堆非法状态。**修正**：显式状态机 + 迁移表，并加一条显式规则：新 push 使已有评审失效（stale）——评审记录里的 `commit_sha` 就是失效判定的依据（一-2 状态模式的完整舞台；与工单中心流转状态机同构，可对照）。
- 分支保护规则是“机制与策略分离”的好例子：机制固定（合并前必须满足的条件检查引擎），策略可配（几个评审、哪些检查必需、是否禁止 force push）——用策略引擎实现，而不是在合并代码里硬编码 if。
- 三种合并策略没有对错，只有团队约定：squash 让主线历史线性干净但丢细粒度回滚点——历史形状是产品决策，写入 ADR（四-2）。
- 并发合并同一目标分支：第二个 PR 合并时 merge_base 已前移，需重新校验冲突——对目标分支头做乐观并发控制（compare-and-swap），失败即“请更新后重试”（三-2 乐观并发的非数据库版本）。

### CI/CD 编排与 Runner 调度

**职责**：解析流水线定义（GitHub Actions workflow / .gitlab-ci.yml）、编排阶段与任务、把任务派发给 Runner、回收状态与制品。

**关键实体与数据**：`pipelines`（`pipeline_id`、`trigger`（push/schedule/api/manual）、`commit_sha`、`status`）；`jobs`（`stage`、`runner_tag`、`status`（pending/running/success/failure）、`attempts`）；`runner_pools`（`runner_id`、`tags`、`concurrency_limit`）。

**典型流程**：push → 触发判定（哪些流水线该跑）→ 任务入队 → 空闲 Runner 主动领取（拉模式）→ 执行步骤 → 回报状态挂到 PR → 上传制品与缓存。

**设计要点与典型陷阱**：

- **触发去抖（幂等的第一课）**：连推 3 个 commit，正确行为通常不是跑 3 条流水线——按分支收敛只跑最新 commit 的那条（旧的取消或标记跳过）。反例：不去抖，连环 push 把 CI 队列打满，真正要验证的那个 commit 反而在排队——研发工具链里的背压问题（三-5）。
- **Runner 拉模式而非推模式**：平台不需要维护到每台 Runner 的长连接，Runner 自己来领任务——内网、NAT 后的自建 Runner 天然可达，平台侧也天然解耦（与消息队列消费者拉取同构，二-3）。
- 队列公平性：多团队共享 Runner 池时，大团队的 500 job 流水线不能饿死小团队的 2 job——按组织/仓库配额 + 多级队列（三-5 限流的队列版）。
- 制品与缓存的生命周期：产物保留期、缓存键按依赖指纹失效——存储成本与构建速度的权衡，不设保留期的制品库迟早撑爆。

### Webhook 事件外发

**职责**：把平台事件（push、PR、Issue）按订阅可靠投递给第三方系统。

**关键实体与数据**：`webhook_endpoints`（`scope`（仓库/组织）、`url`、`secret`（签名密钥）、`events[]`、`active`）；投递记录 `deliveries`（`delivery_id`（幂等键）、`event`、`request_body`、`attempt`、`status`、`next_retry_at`）。

**典型流程**：平台事件 → 匹配订阅（范围 + 事件类型过滤）→ 生成投递任务（带 `delivery_id`，附 HMAC 签名头）→ 投递 → 失败按指数退避重试 → 重试窗口耗尽转死信并告警。

Kotlin 骨架（签名 + 幂等 + 指数退避）：

```kotlin
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

// Webhook 投递骨架：HMAC 签名 + delivery_id 幂等 + 指数退避——至少一次投递，消费方必须幂等
class MiniWebhookDispatcher(private val secret: String) {
    data class Delivery(val id: String, val event: String, val body: String,
                        val attempt: Int = 0, val nextRetryAt: Long = 0L)

    private val seen = HashSet<String>()            // 平台侧幂等：同一 delivery_id 只入队一次
    private val queue = ArrayDeque<Delivery>()

    fun sign(body: String, ts: Long): String = Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(secret.toByteArray(), "HmacSHA256"))
        update("$ts.".toByteArray()); update(body.toByteArray())
        "sha256=" + doFinal().joinToString("") { "%02x".format(it) }
    }

    fun enqueue(d: Delivery): Boolean =
        if (!seen.add(d.id)) false else { queue += d; true }   // 重放/重复事件：同 id 直接丢弃

    fun pump(now: Long, transport: (Delivery) -> Boolean) {    // transport 返回 false = 消费方报 5xx
        val retries = ArrayDeque<Delivery>()                   // 重试任务迭代后批量重新入队
        val iter = queue.iterator()
        while (iter.hasNext()) {
            val d = iter.next()
            if (d.nextRetryAt > now) continue                  // 指数退避：还没到下一次投递时间
            iter.remove()
            if (transport(d)) {
                println("投递成功：${d.id} ${d.event}（第 ${d.attempt + 1} 次尝试）")
            } else if (d.attempt + 1 >= 4) {
                println("重试耗尽：${d.id} 转入死信并告警")
            } else {
                val backoff = 1000L shl d.attempt              // 1s → 2s → 4s
                println("投递失败：${d.id} 于 ${backoff}ms 后重试")
                retries += d.copy(attempt = d.attempt + 1, nextRetryAt = now + backoff)
            }
        }
        queue += retries
    }
}

fun main() {
    val dispatcher = MiniWebhookDispatcher("hook-secret-2026")
    val body = """{"ref":"refs/heads/main","after":"3f2a…"}"""
    println("投递签名 X-Hub-Signature-256: ${dispatcher.sign(body, 1_700_000_000L)}")

    var remainingFailures = 2                                   // 模拟消费方故障：前两次返回 500
    var received = 0                                            // 消费方实际收到的请求数
    val transport: (MiniWebhookDispatcher.Delivery) -> Boolean = { _ ->
        received++
        val ok = remainingFailures <= 0
        if (!ok) remainingFailures--
        ok
    }

    val event = MiniWebhookDispatcher.Delivery("d-1", "push", body)
    dispatcher.enqueue(event)
    if (!dispatcher.enqueue(event.copy())) println("重复事件 d-1 被幂等丢弃（delivery_id 已在投递中）")

    var clock = 0L
    repeat(4) { dispatcher.pump(clock, transport); clock += 1000 }
    println("消费方累计收到 $received 次同一 delivery_id → 处理副作用必须按 id 幂等")
}
```

**设计要点与典型陷阱**：

- **至少一次投递 + 消费方幂等，是一对**：投递方保证“发了就重试到成功或窗口耗尽”，但不保证“只发一次”；更要命的是，消费方超时后投递方判失败重试，而消费方其实已经处理成功——同一 `delivery_id` 可能触发两次副作用。消费方必须按 id 去重（二-3 消费语义的最小完整案例；与多租户计量的用量上报治理同款手法）。
- **签名是信任边界**：消费者不能“收到 webhook 就信”——用共享密钥重算 HMAC 比对签名 + 校验时间戳防重放，否则知道 webhook URL 的人就能伪造“代码已合并”触发一次生产部署（五-3 安全架构：不信任调用方，凭据与消息本身都要验）。
- **绝不能同步调 webhook**：push 主流程里串行调 20 个第三方 URL，任何一个慢 10 秒，全公司的 push 都被拖住——事件外发必须异步队列化，主流程只入队（这也是“事件驱动”的正确用法：外发通知是出口，不是主路径）。
- 重试风暴：第三方故障恢复的瞬间，积压投递一起涌入把它二次打垮——退避之外还要有全局投递速率上限（背压，三-5）。

### API 层与限流配额

**职责**：REST/GraphQL 对外出口，令牌认证、配额执行。

**设计要点与典型陷阱**：限流按“主体”（用户/令牌/应用安装）计而不按 IP——机器人的正当高频访问与攻击者必须区别对待；读、写、昂贵端点（搜索）分开配额；列表接口强制分页（一个不翻页的“列出全部仓库”就是一次全表扫描）。限流位置、配额建模与 [API 网关](11-API网关.md)场景完全同构，可对照讲。

## 架构挑战与知识点映射

| 挑战 | 方案要点 | 对应大纲小节 |
|---|---|---|
| 存储可靠与去重 | 内容寻址、对象不可变、只有引用可变 | 一-3、一-2 |
| 存储水平扩展 | 按仓库分片（分片键=聚合根）、存储服务化 | 二-2、三-3 |
| 多副本一致性 | 引用主副本 + 异步复制，读容忍秒级滞后 | 三-2 最终一致 |
| PR 协作流转 | 显式状态机、新 push 使评审失效 | 一-2 状态模式 |
| CI 触发去抖 | 按分支收敛只跑最新、旧任务取消 | 三-5 |
| Runner 调度 | 拉模式领任务、组织配额多级队列 | 二-3、三-5 |
| Webhook 可靠投递 | 至少一次 + 幂等键、HMAC 签名、退避与死信 | 二-3、五-3 |
| API 滥用防护 | 按主体限流、读写与昂贵端点分配额 | 三-5、六 API 网关 |
| 大文件拖垮仓库 | LFS 指针外置、浅/部分克隆 | 三-3 |
| 平台宕机=研发停摆 | 分片多副本、故障降级只读 | 一-3、三-5 高可用 |

## 与其他场景的联动

- **工单中心（[03](03-工单中心.md)）**：双胞胎——工单管“事”、代码平台管“码”，PR 评审状态机与工单流转状态机同构；两者还常互相集成：commit 消息关联工单、PR 合并自动关单（事件打通两个系统）。
- **API 网关（[11](11-API网关.md)）**：API 限流按主体计、读写分配额，与网关的配额执行同构；Git 平台的 SSH/HTTP 接入层本质是“协议专用网关”。
- **多租户 SaaS 控制平面（[12](12-多租户SaaS控制平面.md)）**：GitHub.com 本身就是巨型多租户 SaaS——组织即租户、私有仓库即租户隔离数据、API 配额即租户配额。
- **低代码开发平台（[10](10-低代码开发平台.md)）**：都在维护“定义”并解释执行——流水线 YAML vs 页面元数据，配置的版本化与回滚是同款问题。
- CI/CD 的深度内容以章节5 为准：流水线示例、DORA 四指标见[章节5/03-部署与发布策略-CICD与灰度](../05-第五阶段/03-部署与发布策略-CICD与灰度.md)（其 GitHub Actions 示例正是跑在本场景的 CI 编排模块上）。

## 取材指引

- 一-2 设计模式：PR 评审状态机（状态模式）、Webhook 订阅分发（观察者）、分支保护规则（策略）、push 钩子链 pre-receive（责任链）。
- 一-3 质量属性：可用性的最高档活教材——Git 平台宕机等于全公司研发停摆；可靠性的底线是“提交历史一个字节都不能丢”。
- 二-1/2/3：三家形态对照讲“架构形态跟着规模走”（Gitea 单二进制 → GitLab 单体 + 存储服务化 → GitHub 服务化）；Webhook 讲事件驱动消费语义（至少一次 + 幂等 + 签名）。
- 三-2：非交易场景的最终一致（复制滞后、乐观并发合并）；三-3：分片键选聚合根（按仓库分片）；三-5：触发去抖与队列公平性。
- 五-3 安全架构：Webhook 验签与重放防护、令牌最小权限；五-2/章节5/03：CI 触发链路与 DORA 指标起点。
- 可出思考题方向：为什么按仓库而不是按对象分片；连推三个 commit 为什么只跑一条流水线、旧的怎么处理；消费方为什么既要验签又要幂等——两次“失败”的投递可能意味着什么；Gitea 单二进制与 GitHub 数百个服务，各自的适用边界在哪里。
