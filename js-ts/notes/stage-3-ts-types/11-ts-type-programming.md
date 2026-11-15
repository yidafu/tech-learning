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

---

## 机制深一层：条件类型的求值时机与「尾递归豁免」

正文 §2 讲清了「怎么分发」，这一节补两个更工程的问题：「编译器什么时候才算」与「递归为什么有时不爆」。口径：一手 Release Notes / Handbook + 本机 tsc 5.9.3（`--strict`）实测收据，凡写「实测」的都真跑过。

**求值分两个问题：要不要分发、要不要延迟。** 拿到一个形如 `T extends U ? X : Y` 的类型时，编译器先回答「检查类型是不是裸类型参数」——是，就对联合逐成员分发；不是（比如包了一层元组的 `[T] extends [U]`），就整体判断。再回答「两侧还有没有未实例化的类型参数」——有，整个条件类型保持延迟形态原样出现在结果里；没有，就地求值成真假分支之一。两条规则叠加能解释一个高频困惑：为什么泛型函数签名里写条件类型不报错、也不「执行」——延迟形态是合法的中间状态，只有实例化（用具体类型代入 T）那一刻才真正计算。

**验证手段：故意赋错值的「探针法」。** 类型层的求值结果不会出现在运行时产物里，想看到编译器算出了什么，就把结果当注解、故意赋一个错值，让 TS2322 把求值结果原样打印出来：

```ts
type ToArray<T> = T extends any ? T[] : never;
const probe: ToArray<boolean> = '故意写错';
// error TS2322: Type 'string' is not assignable to type 'false[] | true[]'.
```

这一行实测确认了三件事：`boolean` 被拆成 `true | false` 逐一分发；每个成员各自得到 `T[]`；结果联合没有被合并回 `boolean[]`（报错信息里成员顺序显示为 `false[] | true[]`）。正文 §2.2 的结论从此可以按收据复述，而不是靠背。这个手法是后面所有「类型层收据」的基础：不装任何插件，让编译器自己把答案写进错误信息。

**尾递归豁免：递归条件类型不是一刀切 50 层。** 「递归深度约 50 层就报 TS2589」只对**非尾递归**形态成立。TS 4.1 起编译器对尾递归形态的条件类型——递归调用占据真假分支的**整个表达式**、返回时不残留任何待拼接结构——大幅放宽了实例化深度预算。两条收据的对照（都真跑过）：

```ts
// 形态一（尾递归）：实测文件里 P60 是 60 层 Promise<Promise<...Promise<1>...>>
type DeepAwait<T> = T extends Promise<infer V> ? DeepAwait<V> : T;
const ok: DeepAwait<P60> = 1; // 实测：无任何报错，60 层全部解完
```

```ts
// 形态二（非尾递归）：分支里是 [...Rev<R>, F]，先递归、再拼接
type Rev<T extends readonly unknown[]> =
  T extends readonly [infer F, ...infer R] ? [...Rev<R>, F] : [];
// 实测：对 60 个元素的元组求 Rev，立刻报
// error TS2589: Type instantiation is excessively deep and possibly infinite.
```

差别不在递归次数，而在**返回位是否残留结构**：`DeepAwait<V>` 是「结果即递归」，一层解完就走；`[...Rev<R>, F]` 是「递归完还要加工」，每层都要留一个待展开的展开运算，深度预算迅速耗尽。实测还送了一个细节：TS2589 的连带报错里能看到「算到一半」的中间形态 `[...any[], any, 0, 0, ...]`——编译器把自己卡住的现场打出来了，看它就能数出实际推进了多少层。

工程含义：写递归工具类型尽量让递归调用独占分支（`UnboxPromise`、`Flatten` 都是好形态）；必须拼接结果的（`Reverse`、`Join`、`Paths`）先估数据深度——几十层以内可用，别拿去全量展开配置树；两者混用的（递归 + 拼接 + 模板）按非尾递归的预算来算。

## 手推配方：三个高频工具类型的编号推演

