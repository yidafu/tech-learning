// MiniMvcc.kt —— 迷你 MVCC 引擎：版本链 + 快照可见性 + first-committer-wins + 写偏斜复现 + SSI 检测
//
// 与 [03-事务与并发控制.md] 第 4、5 节配套，六幕连演：
//   ① 脏读被挡：未提交的写在任何快照下都不可见；
//   ② 不可重复读：RC（语句级快照）下发生，RR（事务级快照）下消失；
//   ③ 幻读消失：范围查询读的也是快照，别人插入的新键不可见；
//   ④ 丢失更新被 first-committer-wins 拦下：同行写-写冲突，后提交者中止；
//   ⑤ 写偏斜穿透快照隔离：两个值班医生各自请假都成功——约束“至少一人在班”被无声破坏；
//   ⑥ SSI 拦下同一场景：rw 反依赖追踪发现“连续两条 rw 边”的危险结构，中止后提交者。
//
// 简化声明（对照真实引擎要知道差在哪）：
//   - 版本链就地存在 Map 里；PG 堆上是 xmin/xmax 元组 + clog，InnoDB 是聚簇索引 + undo 链 + ReadView；
//   - 可见性按“提交时钟”判定（提交顺序与我快照的比较）；真实实现是 clog 位图 / ReadView 上下界；
//   - SSI 的读集按精确键记录；PG 用粗粒度 SIREAD 谓词锁（页/关系级，宁可误杀）；
//   - 危险结构判定简化为“提交时 in、out 皆非零”；真实 SSI 还要确认两条边能构成环。
//
// 运行：kotlinc MiniMvcc.kt -include-runtime -d minivcc.jar && java -jar minivcc.jar

// ---------- 版本：一行数据的多个世代，xmin=创建者，xmax=覆盖者（null=仍在世） ----------
class Version(val value: String?, val xmin: Txn) {
    var xmax: Txn? = null
}

// ---------- 快照：我读这一眼时，提交时钟走到哪、谁还没提交 ----------
class Snapshot(val commitClock: Int)

enum class State { ACTIVE, COMMITTED, ABORTED }

class Txn(val id: Int) {
    var state = State.ACTIVE
    var commitSeq: Int? = null                  // 提交顺序号（提交时才有）
    var snapshot: Snapshot? = null              // RR：首读建立后不变；RC：每次读重建
    val reads = mutableSetOf<String>()          // 读集（SSI 用；范围查询按前缀展开记键）
    val writes = LinkedHashMap<String, String?>()  // 写集（staged，提交时才生效）
    var inRw = 0                                // 指向我的 rw 边：我推翻了别人的读前提（我写、人读）
    var outRw = 0                               // 我指出的 rw 边：我的读前提被别人推翻（我读、人写）
}

