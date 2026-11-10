/**
 * 大纲章节：阶段 1.1 类型系统与类型转换
 * 主题：ToPrimitive 完整算法——@@toPrimitive / valueOf / toString 的调用顺序，以及 hint 从哪来
 * 运行：npx tsx exercises/types-and-coercion/03-to-primitive.ts
 * 预期输出：
 *    @@toPrimitive 被调用，hint = string
 * 1) 模板字符串 `${w}` -> $100
 *    @@toPrimitive 被调用，hint = number
 * 2) w * 1 -> 100
 *    @@toPrimitive 被调用，hint = default
 * 3) w + "" -> default:$100
 *    @@toPrimitive 被调用，hint = number
 * 4) Number(w) = 100
 *    @@toPrimitive 被调用，hint = string
 * 5) String(w) = $100
 * 6) onlyValueOf * 1   -> 42
 * 7) onlyToString * 1  -> 42
 * 8) `${onlyValueOf}`  -> [object Object]
 * 9) `${onlyToString}` -> 42
 * 10) onlyValueOf + "" -> 42
 * 11) [] + {}  -> [object Object]
 * 12) {} + [] (表达式位置) -> [object Object]
 * 13) +[] (语句位置 {} + [] 的真身) -> 0
 * 14) [null] == 0      -> true
 * 15) [undefined] == 0 -> true
 * 16) [[]] == ""       -> true
 * 17) weird * 1 -> NaN
 * 18) 无路可转 -> TypeError
 * 19) epoch * 1 === 0 -> true
 * 20) (epoch + "") === epoch.toString() -> true
 * 21) typeof (epoch + "") -> string
 */

// ToPrimitive(input, hint) 完整算法（依据：ECMA-262 §7.1.1）：
//   1. input 上存在 [Symbol.toPrimitive] 方法 → 直接调用它，把 hint 传进去；
//      返回值必须是原始值，否则 TypeError（不再回落到 valueOf/toString）
//   2. 否则按 hint 决定 valueOf / toString 的尝试顺序：
//      hint "number"  → valueOf → toString
//      hint "string"  → toString → valueOf
//      hint "default" → valueOf → toString（顺序与 number 相同）
//   3. 每个方法返回原始值就采用；返回对象则视为「没答」跳到下一个；全部失败 → TypeError
// hint 从哪来：
//   模板字符串 / String() / JSON 序列化    → "string"
//   算术 * / - %、一元 +、Number()         → "number"
//   二元 +、==、!=                        → "default"
//   特例：Date.prototype[@@toPrimitive]（§21.4.4.45）把 "default" 当 "string" 处理

// ══ 1-5. 用 [Symbol.toPrimitive] 亲眼看到三次调用的 hint ═══════════════
class Wallet {
  balance = 100;
  [Symbol.toPrimitive](hint: string): string | number {
    console.log(`   @@toPrimitive 被调用，hint = ${hint}`);
    if (hint === "number") return this.balance;
    if (hint === "string") return `$${this.balance}`;
    return `default:$${this.balance}`; // hint === "default"
  }
}
const w = new Wallet();

console.log("1) 模板字符串 `${w}` -> " + `${w}`); // 触发 hint = string
console.log(`2) w * 1 -> ${(w as any) * 1}`); // 触发 hint = number
console.log(`3) w + "" -> ${w + ""}`); // 触发 hint = default（二元 + 不敢预设你要拼接还是求和）
console.log(`4) Number(w) = ${Number(w)}`); // 显式 Number() → hint = number
console.log(`5) String(w) = ${String(w)}`); // 显式 String() → hint = string

// ══ 2. 没有 @@toPrimitive 时：valueOf / toString 的顺序由 hint 决定 ════
const onlyValueOf = { valueOf: () => 42 }; // 数字路径的答案
const onlyToString = { toString: () => "42" }; // 字符串路径的答案

