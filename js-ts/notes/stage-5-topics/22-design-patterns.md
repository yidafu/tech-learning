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
