// P01_Factory.kt —— 工厂方法模式（创建型）
//
// 意图：把"创建哪个对象"的决定收拢到一处；调用方只面向抽象，不关心具体类怎么造。
//
// 场景：电商收银台按用户选择的支付渠道创建支付客户端（支付宝/微信/银联）。
//       运营每接入一个新渠道，收银流程代码必须零修改（OCP）。
//
// 运行：kotlinc P01_Factory.kt -include-runtime -d p01.jar && java -jar p01.jar

// 金额统一用"分"（Long）存储，展示时转成元
private fun Long.toYuan(): String = "%.2f".format(this / 100.0)

interface PaymentClient {
    fun pay(orderId: String, amountCents: Long): String
}

class AlipayClient : PaymentClient {
    override fun pay(orderId: String, amountCents: Long) =
        "【支付宝】订单 $orderId 支付 ¥${amountCents.toYuan()}"
}

class WeChatPayClient : PaymentClient {
    override fun pay(orderId: String, amountCents: Long) =
        "【微信】订单 $orderId 支付 ¥${amountCents.toYuan()}"
}

// 新渠道：只需写这一个实现类，不修改任何老代码
class UnionPayClient : PaymentClient {
    override fun pay(orderId: String, amountCents: Long) =
        "【银联】订单 $orderId 支付 ¥${amountCents.toYuan()}"
}

// ── 版本一：简单工厂（创建逻辑收拢在一个 when 里）──
// 局限：接新渠道仍要改工厂方法体内的 when
object PaymentClientFactory {
    fun create(channel: String): PaymentClient = when (channel) {
        "ALIPAY" -> AlipayClient()
        "WECHAT" -> WeChatPayClient()
        else -> throw IllegalArgumentException("不支持的支付渠道: $channel")
    }
}

// ── 版本二：注册表工厂（满足开闭原则）──
// 接新渠道 = "注册"一个创建函数，工厂本身零改动
object PaymentClientRegistry {
    private val creators = mutableMapOf<String, () -> PaymentClient>()

    fun register(channel: String, creator: () -> PaymentClient) {
        creators[channel] = creator
    }

    fun create(channel: String): PaymentClient =
        creators[channel]?.invoke()
            ?: throw IllegalArgumentException("不支持的支付渠道: $channel")
}

fun main() {
    val orderId = "o_9001"

    println("── 场景 1：用户选支付宝支付 ──")
    println(PaymentClientFactory.create("ALIPAY").pay(orderId, 9_900))

    println("\n── 场景 2：用户选微信支付 ──")
    println(PaymentClientFactory.create("WECHAT").pay(orderId, 15_800))

    println("\n── 场景 3：运营接入银联新渠道（注册即可，工厂零改动）──")
    PaymentClientRegistry.register("ALIPAY") { AlipayClient() }
    PaymentClientRegistry.register("WECHAT") { WeChatPayClient() }
    PaymentClientRegistry.register("UNIONPAY") { UnionPayClient() }   // ← 只有这一行是新增
    println(PaymentClientRegistry.create("UNIONPAY").pay(orderId, 1_234_00))

    println("\n── 场景 4：传入了不支持的渠道 ──")
    runCatching { PaymentClientRegistry.create("PAYPAL") }
        .onFailure { println("被正确拒绝: ${it.message}") }
}
