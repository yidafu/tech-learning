// P20_Memento.kt —— 备忘录模式（行为型）
//
// 意图：不破坏封装的前提下捕获对象内部状态，用于稍后恢复——撤销/回滚的基础设施。
//       与命令（P17）互补：命令记"做了什么动作"（撤销靠逆操作）；
//       备忘录记"当时长什么样"（恢复靠快照），快照不依赖动作语义、一定还原。
//
// 场景：订单状态每次流转前拍快照。运营误把订单标记发货，一键回滚到上一状态。
//
// 运行：kotlinc P20_Memento.kt -include-runtime -d p20.jar && java -jar p20.jar

enum class OrderStatus { CREATED, PAID, SHIPPED, COMPLETED, CANCELLED }

class Order {
    var status: OrderStatus = OrderStatus.CREATED
        private set

    private var version = 0

    // 备忘录：由 Order 自己生产、自己解释。
    // 管理者（历史栈）只负责存取这个"看不懂内部"的对象——这就是"不破坏封装"
    data class Snapshot(val status: OrderStatus, val version: Int)

    fun transitionTo(newStatus: OrderStatus) {
        status = newStatus
        version++
        println("  [流转] → $status（v$version）")
    }

    fun snapshot() = Snapshot(status, version)

    fun restore(s: Snapshot) {
        status = s.status
        version = s.version
        println("  [回滚] → $status（v$version）")
    }
}

// 管理者：只存取快照，不关心内容
class OrderHistory {
    private val stack = ArrayDeque<Order.Snapshot>()

    fun checkpoint(order: Order) {
        stack.addLast(order.snapshot())
    }

    fun rollback(order: Order) {
        stack.removeLastOrNull()?.let(order::restore) ?: println("  （无可回滚的快照）")
    }
}

fun main() {
    val order = Order()
    val history = OrderHistory()

    println("── 正常流转：创建 → 支付 → 发货（每次流转前拍快照）──")
    history.checkpoint(order)
    order.transitionTo(OrderStatus.PAID)
    history.checkpoint(order)
    order.transitionTo(OrderStatus.SHIPPED)
    println("当前状态: ${order.status}")

    println("\n── 发现异常：物流说根本没发货，回滚到上一状态 ──")
    history.rollback(order)
    println("当前状态: ${order.status}")

    println("\n── 再回滚一次：回到创建态 ──")
    history.rollback(order)
    println("当前状态: ${order.status}")

    println("\n要点：快照要么不可变、要么只交还给原对象解释，不能让管理者直接改——")
    println("     否则『回滚』就变成了『任意篡改历史』。")
}
