---
sources:
  - 09-第九阶段
---

# 03. 会话、JWT 与 OAuth2/OIDC

> [← 第九阶段导览](01-导览.md) · 会话与 JWT 争的不是「先不先进」，而是**状态放在哪一侧**：放服务端就能随时撤销，放令牌里就能跨服务验签。所有关于「JWT 怎么踢人」的讨论，都是在为这个选择补窟窿。

## 1. 状态放在哪儿：一张对照表

会话的本质是**指针**：`JSESSIONID` 只是一个随机键（默认 32 字节），真正的 `SecurityContext` 在服务端。删掉那个键，用户下一次请求就是匿名——这就是「可撤销」的全部实现。

JWT 的本质是**把状态搬进令牌**：用户 id、角色、租户、过期时间都在 payload 里，服务端只验签名，不查存储。代价是签发那一刻起，它就在有效期内恒等于本人。

| 维度 | 服务端会话 | JWT |
|---|---|---|
| 状态位置 | 服务端存储（Redis/内存） | 令牌 payload |
| 每请求开销 | 一次存储读（内网 0.2~1ms） | 一次验签（0.05~0.3ms CPU） |
| 撤销 | 删 key，立即生效 | 到期前无法失效，需额外机制 |
| 水平扩展 | 需共享存储或粘性会话 | 天然，各服务只需公钥 |
| 跨端调用 | Cookie 受 `SameSite`、第三方 Cookie 限制 | `Authorization` 头，无此限制 |
| 体积 | Cookie 几十字节 | 几百字节到 1~2KB，每请求都带 |
| 泄露后 | 可立即踢下线 | 有效期内等同本人 |
| 能放敏感数据吗 | 能（用户看不到） | **不能**，payload 只是 Base64 |

**为什么两者不是替代关系**：后端给浏览器用的场景，正确形态往往是 BFF——浏览器只拿 `HttpOnly` Cookie，token 留在服务端，于是你又回到了会话模型（也就又需要 CSRF 防护）。JWT 真正不可替代的地方是**服务间调用**：A 服务拿授权服务器签的 token 调 B 服务，B 不需要认识 A，也不需要回源查会话。

会话方案内部也分三档，选错会把「可撤销」这个优点弄丢：

| 存储 | 撤销 | 扩展性 | 代价 |
|---|---|---|---|
| 容器内存（默认） | 重启即全部失效 | 单机 | 多实例下互相不认，必须粘性会话 |
| 容器会话复制 | 广播有延迟 | 实例数少时勉强 | 广播风暴，扩容即雪崩 |
| Spring Session + Redis | 删 key 立即生效 | 任意扩容 | 每请求一次 Redis 往返，Redis 成为关键路径 |

**坑**：把 JWT 塞进 `localStorage` 是最常见的错误之一。它绕过了 `HttpOnly`，任何一次 XSS 都能把 token 带走；而 JWT 又不能撤销，你连止损都做不到。浏览器侧要么用 `HttpOnly` Cookie + CSRF 防护，要么走 BFF。

## 2. JWT 结构与必须校验的字段

三段 Base64URL：`header.payload.signature`。header 声明算法与密钥 id（`alg`/`kid`），payload 是 claims，signature 是对前两段的签名。

**payload 不加密**，只编码。所以第一条规矩：身份证号、手机号、内部权限细节都不要放进去。第二条规矩：**`alg` 是攻击者可控的输入**，绝不能让令牌自己决定用什么算法验签。

必须逐项校验的字段：

| 字段 | 校验什么 | 不校验的后果 |
|---|---|---|
| 签名 + `kid` | 用正确密钥、正确算法验签 | 伪造任意身份 |
| `alg` | 必须在白名单内（如只允许 RS256） | `alg: none` 直接跳过验签；RS256 混淆成 HS256 时公钥被当成 HMAC 密钥 |
| `exp` | 未过期（含时钟偏移容忍） | 永久有效令牌 |
| `nbf` / `iat` | 未生效时间、签发时间合理 | 预签发令牌长期潜伏 |
| `iss` | 签发方是本系统信任的 issuer | 接受别的租户/别的环境的令牌 |
| `aud` | 受众包含本服务 | A 服务的令牌能调 B 服务（横向越权） |

**为什么 `alg: none` 与算法混淆是同一类问题**：两者都源于「令牌自己声明算法」。防御只有一条——解码器构造时就把算法钉死（`jwsAlgorithm(RS256)`），而不是读完 header 再决定。Nimbus 默认拒绝无签名 JWT，但只要你允许了「HS256 与 RS256 都行」，混淆攻击就成立了：攻击者用公开的 RSA 公钥当 HMAC 密钥签一个 HS256 令牌，验签方用同一串字节验，通过。

