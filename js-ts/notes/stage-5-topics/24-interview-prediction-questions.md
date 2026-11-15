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
sources:
  - stage-5-topics
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

---

## 八、新补域输出题（G 组 15 题：对象模型、语法语义、数值与异步组合器）

> 本组补齐一至六节没覆盖的十五个主题域：键序、标签模板、生成器双向传参、ToPrimitive 提示、解构默认值、Promise 组合器、try/finally 完成值、类字段时序、可选链短路、双精度数值、默认排序、new.target、微任务队列顺序、浅冻结、箭头函数与 arguments。**每题的答案都在 Node v24.10.0（ESM）下实跑验证过**，推演引用 ECMA-262 算法名。用法照旧：先盖住答案逐行口播，再对答案。

### G1 · 考点：自有属性键序（OrdinaryOwnPropertyKeys）

```js
const mixed = { b: 1, 2: 'two', a: 1, 1: 'one', '-1': 'neg' };
console.log(Object.keys(mixed));
```

**你的预测**：多数人猜「全部按插入序：b, 2, a, 1, -1」或「全部升序」。

**真实答案**：`[ '1', '2', 'b', 'a', '-1' ]`（Node v24.10.0 实跑）。

**逐项解析**：① ECMA-262 的 `OrdinaryOwnPropertyKeys` 规定三段顺序：整数类索引键（canonical numeric string，0 到 2 的 32 次方减 2 的整数字符串）按**数值升序**排最前；普通字符串键按**创建序**排中间；symbol 按创建序排最后。② 所以 `2`、`1` 提前且升序为 `1`、`2`；`b`、`a` 保持插入序；③ 关键陷阱是 `'-1'`——它不是 canonical numeric string（负数与超界都不算数组索引），因此落入字符串键组按插入序垫底。④ `Object.keys` 只列字符串键（`EnumerableOwnPropertyNames`），symbol 不出现。

**一句话延伸**：依赖键序的序列化与 diff 逻辑，必须写明「整数键会跳到最前」，这也是「别用对象当有序映射、要用 Map」的最硬理由。

### G2 · 考点：标签模板与模板对象（Template Objects / String.raw）

```js
function tag(strs, ...vals) {
  return [JSON.stringify(strs), JSON.stringify(strs.raw), vals.join('|')].join(' / ');
}
console.log(tag`a${1}b${2}c`);
console.log(String.raw`a\nb`);
```

**你的预测**：常错在两点——以为 `strs` 含插入值（猜三个元素以上），或以为 `raw` 与 `strs` 不同（本例没有转义）。

**真实答案**：`["a","b","c"] / ["a","b","c"] / 1|2` 和 `a\nb`（实跑）。

**逐项解析**：① 标签模板把模板拆成「字符串数组 + 值列表」：`strs` 是**纯字符串片段**（长度 = 插入数 + 1），值走剩余参数 `vals`；② `strs.raw` 是同长度的**原始字符串数组**（保留转义序列的字符形态），模板对象本身被冻结（`Object.freeze`），且同一段模板字面量在多处出现可能共享同一个模板对象（规范允许复用）；③ `String.raw` 就是「取 raw 数组拼接」的内置标签——`a\nb` 输出的是反斜杠加 n 两个字符，不是换行。

**一句话延伸**：styled-components、GraphQL tagged template 都靠这个机制工作；理解 raw 才能解释为什么转义在 CSS-in-JS 里「不生效」。

### G3 · 考点：生成器的双向传参（next 的实参去向）

```js
function* gen() {
  const x = yield 1;
  const y = yield x * 10;
  return y + 1;
}
const g = gen();
console.log(g.next().value);
console.log(g.next(5).value);
console.log(g.next(7).value);
```

**你的预测**：高频误猜是「输出 1、10、8」——把第二个 yield 当成重新求值。

**真实答案**：`1`、`50`、`8`（实跑）。

