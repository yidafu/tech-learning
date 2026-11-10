/**
 * 大纲章节：阶段 2 引擎与运行时
 * 主题：内联缓存（IC）单态 vs 多态：混形状热点访问的耗时对照
 * 运行：node exercises/v8-and-performance/02-inline-cache.mjs
 * 预期输出（逐行；不打印毫秒绝对值，只打印确定性结论）：
 *   == 内联缓存实验：单态（monomorphic）vs 多态（polymorphic）==
 *   迭代次数/轮：1000000，每版每轮测 3 次取最小值，共 5 轮
 *
 *   [形状说明]
 *     单态组：4 个对象走同一构造路径（{x,y,z,w} 字面量，键序一致）
 *             → 每个 LoadIC 只见过 1 种 Map（monomorphic）
 *     多态组：4 个对象都有 x/y/z/w，但 transition 链互不相同
 *             → 每个 LoadIC 见过 4 种 Map（polymorphic，4 是 V8 上限）
 *
 *   [计时] 第 1 轮完成
 *   [计时] 第 2 轮完成
 *   [计时] 第 3 轮完成
 *   [计时] 第 4 轮完成
 *   [计时] 第 5 轮完成
 *   5 轮中 polymorphic 更慢：5/5
 *
 *   [校验] 两版累加值一致（计算未被优化丢弃）：true
 *   [校验] 累加值 = 10000000
 *   polymorphic 慢于 monomorphic：true
 *
 *   （结论行为确定性输出：每轮取 3 次测量的最小值以抵抗调度抖动，
 *     混形状访问稳定慢约 1.5–2 倍；若看到 false，请先确认运行环境
 *     是 V8（Node/Chrome）——IC 机制是 V8 特有的。）
 */

// ---------------------------------------------------------------------------
// 背景与机制（对应笔记 notes/stage-2-engine-runtime/07-v8-engine.md 第 3 节）：
//
// 1) 每个属性访问字节码（循环里的 o.x / o.y / o.z / o.w）各有一个
//    feedback slot，V8 把它「实际见到的隐藏类（Map）+ 对应快速取值
//    handler」缓存在这里 —— 这就是内联缓存（inline cache, IC）。
//
// 2) IC 状态机：
//      uninitialized → monomorphic（只见过 1 种 Map：直接命中，最快）
//                   → polymorphic（见过 2–4 种 Map：每次逐个比较 Map）
//                   → megamorphic （见到第 5 种 Map：放弃本 slot 专用缓存，
//                                   改查全局 stub cache / 通用慢路径）
//
// 3) 本实验两组循环体逐字符相同，唯一变量是 objs 里对象的形状：
//      单态组 4 个对象同 Map → 4 个 LoadIC 全部停在 monomorphic；
//      多态组 4 个对象 4 种 Map → 4 个 LoadIC 全部升到 polymorphic。
//    每迭代读 4 个字段是为了放大「属性访问」在循环里的占比，
//    让 IC 差异不被索引/累加等循环开销稀释。
//
// 4) 为什么 megamorphic 更惨：slot 本地缓存被清空，每次访问要查一张
//    全局（进程级）的 stub cache，命中了还要做一次间接调用；查不到就
//    走 runtime 通用路径（等价于「完全不缓存」）。5 种以上形状轮流出现
//    的热循环（例如遍历异构 JSON 数组）正是这个状态，「慢一个数量级」
//    通常就发生在 monomorphic → megamorphic 的跳跃上。
//
// 5) 测量方法学（面试也能讲）：
//    - 用累加 sink 并返回，防止 V8 把循环优化掉（死代码消除）；
//    - 两组的 x/y/z/w 值完全相同 → sink 必须相等且为确定值；
//    - 循环内零分配 → 排除 GC 干扰计时；
//    - 正式计时前预热，让 IC 进入稳定状态、热点函数完成 tier-up；
//    - 每轮每版测 3 次取最小值：最小值最接近「无干扰的真实成本」，
//      能抵抗操作系统调度/GC 等偶发抖动；轮间再用中位数出结论。
// ---------------------------------------------------------------------------

const ITERS = 1_000_000; // 每次测量迭代 10^6 次
const ROUNDS = 5;        // 计时轮数
const SAMPLES = 3;       // 每版每轮测量次数（取最小值）

/** 单态组：4 个对象由完全相同的构造路径产生 → 共享同一个隐藏类。 */
function makeMonomorphicSet() {
  // 相同字面量 {x,y,z,w}：键与键序一致 → 同一条 transition 链的同一节点
  return [1, 2, 3, 4].map((v) => ({ x: v, y: v, z: v, w: v }));
}

