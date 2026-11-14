# 约束布局 Constraint：锚点线性方程与 Kahn 工作清单

> [返回：布局算法专题导览](01-导览.md)
> 本册走读 `gui/labs/mini-gui/src/core/render/constraint.ts`（255 行）与 `constraint.test.ts`（85 行，7 条手算断言）。读完你应当能：把任何「A 左缘贴 B 右缘再偏 8、宽 100、底贴父底」的布局要求翻译成线性方程组，用纸解出每个子的位置尺寸，并判断哪类要求无解、哪类会成环。这是 Android ConstraintLayout、Apple Auto Layout 的算法内核（教学子集）。实跑口径：断言全部出自 vitest 实跑（全仓 25 文件 201 断言全绿，2026-11-14）。

## 1. 概念坐标：从「排」到「贴」

Flex/Flow/Grid 回答的是「**按什么顺序/格子放**」，约束布局回答的是「**每条边贴在哪**」。一个用例看懂分工：

```text
┌─ 容器 400×300 ──────────────────────────┐
│ a: 贴父左偏8，宽100     → 解出 L=8, R=108  │
│ b: 左贴 a 右缘偏8，右贴父右缘偏-8          │   ← b 的宽是「解出来的」276
│    （左+右双锚 → 拉伸）                    │     不是声明出来的！
│ c: 中心对齐父中心，宽 = 父宽 × 50%         │   ← 百分比是方程不是算式
│ d: 右贴父右缘偏-8，宽100                  │
└──────────────────────────────────────────┘
```

这类「几何合同」用 Flex 表达要么靠巧合对齐（改一处全乱）、要么层层嵌套容器；用约束就是两行声明，**改 a 的宽度，b 自动跟**——因为 b 的宽从来不是数字，而是一条方程的解。

与其它四册的框架级差别：**布局器不再「算法算位置」，而是「先解方程、后按紧约束下发」**。解方程在 performLayout 内部完成，对子来说协议没变（拿到的仍是紧约束 + x/y）。

## 2. 模型：变量、派生量与方程

每个子的水平几何有三个量：`L`（左缘）、`R`（右缘）、`W`（宽）。它们不独立——恒等式 `R = L + W` 永远成立。所以只需两个方程就能锁定水平几何，第三个量自动得出。API 把「锚点」声明为方程：

```ts
// 锚点引用 = 一条线性方程的右边：参照某条边 + 偏移
export interface AnchorRef { id: string; side: SideValue; offset: number }
export function anchor(id: string, side: SideValue, offset = 0): AnchorRef
// id 传空串 = 父容器；offset 可正可负（贴父右缘内缩 8 = right − 8）
```

```ts
new RenderConstrained({
  id: "b",                                        // 锚点链的名牌（被别人引用）
  left:   anchor("a", Side.right, 8),             // L = a.R + 8
  right:  anchor("",   Side.right, -8),           // R = 父.W − 8
  top:    anchor("a", Side.bottom, 8),            // T = a.B + 8
  height: 40,                                     // 垂直尺寸直接声明
  // centerX / bottom / centerY 同理；width/height = -1 表示「待解」
  percentWidth: 0.5,                              // >0 时宽 = 父宽 × 百分比（优先于 width）
})
```

变量的完整账本（每子 4 个，垂直对称）：

| 变量 | 声明来源 | 派生来源 |
|---|---|---|
| `W` | `width` 数字 / `percentWidth` 百分比 / **待解（-1）** | 双锚差：`W = R − L` 或中心方程 `W = 2(C − L)` |
| `L` | `left` 锚 | `L = R − W`、`L = C − W/2` |
| `R` | `right` 锚 | `R = L + W` |

**约束布局的全部算法 = 给这组方程找一个解的顺序，并识别无解/环**。

## 3. 解法表：六种情况，一张纸算完

`solveAxis`（每根轴调一次）实现的判定树。先定型尺寸，再定位置：

**A. 尺寸已知**（`width ≥ 0` 或 `percentWidth > 0`）——只需一个位置锚：

| 编号 | 给了什么 | 解法 | 手算示例（父宽 400） |
|---|---|---|---|
| A1 | `left` | `L = 参照值`，`R = L + W` | left=父左+8，W=100 → L=8 |
| A2 | `right` | `R = 参照值`，`L = R − W` | right=父右−8，W=100 → L=400−8−100=**292** |
| A3 | `centerX` | `L = C − W/2` | centerX=父中，percent=0.5 → W=200，L=200−100=**100** |
| — | 三个全没有 | **抛错：欠定** | 有尺寸没位置，任何 L 都满足方程组 |

**B. 尺寸待解**——需要两个独立方程：

| 编号 | 给了什么 | 解法 | 手算示例（父宽 400） |
|---|---|---|---|
| B1 | `left` + `right` | `L = 左锚`，`W = R − L`（拉伸） | L=116，R=392 → W=**276** |
| B2 | `left` + `centerX` | `W = 2(C − L)` | left=父左+0，centerX=父中−100 → C=100，W=**200**，L=0 |
| B3 | `right` + `centerX` | `W = 2(R − C)`，`L = R − W` | 对称于 B2 |
| — | 只有一个锚 | **抛错：欠定** | 一条方程两个未知数 |

