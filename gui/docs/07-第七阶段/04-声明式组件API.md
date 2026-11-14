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

## 工程三陷阱

把增量清单的审计眼光转成预防：下面三个坑都在「测试绿、功能对」的表象下发生，共同根因是**协调判据比开发者脑中模型少一层**。每条给触发场景、根因（带读码收据）与规避。

### 陷阱一：顶层 kind 抖动——整树重建、状态清零

- **触发场景**：卡片组件在「编辑态」包一层 padding、「预览态」换成裸 box，render 里 `return 编辑中 ? h("padding", ...) : h("box", ...)`。每切一次模式，`update()` 的第二分支 `this.root.vnode.kind !== v.kind` 命中——mount 全新树、旧渲染对象整棵丢弃（源码注释原文「挂接方负责换子」）。
- **根因**：复用判据只有「同位置同类型」一层，类型变了身份就没了——这是 §4 说过的「最小 reconcile」的边界，不是 bug；错的是拿类型开关表达「状态」，而类型比较恰恰是身份的分水岭。症状：切一次模式，输入焦点没了、正在播的动画从头再来、文本选区清空。
- **规避**：外壳 kind 恒定（永远 row/column），「模式」下沉为属性差异或子结构差异；必须跨重建存活的状态外提到信号层（[03-signals内核](03-signals内核.md)），渲染树里只挂读数。概念对照：React 的「同位置不同组件类型 → 卸载重建」是同一条规则，React 用 key/提升组件层级来绕，本教学版的绕法完全一样——**变化往属性里放，别往类型里放**。

### 陷阱二：无 key 列表按位匹配——删中间项后身份错位

- **触发场景**：column 挂一列无 key 的同类型节点（每项一个 box 包输入框），删除第 2 项。`reconcileChildren` 的匹配循环给每个新子找「第一个未用的同类型」（vdom.ts 匹配段：kind 不同跳过、任一方带 key 则必须相等），删除后新列表第 i 项对上旧列表第 i 项——第 2 项起全部前移一位错位复用。
- **根因与双层症状**：错位复用保住了「位次上的身份」，丢掉的是「语义上的身份」。第一层：错位节点的大多数属性异值 → 每段守卫都命中 → 满额 markNeedsLayout/Paint，§5 的细粒度全额退化为粗粒度（功能仍对，失效账爆表）。第二层更险：焦点、动画态活在中段渲染对象里——焦点原本在第 2 项的输入框上，删除后这个「节点身份」开始渲染第 3 项的数据，**用户看到焦点「跳」到了下一项的内容上**。
- **规避**：列表项带稳定 key（VNodeBase 上 key 字段的逐字注释「同 key 复用节点（状态保留）」就是为这里准备的）；key 忌用数组下标——删除中间项时下标整体前移，等价于无 key。匹配细节与移动语义的完整账在 [05-树协调](05-树协调.md)，本册只需要记住判据：**列表项有内部状态或会被中途增删，就必须有稳定 key**。

### 陷阱三：新增 VNode 字段忘配更新守卫——静默不生效

- **触发场景**：给 BoxVNode 加一个 borderColor 字段，mount 的 box case 里消费了它（构造时传给渲染对象），但 updateElement 的 box 分支没有加对应的那段「比较 + 赋值 + 定向标脏」。此后 render 里改 borderColor 永远不生效——不报错、不告警、测试还是绿的（测试恰好没改这个字段）。
- **根因**：本实现是**显式协调**：附录 A 的结论「新增一种节点 = mount 一个 case + update 一个 if」在字段粒度同样成立——每个新字段都要求一段更新守卫，框架没有任何「自动 diff 属性」的兜底。守卫漏项的镜像错误是无条件赋值（§5 末段提过对照实验）：功能也对，但同值属性每波更新全额标脏，失效账被静默注水。
- **规避**：评审用本册末尾的检查单第 2、3 条锁；测试用「改一个属性 → 数 markNeedsXxx 次数与通道」的失效账断言（附录 C 主题切换清单就是模板——它同时锁住「生效」与「没多标」两端）。一句话判据：**VNode 上每多一个字段，update 分支就必须多一段守卫，字段与守卫一一对应，像编译器查表一样核对**。

