---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
---
# 10 · TypeScript 泛型深入

> 对应大纲：阶段 3.2「泛型深入：泛型约束、默认值、泛型类与函数」
> 配套练习：`exercises/ts-generics/01-generic-functions.ts` ~ `03-generic-classes.ts`
> 前置：`notes/stage-3-ts-types/09-ts-narrowing.md`（谓词、可辨识联合会在这里复用）

## 学习目标

1. 说清泛型的动机：**保留类型之间的关系**——`any` 丢关系、联合类型关系过宽，泛型是「类型的参数」
2. 在函数 / 接口 / 类型别名 / 类四个位置声明类型参数，并知道类型参数从哪里推断、什么时候必须显式传
3. 掌握 `extends` 约束的语义（上界）：`K extends keyof T`、`T extends string | number`、多重约束 `T extends A & B`
4. 会用默认类型参数 `T = Default` 设计「不传也安全」的 API 包装器
5. 解释泛型类的一个关键限制：静态成员不能引用类级类型参数，以及它背后的运行时原因
6. 用运行时证据证明泛型是编译期的（类型擦除）

## 关键概念

### 1. 动机：保留类型关系 vs any vs 联合

一手依据：TS Handbook《Generics》开篇（"Hello World of Generics"）与《Functions》的 Generics 小节。

写一个 `first(xs)`，三种方案对比：

```ts live noInline
// 方案 A：any —— 编译通过、关系丢失
function firstAny(xs: any[]): any { return xs[0]; }
const s: string = firstAny([1, 2]); // 不报错！number 被静默当 string，运行时才暴露

// 方案 B：联合 —— 类型安全但关系过宽
function firstUnion(xs: (string | number)[]): string | number { return xs[0]; }
const s2: string = firstUnion(['a', 1]); // 报错：返回 string | number，收不窄

// 方案 C：泛型 —— 关系保留
function first<T>(xs: readonly T[]): T { return xs[0]; }
const n: number = first([1, 2]);      // T = number，返回 number
const str: string = first(['a', 'b']); // T = string，返回 string
```

- `any` 的问题是**双向豁免**：任何值能赋给它、它能赋给任何类型——输入输出的关系彻底断掉
- 联合类型的问题是**表达不了「元素类型 = 返回类型」这种约束**：`(string | number)[]` 进、`string | number` 出，合法调用也被拦
- 泛型 = **类型的参数**：调用时由实参决定 `T` 是什么，函数体一次编写、每个调用点各自获得精确类型。值有参数（形参实参），类型也有参数（类型参数/类型实参）——这组对应关系是理解泛型的最短路径

### 2. 四个声明位置与推断

一手依据：Handbook《Generics》（函数/接口）、《More on Functions》（推断细节）、《Classes》（Generic Classes）。

```ts live noInline
// 函数
function identity<T>(value: T): T { return value; }

// 接口（函数类型的泛型接口）
interface Comparator<T> {
  compare(a: T, b: T): number;
}

// 类型别名
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// 类
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
}
```

**推断位置（T 从哪来）**：

- 主推断点：**实参类型**。`first([1, 2])` 的 `T` 从 `[1, 2]` 推断为 `number`；`prop(person, 'name')` 的 `K` 从 `'name'` 推断为 `'name'` 字面量
- 多个实参给同一个 T 时，**第一个实参胜出，其余必须能赋给它**：`pair(1, 'a')`（`function pair<T>(a: T, b: T)`）里 `T = number`，第二个实参 `'a'` 直接报 `Argument of type 'string' is not assignable to parameter of type 'number'`——想要「宽进」就把签名写成 `<T>(xs: readonly T[])` 让数组元素当候选（此时元素间取联合，`first([1, 'a'])` 得 `T = string | number`）
- **无推断点时回落默认值或显式传参**：`new Stack<number>()`（构造无实参可推）、`ApiResponse` 不写参数（用默认 `unknown`）、`makePair<string>()`。返回位置使用类型参数（如 `function f<T>(): T`）会逼调用方显式传参——这种签名通常值得重构
- 显式传参语法：函数 `fn<string>(x)`、构造 `new Stack<number>()`、类型 `Result<number, string>`

一次完整的推断走读（`prop(person, 'name')`）：