以下推演都建议先用探针法写下预期，再跑 tsc 对答案；配方本身的手推过程不需要跑任何命令。

**配方 A：`OptionalKeys<T>`——找出所有可选键。** 依据：strict 下可选属性 `T[K]` 的值类型是 `X | undefined`（正文 §1.2 已证），加上 `undefined` 可赋给一切含它的类型这个单向事实。步骤：

1. 对每个键 K 问一个只有可选属性才答「是」的问题：`undefined extends T[K]` 吗？必填属性（`a: number`）答否，可选属性（`b?: string`，实际是 `string | undefined`）答是；
2. 把判定器写成条件类型：`IsOpt<K> = undefined extends T[K] ? K : never`——注意方向必须是 `undefined extends ...` 而不是反过来，原因见第 4 步；
3. 塞进 `as` 重映射：`type OptionalKeys<T> = { [K in keyof T as undefined extends T[K] ? K : never]: T[K] }`；
4. 推演 `{ a: number; b?: string }`：K = 'a' 时 `undefined extends number` 为假，键映射到 never 被丢弃；K = 'b' 时 `undefined extends string | undefined` 为真，键保留。结果 `'b'`。

第 2 步的反方向 `T[K] extends undefined` 是错的：`string | undefined extends undefined` 为假——联合类型不会「收窄成单个成员再比较」，它按整体判断。记住这个不对称：**undefined 走出去容易（可赋给一切含它的类型），联合走进来难（必须整体满足）**。

**配方 B：`IsUnion<T>`——判断 T 是不是多成员联合。** 思路：让「裸 T 分发」与「元组阻断」在同一道题里对撞。步骤：

1. 先拦空联合：`[T] extends [never] ? false : ...`（否则分发一步直接坍缩成 never，见正文 §2.3）；
2. 存一份副本 `C = T`。关键：默认类型参数 `C` 在分发时**不参与分发**，它始终保持整个联合；
3. 对裸 T 分发，每个成员问自己「`[C] extends [T]` 吗」：单成员联合里 C 就是自己，为真；多成员里 C 是整个联合而 T 只是其中一个成员，永远为假；
4. 汇总成配方：`type IsUnion<T, C = T> = [T] extends [never] ? false : T extends C ? ([C] extends [T] ? false : true) : never`；
5. 推演 `IsUnion<'a' | 'b'>`：分发两轮，每轮 `[C] extends [T]` 都是假，各得 true，联合去重得 true。推演 `IsUnion<string>`：单成员，`[string] extends [string]` 为真，得 false。

**配方 C：`CamelCase<S>`——把 `foo-bar` 改写成 `fooBar`。** 步骤：

1. 出口：S 不匹配 `` `${infer H}-${infer R}` ``（没有连字符）时原样返回；
2. 匹配一轮：H 拿第一个片段，R 拿剩余全部——模板里**末位单个 infer 吞到串尾**（下一节预测题 2 有收据）；
3. 递归处理 R，最后拼接 `` `${H}${Capitalize<Next>}` ``——注意这里有拼接，属于非尾递归形态，段数极多时留意 TS2589；
4. 推演 `'foo-bar-baz'`：第一轮 H = 'foo'、R = 'bar-baz'；第二轮 H = 'bar'、R = 'baz'；第三轮无连字符走出口。倒着拼回去得 `'fooBarBaz'`。

## 工程三陷阱：类型编程上生产线的三个翻车点

**陷阱一：用 `Record` 重述接口响应，可选字段悄悄变必有。** 触发场景：把三方返回的 DTO 手抄成 `Record<'id' | 'memo', string>`（原字段 `memo?: string`），下游把 `memo` 当必有字段用；某天上游不回 memo 字段，运行时 undefined 顺着调用链扩散。根因：`Record` 的映射约束是裸联合参数而非 `keyof T`，属于非同态映射，不复制 `?` 与 `readonly`（正文 §1.2 的判定规则），`memo` 从「可省略」变「必给」。规避：重述已有类型时保持同态形态（`` { [K in keyof DTO]: ... } ``）；确要改值类型就用映射类型，`Record` 只用来「从零造键」。这是 11、12 两册共同的高频事故源，review 遇到手抄 DTO 优先核对修饰符。

