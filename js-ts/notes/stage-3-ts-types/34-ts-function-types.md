---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
  - 12-ts-utility-types
  - 13-ts-type-theory
  - 33-ts-classes-and-interfaces
sources:
  - stage-3-ts-types
---
# 34 · 函数类型深入：重载 / void / this / 构造签名

> 对应大纲：阶段 3.2/3.5 延伸——函数作为类型系统里最复杂的复合结构（重载解析、void 豁免、方法双变豁免、this 参数、NoInfer）
> 前置：笔记 13（协变/逆变——参数位是逆变）、12（ThisParameterType/OmitThisParameter 工具类型清单）
> 配套练习：`exercises/ts-function-types/01-overloads.ts`、`02-this-void-constructor.ts`

## 学习目标

1. 讲清「函数属性写法 vs 方法简写」在 `strictFunctionTypes` 下的分叉：后者参数双变豁免——并知道这是历史包袱而非设计福利
2. 掌握重载的完整规则：解析自上而下取**第一个**命中、实现签名对外不可见、实现签名必须兼容全部重载；以及「什么时候不该用重载」
3. 说清 void 返回的豁免方向（什么允许、什么不允许）与设计意图（回调不关心返回值）
4. 会用 `this` 参数给游离函数钉住 this，会用构造签名 / `abstract new` 描述「类本身」
5. 识别泛型函数的「推断源污染」，会用 `NoInfer`（TS 5.4）圈定不参与推断的位置

## 关键概念

### 1. 两种函数声明写法：`strictFunctionTypes` 只管其中一种

一手依据：TS 2.6 Release Notes《`--strictFunctionTypes`》——"the stricter checks apply to all function type positions, **except those originating in method or constructor declarations**"。

```ts live noInline
interface Both {
  prop: (x: string | number) => void; // 函数属性写法：参数逆变严格检查
  method(x: string | number): void;   // 方法简写：参数双变豁免（历史包袱，为了兼容大量旧接口如 Array）
}
declare const b: Both;
const wide = (x: string | number | boolean): void => undefined;
const narrow = (x: string): void => undefined;

b.prop = wide;    // ✓ 属性位：源参数必须「装得下」目标的 string|number（更宽才行——逆变的安全方向）
b.method = narrow; // ✓ 方法位：同一句换到属性位就报错——这正是两种写法的分叉
// b.prop = narrow; // ✗ TS2322：调用方可能传 number，string 参数装不下
```

这正是笔记 11 §3.2 的伏笔：`infer` 在方法简写上推断退化回联合的原因就是这条豁免。**新代码一律用函数属性写法**（`(x: T) => R`），方法简写只出现在描述既有 JS API 的 `.d.ts` 里。

### 2. 重载：三条规则撑起全部行为

一手依据：Handbook《2.1 Functions · Function Overloads》。

**规则 1：解析自上而下，第一个命中的签名胜出**（后面的不再看）：

```ts live noInline
function pick(x: string | number): 'both';
function pick(x: string): 'str';
function pick(x: any): any { return typeof x; }
const r1 = pick('a'); // 'both'——第一条就命中，尽管第二条「更精确」
```

推论：**签名顺序就是优先级**。`createElement(tag: 'div'): HTMLDivElement` 要排在 `createElement(tag: string): HTMLElement` 前面，宽的放最后兜底。

**规则 2：实现签名对外不可见**——它只用于检查函数体：

```ts live noInline
function len(x: string): number;
function len(x: string[]): number;
function len(x: any): number { return x.length; } // 实现签名：只有函数体检查能看到它
const n1 = len('abc');  // ✓ 走第一条
const n2 = len([1, 2]); // ✓ 走第二条
// len(123) —— 报错：No overload matches this call。
// 实现签名是 any 并不代表能这么调：对外可见的只有前两条
```

**规则 3：实现签名必须同时兼容所有重载签名**（否则报 "This overload signature is not compatible with its implementation signature"）。

**什么时候不该用重载**：重载的价值在「不同参数形态 → 不同返回类型」。如果只是参数可以接受多种类型、返回类型却相同，用联合参数一个签名搞定（`x: string | string[]`）——重载版本会让调用方在每处都看到展开的多条签名，且 IDE 补全更啰嗦。**先写联合，返回类型确实要分叉时才升级成重载**。

### 3. void 返回：一条单向豁免

一手依据：Handbook《Assignability of Functions》"Return type void" 一节。

```ts live noInline
type Callback = () => void;
const c: Callback = () => 42; // ✓ 允许：返回值被忽略（设计意图：回调的调用方不关心返回值）
const d: Callback = () => 'x'; // ✓ 同上

type Returns = () => number;
// const e: Returns = () => {}; // ✗ 反方向不行：答应返回 number 就必须返回
function declaredVoid(): void {
  // return 42; // ✗ 显式标注 void 的函数体内 return 表达式报错
}
```

要点：豁免是**赋值层面**的（函数值可以「多返回」），不是**使用层面**的——`const x = c()` 里 `x` 是 `void`，拿不到那个 42。这条规则让 `Array.prototype.forEach(action: (v) => void)` 能接受返回任意值的回调。

