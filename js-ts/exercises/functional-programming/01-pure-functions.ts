/**
 * 大纲章节：阶段 5 专题深入 —— 函数式编程（纯函数与引用透明）
 * 主题：纯函数对照实验、memoize 实现要点、引用透明的手动等价替换
 * 运行：npx tsx exercises/functional-programming/01-pure-functions.ts
 * 预期输出：
 * --- 1) 纯 vs 不纯：同样入参，输出是否稳定 ---
 * impurePrice(100) 第 1 次: 89
 * impurePrice(100) 第 2 次: 88
 * impurePrice(100) 第 3 次: 87
 * purePrice(100, 0.1) 第 1 次: 90
 * purePrice(100, 0.1) 第 2 次: 90
 * --- 2) memoize：只有纯函数才能安全缓存 ---
 * 第一次 memoFib(20)：未命中，真实计算
 * fib(20) = 6765，heavy 真实执行 1 次
 * 第二次 memoFib(20)：命中缓存，函数体不执行
 * fib(20) = 6765，heavy 真实执行 1 次
 * --- 3) 参数序列化的限制：默认 key 的碰撞与丢失 ---
 * key1 = {"a":1,"b":2}
 * key2 = {"b":2,"a":1}
 * 内容等价的两个对象，序列化 key 不同: true
 * key3 = {"b":null}
 * undefined 属性直接消失，null 保留: true
 * JSON.stringify([NaN]) = [null]
 * NaN 与 null 序列化成同一个 key（假命中风险）: true
 * --- 4) 引用透明：等价替换后程序行为不变 ---
 * 纯函数版: double(21) + double(21) = 84
 * 替换后:   42 + 42 = 84
 * 替换安全: true
 * 不纯函数版: impureDouble(21) + impureDouble(21) = 84
 * 副作用计数 calls = 2（若替换成 42 + 42，calls 会变成 0）
 * 替换安全: false（数值相同，但副作用次数从 2 变成 0，程序行为改变了）
 */

// ---------------------------------------------------------------------------
// 1) 纯函数 vs 不纯函数：对照实验
//    纯函数两个判据：① 相同输入永远得到相同输出；② 不产生可观察的副作用。
// ---------------------------------------------------------------------------

/** 外部可变状态：折扣率。模块内任何代码都能改它。 */
let discountRate = 0.1;

/**
 * 不纯函数：读取并【修改】外部状态 discountRate。
 * 同样传 100，每次调用结果都不同 —— 无法通过「只看输入」预测输出。
 */
function impurePrice(base: number): number {
  discountRate += 0.01; // 副作用：修改外部状态
  return Math.round(base * (1 - discountRate));
}

/**
 * 纯函数：折扣率通过参数传入，依赖全部显式出现在签名里。
 * 同样的 (base, rate) 永远得到同一个数。
 */
function purePrice(base: number, rate: number): number {
  return Math.round(base * (1 - rate));
}

console.log('--- 1) 纯 vs 不纯：同样入参，输出是否稳定 ---');
for (let i = 1; i <= 3; i++) {
  console.log(`impurePrice(100) 第 ${i} 次: ${impurePrice(100)}`);
}
console.log(`purePrice(100, 0.1) 第 1 次: ${purePrice(100, 0.1)}`);
console.log(`purePrice(100, 0.1) 第 2 次: ${purePrice(100, 0.1)}`);

// ---------------------------------------------------------------------------
// 2) memoize：纯函数 → 可缓存性
//    缓存意味着「第二次不再执行函数体」：
//    - 纯函数：结果只依赖输入，缓存安全且收益确定；
//    - 不纯函数：缓存会吞掉副作用（少发一次请求/少打一次日志），行为改变。
// ---------------------------------------------------------------------------

/** 昂贵的朴素递归（不带计数，递归内部不重复计数）。 */
function slowFib(n: number): number {
  if (n <= 1) return n;
  return slowFib(n - 1) + slowFib(n - 2);
}

let heavyRuns = 0;
/** 经过包装的「重计算」：只统计透过 memoize 的顶层调用次数。 */
function heavyFib(n: number): number {
  heavyRuns += 1;
  return slowFib(n);
}

type KeyFn = (args: readonly unknown[]) => string;

