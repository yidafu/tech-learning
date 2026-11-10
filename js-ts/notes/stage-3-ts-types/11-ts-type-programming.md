---
mdx:
  format: mdx
---
# 11 · TypeScript 类型编程：映射 / 条件 / infer / 模板字面量 / 变长元组

> 对应大纲：阶段 3.3「类型编程（核心重点）」

## 学习目标

1. 说清**同态映射**为什么能自动保留 `readonly` / `?` 修饰符，而 `Record` 这类非同态映射不能
2. 手推**分布式条件类型**的每一步：谁是「裸类型参数」、联合怎么逐成员分发、`never` 为什么直接消失、`[T] extends [U]` 怎么阻断
3. 掌握 `infer` 的合法位置清单，能把 `ReturnType` / `Awaited` / 递归解包这类「类型提取」写出来
4. 用模板字面量类型 + 映射类型 + 条件类型组合出「API 类型生成器」（如 `onEvent<'click'>` → `onClick`）
5. 会用变长元组 `[...T, ...U]` 做类型级 `Concat` / `Reverse`，并理解它对 rest 参数的意义

---

## 关键概念

> 一手依据标注约定：
> - **[HB-Mapped]** TS Handbook《Mapped Types》：https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
> - **[HB-Cond]** TS Handbook《Conditional Types》：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
> - **[HB-Tmpl]** TS Handbook《Template Literal Types》：https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
> - **[RN-x.y]** TypeScript x.y 发布说明（Release Notes）
> - **[lib.es5.d.ts]** 本机 TypeScript 安装内的库声明文件源码（本工作区 tsc 7.0.2，工具类型集中在 lib.es5.d.ts 约 1570–1680 行）

### 1. 映射类型：`{ [K in keyof T]: ... }`

#### 1.1 基本形态：一次遍历一个联合

`keyof T` 求值出一个**键的联合类型**，`[K in 联合]` 相当于对这个联合做 for 循环，每个成员生成一个属性，`T[K]` 按键取值类型：

```ts live noInline
type Flags = { [K in "x" | "y"]: boolean }; // { x: boolean; y: boolean }
type Copies<T> = { [K in keyof T]: T[K] };  // 逐属性复制 T
```

这纯粹是**类型层面**的构造，运行时没有任何对应物——所有映射类型在编译后就消失了。

#### 1.2 同态（homomorphic）vs 非同态：修饰符的去留

**[HB-Mapped]** Handbook 专门有一节 "Homomorphic Mapped Types"。判定规则（结合 TS 编译器源码 `isHomomorphicMappedType` 的行为，可在 Playground 实证）：

- 映射的约束**直接是** `keyof T`（T 是类型参数）→ 同态；
- 映射的约束是**一个类型参数 K，且 K 的约束是 `keyof T`** → 也算同态（这正是 `Pick<T, K extends keyof T>` 保留修饰符的原因，lib.es5.d.ts 第 1606 行的 `Pick` 就受益于这条规则）；
- 其他（如 `Record<K extends keyof any, T>` 的 `[P in K]`，K 与任何 `keyof T` 无关）→ **非同态**。

同态映射会**从源类型复制 `readonly` 和 `?` 修饰符**，你只能显式改其中你提到的那个：

```ts live noInline
interface Todo {
  readonly id: number; // readonly
  title: string;
  done?: boolean;      // 可选
}

type PartialTodo = { [K in keyof Todo]?: Todo[K] };
// { readonly id?: number | undefined; title?: string | undefined; done?: boolean | undefined }
// ↑ readonly 被原样复制，只叠加了 ?

type RecordLike = { [P in "id" | "title"]: boolean }; // 非同态：没有任何修饰符可复制
// { id: boolean; title: boolean } —— 全部必有、全部可写
```

非同态映射不只是「丢了 `?`」这么简单——严格模式下可选属性 `done?: boolean` 的**值类型本身就是 `boolean | undefined`**，所以非同态映射的结果是 `done: boolean | undefined`：属性从「可省略」变成了「必须给、但可以给 `undefined`」。语义完全变了：

```ts live noInline
type Naive = { [K in keyof Todo]: Todo[K] };   // 同态（keyof T），保留 done?
type NonHom = { [K in Exclude<keyof Todo, never>]: Todo[K] }; // 非同态！done 变成必有
declare const n: NonHom;
const a: Naive = { id: 1, title: "x" };         // OK：done 可省
// NonHom 则要求必须写 done（哪怕值是 undefined）
```

