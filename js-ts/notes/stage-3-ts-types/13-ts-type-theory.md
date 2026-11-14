---
mdx:
  format: mdx
---
# 13 · TypeScript 类型系统理论

> 对应大纲：阶段 3.5 —— 类型系统理论：结构类型、协变/逆变、`never`/`unknown` 的角色

## 学习目标

1. 讲清「结构类型」的判定规则，以及它最重要的例外——多余属性检查为什么只针对对象字面量
2. 用 Animal/Dog 级推导出协变/逆变/双变的合法方向，并解释方法双变与数组协变的历史包袱
3. 说出 `never`（bottom）与 `unknown`（top）各自承担的全部角色，而不是背「永远不会有值」
4. 理解 brand 模式如何在一个结构类型系统里「造出」名义类型
5. 给「TS 是否类型健全（sound）」一个有出处的回答

## 关键概念

### 1. 结构类型 vs 名义类型

一手依据：TS Handbook《Type Compatibility》——"TypeScript is a structural type system"。（对照：Java/C#/Rust 是名义类型系统，名字不同就不兼容。）

- **名义类型**：`UserId` 和 `OrderId` 即使内部都是 `number`，声明成两个类型就互不兼容。安全，但啰嗦。
- **结构类型**：TS 只问「形状够不够」。判定的核心操作是**可赋值性（assignability）检查**：
  1. 逐个检查目标类型的每个成员，源里是否存在**类型兼容**的同名成员；
  2. 源有目标没有的成员**不妨碍**赋值（「宽度子类型」：更宽的可以赋给更窄的）；
  3. 类型名、声明位置、继承关系统统不看。

```ts live noInline
interface Point2D { x: number; y: number }
interface LatLon  { x: number; y: number }  // 名字不同，结构相同
const pt: Point2D = { x: 1, y: 2 };
const ll: LatLon = pt;                      // OK：形状说了算

interface Point3D { x: number; y: number; z: number }
const p3: Point3D = { x: 1, y: 2, z: 3 };
const p2: Point2D = p3;                     // OK：多的 z 没人检查
const bad: Point3D = pt;                    // 报错：缺 z，成员逐一检查不通过
```

推论：`class` 在 TS 里也只是「带实现接口的结构」——两个形状相同的类可以互赋，`extends` 在类型层只是「一次性复制成员 + 声明子类型关系」的手段。

### 2. 多余属性检查：结构规则的最大例外（必须讲透）

结构规则本身**允许**多余成员（宽度子类型），那为什么下面报错？

```ts live noInline
interface Window1 { title: string }
const w: Window1 = { title: 'a', extra: 1 };  // 报错 TS2353！extra 不在 Window1 里
```

因为这不是「结构兼容检查」，而是叠在其上的一道独立防御：**excess property check（多余属性检查）**。规则：

- **只对「新鲜（fresh）的对象字面量」生效**：直接赋值给标注类型、或直接作为实参传入时；
- 动机：字面量里的未知属性几乎必然是**拼写错误**（`title` 写成 `titel`，或该用 `{...base, title}` 却写错键名），而你此刻正在「向目标类型声明意图」，编译器有机会拦；
- 一旦字面量先落进变量，freshness 消失，回到纯结构规则——多余成员被**静默忽略**：

```ts live noInline
const indirect = { title: 'a', extra: 1 }; // 推断为 { title: string; extra: number }
const w2: Window1 = indirect;              // OK：extra 被忽略
render(indirect);                          // OK：传参同理，变量不新鲜了
render({ title: 'a', extra: 1 });          // 报错：实参位置的字面量同样是 fresh 的
```

面试表述：「多余属性检查不是结构类型的判定规则，而是针对字面量的额外防错层；它只在赋值目标类型明确、且值是新鲜字面量时触发，先存变量即可绕过——这也是为什么它防不住运行时多传字段（多余字段本来就能通过结构检查）。」

### 3. 弱类型检测（weak type detection）

一手依据：TS 2.4 Release Notes《Weak Type Detection》。

全是可选属性的类型叫**弱类型**。给弱类型赋值时，若源对象与它**没有任何公共属性**，报错（"Type has no properties in common with type..."）：

```ts live noInline
interface Options { timeout?: number; retries?: number }
const o: Options = { duration: 100 };  // 报错：一个公共属性都没有，八成是拼错了
```

动机：纯结构规则下 `{ duration: 100 }` 结构兼容 `Options`（零个必需成员），拼错字段名会静默通过。弱类型检测补上这个洞。绕过方式（也是修复方式）：改对字段名 / 刻意断言 / 给接口加索引签名。

### 4. 名义化技巧：brand 模式

TS 没有内置 nominal typing，交叉类型 + 字面量标记即可模拟：

```ts live noInline
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId  = Brand<number, 'UserId'>;
type OrderId = Brand<number, 'OrderId'>;

const makeUserId  = (raw: number): UserId  => raw as UserId;   // 构造函数是唯一签发口
const uid = makeUserId(1001);

const bad1: OrderId = uid;   // 报错：__brand 'UserId' ≠ 'OrderId' —— 同结构不可互赋
const bad2: UserId  = 1001;  // 报错：裸 number 没有 __brand
```

原理：brand 只存在于类型层，运行时 `uid` 就是 `1001`，零开销。代价：构造处必须 `as` 越狱一次；字符串 `__brand` 全局同名会互相兼容（更严格可用 `declare const` + `unique symbol` 做键）。这是社区对 GitHub issue microsoft/TypeScript#202（nominal typing 提案）的长期折中方案，《Effective TypeScript》一书有专条讨论。

### 5. 协变 / 逆变 / 双变

