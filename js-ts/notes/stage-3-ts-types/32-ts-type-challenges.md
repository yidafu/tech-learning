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

---

## 机制深一层：延迟求值、分发三定律与递归预算

> 收据口径：本节及以下各节的「实跑」均为 js-ts/node_modules 的 tsc 5.9.3 加 `--strict`、临时单文件于 /tmp 实跑。

### 1. 延迟求值：条件类型是「挂起表达式」，不是立即 if

类型参数未定型时，条件类型整体挂起（deferred）：`T extends U ? A : B` 的 T 是裸参数、还没有实参，这条式子就保持未求值状态，直到实例化那一刻才判定。这正是 Equal 能工作的前提：`(<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)` 比较的是两个**未实例化的签名**是否同一——判定发生在签名层面，绕开了赋值性检查的宽容（笔记 12 §5 的 `ReturnType<typeof identity>` = unknown 是同一机制的另一面：未实例化时类型参数落回约束）。手推递归题要把「挂起」当默认状态：递归分支里的 `Includes<R, U>` 不会立刻展开，编辑器悬停看到的「未解析条件类型」不是卡住，是还没轮到它。Equal 的两个极端案例也能从延迟求值讲清：any 参与签名同一性时不享受「与谁都互相赋值」的万金油待遇（同一性算法不看可赋值性），所以 `Equal<any, 1>` 是 false；never 作为实参时整条分布式链空转，产物 never，`Expect` 检查也随之失明——两案都不是玄学，是「签名层判定」与「分发零次」的直接后果。

### 2. 分发三定律：裸参数分发、括号阻断、空联合零次

- **定律一**：只有「裸类型参数直接站在 extends 左侧」才触发联合分发；`T` 包进元组、或以映射值等其他位置出现，都不分发。
- **定律二**：`[T] extends [U]` 的括号是阻断分发的标准写法——「判整体」与「判每个成员」的分界线就是这对括号。
- **定律三**：空联合（never）分发**零次**，产物直接是 never——不是「never extends 判真走某分支」，是循环体一次都没执行。

实跑收据：

```ts
type IsNever<T> = T extends never ? true : false;
const probe: IsNever<never> = true;
// 报 TS2322: Type 'true' is not assignable to type 'never'
// —— IsNever<never> 是 never：分发零次，两个分支都没执行
```

修法一括号：`type IsNever2<T> = [T] extends [never] ? true : false;` 对 never 得 true。这道题是定律三加定律二的连招，也是 §3 里 never 假阳性讨论的根源。定律一的反面教材也常见：想写「T 是数组」的判断时写成 `T extends readonly unknown[]`，若 T 是联合，会逐成员判定再并——想整体判断就得先 `[T]` 括起来。「意外分发」与「意外不分发」是体操错答的两大来源，两者的修复动作分别是加括号与去括号，先分清要的是哪种再动手。

### 3. 模板 infer 的贪心规则：首个最短，最后一个拿剩余

`${infer L}${infer R}` 匹配 `'abc'`，实跑收据（产物放进元组再赋给 never，报错印出）得 `["a", "bc"]`——首个 infer 拿**最短可能**（一个字符），最后一个拿全部剩余。推广到带固定段的模式：`` S extends `${infer L}${From}${infer R}` `` 里 L 的取法是「在能让 From 匹配成功的所有切法里取最靠左最短」，可以为空串——`ReplaceAll<'abab', 'ab', 'x'>` 实跑得 `'xx'`（本册预测题 1 的收据），第一轮的 L 就是 `''`。理解贪心方向后，TrimLeft 的逐字符剥与 ReplaceAll 的最左匹配不再是玄学：同一条规则的两次应用。

### 4. 递归预算：尾位约一千，非尾位约五十

TS 4.5 起对条件类型做尾递归消除（一手依据：TS 4.5 Release Notes《Tail-Recursion Elimination on Conditional Types》）：递归调用处于「整个条件类型的直接产物」位置（尾位）时，深度预算大幅放大。两种写法的实测边界：

```ts
type Build<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : Build<L, [...T, 0]>;        // 尾位：递归调用直接返回
type BuildNT<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : [...BuildNT<L, [...T, 0]>]; // 非尾位：包在展开里，外层还要收尾
```

