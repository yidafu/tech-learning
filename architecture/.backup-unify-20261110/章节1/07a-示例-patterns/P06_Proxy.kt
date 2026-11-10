// P06_Proxy.kt —— 代理模式（结构型）
//
// 意图：**控制**对真实对象的访问（权限/懒加载/缓存/远程调用），调用方无感。
// 与装饰器的区别：装饰器叠加能力，调用方知情并主动选择套几层；
//               代理控制访问，调用方以为自己调的就是真对象。
//
// 场景：库存服务是远程 RPC。本地拿到的是一个"库存服务对象"，调用 lockStock 即可——
//       实际上它是保护代理：先做权限校验，通过后才转发给真正的远程调用。
//       这就是 RPC 框架（gRPC/Dubbo）"本地桩 stub"的原型。
//
// 运行：kotlinc P06_Proxy.kt -include-runtime -d p06.jar && java -jar p06.jar

interface InventoryFacade {
    fun lockStock(orderId: String, sku: String, quantity: Int)
}

// 真实对象：一次远程 RPC（用打印模拟序列化 + 网络 + 反序列化）
class RealInventoryFacade : InventoryFacade {
    override fun lockStock(orderId: String, sku: String, quantity: Int) {
        println("[远程调用] 库存服务锁定: orderId=$orderId sku=$sku x$quantity")
    }
}

// 保护代理：调用方以为在调真服务，实际上先过权限检查
class InventoryProxy(
    private val real: InventoryFacade = RealInventoryFacade(),
) : InventoryFacade by real {

    // 演示用可变字段；真实项目从请求上下文/登录态获取当前用户
    var currentUser: String = "system"

    override fun lockStock(orderId: String, sku: String, quantity: Int) {
        check(currentUser in setOf("system", "ops", "admin")) {
            "用户 $currentUser 无权操作库存"
        }
        real.lockStock(orderId, sku, quantity)
    }
}

fun main() {
    val proxy = InventoryProxy()

    println("── 场景 1：客服实习生（guest）想手动锁库存 —— 被代理拦截 ──")
    proxy.currentUser = "guest"
    runCatching { proxy.lockStock("o_5001", "8001", 1) }
        .onFailure { println("[代理拦截] ${it.message}") }

    println("\n── 场景 2：运营（ops）正常操作 —— 校验通过，转发给真实远程对象 ──")
    proxy.currentUser = "ops"
    proxy.lockStock("o_5001", "8001", 1)
}