### 4. 构造签名与「类本身」的类型

函数类型描述「怎么调用」，构造签名描述「怎么 new」；两者可以同体（`Date` 是现成例子——不加 `new` 得到字符串，加了得到实例）：

```ts live noInline
interface DateFactory {
  new (value: number): Date;      // 构造签名：描述 new 表达式的产物
  (value: number): string;        // 调用签名：描述直接调用的产物（自定义形态可以这样写）
}
type D = typeof Date; // Date 静态侧天然是「可调用 & 可构造」的交叉
// 注意真实 Date 的调用签名是无参 (): string（lib.es5.d.ts）——JS 语义：直接调用忽略参数返回字符串

// abstract new：描述「抽象类构造器」——可以 extends 它，但不能直接 new
type AbsCtor = abstract new (...args: never[]) => { kind: string };
declare const AC: AbsCtor;
class Sub extends (AC as new () => { kind: string }) { } // 落地时要收窄掉 abstract 标记
```

`InstanceType<C>` / `ConstructorParameters<C>`（笔记 12 §5/§6）就是从构造签名上 `infer` 的直接应用；`new (...args) => T` 与 33 篇 mixin 的 `Constructor<T>` 是同一件事的两种出场方式。

### 5. `this` 参数：把 this 写进函数类型

`this` 作为**第一个参数**出现在函数签名里，不占实际参数位（运行时消失），作用是把「这个函数打算被谁调用」钉进类型：

```ts live noInline
interface Db {
  conn: string;
  query(this: Db, sql: string): string[]; // this 参数：调用方必须是 Db
}
declare const db: Db;
const q = db.query;
// q('select 1') —— 报错：The 'this' contexts of ... are not compatible
// 必须绑走：q.call(db, 'select 1')、db.query.bind(db)、或重新通过 db 调用
```

- `ThisParameterType<T>` 提取 this 参数类型、`OmitThisParameter<T>` 生成「不需要 this」的版本（内部机制：返回 `T extends (this: unknown, ...args) => R ? (...args) => R : T`）
- **箭头函数不能声明 this 参数**（它没有自己的 this，写了报错）——「游离函数要钉 this 用 this 参数，方法内部的 this 想转交用箭头函数」，两个方向别混
- noImplicitThis（strict 家族成员）就是靠 this 参数体系给「裸函数里的 this」报警的

### 6. 推断源污染与 `NoInfer`（TS 5.4）

多个参数共享一个类型参数时，**每个参数位置都是推断候选**，TS 把它们合并——有时把 T 推宽导致错误消失或延迟：

```ts live noInline
declare function makeUnique<T>(collection: Set<T> | T[], ...items: NoInfer<T>[]): Set<T> | T[];
declare function makeUniqueLax<T>(collection: Set<T> | T[], ...items: T[]): Set<T> | T[];

const s1 = makeUnique(new Set([1, 2, 3]), 4);   // T = number（只从 collection 推）；items 传 string 会**当场报错**
const s2 = makeUniqueLax(new Set([1, 2, 3]), '4'); // T = string | number：调用不报错，Set<number> 被静默放宽成 Set<string | number>
```

`NoInfer<T>` 包住的位置「只消费 T、不产生推断候选」——官方引入动机正是这类 API（TS 5.4 Release Notes）。同类场景：回调收 T 的 API（`create<S>(init: S, onChange: (v: NoInfer<S>) => void)`），圈错推断源后错误从「使用处静默变宽」提前到「调用处报错」。

## 可运行示例

```bash
npx tsx exercises/ts-function-types/01-overloads.ts          # 重载顺序实验 / 实现签名不可见 / 联合参数替代
npx tsx exercises/ts-function-types/02-this-void-constructor.ts # void 豁免方向 / this 参数 / 构造签名同体

# 类型检查：
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-function-types/01-overloads.ts
# （02 同理）
```

## 易错点与面试高频

1. **重载解析「第一个命中即停」**：宽签名写在窄签名前面，后面全部变死代码（不报错但永远不命中）。面试常给 `f('a')` 问返回类型，考的就是顺序。
2. **实现签名不是兜底**：`len(123)` 不能因为实现是 `any` 就通过——对外只看声明签名列表。反过来实现签名太窄（漏掉某个重载的形态）会报 not compatible。
3. **方法简写参数双变是豁免不是特性**：新接口用函数属性写法；诊断「为什么两个函数参数不兼容」时先看声明形态（方法 or 属性），再谈逆变。
4. **void 豁免只发生在赋值方向**：`() => number` 可赋给 `() => void`，反之不行；显式标注 `: void` 的函数体内不能 `return 表达式`。`forEach(v => list.push(v))` 能编译就是这条豁免。
5. **this 参数与 bind/call 的类型联动**：声明了 `this: Db` 的函数直接裸调会报 this 不兼容——这正是「把 this 依赖显式化」的目的，修法是绑定或改箭头函数捕获。
6. **`NoInfer` 解决的是「推断源污染」**：多个位置共享 T 时某位置只想消费不想贡献候选。5.4 之前只能靠拆函数、加显式类型参数等笨办法。

