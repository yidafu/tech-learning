---
mdx:
  format: mdx
references:
  - 03-this-and-prototype
  - 30-internals-vs-mainstream
  - 27-weird-behaviors-by-stage
  - 07-v8-engine
---
# 29 · 原型链补充：谱系、槽位规则、instanceof、键序与污染攻防

> 对应大纲：阶段 1.3 的深化补充（**基础语义在笔记 03**——OrdinaryGet/OrdinarySet、receiver、prototype/`__proto__`/constructor 三角、class 不是纯糖，本文不重复）；回扣笔记 30（原型派发的实现视角）、笔记 27（`{}` 位置二义的语法层视角）。
> 一手依据：ECMA-262——`OrdinaryGetPrototypeOf`/`OrdinarySetPrototypeOf`（环检测）、`BoundFunctionCreate`、`OrdinaryHasInstance` 与 `Function.prototype[@@hasInstance]`、`OrdinaryOwnPropertyKeys`（键序三段规则）、`EnumerateObjectProperties`（for-in 的屏蔽规则）、`JSON.parse` 的 CreateDataProperty、`OrdinarySetWithOwnDescriptor`（继承只读 data 属性的写入失败）、`MakeConstructor`（.prototype 槽的创建条件）。

## 学习目标

- 能徒手画出任何值（数组、函数、箭头函数、类、bound 函数、Math、null-proto 对象）的完整原型链。
- 能说清 `.prototype` **槽**的存在规则，并纠正「有 prototype 属性 = 能 new」的近似说法（generator 反例）。
- 能解释 `instanceof` 的完整算法与 `Symbol.hasInstance` 的接管机制。
- 能背出 `OrdinaryOwnPropertyKeys` 的三段键序，并区分 `Object.keys` / `getOwnPropertyNames` / `Reflect.ownKeys` / `for-in` 四个 API 的差异。
- 能复现一个 prototype pollution 攻击链并给出三层防御。

---

## 关键概念

### 1. 谱系全景：每条链的终点都是 null

用 `Object.getPrototypeOf` 一路走到 null（练习 07 第一节实测），全景如下：

```
[]                     → Array.prototype → Object.prototype → null
"str"(原始值)           → (临时装箱 String.prototype) → Object.prototype → null
function(){}           → Function.prototype(本身是函数!) → Object.prototype → null
() => {}               → Function.prototype → Object.prototype → null   ← 箭头也在函数族
class C {}             → Function.prototype → Object.prototype → null   ← 类是函数
new C()                → C.prototype → Object.prototype → null
C.prototype            → Object.prototype → null                        ← 模板对象本身没有特殊爹
f.bind()               → Function.prototype → Object.prototype → null   ← bound 的原型取自 target（BoundFunctionCreate）
Math                   → Object.prototype → null                        ← 单例对象，不是函数
Object.create(null)    → null                                           ← 一级都不查的字典
```

三个容易含糊的点：

1. **`Function.prototype` 自己是个函数**（`typeof === "function"`，调用返回 undefined）——它是「函数一族」的链上最后一个函数；「所有函数都是 Function 的实例」在链上成立（fn → Function.prototype），但 `fn.constructor === Function` 只是这条链末端 constructor 属性的巧合读法，不是「Function 造了 fn」的运行时事实。
2. **bound 函数的原型 = target 的原型**：`BoundFunctionCreate` 明确规定 bound 的 `[[Prototype]]` 取 `target.[[GetPrototypeOf]]()`。所以 bound 的谱系与原函数一致（练习 1g），但 bound **没有自己的 `.prototype` 槽**（见下节）——这两件事合起来解释「new boundFn 的实例原型为什么来自原函数」。
3. **class 两条链**（笔记 03 §7.5 的完整化）：实例链 `new C() → C.prototype → Object.prototype → null`；静态链 `C → Function.prototype → Object.prototype → null`；`extends` 时静态链变成 `Child → Parent`（类 → 类），实例链变成 `Child.prototype → Parent.prototype`。静态方法继承、静态 super 都活在第二条链上。

### 2. `.prototype` 槽的存在规则：它是实例模板，不是「自己的爹」

记忆口诀先行：**函数自己的爹查 `Object.getPrototypeOf(fn)`（永远在）；`.prototype` 属性是「这个函数的孩子模板」——只有创建时走了 `MakeConstructor` 的函数才有这个槽**（练习 07 第二节实测）：

| 函数种类 | `.prototype` 槽 | 可 `new`？ | 说明 |
| --- | --- | --- | --- |
| `function fn(){}` | ✅ 对象，`.constructor` 回指 | ✅ | 标准 MakeConstructor |
| `() => {}` | ❌ undefined | ❌ | 无 `[[Construct]]` |
| `async function` | ❌ undefined | ❌ | |
| 类方法 / 对象方法简写 | ❌ undefined | ❌ | DefineMethod 不走 MakeConstructor |
| bound 函数 | ❌ undefined | ✅（转发给 target） | 实例由 target + new.target 产出 |
| `function* gen(){}` | ✅ 对象 | **❌** | **唯一反例**：槽是「generator 对象的原型模板」，`new gen()` 抛 TypeError |

