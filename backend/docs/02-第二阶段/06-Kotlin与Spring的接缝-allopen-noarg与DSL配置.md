---
sources:
  - 02-第二阶段
---

# 06. Kotlin 与 Spring 的接缝：allopen、noarg 与 DSL 配置

> [← 第二阶段导览](01-导览.md) · Spring 是围绕 Java 的反射与继承设计的：它要代理你的类、要反射实例化你的实体、要按参数名绑定配置。Kotlin 默认 `final`、默认没有无参构造、默认把注解挂在参数上——这三条默认值就是本册要处理的三处接缝。

## 1. 为什么需要 `allopen` 与 `noarg`

Kotlin 的类和方法默认是 `final` 的（Effective Java 的建议，语言层面直接执行）。Spring 的两大机制都要求「可继承」：

- **CGLIB 代理**：`@Transactional`、`@Async`、`@Cacheable`、`@Configuration` 的增强，都是在运行期生成一个子类来拦截方法调用。类是 `final` 就生成不了子类，方法是 `final` 就覆写不了；
- **JPA 实体**：Hibernate 用反射 + 无参构造器实例化实体（`Class.newInstance()` 时代留下的设计），Kotlin 类的主构造器要求全部参数，没有无参版本。

手工给每个类加 `open` 不是不行，而是不可持续：漏一个就是一个运行期故障，而故障信息通常不指向「你忘了 open」。所以官方提供了两个编译器插件：

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.2.20"
    kotlin("plugin.spring") version "2.2.20"   // all-open + Spring 注解预设
    kotlin("plugin.jpa") version "2.2.20"      // no-arg + JPA 注解预设
}
```

`kotlin-spring` 等于「all-open + 一份注解清单」：被 `@Component`、`@Configuration`、`@Service`、`@Repository`、`@Controller`、`@RestController`、`@ControllerAdvice`、`@Transactional`、`@Async`、`@Cacheable`、`@SpringBootTest` 等标注的类会自动 `open`，其成员方法也随之 `open`。

`kotlin-jpa` 等于「no-arg + 一份注解清单」：被 `@Entity`、`@Embeddable`、`@MappedSuperclass` 标注的类会生成一个合成的无参构造器（仅反射可见，Kotlin 代码里调不到）。

**关键取舍：插件是按注解白名单工作的**。你自己写的自定义注解、或者某个第三方注解不在清单里，就不会被 open。两种补法：

```kotlin
// 补注解到预设
allOpen {
    annotation("com.example.MyProxyable")
}

// 或者关掉预设，只留自己的清单（不推荐，容易漏）
noArg {
    annotation("com.example.MyEntity")
}
```

`allOpen`/`noArg` 是 `kotlin-maven-plugin`/Gradle 插件里的 DSL（`kotlin("plugin.spring")` 会自动应用 all-open 并加入预设）。用 `noArg` 时还要注意 `invokeInitializers = true` 只在部分场景需要（它会让合成构造器执行 `init` 块，JPA 通常不需要）。

## 2. 不加插件时的两种报错长什么样

第一种，代理失败——通常发生在启动期或第一次调用被代理方法时：

```text
java.lang.IllegalArgumentException: Cannot subclass final class com.example.order.OrderService
    at org.springframework.cglib.proxy.Enhancer.generateClass(Enhancer.java:...)
    at org.springframework.aop.framework.CglibAopProxy.createProxyClassAndInstance(...)
```

Spring 6/7 的报错文本比老版本友好一些，会提示「class is final」，但**根因仍然不会写「你缺 kotlin-spring 插件」**。看到 `Cannot subclass final class` 就去查两件事：类是不是 Kotlin 且没 open；注解是不是不在预设清单里。

第二种，实体实例化失败——通常在查询返回结果、或者容器启动校验映射时：

```text
org.hibernate.InstantiationException: No default constructor for entity : com.example.order.OrderEntity
    at org.hibernate.metamodel.internal.EntityInstantiatorPojoStandard...
