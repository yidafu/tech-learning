---
mdx:
  format: mdx
references:
  - 26-compiler-perspective
  - 01-types-and-coercion
  - 02-scope-and-closure
  - 07-v8-engine
---
# 27 · 特异行为解码：每个 JS「怪现象」都归属于一个编译阶段

> 对应大纲：阶段 5 编译原理视角专题（延续笔记 26 的五阶段管道）；回扣笔记 01（类型转换）、笔记 02（作用域与闭包）、笔记 07（V8）。
> 一手依据：ECMA-262——Lexical Grammar 一章（InputElementDiv / InputElementRegExp / InputElementRegExpOrTemplateTail 目标符号）；Automatic Semicolon Insertion 条款与各产生式的 `[no LineTerminator here]`；ExpressionStatement 产生式的 lookahead 限制（不能以 `{`、`function`、`class` 开头）；CoverParenthesizedExpressionAndArrowParameterList、CoverInitializedName（cover grammar）；GlobalDeclarationInstantiation / FunctionDeclarationInstantiation / ForBodyEvaluation（CreatePerIterationEnvironment）；ToPrimitive / ToNumber / ToString。

## 学习目标

- 拿到任何一个「怪现象」，能指认它发生在哪个阶段：词法切分 → 语法分析（含 ASI、cover grammar）→ 声明实例化（语义）→ 运行时求值。
- 能引用规范条款（而不是背结论）解释：`/` 二义性、`{} + [] === 0`、`typeof` 的两副面孔、循环闭包差异、`[] + [] === ""`。
- 能说出 tsc 在编译期拦下其中哪些（TS2365 / TS2362），以及为什么 `1 + "2"` 放行而 `"5" - 2` 被拒。

---

## 关键概念

### 0. 总表：怪现象 → 阶段归因

| 怪现象 | 发生阶段 | 规范机制 |
| --- | --- | --- |
| `const n = 10` 换行后写 `/2/.test(x)` 崩 | ① 词法 + ② 语法 | InputElementDiv/RegExp 两套目标符号；ASI 插入条件不满足 |
| `return\n 1` 返回 undefined（笔记 26） | ② 语法 | ASI + `return` 产生式的 `[no LineTerminator here]` |
| `a = b\n(c)` 变成 `b(c)` 调用 | ② 语法 | ASI 只在语法违规时恢复，不看语义 |
| `a\n++\nb` 变成 `a; ++b` | ② 语法 | 后缀 `++` 的 restricted production |
| `{} + [] === 0`（语句位置） | ② 语法 | ExpressionStatement 不能以 `{` 开头 → `{}` 是 Block |
| `{ x = 1 }` 时灵时不灵 | ② 语法 | CoverInitializedName：cover grammar 延迟决定身份 |
| `typeof x` 有时安全有时抛 | ③ 语义 | binding 三态：不存在 / 未初始化 / 已初始化 |
| for-let 闭包打印 0,1,2 而 for-var 打印 3,3,3 | ③ 语义 + 运行时 | CreatePerIterationEnvironment（每迭代新环境） |
| `[] + [] === ""`、`true + true === 2` | ⑤ 运行时 | ToPrimitive → ToNumber / ToString 抽象操作 |

方法本身就是结论：**先问「这件事归哪个阶段管」，怪现象就不再需要逐个背**。

### 1. 站一 · 词法：`/` 的双重身份——JS 词法器无法独立工作

教科书模型：词法分析是正则语言层面的事，自动机独立扫完全部 token，再交给 parser。JS 做不到——`/` 既可能是除号也可能开启一个正则字面量，**仅看前一个 token 的语法类别才能决定**：

- parser 期待一个表达式时（语句开头、`(`、`,`、`=` 之后），按 **InputElementRegExp** 目标切分：`/` 是正则开头；
- parser 处于表达式中间时（字面量 / 标识符 / `)` 之后），按 **InputElementDiv** 目标切分：`/` 是除号。

所以这不是引擎实现技巧，而是**词法文法本身就分裂成多套产生式**（还包括模板串的 InputElementRegExpOrTemplateTail）。后果是一条编译原理级的批评：JS 不是「先词法后语法」的两层语言，扫描与解析必须交错、互相反馈。

三个实测（练习 06 第一节）：

