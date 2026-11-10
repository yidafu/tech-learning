/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：ES5 寄生组合继承手写 vs class extends —— 行为对照（方法共享/instanceof/向父传参/super 重写/new.target/Symbol.toStringTag）
 * 运行：npx tsx exercises/this-and-prototype/06-inheritance-compare.ts
 * 预期输出：
 * [ES5] Animal 构造器内 new.target: undefined（被 .call 借用）
 * [ES5] Animal 构造器内 new.target: undefined（被 .call 借用）
 * [ES5] Animal 构造器内 new.target: Animal5Fn
 * [ES5] d1.intro(): 我是 旺财，品种 柴犬
 * [ES5] 方法共享 d1.intro === d2.intro: true
 * [ES5] d1 instanceof Dog5: true, d1 instanceof Animal5: true
 * [ES5] 链接: Object.getPrototypeOf(Dog5.prototype) === Animal5.prototype: true
 * [ES5] a1.intro(): 我是 咕噜
 * [class] Animal 构造器内 new.target: DogC
 * [class] Animal 构造器内 new.target: DogC
 * [class] c1.intro(): 我是 旺财，品种 柴犬
 * [class] 方法共享: true
 * [class] c1 instanceof DogC: true, c1 instanceof AnimalC: true
 * [class] 链接: Object.getPrototypeOf(DogC.prototype) === AnimalC.prototype: true
 * [class] 静态链: Object.getPrototypeOf(DogC) === AnimalC: true
 * [对照] 向父构造器传参: ES5 name=旺财 / class name=旺财
 * [对照] 重写并调父方法: ES5 "我是 旺财，品种 柴犬" / class "我是 旺财，品种 柴犬"
 * [toStringTag] Object.prototype.toString.call(new TaggedPoint(1, 2)): [object TaggedPoint]
 */
"use strict";
export {};

/* ============================================================
 * A. ES5 寄生组合继承（手工版，ES5 时代的最优解）
 * ============================================================ */
interface Animal5 {
  name: string;
  intro(): string;
}
function Animal5Fn(this: Animal5, name: string): void {
  // 借用构造函数方式里，父函数是被 .call 调用的：new.target 为 undefined
  // → 父构造器「不知道」真正被 new 的是谁（class 版没有这个问题）
  const nt = new.target as unknown as { name?: string } | undefined;
  console.log(`[ES5] Animal 构造器内 new.target: ${nt === undefined ? "undefined（被 .call 借用）" : nt.name}`);
  this.name = name;
}
Animal5Fn.prototype.intro = function (this: Animal5): string {
  return `我是 ${this.name}`;
};

interface Dog5 extends Animal5 {
  breed: string;
}
function Dog5Fn(this: Dog5, name: string, breed: string): void {
  Animal5Fn.call(this, name); // 借用父构造器：把属性初始化拷到 this 上（不建立任何链）
  this.breed = breed;
}
// 寄生组合的关键一步：用一个「以父 prototype 为原型的新空对象」当子 prototype
// —— 只链接、不执行父构造器（组合继承在这里会 new Animal5() 白跑一次）
Dog5Fn.prototype = Object.create(Animal5Fn.prototype);
Dog5Fn.prototype.constructor = Dog5Fn; // 修 constructor 回指（Object.create 出来的对象没有）
Dog5Fn.prototype.intro = function (this: Dog5): string {
  // 手动 super：显式借父原型方法，并把 this 传回去
  return `${Animal5Fn.prototype.intro.call(this)}，品种 ${this.breed}`;
};
const Animal5 = Animal5Fn as unknown as new (name: string) => Animal5;
const Dog5 = Dog5Fn as unknown as new (name: string, breed: string) => Dog5;

const d1 = new Dog5("旺财", "柴犬");
const d2 = new Dog5("小黑", "田园犬");
const a1 = new Animal5("咕噜");
console.log(`[ES5] d1.intro(): ${d1.intro()}`);
console.log(`[ES5] 方法共享 d1.intro === d2.intro: ${d1.intro === d2.intro}`);
console.log(`[ES5] d1 instanceof Dog5: ${d1 instanceof Dog5}, d1 instanceof Animal5: ${d1 instanceof Animal5}`);
console.log(`[ES5] 链接: Object.getPrototypeOf(Dog5.prototype) === Animal5.prototype: ${Object.getPrototypeOf(Dog5Fn.prototype) === Animal5Fn.prototype}`);
console.log(`[ES5] a1.intro(): ${a1.intro()}`);

/* ============================================================
 * B. class extends（≈ 寄生组合的自动化 + 增量能力）
 * ============================================================ */
class AnimalC {
  constructor(public name: string) {
    // super() 会把 new.target 原样传给父构造器（Reflect.construct 语义）
    // → 父构造器知道「真正被 new 的是 DogC」
    const nt = new.target as unknown as Function | undefined;
    console.log(`[class] Animal 构造器内 new.target: ${nt?.name ?? "<undefined>"}`);
  }
  intro(): string {
    return `我是 ${this.name}`;
  }
}
class DogC extends AnimalC {
  constructor(name: string, public breed: string) {
    super(name); // 先执行父构造拿到 this，再初始化自己的字段（用 this 前必须先 super()）
  }
  intro(): string {
    // 语言级 super：查找起点由方法的 [[HomeObject]] 决定，不用手写 Foo.prototype.fn.call(this)
    return `${super.intro()}，品种 ${this.breed}`;
  }
}
const c1 = new DogC("旺财", "柴犬");
const c2 = new DogC("小黑", "田园犬");
console.log(`[class] c1.intro(): ${c1.intro()}`);
console.log(`[class] 方法共享: ${c1.intro === c2.intro}`);
console.log(`[class] c1 instanceof DogC: ${c1 instanceof DogC}, c1 instanceof AnimalC: ${c1 instanceof AnimalC}`);
console.log(`[class] 链接: Object.getPrototypeOf(DogC.prototype) === AnimalC.prototype: ${Object.getPrototypeOf(DogC.prototype) === AnimalC.prototype}`);
console.log(`[class] 静态链: Object.getPrototypeOf(DogC) === AnimalC: ${Object.getPrototypeOf(DogC) === AnimalC}`);

/* ============================================================
 * C. 行为对照：两种写法对外行为一致的部分
 * ============================================================ */
console.log(`[对照] 向父构造器传参: ES5 name=${d1.name} / class name=${c1.name}`);
console.log(`[对照] 重写并调父方法: ES5 "${d1.intro()}" / class "${c1.intro()}"`);

/* ============================================================
 * D. Symbol.toStringTag：一句——自定义 Object.prototype.toString 的标签
 * ============================================================ */
class TaggedPoint {
  constructor(public x: number, public y: number) {}
  get [Symbol.toStringTag](): string {
    return "TaggedPoint";
  }
}
console.log(`[toStringTag] Object.prototype.toString.call(new TaggedPoint(1, 2)): ${Object.prototype.toString.call(new TaggedPoint(1, 2))}`);
