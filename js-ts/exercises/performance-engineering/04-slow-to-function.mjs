/**
 * 大纲章节：阶段 2 引擎与运行时（性能工程方法论）
 * 主题：从「发现慢」到「定位到函数」的完整流程：指标 → 分类 → 分段插桩 → CPU profile → 修复 → 预算
 * 运行：node --allow-natives-syntax exercises/performance-engineering/04-slow-to-function.mjs
 *       （--allow-natives-syntax 只用于 %NeverOptimizeFunction：阻止小函数被 TurboFan 内联，
 *          保证 profile 里能看到函数级帧 —— 真实项目不这么做，这是教学演示；内联导致的
 *          归因塌缩见 exercises/performance-engineering/01 的注释）
 * 预期输出（标注「实测」的行数值随机器变化，其余为确定结论）：
 *   == 性能定位六步法：一个慢接口的完整复盘 ==
 *   [场景] handler(req) = parse() → transform() → render()；transform 里藏着 O(n²)（逐条 unshift 到队头）
 *
 *   第 1 步 · 定义指标：8 次调用的 P95（不是平均值 —— 尾部才是用户感知）
 *   [实测] 修复前 P95 = 283.1 ms（实测样例：Apple M4 Pro / Node 24.10.0，随机器变化）
 *   第 2 步 · 分类：eventLoopUtilization ≈ 1 → CPU 型（不是 IO 等待型）
 *   [实测] 采样区间利用率 = 1.00（实测，随机器变化）
 *   [结论] CPU 型成立（utilization > 0.95）：true
 *   第 3 步 · 分段插桩：performance.now() 切三段
 *   [实测] parse 1.8% / transform 97.9% / render 0.2%（实测样例，随机器变化）
 *   [结论] transform 是热点段（占比 > 90%）：true
 *   第 4 步 · CPU profile 归因到函数（进程内 Inspector，采样间隔 100µs）
 *   [实测] self 第一名 = insertFront（占比 99.4%，实测样例，随机器变化）
 *   [结论] profile 定位到函数级（top1 在 transform/insertFront 中）：true
 *   第 5 步 · 修复：unshift（O(n²)）→ push + reverse（O(n)）
 *   [结论] 修复前后输出完全一致（先证等价再谈性能）：true
 *   [实测] 修复后 P95 = 2.3 ms（实测，随机器变化）
 *   [结论] P95 降到修复前的 1/10 以下：true
 *   第 6 步 · 防回归：把预算写成断言（CI 里跑同一脚本）
 *   [结论] 预算检查（修复后 P95 < 20ms）：true
 *   [总结] 指标(P95) → 分类(ELU) → 插桩(分段) → profile(函数) → 修复(等价) → 预算(CI)
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/36-performance-engineering.md 第 6 节）：
//
// 1. 六步法每一步都有明确的「产出物」：
//    指标（P95 具体多少 ms）→ 分类（CPU/内存/IO）→ 热点段（哪个阶段）→
//    热点函数（profile self 第一名）→ 等价修复 → 预算断言。
//    跳步的典型代价：没做分类就抓 CPU profile（IO 等待型问题 profile 里
//    什么都没有）；没证等价就优化（快了但算错）。
//
// 2. 用 P95 而不是平均值：尾部延迟才是用户「偶尔很卡」的来源；平均会被
//    快请求稀释。样本量小（本例 8 次）只是演示，生产取足够窗口。
//
// 3. 故障注入：transform 逐条 insertFront（unshift 到队头）—— 每插入一条
//    都要把后面全部元素后移一格，O(n²)；修复版 push 进队尾再 reverse，
//    语义等价（最终顺序相同）但 O(n)。
//
// 4. 第 4 步复用 01 的进程内 Inspector 采样：self 第一名应是 transform
//    （或被 V8 内联前的助手 insertFront —— 名字随内联决策而变，
//    所以断言写成「top1 ∈ {transform, insertFront}」）。
// ---------------------------------------------------------------------------

import { Session } from 'node:inspector/promises';
import { performance } from 'node:perf_hooks';

const N = 40_000; // 每个请求的条目数（unshift 版 O(n²) ≈ 100ms 量级；再小 memmove 快到测不出差异）

// ---- 三段式 handler（parse → transform → render），transform 藏着 O(n²) ----
function parse(req) {
  return req.items.map((it, i) => ({ id: i, ...it }));
}
function insertFront(arr, item) {
  arr.unshift(item); // 每次都要把整段数组后移 —— O(n²) 的来源
}
function transform(items) {
  const out = [];
  for (const it of items) insertFront(out, it);
  return out;
}
function render(items) {
  return items.reduce((s, it) => s + it.id, 0);
}
function handlerBroken(req) {
  return render(transform(parse(req)));
}
function transformFixed(items) {
  const out = [];
  for (const it of items) out.push(it); // push 进队尾 O(1)……
  out.reverse(); // ……再整体反转一次 O(n)：最终顺序与 unshift 版完全一致
  return out;
}
function handlerFixed(req) {
  return render(transformFixed(parse(req)));
}

const mkReq = () => ({ items: Array.from({ length: N }, (_, i) => ({ v: i })) });
const p95 = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(0.95 * (xs.length - 1))];

// 教学演示专用：阻止 transform/insertFront 被 TurboFan 内联（内联会把采样帧
// 塌缩进调用方，profile 里就只剩顶层 dispatch 帧 —— 01 号练习演示过这个坑）。
// 生产代码绝不做这件事：这里是为了让「归因到函数」稳定可见。
%NeverOptimizeFunction(insertFront);
%NeverOptimizeFunction(transform);

console.log('== 性能定位六步法：一个慢接口的完整复盘 ==');
console.log('[场景] handler(req) = parse() → transform() → render()；transform 里藏着 O(n²)（逐条 unshift 到队头）');
console.log('');

// ---- 第 1 步：指标 ----
console.log('第 1 步 · 定义指标：8 次调用的 P95（不是平均值 —— 尾部才是用户感知）');
const brokenTimes = [];
for (let i = 0; i < 8; i++) {
  const t0 = performance.now();
  handlerBroken(mkReq());
  brokenTimes.push(performance.now() - t0);
}
const brokenP95 = p95(brokenTimes);
console.log(`[实测] 修复前 P95 = ${brokenP95.toFixed(1)} ms（实测，随机器变化）`);

// ---- 第 2 步：分类 ----
console.log('第 2 步 · 分类：eventLoopUtilization ≈ 1 → CPU 型（不是 IO 等待型）');
await new Promise((r) => setTimeout(r, 10)); // 先让事件循环转一圈：ELU 的计数按圈结算
const u0 = performance.eventLoopUtilization();
handlerBroken(mkReq());
const uCpu = performance.eventLoopUtilization(u0).utilization;
console.log(`[实测] 采样区间利用率 = ${uCpu.toFixed(2)}（实测，随机器变化）`);
console.log(`[结论] CPU 型成立（utilization > 0.95）：${uCpu > 0.95}`);

// ---- 第 3 步：分段插桩 ----
console.log('第 3 步 · 分段插桩：performance.now() 切三段');
const req = mkReq();
let t = performance.now();
const parsed = parse(req);
const tParse = performance.now() - t;
t = performance.now();
const transformed = transform(parsed);
const tTransform = performance.now() - t;
t = performance.now();
render(transformed);
const tRender = performance.now() - t;
const total = tParse + tTransform + tRender;
const share = (x) => ((x / total) * 100).toFixed(1);
console.log(`[实测] parse ${share(tParse)}% / transform ${share(tTransform)}% / render ${share(tRender)}%（实测样例，随机器变化）`);
console.log(`[结论] transform 是热点段（占比 > 90%）：${tTransform / total > 0.9}`);

// ---- 第 4 步：CPU profile 归因到函数 ----
console.log('第 4 步 · CPU profile 归因到函数（进程内 Inspector，采样间隔 100µs）');
const profileItems = parse(mkReq()); // 数据准备放在剖析区外：profile 里不该看到 mkReq/parse
const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.setSamplingInterval', { interval: 100 });
await session.post('Profiler.start');
for (let i = 0; i < 3; i++) transform(profileItems); // 只剖析热点段
const { profile } = await session.post('Profiler.stop');
session.disconnect();
const selfHits = new Map();
let totalSamples = 0;
for (const node of profile.nodes) {
  const name = node.callFrame.functionName;
  if (!name || name.startsWith('(')) continue;
  selfHits.set(name, (selfHits.get(name) ?? 0) + (node.hitCount ?? 0));
  totalSamples += node.hitCount ?? 0;
}
const top = [...selfHits.entries()].sort((a, b) => b[1] - a[1])[0];
console.log(`[实测] self 第一名 = ${top[0]}（占比 ${((top[1] / totalSamples) * 100).toFixed(1)}%，实测样例，随机器变化）`);
console.log(`[结论] profile 定位到函数级（top1 在 transform/insertFront 中）：${['transform', 'insertFront'].includes(top[0])}`);

// ---- 第 5 步：修复 ----
console.log('第 5 步 · 修复：unshift（O(n²)）→ push + reverse（O(n)）');
// 等价性要「顺序敏感」地证：render 只做求和（对顺序不敏感），单比 r1 === r2
// 发现不了顺序错乱 —— 所以先逐位对比 transform 两版的元素顺序，再比最终输出。
const eqItems = parse(mkReq());
const tBroken = transform(eqItems);
const tFixed = transformFixed(eqItems);
const sameOrder = tBroken.length === tFixed.length && tBroken.every((it, i) => it === tFixed[i]);
const r1 = render(tBroken);
const r2 = render(transformFixed(parse(mkReq())));
console.log(`[结论] 修复前后输出完全一致（先证等价再谈性能）：${sameOrder && r1 === r2}`);
const fixedTimes = [];
for (let i = 0; i < 8; i++) {
  const t0 = performance.now();
  handlerFixed(mkReq());
  fixedTimes.push(performance.now() - t0);
}
const fixedP95 = p95(fixedTimes);
console.log(`[实测] 修复后 P95 = ${fixedP95.toFixed(1)} ms（实测，随机器变化）`);
console.log(`[结论] P95 降到修复前的 1/10 以下：${fixedP95 < brokenP95 / 10}`);

// ---- 第 6 步：防回归 ----
console.log('第 6 步 · 防回归：把预算写成断言（CI 里跑同一脚本）');
console.log(`[结论] 预算检查（修复后 P95 < 20ms）：${fixedP95 < 20}`);
console.log('[总结] 指标(P95) → 分类(ELU) → 插桩(分段) → profile(函数) → 修复(等价) → 预算(CI)');
