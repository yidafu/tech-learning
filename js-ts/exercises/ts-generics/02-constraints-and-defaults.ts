/**
 * 大纲章节：阶段 3.2 泛型深入（约束与默认类型参数）
 * 主题：T extends { length: number } 上界、多重约束 A & B、默认类型参数、约束不足的编译期证据
 * 运行：npx tsx exercises/ts-generics/02-constraints-and-defaults.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-generics/02-constraints-and-defaults.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [上界] longest([1,2],[1,2,3]).length => 3
 * [上界] longest('ab','abc') => abc
 * [未约束] lengthUnchecked('abc') => 3
 * [未约束] lengthUnchecked(123) => undefined（编译期被压制，运行时读到 undefined）
 * [多重约束] snapshot(entry) => 1700000000000 → <entry/>
 * [默认] healthCheck.data 是 unknown：忘了收窄就想用会被拦下（见 @ts-expect-error）
 * [默认] userResp.data.name => Yidafu
 * [默认] r1 / r2 => {"ok":true,"value":1} / {"ok":false,"error":"404"}
 */

// ================================================================
// 1. 约束即「上界」：T extends { length: number }
// ================================================================
// 约束的语义：T 可以是任何【至少】有 length: number 的类型（string / 数组 / 自定义对象），
// 但函数体内对 T 的全部知识上限就是 { length: number }——多一点都拿不到
function longest<T extends { length: number }>(a: T, b: T): T {
  // 报错原文：Property 'push' does not exist on type 'T'.
  // @ts-expect-error - Property 'push' does not exist on type 'T'.
  const pushRef = a.push; // 只取引用不调用，运行时安全；证明「上界里没有 push」
  void pushRef;
  return a.length >= b.length ? a : b;
}

const longerArr = longest([1, 2], [1, 2, 3]); // T = number[]（数组有 length，满足上界）
const longerStr = longest('ab', 'abc'); // T = string

// 对照：没有约束时，T 上什么成员都没有
function lengthUnchecked<T>(x: T): number {
  // 报错原文：Property 'length' does not exist on type 'T'.
  // @ts-expect-error - Property 'length' does not exist on type 'T'.
  const len = x.length; // 只取引用，运行时安全
  return len; // 类型层面被压制后放行——运行时读到什么全看运气
}

// ================================================================
// 2. 多重约束：T extends A & B（语法上是一个 extends + 交集）
// ================================================================

interface Serializable {
  serialize(): string;
}
interface Timestamped {
  createdAt: number;
}

// 老版本语法 <T extends A, T extends B> 是非法的；多重约束用交集表达
function snapshot<T extends Serializable & Timestamped>(x: T): string {
  // 两个接口的成员在函数体内都可见（上界 = 交集）
  return `${x.createdAt} → ${x.serialize()}`;
}

const entry = {
  createdAt: 1700000000000,
  serialize: () => '<entry/>',
};

// ================================================================
// 3. 默认类型参数：不关心具体类型时不必被迫写尖括号
// ================================================================

// 场景 A：API 响应包装器 —— data 类型未知时给一个「安全的默认」unknown
interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

const healthCheck: ApiResponse = { status: 200, data: 'ok' }; // data: unknown
const userResp: ApiResponse<{ id: number; name: string }> = {
  status: 200,
  data: { id: 1, name: 'Yidafu' },
};

// unknown 默认值不是摆设：忘了收窄就想用会被拦下
// 报错原文：Type 'unknown' is not assignable to type 'string'.
// @ts-expect-error - Type 'unknown' is not assignable to type 'string'.
const dataUnchecked: string = healthCheck.data;
void dataUnchecked;
const dataChecked: string = userResp.data.name; // 显式传参后 data 类型明确

// 场景 B：Result 的错误类型默认 Error，调用方可按需换
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const res1: Result<number> = { ok: true, value: 1 }; // E 默认 Error
const res2: Result<number, string> = { ok: false, error: '404' }; // E 显式 string

// 无推断点时回落默认值或显式传参：构造函数是最常见的显式传参位置（见 03-generic-classes.ts 的 new Stack<number>()）

// ================================================================
// 4. 约束不满足的编译期证据（本函数不会被调用）
// ================================================================

function constraintEvidence(): void {
  // 证据 1：number 没有 length，不满足上界
  // 报错原文：Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
  // @ts-expect-error - Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
  longest(10, 20);

  // 证据 2：缺 createdAt，不满足 Serializable & Timestamped
  // 报错原文（两行）：
  //   Argument of type '{ serialize: () => string; }' is not assignable to parameter of type 'Serializable & Timestamped'.
  //   Property 'createdAt' is missing in type '{ serialize: () => string; }' but required in type 'Timestamped'.
  // @ts-expect-error - Argument of type '{ serialize: () => string; }' is not assignable to parameter of type 'Serializable & Timestamped'.
  snapshot({ serialize: () => 'x' });
}

// ================================================================
// 运行验证
// ================================================================

console.log(`[上界] longest([1,2],[1,2,3]).length => ${longerArr.length}`);
console.log(`[上界] longest('ab','abc') => ${longerStr}`);
console.log(`[未约束] lengthUnchecked('abc') => ${lengthUnchecked('abc')}`);
console.log(`[未约束] lengthUnchecked(123) => ${lengthUnchecked(123)}（编译期被压制，运行时读到 undefined）`);
console.log(`[多重约束] snapshot(entry) => ${snapshot(entry)}`);
console.log(`[默认] healthCheck.data 是 unknown：忘了收窄就想用会被拦下（见 @ts-expect-error）`);
console.log(`[默认] userResp.data.name => ${dataChecked}`);
console.log(`[默认] r1 / r2 => ${JSON.stringify(res1)} / ${JSON.stringify(res2)}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