```

还有一种更隐蔽的情况：**你写的是 `@Configuration(proxyBeanMethods = false)`，或者干脆用 `@Component` 代替 `@Configuration`**。这两种写法不需要增强配置类，final 不会在这里报错，「Kotlin 不需要 allopen」的错觉能维持很久。但同一个类上只要有 `@Transactional`/`@Async`，代理仍然需要子类，问题会换一个注解爆发——而且那时你早就不记得是插件没加了。

| 现象 | 直接原因 | 根因 | 修法 |
|---|---|---|---|
| `Cannot subclass final class` | CGLIB 无法生成子类 | 类/方法 final 且未 open | 加 `kotlin-spring`，或确认注解在清单里 |
| `No default constructor for entity` | Hibernate 反射实例化失败 | Kotlin 主构造器无默认值 | 加 `kotlin-jpa`，或给实体写 `protected` 无参构造 |
| `@Transactional` 静默不生效 | 方法 final，代理没覆写成功 | 同上 | 同上；用日志/断点确认代理类型 |
| `@Configuration` 里 `@Bean` 互相调用返回新对象 | 未增强，方法被直接调用 | `proxyBeanMethods` 与 final | 加插件，或改构造器注入 |

## 3. 实体为什么不能用 `data class`

`data class` 会生成 `equals`/`hashCode`/`toString`/`copy`/`componentN`，这五件在 JPA 实体上**四处会坏**：

**其一，`equals`/`hashCode` 基于全部字段。** 两个刚 `new` 出来、id 还是 null 的实体，字段全相同，于是相等——在 `Set` 里会被去重。实体一旦被修改（比如 `status` 变了），`hashCode` 变化，它从 `HashSet` 里「消失」。Hibernate 的持久化上下文、二级缓存都依赖稳定的 `hashCode`。

**其二，`copy` 产生游离对象。** `entity.copy(id = null)` 看着像「克隆一个新实体」，实际是一个不受持久化上下文管理的游离副本：`save(copy)` 走的是 `merge` 而不是 `persist`，可能产生意外的新行；关联集合还是共享引用，改一处两边都变。更要命的是它**绕过了 Hibernate 的脏检查**——副本上的修改不会被自动 flush。

**其三，懒加载代理。** Hibernate 返回的可能是实体的子类代理。`data class` 生成的 `equals` 会读取全部字段，读字段就触发初始化；在 session 关闭后读就抛 `LazyInitializationException`。代理的 `equals`/`hashCode` 本来由 Hibernate 拦截（同 session 内委托给实体，跨 session 按标识符），`data class` 强行读字段会把这套机制搅乱——最典型的症状是「同一个实体和它的代理放进一个 `Set`，被当成两个元素」。

**其四，`toString` 也是全字段。** 双向关联（`Order.lines` 与 `OrderLine.order`）会互相递归，日志里直接 `StackOverflowError`；即使不递归，`toString` 触发懒加载也会在日志埋点里制造 N+1；敏感字段（手机号、金额）还会被顺手打进日志。

所以实体的正确写法是普通类 + 手写相等语义：

```kotlin
@Entity
class Order(
    @Id
    @GeneratedValue
    var id: Long? = null,      // 生成值需要可变属性（或字段访问）
) {
    // 业务字段略

    // 按业务键或 id 比较；id 为 null（尚未持久化）时退化为引用相等
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Order) return false
        return id != null && id == other.id
    }

    override fun hashCode(): Int = javaClass.hashCode()   // 稳定，不随字段变

    override fun toString(): String = "Order(id=$id)"
}
```

`hashCode` 返回 `javaClass.hashCode()` 是 Hibernate 社区常用的折中：同一类型的所有实例哈希相同，`HashSet` 退化成链表，但**不会因为 id 从 null 变成有值而丢元素**。代价有两个：大量实体放进 `Set` 时性能差；Hibernate 代理的 `javaClass` 与实体不是同一个类，代理和实体的哈希值仍会不同。所以还要加一条团队约定：**未持久化的实体不要放进 `Set`，也不要跨 session 比较实体**。这是 JPA 实体相等性的固有难题，没有零代价的解法。

## 4. `@ConfigurationProperties`：构造器绑定 + `@Validated`

```kotlin
@ConfigurationProperties("app.payment")
@Validated
data class PaymentProperties(
    @field:NotBlank val endpoint: String,
    @field:Min(1) val timeoutSeconds: Long = 3,
    @field:Min(0) @field:Max(5) val retries: Int = 0,
    val callbackUrl: String? = null,
)
```

四个细节决定了它能不能在启动期替你挡住错误配置：

1. **构造器绑定是默认**。只有一个构造器时不需要 `@ConstructorBinding`（Boot 3 起已不需要，Boot 4 沿用）。多构造器时才要显式标注；
2. **`@field:` 前缀不能省**。Kotlin 把注解默认挂在构造器参数上，而 Bean Validation 读的是字段或 getter。写 `@NotBlank` 会导致校验静默不生效——这是 Kotlin + Validation 最高频的坑；
3. **`@Validated` 让失败发生在启动期**。配置缺失或越界 → `ConfigurationPropertiesBindException`，应用起不来。这正是我们要的 fail-fast：比运行到第一笔支付才发现 `endpoint` 是空串好得多；
4. **默认值要显式**。Kotlin 参数默认值在绑定器里不一定按你预期生效（嵌套对象、`value class` 属性上尤其容易失手），团队约定是：要么 `application.yml` 里写全，要么用 `@DefaultValue` 显式声明，要么在 `init` 里兜底。三选一，别让「它应该会用默认值」变成假设。

`@ConfigurationProperties` 与 `@Value` 的分水岭是「一组配置」和「一个值」：三个以上相关配置项、需要校验、需要 IDE 补全、需要 relaxed binding（`timeout-seconds` / `TIMEOUT_SECONDS` / `timeoutSeconds` 都能绑），就用前者。`@Value("${app.payment.timeout:3}")` 的默认值语法在 Kotlin 里还会和字符串模板的 `$` 打架，能不用就不用。

**注册方式**：`@EnableConfigurationProperties(PaymentProperties::class)` 或 `@ConfigurationPropertiesScan`。后者会扫描启动类所在包，适合配置类较多的项目；前者显式，启动更快，也不容易扫到测试夹具里的配置类。

## 5. Jackson 3 的 Kotlin 模块：空安全与默认值

Jackson 通过反射看构造器，Kotlin 的非空与默认值是编译器特性，反射看不见。`jackson-module-kotlin` 的作用就是补上这层信息（Jackson 3 的坐标在 `tools.jackson.module:jackson-module-kotlin`）。

```kotlin
@Configuration
class JacksonConfig {
    @Bean
    fun jsonMapper(): JsonMapper = JsonMapper.builder()
        .addModule(KotlinModule.Builder().build())
        .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
        .build()
}