generator 的反例价值在于把概念拆干净：`.prototype` 槽的本职是「**实例模板**」——大多数情况下这个实例由 new 产生，generator 情况下由调用产生（`gen()` 产出的 generator 对象原型是 `gen.prototype`）。「有槽」与「可 new」不是一回事，「可 new」要求的是 `[[Construct]]` 内部方法。

TS 视角的佐证：TypeScript 的函数类型视图里，箭头函数类型根本没有 `prototype` 成员（访问即 TS2339）——类型的静态视图已经把「这个函数不是构造器」编码了；运行时用 undefined 的槽位说出同一件事。练习刻意用 `.mjs` 就是为了观察后者。

### 3. `[[SetPrototypeOf]]` 的环检测：引擎拒绝闭环

`Object.setPrototypeOf(p, q)` 的规范流程：先沿 q 的原型链检查 p 是否已在其中（防环），在则返回 false → setPrototypeOf 抛 **TypeError**（不是静默失败）：

```js live noInline
const p = {};
const q = Object.create(p);        // p 已在 q 的链上
Object.setPrototypeOf(p, q);       // TypeError：会造成 p↔q 互为祖先，属性查找将死循环
```

为什么要硬拦：OrdinaryGet 是「沿链逐级查找直到 null」——链一旦成环，所有查找永不终止。环检测是把「查找必终止」这一不变量从源头锁死。`__proto__` setter、`Reflect.setPrototypeOf` 全部走同一个 `[[SetPrototypeOf]]` 槽，行为一致。

### 4. instanceof 的完整算法：链查找 + 可接管

`x instanceof C` 的规范流程（练习 07 第四节）：

1. 若 `C[Symbol.hasInstance]` 可调用 → **整个语义交给它**（返回什么就是什么）；
2. 否则 C 必须可调用，走 **OrdinaryHasInstance**：沿 `x` 的 `[[Prototype]]` 链逐级比对是否 `=== C.prototype`，到 null 还没命中返回 false。

```js live noInline
class Lens {
  static [Symbol.hasInstance](inst) {
    return inst != null && typeof inst.focus === "function";
  }
}
{ focus() {} } instanceof Lens   // true —— 链无关，结构定夺
class NoInst {}
Object.defineProperty(NoInst, Symbol.hasInstance, { value: () => false });
new NoInst() instanceof NoInst   // false —— 连自己的实例都能拒绝
```

顺手收获一条 OrdinarySet 的深化规则（写 4e 时实测撞见）：`Symbol.hasInstance` 在 `Function.prototype` 上是**不可写** data 属性（CreateMethodProperty 语义），`NoInst[Symbol.hasInstance] = fn` 这种普通赋值**直接 TypeError**——笔记 03 说「写沿链找到 data 属性时在 Receiver 上遮蔽」，前提是**找到的属性可写**；找到只读 data 属性时 OrdinarySetWithOwnDescriptor 直接失败，连遮蔽都不让建。想覆盖只能 `Object.defineProperty`（它 configurable: true）或 class 体里显式声明。

### 5. 键的枚举秩序：三段顺序 + 四个 API 的分工

`OrdinaryOwnPropertyKeys` 规定自有键的枚举顺序（练习 07 第五节实测）：

```
① integer-like 键（0 … 2³²−2 的整数字符串）：按数值升序
② 其余字符串键：按创建顺序
③ symbol 键：按创建顺序
```

```js live noInline
const o = { b: 1, a: 1, 2: 1, [Symbol("s")]: 1, 1: 1 };
Reflect.ownKeys(o)        // ['1','2','b','a', Symbol(s)] —— 三段全含
Object.keys(o)            // ['1','2','b','a']            —— 仅可枚举字符串键
Object.getOwnPropertyNames(o) // ['1','2','b','a']        —— 全部字符串键（含不可枚举），不含 symbol
```

整数键为什么排最前且按数值序：V8 把它们存在独立的 elements 后备存储（回扣笔记 07 的 elements kind）——「顺序」不是附加的排序步骤，而是「两种存储 + 属性表」各自的自然顺序拼接（规范为了跨引擎一致性把这条定为语义）。

**for-in 的另两套规则**（与 Object.keys 的两个本质差异）：

- **沿链收集**：ES5 手挂的可枚举原型方法会混进 for-in（class 方法不可枚举所以不混——这就是「class 是糖但不纯」的一条实用后果）；
- **屏蔽规则**：原型属性被实例**同名自有属性**（不论自有是否可枚举）遮蔽后，for-in 不再收集原型那份。实测：原型有可枚举 `hidden`，实例有不可枚举自有 `hidden` → for-in 一个也不出。

