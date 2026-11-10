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