为什么 B2/B3 是「×2」：`C = L + W/2` 代入 `W` 待解——`C − L = W/2`，所以 `W = 2(C − L)`。中心方程总是「半宽」系数，两条方程才能消掉它。

## 4. 依赖序：Kahn 工作清单

### 4.1 为什么数组序不够

子可以锚到兄弟（`anchor("a", Side.right, 8)`），于是方程组有了**依赖方向**：解 b 之前必须先解 a。把声明顺序当解算顺序，一行就翻车——测试用例 1 把 b 排在数组第 0 位（b 依赖 a），任何「按序遍历」实现都会在 b 上呛住。

### 4.2 工作清单主循环（逐段走读）

```ts
const pending: { node: RenderConstrained }[] = [];   // 还没解出来的
const solved: Solved[] = [];                          // {id, l, t, w, h} 解算账本
// ...收集全部约束子进 pending...

while (pending.length > 0) {
  this.solvePasses += 1;                              // 观测口：第几轮
  let progressed = false;
  for (let i = pending.length - 1; i >= 0; i--) {
    const node = pending[i]!.node;
    if (!solveAxis(node, true, hOut)) continue;       // 水平：参照没齐 → 下轮再试
    if (!solveAxis(node, false, vOut)) continue;      // 垂直：同上
    node.layout({ minWidth: hOut.size, maxWidth: hOut.size,
                  minHeight: vOut.size, maxHeight: vOut.size });  // 紧约束下发
    node.x = hOut.pos;
    node.y = vOut.pos;                                // 位置归父协议
    solved.push({ id: node.id, l: hOut.pos, t: vOut.pos, w: hOut.size, h: vOut.size });
    pending.splice(i, 1);
    progressed = true;
  }
  if (!progressed) {
    throw new Error(`约束循环或悬空引用：${names}（互相引用的锚点永远等不到参照）`);
  }
}
```

三件事值得盯住：

1. **「参照没齐就跳过」是无进展的唯一来源**。`solveAxis` 遇到指向未解兄弟的锚点返回 false（不抛错）——把「暂时解不了」和「永远解不了」分开，是工作清单能跑起来的关键。
2. **无进展 = 环或悬空，数学上可证**：若方程组的所有参照要么已解、要么互指，一轮扫完谁也没动 → 没有任何节点能在未来获得新参照 → 永远解不完。与其空转，不如当场点名报错。
3. **解出来的记进账本**（`solved` 数组）：后续 `refValue` 查兄弟的 L/R/C 全从这里读。**账本按 id 查找，与数组顺序无关**——这就是乱序推入也能解的全部秘密。

`refValue` 把锚点翻译成数字（兄弟用账本，父用容器几何）：

```ts
const refValue = (ref: AnchorRef, horizontal: boolean): number | null => {
  if (ref.id === PARENT) {
    if (ref.side === Side.left)   return ref.offset;             // 0 + offset
    if (ref.side === Side.right)  return size + ref.offset;      // W + offset
    return size / 2 + ref.offset;                                // C = W/2 + offset
  }
  const s = findSolved(ref.id);          // 兄弟：账本里查
  if (s === null) return null;           // 还没解 → 调用方下轮再试
  /* 按 side 取 s 的 l / l+w / l+w/2，加 offset */
};
```

### 4.3 solvePasses：依赖深度计

观测口 `solvePasses` = 工作清单轮数 = **最长依赖链长 + 1**（无依赖时 1）。测试用例 1 实测：`[b, a, d, c, e]` 乱序推入 → 第 1 轮解出 a/b/c/d（b 的参照 a 恰好在同轮更早被解）、第 2 轮解出 e（链 a→c→e，c 在第 1 轮解出后 e 就绪）→ `solvePasses ≥ 2` 断言通过。这是「工作清单确实在重排解算顺序」的直接证据。

## 5. 错误分类：欠定、循环、悬空（外加容器无界）

| 错误 | 判定时机 | 报错文本 | 测试 |
|---|---|---|---|
| **欠定**（有尺寸没锚） | `solveAxis` 的 A 分支 | `约束欠定：#j 的水平边一个锚都没有（有尺寸没位置）` | 用例 6 |
| **欠定**（尺寸待解但锚不足） | B 分支落到末尾 | `约束欠定：#j 的水平尺寸没来源（给 width 或至少两条锚边）` | （表中列出，未单独设测） |
| **循环 / 悬空** | 工作清单无进展 | `约束循环或悬空引用：#g, #h（互相引用的锚点永远等不到参照）` | 用例 4、5 |
| **容器无界** | `performLayout` 入口 | `约束布局容器需要有界尺寸（约束是相对父尺寸解的）` | 用例 7 |

两个设计判断：

