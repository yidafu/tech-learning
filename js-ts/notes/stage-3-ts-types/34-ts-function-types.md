---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
  - 12-ts-utility-types
  - 13-ts-type-theory
  - 33-ts-classes-and-interfaces
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