**逐项解析**：① 第一次 `next()` 跑到第一个 `yield 1` 暂停，产出 1；此时「yield 表达式本身」还没有值；② `next(5)` 的实参 5 成为**上一个 yield 表达式的求值结果**，即 `x = 5`，继续执行产出 `x * 10 = 50`，停在第二个 yield；③ `next(7)` 使 `y = 7`，`return y + 1` 结束生成器，value 为 8、done 为 true；④ 规范依据是 generator 的 resume 语义：`next` 的实参通过 `GeneratorResume` 传入，作为 yield 的完成值。

**一句话延伸**：这是「生产者与消费者双向通信」的原语——异步任务协作、redux-saga 的 effect 驱动都建立在这个参数回传机制上。

### G4 · 考点：ToPrimitive 的三种提示与 Symbol.toPrimitive

```js
const weird = {
  [Symbol.toPrimitive](hint) {
    return hint === 'number' ? 10 : hint === 'string' ? 's' : 'default';
  },
};
console.log(weird * 2, `${weird}`, weird + 1);
```

**你的预测**：常见误猜是三处提示相同（比如全按 default 走，猜 `20 s 21`）。

**真实答案**：`20 s default1`（实跑，注意最后一项是字符串拼接）。

**逐项解析**：① `ToPrimitive(input, hint)` 的提示只有三种：乘号这类纯数值运算给 `number`；模板插值给 `string`；`+` 若无法从运算符判断（可能拼接也可能加法）给 `default`；② 有 `Symbol.toPrimitive` 时它优先于 `valueOf/toString` 链，直接按 hint 返回；③ 所以分别是 10（number）、`'s'`（string）、`'default'`——`'default' + 1` 走字符串拼接得 `default1`；④ 一至六节 A2 的「无 String 基元时都走 default」正是这条优先链的下游。

**一句话延伸**：日期对象 `+` 得字符串（default 提示走 toString）、减法得毫秒数（number 提示走 valueOf），就是这道提示分岔的现成标本。

### G5 · 考点：解构默认值的求值时机（惰性且按序）

```js
const order = [];
function logv(v) { order.push(v); return v; }
const { p = logv('p-default'), q = logv('q-default') } = { q: 9 };
console.log(order);
const [m = logv('m-default')] = [undefined];
console.log(order, m);
```

**你的预测**：常误猜两个默认值都会求值（猜 `['p-default','q-default']`），或以为 `q` 有值连默认表达式都不解析。

**真实答案**：`[ 'p-default' ]`，然后 `[ 'p-default', 'm-default' ] m-default`（实跑）。

**逐项解析**：① 默认值是**初始化器**，只在「解构出的值为 undefined」时才求值——`q` 拿到 9，`logv('q-default')` 根本不执行；② `p` 缺失，求值并**按解构声明的顺序**进行；③ 第二行数组元素显式是 `undefined`——默认值对「存在但为 undefined」同样触发（null 不触发，注意区分）；④ `m` 拿到 logv 的返回值 `'m-default'`。

**一句话延伸**：默认值表达式里放函数调用（甚至相互引用）是合法技巧，但求值顺序敏感的写法要配注释——它依赖「缺省才执行」这条惰性语义。

### G6 · 考点：Promise 组合器的失败语义（all / allSettled / any）

```js
const slow = new Promise((res) => setTimeout(() => res('slow'), 20));
const fast = Promise.reject(new Error('fast'));
Promise.all([slow, fast]).catch((e) => console.log('all:', e.message));
Promise.allSettled([slow, fast]).then((rs) =>
  console.log('allSettled:', rs.map((r) => r.status).join(',')),
);
Promise.any([fast, Promise.resolve('first-ok')]).then((v) => console.log('any:', v));
```

**你的预测**：易错点是以为 `Promise.all` 等 all 全部落定（漏掉 reject-fast），或以为 `any` 返回第一个 settle 的值。

**真实答案**（按启动顺序组织）：`all: fast`；`any: first-ok`；`allSettled: fulfilled,rejected`（实跑）。

**逐项解析**：① `all` 短路语义：任一成员 rejected 则**立即**以该错误拒绝，不管其余是否还在进行——fast 的错误原样抛出；② `allSettled` 永不短路，等全部落定，产出状态数组（fulfilled 带 value、rejected 带 reason）；③ `any` 等第一个 **fulfilled**（不是第一个 settle）：fast 的拒绝被跳过，`first-ok` 胜出；全员拒绝时才以 `AggregateError`（errors 数组含全部原因）拒绝；④ 三个组合器的失败语义各不相同，是「并发编排选型」的核心考点。

