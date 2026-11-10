// P12_Prototype.kt —— 原型模式（创建型）
//
// 意图：通过克隆已有实例创建新实例，而不是从零构造。
//       适合"构造昂贵"（加载模型、解析大配置）或"以调好的模板为基准微调"的场景。
//
// 场景：大促活动页的「商品卡片模板」——运营把默认样式（标题、角标、标签）调好，
//       一万张商品卡片全部克隆自这个模板，各自只改 sku 和标题。
//
// 关键陷阱：Kotlin data class 的 copy() 是【浅拷贝】——引用类型字段（如 MutableList）克隆后仍然共享。
//
// 运行：kotlinc P12_Prototype.kt -include-runtime -d p12.jar && java -jar p12.jar

data class CardTemplate(
    val skuId: String,
    val title: String,
    var showStockHint: Boolean = true,
    var tags: MutableList<String> = mutableListOf(),
)

fun main() {
    // 运营调好的基准模板
    val base = CardTemplate(
        skuId = "TEMPLATE",
        title = "默认标题",
        tags = mutableListOf("大促", "包邮"),
    )

    println("── 正常用法：克隆后只改差异字段，其余全部继承模板 ──")
    val cardA = base.copy(skuId = "8001", title = "无线机械键盘")
    println("卡片A: $cardA")

    println("\n── 陷阱演示：copy() 是浅拷贝，tags 列表是共享的 ──")
    val cardB = base.copy(skuId = "8002", title = "电竞显示器")
    cardB.tags.add("限时秒杀")            // 只想改 B 的标签……
    println("改完 cardB.tags 后，base.tags  = ${base.tags}")   // 模板被污染了！
    println("改完 cardB.tags 后，cardA.tags = ${cardA.tags}")  // 之前克隆的 A 也被污染了！

    println("\n── 修正：克隆时对可变字段做深拷贝 ──")
    val safe = base.copy(skuId = "8003", title = "人体工学椅", tags = base.tags.toMutableList())
    safe.tags.add("赠品")
    println("safe.tags = ${safe.tags}")
    println("base.tags = ${base.tags}（未受影响）")

    println()
    println("要点：字段尽量用不可变类型（List 而非 MutableList），浅拷贝陷阱从根上消失；")
    println("     Kotlin 的 copy() 就是语言内置的原型模式支持，一般无需再手写 clone()。")
}