- **悬空引用并入「循环」报错**：`anchor("nope", ...)` 指向不存在的 id，现象与环相同（永远等不到参照）。教学版不区分——工业实现会用 id 注册表在**声明时**就拦（「nope 不存在」），错误更早更准，代价是维护一张名牌表。
- **超定（过度约束）教学版不检测**：A1 给了 `left` 又给 `right` 和 `width`？当前实现按优先级用 A1，`right` 被静默忽略。Cassowary 系求解器会把它当软约束进目标函数，用优先级仲裁。差距见第 7 节。

## 6. 手算用例全表（constraint.test.ts 的 7 条断言）

容器一律 400×300（`tightRoot: true`）。

| # | 用例 | 声明 | 纸上推导 | 关键断言 |
|---|---|---|---|---|
| 1 | 锚点链（乱序推入） | a：left=父左+8，w100，top=父顶+8，h40；b：left=a.R+8，right=父右−8，top=a.B+8，h40；c：centerX，50%宽，centerY，h60；d：right=父右−8，w100；e：left=c.R+16，w60 | a：L=8；b：L=116，R=392→W=276，T=56；c：W=200，L=100，T=120；d：L=292；e：L=316 | 全部坐标断言 + `solvePasses ≥ 2` |
| 2 | B2：left+centerX 定宽 | left=父左+0，centerX=父中−100 | C=100，W=2(100−0)=**200**，L=0 | `f.width=200`，`f.x=0` |
| 3 | 底栏贴边 | left=父左，right=父右，bottom=父底，percentHeight=0.25 | W=400；H=floor(300×.25)=75；T=300−75=**225** | `bar.{width:400, height:75, y:225}` |
| 4 | 循环 | g：left=h.R+4；h：left=g.R+4 | 互指 → 无一轮有进展 | `toThrow(/循环|悬空/)` 且点名 #g,#h |
| 5 | 悬空 | i：left=anchor("nope") | nope 永远不入账本 | 同上抛错 |
| 6 | 欠定 | j：仅 width=50, height=20 | A 分支三锚全缺 | `toThrow(/一个锚都没有/)` |
| 7 | 容器无界 | `layout(loose(∞))` | 约束相对父尺寸，父尺寸 ∞ 无从谈起 | `toThrow(/有界/)` |

用例 1 是全册的「主干手算题」，建议合上册子自己推一遍 b 的四条边（L=116？R=392？W=276？T=56？），再对测试。

### 6.2 进阶手算：三行表单的贴边链（纸上专练）

声明（容器 360×260，行高 32，行距 12，左右边距 16）：

```text
r1: left=父左+16, width=父宽−32,      top=父顶+12,      height=32
r2: left=父左+16, width=父宽−32,      top=r1.bottom+12, height=32
r3: left=父左+16, right=父右−16,      top=r2.bottom+12, height=32
    （r3 故意换成左+右双锚拉伸——验证两条解法路径在同一条链里并存）
```

推入顺序故意乱序：`[r3, r2, r1]`。推演：

```text
第 1 轮（工作清单逆序扫：r1 → r2 → r3）：
  r3: top 依赖 r2.bottom —— 账本里没有 → 跳过
  r2: top 依赖 r1.bottom —— 没有 → 跳过
  r1: 三锚全指向父 → 解：
      水平：A1（left 给了，width=360−32=328）→ L=16, R=344
      垂直：A1（top 给了）→ T=12, B=44
  progressed=true
第 2 轮：
  r3: r2 还没解 → 跳过
  r2: r1.bottom=44 → T=56, B=88；水平同 r1 → L=16, W=328
  progressed=true
第 3 轮：
  r3: r2.bottom=88 → T=100；水平 B1（左+右）：L=16, R=344 → W=328
  progressed=true；pending 清空，结束
solvePasses = 3 = 链长 r1→r2→r3 的 2 层依赖 + 1
```

最终几何：三行都在 x=16、宽 328，y = 12 / 56 / 100。注意两件事：

1. **r3 的 W 是解出来的**（328），但和 r1/r2 数字相同——因为父宽 − 32 与「左 16 + 右 −16」两条路殊途同归。区别在**语义**：r1/r2 是「声明宽」，父变宽它们不变（贴左）；r3 是「拉伸」，父变宽它跟着变。手算数字一样，几何合同完全不同。
2. **轮数随链长线性涨**（§7 的 O(n²) 账就是这么来的）：每多一行依赖，多一轮。这是教学版需要分块/ Cassowary 的直接原因。

### 6.3 正规方程视角：六式归一

第 3 节的 A/B 六式看起来像六条规则，代数上其实是**同一个 2×2 线性系统的消元结果**。每个子的水平几何写成标准方程组：

```text
未知数：L, R, W（三个）
恒等式：R − L − W = 0            （永远存在，系数固定）
锚方程：每条锚边贡献一条  L = v、R = v 或 C = L + W/2
```

三未知数、一条恒等式 → 恰需两条独立锚方程。六式就是「两条锚方程」的六种选法（从 {left, right, centerX} 里可重复选两条的组合，去掉对称重复）：

