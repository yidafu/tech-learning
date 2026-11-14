# 堆叠与分层 Stack / Z：第三根轴的完整算法

> [返回：布局算法专题导览](01-导览.md)
> 本册走读 `gui/labs/mini-gui/src/core/render/stack.ts`（87 行）、`events/hit-test.ts`（43 行）、`render-object.ts` 的绘制遍历（317 行中 paint/paintInto 段）、`owner.ts` 的 flushPaint（144 行）。读完你应当能：判断任意叠放界面「谁在最上、点击落到谁」、算出 Stack 的基准尺寸，并理解图层合成（blit）为什么必须处理偏移——本册末尾完整复盘一个**实测抓到的双重平移 bug**（右面板漂到 2× 偏移处），它是「绘制序/合成序」两套坐标合同的活教材。实跑口径：25 文件 201 断言全绿（2026-11-14）。

## 1. 概念坐标：z 轴是布局的第三根轴

前几册的算法都在解 (x, y)；界面一旦重叠（遮罩、下拉菜单、徽标、拖拽层），必须有第三根轴的裁决规则。mini-gui 的答案是**零新概念**：

```text
z 序 = 子序 = 绘制序（先画的在底）
命中序 = 子序倒序（后画的先命中）
```

一条声明顺序同时定死「谁盖住谁」与「点一下给谁」。没有 z-index，没有 zIndex API——第 8 节专门论证这个克制的代价与收益。

```text
                z（屏幕外方向）
      ┌────────────────────────┐
      │  [1 遮罩] → [2 弹窗] → [3 徽标]   ← 子序：绘制沿箭头，命中逆箭头
      └────────────────────────┘
点击 (x,y)：先试 3（最上），没中再试 2、1 —— 命中 = 从栈顶往下找
```

## 2. RenderStack 三段走读

`RenderStack.performLayout` 的三段结构（第 5 册细读过定位分支，本册补全另外两段）：

```ts
// 第 1 段：基准尺寸——只看非 positioned 子
let maxW = 0;
let maxH = 0;
for (const child of this.children) {
  if (child instanceof RenderPositioned) continue;
  child.layout(loosen(c));
  if (child.width > maxW) maxW = child.width;
  if (child.height > maxH) maxH = child.height;
}
const stackW = Math.min(Math.max(maxW, c.minWidth), c.maxWidth);
const stackH = Math.min(Math.max(maxH, c.minHeight), c.maxHeight);
```

手算（layout.test.ts 用例）：子 [100×60, 60×120]，父无界 → 基准 = max(100,60) × max(60,120) = **100×120**。基准与 z 序无关——**子序只决定「盖谁」，不决定「多大」**。定位子（Positioned）被 `continue` 跳过：浮层不撑大容器（第 5 册 §5）。

第 2 段：positioned 子按锚边定约束与 x/y（第 5 册 §4 的三级优先链）。第 3 段：非 positioned 子按 `alignment`（默认中心 {0.5, 0.5}）摆位：`child.x = (stackW − child.width) × alignment.x`——Slack 乘法，与第四册 Align 同族。

## 3. 绘制序：paintInto 的三重顺序

全局绘制顺序由 `RenderObject.paintInto` 的一条循环给出：

```ts
paintInto(p: Painter): void {
  if (this.clipsContent()) {
    p.clipRect({ x: 0, y: 0, width: this.width, height: this.height });
  }
  this.paintSelf(p);                       // ① 先画自己（父的「底色」）
  for (const child of this.children) {     // ② 再按声明序画子
    if (!child.needsPaint && child.layer !== null && child.isRepaintBoundary()) {
      p.save();
      p.translate(child.x, child.y);
      p.blit(child.layer);                 // 干净的重绘边界：重放缓存
      p.restore();
    } else {
      child.paint(p);                      // 递归：translate(child.x,y) 后再 paintInto
    }
  }
}
```

三个顺序叠加出全局序：**先父后子**（父的背景先铺）、**兄弟按声明序**（后者盖前者）、**深度优先**（一棵子树画完才轮到下一棵）。任何一点命中的像素，它的「最上层归属」都能用这三条规则推出来：

```text
Stack（遮罩, 弹窗, 徽标）：
  遮罩铺满 → 弹窗盖遮罩 → 徽标盖弹窗
  徽标与弹窗重叠处 = 徽标的像素 —— 后声明的赢
```

