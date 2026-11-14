# 流式布局 Flow：贪心装行的完整算法

> [返回：布局算法专题导览](01-导览.md)
> 本册走读 `gui/labs/mini-gui/src/core/render/flow.ts`（181 行）与 `flow.test.ts`（98 行，7 条手算断言）。读完你应当能在纸上算出：任意一组子（含间距、对齐、拉伸配置）在给定宽度里如何换行、每行怎么摆、容器自身多大——这正是标签云、聊天气泡流、设置页表单项流的底层算法。实跑口径：本册全部断言出自 vitest 实跑（全仓 25 文件 201 断言全绿，2026-11-14）。

## 1. 概念坐标：Flow = Flex + 一个分叉

第四阶段《Flex 布局》立起的 Flex 算法是**单行**的：子沿主轴排队，放不下就记溢出。Flow 只增加一个分叉——**主轴装不下就封行、开新行**；但这一步带来三个新的子问题，构成本册的全部内容：

```text
Flex（单行）                    Flow（多行）
[A][B][C][D→溢出]               行1: [A][B]
                                行2: [C][D]      ← 换行分叉
问题 1 装行判定：什么时候封行？（贪心装行，第 3 节）
问题 2 行内摆位：每行的富余怎么分？（lineAlign，第 4.1 节）
问题 3 行间堆叠：行高怎么定、行与行怎么排？（crossAlign，第 4.2 节）
```

方向语义（与 CSS flex-wrap 同构）：

| direction | 主轴 | 交叉轴 | 「封行」实际发生的事 |
|---|---|---|---|
| `row` | 水平 | 垂直 | 换**行**：y 前进，x 归零 |
| `column` | 垂直 | 水平 | 换**列**：x 前进，y 归零 |

源码里没有两份算法——`row` 一个布尔开关做轴映射（与 Flex 的 `isRow()` 同一先例），每个公式都同时读得通两个方向。

## 2. 参数与观测口

```ts
new RenderFlow({
  direction?: FlowDirection,   // row | column（默认 row）
  lineAlign?: LineAlign,       // start | center | end | spaceBetween（默认 start）
  crossAlign?: FlowCrossAlign, // start | center | end | stretch（默认 start）
  mainGap?: number,            // 同一行相邻子的主轴间距（默认 0）
  crossGap?: number,           // 行与行的交叉间距（默认 0）
})
```

两个**只读观测口**（布局结果不是配置，测试直接断言它们）：

| 观测口 | 含义 | 谁消费 |
|---|---|---|
| `lineCount` | 封出来的行数——换行是否发生的直接证据 | 测试；控件可据此显示「共 N 行」 |
| `mainOverflow` | 单行内容超出容器主轴 max 的量（>0 即有子被硬塞在自己一行里） | 测试；宿主画溢出警示 |

## 3. 算法四步（performLayout 逐段走读）

### 3.1 第一步：量尺寸——主轴必须无界

```ts
// ---- 1. 量尺寸：主轴无界松约束（与 Flex 的 looseMain 同一先例——量「自然尺寸」，
//         「子比容器宽」才可观测，溢出才有定义）；交叉轴仍受容器 max 约束 ----
child.layout({
  minWidth: 0,
  maxWidth: Number.MAX_SAFE_INTEGER,
  minHeight: 0,
  maxHeight: maxCross === Infinity ? Number.MAX_SAFE_INTEGER : maxCross,
});
entries.push({ node: child, main: row ? child.width : child.height, cross: row ? child.height : child.width });
```

**为什么主轴无界**：布局协议的第二句是「子返回约束内的尺寸」——基类 `layout()` 会把子回报的尺寸 `constrainSize` 钳回约束。如果这里给 `maxWidth = maxMain`，一个 150 宽的子会被**悄悄钳到 100**，装行判定永远看不到真实的 150，溢出就从框架的眼睛里消失了。

