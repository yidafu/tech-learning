# Flex 布局：主轴、交叉轴与弹性分配

> [返回：第四阶段导览](01-导览.md)
> 对应大纲条目：第四阶段 4。Row / Column 是日常界面 80% 的布局答案。本册逐段走读 `gui/labs/mini-gui/src/core/render/flex.ts`（215 行）与 `stack.ts`（87 行）：RenderFlex 的四步算法（非弹性子先排、剩余空间按 flex 分配、定尺寸、按对齐摆位）、轴向映射的五个换算函数、两个防呆（无界主轴、溢出记账），以及 Stack/Positioned 的锚点算术。所有黄金断言来自 `layout.test.ts` 实跑；panel 场景数字另用探针实跑验证。

## 1. 概念坐标

```text
Row：主轴 = 水平，交叉轴 = 垂直          Column：主轴 = 垂直，交叉轴 = 水平
┌─────────────────────┐
│ [A][B][→→→ C ←←←]    │   mainAxisAlign：start/center/end/spaceBetween（主轴游标）
│  ↑ 交叉轴对齐/拉伸    │   crossAxisAlign：start/center/end/stretch（交叉轴）
└─────────────────────┘
```

实现里没有 if(row)/if(column) 的双份代码——一切换算走 `isRow()` 一个开关，主轴/交叉轴的约束、尺寸、位置全部按轴映射。**「方向」是参数，「算法」只有一份**。这个选择的价值在本册会反复出现：每读一个函数都要问一句「这行在 Row 和 Column 里分别对应什么」。

参数与默认值（构造器摘录）：

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `direction` | FlexDirection | `row` | 主轴方向 |
| `mainAxisAlign` | MainAxisAlign | `start` | 主轴对齐：start/center/end/spaceBetween |
| `crossAxisAlign` | CrossAxisAlign | `start` | 交叉轴对齐：start/center/end/stretch |
| `gap` | number | 0 | 相邻子之间的主轴间距（px） |
| `mainOverflow` | number | 0 | **只读产物**：主轴内容超出约束 max 的量 |

注意 `mainOverflow` 是布局**结果**不是配置——测试断言它（`溢出被记录`：500+500 > 800 → mainOverflow=200），控件可以读它画警示条纹。

## 2. 轴向映射四件套

### 2.1 isRow：唯一的开关

```ts
private isRow(): boolean {
  return this.direction === FlexDirection.row;
}
```

全文件所有「方向差异」最终都收敛到这一个布尔。搜一遍 `isRow()` 的调用点就得到方向敏感的全部位置：looseMain、flexChildConstraints、performLayout 里读子尺寸/给自己定尺寸的六七处、placeChild、setSizeByAxis。**没有第二个 if(direction)**。

### 2.2 looseMain：非弹性子的约束

```ts
/** 主轴方向的松约束（子自由取宽/高）。 */
private looseMain(c: BoxConstraints, crossTight: number | null): BoxConstraints {
  if (this.isRow()) {
    return {
      minWidth: 0,
      maxWidth: Number.MAX_SAFE_INTEGER, // 主轴不限（Flex 来定分配）
      minHeight: crossTight ?? c.minHeight,
      maxHeight: crossTight ?? c.maxHeight,
    };
  }
  return {
    minWidth: crossTight ?? c.minWidth,
    maxWidth: crossTight ?? c.maxWidth,
    minHeight: 0,
    maxHeight: Number.MAX_SAFE_INTEGER,
  };
}
```

- **主轴无界**（maxWidth = MAX_SAFE_INTEGER，Row 时）：非弹性子想多宽就多宽——Flex 需要它们的「自然宽度」来算剩余空间。
- **交叉轴两档**：`crossTight ?? c 的交叉区间`。crossTight 只在 stretch 且 crossMax 有界时是 crossMax（把子拉满），否则 null（继承父的交叉区间）。
- 第三册说过无界约束在诊断输出里的长相：`w[0..9007199254740991]`——就是这里的 MAX_SAFE_INTEGER。

### 2.3 flexChildConstraints：弹性子的紧约束

