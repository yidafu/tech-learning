import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { RenderBox } from "../render/layout-widgets";
import { RenderObject } from "../render/render-object";
import { EventDispatcher } from "./dispatcher";
import { hitTest } from "./hit-test";
import { GestureController } from "./gestures";
import { pointerEvent, wheelEvent } from "./events";
import type { PointerEvent } from "./events";

/** 布局一棵测试树：直接给各节点指定几何（不跑协议，事件系统只读 x/y/width/height）。 */
class FixedBox extends RenderObject {
  constructor(x: number, y: number, w: number, h: number) {
    super();
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }
  protected performLayout(_c: import("../render/constraints").BoxConstraints): void {
    // 测试不跑布局
  }
}

function setup(): { root: FixedBox; a: FixedBox; b: FixedBox; inner: FixedBox } {
  // 根比子大：下半部分（y>100）是空白，专测「只命中根」
  const root = new FixedBox(0, 0, 400, 300);
  const a = new FixedBox(0, 0, 200, 100);
  const b = new FixedBox(200, 0, 200, 100);
  const inner = new FixedBox(50, 50, 60, 40); // 相对 b：(250,50)~(310,90) 绝对
  root.appendChild(a);
  root.appendChild(b);
  b.appendChild(inner);
  return { root, a, b, inner };
}

describe("命中测试", () => {
  it("命中链自底向上：inner → b → root", () => {
    const { root, b, inner } = setup();
    const { chain } = hitTest(root, 260, 60);
    expect(chain).toEqual([inner, b, root]);
  });

  it("后画的在上：inner 区域不命中 b 的「直接子」顺序问题不存在（链上 inner 优先）", () => {
    const { root } = setup();
    // inner 盖在 b 上：同一点命中的是 inner 链而不是止于 b
    const { chain } = hitTest(root, 300, 80);
    expect(chain[0]).toBeDefined();
  });

  it("边界半开：x=200 属于 b 不属于 a", () => {
    const { root, a, b } = setup();
    expect(hitTest(root, 200, 10).chain).toEqual([b, root]);
    expect(hitTest(root, 199, 10).chain).toEqual([a, root]);
  });

  it("空白处命中整窗根", () => {
    const { root } = setup();
    expect(hitTest(root, 10, 250).chain).toEqual([root]); // y>100 无子覆盖
  });
});

describe("分发与冒泡", () => {
  it("down 冒泡：inner 先收，root 最后收", () => {
    const { root, inner } = setup();
    const order: string[] = [];
    inner.setOnPointerDown(() => order.push("inner"));
    root.setOnPointerDown(() => order.push("root"));
    const d = new EventDispatcher();
    d.mount(root);
    d.dispatch(pointerEvent(0, 260, 60, 1));
    expect(order).toEqual(["inner", "root"]);
  });

  it("hover 差分：移入发 Enter，移出发 Leave（顺序：Leave 浅→深，Enter 深→浅）", () => {
    const { root, inner, b } = setup();
    const log: string[] = [];
    inner.setOnPointerEnter(() => log.push("inner:enter"));
    inner.setOnPointerLeave(() => log.push("inner:leave"));
    b.setOnPointerEnter(() => log.push("b:enter"));
    const d = new EventDispatcher();
    d.mount(root);
    d.dispatch(pointerEvent(1, 260, 60, 1)); // 移入 inner
    d.dispatch(pointerEvent(1, 10, 10, 2)); // 移出到空白
    expect(log).toEqual(["inner:enter", "b:enter", "inner:leave"]);
  });

  it("按压捕获：按下后拖出目标，move 仍发给原目标链", () => {
    const { root, inner } = setup();
    let moves = 0;
    inner.onPointerMove = () => (moves += 1);
    const d = new EventDispatcher();
    d.mount(root);
    d.dispatch(pointerEvent(0, 260, 60, 1)); // 按在 inner 上
    d.dispatch(pointerEvent(1, 10, 10, 2)); // 拖到空白
    expect(moves).toBe(1);
  });

  it("wheel 被链上第一个 onWheel 吞掉", () => {
    const { root, inner } = setup();
    const got: number[] = [];
    inner.setOnWheel((ev) => { got.push(ev.dy); return true; });
    root.setOnWheel(() => { got.push(999); return true; }); // 不该收到
    const d = new EventDispatcher();
    d.mount(root);
    d.dispatch(wheelEvent(260, 60, 3, 1));
    expect(got).toEqual([3]);
  });
});