```ts live noInline
function prop<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const person = { name: 'Yidafu', age: 30 };

prop(person, 'name');
// 1) T 从 obj 推断为 { name: string; age: number }
// 2) keyof T = 'name' | 'age'（K 的上界）
// 3) K 从 key 推断为字面量 'name'
// 4) 返回类型 T[K] 代入得 T['name'] = string
// 全程无显式传参——推断链条上的每一步都能说出口，才算懂
```

### 3. extends 约束：约束的是「上界」

一手依据：Handbook《Generics》Generic Constraints 一节（`longest` 的原型示例即出自此处）。

```ts live noInline
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```

- 语义读法：`T extends U` = 「T 是 U 的**子类型或等于 U**」，即 U 是 T 能取到的**最宽上界**。调用方传的 T 可以比 U 多东西（数组有 `length` 还有 `push`），但函数体内对 T 的全部知识**止步于 U**——`a.push(1)` 在体内报 `Property 'push' does not exist on type 'T'`（练习 02 的证据）
- 约束同时对**调用方**生效：`longest(10, 20)` 报 `Argument of type 'number' is not assignable to parameter of type '{ length: number; }'`
- 三种常用约束：

```ts live noInline
// a. keyof 约束：K 只能是 T 的键，返回 T[K] 与 K 联动
function prop<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
// prop(person, 'nickname') 报：Argument of type '"nickname"' is not assignable
//   to parameter of type '"age" | "name"'

// b. 基础类型上界：把 T 限定在一族原始类型内
function join<T extends string | number>(xs: readonly T[]): string {
  return xs.map(String).join(',');
}

// c. 多重约束：一个 extends + 交集（旧语法 <T extends A, T extends B> 非法）
interface Serializable { serialize(): string }
interface Timestamped { createdAt: number }
function snapshot<T extends Serializable & Timestamped>(x: T): string {
  return `${x.createdAt} → ${x.serialize()}`;
}
```

- **约束与收窄的关系**：约束是「声明处」对类型参数的静态承诺，窄化是「使用处」对流经值的动态推理；`K extends keyof T` 让编译器把「key 合法」变成调用点检查，把「返回类型正确」变成 `T[K]` 的自动计算——这是泛型与索引类型配合最频繁的模式
- 约束宽窄的取舍：
  - 约束太窄（`T extends string[]`）→ 复用性差，等于没泛型；宁可 `{ length: number }` 这类「最小结构需求」
  - 约束太宽（不写约束）→ 函数体内只能把 T 当 unknown 用，调用方也失去「必须满足什么」的提示
  - 经验法则：**函数体里用到什么成员，就只约束什么成员**（needs-based constraint）

### 4. 默认类型参数 `T = Default`

一手依据：TS 2.3 发布说明《Generic Parameter Defaults》。

```ts live noInline
interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

const health: ApiResponse = { status: 200, data: 'ok' }; // data: unknown
const user: ApiResponse<{ id: number }> = { status: 200, data: { id: 1 } };
```

- 使用场景（API 包装器）：库作者给「类型未知」的调用一个安全默认值。默认 `unknown` 而不是 `any`——忘收窄时被编译器拦下，而不是静默放行
- 默认值可以引用前面的参数：`type ElementOf<T, U = T[number]> = U`；也可以和约束组合：`<T extends object = Record<string, unknown>>`
- 函数参数同理：`firstOrDefault<T, D = null>` 里 `D` 没有推断点（没传 def）时回落 `null`，返回类型自然成为 `T | null`（练习 01 展示了教科书签名 `def?: D` 的 `D | undefined` 坑与重载解法）
- 注意：默认值只在「无推断点」时生效——传了实参就按实参推断

### 5. 泛型类：类型参数绑定到实例类型

一手依据：Handbook《Classes》Generic Classes 一节；错误码 TS2302（Static members cannot reference class type parameters）。

- `Stack<T>` 的 T 出现在**实例一侧**：字段 `items: T[]`、方法签名 `push(item: T)`。`Stack<number>` 和 `Stack<string>` 是两个**不同的实例类型**（含私有成员时按名义比较，互赋直接报错，见练习 03）
- **静态成员不能引用类级类型参数**，报错原文（错误码 TS2302）：

  ```
  Static members cannot reference class type parameters.
  ```

  原因（要能讲清，不是背结论）：`class` 语法在运行时产生「一个构造函数 + 一个 prototype」。静态成员挂在**构造函数一侧**，实例成员挂在 prototype 上；类型参数 `T` 只在实例类型 `Stack<T>` 中生效——而运行时 `Stack<number>` 与 `Stack<string>` **共用同一个构造函数**，静态一侧根本没有「每个 T 一个版本」的载体。TS 禁止它，是在阻止一个运行时无法兑现的承诺
