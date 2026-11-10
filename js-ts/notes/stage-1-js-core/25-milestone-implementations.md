---
mdx:
  format: mdx
---
# 里程碑笔记：手写 Promise / bind / new / 深拷贝 / EventEmitter

> 对应大纲：**阶段 1 里程碑**（异步编程 → Promise 状态机；this 与原型链 → bind/new；内存管理 → WeakMap 深拷贝）
> 配套练习：`exercises/milestone/`（每个实现都带 Vitest 用例，可对照运行）
> 学习目标：不背结论，能拿着规范条款（Promises/A+ / ECMA-262 / HTML Standard / Node events）讲清每个分支「为什么这么写」。

---

## 关键概念

### 1. 手写 Promise（Promises/A+）

实现：`exercises/milestone/my-promise.ts`（类 `MyPromise<T>`）

**考点清单与条款对照**

| 考点 | 规范依据 | 实现位置 |
| --- | --- | --- |
| 状态机三态、单向迁移 | 2.1（pending/fulfilled/rejected） | `_state` 字段 + `_settle` 唯一入口 |
| 状态只能迁移一次 | 2.1.1.1 / 2.1.2.1 / 2.1.3.1 | `_settle` 开头 `if (this._state !== PENDING) return` |
| 终值/拒因不可变 | 2.1.2.2 / 2.1.3.2 | settle 后只读，字段不再被写 |
| then 返回新 promise | 2.2.7 | `then` 内 `new MyPromise` 作为 promise2 |
| 回调必须异步执行 | 2.2.4 / 2.2.5「platform code」 | 回调统一用 `queueMicrotask` 派发 |
| 回调返回值决定 promise2 | 2.2.7.1 | `resolve(realOnFulfilled(value))` |
| 回调抛错 → promise2 rejected | 2.2.7.2 | try/catch → `reject(err)` |
| 非函数参数值穿透 | 2.2.1.1/2.2.1.2 + 2.2.7.3/2.2.7.4 | 缺省替换为 `v => v` / `r => { throw r }` |
| 同一 promise 多次 then 各自执行 | 2.2.6 | `_callbacks` 数组 + settle 时逐个派发 |
| resolve 与 promise 同引用 → TypeError | 2.3.1 | `_resolveInternal` 开头 `x === this` |
| 取 x.then 只一次、getter 抛错处理 | 2.3.3.1 / 2.3.3.2 | 局部变量 `thenProp` + try/catch |
| thenable 采纳（called 只一次） | 2.3.3.3 全部（.1/.2/.3.3.1/.3.3.2） | `called` 标志 + 递归 `_resolveInternal` |
| then 非函数的普通对象 | 2.3.3.4 | 直接 fulfill |
| 普通值直接 fulfill | 2.3.4 | 直接 fulfill |

**几个容易背错的一手依据**

- **2.2.4 的原文**：onFulfilled/onRejected 「must not be called until the execution context stack contains only platform code」——不是「setTimeout 0」，也不是「下一轮事件循环」，而是**当前同步栈清空后**。所以 `queueMicrotask` 是标准答案；用 `setTimeout(fn, 0)` 的实现能把 A+ 测试跑过，但与原生微任务时序不符（宏任务会插在微任务之后执行）。
- **2.3.3.1 的「只取一次」**：规范注释明确 `x.then` 的属性访问**副作用至多发生一次**（getter 是用户代码！）。用 getter 计数可直接验证——我们的实现里 `thenProp` 只读一次存起来，然后 `thenProp.call(x, ...)` 复用。写成 `x.then(...)`（每次属性访问）是常见错误。
- **thenable 的 then 调用是微任务**：A+ 没规定调用时机，但 ECMA-262 §27.2.2.2 的 resolve 到 thenable 时会 enqueue **NewPromiseResolveThenableJob**。区别可观察：`let p = new MyPromise(res => res(thenable))`，若同步调用 thenable.then，thenable 回调里拿到的 `p` 还是 `undefined`（构造函数尚未返回）。我们把 `then.call(...)` 包进 `queueMicrotask`，与原生一致。
- **resolve(thenable) 期间的决议权**：采纳 thenable 时要先「锁住」（`_locked = true`），此后 executor 再调 `resolve/reject` 都要忽略——对应原生 `new Promise(res => { res(promiseB); reject(new Error('x')); })` 中 reject 无效的行为。A+ 文字只覆盖 then 回调路径，这是「executor 路径也要走 2.3」的延伸（ECMA-262 里两条路径共用同一个 resolving functions）。
- **reject 不展开 thenable**：`Promise.reject(thenableObj)` 的拒因就是那个对象本身，不会等它 settle。resolve 与 reject 不对称。

