// DepositSchemaUpcast.kt —— 事件 schema 演进：读时升级（upcasting）
//
// 背景：2024 年押金全站统一 50 元/桶，事件 DepositPaidV1 只记桶数；
//       2025 年支持按桶型定价，新事件 DepositPaidV2 带上单价。
//       历史事件一条都不改——回放时读出 V1，按"当时的业务事实"补齐单价再进 fold。
//
// 运行：kotlinc DepositSchemaUpcast.kt -include-runtime -d upcast.jar && java -jar upcast.jar

import java.time.Instant

// 老库里存着的 v1 事件（只追加，永不改写）
data class DepositPaidV1(val userId: String, val bucketCount: Int, val at: Instant)

// v2：单价进入事件（业务演进：桶型不同押金不同）
data class DepositPaidV2(val userId: String, val bucketCount: Int, val unitCents: Long, val at: Instant)

data class DepositRefundedV1(val userId: String, val bucketCount: Int, val refundCents: Long, val at: Instant)

// 升级后的统一事件形态（供聚合 apply）
sealed interface DepositEvent {
    data class Paid(val userId: String, val bucketCount: Int, val unitCents: Long) : DepositEvent
    data class Refunded(val userId: String, val bucketCount: Int, val refundCents: Long) : DepositEvent
}

// 读时升级：从存储层读出的原始载荷 → 统一形态。
// 补齐规则 = 当时的业务事实（2024 年统一 50 元/桶），写成代码并配测试，绝不回头改数据。
fun upcast(e: Any): DepositEvent = when (e) {
    is DepositPaidV1     -> DepositEvent.Paid(e.userId, e.bucketCount, unitCents = 5_000L)  // 当时的统一价
    is DepositPaidV2     -> DepositEvent.Paid(e.userId, e.bucketCount, e.unitCents)
    is DepositRefundedV1 -> DepositEvent.Refunded(e.userId, e.bucketCount, e.refundCents)
    else -> throw IllegalArgumentException("未知事件形态：$e")
}

data class DepositBalance(val paidCents: Long = 0, val paidBuckets: Int = 0) {
    fun apply(e: DepositEvent): DepositBalance = when (e) {
        is DepositEvent.Paid     -> copy(
            paidCents = paidCents + e.bucketCount * e.unitCents,
            paidBuckets = paidBuckets + e.bucketCount,
        )
        is DepositEvent.Refunded -> copy(paidCents = paidCents - e.refundCents)
    }
}

fun main() {
    // 老账户 user-李四 的原始事件流：两条 2024 年的 v1 + 一条 2025 年的 v2 + 一条退款
    val stored: List<Any> = listOf(
        DepositPaidV1("user-李四", 2, Instant.parse("2024-06-01T09:00:00Z")),             // 2 桶 × 50 元
        DepositPaidV1("user-李四", 1, Instant.parse("2024-11-20T09:00:00Z")),             // 1 桶 × 50 元
        DepositPaidV2("user-李四", 2, unitCents = 8_000L, at = Instant.parse("2025-03-15T09:00:00Z")), // 2 桶 × 80 元
        DepositRefundedV1("user-李四", 1, refundCents = 5_000L, at = Instant.parse("2025-04-02T09:00:00Z")), // 退 1 桶（按 2024 价退 50 元）
    )
    val balance = stored.map(::upcast).fold(DepositBalance()) { b, e -> b.apply(e) }
    println("李四累计押金余额：${balance.paidCents} 分（= 2×50 + 1×50 + 2×80 − 退 50 = 260 元）")
    println("在册押金桶数：${balance.paidBuckets} 桶")
    // 旧事件按当时的统一价补齐单价，与新事件同一条 fold 链回放——历史账目不算错
}
