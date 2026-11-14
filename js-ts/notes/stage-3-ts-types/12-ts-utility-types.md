---
mdx:
  format: mdx
---
# 12 · 内置工具类型：源码级理解与手写

> 对应大纲：阶段 3.4「内置工具类型源码级理解」+ 阶段 3.3（实现全部依赖上一篇的映射/条件/infer）

## 学习目标

1. 对每个常用工具类型说出**官方源码**（lib.es5.d.ts）并解释它为什么只有一行
2. 区分**同态实现**（Partial/Required/Readonly/Pick，保留修饰符）与**非同态/条件式实现**（Record/Exclude/Parameters…），预测修饰符在任何组合下的去留
3. 说清 `Omit` 的两个坑与严格版写法；说清 `Parameters`/`ReturnType` 对 `any`/`never`/重载函数的边界行为
4. 读懂 `Awaited<T>` 的递归源码，解释 async 函数返回类型为什么是 `Promise<Awaited<T>>`

---

## 关键概念

> 一手依据：
> - **[lib.es5.d.ts:行号]** 本机 TypeScript 安装（tsc 7.0.2）`node_modules/typescript/lib/lib.es5.d.ts` 的实际行号（`npx tsc` 缓存目录下可直接打开）
> - **[HB-Mapped] / [HB-Cond]** TS Handbook《Mapped Types》《Conditional Types》
> - **[RN-x.y]** TypeScript x.y 发布说明
> - 篇 11 已证实的判定规则：`[K in keyof T]` 或 `[P in K]`（K 的约束是 `keyof T`）→ 同态，保留修饰符；其余非同态

### 0. 全家福与分类速览

lib.es5.d.ts 第 1585–1655 行集中了全部「对象形态」工具类型，按实现机制分三类：

| 类别 | 成员 | 机制 | 修饰符 |
| --- | --- | --- | --- |
| 同态映射 | `Partial` `Required` `Readonly` `Pick`（间接 `Omit`） | `[P in keyof T]`（±修饰符） | **保留** |
| 非同态映射 | `Record` | `[P in K]`，K 与 keyof T 无关 | 无从保留（全新属性） |
| 条件/infer | `Exclude` `Extract` `NonNullable` `Parameters` `ConstructorParameters` `ReturnType` `InstanceType` `Awaited` | 分布式条件类型 + `infer` | 不涉及 |

### 1. Partial / Required / Readonly：同态映射的三个标本

官方源码（[lib.es5.d.ts:1585–1604]）：

```ts live noInline
type Partial<T> = {
  [P in keyof T]?: T[P];
};
type Required<T> = {
  [P in keyof T]-?: T[P];
};
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

三个都是**同态映射**：`[P in keyof T]` 让 TS 从源类型逐属性复制元数据，你显式写的修饰符（`+?` / `-?` / `+readonly`）之外的部分原样保留。

**为什么 `Partial` 保留 `readonly`？** 同态映射的复制是「整份属性元数据」——`readonly` 在源属性上，`?` 是你叠加的，两者互不干扰：

```ts live noInline
interface Todo { readonly id: number; title: string; done?: boolean }
type P = Partial<Todo>;
// { readonly id?: number | undefined; title?: string | undefined; done?: boolean | undefined }
//   ↑ readonly 被 copied；? 被加上；值类型自动并上 undefined（strictNullChecks 下可选属性的天然形态）

type R = Required<Partial<Todo>>;
// { readonly id: number; title: string; done: boolean } —— readonly 从未被丢，?-被 -? 摘掉
```

边界 case：

- `Partial` 是**浅**的：属性值是对象时只让最外层可选，内层原样（`DeepReadonly`/`DeepPartial` 见 §8）。
- 同态映射对联合分发：`Partial<A | B>` = `Partial<A> | Partial<B>`，可辨识联合不会被压扁。
- `Required<T>` 不能把 `readonly` 摘掉（它只动 `?`）；要摘 `readonly` 见 §9 的 `Mutable`。

### 2. Pick / Omit：子集选择与它的两个坑

官方源码（[lib.es5.d.ts:1606] 与 [lib.es5.d.ts:1630]）：

```ts live noInline
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;   // TS 3.5 起内置 [RN-3.5]
```

`Pick` 的 `[P in K]` 看似非同态，但 K 的**约束是 `keyof T`**——上一篇已实证：这种形态仍按同态处理，**保留 `readonly` 与 `?`**。官方 `Omit` 完全借道 `Pick`，所以同样保留修饰符（可实证：`Omit<{ readonly a: 1; b?: 2 }, "c">` = `{ readonly a: 1; b?: 2 }`）。

**坑一：非同态的「朴素 Omit」丢修饰符。** 大量文章/旧代码手写的是：

```ts live noInline
type NaiveOmit<T, K extends keyof any> = { [P in Exclude<keyof T, K>]: T[P] };
type N = NaiveOmit<{ readonly a: 1; b?: 2 }, "c">;
// { a: 1; b: 2 | undefined }  ←—— readonly 没了；b 从「可选」变成「必有但可为 undefined」
```

约束是 `Exclude<keyof T, K>`（不是裸的 `keyof T` 也不是约束为 keyof T 的类型参数）→ 非同态 → 属性元数据全部重建。可选性的丢失尤其阴险：`b: 2 | undefined` 在 strictNullChecks 下意味着「初始化时必须显式给 b（可以为 undefined）」。「Omit 不保留修饰符」这个流传甚广的说法，正确的表述是：**朴素实现的 Omit 不保留；官方 Omit 因为是 `Pick + Exclude` 所以保留**。

**坑二：`K extends keyof any` 放行不存在的键。** 官方签名为了允许「从别处拿来的宽键集合」把 K 约束放宽成 `keyof any`，代价是拼错键名不报错：

```ts live noInline
type T0 = Omit<Todo, "titel">; // 不报错！"titel" 拼错了，静默等于没删
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>; // 键名受 keyof T 检查
type T1 = StrictOmit<Todo, "titel">; // 编译错误：'"titel"' does not satisfy 'keyof Todo'
```

另一个已实证的行为：`Omit<A | B, K>` 作用在**联合**上会先取 keyof 的交集、压成一个对象（同态映射的联合分发被 `Exclude<keyof T, K>` 绕开了）。要逐成员删除需写分布式版本：`type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;`。

### 3. Record：非同态映射与 `keyof any`

官方源码（[lib.es5.d.ts:1613]）：

```ts live noInline
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

