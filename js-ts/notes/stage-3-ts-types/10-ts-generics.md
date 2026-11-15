---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
sources:
  - stage-3-ts-types
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

---

## 机制深一层：候选收集、归并胜负与协变逆变位

> 收据口径：本节及以下各节的「实跑」均为 js-ts/node_modules 的 tsc 5.9.3 加 `--strict`、临时单文件于 /tmp 实跑；运行时输出为 node v24.10.0 实跑。

### 1. 推断两阶段：先收集候选，再归并定胜负

调用一个泛型函数时，推断器分两步走：先从每个推断点（实参、返回上下文）收集候选类型，再按归并规则定出唯一的类型实参。归并规则可实测的三条：

- **可变位置的标量候选按字面量加宽**：`pair('a', 'b')` 的 T 是 `string` 而不是 `'a' | 'b'`——实跑把结果赋给 never，报 `Type 'string' is not assignable to type 'never'`。加宽只发生在可变位置；`as const` 或 readonly 容器会冻结字面量。
- **同一实参内部，数组元素候选取联合**：`pair([1, 'a'], [2])` 的 T 是 `(string | number)[]`（笔记 §2 既有规则）。
- **多个实参之间，首个实参定基调**：`pair(1, 'a')` 实跑报 `TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`——T 锁定 number，第二个实参要么兼容要么报错。另有一条兜底链要背下：**无推断点时三级回落——默认类型参数 → 显式实参 → 落回约束**。`ReturnType<typeof identity>` 得 `unknown` 就是第三级：签名脱离调用上下文，T 落回约束（无约束即 unknown）。

但对象字面量候选是个**特例**，值得单独背下。实跑：

```ts
function pair<T>(a: T, b: T): [T, T] { return [a, b]; }
const q1 = pair({ id: 1 }, { id: 1, extra: 'x' });
const probe: never = q1;
// 报 TS2322: Type '[{ id: number; extra?: undefined; } | { id: number; extra: string; },
//               { id: number; extra?: undefined; } | { id: number; extra: string; }]'
//   is not assignable to type 'never'
```

两个对象字面量候选**没有**触发「首个胜出」的报错，而是被归一化后取并：第二个字面量的多余属性 `extra` 被改写成「可选 + undefined」（`extra?: undefined`），与第一形状并成联合。推断器对新鲜对象字面量做了「按并集收容」的宽容处理，产物同时收下两个形状；`id: 1` 也加宽成了 `id: number`。这解释了工程里常见的现象：给同一个泛型参数传两个「长得像但不全等」的对象，多数时候能过——归一化联合在兜底；一旦某个属性名两边对不上且无法归一（比如一个是 `name: string`、另一个压根没有 name），才轮到首胜报错。再进一步：属性类型冲突时归一化照样兜底——实跑 `pair({ id: 1 }, { id: 'x' })`，把产物赋给 never，报错信息印出 T = `{ id: number; } | { id: string; }`：两个形状并成两成员联合，属性互不合并。对比标量版 `pair(1, 'a')` 直接 TS2345。两组规则分开记：**原始类型候选走「首胜 + 兼容」，对象字面量候选走「归一化并集」**。

### 2. 函数模式匹配：逆变让「更宽的参数」也算数

条件类型拿函数类型当模式匹配时，`T extends (x: string) => void` 的判定走**逆变**规则：只要 T 是「能接住 string 的函数」就算匹配成功。实跑：

```ts
type IsMatch<T> = T extends (x: string) => void ? true : false;
const r1 = undefined as unknown as IsMatch<(x: string | number) => void>;
const r2: false = r1;
// 报 TS2322: Type 'true' is not assignable to type 'false'
// —— 参数位逆变：能接住 string | number 的函数当然能当 (x: string) => void 用
```

这直接决定 `infer` 挖参的行为：模式里的 `x: string` 只是「准入门槛」，匹配成功后 infer 从**实参类型**（那个真实的函数类型）里提取。实测两个证据：