**陷阱二：模板字面量联合的笛卡尔积拖垮 IDE。** 触发场景：路由类型用模板字面量把 Locales（40 个语言）与 Pages（30 个页面）两段联合拼进路径（形如斜杠分隔的两段占位），展开即 1200 个字面量；再对每个成员叠 `Capitalize` 或映射类型，悬停与补全开始数秒级卡顿，最后有人默默删掉类型注解，防线失守。根因：模板里的联合按笛卡尔积展开，成本是各占位符联合大小之**积**；模板套模板或映射套模板还会再乘一层。规避：控制占位符联合的成员数，超过几十就降级为模式类型（占位全部写成 `string`）；拿不准就先写一个独立探针类型看它实际展开多大，再决定要不要在业务类型里展开：

```ts
type RouteProbe = `/${Locales}/${Pages}`;
// 悬停 RouteProbe 看成员数——1200 个字面量一眼见底
```

**陷阱三：工具类型的兜底分支返回 `any`，静默传染整条链。** 触发场景：对「不是函数」的类型用了 `ReturnType`——lib.es5.d.ts 里它的假分支是 `any`——拿到 any 之后所有成员访问全部放行，类型防线在那个调用点之后整体失效，而 review 时看不到任何红色。根因：内置工具类型为了兼容老代码，兜底分支选了 `any` 而不是 `never`；`Parameters` 的兜底同理是 `any[]`。规避：给泛型参数收紧约束（`F extends (...args: any[]) => unknown`），让「不是函数」的误用直接变成 TS2344 编译错误；或自写兜底为 `never` 的版本，让误用至少炸在使用点。看到 `ReturnType<typeof 某常量>` 而那个常量不是函数，直接当 bug 处理。

## 排查速查表：类型编程高频错误码（本机实测口径）

前四条错误码均在 tsc 5.9.3 `--strict` 下实测复现（命令：`node_modules/.bin/tsc --strict --noEmit --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom 临时文件`）；后两行是无错误码的行为差异，用探针法定位：

| 错误码与关键信息 | 典型触发 | 根因 | 处置 |
| --- | --- | --- | --- |
| TS2456 `Type alias 'A' circularly references itself` | `type A = A` 或别名顶层直接自引用 | 自引用没经过对象属性/函数参数等间接层 | 把自引用挪进属性位（树形结构天然合法） |
| TS2344 `Type 'K' does not satisfy the constraint 'string'` | 映射里直接 `` Capitalize<K> `` | `keyof T` 含 number/symbol 键 | 约束处或使用处加 `& string` |
| TS2536 `Type 'K' cannot be used to index type 'T'` | 泛型 `T[K]` 而 K 无约束 | 索引类型没被 `keyof T` 约束 | 给 K 写 `extends keyof T` |
| TS2589 `excessively deep and possibly infinite` | 拼接式递归处理长元组 | 非尾递归耗尽实例化深度（尾递归有豁免） | 改尾递归形态、加出口、砍数据深度 |
| （无错误码）分发结果与预期不符 | `ToArray<boolean>` 得 `true[] \| false[]` | 裸类型参数加联合触发分发 | 探针法读真实结果；要整体判断就 `[T] extends [U]` |
| （无错误码）拿到 any 而非报错 | 对非函数用 `ReturnType` | 内置工具类型兜底分支是 `any` | 收紧泛型约束让误用变 TS2344 |

排查口令：先探针（读出真实求值结果），再对照「分发 / 同态 / 尾递归」三个关键词定位规则，最后才允许怀疑编译器——绝大多数「TS 算错了」，是自己没按这三条规则写。

## code review 检查单：类型编程相关评审 8 条