- 两个正确替代：
  - 静态方法声明**自己的**类型参数：`static from<U>(items: readonly U[]): Stack<U>`（泛型工厂，练习 03 采用）
  - 或把类型参数放到方法级 / 改用普通函数

### 6. 常见模式速查

```ts live noInline
// a. Response<T> 包装：API 响应的信封
type Response<T> = { status: number; data: T; error?: string };

// b. Validator<T>：校验器 + 类型谓词（与笔记 09 联动）
interface Validator<T> {
  validate(value: unknown): value is T; // 校验通过即完成 unknown -> T 的收窄
}
const isString: Validator<string> = {
  validate: (v): v is string => typeof v === 'string',
};

// c. keyof 约束的 get / pick：编译期保证 key 合法、返回类型精确
function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
function pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}

// d. 泛型工厂与 mixin 签名（一句话）：mixin 场景用「构造器类型」承载泛型——
//    type Constructor<T> = new (...args: any[]) => T;
//    用它接收基类、返回带新成员的类（大纲阶段 5 设计模式专题再展开）
```

### 7. 泛型是编译期的：类型擦除

一手依据：TS Handbook《TypeScript for JavaScript Programmers》("TypeScript erases types")——类型信息只用于编译期检查，产物是纯 JS。

运行时证据（练习 03 的完整输出）：

```ts
const s1 = new Stack<number>();
const s2 = new Stack<string>();
console.log(s1.constructor === s2.constructor); // true：运行时只有一个 Stack
console.log(Stack.name);                         // 'Stack'：类型参数无处可寻
console.log(typeof Stack);                       // 'function'：class 本体是构造函数
console.log(Object.getOwnPropertyNames(s1));     // ['items']：实例上只有运行时字段

const v: Stack<number> | string = s1;
console.log(typeof v); // 'object'：声明里的 Stack<number> 在运行时只剩 'object'
```

推论（面试高频）：

- **不能用 `typeof x === 'Stack<number>'` 这类判断**——`typeof` 只看得到运行时值（'object'/'function'/...）；要判类型只能走 `instanceof`（查原型链，且跨 realm 失效，见笔记 09）
- 泛型类没有「每类型一份」的运行时结构，`Stack<number> !== Stack<string>` 是**类型层面**的不同，运行时同一构造函数
- 类型参数不能用在 `typeof T`、`new T()`（例外：传构造器 `new (…)=>T` 的值进来）等需要运行时值的位置

类型参数是「类型」，不是「值」——需要运行时载体时把值传进来：

```ts live noInline
// 错误直觉：new T() —— T 编译后就没了，运行时没有对应构造函数
// 正确做法：把构造器作为值传入，类型用 new () => T 表达
function create<T>(C: new () => T): T {
  return new C();
}

class Point {
  constructor(public x = 0, public y = 0) {}
}
const p = create(Point); // T 推断为 Point（从构造器值推断，不是凭空）
```

## 可运行示例

| 文件 | 覆盖 | 关键证据 |
| --- | --- | --- |
| `exercises/ts-generics/01-generic-functions.ts` | identity / any / 联合对照 / firstOrDefault / keyof prop-pick | `any` 版编译通过但 `leaked.length => undefined`；`r1` 类型 `number \| null` |
| `exercises/ts-generics/02-constraints-and-defaults.ts` | 上界 / 多重约束 / 默认参数 | 体内 `Property 'push' does not exist on type 'T'`；`unknown` 默认值拦下未收窄使用 |
| `exercises/ts-generics/03-generic-classes.ts` | Stack/Queue / 静态限制 / 擦除 | `Static members cannot reference class type parameters.(2302)`；擦除五连输出 |

```bash
npx tsx exercises/ts-generics/01-generic-functions.ts
npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom exercises/ts-generics/01-generic-functions.ts
```

> tsc ≥ 7 指定单文件且 cwd 有 `tsconfig.json` 时报 TS5112，需 `--ignoreConfig`（tsc 5.x 不需要）。

## 易错点与面试高频

