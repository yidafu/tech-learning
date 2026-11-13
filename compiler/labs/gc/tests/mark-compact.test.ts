import { describe, expect, it } from 'vitest';
import { CompactHeap } from '../src/mark-compact';
import { assertNoDangling } from '../src/core';

describe('两指滑动整理（Lisp v2）', () => {
  it('整理后无空洞：堆压成 0..n-1，相对顺序保持', () => {
    const h = new CompactHeap();
    const r = h.addRoot();
    const a = h.alloc('a', 1, 1);
    h.alloc('dead1', 1, 0); // 空洞 1
    const b = h.alloc('b', 1, 1);
    h.writeRef(b, 0, a);
    h.alloc('dead2', 1, 0); // 空洞 2
    h.roots[r] = b; // a 经 b 可达；两个 dead 无根
    const aid = h.node(a).id;
    const bid = h.node(b).id;
    const rep = h.collect();
    expect(rep.reclaimed).toBe(2);
    expect(h.usedSlots).toBe(2);
    expect(h.heapLength).toBe(2); // 无空洞的直接证据：堆长 = 存活数
    expect(h.node(0).id).toBe(aid); // 排头是 a（原相对顺序）
    expect(h.node(1).id).toBe(bid);
    expect(h.node(h.node(1).children[0]!).id).toBe(aid); // b→a 边更新到滑动后的地址
  });

  it('深链引用全部更新到位：整理后无悬垂', () => {
    const h = new CompactHeap();
    const r = h.addRoot();
    const d = h.alloc('d', 1, 0);
    const c = h.alloc('c', 1, 1);
    h.writeRef(c, 0, d);
    h.alloc('dead', 1, 0);
    const b = h.alloc('b', 1, 1);
    h.writeRef(b, 0, c);
    const a = h.alloc('a', 1, 1);
    h.writeRef(a, 0, b);
    h.roots[r] = a;
    h.collect();
    assertNoDangling(h); // 四遍扫描改指针的正确性全靠这一条兜住
    expect(h.usedSlots).toBe(4);
  });

  it('整理后分配继续接在堆顶（地址一直稠密）', () => {
    const h = new CompactHeap();
    const r = h.addRoot();
    h.roots[r] = h.alloc('live', 1, 0);
    h.alloc('dead', 1, 0);
    h.collect();
    const fresh = h.alloc('fresh', 1, 0);
    expect(fresh).toBe(1); // 堆顶 = 上轮 free 指针
    expect(h.usedSlots).toBe(2);
    expect(h.heapLength).toBe(2);
  });

  it('两轮整理：每轮都从稠密堆出发，无累积碎片', () => {
    const h = new CompactHeap();
    const r = h.addRoot();
    for (let round = 0; round < 2; round++) {
      h.roots[r] = h.alloc('keep', 1, 0);
      h.alloc('dead', 1, 0);
      h.collect();
      expect(h.usedSlots).toBe(h.heapLength);
    }
    expect(h.usedSlots).toBe(1); // keep 每轮换新，旧的被滑掉
    assertNoDangling(h);
  });
});