## 3. 「签发即生效」的三种补救

JWT 没有撤销语义，这是设计而非缺陷。工程上有三条路，粒度不同，常常同时用：

| 方案 | 失效延迟 | 代价 | 适用 |
|---|---|---|---|
| 短 TTL + 刷新令牌 | 最长 = access TTL（5~15 分钟） | 多一套刷新流程与存储 | 默认选择，兜底 |
| 吊销名单（`jti` denylist） | 0 | 每请求一次 Redis 读，等于又有状态；Redis 挂时 fail-open 还是 fail-closed 要显式选 | 踢单个设备、封号 |
| `tokenVersion`（用户表/缓存） | 0 ~ 缓存 TTL | 每请求读一次版本号；本地缓存 30s 就有 30s 窗口 | 改密码、全端下线 |

**为什么短 TTL 是地基**：它是唯一不增加请求路径开销的方案，把「泄露后损失」限制在一个可接受的窗口里。但 TTL 不能无限缩短——每次刷新都是一次授权服务器往返，TTL 5 分钟意味着每用户每小时 12 次刷新，百万用户就是每秒 300+ 次额外请求。

**坑一**：denylist 让无状态重新变成有状态。Redis 不可用时，`fail-open` 意味着撤销失效（安全事故），`fail-closed` 意味着全站 401（可用性事故）。这个选择必须写进故障预案，而不是留给异常处理随手决定。

**坑二**：`tokenVersion` 方案里，如果为了省一次查询加了 30 秒本地缓存，撤销窗口就不是 0 而是 30 秒。声称「改密码立即全端下线」之前，先把这个缓存算进去。

## 4. 刷新令牌的轮换与重放检测

刷新令牌是长期凭证，一旦泄露等于长期有效。所以它必须是**一次性**的，并且能检测「同一个令牌被用了两次」。

```kotlin
@Service
class RefreshService(
    private val repo: RefreshTokenRepository,
    private val issuer: TokenIssuer,
    private val hasher: MessageDigest,
) {
    fun rotate(rawToken: String, deviceId: String): TokenPair {
        val hash = hasher.sha256(rawToken)
        val stored = repo.findByHash(hash) ?: throw InvalidGrantException("unknown token")

        // 已经用过的令牌再次出现：不是并发，是重放
        if (stored.usedAt != null) {
            repo.revokeFamily(stored.familyId)              // 整族作废
            throw InvalidGrantException("token replay detected")
        }
        if (stored.expiresAt.isBefore(Instant.now())) {
            repo.revokeFamily(stored.familyId)
            throw InvalidGrantException("expired")
        }

        val next = TokenPair(
            access = issuer.issue(stored.userId, stored.familyId),
            refresh = RandomToken.generate(),               // 只返回明文一次
        )
        repo.markUsed(stored.id, usedAt = Instant.now())
        repo.save(
            RefreshToken(
                hash = hasher.sha256(next.refresh),
                familyId = stored.familyId,
                userId = stored.userId,
                deviceId = deviceId,
                expiresAt = Instant.now().plus(Duration.ofDays(30)),
            )
        )
        return next
    }
}
```

四条规则缺一不可：

1. **只存哈希**。数据库被读走时，明文刷新令牌等于所有人的登录态。
2. **用完即标记，不删除**。删掉就无法区分「从未存在」和「用过一次」——而后者正是重放信号。
3. **重放即灭族**。攻击者与真实用户可能各持一份，谁先用不确定；检测到重放就把整个 `familyId` 作废，让双方都重新登录。
4. **绝对有效期 + 轮换**。轮换解决「单次泄露」，绝对有效期解决「无限续期」。

**取舍**：灭族策略会让「并发刷新」误伤（同一客户端两个标签页同时刷新）。工程上通常给 5~10 秒的宽限期，期内同一 token 的第二次使用返回同一个新 token，超期才算重放。

## 5. OAuth2/OIDC 的角色与流程选择

OAuth2 分四个角色：资源所有者（用户）、客户端（你的前端或第三方应用）、授权服务器（发 token 的一方）、资源服务器（验 token 的一方）。**后端服务在绝大多数架构里只是资源服务器**，它不参与登录，只负责验签与判权。