```ts
private flexChildConstraints(c: BoxConstraints, mainExtent: number, crossTight: number | null): BoxConstraints {
  if (this.isRow()) {
    return { minWidth: mainExtent, maxWidth: mainExtent, minHeight: crossTight ?? 0, maxHeight: crossTight ?? c.maxHeight };
  }
  return { minWidth: crossTight ?? 0, maxWidth: crossTight ?? c.maxWidth, minHeight: mainExtent, maxHeight: mainExtent };
}
```

**主轴紧**（min = max = mainExtent）：分配到多少就是多少，弹性子没有商量余地。交叉轴与 looseMain 同一套两档逻辑。注意 minHeight 的 null 兜底这里是 **0**（不是 c.minHeight）——弹性子的交叉下限从零开始，只有 stretch 才拉满。

### 2.4 placeChild：主/交叉到 x/y 的映射

```ts
private placeChild(node: RenderObject, mainPos: number, crossSize: number): void {
  const crossExtent = this.isRow() ? node.height : node.width;
  let crossPos = 0;
  if (this.crossAxisAlign === CrossAxisAlign.center) crossPos = (crossSize - crossExtent) / 2;
  else if (this.crossAxisAlign === CrossAxisAlign.end) crossPos = crossSize - crossExtent;
  // stretch / start 都是 0（stretch 的子已被拉到 crossSize）
  if (this.isRow()) {
    node.x = mainPos;
    node.y = crossPos;
  } else {
    node.x = crossPos;
    node.y = mainPos;
  }
}
```

**位置归父**的 Flex 现场：游标算法算出 mainPos、对齐算法算出 crossPos，映射到 x/y（Row：main→x；Column：main→y）。交叉轴公式与第四册 Align 的 slack 乘法同族——只是这里 center 是 `(crossSize - crossExtent) / 2`（比例恒 0.5）。panel 的 header（crossAlign=center）里标题 y = (24−13)/2 = **5.5**：尺寸是整数，位置可以不是。

### 2.5 setSizeByAxis：自己的尺寸

```ts
private setSizeByAxis(c: BoxConstraints, mainSize: number, crossSize: number): void {
  if (this.isRow()) {
    this.setSize(c, { width: mainSize, height: crossSize });
  } else {
    this.setSize(c, { width: crossSize, height: mainSize });
  }
}
```

同一对 (main, cross) 按方向装进 width/height。setSize 内部钳进约束（第三册的第一道防线）。

## 3. 四步算法（performLayout 逐段走读）

### 第一步：非弹性子先布局

```ts
this.mainOverflow = 0;
const crossMax = this.isRow() ? c.maxHeight : c.maxWidth;
const crossMin = this.isRow() ? c.minHeight : c.minWidth;
const mainMax = this.isRow() ? c.maxWidth : c.maxHeight;
const mainMin = this.isRow() ? c.minWidth : c.minHeight;
const crossTight = this.crossAxisAlign === CrossAxisAlign.stretch && crossMax !== Infinity ? crossMax : null;

// ---- 1. 非弹性子先布局 ----
type Entry = { node: RenderObject; expanded: RenderExpanded | null };
const entries: Entry[] = [];
let fixedMain = 0;
let nonFlexCount = 0;
for (const child of this.children) {
  if (child instanceof RenderExpanded) {
    entries.push({ node: child, expanded: child });
  } else {
    child.layout(this.looseMain(c, crossTight));
    fixedMain += this.isRow() ? child.width : child.height;
    nonFlexCount += 1;
    entries.push({ node: child, expanded: null });
  }
}

const gapTotal = this.gap * Math.max(0, this.children.length - 1);
```

