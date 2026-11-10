/**
 * 大纲章节：阶段 1 里程碑
 * 主题：EventEmitter 测试——传参/返回值、once、off 引用一致性、listeners 拷贝、
 *       maxListeners 警告（spyOn console.warn）、同回调多次注册
 * 运行：npx vitest run exercises/milestone/event-emitter.test.ts
 */
import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { EventEmitter } from './event-emitter';

describe('EventEmitter', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  afterEach(() => {
    warnSpy.mockClear();
  });

  it('注册与触发：参数按 emit 顺序传递', () => {
    const bus = new EventEmitter<{ ping: [number, string] }>();
    const received: Array<[number, string]> = [];
    bus.on('ping', (n, s) => received.push([n, s]));
    bus.emit('ping', 1, 'a');
    bus.emit('ping', 2, 'b');
    expect(received).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('emit 返回值：无监听 false，有监听 true', () => {
    const bus = new EventEmitter();
    expect(bus.emit('ghost')).toBe(false);
    bus.on('ghost', () => undefined);
    expect(bus.emit('ghost')).toBe(true);
    // removeAllListeners 之后又变回 false
    bus.removeAllListeners('ghost');
    expect(bus.emit('ghost')).toBe(false);
  });

  it('once 只触发一次，之后自动移除', () => {
    const bus = new EventEmitter();
    let count = 0;
    bus.once('go', () => count++);
    expect(bus.emit('go')).toBe(true);
    expect(bus.emit('go')).toBe(false); // 唯一监听已被 once 自动移除
    expect(count).toBe(1);
  });

  it('off 移除单个监听（on 注册的）', () => {
    const bus = new EventEmitter();
    const calls: string[] = [];
    const a = () => calls.push('a');
    const b = () => calls.push('b');
    bus.on('evt', a);
    bus.on('evt', b);
    bus.off('evt', a);
    bus.emit('evt');
    expect(calls).toEqual(['b']);
    expect(bus.listenerCount('evt')).toBe(1);
  });

  it('off 能移除 once 注册的原函数（引用一致性）', () => {
    // Node events 的经典坑：once 内部存的是 wrapper，若 off 按存入引用匹配就删不掉。
    // 本实现 entry.raw 记录原函数 → off(原函数) 生效
    const bus = new EventEmitter();
    let fired = 0;
    const handler = () => fired++;
    bus.once('tick', handler);
    bus.off('tick', handler); // 用「原函数」移除
    expect(bus.emit('tick')).toBe(false);
    expect(fired).toBe(0);
    expect(bus.listenerCount('tick')).toBe(0);
  });

  it('off 移除后 once 不再补位：先 once 触发一次，重复 emit 不触发第二次', () => {
    const bus = new EventEmitter();
    const log: number[] = [];
    bus.once('n', (v: number) => log.push(v));
    bus.emit('n', 1);
    bus.emit('n', 2);
    expect(log).toEqual([1]);
  });

  it('removeAllListeners：指定事件只清该事件；不传清空全部', () => {
    const bus = new EventEmitter();
    const a = () => undefined;
    const b = () => undefined;
    bus.on('x', a);
    bus.on('y', b);
    bus.removeAllListeners('x');
    expect(bus.listenerCount('x')).toBe(0);
    expect(bus.listenerCount('y')).toBe(1);
    bus.removeAllListeners();
    expect(bus.listenerCount('y')).toBe(0);
  });

  it('listeners 返回拷贝：外部 push 不影响内部派发', () => {
    const bus = new EventEmitter();
    const original = () => undefined;
    bus.on('k', original);
    const snapshot = bus.listeners('k');
    expect(snapshot).toEqual([original]);
    snapshot.push(() => undefined); // 篡改返回数组
    expect(bus.listenerCount('k')).toBe(1); // 内部不受影响
    expect(bus.listeners('k')).toHaveLength(1);
  });

  it('maxListeners 超限：console.warn 警告一次（setMaxListeners 可调）', () => {
    expect(warnSpy).not.toHaveBeenCalled();
    const bus = new EventEmitter();
    bus.setMaxListeners(2);
    bus.on('hot', () => undefined);
    bus.on('hot', () => undefined);
    expect(warnSpy).not.toHaveBeenCalled(); // 等于上限不警告
    bus.on('hot', () => undefined); // 第 3 个 → 超限
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('hot');
    bus.on('hot', () => undefined); // 仍超限，但同一事件只警告一次
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('setMaxListeners(0)：不限制、不警告（Node 语义）', () => {
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    for (let i = 0; i < 15; i++) bus.on('many', () => undefined);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(bus.listenerCount('many')).toBe(15);
  });

  it('同一回调多次注册：按注册顺序触发多次', () => {
    const bus = new EventEmitter();
    const order: string[] = [];
    const shared = () => order.push('shared');
    bus.on('e', () => order.push('first'));
    bus.on('e', shared);
    bus.on('e', () => order.push('third'));
    bus.on('e', shared); // 同一函数再注册一次 → 触发两次
    bus.emit('e');
    expect(order).toEqual(['first', 'shared', 'third', 'shared']);
  });

  it('emit 过程中 once 自动移除不影响同批其他监听；快照遍历', () => {
    const bus = new EventEmitter();
    const order: string[] = [];
    bus.once('chain', () => {
      order.push('once');
      bus.on('chain', () => order.push('late')); // 本次派发不应触发 late
    });
    bus.on('chain', () => order.push('second'));
    bus.emit('chain');
    expect(order).toEqual(['once', 'second']); // 快照遍历：late 不在本批
    bus.emit('chain');
    // 第二次派发：once 已自动移除；second 是持久监听再次触发；late 在本次生效
    expect(order).toEqual(['once', 'second', 'second', 'late']);
  });

  it('泛型事件表：不同事件互不干扰', () => {
    const bus = new EventEmitter<{ a: [number]; b: [string] }>();
    const got: unknown[] = [];
    bus.on('a', (n: number) => got.push(n));
    bus.on('b', (s: string) => got.push(s));
    bus.emit('b', 'x');
    bus.emit('a', 1);
    expect(got).toEqual(['x', 1]);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });
});