`keyof any` 求值为 **`string | number | symbol`**——对象键的完整类型域（[RN-2.9] 起 keyof 覆盖三种键类型）。用它做约束等于「任何合法键类型都行」。边界 case（已实证）：

```ts live noInline
type A = Record<"a" | "b", number>; // { a: number; b: number }：精确的两个必有键，缺一个都报错
type B = Record<never, string>;     // {}：空键联合映射出空对象
type C = Record<string, number>;    // 行为近于 { [k: string]: number } 索引签名
type D = Record<"a", number> & Record<"b", string>; // 交叉组合不同值类型
// Record 不含任何源对象 ⇒ 没有修饰符可复制，产物一律必有、可写
```

### 4. Exclude / Extract / NonNullable：分布式条件类型的直接应用

官方源码（[lib.es5.d.ts:1620–1635]）：

```ts live noInline
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
```

两行都是上一篇「裸类型参数 + 联合 → 逐成员分发 + never 吸收」的直接复刻：

```ts live noInline
type E1 = Exclude<"a" | "b" | "c", "a" | "c">;           // "b"
type E2 = Extract<"a" | "b" | "c", "a" | "c">;           // "a" | "c"
type E3 = Exclude<string | number, string>;              // number
type E4 = Exclude<never, string>;                        // never（空联合分发）
type E5 = Extract<unknown, string>;                      // never（unknown 不能赋给 string）
```

`NonNullable` 注意**版本差异**（本机 tsc 7.0.2 的 lib 与 TS 5.x 及更早不同）：

```ts live noInline
// TS ≤ 5.x 的经典实现（大量资料引用的版本）：
type NonNullable<T> = T extends null | undefined ? never : T;
// 本机 TS 7.0.2 lib.es5.d.ts:1635 的现行实现：
type NonNullable<T> = T & {};
```

对常规联合（`string | null | undefined` → `string`）两者等价、都靠联合分发；差异出现在极端输入：`NonNullable<unknown>` 经典版得 `unknown`，现行版得 `{}；NonNullable<any>` 两者都得 `any`。手写时写经典条件版即可（行为可测等价）。

### 5. Parameters / ConstructorParameters：从函数形状里挖参数

官方源码（[lib.es5.d.ts:1640–1648]）：

```ts live noInline
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never;
```

要点全部在细节里：

- **`infer P` 位置**：rest 参数整体推断为一个元组——`Parameters<(a: number, b?: string) => void>` = `[a: number, b?: string]`（连标签和可选性都保留）。
- **约束 `(...args: any) => any`**：先保证 T 是函数；对普通对象报清晰错误。
- **`abstract new`**：匹配抽象构造器（因此能容纳 `abstract class`），普通 `class` 也兼容。
- **对 `any`**：条件类型两个分支都取，真分支里 `P` 推断为 `unknown[]`——实证 `Parameters<any>` = `unknown[]`。
- **对 `never`**：裸 never 分发 → 直接 `never`（`Parameters<never>` = `never`，不走任何分支）。
- **重载函数只匹配最后一个重载**：`T` 有多个调用签名时，`extends` 匹配的是**最后一个**签名。实证：

```ts live noInline
interface Ov { (x: string): number; (x: number, y?: boolean): string }
type P1 = Parameters<Ov>; // [x: number, y?: boolean] ← 后一个重载
type R1 = ReturnType<Ov>; // string                     ← 后一个重载
```

要拿到全部重载只能显式枚举或改用泛型委托。这是面试与实战（包装 fetch、封装 SDK）双高频的坑。

### 6. ReturnType / InstanceType

官方源码（[lib.es5.d.ts:1650–1657]）：

```ts live noInline
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;
```

- `infer R` 在返回值位置（协变）；`InstanceType` 则对构造器用 `infer R` 取 `new` 的产物（即实例类型）。
- 注意 `ReturnType` 的**假分支是 `any` 不是 `never`**——这是历史设计；由于约束已保证是函数，正常到不了假分支，但 T 为 `never` 时照样整体变 `never`。
- 泛型函数边界（实证）：`ReturnType<typeof identity>`（`identity` 是 `<T>(x: T) => T`）= **`unknown`**——无调用上下文时类型参数落到约束（默认 `unknown`）。想绑定具体参数：TS 4.7 的实例化表达式 `const numId = identity<number>;`，之后 `ReturnType<typeof numId>` = `number`。
- 泛型类：`InstanceType<typeof Box>` = `Box<unknown>`（同理）。

### 7. Awaited：递归解包 thenable

官方源码（[lib.es5.d.ts:1570]，TS 4.5 引入 [RN-4.5]，注释为「This emulates the behavior of `await`」）：

```ts live noInline
type Awaited<T> = T extends null | undefined ? T : // ① 非 strictNullChecks 下原样保留 null/undefined
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? // ② 只有「带可调用 then 的对象」才算 thenable
    F extends ((value: infer V, ...args: infer _) => any) ? // ③ 从 onfulfilled 挖出第一个参数
      Awaited<V> : // ④ 递归解包
    never : // then 存在但 onfulfilled 形参不可调用 → never
  T; // ⑤ 非对象/非 thenable：原样返回
```

三个层次的行为（全部实证过）：

- **递归**：`Awaited<Promise<Promise<number>>>` = `number`（不是 `Promise<number>`）——真 Promise 会嵌套，`await` 会拆到底。
- **分发**：`Awaited<Promise<number> | string | null>` = `number | string | null`——裸 T 对联合分发，每个成员独立判断。
- **thenable 判定苛刻**：`{ then: 1 }`（then 不是函数）直接走 ⑤ 原样返回；then 的首个形参不可调用则得 `never`；`Awaited<Promise<void>>` = `void`。

