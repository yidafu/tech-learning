// RenderObject：布局与绘制树的节点基类。
// 单遍布局协议（constraints down / size up / parent sets offset）：
//   layout(constraints) 由父调用；子类在 performLayout 里
//   「对每个 child 调 child.layout(子约束)，读 child.size，最后给 child.x/y 赋值并设自己的 size」。
//
// 失效与缓存：
//   markNeedsLayout() 自底向上冒泡，直到 relayout boundary（本子树尺寸不影响父时成立）；
//   layout() 若约束没变且不脏则直接跳过（布局缓存）。
//
// ScriptC 注意：不用 `a.b += c`（嵌套接收者复合赋值不支持）、不给 .length 赋值。
import type { Painter } from "../painter";
import type { Size } from "../geometry";
import { constrainSize, constraintsEqual, type BoxConstraints } from "./constraints";
import type { KeyEvent, PointerEvent, WheelEvent } from "../events/events";

/**
 * 第五阶段事件入口。
 * ScriptC 0.0.35 的三条实测边界决定了这里的形态（见《02-输入抽象》）：
 *   ① 类字段存函数不能直接调用 —— 所以入口做成「转发方法」（虚分发），方法体里调字段
 *   ② 可选字段（?: | undefined）的函数值没有静态表示 —— 字段一律「可空（null）」而非可选
 *   ③ 可空（null）函数字段 + 调用完全可用（probe8 实测）—— 每个事件一个独立槽位
 * 每实例行为：setOnClick/setOnKey/... 注入闭包；子类要定制则直接覆写 onXxx 方法。
 */
export abstract class RenderObject {
  parent: RenderObject | null = null;
  readonly children: RenderObject[] = [];
  /** 所属调度器（mount 时全树赋值）；边界节点的失效直接上报到这里。 */
  owner: import("./owner").PipelineOwner | null = null;

  // ---- 事件槽位（null = 无处理器；类型必须可空而非可选）----
  private fnPointerDown: ((ev: PointerEvent) => void) | null = null;
  private fnPointerMove: ((ev: PointerEvent) => void) | null = null;
  private fnPointerUp: ((ev: PointerEvent) => void) | null = null;
  private fnPointerEnter: ((ev: PointerEvent) => void) | null = null;
  private fnPointerLeave: ((ev: PointerEvent) => void) | null = null;
  private fnWheel: ((ev: WheelEvent) => boolean) | null = null;
  private fnClick: ((ev: PointerEvent) => void) | null = null;
  private fnDoubleClick: ((ev: PointerEvent) => void) | null = null;
  private fnDragStart: ((ev: PointerEvent) => void) | null = null;
  private fnDragUpdate: ((ev: PointerEvent) => void) | null = null;
  private fnDragEnd: ((ev: PointerEvent) => void) | null = null;
  private fnKey: ((ev: KeyEvent) => boolean) | null = null;

  setOnPointerDown(fn: ((ev: PointerEvent) => void) | null): void { this.fnPointerDown = fn; }
  setOnPointerMove(fn: ((ev: PointerEvent) => void) | null): void { this.fnPointerMove = fn; }
  setOnPointerUp(fn: ((ev: PointerEvent) => void) | null): void { this.fnPointerUp = fn; }
  setOnPointerEnter(fn: ((ev: PointerEvent) => void) | null): void { this.fnPointerEnter = fn; }
  setOnPointerLeave(fn: ((ev: PointerEvent) => void) | null): void { this.fnPointerLeave = fn; }
  setOnWheel(fn: ((ev: WheelEvent) => boolean) | null): void { this.fnWheel = fn; }
  setOnClick(fn: ((ev: PointerEvent) => void) | null): void { this.fnClick = fn; }
  setOnDoubleClick(fn: ((ev: PointerEvent) => void) | null): void { this.fnDoubleClick = fn; }
  setOnDragStart(fn: ((ev: PointerEvent) => void) | null): void { this.fnDragStart = fn; }
  setOnDragUpdate(fn: ((ev: PointerEvent) => void) | null): void { this.fnDragUpdate = fn; }
  setOnDragEnd(fn: ((ev: PointerEvent) => void) | null): void { this.fnDragEnd = fn; }
  setOnKey(fn: ((ev: KeyEvent) => boolean) | null): void { this.fnKey = fn; }

  onPointerDown(ev: PointerEvent): void {
    const fn = this.fnPointerDown;
    if (fn !== null) fn(ev);
  }

  onPointerMove(ev: PointerEvent): void {
    const fn = this.fnPointerMove;
    if (fn !== null) fn(ev);
  }

