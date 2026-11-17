---
sources:
  - 09-第九阶段
---

# 04. 权限模型：RBAC、ABAC 与 ReBAC

> [← 第九阶段导览](01-导览.md) · 上一册验完「你是谁」，这一册回答「你能做什么」。权限模型的分歧从来不在「要不要用角色」，而在**一个维度用哪个载体表达**：功能归角色、数据范围归数据权限、资源状态归策略。把三者塞进角色，就会得到几百个没人敢删的角色；全靠 if 写在 Service 里，就会得到一份没人看得懂的鉴权代码。

## 1. 权限模型要回答的四个问题

任何一套授权方案，本质上都在回答四个问题。把它们分开，后面的选型才有依据：

| # | 问题 | 例子 | 用错的后果 |
|---|---|---|---|
| 1 | 谁能做这个**功能** | 能不能调用退款接口 | 前端隐藏了按钮，接口仍然裸奔 |
| 2 | 能对**哪些数据**做 | 只能退本部门的订单 | 功能权限有了，数据全看得见（IDOR） |
| 3 | 在**什么条件**下能做 | 只能退「已支付未发货」 | 规则散落在 Service 的 if 里，没人能列全 |
| 4 | 这个判断**谁说了算** | 财务总监自己能给自己开退款权限吗 | 授权本身没有管控，等于没有权限系统 |

第 1 个问题通常被答对了（角色 → 权限点），第 2、3 个问题被混进角色，第 4 个问题压根没人问。而生产事故的分布恰好相反：**越权读数据（问题 2）远多于越权调接口（问题 1）**，内部人滥权（问题 4）则几乎不出现在扫描报告里。

**为什么必须把维度分开**：角色是「岗位」的抽象，一个岗位的人做同一批功能、看同一批数据——这是它成立的前提。一旦某个维度随组织规模增长（部门数、门店数、项目数），把它塞进角色就意味着角色数随该维度线性增长，而角色间的差异只是「数据范围」。这不是权限模型的问题，是**载体重叠**的问题。

## 2. RBAC 家族：RBAC0 到 RBAC3，以及被跳过的 RBAC2

RBAC 不是一张表，是一族模型（Sandhu 等 1996 年提出，后由 NIST INCITS 359 标准化）。四层能力递进：

| 模型 | 在 RBAC0 之上增加 | 一句话 |
|---|---|---|
| RBAC0 | 用户 → 角色 → 权限，多对多 | 基础模型，几乎所有系统都到这里 |
| RBAC1 | 角色继承（父子角色） | 高层角色自动获得下层角色的权限 |
| RBAC2 | 约束（互斥角色、基数、前置条件） | 让「职责分离」由模型保证而不是靠流程 |
| RBAC3 | RBAC1 + RBAC2 | 完整模型 |

现实里的落地分布很集中：**多数系统停在 RBAC0，少数做到 RBAC1 的一层父子，RBAC2 基本没人实现**——而 RBAC2 恰恰是内控最在意的那一层。

**RBAC1 的真实用途与代价**：继承解决的是「角色重复」。没有继承时，「门店店长」和「区域经理」各自挂一遍 12 条权限；有继承后区域经理继承店长再补 3 条。代价是判权要递归展开父角色——**父子关系一旦成环，判权会栈溢出或死循环**，所以必须建环检测，并且把「展开后的权限集」缓存下来，而不是每次请求递归。

**RBAC2 被跳过的两个具体后果**：

- **静态职责分离（SSD）**：财务系统的「制单」和「审核」必须互斥，同一人不能既是制单人又是审核人。没有模型约束，就只能靠制度要求——而制度在赶工时最先被绕过。
- **基数约束**：「一个用户最多持有 3 个角色」「某角色最多授给 2 人」。没有这一层，权限就会在历次「临时帮忙」中不断沉淀，两年后没人说得清谁为什么有这个权限。

