/**
 * 大纲章节：阶段 2 引擎与运行时（性能工程方法论）
 * 主题：CPU profile 采样剖析：self vs total 的区别；在进程内归因热点函数并产出 .cpuprofile
 * 运行：node exercises/performance-engineering/01-cpu-profile.mjs
 * 预期输出（标注「实测」的行数值随机器变化，其余为确定结论）：
 *   == CPU profile：采样式剖析与 self/total 归因 ==
 *   [设定] 采样间隔 = 100µs；负载：wrapper() 依次调用 hotInner()（大）与 mediumInner()（中）
 *   [原理] profile = nodes 调用树（每节点带 hitCount）+ samples 时间序列；self = hitCount，total = 子树 hitCount 合计
 *   [实测] 采样总命中 ≈ NNNNN 个样本（实测，随机器变化）
 *   [实测] self 占比 top3：hotInner 81.4%，mediumInner 18.6%，wrapper 0.0%（实测样例：Apple M4 Pro / Node 24.10.0，随机器变化）
 *   [结论] self 第一名 = hotInner：true
 *   [结论] wrapper 的 self ≈ 0 但 total ≥ hotInner 的 total（它包住了两个热点）：true
 *   [校验] Collatz 步数校验和 = 337075022（确定值，防死代码消除）
 *   [产物] .cpuprofile 已写入 <临时目录路径>（路径随运行变化）
 *   [产物] 用 Chrome DevTools → Performance → Load profile，或 speedscope.app 打开同一文件
 *   [结论] 「优化谁」看 self 宽条（自己耗 CPU），「归因到哪个模块」看 total（谁包住了宽条）
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/36-performance-engineering.md 第 2、3 节）：
//
// 1. V8 的 CPU profiler 是采样式（sampling）：按设定间隔暂停线程、记录当前
//    调用栈。样本聚合后：某函数出现在栈顶的次数 = self time 的近似；
//    某函数出现在栈上任意位置的次数 = total time 的近似。它是统计量，
//    不是精确的调用树计时 —— 样本越多（负载越长/间隔越短）误差越小。
//
// 2. .cpuprofile 的数据结构：nodes[]（调用树，每节点 callFrame.functionName
//    + hitCount）+ samples[]（按时间序的节点 id）+ timeDeltas[]。
//    Chrome DevTools 与 speedscope 画的火焰图就是这棵树的聚合。
//
// 3. 本练习用 node:inspector/promises 的 Session 在进程内启停 profiler
//    （与 node --cpu-prof、DevTools 录制走同一套 Inspector 协议），再手工
//    聚合 nodes 的 hitCount —— 把「火焰图的宽 = self 样本数」亲手算一遍。
//
// 4. 负载选择 Collatz 步数统计：分支密集、无法被向量化，是稳定的纯 CPU
//    负载；且结果是确定整数，可作校验和防死代码消除（衔接笔记 07 的
//    「结果不用会被优化掉」）。
// ---------------------------------------------------------------------------

import { Session } from 'node:inspector/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---- 负载：Collatz 步数（分支密集、结果确定）----
// 注意：两个热点函数各自内联了循环体、且体量不小 —— 如果把循环放在共享的
// 小助手函数里，TurboFan 会把它内联进调用方，采样帧就只剩下助手函数名，
// 无法演示「按函数归因」。真实项目里「小函数被内联」正是 profile 里
// 常见的归因陷阱之一（看到的是内联展开后的帧）。
function hotInner() {
  let total = 0;
  for (let n = 1; n < 2_000_000; n++) {
    let v = n;
    let steps = 0;
    while (v !== 1) {
      v = v % 2 === 0 ? v / 2 : 3 * v + 1;
      steps++;
    }
    total += steps;
  }
  return total;
}
function mediumInner() {
  let total = 0;
  for (let n = 2_000_000; n < 2_400_000; n++) {
    let v = n;
    let steps = 0;
    while (v !== 1) {
      v = v % 2 === 0 ? v / 2 : 3 * v + 1;
      steps++;
    }
    total += steps;
  }
  return total;
}
function wrapper() {
  // 用循环驱动两个阶段：让 wrapper 自己也有可采样的帧（self 依然 ≈ 0）
  let acc = 0;
  for (const phase of [hotInner, mediumInner]) acc += phase();
  return acc;
}

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.setSamplingInterval', { interval: 100 }); // 100µs

console.log('== CPU profile：采样式剖析与 self/total 归因 ==');
console.log('[设定] 采样间隔 = 100µs；负载：wrapper() 依次调用 hotInner()（大）与 mediumInner()（中）');
console.log('[原理] profile = nodes 调用树（每节点带 hitCount）+ samples 时间序列；self = hitCount，total = 子树 hitCount 合计');

await session.post('Profiler.start');
const checksum = wrapper(); // 被剖析的负载（结果要用，防死代码消除）
const { profile } = await session.post('Profiler.stop');
session.disconnect();

// ---- 手工聚合：self = hitCount；total = 子树合计 ----
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const selfHits = new Map(); // functionName -> self 样本
const totalHits = new Map(); // functionName -> 子树合计
let totalSamples = 0;

function subtree(node) {
  let sum = node.hitCount ?? 0;
  for (const c of node.children ?? []) sum += subtree(byId.get(c));
  return sum;
}
for (const node of profile.nodes) {
  const name = node.callFrame.functionName || '(anonymous)';
  if (name.startsWith('(')) continue; // 过滤 (root)/(program)/(garbage collector) 等系统帧
  selfHits.set(name, (selfHits.get(name) ?? 0) + (node.hitCount ?? 0));
  totalHits.set(name, (totalHits.get(name) ?? 0) + subtree(node));
  totalSamples += node.hitCount ?? 0;
}

console.log(`[实测] 采样总命中 ≈ ${totalSamples} 个样本（实测，随机器变化）`);
const top3 = [...selfHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
const pct = (n) => ((n / totalSamples) * 100).toFixed(1);
console.log(
  `[实测] self 占比 top3：${top3.map(([name, n]) => `${name} ${pct(n)}%`).join('，')}（实测样例，随机器变化）`,
);
console.log(`[结论] self 第一名 = hotInner：${top3[0]?.[0] === 'hotInner'}`);
const wrapperTotal = totalHits.get('wrapper') ?? 0;
const hotTotal = totalHits.get('hotInner') ?? 0;
console.log(
  `[结论] wrapper 的 self ≈ 0 但 total ≥ hotInner 的 total（它包住了两个热点）：${wrapperTotal >= hotTotal && (selfHits.get('wrapper') ?? 0) / totalSamples < 0.05}`,
);
console.log(`[校验] Collatz 步数校验和 = ${checksum}（确定值，防死代码消除）`);

// ---- 产物：标准 .cpuprofile，可离线分析 ----
const outPath = join(tmpdir(), `cpu-profile-demo-${Date.now()}.cpuprofile`);
writeFileSync(outPath, JSON.stringify(profile));
console.log(`[产物] .cpuprofile 已写入 ${outPath}（路径随运行变化）`);
console.log('[产物] 用 Chrome DevTools → Performance → Load profile，或 speedscope.app 打开同一文件');
console.log('[结论] 「优化谁」看 self 宽条（自己耗 CPU），「归因到哪个模块」看 total（谁包住了宽条）');
