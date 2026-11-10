// P11_AbstractFactory.kt —— 抽象工厂模式（创建型）
//
// 意图：创建"一族必须配套使用"的对象，结构上杜绝混搭。
//       与工厂方法（P01）的区别：工厂方法造"一个"对象；抽象工厂造"一套"对象。
//
// 场景：订单发货要对接物流服务商。顺丰族和京东族各有两个组件：
//       运单客户端 + 轨迹查询客户端。两者必须同族——顺丰开单配京东查轨迹，数据必然对不上。
//
// 运行：kotlinc P11_AbstractFactory.kt -include-runtime -d p11.jar && java -jar p11.jar

interface WaybillClient {
    fun createWaybill(orderId: String): String
}

interface TrackingClient {
    fun latestTrace(orderId: String): String
}

// ── 顺丰族 ──
class SfWaybillClient : WaybillClient {
    override fun createWaybill(orderId: String) = "SF 单号 SF${orderId.takeLast(4)}（顺丰开单）"
}

class SfTrackingClient : TrackingClient {
    override fun latestTrace(orderId: String) = "[顺丰轨迹] 已到达【杭州转运中心】"
}

// ── 京东族 ──
class JdWaybillClient : WaybillClient {
    override fun createWaybill(orderId: String) = "JD 单号 JD${orderId.takeLast(4)}（京东开单）"
}

class JdTrackingClient : TrackingClient {
    override fun latestTrace(orderId: String) = "[京东轨迹] 已到达【上海亚洲一号】"
}

// 抽象工厂：一个工厂负责产出整族组件
interface LogisticsFactory {
    val provider: String
    fun waybillClient(): WaybillClient
    fun trackingClient(): TrackingClient
}

object SfLogisticsFactory : LogisticsFactory {
    override val provider = "顺丰"
    override fun waybillClient() = SfWaybillClient()
    override fun trackingClient() = SfTrackingClient()
}

object JdLogisticsFactory : LogisticsFactory {
    override val provider = "京东"
    override fun waybillClient() = JdWaybillClient()
    override fun trackingClient() = JdTrackingClient()
}

// 发货服务只依赖抽象工厂：拿到的一定是同族组件，结构上杜绝混搭
class ShippingService(private val factory: LogisticsFactory) {
    fun ship(orderId: String) {
        println("── 使用【${factory.provider}】发货 ──")
        println(factory.waybillClient().createWaybill(orderId))
        println(factory.trackingClient().latestTrace(orderId))
    }
}

fun main() {
    // 商家 A 签约顺丰、商家 B 签约京东：换物流商 = 换一个工厂对象，发货服务零改动
    ShippingService(SfLogisticsFactory).ship("o_7001")
    println()
    ShippingService(JdLogisticsFactory).ship("o_7002")

    println("\n要点：族的划分要稳定——族成员经常增减时，抽象工厂接口跟着改，会退化成负资产。")
}
