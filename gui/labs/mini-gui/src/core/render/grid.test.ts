import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { RenderBox } from "./layout-widgets";
import { RenderGrid, RenderGridCell, fixedTrack, flexTrack, autoTrack } from "./grid";
import { PipelineOwner } from "./owner";

const RED = rgba(255, 0, 0);
const box = (w: number, h: number): RenderBox => new RenderBox(w, h, RED);
const cell = (col: number, row: number, w: number, h: number, span?: { colSpan?: number; rowSpan?: number }): RenderGridCell =>
  new RenderGridCell({ col, row, colSpan: span?.colSpan ?? 1, rowSpan: span?.rowSpan ?? 1 }, box(w, h));

function gridOf(columns: ReturnType<typeof fixedTrack>[], rows: ReturnType<typeof autoTrack>[], cells: RenderGridCell[], mount = { width: 400, height: 400 }, opts?: { columnGap?: number; rowGap?: number }): RenderGrid {
  const grid = new RenderGrid({ columns, rows, columnGap: opts?.columnGap ?? 0, rowGap: opts?.rowGap ?? 0 });
  for (const c of cells) grid.appendChild(c);
  const owner = new PipelineOwner();
  owner.mount(grid, mount, { tightRoot: false });
  owner.frame();
  return grid;
}

describe("网格布局 Grid（手算用例）", () => {
  it("flex 轨道分摊 + 确定性舍入：280 剩余分 1:2 → 94/186", () => {
    // 手算：剩余 = 400 − 100(fixed) − 2×10(gap) = 280；base = floor(280/3)=93、floor(560/3)=186；
    // 余 1 → 按列序 +1 给第一个 flex 列 → [94, 186]
    const grid = gridOf([fixedTrack(100), flexTrack(1), flexTrack(2)], [autoTrack()], [cell(0, 0, 50, 30), cell(1, 0, 40, 20), cell(2, 0, 60, 40)], { width: 400, height: 400 }, { columnGap: 10 });
    expect(grid.colWidths).toEqual([100, 94, 186]);
    expect(grid.rowHeights).toEqual([40]); // auto 行 = 最大重排高
    expect(grid.width).toBe(400);
    expect(grid.height).toBe(40);
    const [a, b, c] = grid.children as RenderGridCell[];
    expect(a).toBeDefined();
    expect(a!.x).toBe(0);
    expect(a!.width).toBe(100); // 拉伸到格宽
    expect(a!.height).toBe(40); // 拉伸到行高（20 → 40）
    expect(b!.x).toBe(110); // 100 + gap 10
    expect(b!.width).toBe(94);
    expect(c!.x).toBe(214); // 110 + 94 + 10
    expect(c!.width).toBe(186);
  });

  it("auto 列取内容最大宽，行高用列宽定形后重解", () => {
    // 手算：col0 = max(60,45)=60；col1=80。A/B 用 60 定形高 20/30，C 用 80 定形高 25
    // row0 = max(20,25)=25；row1=30
    const grid = gridOf([autoTrack(), fixedTrack(80)], [autoTrack(), autoTrack()], [cell(0, 0, 60, 20), cell(0, 1, 45, 30), cell(1, 0, 30, 25)], { width: 300, height: 300 }, { columnGap: 10, rowGap: 5 });
    expect(grid.colWidths).toEqual([60, 80]);
    expect(grid.rowHeights).toEqual([25, 30]);
    expect(grid.width).toBe(150); // 60+10+80
    expect(grid.height).toBe(60); // 25+5+30
    const [a, b, c] = grid.children as RenderGridCell[];
    expect(a!.width).toBe(60);
    expect(a!.height).toBe(25); // 拉伸到行高
    expect(b!.y).toBe(30); // 25 + rowGap 5
    expect(c!.x).toBe(70);
    expect(c!.height).toBe(25);
  });

  it("colSpan：跨列格拿多列总宽，不参与 auto 行高解算", () => {
    // 手算：D(col0 跨2) 格宽 = 50+10+50=110；row0 的 auto 高只看 span=1 的 A(30)
    const grid = gridOf([fixedTrack(50), fixedTrack(50)], [autoTrack(), fixedTrack(20)], [cell(0, 0, 80, 25, { colSpan: 2 }), cell(0, 0, 50, 30), cell(1, 1, 40, 12)], { width: 300, height: 300 }, { columnGap: 10, rowGap: 4 });
    expect(grid.colWidths).toEqual([50, 50]);
    expect(grid.rowHeights).toEqual([30, 20]);
    const [d, a, e] = grid.children as RenderGridCell[];
    expect(d!.width).toBe(110);
    expect(d!.height).toBe(30);
    expect(d!.x).toBe(0);
    expect(a!.x).toBe(0); // 与 D 重叠合法（Grid 允许，绘制按子序）
    expect(e!.x).toBe(60); // 50 + gap 10
    expect(e!.y).toBe(34); // 30 + rowGap 4
    expect(e!.height).toBe(20); // 拉伸到 fixed 行高
    expect(grid.height).toBe(54); // 30+4+20
  });

  it("轨道合计超宽：记溢出、宽度钳回约束", () => {
    const grid = gridOf([fixedTrack(200), fixedTrack(300)], [], [cell(0, 0, 30, 30)], { width: 400, height: 200 });
    expect(grid.mainOverflow).toBe(100);
    expect(grid.width).toBe(400); // 内容 500 被钳回
    expect(grid.colWidths).toEqual([200, 300]);
  });

  it("无界宽度：flex 轨道退化为 auto（内容宽）", () => {
    const grid = new RenderGrid({ columns: [flexTrack(1), fixedTrack(60)] });
    grid.appendChild(cell(0, 0, 70, 10));
    grid.layout({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity });
    expect(grid.colWidths).toEqual([70, 60]);
    expect(grid.width).toBe(130);
  });
});
