import { describe, expect, it } from 'vitest';
import { BarrierKind, IncrementalHeap } from '../src/incremental';
import { Addr, assertNoDangling, churn, mulberry32 } from '../src/core';

/**
 * 03 册《屏障与并发标记》事故表的可执行回放：
 * 初态 A（黑，已扫完）、B（白，未访问）、C（灰，待扫且子边未扫）；
 * mutator 两步合谋——步骤 1 `A.f = B`（黑指白），步骤 2 `C.f = null`（撤走灰遮护）；
 * 标记收尾 → B 被误收，A 悬垂。
 * 根顺序 [C, A] + stepBudget=1：第一步恰好只把 A 弹黑，C 还没扫。
 */
function incident(h: IncrementalHeap): Addr {
  const b = h.alloc('B', 2, 1);
  const a = h.alloc('A', 2, 1);
  const c = h.alloc('C', 2, 1);
  const rc = h.addRoot();
  h.roots[rc] = c;
  const ra = h.addRoot();
  h.roots[ra] = a;
  h.writeRef(c, 0, b);    // 前置边：C→B 存在但 C 未扫（ Yuasa 删除屏障拦的就是它的消失）
  h.beginMark();          // 根入灰：grayWork = [C, A]
  h.step();               // 弹 A → A 黑；C 仍未扫
  h.writeRef(a, 0, b);    // 步骤 1：黑指白，不变式已破但没人知道
  h.writeRef(c, 0, null); // 步骤 2：B 的最后灰遮护撤走
  while (!h.step()) {
    /* 跑完标记 */
  }
  return b;
}

