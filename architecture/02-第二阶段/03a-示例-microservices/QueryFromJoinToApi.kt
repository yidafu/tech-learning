// QueryFromJoinToApi.kt —— 拆库之后，跨服务查询怎么补：join → API 组合 → 事件复制
//
// 场景：桶装水"我的订单"页 = 订单行 + 配送状态。单体时代一条 SQL join 搞定；
//       拆出配送服务后 join 没了，依次演示三种替代方案的往返次数与延迟代价。
//       "网络往返"用计数器模拟（每次 +2ms，不真睡），数字可复现。
//
// 运行：kotlinc QueryFromJoinToApi.kt -include-runtime -d query-join-api.jar && java -jar query-join-api.jar

import kotlin.random.Random

const val PER_ROUNDTRIP_MS = 2.0

class NetMeter {
    var calls = 0
    var ms = 0.0
    fun call() { calls++; ms += PER_ROUNDTRIP_MS }
    override fun toString(): String = "网络往返 $calls 次，累计模拟延迟 ${"%.0f".format(ms)}ms"
}

data class OrderRow(val id: String, val note: String)
data class DeliveryTask(val orderId: String, val status: String, val driver: String)
data class DeliveryStatusChanged(val orderId: String, val status: String)   // 配送域发出的领域事件

// 订单服务的本地读模型：订阅配送事件维护只读副本（CQRS 读侧的最小形态）
class OrderQueryService {
    private val statusByOrder = mutableMapOf<String, String>()
    fun onEvent(e: DeliveryStatusChanged) { statusByOrder[e.orderId] = e.status }   // 同键覆盖 = 天然幂等
    fun statusOf(orderId: String): String = statusByOrder[orderId] ?: "UNKNOWN"
}

fun main() {
    val rng = Random(42)
    val statuses = listOf("PENDING_DISPATCH", "EN_ROUTE", "DELIVERED")
    val orders = List(500) { OrderRow("ORD-%04d".format(it), "备注$it") }
    val tasks = List(500) { DeliveryTask("ORD-%04d".format(it), statuses[rng.nextInt(statuses.size)], "司机${rng.nextInt(20)}") }
    val taskByOrder = tasks.associateBy { it.orderId }
    val page = orders.take(50)                     // "我的订单"一页 50 单

    println("== 阶段 1：单体共库，一条 SQL join（拆库前基线） ==")
    val m1 = NetMeter(); m1.call()                 // 一次 DB 往返回来全量 join 结果
    println("  ${m1}；50 单一次取齐，强新鲜——但与配送表物理耦合，正是要拆掉的东西")

    println()
    println("== 阶段 2a：拆库后 API 组合——逐单查询（N+1 反模式） ==")
    val m2 = NetMeter()
    val sample2 = page.map { o -> m2.call(); "${o.id} → 配送服务返回 ${taskByOrder.getValue(o.id).status}" }.first()
    println("  示例：$sample2")
    println("  ${m2}；页面延迟 ×25，且配送服务一抖，整个页面跟着抖")

    println()
    println("== 阶段 2b：API 组合——批量接口（首选优化） ==")
    val m3 = NetMeter(); m3.call()                 // 一次批量调用带回 50 单的配送状态
    println("  ${m3}；往返压回 1 次，但读路径仍强依赖配送服务存活")

    println()
    println("== 阶段 3：事件复制本地读（订阅配送事件，本地维护只读状态） ==")
    val m4 = NetMeter()                            // 读页面 = 读自己库：0 次网络往返
    val broker = ArrayDeque(tasks.map { DeliveryStatusChanged(it.orderId, it.status) }.shuffled(rng))
    val query = OrderQueryService()
    repeat(broker.size / 2) { query.onEvent(broker.removeFirst()) }   // 模拟事件滞后：一半还在路上
    val stale = page.count { query.statusOf(it.id) != taskByOrder.getValue(it.id).status }
    println("  事件滞后时读页面：${m4}；$stale/50 单读到旧状态——最终一致的“最终”还没到")
    while (broker.isNotEmpty()) query.onEvent(broker.removeFirst())
    val staleAfter = page.count { query.statusOf(it.id) != taskByOrder.getValue(it.id).status }
    println("  事件追平后再读：不一致 $staleAfter/50 ✅；读路径只依赖事件契约，与配送服务可用性解耦")

    println()
    println("== 三方案对比 ==")
    println("  join（拆库前）  : 1 次往返 | 强新鲜   | 与配送库物理耦合（要拆掉的正是它）")
    println("  API 组合 N+1    : 50 次往返 | 强新鲜   | 延迟放大，可用性受配送服务牵连")
    println("  API 组合（批量）: 1 次往返 | 强新鲜   | 仍需配送服务存活，适合低频页（管理后台）")
    println("  事件复制本地读  : 0 次往返 | 秒级滞后 | 只依赖事件契约，适合高频页（C 端“我的订单”）")
}