同态映射还有两条免费赠送的行为（**[HB-Mapped]**，均可实证）：

- **对联合分发**：`Partial<A | B>` = `Partial<A> | Partial<B>`（所以 `Partial` 作用在可辨识联合上不会把它压成一个对象）；
- **对数组/元组按元素映射**：`{ [K in keyof T]: F<T[K]> }` 作用在 `T = [1, 2]` 上得到 `[F<1>, F<2>]`，作用在 `number[]` 上得到映射后的数组类型（加 `readonly` 修饰符则得到 `readonly F<number>[]`）——这是 `DeepReadonly` 能「顺手」处理数组的基础。对原始类型（如 `string`）则原样返回自身。

#### 1.3 修饰符加减：`+readonly` / `-readonly` / `+?` / `-?`

**[RN-2.8]**（"Improved control over mapped type modifiers"）引入了修饰符算术。默认是加法，所以 `?` 等价于 `+?`；减法用 `-`：

```ts live noInline
type Mutable<T> = { -readonly [K in keyof T]: T[K] }; // 摘掉所有 readonly（Mutable/Writeable 惯用实现）
type Required1<T> = { [K in keyof T]-?: T[K] };       // 摘掉所有 ?，即内置 Required 的全部原理
type Both<T> = { -readonly [K in keyof T]-?: T[K] };  // 两个减号可以连用
```

lib.es5.d.ts 中 `Required<T>`（第 1592 行）与 `Readonly<T>`（第 1599 行）的全部源码就一行映射：

```ts live noInline
type Required<T> = { [P in keyof T]-?: T[P]; };
type Readonly<T> = { readonly [P in keyof T]: T[P]; };
```

#### 1.4 `as` 重映射：改键名与过滤键

**[RN-4.1]** "Key Remapping in Mapped Types"：`[K in keyof T as 新键]`。两个核心用法：

