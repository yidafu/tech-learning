import { describe, expect, it } from "vitest";
import { Curves, Tween, AnimatedValue, AnimationHost } from "./animation";

describe("曲线族", () => {
  it("端点归一：所有曲线 f(0)=0、f(1)=1", () => {
    const all = [Curves.linear, Curves.easeIn, Curves.easeOut, Curves.easeInOut, Curves.easeOutBack, Curves.elasticOut];
    for (const c of all) {
      expect(Math.abs(c(0))).toBeLessThan(1e-9);
      expect(Math.abs(c(1) - 1)).toBeLessThan(1e-9);
    }
  });

  it("单调性与过冲", () => {
    expect(Curves.easeIn(0.5)).toBeLessThan(0.5); // 先慢
    expect(Curves.easeOut(0.5)).toBeGreaterThan(0.5); // 先快
    expect(Curves.easeOutBack(0.8)).toBeGreaterThan(1); // 过冲
    expect(Curves.easeInOut(0.5)).toBeCloseTo(0.5, 9);
  });
});

describe("Tween", () => {
  it("线性补间的值序列与完成回调（恰一次）", () => {
    const values: number[] = [];
    let completed = 0;
    const t = new Tween(0, 10, 1); // 1 秒
    t.onUpdate = (v) => values.push(v);
    t.onComplete = () => (completed += 1);
    t.start();
    expect(t.tick(0.25)).toBe(true);
    expect(t.tick(0.25)).toBe(true);
    expect(values[values.length - 1]).toBeCloseTo(5, 9);
    expect(t.tick(0.5)).toBe(false); // 到点即停
    expect(values[values.length - 1]).toBe(10);
    expect(completed).toBe(1);
    expect(t.tick(0.1)).toBe(false); // 停了就不再动
    expect(values).toHaveLength(3);
  });

  it("duration=0 立即到终点", () => {
    const t = new Tween(2, 5, 0);
    let last = -1;
    t.onUpdate = (v) => (last = v);
    t.start();
    expect(t.tick(0.016)).toBe(false);
    expect(last).toBe(5);
  });
});

describe("AnimatedValue（隐式补间）", () => {
  it("set 后向目标推进，到位即停", () => {
    const a = new AnimatedValue(0, 1, Curves.linear);
    a.set(100);
    expect(a.tick(0.5)).toBe(true);
    expect(a.current).toBeCloseTo(50, 6);
    expect(a.tick(0.5)).toBe(false);
    expect(a.current).toBe(100);
  });

  it("半路改向：从当前值起补，不跳变", () => {
    const a = new AnimatedValue(0, 1, Curves.linear);
    a.set(100);
    a.tick(0.25); // current = 25
    expect(a.current).toBeCloseTo(25, 6);
    a.set(0); // 改向：from = 25
    expect(a.current).toBe(25); // 无跳变
    a.tick(0.5); // 走一半 → 12.5
    expect(a.current).toBeCloseTo(12.5, 6);
  });

  it("同值 set 不触发", () => {
    const a = new AnimatedValue(7, 1);
    a.set(7);
    expect(a.tick(0.1)).toBe(false);
    expect(a.current).toBe(7);
  });
});

describe("AnimationHost", () => {
  it("统一 tick 返回活动数", () => {
    const host = new AnimationHost();
    const a = host.add(new Tween(0, 1, 0.5));
    const b = host.add(new Tween(0, 1, 1));
    a.start();
    b.start();
    expect(host.tick(0.5)).toBe(1); // a 完成，b 还在
    expect(host.tick(0.5)).toBe(0);
  });
});