| API | 自有/沿链 | 可枚举过滤 | symbol |
| --- | --- | --- | --- |
| `Object.keys` | 自有 | ✅ 仅可枚举 | ❌ |
| `Object.getOwnPropertyNames` | 自有 | ❌ | ❌ |
| `Object.getOwnPropertySymbols` | 自有 | — | ✅ 仅 symbol |
| `Reflect.ownKeys` | 自有 | ❌ | ✅ |
| `for-in` | **沿链** | ✅ | ❌ |

### 6. 原型污染攻防：accessor 身份决定的攻击面

笔记 03 说清了 `__proto__` 是 Object.prototype 上的**访问器属性**——这既是历史包袱，也是污染攻击的结构性根源（练习 07 第六节完整复现）：

```js live noInline
// 第一步：JSON.parse 用 CreateDataProperty 建属性 → 绕过 accessor
Object.keys(JSON.parse('{"__proto__": 1}'))   // ['__proto__'] —— 自有数据属性，原型没变！

// 第二步：naive merge 用普通赋值 → 走 accessor
function naiveMerge(target, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object") {
      if (!target[k]) target[k] = {};
      naiveMerge(target[k], src[k]);   // k="__proto__" 时 target[k] 读到 Object.prototype
    } else target[k] = src[k];
  }
}
naiveMerge({}, JSON.parse('{"__proto__": {"polluted": true}}'));
({}).polluted                          // true —— Object.prototype 被写入，全应用可见
```

攻击链的关键一步：`target["__proto__"]` 的**读**走 getter（返回 Object.prototype，truthy，不触发替换），于是递归的 merge 把污染写到 `Object.prototype` 上。所有对象（包括后续 `JSON.parse` 的产物）从此都带 `polluted`——经典后果是把 `{"role":"user"}` 混进 `isAdmin` 判断。

三层防御（按代价递增）：

1. **冻结原型**：`Object.freeze(Object.prototype)`——严格模式（ESM 恒为严格）下污染赋值抛 TypeError，实测拦下；
2. **merge 过滤**：显式拒绝 `__proto__` / `constructor` / `prototype` 键（业界库的通行做法，如 lodash `_.merge` 的防 patch）；
3. **容器替换**：用户输入一律用 `Map` 或 `Object.create(null)` 承接——没有 Object.prototype，就没有这条链上的洞。

---

## 可运行示例

配套练习：`exercises/this-and-prototype/07-prototype-chain-supplement.mjs`（`npx tsx` 直接运行，六节 22 项输出全注释；刻意 `.mjs`——TS 的静态函数类型里箭头函数没有 prototype 成员，观察运行时槽位需绕开 TS2339）。

最小感受版（node REPL 直接粘贴）：

```js live noInline
Object.getPrototypeOf(() => {}) === Function.prototype   // true —— 箭头也在函数族
(() => {}).prototype                                     // undefined —— 实例模板槽不存在
Object.create(null).__proto__                            // undefined —— 连访问器都查不到（回扣笔记 03）
const o = { y: 1, 10: 1, x: 1, 2: 1 };
Object.keys(o)                                           // ['2','10','y','x'] —— integer-like 先按数值序
JSON.parse('{"__proto__":1}') instanceof Object          // true 且 keys 含 '__proto__' —— CreateDataProperty 绕过 accessor
```

---

## 易错点与面试高频

1. **「函数的 prototype 就是它的爹」——混淆两个方向**：爹是 `[[Prototype]]`（getPrototypeOf 查）；`.prototype` 属性是孩子模板。`fn.prototype.constructor === fn` 只是模板上的回指属性。
2. **「.prototype 存在 = 可以 new」——generator 反例**：有槽但不可 new。「可 new」看 `[[Construct]]`，「有槽」看 MakeConstructor——两套独立机制，普通函数恰好同时满足才造成错觉。
3. **「instanceof 只看原型链」——漏了接管通道**：`Symbol.hasInstance` 存在时语义完全自定义（`[] instanceof Not` 可以被改成 true）。`Array.isArray` 与 `x instanceof Array` 在跨 realm 时的差异也是这条的一角（isArray 查内部槽，instanceof 查链）。
4. **「Object.keys 和 for-in 差不多」——两个维度都不同**：for-in 沿链收集 + 有屏蔽规则；keys 只看自有。ES5 手挂原型方法的类，两者结果不同。
5. **「整数键序是引擎行为」——是规范语义**（OrdinaryOwnPropertyKeys 三段顺序），V8 的 elements 存储只是让它「免费」成立。
6. **「JSON.parse('\{"__proto__":...\}') 会改原型」——不会**：CreateDataProperty 建自有属性。危险的是后续 merge 的**普通赋值**——污染发生在赋值语义（accessor）而非解析语义。
7. **给继承的只读属性赋值**：普通赋值 TypeError（Symbol.hasInstance 实测）；「写不穿原型」的完整规则是——沿链找到可写 data → Receiver 上遮蔽；找到**只读** data → 失败；找到 accessor → 调 setter。
8. **面试高频问法**：「画出 function/class/箭头函数的原型链」「为什么 new boundFn 的 instanceof 是原函数」「instanceof 和 Array.isArray 的区别」「for-in 遍历顺序的规范依据」「原型污染是什么、怎么防」。答题骨架：谱系图 → 槽位规则（模板 vs 爹）→ 链查找 + 接管 → 键序三段 → accessor 是攻击面的根源。

