/**
 * 大纲章节：阶段 1.1 类型系统与类型转换
 * 主题：Symbol——唯一性、Symbol.for 全局注册表、well-known symbols 各自挂在哪个内部算法上
 * 运行：npx tsx exercises/types-and-coercion/04-symbol-wellknown.ts
 * 预期输出：
 * 1) Symbol("id") === Symbol("id") -> false
 * 2) s1.description -> id
 * 3) String(s1) -> Symbol(id)
 * 4) s1 + "" 抛出 -> TypeError
 * 5) Symbol.for("app.key") === Symbol.for("app.key") -> true
 * 6) Symbol.keyFor(g1) -> app.key , Symbol.keyFor(s1) -> undefined
 * 7) Object.prototype.toString.call(tagged) -> [object MyVector]
 * 8) Object.prototype.toString.call([]) -> [object Array]
 * 9) call(null) / call(undefined) -> [object Null] / [object Undefined]
 * 10) 1 instanceof Positive -> true , -1 -> false , "1" -> false
 * 11) Function.prototype 的 @@hasInstance: writable = false , configurable = false
 * 12) prim * 1 -> 7 , Number(prim) -> 7
 *     `${prim}` -> seven
 * 13) [...counter] -> [ 0, 1, 2 ]
 * 14) for await 拿到 0
 * 14) for await 拿到 1
 * 15) species 默认: mapped instanceof MyArray -> true
 * 16) species 改写: m2 instanceof PlainSpeciesArray -> false , instanceof Array -> true
 */

// Symbol 是第 7 种原始类型（ES2015 加入）：值唯一、可作属性键、不会与其他键冲突。
// well-known symbols（§6.1.5.1 Well-Known Symbols 表）是语言内置的一组「协议钩子」：
// 语言算法在特定时机用 GetMethod 查询它们，查到就走用户自定义逻辑。

// ══ 1-4. 唯一性与描述符：Symbol 是「带名字的匿名值」════════════════════
const s1 = Symbol("id");
const s2 = Symbol("id");
// 注：TS 给每个 Symbol() 调用推断出互不重叠的 unique symbol 类型，比较会报 TS2367，
// 断言成 symbol 基类型后只观察运行时语义。
console.log(`1) Symbol("id") === Symbol("id") -> ${(s1 as symbol) === (s2 as symbol)}`);
// description 只是调试信息，不参与相等性：每次调用 Symbol() 都产生全新的唯一值。
console.log(`2) s1.description -> ${s1.description}`);
console.log(`3) String(s1) -> ${String(s1)}`);
try {
  console.log(`${("" as any) + (s1 as any)}`); // 不会执行到这
} catch (e) {
  console.log(`4) s1 + "" 抛出 -> ${(e as Error).constructor.name}`);
}
// Symbol 是唯一禁止「隐式转字符串」的类型：String(s1) 显式转换可以，
// s1 + "" / `${s1}` 抛 TypeError —— 防止 symbol 意外变成 string 后悄悄失去唯一性。

// ══ 5-6. Symbol.for：全局注册表按 key 复用 ════════════════════════════
const g1 = Symbol.for("app.key");
const g2 = Symbol.for("app.key");
console.log(`5) Symbol.for("app.key") === Symbol.for("app.key") -> ${(g1 as symbol) === (g2 as symbol)}`);
console.log(`6) Symbol.keyFor(g1) -> ${Symbol.keyFor(g1)} , Symbol.keyFor(s1) -> ${Symbol.keyFor(s1)}`);
// Symbol.for(key) 查全局注册表（GlobalSymbolRegistry），命中即复用；
// Symbol.keyFor 反查 key，未注册的（如 s1）返回 undefined。

// ══ 7-9. Symbol.toStringTag：Object.prototype.toString 的分类钩子 ══════
const tagged = { [Symbol.toStringTag]: "MyVector" };
console.log(`7) Object.prototype.toString.call(tagged) -> ${Object.prototype.toString.call(tagged)}`);
console.log(`8) Object.prototype.toString.call([]) -> ${Object.prototype.toString.call([])}`);
console.log(
  `9) call(null) / call(undefined) -> ${Object.prototype.toString.call(null)}` +
    ` / ${Object.prototype.toString.call(undefined)}`,
);
// Object.prototype.toString 的算法先按语言类型分拣：null/undefined 有专门分支（不走 ToObject）；
// 对象才查自身/原型链上的 @@toStringTag（数组等内置对象在更早的数组/函数分支被识别）。

