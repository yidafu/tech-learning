// P18_Iterator.kt —— 迭代器模式（行为型）
//
// 意图：不暴露聚合内部结构，按序遍历元素。现代语言已内置（Kotlin 的 for-in 就是迭代器语法糖），
//       日常无需手写；它的价值在"遍历策略自定义"：游标分页、懒拉取、按需过滤。
//
// 场景：对账任务要全量扫描历史订单，但订单在外部存储里只能按游标分页拉取——
//       用自定义迭代器把"分页细节"藏起来，调用方只写一个 for。
//
// 运行：kotlinc P18_Iterator.kt -include-runtime -d p18.jar && java -jar p18.jar

data class OrderRow(val orderId: String, val amountCents: Long)

// 模拟外部存储：只支持"给我下一页"，不知道"全量遍历"这回事
class OrderStore(private val total: Int, private val pageSize: Int = 3) {
    private var nextId = 1
    fun nextBatch(): List<OrderRow>? {
        if (nextId > total) return null
        val batch = (nextId..minOf(nextId + pageSize - 1, total))
            .map { OrderRow("o_%04d".format(it), it * 1_000L) }
        nextId += batch.size
        return batch
    }
}

// 迭代器：内部维护缓冲区，对调用方透明地一页页拉取
class OrderCursor(private val store: OrderStore) : Iterator<OrderRow> {
    private var buffer = emptyList<OrderRow>()
    private var pos = 0

    private fun fillIfNeeded(): Boolean {
        while (pos >= buffer.size) {
            buffer = store.nextBatch() ?: return false
            if (buffer.isNotEmpty()) { pos = 0; return true }
        }
        return true
    }

    override fun hasNext() = fillIfNeeded()

    override fun next(): OrderRow {
        if (!fillIfNeeded()) throw NoSuchElementException()
        return buffer[pos++]
    }
}

fun main() {
    val store = OrderStore(total = 10, pageSize = 3)

    println("── 对账任务全量扫描（调用方只见 for，不见分页）──")
    var sum = 0L
    for (row in OrderCursor(store)) {          // Kotlin 的 for 直接接受 Iterator
        println("  扫描 ${row.orderId} ¥${row.amountCents / 100.0}")
        sum += row.amountCents
    }
    println("共扫出总金额 $sum 分")

    println()
    println("要点：Kotlin 里的亲戚是 Sequence / sequence { }（懒求值流）——本质相同：")
    println("     把『怎么取下一批』封装起来，调用方只管逐个消费。")
    println("     判断何时值得写：聚合结构特殊（游标/树/图）、或要惰性求值避免一次性载入时。")
}