## 输出预测题

**题 1**：以下重载，三个调用的返回类型各是什么？`f3(42)` 能通过编译吗？

```ts live noInline
function f3(x: string | number, radix?: number): number | string;
function f3(x: number, radix: number): number;
function f3(x: any, radix?: any): any { return typeof x === 'number' ? parseInt(String(x), radix) : x; }
const a = f3('10');
const b = f3(10, 2);
const c = f3('10', 2);
```

**题 2**：判断以下四个赋值哪些合法，并各用一句话说明依据：

```ts live noInline
type VoidCb = (x: number) => void;
type NumCb = (x: number) => number;
declare const num: NumCb;
declare const voidCb: VoidCb;

const q1: VoidCb = num;
// const q2: NumCb = voidCb;
type NarrowCb = (x: number | string) => void;
const q3: NarrowCb = num;
type MethodHaver = { m(x: number | string): void };
declare const mh: MethodHaver;
// mh.m = num;
```

## 深挖三节：函数类型的机制底账

### 重载声明的"声明列表"本质：实现签名不可见

重载最容易读错的一点：**对外类型系统里只有声明签名列表，实现签名对调用方完全不可见**。编译器对重载函数的处理分两个世界：

| 世界 | 可见什么 | 用它做什么 |
|---|---|---|
| 调用侧 | 声明签名列表（自上而下逐个试） | 选第一个参数形态兼容的重载 → 决定返回类型 |
| 实现侧 | 声明列表 + 实现签名 | 校验"实现签名与全部声明兼容"（每个声明的参数实现都接得住、返回都能给） |

题 1 的坑（`f3(10, 2)` 返回联合）用这张表重述一遍：第二条声明在调用侧**永远轮不到**，不是实现写了什么的问题——声明列表是唯一的类型事实。反过来"实现签名不是兜底"（易错点 2）也来自同一结构：实现侧的校验是"逐条声明反向核对"，而不是"反正实现是 any 就行"。两句话合起来：**声明列表是合同，实现签名只是履行合同的方式，履行方式再宽松也改不了合同文本**。

### void 豁免的精确表述：箭头在赋值方向上"单向放行"

`forEach(v => list.push(v))` 这类代码能编译，精确机制是三条规则的合取：

1. 源函数 `v => list.push(v)` 的返回类型被**上下文推断为 void**——箭头函数体是表达式语句（非 return）时，返回类型就是 void，`push` 的返回值（新长度 number）被丢弃；
2. 即使写成 `(v): number => list.push(v)`，赋给 `VoidCb` 仍合法——**返回方向的 void 豁免**（题 2 的 q1）；
3. 豁免**只在这一个方向、只对返回类型**——把"可能返回 void"的函数放进"承诺返回 number"的位置（q2）立刻报错。

三条里最常被漏的是第 1 条：很多人以为那条代码"靠豁免活下来"，其实它根本没触发豁免（返回类型本来就是 void）。**豁免是为第 2 种写法（显式返回值）兜底的**——把这个层次理清，`forEach` 风格回调的三种写法（无 return / 有 return / 显式标注）各自为什么通过，就都有了独立答案。

### this 参数：把运行时的暗约定抬进类型签名

`function f(this: Db, sql: string)` 的 `this` 参数在运行时不存在（编译期擦除，不占实参位），它的全部价值是**把"这个函数必须在什么 this 下调用"从注释抬进签名**：

```ts live noInline
interface Db { query(sql: string): unknown[] }
declare function run(this: Db, sql: string): unknown[];
declare const db: Db;

// run('select 1');                    // ✗ this 隐式为 undefined，编译期就报
const bound = run.bind(db);
bound('select 1');                      // ✓ bind 后 this 类型对齐
db::run;                                 // 箭头捕获不了 this——方法与 this 参数是两种约定
```

三个联动记忆点：bind/call 的重载认识 `this` 参数（`ThisParameterType` 工具类型就是为它存在）；类方法简写天然带隐式 this（所以两者不能混标）；箭头函数没有自己的 this，对它标 `this` 参数直接报错。**this 参数与 33 册的 polymorphic this 是一对互补：前者约束"调用方必须提供什么 this"，后者约束"子类里 this 是什么"——一个向内收约定，一个向外传类型。**

## 深挖两节：推断源污染与重载的替代方案

### NoInfer 走查：推断源污染的现场与三种处置

"多个位置共享 T，某位置只想消费"的污染现场：

```ts live noInline
declare function withDefault<T>(arr: T[], fallback: T): T[];
// 期望：从 arr 推 T，fallback 只跟随
withDefault([1, 2, 3], "x");   // 症状：T 被推断成 (number | string)[]？
// 精确机制：T 的候选来自两个位置——arr 的元素 (number) 与 fallback (string)
// TS 取候选的并集/最佳公共超型 → number | string，arr 参数变成 (number|string)[]
```

