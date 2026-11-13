import { describe, expect, it } from 'vitest';
import { GenerationalHeap } from '../src/generational';
import { assertNoDangling, churn, mulberry32 } from '../src/core';

describe('分代回收', () => {
  it('minor GC 不碰老年代：扫描源只有根 + remembered set', () => {
    const h = new GenerationalHeap();
    const r = h.addRoot();
    h.roots[r] = h.alloc('old1', 4, 1);
    h.minorThreshold = 1e9; // 关掉自动 minor，手工控制节奏
    h.minorGC();            // old1 晋升
    for (let i = 0; i < 5; i++) h.alloc(`junk${i}`, 2, 0);
    const young1 = h.alloc('young1', 2, 0);
    h.roots[r] = young1;
    const rep = h.minorGC('manual');
    expect(h.lastMinor.oldTraversed).toBe(0);  // 老年代本体一步未碰——分代的全部卖点
    expect(h.lastMinor.rootRefs).toBe(1);
    expect(h.lastMinor.promoted).toBe(1);      // 只有 young1
    expect(rep.reclaimed).toBe(5);
    expect(h.isLive(young1)).toBe(true);
  });

  it('写屏障登记 old→young 边：minor GC 据此保住新对象', () => {
    const h = new GenerationalHeap();
    h.minorThreshold = 1e9;
    const r = h.addRoot();
    const oldHost = h.alloc('oldHost', 2, 1);
    h.roots[r] = oldHost;
    h.minorGC(); // oldHost 入老代
    const young = h.alloc('young', 2, 0); // 无根，但即将被老代引用
    h.writeRef(oldHost, 0, young);        // 老 → 新：屏障登记
    expect(h.remembered.size).toBe(1);
    const rep = h.minorGC('manual');
    expect(h.lastMinor.rememberedHosts).toBe(1);
    expect(h.isLive(young)).toBe(true);   // 登记边救了它
    expect(rep.reclaimed).toBe(0);
    assertNoDangling(h);
  });

  it('屏障关闭（存在性证明）：同一场景新对象被误收、老代悬垂', () => {
    const h = new GenerationalHeap();
    h.minorThreshold = 1e9;
    const r = h.addRoot();
    const oldHost = h.alloc('oldHost', 2, 1);
    h.roots[r] = oldHost;
    h.minorGC();
    const young = h.alloc('young', 2, 0);
    h.barrierEnabled = false;             // ← 把屏障删掉，用例必须红
    h.writeRef(oldHost, 0, young);        // 老 → 新，没人登记
    h.barrierEnabled = true;
    h.minorGC('manual');
    expect(h.isLive(young)).toBe(false);  // 误收
    expect(() => assertNoDangling(h)).toThrow(/悬垂/); // 老代拿着悬垂指针
  });

  it('晋升后 old→old 边不再进 remembered set', () => {
    const h = new GenerationalHeap();
    h.minorThreshold = 1e9;
    const r = h.addRoot();
    const o1 = h.alloc('o1', 2, 1);
    h.roots[r] = o1;
    h.minorGC();
    const o2 = h.alloc('o2', 2, 0);
    h.roots[r] = o2;
    h.minorGC(); // o2 也晋升
    h.writeRef(o1, 0, o2); // 老 → 老：不登记
    expect(h.remembered.size).toBe(0);
  });

  it('major GC 全堆回收两代垃圾', () => {
    const h = new GenerationalHeap();
    h.minorThreshold = 1e9;
    const r = h.addRoot();
    const keepOld = h.alloc('keepOld', 2, 0);
    h.roots[r] = keepOld;
    h.minorGC(); // 晋升
    h.alloc('deadYoung', 2, 0);
    h.alloc('deadOld2', 2, 0);
    h.minorGC(); // 两个死对象当场下葬（reclaimed 2）
    const keepYoung = h.alloc('keepYoung', 2, 1);
    h.roots[r] = keepYoung;
    h.writeRef(keepYoung, 0, keepOld); // 跨代活链：老代经由新代根保持可达
    const rep = h.majorGC('manual');
    expect(h.isLive(keepOld)).toBe(true);
    assertNoDangling(h);
    expect(rep.survivors).toBe(2); // keepOld + keepYoung，两代里无根的全没了
  });

  it('分代假说：churn 下绝大多数对象死在新代', () => {
    const h = new GenerationalHeap();
    h.minorThreshold = 1e9; // 关自动 minor：500 次分配后一次总清
    for (let i = 0; i < 8; i++) h.addRoot();
    churn(h, mulberry32(7), 500, { fields: 3, size: 16 });
    const rep = h.minorGC('manual');
    // 500 次分配里只有极少数活到晋升——"朝生暮死"的统计证据
    expect(h.lastMinor.promoted).toBeLessThan(60);
    expect(rep.reclaimed).toBeGreaterThan(150);
    assertNoDangling(h);
  });
});
