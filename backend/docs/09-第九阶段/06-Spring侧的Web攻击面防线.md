---
sources:
  - 09-第九阶段
---

# 06. Spring 侧的 Web 攻击面防线

> [← 第九阶段导览](01-导览.md) · 每一类 Web 攻击在 Spring 里都对应一个具体的开关或写法，而默认配置只覆盖了一半。这一册按攻击类型列「错误写法 → 正确写法」，最后压成一张「我配了什么 → 挡住什么」的总表。

## 1. CSRF：什么时候可以关

CSRF 成立需要三个条件同时满足：浏览器**自动携带凭证**（Cookie、HTTP Basic 缓存、TLS 客户端证书）、参数**可被攻击者预测**、服务端**不校验请求来源**。缺一个就不成立——这也是「纯 Bearer 的无状态 API 可以关 CSRF」的全部依据：`Authorization` 头不会被浏览器自动附加，攻击者的表单提交带不上它。

Spring Security 默认开启 CSRF，token 默认存 session，并做了 BREACH 缓解（每次响应输出不同的掩码值）。关掉它的前提必须写清楚：

| 条件 | 满足才可关 |
|---|---|
| 认证方式 | 只用 `Authorization` 头，不读任何 Cookie |
| 兜底认证 | 没有「Cookie 会话」这条备用路径 |
| CORS | 显式白名单，不允许任意 Origin |
| 浏览器直连 | 前端不是同域 Cookie 会话 |

```kotlin
// 错：认证还在用 Cookie 会话，却把 CSRF 关了
http {
    csrf { disable() }
    formLogin { }
}

// 对：SPA + Cookie 会话，把 token 暴露给前端读取
http {
    csrf {
        csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse()
    }
}
```

**关掉之后的替代方案**（通常叠加使用）：`SameSite=Lax`（挡住跨站 POST，但挡不住顶层 GET 导航）、校验 `Origin`/`Sec-Fetch-Site`、要求自定义请求头（浏览器跨站表单带不了自定义头，会强制走预检）。

**坑**：`CookieCsrfTokenRepository.withHttpOnlyFalse()` 让 JS 能读 token，同时也意味着任何 XSS 都能读到它——CSRF 防护不能替代 XSS 防护。另外 Security 6.1 之后默认的掩码处理与「从 Cookie 读原始 token」不兼容，SPA 场景需要官方文档里那个 `SpaCsrfTokenRequestHandler` 示例实现（需自行拷入项目），只改 repository 会出现「token 明明对，却一直 403」。

## 2. CORS：白名单与 `allowCredentials`

CORS 不是鉴权，是**服务端授权浏览器把响应交给页面脚本**。它防的是「别的站点读你的响应」，不是「别的站点发请求」——请求早就发出去了。

```kotlin
// 错：任意 Origin + 允许带 Cookie = 任意站点都能读走用户数据
@Bean
fun corsConfig(): CorsConfigurationSource = UrlBasedCorsConfigurationSource().apply {
    registerCorsConfiguration("/**", CorsConfiguration().apply {
        allowedOriginPatterns = listOf("*")
        allowCredentials = true
        allowedMethods = listOf("*")
    })
}

// 对：精确白名单，从配置读，方法收敛
@Bean
fun corsConfig(props: CorsProps): CorsConfigurationSource =
    UrlBasedCorsConfigurationSource().apply {
        registerCorsConfiguration("/api/**", CorsConfiguration().apply {
            allowedOrigins = props.allowedOrigins          // 完整 scheme + host + port
            allowedMethods = listOf("GET", "POST", "PATCH", "DELETE")
            allowedHeaders = listOf("Authorization", "Content-Type", "X-XSRF-TOKEN")
            allowCredentials = true
            maxAge = Duration.ofHours(1)
        })
    }
```

四个坑：

- **`allowedOrigins("*")` 配 `allowCredentials(true)` 会直接抛异常**（Spring 拒绝启动）。它挡住的是明显错误，不是全部错误。
- **`allowedOriginPatterns("*")` 是逃逸口**。它会把请求的 `Origin` 原样回显，配上 `allowCredentials` 等于对全世界开门。这个组合在代码里看起来「只是通配」，实际是数据泄露。
- **预检不带 Cookie**。`OPTIONS` 预检请求没有 `Authorization`，安全链若对它要求认证，浏览器只报 CORS 错误、看不到 401。正确做法是在安全链里放行 `OPTIONS`，或者让 `CorsFilter` 排在认证之前处理掉预检。
- **网关与应用同时加 CORS 头**，浏览器会因「多个值」拒绝。CORS 只在一层配。