  onPointerUp(ev: PointerEvent): void {
    const fn = this.fnPointerUp;
    if (fn !== null) fn(ev);
  }

  onPointerEnter(ev: PointerEvent): void {
    const fn = this.fnPointerEnter;
    if (fn !== null) fn(ev);
  }

  onPointerLeave(ev: PointerEvent): void {
    const fn = this.fnPointerLeave;
    if (fn !== null) fn(ev);
  }

  /** 滚轮：返回 true = 已处理（嵌套滚动由内层先吞）。 */
  onWheel(ev: WheelEvent): boolean {
    const fn = this.fnWheel;
    if (fn !== null) return fn(ev);
    return false;
  }

  onClick(ev: PointerEvent): void {
    const fn = this.fnClick;
    if (fn !== null) fn(ev);
  }

  onDoubleClick(ev: PointerEvent): void {
    const fn = this.fnDoubleClick;
    if (fn !== null) fn(ev);
  }

  onDragStart(ev: PointerEvent): void {
    const fn = this.fnDragStart;
    if (fn !== null) fn(ev);
  }

  onDragUpdate(ev: PointerEvent): void {
    const fn = this.fnDragUpdate;
    if (fn !== null) fn(ev);
  }

  onDragEnd(ev: PointerEvent): void {
    const fn = this.fnDragEnd;
    if (fn !== null) fn(ev);
  }

  /** 键盘事件：返回 true = 已处理（冒泡止于此）。 */
  onKey(ev: KeyEvent): boolean {
    const fn = this.fnKey;
    if (fn !== null) return fn(ev);
    return false;
  }

  /** 是否可聚焦（Tab 遍历候选）。 */
  canFocus = false;
  /** 是否持有焦点（FocusManager.focusNode 同步点亮；控件据此区分聚焦态）。 */
  focused = false;

  // 布局产物：尺寸归自己，位置归父
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  needsLayout = true;
  /** 最近的布局边界（含自己）；markNeedsLayout 冒泡到此为止。 */
  relayoutBoundary: RenderObject | null = null;

  /** 观测口：performLayout 实际执行次数（测试「布局缓存」用）。 */
  layoutCount = 0;