## 决策速查表

| 决策点 | 选项 | 选它的条件 | 避开它的条件 |
|---|---|---|---|
| 单子结构变 | reconcileChild：同 kind 原地更新、异 kind 换子 | 位置语义的容器（box/padding/expanded/boundary 的唯一孩子） | 孩子个数可能大于 1——那是列表，必须走 children + reconcileChildren |
| 列表协调 | 无 key 按位匹配 | 纯静态列表、只尾部追加、项内无焦点/动画态 | 中间插入/删除/重排——必须 key（陷阱二） |
| key 取值 | 稳定业务身份（行 id、菜单项 id） | 数据自带身份字段 | 数组下标（删除即整体错位）；随机数（每帧全换，等价每帧全重建） |
| 状态放哪 | 渲染对象内（TextLayout、focused 标志、光标） | 状态与节点同生命周期、随身份保留 | 状态要跨 kind 变化存活（主题偏好、路由态、草稿）→ 信号外提，渲染树挂读数 |
| 高频变化子树 | boundary 节点包裹 | 每帧变化的动画/进度/实时文本区 | 全静态子树——白付一层（附录 B：机制零成本，收益全来自内核） |
| 文本更新 | 改 spans 复用节点（setText 同值短路） | 同一处文案变内容：计数、HUD、标签 | 文案结构大改（字号、行数、着色全部变）——重建可读性更好，成本差异交给失效账量 |
| 更新粒度 | 属性级守卫（每字段一段 if） | 默认口径，一切新字段 | 「整个节点重建省心」——重建丢状态且首帧布局全额重付，先看附录 C 的账再选 |
| 文本样式变化 | setStyle 就地赋值（text 分支的细粒度路线） | 字号、颜色偶发变化 | 每帧都变的样式（动画着色）→ 交给 paintSelf 直读，不进描述树 |
| 事件槽更新 | 每波更新重布线（setOnClick 新闭包） | onClick 每次渲染都是新实例（§6 的账） | 「只布线一次」省调用——闭包捕获当次快照，陈旧闭包病灶随即出现 |
| 顶层结构 | kind 恒定外壳 | 会有模式切换的组件（编辑/预览） | 拿类型表达状态（陷阱一）——类型是身份分水岭，不是开关 |

## code review 检查单

审声明式层代码（新增节点类型、新增字段、列表用法）按这 9 条过，每条都对应一个本册出现过的具体病灶：

- [ ] mount 与 update 分支对称：新 kind 在 mount 有 case、在 updateElement 有对应 if，二者缺一不可（附录 A「每节点两类代码」的形状）。
- [ ] VNode 的每个字段在 update 分支有「先比较、再赋值、再定向标脏」的守卫——字段与守卫一一对应（陷阱三的病灶）。
- [ ] 失效通道对号：纯视觉属性走 markNeedsPaint（颜色），几何属性走 markNeedsLayout（尺寸/gap/inset/flex/label）——通道标错的现象是「改了不重排」或「重排了没必要」。
- [ ] 槽位不变量成立：每个 VElement 恰好一个具体类型槽非 null；update 分支槽判与 kind 判双条件齐全（`el.box !== null && v.kind === "box"` 的形状），缺一边就是拿错渲染对象。
- [ ] 列表项有稳定 key，且 key 不是数组下标、不是随机数（陷阱二）。
- [ ] 顶层 kind 会不会抖动：条件渲染是否换了外壳类型？状态是否已外提（陷阱一）。
- [ ] 回调闭包审计：onClick 每次布线新闭包（SC2003 两分支显式写的那段）——闭包体里有没有捕获「当次 render 的快照变量」？读最新值应穿过信号，不该依赖闭包里的旧局部量。
- [ ] 失效账断言：更新用例断言 markNeedsLayout/markNeedsPaint 的次数与分布（附录 C 格式），而不是只断言最终像素——次数异常就是协调逻辑的 bug 报警。
- [ ] 结构变更的重排成本：reconcileChildren 末尾是「摘完全部子再按新序挂回」（vdom.ts 重排段，保父指针的直白做法）——高频大列表是否评估过这段固定 O(n) 摘挂？可否合并多次小更新为一次 update？