**常见错误实现对照**

| 错误写法 | 违反条款 | 现象 |
| --- | --- | --- |
| `then` 里同步执行回调 | 2.2.4 | `p.then(log)` 先于后面的同步代码打印 |
| `resolve(x)` 直接 `_value = x` | 2.3.3 | `resolve(thenable)` 不等待采纳，值错 |
| `x.then(...)` 属性访问两次 | 2.3.3.1 | getter 副作用执行两次；getter 抛错时序错乱 |
| 不处理 `x === promise2` | 2.3.1 | `p.then(() => p2)` 死循环/栈溢出，原生是 TypeError |
| promise2 的 resolve 不走 2.3 | 2.2.7.1 | 链上返回 MyPromise 实例不展开，`await` 结果是 promise 对象而非值 |
| then 回调抛错不捕获 | 2.2.7.2 | 异常直接抛进微任务，promise2 永远 pending + unhandled rejection |
| 一次 resolve 后 flush 清空所有注册回调但只留一个 | 2.2.6 | 第二个 then 不执行 |

**骨架速记（三个函数各管一件事，面试白板按这个展开）**

1. `_settle(state, outcome)`：唯一的终态迁移口。守卫「只能 pending → 终态一次」，落值、清空并按注册序派发暂存回调（每个回调各自 queueMicrotask，满足 2.2.4）。
2. `_resolveInternal(x, bypass)`：2.3 全流程。同引用检查（2.3.1）→ 对象/函数取一次 then（2.3.3.1/2.3.3.2）→ then 是函数则微任务里调用并 called-once 递归（2.3.3.3.x）→ 否则按普通值 fulfill（2.3.3.4/2.3.4）。
3. `then(onFulfilled, onRejected)`：参数归一（非函数→透传代理）→ new promise2 → 依当前状态「立即调度」或「暂存」，调度统一走 queueMicrotask，回调结果交给 promise2 的 resolve（即再进 2.3）、异常交给 reject（2.2.7.2）。

### 2. 手写 bind（ECMA-262 BoundFunctionCreate）

实现：`exercises/milestone/my-bind.ts`

**规范依据**

- **§10.4.1.3 BoundFunctionCreate**：`F.bind(thisArg, ...args)` 创建 bound function exotic object，内部槽位 `[[BoundTargetFunction]]` / `[[BoundThis]]` / `[[BoundArguments]]`：
  - **[[Call]]**：调用时完全不看 this，固定 `target.apply([[BoundThis]], boundArgs.concat(callArgs))`——这就是「连续 bind 不能改 this」的根源：外层 bound 的 this 传进内层 bound 时被无视。
  - **[[Construct]]**（`new bound()`）：**不引用 [[BoundThis]]**；`SameValue(F, newTarget) === true` 时把 newTarget 换成 target，再 `Construct(target, args)` → 实例原型取 `target.prototype`。所以 `new boundFn()` 时 thisArg 被整体忽略，`instanceof target` 为 true。
  - **§20.2.3.5**：bound function 的 `@@hasInstance` 委托给 target → `instanceof boundFn` 也为 true。
