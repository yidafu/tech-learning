// HexOnionClean.kt —— 三种语汇，一份代码：六边形 / 洋葱 / 整洁架构落到代码上几乎是同一份
//
// 场景：工单中心内核（创建工单 + SLA 截止时间 + 指派通知）。每个构件在三种风格里各叫什么名字：
//   • Ticket（领域规则所在）        → 六边形:内核        洋葱:Domain 环          整洁:Entities 环
//   • CreateTicketUseCase          → 六边形:内核用例     洋葱:Application 环     整洁:Use Case(Interactor)
//   • 三个接口                     → 六边形:被驱动侧端口  洋葱:内环声明的接口      整洁:Gateway 接口
//   • PhoneChannel/IotAlarm/TestDriver → 六边形:驱动侧适配器 洋葱:最外环         整洁:Interface Adapters
//   • Sms/DingTalk/InMemory/FixedClock → 六边形:被驱动侧适配器 洋葱:Infrastructure 整洁:Frameworks & Drivers
//
// 演示这家族的共同红利（六边形讲得最直白）：
//   ① 被驱动侧可替换：短信通知 → 钉钉通知，改的是装配、不是内核；
//   ② 测试就是又一个驱动侧适配器：FixedClock + 内存库替身驱动同一个用例，
//      不起 UI、不起数据库、不依赖真实时钟，即可验证 SLA 规则。
//
// 运行：kotlinc HexOnionClean.kt -include-runtime -d hex.jar && java -jar hex.jar

import java.time.Instant
import java.time.temporal.ChronoUnit

// ================= 领域内核：依赖不指向外，纯净、无框架痕迹 =================

data class Ticket(
    val id: String, val title: String, val reporter: String,
    val slaDeadline: Instant, val assignee: String,
)

data class CreateTicketCommand(val title: String, val reporter: String, val critical: Boolean)

// ================= 被驱动侧端口：接口由内核拥有，实现在外圈（依赖倒置的落点） =================

interface TicketRepository { fun nextId(): String; fun save(ticket: Ticket) }
interface NotifierPort { fun notifyAssigned(ticket: Ticket) }
interface ClockPort { fun now(): Instant }   // "现在几点"也是外部细节——测试想拨表就该能拨

// ================= 用例（应用业务规则）：SLA 规则只活在内核里 =================

class CreateTicketUseCase(
    private val tickets: TicketRepository,
    private val notifier: NotifierPort,
    private val clock: ClockPort,
) {
    fun execute(cmd: CreateTicketCommand): Ticket {
        val ticket = Ticket(
            id = tickets.nextId(), title = cmd.title, reporter = cmd.reporter,
            slaDeadline = clock.now().plus(if (cmd.critical) 2 else 24, ChronoUnit.HOURS),
            assignee = "值班工程师",
        )
        tickets.save(ticket)
        notifier.notifyAssigned(ticket)
        return ticket
    }
}

// ================= 驱动侧适配器：彼此完全对等，都只认识内核的用例 =================

class PhoneChannelAdapter(private val useCase: CreateTicketUseCase) {          // 生产驱动者 1
    fun onCallFinished(callerPhone: String, summary: String) =
        useCase.execute(CreateTicketCommand(summary, callerPhone, critical = false))
}

class IotAlarmAdapter(private val useCase: CreateTicketUseCase) {              // 生产驱动者 2
    fun onAlarm(deviceId: String, code: String) =
        useCase.execute(CreateTicketCommand("设备告警:$code", "device:$deviceId", critical = true))
}

class TestDriverAdapter(                                                       // 测试 = 驱动者 3
    private val useCase: CreateTicketUseCase,
    private val clock: FixedClock,
    private val repo: InMemoryTicketRepository,
) {
    fun runSlaTests(): List<String> {
        val urgent = useCase.execute(CreateTicketCommand("水质异常", "tester", critical = true))
        val r1 = if (urgent.slaDeadline == clock.now().plus(2, ChronoUnit.HOURS) && urgent in repo.saved)
            "✅ 关键工单 SLA = now+2h，已落库" else "❌ 关键工单 SLA 规则失效"
        val normal = useCase.execute(CreateTicketCommand("换龙头", "tester", critical = false))
        val r2 = if (normal.slaDeadline == clock.now().plus(24, ChronoUnit.HOURS) && normal in repo.saved)
            "✅ 普通工单 SLA = now+24h，已落库" else "❌ 普通工单 SLA 规则失效"
        return listOf(r1, r2)
    }
}

// ================= 被驱动侧适配器：换实现 = 换装配，内核零改动 =================

object SystemClock : ClockPort { override fun now() = Instant.now() }          // 生产实现
class SmsNotifier : NotifierPort {                                             // 生产实现 1
    override fun notifyAssigned(ticket: Ticket) = println("   [短信] 工单 ${ticket.id} 已派给 ${ticket.assignee}")
}
class DingTalkNotifier : NotifierPort {                                        // 生产实现 2（替换 1，内核不知道也不关心）
    override fun notifyAssigned(ticket: Ticket) = println("   [钉钉] 工单 ${ticket.id} 已派给 ${ticket.assignee}")
}
object SilentNotifier : NotifierPort { override fun notifyAssigned(ticket: Ticket) {} }  // 测试替身
class InMemoryTicketRepository : TicketRepository {                            // 测试替身
    private var seq = 0
    val saved = mutableListOf<Ticket>()
    override fun nextId() = "T-${++seq}"
    override fun save(ticket: Ticket) { saved += ticket }
}
class FixedClock(private val fixed: Instant) : ClockPort {                     // 测试替身：可拨的时钟
    override fun now() = fixed
}

fun main() {
    println("== ① 生产装配 A：电话渠道 + 短信通知 ==")
    run {
        val useCase = CreateTicketUseCase(InMemoryTicketRepository(), SmsNotifier(), SystemClock)
        PhoneChannelAdapter(useCase).onCallFinished("13800000000", "桶破损，水洒了")
    }

    println("== ② 生产装配 B：IoT 渠道 + 钉钉通知（换驱动侧与被驱动侧适配器，内核一行不改） ==")
    run {
        val useCase = CreateTicketUseCase(InMemoryTicketRepository(), DingTalkNotifier(), SystemClock)
        IotAlarmAdapter(useCase).onAlarm(deviceId = "WT-008", code = "WATER_QUALITY")
    }

    println("== ③ 测试适配器驱动内核（FixedClock + 内存库 + 静默通知：UI/真库/真实时钟全被替身换掉） ==")
    run {
        val repo = InMemoryTicketRepository()
        val clock = FixedClock(Instant.parse("2026-11-03T10:00:00Z"))
        val useCase = CreateTicketUseCase(repo, SilentNotifier, clock)
        TestDriverAdapter(useCase, clock, repo).runSlaTests().forEach { println("   $it") }
    }

    println("== ④ 复盘：上面三段共用同一个内核——变的只是两侧适配器与装配 ==")
    println("   同一份代码：六边形讲'两侧适配器'，洋葱讲'依赖向内'，整洁讲'框架是细节'")
    println("   端口倒置后连时钟都可替换 → SLA 这类时间规则立刻变得可测（这是传统分层难给的红利）")
}