**为什么 async 函数返回类型用它推导**：`await p` 的语义是「拆掉任何 thenable 链」，与 `Awaited` 的递归定义一致。[RN-4.5] 明确：TS 4.5 起 async 函数推导返回类型为 `Promise<Awaited<T>>`，`await` 表达式类型为 `Awaited<T>`——这同时修正了「`await Promise.resolve(Promise.resolve(1))`」类嵌套的推导。`lib.es2015.promise.d.ts` 中 `Promise.all` 的签名 `Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>` 则是「同态映射 + `-readonly` + Awaited 递归」的官方合体范例。

### 8. Readonly 的深与浅（面试高频）

内置 `Readonly<T>` 只处理一层：`Readonly<{ a: { b: 1 } }>` = `{ readonly a: { b: 1 } }`，内层 `b` 仍可写。深度版用**同态映射 + 递归**：

```ts live noInline
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
// DeepReadonly<{ a: { b: 1 } }> = { readonly a: { readonly b: 1 } }
// 数组免费受益于「同态映射按元素映射」：DeepReadonly<{ x: 1 }[]> = readonly { readonly x: 1 }[]
// 原始类型是递归天然出口：DeepReadonly<string> = string
```

同理有 `DeepPartial`。生产环境若要「运行时也冻结」，类型层还要配合 `Object.freeze`（其重载之一的返回类型签名正是 `Readonly<T>`，见 lib.es5.d.ts 第 234 行 `freeze<T>(o: T): Readonly<T>`）。

### 9. ThisParameterType / OmitThisParameter 与「为什么没有 Mutable」

官方源码（[lib.es5.d.ts:324–329]）一句话版：

```ts live noInline
type ThisParameterType<T> = T extends (this: infer U, ...args: never) => any ? U : unknown; // 提取 this 参数；没有则 unknown
type OmitThisParameter<T> = unknown extends ThisParameterType<T> ? T : T extends (...args: infer A) => infer R ? (...args: A) => R : T; // 摘掉 this
```

（`unknown extends X` 只有 `X = unknown` 才成立，用「this 是否为 unknown」判断函数有没有显式 this 参数。）

**官方为什么没有 Mutable？** `Mutable<T> = { -readonly [K in keyof T]: T[K] }` 社区已约定俗成，但始终未进 lib：① 一行 `-readonly` 已可表达，库函数无增益；② 「恢复可写」常意味着破坏别处的只读契约（冻结数据、跨模块共享常量），TS 团队在相关 issue 讨论（如 microsoft/TypeScript#24511 一线的长期讨论）中倾向于不鼓励这种操作。面试答到「修饰符算术 + 官方克制」即可。

### 10. ReturnType 家族与泛型函数绑定（面试题集）

1. `ReturnType<typeof fetch>` 是 `Promise<Response>`；而 `Awaited<ReturnType<typeof fetch>>` 才是 `Response`。为什么？——`ReturnType` 不递归，`Awaited` 递归拆 thenable。
2. `Parameters<typeof Array.isArray>` = `[arg: any]`；对重载函数给「最后一个签名」的参数（§5）。
3. `type Fn = <T>(x: T) => T; type R = ReturnType<Fn>` = `unknown`（泛型参数无上下文落到约束）；配合 TS 4.7 实例化表达式可绑定。
4. 用 `Parameters` + rest 参数转发实现类型安全的 `safeCall`（练习 `05-variadic-tuples.ts`）——元组与 rest 参数联动是变长元组类型的最大工程价值。
5. 手写 `MyPick` 是 type-challenges easy 第 4 题（`MyReadonly` 是第 7 题）；面试要求白板写出并解释 `K extends keyof T` 为什么保修饰符。

---

## 可运行示例

```bash
npx tsx exercises/ts-utility-types/handwritten-utility-types.ts   # 15 个手写工具类型 + demo
npx vitest run exercises/ts-utility-types/                        # expectTypeOf 断言手写版 ≡ 官方版
```

30 秒自证「同态保留修饰符、朴素 Omit 丢修饰符」：

```ts live noInline
type NaiveOmit<T, K extends keyof any> = { [P in Exclude<keyof T, K>]: T[P] };
interface S { readonly a: 1; b?: 2 }
const good: Omit<S, "c"> = { a: 1 };               // OK：官方 Omit 保留 b?，可省略 b
// @ts-expect-error - 朴素版丢了 ?，b 变成必有
const bad: NaiveOmit<S, "c"> = { a: 1 };
```

---

## 易错点与面试高频

1. **`Partial<T>` 不改 `readonly`；`Required<T>` 不摘 `readonly`；两者都只动 `?`。** 摘 readonly 要 `Mutable`。
2. **官方 `Omit` 保修饰符（借道同态 `Pick`），朴素手写版丢**——被问到「Omit 丢不丢 readonly」时先分清是哪个实现。
3. **`Omit` 的 K 放行不存在键**：`keyof any` 约束的代价；严格工程里用 `StrictOmit`。
4. **`Parameters`/`ReturnType` 对重载只看最后一个签名**——包装函数时重载信息会静默丢失。
5. **`Parameters<any>` = `unknown[]`、`Parameters<never>` = `never`、`ReturnType<any>` = `any`**——any 走「双分支联合」，never 走「空联合分发」。
6. **`NonNullable` 的 lib 实现在 TS 7 变成了 `T & {}`**——行为与经典条件版在常规联合上等价，在 `unknown` 上分叉（`{}` vs `unknown`）。
7. **`Awaited` 会递归**：`Awaited<Promise<Promise<T>>>` = `T`；`ReturnType<typeof asyncFn>` = `Promise<T>`，别与 `Awaited<...>` 混用。
8. **`Record<string, T>` 造的是「任意字符串键」而非精确键表**；要精确键表用字面量联合 K。
9. **深浅**：`Readonly`/`Partial` 都是一层；`DeepReadonly` 靠同态映射 + 递归，数组与原始类型自动被处理。

---

## 输出预测题

**题 1**：对 `interface User { readonly id: number; name: string; email?: string }`，逐一写出下列类型的**精确结果**（属性、修饰符、`| undefined` 一个都不能少）：

```ts live noInline
type A = Partial<User>;
type B = Required<Partial<User>>;
type C = Omit<User, "email">;
type D = { [P in Exclude<keyof User, "email">]: User[P] };
type E = Record<keyof User, string>;
```

