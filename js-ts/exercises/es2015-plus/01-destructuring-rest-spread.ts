/**
 * 大纲章节：阶段 1.5 ES2015+ 关键特性
 * 主题：解构默认值求值时机 / 参数默认值作用域经典题 / 展开语义（自有可枚举 + 书写顺序）/ rest vs arguments
 * 运行：npx tsx exercises/es2015-plus/01-destructuring-rest-spread.ts
 * 预期输出：
 * --- 1. 解构默认值：只在匹配到 undefined 时求值（null 不触发）---
 * a=A b=null c=实际值
 * 默认值求值记录: a
 * --- 2. 重命名 + 默认值组合：{ key: alias = default } ---
 * timeout=1000 retries=3
 * --- 3. 解构失败的形式：数组解构要求可迭代；对象解构要求可强制为对象 ---
 * 'abc'.length = 3（原始值被装箱，对象解构成功）
 * 数组解构 number → TypeError 捕获（GetIterator 失败，非可迭代）
 * 对象解构 null → TypeError 捕获（RequireObjectCoercible 失败）
 * --- 4. 参数默认值的作用域：参数环境 vs 函数体环境 ----------
 * notTDZ() → y=outer-x，inner x=inner-x（默认值在参数环境求值，看不到函数体环境的 let x，查到外层）
 * forwardRef() 抛错捕获：默认值 b 引用「后面才声明的参数」→ 参数从左到右初始化 → TDZ ReferenceError
 * forwardRef(10) → a=10（不触发默认值 → 不求 b → 不抛错）
 * --- 5. 数组展开消费 [Symbol.iterator]：自定义可迭代对象可被展开 ---
 * [...range] = 1,2,3,4
 * Math.max(...range) = 4
 * --- 6. 对象展开：覆盖顺序 = 书写顺序；只复制自有可枚举属性 ---
 * merged = {"a":99,"b":2,"c":3}
 * copied = {"own":"own-value"}
 * 'inherited' in copied = false（只复制自有属性，原型上的访问器不触发）
 * 源对象自有 getter 被调用（CopyDataProperties 用 Get 读取源属性值）
 * v = 7
 * Object.assign 触发了 target 的 setter（[[Set]] 赋值语义，会走目标的 setter）
 * {...target}.name 的描述符有 set 访问器 = false（展开走 CreateDataProperty，定义新数据属性）
 * --- 7. rest 参数 vs arguments ---
 * arguments.length = 2，arguments[0] = A0
 * 改 a = CHANGED 后，arguments[0] = A0（ESM/strict 模式下两者不联动）
 * a = A，rest = 1,2,3，Array.isArray(rest) = true
 * 箭头函数没有自己的 arguments：outer('o1').length = 1（取到的是外层函数的）
 */

// ---------- 1. 解构默认值：只在匹配 undefined 时求值 ----------
// 依据 ECMA-262 解构运行时语义：取到值后判断是否 undefined，
// 是 → 求默认值表达式；null 是一个合法值，原样保留，不触发默认值。
const evalLog: string[] = [];
function makeDefault(tag: string, val: string): string {
  evalLog.push(tag);
  return val;
}

const src = { a: undefined, b: null, c: '实际值' };
const { a = makeDefault('a', 'A') } = src; // a 是 undefined → 默认值表达式被求值
const { b = makeDefault('b', 'B') } = src; // b 是 null → 默认值不求值，b 保持 null
const { c = makeDefault('c', 'C') } = src; // c 有值 → 不求值
console.log('--- 1. 解构默认值：只在匹配到 undefined 时求值（null 不触发）---');
console.log(`a=${a} b=${b} c=${c}`);
console.log(`默认值求值记录: ${evalLog.join(',')}`);

// ---------- 2. 重命名 + 默认值组合 ----------
// 模式匹配发生在 key 上，绑定到 alias；默认值在 key 匹配到 undefined 时生效
const config = { timeout: undefined, retries: 3 };
const { timeout: t = 1000, retries: r = 5 } = config;
console.log('--- 2. 重命名 + 默认值组合：{ key: alias = default } ---');
console.log(`timeout=${t} retries=${r}`);

// ---------- 3. 解构失败的形式 ----------
// 数组解构（IteratorDestructuringAssignmentEvaluation）：先 GetIterator(value)，非可迭代 → TypeError
// 对象解构：先 RequireObjectCoercible(value)，null/undefined → TypeError；
//           其他原始值会被「装箱」成包装对象再走属性查找（不是迭代）
console.log('--- 3. 解构失败的形式：数组解构要求可迭代；对象解构要求可强制为对象 ---');
const { length: strLen } = 'abc'; // 原始值装箱成功：'abc' → String 包装对象 → length = 3（重命名避开 DOM 全局 length）
console.log(`'abc'.length = ${strLen}（原始值被装箱，对象解构成功）`);

const notIterable = 123 as unknown as Array<number>; // 运行时是 number，没有 [Symbol.iterator]
try {
  const [x1] = notIterable;
  console.log(x1);
} catch {
  console.log('数组解构 number → TypeError 捕获（GetIterator 失败，非可迭代）');
}

const nullish = null as unknown as { x: number };
try {
  const { x } = nullish;
  console.log(x);
} catch {
  console.log('对象解构 null → TypeError 捕获（RequireObjectCoercible 失败）');
}

