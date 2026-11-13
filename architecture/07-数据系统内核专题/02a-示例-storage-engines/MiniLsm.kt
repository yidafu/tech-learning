// MiniLsm.kt —— 极简 LSM 存储引擎：WAL + MemTable + SSTable + Leveled 式合并 + 崩溃恢复 + 放大统计
//
// 场景：物联网平台的水表上报（写入洪峰、同一个键被反复覆盖、偶发点查），演示六件事：
//       ① 写路径：先追加 WAL，再进 MemTable，攒够一批才刷成不可变 SSTable（磁盘上只有顺序写）；
//       ② 读路径：MemTable → 新到旧逐个查 SSTable，布隆过滤器把"肯定不在"的文件挡掉；
//       ③ 删除 = 墓碑：挡住旧文件里的值，不让它"复活"；
//       ④ 合并：L0 文件堆到 4 个就归并去重——同一键的旧版本在这里被消灭（写放大的来源）；
//       ⑤ 崩溃恢复：MemTable 是易失的，丢了不要紧，重放 WAL 即可找回来；
//       ⑥ 统计：用本引擎自己实际写入/重写的字节数，把写放大、读放大、空间放大算给你看。
//
// 简化声明（对照真实引擎要知道差在哪）：
//   - SSTable 用文本行 + 全内存条目模拟，真实引擎是磁盘块 + 稀疏索引 + 页缓存 + 压缩；
//   - 布隆过滤器固定 512 位 5 哈希，真实引擎按目标误判率（如 1%）推定位数；
//   - 合并策略是"L0 堆 4 个就与 L1 全量归并"的简化 leveled：真实引擎多层、按层大小比触发、
//     后台限速执行，且墓碑只有确认盖住最底层之后才能丢；
//   - 没有实现范围查询的合并迭代器（真实引擎用小顶堆把多个 SSTable 的有序流归并起来）。
//
// 运行：kotlinc MiniLsm.kt -include-runtime -d minilsm.jar && java -jar minilsm.jar

import java.io.File
import kotlin.math.abs

const val TOMBSTONE = "\u0000TOMBSTONE"

// ---------- 布隆过滤器：回答"这个键肯定不在这个文件里吗"（false 才是确定答案） ----------
// 512 位 / 5 哈希，装 40 个键时理论误判率低于 1%（真实引擎按目标误判率反推位数）
class Bloom(val bits: Int = 512, val hashes: Int = 5) {
    private val set = BooleanArray(bits)
    private fun positions(key: String) = (0 until hashes).map { i ->
        abs((key.hashCode() * 1_000_03 + i * 9_778_767) % bits)
    }
    fun add(key: String) = positions(key).forEach { set[it] = true }
    fun mightContain(key: String) = positions(key).all { set[it] }
}

// ---------- SSTable：一个不可变的有序文件，带布隆过滤器 ----------
class SSTable(
    val level: Int,
    val seq: Int,
    raw: List<Pair<String, String?>>, // second = null 表示墓碑
) {
    private val sorted = raw.sortedBy { it.first }
    val size = sorted.size
    val bloom = Bloom().apply { raw.forEach { add(it.first) } }

    fun get(key: String): String? =
        sorted.binarySearch { it.first.compareTo(key) }.takeIf { it >= 0 }?.let { sorted[it].second }

    fun hasTombstone(key: String) = sorted.any { it.first == key && it.second == null }
    fun entries(): List<Pair<String, String?>> = sorted

    fun toText() = sorted.joinToString("\n") { "${it.first}=${it.second ?: TOMBSTONE}" } + "\n"
    fun byteSize() = sorted.sumOf { it.first.length + (it.second ?: TOMBSTONE).length + 2 }
}