```ts live noInline
// ① 键改名：生成 getXxx 访问器表
type Getters<T> = {
  [K in keyof T & string as `get${Capitalize<K & string>}`]: () => T[K];
};

// ② 键过滤：映射到 never 的键会被直接丢弃
type StringKeysOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

原理：`as` 后面是一个以 K 为变量的类型表达式；求值为 `never` 的键不产生任何属性。**过滤联合的万能套路**由此而来——`Exclude<T, U> = T extends U ? never : T` 在键的重映射里再扮演一次「丢弃器」。

实证过的一个细节：`[K in keyof T as ...]` **仍然是同态映射**，`readonly` / `?` 修饰符照常保留（改的只是键名，不是属性元数据）。注意 `keyof T & string` 这个交集——`keyof T` 是 `string | number | symbol` 的子集，而 `Capitalize` 只接受 `string`，所以要先把键收窄成字符串。

### 2. 条件类型：`T extends U ? X : Y`

#### 2.1 延迟求值（deferral）

**[HB-Cond]**：条件类型里的 T 是**尚未实例化的类型参数**时，整个条件类型保持未求值形态，等 T 落到具体类型再算：

```ts live noInline
type Box<T> = T extends string ? "str" : "not-str";
type A = Box<number>; // "not-str"（已求值）
// Box<T> 在泛型上下文里显示为 Box<T> 本身——不是错误，是「等着」
```

这就是条件类型能作为「类型层面的函数」参与后续组合的原因：先把规则写好，调用时才执行。

#### 2.2 分布式条件类型：裸类型参数 + 联合 → 逐成员分发

**[HB-Cond]** "Distributive Conditional Types" 一节的原文规则：**检查类型是一个裸（naked）类型参数**时，联合类型先被拆开、逐个成员代入求值，最后再把结果联合起来。

```ts live noInline
type ToArray<T> = T extends any ? T[] : never;
type R1 = ToArray<string | number>; // string[] | number[]，而不是 (string | number)[]
type R2 = ToArray<boolean>;         // true[] | false[]！boolean 本质是 true | false 的联合
```

「裸」的含义：检查类型就是那个类型参数本身，没有被包裹。一旦包进元组，分发被阻断：

```ts live noInline
type ToArrayBlocked<T> = [T] extends [any] ? T[] : never;
type R3 = ToArrayBlocked<string | number>; // (string | number)[] —— 整体判断
```

两边的赋值行为立刻分叉：`["only", "strings"]` 可以赋给 `string[] | number[]`（是其中一个成员），`["str", 1]` 不行；但两者都能赋给 `(string | number)[]`。

#### 2.3 `never` 特例：既是「空联合」，也是过滤利器

把联合分发规则推到极限：`never` 是**空联合**（zero members），对空联合分发 = 一次都不执行 = 结果是 `never`：

```ts live noInline
type Cond<T> = T extends string ? 1 : 2;
type N1 = Cond<never>; // never —— 不是 1 也不是 2！
```

但注意区分「泛型里的裸 never」与「直接写 never」：

```ts live noInline
type N2 = never extends string ? 1 : 2; // 1 —— never 可赋值给一切，走 true 分支
```

`N1` 走的是分发规则，`N2` 没有类型参数可分发，按普通可赋值性判断。于是判断「T 是不是 never」必须用元组阻断：

```ts live noInline
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>  // true
IsNever<string> // false
```

**过滤联合**是分布式 + never 的最高频应用，lib.es5.d.ts 第 1620 行的 `Exclude` 一行就是全部原理：

```ts live noInline
type Exclude<T, U> = T extends U ? never : T;
// Exclude<"a" | "b" | "c", "a" | "c">
//   = ("a" extends "a"|"c" ? never : "a") | ("b" extends ... ) | ("c" extends ... )
//   = never | "b" | never
//   = "b"
```

`Extract<T, U> = T extends U ? T : never` 是镜像操作（保留匹配的）。`never` 在联合中会被吸收（`X | never = X`），所以过滤后不需要再去清理。

#### 2.4 防坑清单（条件类型）

1. **boolean 会拆**：`ToArray<boolean>` 是 `true[] | false[]`。想不拆就 `[T] extends [U]` 阻断。
2. **never 会消失**：分布式条件下 `T = never` 直接得 `never`，真假分支都不走；判断 never 用 `[T] extends [never]`。
3. **any 两边都要**：检查类型是 `any` 时，条件类型返回 `X | Y`（两个分支的联合）。
4. **联合整体判断被误分发**：想问「`string | number` 整体是否可赋给 X」却写了裸 T，得到的是逐成员答案的联合。经典题：`IsUnion<T> = [T] extends [never] ? false : [T] extends [T[]] ? false : true` 的各种写法都要先处理分发。
5. **Omit 不分发**：`Omit<A | B, K>` 会把联合压成一个对象（keyof 联合 = 键的交集）。惯用解法是手写 `DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never`（在裸 T 上分发）。
6. **递归爆栈**：递归条件类型有实例化深度上限（约 50 层），超限报 `Type instantiation is excessively deep and possibly infinite. ts(2589)`。

### 3. infer：在 extends 右侧「挖坑取类型」

#### 3.1 合法位置

**[RN-2.8]**：`infer U` **只能出现在条件类型的 extends 子句（右侧）**，声明一个「待推断」的类型变量，从检查类型的结构中反解出来。声明侧 `type Foo<infer T> = ...` 是非法的。

常见推断位置清单（每条都能在 lib.es5.d.ts 或类型体操中找到原型）：

| 位置 | 写法 | 内置对应 |
| --- | --- | --- |
| 函数参数 | `T extends (...args: infer P) => any ? P : never` | `Parameters<T>` |
| 函数返回值 | `T extends (...args: any) => infer R ? R : any` | `ReturnType<T>` |
| 构造器参数 / 实例 | `T extends abstract new (...args: infer P) => infer R ? ... : ...` | `ConstructorParameters<T>` / `InstanceType<T>` |
| 数组元素 | `T extends readonly (infer E)[] ? E : never` | — |
| 元组片段 | `T extends [infer F, ...infer R] ? ... : ...` | — |
| 元组末位 | `T extends [...unknown[], infer L] ? L : never` | — |
| Promise 包装 | `T extends Promise<infer V> ? V : T` | — |
| 模板字面量模式 | ``T extends `id-${infer N}` ? N : never`` | — |
| 递归位置 | `UnboxPromise<T> = T extends Promise<infer V> ? UnboxPromise<V> : T` | `Awaited<T>` |

#### 3.2 多候选规则：协变取联合、逆变取交叉

**[RN-2.8]**：同一个 `infer U` 在一次匹配中出现多个候选时——

- **协变位置**（输出位置，如两个属性的值）：推断为候选的**联合**。`{ a: infer U; b: infer U }` 匹配 `{ a: string; b: number }` → `U = string | number`。
- **逆变位置**（输入位置，如两个函数类型属性的参数）：推断为候选的**交叉**。`{ m: (x: infer U) => void; n: (x: infer U) => void }` 匹配 `{ m: (x: string) => void; n: (x: number) => void }` → `U = string & number`。

（注意方法简写 `m(x: string): void` 在开启 `strictFunctionTypes` 时对参数仍是双变，推断结果会退回联合——想演示交叉请用属性写法 `(x: string) => void`。）

#### 3.3 同名 infer 的多分支匹配

一个条件类型里多个分支各用一次 `infer` 是常见手法（`Awaited<T>` 就是三段嵌套），分支之间互不干扰，谁匹配走谁：

```ts live noInline
type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T; // 数组递归拍平
type UnboxPromise<T> = T extends Promise<infer V> ? UnboxPromise<V> : T;
```

#### 3.4 infer 与递归组合：三个代表作

```ts live noInline
// ① 递归解包嵌套 Promise（内置 Awaited 的简化版）
type UnboxPromise<T> = T extends Promise<infer V> ? UnboxPromise<V> : T;
type U1 = UnboxPromise<Promise<Promise<number>>>; // number

