---
mdx:
  format: mdx
references:
  - 10-ts-generics
  - 11-ts-type-programming
  - 12-ts-utility-types
  - 13-ts-type-theory
---
# 32 · 类型体操实战：14 道递进题

> 对应大纲：阶段 3 里程碑「完成 10–15 道类型体操（如 `DeepReadonly`、`TupleToUnion`、`Curry`），能手写常用工具类型」
> 前置：笔记 10（泛型）、11（类型编程）、12（工具类型手写——15 个内置的仿写不在本篇重复）
> 配套练习：`exercises/ts-type-challenges/01-tuple-basics.ts` ~ `04-hard-composition.ts`

## 学习目标

1. 建立「类型层求值」的心智模型：条件类型是 `if`、递归是循环、元组是列表、模板字面量是字符串、联合是集合
2. 掌握六个通用套路（模式匹配 / 递归拆解 / 累加器 / 集合分发 / 映射变换 / 元组计数），拿到新题能先归类再动手
3. 独立做出 14 道递进题（对应 type-challenges easy → hard），每道都能口述「考点 + 套路 + 递归出口」
4. 会用 `Equal` / `Expect` 在**类型层自证**答案，并说清为什么「双向 `extends`」版相等性判断会在 `any` / `never` 上假阳性
5. 知道体操的边界：什么时候该停（编译耗时、可读性、维护成本），以及它在真实工程里的落点（路由推导 / API 类型生成）

## 关键概念

### 1. 心智模型：把类型系统当一门纯函数语言

一手依据：TS Handbook《Conditional Types》的「延迟求值」与递归示例（`Awaited` 三段嵌套）；type-challenges 仓库 README 的题解社区约定。

| 你在值层面写的 | 类型层面的对应物 | 例 |
| --- | --- | --- |
| `if (x)` | 条件类型 `X extends Y ? A : B` | `IsNever` |
| 循环 / `reduce` | 递归 + 递归出口 | `Flatten`、`Join` |
| 数组（可增删） | 元组 + 变长展开 `[...A, ...B]` | `Concat`、`Push` |
| 字符串 `slice` / `replace` | 模板字面量 + `infer` 拆分 | `Trim`、`ReplaceAll` |
| 集合的交并差 | 分布式条件类型 + `never` 吸收 | `Exclude`、`UnionToTuple` 的入口 |
| 数字 | 元组长度 `T['length']` | `Length`、`MinusOne` |

一个判断先于所有技巧：**这题的数据是元组、字符串、联合还是对象？**——元组靠 `[infer F, ...infer R]` 头尾拆，字符串靠 `` `${infer F}${infer R}` `` 头尾拆，联合靠分布式条件类型逐成员处理，对象靠映射类型 + `as` 重映射。四种数据各有一条主套路，90% 的题是「主套路 + 递归」。

### 2. 套路库：六板斧

**A. 模式匹配（infer 挖结构）**——问「它长什么样」，不问「它是什么」：

```ts live noInline
type Head<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;
type Head1 = Head<['a', 'b']>; // 'a'——空元组匹配不上 [F, ...unknown[]]，走 never
```

**B. 递归拆解 + 出口**——把「对每个元素做」变成「对头做 + 对尾递归」，出口必须是**匹配失败时**的兜底：

```ts live noInline
type Flatten<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? F extends readonly unknown[]
    ? [...Flatten<F>, ...Flatten<R>] // 头是数组：先拍平头，再接上拍平的尾
    : [F, ...Flatten<R>]             // 头是普通元素：头 + 拍平的尾
  : [];                              // 出口：空元组
type F1 = Flatten<[1, [2], [[3]]]>;  // [1, 2, 3]
```

写不出出口 = TS2589（`Type instantiation is excessively deep`，见笔记 11 第 6 节）。

**C. 累加器模式**——递归不返回中间结果，而是把「已处理的部分」当默认类型参数**一路携带**，最后一次性吐出。凡是「逐段拼接」的题（字符串替换、Join）几乎都要它，否则已替换的段落会再次参与匹配：

```ts live noInline
type Join<T extends readonly string[], Sep extends string, Acc extends string = ''> =
  T extends readonly [infer F extends string, ...infer R extends string[]]
    ? Acc extends '' ? Join<R, Sep, F> : Join<R, Sep, `${Acc}${Sep}${F}`>
    : Acc;
type J1 = Join<['a', 'b', 'c'], '-'>; // 'a-b-c'
```

（`infer F extends string` 是 TS 4.7 的「带约束的 infer」，省掉再写一层条件判断。）

