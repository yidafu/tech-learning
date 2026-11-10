// ContractEvolution.kt —— 契约演化与宽容读者：三代报文 × 三种读者的兼容矩阵
//
// 场景：商品服务返回价格报文，交易服务消费。
//       v1 → v2 只加可选字段（兼容）；v2 → v3 改名 + 改单位（破坏）。
//       严格读者被 v2 锁死；无语义断言的宽容读者在 v3 上静默算错钱；
//       契约测试（结构 + 语义断言）在生产端 CI 卡住 v3；安全走法是迁移期双写。
//
// 运行：kotlinc ContractEvolution.kt -include-runtime -d contract.jar && java -jar contract.jar

typealias Payload = Map<String, Any?>

// ---------- 生产端的三代报文 ----------
fun payloadV1(): Payload = mapOf("itemId" to "SKU-01", "qty" to 2, "price" to 1200L, "currency" to "FEN")
fun payloadV2(): Payload = payloadV1() + ("salePrice" to 999L)      // 兼容演化：只加可选字段
fun payloadV3(): Payload = mapOf("itemId" to "SKU-01", "qty" to 2, "unitPrice" to 1.2, "currency" to "YUAN")  // 破坏：改名 + 改单位
fun payloadV25(): Payload = payloadV1() + ("salePrice" to 999L) + ("amountFen" to 1200L)  // 迁移期双写：新旧字段并存

// ---------- 读者 A：严格解析——schema 外字段直接炸（把生产端锁死） ----------
class StrictReader(private val knownKeys: Set<String>) {
    fun read(p: Payload): Long {
        val unknown = p.keys - knownKeys
        check(unknown.isEmpty()) { "严格解析失败：未知字段 $unknown（生产端从此不敢动报文）" }
        return p.getValue("price") as Long
    }
}

// ---------- 读者 B：宽容读者 + 显式失败（正确姿势：结构宽容、语义不宽容） ----------
object TolerantReader {
    fun read(p: Payload): Long {
        val raw = p["amountFen"] ?: p["price"]
            ?: throw IllegalStateException("契约破坏：价格字段缺失，大声失败，拒绝静默兜底")
        require(raw is Number) { "契约破坏：价格字段类型异常" }
        return raw.toLong()
    }
}

// ---------- 读者 C：宽容但拿 0 兜底（反面教材：结构宽容、语义也宽容） ----------
object NaiveReader {
    fun read(p: Payload): Long = ((p["amountFen"] ?: p["price"]) as? Number)?.toLong() ?: 0L
}

// ---------- 契约测试：生产端 CI 卡口（结构断言 + 语义断言） ----------
class PriceContractTest {
    fun verify(p: Payload): String = when {
        p.keys.none { it == "price" || it == "amountFen" } -> "❌ 卡住：价格字段被移除"
        (p["currency"] as? String) != "FEN" -> "❌ 卡住：单位语义漂移（currency=${p["currency"] ?: "缺失"}）"
        else -> "✅ 契约保持：价格字段存在且单位为分"
    }
}

fun attempt(read: (Payload) -> Long, p: Payload): String =
    runCatching { "${read(p) * 2} 分" }              // qty=2，算两件的总价
        .getOrElse { "💥 ${it.message}" }

fun main() {
    println("== 生产端演化时间线 ==")
    println("v1    price=1200, currency=FEN                     （初始契约：价格为分）")
    println("v2    + salePrice=999                             （只加可选字段——向后兼容）")
    println("v3    price→unitPrice=1.2, currency→YUAN          （破坏：改名 + 改单位）")
    println()

    val v1 = payloadV1(); val v2 = payloadV2(); val v3 = payloadV3()
    val strict = StrictReader(setOf("itemId", "qty", "price", "currency"))

    println("== 消费端三种读者 × 三代报文（读出的是两件商品总价） ==")
    println("◆ 严格解析读者（schema 外字段即炸）")
    println("   v1: ${attempt(strict::read, v1)}")
    println("   v2: ${attempt(strict::read, v2)}   ← 被未知字段锁死：生产端从此不敢加字段")
    println("   v3: ${attempt(strict::read, v3)}")
    println("◆ 宽容读者 + 显式失败（正确姿势）")
    println("   v1: ${attempt(TolerantReader::read, v1)}")
    println("   v2: ${attempt(TolerantReader::read, v2)}   ← 忽略 salePrice，照常工作")
    println("   v3: ${attempt(TolerantReader::read, v3)}   ← 大声失败：不静默兜底")
    println("◆ 坏读者：宽容但拿 0 兜底（反面教材）")
    println("   v1: ${attempt(NaiveReader::read, v1)}")
    println("   v2: ${attempt(NaiveReader::read, v2)}")
    println("   v3: ${attempt(NaiveReader::read, v3)}   ← 不报错，但总价算成 0 分（应付 2400 分）：静默语义漂移")
    println()

    println("== 契约测试（生产端 CI 卡口：结构 + 语义断言） ==")
    val test = PriceContractTest()
    listOf("v1" to v1, "v2" to v2, "v3" to v3).forEach { (name, p) -> println("   $name → ${test.verify(p)}") }
    println()

    println("== 安全走法：v3 改为迁移期双写（v2.5），消费方迁完再删旧字段 ==")
    val v25 = payloadV25()
    println("   生产端: $v25")
    println("   宽容读者读 v2.5: ${attempt(TolerantReader::read, v25)} ✅（新旧字段并存，消费方按自己节奏迁移）")
    println("   契约测试: ${test.verify(v25)}")
    println("   全部消费方迁移完 → 弃用窗口结束 → 删除 price——破坏性变更这才允许发生")
}