| 锚方程组合 | 消元路径 | 归结为 |
|---|---|---|
| L=v₁, R=v₂ | 代入恒等式 | B1：W = v₂ − v₁ |
| L=v₁, C=v₂ | C 方程含 W/2 → 与恒等式联立 | B2：W = 2(v₂ − v₁) |
| R=v₂, C=v₁ | 对称于 B2 | B3：W = 2(v₂ − v₁)，L = v₂ − W |
| L=v₁ + W 给定 | 直接解 | A1 |
| R=v₂ + W 给定 | 直接解 | A2 |
| C=v₁ + W 给定 | 半宽回代 | A3 |

「欠定」的代数含义：锚方程不足两条（秩 < 2）；「循环」的含义：某几行的锚方程右边引用了本组其它行的未知数，系数矩阵成环——Kahn 工作清单本质是**按行消元的拓扑排序**。这样看，第 4 节的算法没有任何「布局」魔法，它就是解小型稀疏线性系统。工业求解器（Cassowary）把不等式也编进矩阵并用单纯形法解——同一套代数观，多了不等号。

### 7.1 性能小账：solvePasses 实测与长链推演

现有断言只锁了下界（`solvePasses ≥ 2`），完整的轮数公式值得手推一遍：

```text
轮数 = 最长锚点依赖链的边数 + 1
  无依赖（全锚父）：1 轮全解
  测试用例 1（乱序 [b,a,d,c,e]）：2 轮（e 等 c，c 第 1 轮已解）
  §6.2 三行表单链 r1→r2→r3：3 轮
  n 行链式表单：n 轮 × 每轮 O(n) 查账本 = O(n²)
```

想实跑验证：把 §6.2 的声明放进循环生成 n=10/40/80 的链，断言 `solvePasses === n`——线性涨轮数、二次涨工作量，就是第 7 节 O(n²) 账的实证版（留作练习，测试骨架在 `constraint.test.ts`）。

## 7. 复杂度账，以及工业求解器差在哪

| 项 | 账目 |
|---|---|
| 单轮 | O(n)（每 pending 节点做常数次账本查找；教学版 `findSolved` 是线性扫，n 大时换 id→下标映射降 O(1)） |
| 轮数 | 最长依赖链长 + 1；链状布局（表单逐行贴上行）= O(n) 轮 → 最坏 **O(n²)** |
| 工程 Cassowary | 不分轮：全部方程进单纯形表一次解出，且支持**不等式**（≤）、**优先级**（必满足 > 尽量满足）、**stay 变量**（倾向保持上次结果）——表达力高一档，实现复杂度也高一档（教学版 255 行 vs Cassowary 实现 2000+ 行） |
| Android ConstraintLayout | 本教学版的直接对标：同样锚点式 API；其内核加了一轮**优化传递**（把锚点图化简后再解，降低平均轮数） |
| Apple Auto Layout | 活跃约束集 + Cassowary 增量求解；性能账本里「激活/停用约束」是一等公民 |

教学版的 O(n²) 最坏情形什么时候真实出现：纵向逐行锚定的长表单（第 i 行贴第 i−1 行）。工程解法有三：分块（每块内部解，块间用行高常量）、限制链长（API 层拒绝跨 K 层引用）、或上 Cassowary。毕业项目若做表单类应用，选分块——改动局部行时只重解该块。

## 8. ScriptC 落点与实现取舍

| 取舍 | 理由 |
|---|---|
| 账本用**数组 + 线性查找**，不用 Map | ScriptC 0.0.35 对 Map 的支持未实测，教学版保守走已验证路径（数组 + 循环查找在 probe 用例里全程可用）；n 小（一屏子数）时线性扫不是瓶颈 |
| 兄弟引用不用 `instanceof` + `as` 下行 | SC1090/SC9001 实测边界：类值下行禁用；这里根本不需要——`RenderConstrained` 的 id 字段经账本转发，全程虚分发 |
| `left?: AnchorRef | null` 一律可空字段 | 可选字段（`?`）的函数值无静态表示（SC2011）；可空（null）是全框架验证过的形态 |
| 错误用 `throw` 而非返回 null | 布局期错误必须炸在开发期；宿主 demo 全部给合法约束，运行期零 throw |

## 9. 对标与分工

| 场景 | 教学版写法 | 对应工业物 |
|---|---|---|
| 表单 label-value 对齐 | label.right → value.left + 8 | Android `app:layout_constraintStart_toEndOf` |
| 底栏贴底 | left+right 双锚拉伸 + bottom 锚 | CSS `position:absolute; left:0; right:0; bottom:0` |
| 居中浮窗 | centerX+centerY + 尺寸 | `Align` 组件（第四册）——单子居中时 Align 更便宜 |
| 比例分割 | percentWidth | iOS multiplier / Android `guideline` + percent |
| 引导线 | （无） | Android Guideline——可用「零尺寸兄弟 + 百分比」模拟 |

