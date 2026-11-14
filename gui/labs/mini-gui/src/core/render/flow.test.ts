import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { RenderBox } from "./layout-widgets";
import { RenderFlow, FlowDirection, LineAlign, FlowCrossAlign } from "./flow";
import { PipelineOwner } from "./owner";
import type { RenderObject } from "./render-object";

const RED = rgba(255, 0, 0);
const box = (w: number, h: number): RenderBox => new RenderBox(w, h, RED);

function flowOf(children: RenderBox[], opts?: ConstructorParameters<typeof RenderFlow>[0], mount = { width: 100, height: 300 }): RenderFlow {
  const flow = new RenderFlow(opts);
  for (const b of children) flow.appendChild(b);
  const owner = new PipelineOwner();
  owner.mount(flow, mount, { tightRoot: false });
  owner.frame();
  return flow;
}

const pos = (n: RenderObject): { x: number; y: number } => ({ x: n.x, y: n.y });

describe("流式布局 Flow（手算用例）", () => {
  it("基本换行：60+60+30+40 在 100 宽里封成 3 行", () => {
    // 手算：60 | 60,30（60+30=90≤100）| 40 → 3 行；行高 30/30/40 → 总高 100
    const b1 = box(60, 30);
    const b2 = box(60, 30);
    const b3 = box(30, 30);
    const b4 = box(40, 40);
    const flow = flowOf([b1, b2, b3, b4]);
    expect(flow.lineCount).toBe(3);
    expect(flow.width).toBe(100); // 主轴有界 → 取约束 max
    expect(flow.height).toBe(100); // 30 + 30 + 40
    expect(pos(b1)).toEqual({ x: 0, y: 0 });
    expect(pos(b2)).toEqual({ x: 0, y: 30 });
    expect(pos(b3)).toEqual({ x: 60, y: 30 }); // 与 b2 同行
    expect(pos(b4)).toEqual({ x: 0, y: 60 });
  });

  it("主轴间隙参与装行判定：60 + 10 + 30 = 100 恰好装下", () => {
    const b1 = box(60, 20);
    const b2 = box(30, 20);
    const b3 = box(30, 20);
    const flow = flowOf([b1, b2, b3], { mainGap: 10, crossGap: 0 });
    expect(flow.lineCount).toBe(2);
    expect(pos(b2)).toEqual({ x: 70, y: 0 }); // 60 + gap10
    expect(pos(b3)).toEqual({ x: 0, y: 20 }); // 100+10+30 > 100 → 换行
    expect(flow.height).toBe(40);
  });

  it("spaceBetween 分富余 + cross 居中", () => {
    // 手算：行内容 60+30=90，富余 10 → 间距 10 → 第二个 x=70；行高 30 → 20 高的子 y=(30-20)/2=5
    const b1 = box(60, 30);
    const b2 = box(30, 20);
    const flow = flowOf([b1, b2], { lineAlign: LineAlign.spaceBetween, crossAlign: FlowCrossAlign.center });
    expect(pos(b1)).toEqual({ x: 0, y: 0 });
    expect(pos(b2)).toEqual({ x: 70, y: 5 });
  });

  it("无界主轴退化为单行（不换行）", () => {
    const flow = new RenderFlow({});
    flow.appendChild(box(40, 30));
    flow.appendChild(box(50, 30));
    flow.layout({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity });
    expect(flow.lineCount).toBe(1);
    expect(flow.width).toBe(90); // 最宽行 = 内容宽
    expect(flow.height).toBe(30);
  });

  it("超宽子独占一行并记溢出", () => {
    const flow = flowOf([box(150, 20)]);
    expect(flow.lineCount).toBe(1); // 空行必收，否则永远装不下
    expect(flow.mainOverflow).toBe(50); // 150 - 100
    expect(flow.width).toBe(100); // 钳回约束
  });

  it("column 方向：主轴竖着装、装不下换「列」（x 前进）", () => {
    // 手算：列高 50，子高 30 → 第二、三个子各开新列；列宽 30 → 总宽 90
    const b1 = box(30, 30);
    const b2 = box(30, 30);
    const b3 = box(30, 30);
    const flow = flowOf([b1, b2, b3], { direction: FlowDirection.column }, { width: 300, height: 50 });
    expect(flow.lineCount).toBe(3);
    expect(pos(b1)).toEqual({ x: 0, y: 0 });
    expect(pos(b2)).toEqual({ x: 30, y: 0 }); // 换列：x 前进、y 归零
    expect(pos(b3)).toEqual({ x: 60, y: 0 });
    expect(flow.width).toBe(90); // 交叉 = Σ列宽
    expect(flow.height).toBe(50); // 主轴有界 → 钳到 50
  });

  it("stretch：矮子按行高紧约束重排", () => {
    const b1 = box(60, 30);
    const b2 = box(30, 20);
    flowOf([b1, b2], { crossAlign: FlowCrossAlign.stretch });
    expect(b1.height).toBe(30);
    expect(b2.height).toBe(30); // 被拉到行高
    expect(b2.y).toBe(0);
  });
});
