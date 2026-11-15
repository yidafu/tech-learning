---
mdx:
  format: mdx
references:
  - 23-reactivity-source-reading
  - 21-functional-programming
  - 11-ts-type-programming
---
# 22 · 设计模式的 TS 实现：从 GoF 到「union + 函数表」

> 对应大纲：阶段 5 专题深入 —— 常见设计模式的 TS 实现

## 学习目标

1. 每个模式用四段讲清：**意图 / TS 实现 / 何时用 / 现代 TS 更优替代**
2. 讲清 Observer 与 Pub-Sub 的区别（有无中介、解耦程度），能写出 Events map 泛型约束的类型安全 EventEmitter
3. 说清为什么 Singleton 在 ESM 时代常常是「不需要写的模式」，以及它的可测性代价
4. 能用 union + 函数记录表替代继承型 Strategy/Factory，并解释「组合优于继承」在 TS 类型系统里的具体形态
5. 辨析 GoF Proxy 模式与 JS `Proxy` 元编程设施的关系；了解装饰器标准的现状

## 关键概念

一手依据：《Design Patterns: Elements of Reusable Object-Oriented Software》（GoF, 1994）各模式的「Intent」段；Refactoring.Guru 对各模式的现代重述（含 GoF 未收录的 Null Object、Pub-Sub 变体）。下文每节的「意图」均为一手转述，另注 GoF 分类（创建型/结构型/行为型）。

一个总纲先立住：**GoF 的 23 个模式诞生于「类是一等扩展手段」的 C++/Smalltalk 世界；JS/TS 里函数是一等公民、类型系统支持代数数据类型（union + 字面量），很多模式的最优解从「类结构」变成了「数据 + 函数」**。下文反复出现。

### 1）Singleton（GoF 创建型）

- **意图**：保证一个类只有一个实例，并提供全局访问点。
- **TS 实现**：`private constructor` + 静态 `getInstance()`（惰性创建），见练习 01。
- **何时用**：实例确实全局唯一且惰性有意义（初始化昂贵、按需一次）。数据库连接池、全局配置。
- **现代 TS 更优替代**：**ESM 模块本身就是单例**。ESM 规范保证模块只被求值一次，之后所有 import 拿到同一个模块记录 —— 模块顶层 `export const config = createConfig()` 天然全局唯一，不需要类、不需要 getInstance（练习 01 用「动态 import 同一文件两次得到同一实例」证明了模块缓存）。
- **class 写法的问题**：① TS 的 `private` 只是编译期检查，运行期可绕过；② 引入隐藏全局状态：依赖它的代码难以测试（无法替换、状态跨用例泄漏）、无法并行；③ 惰性/多实例需求真的出现时要重写。缓解：依赖注入、模块工厂（导出 `createX(deps)` 而非实例）。

### 2）Factory（GoF 创建型：Factory Method / Abstract Factory）

- **意图**：定义创建对象的接口，让子类决定实例化哪个类；把「造什么」与「怎么造」分离。
- **TS 实现（class 家族）**：抽象 Creator + 一组具体工厂。问题是：**一族只为造对象而存在的类**。
- **何时用**：创建逻辑复杂（多步初始化、读配置）、需要按输入返回不同具体类型、想对调用方隐藏构造细节。
- **现代 TS 更优替代**：**重载/泛型 + 判别联合**：

  ```ts
  type Shape = Circle | Rect; // 判别联合：kind 字段区分
  function createShape(kind: 'circle', r: number): Circle;
  function createShape(kind: 'rect', w: number, h: number): Rect;
  function createShape(...args: unknown[]): Shape { /* 按第一参分派 */ }
  ```

  调用方拿到的返回类型由重载精确收窄；不需要工厂类层级。「工厂」退化成一个函数 + 一个 union —— 数据建模承担了原来类层级承担的工作。`Response.json()/error()` 这类静态工厂也是轻量形态。

### 3）Observer vs Pub-Sub（GoF 行为型：Observer；Pub-Sub 是其变体）

- **意图（Observer）**：定义对象间一对多依赖，当一个对象状态改变，所有依赖者自动被通知。
- **两者区别（高频考点）**：

  | | Observer | Pub-Sub（发布订阅） |
  | --- | --- | --- |
  | 结构 | subject 直接持有 observers 列表 | 发布者、订阅者只认识**中介 broker** |
  | 解耦程度 | 认识对方（至少认识接口）；同进程同步调用 | 互不相识；可跨模块/跨进程/跨机器 |
  | 类型安全 | 可以做到编译期（Events map） | topic/payload 通用化，契约弱化为运行时约定 |
  | 典型实现 | DOM 事件、RxJS Subject、Vue 依赖收集 | Redis pub/sub、消息队列、mitt(带中介) |
