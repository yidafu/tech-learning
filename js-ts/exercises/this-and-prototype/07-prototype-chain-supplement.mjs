/**
 * 大纲章节：阶段 1.3 原型链的深化补充（笔记 29；基础语义——OrdinaryGet/receiver/class——在笔记 03）
 * 主题：六个笔记 03 未覆盖的深化点——
 *   一、谱系全景：内置对象各自的完整原型链（一路走到 null）
 *   二、.prototype 槽的存在性规则：箭头/async/bound/方法简写没有——它的身份是「实例模板」
 *   三、[[SetPrototypeOf]] 的环检测：setPrototypeOf 拒绝闭环，抛 TypeError 而非静默失败
 *   四、instanceof 完整算法：OrdinaryHasInstance 沿左值原型链找右值的 .prototype；Symbol.hasInstance 可整体接管
 *   五、键的枚举秩序：integer-like 升序 → 字符串按插入序 → symbol；for-in 沿链收集 + 屏蔽规则
 *   六、原型污染攻防：JSON.parse 的 "__proto__" 是自有数据属性（绕过 accessor）；naive merge
 *       如何污染 Object.prototype；Object.freeze 防御（strict 下赋值抛 TypeError）
 * 运行：npx tsx exercises/this-and-prototype/07-prototype-chain-supplement.mjs
 * 类型校验：无（刻意 .mjs）——第二节大量访问 .prototype，而 TS 的静态函数类型视图里
 *   箭头函数根本没有 prototype 成员（访问即 TS2339）；「类型的静态视图 ≠ 运行时槽位」正是该节的教学点
 * 预期输出：见各 console.log 行尾注释
 */

// ============================================================
// 一、谱系全景：任何值的原型链都能一路走到 null
// ============================================================
function chainOf(v) {
  const names = [];
  let p = Object.getPrototypeOf(v);
  while (p !== null) {
    names.push(p.constructor?.name ?? "anonymous");
    p = Object.getPrototypeOf(p);
  }
  names.push("null");
  return names.join(" → ");
}

console.log("1a", chainOf([]));                        // Array → Object → null
console.log("1b", chainOf(function () {}));            // Function → Object → null
console.log("1c", chainOf(() => {}));                  // Function → Object → null —— 箭头也在函数族
class C {}
console.log("1d", chainOf(C));                         // Function → Object → null（类是函数）
console.log("1e", chainOf(new C()));                   // C → Object → null
console.log("1f", chainOf(Object.create(null)));       // null —— 一级都不查，最干净的字典
const bf = (function () {}).bind();
console.log("1g", chainOf(bf));                        // Function → Object → null（bound 的原型取自 target）
console.log("1h", chainOf(Math));                      // Object → null（Math 是单例对象，不是函数）

// ============================================================
// 二、.prototype 槽的存在性：它是「实例模板」，不是「自己的爹」
// ============================================================
// 口诀：函数自己的爹永远在 [[Prototype]]（getPrototypeOf 查）；
//       .prototype 属性是「这个函数 new 出来的孩子的模板」——
//       只有「创建时走了 MakeConstructor」的函数才有这个槽。
const fn = function () {};
console.log("2a", typeof fn.prototype, fn.prototype.constructor === fn); // object true
console.log("2b", (() => {}).prototype);                 // undefined —— 箭头无 [[Construct]]
console.log("2c", (async function () {}).prototype);     // undefined —— async 也没有
console.log("2d", bf.prototype);                         // undefined —— bound 自己不产实例
class C2 { m() {} static s() {} }
console.log("2e", C2.prototype.m.prototype);             // undefined —— 方法简写不是构造器
console.log("2f", C2.s.prototype);                       // undefined —— static 方法同样
function* gen() {}
console.log("2g", typeof gen.prototype);                 // object —— 例外：generator 有槽但不可 new
//   （gen.prototype 是 generator 对象的原型模板；new gen() 直接 TypeError——
//    「有槽」与「可 new」并不完全等价，generator 是唯一的反例）

// ============================================================
// 三、[[SetPrototypeOf]] 的环检测：引擎拒绝闭环
// ============================================================
// 规范：设置原型前先沿「新原型」的链检查 target 是否已在其祖先里——
// 是则返回 false → setPrototypeOf 抛 TypeError（不是静默失败）。
const p = {};
const q = Object.create(p); // 此刻 p 已在 q 的原型链上
try {
  Object.setPrototypeOf(p, q); // 若成功则 p ↔ q 互为祖先：查找会死循环
  console.log("3a", "成功（规范不允许走到这）");
} catch (e) {
  console.log("3a", e.constructor.name); // TypeError
}