- **§20.2.3.2 步骤 14-17（length/name）**：`bound.length = max(target.length - 已绑定参数个数, 0)`（target.length 先截断成整数）；`bound.name = 'bound ' + target.name`（SetFunctionName 的前缀机制）。
- 原生 bound function **没有 prototype 属性**（有 [[Call]]/[[Construct]] 但不是普通函数对象）。

**实现取舍（JS 近似与原生的差异）**

- 手写 wrapper 是普通函数，有 prototype 属性。我们让 `wrapper.prototype === target.prototype` 共享原型：`new wrapper()` 时 OrdinaryCreateFromConstructor 取 wrapper.prototype（= target.prototype）→ `instanceof target` 与 `instanceof bound` 同时成立，对齐原生两处语义。
- `new` 分支用 `new.target !== undefined` 判定——这是 JS 里区分 [[Call]]/[[Construct]] 的唯一正规手段；老写法 `this instanceof bound` 在被篡改原型时会误判。
- class 作为 target 时手写版 `new` 会挂（apply 触发 [[IsClassConstructor]] 抛 TypeError）；原生 bound 走 Construct 通道可用。教学实现只承诺普通函数 target。

**常见错误实现对照**

- 忽略 new 场景：`new boundFn(...)` 时 this 被强塞 thisArg → 绑定对象被写入属性（污染）、instanceof target 为 false。正确：new 时忽略 thisArg。
- `bound.prototype` 不处理 → `instanceof bound` 为 false（原生是 true）。
- `length` 直接 `target.length - args.length`：可能为负数（超量预置参数），规范要求 clamp 到 0。
- 用 `this instanceof bound` 判断 new：`boundFn.call(boundFn.prototype)` 这类调用会被误判为构造调用。

### 3. 手写 new（ECMA-262 [[Construct]] 三步）

实现：`exercises/milestone/my-new.ts`

**规范依据（§9.2.2 [[Construct]]）**

1. `OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%")`：new 表达式的 newTarget 就是构造器本身 → 以 `Ctor.prototype` 为原型创建空对象（我们用 `Object.create(Ctor.prototype)`）。
2. 以该对象为 this 调用构造器体（我们用 `Ctor.apply(obj, args)`——注意这是 **[[Call]]**，不是 Construct）。
3. 构造器返回**对象** → 用返回值；返回**原始值**（含 undefined/null）→ 忽略，用 this。

**class 为什么不能用 call/apply 模拟**

- class 构造器带内部标记 **[[IsClassConstructor]]**，§9.2.1 [[Call]] 步骤 2 直接抛 TypeError（"Class constructor X cannot be invoked without 'new'"）。new 的合法性检查只存在于 [[Construct]] 通道。
- 因此 `myNew(SomeClass)` 必挂；正确替代是 **`Reflect.construct(Ctor, args)`**——它是 [[Construct]] 的显式入口，new.target === Ctor，class 可用；且第三参可指定 newTarget 换实例原型（demo 中 `Reflect.construct(Modern, [5], Animal)` 得到原型来自 Animal 的实例）。
- `new.target` 在 myNew 内是 `undefined`（走 apply），在 new / Reflect.construct 中是构造器本身——demo/测试都有对照打印。

**常见错误实现对照**

- 忘了「返回对象则覆盖」：`function F() { return { x: 1 }; }` 的 `new F()` 结果是 `{ x: 1 }` 而非 this。
- 把「返回 null」当对象处理（`typeof null === 'object'` 的坑）：null 是原始值之一，new 语义里被忽略。
- 用 `{ __proto__: Ctor.prototype }` 字面量代替 `Object.create`：功能等价但 `__proto__` 是附录 B 的历史特性，规范路径是 Object.create / OrdinaryCreateFromConstructor。
- 试图给 class 写「通用 myNew」：不成立，只能走 Reflect.construct。

### 4. 深拷贝（对照 structuredClone / HTML Standard §2.7.5）