- **类型安全 Events map 实现**（练习 02 的核心）：

  ```ts
  type Events = { 'user:login': [username: string]; 'order:create': [orderId: number] };
  class TypedEmitter<E extends Record<PropertyKey, unknown[]>> {
    on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void;
    emit<K extends keyof E>(event: K, ...args: E[K]): void;
  }
  ```

  事件名、参数类型、参数个数全部编译期对齐。注意 `E` 的约束用 **type 而非 interface**（interface 无隐式索引签名，满足不了 `Record<PropertyKey, unknown[]>`）。
- **何时用**：一处状态变化、多处响应，且响应方动态增减（UI、日志、埋点）。同进程强类型选 Observer；需要跨边界/广播/通配符（`*`）选 Pub-Sub。
- **替代视角**：现代前端里，框架的响应式（Vue 的 effect、React 的 state 订阅）把「谁依赖谁」自动化了，手写 Observer 的场景收窄到「框架之外的库与工具代码」。

### 4）Strategy（GoF 行为型）

- **意图**：定义一族算法，各自封装，可互换；算法变化独立于使用它的客户端。
- **TS 实现（继承版）**：抽象类 `Strategy` + 每算法一个子类（练习 03 版本 A）。
- **何时用**：同一问题存在多种可切换的算法/规则（折扣、排序、序列化格式），且运行时按输入选择。
- **现代 TS 更优替代**：**判别联合 + `Record<Kind, Fn>` 函数记录表**（练习 03 版本 B）：

  ```ts
  type Kind = 'none' | 'vip' | 'full-reduction';
  const STRATEGIES: Record<Kind, (price: number) => number> = { /* 每项一个纯函数 */ };
  ```

  扩展成本：union +1 字面量、表 +1 行，旧代码零改动；**漏写表项被 `Record` 的完备性检查在编译期拦下**。继承版则要新建类文件、理解基类契约。策略是纯函数时，类没有承载任何状态，是纯重量。

### 5）Decorator（GoF 结构型）

- **意图**：动态地给对象附加职责；比继承更灵活（不改变接口、可叠加、可运行时组合）。
- **TS 实现（包装函数 / 高阶函数）**：JS 里「装饰」的最自然形态是**接收函数返回增强函数**——防抖、节流、缓存、重试、日志全是装饰器：

  ```ts
  const withRetry = (fn: Fetch): Fetch => async (url, init) => { /* 失败重试后调 fn */ };
  ```

  React HOC（`withRouter(Component)`）是同一思想在组件层的投影（「包装并保持形状」）。
- **何时用**：想给既有函数/组件横向加职责（日志、缓存、权限）而不改其签名；多层可任意叠加（`withLog(withRetry(fetch))`）。
- **装饰器标准现状（一句话）**：TS 5.0 实现了 **TC39 Stage 3 装饰器**（`decorator` 新语法）；此前多年的 `experimentalDecorators` 是旧草案（Stage 1 时代）语义，仍被 Angular/NestJS 等广泛使用，两套语义不兼容。**GoF Decorator 是模式，`@decorator` 是语法糖**——后者的典型用途（给类成员挂元数据/注入）只是模式的一小部分。
- **与 Proxy 模式的辨析**：见下节。

### 6）Proxy 模式 vs JS Proxy 元编程（GoF 结构型：Proxy）

- **意图（Proxy 模式）**：为对象提供代理以**控制对它的访问**（远程代理、虚代理延迟创建、保护代理做权限）。
- **GoF 里 Proxy 与 Decorator 的区别**：结构几乎相同（都是包一层、转发调用），**意图不同**——Decorator 给对象**加职责**（增强），Proxy **控制访问**（守门）。回答面试时用意图区分，不要用代码形状区分。
- **JS `Proxy` 是什么**：语言级**元编程设施**——13 种陷阱（get/set/has/ownKeys/deleteProperty/construct/apply…）拦截对象的**内部方法**（[[Get]]、[[Set]] 等），反射由 `Reflect` 配套。**它不是设计模式，而是实现模式的工具**：用它能实现 GoF Proxy（拦截做权限校验）、Decorator（拦截加缓存/日志）、Observer（拦截读写做依赖收集——Vue reactivity 的根基，见笔记 23）。
- **何时用**：需要拦截「对对象的一切基本操作」时用 JS Proxy；只需要在个别方法上包一层时，普通高阶函数更简单直接。

### 7）Adapter（GoF 结构型）

- **意图**：把一个类的接口转换成客户端期望的另一个接口，使不兼容的类协同。
- **TS 实现**：几乎总是**对象适配器/函数适配器**（包一层 + 转发 + 字段映射）；GoF 的类适配器靠多继承，TS 单继承且函数一等，没有存在空间：

  ```ts
  const toUserDto = (raw: ThirdPartyUser): UserDto => ({ id: raw.user_id, name: raw.display_name });
  ```
