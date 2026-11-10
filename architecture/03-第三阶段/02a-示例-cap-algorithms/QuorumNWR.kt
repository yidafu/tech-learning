// QuorumNWR.kt —— NWR 读写档位、W+R>N 的交集论证、分区期间的丢写
//
// 场景：桶装水商城商品库存 sku=1001，N=3 副本（无主库，任一副本可接受读写）。
//       演示四件事：
//       ① W=1,R=1 最快但读到旧值；
//       ② W=2,R=2 读写集合必相交 → 读到最新写；
//       ③ 分区期间 W=ALL 拒绝写（弃 A 保 C）；
//       ④ 分区期间 W=1 两侧照写 → 愈合后版本分叉 → LWW 静默丢写（弃 C 的真实代价）。
//
// 运行：kotlinc QuorumNWR.kt -include-runtime -d nwr.jar && java -jar nwr.jar

data class Versioned(val version: Long, val value: String, val ts: Long)

class Replica(val id: Int) {
    var data: Versioned = Versioned(0, "stock:100", 0)
}

class NwrStore(val replicas: List<Replica>) {
    val n get() = replicas.size

    /** 健康路径的写：全局版本 +1，写 W 个副本；分区/副本失联时凑不齐 W 就拒绝 */
    fun write(value: String, w: Int): String {
        val version = replicas.maxOf { it.data.version } + 1
        val ok = replicas.take(w)
        if (ok.size < w) return "拒绝（凑不齐 W=$w）"
        ok.forEach { it.data = Versioned(version, value, it.data.ts + 1) }
        return "OK（$w/$n 确认，version=$version）"
    }

    /** 读 R 个副本，取版本最高的返回（Dynamo 风格的语法冲突合并在 main④ 演示） */
    fun read(r: Int): String {
        val picked = replicas.take(r)
        if (picked.size < r) return "拒绝（凑不齐 R=$r）"
        return picked.maxByOrNull { it.data.version }!!.data.value
    }
}

fun main() {
    // ============ ① W=1, R=1：最快，但读可能落在没收到写的副本上 ============
    println("== ① W=1, R=1（AP 档）==")
    var store = NwrStore((0..2).map { Replica(it) })
    println("写 ${store.write("stock:99", w = 1)}   ← 只有副本0更新")
    println("读副本0 → ${store.replicas[0].data.value}（新鲜）")
    println("读副本1 → ${store.replicas[1].data.value}（旧值！它没收到那次写）")

    // ============ ② W=2, R=2：读写集合必相交，交集中带着最新版本 ============
    println()
    println("== ② W=2, R=2（QUORUM 档，N=3，W+R=4>N）==")
    store = NwrStore((0..2).map { Replica(it) })
    println("写 ${store.write("stock:98", w = 2)}     ← 副本0、1 更新")
    println("读副本0、1 → ${store.read(2)}（与写集合交集={0,1}，最新版本从这里被带出来）")

    // ============ ③ 分区期间 W=ALL：少数派侧写不进 ============
    println()
    println("== ③ 分区 + W=ALL（CP 极端档）==")
    println("分区：副本0 在少数派侧，副本1、2 在多数派侧")
    // 少数派侧只能看到副本0，W=3 永远凑不齐
    val minority = NwrStore(listOf(Replica(0)))
    println("少数派侧写 → ${minority.write("stock:97", w = 3)}  ← 弃 A 保 C：宁可不写，不产生分叉")

    // ============ ④ 分区期间 W=1：两侧照写 → 愈合后 LWW 丢写 ============
    println()
    println("== ④ 分区 + W=1：弃 C 的真实代价 ==")
    val r = (0..2).map { Replica(it) }
    // 两侧各自"本地最大版本 +1"，谁也看不见谁 → 产生两个并行的 version=2
    r[0].data = Versioned(2, "A侧改价:97", ts = 1)   // 少数派侧的写（ts 较早）
    r[1].data = Versioned(2, "B侧改价:96", ts = 2)   // 多数派侧的写（ts 较晚）
    r[2].data = Versioned(2, "B侧改价:96", ts = 2)
    println("分区愈合后读 QUORUM（副本1、2）→ ${r[1].data.value}")
    val conflict = r.map { it.data }.distinctBy { it.value }
    if (conflict.size > 1) {
        println("全量比对发现版本分叉：${conflict.map { it.value }}（同 version=2，不同值）")
        val winner = r.map { it.data }.maxByOrNull { it.ts }!!   // LWW：时间戳新者胜
        println("LWW 裁决 → 保留「${winner.value}」，A 侧「A侧改价:97」被静默丢弃 ← 这就是丢写")
        println("缓解手段：向量时钟识别并发冲突交人工/业务裁决，或改用 CRDT 合并（见 GossipAndCrdt.kt）")
    }
}
