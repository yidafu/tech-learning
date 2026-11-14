import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { tight } from "./constraints";
import { PipelineOwner } from "./owner";
import { RenderObject } from "./render-object";
import { RenderBox, RenderPadding, RenderSizedBox, RenderAlign, edgeInsets } from "./layout-widgets";
import { CrossAxisAlign, FlexDirection, MainAxisAlign, RenderExpanded, RenderFlex } from "./flex";
import { RenderPositioned, RenderStack } from "./stack";
import { RenderText } from "./text-object";
import { MockMeasurer } from "../text/measurer";

const m = new MockMeasurer();
const WIN = { width: 800, height: 600 };

function flush(root: RenderObject, tightRoot = false): PipelineOwner {
  const owner = new PipelineOwner();
  owner.mount(root, WIN, { tightRoot });
  owner.flushLayout();
  return owner;
}

describe("基础布局器", () => {
  it("RenderBox：固定尺寸叶子，被紧约束钉住", () => {
    const root = new RenderBox(100, 50, rgba(1, 2, 3));
    flush(root);
    expect(root.size).toEqual({ width: 100, height: 50 });
    const tightRoot = new PipelineOwner();
    tightRoot.mount(new RenderBox(100, 50), { width: 60, height: 60 });
    tightRoot.flushLayout();
    expect(tightRoot.root?.size).toEqual({ width: 60, height: 60 }); // 窗口更小则被钳
  });

  it("Padding：子的约束收缩，自己 = 子 + insets", () => {
    const pad = new RenderPadding(edgeInsets(10));
    pad.appendChild(new RenderBox(100, 40));
    flush(pad);
    const child = pad.children[0]!;
    expect(child.size).toEqual({ width: 100, height: 40 });
    expect(child.x).toBe(10);
    expect(child.y).toBe(10);
    expect(pad.size).toEqual({ width: 120, height: 60 });
  });

  it("SizedBox：给子紧约束（子被迫同尺寸）", () => {
    const box = new RenderSizedBox({ width: 200, height: 80 });
    box.appendChild(new RenderBox(10, 10));
    flush(box);
    expect(box.size).toEqual({ width: 200, height: 80 });
    expect(box.children[0]!.size).toEqual({ width: 200, height: 80 });
  });

  it("Align：子自然尺寸，按比例摆位", () => {
    const align = new RenderAlign({ x: 1, y: 0.5 }); // 右对齐、垂直居中
    align.appendChild(new RenderBox(100, 40));
    flush(align);
    const child = align.children[0]!;
    expect(align.size).toEqual({ width: 800, height: 600 }); // 填满窗口
    expect(child.x).toBe(700); // (800-100)×1
    expect(child.y).toBe(280); // (600-40)×0.5
  });
});

describe("Flex 布局", () => {
  it("Row：非弹性子依次排开", () => {
    const row = new RenderFlex({ direction: FlexDirection.row, gap: 8 });
    row.appendChild(new RenderBox(100, 40));
    row.appendChild(new RenderBox(60, 40));
    row.appendChild(new RenderBox(40, 40));
    flush(row);
    expect(row.size).toEqual({ width: 216, height: 40 }); // 100+8+60+8+40
    expect(row.children[0]!.x).toBe(0);
    expect(row.children[1]!.x).toBe(108);
    expect(row.children[2]!.x).toBe(176);
  });

  it("Row + Expanded：剩余空间按 flex 比例分", () => {
    const row = new RenderFlex({ direction: FlexDirection.row });
    row.appendChild(new RenderBox(100, 40)); // 固定 100
    const e1 = new RenderExpanded(1, new RenderBox(0, 40));
    const e2 = new RenderExpanded(3, new RenderBox(0, 40));
    row.appendChild(e1);
    row.appendChild(e2);
    flush(row);
    // 窗口 800：剩余 700 → 1:3 → 175 / 525
    expect(e1.size.width).toBe(175);
    expect(e2.size.width).toBe(525);
    expect(row.children[0]!.x).toBe(0);
    expect(e1.x).toBe(100);
    expect(e2.x).toBe(275);
  });

  it("Column + crossAxisAlignment.stretch：子被拉到交叉轴满宽", () => {
    const col = new RenderFlex({ direction: FlexDirection.column, crossAxisAlign: CrossAxisAlign.stretch });
    col.appendChild(new RenderBox(10, 30));
    col.appendChild(new RenderBox(10, 20));
    flush(col);
    expect(col.size).toEqual({ width: 800, height: 50 });
    expect(col.children[0]!.size).toEqual({ width: 800, height: 30 }); // 被拉伸
    expect(col.children[1]!.size).toEqual({ width: 800, height: 20 });
  });

  it("mainAxisAlignment.center / end 的游标起点（用 min 约束撑出行宽）", () => {
    const center = new RenderFlex({ direction: FlexDirection.row, mainAxisAlign: MainAxisAlign.center });
    center.appendChild(new RenderBox(100, 10));
    center.layout({ minWidth: 800, maxWidth: 800, minHeight: 0, maxHeight: 100 });
    expect(center.children[0]!.x).toBe(350); // (800-100)/2

    const end = new RenderFlex({ direction: FlexDirection.row, mainAxisAlign: MainAxisAlign.end });
    end.appendChild(new RenderBox(100, 10));
    end.layout({ minWidth: 800, maxWidth: 800, minHeight: 0, maxHeight: 100 });
    expect(end.children[0]!.x).toBe(700); // 800-100
  });

  it("溢出被记录：mainOverflow > 0 且尺寸被钳", () => {
    const row = new RenderFlex({ direction: FlexDirection.row });
    row.appendChild(new RenderBox(500, 10));
    row.appendChild(new RenderBox(500, 10));
    flush(row);
    expect(row.mainOverflow).toBe(200); // 内容 1000 > 窗口 800
    expect(row.size.width).toBe(800);
  });

  it("无界主轴 + Expanded 直接抛错", () => {
    const row = new RenderFlex({ direction: FlexDirection.row });
    row.appendChild(new RenderExpanded(1, new RenderBox(0, 10)));
    expect(() => row.layout({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: 100 })).toThrow(
      /无界主轴/,
    );
  });
});