// ============================================================
// 四、instanceof 的完整算法：沿链找 .prototype；可被 Symbol.hasInstance 整体接管
// ============================================================
// OrdinaryHasInstance(C, inst)：沿 inst 的 [[Prototype]] 链，逐级比对是否 === C.prototype
console.log("4a", [] instanceof Array, [] instanceof Object); // true true
class Not {}
console.log("4b", [] instanceof Not); // false —— 链上没有 Not.prototype

// Symbol.hasInstance 存在时跳过链查找，语义完全由类自己定义：
class Lens {
  static [Symbol.hasInstance](inst) {
    return inst != null && typeof inst.focus === "function";
  }
}
console.log("4c", { focus() {} } instanceof Lens); // true —— 结构像就算，链无关
console.log("4d", "plain" instanceof Lens);        // false

class NoInst {}
// 直接赋值 NoInst[Symbol.hasInstance] = ... 会抛 TypeError：
// Symbol.hasInstance 是从 Function.prototype 继承的【不可写】data 属性（CreateMethodProperty），
// OrdinarySet 沿链找到「只读 data 属性」时直接失败——比「写不穿原型」更强：连遮蔽都不让建。
// 要覆盖只能 defineProperty（configurable: true，允许替换）或在 class 体里声明 static。
Object.defineProperty(NoInst, Symbol.hasInstance, { value: () => false });
console.log("4e", new NoInst() instanceof NoInst); // false —— 连自己的实例都能拒绝

// ============================================================
// 五、键的枚举秩序：OrdinaryOwnPropertyKeys 的三段顺序 + for-in 的链遍历与屏蔽
// ============================================================
// 规范顺序：① integer-like 键（0…2^32-2）按数值升序 ② 字符串键按创建序 ③ symbol 按创建序
const o = { b: 1, a: 1, 2: 1, [Symbol("s")]: 1, 1: 1 };
console.log("5a", Reflect.ownKeys(o).map(String));  // 1,2,b,a,Symbol(s) —— 三段全含
console.log("5b", Object.keys(o));                  // 1,2,b,a —— 仅可枚举字符串键
console.log("5c", Object.getOwnPropertyNames(o));   // 1,2,b,a —— 全部字符串键（含不可枚举），仍不含 symbol

// for-in 与 Object.keys 的两个本质差异：沿链收集 + 屏蔽规则
function Legacy() { this.a = 1; }
Legacy.prototype.helper = function () {};           // ES5 手挂：可枚举 → for-in 会混入
const li = new Legacy();
console.log("5d", Object.keys(li));                 // ['a'] —— keys 只看自有
const seen = [];
for (const k in li) seen.push(k);
console.log("5e", seen);                            // ['a','helper'] —— for-in 沿链收集可枚举

// 屏蔽规则：原型属性被实例「同名自有属性」遮蔽后（不论自有是否可枚举），for-in 不再收集原型那份
const base = { hidden: "base" };                    // 原型上的可枚举 hidden
const inst = Object.create(base);
Object.defineProperty(inst, "hidden", { value: "own", enumerable: false }); // 不可枚举自有遮蔽
const seen2 = [];
for (const k in inst) seen2.push(k);
console.log("5f", seen2);                           // [] —— hidden 彻底消失（own 挡住了 proto 那份）

// ============================================================
// 六、原型污染攻防：__proto__ 的 accessor 身份决定了攻击面
// ============================================================
// 回扣笔记 03：__proto__ 是 Object.prototype 上的访问器属性。
// JSON.parse 用 CreateDataProperty 建属性 → 绕过 accessor → "__proto__" 成了普通自有数据属性：
console.log("6a", Object.keys(JSON.parse('{"__proto__": 1}'))); // ['__proto__'] —— 没改原型！

// 但 naive merge 用普通赋值 target[k] = ... → 走 accessor → 原型被替换/写入：
function naiveMerge(target, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object") {
      if (!target[k]) target[k] = {};
      naiveMerge(target[k], src[k]); // k === "__proto__" 时 target[k] 读到的是 Object.prototype！
    } else {
      target[k] = src[k];
    }
  }
}
const payload = JSON.parse('{"__proto__": {"polluted": true}}');
naiveMerge({}, payload);
console.log("6b", ({}).polluted); // true —— Object.prototype 被污染，全应用所有对象可见

// 防御一：冻结原型。ESM（严格模式）下对 frozen 对象赋值抛 TypeError：
Object.freeze(Object.prototype);
try {
  naiveMerge({}, JSON.parse('{"__proto__": {"x": 1}}'));
  console.log("6c", "no error, polluted:", ({}).x);
} catch (e) {
  console.log("6c", e.constructor.name, "polluted:", ({}).x); // TypeError undefined —— 污染被拦下
}
// 防御二：merge 里显式拒绝 __proto__/constructor/prototype 键，或改用 Map / null-proto 对象承接用户输入
