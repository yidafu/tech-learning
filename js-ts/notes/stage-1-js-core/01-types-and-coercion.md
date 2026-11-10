---
mdx:
  format: mdx
---
# 01 类型系统与类型转换：原始值、装箱与四套相等语义

**对应大纲**：阶段 1.1 类型系统与类型转换（`typeof`/`instanceof` 的坑、显式/隐式转换、`ToPrimitive`、`==` vs `===` vs `Object.is`、`Symbol`）

**学习目标**：

1. 能不看资料画出「属性访问 → ToObject 临时包装 → 丢弃」的完整时序，并解释 `x.y = 1` 后读回 `undefined` 的每一步
2. 能背出 `typeof` 全表并讲清 `typeof null === "object"` 的历史成因与规范现状
3. 能手写 `IsLooselyEqual`（`==`）的伪代码，并逐步推演 `[] == ![]`、`[null] == 0` 这类题
4. 能说清 `===` / `SameValue` / `SameValueZero` 三套语义在 ±0 与 NaN 两个分叉点上的差异及各自的使用场景
5. 能列出常用 well-known symbols 各自被哪个内部算法查询，并用 `Symbol.toPrimitive` / `Symbol.hasInstance` 写出可运行的自定义协议实现

> 引用说明：本文规范编号取自 tc39.es 现行版 ECMA-262（编号会随年度快照微调，例如 ES2018 中 SameValue 是 §7.2.10、ToNumber 是 §7.1.3）。查证时以**操作名**为主键，编号为辅。配套练习见 `exercises/types-and-coercion/`（共 4 个文件，全部可直接 `npx tsx` 运行）。

---

## 关键概念

### 1. 七种原始类型与「存储模型」的正解

ECMAScript 语言类型共 8 种：**7 种原始类型 + Object**（依据：ECMA-262 §6.1 ECMAScript Language Types）。

- 原始类型：`Undefined`、`Null`、`Boolean`、`Number`、`String`、`Symbol`、`BigInt`
- 引用类型：`Object`（数组、函数、日期、Map/Set……都是 Object 的不同形态；函数是「实现了 `[[Call]]` 内部方法的对象」）

语言规范层面真正承诺的只有两条语义，而不是「栈 vs 堆」：

1. **原始值不可变（immutable）**：`"abc"[0] = "x"` 不会改变字符串，也没有任何 API 能原地修改一个原始值；所谓「修改」都是产生新值
2. **值语义 vs 引用语义**：原始值的赋值/传参/比较都是**值的拷贝**；对象持有的是**引用（身份，identity）**——`{ v: 1 } === { v: 1 }` 是 `false`，因为比较的是身份而非内容

「原始值存栈、对象存堆」是引擎（如 V8）的实现细节：V8 里小整数（Smi）直接编码在指针位里、HeapNumber 与字符串分配在堆上，字符串还有 ConsString/SlicedString 等多种形态。**面试时先讲规范语义，再补引擎实现，顺序别反。**

### 2. 包装对象（boxing）：何时发生、生命周期多长

**结论**：boxing 不是「原始值变成对象」，而是**属性访问求值时的一次临时 `ToObject` 包装**（依据：ECMA-262 §7.1.20 ToObject；§13.3.2 Property Accessors 的运行时语义——「base 值为原始值时先 `ToObject` 再继续属性查找」）。

完整时序（以 `"hello".length` 为例）：

1. 求值属性访问：base 是原始字符串 → `ToObject("hello")` 创建一个**临时 String 包装对象**（带 `[[StringData]]` 内部槽，其原型指向 `String.prototype`）
2. 在临时对象上查 `length`（包装对象自带不可写的 `length`）
3. 表达式结束，临时对象立刻失去引用、可被回收——**它只活在这一个表达式里**

由这个模型能直接推出三条经典现象：