data class CreateOrderRequest(
    val sku: String,                       // 非空
    val quantity: Int = 1,                 // 有默认值
    val note: String? = null,              // 可空
)
```

装上模块后，三个行为才成立：

| 输入 | 没有 Kotlin 模块 | 有 Kotlin 模块 |
|---|---|---|
| 缺 `sku` 字段 | 传 `null` 进非空参数（运行期才炸） | 抛 `MismatchedInputException`，400 |
| 缺 `quantity` 字段 | 基本类型给 0 | 用 Kotlin 默认值 1 |
| JSON 里 `quantity: null` | 基本类型给 0（静默） | 默认仍给 0；开 `FAIL_ON_NULL_FOR_PRIMITIVES` 才报错 |
| 参数名与 JSON 名不同 | 需要 `@JsonProperty` | 仍需 `@JsonProperty`（名字不同没法猜） |
| `@JsonCreator` | 需要 | 单构造器不需要 |

第三行是很多人栽过的坑：**Kotlin 的非空 `Int` 在字节码里是 Java 的 `int`，`null` 会被静默转成 0**，空安全在这里断链。要么开 `FAIL_ON_NULL_FOR_PRIMITIVES`，要么把「0 是合法值」的字段改成 `Int?` 显式表达。

还有两条：

- **注解目标**：`@JsonProperty` 挂在构造器参数上 Jackson 能识别；`@JsonIgnore`、`@field:` 之类的组合要按目标写，序列化与反序列化方向可能不一致（`@get:` vs `@param:`）；
- **`value class`**：见 03 册，Jackson 默认会包一层对象，需要 `@get:JsonValue` 与自定义反序列化。

Jackson 3 的异常体系也变了：`JacksonException` 不再受检，`ObjectMapper` 换成 `JsonMapper`，`com.fasterxml.jackson` 坐标换成 `tools.jackson`。Boot 4 已经按新坐标自动配置，你手写的 `ObjectMapper` Bean 会直接失效——这是从 Boot 3 迁移时最常见的「编译过了但配置没生效」。

## 6. Java 互操作边界：五个注解与一个事实

Kotlin 的语法糖在字节码里会变形，而 Spring、Jackson、Hibernate 都是按字节码工作的。下面五个注解是「把 Kotlin 的形状改成 Java 期待的形状」的工具：

| 注解 | 作用 | 不写的后果 | 典型场景 |
|---|---|---|---|
| `@JvmStatic` | companion object 的方法生成外层类静态方法 | Java 侧只能 `Foo.Companion.bar()`；按静态方法查找的框架找不到 | 工厂方法、`main`、框架回调 |
| `@JvmOverloads` | 为带默认值的参数生成重载 | Java 侧必须传全参；按参数个数反射的库失配 | 构造函数、工具方法 |
| `@Throws(E::class)` | 在字节码里声明受检异常 | Java 调用方没法 `catch` 具体异常（编译器说「不会抛出」） | 与 Java 库/框架的异常契约对齐 |
| `@JvmName` | 改 JVM 上的名字 | 泛型擦除导致签名冲突（两个 `List<T>` 扩展同名） | 扩展函数、`@JvmName("getFoo")` 改 getter 名 |
| `@JvmField` | 属性暴露为字段，不生成 getter/setter | 按字段访问的框架（部分序列化器、JPA FIELD 模式）看不到 | 常量、与 Java 库共享的数据结构 |

```kotlin
class OrderFactory private constructor() {
    companion object {
        @JvmStatic
        @JvmOverloads
        fun create(sku: String, quantity: Int = 1): Order = Order(sku, quantity)
    }
}

