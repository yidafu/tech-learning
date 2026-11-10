/**
 * 大纲章节：阶段 5 专题深入 —— 函数式编程（柯里化与偏应用）
 * 主题：经典 curry、占位符版 curry、partial 与 curry 的行为差异、类型化 Curry3
 * 运行：npx tsx exercises/functional-programming/03-curry.ts
 * 预期输出：
 * --- 1) 经典 curry：按 fn.length（arity）递归收集参数 ---
 * curryAdd(1)(2)(3) = 6
 * curryAdd(1, 2)(3) = 6
 * curryAdd(1)(2, 3) = 6
 * curryAdd(1, 2, 3) = 6
 * --- 2) 占位符版 curry：用 _ 复用参数位（lodash 风格）---
 * ph(1)(2)(3) = 1-2-3
 * ph(_, 2)(1)(3) = 1-2-3
 * ph(_, _, 3)(1)(2) = 1-2-3
 * ph(1, _, _)(3)(2) = 1-3-2
 * --- 3) partial vs curry：行为差异对照 ---
 * curry(power)(2)(10) = 1024
 * partial(power, 2)(10) = 1024
 * partial(power, 2, 10)() = 1024
 * curry(mul3)(1)(2)(3) = 6    ← curry：一次一个，链到凑满 arity 为止
 * partial(mul3, 1)(2, 3) = 6  ← partial：一次固定一批前缀，剩余一次给齐
 * partial(mul3, 1, 2)(3) = 6  ← partial：前缀固定几个都行（curry 的类型化版本通常锁死一次一个）
 * --- 4) 类型化 Curry3：编译期约束每一环 ---
 * curry3(add3)(1)(2)(3) = 6
 */

// ---------------------------------------------------------------------------
// 1) 经典 curry：把 (a, b, c) => R 变成 a => b => c => R
//    实现要点：拿 fn.length（形参个数，即 arity）作为「收齐」的判据，
//    没收齐就返回新函数继续收集 —— 这是个天然的递归结构。
//    注意：fn.length 不统计默认参数、rest 参数、解构参数。
// ---------------------------------------------------------------------------

type LooseFn = (...args: any[]) => any;

function curryLoose(fn: LooseFn): LooseFn {
  const arity = fn.length;
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= arity) return fn(...args);
    return (...next: unknown[]): unknown => curried(...args, ...next);
  };
  return curried as LooseFn;
}

const add3 = (a: number, b: number, c: number): number => a + b + c;
const curryAdd = curryLoose(add3);

console.log('--- 1) 经典 curry：按 fn.length（arity）递归收集参数 ---');
console.log(`curryAdd(1)(2)(3) = ${curryAdd(1)(2)(3)}`);
console.log(`curryAdd(1, 2)(3) = ${curryAdd(1, 2)(3)}`);
console.log(`curryAdd(1)(2, 3) = ${curryAdd(1)(2, 3)}`);
console.log(`curryAdd(1, 2, 3) = ${curryAdd(1, 2, 3)}`);

// ---------------------------------------------------------------------------
// 2) 占位符版 curry：_ 表示「这个位置先欠着，后续调用按顺序补」
//    动机：普通 curry 只能从头往后收参数，想固定第 2 个参数就得先给第 1 个；
//    有了占位符就能跳位 —— lodash 的 _.curry 默认带这个能力（_.placeholder）。
// ---------------------------------------------------------------------------

/** 占位符：唯一的哨兵值，绝不能与业务参数撞车，所以用 Symbol。 */
const _ = Symbol('curry/placeholder');

function curryPlaceholder(fn: LooseFn): LooseFn {
  const arity = fn.length;
  const curried = (...args: unknown[]): unknown => {
    const stillHasSlot = args.includes(_);
    if (args.length >= arity && !stillHasSlot) return fn(...args);
    return (...next: unknown[]): unknown => {
      const rest = [...next];
      const merged = args.map((a) =>
        a === _ && rest.length > 0 ? rest.shift() : a,
      );
      return curried(...merged, ...rest);
    };
  };
  return curried as LooseFn;
}

const format = (a: number, b: number, c: number): string => `${a}-${b}-${c}`;
const ph = curryPlaceholder(format);