```ts
type Arg<T> = T extends (x: infer A) => void ? A : never;
declare const a1: Arg<(x: string | number) => void>;
const a1p: never = a1;
// 报 TS2322: Type 'string | number' is not assignable to type 'never'
// —— 挖到的是声明处的参数类型，不是模式里的 string

type Args<T> = T extends (...args: infer A) => void ? A : never;
declare const a2: Args<(x: string, y: number) => void>;
const a2p: never = a2;
// 报 TS2322: Type '[x: string, y: number]' is not assignable to type 'never'
// —— rest 位 infer 捕获整个形参表，连参数标签都保留
```

第二段是变长元组转发（笔记 12 §5 的 `safeCall`、笔记 32 题 ⑪）能成立的根基：参数表以带标签元组的形态被完整搬出。

### 3. 逆变的赋值方向：双向对照收据

```ts
type Sink<T> = (value: T) => void;
declare const sinkAll: Sink<string | number>;
const s1: Sink<string> = sinkAll;          // 通过：逆变放行
const s2: Sink<string | number> = (v: string) => {};
// 报 TS2322: Type '(v: string) => void' is not assignable to type 'Sink<string | number>'
//   Types of parameters 'v' and 'value' are incompatible.
//     Type 'string | number' is not assignable to type 'string'.
//       Type 'number' is not assignable to type 'string'.
```

第一行通过、第二行报错且错误逐层展开到 `number` 不能赋给 `string`——这是 strictFunctionTypes 下「类型别名形式的函数位」严格逆变的完整形态（笔记 15 §1.3 的方法简写双变豁免在这里不适用，因为 Sink 是函数类型别名而非方法签名）。手推口诀：**函数位的参数按「来源 ⊇ 目标」查，返回位按「来源 ⊆ 目标」查**；`Sink<string | number>` 的参数更宽、什么都能接，所以能顶替 `Sink<string>`。这套规则最日常的应用是回调槽位：`onDone` 要求 `(r: Response) => void` 时，参数不标注的回调、`(r: unknown) => void`、`(r: any) => void` 都能赋上——参数逆变让「更宽的参数」总能顶进「更窄的槽位」，这正是回调参数可以省略标注的机制原因（上下文按槽位类型反向补全）。顺带补一刀对照：同样的两个形状，若写在**对象字面量的方法简写位**（`{ sink(x: string): void }`），检查会退回双变、第二行那种错误就消失了——这正是笔记 15 §1.3 严格函数类型「只查函数属性」的历史包袱所在。

### 4. 字面量加宽的边界与 Equal 的影子

把 `pair('a', 'b')` 与笔记 12 §6 的 `ReturnType<typeof identity>` = `unknown`（实跑收据：赋给 string 报 `Type 'unknown' is not assignable to type 'string'`）放在一起看，能看到同一件事的两面：**泛型签名脱离调用上下文时，类型参数落回约束**——identity 的 T 没有约束，落 unknown。这也是笔记 32 「Equal 用泛型签名判同一性」能区分 `any` 与具体类型的机制底座：两个「未实例化的签名」被放进同一性比较，绕开了赋值性检查的宽容。推断、约束、同一性，三件事共享「类型参数是占位符、实例化才落地」这一个底层事实。顺带能答好一道对照题：「TS 泛型像谁的泛型」——C++ 模板按实例化生成多份代码、C# 泛型运行时保留（reified）、Java 与 TS 都擦除，但 Java 的泛型签名还留在字节码元数据里，TS 产物则是零痕迹的纯 JS。TS 的泛型是「纯编译期占位符」：不生成代码、不进运行时、只在检查时存在。

### 5. 约束三种写法：推断与检查两侧的效应差异

`T extends U` 的三种常用形态，对「调用方」与「函数体」两侧的效应并不相同，手推时分开记账：

- **keyof 约束**（`K extends keyof T`）：调用侧拿到「键联合」级别的精确报错（见排查速查表的 TS2345 行）；体内获得的能力是「K 是 T 的键」，从而 `T[K]` 可计算——两侧收益都最大，是首选形态。
- **结构约束**（`T extends { length: number }`）：调用侧只要结构满足即放行（number、数组、字符串都行）；体内知识止步于结构本身。收益在「复用面」，代价在「体内无知」。
- **交叉约束**（`T extends A & B`）：等价于同时声明两个约束；体内同时拥有 A 与 B 的成员知识，调用侧实参必须同时满足两侧。注意约束链本身可以追溯（A 又 extends C），TS 会沿链取并集知识——但写交叉比写链清晰，约束成环（TS2313）多半是链式写法绕出来的。

