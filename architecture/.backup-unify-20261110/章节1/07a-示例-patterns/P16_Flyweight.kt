// P16_Flyweight.kt —— 享元模式（结构型）
//
// 意图：共享细粒度对象省内存。内部状态（不变、可共享）放进享元；
//       外部状态（多变、随请求）由调用方持有、传入。
//
// 场景：订单列表页要渲染 10 万条订单行，但商品元信息（标题/类目）只有 1 万种——
//       元信息做成享元全局共享，订单行只持有引用 + 数量、成交价等外部状态。
//
// 运行：kotlinc P16_Flyweight.kt -include-runtime -d p16.jar && java -jar p16.jar

// 享元：内部状态（skuId/title/category）创建后不变，可被所有订单行安全共享
class ProductMeta(val skuId: String, val title: String, val category: String) {
    companion object { var createdCount = 0 }   // 统计真实创建次数，验证共享效果
    init { createdCount++ }
}

// 享元池：同一个 sku 只创建一次，之后全部拿同一个对象
object ProductMetaPool {
    private val pool = mutableMapOf<String, ProductMeta>()
    fun get(skuId: String): ProductMeta =
        pool.getOrPut(skuId) {
            val cat = ((skuId.hashCode() % 5) + 5) % 5
            ProductMeta(skuId, "商品-$skuId", "类目-$cat")
        }
    fun size() = pool.size
}

// 订单行：不持有元信息副本，只持有享元引用 + 外部状态（数量、成交价每单都不同）
data class OrderLine(
    val orderId: Long,
    val meta: ProductMeta,       // ← 共享引用，不是副本
    val quantity: Int,
    val dealPriceCents: Long,
)

fun main() {
    val totalOrders = 100_000
    val distinctSkus = 10_000

    // 10 万条订单行，循环复用 1 万个 sku
    val lines = (1..totalOrders).map { i ->
        val sku = "SKU_${(i - 1) % distinctSkus + 1}"
        OrderLine(
            orderId = 1_000_000L + i,
            meta = ProductMetaPool.get(sku),          // 同 sku 拿到的是同一个对象
            quantity = (i % 3) + 1,
            dealPriceCents = 9_900L + i,
        )
    }

    println("订单行总数:           ${lines.size}")
    println("实际创建的元信息对象: ${ProductMeta.createdCount} 个（享元池大小 ${ProductMetaPool.size()}）")
    println("若无共享:             $totalOrders 个元信息对象")
    println("节省:                 ${totalOrders - ProductMeta.createdCount} 份对象内存")

    println()
    println("要点：享元必须不可变——谁改了共享对象的字段，引用它的全部订单行同时被污染。")
    println("     现实对应：Integer.valueOf 缓存、字符串常量池、数据库连接池，全是享元思想。")
}
