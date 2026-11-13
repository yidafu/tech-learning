/**
 * 大纲章节：阶段 3 里程碑——类型体操（元组四题：First / Length / Includes / Flatten）
 * 主题：元组头尾拆分、['length'] 字面量数字、Equal 判等 vs extends 判兼容、双递归拍平
 * 运行：npx tsx exercises/ts-type-challenges/01-tuple-basics.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-challenges/01-tuple-basics.ts
 * 预期输出：
 * [true].includes(false) = false —— 运行时按「值相等」判断
 * [1, 2].includes(2) = true
 * flatten runtime = [1,2,3]  —— 与类型层 Flatten<[1,[2],[[3]]]> = [1,2,3] 对应
 */

// top-level 结构：本文件是 ESM 模块
export {};

// ============================================================
// 0. 类型层自证工具（type-challenges utils.ts 同款）
// ============================================================

// 泛型签名同一性判断：能区分 any / never / 联合；「双向 extends」版在这三处假阳性
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、First<T>：元组头匹配（type-challenges 14）
// ============================================================

// 解法 A：infer 头部模式——空元组匹配不上 [F, ...unknown[]]，自然走 never
type First<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;

type _t1 = Expect<Equal<First<[3, 2, 1]>, 3>>;
type _t2 = Expect<Equal<First<[]>, never>>; // never 兜底：联合语境下会被吸收，单测语境下逼你显式处理

// 解法 B：先看长度再看索引（对照用；两者等价，A 更少绕路）
type First2<T extends readonly unknown[]> = T['length'] extends 0 ? never : T[0];
type _t3 = Expect<Equal<First2<['a', 'b']>, 'a'>>;

// ============================================================
// 二、Length<T>：元组 ['length'] 是数字字面量类型（type-challenges 18）
// ============================================================

type Length<T extends readonly unknown[]> = T['length'];
type _t4 = Expect<Equal<Length<['a', 'b']>, 2>>;
type _t5 = Expect<Equal<Length<string[]>, number>>; // 数组（非元组）长度只有 number——不精确

// ============================================================
// 三、Includes<T, U>：为什么判等必须用 Equal（type-challenges 8）
// ============================================================

type Includes<T extends readonly unknown[], U> =
  T extends readonly [infer F, ...infer R]
    ? Equal<F, U> extends true
      ? true
      : Includes<R, U>
    : false;

type _t6 = Expect<Equal<Includes<['Kars', 'Esidisi', 'Wamuu'], 'Kars'>, true>>;
type _t7 = Expect<Equal<Includes<[1, 2, 3], 6>, false>>;
// 核心对照：可赋值性 ≠ 相等
type _t8 = Expect<Equal<Includes<[true], boolean>, false>>; // true extends boolean 成立，但 [true].includes(任意 boolean) 不总为真
type _t9 = Expect<Equal<Includes<[boolean], false>, false>>; // 反向同理

// 反面教材（不启用）：若把 Equal 换成 F extends U：
// type IncludesWrong = ... F extends U ? true : ...  则 Includes<[true], boolean> 错误地得到 true

// ============================================================
// 四、Flatten：头拍平 + 尾递归（type-challenges 459）
// ============================================================

type Flatten<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? F extends readonly unknown[]
    ? [...Flatten<F>, ...Flatten<R>] // 头本身是数组：先拍平头
    : [F, ...Flatten<R>] // 头是元素：直接接
  : []; // 出口：空元组（输出是元组，出口类型必须同族！）

type _t10 = Expect<Equal<Flatten<[1, [2], [[3]]]>, [1, 2, 3]>>;
type _t11 = Expect<Equal<Flatten<[]>, []>>;
type _t12 = Expect<Equal<Flatten<[[['a']], 'b']>, ['a', 'b']>>;

// ============================================================
// 五、运行时对照
// ============================================================

// Includes 的类型层语义对应运行时 includes 的「值相等」——对照打印：
console.log(`[true].includes(false) = ${[true].includes(false)} —— 运行时按「值相等」判断`);
console.log(`[1, 2].includes(2) = ${[1, 2].includes(2)}`);

// Flatten 的运行时对应（结构同型：头是数组递归拍，尾递归归并）
function flattenRuntime(xs: readonly unknown[]): unknown[] {
  return xs.flatMap((x) => (Array.isArray(x) ? flattenRuntime(x) : [x]));
}
console.log(`flatten runtime = ${JSON.stringify(flattenRuntime([1, [2], [[3]]]))}  —— 与类型层 Flatten<[1,[2],[[3]]]> = [1,2,3] 对应`);
