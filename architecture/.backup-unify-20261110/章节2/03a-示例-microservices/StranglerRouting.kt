// StranglerRouting.kt —— 绞杀者模式：影子对拍、按站灰度、失败率自动回滚
//
// 场景：桶装水商城把"配送排线"从单体拆成独立排线服务。
//       旧单体排线模块沉淀了五年热修攒下的补丁规则；新服务 v1 漏了"婚庆大单"规则，
//       影子对拍把它暴露出来；修复后按配送站灰度放量，新服务故障时自动全量回滚。
//
// 运行：kotlinc StranglerRouting.kt -include-runtime -d strangler.jar && java -jar strangler.jar

import kotlin.random.Random

// ---------- 领域模型 ----------
data class DeliveryOrder(
    val id: String,
    val stationId: String,          // 配送站：灰度切换的自然维度（一站要么全新要么全旧）
    val buckets: Int,
    val tag: Tag,
) { enum class Tag { NORMAL, MOUNTAIN_TOP, WEDDING, RAINY } }

data class RoutePlan(val routeCount: Int, val driverCount: Int, val etaMinutes: Int)

// ---------- 排线逻辑本体：补丁规则显式化 ----------
fun baselinePlan(o: DeliveryOrder, weddingPatch: Boolean): RoutePlan {
    var drivers = 1
    var eta = 60
    if (o.buckets > 120) drivers += 1               // 大单双司机
    when (o.tag) {
        DeliveryOrder.Tag.MOUNTAIN_TOP -> { drivers += 1; eta += 30 }               // 山顶配送：加人加时
        DeliveryOrder.Tag.WEDDING -> if (weddingPatch) { drivers += 1; eta += 45 }  // 婚庆大单：加人加时分两趟
        DeliveryOrder.Tag.RAINY -> eta += 20        // 暴雨加时
        DeliveryOrder.Tag.NORMAL -> {}
    }
    val routes = if (o.tag == DeliveryOrder.Tag.WEDDING && weddingPatch) 2 else 1
    return RoutePlan(routes, drivers, eta)
}

// 旧单体排线模块：五年攒下的补丁规则全都在
class LegacyRouter {
    fun plan(o: DeliveryOrder): RoutePlan = baselinePlan(o, weddingPatch = true)
}

// 新排线服务：v1 还没移植婚庆补丁；会故障；修复后与旧模块行为对等
class NewRouteService {
    private var weddingPatch = false
    private var healthy = true

    fun portWeddingPatch() { weddingPatch = true }
    fun setHealthy(h: Boolean) { healthy = h }

    fun plan(o: DeliveryOrder): RoutePlan {
        check(healthy) { "新排线服务故障：地图依赖超时（模拟）" }
        return baselinePlan(o, weddingPatch)
    }
}

// ---------- 绞杀者网关：第 1 步立分流入口，之后承载第 2、3 步 ----------
class ShadowReport(val total: Int, val diffLines: List<String>) {
    override fun toString(): String = buildString {
        appendLine("影子对拍 $total 单：")
        if (diffLines.isEmpty()) appendLine("  ✅ 新旧行为完全一致，可以放量")
        else {
            appendLine("  ⚠️ ${diffLines.size} 单不一致（前 5 条）：")
            diffLines.take(5).forEach { appendLine("    $it") }
        }
    }
}

class StranglerGateway(private val legacy: LegacyRouter, private val next: NewRouteService) {

    // 第 2 步：影子对拍——同一批历史工单发新旧两边，只比对不生效
    fun shadow(historical: List<DeliveryOrder>): ShadowReport {
        val diffs = mutableListOf<String>()
        for (o in historical) {
            val oldPlan = legacy.plan(o)
            val newPlan = runCatching { next.plan(o) }.getOrDefault(RoutePlan(-1, -1, -1))
            if (oldPlan != newPlan) diffs += "${o.id} [${o.stationId}/${o.tag}] 旧=$oldPlan 新=$newPlan"
        }
        return ShadowReport(historical.size, diffs)
    }