> **实测教训**（本册最贵的一课）：初版实现给的是 `maxWidth: maxMain`，结果「超宽子独占一行并记溢出」用例挂了——`mainOverflow` 恒为 0。排查半天才意识到不是装行逻辑错了，而是**量尺寸那一步就把证据销毁了**。修复 = 与 `flex.ts` 的 `looseMain` 对齐（主轴 `MAX_SAFE_INTEGER`）。教训写成一句话：**量自然尺寸的约束和摆放的约束是两件事；量的时候钳制，等于提前做了摆位的决定**。

交叉轴有界的原因不同：行高要参与装行后的堆叠，子的交叉尺寸不能无限膨胀（比如文本叶子在交叉方向是单行高度，本来就不会越界；但如果某天接入可换行文本，这里要重新审视）。

### 3.2 第二步：贪心装行——一个判定式

```ts
type Line = { indexes: number[]; mainExtent: number; crossExtent: number };
const lines: Line[] = [];
let cur: Line = { indexes: [], mainExtent: 0, crossExtent: 0 };
for (let i = 0; i < entries.length; i++) {
  const e = entries[i]!;
  const empty = cur.indexes.length === 0;
  const needGap = empty ? 0 : this.mainGap;
  if (!unbounded && !empty && cur.mainExtent + needGap + e.main > maxMain) {
    lines.push(cur);
    cur = { indexes: [], mainExtent: 0, crossExtent: 0 };
  }
  cur.indexes.push(i);
  cur.mainExtent = cur.indexes.length === 1 ? e.main : cur.mainExtent + this.mainGap + e.main;
  if (e.cross > cur.crossExtent) cur.crossExtent = e.cross;
}
if (cur.indexes.length > 0) lines.push(cur);
this.lineCount = lines.length;
```

判定式只有一条：

```text
装不下  ⟺  行非空  且  行已占宽 + mainGap + 新子宽 > maxMain
```

三条边界规则，每条都有明确的「为什么」：

| 规则 | 为什么 |
|---|---|
| **空行必收** | 行空时无条件收下当前子。否则一个比容器还宽的子会永远「装不下」，算法死循环或丢子——宁可收下并记 `mainOverflow` |
| **gap 只在非空行计** | 行首子前面没有间隙。`needGap = empty ? 0 : mainGap` 保证「60+10+30=100 恰好装下」这类临界判定不出错 |
| **unbounded 不装行** | 主轴无界（父没给宽度上限）时判定式无意义 → 整体退化为单行（与 Flex 行为一致） |

行高记账：`crossExtent` 取行内最大交叉尺寸——这就是 CSS 的行盒模型（line box）：行的高度由**最高的那个成员**决定，矮的成员之后按 `crossAlign` 在行内摆。

手算演练（容器宽 100，gap=0，子 [60×30, 60×30, 30×30, 40×40]）：

```text
i=0  行空 → 收         cur: [60×30]      行宽 60  行高 30
i=1  60+0+60=120 > 100 → 封行1，开行2    cur: [60×30]      行宽 60  行高 30
i=2  60+0+30=90  ≤ 100 → 收            cur: [60×30, 30×30] 行宽 90 行高 30
i=3  90+0+40=130 > 100 → 封行2，开行3    cur: [40×40]      行宽 40  行高 40
收尾：封行3 → lines = 3 行，lineCount = 3
```

### 3.3 第三步：摆位——行内分富余 + 行内交叉对齐

外层循环沿交叉轴堆叠行（`crossCursor`），内层循环沿主轴摆行内成员（`cursor`）：

