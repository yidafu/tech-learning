# 声明式组件 API：VNode、挂载与原地更新

> [返回：第七阶段导览](01-导览.md)
> 对应大纲条目：第七阶段 3（函数组件、h() 构建、最小 reconcile）。
> 本册走读 `core/reactive/vdom.ts`（358 行）的上半部：VNode 值描述、VElement 协调节点、mount 全量挂载、updateElement 原地更新。树协调（keyed 列表）留给《05》。全部断言来自 `vdom.test.ts` 9 条实跑（2026-11-14）。读完你应当能手推「一次 update 的增量清单」：哪个渲染对象标了哪个脏、哪些节点原样复用。

## 1. 三棵树：把第四阶段砍掉的 Element 补回来

第四阶段立过「两棵树」的分层（Widget 值描述 / RenderObject 可变渲染）。本阶段在中间补回第三棵——**协调树**：

```text
VNode        值描述（不可变；kind + 参数；一次 render() 的产物）
   ↓ mount/updateElement
VElement     协调节点（有身份；包住一个 RenderObject + 记它的具体类型槽）
   ↓ appendChild
RenderObject 渲染树（真正的布局/绘制载体；第四阶段的老朋友）
```

VNode 是「这次想长什么样」，VElement 是「上次长成了什么样、这次哪些变了」，RenderObject 是「实际画出来的东西」。**Element 的身份性**是声明式的全部秘密：状态（焦点、动画、输入中的文本）活在渲染对象/状态槽里，diff 的本质是「哪些身份能保留」。这就是第四册「为什么是两棵树」里埋的欠条——「Element 树在需要增量更新时再补」，本册兑现。

VElement 的结构（逐字）：

```ts
export class VElement {
  vnode: VNode;
  node: RenderObject;
  parent: VElement | null = null;
  children: VElement[] = [];
  // 具体类型槽（构建时恰好一个非 null；协调据此分发，零向下转型）
  box: RenderBox | null = null;
  text: RenderText | null = null;
  flex: RenderFlex | null = null;
  pad: RenderPadding | null = null;
  expanded: RenderExpanded | null = null;
  boundary: RenderRepaintBoundary | null = null;
  button: RenderButton | null = null;
}
```

七个具体类型槽是 ScriptC 约束下的精心设计：`node` 字段是通用引用（append/remove 够用），具体更新要调 RenderBox 特有方法（`boxWidth` 赋值、`setText`）——**必须拿到具体类型**。TS 惯用 `as` 下行，ScriptC 实测 SC1090（类值 as 转换不支持）；解法是**构建时**把具体引用存进类型化字段，更新时按槽分发——「零向下转型」的注释就钉在这里。槽位「恰好一个非 null」是构建函数保证的不变量。

## 2. VNode：判别联合 + 可选 key

七种 VNode（逐字段）：

| kind | 字段 | 渲染对象 | 单子/多子 |
|---|---|---|---|
| `box` | width/height/color + child? | RenderBox | 单子 |
| `text` | spans/fontSize/color/maxLines? | RenderText | 叶子 |
| `row` / `column` | gap + children[] | RenderFlex | 多子 |
| `padding` | inset + child | RenderPadding | 单子 |
| `expanded` | flex + child | RenderExpanded | 单子 |
| `boundary` | child | RenderRepaintBoundary | 单子 |
| `button` | label/onClick | RenderButton（交互场景的控件） | 叶子 |

`key?: number`（VNodeBase 上，逐字注释）：「列表协调键：同 key 复用节点（状态保留）；缺省按『第一个未用的同类型』匹配」。key 只在《05》的列表协调里被消费，单子路径不看它。

教学版刻意不做的：无 `h()` 辅助函数（直接对象字面量，TS 字面量推断就是类型检查器）、无函数组件抽象（render() 就是组件函数）、无 Context/插槽。**render() 函数 + VNode 字面量已经是完整的声明式**——h() 只是糖，不是机制。

## 3. mount：全量挂载的流水线

mount 的骨架（逐字要点）：

