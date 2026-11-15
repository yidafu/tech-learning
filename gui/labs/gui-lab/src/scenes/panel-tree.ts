// 面板组合场景：第四阶段的综合 demo 树（纯 TS，可无头黄金断言）。
// 结构：背景色盒 > 24 边距 > 列（头部行 / 主体行 / 页脚层叠）
import { PALETTE, rgba } from "../core/color";
import type { TextMeasurer } from "../core/text/measurer";
import { RenderBox, RenderColoredBox, RenderDecoratedBox, RenderPadding, edgeInsets } from "../core/render/layout-widgets";
import { CrossAxisAlign, FlexDirection, RenderExpanded, RenderFlex } from "../core/render/flex";
import { RenderPositioned, RenderStack } from "../core/render/stack";
import { RenderText } from "../core/render/text-object";
import type { RenderObject } from "../core/render/render-object";

export const PANEL_TITLE = "mini-gui layout";
export const PANEL_STATUS_W = 90;

export function buildPanelTree(measurer: TextMeasurer, fontSize: number): RenderObject {
  // 根：背景
  const root = new RenderColoredBox(PALETTE.bg);
  const pad = new RenderPadding(edgeInsets(24));
  root.appendChild(pad);

  const col = new RenderFlex({ direction: FlexDirection.column, gap: 12 });
  pad.appendChild(col);

  // ---- 头部：标题 + 弹性占位 + 状态徽标 ----
  const header = new RenderFlex({ direction: FlexDirection.row, gap: 12, crossAxisAlign: CrossAxisAlign.center });
  header.appendChild(new RenderText([{ text: PANEL_TITLE }], { fontSize, color: PALETTE.text }, measurer));
  header.appendChild(new RenderExpanded(1, new RenderBox(0, 1, PALETTE.bg))); // 弹性占位（同色不可见）
  header.appendChild(new RenderBox(PANEL_STATUS_W, 24, PALETTE.accent));
  col.appendChild(header);

  // ---- 主体：左卡片（2 份）+ 右列（1 份）----
  const body = new RenderFlex({ direction: FlexDirection.row, gap: 12 });
  const leftCard = new RenderDecoratedBox({ background: PALETTE.surface, border: PALETTE.border, radius: 10 });
  leftCard.appendChild(new RenderBox(0, 300, PALETTE.surfaceAlt));
  body.appendChild(new RenderExpanded(2, leftCard));
  body.appendChild(new RenderExpanded(1, new RenderBox(0, 300, PALETTE.surface)));
  col.appendChild(body);

  // ---- 页脚：层叠 + 右上角徽标 ----
  const footer = new RenderStack();
  footer.appendChild(new RenderBox(752, 20, PALETTE.border));
  footer.appendChild(new RenderPositioned({ right: 0, top: 0 }, new RenderBox(60, 20, PALETTE.ok)));
  col.appendChild(footer);

  return root;
}
