// PipelineOwner：一帧布局的入口与观测口。
// 用法：owner.mount(root, windowSize) → 状态变化处 markNeedsLayout() → owner.flushLayout()。
// 边界内子树的缓存复用由 RenderObject.layout 自己完成（约束没变 + 不脏 → 跳过）。
import type { Size } from "../geometry";
import { DisplayList, StatefulPainter } from "../painter";
import { loose, tight } from "./constraints";
import type { RenderObject } from "./render-object";

export class PipelineOwner {
  root: RenderObject | null = null;
  rootSize: Size = { width: 0, height: 0 };
  /** 根约束是否钉死为窗口尺寸（生产宿主为 true；黄金用例常用 false 拿内容尺寸的根）。 */
  tightRoot = true;
  /** 待重排的边界子树（markNeedsLayout 冒泡到边界时上报到这里）。 */
  private pendingBoundaries: RenderObject[] = [];
  /** 待重绘的边界图层（markNeedsPaint 冒泡到重绘边界时上报到这里）。 */
  private pendingPaintBoundaries: RenderObject[] = [];

  /** 布局趟数观测口：flushLayout 实际执行 layout 的次数（测试/性能分册用）。 */
  layoutPasses = 0;
  /** 各节点 performLayout 执行次数总和（遍历树统计）。 */
  totalPerformLayouts = 0;
  /** 重绘趟数与重画节点数（性能观测口）。 */
  paintPasses = 0;
  repaintedNodes = 0;

  mount(root: RenderObject, size: Size, opts?: { tightRoot?: boolean }): void {
    this.root = root;
    this.rootSize = size;
    this.tightRoot = opts?.tightRoot ?? true;
    root.setOwner(this);
    root.markNeedsLayout();
    root.markNeedsPaint();
    this.layoutPasses = 0;
  }

  /** RenderObject 边界失效的上报入口（勿手动调用）。 */
  scheduleLayoutBoundary(node: RenderObject): void {
    this.pendingBoundaries.push(node);
  }

  /** 绘制边界失效的上报入口（勿手动调用）。 */
  schedulePaintBoundary(node: RenderObject): void {
    this.pendingPaintBoundaries.push(node);
  }

  resize(size: Size): void {
    this.rootSize = size;
    if (this.root !== null) this.root.markNeedsLayout();
  }

  flushLayout(): void {
    const root = this.root;
    if (root === null) return;
    this.layoutPasses += 1;
    root.layout(this.tightRoot ? tight(this.rootSize) : loose(this.rootSize));
    // 根没变脏时布局会被缓存跳过，但边界子树仍要按缓存约束重排
    const pending = this.pendingBoundaries;
    this.pendingBoundaries = [];
    for (const node of pending) {
      node.layout(node.lastConstraints ?? loose(this.rootSize));
    }
    this.totalPerformLayouts = this.countPerformLayouts(root);
  }

  /**
   * 绘制阶段：把脏的重绘边界子树重新记录进各自的图层缓存。
   * 正确性要点：子边界重录后，blit 过它旧内容的祖先图层也过期了——
   * 祖先链要一并标脏，并按深度「由内到外」重录（祖先 blit 到的才是新内容）。
   * 教学口径：blit 是命令拷贝不是 GPU 图层引用，省的是「重跑子树的 paint 逻辑」，
   * 不省命令数——真实框架在合成器层做引用（见《06-性能度量》的诚实账本）。
   */
  flushPaint(): void {
    const root = this.root;
    if (root === null) return;
    this.paintPasses += 1;
    this.repaintedNodes = 0;

    const pending: RenderObject[] = [];
    const queued = this.pendingPaintBoundaries;
    this.pendingPaintBoundaries = [];
    for (const node of queued) {
      if (pending.indexOf(node) < 0) pending.push(node);
    }
    // 祖先链失效传播：blit 过旧内容的边界/根要标脏并入队（否则 skip 条件会跳过它们）
    for (const node of queued) {
      let a = node.parent;
      while (a !== null) {
        if (a.isRepaintBoundary() || a === root) {
          a.needsPaint = true;
          if (pending.indexOf(a) < 0) pending.push(a);
        }
        a = a.parent;
      }
    }
    if ((root.needsPaint || root.layer === null) && pending.indexOf(root) < 0) {
      pending.push(root);
    }

    // 深度大的先录（内层边界先更新，外层 blit 到新内容）
    pending.sort((a, b) => this.depthOf(b) - this.depthOf(a));
    for (const node of pending) {
      if (!node.needsPaint && node.layer !== null) continue;
      const list = new DisplayList();
      const painter = new StatefulPainter(list);
      node.paintInto(painter); // 图层是局部坐标（父在 blit 时补偏移；走 paint() 会烘进自己的 x/y）
      node.layer = list;
      this.clearPaintDirty(node); // 这次记录覆盖了整棵子树的脏
      this.repaintedNodes += 1;
    }
  }

  private depthOf(node: RenderObject): number {
    let d = 0;
    let n = node.parent;
    while (n !== null) {
      d += 1;
      n = n.parent;
    }
    return d;
  }

  private clearPaintDirty(node: RenderObject): void {
    node.needsPaint = false;
    for (const child of node.children) {
      this.clearPaintDirty(child);
    }
  }

  /** 一帧的完整流水线：布局 → 绘制。宿主每帧调用。 */
  frame(): void {
    this.flushLayout();
    this.flushPaint();
  }

  /** 自根向下统计本棵树累计的 performLayout 次数（观测口）。 */
  countPerformLayouts(node: RenderObject): number {
    let sum = node.layoutCount;
    for (const child of node.children) {
      sum += this.countPerformLayouts(child);
    }
    return sum;
  }
}