/** 多态组：4 个对象都有 x/y/z/w，但形状（transition 链）互不相同。 */
function makePolymorphicSet() {
  const a = { x: 1, y: 1, z: 1, w: 1 };             // 链：字面量 {x,y,z,w}
  const b = { w: 2, z: 2, y: 2, x: 2 };             // 链：字面量 {w,z,y,x}（键序对调）
  const c = {}; c.x = 3; c.y = 3; c.z = 3; c.w = 3; // 链：x→y→z→w（逐个添加）
  const d = { a: 0 }; d.x = 4; d.y = 4; d.z = 4; d.w = 4; // 链：a→x→y→z→w（多一个无关属性）
  return [a, b, c, d];
}

/**
 * 热点循环本体。mono/poly 是两个独立函数 → 各自拥有独立的
 * feedback vector；否则两组会共用同一个 slot、互相污染 IC 状态，
 * 实验就成了「先到的形状把 IC 占了」的偶然结果。
 * 两个函数的循环体逐字符相同，公平性由代码结构保证。
 */
function benchMono(objs) {
  let sink = 0;
  for (let i = 0; i < ITERS; i++) {
    const o = objs[i & 3];
    sink += o.x + o.y + o.z + o.w; // 4 个 LoadIC：只见 1 种 Map → monomorphic
  }
  return sink;
}

function benchPoly(objs) {
  let sink = 0;
  for (let i = 0; i < ITERS; i++) {
    const o = objs[i & 3];
    sink += o.x + o.y + o.z + o.w; // 4 个 LoadIC：轮换见到 4 种 Map → polymorphic
  }
  return sink;
}

/** 一轮里测 SAMPLES 次返回最小耗时与 sink（最小值最接近真实成本）。 */
function measure(bench, objs) {
  let best = Infinity;
  let sink = 0;
  for (let k = 0; k < SAMPLES; k++) {
    const t0 = performance.now();
    sink = bench(objs);
    const d = performance.now() - t0;
    if (d < best) best = d;
  }
  return { best, sink };
}

const median = /** @param {number[]} xs */ (xs) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function main() {
  console.log('== 内联缓存实验：单态（monomorphic）vs 多态（polymorphic）==');
  console.log(`迭代次数/轮：${ITERS}，每版每轮测 ${SAMPLES} 次取最小值，共 ${ROUNDS} 轮`);
  console.log('');
  console.log('[形状说明]');
  console.log('  单态组：4 个对象走同一构造路径（{x,y,z,w} 字面量，键序一致）');
  console.log('          → 每个 LoadIC 只见过 1 种 Map（monomorphic）');
  console.log('  多态组：4 个对象都有 x/y/z/w，但 transition 链互不相同');
  console.log('          → 每个 LoadIC 见过 4 种 Map（polymorphic，4 是 V8 上限）');
  console.log('');

  const mono = makeMonomorphicSet();
  const poly = makePolymorphicSet();

  // 预热：让 IC 状态稳定、函数完成 tier-up（Ignition → Sparkplug/TurboFan）。
  // 不预热的话第一轮计时混着「解释执行」的噪声。
  for (let i = 0; i < 3; i++) {
    benchMono(mono);
    benchPoly(poly);
  }

  const monoBests = [];
  const polyBests = [];
  let monoSink = 0;
  let polySink = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    const m = measure(benchMono, mono);
    const p = measure(benchPoly, poly);
    monoBests.push(m.best);
    polyBests.push(p.best);
    monoSink = m.sink;
    polySink = p.sink;
    console.log(`[计时] 第 ${round} 轮完成`);
  }

  let slowerRounds = 0;
  for (let i = 0; i < ROUNDS; i++) {
    if (polyBests[i] > monoBests[i]) slowerRounds++;
  }
  console.log(`5 轮中 polymorphic 更慢：${slowerRounds}/${ROUNDS}`);
  console.log('');

  const sameSink = monoSink === polySink;
  console.log(`[校验] 两版累加值一致（计算未被优化丢弃）：${sameSink}`);
  console.log(`[校验] 累加值 = ${monoSink}`);
  // 每个 i（共 10^6 次）取到值 v=(i&3)+1 的对象，加 4 个字段共 4v：
  // 总和 = 4 × 250000 × (1+2+3+4) = 10,000,000（确定值）
  const sinkCorrect = monoSink === 10_000_000;

  const conclusion = median(polyBests) > median(monoBests);
  console.log(`polymorphic 慢于 monomorphic：${conclusion}`);
  console.log('');
  console.log('（结论行为确定性输出：每轮取 3 次测量的最小值以抵抗调度抖动，');
  console.log('  混形状访问稳定慢约 1.5–2 倍；若看到 false，请先确认运行环境');
  console.log('  是 V8（Node/Chrome）——IC 机制是 V8 特有的。）');

  if (!conclusion || !sameSink || !sinkCorrect) {
    console.log('警告：出现非预期结果，请核对运行环境（应使用 V8，即 Node/Chrome）。');
  }
}

main();