**D. 集合分发**——联合 + 裸类型参数 = 自动 `map`；`never` 在联合中被吸收 = 自动过滤（笔记 11 §2.2/2.3 的规则直接当工具用）。

**E. 映射变换**——对象题的全部：`{ [K in keyof T]: ... }` 同态映射保留修饰符，`as` 重映射改键/删键。

**F. 元组计数**——TS 类型层没有算术，唯一「数字」是元组长度。加法靠 `[...A, ...B]`，减法靠「去掉末位再量长度」，构造定长元组靠递归堆 `[0, ...T]`（见第 12 题 `MinusOne`）。

### 3. 相等性判断：为什么必须是那个「怪异」的 Equal

type-challenges 生态的标准写法（源出其 `src/utils.ts`）：

```ts live noInline
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
```

原理：让 `A`、`B` 分别进入**两个泛型函数的签名**，再比较两个函数类型是否**同一**——TS 对泛型签名的同一性判断走的是内部「类型同一性」算法，比赋值性检查严格得多，于是能区分出赋值性分不出的东西。

直觉上等价的「双向 extends」版会在两个地方假阳性：

```ts live noInline
type EqualSimple<A, B> = A extends B ? (B extends A ? true : false) : false;

type X1 = EqualSimple<any, 1>;  // true！—— any 与任何类型互相 extends
type Y1 = Equal<any, 1>;        // false
type X2 = EqualSimple<never, 1>; // never！—— 裸 never 分发：空联合一次都不执行
type Y2 = Equal<never, 1>;       // false
// 更阴的：Expect<EqualSimple<never, 1>> 不报错——never 可赋给任何类型，
// 连「结果不是 true」这件事都被 never 自己吞掉
```

这直接决定第 3 题 `Includes` 的正确性（下文）。

### 4. 十四道题总览

| # | 题（type-challenges 对应） | 难度 | 主套路 | 考点 |
| --- | --- | --- | --- | --- |
| 1 | `First<T>`（14） | easy | A | 元组头匹配的两种写法；空元组 |
| 2 | `Length<T>`（18） | easy | F | `T['length']` 是字面量数字类型 |
| 3 | `Includes<T, U>`（8） | medium | A+B | `Equal` 的必要性（可赋值性 ≠ 相等） |
| 4 | `Flatten`（459） | medium | A+B | 双递归：头拍平 + 尾递归 |
| 5 | `DeepPartial`（20 DeepReadonly 同族） | medium | B+E | 函数/数组分支排除；修饰符 `?` |
| 6 | `Mutable<T>` | medium | E | `-readonly` 修饰符算术 |
| 7 | `StringToUnion`（531 StringToUnion） | medium | B | 单字符拆分的贪心规则 |
| 8 | `Trim`（108） | medium | B | 联合模式在模板里的展开 |
| 9 | `ReplaceAll`（119） | medium | B+C | 空串守卫；为什么朴素版会错 |
| 10 | `Join`（5317 Last/Join 族） | medium | C | 累加器；`infer extends` |
| 11 | `AppendArgument`（191） | medium | A+F | `Parameters` 重组 + 元组展开 |
| 12 | `MinusOne`（2257） | medium+ | F | 元组计数器 + 尾递归优化上限 |
| 13 | `Get<T, Path>` | medium | A+B+C | 模板拆 `a.b.c` 路径；工程价值最高 |
| 14 | `Curry`（17） | hard | A+B | 递归挖参数；大纲点名的压轴题 |

以下题解默认你先自己写过一版。每题给「思路 → 答案 → 这个题在教什么」。

### 5. 题解：元组四题（1–4）

```ts live noInline
// ① First：两种解法对照
type First<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;
type First2<T extends readonly unknown[]> = T['length'] extends 0 ? never : T[0];
type Fst = First<[3, 2, 1]>; // 3
type Fst0 = First<[]>;       // never（匹配失败兜底）

// ② Length：元组的 ['length'] 是数字字面量类型（数组则只有 number）
type Length<T extends readonly unknown[]> = T['length'];
type Len = Length<['a', 'b']>; // 2
type LenArr = Length<string[]>; // number——数组的长度类型不精确

// ③ Includes：Equal 不可替换成 extends
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Includes<T extends readonly unknown[], U> =
  T extends readonly [infer F, ...infer R]
    ? Equal<F, U> extends true ? true : Includes<R, U>
    : false;
type Inc1 = Includes<[boolean, 'x'], false>; // false——若用 F extends U，boolean extends false 是 false 碰巧也对……
type Inc2 = Includes<[true], boolean>;       // false——但 F extends U 在这里返回 true（true extends boolean），错！
// 运行时语义对照：[true].includes(某个 boolean 值) 只对值 true 为真，
// 「数组里有一项是 boolean 这个类型」不是 includes 的语义——所以必须判相等，不判兼容

// ④ Flatten：见 §2 套路 B 的完整展开
```