## 3. XSS：输出编码、CSP、清洗

后端在 XSS 上的职责有三件，按性价比排序：**正确的 `Content-Type` + `nosniff`**、**CSP**、**富文本白名单清洗**。

```kotlin
// 错：把用户内容当 HTML 返回
@GetMapping("/preview", produces = [MediaType.TEXT_HTML_VALUE])
fun preview(@RequestParam q: String): String = "<div>$q</div>"

// 对：JSON 返回，前端按文本渲染；同时下发 CSP
http {
    headers {
        contentSecurityPolicy {
            policyDirectives = "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        }
    }
}
```

**为什么 `Content-Type` 比转义更靠前**：一个返回 JSON 的接口，只要头写对了，浏览器不会把它当 HTML 解析，注入的 `<script>` 就是一段普通字符串。头写错（返回 `text/html` 或缺失 + 浏览器嗅探）时，同样的数据立刻变成可执行脚本。`X-Content-Type-Options: nosniff` 关掉嗅探，是这一层的地基。

**CSP 的价值与边界**：它能挡住「注入成功但脚本执行不了」的大部分场景，但一旦写了 `'unsafe-inline'` 就等于放弃大半。工程上可行的路径是先上 `Content-Security-Policy-Report-Only` 收集违规，再切强制模式。

**富文本必须清洗，不能只靠转义**：允许 `<b>` 就必须允许标签，此时只能走白名单（OWASP Java HTML Sanitizer 一类），并且清洗在**写入时**做一次、**输出时**再信任清洗结果。反过来，如果只在输出时转义，编辑器存进去的富文本会被转成源码显示。

**DOM XSS 与后端的关系**：还有一类 XSS 完全不经过服务端渲染——前端把 `location.hash` 或接口返回的字符串塞进 `innerHTML`。后端能做的是「不给它原料」：接口只返回数据不返回 HTML 片段，字段语义上区分「纯文本」与「富文本」，前端才能按类型选择 `textContent` 还是清洗后的渲染。

## 4. SQL 与 JPQL 注入

参数化是唯一正解，这一条没有例外。真正的难点在于**结构不能参数化**——列名、表名、`ORDER BY`、`ASC/DESC` 都不是值，绑定参数在这里无效，只能白名单。

```kotlin
// 错：排序字段直接拼进 SQL
@Query(value = "select * from orders order by :sort :dir", nativeQuery = true)
fun list(sort: String, dir: String): List<Order>

// 对：字段名走映射表，值走参数绑定
private val sortable = mapOf(
    "created" to "created_at",
    "amount" to "amount",
    "status" to "status",
)

fun list(sortKey: String, asc: Boolean): List<Order> {
    val column = sortable[sortKey] ?: throw InvalidSortKey(sortKey)
    val direction = if (asc) "asc" else "desc"
    return jdbc.sql("select * from orders order by $column $direction")   // 只拼白名单里的常量
        .query(Order::class.java)
        .list()
}
```

要点：

- **JPQL 的 `:#{#param}` 仍是参数绑定**，不是注入点；但 `@Query(value = "... where name = '" + name + "'")` 是。
- **`LIKE` 要转义**。用户输入 `%` 会让查询全表扫描（性能问题），输入 `_` 会扩大匹配范围；拼进 `like '%' || :kw || '%'` 时值本身安全，但语义要按业务决定是否转义。
- **`Sort.unsafe(...)` 是危险 API**。它允许把任意字符串当属性路径拼进排序，等于把 `ORDER BY` 注入点交给调用方。禁止在请求参数直通的位置使用。
- **原生 SQL 是绕过一切 ORM 保护的地方**。多租户的 `@Filter`、软删条件在这里全部失效（第 04 册）。

## 5. SSRF：出站请求也要白名单

当 URL 来自用户（webhook、图片抓取、网页预览、PDF 渲染），攻击者可以让你的服务器替他访问内网：云元数据 `169.254.169.254`、`127.0.0.1` 上的管理端口、内网 Redis、甚至 `file://` 与 `gopher://`。