实跑收据（同一编译器、同一组文件）：`Build<999>` 编译通过、`Build<1000>` 报 TS2589；`BuildNT<40>` 通过、`BuildNT<60>` 报 TS2589——尾位与非尾位差一个数量级，与「约 1000 / 约 50」的既有口径吻合。还有一个细节收据：超限时产物**退化成 any**（`Build<1500>` 的探针报错里印出 `Type 'any' ...`），所以 TS2589 的下游报错常常莫名其妙——见到「过深」先修类型，别顺着 any 往下游查。MinusOne 原题把 N 限制在 1000 以内，正是贴着尾位预算出的题面。预算数字的口径再交代一句：TS Wiki《Performance in TypeScript》公开写明递归深度建议与尾递归消除机制，本册两个实测边界（999 对 1000、40 对 60）与之吻合；但别把具体数字当规范承诺——编译器版本之间可能微调，出题或写生产类型时按「尾位千级、非尾位几十」留足余量，一旦逼近边界，正确动作是改写法而不是赌版本。把非尾改尾的手法也可背：中间结果全部塞进**累加器参数**（默认类型参数携带），让递归调用成为唯一的返回表达式；「返回值还要再加工」的写法（包展开、包模板串、包条件）都会把递归挤出尾位。

### 5. 同态形态的免费收益：元组保形与修饰符继承

对象题（题 ⑤⑥ 一族）的答案「顺手保留修饰符、数组性完好」不是巧合，是同态映射形态的免费收益，实跑三条证据（`type Ro<T> = { readonly [K in keyof T]: T[K] }`）：

- 元组不退化：`Ro<[string, number?]>['length']` 实测为 `2 | 1`——长度还是字面量并集，元组形态完好；
- 可选元素保留：`const ok: Ro<[string, number?]> = ['a']` 编译通过——`?` 随映射继承；
- 数组按元素映射：`Ro<{ x: 1 }[]>` 可赋给 `readonly { readonly x: 1 }[]`——元素逐个只读化。

这三条解释了本册题 ⑤ DeepPartial 注释里「数组走同态映射按元素映射」的机制本体，也解释了题 ⑥ Mutable 为什么 `-readonly` 不动 `?`（维度独立，见笔记 12 机制深一层 §1）。写对象题时的推论：只要保持 `[K in keyof T]` 的同态形态，修饰符与数组性就白拿；一旦套了 `Exclude` 之类的键计算，这些收益全部清零——体操题的「差一步」多半差在这里。顺带一个修辞细节：DeepPartial 显式写 `?` 会**覆盖**继承（可选变全可选），「原本可选的保持、原本必填的变可选」这种精细诉求得两段式（先 `-?` 归一再 `+?`）或接受简化口径——修饰符代数的加减号在这里依然是唯一词汇。

### 6. 递归出口的三式与同族原则

出口写法常见三式，各配一行模板：

- **匹配失败兜底**（最常用）：`S extends 模式 ? 递归 : S`——失败时原样返回，天然与输入同族；
- **显式长度判定**：`T['length'] extends 0 ? 出口 : 递归`——适合消费端要区分空/非空的题；
- **显式 never 短路**：联合过滤题里 `never` 直接当出口——靠联合吸收「不产出」。

同族原则一句话：**出口类型必须与递归分支的产物同一个容器族**——元组族出 `[]`、字符串族出 `''`、联合族出 `never`、对象族出 `{}`。违反的代价是传染：元组题出口写成 never，`[1, ...never]` 整体吸收成 never；字符串题出口写成 never，拼接同理。手推配方第 ③ 步「先定出口」就是在防这个。三式的选择依据：优先「匹配失败兜底」（它连出口代码都不用单写）；其次长度判定；never 短路只服务联合族——元组族套 never 短路是本册高频错答，出口族一错全盘吸收。

## 手推配方：递归类型五步推演

**① 定数据形态**：元组、字符串、联合还是对象——四种形态对应 §1 表格的四条主套路。

