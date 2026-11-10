/**
 * 大纲章节：阶段 2 引擎与运行时
 * 主题：node:worker_threads 最小示例：结构化克隆传值 + ArrayBuffer 零拷贝转移（transferList）
 * 运行：node exercises/v8-and-performance/05-worker-threads.mjs
 * 预期输出（逐行；[worker] 行由主线程代打印 —— 见文内注释，顺序 100% 确定）：
 *   == worker_threads：结构化克隆 vs Transferable 零拷贝 ==
 *   [主] 启动 worker（同一个文件，isMainThread 分支复用）
 *   [主] 第 1 步 · 结构化克隆：发送 1..100 的数组
 *   [worker] 收到 100 个元素（结构化克隆的深拷贝）
 *   [worker] 求和完成：5050
 *   [主] 收到回传结果：5050
 *   [主] 第 2 步 · Transferable 转移：主线程创建 16 字节 ArrayBuffer
 *   [主] 转移前 buffer.byteLength = 16
 *   [worker] 收到转移的 buffer：byteLength = 16，内容 = [305419896, 2596069104]
 *   [主] 转移后主线程 buffer.byteLength = 0（所有权已移交，零拷贝）
 *   [主] 收到回传校验：true
 *   [主] 全部演示完成，退出
 */

// ---------------------------------------------------------------------------
// 机制说明（对应笔记 notes/stage-2-engine-runtime/08-render-and-performance.md 第 6 节）：
//
// 1. worker_threads 的模型与浏览器 Web Workers 一致：
//    - 独立线程、独立 V8 隔离区（不共享普通对象）；
//    - 通信只靠 postMessage 消息传递；
//    - 消息按「结构化克隆（structured clone）」深拷贝：
//        能传：原始值、普通对象/数组、Map/Set、Date/RegExp、TypedArray…
//        不能传：函数、闭包、DOM 节点、Symbol —— 传「行为」必须让 worker
//                端自带代码，只传「数据」。
//
// 2. transferList（postMessage 第二个参数）：把 ArrayBuffer 的【所有权】
//    移交给接收方，传输零拷贝（只移交底层内存句柄）。代价：发送方的
//    buffer 立即 detached —— byteLength 变 0，再通过旧 TypedArray 读写
//    会抛 TypeError。这不是 bug，是所有权语义：同一块内存不允许两边
//    同时访问（要真共享得用 SharedArrayBuffer + Atomics，本练习不展开）。
//
// 3. 单文件技巧：worker 与主线程代码写在同一个文件，用 isMainThread
//    区分分支；主线程 new Worker(new URL(import.meta.url)) 把本文件再
//    作为 worker 入口加载一遍。
//
// 4. 为什么 worker 端不直接 console.log：两个线程写同一进程的 stdout
//    时，先后顺序由线程调度决定，不保证确定。因此本练习让 worker 把
//    「要打印的文本」放进回传消息，由主线程在确定的时机统一代打印
//   （带 [worker] 前缀）—— 这也是输出确定性练习的正确工程做法。
// ---------------------------------------------------------------------------

import { Worker, isMainThread, parentPort } from 'node:worker_threads';

// ============================ worker 分支 ============================
if (!isMainThread) {
  // 在 worker 线程里：parentPort 一定存在（由 Worker 构造启动就有）
  const port = parentPort;

  port.on('message', (msg) => {
    if (msg.kind === 'clone') {
      // 收到的是主线程数组的深拷贝 —— 两边互不影响
      const { numbers } = msg;
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      // 每个请求只回一条消息：日志文本 + 结果，主线程 once 等它即可
      port.postMessage({
        kind: 'clone-done',
        count: numbers.length,
        sum,
        log: [
          `[worker] 收到 ${numbers.length} 个元素（结构化克隆的深拷贝）`,
          `[worker] 求和完成：${sum}`,
        ],
      });
    } else if (msg.kind === 'transfer') {
      // 收到的是被转移所有权的 ArrayBuffer —— 同一块内存，没有拷贝
      const buf = msg.buffer;
      const view = new Uint32Array(buf);
      port.postMessage({
        kind: 'transfer-done',
        byteLength: buf.byteLength,
        first: view[0],
        second: view[1],
        // 校验读到的正是主线程写入的两个确定值（0x12345678 / 0x9ABCDEF0）
        ok: view[0] === 305419896 && view[1] === 2596069104,
        log: [
          `[worker] 收到转移的 buffer：byteLength = ${buf.byteLength}，内容 = [${view[0]}, ${view[1]}]`,
        ],
      });
    }
  });
} else {
  // =========================== 主线程分支 ===========================
  const main = async () => {
    console.log('== worker_threads：结构化克隆 vs Transferable 零拷贝 ==');
    console.log('[主] 启动 worker（同一个文件，isMainThread 分支复用）');

    // 同一个文件再作为 worker 入口加载一遍
    const worker = new Worker(new URL(import.meta.url));

    // —— 第 1 步：结构化克隆传数组，worker 求和后回传 ——
    console.log('[主] 第 1 步 · 结构化克隆：发送 1..100 的数组');
    const cloneDone = await new Promise((resolve) => {
      worker.once('message', (msg) => {
        if (msg.kind === 'clone-done') resolve(msg);
      });
      worker.postMessage({ kind: 'clone', numbers: Array.from({ length: 100 }, (_, i) => i + 1) });
    });
    // 代打印 worker 日志（顺序由消息协议保证），再打印主线程视角
    for (const line of cloneDone.log) console.log(line);
    console.log(`[主] 收到回传结果：${cloneDone.sum}`);

    // —— 第 2 步：transferList 转移 ArrayBuffer（零拷贝）——
    console.log('[主] 第 2 步 · Transferable 转移：主线程创建 16 字节 ArrayBuffer');
    const buffer = new ArrayBuffer(16);
    const view = new Uint32Array(buffer);
    view[0] = 0x12345678; // 305419896
    view[1] = 0x9abcdef0; // 2596069104
    console.log(`[主] 转移前 buffer.byteLength = ${buffer.byteLength}`);

    const transferDone = await new Promise((resolve) => {
      worker.once('message', (msg) => {
        if (msg.kind === 'transfer-done') resolve(msg);
      });
      // 第二个参数就是 transferList：转移所有权，零拷贝
      worker.postMessage({ kind: 'transfer', buffer }, [buffer]);
    });
    for (const line of transferDone.log) console.log(line);
    // 转移后：发送方 buffer 已 detached，byteLength 归零
    console.log(`[主] 转移后主线程 buffer.byteLength = ${buffer.byteLength}（所有权已移交，零拷贝）`);
    console.log(`[主] 收到回传校验：${transferDone.ok}`);

    // 收尾：结束 worker 线程（消息都已处理完，这里只是清理）
    await worker.terminate();
    console.log('[主] 全部演示完成，退出');
  };

  main().catch((err) => {
    console.error('[主] 意外错误：', err);
    process.exitCode = 1;
  });
}