**一句话延伸**：`AbortSignal.any`（笔记 04）与 `Promise.any` 名字相近语义无关——前者组合取消信号，后者是「任一成功」。

### G7 · 考点：try/finally 的完成值覆盖

```js
function f7() {
  try { return 'try'; } finally { return 'finally'; }
}
function f7b() {
  try { throw new Error('boom'); } finally { return 'swallowed'; }
}
console.log(f7(), f7b());
```

**你的预测**：常见误猜是 `'try'`（以为 try 的 return 已定）或 f7b 抛错向上传播。

**真实答案**：`finally swallowed`（实跑）。

**逐项解析**：① 规范层面 try 语句的完成值由** finally 块的完成值优先**：try 的 return 只是「记录返回值并准备离开」，finally 里出现 return/throw/break 会**覆盖**这个准备动作；② f7b 中 finally 的 return 把进行中的 throw 直接「吞掉」——异常不再向外传播，函数正常返回；③ 两个方向的覆盖都成立：finally 里的 return 覆盖 try 的 return，也覆盖 catch 之后的传播；④ 这正是 lint 规则 `no-return-in-finally` 存在的理由——finally 里只该放清理，不该放「改变完成类型」的语句。

**一句话延伸**：finally 里清理资源的正确姿势是只写副作用不写 return；需要「清理后仍抛错」，让 finally 里的清理代码自己不产生完成值。

### G8 · 考点：类字段与静态块的初始化时序

```js
const seq = [];
class Base8 {
  b1 = seq.push('base-field');
  constructor() { seq.push('base-ctor'); }
}
class Sub8 extends Base8 {
  s1 = seq.push('sub-field');
  static sInit = seq.push('static-field');
  static { seq.push('static-block'); }
  constructor() { seq.push('sub-ctor-pre-super'); super(); seq.push('sub-ctor-post-super'); }
}
new Sub8();
console.log(seq.join(','));
```

**你的预测**：高频误猜是把 sub-field 放在 base-ctor 之前（以为子类字段先于父类构造器），或不知道静态块与静态字段的先后。

**真实答案**：`static-field,static-block,sub-ctor-pre-super,base-field,base-ctor,sub-field,sub-ctor-post-super`（实跑）。

**逐项解析**：① 类定义求值时静态侧先完成：静态字段与静态块**按声明顺序**执行（字段在前、块在后），先于一切实例化；② 实例化开始：子类构造器 `super()` 前的语句可执行（不得碰 this），记录 `sub-ctor-pre-super`；③ `super()` 调用触发基类初始化：基类字段 b1、基类构造器体依次执行；④ **`super()` 返回的那一刻**才初始化子类实例字段（规范：派生类的 `InitializeInstanceElements` 在父构造器返回后执行），所以 sub-field 落在 base-ctor 之后、post 之前；⑤ 构造器体余下语句收尾。依据：ECMA-262 类定义求值与 `ClassFieldDefinition` 记录，静态块为 ES2022 特性。

**一句话延伸**：33 册附录一用 TS emit 验证了同一时序——「super 返回是子类字段的起点」这一句，是类字段面试题的万能锚点。

### G9 · 考点：可选链的两段式短路

```js
const getLog = [];
const obj9 = { get fn() { getLog.push('called'); return undefined; } };
console.log(obj9.fn?.(), getLog);
const n9 = null;
console.log(n9?.x.y, typeof n9?.x.y);
```

**你的预测**：易误猜 getter 不执行（以为可选链整段跳过），或以为 `n9?.x.y` 抛 TypeError。

**真实答案**：`undefined [ 'called' ]` 和 `undefined undefined`（实跑）。

