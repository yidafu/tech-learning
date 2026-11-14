# 绝对定位 Absolute：锚边四元组的算术

> [返回：布局算法专题导览](01-导览.md)
> 本册走读 `gui/labs/mini-gui/src/core/render/stack.ts`（87 行，`RenderPositioned` + `RenderStack` 定位分支）与 `layout.test.ts` 的 Stack 组断言。读完你应当能在纸上算出：任意 (left, top, right, bottom) 组合下，浮层拿什么约束、摆在哪里、尺寸从哪来——角标、浮层、遮罩、快捷键提示条全靠这四条边。实跑口径：断言出自 vitest 实跑（全仓 25 文件 201 断言全绿，2026-11-14）。

## 1. 概念坐标：第四种合同——「坐标声明制」

前四种布局都在**计算**位置（游标推进 / 前缀和 / 解方程），Absolute 是唯一**声明**位置的：`left: 12` 不是约束的输入，它**就是** x。合同从「你来算」切换成「我告诉你」：

```text
Flex/Flow/Grid/Constraint：  布局器算 x/y，子被动接受
Absolute（Positioned）：      x/y 是声明值，布局器只做两个动作——
                              ① 按锚边组合给子定约束（决定尺寸从哪来）
                              ② 把声明值抄进 child.x/y
```

代价与收益同源：**快**（零求解）、**但脱离流**——声明值与父的尺寸没有联动，父一变宽，贴右的浮层不会跟着挪（除非用 right 而不是 left）。这册讲清楚「什么时候用它划算」。

在 mini-gui 里，Absolute 不是独立布局器：`RenderPositioned` 是**标记 + 锚边存储**，定位算术由父级 `RenderStack` 的 positioned 分支执行。这是一个刻意的设计选择，第 4 节解释为什么。

## 2. 参数与几何语义

```ts
new RenderPositioned(
  { left?: number, top?: number, right?: number, bottom?: number },
  child,            // 被定位的子（可选；无子时该盒拿满可用空间）
)
// 全部可选；不传的字段 = null = 「这条边不管」
```

四条边决定两件事：**约束**（子能多大）与 **x/y**（子在哪）。规则按轴对称，以水平轴为例：

| 水平声明 | 子的约束 | 子的尺寸 | x 的值 |
|---|---|---|---|
| 只 `left: a` | 松（0..父 maxW） | **自然尺寸** | `a` |
| 只 `right: b` | 松 | 自然尺寸 | `stackW − w − b` |
| `left + right` | **紧：`min = max = stackW − a − b`** | **被拉伸** | `a` |
| 都不传 | 松 | 自然尺寸 | `(stackW − w) × alignment.x`（回落 Stack 的对齐） |

三条语义规则值得背下来：

1. **双边 = 拉伸**：`left+right` 同时给，宽度不再属于子——它是「栈宽减去两条边」的**解**，紧约束下发，子没有商量余地。这正是约束布局 B1（`W = R − L`）的特例：Absolute 是 Constraint 的「零求解」子集。
2. **单边 = 锚定**：另一条边虽然声明了，但只用于**换算 x**，不约束尺寸。`right: 5` 意思是「我的右缘离栈右缘 5」——`x = stackW − w − 5`，w 仍是子的自然尺寸。
3. **全不传 = 对齐回落**：和普通子一样按 Stack 的 `alignment` 摆——但**不参与基准尺寸**（见第 5 节），这是它与普通子的唯一区别。

## 3. 源码走读一：RenderPositioned 自己做什么

```ts
export class RenderPositioned extends RenderObject {
  left: number | null;
  top: number | null;
  right: number | null;
  bottom: number | null;

  constructor(opts: { left?: number; top?: number; right?: number; bottom?: number }, child?: RenderObject) {
    super();
    this.left = opts.left ?? null;
    this.top = opts.top ?? null;
    this.right = opts.right ?? null;
    this.bottom = opts.bottom ?? null;
    if (child !== undefined) this.appendChild(child);
  }

  /** 透传约束给子，自己尺寸 = 子（定位语义由 Stack 在外层赋 x/y）。 */
  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: c.maxWidth, height: c.maxHeight });
      return;
    }
    child.layout(c);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}
```

`RenderPositioned` 的 `performLayout` 与 `RenderGridCell` 逐字同构：**透传约束、尺寸抄子、x/y 清零**。它自己不懂任何定位语义——四个字段只是数据，由父消费。这样设计的收益：

