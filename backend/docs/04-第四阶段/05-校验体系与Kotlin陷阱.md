---
sources:
  - 04-第四阶段
---

# 05. 校验体系与 Kotlin 陷阱

> [← 第四阶段导览](01-导览.md) · 校验本身只有三个注解，难点全在「它在哪一层被触发」和「Kotlin 的空安全在它之前就把请求拦下了」——不理解触发点，`@Valid` 加了不生效；不理解求值顺序，`@NotNull` 永远没有机会跑。

## 1. 三条入口：校验在哪一层被触发

Bean Validation 在 Spring 里不是一个钩子，而是三条互不相通的路径。它们抛的异常、能拿到的上下文、对应的 HTTP 状态码都不同。

| 入口 | 声明方式 | 谁触发 | 失败抛什么 | 状态码 |
|---|---|---|---|---|
| ① 参数校验 | `@Valid @RequestBody body: CreateOrderRequest` | `RequestResponseBodyMethodProcessor.validateIfApplicable` | `MethodArgumentNotValidException` | 400 |
| ② 方法校验 | 类上 `@Validated`，方法参数/返回值上写约束 | `MethodValidationInterceptor`（AOP 代理） | `ConstraintViolationException` | 500 或 400（取决于有没有 handler） |
| ③ 控制器方法约束 | 参数上直接写约束，如 `@RequestParam @Min(1) page: Int` | Spring 6.1 起由 `HandlerMethodValidator` 内置完成 | `HandlerMethodValidationException` | 400 |

**为什么会有三条**：① 是「对象图校验」，它的语义是「把这个 DTO 的约束跑一遍」，由 MVC 的参数解析器负责；② 是「任意 Bean 的方法契约」，靠 AOP 代理实现，与 Web 无关，Service 层也能用；③ 是 Spring 6.1 才补上的——在此之前，Controller 方法参数上的 `@Min` 之类的约束必须靠类上的 `@Validated` 触发 ②，而 ② 的代理会带来代理顺序、异常包装、返回值校验等一堆副作用。

三个必须知道的细节：

- **`@Validated` 标在 Controller 类上时，② 会接管，③ 自动关闭**。Spring MVC 检测到已有方法校验代理，就不再重复校验一次。这避免了「同一条约束跑两遍」，但也意味着两条路径的异常类型取决于你有没有加那个注解——**同一个接口，加一个类注解就换了一种 400 的 body**。
- **`@Valid` 与 `@Validated` 的区别只在「能不能带分组」**。`@Valid` 是 `jakarta.validation` 的标准注解，不带分组；`@Validated` 是 Spring 的，可以写 `@Validated(Update::class)`。功能上 `@Valid` 能做的 `@Validated` 都能做，反之不行。
- **`@Valid` 标在 `@ModelAttribute` 上失败时抛的是 `BindException`/`MethodArgumentNotValidException`**，`BindingResult` 里同时有字段错误与类型转换错误——这是表单场景和 JSON 场景最大的差别：表单的类型转换失败（`"abc"` → `Int`）会变成字段错误，JSON 的转换失败会在反序列化阶段直接抛 `HttpMessageNotReadableException`，压根进不了校验。

**坑**：② 的 `ConstraintViolationException` 如果没有对应的 `@ExceptionHandler`，会被当成未知异常返回 500。这在 Service 层校验时特别常见——「参数不合法」变成了「服务器错误」。06 册的映射表里它必须显式映射到 400。

## 2. 分组与 `@GroupSequence`：先便宜后昂贵

分组解决的是「同一个 DTO，新增和修改的规则不同」。定义两个空接口当标记，约束上写 `groups`：