```ts
let crossCursor = 0;
for (const line of lines) {
  if (line.mainExtent > widest) widest = line.mainExtent;
  const slack = unbounded ? 0 : maxMain - line.mainExtent;
  let cursor = 0;
  if (this.lineAlign === LineAlign.center && slack > 0) cursor = slack / 2;
  else if (this.lineAlign === LineAlign.end && slack > 0) cursor = slack;
  const n = line.indexes.length;
  const betweenGap = this.lineAlign === LineAlign.spaceBetween && n > 1 && slack > 0 ? slack / (n - 1) : 0;
  for (let k = 0; k < n; k++) {
    const e = entries[line.indexes[k]!];
    if (k > 0) cursor += betweenGap > 0 ? betweenGap : this.mainGap;
    // ...stretch 重排（见 4.2）...
    let crossPos = 0;
    if (this.crossAlign === FlowCrossAlign.center) crossPos = (line.crossExtent - e.cross) / 2;
    else if (this.crossAlign === FlowCrossAlign.end) crossPos = line.crossExtent - e.cross;
    if (row) {
      node.x = cursor;
      node.y = crossCursor + crossPos;
    } else {
      node.x = crossCursor + crossPos;
      node.y = cursor;
    }
    cursor += e.main;
  }
  crossCursor += line.crossExtent + this.crossGap;
}
```

**行内富余**（lineAlign，四个档位一个公式 `slack = maxMain − 行宽`）：

| lineAlign | 行首位置 | 成员间距 | 手算（行宽 90，容器 100，成员 60+30） |
|---|---|---|---|
| `start` | 0 | `mainGap` | 成员在 x = 0、60 |
| `center` | `slack/2` = 5 | `mainGap` | x = 5、65 |
| `end` | `slack` = 10 | `mainGap` | x = 10、70 |
| `spaceBetween` | 0 | `slack/(n−1)` = 10 | x = 0、70（间隙**替换**了 mainGap） |

`spaceBetween` 的实现细节：`betweenGap` 只在 `n > 1 且 slack > 0` 时生效，摆位代码 `cursor += betweenGap > 0 ? betweenGap : this.mainGap` 让「富余为 0」时安全退回普通间距——两个档位共享一条游标推进路径，不写分支重复。

**行内交叉对齐**（crossAlign，矮成员在行高里怎么站）公式与 Flex 的 `placeChild` 同族：

```text
start:  crossPos = 0
center: crossPos = (行高 − 子交叉尺寸) / 2      ← 60×30 与 30×20 同行 → 20 高的子 y 偏 5
end:    crossPos = 行高 − 子交叉尺寸
stretch: 子被拉到行高（需要第二遍 layout，见 4.2）
```

**位置归父协议的现场**：`(cursor, crossCursor + crossPos)` 算的是 (main, cross)，最后按 `row` 映射进 `x/y`——子自己从不知道这两层游标的存在。

### 3.4 第四步：自身尺寸与溢出记账

```ts
const contentMain = unbounded ? widest : maxMain;
const mainSize = Math.min(Math.max(contentMain, minMain), unbounded ? Number.MAX_SAFE_INTEGER : maxMain);
const contentCross = lines.length > 0 ? crossCursor - this.crossGap : 0;
const crossSize = Math.min(Math.max(contentCross, minCross), maxCross === Infinity ? Number.MAX_SAFE_INTEGER : maxCross);
if (!unbounded) {
  for (const line of lines) {
    const over = line.mainExtent - maxMain;
    if (over > this.mainOverflow) this.mainOverflow = over;
  }
}
```

- 主轴：有界取 `maxMain`（Flow 的宽度通常跟容器走，像 CSS 的块级盒子）；无界取最宽行（行内内容尺寸）。
- 交叉：`Σ(行高 + crossGap)`，注意**末行的 crossGap 要减掉**（`crossCursor - this.crossGap`）——gap 是成员间的，不是围栏外的。
- 溢出：逐行对账。因为第一步量的是自然尺寸，这里能抓到真实的超出量（空行必收的那类子，超出量全记在这里）。

## 4. 两个深水区

### 4.1 stretch 的第二遍 layout：为什么必须

量尺寸那一遍给的是「主轴无界松约束」，但 stretch 要求子的交叉尺寸 = 行高——行高在**装行之后**才知道（它依赖行内所有成员）。因果链决定了 stretch 只能事后补：

```text
量尺寸（松约束，不知道行高）→ 装行（算出行高）→ 对 stretch 的子：tight(自身主尺寸 × 行高) 再 layout
```