// ══ 10-11. Symbol.hasInstance：改写 instanceof 的右侧行为 ══════════════
// instanceof 表达式求值（§13.10.2 InstanceofOperator）第一步：
//   GetMethod(右侧构造器, @@hasInstance) —— 查到就用它，否则才走 OrdinaryHasInstance（§7.3.21）。
class Positive {
  static [Symbol.hasInstance](candidate: unknown): boolean {
    return typeof candidate === "number" && candidate > 0;
  }
}
console.log(
  `10) 1 instanceof Positive -> ${(1 as any) instanceof Positive}` +
    ` , -1 -> ${(-1 as any) instanceof Positive}` +
    ` , "1" -> ${("1" as any) instanceof Positive}`,
);
const desc = Object.getOwnPropertyDescriptor(Function.prototype, Symbol.hasInstance);
console.log(
  `11) Function.prototype 的 @@hasInstance: writable = ${desc?.writable} , configurable = ${desc?.configurable}`,
);
// 内置的 Function.prototype[Symbol.hasInstance]（默认入口，内部走 OrdinaryHasInstance）
// 不可写不可配置 —— 想改写只能像 Positive 一样在自己的构造器上定义同名静态方法（遮蔽继承来的）。

// ══ 12. Symbol.toPrimitive：ToPrimitive 的第一优先级 ═══════════════════
const prim = {
  [Symbol.toPrimitive](hint: string): string | number {
    return hint === "number" ? 7 : "seven";
  },
  valueOf() {
    return 99; // 永远不会被问到：@@toPrimitive 存在时 ToPrimitive 第一步就短路
  },
  toString() {
    return "ignored";
  },
};
console.log(`12) prim * 1 -> ${(prim as any) * 1} , Number(prim) -> ${Number(prim)}`);
console.log("    `${prim}` -> " + `${prim}`);

// ══ 13. Symbol.iterator：展开 / for...of / 解构都在查它 ════════════════
// GetIterator（§7.4.4）：以同步模式查询对象的 @@iterator 方法。
const counter = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: (): { value: number; done: boolean } =>
        i < 3 ? { value: i++, done: false } : { value: 3, done: true },
    };
  },
};
console.log("13) [...counter] ->", [...counter]);

// ══ 14. Symbol.asyncIterator：只有 for await...of 会查它 ═══════════════
const asyncCounter = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: async (): Promise<{ value: number; done: boolean }> =>
        i < 2 ? { value: i++, done: false } : { value: -1, done: true },
    };
  },
};
for await (const v of asyncCounter) {
  console.log(`14) for await 拿到 ${v}`);
}

// ══ 15-16. Symbol.species：派生新对象时「用哪个构造器」由它决定 ════════
// Array.prototype.map 内部走 ArraySpeciesCreate → SpeciesConstructor（§7.3.22）
// → 读构造器的 @@species，默认等于构造器自身。
class MyArray extends Array<number> {}
const mapped = MyArray.from([1, 2]).map((x) => x * 2);
console.log(`15) species 默认: mapped instanceof MyArray -> ${mapped instanceof MyArray}`);

class PlainSpeciesArray extends Array<number> {}
// 等价于 `static get [Symbol.species]() { return Array; }`：
// 直接写成 getter 会与 lib 中 ArrayConstructor 的 readonly @@species 声明冲突（TS2611），
// 用 Object.defineProperty 在运行时等价地挂上 getter。
Object.defineProperty(PlainSpeciesArray, Symbol.species, {
  get: () => Array,
  configurable: true,
});
const m2 = PlainSpeciesArray.from([1, 2]).map((x) => x * 2);
console.log(
  `16) species 改写: m2 instanceof PlainSpeciesArray -> ${m2 instanceof PlainSpeciesArray}` +
    ` , instanceof Array -> ${m2 instanceof Array}`,
);
// @@species 改成 Array 后，map 产物不再污染子类语义 —— 这正是 Vue/Redux 等库
// 需要控制派生对象类型时的同一机制。

export {}; // 空导出：让本文件成为 ESM 模块，顶层 for await 才合法（TS1431）