**题 2**：

```ts live noInline
interface Load { (url: string): Promise<Response>; (url: string, init: RequestInit): Promise<Response> }
type F1 = Parameters<Load>;
async function getUser(id: number) { const r = await fetch(`/users/${id}`); return r.json(); }
type F2 = ReturnType<typeof getUser>;
type F3 = Awaited<ReturnType<typeof getUser>>;
```

`F1`、`F2`、`F3` 分别是什么？

---

## 延伸阅读

- lib.es5.d.ts：第 1570–1657 行（本篇全部官方源码出处，建议直接打开通读注释）；`Object.freeze` 的签名（`Readonly<T>` 的运行时搭档）
- lib.es2015.promise.d.ts 第 39 行：`Promise.all` 的类型——同态映射 + `-readonly` + `Awaited` 官方合体
- TS Handbook：《Mapped Types》（Homomorphic 一节）、《Conditional Types》（Distributive 一节）
- Release Notes：TS 2.8（条件类型 + 全家首版）、TS 2.9（keyof any 三种键）、TS 3.5（内置 Omit）、TS 4.5（Awaited 与 async 推导）、TS 4.7（实例化表达式）
- type-challenges：easy #4 Pick / #7 Readonly / #11 TupleToUnion / #18 LengthOfTuple；medium #8 Readonly 2（DeepReadonly）
- microsoft/TypeScript#24511 等关于 Mutable 收录与否的讨论

---

## 预测题答案

**题 1**：

```ts live noInline
// A：同态，叠加 ?，保留 readonly
type A = { readonly id?: number | undefined; name?: string | undefined; email?: string | undefined };
// B：Partial 后再 Required：-? 摘掉可选，readonly 始终未被触碰
type B = { readonly id: number; name: string; email: string };
// C：官方 Omit 借道同态 Pick：修饰符保留
type C = { readonly id: number; name: string };
// D：朴素 Omit（非同态）：readonly 丢失；email 被删所以看不出 ? 的丢失，但 id 的 readonly 没了
type D = { id: number; name: string };
// E：Record 全新属性，无修饰符可复制；email 也变成必有；id 的 number 被 string 覆盖
type E = { id: string; name: string; email: string };
```

（注意 D 与 C 的唯一差别就是 `readonly`；若把被删的键换成 `id`，D 还会暴露「`email?: string` 变 `email: string | undefined`」。）

**题 2**：

- `F1`：重载只匹配**最后一个**签名 → `[url: string, init: RequestInit]`。
- `F2`：`async` 函数的推导返回类型是 `Promise<Awaited<T>>`；`r.json()` 是 `Promise<any>`，`Awaited<Promise<any>>` = `any`，故 `F2` = **`Promise<any>`**。
- `F3`：`Awaited` 再拆一层 → **`any`**。


---

## 机制深一层：修饰符代数、同态克隆与交集过滤

> 收据口径：本节及以下各节的「实跑」均为 js-ts/node_modules 的 tsc 5.9.3 加 `--strict`、临时单文件于 /tmp 实跑；lib 行号同时核对过 tsc 5.9.3 与全局 tsc 7.0.2 的 `lib.es5.d.ts`，两版一致。

### 1. 修饰符是两个独立维度，代数只有「加减 + 继承」三条规则

映射语法里可写的变化共四组：`+?`、`-?`、`+readonly`、`-readonly`，省略加减号时默认 `+`。每个属性元数据里，可选性与可变性是**互不相干的两个维度**，映射时按维度各自结算，规则三条：

- 同态映射没写某维度的变化 → 该维度原样继承；
- 写了加减变化 → 只结算被点名的那个维度；
- 非同态映射 → 两个维度全部清零，只有显式写出来的修饰符生效（`?` 写了才可选，`readonly` 写了才只读）。

最有信息量的实验是**一次结算两个维度**的同态映射（`-?` 与 `-readonly` 可以同写在一条映射里，这是很多人不知道的合法语法）：

```ts
type Concrete<T> = { -readonly [K in keyof T]-?: T[K] };

const c1: Concrete<{ readonly a?: 1; b: 2 }> = { a: 1, b: 2 };
c1.a = 3; // 报 TS2322: Type '3' is not assignable to type '1'
          // 注意报错码不再是 TS2540「read-only」——-readonly 已摘掉可变性，
          // 剩下的只是字面量类型 1 不收 3 这个值
const c2: Concrete<{ readonly a?: 1 }> = {};
// 报 TS2741: Property 'a' is missing in type '{}' but required in type
//   'Concrete<{ readonly a?: 1 | undefined; }>' —— -? 把可选摘成了必有
```

错误码从 TS2540 变成 TS2322，正是「两个维度被独立结算」的直接证据。由此可推出组合表：`Required<Partial<T>>` 只动 `?`、readonly 全程保留（配套收据：给 `Required<Partial<{ readonly a?: 1 }>>` 的属性赋值报 TS2540）；`Mutable<T>` 只动 readonly、`?` 原样继承（同为同态形态，与 Concrete 同理）。还有一条容易被问倒的：**什么都不写的同态映射 ≡ 源类型**——`{ [K in keyof T]: T[K] }` 不加任何修饰符变化，可选性与 readonly 全维度继承，结构上与 T 相同。「同态」的本义就在这里：产物与源同构。也因此，`Required<T>` 永远摘不掉 readonly——它的映射语法只写了 `-?`，readonly 维度按「继承」结算；想同时动两个维度，就要写成 Concrete 那样显式点名的形式。还有一条零成本约定值得带走：组合工具类型按「先浅后深」命名（`ShallowX` 对 `DeepX`），读者从名字就知道作用层数——工程里「Partial 为什么不管内层」的一半疑问，其实是命名先撒了谎。

### 2. NonNullable 的 `T & {}`：交集分发 + never 吸收

现行 lib（lib.es5.d.ts:1635）用一行交集替代条件分发：`type NonNullable<T> = T & {};`。机理是两条独立规则的合力：