- **临时对象不留痕**：`(s as any).x = 1` 把属性写在了临时对象上，语句结束对象即销毁。严格模式（ESM 默认）下写入会直接抛 `TypeError`（"Cannot create property..."）；非严格模式静默失败。两种模式下事后读 `s.x` 都是 `undefined`
- **null/undefined 没有 ToObject**：§7.1.20 的表格里 `undefined`/`null` 对应「抛 TypeError」，所以 `null.x` 报 "Cannot read properties of null"——报错发生在 ToObject 阶段，不是属性查找阶段
- **给 `String.prototype` 加方法对所有字面量生效**：因为属性查找总是走到 `String.prototype`（见练习 01 第 5 组）

对照记忆：

- `String("a")`（无 `new`）= 显式转换函数，返回**原始值**，`typeof` 为 `"string"`
- `new String("a")` = 构造包装**对象**，`typeof` 为 `"object"`；`new Boolean(false)` 虽包着 `false`，但对象永远 truthy（依据：§7.1.2 ToBoolean 表格的 Object 行恒为 true）——所以永远别用 `new Number/String/Boolean`

### 3. typeof 全表与 `typeof null === "object"` 的历史包袱

`typeof` 的返回值只有 10 行语义（依据：ECMA-262 §13.5.3 The typeof Operator 的表格）：

| 值 | 返回 |
| --- | --- |
| `undefined` | `"undefined"` |
| `null` | `"object"`（历史 bug，见下） |
| 布尔值 | `"boolean"` |
| 数字（含 `NaN`、`Infinity`） | `"number"` |
| 字符串 | `"string"` |
| Symbol | `"symbol"` |
| BigInt | `"bigint"` |
| 实现 `[[Call]]` 的对象（函数、类、生成器函数） | `"function"` |
| 其它一切对象（`{}`、`[]`、`new Number(1)`、正则、日期…） | `"object"` |
| **未声明**的标识符 | `"undefined"`，且**不抛 ReferenceError** |
| `document.all` | `"undefined"`（规范唯一「故意违规」：对象实现 `[[IsHTMLDDA]]` 时按 undefined 处理，为兼容老 IE 检测代码） |

两个容易被追问的点：

- **`typeof null === "object"` 的成因**：第一版 JavaScript（1995，Brendan Eich）用「低位 3-bit 类型标签 + 值」表示 JS 值，对象的 tag 是 `000`；而 `null` 用全零的机器 NULL 指针表示，低位标签恰好也是 `000`，查表就成了 "object"。ES6 草案期曾有改为 `"null"` 的提案，因旧代码兼容性被否决，规范表格至今保留此行为（依据：ECMA-262 §13.5.3；MDN typeof 词条引述的历史成因）
- **未声明变量不报错是刻意设计**：`typeof x === "undefined"` 是安全的「存在性检测」惯用法（规范对 IsUnresolvableReference 的引用直接返回 `"undefined"`）。但注意 TDZ：`let`/`const` 声明前访问仍抛 `ReferenceError`，`typeof` 救不了

### 4. instanceof：OrdinaryHasInstance 沿 `[[Prototype]]` 链

`x instanceof C` 的求值（依据：ECMA-262 §13.10.2 InstanceofOperator）：

1. 先 `GetMethod(C, Symbol.hasInstance)`——**若右侧定义了 `@@hasInstance` 就直接调用它**，不再走默认逻辑
2. 否则走 `OrdinaryHasInstance(C, x)`（§7.3.21）：
   a. `C` 不是构造器（没有 `[[Construct]]`）→ 直接 `false`。所以 `Symbol() instanceof Symbol` 是 `false` 而不是报错——`Symbol` 是函数但不是构造器
   b. `x` 不是对象 → 直接 `false`。**instanceof 从不装箱**：`1 instanceof Number` 为 `false`，与包装对象无关（TS 编译期就会拦截这种写法）
   c. 取 `P = C.prototype`，然后沿 `x` 的 `[[Prototype]]` 链逐级向上，遇到 `P` 返回 `true`，走到链尾（`null`）返回 `false`

由此推出两个工程结论：

