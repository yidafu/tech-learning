// P13_Bridge.kt —— 桥接模式（结构型）
//
// 意图：把"抽象"与"实现"两个独立变化的维度拆开，各自扩展。继承爆炸的解药。
//
// 场景：订单消息通知 = 消息类型（下单/发货/退款）× 发送渠道（短信/邮件/App推送）。
//       用继承实现 3×3 要 9 个类（SmsOrderCreatedNotifier、EmailOrderShippedNotifier……）；
//       桥接后 3 + 3 = 6 个，且任一维度再扩展都只加一个类。
//
// 运行：kotlinc P13_Bridge.kt -include-runtime -d p13.jar && java -jar p13.jar

// ── 实现维度：发送渠道（这个维度还会继续增加：钉钉、飞书、WhatsApp……）──
interface NotifyChannel {
    val name: String
    fun send(to: String, content: String)
}

class SmsChannel : NotifyChannel {
    override val name = "短信"
    override fun send(to: String, content: String) = println("[短信→$to] $content")
}

class EmailChannel : NotifyChannel {
    override val name = "邮件"
    override fun send(to: String, content: String) = println("[邮件→$to] $content")
}

class AppPushChannel : NotifyChannel {
    override val name = "App推送"
    override fun send(to: String, content: String) = println("[推送→$to] $content")
}

// ── 抽象维度：消息类型（持有渠道引用，这个"持有"就是桥）──
abstract class OrderNotifier(protected val channel: NotifyChannel) {
    // 抽象维度里放与"类型、渠道"都无关的公共逻辑（如统一加落款）
    protected fun send(to: String, content: String) {
        channel.send(to, "$content ——由订单系统经${channel.name}发出")
    }

    abstract fun notifyUser(userId: String, orderId: String)
}

class OrderCreatedNotifier(channel: NotifyChannel) : OrderNotifier(channel) {
    override fun notifyUser(userId: String, orderId: String) =
        send(userId, "您的订单 $orderId 已创建，请及时支付")
}

class OrderShippedNotifier(channel: NotifyChannel) : OrderNotifier(channel) {
    override fun notifyUser(userId: String, orderId: String) =
        send(userId, "您的订单 $orderId 已发货，点击查看物流")
}

class RefundNotifier(channel: NotifyChannel) : OrderNotifier(channel) {
    override fun notifyUser(userId: String, orderId: String) =
        send(userId, "您的订单 $orderId 退款已受理")
}

fun main() {
    // 两个维度自由组合，运行时任意搭配
    listOf(
        OrderCreatedNotifier(AppPushChannel()),
        OrderCreatedNotifier(SmsChannel()),
        OrderShippedNotifier(SmsChannel()),
        RefundNotifier(EmailChannel()),
    ).forEach { it.notifyUser("u_42", "o_6001") }

    println()
    println("继承爆炸版：3 类型 × 3 渠道 = 9 个类，每加一个渠道还要再加 3 个；")
    println("桥接版：3 + 3 = 6 个类。判断信号：类名里出现两个维度的拼接（Sms+Shipped+Notifier）时，就该考虑桥接。")
}