- [ ] 手抄三方 DTO 时用的是同态映射形态（`keyof T`），不是 `Record<键联合, 值>`？后者会抹掉可选与只读修饰符。
- [ ] 条件类型的检查类型若是裸类型参数，写注释声明「这里会按联合分发」了吗？boolean / never / any 三个特例有人推演过吗？
- [ ] 递归类型有明确出口吗？递归调用独占分支（尾递归）还是带拼接（非尾递归）？后者处理的数据深度有上界吗？
- [ ] `infer` 出现多次时，候选位置是同为协变或同为逆变吗？混用时结果与直觉不符的风险评估过吗？
- [ ] 模板字面量里的联合占位符成员数可控吗（两位数以内）？有没有先用独立探针看过展开规模？
- [ ] 自写工具类型的兜底分支是 `never` / 抛 TS2344 约束，而不是 `any`？调用点误用会立刻编译失败吗？
- [ ] 泛型索引 `T[K]` 的 K 有 `extends keyof T` 约束吗？`keyof T & string` 这类收窄写在与字符串工具类型交接的地方了吗？
- [ ] 探针法（故意赋错值读 TS2322）验证过核心工具类型的求值结果吗？验证代码有没有留在测试或注释里供后人复跑？

## 输出预测题（进阶）

先写答案，再用探针法跑 tsc 对照——三题全部实测过，收据见答案。

**题 1**：

```ts
type Cond<T> = T extends string ? 's' : 'n';
type P1 = Cond<boolean>;
type P2 = Cond<any>;
type P3 = [never] extends [never] ? 'yes' : 'no';
```

**题 2**：

```ts
type Drop<S extends string> = S extends `api/${infer R}` ? Drop<R> : S;
type D1 = Drop<'api/v1/users'>;
type D2 = Drop<'api/api/x'>;
type D3 = Drop<'web/users'>;
```

**题 3**：

```ts
type Last<T extends readonly unknown[]> =
  T extends readonly [...unknown[], infer L] ? L : never;
type L1 = Last<[1, 2, 3]>;
type L2 = Last<[]>;
type L3 = Last<number[]>;
```

## 进阶预测题答案

**题 1**：P1 = `"n"`。`boolean` 分发成 `true | false`，两个成员都不是 string，各得 `"n"`，联合去重后只剩 `"n"`——「分支不含 T 时拆分不可见」的实测形态（收据：探针报 `Type '"x"' is not assignable to type '"n"'`）。P2 = `"s" | "n"`：检查类型为 `any` 时条件类型取两分支之并（收据：`not assignable to type '"s" | "n"'`）。P3 = `"yes"`：元组阻断分发，`[never]` 与 `[never]` 是同构的单元素元组，走真分支（收据：`not assignable to type '"yes"'`——探针只塞了单字符串，能确定结果不是并集）。

**题 2**：D1 = `"v1/users"`。模板匹配中**末位单个 infer 只吞一次匹配**：第一轮 R = `"v1/users"`，递归后这个串不再有 `api/` 前缀，递归终止——所以这个类型每层只剥一层前缀，不是全剥（收据：`not assignable to type '"v1/users"'`）。D2 = `"x"`：第一轮剥成 `"api/x"`，它仍匹配前缀，第二轮剥到 `"x"`（收据：在 `D2` 处赋 `'x'` 不报错，证明结果恰为 `"x"`）。D3 = `"web/users"`：前缀不匹配走假分支，原样返回。

**题 3**：L1 = `3`；L2 = `never`——空元组连「末位恰好一个元素」都凑不出，匹配失败走 never 分支；L3 = `never`，这是本组最有价值的收据：`[...unknown[], infer L]` 这个模式要求「前面若干个 + 确定的一个末位」，而无界数组 `number[]` 没有确定的末位元素，整体匹配失败。想对数组求「最后一个元素的类型」不能直接套这个配方，得先分流（`T extends readonly unknown[]`）或退而求其次用 `T[number]` 拿元素联合。

---

## 规范原文对照：类型编程三处一手原文与解读

三句原文均取自 TS Handbook 第二版对应页面，解读结合本册收据。读原文的方法：先记结论，再回原文对**限定词**——每句原文里的限定词都对应一条行为边界，漏掉限定词的复述迟早翻车。

