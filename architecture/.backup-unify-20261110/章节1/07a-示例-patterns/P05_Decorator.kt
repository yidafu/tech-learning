// P05_Decorator.kt —— 装饰器模式（结构型）
//
// 意图：不改原类、动态叠加能力；多个正交能力可自由组合。
//
// 场景：订单服务调用上游结算 API 的 HTTP 客户端，需要三种正交能力：
//       日志 × 重试 × 耗时统计。用继承要 2³=8 个子类全覆盖组合；
//       用装饰器只要 3 个装饰器类，组合交给调用方按需"套娃"。
//
// 运行：kotlinc P05_Decorator.kt -include-runtime -d p05.jar && java -jar p05.jar

import java.io.IOException

interface OrderHttpClient {
    fun post(path: String, body: String): String
}

// 会抖动的网络客户端：前 failTimes 次抛异常（用于演示重试）
class FlakyOrderHttpClient(private val failTimes: Int) : OrderHttpClient {
    private var calls = 0
    override fun post(path: String, body: String): String {
        if (calls++ < failTimes) throw IOException("网络抖动 #$calls")
        return "200 OK（第 $calls 次调用成功）"
    }
}

// 装饰器一：日志。接口委托 by 让未覆盖的方法自动转发，装饰器只写差异
class LoggingClient(private val delegate: OrderHttpClient) : OrderHttpClient by delegate {
    override fun post(path: String, body: String): String {
        println("[日志] → POST $path")
        val resp = delegate.post(path, body)
        println("[日志] ← $resp")
        return resp
    }
}

// 装饰器二：重试
class RetryClient(
    private val delegate: OrderHttpClient,
    private val maxRetries: Int = 2,
) : OrderHttpClient by delegate {
    override fun post(path: String, body: String): String {
        var last: IOException? = null
        repeat(maxRetries + 1) { attempt ->
            try {
                return delegate.post(path, body)
            } catch (e: IOException) {
                println("[重试] 第 ${attempt + 1} 次失败: ${e.message}")
                last = e
            }
        }
        throw last!!
    }
}

// 装饰器三：耗时统计
class TimingClient(private val delegate: OrderHttpClient) : OrderHttpClient by delegate {
    override fun post(path: String, body: String): String {
        val start = System.nanoTime()
        val resp = delegate.post(path, body)
        println("[指标] $path 耗时 ${(System.nanoTime() - start) / 1_000_000}ms")
        return resp
    }
}

fun main() {
    println("── 组合 1：重试(日志(抖动网络)) —— 每次尝试都有日志 ──")
    val c1: OrderHttpClient = RetryClient(LoggingClient(FlakyOrderHttpClient(failTimes = 2)))
    println("最终结果: ${c1.post("/settle", "{\"order\":\"o_88\"}")}\n")

    println("── 组合 2：指标(日志(重试(抖动网络))) —— 同样能力、不同套法、行为不同 ──")
    // 重试在最内层默默重试，日志只记一次最终成功，指标统计的是含重试的总耗时
    val c2: OrderHttpClient = TimingClient(LoggingClient(RetryClient(FlakyOrderHttpClient(failTimes = 1))))
    c2.post("/settle", "{\"order\":\"o_89\"}")
}
