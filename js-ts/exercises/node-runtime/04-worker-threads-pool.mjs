/**
 * 大纲章节：阶段 2 引擎与运行时（Node.js 运行时）
 * 主题：worker_threads CPU 密集并行：串行 vs 4 worker 分片实测（含加速比与结果一致性校验）
 * 运行：node exercises/node-runtime/04-worker-threads-pool.mjs
 * 预期输出（标注「实测」的行数值随机器变化，其余为确定结论）：
 *   == worker_threads：CPU 密集任务串行 vs 并行 ==
 *   [环境] CPU 逻辑核数 = 12（实测样例：Apple M4 Pro / Node 24.10.0；此行随机器变化）；本实验分 4 片，每片一个 worker
 *   [任务] 统计 [1, 6,000,000) 内的素数个数（试除法，纯 CPU）
 *   [串行] 单线程完成，count = 412849
 *   [并行] 4 个 worker 全部返回，count 之和 = 412849，与串行一致：true
 *   [实测] 串行耗时 = 404 ms（实测样例，随机器变化）
 *   [实测] 并行耗时 = 141 ms（含 worker 启动与消息往返，实测样例，随机器变化）
 *   [实测] 加速比 = 2.9x（实测样例，随机器变化）
 *   [结论] 并行版快于串行版：true
 *   [结论] worker 的适用判据：计算/通信比高 —— 本实验每片只传 2 个数字过去、1 个数字回来
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/35-node-runtime.md 第 5 节；
//       worker 的通信机制（结构化克隆 + transferList）在笔记 08 第 6 节与
//       exercises/v8-and-performance/05-worker-threads.mjs 已演示，本练习专注「并行收益」。）
//
// 1. worker_threads：每个 worker 是独立线程 + 独立 V8 isolate（独立堆），
//    通过 postMessage（结构化克隆）通信。启动一个 worker 的成本 =
//    建线程 + 起 isolate（数 MB 内存），所以 worker 池化的前提是
//    任务足够大：通信成本 << 计算成本（计算/通信比高）。
//
// 2. 本实验的任务刻意选成「传 2 个数字、回 1 个数字」的纯计算：
//    通信开销固定且极小，计算量 3 百万级 —— 这是 worker 的甜点场景。
//    （反例：把 100 个小任务各开一个 worker，启动成本会吃掉全部收益。）
//
// 3. 串行版与并行版必须算出同一个 count（分段统计的加法交换律），
//    这是所有性能实验的纪律：先证明两版等价，再比较耗时 ——
//    「快但算错」毫无意义。
//
// 4. 加速比 < 4 是正常的：worker 启动、任务分发、结果汇总都有开销，
//    且逻辑核数、其他进程都会影响；加速比看「数量级改善」，不看精确倍数。
// ---------------------------------------------------------------------------

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

function countPrimes(from, to) {
  // [from, to) 内的奇素数个数：奇数试除法（够慢够纯 CPU，正适合本实验）
  let count = 0;
  let start = Math.max(from, 3);
  if (start % 2 === 0) start++; // 只扫奇数（偶数除 2 外都不是素数；2 在汇总时单独加回）
  for (let n = start; n < to; n += 2) {
    let isPrime = true;
    for (let d = 3; d * d <= n; d += 2) {
      if (n % d === 0) { isPrime = false; break; }
    }
    if (isPrime) count++;
  }
  return count;
}

if (!isMainThread) {
  // worker 分支：收 [from, to)，算完回传一个数字
  const { from, to } = workerData;
  parentPort.postMessage(countPrimes(from, to));
} else {
  const LIMIT = 6_000_000;
  const SLICES = 4;
  console.log('== worker_threads：CPU 密集任务串行 vs 并行 ==');
  console.log(`[环境] CPU 逻辑核数 = ${cpus().length}（实测，随机器变化）；本实验分 ${SLICES} 片，每片一个 worker`);
  console.log(`[任务] 统计 [1, ${LIMIT.toLocaleString('en-US')}) 内的素数个数（试除法，纯 CPU）`);

  // 串行基线
  let t0 = performance.now();
  const serial = countPrimes(1, LIMIT) + 1; // +1 是素数 2
  const serialMs = performance.now() - t0;
  console.log(`[串行] 单线程完成，count = ${serial}`);

  // 并行：分 4 片
  const width = Math.ceil(LIMIT / SLICES);
  const ranges = Array.from({ length: SLICES }, (_, i) => ({
    from: 1 + i * width,
    to: Math.min(LIMIT, 1 + (i + 1) * width),
  }));
  t0 = performance.now();
  const results = await Promise.all(
    ranges.map(
      (r) =>
        new Promise((resolve, reject) => {
          const w = new Worker(fileURLToPath(import.meta.url), { workerData: r });
          w.on('message', resolve);
          w.on('error', reject);
        }),
    ),
  );
  const parallelMs = performance.now() - t0;
  const parallel = results.reduce((a, b) => a + b, 0) + 1; // +1 是素数 2
  console.log(`[并行] ${SLICES} 个 worker 全部返回，count 之和 = ${parallel}，与串行一致：${parallel === serial}`);

  console.log(`[实测] 串行耗时 = ${serialMs.toFixed(0)} ms（实测，随机器变化）`);
  console.log(`[实测] 并行耗时 = ${parallelMs.toFixed(0)} ms（含 worker 启动与消息往返，实测，随机器变化）`);
  console.log(`[实测] 加速比 = ${(serialMs / parallelMs).toFixed(1)}x（实测，随机器变化）`);
  console.log(`[结论] 并行版快于串行版：${parallelMs < serialMs}`);
  console.log('[结论] worker 的适用判据：计算/通信比高 —— 本实验每片只传 2 个数字过去、1 个数字回来');
}