```js
const rate = 2;
console.log(10
/rate);                    // 5 —— `/` 接在 10 后 → 除号，换行救不了
console.log(/rate/.test("rate")); // true —— 语句参数处期待表达式 → 正则
try { eval("const n = 10\n/2/.test('x')"); } catch (e) {}
// SyntaxError：10/2 之后遇到 `.`，`.` 前没有换行 → ASI 条件不满足 → 解析失败
```

第三例是最阴险的形态：上一行漏分号，下一行的正则被切成两个除号，表达式延伸到 `.` 处崩掉——而且因为出错的 `.` 与前一个 token 之间没有换行，ASI 连补分号的机会都没有。

### 2. 站二 · 语法：ASI 是错误恢复，`{}` 靠位置消歧，cover grammar 延迟决定

**（1）ASI 的正确定位：parser 的错误恢复机制。** 规范三条规则概括为：某个 token 让文法接不下去且它前面有换行 / 遇到 `}` / EOF / restricted production（`return`、`throw`、`break`、`continue`、后缀 `++/--`、`=>` 前不得换行）——才补一个 `;`。关键推论：

- **只看语法，不看语义**：`b\n(c).toString()` 中 `b(c)` 是合法的调用表达式，文法接得下去 → 不插分号 → 运行时 `TypeError: b is not a function`（练习 06 2a）；
- **换行本身不是分号**：换行只是 ASI 的准入条件之一，不是插入的触发器。

**（2）`{}` 的二义性由语法位置裁决。** ExpressionStatement 的产生式带 lookahead 限制：表达式语句**不能以 `{` 开头**。于是语句位置的 `{}` 永远解析为 Block：

```js live noInline
console.log(eval("{} + []")); // 0 —— 空块 + 一元加[]（[] → "" → 0），两条语句！
console.log(({} + []));       // "[object Object]" —— 括号强制表达式位置 → 对象字面量
```

所谓 `{} + [] === 0` 这个「wat」，一半是语法（`{}` 是块），另一半才是类型转换（`+[] → 0`）。把它整体归给「JS 类型转换混乱」是错误归因。

**（3）cover grammar：把决定推迟到看到更多上下文。** `(a, b)` 既可能是括号表达式也可能是箭头函数参数；`{ x = 1 }` 作为对象字面量非法、作为解构模式合法。规范的做法是先按一个**宽产生式**收下（CoverParenthesizedExpressionAndArrowParameterList / CoverInitializedName），解析到 `=>` 或 `=` 时再**重解释（refactor）**为最终形式。这是真实编译器里的延迟决策技术被直接写进文法。实测对比：

```js live noInline
eval("const o = { x = 1 };");  // SyntaxError：对象字面量里没有默认值产生式
let x; ({ x = 1 } = {});        // 合法：同一串字符在解构上下文被 cover 产生式收下，x === 1
```

**（4）重载最早在词法层分流。** `"foo" + + "bar"` 里两个 `+` 是**两个不同 token**（二元 Plus 运算符 / 一元 UnaryPlus 运算符），由 parser 按位置决定，到运行时才分别求值（`+"bar" → NaN`，拼接得 `"fooNaN"`）。语法层能消掉的重载在这里就消掉了，消不掉的才流向站四。

### 3. 站三 · 语义：binding 三态解释 `typeof` 的两副面孔；per-iteration 环境解释循环闭包

回扣笔记 26 第 5 节：JS 执行分两步——先声明实例化（创建词法环境与全部 binding），再逐语句求值。于是任何名字在任一时刻处于三态之一：

| binding 状态 | 访问结果 | `typeof x` |
| --- | --- | --- |
| 不存在（沿作用域链查无此名） | ReferenceError | `"undefined"`（typeof 对「未声明」有豁免） |
| 存在但未初始化（let/const/class 的 TDZ） | ReferenceError | **照样抛**（豁免不覆盖此态） |
| 已初始化 | 返回值 | 正常 |

```js live noInline
console.log(typeof neverDeclared); // "undefined" —— 连 binding 都没有
try { console.log(typeof tdzVar); } catch (e) {}  // ReferenceError —— binding 在，但未初始化
let tdzVar = 1;
```

「typeof 永远安全」是 ES5 时代（只有 var）的结论；`let` 引入第三种状态后失效。这也解释了为什么 TDZ 检查是**运行时**语义（笔记 26 练习 02）：binding 是否初始化是环境记录的运行时状态，解析期只知道「binding 会存在」。