1. **交集对联合分发**：`(A | B) & C` 归约为 `(A & C) | (B & C)`，交集被打散到每个联合成员上结算；
2. **null / undefined 与 `{}` 交集得 never**：null 与 undefined 没有任何成员，不满足 `{}` 这个「所有非空值都具备的空约束」，交集直接归约成 never；never 再被联合吸收。

于是 `(string | null | undefined) & {}` = `(string & {}) | never | never` = `string`。实跑收据：把 `string | null | undefined` 与 `{}` 求交后赋给 never，报 `Type 'string' is not assignable to type 'never'`——产物确实只剩 string。为什么用 `{}` 不用 `unknown`？因为 `T & unknown` 恒等于 `T`（unknown 是交集的单位元），对 null 毫无过滤作用；`{}` 是「能拦住 null 与 undefined 的最弱约束」，lib 选的正是这个精确位置。

顺手回答 §4 的遗留疑问：`NonNullable<unknown>` 现行版得 `{}`，因为 unknown 与任何类型求交都得对方；经典条件版得 unknown，是因为假分支原样放行。交集版不是「退化」，而是顺手多做了一层过滤——至少 null 与 undefined 从此赋不进来了。

再看一个「非联合直觉」的输入：`NonNullable<boolean | null>`。boolean 在分发场景按 `true | false` 处理，于是交集分发给三个成员：`true & {}` 与 `false & {}` 各自不变，null 得 never 被吸收，合并回 **boolean**。实跑收据用条件探针确认：`[NonNullable<boolean | null>] extends [boolean]` 求值为 true（探针写法是把结果类型放进元组再判 extends，目标故意写反，报错信息直接印出答案）。这解释了为什么「非空过滤」对 boolean 不产生 `true | false` 的副作用——拆开再合并，闭合如初。

### 3. 同态克隆发生在实例化时：Partial 对联合逐成员展开

同态映射的 T 是裸类型参数时，实例化按联合**逐成员**进行：`Partial<A | B>` 不是「对联合的键表做一次映射」，而是先分发成 `Partial<A> | Partial<B>`。这与条件类型的分发同源，一手依据是 TS Handbook《Mapped Types》对同态映射拷贝修饰符的说明与《Conditional Types》的 Distributive 一节。

而 `Omit` 对联合的压扁，根子在 `Exclude<keyof T, K>` 这一步先把键取成了**交集**——`keyof (A | B)` = `keyof A & keyof B`，联合类型上只有「两边共有的键」才是确定存在的键。Pick 拿着交集键去映射，产物只能是单个对象。实跑收据（IsEmpty 探针）：

```ts
type IsEmpty<T> = keyof T extends never ? true : false;
declare const p: Omit<{ a: 1; shared: string } | { b: 2; shared: string }, "shared">;
const probe: IsEmpty<typeof p> = false;
// 报 TS2322: Type 'false' is not assignable to type 'true'
// —— Omit 对联合的产物是 {}，键集为空
```

（探针原理：空对象的 keyof 是 never，`never extends never` 成立得 true；非空对象的键联合 extends never 得 false。目标类型故意写成 `false`，真实结果是 true 时才报错，报错信息直接把答案印出来。）同一条分发规则连 undefined 都不特判：实跑 `declare const p: Partial<{ a: 1 } | undefined>` 再赋给 never，报错详情行印出 `Type 'undefined' is not assignable to type 'never'`——产物的联合里原样保留了 undefined 成员。工程读法：给「可能为空的配置」套 `Partial` 并不会帮你去掉 undefined，空值防御仍要在调用侧做。

### 4. Awaited 的判定次序：先短路 null 与 undefined，是给非严格模式让路

lib.es5.d.ts:1570 第一分支的注释原文是「special case for `null | undefined` when not in `--strictNullChecks` mode」。这个次序不是随手写的：非严格模式下 null 与 undefined 可赋给任何类型，「对象且带可调用 then」的判定会被它们闯入；先短路才能保证 `Awaited<null>`、`Awaited<undefined>` 在两种模式下都原样返回（运行时 `await null` 的结果就是 null，类型必须与语义对齐）。

再补 §7 没覆盖的边界。实跑混合联合：

```ts
type Thenable = { then(onfulfilled: (value: number) => any): any };
declare const q: Awaited<Thenable | Promise<string>[] | null>;
const probe2: never = q;
// 报 TS2322: Type 'number | Promise<string>[] | null' is not assignable to type 'never'
```

三个成员各走一条路：null 进短路分支原样返回；Thenable 的 then 首参可调用，挖出 number 后因 number 不是对象而止步递归；`Promise<string>[]` 是数组类型，**自身没有名为 then 的成员**，进「非 thenable 原样返回」分支。结论：Awaited 只看类型自身的形状，不深入数组成员逐个解包——想解包要自己写映射或用 `Promise.all` 的同态映射签名。

### 5. 同态判定的精确表述：约束「可追溯」

篇 11 的判定规则可以收紧成一句话：映射 `[P in K]` 同态，当且仅当 `in` 右侧是 `keyof T` 本身，或 K 是**约束可追溯到 `keyof T`** 的类型参数。可追溯的意思是顺着约束链走，每一层都是「类型参数的约束」，直到落在 `keyof T` 上。三种情况对照：

- `[P in keyof T]` → 直接命中，同态；
- `[P in K]`（`K extends keyof T`）→ 一层追溯，同态；
- `[P in Exclude<keyof T, K>]` → in 右侧是**计算结果**而非类型参数，追溯链条断裂，非同态——这正是朴素 Omit 丢修饰符的形式根源（§2 坑一）。

手写时把这条当体检标准：想保修饰符，就让 in 右侧保持「裸 keyof 或约束为裸 keyof 的类型参数」；中间只要套了一层 Exclude、Extract 之类的计算，同态即告失效。一手依据：Handbook《Mapped Types》对同态映射的说明段，加上篇 11 的实证规则。

### 6. Record 的键域视角：映射按 K 逐成员生成键表

