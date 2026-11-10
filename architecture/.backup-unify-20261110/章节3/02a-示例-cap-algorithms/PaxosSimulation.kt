// PaxosSimulation.kt —— Paxos 两阶段：安全性、活锁与 Multi-Paxos 的 Leader 化解
//
// 场景：支付与清结算。多个参与方要就"分账比例"达成一致（7:3 还是 6:4）。
//       演示三件事：
//       ① 两阶段如何把一个值"选定"；
//       ② 安全性——后来者哪怕提案号更高，也只能沿用已被多数派接受的值（不许自作主张）；
//       ③ 活锁——两个 Proposer 交替抬号，谁也定不下来；选出稳定 Leader 后 Phase 1 被省掉。
//
// 运行：kotlinc PaxosSimulation.kt -include-runtime -d paxos.jar && java -jar paxos.jar

// ---------- Acceptor：每个表决者只记两样东西 ----------
class Acceptor(val id: Int) {
    var promisedN = 0L                        // 已承诺的最大提案号：不再接受编号更小的提案
    var accepted: Pair<Long, String>? = null  // 已接受的最大编号提案 (n, value)

    fun prepare(n: Long): Boolean {           // Phase 1：Promise
        if (n < promisedN) return false       // 已承诺过更高的编号 → 拒绝
        promisedN = n
        return true
    }

    fun accept(n: Long, value: String): Boolean {  // Phase 2：Accept
        if (n < promisedN) return false
        accepted = n to value
        return true
    }
}

// ---------- Proposer：一轮完整的两阶段 ----------
class Proposer(val id: Long) {
    fun proposeRound(n: Long, selfValue: String, acceptors: List<Acceptor>): String? {
        // Phase 1：向所有人发 Prepare，收 Promise
        val granted = acceptors.filter { it.prepare(n) }
        if (granted.size <= acceptors.size / 2) {
            println("    [P$id] 提案号 $n 只拿到 ${granted.size}/${acceptors.size} 个 Promise → 失败，抬号重试")
            return null
        }
        // ⚠️ 关键不变量：只要有任何一个 Promise 带回了已接受的旧值，就必须放弃自选值改用它
        val carried = granted.mapNotNull { it.accepted }.maxByOrNull { it.first }?.second
        val value = carried ?: selfValue
        if (carried != null && carried != selfValue) {
            println("    [P$id] 想提 \"$selfValue\"，但发现编号更高的旧值 \"$carried\" 已被接受 → 改提 \"$carried\"")
        }
        // Phase 2：发 Accept
        val acks = granted.count { it.accept(n, value) }
        return if (acks > acceptors.size / 2) value else null
    }
}

fun main() {
    // ============ ① 基本流程：P1 用提案号 11 选定"分账比例 7:3" ============
    println("== ① 两阶段基本流程 ==")
    val acceptors = (1..5).map { Acceptor(it) }
    val p1 = Proposer(1)
    val chosen = p1.proposeRound(11, "分账比例 7:3", acceptors)
    println("选定的值：$chosen（多数派已接受）")
    check(chosen == "分账比例 7:3")

    // ============ ② 安全性：P2 提案号更高，但必须沿用已被选定的值 ============
    println()
    println("== ② 安全性：后来者不许翻案 ==")
    val p2 = Proposer(2)
    val chosen2 = p2.proposeRound(99, "分账比例 6:4", acceptors)   // P2 原本想提 6:4
    println("P2 最终选定的值：$chosen2")
    check(chosen2 == "分账比例 7:3") { "安全性被破坏：已被多数派接受的值竟被翻案！" }
    println("→ 提案号高不等于能翻案：Promise 带回旧值，Proposer 只能沿用 —— 已选定的值永不被覆盖")

    // ============ ③ 活锁：两个 Proposer 交替抬号，Accept 总被打断 ============
    println()
    println("== ③ 活锁：交替抬号谁也定不下来 ==")
    val a2 = (1..5).map { Acceptor(it) }
    var lo = 20L
    repeat(3) {
        val n1 = lo            // P1 本轮提案号
        val n2 = lo + 5        // P2 抬号压过 P1
        val n1Next = lo + 10   // P1 挨打后再抬号压回 P2
        // P1 Phase1 拿 0/1/2 的 Promise → P2 Phase1 用更高号抢走 2 号 →
        // P1 Phase2 只剩 0/1，不过半 → P1 抬号再 Phase1 抢回 2 号 → P2 Phase2 只剩 3/4，也不过半
        a2[0].prepare(n1); a2[1].prepare(n1); a2[2].prepare(n1)
        a2[2].prepare(n2); a2[3].prepare(n2); a2[4].prepare(n2)
        val ack1 = listOf(a2[0], a2[1], a2[2]).count { it.accept(n1, "v1@P1") }
        a2[0].prepare(n1Next); a2[1].prepare(n1Next); a2[2].prepare(n1Next)
        val ack2 = listOf(a2[2], a2[3], a2[4]).count { it.accept(n2, "v2@P2") }
        println("第 ${it + 1} 轮：P1(号=$n1) 的 Accept 只得到 $ack1/3；P2(号=$n2) 的 Accept 只得到 $ack2/3 —— 都不过半")
        lo += 20
    }
    println("→ 每次的 Accept 都被对方更高号的 Prepare 打断，理论上永远选不定：这就是活锁")

    // ============ ④ Multi-Paxos 的化解：稳定 Leader，之后只走 Phase 2 ============
    println()
    println("== ④ 稳定 Leader：两阶段压成一阶段 ==")
    val leaderBallot = 100L
    val decree1 = (1..5).map { Acceptor(it) }   // 日志位 #1：分账比例
    decree1.forEach { it.prepare(leaderBallot) } // Leader 上任时做一次性 Prepare
    val v1 = decree1.count { it.accept(leaderBallot, "分账比例 7:3") }
    // 日志位 #2：同一个 Leader 直接发 Accept，省掉 Phase 1（每个日志位独立跑一轮共识）
    val decree2 = (1..5).map { Acceptor(it) }
    val v2 = decree2.count { it.accept(leaderBallot, "结算币种 CNY") }
    println("日志位#1：$v1/5 接受「分账比例 7:3」；日志位#2：$v2/5 接受「结算币种 CNY」—— 全程零 Prepare")
    println("→ Raft 的选举 + 日志复制，就是把这套「稳定 Leader + 只走第二阶段」做成了协议本体")
}
