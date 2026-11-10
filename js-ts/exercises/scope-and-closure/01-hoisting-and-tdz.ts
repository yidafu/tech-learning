/**
 * 大纲章节：阶段 1.2 作用域与闭包
 * 主题：提升的真相与 TDZ —— var / 函数声明 / 函数表达式 / let / class 在「声明实例化」阶段的差异化行为，以及 typeof 对未声明变量与 TDZ 变量的双面表现
 * 运行：npx tsx exercises/scope-and-closure/01-hoisting-and-tdz.ts
 * 预期输出：
 * [1] var：语句执行前绑定已存在，值 = undefined
 * undefined
 * 1
 * [2] 函数声明：文本定义之前即可调用，输出正常
 * [3] 在赋值前调用 var 函数表达式：TypeError: exprVar is not a function
 * [3] 函数表达式：赋值之后正常执行
 * [4] 直接读取 TDZ 变量：ReferenceError: Cannot access 'tdzValue' before initialization
 * [4] typeof 探测 TDZ 变量同样抛错：ReferenceError: Cannot access 'tdzValue' before initialization
 * [4] 初始化器执行后恢复正常：读取 = initialized，typeof = string
 * [5] typeof 未声明变量 = undefined
 * [5] 直接访问未声明变量：ReferenceError: neverDeclared is not defined
 * [6] 在 class 声明语句之前实例化：ReferenceError: Cannot access 'Late' before initialization
 * [6] 声明语句之后正常：Late 实例
 * [7] 声明实例化后：函数声明 = 函数声明的值，var 函数表达式 = undefined
 * [7] 语句执行后：var 函数表达式 = 函数表达式的值
 * [8] 块内：inner
 * [8] 块外：outer
 * [8] 块内、文本声明之前：function
 * [8] 块函数执行了
 */

// =============================================================================
// 读法提示：
// 「提升」不是规范术语。规范的说法是：进入函数/模块/脚本时先执行「声明实例化」
// （ECMA-262 §10.2.11 FunctionDeclarationInstantiation），一次性登记所有绑定：
//   var        → 创建绑定，初始化为 undefined
//   函数声明    → 创建绑定 + 立即用函数对象初始化（代码体和绑定一步到位）
//   let/const/class → 只创建绑定，【不初始化】→ 在初始化器执行前访问 = TDZ
// 之后语句才开始逐句执行。本文件所有现象都可以用一句话解释：
// 「这个绑定什么时候创建的？什么时候被赋值的？」
// =============================================================================