第 ③ 题是本篇最重要的教学点：**可赋值性与相等性是两个问题**（呼应笔记 13 的结构类型），体操里大量 bug 来自拿前者回答后者。

### 6. 题解：对象两题（5–6）

```ts live noInline
// ⑤ DeepPartial：函数必须先排除，否则 keyof 函数 ≈ never，映射成 {} 把函数毁掉
type DeepPartial<T> =
  T extends (...args: never[]) => unknown ? T :        // 函数：原样返回
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T; // 对象：递归 + ?
type DP = DeepPartial<{ a: { b: number }; f: (x: number) => string }>;
// { a?: { b?: number } | undefined; f?: ((x: number) => string) | undefined }
// —— f 保持函数类型；数组走「同态映射按元素映射」，T[] 变成 (DeepPartial<T> | undefined)[]

// ⑥ Mutable：Readonly 的镜像，lib 里没有官方版（笔记 12 §9 讲过为什么）
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Mu = Mutable<{ readonly a: 1; readonly b: 'x' }>; // { a: 1; b: 'x' }
```

注意 `?` 修饰符会随「同态映射」自动继承吗——不会：`DeepPartial` 显式写了 `?`，所以全变可选；而 `Mutable` 没写，原可选的仍可选（`-readonly` 只动 readonly 这一个维度，修饰符算术按维度独立）。

### 7. 题解：字符串四题（7–10）

```ts live noInline
// ⑦ StringToUnion：单字符拆。infer 的贪心规则：前面的 infer 尽量短，最后一个拿剩余
type StringToUnion<S extends string> =
  S extends `${infer F}${infer R}` ? F | StringToUnion<R> : never;
type SU = StringToUnion<'abc'>; // 'a' | 'b' | 'c'；'' 出口给 never

// ⑧ Trim：联合模式（空白字符三种）写在模板占位位 = 逐个尝试
type Space = ' ' | '\n' | '\t';
type TrimLeft<S extends string> = S extends `${Space}${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R}${Space}` ? TrimRight<R> : S;
type Trim<S extends string> = TrimRight<TrimLeft<S>>;
type T1 = Trim<'  a\n'>; // 'a'——两头各递归一次

// ⑨ ReplaceAll：两个守卫
type ReplaceAll<S extends string, From extends string, To extends string> =
  From extends '' ? S : // 守卫 1：空 From 会让 `${infer L}${''}${infer R}` 匹配整个串、无限变长
  S extends `${infer L}${From}${infer R}` ? `${L}${To}${ReplaceAll<R, From, To>}` : S;
// 守卫 2（隐含在结构里）：只有「剩余的 R」继续递归，已产出的 `${L}${To}` 不再参与匹配——
// 所以 ReplaceAll<'aaa', 'a', 'aa'> = 'aaaaaa'，与 'aaa'.replaceAll('a','aa') 一致
type RA = ReplaceAll<'t-t-t', 't', 'x'>; // 'x-x-x'

// ⑩ Join：见 §2 套路 C 完整版
```

第 ⑨ 题的「已产出段不回炉」就是累加器思想的变体：把输出一侧与待处理一侧严格分离。

### 8. 题解：组合四题（11–14）

