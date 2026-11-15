import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { DisplayList, StatefulPainter } from "../painter";
import { MockMeasurer } from "./measurer";
import { layoutText, offsetToX, paintText, xToOffset } from "./text-layout";

const m = new MockMeasurer();
const BLACK = rgba(0, 0, 0);
const RED = rgba(255, 0, 0);

describe("layoutText 基础", () => {
  it("单行：尺寸 = 行数 × 行高", () => {
    const layout = layoutText([{ text: "hello" }], { fontSize: 10, color: BLACK }, m);
    expect(layout.size).toEqual({ width: 30, height: 13 }); // 行高 round(10×1.25)=13
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]?.width).toBe(30);
  });

  it("断行到宽度内（每字符 6px）", () => {
    const layout = layoutText([{ text: "hello world" }], { fontSize: 10, color: BLACK, width: 30 }, m);
    expect(layout.lines.map((l) => l.pieces.map((p) => p.text).join(""))).toEqual(["hello", "world"]);
  });

  it("span 归属跨断行保持正确（ab|cd 两 span 断成两行各归各）", () => {
    const layout = layoutText(
      [
        { text: "ab", color: RED },
        { text: "cd", color: BLACK },
      ],
      { fontSize: 10, color: BLACK, width: 12 },
      m,
    );
    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]?.pieces).toHaveLength(1);
    expect(layout.lines[0]?.pieces[0]).toMatchObject({ spanIndex: 0, text: "ab", color: RED });
    expect(layout.lines[1]?.pieces[0]).toMatchObject({ spanIndex: 1, text: "cd", color: BLACK });
  });

  it("一行内多 span 依 x 递增摆放", () => {
    const layout = layoutText(
      [
        { text: "ab", color: RED },
        { text: "cd", color: BLACK },
      ],
      { fontSize: 10, color: BLACK, width: 100 },
      m,
    );
    const pieces = layout.lines[0]?.pieces ?? [];
    expect(pieces.map((p) => p.x)).toEqual([0, 12]);
    expect(pieces.map((p) => p.width)).toEqual([12, 12]);
  });

  it("对齐：center 在宽度内平移半份空隙", () => {
    const layout = layoutText([{ text: "abc" }], { fontSize: 10, color: BLACK, width: 60, align: "center" }, m);
    expect(layout.lines[0]?.pieces[0]?.x).toBe(21); // (60-18)/2
  });
});

describe("maxLines 与省略号", () => {
  const spans = [{ text: "aaaa bbbb cccc" }];

  it("clip：直接截到 maxLines 行", () => {
    const layout = layoutText(spans, { fontSize: 10, color: BLACK, width: 30, maxLines: 2, overflow: "clip" }, m);
    expect(layout.lines.map((l) => l.pieces.map((p) => p.text).join(""))).toEqual(["aaaa", "bbbb"]);
  });

  it("ellipsis：末行截断并以 ... 结尾，宽度不越界（30px = 2 字符 12px + 省略号 18px）", () => {
    const layout = layoutText(spans, { fontSize: 10, color: BLACK, width: 30, maxLines: 2, overflow: "ellipsis" }, m);
    const texts = layout.lines.map((l) => l.pieces.map((p) => p.text).join(""));
    expect(texts).toEqual(["aaaa", "bb..."]);
    expect(layout.lines[1]?.width).toBeLessThanOrEqual(30);
  });
});

describe("光标几何（offsetToX / xToOffset）", () => {
  const layout = layoutText([{ text: "hello" }], { fontSize: 10, color: BLACK }, m);

  it("offsetToX：每个字符边界 0,6,12,18,24,30", () => {
    const xs: number[] = [];
    for (let o = 0; o <= 5; o++) xs.push(offsetToX(layout, 0, o, m));
    expect(xs).toEqual([0, 6, 12, 18, 24, 30]);
  });

  it("xToOffset：落在字符中点左侧取前边界", () => {
    expect(xToOffset(layout, 0, 0, m)).toBe(0);
    expect(xToOffset(layout, 0, 2.9, m)).toBe(0);
    expect(xToOffset(layout, 0, 3.1, m)).toBe(1);
    expect(xToOffset(layout, 0, 29, m)).toBe(5);
  });

  it("超出 x 按行尾", () => {
    expect(xToOffset(layout, 0, 999, m)).toBe(5);
  });

  it("往返稳定：offset → x → offset 不动", () => {
    for (let o = 0; o <= 5; o++) {
      expect(xToOffset(layout, 0, offsetToX(layout, 0, o, m), m)).toBe(o);
    }
  });

  it("跨片段：行内两个 span 的光标仍连续", () => {
    const two = layoutText(
      [
        { text: "ab", color: RED },
        { text: "cd", color: BLACK },
      ],
      { fontSize: 10, color: BLACK },
      m,
    );
    expect(offsetToX(two, 0, 2, m)).toBe(12); // ab 后边界 = cd 前边界
    expect(xToOffset(two, 0, 16, m)).toBe(3); // 16 落在 d 的前半段中点（15）之后
  });
});

describe("paintText 黄金断言", () => {
  it("按行按片段发 text 命令，坐标绝对化", () => {
    const list = new DisplayList();
    const p = new StatefulPainter(list);
    const layout = layoutText(
      [
        { text: "ab", color: RED },
        { text: "cd", color: BLACK },
      ],
      { fontSize: 10, color: BLACK, width: 12 },
      m,
    );
    p.translate(100, 50);
    paintText(p, layout, 5, 10);
    expect(list.commands).toEqual([
      { op: "text", text: "ab", x: 105, y: 60, fontSize: 10, color: RED, clip: null },
      { op: "text", text: "cd", x: 105, y: 73, fontSize: 10, color: BLACK, clip: null }, // 60+13
    ]);
  });
});

describe("度量缓存", () => {
  it("相同 (text,fontSize) 只穿透一次到原始度量", () => {
    const mm = new MockMeasurer();
    const layout = layoutText([{ text: "aaaa bbbb cccc" }], { fontSize: 10, color: BLACK, width: 30, maxLines: 2, overflow: "ellipsis" }, mm);
    expect(layout.lines).toHaveLength(2);
    expect(mm.rawMeasures).toBeLessThan(mm.cacheHits + mm.rawMeasures); // 有命中才成立
    expect(mm.cacheHits).toBeGreaterThan(0);
    const before = mm.rawMeasures;
    layoutText([{ text: "aaaa bbbb" }], { fontSize: 10, color: BLACK, width: 30 }, mm); // 前缀全部命中缓存
    expect(mm.rawMeasures).toBe(before);
  });
});