describe('屏障与并发标记：事故表 × 屏障族谱', () => {
  it('无屏障：B 被误收，A 悬垂（事故复现，必红）', () => {
    const h = new IncrementalHeap();
    h.barrier = 'none';
    h.stepBudget = 1;
    const b = incident(h);
    expect(h.isLive(b)).toBe(false);          // 事故表第 4 步：B 被当成垃圾
    expect(() => assertNoDangling(h)).toThrow(/悬垂/); // A.f 成了悬垂指针
  });

  for (const kind of ['dijkstra', 'steele', 'yuasa', 'hybrid'] as const) {
    it(`${kind} 屏障：B 存活，无悬垂（把屏障装回，必须绿）`, () => {
      const h = new IncrementalHeap();
      h.barrier = kind satisfies BarrierKind;
      h.stepBudget = 1;
      const b = incident(h);
      expect(h.isLive(b)).toBe(true);
      assertNoDangling(h);
    });
  }

  it('三色不变式校验器：none 中途黑指白被抓，hybrid 全程干净', () => {
    const setup = (barrier: BarrierKind) => {
      const h = new IncrementalHeap();
      h.barrier = barrier;
      h.stepBudget = 1;
      const white = h.alloc('W', 2, 0); // 常驻白：无根、暂无人指向（不能临时 alloc——黑分配会让它生而为黑）
      const chainEnd = h.alloc('c3', 2, 0);
      const c2 = h.alloc('c2', 2, 1);
      h.writeRef(c2, 0, chainEnd);
      const c1 = h.alloc('c1', 2, 1);
      h.writeRef(c1, 0, c2);
      const k = h.alloc('K', 2, 1);
      const rc1 = h.addRoot();
      h.roots[rc1] = c1; // 链根在前：入灰序 [c1, K]，弹序 K 先——K 变黑后标记仍未完
      const rk = h.addRoot();
      h.roots[rk] = k;
      h.beginMark();
      h.step(); // 只弹 K → K 黑；c1 链还没扫 → phase 仍是 marking
      return { h, white, k };
    };
    const bad = setup('none');
    bad.h.writeRef(bad.k, 0, bad.white); // 黑指白，无屏障拦截
    expect(() => bad.h.assertTriColorInvariant()).toThrow(/黑指白/);

    const good = setup('hybrid');
    good.h.writeRef(good.k, 0, good.white); // 屏障当场置灰
    expect(() => good.h.assertTriColorInvariant()).not.toThrow();
  });

  it('SATB 浮动垃圾：标记开始后断根者缓刑一轮', () => {
    const h = new IncrementalHeap();
    h.barrier = 'yuasa';
    const r = h.addRoot();
    const x = h.alloc('x', 2, 0);
    h.roots[r] = x;
    h.beginMark();
    h.roots[r] = null;        // 标记期断根
    while (!h.step()) {
      /* */
    }
    expect(h.isLive(x)).toBe(true); // 快照时刻可达 → 保过本轮（浮动垃圾）
    h.collect('manual');            // 下一轮：真死
    expect(h.isLive(x)).toBe(false);
  });

  it('黑分配：标记期新生对象本轮免死，下轮按可达性处理', () => {
    const h = new IncrementalHeap();
    h.barrier = 'hybrid';
    const r = h.addRoot();
    h.roots[r] = h.alloc('anchor', 2, 0);
    h.beginMark();
    const fresh = h.alloc('fresh', 2, 0); // 标记期分配：生而为黑
    expect(h.colorOf(fresh)).toBe('black');
    while (!h.step()) {
      /* */
    }
    expect(h.isLive(fresh)).toBe(true);   // 黑分配：绝不误收——宁可浮动
    h.collect('manual');
    expect(h.isLive(fresh)).toBe(false);  // 下轮没人引用 → 正常回收
  });

  it('压力模式（--stress-gc 教学版）：预算=1 高频步进，停顿上界 + 正确性', () => {
    const h = new IncrementalHeap();
    h.barrier = 'hybrid';
    h.stepBudget = 1; // 把竞态窗口拉到最大
    h.markEvery = 1;
    h.nextGC = 64;    // 小阈值：压力测试里多开几个增量周期
    for (let i = 0; i < 8; i++) h.addRoot();
    let invariantHits = 0;
    churn(h, mulberry32(13), 2000, {
      fields: 3,
      size: 16,
      tick: () => {
        h.gcTick();
        try {
          h.assertTriColorInvariant(); // 不变式断言常驻在每次变异之后
        } catch {
          invariantHits++;
        }
      },
    });
    while (h.phase === 'marking') h.step(); // 收尾：标记必须终止
    expect(h.stats.cycles).toBeGreaterThan(0);          // 增量真的在跑
    expect(h.phase).toBe('idle');
    expect(h.stats.maxStep).toBeLessThanOrEqual(1);     // 停顿上界 = 预算（"一次 = 数个对象出队"）
    expect(invariantHits).toBe(0);                      // 混合屏障：全程无黑指白
    assertNoDangling(h);                                // 无误收
  });

  it('无屏障在压力模式下必然出鬼（同负载对照：删屏障必红）', () => {
    const h = new IncrementalHeap();
    h.barrier = 'none'; // 与上一用例同一份负载（seed 13、2000 ops），只换屏障
    h.stepBudget = 1;
    h.markEvery = 1;
    h.nextGC = 64;
    for (let i = 0; i < 8; i++) h.addRoot();
    let invariantHits = 0;
    churn(h, mulberry32(13), 2000, {
      fields: 3,
      size: 16,
      tick: () => {
        h.gcTick();
        try {
          h.assertTriColorInvariant();
        } catch {
          invariantHits++;
        }
      },
    });
    while (h.phase === 'marking') h.step();
    expect(h.stats.cycles).toBeGreaterThan(0);
    expect(invariantHits).toBeGreaterThan(0); // 黑指白真的发生过——不是运气好躲过去
    // 同一份负载：屏障删掉必红——否则测试什么都没证明
    expect(() => assertNoDangling(h)).toThrow(/悬垂/);
  });

  it('根重扫兜底：标记期改栈根（免屏障路径）不丢对象', () => {
    const h = new IncrementalHeap();
    h.barrier = 'hybrid';
    h.stepBudget = 1;
    const late = h.alloc('late', 2, 0);
    const r = h.addRoot();
    h.roots[r] = h.alloc('anchor', 2, 0);
    h.beginMark();
    h.roots[r] = late; // 栈根写入不走屏障——堆侧屏障管不到这里
    while (!h.step()) {
      /* */
    }
    expect(h.isLive(late)).toBe(true); // 收尾根重扫把它捞回来
    assertNoDangling(h);
  });
});