- **何时用**：对接第三方 SDK/旧接口/后端历史字段名——**在系统边界做一次翻译，核心域立刻用干净类型**。与「效应推到边界」（笔记 21）是同一思想：脏数据止步于 Adapter。
- **现代 TS 更优替代视角**：很多时候「Adapter 类」退化成一个**纯映射函数 + 两个 DTO 类型**；类型层还可用映射类型自动推（`Pick`/`Rename` 类体操，见笔记 11）。别为字段映射建类。

### 8）Command（GoF 行为型）

- **意图**：把请求封装成对象，从而可以参数化客户端、排队、记录日志、支持撤销。
- **TS 实现**：命令对象 = `{ execute(), undo() }`；**撤销栈**是它的标志性能力（练习见预测题 1）：

  ```ts
  class CommandStack {
    #done: Command[] = [];
    execute(cmd: Command) { cmd.execute(); this.#done.push(cmd); }
    undo() { this.#done.pop()?.undo(); }
  }
  ```

  每次 execute 压栈，undo 弹出并反向执行；要做重做再加 `#redo` 栈（undo 时压入 redo）。
- **何时用**：编辑器操作、事务性修改、需要「操作历史/回放」的场景（协同编辑的 OT 前置也是命令流）。
- **现代 TS 替代视角**：命令可以是**纯函数 + 逆函数**的记录表（`{ do, undo }` 两个纯函数字段），同样能进函数表/序列化；Redux 的 action + reducer 本质就是命令模式的函数化：action 是命令对象，reducer 是解释器。

### 9）Null Object（GoF 未收录；Refactoring.Guru 行为型）

- **意图**：提供一个「什么都不做」的对象，替代 null/undefined，消除调用点的空检查。
- **TS 实现**：默认策略对象（`const noopLogger = { log() {} }`）、默认参数（`fn = () => {}`）。
- **何时用**：同一处 null 检查在多个调用点重复出现；可选依赖（日志、埋点）给默认空实现。
- **现代 TS 替代**：`strictNullChecks` 把「会不会为空」交给类型系统收窄，`??`/`?.` 在**调用点**消空。区别：Null Object 在**数据/被调方**统一消空（集中、调用点零噪音），`?.` 在每个调用点重复处理（分散、每次都要想一次）。两者互补：高频可选依赖用 Null Object，偶发判空用 `?.`。

### 10）总结：「组合优于继承」在 TS 里的体现

- **数据组合**：判别联合 + Record 函数表（Strategy/Factory 的现代化身）—— 用「数据的穷举」代替「子类的开放扩展」，换来编译期完备性检查。
- **行为组合**：高阶函数（装饰器/pipe/curry）—— 用「函数包函数」代替「子类覆写方法」，可叠加、可拆分、无 `super` 心智负担。
- **对象组合**：mixin 函数（`Object.assign` / 函数式 mixin）、接口 + 委托 —— 代替多重继承。
- **继承仍然合适**：真正的 is-a 且需要基类多态行为（`Error` 子类、框架要求的基类）；除此之外，继承层级每深一层都是负债（方法解析、`this` 语义、脆弱基类问题）。TS 的 `interface` + 结构类型让「要鸭子不要血统」成为默认。

## 可运行示例

| 练习 | 覆盖点 | 运行 |
| --- | --- | --- |
| `exercises/design-patterns/01-singleton.ts` | class 惰性单例、ESM 模块单例证据（动态 import 两次）、可测性问题 | `npx tsx exercises/design-patterns/01-singleton.ts` |
| `exercises/design-patterns/02-observer-pubsub.ts` | Events map 类型安全 EventEmitter（4 类错误编译期拦截）、PubSub 中介 + 通配符 | `npx tsx exercises/design-patterns/02-observer-pubsub.ts` |
| `exercises/design-patterns/03-strategy.ts` | 继承版 vs union+函数表版策略、扩展成本与 Record 完备性 | `npx tsx exercises/design-patterns/03-strategy.ts` |

## 易错点与面试高频

1. **「Vue 的响应式用了 Proxy 所以用了代理模式」**——半对：JS Proxy 是元编程工具；Vue 用它实现的是 Observer（依赖收集），不是 GoF 意图上的「控制访问」。辨析见 §6。
2. **Observer 与 Pub-Sub 混答**——高频题。抓住两点：有无中介；解耦程度（进程内强类型 vs 跨边界弱契约）。
3. **Events map 用 interface 声明**——约束 `Record<PropertyKey, unknown[]>` 时报「缺索引签名」；用 type 对象字面量。
4. **单例测试互相污染**——「用例 A 改了单例状态，用例 B 莫名失败」；答面试时主动给出缓解（DI/工厂/isolate）。
5. **装饰器三概念混谈**——GoF Decorator（模式）、函数装饰（高阶函数）、`@decorator`（TC39 Stage 3 / TS 5.0 语法，`experimentalDecorators` 是旧草案）。一句话讲清层次即可加分。
6. **emit 遍历时直接遍历订阅集合**——监听器里取消订阅会「迭代中修改集合」，跳元素甚至死循环；必须拷贝后再遍历（mini-reactivity 的 trigger 同款处理，笔记 23）。
7. **一切皆 class**——TS 里策略/命令/适配大量退化为「union + 纯函数」，为它们建类是教条；判据：类有没有状态与生命周期。