**逐项解析**：① 可选链 `a?.b` 短路的是「引用的**剩余链**」，不是「左侧表达式」——`obj9.fn` 的 getter 照常求值（getLog 有记录），返回 undefined 后 `?.()` 发现无函数可调，**静默返回 undefined** 不抛错；② `n9?.x.y`：n9 为 null，整条右侧链（`x.y`）被跳过，整体得 undefined——注意短路范围是「从 `?.` 到链尾」，`.y` 也被一并跳过；③ `typeof n9?.x.y` 得 `'undefined'` 字符串，证实没有 TypeError；④ 依据：可选链求值规则（OptionalChain——左侧非 null/undefined 才继续）。

**一句话延伸**：`a?.b.c` 短路的是整条尾部链，但 `a.b?.c` 只从 `?.` 起短路——两段的分界画在哪，决定哪段 getter 会被触发。

### G10 · 考点：IEEE 754 双精度的三个整数陷阱

```js
console.log(0.1 + 0.2 === 0.3, (0.1 + 0.2).toFixed(17));
console.log(2 ** 53, 2 ** 53 + 1, 2 ** 53 === 2 ** 53 + 1);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(9007199254740993);
```

**你的预测**：常误猜第二行「2 的 53 次方加 1」能表示，或第三行为 false。

**真实答案**：`false 0.30000000000000004`；`9007199254740992 9007199254740992 true`；`true`；`9007199254740992`（实跑）。

**逐项解析**：① Number 是 IEEE 754 双精度：0.1 与 0.2 都不能精确表示，和为最接近的可表示数，`toFixed(17)` 暴露真实存储值；② 双精度小数部分 52 位，加上隐含首位共 53 位有效位——2 的 53 次方以上的整数开始「降密度」：相邻可表示数间隔变为 2，所以 `2 ** 53 + 1` 舍入回 `2 ** 53`，两者相等；③ MAX_SAFE_INTEGER（2 的 53 次方减 1）加 1 与加 2 都舍入到同一可表示数，故相等——这就是「安全整数」的边界含义；④ 字面量 `9007199254740993` 在**解析阶段**就舍入（词法阶段的 NumericValue 舍入），运行时看到的已是 9902 结尾。

**一句话延伸**：超安全整数业务（订单号、雪花 ID）必须在传输与比较前字符串化——JSON.parse 的大整数丢失发生在解析层，代码逻辑无懈可击也会错。

### G11 · 考点：sort 的默认比较（SortCompare）

```js
console.log([10, 9, 100, 2].sort());
console.log([10, 9, 100, 2].sort((a, b) => a - b));
```

**你的预测**：新手猜 `[ 2, 9, 10, 100 ]` 两行相同；老手知道第一行错但未必说得清比较算法。

**真实答案**：`[ 10, 100, 2, 9 ]` 和 `[ 2, 9, 10, 100 ]`（实跑）。

**逐项解析**：① 无参 sort 的 `SortCompare` 把元素经 `ToString` 后**按字符串逐码点比较**——`'10' < '100' < '2' < '9'`（'1' 的码点小于 '2'）；② 传入比较函数后按其返回值符号排序：负数 a 在前、正数 b 在前、0 保持（引擎稳定排序，ES2019 起规范要求）；③ sort **原地修改**并返回同一引用（`console.log(arr === arr.sort())` 为 true），链式调用时要意识到副作用；④ undefined 元素被排到末尾且不调用比较函数（规范特判）。

**一句话延伸**：默认排序对「数字数组」几乎总是错的；对「数字字符串数组」却可能恰好对——判断依据是比较发生在字符串域还是数值域。

### G12 · 考点：new.target 与构造卫兵

```js
class Shape {
  constructor() {
    if (new.target === Shape) throw new Error('Shape 不能直接实例化');
  }
}
class Circle extends Shape {}
console.log(new Circle() instanceof Shape);
try { new Shape(); } catch (e) { console.log('caught:', e.message); }
```

**你的预测**：易错点是以为 `new Circle()` 也抛错（以为 new.target 恒等于定义所在的类）。

**真实答案**：`true` 和 `caught: Shape 不能直接实例化`（实跑）。

