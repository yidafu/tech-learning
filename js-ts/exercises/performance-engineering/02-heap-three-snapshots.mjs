/**
 * 大纲章节：阶段 2 引擎与运行时（性能工程方法论）
 * 主题：三快照法排查内存泄漏：泄漏版 vs 修复版，用进程内堆统计做三个测量点的对比
 * 运行：node --expose-gc exercises/performance-engineering/02-heap-three-snapshots.mjs
 *        （必须带 --expose-gc：三快照法的纪律是「GC 后再测」，实验环境用它拿到确定性）
 * 预期输出（标注「实测」的行数值随机器变化，其余为确定结论）：
 *   == 三快照法：泄漏版 vs 修复版 ==
 *   [纪律] 泄漏判据（笔记 06）：重复操作后 Retained 单调增长，且 GC 后不回落 —— 不是「内存高」
 *   [方法] 测量点 A（基线）→ 泄漏操作 ×3 轮（每轮后 GC、测量）→ 释放引用 → GC → 测量收尾
 *
 *   --- 泄漏版：模块级 Map 强引用会话对象 ---
 *   [实测] A 基线（GC 后）    used_heap = 3.9 MB（实测样例：Apple M4 Pro / Node 24.10.0，随机器变化）
 *   [实测] 第 1 轮后（GC 后）used_heap = 16.2 MB（实测，随机器变化）
 *   [实测] 第 2 轮后（GC 后）used_heap = 28.5 MB（实测，随机器变化）
 *   [实测] 第 3 轮后（GC 后）used_heap = 40.8 MB（实测，随机器变化）
 *   [结论] 泄漏版三轮单调增长（GC 也不回落）：true
 *   [实测] 置 null + GC 后  used_heap = 4.3 MB（实测，随机器变化）
 *   [结论] 释放容器后回落（证明泄漏边就是这个容器）：true
 *
 *   --- 修复版：同样的分配，但不让容器延长对象生命周期（WeakMap 存元数据）---
 *   [实测] 修复版基线 3.9 MB → 三轮后（GC 后）used_heap = 4.0 MB（实测，随机器变化）
 *   [结论] 修复版 GC 后回落到基线量级（< 基线 + 8MB）：true
 *   [结论] 泄漏版第 3 轮比修复版三轮后高出 > 20MB：true
 *
 *   --- 落盘快照怎么做（生产排障）---
 *   [说明] 本练习用 v8.getHeapStatistics() 在进程内取测量点，不落盘 .heapsnapshot（大堆产物可达数百 MB）
 *   [说明] 生产用 v8.writeHeapSnapshot()（代码触发）或 node --heapsnapshot-signal=SIGUSR2 app.js（信号触发，产物拖入 Chrome DevTools Memory 面板）
 *   [说明] DevTools 面板里按 Retained Size 排序、展开 Retainers 读引用链 —— 「谁在引用它」就是泄漏边（同笔记 06 场景 5）
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/36-performance-engineering.md 第 4 节；
//       概念骨架（三快照步骤、Retainers）在笔记 06 第 6 节已给，本练习把它跑成代码）：
//
// 1. 三快照法的三个测量点：A（操作前）→ 重复执行疑似泄漏操作 N 次 → B →
//    强制 GC → C。判定看「B→C 与 A→C 的增量」：重复操作后仍单调增长、
//    GC 后不回落 = 泄漏。实验环境用 --expose-gc 的 gc() 拿到确定性；
//    生产环境没有这个确定性 —— 但「GC 后测量」的纪律不变（DevTools
//    面板的垃圾桶按钮 / --expose-gc 只是手段）。
//
// 2. 泄漏场景与笔记 06 的场景 5 同源：模块级 Map 强引用「本应请求级生命
//    周期」的会话对象 —— Map 的键槽是强引用，对象活到进程死。
//    修复：元数据不该延长对象生命周期 → WeakMap（键弱引用）。
//
// 3. 本练习把「拍快照文件」换成 v8.getHeapStatistics() 的进程内测量：
//    数值语义与快照面板的 Heap Used 同源。落盘快照用于离线分析
//    （Retainers 引用链），三个测量点的纪律两者一致。
//
// 4. 每轮分配 ~10MB 的普通对象（on-heap）。若泄漏的是 Buffer，看的则是
//    process.memoryUsage().external（衔接 exercises/node-runtime/01）——
//    「JS 堆没涨、rss 涨了」先查 external。
// ---------------------------------------------------------------------------

import v8 from 'node:v8';
import process from 'node:process';

if (typeof globalThis.gc !== 'function') {
  console.error('请带 --expose-gc 运行：node --expose-gc exercises/performance-engineering/02-heap-three-snapshots.mjs');
  process.exit(1);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
const settle = () => {
  globalThis.gc();
  globalThis.gc(); // 连拍两次：终结器/弱引用清理由下一轮 GC 完成，双保险
  return v8.getHeapStatistics().used_heap_size;
};

// 每轮的「泄漏操作」：模拟 400 个会话，每个会话带 500 条历史记录（≈ 8MB/轮）
function oneLeakRound(sessions) {
  for (let i = 0; i < 400; i++) {
    const user = { id: i, name: `user-${i}` };
    const meta = { lastSeen: Date.now(), history: Array.from({ length: 500 }, (_, k) => `${i}-${k}-history-entry`) };
    sessions.set(user, meta); // Map 强引用键：user 活到 Map 死（= 进程死）
  }
}

console.log('== 三快照法：泄漏版 vs 修复版 ==');
console.log('[纪律] 泄漏判据（笔记 06）：重复操作后 Retained 单调增长，且 GC 后不回落 —— 不是「内存高」');
console.log('[方法] 测量点 A（基线）→ 泄漏操作 ×3 轮（每轮后 GC、测量）→ 释放引用 → GC → 测量收尾');
console.log('');

console.log('--- 泄漏版：模块级 Map 强引用会话对象 ---');
let leakySessions = new Map(); // let：后面要演示「释放容器本身」
const baseline = settle();
console.log(`[实测] A 基线（GC 后）    used_heap = ${mb(baseline)} MB（实测，随机器变化）`);
const afterRounds = [];
for (let round = 1; round <= 3; round++) {
  oneLeakRound(leakySessions);
  afterRounds.push(settle());
  console.log(`[实测] 第 ${round} 轮后（GC 后）used_heap = ${mb(afterRounds[round - 1])} MB（实测，随机器变化）`);
}
const monotonic = baseline < afterRounds[0] && afterRounds[0] < afterRounds[1] && afterRounds[1] < afterRounds[2];
console.log(`[结论] 泄漏版三轮单调增长（GC 也不回落）：${monotonic}`);
leakySessions = null; // 剪断唯一的泄漏边：容器本身
const afterDrop = settle();
console.log(`[实测] 置 null + GC 后  used_heap = ${mb(afterDrop)} MB（实测，随机器变化）`);
console.log(`[结论] 释放容器后回落（证明泄漏边就是这个容器）：${afterDrop < baseline + 8 * 1024 * 1024}`);
console.log('');

console.log('--- 修复版：同样的分配，但不让容器延长对象生命周期（WeakMap 存元数据）---');
function oneLeakRoundFixed(meta) {
  for (let i = 0; i < 400; i++) {
    const user = { id: i, name: `user-${i}` }; // 本轮局部变量，轮结束即不可达
    // 分配量与泄漏版完全一致 —— 差异只在容器语义：WeakMap 的键弱引用，
    // user 不可达时条目（连同 value）一起可回收
    meta.set(user, { lastSeen: Date.now(), history: Array.from({ length: 500 }, (_, k) => `${i}-${k}-history-entry`) });
  }
}
const fixedBaseline = settle();
const fixedMeta = new WeakMap(); // 键弱引用：会话对象不可达即可回收
for (let round = 1; round <= 3; round++) oneLeakRoundFixed(fixedMeta);
const fixedAfter = settle();
console.log(`[实测] 修复版基线 ${mb(fixedBaseline)} MB → 三轮后（GC 后）used_heap = ${mb(fixedAfter)} MB（实测，随机器变化）`);
console.log(`[结论] 修复版 GC 后回落到基线量级（< 基线 + 8MB）：${fixedAfter < fixedBaseline + 8 * 1024 * 1024}`);
console.log(`[结论] 泄漏版第 3 轮比修复版三轮后高出 > 20MB：${afterRounds[2] - fixedAfter > 20 * 1024 * 1024}`);
console.log('');

console.log('--- 落盘快照怎么做（生产排障）---');
console.log('[说明] 本练习用 v8.getHeapStatistics() 在进程内取测量点，不落盘 .heapsnapshot（大堆产物可达数百 MB）');
console.log('[说明] 生产用 v8.writeHeapSnapshot()（代码触发）或 node --heapsnapshot-signal=SIGUSR2 app.js（信号触发，产物拖入 Chrome DevTools Memory 面板）');
console.log('[说明] DevTools 面板里按 Retained Size 排序、展开 Retainers 读引用链 —— 「谁在引用它」就是泄漏边（同笔记 06 场景 5）');
