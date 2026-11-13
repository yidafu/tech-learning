/**
 * 大纲章节：阶段 3.5 延伸——interface vs type 的真实差异
 * 主题：声明合并、隐式索引签名（Record 收不收）、extends 冲突立即报错 vs & 交叉静默 never
 * 运行：npx tsx exercises/ts-classes-interfaces/01-interface-vs-type.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-classes-interfaces/01-interface-vs-type.ts
 * 预期输出：
 * ip = { x: 3, y: 4 }
 * neverProp 的值 = still here（& 冲突的属性在类型层是 never，运行时照常存在）
 * merged 传给 recordFn = {"x":1,"y":2} —— 合并后 interface 赋给收 type 的函数没问题
 */

export {};

// ============================================================
// 一、隐式索引签名：type 有、interface 没有
// ============================================================

interface IPoint {
  x: number;
  y: number;
}
type TPoint = {
  x: number;
  y: number;
};

// type：对象字面量形状有隐式索引签名 → 可赋给 Record<string, number>
const fromType: Record<string, number> = { x: 1, y: 2 } as TPoint;

// interface：没有隐式索引签名 → 拒收（@ts-expect-error 必须命中）
// @ts-expect-error —— Index signature for type 'string' is missing in 'IPoint'
const fromIface: Record<string, number> = { x: 1, y: 2 } as IPoint;

// 但 interface 本身照常按结构使用：
const ip: IPoint = { x: 3, y: 4 };
console.log('ip =', ip); // 上例只证明「赋给索引签名类型」的差异，不影响 interface 自身的使用

// ============================================================
// 二、extends 冲突立即报错 vs & 交叉静默 never
// ============================================================

interface KindStr {
  kind: string;
}
// @ts-expect-error —— TS2430 报在 interface 声明行（名字处）：number 不能赋给 string，声明点当场拦截
interface KindNum extends KindStr {
  kind: number;
}

type Crossed = { kind: string } & { kind: number };
type _probe = Crossed['kind']; // string & number = never——声明处不报错
// 注意：never 可赋给任何类型（bottom type），所以「declare const crossed: Crossed; const s: string = crossed.kind」
// 反而合法——& 冲突的「晚炸」体现在：没有任何真实值能满足它
function takeCrossed(c: Crossed): string {
  return String(c);
}
// @ts-expect-error —— { kind: string } 不可赋给 Crossed（kind 需要同时是 string 和 number）：使用处才炸
takeCrossed({ kind: 'x' });

// 运行时对照：交叉类型的「冲突属性」在运行时照样存在（类型 never ≠ 值不存在）
const runtimeCrossed = { kind: 'still here' } as unknown as Crossed;
// 运行时取值绕过类型层（as unknown），说明 never 只是类型层结论：
console.log(`neverProp 的值 = ${(runtimeCrossed as { kind?: string }).kind}（& 冲突的属性在类型层是 never，运行时照常存在）`);

// ============================================================
// 三、声明合并：interface 超能力 / type 不允许
// ============================================================

interface Merged {
  x: number;
}
interface Merged {
  y: number;
} // 同名自动合并：Merged = { x; y }——type 同名会报 Duplicate identifier（无法用 @ts-expect-error 压制重复声明，故以注释说明）

const merged: Merged = { x: 1, y: 2 };

// 同名成员类型不同 → 报错（报错定位在第二段声明的属性行）
interface Conflict {
  v: string;
}
interface Conflict {
  // @ts-expect-error —— Subsequent property declarations must have the same type
  v: number;
}

// 合并后的 interface 赋给「收 type 形状参数」的函数：结构兼容即可
function recordFn(p: { x: number; y: number }): string {
  return JSON.stringify(p);
}
console.log(`merged 传给 recordFn = ${recordFn(merged)} —— 合并后 interface 赋给收 type 的函数没问题`);

export { fromType, ip };
