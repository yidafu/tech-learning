import { describe, expect, it } from "vitest";
import { StatefulPainter, DisplayList } from "../core/painter";
import {
  CARD_ROWS,
  LIST_VIEW_H,
  LIST_VIEW_POS,
  LIST_VIEW_W,
  ROW_HEIGHT,
  buildCardScene,
} from "./card-scene";

/** 与场景同规则的可见性判定：行矩形与视口相交（用于独立核算剔除数）。 */
function visibleRowsAt(scroll: number): number {
  const maxScroll = Math.max(0, CARD_ROWS * ROW_HEIGHT - LIST_VIEW_H);
  const s = Math.max(0, Math.min(scroll, maxScroll));
  let visible = 0;
  for (let i = 0; i < CARD_ROWS; i++) {
    const y = i * ROW_HEIGHT - s + 4;
    if (y < LIST_VIEW_H && y + (ROW_HEIGHT - 8) > 0) visible += 1;
  }
  return visible;
}

function recordScene(scrollY: number): { p: StatefulPainter; list: DisplayList } {
  const list = new DisplayList();
  const p = new StatefulPainter(list);
  buildCardScene(p, { scrollY, texture: 1 }, 800, 450);
  return { p, list };
}

describe("card-scene 黄金断言", () => {
  it("scroll=0：视口外 6 行被剔除，可见 6 行", () => {
    const { p, list } = recordScene(0);
    const visible = visibleRowsAt(0);
    expect(visible).toBe(6);
    expect(p.culled).toBe(CARD_ROWS - visible);
    // 行矩形（fillRoundedRect）= 左右两张卡片各 2 层 + 可见行数
    expect(list.countByOp().get("fillRoundedRect")).toBe(4 + visible);
    // 文本 = 两个标题 + 全部 12 行（文本不做包围盒剔除，只靠 scissor 裁掉）
    expect(list.countByOp().get("text")).toBe(2 + CARD_ROWS);
  });

  it("scroll=200：剔除数随滚动变化（虚拟列表的思想雏形）", () => {
    const { p, list } = recordScene(200);
    const visible = visibleRowsAt(200);
    expect(visible).toBe(7);
    expect(p.culled).toBe(CARD_ROWS - visible);
    expect(list.countByOp().get("fillRoundedRect")).toBe(4 + visible);
  });

  it("行命令的 clip 是绝对坐标的列表视口", () => {
    const { list } = recordScene(0);
    const clipped = list.commands.filter((c) => c.clip !== null);
    expect(clipped.length).toBeGreaterThan(0);
    const expected = {
      x: 40 + LIST_VIEW_POS.x,
      y: 60 + LIST_VIEW_POS.y,
      width: LIST_VIEW_W,
      height: LIST_VIEW_H,
    };
    for (const c of clipped) {
      expect(c.clip).toEqual(expected);
    }
  });

  it("全场景只发生两次裁剪切换（无裁剪 → 列表视口 → 无裁剪）", () => {
    const { list } = recordScene(0);
    expect(list.clipSwitches()).toBe(2);
  });

  it("贴图与九宫格各就各位", () => {
    const { list } = recordScene(0);
    expect(list.countByOp().get("texture")).toBe(1);
    expect(list.countByOp().get("ninePatch")).toBe(2);
  });
});
