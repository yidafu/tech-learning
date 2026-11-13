/**
 * 大纲章节：阶段 3.2/3.5 延伸——void 豁免 / this 参数 / 构造签名 / 方法双变豁免
 * 主题：void 单向豁免的方向性、this 参数钉住调用方、可调用+可构造同体、strictFunctionTypes 的方法豁免
 * 约定：declare 的值运行时不存在——「类型层演示」语句统一放在不会被调用的 _demo* 函数体里（类型检查照做、运行时零执行）
 * 运行：npx tsx exercises/ts-function-types/02-this-void-constructor.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-function-types/02-this-void-constructor.ts
 * 预期输出：
 * forEach 回调返回了 42：[1,2] —— void 豁免让「多返回」的回调可以传入
 * this 参数绑定后 query = rows（bound 才是合法调用路径）
 * Date 同体：new Date(0) 是 object；Date() 是 string（调用签名无参，返回字符串）
 */

export {};

// ============================================================
// 一、void 单向豁免：赋值层面允许「多返回」，使用层面拿不到
// ============================================================

type NumCb = (x: number) => number;
type VoidCb = (x: number) => void;

const returnsNum: NumCb = (x) => x + 1;
const asVoid: VoidCb = returnsNum; // ✓ 豁免方向：返回 number 的函数赋给 void 回调
// @ts-expect-error —— 反方向不行：Type 'VoidCb' is not assignable to type 'NumCb'（void 不是 number）
const asNum: NumCb = ((x: number) => undefined) as VoidCb;
export { asVoid, asNum };

// 运行时对照：forEach 的 action 是 (v) => void，回调返回 42 也照常工作
const out: number[] = [];
[1, 2].forEach((v) => {
  out.push(v);
  return 42; // 返回值被 forEach 忽略——类型层靠 void 豁免放行
});
console.log(`forEach 回调返回了 42：${JSON.stringify(out)} —— void 豁免让「多返回」的回调可以传入`);

// ============================================================
// 二、this 参数：把「被谁调用」写进类型
// ============================================================

interface Db {
  rows: string[];
  query(this: Db, sql: string): string[];
}
function queryImpl(this: Db, sql: string): string[] {
  return this.rows;
}
const db: Db = { rows: ['rows'], query: queryImpl }; // queryImpl 的 this: Db 与接口方法签名匹配
const bound = queryImpl.bind(db); // 绑定后合法
console.log(`this 参数绑定后 query = ${bound('select 1')}（bound 才是合法调用路径）`);

// 类型层演示（不执行）：游离后裸调，this=undefined 不满足 this: Db
function _demoBareCall() {
  const loose = queryImpl;
  // @ts-expect-error —— The 'this' context of type 'void' is not assignable to method's 'this' of type 'Db'
  loose('select 1');
}

// ============================================================
// 三、构造签名：可调用 + 可构造同体（Date 是现成标本）
// ============================================================

type DateFactory = typeof Date; // new (value) => Date 与 () => string 的交叉
const df: DateFactory = Date;
const asInstance = new df(0); // 构造签名：new (value) => Date，得 Date
const asCall = df(); // 调用签名：() => string——lib.es5.d.ts 里 Date 的调用签名是无参的（直接调用忽略参数返回字符串）
console.log(`Date 同体：new Date(0) 是 ${typeof asInstance}；Date() 是 ${typeof asCall}（调用签名无参，返回字符串）`);

// abstract new（类型层演示，不执行）：
type AbsCtor = abstract new (...args: never[]) => { kind: string };
type _absIsConcrete = AbsCtor extends new (...args: never[]) => { kind: string } ? true : false; // false：abstract 构造器不是具体构造的子类型
function _demoAbstractNew(AC: AbsCtor) {
  // @ts-expect-error —— Cannot create an instance of an abstract class（abstract 标记挡住 new）
  new AC();
  // 落地路径：收窄掉 abstract 标记后可作为 extends 目标
  class Sub extends (AC as new () => { kind: string }) {}
  return Sub;
}

// ============================================================
// 四、方法简写双变豁免：同一个函数，两个位置两种命运（类型层演示，不执行）
// ============================================================

interface MethodHaver {
  m(x: number | string): void; // 方法简写：双变豁免
  p: (x: number | string) => void; // 函数属性：严格逆变（源参数必须更宽）
}
function _demoMethodVsProp(mh: MethodHaver, narrow: (x: number) => void) {
  mh.m = narrow; // ✓ 方法位放行：双变不检查参数方向
  // @ts-expect-error —— 同一个 narrow 换到属性位：TS2322（number 装不下 number|string 的调用约定）
  mh.p = narrow;
  return mh;
}