// ② 拍平嵌套数组
type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;
type F1 = Flatten<number[][]>; // number

// ③ 深度只读：同态映射 + 递归。数组靠「同态映射按元素映射」自动被处理
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
type D1 = DeepReadonly<{ a: { b: 1 } }>; // { readonly a: { readonly b: 1 } }
type D2 = DeepReadonly<{ x: number }[]>; // readonly { readonly x: number }[]
type D3 = DeepReadonly<string>;          // string（同态映射对原始类型原样返回）
```

### 4. 模板字面量类型

#### 4.1 模式占位符

**[RN-4.1]** "Template Literal Types" / **[HB-Tmpl]**。`` `前缀${模式}后缀` `` 中，占位符可以是：

- 字面量联合：`` `get${"Name" | "Id"}` `` → `"getName" | "getId"`
- 模式关键字：`${string}`（任意串）、`${number}`、`${bigint}`、`${boolean}`、`${null}`、`${undefined}`
- 嵌套模板：`` `/${"" | "about"}` `` → `"/" | "/about"`（联合在模板里自动做笛卡尔积展开）

```ts live noInline
type Route = `/${"" | "about" | "contact"}`; // "/" | "/about" | "/contact"
type UserId = `users/${number}`;             // 模式类型："users/1"、'users/42'… 都可赋值
```

配合 `infer` 可以在类型层做「字符串解析」：

```ts live noInline
type ParseEndpoint<S extends string> =
  S extends `${infer Method} /${infer Path}` ? { method: Method; path: Path } : never;
type E = ParseEndpoint<"GET /users">; // { method: "GET"; path: "users" }
```

#### 4.2 内置字符串操作类型

**[lib.es5.d.ts 第 1660–1680 行]**（TS 4.1 起），声明是 `intrinsic`——由编译器内部实现，用户无法用手写类型模拟：

```ts live noInline
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;
```

对应运行时的 `String.prototype.toUpperCase` 等四个方法（注意 `Capitali z e` 对应 `str[0].toUpperCase() + str.slice(1)`，与 `toUpperCase` 不同）。

#### 4.3 组合出「API 类型生成器」

模板字面量（造键名）+ 映射类型（造对象）+ 条件类型（过滤/改值）三者组合，是 TS 类型编程的集大成应用：

```ts live noInline
type Props = { id: number; name: string };

// get/set 前缀方法表：as 重映射造键名
type Accessors<T> = {
  [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K];
} & {
  [K in keyof T & string as `set${Capitalize<K>}`]: (v: T[K]) => void;
};
// Accessors<Props> = { getId: () => number; getName: () => string } &
//                    { setId: (v: number) => void; setName: (v: string) => void }