```ts live noInline
// ⑪ AppendArgument：从函数形状里挖出参数元组，尾部拼新参数再装回去
type AppendArgument<F extends (...args: never[]) => unknown, E> =
  F extends (...args: infer A) => infer R ? (...args: [...A, E]) => R : never;
type AA = AppendArgument<(a: string) => number, boolean>; // (a: string, b: boolean) => number

// ⑫ MinusOne：类型层没有减法——用「定长元组」当数字
type Build<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : Build<L, [...T, 0]>;
type MinusOne<N extends number> =
  Build<N> extends readonly [...infer R, 0] ? R['length'] : never;
type M1 = MinusOne<3>; // 3 → [0,0,0] → 去尾 [0,0] → 2
type M0 = MinusOne<0>; // never——Build<0> 是 []，没有尾可去；type-challenges 原题要求 -1，属题面特判
// 尾递归：Build 的递归调用处于「返回位置」，TS 4.5 起对此做了优化，上限约 1000 层
//（原题 N ≤ 1000 正是卡这个）；非尾递归仍是约 50 层（笔记 11 §6）

// ⑬ Get：模板拆 'a.b.c' + 递归下钻——lodash.get / dot-prop 的类型版
type Get<O, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof O ? Get<O[K], Rest> : never
    : P extends keyof O ? O[P] : never;
type G1 = Get<{ a: { b: { c: 42 } } }, 'a.b.c'>; // 42
type G2 = Get<{ a: 1 }, 'a.z'>;                  // never——路径不存在，编译期报出来（never 赋给谁都要显式处理）

// ⑭ Curry：递归「吃掉」参数元组，每次吐出一个单参函数
type Curry<F> = F extends (...args: infer A) => infer R
  ? A extends []
    ? () => R
    : A extends [infer H, ...infer T]
      ? (x: H) => Curry<(...args: T) => R>
      : never
  : never;
declare function curry<F extends (...args: never[]) => unknown>(fn: F): Curry<F>;
const add3 = curry((a: number, b: number, c: number): number => a + b + c);
// add3 的类型：(x: number) => (x: number) => (x: number) => () => number
```

`Curry` 的洞见：**函数类型本身可以当递归的「暂存区」**——吃掉一个参数后，把剩下的参数打包成新函数类型传给自己。这题做通，「泛型 + 递归 + infer」三位一体就算出师了。

### 9. 体操的边界：什么时候停手

一手依据：TS Wiki《Performance in TypeScript》（`typescript-annotation-performance` 与 instantiation depth 建议）。

- **可读性**：超过一屏、或需要写注释解释「这行为什么能跑」的类型，改写成多步命名类型；队友读不懂的类型没有工程价值
- **编译耗时**： instantiate 数爆炸的递归（长字符串 `ReplaceAll`、大联合 `Permutation`）会显著拖慢 IDE 响应；疑似时用 `tsc --generatetrace traces/` 看类型 instantiation 数
- **可替代性**：能靠「更精确的类型标注 + 一点运行时代码」解决的（如 `Get` 深路径在路径动态生成时），不要硬上类型体操——类型层的尽头是 50/1000 层，运行时没有这个限制
- **真实落点**：路由表 → 路径字面量联合（Next.js/Vue Router 类型推导）、API schema → 客户端类型（tRPC/OpenAPI 生成）、配置对象键推导（Vite `defineConfig`、Tailwind 任意值解析）——体操不是炫技，是这些库「类型即文档」的底层功

## 可运行示例

配套练习（先自己写「预期输出」注释，再运行对照；类型题以 `tsc` 自证为准，`tsx` 跑运行时部分）：

```bash
npx tsx exercises/ts-type-challenges/01-tuple-basics.ts        # First/Length/Includes/Flatten + 运行时 includes 对照
npx tsx exercises/ts-type-challenges/02-object-deep.ts         # DeepPartial/Mutable + 递归出口实验
npx tsx exercises/ts-type-challenges/03-string-recursion.ts    # StringToUnion/Trim/ReplaceAll/Join
npx tsx exercises/ts-type-challenges/04-hard-composition.ts    # AppendArgument/MinusOne/Get/Curry（含可运行 curry）

# 类型检查（tsx 只转译不查类型，跑通 ≠ 类型对，两个都要做）：
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-challenges/01-tuple-basics.ts
# （02/03/04 同理）
```

## 易错点与面试高频

1. **`Includes` 用 `extends` 判等是最大陷阱**：`[true]` 里 includes 一个 `boolean` 应为 `false`，但 `true extends boolean` 是 `true`。判等必须用泛型签名版 `Equal`。
2. **递归出口忘写 / 写错方向**：`Flatten` 的出口是 `[]` 而不是 `never`（输出是元组）；`StringToUnion` 的出口是 `never`（输出是联合）。**出口的类型必须和递归分支产出的类型同族**，否则中途混进 `never` 全盘吞掉。
3. **空串 `From` 使 `ReplaceAll` 死循环**：`${infer L}${''}${infer R}` 中 `L` 贪心吃掉整个串，每轮变长。守卫 `From extends '' ? S` 必须在匹配**之前**。
4. **`Length<string[]>` 是 `number` 不是字面量**：只有元组（tuple type）的 `['length']` 精确；数组类型长度未知。所有「元组计数」套路的第一步都是想办法让数据停在元组形态。
5. **函数没排除的 `DeepPartial` 会把函数毁掉**：`keyof ((x: number) => void)` ≈ `never`，映射出 `{}`。同理 `DeepReadonly` 也要防函数分支（type-challenges 20 的隐藏测试就考这个）。
6. **`Equal` 的两个假阳性对手**：`any`（与一切互相 extends）和 `never`（裸分发直接得 `never`，且 `never` 连 `Expect` 的报错都能吞掉）。面试时能主动讲出这两点是大加分。
7. **面试高频口述题**：手写 `Curry` 类型（说清「参数元组逐位消费 + 剩余参数打包成新函数递归」）；手写 `DeepReadonly`（说清「函数排除 + 数组走同态映射自动处理」）；解释 `TS2589`（递归无出口 / 超深度上限，尾递归优化后约 1000 层）。

