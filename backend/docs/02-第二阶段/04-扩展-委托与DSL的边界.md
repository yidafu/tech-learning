---
sources:
  - 02-第二阶段
---

# 04. 扩展、委托与 DSL 的边界

> [← 第二阶段导览](01-导览.md) · 这三个特性是 Kotlin 最容易被滥用的地方：扩展函数看着像方法但不是方法，委托看着像语法但藏着状态与副作用，DSL 看着像配置语言但本质是一串 builder 调用。本册的结论是——**它们都适合「减少噪音」，不适合「承载业务抽象」**。

## 1. 扩展函数编译后是一个静态方法

```kotlin
// 源文件：Strings.kt
fun String.shout(): String = uppercase() + "!"

// 编译产物（概念上）：
// public static final String shout(String $this$shout) {
//     return $this$shout.toUpperCase() + "!";
// }
// 外层类名：StringsKt
```

三件事从这段对照里直接读出来：

1. **接收者是第一个参数**。所以扩展函数里没有 `this` 的隐式对象身份，只有「一个普通参数」；它不能访问接收者的 `private`/`protected` 成员（编译期就不允许，不是运行时限制）。
2. **调用是静态绑定**。`str.shout()` 编译成 `StringsKt.shout(str)`，方法解析在编译期完成，运行期没有虚分派。
3. **Java 侧看到的是静态工具方法**。`StringsKt.shout("hi")`，没有「给 String 加了个方法」这回事。这也意味着注解处理器、AOP、反射都看不到「方法属于 String」。

有一类特例值得知道：**成员扩展**（声明在类内部的扩展函数）既不是纯静态方法，也不是可覆写方法。它编译成外层类的成员方法，接收者仍是第一个参数，同时能访问外层类的成员——所以它常被用来在类内部做「只在当前上下文有意义」的语法糖。但它依然**不能被覆写**。

## 2. 静态解析的三个后果

### 2.1 不参与多态

```kotlin
open class Animal
class Dog : Animal()

fun Animal.speak() = "animal"
fun Dog.speak() = "dog"

fun main() {
    val a: Animal = Dog()
    println(a.speak())   // animal —— 看的是变量的静态类型
}
```

如果 `speak` 是成员函数，输出是 `dog`（虚分派看实际类型）；扩展函数看**声明类型**。这条规则在团队里造成的经典 bug 是：给 `List` 写扩展、给 `ArrayList` 又写一个，调用方拿到的是 `List` 引用，永远走第一个。

### 2.2 成员函数永远优先

即使扩展的签名更「贴」，只要接收者类型上有同名同签名的成员，成员赢。更隐蔽的是**版本演进**：你给第三方类型写了 `fun Foo.bar()`，某天库升级加了成员 `bar()`，你的扩展会被静默遮蔽——不报错，行为变了。

```kotlin
class Repo {
    fun find(id: String): String = "member"
}
fun Repo.find(id: String): String = "extension"   // 永远调不到（IDE 会提示 shadowed）

fun main() = println(Repo().find("1"))            // member
```

### 2.3 无法被代理、无法被 mock、无法被拦截

Spring 的 `@Transactional`、`@Cacheable` 都靠代理拦截**方法调用**。扩展函数是静态方法调用，代理对象上根本不存在这个方法，注解写上去也不会生效——不是「有时不生效」，是结构上不可能生效。同理，`mockk` 对扩展函数只能 `mockkStatic`，测试会变脆。

| 维度 | 成员函数 | 扩展函数 |
|---|---|---|
| 编译产物 | 类的方法 | 静态方法（接收者为第一参数） |
| 分派 | 虚分派（可覆写） | 静态解析（看声明类型） |
| 能否访问私有成员 | 能 | 不能 |
| 同名冲突 | 成员优先 | 被成员遮蔽 |
| Spring AOP | 可代理 | 不可代理 |
| Java 视角 | 实例方法 | `XxxKt.method(receiver)` |
| 适合 | 类型自身的行为 | 只读便利方法、工具函数、DSL 辅助 |

**结论**：扩展函数适合「给已有类型加一个不改变语义的只读便利方法」（`fun Instant.toIso(): String`），或者给第三方类型补一个转换（`fun OrderEntity.toDomain(): Order`）。它不适合承载业务规则——业务规则需要被替换、被代理、被测试替换，而扩展函数三样都做不到。

一个常被忽略的合法用法：**可空接收者上的扩展**。