---

## 输出预测题

### 题 1（谱系与槽位）

```js live noInline
console.log(Object.getPrototypeOf(() => {}) === Function.prototype);
console.log((() => {}).prototype);
console.log((function () {}).bind().prototype);
class Q {}
console.log(Object.getPrototypeOf(new Q()) === Q.prototype,
            Object.getPrototypeOf(Q) === Function.prototype);
```

逐行说输出与依据。

### 题 2（键序与屏蔽）

```js live noInline
const o = { y: 1, 10: 1, x: 1, 2: 1 };
console.log(Object.keys(o));

const base = { e: "proto" };
const inst = Object.create(base);
Object.defineProperty(inst, "e", { value: "own", enumerable: false });
const seen = [];
for (const k in inst) seen.push(k);
console.log(seen, inst.e);
```

### 题 3（污染链推理）

```js live noInline
const obj = JSON.parse('{"__proto__": {"deep": {"v": 1}}}');
console.log(Object.keys(obj)[0]);

function merge(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === "object") {
      if (!t[k]) t[k] = {};
      merge(t[k], s[k]);
    } else t[k] = s[k];
  }
}
merge({}, obj);
console.log(({}).deep?.v);
```

① 两次输出各是什么？② 第 5 行 `if (!t[k])` 在 k 为 `"__proto__"` 时读到了什么？为什么没触发原型替换？③ 说出除 freeze 外的两种防御。

（答案见文末）

---

## 延伸阅读

- ECMA-262——`OrdinarySetPrototypeOf`（环检测）、`BoundFunctionCreate`、`OrdinaryHasInstance` / `Function.prototype[@@hasInstance]`、`OrdinaryOwnPropertyKeys`、`EnumerateObjectProperties`（for-in 屏蔽）、`JSON.parse`（CreateDataProperty）、`OrdinarySetWithOwnDescriptor`（只读 data 属性的写入失败）
- MDN：Inheritance and the prototype chain（谱系速查）、Property enumeration and ordering
- OWASP：Prototype Pollution Attack（攻击面分类与防御清单）
- 回扣笔记 03（this/查找/receiver/class）、07（elements 存储 → 整数键序的实现侧）、27（语法层二义的归因方法）、28（派发的实现视角）

---

## 预测题答案

### 题 1

- `true`：箭头函数的 `[[Prototype]]` 就是 Function.prototype（OrdinaryFunctionCreate 默认）——「函数族」由链定义，与函数种类无关。
- `undefined`：箭头无 MakeConstructor，实例模板槽不存在。
- `undefined`：bound 函数不产自己的实例（构造转发给 target），没有模板槽；但它**有原型**（取 target 的），两件事互不矛盾。
- `true, true`：实例链第一环 `new Q()` 的原型是 `Q.prototype`（OrdinaryCreateFromConstructor）；类自身是函数，静态链第一环是 Function.prototype。

### 题 2

- `['2','10','y','x']`：integer-like 键 `10`、`2` 按数值升序排最前，字符串键 `y`、`x` 按创建序随后（OrdinaryOwnPropertyKeys 三段规则）。
- `[], "own"`：for-in 的屏蔽规则——原型的可枚举 `e` 被实例自有（**不可枚举**）`e` 遮蔽后不再收集，seen 为空；但 `inst.e` 读取正常返回 `"own"`（自有命中）。屏蔽的判断只看「是否有同名自有属性」，与该属性是否可枚举无关。

### 题 3

- ① `["__proto__"]`；`1`。
- ② 读到 `Object.prototype`（accessor getter 的返回值）：truthy → `if (!t[k])` 不成立 → **不**执行 `t[k] = {}`（替换原型的那步被跳过）→ 递归 merge 的 target 就是 Object.prototype 本身 → `deep` 被写进 Object.prototype → 全局所有对象都能读到 `.deep.v === 1`。注意与 JSON.parse 的对照：那里 CreateDataProperty 绕过 accessor 建了自有属性，这里普通**读**走 getter 返回原型——同一个字符串键，两种建属性语义，行为相反。
- ③ 任意两个：merge 前过滤 `__proto__`/`constructor`/`prototype` 键；用 `Map` 或 `Object.create(null)` 承接用户输入（没有 Object.prototype 就没有这条洞）；深层防御如 `structuredClone` 代替手写 merge、公共依赖锁版本（历史上 lodash/jquery 都出过 CVE）。

