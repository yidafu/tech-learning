/**
 * 大纲章节：阶段 3.2/3.5 延伸——重载的完整规则
 * 主题：解析顺序（第一个命中即停）、实现签名对外不可见、签名顺序即优先级、联合参数替代时机
 * 运行：npx tsx exercises/ts-function-types/01-overloads.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-function-types/01-overloads.ts
 * 预期输出：
 * createElement('div') = {"tag":"div","isBlock":true}（窄签名在前：命中第一条，返回更具体类型）
 * createElement('span') = {"tag":"span","isBlock":false}（宽签名兜底：命中第二条）
 * f3('10') = 10-typeof string（宽签名在前：b/c 全部命中第一条，窄签名永远轮不到）
 * f3(10, 2) = 2-typeof number（同上——窄签名成了死代码；运行值 parseInt('10', 2) = 2）
 */

export {};

// ============================================================
// 一、签名顺序即优先级：窄在前，宽兜底
// ============================================================

type El = { tag: string; isBlock: boolean };
function createElement(tag: 'div'): El & { isBlock: true }; // 窄签名在前：字面量 → 更具体返回类型
function createElement(tag: string): El; // 宽签名兜底
function createElement(tag: any): any {
  return { tag, isBlock: tag === 'div' };
}
const div = createElement('div'); // El & { isBlock: true }：第一条命中（窄签名在前）
const any1 = createElement('span'); // El：落到宽签名
console.log(`createElement('div') = ${JSON.stringify(div)}（窄签名在前：命中第一条，返回更具体类型）`);
console.log(`createElement('span') = ${JSON.stringify(any1)}（宽签名兜底：命中第二条）`);

// ============================================================
// 二、反面：宽签名在前 → 窄签名变成死代码（预测题 1 实证）
// ============================================================

function f3(x: string | number, radix?: number): number | string;
function f3(x: number, radix: number): number;
function f3(x: any, radix?: any): any {
  return typeof x === 'number' ? parseInt(String(x), radix) : `${x}`;
}
const a = f3('10'); // 匹配第一条 → number | string（运行时其实是 string）
const b = f3(10, 2); // 仍然匹配第一条！第二条永远轮不到（它是第一条形态的子集）
// @ts-expect-error —— 实现签名是 any 也救不了：对外可见的只有声明签名列表
f3(true);
console.log(`f3('10') = ${a}-typeof ${typeof a}（宽签名在前：b/c 全部命中第一条，窄签名永远轮不到）`);
console.log(`f3(10, 2) = ${b}-typeof ${typeof b}（同上——窄签名成了死代码）`);

// ============================================================
// 三、联合参数替代：返回类型不分叉时不用重载
// ============================================================

// 反面教材：这个重载没有意义——两个签名返回类型相同，调用方还要在 IDE 里读两条
function padBad(x: string, n: number): string;
function padBad(x: string[]): string;
function padBad(x: any): any { return Array.isArray(x) ? x.join(' ') : x.padStart(10, '0'); }

// 正确写法：联合参数一个签名
function padGood(x: string | string[]): string {
  return Array.isArray(x) ? x.join(' ') : x.padStart(10, '0');
}
// 判据：**不同参数形态 → 不同返回类型**才值得重载（如 createElement）；
// 返回类型相同 → 联合参数（如 padGood）
const _u1: string = padGood('7');
const _u2: string = padGood(['a', 'b']);
const _u3: string = padBad('7', 3); // 命中第一条（注意第一条 n 必填——重载签名没有可选的自动继承）
const _u4: string = padBad(['a', 'b']); // 命中第二条
export { padGood, padBad };
