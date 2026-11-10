/**
 * 大纲章节：阶段 1.4 异步编程
 * 主题：await 的本质——async/await 与 .then 链的手动等价改写、return 与 return await、串行 vs 并发、forEach 的坑
 * 运行：npx tsx exercises/async-programming/04-async-await-essence.ts
 * 预期输出：
 * == 第 1 组：async/await 与 .then 链的等价性 ==
 *   [async 版] 1: 函数体开始（调用即同步执行到这里）
 *   [async 版] 2: 第一个 await 之后，a=A-值
 *   [async 版] 3: 第二个 await 之后，b=B-值
 *   withAsync 返回: done
 *   [then 版] 1: 函数体开始（同步部分，不是微任务）
 *   [then 版] 2: 第一个 then，a=A-值
 *   [then 版] 3: 第二个 then，b=B-值
 *   withThen 返回: done
 * == 第 2 组：return promise vs return await promise ==
 *   [returnPromise] finally：立即执行（还没等 promise 落定）
 *   [同步] returnPromise() 已返回，finally 已打印，promise 仍 pending
 *   [同步] returnAwait() 已返回，finally 还没打印（await 还挂着）
 *   [returnPromise] 拒绝: late-boom
 *   [returnAwait] finally：promise 落定后才执行
 *   [returnAwait] 拒绝: late-boom
 *   [catchNoAwait] 被外层处理: late-boom
 *   [catchAwait] catch 捕获（await 在 try 内落定，能被 catch 接住）
 *   [catchAwait] 返回值 = recovered
 * == 第 3 组：循环 await（串行） vs Promise.all（并发） ==
 *     [串行] 启动 任务1（当前并发=1）
 *     [串行] 完成任务1
 *     [串行] 启动 任务2（当前并发=1）
 *     [串行] 完成任务2
 *     [串行] 启动 任务3（当前并发=1）
 *     [串行] 完成任务3
 *   [串行] 结果: 任务1,任务2,任务3；最大并发=1；总耗时 ≈ 3 个 delay 周期
 *     [并发] 启动 任务1（当前并发=1）
 *     [并发] 启动 任务2（当前并发=2）
 *     [并发] 启动 任务3（当前并发=3）
 *     [并发] 完成任务1
 *     [并发] 完成任务2
 *     [并发] 完成任务3
 *   [并发] 结果: 任务1,任务2,任务3；最大并发=3；总耗时 ≈ 1 个 delay 周期
 * == 第 4 组：forEach + async 的坑 vs for...of ==
 *   [forEach] 循环返回后立刻看 collected = []
 *   [forEach] 稍后再看 collected = ["v1","v2","v3"]
 *   [for...of] 逐个 await，fixed = ["v1","v2","v3"]
 */

// ============================================================
// 第 1 组：手动把 async/await 改写成 .then 链
// 本质（ECMA-262 的 Await 抽象操作）：
//   async 函数执行到 await 处：暂停并把控制权还给调用者，
//   后续代码作为被 await 值的 reaction（微任务）注册。
//   await x  ≈  Promise.resolve(x).then(后续代码)
// 因此一个 async 函数 ≈ 「同步前奏 + 一串 .then」。
// 两组代码的输出结构逐行对应，证明等价。
// （也正因为如此，TS 把 async/await 编译到 ES2017 以下目标时，
//   产物就是生成器/状态机 + Promise，见笔记 1.2 节。）
// ============================================================

function step(name: string): Promise<string> {
  return Promise.resolve(`${name}-值`);
}

async function withAsync(): Promise<string> {
  console.log("  [async 版] 1: 函数体开始（调用即同步执行到这里）");
  const a = await step("A"); // ← 暂停点 1
  console.log(`  [async 版] 2: 第一个 await 之后，a=${a}`);
  const b = await step("B"); // ← 暂停点 2
  console.log(`  [async 版] 3: 第二个 await 之后，b=${b}`);
  return "done";
}

function withThen(): Promise<string> {
  console.log("  [then 版] 1: 函数体开始（同步部分，不是微任务）");
  return Promise.resolve()
    .then(() => step("A")) // ≈ await step("A")
    .then((a) => {
      console.log(`  [then 版] 2: 第一个 then，a=${a}`);
      return step("B"); // ≈ await step("B")
    })
    .then((b) => {
      console.log(`  [then 版] 3: 第二个 then，b=${b}`);
      return "done";
    });
}

console.log("== 第 1 组：async/await 与 .then 链的等价性 ==");
const r1 = await withAsync();
console.log("  withAsync 返回:", r1);
const r2 = await withThen();
console.log("  withThen 返回:", r2);

// ============================================================
// 第 2 组：return promise vs return await promise
// async 函数的 return x：把 x 交给 async 函数自身的 promise（可能再经历
// 一次 thenable adoption）；return await x：先在原地等 x 落定再返回。
// 差异只有落在 try 块里时才可见：
//   - try/finally：return await 会让 finally 等到 promise 落定后才执行；
//     直接 return 则立刻执行 finally，promise 在函数外才落定。
//   - try/catch：只有 return await 的拒绝能被本层 catch 捕获。
// ============================================================