// ---------- 引擎本体 ----------
class MiniLsm(
    dirPath: String,
    val memTableLimit: Int = 30, // MemTable 条数上限（真实引擎按字节算，如 64MB）
) {
    private val dir = File(dirPath).apply { mkdirs() }
    private val wal = File(dir, "wal.log")
    private var memTable = sortedMapOf<String, String?>()
    private val tables = mutableListOf<SSTable>() // 头部 = 最新
    private var nextSeq = 0

    // —— 放大统计：全部按本引擎实际经过的字节计数 ——
    var walBytes = 0L        // 预写日志追加
    var sstableBytes = 0L    // 刷盘写出
    var compactionBytes = 0L // 合并重写
    var logicalBytes = 0L    // 业务视角：每次 put 的 key+value 有效载荷
    var getProbes = 0        // 读放大代理：点查真正翻开的 SSTable 次数
    var bloomBlocked = 0     // 布隆过滤器挡掉的无效下探次数
    var flushCount = 0       // 刷盘次数（供 main 打印，避免口径写死）
    var compactCount = 0     // 合并次数

    init { recover() }

    // ---------- 崩溃恢复：逐行重放 WAL + 重新打开全部 SSTable ----------
    private fun recover() {
        var replayed = 0
        if (wal.exists()) {
            for (line in wal.readLines()) {
                if (line.isEmpty()) continue
                val k = line.substringBefore('\t')
                val v = line.substringAfter('\t', "")
                memTable[k] = if (v == TOMBSTONE) null else v
                replayed++
            }
        }
        if (replayed > 0) println("[恢复] 重放 WAL $replayed 条——MemTable 虽丢，未刷盘的写一条不少")
        dir.listFiles { f -> f.name.endsWith(".sst") }?.forEach { f ->
            val (lv, sq) = f.name.removePrefix("L").removeSuffix(".sst").split("-").map { it.toInt() }
            tables += SSTable(lv, sq, f.readLines().map { line ->
                val k = line.substringBefore('=')
                val v = line.substringAfter('=', "")
                k to (if (v == TOMBSTONE) null else v)
            })
            nextSeq = maxOf(nextSeq, sq + 1)
        }
        tables.sortByDescending { it.seq }
        if (tables.isNotEmpty())
            println("[恢复] 打开 ${tables.size} 个 SSTable：" + tables.joinToString(" | ") { "L${it.level}#${it.seq}(${it.size}键)" })
    }

    // ---------- 写路径：WAL 先行，MemTable 后记，攒够一批才刷盘 ----------
    fun put(key: String, value: String) {
        val line = "$key\t$value"
        wal.appendText(line + "\n")            // ① 追加 WAL：崩溃恢复的唯一依据
        walBytes += line.length + 1
        logicalBytes += key.length + value.length
        memTable[key] = value                  // ② MemTable：有序表，可原地覆盖
        if (memTable.size >= memTableLimit) flush()
    }

    fun delete(key: String) {
        val line = "$key\t$TOMBSTONE"
        wal.appendText(line + "\n")
        walBytes += line.length + 1
        memTable[key] = null                   // 墓碑：读路径要认它，否则旧值会"复活"
    }

    private fun flush() {
        flushCount++
        val t = SSTable(0, nextSeq++, memTable.entries.map { it.key to it.value })
        File(dir, "L${t.level}-${t.seq}.sst").writeText(t.toText())
        sstableBytes += t.byteSize()
        tables.add(0, t)                       // 头插：最新的文件最先被查
        memTable = sortedMapOf()
        wal.writeText("")                      // MemTable 已安全落盘，WAL 可以清空
        if (tables.count { it.level == 0 } >= 4) compact()
    }

    // ---------- 合并：L0 堆 4 个 → 与 L1 归并去重 → 重写为一个新 L1 ----------
    private fun compact() {
        compactCount++
        val victims = tables.filter { it.level <= 1 }.sortedBy { it.seq }
        // 同键取 seq 最大（最新）的版本；本次合并覆盖了全部 L0+L1，墓碑可以安全丢弃
        val merged = victims
            .flatMap { s -> s.entries().map { (k, v) -> Triple(k, v, s.seq) } }
            .groupBy { it.first }
            .map { (k, vs) -> k to vs.maxBy { it.third }.second }
            .filter { it.second != null } as List<Pair<String, String?>>
        val out = SSTable(1, nextSeq++, merged)
        File(dir, "L${out.level}-${out.seq}.sst").writeText(out.toText())
        compactionBytes += out.byteSize()
        victims.forEach { File(dir, "L${it.level}-${it.seq}.sst").delete() }
        tables.removeAll(victims.toSet())
        tables.add(0, out)
        println("[合并] L0×${victims.count { it.level == 0 }} + 旧L1×${victims.count { it.level == 1 }}" +
            " → 1 个 L1（${out.size} 键，重写 ${out.byteSize()} 字节）——重复版本与墓碑在这里被消灭")
    }

    // ---------- 读路径：MemTable → 新到旧查 SSTable，布隆先挡一道 ----------
    fun get(key: String): String? {
        if (key in memTable) return memTable[key]      // 命中（值或墓碑都算命中）
        for (t in tables) {
            if (!t.bloom.mightContain(key)) { bloomBlocked++; continue }  // 肯定不在，跳过
            getProbes++
            val v = t.get(key)
            if (v != null) return v                    // 找到有效值
            if (t.hasTombstone(key)) return null       // 墓碑：更旧的文件不用再看了
            // 否则是布隆误判（小概率事件）：继续往更旧的文件找
        }
        return null
    }

    fun layout(): String =
        (if (memTable.isEmpty()) "" else "MemTable(${memTable.size}键) + ") +
            tables.joinToString(" | ") { "L${it.level}#${it.seq}(${it.size}键)" }

    fun onDiskSstableBytes(): Long =
        dir.listFiles { f -> f.name.endsWith(".sst") }!!.sumOf { it.length() }

    fun sstableCount() = tables.size
}