### 6. 泛型接口与泛型别名：不只是语法差异

`interface Comparator<T>` 与 `type Result<T, E = Error>` 的差别不在「能不能带参数」，而在**产物形态**：接口只能产出对象形状（成员、可扩展、可合并声明）；别名可以产出联合、条件类型、映射类型——笔记 §2 里 `Result` 是判别联合，只能用别名表达。推论有两条：想给联合/条件形态配默认参数，只能在别名上做；想让两个第三方声明合并成一个大接口，只能用 interface。评审时的取向：纯对象形状优先 interface（可被 implements、可扩展），「一层数据变形」用别名——形态与机制对齐，读代码的人不用猜。

## 手推配方：泛型调用五步走

拿到任何一次泛型调用，按五步推，不跳步：

**① 找推断点**：实参位置、返回值的目标类型、默认值，按优先级排队。
**② 收集候选**：每个推断点贡献一个候选；数组实参把元素候选联合后贡献一个；对象字面量贡献归一化候选。
**③ 归并**：标量候选加宽；同实参数组元素取联合；跨实参首个定基调、其余必须兼容（对象字面量候选先归一化再并集）。
**④ 约束核对**：类型实参必须满足 extends 上界；`K extends keyof T` 这类联动约束在这里拦截非法键。
**⑤ 代入产物**：把定出的实参代回签名计算返回类型（`T[K]`、`Pick<T, K>` 等）。

三个实例：

**实例一**：`prop(person, 'name')`（接笔记 §2 的四步走读，补全后两步）。① 推断点：obj、key。② 候选：`{ name: string; age: number }` 与 `'name'`。③ 归并得 T、K。④ 约束核对：`'name' extends 'name' | 'age'` 通过。⑤ 代入：返回 `T['name']` = `string`。

**实例二**：`pick(person, ['name', 'age'])`。② 数组实参贡献元素候选 `'name'`、`'age'`，联合后 K 候选为 `'name' | 'age'`。④ 核对通过。⑤ 代入 `Pick<T, K>` 产物 `{ name: string; age: number }`。传 `['nickname']` 则在 ④ 被拦——实跑收据：`TS2345: Argument of type '"nickname"' is not assignable to parameter of type '"name" | "age"'`。报错里直接印出键联合，正是「约束在调用点生效」的证据。

**实例三**：`create(Point)`（笔记 §7 的工厂）。推断点只有一个：构造器值的位置要求 `new () => T`。`Point` 的构造器形如 `new () => Point`，于是 T = Point。这是「类型从值来」的几乎唯一通道——除此之外类型参数没有运行时来源（擦除已实证）。

报错定位法收尾：五步里出错的环节不同，报错落点也不同——调用行报错（TS2345 一族）多半是归并或约束在调用侧失败；签名行报错（TS2339 on T 一族）是体内越过了约束上界。先看报错落在哪一行，再回到对应步骤复核，比从第一步盲推快得多。

**实例四**：`new Stack<number>()`。构造表达式没有实参可推（无推断点），走三级回落的第二级：显式实参。类型实参 `number` 代入后得到**实例类型** `Stack<number>`，字段 `items: T[]` 落成 `number[]`。两个不同实参的实例类型（`Stack<number>` 与 `Stack<string>`）互斥——各自带私有成员且私有成员类型不同，按名义规则互赋报 TS2322（§5 既有实证）。

**实例五**：`const isString: Validator<string> = { validate: (v): v is string => typeof v === 'string' }`。推断点不在调用，而在**注解**：类型注解本身就是显式传参的接口版，它把接口的 T 绑定为 `string`；于是方法要求 `validate(value: unknown)` 且返回谓词 `value is string`。调用处 `if (validator.validate(raw))` 通过后，`raw` 从 unknown 收窄为 `string`——「注解绑定 + 谓词收窄」两段接力，是运行时校验与类型系统会师的完整通道。