```sql
-- RBAC2 的两类约束，落到表上就是两张配置
create table role_mutex (              -- 互斥角色对：不能同时授予
  role_a  bigint not null references roles(id),
  role_b  bigint not null references roles(id),
  reason  text   not null,             -- 为什么互斥，写清依据（审计要用）
  primary key (role_a, role_b),
  check (role_a < role_b)              -- 有序存储，避免 (a,b)/(b,a) 重复
);

create table role_cardinality (        -- 基数约束：某角色的持有点上限
  role_id  bigint primary key references roles(id),
  max_users int   not null check (max_users > 0)
);
```

**取舍**：约束检查必须落在「授权变更」这条路径上（新增 `user_roles` 前校验），而不是查询时。写在查询时的约束只能让判权变慢，挡不住脏数据被写进去。

**坑**：只实现了父子继承、没做环检测的系统，在上线两年后几乎必然出现环——通常来自一次「临时把 A 设为 B 的父角色」的运维操作。建 `roles(parent_id)` 时就该带一个触发器或应用层校验：新父节点的祖先链里不能包含自己。

## 3. 角色爆炸：把数据维度从角色里拆出去

角色爆炸不是「角色多」，而是**角色维度不独立**。经典推演：

> 5 个部门 × 4 个动作（查/改/退/审）× 2 个数据档（本部门/全部）= 40 个角色。

看起来还能忍。再加一个「门店」维度（30 家）就是 1200 个，加一个「渠道」维度到 7200 个。这时候系统里没有任何人能回答「`dept_3_refund_all` 这个角色是谁申请的、还需要吗」，于是没人敢删——权限只会单调增长。

真正的解法不是「更好的角色命名」，而是**换载体**：

| 维度 | 该由谁承载 | 你会怎么写 | 规模增长时 |
|---|---|---|---|
| 功能（能不能退） | 角色 → 权限点 | `finance` 角色挂 `order:refund` | 角色数不随业务增长 |
| 数据范围（退哪些） | 数据权限（scope） | `scope = DEPT_SUBTREE` | 加部门不改角色 |
| 资源状态（能不能退这单） | 策略 / 领域判断 | `status == PAID && !shipped` | 加规则不改角色 |
| 组织归属 | 用户档案 | `users.dept_id` | 随组织树走 |

按这张表落地，角色数量稳定在「岗位种类」量级（通常 10~30 个），部门/门店/渠道的增长只影响数据权限，不产生新角色。

**为什么很多团队最后还是爆了**：因为在实现上「数据范围」比较难写（要拼 SQL 谓词、要处理树形部门），而「给每个部门建个角色」只要点几下鼠标。**建模成本低的那条路，会把成本推迟到运维期一次性收账。**

**坑**：把「全部数据」做成一个 `*_all` 角色，等于开了后门——申请理由总是「临时看看」。更稳的做法是数据范围只到「本部门及下级」，跨部门查询走单独的、带审计的授权工单。

## 4. 权限点的粒度：`resource:action`

权限点（permission code）是判权的原子单位，命名值得单独立规矩：

```text
order:read        读订单
order:refund      订单退款
order:export      导出订单
report:finance:read
```

三条规约：

1. **两段式优先**（`resource:action`）。三段以上（`report:finance:read`）会让通配匹配与「查这个资源的所有权限」变复杂，收益很小。
2. **动作对齐业务能力，不对齐 UI**。`order:refund` 是能力，`order:refund_button` 不是——按钮是前端的事，同一个能力可能对应三个入口。
3. **通配只给平台管理员**，且通配匹配要显式实现（`order:*` 命中 `order:read`），不能靠字符串 `startsWith` 一把梭（`order:*` 会误命中 `orderx:read`，见下方实现）。

**为什么不要把按钮当权限**：一个中等后台的按钮数轻松过 300，逐按钮授权意味着 300 个权限点和 300 行前端配置；更糟的是重构 UI 时要同步改权限，最后没人敢动页面。正确的方向是**权限点稳定、UI 声明依赖**：页面声明 `requiredPermission = "order:refund"`，多个按钮共用同一个权限点。

