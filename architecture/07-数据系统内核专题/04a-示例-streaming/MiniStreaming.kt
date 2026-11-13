// MiniStreaming.kt —— 迷你流处理：事件时间滚动窗口 + 水位线 + 迟到侧输出 + 崩溃重放与幂等汇（有效一次）
//
// 与 [04-批处理与流处理.md] 第 2、4 节配套，四幕连演：
//   ① 事件时间窗口与水位线：乱序到达的水表读数仍按“发生时间”落窗，窗口在水位线越过终点时触发；
//   ② 迟到数据：窗口已关才到的读数进侧输出（批修正通道），不污染已发布的窗口结果；
//   ③ 处理时间窗口的错口径对照：同一批数据按“到达时间”落窗，断网补传的量掉进今天——口径就错了；
//   ④ 崩溃重放 + 幂等汇 = 有效一次：从检查点重放不改变最终结果；对照“追加式汇”直接把数翻倍。
//
// 简化声明（对照真实引擎要知道差在哪）：
//   - 事件按列表顺序模拟“到达”；真实引擎的到达顺序由网络/分区决定；
//   - 水位线只做“maxSeen − Δ”的有界乱序；真实引擎还有跨输入通道取 min、空闲源处理；
//   - 检查点是“处理到的下标 + 已发布窗口”的浅拷贝；真实引擎是 barrier 对齐后的异步持久化快照；
//   - 幂等汇用 Map 覆盖写模拟 upsert；真实实现是 DB 主键 upsert / Kafka 事务。
//
// 运行：kotlinc MiniStreaming.kt -include-runtime -d ministream.jar && java -jar ministream.jar

data class MeterEvent(val meter: String, val eventSec: Int, val liters: Int)

// ---------- 事件时间滚动窗口 + 水位线 ----------
class WindowState(val key: String, val start: Int, val size: Int) {
    var sum = 0
    var count = 0
    var fired = false
    val end get() = start + size
    val id get() = "[$start,${end})"
    override fun toString() = "$key@$id = ${sum}L/${count}条"
}

class MiniStreamEngine(private val windowSize: Int, private val maxLateness: Int) {
    val windows = LinkedHashMap<String, WindowState>()   // (key,start) → 状态
    val lateEvents = mutableListOf<MeterEvent>()          // 侧输出
    var watermark = -1                                    // 当前水位线（事件时间轴）

    private fun wmKey(k: String, s: Int) = "$k#$s"

    // 事件到达：先判迟到（窗口终点已被水位线越过），再落窗，再推水位线并触发到期的窗口
    fun accept(e: MeterEvent): List<WindowState> {
        val start = (e.eventSec / windowSize) * windowSize
        if (start + windowSize <= watermark) {            // 水位线已越过窗口终点 → 迟到
            lateEvents += e
            return emptyList()
        }
        val w = windows.getOrPut(wmKey(e.meter, start)) { WindowState(e.meter, start, windowSize) }
        w.sum += e.liters; w.count++
        watermark = maxOf(watermark, e.eventSec - maxLateness)
        return fireDue()
    }

    // 水位线越过终点的窗口 → 触发（输出），标记已关
    fun fireDue(): List<WindowState> =
        windows.values.filter { !it.fired && it.end <= watermark }.onEach { it.fired = true }

    // 流结束：剩余窗口全部触发（终极水位线 = +∞）
    fun endOfStream(): List<WindowState> =
        windows.values.filter { !it.fired }.onEach { it.fired = true }
}

// ---------- 幂等汇 vs 追加汇（有效一次的对照） ----------
class IdempotentSink {   // upsert：按 (meter, windowStart) 覆盖写，重放不重复
    val table = sortedMapOf<String, Int>()
    fun upsert(w: WindowState) { table["${w.key} ${w.id}"] = w.sum }
}

class AppendSink {       // 追加：重放一次就多计一次
    val rows = mutableListOf<String>()
    var total = 0
    fun append(w: WindowState) { rows += w.toString(); total += w.sum }
}

