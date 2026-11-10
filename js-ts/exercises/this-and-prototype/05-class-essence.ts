/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：class 的本质——是函数但不是纯糖（不可枚举、[[IsClassConstructor]]、方法无 [[Construct]]、static 链、#private、字段初始化顺序）
 * 运行：npx tsx exercises/this-and-prototype/05-class-essence.ts
 * 预期输出：
 * [typeof] typeof Point: function
 * [可枚举] Object.keys(OldPoint.prototype): ["dump"]
 * [可枚举] Object.keys(Point.prototype): []
 * [可枚举] dump 描述符 enumerable: false
 * [行为一致] old1.dump(): (1,2), new1.dump(): (1,2)
 * [无 new] 直接调用 Point() 抛 TypeError: true
 * [方法简写] typeof actions.run: function
 * [方法简写] new actions.run() 抛 TypeError: true
 * [static 继承] Circle.origin(): circle <- shape@0,0
 * [static 链] Object.getPrototypeOf(Circle) === Shape: true
 * [static 链] Object.getPrototypeOf(Shape) === Function.prototype: true
 * [类体严格] bareDump.call(undefined) 抛 TypeError: true
 * [private] Object.getOwnPropertyNames(w): []
 * [private] 品牌检查 Wallet.isWallet(w): true, Wallet.isWallet({}): false
 * [private] w.deposit(50): 150
 * [private] 读非实例的 #balance 抛 TypeError: true
 * [private] 同类实例互访 readBalanceOf(w2): 100
 * [字段顺序] Base 构造器里 this.describe(): Derived(label=undefined)
 * [字段顺序] super() 之后 this.describe(): Derived(label=derived-label)
 * [字段顺序] 构造完成后 d.label: derived-label
 */
"use strict";
export {};

/* ============ ① class 的运行时本体就是一个（构造）函数 ============ */
class Point {
  constructor(public x: number, public y: number) {}
  dump(): string {
    return `(${this.x},${this.y})`;
  }
}
console.log(`[typeof] typeof Point: ${typeof Point}`);

/* ============ ② 原型方法不可枚举（对比 ES5 手挂方法）============ */
// 依据：ECMA-262 ClassDefinitionEvaluation 用 CreateMethodProperty 定义方法，
// enumerable: false；ES5 手动赋值走普通属性创建，enumerable: true → for...in/Object.keys 可见
function OldPoint(this: { x: number; y: number; dump(): string }, x: number, y: number): void {
  this.x = x;
  this.y = y;
}
OldPoint.prototype.dump = function (this: { x: number; y: number }): string {
  return `(${this.x},${this.y})`;
};
const NewOldPoint = OldPoint as unknown as new (x: number, y: number) => { x: number; y: number; dump(): string };
const old1 = new NewOldPoint(1, 2);
const new1 = new Point(1, 2);
console.log(`[可枚举] Object.keys(OldPoint.prototype): ${JSON.stringify(Object.keys(OldPoint.prototype))}`);
console.log(`[可枚举] Object.keys(Point.prototype): ${JSON.stringify(Object.keys(Point.prototype))}`);
console.log(`[可枚举] dump 描述符 enumerable: ${Object.getOwnPropertyDescriptor(Point.prototype, "dump")?.enumerable}`);
console.log(`[行为一致] old1.dump(): ${old1.dump()}, new1.dump(): ${new1.dump()}`);

/* ============ ③ class 构造器不能脱离 new 调用：[[IsClassConstructor]] 内部槽 ============ */
// 依据：ECMA-262 [[Call]] 入口检查 [[IsClassConstructor]]，为 true 即抛 TypeError
try {
  (Point as unknown as (x: number, y: number) => void)(1, 2);
} catch (e) {
  console.log(`[无 new] 直接调用 Point() 抛 TypeError: ${e instanceof TypeError}`);
}

