/**
 * 大纲章节：阶段 1 里程碑
 * 主题：myBind 测试——this 绑定、部分应用、new 语义（BoundFunctionCreate）、length/name、再 bind 无效
 * 运行：npx vitest run exercises/milestone/my-bind.test.ts
 */
import { describe, it, expect } from 'vitest';
import { myBind } from './my-bind';

describe('myBind', () => {
  it('普通调用：this 固定为 thisArg', () => {
    const obj = { tag: 'real-this' };
    function probe(this: any) {
      return this === obj ? this.tag : 'wrong';
    }
    const boundProbe = myBind(probe, obj) as () => string;
    // 无论以什么接收者调用（call 硬塞别的 this），bound 的 this 都不变
    expect(boundProbe()).toBe('real-this');
    expect((boundProbe as any).call({ tag: 'fake' })).toBe('real-this');
  });

  it('部分应用：预置参数在前、调用参数在后', () => {
    function concat3(a: string, b: string, c: string) {
      return `${a}-${b}-${c}`;
    }
    const withAB = myBind(concat3, null, 'A', 'B') as (c: string) => string;
    expect(withAB('C')).toBe('A-B-C');
  });

  it('new 调用：instanceof target 为 true，构造参数正确拼接', () => {
    function Person(this: any, first: string, last: string) {
      this.first = first;
      this.last = last;
    }
    (Person as any).prototype.full = function (this: any) {
      return `${this.first} ${this.last}`;
    };
    const BoundPerson = myBind(Person, null, 'Yuan') as any;
    const p = new BoundPerson('Da');
    expect(p.first).toBe('Yuan');
    expect(p.last).toBe('Da');
    expect(p instanceof Person).toBe(true); // 以 target.prototype 为原型构造
    expect((p as any).full()).toBe('Yuan Da');
  });

  it('new 调用：thisArg 被忽略——绑定的对象不会被写入属性', () => {
    const boundTarget: Record<string, unknown> = {};
    function setName(this: any, name: string) {
      this.name = name; // new 场景下 this 是新实例，不是 boundTarget
    }
    const BoundSetName = myBind(setName, boundTarget) as any;
    const instance = new BoundSetName('li');
    expect(boundTarget.name).toBeUndefined(); // 关键：绑定对象未被污染
    expect(instance.name).toBe('li');
    expect(Object.getPrototypeOf(instance)).toBe(setName.prototype);
  });

  it('new 调用：instanceof bound 也为 true（与原生一致，原型共享方案）', () => {
    function Widget(this: any, id: number) {
      this.id = id;
    }
    const BoundWidget = myBind(Widget, null) as any;
    const w = new BoundWidget(7);
    expect(w instanceof Widget).toBe(true);
    expect(w instanceof BoundWidget).toBe(true); // 原生 bound 的 @@hasInstance 委托给 target
  });

  it('new 调用：构造器返回对象时覆盖实例（与 new 语义一致）', () => {
    const replacement = { replaced: true };
    function Overrides(this: any) {
      this.junk = 'junk';
      return replacement;
    }
    const Bound = myBind(Overrides, null) as any;
    expect(new Bound()).toBe(replacement);
  });

  it('length = max(target.length - 前置参数个数, 0)；name 带 bound 前缀', () => {
    function fourArgs(a: number, b: number, c: number, d: number) {
      return a + b + c + d;
    }
    const noArgs = myBind(fourArgs, null);
    expect(noArgs.length).toBe(4);
    expect((noArgs as { name: string }).name).toBe('bound fourArgs');

    const twoPreset = myBind(fourArgs, null, 1, 2);
    expect(twoPreset.length).toBe(2);

    // 超量预置 → 0，不为负
    const allPreset = myBind(fourArgs, null, 1, 2, 3, 4, 5);
    expect(allPreset.length).toBe(0);
  });

  it('再 bind 无效：第二次 bind 的 thisArg 不生效', () => {
    const obj1 = { v: 'first' };
    const obj2 = { v: 'second' };
    function readThis(this: any) {
      return this.v;
    }
    const b1 = myBind(readThis, obj1) as () => string;
    const b2 = myBind(b1 as unknown as Function, obj2) as () => string;
    // 原理：b2 调用 b1 时以 obj2 为 this，但 b1 是 bound 函数，
    // 其 [[Call]] 永远忽略 this，固定使用自己捕获的 obj1（§10.4.1.3）
    expect(b2()).toBe('first');
  });

  it('作为构造器时原型链正确：实例能访问 target.prototype 上的方法', () => {
    function Queue(this: any) {
      this.items = [] as number[];
    }
    (Queue as any).prototype.push = function (this: any, v: number) {
      this.items.push(v);
      return this.items.length;
    };
    const BoundQueue = myBind(Queue, null) as any;
    const q = new BoundQueue();
    expect((q as any).push(1)).toBe(1);
    expect((q as any).push(2)).toBe(2);
    expect(Object.getPrototypeOf(q)).toBe(Queue.prototype);
    expect(Object.getPrototypeOf(q).constructor).toBe(Queue);
  });
});