// ---------- 演示数据：水表读数（事件时间秒），到达顺序 = 列表顺序（故意乱序 + 一条断网补传） ----------
private val feed = listOf(
    MeterEvent("meter-A", 1, 10), MeterEvent("meter-A", 4, 8),      // 窗口 [0,10)
    MeterEvent("meter-B", 2, 12),                                    // meter-B 窗口 [0,10)
    MeterEvent("meter-A", 12, 6), MeterEvent("meter-A", 9, 7),      // 9 先到 12 后到：乱序但未迟到
    MeterEvent("meter-B", 15, 5),                                    // 推高水位线 → [0,10) 即将到期
    MeterEvent("meter-A", 17, 4),                                    // 水位线 = 17-5 = 12 → [0,10) 触发
    MeterEvent("meter-B", 22, 9), MeterEvent("meter-A", 25, 3),     // [10,20) 陆续到期
    MeterEvent("meter-B", 31, 6),                                    // 水位线 = 26 → [20,30) 触发
    MeterEvent("meter-A", 3, 11),                                    // ★ 断网补传：事件时间 3，窗口早已关闭
)

fun main() {
    val WINDOW = 10
    val DELTA = 5   // 有界乱序：允许的最大乱差（改参实验：调小 → 补传更容易迟到；调大 → 触发更晚）

    println("== ① 事件时间窗口 + 水位线（Δ=$DELTA 秒）：乱序到达，仍按发生时间落窗 ==")
    val sink = IdempotentSink()
    val engine = MiniStreamEngine(WINDOW, DELTA)
    val allFired = mutableListOf<WindowState>()
    feed.forEach { e ->
        val fired = engine.accept(e)
        allFired += fired
        println("   到达 ${e}（水位线→${engine.watermark}）" + fired.joinToString("") { "  ⇒ 触发窗口 $it" })
    }
    val finalFired = engine.endOfStream()
    allFired += finalFired
    finalFired.forEach { println("   流结束 ⇒ 触发窗口 $it") }
    allFired.forEach(sink::upsert)   // 幂等汇最终落表（含中途触发的窗口）
    println("   幂等汇最终表：${sink.table}")

    println()
    println("== ② 迟到数据走侧输出（不污染已发布的窗口）==")
    println("   侧输出：${engine.lateEvents} → 交给批处理修正/对账通道，不并入任何已触发窗口")

    println()
    println("== ③ 对照：同一批数据若按“处理时间（到达顺序）”落窗 ==")
    // 用到达序号当时间开窗：断网补传的第 10 条与第 9 条（事件时间 31）同窗——口径立刻错位
    val ptBuckets = LinkedHashMap<Int, MutableList<MeterEvent>>()
    feed.forEachIndexed { i, e -> ptBuckets.getOrPut(i / 3) { mutableListOf() }.add(e) }   // 每 3 条一个“处理窗口”
    ptBuckets.forEach { (w, es) ->
        println("   处理窗口#$w 收 ${es.size} 条，事件时间却横跨 ${es.map { it.eventSec }} ——补传数据被记进了“现在”")
    }

    println()
    println("== ④ 崩溃重放：幂等汇 = 有效一次，追加汇 = 双倍计数 ==")
    // 场景：检查点记录的位移是 5；崩溃前引擎其实已经跑完整条流、窗口全部发布到了汇——
    //      恢复后从位移 5 重放，已发布的窗口会被“再次发布”（至少一次的真实形态）
    val checkpointOffset = 5

    val crashedFired = mutableListOf<WindowState>()        // 崩溃前已发布的窗口
    val crashedEngine = MiniStreamEngine(WINDOW, DELTA)
    feed.forEach { crashedFired += crashedEngine.accept(it) }
    crashedFired += crashedEngine.endOfStream()

    val refired = mutableListOf<WindowState>()             // 恢复重放后再次发布的窗口
    val recoveredEngine = MiniStreamEngine(WINDOW, DELTA)
    feed.take(checkpointOffset).forEach { recoveredEngine.accept(it) }   // 重建检查点时刻的状态
    feed.drop(checkpointOffset).forEach { refired += recoveredEngine.accept(it) }  // 重放
    refired += recoveredEngine.endOfStream()

    val idem = IdempotentSink().also { s -> (crashedFired + refired).forEach(s::upsert) }  // 重复发布被覆盖写消化
    val app = AppendSink().also { s -> (crashedFired + refired).forEach(s::append) }       // 重复发布被当成新数据
    val baseTotal = crashedFired.sumOf { it.sum }

    println("   检查点位移=$checkpointOffset；崩溃前已发布 ${crashedFired.size} 个窗口，恢复后重放又发布 ${refired.size} 个（同一批）")
    println("   幂等汇最终：${idem.table}")
    println("   ⇒ 覆盖写消化了重复（有效一次成立）")
    println("   追加汇合计 ${app.total}L vs 基准 $baseTotal L —— 追加式汇重放必重复，多出来的 ${app.total - baseTotal}L 就是虚增")
}