```kotlin
// 对：协议白名单 + 解析后校验 IP + 禁止重定向
fun assertAllowed(url: URI) {
    require(url.scheme in setOf("http", "https")) { "scheme not allowed" }
    require(url.host in allowedHosts) { "host not allowed" }

    val addresses = InetAddress.getAllByName(url.host)
    require(addresses.all { it.isPublic() }) { "private address blocked" }
}

fun InetAddress.isPublic(): Boolean =
    !(isLoopbackAddress || isSiteLocalAddress || isLinkLocalAddress ||
        isAnyLocalAddress || isMulticastAddress ||
        // 云元数据与 CGNAT
        hostAddress.startsWith("169.254.") || hostAddress.startsWith("100.64."))
```

**为什么只校验 URL 字符串不够**：DNS rebinding——第一次解析返回公网 IP 通过校验，实际连接时解析到 `127.0.0.1`。所以校验必须发生在**建立连接的那一刻**，或者把出口收窄：只允许访问固定白名单域名，且这些域名解析到你控制的地址。

**工程上的正解是网络层**：给需要出站的组件单独的子网/出口代理，在代理上做域名白名单与私网段拦截，应用层再做一次协议与 host 校验。只靠应用层字符串校验，迟早被编码绕过（`0x7f000001`、`[::1]`、十进制 IP、重定向跳转）。

## 6. 反序列化：别让数据决定类型

Java 原生序列化（`ObjectInputStream.readObject`）是历史上最稳定的 RCE 入口之一：payload 里带着类名，反序列化过程中就能触发 gadget 链。规矩只有一条：**不可信数据永远不要走原生反序列化**。

Jackson 侧的对应风险是「多态类型信息」：

- `activateDefaultTyping(...)` 让 payload 用 `@class` 指定具体类，等于把类加载权交给请求方；
- `@JsonTypeInfo(use = Id.CLASS)` 同理；
- 需要多态时，用 `Id.NAME` + 显式 `@JsonSubTypes` 白名单，别用 `Id.CLASS`。

**兜底**：即便不用原生序列化，也建议给 JVM 配 `jdk.serialFilter`（或在反序列化点用 `ObjectInputFilter`），把可反序列化的类限制在极小集合。这条兜底在引入第三方 SDK 时尤其有价值——你控制不了它们内部用什么。

**为什么它在微服务里反而更危险**：服务间的消息体、缓存值、RPC payload 常常是「内部数据」，团队默认它可信，于是放心地用 `ObjectInputStream` 或开启默认类型信息。一旦某个上游服务被拿下、或者有人能写一条消息进队列，整条链路都成了执行面。内部流量的信任假设，正是这类漏洞的放大器。

## 7. 路径穿越：规范化之后校验前缀

上传和下载是穿越漏洞的两个高发点。攻击载荷包括 `../../etc/passwd`、`..%2f`、`..\`（Windows）、绝对路径、以及 NUL 截断。

```kotlin
// 错：用客户端文件名拼路径
val target = Paths.get(uploadDir, file.originalFilename)

