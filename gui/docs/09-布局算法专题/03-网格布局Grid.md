# 网格布局 Grid：轨道先定型、格子后入座的两段式算法

> [返回：布局算法专题导览](01-导览.md)
> 本册走读 `gui/labs/mini-gui/src/core/render/grid.ts`（233 行）与 `grid.test.ts`（87 行，5 条手算断言）。读完你应当能在纸上算出：任意「轨道声明 + 单元格声明」在给定宽度里如何解出列宽行高表、每个格子拿多宽多高、摆在哪里——这是仪表盘、相册、设置页分组、桌面图标墙的底层算法。实跑口径：断言全部出自 vitest 实跑（全仓 25 文件 201 断言全绿，2026-11-14）。

## 1. 概念坐标：与 Flow 的本质差别

Flow/Flex 是**流式**的：子的位置是「逐个排队」的产物，第 i 个子的位置依赖前 i−1 个子的尺寸总和。Grid 把这个依赖**斩断**了：

```text
Flow：  子1 → 子2 → 子3 …（位置逐个推导，前面的变，后面的全要动）
Grid：  第一步  解轨道：[100, 94, 186] × [40]      ← 与子无关的「表格」
        第二步  入座：  cell(col,row) → x=前缀和(col), y=前缀和(row)
```

**轨道（track）**就是一行/一列的「宽度账户」。子不再直接影响子的位置，只通过「往轨道里存钱」间接影响——这就是两段式的含义。代价是 Grid 需要更多遍 layout（同一子最多被量三次），收益是**对齐**：不同行的第 2 列永远左对齐，Flow 做不到。

三种轨道类型（构造用工厂函数，避免手填错字段）：

| 类型 | 工厂 | 宽度来源 | 对应 CSS |
|---|---|---|---|
| `fixed` | `fixedTrack(100)` | 声明值 px | `grid-template-columns: 100px` |
| `flex` | `flexTrack(2)` | 分摊剩余空间（fr 权重） | `1fr` |
| `auto` | `autoTrack()` | 本列 span=1 单元格的最大内容宽 | `auto` / `max-content` |

## 2. 参数与观测口

```ts
new RenderGrid({
  columns: TrackSpec[],        // 列轨道（必填）
  rows?: TrackSpec[],          // 行轨道；缺省的行按 auto 处理
  columnGap?: number,          // 列间距（默认 0）
  rowGap?: number,             // 行间距（默认 0）
})
// 单元格包装：声明座位
new RenderGridCell({ col: 1, row: 0, colSpan?: 1, rowSpan?: 1 }, child)
```

三个**只读观测口**——解算产物，给测试和本册手算对照用：

| 观测口 | 含义 |
|---|---|
| `colWidths` | 解算后的列宽表（第 3.2 步的产物） |
| `rowHeights` | 解算后的行高表（第 3.3 步的产物） |
| `mainOverflow` | fixed+auto 轨道合计已超出容器宽的量（flex 轨道分不到负空间 → 全记溢出） |

`RenderGridCell` 的角色与 `RenderPositioned` 完全同构：自己不产生几何，`performLayout` 把约束透传给内层子、把子的尺寸当自己的尺寸；「座位声明」由 Grid 在外层消费。ScriptC 口径上它必须是**类**而不是接口参数——类实例当接口传会被 SC2002 拒收（第四阶段踩过的边界，这里沿用抽象类继承的老解法）。

## 3. 四步算法（performLayout 逐段走读）

### 3.1 第一步：量自然尺寸——全松约束

```ts
for (const child of this.children) {
  if (child instanceof RenderGridCell) {
    child.layout({ minWidth: 0, maxWidth: Number.MAX_SAFE_INTEGER, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER });
    cells.push({ node: child, natW: child.width, natH: child.height });
  }
}
```

此刻每个格子只报「内容想要多大」，**完全不知道自己最终多宽**——它甚至不知道自己会落在哪条列上（`col` 字段有，但列宽还没解出来）。这份自然尺寸是接下来两步的唯一输入。

### 3.2 第二步：解列宽——三型三策 + 确定性舍入