```kotlin
interface OnCreate
interface OnUpdate

data class OrderRequest(
    @field:Null(groups = [OnCreate::class], message = "新增时不能指定 id")
    @field:NotNull(groups = [OnUpdate::class], message = "修改时必须指定 id")
    val id: Long? = null,

    @field:NotBlank(groups = [OnCreate::class, OnUpdate::class])
    val sku: String = "",

    @field:Min(1, groups = [OnCreate::class, OnUpdate::class])
    val qty: Int = 0,
)

@RestController
@RequestMapping("/orders")
class OrderController {

    @PostMapping
    fun create(@Validated(OnCreate::class) @RequestBody body: OrderRequest): OrderView = ...

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @Validated(OnUpdate::class) @RequestBody body: OrderRequest,
    ): OrderView = ...
}
```

没有 `groups` 的约束属于 `Default` 组。**如果你只写 `@Validated(OnCreate::class)`，`Default` 组里的约束不会被执行**——这是「加了分组之后某些校验突然失效」的标准原因。要么给每条约束都标组，要么在 `@GroupSequence` 里显式把 `Default` 排进去。

`@GroupSequence` 解决的是另一类问题：**校验本身有成本，且后面的校验依赖前面的结果**。比如「先检查 SKU 格式，再查数据库确认 SKU 存在」——格式错了就不该发那条 SQL；再比如「先检查金额格式，再做跨字段的总额一致性校验」。

```kotlin
interface FormatCheck
interface BusinessCheck

// 顺序：FormatCheck → BusinessCheck → 类自身（即 Default 组）
@GroupSequence(FormatCheck::class, BusinessCheck::class, CreateOrderRequest::class)
data class CreateOrderRequest(
    @field:NotBlank(groups = [FormatCheck::class])
    @field:Pattern(regexp = "[A-Z]{3}-[0-9]{1,6}", groups = [FormatCheck::class])
    val sku: String = "",

    @field:Min(1, groups = [FormatCheck::class])
    @field:Max(999, groups = [FormatCheck::class])
    val qty: Int = 0,

    @field:DecimalMin("0.01", groups = [FormatCheck::class])
    val unitPrice: BigDecimal = BigDecimal.ZERO,
) {
    // 依赖字段：只有 FormatCheck 全过才会执行；真实项目里这里常是一次查库或远程校验
    @AssertTrue(groups = [BusinessCheck::class], message = "订单总价必须大于 0")
    fun isTotalValid(): Boolean = unitPrice.multiply(BigDecimal(qty)) > BigDecimal.ZERO
}
```

**`@GroupSequence` 的语义容易被说错**，这里精确一点：它定义的是「**类自身这个组**的校验顺序」，并且会**替换**这个类的 `Default` 组。所以：

- `@Valid`（等价于 `Default` 组）→ 触发 `FormatCheck` → `BusinessCheck` → 类自身的其余约束，顺序生效；
- `@Validated(BusinessCheck::class)` → **只跑 `BusinessCheck`，跳过序列**，顺序不生效。

这就是为什么「我加了 `@GroupSequence` 但顺序没变」——你多半是用 `@Validated(具体组)` 触发的。要用序列，就得用 `@Valid` 或 `@Validated` 不带参数（触发 `Default`）。

**为什么值得用序列**：`BusinessCheck` 里的校验常常要查库或调下游，单次几毫秒。一个格式就不合法的请求，本来 10µs 能拒掉，现在要花 5ms 且占一个数据库连接。按「便宜的先跑」排序，能把无效流量挡在昂贵操作之前——这在被刷接口时是实打实的保护。

**取舍与坑**：

1. 序列让「哪些约束属于哪一组」变成必须维护的元数据，重构时容易漏。组别超过三个就该考虑拆 DTO。
2. `@GroupSequence` 只能做**静态顺序**。需要按字段值动态决定跑哪些组时，用 `@GroupSequenceProvider` + `DefaultGroupSequenceProvider`，代价是每次校验都执行一段代码。
3. 序列中的某一组失败后，后面的组**整组跳过**。所以不要把「相互独立、都希望一次性报给用户」的约束放进同一个序列——用户改完第一批错误才发现还有第二批，体验很差。表单场景常常反而要「一次报全」，那就别用序列：序列天生是「一批一批报」的。

## 3. 自定义约束：注解、验证器、消息、国际化