/**
 * memoize 实现要点：
 * a) 用 Map 做缓存：key 不限于字符串字面量，也没有原型链污染问题；
 * b) key 必须由 keyFn 序列化生成 —— Map 的 key 用 SameValueZero 比较，
 *    对象参数每次调用都是新引用，直接拿 args 当 key 永远命中不了；
 * c) 只能 memoize 纯函数（理由见上）。
 */
function memoize<A extends readonly unknown[], R>(
  fn: (...args: A) => R,
  keyFn: KeyFn,
): (...args: A) => R {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = keyFn(args);
    if (cache.has(key)) {
      console.log('第二次 memoFib(20)：命中缓存，函数体不执行');
      // has 检查后 get 的类型仍是 R | undefined（Map 的两个方法类型不联动），需断言
      return cache.get(key) as R;
    }
    console.log('第一次 memoFib(20)：未命中，真实计算');
    const value = fn(...args);
    cache.set(key, value);
    return value;
  };
}

const memoFib = memoize(
  (n: number) => heavyFib(n),
  (args) => `fib(${String(args[0])})`,
);

console.log('--- 2) memoize：只有纯函数才能安全缓存 ---');
const r1 = memoFib(20);
console.log(`fib(20) = ${r1}，heavy 真实执行 ${heavyRuns} 次`);
const r2 = memoFib(20);
console.log(`fib(20) = ${r2}，heavy 真实执行 ${heavyRuns} 次`);

// ---------------------------------------------------------------------------
// 3) 参数序列化的限制（memoize 的 key 陷阱）
//    默认 keyFn 常用 JSON.stringify(args)，三个坑：
//    i.   对象属性顺序不同 → 内容等价但 key 不同（假未命中，缓存白做）；
//    ii.  undefined / 函数 / Symbol 属性会被丢弃（信息丢失）；
//    iii. NaN / Infinity 序列化成 null（不同参数碰撞出同一个 key，假命中，直接算错）。
//    对策：自定义 keyFn —— 取业务主键（如 userId），或先按 key 排序再序列化。
// ---------------------------------------------------------------------------

console.log('--- 3) 参数序列化的限制：默认 key 的碰撞与丢失 ---');
const key1 = JSON.stringify({ a: 1, b: 2 });
const key2 = JSON.stringify({ b: 2, a: 1 });
console.log(`key1 = ${key1}`);
console.log(`key2 = ${key2}`);
console.log(`内容等价的两个对象，序列化 key 不同: ${key1 !== key2}`);
const key3 = JSON.stringify({ a: undefined, b: null });
console.log(`key3 = ${key3}`);
console.log(`undefined 属性直接消失，null 保留: ${key3 === '{"b":null}'}`);
const keyNaN = JSON.stringify([NaN]);
console.log(`JSON.stringify([NaN]) = ${keyNaN}`);
console.log(`NaN 与 null 序列化成同一个 key（假命中风险）: ${keyNaN === JSON.stringify([null])}`);

// ---------------------------------------------------------------------------
// 4) 引用透明（referential transparency）的手动等价替换
//    定义：表达式可以替换成它的值，而程序行为不变。
//    「纯函数的调用具有引用透明性」⇒ 人和编译器都能做激进替换与推理，
//    这也是死代码消除、常量折叠等优化的前提。
// ---------------------------------------------------------------------------

const double = (x: number): number => x * 2; // 纯

console.log('--- 4) 引用透明：等价替换后程序行为不变 ---');
const pureSum = double(21) + double(21);
console.log(`纯函数版: double(21) + double(21) = ${pureSum}`);
const replacedSum = 42 + 42; // 把 double(21) 整体替换为它的值 42
console.log(`替换后:   42 + 42 = ${replacedSum}`);
console.log(`替换安全: ${pureSum === replacedSum}`);

// 反例：数值上替换「看起来也没错」，但副作用暴露了差异
let calls = 0;
function impureDouble(x: number): number {
  calls += 1; // 副作用：计数
  return x * 2;
}
const impureSum = impureDouble(21) + impureDouble(21);
console.log(`不纯函数版: impureDouble(21) + impureDouble(21) = ${impureSum}`);
console.log(`副作用计数 calls = ${calls}（若替换成 42 + 42，calls 会变成 0）`);
console.log('替换安全: false（数值相同，但副作用次数从 2 变成 0，程序行为改变了）');

export {};
