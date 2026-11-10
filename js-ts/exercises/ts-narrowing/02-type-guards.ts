/**
 * 大纲章节：阶段 3.1 基础与类型收窄（自定义类型守卫与断言函数）
 * 主题：类型谓词 x is T 的能力与危险、与 boolean 返回值的差别、asserts 断言函数、unknown 渐进收窄链
 * 运行：npx tsx exercises/ts-narrowing/02-type-guards.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-narrowing/02-type-guards.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [is] live({ swim }) => 游泳
 * [is] live({ fly }) => 飞
 * [is-错] isFishBroken(bird) 编译通过，运行时翻车：TypeError: bird.swim is not a function
 * [boolean] liveBoolean({ swim }) => boolean 守卫内未收窄（pet.swim 编译期取不到）
 * [boolean] liveBoolean({ fly }) => 飞
 * [asserts] shout('ok') => OK
 * [asserts] shout(42) => 断言失败：assertIsString: 期望 string，实际 number
 * [asserts-cond] lengthAfterAssert('abc') => 3
 * [asserts-def] assertDefined(maybeAge) 后 maybeAge + 12 => 42
 * [unknown] describe(3.14) => number: 3.14
 * [unknown] describe('hi') => string: hi
 * [unknown] describe(new Map([[1,'a']])) => Map(size=1)
 * [unknown] describe([1,2,3]) => Array(3)
 * [unknown] describe({ a: 1 }) => plain object
 * [unknown] describe(null) => 其他
 */

interface Fish {
  swim: () => string;
}
interface Bird {
  fly: () => string;
}

// ================================================================
// 1. 自定义类型谓词 pet is Fish（Handbook《Narrowing》: Using type predicates）
// ================================================================
// 签名要求：`pet is Fish` 中的参数名 pet 必须对应函数的某个参数；
// 编译器只认这个「声明」，不会去验证函数体逻辑与声明是否一致（见第 3 节的危险点）
function isFish(pet: Fish | Bird): pet is Fish {
  // 注意：函数体内没有任何特殊能力，访问 swim 仍需要断言
  return typeof (pet as Fish).swim === 'function';
}

function live(pet: Fish | Bird): string {
  if (isFish(pet)) {
    // 此处 pet: Fish —— 收窄来自谓词「声明」，不是来自函数体
    return pet.swim();
  }
  // 此处 pet: Bird（联合只剩这一支）
  return pet.fly();
}

// ================================================================
// 2. 对照：返回 boolean 的普通守卫没有收窄能力
// ================================================================

function isFishBoolean(pet: Fish | Bird): boolean {
  return typeof (pet as Fish).swim === 'function';
}

function liveBoolean(pet: Fish | Bird): string {
  if (isFishBoolean(pet)) {
    // 此处 pet: Fish | Bird —— 收窄没有发生！if 条件对编译器只是个布尔值
    // 报错原文（两行）：
    //   Property 'swim' does not exist on type 'Bird | Fish'.
    //   Property 'swim' does not exist on type 'Bird'.
    // @ts-expect-error - Property 'swim' does not exist on type 'Bird | Fish'.
    const swimRef = pet.swim; // 只取引用不调用，运行时安全
    void swimRef;
    return 'boolean 守卫内未收窄（pet.swim 编译期取不到）';
  }
  // 此处 pet: Fish | Bird（else 同样未收窄）
  // 报错原文（两行）：
  //   Property 'fly' does not exist on type 'Bird | Fish'.
  //   Property 'fly' does not exist on type 'Fish'.
  // @ts-expect-error - Property 'fly' does not exist on type 'Bird | Fish'.
  return pet.fly();
}

// ================================================================
// 3. 谓词写错的危险：TS 信任声明，运行时翻车
// ================================================================
// 危险点：下面这个函数声称 pet is Fish，判断逻辑检测的却是「是不是 Bird」。
// 编译器完全不负责核验谓词与逻辑的一致性——写错了照样编译通过。
function isFishBroken(pet: Fish | Bird): pet is Fish {
  return typeof (pet as Bird).fly === 'function';
}

const bird: Bird = { fly: () => '飞' };

