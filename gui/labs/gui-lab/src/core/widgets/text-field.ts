// 文本输入框：光标、键盘编辑、点击定位。
// 全部建立在第三阶段的光标几何（offsetToX / xToOffset）之上——
// 那两个函数当时承诺「第五阶段的输入框直接用」，兑现于此。
//
// 支持的编辑操作（教学完备集）：
//   字符输入（getKeyPressed 的可见区）· Backspace · Delete · ←→（按字符）· Home/End
//   点击定位（xToOffset 中点吸附）
// 明确不做（分册写明取舍）：选区拖拽、复制粘贴（需系统剪贴板）、IME 合成中态。
import { PALETTE, lerpColor, type Color } from "../color";
import { clamp } from "../geometry";
import type { Painter } from "../painter";
import type { BoxConstraints } from "../render/constraints";
import { RenderObject } from "../render/render-object";
import type { TextMeasurer } from "../text/measurer";
import type { KeyEvent, PointerEvent } from "../events/events";
import { layoutText, offsetToX, xToOffset, type TextLayout } from "../text/text-layout";

export interface TextFieldCallbacks {
  onChanged: ((text: string) => void) | null;
  onSubmit: ((text: string) => void) | null;
}

export class RenderTextField extends RenderObject {
  private text = "";
  private caret = 0; // 光标 offset（0..len）
  private fontSize: number;
  private measurer: TextMeasurer;
  private textLayout2: TextLayout | null = null;
  // focused 标志在基类（RenderObject）——FocusManager.focusNode 负责点亮
  /** 键码常量（raylib 数值；平台无关地写死，见 focus.ts 同款取舍）。 */
  static readonly KEY_BACKSPACE = 259;
  static readonly KEY_DELETE = 261;
  static readonly KEY_RIGHT = 262;
  static readonly KEY_LEFT = 263;
  static readonly KEY_HOME = 268;
  static readonly KEY_END = 269;
  static readonly KEY_ENTER = 257;
  static readonly KEY_KP_ENTER = 335;

  onChanged: ((text: string) => void) | null = null;
  onSubmit: ((text: string) => void) | null = null;

  constructor(fontSize: number, measurer: TextMeasurer) {
    super();
    this.fontSize = fontSize;
    this.measurer = measurer;
    this.canFocus = true;
  }

  getText(): string {
    return this.text;
  }

  setText(t: string): void {
    this.text = t;
    this.caret = clamp(this.caret, 0, t.length);
    this.markNeedsLayout();
    this.markNeedsPaint();
  }

  /** 键盘编辑（FocusManager 焦点路由调用；返回 true = 已消费）。 */
  onKey(ev: KeyEvent): boolean {
    if (!this.focused) return false;
    const code = ev.code;
    if (code === RenderTextField.KEY_BACKSPACE) {
      if (this.caret > 0) {
        const head = this.text.slice(0, this.caret - 1);
        this.text = head + this.text.slice(this.caret);
        this.caret -= 1;
        this.afterEdit();
      }
      return true;
    }
    if (code === RenderTextField.KEY_DELETE) {
      if (this.caret < this.text.length) {
        this.text = this.text.slice(0, this.caret) + this.text.slice(this.caret + 1);
        this.afterEdit();
      }
      return true;
    }
    if (code === RenderTextField.KEY_LEFT) {
      this.caret = Math.max(0, this.caret - 1);
      this.markNeedsPaint();
      return true;
    }
    if (code === RenderTextField.KEY_RIGHT) {
      this.caret = Math.min(this.text.length, this.caret + 1);
      this.markNeedsPaint();
      return true;
    }
    if (code === RenderTextField.KEY_HOME) {
      this.caret = 0;
      this.markNeedsPaint();
      return true;
    }
    if (code === RenderTextField.KEY_END) {
      this.caret = this.text.length;
      this.markNeedsPaint();
      return true;
    }
    if (code === RenderTextField.KEY_ENTER || code === RenderTextField.KEY_KP_ENTER) {
      const cb = this.onSubmit;
      if (cb !== null) cb(this.text);
      return true;
    }
    // 可打印字符：32..126（ASCII；CJK 输入走 IME，教学版不接）
    if (code >= 32 && code <= 126) {
      const ch = String.fromCharCode(code);
      this.text = this.text.slice(0, this.caret) + ch + this.text.slice(this.caret);
      this.caret += 1;
      this.afterEdit();
      return true;
    }
    return false;
  }

  private afterEdit(): void {
    this.markNeedsLayout();
    const cb = this.onChanged;
    if (cb !== null) cb(this.text);
  }

  /** 点击定位：xToOffset 中点吸附。 */
  onPointerDown(ev: PointerEvent): void {
    if (this.textLayout2 === null) return;
    // 命中坐标 → 局部坐标（沿父链减去各层偏移；与绘制烘焙同一套坐标协议）
    let wx = 0;
    let node: RenderObject | null = this;
    while (node !== null) {
      wx += node.x;
      node = node.parent;
    }
    this.caret = xToOffset(this.textLayout2, 0, ev.x - wx, this.measurer);
    this.markNeedsPaint();
  }

  private absoluteX(): number {
    let x = 0;
    let node: RenderObject | null = this;
    while (node !== null) {
      x += node.x;
      node = node.parent;
    }
    return x;
  }

  protected performLayout(c: BoxConstraints): void {
    // 高度 = 字号 + 上下内边距 20；宽度 = 约束宽或内容宽 + 左右内边距 24
    // 单行无界布局维护光标几何（offsetToX / xToOffset 的 TextLayout）
    this.textLayout2 = layoutText([{ text: this.text }], { fontSize: this.fontSize, color: PALETTE.text }, this.measurer);
    const contentW = this.textLayout2.size.width + 24;
    this.width = c.maxWidth === Number.MAX_SAFE_INTEGER || c.maxWidth === Infinity ? contentW : c.maxWidth;
    this.height = this.fontSize + 20;
  }

  protected isFixedSize(): boolean {
    return true;
  }

  protected paintSelf(p: Painter): void {
    const w = this.width;
    const h = this.height;
    // 边框：聚焦强调色，否则灰
    const border: Color = this.focused ? PALETTE.accent : PALETTE.border;
    const bg: Color = this.focused ? lerpColor(PALETTE.surface, PALETTE.accent, 0.06) : PALETTE.surface;
    p.fillRect({ x: 0, y: 0, width: w, height: h }, border);
    p.fillRect({ x: 1, y: 1, width: w - 2, height: h - 2 }, bg);
    p.text(this.text, 12, 10, this.fontSize, PALETTE.text);
    if (this.focused && this.textLayout2 !== null) {
      // 光标：光标几何求 x（12 为左内边距）
      const cx = 12 + offsetToX(this.textLayout2, 0, this.caret, this.measurer);
      p.fillRect({ x: cx, y: 8, width: 2, height: h - 16 }, PALETTE.accent);
    }
  }
}
