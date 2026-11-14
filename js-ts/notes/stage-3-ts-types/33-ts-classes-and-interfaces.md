---
mdx:
  format: mdx
references:
  - 09-ts-narrowing
  - 12-ts-utility-types
  - 13-ts-type-theory
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