## 输出预测题

### 题 1（Command 撤销栈）

```ts live noInline
interface Command {
  execute(): void;
  undo(): void;
}
class CommandStack {
  #done: Command[] = [];
  execute(cmd: Command): void {
    cmd.execute();
    this.#done.push(cmd);
  }
  undo(): void {
    this.#done.pop()?.undo();
  }
}

const log: string[] = [];
const make = (name: string): Command => ({
  execute() {
    log.push(name);
  },
  undo() {
    log.push(`undo:${name}`);
  },
});

const stack = new CommandStack();
stack.execute(make('a'));
stack.execute(make('b'));
stack.undo();
stack.execute(make('c'));
stack.undo();
stack.undo();
stack.undo(); // 空栈
console.log(log);
```

### 题 2（emit 拷贝遍历：监听器中取消订阅）

```js live noInline
const bus = {
  subs: new Set(),
  on(fn) {
    this.subs.add(fn);
  },
  emit(v) {
    for (const f of [...this.subs]) f(v); // 关键：拷贝后再遍历
  },
};
const log = [];
bus.on((v) => log.push(`a:${v}`));
bus.on(function b(v) {
  log.push(`b:${v}`);
  bus.subs.delete(b); // 广播过程中把自己摘掉
});
bus.on((v) => log.push(`c:${v}`));
bus.emit(1);
bus.emit(2);
console.log(log);
```

追问：若 `emit` 改为 `for (const f of this.subs) f(v)`（不拷贝），本题场景的输出会变吗？什么样的订阅删除才会让两种写法分道扬镳？

## 预测题答案

### 题 1

```
[ 'a', 'b', 'undo:b', 'c', 'undo:c', 'undo:a' ]
```

逐步：`a`、`b` 依次执行入栈 → `undo()` 弹出 b，压 `undo:b` → 执行 `c` 入栈 → `undo()` 弹出 c，压 `undo:c` → 再 `undo()` 弹出 a，压 `undo:a` → 最后一次 `undo()` 栈已空，`pop()` 得 `undefined`，可选链短路，无输出。原理一句话：**Command 把「做过的事」对象化，撤销 = 弹栈反向执行**。

### 题 2

```
[ 'a:1', 'b:1', 'c:1', 'a:2', 'c:2' ]
```

逐步：emit(1) 时三个监听器都还在（拷贝快照包含 b），依次执行，b 执行中把自己从原集合删除；emit(2) 时集合只剩 a、c，输出 `a:2`、`c:2`。

追问的答案（已实测）：**本题场景两种写法输出完全相同**——b 删除的是「已经执行过的自己」，对迭代器没有影响。真正分道扬镳的是「**前面的监听器删除后面的监听器**」：把上面 a 改成 `bus.subs.delete(c)` 后，不拷贝遍历输出 `[ 'a:1', 'b:1' ]`（c 已从集合删除、迭代器还没走到它 → 被跳过），拷贝遍历输出 `[ 'a:1', 'b:1', 'c:1' ]`（快照在广播开始时就定了名单）。「迭代中新增订阅」同理会让新元素在当轮就被通知，行为不可预期。工程结论统一记：**通知前先拍快照**——Vue reactivity 的 `trigger`、mitt 的 handlers 拷贝、练习 02 的 `emit` 都这么做，mini-reactivity（笔记 23）的 `trigger` 同款。

## 延伸阅读

- GoF《Design Patterns》各模式 Intent 段（中译本《设计模式：可复用面向对象软件的基础》）
- Refactoring.Guru 中文站：各模式的「真实世界类比/伪代码」，含 GoF 未收录的 Null Object
- TC39 Decorators proposal（Stage 3）与 TS 5.0 Release Notes《Decorators》
- Vue 官方文档《深入响应式系统》—— Observer 模式 + JS Proxy 的当代最佳实践（衔接笔记 23）

## 附：模式 × TS 语法速配表（收尾增补）

本册收尾把"GoF 模式在 TS 里该用什么语法落地"压成一张速配表——模式本身不变，载体升级：

| 模式 | 经典实现 | TS 里的现代载体 |
|---|---|---|
| 单例 | 私有构造 + getInstance | 模块顶层对象（模块即单例）/ const 冻结 |
| 工厂方法 | 类继承 + 工厂基类 | 泛型工厂函数 + 构造签名 |
| 建造者 | Builder 类链 | 多态 this 返回 this（33 册 §6） |
| 策略 | 接口 + 策略类 | 函数值 / `Record<策略名, 实现>` |
| 观察者 | Subject/Observer 接口 | EventEmitter / signal 订阅 |
| 装饰器 | 包装类组合 | TS 5.0 装饰器语法 / 高阶函数 |
| 状态/状态机 | 状态类 + 上下文 | 可辨识联合 + 穷尽 switch（13 册） |
| 访问者 | Visitor 接口双分派 | AST 节点联合 + switch on kind（26 册） |