内置约束覆盖不了业务规则（SKU 编码、金额精度、手机号段），这时写自定义约束。三件套缺一不可：注解、验证器、消息。

```kotlin
@Target(AnnotationTarget.FIELD, AnnotationTarget.PROPERTY_GETTER, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [SkuCodeValidator::class])
@ReportAsSingleViolation
annotation class SkuCode(
    val message: String = "{lab.validation.sku-code}",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class SkuCodeValidator : ConstraintValidator<SkuCode, CharSequence> {

    override fun isValid(value: CharSequence?, context: ConstraintValidatorContext): Boolean {
        // null 一律放行：是否允许为空是 @NotBlank / @NotNull 的职责
        if (value.isNullOrEmpty()) return true
        return PATTERN.matches(value)
    }

    companion object {
        // 用有限量词，避免回溯；长度上限写进模式本身
        private val PATTERN = Regex("[A-Z]{3}-[0-9]{1,6}")
    }
}
```

四个设计决定，每个都有理由：

| 决定 | 写法 | 为什么 |
|---|---|---|
| 泛型参数用 `CharSequence` 而不是 `String` | `ConstraintValidator<SkuCode, CharSequence>` | 一次实现同时支持 `String` 与 `StringBuilder`，避免为不同类型写两个验证器 |
| null 放行 | `if (value.isNullOrEmpty()) return true` | 约束的职责单一：格式只管格式，非空交给 `@NotBlank`。两者组合才表达「必填且格式正确」 |
| `groups` 用 `Array<KClass<*>>` | Kotlin 注解里 `KClass` 会编译成 `Class<?>` | 与 Jakarta Validation 的 `Class<?>[] groups()` 对齐，分组才能生效 |
| 消息用 `{key}` 而不是硬编码 | `message = "{lab.validation.sku-code}"` | 走 `ResourceBundle` 插值，才能国际化 |

消息与国际化有两条路，**不要混用**：

| 方式 | 文件 | 生效条件 | 适用 |
|---|---|---|---|
| Bean Validation 原生 | `ValidationMessages.properties`、`ValidationMessages_zh_CN.properties` | 默认就生效 | 校验消息专用，key 不与其他消息冲突 |
| Spring `MessageSource` | `messages.properties` 等 | 需给 `LocalValidatorFactoryBean` 设 `validationMessageSource` | 想和业务错误消息共用一套文件与 `MessageSource` 配置 |

原生方式的文件内容就是一行键值：`lab.validation.sku-code=SKU 编码格式应为 ABC-123456`。中文文件同理，`Locale` 由请求的 `Accept-Language` 经 `LocaleContextHolder` 决定——但注意 **Bean Validation 的 `ResourceBundle` 用的是 JVM 默认 Locale，不是请求 Locale**，除非你用的是 Spring 的 `MessageSource` 路径或 `MessageInterpolator` 接了 `LocaleContextHolder`。这是「加了 `_zh_CN` 文件却还是英文」的常见原因。

**取舍**：自定义约束里不要做远程调用。校验器在每个请求上同步执行，一次 Redis 查询会把 ⑤ 站从 10µs 拉到 500µs。需要「唯一性校验」这类查库逻辑时，把它放在 Service 层靠近唯一索引的地方，用「插入冲突」兜底，而不是在验证器里先查一遍——既慢又有 TOCTOU 竞态。

## 4. 嵌套与集合：`@Valid` 该站在哪个位置

级联校验的开关是 `@Valid`，但它的位置决定它管谁：

| 写法 | 管什么 | 说明 |
|---|---|---|
| `@field:Valid val address: Address` | 校验 `address` 对象的内部约束 | 字段级级联，最常用 |
| `@field:Size(max = 10) val items: List<@Valid Item>` | `items` 最多 10 个，且每个 `Item` 都校验 | 容器元素级约束（Bean Validation 2.0） |
| `@field:Valid val items: List<Item>` | 每个元素都校验 | 集合字段上的 `@Valid` 会级联到元素，是遗留但有效的写法 |
| `List<@NotBlank String>` | 每个元素非空 | 元素是简单类型时，用容器元素约束 |

