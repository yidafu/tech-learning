// P02_Singleton.kt —— 单例模式（创建型）
//
// 意图：进程内全局唯一实例。
//
// 场景：应用启动时配置只加载一次、全局使用（饿汉）；
//       风控规则引擎初始化昂贵（要加载模型），希望第一次真正用到时才初始化（懒汉）。
//
// 警示：单例 = 伪装的全局变量，依赖它的代码看不出依赖关系、单测难以替换。
//       如果它是需要被注入/替换的"依赖"，更好的做法是构造函数注入，把"唯一"交给调用方保证。
//
// 运行：kotlinc P02_Singleton.kt -include-runtime -d p02.jar && java -jar p02.jar

// 饿汉式单例：object 声明，JVM 类加载机制保证线程安全、进程唯一
object AppConfig {
    init { println("[启动] AppConfig 加载配置（本行只会打印一次）") }

    val paymentTimeoutMs: Long = 3_000
    val defaultCurrency: String = "CNY"
    val maxRetry: Int = 2
}

// 懒加载单例：首次访问才初始化，lazy 默认线程安全（synchronized 锁定）
class RiskEngine {
    init { println("[初始化] RiskEngine 加载规则模型（真实项目中约等于数秒的耗时操作）") }

    fun score(userId: String): Int = (userId.hashCode() % 100 + 100) % 100
}

val riskEngine: RiskEngine by lazy { RiskEngine() }

fun main() {
    println("── 场景 1：支付模块和订单模块各自读配置 ──")
    println("[支付] 超时时间 = ${AppConfig.paymentTimeoutMs}ms")
    println("[订单] 重试次数 = ${AppConfig.maxRetry}，币种 = ${AppConfig.defaultCurrency}")
    println("（上面两处访问的是同一个实例，启动日志只打印了一次）\n")

    println("── 场景 2：风控引擎懒加载 ──")
    println("程序已启动，但还没人查过风险分 —— RiskEngine 尚未创建")
    println("第一次查询（触发初始化）：u_42 的风险分 = ${riskEngine.score("u_42")}")
    println("第二次查询（不再触发初始化）：u_1001 的风险分 = ${riskEngine.score("u_1001")}")
}