配一个诊断手法收尾：**报错落在调用点时，先固定变量再逐级放宽**——把可疑调用显式写出实参（如 `pair<{ id: number }>(...)`），报错会立刻指向「哪个实参不满足显式类型」。实测对照：推断路径下 `pair({ id: 1 }, { id: 1, extra: 'x' })` 靠对象字面量归一化兜底、不报错；显式写 `pair<{ id: number }>({ id: 1, extra: 'x' }, { id: 2 })` 则直接报 `TS2353: Object literal may only specify known properties, and 'extra' does not exist in type '{ id: number; }'`（实跑收据）。同一个调用，显式与否答案不同——「多余属性检查」只在显式类型在场时登场，推断路径的归一化联合不触发它。诊断时用显式实参当探针，能把「推断猜了什么」逼出原形。

## 工程三陷阱

**陷阱一：返回位置裸类型参数。** 触发场景：`function get<T>(): T` 的服务定位器，调用方 `get<User>()` 拿到的「类型」全凭自己声明，编译器无法验证任何东西——类型系统退化成断言制造机。根因：返回位置的类型参数没有推断点，只能靠显式传参；而显式传参本身就是一次未经检查的声明。规避：把「值级线索」传进来（构造器、默认值、键名），让推断点存在；或换成「键名到值」的映射（`get('currentUser')` 用字面量键驱动返回类型）。识别信号也一并记下：签名里 T 只出现在返回位置、每个调用点都显式传参——这就是「断言制造机」的指纹。

**陷阱二：`as any` 打断推断链。** 触发场景：`const cfg = JSON.parse(text) as Config;` 之后一切对 cfg 的推断都建立在断言上，字段改名校验全部失灵。根因：断言是「人工指定类型实参」，候选收集被跳过，下游全部继承人工指定值。规避：边界处用运行时校验收口（校验函数配类型谓词，笔记 §6 的 Validator 模式），中间态用 `satisfies` 或显式泛型让编译器保留推断链；断言只允许出现在「有注释说明依据」的边界行。一个自查动作：全仓库搜 `as any` 与 `as unknown as`，逐行问「这里的类型关系是不是被剪断了」。比 as 更温和的收口是 `satisfies`：业务对象用 `const cfg = {...} satisfies Config` 保留推断类型的同时核对形状——推断链不断，只在形状不符时报错。

**陷阱三：泛型类的静态状态跨 T 共享。** 触发场景：`class Registry<T> { static total = 0 }` 想按类型分别计数，实际 `new Registry<number>()` 与 `new Registry<string>()` 都在改同一个 `Registry.total`。根因：擦除（§7 已实证：运行时只有一个构造函数），静态成员挂在唯一的构造函数上，「按 T 分版本」不存在载体。规避：计数放实例字段或模块级 `Map`（键用构造函数值）；顺带警惕方法内声明的类型参数与类级类型参数**同名遮蔽**——方法级 T 是另一个 T，编译器不会提醒你它和类级 T 无关。同类风险还有「静态方法上声明同名 U 但体内引用了 this.items」——以为在用 U，实际拿 T 的实例数组当 U 用，检查照样通过（U 是独立参数），错在运行时才暴露。

## 与手写实现对照：同一 API 的无泛型版与泛型版逐条 diff

泛型册的「手写对照」不是对照内建工具类型，而是对照**同一 API 去掉泛型后的手写版**——diff 的每一行都在回答「泛型到底买了什么」：

| 场景 | 无泛型版 | 泛型版 | diff 要点 |
| --- | --- | --- | --- |
| 取首元素 | `(xs: any[]) => any` | `<T>(xs: readonly T[]) => T` | any 版双向豁免、关系全断；泛型版返回即元素类型 |
| 按键取值 | `(o: any, k: string) => any` | `<T, K extends keyof T>(o: T, k: K) => T[K]` | 键拼错从运行时 undefined 变编译期 TS2345；返回类型精确 |
| 运行时校验 | `(v: unknown) => boolean` | `(v: unknown) => v is T` | boolean 版不收窄，调用处还得断言；谓词版过判即窄 |
| 类型工厂 | `(C: any) => any` | `<T>(C: new () => T) => T` | 产物类型从构造器值推断，不必手工标注 |
| 缓存表 | `const cache: Record<string, any>` | `<T> makeCache(): Map<string, T>` | 键值关系保留；any 版存取两端都对不上 |