`Record<K, T>` 的映射语法是 `[P in K]`——对 K 的**每一个成员**生成一个键。K 不限于字面量：可以是模板字面量联合，`${"a" | "b"}-${"x" | "y"}` 之类的键会按模板展开成笛卡尔积键表；也可以是 never——`Record<never, string>` 的键集为空，产物就是 `{}`（IsEmpty 探针实跑确认）。键域生成加交叉合并是工程里搭「精确形状」的常用组合：先按模块分别 `Record<各自键, 类型>`，再用交叉 `&` 拼合（§3 例 D 的思路）；反过来，想「删键」Record 帮不上忙——它造的是全新属性表、没有源可克隆，这正是它非同态的代价。

### 7. 同态映射的数组与元组特例：映射发生在元素位置

同态映射还有一份「免费午餐」：源类型是数组或元组时，映射发生在**元素位置**而不是键上。实跑探针：

```ts
type Ro<T> = { readonly [K in keyof T]: T[K] };
type LT = Ro<[string, number?]>['length'];
const l: 3 = undefined as unknown as LT;
// 报 TS2322: Type '2 | 1' is not assignable to type '3'
// —— 长度仍是字面量并集，证明元组没有被退化成数组
const opt: Ro<[string, number?]> = ['a'];     // 通过：可选元素保留
declare const arr: Ro<{ x: 1 }[]>;
const ok: readonly { readonly x: 1 }[] = arr; // 通过：数组元素逐个只读化
```

三条证据合起来：同态映射对元组保留「长度与可选元素」，对数组产出「元素逐个映射后的只读数组」。这正是 §8 里 `DeepReadonly<{ x: 1 }[]>` 免费工作、以及笔记 32 题 ⑤「数组走同态映射按元素映射」那句的机制本体——不需要给数组写专门分支，同态形态自带。反例也顺手记住：非同态形态没有这个特例，它把数组当普通对象看（键表里是 length 与各种方法名），数组性整体丢失。一手依据：Handbook《Mapped Types》对「映射作用于数组与元组」的说明段。

## 手推配方：三步推演工具类型实例化

拿到任何一行「工具类型套工具类型」的代码，按固定三步推，不跳步：

配方之外先给一个快速体检动作：结果与预期不符时，先看 in 右侧是不是被计算过（Exclude 一类），再看联合是不是在非同态处被压扁——八字口诀「先看右侧，再看联合」，能定位大多数意外产物。

**第一步：判同态。** 找映射语法 `in` 右侧的东西。是 `keyof T`，或是约束可追溯到 `keyof T` 的类型参数（Pick 的 `[P in K]`）→ 同态；否则非同态。同态 → 属性元数据（键名、值类型、`?`、readonly）整份克隆再叠加你写的修饰符变化；非同态 → 全新属性表，只有显式写的修饰符生效。

**第二步：判分发。** 裸类型参数出现在条件类型 extends 左侧 → 联合逐成员分发；同态映射的源 T 是联合 → 同样逐成员分发；两者都被 `[T]` 括号或非同态形态拦住时不分发。

**第三步：逐属性结算。** 对最终参与映射的每一个键，写出「键名、值类型、`?`、readonly」四元组，套用机制深一层第 1 节的代数，产出最终形态。

四个实例走一遍：

**实例一**：`Omit<{ readonly id: number; name?: string }, "name">`。第一步：Omit 展开为 `Pick<T, Exclude<keyof T, K>>`，Pick 的 K 约束是 `keyof T` → 同态。第二步：T 不是联合，不分发。第三步：`keyof T` = `"id" | "name"`，Exclude 删 `"name"` 剩 `"id"`；键 id 的四元组为「id、number、非可选、readonly」，无修饰符变化 → `{ readonly id: number }`。

**实例二**：`Partial<{ a: 1 } | { b: 2 }>`。第一步：同态。第二步：联合 → 分发成 `Partial<{ a: 1 }> | Partial<{ b: 2 }>`。第三步：各自叠 `?` → `{ a?: 1 | undefined } | { b?: 2 | undefined }`。产物仍是**两成员联合**，不是压扁对象；对它做成员判断要按联合逐个成员来。

**实例三**：`Parameters<Ov>`（Ov 是带两个调用签名的接口）。条件类型 extends 对多签名类型只匹配**最后一个**调用签名（§5 既有实证）。第一步：无映射，跳过。第二步：T 非联合，不分发。第三步：拿最后签名 `(x: number, y?: boolean)` 做模式匹配，rest 位的 `infer P` 捕获整个形参表 → `[x: number, y?: boolean]`，标签与可选性一并保留。推到这里自然能预测：任何包装重载函数的工具都会丢掉前面的签名——瓶颈在 extends 的签名选择规则，不在包装写法。

**实例四**：`Awaited<Promise<Promise<number>>>`。第一步：条件类型非映射，跳过。第二步：单一对象类型，不分发。第三步：`Promise<Promise<number>>` 是对象且带可调用 then，从 onfulfilled 首参挖出 `Promise<number>`，递归进入下一层；它又是 thenable，再挖出 number；number 不是对象，递归止步 → `number`。注意这道递归**没有显式出口分支**——出口藏在「解出来不再是 thenable 就原样返回」的兜底里。手推递归类型先找出口再看分支，顺序反了容易把兜底误当异常路径。

## 与手写实现对照：内建版与手写版的逐条差异

手写是本册练习的主线（15 个仿写在 `exercises/ts-utility-types/`）。下表按「官方签名 → 常见手写版 → 差异要点」逐条过，差异点即考点：

| 工具类型 | 官方实现 | 常见手写版 | 关键差异 |
| --- | --- | --- | --- |
| Partial / Required / Readonly | `[P in keyof T]` 逐个叠修饰符 | 同款 | 无差异；手写重点是说出「同态」二字 |
| Pick | `[P in K]`，K 约束 keyof T | 同款 | 手写若把 K 的约束改写成计算结果，同态即失 |
| Omit | `Pick<T, Exclude<keyof T, K>>` | 直接 `[P in Exclude<...>]` 映射 | 直接映射版非同态、丢全部修饰符（§2 坑一） |
| Record | `[P in K]`，K 约束 `keyof any` | 同款 | 键域宽度由约束决定，手写收紧会失去「任意键」能力 |
| Exclude / Extract | 裸 T 条件分发 | 同款 | 手写常忘 never 入参：空联合不分发，直接得 never |
| Parameters / ReturnType | 先验函数约束 + infer | 同款 | 约束写成 `Function` 时报错不友好且拿不到参数元组 |
| Awaited | null 短路 + object 判定 + 递归 | 多数写 `T extends Promise<infer V>` | 漏 thenable 裸对象、漏 null 短路、漏「首参不可调用得 never」 |
| NonNullable | `T & {}`（现行 lib） | 经典条件版 | 常规联合等价；unknown 上分叉（机制深一层 §2） |
| DeepReadonly | 内建没有 | 同态映射 + 递归 | 官方「缺失」本身就是答案：深浅取舍刻意留给用户 |

