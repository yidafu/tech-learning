/**
 * 大纲章节：阶段 3.3 类型编程——变长元组类型（variadic tuple types）
 * 主题：手写 Concat/Prepend/Reverse（递归）/TupleToUnion；展开推断（元组片段的 infer）；元组与 rest 参数联动（safeCall 类型安全化）
 * 运行：npx tsx exercises/ts-type-programming/05-variadic-tuples.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-programming/05-variadic-tuples.ts
 * 预期输出：
 * [1,2,"a"]
 * [0,1,2]
 * 3,2,1
 * 3,2,1
 * a 1
 * 6
 * true
 */

// 类型层断言工具
type Equal<A, B> = (<T>() => (T extends A ? 1 : 2)) extends (<T>() => (T extends B ? 1 : 2)) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、四个元组运算（类型层）
// ============================================================

// 展开语法：[...A, ...B] 在类型位置拼接两个元组
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];

// 头部插入：单个元素 + 展开一个元组
type Prepend<E, T extends readonly unknown[]> = [E, ...T];

// 递归反转：匹配「头 + 剩余」，反转剩余后把头接到末尾；空元组 [] 是递归出口
type Reverse<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? [...Reverse<R>, F]
  : [];

// 递归收集成员：每步吐出头部成员 F，空元组出口吐 never（联合的单位元）
type TupleToUnion<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? F | TupleToUnion<R>
  : never;

// 展开推断之二：rest 模式放在头部，挖出末位元素
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

type _a1 = Expect<Equal<Concat<[1, 2], ["a"]>, [1, 2, "a"]>>;
type _a2 = Expect<Equal<Prepend<0, [1, 2]>, [0, 1, 2]>>;
type _a3 = Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>;
type _a4 = Expect<Equal<Reverse<readonly [1, 2]>, [2, 1]>>;
type _a5 = Expect<Equal<Reverse<[]>, []>>;
type _a6 = Expect<Equal<TupleToUnion<["a", 1, true]>, "a" | 1 | true>>;
type _a7 = Expect<Equal<TupleToUnion<[]>, never>>;
type _a8 = Expect<Equal<Last<[string, number, boolean]>, boolean>>;

// 元组与数组的分界：number[] 不是元组，Reverse 匹配不到 → 递归出口给 []
type _a9 = Expect<Equal<Reverse<number[]>, []>>;

// ============================================================
// 二、运行时镜像：类型的递归结构与运行时递归一一对应
// ============================================================

const t1 = [1, 2] as const; // as const 把数组字面量收成 readonly 元组
const t2 = ["a"] as const;
const merged: Concat<typeof t1, typeof t2> = [...t1, ...t2]; // 展开语法在值位置与类型位置同构
console.log(JSON.stringify(merged)); // [1,2,"a"]

const pushed: Prepend<0, [1, 2]> = [0, 1, 2];
console.log(JSON.stringify(pushed)); // [0,1,2]

// 手写运行时镜像（与类型 Reverse 相同的递归形状）；结构对齐靠断言收尾
function reverseRuntime<T extends readonly unknown[]>(arr: T): Reverse<T> {
  return [...arr].reverse() as Reverse<T>;
}
console.log(reverseRuntime([1, 2, 3] as const).join(",")); // 3,2,1

const rev: Reverse<[1, 2, 3]> = [3, 2, 1]; // 静态版本：值必须精确满足反转后的元组
console.log(rev.join(",")); // 3,2,1

// ============================================================
// 三、TupleToUnion：联合是类型层概念，运行时只能验证「成员资格」
// ============================================================

type Mixed = TupleToUnion<["a", 1, true]>; // "a" | 1 | true
const member1: Mixed = "a";
const member2: Mixed = 1;
// @ts-expect-error - "b" 不是元组成员，自然也不在联合里
const notMember: Mixed = "b";
console.log(member1, member2); // a 1

// ============================================================
// 四、元组与 rest 参数联动：参数转发不丢类型
// ============================================================

// 函数的 rest 参数类型就是一个元组：Parameters 挖出来，可以原样 spread 回去
function safeCall<F extends (...args: any[]) => unknown>(fn: F, ...args: Parameters<F>): ReturnType<F> {
  return fn(...args) as ReturnType<F>; // spread 元组进 rest 参数：变长元组的核心工程价值
}

const sum3 = (a: number, b: number, c: number) => a + b + c;
console.log(safeCall(sum3, 1, 2, 3)); // 6
// @ts-expect-error - rest 形参的元组是 [a: number, b: number, c: number]，缺第三个参数不行
safeCall(sum3, 1, 2);

// ============================================================
// 五、Last：展开推断的应用
// ============================================================

const last: Last<[string, number, boolean]> = true;
// @ts-expect-error - 末位元素类型是 boolean
const lastBad: Last<[string, number, boolean]> = "x";
console.log(last); // true

void notMember;
void lastBad;