@Throws(IOException::class)
fun exportTo(path: Path) { /* ... */ }
```

**那个事实是：Kotlin 没有受检异常。** 这不只是语法差异——Spring 的 `@Transactional` 默认只对 `RuntimeException` 和 `Error` 回滚，Kotlin 里你随手抛的任何异常都是 unchecked，所以「回滚规则」这条在 Kotlin 项目里反而更简单；但反过来，Java 库声明的受检异常在 Kotlin 里可以自由忽略，**你在 Kotlin 侧吞掉的 `IOException`，Java 调用方完全不知情**——跨语言 API 要把 `@Throws` 写全。

另外两个边界值得知道：

- `object` 单例在 Java 里是 `Foo.INSTANCE`，不是 `Foo`；`@JvmStatic` 只影响方法，不影响实例；
- `internal` 在字节码里是 `public` + 名字混淆，**不是访问控制边界**，只是「别在本模块外调用」的约定。

## 7. 自测

1. `@Configuration` 类不加 `kotlin-spring` 插件，什么情况下完全不报错？为什么这让问题更难被发现？
2. `Cannot subclass final class` 与 `No default constructor for entity` 分别由哪个机制触发？各自的修法是什么？
3. 说出 `data class` 用在 JPA 实体上的四处破坏，并解释为什么 `hashCode` 返回 `javaClass.hashCode()` 是「可用但不理想」。
4. `@ConfigurationProperties` 的字段校验为什么必须写 `@field:NotBlank`？写成 `@NotBlank` 会发生什么？
5. Kotlin 的非空 `Int` 字段收到 JSON `null` 时会变成什么？怎么让这种情况报错？
6. `@JvmStatic`、`@JvmOverloads`、`@Throws` 各自解决什么「Java 看不到 Kotlin 语法」的问题？举一个 Spring 或 Jackson 里的具体场景。

## 8. 延伸

- 上一册：[05-协程基础-suspend与结构化并发](05-协程基础-suspend与结构化并发.md)——`@Transactional` 在 `suspend` 函数上的线程亲和问题，与本节 allopen/proxy 的前提是同一个根因。
- 下一册：[07-Gradle构建-version-catalog与多模块](07-Gradle构建-version-catalog与多模块.md)——`kotlin("plugin.spring")` 的版本怎么在 version catalog 里统一管理。
- 代理与自调用的完整机制见[第三阶段导览](../03-第三阶段/01-导览.md)；Jackson 3 的序列化细节与 `ProblemDetail` 错误模型见[第四阶段导览](../04-第四阶段/01-导览.md)。
