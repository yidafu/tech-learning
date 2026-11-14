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

## 11. 手算/走查配方：装行五步推演

配方固定五步，任何 Flow 界面都能在纸上走完。示例参数贯穿全程：

```text
容器约束：宽 0..120、高 0..300（row 方向，maxMain = 120）
配置：mainGap = 10，crossGap = 0，lineAlign = start，crossAlign = center
子（声明序）：b1 = 50×24，b2 = 40×30，b3 = 45×24，b4 = 60×20，b5 = 30×36
```

**第 1 步：参数归一。** 把每个子记成「主×交」二元组（row 方向主轴是宽）：b1 = 50×24、b2 = 40×30、b3 = 45×24、b4 = 60×20、b5 = 30×36。方向搞反全盘皆错，这步是防呆步。

**第 2 步：贪心装行。** 逐个过判定式「行非空 且 行宽 + mainGap + 新子主 > maxMain」：
- b1：行空必收 → 行1 = [b1]，行宽 50，行高 24；
- b2：50 + 10 + 40 = 100 ≤ 120 → 收 → 行1 = [b1, b2]，行宽 100，行高 max(24, 30) = 30；
- b3：100 + 10 + 45 = 155 > 120 → **封行1**；行空 → 行2 = [b3]，行宽 45，行高 24；
- b4：45 + 10 + 60 = 115 ≤ 120 → 收 → 行2 = [b3, b4]，行宽 115，行高 24；
- b5：115 + 10 + 30 = 155 > 120 → **封行2**；行3 = [b5]，行宽 30，行高 36；
- 收尾封行3 → 三行，`lineCount = 3`。

**第 3 步：行内摆位（lineAlign = start → 行首 cursor = 0）。** 成员间推进 `cursor += 主 + mainGap`；行内交叉偏移 `crossPos = (行高 − 子交) / 2`（center）：
- 行1（crossCursor = 0）：b1 在 x = 0、crossPos = (30−24)/2 = 3 → (0, 3)；b2 在 x = 50+10 = 60、crossPos = 0 → (60, 0)；
- 行2（crossCursor = 30）：b3 → x = 0、crossPos = 0 → (0, 30)；b4 → x = 45+10 = 55、crossPos = (24−20)/2 = 2 → (55, 32)；
- 行3（crossCursor = 54）：b5 → x = 0、crossPos = 0 → (0, 54)。

**第 4 步：容器尺寸与记账。** 主轴有界 → 宽 = 120；交叉 = `crossCursor − crossGap` = 90 − 0 = **90**；溢出 = max(100, 115, 30) − 120 全为负 → `mainOverflow = 0`。

**第 5 步：交叉自检（配方的保险丝）。** Σ行高 = 30 + 24 + 36 = 90，与第 4 步的 90 对上；各行成员「主 + gap」之和：50+10+40 = 100、45+10+60 = 115、30，与各行宽对上。两个和都对上，整套推演才算签收——对不上时先查第 1 步的方向归一，再查判定式的 gap 是否漏了「行首不计」。

这套配方与 `flow.test.ts` 的 7 条断言同构：上面第 2 步的三次判定分别对应「基本换行」「gap 参与判定」「超宽子独占一行」的判定形态，第 3 步对应「spaceBetween 分富余 + cross 居中」的 crossPos 算法。换任何参数（column 方向、end/spaceBetween、非零 crossGap）都走同样的五步，只是第 1 步的轴映射与第 3 步的行首公式变化——配方不变，变的只是代入值。

**变体走查：column 方向。** 同一组子换成 `direction: column`、容器改为宽 0..300 × 高 0..120（此时 maxMain = 120 是**高度**）：b1 → 列1，列高 24；b2 → 24 + 30 = 54 ≤ 120 收；b3 → 54 + 24 = 78 ≤ 120 收；b4 → 78 + 20 = 98 ≤ 120 收（列宽已涨到 60）；b5 → 98 + 36 = 134 > 120 → 封列1，开列2。`lineCount = 2`。摆位按 4.2 节的语义「装填 = 竖直、溢出 = 横向」：列1 成员 y = 0、24、54、78 全在 x = 0；列2 起点 crossCursor = 列宽 60 → b5 在 (60, 0)。容器：主轴有界 → 高钳 120；交叉 = Σ列宽 = 60 + 36 = **96**。与用例 6（三个 30×30 换三列）对照，本变体多了「列宽随成员涨」与「最后一格恰好装不下」两个形态——判定式的算术一字未改，只是主/交叉轴对调，这正是第 1 步「参数归一」存在的意义。

