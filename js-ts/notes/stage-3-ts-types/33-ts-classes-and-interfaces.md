---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
  - 12-ts-utility-types
  - 13-ts-type-theory
sources:
  - stage-3-ts-types
---
# 33 · 类与接口的类型系统

> 对应大纲：阶段 3.5 延伸——结构类型的例外与类作为「名义类型岛」（补全：声明合并、private 的名义化、this 类型、mixin）
> 前置：笔记 13（结构类型 vs 名义类型）——本篇是它在 class/interface 上的展开
> 配套练习：`exercises/ts-classes-interfaces/01-interface-vs-type.ts`、`02-nominal-this-mixin.ts`

## 学习目标

1. 拿全 `interface` vs `type` 的真实差异清单（声明合并、隐式索引签名、extends 冲突呈现），不再靠「interface 描述对象」这种口诀
2. 讲清 TS 的结构类型在类上的**两个例外**：private/protected 成员的「同源检查」，以及 `#private`（真私有）与 `private`（擦除）的差别
3. 掌握类声明的「两面」：实例类型 vs `typeof C` 静态侧，以及抽象构造签名 `abstract new`
4. 会用多态 `this` 类型写流式 API（Builder 模式），说清它比写死类名的返回类型强在哪
5. 会写 `declare global` 扩展内置对象（Window/Array），知道声明合并的危险面
6. 理解 mixin 的类型模式：`Constructor<T>` + 交叉类型组合

## 关键概念

### 1. interface vs type：真实差异清单

一手依据：Handbook《2.1 Interfaces》+ TypeScript Wiki「Interfaces vs Type Aliases」（issue #15300 的结论沉淀）。

| 维度 | `interface` | `type` 别名 |
| --- | --- | --- |
| 描述对象形状 | ✓ | ✓（还能描述联合/元组/原始/条件类型） |
| 声明合并 | ✓ 同名自动合并（见 §2） | ✗ 同名报「Duplicate identifier」 |
| **隐式索引签名** | ✗ **没有** | ✓ 对象字面量形状**有**（可赋给 `Record<string, X>`） |
| 继承冲突呈现 | `extends` 遇不兼容同名属性**立即报错** | `&` 交叉把同名属性**静默合成 `never`/交集**，使用处才炸 |
| 错误信息 / hover | 具名展示，读起来是「形状」 | 别名展开，复杂类型 hover 更长 |

隐式索引签名是面试与实战双高频坑：

```ts live noInline
interface IPoint { x: number; y: number }
type TPoint = { x: number; y: number };

const fromType: Record<string, number> = { x: 1, y: 2 } as TPoint; // OK：对象字面量形状的别名可赋给索引签名
// const fromIface: Record<string, number> = { x: 1, y: 2 } as IPoint;
// ↑ 报错：Index signature for type 'string' is missing in 'IPoint'
// 原因：interface 开着「未来可被声明合并出任意成员」的口子，编译器不敢替它担保「所有属性都是 number」
```

继承冲突呈现差异（决定你选哪个的实操理由）：

```ts live noInline
interface A { kind: string }
interface B extends A { kind: number } // 立即报错：Type 'number' is not assignable to type 'string'

type C = { kind: string } & { kind: number };
// 不报错！C['kind'] 是 string & number，即 never——错误推迟到使用处
```

结论不是「永远用 interface」：需要联合/条件/映射类型只能 `type`；公开 API 的可扩展对象（如 Window、第三方插件注入点）应该用 interface（让用户声明合并）；内部封闭形状用 type（换取索引签名兼容与更早的冲突报错——两者理由相反，按场景选）。

### 2. 声明合并：interface 的超能力与危险面

一手依据：Handbook《Declaration Merging》。

同名 interface 自动合并（成员并集）；同名属性必须**类型完全一致**，否则报「Subsequent property declarations must have the same type」；同名**方法**合并成**重载**（后声明的排前面）：

```ts live noInline
interface Window { __APP__?: { version: string } } // 危险示范：顶层直接合并全局接口（非模块文件才生效）
```

模块文件里扩展全局对象的正确姿势是 `declare global`：

```ts live noInline
declare global {
  interface Window {
    __APP_CONFIG__: { apiBase: string };
  }
}
// 此后任何地方 window.__APP_CONFIG__ 都有类型——原理就是「合并进 lib.dom.d.ts 的 Window」
export {};
```

三种合法合并对象：interface + interface、interface + class（class 隐式声明了同名 interface）、interface + namespace（namespace 导出的值成为静态侧成员）。危险面：**任何人都能给你的接口塞成员**——对库作者，public interface 等于开了一扇后门（命名撞车、用户意外改变第三方类型）；所以库的封闭类型常刻意用 `type` 别名（不能合并）表达「不接受扩展」。

### 3. 类声明的两面：实例类型与 `typeof C`

类名做类型注解时指**实例侧**；`typeof 类名` 才是**静态侧**（构造器本身 + 静态成员）：

