/**
 * 大纲章节：阶段 3 里程碑——类型体操（字符串四题：StringToUnion / Trim / ReplaceAll / Join）
 * 主题：单字符贪心拆分、联合模式在模板占位位的展开、空串守卫、累加器拼接
 * 运行：npx tsx exercises/ts-type-challenges/03-string-recursion.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-challenges/03-string-recursion.ts
 * 预期输出：
 * 'aaa'.replaceAll('a','aa') = aaaaaa —— 与类型层 ReplaceAll<'aaa','a','aa'> = 'aaaaaa' 一致
 * join runtime = a-b-c                 —— 与类型层 Join<['a','b','c'],'-'> = 'a-b-c' 一致
 */

export {};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、StringToUnion：单字符拆（type-challenges 531）
// ============================================================

// infer 贪心规则：前面的 infer 尽量短（这里恰好拿到首字符），最后一个拿剩余
type StringToUnion<S extends string> = S extends `${infer F}${infer R}` ? F | StringToUnion<R> : never;

type _t1 = Expect<Equal<StringToUnion<'abc'>, 'a' | 'b' | 'c'>>;
type _t2 = Expect<Equal<StringToUnion<''>, never>>; // 出口：空串 → never（联合语境被吸收，无害）

// ============================================================
// 二、Trim：两头递归吃空白（type-challenges 108）
// ============================================================

type Space = ' ' | '\n' | '\t';
type TrimLeft<S extends string> = S extends `${Space}${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R}${Space}` ? TrimRight<R> : S;
type Trim<S extends string> = TrimRight<TrimLeft<S>>;

// 联合写在占位位 = 三个模式逐个尝试，任一匹配即进入分支
type _t3 = Expect<Equal<Trim<'  a\n'>, 'a'>>;
type _t4 = Expect<Equal<Trim<'\t\t'>, ''>>; // 全空白：两边各自吃到空串
type _t5 = Expect<Equal<Trim<'a b'>, 'a b'>>; // 中间的空白不吃——只处理两端

// ============================================================
// 三、ReplaceAll：两个守卫（type-challenges 119）
// ============================================================

type ReplaceAll<S extends string, From extends string, To extends string> =
  From extends ''
    ? S // 守卫：空 From 会让 L 贪心吃掉整串、每轮变长 → TS2589
    : S extends `${infer L}${From}${infer R}`
      ? `${L}${To}${ReplaceAll<R, From, To>}` // 只有「剩余的 R」继续递归，已产出段不回炉
      : S;

type _t6 = Expect<Equal<ReplaceAll<'t-t-t', 't', 'x'>, 'x-x-x'>>;
type _t7 = Expect<Equal<ReplaceAll<'abab', 'ab', 'x'>, 'xx'>>;
type _t8 = Expect<Equal<ReplaceAll<'aaa', 'a', 'aa'>, 'aaaaaa'>>; // To 含 From：产出段不参与匹配 → 不无限
type _t9 = Expect<Equal<ReplaceAll<'abc', '', 'x'>, 'abc'>>; // 空 From 守卫生效

// ============================================================
// 四、Join：累加器模式（把已拼接段当默认类型参数一路携带）
// ============================================================

type Join<T extends readonly string[], Sep extends string, Acc extends string = ''> =
  T extends readonly [infer F extends string, ...infer R extends string[]]
    ? Acc extends ''
      ? Join<R, Sep, F> // 第一个元素：不加分隔符（infer extends 是 TS 4.7 约束语法）
      : Join<R, Sep, `${Acc}${Sep}${F}`>
    : Acc; // 出口：Acc 本身就是结果（空元组 → ''）

type _t10 = Expect<Equal<Join<['a', 'b', 'c'], '-'>, 'a-b-c'>>;
type _t11 = Expect<Equal<Join<[], '-'>, ''>>;
type _t12 = Expect<Equal<Join<['x'], '.'>, 'x'>>;

// ============================================================
// 五、运行时对照
// ============================================================

console.log(`'aaa'.replaceAll('a','aa') = ${'aaa'.replaceAll('a', 'aa')} —— 与类型层 ReplaceAll<'aaa','a','aa'> = 'aaaaaa' 一致`);

function joinRuntime(xs: readonly string[], sep: string): string {
  return xs.reduce((acc, x) => (acc === '' ? x : `${acc}${sep}${x}`), ''); // 累加器同构
}
console.log(`join runtime = ${joinRuntime(['a', 'b', 'c'], '-')}                 —— 与类型层 Join<['a','b','c'],'-'> = 'a-b-c' 一致`);
