// GossipAndCrdt.kt —— push-pull 反熵的 O(log n) 收敛 + G-Counter 的 CRDT 收敛
//
// 场景：物联网平台。① 新接入的网关把"采集配置 v7"扩散到全集群（Gossip）；
//       ② 三地副本各自累加"今日上报条数"，乱序、重复同步后仍收敛到同一总数（CRDT）。
//
// 运行：kotlinc GossipAndCrdt.kt -include-runtime -d gossip.jar && java -jar gossip.jar

import kotlin.random.Random

// ============ Part A：push-pull 反熵 ============
// 每轮每个节点随机挑一个邻居，双向交换（push 自己知道的 + pull 对方知道的）。
// 用"知情节点数"每轮近似翻倍来体会 O(log n)：10 个节点三四轮，100 个节点十轮上下。
fun gossipRounds(n: Int, rnd: Random, verbose: Boolean): Int {
    val knowing = BooleanArray(n).also { it[0] = true }   // 节点0 最先知道新配置
    var round = 0
    while (knowing.any { !it }) {
        round++
        // 每个节点（无论知不知情）都随机挑一个邻居交换；知情状态先记账、轮末统一落地，
        // 模拟"一轮"内消息并行传播。任一方知情，交换后双方都知情 —— push-pull 双向。
        val newly = BooleanArray(n)
        for (i in 0 until n) {
            var peer = rnd.nextInt(n)
            if (peer == i) peer = (i + 1) % n             // 不与自己交换
            if (knowing[i] || knowing[peer]) { newly[i] = true; newly[peer] = true }
        }
        for (i in 0 until n) if (newly[i]) knowing[i] = true
        if (verbose) println("  第 $round 轮后，知情 ${knowing.count { it }}/$n")
    }
    return round
}

// ============ Part B：G-Counter（CRDT）============
class GCounter(val replicas: Int) {
    private val counts = LongArray(replicas)              // counts[i] = 副本 i 自己累加的量
    fun increment(replica: Int, by: Long = 1) { counts[replica] += by }   // 只写自己的格
    val value: Long get() = counts.sum()
    fun merge(other: GCounter) {                          // max：交换 + 结合 + 幂等
        for (i in 0 until replicas) counts[i] = maxOf(counts[i], other.counts[i])
    }
    fun snapshot(): GCounter = GCounter(replicas).also { c -> System.arraycopy(counts, 0, c.counts, 0, replicas) }
}

fun main() {
    // ---- Gossip：10 节点逐轮围观，100 节点只报轮次 ----
    println("== Gossip：push-pull 反熵把「采集配置 v7」扩散到全集群 ==")
    val rounds10 = gossipRounds(10, Random(42), verbose = true)
    val rounds100 = (1..5).map { gossipRounds(100, Random(it), verbose = false) }
    println("10 节点收敛轮次：$rounds10")
    println("100 节点收敛轮次（5 次不同随机种子）：$rounds100")
    println("→ 节点 ×10、轮次只多了约 3（2^3≈8）：这就是 O(log n) 的手感")

    // ---- CRDT：三个边缘机房各数各的，乱序 + 重复同步仍收敛 ----
    println()
    println("== CRDT：G-Counter 统计「今日上报条数」 ==")
    val beijing = GCounter(3)      // 副本编号 0
    val shanghai = GCounter(3)     // 副本编号 1
    val shenzhen = GCounter(3)     // 副本编号 2
    repeat(120) { beijing.increment(0) }     // 北京机房本地计数
    repeat(80) { shanghai.increment(1) }
    repeat(50) { shenzhen.increment(2) }
    println("同步前：京=${beijing.value} 沪=${shanghai.value} 深=${shenzhen.value}（各数各的）")

    // 反熵两两 merge——顺序刻意打乱，且深→沪同一份快照被合了两次（模拟消息重复）
    shanghai.merge(shenzhen.snapshot())
    beijing.merge(shanghai.snapshot())       // 乱序：北京拿到的是"沪已合并深"之后的状态
    beijing.merge(shenzhen.snapshot())       // 重复：深的数据再次到达
    shenzhen.merge(beijing.snapshot())
    shanghai.merge(beijing.snapshot())

    println("同步后：京=${beijing.value} 沪=${shanghai.value} 深=${shenzhen.value}")
    check(beijing.value == shanghai.value && shanghai.value == shenzhen.value && beijing.value == 250L) {
        "CRDT 未收敛！"
    }
    println("→ 全部收敛到 250（120+80+50），乱序与重复同步都无害：merge 的交换/结合/幂等保证了这一点")
}