五行的共同本质：无泛型版在**同一个位置**剪断了「输入与输出的类型关系」，只是位置不同（首元素在返回、按键在键值之间、校验在判定结果、工厂在产物、缓存在两端）。评审时看到一个 any 版，就沿着「这行剪断了哪条关系」问下去；能答上来的泛型改写才有价值，答不上来的说明关系本来就不存在，别硬上泛型。

## 排查速查表

泛型相关报错集中在「归并、约束、作用域」三处；读表姿势：先按错误码定位是哪一侧（调用方/签名方）出了问题，再决定改调用还是改签名。

| 报错（码 · 原文要点） | 根因 | 处置 |
| --- | --- | --- |
| TS2345 · Argument of type 'string' is not assignable to parameter of type 'number' | 跨实参归并首个定基调，其余必须兼容 | 收窄调用实参，或把签名改成「元素候选取联合」的形态（`readonly T[]`） |
| TS2345 · Argument of type '"nickname"' is not assignable to parameter of type '"name" \| "age"' | `K extends keyof T` 在调用点拦非法键 | 改键名；确需动态键再考虑收窄后的索引访问 |
| TS2302 · Static members cannot reference class type parameters. | 静态侧没有「按 T 分版本」的运行时载体 | 静态方法声明自己的类型参数，或改普通函数 |
| TS2339 · Property 'push' does not exist on type 'T' | 体内知识止步于约束上界 | 约束补上最小结构需求，或用运行时守卫收窄后再用 |
| TS2322 · Type 'unknown' is not assignable to type 'string' | 泛型返回值未绑定实参，类型参数落回约束 | 用实例化表达式绑定（`const numId = identity<number>`）或收窄 |
| TS2589 · Type instantiation is excessively deep and possibly infinite | 递归泛型无出口或超深度 | 补递归出口；参照笔记 32 §9 控制规模 |
| TS2313 · Type parameter 'T' has a circular constraint | 泛型约束互相引用成环 | 提取公共约束，消环 |
| TS2353 · `Object literal may only specify known properties, and 'extra' does not exist ...` | 显式类型实参在场时，多余属性检查生效（推断路径的归一化兜底消失） | 收窄字面量、扩显式类型，或去掉显式实参走推断 |
| TS2304 · Cannot find name 'T' | 在类型参数作用域外使用 T（如类静态侧、无关作用域） | 补类型参数声明或调整作用域 |

## code review 检查单

- [ ] 约束最小化（needs-based）：体内只用到 `length` 就不要约束成 `string[]`；每个 extends 上界都能说出「为什么是它」。
- [ ] 没有返回位置的裸类型参数（`function f<T>(): T` 类签名）；有则改为值级推断点或键驱动的映射。
- [ ] 默认类型参数给 `unknown` 而非 `any`；默认值只在无推断点时生效这一点在注释里写明。
- [ ] 静态成员没有引用类级类型参数；类级 T 与方法级 U 无同名遮蔽。
- [ ] `keyof` 约束的 `get`/`pick` 返回 `T[K]`/`Pick<T, K>`，而不是 `any`。
- [ ] 校验场景用「泛型 + 类型谓词」收窄（Validator 模式），而不是断言。
- [ ] 推断链没有被 `as any` 打断；每个断言行都有依据注释。
- [ ] 类型参数命名有语义（T/U/K 或 Key/Value），复杂签名配 JSDoc 说明每个参数从哪推断。
- [ ] 变长参数转发用 `(...args: infer A) => R` 形态，不用 `Function`。
- [ ] 泛型接口与别名的选型与产物形态一致：对象形状用 interface，联合/条件变形用别名。
- [ ] 回调槽位签名取逆变友好的宽参数（`unknown` 或精确事件类型），不逼调用方写断言。

## 输出预测题（进阶）

**题 1（对象字面量候选归一化）**：

```ts
function pair<T>(a: T, b: T): [T, T] { return [a, b]; }
const q1 = pair({ id: 1 }, { id: 1, extra: 'x' });
```

T 的精确类型是什么？会报错吗？

**题 2（逆变双向）**：

```ts
type Sink<T> = (value: T) => void;
declare const sinkAll: Sink<string | number>;
const s1: Sink<string> = sinkAll;
const s2: Sink<string | number> = (v: string) => {};
```

