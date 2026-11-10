/**
 * 大纲章节：阶段 1.1 类型系统与类型转换
 * 主题：原始值与包装对象（boxing）——装箱何时发生、临时对象为何不留痕、typeof/instanceof 的经典坑
 * 运行：npx tsx exercises/types-and-coercion/01-boxing-wrapper.ts
 * 预期输出：
 * 1) "a" === "a" -> true  /  box1 === box2（内容相同）-> false
 * 2) s.length = 5 , s.toUpperCase() = HELLO , typeof s = string
 * 3) 对原始值设属性抛出： TypeError
 * 4) 事后读取 s2.x = undefined
 * 5) "hi".shout() = HI!
 * 6) typeof String("a") = string , typeof new String("a") = object
 * 7) typeof new Number(1) = object
 * 8) boxedNum instanceof Number = true , 1 instanceof Number = false
 * 9) Symbol() instanceof Symbol = false
 * 10) new Number(1) == 1 -> true , === 1 -> false
 * 11) new Number(1) == new Number(1) -> false
 * 12) new String("a") == "a" -> true , === "a" -> false
 * 13) new Boolean(false) 是 truthy
 */

// 核心机制：装箱不是「原始值变成对象」，而是属性访问求值时的一次临时 ToObject 包装
// （依据：ECMA-262 §7.1.20 ToObject；§13.3.2 Property Accessors 的运行时语义）。

// ══ 1. 存储模型对照：原始值按值语义，对象按引用（身份）语义 ══════════════
const box1 = { v: 1 };
const box2 = { v: 1 }; // 与 box1 内容完全相同，但身份不同
console.log(`1) "a" === "a" -> ${"a" === "a"}  /  box1 === box2（内容相同）-> ${box1 === box2}`);
// 原始值不可变且「内容相等即相等」；对象比较的是身份（同一块引用），
// 两个内容一样的新对象也是两个不同的身份。

// ══ 2. boxing 只发生在「属性访问」这一刻 ════════════════════════════════
const s = "hello";
console.log(`2) s.length = ${s.length} , s.toUpperCase() = ${s.toUpperCase()} , typeof s = ${typeof s}`);
// 读取 s.length 时：求值属性访问 → base 是原始值 → ToObject("hello") 创建临时 String 对象
// → 在其原型链上查 length → 语句结束立刻丢弃。s 本身从头到尾都是原始字符串。

// ══ 3-4. 临时对象不留痕：对原始值设属性 ═════════════════════════════════
const s2 = "abc";
try {
  (s2 as any).x = 1; // ESM 默认严格模式：对原始值创建属性失败 → 直接抛 TypeError
  console.log("3) 赋值竟然成功了（不会执行到这）");
} catch (e) {
  console.log(`3) 对原始值设属性抛出： ${(e as Error).constructor.name}`);
}
console.log(`4) 事后读取 s2.x = ${(s2 as any).x}`);
// 即使在非严格模式（脚本、老代码）这句会「静默失败」，事后读取同样是 undefined：
// 赋值发生在那个临时 String 对象上，语句一结束对象就被回收，原始值本身从未改变。
// null/undefined 更进一步：ToObject 对它们直接抛 TypeError（无法装箱），
// 所以 null.x / (undefined).y 是 "Cannot read properties of null/undefined"。

// ══ 5. 给 String.prototype 加方法：所有字符串字面量立刻可见 ══════════════
(String.prototype as any).shout = function (this: string) {
  return this.toUpperCase() + "!";
};
console.log(`5) "hi".shout() = ${("hi" as any).shout()}`);
// 方法查找路径：原始值 "hi" → ToObject 临时对象 → String.prototype → 找到 shout。
// 严格模式函数里的 this 保持原始值（不装箱），调用 toUpperCase 时才再次临时装箱。

// ══ 6. String("a") 与 new String("a") 是两个世界 ═══════════════════════
console.log(`6) typeof String("a") = ${typeof String("a")} , typeof new String("a") = ${typeof new String("a")}`);
// 不带 new：是显式转换函数，返回原始值 string；
// 带 new：是包装对象构造器，返回 Object（这也是「永远别用 new Number/String/Boolean」的原因）。

// ══ 7-9. typeof / instanceof 的坑 ═══════════════════════════════════════
const boxedNum = new Number(1);
console.log(`7) typeof new Number(1) = ${typeof boxedNum}`);
console.log(
  `8) boxedNum instanceof Number = ${boxedNum instanceof Number}` +
    ` , 1 instanceof Number = ${(1 as any) instanceof Number}`,
);
// instanceof 从不装箱：OrdinaryHasInstance（§7.3.21）第一步就检查左侧是否对象，
// 原始值直接返回 false（TS 编译期就会拦：instanceof 左侧必须是对象类型，这里 as any 观察）。
console.log(`9) Symbol() instanceof Symbol = ${(Symbol() as any) instanceof Symbol}`);
// Symbol 是函数但不是构造器（没有 [[Construct]] 内部方法）：
// OrdinaryHasInstance 对非构造器右侧直接返回 false —— 不抛错，就是 false。

// ══ 10-13. 包装对象的相等性 ═════════════════════════════════════════════
console.log(`10) new Number(1) == 1 -> ${boxedNum == 1} , === 1 -> ${boxedNum === 1}`);
// == ：Object vs Number → ToPrimitive(boxedNum, hint number) → valueOf() → 1 → 1 == 1 → true
// ===：类型不同（Object vs Number）→ 直接 false，包装对象在严格相等下永远不等于原始值。
const another = new Number(1);
console.log(`11) new Number(1) == new Number(1) -> ${boxedNum == another}`);
// == 双方都是对象时不做任何转换：退化为严格相等 → 比身份 → false（两个不同的包装对象）。
const boxedStr = new String("a");
console.log(`12) new String("a") == "a" -> ${boxedStr == "a"} , === "a" -> ${boxedStr === "a"}`);
// == ：左侧对象 ToPrimitive（默认 hint）→ toString → "a" → "a" == "a" → true；=== 类型不同 → false。
console.log(`13) new Boolean(false) 是 ${new Boolean(false) ? "truthy" : "falsy"}`);
// ToBoolean 对任何对象都返回 true（依据 §7.1.2 ToBoolean 表格的 Object 行）：
// 包装的是 false 也照样 truthy —— 「对象永远为真」没有例外。