# 29 · 原型链补充：谱系、槽位规则、instanceof、键序与污染攻防

> 对应大纲：阶段 1.3 的深化补充（**基础语义在笔记 03**——OrdinaryGet/OrdinarySet、receiver、prototype/`__proto__`/constructor 三角、class 不是纯糖，本文不重复）；回扣笔记 30（原型派发的实现视角）、笔记 27（`{}` 位置二义的语法层视角）。
> 一手依据：ECMA-262——`OrdinaryGetPrototypeOf`/`OrdinarySetPrototypeOf`（环检测）、`BoundFunctionCreate`、`OrdinaryHasInstance` 与 `Function.prototype[@@hasInstance]`、`OrdinaryOwnPropertyKeys`（键序三段规则）、`EnumerateObjectProperties`（for-in 的屏蔽规则）、`JSON.parse` 的 CreateDataProperty、`OrdinarySetWithOwnDescriptor`（继承只读 data 属性的写入失败）、`MakeConstructor`（.prototype 槽的创建条件）。

## 学习目标

- 能徒手画出任何值（数组、函数、箭头函数、类、bound 函数、Math、null-proto 对象）的完整原型链。
- 能说清 `.prototype` **槽**的存在规则，并纠正「有 prototype 属性 = 能 new」的近似说法（generator 反例）。
- 能解释 `instanceof` 的完整算法与 `Symbol.hasInstance` 的接管机制。
- 能背出 `OrdinaryOwnPropertyKeys` 的三段键序，并区分 `Object.keys` / `getOwnPropertyNames` / `Reflect.ownKeys` / `for-in` 四个 API 的差异。
- 能复现一个 prototype pollution 攻击链并给出三层防御。

---

## 关键概念

### 1. 谱系全景：每条链的终点都是 null

用 `Object.getPrototypeOf` 一路走到 null（练习 07 第一节实测），全景如下：

```
[]                     → Array.prototype → Object.prototype → null
"str"(原始值)           → (临时装箱 String.prototype) → Object.prototype → null
function(){}           → Function.prototype(本身是函数!) → Object.prototype → null
() => {}               → Function.prototype → Object.prototype → null   ← 箭头也在函数族
class C {}             → Function.prototype → Object.prototype → null   ← 类是函数
new C()                → C.prototype → Object.prototype → null
C.prototype            → Object.prototype → null                        ← 模板对象本身没有特殊爹
f.bind()               → Function.prototype → Object.prototype → null   ← bound 的原型取自 target（BoundFunctionCreate）
Math                   → Object.prototype → null                        ← 单例对象，不是函数
Object.create(null)    → null                                           ← 一级都不查的字典
```

三个容易含糊的点：

1. **`Function.prototype` 自己是个函数**（`typeof === "function"`，调用返回 undefined）——它是「函数一族」的链上最后一个函数；「所有函数都是 Function 的实例」在链上成立（fn → Function.prototype），但 `fn.constructor === Function` 只是这条链末端 constructor 属性的巧合读法，不是「Function 造了 fn」的运行时事实。
2. **bound 函数的原型 = target 的原型**：`BoundFunctionCreate` 明确规定 bound 的 `[[Prototype]]` 取 `target.[[GetPrototypeOf]]()`。所以 bound 的谱系与原函数一致（练习 1g），但 bound **没有自己的 `.prototype` 槽**（见下节）——这两件事合起来解释「new boundFn 的实例原型为什么来自原函数」。
3. **class 两条链**（笔记 03 §7.5 的完整化）：实例链 `new C() → C.prototype → Object.prototype → null`；静态链 `C → Function.prototype → Object.prototype → null`；`extends` 时静态链变成 `Child → Parent`（类 → 类），实例链变成 `Child.prototype → Parent.prototype`。静态方法继承、静态 super 都活在第二条链上。

### 2. `.prototype` 槽的存在规则：它是实例模板，不是「自己的爹」

记忆口诀先行：**函数自己的爹查 `Object.getPrototypeOf(fn)`（永远在）；`.prototype` 属性是「这个函数的孩子模板」——只有创建时走了 `MakeConstructor` 的函数才有这个槽**（练习 07 第二节实测）：

| 函数种类 | `.prototype` 槽 | 可 `new`？ | 说明 |
| --- | --- | --- | --- |
| `function fn(){}` | ✅ 对象，`.constructor` 回指 | ✅ | 标准 MakeConstructor |
| `() => {}` | ❌ undefined | ❌ | 无 `[[Construct]]` |
| `async function` | ❌ undefined | ❌ | |
| 类方法 / 对象方法简写 | ❌ undefined | ❌ | DefineMethod 不走 MakeConstructor |
| bound 函数 | ❌ undefined | ✅（转发给 target） | 实例由 target + new.target 产出 |
| `function* gen(){}` | ✅ 对象 | **❌** | **唯一反例**：槽是「generator 对象的原型模板」，`new gen()` 抛 TypeError |

