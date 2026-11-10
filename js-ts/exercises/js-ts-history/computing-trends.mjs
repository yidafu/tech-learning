// exercises/js-ts-history/computing-trends.mjs
// 大纲章节：阶段 5 补充专题（notes/stage-5-topics/28-js-ts-history.md 第二部分：计算机的变化与语言趋势）
// 主题：从 JS 里直接观察「计算机本身的变化」——多核、IEEE 754、字节序、共享内存、JIT 暖机
// 运行：node exercises/js-ts-history/computing-trends.mjs
// 预期输出：
//   == 1. 多核时代，主线程仍是 1 个（1995 年单核单线程的遗产；Worker 是 2009 年的补丁）
//   navigator.hardwareConcurrency: <你机器的逻辑核数，Apple M 系列 ≥ 8>
//   os.cpus().length: <同上或略有出入>
//   == 2. 所有数都是 IEEE 754 double（1985）——2^53 是整数的安全上限
//   true        （Number.MAX_SAFE_INTEGER === 2**53 - 1）
//   true        （2**53 === 2**53 + 1：超出 53 位有效位，+1 被舍没了）
//   false       （0.1 + 0.2 === 0.3：二进制浮点表示误差）
//   false       （BigInt：2n**53n + 1n === 2n**53n —— ES2020 才有精确整数）
//   == 3. 字节序：TypedArray 让硬件的内存布局从 JS 里直接可见
//   1           （Uint32 的 0x00000001 在内存里第一个字节是 0x01 → 小端；x86-64/arm64 一律小端）
//   == 4. 共享内存与 Spectre 的回撤：Node 没有跨源概念，SAB/Atomics 一直可用
//   function
//   0           （Atomics.add 返回旧值）
//   41
//   == 5. JIT 暖机（V8 2008 的遗产；逐分片计时）
//   分片 1: ~28 ms ← 解释器/低层执行
//   分片 2~6: 逐级降到 ~24 ms 并稳定 ← 优化层接管
//   注意实测（Node v24，M 系列机器）：简单整数循环只有 ~15% 差距——
//   现代 V8 分层很快（Sparkplug/Maglev 早早上位），经典「10 倍暖机差」
//   需要更复杂的工作负载才看得到，分层全景见笔记 07。

import os from "node:os";

console.log("== 1. 多核时代，主线程仍是 1 个（1995 年单核单线程的遗产；Worker 是 2009 年的补丁）");
console.log("navigator.hardwareConcurrency:", navigator.hardwareConcurrency);
console.log("os.cpus().length:", os.cpus().length);

console.log("\n== 2. 所有数都是 IEEE 754 double（1985）——2^53 是整数的安全上限");
console.log(Number.MAX_SAFE_INTEGER === 2 ** 53 - 1); // true
console.log(2 ** 53 === 2 ** 53 + 1); // true
console.log(0.1 + 0.2 === 0.3); // false
console.log(2n ** 53n + 1n === 2n ** 53n); // false

console.log("\n== 3. 字节序：TypedArray 让硬件的内存布局从 JS 里直接可见");
const u8 = new Uint8Array(new Uint32Array([1]).buffer);
console.log(u8[0]); // 1 → 小端（little-endian）

console.log("\n== 4. 共享内存与 Spectre 的回撤：Node 没有跨源概念，SAB/Atomics 一直可用");
console.log(typeof SharedArrayBuffer);
const sab = new SharedArrayBuffer(8);
const view = new Int32Array(sab);
console.log(Atomics.add(view, 0, 41)); // 0 —— 返回旧值
console.log(view[0]); // 41

console.log("\n== 5. JIT 暖机（V8 2008 的遗产；逐分片计时，简单负载下差距不大但方向一致）");
function sumTo(n) {
  let s = 0;
  for (let i = 0; i < n; i++) s += i;
  return s;
}
const N = 3e7;
for (let c = 1; c <= 6; c++) {
  const t0 = performance.now();
  sumTo(N);
  console.log(`分片 ${c}: ${(performance.now() - t0).toFixed(1)} ms`);
}