1. **「为什么用泛型不用 any」**：any 丢关系（双向豁免）、联合过宽（表达不了元素-返回的绑定）；泛型让每个调用点各自精确
2. 推断规则：多实参同一 T 时第一个胜出、其余必须兼容；数组元素候选取联合；无推断点回落默认值或显式传参
3. `extends` 是上界不是「等于」：体内只能用上界成员；调用方必须满足上界——两个方向都要能说
4. `K extends keyof T` 的价值：key 合法性 + 返回类型 `T[K]` 一起解决（写 `get/pick` 的标配）
5. 多重约束只能写 `T extends A & B`；`<T extends A, T extends B>` 是非法语法
6. 默认类型参数给 `unknown` 而不是 `any`（安全默认）；默认只在无推断点时生效
7. 静态成员引用类级类型参数报 TS2302——用一句话讲清「静态在构造器一侧、T 在实例一侧、运行时共用构造函数」
8. 泛型完全擦除：运行时没有 `Stack<number>`，`typeof` 看不见类型参数，判类型走 instanceof（有跨 realm 限制）
9. `def?: D` 的参数类型实际是 `D | undefined`，想表达「不传时默认」常需重载配合（练习 01 的 firstOrDefault）

## 输出预测题

先自己写出答案，再运行验证（不许先看文末答案）。

**题 1**：判断编译与推断结果。

```ts live noInline
function pair<T>(a: T, b: T): [T, T] {
  return [a, b];
}
const p1 = pair(1, 'a');
const p2 = pair([1, 'a'], [2]);
const n: number = p2[0][0];
```

1. `const p1 = pair(1, 'a')` 编译能不能过？`T` 被推断成什么？
2. `p2` 的 `T` 被推断成什么？`const n: number = p2[0][0]` 报不报错？

**题 2**：擦除与静态限制。

```ts live noInline
class Box<T> {
  value?: T;
  static make(x: T): T { return x; }   // ← A 行
}
const a = new Box<number>();
const b = new Box<string>();
console.log(a.constructor === b.constructor);
console.log(typeof Box);
```

1. A 行 tsc 报不报错？报错原文是什么？为什么？
2. 两行 console.log 输出什么？

## 预测题答案

**题 1**

1. 编译不过。`T` 从**第一个实参**推断为 `number`，第二个实参 `'a'` 不能赋给 `number`，报 `Argument of type 'string' is not assignable to parameter of type 'number'`
2. `T` 推断为 `(string | number)[]`：第一个实参 `[1, 'a']` 的元素候选取联合、数组化；第二个实参 `[2]` 是 `number[]`，可赋给 `(string | number)[]` 所以兼容。`p2[0][0]` 是 `string | number`，赋给 `number` 报 `Type 'string | number' is not assignable to type 'number'`

**题 2**

1. 报错，原文：`Static members cannot reference class type parameters.(2302)`。原因：静态成员挂在构造函数（类）一侧，而 `T` 只在实例类型 `Box<T>` 一侧生效；运行时 `Box<number>` 与 `Box<string>` 共用同一个构造函数，静态一侧没有「按 T 分版本」的载体。改法：`static make<U>(x: U): U { return x; }`（方法自己的类型参数）
2. 输出 `true` 和 `function`：泛型被擦除，运行时只有一个 Box 构造函数；`class` 本体就是（构造）函数

## 延伸阅读