generator 的反例价值在于把概念拆干净：`.prototype` 槽的本职是「**实例模板**」——大多数情况下这个实例由 new 产生，generator 情况下由调用产生（`gen()` 产出的 generator 对象原型是 `gen.prototype`）。「有槽」与「可 new」不是一回事，「可 new」要求的是 `[[Construct]]` 内部方法。

TS 视角的佐证：TypeScript 的函数类型视图里，箭头函数类型根本没有 `prototype` 成员（访问即 TS2339）——类型的静态视图已经把「这个函数不是构造器」编码了；运行时用 undefined 的槽位说出同一件事。练习刻意用 `.mjs` 就是为了观察后者。

### 3. `[[SetPrototypeOf]]` 的环检测：引擎拒绝闭环

`Object.setPrototypeOf(p, q)` 的规范流程：先沿 q 的原型链检查 p 是否已在其中（防环），在则返回 false → setPrototypeOf 抛 **TypeError**（不是静默失败）：

```js live noInline
const p = {};
const q = Object.create(p);        // p 已在 q 的链上
Object.setPrototypeOf(p, q);       // TypeError：会造成 p↔q 互为祖先，属性查找将死循环
```

为什么要硬拦：OrdinaryGet 是「沿链逐级查找直到 null」——链一旦成环，所有查找永不终止。环检测是把「查找必终止」这一不变量从源头锁死。`__proto__` setter、`Reflect.setPrototypeOf` 全部走同一个 `[[SetPrototypeOf]]` 槽，行为一致。

### 4. instanceof 的完整算法：链查找 + 可接管

`x instanceof C` 的规范流程（练习 07 第四节）：

1. 若 `C[Symbol.hasInstance]` 可调用 → **整个语义交给它**（返回什么就是什么）；
2. 否则 C 必须可调用，走 **OrdinaryHasInstance**：沿 `x` 的 `[[Prototype]]` 链逐级比对是否 `=== C.prototype`，到 null 还没命中返回 false。

```js live noInline
class Lens {
  static [Symbol.hasInstance](inst) {
    return inst != null && typeof inst.focus === "function";
  }
}
{ focus() {} } instanceof Lens   // true —— 链无关，结构定夺
class NoInst {}
Object.defineProperty(NoInst, Symbol.hasInstance, { value: () => false });
new NoInst() instanceof NoInst   // false —— 连自己的实例都能拒绝
```

顺手收获一条 OrdinarySet 的深化规则（写 4e 时实测撞见）：`Symbol.hasInstance` 在 `Function.prototype` 上是**不可写** data 属性（CreateMethodProperty 语义），`NoInst[Symbol.hasInstance] = fn` 这种普通赋值**直接 TypeError**——笔记 03 说「写沿链找到 data 属性时在 Receiver 上遮蔽」，前提是**找到的属性可写**；找到只读 data 属性时 OrdinarySetWithOwnDescriptor 直接失败，连遮蔽都不让建。想覆盖只能 `Object.defineProperty`（它 configurable: true）或 class 体里显式声明。

### 5. 键的枚举秩序：三段顺序 + 四个 API 的分工

`OrdinaryOwnPropertyKeys` 规定自有键的枚举顺序（练习 07 第五节实测）：

```
① integer-like 键（0 … 2³²−2 的整数字符串）：按数值升序
② 其余字符串键：按创建顺序
③ symbol 键：按创建顺序
```

```js live noInline
const o = { b: 1, a: 1, 2: 1, [Symbol("s")]: 1, 1: 1 };
Reflect.ownKeys(o)        // ['1','2','b','a', Symbol(s)] —— 三段全含
Object.keys(o)            // ['1','2','b','a']            —— 仅可枚举字符串键
Object.getOwnPropertyNames(o) // ['1','2','b','a']        —— 全部字符串键（含不可枚举），不含 symbol
```

整数键为什么排最前且按数值序：V8 把它们存在独立的 elements 后备存储（回扣笔记 07 的 elements kind）——「顺序」不是附加的排序步骤，而是「两种存储 + 属性表」各自的自然顺序拼接（规范为了跨引擎一致性把这条定为语义）。

**for-in 的另两套规则**（与 Object.keys 的两个本质差异）：

- **沿链收集**：ES5 手挂的可枚举原型方法会混进 for-in（class 方法不可枚举所以不混——这就是「class 是糖但不纯」的一条实用后果）；
- **屏蔽规则**：原型属性被实例**同名自有属性**（不论自有是否可枚举）遮蔽后，for-in 不再收集原型那份。实测：原型有可枚举 `hidden`，实例有不可枚举自有 `hidden` → for-in 一个也不出。