什么时候**不**用约束布局：单纯排队 → Flex/Flow；二维表格 → Grid；单子居中/贴角 → Align。约束的计价单位是「方程条数」，能用更便宜的合同就别上方程。完整决策树：

```text
子要怎么放？
├─ 挨个排（有前后顺序，无对齐列要求）
│   ├─ 可能放不下要换行 ──────────→ Flow（wrap 是硬需求才选；否则 Flex）
│   └─ 一定放得下 / 要分剩余空间 ─→ Flex
├─ 对齐到网格（多行同列要对齐）──→ Grid
├─ 单子贴父某角 / 居中 ──────────→ Align（最便宜：slack 乘法，零方程）
├─ 多条边要贴（相对父或兄弟）───→ Constraint
│   └─ 同时要求「后画的在上」───→ Constraint + 包一层 Stack（z 轴另算，见下册）
└─ 位置我全知道，别管我 ────────→ Absolute（RenderPositioned，下册）
```

判据一句话：**约束数越少越好，能降级就降级**。Flex 的游标推进是 O(1) 每子；Constraint 是 O(轮数×n)。日常 UI 里 Flex/Flow 的占比应当在 70% 以上——Android 官方 Compose 抛弃 ConstraintLayout 式 XML 的理由之一就是「大多数布局在排队」。

### 9.1 三个反例：该降级没降级的现场

反例 1——**对齐列硬凑 Flex**：三行「标签 + 输入框」，标签宽度不一。Flex 方案：标签全塞固定宽 `SizedBox(120)`——某个标签文案一改就溢出。约束方案：所有输入框 `left = 父左 + 120`，天然成列。该用约束没用，是 Flex 代码库里最常见的僵硬来源。

反例 2——**Constraint 套三层 Align 居中**：居中浮窗写成 `Align → Align → SizedBox` 层层百分比。单子居中一个 `Align` 就够（slack 乘法 O(1)），方程一条都不用写。约束不是荣誉徽章。

反例 3——**动态行数用 Absolute 记账**：十条 toast 各自 `{ bottom: 12 + i×34 }`，i 是运行时算的——父尺寸一变、字体一变全崩。局部流式（一个 Column 装进单条 Positioned）接管叠放，Absolute 只负责「锚到角落」。判定口诀：**声明值里出现运行时加法 → 该换布局器了**。

## 10. 实跑记录

```text
$ npx vitest run src/core/render/constraint.test.ts
 ✓ src/core/render/constraint.test.ts (7 tests) 4ms
全仓：25 个测试文件 201 条断言全绿（2026-11-14）
```

（下册预告：Absolute 把「锚点」简化到极致——四条边、没有方程求解；以及为什么它是最快也最危险的布局。）

## 附录 A：工程三陷阱

### 陷阱一：percent 与 width 双给——percent 静默胜出，floor 留下零头

触发场景：声明时写了 `percentWidth: 0.5` 又留了 `width: 180` 当「兜底」，或者兄弟们各分 0.33 期望凑满整行。读码收据：`src/core/render/constraint.ts` 第 180 到 185 行，`solveAxis` 定型尺寸的顺序是「先查 percent、再查 sizeHint」——`percent > 0` 时 `size = Math.floor(轴尺寸 × percent)`，`else if (sizeHint >= 0)` 才轮到 width/height。两条后果：其一，width 是死参数，读代码的人以为有回退，实际永远不会生效；其二，percent 的基数是**容器全尺寸**，不是扣除兄弟后的剩余空间——三个 0.33 的兄弟各得 floor 后的 33（父宽 100 时），合计 99，剩下的 1px 没有任何分配规则认领。根因：教学版把 percent 当「一条方程」处理，没有引入工业求解器的优先级仲裁与余数分摊。规避：percent 与 width 二选一声明；需要「剩余空间按比例分」的语义就别用约束布局——那是 `RenderExpanded`（Flex 的弹性子）的地盘，见第四阶段 [05-Flex布局](../04-第四阶段/05-Flex布局.md)。

### 陷阱二：混入非约束子——静默出局，永远 0×0

触发场景：往 `RenderConstraint` 里直接塞一个 `RenderPadding` 或 `RenderText`，以为它会像别的容器一样被布局。读码收据：`constraint.ts` 第 131 到 133 行，`performLayout` 收集工作清单时只收 `child instanceof RenderConstrained`；随后的主循环只处理 pending 里的节点——非约束子的 `layout()` 从未被调用，width/height 停留在字段初值 0、x/y 停在 (0,0)，`needsLayout` 永远为 true。症状：不报错、不绘制（0×0 画不出东西）、不参与方程组——「隐身」。根因：`RenderConstraint` 的协议是「每个子一组方程」，普通子没有方程可解，实现选择直接无视而不是抛错。规避：任何要显示的内容都包一层 `RenderConstrained`（它自己的 performLayout 会透传约束给内部子树，第 94 到 104 行），给它声明锚点；纯贴角场景考虑包 Stack（见本专题 [06-堆叠分层Stack](06-堆叠分层Stack.md)）。