    // 第 3 步：灰度切流——stationEnabled 里的站走新服务；单笔失败即时回落旧模块；
    //          失败率超阈值则全量回滚（旧模块是回滚保险，收尾前不能删）
    fun serveCanary(
        live: List<DeliveryOrder>,
        initialStations: Set<String>,
        rollbackAt: Double,
        outage: IntRange = IntRange.EMPTY,          // 模拟新服务在 [from, to] 下标区间故障
    ): List<String> {
        val log = mutableListOf<String>()
        var enabled = initialStations
        var succ = 0; var fail = 0; var fallback = 0
        var outageOn = false
        for ((i, o) in live.withIndex()) {
            if (i in outage && !outageOn) { next.setHealthy(false); outageOn = true; log += "💥 [模拟] 新排线服务开始故障" }
            if (outageOn && i !in outage) { next.setHealthy(true); outageOn = false; log += "🔧 [模拟] 新排线服务恢复" }
            if (o.stationId in enabled) {
                try {
                    next.plan(o); succ++
                } catch (e: IllegalStateException) {
                    fail++; legacy.plan(o); fallback++
                    log += "⚠️ ${o.id} 新服务失败 → 即时回落旧模块（累计失败 $fail）"
                    val rate = fail.toDouble() / (succ + fail)
                    if (rate > rollbackAt && enabled.isNotEmpty()) {
                        log += "🛑 失败率 ${"%.1f".format(rate)} > 阈值 $rollbackAt → 全部配送站回滚旧模块"
                        enabled = emptySet()
                    }
                }
            } else {
                legacy.plan(o)
            }
        }
        log += "📊 本轮结束：新服务成功 $succ / 失败 $fail / 回落兜底 $fallback / 仍切新服务的站点 ${enabled.size} 个"
        return log
    }
}

fun main() {
    val rng = Random(42)
    val stations = (1..10).map { "S%02d".format(it) }
    val legacy = LegacyRouter()
    val next = NewRouteService()
    val gateway = StranglerGateway(legacy, next)

    fun tagOf(r: Double): DeliveryOrder.Tag = when {
        r < 0.05 -> DeliveryOrder.Tag.MOUNTAIN_TOP
        r < 0.07 -> DeliveryOrder.Tag.WEDDING
        r < 0.17 -> DeliveryOrder.Tag.RAINY
        else -> DeliveryOrder.Tag.NORMAL
    }
    fun gen(n: Int, prefix: String): List<DeliveryOrder> = List(n) { i ->
        DeliveryOrder("ORD-$prefix-%04d".format(i), stations[rng.nextInt(stations.size)], 1 + rng.nextInt(240), tagOf(rng.nextDouble()))
    }

    println("== 第 1 步：立分流入口（网关可按站把请求路由到新旧两条路径） ==")
    println()
    println("== 第 2 步：影子对拍（历史流量，只比对不生效） ==")
    println(gateway.shadow(gen(2000, "H")))
    println("--> 差异定位：新服务漏移植『婚庆大单』补丁规则，修复")
    next.portWeddingPatch()
    println(gateway.shadow(gen(2000, "H2")))
    println()
    println("== 第 3 步：灰度切流（先切 S03、S07 两站，失败率阈值 5%，第 600~799 单模拟故障） ==")
    gateway.serveCanary(gen(2000, "L"), setOf("S03", "S07"), rollbackAt = 0.05, outage = 600..799).forEach { println("  $it") }
    println()
    println("== 第 4 步：收尾（全部站点 100% 切新服务） ==")
    gateway.serveCanary(gen(2000, "F"), stations.toSet(), rollbackAt = 0.05).forEach { println("  $it") }
    println("  旧排线模块冻结一个月（只修不加），跨过一次完整月结后删除旧代码与表")
}