// ================================================================
// 4. 断言函数 asserts（TS 3.7《Assertion Functions》）
// ================================================================
// 与谓词的差别：
//   谓词函数：if (isFish(pet)) {...}      —— 只在 if 为真的分支内收窄
//   断言函数：assertIsFish(pet) 之后的代码 —— 调用点之后【所有代码】视为已收窄，不成立就抛错
// 签名要求：必须显式写 asserts；用 const fn = function(){...} 赋值形式时，
//           调用方还会要求该变量有显式类型注解（TS 3.7 的已知限制）
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`assertIsString: 期望 string，实际 ${typeof value}`);
  }
}

function shout(value: unknown): string {
  assertIsString(value);
  // 调用点之后：value: string（不需要 if 包裹）
  return value.toUpperCase();
}

// asserts condition：断言「传入的条件表达式为真」，并按该表达式收窄
function assertTrue(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error('assertTrue: 条件为假');
  }
}

function lengthAfterAssert(x: string | null): number {
  assertTrue(x !== null);
  // 此处 x: string —— 收窄信息来自调用处传入的表达式 x !== null
  return x.length;
}

// 泛型断言：把 T | null | undefined 断言成 T
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('assertDefined: 值为空');
  }
}

const maybeAge: number | null = 30;
assertDefined(maybeAge);
// 此处 maybeAge: number（调用点之后）

// ================================================================
// 5. unknown 的渐进收窄链：先收窄，才能用
// ================================================================

// 编译期证据（本函数不会被调用）：
// unknown 是「最安全的顶类型」：不做任何收窄就取成员，一律被拒
function unknownEvidence(value: unknown): void {
  // 报错原文：'value' is of type 'unknown'.
  // @ts-expect-error - 'value' is of type 'unknown'.
  const toFixedRef = value.toFixed;
  void toFixedRef;
}

function describe(value: unknown): string {
  if (typeof value === 'number') {
    // 此处 value: number
    return `number: ${value.toFixed(2)}`;
  }
  if (typeof value === 'string') {
    // 此处 value: string
    return `string: ${value}`;
  }
  if (typeof value === 'object' && value !== null) {
    // 此处 value: object —— 只知道是对象，具体成员仍不可访问，继续下钻
    if (value instanceof Map) {
      // 此处 value: Map<any, any>
      return `Map(size=${value.size})`;
    }
    if (Array.isArray(value)) {
      // 此处 value: any[]
      return `Array(${value.length})`;
    }
    return 'plain object';
  }
  return '其他'; // null（typeof null === 'object' 但 !== null 不成立）以及 boolean/symbol/bigint/undefined
}

// ================================================================
// 运行验证
// ================================================================

console.log(`[is] live({ swim }) => ${live({ swim: () => '游泳' })}`);
console.log(`[is] live({ fly }) => ${live({ fly: () => '飞' })}`);
try {
  // 编译期：isFishBroken(bird) 为真 => bird 被当作 Fish => bird.swim() 合法
  // 运行期：bird 上根本没有 swim —— TypeError
  const result = isFishBroken(bird) ? bird.swim() : '(到不了这)';
  console.log(`[is-错] isFishBroken(bird) ? bird.swim() => ${result}`);
} catch (error) {
  console.log(`[is-错] isFishBroken(bird) 编译通过，运行时翻车：${(error as Error).constructor.name}: ${(error as Error).message}`);
}
console.log(`[boolean] liveBoolean({ swim }) => ${liveBoolean({ swim: () => '游泳' })}`);
console.log(`[boolean] liveBoolean({ fly }) => ${liveBoolean({ fly: () => '飞' })}`);
console.log(`[asserts] shout('ok') => ${shout('ok')}`);
try {
  shout(42);
} catch (error) {
  console.log(`[asserts] shout(42) => 断言失败：${(error as Error).message}`);
}
console.log(`[asserts-cond] lengthAfterAssert('abc') => ${lengthAfterAssert('abc')}`);
console.log(`[asserts-def] assertDefined(maybeAge) 后 maybeAge + 12 => ${maybeAge + 12}`);
console.log(`[unknown] describe(3.14) => ${describe(3.14)}`);
console.log(`[unknown] describe('hi') => ${describe('hi')}`);
console.log(`[unknown] describe(new Map([[1,'a']])) => ${describe(new Map([[1, 'a']]))}`);
console.log(`[unknown] describe([1,2,3]) => ${describe([1, 2, 3])}`);
console.log(`[unknown] describe({ a: 1 }) => ${describe({ a: 1 })}`);
console.log(`[unknown] describe(null) => ${describe(null)}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