```ts
function mount(v: VNode, parent: VElement | null, m: TextMeasurer): VElement {
  let el: VElement;
  switch (v.kind) {
    case "box": {
      const box = new RenderBox(v.width, v.height, v.color);
      el = new VElement(v, box);
      el.box = box;          // ← 具体引用进槽：后续更新免下行转型
      break;
    }
    case "text": { ... el.text = text; break; }
    case "row":
    case "column": { ... el.flex = flex; break; }
    ...
  }
  el.parent = parent;
  // 子挂载
  if (v.kind === "box" && v.child !== undefined) attachChild(el, v.child, m);
  else if (v.kind === "padding") attachChild(el, v.child, m);
  ...
  else if (v.kind === "row" || v.kind === "column") {
    for (const c of v.children) attachChild(el, c, m);
  }
  return el;
}

function attachChild(el: VElement, v: VNode, m: TextMeasurer): void {
  const child = mount(v, el, m);      // 递归挂载子描述
  el.children.push(child);
  el.node.appendChild(child.node);    // 挂上渲染树
}
```

读法要点：**mount = 构造渲染对象 + 填类型槽 + 递归挂子**。深度优先，每个 VNode 恰好产生一个渲染对象——「描述树」与「渲染树」在挂载期一一对应。`expanded` 的 `placeholderLeaf()` 是一处小取舍（逐字注释）：「Expanded 构造时需要先有一个子占位（随后立即被 attachChild 替换）」——RenderExpanded 的构造函数要求非空子（框架惯例：无子节点没有布局语义），先塞一个透明 0×0 盒再立刻替换。多余的一次构造换构造函数签名简单，教学版买这个单。

## 4. update：入口的分派

Component.update（逐字）：

```ts
  update(v: VNode): RenderObject {
    if (this.root === null) {
      this.root = mount(v, null, this.measurer);      // 首次：全量挂载
      this.renderRoot = this.root.node;
      return this.root.node;
    }
    if (this.root.vnode.kind !== v.kind) {
      // 顶层类型变化：整树重建（挂接方负责换子；这里直接替换 root）
      this.root = mount(v, null, this.measurer);
      this.renderRoot = this.root.node;
      return this.root.node;
    }
    updateElement(this.root, v, this.measurer);       // 同类型：增量更新
    this.root.vnode = v;
    return this.root.node;
  }
```

三分支：首挂全量、顶层类型变了整树重建（旧渲染对象被整棵丢弃——调用方把它从父上摘下换新的，注释写明「挂接方负责换子」）、同类型走增量。**顶层类型比较是「最小 reconcile」的全部判断逻辑**：同 kind → 原地更新（§5），异 kind → 重建。React 的「同位置同类型复用」规则在这里以最简形式落地。

## 5. updateElement：细粒度原地更新的七个分支

核心更新函数按槽分发（逐字摘三个代表分支）：

```ts
function updateElement(el: VElement, v: VNode, m: TextMeasurer): void {
  el.vnode = v;
  if (el.box !== null && v.kind === "box") {
    const box = el.box;
    if (box.boxWidth !== v.width || box.boxHeight !== v.height) {
      box.boxWidth = v.width;          // 尺寸变 → markNeedsLayout
      box.boxHeight = v.height;
      box.markNeedsLayout();
    }
    if (box.color !== v.color) {
      box.color = v.color;             // 颜色变 → 只 markNeedsPaint（不动布局）
      box.markNeedsPaint();
    }
    reconcileChild(el, v.child ?? null, m);
    return;
  }
  if (el.text !== null && v.kind === "text") {
    const text = el.text;
    // 细粒度路线（Solid 式）：样式就地赋值（setStyle 内部同值短路），不重建节点
    text.setStyle({ fontSize: v.fontSize, color: v.color });
    if (v.maxLines !== undefined) text.setStyle({ maxLines: v.maxLines });
    text.setText(v.spans);             // setText 内部同值短路 + markNeedsLayout
    return;
  }
  if (el.flex !== null && (v.kind === "row" || v.kind === "column")) {
    const flex = el.flex;
    if (flex.gap !== v.gap) {
      flex.gap = v.gap;
      flex.markNeedsLayout();
    }
    reconcileChildren(el, v.children, m);   // 列表走《05》
    return;
  }
  ... // padding / expanded / boundary / button 同构
}
```

三个层次的更新粒度，值得排成一张表（这就是「细粒度」的定量含义）：

| 变化 | 框架动作 | 失效通道 | 节点成本 |
|---|---|---|---|
| 颜色 | 就地赋值 + markNeedsPaint | paint（重绘边界内） | 1 个渲染对象 |
| 尺寸/gap/flex/inset | 比较后赋值 + markNeedsLayout | layout → 级联 paint | 1 个节点 + 其边界子树 |
| 文本内容 | setText（内部同值短路） | layout | 1 个文本叶子 |
| 结构（类型变/增删/移动） | 重建或 reconcile | layout | 受影响子树 |

