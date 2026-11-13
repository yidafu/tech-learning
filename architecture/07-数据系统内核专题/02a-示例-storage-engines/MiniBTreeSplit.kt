// MiniBTreeSplit.kt —— B+ 树页分裂小实验：同样的键量，顺序键 vs 随机键的页数、分裂次数与叶页填充率对照
//
// 看点：
//   ① 顺序键 + 最右侧优化（真实引擎的行为，InnoDB 对递增主键就是这样）：叶页几乎全满，树最紧凑；
//   ② 随机键：页被从中间劈开又慢慢填，平均填充率收敛到约 69%（经典结论 ln2≈0.69，Yao 1978 的 B 树分析），
//      同样的键要多占约 1.4~1.5 倍页数——UUID 主键膨胀的机械根源；
//   ③ 对比“顺序键但无最右侧优化”（朴素中点分裂）：连顺序插入也只有约 50% 填充——
//      说明“自增主键友好”不是免费的，是引擎做了定向优化换来的。
//
// 只统计分裂次数与页占用，不真写盘。阶数故意调小（每页 8 键），让分裂早出现、现象放大。
// 运行：kotlinc MiniBTreeSplit.kt -include-runtime -d bt.jar && java -jar bt.jar

class MiniBTree(val maxKeys: Int = 8, private val rightmostOpt: Boolean = true) {
    class Page {
        val keys = mutableListOf<Int>()
        val children = mutableListOf<Page>()
        val leaf get() = children.isEmpty()
    }

    var splits = 0
    var pages = 1
    var root = Page()

    private fun full(p: Page) = p.keys.size >= maxKeys

    fun insert(key: Int) {
        if (full(root)) {                       // 根满：中点上提新根，树高 +1
            val newRoot = Page()
            newRoot.children.add(root)
            splitChild(newRoot, 0, null)
            root = newRoot
        }
        insertNonFull(root, key)
    }

    private fun insertNonFull(p: Page, key: Int) {
        if (p.leaf) {
            p.keys.add(key); p.keys.sort()
            return
        }
        var i = p.keys.indexOfFirst { it > key }.let { if (it < 0) p.keys.size else it }
        if (full(p.children[i])) {
            splitChild(p, i, key)
            if (key >= p.keys[i]) i++           // 分离键是右页首键的拷贝，等于也走右
        }
        insertNonFull(p.children[i], key)
    }

    // 页分裂：叶页可走“最右侧优化”（新页从空开始、旧页保持全满），内节点一律中点
    private fun splitChild(parent: Page, idx: Int, incoming: Int?) {
        val child = parent.children[idx]
        val right = Page()
        val upKey: Int
        if (child.leaf) {
            val sequential = rightmostOpt && incoming != null &&
                idx == parent.children.size - 1 && incoming > child.keys.last()
            if (sequential) {
                upKey = incoming!!              // 顺序插入：右页空开张，旧页全满不动
            } else {
                val mid = child.keys.size / 2   // 中点分裂：两页各半
                while (child.keys.size > mid) right.keys.add(0, child.keys.removeAt(child.keys.size - 1))
                upKey = right.keys.first()      // B+ 语义：分离键是右页首键的拷贝
            }
        } else {
            val mid = child.keys.size / 2
            while (child.keys.size > mid + 1) right.keys.add(0, child.keys.removeAt(child.keys.size - 1))
            while (child.children.size > mid + 1) right.children.add(0, child.children.removeAt(child.children.size - 1))
            upKey = child.keys.removeAt(child.keys.size - 1)
        }
        parent.keys.add(idx, upKey)
        parent.children.add(idx + 1, right)
        splits++
        pages++
    }

    fun leafFill(): Double {
        var leaves = 0; var keys = 0
        fun walk(p: Page) {
            if (p.leaf) { leaves++; keys += p.keys.size } else p.children.forEach(::walk)
        }
        walk(root)
        return keys.toDouble() / leaves / maxKeys * 100
    }
}

fun main() {
    val n = 3000
    val rndKeys = List(50_000) { kotlin.random.Random(it * 31 + 7).nextInt(1_000_000) }.distinct().take(n)

    val seq = MiniBTree(rightmostOpt = true)
    (1..n).forEach(seq::insert)
    println("① 顺序键（带最右侧优化，真实引擎行为）：页数=${seq.pages}，分裂=${seq.splits} 次，叶页平均填充率 ${"%.0f".format(seq.leafFill())}%")

    val rnd = MiniBTree(rightmostOpt = true)
    rndKeys.forEach(rnd::insert)
    println("② 随机键（同样带优化，但优化救不了它）    ：页数=${rnd.pages}，分裂=${rnd.splits} 次，叶页平均填充率 ${"%.0f".format(rnd.leafFill())}%")

    val naive = MiniBTree(rightmostOpt = false)
    (1..n).forEach(naive::insert)
    println("③ 顺序键（朴素中点分裂，无优化）          ：页数=${naive.pages}，分裂=${naive.splits} 次，叶页平均填充率 ${"%.0f".format(naive.leafFill())}%")

    println()
    println(String.format("随机键比顺序键多占 %.2f 倍页（1/ln2 ≈ 1.44，经典 B 树分析的收敛值）", rnd.pages.toDouble() / seq.pages))
    println("结论：①与②的差距就是“自增/雪花主键对 B+ 树友好”的机械根源；③说明这份友好需要引擎定向优化（InnoDB 对递增键走顺序分裂）")
}