  // ---- 命中测试（第五阶段）----
  /** 自身是否命中（局部坐标）。默认覆盖自己的盒子；非矩形控件覆盖此方法。 */
  hitTestSelf(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private _lastConstraints: BoxConstraints | null = null;

  get size(): Size {
    return { width: this.width, height: this.height };
  }

  /** 供测试与调试断言用：设置尺寸并保证在约束内。 */
  protected setSize(c: BoxConstraints, size: Size): void {
    const s = constrainSize(c, size);
    this.width = s.width;
    this.height = s.height;
  }

  // ---- 树维护 ----
  appendChild(child: RenderObject): void {
    if (child.parent !== null) {
      throw new Error("child 已有 parent（先 detach）");
    }
    this.children.push(child);
    child.parent = this;
    child.setOwnerRecursive(this.owner);
    this.markNeedsLayout();
  }

  removeChild(child: RenderObject): void {
    const idx = this.children.indexOf(child);
    if (idx < 0) return;
    this.children.splice(idx, 1);
    child.parent = null;
    this.markNeedsLayout();
  }

  clearChildren(): void {
    while (this.children.length > 0) {
      const last = this.children[this.children.length - 1];
      if (last !== undefined) this.removeChild(last);
    }
  }

  // ---- 失效传播 ----
  markNeedsLayout(): void {
    if (this.needsLayout) return; // 已脏：冒泡在第一次变脏时已发生
    this.needsLayout = true;
    if (this.relayoutBoundary === this || this.parent === null) {
      // 边界（或根）：冒泡到此为止，但必须有人记得来重排这棵子树 —— 上报 owner
      if (this.owner !== null) this.owner.scheduleLayoutBoundary(this);
      return;
    }
    this.parent.markNeedsLayout(); // 不是边界 → 传染给父（父的尺寸可能因此变）
  }

  /** 上一次 layout 收到的约束（owner 重排边界子树时复用）。 */
  get lastConstraints(): BoxConstraints | null {
    return this._lastConstraints;
  }

  // ---- 布局 ----
  /** 父调用。返回后 width/height 有效（约束内）。 */
  layout(c: BoxConstraints): void {
    const constraintsChanged = this._lastConstraints === null || !constraintsEqual(this._lastConstraints, c);
    if (!this.needsLayout && !constraintsChanged) {
      return; // 布局缓存：不脏 + 约束没变 → 直接复用
    }
    this._lastConstraints = c;
    this.needsLayout = false;
    this.layoutCount += 1;
    this.performLayout(c);
    // 尺寸兜底钳回约束（子类忘写/写错也不至于越界）
    const s = constrainSize(c, this.size);
    this.width = s.width;
    this.height = s.height;
    // 布局边界判定：本节点成为边界的条件（对标 Flutter：tight / 自身固定尺寸 / 显式）
    this.updateRelayoutBoundary(c);
    // 重排过的子树必然要重画（布局驱动绘制的级联失效）
    this.markNeedsPaint();
  }

  protected abstract performLayout(c: BoxConstraints): void;

  /** 子类可覆盖：返回「自身尺寸不随约束变化」（叶子度量型节点）。 */
  protected isFixedSize(): boolean {
    return false;
  }

  private updateRelayoutBoundary(c: BoxConstraints): void {
    const tightNow = c.minWidth === c.maxWidth && c.minHeight === c.maxHeight;
    if (tightNow || this.isFixedSize() || this.parent === null) {
      this.relayoutBoundary = this;
    } else {
      const p = this.parent;
      this.relayoutBoundary = p !== null ? p.relayoutBoundary : this;
    }
  }

  // ---- 绘制（第六阶段：绘制失效与图层合成）----
  needsPaint = true;
  /** 本节点的图层缓存（仅重绘边界持有；owner.flushPaint 填充）。 */
  layer: import("../painter").DisplayList | null = null;

  /** 绘制失效：自底向上冒泡到最近的重绘边界（或根），边界上报 owner。
   *  注意不做「已脏即停」守卫：初始态 needsPaint=true 的节点从未被调度过，
   *  早停会把它们的边界吞掉（实测踩过：首帧只重录了根）。去重在 flushPaint 做。 */
  markNeedsPaint(): void {
    this.needsPaint = true;
    let node: RenderObject = this;
    while (node.parent !== null && !node.isRepaintBoundary()) {
      node = node.parent;
      node.needsPaint = true;
    }
    if (node.owner !== null) node.owner.schedulePaintBoundary(node);
  }

  /** 重绘边界：失效在此截断，子树拥有独立图层缓存（Flutter RepaintBoundary 同宗）。 */
  isRepaintBoundary(): boolean {
    return false;
  }

  /**
   * 绘制遍历：每个节点先平移自己的 (x,y) 再画自身与子树。
   * 坐标协议与命中测试对齐：绘制局部坐标 = 窗口坐标 − Σ(祖先与自己的偏移)。
   * （修复记录：旧版只在 paintChildren 里平移自身一次，子的 x/y 从未进绘制，
   *   所有子都画在父原点——命中对、绘制错；由第五阶段分册核查时实证发现。）
   */
  paint(p: Painter): void {
    p.save();
    p.translate(this.x, this.y);
    this.paintInto(p);
    p.restore();
  }

  /**
   * 把「自身 + 子树」画进 p——调用者保证 p 的原点已对齐到本节点局部原点。
   * 分出这一层的动机（实测踩过）：flushPaint 记图层走 paint() 会把边界自己的 x/y
   * 烘进图层（图层内容必须是边界局部坐标，偏移由父在 blit 时补），
   * 父再 translate(child.x) 一次 → 双重平移，右侧面板漂到 2× 偏移处（golden 用例实抓）。
   */
  paintInto(p: Painter): void {
    if (this.clipsContent()) {
      p.clipRect({ x: 0, y: 0, width: this.width, height: this.height });
    }
    this.paintSelf(p);
    for (const child of this.children) {
      if (!child.needsPaint && child.layer !== null && child.isRepaintBoundary()) {
        // 图层合成：干净的边界子树在子偏移处重放缓存，不重画
        p.save();
        p.translate(child.x, child.y);
        p.blit(child.layer);
        p.restore();
      } else {
        child.paint(p);
      }
    }
  }

  /** 滚动视口类容器覆写为 true：裁剪自动包住整个子树，作用域由基类 save/restore 保证。 */
  protected clipsContent(): boolean {
    return false;
  }

  protected paintSelf(_p: Painter): void {
    // 默认无自绘
  }

  private setOwnerRecursive(owner: import("./owner").PipelineOwner | null): void {
    this.owner = owner;
    for (const child of this.children) {
      child.setOwnerRecursive(owner);
    }
  }

  /** owner 挂载入口（整树赋 owner）。 */
  setOwner(owner: import("./owner").PipelineOwner | null): void {
    this.setOwnerRecursive(owner);
  }
}
