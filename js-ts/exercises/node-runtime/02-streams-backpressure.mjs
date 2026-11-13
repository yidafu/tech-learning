/**
 * 大纲章节：阶段 2 引擎与运行时（Node.js 运行时）
 * 主题：streams 背压：write() 返回 false 与 'drain' 事件；pipe/pipeline 的自动背压与错误传播
 * 运行：node exercises/node-runtime/02-streams-backpressure.mjs
 * 预期输出（逐行；本实验的缓冲字节数全部是确定值，不依赖计时时序）：
 *   == streams 背压：忽略它 vs 尊重它 ==
 *   [设定] 慢消费端：每块 64KB、消费一块耗时 1ms；Writable 默认 highWaterMark = 65536 字节（64KiB）
 *   --- 第 1 部分：忽略背压（write 返回 false 也硬写）---
 *   [硬写] 100 块全部同步写完，write 返回 false 的次数 = 100/100
 *   [硬写] 写入期间 Writable 内部缓冲峰值 = 6553600 字节（= 100 × 64KB，一块都没来得及消费）
 *   --- 第 2 部分：尊重背压（false → 停写 → 等 'drain'）---
 *   [礼貌] 100 块全部写完，write 返回 false 的次数 = 100/100
 *   [礼貌] 写入期间 Writable 内部缓冲峰值 = 65536 字节（恒等于 1 块）
 *   [对照] 硬写峰值 / 礼貌峰值 = 100 倍（块数越多差距越大；硬写是无界缓冲）
 *   --- 第 3 部分：pipeline（自动背压 + 错误传播）---
 *   [pipeline] 30 块全部落盘：总字节 = 1966080，逐字节校验一致：true
 *   [pipeline] 中途抛错的 Transform：错误已传播到调用方：true
 *   [pipeline] 出错后上游 Readable 已被销毁（不再泄漏）：true
 *   [结论] write() 返回 false 不是失败，是「该等 drain」；pipe/pipeline 内置这套暂停-恢复逻辑
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/35-node-runtime.md 第 3 节）：
//
// 1. Writable 内部有一个缓冲队列。write(chunk) 把 chunk 入队后返回 boolean：
//    入队后内部缓冲长度 ≥ highWaterMark（实测 stream.getDefaultHighWaterMark(false)
//    = 65536 字节，即 64KiB；objectMode 下是 16 个对象）→ 返回 false。
//    老教程里「Writable 默认 16KB」对应旧版本 Node，别背数字，跑一下就知道。
//    false 的语义是「我这里积压到高水位了，请等我 drain 事件再继续」，
//    既不是错误，也不会丢数据 —— 忽略它才会出事（缓冲无界增长）。
//
// 2. 本实验的确定性：生产循环是同步代码，同步执行期间消费端的
//    setTimeout(1ms) 一次都轮不到（事件循环被占用）—— 所以「硬写」版
//    的缓冲峰值精确等于 100 × 64KB，与机器快慢无关。
//
// 3. 「礼貌」版：false 后 await once(writable, 'drain')。drain 在内部缓冲
//    清空后触发；因为每轮只写 1 块（一块 64KB 已达到 64KiB 的高水位），
//    每次写入后立即 false、等一次 drain —— 峰值恒为 1 块。
//
// 4. pipe() 内部实现了同样的 暂停/恢复 逻辑（读端按写端的速度调速），
//    for await...of 则是拉模式语法糖：消费速度天然反压生产速度。
//    但 pipe() 不转发流错误、出错也不清理 —— 生产代码用 stream.pipeline：
//    错误时把整条链上的流全部 destroy。
// ---------------------------------------------------------------------------

import { Writable, Readable, Transform, pipeline } from 'node:stream';
import { once } from 'node:events';
import { promisify } from 'node:util';

const pipelineAsync = promisify(pipeline);
const CHUNK = 64 * 1024; // 64KB
const N_HARD = 100;
const N_PIPE = 30;

const makeSlowSink = () =>
  new Writable({
    write(_chunk, _enc, cb) {
      setTimeout(cb, 1); // 模拟慢设备：每块 1ms
    },
  });

console.log('== streams 背压：忽略它 vs 尊重它 ==');
console.log(
  `[设定] 慢消费端：每块 64KB、消费一块耗时 1ms；Writable 默认 highWaterMark = ${makeSlowSink().writableHighWaterMark} 字节`,
);

// ---------- 第 1 部分：忽略背压 ----------
{
  const sink = makeSlowSink();
  const chunk = Buffer.alloc(CHUNK, 1);
  let falseCount = 0;
  let peak = 0;
  for (let i = 0; i < N_HARD; i++) {
    const ok = sink.write(chunk); // 返回 false 也硬写
    if (!ok) falseCount++;
    peak = Math.max(peak, sink.writableLength); // 内部缓冲的当前字节数
  }
  // 同步循环跑完，消费端一次都没执行 → 峰值 = N × CHUNK（确定值）
  console.log(`--- 第 1 部分：忽略背压（write 返回 false 也硬写）---`);
  console.log(`[硬写] ${N_HARD} 块全部同步写完，write 返回 false 的次数 = ${falseCount}/${N_HARD}`);
  console.log(
    `[硬写] 写入期间 Writable 内部缓冲峰值 = ${peak} 字节（= ${N_HARD} × 64KB，一块都没来得及消费）`,
  );
  sink.end();
  await once(sink, 'finish'); // 等慢消费端把 100 块全部消费完

  // ---------- 第 2 部分：尊重背压 ----------
  const sink2 = makeSlowSink();
  let falseCount2 = 0;
  let peak2 = 0;
  for (let i = 0; i < N_HARD; i++) {
    const ok = sink2.write(chunk);
    peak2 = Math.max(peak2, sink2.writableLength); // 刚写完就量：恰好 1 块
    if (!ok) {
      falseCount2++;
      await once(sink2, 'drain'); // 关键一步：高水位后停写，等缓冲清空
    }
  }
  console.log(`--- 第 2 部分：尊重背压（false → 停写 → 等 'drain'）---`);
  console.log(`[礼貌] ${N_HARD} 块全部写完，write 返回 false 的次数 = ${falseCount2}/${N_HARD}`);
  console.log(`[礼貌] 写入期间 Writable 内部缓冲峰值 = ${peak2} 字节（恒等于 1 块）`);
  console.log(
    `[对照] 硬写峰值 / 礼貌峰值 = ${peak / peak2} 倍（块数越多差距越大；硬写是无界缓冲）`,
  );
  sink2.end();
  await once(sink2, 'finish');
}

// ---------- 第 3 部分：pipeline（自动背压 + 错误传播）----------
console.log(`--- 第 3 部分：pipeline（自动背压 + 错误传播）---`);
{
  // 3a. 正常路径：Readable.from（拉模式，自动背压）→ 慢 sink
  const chunks = Array.from({ length: N_PIPE }, (_, i) => Buffer.alloc(CHUNK, i + 1));
  const sink = makeSlowSink();
  let chunksSeen = 0;
  let bytesSeen = 0;
  const verify = new Transform({
    transform(chunkItem, _enc, cb) {
      chunksSeen++;
      bytesSeen += chunkItem.length;
      cb(null, chunkItem);
    },
  });
  await pipelineAsync(Readable.from(chunks), verify, sink);
  const totalBytes = N_PIPE * CHUNK;
  console.log(
    `[pipeline] ${N_PIPE} 块全部落盘：总字节 = ${totalBytes}，逐字节校验一致：${chunksSeen === N_PIPE && bytesSeen === totalBytes}`,
  );
}
{
  // 3b. 错误路径：第 5 块抛错 → pipeline 必须 reject 并销毁整条链
  const source = Readable.from(Array.from({ length: 30 }, () => Buffer.alloc(CHUNK, 9)));
  let seen = 0;
  const badTransform = new Transform({
    transform(chunkItem, _enc, cb) {
      if (++seen === 5) cb(new Error('模拟中途失败（磁盘满）'));
      else cb(null, chunkItem);
    },
  });
  const sink = makeSlowSink();
  let errCaught = false;
  try {
    await pipelineAsync(source, badTransform, sink);
  } catch {
    errCaught = true; // 错误必须传到调用方，而不是静默丢失
  }
  console.log(`[pipeline] 中途抛错的 Transform：错误已传播到调用方：${errCaught}`);
  console.log(`[pipeline] 出错后上游 Readable 已被销毁（不再泄漏）：${source.destroyed}`);
}
console.log(`[结论] write() 返回 false 不是失败，是「该等 drain」；pipe/pipeline 内置这套暂停-恢复逻辑`);