实现：`exercises/milestone/deep-clone.ts`

**structured clone 算法对照表**

| 类型 | structuredClone | 我们的 deepClone | 说明 |
| --- | --- | --- | --- |
| 原始值 | 原样返回 | 原样返回 | 算法第 1 步 |
| Date | 保留时间值 | `new Date(getTime())` | 一致 |
| RegExp | 保留 source+flags，**lastIndex 归零** | source+flags+**同步 lastIndex** | 我们多保留状态（g/y 标志时 lastIndex 有语义） |
| Map/Set | 键值/成员递归 | 递归 | 一致 |
| TypedArray/DataView | 拷贝且不共享 buffer | 新建 + `set` / `buffer.slice` | 一致 |
| 普通对象 | **丢原型**（产出 plain object） | `Object.create(getPrototypeOf)` **保留原型** | class 实例：structuredClone 后 instanceof 失败；我们成立 |
| Symbol 键 | **序列化时丢弃** | `Reflect.ownKeys` 保留 | 差异点 |
| 函数 | **抛 DataCloneError** | 返回原引用（浅语义） | 差异点，见下 |
| 循环引用 | SerializationState 记忆化支持 | `WeakMap` 记忆化 | 等价 |
| `#private` 字段 | 丢失 | 丢失 | 存于 [[PrivateElements]] 内部槽，不在 own keys；克隆体访问即 TypeError |

**函数为什么不可克隆（一手理由）**

函数对象 = 代码体 + `[[Environment]]`（闭包环境）。闭包对外部词法变量的引用是引擎内部绑定，JS 反射层（Reflect/Proxy 可见的部分）**枚举不到**，所以无法「重建一个等价闭包」。HTML Standard 的 structured clone 因此对函数直接抛 `DataCloneError`；我们手写版选择返回原引用——等价于「函数只做浅拷贝」，这也是 lodash `cloneDeep` 的行为。JSON.stringify 路径则直接丢函数（undefined）。

**实现要点（易错处）**

- `seen.set` 必须发生在**递归填充内容之前**（Map/对象分支都一样）：否则「对象属性指回自身」的循环引用在递归时还查不到记忆表 → 爆栈。
- WeakMap 而非 Map 做记忆表：弱引用键不延长源对象生命周期（对照大纲阶段 1-6 内存管理）。
- 稀疏数组：`Reflect.ownKeys` 只列真实存在的索引 → hole 保持 hole（`1 in arr === false`），不会「塌成」undefined 属性。
- 访问器属性：getter/setter 是函数 → 直接共享描述符，不克隆（与函数不可克隆同理）。

**为什么 JSON.stringify(JSON.parse(x)) 不算深拷贝（对照清单）**

- 循环引用直接抛 TypeError；`undefined`/函数/Symbol 键被静默丢弃；Date 变 ISO 字符串；RegExp 变空对象；NaN/Infinity 变 null；Map/Set 塌成 `{}`；原型、不可枚举属性全丢。它只在「纯 JSON 兼容数据」这个子集上成立。

### 5. EventEmitter（对照 Node events 模块）

实现：`exercises/milestone/event-emitter.ts`

**语义对照清单**

