---
mdx:
  format: mdx
references:
  - 01-types-and-coercion
  - 02-scope-and-closure
  - 03-this-and-prototype
  - 04-async-programming
  - 05-es2015-plus
  - 16-modules-esm-cjs
  - 13-ts-type-theory
  - 10-ts-generics
  - 08-render-and-performance
  - 07-v8-engine
  - 20-package-manager-monorepo
  - 17-build-tools
---
# 24 · 面试高频输出预测题集

> 对应大纲：阶段 5「面试高频输出预测题集」。
> 用法：**先盖住答案，逐行口播推演，再对答案**。每道题的答案与「逐步推演」都在各节末尾统一给出；全部答案已在 Node 24（ESM/严格模式）下真实运行验证，不是背结论。建议配合对照笔记：类型转换→01、作用域闭包→02、this/原型→03、异步→04、迭代器/Proxy→05、泛型→10。

## 学习目标

1. 高频输出题能「逐行推演」而不是凭感觉猜结果
2. 每道题都能说出规范层面的依据（哪个抽象算法、哪条内部方法）
3. 简答题能在 60 秒内给出结构化回答

---

## 一、类型与转换（7 题）

### A1

```js live noInline
console.log([] == ![]);
```

### A2

```js live noInline
console.log([] + {});
```

### A3

```js live noInline
console.log(eval('{} + []')); // 语句位置
console.log(({} + []));       // 表达式位置
```

### A4

```js live noInline
console.log(1 + '2' - '2');
```

### A5

```js live noInline
console.log(typeof typeof 1);
```

### A6

```js live noInline
console.log(Object.is(NaN, NaN), NaN === NaN);
```

### A7