describe("Stack", () => {
  it("尺寸 = 非 positioned 子的最大尺寸", () => {
    const stack = new RenderStack();
    stack.appendChild(new RenderBox(100, 60));
    stack.appendChild(new RenderBox(60, 120));
    flush(stack);
    expect(stack.size).toEqual({ width: 100, height: 120 });
  });

  it("Positioned：left+right 拉伸定位，单边锚定", () => {
    const stack = new RenderStack();
    stack.appendChild(new RenderBox(100, 100)); // 基准
    const stretch = new RenderPositioned({ left: 10, right: 10, top: 0 }, new RenderBox(0, 20));
    const anchored = new RenderPositioned({ right: 5, bottom: 5 }, new RenderBox(30, 30));
    stack.appendChild(stretch);
    stack.appendChild(anchored);
    flush(stack);
    expect(stretch.size).toEqual({ width: 80, height: 20 }); // 100-10-10
    expect(stretch.x).toBe(10);
    expect(anchored.x).toBe(100 - 30 - 5);
    expect(anchored.y).toBe(100 - 30 - 5);
  });
});

describe("文本叶子接入", () => {
  it("RenderText：wrap 到约束宽，尺寸来自排版引擎", () => {
    const text = new RenderText([{ text: "hello world" }], { fontSize: 10, color: rgba(0, 0, 0) }, m);
    flush(text);
    // 有界宽 800 → 断行为一行？不：800 宽足够 → 单行 11×6=66
    expect(text.size).toEqual({ width: 66, height: 13 });

    const narrow = new RenderText([{ text: "hello world" }], { fontSize: 10, color: rgba(0, 0, 0) }, m);
    const owner = new PipelineOwner();
    owner.mount(narrow, { width: 30, height: 600 }, { tightRoot: false });
    owner.flushLayout();
    expect(narrow.size).toEqual({ width: 30, height: 26 }); // 两行 × 13
  });

  it("改文本触发重排（markNeedsLayout → flush）", () => {
    const text = new RenderText([{ text: "ab" }], { fontSize: 10, color: rgba(0, 0, 0) }, m);
    flush(text);
    const before = text.layoutCount;
    text.setText([{ text: "abcd" }]);
    expect(text.needsLayout).toBe(true);
    const owner = new PipelineOwner();
    owner.mount(text, WIN, { tightRoot: false });
    owner.flushLayout();
    expect(text.layoutCount).toBe(before + 1);
    expect(text.size).toEqual({ width: 24, height: 13 });
  });
});

describe("布局缓存与 relayout boundary", () => {
  function buildTree(): { root: RenderObject; mid: RenderFlex; leaf: RenderBox } {
    const root = new RenderPadding(edgeInsets(8));
    const mid = new RenderFlex({ direction: FlexDirection.row });
    const leaf = new RenderBox(50, 20);
    mid.appendChild(new RenderBox(30, 20));
    mid.appendChild(leaf);
    root.appendChild(mid);
    return { root, mid, leaf };
  }

  it("同样状态再 flush：零 performLayout（全缓存）", () => {
    const { root, leaf } = buildTree();
    const owner = flush(root);
    const total1 = owner.totalPerformLayouts;
    owner.flushLayout();
    expect(owner.totalPerformLayouts).toBe(total1); // 一个都没重排
    expect(leaf.layoutCount).toBe(1);
  });

  it("改叶子：只重排边界内子树（Padding+Flex 因非边界被传染）", () => {
    const { root, mid, leaf } = buildTree();
    const owner = flush(root);
    const midBefore = mid.layoutCount;
    const leafBefore = leaf.layoutCount;

    // 叶子是紧约束下的固定尺寸盒 → 自己就是 relayout boundary
    expect(leaf.relayoutBoundary).toBe(leaf);
    leaf.boxWidth = 80;
    leaf.markNeedsLayout();
    owner.flushLayout();

    expect(leaf.layoutCount).toBe(leafBefore + 1);
    // mid 收到的是窗口紧约束 → mid 自身也是边界（tight 成立），冒泡到 mid 为止，
    // 但 mid 自己 needsLayout 未被置位：布局缓存生效，不重排
    expect(mid.layoutCount).toBe(midBefore);
    expect(root.needsLayout).toBe(false);
  });

  it("窗口 resize：全树重排（根约束变了）", () => {
    const { root, leaf } = buildTree();
    const owner = flush(root);
    const before = owner.totalPerformLayouts;
    owner.resize({ width: 400, height: 300 });
    owner.flushLayout();
    expect(owner.totalPerformLayouts).toBeGreaterThan(before);
    expect(leaf.layoutCount).toBe(2); // 叶子是固定尺寸也要重排（紧约束数值变了）
  });
});