- TS Handbook · Generics（一手主线）：[https://www.typescriptlang.org/docs/handbook/generics.html](https://www.typescriptlang.org/docs/handbook/generics.html)
- TS Handbook · Functions（函数泛型与推断背景）：[https://www.typescriptlang.org/docs/handbook/functions.html](https://www.typescriptlang.org/docs/handbook/functions.html)
- TS Handbook · Classes（Generic Classes 与静态成员）：[https://www.typescriptlang.org/docs/handbook/classes.html](https://www.typescriptlang.org/docs/handbook/classes.html)
- TS 2.3 发布说明 · Generic Parameter Defaults：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html)
- TS Handbook · keyof 与索引类型（`K extends keyof T` 的语境）：[https://www.typescriptlang.org/docs/handbook/2/keyof-types.html](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- 上一笔记：`notes/stage-3-ts-types/09-ts-narrowing.md`；下一笔记：类型编程（映射类型 / 条件类型，大纲阶段 3.3）

# 10 · TypeScript 泛型深入

> 对应大纲：阶段 3.2「泛型深入：泛型约束、默认值、泛型类与函数」
> 配套练习：`exercises/ts-generics/01-generic-functions.ts` ~ `03-generic-classes.ts`
> 前置：`notes/stage-3-ts-types/09-ts-narrowing.md`（谓词、可辨识联合会在这里复用）

## 学习目标

1. 说清泛型的动机：**保留类型之间的关系**——`any` 丢关系、联合类型关系过宽，泛型是「类型的参数」
2. 在函数 / 接口 / 类型别名 / 类四个位置声明类型参数，并知道类型参数从哪里推断、什么时候必须显式传
3. 掌握 `extends` 约束的语义（上界）：`K extends keyof T`、`T extends string | number`、多重约束 `T extends A & B`
4. 会用默认类型参数 `T = Default` 设计「不传也安全」的 API 包装器
5. 解释泛型类的一个关键限制：静态成员不能引用类级类型参数，以及它背后的运行时原因
6. 用运行时证据证明泛型是编译期的（类型擦除）

## 关键概念

### 1. 动机：保留类型关系 vs any vs 联合

一手依据：TS Handbook《Generics》开篇（"Hello World of Generics"）与《Functions》的 Generics 小节。

写一个 `first(xs)`，三种方案对比：

```ts live noInline
// 方案 A：any —— 编译通过、关系丢失
function firstAny(xs: any[]): any { return xs[0]; }
const s: string = firstAny([1, 2]); // 不报错！number 被静默当 string，运行时才暴露

// 方案 B：联合 —— 类型安全但关系过宽
function firstUnion(xs: (string | number)[]): string | number { return xs[0]; }
const s2: string = firstUnion(['a', 1]); // 报错：返回 string | number，收不窄

// 方案 C：泛型 —— 关系保留
function first<T>(xs: readonly T[]): T { return xs[0]; }
const n: number = first([1, 2]);      // T = number，返回 number
const str: string = first(['a', 'b']); // T = string，返回 string
```

- `any` 的问题是**双向豁免**：任何值能赋给它、它能赋给任何类型——输入输出的关系彻底断掉
- 联合类型的问题是**表达不了「元素类型 = 返回类型」这种约束**：`(string | number)[]` 进、`string | number` 出，合法调用也被拦
- 泛型 = **类型的参数**：调用时由实参决定 `T` 是什么，函数体一次编写、每个调用点各自获得精确类型。值有参数（形参实参），类型也有参数（类型参数/类型实参）——这组对应关系是理解泛型的最短路径

### 2. 四个声明位置与推断

一手依据：Handbook《Generics》（函数/接口）、《More on Functions》（推断细节）、《Classes》（Generic Classes）。

```ts live noInline
// 函数
function identity<T>(value: T): T { return value; }

// 接口（函数类型的泛型接口）
interface Comparator<T> {
  compare(a: T, b: T): number;
}

// 类型别名
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// 类
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
}
```

**推断位置（T 从哪来）**：

- 主推断点：**实参类型**。`first([1, 2])` 的 `T` 从 `[1, 2]` 推断为 `number`；`prop(person, 'name')` 的 `K` 从 `'name'` 推断为 `'name'` 字面量
- 多个实参给同一个 T 时，**第一个实参胜出，其余必须能赋给它**：`pair(1, 'a')`（`function pair<T>(a: T, b: T)`）里 `T = number`，第二个实参 `'a'` 直接报 `Argument of type 'string' is not assignable to parameter of type 'number'`——想要「宽进」就把签名写成 `<T>(xs: readonly T[])` 让数组元素当候选（此时元素间取联合，`first([1, 'a'])` 得 `T = string | number`）
- **无推断点时回落默认值或显式传参**：`new Stack<number>()`（构造无实参可推）、`ApiResponse` 不写参数（用默认 `unknown`）、`makePair<string>()`。返回位置使用类型参数（如 `function f<T>(): T`）会逼调用方显式传参——这种签名通常值得重构
- 显式传参语法：函数 `fn<string>(x)`、构造 `new Stack<number>()`、类型 `Result<number, string>`

一次完整的推断走读（`prop(person, 'name')`）：

```ts live noInline
function prop<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const person = { name: 'Yidafu', age: 30 };

prop(person, 'name');
// 1) T 从 obj 推断为 { name: string; age: number }
// 2) keyof T = 'name' | 'age'（K 的上界）
// 3) K 从 key 推断为字面量 'name'
// 4) 返回类型 T[K] 代入得 T['name'] = string
// 全程无显式传参——推断链条上的每一步都能说出口，才算懂
```

### 3. extends 约束：约束的是「上界」

一手依据：Handbook《Generics》Generic Constraints 一节（`longest` 的原型示例即出自此处）。

```ts live noInline
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
```

- 语义读法：`T extends U` = 「T 是 U 的**子类型或等于 U**」，即 U 是 T 能取到的**最宽上界**。调用方传的 T 可以比 U 多东西（数组有 `length` 还有 `push`），但函数体内对 T 的全部知识**止步于 U**——`a.push(1)` 在体内报 `Property 'push' does not exist on type 'T'`（练习 02 的证据）
- 约束同时对**调用方**生效：`longest(10, 20)` 报 `Argument of type 'number' is not assignable to parameter of type '{ length: number; }'`
- 三种常用约束：

```ts live noInline
// a. keyof 约束：K 只能是 T 的键，返回 T[K] 与 K 联动
function prop<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
// prop(person, 'nickname') 报：Argument of type '"nickname"' is not assignable
//   to parameter of type '"age" | "name"'

// b. 基础类型上界：把 T 限定在一族原始类型内
function join<T extends string | number>(xs: readonly T[]): string {
  return xs.map(String).join(',');
}

// c. 多重约束：一个 extends + 交集（旧语法 <T extends A, T extends B> 非法）
interface Serializable { serialize(): string }
interface Timestamped { createdAt: number }
function snapshot<T extends Serializable & Timestamped>(x: T): string {
  return `${x.createdAt} → ${x.serialize()}`;
}
```

- **约束与收窄的关系**：约束是「声明处」对类型参数的静态承诺，窄化是「使用处」对流经值的动态推理；`K extends keyof T` 让编译器把「key 合法」变成调用点检查，把「返回类型正确」变成 `T[K]` 的自动计算——这是泛型与索引类型配合最频繁的模式
- 约束宽窄的取舍：
  - 约束太窄（`T extends string[]`）→ 复用性差，等于没泛型；宁可 `{ length: number }` 这类「最小结构需求」
  - 约束太宽（不写约束）→ 函数体内只能把 T 当 unknown 用，调用方也失去「必须满足什么」的提示
  - 经验法则：**函数体里用到什么成员，就只约束什么成员**（needs-based constraint）

### 4. 默认类型参数 `T = Default`

一手依据：TS 2.3 发布说明《Generic Parameter Defaults》。

```ts live noInline
interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

const health: ApiResponse = { status: 200, data: 'ok' }; // data: unknown
const user: ApiResponse<{ id: number }> = { status: 200, data: { id: 1 } };
```

- 使用场景（API 包装器）：库作者给「类型未知」的调用一个安全默认值。默认 `unknown` 而不是 `any`——忘收窄时被编译器拦下，而不是静默放行
- 默认值可以引用前面的参数：`type ElementOf<T, U = T[number]> = U`；也可以和约束组合：`<T extends object = Record<string, unknown>>`
- 函数参数同理：`firstOrDefault<T, D = null>` 里 `D` 没有推断点（没传 def）时回落 `null`，返回类型自然成为 `T | null`（练习 01 展示了教科书签名 `def?: D` 的 `D | undefined` 坑与重载解法）
- 注意：默认值只在「无推断点」时生效——传了实参就按实参推断

### 5. 泛型类：类型参数绑定到实例类型

一手依据：Handbook《Classes》Generic Classes 一节；错误码 TS2302（Static members cannot reference class type parameters）。

- `Stack<T>` 的 T 出现在**实例一侧**：字段 `items: T[]`、方法签名 `push(item: T)`。`Stack<number>` 和 `Stack<string>` 是两个**不同的实例类型**（含私有成员时按名义比较，互赋直接报错，见练习 03）
- **静态成员不能引用类级类型参数**，报错原文（错误码 TS2302）：

  ```
  Static members cannot reference class type parameters.
  ```

  原因（要能讲清，不是背结论）：`class` 语法在运行时产生「一个构造函数 + 一个 prototype」。静态成员挂在**构造函数一侧**，实例成员挂在 prototype 上；类型参数 `T` 只在实例类型 `Stack<T>` 中生效——而运行时 `Stack<number>` 与 `Stack<string>` **共用同一个构造函数**，静态一侧根本没有「每个 T 一个版本」的载体。TS 禁止它，是在阻止一个运行时无法兑现的承诺
- 两个正确替代：
  - 静态方法声明**自己的**类型参数：`static from<U>(items: readonly U[]): Stack<U>`（泛型工厂，练习 03 采用）
  - 或把类型参数放到方法级 / 改用普通函数

### 6. 常见模式速查

```ts live noInline
// a. Response<T> 包装：API 响应的信封
type Response<T> = { status: number; data: T; error?: string };

// b. Validator<T>：校验器 + 类型谓词（与笔记 09 联动）
interface Validator<T> {
  validate(value: unknown): value is T; // 校验通过即完成 unknown -> T 的收窄
}
const isString: Validator<string> = {
  validate: (v): v is string => typeof v === 'string',
};

// c. keyof 约束的 get / pick：编译期保证 key 合法、返回类型精确
function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
function pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}

// d. 泛型工厂与 mixin 签名（一句话）：mixin 场景用「构造器类型」承载泛型——
//    type Constructor<T> = new (...args: any[]) => T;
//    用它接收基类、返回带新成员的类（大纲阶段 5 设计模式专题再展开）
```

### 7. 泛型是编译期的：类型擦除

一手依据：TS Handbook《TypeScript for JavaScript Programmers》("TypeScript erases types")——类型信息只用于编译期检查，产物是纯 JS。

运行时证据（练习 03 的完整输出）：

```ts
const s1 = new Stack<number>();
const s2 = new Stack<string>();
console.log(s1.constructor === s2.constructor); // true：运行时只有一个 Stack
console.log(Stack.name);                         // 'Stack'：类型参数无处可寻
console.log(typeof Stack);                       // 'function'：class 本体是构造函数
console.log(Object.getOwnPropertyNames(s1));     // ['items']：实例上只有运行时字段

const v: Stack<number> | string = s1;
console.log(typeof v); // 'object'：声明里的 Stack<number> 在运行时只剩 'object'
```

推论（面试高频）：

- **不能用 `typeof x === 'Stack<number>'` 这类判断**——`typeof` 只看得到运行时值（'object'/'function'/...）；要判类型只能走 `instanceof`（查原型链，且跨 realm 失效，见笔记 09）
- 泛型类没有「每类型一份」的运行时结构，`Stack<number> !== Stack<string>` 是**类型层面**的不同，运行时同一构造函数
- 类型参数不能用在 `typeof T`、`new T()`（例外：传构造器 `new (…)=>T` 的值进来）等需要运行时值的位置

类型参数是「类型」，不是「值」——需要运行时载体时把值传进来：

```ts live noInline
// 错误直觉：new T() —— T 编译后就没了，运行时没有对应构造函数
// 正确做法：把构造器作为值传入，类型用 new () => T 表达
function create<T>(C: new () => T): T {
  return new C();
}

class Point {
  constructor(public x = 0, public y = 0) {}
}
const p = create(Point); // T 推断为 Point（从构造器值推断，不是凭空）
```

## 可运行示例

| 文件 | 覆盖 | 关键证据 |
| --- | --- | --- |
| `exercises/ts-generics/01-generic-functions.ts` | identity / any / 联合对照 / firstOrDefault / keyof prop-pick | `any` 版编译通过但 `leaked.length => undefined`；`r1` 类型 `number \| null` |
| `exercises/ts-generics/02-constraints-and-defaults.ts` | 上界 / 多重约束 / 默认参数 | 体内 `Property 'push' does not exist on type 'T'`；`unknown` 默认值拦下未收窄使用 |
| `exercises/ts-generics/03-generic-classes.ts` | Stack/Queue / 静态限制 / 擦除 | `Static members cannot reference class type parameters.(2302)`；擦除五连输出 |

```bash
npx tsx exercises/ts-generics/01-generic-functions.ts
npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom exercises/ts-generics/01-generic-functions.ts
```

> tsc ≥ 7 指定单文件且 cwd 有 `tsconfig.json` 时报 TS5112，需 `--ignoreConfig`（tsc 5.x 不需要）。

## 易错点与面试高频

1. **「为什么用泛型不用 any」**：any 丢关系（双向豁免）、联合过宽（表达不了元素-返回的绑定）；泛型让每个调用点各自精确
2. 推断规则：多实参同一 T 时第一个胜出、其余必须兼容；数组元素候选取联合；无推断点回落默认值或显式传参
3. `extends` 是上界不是「等于」：体内只能用上界成员；调用方必须满足上界——两个方向都要能说
4. `K extends keyof T` 的价值：key 合法性 + 返回类型 `T[K]` 一起解决（写 `get/pick` 的标配）
5. 多重约束只能写 `T extends A & B`；`<T extends A, T extends B>` 是非法语法
6. 默认类型参数给 `unknown` 而不是 `any`（安全默认）；默认只在无推断点时生效
7. 静态成员引用类级类型参数报 TS2302——用一句话讲清「静态在构造器一侧、T 在实例一侧、运行时共用构造函数」
8. 泛型完全擦除：运行时没有 `Stack<number>`，`typeof` 看不见类型参数，判类型走 instanceof（有跨 realm 限制）
9. `def?: D` 的参数类型实际是 `D | undefined`，想表达「不传时默认」常需重载配合（练习 01 的 firstOrDefault）

## 输出预测题

先自己写出答案，再运行验证（不许先看文末答案）。

**题 1**：判断编译与推断结果。

```ts live noInline
function pair<T>(a: T, b: T): [T, T] {
  return [a, b];
}
const p1 = pair(1, 'a');
const p2 = pair([1, 'a'], [2]);
const n: number = p2[0][0];
```

1. `const p1 = pair(1, 'a')` 编译能不能过？`T` 被推断成什么？
2. `p2` 的 `T` 被推断成什么？`const n: number = p2[0][0]` 报不报错？

**题 2**：擦除与静态限制。

```ts live noInline
class Box<T> {
  value?: T;
  static make(x: T): T { return x; }   // ← A 行
}
const a = new Box<number>();
const b = new Box<string>();
console.log(a.constructor === b.constructor);
console.log(typeof Box);
```

1. A 行 tsc 报不报错？报错原文是什么？为什么？
2. 两行 console.log 输出什么？

## 预测题答案

**题 1**

1. 编译不过。`T` 从**第一个实参**推断为 `number`，第二个实参 `'a'` 不能赋给 `number`，报 `Argument of type 'string' is not assignable to parameter of type 'number'`
2. `T` 推断为 `(string | number)[]`：第一个实参 `[1, 'a']` 的元素候选取联合、数组化；第二个实参 `[2]` 是 `number[]`，可赋给 `(string | number)[]` 所以兼容。`p2[0][0]` 是 `string | number`，赋给 `number` 报 `Type 'string | number' is not assignable to type 'number'`

**题 2**

1. 报错，原文：`Static members cannot reference class type parameters.(2302)`。原因：静态成员挂在构造函数（类）一侧，而 `T` 只在实例类型 `Box<T>` 一侧生效；运行时 `Box<number>` 与 `Box<string>` 共用同一个构造函数，静态一侧没有「按 T 分版本」的载体。改法：`static make<U>(x: U): U { return x; }`（方法自己的类型参数）
2. 输出 `true` 和 `function`：泛型被擦除，运行时只有一个 Box 构造函数；`class` 本体就是（构造）函数

## 延伸阅读

- TS Handbook · Generics（一手主线）：[https://www.typescriptlang.org/docs/handbook/generics.html](https://www.typescriptlang.org/docs/handbook/generics.html)
- TS Handbook · Functions（函数泛型与推断背景）：[https://www.typescriptlang.org/docs/handbook/functions.html](https://www.typescriptlang.org/docs/handbook/functions.html)
- TS Handbook · Classes（Generic Classes 与静态成员）：[https://www.typescriptlang.org/docs/handbook/classes.html](https://www.typescriptlang.org/docs/handbook/classes.html)
- TS 2.3 发布说明 · Generic Parameter Defaults：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html)
- TS Handbook · keyof 与索引类型（`K extends keyof T` 的语境）：[https://www.typescriptlang.org/docs/handbook/2/keyof-types.html](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- 上一笔记：`notes/stage-3-ts-types/09-ts-narrowing.md`；下一笔记：类型编程（映射类型 / 条件类型，大纲阶段 3.3）