console.log(`6) onlyValueOf * 1   -> ${(onlyValueOf as any) * 1}`);
//    hint number：valueOf → 42（原始值，直接用）。
console.log(`7) onlyToString * 1  -> ${(onlyToString as any) * 1}`);
//    hint number：Object.prototype.valueOf 返回对象自身（「没答」，跳过）
//    → toString → "42"（字符串也是原始值，可用）→ ToNumber("42") → 42。
console.log("8) `${onlyValueOf}`  -> " + `${onlyValueOf}`);
//    hint string：toString 优先！普通对象没有自定义 toString
//    → 原型链兜底 Object.prototype.toString → "[object Object]"
//    ⚠️ 同一个对象：* 1 得 42，模板字符串却得 [object Object] —— hint 决定一切。
console.log("9) `${onlyToString}` -> " + `${onlyToString}`);
console.log(`10) onlyValueOf + "" -> ${onlyValueOf + ""}`);
//    hint default（顺序同 number）：valueOf 先答 → 42；二元 + 另一侧是字符串 → ToString(42) 拼接。

// ══ 3. [] + {} 与 {} + []：default hint + 解析器歧义 ═══════════════════
console.log(`11) [] + {}  -> ${([] as any) + {}}`);
console.log(`12) {} + [] (表达式位置) -> ${({} as any) + []}`);
// 推导（表达式位置两者等价）：
//   ToPrimitive([], default) → ""       （valueOf 返回自身 → toString → 空数组 join → ""）
//   ToPrimitive({}, default) → "[object Object]"（同上 → Object.prototype.toString）
//   "" + "[object Object]" → "[object Object]"
// ⚠️ 但语句位置的 `{} + []` 完全是另一回事：行首 {} 被解析成空语句块，
//    实际执行的是 `+[]`（一元加）→ ToNumber([]) → ToPrimitive([] , number) → "" → ToNumber("") → 0。
console.log(`13) +[] (语句位置 {} + [] 的真身) -> ${+[]}`);

// ══ 4. 数组相等三连：都终止于 toString 兜底 ════════════════════════════
console.log(`14) [null] == 0      -> ${([null] as any) == 0}`);
console.log(`15) [undefined] == 0 -> ${([undefined] as any) == 0}`);
console.log(`16) [[]] == ""       -> ${([[]] as any) == ""}`);
// 推导：
//   [null].toString()      → ""（join 把 null/undefined 元素渲染成空串）→ ToNumber("") = 0 → 0 == 0 → true
//   [undefined].toString() → ""（同上）→ 0 == 0 → true
//   [[]].toString()        → ""（内层数组 join 也得 ""）→ "" == ""（两侧同为 String）→ true

// ══ 5. 返回对象 = 没答；全都「没答」= TypeError ════════════════════════
const weird = {
  valueOf: () => ({ tag: "not-primitive" }), // 故意返回对象
  toString: () => "weird",
};
console.log(`17) weird * 1 -> ${(weird as any) * 1}`);
//    hint number：valueOf 返回对象 → 跳过 → toString → "weird" → ToNumber("weird") → NaN。

const hopeless: any = {
  valueOf: () => ({}),
  toString: () => ({}),
};
try {
  console.log(`${hopeless}`); // 不会执行到这
} catch (e) {
  console.log(`18) 无路可转 -> ${(e as Error).constructor.name}`);
}
//    两个方法都返回对象 → ToPrimitive 抛 TypeError("Cannot convert object to primitive value")。

// ══ 6. Date 特例：default hint 被改道成 string ═════════════════════════
const epoch = new Date(0); // 时间戳固定为 0，输出确定性有保障（不打印本地化字符串）
console.log(`19) epoch * 1 === 0 -> ${(epoch as any) * 1 === 0}`);
//    hint number → Date.prototype.valueOf() → 时间戳 0 → 0 * 1 === 0 → true。
console.log(`20) (epoch + "") === epoch.toString() -> ${(epoch + "") === epoch.toString()}`);
console.log(`21) typeof (epoch + "") -> ${typeof (epoch + "")}`);
//    二元 + 对 Date 传的 hint 是 default，但 Date.prototype[@@toPrimitive]（§21.4.4.45）
//    内部把 default 映射为 string —— 于是 Date 在 + / == 中走字符串路径。
//    这是语言中唯一的内置特例（历史决策：让 new Date() + "" 得到可读日期而非时间戳）。
