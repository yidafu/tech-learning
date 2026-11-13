/**
 * 大纲章节：阶段 3 里程碑——类型体操（组合四题：AppendArgument / MinusOne / Get / Curry）
 * 主题：函数形状重组、元组计数器 + 尾递归优化上限、模板拆路径递归下钻、递归吃参数元组（大纲点名的压轴 Curry）
 * 运行：npx tsx exercises/ts-type-challenges/04-hard-composition.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-challenges/04-hard-composition.ts
 * 预期输出：
 * get({a:{b:{c:42}}}, 'a.b.c') = 42
 * add3(1)(2)(3)() = 6
 * multiply3(2)(3)(4)() = 24
 */

export {};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、AppendArgument：从函数形状挖参数元组，尾部拼新参数再装回去（type-challenges 191）
// ============================================================

type AppendArgument<F extends (...args: never[]) => unknown, E> =
  F extends (...args: infer A) => infer R ? (...args: [...A, E]) => R : never;

type _t1 = Expect<Equal<AppendArgument<(a: string) => number, boolean>, (a: string, b: boolean) => number>>;
type _t2 = Expect<Equal<AppendArgument<() => void, 1>, (b: 1) => void>>;

// ============================================================
// 二、MinusOne：元组计数器（type-challenges 2257，N ≤ 1000 的尾递归上限）
// ============================================================

// Build 递归堆 [0, ...T] 直到长度等于 L；递归调用处于返回位置 → TS 4.5 尾递归优化，上限约 1000
type Build<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : Build<L, [...T, 0]>;
type MinusOne<N extends number> = Build<N> extends readonly [...infer R, 0] ? R['length'] : never;

type _t3 = Expect<Equal<MinusOne<3>, 2>>;
type _t4 = Expect<Equal<MinusOne<1>, 0>>;
// MinusOne<0> = never：Build<0> = []，没有尾可去（原题要求 -1，属题面特判，此处取 never 并显式承认）

// ============================================================
// 三、Get：模板拆 'a.b.c' + 递归下钻（lodash.get / dot-prop 的类型版）
// ============================================================

type Get<O, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof O
      ? Get<O[K], Rest>
      : never
    : P extends keyof O
      ? O[P]
      : never;

type Tree = { a: { b: { c: 42 } }; leaf: 'x' };
type _t5 = Expect<Equal<Get<Tree, 'a.b.c'>, 42>>;
type _t6 = Expect<Equal<Get<Tree, 'leaf'>, 'x'>>;
type _t7 = Expect<Equal<Get<Tree, 'a.z'>, never>>; // 路径不存在 → 编译期 never（比运行时 undefined 更早暴露）

// 运行时实现配同一类型（split + reduce 下钻）
function get<O, P extends string>(obj: O, path: P): Get<O, P> {
  return path
    .split('.')
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], obj) as Get<O, P>;
}
console.log(`get({a:{b:{c:42}}}, 'a.b.c') = ${get({ a: { b: { c: 42 } } }, 'a.b.c')}`);

// ============================================================
// 四、Curry：递归吃参数元组（type-challenges 17，大纲点名的压轴题）
// ============================================================

type Curry<F> = F extends (...args: infer A) => infer R
  ? A extends []
    ? () => R // 参数耗尽：返回 () => 结果
    : A extends [infer H, ...infer T]
      ? (x: H) => Curry<(...args: T) => R> // 吃掉头参数，剩余打包成新函数递归
      : never
  : never;

// 运行时实现与类型严格对齐：参数齐了返回「() => 结果」（不是直接返回结果）
function curry<F extends (...args: never[]) => unknown>(fn: F): Curry<F> {
  const collected: unknown[] = [];
  const step = (x: unknown) => {
    collected.push(x);
    if (collected.length === fn.length) {
      return () => fn(...(collected as never[]));
    }
    return step;
  };
  return step as Curry<F>;
}

const add3 = curry((a: number, b: number, c: number) => a + b + c);
// add3 类型：(x: number) => (x: number) => (x: number) => () => number
const multiply3 = curry((a: number, b: number, c: number) => a * b * c);
console.log(`add3(1)(2)(3)() = ${add3(1)(2)(3)()}`);
console.log(`multiply3(2)(3)(4)() = ${multiply3(2)(3)(4)()}`);
