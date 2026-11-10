// P23_Interpreter.kt —— 解释器模式（行为型）
//
// 意图：为一门小语言定义文法（表达式树）和求值器。业务中最常见的落地是规则引擎。
//       现实忠告：别为业务手写完整解释器（分词/语法分析是另一个量级的工程），
//       用现成引擎（Aviator / QLExpress / SpEL / Drools）。本例演示它的核心结构：AST + 递归求值。
//
// 场景：风控规则由运营用表达式配置，如：
//       "黑名单用户，或（VIP 且单笔超 5 万）需要转人工"
//       系统把配置解析成一棵表达式树（AST），对每笔订单递归求值。
//       （解析字符串 → AST 的 parser 此处省略；树的结构和求值才是模式本体）
//
// 运行：kotlinc P23_Interpreter.kt -include-runtime -d p23.jar && java -jar p23.jar

// 求值上下文：一笔订单的风控视图
data class RiskView(
    val orderId: String,
    val amountCents: Long,
    val userLevel: String,
    val blacklisted: Boolean,
)

// 表达式节点：每个节点知道自己怎么求值（结构 = 组合模式 P14 的树 + 每节点一个类）
sealed interface Expr {
    fun eval(view: RiskView): Boolean

    data class And(val left: Expr, val right: Expr) : Expr {
        override fun eval(view: RiskView) = left.eval(view) && right.eval(view)
    }

    data class Or(val left: Expr, val right: Expr) : Expr {
        override fun eval(view: RiskView) = left.eval(view) || right.eval(view)
    }

    data class Not(val inner: Expr) : Expr {
        override fun eval(view: RiskView) = !inner.eval(view)
    }

    data class AmountOver(val thresholdCents: Long) : Expr {
        override fun eval(view: RiskView) = view.amountCents > thresholdCents
    }

    data class LevelIs(val level: String) : Expr {
        override fun eval(view: RiskView) = view.userLevel == level
    }

    data object Blacklisted : Expr {
        override fun eval(view: RiskView) = view.blacklisted
    }
}

fun main() {
    // 运营配置的规则（真实系统中由规则中心的字符串解析而来）：
    // 黑名单 OR ( VIP AND 单笔 > 5万 ) → 转人工
    val manualReviewRule: Expr = Expr.Or(
        Expr.Blacklisted,
        Expr.And(Expr.LevelIs("VIP"), Expr.AmountOver(500_000_00)),
    )

    val orders = listOf(
        RiskView("o_1001", 80_000_00, "NORMAL", blacklisted = true),    // 黑名单
        RiskView("o_1002", 600_000_00, "VIP", blacklisted = false),     // VIP 大额
        RiskView("o_1003", 200_000_00, "NORMAL", blacklisted = false),  // 正常
    )

    orders.forEach { view ->
        val hit = manualReviewRule.eval(view)
        val flag = if (view.blacklisted) ", 黑名单" else ""
        println("订单 ${view.orderId}（${view.userLevel}, ¥${view.amountCents / 100.0}$flag）→ ${if (hit) "转人工审核" else "直接通过"}")
    }

    println()
    println("要点：AST 求值 = 组合模式的树 + 每节点一个求值类；规则可序列化入库、可可视化编辑、可热更新。")
    println("     营销平台/规则中心的内核都是它——这是 23 个模式里离『平台化』最近的一个。")
}
