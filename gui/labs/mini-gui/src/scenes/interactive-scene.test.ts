import { describe, expect, it } from "vitest";
import { MockMeasurer } from "../core/text/measurer";
import { EventDispatcher } from "../core/events/dispatcher";
import { GestureController } from "../core/events/gestures";
import { FocusManager, KEY_TAB } from "../core/events/focus";
import { keyEvent, pointerEvent, wheelEvent } from "../core/events/events";
import { DisplayList, StatefulPainter } from "../core/painter";
import { buildInteractiveScene } from "./interactive-scene";

const m = new MockMeasurer();
const WIN = { width: 400, height: 300 };

/** fontSize 10 → 每字符 6px；按钮 = 文本宽 + 24、高 = 10 + 10。 */
function rig() {
  const scene = buildInteractiveScene(m, 10, WIN);
  const dispatcher = new EventDispatcher();
  dispatcher.mount(scene.root);
  dispatcher.gestures = new GestureController();
  const focus = new FocusManager();
  focus.mount(scene.root);
  return { scene, dispatcher, focus };
}

describe("interactive-scene 无头交互", () => {
  it("布局：按钮行/计数/滚动视口都就位，滚动区有界", () => {
    const { scene } = rig();
    const alpha = scene.buttons[0]!;
    // alpha：5 字符 ×6 + 24 = 54 宽，20 高
    expect(alpha.size).toEqual({ width: 54, height: 20 });
    // 绝对位置沿链累加：root(0) + ColoredBox→padding(0) + padding→col(24,24) + col→row(0) + row→alpha(0) = 24
    const pad = scene.root.children[0]!;
    const col = pad.children[0]!;
    const row = col.children[0]!;
    expect(pad.x + col.x + row.x + alpha.x).toBe(24);
    expect(pad.y + col.y + row.y + alpha.y).toBe(24);
    // 滚动视口有界（300-140=160），内容 20 行 > 视口 → maxScroll > 0
    expect(scene.scroll.maxScroll()).toBeGreaterThan(0);
  });

  it("点击 alpha：计数 +1", () => {
    const { scene, dispatcher } = rig();
    dispatcher.dispatch(pointerEvent(0, 50, 34, 1)); // 按在 alpha 上
    dispatcher.dispatch(pointerEvent(2, 50, 34, 1.05));
    expect(scene.clicks.value).toBe(1);
    dispatcher.dispatch(pointerEvent(0, 50, 34, 2));
    dispatcher.dispatch(pointerEvent(2, 50, 34, 2.05));
    expect(scene.clicks.value).toBe(2);
  });

  it("拖拽（超过阈值）不触发点击", () => {
    const { scene, dispatcher } = rig();
    dispatcher.dispatch(pointerEvent(0, 50, 34, 1));
    dispatcher.dispatch(pointerEvent(1, 120, 34, 1.1)); // 70px ≫ 6
    dispatcher.dispatch(pointerEvent(2, 120, 34, 1.2));
    expect(scene.clicks.value).toBe(0);
  });

  it("hover：移入按钮变 hover 态，移出还原", () => {
    const { scene, dispatcher } = rig();
    const beta = scene.buttons[1]!;
    dispatcher.dispatch(pointerEvent(1, 100, 34, 1)); // beta 起点约 (90,24)
    expect(beta.hovered).toBe(true);
    dispatcher.dispatch(pointerEvent(1, 10, 250, 2)); // 移到空白
    expect(beta.hovered).toBe(false);
  });

  it("Tab 在三个按钮间循环", () => {
    const { scene, focus } = rig();
    expect(focus.focusableCount()).toBe(3);
    focus.dispatchKey(keyEvent(0, KEY_TAB, 1));
    expect(focus.focused).toBe(scene.buttons[0]);
    focus.dispatchKey(keyEvent(0, KEY_TAB, 2));
    expect(focus.focused).toBe(scene.buttons[1]);
    focus.dispatchKey(keyEvent(0, KEY_TAB, 3));
    focus.dispatchKey(keyEvent(0, KEY_TAB, 4));
    expect(focus.focused).toBe(scene.buttons[0]); // 循环
  });

  it("滚轮在列表上滚动（dy=2 → 80px）", () => {
    const { scene, dispatcher } = rig();
    const before = scene.scroll.scrollY;
    dispatcher.dispatch(wheelEvent(200, 200, 2, 1)); // 列表区域
    expect(scene.scroll.scrollY).toBe(before + 80);
  });

  it("整树绘制：3 按钮 ×2 层圆角 + 24 条 text（20 行 + 3 个按钮 label + 计数）+ 背景", () => {
    const { scene } = rig();
    scene.owner.flushLayout();
    const list = new DisplayList();
    const painter = new StatefulPainter(list);
    scene.root.paint(painter);
    const counts = list.countByOp();
    expect(counts.get("fillRoundedRect")).toBe(6); // 每按钮描边层+背景层
    expect(counts.get("text")).toBe(24);
    expect(counts.get("fillRect")).toBeGreaterThanOrEqual(1); // 背景 + 滚动条
  });
});
