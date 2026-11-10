/**
 * 大纲章节：阶段 1.3 this 与原型链
 * 主题：原型链查找（OrdinaryGet/OrdinarySet）——遮蔽、写不穿原型、活的原型、三角关系、getter 的 receiver、Object.create(null)
 * 运行：npx tsx exercises/this-and-prototype/04-prototype-chain.ts
 * 预期输出：
 * [链] Object.getPrototypeOf(leaf) === mid: true
 * [链] Object.getPrototypeOf(mid) === base: true
 * [链] Object.getPrototypeOf(base) === Object.prototype: true
 * [链终点] Object.getPrototypeOf(Object.prototype) === null: true
 * [沿链取值] leaf.type: base
 * [遮蔽] leaf.type: leaf-own, base.type: base
 * [遮蔽] Object.hasOwn(leaf, "type"): true, Object.hasOwn(mid, "type"): false
 * [删遮蔽] delete 后 leaf.type: base
 * [改原型前] widgetA.type: widget
 * [改原型后] widgetA.type: gadget
 * [后加方法] widgetA.late(): late-added
 * [写不穿] widgetA.type: own, proto.type: gadget
 * [三角] inst 的 [[Prototype]] === Klass.prototype: true
 * [三角] inst.__proto__ === Klass.prototype: true
 * [三角] Klass.prototype.constructor === Klass: true
 * [三角] Klass 的 [[Prototype]] === Function.prototype: true
 * [三角] typeof Function.prototype: function（原型链上函数的终点，自己也是函数）
 * [__proto__ 本质] Object.prototype 上的访问器: get=function, set=function
 * [instanceof] dog instanceof Dog: true, dog instanceof Animal: true
 * [isPrototypeOf] Dog.prototype.isPrototypeOf(dog): true, Animal.prototype.isPrototypeOf(dog): true
 * [等价] (dog instanceof Dog) === (Dog.prototype.isPrototypeOf(dog)): true
 * [getter receiver] sub.name: <unset>
 * [setter receiver] Object.hasOwn(sub, "label"): true, Object.hasOwn(store, "label"): false
 * [setter receiver] sub.name: sub-label, store.label: <unset>
 * [getter 所在] Object.hasOwn(store, "name"): true, Object.hasOwn(sub, "name"): false
 * [null 原型] Object.getPrototypeOf(dict) === null: true
 * [null 原型] Object.hasOwn(dict, "key"): true
 * [null 原型] dict.toString() 抛 TypeError: true
 * [null 原型] 对照 "toString" in {}: true
 */
"use strict";
export {};

/* ============ ① 三层链 + 终点 null ============ */
// 依据：ECMA-262 OrdinaryGet —— 自有属性找不到时，沿 [[Prototype]] 递归查找，直到 null 返回 undefined
const base = { type: "base" };
const mid = Object.create(base);
const leaf = Object.create(mid);
console.log(`[链] Object.getPrototypeOf(leaf) === mid: ${Object.getPrototypeOf(leaf) === mid}`);
console.log(`[链] Object.getPrototypeOf(mid) === base: ${Object.getPrototypeOf(mid) === base}`);
console.log(`[链] Object.getPrototypeOf(base) === Object.prototype: ${Object.getPrototypeOf(base) === Object.prototype}`);
console.log(`[链终点] Object.getPrototypeOf(Object.prototype) === null: ${Object.getPrototypeOf(Object.prototype) === null}`);
console.log(`[沿链取值] leaf.type: ${leaf.type}`); // leaf、mid 都没有 → 一路查到 base 才命中

/* ============ ② 自有属性遮蔽（shadowing）；写操作不穿原型 ============ */
// 依据：OrdinarySet —— 沿链找到的如果是「数据属性」，不在原型上改，
// 而是在接收者（leaf）上创建自有属性 → 遮蔽，而不是改写
leaf.type = "leaf-own";
console.log(`[遮蔽] leaf.type: ${leaf.type}, base.type: ${base.type}`);
console.log(`[遮蔽] Object.hasOwn(leaf, "type"): ${Object.hasOwn(leaf, "type")}, Object.hasOwn(mid, "type"): ${Object.hasOwn(mid, "type")}`);
delete leaf.type; // 删掉的是 leaf 自己那份遮蔽
console.log(`[删遮蔽] delete 后 leaf.type: ${leaf.type}`); // 原型上的 base 又露出来了

/* ============ ③ 原型是「活」的：事后修改/新增对所有实例立即生效 ============ */
interface WidgetProto {
  type: string;
  late?(): string;
}
const proto: WidgetProto = { type: "widget" };
const widgetA = Object.create(proto); // 先建实例
console.log(`[改原型前] widgetA.type: ${widgetA.type}`);
proto.type = "gadget"; // 后改原型上的属性值
proto.late = (): string => "late-added"; // 后加方法
console.log(`[改原型后] widgetA.type: ${widgetA.type}`);
console.log(`[后加方法] widgetA.late(): ${widgetA.late()}`);
widgetA.type = "own"; // 写：落在实例自己身上
console.log(`[写不穿] widgetA.type: ${widgetA.type}, proto.type: ${proto.type}`);