## 输出预测题

**题 1**：不运行，推演以下类型的精确结果：

```ts live noInline
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Includes<T extends readonly unknown[], U> =
  T extends readonly [infer F, ...infer R] ? (Equal<F, U> extends true ? true : Includes<R, U>) : false;

type Q1 = Includes<[{ id: 1 }], { id: 1 }>;
type Q2 = ReplaceAllImpl<'abab', 'ab', 'x'>;
type ReplaceAllImpl<S extends string, From extends string, To extends string> =
  From extends '' ? S :
  S extends `${infer L}${From}${infer R}` ? `${L}${To}${ReplaceAllImpl<R, From, To>}` : S;
```

**题 2**：`MinusOne<2>` 按以下定义逐步展开求值（写出每一步的元组形态），并回答：把 `Build<L, T>` 里的 `[...T, 0]` 换成 `[0, ...T]`，`MinusOne<3>` 还能得到 2 吗？

```ts live noInline
type Build<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : Build<L, [...T, 0]>;
type MinusOne<N extends number> =
  Build<N> extends readonly [...infer R, 0] ? R['length'] : never;
```

## 延伸阅读

- type-challenges 仓库：本篇 14 题的原题与社区题解（题号已标在 §4 表格）；其 `utils.ts` 是 `Equal`/`Expect` 的一手出处
- TS Handbook《Conditional Types》《Recursive Conditional Types》《Template Literal Types》：递归与字符串拆分的一手规则
- TS 4.5 Release Notes《Tail-Recursion Elimination on Conditional Types》：尾递归优化与 1000 层上限
- TS 4.7 Release Notes：`infer` 的约束语法（`infer F extends string`）
- TS Wiki《Performance in TypeScript》：instantiation depth、`--generatetrace`、大型类型的工程建议
- 真实工程参照：Vue Router / Next.js 的类型化路由、tRPC 的过程类型推导——体操套路的生产环境用法

---

## 预测题答案

**题 1**：

- `Q1 = true`。`Equal<{ id: 1 }, { id: 1 }>`：两个匿名对象类型结构完全一致，泛型签名同一性判断通过（`Equal` 判**相等**，结构相同的两个匿名类型是相等的；它区分的是 `true` vs `boolean`、`any`、`never` 这类「可赋值但不同一」的情况）。
- `Q2 = 'xx'`。推演：第一轮 `L='a'`?不——`From='ab'` 匹配：`S='abab'`，`L` 贪心但要让 `ab` 匹配上，`L=''`（最左最短），`R='ab'`，产出 `x` + 对 `'ab'` 递归；第二轮同上产出 `x` + 对 `''` 递归；第三轮 `''` 不匹配 `${L}${'ab'}${R}`，返回 `''`。合并 `'x' + 'x' + ''` = `'xx'`。

**题 2**：

- `MinusOne<2>`：`Build<2>` 从 `[]` 起，`0 extends 2` 否 → `Build<2, [0]>` → `1 extends 2` 否 → `Build<2, [0, 0]>` → `2 extends 2` 是 → `[0, 0]`。匹配 `[...R, 0]` 得 `R = [0]`，`['length']` = **`1`**。
- 换成 `[0, ...T]` 后**仍能得到 2**：`Build<3>` 只是换了个方向堆，产物仍是长度 3 的全 `0` 元组 `[0, 0, 0]`；消费端 `[...R, 0]` 去的是**末位**，`R = [0, 0]`，`['length']` 照样是 `2`。会踩坑的是把消费端也换成「去头」却在别处依赖顺序的写法——要点是**构造方向与消费方向要成对确认**：长度由谁决定（堆的次数）、切掉的是哪一端（rest 模式的位置），两件事各自独立验证。