解算顺序有讲究：fixed 和 auto 能立刻定，flex 必须等「剩余空间」算出来才能分。

```ts
const autoOf = (j: number): number => {
  let m = 0;
  for (const cell of cells) {
    if (cell.node.col === j && cell.node.colSpan === 1 && cell.natW > m) m = cell.natW;
  }
  return m;
};
let used = gapTotal;                 // 列间隙先占账
for (let j = 0; j < nCols; j++) {
  const t = this.columns[j]!;
  if (t.kind === TrackKind.fixed)      { widths.push(t.px);  used += t.px; }
  else if (t.kind === TrackKind.auto)  { const w = autoOf(j); widths.push(w); used += w; }
  else                                 { widths.push(0); flexTotal += t.fr; }  // flex 先占位
}
let leftover = widthBounded ? maxW - used : 0;
if (leftover < 0) { this.mainOverflow = -leftover; leftover = 0; }
```

解算顺序有讲究：fixed 和 auto 能立刻定，flex 必须等「剩余空间」算出来才能分：

```ts
for (let j = 0; j < nCols; j++) {
  const t = this.columns[j]!;
  if (t.kind === TrackKind.fixed) {
    widths.push(t.px);
    used += t.px;
  } else if (t.kind === TrackKind.auto || !widthBounded) {
    // 无界宽度里 flex 没有分摊基数 → 退化为 auto（教学规则；§4 用例 5 实证）
    const w = autoOf(j);
    widths.push(w);
    used += w;
  } else {
    widths.push(0); // flex 先占位，下一步统一分
    flexTotal += t.fr;
  }
}
let leftover = widthBounded ? maxW - used : 0;
if (leftover < 0) { this.mainOverflow = -leftover; leftover = 0; }
```

- **auto 列** = 本列 span=1 格子的最大自然宽。**span>1 的格子不参与**——跨列格的宽度摊在多条列上，哪条该为它长个说不清（CSS 真实规则是把增量均摊回被跨的 auto 轨道，教学版直接豁免，差异写进第 6 节的差距清单）。
- **剩余空间** `leftover = maxW − fixed − auto − 间隙×(n−1)`。负数不参与分配（flex 轨道分不到负空间），超出量记 `mainOverflow`。

flex 分摊的完整算术——先按比例向下取整，再把余数按列序逐列 +1：

```ts
let given = 0;
for (let j = 0; j < nCols; j++) {
  const t = this.columns[j]!;
  if (t.kind === TrackKind.flex) {
    const w = Math.floor((leftover * t.fr) / flexTotal);
    widths[j] = w;
    given += w;
  }
}
let rem = leftover - given;
for (let j = 0; j < nCols && rem > 0; j++) {
  const t = this.columns[j]!;
  if (t.kind === TrackKind.flex) { widths[j] = widths[j]! + 1; rem -= 1; }
}
```

**为什么必须「确定性舍入」**：`280 × 1/3 = 93.333…`，JS 里一切是浮点。若用 `round`，「哪个列拿 93 哪个拿 94」依赖浮点误差方向，跨平台/跨次运行都可能漂。`floor + 余数按序 +1` 把分配变成**纯整数算术**：总和恒等于 leftover（不丢不溢 px）、结果逐位可复现——测试才能断言 `colWidths` 精确等于 `[100, 94, 186]`。这条规则与 CSS Grid 实现里的「distributed N-1 px among N flexible tracks」同款思路。

手算演练（列 [fixed 100, flex 1, flex 2]，容器 400，gap 10）：

```text
间隙 = 10 × (3−1) = 20
fixed 占 100 → used = 120
leftover = 400 − 120 = 280；Σfr = 3
base(col1) = floor(280×1/3) = 93     base(col2) = floor(280×2/3) = 186
given = 279；rem = 1 → 第一个 flex 列 +1
列宽 = [100, 94, 186]    （验证：100+94+186+20 = 400 ✓）
```

### 3.3 第三步：解行高——列宽定形后的重量

行高解算有一个隐藏的先后依赖：**格子的高度取决于它有多宽**（文本会换行、盒子会被钳制），所以必须先解列宽，再让格子按「已解列宽的紧约束」重新量一遍：