「先比较再标脏」的三连写（width、color、gap……每个属性一段 if）看着啰嗦，正是第二册说的「框架标脏标得准」：同值属性零失效、异值属性精确通道。第七阶段的「细粒度」不是靠信号黑魔法，而是靠**属性级的赋值守卫**——信号只负责「该调 updateElement 了」，减量靠这层比较。

**button 分支的一处 ScriptC 印记**（逐字注释保留）：「不写三元压缩：SC2003 对『(unknown)=>void | null』联合重标记报错，两分支显式写」——onClick 的 null/非 null 两个分支显式 setOnClick(null) / setOnClick(包装闭包)。第七册的 ScriptC 边界清单又添一条实锤。

## 6. 手算：一次 update 的增量清单

给定首次挂载后的树：`row[ button"-", button"+", text"count: 0" ]`，状态变更后新描述 `row[ button"-", button"+", text"count: 1" ]`。手推 `comp.update(v)`：

```text
1. root.kind = "row" === 新.kind → 走 updateElement(root, v)
2. el.flex 槽命中，v.kind = "row" ✓
3. gap: 12 === 12 → 不标脏（同值守卫）
4. reconcileChildren(root, [btn-, btn+, text1]) → 《05》
   - btn-: 同 kind + 无 key → 按位匹配 → updateElement(btn-, v-btn)
     → button 分支：label "-" === "-" 不动；onClick 是新闭包 → setOnClick(包装)
   - btn+: 同上，label "+" === "+"
   - text: updateElement(textEl, "count: 1")
     → setText(["count: 1"])：内部与旧 spans 比较 → 异值 → markNeedsLayout
5. 本轮失效账：1 个文本叶子标 layout（按钮回调闭包更新不算失效）
```

**净效果：树里 3 个节点全部保留身份，只有 1 个文本叶子的文本变了。**对照第五阶段命令式写法——同样的效果要手工 setText + markNeedsLayout 两行；声明式把「改哪、标什么」全部收敛在 updateElement 的守卫逻辑里。

## 7. 测试与对照

vdom.test.ts 的上半部断言（实跑 2026-11-14，9/9 绿）：

```text
✓ 构建 → 文本更新原地复用（节点身份不变）      —— setText 后 el.text 引用相同
✓ 顶层类型变化 → 重建                          —— row 换 column 整树新身份
✓ 样式变化（字号）→ 原地更新；颜色不变时文本变化 → 复用
✓ 按钮的 onClick 布线                          —— null/闭包两分支都断言
✓ 嵌套结构增量更新（padding→box 尺寸变化只 markNeedsLayout）
```

| 机制 | mini-gui | React（react 站复刻） | Flutter |
|---|---|---|---|
| 描述对象 | VNode 判别联合 | ReactElement | Widget（immutable） |
| 协调节点 | VElement（手写类型槽） | Fiber 节点 | Element（泛型 + 工厂） |
| 复用判据 | 顶层 kind（+key《05》） | type + key | runtimeType + key |
| 更新方式 | 就地赋值 + 精确标脏 | setState → 子树重渲 → diff | setState → build → diff |
| 属性守卫 | 显式 if 比较 | diff 层比较 props | Widget == 判定（不可变对象引用比较） |

「顶层 kind 比较」与 React 的「type 比较」同构；差异在**更新下发单位**——React 到达 DOM 还要再走一层 host diff，本实现直接在 VElement 上就地赋值（因为渲染对象本来就是可变的保留模式节点）。这就是第 2 册说的「与内核同构」：diff 终点即内核节点，没有翻译层。

## 8. 本册小结

- 三棵树：VNode（值）/ VElement（协调身份）/ RenderObject（渲染载体）——第四阶段的欠条「Element 树」以最小形态兑现
- VElement 七个类型槽是 SC1090（禁 as 下行）约束下的设计：构建时存具体引用，更新按槽分发，零向下转型
- mount = 构造 + 填槽 + 递归挂子；expanded 的 placeholderLeaf 是「非空子约束 vs 多一次构造」的小取舍
- update 三分支：首挂全量 / 顶层 kind 变化整树重建 / 同 kind 增量——「最小 reconcile」的全部判断就这一层
- updateElement 的粒度阶梯：颜色→paint、尺寸/gap→layout、文本→setText、结构→reconcile；「先比较再标脏」是细粒度的物理载体
- 手算增量清单：三个节点全保身份、仅 1 个文本叶子失效——声明式的收益在这里是可数的
- ScriptC 印记 +1：SC2003 联合重标记 → onClick 两分支显式写（源码注释原文保留）

