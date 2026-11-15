---
sources:
  - 11-第十一阶段
---

# 05. 网关与 BFF

> [← 第十一阶段导览](01-导览.md) · 网关是全部流量必经的窄口：职责收在「横切面」（路由、鉴权、限流、灰度、协议、错误体），一旦开始写业务，它就变成全站最危险的单点。

## 1. 网关的职责清单

网关的本质是**把每个服务都要做一遍的横切面工作收拢到一处**。没有网关时，鉴权、限流、灰度在 N 个服务里各写各的，漂移是必然的；有了网关，这些事只有一个实现、一个配置源。

| 职责 | 做什么 | 为什么必须放网关 |
|---|---|---|
| 路由 | 按路径/主机把请求转到对应服务 | 外部只需要一个域名与一套证书 |
| 鉴权前置 | 验 token、解出身份、透传身份头 | 认证只做一次；下游专心做授权（第 3 节） |
| 限流 | 按路由/用户/IP 限流，429 + Retry-After | 全局视角才看得见总量；被打挂一个服务不该拖垮全站 |
| 灰度分流 | 按权重/标签把流量切到新版本（09 册） | 分流维度（用户、请求头）只有入口处拿得全 |
| 协议转换 | 外部 HTTPS/h2 → 内部 h1/h2/gRPC | 证书与协议升级只在入口处理 |
| 统一错误体 | 5xx 归一成统一格式（ProblemDetail） | 客户端不用猜每个服务的错误格式（第四阶段 06 册） |

清单里每一项的共同特征：**与具体业务无关，且必须在请求进入业务前发生**。这是判断「某功能该不该进网关」的第一把尺子。

## 2. 网关不该做的事

三个典型越界，各配一个真实形状的反例与后果：

| 反例 | 后果 |
|---|---|
| **业务编排**：网关过滤器里写「如果是大促订单就打 9 折再转发」 | 优惠规则改一次要重新发布网关——而网关发布等于全站发布；规则无法按服务独立测试，出错面是全站 |
| **跨服务多次聚合**：网关里串行调订单、用户、库存拼一个大响应 | 网关线程被慢下游占住（04 册的可用性乘法发生在最窄的口子上）；网关内存膨胀，一次下游抖动变成全站超时 |
| **状态存储**：session 存在网关内存 | 网关重启/扩缩容 = 全量用户掉线；网关变成有状态组件，不能随意水平扩容 |

三个反例的统一病根：**让最不该慢、最不该挂的组件变慢变挂**。网关挂了是全站挂，所以它的代码量与变更频率必须最小化——任何业务逻辑进了网关，都会把这个「变更最少」的承诺打破。复杂聚合的正确去处是 BFF（第 5 节），业务编排的正确去处是拥有该业务的那个服务。

## 3. Gateway 5 的核心概念与形态选型

Spring Cloud Gateway（2025.1 / Oakwood 对应 Gateway 5）的核心模型只有三个概念：

- **Route**：一条转发规则——匹配条件成立时，请求发往目标 URI；
- **Predicate**：匹配条件（路径、头、参数、方法、时间窗）；
- **Filter**：匹配后、转发前后的处理链（改头、鉴权、限流），分 pre 与 post 两个阶段，顺序就是执行顺序。

Gateway 同时提供两种运行形态：

| 形态 | 栈 | 适用 |
|---|---|---|
| WebFlux 形态 | Netty + Reactor，传统默认 | 已有响应式技术栈、极端高并发长连接场景 |
| Web MVC 形态 | Servlet + `spring-cloud-gateway-mvc` 模块，Gateway 起一等支持 | 团队是 Servlet 栈；配合虚拟线程（第三阶段、第八阶段）足以覆盖绝大多数网关流量 |

选型心法：**网关是基础设施，优先选团队已经熟练的并发模型**。为了「网关要响应式」引入一整套 Reactor 心智负担（第八阶段 05 册的代价账），多数场景不值得——MVC 形态 + 虚拟线程的阻塞成本已经很低。唯一例外是网关要做大量对外长连接（SSE、WebSocket 汇聚）时，Netty 的连接成本优势才真正显现。

过滤器顺序是配置里最容易埋雷的地方：鉴权必须在限流之前还是之后，决定了「被限流的请求要不要消耗鉴权成本」「未鉴权的请求算不算进限流额度」——两者都是真实的策略分歧，关键是**显式声明顺序并写注释**，而不是靠默认顺序碰运气。