```ts
const spanW = (cell: RenderGridCell): number => {
  let w = 0;
  for (let j = cell.col; j < cell.col + cell.colSpan; j++) {
    if (j > cell.col) w += this.columnGap;
    w += widths[j] ?? 0;
  }
  return w;
};
for (const cell of cells) {
  const w = spanW(cell.node);
  cell.node.layout({ minWidth: w, maxWidth: w, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER });
  if (cell.node.rowSpan === 1) {
    // 行定高只看 rowSpan=1 的格子：列跨格按「跨列总宽」定形参与；
    // 行跨格的高度横跨多行、没法单行记账 → 不参与（教学版限制，分册写明）
    ...autoH[row] 取 max...
  }
}
```

三条规则：

| 规则 | 为什么 |
|---|---|
| 重量约束 = 紧宽 + 松高 | 宽已被轨道锁定（Span 总宽含内部 gap），高自由生长等汇报 |
| auto 行高 = 该行 rowSpan=1 格子的最大重排高 | 行盒模型与 Flow 的行高同构 |
| **rowSpan>1 的格子不参与行高解算** | 它的高度摊在多行上，单行记账记不了；教学版选择「跨行格被拉伸填充已解行高之和」，代价见第 6 节 |
| fixed 行直接取 px，不问内容 | 声明优先；内容溢出交给裁剪/滚动 |

### 3.4 第四步：入座——紧约束拉伸 + 前缀和定位

```ts
for (const cell of cells) {
  const w = spanW(cell.node);
  const h = spanH(cell.node);
  cell.node.layout({ minWidth: w, maxWidth: w, minHeight: h, maxHeight: h });
  cell.node.x = colX(cell.node.col);
  cell.node.y = rowY(cell.node.row);
}
```

每个格子最终拿到 **(spanW × spanH) 的紧约束**——默认拉伸到格子（与 CSS Grid 的 `stretch` 默认一致），这就是测试里 `a.height === 40`（30 拉到 40）的来源。位置是**前缀和**：

```text
x(col) = Σ widths[0..col) + columnGap × col
y(row) = Σ heights[0..row) + rowGap    × row
```

手算（第 3.2 步的 [100, 94, 186] 表，gap 10）：`x(0)=0，x(1)=100+10=110，x(2)=110+94+10=214`——三个格子的横坐标一步算死，这就是「对号入座」的全部含义。

容器自身尺寸：

```ts
let gridW = gapTotal;        for (const w of widths)  gridW += w;
let gapRowsTotal = this.rowGap * Math.max(0, nRows - 1);
let gridH = gapRowsTotal;    for (const h of heights) gridH += h;
this.setSize(c, { width: gridW, height: gridH });
```

`setSize` 内部钳回约束——轨道合计超宽时容器被钳到 max（内容溢出不是 Grid 的责任，是滚动视口的事，见第七阶段 ScrollView）。

## 4. 手算用例全表（grid.test.ts 的 5 条断言）

| # | 用例 | 输入 | 纸上推导 | 关键断言 |
|---|---|---|---|---|
| 1 | flex 分摊 + 舍入 | 列 [f100, 1fr, 2fr]，gap 10，容器 400；格 A(0,0) 50×30，B(1,0) 40×20，C(2,0) 60×40 | 3.2 节演算 → 列 [100,94,186]；行高 = max(30,20,40)=40；B 拉伸 94×40，C 186×40 | `colWidths=[100,94,186]`；`rowHeights=[40]`；`a.height=40`；`b.x=110`；`c.x=214`；`width=400` |
| 2 | auto 列 + 行高重量 | 列 [auto, f80]，gap 10；行 [auto, auto]，rowGap 5；A(0,0) 60×20，B(0,1) 45×30，C(1,0) 30×25 | col0=max(60,45)=60；A/B 按 60 定形高 20/30，C 按 80 定形 25；row0=max(20,25)=25，row1=30 | `colWidths=[60,80]`；`rowHeights=[25,30]`；`a.height=25`（20 拉到）；`b.y=30`；`c.x=70`；`width=150` |
| 3 | colSpan | 列 [f50, f50] gap 10；行 [auto, f20] rowGap 4；D(0,0,跨2) 80×25，A(0,0) 50×30，E(1,1) 40×12 | D 拿 50+10+50=110；row0 的 auto 只看 span=1 的 A → 30；E 拉到 50×20 在 (60, 34) | `d.width=110`；`rowHeights=[30,20]`；`e.x=60`；`e.y=34`；`height=54` |
| 4 | 轨道超宽 | 列 [f200, f300]，容器 400 | used=500+0 > 400 → leftover=−100 → `mainOverflow=100`；flex 无 → 列不变 | `mainOverflow=100`；`width=400`（钳回）；`colWidths=[200,300]` |
| 5 | 无界退化 | `layout({0..∞})`；列 [1fr, f60]；A(0,0) 70×10 | flex 无分摊基数 → 退化 auto=70；容器宽 130 | `colWidths=[70,60]`；`width=130` |

