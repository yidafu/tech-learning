/**
 * 大纲章节：阶段 2 引擎与运行时（性能工程方法论）
 * 主题：long task 的 Node 侧定位：monitorEventLoopDelay 延迟直方图 + eventLoopUtilization 利用率
 * 运行：node exercises/performance-engineering/03-event-loop-delay.mjs
 * 预期输出（标注「实测」的行数值随机器变化，其余为确定结论）：
 *   == 事件循环延迟与利用率：长任务 vs 切片 ==
 *   [设定] 版本 A：单次同步阻塞 300ms（一个长任务）；版本 B：30 片 × 10ms，片间 setImmediate 让出
 *
 *   --- 版本 A：单个 300ms 长任务 ---
 *   [实测] 事件循环延迟 mean = 79_046_246 ns ≈ 79.0 ms，max = 311_427_071 ns ≈ 311.4 ms（实测样例：Apple M4 Pro / Node 24.10.0，随机器变化）
 *   [结论] 长任务期间延迟峰值 > 250ms（事件循环整段被占住）：true
 *
 *   --- 版本 B：30 片 × 10ms，片间让出 ---
 *   [实测] 事件循环延迟 mean = 21_254_867 ns ≈ 21.3 ms，max = 39_223_295 ns ≈ 39.2 ms（实测，随机器变化）
 *   [结论] 切片版延迟峰值 < 50ms（每片之间事件循环都能转圈）：true
 *   [结论] 切片版 max 不到长任务版的 1/5（分辨率 20ms 决定了下限）：true
 *
 *   --- eventLoopUtilization：区分「CPU 忙」与「IO 等待」---
 *   [实测] 空闲 100ms 期间利用率 = 0.00（实测，随机器变化）
 *   [实测] 阻塞 200ms 期间利用率 = 1.00（实测，随机器变化）
 *   [结论] 利用率 ≈ 0（等 IO）vs ≈ 1（CPU 忙）：归因第一步 —— 先分类，再选工具
 *   [结论] Node 没有 longtask 条目（那是浏览器 PerformanceObserver 的），这对 API 是 Node 的对应物
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/36-performance-engineering.md 第 5 节；
//       浏览器侧 long task 的定义与 50ms 阈值见笔记 08 第 2、7 节）：
//
// 1. monitorEventLoopDelay（perf_hooks）：一个直方图（IntervalMonitor），
//    周期性检查事件循环两次轮询之间的间隙。主线程被同步长任务占住时，
//    检查点被推迟 → 记录一次大延迟。它是「主线程被占住」的近似信号：
//    - mean：整个采集窗口的平均（会被空闲期稀释，看数量级即可）
//    - max / percentile(99)：尖峰 —— long task 的直接证据
//
// 2. eventLoopUtilization([since])：返回 {idle, active, utilization}，
//    传上一个采样点作参数可得增量区间值。归因用法：
//    - utilization ≈ 1 且延迟有尖峰 → CPU 型（该去抓 CPU profile）
//    - utilization ≈ 0 但接口慢 → IO 等待型（CPU profile 抓不到东西，
//      该查下游依赖/网络，方向完全不同）
//
// 3. busy(ms) 用 performance.now() 打满循环 —— 与 setTimeout 无关的纯同步
//    占用；切片版在片间 await setImmediate（check 阶段，衔接笔记 31：
//    setImmediate 每代之间事件循环完整转一圈，不会像递归 nextTick 那样饿死）。
//
// 4. 直方图 reset()：两个版本共用一个 monitor，中间必须 reset，
//    否则版本 A 的尖峰会污染版本 B 的统计。
// ---------------------------------------------------------------------------

import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
const { eventLoopUtilization } = performance; // Node 24：ELU 挂在 performance 对象上

function busy(ms) {
  const deadline = performance.now() + ms;
  let sink = 0;
  while (performance.now() < deadline) sink += Math.sqrt(sink + 1) % 7;
  return sink; // 结果要用，防死代码消除
}
const ms = (ns) => (ns / 1e6).toFixed(1);

console.log('== 事件循环延迟与利用率：长任务 vs 切片 ==');
console.log('[设定] 版本 A：单次同步阻塞 300ms（一个长任务）；版本 B：30 片 × 10ms，片间 setImmediate 让出');
console.log('');

const monitor = monitorEventLoopDelay({ resolution: 20 });

// ---------- 版本 A：单个 300ms 长任务 ----------
console.log('--- 版本 A：单个 300ms 长任务 ---');
monitor.enable();
await new Promise((r) => setTimeout(r, 60)); // 先空转一个分辨率周期：monitor 的首个 tick 建立基线
const sinkA = busy(300);
await new Promise((r) => setTimeout(r, 60)); // 再空转：让被推迟的检查点落账
monitor.disable();
console.log(
  `[实测] 事件循环延迟 mean = ${Math.round(monitor.mean)} ns ≈ ${ms(monitor.mean)} ms，` +
    `max = ${Math.round(monitor.max)} ns ≈ ${ms(monitor.max)} ms（实测，随机器变化）`,
);
const maxA = monitor.max;
console.log(`[结论] 长任务期间延迟峰值 > 250ms（事件循环整段被占住）：${maxA > 250e6}`);
console.log('');

// ---------- 版本 B：30 片 × 10ms ----------
console.log('--- 版本 B：30 片 × 10ms，片间让出 ---');
monitor.reset();
monitor.enable();
await new Promise((r) => setTimeout(r, 60)); // 同样先空转一个周期建立基线
const immediate = () => new Promise((r) => setImmediate(r));
let sinkB = 0;
for (let i = 0; i < 30; i++) {
  sinkB += busy(10);
  await immediate(); // 关键差异：让出主线程，事件循环转一圈
}
await new Promise((r) => setTimeout(r, 20));
monitor.disable();
console.log(
  `[实测] 事件循环延迟 mean = ${Math.round(monitor.mean)} ns ≈ ${ms(monitor.mean)} ms，` +
    `max = ${Math.round(monitor.max)} ns ≈ ${ms(monitor.max)} ms（实测，随机器变化）`,
);
const maxB = monitor.max;
console.log(`[结论] 切片版延迟峰值 < 50ms（每片之间事件循环都能转圈）：${maxB < 50e6}`);
console.log(`[结论] 切片版 max 不到长任务版的 1/5（分辨率 20ms 决定了下限）：${maxA / maxB > 5}`);
console.log('');

// ---------- eventLoopUtilization ----------
console.log('--- eventLoopUtilization：区分「CPU 忙」与「IO 等待」---');
let u = eventLoopUtilization(); // 起点
await new Promise((r) => setTimeout(r, 100)); // 空闲 100ms（纯等待）
const idleU = eventLoopUtilization(u).utilization;
u = eventLoopUtilization();
busy(200); // 阻塞 200ms（纯 CPU）
const busyU = eventLoopUtilization(u).utilization;
console.log(`[实测] 空闲 100ms 期间利用率 = ${idleU.toFixed(2)}（实测，随机器变化）`);
console.log(`[实测] 阻塞 200ms 期间利用率 = ${busyU.toFixed(2)}（实测，随机器变化）`);
console.log(`[结论] 利用率 ≈ 0（等 IO）vs ≈ 1（CPU 忙）：归因第一步 —— 先分类，再选工具：${idleU < 0.1 && busyU > 0.95}`);
console.log('[结论] Node 没有 longtask 条目（那是浏览器 PerformanceObserver 的），这对 API 是 Node 的对应物');
