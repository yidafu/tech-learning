/**
 * 大纲章节：阶段 3.2 泛型深入（泛型函数）
 * 主题：泛型保留类型关系 vs any（丢失）vs 联合（过宽）；默认类型参数；keyof 约束的 prop/pick
 * 运行：npx tsx exercises/ts-generics/01-generic-functions.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-generics/01-generic-functions.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [any] leaked: string = identityAny(42) 编译通过；leaked.length => undefined
 * [泛型] idNum = 42，idStr = hello
 * [first] first(['a','b']) => a；first([1,2]) => 1
 * [默认参数] firstOrDefault([10,20]) => 10（类型 number | null：D 回落默认值 null）
 * [默认参数] firstOrDefault(empty, 0) => 0（D 推断为 number）
 * [默认参数] firstOrDefault(['x','y'], '(空)') => x（D 推断为 string）
 * [keyof] prop(person,'name') => Yidafu；prop(person,'age') => 30
 * [pick] pick(person, ['name']) => {"name":"Yidafu"}
 */

// ================================================================
// 1. 泛型 = 「类型的参数」：让返回类型和实参类型保持关系
// ================================================================

function identity<T>(value: T): T {
  return value;
}

const idNum = identity(42); // T 从实参推断为 number => idNum: number
const idStr = identity('hello'); // T 推断为 string => idStr: string

// 证据（保留）：identity 的返回类型跟随实参，把 idNum 当 string 用会被拒绝
// 报错原文：Type 'number' is not assignable to type 'string'.
// @ts-expect-error - Type 'number' is not assignable to type 'string'.
const wrongUse: string = idNum;
void wrongUse;

// ================================================================
// 2. 对照 A：any 丢关系 —— 编译通过，错误延迟到运行时
// ================================================================

function identityAny(value: any): any {
  return value;
}

// any 双向豁免：number 当 string 用也不报错（这就是「丢失」）
const leaked: string = identityAny(42);
// 运行时证据：当 string 用读到 undefined，错误被静默延迟
console.log(`[any] leaked: string = identityAny(42) 编译通过；leaked.length => ${leaked.length}`);

// ================================================================
// 3. 对照 B：联合类型过宽 —— 无法表达「元素类型 = 返回类型」
// ================================================================

function firstOfUnion(xs: (string | number)[]): string | number {
  return xs[0];
}
const u = firstOfUnion(['a', 1]); // string | number
// 报错原文（两行）：
//   Type 'string | number' is not assignable to type 'string'.
//   Type 'number' is not assignable to type 'string'.
// @ts-expect-error - Type 'string | number' is not assignable to type 'string'.
const asString: string = u;
void asString;

// 泛型版本：T 把「元素类型」和「返回类型」绑在一起，不宽不丢
function first<T>(xs: readonly T[]): T {
  return xs[0];
}
const f1 = first(['a', 'b']); // T = string
const f2 = first([1, 2]); // T = number

// ================================================================
// 4. 默认类型参数 D = null（TS 2.3《Generic parameter defaults》）
// ================================================================

// 教科书签名是 firstOrDefault<T, D = null>(xs: T[], def?: D): T | D。
// 注意 def?: D 的参数类型实际是 D | undefined，直接 `return xs.length > 0 ? xs[0] : def`
// 会报「Type 'D | undefined' is not assignable to type 'D | T'」——
// 所以对外用两个重载精确表达两种调用形态，实现里用 def ?? null 兑现「默认值是 null」：
function firstOrDefault<T>(xs: readonly T[]): T | null; // 不传 def：D 用默认值 null
function firstOrDefault<T, D>(xs: readonly T[], def: D): T | D; // 传 def：D 从实参推断
function firstOrDefault<T, D = null>(xs: readonly T[], def?: D): T | D | null {
  return xs.length > 0 ? xs[0] : (def ?? null);
}

const r1 = firstOrDefault([10, 20]); // def 没传，D 无推断点 => 回落默认 null => number | null
const empty: number[] = [];
const r2 = firstOrDefault(empty, 0); // D 从 0 推断为 number => number
const r3 = firstOrDefault(['x', 'y'], '(空)'); // D 推断为 string => string

// 证据（默认值真的生效了）：r1 是 number | null，不是 number
// 报错原文（两行）：
//   Type 'number | null' is not assignable to type 'number'.
//   Type 'null' is not assignable to type 'number'.
// @ts-expect-error - Type 'number | null' is not assignable to type 'number'.
const mustBeNumber: number = r1;
void mustBeNumber;

// ================================================================
// 5. keyof 约束：K extends keyof T 让「键」和「值类型 T[K]」联动
// ================================================================

function prop<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: 'Yidafu', age: 30 };
const pName: string = prop(person, 'name'); // K = 'name' => T[K] = string
const pAge: number = prop(person, 'age'); // K = 'age' => T[K] = number

// 编译期证据（本函数不会被调用）：
function keyofEvidence(): void {
  // 证据 1：key 被约束在 keyof T 之内，写错直接报错
  // 报错原文：Argument of type '"nickname"' is not assignable to parameter of type '"age" | "name"'.
  // @ts-expect-error - Argument of type '"nickname"' is not assignable to parameter of type '"age" | "name"'.
  prop(person, 'nickname');

  // 证据 2：返回类型 T[K] 精确跟随 key —— 'name' 取出来不是 number
  // 报错原文：Type 'string' is not assignable to type 'number'.
  // @ts-expect-error - Type 'string' is not assignable to type 'number'.
  const wrongAge: number = prop(person, 'name');
  void wrongAge;
}

function pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    result[k] = obj[k];
  }
  return result;
}
const picked = pick(person, ['name']); // Pick<typeof person, 'name'>

// ================================================================
// 运行验证
// ================================================================

console.log(`[泛型] idNum = ${idNum}，idStr = ${idStr}`);
console.log(`[first] first(['a','b']) => ${f1}；first([1,2]) => ${f2}`);
console.log(`[默认参数] firstOrDefault([10,20]) => ${r1}（类型 number | null：D 回落默认值 null）`);
console.log(`[默认参数] firstOrDefault(empty, 0) => ${r2}（D 推断为 number）`);
console.log(`[默认参数] firstOrDefault(['x','y'], '(空)') => ${r3}（D 推断为 string）`);
console.log(`[keyof] prop(person,'name') => ${pName}；prop(person,'age') => ${pAge}`);
console.log(`[pick] pick(person, ['name']) => ${JSON.stringify(picked)}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