## 反模式对照

| 反模式 | 症状 | 正确做法 |
|---|---|---|
| 拿类型当开关：编辑态 padding、预览态 box | 每次切换整树重建、焦点动画全丢（陷阱一） | 外壳 kind 恒定，模式走属性/子结构；跨重建状态进信号层 |
| 列表无 key 或下标当 key | 删中间项后失效账满额、焦点视觉跳项（陷阱二） | 稳定业务 key；键语义与匹配规则的细节读 [05-树协调](05-树协调.md) |
| render 里缓存 VNode 字面量复用：模块级常量树被多次 update | el.vnode 持有的是共享引用，上层一旦改字面量字段，下次 diff 的「旧值」已被污染 | 每次调用 render 造新字面量（值描述的不可变约定是 diff 正确性的前提）；共享的只有信号与渲染对象 |
| 守卫写成无条件赋值 + 无脑标脏 | 功能对但每波更新全额失效——附录 C 的 3 个 markNeedsPaint 变成 11 个 | 逐属性比较；同值零失效、异值走精确通道（§5 的粒度阶梯表） |
| 在 onClick 闭包里读捕获的局部计数 | 按钮回调永远拿到旧值（陈旧闭包） | 回调穿过信号读最新值；闭包只做转发（button 分支的包装闭包形状） |
| 用重建代替协调：dark 切换时整树 remount | 11 个渲染对象新建、首帧布局全额重付（附录 C 的重建派账单） | 增量更新 + 失效账对账；重建只留给顶层 kind 真变的那一条路 |
| update 之外旁路改渲染对象：拿到 renderRoot 直接赋属性 | 下一次比较基准错乱——渲染对象当前值与任何一版 VNode 都对不上，守卫开始漏标或多标 | 渲染对象属性只归 updateElement 写；旁路需求做成新 VNode 字段并配守卫（陷阱三的对称版） |
| boundary 满天飞：每个容器都包一层 | 图层数量膨胀，flushPaint 的祖先链失效传播与重录排序成本变长 | 只包高频变化子树（附录 B 判据）；静态树零 boundary |
| key 用内容哈希：label 一变 key 就变 | 每次内容更新都被判成「新节点」→ 全量 mount/detach、状态必丢 | key 是身份不是内容：数据行 id 与显示文案分离，文案走属性守卫更新 |

## 手算/走查配方

把 §6 的单点手算升级成「一波更新的全树增量清单」演练。场景树（首次已挂载）：`column[ text("标题"), row[ box(32×32 头像), column[ text(name), text(bio) ] ], row[ button("保存"), button("取消") ] ]`。本次更新三件事：头像改 40×40、bio 文本换内容、按钮列表头部插入 button("删除")。

1. **入口三分支**：root.kind 仍为 "column" 同类型 → 走 updateElement(root, v)，不 mount、不重建（§4 的第三分支）。
2. **容器守卫**：flex 槽命中、gap 同值短路——零失效。
3. **列表协调入口**：reconcileChildren 拿新列表 3 项对旧 3 项，无 key 按位匹配开始。
4. **标题 text**：同 kind、spans 同值 → setText 内部短路 → 零失效。
5. **头像 box**：`box.boxWidth !== v.width` 命中（32 到 40）→ 两次赋值 + markNeedsLayout；颜色同值不标 paint。通道：layout（尺寸是几何属性，§5 粒度阶梯第二行）。
6. **内层 column**：gap 同值；两个 text 子协调——name 同值零失效；bio 异值 → setText → markNeedsLayout（文本宽度可能变，父排列可能跟着变）。
7. **按钮列表（本波的关键一笔）**：旧 [保存, 取消] 对新 [删除, 保存, 取消]，无 key 按位匹配——「删除」匹配旧「保存」（同 kind，label 异值 → markNeedsLayout、onClick 重布线），「保存」匹配旧「取消」（同上再标一次），「取消」无对象可配 → mount。三个后果：两个错位节点 label 全改、两个闭包全换、多 mount 一个节点。
8. **带 key 重算第 7 步**：若三键为 保存=1、取消=2、删除=3——「保存」「取消」凭 key 原地复用、label 同值守卫全部短路，只有「删除」mount。失效账从「3 个节点标 layout + 2 个错位改写」降为「1 个 mount」。
9. **汇总对账**：无 key 版合计 3 个节点 markNeedsLayout + 1 mount + 2 次闭包重布线；有 key 版合计 2 个节点 markNeedsLayout（头像 box、bio）+ 1 mount。差的那几笔就是陷阱二第二条规避的量化收益。全波没有一笔纯 paint——本波没有纯颜色变化；若把头像改成「只换色」，账上应恰好出现一条 markNeedsPaint、layout 零条。