五步的顺序有讲究：①② 定「用什么武器」，③ 定「安全网」，④⑤ 定「正确性」。新手最常见的顺序错误是一上来就写答案、出口事后补——事后补的出口多半随手写成 never（脑中第一个「空」），传染性错误由此而来。先把出口写下来再写递归体，是低成本高回报的习惯。
**② 定模式与贪心**：元组用 `[infer F, ...infer R]`、字符串用 `${infer L}${infer R}`，并明确「谁拿最短」。
**③ 定出口**：递归耗尽/匹配失败时返回什么；出口类型必须与递归分支产物**同族**（元组题出 `[]`，联合题出 never）。
**④ 展开头两轮**：每轮写「输入、匹配结果、产出、余项」四元组，两轮足以看清节奏。
**⑤ 收敛检查**：确认每轮输入严格变小（余项短一格、串短一段），否则等着 TS2589。

推完别急着交卷：把手推结果与答案一起写进自证模板——`type Check = Expect<Equal<答案, 手推结果>>;`。Equal 版自证对 any 与 never 失明（§3 的黑洞），所以关键答案再加一条赋值探针，两条都绿才算过关。

三个实例：

**实例一**：`Trim<'  a\n'>`（收据结果 `'a'`）。轮 1（TrimLeft）：输入两空格加 `a` 加换行，匹配 `${Space}${infer R}`，剥一空格。轮 2（TrimLeft）：再剥一空格。轮 3（TrimLeft）：`a` 打头不是空白，出口原样返回。轮 4（TrimRight）：匹配尾部空白，剥换行。轮 5（TrimRight）：不以空白结尾，出口返回 `'a'`。每轮输入短一格，⑤ 收敛检查通过。

**实例二**：`Flatten<[1, [2, [3]]]>`（出口 `[]`）。头 `1` 非数组，产出 `[1, ...拍平的尾]`；新头 `[2, [3]]` 是数组，产出 `[...拍平它, ...拍平[]]`；逐层下钻，`3` 非数组，`[]` 到出口。合并得 `[1, 2, 3]`。反例思考：出口若写成 never，`[1, ...never]` 把整体打成 never——「出口与产物不同族」的传染效果，机制上就是联合吸收（§易错 2 的原理版）。

**实例三**：`MinusOne<3>`（收据 `2`）。Build 从 `[]` 起堆三轮到 `[0, 0, 0]`；消费端 `[...infer R, 0]` 匹配得 `R = [0, 0]`，取 length 得 2。`MinusOne<0>` 的 Build 产物是 `[]`，没有尾可去，匹配失败走 never（收据：赋值探针印出 never）——出口与「去尾」模式天然不兼容，这是题面要求特判 -1 的机制原因。

**实例四**：`Join<['a', 'b', 'c'], '-'>`（收据 `'a-b-c'`，累加器套路）。逐轮追 Acc：轮 1，Acc 为空串，直接 `Acc = 'a'`；轮 2，Acc 非空，`Acc = 'a-b'`；轮 3，`Acc = 'a-b-c'`；轮 4，元组耗尽，出口返回 Acc。累加器的价值在这里一目了然：已拼好的 `'a-b'` 停在参数里不再参与匹配，余项永远只有「还没处理的尾巴」——若无累加器，拼好的段会混进下一轮的匹配面，ReplaceAll 的空串死循环就是这种混入的极端案例。

**实例五**：`Get<{ a: { b: { c: 42 } } }, 'a.b.c'>`（收据 `42`，工程价值最高的一道）。轮 1，模板匹配把 `'a.b.c'` 拆成 `K = 'a'`、`Rest = 'b.c'`；核对 `K extends keyof O` 通过，下钻 `O['a']`。轮 2，拆 `'b.c'`，核对通过，下钻到 `{ c: 42 }`。轮 3，`'c'` 不含点，走「直接取键」分支得 42。错误路径 `Get<{ a: 1 }, 'a.z'>`：第二轮核对 `z extends keyof 1` 失败，走 never——**路径不存在这件事被翻译成编译期的 never**，调用方拿 never 去赋值必然报错，等于把「拼错路径」提前到编译期拦截。

## 工程三陷阱