// 事件名 → handler 名：泛型函数签名收窄
type HandlerName<E extends string> = `on${Capitalize<E>}`;
function on<E extends "click" | "focus">(event: E, cb: () => void): Record<HandlerName<E>, () => void> {
  return { [`on${event[0].toUpperCase()}${event.slice(1)}`]: cb } as Record<HandlerName<E>, () => void>;
}
const h = on("click", () => {}); // h 的类型是 { onClick: () => void }，h.onFocus 不存在
```

Vue 的 `defineEmits`、各种 `createGetterSetter` 工具库的类型层都是这个模式。

### 5. 变长元组类型（variadic tuple types）

**[RN-4.0]**。两个能力：

1. **展开语法**：`[...T, ...U]` 在类型位置拼接元组（T、U 是元组类型时）；
2. **展开推断**：`infer` 出现在元组的 rest 位置，如 `[...infer Head, infer Last]`（头部 rest 自 TS 4.2 起允许出现在任意非末尾位置）。

```ts live noInline
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];
type Prepend<E, T extends readonly unknown[]> = [E, ...T];
type Reverse<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? [...Reverse<R>, F]   // 递归：反转剩余部分，再把头放到最后
  : [];                  // 空元组是递归出口
type TupleToUnion<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? F | TupleToUnion<R>  // 递归收集成员（也可直接写 T[number]）
  : never;

