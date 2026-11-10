// P03_Builder.kt —— 建造者模式（创建型）
//
// 意图：可选参数很多时，安全、可读地构造对象。
//
// 场景：管理后台的订单列表筛选器，6 个参数里 4 个可选；
//       且有跨字段业务规则——"金额区间必须起点终点成对填写"。
//
// 运行：kotlinc P03_Builder.kt -include-runtime -d p03.jar && java -jar p03.jar

// ── Kotlin 首选写法：具名参数 + 默认值，直接消灭 Java 式 Builder ──
data class OrderQuery(
    val userId: Long? = null,
    val status: String? = null,
    val minAmountCents: Long? = null,
    val maxAmountCents: Long? = null,
    val page: Int = 1,
    val pageSize: Int = 20,
)

// ── 仍然需要真正 Builder 的场合：条件来自表单逐项录入、跨字段校验只能在最后做 ──
// apply 返回 this，支持链式调用；build() 里做统一校验后再构造
class OrderQueryBuilder {
    private var userId: Long? = null
    private var status: String? = null
    private var minAmountCents: Long? = null
    private var maxAmountCents: Long? = null

    fun userId(id: Long) = apply { userId = id }
    fun status(s: String) = apply { status = s }
    fun amountRange(minCents: Long?, maxCents: Long?) = apply {
        minAmountCents = minCents
        maxAmountCents = maxCents
    }

    fun build(): OrderQuery {
        val hasMin = minAmountCents != null
        val hasMax = maxAmountCents != null
        require(hasMin == hasMax) {
            "金额区间必须起点终点成对填写（当前 min=$minAmountCents, max=$maxAmountCents）"
        }
        return OrderQuery(
            userId = userId,
            status = status,
            minAmountCents = minAmountCents,
            maxAmountCents = maxAmountCents,
        )
    }
}

fun main() {
    println("── 场景 1：客服只想看某用户的已支付订单（具名参数，只写关心的字段）──")
    val q1 = OrderQuery(userId = 42, status = "PAID", page = 2, pageSize = 50)
    println("查询条件: $q1")

    println("\n── 场景 2：运营按金额区间逐项筛选（Builder 分步收集）──")
    val q2 = OrderQueryBuilder()
        .userId(42)
        .status("PAID")
        .amountRange(minCents = 5_000, maxCents = 99_000)
        .build()
    println("查询条件: $q2")

    println("\n── 场景 3：只填了区间起点没填终点，被 build() 统一校验拦下 ──")
    runCatching {
        OrderQueryBuilder().userId(7).amountRange(minCents = 5_000, maxCents = null).build()
    }.onFailure { println("校验拦截: ${it.message}") }
}
