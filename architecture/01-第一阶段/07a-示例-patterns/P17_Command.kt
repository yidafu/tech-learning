// P17_Command.kt —— 命令模式（行为型）
//
// 意图：把"请求"封装成对象。于是请求可以入队、记录、撤销、重放、审计。
//       架构级雏形：命令对象 ≈ CQRS 里的 Command（表达意图）；
//       命令执行历史 ≈ 事件溯源里的 Event（记录已经发生的事）。
//
// 场景：运营后台对订单的操作（改地址、调价）封装成命令，走统一历史栈执行，支持逐步撤销。
//
// 运行：kotlinc P17_Command.kt -include-runtime -d p17.jar && java -jar p17.jar

class OperatedOrder(var address: String, var priceCents: Long) {
    override fun toString() = "订单(address=$address, price=${priceCents}分)"
}

// 命令接口：execute 与 undo 成对——执行时记住撤销所需的最小信息
interface OrderCommand {
    val name: String
    fun execute()
    fun undo()
}

class ChangeAddressCommand(
    private val order: OperatedOrder,
    private val newAddress: String,
) : OrderCommand {
    private var previous: String = ""
    override val name = "修改地址"
    override fun execute() {
        previous = order.address
        order.address = newAddress
        println("  执行[$name] → ${order.address}")
    }
    override fun undo() {
        order.address = previous
        println("  撤销[$name] → 恢复为 ${order.address}")
    }
}

class AdjustPriceCommand(
    private val order: OperatedOrder,
    private val deltaCents: Long,
) : OrderCommand {
    override val name = "调整价格"
    override fun execute() {
        order.priceCents += deltaCents
        println("  执行[$name] → ${order.priceCents}分")
    }
    override fun undo() {
        order.priceCents -= deltaCents
        println("  撤销[$name] → ${order.priceCents}分")
    }
}

// 调用方 + 历史栈：命令模式的价值在这里——调用方不认识任何具体命令，只会"执行"和"撤销"
class OperationHistory {
    private val done = ArrayDeque<OrderCommand>()

    fun execute(cmd: OrderCommand) {
        cmd.execute()
        done.addLast(cmd)
    }

    fun undoLast() {
        val cmd = done.removeLastOrNull() ?: return println("  （无可撤销的操作）")
        cmd.undo()
    }
}

fun main() {
    val order = OperatedOrder(address = "杭州市西湖区文一西路 969 号", priceCents = 19_900)
    val history = OperationHistory()

    println("初始: $order\n")
    history.execute(ChangeAddressCommand(order, "北京市朝阳区北辰西路 1 号"))
    history.execute(AdjustPriceCommand(order, 1_000))
    println("两次操作后: $order\n")

    println("── 运营发现改错了，撤销最近一次（调价）──")
    history.undoLast()

    println("── 再撤销一次（改地址）──")
    history.undoLast()

    println("\n最终: $order（完全回到初始状态）")
    println("\n要点：请求对象化后天然获得排队（异步任务）、审计（记录每个命令）、重放（故障恢复）能力。")
}