**逐项解析**：① `new.target` 是元属性，值为「本次 new 实际使用的构造函数」——`new Circle()` 时它是 Circle，卫兵只在「直接 new Shape」时命中；② 这正是 TS `abstract` 关键字的运行时等价物（33 册：TS 的 abstract 只挡类型层，运行时不设防；这个模式补上运行时一层）；③ 基类卫兵配合 `instanceof` 判定，比「约定首字母大写不 new」可靠；④ 函数形态下 `new.target` 为 undefined 可区分「new 调用与普通调用」，是构造函数双模式 API 的判定器。

**一句话延伸**：Reflect.construct 允许注入第三个参数改变 new.target——子类化内置类型（如 Error 集合）时用得上，这是 new.target 与普通 this 判定的本质差异。

---

## 九、G 组答案速查与考点分布

| 题 | 答案 | 规范依据（算法/内部槽） |
| --- | --- | --- |
| G1 | `['1','2','b','a','-1']` | OrdinaryOwnPropertyKeys 三段序 |
| G2 | `["a","b","c"] / ["a","b","c"] / 1\|2` 与 `a\nb` | Template Objects 冻结与 raw |
| G3 | `1 50 8` | GeneratorResume 的实参回传 |
| G4 | `20 s default1` | ToPrimitive 提示三态与 Symbol.toPrimitive 优先 |
| G5 | `['p-default']`、`['p-default','m-default'] m-default` | 解构初始化器 undefined 触发、按序惰性 |
| G6 | `all: fast`、`any: first-ok`、`allSettled: fulfilled,rejected` | Promise.all / any / allSettled 函数 |
| G7 | `finally swallowed` | try 语句完成值：finally 优先 |
| G8 | `static-field,static-block,sub-ctor-pre-super,base-field,base-ctor,sub-field,sub-ctor-post-super` | InitializeInstanceElements 时序 |
| G9 | `undefined ['called']` 与 `undefined undefined` | OptionalChain 短路范围 |
| G10 | `false 0.30000000000000004`、`2\*\*53 === 2\*\*53+1` 为 true、`true`、`9007199254740992` | IEEE 754 双精度与字面量舍入 |
| G11 | `[10,100,2,9]` 与 `[2,9,10,100]` | SortCompare 的 ToString 比较 |
| G12 | `true`、`caught: Shape 不能直接实例化` | new.target 元属性 |
| G13 | `micro-then`、`micro-queue`、`micro-then-2` | 微任务单队列先进先出 |
| G14 | `2 false`；严格模式顶层赋值抛 TypeError | Object.freeze 只及自有属性 |
| G15 | `3` | 箭头函数沿词法取外层 arguments |

考点分布对照一至六节的空白：G1/G11/G12/G14 补对象模型与内置算法域，G2/G3/G5/G7/G9/G15 补语法语义域，G4/G10 补类型转换与数值域的进阶层，G6/G13 补异步与事件循环域，G8 是第四节原型与类在 ES2022 字段语义上的延伸。十五题全部经 Node v24.10.0 实跑（逐题验证后誊录），与册首「不是背结论」的口径一致。

### G13 · 考点：微任务队列的入队顺序（queueMicrotask 与 then 同队）

```js
Promise.resolve().then(() => console.log('micro-then'));
queueMicrotask(() => console.log('micro-queue'));
Promise.resolve().then(() => console.log('micro-then-2'));
```

**你的预测**：高频误猜是「then 注册的回调优先于 queueMicrotask」——以为两者分属不同优先级队列。

**真实答案**：`micro-then`、`micro-queue`、`micro-then-2`（Node v24.10.0 实跑）。

**逐项解析**：① `queueMicrotask` 与 then/catch/finally 回调、await 恢复进的是**同一个微任务队列**，没有任何内部分级——按入队顺序先进先出；② 三个回调的入队顺序就是三行代码的执行顺序，清空队列时依序执行；③ 依据：HTML Standard 事件循环「清空微任务队列」步骤（笔记 04），ECMA-262 侧 `PromiseJob` 与 `queueMicrotaskJob` 同一容器；④ 真正有「优先级差异」的是宏任务与微任务之间，以及浏览器渲染时机（rAF），不在微任务内部。

**一句话延伸**：调试「为什么这个清理逻辑跑在渲染之前/之后」时，先画出「同步段 → 微任务队列按入队序清空 →（浏览器）rAF → 渲染」这条主轴，再对号入座。