- **单一事实源**：定位算术只写在 `RenderStack` 一处（constraint 布局器同理：`RenderConstrained` 存锚、`RenderConstraint` 求解）。「存数据的节点」与「算几何的容器」分离，是本框架布局器的一致套路；
- **ScriptC 现实约束**：类实例不能当 interface 传（SC2002），锚边参数只能长在类字段上——`RenderPositioned` 天然是容器。

无子分支拿满可用空间（`maxWidth/maxHeight`）——空 Positioned 占位框，教学版允许（画底色框时有用），误用见第 8 节。

## 4. 源码走读二：Stack 的定位算术

`RenderStack.performLayout` 分三段。第一段（基准尺寸）在第 5 节；本节看第二段——positioned 分支：

```ts
for (const child of this.children) {
  if (child instanceof RenderPositioned) {
    const leftRight = child.left !== null && child.right !== null;
    const topBottom = child.top !== null && child.bottom !== null;
    const childC: BoxConstraints = {
      minWidth:  leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : 0,
      maxWidth:  leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : c.maxWidth,
      minHeight: topBottom ? stackH - (child.top ?? 0) - (child.bottom ?? 0) : 0,
      maxHeight: topBottom ? stackH - (child.top ?? 0) - (child.bottom ?? 0) : c.maxHeight,
    };
    child.layout(childC);
    if (child.left !== null)      child.x = child.left;
    else if (child.right !== null) child.x = stackW - child.width - child.right;
    else                           child.x = (stackW - child.width) * this.alignment.x;
    // y 同构：top → top；bottom → stackH − h − bottom；都没有 → alignment.y
  } else {
    child.x = (stackW - child.width) * this.alignment.x;
    child.y = (stackH - child.height) * this.alignment.y;
  }
}
```

三个精读点：

**① 约束构造只看「双边」布尔，不看单边值。** `left+right` 时约束里出现 `stackW − left − right`——注意 `?? 0` 兜底：TypeScript 层面 `child.left` 在 `leftRight` 为真时必然非 null，但编译器推不出这个交叉事实（字段是四个独立可空），`?? 0` 是零成本的防御。若某天有人构造出 `left = null, right = 5` 却走进双边分支，约束会退化成 `stackW − 0 − 5`——防御保证最坏也不炸。

**② x/y 是三级优先链**：`left` > `right` > `alignment`。同时给 left 和 right 时 left 赢——因为双边已经把宽度定死，x 一定是 left；这条链只在「双边为真但约束被父的上游钳制改写」时才有可见影响（`setSize` 会把尺寸钳回传入约束，若父约束更紧，`w < stackW − left − right`，此时 `x = left` 优先保证左锚正确，右缘溢出——溢出归 `mainOverflow` 类似的外部机制，Absolute 这里不记账，交给父的裁剪）。

**③ 非定位子走完全相同的对齐公式**——positioned 分支「全不传」回落的那条。所以 Stack 里普通子与「无锚 Positioned」在摆位上无差别，差别只在第 5 节的基准尺寸。

三级优先链的全部状态枚举（左右轴，六种 reachable 状态）：

| left | right | 双边布尔 | 约束 | x 取值 | 备注 |
|---|---|---|---|---|---|
| a | — | false | 松 | `a` | 左锚 + 自然尺寸 |
| — | b | false | 松 | `stackW − w − b` | 右锚 + 自然尺寸 |
| a | b | **true** | 紧 W=stackW−a−b | `a`（优先链第 1 级） | 拉伸；right 仅参与宽度 |
| — | — | false | 松 | `(stackW−w)×alignment.x` | 对齐回落 |
| a | b | true 但父约束更紧 | 紧被钳 | 仍 `a` | 右缘可能溢出——左锚优先，溢出不记账 |
| null 与数字混排 | — | — | — | — | 不可能：字段只有数字/null 两态，`?? 0` 只在双边分支兜底 |

这张表可以直接当 review checklist：任何 Absolute 的 bug 都能归到其中一行——「行 6」提醒你 `?? 0` 不是语义、只是编译器兜底；「行 5」提醒你**紧约束可以被更紧的父改写**，届时双边退化为「left 优先的单边锚」。

## 5. 基准尺寸：浮层不撑大容器

```ts
let maxW = 0;
let maxH = 0;
for (const child of this.children) {
  if (child instanceof RenderPositioned) continue;   // ← positioned 不参与！
  child.layout(loosen(c));
  if (child.width > maxW) maxW = child.width;
  if (child.height > maxH) maxH = child.height;
}
const stackW = Math.min(Math.max(maxW, c.minWidth), c.maxWidth);
const stackH = Math.min(Math.max(maxH, c.minHeight), c.maxHeight);
```

