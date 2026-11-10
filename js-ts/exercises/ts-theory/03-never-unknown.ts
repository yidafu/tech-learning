/**
 * 大纲章节：阶段 3.5 类型系统理论——never 与 unknown
 * 主题：never 的四种角色（bottom / 空联合 / 条件类型过滤器 / 穷尽检查）、unknown 的限制清单、any 传染、{} vs object vs Object
 * 运行：npx tsx exercises/ts-theory/03-never-unknown.ts
 * 类型校验：npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-theory/03-never-unknown.ts
 *   （--ignoreConfig：TypeScript 7 起，目录里存在 tsconfig.json 时给 tsc 显式传文件必须加它，否则报 TS5112）
 * 预期输出：
 *   角色 1 bottom：never extends string 推演 = never 是一切类型的子类型
 *   角色 1 bottom：never[] 可安全赋给 string[]，长度 = 0
 *   角色 2 空联合：'a' | never 坍缩为 'a'，Distribution<never> = never
 *   角色 3 过滤器：OnlyString<'a'|'b'|1|2> = a,b
 *   角色 4 穷尽检查：circle 面积 3.14，square 面积 9
 *   角色 4 永不返回：parseSize('hello') = 5
 *   unknown 允许：比较 / 断言（注意 as 不转换运行时值）： false object
 *   unknown 经类型守卫收窄后才能用： 42
 *   any 传染链一路绿灯（结果是 undefined）： undefined
 *   unknown 一步都不敢走（见 @ts-expect-error）
 *   catch 变量在 strict 下是 unknown： boom
 *   矩阵：{} 接受一切非 nullish： number string object function
 *   矩阵：object 只接受非原始： object object function
 *   矩阵：Object 行为≈{}（同样拒绝 null）： number
 */

// ────────────────────────────────────────────────────────────
// 角色 1：bottom type——一切类型的子类型，且没有任何值
// never 不能有值，所以运行时演示要用「类型级证据」：
// 下面的赋值只有在编译器推演出对应结果时才能通过类型检查。
// ────────────────────────────────────────────────────────────
type NeverExtendsString = never extends string ? 'never 是一切类型的子类型' : '不是';
const proof1: NeverExtendsString = 'never 是一切类型的子类型'; // 推演：never extends 任何 X 恒真 → 走 true 分支
console.log('角色 1 bottom：never extends string 推演 =', proof1);

const emptyList: never[] = []; // never[] 是唯一能造出的「never 相关」运行时值：空数组
const asStringList: string[] = emptyList; // OK：元素 never 可赋给 string（bottom）
console.log('角色 1 bottom：never[] 可安全赋给 string[]，长度 =', asStringList.length);

// @ts-expect-error - Type 'number' is not assignable to type 'never'（除 never 自己，谁都进不了 never）
const notNever: never = 123;

// ────────────────────────────────────────────────────────────
// 角色 2：空联合——never 在联合中被吸收；分布式条件类型对 never 分布得 never
// ────────────────────────────────────────────────────────────
type Collapsed = 'a' | never; // = 'a'：联合是「可能取值的集合」，空集并进来什么也不改变
const onlyA: Collapsed = 'a';
// @ts-expect-error - Type '"b"' is not assignable to type '"a"'（证明 Collapsed 已坍缩为 'a'）
const wrongB: Collapsed = 'b';

type Distribution<T> = T extends string ? 'str' : 'non-str';
type OverNever = Distribution<never>; // 分布式条件类型在「空联合」上分布：没有成员可走分支 → 结果为 never
type IsNever = [OverNever] extends [never] ? 'never' : '不是'; // 包一层元组避免再被分布
const proof2: IsNever = 'never';
console.log("角色 2 空联合：'a' | never 坍缩为 'a'，Distribution<never> =", proof2);

// ────────────────────────────────────────────────────────────
// 角色 3：条件类型过滤器（Exclude/Extract 的原理）
// ────────────────────────────────────────────────────────────
type OnlyString<T> = T extends string ? T : never;
type Filtered = OnlyString<'a' | 'b' | 1 | 2>; // 分布：'a'|'b'|never|never → 'a' | 'b'
const goods: Filtered[] = ['a', 'b'];
// @ts-expect-error - Type 'number' is not assignable to type '"a" | "b"'（1、2 已被 never 过滤掉）
const bads: Filtered[] = ['a', 1];
console.log("角色 3 过滤器：OnlyString<'a'|'b'|1|2> =", goods.join(','));

// ────────────────────────────────────────────────────────────
// 角色 4a：穷尽检查（exhaustiveness check）
// ────────────────────────────────────────────────────────────
type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'square'; readonly side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;
    case 'square':
      return s.side ** 2;
    default: {
      // 所有 case 都覆盖后 s 在这里是 never；若日后给 Shape 新增成员而忘了写 case，
      // s 就不再是 never，这一行立刻报错——把「漏写分支」从运行时事故变成编译期红线
      const exhausted: never = s;
      return exhausted; // never 可赋给 number（bottom），运行时永远走不到
    }
  }
}
console.log('角色 4 穷尽检查：circle 面积', area({ kind: 'circle', radius: 1 }).toFixed(2) + '，square 面积', area({ kind: 'square', side: 3 }));