### G14 · 考点：Object.freeze 的浅层语义

```js
const frozen = Object.freeze({ inner: { x: 1 } });
frozen.inner.x = 2;
console.log(frozen.inner.x, Object.isFrozen(frozen.inner));
```

**你的预测**：常误猜内层也被冻结（猜 `1 false` 之外的结果，如抛错或输出 `1 true`）。

**真实答案**：`2 false`（Node v24.10.0 实跑）。若在严格模式下给顶层属性赋值（`frozen.a = 2`），实测抛 TypeError。

**逐项解析**：① 冻结只作用于**自有属性**：`inner` 指向的内层对象没有被冻结，属性照常可变（isFrozen 为 false）；② 冻结顶层后，「给顶层属性赋值或改描述符」在严格模式抛 TypeError、宽松模式静默失败（模块代码是严格的，必抛）；③ `Object.freeze` 返回原引用（不是副本），配深冻结要递归处理或用 structuredClone 后逐层冻；④ 依据：`Object.freeze` 定义——设置全部自有属性为不可写不可配置，并阻止扩展。

**一句话延伸**：「冻结即不可变」是高频误解——React/Vue 的 props 浅只读（readonly）同样是浅层语义，嵌套可变要靠约定或库。

### G15 · 考点：箭头函数没有自己的 arguments

```js
function outer() {
  const f = () => arguments.length;
  return f();
}
console.log(outer(1, 2, 3));
```

**你的预测**：易误猜 `0`（以为箭头函数的 arguments 是自己的空绑定）或直接 TypeError。

**真实答案**：`3`（Node v24.10.0 实跑）。

**逐项解析**：① 箭头函数**不创建自己的 arguments 绑定**，`arguments` 标识符沿词法作用域向外查找——捕获的是 `outer` 的 arguments 对象，长度为 3；② 与 this 的词法捕获（C5）是同一机制：箭头函数把 this、arguments、super、new.target 四个「函数环境绑定」全部交给外层普通函数环境；③ 因此「箭头函数里用 arguments 拿自己的实参」不可能——需要实参列表就用剩余参数（`(...args) => args`）；④ 严格模式下普通函数的 arguments 仍可用但与参数解耦（非严格模式有 arguments 与参数的联动映射，模块代码不受影响）。

**一句话延伸**：剩余参数全面替代 arguments（可箭头、可解构、是真数组），新代码把 arguments 只留给「捕获外层普通函数实参」这一种用途。


---

## 十、简答高频增补（续五条）

