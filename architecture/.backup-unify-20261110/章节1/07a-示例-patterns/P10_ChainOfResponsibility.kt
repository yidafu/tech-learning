// P10_ChainOfResponsibility.kt —— 责任链模式（行为型）
//
// 意图：请求沿处理者链传递，每个处理者要么处理、要么放行给下一个。
//
// 场景：下单风控流水线：黑名单检查 → 单笔限额 → 深夜大单加审 → …（规则会持续增加）。
//       每条规则独立存在、可插拔、可编排顺序——新增规则 = 往列表里追加一个函数。
//
// 现实中的它：Servlet Filter、Spring Interceptor、OkHttp Interceptor、Netty Pipeline、
//             网关的 鉴权→限流→日志→路由，几乎都是责任链。
//
// 运行：kotlinc P10_ChainOfResponsibility.kt -include-runtime -d p10.jar && java -jar p10.jar

data class RiskOrder(
    val orderId: String,
    val userId: String,
    val amountCents: Long,
    val hour: Int, // 下单时刻（0~23），供"深夜大单"规则使用
)

sealed interface RiskDecision {
    data class Reject(val reason: String) : RiskDecision
    data object Pass : RiskDecision
}

// 一条规则：返回 null = 放行，交给下一条；返回 Reject = 拦截，流程到此为止
typealias RiskCheck = (RiskOrder) -> RiskDecision?

// 责任链核心就这一行：取第一个非 null 的处理结果；全是 null 则默认放行
fun checkRisk(order: RiskOrder, checks: List<RiskCheck>): RiskDecision =
    checks.firstNotNullOfOrNull { it(order) } ?: RiskDecision.Pass

// 规则一：黑名单用户直接拒单
fun blacklistCheck(order: RiskOrder): RiskDecision? =
    if (order.userId == "u_777") RiskDecision.Reject("黑名单用户") else null

// 规则二：单笔限额
fun amountLimitCheck(order: RiskOrder): RiskDecision? =
    if (order.amountCents > 500_000_00) RiskDecision.Reject("单笔超过 5 万，转人工审核") else null

// 规则三：深夜大单加审（风控后期新加的规则——只写函数 + 追加进链，老规则零改动）
fun nightLargeOrderCheck(order: RiskOrder): RiskDecision? =
    if (order.hour >= 23 && order.amountCents > 100_000_00)
        RiskDecision.Reject("深夜时段大额订单，转人工审核") else null

fun main() {
    // 规则按优先级排进链；要调整风控策略，改这个列表即可
    val pipeline = listOf(::blacklistCheck, ::amountLimitCheck, ::nightLargeOrderCheck)

    listOf(
        RiskOrder("o_4001", "u_777", 100_00, hour = 10),    // 命中规则一：黑名单
        RiskOrder("o_4002", "u_42", 100_00, hour = 10),     // 全部放行
        RiskOrder("o_4003", "u_42", 600_000_00, hour = 10), // 命中规则二：单笔超限
        RiskOrder("o_4004", "u_42", 200_000_00, hour = 23), // 命中规则三：深夜大单
    ).forEach { order ->
        println("订单 ${order.orderId}（用户${order.userId}, ¥${"%.0f".format(order.amountCents / 100.0)}, ${order.hour}点）→ ${checkRisk(order, pipeline)}")
    }
}
