/**
 * 大纲章节：阶段 5 编译原理视角——特异行为的编译阶段归因（笔记 27，地基在笔记 26）
 * 主题：四个阶段的「怪现象」各归各位——
 *   一、词法层：`/` 是除号还是正则？词法器无法独立决策，必须问 parser（InputElementDiv vs InputElementRegExp）
 *   二、语法层：ASI 是 parser 的错误恢复；`{}` 的语句/表达式二义；cover grammar 延迟决定 `{ x = 1 }` 的身份
 *   三、语义层：binding 的三种状态（不存在 / 未初始化 / 已初始化）；for-let 的 per-iteration 环境
 *   四、运行时：`+` 的重载消歧交给 ToPrimitive/ToNumber/ToString（TS 把其中一部分抢回编译期）
 * 运行：npx tsx exercises/compiler-perspective/06-weird-behaviors.mjs
 * 类型校验：无——本文件刻意是 .mjs：四节的代码大量活在 tsc 的「编译期拦截」之外，
 *   若是 .ts，第四节的一半会直接被判 TS2365（这本身就是最后一节的教学内容）
 * 预期输出：见各 console.log 行尾注释
 */

// ============================================================
// 一、词法层：同一个 `/`，两种 token
// ============================================================
// 教科书说「词法分析独立于语法分析」，JS 做不到：
// `/` 是除号还是正则的开头，取决于 parser 当前「在表达式中间」还是「在语句开头」。
// ECMA-262 因此为词法文法定义了多个目标符号（InputElementDiv / InputElementRegExp）。

const rate = 2;

// 1a：`/` 接在一个可继续的表达式后面 → 除号（换行救不了你，ASI 只在语法违规时才介入）
console.log("1a", 10
/rate); // 5

// 1b：`/` 出现在语句/参数开头（parser 正期待一个表达式）→ 正则字面量
console.log("1b", /rate/.test("rate")); // true

// 1c：经典事故形态——上一行漏分号，下一行想写正则：
//     `10` 之后紧跟 `/`，被切成除法：10 / 2 / .test('x') → `.` 无法作为操作数开头
//     且 `.` 前没有换行，ASI 的插入条件不满足 → 直接 SyntaxError
try {
  eval("const n = 10\n/2/.test('x')");
  console.log("1c", "no error");
} catch (e) {
  console.log("1c", e.constructor.name); // SyntaxError
}

// ============================================================
// 二、语法层：ASI 的错误恢复 + `{}` 二义性 + cover grammar
// ============================================================

// 2a：ASI 只看「语法能不能继续」，不看语义合不合理：
//     b 与 (c) 之间能合法构成函数调用 → 不插分号 → b(c)
const b = 1;
const c = 2;
try {
  const r = b
  (c).toString();
  console.log("2a", r);
} catch (e) {
  console.log("2a", e.constructor.name); // TypeError：b 不是函数（b(c) 被当成了调用）
}

// 2b：后缀 ++ 的产生式带 [no LineTerminator here] → x 与 ++ 之间换行即断句
let x = 1;
let y = 2;
x
++
y
console.log("2b", x, y); // 1 3 —— x; ++y; 后缀变成了 y 的前缀

// 2c：同一个 `{}`，parser 按语法位置选产生式——
//     ExpressionStatement 的文法明确规定它不能以 `{` 开头 → 语句位置的 {} 是块
console.log("2c-1", eval("{} + []")); // 0       —— 空 Block + 一元加 []（[] → "" → ToNumber → 0）
console.log("2c-2", ({} + [])); // [object Object] —— 表达式位置：{} 是对象字面量

// 2d：cover grammar——parser 先按「宽产生式」收下，再根据上下文重解释：
//     { x = 1 } 作为对象字面量非法（x = 1 不是属性名），作为解构模式合法（CoverInitializedName）
try {
  eval("const o = { x = 1 };");
  console.log("2d-1", "no error");
} catch (e) {
  console.log("2d-1", e.constructor.name); // SyntaxError
}
let x2;
({ x2 = 1 } = {});
console.log("2d-2", x2); // 1 —— 同一段字符，换一个语法上下文就合法

// ============================================================
// 三、语义层：binding 三态 + per-iteration 环境
// ============================================================

// 3a：typeof 的「豁免」只针对「binding 不存在」；
//     let 的 binding 在声明实例化时就已创建（所以名字查得到）但未初始化 → 访问即 ReferenceError
console.log("3a-1", typeof neverDeclared); // undefined —— 连 binding 都没有
try {
  console.log("3a-2", typeof tdzVar);
} catch (e) {
  console.log("3a-2", e.constructor.name); // ReferenceError —— binding 存在但未初始化（TDZ）
}
let tdzVar = 1;

// 3b：var = 一个贯穿整个函数的 binding；let = 每次迭代复制进新环境（CreatePerIterationEnvironment）
const varFns = [];
for (var i = 0; i < 3; i++) varFns.push(() => i);
const letFns = [];
for (let j = 0; j < 3; j++) letFns.push(() => j);
console.log("3b-1", varFns.map((f) => f())); // [ 3, 3, 3 ]
console.log("3b-2", letFns.map((f) => f())); // [ 0, 1, 2 ]

// ============================================================
// 四、运行时：`+` 的重载消歧——语法层分不掉的，交给规范抽象操作
// ============================================================
// `+` 在词法/语法层已经是两个 token（一元 + / 二元 +），但「加法还是拼接」
// 只有运行时按 ToPrimitive → ToNumber/ToString 的结果决定：

console.log("4a", [] + []); // ''               —— ToPrimitive 两侧都是 ''
console.log("4b", [] + {}); // [object Object]  —— '' + '[object Object]'
console.log("4c", true + true); // 2            —— ToNumber(true)*2
console.log("4d", 1 + "2"); // 12               —— 有一侧 string → 拼接
console.log("4e", "5" - 2); // 3                —— `-` 没有重载，直接 ToNumber
console.log("4f", [1, 2] + [3]); // 1,23        —— '1,2' + '3'
console.log("4g", "foo" + +"bar"); // fooNaN    —— 一元 +bar = NaN，再拼接

// 彩蛋（同款代码交给 tsc 的结局，已实测）：
//   [] + []、true + true、[1,2] + [3] → TS2365: Operator '+' cannot be applied to ...
//   "5" - 2 → TS2362: The left-hand side of an arithmetic operation must be ...
//   1 + "2"、"foo" + +"bar" → 放行（结果类型静态可判：string）
// 注意不对称：`+` 放得宽（拼接方向结果必为 string），`-` 卡得死（JS 会静默转换，TS 直接拒绝）
// TS 的本质：把「运行时才消歧」的问题，用静态语义提前到编译期拒绝（笔记 26 第 7 节：检查 = 抽象解释）。

// ============================================================
// 阶段归因总表（背不下来就回到这张表）
// ============================================================
// `/` 二义、换行敏感性(ASI) ......... 词法/语法层，token 怎么切、句怎么断
// {} + [] = 0、{ x = 1 } 时好时坏 ... 语法层，parser 按位置/上下文选产生式（cover grammar）
// 提升与 TDZ、typeof 两副面孔 ....... 语义层，声明实例化先于执行；binding 三态
// [] + [] = ''、循环闭包差异 ........ 运行时，抽象操作求值 / 环境按迭代实例化