菜单与路由同理：菜单树由权限点过滤生成，但**菜单只是提示，不是鉴权**。前端拿不到某菜单的入口，不代表用户直接构造请求打不到那个接口。

```kotlin
/** 权限点集合：把通配匹配收敛到一处，别在业务代码里写 startsWith */
@JvmInline
value class PermissionSet(private val raw: Set<String>) {

    fun allows(required: String): Boolean {
        if (required in raw) return true
        // 只认 "资源:*" 形式，且按段匹配，避免 order:* 命中 orderx:read
        val resource = required.substringBefore(':')
        return "$resource:*" in raw
    }
}
```

**坑**：把权限点写成 `order.read`（点号）后，有一天有人加了 `order.read.all`，`startsWith` 匹配逻辑就会串。分隔符一旦选定就全站统一，别混用。

## 5. 数据权限：行级与列级

功能权限说「能退款」，数据权限说「能退哪些单」。四类范围覆盖绝大多数场景：

| 范围 | 谓词 | 典型持有者 |
|---|---|---|
| 全部 | 无条件 | 平台运营（应极少、且带审计） |
| 本部门及下级 | `dept.path LIKE '/1/12/%'` | 部门负责人 |
| 本人 | `owner_id = :uid` | 一线员工 |
| 自定义集合 | `dept_id IN (:ids)` / `owner_id IN (:ids)` | 跨部门协作、临时项目组 |

**为什么部门用「路径前缀」而不是递归查子部门**：`dept.path`（材料化路径，如 `/1/12/125/`）让「本部门及下级」变成一次 `LIKE '前缀%'` 的索引扫描；递归 CTE 每次判权都要跑一遍树，接口 P99 会被这棵树的深度拖住。代价是部门移动时要重写子树路径（一次批量 UPDATE，可接受）。

**列级权限（字段脱敏）**：手机号、身份证、薪资这类字段，不该靠前端「不显示」。两条路：

- **DTO 投影**：按调用者权限选择不同的投影类型（`OrderView` vs `OrderViewMasked`），序列化层零魔法，最可靠。
- **序列化时动态过滤**：自定义 `BeanSerializerModifier` 按权限摘字段——灵活但难测，且一旦漏配就是静默泄露。

**取舍**：列级优先 DTO 投影。原因很现实——「所有接口都记得加脱敏注解」这件事，靠人做不到；而「敏感字段只出现在一个 DTO 里」是可以被代码审查盯住的。

数据权限的落地位置，决定了「下一个接口会不会再犯」：

| 做法 | 漏加时的表现 | 能否静态检查 | 结论 |
|---|---|---|---|
| Controller 里拼 if | 新接口裸奔 | 否 | 不推荐 |
| AOP 拦截后拼 SQL 字符串 | 注入 + 拼错就静默放开 | 否 | 禁止 |
| Repository 参数化 scope | 编译期就没有裸查方法 | 是 | 推荐 |
| 数据库 RLS | 应用全错也挡住 | — | 兜底，见 [05 册](05-授权落地与多租户数据隔离.md) |

```kotlin
/** 数据范围：由「谁在查」解析出来，作为查询参数传给仓储层 */
sealed interface DataScope {
    data object All : DataScope
    data object SelfOnly : DataScope
    data class DeptSubtree(val pathPrefix: String) : DataScope
    data class Explicit(val deptIds: List<Long>) : DataScope
}

@Component
class OrderScopeResolver(private val users: UserRepository) {
    fun resolve(principal: JwtPrincipal): DataScope {
        val user = users.findById(principal.userId) ?: error("user gone")
        return when {
            principal.hasAuthority("order:read:all") -> DataScope.All
            principal.hasAuthority("order:read:dept") -> DataScope.DeptSubtree(user.deptPath)
            else -> DataScope.SelfOnly
        }
    }
}

// 仓储层用 Specification 承载谓词：scope 是必填参数，不提供裸查重载
fun findPage(scope: DataScope, pageable: Pageable): Page<Order> =
    orderRepository.findAll(scope.toSpecification(), pageable)

private fun DataScope.toSpecification(): Specification<Order> = Specification { root, _, cb ->
    when (this@DataScope) {
        DataScope.All -> null                                    // 显式「无条件」，评审时一眼可见
        DataScope.SelfOnly -> cb.equal(root.get<Long>("ownerId"), currentUserId())
        is DataScope.DeptSubtree -> cb.like(root.get("deptPath"), "$pathPrefix%")
        is DataScope.Explicit -> root.get<Long>("deptId").`in`(deptIds)
    }
}
```

