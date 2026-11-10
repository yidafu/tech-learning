/**
 * 大纲章节：阶段 1 里程碑
 * 主题：myNew 测试——实例化、返回值覆盖/忽略、原型链、class 边界、new.target
 * 运行：npx vitest run exercises/milestone/my-new.test.ts
 */
import { describe, it, expect } from 'vitest';
import { myNew } from './my-new';

describe('myNew', () => {
  it('正常实例化：实例属性、原型方法、instanceof 都正确', () => {
    function Dog(this: any, name: string, age: number) {
      this.name = name;
      this.age = age;
    }
    (Dog as any).prototype.bark = function (this: any) {
      return `${this.name}(${this.age}) wang!`;
    };
    // 带 this 参数的 function 声明没有构造签名，需要显式转换成构造器类型
    const DogCtor = Dog as unknown as new (name: string, age: number) => any;
    const d = myNew(DogCtor, 'wangcai', 3);
    expect(d.name).toBe('wangcai');
    expect(d.age).toBe(3);
    expect(d.bark()).toBe('wangcai(3) wang!');
    expect(d instanceof Dog).toBe(true);
  });

  it('构造器返回对象 → 覆盖 this：结果就是那个对象', () => {
    const returned = { replaced: true };
    function Overrides(this: any) {
      this.mark = 'on-this';
      return returned;
    }
    const OverridesCtor = Overrides as unknown as new () => any;
    const r = myNew(OverridesCtor);
    expect(r).toBe(returned);
    expect(r.mark).toBeUndefined(); // this 上写的东西全被丢弃
  });

  it('构造器返回原始值 → 被忽略，返回 this 实例', () => {
    function Returns42(this: any) {
      this.kept = 'me';
      return 42;
    }
    const r = myNew(Returns42 as unknown as new () => any);
    expect(r.kept).toBe('me');
    expect(r).not.toBe(42);
    expect(r instanceof Returns42).toBe(true);

    // 返回 null（typeof object 但是 Null 类型）：原生 new 语义中 null 是原始值之一 → 忽略
    function ReturnsNull(this: any) {
      this.here = true;
      return null;
    }
    const rn = myNew(ReturnsNull as unknown as new () => any);
    expect(rn.here).toBe(true);
    expect(rn instanceof ReturnsNull).toBe(true);
  });

  it('原型链正确：getPrototypeOf === Ctor.prototype，constructor 回指', () => {
    function Thing(this: any) {
      this.v = 1;
    }
    const t = myNew(Thing as unknown as new () => any);
    expect(Object.getPrototypeOf(t)).toBe(Thing.prototype);
    expect(Object.getPrototypeOf(t).constructor).toBe(Thing);
  });

  it('对 class 使用 myNew → TypeError（[[IsClassConstructor]] 不能被 call）', () => {
    class OnlyNewable {
      constructor(public v: number) {}
    }
    expect(() => myNew(OnlyNewable as unknown as new (...args: any[]) => OnlyNewable, 1)).toThrow(
      TypeError,
    );
  });

  it('new.target 对比：myNew 内为 undefined；new / Reflect.construct 中为构造器本身', () => {
    const seen: (string | undefined)[] = [];
    function Probe(this: any) {
      seen.push(new.target === undefined ? undefined : new.target.name);
    }
    const ProbeCtor = Probe as unknown as new () => void;
    myNew(ProbeCtor); // 走 apply → [[Call]]：new.target === undefined
    new ProbeCtor(); // 真正的 new → new.target === Probe
    Reflect.construct(ProbeCtor, []); // [[Construct]] 显式入口 → new.target === Probe
    expect(seen).toEqual([undefined, 'Probe', 'Probe']);
  });
});