先定义方向：`Dog extends Animal`（Dog 更「窄」，Animal 更「宽」）。泛型 `F<T>` 的参数方向由 **T 出现的位置**决定：

| T 的位置 | 名称 | 合法方向 | 直觉 |
| --- | --- | --- | --- |
| 返回值（生产者） | 协变 covariance | `F<Dog>` → `F<Animal>` | 需要「产 Animal」的位置，产 Dog 的必然满足 |
| 参数（消费者） | 逆变 contravariance | `Take<Animal>` → `Take<Dog>` | 需要「吃 Dog」的位置，什么都吃的函数必然满足 |
| 两者都出现 | 不变 invariance | 双向都不行 | `Box<Dog>` 与 `Box<Animal>` 互不兼容 |

口诀：**生产者协变、消费者逆变**；函数赋值时「返回值可以更具体，参数必须更宽泛」。

**strictFunctionTypes（TS 2.6）**：在这之前函数参数是**双变（bivariant）**的——两个方向都放行，等于少检查一半。TS 2.6 Release Notes 原文：

> "The stricter checks apply to all function types, except those originating in method or constructor declarations. Methods are excluded specifically to ensure generic interfaces like `Array<T>` continue to relate covariantly."

于是有了今天的格局：

- **函数属性**（`f: (x: A) => void`）参数严格逆变；
- **方法简写**（`f(x: A): void`）参数仍然双变——历史原因：若方法也严格逆变，`Array<T>` 里 `push(x: T)` 会让 `Array<Dog>` 不再兼容 `Array<Animal>`，海量既有代码（含 DOM 回调签名）瞬间编译失败。TS 选择让「新写法（函数属性）严格、老写法（方法）宽松」。实测规则：**赋值目标侧的成员是方法简写就走双变检查，是函数属性就走严格逆变**（见 `exercises/ts-theory/01-structural-typing.ts` 末段与 `02-variance.ts`）。

**数组协变的运行时风险**：`T[]` 的方法按「方法双变」处理，所以 `Dog[] → Animal[]` 合法（与 Java/C# 一致的务实妥协）。但两个变量引用同一数组时：

```ts live noInline
const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs;   // OK：协变
animals.push(new Cat());          // 类型层完全合法（Cat 是 Animal）
dogs[1].fetch();                  // 运行时 TypeError：Cat 没有 fetch
```

类型系统在这里**有意不健全**——这就是「逃生舱」之外的另一类 unsoundness（写操作 + 协变容器）。只读方向（`readonly Dog[]`）才真正安全。

### 6. never：bottom type 的四种角色

一手依据：TS 2.0 Release Notes（`never` 引入）；Handbook《Narrowing》的 exhaustiveness 小节。

`never` 是**空集**：没有任何值属于它，同时它是**一切类型的子类型**（bottom）。

1. **bottom type**：`never` 可赋给任何类型（`never extends X` 恒为 true 分支）；反过来除 `never` 自己谁也赋不进 `never`。`never[]`（空数组）是唯一能在运行时构造的 never 相关值。
2. **空联合**：`type T = 'a' | never` 坍缩为 `'a'`（空集并入集合不改变集合）。同理 `string & number = never`（交集为空）。**推演 `never extends X`**：因为 never 是一切类型的子类型，条件类型恒走 true 分支；但**分布式条件类型**对 `never`（空联合）分布时没有任何成员可代入，结果是 `never` 本身——`type D<T> = T extends string ? 1 : 0; type R = D<never>` 得 `never`，不是 `1`。
3. **条件类型过滤器**：`type OnlyString<T> = T extends string ? T : never`，never 把不匹配的分支从结果联合中「吸收」掉——`Exclude`/`Extract` 的实现原理。
4. **穷尽检查 + 永不返回**：switch 的 default 分支里 `const x: never = s`，若联合新增成员而 case 没跟上，此行立刻报错，把漏分支从线上事故变成编译错误；`function fail(): never { throw ... }` 让控制流分析知道该分支不会「活着」返回，`string | null` 传给 fail 后收窄为 `string`。

### 7. unknown：top type

一手依据：TS 3.0 Release Notes——`unknown` 是「the type-safe counterpart of `any`」。TS 4.4 Release Notes：`useUnknownInCatchVariables`（并入 `strict`）。

`unknown` 是**全集**：一切类型可赋给 `unknown`；但 `unknown` 只能赋给 `unknown`/`any` 自己。

| | `any` | `unknown` |
| --- | --- | --- |
| 谁能赋给它 | 任何值 | 任何值 |
| 它能赋给谁 | 任何类型（双向豁免） | 只有 `unknown`/`any` |
| 属性访问/调用/运算 | 全放行，结果还是 `any`（**传染**） | 全禁止 |
| 允许的操作 | 一切 | 比较（`===`）、断言、收窄 |

```ts live noInline
const u: unknown = JSON.parse(raw);
u.answer;        // 报错：不能属性访问
u + 1;           // 报错：不能运算
if (typeof u === 'object' && u !== null && 'answer' in u) { /* 收窄后才能用 */ }
```

`useUnknownInCatchVariables`（strict 下默认开）：`catch (e)` 的 `e` 从 `any` 变为 `unknown`——`e.message` 必须先 `e instanceof Error` 或断言。原则：**入口处的「不知道」用 `unknown`，把崩溃点从深处挪到收窄处；`any` 是双向豁免的逃生舱，一出现就污染整条调用链。**

`{}` / `object` / `Object` 区别（依据 microsoft/TypeScript-FAQ）：

