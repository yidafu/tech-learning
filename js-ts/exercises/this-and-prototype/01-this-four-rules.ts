/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：this 绑定四规则对照（默认 / 隐式 / 隐式丢失 / 显式 / new / getter 中的 this）
 * 运行：npx tsx exercises/this-and-prototype/01-this-four-rules.ts
 * 预期输出：
 * [默认/严格] this === undefined: true
 * [默认/非严格] this === globalThis: true
 * [null/严格] this === null: true
 * [null/非严格] this === globalThis: true
 * [42/严格] typeof this: number
 * [42/非严格] typeof/valueOf: object|42
 * [隐式] holder.showTag(): holder
 * [嵌套] outer.inner.show(): inner
 * [隐式丢失] detached(): <this 为 undefined>
 * [隐式丢失] detached.call({ tag: "re-attached" }): re-attached
 * [显式 call] greet.call(cat, "喵"): 喵，我是 cat
 * [显式 apply] greet.apply(dog, ["汪"]): 汪，我是 dog
 * [new] lamp.tag: lamp-instance, lamp instanceof Lamp: true
 * [getter] widget.whoami: widget
 * [getter 也是函数] getterFn.call({ label: "other" }): other
 *
 * 环境说明：tsx 会把 .ts 按类 CJS 方式转译执行（默认非严格），因此文件顶部放
 * "use strict" 指令 + export {}，使整个文件按「严格 + 模块」语义运行：
 * 顶层 this 为 undefined、默认绑定不做 globalThis 替换——与 ESM/class 体行为一致。
 * 非严格行为用 new Function 动态创建的函数体演示（它天然是非严格代码）。
 */
"use strict";
export {};

/* ============ 规则一：默认绑定（裸调用 fn()）============ */
// 严格模式：调用时没有任何 this 来源 → thisArgument 为 undefined，且不做替换
// 依据：ECMA-262 OrdinaryCallBindThis 按 [[ThisMode]] 分派；strict 分支原样保留 undefined
function strictDefault(this: unknown): void {
  console.log(`[默认/严格] this === undefined: ${this === undefined}`);
}
strictDefault();

// 非严格（new Function 的函数体）：null/undefined 被替换成 globalThis
// 依据：OrdinaryCallBindThis 的 global 分支：thisArgument 为 null/undefined → globalThis
const sloppyThis = new Function("return this === globalThis;");
console.log(`[默认/非严格] this === globalThis: ${sloppyThis()}`);

/* 显式传入 null：严格模式保留 null；非严格模式替换为 globalThis */
function strictNull(this: unknown): void {
  console.log(`[null/严格] this === null: ${this === null}`);
}
strictNull.call(null);
console.log(`[null/非严格] this === globalThis: ${sloppyThis.call(null)}`);

/* 显式传入原始值：严格模式不装箱；非严格模式 ToObject 装箱成包装对象 */
function strictPrimitive(this: unknown): void {
  console.log(`[42/严格] typeof this: ${typeof this}`);
}
strictPrimitive.call(42);
const sloppyBox = new Function("return [typeof this, this.valueOf()].join('|');");
console.log(`[42/非严格] typeof/valueOf: ${sloppyBox.call(42)}`);

/* ============ 规则二：隐式绑定（obj.fn()：谁调用指向谁）============ */
// 依据：EvaluateCall 里 MemberExpression 求值出「属性引用（Reference）」，
// Reference 的 base（这里是 holder）成为 thisValue
function showTag(this: { tag?: string } | void): string {
  return this?.tag ?? "<this 为 undefined>";
}
const holder = { tag: "holder", showTag };
console.log(`[隐式] holder.showTag(): ${holder.showTag()}`);

// 嵌套对象：只有「最后一层」属性引用的 base 才是 this（outer.inner，而不是 outer）
const outer = {
  tag: "outer",
  inner: {
    tag: "inner",
    show(): string {
      return this.tag;
    },
  },
};
console.log(`[嵌套] outer.inner.show(): ${outer.inner.show()}`);

/* ---- 隐式丢失：把方法取出来再调用 ---- */
// const detached = holder.showTag 之后，调用表达式不再是「属性引用」，
// Reference 没有了 base → 回落到默认绑定（严格模式 = undefined）
const detached = holder.showTag;
console.log(`[隐式丢失] detached(): ${detached()}`);
console.log(`[隐式丢失] detached.call({ tag: "re-attached" }): ${detached.call({ tag: "re-attached" })}`);

/* ============ 规则三：显式绑定（call / apply）============ */
interface Tagged {
  tag: string;
}
const cat: Tagged = { tag: "cat" };
const dog: Tagged = { tag: "dog" };
function greet(this: Tagged, g: string): string {
  return `${g}，我是 ${this.tag}`;
}
console.log(`[显式 call] greet.call(cat, "喵"): ${greet.call(cat, "喵")}`);
console.log(`[显式 apply] greet.apply(dog, ["汪"]): ${greet.apply(dog, ["汪"])}`);

/* ============ 规则四：new 绑定（优先级最高，见 03 的 new vs bind 对决）============ */
class Lamp {
  tag = "lamp-instance";
}
const lamp = new Lamp();
console.log(`[new] lamp.tag: ${lamp.tag}, lamp instanceof Lamp: ${lamp instanceof Lamp}`);

/* ============ 补充：getter 中的 this —— 属性访问的接收者 ============ */
// 访问 widget.whoami 时：getter 沿原型/自身找到后，以「接收者 widget」为 this 被调用
// 依据：ECMA-262 OrdinaryGet —— accessor 属性执行 Call(getter, Receiver)
const widget = {
  label: "widget",
  get whoami(): string {
    return this.label;
  },
};
console.log(`[getter] widget.whoami: ${widget.whoami}`);
const getterFn = Object.getOwnPropertyDescriptor(widget, "whoami")!.get!;
console.log(`[getter 也是函数] getterFn.call({ label: "other" }): ${getterFn.call({ label: "other" })}`);

/*
 * 判定顺序（一次调用只走一条路径，优先级从高到低）：
 * 1. new 调用           → 走 [[Construct]]，this = 以 new.target.prototype 新建的实例
 *                         （bind 固化的 this 在此路径被无视，见 03 的 [new bound]）
 * 2. call / apply / bind → 显式 thisArgument（bind 是「提前显式」，调用时再 call 也改不动）
 * 3. obj.fn() 成员调用   → 隐式绑定，this = 属性引用的 base（只有最后一层算数）
 * 4. 裸调用 fn()        → 默认绑定：thisArgument 为 undefined
 *                          严格模式保留 undefined / 非严格替换为 globalThis（并装箱原始值）
 */