**循环闭包**：`for (var i)` 中 `i` 是函数作用域里的**一个** binding；`for (let j)` 在 ForBodyEvaluation 中每轮迭代都执行 CreatePerIterationEnvironment——把上一轮的环境**复制**成新环境再执行循环体。闭包捕获的是环境引用而非值，于是：

```js
for (var i = 0; i < 3; i++) varFns.push(() => i); // 全部指向同一个 i → [3,3,3]
for (let j = 0; j < 3; j++) letFns.push(() => j); // 每轮新环境 → [0,1,2]
```

这不是「let 的语法糖」而是运行时语义：Babel 把 for-let 降级成「每轮一个 IIFE 新作用域」，正是在模拟这条规范行为。根源仍是静态的：因为 `j` 是块级绑定，规范才规定逐迭代实例化——**静态作用域分析决定动态环境的创建方式**。

### 4. 站四 · 运行时：`+` 的语义消歧是抽象操作；TS 把其中一半抢回编译期

`+` 的 token 二义在站二已消（一元/二元），但**语义**仍二义：数值加还是拼接？语法层无解——答案取决于操作数的运行时类型。规范交给运行时按部就班：两侧 ToPrimitive（无 hint，default）→ 若任一 primitive 是 string 则拼接（ToString），否则 ToNumber 相加。

```js live noInline
[] + []        // ""                —— "" + ""
[] + {}        // "[object Object]" —— "" + "[object Object]"
true + true    // 2                 —— 1 + 1
1 + "2"        // "12"              —— 有 string → 拼接
"5" - 2        // 3                 —— `-` 无重载，直接 ToNumber 两边
[1, 2] + [3]   // "1,23"            —— "1,2" + "3"
"foo" + +"bar" // "fooNaN"          —— 一元 + 先行，再拼接
```

**tsc 在静态语义层的取舍（实测）**：

| 表达式 | tsc | 依据 |
| --- | --- | --- |
| `[] + []`、`true + true`、`[1,2] + [3]` | ❌ TS2365（`+` 不能用于这些类型） | 结果类型无法静态赋予安全含义 |
| `"5" - 2` | ❌ TS2362（算术左侧必须是 number/bigint/any） | `-` 无拼接方向，转换属「静默魔法」，直接拒 |
| `1 + "2"`、`"foo" + +"bar"` | ✅ 放行 | 拼接方向结果必为 string，类型静态可判 |

不对称本身就是设计：`+` 的拼接方向「类型可判」所以宽，`-` 的隐式数值转换「类型不可判」所以严。这正是笔记 26 第 7 节「类型检查 = 抽象解释」的落地——TS 用「类型」这个抽象域提前解释程序，把运行时才消歧的问题在编译期拒绝。**同一行代码，V8 在运行时给出答案，tsc 在编译期给出禁令**——这就是「行为归属于哪个阶段」的最好注脚。

---

## 可运行示例

配套练习：`exercises/compiler-perspective/06-weird-behaviors.mjs`（`npx tsx` 运行，四节 17 项输出全注释）。刻意用 `.mjs`：第四节一半代码若在 `.ts` 里会被 tsc 直接判死——「活在类型检查之外」正是该节的教学内容。

最小感受版（node REPL 直接粘贴）：

```js
eval("const n = 10\n/2/.test('x')")   // SyntaxError：`/` 被切成除号，`.` 前无换行，ASI 不救
eval("{} + []")                        // 0：语句位置 {} 是块
({} + [])                              // '[object Object]'：表达式位置 {} 是字面量
let a = 1, b = 2; a
++
b
console.log(a, b)                      // 1 3：后缀 ++ 不得跨行，断成 a; ++b
// 注意别用 [a, b] 收尾：b 换行后跟 [ 会被解析成成员访问 b[a, b]——又一个吞行陷阱
```

---

## 易错点与面试高频