```ts live noInline
class Point {
  static origin = new Point(0, 0);
  constructor(public x: number, public y: number) {} // 参数属性简写：声明 + 赋值一步完成（编译期生成 this.x = x）
  static fromTuple(t: [number, number]) { return new Point(t[0], t[1]) }
}
type P = Point;          // 实例类型：{ x: number; y: number }
type PCtor = typeof Point; // 静态侧：(new (x: number, y: number) => Point) & { origin: Point; fromTuple: ... }

const P2: typeof Point = class extends Point {}; // 工厂/依赖注入场景：任何「同签名构造器」都行
```

抽象类的静态侧携带「抽象性」——`typeof AbstractC` 不能被 `new`，只能被继承；要在类型层描述「可实例化的子类构造器」，用 `new (...args) => AbstractC`（丢掉抽象标记）或保留 `abstract new (...args) => AbstractC`（允许抽象子类）。`InstanceType<typeof C>` 正是从静态侧挖实例类型的内置工具（笔记 12 §6）。

### 4. 结构类型的例外：private/protected 让类「名义化」

一手依据：Handbook《2.1 Interfaces · Private members》——两个类都有 private 成员时，**只有当这些成员起源于同一处声明**，结构兼容才成立。

```ts live noInline
class Car { private vin = 'x'; drive() {} }
class Truck { private vin = 'y'; drive() {} } // 结构与 Car 完全同形（除私有成员来源）

const c: Car = new Truck(); // 报错：Types have separate declarations of a private property 'vin'
// 换成 public vin 或去掉 vin，这一行立刻合法——结构类型回来了
```

这是 TS 在「纯结构」上开的口子：private 成员外部不可访问、结构上不可观察，编译器改用**同源判定**——效果上让类获得名义类型的行为（一个 `Truck` 不是 `Car`，哪怕一模一样）。`protected` 同理。品牌类型（笔记 13 §4 的 brand 模式）正是把这种「同源即名义」用 `{ __brand }` 私有字段人工复刻。

`#private`（ES 真私有，TS 3.8）与 `private`（TS 擦除）的差别：

| | `private` | `#field` |
| --- | --- | --- |
| 检查层 | 编译期，擦除后消失 | 编译期 + **运行时**（WeakMap 语义） |
| 绕过方式 | `(obj as any).x`、方括号取值都能到达 | 运行时任何途径都拿不到（语法错误/undefined） |
| 结构比较 | 同源检查（名义化） | 同样同源检查（名义化） |
| 与 JS 兼容 | 纯 TS 语法 | 标准 JS，esbuild/SWC 原生支持 |

### 5. implements vs extends：检查与继承是两件事

- `implements` 只做**形状检查**，不提供任何实现、不自动生成构造器（子类构造器仍需 `super`）；一个类可 implements 多个接口
- `extends` 是**实现继承**（单继承）；抽象类强制子类补全 `abstract` 成员
- 冷门但准确：**接口可以继承类**——`interface I extends Klass {}` 把类的形状（含 protected/private）抄成接口；此时只有 `Klass` 及其子类能 `implements I`（因为私有成员同源要求）——这是 TS 里第二条「名义通道」

### 6. 多态 this：流式 API 与 F-bounded

`this` 作为返回类型是**多态的**——调用者身上是哪个子类，返回的就是哪个子类：

```ts live noInline
class Builder {
  private parts: string[] = [];
  add(p: string): this { this.parts.push(p); return this; } // 返回 this，不是 Builder
  build(): string { return this.parts.join(''); }
}
class HtmlBuilder extends Builder {
  bold(): this { return this.add('<b>'); } // 子类方法继续返回 this
}
const out = new HtmlBuilder().add('x').bold().add('y').build();
// 若 add 返回写死 Builder，链上的 .bold() 直接报错——多态 this 让继承链上的链式调用不降级
```

F-bounded（自类型约束）是它在泛型上的镜像：`class Node<T extends Node<T>>` 用「T 必须是我这种东西」表达可比/可链式的自引用接口（`compareTo(other: this)` 保证比较双方类型严格一致，而不是「同为父类」）。

### 7. mixin：用「函数 + 交叉」组装类

TS 没有多重继承，mixin 的标准模式（Handbook《Mixins》，TS 2.2 示例定型）：

```ts live noInline
type Constructor<T = {}> = new (...args: any[]) => T; // 静态侧构造签名的通用别名
// 注意 any[]：这个类型要被「new + 传参」调用；never[] 只适合约束位（笔记 32 的 curry 签名是逆变、从不调用）

function WithTimestamp<B extends Constructor>(Base: B) {
  return class extends Base { timestamp = Date.now(); };
}
function WithTag<B extends Constructor>(Base: B) {
  return class extends Base { tag = 'none'; };
}

class Plain { constructor(public name: string) {} }
const Item = WithTag(WithTimestamp(Plain)); // 逐层包：返回类型是「类 & timestamp & tag」的交叉
const it = new Item('x');
// it.name / it.timestamp / it.tag 全部有类型——每层 mixin 的返回类型都是「B & 新成员」
```

要点：mixin 函数的返回值是**类表达式**，其类型由 TS 自动推断为「基类构造器 + 新成员」的交叉；`Constructor<T>` 别名把「接受任何构造器」写进签名。Vue 的 `defineComponent` 混入、Angular/旧 React HOC 都是这套模式的变体。

## 可运行示例