- 开头六行把约束按轴拆成 mainMin/mainMax/crossMin/crossMax——后面所有逻辑都只说「轴」，不再说宽高。
- `crossTight` 一次算好：**stretch 且交叉有界才拉**，否则 null（第 6 节展开）。
- 每个子布局时顺手记进 entries（expanded 字段标记弹性身份）——后面第二、四步要按同一顺序遍历，先排好队。
- **为什么非弹性子必须先排**：弹性分配的输入是「剩余空间」= mainMax − fixedMain − gapTotal，fixedMain 只能来自已布局完成的非弹性子（layout 之后 width/height 才有效）。顺序是数据依赖决定的，不是风格选择。
- `gapTotal = gap × (n−1)`，n = 全部子（含弹性子）。`Math.max(0, n−1)` 防 n=0 时的负间距。

### 第二步：弹性子分配剩余空间

```ts
// ---- 2. 弹性子分配剩余空间 ----
let totalFlex = 0;
for (const e of entries) {
  if (e.expanded !== null) totalFlex += e.expanded.flex;
}
if (totalFlex > 0 && mainMax === Infinity) {
  throw new Error("Flex 在无界主轴上不能使用 Expanded（永远分不到头）");
}
const free = mainMax - fixedMain - gapTotal;
if (free < 0) this.mainOverflow = -free;
const distributable = Math.max(0, free);
let flexMainTotal = 0;
for (const e of entries) {
  if (e.expanded === null) continue;
  const mainExtent = Math.floor((distributable * e.expanded.flex) / totalFlex);
  e.expanded.layout(this.flexChildConstraints(c, mainExtent, crossTight));
  flexMainTotal += this.isRow() ? e.expanded.width : e.expanded.height;
}
```

- **防呆一**（totalFlex > 0 且 mainMax 无界 → 抛错）见第 6 节。
- **溢出记账**：free < 0 时 `mainOverflow = -free`（正数），`distributable` 钳 0——弹性子分到 0 宽，但**不裁剪非弹性子**（它们已按自然尺寸排完）。
- **分配公式**：`mainExtent = floor(distributable × flex / totalFlex)`。每个弹性子独立取整——1:2:1 分 100px 是 25/50/25（整除），2:1 分 740 是 493/246（**和 739，差 1px 没人拿**，第 5 节展开）。
- 分完用 `flexChildConstraints` 给紧约束布局——弹性子的最终主轴尺寸就是 mainExtent（紧约束钉死）。

### 第三步：定自己的尺寸

```ts
// ---- 3. 自己的尺寸 ----
const contentMain = fixedMain + gapTotal + flexMainTotal;
const mainSize = Math.min(Math.max(contentMain, mainMin), mainMax === Infinity ? Number.MAX_SAFE_INTEGER : mainMax);
let crossContent = 0;
for (const e of entries) {
  const cr = this.isRow() ? e.node.height : e.node.width;
  if (cr > crossContent) crossContent = cr;
}
const crossSize = Math.min(Math.max(crossContent, crossMin), crossMax === Infinity ? Number.MAX_SAFE_INTEGER : crossMax);
```

- **主轴 = 内容总宽钳进 [mainMin, mainMax]**。内容 = 非弹性 + 间距 + 弹性实际拿到之和。溢出时 contentMain > mainMax，钳到 mainMax（500+500 的例子里行宽仍是 800）。
- **交叉轴 = 最大子的交叉尺寸钳进区间**（stretch 时子已被拉到 crossMax，所以「最大子」就是满值）。Row 的高度取决于最高的孩子——这是 flex 的经典语义。
- min 侧同样生效：min 约束 800 时内容 100 也会被抬到 800——**center/end 对齐测试正是靠这个造出 slack 的**（第 4 节）。

### 第四步：摆位

```ts
// ---- 4. 摆位 ----
const slack = Math.max(0, mainSize - contentMain);
let cursor = 0;
const between = this.children.length > 1 ? this.children.length - 1 : 1;
if (this.mainAxisAlign === MainAxisAlign.center) cursor = slack / 2;
else if (this.mainAxisAlign === MainAxisAlign.end) cursor = slack;
else if (this.mainAxisAlign === MainAxisAlign.spaceBetween && this.children.length > 1) {
  // cursor 保持 0，间距在元素间注入
  const betweenGap = slack / between;
  let first = true;
  for (const e of entries) {
    const nodeMain = this.isRow() ? e.node.width : e.node.height;
    if (!first) cursor += betweenGap;
    this.placeChild(e.node, cursor, crossSize);
    cursor += nodeMain;
    first = false;
  }
  this.setSizeByAxis(c, mainSize, crossSize);
  return;
}

let seen = 0;
for (const e of entries) {
  if (seen > 0) cursor += this.gap;
  const nodeMain = this.isRow() ? e.node.width : e.node.height;
  this.placeChild(e.node, cursor, crossSize);
  cursor += nodeMain;
  seen += 1;
}
this.setSizeByAxis(c, mainSize, crossSize);
```