`continue` 一行是 Absolute 的灵魂：**定位子被跳过，不影响栈的基准尺寸**。推论链：

```text
角标（16×16）标在 300×200 卡片的右上角 → 栈尺寸仍是 300×200
  → 若角标参与基准：栈被撑到 max(300, 角标右缘) —— 「贴右」就永远贴不到卡片边缘之外
  → 「浮层」的语义 = 我的尺寸/位置不关容器的事
```

但注意 `stackW = min(max(maxW, c.minWidth), c.maxWidth)`：基准被父约束钳制。紧约束下（父给了 400×300 tight），即使非定位子只有 100×80，栈也是 400×300——定位子的 `right: 8` 锚的是 **400** 不是 100。手算时第一步永远是「确定 stackW/stackH」，三种情形对照：

| 情形 | 父给 Stack 的约束 | 非定位子最大 | stackW/stackH |
|---|---|---|---|
| 无界父（松约束大画布） | 0..∞ | 100×80 | **100×80**（内容定） |
| 有界父（松 400×300） | 0..400 / 0..300 | 100×80 | **400×300**（钳到 max） |
| tight 父 | 400=400 / 300=300 | 无所谓 | **400×300** |

中间一行是日常主战场：窗口 400×300 里一个 Stack，即使内容只有一角，浮层的锚定空间也是整个窗口。第三行的 `无所谓` 是同一条规则：`min(max(maxW, 400), 400) = 400`，内容再小也顶到 min。

## 6. 手算用例全表

layout.test.ts 的 Stack 组（2 条断言）+ 纸上专练（4 组组合推导）：

| # | 声明 | 栈 | 纸上推导 | 断言 |
|---|---|---|---|---|
| 1 | 非定位子 [100×60, 60×120] | 无界父 | 基准 = max(100,60)×max(60,120) = **100×120** | `stack.size = {100,120}` |
| 2 | stretch：`{left:10, right:10, top:0}` 包 RenderBox(0,20)，栈基准 100×100 | 同上 | 双边 → 紧约束 W = 100−10−10 = **80**；高自由 → 子自然高 20；x = left = **10** | `stretch.size={80,20}`，`x=10` |
| 3 | anchored：`{right:5, bottom:5}` 包 30×30 | 同上 | 单边 → 自然尺寸 30×30；x = 100−30−5 = **65**；y 同 = 65 | `anchored.x=65`，`y=65` |
| 4 | 纸上：`{left:0, top:0, right:0, bottom:0}` | 400×300 | 四边全给 → 紧约束 **400×300** @ (0,0)——「铺满栈」的标准写法 | （推导即答案） |
| 5 | 纸上：`{bottom: 12}` 包 60×20，alignment 默认 center | 400×300 | 垂直单边：y = 300−20−12 = **268**；水平全不传：x = (400−60)×0.5 = **170** | 底部居中提示条 |
| 6 | 纸上：`{left: 8, top: 8}` 包 24×24 | 300×200 | 左上角标：x=8，y=8，自然尺寸——基准不参与，卡片该多大多大 | 徽标浮层的标准写法 |
| 7 | 纸上：`{left:8, right:8, top:8, bottom:8}` 包 24×24 | 300×200 | 四边给全 → 紧约束 284×184——**子被拉到几乎全屏**，24×24 的声明完全被覆盖 | 常见误用案例：想要「贴角+固定尺寸」却写成四边 |

用例 7 是 Absolute 最高频的错误：意图「固定 24×24 的角标」却把四边都声明了。规则一句话：**想要自然尺寸就最多给两条「对边不齐」的边（或单边）**；四边全给是「铺满」语义。再补三个组合的指针行（完整推导在 §10 专练）：

| # | 声明 | 推导入口 | 语义 |
|---|---|---|---|
| 8 | `{left:16, right:16, bottom:12}` 包提示条 | §10 题 A | 横向双边拉伸 + 纵向单边锚定——「一轴一种合同」的日常形态 |
| 9 | `{right:12, bottom:n}` ×3 包 toast | §10 题 B | 浮层叠放要自己记账（bottom 是声明算术）；条数动态就换局部 Column |
| 10 | `{right:5}` 包 260 宽文本，stackW 仅 100 | §10 题 C | maxWidth 来自父约束、锚定基准是 stackW——两数无联动 → x = −165 出界 |