- **跨 realm 失效**：每个 realm（iframe、Node `vm` context）各有一套内置对象，`Array.prototype` 在两个 realm 里是**两个不同对象**。`iframeArray instanceof Array` 沿原型链找不到当前 realm 的 `Array.prototype` → `false`。所以判断数组用 `Array.isArray`：它走 `IsArray` 抽象操作（§7.2.2），检查的是「是否 Array exotic object」这个内部特征，与原型/realm 无关
- **`Symbol.hasInstance` 可覆盖 instanceof 语义**：`Function.prototype[Symbol.hasInstance]` 本身不可写不可配置，但可以在**自己的构造器**上定义静态 `static [Symbol.hasInstance](v) {...}` 遮蔽继承来的默认实现（见练习 04 第 10–11 组）

### 5. 显式转换 vs 隐式转换：触发点全景

显式（你主动调用转换函数）与隐式（运算符内部替你调）最终都落到同一组**抽象操作（abstract operations）**上。背触发点的正确方式是记住「哪个语法 → 哪个抽象操作」：

| 触发点 | 内部调用 | 对象参数的 hint |
| --- | --- | --- |
| `Number(x)` | ToNumber（§7.1.4） | `"number"` |
| `String(x)` | ToString（§7.1.19） | `"string"` |
| `Boolean(x)` / `!!x` / `if` / `while` / 三元 / `!x` | ToBoolean（§7.1.2） | 不经过 ToPrimitive |
| `+x`（一元加） | ToNumeric | `"number"` |
| `x + y`（二元加，§13.8.1） | 两侧 ToPrimitive 后：任一侧是字符串 → 拼接；否则数值加 | `"default"` |
| `x - y` / `*` / `/` / `%` | ToNumeric（对象先 ToPrimitive） | `"number"` |
| `x < y` / `<=` / `>` / `>=` | IsLessThan（两侧 ToPrimitive 后：双方都是字符串则按字符串序，否则转数字比） | `"number"` |
| `x == y` / `!=` | IsLooselyEqual（§7.2.13） | `"default"` |
| `` `${x}` `` / 数组 `join` | ToString（对象先 ToPrimitive） | `"string"` |
| `obj[key]` / `{ [key]: v }` | ToPropertyKey | —— |

- BigInt 特殊：`1n + 1` 直接 `TypeError`——**BigInt 与 Number 之间没有隐式转换**（这是 ES2015 之后刻意收紧的设计）
- ToBoolean 只有一条规则值得背：`false`、`0`、`-0`、`NaN`、`""`、`null`、`undefined` 为假，**其余全真（含 `[]`、`{}`、`"0"`、`"false"`、一切对象）**（依据：§7.1.2 表格）

### 6. ToPrimitive：hint 与三级 fallback

对象转原始值的唯一通道（依据：ECMA-262 §7.1.1 ToPrimitive）。完整算法：

```text
ToPrimitive(input, preferredType):
1. input 不是对象 → 原样返回（原始值无需转换）
2. 若 input 有 [Symbol.toPrimitive] 方法（可调用）：
     hint = preferredType 是 string → "string"；是 number → "number"；缺省 → "default"
     result = input[@@toPrimitive](hint)
     result 是原始值 → 返回 result；是对象 → TypeError（不再回落 valueOf/toString）
3. 此时 preferredType 缺省（"default"）→ 按 "number" 处理
   （唯一的内置例外在步骤 2 内部：Date.prototype[@@toPrimitive]（§21.4.4.45）
    把 "default" 改道为 "string" —— 所以 Date 是所有内置对象里唯一在 + 和 == 中走字符串路径的）
4. methodNames = hint === "string" ? [toString, valueOf] : [valueOf, toString]
5. 依次调用：哪个先返回原始值就用哪个；返回对象视为「没答」，跳下一个
6. 全部失败 → TypeError("Cannot convert object to primitive value")
```

三个必须形成的肌肉记忆：

- **hint 由运算符决定，不由对象决定**：同一个 `{ valueOf: () => 42 }`，`obj * 1` 得 `42`（number hint 走 valueOf），`` `${obj}` `` 得 `"[object Object]"`（string hint 走原型链兜底的 `Object.prototype.toString`）
- **default hint 的顺序与 number 相同**（valueOf 先），存在的意义是让对象在二元 `+` 中自证「我想当字符串还是数字」——Date 利用 `@@toPrimitive` 把 default 改道 string，于是 `new Date(0) + ""` 得到可读日期而非 `"0"`
- **`@@toPrimitive` 是协议钩子**：存在即短路，返回对象直接 `TypeError`（练习 03 用自定义 Wallet 类打印出了全部三种 hint）