## 12. 反模式对照

六个高频反模式，每个都能在 `flow.ts` 里指到「为什么必然如此」的那一行：

| 反模式 | 症状 | 根源（源码行为） | 正确做法 |
|---|---|---|---|
| Flow 套 Flow，内层期望换行 | 内层 `lineCount` 恒为 1，全部子挤一行 | 外层量尺寸给子主轴 `MAX_SAFE_INTEGER`，内层装行判定永假（坑 1） | 内层套 `RenderConstrainedBox`/`RenderSizedBox` 定宽，或干脆单层摊平 |
| `mainGap` 与 `crossGap` 混用 | row 下正常、column 下间距「换了位置」 | gap 按轴命名，column 时视觉含义互换（坑 2） | 传参前先问「装填方向是哪根轴」；改方向时两处一起核对 |
| 指望 `mainOverflow` 触发裁剪 | 超宽内容照样画出界 | 溢出量只是记账，Flow 不裁剪不滚动（坑 3） | `ScrollView` 包住 Flow，裁剪归 `clipsContent` 协议 |
| stretch 当成「拉到容器高」 | 矮子高度 ≠ 容器高，以为出了 bug | stretch 拉的是**行高**（`line.crossExtent`），不是容器交叉尺寸（坑 4） | 要「整块拉满」是 align-content 语义（教学版未实现），外层自己布局 |
| 无界主轴下期待换行 | 整体单行，宽 = 内容总宽 | `unbounded` 时判定式被跳过（用例 4 的退化规则） | 给 Flow 的父约束必须有界；嵌套场景先定宽再进 Flow |
| 需要列对齐的表单用 Flow | 各行成员竖向错位 | 贪心装行只保证「装下」，不保证跨行对齐 | 换 [网格布局](03-网格布局Grid.md)——列对齐是 Grid 轨道语义的本职 |

使用这张表的方式不是背，而是对症状反查：界面上看到「挤成一行」「间距漂移」「画出界」，先在症状列定位，再读根源列的源码行为确认，最后照正确做法改。第六行的换布局器决策与第 6 节的适用边界表同源——反模式往往就是「用错工具」的症状，而不是参数调错。

一个补充观察：六个反模式里有四个（1、3、5、6）本质是「把 Flow 当成了它不是的东西」——不是换行器、不是滚动器、不是网格。布局器选错的代价在这里特别显眼，因为 Flow 的 API 面很小（五个参数），错了也没有别的地方可错。

## 13. code review 检查单

改 Flow 相关代码（含对 `flow.ts` 本身的改动）时逐条过；每条对应一个可实测的源码行为。

- [ ] 量尺寸约束与摆放约束仍然分离吗？任何「给子的量尺寸约束加上主轴 max」的改动都会重演 3.1 节的销毁证据事故（`mainOverflow` 恒 0）——主轴必须保持 `MAX_SAFE_INTEGER`
- [ ] 装行判定式是严格大于吗？「恰好装满算同行」是钉死的约定（用例 2 的 60+10+30=100）；动这个比较符必须重跑全部 7 条手算断言
- [ ] 空行必收的守卫还在吗？删掉它，比容器宽的子会永远「装不下」——空行收下并记溢出是唯一正确行为
- [ ] gap 的方向语义核对了吗？`mainGap` 沿装填轴、`crossGap` 沿溢出轴；column 用例（用例 6）与 row 用例（用例 2）都过一遍
- [ ] stretch 第二遍 layout 的守卫 `e.cross !== line.crossExtent` 还在吗？没有它，已到位的子也会被无谓重排；重排用的是「主轴锁当前值 + 交叉轴锁行高」的紧约束写法
- [ ] 交叉尺寸合计有没有多算末行 gap？`crossCursor - this.crossGap` 这一步不能删——gap 是成员间的，不是围栏外的
- [ ] `mainOverflow` 只被当记账消费吗？任何拿它做裁剪/滚动的代码都是反模式（上表第 3 行）
- [ ] 子顺序稳定依赖被知晓吗？装行顺序 = 声明顺序，keyed 协调必须保持顺序稳定（8.3 节对接面）；乱序复用会导致整行重装
- [ ] `spaceBetween` 的回落路径走查过吗？`n > 1 且 slack > 0` 不满足时 `betweenGap = 0`，摆位代码安全退回 `mainGap`——满行、单成员两态都该手算过
- [ ] `lineCount`/`mainOverflow` 两个观测口有没有被业务代码改写？它们是布局结果不是配置，只读约定写在 `flow.ts` 的字段注释里