## 7. 与 CSS absolute 的对照

| 语义点 | CSS | mini-gui | 差异原因 |
|---|---|---|---|
| 定位参照物 | 最近的 positioned 祖先（containing block） | **直接父 Stack**（不递归） | 教学版把「谁是我的浮层锚」做成显式结构（套一层 Stack），避免 CSS 那个著名的「到底相对谁」的排查难题 |
| 百分比 | `left: 50%; width: 50%` | 无（需 Constraint 的 percentWidth） | 百分比是方程，归约束布局 |
| z 序 | `z-index` + 层叠上下文 | 子序（后画在上） | 见下册 §6——z-index 的层叠上下文规则复杂度不值 |
| `transform: translate(-50%, -50%)` 居中 hack | 常用 | 不需要 | alignment 回落就是为居中准备的 |
| 脱离流的滚动行为 | 相对 positioned 祖先滚动 | 跟随父 Stack（Stack 在哪它在哪） | 同「参照物显式化」取舍 |
| 双边拉伸 | `left:0; right:0` + `width:auto` | left+right → 紧约束 | 同构 |

## 8. 误用清单与替代

| 误用 | 后果 | 替代 |
|---|---|---|
| 空子 Positioned 拿满空间画底色 | 占满约束 max，遮挡命中 | 用 `RenderDecoratedBox` + 明确尺寸 |
| 四边全给以为能「贴角」 | 子被拉到近乎全屏（用例 7） | 单边锚 + 自然尺寸 |
| 大面积界面用 Absolute 排版 | magic numbers 一堆，父尺寸一变全错 | 骨架用 Flex/Grid，局部浮层才 Absolute |
| 期望 Absolute 子随父内容增长自适应 | 声明值是死的 | 要联动就上 Constraint（锚点方程天生联动） |
| 在 Flow/Flex 里塞 Positioned | 两处代码都不消费它——x/y 永远是 0，四个字段是死数据 | Absolute 只在 Stack 家族里有意义（判 `instanceof RenderPositioned` 的只有 RenderStack） |

最后一条是结构性事实：**Absolute 的语义寄宿在父的 instanceof 分支里**——这是单遍协议「位置归父」的直接体现，也是为什么本册标题是 Absolute 但走读的全是 stack.ts。附赠一个结构性陷阱：单边锚定子的**尺寸上限是「父给 Stack 的约束」，而锚定基准是 stackW（基准尺寸）——两个数没有联动**，stackW 小于自然尺寸时右锚定的子会滑出左界（x 为负）。完整推演见 §10 题 C。

## 9. 与 Constraint 的分工线

Absolute 能表达的（单边锚 + 自然尺寸 / 双边拉伸）恰好是 Constraint 解法表的 A1/A2/B1 三行的无方程版。那为什么两者并存？

```text
Absolute：无求解、无依赖序、O(n) 一遍、声明即答案 —— 但锚点只能是「父的四条边」
Constraint：可锚兄弟、可百分比、可双锚定宽 —— 代价是解方程 + 依赖链轮数
```

分工线一句话：**锚父够用就 Absolute，要锚兄弟/要百分比才升级 Constraint**。判断不需要犹豫：锚点参数里出现兄弟 id 的那一刻，Absolute 出局。

## 10. 纸上专练：三个真实浮层场景

### 题 A：底部安全区提示条（bottom 锚 + 横向双边拉伸）

```text
容器 400×300（父给 Stack 紧约束），声明：
  RenderPositioned({ left: 16, right: 16, bottom: 12 }, 提示条)
推导：水平双边 → 紧约束 W = 400 − 16 − 16 = 368（提示条被拉满，文本自己决定要不要居中）
      垂直单边 → 自然高（比如 28）→ y = 300 − 28 − 12 = 260
答案：x=16, y=260, 368×28
```

这题的语义要点：横向「贴两边」用双边，纵向「离底多远」用单边——两种锚定混用是 Absolute 的日常形态，一条轴一种合同。

### 题 B：右下角 toast 链（单边锚 + 对齐回落的组合）

```text
容器 400×300，三条 toast 依次声明（都是 { right: 12, bottom: n }，高 24，间距 10）：
  toast1: { right: 12, bottom: 12 }        → y = 300 − 24 − 12 = 264
  toast2: { right: 12, bottom: 12 + 34 }   → y = 300 − 24 − 46 = 230
  toast3: { right: 12, bottom: 12 + 68 }   → y = 300 − 24 − 80 = 196
```