源码（跳过已到位的子，避免无谓重排）：

```ts
if (this.crossAlign === FlowCrossAlign.stretch && e.cross !== line.crossExtent) {
  const tightCross = line.crossExtent;
  if (row) {
    node.layout({ minWidth: node.width, maxWidth: node.width, minHeight: tightCross, maxHeight: tightCross });
  } else {
    node.layout({ minWidth: tightCross, maxWidth: tightCross, minHeight: node.height, maxHeight: node.height });
  }
  e.cross = tightCross;
}
```

注意紧约束的写法：**主轴 min=max=当前值**（只锁交叉轴），交叉 min=max=行高。布局缓存的判定是「约束没变且不脏则跳过」——这遍约束与第一遍不同，必然真重排；已等于行高的子被 `e.cross !== line.crossExtent` 守卫跳过。测试实抓：`stretch：矮子按行高紧约束重排`——30×20 的子与 60×30 同行，第二遍后 `b2.height === 30`、`b2.y === 0`。

**性能账**：无 stretch 时每个子恰好 layout 一次（O(n)）；有 stretch 时矮子 layout 两次。第二遍只锁尺寸不递归新约束形状，布局缓存保证不是全子树重排——但如果行内是复杂子树，代价仍在，这就是 CSS `align-items: stretch` 免费而自绘框架要记账的地方。

### 4.2 column 方向的语义辨析（测试踩过的坑）

`direction: column` 时「封行」= **开新列**：x 前进、y 归零。初版测试错误地期望「竖着装、y 前进、超底再 x 换」——把 row 语义照搬给了 column。正确语义（与 CSS `flex-direction: column; flex-wrap: wrap` 一致）：

```text
容器 300×50，子三个 30×30，gap 0：
  b1: 列1 (x=0)  y=0..30
  b2: 30+0+30=60 > 50（列高）→ 封列1，开列2 → (x=30, y=0)
  b3: 同理开列3 → (x=60, y=0)
  容器尺寸：交叉 = Σ列宽 = 90；主轴有界 → 高度钳到 50
```

一句话辨析：**主轴是「装填方向」，交叉轴是「溢出方向」——无论方向怎么转，装不下的永远沿交叉轴另起炉灶**。测试注释里把这条写成了断言：`换列：x 前进、y 归零`。

## 5. 手算用例全表（flow.test.ts 的 7 条断言）

| # | 用例 | 输入 | 纸上推导 | 关键断言 |
|---|---|---|---|---|
| 1 | 基本换行 | 100 宽，子 [60×30, 60×30, 30×30, 40×40]，gap 0 | 第 3.2 节的演算 | `lineCount=3`；`height=100`；b3 与 b2 同行 `x=60,y=30` |
| 2 | gap 参与判定 | 100 宽，mainGap 10，子 [60,30,30]×20 高 | 60→60+10+30=100 恰好 ≤100 → 同行；再 +10+30=140 >100 → 换行 | `lineCount=2`；b2 `x=70`；b3 `y=20`；`height=40` |
| 3 | spaceBetween+center | 100 宽，子 [60×30, 30×20] | slack=10 → 间距 10 → x=0/70；行高 30 → 20 高的子 y=(30−20)/2=5 | b2 `{x:70, y:5}` |
| 4 | 无界退化单行 | `layout({0..∞})`，子 [40×30, 50×30] | 无界不装行 → 1 行；宽 = 最宽行 90 | `lineCount=1`；`width=90` |
| 5 | 超宽子独占一行 | 100 宽，子 [150×20] | 空行必收 → 1 行；overflow=150−100=50 | `mainOverflow=50`；`width=100`（钳回） |
| 6 | column 换列 | 300×50，子三个 30×30 | 第 4.2 节演算 | `lineCount=3`；b2 `{x:30,y:0}`；`width=90`；`height=50` |
| 7 | stretch 拉满 | 100 宽，子 [60×30, 30×20] | 第二遍 tight → 矮子高 30 | `b2.height=30`；`b2.y=0` |

