// P14_Composite.kt —— 组合模式（结构型）
//
// 意图：树形结构里，单个对象（叶子）和容器对象使用同一接口——
//       调用方递归处理，无差别对待"一件商品"和"一个套装"。
//
// 场景：订单计价。订单行既可以是单品，也可以是"套装"（套装里还能再嵌套装）；
//       计价逻辑只需要 totalCents()，完全不关心拿到的是叶子还是树。
//
// 运行：kotlinc P14_Composite.kt -include-runtime -d p14.jar && java -jar p14.jar

private fun Long.toYuan(): String = "%.2f".format(this / 100.0)

// sealed 表达"元素族只有这两种"，编译器保证穷尽处理
sealed interface OrderItem {
    fun totalCents(): Long

    data class Product(
        val skuId: String,
        val priceCents: Long,
        val quantity: Int,
    ) : OrderItem {
        override fun totalCents() = priceCents * quantity
    }

    data class Bundle(
        val name: String,
        val items: List<OrderItem>,   // 容器既能装叶子也能装容器 → 树
    ) : OrderItem {
        override fun totalCents() = items.sumOf { it.totalCents() }   // 递归下推
    }
}

fun main() {
    val keyboard = OrderItem.Product("K100", 29_900, 1)
    val monitor = OrderItem.Product("M270", 129_900, 1)
    val mouse = OrderItem.Product("M9", 19_900, 2)

    // 套装里嵌套装："外设大礼包" 包含 "键鼠套装"
    val keyboardMouseSet = OrderItem.Bundle("键鼠套装", listOf(keyboard, mouse))
    val bigBundle = OrderItem.Bundle("外设大礼包", listOf(keyboardMouseSet, monitor))

    val order: OrderItem = bigBundle   // 调用方拿到的是一棵树，但接口和单品一模一样

    println("键鼠套装:   ¥${keyboardMouseSet.totalCents().toYuan()}")
    println("外设大礼包: ¥${bigBundle.totalCents().toYuan()}")
    println("整单（本质是一棵树）: ¥${order.totalCents().toYuan()}")

    println()
    println("要点：计价只有一行 items.sumOf { it.totalCents() }，嵌套多深都不用关心；")
    println("     现实对应：菜单/组织架构/文件系统，以及前端组件树、订单履约包。")
}