速配表的读法：**右列多数比左列少三分之一的代码**——TS 的联合类型与函数一等性把"接口仪式"压掉了，但模式的**意图与权衡**一字不变。学模式学的是右列括号里的东西，不是左列的类图仪式。

### 收尾自测（增补）

1. 速配表哪几行是"联合类型直接取代接口"？（策略/状态/访问者——共同点：可辨识 + 穷尽性）
2. 状态模式与可辨识联合的穷尽 switch，重构时各自怎么加一个新状态？各自漏改的报错时机差在哪？（编译期 vs 静默）
3. 模块即单例的代价是什么？（测试隔离难——依赖注入的动机）

速配表最后一行"访问者"值得多看一眼——它与 [26-compiler-perspective](26-compiler-perspective.md) 的 AST 遍历是同一个模式：**节点联合 + kind 分派**。Babel 的 visitor、tsc 的 visitor、mini 的 checkStmt，三处实现形态一致——这也是"模式学的不是类图"的最好注脚：访问者模式的本体是"数据变体集合 + 分派机制"，类只是它的一种历史载体。

### 收尾一句话（增补）

模式在 TS 里的正确打开方式：**意图先行，载体从简**——先用联合类型与函数值试，撑不住再上类；类图是模式的考古报告，不是施工图。

### 补充：模式迁移的安全清单（类 → 联合改造时）

- 先穷尽：旧类分支逐一映射到联合成员，漏一个运行时就 undefined；
- 再收窄：switch 分支用 assertNever 兜底（13 册 §5）；
- 后删类：确认无 instanceof 残留再删（守卫同步更新）；
- 锁回归：改造前后行为对拍（fixture 风格）。

四步把"模式现代化"变成可回退的机械操作，而不是一次性大爆炸重构。

---

## 补遗：State、Template Method、Visitor 的 TS 落地与类型安全化

速配表把这三行一笔带过，这里按正文同款四段式展开——它们恰好覆盖「行为随状态变」「流程骨架」「数据变体上的新操作」三种最常见的变化形态。

### State（GoF 行为型）

- **意图**：允许对象在内部状态改变时改变其行为，对象看起来修改了自己的类。
- **经典实现**：Context 持有抽象 State 引用，每个具体状态一个子类，方法调用转发给当前状态对象，状态自己决定下一个状态是谁。
- **TS 现代载体**：**判别联合 + 纯转换函数**。状态是联合、事件是联合、转换是 `(state, event) => state` 的纯函数（形态上就是 reducer）。类型安全化的关键一步是把「哪些转换合法」变成**编译期数据**——一张转换表：

  ```ts
  type Transition = Record<StateKind, Partial<Record<EventKind, StateKind>>>;
  ```

  表里查不到的「状态 × 事件」组合在类型层就不可表达；配合穷尽 switch 处理副作用挂载点，非法转换运行时静默通过的可能性被拆掉。
- **与 Strategy 的高频辨析**：两者类图几乎一样，意图的差别在「谁决定切换」——Strategy 的各算法互不知晓，由客户端选择替换；State 的状态知道自己何时转向谁（转换逻辑内聚在状态里）。答面试时用「切换的决策权在哪」一句话分开。
- **class 版 State 的残余价值**：状态对象需要自带数据与生命周期（比如「连接中」状态要持有重连计时器、离开状态时要清理）时，函数版转换表会显得拘谨，此时退回对象形态，但联合分派的结构不变。

### Template Method（GoF 行为型）

- **意图**：定义算法的骨架，把某些步骤延迟到子类实现；子类重定义特定步骤而不改变算法结构。
- **经典实现**：abstract 基类写固定调用顺序的模板方法，抽象方法留给子类填充。
- **TS 函数式替代**：**高阶函数模板**——把「骨架」写成接收步骤对象的函数，步骤对象的类型约束了必须提供哪些环节：

  ```ts
  type Steps = {
    parse(src: string): Node1;
    check(n: Node1): Diagnostic[];
    emit(n: Node1): string;
  };
  function runPipeline(steps: Steps, src: string): string {
    const ast = steps.parse(src);        // 骨架：顺序固定
    const diags = steps.check(ast);      // 每个环节可替换
    return steps.emit(ast);
  }
  ```

  少一个环节 → 对象字面量缺属性被编译期点名（TS2741）；多一个环节 → excess property check 拦下。骨架的「不可变」从基类的权限控制变成了类型的形状约束。
