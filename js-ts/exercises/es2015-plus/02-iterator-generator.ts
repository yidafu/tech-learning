/**
 * 大纲章节：阶段 1.5 ES2015+ 关键特性
 * 主题：手写可迭代对象（带日志证明 for...of 走 [Symbol.iterator]）/ 生成器双向通信 / return 与 throw / yield* 委托
 * 运行：npx tsx exercises/es2015-plus/02-iterator-generator.ts
 * 预期输出：
 * --- 1. for...of 的证据：先取 [Symbol.iterator]()，再循环调 next() ---
 * [Symbol.iterator]() 被调用（NumberRange 1..3）
 *   next() → cur=1
 *   body: 1
 *   next() → cur=2
 *   body: 2
 *   next() → cur=3
 *   body: 3
 *   next() → cur=4（done，循环结束）
 * ---
 * [Symbol.iterator]() 被调用（NumberRange 1..2）
 *   next() → cur=1
 *   body: 1
 *   next() → cur=2
 *   body: 2
 *   next() → cur=3（done，循环结束）
 * （两次循环各自重新调用 [Symbol.iterator]：迭代器是一次性消费品，一个迭代器走完就废弃）
 * 手动驱动同一个迭代器（多次 next 直到 done）:
 * [Symbol.iterator]() 被调用（NumberRange 1..3）
 *   next() → cur=1
 *   next() → { value: 1, done: false }
 *   next() → cur=2
 *   next() → { value: 2, done: false }
 *   next() → cur=3
 *   next() → { value: 3, done: false }
 *   next() → cur=4（done，循环结束）
 *   next() → { value: undefined, done: true }
 * --- 2. Fibonacci：无限序列的惰性求值（要多少算多少）---
 * 前 8 项: 0,1,1,2,3,5,8,13
 * --- 3. 双向通信：next(arg) 的 arg 是上一个 yield 表达式的值 ---
 * 第 1 次 next()（参数被忽略，还没有 yield 能接收它）: { value: "你叫什么名字？", done: false }
 * 第 2 次 next('小明')（作为第 1 个 yield 表达式的值）: { value: "小明，多大了？", done: false }
 * 第 3 次 next('18')（作为第 2 个 yield 表达式的值）: { value: "收到：小明/18", done: true }
 * --- 4. return() 提前关闭 / throw() 在暂停点注入异常 ---
 * r1.next(): a
 * r1.return('提前结束'): 提前结束
 * r1.next().done = true（生成器已关闭，之后只会得到 done）
 * r2.next(): a
 * r2.throw(...): 捕获到注入的异常: Error: boom
 * r2.next()（catch 消化异常后不再回到 try 剩余的 yield 'b'/'c'，直达 return）: normal-end
 * --- 5. yield*：委托 + return 值穿透 + next 参数穿透 ---
 * outer: 进入
 *   inner: 开始
 * 第 1 次 next(): i-1
 *   inner: 收到 next 传入的 hello（参数穿透 yield* 直接给 inner）
 * 第 2 次 next('hello'): i-2
 *   inner: return
 * outer: yield* 表达式的值 = inner 的 return 值 "inner-return-value"
 * 第 3 次 next(): o-1
 * 第 4 次 next(): done = true
 * --- 6. for...of 提前 break → 自动调用 iterator.return() 关闭生成器 ---
 * body: 1
 * body: 2
 * three: finally（生成器被 return() 关闭，finally 块执行）
 */

// ---------- 1. 手写可迭代对象 + 协议日志 ----------
// 迭代器协议（ECMA-262 §7.4）：next() → { value, done }
// 可迭代协议：对象有 [Symbol.iterator]() 且返回迭代器
class NumberRange {
  constructor(
    public readonly from: number,
    public readonly to: number,
  ) {}
  [Symbol.iterator](): Iterator<number> {
    console.log(`[Symbol.iterator]() 被调用（NumberRange ${this.from}..${this.to}）`);
    let cur = this.from;
    const last = this.to;
    return {
      next: (): IteratorResult<number> => {
        const done = cur > last;
        console.log(`  next() → cur=${cur}${done ? '（done，循环结束）' : ''}`);
        return done ? { value: undefined, done: true } : { value: cur++, done: false };
      },
    };
  }
}

console.log('--- 1. for...of 的证据：先取 [Symbol.iterator]()，再循环调 next() ---');
for (const v of new NumberRange(1, 3)) {
  console.log(`  body: ${v}`);
}
console.log('---');
for (const v of new NumberRange(1, 2)) {
  console.log(`  body: ${v}`);
}
console.log('（两次循环各自重新调用 [Symbol.iterator]：迭代器是一次性消费品，一个迭代器走完就废弃）');

console.log('手动驱动同一个迭代器（多次 next 直到 done）:');
const manual = new NumberRange(1, 3)[Symbol.iterator]();
let manualResult = manual.next();
while (!manualResult.done) {
  console.log(`  next() → { value: ${JSON.stringify(manualResult.value)}, done: false }`);
  manualResult = manual.next();
}
console.log(`  next() → { value: ${JSON.stringify(manualResult.value)}, done: true }`);

