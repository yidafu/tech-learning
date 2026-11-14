import { describe, expect, it } from "vitest";
import { PALETTE } from "../core/color";
import { DisplayList, StatefulPainter } from "../core/painter";
import { PipelineOwner } from "../core/render/owner";
import { MockMeasurer } from "../core/text/measurer";
import { PANEL_STATUS_W, PANEL_TITLE, buildPanelTree } from "./panel-tree";

const m = new MockMeasurer();
const WIN = { width: 800, height: 450 };

/** MockMeasurer @fontSize10：每字符 6px。 */
describe("panel-tree 黄金断言", () => {
  const tree = buildPanelTree(m, 10);
  const owner = new PipelineOwner();
  owner.mount(tree, WIN); // 生产语义：tight 根（铺满窗口）
  owner.flushLayout();

  it("根铺满窗口", () => {
    expect(tree.size).toEqual({ width: 800, height: 450 });
  });

  it("头部行：标题宽度 = 字符数×6，状态徽标贴右边距", () => {
    const col = tree.children[0]!.children[0]!; // Padding > Column
    const header = col.children[0]!;
    expect(header.size.height).toBe(24); // max(标题 13, 徽标 24)
    const title = header.children[0]!;
    expect(title.size).toEqual({ width: PANEL_TITLE.length * 6, height: 13 });
    const status = header.children[2]!;
    // 行内：标题 84 + gap 12 + 弹性 554 + gap 12 → 徽标相对行首 662
    expect(status.x).toBe(84 + 12 + 554 + 12);
    // 绝对右缘要累加全链偏移：root(0) + Padding(24) + Column(0) + 行(0) + 662 + 90 = 776 = 800 - 24
    const pad = tree.children[0]!;
    const colAbsX = pad.x + col.x;
    expect(colAbsX + header.x + status.x + status.width).toBe(776);
    expect(status.size).toEqual({ width: PANEL_STATUS_W, height: 24 });
  });

  it("主体行：2:1 弹性分配 752-12=740 → 493 / 247", () => {
    const col = tree.children[0]!.children[0]!;
    const body = col.children[1]!;
    const left = body.children[0]!;
    const right = body.children[1]!;
    expect(left.size.width).toBe(Math.floor((740 * 2) / 3));
    expect(right.size.width).toBe(Math.floor(740 / 3));
    expect(body.size.height).toBe(300);
  });

  it("页脚层叠：非 positioned 定宽，徽标右上角", () => {
    const col = tree.children[0]!.children[0]!;
    const footer = col.children[2]!;
    expect(footer.size).toEqual({ width: 752, height: 20 });
    const badge = footer.children[1]!;
    expect(badge.x).toBe(752 - 60);
    expect(badge.y).toBe(0);
  });

  it("整树绘制：fillRect 7 条（背景/占位/徽标/主体两块/页脚两条）+ 圆角 2 条（装饰盒）+ text 1 条", () => {
    const list = new DisplayList();
    const p = new StatefulPainter(list);
    tree.paint(p);
    const counts = list.countByOp();
    expect(counts.get("fillRect")).toBe(7);
    expect(counts.get("fillRoundedRect")).toBe(2); // 装饰盒两层
    expect(counts.get("text")).toBe(1);
  });

  it("改标题文本：只有文本叶子与其边界内重排（列头不动）", () => {
    const col = tree.children[0]!.children[0]!;
    const header = col.children[0]!;
    const title = header.children[0]! as InstanceType<typeof import("../core/render/text-object").RenderText>;
    const headerBefore = header.layoutCount;
    const colBefore = col.layoutCount;
    title.setText([{ text: "mini-gui layout!" }]);
    owner.flushLayout();
    expect(title.layoutCount).toBe(2);
    expect(header.layoutCount).toBe(headerBefore); // 文本是 fixedSize 叶子，冒泡止于自身
    expect(col.layoutCount).toBe(colBefore);
    expect(title.size.width).toBe(16 * 6);
  });
});
