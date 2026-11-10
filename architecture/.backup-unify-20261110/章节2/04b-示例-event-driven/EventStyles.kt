// EventStyles.kt —— 事件该带多少数据：事件通知 vs 事件携带状态转移（ECST）
//
// 场景：工单中心。工程师解决了一张工单，发布"工单已解决"事件。
//       三个订阅者：① 通知服务（给提单者发 IM）② 运营看板（按分类统计解决量）
//                   ③ SLA 服务（结算是否超时）
// 对照三种事件形态的代价：瘦事件（回查风暴 + 时点漂移）、胖事件（契约耦合）、
//                         事件携带状态转移（零回查 + 事发时点的事实快照）。
//
// 运行：kotlinc EventStyles.kt -include-runtime -d eventstyles.jar && java -jar eventstyles.jar

import java.time.Duration
import java.time.Instant

// ---------- 工单：生产者一侧的实体（含消费者根本不需要的大字段） ----------
data class TicketEntity(
    val id: String,
    val title: String,
    var category: String,          // 会事后纠错改判，用来演示"时点漂移"
    val reporterId: String,
    val assigneeId: String,
    val createdAt: Instant,
    var resolvedAt: Instant?,
    var resolutionNote: String?,   // 解决说明，只有详情页用
    val diagnostics: String,       // 2KB 诊断日志，任何事件消费者都不需要
)

// 工单查询接口：事件通知风格的消费者靠它回查
class TicketQueryService(private val tickets: MutableMap<String, TicketEntity>) {
    var queryCount = 0
        private set
    fun load(ticketId: String): TicketEntity {
        queryCount++               // 回查计数——瘦事件的隐藏账单
        return tickets.getValue(ticketId)
    }
}

// ---------- 风格 A：事件通知——只带 ID，谁要数据谁回查 ----------
data class TicketResolvedNotification(val ticketId: String)

class NotifierA(private val query: TicketQueryService) {
    fun onEvent(e: TicketResolvedNotification) {
        val t = query.load(e.ticketId)          // 回查 ①：要 reporterId 才知道发给谁
        println("  [A·通知] 已通知提单者 ${t.reporterId}")
    }
}
class DashboardA(private val query: TicketQueryService) {
    fun onEvent(e: TicketResolvedNotification) {
        val t = query.load(e.ticketId)          // 回查 ②：要 category 才知道计入哪类
        println("  [A·看板] 解决量计入分类：${t.category}")
    }
}
class SlaA(private val query: TicketQueryService) {
    fun onEvent(e: TicketResolvedNotification) {
        val t = query.load(e.ticketId)          // 回查 ③：要两个时间点才能算时长
        val hours = Duration.between(t.createdAt, t.resolvedAt!!).toMinutes() / 60.0
        println("  [A·SLA] 解决耗时 ${hours}h")
    }
}

// ---------- 风格 B：胖事件——把整个实体塞进事件（3.1 反例的事件版回放） ----------
data class TicketResolvedFat(val ticket: TicketEntity)

fun consumeFat(e: TicketResolvedFat) {
    println("  [B·胖事件] payload 连实体带诊断日志共 ${e.ticket.diagnostics.length} 字符冗余——" +
            "三个消费者只用其中一半字段；工单实体加一个字段，全体消费者契约跟着变")
}

// ---------- 风格 C：事件携带状态转移（ECST）——带"事发时点"的最小事实快照 ----------
data class TicketResolved(
    val ticketId: String,
    val reporterId: String,       // 通知服务要
    val category: String,         // 看板要（解决时点的分类，而非消费时点的）
    val resolvedAt: Instant,      // SLA 要
    val resolveMinutes: Long,     // 事发时点就算好，消费者连算都不用算
)

class NotifierC {
    fun onEvent(e: TicketResolved) = println("  [C·通知] 已通知提单者 ${e.reporterId}（零回查）")
}
class DashboardC {
    val resolvedByCategory = mutableMapOf<String, Int>()
    fun onEvent(e: TicketResolved) {
        resolvedByCategory.merge(e.category, 1, Int::plus)   // 物化本地副本，读再也不依赖工单服务
        println("  [C·看板] 解决量计入分类：${e.category}（零回查）")
    }
}
class SlaC {
    fun onEvent(e: TicketResolved) =
        println("  [C·SLA] 是否超时：${if (e.resolveMinutes > 240) "超时" else "达标"}")
}

fun main() {
    val ticket = TicketEntity(
        id = "T-1001", title = "3 号产线水压报警", category = "机械故障",
        reporterId = "user-张三", assigneeId = "eng-李四",
        createdAt = Instant.parse("2026-11-03T08:00:00Z"),
        resolvedAt = Instant.parse("2026-11-03T11:30:00Z"),
        resolutionNote = "更换密封圈后复压正常",
        diagnostics = "x".repeat(2048),
    )
    val query = TicketQueryService(mutableMapOf(ticket.id to ticket))

    println("【风格 A：事件通知——瘦到只剩 ID，代价是回查风暴】")
    val n = TicketResolvedNotification(ticket.id)
    NotifierA(query).onEvent(n)
    DashboardA(query).onEvent(n)
    SlaA(query).onEvent(n)
    println("  → 一次解决事件回查工单接口 ${query.queryCount} 次；订阅者翻倍、回查翻倍；")
    println("    查询接口一挂，全体消费者瘫——事件买来的解耦被回查卖了回去")

    // 事后纠错：解决事件已发出，但工单随后被改判分类
    ticket.category = "电气故障"
    println()
    println("（运营随后把工单改判为「${ticket.category}」——而解决事件早已发出）")
    println("【风格 A 续：回查拿到的是'当前'状态 → 时点漂移】")
    DashboardA(query).onEvent(n)
    println("  → 同一张工单的解决被看板先后计入「机械故障」「电气故障」两个分类，统计口径悄悄失真")

    println()
    println("【风格 B：胖事件——把实体整个塞进事件（3.1 反例回放）】")
    consumeFat(TicketResolvedFat(ticket))

    println()
    println("【风格 C：事件携带状态转移——带事发时点的事实快照】")
    val e = TicketResolved(
        ticketId = ticket.id,
        reporterId = ticket.reporterId,
        category = "机械故障",                       // 事发时点的分类，改判不回头污染
        resolvedAt = ticket.resolvedAt!!,
        resolveMinutes = Duration.between(ticket.createdAt, ticket.resolvedAt!!).toMinutes(),
    )
    val before = query.queryCount
    NotifierC().onEvent(e)
    val dashC = DashboardC()
    dashC.onEvent(e)
    SlaC().onEvent(e)
    println("  → 本次回查 ${query.queryCount - before} 次；看板物化本地副本 ${dashC.resolvedByCategory}；" +
            "工单服务从此挂掉也不影响消费")
    println()
    println("  边界：ECST ≠ 胖事件——只带消费者决策所需的事实字段，" +
            "诊断日志、解决说明一概不带；判据是'谁要用来做决定'，不是'实体里有什么'")
}