不惊慌的读者要分辨一个层次：`withDefault([1,2,3], "x")` **能编译**——污染的后果不是报错，而是**推断出的类型比你想要的宽**（丢失了"数组是纯数字"这一事实）。修复三种路：

| 方案 | 写法 | 适用 |
|---|---|---|
| 拆推断源（5.4 前的正解） | `withDefault<T>(arr: T[], fallback: NoInfer<T>): T[]` 或拆两层函数 | 5.4+ 直接用 NoInfer；旧版用泛型中转 |
| 调用侧显式钉死 | `withDefault<number>([1,2,3], "x")` | fallback 类型错误时**顺便让这里报错**（往往正是你想要的） |
| 改签名分离角色 | `withDefault<T, F>(arr: T[], fallback: F): T[]` 且只返回 T | fallback 类型天然异构（如"占位任意"） |

NoInfer 的机制一句话：**把该位置从 T 的候选源里除名，但保持它对 T 的依赖**（除名不当会报"反向约束找不到推断源"）。判断用不用它的试金石：这个参数是"参与定义 T"还是"消费 T"？参与（`merge(a: T[], b: T[])`）就让它进候选；消费（fallback/配置/回调默认值）就 NoInfer。

### 重载 vs 联合返回 vs 泛型：同一问题的三张契约

"一个函数可能返回 string 或 number"有三种建模，选错是函数类型设计的最高频事故（题 1 的 `f3` 正是反例）：

| 建模 | 签名形态 | 调用方拿到的类型 | 什么时候对 |
|---|---|---|---|
| 重载（分叉正确） | `(x: string): string; (x: number): number;` | 按入参精确分支 | 入参形态与返回形态**一一对应** |
| 联合返回 | `(x: S \| N): S \| N` | 联合，调用方要收窄 | 真的无法从入参判断返回形态 |
| 泛型镜像 | `<T extends S \| N>(x: T): T` | 字面量被收紧为 `'10'`（字面型） | 想保留**字面量精度**的透传 |

题 1 里 `f3` 的问题是"该用重载却用了联合"——调用方拿到 `number | string` 后每次使用都要收窄，而明明入参已经锁定了形态。三条选型线：**入参定返回 → 重载；返回真的不可预知 → 联合；透传保持精度 → 泛型镜像**。再叠加本册的顺序规则（窄在前），重载写法的完整检查单是：分叉有没有漏、窄的排前面、实现签名兼容全部声明——三步过完才算"会写重载"。

## 收束：函数类型设计的四问检查单

写（或 review）一个函数签名时按序过四问，本册全部内容都挂在这四问上：

1. **this 依赖标了吗？**——裸调会崩的函数该带 `this:` 参数，而不是靠注释（this 参数一节）；
2. **返回形态入参能定吗？**——能定就重载（窄在前），真不可预知才联合，透传保精度用泛型镜像（三张契约一节）；
3. **参数位置谁是推断源？**——"参与定义 T"的才进候选，纯消费者 NoInfer（污染现场一节）；
4. **回调的返回类型留空还是 void？**——"结果被丢弃"的契约用 void 表达，顺手白拿单向豁免（void 三条规则）。

四问各自对应的错误形态：漏标 this（运行时崩）、重载顺序错（类型静默变宽）、推断源污染（类型静默变宽）、返回类型随手 any（豁免全失效）。**两种"静默变宽"是函数类型事故的主力**——它们不报错，只是把你已知的信息悄悄丢掉，review 时对宽类型多问一句"这个宽是必要的吗"，就能接住大半。

## 延伸阅读

- TS Handbook《2.1 Functions》：重载与 void 赋值规则的一手出处
- TS 2.6 Release Notes《`--strictFunctionTypes`》：方法/构造声明豁免的原文
- TS 5.4 Release Notes《NoInfer Utility Type》：推断源污染的官方场景
- 笔记 13 §5（协变/逆变总表）与 12 §9（ThisParameterType/OmitThisParameter）：本篇的上下游
- lib.dom.d.ts 里 `typeof Date` / `Array['forEach']`：构造签名同体、void 回调豁免的生产级标本

---

## 预测题答案

**题 1**：

- `a = f3('10')`：只匹配第一条（第二条要求 x 是 number）→ 返回类型 **`number | string`**（尽管运行时其实返回字符串 '10'，类型是联合——这正是「应该用重载分叉返回类型却没分干净」的典型味道）。
- `b = f3(10, 2)`：第一条也匹配（radix 可选、x 接受 number）→ 自上而下第一个命中是第一条，返回 **`number | string`**！第二条永远轮不到（它不是第一条的真子集形态时才可能命中）。这是本题埋的坑：想让 number 入参拿到 number 返回，**必须把窄签名排在前面**。
- `c = f3('10', 2)`：匹配第一条 → `number | string`；通过编译。

**题 2**：

