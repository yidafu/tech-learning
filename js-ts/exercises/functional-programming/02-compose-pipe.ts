/**
 * 大纲章节：阶段 5 专题深入 —— 函数式编程（组合 compose/pipe 与 point-free）
 * 主题：手写 any 简版与元组类型安全版 compose/pipe、结合律验证、point-free 改造
 * 运行：npx tsx exercises/functional-programming/02-compose-pipe.ts
 * 预期输出：
 * --- 1) any 简版：pipe（左到右）与 compose（右到左）---
 * pipe(strLen, double, gt5, label)('hello') = big
 * compose(label, gt5, double, strLen)('hello') = big
 * pipe 与 compose 结果一致: true
 * --- 2) 结合律：(a ∘ b) ∘ c === a ∘ (b ∘ c) ---
 * 先绑前两个 (ab)c('hello') = true
 * 先绑后两个 a(bc)('hello') = true
 * 先绑前两个 (ab)c('hi') = false
 * 先绑后两个 a(bc)('hi') = false
 * 两种结合顺序输出完全一致: true
 * --- 3) 类型安全版 pipe：定长重载逐对校验 ---
 * typedPipe(strLen, double, gt5, label)('hello') = big
 * typedPipe(strLen, double, gt5, label)('hi') = small
 * typeProbe 验证 PipeReturn 推导结果 = (x: string) => string: CHAIN
 * --- 4) point-free：消掉中间参数 ---
 * 改造前 shout('hello') = HELLO!
 * 改造后 shoutPF('hello') = HELLO!
 * 两者行为一致: true
 */

// ---------------------------------------------------------------------------
// 基础函数：单入单出，类型明确（组合的基本粒子）
// ---------------------------------------------------------------------------
const strLen = (s: string): number => s.length;
const double = (n: number): number => n * 2;
const gt5 = (n: number): boolean => n > 5;
const label = (b: boolean): string => (b ? 'big' : 'small');
const upper = (s: string): string => s.toUpperCase();
const exclaim = (s: string): string => `${s}!`;

// ---------------------------------------------------------------------------
// 1) any 简版：pipe 从左到右，compose 从右到左
//    实现核心只有一个 reduce；类型上用 any 串联（运行期正确即可）。
//    局限：中间环节类型断链编译期完全无感，错要到运行时才炸。
// ---------------------------------------------------------------------------

type AnyFn = (arg: any) => unknown; // 参数用 any：让 (s: string) => number 这类具体函数可赋值

/** pipe(f, g, h)(x) === h(g(f(x)))：数据从左往右流。 */
function pipeSimple(...fns: AnyFn[]): (input: unknown) => unknown {
  return (input: unknown): unknown => fns.reduce((acc, fn) => fn(acc), input);
}

/** compose(f, g, h)(x) === f(g(h(x)))：数学记法 (f ∘ g ∘ h)，从右往左。 */
function composeSimple(...fns: AnyFn[]): (input: unknown) => unknown {
  return (input: unknown): unknown => fns.reduceRight((acc, fn) => fn(acc), input);
}

console.log('--- 1) any 简版：pipe（左到右）与 compose（右到左）---');
const p1 = pipeSimple(strLen, double, gt5, label) as (x: string) => string;
const c1 = composeSimple(label, gt5, double, strLen) as (x: string) => string;
console.log(`pipe(strLen, double, gt5, label)('hello') = ${p1('hello')}`);
console.log(`compose(label, gt5, double, strLen)('hello') = ${c1('hello')}`);
console.log(`pipe 与 compose 结果一致: ${p1('hello') === c1('hello')}`);

// ---------------------------------------------------------------------------
// 2) 结合律验证：组合满足 (a ∘ b) ∘ c === a ∘ (b ∘ c)
//    这意味着可以把一段长管道任意切分组装（抽中间函数、复用半成品管道），
//    语义不变 —— 组合之所以能「搭积木」，靠的就是这条代数性质。
// ---------------------------------------------------------------------------

console.log('--- 2) 结合律：(a ∘ b) ∘ c === a ∘ (b ∘ c) ---');
const ab = pipeSimple(strLen, double) as (x: string) => number; // string -> number
const bc = pipeSimple(double, gt5) as (x: number) => boolean; // number -> boolean
const leftAssoc = pipeSimple(ab, gt5) as (x: string) => boolean; // (a∘b)∘c
const rightAssoc = pipeSimple(strLen, bc) as (x: string) => boolean; // a∘(b∘c)
console.log(`先绑前两个 (ab)c('hello') = ${leftAssoc('hello')}`);
console.log(`先绑后两个 a(bc)('hello') = ${rightAssoc('hello')}`);
console.log(`先绑前两个 (ab)c('hi') = ${leftAssoc('hi')}`);
console.log(`先绑后两个 a(bc)('hi') = ${rightAssoc('hi')}`);
console.log(
  `两种结合顺序输出完全一致: ${leftAssoc('hello') === rightAssoc('hello') && leftAssoc('hi') === rightAssoc('hi')}`,
);