```bash
npx tsx exercises/ts-classes-interfaces/01-interface-vs-type.ts    # 声明合并/隐式索引签名/extends vs & 冲突
npx tsx exercises/ts-classes-interfaces/02-nominal-this-mixin.ts   # private 名义性实验 + Builder + mixin 组装

# 类型检查：
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-classes-interfaces/01-interface-vs-type.ts
# （02 同理）
```

## 易错点与面试高频

1. **「interface 和 type 有什么区别」的高分答法**：不要背「interface 描述对象」——按本篇 §1 的四行差异清单答（声明合并方向、隐式索引签名、extends 冲突立即报错 vs `&` 静默 never、错误呈现），并给出「按场景选」的结论。
2. **`Record<string, X>` 拒收 interface 不拒收同形状 type**：隐式索引签名差异（§1），第三方库暴露的回调参数若是 interface，你的泛型容器经常因此报「Index signature is missing」——解法是改收 `T` 约束或对输入做映射拷贝。
3. **两个结构相同的类互不兼容**：八成是 private/protected 同源检查在生效（§4）。反过来，「想让结构相同的两个类型不兼容」也可以主动放一个 `private __brand` 进去——名义化是特性不是 bug。
4. **`C` vs `typeof C`**：注解实例用前者，传递构造器/写工厂用后者；`InstanceType<typeof C>` 与 `ConstructorParameters<typeof C>` 都从静态侧挖（笔记 12 §5/§6）。
5. **多态 this 被写死的返回类型毁掉**：链式 API 方法一律 `: this`；写 `: Builder` 会让子类链式调用直接降级报错。Vue/Immutable.js 的链式类型全靠它。
6. **declare global 只在模块里需要**：非模块文件（没有 import/export）顶层 interface 直接合并全局；模块内必须 `declare global` 包一层——否则你的 interface 只是模块局部声明。
7. **`&` 交叉同名属性不报错**：类型默默变 `never`，错误推迟到使用处——「用 extends 提前暴露冲突」是接口在大型继承体系里的真实优势。

## 输出预测题

**题 1**：以下代码四处赋值，哪些通过、哪些报错？说明各自被哪条规则拦截或放行：

```ts live noInline
class A { private id = 1; hello(): string { return 'a' } }
class B { private id = 2; hello(): string { return 'b' } }
interface IA { hello(): string }

const x1: IA = new A();
const x2: A = new B();
const x3: B = new A();
const x4: IA = { hello: () => 'obj' };
```

**题 2**：`type F = { kind: string } & { kind: number }` 与 `interface I1 { kind: string } interface I2 extends I1 { kind: number }`：

1. `F` 能通过类型检查吗？`F['kind']` 是什么？
2. `I2` 能通过吗？报什么错？
3. 基于两者行为差异，给出「大型公开 API 的类型应该选哪个」的一条理由。

## 延伸阅读

- TS Handbook《2.1 Interfaces》（Private members 一节是同源规则的一手出处）、《Declaration Merging》、《Mixins》
- TypeScript Wiki / issue #15300「Interfaces vs Type Aliases」：隐式索引签名差异的权威讨论
- TS 3.8 Release Notes：`#private`（ECMAScript Private Fields）与 TS `private` 的官方对照
- 笔记 13 §4（brand 名义化技巧）：本篇 §4 的「人工复刻」方向
- Vue `defineComponent` / 旧版 mixin 类型定义：`Constructor<T>` 模式的生产用法

---

## 预测题答案

**题 1**：

- `x1` **通过**：`IA` 只要求 `hello`，`A` 结构满足（id 是 private 但 IA 没要求它——private 成员只在「两边都有同名 private」时参与比较）。
- `x2`、`x3` **报错**：A、B 各自有 `private id`，且**起源于不同声明**——同源检查不通过，`A` 与 `B` 互不兼容（结构相同也没用，这正是「名义化」）。
- `x4` **通过**：对象字面量满足 `IA` 的形状；IA 是纯结构接口，没有任何私有成员要求。

**题 2**：

1. `F` 通过类型检查（别名声明本身不触发检查），但 `F['kind']` 是 `string & number` = **`never`**——冲突被静默吞掉。
2. `I2` **报错**：`Interface 'I2' incorrectly extends interface 'I1'`（kind: number 不能赋给 kind: string）——接口 extends 在声明处立即验证兼容性。
3. 大型公开 API 的成员形状倾向 `interface extends`：冲突在声明点当场爆出，而不是等到某个用户拿到 `never` 属性值才在使用处炸出难以追根的错误（`&` 适合「确实想求交」的场景，不适合「以为在继承」的场景）。

## 附：class vs interface 决策速查（收尾增补）

本册辨析了三组概念的真差异，收尾把"写的时候选哪个"压成决策表：

| 你要的东西 | 正确选择 | 一句话理由 |
|---|---|---|
| 纯类型契约（编译期消失） | interface | 零运行时产物，可声明合并 |
| 运行时校验 + 类型（同时要） | class（配合守卫） | 校验代码要有实体 |
| 带实现的复用单元 | abstract class | 部分实现 + 强制子类补齐 |
| 第三方数据的"形状描述" | interface | 不引入构造逻辑 |
| 联合可辨识（discriminated union） | interface ×N + 联合 | 33 册 §4 的穷尽性玩法 |
| 工厂产物的类型表达 | interface（ ReturnType 亦可） | 类型跟值走，不绑实现 |
| 需要 nominal 排除误用 | class + private 成员 / 品牌类型 | 本册 private 同源=名义岛 |