每条的期望值都先写在测试注释里、再由 vitest 对答案——上面第 2 行的「恰好装下」就是 `60 + 10 + 30 = 100` 的临界验证，`≤` 与 `<` 一字之差结果相反，这种边界只有手算过才敢签。

## 6. 复杂度账与适用边界

| 项 | 账目 |
|---|---|
| 量尺寸 | 每子 1 次 layout（主轴无界松约束） |
| 装行 | 纯记账循环，O(n)，无 layout |
| 摆位 | 纯赋值，O(n)；stretch 触发的第二遍只影响矮子（守卫跳过已到位者） |
| 总账 | **一遍布局**；stretch 使部分子两遍。换行本身是 O(n) 贪心，不做全局最优（「最少行数装完所有子」是 NP 难的装箱问题，工业框架全部用贪心） |
| 失效代价 | 任一子尺寸变 → 需要重新装行 → 整个 Flow 标脏重排（Flow 内部没有局部失效的余地；大量子时可像虚拟列表那样按行分块，见第八阶段分册） |

适用：标签云、聊天气泡、设置表单流、_wrap_ 型工具栏。不适用：需要列对齐（→ Grid）、需要贴边锚定（→ Constraint）、需要重叠（→ Stack）。

## 7. 临界判定专项：`>` 与 `≥` 的一线之差

装行判定式 `cursor + needGap + w > maxMain` 用的是**严格大于**——「恰好装满」算装得下。把四种临界输入全列出来，这条约定就无处含糊（全部可对照测试复跑）：

| 输入（容器宽 100） | 判定 | 结果 | 对应测试 |
|---|---|---|---|
| 行宽 60，新子 40，gap 0 → 60+0+40 = 100 | `100 > 100` = false | **同行**（恰好装满） | 用例 2 的变体 |
| 行宽 60，新子 30，gap 10 → 60+10+30 = 100 | false | **同行** | 用例 2（`b2.x=70`） |
| 行宽 60，新子 31，gap 10 → 60+10+31 = 101 | true | 换行 | 手算可复推 |
| 行宽 0（空行），新子 150 | 空行必收 | 独占一行 + `mainOverflow=50` | 用例 5 |

为什么选「恰好装满算同行」：与 CSS flex line breaking 和文本排版的断行惯例一致（行宽用满到像素），也让「spaceBetween 分富余」在满行时退化为 0 间距（`slack=0` → `betweenGap=0` → 回落 `mainGap`）——三条规则在同一个点上自洽。

若把判定改成 `≥`，用例 2 的 `b2` 会掉到第二行、`lineCount` 变 3——这类「一字之差」必须由断言钉死，否则日后任何人「顺手优化」都可能悄悄改变全应用视觉。这正是手算文化存在的理由。



## 8. 对标工业框架

| mini-gui | CSS | Flutter | 备注 |
|---|---|---|---|
| `RenderFlow` + `lineAlign` | `flex-wrap: wrap` + `justify-content` | `Wrap(alignment:)` | 行内主轴对齐 |
| `crossAlign` | `align-items`（行内） | `Wrap(crossAxisAlignment:)` | stretch 语义同为「拉到行高」 |
| `crossGap` | `row-gap` | `Wrap(runSpacing:)` | 行距 |
| `mainGap` | `column-gap` | `Wrap(spacing:)` | 行内间距 |
| `mainOverflow` | （无对应，内容溢出裁剪） | （无对应） | 自绘框架独有的显式记账 |
| 贪心装行 | 浏览器同为贪心 | 同 | 全局最优装箱无人做 |

差异点：CSS 的行盒还有基线对齐（`align-items: baseline`）与 `align-content`（多行在交叉轴的整体分布）；mini-gui 教学版砍掉这两档——前者需要文本基线（第三阶段有 `baseline` 数据，接起来不难，留作练习），后者与 `lineAlign` 是同一公式的交叉轴翻版。

## 9. 常见误用与对接声明式层

### 9.1 误用清单：四个高频坑

