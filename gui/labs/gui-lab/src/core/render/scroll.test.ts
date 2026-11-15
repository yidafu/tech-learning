import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { RenderBox } from "./layout-widgets";
import { RenderFlex, FlexDirection } from "./flex";
import { RenderScrollView, WHEEL_STEP_PX } from "./scroll";
import { hitTest } from "../events/hit-test";
import { PipelineOwner } from "./owner";

function buildScroll(): { scroll: RenderScrollView; rows: RenderBox[]; owner: PipelineOwner } {
  const scroll = new RenderScrollView();
  const col = new RenderFlex({ direction: FlexDirection.column });
  const rows: RenderBox[] = [];
  for (let i = 0; i < 20; i++) {
    const row = new RenderBox(280, 40, rgba(1, 1, 1));
    rows.push(row);
    col.appendChild(row);
  }
  scroll.appendChild(col);
  const owner = new PipelineOwner();
  owner.mount(scroll, { width: 300, height: 200 }, { tightRoot: true });
  owner.flushLayout();
  return { scroll, rows, owner };
}

describe("滚动视口", () => {
  it("布局：视口 300×200，内容 20×40=800", () => {
    const { scroll } = buildScroll();
    expect(scroll.size).toEqual({ width: 300, height: 200 });
    expect(scroll.maxScroll()).toBe(600);
    // 内容子被摆到 y = 0（未滚动）
    expect(scroll.children[0]!.y).toBe(0);
  });

  it("滚轮换算与夹取", () => {
    const { scroll } = buildScroll();
    scroll.handleWheel(2); // 2 格 = 80px
    expect(scroll.scrollY).toBe(80);
    scroll.handleWheel(100); // 远超上限
    expect(scroll.scrollY).toBe(600);
    scroll.handleWheel(-100); // 负向夹到 0
    expect(scroll.scrollY).toBe(0);
  });

  it("惯性衰减与边界清零", () => {
    const { scroll } = buildScroll();
    scroll.handleWheel(3); // 初速 240px/s
    const v0 = scroll.velocity;
    expect(v0).toBe(WHEEL_STEP_PX * 3 * 2);
    scroll.update(0.1); // 衰减 60%
    expect(scroll.velocity).toBeLessThan(v0);
    // 滚到底：速度清零
    scroll.scrollY = 600;
    scroll.velocity = 500;
    scroll.update(0.016);
    expect(scroll.velocity).toBe(0); // 到达边界即停
  });

  it("命中随滚动偏移：同一窗口点，滚动前后命中不同的行", () => {
    const { scroll, rows } = buildScroll();
    const row0 = rows[0]!;
    const row5 = rows[5]!;
    // 未滚动：视口顶 20px 处是 row0（内容 y 0..40）
    expect(hitTest(scroll, 150, 20).chain[0]).toBe(row0);
    // 滚 200px 后：同一窗口点变成 row5（内容 y 200..240）
    scroll.scrollBy(200);
    expect(hitTest(scroll, 150, 20).chain[0]).toBe(row5);
    // row0 已滚出视口上方，窗口内任何点都不该命中它
    expect(hitTest(scroll, 150, 199).chain[0]).not.toBe(row0);
  });

  it("滚动只改内容 y，不触发重布局", () => {
    const { scroll, owner } = buildScroll();
    const before = owner.totalPerformLayouts;
    scroll.scrollBy(120);
    expect(owner.totalPerformLayouts).toBe(before); // 没有节点重排
    expect(scroll.children[0]!.y).toBe(-120);
  });
});
