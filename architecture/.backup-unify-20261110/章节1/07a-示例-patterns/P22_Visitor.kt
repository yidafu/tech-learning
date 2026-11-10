// P22_Visitor.kt —— 访问者模式（行为型）
//
// 意图：不改动元素类的前提下，为一族元素添加新操作（双分派）。
//       适合"元素类型稳定、操作频繁增加"的场景：报表、编译器 AST、多种格式导出。
//       代价：新增元素类型时要改所有访问者——与"元素常增"的场景天然相克。
//
// 场景：订单树（延续组合模式 P14 的结构：单品/套装/赠品）上跑三种报表：
//       财务算实收、运营算赠品成本、客服导明细。三种报表 = 三个访问者，元素类零改动。
//
// 运行：kotlinc P22_Visitor.kt -include-runtime -d p22.jar && java -jar p22.jar

private fun Long.toYuan(): String = "%.2f".format(this / 100.0)

// 元素族：accept 是双分派的关键——运行时"元素类型"和"访问者类型"共同决定调用哪个重载
sealed interface OrderElement {
    fun accept(v: OrderReportVisitor)
}

data class ProductItem(val skuId: String, val priceCents: Long, val quantity: Int) : OrderElement {
    override fun accept(v: OrderReportVisitor) = v.visit(this)   // this 静态类型是 ProductItem → 选中对应重载
}

data class BundleItem(val name: String, val items: List<OrderElement>) : OrderElement {
    override fun accept(v: OrderReportVisitor) {
        v.visit(this)
        items.forEach { it.accept(v) }       // 沿树下推
    }
}

data class GiftItem(val skuId: String, val valueCents: Long) : OrderElement {
    override fun accept(v: OrderReportVisitor) = v.visit(this)
}

// 访问者：每个 visit 重载对应一种元素；report 让"遍历完输出结果"成为协议的一部分
interface OrderReportVisitor {
    fun visit(p: ProductItem)
    fun visit(b: BundleItem)
    fun visit(g: GiftItem)
    fun report(): String
}

// 访问者一：财务视角——只关心实收（赠品不算钱、套装本身不收钱）
class FinanceVisitor : OrderReportVisitor {
    private var revenue = 0L
    override fun visit(p: ProductItem) { revenue += p.priceCents * p.quantity }
    override fun visit(b: BundleItem) { /* 金额在子商品里 */ }
    override fun visit(g: GiftItem) { /* 赠品不计实收 */ }
    override fun report() = "财务报表: 实收 ¥${revenue.toYuan()}"
}

// 访问者二：运营视角——赠品成本
class OpsVisitor : OrderReportVisitor {
    private var giftCost = 0L
    private var giftCount = 0
    override fun visit(p: ProductItem) { }
    override fun visit(b: BundleItem) { }
    override fun visit(g: GiftItem) { giftCost += g.valueCents; giftCount++ }
    override fun report() = "运营报表: 赠品 $giftCount 件，成本 ¥${giftCost.toYuan()}"
}

// 访问者三：客服视角——导出可读明细
class SupportVisitor : OrderReportVisitor {
    private val lines = mutableListOf<String>()
    override fun visit(p: ProductItem) {
        lines += "  商品 ${p.skuId} x${p.quantity} = ¥${(p.priceCents * p.quantity).toYuan()}"
    }
    override fun visit(b: BundleItem) { lines += "  套装【${b.name}】" }
    override fun visit(g: GiftItem) { lines += "  赠品 ${g.skuId}（价值 ¥${g.valueCents.toYuan()}）" }
    override fun report() = "客服明细:\n" + lines.joinToString("\n")
}

fun main() {
    // 同一棵订单树
    val tree: OrderElement = BundleItem("新年大礼包", listOf(
        ProductItem("K100", 29_900, 1),
        ProductItem("M9", 19_900, 2),
        GiftItem("鼠标垫", 3_900),
    ))

    // 三种报表 = 三个访问者遍历同一棵树；再加一种报表（如税务），元素族零改动
    listOf(FinanceVisitor(), OpsVisitor(), SupportVisitor()).forEach { v ->
        tree.accept(v)
        println(v.report())
        println()
    }

    println("要点：选型口诀——『操作常增、元素稳定』用访问者（新操作 = 新类，元素不动）；")
    println("     『元素常增、操作稳定』用 when + sealed（新元素由编译器强制补全所有分支）。")
    println("     Kotlin 里 when+sealed 更惯用，访问者保留给元素族真正稳定的场景（AST、报表内核）。")
}
