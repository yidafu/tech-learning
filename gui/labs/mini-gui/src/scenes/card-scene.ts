// 卡片场景：第二阶段的综合 demo 场景（纯 TS，只依赖 core，可在 Node 里做黄金断言）。
// 展示：圆角卡片、描边、嵌套裁剪的滚动列表、程序化贴图、九宫格、线与圆。
import { PALETTE, rgba, type Color } from "../core/color";
import { rect } from "../core/geometry";
import type { Painter, TextureId } from "../core/painter";

export const CARD_ROWS = 12;
export const ROW_HEIGHT = 36;
export const LIST_VIEW_W = 280;
export const LIST_VIEW_H = 220;
/** 列表视口相对左卡片原点的位置。 */
export const LIST_VIEW_POS = { x: 20, y: 56 };

export interface CardSceneState {
  /** 列表滚动偏移（像素，向下滚动为正）。 */
  scrollY: number;
  /** 列表右侧贴图（程序化棋盘格纹理）。 */
  texture: TextureId;
}

const WHITE_TINT: Color = rgba(255, 255, 255);

/** 用圆角矩形近似「描边」：先画大一圈的边框色，再画小一圈的面板色。 */
function panel(p: Painter, r: ReturnType<typeof rect>, radius: number): void {
  p.fillRoundedRect({ x: r.x - 1, y: r.y - 1, width: r.width + 2, height: r.height + 2 }, radius + 1, PALETTE.border);
  p.fillRoundedRect(r, radius, PALETTE.surface);
}

export function buildCardScene(p: Painter, state: CardSceneState, width: number, height: number): void {
  // 背景
  p.fillRect(rect(0, 0, width, height), PALETTE.bg);

  // ---- 左卡片：嵌套裁剪的滚动列表 ----
  p.save();
  p.translate(40, 60);

  panel(p, rect(0, 0, 320, 300), 12);
  p.text("scrolling list (nested clip)", 20, 16, 20, PALETTE.text);

  p.save();
  p.translate(LIST_VIEW_POS.x, LIST_VIEW_POS.y);
  p.clipRect(rect(0, 0, LIST_VIEW_W, LIST_VIEW_H)); // 列表视口：越界的行在这里被剔除
  p.fillRect(rect(0, 0, LIST_VIEW_W, LIST_VIEW_H), PALETTE.surfaceAlt);

  const contentH = CARD_ROWS * ROW_HEIGHT;
  const maxScroll = Math.max(0, contentH - LIST_VIEW_H);
  const scroll = Math.max(0, Math.min(state.scrollY, maxScroll));
  for (let i = 0; i < CARD_ROWS; i++) {
    const y = i * ROW_HEIGHT - scroll;
    p.fillRoundedRect(rect(8, y + 4, LIST_VIEW_W - 16, ROW_HEIGHT - 8), 6, i % 2 === 0 ? PALETTE.surface : PALETTE.accentSoft);
    p.text(`row ${i + 1}`, 20, y + 10, 16, PALETTE.textMuted);
  }

  p.restore(); // 恢复列表裁剪
  p.restore(); // 恢复左卡片平移

  // ---- 右卡片：贴图、九宫格、线与圆 ----
  p.save();
  p.translate(420, 60);

  panel(p, rect(0, 0, 340, 300), 12);
  p.text("texture & nine-patch", 20, 16, 20, PALETTE.text);

  // 原尺寸贴图
  p.texture(state.texture, rect(20, 56, 64, 64), WHITE_TINT);
  // 九宫格：横向拉宽（角不变形）与双向拉大
  p.ninePatch(state.texture, { left: 12, top: 12, right: 12, bottom: 12 }, rect(110, 56, 210, 64), WHITE_TINT);
  p.ninePatch(state.texture, { left: 12, top: 12, right: 12, bottom: 12 }, rect(20, 140, 300, 120), WHITE_TINT);

  // 线与圆
  p.line(20, 282, 320, 282, 2, PALETTE.border);
  p.fillCircle(44, 282, 7, PALETTE.accent);
  p.fillCircle(70, 282, 7, PALETTE.ok);

  p.restore();
}
