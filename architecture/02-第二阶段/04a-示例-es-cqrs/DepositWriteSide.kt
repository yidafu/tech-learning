// DepositWriteSide.kt —— 事件溯源写侧三件套：乐观并发、快照、投影重建
//
// 场景：桶装水商城押金账户（水桶押金交退）。一个用户一条事件流：
//       DepositPaid（交押金）/ DepositRefunded（退桶退押金）。
//       业务不变式：累计退桶数 ≤ 累计交桶数（不能退没交过的押金）。
//
// 运行：kotlinc DepositWriteSide.kt -include-runtime -d deposit.jar && java -jar deposit.jar

import java.time.Instant

// ---------- 事件：追加后不可变，是唯一的事实来源 ----------
sealed interface DepositEvent {
    val userId: String
    val at: Instant

    data class DepositPaid(
        override val userId: String,
        val bucketCount: Int,
        override val at: Instant,
    ) : DepositEvent

    data class DepositRefunded(
        override val userId: String,
        val bucketCount: Int,
        override val at: Instant,
    ) : DepositEvent
}

// ---------- 聚合：状态 = 事件折叠；version = 已消费的事件条数 ----------
data class DepositAccount(
    val userId: String,
    val version: Int = 0,          // 聚合当前版本 = 事件流长度，乐观并发的比对基准
    val paidBuckets: Int = 0,
    val refundedBuckets: Int = 0,
) {
    val availableBuckets: Int get() = paidBuckets - refundedBuckets

    // 命令：校验不变式，产出事件。注意它不写库——落盘是 EventStore.append 的事
    fun refund(buckets: Int, at: Instant): DepositEvent {
        check(buckets in 1..availableBuckets) {
            "拒绝退桶：申请 $buckets 桶，账户可用仅 $availableBuckets 桶"
        }
        return DepositEvent.DepositRefunded(userId, buckets, at)
    }

    fun apply(e: DepositEvent): DepositAccount = when (e) {
        is DepositEvent.DepositPaid     -> copy(version = version + 1, paidBuckets = paidBuckets + e.bucketCount)
        is DepositEvent.DepositRefunded -> copy(version = version + 1, refundedBuckets = refundedBuckets + e.bucketCount)
    }
}

// ---------- 事件存储：追加原子性 + 快照（内存版，生产里是关系库/专用事件库） ----------
class ConcurrencyException(expected: Int, actual: Int) :
    RuntimeException("并发追加冲突：命令基于版本 $expected 决策，流已是版本 $actual")

class EventStore(private val snapshotEvery: Int = 4) {
    private class Stream {
        val events = mutableListOf<DepositEvent>()
        var snapshotVersion = 0
        var snapshotState: DepositAccount? = null   // 快照只是缓存，丢了可从事件流重建
    }

    private val streams = mutableMapOf<String, Stream>()
    private val globalLog = mutableListOf<Pair<Long, DepositEvent>>()   // 全局序号 → 事件（供投影消费）

    // 加载 = 快照 + 增量事件回放（无快照则从第 0 条全量回放）
    fun load(userId: String): DepositAccount {
        val s = streams[userId] ?: return DepositAccount(userId)
        val base = s.snapshotState ?: DepositAccount(userId)
        return s.events.drop(s.snapshotVersion).fold(base) { acc, e -> acc.apply(e) }
    }

    // 追加带 expectedVersion：库里流长度 != 期望版本就拒绝——乐观并发控制的核心
    fun append(userId: String, expectedVersion: Int, newEvents: List<DepositEvent>) {
        val s = streams.getOrPut(userId) { Stream() }
        if (s.events.size != expectedVersion) throw ConcurrencyException(expectedVersion, s.events.size)
        s.events += newEvents
        newEvents.forEach { globalLog += (globalLog.size + 1L) to it }
        // 快照节流：每 snapshotEvery 条落一次（真实系统通常 100 条以上一拍）
        if (s.events.size - s.snapshotVersion >= snapshotEvery) {
            s.snapshotState = load(userId)
            s.snapshotVersion = s.events.size
        }
    }