- **once 的 wrapper**：Node 的实现是把回调包一层 `function () { removeListener(event, wrapper); listener.apply(this, args) }` 存进队列。派生问题就是下一个——
- **off 的引用一致性坑**：用户手里只有原函数 `fn`，而内部存的是 `wrapper`。如果 off 按存入引用匹配，`emitter.off('evt', fn)` 删不掉 once 注册的监听。Node 的做法是把 wrapper 与原函数的映射记录在 listener 数组/内部结构里。我们的实现把存储单元设计成 `{ raw, call }`：`raw` 永远是用户传入的原函数（off 按 raw 匹配），`call` 是实际派发的函数（once 时是 wrapper）。一句话总结：**off 的匹配锚点必须是「用户视角的函数」**。
- **maxListeners 警告**：默认 10（`EventEmitter.defaultMaxListeners`）；某事件监听数**超过**（严格大于）maxListeners 时 `console.warn` 一次（Node 在 listeners 数组上挂 `warned` 标记防重复）；`setMaxListeners(0)` 表示不限制。警告不是错误——加第 11 个监听依然生效。
- **emit 快照遍历**：Node 的 emit 拷贝一份 listener 列表再遍历——回调里 `off` 自己、`on` 新监听、once 自动移除，都不影响**本次**派发，只影响下一次。若边遍历边改原数组，会漏调/错位。
- **emit 返回值**：有监听 true、无监听 false（Node 同款）。
- **listeners() 返回拷贝**：外部拿到数组再 push/splice 不影响内部（Node 返回 slice 拷贝，同理）。
- 同一函数多次注册：按注册顺序触发多次（Node 不去重）。

**常见错误实现对照**

- once 用「触发后标记 fired」而不是先移除再调用：removeAllListeners/off 与 once 的交互语义全错。
- off 直接按存入引用匹配：删不掉 once 注册的原函数（上面的坑）。
- emit 直接遍历内部数组：回调里 off 掉数组前项 → 本批跳过后续监听，与 Node 不一致。
- 超限用 `throw`：Node 是 warn 不中断。
- listeners() 返回内部数组的引用：外部一个 push 就污染派发表。

**为什么需要 maxListeners（内存泄漏视角）**

事件模型里「注册」是显式的、「注销」靠开发者自觉。高频动态创建对象 + 循环里 on 同一个全局 emitter 而不 off，是经典泄漏形态：listener 闭包持有大对象，emitter 又持有 listener，谁都不释放。maxListeners 的警告就是把这种「意外累积」在控制台暴露出来——所以它必须**不阻止注册**（可能是合法场景），只提示开发者检查。这呼应大纲阶段 1-6「常见泄漏场景」。

---

## 可运行示例

五个实现的完整代码与测试都在 `exercises/milestone/`（每个实现文件底部附冒烟 demo，可单独 `npx tsx` 运行）：

```bash
npx vitest run exercises/milestone/
# 67 个用例全绿：Promise 29 + bind 9 + new 6 + 深拷贝 10 + EventEmitter 13

npx tsx exercises/milestone/my-promise.ts   # 单文件冒烟
```

实现要点在源码注释里逐条映射规范：Promise 按 Promises/A+ 条款号（2.1.x 状态 / 2.2.x then / 2.3.x Promise Resolution Procedure）标注；bind/new 标注 ECMA-262 对应内部方法。

---

## 易错点与面试高频