1. **「ASI 就是行尾自动加分号」——错**。它只在文法接不下去（且满足三条规则之一）时作为错误恢复介入；`b\n(c)` 是合法调用，不插分号。
2. **「`{} + [] === 0` 证明类型转换混乱」——错误归因**。一半是语法（`{}` 是 Block），一半才是转换（`+[] → 0`）。加个括号立刻变成 `"[object Object]"`。
3. **「typeof 永远不抛错」——ES5 时代结论**。TDZ 中的 `let` 照抛 ReferenceError：豁免只覆盖「binding 不存在」。
4. **「for-let 修闭包是语法糖」——是运行时语义**（每迭代 CreatePerIterationEnvironment）；Babel 的 IIFE 降级是它的模拟实现。
5. **「`/` 二义是引擎实现细节」——规范层面就是两套词法产生式**（InputElementDiv / InputElementRegExp），扫描与解析必须交错。
6. **「TS 擦除类型所以不管这些」——恰恰相反**：TS2365/TS2362 在静态语义层拦下 `[] + []`、`"5" - 2`，放行 `1 + "2"`——判断标准是「结果类型能否静态判定」，不是「行为怪不怪」。
7. **面试高频问法**：「ASI 的触发条件」「`{} + []` 为什么是 0」「typeof 在 TDZ 里的行为」「for 循环 var/let 闭包差异的规范根源」「`+` 的类型转换算法」。答题骨架：先报阶段（词法/语法/语义/运行时），再引条款，最后给一行代码验证。

---

## 输出预测题

### 题 1（吞行陷阱：词法 + 语法 + TDZ 三连）

```js live noInline
const ten = 10
const half = ten
/2/
console.log(half)
```

① 这段代码的输出是什么？逐 token 说明解析过程。
② 只在 `const half = ten` 末尾补一个分号，输出变成什么？

### 题 2（四站全覆盖）

```js live noInline
console.log(eval("{} + []"));            // ①
let a = 1, b = 2;
a
++
b
console.log(a, b);                       // ②
console.log(typeof nope);                // ③
try { (() => { console.log(typeof t); let t = 1; })(); } catch (e) { console.log(e.constructor.name); } // ④
console.log([] + {}, "5" - 2, "foo" + +"bar");  // ⑤
```

加分题：⑤ 这一行的三个表达式交给 tsc 严格检查，哪几个报错？错误码是什么？

（答案见文末）

---

## 延伸阅读

- ECMA-262——Lexical Grammar 一章（两套 InputElement 目标符号）；Automatic Semicolon Insertion；ExpressionStatement 的 lookahead 限制；CoverGrammars 相关产生式；ForBodyEvaluation / CreatePerIterationEnvironment；ToPrimitive
- Axel Rauschmayer《Speaking JavaScript》第 7 章（JavaScript's syntax）——`/` 二义与 ASI 的历史成因
- 《Crafting Interpreters》词法/语法分章——对照「词法器独立」的教科书模型，体会 JS 为何是反例
- 回扣笔记 26 第 5–7 节（declaration instantiation、checker = 静态分析引擎）、笔记 02（作用域三篇）、笔记 01（ToPrimitive）

---

## 预测题答案

### 题 1

- ① **ReferenceError: Cannot access 'half' before initialization**（已实测）。解析：`const half = ten` 后的 `/` 接在表达式后面被切成**除号**，于是初始化器一路延伸：`half = ten / 2 / console.log(half)`。求值顺序：`ten / 2` = 5，再求 `console.log(half)`——此刻 `half` 的 binding 已创建但**初始化器尚未执行完**，处于 TDZ → 抛错。一行代码同时踩中站一（`/` 切分）、站二（ASI 不介入：文法接得下去）、站三（TDZ）。
- ② 输出 **10**。`const half = ten;` 完整结束；`/2/` 独立成句，语句开头处按 InputElementRegExp 切成**正则字面量**（一个被丢弃的 RegExp 表达式语句）；`console.log(half)` 正常打印 `ten` 的值 10。

### 题 2

- ① **0**。语句位置 `{}` 是空 Block，`+[]` 是独立的一元加表达式语句（`[] → "" → 0`）。
- ② **1 3**。后缀 `++` 产生式带 `[no LineTerminator here]` → `a; ++b;`。
- ③ **"undefined"**。`nope` 连 binding 都没有，typeof 对「不存在」有豁免。
- ④ **ReferenceError**。箭头函数体内 `t` 的 binding 在调用时已实例化（存在）但未初始化——豁免不覆盖 TDZ。
- ⑤ **[object Object] 3 fooNaN**。`[] + {}` 拼接；`"5" - 2` 走 ToNumber；`+"bar" = NaN` 再拼接。
- 加分题：`[] + {}` → **TS2365**；`"5" - 2` → **TS2362**；`"foo" + +"bar"` **放行**（一元 + 接受 string，结果 number，拼接结果类型静态可判为 string）。判断标准是「结果类型能否静态赋予」，与运行时行为是否「怪」无关。
