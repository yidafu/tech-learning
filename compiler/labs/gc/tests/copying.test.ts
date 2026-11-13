import { describe, expect, it } from 'vitest';
import { CopyHeap } from '../src/copying';
import { assertNoDangling } from '../src/core';

describe('Cheney 半空间复制', () => {
  it('菱形共享只搬一次：转发指针去重', () => {
    const h = new CopyHeap(64);
    const z = h.alloc('z', 1, 0);
    const zid = h.node(z).id;
    const x = h.alloc('x', 1, 1);
    h.writeRef(x, 0, z);
    const y = h.alloc('y', 1, 1);
    h.writeRef(y, 0, z);
    const rx = h.addRoot();
    h.roots[rx] = x;
    const ry = h.addRoot();
    h.roots[ry] = y;
    const rep = h.collect();
    expect(rep.reclaimed).toBe(0);
    const nx = h.node(h.roots[rx]!);
    const ny = h.node(h.roots[ry]!);
    expect(nx.children[0]).toBe(ny.children[0]); // 同一新地址：搬一次，不是两次
    expect(h.node(nx.children[0]!).id).toBe(zid); // id 稳定：同一对象的新家
    expect(rep.survivors).toBe(3);
    assertNoDangling(h);
  });

  it('有根环整体搬家一次，垃圾原地弃置', () => {
    const h = new CopyHeap(64);
    const ra = h.addRoot();
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 1);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a); // 环
    h.roots[ra] = a;
    h.alloc('junk', 1, 0); // 无根垃圾
    const aid = h.node(a).id;
    const bid = h.node(b).id;
    const rep = h.collect();
    expect(rep.reclaimed).toBe(1);
    expect(rep.survivors).toBe(2);
    const na = h.roots[ra]!;
    expect(h.node(na).id).toBe(aid); // a 已搬家但身份不变
    expect(h.node(h.node(na).children[0]!).id).toBe(bid); // 环边同步指向 b 的新家
    assertNoDangling(h);
  });

  it('bump 分配 O(1)：top 恰好按对象数推进，无空闲表', () => {
    const h = new CopyHeap(64);
    for (let i = 0; i < 3; i++) h.alloc(`o${i}`, 1, 0);
    expect(h.top).toBe(3);
    const before = h.top;
    h.alloc('one-more', 1, 0);
    expect(h.top).toBe(before + 1); // 分配只是碰头，没有任何回收逻辑介入
  });

  it('翻面后地址语义更新：根指向 to-space 新地址', () => {
    const h = new CopyHeap(64);
    h.alloc('junk', 1, 0); // addr 0：无根，不参与复制
    const r = h.addRoot();
    const old = h.alloc('old', 1, 0); // addr 1
    h.roots[r] = old;
    h.collect(); // old 搬到 to-space 的 0 号位
    expect(h.roots[r]).not.toBe(old);  // 根已改写为新家地址（1 → 0）
    expect(h.roots[r]).toBe(0);        // to-space 压到堆底
    expect(h.node(h.roots[r]!).label).toBe('old');
    expect(h.isLive(old)).toBe(false); // 旧地址翻面后为空
  });

  it('50% 税：存活集超过单半空间容量 → OOM', () => {
    const h = new CopyHeap(8);
    const slots: number[] = [];
    for (let i = 0; i < 8; i++) slots.push(h.addRoot());
    for (let i = 0; i < 8; i++) h.roots[slots[i]] = h.alloc(`keep${i}`, 1, 0); // 八个根各持一个，全活
    expect(() => h.alloc('boom', 1, 0)).toThrow(/OOM|半空间/);
  });
});