**原文一（映射修饰符）。** Handbook《Mapped Types》：

> "There are two additional modifiers which can be applied during mapping: `readonly` and `?` which affect mutability and optionality respectively. You can remove or add these modifiers by prefixing with `-` or `+`. If you don't add a prefix, then `+` is assumed."

解读：三句话说了三件事。其一，映射类型里你能动的修饰符只有 `readonly` 与 `?` 两种；其二，加减号是算术（正文 §1.3 的 `-readonly`、`-?` 由此而来）；其三，**不加前缀默认是加号**。最容易误读的是第三点与同态复制的关系：`{ [K in keyof T]: T[K] }` 里一个符号都没写，`readonly` 之所以保留，靠的是同态复制机制而非「默认加号」——默认加号只会作用在你显式写了符号的修饰符上。原文一没有展开同态判定规则，那部分Handbook 用示例讲行为，判定条件靠实测补齐（正文 §1.2 的三条判定）。同页对 `as` 重映射的原话是 "You can filter out keys by producing `never` via a conditional type"——「过滤键」的规范表述就是「把键映射到 never」，与正文 §1.4 完全一致。

**原文二（分发）。** Handbook《Conditional Types》：

> "When conditional types act on a generic type, they become distributive when given a union type."

解读：限定词是 "act on a generic type"——分发的前提是检查类型为**裸类型参数**，与正文 §2.2 的「裸」一一对应；探针收据（`ToArray<boolean>` 求值结果 `true[] | false[]`）就是这句原文的实例化：`boolean` 在类型系统里本就是 `true | false` 的别名，落进分发规则自然被拆开。同页还有一句常被忽略的：

> "When inferring from a type with multiple call signatures (such as the type of an overloaded function), inferences are made from the last signature (which, presumably, is the most permissive catch-all case)."

解读：对重载函数做 `infer`，取的是**最后一条签名**——意味着 `Parameters<typeof 重载函数>` 只描述最后一个签名，前面几条对它不可见。工程上遇到「Parameters 推出来的参数表不对」，第一步先查目标是不是重载函数；是的话改用手写联合，或用括号断言挑具体签名，别指望编译器替你做重载消解（原文括号里那句 "It is not possible to perform overload resolution based on a list of argument types" 就是官方拒绝的理由）。

**原文三（模板联合展开）。** Handbook《Template Literal Types》：

> "When a union is used in the interpolated position, the type is the set of every possible string literal that could be represented by each union member."

以及：

> "For each interpolated position in the template literal, the unions are cross multiplied."

解读：两句合起来就是「笛卡尔积」的规范表述，也是工程三陷阱之二的原文依据——成本公式「各占位符联合大小之积」不是经验之谈，是规范原文的直译。`${string}`、`${number}` 这类模式占位符在同一页有专门小节，作用是把精确集合降级为模式；陷阱二里给的降级方案（写成 `/${string}/${string}`）正是用回这一节的原始能力，而不是什么新特性。

**附带一条 TS 4.7 收据：`infer` 约束。** TS 4.7 Release Notes 的 "extends Constraints on infer Type Variables" 小节允许在推断的同时给推断变量加约束，推断结果会再与约束求交。实测（tsc 5.9.3）：

```ts
type Wrap<S extends string> = S extends `id-${infer N extends number}` ? N : never;
const w: Wrap<'id-42'> = 'x';
// error TS2322: Type '"x"' is not assignable to type '42'.
```

模板匹配 + 数字约束的组合，直接从字符串里解出了字面量 `42`。「解析路由段」「解析 id 后缀」这类工具类型的官方形态就是它；在 TS 4.7 之前要绕两步（先 `${infer S}` 拿字符串再转数字），4.7 起一行到位。同一版还有 "Control-Flow Analysis for Bracketed Element Access"（元素访问收窄，09 册进阶部分引用了它的实测边界）与 "Optional Variance Annotations for Type Parameters"（`in`/`out` 方差标注，13 册进阶部分讨论）两个小节，三处都在同一份发布说明里，可顺路读。

