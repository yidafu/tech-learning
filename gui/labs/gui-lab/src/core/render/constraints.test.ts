import { describe, expect, it } from "vitest";
import {
  constrainSize,
  deflate,
  enforce,
  loose,
  loosen,
  tight,
  isTight,
} from "./constraints";

describe("BoxConstraints 构造", () => {
  it("tight / loose / loosen", () => {
    expect(tight({ width: 10, height: 20 })).toEqual({ minWidth: 10, maxWidth: 10, minHeight: 20, maxHeight: 20 });
    expect(loose({ width: 10, height: 20 })).toEqual({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 });
    expect(loosen(loose({ width: 10, height: 20 }))).toEqual(loose({ width: 10, height: 20 })); // 已松再松不变
    expect(loosen(tight({ width: 10, height: 20 }))).toEqual(loose({ width: 10, height: 20 }));
    expect(isTight(tight({ width: 1, height: 2 }))).toBe(true);
    expect(isTight(loose({ width: 1, height: 2 }))).toBe(false);
  });

  it("deflate：四边缩进并保持 min ≤ max", () => {
    const c = { minWidth: 20, maxWidth: 30, minHeight: 20, maxHeight: 30 };
    expect(deflate(c, { left: 5, top: 5, right: 5, bottom: 5 })).toEqual({
      minWidth: 10,
      maxWidth: 20,
      minHeight: 10,
      maxHeight: 20,
    });
    // 缩到负：max 钳 0，min 也钳 0（min>max 是非法约束）
    expect(deflate(c, { left: 50, top: 50, right: 50, bottom: 50 })).toEqual({
      minWidth: 0,
      maxWidth: 0,
      minHeight: 0,
      maxHeight: 0,
    });
  });

  it("enforce：附加约束与父约束取交（min 取大、max 取小，且 min 不越 max）", () => {
    const parent = { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 100 };
    expect(enforce({ minWidth: 30, maxWidth: 50, minHeight: 0, maxHeight: 200 }, parent)).toEqual({
      minWidth: 30,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 100,
    });
    // 附加 min 高于父 max：min 被父 max 钳住（min ≤ max 恒成立）
    expect(enforce({ minWidth: 150, maxWidth: 200, minHeight: 0, maxHeight: 10 }, parent)).toEqual({
      minWidth: 100,
      maxWidth: 100,
      minHeight: 0,
      maxHeight: 10,
    });
  });

  it("constrainSize：钳到区间", () => {
    const c = { minWidth: 10, maxWidth: 20, minHeight: 10, maxHeight: 20 };
    expect(constrainSize(c, { width: 5, height: 25 })).toEqual({ width: 10, height: 20 });
    expect(constrainSize(c, { width: 15, height: 15 })).toEqual({ width: 15, height: 15 });
  });
});