function pendingReject(): Promise<string> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error("late-boom")), 20);
  });
}

async function returnPromise(): Promise<string> {
  try {
    return pendingReject(); // 不等待：finally 立即执行，拒绝发生在函数之外
  } finally {
    console.log("  [returnPromise] finally：立即执行（还没等 promise 落定）");
  }
}

async function returnAwait(): Promise<string> {
  try {
    return await pendingReject(); // 先落定：finally 等 await 有了结果才执行
  } finally {
    console.log("  [returnAwait] finally：promise 落定后才执行");
  }
}

async function catchNoAwait(): Promise<string> {
  try {
    return pendingReject(); // 拒绝发生在离开 try 之后 → catch 接不住
  } catch {
    console.log("  [catchNoAwait] 这行不会打印");
    return "recovered";
  }
}

async function catchAwait(): Promise<string> {
  try {
    return await pendingReject(); // await 在 try 内落定 → catch 能接住
  } catch {
    console.log("  [catchAwait] catch 捕获（await 在 try 内落定，能被 catch 接住）");
    return "recovered";
  }
}

console.log("== 第 2 组：return promise vs return await promise ==");
const p1 = returnPromise();
void p1.catch((e: Error) => console.log(`  [returnPromise] 拒绝: ${e.message}`));
console.log("  [同步] returnPromise() 已返回，finally 已打印，promise 仍 pending");
const p2 = returnAwait();
void p2.catch((e: Error) => console.log(`  [returnAwait] 拒绝: ${e.message}`));
console.log("  [同步] returnAwait() 已返回，finally 还没打印（await 还挂着）");
await Promise.all([p1.catch(() => undefined), p2.catch(() => undefined)]);

const c1 = await catchNoAwait().then(
  (v) => `正常返回 ${v}`,
  (e: Error) => `被外层处理: ${e.message}`,
);
console.log(`  [catchNoAwait] ${c1}`);
const c2 = await catchAwait();
console.log(`  [catchAwait] 返回值 = ${c2}`);

// ============================================================
// 第 3 组：循环里 await（串行） vs 先启动再 Promise.all（并发）
// 观察手段：假 delay（真实 setTimeout，但不打印毫秒数）+ 并发计数器。
//   串行：每次循环 await → 下一轮迭代才启动 → 最大并发 = 1，
//         总耗时 ≈ 各任务 delay 之和（3 个周期）；
//   并发：循环只负责「启动」，Promise.all 负责等 → 最大并发 = 3，
//         总耗时 ≈ 最慢任务（1 个周期）。
// ============================================================

let running = 0;
let maxRunning = 0;

function fakeTask(label: string, i: number): Promise<string> {
  running++;
  if (running > maxRunning) maxRunning = running;
  console.log(`    [${label}] 启动 任务${i}（当前并发=${running}）`);
  return new Promise((resolve) => {
    setTimeout(() => {
      running--;
      console.log(`    [${label}] 完成任务${i}`);
      resolve(`任务${i}`);
    }, 10);
  });
}

console.log("== 第 3 组：循环 await（串行） vs Promise.all（并发） ==");

running = 0;
maxRunning = 0;
const serialResult: string[] = [];
for (let i = 1; i <= 3; i++) {
  serialResult.push(await fakeTask("串行", i)); // ← await 在循环体内：串行
}
console.log(`  [串行] 结果: ${serialResult.join(",")}；最大并发=${maxRunning}；总耗时 ≈ 3 个 delay 周期`);

running = 0;
maxRunning = 0;
const jobs: Promise<string>[] = [];
for (let i = 1; i <= 3; i++) {
  jobs.push(fakeTask("并发", i)); // ← 只启动不等待：全部并发跑起来
}
const concurrentResult = await Promise.all(jobs);
console.log(`  [并发] 结果: ${concurrentResult.join(",")}；最大并发=${maxRunning}；总耗时 ≈ 1 个 delay 周期`);

// ============================================================
// 第 4 组：forEach + async 的坑
// Array.prototype.forEach 对回调的返回值（promise）视而不见，
// 也不会等待 —— 循环「同步结束」，await 全部被甩到微任务里。
// 修复：for...of（支持 await）或改用并发收集。
// ============================================================

console.log("== 第 4 组：forEach + async 的坑 vs for...of ==");

const collected: string[] = [];
[1, 2, 3].forEach(async (i) => {
  collected.push(await Promise.resolve(`v${i}`)); // 这里的 await 没有人等
});
console.log("  [forEach] 循环返回后立刻看 collected =", JSON.stringify(collected));
await new Promise<void>((resolve) => setTimeout(resolve, 10)); // 稍等片刻，微任务都已执行
console.log("  [forEach] 稍后再看 collected =", JSON.stringify(collected));

const fixed: string[] = [];
for (const i of [1, 2, 3]) {
  fixed.push(await Promise.resolve(`v${i}`)); // for...of 的循环体可以 await
}
console.log("  [for...of] 逐个 await，fixed =", JSON.stringify(fixed));

export {}; // 顶层 await 要求本文件是 ESM 模块