- `q1` **合法**：返回 void 的目标类型接受任何返回值（void 单向豁免）。
- `q2` **非法**：答应返回 number 的位置放一个可能不返回值的函数，返回类型不兼容（豁免只有 void 方向）。
- `q3` **非法**：参数逆变要求**源函数参数能装下目标类型可能传来的值**。`NarrowCb` 的调用方会传 `number | string`，而 `num` 只接受 `number`——`number` 不是 `number | string` 的超类型，报「Types of parameters 'x' are incompatible」。反过来，`(x: number | string | boolean) => void` 赋给 `NarrowCb` 才合法（参数更宽，装得下）。注意返回方向本来有 void 豁免兜着，但参数方向先失败——两个方向**各自独立判定**。
- `mh.m = num` **合法**（若取消注释）：方法简写位置双变豁免——尽管 `num` 只接受 number、调用方可能传 string，strictFunctionTypes 不检查方法声明，放行。这个「不报错」本身就是方法豁免的活证据（也是该避免方法简写的理由）。

## 附录一：机制深一层——重载解析的手推配方（五步）

重载解析发生在「调用表达式」上，把 checker 的行为压缩成固定五步，任何题面都能照此手推：

**第一步：列出候选。** 对外可见的只有声明签名列表，实现签名不参与（§2 规则 2）——候选集在声明处就已确定，与实现体毫无关系。

**第二步：验参数数量。** 每条声明的必选参数数、可选参数数、剩余参数构成一个「可容纳区间」，实参数量落在区间内才继续，否则该条声明立即淘汰（实测错误码 `TS2554: Expected 2 arguments, but got 1.`——数量不合格是最先淘汰的一关）。

**第三步：逐参数位判 assignability。** 对每个实参问一句「实参类型可赋给这条声明的形参类型吗」——注意方向是**实参给形参**（协变的调用安全方向，与赋值兼容时的参数逆变相反，两件事别混）。联合类型的实参按整体判定：`string | number` 装不进 `string` 形参——联合不逐成员拆开试（收据见附录六题 3）。

**第四步：第一个全过的声明胜出，返回类型取自它。** 后面的声明不再看——「更精确」无意义，顺序即优先级（§2 规则 1）。

**第五步：全军覆没报 TS2769。** 错误信息自带推演轨迹，实测结构：

```text
TS2769: No overload matches this call.
  Overload 1 of 2, '(x: string): "s"', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'string'.
  Overload 2 of 2, '(x: number): "n"', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'number'.
```

每条「Overload N of M」就是该声明在第三步的失败记录——**读 TS2769 不用猜，它把每条候选的死因都写全了**。排查时从第一条失败原因往回推：多数时候是实参比想象中宽（联合、字面量放宽成 string、null 混入）。

**手推配方表**（写题与排查共用）：

| 步骤 | 判定什么 | 失败呈现 |
| --- | --- | --- |
| 候选列表 | 只有声明签名 | 实现签名再宽也帮不了调用方 |
| 数量 | 实参数落入容纳区间 | TS2554 |
| 逐位 assignability | 实参可赋给形参（整体判定，联合不拆） | 并入 TS2769 的逐条说明 |
| 胜出 | 第一条全过的声明 | 返回类型取声明不取实现 |
| 兜底 | 无声明通过 | TS2769（附每条死因） |

**实现侧的对称检查**（TS2394）走同一套参数比较，方向反过来：实现签名必须「装得下」每条声明的形态——实测原文 `This overload signature is not compatible with its implementation signature.`。两侧用同一条参数比较规则，方向相反：调用侧是实参喂给声明，实现侧是声明喂给实现。记住这一对，TS2394 与 TS2769 就是一张纸的正反面。

## 附录二：strictFunctionTypes 豁免边界的精确账本

§1 引用的 TS 2.6 原文「except those originating in method or constructor declarations」容易被读成「构造器类型一律双变」。本节用 tsc 5.9.3 的检查器源码与实测矩阵，把豁免边界钉到 AST 节点级。

**检查器源码实证**（typescript 5.9.3 编译产物中 `compareSignaturesRelated` 的实际判定，注释里的数字为 SyntaxKind 编号）：

```js
const strictVariance = !(checkMode & 3 /* Callback */) && strictFunctionTypes
  && kind !== 175 /* MethodDeclaration */
  && kind !== 174 /* MethodSignature */
  && kind !== 177 /* Constructor */;
```

三个事实一次看清：其一，豁免与否取决于 `kind`——**目标（被赋给的那一侧）签名的声明节点类型**，与源签名无关；其二，豁免清单只有三种节点：方法声明（类体内 `m() {}`）、方法签名（接口与类型字面量里的 `m(x): v` 简写）、类构造器声明（类体内 `constructor(x) {}`）；其三，构造器类型注解 `new (x: string) => T` 的节点是 ConstructorType（编号 186）——**不在豁免清单里**。

用 TS API 实测两种目标签名的 declaration kind（收据）：`typeof C` 的构造签名 decl 是 `Constructor(177)`（豁免），注解 `new (x) => T` 的 decl 是 `ConstructorType(186)`（严格）。至此「constructor 豁免」的准确含义是：**只有类声明自己的静态侧豁免，注解世界一律严格**。