配方通用化（任意 update 手算五问）：①入口三分支走哪支（首挂/重建/增量）？②本轮谁被复用、谁 mount、谁 detach？③每个复用节点哪几段守卫命中、各标什么脏？④列表匹配按位还是按 key、错位几个？⑤合计 markNeedsLayout 与 markNeedsPaint 条数，与预期账差多少——差的就是 bug 或键的收益。

演练建议：拿第八阶段 widgets-scene 的真实树照五问走一遍——hud 的 setText、列表的 rebind、按钮回调的布线各算一笔账，再回附录 C 的主题切换清单核对记账格式；两轮之后「数脏」会变成读任何声明式代码时的下意识动作，评审时一眼看出哪段守卫标错了通道。

（对照锚点）第 7 步与第 8 步的差异值得背下来：按位匹配的成本是「错位数 × 全额守卫命中 + 闭包重布线」，键匹配的成本是「新增数 × mount」——列表越长、更新越频，两条成本曲线张得越开；当错位数达到列表长度（完全逆序或全量替换），按位匹配退化为全额重建，这正是 [05-树协调](05-树协调.md) 引入更聪明匹配的动机预演——先会用 key 把成本压到新增数，再谈算法层优化。

## 与真实框架对照（概念对照）

| 教学版 | React（概念对照） | Vue（概念对照） | Flutter（概念对照） | SolidJS（概念对照） |
|---|---|---|---|---|
| VNode 判别联合 | ReactElement（type + props + key） | 虚拟 DOM 节点（type/props/children） | Widget（不可变配置对象） | 编译产物：几乎无 vdom，直接建响应式节点 |
| VElement + 七个类型槽 | Fiber 节点（链表 + 双缓冲） | 组件实例与 vnode 双轨 | Element（Widget 到 RenderObject 的中间身份） | 编译期生成的所有权节点 |
| 顶层 kind 比较 + key | type 与 key 都相等才复用 | sameVnode 判断（tag + key） | canUpdate：runtimeType 与 key | 无运行时 diff：更新粒度在编译期确定 |
| 属性级守卫（先比较再标脏） | diff 阶段比较 props（引用/浅比较） | patch 阶段逐属性比较再写真实 DOM | Widget 逐字段相等判定，不等才更新 RenderObject | 信号直达属性写入，无比较层 |
| updateElement 原地赋值 | 提交阶段统一写 host 节点 | patch 直接改 DOM | Element 调 RenderObject 的更新方法 | 信号写入即终态 |

三点口径差值得写透。其一，**diff 与写入合一 vs 两阶段**：React 的协调产出待办清单、提交阶段统一落盘（可中断、可时间切片的挂点就在这两阶段之间）；教学版的 updateElement 遍历即提交——代价是没有任何中断点，收益是 358 行可整读、每一步失效当场可见。其二，**「细粒度路线（Solid 式）」的出处**就在 text 分支的源码注释里：SolidJS 靠编译把更新粒度做到属性级、没有 vdom diff；教学版的属性守卫是手写的同一思想，靠「七槽 + 每字段一段 if」达成。其三，Flutter 的 canUpdate 与本册顶层 kind 判断语义同构（类型与键都等才复用），差异只在「更新下发单位」：Flutter 到 RenderObject 还隔着一层 Element 转译，教学版的 VElement 直接持有渲染对象——第 2 册说的「与内核同构、没有翻译层」在表格的每一行都成立。