### 7. ToNumber 规则要点与 null/undefined 的不对称

字符串转数字遵循 StringNumericLiteral 文法（依据：ECMA-262 §7.1.4 ToNumber 的字符串表格）：

| 输入 | 结果 | 说明 |
| --- | --- | --- |
| `""` | `0` | 空串是合法的「空白数字」 |
| `" "` | `0` | **前后空白允许**，纯空白同样归 0 |
| `"12px"` | `NaN` | 必须是**完整**的数字格式，尾部有垃圾就 NaN |
| `"0x1F"` | `31` | 支持十六进制/八进制/二进制前缀与 `Infinity`、指数记法 `"1e3"` → `1000` |
| `true` / `false` | `1` / `0` | |
| `null` | `0` | ← |
| `undefined` | `NaN` | ← **与 null 不对称** |
| `[]` | `0` | `ToPrimitive([] , number) → "" → 0` |
| `[5]` | `5` | → `"5"` → 5 |
| `[1,2]` / `{}` | `NaN` | → `"1,2"` / `"[object Object]"` → NaN |

`null → 0` 与 `undefined → NaN` 的不对称是历史设计：`null` 表示「有值，值为空」，参与算术时当作 0；`undefined` 表示「根本没赋值」，算术上应保持「无效」语义。**但这组规则在 `==` 里被短路保护**（见下一节），所以 `null == 0` 反而是 `false`——`ToNumber(null) === 0` 与 `null == 0 === false` 并不矛盾，因为 `==` 的算法根本走不到 ToNumber 那一步。

顺带一提经典坑：`isNaN("12px")` 是 `true`（全局 `isNaN` 先做 ToNumber），`Number.isNaN("12px")` 是 `false`（不做转换、只对 NaN 判定）。优先用后者。

### 8. `==` 的完整算法（IsLooselyEqual）与四道经典题

`==` 不是「两边都转成数字再比」（这是最常见的错误背诵）。逐步伪代码（依据：ECMA-262 §7.2.13 IsLooselyEqual）：

```text
IsLooselyEqual(x, y):
1. 空值对特判：x 是 null 且 y 是 undefined（或反之）→ true
2. 类型相同 → 直接退化为 IsStrictlyEqual(x, y)（不转换！NaN 在这里永远 false）
3. 此后任一侧是 null/undefined → false（短路，不做任何转换 —— 所以 null == 0 是 false）
4. Number vs String → 把 String 侧 ToNumber，回到第 2 步
5. 任一侧是 Boolean → 把 Boolean 侧 ToNumber，回到第 2 步
6. Object vs (Number | String | Symbol | BigInt) → 把 Object 侧 ToPrimitive(hint "number")，回到第 1 步重新分派
7. 其它组合 → false
```

判定优先级口诀：**空值特判 → 同类型走 === → Boolean 转数字 → Object 转 primitive → 数字串转数字**。

四道经典题逐步推演：

**① `[] == ![]` → `true`**

```text
![]           → ToBoolean([]) = true（对象恒真）→ !true → false
[] == false   → false 是 Boolean → ToNumber(false) = 0
[] == 0       → [] 是 Object → ToPrimitive([], number)
                 → [].valueOf() 返回数组自身（对象，「没答」）
                 → [].toString() = ""（原始值）
"" == 0       → String vs Number → ToNumber("") = 0
0 == 0        → true
```

**② `[null] == 0` → `true`**

```text
[null] == 0 → ToPrimitive([null], number) → toString → Array.prototype.join
             → null/undefined 元素渲染为 "" → "" == 0 → ToNumber("") = 0 → true
```

**③ `"0" == false` → `true`**

```text
false 是 Boolean → ToNumber(false) = 0 → "0" == 0 → ToNumber("0") = 0 → 0 == 0 → true
```

**④ `NaN == NaN` → `false`**

```text
两侧同为 Number → 第 2 步直接退化 IsStrictlyEqual → IEEE 754：NaN 与任何值（含自身）不等 → false
```

