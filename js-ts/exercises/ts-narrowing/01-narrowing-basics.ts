/**
 * 大纲章节：阶段 3.1 基础与类型收窄
 * 主题：typeof / truthiness / 相等性 / in / instanceof 五类原生收窄的编译期证据与运行时行为
 * 运行：npx tsx exercises/ts-narrowing/01-narrowing-basics.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-narrowing/01-narrowing-basics.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [typeof] padLeft('42', 4) => 000042
 * [typeof] padLeft('42', 'ab') => ab42
 * [typeof-null] formatBoxFixed(new Date(0)) => 1970-01-01T00:00:00.000Z
 * [typeof-null] formatBoxFixed(null) => (null)
 * [truthiness] describeTruthiness('hi') => truthy: string
 * [truthiness] describeTruthiness('') => falsy（''、0、NaN、null、undefined 都走这里）
 * [truthiness] describeTruthiness(0) => falsy（''、0、NaN、null、undefined 都走这里）
 * [truthiness] greet('') => || 得到 游客；?? 得到 ''
 * [truthiness] greet(null) => || 得到 游客；?? 得到 '游客'
 * [equality] eqNarrow(null) => (empty)
 * [equality] eqNarrow('hi') => value: hi
 * [equality] icon('idle') => [.] idle（s 已收窄为 'idle'）
 * [in] speak({ meow }) => 喵
 * [in] speak({ bark }) => 汪
 * [in-optional] readTag({ kind: 'fileA', tag: 7 }) => tag 在（类型上仍是 number | undefined）：7
 * [in-optional] readTag({ kind: 'fileA' }) => 无 tag（可选属性运行时可以真的不存在）
 * [in-optional] readTag({ kind: 'fileB' }) => 无 tag（可选属性运行时可以真的不存在）
 * [instanceof] parseDate(new Date(0)) => 1970-01-01T00:00:00.000Z
 * [instanceof] parseDate('2024-01-01') => 2024-01-01T00:00:00.000Z
 *
 * 说明：类型是编译期信息，无法用 console.log 打印。
 * 每段「此处 x: T」都是类型层面的结论，用 @ts-expect-error 的报错原文做证据：
 * 如果该处没有真的收窄，tsc 会报错；@ts-expect-error 反向验证「不收窄就报错」。
 */

// ================================================================
// 1. typeof 守卫：按 typeof 运算符的返回值切分联合
// ================================================================

function padLeft(value: string, padding: string | number): string {
  if (typeof padding === 'number') {
    // 此处 padding: number（联合中 typeof === 'number' 的成员被选中）
    return '0'.repeat(padding) + value;
  }
  // 此处 padding: string（排除法：剩下的成员）
  return padding + value;
}

// 编译期证据（本函数不会被调用，只证明「不收窄就报错」）：
function evidenceNoNarrowing(padding: string | number): void {
  // 此处 padding: string | number
  // 报错原文（两行）：
  //   Property 'repeat' does not exist on type 'string | number'.
  //   Property 'repeat' does not exist on type 'number'.
  // @ts-expect-error - Property 'repeat' does not exist on type 'string | number'.
  padding.repeat(2);
}

// ---------- typeof 的历史陷阱：typeof null === 'object' ----------
// 一手依据：ECMA-262《The typeof Operator》的返回表——null 的返回值就是 "object"（历史包袱）
function formatBoxBroken(x: Date | null): string {
  if (typeof x === 'object') {
    // 陷阱：Date 和 null 的 typeof 都是 'object'，本分支 x 仍是 Date | null，没有收窄！
    // 报错原文：'x' is possibly 'null'.
    // @ts-expect-error - 'x' is possibly 'null'.
    return x.toISOString();
  }
  return '(null)';
}
// formatBoxBroken(null) 运行时会 TypeError——这就是「typeof 排不掉 null」的后果。
// 该函数故意不被调用。

function formatBoxFixed(x: Date | null): string {
  // 正确姿势：typeof 之后补 x !== null（对本联合来说直接 x !== null 也够）
  if (typeof x === 'object' && x !== null) {
    // 此处 x: Date
    return x.toISOString();
  }
  return '(null)';
}

// ================================================================
// 2. truthiness 收窄：按 ToBoolean 的真假切分（注意副作用）
// ================================================================

function describeTruthiness(x: string | number | null | undefined): string {
  if (x) {
    // 此处 x: string | number（null/undefined 被排除）
    // 注意：''、0、NaN 运行时进不来这里，但类型系统无法从 string/number 里「减掉」它们
    // 报错原文（两行）：
    //   Property 'length' does not exist on type 'string | number'.
    //   Property 'length' does not exist on type 'number'.
    // @ts-expect-error - Property 'length' does not exist on type 'string | number'.
    x.length; // 只取属性不调用，运行时安全（number.length 是 undefined，不会炸）
    return `truthy: ${typeof x}`;
  }
  // 此处 x: string | number | null | undefined —— 注意 number 还在！
  // 原因：0 和 NaN 也是 falsy 的 number，而类型系统没有「非零 number」这种类型
  return "falsy（''、0、NaN、null、undefined 都走这里）";
}

// 后果演示：|| 会把 '' 当成「没有值」吞掉，?? 只针对 null/undefined
function greet(name: string | null): string {
  const withOr = name || '游客'; // truthiness 判断：'' 也被替换
  const withQq = name ?? '游客'; // 空值合并（TS 3.7+）：只兜 null/undefined
  return `|| 得到 ${withOr}；?? 得到 '${withQq}'`;
}

// ================================================================
// 3. 相等性收窄：=== / !== / switch 对字面量与 null/undefined 的切分
// ================================================================