两段补充。**Awaited 的手写三漏怎么补**：先写 `T extends null | undefined ? T` 短路；thenable 判定写成 `object & { then(onfulfilled: infer F, ...args: infer _): any }`——object 前置把原始类型拦在门外，`...args: infer _` 容纳多参 then；最后 `F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never` 兜住「then 存在但首参不可调用」。对照官方源码逐行抄一遍再脱稿写，是检验递归理解最快的路径。**NonNullable 的手写选型**：写经典条件版即可，语义直白、常规联合上与现行版等价；但「unknown 分叉」这张差异卡要背下——被追问时能说出交集版在 unknown 上得到 `{}` 的原因（两条交集规则），比「背结论」高一个档次。表的最后一行留给自查习惯：调用 `Object.freeze` 时接受它的 `Readonly<T>` 返回类型（lib 自带重载已经这么做了），让「运行时冻结」与「类型层只读」在同一行会合——§8 讲过机制，这里补的是把机制落成惯例的那一步。

## 工程三陷阱

**陷阱一：把 `Partial<T>` 当「全深度可选」。** 触发场景：`updateConfig(patch: Partial<Config>)`，Config 含嵌套对象；调用方只传 `{ nested: { flag: true } }`，编译器报 nested 的其余必填字段缺失，有人就用断言糊过去。根因：映射只作用于最外层，`T[P]` 原样照搬，内层必填性原封不动。规避：写递归版 `DeepPartial` 并给函数与数组分支留出口（§8 与笔记 32 的题 ⑤）；或在 API 边界提供逐字段 setter，避免「深 patch」语义。

**陷阱二：`Record<string, Row>` 被当「精确字典」。** 触发场景：`const byId: Record<string, User> = {}` 之后 `byId[id].name` 直接链式取值，键不存在时运行时炸「Cannot read properties of undefined」。根因：string 键域无限宽，该类型只承诺「每个 string 键查出来都是 User」，不承诺「你访问的键真的写过」。规避：键域封闭用字面量联合（`Record<"a" | "b", User>` 少一个键都报错）；键域开放就认账——开 `noUncheckedIndexedAccess`（笔记 15 §2.1）让读出的值并上 undefined，或显式判空再取成员。字面量表还有一招「声明行拦截」：用 `satisfies Record<"a" | "b", User>` 核对字面量对象，缺键在声明处就报错，不必等读取时才暴露。

**陷阱三：对带重载的函数套 `ReturnType<typeof fn>`。** 触发场景：SDK 的请求方法带多个重载，包装层用 `ReturnType<typeof sdk.request>` 标返回类型，调用方拿到的只有**最后一个**签名的返回类型，前几个签名的参数组合静默失效。根因：extends 匹配多签名取最后一个（手推配方实例三）。规避：包装层写成泛型直转发——形如 `<T extends (...args: infer A) => infer R>(...args: A): R`，让每个调用点的重载解析发生在调用点自身；或显式枚举需要的签名形态。「包一层再解包」救不回签名列表，信息瓶颈在规则里。

## 排查速查表

| 报错（码 · 原文要点） | 根因 | 处置 |
| --- | --- | --- |
| TS2540 · Cannot assign to 'x' because it is a read-only property | 同态映射克隆了 readonly（如 `Required<Partial<T>>` 之后） | 预期行为；确要可写用 `Mutable<T>`（`-readonly`）并复核上游只读契约 |
| TS2741 · `Property 'x' is missing in type '{}' but required in type ...` | 朴素映射或朴素 Omit 把 `?` 摘成了必有 | 换官方 Omit，或写成同态形态 `[P in K]?: T[P]` |
| TS2322 · Type 'number \| undefined' is not assignable to type 'number' | Record 或索引读出的值并上了 undefined | `??` 兜底或判空收窄；开 `noUncheckedIndexedAccess` 前先盘点访问点 |
| TS18048 · 'x' is possibly 'undefined' | 索引、可选链的产物未收窄就取成员 | 先判空或 `??` 兜底，收窄后再取成员 |
| TS2345 · Argument of type '"xxx"' is not assignable to parameter of type '"a" \| "b"' | `K extends keyof T` 或 `StrictOmit` 拦下拼错的键 | 改键名；确需宽松键集用官方 Omit 的 `keyof any` 约束 |
| TS2589 · Type instantiation is excessively deep and possibly infinite | `DeepReadonly`/`DeepPartial` 撞上循环引用或无出口递归 | 补出口（函数、原始类型分支）；有环数据限制深度或移到运行时处理 |
| TS2313 · Type parameter 'x' has a circular constraint | 工具类型互相引用成环（A 的约束依赖 B，B 又依赖 A） | 提取公共约束层，消除环引用 |
| TS2558 · Expected N type arguments, but got M | 给工具类型多传或漏传类型实参（如 `Partial<T, U>`） | 对照 lib.es5.d.ts 的官方签名修正个数 |
| TS2339 · Property 'x' does not exist on type 'never' | Exclude/Extract 把联合过滤成 never 后继续取成员 | 先判 `[T] extends [never]`，或倒转过滤方向（Extract 换 Exclude） |

## code review 检查单