- **类型安全化要点与限制**：TS 没有 `final`，抽象类的模板方法被子类覆写只能靠约定或 lint 规则；abstract 类漏实现抽象方法是编译期错误、实例化抽象类是 TS2511。函数式版本的优势是**组合可变**：想要「跳过 check 的流水线」，传入不完整步骤对象加适配函数即可，不必另立子类。
- **何时用**：流程固定、环节可变——构建管线、报表生成、测试框架的生命周期钩子（beforeEach/afterEach 就是模板方法的函数形态）。

### Visitor（GoF 行为型）

- **意图**：表示一个作用于对象结构中各元素的操作，使得可以在不改变元素类的前提下定义新操作。
- **经典实现**：元素实现 `accept(visitor)`，内部回调 `visitor.visit(this)`——所谓**双分派**。它的原始动机是 C++ 的方法重载静态绑定（不靠 accept 绕一道，调用的重载版本在编译期就定死了）。JS 的属性分派天然动态，这个动机不存在——**直接按 `kind` 分派即可，accept 仪式可以整体删掉**。
- **TS 现代载体**：节点判别联合 + visitor 对象（每个 kind 一个处理函数）+ switch 分派。类型安全化是本模式在 TS 里的最大增量：

  ```ts
  type Visitor = { [K in AST['kind']]: (n: Extract<AST, { kind: K }>) => string };
  ```

  mapped type 遍历所有 kind、`Extract` 把每个方法的参数精确收窄到对应变体。两条保证同时成立：**完备性**（漏一个 kind 报 TS2741）与**参数精确性**（方法体里不必再判 kind，实跑收据见下节题 4）。
- **何时用**：AST 遍历、序列化、diff——「数据变体集合稳定、操作持续增加」的场景。反过来（操作稳定、变体持续增加）时，把操作内联进 switch 更顺手：这是「表达式问题」的两个方向，Visitor 只解决其中之一，选型前先判断自己的代码往哪个方向变。
- **与 26 册的衔接**：Babel 的 visitor、tsc 的 visitor、迷你编译器的 checkStmt，三处实现形态一致——数据变体集合 + 分派机制，类只是历史载体（速配表已点，此处补足「为什么可以没有 accept」）。

---

## 手推配方：模式选择的决策树

拿到一个「变化的需求」，按顺序问：

```text
① 变化的是「同一接口的不同实现」吗？
   是 → 各实现有状态和生命周期吗？
        无 → union + Record 函数表（Strategy 现代化）
        有 → 类 + 接口（或函数式 mixin）
② 变化的是「对象怎么被创建」吗？
   → 工厂函数：重载/泛型 + 判别联合返回（Factory 现代化）
③ 变化的是「流程的某些步骤」吗？
   → 步骤对象/abstract 类（Template Method）
④ 变化的是「状态的转移规则」吗？
   → 判别联合 + 转换表（State）
⑤ 要对一组稳定的数据变体「持续增加新操作」吗？
   → mapped type visitor（Visitor）
⑥ 只是想「给函数加职责」？
   → 高阶函数装饰（withRetry/withLog）
⑦ 只是想「控制对对象的访问」？
   → 需要拦截一切基本操作才用 JS Proxy；只包个别方法就用高阶函数
⑧ 都不是，只是字段映射？
   → 一个纯函数 + 两个 DTO 类型（Adapter），别建类
```

决策树的哲学与速配表一致，两问定一模式：**先问「变化的是什么」**——它决定模式的意图归属；**再问「有没有状态与生命周期」**——它决定载体选函数还是类。两问答完，23 个模式里真正适合当前业务的就浮出来一两个，剩下的都是「听起来相关、实际不搭界」。面试里被问「你项目里用过哪些设计模式」时，用这两问组织回答，比背模式清单高一个档次。

---

## 工程三陷阱（模式 × TS）

1. **kind 字段被宽化成 `string`**。判别联合的全部编译期红利都建立在「判别字段是字面量类型」上。一旦写成 `kind: string`（常见于从 JSON 反序列化时偷懒），穷尽 switch 不再报漏分支、Record 函数表不再查漏、assertNever 永远绿灯——整套安全网静默失效，而且失效得毫无症状。review 判据：判别字段必须是字面量联合；数据入口处用收窄校验（运行时判 kind 合法性）把外部数据**洗成**字面量联合，而不是直接把类型放宽。
2. **Visitor 用 `Partial` 关掉完备性检查**。`const v: Partial<Visitor> = {...}` 配 `v[node.kind]?.(node)`——新增节点类型时静默跳过，不报错也不告警，漏处理的节点带着 undefined 返回值流向下游。正确做法：完备 visitor（编译期强制每个 kind 都有实现），确实想「只处理部分节点」就补一个默认处理器（Null Object 模式在此的第二个用武之地：`const fallback = () => ''`），让「跳过」成为显式声明的行为而非类型系统的漏洞。
3. **State 的转换规则散落两处**。一部分转换写在状态对象（或分支函数）里，另一部分写在上下文的 switch 里——转移图失去单一事实来源，非法转换（比如 done 直接转回 loading）运行时静默通过，出问题后没人能从代码里读出「合法转换全集」。收敛办法：转换表（或单点穷尽 switch）作为唯一数据源，状态函数只查表执行副作用；表本身就是团队可读的状态机文档。这张表还能直接喂给测试：合法转换逐条生成用例、非法组合断言被拒。