用例 3 里 D 与 A 同座 (0,0) 是**合法重叠**：Grid 只管「你声明了哪格就给你哪格的盒子」，重叠交给绘制顺序（子序）与命中顺序（逆序）处理——这是 Stack 册第 2 节的主题。

## 5. 遍数账：为什么 Grid 是「三遍」

同一子最多被 `layout()` 三次：

```text
第 1 遍  全松            → 自然尺寸（解 auto 轨道的原料）
第 2 遍  紧宽 + 松高     → 列宽定形后的高度（解 auto 行的原料）
第 3 遍  紧宽 + 紧高     → 入座拉伸（最终几何）
```

对照：Flow/Flex 每子 1 遍（stretch 例外）。第 2 遍无法省——「高度依赖宽度」是文本世界的普遍事实（第三阶段断行器的工作前提）；第 3 遍是拉伸语义的代价，若格子内容不需要拉伸（`fixed` 行 + 内容刚好），布局缓存会让第 3 遍空转（约束没变 → 跳过）。复杂度仍是线性的：O(3n + cols + rows)，没有平方项。

**失效代价**：任一格子内容变化 → 若它影响 auto 轨道 → 整张表重解 → 所有格子重排。Grid 内部没有局部失效——大量格子时要么固定轨道（fixed 为主，变动不触发表），要么按第八阶段虚拟化的思路只对可见窗口建格。

## 6. 教学版明确不做的（差距清单）

| 特性 | CSS Grid 行为 | 教学版取舍 | 为什么 |
|---|---|---|---|
| 跨格参与 auto 轨道 | 跨列格的增量均摊回被跨轨道 | span>1 全豁免 | 均摊规则涉及迭代（增量可能改变其它轨道，反馈循环），教学版一刀切保「一遍可手算」 |
| `minmax(a, b)` 轨道 | 每轨道独立下/上限 | 只有 fixed/flex/auto 三型 | 三型已覆盖 90% 场景；minmax 是解算器的迭代记账 |
| dense packing | 自动回填空格 | 声明哪格是哪格 | 回填把「位置」变成搜索结果，可手算性归零 |
| `subgrid` | 子网格共享父轨道 | 无 | 需要轨道表跨树传递 |
| 百分比轨道 | `10%` | 无 | 百分比依赖容器尺寸在解算前已知，时序上与 auto 列打架 |

## 7. 纸上专练：三道进阶手算题

用例表之外的组合题——按本章四步推导，再回测试对答案。题型覆盖：auto+flex 混合、全 auto 对称阵、rowSpan 豁免语义。

### 题 A：auto + flex 混合（列 [auto, flex 1, fixed 60]，容器 320，gap 10）

```text
第 1 步 自然尺寸：A(0,0)=80×20，B(1,0)=40×30，C(2,1)=55×10
第 2 步 解列宽：
  col0 = auto = max(A.natW=80)                = 80
  col2 = fixed                                = 60
  used  = 80 + 60 + 10×2 = 160
  leftover = 320 − 160 = 160 → col1(flex 1)   = 160
  列宽 = [80, 160, 60]        （验证 80+160+60+20 = 320 ✓）
第 3 步 解行高（列宽紧约束定形）：
  A 按 80 宽 → 高 20；B 按 160 宽 → 高 30；C 按 60 宽 → 高 10
  row0 = max(20, 30) = 30；row1 = 10
第 4 步 入座（前缀和 + 拉伸）：
  x(0)=0  x(1)=80+10=90   x(2)=90+160+10=260
  y(0)=0  y(1)=30
  A: (0,0)   80×30（高 20 拉到 30）
  B: (90,0)  160×30
  C: (260,30) 60×10
容器 320×40（30 + 10）
```