// ────────────────────────────────────────────────────────────
// 角色 4b：永不返回的函数——throw / 死循环的返回类型
// ────────────────────────────────────────────────────────────
function invariantFailure(message: string): never {
  throw new Error(`不变量被破坏: ${message}`);
}
function parseSize(input: string | null): number {
  if (input === null) invariantFailure('input 不能为 null'); // 控制流分析知道这个分支不会「活着」回来
  return input.length; // 因此 input 在这里已收窄为 string；若返回类型写成 void，这里就报错了
}
console.log("角色 4 永不返回：parseSize('hello') =", parseSize('hello'));

// ────────────────────────────────────────────────────────────
// unknown：top type（TS 3.0）——「不知道是什么」，所以什么都不许直接做
// 允许的操作只有三类：比较、断言/收窄、赋给 unknown
// ────────────────────────────────────────────────────────────
const input: unknown = JSON.parse('{"answer":42}');

const eq: boolean = input === 42; // 允许：比较
const asserted: number = input as number; // 允许：断言（后果自负）
// 注意下一行打印 typeof 是 object：as 只骗过编译器，不转换运行时值！
console.log('unknown 允许：比较 / 断言（注意 as 不转换运行时值）：', eq, typeof asserted);

// 拒绝清单（每条一个 @ts-expect-error 证据；运行时这些行都会执行，故全部选了无害写法）
// @ts-expect-error - 'input' is of type 'unknown'（不能属性访问）
input.answer;
const maybeFn: unknown = () => 'hi';
// @ts-expect-error - 'maybeFn' is of type 'unknown'（不能调用——即使运行时它真是函数）
maybeFn();
// @ts-expect-error - Operator '+' cannot be applied to types 'unknown' and 'number'（不能算术）
void (input + 1);
// @ts-expect-error - Type 'unknown' is not assignable to type 'string'（不能直接赋给具体类型）
const asStr: string = input;
// @ts-expect-error - No overload matches this call（不能当参数传给要具体类型的函数）
new Date(input);

// 收窄是唯一「解锁」方式：用类型守卫把 unknown 变成具体类型
function hasAnswer(v: unknown): v is { answer: number } {
  return typeof v === 'object' && v !== null && 'answer' in v;
}
if (hasAnswer(input)) {
  console.log('unknown 经类型守卫收窄后才能用：', input.answer); // 42
}

// ────────────────────────────────────────────────────────────
// any vs unknown：any 双向豁免且传染；unknown 只能收窄后使用
// ────────────────────────────────────────────────────────────
const anyVal: any = JSON.parse('{"answer":42}');
const infected: number = anyVal.answer.x; // 一路 any，全部放行；answer 其实是 42，取 .x 得 undefined——类型上却声称是 number
console.log('any 传染链一路绿灯（结果是 undefined）：', infected);

const unknownVal: unknown = JSON.parse('{"answer":42}');
// @ts-expect-error - Property 'answer' does not exist on type 'unknown'（unknown 不传染）
const blocked: number = unknownVal.answer;
console.log('unknown 一步都不敢走（见 @ts-expect-error）');

// catch 变量：strict 家族的 useUnknownInCatchVariables（TS 4.4）让 err 从 any 变 unknown
try {
  throw new Error('boom');
} catch (err) {
  // @ts-expect-error - 'err' is of type 'unknown'（必须先收窄/断言才能用）
  void err.message;
  console.log('catch 变量在 strict 下是 unknown：', (err as Error).message);
}

// ────────────────────────────────────────────────────────────
// {} vs object vs Object 赋值兼容矩阵
//   {}     「非 nullish 的一切」（原始值也收）
//   object 「非原始类型」（对象/数组/函数）
//   Object ≈ {}，只是还带着 Object.prototype 的方法；官方建议永远别显式写它
// ────────────────────────────────────────────────────────────
const e1: {} = 42;
const e2: {} = 'str';
const e3: {} = { k: 1 };
const e4: {} = () => 1;
// @ts-expect-error - Type 'null' is not assignable to type '{}'（{} 只拒绝 null/undefined）
const e5: {} = null;
console.log('矩阵：{} 接受一切非 nullish：', typeof e1, typeof e2, typeof e3, typeof e4);

const o1: object = { k: 1 };
const o2: object = [1, 2];
const o3: object = () => 1;
// @ts-expect-error - Type 'number' is not assignable to type 'object'（object 拒绝一切原始类型）
const o4: object = 42;
console.log('矩阵：object 只接受非原始：', typeof o1, typeof o2, typeof o3);

const bigO: Object = 42; // 编译通过：Object 也接受非 nullish —— 但别这么用，读不了 42 上的任何东西
// @ts-expect-error - Type 'null' is not assignable to type 'Object'（同样拒绝 null）
const bigNull: Object = null;
console.log('矩阵：Object 行为≈{}（同样拒绝 null）：', typeof bigO);
