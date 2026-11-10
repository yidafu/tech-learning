/**
 * 大纲章节：阶段 1.1 类型系统与类型转换
 * 主题：三套相等语义——==（IsLooselyEqual）、===（IsStrictlyEqual）、Object.is（SameValue）与 Map/Set 的 SameValueZero
 * 运行：npx tsx exercises/types-and-coercion/02-equality-and-object-is.ts
 * 预期输出：
 * 1) [] == ![] -> true
 * 2) [null] == 0 -> true
 * 3) "0" == false -> true
 * 4) NaN == NaN -> false
 * 5) null == undefined -> true , null == 0 -> false , null == "" -> false , null == false -> false
 * 6) [] == "" -> true
 * 7) 0 === -0 -> true , Object.is(0, -0) -> false
 * 8) NaN === NaN -> false , Object.is(NaN, NaN) -> true
 * 9) Map.get(NaN) -> hit
 * 10) Map.get(-0) -> zero
 * 11) Set: has(NaN) -> true , has(-0) -> true
 */

// 本文件对照四套相等语义（依据：ECMA-262 §7.2.13 IsLooselyEqual、§7.2.14 IsStrictlyEqual、
// §7.2.9 SameValue、§7.2.10 SameValueZero）：
//   ==        → IsLooselyEqual：会做类型转换
//   ===       → IsStrictlyEqual：同类型 + 值相等；NaN 不等；+0 === -0
//   Object.is → SameValue：NaN 相等；但区分 +0 / -0
//   Map/Set   → SameValueZero：NaN 相等；+0 / -0 不区分
// TS 对「类型无重叠」的 == / === 会编译报错，甚至能识别 NaN 比较恒为 false、[] 恒为真值
// （这本身就是很好的信号：写出这些表达式多半是 bug）。以下在运算处用 as any 只观察运行时语义。

// ══ 1. [] == ![] —— 最经典的松散相等题 ════════════════════════════════
// 推导链（对照 §7.2.13 逐步走）：
//   a. 先求右侧 ![]：ToBoolean([]) → 对象恒真 → true → !true → false
//   b. [] == false：类型 Object vs Boolean → 规则「一方是 Boolean → ToNumber」→ ToNumber(false) = 0
//   c. [] == 0：类型 Object vs Number → 规则「Object 一方做 ToPrimitive(hint number)」
//      → [].valueOf() 返回数组自身（不是原始值，跳过）→ [].toString() → ""
//   d. "" == 0：类型 String vs Number → ToNumber("") = 0
//   e. 0 == 0 → true
const emptyArr: any = []; // any 变量绕开 TS「[] 恒为真值」的静态提示（TS2872），观察运行时
console.log(`1) [] == ![] -> ${emptyArr == !emptyArr}`);

// ══ 2. [null] == 0 —— 数组 toString 的「空洞」══════════════════════════
// 推导链：[null] == 0（Object vs Number）→ ToPrimitive([null], number)
//   → valueOf 返回自身 → toString → Array.prototype.join：null/undefined 元素渲染为 ""
//   → "" == 0 → ToNumber("") = 0 → true
console.log(`2) [null] == 0 -> ${([null] as any) == 0}`);

// ══ 3. "0" == false ════════════════════════════════════════════════════
// 推导链：y 是 Boolean → IsLooselyEqual(x, ToNumber(y)) → ToNumber(false) = 0
//   → "0" == 0（String vs Number）→ ToNumber("0") = 0 → 0 == 0 → true
console.log(`3) "0" == false -> ${("0" as any) == false}`);

// ══ 4. NaN == NaN —— == 也救不了 NaN ══════════════════════════════════
// 推导链：两侧同为 Number → 直接退化为 IsStrictlyEqual
//   → IEEE 754 规定 NaN 与任何值（包括自身）都不等 → false
console.log(`4) NaN == NaN -> ${(NaN as any) == (NaN as any)}`);

// ══ 5. null 的「空值对」特判 ═══════════════════════════════════════════
// IsLooselyEqual 的最前面两条特判：null 与 undefined 互相相等 → true；
// 除此之外 null/undefined 参与的 == 一律 false —— 根本不会做 ToNumber(null)！
// 所以 null == 0 是 false（null 永不转数字参与 ==），这与 ToNumber(null) === 0 并不矛盾：
// == 的算法在轮到任何转换规则之前就短路返回了。
console.log(
  `5) null == undefined -> ${null == undefined}` +
    ` , null == 0 -> ${(null as any) == 0}` +
    ` , null == "" -> ${(null as any) == ""}` +
    ` , null == false -> ${(null as any) == false}`,
);

// ══ 6. [] == "" —— 最后一步是字符串和字符串比 ══════════════════════════
// 推导链：Object vs String → ToPrimitive([], number) → ""
//   → "" == ""（两侧同为 String → IsStrictlyEqual）→ true
// 注意：这里最后一步是「字符串 vs 字符串」，没有再转数字！
console.log(`6) [] == "" -> ${([] as any) == ""}`);

// ══ 7-8. === vs Object.is：只在 ±0 与 NaN 两个点分叉 ══════════════════
console.log(`7) 0 === -0 -> ${0 === -0} , Object.is(0, -0) -> ${Object.is(0, -0)}`);
console.log(`8) NaN === NaN -> ${(NaN as any) === (NaN as any)} , Object.is(NaN, NaN) -> ${Object.is(NaN, NaN)}`);
// IsStrictlyEqual 用 IEEE 754 的相等：+0 与 -0 判等、NaN 判不等；
// SameValue 反过来两个点都不同：NaN 判等（Number::sameValue），+0/-0 判不等。

// ══ 9-11. Map / Set 用的是第四套：SameValueZero ════════════════════════
const cache = new Map<unknown, string>();
cache.set(NaN, "hit");
cache.set(0, "zero");
console.log(`9) Map.get(NaN) -> ${cache.get(NaN)}`);
// NaN 作为键能命中：SameValueZero 认为 NaN 与 NaN 相等（这点像 Object.is）。
console.log(`10) Map.get(-0) -> ${cache.get(-0)}`);
// -0 能命中 +0 存的键：SameValueZero 又像 ===（不区分 ±0）。
// 记忆法：SameValueZero = Object.is 的 NaN 规则 + === 的 ±0 规则。
const set = new Set<unknown>([NaN, 0]);
console.log(`11) Set: has(NaN) -> ${set.has(NaN)} , has(-0) -> ${set.has(-0)}`);