```kotlin
fun String?.orDash(): String = this?.takeIf { it.isNotBlank() } ?: "-"
```

它比在 20 个调用点写 `x ?: "-"` 更一致，也没有多态需求。这类「纯函数 + 可空接收者」是扩展函数最舒服的区间。

## 3. 委托属性：`lazy`、`observable`、`vetoable` 与自定义

`by` 把属性的读写转发给一个委托对象，编译后不再有字段，而是 `getValue`/`setValue` 调用。

```kotlin
class ReportService {
    // 重量级初始化：只有真正用到才建
    val engine: Engine by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { Engine.bootstrap() }

    // 配置变更留痕
    var threshold: Int by Delegates.observable(100) { _, old, new ->
        log.info("threshold {} -> {}", old, new)
    }

    // 拒绝非法变更：返回 false 即放弃写入
    var maxRetry: Int by Delegates.vetoable(3) { _, _, new -> new in 1..10 }
}
```

`lazy` 的三个模式与坑：

| 模式 | 语义 | 代价 | 适用 |
|---|---|---|---|
| `SYNCHRONIZED`（默认） | 双检锁，只初始化一次 | 每次读一次 volatile 读 | 单例、启动期不确定的依赖 |
| `PUBLICATION` | 并发时可能初始化多次，取最先完成者 | 可能重复执行初始化 | 初始化幂等且昂贵 |
| `NONE` | 无同步 | 多线程下可能看到半初始化对象 | 确定单线程 |

**最值得记住的坑：`lazy` 不缓存失败**。初始化抛异常时，下一次访问会**重新执行初始化**。在 Spring 单例 Bean 里，这意味着一台已经处于异常状态的机器会在每个请求上重试一次昂贵初始化，并且每次都打一条同样的错误日志——看起来像「无限重试」，实际是 `lazy` 的语义。

`observable` 与 `vetoable` 的边界很清楚：**它们只适合「状态变更本身是关注点」的地方**，比如配置热更新、审计留痕。放到领域对象上就是灾难——`order.status = Paid` 触发三处日志、一次消息发送，读代码的人完全看不出这行赋值有副作用。领域对象的状态迁移应该是显式方法（`order.pay(...)`），不是属性的 setter。

自定义委托实现 `ReadWriteProperty` 即可，典型场景是「从外部源读、写回外部源」：

```kotlin
class EnvDelegate<T>(
    private val env: Environment,
    private val key: String,
    private val default: T,
    private val parse: (String) -> T,
) : ReadWriteProperty<Any?, T> {
    private var cached: T? = null

    override fun getValue(thisRef: Any?, property: KProperty<*>): T =
        cached ?: env.getProperty(key)?.let(parse)?.also { cached = it } ?: default

    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        cached = value
    }
}
```

它把「配置读取 + 缓存 + 默认值」收敛到一处，调用点只剩 `val timeout by EnvDelegate(env, "app.timeout", 3) { it.toInt() }`。代价是**属性的值不再由类自己决定**，调试时看不到字段，只能看委托。用之前问一句：这个间接层换来的复用，值不值一次「这个值哪来的」的困惑。

## 4. 类型安全 DSL 的三个要素

一个能读的 DSL 只需要三样东西：**接收者 lambda**、**`@DslMarker`**、**`invoke` 操作符**。

```kotlin
@DslMarker
annotation class QueryDslMarker

@QueryDslMarker
class WhereClause {
    private val conditions = mutableListOf<String>()
    private val params = mutableListOf<Any>()

    // 只示意结构：真实实现要把参数收集起来交给 PreparedStatement
    fun eq(column: String, value: Any) {
        conditions += "$column = ?"
        params += value
    }

    fun and(block: WhereClause.() -> Unit) {
        val nested = WhereClause().apply(block).render()
        if (nested.isNotEmpty()) conditions += "($nested)"
    }

    fun render(): String = conditions.joinToString(" AND ")
    fun bindings(): List<Any> = params
}

@QueryDslMarker
class Query {
    private var where: WhereClause? = null
    fun where(block: WhereClause.() -> Unit) { where = WhereClause().apply(block) }
    fun render(): String = "SELECT * FROM t" + (where?.let { " WHERE ${it.render()}" } ?: "")
}

fun query(block: Query.() -> Unit): String = Query().apply(block).render()

// 有了 invoke，对象本身就能当构建入口
operator fun Query.invoke(block: Query.() -> Unit): String = apply(block).render()

val sql = Query() { where { eq("id", 1) } }   // 等价于 query { ... }
```