| 流程 | 该不该用 | 说明 |
|---|---|---|
| 授权码 + PKCE | **唯一推荐**，Web/SPA/移动端都用它 | PKCE 让「拦截授权码」无法兑换 token |
| `client_credentials` | 用于 M2M | 没有用户，令牌代表服务自身 |
| 隐式（implicit） | 废弃 | token 直接出现在 URL 片段，进浏览器历史与 Referer |
| 密码模式（password） | 废弃 | 客户端接触用户口令，违背 OAuth2 初衷 |
| 设备码 | 用于电视/CLI | 输入受限设备的唯一体面方案 |

OIDC 是在 OAuth2 之上加了一层身份：多一个 `id_token`（就是一个 JWT），用 `scope=openid` 触发，`sub` 是稳定用户标识。**授权（access token）与身份（id_token）要分开用**——拿 `id_token` 去调 API 是常见误用，它的受众是客户端，不是资源服务器。

**为什么 PKCE 是必需的**：授权码是走浏览器重定向回来的，可能被恶意应用截获（自定义 scheme 尤其危险）。PKCE 让客户端在发起时生成 `code_verifier`，只把哈希发给授权服务器；兑换时必须出示原文，截获者拿不到。

**为什么业务服务不该兼任授权服务器**：一旦你的订单服务也负责发 token，它就必须存用户口令、做 MFA、管客户端注册、处理密钥轮换——这些能力与业务无关，却都是安全事故的高发面。授权服务器应该是一个独立组件（Keycloak、Auth0、云厂商 IAM，或公司统一的 SSO 平台），业务服务只做资源服务器。判断标准很简单：**服务里有没有 `signingKey` 这类配置**，有就说明边界划错了。

**取舍**：SPA 直连授权服务器要处理 token 存储问题（见第 1 节的坑），BFF 模式把 token 留在服务端、浏览器只持 Cookie，安全但引入会话与 CSRF。这是安全性与复杂度之间必须明确选一次的点，别两头都想要。

## 6. 后端作为资源服务器的配置要点

先把链配起来——资源服务器的一切都挂在 `oauth2ResourceServer { jwt { } }` 这个入口上，它向链里插入 `BearerTokenAuthenticationFilter`，验签逻辑全部委托给 `JwtDecoder`：

```kotlin
@Bean
fun apiChain(
    http: HttpSecurity,
    decoder: JwtDecoder,
    converter: JwtAuthenticationConverter,
): SecurityFilterChain = http {
    securityMatcher("/api/**")
    csrf { disable() }
    sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
    authorizeHttpRequests { authorize(anyRequest, authenticated) }
    oauth2ResourceServer {
        jwt {
            this.decoder = decoder
            jwtAuthenticationConverter = converter
        }
    }
}.build()
```

decoder 与 converter 单独声明成 bean（下文），配置里只做装配——这样两者都能被测试直接拿到，而不用起整条安全链。

```kotlin
@Configuration
class ResourceServerConfig {

    @Bean
    fun jwtDecoder(props: JwtProperties): JwtDecoder =
        NimbusJwtDecoder.withJwkSetUri(props.jwkSetUri)
            .jwsAlgorithm(SignatureAlgorithm.RS256)      // 钉死算法，防 none 与混淆
            .build()
            .apply {
                setJwtValidator(
                    DelegatingOAuth2TokenValidator(
                        JwtTimestampValidator(Duration.ofSeconds(30)),   // 时钟偏移容忍
                        JwtIssuerValidator(props.issuer),
                        JwtClaimValidator<List<String>>(JwtClaimNames.AUD) { aud ->
                            aud?.contains(props.audience) == true
                        },
                    )
                )
            }

    // 角色在 roles claim 里时必须换 converter，默认只认 scope/scp
    @Bean
    fun jwtAuthenticationConverter(): JwtAuthenticationConverter =
        JwtAuthenticationConverter().apply {
            setJwtGrantedAuthoritiesConverter(
                JwtGrantedAuthoritiesConverter().apply {
                    setAuthoritiesClaimName("roles")
                    setAuthorityPrefix("ROLE_")
                }
            )
            setPrincipalClaimName("sub")
        }
}
```

四个要点，每一个都对应一类线上事故：

- **`aud` 默认不校验**。Spring 只校验时间，配了 issuer 才校验 `iss`。不校验 `aud` 意味着「为 A 服务签发的令牌可以调 B 服务」——多服务共用一套授权服务器时这是高频漏洞。
- **authorities 转换默认读 `scope`/`scp`，前缀 `SCOPE_`**。角色放在 `roles` 里而没换 converter，症状是「token 里明明有 ADMIN，`hasRole('ADMIN')` 却 403」，且日志里看不出原因。
- **JWKS 有缓存**。公钥轮换后，旧 `kid` 会短暂验不过；新 `kid` 找不到时**绝不能**回退到「试所有密钥」或「跳过验签」，那等于开放伪造。正确做法是返回 401，让客户端重取 JWKS。
- **客户端侧的 `issuer-uri` 会触发启动时发现请求**。授权服务器不可用时应用起不来，这在滚动发布时是隐形故障源；生产环境建议直接配 `jwk-set-uri`。