| 类型 | 接受 | 拒绝 | 评价 |
| --- | --- | --- | --- |
| `{}` | 一切非 nullish（含原始值） | `null` / `undefined` | 语义是「非空」，表达「不知道」应该用 `unknown` |
| `object` | 对象/数组/函数 | 一切原始值 + nullish | 表达「必须是引用类型」时用 |
| `Object` | 同 `{}`（附赠 Object.prototype 方法） | `null` / `undefined` | 永远不要显式写 |

### 8. 类型健全性（soundness）一句话

TS **并非完全 sound**：`as` 断言、`any`、非空断言 `!`、数组索引 `arr[i]`（默认不检查越界/存在性）都是刻意保留的逃生舱——依据 TypeScript 官方设计目标（GitHub Wiki《TypeScript Design Goals》）Non-goals 第 3 条：不追求「provably correct」的类型系统，在正确性与生产力之间取平衡。数组协变、方法双变同属「为了兼容性而牺牲健全性」的决策。

## 可运行示例

全部代码在 `exercises/ts-theory/`，可逐个运行对照：

```bash
npx tsx exercises/ts-theory/01-structural-typing.ts   # 结构兼容、多余属性检查对照实验、brand
npx tsx exercises/ts-theory/02-variance.ts            # 方向矩阵、方法双变、数组协变 push 翻车
npx tsx exercises/ts-theory/03-never-unknown.ts       # never 四角色、unknown 限制清单、{} 矩阵
```

每个文件先读顶部注释的「预期输出」，自己推演一遍再运行。重点看三个「证据」：

1. `01` 中同一份对象 `{ title, extra }`：字面量直赋报错（`// @ts-expect-error` 抑制）、先落变量就通过——多余属性检查只看 freshness；
2. `02` 中四个方向的赋值矩阵只有两个方向合法，且 `toMethod`（方法简写目标）放行了 `toFnProp`（函数属性目标）被拦下的同一行代码——strictFunctionTypes 只管函数属性；
3. `02` 末尾：`Dog[]` 协变成 `Animal[]` 后 `push(new Cat())` 类型合法，遍历时 `d.fetch()` 抛出 `TypeError: d.fetch is not a function`——不健全性的现场。

类型校验（@ts-expect-error 证据是否真的在报错）：

```bash
npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-theory/01-structural-typing.ts
```

（`--ignoreConfig`：TypeScript 7 起，目录里有 tsconfig.json 时给 tsc 显式传文件必须加，否则报 TS5112。）

## 易错点与面试高频

1. **「接口多了字段还能赋值吗」**：能（宽度子类型）——除非值是新鲜字面量（多余属性检查）。两套规则叠加，别混为一谈。
2. **绕过/触发多余属性检查的姿势**：先存变量可绕过；`as TargetType` 断言可绕过；`{...obj}` 展开虽然整体是新鲜字面量，但**展开复制来的键不检查**，只查显式写出的键（实测如此）。类型层永远拦不住「运行时多字段」。
3. **协变逆变记反**：记住场景而不是口诀——「要狗的客户给得起任何动物处理器吗？给得起（参数逆变）；要动物产品的地方敢用狗工厂吗？敢（返回值协变）」。
4. **方法双变是特性不是 bug**：面试常问「为什么 interface 里 `onEvent(cb: (e: Event) => void): void` 与 `onEvent: (e: Event) => void` 检查不一样」——前者目标是方法（双变），后者是函数属性（严格逆变）。库设计里故意把回调写成方法简写可放宽检查（兼容旧代码），写严格就统一用函数属性。
5. **`never` 与 `void` 混淆**：`void` 表示「返回值没人看」（函数可以 return undefined）；`never` 表示「不会正常返回」（throw/死循环）。`never` 可赋给 `void`，反之不行。
6. **`unknown` 不是更严的 `any` 的语法糖**：`any` 双向豁免，`unknown` 单向（只进不出）。「函数接收外部数据」的参数一律 `unknown` + 收窄，是成本最低的健壮性改造。
7. **`Array<T>` 协变 + `push`** 是不健全性的教科书案例；引申：`readonly T[]` 只读方向才安全，TS 4.x+ 也可用 `ReadonlyArray<T>` 表达。

## 输出预测题

### 题 1（多余属性检查）

不运行，判断每一行是否能通过编译，并说明理由：

```ts live noInline
interface Config { url: string }
const fromVar = { url: 'https://a.dev', timeout: 3000 };
const c1: Config = fromVar;
const c2: Config = { url: 'https://a.dev', timeout: 3000 };
const c3: Config = { ...fromVar };
function load(c: Config) { return c.url; }
load(fromVar);
load({ url: 'https://a.dev', timeout: 3000 });
```

### 题 2（协变/逆变方向 + never 推演）

```ts live noInline
class Animal { name = 'a'; }
class Dog extends Animal { fetch() { return 1; } }
declare const makeDog: () => Dog;
declare const takeDog: (d: Dog) => void;
const a1: () => Animal = makeDog;    // ?
const a2: () => Dog = a1;            // ?（a1 的声明类型是 () => Animal）
const b1: (d: Dog) => void = takeDog;         // ?（声明类型相同，直赋）
const b2: (a: Animal) => void = takeDog;      // ?
type D<T> = T extends string ? 's' : 'n';
type R1 = D<never>;                  // ?
type R2 = never extends string ? 's' : 'n';  // ?
```

## 预测题答案

### 题 1

| 行 | 结果 | 理由 |
| --- | --- | --- |
| `c1` | 通过 | `fromVar` 是变量，不新鲜；结构规则允许 `timeout` 多余成员 |
| `c2` | **报错** | 新鲜字面量里**显式写出**了 `timeout`，触发多余属性检查（TS2353） |
| `c3` | 通过 | 展开成员被豁免：`{...fromVar}` 虽是新鲜字面量，但多余属性检查只针对字面量里显式写出的键，spread 复制来的键不查（实测 TS2353 只报 c2 和最后一个 load） |
| `load(fromVar)` | 通过 | 实参是变量 |
| `load({...})` | **报错** | 实参位置的新鲜字面量，且 `timeout` 是显式写的 |