- **slack = max(0, mainSize − contentMain)**：行宽与内容宽的差。溢出时 slack = 0（负数被钳）。
- 四种对齐全是「游标起点 + 间距策略」：start 从 0 起、元素间插 gap；center 从 slack/2 起；end 从 slack 起；spaceBetween 从 0 起、元素间插 slack/between。
- **spaceBetween 是唯一走提前 return 分支的**：它的间距是 `slack / between`（between = 子数 − 1），与 gap 参数无关——**spaceBetween 与 gap 的组合里，主轴间距由 spaceBetween 接管**（gap 只在其余三种对齐里注入）。
- `between` 的三元（n>1 ? n−1 : 1）是除零防御：单元素时 slack/1 算出来也没人用（循环里 `if (!first)` 永远为 false）——单元素 spaceBetween 退化为 start。

## 4. 黄金断言逐条推演

`layout.test.ts` 的 Flex 断言（全部实跑，数字手推）：

**① Row gap=8：100+8+60+8+40**

```text
三个 RenderBox(100/60/40, 40) 各取自然宽（主轴无界）→ fixedMain = 200
gapTotal = 8 × 2 = 16；mainMax = 800（松根）→ free = 584，无弹性子
contentMain = 216 → mainSize = 216；crossContent = 40 → 高 40
start 对齐：游标 0 → 放 A(x=0)，+100 → gap8 → 放 B(x=108)，+60 → gap8 → 放 C(x=176)
✓ 宽 216，x = 0 / 108 / 176
```

**② Row + Expanded(1:3)，固定 100**

```text
窗口 800：非弹性子 100 → fixedMain = 100，gapTotal = 0
free = 700；totalFlex = 4
e1 = floor(700×1/4) = 175；e2 = floor(700×3/4) = 525（整除，无 shortfall）
✓ 175 / 525；x = 0 / 100 / 275（100 = 固定子宽，275 = 100+175）
```

**③ Column + stretch：子拉满交叉轴**

```text
松根 800 宽：crossMax = 800 有界 → crossTight = 800
两个子的约束交叉紧（宽 = 800）→ 都被拉到 800 宽
主轴（高）：30 + 20 = 50；crossContent = 800
✓ Column (800,50)，子 800×30 与 800×20
```

**④ center / end 的游标（min 约束撑行宽）**

```text
layout({minW:800, maxW:800, minH:0, maxH:100})：紧宽 800
内容 100 → mainSize = 800（min 抬升）→ slack = 700
center：cursor = 350 → 子 x = 350；end：cursor = 700 → 子 x = 700
```

这组测试的教学点：**真实窗口下（松根）Row 内容 100 时行宽就是 100，center/end 看不出效果**——要测对齐，得用 min 约束把行宽撑到比内容大（这里用直接 layout 调用注入紧 800）。

**⑤ 溢出记账**

```text
500 + 500，mainMax = 800 → free = -200 → mainOverflow = 200，distributable = 0
contentMain = 1000 → mainSize 钳 800
✓ mainOverflow = 200，行宽 800（子仍按内容排，可画警示条纹）
```

**⑥ 无界主轴 + Expanded 抛错**——见第 6 节。

## 5. floor 取整与 shortfall

`Math.floor(distributable × flex / totalFlex)` 对每个弹性子独立取整，**不补偿**。两个实测/可手推的案例：

