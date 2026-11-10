// P04_Adapter.kt —— 适配器模式（结构型）
//
// 意图：接口不匹配时做"翻译"，让不兼容的双方合作——不改动任何一方。
//
// 场景：新订单系统要预留库存，但库存还在多年前的老系统里：
//       方法名 chk_resv、skuId 是 Int、返回 Int 状态码（0=成功 1=库存不足 2=系统错误）。
//       老系统动不了也不敢动。新系统定义干净接口 InventoryPort，用适配器包住老系统。
//
// 架构视角：这是 DDD"防腐层"在代码级的最小形态——老系统的烂接口烂不到新代码身上。
//
// 运行：kotlinc P04_Adapter.kt -include-runtime -d p04.jar && java -jar p04.jar

// 新系统想要的目标接口（用 String itemId，语义化返回 Boolean）
interface InventoryPort {
    fun reserve(itemId: String, quantity: Int): Boolean
}

// 老系统：命名风格、参数类型、返回值全不一样，且不能改
class LegacyInventorySystem {
    // 简化的老库存表：sku → 剩余数量
    private val stock = mapOf(8001 to 10, 8002 to 0)

    fun chk_resv(skuId: Int, cnt: Int): Int {
        println("[老系统] chk_resv(sku=$skuId, cnt=$cnt)")
        return if ((stock[skuId] ?: 0) >= cnt) 0 else 1
    }
}

// 适配器：持有老系统，把新接口"翻译"到老接口
class LegacyInventoryAdapter(private val legacy: LegacyInventorySystem) : InventoryPort {
    override fun reserve(itemId: String, quantity: Int): Boolean =
        when (legacy.chk_resv(itemId.toInt(), quantity)) {
            0 -> true
            // 1=库存不足 2=系统错误，对新调用方统一表现为"预留失败"
            else -> false
        }
}

fun main() {
    // 新代码视角：只见 InventoryPort，完全不知道老系统的存在
    val inventory: InventoryPort = LegacyInventoryAdapter(LegacyInventorySystem())

    println("── 场景 1：订单含商品 8001 × 2（库存充足）──")
    println("预留结果: ${inventory.reserve("8001", 2)}")

    println("\n── 场景 2：订单含商品 8002 × 1（库存为 0）──")
    println("预留结果: ${inventory.reserve("8002", 1)}")
}
