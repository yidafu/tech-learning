/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：箭头函数的 this 词法捕获（[[ThisMode]]: lexical）——call/apply/bind 对它无效、不能 new、没有 arguments
 * 运行：npx tsx exercises/this-and-prototype/02-arrow-functions.ts
 * 预期输出：（定时器回调是异步的，真实输出中排在所有同步行之后）
 * [顶层] 顶层箭头捕获的 this === undefined: true
 * [方法内] timer.methodThis() === timer: true
 * [方法内] arrowFromTimer() === timer: true
 * [对比] 普通函数 this 可被显式改走: methodThis.call(fake) === fake: true
 * [对比] 箭头 this 改不走: arrowFromTimer.call(fake) === timer: true
 * [同步] start() 已返回，定时器回调稍后执行
 * [箭头 call] this.tag=LEXICAL, sum=3
 * [箭头 apply] this.tag=LEXICAL, sum=30
 * [箭头 bind] this.tag=LEXICAL, sum=101
 * [箭头 new] 抛 TypeError: true
 * [箭头 arguments] 外层 2 个实参，count(9,9,9,9) 返回: 2
 * [普通函数 arguments] inner(9,9) 返回: 2
 * [setTimeout 普通函数] this === scheduler? false（this 的构造器是宿主给的: Timeout）
 * [setTimeout 箭头] this === scheduler? true
 */
"use strict";
export {};

/* ============ ① 顶层箭头：捕获模块顶层的 this（ESM 语义下是 undefined）============ */
// 依据：ECMA-262 —— 箭头函数创建时 [[ThisMode]] 为 lexical，
// OrdinaryCallBindThis 对 lexical 模式不做任何绑定；函数体内 this 沿词法作用域链向外找，
// 一直找到「某个普通函数/class 的 this」为止。本文件顶层没有外层函数 → 找到模块顶层的 this。
const topLevelArrow = (): unknown => this;
console.log(`[顶层] 顶层箭头捕获的 this === undefined: ${topLevelArrow() === undefined}`);

/* ============ ② 方法内定义箭头：捕获该方法「这一次调用」的 this ============ */
const timer = {
  tag: "timer",
  methodThis(this: unknown): unknown {
    return this; // 普通方法：this 由调用方式决定（可变）
  },
  makeArrow(this: unknown): () => unknown {
    return () => this; // 箭头：捕获 makeArrow 这一次调用的 this（之后不可变）
  },
};
const arrowFromTimer = timer.makeArrow(); // 这一步就把 timer 封进了箭头
console.log(`[方法内] timer.methodThis() === timer: ${timer.methodThis() === timer}`);
console.log(`[方法内] arrowFromTimer() === timer: ${arrowFromTimer() === timer}`);

const fake = { tag: "fake" };
console.log(`[对比] 普通函数 this 可被显式改走: methodThis.call(fake) === fake: ${timer.methodThis.call(fake) === fake}`);
console.log(`[对比] 箭头 this 改不走: arrowFromTimer.call(fake) === timer: ${arrowFromTimer.call(fake) === timer}`);

/* ============ ③ setTimeout 回调对照 ============ */
// 普通函数：this 由「宿主怎么调它」决定——Node 以 Timeout 定时器对象为 thisArg 调用回调
// （浏览器按 WHATWG HTML 规范以 globalThis 为 thisArg；两者都是显式传入，严格模式也拦不住）；
// 箭头函数：无论谁调用、传什么 thisArg，this 永远是定义时捕获的那份（scheduler 这次调用的 this）。
const scheduler = {
  tag: "scheduler",
  start(): void {
    setTimeout(function (this: unknown): void {
      const host = this as { constructor?: { name?: string } };
      console.log(`[setTimeout 普通函数] this === scheduler? ${this === scheduler}（this 的构造器是宿主给的: ${host?.constructor?.name}）`);
    }, 0);
    setTimeout((): void => {
      console.log(`[setTimeout 箭头] this === scheduler? ${this === scheduler}`);
    }, 0);
  },
};
scheduler.start();
console.log("[同步] start() 已返回，定时器回调稍后执行");

/* ============ ④ call/apply/bind 的第一个参数被忽略，参数照常传递 ============ */
// 依据：箭头函数根本没有 [[ThisValue]] 绑定步骤，thisArg 无处安放；
// 但 [[Call]] 的 argumentsList 照常接收
const lexical = {
  tag: "LEXICAL",
  make(): (a: number, b: number) => string {
    // 这个箭头捕获的是 make() 这次调用的 this（即 lexical）
    return (a: number, b: number): string => `this.tag=${this.tag}, sum=${a + b}`;
  },
};
const adder = lexical.make();
console.log(`[箭头 call] ${adder.call({ tag: "FAKE" }, 1, 2)}`); // this 仍是 LEXICAL，参数 1、2 正常传
console.log(`[箭头 apply] ${adder.apply({ tag: "FAKE" }, [10, 20])}`);
const presetAdder = adder.bind({ tag: "FAKE" }, 100); // 预置参数有效，this 依旧无效
console.log(`[箭头 bind] ${presetAdder(1)}`);

/* ============ ⑤ 箭头函数不能作构造器：没有 [[Construct]] 内部方法 ============ */
const ArrowCtor = (): void => undefined;
try {
  new (ArrowCtor as unknown as new () => void)();
} catch (e) {
  console.log(`[箭头 new] 抛 TypeError: ${e instanceof TypeError}`);
}

/* ============ ⑥ 箭头函数没有自己的 arguments：标识符解析落到外层函数 ============ */
function collect(..._args: string[]): number {
  // count 里写的 arguments 不是自己的——是外层 collect 的 arguments
  const count = (..._extra: number[]): number => arguments.length;
  return count(9, 9, 9, 9); // 传 4 个参数也数不到
}
console.log(`[箭头 arguments] 外层 2 个实参，count(9,9,9,9) 返回: ${collect("a", "b")}`);

// 对照：嵌套的普通函数有自己的 arguments
function collectNormal(..._args: string[]): number {
  function inner(..._extra: number[]): number {
    return arguments.length; // 数的是 inner 自己收到的实参
  }
  return inner(9, 9);
}
console.log(`[普通函数 arguments] inner(9,9) 返回: ${collectNormal("a", "b", "c")}`);