三要素各自解决一个具体问题：

1. **接收者**让 `eq("id", 1)` 不用写 `where.eq(...)`，噪音消失；
2. **`@DslMarker`** 阻止「在 `and { }` 里调用外层的 `eq`」——没有它，嵌套 lambda 里的隐式接收者有多个，编译器会选最近的那个，于是「写在外层还是内层」变成靠缩进猜。加了 marker 后，跨层调用直接编译错误；
3. **`invoke`** 让对象本身可调用：`validator { }` 而不是 `validator.apply { }`。Spring Security 的 `http { }` 就是 `operator fun HttpSecurity.invoke(...)`。

**代价必须说清**：

- **控制流不直观**。DSL 里写 `if`/`for` 是合法的，但读的人分不清「这是配置的一部分」还是「构建时的控制流」；一旦有人在 DSL 里写 `list.forEach { ... }`，这段配置就有了顺序依赖。
- **错误信息变差**。漏写一个必填项，报错点通常在 DSL 构建完成的最后一行（`build()`），而不是你漏写的那一行。
- **跳转失效**。IDE 对 `eq(...)` 的跳转要经过接收者推断，遇到重载或泛型时经常跳错；新人读代码只能靠猜。
- **隐式状态**。DSL 对象通常可变，构建顺序影响结果；并发构建同一个 DSL 对象是未定义行为。

判断标准很简单：**如果这段 DSL 只有作者本人读得懂，它就已经是负债了**。DSL 的收益是「让配置看起来像声明」，代价是「调试时多一层心智」。团队没有共识时，普通 builder + 命名参数是更好的选择。

## 5. Spring 里的三个真实 DSL：谁在调用谁

读框架 DSL 的价值不在于会写，而在于知道**它最终落到哪个 Java API**——出问题时能退回文档和源码，而不是在 lambda 里瞎试。

### 5.1 `beans { }`：构造 `BeanDefinition` 的 builder

```kotlin
val ctx = GenericApplicationContext().apply {
    beans {
        bean<OrderService>()                     // 按类型注册，构造器推断依赖
        bean("orderRepo") { OrderRepo(ref()) }   // ref() 延迟解析另一个 bean
    }.initialize(this)
}
```

调用链：你的 lambda → `BeanDefinitionDsl.bean(...)` 记录一个 `BeanSupplier` → `initialize(registry)` 遍历并 `registry.registerBeanDefinition(...)` → 容器 `getBean` 时执行 supplier → supplier 里的 `ref()` 再向容器要依赖。

关键点：**`ref()` 是在 Bean 创建时解析的，不是 DSL 求值时**。这解决了「声明顺序」问题，也意味着循环依赖仍然会在运行期暴露——DSL 只是把注册写得像配置，没有改变容器的生命周期。另一个细节：`bean<T>()` 默认走构造器推断，和 `@Component` 扫描的规则不完全一样，混用时最容易出现「扫描到的 Bean 覆盖了 DSL 注册的 Bean」。

### 5.2 `router { }`：构建 `RouterFunction`，不负责调度

```kotlin
@Bean
fun orderRoutes(handler: OrderHandler) = router {
    "/api/orders".nest {
        GET("/{id}", handler::get)
        POST("", handler::create)
    }
}
```

调用链：`router { }` 返回一个 `RouterFunction<ServerResponse>`；运行期由 `RouterFunctionMapping` 拿到它，`DispatcherServlet` 请求进来后遍历 `RouterFunction`，`RequestPredicate.test(request)` 匹配成功就调用 `HandlerFunction.handle(request)`。

所以 DSL 只做了两件事：把路径前缀拼成 `RequestPredicate`，把 handler 包成 `HandlerFunction`。**同一个 `router { }` 内部，先声明的先匹配，没有「更具体的模式优先」**；多个 `RouterFunction` Bean 之间靠 `@Order` 排序。声明顺序反了，`GET("/{id}")` 就会把 `/orders/summary` 也吃掉——这类 bug 在函数式端点里比注解式端点更容易出现，因为注解式端点至少还有一套模式比较规则兜底。

### 5.3 Security 的 `http { }`：`invoke` 把 `HttpSecurity` 变成可调用对象

