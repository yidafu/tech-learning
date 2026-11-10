// P19_Mediator.kt —— 中介者模式（行为型）
//
// 意图：用一个中介对象封装一组对象之间的交互，把网状依赖变成星型。
//       与外观（P15）的区别：外观是"外面 → 里面"的单向简化；中介者是同事之间互相通信的双向协调。
//
// 场景：加购流程涉及购物车、库存、促销、积分。让它们互相调用会织成网
//       （购物车↔库存、购物车↔促销、促销↔积分……），任何两两都可能长出新联动；
//       引入中介者后每个组件只认识中介，联动规则集中在中介一处。
//
// 代价提示：中介者自己会越长越胖（"上帝类"）——规则继续膨胀时的下一步是流程编排/规则引擎。
//
// 运行：kotlinc P19_Mediator.kt -include-runtime -d p19.jar && java -jar p19.jar

// 中介者接口：同事之间所有"联动"都通过这里
interface CartMediator {
    fun onItemAdded(sku: String, qty: Int)
}

// ── 同事组件：只依赖中介者接口，彼此互不相识 ──
class Cart(private val mediator: CartMediator) {
    private val items = mutableMapOf<String, Int>()

    fun addItem(sku: String, qty: Int) {
        items[sku] = (items[sku] ?: 0) + qty
        println("[购物车] 加入 $sku x$qty（当前 ${items.size} 种商品）")
        mediator.onItemAdded(sku, qty)          // 只上报事件，不关心谁会响应
    }

    fun removeLast(sku: String, qty: Int) {
        items[sku] = (items[sku] ?: 0) - qty
        println("[购物车] 回滚 $sku x$qty")
    }
}

class StockColleague {
    private val stock = mapOf("8001" to 100, "8002" to 0)
    fun tryLock(sku: String, qty: Int): Boolean {
        val ok = (stock[sku] ?: 0) >= qty
        println("[库存] ${if (ok) "锁定 $sku x$qty" else "$sku 库存不足"}")
        return ok
    }
}

class PromoColleague {
    fun preview(sku: String) = println("[促销] $sku 参与「满 100 减 20」，预览价已更新")
}

class PointsColleague {
    fun preview(sku: String, qty: Int) = println("[积分] 预计获得 ${qty * 10} 积分")
}

// ── 具体中介者：集中编排联动规则 ──
class CheckoutMediator : CartMediator {
    val stock = StockColleague()
    val promo = PromoColleague()
    val points = PointsColleague()
    val cart = Cart(this)        // 购物车在中介者内部创建，避免循环构造

    override fun onItemAdded(sku: String, qty: Int) {
        if (!stock.tryLock(sku, qty)) {
            cart.removeLast(sku, qty)      // 联动规则一：库存不足 → 回滚购物车
            return
        }
        promo.preview(sku)                 // 联动规则二：促销试算
        points.preview(sku, qty)           // 联动规则三：积分预告
    }
}

fun main() {
    val m = CheckoutMediator()

    println("── 场景 1：加购库存充足的商品（一路联动到底）──")
    m.cart.addItem("8001", 2)

    println("\n── 场景 2：加购库存为 0 的商品（中介者协调回滚）──")
    m.cart.addItem("8002", 1)

    println("\n要点：四个组件互相之间零依赖（星型）；新增联动（如加购后发埋点）只改中介者一处。")
}