关键：报错的不是「结构不兼容」，而是字面量防错层；同样的形状，变量就通过。

### 题 2

- `a1` **通过**：返回值协变（`Dog` 产出满足 `Animal` 产出）。
- `a2` **报错**：`a1: () => Animal` 的返回值可能是「纯 Animal」，不保证是 `Dog`（返回值只许协变，不许逆变）。
- `b1` 通过：声明类型相同，自身兼容自身。
- `b2` **报错**：参数逆变——`takeDog` 只吃 `Dog`，接在 `(a: Animal) => void` 位上时调用方传 `Cat` 就崩；只有 `Take<Animal> → Take<Dog>` 方向合法。
- `R1 = never`：分布式条件类型在空联合上分布，没有成员可代入分支，结果为空联合 `never`。
- `R2 = 's'`：这里 `never` 处在被检查位（不是泛型分布），`never` 是一切类型的子类型，`never extends string` 恒真。两者差异就是「分布」与「不分布」的差异。

## 延伸阅读

- TS Handbook《Type Compatibility》：https://www.typescriptlang.org/docs/handbook/type-compatibility.html
- TS 2.6 Release Notes（strictFunctionTypes，方法例外的原文）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html
- TS 2.4 Release Notes（Weak Type Detection）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-4.html
- TS 3.0 Release Notes（unknown）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html
- TS 4.4 Release Notes（useUnknownInCatchVariables）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- microsoft/TypeScript-FAQ（\{\} vs object vs Object）：https://github.com/microsoft/TypeScript-FAQ
- 《Effective TypeScript》（Dan Vanderkam）brand/nominal 相关条目
- 下一站：`notes/stage-3-ts-types/14-ts-declarations-and-modules.md`（阶段 3.6 声明文件与模块解析）


## 附：类型理论三问收尾（增补）

理论册的收尾，用三问把"为什么前端工程师要懂一点点类型理论"钉死：

1. **子类型为什么不是集合包含？**——TS 的结构化子类型是"形状满足即可"，宽类型可以收窄字面量、可以带多余属性（经 freshness 检查豁免的字面量直传）——用集合语言讲会推出错误结论，用"属性满足"语言讲才对；
2. **协变逆变为什么只在函数参数位反着？**——因为"生产位置"（返回值）可以安全放宽、"消费位置"（参数）必须收紧——方向规则不是规定，是"任何使用场景都不出错"这一要求的推论（34 册的 Box 反例演示了违反的代价）；
3. **any/unknown 的区别为什么是"逃生门 vs 安全屋"？**——any 让类型宇宙与值宇宙断联（双向放行），unknown 只关闭"未验证就使用"（收窄后通行）——一个放弃检查，一个延迟检查。

三问的共同答案模板：**TS 的类型规则都是"保证程序不出某一类错"的最小约束**——每条规则先问"防什么错"，再记"怎么防"，规则就不再是需要背的条文。

### 收尾自测（增补）

1. 字面量直传对象不走 excess property check——这条豁免"防的是什么错、豁免的又是什么场景"？两者怎么平衡？
2. 函数参数双变的豁免（方法简写）在什么场景会放行真正的 bug？34 册的哪个反例对应它？
3. unknown 收窄的三条路（typeof/instanceof/断言）各自的适用边界？

三问之外，把本册的概念图补全成"一页速查"——类型理论词汇表的最小可用版：

| 词汇 | 一句话定义 | 本册出处 |
|---|---|---|
| 结构化子类型 | 形状满足即可赋值（与名义相对） | §2 |
| 协变/逆变 | 生产位放宽/消费位收紧的方向规则 | §3 |
| 双变豁免 | 方法简写参数位不检查方向（历史兼容） | §3 |
| fresh literal | 字面量直传时的多余属性检查 | §2 |
| unknown/any | 延迟检查的 安全屋/放弃检查的逃生门 | §4 |
| 穷尽性 | 联合的每个成员都有处理分支（assertNever） | §5 |

词汇表是理论册的正确打开方式：**每个词一条"防什么错"的解释**——能说出右列句子的每个词，类型理论就不再是门槛。

### 收尾一句话（增补）

类型理论的工程目标只有一个：**让"错的程序"在编译期被拒绝，且拒绝的理由能被人类理解**——TS 的全部规则（包括那些"怪"规则）都是这条目标与渐进式迁移现实之间的折衷。

---

## 机制深一层：方差的位置推导法、「不变」的精确条件与 readonly 的两种待遇

正文 §5 给了方向表与 strictFunctionTypes 的格局，这一节把「怎么推」变成算法、把「不变」的成立条件用实测钉死。全部收据为本机 tsc 5.9.3（`--strict`）。

**位置极性与乘积规则。** 给 T 的每个出现位置标极性：函数的参数位记负、返回位记正；位置嵌套时极性相乘（负负得正）。结论规则：全正 → 协变；全负 → 逆变；正负混合（存在可写口）→ 不变。三条实测收据演示乘积：

```ts
class Animal { name = 'a'; }
class Dog extends Animal { fetch() { return 1; } }

type Cb<T> = (cb: (x: T) => void) => void;      // T 在「参数的参数」：负 × 负 = 正
declare const cD: Cb<Dog>;
const cA: Cb<Animal> = cD;   // 实测通过：协变方向放行
declare const cA2: Cb<Animal>;
const cD2: Cb<Dog> = cA2;    // 实测 TS2322：逆变方向被拒

type HandlerFn<T> = { on: (f: (x: T) => void) => void; fire: () => T };
declare const h1: HandlerFn<Dog>;
const h2: HandlerFn<Animal> = h1; // 实测通过：on 里负负得正，fire 为正，全正 → 协变
```