**为什么 `All` 要显式返回 `null` 而不是省略条件**：让「无条件查询」在代码里有唯一入口，评审与扫描都能命中（`grep "DataScope.All"` 就是一份全部跨部门查询的清单）。这是可审计性，不是洁癖。

## 6. 落地：表结构、判权与缓存

### 表结构

```sql
create table roles (
  id        bigint generated always as identity primary key,
  code      text not null unique,          -- finance / dept_manager
  name      text not null,
  parent_id bigint references roles(id)    -- RBAC1：一层父子足够
);

create table permissions (
  id       bigint generated always as identity primary key,
  code     text not null unique,           -- order:read
  resource text not null,
  action   text not null,
  unique (resource, action)
);

create table role_permissions (
  role_id       bigint not null references roles(id) on delete cascade,
  permission_id bigint not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id    bigint not null references users(id) on delete cascade,
  role_id    bigint not null references roles(id),
  granted_by bigint not null,               -- 谁授的权：审计的第一现场
  granted_at timestamptz not null default now(),
  expires_at timestamptz,                   -- 临时授权必须带过期时间
  primary key (user_id, role_id)
);

create table role_data_scopes (             -- 数据范围：与角色解耦
  role_id  bigint not null references roles(id),
  scope    text   not null check (scope in ('ALL','DEPT_SUBTREE','SELF','EXPLICIT')),
  primary key (role_id, scope)
);
```

`user_roles` 上的 `expires_at` 值得单独说：**没有过期时间的授权就是永久的**。临时帮忙、项目借用、外包驻场，全都该带到期日；到期后由定时任务回收并留痕，比半年后做一次权限大盘点便宜得多。

### 判权：从数据库到 `GrantedAuthority`

```kotlin
@Component
class PermissionService(
    private val roleRepository: RoleRepository,
    private val permissionCache: PermissionCache,
) {
    fun load(userId: Long, version: Long): PermissionSet =
        permissionCache.get(userId, version) ?: run {
            // 一次 JOIN 取全量：user_roles → role_permissions，含父角色继承
            val codes = roleRepository.findEffectivePermissionCodes(userId)
            permissionCache.put(userId, version, codes)
            PermissionSet(codes)
        }
}
```

```kotlin
// 判权入口：SpEL 里只出现权限点，不出现业务表达式
@Service
class OrderService(private val permissions: PermissionService) {

    @PreAuthorize("hasAuthority('order:refund')")
    fun refund(id: Long, cmd: RefundCommand) {
        // 数据范围与状态判断在这里，用类型化的方式，不写在注解里
    }
}
```

**为什么权限点用 `hasAuthority` 而不是 `hasRole`**：`hasRole` 会自动加 `ROLE_` 前缀，属于「角色名当权限用」的旧习惯；`hasAuthority` 直接比对权限点，角色改名不影响注解。把角色的变更挡在注解之外，是这类系统能活过三次组织调整的原因。

**坑 1：把权限塞进 JWT**。JWT 里带 `permissions` 看着很省事（网关可以直接判权），代价是**改权限要等 token 过期**——安全团队要求「立即收回某人的导出权限」时，只能等 15 分钟到 7 天。折中方案：token 只带 `sub` + `authVersion`，服务端按版本号从缓存取权限集。收回权限 = 版本号 +1，下一个请求立即生效。

