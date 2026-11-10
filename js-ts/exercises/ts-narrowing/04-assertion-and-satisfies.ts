/**
 * 大纲章节：阶段 3.1 基础与类型收窄（断言与 satisfies）
 * 主题：as 的谎言、双重断言、as const、satisfies 保留推断宽度（TS 4.9）、非空断言 !
 * 运行：npx tsx exercises/ts-narrowing/04-assertion-and-satisfies.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-narrowing/04-assertion-and-satisfies.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [as 谎言] asNumber.toFixed(2) 运行时翻车：TypeError: asNumber.toFixed is not a function
 * [as 替代] toNumber('3.5') => 3.5
 * [双重断言] viaUnknown.a => undefined
 * [as const] firstColor => red；endpoint.port => 443
 * [satisfies] checked.home => '/'（satisfies 保留了字面量；注解版是 '/' | '/login'，见 @ts-expect-error）
 * [satisfies] frozen = as const satisfies 组合，frozen.retries => 3（3 的字面量类型保留）
 * [非空断言] scoreOf('nobody') + 1 => NaN
 * [非空断言] set 后 scoreOf('ada') => 99
 */

// ================================================================
// 1. as 可能是谎言：编译器信任你，运行时不管你
// ================================================================

const raw: unknown = '42px'; // 假装来自 JSON.parse / fetch 响应
const asNumber = raw as number; // unknown -> number：一步断言，编译通过

try {
  console.log(`[as 谎言] asNumber.toFixed(2) => ${asNumber.toFixed(2)}`);
} catch (error) {
  // asNumber 运行时其实是 string —— toFixed 不存在，TypeError
  console.log(`[as 谎言] asNumber.toFixed(2) 运行时翻车：${(error as Error).constructor.name}: ${(error as Error).message}`);
}

// 正确姿势：把「断言」换成「收窄 + 校验」——类型与运行时都对得起账
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  throw new Error(`toNumber: 无法转换 ${JSON.stringify(value)}`);
}

// ================================================================
// 2. 双重断言 as unknown as T
// ================================================================

const greeting = 'hello'; // 类型 "hello"

// 直接断言到毫不相关的类型会被编译器拒绝（这是保护，不是麻烦）：
// 报错原文：Conversion of type 'string' to type '{ a: number; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
// @ts-expect-error - Conversion of type 'string' to type '{ a: number; }' may be a mistake...
const notOverlapping = greeting as { a: number };
void notOverlapping;

// 双重断言 = 明示「我知道两者不重叠，先擦成 unknown 再装回去」，责任完全交给开发者。
// 何时合理：第三方 .d.ts 把字段声明窄了/声明错了，改不了声明、又确知运行时形态时过渡使用；
// 除此之外优先改类型本身，或加运行时校验。
const viaUnknown = greeting as unknown as { a: number };

// ================================================================
// 3. as const：字面量 + readonly 化（TS 3.4《const assertions》）
// ================================================================

const palette = ['red', 'green'] as const; // 类型：readonly ["red", "green"]
const firstColor: 'red' = palette[0]; // 编译通过即证据：元素字面量被保留
// as const 后数组不可变（readonly 数组没有 push）：
// 报错原文：Property 'push' does not exist on type 'readonly ["red", "green"]'.
// @ts-expect-error - Property 'push' does not exist on type 'readonly ["red", "green"]'.
const pushRef = palette.push; // 只取引用不调用（运行时普通数组仍有 push；readonly 只在编译期）
void pushRef;

const endpoint = { host: 'api.example.com', port: 443 } as const;
const port: 443 = endpoint.port; // 数字字面量也被保留

// ================================================================
// 4. satisfies（TS 4.9）：校验类型，但不把推断结果加宽到注解类型
// ================================================================

type Theme = { home: '/' | '/login'; retries: number };

// 对照 A —— 类型注解：校验通过，但属性类型 = 注解类型（home 被定型为联合 '/' | '/login'）
const annotated: Theme = { home: '/', retries: 3 };
// 报错原文（两行）：
//   Type '"/" | "/login"' is not assignable to type '"/"'.
//   Type '"/login"' is not assignable to type '"/"'.
// @ts-expect-error - Type '"/" | "/login"' is not assignable to type '"/"'.
const a1: '/' = annotated.home;
void a1;