console.log('--- 2) 占位符版 curry：用 _ 复用参数位（lodash 风格）---');
console.log(`ph(1)(2)(3) = ${ph(1)(2)(3)}`);
console.log(`ph(_, 2)(1)(3) = ${ph(_, 2)(1)(3)}`);
console.log(`ph(_, _, 3)(1)(2) = ${ph(_, _, 3)(1)(2)}`);
// 注意：占位符按「出现顺序」被填充 —— 先出现的 _ 先拿到后续参数
console.log(`ph(1, _, _)(3)(2) = ${ph(1, _, _)(3)(2)}`);

// ---------------------------------------------------------------------------
// 3) partial vs curry：都是「减少参数个数」，行为契约不同
//    - partial(fn, ...preset)：一次性固定【前缀】参数，剩下的调用时一次给齐；
//      只能固定前缀，不能跳位；返回的是普通函数，不再链式。
//    - curry(fn)：拆成单参链；配合占位符才能跳位；每多收一个参数返回新函数。
//    类型层面：partial 的「剩余参数类型」要在类型里做元组减法（DropFirst N 个），
//    通用的类型化 partial 同样要定长重载，和 pipe 是一个道理。
// ---------------------------------------------------------------------------

function partialLoose(fn: LooseFn, ...preset: unknown[]): (...rest: unknown[]) => unknown {
  return (...rest: unknown[]): unknown => fn(...preset, ...rest);
}

const power = (base: number, exp: number): number => base ** exp;
const mul3 = (a: number, b: number, c: number): number => a * b * c;

const curryPower = curryLoose(power) as (b: number) => (e: number) => number;
const squareOf2 = partialLoose(power, 2) as (e: number) => number;
const fixed = partialLoose(power, 2, 10) as () => number;
const mulByOne = partialLoose(mul3, 1) as (b: number, c: number) => number;
const mulPrefix12 = partialLoose(mul3, 1, 2) as (c: number) => number;
const curryMul = curryLoose(mul3) as (a: number) => (b: number) => (c: number) => number;

console.log('--- 3) partial vs curry：行为差异对照 ---');
console.log(`curry(power)(2)(10) = ${curryPower(2)(10)}`);
console.log(`partial(power, 2)(10) = ${squareOf2(10)}`);
console.log(`partial(power, 2, 10)() = ${fixed()}`);
console.log('curry(mul3)(1)(2)(3) = %s    ← curry：一次一个，链到凑满 arity 为止', curryMul(1)(2)(3));
console.log('partial(mul3, 1)(2, 3) = %s  ← partial：一次固定一批前缀，剩余一次给齐', mulByOne(2, 3));
console.log('partial(mul3, 1, 2)(3) = %s  ← partial：前缀固定几个都行（curry 的类型化版本通常锁死一次一个）', mulPrefix12(3));

// ---------------------------------------------------------------------------
// 4) 类型化 curry（固定三参）：Curry<Fn> 条件类型 + 断言桥接
//    完全任意元数的类型化 curry（fp-ts 的 curry / Redux 的 TypeScript utilities）
//    依然靠定长重载 —— 元数不定时类型系统没有「递归收集参数」的表达力。
// ---------------------------------------------------------------------------

type Curry3<F> = F extends (a: infer A, b: infer B, c: infer C) => infer R
  ? (a: A) => (b: B) => (c: C) => R
  : never;

function curry3<F extends (a: any, b: any, c: any) => any>(fn: F): Curry3<F> {
  return ((a: unknown) => (b: unknown) => (c: unknown) =>
    fn(a, b, c)) as Curry3<F>;
}

const cAdd = curry3(add3);
// cAdd: (a: number) => (b: number) => (c: number) => number —— 每一环都被约束

console.log('--- 4) 类型化 Curry3：编译期约束每一环 ---');
console.log(`curry3(add3)(1)(2)(3) = ${cAdd(1)(2)(3)}`);

// 第二环期望 number，传 string 在编译期被拦下
// @ts-expect-error - 第二环期望 number，传了 string
cAdd(1)('2')(3);

// 第一环期望 number
// @ts-expect-error - 第一环期望 number，传了 boolean
cAdd(true)(2)(3);

export {};
