/**
 * 大纲章节：阶段 3.5 延伸——结构类型的例外：private 名义化 / 多态 this / mixin
 * 主题：private 同源检查、Builder 链式（: this）、Constructor<T> mixin 组装、typeof C 静态侧
 * 运行：npx tsx exercises/ts-classes-interfaces/02-nominal-this-mixin.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-classes-interfaces/02-nominal-this-mixin.ts
 * 预期输出：
 * x1/IA 放行 = a
 * x4/对象字面量 = obj
 * Builder 链式 = x<b><>y
 * mixin 组装 = name=t/&tag=none/timestamp=有
 * 静态侧 origin = (0,0)
 */

export {};

// ============================================================
// 一、private 同源：两个结构相同的类互不兼容（预测题 1 的实证）
// ============================================================

class A {
  private id = 1;
  hello(): string {
    return 'a';
  }
}
class B {
  private id = 2;
  hello(): string {
    return 'b';
  }
}
interface IA {
  hello(): string;
}

const x1: IA = new A(); // 通过：IA 没有 private 要求
// @ts-expect-error —— separate declarations of a private property 'id'（同源检查不通过）
const x2: A = new B();
// @ts-expect-error —— 同上，方向反过来也不行
const x3: B = new A();
const x4: IA = { hello: () => 'obj' }; // 通过：纯结构接口，字面量满足形状

console.log(`x1/IA 放行 = ${x1.hello()}`);
console.log(`x4/对象字面量 = ${x4.hello()}`);

// ============================================================
// 二、多态 this：链式 API 不因继承降级
// ============================================================

class Builder {
  protected parts: string[] = [];
  add(p: string): this {
    this.parts.push(p); // 返回 this：调用者是哪个子类，返回的就是哪个子类
    return this;
  }
  build(): string {
    return this.parts.join('');
  }
}
class HtmlBuilder extends Builder {
  bold(): this {
    return this.add('<b>');
  }
  wrap(): this {
    return this.add('<').add('>');
  }
}
const html = new HtmlBuilder().add('x').bold().wrap().add('y');
// 若 add 返回写死 Builder，.bold() 之后的 .wrap() 直接报错——多态 this 保住整条链的类型
console.log(`Builder 链式 = ${html.build()}`);

// ============================================================
// 三、mixin：Constructor<T> + 交叉组装
// ============================================================

// any[] 而非 never[]：这个类型在 mixin 里要被「调用」（new Item('t') 传实参）——
// never[] 只适合逆变约束位（对照 ts-type-challenges/04 的 curry 签名，那里从不 new 它）
type Constructor<T = {}> = new (...args: any[]) => T;

function WithTimestamp<B extends Constructor>(Base: B) {
  return class extends Base {
    timestamp = Date.now();
  };
}
function WithTag<B extends Constructor>(Base: B) {
  return class extends Base {
    tag = 'none';
  };
}

class Plain {
  constructor(public name: string) {}
}
const Item = WithTag(WithTimestamp(Plain));
const it = new Item('t');
console.log(`mixin 组装 = name=${it.name}/&tag=${it.tag}/timestamp=${it.timestamp > 0 ? '有' : '无'}`);

// ============================================================
// 四、typeof C 静态侧：类表达式的兼容性实测
// ============================================================

class Point {
  static origin = new Point(0, 0);
  constructor(public x: number, public y: number) {}
  static fromTuple(t: [number, number]): Point {
    return new Point(t[0], t[1]);
  }
  toString(): string {
    return `(${this.x},${this.y})`;
  }
}
type PCtor = typeof Point; // 静态侧：构造签名 + origin + fromTuple

// 类表达式 extends Point 后赋给 typeof Point：静态成员在类型层是否被继承？
const P2: PCtor = class extends Point {}; // 实测：通过——TS 的 typeof 子类包含继承来的静态成员
console.log(`静态侧 origin = ${P2.origin.toString()}`);