1. **then 的回调时序**（高频）：`Promise.resolve().then(A)` 与 `setTimeout(B)` 的顺序——微任务先于宏任务；追问「then 里再 return Promise.resolve()」要几个微任务（2 个：then 回调一个、采纳 thenable 一个）。手写时 queueMicrotask 与原生 Promise 的 job 语义对齐。
2. **值穿透**：`.then(42)` / `.then(null, 42)` 不报错——非函数参数被规范（2.2.1/2.2.7.3/2.2.7.4）替换为透传函数，这是「catch 之前挂多少个 then 都不影响错误冒泡」的原因。
3. **resolve vs reject 的不对称**：resolve 展开 thenable（2.3），reject 永不展开。
4. **2.3.1 的自引用**：`p.then(() => p)`（p 是这条链返回的新 promise）→ TypeError；如果 p 指向的是**旧的** promise 则正常展开，不抛错。面试题常拿这两个混淆。
5. **bind 后 this 永不可改**：bind/call/apply 再怎么套都改不掉（[[Call]] 不看 this）；只有 new 能「绕开」thisArg（[[Construct]] 不引用 [[BoundThis]]）。
6. **bind 与 new 的组合**：`new (f.bind(obj))(...)` → thisArg 被忽略、原型取 `f.prototype`、`instanceof f` 与 `instanceof bound` 均为 true。
7. **bound.length 的边界**：`Math.max(target.length - 前置参数数, 0)`；target.length 本身只数第一个默认参数/剩余参数之前的形参。
8. **new 的返回值规则**：构造器返回对象 → 覆盖 this；返回原始值/null → 忽略。`new Foo()` 永远得到对象，不可能得到 42。
9. **class 不能被 call**：[[IsClassConstructor]]，call/apply/reflect.apply 全抛 TypeError；`Reflect.construct` 才是合法通道（还能换 newTarget 改原型）。
10. **深拷贝与 structuredClone 的三大差异**：原型保留（structuredClone 丢）、Symbol 键（structuredClone 丢）、函数（structuredClone 抛 DataCloneError，手写版/Lodash 共享原引用）。追问「为什么函数不能克隆」→ 闭包环境不可枚举重建。
11. **私有字段是深拷贝边界**：`#x` 不在 own keys（存于内部槽），克隆体上访问抛 TypeError——`instanceof` 成立不等于「克隆完整」。
12. **循环引用的正确解法**：先 `seen.set(原, 克隆)` 再递归；用 WeakMap 防内存泄漏。先递归后 set 是爆栈的直接原因。
13. **once + off 引用一致性**（高频）：`emitter.once('e', fn); emitter.off('e', fn)` 必须生效——取决于实现是否把「原函数」作为 off 的匹配锚点。
14. **maxListeners 只是警告**：不抛错、不阻止注册；0 = 不限制。
15. **面试追问链（Promise）**：链式怎么实现（2.2.7 每次 then 返回新 promise）→ 错误怎么冒泡（2.2.7.4 的透传代理）→ resolve promise 会发生什么（2.3 采纳，多一个微任务）→ 怎么中断链（抛错进 rejected 分支 / 抽象成 never pending）。
16. **面试追问链（bind/new）**：为什么两次 bind 改不了 this（[[Call]] 无视 this）→ new bind 后 this 是谁（[[Construct]] 无视 [[BoundThis]]）→ new 和 class 的关系（[[IsClassConstructor]] 只挡 [[Call]]，Reflect.construct 可用）→ 手写 new 的三步对应规范哪几步。

**闭卷自测清单（对照大纲「每周回顾」，能做到再翻篇）**

- Promise：白板写出 `_settle / _resolveInternal / then` 三段；不看资料说出 2.3.1 / 2.3.3.1 / 2.3.3.3.3.1 各防什么坑。
- bind：说出 [[Call]] 与 [[Construct]] 两条路径分别用不用 [[BoundThis]]；解释为什么 `instanceof bound` 也是 true。
- new：三步 + 「返回对象覆盖、原始值忽略」+ class 抛错的内部标记名。
- 深拷贝：不看资料列出 structuredClone 的三个不支持（函数/原型/Symbol 键）；解释 seen.set 的时机为什么必须在递归前。
- EventEmitter：解释 `{ raw, call }` 的设计如何同时解决 once 只触发一次与 off 引用一致性。

---

## 输出预测题

### 题 1（Promise 状态与微任务时序）

```js
// 假设 MyPromise 是符合 Promises/A+ 的实现（回调 queueMicrotask 派发，
// thenable 采纳也走微任务，与原生一致）
console.log('start');

const p = new MyPromise((resolve) => {
  console.log('executor');
  resolve(1);
});

p.then((v) => {
  console.log('then1', v);
  return MyPromise.resolve(v + 1);
}).then((v) => {
  console.log('then2', v);
});

Promise.resolve().then(() => console.log('native-micro'));

setTimeout(() => console.log('timeout'), 0);

console.log('end');
```

问：按执行顺序写出全部输出，并指出 `then2` 与 `native-micro` 谁先谁后、为什么。

### 题 2（bind + new 的 this 与原型）