// ---------- 4. 参数默认值的作用域：两层环境，别背错结论 ----------
// 关键原理（ECMA-262 FunctionDeclarationInstantiation）：一旦有参数默认值，
// 引擎会创建「参数环境」和「函数体环境」两层环境。默认值表达式在【参数环境】求值，
// 参数环境的 outer 是函数【定义处】的外层作用域 —— 函数体里的 let/const 在更内层的
// body 环境中，默认值表达式根本看不到它。所以下面的 notTDZ 不会抛错（反直觉！）。
let x = 'outer-x';
function notTDZ(y = x) {
  let x = 'inner-x'; // 在函数体环境中；不影响默认值里的 x 查找
  return `y=${y}，inner x=${x}`;
}
console.log('--- 4. 参数默认值的作用域：参数环境 vs 函数体环境 ----------');
console.log(`notTDZ() → ${notTDZ()}（默认值在参数环境求值，看不到函数体环境的 let x，查到外层）`);

// 真正抛 TDZ 的经典题：默认值引用「后面的参数」——参数从左到右初始化，
// a 求值时 b 尚未初始化（参数环境里 b 已声明但在 TDZ）。
// 注：TS 静态检查比 JS 更严格，直接禁止这种前向引用（TS2373），
// 这里显式压制以演示「运行时」的真实行为。
// @ts-expect-error TS2373: Parameter 'a' cannot reference identifier 'b' declared after it
function forwardRef(a = b, b = 2): string {
  return `a=${a}`;
}
try {
  forwardRef();
} catch {
  console.log('forwardRef() 抛错捕获：默认值 b 引用「后面才声明的参数」→ 参数从左到右初始化 → TDZ ReferenceError');
}
console.log(`forwardRef(10) → ${forwardRef(10)}（不触发默认值 → 不求 b → 不抛错）`);

// ---------- 5. 数组展开消费 [Symbol.iterator] ----------
// 展开语法调用 GetIterator：任何实现迭代器协议的对象都能被展开
const range = {
  from: 1,
  to: 4,
  [Symbol.iterator]() {
    let cur = this.from;
    const last = this.to;
    return {
      next: (): IteratorResult<number> =>
        cur <= last ? { value: cur++, done: false } : { value: undefined, done: true },
    };
  },
};
console.log('--- 5. 数组展开消费 [Symbol.iterator]：自定义可迭代对象可被展开 ---');
console.log(`[...range] = ${[...range].join(',')}`);
console.log(`Math.max(...range) = ${Math.max(...range)}`);

// ---------- 6. 对象展开：自有可枚举 + 书写顺序 + 属性写入语义 ----------
// 覆盖顺序 = 书写顺序：后面的覆盖前面的
const order = { a: 1, b: 2 };
const merged = { ...order, a: 99, c: 3 }; // 字面量里书写的 a=99 覆盖展开进来的 a=1
console.log('--- 6. 对象展开：覆盖顺序 = 书写顺序；只复制自有可枚举属性 ---');
console.log(`merged = ${JSON.stringify(merged)}`);

// 只复制「自有可枚举」属性：原型链上的属性（包括访问器）完全不被触碰
const proto = {
  get inherited(): string {
    return 'proto-value';
  },
};
const child = Object.create(proto);
child.own = 'own-value';
const copied = { ...child };
console.log(`copied = ${JSON.stringify(copied)}`);
console.log(`'inherited' in copied = ${'inherited' in copied}（只复制自有属性，原型上的访问器不触发）`);

// 源侧：CopyDataProperties 用 Get(source, key) 读每个属性 → 源对象的自有 getter 会被调用
const withGetter = {
  get v(): number {
    console.log('源对象自有 getter 被调用（CopyDataProperties 用 Get 读取源属性值）');
    return 7;
  },
};
const spreadCopy = { ...withGetter };
console.log(`v = ${spreadCopy.v}`);

// 目标侧：展开用 CreateDataProperty 在「新建对象」上定义数据属性（不走 [[Set]] 赋值）；
// Object.assign 用 [[Set]] 赋值 → 会触发目标对象（及其原型链）上的 setter。
const setterLog: string[] = [];
const assignTarget = {
  _name: '',
  get name(): string {
    return this._name;
  },
  set name(v: string) {
    setterLog.push('Object.assign 触发了 target 的 setter（[[Set]] 赋值语义，会走目标的 setter）');
    this._name = v;
  },
};
Object.assign(assignTarget, { name: 'assigned' });
console.log(setterLog[0]);
const reSpread = { ...assignTarget }; // 读取 assignTarget.name 触发源侧 getter，写入新对象走定义
const desc = Object.getOwnPropertyDescriptor(reSpread, 'name')!;
console.log(`{...target}.name 的描述符有 set 访问器 = ${'set' in desc}（展开走 CreateDataProperty，定义新数据属性）`);

// ---------- 7. rest 参数 vs arguments ----------
// arguments：类数组（有 length/索引，无数组方法）、包含「全部」实参、
//            仅普通函数有；ESM（strict）下与具名参数不再联动
function argumentsDemo(a: string, b: string): void {
  const args = arguments;
  console.log(`arguments.length = ${args.length}，arguments[0] = ${args[0]}`);
  a = 'CHANGED';
  console.log(`改 a = CHANGED 后，arguments[0] = ${args[0]}（ESM/strict 模式下两者不联动）`);
}
console.log('--- 7. rest 参数 vs arguments ---');
argumentsDemo('A0', 'B0');

// rest：真数组、只收「多余」实参、箭头函数也能用
function restDemo(a: string, ...rest: number[]): void {
  console.log(`a = ${a}，rest = ${rest.join(',')}，Array.isArray(rest) = ${Array.isArray(rest)}`);
}
restDemo('A', 1, 2, 3);

// 箭头函数没有自己的 arguments，词法解析到外层函数的 arguments
function outer(_marker: string): IArguments {
  const innerArrow = (): IArguments => arguments;
  return innerArrow();
}
console.log(`箭头函数没有自己的 arguments：outer('o1').length = ${outer('o1').length}（取到的是外层函数的）`);
