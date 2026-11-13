import { describe, expect, it } from 'vitest';
import { RefCountHeap } from '../src/refcount';
import { assertNoDangling } from '../src/core';

describe('引用计数的进化', () => {
  it('朴素 RC：非环垃圾释放即回收（确定性析构）', () => {
    const h = new RefCountHeap('naive');
    const r = h.addRoot();
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 0);
    h.setRoot(r, a);
    h.writeRef(a, 0, b); // a→b：b.rc = 1
    expect(h.isLive(b)).toBe(true);
    h.writeRef(a, 0, null); // 覆盖旧值：b 归零当场回收
    expect(h.isLive(b)).toBe(false);
    h.setRoot(r, null);
    expect(h.isLive(a)).toBe(false);
  });

  it('朴素 RC：环泄漏——先连环再断根，计数互守永不归零', () => {
    // 次序关键：先把环连上（计数互守到 2），再断根（1）——互守锁死
    const h = new RefCountHeap('naive');
    const ra = h.addRoot();
    const rb = h.addRoot();
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 1);
    h.setRoot(ra, a);
    h.setRoot(rb, b);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a); // 环成：rc 2/2
    h.setRoot(ra, null); // 1
    h.setRoot(rb, null); // 1——双双永生
    expect(h.isLive(a)).toBe(true);
    expect(h.isLive(b)).toBe(true);
  });

  it('试删法相 1+2+3：无根环整环回收', () => {
    const h = new RefCountHeap('naive');
    const ra = h.addRoot();
    const rb = h.addRoot();
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 1);
    h.setRoot(ra, a);
    h.setRoot(rb, b);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a);
    h.setRoot(ra, null);
    h.setRoot(rb, null);
    const freed = h.collectCycles([a, b]);
    expect(freed).toBe(2);
    expect(h.isLive(a)).toBe(false);
    expect(h.isLive(b)).toBe(false);
  });

  it('试删法 scan 相：外部根引用让整环复活，计数恢复到真值', () => {
    const h = new RefCountHeap('naive');
    const ra = h.addRoot();
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 1);
    h.setRoot(ra, a);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a); // rc：a=2（根+b），b=1
    const freed = h.collectCycles([a, b]);
    expect(freed).toBe(0);
    expect(h.isLive(a) && h.isLive(b)).toBe(true);
    expect(h.node(a).rc).toBe(2); // trial delete 的减一被 scanBlack 精确恢复
    expect(h.node(b).rc).toBe(1);
    assertNoDangling(h);
  });

  it('试删法 collectWhite 相：死环发出的边同步减外部对象计数', () => {
    const h = new RefCountHeap('naive');
    const r = h.addRoot();
    const external = h.alloc('external', 1, 0);
    h.setRoot(r, external); // rc = 1
    const a = h.alloc('a', 1, 1);
    const b = h.alloc('b', 1, 2); // 两个字段：环边 + 指向外部
    const rb = h.addRoot();
    h.setRoot(rb, a);
    h.writeRef(a, 0, b);
    h.writeRef(b, 0, a);
    h.writeRef(b, 1, external); // 环 → 外部：rc(external) = 2
    h.setRoot(rb, null); // 断根
    expect(h.node(external).rc).toBe(2);
    const freed = h.collectCycles([a, b]);
    expect(freed).toBe(2);
    expect(h.isLive(external)).toBe(true);
    expect(h.node(external).rc).toBe(1); // collectWhite 顺手把环发出的边减掉
    assertNoDangling(h);
  });

  it('延迟 RC（Deutsch–Bobrow）：栈写免税，安全点 ZCT 核对回收', () => {
    const h = new RefCountHeap('deferred');
    const r = h.addRoot();
    const x = h.alloc('x', 1, 0);
    h.setRoot(r, x); // 栈写：零计数动作
    expect(h.stats.retains).toBe(0); // 赋值税大头归零
    expect(h.isLive(x)).toBe(true);
    const y = h.alloc('y', 1, 0); // 无根垃圾，rc = 0，在候选集里
    h.setRoot(r, null); // x 也成候选
    const freed = h.scanZCT(); // 安全点核对
    expect(freed).toBe(2); // x、y 一起收
    expect(h.isLive(x)).toBe(false);
    expect(h.isLive(y)).toBe(false);
  });

  it('延迟 RC：候选对象被栈引用时，核对后复活', () => {
    const h = new RefCountHeap('deferred');
    const r1 = h.addRoot();
    const r2 = h.addRoot();
    const shared = h.alloc('shared', 1, 0);
    h.setRoot(r1, shared);
    h.setRoot(r2, shared); // 两个栈槽同指
    h.setRoot(r1, null); // 候选化——但 r2 还拿着
    h.scanZCT();
    expect(h.isLive(shared)).toBe(true); // 核对把栈引用数回去
  });

  it('合并 RC（Hughes）：写一千次，结一次净账', () => {
    const h = new RefCountHeap('coalescing');
    const r = h.addRoot();
    const p = h.alloc('p', 1, 1);
    h.setRoot(r, p); // 根写当场计税（coalescing 只缓冲堆内写）
    const tmp = h.alloc('tmp', 1, 0);
    const rt = h.addRoot();
    h.setRoot(rt, tmp);
    h.writeRef(p, 0, tmp);
    h.flushJournal(); // 先结一次基准账：p.f → tmp
    expect(h.node(tmp).rc).toBe(2);
    const retainsBefore = h.stats.retains;
    // 循环覆写：净效果只有一次（旧值减一、tmp 加一），中间全白干
    for (let i = 0; i < 1000; i++) h.writeRef(p, 0, tmp);
    expect(h.journal.length).toBe(1000);    // 全被缓冲，没结一次税
    expect(h.stats.retains).toBe(retainsBefore); // 税递延的证据
    const freed = h.flushJournal(); // 净账：tmp +1000 −1000 = 不动
    expect(h.journal.length).toBe(0);
    expect(h.isLive(tmp)).toBe(true);
    expect(h.node(tmp).rc).toBe(2); // p.f + 根，分毫不差
    expect(freed).toBe(0);
  });

  it('合并 RC：中间值净效果归零，结账后正确释放', () => {
    const h = new RefCountHeap('coalescing');
    const r = h.addRoot();
    const p = h.alloc('p', 1, 1);
    h.setRoot(r, p);
    const a = h.alloc('a', 1, 0);
    const ra = h.addRoot();
    h.setRoot(ra, a); // a 有根，rc = 1
    const b = h.alloc('b', 1, 0);
    const c = h.alloc('c', 1, 0);
    h.writeRef(p, 0, b); // 三连写：null→b→c→a
    h.writeRef(p, 0, c);
    h.writeRef(p, 0, a);
    // 结账前：b、c 物理上已不在 p.f，但计数未动——生命全靠流水账吊着
    expect(h.isLive(b) && h.isLive(c)).toBe(true);
    expect(h.node(b).rc).toBe(0);
    expect(h.node(c).rc).toBe(0);
    h.flushJournal(); // 净账：a +1（无减项）；b、c 各 +1−1 = 0 → 释放
    expect(h.isLive(a)).toBe(true);
    expect(h.node(a).rc).toBe(2); // 根 + p.f
    expect(h.isLive(b)).toBe(false);
    expect(h.isLive(c)).toBe(false);
    expect(h.stats.journalFlushes).toBe(1);
    assertNoDangling(h);
  });
});