| 分配 | 计算 | 结果 | shortfall |
|---|---|---|---|
| 1:3 分 700 | floor(700/4)=175、floor(2100/4)=525 | 175/525 | 0（整除） |
| 2:1 分 740（panel 主体行） | floor(1480/3)=493、floor(740/3)=246 | **493/246** | 1px（739≠740） |
| 三个 flex=1 分 100 | floor(100/3)×3 = 33×3 | 33/33/33 | 1px（99≠100） |
| 2:1 分 340（panel resize 后） | floor(680/3)=226、floor(340/3)=113 | 226/113 | 1px（339≠340） |

panel 的断言（`主体行：2:1 弹性分配 752-12=740 → 493 / 247`）在测试里写的是 `Math.floor((740 * 2) / 3)` 与 `Math.floor(740 / 3)`——**按公式 246 才是右列的实值，493+246=739，那 1px 谁也没拿到**（leftCard 视觉上比「严格 2/3」少 0.33px，不可见；右列比「严格 1/3」少 0.67px）。取整策略选 floor 而不是「最后一个子补差」，理由是**确定性**：任何环境、任何顺序，同一组输入永远同一组输出——可手推性是本站黄金断言体系的根基。

## 6. 两个防呆

**无界主轴 + Expanded → 抛错**：

```ts
if (totalFlex > 0 && mainMax === Infinity) {
  throw new Error("Flex 在无界主轴上不能使用 Expanded（永远分不到头）");
}
```

「按比例分无限空间」没有数学意义，早炸优于静默给出 Infinity 尺寸。测试（`无界主轴 + Expanded 直接抛错`）：

```ts
expect(() => row.layout({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: 100 })).toThrow(/无界主轴/);
```

真实框架同款：Flutter 的 RenderFlex 对 unbounded 主轴 + Expanded 有同族断言（概念对照，非本机实测）。什么时候会真的踩到？典型链：横向 Row 嵌在**无界横向环境**里——比如另一个 Row 的非弹性子（looseMain 主轴无界）、或 ScrollView 的内容（主轴高度无界，对 Column 而言）。防的不是「写错参数」，是「组合出无界」。

**溢出记账不硬改**：内容超出 mainMax 时 `mainOverflow = 超出量`、尺寸钳到 mainMax，**不裁剪子**。溢出是可观测的状态（控件可以画溢出警告），不是布局器私自吞掉的异常。「怎么处理溢出」的决定权交给了上层——这与「不裁剪」的默认立场一致：裁剪是第五阶段滚动视口才引入的能力。

## 7. Expanded 是子树的一层皮

弹性不是一个布尔标志，是 `RenderExpanded(flex, child)` 包装节点：

```ts
/** 弹性子包装：flex>0 的子参与剩余空间分配。 */
export class RenderExpanded extends RenderObject {
  flex: number;

  constructor(flex: number, child: RenderObject) {
    super();
    this.flex = flex;
    this.appendChild(child);
  }

  protected performLayout(c: BoxConstraints): void {
    // Flex 直接布局被包装的子并把自己的约束透传（Expanded 自身不产生额外几何）
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: 0, height: 0 });
      return;
    }
    child.layout(c);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}
```

- **透传几何**：Flex 把 flexChildConstraints 给 Expanded，Expanded 原样给子、自己 = 子。它唯一的存在意义是「携带 flex 字段 + 被 instanceof 识别」。
- 好处一：**任意子树都能弹性化**——不用每个 RenderObject 都长一个 flex 字段（基类不为一种布局器开口子）。
- 好处二：**flex 改变 = 换包装参数，子树不动**——第七阶段 reconcile 复用友好（描述层换一个 Expanded(flex:2)，子树整棵保留）。
- 识别方式是 `child instanceof RenderExpanded`（第一步的分类与第二步的跳过都靠它）——包装即协议。

## 8. panel 场景：三个 Flex 的实跑数字

panel-tree 里的三处 Flex（组装代码见第二册 §6），数字来自 `panel-tree.test.ts` 断言与我的探针实跑：

**头部行（Row, gap12, crossAlign center）**：