// ---------- 2. Fibonacci：无限序列的惰性求值 ----------
// function* 调用后不执行函数体，返回生成器对象；每次 next 执行到下一个 yield 停下
function* fib(): Generator<number, void, unknown> {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
console.log('--- 2. Fibonacci：无限序列的惰性求值（要多少算多少）---');
const fibIter = fib();
const first8: number[] = [];
for (let i = 0; i < 8; i++) {
  const r = fibIter.next();
  if (!r.done) first8.push(r.value); // done === false 时 value 才是 number
}
console.log(`前 8 项: ${first8.join(',')}`);

// ---------- 3. 双向通信 ----------
// yield 是「表达式」：它的值 = 恢复执行的那次 next(arg) 的 arg
function* dialogue(): Generator<string, string, string> {
  const name = yield '你叫什么名字？'; // name ← 第 2 次 next('小明') 的参数
  const age = yield `${name}，多大了？`; // age ← 第 3 次 next('18') 的参数
  return `收到：${name}/${age}`;
}
console.log('--- 3. 双向通信：next(arg) 的 arg 是上一个 yield 表达式的值 ---');
const d = dialogue();
const d1 = d.next();
console.log(`第 1 次 next()（参数被忽略，还没有 yield 能接收它）: { value: ${JSON.stringify(d1.value)}, done: ${d1.done} }`);
const d2 = d.next('小明');
console.log(`第 2 次 next('小明')（作为第 1 个 yield 表达式的值）: { value: ${JSON.stringify(d2.value)}, done: ${d2.done} }`);
const d3 = d.next('18');
console.log(`第 3 次 next('18')（作为第 2 个 yield 表达式的值）: { value: ${JSON.stringify(d3.value)}, done: ${d3.done} }`);

// ---------- 4. return / throw ----------
function* resilient(): Generator<string, string, unknown> {
  try {
    yield 'a';
    yield 'b';
    yield 'c';
  } catch (err) {
    yield `捕获到注入的异常: ${String(err)}`; // 在暂停点注入的异常被 try/catch 捕获
  }
  return 'normal-end';
}
console.log('--- 4. return() 提前关闭 / throw() 在暂停点注入异常 ---');
const r1 = resilient();
console.log(`r1.next(): ${r1.next().value}`);
const returned = r1.return('提前结束'); // 在暂停的 yield 处执行 return，函数体终止（若有 finally 会执行）
console.log(`r1.return('提前结束'): ${returned.value}`);
console.log(`r1.next().done = ${r1.next().done}（生成器已关闭，之后只会得到 done）`);

const r2 = resilient();
console.log(`r2.next(): ${r2.next().value}`);
console.log(`r2.throw(...): ${r2.throw(new Error('boom')).value}`);
// 关键教学点：throw() 注入的异常在暂停的 yield 处抛出并被 catch 捕获后，
// 控制流不会回到 try 块里剩余的 yield 'b'/'c'——try 块已被中断，直达 return。
console.log(`r2.next()（catch 消化异常后不再回到 try 剩余的 yield 'b'/'c'，直达 return）: ${r2.next().value}`);

// ---------- 5. yield* 委托（ECMA-262 §14.4.14）----------
// yield* 把 next 参数、值、return 全部转发给内层可迭代对象；
// yield* 整个表达式的值 = 内层生成器的 return 值（不是最后一个 yield 值）
function* inner(): Generator<string, string, unknown> {
  console.log('  inner: 开始');
  const received = yield 'i-1';
  console.log(`  inner: 收到 next 传入的 ${received}（参数穿透 yield* 直接给 inner）`);
  yield 'i-2';
  console.log('  inner: return');
  return 'inner-return-value';
}
function* outer(): Generator<string, void, unknown> {
  console.log('outer: 进入');
  const fromInner = yield* inner();
  console.log(`outer: yield* 表达式的值 = inner 的 return 值 ${JSON.stringify(fromInner)}`);
  yield 'o-1';
}
console.log('--- 5. yield*：委托 + return 值穿透 + next 参数穿透 ---');
const o = outer();
console.log(`第 1 次 next(): ${o.next().value}`);
console.log(`第 2 次 next('hello'): ${o.next('hello').value}`);
console.log(`第 3 次 next(): ${o.next().value}`);
console.log(`第 4 次 next(): done = ${o.next().done}`);

// ---------- 6. for...of 提前 break → 自动调用 return() ----------
function* three(): Generator<number, void, unknown> {
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    console.log('three: finally（生成器被 return() 关闭，finally 块执行）');
  }
}
console.log('--- 6. for...of 提前 break → 自动调用 iterator.return() 关闭生成器 ---');
for (const v of three()) {
  console.log(`body: ${v}`);
  if (v === 2) break; // 规范要求 for...of 提前退出时调用 iterator.return()（若存在）
}
