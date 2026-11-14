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