「要狗的客户给得起任何动物处理器吗」的直觉题在乘积规则下不用背：T 藏得越深，方向越可能翻转，偶数层参数嵌套会翻回协变。

**「不变」的精确条件：看有没有严格逆变检查的成员。** 正文 §5 的表格把 `Box<Dog>` 与 `Box<Animal>` 记作互不兼容，那是「读写两用 + 严格写口」的形态。实测把精确条件钉了出来：

| 容器形态 | Dog → Animal 方向 | 结论 |
| --- | --- | --- |
| `interface PropBox<T> { value: T }` 纯可变属性 | 实测通过 | 属性协变放行——不健全，但结构规则如此 |
| `interface MethodBox<T> { value: T; set(v: T): void }` 方法简写写口 | 实测通过 | 方法双变让写口不设防 |
| `interface FnBox<T> { value: T; set: (v: T) => void }` 函数属性写口 | 实测 TS2322 | 反向（Animal → Dog）同样 TS2322，双向皆拒 |

也就是说，TS 没有 Java 式的「泛型默认不变」——结构展开后每个成员按自己的方向检查，整体表现是各成员方向的合取。想让泛型容器真正「不变」，就给它装一个**函数属性形态的写口**（strictFunctionTypes 生效处）；写成方法简写，写口就因双变豁免失守。这也是正文 §5「目标侧是方法简写走双变」实测规则的价值所在。

**readonly 的两种待遇（实测里最出乎意料的一条）。** 对象属性的 readonly 不参与方向检查：readonly 属性可以赋给可变属性位（实测通过），反过来亦可——对象属性的 readonly 只是类型层的「视角」，不设防。而**数组的 readonly 修饰符参与方向检查**：`Dog[]` 可赋给 `readonly Animal[]`（协变方向，实测通过），但 `readonly Dog[]` 赋给 `Animal[]` 报 TS4104（`The type 'readonly Dog[]' is 'readonly' and cannot be assigned to the mutable type 'Animal[]'`）。数组作为整体有自己的方向语义，这是全册唯一一处 readonly 真正拦住赋值的地方。工程结论：想要「只放行读、拦住写」的容器签名，用 `readonly T[]`（或 `ReadonlyArray<T>`），别指望对象属性的 readonly——它防君子不防赋值。

## 规范原文对照：结构类型、双变豁免与健全性目标

**原文一（结构类型的定义）。** TS Handbook《Type Compatibility》开篇：

> "Type compatibility in TypeScript is based on structural subtyping. Structural typing is a way of relating types based solely on their members. This is in contrast with nominal typing."

以及基本规则：

> "The basic rule for TypeScript's structural type system is that x is compatible with y if y has at least the same members as x."

解读：限定词两个。"solely on their members"——只看成员，不看名字与继承关系（正文 §1 的结构判定、§4 的 brand 模式必要性都由此而来）；"at least"——「至少有」，多出来的成员不妨碍赋值（宽度子类型的原文依据；正文 §2 的多余属性检查是叠在这条规则上的独立防错层）。同页区分两种兼容性的话也值得背：

> "In TypeScript, there are two kinds of compatibility: subtype and assignment. These differ only in that assignment extends subtype compatibility with rules to allow assignment to and from any, and to and from enum with corresponding numeric values."

解读：日常遇到的可赋值性检查默认走 assignment 兼容——比子类型多了 any 与 enum 的豁免。`any` 的「双向豁免」由此有了精确出处：它不是联合也不是交集，是 assignment 兼容层的特批。

**原文二（健全性是 non-goal）。** 官方《TypeScript Design Goals》Non-goals 第 3 条：

> "Apply a sound or 'provably correct' type system."

原文随即给出替代口径：在正确性与生产力之间取平衡（"strike a balance between correctness and productivity"）。解读：正文 §8 的「TS 并非完全 sound」不是缺陷陈述，是设计目标的**自述**。把本册的几处刻意不健全对号入座：`as` / `any` / 非空断言是逃生舱（作者显式声明越过检查）；数组协变与方法双变是兼容性妥协（为存量代码让路，TS 2.6 原文已引在正文 §5）；纯可变属性容器的协变放行（上一节 PropBox 收据）是结构规则的自然结果、没有被额外拦堵。三类的共同点：都能用「平衡」解释；不同点：工程防御手段完全不同——第一类靠纪律，第二类靠写法（函数属性），第三类靠 `readonly T[]`。

**原文三（方差标注的定位）。** TS 4.7 Release Notes 的 "Optional Variance Annotations for Type Parameters" 小节引入 `in` / `out` 标注（`interface Producer<out T>`、`interface Consumer<in T>`）。解读与实测口径：官方定位是给复杂类型的创作者一个显式声明方差的手段，主要服务文档与工具链；实测本机 5.9.3 下把标注写反（`interface BadOut<out T> { set(v: T): void }`）**编译器并未报错**——至少在本机版本里它不是防线。把它当文档读，别当闸门用；真正的闸门仍是成员方向检查（FnBox 形态）。

## 手推配方：四步推方差

给任意泛型类型手推 T 的方差方向：