fun main() {
    val dir = File("minilsm-data")
    dir.deleteRecursively()
    val engine = MiniLsm(dir.path)

    println("== ① 写路径：240 次水表读数（键 meter-00..39 循环覆盖），MemTable 攒 30 条刷一个 SSTable ==")
    repeat(240) { i ->
        engine.put("meter-${(i % 40).toString().padStart(2, '0')}", "readings=$i,pressure=0.${i % 9 + 1}")
    }
    println("240 条写入 → ${engine.flushCount} 次刷盘 → ${engine.compactCount} 次合并。当前布局：${engine.layout()}")
    println("40 个键每个都只留最新版本——旧版本在第 ${engine.memTableLimit / engine.memTableLimit}、${engine.compactCount} 次刷盘触发的合并里被去重")

    println()
    println("== ② 读路径：点查覆盖键与不存在的键 ==")
    println("get(meter-25) = ${engine.get("meter-25")?.substringBefore(',')}   ← 命中唯一的 L1 文件")
    println("get(meter-99) = ${engine.get("meter-99")}（这个键从未写过）")
    println("点查共翻开 SSTable ${engine.getProbes} 次；布隆过滤器挡掉无效下探 ${engine.bloomBlocked} 次")

    println()
    println("== ③ 删除与墓碑：旧文件里的值不能'复活' ==")
    engine.delete("meter-07")
    check(engine.get("meter-07") == null) { "墓碑失效！" }
    println("delete(meter-07) 后 get → null（墓碑在 MemTable，挡住了 SSTable 里的旧版本）")

    println()
    println("== ④ 合并：继续写入让 L0 重新堆到 4 个，触发与 L1 的归并（meter-07 已停用，不再写入）==")
    fun writeReading(i: Int) {
        val k = i % 40
        if (k == 7) return                       // meter-07 已被拆除：验证墓碑语义，跳过不写
        engine.put("meter-${k.toString().padStart(2, '0')}", "readings=${240 + i},pressure=0.${i % 9 + 1}")
    }
    (0 until 90).forEach(::writeReading)
    val beforeCompact = engine.onDiskSstableBytes()
    val flushBefore = engine.flushCount
    val wrote = (0 until 90).count { it % 40 != 7 }
    println("再写 $wrote 条（${engine.flushCount - flushBefore} 次刷盘、尚未合并）：${engine.layout()}")
    println(String.format("此刻落盘 %d 字节——合并间隙里旧版本与新版本并存，空间放大最明显", beforeCompact))
    (90 until 160).forEach(::writeReading)
    val afterCompact = engine.onDiskSstableBytes()
    println("再写到第 4 个 L0，合并触发。合并后布局：${engine.layout()}")
    check(engine.get("meter-07") == null) { "合并后墓碑键复活了！" }
    println("合并后 get(meter-07) 仍为 null——墓碑与被它盖住的旧版本在合并里一起消失")


    println()
    println("== ⑤ 崩溃恢复：内存状态全丢，只凭 WAL 与 SSTable 重建 ==")
    engine.put("meter-alert", "readings=final,unflushed=true")   // 故意留在 MemTable 不刷盘
    println("put(meter-alert) 后未触发刷盘即'宕机'（模拟：丢弃全部内存状态）")
    val revived = MiniLsm(dir.path)
    val got = revived.get("meter-alert")
    println("重开后 get(meter-alert) = ${got?.substringBefore(',')}")
    check(got != null)
    val expectMeter00 = 240 + (0 until 160).last { it % 40 == 0 }
    check(revived.get("meter-00")?.substringBefore(',') == "readings=$expectMeter00")

    println()
    println("== ⑥ 三大放大（本引擎实际写入字节的实测口径，非估测）==")
    val totalWrite = engine.walBytes + engine.sstableBytes + engine.compactionBytes
    println(String.format("有效载荷（业务写入）   %6d 字节", engine.logicalBytes))
    println(String.format("WAL 追加              %6d 字节", engine.walBytes))
    println(String.format("SSTable 刷盘          %6d 字节", engine.sstableBytes))
    println(String.format("Compaction 重写       %6d 字节", engine.compactionBytes))
    println(String.format("写放大 = 总写入/有效载荷 = %d/%d ≈ %.1f 倍",
        totalWrite, engine.logicalBytes, totalWrite.toDouble() / engine.logicalBytes))
    println(String.format("空间放大（合并间隙最差）= %d/%d ≈ %.1f 倍；合并刚结束时 = %d 字节 ≈ 理想值",
        beforeCompact, afterCompact, beforeCompact.toDouble() / afterCompact, afterCompact))
    println("读放大 = 单次点查最多翻开 ${revived.sstableCount() + 1} 个结构（MemTable + ${revived.sstableCount()} 个 SSTable）")
}
