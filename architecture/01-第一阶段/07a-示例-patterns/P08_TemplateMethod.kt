// P08_TemplateMethod.kt —— 模板方法模式（行为型）
//
// 意图：父类定死流程骨架，子类只填空位。适合"流程固定、步骤实现多变"的场景。
//
// 场景：订单导出流程骨架固定为：校验权限 → 查询数据 → 格式化 → 记录完成。
//       运营要导 CSV、HTML（将来还有 Excel/PDF），各步骤实现不同，但流程顺序不许动——
//       骨架用 final 锁死，子类不可能绕过权限校验。
//
// 三层空位设计：
//   final fun        —— 流程骨架，锁死
//   protected open   —— 钩子，给默认实现，子类按需覆盖
//   protected abstract —— 纯空位，子类必须实现
//
// 运行：kotlinc P08_TemplateMethod.kt -include-runtime -d p08.jar && java -jar p08.jar

abstract class OrderExporter {
    // 模板方法：骨架 final 锁死，子类只能填空位、不能改流程
    final fun export(orderId: String): String {
        checkPermission()               // 钩子：通用步骤有默认实现
        val rows = query(orderId)       // 空位：子类必须实现
        val content = format(rows)      // 空位：子类必须实现
        println("[导出] 完成 orderId=$orderId，格式=${this::class.simpleName}")
        return content
    }

    protected open fun checkPermission() {
        println("[导出] 校验导出权限（所有导出器通用的默认步骤）")
    }

    protected abstract fun query(orderId: String): List<String>
    protected abstract fun format(rows: List<String>): String
}

class CsvOrderExporter : OrderExporter() {
    override fun query(orderId: String) =
        listOf("order_id=$orderId", "status=PAID", "amount_cents=9900")
    override fun format(rows: List<String>) = rows.joinToString("\n")
}

class HtmlOrderExporter : OrderExporter() {
    // 钩子的用法：覆盖通用步骤，追加 HTML 特有的审计动作
    override fun checkPermission() {
        super.checkPermission()
        println("[导出] HTML 含用户隐私字段，额外记录审计日志")
    }
    override fun query(orderId: String) =
        listOf("order_id=$orderId", "status=PAID", "amount_cents=9900")
    override fun format(rows: List<String>) =
        "<table>\n" + rows.joinToString("\n") { "<tr><td>$it</td></tr>" } + "\n</table>"
}

fun main() {
    println("── 场景 1：运营导出 CSV（用默认权限校验）──")
    println(CsvOrderExporter().export("o_2001"))

    println("\n── 场景 2：运营导出 HTML（覆盖钩子，追加审计步骤，但流程顺序不变）──")
    println(HtmlOrderExporter().export("o_2001"))
}