**陷阱一：体操类型直接进生产，IDE 被拖垮。** 触发场景：路由表几百条路径跑 UnionToTuple、长配置串跑 ReplaceAll，输入一变 IDE 卡数秒。根因：instantiation 总数随输入长度与联合大小爆炸；尾位预算只救「每轮一次递归」的形态，救不了「每轮多个展开」的指数形态。经验数字：几十条路径、几 KB 的模板串是安全区；几百条路径的联合展开就要先量 instantiation 数再合入。规避：给体操输入设规模上限并在类型旁注释；疑似时用 `tsc --generatetrace` 看 instantiation 计数（§9 既有建议）；超规模改成运行时 codegen（生成 `.d.ts` 供类型引用，编译期零递归）。另一条降耗手法是把递归挪进尾位（机制深一层 §4）：同一道题，尾位写法把可用预算放大一个数量级，很多时候「卡 IDE」只是写法没调到尾位。

**陷阱二：boolean 在分发场景被拆开。** 触发场景：`Exclude<boolean, true>` 期望原样 boolean，实跑得 false——boolean 按 true 与 false 分发，true 被删、false 合并幸存。收据：

```ts
const p: Exclude<boolean, true> = true;
// 报 TS2322: Type 'false' is not assignable to type 'Exclude<boolean, true>'
// —— 错误把产物印出来：false
```

规避：判整体用 `[T] extends [U]` 括号；需要保留 boolean 语义的过滤，改用 Equal 驱动的分发（Includes 的写法）。同族注意点：IsNever 必须括号版（机制深一层 §2 的连招）。同类副作用还有 `Extract<boolean, true>` 得 true、`Exclude<boolean, false>` 得 true——凡是对 boolean 做过滤的题，先在心里把它拆成 true 与 false 再推。

**陷阱三：拿可赋值性回答相等性问题。** 触发场景：`Includes<[true], boolean>` 用 `F extends U` 判，得 true——true 确实可赋给 boolean，但「数组里有一项类型为 boolean」与「元素类型恰是 boolean」是两个问题。收据对照：

```ts
type BadIncludes<T extends readonly unknown[], U> =
  T extends readonly [infer F, ...infer R] ? (F extends U ? true : BadIncludes<R, U>) : false;
const b: BadIncludes<[true], boolean> = false;
// 报 TS2322: Type 'false' is not assignable to type 'true'
// —— 可赋值版假阳性实锤；Equal 版对同一输入给 false（§3 既有实证）
```

规避不变：判等只用泛型签名版 Equal。同时记住 `Expect<Equal<...>>` 的黑洞——产物是 never 时连报错都被吞掉（§3），测试常绿不等于答案正确；关键答案再用「赋值探针」（把结果赋给一个故意写反的类型）交叉验证一次。落到流程上：凡 Includes 一类的过滤与成员判断 PR，默认要求附 `Expect<Equal<...>>` 自证加一条赋值探针——判等错误的代价（静默漏判）远高于多写两行测试。探针的写法有讲究：目标故意写错（如 `const probe: never = 产物`），让错误信息把解析结果印出来；别名粘住不展开时，换条件探针 `[产物] extends [预期]`——本册所有收据都是这两式变体。

## 与手写实现对照：体操套路的运行时镜像

每一条类型体操套路在运行时 JS 里都有一个一一对应的镜像，对照着写一遍（两边同题），对「类型层在做什么」的理解会从背套路变成懂机制：

| 类型层 | 运行时镜像 | 对照要点 |
| --- | --- | --- |
| 递归 + 出口 | while 循环 + 边界判断 | 出口同族 ⇔ 循环不变量；运行时无深度预算，类型层有 |
| 元组头尾拆 `[infer F, ...infer R]` | `xs[0]` 加 `xs.slice(1)` | 每轮严格变小才收敛，两侧同理 |
| 累加器默认参数 | `reduce` 的初始值参数 | 「已处理」与「待处理」分离，两侧同构 |
| 元组计数 `T['length']` | `new Array(n).length` 或计数循环 | 类型层没有算术，长度是唯一的「数」 |
| 模板 infer 拆串 | `slice`/正则捕获组 | 贪心方向 ⇔ 正则的最左匹配语义 |
| 分布式条件类型 | `for...of` 遍历集合 | 裸参数分发 ⇔ 逐成员循环，never ⇔ 空集合不进循环体 |
| Equal 签名同一性 | `Object.is` / 全等 | 判等不判兼容，运行时早有同样的分界 |
| `Get` 模板拆路径 | lodash.get 的字符串路径解析 | 「路径拼错编译期报出」⇔ 运行时返回 undefined，前者更早更吵 |