1. **圈位置**：把 T 的每一处出现抄下来，别漏嵌套位置（函数返回值里的参数、Promise 里的回调参数都算）；
2. **标极性**：函数参数位记负、返回位记正；读写分离的对象属性拆成读口（正）与写口（负）两个位置；嵌套位置极性相乘；
3. **下结论**：全正 → 协变；全负 → 逆变；正负混合 → 不变；拿不准就先按不变对待；
4. **双向实测**：写两个方向的赋值（`F<Dog>` 赋 `F<Animal>` 与反向），用探针法读编译器裁决——极性推理给预期，实测给收据；两者对不上时以实测为准，回头检查第 2 步是否漏了位置。

worked example（正文 §5 方向表的推导过程）：

```ts
type Producer<T> = { get: () => T };              // T 全正 → 协变
type Consumer<T> = { set: (x: T) => void };       // T 全负 → 逆变
type Both<T>     = { get: () => T; set: (x: T) => void }; // 正负混合 → 不变（FnBox 实测双向皆拒）
type Cb<T>       = (cb: (x: T) => void) => void;  // 负 × 负 = 正 → 协变（实测通过）
```

注意第 4 步的仲裁地位：极性推理是模型，编译器是裁判——本册「表格与实测的唯一出入」（纯属性容器其实放行协变）正是靠第 4 步发现的。理论与实测冲突时，更新的是笔记，不是编译器。

## 工程三陷阱：方差与标记类型的三个翻车点

**陷阱一：回调参数写窄了，报错后用 any 灭火。** 触发场景：把 `(e: MouseEvent) => void` 接到期望 `(e: Event) => void` 的槽位——参数逆变方向被拒（实测 TS2322，报错里能看到 `Types of parameters ... are incompatible`）；有人顺手把回调签名改成 any。根因：参数位逆变，只有「槽位要什么就吃什么」的函数合法；写窄的函数在槽位传入父类事件时必然炸。规避：回调参数永远写「能接受的最宽」——逆变方向写宽不吃亏；事件 payload 拿不准就收窄到基类事件再 `instanceof` 或谓词细分；用 any 灭火等于永久关掉这处检查，写宽只花一次工夫。

**陷阱二：readonly 的两种待遇混为一谈。** 触发场景：团队以为给字段标 readonly、参数标 `Readonly<T>` 就「不可变」了；实际上对象属性的 readonly 不参与赋值方向检查（实测放行）、不阻止别名引用背后的修改、也不递归嵌套。真正设防的场景：函数签名用 `readonly T[]` 才拦得住调用方向里 push（实测 TS4104）；对象字面量的不可变要靠约定加防御性拷贝（`toSorted`、`structuredClone` 这类返回新值的 API）。根因：readonly 是类型层的视角标注，不是运行时冻结；`Object.freeze` 才是运行时机制，但类型层又表达不完整。规避：接口设计先分清「防编译错误」还是「防运行时修改」——前者用 `readonly T[]` 与函数属性写口，后者用 freeze 与拷贝，两边别互相当替身。

**陷阱三：brand 在序列化边界泄漏。** 触发场景：`UserId` 是 `Brand<number, 'UserId'>`，构造处只有 `makeUserId` 一个签发口；某天缓存层写了 `const id = JSON.parse(raw) as UserId`——裸 number 直接披上 brand 外衣，校验环节全被绕过，类型层全绿。根因：brand 只存在于类型层（运行时 `uid` 就是 `1001`，正文 §4），而 as 可以凭空「签发」；签发口靠的是自觉，不是编译器。规避：序列化边界（JSON.parse、URL 参数、postMessage）拿到的类型一律先落 unknown 再走校验谓词；把「`as Brand` 只许出现在 makeXxx 函数体内」写进团队规范；要更强可换 unique symbol 做 brand 键（正文 §4 提到的加强版），至少让跨模块的误用变难。

## code review 检查单：类型理论相关评审 8 条

- [ ] 回调参数写的是「能接受的最宽」吗？有没有用 any 灭逆变报错的火（陷阱一）？
- [ ] 「只读容器」签名用的是 `readonly T[]` 或 `ReadonlyArray` 吗？对象属性的 readonly 有没有被当成运行时冻结的保证（陷阱二）？
- [ ] 泛型容器的写口是有意选方法简写（放宽检查）还是函数属性（严格检查）？意图写进注释了吗（机制深一层）？
- [ ] brand 类型的 `as` 签发是否全部集中在唯一的 make 函数里？序列化边界有没有直接断言 brand 的（陷阱三）？
- [ ] 「先存变量再赋值」绕过多余属性检查的代码，是在利用规则还是防御错误（正文 §2）？
- [ ] 用 unknown 接住外部数据后走了完整收窄链吗？有没有 `as` 直通（正文 §7 与 09 册 §12）？
- [ ] 共享可变数组的两个变量意识到了吗？写入点有没有被 `readonly T[]` 签名拦住（正文 §5 的 Cat 案例与 node 收据）？
- [ ] 「TS 这里怎么这么笨」的抱怨点，核对过设计目标 Non-goals 吗——是缺陷还是平衡（规范原文对照原文二）？

## 输出预测题（进阶）

先写答案再验证；三题全部经 tsc 5.9.3（`--strict`）实测，收据写在解析里。

**题 1**（never 与 unknown 矩阵）：

```ts
type A = never extends unknown ? 1 : 0;
type B = unknown extends never ? 1 : 0;
type C = unknown extends string ? 1 : 0;
type E = [unknown] extends [never] ? 1 : 0;
type D = string & number;
const a: A = 'x'; const b: B = 'x'; const c: C = 'x';
const e: E = 'x'; const d: D = 'x';
```

五行各自的求值结果是什么？

**题 2**（「不变」的精确条件）：