**坑 2：超管 `*` 绕过一切**。给 `*` 全通配是最省事的实现，也是最容易出事的地方：它同时让「最小权限」「审计留痕」「四眼原则」全部失效，而且一旦某个账号被标成超管，没人会再去复核它。要么把超管限制为少数几个人工账号（登录要二次验证），要么干脆不提供 `*`，用显式的运营角色替代。

### 缓存：版本号比删 key 更稳

权限是典型的「读极多、写极少」：每个请求都要判权，而权限一个月改不了几次。

```kotlin
@Component
class PermissionCache(private val redis: StringRedisTemplate) {

    fun get(userId: Long, version: Long): Set<String>? =
        redis.opsForValue().get("auth:perms:$userId:$version")?.let(::decode)

    fun put(userId: Long, version: Long, codes: Set<String>) {
        // TTL 带抖动，避免整点集体失效
        val ttl = Duration.ofMinutes(10).plusSeconds(Random.nextLong(0, 120))
        redis.opsForValue().set("auth:perms:$userId:$version", encode(codes), ttl)
    }

    /** 授权变更后调用：只 bump 版本，不做批量删 key */
    fun bumpVersion(userId: Long) = redis.opsForValue().increment("auth:ver:$userId")
}
```

**为什么是版本号而不是 `DEL`**：删 key 会让「刚被删的那一刻」涌入的请求全部回源查库，权限表往往还是同一个热点行，瞬间把数据库打出一波尖峰。版本号方案里旧 key 自然过期，请求按新版本重新计算，回源也是错峰的。

**取舍**：版本号方案要求每个请求都读一次 `auth:ver:{uid}`（一次 Redis GET）。想省这一次往返，就得接受「最长 TTL 的生效延迟」。生产上常见做法是：本地 Caffeine 缓存 5 秒 + Redis 版本号，把延迟压到秒级、把 Redis QPS 压到 1/5。

## 7. ABAC 与 ReBAC：什么时候值得上

RBAC 的两条失效边界（权限依赖资源属性、依赖关系）会把系统推向另外两个模型。

### ABAC：属性驱动的策略

规则形如「财务角色 + 同部门 + 金额 < 5 万 + 单据状态为待审 → 可退」。表达式不再是权限点，而是 `f(subject, resource, action, context)`。

适合上的信号：

- 规则数量超过 50 条，且**业务方要自己改**（合规、风控规则月月变）；
- 需要解释「为什么这次被拒」——策略引擎能返回命中了哪条规则；
- 同一个动作在不同上下文下判定不同（金额、时段、IP 段、设备可信度）。

成本：引入策略语言（OPA/Rego、Cedar）与策略测试，每个请求多一次求值；策略与代码分离后，「为什么线上行为和预期不一样」要先排除策略版本问题。

### ReBAC：关系驱动的授权

授权不是属性，而是**关系图**：`文档 1 的 viewer 包含 项目 A 的 member 包含 组 G 的成员`。Google 的 Zanzibar 论文把这类需求抽象成 relationship tuple + userset rewrite，开源实现有 SpiceDB、OpenFGA。

```text
# OpenFGA 风格：谁能看这份文档
model
  type user
  type group
    relations
      define member: [user]
  type document
    relations
      define owner:   [user]
      define viewer:  [user, group#member]   # 组内所有人都能看
      define can_read: viewer or owner
```

适合上的信号：共享/协作类产品（文档、项目、相册）、组织树天然分层、权限判断本身就是「顺着关系找路径」。

**代价要说清**：每次判权是一次 `Check` 调用（网络往返 + 图遍历），必须配合批量 Check、本地缓存与一致性 token（Zanzibar 的 zookie 解决「刚取消共享、读还是旧的」这类问题）。**单据类、流程类业务用 ReBAC 是过度设计**——那些场景的关系深度不超过两层，`owner_id` 加一个部门条件就够了。