**为什么 `@Valid` 必须显式写**：级联不会自动发生。一个 `Address` 字段上不写 `@Valid`，`Address` 内部的 `@NotBlank` 一条都不会跑，因为校验器只遍历「当前对象声明的约束」和「标了级联的字段」。这是「嵌套对象校验不生效」的唯一原因。

**集合的两个坑**：

1. **`@Size` 与元素校验失败的消息混在一起**。`items` 超长报「最多 10 个」，第 3 个元素非法报 `items[2].sku 不能为空`——路径里的 `[2]` 是索引，客户端要靠它定位。如果你在 DTO 里把 `List` 换成 `Map`，路径会变成 `items[KEY].sku`，更容易定位。
2. **空集合与 null 不等价**。`@NotEmpty` 拒绝两者，`@Size(min=1)` 只拒绝空集合（null 直接放过，因为 `@Size` 对 null 视为有效）。想让「必须传且至少一个」成立，要 `@NotNull` + `@Size(min=1)` 两条一起写。

**取舍**：级联深度不要超过三层。校验的耗时随对象图线性增长，而深度嵌套的 DTO 通常意味着接口设计有问题——一次性提交一棵树，失败时只能整棵树重来。三层以上考虑拆成多个接口。

## 5. Kotlin 五个坑

Kotlin 的类型系统比 Java 严格，但它和 Jackson、Bean Validation 的求值顺序合在一起时，会产生一批「看起来配了、实际没跑」的组合。

### 5.1 非空类型 + `@field:NotNull`：校验器永远没机会跑

```kotlin
data class BadRequest(
    @field:NotNull val name: String,      // 想拦「没传 name」
)
```

请求 `{}` 时，失败发生在**反序列化**阶段：Jackson 的 Kotlin 模块发现主构造器参数是非空 `String` 却收到缺失值，直接抛 `MissingKotlinParameterException`。请求在参数解析（④）就挂了，根本进不到校验（⑤），`@NotNull` 一次都没执行。客户端拿到的是 400，但 `errors` 数组是空的——因为它不是校验错误，是反序列化错误。

**正解**：需要「可缺失 + 自定义消息」时，把类型改成可空并去掉默认值，再用约束表达：

```kotlin
data class CreateOrderRequest(
    @field:NotBlank(message = "sku 不能为空")
    val sku: String?,        // 可空：让缺失/显式 null 都走到校验
)
```

**取舍**：可空类型会把 null 检查推给业务代码。折中方案是「可空入参 + 构造后转非空领域对象」：DTO 允许可空，`toCommand()` 里 `requireNotNull` 并给出领域消息。这样校验负责格式，领域对象负责不变量。

### 5.2 `data class` 默认值让「字段缺失」与「显式 null」不可区分

```kotlin
data class PatchRequest(val nickname: String? = null)
```

`{}` 与 `{"nickname": null}` 反序列化后**完全一样**，都是 `nickname = null`。对 PATCH 语义来说这是灾难：前者是「不改」，后者是「清空」。

三种解法，各有代价：

| 解法 | 写法 | 代价 |
|---|---|---|
| 用 `JsonNullable`/`Optional` 包装 | `val nickname: JsonNullable<String>?` | 序列化、校验、文档都要跟着改 |
| 用原始 `Map` 或 `JsonNode` 判断字段是否存在 | `body.has("nickname")` | 丢掉类型安全，回到手写解析 |
| 拆成「全量 PUT + 显式清空接口」 | `PUT` 全量替换，`DELETE /profile/nickname` 清空 | 接口变多，但语义最干净 |

推荐第三条：**能用 PUT 全量替换就不要用 PATCH 猜意图**。这是接口契约层面的决策，不是校验层能补救的。

### 5.3 `@Valid` 标错位置：落到参数而不是字段

Kotlin 的注解默认 use-site target 有优先级：能标在构造器参数上就标参数（`@param:`）。而 Hibernate Validator 的属性级校验读的是**字段或 getter**，读不到参数上的注解。

