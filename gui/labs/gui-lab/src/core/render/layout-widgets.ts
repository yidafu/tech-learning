// 基础布局器：Padding / ConstrainedBox / SizedBox / Align / ColoredBox / DecoratedBox。
// 每个类只做一件事：改写传给子的约束，或决定子在自己的尺寸里怎么摆。
import type { Color } from "../color";
import { PALETTE } from "../color";
import type { Size } from "../geometry";
import type { Painter } from "../painter";
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";
import { deflate, enforce, loosen, tight } from "./constraints";

export interface EdgeInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function edgeInsets(all: number): EdgeInsets {
  return { left: all, top: all, right: all, bottom: all };
}

/** 缩进：子的约束四边收缩，自己尺寸 = 子 + insets。 */
export class RenderPadding extends RenderObject {
  constructor(public insets: EdgeInsets) {
    super();
  }

  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, {
        width: this.insets.left + this.insets.right,
        height: this.insets.top + this.insets.bottom,
      });
      return;
    }
    child.layout(deflate(c, this.insets));
    child.x = this.insets.left;
    child.y = this.insets.top;
    this.setSize(c, {
      width: this.insets.left + child.width + this.insets.right,
      height: this.insets.top + child.height + this.insets.bottom,
    });
  }
}

/** 附加约束：把「我想要的区间」与父约束取交后传子（min 取大、max 取小）。 */
export class RenderConstrainedBox extends RenderObject {
  constructor(public extra: BoxConstraints) {
    super();
  }

  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    const effective = enforce(this.extra, c);
    if (child === undefined) {
      this.setSize(c, { width: effective.maxWidth, height: effective.maxHeight });
      return;
    }
    child.layout(effective);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}

/** 固定尺寸盒子：给子紧约束。 */
export class RenderSizedBox extends RenderObject {
  boxSize: Size;

  constructor(size: Size) {
    super();
    this.boxSize = size;
  }

  protected performLayout(c: BoxConstraints): void {
    const effective = enforce(tight(this.boxSize), c);
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, this.boxSize);
      return;
    }
    child.layout(effective);
    child.x = 0;
    child.y = 0;
    this.setSize(c, this.boxSize);
  }
}

export interface Alignment {
  x: number; // 0 = 左对齐，1 = 右对齐
  y: number;
}

/** 对齐：子取自己的自然尺寸（松约束），在可用空隙里按比例摆位。 */
export class RenderAlign extends RenderObject {
  constructor(public alignment: Alignment) {
    super();
  }

  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: c.maxWidth, height: c.maxHeight });
      return;
    }
    // 子先取自然尺寸（松约束：min 归零、max 继承）
    child.layout(loosen(c));
    // 自己：约束有界就填满；无界（如被 unconstrained 包着）就贴子
    const ownW = c.maxWidth === Infinity ? child.width : c.maxWidth;
    const ownH = c.maxHeight === Infinity ? child.height : c.maxHeight;
    const slackX = Math.max(0, ownW - child.width);
    const slackY = Math.max(0, ownH - child.height);
    child.x = slackX * this.alignment.x;
    child.y = slackY * this.alignment.y;
    this.setSize(c, { width: ownW, height: ownH });
  }
}

/** 纯色背景（尺寸 = 子）。 */
export class RenderColoredBox extends RenderObject {
  constructor(public color: Color) {
    super();
  }

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

  protected paintSelf(p: Painter): void {
    p.fillRect({ x: 0, y: 0, width: this.width, height: this.height }, this.color);
  }
}

/** 装饰盒：圆角背景 + 描边（双层圆角近似，见第二阶段）。 */
export class RenderDecoratedBox extends RenderObject {
  background: Color;
  borderColor: Color;
  radius: number;

  constructor(opts?: { background?: Color; border?: Color; radius?: number }) {
    super();
    this.background = opts?.background ?? PALETTE.surface;
    this.borderColor = opts?.border ?? PALETTE.border;
    this.radius = opts?.radius ?? 8;
  }

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

  protected paintSelf(p: Painter): void {
    const r = { x: 0, y: 0, width: this.width, height: this.height };
    p.fillRoundedRect({ x: r.x - 1, y: r.y - 1, width: r.width + 2, height: r.height + 2 }, this.radius + 1, this.borderColor);
    p.fillRoundedRect(r, this.radius, this.background);
  }
}

/** 测试/调试用叶子：固定尺寸的色块（黄金用例的万能积木）。 */
export class RenderBox extends RenderObject {
  constructor(public boxWidth: number, public boxHeight: number, public color: Color = PALETTE.accent) {
    super();
  }

  protected performLayout(c: BoxConstraints): void {
    this.setSize(c, { width: this.boxWidth, height: this.boxHeight });
  }

  protected isFixedSize(): boolean {
    return true;
  }

  protected paintSelf(p: Painter): void {
    p.fillRect({ x: 0, y: 0, width: this.width, height: this.height }, this.color);
  }
}