还有一个容易被忽略的连锁反应：**一旦你自己声明了 `JwtDecoder` bean，`spring.security.oauth2.resourceserver.jwt.*` 这一组自动配置就不再生效**。于是配置文件里写的 `issuer-uri` 变成没人读的死配置，而你以为校验还在生效——排查这类问题时，先确认容器里到底有几个 `JwtDecoder`。反过来说，如果只需要默认校验，就别自己声明 bean，用 `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` 加 `...issuer-uri` 即可；要加 `aud` 校验时才接管，并且把 issuer、时间校验一起补回来（`DelegatingOAuth2TokenValidator` 不会自动继承默认校验器）。

## 7. 无效 token 的六种情况

同一句「401 Unauthorized」背后是六种完全不同的原因，排查时按这张表走，比通读日志快：

| # | 现象 | 根因 | 排查点 |
|---|---|---|---|
| 1 | 401，`invalid_token`，发生在 token 签发很久之后 | `exp` 已过期 | 解出 `exp` 与服务器当前时间对比 |
| 2 | 401，但 token 是刚签的 | `nbf`/`iat` 在未来（时钟漂移、容器时区） | `ntpq -p`；对比签发机与验证机时间 |
| 3 | 只在部分服务 401 | `iss` 不匹配（多环境/多 issuer） | 打印验证器实际使用的 issuer |
| 4 | 别的服务能用，本服务 401 | `aud` 不含本服务（或本服务配了校验） | 解 payload 看 `aud` 数组 |
| 5 | 401，日志有 `Signed JWT rejected` | 算法或密钥不符：HS256 vs RS256、`kid` 找不到、密钥轮换未同步 | 看 JWKS 里是否有该 `kid` |
| 6 | 发布后突然大面积 401，重启后恢复 | JWKS 缓存里是旧公钥 | 检查授权服务器轮换时间与应用缓存 TTL |

**为什么第 4 种最难查**：它的表现是「同一个 token，A 服务放行、B 服务拒绝」，而两边日志都只说「401」。只有把 `aud` 打印出来才看得见。所以资源服务器启动时应该把「我正在校验哪个 issuer/audience」打成一行 INFO。

**兜底**：`alg: none` 与畸形令牌不应该出现在这张表里——它们应该在解码器构造时就无法通过。如果出现了，说明有人手写了解码逻辑或放开了算法白名单。

## 8. 自测

1. 会话的「可撤销」在实现上到底依赖什么？为什么 JWT 复制这套做法就叫「重新引入状态」？
2. 为什么「允许 HS256 与 RS256 都行」会让 RS256 的公钥变成攻击工具？防御点在代码的哪一行？
3. `tokenVersion` 方案里如果给版本号加了 30 秒本地缓存，「改密码立即全端下线」还成立吗？窗口多大？
4. 刷新令牌为什么必须「标记已用」而不是「删除」？重放检测触发后为什么要作废整个家族，而不是只作废这一个？
5. 后端作为资源服务器时，`id_token` 为什么不能拿来调 API？它和 access token 的受众分别是谁？
6. 一张 token 在 A 服务能用、B 服务 401，你会先看哪个字段？为什么默认配置下会这样？

## 9. 延伸

- 上一册：[02-SpringSecurity过滤器链与认证授权时序](02-SpringSecurity过滤器链与认证授权时序.md)——`BearerTokenAuthenticationFilter` 在链里的位置。
- 下一册：[04-授权模型与多租户数据隔离](04-授权模型与多租户数据隔离.md)——验完 token 之后，「他能看哪些数据」。
- 纯 Bearer 无状态 API 为什么可以关 CSRF、关了之后还剩什么风险，见本阶段 [05 册](05-Spring侧的Web攻击面防线.md)。
- Cookie 属性（`HttpOnly`/`SameSite`/`__Host-` 前缀）的完整语义在[浏览器站第四阶段 05 册](https://yidafu.github.io/tech-learning/browser/docs/第四阶段/请求语义-协商-Cookie-条件请求与Range)。
- 令牌校验失败如何返回统一的 `ProblemDetail` 而不是默认空体，见[第四阶段 06 册](../04-第四阶段/06-错误模型-ProblemDetail与错误码.md)。