// ---------- 迷你数据库 ----------
class MiniDb(
    private val readCommitted: Boolean = false,  // true=语句级快照（RC），false=事务级快照（RR/SI）
    private val ssi: Boolean = false,            // 叠加 SSI 危险结构检测
) {
    private val versions = HashMap<String, MutableList<Version>>()  // 键 → 新到旧
    private val txns = ArrayList<Txn>()
    private var nextId = 1
    private var commitClock = 0

    fun begin(): Txn = Txn(nextId++).also { txns += it }

    // 可见性判定（对应笔记 4.2 节的规则，用“提交时钟”表达提交先后）：
    //   创建/覆盖事务必须已提交，且提交在我的快照之前；否则这个世代对我不存在。
    //   （真实引擎不比时钟而比 clog 位图 / ReadView 上下界，语义等价）
    private fun committedBefore(t: Txn?, snap: Snapshot, me: Txn): Boolean {
        if (t == null) return false
        if (t === me) return true                          // 自己写自己看得见（读己之写）
        val seq = t.commitSeq ?: return false              // 未提交 → 看不见
        return seq <= snap.commitClock                     // 我快照之后才提交 → 看不见
    }

    private fun visible(v: Version, snap: Snapshot, me: Txn): Boolean =
        committedBefore(v.xmin, snap, me) && !committedBefore(v.xmax, snap, me)

    private fun snapFor(txn: Txn): Snapshot =
        if (readCommitted) Snapshot(commitClock)                              // RC：每条语句一个新快照
        else txn.snapshot ?: Snapshot(commitClock).also { txn.snapshot = it }  // RR：首读定格

    private fun visibleVersion(key: String, snap: Snapshot, me: Txn): Version? =
        versions[key].orEmpty().firstOrNull { visible(it, snap, me) }

    fun read(txn: Txn, key: String): String? {
        val v = visibleVersion(key, snapFor(txn), txn) ?: return null
        txn.reads += key
        return v.value
    }

    fun readPrefix(txn: Txn, prefix: String): Map<String, String> {           // 范围查询（幻读用）
        val snap = snapFor(txn)
        return versions.keys.filter { it.startsWith(prefix) }
            .sorted().mapNotNull { k ->
                visibleVersion(k, snap, txn)?.value?.let { k to it }
            }.toMap().also { txn.reads += it.keys }
    }

    fun write(txn: Txn, key: String, value: String?) { txn.writes[key] = value }

    fun commit(txn: Txn): Boolean {
        check(txn.state == State.ACTIVE)
        val snap = snapFor(txn)
        // ① 写-写冲突检测（first-committer-wins）：我要写的键上，存在“我快照之后才落地的别人版本”？
        for (key in txn.writes.keys) {
            val conflict = versions[key].orEmpty().any { v ->
                v.xmin !== txn && committedAfterSnapshot(v.xmin, snap)
            }
            if (conflict) { txn.state = State.ABORTED; return false }
        }
        // ② SSI 记账：我写别人读过的键 → 对方记 outRw（前提将被推翻），我记 inRw（我推翻了对方）
        if (ssi) {
            for (key in txn.writes.keys)
                for (other in txns)
                    if (other !== txn && key in other.reads && other.state != State.ABORTED) { other.outRw++; txn.inRw++ }
            if (txn.inRw > 0 && txn.outRw > 0) {                               // 危险结构：两条连续 rw 边的枢纽
                txn.state = State.ABORTED
                println("   [SSI] 事务${txn.id} 处于危险结构（in=${txn.inRw}, out=${txn.outRw}）→ 中止（40001）")
                return false
            }
        }
        // ③ 正常提交：当前可见版本打 xmax（=我），新版本入链
        for ((key, value) in txn.writes) {
            val chain = versions.getOrPut(key) { mutableListOf() }
            visibleVersion(key, snap, txn)?.let { it.xmax = txn }
            chain.add(0, Version(value, txn))
        }
        txn.commitSeq = ++commitClock
        txn.state = State.COMMITTED
        return true
    }

    private fun committedAfterSnapshot(t: Txn, snap: Snapshot): Boolean {
        val seq = t.commitSeq ?: return false
        return seq > snap.commitClock
    }
}

// ---------- 六幕演示 ----------
private class Shell(val db: MiniDb) {
    fun seed(vararg kv: Pair<String, String>) = db.begin().let { kv.forEach { (k, v) -> db.write(it, k, v) }; db.commit(it) }
    fun begin() = db.begin()
    fun read(t: Txn, key: String) = db.read(t, key)
    fun readPrefix(t: Txn, prefix: String) = db.readPrefix(t, prefix)
    fun write(t: Txn, key: String, value: String?) = db.write(t, key, value)
    fun commit(t: Txn) = db.commit(t)
}

private inline fun runMvcc(rcMode: Boolean, ssiMode: Boolean = false, block: Shell.() -> Unit) =
    Shell(MiniDb(readCommitted = rcMode, ssi = ssiMode)).block()

