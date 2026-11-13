/**
 * 大纲章节：阶段 2 引擎与运行时（Node.js 运行时）
 * 主题：cluster：多个进程共享同一个监听端口（primary 分发连接），观察请求落到哪个 worker
 * 运行：node exercises/node-runtime/05-cluster-http.mjs
 * 预期输出（worker 进程不直接打印，全部由 primary 代打印，顺序确定；
 *          端口一行是系统随机分配的，数值会变）：
 *   == cluster：2 个 worker 共享一个 HTTP 端口 ==
 *   [primary] fork 出 2 个 worker（每个是本文件的完整分身，各自独立 V8 堆）
 *   [primary] 两个 worker 都在监听 127.0.0.1:<随机端口>（端口由系统分配，数值随运行变化）
 *   [primary] 依次发 6 个独立的 HTTP 请求（每个请求一条新连接）
 *   [primary] 第 1 个请求 → worker#1（起始 worker 不固定：另一次运行可能从 worker#2 起，此后严格交替）
 *   [primary] 第 2 个请求 → worker#2
 *   [primary] 第 3 个请求 → worker#1
 *   [primary] 第 4 个请求 → worker#2
 *   [primary] 第 5 个请求 → worker#1
 *   [primary] 第 6 个请求 → worker#2
 *   [primary] 6 个请求由 2 个 worker 轮流服务（非 Windows 默认 round-robin 分发）：true
 *   [primary] 退出码明细：code=0,signal=null；code=0,signal=null
 *   [primary] 2 个 worker 已全部正常退出（code=0）：true
 *   [结论] cluster = 多进程 + primary 集中 accept 后逐个分发连接；崩溃互不连坐，
 *          重启 worker 的责任在 primary（本练习末尾演示优雅退出）
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/35-node-runtime.md 第 5 节）：
//
// 1. cluster 的核心能力：primary 进程 cluster.fork() 出 N 个 worker 进程，
//    所有 worker 都对同一个 port 调 listen()。在非 Windows 平台，默认策略是
//    round-robin：由 primary 统一 accept 连接，再轮流分发给 worker ——
//    所以「N 个进程监听一个端口」不会抢答，而是排队派活。
//
// 2. worker 是独立进程：独立 V8 堆、独立模块缓存。模块级状态（比如计数器、
//    内存缓存）在每个 worker 里各是一份 —— 跨 worker 的共享状态必须外置
//    （Redis 等）或走 IPC，这是 cluster 与 worker_threads 的本质差异之一。
//
// 3. 输出顺序为什么确定：worker 不打印任何东西，只在响应头里带自己的
//    cluster.worker.id；primary 收到响应后代为打印。这与 03-child-process.mjs
//    的「父进程代打印」、v8-and-performance/05 的「主线程代打印」同一纪律。
//
// 4. 退出纪律：primary 调 worker.kill() 前先让 server 收尾。本练习里 worker
//    收到 shutdown 消息后 server.close() + process.exit(0)；primary 等 exit
//    事件确认两个 worker 都退出后再结束 —— 演示「优雅停机」的骨架。
//
// 5. 每个请求都新建连接（agent: false）：保证 6 条连接由 primary 逐个 accept、
//    逐个分发，round-robin 的顺序才是确定的。keep-alive 复用连接时，
//    同一条连接上的请求会一直落在同一个 worker（连接级分发）。
// ---------------------------------------------------------------------------

import cluster from 'node:cluster';
import http from 'node:http';
import process from 'node:process';
import { once } from 'node:events';

const WORKERS = 2;
const REQUESTS = 6;

if (cluster.isPrimary) {
  console.log('== cluster：2 个 worker 共享一个 HTTP 端口 ==');
  console.log(`[primary] fork 出 ${WORKERS} 个 worker（每个是本文件的完整分身，各自独立 V8 堆）`);

  const listening = new Map(); // workerId -> port
  const workers = [];
  for (let i = 0; i < WORKERS; i++) {
    const w = cluster.fork();
    workers.push(w);
    w.on('message', (msg) => {
      if (msg?.type === 'listening') listening.set(w.id, msg.port);
    });
  }
  await Promise.all(workers.map((w) => once(w, 'message'))); // 每个 worker 至少回一条
  while (listening.size < WORKERS) await new Promise((r) => setTimeout(r, 5));
  const port = listening.values().next().value;
  console.log(`[primary] 两个 worker 都在监听 127.0.0.1:${port}（端口由系统分配，数值随运行变化）`);

  // 6 个串行请求，每个一条新连接（agent: false）
  console.log(`[primary] 依次发 ${REQUESTS} 个独立的 HTTP 请求（每个请求一条新连接）`);
  const hits = [];
  for (let i = 0; i < REQUESTS; i++) {
    const workerId = await new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: '/', agent: false, headers: { connection: 'close' } },
        (res) => resolve(Number(res.headers['x-worker-id'])),
      );
      req.on('error', reject);
      req.end();
    });
    hits.push(workerId);
    console.log(`[primary] 第 ${i + 1} 个请求 → worker#${workerId}`);
  }
  const alternating = hits.every((id, i) => (i === 0 ? true : id !== hits[i - 1]));
  console.log(`[primary] ${REQUESTS} 个请求由 ${WORKERS} 个 worker 轮流服务（非 Windows 默认 round-robin 分发）：${alternating}`);

  // 优雅停机：通知 worker 自行关闭 server 后退出
  // （注意：cluster 的 Worker 对象上 exitCode 属性不保证填充，退出码要从 'exit' 事件参数拿）
  for (const w of workers) w.send({ type: 'shutdown' });
  const exitArgs = await Promise.all(workers.map((w) => once(w, 'exit'))); // [code, signal][]
  console.log(`[primary] 退出码明细：${exitArgs.map(([c, s]) => `code=${c},signal=${s}`).join('；')}`);
  console.log(`[primary] ${WORKERS} 个 worker 已全部正常退出（code=0）：${exitArgs.every(([c]) => c === 0)}`);
  console.log('[结论] cluster = 多进程 + primary 集中 accept 后逐个分发连接；崩溃互不连坐，');
  console.log('       重启 worker 的责任在 primary（本练习末尾演示优雅退出）');
} else {
  // ---------- worker 分支：起 HTTP server，把端口报给 primary，绝不自己打印 ----------
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'x-worker-id': String(cluster.worker.id), connection: 'close' });
    res.end('ok');
  });
  server.listen(0, '127.0.0.1', () => {
    process.send({ type: 'listening', port: server.address().port });
  });
  process.on('message', (msg) => {
    if (msg?.type === 'shutdown') {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500).unref(); // 兜底：连接未及时断开也退出
    }
  });
}