// ---------------------------------------------------------------------------
// 3) 类型安全版：定长重载 + 变长元组类型推导
//    - 实现签名仍是 any（运行期一个 reduce）；
//    - 重载签名让 TS 对「相邻函数的衔接」逐对校验：前一个的返回值类型
//      必须能赋给后一个的参数类型，断链在编译期报错；
//    - 这正是 fp-ts 的 pipe 的做法（它写到 19 元，这里演示到 4 元）；
//      「一条泛型签名同时做整链校验 + 推导」目前做不到 —— 限制见笔记 21。
// ---------------------------------------------------------------------------

/** 变长元组递归推导：给定函数元组类型，算出整条链 (首参类型) => 最终返回类型。 */
type PipeReturn<T extends readonly ((...args: never[]) => unknown)[]> = T extends readonly []
  ? never
  : T extends readonly [(x: infer I) => infer R]
    ? (x: I) => R
    : T extends readonly [(x: infer I) => infer R, ...infer Rest extends readonly ((...args: never[]) => unknown)[]]
      ? (x: I) => (PipeReturn<Rest> extends (...args: never[]) => infer RR ? RR : never)
      : never;

export function typedPipe<A, R>(f1: (x: A) => R): (x: A) => R;
export function typedPipe<A, B, R>(f1: (x: A) => B, f2: (x: B) => R): (x: A) => R;
export function typedPipe<A, B, C, R>(
  f1: (x: A) => B,
  f2: (x: B) => C,
  f3: (x: C) => R,
): (x: A) => R;
export function typedPipe<A, B, C, D, R>(
  f1: (x: A) => B,
  f2: (x: B) => C,
  f3: (x: C) => D,
  f4: (x: D) => R,
): (x: A) => R;
export function typedPipe(...fns: AnyFn[]): (input: unknown) => unknown {
  return (input: unknown): unknown => fns.reduce((acc, fn) => fn(acc), input);
}

console.log('--- 3) 类型安全版 pipe：定长重载逐对校验 ---');
const f = typedPipe(strLen, double, gt5, label);
console.log(`typedPipe(strLen, double, gt5, label)('hello') = ${f('hello')}`);
console.log(`typedPipe(strLen, double, gt5, label)('hi') = ${f('hi')}`);

// 断链：gt5 输出 boolean，strLen 期望 string → 编译期拦截
// @ts-expect-error - 链条断在 gt5 -> strLen：boolean 不能传给期望 string 的函数
const broken = typedPipe(gt5, strLen);

// 首参类型也受约束：f 的首参是 string
// @ts-expect-error - f 期望 string，传 number
f(123);

// 类型级验证（零运行时成本）：PipeReturn 推导整条链的最终类型
type Chain = [typeof strLen, typeof double, typeof gt5, typeof label];
type FinalFn = PipeReturn<Chain>; // 期待为 (x: string) => string
const typeProbe: FinalFn = (s: string): string => s.toUpperCase();
console.log(`typeProbe 验证 PipeReturn 推导结果 = (x: string) => string: ${typeProbe('chain')}`);

// ---------------------------------------------------------------------------
// 4) point-free：参数不出现在定义里，函数直接由「函数的组合」定义
//    利：消除只剩一行的「参数搬运」胶水代码，强迫命名的是「变换」而不是中间值；
//    弊：过度使用后调试断点难打、类型报错信息变长、可读性下降（见笔记 21）。
// ---------------------------------------------------------------------------

console.log('--- 4) point-free：消掉中间参数 ---');
// 改造前：s 只是被搬运的中间值
const shout = (s: string): string => exclaim(upper(s));
// 改造后：shout 就是「先 upper 再 exclaim」这件事本身
const shoutPF = typedPipe(upper, exclaim);
console.log(`改造前 shout('hello') = ${shout('hello')}`);
console.log(`改造后 shoutPF('hello') = ${shoutPF('hello')}`);
console.log(`两者行为一致: ${shout('hello') === shoutPF('hello')}`);

export {};