function eqNarrow(x: string | number | null | undefined): string {
  if (x === null || x === undefined) {
    // 此处 x: null | undefined
    return '(empty)';
  }
  // 此处 x: string | number
  // 报错原文（两行）：
  //   Type 'string | number' is not assignable to type 'string'.
  //   Type 'number' is not assignable to type 'string'.
  // @ts-expect-error - Type 'string | number' is not assignable to type 'string'.
  const asString: string = x;
  return `value: ${asString}`;
}

type Status = 'idle' | 'loading' | 'error';

function icon(s: Status): string {
  switch (s) {
    case 'idle': {
      // 此处 s: 'idle'
      const proof: 'idle' = s; // 编译通过本身就是收窄证据：'idle' 能赋给 'idle'
      // 报错原文：Type '"idle"' is not assignable to type '"loading"'.
      // @ts-expect-error - Type '"idle"' is not assignable to type '"loading"'.
      const wrong: 'loading' = s;
      void proof;
      void wrong;
      return "[.] idle（s 已收窄为 'idle'）";
    }
    case 'loading':
      return '[~] loading';
    case 'error':
      return '[x] error';
  }
}

// ================================================================
// 4. in 收窄：按「属性是否出现在类型的声明中」切分
// ================================================================

interface Cat {
  meow: () => string;
}
interface Dog {
  bark: () => string;
}

function speak(animal: Cat | Dog): string {
  if ('meow' in animal) {
    // 此处 animal: Cat（Dog 的声明里完全没有 meow，整支被排除）
    return animal.meow();
  }
  // 此处 animal: Dog
  // 报错原文：Property 'meow' does not exist on type 'Dog'.
  // @ts-expect-error - Property 'meow' does not exist on type 'Dog'.
  const meowRef: () => string = animal.meow; // 只取引用不调用，运行时安全
  void meowRef;
  return animal.bark();
}

// 可选属性的边界：in 只能排除「声明里完全没有该属性」的成员；
// 可选属性的成员留在分支里，属性类型也不会从 number | undefined 变成 number
type FileLike =
  | { kind: 'fileA'; tag?: number } // tag 可选
  | { kind: 'fileB' }; // 完全没有 tag

function readTag(x: FileLike): string {
  if ('tag' in x) {
    // 此处 x: { kind: 'fileA'; tag?: number }（fileB 被排除，但 tag 仍是可选）
    // 报错原文（两行）：
    //   Type 'number | undefined' is not assignable to type 'number'.
    //   Type 'undefined' is not assignable to type 'number'.
    // @ts-expect-error - Type 'number | undefined' is not assignable to type 'number'.
    const n: number = x.tag;
    void n;
    return `tag 在（类型上仍是 number | undefined）：${x.tag}`;
  }
  // 此处 x: { kind: 'fileB' } —— 但注意运行时 gap：
  // { kind: 'fileA' } 且真的没写 tag 的对象，'tag' in x 为 false，也会走到这里
  return '无 tag（可选属性运行时可以真的不存在）';
}

// ================================================================
// 5. instanceof 收窄：沿原型链查「右侧构造函数的 prototype」
// ================================================================

function parseDate(input: string | Date): string {
  if (input instanceof Date) {
    // 此处 input: Date
    return input.toISOString();
  }
  // 此处 input: string
  // 报错原文：Property 'getTime' does not exist on type 'string'.
  // @ts-expect-error - Property 'getTime' does not exist on type 'string'.
  const getTimeRef: () => number = input.getTime; // 只取引用不调用，运行时安全
  void getTimeRef;
  return new Date(input).toISOString();
}
// 跨 realm 提醒（一句话）：instanceof 查的是右侧构造函数的 prototype 是否在左侧对象的原型链上；
// 另一个 iframe / worker / vm 实例里的 Date 是另一个构造函数，跨 realm 对象会得到 false（大纲阶段 1.3）。

// ================================================================
// 运行验证
// ================================================================

console.log(`[typeof] padLeft('42', 4) => ${padLeft('42', 4)}`);
console.log(`[typeof] padLeft('42', 'ab') => ${padLeft('42', 'ab')}`);
console.log(`[typeof-null] formatBoxFixed(new Date(0)) => ${formatBoxFixed(new Date(0))}`);
console.log(`[typeof-null] formatBoxFixed(null) => ${formatBoxFixed(null)}`);
console.log(`[truthiness] describeTruthiness('hi') => ${describeTruthiness('hi')}`);
console.log(`[truthiness] describeTruthiness('') => ${describeTruthiness('')}`);
console.log(`[truthiness] describeTruthiness(0) => ${describeTruthiness(0)}`);
console.log(`[truthiness] greet('') => ${greet('')}`);
console.log(`[truthiness] greet(null) => ${greet(null)}`);
console.log(`[equality] eqNarrow(null) => ${eqNarrow(null)}`);
console.log(`[equality] eqNarrow('hi') => ${eqNarrow('hi')}`);
console.log(`[equality] icon('idle') => ${icon('idle')}`);
console.log(`[in] speak({ meow }) => ${speak({ meow: () => '喵' })}`);
console.log(`[in] speak({ bark }) => ${speak({ bark: () => '汪' })}`);
console.log(`[in-optional] readTag({ kind: 'fileA', tag: 7 }) => ${readTag({ kind: 'fileA', tag: 7 })}`);
console.log(`[in-optional] readTag({ kind: 'fileA' }) => ${readTag({ kind: 'fileA' })}`);
console.log(`[in-optional] readTag({ kind: 'fileB' }) => ${readTag({ kind: 'fileB' })}`);
console.log(`[instanceof] parseDate(new Date(0)) => ${parseDate(new Date(0))}`);
console.log(`[instanceof] parseDate('2024-01-01') => ${parseDate('2024-01-01')}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