## 4. 鉴权前置与信任边界

标准形态：网关验 token（JWT 签名、过期、吊销），解出身份，把身份以**内部头**透传给下游（如 `X-User-Id`、`X-User-Roles`），下游只做授权判断、不再碰 token。

这里必须立刻立起信任边界：**内网不是可信网络**。下游直接信任 `X-User-Id` 意味着——任何能访问内网的人（运维脚本、被攻破的容器、忘记鉴权的调试入口）都能伪造这个头冒充任意用户。第四阶段讲过的越权问题在服务化后换了入口。三层防线按成本递进：

1. **入口剥离**：网关强制删除外部请求自带的 `X-User-*` 头（防伪造的第一道，成本最低，必做）；
2. **网络分段**：业务服务不直接暴露公网，只接受来自网关网段的流量（K8s NetworkPolicy / 安全组）；
3. **服务间认证**：内网 mTLS 或内部服务 token（第九阶段 03 册的 OIDC 体系），防御「内网已被渗透」的场景。

最低要求是 1 + 2；「内网即可信」的假设在合规审计里过不了，在真实攻击里也撑不住。

## 5. 网关限流

Gateway 的限流走 `RequestRateLimiter` 过滤器 + Redis 令牌桶（`RedisRateLimiter`）：请求速率的判定存 Redis，网关多实例共享同一份计数。限流维度由 `KeyResolver` 决定——按用户、按 IP、按接口路径，维度选错等于白限（按 IP 限流会把 NAT 后面的所有人捆在一起）。

设计要点：**限流按路由配置，而不是全局一刀切**——写接口和查询接口的容忍速率不同，大促敏感接口要单独收紧；被限的请求回 429 + `Retry-After`（第四阶段 03 册的状态码语义），让客户端退避而不是傻重试；限流阈值要和下游容量数字（第十阶段 08 册的压测结果）对齐，拍脑袋的阈值要么形同虚设、要么误伤正常流量。

## 6. BFF：为客户端定制的聚合层

BFF（backend for frontend）解决的是「移动端要一次拿 3 个接口的数据、桌面 Web 只要 1 个」的适配问题：每个客户端类型配一个 BFF，由它做聚合、字段裁剪与格式适配，客户端团队的节奏不再被后端服务的接口演进绑架。

边界一句话：**BFF 可以聚合、裁剪、格式转换，但不该持有业务规则**。「这个用户能不能买这个商品」是订单域的规则，写进 BFF 就意味着规则变更要动客户端链路的发布节奏——规则必须留在拥有它的服务里，BFF 只做「取数与拼装」。BFF 与网关的关系：网关是全站共用的一个，BFF 按客户端类型可以有多个（mobile-bff、web-bff），它们串在网关后面，而不是互相替代。

第二册拆分判据的视角看 BFF：它是「多团队并行」压力的缓冲带——后端服务按业务能力切、稳定演进，客户端体验按终端切、快速迭代，两层节奏解耦，互不阻塞。

## 7. 配置代码

