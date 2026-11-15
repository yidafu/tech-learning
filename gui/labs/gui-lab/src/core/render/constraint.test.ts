import { describe, expect, it } from "vitest";
import { RenderConstraint, RenderConstrained, anchor, Side } from "./constraint";
import { PipelineOwner } from "./owner";
import { loose } from "./constraints";

const P = ""; // 父容器的 id

/** 装进 400×300 的约束容器（推入顺序故意打乱，验证工作清单的依赖序）。 */
function solved400(children: RenderConstrained[]): RenderConstraint {
  const root = new RenderConstraint();
  for (const c of children) root.appendChild(c);
  const owner = new PipelineOwner();
  owner.mount(root, { width: 400, height: 300 }, { tightRoot: true });
  owner.frame();
  return root;
}

describe("约束布局 Constraint（手算用例）", () => {
  it("锚点链：left+width / 兄弟右缘拉伸 / 百分比 / 右缘对齐 —— 推入乱序照解", () => {
    // 手算（W=400,H=300）：
    //   a: L=0+8=8, w=100          → R=108；y=8,h=40
    //   b: L=a.R+8=116, R=400-8=392 → w=276（拉伸）；y=a.B+8=56
    //   c: w=400×50%=200, C=200    → L=100；h=60,C=150 → y=120
    //   d: R=392, w=100            → L=292
    //   e: L=c.R+16=316, w=60
    const a = new RenderConstrained({ id: "a", left: anchor(P, Side.left, 8), width: 100, top: anchor(P, Side.top, 8), height: 40 });
    const b = new RenderConstrained({ id: "b", left: anchor("a", Side.right, 8), right: anchor(P, Side.right, -8), top: anchor("a", Side.bottom, 8), height: 40 });
    const c = new RenderConstrained({ id: "c", centerX: anchor(P, Side.centerX), percentWidth: 0.5, centerY: anchor(P, Side.centerY), height: 60 });
    const d = new RenderConstrained({ id: "d", right: anchor(P, Side.right, -8), width: 100, top: anchor(P, Side.top, 0), height: 20 });
    const e = new RenderConstrained({ id: "e", left: anchor("c", Side.right, 16), width: 60, top: anchor(P, Side.top, 0), height: 20 });
    const root = solved400([b, a, d, c, e]); // b 依赖 a 且排前面：第一轮解 a，第二轮才轮到 b/e → solvePasses≥2
    expect(a.x).toBe(8);
    expect(a.y).toBe(8);
    expect(a.width).toBe(100);
    expect(b.x).toBe(116);
    expect(b.width).toBe(276); // R−L = 392−116
    expect(b.y).toBe(56);
    expect(c.width).toBe(200);
    expect(c.x).toBe(100); // C−w/2 = 200−100
    expect(c.y).toBe(120);
    expect(d.x).toBe(292); // R−w = 392−100
    expect(e.x).toBe(316); // c.R = 300，+16
    expect(root.solvePasses).toBeGreaterThanOrEqual(2); // b 至少等了一轮（工作清单生效）
  });

  it("left+center 定宽（B2）：宽 = 2×(C−L)", () => {
    // 手算：C = 400/2 + (−100) = 100；L = 0 → w = 200
    const f = new RenderConstrained({ id: "f", left: anchor(P, Side.left, 0), centerX: anchor(P, Side.centerX, -100), top: anchor(P, Side.top, 0), height: 20 });
    solved400([f]);
    expect(f.x).toBe(0);
    expect(f.width).toBe(200);
  });

  it("底栏贴边（左+右拉伸 + 百分比高）", () => {
    // 手算：w = 400−0 = 400；h = floor(300×0.25) = 75；y = 300−75 = 225
    const bar = new RenderConstrained({ id: "bar", left: anchor(P, Side.left, 0), right: anchor(P, Side.right, 0), bottom: anchor(P, Side.bottom, 0), percentHeight: 0.25 });
    solved400([bar]);
    expect(bar.width).toBe(400);
    expect(bar.height).toBe(75);
    expect(bar.x).toBe(0);
    expect(bar.y).toBe(225);
  });

  it("循环依赖：g ← h ← g → 抛错并点名", () => {
    const g = new RenderConstrained({ id: "g", left: anchor("h", Side.right, 4), width: 50, top: anchor(P, Side.top, 0), height: 20 });
    const h = new RenderConstrained({ id: "h", left: anchor("g", Side.right, 4), width: 50, top: anchor(P, Side.top, 0), height: 20 });
    expect(() => solved400([g, h])).toThrow(/约束循环|悬空/);
  });

  it("悬空引用：锚点指向不存在的 id → 抛错", () => {
    const i = new RenderConstrained({ id: "i", left: anchor("nope", Side.left, 0), width: 50, top: anchor(P, Side.top, 0), height: 20 });
    expect(() => solved400([i])).toThrow(/约束循环|悬空/);
  });

  it("欠定：有尺寸没锚 → 抛错", () => {
    const j = new RenderConstrained({ id: "j", width: 50, height: 20 });
    expect(() => solved400([j])).toThrow(/锚都没有/);
  });

  it("容器必须有界尺寸", () => {
    const root = new RenderConstraint();
    root.appendChild(new RenderConstrained({ id: "k", width: 10, height: 10 }));
    expect(() => root.layout(loose({ width: Infinity, height: Infinity }))).toThrow(/有界/);
  });
});