附带一个高频对照：`null >= 0` 是 **true**（关系运算符走 ToNumber：`ToNumber(null) = 0`，`0 >= 0` 成立），而 `null == 0` 是 **false**（空值短路）。同一个 null，两套算法两种命运。

### 9. `===` / SameValue / SameValueZero：只在两个点分叉

三套语义（依据：ECMA-262 §7.2.14 IsStrictlyEqual、§7.2.9 SameValue、§7.2.10 SameValueZero）：

| 分叉点 | `===`（IsStrictlyEqual） | `Object.is`（SameValue） | SameValueZero（Map/Set 键） |
| --- | --- | --- | --- |
| `NaN` vs `NaN` | `false` | `true` | `true` |
| `+0` vs `-0` | `true` | `false` | `true` |
| `1` vs `"1"` | `false`（类型不同直接 false） | `false` | `false` |
| 两个内容相同的对象 | `false`（比身份） | `false`（比身份） | `false`（比身份） |

- `===`：同类型才比值，数字用 IEEE 754 相等（于是 NaN 不等、±0 相等）
- `SameValue`（`Object.is` 的底层，依据 §7.2.9）：把 IEEE 754 的两个「设计缺陷」各翻转一次——NaN 判等（走 `Number::sameValue` 的 NaN 分支）、±0 判不等
- `SameValueZero`：= SameValue 但 ±0 判等。**Map/Set 的键比较用它**：NaN 能作键且可命中（`m.get(NaN)` 拿得到值），`-0` 与 `+0` 是同一个键。设计动机：`-0` 常来自计算（如 `-1 * 0`），若与 `+0` 区分会产生「看不见的重复键」；而 NaN 若不相等则 NaN 键永远无法读取
- 选型实践：日常判等 `===`；涉及 NaN（如「值没变就跳过」）用 `Object.is`；容器键语义交给 Map/Set

### 10. Symbol：唯一性、注册表与 well-known symbols

**基础**：

- `Symbol("id") !== Symbol("id")`：description 只是调试信息，每次调用产生全新唯一值——这是「隐藏/防冲突属性键」的原始设计动机
- Symbol 是**唯一禁止隐式转字符串的类型**：`String(sym)` 可以（显式），`sym + ""` / `` `${sym}` `` 抛 TypeError——防止唯一性在拼接中悄悄丢失（但作为属性键时 `ToPropertyKey` 直接返回 symbol 本身，无需转换）
- `Symbol.for(key)` / `Symbol.keyFor(sym)`：走 **GlobalSymbolRegistry 全局注册表**（同一 agent 内跨模块、跨 realm 共享），按 key 复用同一 symbol；未注册的 symbol `keyFor` 返回 `undefined`。跨库共享协议符号（如 riot 的 `@@riot` 风格）用它

**Well-known symbols**（内置符号协议，全表见 ECMA-262 §6.1.5.1）——关键是记住**谁在哪个内部算法里查询它们**：

| 符号 | 查询点 | 用户可自定义的效果 |
| --- | --- | --- |
| `Symbol.iterator` | `GetIterator`（§7.4.4） | `for...of` / 展开 / 解构 / `Array.from` / `Promise.all` 把对象当可迭代对象 |
| `Symbol.asyncIterator` | `GetIterator(async)`（同 §7.4.4） | `for await...of` 异步迭代 |
| `Symbol.toPrimitive` | `ToPrimitive`（§7.1.1）第 1 步 | 完全接管对象→原始值转换（能看到 hint） |
| `Symbol.hasInstance` | `InstanceofOperator`（§13.10.2）第 1 步 | 改写 `x instanceof C` 的判定 |
| `Symbol.toStringTag` | `Object.prototype.toString` | 改变 `[object X]` 分类标签（如内置的 `[object Array]`、`[object Null]` 分支） |
| `Symbol.species` | `SpeciesConstructor`（§7.3.22） | 决定 `map`/`filter`/`slice`/`Promise.prototype.then` 等**派生新对象**用哪个构造器（子类控制、库防污染的核心机制） |

它们与普通 symbol 的唯一区别是**语言算法在固定时机用 `GetMethod` 查询这个名字**——本质是「用属性键实现的运算符重载点」。