这张表还有一层工程含义：运行时镜像没有深度预算（一个百万级的数组照样 reduce），而类型层预算是千级——所以「超规模改 codegen」的本质，就是把超过类型层承载力的循环搬回它的镜像世界。评审体操代码时，顺着镜像问一句「这段递归在运行时对应什么循环、循环变量是什么」，读不懂的类型多半能读懂一半。反过来也成立：给同事解释一道体操题最快的路径，是先写出它的运行时版本，再逐行映射回类型层——两个世界的同构性就是最好的讲义。

## 排查速查表

体操相关报错集中在「预算、出口、约束」三处；其中 TS2322 与 TS2589 出现频率最高，前者是「答案错了」，后者是「写法超载」——先分清是哪一类再动手。

| 报错（码 · 原文要点） | 根因 | 处置 |
| --- | --- | --- |
| TS2589 · Type instantiation is excessively deep and possibly infinite | 尾位递归超约 1000、非尾位超约 50，或无出口死循环 | 递归挪进尾位；补出口；降输入规模 |
| TS2322 · Type 'false' is not assignable to type 'true' | `Expect<Equal<...>>` 失败，答案与预期不符 | 五步手推逐轮核对，重点查出口同族与贪心方向 |
| TS2344 · Type 'number' does not satisfy the constraint 'string' | 类型实参违约（给 `S extends string` 传 number） | 检查实参；必要时先收窄再传入 |
| TS2456 · Type alias 'X' circularly references itself | 递归别名在非延迟位置自引用 | 把自引用挪进条件分支、映射值、元组元素等可延迟位置 |
| TS2313 · Type parameter 'T' has a circular constraint | 泛型约束互相引用成环 | 提取公共约束层，消环 |
| TS2558 · Expected N type arguments, but got M | 类型实参个数不符 | 数一遍递归类型的形参表，别把累加器参数忘在签名里 |
| TS2339 · Property 'x' does not exist on type 'never' | 联合被过滤空后继续取成员 | 检查分发方向，或先判 `[T] extends [never]` |
| 报错只印别名不印结果（如 `Omit<...>`） | 错误消息保留类型别名不展开 | 元组或条件探针（赋给故意写反的目标）逼出解析产物 |
| TS2322 · Type 'X' is not assignable to type 'never'（探针形态） | 这是「赋值探针」的标准输出：never 目标故意写反，源类型即答案 | 读错误消息里的源类型，就是待求类型的解析产物 |

## 输出预测题（进阶）

**题 1（递归预算）**：

```ts
type Build<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : Build<L, [...T, 0]>;
type BuildNT<L extends number, T extends readonly 0[] = []> =
  T['length'] extends L ? T : [...BuildNT<L, [...T, 0]>];
type A = Build<999>;
type B = BuildNT<60>;
```

A、B 各编译通过还是报错？把 BuildNT 里的 `[...BuildNT<...>]` 改成裸的 `BuildNT<...>`，B 行会怎样？

**题 2（贪心推演）**：

```ts
type LR<S extends string> = S extends `${infer L}${infer R}` ? [L, R] : never;
type Q2 = LR<'abc'>;
type Space = ' ' | '\n' | '\t';
type TrimLeft<S extends string> = S extends `${Space}${infer R}` ? TrimLeft<R> : S;
type Q3 = TrimLeft<'\t a'>;
```

Q2、Q3 各是什么？

**题 3（分发与拆分）**：

```ts
type IsNever<T> = T extends never ? true : false;
type Q4 = Exclude<boolean, true>;
type Q5 = IsNever<never>;
type IsNever2<T> = [T] extends [never] ? true : false;
type Q6 = IsNever2<never>;
```

Q4、Q5、Q6 各是什么？

**题 5（累加器追值）**：

```ts
type Join<T extends readonly string[], Sep extends string, Acc extends string = ''> =
  T extends readonly [infer F extends string, ...infer R extends string[]]
    ? Acc extends '' ? Join<R, Sep, F> : Join<R, Sep, `${Acc}${Sep}${F}`>
    : Acc;
type Q9 = Join<['x', 'y', 'z'], '.'>;
```