决策表的使用姿势：**先问"要类型还是要实现"，再问"要不要运行时存在"**——两问落定，选择只剩一个。多数 interface/class 的争议题（比如"DTO 用 class 还是 interface"），答案都在第二问里：入参要校验就 class + 守卫，可信来源就 interface。

### 收尾自测（增补）

1. 表中哪一行解释了"DTO 到底用哪个"？两问分别是什么？
2. interface 的声明合并与 namespace 合并，各自的真实用途是什么？滥用场景呢？
3. abstract class 与 interface 都能约束子类/实现者——什么时候 abstract 是**唯一**正确选择？（有受保护实现要复用时）
4. private 同源名义岛的工程价值举一反三：品牌类型（brand）和它是不是同一机制的两个名字？

### 决策表的机制回链（最后一段）

表里每行的"一句话理由"都能回指本册正文的机制节：

- "可声明合并"回 §2（同名 interface 自动合并——第三方类型补丁的正道）；
- "校验代码要有实体"回 §3（class 是值也是类型——守卫函数的 instanceof 分支依赖运行时存在）；
- "private 同源=名义岛"回 §5（structural 名义化的唯一原生出口——品牌类型是它的 TS 层仿制）。

机制回链齐了，决策表就不是"经验口诀"而是"机制推论"——每行都能展开成本册的一节证明。**速查表是证明的压缩包**，这是本站所有速查表共同的设计原则。

收尾一句话（增补）：interface 与 class 的分野本质是**类型宇宙与值宇宙的分野**——TS 里多数困惑，都是两个宇宙的东西被当成了同一件事。

### 补充：两宇宙的三条互操作规则

类型宇宙与值宇宙不是完全隔离的——TS 用三条规则管理互操作，本册辨析过的所有怪现象都能归到其中一条：

- **值的类型由声明决定**：class 实例的类型是"实例化它的类"（名义岛由此而来）；
- **类型的值由擦除决定**：interface 编译后不存在，纯类型位置的代码不进产物；
- **守卫是桥梁**：typeof/instanceof/in 三类守卫让值宇宙的事实"上传"回类型宇宙（unknown 收窄的唯一通路）。

三条规则齐了，"为什么这里报错那里不报"的判断就有了统一的裁判法典——先判现象在哪个宇宙、再判走的是哪条互操作规则。

### 收尾自测（增补）

5. declare 的"类型存在、值不存在"违反了三条规则中的哪一条的哪个方向？
6. instanceof 守卫为什么对 interface 无效？（值宇宙没有 interface 这个东西——它从未进值宇宙）

### 补充：interface extends 与交叉类型的最后辨析

`interface B extends A` 与 `type B = A & {...}` 多数时候等价，两个分岔点值得记住：

- **错误时机**：extends 在声明处立即校验兼容（本册自测 2 的 I2 报错）；交叉类型把不兼容合并成 `never` 属性，错误推迟到使用处；
- **冲突语义**：同名属性 extends 报错；交叉类型产生交集（`string & number` = never）——"想要的冲突"用交叉、"不该发生的冲突"用 extends 让它早爆。

一句话收束：**早失败用 extends，晚失败（表达合法冲突）用交叉**——两分岔点写进团队的类型评审清单，能消灭一半的 interface/type 之争。

把两分岔点加进你项目的类型规范只需要两行——"声明扩展用 extends（早爆）"、"合法冲突建模用交叉（never 收口）"——写进规范的那一刻，本册的机制辨析就变成了团队资产。

## 附录一：机制深一层——参数属性的四层账本

参数属性 `constructor(public name: string)` 不是单纯的语法糖：编译器为它做了三件事——**类型层**给实例类型添加同名属性、**emit 层**生成赋值语句、**检查层**在环境声明里拒绝它。三个层面各有一条真实错误码兜底，本节逐一验明（全部收据出自 tsc 5.9.3 加 `--strict`，target es2022）。

**类型层**：参数属性与「显式字段加构造器内赋值」产生的实例类型完全一致——`class C` 带 `constructor(public x: number)`，实例类型就是 `x: number`。所以参数属性不添加任何名义性（结构比较照常通过），它省的只是样板代码。想用成员做名义隔离，还是 §4 的 private 同源那一套，参数属性帮不上忙。

**emit 层**：`useDefineForClassFields` 为 true 时（ES2022 目标的默认值），参数属性被降级成「字段声明加构造器体顶部赋值」。先看源码与实跑收据：

```ts
class Task {
  label = 'field:' + 'init';
  constructor(public name: string, private note = 'note-default') {
    console.log('ctor-body sees:', this.name, this.note, this.label);
  }
}
new Task('param-arg');
```

tsc emit 出的 JS（收据，实跑）：

```js
class Task {
    name;
    note;
    label = 'field:' + 'init';
    constructor(name, note = 'note-default') {
        this.name = name;
        this.note = note;
        console.log('ctor-body sees:', this.name, this.note, this.label);
    }
}
```