```text
可用宽 752（tight 根 deflate 24）：标题 90（15 字符×6）+ gap12 + 弹性占位 + gap12 + 徽标 90
弹性占位 = 752 − 90 − 90 − 24 = 548；徽标 x = 90+12+548+12 = 662（断言值）
行高 = max(13, 24) = 24（交叉轴取最大子）
标题 y = (24−13)/2 = 5.5、占位 y = (24−1)/2 = 11.5（center 交叉对齐）
```

测试文件里徽标位置写作 `84 + 12 + 554 + 12`——同样等于 662。两种拆法同和不是巧合：**弹性子吸收一切剩余**，标题量错 6px，弹性就少 6px，右缘纹丝不动。这正是「右侧徽标用 Expanded 占位」结构稳健的原因（也是为什么标题宽度的手推错误能藏在断言里不被发现——探针实测当前拆分是 90/548）。

**主体行（Row, gap12）**：740 按 2:1 → 493/246（第 5 节）。窗口 resize 到 400×300 后重算：352−12=340 → **226/113**（探针实测）。

**列（Column, gap12）**：主轴纵向排 header/body/footer，行高 24+12+300+12+20 = 356 < 402（col 高 402 = 450−48），start 对齐 slack 不用。

## 9. Stack 与 Positioned：锚点算术

层叠是 Flex 之外的第三种答案：子不排队，各就各位。`stack.ts` 口径（文件头摘录）：

```text
// 口径：Stack 尺寸 = 非 positioned 子的最大尺寸（被约束钳制）；positioned 子按锚点四边定位，
// left+right 同时给 → 宽 = 栈宽 - left - right（top+bottom 同理）；只给一边 → 取子自然尺寸。
```

performLayout 两个循环（骨架摘录）：

```ts
// 先布局非 positioned 子（松约束），确定栈的基准尺寸
for (const child of this.children) {
  if (child instanceof RenderPositioned) continue;
  child.layout(loosen(c));
  if (child.width > maxW) maxW = child.width;
  if (child.height > maxH) maxH = child.height;
}

const stackW = Math.min(Math.max(maxW, c.minWidth), c.maxWidth);
const stackH = Math.min(Math.max(maxH, c.minHeight), c.maxHeight);
```

**基准尺寸只由非 positioned 子决定**——定位子（badge、角标）不参与撑开栈，这是「装饰不改变容器尺寸」的语义。positioned 子的约束与位置（摘录）：

```ts
const childC: BoxConstraints = {
  minWidth: leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : 0,
  maxWidth: leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : c.maxWidth,
  ...
};
child.layout(childC);
if (child.left !== null) child.x = child.left;
else if (child.right !== null) child.x = stackW - child.width - child.right;
else child.x = (stackW - child.width) * this.alignment.x;
```

**宽度三档**：left+right 同给 → 紧约束 stackW−left−right（拉伸）；只给一边 → 子自然尺寸；都不给 → alignment 比例摆（与 Align 的 slack 公式同族）。**位置三档**同理：left 优先、right 反向（stackW − width − right）、默认比例。

黄金断言（`Positioned：left+right 拉伸定位，单边锚定`）：

```text
基准子 100×100 → 栈 (100,100)
Positioned(left:10, right:10, top:0) 包 Box(0,20)：
  宽 = 100−10−10 = 80（紧）→ ✓ (80,20)，x = 10
Positioned(right:5, bottom:5) 包 Box(30,30)：
  自然尺寸 30×30 → x = 100−30−5 = 65，y = 65（右下角内缩 5）
```

panel 页脚：Stack 基条 752×20（非 positioned，定基准），徽标 `Positioned({right:0, top:0})` 包 Box(60,20) → x = 752−60−0 = **692**（断言值）。

## 10. CSS flex 对照（概念对照，非本机实测）