```kotlin
data class Bad(val address: @Valid Address)          // 落到 @param:，级联失效
data class Good(@field:Valid val address: Address)    // 落到字段，级联生效
```

规则很简单：**构造器属性上的校验注解一律加 `@field:` 前缀**。`@get:` 也能生效（属性级校验支持 getter），但字段更稳定——getter 可能被自定义或内联。

### 5.4 `Int` 与 `Long` 的转换失败：校验前就炸了

`{"qty": 9999999999999}` 到 `Int` 参数，Jackson 抛 `InvalidFormatException`（数值超出 int 范围）；`{"qty": 1.5}` 同理。这些都不是校验错误，`@Max` 没机会执行。

Jackson 3 还收紧了隐式转换：**字符串 `"42"` 默认不再自动转成数字 42**，会直接失败（Jackson 2 里这是允许的）。升级到 Boot 4 时，「前端把数字当字符串传」的老接口会突然 400，错误消息是 `Cannot coerce String "42" to int`。

**取舍**：对外契约里把数值范围写清楚，超出范围按 400 处理而不是截断。如果确实要兼容字符串数字，显式开 `CoercionConfig`，并在契约测试里锁住这个行为——不要依赖「默认会转」。

### 5.5 正则回溯：一个 `@Pattern` 打满 CPU

`@Pattern(regexp = "^(a+)+$")` 遇到 `aaaa...aaab` 会指数级回溯。校验阶段单次耗时可以从 10µs 变成几十秒，而它跑在 Tomcat 的 worker 线程上——几个这样的请求就能占满 `maxThreads`。

三条防线：

1. **长度先限**：`@Size(max = 64)`，但注意同组约束的执行顺序不保证，所以更可靠的是把长度写进正则：`^(?=.{1,64}$)...`。
2. **用占有量词/原子组**：`(?>a+)` 或 `a++`，消除回溯。
3. **用字符类白名单替代嵌套量词**：`[A-Za-z0-9_-]{1,64}` 这种平铺写法几乎不可能回溯。

**判据**：任何带嵌套量词（`(x+)+`、`(x*)*`）或可选分支重叠（`(a|ab)+`）的正则，都要当成潜在 ReDoS 处理。

## 6. 自测

1. 三条校验入口分别抛出什么异常？哪一条在不写 `@ExceptionHandler` 时会变成 500？
2. `@GroupSequence(FormatCheck::class, BusinessCheck::class, CreateOrderRequest::class)` 里最后那个类名是干什么的？去掉它会怎样？
3. 为什么 `@NotNull` 加在 Kotlin 非空 `String` 上永远不会执行？请求 `{}` 时客户端实际收到的是什么？
4. `@Valid` 写在构造器参数上（不加 `@field:`）为什么级联失效？Hibernate Validator 读的是哪里？
5. `@Size(min = 1) val items: List<Item>?` 能拦住 `null` 吗？要表达「必须传且至少一个元素」需要几条约束？
6. 一个 `@Pattern(regexp = "^(\\d+)+$")` 的字段，攻击者传 5KB 数字加一个字母，会发生什么？三条防线分别怎么加？

## 7. 延伸

- 上一册：[04-DispatcherServlet分发与参数解析](04-DispatcherServlet分发与参数解析.md)——校验发生在参数解析完成之后、方法调用之前。
- 下一册：[06-错误模型-ProblemDetail与错误码](06-错误模型-ProblemDetail与错误码.md)——`MethodArgumentNotValidException` 怎么变成字段级 `errors`。
- Kotlin 空安全与不可变建模的系统讲法：[02-第二阶段 02 册](../02-第二阶段/02-空安全与不可变数据建模.md)。
- 序列化侧的默认值与可空性：[07-Jackson3序列化](07-Jackson3序列化.md)。
- 校验失败率高的接口为什么成本是正常路径的十倍：[第一阶段 02 册](../01-第一阶段/02-一次请求的十五站主时间线与账本.md)。