// 对：服务端生成文件名，规范化后校验前缀
fun store(file: MultipartFile): StoredFile {
    val ext = file.originalFilename?.substringAfterLast('.', "")?.lowercase()
    require(ext in setOf("png", "jpg", "pdf")) { "extension not allowed" }

    val base = Paths.get(uploadDir).toAbsolutePath().normalize()
    val target = base.resolve("${UUID.randomUUID()}.$ext").normalize()
    require(target.startsWith(base)) { "path traversal detected" }   // Path.startsWith，不是字符串比较

    file.inputStream.use { it.copyTo(Files.newOutputStream(target, CREATE_NEW)) }
    return StoredFile(id = target.fileName.toString())
}
```

三个细节：

- **不要用客户端文件名做任何路径的一部分**。它只用于展示，而且要转义。
- **用 `Path.startsWith` 而不是 `String.startsWith`**。字符串比较下 `/data/foo` 会「匹配」`/data/foobar`。
- **扩展名白名单不等于内容校验**。真正的类型判断要看文件头（magic number），并且上传目录不允许执行、不在 web 根目录下、下载走单独的接口。

## 8. 安全响应头

Spring Security 的 `headers { }` 已经默认开启了一部分（`nosniff`、`X-Frame-Options: DENY`、缓存控制），但 HSTS 与 CSP 需要显式配置：

```kotlin
http {
    headers {
        httpStrictTransportSecurity {
            maxAgeInSeconds = 31_536_000       // 一年；先小后大，别一上来就 preload
            includeSubDomains = true
            preload = false
        }
        contentTypeOptions { }
        referrerPolicy { policy = ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN }
        frameOptions { sameOrigin = false }    // 交给 CSP 的 frame-ancestors 统一管
        contentSecurityPolicy { policyDirectives = "default-src 'self'; object-src 'none'" }
    }
}
```

| 头 | 挡住什么 | 注意 |
|---|---|---|
| `Strict-Transport-Security` | 降级到 HTTP、SSL stripping | 只在 HTTPS 响应上有意义；`preload` 不可逆 |
| `Content-Security-Policy` | 注入脚本执行、外链资源 | `unsafe-inline` 会废掉大半 |
| `X-Content-Type-Options: nosniff` | MIME 嗅探导致的 HTML 解析 | 必须配合正确的 `Content-Type` |
| `Referrer-Policy` | URL 里的敏感参数外泄 | 默认值会带完整路径 |
| `X-Frame-Options` / `frame-ancestors` | 点击劫持 | 两者选一，别配冲突 |
| `Permissions-Policy` | 摄像头/定位等能力被滥用 | 按需关闭，不要全关 |

**坑**：HSTS 一旦下发，浏览器在 `max-age` 内**拒绝**用 HTTP 访问该域，包括子域（若开了 `includeSubDomains`）。先在测试域用小 `max-age`（如 300 秒）验证，再逐步加大。

## 9. 总表：我配了什么，挡住什么

| 我配了什么 | 挡住什么 | 挡不住什么 |
|---|---|---|
| `csrf { }`（默认开） | 跨站表单提交、Cookie 会话滥用 | XSS 发起的同源请求 |
| `csrf { disable() }` + 纯 Bearer | —（前提是确实无 Cookie） | 一旦有 Cookie 兜底，全部 CSRF |
| CORS 精确白名单 + `allowCredentials` | 任意站点读取响应 | 服务端之间的直接调用 |
| CSP（无 `unsafe-inline`） | 注入脚本执行、外链加载 | 已经存在于服务端的恶意数据 |
| `nosniff` + 正确 `Content-Type` | MIME 嗅探型 XSS | 前端 `innerHTML` 造成的 DOM XSS |
| 参数化查询 | 值注入 | `ORDER BY`/列名注入 |
| 排序/列名白名单 | 结构注入 | 白名单本身写漏 |
| SSRF host 白名单 + 私网拦截 | 元数据、内网探测 | DNS rebinding（除非连接时校验） |
| 禁用原生序列化 + 关闭默认类型信息 | gadget 链 RCE | 业务层的逻辑漏洞 |
| 服务端生成文件名 + `Path.startsWith` | 路径穿越 | 上传内容本身的恶意性 |
| HSTS + CSP + `nosniff` | 降级、注入、嗅探 | 服务端返回的业务数据泄露 |

这张表的用法：做安全评审时逐行问「这一行我配了吗、配在哪一层」，比笼统地问「我们安全吗」有效得多。

## 10. 自测

1. CSRF 成立的三个条件是什么？纯 Bearer 的无状态 API 为什么可以关掉它？关掉之后还该保留哪些替代措施？
2. `allowedOriginPatterns("*")` 配 `allowCredentials(true)` 会发生什么？为什么它比 `allowedOrigins("*")` 更危险？
3. 为什么说「正确的 `Content-Type` + `nosniff`」比输出转义更靠前？举一个头写错导致注入生效的场景。
4. `ORDER BY` 为什么不能用参数绑定？给出两种可行的白名单实现方式。
5. 只校验 URL 字符串里的 host，为什么挡不住 SSRF？DNS rebinding 的绕过路径是什么？
6. `Path.startsWith` 与 `String.startsWith` 在路径校验上的差别？各举一个绕过例子。

## 11. 延伸

- 上一册：[05-授权落地与多租户数据隔离](05-授权落地与多租户数据隔离.md)——注入类漏洞会让「加了 where 条件」这件事本身失效。
- 下一册：[07-口令哈希-密钥管理与字段加密](07-口令哈希-密钥管理与字段加密.md)——本册讲「输入」，下一册讲「凭证与密钥」。
- 安全响应头的浏览器侧语义（CSP 报告、SameSite、混合内容）在[浏览器站第四阶段 05 册](https://yidafu.github.io/tech-learning/browser/docs/第四阶段/请求语义-协商-Cookie-条件请求与Range)。
- 攻击原理与利用链（SQL 注入、SSRF 的完整打法）归[安全站](https://yidafu.github.io/tech-learning/security/)，本册只讲防线。
- 错误信息如何在不泄露 SQL 与堆栈的前提下保留可排查性，见本阶段 [08 册](08-审计-依赖漏洞与安全响应头.md)。