| API | 自有/沿链 | 可枚举过滤 | symbol |
| --- | --- | --- | --- |
| `Object.keys` | 自有 | ✅ 仅可枚举 | ❌ |
| `Object.getOwnPropertyNames` | 自有 | ❌ | ❌ |
| `Object.getOwnPropertySymbols` | 自有 | — | ✅ 仅 symbol |
| `Reflect.ownKeys` | 自有 | ❌ | ✅ |
| `for-in` | **沿链** | ✅ | ❌ |

### 6. 原型污染攻防：accessor 身份决定的攻击面

笔记 03 说清了 `__proto__` 是 Object.prototype 上的**访问器属性**——这既是历史包袱，也是污染攻击的结构性根源（练习 07 第六节完整复现）：

```js live noInline
// 第一步：JSON.parse 用 CreateDataProperty 建属性 → 绕过 accessor
Object.keys(JSON.parse('{"__proto__": 1}'))   // ['__proto__'] —— 自有数据属性，原型没变！

// 第二步：naive merge 用普通赋值 → 走 accessor
function naiveMerge(target, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object") {
      if (!target[k]) target[k] = {};
      naiveMerge(target[k], src[k]);   // k="__proto__" 时 target[k] 读到 Object.prototype
    } else target[k] = src[k];
  }
}
naiveMerge({}, JSON.parse('{"__proto__": {"polluted": true}}'));
({}).polluted                          // true —— Object.prototype 被写入，全应用可见
```

攻击链的关键一步：`target["__proto__"]` 的**读**走 getter（返回 Object.prototype，truthy，不触发替换），于是递归的 merge 把污染写到 `Object.prototype` 上。所有对象（包括后续 `JSON.parse` 的产物）从此都带 `polluted`——经典后果是把 `{"role":"user"}` 混进 `isAdmin` 判断。

三层防御（按代价递增）：

1. **冻结原型**：`Object.freeze(Object.prototype)`——严格模式（ESM 恒为严格）下污染赋值抛 TypeError，实测拦下；
2. **merge 过滤**：显式拒绝 `__proto__` / `constructor` / `prototype` 键（业界库的通行做法，如 lodash `_.merge` 的防 patch）；
3. **容器替换**：用户输入一律用 `Map` 或 `Object.create(null)` 承接——没有 Object.prototype，就没有这条链上的洞。

---

## 可运行示例

配套练习：`exercises/this-and-prototype/07-prototype-chain-supplement.mjs`（`npx tsx` 直接运行，六节 22 项输出全注释；刻意 `.mjs`——TS 的静态函数类型里箭头函数没有 prototype 成员，观察运行时槽位需绕开 TS2339）。

最小感受版（node REPL 直接粘贴）：

```js live noInline
Object.getPrototypeOf(() => {}) === Function.prototype   // true —— 箭头也在函数族
(() => {}).prototype                                     // undefined —— 实例模板槽不存在
Object.create(null).__proto__                            // undefined —— 连访问器都查不到（回扣笔记 03）
const o = { y: 1, 10: 1, x: 1, 2: 1 };
Object.keys(o)                                           // ['2','10','y','x'] —— integer-like 先按数值序
JSON.parse('{"__proto__":1}') instanceof Object          // true 且 keys 含 '__proto__' —— CreateDataProperty 绕过 accessor
```

---

## 易错点与面试高频

1. **「函数的 prototype 就是它的爹」——混淆两个方向**：爹是 `[[Prototype]]`（getPrototypeOf 查）；`.prototype` 属性是孩子模板。`fn.prototype.constructor === fn` 只是模板上的回指属性。
2. **「.prototype 存在 = 可以 new」——generator 反例**：有槽但不可 new。「可 new」看 `[[Construct]]`，「有槽」看 MakeConstructor——两套独立机制，普通函数恰好同时满足才造成错觉。
3. **「instanceof 只看原型链」——漏了接管通道**：`Symbol.hasInstance` 存在时语义完全自定义（`[] instanceof Not` 可以被改成 true）。`Array.isArray` 与 `x instanceof Array` 在跨 realm 时的差异也是这条的一角（isArray 查内部槽，instanceof 查链）。
4. **「Object.keys 和 for-in 差不多」——两个维度都不同**：for-in 沿链收集 + 有屏蔽规则；keys 只看自有。ES5 手挂原型方法的类，两者结果不同。
5. **「整数键序是引擎行为」——是规范语义**（OrdinaryOwnPropertyKeys 三段顺序），V8 的 elements 存储只是让它「免费」成立。
6. **「JSON.parse('\{"__proto__":...\}') 会改原型」——不会**：CreateDataProperty 建自有属性。危险的是后续 merge 的**普通赋值**——污染发生在赋值语义（accessor）而非解析语义。
7. **给继承的只读属性赋值**：普通赋值 TypeError（Symbol.hasInstance 实测）；「写不穿原型」的完整规则是——沿链找到可写 data → Receiver 上遮蔽；找到**只读** data → 失败；找到 accessor → 调 setter。
8. **面试高频问法**：「画出 function/class/箭头函数的原型链」「为什么 new boundFn 的 instanceof 是原函数」「instanceof 和 Array.isArray 的区别」「for-in 遍历顺序的规范依据」「原型污染是什么、怎么防」。答题骨架：谱系图 → 槽位规则（模板 vs 爹）→ 链查找 + 接管 → 键序三段 → accessor 是攻击面的根源。