```js live noInline
const base = { tag: 'base' };

function Greet() {
  this.tag = 'instance';           // 会写到哪？
  return undefined;
}
Greet.prototype.hi = function () { return this.tag; };

const BoundGreet = Greet.bind(base);
const g = new BoundGreet();

console.log(base.tag);             // A: ?
console.log(g.tag);                // B: ?
console.log(g instanceof Greet, g instanceof BoundGreet); // C: ?
console.log(g.hi());               // D: ?
console.log(BoundGreet.name, BoundGreet.length);          // E: ?
```

（提示：BoundGreet.length —— Greet 声明了 0 个形参，bind 预置 0 个参数。）

---

## 预测题答案

### 题 1 答案

```
start
executor
end
then1 1
native-micro
then2 2
timeout
```

- `executor` 同步执行（ECMA-262 §27.2.3.1：构造器同步调用 executor），先于 `end`。
- `then1` 是第 1 个微任务；它返回 `MyPromise.resolve(2)` → promise2 采纳该 thenable 又入队一个微任务（NewPromiseResolveThenableJob），所以 `then2` 比「后来才排队的 native-micro」**晚一拍**。
- 结论：thenable 采纳本身占一个微任务位——`return MyPromise.resolve(x)` 比直接 `return x` 多一拍，这是「链式 then 的微任务次数」类面试题的关键。
- `timeout` 是宏任务，微任务队列清空后才执行（事件循环每一轮先清微任务）。

### 题 2 答案

```
A: 'base'      —— new 走 [[Construct]]，完全忽略 [[BoundThis]]，base 不被写入
B: 'instance'  —— this 是以 Greet.prototype 为原型的新实例
C: true true   —— newTarget 被换成 target（§10.4.1.3），原型取 Greet.prototype；
                 bound 的 @@hasInstance 委托给 Greet（§20.2.3.5），两者都 true
D: 'instance'  —— g 的原型链上有 Greet.prototype.hi，this 指向 g
E: 'bound Greet' 0 —— SetFunctionName 前缀；max(0 - 0, 0) = 0
```

---

## 延伸阅读

一条命令跑全部练习：`npx vitest run exercises/milestone/`（5 个文件 67 个用例）。

- **Promises/A+ 规范原文**：[https://promisesaplus.com/](https://promisesaplus.com/)（2.3 的注释是精髓，尤其 then 取一次、getter 副作用、first-call-wins）
- **promises-aplus/promises-tests**：官方 872 个合规用例的测试套件（我们用 Vitest 覆盖了其中的关键行为分支）
- **ECMA-262**：
  - §27.2 Promise Objects（NewPromiseResolveThenableJob、Promise Jobs 的入队时机）
  - §10.4.1.3 BoundFunctionCreate、§20.2.3.2 Function.prototype.bind、§20.2.3.5 @@hasInstance
  - §9.2.1 [[Call]] / §9.2.2 [[Construct]]、§9.2.10 OrdinaryCreateFromConstructor、§9.2.14 new.target
- **HTML Standard §2.7.5 StructuredSerializeInternal**（structured clone 算法，函数抛 DataCloneError 的原文位置）：[https://html.spec.whatwg.org/multipage/structured-data.html](https://html.spec.whatwg.org/multipage/structured-data.html)
- **Node.js events 源码/文档**：[https://nodejs.org/api/events.html](https://nodejs.org/api/events.html)（once 的 wrapper、warned 标记、emitter.removeListener 与引用一致性）
- **lodash cloneDeep**（函数/Symbol 键/原型各自的处理边界，可与 structuredClone 三方对照）
- 本仓库关联笔记：`notes/stage-1-js-core/04-async-programming.md`（事件循环与微任务）、`notes/stage-1-js-core/03-this-and-prototype.md`（this 四规则）、`notes/stage-1-js-core/06-memory-management.md`（WeakMap 与循环引用）