两行各通过还是报错？报错的话错误码与关键信息是什么？

**题 3（静态共享与名义比较）**：

```ts
class Registry<T> {
  private items: T[] = [];
  static total = 0;
  constructor() { Registry.total++; }
}
const a = new Registry<number>();
const b = new Registry<string>();
console.log(Registry.total);
const c: Registry<number> = b;
```

console.log 输出什么？最后一行报不报错、为什么？

**题 5（谓词收窄的可信边界）**：

```ts
interface Validator<T> { validate(value: unknown): value is T }
const isNum: Validator<number> = { validate: (v): v is number => typeof v === 'number' };
const raw: unknown = JSON.parse('{"n":42}');
if (isNum.validate(raw)) {
  const n: number = raw;
}
```

`if` 块内 `raw` 的类型是什么？把第二行的实现改成 `() => true`（恒真），编译器拦不拦？这说明类型谓词的收窄可信度由什么决定？

**题 4（默认类型参数与推断点）**：

```ts
function firstOrDefault<T, D = null>(xs: readonly T[], def?: D): T | D {
  return xs.length > 0 ? xs[0] : (def as D);
}
const x1 = firstOrDefault([1, 2, 3]);
const x2 = firstOrDefault([1, 2, 3], 0);
```

`x1`、`x2` 的类型各是什么？

## 进阶题解析

**题 1**：不报错。实跑收据把 q1 赋给 never，报错信息印出的 T 是 `{ id: number; extra?: undefined; } | { id: number; extra: string; }`——两个对象字面量候选被归一化（多余属性改写为「可选 + undefined」）后取并，`id: 1` 同时加宽为 `id: number`。「首个实参定基调」的规则对象字面量候选不适用，归一化联合在兜底。追问边界：属性类型冲突（比如第二实参换成 `{ id: 'x' }`）归一化也不报错，产物是 `{ id: number } | { id: string }` 的两形状联合（实跑收据）——真正触发 TS2345 的只有不可归一的原始类型候选。

**题 2**：`s1` 通过——逆变放行，`Sink<string | number>` 能接住一切 string 能接住的值，顶替 `Sink<string>` 合法；`s2` 报 **TS2322**，错误逐层展开为 `Type 'string | number' is not assignable to type 'string'`、`Type 'number' is not assignable to type 'string'`（实跑收据原文）。方向感口诀：参数位看「来源是否更宽」，返回位看「来源是否更窄」。

**题 3**：输出 **2**——擦除后运行时只有一个 Registry 构造函数，静态字段全局一份，两次构造各加一（这就是陷阱三）。最后一行报错：`Registry<number>` 与 `Registry<string>` 各含私有成员 `items: T[]`，类型不同；含私有成员的比较按名义规则互斥（笔记 §5 既有实证），TS2322。两句口诀合起来：**静态跨 T 共享，实例按私有名义互斥**——同一对类型，在不同位置表现完全相反。修复方向分两条：按类型分别计数改用模块级 `Map`（以构造函数值为键）；想让实例跨 T 复用就删掉私有成员、退回纯结构比较——两边各让一步，先想清楚要的是哪一边。

**题 4**：`x1` 是 `number | null`——第二个类型参数 D 没有推断点（没传 def），落默认 `null`，T 推断 `number`。`x2` 是 `number`——D 从实参 `0` 推断（可变位置字面量加宽为 `number`），返回类型 `number | number` 折叠成 `number`。注意两件事的分工：默认值只在无推断点时生效；字面量加宽只发生在可变位置——把签名改成 `def: NoInfer<D>` 之类强行锁定的做法，先想清楚要锁的到底是推断点还是加宽。

**题 5**：`if` 块内 `raw` 是 `number`——谓词 `value is T` 且 T 已被注解绑定为 `number`，通过即收窄。实现改成恒真函数**编译器不拦**：谓词签名只承诺「返回 true 时值是 T」，这个承诺由实现者兑现，编译器不验证 `typeof` 判断与 T 是否配套（它连 `value` 都没要求用）。结论：类型谓词的收窄可信度完全由**谓词函数实现的正确性**决定——这正是运行时校验库（zod、valibot 一类）以「schema 与类型单一来源」解决的问题，也是评审 Validator 手写实现时要重点盯的一行。
