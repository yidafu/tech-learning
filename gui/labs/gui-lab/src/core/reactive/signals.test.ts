import { describe, expect, it } from "vitest";
import { ComputedN, SignalN, SignalS, SignalB, SignalList, batch, computedN, effect } from "./signals";

describe("signal 基础", () => {
  it("get/set 与相等短路（同值 set 不传播）", () => {
    const s = new SignalN(1);
    let runs = 0;
    effect(() => {
      s.get();
      runs += 1;
    });
    expect(runs).toBe(1); // 初始运行一次
    s.set(1); // 同值
    expect(runs).toBe(1);
    s.set(2);
    expect(runs).toBe(2);
  });

  it("字符串/布尔/列表信号", () => {
    const s = new SignalS("a");
    const b = new SignalB(false);
    const l = new SignalList(["x"]);
    expect(s.get()).toBe("a");
    expect(b.get()).toBe(false);
    expect(l.get()).toEqual(["x"]);
    s.set("b");
    b.set(true);
    l.set(["x", "y"]);
    expect(s.get()).toBe("b");
    expect(b.get()).toBe(true);
    expect(l.get()).toEqual(["x", "y"]);
  });
});

describe("依赖收集与传播", () => {
  it("effect 只依赖读过的信号", () => {
    const a = new SignalN(1);
    const b = new SignalN(10);
    let sum = 0;
    effect(() => {
      sum = a.get(); // 只读 a
    });
    b.set(20);
    expect(sum).toBe(1); // b 的变化不触发
    a.set(5);
    expect(sum).toBe(5);
  });

  it("chain：a → b → c 按拓扑序，c 看到新 b（无 glitch）", () => {
    const a = new SignalN(1);
    const b = computedN(() => a.get() * 2);
    const c = computedN(() => b.get() + 1);
    expect(b.get()).toBe(2);
    expect(c.get()).toBe(3);
    a.set(10);
    expect(b.get()).toBe(20); // b 已按 level 先行更新
    expect(c.get()).toBe(21);
  });

  it("diamond：a → (b, c) → d，d 每个 wave 恰更新一次", () => {
    const a = new SignalN(1);
    const b = computedN(() => a.get() + 1);
    const c = computedN(() => a.get() * 10);
    let dRuns = 0;
    let dValue = 0;
    const d = computedN(() => {
      dRuns += 1;
      return b.get() + c.get();
    });
    dValue = d.get();
    expect(dValue).toBe(12); // 2 + 10
    expect(dRuns).toBe(1);
    a.set(2);
    expect(d.get()).toBe(23); // 3 + 20
    expect(dRuns).toBe(2); // 恰一次，不是两次
  });

  it("effect 的 stop：停止后不再触发", () => {
    const a = new SignalN(1);
    let runs = 0;
    const e = effect(() => {
      a.get();
      runs += 1;
    });
    a.set(2);
    expect(runs).toBe(2);
    e.stop();
    a.set(3);
    expect(runs).toBe(2);
  });
});

describe("batch", () => {
  it("一批写只传播一次", () => {
    const a = new SignalN(1);
    const b = new SignalN(2);
    let runs = 0;
    let sum = 0;
    effect(() => {
      sum = a.get() + b.get();
      runs += 1;
    });
    expect(runs).toBe(1);
    batch(() => {
      a.set(10);
      b.set(20);
    });
    expect(runs).toBe(2); // 不是 3
    expect(sum).toBe(30);
  });

  it("嵌套 batch 退出时统一传播", () => {
    const a = new SignalN(0);
    let runs = 0;
    effect(() => {
      a.get();
      runs += 1;
    });
    batch(() => {
      a.set(1);
      batch(() => {
        a.set(2);
      });
      expect(runs).toBe(1); // 内层退出不传播
    });
    expect(runs).toBe(2); // 外层退出才传播
  });
});

describe("ComputedN 依赖重建", () => {
  it("条件依赖切换（分支读不同信号）", () => {
    const mode = new SignalB(false);
    const a = new SignalN(1);
    const b = new SignalN(100);
    const c = computedN(() => (mode.get() ? a.get() : b.get()));
    expect(c.get()).toBe(100);
    a.set(2);
    expect(c.get()).toBe(100); // a 此时不被依赖
    mode.set(true);
    expect(c.get()).toBe(2); // 切到 a 分支
    b.set(200);
    expect(c.get()).toBe(2); // b 已不在依赖里
    a.set(3);
    expect(c.get()).toBe(3);
  });

  it("level 随依赖深度增长", () => {
    const a = new SignalN(1);
    const b = computedN(() => a.get() + 1);
    const c = computedN(() => b.get() + 1);
    expect((a as unknown as { subscriberLevel(): number }).subscriberLevel()).toBe(0);
    expect((b as ComputedN).level).toBe(1);
    expect((c as ComputedN).level).toBe(2);
  });
});