```ts
class Animal { name = 'a'; }
class Dog extends Animal { fetch() { return 1; } }
interface PropBox<T> { value: T }
interface MethodBox<T> { value: T; set(v: T): void }
interface FnBox<T> { value: T; set: (v: T) => void }
declare const p1: PropBox<Dog>;   const p2: PropBox<Animal> = p1;    // 甲
declare const m1: MethodBox<Dog>; const m2: MethodBox<Animal> = m1;  // 乙
declare const f1: FnBox<Dog>;     const f2: FnBox<Animal> = f1;      // 丙
declare const g1: FnBox<Animal>;  const g2: FnBox<Dog> = g1;         // 丁
```

甲、乙、丙、丁各通过与否？

**题 3**（弱类型检测的现行表现）：

```ts
interface Opt { a?: number; b?: number }
const v1: Opt = { c: 1 };
const v2: Opt = { a: 1, c: 2 };
declare const w: { a: number; b: number; c: number };
const v3: Opt = w;
```

三行各报什么？

## 进阶预测题答案

**题 1**（收据：探针报错逐条给出求值结果）：A = `1`——never 是一切类型的子类型，恒走真分支；B = `0`——unknown 是全集，全集不是空集的子集；C = `0`——unknown 只能赋给 unknown 与 any；E = `0`——元组阻断后做可赋值性判断，unknown 不可赋 never；D = `never`——交集为空（报错原文 `not assignable to type 'never'`）。五条合起来是 top 与 bottom 的完整坐标：never 只进不出、unknown 对外只出不进。

**题 2**（收据即机制深一层的表）：甲通过——纯可变属性协变放行；乙通过——方法简写写口被双变豁免；丙报 TS2322——函数属性写口下 strictFunctionTypes 生效，参数逆变被拒；丁报 TS2322——value 读口虽然协变放行，set 的参数方向反过来又被拒。丙与丁双向皆拒，才是正文 §5 表格「不变」的精确形态——精确条件是「存在函数属性形态的写口」。

**题 3**（收据：三行的实测表现）：v1 与 v2 都报 TS2353（`Object literal may only specify known properties, and 'c' does not exist in type 'Opt'`）——弱类型检测（零公共属性）与多余属性检查（显式写出的未知键）在本机 5.9.3 收敛为同一条报错形态；v3 通过——w 是变量不新鲜，结构规则放行多余成员。记忆点：字面量直赋处处设防、变量赋值只查结构，正文 §2 的 freshness 规则在弱类型场景完全适用。

## 收尾自测（增补）

1. 位置极性的乘积规则是什么？各举一个「负负得正」的实测类型（Cb）与「全正」的容器（HandlerFn），并说出各自的判定收据。
2. 「不变」的精确成立条件是什么？三种 Box 形态各自的裁决来自哪条检查规则？
3. readonly 在对象属性与数组两种场合的待遇差异是什么？想拦住调用方写数组，正确签名怎么写（TS4104 收据）？
4. 设计目标 Non-goals 第 3 条如何同时解释 as 与 any、数组协变、方法双变三处不健全？三者各自的工程防御手段分别是什么？

---

## 机制深一层（二）：协变写操作的事故现场与「协变的两个防守位」

**独立复跑的事故现场（node 收据）。** 正文 §5 的 Cat 案例值得用最小脚本独立复跑一遍——三个类、一次协变赋值、一次 push、一次遍历：

```js
class Animal {}
class Dog extends Animal { fetch() { return 1; } }
class Cat extends Animal {}
const dogs = [new Dog()];
const animals = dogs;            // 协变赋值，类型层放行
animals.push(new Cat());         // 类型层完全合法（Cat 是 Animal）
for (const d of dogs) d.fetch(); // 运行时炸
```

node v24 实测输出：`TypeError: d.fetch is not a function`，栈顶正是遍历那一行。三个要点：其一，事故不是编译器的锅——每一行类型检查都按规则正确通过了，崩的是「协变放行 + 写口不设防」这个组合；其二，栈顶在**读**的那一行（fetch），根因却在**写**的那一行（push），排查时方向容易搞反；其三，JS 侧没有任何防护，全部防线都在类型层——这正是「类型层有意不健全」时工程防线必须补位的原因。

**两个防守位。** 防守位一在**签名层**：对外暴露的容器参数一律声明 `readonly T[]`（实测 TS4104 拦住调用方把 readonly 数组转回可变数组再写），写口用函数属性形态（机制深一层的 FnBox）让双向皆拒。防守位二在**数据层**：共享可变集合在跨界处做防御性拷贝（`toSorted`、`slice`、`structuredClone`），把「协变放行的入场券」隔离在拷贝边界之外。两个防守位针对同一事故链条的两个环节：签名层拦「外部往里写」，数据层拦「别名共享导致的隐式写」——正文 §5 的 dogs 与 animals 正是后者，拷贝之后 `animals.push` 就伤不到 `dogs` 了。

## 排查速查表：类型理论症状速查（本机实测口径）

六行全部在 tsc 5.9.3（`--strict`）或 node v24 下实测复现：

| 症状（报错或行为） | 触发场景 | 根因 | 处置 |
| --- | --- | --- | --- |
| TS2322 `Types of parameters ... are incompatible` | 回调参数写窄、父类泛型赋子类位 | 参数逆变（strictFunctionTypes 对函数属性生效） | 参数写宽；确需收窄在函数体内做 |
| TS2322 且涉及 `__brand` | brand 互赋、裸值赋 brand | 字面量标记使结构不再重合（正文 §4） | 走 makeXxx 签发口；别 `as` 绕过 |
| TS2352 `Conversion of type ... may be a mistake because neither type sufficiently overlaps` | 不相关类型间 as | 断言的重叠性检查拦下（09 册 §11） | 确认类型错了就改类型；确要越狱用 `as unknown as` 并写理由 |
| TS4104 `The type 'readonly ...[]' is ... and cannot be assigned to the mutable type` | readonly 数组转可变数组 | 数组 readonly 修饰符参与方向检查 | 保持只读视角；要改就显式拷贝出新数组 |
| TS2353 `Object literal may only specify known properties` | 字面量直赋带未知键 / 零公共属性的弱类型 | 多余属性检查与弱类型检测 | 改对键名；先存变量绕过是利用规则不是修复 |
| 运行时 `TypeError: d.fetch is not a function` | 协变数组 push 异类后按原类型读 | 数组协变 + 写口不设防（机制深一层（二）） | `readonly T[]` 签名 + 防御性拷贝双防守 |