// 对照 B —— satisfies：同样校验，但保留推断出的 '/'（赋值兼容性证明字面量被保留）
const checked = { home: '/', retries: 3 } satisfies Theme;
const b1: '/' = checked.home; // 编译通过：checked.home 就是 '/'
// 报错原文：Type '"/"' is not assignable to type '"/login"'.
// @ts-expect-error - Type '"/"' is not assignable to type '"/login"'.
const b2: '/login' = checked.home;
void b2;

// 边界：satisfies 不等于 as const —— 数字仍按常规推断为 number
// 报错原文：Type 'number' is not assignable to type '3'.
// @ts-expect-error - Type 'number' is not assignable to type '3'.
const b3: 3 = checked.retries;
void b3;

// 对照 C —— as const satisfies 组合：校验 + 字面量全保留
const frozen = { home: '/', retries: 3 } as const satisfies Theme;
const c1: 3 = frozen.retries; // 编译通过：443/3 这类数字字面量也留住了
void c1;

// satisfies 不是「不检查」——校验失败照样报错（此处故意写错路由）：
// 报错原文（节选）：Type '"/home"' is not assignable to type '"/" | "/login"'.
// @ts-expect-error - Type '"/home"' is not assignable to type '"/" | "/login"'.
const wrongRoute = { home: '/home' } satisfies Theme;
void wrongRoute;

// 结构保留对照：注解会把 search 定型为注解的联合；satisfies 保留自然推断 string[]
type Routes = Record<string, readonly string[] | string>;

const routesAnno: Routes = { home: '/', search: ['/q'] }; // search: string | readonly string[]
// 报错原文（两行）：
//   Type 'string | readonly string[]' is not assignable to type 'string'.
//   Type 'readonly string[]' is not assignable to type 'string'.
// @ts-expect-error - Type 'string | readonly string[]' is not assignable to type 'string'.
const r1: string = routesAnno.search;
void r1;

const routesSat = { home: '/', search: ['/q'] } satisfies Routes; // search: string[]
// 报错原文：Type 'string[]' is not assignable to type 'string'.
// @ts-expect-error - Type 'string[]' is not assignable to type 'string'.
const r2: string = routesSat.search;
void r2;

// ================================================================
// 5. 非空断言 ! 的风险：抹掉 undefined，编译期零成本、运行时零保障
// ================================================================

const scores = new Map<string, number>();

function scoreOf(name: string): number {
  const found = scores.get(name); // number | undefined
  // 报错原文（两行）：
  //   Type 'number | undefined' is not assignable to type 'number'.
  //   Type 'undefined' is not assignable to type 'number'.
  // @ts-expect-error - Type 'number | undefined' is not assignable to type 'number'.
  const unchecked: number = found; // 不用 ! 的后果：编译器拦下你 —— 这是保护
  void unchecked;
  return found!; // 用 ! 绕过：类型里没有 undefined 了，但运行时它可能真的在
}

// 更安全的替代：found ?? 0、found?.toFixed(2)、或显式 if 判断后收窄

// ================================================================
// 运行验证
// ================================================================

console.log(`[as 替代] toNumber('3.5') => ${toNumber('3.5')}`);
console.log(`[双重断言] viaUnknown.a => ${viaUnknown.a}`); // undefined —— 谎言的代价静悄悄
console.log(`[as const] firstColor => ${firstColor}；endpoint.port => ${port}`);
console.log(`[satisfies] checked.home => '${checked.home}'（satisfies 保留了字面量；注解版是 '/' | '/login'，见 @ts-expect-error）`);
console.log(`[satisfies] frozen = as const satisfies 组合，frozen.retries => ${frozen.retries}（3 的字面量类型保留）`);
console.log(`[非空断言] scoreOf('nobody') + 1 => ${scoreOf('nobody') + 1}`); // NaN：undefined 静默扩散
scores.set('ada', 99);
console.log(`[非空断言] set 后 scoreOf('ada') => ${scoreOf('ada')}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