最后一条流程建议：Flow 的改动几乎总能在 7 条手算断言里找到对应的判定形态（换行、gap 临界、spaceBetween、无界退化、超宽溢出、换列、stretch）——review 时先指出「这次改动影响哪几条判定形态」，再要求对应断言跑绿。说不出影响面的改动，默认按「全影响」处理。

## 14. 工程三陷阱：Flow 的三个高频事故现场

照旧三栏口径：触发场景 → 根因 → 规避。三个陷阱分别落在摆位精度、第二遍 layout、失效粒度三个不同的层——Flow 的复杂度不在装行（一个判定式），在这三层各自与外部世界的接缝上。

**陷阱一：非整除富余的半像素坐标。** 触发场景：`lineAlign: spaceBetween` 的一行三个成员，行宽 83、容器 90 → 富余 7 → `betweenGap = slack / (n − 1) = 3.5`；或者 `center` 时行首 `cursor = slack / 2 = 3.5`——成员落在半像素上，渲染出接缝发虚、相邻元素边缘闪动的症状。根因在摆位段的两个除法：`slack / 2` 与 `slack / (n − 1)` 都没有舍入策略，教学版的坐标域是浮点数，「怎么取整」被刻意留给了 painter/后端层（坐标算术与像素栅格是两个合同）。规避：宿主侧统一取整策略（painter 层四舍五入或像素对齐），并在团队口径里写明「布局坐标允许小数」；选型上避开必然非整除的组合（如 spaceBetween 配偶数成员配奇数富余）不是方案——半像素是机制的自然输出，防御要在呈现层。手算时同样保留小数：第 11 节配方第 3 步的 cursor 若出现 3.5，接着算，不要「顺手取整」——取整位置错了，后面每个成员都错。

**陷阱二：stretch 行内重子树的布局超支。** 触发场景：`crossAlign: stretch` 的标签流里混进一个复杂子树（嵌套布局、多行文本块），行高由某个高个子决定，矮子每次布局都跑两遍——而第二遍是**真重排**。根因在 4.1 节的性能账：第二遍的紧约束（交叉 min=max=行高）与第一遍的松约束不同，`layout()` 的缓存判定「约束没变且不脏则跳过」必然不命中——子树整个重排一遍；守卫 `e.cross !== line.crossExtent` 只省掉「已到位」的子，省不掉「每次都矮一截」的子。这是 CSS 里 `align-items: stretch` 免费而自绘框架要记账的典型落差。规避三档：stretch 行内放轻量叶子（纯色盒、单行标签）；重子树给固定交叉尺寸（不参与拉伸，守卫天然跳过）；必须拉伸时盯住 `layoutCount` 观测口（render-object.ts 上给测试用的那个字段），超支明显就把行内结构摊平。

**陷阱三：整容器级失效粒度。** 触发场景：长标签流里改了一个标签的文案，整个 Flow 的行数变了（或行内归属变了），**所有**子重新装行、大部分位置跳动，视觉上「全列表闪了一下」。根因在装行的序列性质：第 i 个子的行归属依赖前 i−1 个子的累计宽度——任何前缀变化都推翻后续装行，局部失效在算术上不成立（第 6 节失效代价行的展开）；失效协议侧，子的 `markNeedsLayout` 冒泡到 Flow，Flow 重排就是全量装行，没有中间档。规避按规模分档：小流量（几十个子）接受全量重装——一遍 O(n) 贪心本身很便宜，视觉跳动才是真代价，可用 `lineCount` 观测口监控行数抖动、用布局稳定性角度调整内容（让高频变化的子靠前，缩小波及后缀）；大流量上千个子时上虚拟化或按行分块（第八阶段的分册方向——按行缓存装行结果，前缀不变则后续行直接复用）。关键认知：**这不是 Flow 实现得不好，而是贪心装行这个合同本身的粒度**——工业框架的换行引擎同样付这个代价，只是它们在虚拟列表层把账摊薄了。