---

## 类型层输出预测题（tsc 实跑收据）

以下四题全部考察「模式现代化后，类型系统替你守住了什么」。每题先自己判断能否通过 `tsc --strict`，再看答案与收据。

### 题 1（Record 函数表的完备性）

```ts
type Kind = 'none' | 'vip' | 'full-reduction';
const STRATEGIES: Record<Kind, (price: number) => number> = {
  none: (p) => p,
  vip: (p) => p * 0.8,
};
```

问：能否通过编译？报错号是什么、报错点定位在哪一行哪一列？

### 题 2（穷尽 switch 漏分支）

```ts
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done' };
function label(s: State): string {
  switch (s.kind) {
    case 'idle': return 'idle';
    case 'loading': return 'loading';
  }
}
```

问 1：报什么错、错误号是什么？问 2：若补一个 `default: return assertNever(s)`（其中 `assertNever(x: never): never`），错误信息会怎么点名漏掉的成员？

### 题 3（未收窄的属性访问）

```ts
type State = { kind: 'idle' } | { kind: 'loading'; progress: number };
function getProgress(s: State): number {
  return s.progress;
}
```

问：报什么错？错误信息里 TS 是怎么「指认」具体元凶成员的？

### 题 4（mapped type visitor 的两条保证）

```ts
type AST =
  | { kind: 'num'; value: number }
  | { kind: 'add'; left: AST; right: AST };
type Visitor = { [K in AST['kind']]: (n: Extract<AST, { kind: K }>) => string };
const v: Visitor = { num: (n) => String(n.value) };
```

问：这段代码同时验证了 Visitor 类型安全化的哪两条保证？报什么错？

---

## 类型预测题答案与收据

实跑环境：TypeScript 5.9.3（本工作区 `js-ts/node_modules` 内置），命令 `tsc --strict --noEmit --pretty false`，四个题面文件与 assertNever 变体文件分别落盘后一次性编译，退出码 2。以下错误信息为实跑原文摘录。

### 题 1

```text
a-record.ts(2,7): error TS2741: Property '"full-reduction"' is missing in type
'{ none: (p: number) => number; vip: (p: number) => number; }' but required in
type 'Record<Kind, (price: number) => number>'.
```

`Record` 的完备性检查把漏写的 kind **按名字点名**，定位精确到对象字面量的 2 行 7 列。这正是「union + 函数表」的核心安全红利：新增策略时 union 加一个字面量、表里漏一行，编译立刻红——继承版策略要等运行时（甚至 review 时人眼）才发现漏实现。

### 题 2

问 1 的收据：

```text
b-switch.ts(2,34): error TS2366: Function lacks ending return statement and
return type does not include 'undefined'.
```

TS 的控制流分析知道：三个 kind 只覆盖两个，`done` 的输入会让函数走不到任何 return，而声明的返回类型 `string` 不含 `undefined`——专门为此设了 TS2366。问 2 的收据（assertNever 变体）：

```text
e-assertnever.ts(9,33): error TS2345: Argument of type '{ kind: "done"; }' is
not assignable to parameter of type 'never'.
```

`never` 是底类型——只有「不可能存在的值」才能赋给它。控制流分析发现 default 分支里 `s` 仍可能是 `{ kind: "done" }`，不是 `never`，于是报错，并把漏掉的成员名直接写进错误信息。两种写法都拦得住；assertNever 的错误信息更点名，工程上优先。

### 题 3

```text
c-narrow.ts(3,12): error TS2339: Property 'progress' does not exist on type 'State'.
  Property 'progress' does not exist on type '{ kind: "idle"; }'.
```

注意第二行：TS 不仅说 `State` 上没有 `progress`，还指出**是 idle 变体上没有**——判别联合未收窄时的访问检查精确到具体成员。修复：先 `if (s.kind === 'loading')` 收窄再访问；收窄后同样的访问编译通过。这也是 State 模式函数版里「switch 前先判 kind」的类型学依据：不是风格，是让编译器放行唯一安全的访问路径。

### 题 4

```text
d-visitor.ts(5,7): error TS2741: Property 'add' is missing in type
'{ num: (n: { kind: "num"; value: number; }) => string; }' but required in
type 'Visitor'.
```