11. **Map 与对象怎么选**：Map 键保持插入序且**任意类型**可作键；对象键只能是字符串或 symbol，且整数类键被强制重排到最前（G1）。需要「有序的任意键映射」只能 Map；需要 JSON 序列化或作为普通数据结构时用对象。Map 的 size 是 O(1) 属性，对象的「键个数」要 `Object.keys().length`。
12. **「JS 是引用传递」为什么是误称**：JS 实参一律**按值传递**，只是「值」在对象场景下是引用的拷贝（术语：call by sharing）。所以函数内给形参重新赋值不影响外部变量（引用拷贝被覆盖），修改共享对象的属性会影响外部（同一本体）。两种现象一个机制，不必发明「有时值传递有时引用传递」的说法。
13. **structuredClone 与 JSON 序列化的差异**：structuredClone 支持**循环引用**、保真 Date/RegExp/Map/Set/TypedArray/ArrayBuffer；函数、DOM 节点会抛 DataCloneError，Error 的自定义属性不保留。JSON 路线丢函数与 symbol 键、日期变字符串、undefined 属性消失、循环引用直接抛错。依据：HTML Standard 的 StructuredSerialize 算法。深拷贝选型：数据纯（可 JSON）用 JSON 路线最省；有 Map/Set/循环引用必须 structuredClone。
14. **Symbol 的三个正经用途**：其一，唯一属性键防撞（不进 for-in 与 Object.keys，但 `Object.getOwnPropertySymbols` 可见——不是真私有）；其二，定制语言协议的 well-known symbol（`Symbol.iterator`、`Symbol.toPrimitive`、`Symbol.hasInstance` 等，G4 与 F1 都是其应用）；其三，`Symbol.for` 全局注册表实现跨realm共享键。语法红线：`new Symbol()` 抛 TypeError（symbol 不是构造器，只有 `Symbol()` 包装函数）。
15. **弱引用家族的边界**：WeakMap/WeakSet 的键为弱引用、**不可枚举**（内容取决于 GC 进度，遍历语义无法稳定）；WeakRef 让对象可被「弱观察」，FinalizationRegistry 注册清理回调——但规范明说回调**何时执行甚至是否执行都不保证**（GC 策略自由裁量）。工程结论：资源释放（定时器、连接、监听器）必须走显式清理路径，弱引用家族只用于缓存与调试辅助，不能承载正确性逻辑。
16. **带 g 标志的正则是有状态的**：`exec`/`test` 会推进并复用正则对象上的 `lastIndex`——同一个 `/g` 正则第二次 `test` 从上次停的位置继续，内容没变也可能返回 false 并把 lastIndex 归零。实跑收据（Node v24）：`const r = /\d/g; r.test('a1'), r.test('a1'), r.lastIndex` 依次为 `true`、`false`、`0`（第二次从下标 2 起找不到，失败后 lastIndex 重置）。`replace` 每次调用独立，不受残留 lastIndex 影响（实测 `'a1b2'.replace(r, '#')` 得 `a#b#`）。工程结论：全局正则当实例字段复用（组件里 `this.re = /x/g`）是多输入场景的经典 bug，要么每次字面量新建，要么手动管理 lastIndex。
17. **浏览器渲染管线里微任务与 rAF 的位置**：一轮事件循环是「取一个宏任务 → 清空整个微任务队列 →（该帧需要更新时）运行 rAF 回调 → style/layout/paint」。推论两条：微任务一定在本帧 rAF 之前跑完（rAF 里读不到「同帧更早宏任务里刚入队的微任务结果」以外的状态，除非它已清空）；rAF 每帧至多一次而微任务不限条数——把高频逻辑放微任务会造成「一帧多次执行」，这正是防抖节流（笔记 08）与 rAF 节流的分工依据。依据：WHATWG HTML Standard《Event loops》processing model（册首延伸阅读）。
18. **Worker 与主线程通信的成本模型**：postMessage 默认走**结构化克隆**（同简答 13 的算法），大对象是「值拷贝」成本；Transferable（ArrayBuffer）走所有权转移，零拷贝但要放弃原线程访问权；SharedArrayBuffer + Atomics 才是真正的共享内存方案（需要跨线程同步原语）。选型口诀：低频大消息用克隆图省心、大二进制用转移、高频共享状态才上 SAB——成本模型答出来比背 API 加分。
19. **为什么压缩器把 undefined 输出成 void 0**：`undefined` 在 ES5 之后是不可写的全局属性，但它**仍是合法的标识符名**——函数可以声明名为 undefined 的参数把它遮蔽，实跑收据：`(function (undefined) { return undefined; })(1)` 返回 `1`（Node v24）。`void 0` 是运算符表达式，求值恒为 undefined 且不可被任何作用域遮蔽，所以成为压缩器的安全替换。同理区分：`void` 后跟任意表达式都返回 undefined（`void (1 + 1)`），只写 `void 0` 是约定俗成的最短形式。依据：ECMA-262 的 void 运算符（求值操作数、返回 undefined）与全局对象属性 undefined 的 writable 为 false。

---

## G 组与简答增补的收束

G 组十五题加简答五条的共同命题方式：先给你一个「直觉上应该怎样」的预测项，再用规范算法名与实跑输出对照。把这套「预测、实跑、给依据」的三步当成复习法：任何你觉得「记住了」的知识点，先写预测再实跑对照，跑输的那一次就是下一次面试的得分点。延伸阅读统一指向册首列出的 ECMA-262 与 WHATWG HTML Standard 对应章节：键序在 OrdinaryOwnPropertyKeys，微任务在 event loops 的 perform a microtask checkpoint，结构化克隆在 StructuredSerialize。