`clipsContent` 在子树递归前下剪裁——滚动视口（第七册 ScrollView 覆写它）由此保证「内容滚出视口不可见」，Stack 默认不裁剪（浮层可以出界，这正是浮层语义）。

## 4. 命中序：hit-test.ts 全走读（43 行）

```ts
export function hitTest(root: RenderObject, x: number, y: number): HitResult {
  const chain: RenderObject[] = [];
  hitTestNode(root, x, y, chain);
  return { chain };
}

function hitTestNode(node: RenderObject, x: number, y: number, chain: RenderObject[]): boolean {
  if (!node.hitTestSelf(x, y)) return false;          // ① 不在自己盒子里 → 子树免谈
  for (let i = node.children.length - 1; i >= 0; i--) { // ② 逆序试子（栈顶优先）
    const child = node.children[i];
    if (child === undefined) continue;
    if (hitTestNode(child, x - child.x, y - child.y, chain)) {  // ③ 局部坐标换算
      chain.push(node);                                // ④ 命中：把自己挂上链尾
      return true;
    }
  }
  chain.push(node);                                    // ⑤ 子没中：自己是叶子命中
  return true;
}
```

四条规则：

| 行 | 规则 | 为什么 |
|---|---|---|
| ① | 先问自己的盒子（`hitTestSelf` 默认矩形覆盖） | 盒外必不命中，子树整体免谈——剪枝 |
| ② | **子按逆序试探** | 与绘制序精确镜像：后画的先被点。没有这一行，点「徽标」会命中底下的弹窗 |
| ③ | 坐标沿递归递减 `child.x/y` | 与绘制的 translate 互逆：**绘制局部坐标 = 窗口坐标 − Σ祖先偏移**，两套坐标系同一份契约 |
| ④⑤ | 命中链**自底向上**组装（最深者先入链） | 消费端（事件分发器）从链头开始冒泡：先给最深的最内层控件，没人吃再给父 |

`firstInChain(chain, pred)` 是链的查询端：从最深到根找第一个满足谓词的节点——焦点恢复、滚动链查找都用它。

**两序一致性手算**：Stack 里 [遮罩(全屏), 按钮(20×20)@(180,140), 徽标(16×16)@(200,8)]，点击 (205, 15)：

```text
绘制时：遮罩 → 按钮 → 徽标（徽标最后画，重叠处徽标的像素）
命中时：根.Stack(在盒内) → 逆序试子：徽标(局部 5,7 在 16×16 内 → 命中！)
       命中链 = [徽标, Stack]；按钮根本没被试探
```

若没有逆序（正序试探），同一点击会先命中遮罩（全屏盒子）——**「看得见的拿不到事件」**，z 序与命中序脱钩是新手框架最常见的幽灵 bug。

### 4.1 消费端：dispatcher 的四条分发铁律

命中链的消费者是 `events/dispatcher.ts`（101 行），它把「链」翻译成四条分发铁律——每条都直接依赖 §3/§4 的两序合同：

```ts
// 链上每个节点依次收事件（自底向上 = 冒泡顺序）。
private deliverPointer(chain: RenderObject[], ev: PointerEvent): void {
  for (const node of chain) {
    if (ev.phase === 0) node.onPointerDown(ev);
    else if (ev.phase === 1) node.onPointerMove(ev);
    else if (ev.phase === 2) node.onPointerUp(ev);
  }
}
```

| 铁律 | 实现 | 依赖的两序性质 |
|---|---|---|
| ① pointer down/up：命中链自底向上分发（最深者先收） | `deliverPointer` 正序走 chain（chain[0]=最深） | 命中序保证 chain[0] = 「看得见的那层」 |
| ② 按压捕获：down 时记 `pressChain`，后续 move/up 全发给它 | `pressChain` 字段 + phase 分支 | 拖拽中途滑出按钮也不丢事件——链在按下时冻结 |
| ③ wheel 被链上第一个处理器吞掉 | `dispatchWheel` 里 `if (node.onWheel(ev)) return` | 链序（内→外）天然实现嵌套滚动「内层先吞」 |
| ④ hover 差分：旧链有新链无 → Leave；新有旧无 → Enter | `updateHover` 双循环 + `hoverChain` 缓存 | 链即「当前指着谁」——z 序一动（子增删）链就变，hover 自动跟 |