---

## 输出预测题

### 题 1（谱系与槽位）

```js live noInline
console.log(Object.getPrototypeOf(() => {}) === Function.prototype);
console.log((() => {}).prototype);
console.log((function () {}).bind().prototype);
class Q {}
console.log(Object.getPrototypeOf(new Q()) === Q.prototype,
            Object.getPrototypeOf(Q) === Function.prototype);
```

逐行说输出与依据。

### 题 2（键序与屏蔽）

```js live noInline
const o = { y: 1, 10: 1, x: 1, 2: 1 };
console.log(Object.keys(o));

const base = { e: "proto" };
const inst = Object.create(base);
Object.defineProperty(inst, "e", { value: "own", enumerable: false });
const seen = [];
for (const k in inst) seen.push(k);
console.log(seen, inst.e);
```

### 题 3（污染链推理）

```js live noInline
const obj = JSON.parse('{"__proto__": {"deep": {"v": 1}}}');
console.log(Object.keys(obj)[0]);

function merge(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === "object") {
      if (!t[k]) t[k] = {};
      merge(t[k], s[k]);
    } else t[k] = s[k];
  }
}
merge({}, obj);
console.log(({}).deep?.v);
```

① 两次输出各是什么？② 第 5 行 `if (!t[k])` 在 k 为 `"__proto__"` 时读到了什么？为什么没触发原型替换？③ 说出除 freeze 外的两种防御。

（答案见文末）

---

## 延伸阅读

- ECMA-262——`OrdinarySetPrototypeOf`（环检测）、`BoundFunctionCreate`、`OrdinaryHasInstance` / `Function.prototype[@@hasInstance]`、`OrdinaryOwnPropertyKeys`、`EnumerateObjectProperties`（for-in 屏蔽）、`JSON.parse`（CreateDataProperty）、`OrdinarySetWithOwnDescriptor`（只读 data 属性的写入失败）
- MDN：Inheritance and the prototype chain（谱系速查）、Property enumeration and ordering
- OWASP：Prototype Pollution Attack（攻击面分类与防御清单）
- 回扣笔记 03（this/查找/receiver/class）、07（elements 存储 → 整数键序的实现侧）、27（语法层二义的归因方法）、28（派发的实现视角）

---

## 预测题答案

### 题 1

- `true`：箭头函数的 `[[Prototype]]` 就是 Function.prototype（OrdinaryFunctionCreate 默认）——「函数族」由链定义，与函数种类无关。
- `undefined`：箭头无 MakeConstructor，实例模板槽不存在。
- `undefined`：bound 函数不产自己的实例（构造转发给 target），没有模板槽；但它**有原型**（取 target 的），两件事互不矛盾。
- `true, true`：实例链第一环 `new Q()` 的原型是 `Q.prototype`（OrdinaryCreateFromConstructor）；类自身是函数，静态链第一环是 Function.prototype。

### 题 2

- `['2','10','y','x']`：integer-like 键 `10`、`2` 按数值升序排最前，字符串键 `y`、`x` 按创建序随后（OrdinaryOwnPropertyKeys 三段规则）。
- `[], "own"`：for-in 的屏蔽规则——原型的可枚举 `e` 被实例自有（**不可枚举**）`e` 遮蔽后不再收集，seen 为空；但 `inst.e` 读取正常返回 `"own"`（自有命中）。屏蔽的判断只看「是否有同名自有属性」，与该属性是否可枚举无关。

### 题 3

- ① `["__proto__"]`；`1`。
- ② 读到 `Object.prototype`（accessor getter 的返回值）：truthy → `if (!t[k])` 不成立 → **不**执行 `t[k] = {}`（替换原型的那步被跳过）→ 递归 merge 的 target 就是 Object.prototype 本身 → `deep` 被写进 Object.prototype → 全局所有对象都能读到 `.deep.v === 1`。注意与 JSON.parse 的对照：那里 CreateDataProperty 绕过 accessor 建了自有属性，这里普通**读**走 getter 返回原型——同一个字符串键，两种建属性语义，行为相反。
- ③ 任意两个：merge 前过滤 `__proto__`/`constructor`/`prototype` 键；用 `Map` 或 `Object.create(null)` 承接用户输入（没有 Object.prototype 就没有这条洞）；深层防御如 `structuredClone` 代替手写 merge、公共依赖锁版本（历史上 lodash/jquery 都出过 CVE）。