---

## 可运行示例

下面这个综合片段覆盖本篇主线（配套的 4 个练习文件有更完整的逐行推演）：

```ts live noInline
// A. hint 决定 valueOf / toString 谁先被问
const obj = { valueOf: () => 1, toString: () => "10" };

console.log(obj + 1);   // 2      default → valueOf → 1 → 1 + 1
console.log(`${obj}`);  // 10     string  → toString → "10"
console.log(obj * 2);   // 2      number  → valueOf → 1 → 1 * 2

// B. ToNumber 的坑
console.log(Number(""), Number(" "), Number("12px"));  // 0 0 NaN
console.log(Number(null), Number(undefined));          // 0 NaN（不对称）

// C. == 推演（对照第 8 节伪代码逐步走）
console.log(([] as any) == !([] as any));              // true（![] → false → 0；[] → "" → 0）
console.log(([null] as any) == 0);                     // true（[null] → "" → 0）

// D. 三套相等语义的分叉点
console.log(0 === -0, Object.is(0, -0));               // true false
console.log(NaN === NaN, Object.is(NaN, NaN));         // false true
const m = new Map<unknown, string>([[NaN, "hit"]]);
console.log(m.get(NaN));                               // hit（SameValueZero：NaN 可命中）
```

原理解释（逐行）：

- A 组：同一个对象，三种运算给出三种结果——`+` 的 default hint 顺序是 `valueOf` 先；模板字符串的 string hint 翻转顺序；乘法与 `+` 的差异只在 hint（依据 §7.1.1 / §13.8.1）
- B 组：空串与纯空白串都是合法的「空数字」归 0；尾部有非数字字符即 NaN；`null`/`undefined` 的不对称见第 7 节
- C 组：`[] == ![]` 的关键三步——`ToBoolean([]) === true`、`ToNumber(false) === 0`、`ToPrimitive([]) === ""`；任何一步背错都会推错
- D 组：`===` 与 `Object.is` 恰好在 ±0 与 NaN 两个点互换；Map 键用第三套 SameValueZero，两个点都取「实用」的一侧

> 动手要求：先只看代码手写输出，再 `npx tsx` 验证。全部命中才算过关（对应练习：`02-equality-and-object-is.ts`、`03-to-primitive.ts`）。

---

## 易错点与面试高频

1. **`new Boolean(false)` 是 truthy**：对象恒真（§7.1.2），`if (new Boolean(false))` 进分支；`== false` 却是 `true`（拆箱后 0 == 0）
2. **`[] == ![]` 为 true**：见第 8 节推演；追问点通常是 `ToBoolean([])` 与 `ToPrimitive([])` 两步
3. **`null == 0` false 但 `null >= 0` true**：`==` 的空值短路 vs 关系运算符的 ToNumber
4. **`typeof null === "object"`**：讲得出 type tag 历史成因 + ES6 提案被撤回（第 3 节）
5. **`x.y = 1` 后读回 `undefined`**：临时包装对象的生命周期只覆盖一个表达式（第 2 节）
6. **`1 instanceof Number` false**：instanceof 不装箱；`new Number(1) == 1` true 但 `=== 1` false
7. **`{} + []` 在语句位置是 0**：行首 `{}` 被解析为空块，实际执行 `+[]` → `ToNumber("") → 0`；表达式位置（如 `console.log(({}) + [])`）才是 `"[object Object]"`
8. **`0.1 + 0.2 !== 0.3`**：IEEE 754 双精度表示误差，属本主题延伸（用 `Number.EPSILON` 或整数化比较）
9. **`isNaN("12px") === true`**：全局 isNaN 先 ToNumber；用 `Number.isNaN`
10. **跨 realm `instanceof Array` 失败**：用 `Array.isArray`（§7.2.2 IsArray，与原型无关）
11. **Symbol 不能隐式转字符串**：`` `${sym}` `` 抛 TypeError；`Symbol.for` 才能跨模块共享同一个 symbol
12. **Map 键语义**：`NaN` 键可命中、`+0`/`-0` 同键（SameValueZero），`Object.is` 判 NaN 但区分 ±0，`===` 两个点都反过来