**四行矩阵收据**（tsc 5.9.3 加 `--strict`，源函数形参 string、目标要求容纳 string 加 number，即「源更窄」的不安全方向）：

| 目标形态 | 声明节点 | 判定 | 结果 |
| --- | --- | --- | --- |
| `new (x: string \| number) => C` 注解 | ConstructorType(186) | 严格 | 报 TS2322 |
| `typeof C`（类声明静态侧） | Constructor(177) | 双变豁免 | 放行 |
| 接口里的构造签名声明 `new (x): C` | ConstructSignatureDeclaration | 严格 | 报 TS2322 |
| 函数类型注解 `(x: string \| number) => C` | FunctionTypeNode | 严格 | 报 TS2322 |

第四行与方法位对照：同样的窄源函数赋给接口方法签名（MethodSignature 174）实测放行——方法豁免依然健在，恰是新代码的陷阱（附录四陷阱二）。TS 2.6 文档里的「constructor declarations」指的是类内构造器声明节点，从来不含注解写法；把「构造器双变」当成注解世界的规则，是这句历史措辞最常见的误读。

一句话收束：**豁免跟着「目标是怎么声明的」走，不跟着「它像不像构造器」走**。`typeof C` 一家人双变，`new (...) => T` 注解一家人严格——写工厂签名时想要宽松就传类声明类型，想要严格就写注解，两种意图从此都有准确的语法开关。

## 附录三：this 参数与泛型 this 的两套账

**this 上下文是签名的一部分。** §5 的 `query(this: Db, sql: string)` 裸调实测：

```text
TS2684: The 'this' context of type 'void' is not assignable to method's 'this' of type 'Db'.
```

读法：游离变量 `q` 的 this 上下文被定为 void，与声明要求的 Db 比较、不兼容——this 参数把「调用必须有接收者」抬进了 assignability 判定，与参数、返回类型并列为第三条检查轴。`bind` 在 lib 里的签名正是绕这条轴的官方通道（lib.es5.d.ts 骨架，简化）：`bind` 的 this 参数要求「源函数声明了 this 类型 T」，第二参数收 `thisArg: T`，返回剥离 this 的纯参数函数——`ThisParameterType` 与 `OmitThisParameter` 两个工具类型就是这套签名上提取与剥离的公开 API。

**泛型 this（多态 this 返回）的函数册视角。** 33 册 §6 从类链看 `add(p): this`，函数册补一枚推演齿轮：this 返回类型在 assignability 上靠「this-is-type」关系支撑——`incr(): this` 的实例调用时，this 由接收者的真实类型代入（SubCounter 调用代入 SubCounter），链上不降级。它与 this 参数是一对互补（本册深挖三节已给结论）：this 参数约束「调用方必须提供什么 this」，多态 this 约束「子类里返回什么 this」；一进一出，方向相反。

**两者互斥的边界**：箭头函数既不能声明 this 参数（没有自己的 this），也不需要多态 this（捕获词法 this）——两套账都对箭头函数关账。review 时「游离函数钉 this 参数、方法用多态 this 返回、回调转交用箭头捕获」三句各管一段，混用即报错或静默失效。

## 附录四：工程三陷阱

**陷阱一：宽声明在前，窄声明永不命中——类型静默变宽而非报错。** 现象：`f(x: string | number): 'both'` 排在 `f(x: string): 'str'` 之前，`f('a')` 永远拿联合类型，编译器全程零警告。根因：附录一第四步「第一个全过即胜」，顺序错误不触发任何诊断。修复与自检：声明列表写完后，为每个期望分支写一行赋值断言（`const probe: 'str' = f('a')`），窄签名排前面直到断言全绿；CI 里保留这几行断言就是顺序回归测试。

**陷阱二：新接口用方法简写，逆变错误被豁免吞掉。** 现象：业务接口写成 `m(x: string | number): void`，随后把只接受 string 的回调赋给它——零报错（豁免），运行时传 number 进回调崩溃。根因：附录二矩阵第四行的 MethodSignature 豁免。修复：新代码一律函数属性写法 `(x: string | number) => void`；方法简写只留给描述宿主既有 API 的 `.d.ts`。

**陷阱三：删掉 this 参数的「结构假等价」。** 现象：嫌 `query(this: Db, sql)` 裸调报 TS2684 麻烦，删掉 this 参数——全项目立即编译通过，运行时 this 指向 undefined 才崩。根因：this 参数是唯一把 this 依赖写进类型的通道，删掉后检查轴消失，风险回到注释层。修复：保留 this 参数并在调用点 bind；确需「剥离 this」的场合用 `OmitThisParameter` 生成显式类型，让「我知道这里没有 this 依赖」成为类型事实而非注释。

## 附录五：排查速查表（错误码均为 tsc 5.9.3 加 `--strict` 实测）

