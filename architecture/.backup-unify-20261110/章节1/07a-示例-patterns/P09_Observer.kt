// P09_Observer.kt —— 观察者模式（行为型）
//
// 意图：状态变化时通知多方；发布方不认识订阅方，双方只认识事件。
//
// 场景：下单成功后，库存要扣减、积分要发放、优惠券要核销、消息要推送——
//       下单核心逻辑不应该认识这些下游：每加一个下游，订单代码改一次就是耦合灾难；
//       某个下游挂了，也不应该拖垮下单主流程。
//
// 注意：本例是进程内同步实现。订阅方抛异常靠 try-catch 隔离；
//       但"下游宕机不影响下单"这种跨进程要求，进程内怎么写都做不到——
//       那正是消息队列/事件驱动架构（第二阶段）要解决的问题：观察者的分布式放大版。
//
// 运行：kotlinc P09_Observer.kt -include-runtime -d p09.jar && java -jar p09.jar

data class OrderCreatedEvent(
    val orderId: String,
    val userId: String,
    val amountCents: Long,
)

class OrderEventBus {
    private val listeners = mutableListOf<(OrderCreatedEvent) -> Unit>()

    fun subscribe(listener: (OrderCreatedEvent) -> Unit) {
        listeners += listener
    }

    fun publish(event: OrderCreatedEvent) {
        println("[事件总线] 发布 $event")
        // 每个订阅方独立通知：一方失败不能殃及发布方和其他订阅方
        listeners.forEach { listener ->
            runCatching { listener(event) }
                .onFailure { println("[事件总线] 某订阅方执行失败，已隔离跳过: ${it.message}") }
        }
    }
}

fun main() {
    val bus = OrderEventBus()

    // 下游各自订阅；订单核心代码完全不认识它们，新下游零改动接入
    bus.subscribe { e -> println("[库存] 扣减库存: ${e.orderId}") }
    bus.subscribe { e -> println("[积分] 给 ${e.userId} 发放积分") }
    bus.subscribe { throw IllegalStateException("消息服务连接池耗尽") } // 模拟一个"毒订阅方"
    bus.subscribe { e -> println("[优惠券] 核销订单 ${e.orderId} 使用的优惠券") }

    println("── 下单成功，发布 OrderCreatedEvent ──")
    bus.publish(OrderCreatedEvent("o_3001", "u_42", 15_800))

    println("\n结果：消息服务挂了，但库存扣减、积分、优惠券都正常执行，下单主流程不受影响。")
    println("进一步思考：如果消费者是独立部署的进程呢？——那就需要消息队列（第二阶段）。")
}