fun main() {
    println("== ① 脏读被挡（任何档位都看不见未提交的写）==")
    runMvcc(rcMode = true) {
        seed("order:1" to "CREATED")
        val t1 = begin(); val t2 = begin()
        write(t1, "order:1", "PAID")                                   // 未提交
        println("   t2 读 order:1 → ${read(t2, "order:1")}（t1 未提交的 PAID 不可见）")
        commit(t1)
        println("   t1 提交后 t2 再读 → ${read(t2, "order:1")}（RC 语句级快照，新语句才看得见）")
    }

    println()
    println("== ② 不可重复读：RC 下发生，RR 下消失 ==")
    for ((mode, label) in listOf(true to "RC（语句级快照）", false to "RR（事务级快照）")) {
        runMvcc(rcMode = mode) {
            seed("txn:99" to "成功")
            val t1 = begin(); val t2 = begin()
            read(t1, "txn:99")
            write(t2, "txn:99", "退款中"); commit(t2)
            println("   $label：t1 第二次读 → ${read(t1, "txn:99")}" +
                if (mode) "（不可重复读发生了）" else "（快照静止，读到的仍是旧值）")
            commit(t1)
        }
    }

    println()
    println("== ③ 幻读消失：范围查询也是快照（RR 下别人插入的新键不可见）==")
    runMvcc(rcMode = false) {
        seed("bill:D1" to "10", "bill:D2" to "20")
        val t1 = begin(); val t2 = begin()
        println("   t1 首次范围查询 → ${readPrefix(t1, "bill:").size} 行")
        write(t2, "bill:D3", "30"); commit(t2)                          // t2 插入新键并提交
        println("   t2 提交后 t1 再查 → ${readPrefix(t1, "bill:").size} 行（快照内没有幻影）")
        commit(t1)
    }

    println()
    println("== ④ 丢失更新被 first-committer-wins 拦下 ==")
    runMvcc(rcMode = false) {
        seed("stock:sku1" to "1")
        val t1 = begin(); val t2 = begin()
        println("   t1 读库存 → ${read(t1, "stock:sku1")}；t2 读库存 → ${read(t2, "stock:sku1")}")
        write(t1, "stock:sku1", "0"); write(t2, "stock:sku1", "0")      // 都算出 0
        println("   t1 提交 → ${if (commit(t1)) "成功" else "中止"}")
        println("   t2 提交 → ${if (commit(t2)) "成功" else "中止（写-写冲突：先提交者胜，PG 会报 could not serialize access…）"}")
        begin().let { println("   最终库存 = ${read(it, "stock:sku1")}（t2 的覆盖被挡下，没有无声丢失）"); commit(it) }
    }

    println()
    println("== ⑤ 写偏斜穿透快照隔离（SI：值班医生都请成假了）==")
    runMvcc(rcMode = false) {
        seed("doc:A" to "on_call", "doc:B" to "on_call")
        val tA = begin(); val tB = begin()
        println("   A 读到 B=${read(tA, "doc:B")} → 判断“还有人在班”，A 请假")
        println("   B 读到 A=${read(tB, "doc:A")} → 判断“还有人在班”，B 请假")
        write(tA, "doc:A", "off"); write(tB, "doc:B", "off")
        println("   tA 提交 → ${if (commit(tA)) "成功" else "中止"}；tB 提交 → ${if (commit(tB)) "成功" else "中止"}")
        begin().let {
            println("   最终：A=${read(it, "doc:A")} B=${read(it, "doc:B")}" +
                " —— 约束“至少一人在班”被无声破坏（写的是不同的行，SI 的冲突检测看不见）")
            commit(it)
        }
    }

    println()
    println("== ⑥ SSI 拦下同一场景（rw 反依赖追踪 + 危险结构检测）==")
    runMvcc(rcMode = false, ssiMode = true) {
        seed("doc:A" to "on_call", "doc:B" to "on_call")
        val tA = begin(); val tB = begin()
        read(tA, "doc:B"); write(tA, "doc:A", "off")                    // A 的前提（B 在班）将被 B 自己推翻
        read(tB, "doc:A"); write(tB, "doc:B", "off")                    // B 的前提（A 在班）已被 A 的写推翻
        println("   tA 提交 → ${if (commit(tA)) "成功" else "中止"}（in=1、out=0：只有一条 rw 边，放行）")
        println("   tB 提交 → ${if (commit(tB)) "成功" else "中止"}（in=1、out=1：两条连续 rw 边的枢纽，危险结构）")
        begin().let {
            println("   最终：A=${read(it, "doc:A")} B=${read(it, "doc:B")}" +
                " —— 至少一人在班被保住（应用收到 40001 重试 B 的方案即可，比如“B 坚守、改为安排替补”）")
            commit(it)
        }
    }
}