YAML 与 Kotlin DSL 两种写法都给——前者配置评审友好，后者类型安全、适合程序化生成的路由：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: orders-route
          uri: http://orders-service            # K8s Service 名或注册中心服务名
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=0
            # 鉴权在前：先验 token、注入身份头
            - JwtAuth
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 500   # 每秒令牌
                redis-rate-limiter.burstCapacity: 1000  # 桶容量，容忍突发
                key-resolver: "#{@userKeyResolver}"     # 按用户限流
            # 灰度按权重切流：10% 进 canary 实例组（09 册的切流在此落地）
            - name: Weight
              args:
                weight-group: orders-v2
                weight: 10
        - id: inventory-route
          uri: http://inventory-service
          predicates:
            - Path=/api/stock/**
          filters:
            - JwtAuth
```

```kotlin
@Configuration
class GatewayRoutes {

    // 与上面的 YAML 等价的 Kotlin DSL 写法：路由集中在代码里，
    // 编译期检查 + 可单元测试；团队二选一，混用会让路由事实源分裂
    @Bean
    fun ordersRoute(builder: RouteLocatorBuilder): RouteLocator =
        builder.routes {
            route("orders-route") {
                path("/api/orders/**")
                filters {
                    requestRateLimiter { it.setRateLimiter(redisRateLimiter()) }
                }
                uri("http://orders-service")
            }
        }
}
```

```kotlin
@Configuration
class GatewayBeans {

    // 限流维度：已鉴权的请求按用户限；未鉴权（登录接口等）按 IP 兜底
    @Bean
    fun userKeyResolver(): KeyResolver = KeyResolver { exchange ->
        val userId = exchange.request.headers.getFirst("X-User-Id")
        Mono.just(userId ?: exchange.request.remoteAddress?.address?.hostAddress ?: "anonymous")
    }

    // 鉴权过滤器：验证通过后透传身份头；关键动作——先剥离外部伪造的同名头
    @Component
    class JwtAuthFilter : GlobalFilter, Ordered {

        override fun getOrder() = -100   // 负数序：在路由转发与限流之前执行

        override fun filter(exchange: ServerWebExchange, chain: GatewayFilterChain): Mono<Void> {
            val request = exchange.request
            val token = request.headers.authorization?.removePrefix("Bearer ")
            val claims = token?.let { jwtVerifier.verifyOrNull(it) }
                ?: return unauthorized(exchange)          // 401，带 WWW-Authenticate
            val forwarded = request.mutate()
                .headers { h -> h.remove("X-User-Id"); h.remove("X-User-Roles") }  // 防伪造
                .header("X-User-Id", claims.subject)
                .header("X-User-Roles", claims.roles.joinToString(","))
                .build()
            return chain.filter(exchange.mutate().request(forwarded).build())
        }
    }
}
```

## 8. 请求进来之后：网关做了什么

一条请求在网关内部的完整路径，按顺序（这个顺序表本身就是过滤器配置的评审依据）：

| 步 | 动作 | 失败时返回 |
|---|---|---|
| 1 | TLS 终止，协议识别（h2 降级内部 h1/h2） | 连接层拒绝 |
| 2 | Predicate 匹配路由 | 404（配统一错误体） |
| 3 | 鉴权过滤器：验 token、剥离伪造头、注入身份头 | 401 + WWW-Authenticate |
| 4 | 授权粗判：路径级权限（管理员路径） | 403 |
| 5 | 限流：Redis 令牌桶扣减 | 429 + Retry-After |
| 6 | 灰度分流：按权重/标签选实例组 | — |
| 7 | 转发到下游，透传身份头与 traceId | 504（下游超时）/ 502（下游异常） |
| 8 | post 过滤器：响应加统一头（请求 id）、5xx 归一 | — |

排障时的对应关系：404 查第 2 步的 predicate、401 查第 3 步的 token 校验、429 查第 5 步的 Redis、504 查第 7 步的下游——网关错误码与步骤一一对应，是排障第一分叉点（第四阶段 03 册的 502/504 判读在网关语境的延伸）。

## 9. 自测

1. 网关的六项职责有什么共同特征？「某功能该不该进网关」的第一把尺子是什么？
2. 「网关里存 session」「网关里做三次跨服务聚合」各导致什么后果？复杂聚合的正确去处是哪里？
3. Gateway 的 Route/Predicate/Filter 各是什么？为什么过滤器顺序要显式声明？
4. WebFlux 形态与 Web MVC 形态怎么选？什么场景下 Netty 的优势才真正显现？
5. 下游直接信任 `X-User-Id` 有什么风险？三层防线各自的成本与防御对象是什么？
6. `KeyResolver` 的维度选错会导致什么？限流阈值应该和什么数字对齐？

## 10. 延伸

- 上一册：[04-服务间通信-同步与异步](04-服务间通信-同步与异步.md)——网关透传的 traceId 从哪来、BFF 聚合的可用性乘法怎么算。
- 限流的令牌桶原理与 Redis 实现细节，见[第八阶段 06 册](../08-第八阶段/06-弹性-超时-重试-熔断-舱壁与限流.md)；JWT 与 OIDC 的完整体系见[第九阶段 03 册](../09-第九阶段/03-会话-JWT与OAuth2-OIDC.md)。
- 灰度切流的三件套与发布检查单见[本阶段 09 册](09-大型应用工程化-联调-灰度与容量.md)；统一错误体的构造见[第四阶段 06 册](../04-第四阶段/06-错误模型-ProblemDetail与错误码.md)。