| 错误码 | 报错原文（截取） | 机制归属 | 修复方向 |
| --- | --- | --- | --- |
| TS2769 | No overload matches this call.（附每条死因） | 附录一第五步 | 读逐条失败原因，收窄实参或补声明 |
| TS2554 | Expected 2 arguments, but got 1. | 附录一第二步（数量） | 补实参或改可选/剩余参数 |
| TS2394 | This overload signature is not compatible with its implementation signature. | 实现侧对称检查 | 放宽实现签名，装下全部声明 |
| TS2684 | The 'this' context of type 'void' is not assignable to method's 'this' of type 'Db'. | this 上下文轴 | bind / call / 经接收者调用 |
| TS2322 | Types of parameters 'x' are incompatible. Type 'number' is not assignable to type 'string'. | 参数逆变严格检查（注解位） | 源形参写宽，目标形参写窄 |
| TS2345 | Argument of type 'string' is not assignable to parameter of type 'number'. | 推断源被圈定后（NoInfer）当场报错 | 修正实参或重划推断源 |

用法与 33 册速查表一致：先按错误码定位机制行，再回对应附录展开。TS2322 与 TS2345 是同一参数比较在「赋值位」与「实参位」的两个入口，修复思路相反——前者改类型声明，后者改调用。

## 附录六：输出预测题（第三、四道，附逐步解析）

**题 3（联合实参的重载失配）**：以下代码能通过编译吗？返回类型是什么？

```ts
declare function ov(x: string): 's';
declare function ov(x: number): 'n';
const flag = Math.random() >= 0;
const t1 = ov(flag ? 'a' : 1);
```

**答案**：不能通过，实测 TS2769，两条声明的死因分别是「string 加 number 装不进 string」与「装不进 number」。逐步推演：条件表达式的类型是联合 `string | number`——联合在运行时只取其一，编译器却必须保证**任一情况**都安全；附录一第三步按整体判定，联合可赋给联合、不可赋给成员，两条声明双双失败。常见误答是「返回 `s` 或 `n` 视运行时定」——重载没有运行时之分，解析纯靠编译期类型；要容纳联合实参，必须显式加一条联合形参声明 `ov(x: string | number): 's' | 'n'`（放最后兜底）。这道题是「重载解析只看静态类型」的最短反证。

**题 4（豁免边界矩阵）**：同一个窄构造器与窄函数（形参 string），赋给四种目标形态，哪些通过？

```ts
class C { constructor(x: string) {} }
declare const nc: new (x: string) => C;
declare const wf: (x: string) => C;

const m1: new (x: string | number) => C = nc;
const m2: typeof C = nc;
interface ICtor { new (x: string | number): C }
const m4: ICtor = nc;
const m3: (x: string | number) => C = wf;
```

**答案**（tsc 5.9.3 实测收据）：只有 `m2` 通过；`m1`、`m3`、`m4` 全部报 TS2322。逐步解析：`m2` 的目标是类声明静态侧——声明节点 Constructor(177) 在豁免清单（附录二矩阵第二行）；`m1` 的目标是构造器类型注解——ConstructorType(186) 不豁免，参数严格逆变判负；`m4` 的目标是接口里的构造签名声明——同样不在豁免清单（矩阵第三行），这是「构造器豁免」最常被误读的一条边界：接口写出的 `new` 签名并不享受类构造器的宽松待遇；`m3` 是函数注解，向来严格。一句话：**四种「构造器长相」里只有类声明自己双变**——想利用豁免，传类型得写 `typeof C`；想严格，写注解。

## 附录七：泛型声明混入重载列表时，次序规则照旧且代价更隐蔽

声明列表里混入泛型签名时，五步配方不变，但第三步多了一个动作：**每条候选独立做类型参数推断，推断失败或推断结果不满意都会让该候选出局**。次序规则照旧——第一条能「推断加匹配」成功的声明胜出。两个实测推论（tsc 5.9.3 收据）：

```ts
declare function g<T>(x: T): T;
declare function g(x: string): 'str';
const r1 = g('a');      // 第一条（泛型镜像）先命中，T 被推断为字面量 "a"
const bad: 'str' = g('a'); // 实测 TS2322: Type '"a"' is not assignable to type '"str"'
```

推论一：第二条 `'str'` 声明成了**永不过案的死代码**——泛型镜像 `T` 能装下任何实参，只要它排在前面，后面所有声明失去存在意义。这与 §2 规则 1 同源，但危害更隐蔽：普通宽签名（联合形参）至少把返回类型写死成联合，泛型签名还会把字面量精度「白送」给调用方，让错误调用（传错内容仍返回看似精确的类型）显得可信。收据里 `bad` 的报错原文恰好是反证：编译器以为返回 `"a"`（精确到字面量），语义上却想要 `'str'`——推断越「聪明」，错误越晚暴露。

推论二：**重载列表里泛型放最后是惯例而非风格**——`createElement(tag: string): HTMLElement` 的兜底形态若换成 `createElement<T extends HTMLElement>(tag: string): T`，会把「任意标签返回任意元素」的谎话写进类型。泛型候选的正确用法是「形参和返回都由 T 说话」的自适应场景（透传、镜像），而不是兜底场景。

手推配方追加一条：看到重载列表里**首条是泛型签名**，先问「它是不是想兜底」——是，整份列表作废重来；否（真镜像），确认后续声明全都「泛型装不下」（比如形参是具体字面量联合）才有存在意义。这一问接住的是重载与泛型混用时最阴的一类静默事故。