/* ============ ④ prototype / __proto__ / constructor 三角关系 ============ */
// inst ──[[Prototype]]──> Klass.prototype ──constructor──> Klass
// Klass 本身也是对象：Klass 的 [[Prototype]] 是 Function.prototype（它是个函数！）
class Klass {}
const inst = new Klass();
const instLegacy = inst as unknown as { __proto__: object | null }; // __proto__ 是 Annex B 遗留访问器，新 lib 不再声明
console.log(`[三角] inst 的 [[Prototype]] === Klass.prototype: ${Object.getPrototypeOf(inst) === Klass.prototype}`);
console.log(`[三角] inst.__proto__ === Klass.prototype: ${instLegacy.__proto__ === Klass.prototype}`);
console.log(`[三角] Klass.prototype.constructor === Klass: ${Klass.prototype.constructor === Klass}`);
console.log(`[三角] Klass 的 [[Prototype]] === Function.prototype: ${Object.getPrototypeOf(Klass) === Function.prototype}`);
console.log(`[三角] typeof Function.prototype: ${typeof Function.prototype}（原型链上函数的终点，自己也是函数）`);

// __proto__ 不是内部槽的「本体」，而是 Object.prototype 上的一个访问器属性（Annex B 遗留）
const protoDesc = Object.getOwnPropertyDescriptor(Object.prototype, "__proto__");
console.log(`[__proto__ 本质] Object.prototype 上的访问器: get=${typeof protoDesc?.get}, set=${typeof protoDesc?.set}`);

/* ============ ⑤ instanceof 与 isPrototypeOf 的等价性 ============ */
// a instanceof B ⟺ B.prototype 沿 a 的 [[Prototype]] 链上存在（OrdinaryHasInstance 的定义）
class Animal {}
class Dog extends Animal {}
const dog = new Dog();
console.log(`[instanceof] dog instanceof Dog: ${dog instanceof Dog}, dog instanceof Animal: ${dog instanceof Animal}`);
console.log(`[isPrototypeOf] Dog.prototype.isPrototypeOf(dog): ${Dog.prototype.isPrototypeOf(dog)}, Animal.prototype.isPrototypeOf(dog): ${Animal.prototype.isPrototypeOf(dog)}`);
console.log(`[等价] (dog instanceof Dog) === (Dog.prototype.isPrototypeOf(dog)): ${(dog instanceof Dog) === (Dog.prototype.isPrototypeOf(dog))}`);

/* ============ ⑥ getter/setter 里的 this 是「接收者 receiver」 ============ */
// 依据：OrdinaryGet —— 沿链递归时 Receiver 参数原样下传；
// 在原型上命中 accessor 时执行 Call(getter, Receiver)：getter 定义在 store，this 却是 sub！
interface NameStore {
  label?: string;
}
const store: NameStore & { get name(): string; set name(v: string) } = {
  get name(): string {
    return this.label ?? "<unset>";
  },
  set name(v: string) {
    this.label = v; // 写的也是 receiver（sub），不是 store
  },
};
const sub = Object.create(store);
console.log(`[getter receiver] sub.name: ${sub.name}`); // sub 没有 label → "<unset>"，读取发生在 sub 上
sub.name = "sub-label"; // 触发的是 store 上的 setter，但 this 是 sub
console.log(`[setter receiver] Object.hasOwn(sub, "label"): ${Object.hasOwn(sub, "label")}, Object.hasOwn(store, "label"): ${Object.hasOwn(store, "label")}`);
console.log(`[setter receiver] sub.name: ${sub.name}, store.label: ${store.label ?? "<unset>"}`);
console.log(`[getter 所在] Object.hasOwn(store, "name"): ${Object.hasOwn(store, "name")}, Object.hasOwn(sub, "name"): ${Object.hasOwn(sub, "name")}`);

/* ============ ⑦ Object.create(null)：没有原型的「字典对象」 ============ */
const dict = Object.create(null);
dict.key = "v";
console.log(`[null 原型] Object.getPrototypeOf(dict) === null: ${Object.getPrototypeOf(dict) === null}`);
console.log(`[null 原型] Object.hasOwn(dict, "key"): ${Object.hasOwn(dict, "key")}`);
try {
  dict.toString(); // 链是空的，连 Object.prototype 的方法都找不到
} catch (e) {
  console.log(`[null 原型] dict.toString() 抛 TypeError: ${e instanceof TypeError}`);
}
console.log(`[null 原型] 对照 "toString" in {}: ${"toString" in {}}`);