### 题 B：2×2 全 auto 对称阵（gap 全 10，四格 40×20 / 90×15 / 55×25 / 70×18）

```text
列解：col0 = max(40, 55) = 55    col1 = max(90, 70) = 90
行解：row0 = max(20, 15) = 20    row1 = max(25, 18) = 25
入座：
  (0,0) 40×20 → 55×20 @ (0,0)     （拉伸）
  (1,0) 90×15 → 90×20 @ (65,0)    （55+10=65）
  (0,1) 55×25 → 55×25 @ (0,30)    （20+10=30）
  (1,1) 70×18 → 90×25 @ (65,30)
容器 = (55+10+90) × (20+10+25) = 155 × 55
```

全 auto 阵有一个值得写的性质：**列宽由内容决定、格间零错位**——同一列的两个格子天然左对齐（x 相同），这正是 Grid 存在的理由（Flow 做不到）。

### 题 C：rowSpan 豁免语义（列 [fixed 50, fixed 50]，行 [auto, auto]，rowGap 4）

```text
声明：D(0,0,rowSpan 2, 80×25)，A(1,0, 50×30)，E(1,1, 50×12)
第 2 步：列宽 [50, 50]（全 fixed）
第 3 步：行解只看 rowSpan=1 的格子：
  row0 = max(A 定形高 30) = 30
  row1 = max(E 定形高 12) = 12
  —— D（rowSpan=2）不参与行解；它自己的高度是「解出来之后才定的」
第 4 步：D 拿 spanH = 30+4+12 = 46 的紧约束 → 被拉伸到 46 高
  D: (0,0) 110×46；A: (60,0) 50×30；E: (60,34) 50×12
  容器 110 × 46
```

推论（边界语义）：若 D 的内容高是 80（> 46），紧约束把它钳回 46——**内容溢出格子**，不撑大行。教学版选择「跨行格随行组」，而不是「行随跨行格」（CSS 的真实规则是后者：行分配会考虑跨行 item 的最小高度）。取舍记录在第 6 节差距清单第一行——它的代价就是本题：跨行内容可能被裁剪，需要跨行格自适应时请换布局或显式 fixed 行。

## 8. 对标工业框架

| mini-gui | CSS | Flutter | iOS |
|---|---|---|---|
| `RenderGrid` 轨道表 | `grid-template-columns/rows` | `GridView`（sliver 系）——本质是**单轴虚拟化**的行/列网格 | `UICollectionViewCompositionalLayout` |
| `flexTrack` 分摊 | `fr` 单位 | `Expanded` + 内嵌 Row/Column 模拟 | 分布式 spacing |
| `RenderGridCell(col,row,span)` | `grid-area` / `grid-column: span 2` | 无直接对应（位置即子序） | `NSCollectionLayoutGroup` 的 item 声明 |
| `colWidths/rowHeights` 观测口 | 开发者工具的轨道高亮 | devtools 的网格线 | UI 不可见 |

一个关键认知差：Flutter 的 GridView 把「网格」当**滚动列表的特例**（按行虚拟化），CSS/教学版把网格当**完整的二维解算器**。前者数据量大（万级相册），后者表达力强（仪表盘）。两者不冲突——外层虚拟化滚动 + 内层 Grid 解算，是第八阶段毕业项目的标准组合。

## 9. 实跑记录

```text
$ npx vitest run src/core/render/grid.test.ts
 ✓ src/core/render/grid.test.ts (5 tests) 3ms
全仓：25 个测试文件 201 条断言全绿（2026-11-14）
```

（下册预告：Constraint 把「贴边」变成解线性方程——锚点链、百分比、双锚拉伸，以及「乱序推入也能解」的 Kahn 工作清单。）