## 自测

1. 三棵树各自的「身份」是什么？状态（焦点/动画）活在哪棵树上，diff 保身份为什么等价于保状态？
2. 类型槽方案如果换成「Map<kind, RenderObject>」或「as 下行」，分别会撞哪条边界/损失什么？
3. 手推：把 §6 的树中 "+" 按钮换成 "×"（同 kind、label 变），增量清单是什么？换成 padding（异 kind）呢？
4. updateElement 为什么每个属性都要 if 比较？把守卫去掉（无条件赋值+标脏）功能还对吗？代价出现在哪个实测数字上？
5. button 的 onClick 闭包每次 render 都是新实例——为什么按钮失效账里没有它？（对照 setText 的同值短路，闭包比较为什么不适用？）
6. 「顶层类型变化整树重建」——状态全丢。React 用什么机制救这个？教学版缺这个机制意味着什么使用约束？

## 附录 A：其余四个 update 分支摘录

padding / expanded / boundary / button（逐字，配一句要点）：

```ts
  if (el.pad !== null && v.kind === "padding") {
    const pad = el.pad;
    if (pad.insets.left !== v.inset) {        // 只比较 left？inset 四边同值的简写约定
      pad.insets = edgeInsets(v.inset);
      pad.markNeedsLayout();
    }
    reconcileChild(el, v.child, m);
    return;
  }
  if (el.expanded !== null && v.kind === "expanded") {
    const exp = el.expanded;
    if (exp.flex !== v.flex) {
      exp.flex = v.flex;
      exp.markNeedsLayout();
    }
    reconcileChild(el, v.child, m);
    return;
  }
  if (el.boundary !== null && v.kind === "boundary") {
    reconcileChild(el, v.child, m);           // 边界无参数：只协调子
    return;
  }
  if (el.button !== null && v.kind === "button") {
    const btn = el.button;
    if (btn.label !== v.label) {
      btn.label = v.label;
      btn.markNeedsLayout();                  // 文本变宽 → 布局通道
    }
    const click = v.onClick;                  // SC2003：两分支显式写（原文注释）
    if (click === null) {
      btn.setOnClick(null);
    } else {
      btn.setOnClick((_ev: PointerEvent) => { click(); });
    }
    return;
  }
```

branch 数 = VNode kind 数——**新增一种节点 = mount 一个 case + update 一个 if**。这个「每节点两类代码」的形状是显式协调的代价（React 用 host config 集中同类逻辑），教学版选平铺直书——每个分支 15 行内、全文 358 行可整读。

## 附录 B：boundary 分支与重绘边界的组合

boundary VNode 没有参数要更新（RenderRepaintBoundary 是透明容器），它的价值在**声明处**：把「这块子树高频变化」写进描述里——

```ts
h("boundary", {}, h("column", ...动画内容...))
```

第六册的收益算术（边界隔离变更辐射）在声明式层的使用形态就是这一个节点。挂载期它 new RenderRepaintBoundary()、更新期只 reconcileChild——机制零成本，收益全部来自内核已有的重绘边界。这是「声明式层是内核的薄皮」的又一证据：七种节点没有一个引入新的渲染机制，全部映射到第四~六阶段已有的渲染对象。

## 附录 C：主题切换的增量清单（第二例）

§6 手算过计数文本；这里算主题切换（dark.set(true) 后的粗粒度波）：新树 `row[ 6×button, column[ 3×text(DARK.muted) ] ]`，旧树同结构 LIGHT 色：

```text
6 个 button：label 同值短路 → 不标脏；onClick 新闭包 → setOnClick 布线（不标脏）
3 个 text：同 keyFor 复用 → setText(同文本短路) + setStyle(color: DARK.muted → 异值 → markNeedsPaint)
row/column 容器：gap 同值 → 不标脏
合计：3 个文本叶子 markNeedsPaint（颜色通道），0 个 markNeedsLayout，0 个节点重建
```

对照「重建派」（dark 变化时整树 dispose+remount）：六按钮+三文本+容器 ≈ 11 个渲染对象全部新建、首帧布局全额重付、焦点/动画态全丢。增量清单是「声明式层做得对」的可数证明——每波更新后数一数 markNeedsXxx 的次数与分布，超出预期的就是协调逻辑的 bug。