type C1 = Concat<[1, 2], ["a"]>;  // [1, 2, "a"]
type Rv = Reverse<[1, 2, 3]>;     // [3, 2, 1]
type U2 = TupleToUnion<["a", 1]>; // "a" | 1
```

**元组与数组联动**：变长元组最大的工程意义是 rest 参数。函数的剩余参数类型就是一个元组，所以 `Parameters<F>` 拿到的元组可以原样展开回去，实现「转发参数而不丢类型」：

```ts live noInline
function safeCall<F extends (...args: any[]) => unknown>(fn: F, ...args: Parameters<F>): ReturnType<F> {
  return fn(...args) as ReturnType<F>; // args 是元组，可以合法 spread 进 rest 参数
}
```

（`lib.es2015.promise.d.ts` 里 `Promise.all` 的类型 `Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>` 就是「同态映射 + 变长元组 + 递归条件类型」三者合体的官方范例——对元组逐位映射并解包每个 Promise。）

### 6. 递归深度限制

递归类型有实例化深度上限（约 50 层）与实例化总数上限，超限报错 `Type instantiation is excessively deep and possibly infinite. ts(2589)`——遇到它通常说明递归没有正确收敛（缺出口、条件永真），或数据结构深度真的超过了编译器限制。

---

## 可运行示例

配套练习（先自己写「预期输出」注释，再运行对照）：

```bash
npx tsx exercises/ts-type-programming/01-mapped-types.ts        # 手写 6 个映射工具类型 + as 重映射
npx tsx exercises/ts-type-programming/02-conditional-infer.ts   # infer 家族 + 递归解包 + 类型安全函数表
npx tsx exercises/ts-type-programming/03-distribution.ts        # 分布式 vs 阻断式对照实验
npx tsx exercises/ts-type-programming/04-template-literal.ts    # 路由/方法表/handler 名推导
npx tsx exercises/ts-type-programming/05-variadic-tuples.ts     # Concat/Prepend/Reverse + safeCall
```

类型检查（tsx 只转译不查类型，跑通 ≠ 类型对，两个都要做）：

```bash
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom <file>
```

最小可运行片段（30 秒验证「同态 vs 非同态」）：

```ts live noInline
type Keep = { [K in keyof { readonly a: 1; b?: 2 }]: { readonly a: 1; b?: 2 }[K] }; // 同态
type Lose = { [K in Exclude<keyof { readonly a: 1; b?: 2 }, never>]: { readonly a: 1; b?: 2 }[K] }; // 非同态
const k: Keep = { a: 1 };        // OK：b 仍可选、a 仍 readonly
// @ts-expect-error - Lose 的 b 已变成必有
const l: Lose = { a: 1 };
```

---

## 易错点与面试高频

1. **「Partial 为什么保留 readonly？」**——同态映射只改动你显式写的修饰符（`?`），其余原样复制。追问「那 Omit 呢」见 12 篇。
2. **`Record<string, T>` 与索引签名不完全等价**：`Record<string, T>` 是映射类型，对 `keyof` 的呈现与 `{ [k: string]: T }` 基本一致，但 `Record<never, T>` 是 `{}`（空联合映射出空对象）；`Record<"a" | "b", T>` 则是精确的两个必有键。
3. **`T extends any ? X : Y` 不是恒等 X**：T 为联合时逐成员分发（结果往往是 X 的联合）；T 为 never 时结果是 never。
4. **`boolean` 的联合本质**：裸参数代入 `boolean` 时拆成 `true | false` 逐个分发。分支不含 T 时不易察觉（`Cond<boolean>` = `"n" | "n"` 约简为 `"n"`）；分支含 T 时立刻现形——`ToArray<boolean>` 是 **`true[] | false[]`**，不是 `boolean[]`。想不拆就 `[T] extends [U]`。面试常考。
5. **`Exclude<T, never>` = T，`Extract<T, never>` = never**：前者没有成员会被排除，后者没有任何成员能匹配 never。同理 `Exclude<never, X> = never`（空联合分发）。
6. **过滤键 vs 过滤值**：映射类型里 `as` 过滤的是**键**；要按值类型过滤属性，写 `[K in keyof T as T[K] extends 目标 ? K : never]`。
7. **`keyof T & string` 的必要性**：`Capitalize<K>` 要求 K extends string，而 `keyof T` 含 number/symbol 键，直接用会报「Type 'K' does not satisfy the constraint 'string'」。
8. **递归出口**：`Reverse` / `Flatten` / `TupleToUnion` 的递归分支一定要有「匹配不到时」的兜底（`[]` / `never`），否则永远递归 → TS2589。
9. **面试高频手写**：`MyPick`、`MyReadonly`（type-challenges easy 开门题）、`DeepReadonly`（medium）、`TupleToUnion`、`Concat`；口述原理时抓住关键词：同态、分发、infer 位置、递归出口。

---

## 输出预测题

**题 1**：以下代码能否通过类型检查？依次推断 `A`、`B`、`C` 的类型（写出精确结果）：

```ts live noInline
type Cond<T> = T extends string ? "s" : "n";
type A = Cond<"a" | 1 | never>;
type B = [never] extends [never] ? "yes" : "no";
type C = Cond<any>;
```

**题 2**：`type Keys<T> = { [K in keyof T as T[K] extends Function ? K : never]: T[K] }` 作用于：

```ts live noInline
interface Api {
  url: string;
  fetch(): Promise<void>;
  onDone(cb: () => void): void;
  retries: number;
}
```

`Keys<Api>` 的结果是什么？`Keys<Api>["fetch"]` 又是什么类型？（注意方法简写在映射中的表现。）

---

## 延伸阅读

- TS Handbook：《Mapped Types》《Conditional Types》《Template Literal Types》（本篇所有行为规则的一手出处）
- Release Notes：TS 2.8（条件类型/infer/修饰符算术）、TS 2.9（keyof 含 number/symbol）、TS 4.0（变长元组）、TS 4.1（模板字面量 + as 重映射）、TS 4.5（Awaited）
- lib.es5.d.ts 源码：本机安装内 `node_modules/typescript/lib/lib.es5.d.ts` 第 1570–1680 行（工具类型全家）与第 1660–1680 行（四个字符串操作 intrinsic）
- type-challenges：easy 的 Pick / Readonly / TupleToUnion / First / Concat，medium 的 DeepReadonly / GetReadonlyKeys
- 官方示例库：TypeScript `playground` 的 "Type gymnastics" 示例与 PR #40002（模板字面量最初设计）

---

## 预测题答案

**题 1**：

- `A` 的求值：`"a" | 1 | never` 先约简为 `"a" | 1`（never 被吸收），分发后 `"a" extends string → "s"`，`1 extends string → "n"`，结果 **`"s" | "n"`**。
- `B`：元组包裹阻断了分发，`[never]` 与 `[never]` 是相同的单元素元组，走 true 分支，结果是 **`"yes"`**。
- `C`：检查类型是 `any` 时，条件类型取两个分支的联合：**`"s" | "n"`**。

三者都通过类型检查（没有语法/约束错误）。

**题 2**：

`Keys<Api>` 用 `as` 重映射过滤：`url: string` 与 `retries: number` 的值不是 Function，映射到 `never` 被丢弃；`fetch` 与 `onDone` 的值是函数类型，键保留。结果是：

```ts
{
  fetch(): Promise<void>;
  onDone(cb: () => void): void;
}
```

`Keys<Api>["fetch"]"` 是 `() => Promise<void>`。要点：① 过滤按**值类型**走条件，键通过 `as ... : never` 丢弃；② `as` 重映射仍是同态映射，方法简写被原样复制（还是方法简写形态，而不是 `(x) => void` 属性形态）。