---

## 补充配方：`PartialBy` 与「类型 / 运行时双账本」纪律

**配方 D：`PartialBy<T, K>`——只把指定的键变可选。** 目标形态：`type PartialBy<T, K extends keyof T> = { [P in K]?: T[P] } & Omit<T, K>`。步骤：

1. 第一半 `{ [P in K]?: T[P] }` 对键联合 K 逐个映射并显式叠加问号。按 §1.2 判定规则的第二条（映射约束是类型参数、且约束为 keyof T），这一半是同态映射——原属性的 `readonly` 会被复制，结果是「只读且可选」；
2. 第二半 `Omit<T, K>` 负责剩余键。Omit 是否也保留修饰符？先猜再验证：实测探针（tsc 5.9.3）对 `Omit<{ readonly id: number; memo?: string; note: string }, 'note'>` 做两问——`obj.id = 5` 报 TS2540（`Cannot assign to 'id' because it is a read-only property`），证明 readonly 保留；`const q: number = obj.memo` 报 `Type 'string | undefined' is not assignable to type 'number'`，证明可选性保留。所以 Omit（经由 Pick）同样是同态映射，答案：保留；
3. 两半用交叉类型拼接。交叉里同键冲突会被收窄为交集，这里两半键集合互斥（一半是 K、一半是排除 K 的余集），不产生冲突；
4. 推演 `PartialBy<{ id: number; memo?: string; note: string }, 'note'>`：note 从必有变可选，id 与 memo 原样（含各自修饰符），结果 `{ id: number; memo?: string; note?: string }`。

**「双账本」纪律：类型层与运行时各记一本账，漂移即事故。** 正文 §4.3 的 `on()` 示例其实藏着一条工程纪律：类型层用 `Capitalize<E>` 造出 `onClick` 这个键名，运行时用 `event[0].toUpperCase() + event.slice(1)` 造出**同一个**键名——两本账各记一份「同样的转换」。风险在于：任何一边单独改规则（比如运行时改成小写前缀），另一边不会跟着变——类型继续声称 `onClick` 存在，运行时的键却换了名字，调用点静默拿到 undefined，连编译警告都不会有。规避三选一：转换逻辑只在一处实现、另一处靠测试锁死；让类型层直接从运行时常量表推导（`const EVENTS = ['click', 'focus'] as const` 配 `typeof EVENTS[number]`），消灭手写的第二本账；或干脆用声明合并把运行时表注册进类型（`declare const` + `typeof`）。code review 时看到「类型层字符串转换 + 运行时字符串转换」同时出现，标准动作就是问一句：这两本账谁对齐谁，拿什么对齐。类型编程的价值在于让第一本账自动生成，而不是让人多抄一本。

## 收尾自测（增补）

1. 同态映射的判定条件是哪三条？`Omit` 为什么保留修饰符而 `Record` 不保留？——前者映射约束落在 keyof 链上（`Pick` 的 K 约束为 keyof T，Omit 经由 Pick 继承同态性），后者约束与任何 `keyof T` 无关；实测探针见「补充配方」第 2 步的两问收据。
2. `[T] extends [U]` 阻断的到底是什么？——阻断的是「检查类型为裸类型参数时的联合分发」，不是可赋值性判断本身；进阶预测题 1 的 P3 演示了元组包裹后 `[never]` 以整体身份参与判断。
3. 递归工具类型在什么形态下享有深度豁免？判据是「返回位是否残留待拼接结构」，请各举一个豁免形态（`DeepAwait`）与不豁免形态（`Rev`），并说出各自适用的数据深度量级。
4. 探针法完整口诀：求值结果 → 故意赋错值 → 读 TS2322 → 把结果写进注释或测试。为什么不能用 `console.log` 打印类型层的求值结果？——类型在编译后全部擦除，运行时没有任何对应物，这是本册全部结论的公共前提，也是「环境声明不产生值」（14 册）的同源事实。