node v24 实跑输出 `ctor-body sees: param-arg note-default field:init`。读出三件事：

1. 参数属性的字段声明排在类体最前（与形参声明顺序对齐），初始化器是空的——真正的赋值在构造器体顶部；
2. 类字段初始化器按声明顺序在「实例创建时」执行，先于构造器体任何语句。一手依据是 ECMA-262 类定义求值步骤（`ClassDefinitionEvaluation` 收集 `ClassFieldDefinition` 记录，实例化时由 `InitializeInstanceElements` 执行）——字段的初始化发生在构造器体语句之前；
3. 重要推论（工程陷阱一，见附录四）：**字段初始化器读参数属性永远读到 undefined**——初始化器跑的时候构造器体还没执行，赋值尚未发生。实跑收据：

```js
class P {
  tag = 't:' + this.name;
  constructor(name) { this.name = name; }
}
console.log(new P('x').tag); // 't:undefined'
```

**检查层**：两个错误码。其一，`declare class`（环境声明）里写参数属性直接报错——实测 `TS2369: A parameter property is only allowed in a constructor implementation.`。环境声明只描述类型不做实现，而参数属性的本质一半是「实现」（那条赋值语句），所以它被拒之门外；写 `.d.ts` 时必须把参数属性展开成显式成员声明。其二，参数属性与同名字段互斥——`class Dup` 里字段 `g` 与 `constructor(public g: string)` 同名，实测 `TS2300: Duplicate identifier 'g'.`，编译器不调和「一处声明、两处赋值」的归属，直接判重名。

**与声明合并的正交性**：参数属性只动「实例侧实现」，声明合并只动「声明侧类型」，两条通道互不感知。给一个带参数属性的类合并 interface，合并进去的成员不出现在构造器形参上；反过来 namespace 合并追加静态成员，也不影响参数属性的 emit。实用结论：想让成员沿继承链可见，走 extends；想给类从外部追加类型成员，走声明合并——两条通道别指望互相替代。

## 附录二：abstract 与 implements 的静态侧检查

abstract 成员有两张检查面：**声明面**（谁没补全实现）与**消费面**（谁实例化了抽象类型）。两张面各自的真实错误码如下。

**声明面：TS2515。** 抽象类的子类必须补全全部 abstract 成员，否则实测：

```text
TS2515: Non-abstract class 'Bad' does not implement inherited abstract member m from class 'Abs'.
```

措辞里的「inherited abstract member」是关键：这不是 implements 的形状检查（那是接口契约），而是 extends 链上的**成员补全义务**——抽象成员从基类一路继承，任何非抽象中间类必须把它落地，或者把自己也声明成 abstract 把义务继续下传。补全检查逐级发生，隔代继承不会漏。

**消费面：TS2511。** `new Abs()` 实测 `TS2511: Cannot create an instance of an abstract class.`。这条检查跟着**类型**走而不跟声明走，三个变体都验过：

1. `const a: typeof Abs = Impl;`（具体子类构造器赋给抽象类静态侧）**合法**——「抽象性」在 assignability 上单向放宽：具体可以给抽象，抽象不能给具体；
2. 但 `new a()` 报 TS2511——静态侧类型携带抽象标记，编译器拒绝任何经由抽象类型发起的实例化；
3. 连类型层显式写出的抽象构造签名也一样：`type AbsCtor = abstract new (...args: never[]) => SomeShape` 的值直接 `new` 同样报 TS2511。`abstract new` 类型的正当用途是**作为 extends 的目标**或工厂参数位（表示「可能还是抽象的」），最终落地侧必须是具体构造器。

**消费面的例外：成员访问不拦。** 抽象性只挡实例化，不挡成员访问——`declare const a: Abs` 之后调 `a.m()` 在类型上完全合法，因为运行时它必然是某个已补全的子类实例。这条对写抽象工厂很有用：工厂签名收 `abstract new` 构造器，内部只 new 具体子类，对外只暴露抽象基类的实例类型。

**implements 撞上 protected：TS2720。** 一个类 implements 含 protected 成员的类，实测错误是长文：

```text
TS2720: Class 'ImplP' incorrectly implements class 'Protected'.
Did you mean to extend 'Protected' and inherit its members as a subclass?
Property 'v' is protected but type 'ImplP' is not a class derived from 'Protected'.
```

机制：protected 的语义是「血缘内的可见性」，implements 的语义是「形状匹配」，两者不是一件事——形状相同但无血缘的实现不被接受。编译器给的建议（Did you mean to extend）就是正确修法：要血缘用 extends，要形状约束用 interface，别混。

**private 同源报错的准确原文**（§4 的机制在检查器里的呈现）也值得记住，实测：

```text
TS2322: Type 'Truck' is not assignable to type 'Car'.
  Types have separate declarations of a private property 'vin'.
```

「separate declarations」一语道破同源判定：比较的不是值的结构，而是声明出身。

## 附录三：装饰器与类字段语义——set 与 define 两种世界