/* ============ ④ 对象方法简写同样没有 [[Construct]]，不能 new ============ */
// 依据：MethodDefinition 走 DefineMethod（不调用 MakeConstructor）→ 无 [[Construct]] 内部方法
const actions = {
  run(): string {
    return "running";
  },
};
console.log(`[方法简写] typeof actions.run: ${typeof actions.run}`);
try {
  new (actions.run as unknown as new () => string)();
} catch (e) {
  console.log(`[方法简写] new actions.run() 抛 TypeError: ${e instanceof TypeError}`);
}

/* ============ ⑤ static：定义在类本身上；extends 连的是「类 → 类」的 [[Prototype]]，静态可继承 ============ */
class Shape {
  static origin(): string {
    return "shape@0,0";
  }
}
class Circle extends Shape {
  static origin(): string {
    return `circle <- ${super.origin()}`; // 静态方法里也能 super（查 Shape 本身）
  }
}
console.log(`[static 继承] Circle.origin(): ${Circle.origin()}`);
console.log(`[static 链] Object.getPrototypeOf(Circle) === Shape: ${Object.getPrototypeOf(Circle) === Shape}`);
console.log(`[static 链] Object.getPrototypeOf(Shape) === Function.prototype: ${Object.getPrototypeOf(Shape) === Function.prototype}`);

/* ============ ⑥ 类体自动严格模式 ============ */
// 方法被剥离对象、以 undefined 调用时：类体是严格代码，this 保持 undefined → 读 this.x 直接抛错
// （若是非严格函数，this 会被替换成 globalThis，只会打出 "(undefined,undefined)"，不会抛错）
const bareDump = Point.prototype.dump as unknown as (this: unknown) => string;
try {
  bareDump.call(undefined);
} catch (e) {
  console.log(`[类体严格] bareDump.call(undefined) 抛 TypeError: ${e instanceof TypeError}`);
}

/* ============ ⑦ #private：真私有（不是属性，是实例的私有环境）============ */
// 依据：私有名字不是 property，访问基于实例的内部记录；类体外连名字都不可见
// `#x in obj` 是品牌检查（brand check）：只判断「是不是这个类的实例」，不抛错
class Wallet {
  #balance = 100;
  deposit(n: number): number {
    this.#balance += n;
    return this.#balance;
  }
  readBalanceOf(other: Wallet): number {
    return other.#balance; // 只有类体内能访问
  }
  static isWallet(o: object): boolean {
    return #balance in o;
  }
}
const w = new Wallet();
console.log(`[private] Object.getOwnPropertyNames(w): ${JSON.stringify(Object.getOwnPropertyNames(w))}`); // #balance 根本不在属性列表里
console.log(`[private] 品牌检查 Wallet.isWallet(w): ${Wallet.isWallet(w)}, Wallet.isWallet({}): ${Wallet.isWallet({})}`);
console.log(`[private] w.deposit(50): ${w.deposit(50)}`);
try {
  w.readBalanceOf({} as unknown as Wallet); // 骗过类型系统：运行时品牌检查兜底
} catch (e) {
  console.log(`[private] 读非实例的 #balance 抛 TypeError: ${e instanceof TypeError}`);
}
const w2 = new Wallet();
console.log(`[private] 同类实例互访 readBalanceOf(w2): ${w.readBalanceOf(w2)}`); // 类体内对同类实例可访问

/* ============ ⑧ 字段初始化顺序：派生类字段在 super() 之后才初始化 ============ */
// 执行顺序：基类字段 → 基类构造器 → （super() 返回后）派生类字段 → 派生类构造器余下语句
// 所以 Base 构造器里多态调用 this.describe() 时，Derived 的 label 还不存在（undefined）
class Base {
  constructor() {
    console.log(`[字段顺序] Base 构造器里 this.describe(): ${this.describe()}`);
  }
  describe(): string {
    return "Base";
  }
}
class Derived extends Base {
  label = "derived-label";
  describe(): string {
    return `Derived(label=${this.label})`;
  }
  constructor() {
    super();
    console.log(`[字段顺序] super() 之后 this.describe(): ${this.describe()}`);
  }
}
const d = new Derived();
console.log(`[字段顺序] 构造完成后 d.label: ${d.label}`);
