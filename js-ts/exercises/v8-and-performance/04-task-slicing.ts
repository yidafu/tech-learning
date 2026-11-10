/**
 * 大纲章节：阶段 2 引擎与运行时
 * 主题：大数组同步求和 vs setTimeout(0) 切片处理：把控制权还给主线程（事件循环）
 * 运行：npx tsx exercises/v8-and-performance/04-task-slicing.ts
 * 预期输出（逐行；数值全部确定，不打印真实耗时）：
 *   == 任务切片：同步长任务 vs 切片处理（10,000,000 个元素）==
 *   [注册] 交互任务 A 已排队（先于同步求和注册）
 *   [开始] 同步求和 10,000,000 项（期间事件循环完全被占用）…
 *   [完成] 同步求和结果 = 49999995000000
 *   === 切片版：10 片 × 1,000,000 项，片间 setTimeout(0) 让出主线程 ===
 *   第 1/10 片完成（累计 1,000,000 项）
 *   [阻塞证明] 交互任务 A 直到同步求和结束才执行（它早已注册）
 *   第 2/10 片完成（累计 2,000,000 项）
 *   [交互] 交互任务 B 得到响应（此刻已完成 2 片）
 *   第 3/10 片完成（累计 3,000,000 项）
 *   第 4/10 片完成（累计 4,000,000 项）
 *   第 5/10 片完成（累计 5,000,000 项）
 *   第 6/10 片完成（累计 6,000,000 项）
 *   第 7/10 片完成（累计 7,000,000 项）
 *   第 8/10 片完成（累计 8,000,000 项）
 *   第 9/10 片完成（累计 9,000,000 项）
 *   第 10/10 片完成（累计 10,000,000 项）
 *   [完成] 切片求和结果 = 49999995000000
 *   两版本结果一致：true
 *   切片版期间交互任务被及时处理：true
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/08-render-and-performance.md 第 2、3 节）：
//
// 1. 事件循环语义：JS 主线程同一时刻只做一件事。同步代码执行期间，
//    已到期的 setTimeout 回调、I/O 事件、（浏览器里的）渲染与输入事件
//    全部排队等待 —— 这就是「长任务」（>50ms）卡住页面的机制。
//
// 2. 本实验用 setTimeout 回调模拟「交互任务」，观察它何时得到执行：
//    - 同步版：任务 A 在求和开始【前】注册，却必须等整个求和跑完、
//      主脚本全部结束后才执行（输出中「阻塞证明」行出现在求和完成之后）。
//    - 切片版：每片结束用 setTimeout(0) 把控制权交回事件循环，片与片
//      之间任务 B 得以插队执行（输出中「交互任务 B」出现在第 2、3 片之间）。
//
// 3. 让出主线程的意义：浏览器里，片间空隙可以让输入回调、渲染帧
//    （rAF/style/layout/paint）得以运行 —— INP（交互延迟）显著改善；
//    Node 里同理，I/O 与其他定时器不再被饿死。
//
// 4. 现代替代（浏览器）：scheduler.postTask 可指定优先级（让用户输入
//    优先于切片工作）；scheduler.yield() 保持执行顺序地「让一拍」。
//    setTimeout(0) 是兼容性最好但优先级最粗的方案（嵌套 5 层后还会被
//    钳到 ~4ms）。本练习用 setTimeout(0) 是为了在 Node 与浏览器中
//    语义一致。
// ---------------------------------------------------------------------------

const N = 10_000_000; // 元素总数
const CHUNK = 1_000_000; // 每片元素数
const TOTAL_CHUNKS = N / CHUNK;

/** 0..N-1 的等差和 —— 两版必须得到同一个确定值（< 2^53，整数精确）。 */
const EXPECTED_SUM = (N * (N - 1)) / 2; // 49999995000000

const fmtInt = (n: number): string => n.toLocaleString('en-US');

const data: number[] = Array.from({ length: N }, (_, i) => i);

// ============================ 版本一：同步长任务 ============================
console.log('== 任务切片：同步长任务 vs 切片处理（10,000,000 个元素）==');

// 交互任务 A：在同步求和开始前注册。它将证明「同步代码阻塞事件循环」。
let handledA = false;
setTimeout(() => {
  handledA = true;
  console.log('[阻塞证明] 交互任务 A 直到同步求和结束才执行（它早已注册）');
}, 0);
console.log('[注册] 交互任务 A 已排队（先于同步求和注册）');

console.log('[开始] 同步求和 10,000,000 项（期间事件循环完全被占用）…');
let syncSum = 0;
for (let i = 0; i < N; i++) {
  syncSum += data[i];
}
console.log(`[完成] 同步求和结果 = ${syncSum}`);

// ============================ 版本二：切片处理 ============================
console.log(`=== 切片版：${TOTAL_CHUNKS} 片 × ${fmtInt(CHUNK)} 项，片间 setTimeout(0) 让出主线程 ===`);

let chunkIndex = 0; // 已开始的片序号（0 基）
let slicedSum = 0;
let completedChunks = 0; // 已完成片数（供交互任务 B 报告进度）

function processChunk(): void {
  const start = chunkIndex * CHUNK;
  const end = start + CHUNK;
  for (let i = start; i < end; i++) {
    slicedSum += data[i];
  }
  chunkIndex++;
  completedChunks++;
  console.log(`第 ${completedChunks}/${TOTAL_CHUNKS} 片完成（累计 ${fmtInt(completedChunks * CHUNK)} 项）`);

  if (chunkIndex < TOTAL_CHUNKS) {
    // 关键一行：把控制权交还事件循环，下一片作为新的 task 排队。
    // 此期间任何已排队的回调（输入、渲染、其他定时器）都有机会先跑。
    setTimeout(processChunk, 0);
    return;
  }
  // 全部完成：打印结果与结论（此时交互任务 B 已在第 2 片后执行过）
  console.log(`[完成] 切片求和结果 = ${slicedSum}`);
  console.log(`两版本结果一致：${syncSum === slicedSum && slicedSum === EXPECTED_SUM}`);
  console.log(`切片版期间交互任务被及时处理：${handledB && handledBAtChunk === 2}`);
}

// 交互任务 B：在第 1 片之后、第 2 片之前注册。
// 事件循环顺序（同一 delay 的定时器按注册顺序执行）：
//   [A（更早注册）] → 第 2 片 → B → 第 3 片 → …
// 因此 B 执行时恰好完成了 2 片 —— 输出中的「此刻已完成 2 片」。
let handledB = false;
let handledBAtChunk = -1;

processChunk(); // 第 1 片同步执行；第 2 片起走 setTimeout 链
setTimeout(() => {
  handledB = true;
  handledBAtChunk = completedChunks;
  console.log(`[交互] 交互任务 B 得到响应（此刻已完成 ${completedChunks} 片）`);
}, 0);

// 主脚本到此结束，控制权交给事件循环（A → 第 2 片 → B → 第 3..10 片 → 总结）