### 陷阱三：轮数 = 扫描方向 × 声明顺序——§6.2 口径核对

触发场景：纸上推演 `solvePasses`，结果与实跑对不上。读码收据：`constraint.ts` 第 235 行，工作清单的扫描是**下标逆序**——`for (let i = pending.length - 1; i >= 0; i--)`，pending 数组的**末位先被尝试**。两个推论：其一，同一轮里，被依赖者只要排在数组更靠后（下标更大），就会先被解出，依赖者同轮跟进；被依赖者排在更靠前（下标更小）时，依赖者才要等下一轮。其二，对照 §6.2 的三行表单：声明序 `[r3, r2, r1]` 的实际扫序是 r1 → r2 → r3（下标 2、1、0），第一轮 r1 解出后 r2、r3 依次就绪——**一轮全解，solvePasses 是 1**。§6.2 的纸上推演按「每轮从声明首项解锁一层」叙述（那是把正序扫描当成了扫序），推出了 3 轮；几何结论不受影响（三行最终 y = 12/56/100、宽 328 与轮数无关），但轮数口径要按代码修正。裁决办法：把该声明翻成一条 vitest 断言 `expect(root.solvePasses).toBe(1)` 实跑一次。本文附录 C 的配方严格按第 235 行的实际扫序推演。「轮数 = 最长依赖链边数 + 1」这条公式本身仍成立——链在数组里怎么摆，决定的只是**哪一轮**解出哪个节点，最坏 O(n²) 的账（第 7 节）也不受扫描方向影响。

## 附录 B：决策速查表

| 决策点 | 选哪个 | 判据 |
|---|---|---|
| 尺寸跟内容走 | width / height 数字 | 文案、图标这类自身有自然尺寸的子 |
| 尺寸跟容器走 | percentWidth / percentHeight | 「占父宽一半」这类比例分割；注意 floor 零头与全尺寸基数（附录 A 陷阱一） |
| 尺寸跟邻居走 | 双锚拉伸（left+right） | 分隔线、底栏这种「两端定了中间自动」的构件 |
| 只想居中 | centerX / centerY 单锚 + 尺寸 | A3 式解法；单子居中且无其他约束时，`Align` 更便宜（零方程） |
| 锚父还是锚兄弟 | 结构性贴边锚父；对齐关系锚兄弟 | 每条兄弟锚多一条依赖边，直接进轮数账（第 7 节的 O(n²) 就从这来） |
| id 取名 | 唯一、非空 | 空串是父容器的保留字（`constraint.ts` 第 45 行 `PARENT = ""`），子 id 空串会与父锚混淆语义 |
| 悬空引用 | 声明期对一遍名牌 | 教学版与环同报错（第 5 节的设计判断）；工业实现用 id 注册表提前拦 |
| 长表单逐行贴 | 改用 Flex column + gap | 链式锚定是 O(n) 轮 × O(n) 查找；行高推进这种事游标一遍就够 |
| 「后画的在上」 | Constraint 外包 Stack | z 轴不在方程组里，约束只解平面几何（本专题 06 册） |
| 布局器降级 | 先问「是不是排队」 | 判决树见正文第 9 节：能 Flex/Flow/Grid/Align 就不上方程 |
| 垂直轴给什么 | 与水平轴同一张表 | `solveAxis` 两轴同构（`horizontal` 布尔切换字段），top/bottom/centerY 对应 A1/A2/A3 与 B1 到 B3；手算时先水平后垂直，别发明第二套规则 |
| 容器自身多大 | 取父约束的 max（`setSize(c, max)`） | `RenderConstraint` 自己永远是「占满父给的尺寸」——方程组解的是子的位置，容器本身不参与方程 |
| 想要边距语义 | 直接写进 offset（贴父左 + 12） | 没有 margin 属性；偏移是方程常数，负值内缩、正值外扩全靠符号表达 |
| 想要「内容随解出的尺寸缩放」 | 靠紧约束下发自然发生 | 解出的尺寸以紧约束传给子树（第 4.2 节走读的 `node.layout`），子树里的文本会按新宽度重新断行——约束改一条，文本重排是免费的联动 |

## 附录 C：手算/走查配方：工具栏五件套的两轮推演

容器 500×320（`tightRoot` 挂进去，参照 `constraint.test.ts` 的 `solved400` 装配法）。声明（**故意把被依赖者排在数组前面**，触发多轮）：

```text
children 顺序：[logo, close, status, side, title]
logo:    left=父左+12,  top=父顶+12,  width=40, height=40
close:   right=父右−12, top=父顶+12,  width=32, height=32
status:  left=父左+0,   right=父右+0, bottom=父底+0, height=28
side:    left=父左+0,   percentWidth=0.2, top=logo.bottom+12, bottom=status.top−8
title:   left=logo.right+12, right=close.left−8, centerY=logo.centerY, height=24
```

第 1 步，算父参照的数值：父右 = 500，父底 = 320，父中 = 250。

第 2 步，工作清单第 1 轮（下标逆序，尝试顺序 title → side → status → close → logo）：