铁律 ② 是 Stack 界面最依赖的一条：弹窗里的按钮按住、拖到遮罩外再松开——up 仍发给按钮（捕获链没变），点穿遮罩的事故不会发生。若没有捕获，up 会重新命中（那时指针在遮罩上）→ 按钮永远收不到 up。

铁律 ④ 的方向细节值得读原注释：**Leave 从浅到深发、Enter 从深到浅发**（旧链正序 / 新链正序的遍历方向差）——离开时先通知最外层、进入时先通知最内层，与直觉的「先外后内出、先内后外进」一致。

## 5. 手算用例全表

| # | 场景 | 推导 | 断言来源 |
|---|---|---|---|
| 1 | Stack 基准尺寸 | [100×60, 60×120] → 100×120 | layout.test「尺寸 = 非 positioned 子的最大尺寸」 |
| 2 | 双边拉伸 | {left:10,right:10,top:0} 包 0×20，栈 100×100 → 80×20 @ (10,0) | layout.test「Positioned：left+right 拉伸定位」 |
| 3 | 单边锚定 | {right:5,bottom:5} 包 30×30 → x=y=100−30−5=65 | 同上 |
| 4 | 纸上：z 裁决 | 三层重叠，点击重叠点 → 最深后声明者拿链头 | §4 手算 |
| 5 | 纸上：alignment 回落 | 无锚 positioned 与普通子同公式：x=(stackW−w)×0.5 | 第 5 册 §2 规则 3 |
| 6 | 纸上：重绘边界 blit 偏移 | 右面板行内 x=100 → 干净重录时命令应仍在 (100,0)（见 §6） | pipeline.test「干净边界子树被 blit 到子偏移处」 |

## 6. 重绘边界与图层合成：一个实测 bug 的完整复盘

第六阶段给绘制加了**重绘边界**（`isRepaintBoundary()`）：边界子树的内容录进独立 `DisplayList` 缓存；未变脏的边界在父绘制时**重放缓存（blit）而不是重画**。录与放的配合由 `owner.flushPaint` 与 `paintInto` 共同保证：

```ts
// owner.ts flushPaint（核心段）：
pending.sort((a, b) => this.depthOf(b) - this.depthOf(a));  // 深度大的先录（内层先新）
for (const node of pending) {
  if (!node.needsPaint && node.layer !== null) continue;
  const list = new DisplayList();
  const painter = new StatefulPainter(list);
  node.paintInto(painter);   // ← 图层内容 = 边界局部坐标（原点=边界左上）
  node.layer = list;
  this.clearPaintDirty(node);
  this.repaintedNodes += 1;
}
```

### 6.1 现象：右面板漂到 2× 偏移处

`pipeline.test.ts` 的黄金用例「干净边界子树被 blit 到子偏移处」：

```ts
// 两块重绘边界并排：左面板探针 100×100，右面板探针 80×60（异尺寸便于按尺寸找命令）
const before = findProbeRect(rightProbe.width);
expect(before).toEqual({ x: right.x, y: right.y });   // 右面板行内 x=100
// 实测：{ x: 200, y: 0 } —— 恰好是 2 × 100
```

### 6.2 定位：两套坐标合同的叠加

- **合成合同**（blit）：图层是**边界局部坐标**，父放的时候 `translate(child.x, child.y)` 补偏移——§3 源码里那段。
- **直绘合同**（paint）：`paint()` 自己先 `translate(this.x, this.y)` 再走内容——这层平移对直绘路径是**必需**的（否则所有子都画在父原点，第五阶段实测抓过反向的 bug）。

修复前 flushPaint 调的是 `node.paint(painter)`：paint 先把**边界自己的 x/y 平移进图层**（图层内容变成「根坐标」），随后父 blit 又补一次 `translate(child.x)` → **双重平移**。左面板 x=0，0×2=0，**完全不可见**；右面板 x=100，100×2=200，当场暴露。「为什么只抓到一半」：偏移为零的错误永不显形——黄金用例里「异尺寸 + 非零偏移」两个设计缺一不可。

### 6.3 修复：把「自带平移」从内容遍历里拆出来

