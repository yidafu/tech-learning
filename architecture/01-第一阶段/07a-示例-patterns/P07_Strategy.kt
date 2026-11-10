// P07_Strategy.kt —— 策略模式（行为型）
//
// 意图：一族可替换的算法，运行时可切换；新增算法不改使用方。OCP 的标准落地姿势。
//
// 场景：结算中心计算应付金额，运营在不同时期上不同促销——
//       平时无优惠、大促满 100 减 20、会员日 VIP 95 折。
//       促销怎么换，CheckoutService 一行都不能改。
//
// 反例对照：if (type == FULL) ... else if (type == VIP) ... —— 每次大促都改结算核心，
//           改错一处全线资损。
//
// 运行：kotlinc P07_Strategy.kt -include-runtime -d p07.jar && java -jar p07.jar

private fun Long.toYuan(): String = "%.2f".format(this / 100.0)

// fun interface：单方法接口，可以用 lambda 直接创建 —— Kotlin 让策略"变轻"的关键
fun interface DiscountPolicy {
    fun discount(amountCents: Long): Long
}

// 复杂策略仍然写成具名类（有参数、有分支逻辑）
data class FullReductionPolicy(
    private val thresholdCents: Long,
    private val reduceCents: Long,
) : DiscountPolicy {
    override fun discount(amountCents: Long): Long =
        if (amountCents >= thresholdCents) amountCents - reduceCents else amountCents
}

// 给 lambda 策略起个名字，日志里能看出当前用的是什么策略
private fun namedPolicy(name: String, calc: (Long) -> Long): DiscountPolicy =
    object : DiscountPolicy {
        override fun discount(amountCents: Long) = calc(amountCents)
        override fun toString() = name
    }

// 结算服务只依赖抽象；policy 用 var，支持运营时期切换
class CheckoutService(var policy: DiscountPolicy) {
    fun payableCents(amountCents: Long): Long {
        val payable = policy.discount(amountCents)
        println("[结算] 原价 ¥${amountCents.toYuan()} → 应付 ¥${payable.toYuan()}（当前策略: $policy）")
        return payable
    }
}

fun main() {
    val checkout = CheckoutService(policy = namedPolicy("无优惠") { it }) // 平时期：原价

    println("── 平时期：无优惠 ──")
    checkout.payableCents(150_00)

    println("\n── 大促时期：满 100 减 20（换策略，结算代码零改动）──")
    checkout.policy = FullReductionPolicy(thresholdCents = 100_00, reduceCents = 20_00)
    checkout.payableCents(150_00)

    println("\n── 会员日：VIP 95 折（一个 lambda 就是一个策略）──")
    checkout.policy = namedPolicy("VIP95折") { it * 95 / 100 }
    checkout.payableCents(150_00)
}