- title（下标 4）：left 锚参照 logo——账本里没有 → `solveAxis` 返回 false，跳过；
- side（下标 3）：top 锚参照 logo——没有 → 跳过；
- status（下标 2）：三锚全指向父。水平：B1（left+right）→ L = 0，W = 500 − 0 = 500；垂直：尺寸已知（28）+ bottom 锚 → B = 320，T = 320 − 28 = 292。解出，入账本；
- close（下标 1）：水平 A2 → R = 500 − 12 = 488，L = 488 − 32 = 456；垂直 A1 → T = 12，B = 44。解出；
- logo（下标 0）：水平 A1 → L = 12，R = 52；垂直 A1 → T = 12，B = 52（centerY 基准 = 12 + 40/2 = 32）。解出。本轮 progressed，进入第 2 轮。

第 3 步，第 2 轮（扫序不变）：

- title：logo.right = 52 → L = 52 + 12 = 64；close.left = 456 → R = 456 − 8 = 448；尺寸待解 → B1：W = 448 − 64 = 384；centerY 参照 logo → C = 32；尺寸已知（24）→ T = 32 − 12 = 20，B = 44。解出；
- side：logo.bottom = 52 → T = 52 + 12 = 64；status.top = 292 → B = 292 − 8 = 284；尺寸 = floor(500 × 0.2) = 100 → L = 0，H = 284 − 64 = 220。解出。pending 清空。

第 4 步，对账：`solvePasses = 2` = 依赖链边数（title→logo 一条、side→logo/status 各一条，最长 1）+ 1；紧约束下发后 title 的宽被钉死为 384——它内部子树拿到的约束 min === max，`RenderExpanded` 之类在里面的弹性诉求归零。全部数字：logo (12,12,40,40)、close (456,12,32,32)、status (0,292,500,28)、side (0,64,100,220)、title (64,20,384,24)。每一条都能回代验证：title 的 R 448 = 64 + 384；side 的 B 284 = 64 + 220 = 292 − 8。纸面配方到此闭合。

## 附录 D：code review 检查单

- [ ] 每个子 id 唯一且非空？（空串是父的保留字，兄弟互锚时撞上语义就乱了）
- [ ] 有尺寸的节点至少一条位置锚、无尺寸的节点恰好两条独立锚？（欠定在布局期才 throw，声明期没有任何检查）
- [ ] percent 与 width/height 是否只声明了一个？（percent 静默胜出，双给是死参数）
- [ ] `RenderConstraint` 的直接子是否全部是 `RenderConstrained`？（混入普通子被静默忽略、永不布局，见附录 A 陷阱二）
- [ ] 兄弟锚链有没有超过两层？长表单是否已改 Flex + gap 或分块？（链长直接进轮数）
- [ ] 测试是否锁了 `solvePasses` 的下界或精确值？（扫描方向被未来改动时，这是唯一能报警的断言）
- [ ] 三类错误的正则断言都有对应用例吗？（循环或悬空、锚都没有、有界——`constraint.test.ts` 各有对号）
- [ ] 需要叠放的约束子是否包了 Stack？（z 序不在方程组里）
- [ ] 解算结果是紧约束下发——子树里有没有被紧约束破坏的弹性逻辑（Expanded 在紧主轴下分不到空间，查 [05-Flex布局](../04-第四阶段/05-Flex布局.md)）？
- [ ] 错误是否让它在开发期炸出来而不是 try 后吞掉？（现状口径：宿主 demo 全合法约束、运行期零 throw）

## 附录 E：反模式对照

| 反模式 | 症状 | 正确做法 |
|---|---|---|
| 一切布局都上约束（含简单排队） | solvePasses 随节点数涨；满屏 id 字符串名牌 | 排队交给 Flex/Flow（游标 O(1) 每子），约束留给「贴边/居中/比例」几何合同 |
| 用兄弟锚链逐行推进行高（几十行 top = 上一行 bottom + 12） | 轮数 = 行数，O(n²)；改一行牵动全链重解 | Flex column + gap 一遍游标；确需锚定再分块，块间用常量行高 |
| 动态列表项全量互锚（id 用循环变量拼） | 锚点图成网状，谁也解不出或悬空一个就全容器抛错 | 锚点只连结构性邻居；列表条目交给容器布局器，不进方程组 |
| percent 后面写 width 当兜底 | width 永不生效，读者误以为有回退 | 二选一；「剩余空间按比例」用 Flex 的 Expanded，不用 percent |
| 拿 RenderConstraint 当普通容器装内容 | 普通子 0×0 隐身、无告警（附录 A 陷阱二） | 每个可见内容包 RenderConstrained 声明锚点，或改挂 Stack |
| 布局期 throw 被 try-catch 吞掉 | 循环约束静默失败，界面缺一块无人知晓 | 让错误炸在开发期；测试用正则点名（错误文本自带节点名单） |
| 纸上推演扫序凭直觉（把声明序当扫序） | 推出的轮数与实跑不符（附录 A 陷阱三） | 先读第 235 行的下标逆序，再推演；轮数写进断言锁死 |