```ts
paint(p: Painter): void {
  p.save();
  p.translate(this.x, this.y);   // 直绘路径：进自己局部坐标系
  this.paintInto(p);
  p.restore();
}

paintInto(p: Painter): void {
  if (this.clipsContent()) { /* 裁剪 */ }
  this.paintSelf(p);
  for (const child of this.children) { /* blit 或递归，§3 同款 */ }
}
```

`flushPaint` 改调 `paintInto`（图层回到纯局部坐标），直绘路径不变。修复后回归断言：

```ts
const before = findProbeRect(rightProbe.width);
expect(before).toEqual({ x: right.x, y: right.y });   // (100, 0) ✓
rightProbe.markNeedsPaint();
owner.frame();
const after = findProbeRect(rightProbe.width);
expect(after).toEqual({ x: right.x, y: right.y });    // 重录后仍 (100, 0) ✓
expect(right.x).toBe(100);                            // 防退化：偏移确非零
```

### 6.4 这场事故的通用教训（写进面试都成立）

1. **坐标系合同要写成一句话**：「图层内容 = 边界局部坐标，偏移由父在合成时补」——说不清这句话的合成代码就是下一个 2× bug；
2. **平移的归属权必须唯一**：进局部坐标系这件事只许发生一次（调用链上要么 paint 管、要么 blit 管）；
3. **黄金用例要构造「错误可见」的输入**：零偏移、零尺寸、对称布局都会把 bug 藏起来——探针必须异尺寸、偏移必须非零。

### 6.5 flushPaint 的四步状态机与三边界手算

flushPaint 不是简单的「谁脏录谁」——它是一个四步状态机，每一步都在处理一个合成陷阱：

```text
① 收集去重：pendingPaintBoundaries 里同一边界可能被报多次 → indexOf 去重
② 祖先链补偿：每个待录边界沿父链上溯，凡是重绘边界/根都标脏并入队
   （子重录后，blit 过旧内容的祖先图层过期了——不补脏，skip 条件会跳过它们）
③ 深度排序：pending 按 depth 降序（大的先录）——内层先录新内容，
   外层重录时 blit 到的才是新图层
④ 逐个录入：paintInto（局部坐标）→ layer 替换 → clearPaintDirty 整子树清脏
```

三边界树手算（root > A(边界) > flex > B(边界) > probe，probe 变脏）：

```text
上报：probe.markNeedsPaint() → 冒泡到 B（isRepaintBoundary）→ B 入队
补偿：B 的父链 flex(非边界，跳过) → A(边界) 标脏入队 → root(根) 标脏入队
     pending = [B, A, root]，去重后三个
排序：depth(B)=3 > depth(A)=2 > depth(root)=0 → 录入序 [B, A, root]
录入：B.paintInto → probe 新内容进 B.layer（局部坐标 (0,0,80,60)），B 子树清脏
     A.paintInto → 自己画 → 到 B：干净+有 layer → translate(B.x,y) blit 新 layer ✓
                → A.layer = 新内容（含 blit 命令拷贝）
     root.paintInto → 到 A：blit 新 A → 根图层最终含新探针
repaintedNodes = 3（B、A、root）；probe.paintCount = 2（只有它真的重画）
```

第 ③ 步的必要性可以直接反证：若 A 先录（旧 B 内容被 blit 进 A.layer），B 再录新内容，根最终 blit 的 A 里封着**旧 B**——新探针消失一帧，肉眼可见的「回退闪帧」。深度排序一行代码，换掉一个 race。

## 7. 手算：一帧内的录放顺序

根 + 两个边界，右边界变脏。flushPaint 的账（全绿现状）：

```text
pending = [right, root]（right 变脏上报 + 祖先链 root 标脏入队；left 干净不入队）
深度排序：right(深2) → root(深0)
1) right.paintInto → right.layer 重录（局部坐标，探针 rect (0,0,80,60)），清子树脏
2) root.paintInto → 画自己 → 到 left：干净+有 layer → translate(0,0) blit（命令数不变）
                    → 到 right：translate(100,0) blit 新 layer → 探针落 (100,0)
repaintedNodes = 2（right + root）；左子树 paintCount 不变（blit 没跑 paint 逻辑）
```

这就是 pipeline.test 其余断言的推导：`左面板变化 → repaintedNodes=2`、`右探针 paintCount 仍为 1`、`根图层命令数不变（blit 是命令拷贝）`。教学口径的诚实账本：blit 省的是「重跑子树 paint 逻辑」，不省命令数——真实框架在合成器层做图层引用，差异在第六阶段《性能度量》册里对过账。