    fun streamInfo(userId: String): String =
        streams[userId]?.let { "事件流 ${it.events.size} 条，快照版本 ${it.snapshotVersion}" } ?: "空流"

    fun eventsAfter(globalSeq: Long): List<Pair<Long, DepositEvent>> =
        globalLog.filter { it.first > globalSeq }
}

// ---------- 读侧投影：检查点追赶 + 全量重建；读模型是可丢弃缓存 ----------
class RefundStatsProjection(private val store: EventStore) {
    private var checkpoint = 0L                        // 已消费到的全局序号
    private val refundedByUser = mutableMapOf<String, Int>()

    fun catchUp() {   // 生产中：经消息队列 at-least-once 消费 + 事件 ID 去重（见 3.1 幂等）
        for ((seq, e) in store.eventsAfter(checkpoint)) {
            if (e is DepositEvent.DepositRefunded)
                refundedByUser.merge(e.userId, e.bucketCount, Int::plus)
            checkpoint = seq
        }
    }

    // 投影表被误删 / 需求改口径 / 新增投影：清空、检查点归零、从事件流全量重放
    fun rebuild() {
        refundedByUser.clear()
        checkpoint = 0L
        catchUp()
    }

    fun report(): String =
        refundedByUser.entries.joinToString("，") { "${it.key} 退 ${it.value} 桶" }.ifEmpty { "（无数据）" }
}

fun main() {
    val store = EventStore(snapshotEvery = 4)   // 教学取小值；生产通常 100 条以上一拍
    val now = Instant.parse("2025-11-03T10:00:00Z")
    val u1 = "user-张三"

    // 1) 正常写：交 2 桶押金，退 1 桶
    store.append(u1, 0, listOf(DepositEvent.DepositPaid(u1, 2, now)))
    val acc = store.load(u1)
    store.append(u1, acc.version, listOf(acc.refund(1, now)))
    println("① 正常写后：${store.load(u1)}")

    // 2) 并发冲突：两个"退 1 桶"命令几乎同时到达，都基于版本 2 的状态做决策
    val cmdA = store.load(u1)
    val cmdB = store.load(u1)                    // 读到同一版本，各自校验时都"看起来合法"
    val evA = cmdA.refund(1, now)
    val evB = cmdB.refund(1, now)
    store.append(u1, cmdA.version, listOf(evA))  // A 抢先提交成功
    runCatching { store.append(u1, cmdB.version, listOf(evB)) }   // B 仍按旧版本追加 → 被拒
        .onFailure { println("② 命令 B 被拒：${it.message}") }
    val retry = store.load(u1)                   // 修正动作：重读最新状态、重新校验
    runCatching { retry.refund(1, now) }
        .onFailure { println("③ B 重读重判：${it.message} —— 不变式真正拦下了超退") }

    // 3) 快照：继续写满 4 条自动落快照；之后加载 = 快照 + 增量，不必全量回放
    store.append(u1, 3, listOf(DepositEvent.DepositPaid(u1, 3, now)))          // v4 → 触发快照
    val a4 = store.load(u1)
    store.append(u1, a4.version, listOf(a4.refund(2, now)))                    // v5
    store.append(u1, 5, listOf(DepositEvent.DepositPaid(u1, 1, now)))          // v6
    println("④ ${store.streamInfo(u1)}；此后 load 只回放快照之后的 2 条增量（而非全量 6 条）")
    println("   最终状态：${store.load(u1)}")

    // 4) 投影：追赶 → 模拟误删 → 重建，结果一致——事件流才是唯一事实
    val projection = RefundStatsProjection(store)
    projection.catchUp()
    println("⑤ 投影追赶后：${projection.report()}")
    projection.rebuild()
    println("⑥ 模拟投影表被误删后重建：${projection.report()}")
}