| CSS flexbox | mini-gui RenderFlex | 备注 |
|---|---|---|
| `flex-direction: row / column` | direction | CSS 还有 row-reverse/column-reverse，mini-gui 没有 |
| `justify-content: flex-start/center/flex-end/space-between` | mainAxisAlign: start/center/end/spaceBetween | 语义一一对应 |
| `align-items: flex-start/center/flex-end/stretch` | crossAxisAlign: start/center/end/stretch | CSS 的 stretch 是**默认值**，mini-gui 默认 start |
| `flex-grow: n` | RenderExpanded(flex: n) | CSS 是子元素属性；mini-gui 是包装节点 |
| `gap` | gap | 同名同义 |
| 溢出（`min-width` 钳制、`overflow` 属性） | mainOverflow 记账 | CSS 默认可见溢出但不报数；mini-gui 显式记差额 |
| `flex-shrink` / `flex-basis` | 无 | mini-gui 只做 grow——收缩不做，溢出记账代替 |

两处结构性差异（公开规范对照，非本机实验）：CSS 把 flex 挂在子元素上，导致「哪些子弹性」散落在各子；mini-gui 用包装节点集中了身份。CSS 的 shrink 让子按权重压缩，mini-gui 选择「不压缩 + 记账」——简化换来了第 4 节那种完全可手推的分配算法。

## 11. 常见误区

1. **「spaceBetween 单元素会把元素推到中间」**——不会：单元素时 `children.length > 1` 为 false，走 start 分支（游标 0），退化为 start。
2. **「Expanded 在任何 Row 里都能用」**——主轴无界时直接抛错（典型：嵌在另一个 Row 的非弹性位、或纵向 ScrollView 的内容里放 Column+Expanded）。
3. **「溢出会被处理掉」**——只是记账：mainOverflow = 差额、行宽钳 max，子照排、不裁剪。处理权在上层。
4. **「stretch 在无界交叉轴也生效」**——不生效：crossMax 无界时 crossTight = null，退化 start（拉伸无限没有意义）。
5. **「2:1 分 740 是 493/247」**——是 493/246：每个子独立 floor，和 739，1px shortfall 没人拿（第 5 节表）。
6. **「gap 计入 fixedMain」**——gap 单独记账（gapTotal = gap×(n−1)），从 free 里扣；且 spaceBetween 下 gap 不注入（间距被 slack/between 接管）。
7. **「位置归子自己」**——placeChild 是 Flex（父）在给子赋 x/y；子改自己的 x/y 会被下次摆位覆盖（协议第三句话）。
8. **「Row 高度是平均子高」**——是最大子高（crossContent 取 max），再钳进交叉区间。
9. **「Stack 会被角标撑大」**——不会：基准尺寸只算非 positioned 子；角标要占位就自己也放一个非 positioned 的占位盒。
10. **「Positioned 的 right 是离右边缘的坐标」**——是距离：x = stackW − width − right（width 参与运算，先量子再定位）。

## 自测

1. 四步算法里，为什么非弹性子必须先布局？（弹性分配依赖什么数字？这个数字在什么时刻才有效？）
2. 175/525 的分配是整除；三个 flex=1 的子分 100px 时各得多少？谁拿到 shortfall？
3. mainOverflow 记账而不裁剪——这把「怎么处理溢出」的决定权交给了谁？给出一个上层消费它的用法。
4. Expanded 为什么做成包装节点而不是子节点上的字段？说出两条理由（提示：基类污染、reconcile）。
5. stretch 在无界交叉轴下退化为 start 的理由是什么？这个判断在源码的哪一行？
6. center/end 的黄金断言为什么要手工注入 `{minW:800, maxW:800}` 的约束？松根下测会发生什么？
7. 推算：Row gap=8，子 100/60/40——行宽多少？三个子的 x 各是多少？
8. 推算：Column gap=12，子 Box(100,30) 与 Box(60,20)——列的宽高各是多少？两个子的 x/y 各是多少（crossAlign=start）？
9. 推算：Row（子顺序：RenderBox(40,·)、Expanded(2)、Expanded(1)），行约束 min=max=811——两个弹性子各多宽？三个子的 x 各是多少？
10. 推算：Stack 基准子 200×80，`Positioned({left:20, right:20})` 包 Box(0,50)——它的尺寸与位置？`Positioned({bottom:10})` 包 Box(30,30) 呢？