两条保证同时显形：其一，**完备性**——漏 `add` 被按名点名（TS2741）；其二，**参数精确性**——错误信息里 `num` 方法的参数类型被精确渲染成 `{ kind: "num"; value: number }` 而非整个联合，说明 mapped type + `Extract` 确实把每个方法的入参收窄到了对应变体，方法体内不必再判 kind。新增节点类型（比如加一个 `mul`）时：union 加一个成员、visitor 表漏一行 → 编译期红，所有处理点一个不漏地被逼出来。

---

## Code review 检查单（模式使用）

模式相关代码进 review 时按此单过一遍，每条都是「可机械执行」的判据：

- 判别字段的类型是字面量联合，不是 `string`；外部数据入口有收窄校验把它洗成联合；
- 函数表用 `Record` 收联合——漏项必须编译报错，而不是落到 `undefined` 再运行时炸；
- 穷尽 switch 配 assertNever 兜底：新增联合成员时流程是「先红（点名漏分支）后绿（补实现）」，而不是静默加一个 case；
- Visitor 不用 `Partial`、不给可选方法；「跳过部分节点」用默认处理器显式声明；
- State 的合法转换有单一事实来源（转换表或单点穷尽 switch），非法组合可被测试断言拒绝；
- EventEmitter 的事件表用 type 对象字面量声明（interface 无隐式索引签名，过不了 `Record` 约束）；
- emit 遍历前先拷贝快照（正文预测题 2 的教训，Vue trigger 同款处理）；
- 新增一个模式实现前，先过决策树两问：变化的是什么？有没有状态与生命周期？class 是最后一档选项，不是第一档。

---

## 补遗二：消失的模式——被语言机制吸收的 GoF 条目

速配表列的是「该换载体」的模式，还有一批 GoF 条目在 JS/TS 里不是换载体，而是**整个问题被语言机制或生态默认件吸收**了。辨清「消失」与「换载体」的差别，能避免拿着锤子找钉子：

- **Prototype（原型）**：JS 的对象模型本身就是基于原型的——语言机制与模式同名同义，谈「用原型模式」等于谈「用对象」。这是「模式消失于语言」的最纯案例：GoF 写它是因为 C++ 需要绕开类来复用对象，而 JS 里这是默认路径，无需任何设计动作。
- **Flyweight（享元）**：解决「大量细粒度对象共享内部状态」的内存问题。JS 里三处吸收：字符串驻留（引擎自动共享字符串实例）、引擎的隐藏类与内联缓存、以及「用数据而非对象」的默认倾向（普通对象与数组的字段共享代替对象包装）。语言层手写享元的场景只剩极端热点，多数业务代码一辈子碰不到。
- **Mediator（中介者）**：把网状对象交互收拢到一个中介。现代前端的「状态库 + 订阅」（Redux/Zustand 一族）就是全局中介者：组件互不认识、只跟 store 说话。手写 Mediator 类已无场景，但辨析价值还在：中介者握有全部交互规则，Observer 只负责通知——这正是「该不该把业务规则写进事件总线」的判断依据：规则进总线，总线就变成无人能懂的中介者，解耦退化成转移耦合。
- **Interpreter（解释器）**：为语言定义文法与解释器。JS/TS 里它的现代形态就是「AST 联合 + visitor/switch」（衔接 26 册）；一般业务规则的「解释」用数据表加函数更直白。GoF 原书也标注这是不常用的一类。
- **Bridge（桥接）**：把抽象与实现两个维度分开演化。函数一等的世界里，「两个维度」直接用两个参数表达——`render(shape, renderer)` 天然就是桥，不需要抽象类层级持有一个实现引用再转发。

一句话总纲：**GoF 的模式清单是「语言表达力不足时的补偿方案目录」；语言表达力越强，需要补偿的场景越少**。JS/TS 吸收了 Prototype/Flyweight/Mediator 三类问题，改造了 Strategy/Factory/State/Visitor 等一批载体，剩下真正需要「设计」的场景远少于 23——这既是本册总纲（模式从类结构走向数据加函数）的最后一层注脚，也是「面试背模式清单」不如「讲清两问决策树」的根本原因：清单在变，判断力不变。

### 收尾自测（增补二）

1. 中介者与 Observer 的边界一句话怎么说？（中介者握交互规则、Observer 只管通知——业务规则写进事件总线即越界）
2. Flyweight 被哪三处吸收？（字符串驻留、隐藏类与内联缓存、「数据而非对象」的默认倾向）
3. Bridge 在函数一等的世界里退化成什么？（两个维度两个参数：`render(shape, renderer)`）

### 收尾一句话（增补二）

判断一个模式该不该出现在你的代码里，顺序是：先问它解决的变化是不是你有的（意图层），再问语言机制是否已经吸收了这个问题（消失层），最后才问载体用函数还是类（速配表层）。三问都过才动手——多数「模式改造事故」都坏在直接跳到第三问。把三问写进设计文档的「备选方案」一栏，评审时逐条对答，能省掉大量关于「为什么不用某某模式」的无效讨论：答案要么是变化不存在，要么是问题已被吸收，要么是载体有更简形态。