```kotlin
@Bean
fun filterChain(http: HttpSecurity): SecurityFilterChain {
    http {
        csrf { disable() }
        authorizeHttpRequests {
            authorize("/actuator/health", permitAll)
            authorize(anyRequest, authenticated)
        }
        httpBasic { }
    }
    return http.build()
}
```

这里能用的语法糖全部来自 `operator fun HttpSecurity.invoke(block: HttpSecurity.() -> Unit)`。`authorizeHttpRequests { }` 是 Kotlin 对 Java 的 `authorizeHttpRequests(Customizer)` 的适配——lambda 被包成 `Customizer`；`authorize("/path", permitAll)` 是 `AuthorizeHttpRequestsConfigurer` 上的扩展函数加重载。

关键点：**括号形式的方法调用与 DSL 形式一一对应**。`http.authorizeHttpRequests { }` 与 `http { authorizeHttpRequests { } }` 是同一件事，只是后者把接收者提到了外层。知道这一点，任何 DSL 写不出来的配置都能用 Java 形式补上：

```kotlin
http.authorizeHttpRequests { auth ->
    auth.requestMatchers("/internal/**").denyAll()
}
```

最后一行值得记住：**DSL 不是另一套 API，它只是同一套 API 的另一种调用姿势**。看不懂 DSL 时，用 Java 形式写一遍，再对照文档，问题通常立刻消失。

## 6. 什么时候不该写 DSL

| 信号 | 说明 | 替代方案 |
|---|---|---|
| 只有一个调用点 | 抽象的成本收不回来 | 直接写代码 / 命名参数 |
| 需要 `if`/`for` 决定结构 | DSL 变成「用 lambda 写的程序」 | 普通 builder + 显式方法 |
| 漏填必填项报错在最后一行 | 错误定位成本高 | 构造器 + `require`（02 册） |
| 团队里只有作者会读 | 维护者变成单点 | 命名参数 + 默认值 |
| 需要被代理/被 mock | DSL 构建出的对象通常不可替换 | 接口 + 实现类 |
| 只是「少写两个点」 | 收益是打字量，不是表达力 | 扩展函数或工具方法 |

反面例子是「业务规则 DSL」：把折扣规则写成 `discount { if (user.vip) 0.9 else 1.0 }`，读起来像配置，实际是代码；测试要构造 DSL 上下文，调试要进 lambda，改一条规则要动构建逻辑。这种场景用策略模式或数据表驱动，比 DSL 好一个数量级。

**DSL 的正当用途只有一类：把一个已经很成熟的 Java builder API 包得更像声明**。Gradle、Spring、Ktor 都是这样——底层 API 先稳定了几年，DSL 才出现。反过来「先设计 DSL 再想 API」几乎必然返工。

## 7. 自测

1. `fun String.shout()` 编译后在哪个类里？Java 调用它要写什么？为什么它不能访问 `String` 的私有成员？
2. 成员扩展（写在类内部的扩展函数）能访问外层类的私有成员吗？能被覆写吗？它编译成静态方法还是成员方法？
3. 你给第三方库的类型写了扩展 `fun Foo.bar()`，库升级后加了成员 `bar()`。会发生什么？怎么提前发现？
4. `by lazy` 的初始化块抛异常后，第二次访问会怎样？这在 Spring 单例里会导致什么现象？
5. `@DslMarker` 解决的具体问题是什么？去掉它，`where { eq("a", 1); and { eq("b", 2) } }` 这段代码会编译通过但语义错误吗？
6. Security 的 `http { }` 里 `authorizeHttpRequests { }` 最终调用的是哪个 Java 方法？如果你想配一个 DSL 没暴露的选项，怎么办？

## 8. 延伸

- 上一册：[03-类型系统进阶](03-类型系统进阶.md)——`sealed` + 穷尽 `when` 是「用类型表达分支」，DSL 是「用语法表达结构」，两者常被混用，边界在本册第 6 节。
- 下一册：[05-协程基础-suspend与结构化并发](05-协程基础-suspend与结构化并发.md)——`suspend` 函数同样是「编译期改写」，理解扩展函数的静态解析有助于看懂 `suspend` 的 CPS 变换。
- Spring 的 Kotlin DSL 在配置层的完整体现（`@ConfigurationProperties`、`beans { }` 与扫描的优先级），见[06-Kotlin与Spring的接缝-allopen-noarg与DSL配置](06-Kotlin与Spring的接缝-allopen-noarg与DSL配置.md)。