每条的 y 都是**声明值算术**（bottom = 前一条的 bottom + 高 + 间距），不是布局器算的——这正是 Absolute 的局限：**浮层叠放要自己记账**。三条以内手算无妨；条数动态时这笔账该交给一个 Column 套在 `{ right:12, bottom:12 }` 的 Positioned 里（流式在局部接管），而不是无限加声明值。

### 题 C：maxWidth 与 stackW 解耦导致的「负坐标出界」（本册最深的坑）

```ts
// 单边锚定的子，约束 maxWidth 用的是「父给 Stack 的约束」，不是 stackW！
new RenderPositioned({ right: 5 }, 长文本(自然宽 260));
```

```text
场景：父给 Stack 松约束 400×300；Stack 里唯一的非定位子只有 100×100
  → stackW = 100（基准尺寸）
  → 文本子：约束 maxW = 400 → 自然尺寸 260×20 成立（没有被钳到 100）
  → x = stackW − w − right = 100 − 260 − 5 = −165   ← 负数，整块滑出左界！
```

规则总结：**右锚定的「右缘在哪」由 stackW 决定，「我能多宽」由父约束决定——两个数没有联动**。stackW 小而自然尺寸大时，右锚定的子向左溢出（x 为负）。工程上两招自保：右锚定 + 长内容时给双边（宽度锁死在栈内），或者 Stack 外面套固定尺寸容器保证 stackW 与约束一致。CSS 里 `position:absolute; right:0` 配合 `max-width` 也有同款行为（负 margin 溢出），工业物同样没有免费午餐。

## 11. 从 CSS 迁移速查

| CSS 惯用法 | mini-gui 写法 | 备注 |
|---|---|---|
| `position:absolute; left:0; top:0` | `RenderPositioned({ left: 0, top: 0 }, child)` | 同构 |
| `right:0; bottom:0` | `{ right: 0, bottom: 0 }` | 同构，锚的是 Stack 基准盒 |
| `left:0; right:0`（横向铺满） | `{ left: 0, right: 0 }` | 双边 → 紧约束拉伸 |
| `left:50%; transform:translateX(-50%)`（水平居中） | 不传 left/right（走 alignment 回落） | 教学版不需要 transform hack |
| `width:100%` + `bottom:0` | `{ left: 0, right: 0, bottom: 0 }` | 双边即百分比铺满 |
| `z-index: 10` | 挪到子列表更靠后的位置 | 见下册 §8（子序即 z 序） |
| containing block 迷惑行为 | 无——参照物永远是直接父 Stack | 结构显式化的红利 |
| `position:fixed` | 挂到根 Stack 的 Positioned | 根 Stack = 顶层 |

## 12. 实跑记录

```text
$ npx vitest run src/core/render/layout.test.ts
 ✓ Stack > 尺寸 = 非 positioned 子的最大尺寸
 ✓ Stack > Positioned：left+right 拉伸定位，单边锚定
全仓：25 个测试文件 201 条断言全绿（2026-11-14）
```

（下册预告：Stack/Z——绘制序与命中序为什么互为倒序、基准尺寸算法、重绘边界图层与「双重平移」实测 bug 的完整复盘。）

## 13. 锚定算术速查卡

把全册公式压成一张卡（贴在显示器边上那种）：

```text
水平轴（垂直轴把 left/top、right/bottom、W/H 对调即可）：

  只 left:  x = left                    尺寸 = 自然尺寸（约束 0..父max）
  只 right: x = stackW − W − right      尺寸 = 自然尺寸
  双边:     x = left, W = stackW − left − right     （紧约束拉伸）
  全缺:     x = (stackW − W) × alignment.x         （回落，不占基准）

三条铁律：
  ① 想要自然尺寸 → 单边（或零边）；双边 = 拉伸；四边 = 铺满
  ② stackW 来自「非定位子最大值 + 父约束钳制」——锚定基准先算它
  ③ 自然尺寸的上限是「父给 Stack 的约束」，不是 stackW（§10 题 C 的出界根源）
```

自检三问（都能秒答就算过关）：

1. `{ right: 8, top: 8 }` 的 24×24 角标在 400×300 的栈里，x、y 各是多少？（x = 400−24−8 = 368；y = 8）
2. `{ left: 10, right: 10 }` 里子声明的自然宽 380、栈宽 300，最终多宽？（紧约束赢：W = 280，声明被钳）
3. 全缺锚的 Positioned 与普通子有什么差别？（摆位公式相同；差别只在「不参与基准尺寸」）
