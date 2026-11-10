/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：call/apply/bind 的规范行为——参数形态、bind 固化 this、连续 bind 只认第一次、new boundFn、bound.length/name
 * 运行：npx tsx exercises/this-and-prototype/03-call-apply-bind.ts
 * 预期输出：
 * [call] intro.call(user, "A", "B"): yu-A-B
 * [apply] intro.apply(user, ["A", "B"]): yu-A-B
 * [apply 数组] intro.apply(user, parts): yu-X-Y
 * [call 展开] intro.call(user, ...parts): yu-X-Y
 * [bind 柯里化] volume.bind(null, 3, 4)(5): 60
 * [bind 固定] boundTag(): FIRST
 * [bind 后 call 无效] boundTag.call({ tag: "SECOND" }): FIRST
 * [bind 后 apply 无效] boundTag.apply({ tag: "SECOND" }, []): FIRST
 * [bind 后 bind 无效] boundTag.bind({ tag: "SECOND" })(): FIRST
 * [连续 bind] twice(): A
 * [new bound] Box 构造器里 this instanceof Box: true
 * [new bound] box instanceof Box: true
 * [new bound] Object.getPrototypeOf(box) === Box.prototype: true
 * [new bound] box.kind: box-42, box.size: 42
 * [new bound] bind 的 this 没有污染实例: true
 * [length] calc: 3, c0: 3, c1: 2, c2: 1
 * [name] calc: calc, c0: bound calc, c2: bound bound calc
 * [再 bind 追加参数] c2(3): 6
 */
"use strict";
export {};

/* ============ ① call 逐个传参 / apply 数组传参 ============ */
function intro(this: { name: string }, a: string, b: string): string {
  return `${this.name}-${a}-${b}`;
}
const user = { name: "yu" };
const parts: [string, string] = ["X", "Y"];
console.log(`[call] intro.call(user, "A", "B"): ${intro.call(user, "A", "B")}`);
console.log(`[apply] intro.apply(user, ["A", "B"]): ${intro.apply(user, ["A", "B"])}`);
console.log(`[apply 数组] intro.apply(user, parts): ${intro.apply(user, parts)}`);
console.log(`[call 展开] intro.call(user, ...parts): ${intro.call(user, ...parts)}`);

/* ============ ② bind 预置参数 → 柯里化 ============ */
// 依据：ECMA-262 Function.prototype.bind → BoundFunctionCreate：
// 新函数带 [[BoundTargetFunction]] / [[BoundThis]] / [[BoundArguments]] 三个内部槽
function volume(this: unknown, w: number, h: number, d: number): number {
  return w * h * d;
}
const flatArea = volume.bind(null, 3, 4); // thisArg 固定为 null（严格模式下函数内 this 就是 null，与本题无关）
console.log(`[bind 柯里化] volume.bind(null, 3, 4)(5): ${flatArea(5)}`);

/* ============ ③ bind 之后 this 永久固化 ============ */
// 依据：bound 函数的 [[Call]]：args = [[BoundArguments]] ++ 新参数，
// 然后 Call([[BoundTargetFunction]], [[BoundThis]], args) —— 调用时传入的 thisArgument 被整个丢弃
function tagOf(this: { tag: string }): string {
  return this.tag;
}
const boundTag = tagOf.bind({ tag: "FIRST" });
console.log(`[bind 固定] boundTag(): ${boundTag()}`);
console.log(`[bind 后 call 无效] boundTag.call({ tag: "SECOND" }): ${boundTag.call({ tag: "SECOND" })}`);
console.log(`[bind 后 apply 无效] boundTag.apply({ tag: "SECOND" }, []): ${boundTag.apply({ tag: "SECOND" }, [])}`);
console.log(`[bind 后 bind 无效] boundTag.bind({ tag: "SECOND" })(): ${boundTag.bind({ tag: "SECOND" })()}`);

/* ============ ④ 连续 bind：只认第一次的 this ============ */
// twice 调 once：once 的 [[BoundThis]]（A）在它自己被调用时生效，
// twice 的 [[BoundThis]]（B）作为 thisArgument 传给 once 后被丢弃
const once = tagOf.bind({ tag: "A" });
const twice = once.bind({ tag: "B" });
console.log(`[连续 bind] twice(): ${twice()}`);

/* ============ ⑤ new 一个 bind 出来的函数：new 绑定优先级最高 ============ */
// 依据：bound 函数的 [[Construct]]：thisArgument/新建实例与 [[BoundThis]] 无关，
// 实例原型来自 new.target 替换规则（new boundFn 时 newTarget 换成原构造函数）
class Box {
  kind: string;
  constructor(public size: number) {
    this.kind = `box-${size}`;
    console.log(`[new bound] Box 构造器里 this instanceof Box: ${this instanceof Box}`);
  }
}
const BoundBox = Box.bind({ tag: "INTRUDER" } as never);
const box = new (BoundBox as unknown as new (size: number) => Box)(42);
console.log(`[new bound] box instanceof Box: ${box instanceof Box}`);
console.log(`[new bound] Object.getPrototypeOf(box) === Box.prototype: ${Object.getPrototypeOf(box) === Box.prototype}`);
console.log(`[new bound] box.kind: ${box.kind}, box.size: ${box.size}`);
console.log(`[new bound] bind 的 this 没有污染实例: ${(box as Box & { tag?: string }).tag === undefined}`);

/* ============ ⑥ bound.length 与 bound.name ============ */
// 依据：bind 设置 length = max(target.length - 预置参数个数, 0)（只数第一个默认值/剩余参数之前的形参）；
// name 走 SetFunctionName(target.name, "bound ")：加前缀 "bound "，连续 bind 会叠加前缀
function calc(this: unknown, a: number, b: number, c: number): number {
  return a + b + c;
}
const c0 = calc.bind(null);
const c1 = calc.bind(null, 1);
const c2 = c1.bind(null, 2); // this 早已封死，但参数继续前置
console.log(`[length] calc: ${calc.length}, c0: ${c0.length}, c1: ${c1.length}, c2: ${c2.length}`);
console.log(`[name] calc: ${calc.name}, c0: ${c0.name}, c2: ${c2.name}`);
console.log(`[再 bind 追加参数] c2(3): ${c2(3)}`); // 1 + 2 + 3