逐轮写出 Acc 的变化，给出 Q9；并回答：第一轮为什么要用 `Acc extends ''` 分支特殊处理？

**题 4（Equal 对照）**：

```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type EqualSimple<A, B> = A extends B ? (B extends A ? true : false) : false;
type Q7 = Equal<boolean, true>;
type Q8 = EqualSimple<any, 1>;
```

Q7、Q8 各是什么？两条判定路径的差别是哪一句话？

## 进阶题解析

**题 1**：A 通过（收据：tsc 5.9.3 实测，`Build<999>` 编译干净、`Build<1000>` 即 TS2589——999 是尾位预算内的边界档）；B 报 TS2589（收据：`BuildNT<60>` 炸、`BuildNT<40>` 过，非尾位预算在一个数量级以下）。把包裹去掉后 B 行等价于 `Build<60>`，通过——**同一逻辑深度，差一对中括号，预算差一个数量级**。改写口诀：递归调用要「裸」在条件类型真分支的返回位上，别包进任何还需加工的容器。顺带记一个诊断信号：见到 TS2589 先看递归调用的「位置」而不是「次数」——次数多可以调小输入，位置不对必须改写形态，两类修法完全不同。

**题 2**：Q2 = `["a", "bc"]`（实跑收据：首个 infer 最短、最后一个拿剩余）。Q3 = `'a'`——制表符是 Space 联合成员，匹配剥去余 `' a'`；空格再剥余 `'a'`；`a` 打头非空白，出口返回。两题是同一条贪心规则的两次应用：固定段（Space）要求「必须匹配上」，infer 位只拿让匹配成立的最小片段。若把 Q2 的串换成空串：`''` 匹配不上「至少一个字符」的模板模式，走出口得 never——字符串题的出口行为在空串上最容易暴露，手推时记得补这一轮。

**题 3**：Q4 = **false**（收据：把 true 赋给 `Exclude<boolean, true>` 报错，错误印出产物 false——boolean 按 true 与 false 分发，true 被删、false 合并幸存）。Q5 = **never**（收据：`Type 'true' is not assignable to type 'never'`——裸 never 分发零次，两个分支都没执行）。Q6 = **true**：`[never] extends [never]` 对「包了一层的整体」判定，不走分发，可赋值性成立走真分支。一裸一括，正是分发定律三与定律二的对照实验。把 Q6 的写法背熟还有个实用收益：`IsNever2` 是判「联合是否被过滤空」的标准探针，排查速查表里 TS2339 on never 一行的第一处置动作就是它。

**题 4**：Q7 = **false**（收据：`Equal<boolean, true>` 探针报错印出 false）——泛型签名同一性判定区分「true 与 false 的联合」和 true 本身。Q8 = **true**（收据：`EqualSimple<any, 1>` 探针报错印出 true）——any 与任何类型双向可赋值，假阳性。判定路径的差别一句话：Equal 问「两个未实例化的签名是否同一」，EqualSimple 问「互相能否赋值」——前者走类型同一性算法，后者走宽容的赋值检查。判等题交给后者，any 与 never 两个极端立即失守（§3 与笔记 13 的呼应点）。面试口述压缩版：「Equal 让两个签名实例化后必须算出同一结果，EqualSimple 让两边互相放行——一句话，同一性不看可赋值性。」

**题 5**：轮 1，Acc 为空串，走特殊分支，`Acc = 'x'`；轮 2，`Acc = 'x.y'`；轮 3，`Acc = 'x.y.z'`；轮 4，`[]` 匹配不上单元素头模式，出口返回 **`'x.y.z'`**（同型收据：`Join<['a','b','c'],'-'>` 实跑得 `'a-b-c'`）。第一轮特殊分支的存在理由：若不区分，空串 Acc 会拼出 `'.' + F` 这样多余的前导分隔符——`'x'` 加 `'.y'` 加 `'.z'` 的构造方式依赖「第一段不带分隔符」。累加器题的手推要点就是盯住 Acc 的初值语义与每轮的拼接方向。工程落点也交代一下：Join 一类的累加器套路在类型化「逐段拼接」API 时都会遇到——生成 SQL 片段、拼文件路径、类名串（`clsx` 风格）——凡输出是「按段拼出来的字符串」，类型层几乎总是累加器。