---

## 输出预测题

**第 1 题**：不运行，写出全部输出：

```ts live noInline
const t = {
  [Symbol.toPrimitive](hint: string) {
    return hint === "number" ? 9 : `I am ${hint}`;
  },
};

console.log(t * 2);
console.log(t + "");
console.log(`${t}`);
console.log(Number(t) === 9, String(t) === "I am string");
```

**第 2 题**：不运行，写出全部输出：

```ts live noInline
console.log(new Boolean(false) == false);
console.log([[]] == "");
console.log(null >= 0, null == 0);

const s = new Set([NaN]);
console.log(s.has(NaN));
```

（答案与逐步解析见下方，先闭卷推演再对答案。）

---

## 预测题答案

**第 1 题**

```text
18
I am default
I am string
true true
```

逐步解析：

1. `t * 2`：乘法给对象传 hint `"number"` → `@@toPrimitive` 返回 `9` → `9 * 2 = 18`。`@@toPrimitive` 存在，`valueOf`/`toString` 根本没机会被调用（§7.1.1 第 1 步短路）
2. `t + ""`：二元 `+` 传 hint `"default"` → 返回字符串 `"I am default"`；另一侧是字符串 → 直接拼接（结果不变）
3. `` `${t}` ``：模板字符串传 hint `"string"` → 不是 `"number"` → 走 else 分支返回 `"I am string"`
4. `Number(t)` → hint `"number"` → `9`，`9 === 9` 为 `true`；`String(t)` → hint `"string"` → `"I am string"`，严格相等为 `true`。这一行验证 hint 的三个取值确实来自**调用方**，同一个对象三种答案

**第 2 题**

```text
true
true
true false
true
```

逐步解析：

1. `new Boolean(false) == false`：Object vs Boolean → `ToNumber(false) = 0` → `ToPrimitive(new Boolean(false), number)`：无 `@@toPrimitive`，`valueOf()` 返回原始值 `false` → 退化为 `IsLooselyEqual(false, 0)` → `ToNumber(false) = 0` → `0 == 0` → `true`。注意与「对象恒 truthy」并存不悖：truthiness 看类型（对象），`==` 看拆箱后的值
2. `[[]] == ""`：Object vs String → `ToPrimitive([[]], number)` → `toString` → 内层数组 join 得 `""` → 外层 join 得 `""` → `"" == ""`（两侧同为 String，直接严格相等）→ `true`。注意最后一步是字符串比字符串，**没有**再转数字
3. `null >= 0`：关系运算符把 `null` 经 ToNumber 转 `0`（§7.1.4 表格），`0 >= 0` 成立 → `true`；`null == 0`：IsLooselyEqual 的空值短路（任一侧 null/undefined 且不成对 → false，不做转换）→ `false`。两问对照正是 `==` 与关系运算符走不同算法的证据
4. `s.has(NaN)`：Set 的键比较用 SameValueZero（§7.2.10），NaN 与 NaN 判等 → `true`。若 Set 用 `===` 的 NaN 语义，NaN 键将永远无法命中

---

## 延伸阅读

- ECMA-262 规范（tc39.es，现行版）：本文全部编号的出处
  - 抽象操作：类型转换与比较 [https://tc39.es/ecma262/multipage/abstract-operations.html](https://tc39.es/ecma262/multipage/abstract-operations.html)（§7.1.1 ToPrimitive、§7.2.13 IsLooselyEqual、§7.2.14 IsStrictlyEqual、§7.2.9 SameValue、§7.2.10 SameValueZero 等）
  - 总目录（按操作名检索各章）[https://tc39.es/ecma262/multipage/](https://tc39.es/ecma262/multipage/)
- MDN：typeof 运算符（含 typeof null 历史成因引述与 document.all 特例）[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- MDN：相等性比较与 sameness（=== / Object.is / SameValueZero 三者总览）[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
- MDN：Symbol 与 well-known symbols [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
- 书：Kyle Simpson《You Don't Know JS: Types & Grammar》——隐式转换一章与规范算法互为印证

（下一主题对照大纲为阶段 1.2 作用域与闭包。）