```js live noInline
console.log([] == '');
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| A1 | `true` | `![]` 先算：`ToBoolean([])` 为 `true`（数组是对象）→ `!true` = `false`。然后 `[] == false`：`false` 转 数字 `0`；`[]` 走 `ToPrimitive([])` → `""` → `ToNumber("")` = `0`；`0 == 0` → `true`。依据 ECMA-262 `IsLooselyEqual`（笔记 01） |
| A2 | `[object Object]` | `+` 两边无 String 基元时都走 `ToPrimitive(default)`：`[]` → `""`，`{}` → `"[object Object]"`；`"" + "[object Object]"` |
| A3 | `0` 和 `[object Object]` | 语句位置的 `{}` 被解析成**空块语句**，`+[]` 是一元加 → `Number("")` = `0`；加括号后 `{}` 是对象字面量 → 走 A2 的拼接。**REPL/控制台会自动加括号**所以显示 `[object Object]`，这是环境差异不是语言差异 |
| A4 | `10` | `+` 有 String 参与：`1 + '2'` = `'12'`；`-` 只做数值：`'12' - '2'` = `10` |
| A5 | `string` | `typeof 1` = `'number'`（一个字符串），`typeof 'number'` = `'string'` |
| A6 | `true false` | `===` 用 `IsStrictlyEqual`：NaN 与任何值（含自身）不等；`Object.is` 用 `SameValue`：NaN === NaN 为 true。差异点只有 NaN 和 ±0 两个（笔记 01） |
| A7 | `true` | `[]` → `ToPrimitive` → `""`，`"" == ""` → `true` |

---

## 二、作用域与闭包（4 题）

### B1 / B2

```js live noInline
for (var i = 0; i < 3; i++) setTimeout(() => console.log('B1', i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => console.log('B2', j), 0);
```

### B3

```js live noInline
// 宽松（非模块）环境下：
console.log(typeof a);
function a() {}
var a;
```

### B4

```js live noInline
const count = (function counter(start = 0) {
  let n = start;
  return function () { return ++n; };
})(5);
count(); count();
console.log(count());
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| B1 | `3 3 3` | 三个回调共享**同一个** `var i` 绑定；同步循环先把 i 推到 3 才轮到定时器执行，闭包捕获的是「变量」不是「值」。依据：`var` 的循环变量属于函数级 Environment Record（笔记 02） |
| B2 | `0 1 2` | `let` 触发 `CreatePerIterationEnvironment`：**每轮迭代新建一个 Environment Record**，回调各自捕获当轮的 `j` 快照 |
| B3 | `function` | 声明实例化时函数声明「绑定 + 初始化」一步到位，`var a` 的重复声明实例化不覆盖已存在的绑定。**注意**：在 ESM/严格模块里 `function a` 与 `var a` 同名会直接 SyntaxError（词法声明冲突检测）——这也是考点 |
| B4 | `8` | IIFE 以 5 启动，`n` 被闭包持有；`count()` 调了**三次**（前两行 + `console.log` 里这一次），`5 → 6 → 7 → 8`。陷阱在于 `console.log(count())` 本身就是一次调用 |

---

## 三、this（5 题）

> 本节所有代码按模块（严格模式）语义执行。

### C1

```js live noInline
const obj = { tag: 'obj', get() { return this === undefined ? '<undefined>' : this.tag; } };
const f = obj.get;
console.log(obj.get(), f());
```

### C2

```js live noInline
setTimeout(function () { console.log(Object.prototype.toString.call(this), this.constructor.name); }, 0);
setTimeout(() => console.log(this === undefined), 0);
```

### C3

```js live noInline
const box = { name: 'box', inner: { name: 'inner', who() { return this.name; } } };
console.log(box.inner.who());
```

### C4

```js live noInline
'use strict';
console.log((function () { return this === null; }).call(null));
console.log(new Function('return this === globalThis').call(null));
```

### C5

```js live noInline
const timer = {
  seconds: 42,
  start() {
    const arrow = () => this;
    function plain() { return this; }
    console.log(arrow() === timer, plain() === undefined);
  },
};
timer.start();
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| C1 | `obj <undefined>` | `obj.get()` 是属性引用调用（Reference 有 base）→ this = obj；`f()` 裸调用 → 严格模式默认绑定 this = `undefined`（笔记 03 四规则） |
| C2 | `[object Object] Timeout` 和 `true` | **宿主会显式传 thisArg**：Node 的 setTimeout 把 Timeout 实例作为 thisArg 调用普通函数回调（新版 Node 移除了它的 toStringTag 所以显示 `[object Object]`，`constructor.name` 暴露真身）；浏览器宽松代码常见 globalThis。**箭头函数免疫**（[[ThisMode]] = lexical，thisArg 被忽略）→ 沿词法取模块顶层 this = undefined |
| C3 | `inner` | 隐式绑定只看**最后一个属性引用**：`box.inner.who()` 的接收者是 `inner`（笔记 03） |
| C4 | `true true` | 严格模式 `call(null)` 原样保留 null；`new Function` 创建的函数体天然是宽松代码 → null 被替换成 globalThis（`OrdinaryCallBindThis` 的 global 分支） |
| C5 | `true true` | 箭头函数在方法 `start()` 体内定义 → 捕获方法调用时的 this = timer（穿透任何嵌套）；普通函数 `plain()` 裸调用 → 严格模式 undefined |

---

## 四、原型与类（4 题）

### D1

```js live noInline
console.log(
  Function.prototype.__proto__ === Object.prototype,
  Object.prototype.__proto__ === null
);
```

### D2

```js live noInline
function A() {}
const a = new A();
console.log(a instanceof A, a instanceof Object);
A.prototype = { x: 1 }; // 换掉原型
console.log(a instanceof A, a instanceof Object);
```

### D3

```js live noInline
function A() {}
A.prototype = { x: 1 };
const o = {};
console.log(o.constructor === Object, A.prototype.constructor === Object);
```

### D4

```js live noInline
class C {
  #s = 1;
  get() { return this.#s; }
}
const c = new C();
console.log(Object.keys(c), '#s' in c);
try { C.prototype.get.call({}); } catch (e) { console.log(e.constructor.name); }
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| D1 | `true true` | `Function.prototype` 本身是个函数对象，函数的 [[Prototype]] 指向 `Object.prototype`；`Object.prototype` 是链的终点（`[[Prototype]]` 为 null）。一句话画链：`fn → Function.prototype → Object.prototype → null` |
| D2 | 换前 `true true`，换后 `false true` | `instanceof` 每次都沿构造函数**当前**的 `prototype` 向上查（`OrdinaryHasInstance`）；换原型后旧实例 `a` 的链上没有新原型对象；但仍链到 `Object.prototype` |
| D3 | `true true` | `constructor` 只是原型对象上的一个属性；整体替换原型对象会把它丢掉 → 沿链在 `Object.prototype` 上找到 `Object`。修法：`A.prototype.constructor = A` 或只改单个方法 |
| D4 | `[] false` 和 `TypeError` | `#private` 是**真私有**：不进自有属性、`in` 也不可见；类方法通过 `.call({})` 在「未声明该私有字段的类的实例」上读 `#s` → TypeError（不是 undefined！）。同类实例之间互读是允许的 |

---

## 五、异步综合（5 题）

### E1（基础混排）

```js live noInline
console.log(1);
setTimeout(() => console.log(2));
Promise.resolve().then(() => console.log(3));
console.log(4);
```

### E2（async 函数同步段）

```js live noInline
async function a() {
  console.log('a-start');
  await 0;
  console.log('a-end');
}
console.log('script');
a();
Promise.resolve().then(() => console.log('micro-1'));
setTimeout(() => console.log('timeout'));
```

### E3（错误传播与跳过）

```js live noInline
Promise.resolve()
  .then(() => { throw new Error('x'); })
  .then(() => console.log('skip'))
  .catch(() => console.log('caught'))
  .then(() => console.log('after'));
```

### E4（thenable adoption 多一拍）

```js live noInline
const thenable = { then(res) { console.log('then-body'); res(42); } };
Promise.resolve(1)
  .then(() => thenable)
  .then((v) => console.log('got', v));
console.log('sync');
```

### E5（forEach 不等待）

```js live noInline
const list = [1, 2, 3];
list.forEach(async (n) => { await Promise.resolve(); console.log('item', n); });
console.log('end');
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| E1 | `1 4 3 2` | 同步代码 → 微任务（then）→ 宏任务（setTimeout）。一轮循环 = 一个 task + **清空整个**微任务队列（HTML Standard 事件循环，笔记 04） |
| E2 | `script → a-start`，微任务：`a-end → micro-1`，宏任务：`timeout` | async 函数体到第一个 `await` 前是**同步**的；`await 0` 把后续代码包成微任务（先入队）→ `micro-1` 的 then 后入队。所以 a-end 在 micro-1 前 |
| E3 | `caught` → `after`（`skip` 不打印） | throw 让 then 返回的 Promise 变 rejected，链上**最近的** reject 处理器之前的 onFulfilled 全部跳过；catch 处理后恢复 fulfilled，`after` 执行 |
| E4 | `sync → then-body → got 42` | then 回调返回 thenable 时，链式解析要**额外排一个** `NewPromiseResolveThenableJob`（取 then、以它为回调再 resolve）——比返回普通值多两个微任务拍（笔记 04「多一拍」） |
| E5 | `end` 先打印，然后 `item 1/2/3` | `forEach` 不等待回调返回的 Promise（它只是同步发起三个 async 调用立刻返回）；要串行用 `for...of + await`，要并发先 `map` 再 `Promise.all` |

---

## 六、迭代器与 Proxy（2 题）

### F1

```js live noInline
const oneToThree = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => ({ value: ++i, done: i > 3 }) };
  },
};
console.log([...oneToThree]);
for (const x of oneToThree) console.log(x);
```

### F2

```js live noInline
const p = new Proxy({ a: 1 }, { get(t, k) { return t[k] * 10; } });
console.log(p.a, p.b);
```

### 本节答案

| 题 | 答案 | 逐步推演 |
| --- | --- | --- |
| F1 | `[ 1, 2, 3 ]` 和 `1 2 3` | 展开与 `for...of` 都只认 `[Symbol.iterator]` 协议：先取迭代器，再反复 `next()` 直到 `done: true`。注意 `done` 在第 4 次 next 才为 true，所以前三次的 value 都被消费（笔记 05 迭代器协议） |
| F2 | `10 NaN` | get trap 对**所有**读取生效：`t.a * 10` = 10；`t.b` = undefined，`undefined * 10` = NaN。trap 里没有对「不存在的 key」做区分——这正是手写响应式时「读不存在的 key 也会 track」的原因 |

---

## 七、简答高频 10 条（60 秒版）

1. **事件循环一轮的步骤**：取一个宏任务执行 → 清空整个微任务队列（含执行中新入队的）→（浏览器）rAF → 渲染。微任务来源：then/catch/finally 回调、await 恢复、queueMicrotask、MutationObserver。
2. **Promise 为什么不可取消、怎么办**：Promise 是一次性状态机，规范没有取消语义；取消的是**副作用**——用 AbortController 的 signal 贯穿异步操作，abort 触发监听让操作提前结束（Promise 落成 rejected），`AbortSignal.timeout/any` 可组合（笔记 04）。
3. **TDZ 是什么**：`let/const` 在声明实例化时「绑定存在但未初始化」，求值阶段访问未初始化绑定抛 ReferenceError；`typeof` 也抛（区别于未声明变量的 `"undefined"`）。它是「环境实例化先于语句执行」的结果，不是 AST 变换（笔记 02）。
4. **ESM 的 live binding**：导出的是**变量绑定**不是值快照，import 侧通过只读引用始终读到最新值；CJS 的 `require` 返回值拷贝快照。CJS 循环依赖拿到「部分完成的 exports」，ESM 靠函数声明提升可在求值前引用（笔记 16，练习 `live-binding.mjs`）。
5. **结构类型是什么**：TS 只比较「形状」不关心「名字」；例外是对象字面量直接赋值触发多余属性检查。名义化用 brand 技巧模拟（笔记 13）。
6. **泛型擦除**：类型参数只存在于编译期，运行时完全消失——所以不能用 `instanceof T`、不能做 `T` 的运行时分支；需要运行时信息就得传构造器/类型标签（笔记 10）。
7. **防抖与节流的差异**：防抖 = 停止触发 delay 后执行一次（回城读条被打断就重来）；节流 = 周期内最多执行一次（技能 CD）。防抖适合搜索输入/resize 结束，节流适合滚动/mousemove（笔记 08，练习 `03-debounce-throttle.ts`）。
8. **隐藏类为什么影响性能**：V8 用形状（Map/hidden class）描述对象布局，同形状对象共享偏移信息，IC 命中单态快路径；构造顺序不一致/delete/混形状会分叉出多态甚至超多态，退化为字典查找（笔记 07，练习 `01-hidden-class.mjs`）。
9. **pnpm 为什么省空间又严格**：全局 content-addressable store 按文件内容存一份，项目内硬链接复用；node_modules 里只有直接依赖的 symlink 结构，天然隔离幽灵依赖（笔记 20）。
10. **为什么 `npx tsx` 跑通了类型还可能是错的**：tsx/esbuild 只做**转译**（抹掉类型），不做类型检查；类型对不对必须 `tsc --noEmit` 单独验证——本工作区每个练习都配了两种命令（笔记 17/00）。

---

## 延伸阅读

- ECMA-262（tc39.es/ecma262）：IsLooselyEqual / ToPrimitive / OrdinaryCallBindThis / OrdinaryHasInstance / Promise Jobs
- WHATWG HTML Standard《Event loops》《Timers》
- TS Handbook《Narrowing》《Generics》
- MDN：Private properties、Proxy「invariant」小节
- 本工作区：01–05 / 10 / 13 / 16 / 17 / 20 各笔记与配套练习
