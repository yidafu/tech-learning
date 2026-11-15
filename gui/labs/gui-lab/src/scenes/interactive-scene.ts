// 交互场景：按钮（hover/press/点击计数/焦点环）+ 可滚动列表。
// 阶段五 demo 树 + 无头交互测试共用的组装（纯 TS）。
import { PALETTE, lerpColor, rgba, type Color } from "../core/color";
import type { PointerEvent } from "../core/events/events";
import type { TextMeasurer } from "../core/text/measurer";
import { RenderColoredBox, RenderConstrainedBox, RenderPadding, edgeInsets } from "../core/render/layout-widgets";
import { FlexDirection, RenderFlex } from "../core/render/flex";
import { constraints } from "../core/render/constraints";
import { RenderScrollView } from "../core/render/scroll";
import { RenderText } from "../core/render/text-object";
import { PipelineOwner } from "../core/render/owner";
import { RenderObject } from "../core/render/render-object";
import type { Painter } from "../core/painter";

/** 第五阶段的临时按钮控件（第八阶段升级成正式控件库）。 */
export class RenderButton extends RenderObject {
  label: string;
  fontSize: number;
  measurer: TextMeasurer;
  hovered = false;
  pressed = false;
  /** 焦点态由宿主（FocusManager）置位，paint 时画焦点环。 */
  focused = false;

  constructor(label: string, fontSize: number, measurer: TextMeasurer, onClick?: () => void) {
    super();
    this.label = label;
    this.fontSize = fontSize;
    this.measurer = measurer;
    this.canFocus = true;
    if (onClick !== undefined) {
      this.setOnClick((_ev: PointerEvent) => onClick());
    }
  }

  // 视觉状态：直接覆写事件方法（虚分发），签名与基类严格一致
  // 视觉状态：直接覆写事件方法（虚分发），签名与基类严格一致。
  // 第六阶段起绘制走图层缓存——状态变了必须 markNeedsPaint，否则画面会「冻结」。
  onPointerEnter(_ev: PointerEvent): void {
    this.hovered = true;
    this.markNeedsPaint();
  }

  onPointerLeave(_ev: PointerEvent): void {
    this.hovered = false;
    this.pressed = false;
    this.markNeedsPaint();
  }

  onPointerDown(_ev: PointerEvent): void {
    this.pressed = true;
    this.markNeedsPaint();
  }

  onPointerUp(_ev: PointerEvent): void {
    this.pressed = false;
    this.markNeedsPaint();
  }

  protected performLayout(_c: import("../core/render/constraints").BoxConstraints): void {
    // 按文本自然尺寸 + 内边距（左右 24，上下 10）
    const textW = this.measurer.measure(this.label, this.fontSize);
    this.width = textW + 24;
    this.height = this.fontSize + 10;
  }

  protected isFixedSize(): boolean {
    return true;
  }

  protected paintSelf(p: Painter): void {
    let bg: Color = PALETTE.surface;
    if (this.pressed) bg = lerpColor(PALETTE.accent, PALETTE.surface, 0.4);
    else if (this.hovered) bg = lerpColor(PALETTE.surface, PALETTE.accent, 0.15);
    p.fillRoundedRect({ x: 0, y: 0, width: this.width, height: this.height }, 8, PALETTE.border);
    p.fillRoundedRect({ x: 1, y: 1, width: this.width - 2, height: this.height - 2 }, 7, bg);
    if (this.focused) {
      p.strokeRect({ x: -2, y: -2, width: this.width + 4, height: this.height + 4 }, 2, PALETTE.accent);
    }
    p.text(this.label, 12, 5, this.fontSize, PALETTE.text);
  }
}

export interface InteractiveScene {
  root: RenderObject;
  counter: RenderText;
  scroll: RenderScrollView;
  buttons: RenderButton[];
  owner: PipelineOwner;
  /** 点击计数（供断言/打印）。 */
  clicks: { value: number };
}

export function buildInteractiveScene(
  measurer: TextMeasurer,
  fontSize: number,
  win: { width: number; height: number },
): InteractiveScene {
  const clicks = { value: 0 };
  const counter = new RenderText([{ text: "clicked: 0" }], { fontSize, color: PALETTE.textMuted }, measurer);

  const buttons: RenderButton[] = [];
  const buttonRow = new RenderFlex({ direction: FlexDirection.row, gap: 12 });
  for (const label of ["alpha", "beta", "gamma"]) {
    const b = new RenderButton(label, fontSize, measurer, () => {
      clicks.value += 1;
      counter.setText([{ text: `clicked: ${clicks.value}` }]);
    });
    buttons.push(b);
    buttonRow.appendChild(b);
  }

  // 滚动列表：20 行（滚轮由 RenderScrollView.onWheel 覆写自处理）
  const scroll = new RenderScrollView();
  const list = new RenderFlex({ direction: FlexDirection.column, gap: 4 });
  for (let i = 0; i < 20; i++) {
    const row = new RenderText([{ text: `list item ${i + 1}` }], { fontSize, color: i % 2 === 0 ? PALETTE.text : PALETTE.textMuted }, measurer);
    list.appendChild(row);
  }
  scroll.appendChild(list);
  // 列在无界主轴下不给视口高度 → 用 ConstrainedBox 给滚动区一个有界高度
  const scrollViewport = new RenderConstrainedBox(constraints(0, win.width, 0, win.height - 140));
  scrollViewport.appendChild(scroll);

  const col = new RenderFlex({ direction: FlexDirection.column, gap: 12 });
  col.appendChild(buttonRow);
  col.appendChild(counter);
  col.appendChild(scrollViewport);

  const padding = new RenderPadding(edgeInsets(24));
  padding.appendChild(col);
  const root = new RenderColoredBox(rgba(245, 246, 248));
  root.appendChild(padding);

  const owner = new PipelineOwner();
  owner.mount(root, win, { tightRoot: true });
  owner.flushLayout();

  return { root, counter, scroll, buttons, owner, clicks };
}