- [ ] `Omit` 处确认用的是官方版（借道同态 Pick、保修饰符）而非手写朴素版；拼错键需要拦截就换 `StrictOmit`。
- [ ] 用 `Partial`/`Readonly` 的地方检查被包装类型有无嵌套对象——有则明确「浅层」是有意为之，或换 Deep 版。
- [ ] `Record` 的键域：字面量联合查「缺键」，string 键查「访问点判空」；两者混用是高危信号。
- [ ] `Parameters`/`ReturnType` 的目标函数是否带重载；带则确认「只保最后一个签名」调用方可接受，或改泛型直转发。
- [ ] 提取 async 函数返回值用 `Awaited<ReturnType<typeof fn>>` 而非裸 `ReturnType`。
- [ ] 每个非平凡工具类型都有类型层测试（`Expect<Equal<...>>` 或 `expectTypeOf`），且至少覆盖一个「修饰符加联合」的复合边界。
- [ ] `[T]`、`T extends any` 这类控制分发的写法旁边有注释说明意图。
- [ ] `NonNullable` 之后没有把「非 null」当「真值」用：空串、0、false 仍会穿透。
- [ ] `Parameters` 类工具的约束是否恰到好处：`(...args: any) => any` 宽到收下所有函数、又窄到让非函数早早报错；写成 `Function` 则两头落空。
- [ ] 修饰符叠加链（`Readonly<Required<T>>` 一类）旁有注释标明每层意图与顺序，读者不必重新推演。

## 输出预测题（进阶）

**题 1（修饰符代数）**：

```ts
interface Base { readonly id: number; label?: string; tags: string[] }
type A = Required<Partial<Base>>;
type B = { -readonly [K in keyof A]-?: A[K] };
type C = { [K in keyof A]: A[K] };
const x: A = { id: 1 };
```

不运行，写出 A、B、C 的精确形态；`x` 那一行报不报错、报什么码；C 与 A 有无差异。

**题 2（联合分发与压扁）**：

```ts
type Q2 = Partial<{ a: 1; shared: string } | { b: 2; shared: string }>;
type Q3 = Omit<{ a: 1; shared: string } | { b: 2; shared: string }, "shared">;
```

写出 Q2、Q3 的精确产物；对 Q2 的产物做「键 a 是否存在」的运行时判断，结果由什么决定？

**题 3（Awaited 边界）**：

```ts
type Thenable = { then(onfulfilled: (value: number) => any): any };
type Q4 = Awaited<Thenable | Promise<string>[] | null>;
```

写出 Q4 的精确产物，并解释数组成员为什么「活着出来」。

**题 5（组合推演）**：

```ts
declare function f(): Promise<Promise<string>>;
type Q5 = NonNullable<Awaited<ReturnType<typeof f>> | null>;
```

写出 Q5 的精确产物，并按手推配方三步给出过程。

**题 4（NonNullable 两版对照）**：对 `NonNullable<unknown>` 分别给出 TS 5.x 经典条件版与现行交集版的产物，并用机制深一层第 2 节的规则解释为什么现行版得到 `{}` 而不是 unknown。

## 进阶题解析

**题 1**：`Partial<Base>` 叠 `?`、readonly 原样继承 → `{ readonly id?: number | undefined; label?: string | undefined; tags?: string[] | undefined }`；`Required` 再 `-?` 摘可选、readonly 依旧不碰 → `A = { readonly id: number; label: string; tags: string[] }`。B 一次结算两个维度（实跑过的 Concrete 同款）→ `B = { id: number; label: string; tags: string[] }`。C 什么都不写、全维度继承 → **C 与 A 无差异**（含 readonly 与必有性），这正是「同态」的本义。`x` 行报 **TS2741**（Property 'label' is missing ... but required in type 'A'）——`?` 已被 `-?` 摘掉，「可选」回不来了。

**题 2**：Q2 同态分发 → `{ a?: 1 | undefined; shared?: string | undefined } | { b?: 2 | undefined; shared?: string | undefined }`，是**两成员联合**而非压扁对象。运行时「键 a 存在与否」由那个真实对象属于哪个成员、又是否赋过值决定：第一成员的实例可有可无，第二成员的实例压根没有 a——类型层两个成员都有 a 这个键（可选），运行时判断看的是值不是类型。Q3 实跑收据（IsEmpty 探针）为 **`{}`**：`keyof` 对联合取交集只剩 `"shared"`，删空后 Pick 映射出空对象；想逐成员删除用 §2 的 `DistributiveOmit`。顺带回收机制深一层 §3 的交集规则：想问「键 a 在联合所有成员上都存在吗」，类型层写法是 `"a" extends keyof Q2`——keyof 对联合取交集，答案是 false（a 只在第一成员上有）。

**题 3**：`Q4 = number | Promise<string>[] | null`（实跑收据：赋给 never 报 `Type 'number | Promise<string>[] | null' is not assignable to type 'never'`）。null 进短路分支原样返回；Thenable 进 thenable 分支挖出 number，number 不是对象、递归止步；数组类型自身没有 then 成员，进「非 thenable」分支原样返回。Awaited 判的是「类型自身形状」，不深入数组成员逐个解包——想解包要么写映射（`{ [K in keyof T]: Awaited<T[K]> }`），要么直接用 `Promise.all` 的官方签名。

**题 4**：经典条件版 `unknown extends null | undefined ? never : unknown`：unknown 是 top type，不能赋给 null 与 undefined，判定为假，走假分支原样放行 → **unknown**。现行交集版按「unknown 是交集的单位元」结算，`unknown & {}` = `{}` → **`{}`**。安全性差异：`{}` 至少拦住 null 与 undefined 的赋值（两者不满足空约束），unknown 则什么都不拦。所以现行版在 unknown 上「更窄」是过滤的副产品，不是行为 bug——但若代码依赖「NonNullable 后仍是 unknown」的宽顶类型语义（比如再喂给只接受 unknown 的入口），升级 lib 后要复查这一处。

**题 5**：从里往外推。`typeof f` = `() => Promise<Promise<string>>`；`ReturnType` 挖返回值得 `Promise<Promise<string>>`；`Awaited` 递归拆两层 thenable 得 `string`；`NonNullable<... | null>` 交集分发，null 与 `{}` 交集得 never、被联合吸收 → **`string`**。这条链是「ReturnType 不递归、Awaited 递归、NonNullable 过滤」三个工具各司其职的缩影——每一环的规则都能独立说出口，组合题就不可怕。
