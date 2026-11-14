import { describe, expect, it } from "vitest";
import {
  rectBottom,
  rectContains,
  rectInflate,
  rectIntersect,
  rectIsEmpty,
  rectTranslate,
} from "../core/geometry";

describe("rectIntersect", () => {
  it("正常相交", () => {
    const r = rectIntersect({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 });
    expect(r).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it("不相交得到空矩形（负宽高）", () => {
    const r = rectIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 });
    expect(rectIsEmpty(r)).toBe(true);
  });

  it("恰好邻接得到零宽（视为空）", () => {
    const r = rectIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 });
    expect(r.width).toBe(0);
    expect(rectIsEmpty(r)).toBe(true);
  });

  it("包含关系返回较小的那个", () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 };
    const inner = { x: 10, y: 10, width: 20, height: 20 };
    expect(rectIntersect(outer, inner)).toEqual(inner);
  });
});

describe("rectContains（半开区间语义）", () => {
  const r = { x: 0, y: 0, width: 100, height: 100 };

  it("内部与左上边界命中", () => {
    expect(rectContains(r, 0, 0)).toBe(true);
    expect(rectContains(r, 99, 99)).toBe(true);
    expect(rectContains(r, 50, 50)).toBe(true);
  });

  it("右/下边界不命中（相邻控件才不会同时命中同一点）", () => {
    expect(rectContains(r, 100, 50)).toBe(false);
    expect(rectContains(r, 50, 100)).toBe(false);
    expect(rectContains(r, -1, 50)).toBe(false);
  });
});

describe("rectTranslate / rectInflate / rectBottom", () => {
  it("平移不改尺寸", () => {
    expect(rectTranslate({ x: 1, y: 2, width: 3, height: 4 }, 10, 20)).toEqual({
      x: 11,
      y: 22,
      width: 3,
      height: 4,
    });
  });

  it("inflate 四边同量外扩", () => {
    expect(rectInflate({ x: 10, y: 10, width: 20, height: 20 }, 5)).toEqual({
      x: 5,
      y: 5,
      width: 30,
      height: 30,
    });
  });

  it("bottom = y + height", () => {
    expect(rectBottom({ x: 0, y: 7, width: 3, height: 5 })).toBe(12);
  });
});