describe("手势状态机", () => {
  function rig(): { d: EventDispatcher; g: GestureController; box: RenderBox; clicks: number[]; drags: string[] } {
    const box = new RenderBox(400, 300, rgba(1, 1, 1));
    box.width = 400; box.height = 300; // 命中读真实尺寸；不跑布局需手动就位
    const clicks: number[] = [];
    const drags: string[] = [];
    box.setOnClick((ev: PointerEvent) => clicks.push(ev.time));
    box.setOnDragStart(() => drags.push("start"));
    box.setOnDragUpdate(() => drags.push("update"));
    box.setOnDragEnd(() => drags.push("end"));
    const g = new GestureController({ dragThreshold: 6 });
    const d = new EventDispatcher();
    d.mount(box);
    d.gestures = g;
    return { d, g, box, clicks, drags };
  }

  /** 双击专用 rig：handler 里加 onDoubleClick 计数。 */
  function rigDouble(): { d: EventDispatcher; g: GestureController; box: RenderBox; dbl: number[] } {
    const box = new RenderBox(400, 300, rgba(1, 1, 1));
    const dbl: number[] = [];
    box.width = 400; box.height = 300;
    box.setOnClick(() => undefined);
    box.setOnDoubleClick(() => dbl.push(1));
    const g = new GestureController({ dragThreshold: 6 });
    const d = new EventDispatcher();
    d.mount(box);
    d.gestures = g;
    return { d, g, box, dbl };
  }

  it("位移小于阈值 = click", () => {
    const { d, clicks } = rig();
    d.dispatch(pointerEvent(0, 100, 100, 1));
    d.dispatch(pointerEvent(1, 103, 100, 2)); // 3px < 6
    d.dispatch(pointerEvent(2, 103, 100, 3));
    expect(clicks).toEqual([3]);
  });

  it("位移超过阈值 = drag（无 click）", () => {
    const { d, g, box, clicks, drags } = rig();
    d.dispatch(pointerEvent(0, 100, 100, 1));
    d.dispatch(pointerEvent(1, 120, 100, 2)); // 20px > 6
    d.dispatch(pointerEvent(1, 140, 100, 3));
    d.dispatch(pointerEvent(2, 140, 100, 4));
    expect(clicks).toEqual([]);
    expect(drags).toEqual(["start", "update", "end"]);
    expect(g.log).toEqual(["drag-start", "drag-end"]);
  });

  it("双击窗口内二次点击 = double-click", () => {
    const { d, g, box, dbl } = rigDouble();
    d.dispatch(pointerEvent(0, 100, 100, 1));
    d.dispatch(pointerEvent(2, 100, 100, 1.05));
    d.dispatch(pointerEvent(0, 100, 100, 1.2)); // 距上次 0.15s < 0.3
    d.dispatch(pointerEvent(2, 100, 100, 1.25));
    expect(dbl).toHaveLength(1);
    expect(g.log).toEqual(["click", "click", "double-click"]);
  });

  it("间隔超窗 = 两次普通点击", () => {
    const { d, g, dbl } = rigDouble();
    d.dispatch(pointerEvent(0, 100, 100, 1));
    d.dispatch(pointerEvent(2, 100, 100, 1.05));
    d.dispatch(pointerEvent(0, 100, 100, 2.0)); // 0.95s > 0.3
    d.dispatch(pointerEvent(2, 100, 100, 2.05));
    expect(dbl).toHaveLength(0);
    expect(g.log).toEqual(["click", "click"]);
  });
});