TS 5.0 起默认实现 ES 标准装饰器（stage 3 提案，一手依据：TS 5.0 Release Notes《Decorators》与 tc39 的 proposal-decorators）。标准装饰器与 legacy（TS 4.x `experimentalDecorators`）的分界，恰好落在本册反复出现的 set/define 语义上：

| | legacy 装饰器 | 标准装饰器 |
| --- | --- | --- |
| 字段装饰器拿到的参数 | `target`、`name`、**descriptor**（含 value/get/set） | `value`、`context`（context 里有 access，没有 descriptor） |
| 工作面 | 原型上的属性描述符（set 语义假设） | 类字段定义动作（define 语义） |
| 替换字段行为 | 改 `descriptor.value` 后返回 | 返回新的初始化函数，或用 `context.addInitializer` 注册初始化器 |

机制根源：类字段在标准语义下不是原型上的属性，而是「每个实例创建时执行的定义动作」——所以字段装饰器**根本没有描述符可拿**（描述符是原型属性的元数据，字段不在原型上，访问器装饰器才拿得到 get/set）。legacy 装饰器生态（旧版 class-validator、旧 NestJS 路线）大量依赖「字段装饰器里换 `descriptor.value`」，迁移到标准装饰器时这些代码会**静默失效**而不是报错——这是 TS 5 迁移期最大的暗坑。

实践结论：新库一律标准装饰器加 `addInitializer` 模式；维护旧库时，看到「字段装饰器解构 descriptor」就知道它属于 set 语义世界，迁移方案是改成初始化器包装——把原字段值包一层函数，再由初始化器在实例上重新定义。这也反向解释了附录一收据里「参数属性被降级为字段声明加赋值」的形态：emit 层必须与 define 语义的时序保持一致，装饰器与字段才有统一的账本可查。

## 附录四：工程三陷阱（现象、根因、修复）

**陷阱一：字段初始化器读「构造器才赋值的成员」拿到 undefined。** 现象：`class C` 里 `tag = 't:' + this.name`，构造器里 `this.name = name`（或写参数属性），运行时 tag 是 `t:undefined`。根因：附录一的时序收据——字段初始化器先于构造器体执行（ECMA-262 `InitializeInstanceElements` 在构造器体语句前）。修复：初始化逻辑移进构造器体并放在赋值之后；或把 tag 改成 getter 惰性求值。review 时看到「字段初始化器引用 this 的其他成员」一律拦下。

**陷阱二：在 `declare class` 或 `.d.ts` 里写参数属性。** 现象：给第三方类补环境声明时顺手写 `constructor(private x: number)`，实测 TS2369。根因：参数属性一半是实现，环境声明没有实现的席位。修复：展开成显式成员声明——`private x: number` 作为字段声明一行，构造器照普通签名写。连带提醒：合并第三方类的类型（interface 与 class 合并）时也一样，合并侧只写类型成员，永远不带实现痕迹。

**陷阱三：子类用字段「重写」父类访问器。** 现象两副面孔：父类在同一工程里时，编译期就报 `TS2610: 'v' is defined as an accessor in class 'AccessorBase', but is overridden here in 'FieldChild' as an instance property.`（tsc 5.9.3 实测）；父类来自 `.d.ts` 或纯 JS 库时编译器看不见，运行时静默遮蔽——define 语义在实例上创建自有值属性，原型链上的 getter/setter 从此不被调用。运行时收据（node v24）：

```js
class A { get v() { return 'getter'; } }
class B extends A { v = 'field'; }
const b = new B();
console.log(b.v);                                    // 'field'（getter 未被调用）
console.log(Object.hasOwn(B.prototype, 'v'), Object.hasOwn(b, 'v')); // false true
```

修复：真要重写访问器就成对写 get/set；只是想要初始值就换个名字。review 时「子类字段名与父类访问器同名」与「父类访问器在链上」两问一起过。

## 附录五：排查速查表（错误码均为 tsc 5.9.3 加 `--strict` 实测）

| 错误码 | 报错原文（截取） | 机制归属 | 修复方向 |
| --- | --- | --- | --- |
| TS2369 | A parameter property is only allowed in a constructor implementation. | 环境声明禁止实现痕迹 | `.d.ts` 展开为显式成员 |
| TS2300 | Duplicate identifier 'g'. | 参数属性与字段同名互斥 | 二选一 |
| TS2610 | 'v' is defined as an accessor in class ... overridden ... as an instance property. | define 语义遮蔽访问器 | 成对 get/set 重写 |
| TS2511 | Cannot create an instance of an abstract class. | 抽象标记随类型走 | 经具体子类实例化 |
| TS2515 | Non-abstract class ... does not implement inherited abstract member ... | extends 链补全义务 | 补实现或自身声明 abstract |
| TS2717 | Subsequent property declarations must have the same type. | 声明合并同型约束 | 合并侧类型对齐 |
| TS2720 | Class ... incorrectly implements class ...（protected 提示） | protected 是血缘语义 | 改 extends 或改接口 |
| TS2322 | Types have separate declarations of a private property 'vin'. | private 同源名义检查 | 主动名义化或去掉 private |

用法：报错码先查此表定位「属于哪条机制」，再回正文对应小节展开。表里每一行都能在附录一至四找到带收据的完整论证——速查表是论证的压缩包，与决策速查表同一设计原则。