**坑 1：Flow 里嵌 Flow，内层永远不换行。** 外层量尺寸给子的是「主轴无界」松约束（3.1 节），内层 `RenderFlow` 拿到的 `maxMain = MAX_SAFE_INTEGER`——`unbounded` 判定是 `=== Infinity`，false，但 9×10¹⁵ 宽的容器装行永不触发，**等效单行**。解法：内层套 `RenderConstrainedBox`/`RenderSizedBox` 把宽度定死，或者干脆不用嵌套（行内布局交给行内文本引擎）。

**坑 2：把 `mainGap` 当 `crossGap` 用。** gap 是按轴命名的（主轴/交叉轴），column 方向时二者的视觉含义互换。构造器传参前先问「哪个方向」——测试用例 2/6 分别在 row/column 下了断言，改方向时两处断言必须一起挪。

**坑 3：指望 `mainOverflow` 触发滚动。** 溢出量只是**记账**，Flow 不会裁剪也不会滚动（裁剪归 `clipsContent` 协议，滚动归 ScrollView）。正确组合：`ScrollView(内容: Flow)`。

**坑 4：无界交叉轴 + stretch。** stretch 拉到「行高」没有问题，但如果有人把 stretch 理解成「拉到容器高」就错了——那是 `align-content` 的职责（教学版未实现）。行高 ≠ 容器交叉尺寸，差值是各行间富余。

### 9.2 组合语义表：lineAlign × crossAlign

| | cross `start` | cross `center` | cross `end` | cross `stretch` |
|---|---|---|---|---|
| line `start` | 常规左上堆叠 | 行内垂直居中 | 行内贴底 | 矮子拉到行高，行首堆叠 |
| line `center` | 行块整体居中 + 行内顶对齐 | 双居中（徽标流常用） | 行块居中 + 行内贴底 | 行块居中 + 拉伸 |
| line `end` | 行块贴右 | 行块贴右 + 行内居中 | 行块贴右下 | 行块贴右 + 拉伸 |
| line `spaceBetween` | 富余变行内间距 | 间距 + 居中 | 间距 + 贴底 | 间距 + 拉伸（拉伸改变行高→改变后续行位置，注意） |

全部组合**合法**（没有互斥项），但最后一格要留意：stretch 改变行高 → 改变 `crossCursor` 推进 → 改变后续所有行的位置。这是 Flow 内唯一的「摆位影响装行结果」的间接反馈——它不形成环（装行只用主轴尺寸，stretch 只改交叉轴），所以算法依然一遍终止。

### 8.3 对接声明式层（vdom）草图

第七阶段的 VElement 模式可以原样套一个 `vflow` 节点（毕业项目扩展，未落地——这里给出对接面）：

```ts
// 虚拟节点（不可变描述）：挂到 vdom.ts 的 VNode 联合里，type: "flow"
vflow({ lineAlign: "spaceBetween", crossAlign: "center", mainGap: 8 }, [
  vtext("标签一"), vtext("标签二"), ...
]);
// mount/updateElement 的 flow 分支：新建/复用 RenderFlow（Element 树最小形态原则）
//   复用判定：lineAlign 等参数变了 → setStyle 式原地改 + markNeedsLayout
//   子列表 → reconcileChildren 的 keyed 复用照搬（keyFor 内容派生 key）
```

对接时唯一的坑：Flow 的子顺序 = 装行顺序 = **声明顺序**，所以 keyed 协调必须保持顺序稳定（同 key 不同位会整行重装）——这正好是第七阶段 `reconcileChildren` 已经保证的性质。

## 10. 实跑记录

```text
$ npx vitest run src/core/render/flow.test.ts
 ✓ src/core/render/flow.test.ts (7 tests) 3ms
全仓：25 个测试文件 201 条断言全绿（2026-11-14）
```

（下册预告：Grid 把「先解轨道表、后入座」的两段式算法讲完，你就能手算 `280 剩余空间按 1:2 分出 94/186` 这种确定性舍入。）
