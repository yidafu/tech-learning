// 层叠布局：Stack + Positioned。
// 口径：Stack 尺寸 = 非 positioned 子的最大尺寸（被约束钳制）；positioned 子按锚点四边定位，
// left+right 同时给 → 宽 = 栈宽 - left - right（top+bottom 同理）；只给一边 → 取子自然尺寸。
import type { BoxConstraints } from "./constraints";
import { loosen } from "./constraints";
import { RenderObject } from "./render-object";
import type { Alignment } from "./layout-widgets";

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

export class RenderStack extends RenderObject {
  alignment: Alignment;

  constructor(opts?: { alignment?: Alignment }) {
    super();
    this.alignment = opts?.alignment ?? { x: 0.5, y: 0.5 };
  }

  protected performLayout(c: BoxConstraints): void {
    let maxW = 0;
    let maxH = 0;

    // 先布局非 positioned 子（松约束），确定栈的基准尺寸
    for (const child of this.children) {
      if (child instanceof RenderPositioned) continue;
      child.layout(loosen(c));
      if (child.width > maxW) maxW = child.width;
      if (child.height > maxH) maxH = child.height;
    }

    const stackW = Math.min(Math.max(maxW, c.minWidth), c.maxWidth);
    const stackH = Math.min(Math.max(maxH, c.minHeight), c.maxHeight);

    // positioned 子按锚点给约束并摆位；非 positioned 子按 alignment 摆
    for (const child of this.children) {
      if (child instanceof RenderPositioned) {
        const leftRight = child.left !== null && child.right !== null;
        const topBottom = child.top !== null && child.bottom !== null;
        const childC: BoxConstraints = {
          minWidth: leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : 0,
          maxWidth: leftRight ? stackW - (child.left ?? 0) - (child.right ?? 0) : c.maxWidth,
          minHeight: topBottom ? stackH - (child.top ?? 0) - (child.bottom ?? 0) : 0,
          maxHeight: topBottom ? stackH - (child.top ?? 0) - (child.bottom ?? 0) : c.maxHeight,
        };
        child.layout(childC);
        if (child.left !== null) child.x = child.left;
        else if (child.right !== null) child.x = stackW - child.width - child.right;
        else child.x = (stackW - child.width) * this.alignment.x;
        if (child.top !== null) child.y = child.top;
        else if (child.bottom !== null) child.y = stackH - child.height - child.bottom;
        else child.y = (stackH - child.height) * this.alignment.y;
      } else {
        child.x = (stackW - child.width) * this.alignment.x;
        child.y = (stackH - child.height) * this.alignment.y;
      }
    }

    this.setSize(c, { width: stackW, height: stackH });
  }
}