## 附录 F：与真实框架对照（概念对照，非本机实测）

| mini-gui 概念 | Android ConstraintLayout | Apple Auto Layout | Cassowary 求解器 | 差异要点 |
|---|---|---|---|---|
| `anchor(id, side, offset)` | `app:layout_constraintStart_toEndOf` 系 XML 属性 | `NSLayoutConstraint`（item:attribute:relatedTo:multiplier:constant:） | 约束对象（变量、表达式、关系、强度） | 三家 API 形状同源：参照边 + 偏移；Auto Layout 多出 multiplier（比例内建在方程系数里）与关系符（等号或大于等于） |
| 六式解算表（A1 到 B3） | 约束先化简再交给求解器（内部有一轮优化传递） | 活跃约束集 + Cassowary 增量求解 | 单纯形法解整张表 | 教学版按情况分类直接解；工业版把方程全部丢进同一张表，靠算法统一处理，换来不等式与优先级能力 |
| Kahn 工作清单轮数 | 依赖图拓扑 + 化简，长链同样有代价 | 增量求解：小改动只局部回解 | 增量 update（dual simplex 热启动） | 教学版每帧全量重解；工业版「改一条约束」不必从零再来——这是第 7 节 O(n²) 之外的第二道性能鸿沟 |
| `percentWidth` | Guideline + `layout_constraintPercent` 系 | multiplier（anchor 乘数） | 方程系数（表达式自带标量乘法） | 概念一致：比例是方程的一部分，不是布局器的特判 |
| 循环或悬空引用报错 | 构建期 linter 与运行期诊断并报 | 控制台输出「Unable to simultaneously satisfy constraints」并列出冲突约束 | unsatisfiable 状态 + 诊断信息 | 教学版点名参与节点已够用；工业版会把整条冲突链打印出来供人读 |
| 无约束子静默出局（附录 A 陷阱二） | 不存在——每个子必须有约束或走默认约束 | 同样要求每子有约束（否则按 frame 语义另算） | 无此概念 | 教学版的选择是「不进方程组就不动」，工业框架要么报错要么有明确的默认行为 |

三点观察。其一，教学版的「等式 + 依赖序」恰好是 Cassowary 的严格子集：去掉不等式（大于等于）、优先级（required 与可选之分）、stay 变量（改动时倾向保持旧值）之后，剩下的等式系统用分类解法表就能全解——这正是本册能压进 255 行的原因，也是「六式归一」一节代数视角的由来（第 6.3 节）。其二，Auto Layout 与 Android 的内核都做了「约束集维护」这一层：约束有激活与停用生命周期，求解器在活跃集上增量运算；mini-gui 每次布局全量重建 pending 数组，代价是动态增删控件时全表重解——若做毕业项目的表单类应用，分块（第 7 节）与「只重解受影响块」是两级都值得做的优化。其三，报错的信息设计值得抄：工业求解器的报错把「哪几条约束互相冲突、各自的方程是什么」整段列出，人能直接读；教学版点名节点 id 是同一思想的最小实现——错误信息的读者是人不是机器，把参与解的名字给全，调试时间差一个量级。

## 附录 G：读码收据索引与自证路径

本册附录的每条论断在仓库里的落点汇总：API 与数据模型（`AnchorRef`、`anchor` 工厂、`Side` 常量、空串保留给父）在 `src/core/render/constraint.ts` 第 24 到 45 行；`RenderConstrained` 的可空锚点字段与「width 为 -1 表示待解」在第 47 到 105 行；`RenderConstraint.performLayout` 的完整解算——有界检查（第 121 到 123 行）、只收约束子（第 131 到 133 行）、`refValue` 的父与兄弟双路径（第 145 到 165 行）、`solveAxis` 的尺寸定型与六式判定（第 168 到 229 行）、工作清单主循环与逆序扫描（第 232 到 253 行）。附录 A 陷阱一引用的 percent 优先与 `Math.floor` 在第 180 到 185 行；陷阱三引用的扫描方向在第 235 行。七条既有断言在 `src/core/render/constraint.test.ts`：乱序锚点链（用例 1 的 `solved400` 装配与 solvePasses 下界）、B2 定宽（用例 2）、底栏贴边与 floor（用例 3）、循环点名（用例 4）、悬空（用例 5）、欠定（用例 6）、容器无界（用例 7）。想自证附录 C 的工具栏配方，照 `solved400` 的装配法换一个 500×320 的 `tightRoot`，按附录 C 的声明序挂五个 `RenderConstrained`，断言五个节点的 x/y/width/height 与 `solvePasses` 等于 2——纸上每一步都给了可回代的数字。想自证陷阱三的口径，把 §6.2 的三行表单照抄成声明序 `[r3, r2, r1]` 的用例，断言 `solvePasses` 等于 1：这两条新用例合起来，就把「扫描方向 × 声明顺序」的账永久钉进了测试。