## 附录六：输出预测题（三道，附逐步解析）

**题 3（类字段与静态块初始化顺序）**：以下代码输出什么？

```ts
const seq: string[] = [];
class Base {
  b1 = seq.push('base-field');
  constructor() { seq.push('base-ctor'); }
}
class Sub extends Base {
  static sInit = seq.push('static-field');
  static { seq.push('static-block'); }
  s1 = seq.push('sub-field');
  constructor() { seq.push('sub-pre'); super(); seq.push('sub-post'); }
}
new Sub();
console.log(seq.join(','));
```

**答案**（node v24 实跑收据）：`static-field,static-block,sub-ctor-pre-super,base-field,base-ctor,sub-field,sub-ctor-post-super`。

逐步推演：① 静态侧最先完成——静态字段与静态块按声明顺序执行（字段在前、块在后），发生在类定义求值时，先于任何实例化；② 子类构造器体在 `super()` 前的语句可以执行（只要不碰 this），记录 sub-pre；③ `super()` 调用：基类字段 b1 初始化，随后基类构造器体执行；④ `super()` 返回的那一刻，子类实例字段 s1 才初始化（规范依据：派生类的 `InitializeInstanceElements` 在父构造器返回后执行）——所以 sub-field 落在 base-ctor 之后、sub-post 之前；⑤ 构造器体余下语句。一句话：**静态先于实例，super 返回是子类字段的起点**。`super()` 前碰 this 直接 ReferenceError，是同一时序账本的另一面。

**题 4（字段遮蔽访问器的运行时判定）**：见附录四陷阱三的收据代码，问三行输出各是什么，以及 `B.prototype` 上到底有没有 `v`。

**答案**：`'field'`；`false true`。逐步推演：字段 `v = 'field'` 按 define 语义在**实例**上创建自有值属性，读 `b.v` 时自有属性直接命中，原型链（含 A 的 getter）根本不被查询；`Object.hasOwn(B.prototype, 'v')` 为 false 证明字段不落原型——这正是「字段装饰器拿不到 descriptor」的同一根源（附录三）。TS 在父类可见时用 TS2610 把这件事拦在编译期；父类来自 `.d.ts` 时只能靠 review。

**题 5（声明合并的重载优先级）**：

```ts
interface Api {
  fetch(x: string): string;
  fetch(x: 'user'): 'user-data';
}
declare const api: Api;
const r = api.fetch('user');
const t: 'user-data' = r;
```

问：`t` 的赋值能通过类型检查吗？

**答案**：能（tsc 5.9.3 实测收据）。§2 说过「同名方法合并成重载」，本补充它的另一半：**后声明的排前面**——`fetch('user')` 首先匹配第二条声明，返回 `user-data`。推论是写声明合并时「更精确的分支要写在后面」；若两侧属性类型不一致（同名属性而非方法），才走 TS2717 的同型约束报错。方法合并成重载与属性同型检查，是声明合并的两条平行规则，别混。

## 附录七：code review 检查单（类与接口）

1. **字段初始化器不读 this 的其他成员**——时序上读到的必然是 undefined（附录一收据），初始化逻辑进构造器体。
2. **参数属性只用于无逻辑的注入字段**——有默认值以外逻辑的成员，写显式字段加构造器体，别让 emit 的隐性顺序替你做决定。
3. **`declare class` 与 `.d.ts` 不出现参数属性**——TS2369；环境声明一律显式成员。
4. **子类不重名遮蔽父类访问器**——TS2610 拦得住同工程的；跨包的靠这一条 review 红线。
5. **private 成员的名字登记进团队规范**——名义性靠「同源声明」支撑，重命名或删除都会静默改变兼容矩阵（TS2322 separate declarations）。
6. **abstract 类的 abstract 成员不带实现体**——要部分实现就拆 protected 具体方法；TS2515 的补全义务沿 extends 链逐级检查，中间类别「替子类偷懒」。
7. **工厂签名需要「可能抽象」的构造器时用 `abstract new` 类型**——落地 new 的那一处必须拿到具体构造器（TS2511 随类型走）。
8. **implements 含 protected 或 private 成员的类视为错误信号**——TS2720，先问「是不是想要 extends」。
9. **新代码装饰器用标准语义**——字段装饰器禁止解构 descriptor（不存在），扩展点用 `addInitializer`；发现 descriptor 用法即视为 legacy 迁移欠账。
10. **声明合并必须注明合并对象与动机**——`declare global` 写在模块内并注释「合并进 Window / Array 的哪个成员」；公开 API 若有意开放合并口子，在文档里写明「允许扩展」，否则用 type 别名封口。

## 附录八：手推配方——从报错原文回到机制的定位法

排查类与接口的不兼容报错，固定三步走：**先读错误码，再问「比较的是形状还是出身」，最后落到本册机制**。两道完整推演示例示范这套配方。

**示例一：`Types have separate declarations of a private property 'vin'`（TS2322）。** 第一步读错误码：TS2322 是赋值不兼容的总码，关键在第二行的措辞。第二步问比较对象：报错说的是「separate declarations」——不是属性值不等、不是形状有差，而是**声明出身不同**。第三步落机制：private 成员触发同源检查（§4），两个类的 `vin` 起源于两处声明，结构再像也不兼容。推演到此结束，修复方向自动浮现：要么让两处声明同源（抽公共基类），要么去掉 private 回归结构比较，要么利用它做名义隔离（保留报错、改变语义）。

