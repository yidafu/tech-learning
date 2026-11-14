// 文本叶子：把第三阶段的排版引擎接到 RenderObject 树上。
// isFixedSize = true：文本尺寸只由内容与 max 宽决定（自身固定尺寸型节点 → 天然布局边界）。
import type { Color } from "../color";
import type { Painter } from "../painter";
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";
import type { TextSpan, TextBlockOptions, TextLayout } from "../text/text-layout";
import { layoutText, paintText } from "../text/text-layout";
import type { TextMeasurer } from "../text/measurer";

export interface RenderTextOptions {
  fontSize: number;
  color: Color;
  maxLines?: number;
  overflow?: TextBlockOptions["overflow"];
  align?: TextBlockOptions["align"];
  lineHeightRatio?: number;
}

export class RenderText extends RenderObject {
  private spans: TextSpan[];
  private o: RenderTextOptions;
  private measurer: TextMeasurer;
  private lastLayout: TextLayout | null = null;

  constructor(spans: TextSpan[], opts: RenderTextOptions, measurer: TextMeasurer) {
    super();
    this.spans = spans;
    this.o = opts;
    this.measurer = measurer;
  }

  /** 改文本：唯一入口，自动标脏。 */
  setText(spans: TextSpan[]): void {
    this.spans = spans;
    this.markNeedsLayout();
  }

  // 当前样式（vdom 协调读写）
  get styleFontSize(): number { return this.o.fontSize; }
  get styleColor(): Color { return this.o.color; }
  get styleMaxLines(): number | undefined { return this.o.maxLines; }

  /** 原地改样式（细粒度路线：Solid 式属性就地赋值，不重建节点）。 */
  setStyle(opts: Partial<RenderTextOptions>): void {
    let changed = false;
    if (opts.fontSize !== undefined && opts.fontSize !== this.o.fontSize) { this.o.fontSize = opts.fontSize; changed = true; }
    if (opts.color !== undefined && opts.color !== this.o.color) { this.o.color = opts.color; changed = true; }
    if (opts.maxLines !== undefined && opts.maxLines !== this.o.maxLines) { this.o.maxLines = opts.maxLines; changed = true; }
    if (opts.align !== undefined && opts.align !== this.o.align) { this.o.align = opts.align; changed = true; }
    if (opts.overflow !== undefined && opts.overflow !== this.o.overflow) { this.o.overflow = opts.overflow; changed = true; }
    if (changed) this.markNeedsLayout();
  }

  protected performLayout(c: BoxConstraints): void {
    const opts: TextBlockOptions = {
      fontSize: this.o.fontSize,
      color: this.o.color,
      maxLines: this.o.maxLines,
      overflow: this.o.overflow,
      align: this.o.align,
      lineHeightRatio: this.o.lineHeightRatio,
    };
    // 有界宽度 → wrap 布局；无界 → 单行自然宽
    if (c.maxWidth !== Infinity) {
      opts.width = c.maxWidth;
    }
    this.lastLayout = layoutText(this.spans, opts, this.measurer);
    this.setSize(c, this.lastLayout.size);
  }

  protected isFixedSize(): boolean {
    return true; // 尺寸不随父约束变（只随内容与 max 宽）——布局边界成立条件之一
  }

  /** 布局结果只读访问（光标几何/测试用）。 */
  get textLayout(): TextLayout | null {
    return this.lastLayout;
  }

  protected paintSelf(p: Painter): void {
    if (this.lastLayout !== null) {
      paintText(p, this.lastLayout, 0, 0);
    }
  }
}