/** 统一格式化捕获到的错误，避免堆栈信息影响输出 */
function fmt(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

// -----------------------------------------------------------------------------
// [1] var：声明实例化时绑定已创建、值为 undefined
// -----------------------------------------------------------------------------

// 注：类型标注 number | undefined 是 TS 的要求 —— TS 能静态看出「赋值前读取」，
// 类型里包含 undefined 才允许这条语句通过 strict 检查（运行时行为不受影响）。
console.log("[1] var：语句执行前绑定已存在，值 = undefined");
console.log(a); // undefined —— 绑定存在（不是"未声明"），值是声明实例化时写入的 undefined
var a: number | undefined = 1; // 初始化器 `= 1` 在这行的执行位置才运行，本质是一次赋值
console.log(a); // 1

// -----------------------------------------------------------------------------
// [2] 函数声明：声明实例化时绑定与函数对象同时就绪，可以先调用后定义
// -----------------------------------------------------------------------------
declaredFn(); // 文本定义之前调用
function declaredFn(): void {
  console.log("[2] 函数声明：文本定义之前即可调用，输出正常");
}

// -----------------------------------------------------------------------------
// [3] var + 函数表达式：绑定存在、值为 undefined → 提前调用是 TypeError（不是 ReferenceError）
// -----------------------------------------------------------------------------
function callExprVar(): void {
  exprVar(); // 放在函数体里调用：TS 无法静态确定调用时机，正好模拟"提前调用"的运行时
}
try {
  callExprVar(); // 此时 exprVar 的绑定存在，但值还是 undefined
} catch (e) {
  console.log(`[3] 在赋值前调用 var 函数表达式：${fmt(e)}`);
}
var exprVar: () => void = function () {
  console.log("[3] 函数表达式：赋值之后正常执行");
};
callExprVar(); // 赋值之后同一函数就能正常工作

// -----------------------------------------------------------------------------
// [4] let：声明实例化时绑定已创建但【未初始化】（TDZ），typeof 也救不了
// 读取写在函数体里：TS 只静态禁止"同作用域内先用后声明"，跨函数前向引用合法，
// 而运行时是否踩进 TDZ 取决于调用时机 —— 正好用它观察真实行为
// -----------------------------------------------------------------------------
function readTdz(): string {
  return tdzValue; // 解析到下方模块级的 let 绑定（此刻可能尚未初始化）
}
function typeofTdz(): string {
  return typeof tdzValue;
}
try {
  console.log(readTdz());
} catch (e) {
  console.log(`[4] 直接读取 TDZ 变量：${fmt(e)}`);
}
try {
  // 常见误解：typeof 对任何变量都安全。实际上 typeof 只豁免「未声明」，
  // 对「绑定存在但未初始化」照样抛错 —— 这恰好证明 let 的绑定已随声明实例化创建
  console.log(typeofTdz());
} catch (e) {
  console.log(`[4] typeof 探测 TDZ 变量同样抛错：${fmt(e)}`);
}
let tdzValue = "initialized"; // 执行到这里，绑定才被初始化，TDZ 结束
console.log(`[4] 初始化器执行后恢复正常：读取 = ${readTdz()}，typeof = ${typeofTdz()}`);

// -----------------------------------------------------------------------------
// [5] 未声明：整条作用域链上根本没有这个绑定（unresolvable reference）
// -----------------------------------------------------------------------------
// @ts-expect-error TS2304：TS 静态就报「找不到名字」—— 这行要验证的是 typeof 的运行时豁免
console.log(`[5] typeof 未声明变量 = ${typeof neverDeclared}`);
try {
  // @ts-expect-error TS2304：直接访问没有 typeof 豁免，必然抛 ReferenceError
  console.log(neverDeclared);
} catch (e) {
  console.log(`[5] 直接访问未声明变量：${fmt(e)}`);
}

// -----------------------------------------------------------------------------
// [6] class：与 let 同规则 —— 绑定在声明实例化时创建，在语句位置初始化
// -----------------------------------------------------------------------------
function makeInstance(): string {
  return new Late().label;
}
try {
  makeInstance(); // class 声明语句还没执行，Late 处于 TDZ
} catch (e) {
  console.log(`[6] 在 class 声明语句之前实例化：${fmt(e)}`);
}
class Late {
  label = "Late 实例";
}
console.log(`[6] 声明语句之后正常：${makeInstance()}`);

// -----------------------------------------------------------------------------
// [7] 同名 var 与函数声明的时序规则（用两个名字对照演示）
// 规则本身（JS 运行时）：
//   声明实例化阶段 —— var 的绑定先建、初值 undefined；函数声明随后把绑定覆盖为函数对象
//   执行阶段      —— `var x = ...` 的初始化器只是普通赋值，按语句顺序再把函数对象覆盖掉
// 所以"先用后声明"的调用结果取决于它撞上的是哪个阶段的值。
// （TS 层面写不了同名演示：`var x` + `function x(){}` 报 TS2300 重复标识符；
//   对函数声明名赋值在新版 tsc 报 TS2630 —— 这两条静态限制本身也值得知道）
// -----------------------------------------------------------------------------
function varVsFunction(): void {
  // 函数声明 byDecl：声明实例化时"绑定 + 函数对象"已就位 → 文本定义之前即可完整调用
  // var 表达式 byExpr：绑定存在、值是 undefined → typeof 得 "undefined"（不是 "function"）
  console.log(`[7] 声明实例化后：函数声明 = ${byDecl()}，var 函数表达式 = ${typeof byExpr}`);
  var byExpr: (() => string) | undefined = (): string => "函数表达式的值"; // 初始化器在这行才执行
  console.log(`[7] 语句执行后：var 函数表达式 = ${byExpr()}`);
  function byDecl(): string {
    return "函数声明的值";
  }
}
varVsFunction();

// -----------------------------------------------------------------------------
// [8] 块级作用域：每次进入块创建新的声明式环境；块内函数声明在严格模式下是块级绑定
// -----------------------------------------------------------------------------
let shadow = "outer";
{
  let shadow = "inner"; // 块自己的环境记录遮蔽（shadow）外层同名绑定，互不影响
  console.log(`[8] 块内：${shadow}`);
}
console.log(`[8] 块外：${shadow}`);

function blockFn(): void {
  {
    console.log(`[8] 块内、文本声明之前：${typeof inBlock}`); // function —— 提升到块顶部（块级声明实例化）
    inBlock();
    function inBlock(): void {
      console.log("[8] 块函数执行了");
    }
  }
  // 块外的 inBlock：ESM 是严格模式，按主规范它是块级绑定、出块即不存在；
  // Annex B §B.3.2 的 var 化兼容只适用于 sloppy 模式。
  // 注意：tsx 底层的 esbuild 会应用 web 兼容降级，在这里写 `typeof inBlock`
  // 会打印 "function"（工具链行为）；原生 Node ESM 里同代码打印 "undefined"。
  // 所以本文件不执行块外访问，避免把工具行为当成规范行为。
}
blockFn();
