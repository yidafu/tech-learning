import { describe, expect, it } from "vitest";
import { MockMeasurer } from "../core/text/measurer";
import { keyEvent } from "../core/events/events";
import { buildWidgetsScene } from "./widgets-scene";

const m = new MockMeasurer();
const WIN = { width: 400, height: 300 };

describe("毕业控件场景", () => {
  it("万级行只挂可见池行，身份恒定", () => {
    const scene = buildWidgetsScene(m, 16, WIN, 10000);
    expect(scene.list.liveRows).toBeLessThanOrEqual(12); // 300px / 40px + 缓冲
    expect(scene.list.children.length).toBe(scene.list.liveRows);
  });

  it("TextField 焦点编辑：字符追加与删除", () => {
    const scene = buildWidgetsScene(m, 16, WIN, 10);
    scene.focus.dispatchKey(keyEvent(0, 269, 1)); // End（走焦点系统，同 app 主循环）
    scene.focus.dispatchKey(keyEvent(0, 72, 2)); // 'H'
    expect(scene.field.getText()).toBe("edit meH");
    scene.focus.dispatchKey(keyEvent(0, 259, 3)); // Backspace
    expect(scene.field.getText()).toBe("edit me");
  });

  it("frame 推进返回 repaintedNodes（惯性滚动一帧）", () => {
    const scene = buildWidgetsScene(m, 16, WIN, 500);
    const n = scene.frame(0.016);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(scene.owner.layoutPasses).toBeGreaterThan(0);
  });
});
