// P15_Facade.kt —— 外观模式（结构型）
//
// 意图：给复杂子系统一个简单入口。不是消灭子系统，而是把编排细节藏起来。
//       与中介者（P19）的区别：外观是"单向简化入口"（外面调里面）；
//       中介者是"双向协调"（同事组件之间互相通信）。
//
// 场景：下单要协调六个子系统：锁库存 → 计价 → 核券 → 风控 → 落库 → 发事件。
//       调用方（HTTP Controller）不应该知道这六步的存在，只调 placeOrder()。
//
// 运行：kotlinc P15_Facade.kt -include-runtime -d p15.jar && java -jar p15.jar

class InventoryService {
    fun lock(sku: String, qty: Int) = println("  [库存] 锁定 $sku x$qty")
}

class PricingService {
    fun calc(items: Int): Long {
        println("  [计价] 计算 $items 项商品金额")
        return 19_900
    }
}

class CouponService {
    fun redeem(couponId: String, amountCents: Long): Long {
        println("  [优惠券] 核销 $couponId，抵扣 20 元")
        return amountCents - 2_000
    }
}

class RiskService {
    fun check(orderId: String) = println("  [风控] 订单 $orderId 校验通过")
}

class OrderRepository {
    fun save(orderId: String, payableCents: Long) = println("  [持久化] 订单 $orderId 落库，应付 $payableCents 分")
}

class EventPublisher {
    fun orderCreated(orderId: String) = println("  [事件] 发布 OrderCreated: $orderId")
}

// 外观：对 Controller 只暴露一个方法；编排顺序、步骤细节全部收在这里
class OrderFacade(
    private val inventory: InventoryService = InventoryService(),
    private val pricing: PricingService = PricingService(),
    private val coupon: CouponService = CouponService(),
    private val risk: RiskService = RiskService(),
    private val repository: OrderRepository = OrderRepository(),
    private val events: EventPublisher = EventPublisher(),
) {
    fun placeOrder(orderId: String, sku: String, qty: Int, couponId: String) {
        println("── Controller 调用 placeOrder()，它不知道下面有六个子系统 ──")
        inventory.lock(sku, qty)
        val amount = pricing.calc(1)
        val payable = coupon.redeem(couponId, amount)
        risk.check(orderId)
        repository.save(orderId, payable)
        events.orderCreated(orderId)
        println("── 返回下单成功 ──")
    }
}

fun main() {
    OrderFacade().placeOrder(orderId = "o_8801", sku = "8001", qty = 1, couponId = "C123")

    println()
    println("要点：外观是最常用的模式，也是最容易被忽略的——分层架构里每层的门面服务（OrderService）、")
    println("     SDK 的 XxxClient，本质都是外观。风险：外观方法会越长越胖，联腐化信号是要在多个外观方法间复制流程。")
}