## 8. 为什么不做 z-index

CSS 的 `z-index` 背后是**层叠上下文**：每个定位元素、每个 opacity/transform/filter 生效的元素都开启新上下文，z-index 只在上下文内比较——于是有「z-index: 9999 无效」「负 z-index 消失在父背景后」这类经典谜题，其规则复杂到需要一整章 MDN。mini-gui 的子序即 z 序：

| | 子序即 z 序 | z-index 方案 |
|---|---|---|
| 心智模型 | 一条声明序，可画可推 | 上下文嵌套 + 数值比较 |
| 「把 X 提到最上」 | 重新 appendChild（子树重挂、keyed 协调保状态） | 改数字（但可能被上下文困住） |
| 跨子树插队 | 不可能——要插队就得真的挪子 | 数字随便起 |
| 无障碍遍历序 | 声明序天然读屏合理 | z 序与读屏序脱钩，易出「视觉顺序 ≠ 朗读顺序」 |

代价要诚实：拖拽层、全局 toast 这类「任意时刻要在一切之上」的场景，子序方案必须**物理挪子**（把 toast 节点挂到根 Stack 末尾）。本框架的选择：根 Stack 就是「顶层」的显式位置——语义直白，代价是 toast 需要框架级单例入口。这是毕业项目 `Toast` 控件的第一道设计题。

### 8.1 顶层宿主落地草案（毕业项目题目）

「toast/对话框要永远在最上」的子序方案收尾：根 Stack 显式分层——

```text
根 RenderStack
├── 0. 应用内容层（导航/页面）        ← 常规布局树
├── 1. 交互浮层（下拉菜单/tooltip）   ← 挂在触发者的父 Stack，就近原则
└── 2. 全局层（toast/模态）           ← 永远 append 到最后（子序即顶）
```

规则三条：① 全局层节点由宿主持有单例入口（`pushOverlay(node)` = appendChild + markNeedsLayout）；② 关闭即 `removeChild`（keyed 协调不需要——浮层生命周期就是挂/摘）；③ 模态遮罩本身是层 2 的第一个子（遮罩 → 对话框两个子挂在同一个 Positioned 全铺锚上）。三问自查：toast 计数、同层互斥、键盘焦点归还——都是这个草案的练习题。

## 9. 对标

| mini-gui | CSS | Flutter | iOS |
|---|---|---|---|
| 子序即绘制序 | 文档流 + 层叠上下文 | `Stack(children:)` 子序即 z 序 | `addSubview` 序 |
| 子序倒序即命中序 | hit-testing 同（后画的先收） | `Stack` 的 hitTest 逆序 | 同 |
| `RenderStack` 基准尺寸 | 非定位内容撑开 | `StackFit.loose` 同构 | intrinsic size |
| `RenderPositioned` | `position:absolute` | `Positioned` | `frame` / autoresizing |
| flushPaint 深度排序 + blit | 合成器层 | RepaintBoundary + layer tree | CALayer |
| 无 z-index | z-index + 上下文 | 无（子序） | 层级整型 |

Flutter 是最贴的对标：`Stack` 的子序即 z 序、`Positioned` 的四边锚定、`RepaintBoundary` 的图层缓存——三个机制与本册一一对应，连「命中逆序」都同款。

## 10. 实跑记录

```text
$ npx vitest run src/core/render/pipeline.test.ts src/core/render/layout.test.ts src/core/events/events.test.ts
 ✓ pipeline.test.ts（含「干净边界子树被 blit 到子偏移处」——修复 paintInto 后全绿）
 ✓ layout.test.ts（Stack 基准尺寸 / Positioned 锚定）
 ✓ events.test.ts（命中测试组：命中链自底向上 / 后画的在上）
全仓：25 个测试文件 201 条断言全绿（2026-11-14）
```

本册加上前四册，五种布局算法的「纸上可算」闭环完成：Flow 的游标与装行、Grid 的轨道与前缀和、Constraint 的方程与依赖序、Absolute 的锚边算术、Stack/Z 的两序镜像。毕业项目造布局器时，按「合同类型」选算法、按「遍数」算成本、按「坐标合同一句话」防 2× 事故。