**示例二：`Class 'ImplP' incorrectly implements class 'Protected'`（TS2720）。** 第一步读错误码：TS2720 专指 implements 一个类（而不是接口）。第二步问比较对象：protected 成员的检查走「血缘」通道——错误原文里「not a class derived from」就是血缘判定的原话。第三步落机制：§5 的「implements 是形状检查」在 protected 成员这里被打开一个口子——形状相同不足以满足 protected，因为 protected 承诺的是继承链内的可见性，一个无血缘的「同形状」实现兑现不了这个承诺。修复方向同样自动浮现：想继承保护成员用 extends；只想约束形状，把 protected 成员抽成接口。

配方的通用价值：TS 的类相关错误码几乎都在报错第二行给了**机制层的原话**（separate declarations、not a class derived from、inherited abstract member、Cannot assign an abstract constructor type）——读第一行定位「什么事不行」，读第二行定位「为什么不行」，后者直接索引到机制小节。面试里复述报错时引用第二行原话，比背错误码更见功力。

## 附录九：输出预测题（第四道，抽象性的单向门）

**题 6**：以下五行各能否通过类型检查？

```ts
abstract class Abs2 { abstract go(): void }
class Done extends Abs2 { go(): void {} }

const p1: typeof Abs2 = Done;
const p2: typeof Done = Abs2;
type C1 = abstract new (...args: never[]) => Abs2;
declare const c: C1;
const p3: typeof Abs2 = c;
const p4: C1 = Abs2;
```

**答案**（tsc 5.9.3 实测收据）：`p1`、`p3`、`p4` 通过；`p2` 报错，错误原文第二行是 `Cannot assign an abstract constructor type to a non-abstract constructor type.`。

逐行解析：

- `p1` 通过：具体子类构造器赋给抽象类静态侧——抽象性在 assignability 上单向放宽，具体是抽象的充分形态（附录二已证）。
- `p2` 报错：反向不成立。抽象静态侧携带「可能未补全」的标记，交给具体类型后调用方就能 `new` 出一个 `go` 未实现的实例——检查器用专用措辞拦下这一整类风险。
- `p3` 通过：`abstract new` 类型注解与 `typeof Abs2` 都是「抽象构造器」的两种写法，同为抽象侧互赋无碍——抽象标记跟着类型走，两边的抽象性对齐即可。
- `p4` 通过：类静态侧赋给抽象构造签名注解，同上。两个抽象形态（声明侧的 Constructor 节点与注解侧的 ConstructorType 节点）在类型层等价。

一句话延伸：**抽象性是一张单向门——具体可以充任抽象，抽象不能冒充具体**。工厂设计的直接推论：想收「可能还是抽象的」构造器就用 `abstract new` 签名，想在签名处承诺「一定可实例化」就写具体类型；前者更宽松、后者更安全，按调用方需求选。

## 附录十：第二条名义通道的实证与第七道预测题

§5 提过「接口可以继承类」是 TS 的第二条名义通道，本节把它验到错误码层。收据（tsc 5.9.3）：

```ts
class Klass { private secret = 1; }
interface IEdge extends Klass { tag: string }
class Outsider implements IEdge { tag = 'x'; private secret = 9; }
```

实测报错：

```text
TS2420: Class 'Outsider' incorrectly implements interface 'IEdge'.
  Types have separate declarations of a private property 'secret'.
```

机制读法：`interface IEdge extends Klass` 把类 Klass 的形状**连同 private 成员的出身**一起抄进接口——此后 `IEdge` 的兼容判定里藏着一条「secret 必须起源于 Klass」的要求。`Outsider` 自带的 `private secret = 9` 形状完全一致，但出身不同，同源检查照样拦截（TS2420）。唯一的实现路径是血缘：`class Heir extends Klass implements IEdge`（实测通过）。对照收据：把 `IEdge` 换成纯结构接口 `interface IEdge2`（只有 `tag: string`），任何形状匹配的类都能 implements——两条通道的差异全部来自那一个 private 成员。

**题 7**：基于以上收据回答三问：① `IEdge` 还能被哪些类 implements？② 这条通道与 §4 的「类间 private 同源」是同一机制吗？③ 想要「只有本家族能实现」的契约，为什么这条通道比品牌类型更彻底？

**答案**：① 只有 Klass 及其子类（血缘是唯一钥匙）；② 是——报错原文都是「separate declarations of a private property」，同源判定同一套，只是触发位从类间赋值挪到了 implements 检查；③ 品牌类型（`__brand`）是 TS 层的仿制品，编译器只是「顺便」因为不认识属性而报错，且可用断言绕过；接口继承类的通道动用的是编译器的**正式**同源规则，连 `as` 断言也绕不过去（断言不改变声明出身）。代价是该契约把实现者绑死在类的继承链上——需要在「家族封闭」与「开放实现」之间做选择时，这条通道的语义恰好就是「家族封闭」。



