import { describe, expect, it } from "vitest";
import { PI, cos, invLerp, lerp, mod, sin, sqrt } from "./math";

describe("sqrt（牛顿迭代）", () => {
  it("完全平方数精确", () => {
    expect(sqrt(4)).toBeCloseTo(2, 10);
    expect(sqrt(9)).toBeCloseTo(3, 10);
    expect(sqrt(0)).toBe(0);
  });

  it("与 Math.sqrt 对照（覆盖大数与小数）", () => {
    for (const x of [0.5, 1, 2, 3, 10, 123.456, 10000, 1e6]) {
      expect(sqrt(x)).toBeCloseTo(Math.sqrt(x), 8);
    }
  });

  it("负数与 0 返回 0", () => {
    expect(sqrt(-1)).toBe(0);
    expect(sqrt(0)).toBe(0);
  });
});

describe("sin / cos（泰勒 + 象限归约）", () => {
  it("特殊角（误差 < 1e-9；θ=π/2 处真实截断误差 ≈ 6.6e-10）", () => {
    expect(Math.abs(sin(0))).toBeLessThan(1e-9);
    expect(Math.abs(sin(PI / 2) - 1)).toBeLessThan(1e-9);
    expect(Math.abs(cos(0) - 1)).toBeLessThan(1e-9);
    expect(Math.abs(cos(PI) + 1)).toBeLessThan(1e-9);
  });

  it("与 Math.sin/cos 对照：主区间 [-π, π] 内误差 < 1e-9", () => {
    for (let i = -32; i <= 32; i++) {
      const x = (i / 32) * PI;
      expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-9);
      expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-9);
    }
  });

  it("大参数周期归约后仍正确（动画时间会很大）", () => {
    for (const x of [7, -7, 100, -123.456, 1000]) {
      expect(sin(x)).toBeCloseTo(Math.sin(x), 7);
      expect(cos(x)).toBeCloseTo(Math.cos(x), 7);
    }
  });
});

describe("mod / lerp / invLerp", () => {
  it("mod 是欧几里得模（结果与除数同号）", () => {
    expect(mod(7, 3)).toBe(1);
    expect(mod(-7, 3)).toBe(2);
    expect(mod(-7, -3)).toBe(-1);
  });

  it("lerp 端点与中点", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("invLerp 钳制到 [0,1]", () => {
    expect(invLerp(0, 10, 5)).toBeCloseTo(0.5, 12);
    expect(invLerp(0, 10, -5)).toBe(0);
    expect(invLerp(0, 10, 15)).toBe(1);
    expect(invLerp(3, 3, 1)).toBe(0);
  });

  it("PI 与 Math.PI 一致", () => {
    expect(PI).toBe(Math.PI);
  });
});