排查心法：类型理论的报错先把**方向**念出来——「谁赋给谁、哪个成员拦的」，再对照方差规则判断是「规则 correctly 拦住了你」还是「规则放过了你」；前四行是规则在拦，后两行是规则放过、防线在别处。

## 输出预测题（补充）：协变事故与断言守门

**题 4**（协变事故现场）：不运行，预测上一节 JS 脚本的输出与崩溃行。

**答案**：正常打印无输出（脚本没有成功打印任何东西就崩了），抛 `TypeError: d.fetch is not a function`，栈顶在 `for (const d of dogs) d.fetch()` 这一行（node v24 实测）。三个易错直觉：以为崩在 push（push 在类型层和运行时都合法——Cat 确实是 Animal）；以为 `const animals = dogs` 会拷贝数组（它只复制引用，两个变量共享同一存储）；以为类型检查会在编译期拦住（数组协变刻意放行，这是 Non-goals 第 3 条的妥协现场）。

**题 5**（断言守门）：`const b = a as B`（A 只有 x、B 只有 y）报什么？把意图改成「明知不重叠就是要转」该写什么？

**答案**：报 TS2352，原文 `Conversion of type 'A' to type 'B' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.`——注意报错文本**自带**了双重断言的写法提示，正文 09 册 §11 说「双重断言绕过 2352」的机制依据就是这句：重叠性检查只拦一步，`as unknown` 先落全集再转即可绕过。所以正解分两层：类型真的错了就改类型声明；明知不重叠、确需过渡（例如修不了的第三方声明）才用 `as unknown as B`，并且必须留注释写清运行时依据——守门的门是 TS2352，钥匙是注释纪律。

## 册末补记：类型理论的一页卡片

把本册压成四条卡片，每条都挂着实测收据。

**卡片一：结构类型的两条规则。** 判定只看成员（"solely on their members"）、成员「至少有」即可（"at least"）——宽度子类型是主规则，多余属性检查与弱类型检测是叠在字面量上的两道防错层（TS2353 收据）。所有「为什么这个能赋」的问题，先问形状，再问是不是字面量。

**卡片二：方向来自位置。** 参数逆变、返回协变、位置嵌套取乘积（Cb 收据）；「不变」不是默认而是「存在函数属性写口」的结果（三种 Box 收据）；方法简写的历史豁免写在 TS 2.6 原文里，豁免的代价是 Cat 进了狗窝（node 收据）。

**卡片三：top 与 bottom 各司其职。** unknown 是安全屋（进得来、出不去，TS18046 收据在 09 册）、never 是空集（谁也进不去、它进得去一切，进阶预测题 1 的矩阵收据）；交集为空即 never（string 与 number）；any 是双向豁免的特批，出处就是 assignment 兼容与子类型差别的原文。

**卡片四：不健全是设计目标，不是事故。** Non-goals 第 3 条同时解释三处妥协；每处妥协都有对应的工程防线——as 与 any 靠纪律与注释，方法双变靠写法选择，数组协变靠 `readonly T[]` 加防御性拷贝。卡片的结论句：**每条「怪」规则先问「防什么错」——防不了的那个口子，就是它换来的生产力**。

面试场景里，这四张卡片的用法是「顺着问题找卡片」：问兼容性走卡片一，问泛型方向走卡片二，问 any 与 unknown 走卡片三，问「TS 为什么不检查这个」走卡片四。每张卡片至少挂着一条本机复现的收据，口述完可以补一句「本机 tsc 5.9.3 实测过」——理论与证据同时交付，是这套笔记的最终口径。

## 规范原文对照（续）：TS 2.6 双变豁免原文的逐句拆读

正文 §5 引过 TS 2.6 Release Notes 的原文，这里逐句拆——因为每个从句都对应一条今天仍然生效的行为：

> "The stricter checks apply to all function types, except those originating in method or constructor declarations."

「all function types」——函数属性、函数类型别名、内联回调全部受严格检查；「except those originating in method or constructor declarations」——豁免看的是**声明形态**（方法简写语法本身），不是「语义上是不是方法」：同一个签名写成方法简写就豁免、写成函数属性就严格。机制深一层的三种 Box 收据，正是这句原文在当代编译器上的逐字验证。

> "Methods are excluded specifically to ensure generic interfaces like `Array<T>` continue to relate covariantly."

「specifically」二字把动机钉死：这不是疏忽，是刻意——若方法参数也严格逆变，`Array<T>` 的 `push(x: T)` 会让 `Array<Dog>` 不再可赋给 `Array<Animal>`，存量代码（含 DOM 回调签名）大面积编译失败。由此得到一条今天仍然成立的推论：**数组协变能成立，恰恰依赖方法双变给它让路**——两条「不健全」是共生关系，不是并列关系。写库时把这句当选择器：想要「对子类型友好、写口宽松」的接口（数组、事件总线）用方法简写；想要「写口严格、双向设防」的接口（不可变容器、函数式工具类型）用函数属性。两种 API 形态的选择，从类型理论的高度有了各自的名字。