三个陷阱的公共教训与 Absolute 册同构：**算术便宜，接缝贵**。Flow 与像素栅格的接缝（陷阱一）、与布局缓存的接缝（陷阱二）、与失效协议的接缝（陷阱三），每条接缝都需要一层「谁负责」的显式决定。把这层决定写进代码注释，比任何防御性代码都便宜。

## 15. 决策速查表：选布局器与调参数

两张表：先决定「用不用 Flow」，再决定「参数怎么填」。判据延续第 6 节的适用边界，但落到「五秒可判」的动作级。

**表一：用不用 Flow。** 判据一词：「换行」。内容沿一条轴排队、装不下要**另起一行继续**的，才是 Flow；不换行的是 Flex，按轨道对齐的是 Grid，重叠的是 Stack。

| 需求信号 | 选型 | 为什么不是 Flow |
|---|---|---|
| 标签云、聊天气泡、设置表单项流 | Flow | 正中本职：贪心装行 + 行内富余分配 |
| 单行工具栏，放不下就溢出警告 | Flex（`mainOverflow` 同款记账） | 不换行；Flow 也能退化但多一层行概念 |
| 表单要跨行**列对齐** | [网格布局](03-网格布局Grid.md) | 贪心装行不保证跨行竖向对齐（反模式第六行） |
| 长列表滚动 | ScrollView 包 Flex/Flow | 滚动是视口语义，与装不装行正交 |
| 瀑布流（列高不齐的换列） | 自造布局器（毕业项目） | Flow 的「行」等高记账（crossExtent 取最大），列高不齐要另立合同 |
| 内容要重叠（角标压卡片） | Stack 家族 | Flow 的成员互不重叠是摆位公式保证的，塞重叠意图进 Flow 是逆着合同写 |

**表二：参数怎么填**（四个参数各一行决策）：

| 参数 | 决策动作 | 依据 |
|---|---|---|
| `direction` | 先问「装填方向」：内容沿着哪根轴依次排？row 沿 x 装、column 沿 y 装；**溢出方向永远是交叉轴** | 4.2 节的语义辨析——「换列：x 前进、y 归零」 |
| `mainGap` | 沿装填轴数成员间缝隙；临界判定会消费它（`行宽 + mainGap + 新子 > maxMain`） | 用例 2 的 60+10+30=100——gap 在判定式与摆位两处同值 |
| `crossGap` | 沿溢出轴数行与行的缝；总高公式已扣末行（`crossCursor − crossGap`） | gap 是成员间的，不是围栏外的（3.4 节） |
| `lineAlign` | 行内富余怎么分：贴头 start、居中 center、贴尾 end、撑开 spaceBetween；**富余为 0 时四档退化为同一摆位** | 摆位段 `slack > 0` 的守卫——满行时 center/end/spaceBetween 与 start 重合 |
| `crossAlign` | 矮成员在行高里怎么站：start/center/end 免费选；**stretch 每次布局对矮子多收一遍 layout** | 4.1 节性能账——stretch 是唯一有第二遍成本的档位 |

两条使用纪律。第一，`direction` 的判定要在构造器调用处写注释（「装填 = 竖直，溢出 = 横向」一类）——坑 2 的 gap 语义互换全部源于方向感丢失，注释是把方向感钉死的最低成本手段。第二，`crossAlign` 默认从 start 起步、有真实视觉理由再升 stretch：这是本表唯一「默认保守」的参数，因为只有它有性能尾巴（陷阱二）；其余参数随便试，试错成本为零——它们只影响一条公式里的常数项。

最后一条横向规则：任何「Flow 会不会太慢」的担忧，先看子数量级——装行是 O(n) 一遍、摆位是 O(n) 赋值，几百个子量级下真正的成本永远在子的自身布局（文本排版、嵌套子树），不在 Flow 的记账循环。先量化（`layoutCount`、`totalPerformLayouts` 两个观测口），再谈优化——这与第 6 节复杂度账的口径一致。表一与第 6 节适用边界表的分工也在此说清：那张表回答「Flow 的能力半径」，本表回答「面对一个具体需求走哪一步、填哪个值」——前者是地图，后者是导航，查阅时先导航、存疑时回地图。
