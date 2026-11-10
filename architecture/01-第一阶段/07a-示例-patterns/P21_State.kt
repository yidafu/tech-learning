// P21_State.kt —— 状态模式（行为型）
//
// 意图：状态驱动行为——同一个调用在不同状态下行为不同。
//       把每个状态的行为收进各自的类，替代"每个方法里一个巨型 when(status)"的分支地狱。
//
// 场景：订单状态机。支付/发货/取消三个操作，在 待支付/已支付/已发货/已取消 四个状态下
//       合法性各不相同。反例：3 个方法 × 4 个状态 = 12 个分支散落在三个方法里，改一处怕十处；
//       状态模式：每个状态一个 object，合法转换与拒绝理由都内聚在自己家里。
//
// 运行：kotlinc P21_State.kt -include-runtime -d p21.jar && java -jar p21.jar

// 状态接口：所有操作由"当前状态"回答可不可、怎么变
interface OrderState {
    val label: String
    fun pay(ctx: OrderContext)
    fun ship(ctx: OrderContext)
    fun cancel(ctx: OrderContext)
}

object AwaitPayState : OrderState {
    override val label = "待支付"
    override fun pay(ctx: OrderContext) = ctx.change(PaidState, "支付成功")
    override fun ship(ctx: OrderContext) = ctx.reject("待支付订单不能发货")
    override fun cancel(ctx: OrderContext) = ctx.change(CancelledState, "订单已取消")
}

object PaidState : OrderState {
    override val label = "已支付"
    override fun pay(ctx: OrderContext) = ctx.reject("请勿重复支付")
    override fun ship(ctx: OrderContext) = ctx.change(ShippedState, "发货成功")
    override fun cancel(ctx: OrderContext) = ctx.reject("已支付订单请走退款流程，不能直接取消")
}

object ShippedState : OrderState {
    override val label = "已发货"
    override fun pay(ctx: OrderContext) = ctx.reject("请勿重复支付")
    override fun ship(ctx: OrderContext) = ctx.reject("请勿重复发货")
    override fun cancel(ctx: OrderContext) = ctx.reject("已发货订单不能取消")
}

object CancelledState : OrderState {
    override val label = "已取消"
    override fun pay(ctx: OrderContext) = ctx.reject("已取消订单不能支付")
    override fun ship(ctx: OrderContext) = ctx.reject("已取消订单不能发货")
    override fun cancel(ctx: OrderContext) = ctx.reject("订单早已取消")
}

// 上下文：持有当前状态，把所有操作委托给它
class OrderContext(private val orderId: String) {
    private var state: OrderState = AwaitPayState

    fun pay()    { print("[$orderId · ${state.label}] 支付 → "); state.pay(this) }
    fun ship()   { print("[$orderId · ${state.label}] 发货 → "); state.ship(this) }
    fun cancel() { print("[$orderId · ${state.label}] 取消 → "); state.cancel(this) }

    fun change(next: OrderState, msg: String) {
        state = next
        println("✓ $msg，现状态: ${state.label}")
    }

    fun reject(reason: String) = println("✗ 拒绝: $reason")
}

fun main() {
    val order = OrderContext("o_9501")

    order.pay()      // 待支付 → 已支付
    order.ship()     // 已支付 → 已发货
    order.cancel()   // 已发货 → 拒绝
    order.pay()      // 已发货 → 拒绝

    println()
    val order2 = OrderContext("o_9502")
    order2.cancel()  // 待支付 → 已取消
    order2.pay()     // 已取消 → 拒绝

    println()
    println("要点：新增状态（如『退货中』）= 新增一个 object，老状态类不动；")
    println("     策略 vs 状态：策略由调用方从外部挑一个注入，状态由对象自己随流转切换。")
    println("     Kotlin 轻量替代是 sealed class + when，但『状态自身带行为』时 OO 版职责更清晰。")
}
