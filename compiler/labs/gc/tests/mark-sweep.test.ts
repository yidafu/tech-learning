import { describe, expect, it } from 'vitest';
import { MarkSweepHeap } from '../src/mark-sweep';
import { assertNoDangling } from '../src/core';

describe('整体式标记-清除', () => {
  it('可达图存活：根→链→叶全活', () => {
    const h = new MarkSweepHeap();
    const leaf = h.alloc('leaf', 8, 0);
    const mid = h.alloc('mid', 8, 1);
    h.writeRef(mid, 0, leaf);
    const root = h.alloc('root', 8, 1);
    h.writeRef(root, 0, mid);
    const r = h.addRoot();
    h.roots[r] = root;
    const rep = h.collect('manual');
    expect(rep.reclaimed).toBe(0);
    expect(rep.survivors).toBe(3);
    assertNoDangling(h);
  });

  it('循环引用：断根后回收，追踪对环无感（验收一）', () => {
    const h = new MarkSweepHeap();
    const a = h.alloc('a', 8, 1);
    const b = h.alloc('b', 8, 1);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a); // 环成
    const ra = h.addRoot();
    h.roots[ra] = a;
    const rep1 = h.collect();
    expect(rep1.reclaimed).toBe(0); // 有根：环活着
    h.roots[ra] = null;             // 断根
    const rep2 = h.collect();
    expect(rep2.reclaimed).toBe(2); // 双双下葬
    expect(h.isLive(a)).toBe(false);
    expect(h.isLive(b)).toBe(false);
    assertNoDangling(h);
  });

  it('黑白翻转：连续两轮回收，存活集不被上一轮 mark 位误保', () => {
    // 经典 bug 对照：若不翻 epoch，第二轮把上一轮的"黑"当已标 → 活对象被清
    const h = new MarkSweepHeap();
    const r = h.addRoot();
    const keep = h.alloc('keep', 8, 1);
    h.roots[r] = keep;
    h.collect();
    h.alloc('junk', 8, 0); // 未挂根的新垃圾
    const rep2 = h.collect();
    expect(h.isLive(keep)).toBe(true);
    expect(rep2.reclaimed).toBe(1);
  });

  it('生而为白：新分配对象绝不被上一轮 mark 位误保', () => {
    const h = new MarkSweepHeap();
    const r = h.addRoot();
    h.roots[r] = h.alloc('x', 8, 0);
    h.collect(); // epoch 已推进
    const fresh = h.alloc('fresh', 8, 0);
    h.collect();
    expect(h.isLive(fresh)).toBe(false); // 若 markEpoch 初值错，这里会诈尸
  });

  it('自适应阈值：回收后 nextGC = max(存活×2, 初始)', () => {
    const h = new MarkSweepHeap();
    h.nextGC = 1 << 10;
    const r = h.addRoot();
    for (let i = 0; i < 5; i++) h.roots[r] = h.alloc('x', 8, 0); // 前四个当场变垃圾
    h.collect('threshold');
    expect(h.nextGC).toBe(Math.max(h.bytes * 2, 1 << 10));
    expect(h.nextGC).toBeGreaterThanOrEqual(1 << 10);
  });

  it('trace 日志字段齐全（对照 --trace-gc 输出格式）', () => {
    const h = new MarkSweepHeap();
    h.alloc('junk', 8, 0);
    h.collect('threshold');
    expect(h.events[0]).toMatch(
      /\[gc:threshold\] work \d+ \| alive \d+ objs \(\d+B\) \| reclaimed \d+ \| threshold \d+B/,
    );
  });

  it('悬垂检测器抓到"指向已回收地址"的引用（事故表第 4 步常驻化）', () => {
    const h = new MarkSweepHeap();
    const r = h.addRoot();
    const host = h.alloc('host', 8, 1);
    h.roots[r] = host;
    const dead = h.alloc('dead', 8, 0);
    h.collect(); // dead 被回收
    h.node(host).children[0] = dead; // 模拟野指针写入（绕过 writeRef 的真实悬垂）
    expect(() => assertNoDangling(h)).toThrow(/悬垂/);
  });
});