### 三者的分工建议

| 场景 | 建议 |
|---|---|
| 后台管理、审批流、ERP | RBAC（功能）+ 数据权限（范围）+ 少量领域判断 |
| 规则多变、需要业务方自助维护 | RBAC + 策略引擎（ABAC） |
| 协作/共享/组织树 | ReBAC（或「RBAC + 关系表」的轻量版） |
| 强合规（金融、医疗） | RBAC + RBAC2 约束 + 全量授权审计 |

## 8. 授权变更本身也要管控

权限系统的最大漏洞往往不在判权代码，而在「谁能改权限」。

- **变更留痕**：谁、什么时候、把哪个角色/权限给了谁、依据哪张工单。`user_roles.granted_by` + 独立的 `auth_change_log` 表，两者都要，前者是当前状态，后者是历史。
- **四眼原则**：授予高敏权限（导出、退款、密钥查看）需要第二人复核。实现上不是加个弹窗，而是**两步状态机**：`PENDING → APPROVED`，未批准的角色不进判权查询。
- **定期对账**：把权限表与 HR 的在职/岗位数据比对，产出三类异常——离职仍有权限、岗位与角色不匹配、长期未使用的授权（`last_used_at` 超过 90 天）。这类对账脚本比任何静态扫描都有效，因为它对的是「现实」而不是「代码」。
- **回收路径要和授予一样短**：转岗当天就该失效，而不是等下个月盘点。`expires_at` + 组织变更事件驱动回收，是唯一能做到「当天」的方案。

**坑**：授权变更与判权缓存之间有时序问题——变更提交、缓存还没失效的那几百毫秒里，旧权限仍然生效。对「收回权限」这类操作，正确顺序是**先 bump 版本（让后续请求立刻按新权限算），再提交事务**；反过来会出现「权限已收回但仍能用一段时间」，而这段时间恰好是最敏感的。

## 9. 自测

1. RBAC1 的角色继承与 RBAC2 的互斥约束分别解决什么问题？为什么前者落地多、后者几乎没人实现？
2. 「5 个部门 × 4 个动作 × 2 个数据档 = 40 个角色」这个设计错在哪？按「功能/数据/状态」三分法重写一遍。
3. 为什么数据权限的谓词建议放进 Repository 的参数里，而不是在 Controller 里补 if？各举一个「漏加」时的表现。
4. 部门范围为什么用材料化路径（`/1/12/`）而不是递归查子部门？这个选择带来什么维护成本？
5. 把权限放进 JWT 会带来什么具体问题？`authVersion` 方案解决了什么、又没解决什么？
6. 权限缓存为什么用「版本号 bump」而不是「批量删 key」？两者的失效延迟分别是多少？
7. 一个协作类产品要支持「文档共享给某个组」，RBAC、ABAC、ReBAC 分别会怎么建模？哪个最省事？

## 10. 延伸

- 上一册：[03-会话-JWT与OAuth2-OIDC](03-会话-JWT与OAuth2-OIDC.md)——`principal` 里该放身份还是权限，决定了权限变更的生效延迟。
- 下一册：[05-授权落地与多租户数据隔离](05-授权落地与多租户数据隔离.md)——本册讲模型，那一册讲「模型落到 SQL 上之后，怎么防住越权」。
- 越权（IDOR）的具体案例与修法、按行隔离的三道兜底，见 [05 册](05-授权落地与多租户数据隔离.md) 第 3~5 节。
- JPA 的 `Specification`、`@Filter` 与查询条件的相互影响见[第五阶段 07 册](../05-第五阶段/07-JPA实战-映射-脏检查-N+1与批量.md)。
- 权限缓存的失效策略、击穿与雪崩的通用解法见[第七阶段 03 册](../07-第七阶段/03-缓存模式与一致性取舍.md)。
- 毕业项目里怎么把权限与越权回归测试一起验收，见[第十二阶段 02 册](../12-第十二阶段/02-选题与需求拆解.md)。