## 附录八：方法简写去留的迁移账本（含生产标本）

附录二钉死了豁免边界，工程上的后续问题是：存量代码里方法简写怎么处理。给一张「去留账本」，按场景给结论：

| 场景 | 结论 | 理由 |
| --- | --- | --- |
| 新业务接口 | 函数属性写法 | 豁免是漏洞不是福利（§1 结论，附录二给了机制收据） |
| 描述宿主既有 API 的 `.d.ts` | 保留方法简写 | 宿主本身就是豁免世界（Array、Node 定时器回调），照实描述 |
| `Array.prototype.sort(comparefn?)` 这类标准库形态 | 不动 | lib 是豁免世界的标本库，改写反而失真 |
| 团队公共类型的迁移 | 分批，先新后旧 | 一次性改写会引爆大量「以前靠豁免活着」的赋值点 |

生产标本看 lib.dom.d.ts 或 lib.es5.d.ts：`Array` 的方法全走方法简写——这不是历史疏忽，是 strictFunctionTypes 引入时（TS 2.6）为了不破坏海量既有代码的**兼容决定**，豁免本身就是为这个标本库开的口子。读标准库时带着这层滤镜：凡是方法简写，参数检查都是双变的，模仿它写业务代码等于主动关掉逆变防线。

迁移的增量操作只有一步有风险：把接口成员从 `m(x: T): R` 改成 `m: (x: T) => R` 后，原先靠豁免通过的赋值点会**批量冒出 TS2322**——这些正是被豁免吞掉的真错误，属于「编译器还债」，不该顺手用 `as` 压掉；逐个修到类型对齐，豁免残留才算清零。反过来，从函数属性改回方法简写永远是静默的（检查只会变松），所以迁移方向只有一条：**单向驶向严格**。给 code review 立一条可执行的判定：diff 里出现「函数属性改成方法简写」一律问动机，答不出宿主兼容理由就打回。

## 附录九：上下文敏感回调的解析时序——体检查在选定之后

回调参数不带注解（上下文敏感的箭头函数）与重载相遇时，解析时序有一个反直觉的细节：**重载选择不看回调体**。实测收据（tsc 5.9.3）：

```ts
declare function useThing(cb: (x: string) => void): void;
declare function useThing(cb: (x: number) => void): void;
useThing((x) => { const p: number = x; });  // 报错：Type 'string' is not assignable to type 'number'
useThing((x) => { const q: string = x; });  // 通过
useThing((x) => { const r: boolean = x; }); // 报错：Type 'string' is not assignable to type 'boolean'
```

三行调用的实况：哪怕回调体对第一条声明的形参类型不成立（第一、三行的 `number`、`boolean` 断言），**调用仍然锚定第一条声明**——`x` 全部拿到 `string`，没有一条走第二条 `number` 声明；回调体的错误以 TS2322 出现在体位置，是「选定签名之后」的体检查阶段报出来的，从不升级为 TS2769、也从不触发换声明重试。

时序表述：带未注解参数的箭头回调对每条声明都能「装进去」（参数位没有任何承诺），于是第一条声明永远是赢家；选定后，形参按第一声明的类型做上下文标注，体才被检查。次序规则（§2 规则 1）在上下文敏感回调上比普通调用更绝对——普通调用实参带类型承诺，不合适会淘汰声明；回调体没有这层承诺，淘汰机制失灵。

工程含义：用重载给「双形态回调 API」建模（`(x: string) => void` 与 `(x: number) => void` 两条声明）是错误建模——调用方写 number 逻辑时，报错会声称类型是 string（第一条的形参类型），排查方向直接被带偏。正确建模两条路：联合形参 `cb: (x: string | number) => void`（调用方自行收窄），或泛型 `cb: (x: T) => void` 由实参侧决定。一句话：**重载的按形态分叉只对「带类型承诺」的实参有效，回调体永远吃第一条**。

## 附录十：收束——检查单从四问扩到六问

正文以四问检查单收束本册，附录又添两问，合并成最终版六问（review 函数签名时按序过）：

1. **this 依赖标了吗？**（正文问一）
2. **返回形态入参能定吗？**（正文问二）
3. **参数位置谁是推断源？**（正文问三）
4. **回调的返回类型留空还是 void？**（正文问四）
5. **宽窄的次序与形态对了吗？**——重载窄在前；泛型不兜底（附录七）；「双形态回调」不用重载建模（附录九）；需要构造器豁免传 `typeof C` 不写注解（附录二）。
6. **这些「宽松」是宿主兼容还是历史包袱？**——方法简写只留在 `.d.ts`（附录八）；每一处豁免都该说得出为谁而开。

新增两问对应的错误形态：问五漏过是「类型静默变宽或锚定错声明」，问六漏过是「逆变防线被逐段拆掉」——两者都不报错，只有 review 能拦。六问各自能索引到附录的具体收据行，检查单因此不是口诀，是收据目录。




