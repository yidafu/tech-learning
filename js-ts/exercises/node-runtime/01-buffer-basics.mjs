/**
 * 大纲章节：阶段 2 引擎与运行时（Node.js 运行时）
 * 主题：Buffer 与二进制数据：编码、堆外内存、零拷贝视图与字节序
 * 运行：node exercises/node-runtime/01-buffer-basics.mjs
 * 预期输出（逐行；除标注「实测」的两行外部内存数值外全部确定）：
 *   == Buffer 与二进制数据 ==
 *   [身份] Buffer 是 Uint8Array 的子类：true
 *   [编码] '汉'.length = 1，但 Buffer.from('汉').length = 3（UTF-8 3 字节）
 *   [编码] Buffer.byteLength('汉','utf8') = 3，Buffer.byteLength('汉','utf16le') = 2（单 UTF-16 码元）
 *   [编码] Buffer.from('a汉b').length = 5（1 + 3 + 1 字节）
 *   [安全] Buffer.alloc(8) 保证零填充：true
 *   [安全] Buffer.allocUnsafe(8) 不保证内容（本行只打印说明，不做断言）
 *   [视图] Buffer.from(arrayBuffer, 4, 4) 与底层内存共享：写入视图 → 原始字节变化：true
 *   [视图] buf.subarray(2, 4) 也是视图：改动会写穿到原 Buffer：true
 *   [字节序] writeUInt32BE(0x12345678)：readUInt32BE = 305419896，readUInt32LE = 2018915346
 *   [拼接] 收集 chunk 后 Buffer.concat 总长度 = 11（3 + 4 + 4），逐字节与预期一致：true
 *   [外部内存] 分配 100MB 前 external = XX.X MB（实测，随机器变化）
 *   [外部内存] 分配 100MB 后 external = XX.X MB，增长 ≥ 90MB：true
 *   [结论] Buffer 住在 V8 堆外（external 统计）；buf.slice/subarray 是视图不是拷贝
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/35-node-runtime.md 第 2 节）：
//
// 1. Buffer 是 Uint8Array 的子类，但底层内存在 V8 堆之外（C++ 侧分配），
//    计入 process.memoryUsage().external —— 衔接笔记 06 第 6 节的四字段表。
//    这意味着：Buffer 多了不影响 GC 标记的对象图规模（JS 对象本身很小），
//    但占用真实进程内存；「JS 堆没涨、rss 涨了」先查 external。
//
// 2. 三种创建姿势：
//    - Buffer.alloc(n)：零填充，安全默认；
//    - Buffer.allocUnsafe(n)：不清洗。小于池上限（8KB，Buffer.poolSize 的一半）
//      的分配走共享池 —— 速度快，但可能读到旧数据（前任进程/前次使用的残渣），
//      所以叫 Unsafe。从文件/网络读数据时用它是安全的（反正会被覆盖）。
//    - Buffer.from(...)：从字符串（按编码）/ 数组 / TypedArray / ArrayBuffer 构建。
//
// 3. 零拷贝视图：Buffer.from(arrayBuffer, byteOffset, length) 不复制任何字节，
//    只是在同一块内存上开一个视图；buf.subarray / buf.slice（旧名）同理。
//    推论一：改视图 = 改原数据；推论二：长期持有一个小视图会「钉住」整块
//    底层 ArrayBuffer（内存不回落的一个经典来源）。
//
// 4. 字符串编码：Node 默认 utf8（多字节变长）。str.length 是 UTF-16 码元数，
//    Buffer.byteLength(str, enc) 才是字节数 —— I/O 层一切按字节算。
//
// 5. 字节序：writeUInt32BE/LE 与 readUInt32BE/LE 是同一字节序列的两种解释，
//    网络协议常用大端（BE），x86/ARM 内存常用小端（LE）。
// ---------------------------------------------------------------------------

import process from 'node:process';

console.log('== Buffer 与二进制数据 ==');

// 1) 身份：Buffer 是 Uint8Array 子类
console.log(`[身份] Buffer 是 Uint8Array 的子类：${Buffer.alloc(4) instanceof Uint8Array}`);

// 2) 编码：码元数 ≠ 字节数
const cn = '汉';
console.log(
  `[编码] '${cn}'.length = ${cn.length}，但 Buffer.from('${cn}').length = ${Buffer.from(cn).length}（UTF-8 3 字节）`,
);
console.log(
  `[编码] Buffer.byteLength('汉','utf8') = ${Buffer.byteLength('汉', 'utf8')}，` +
    `Buffer.byteLength('汉','utf16le') = ${Buffer.byteLength('汉', 'utf16le')}`,
);
console.log(`[编码] Buffer.from('a汉b').length = ${Buffer.from('a汉b').length}（1 + 3 + 1 字节）`);

// 3) 安全默认 vs allocUnsafe
console.log(`[安全] Buffer.alloc(8) 保证零填充：${Buffer.alloc(8).every((b) => b === 0)}`);
console.log('[安全] Buffer.allocUnsafe(8) 不保证内容（本行只打印说明，不做断言）');

// 4) 零拷贝视图：from(arrayBuffer, offset, len) 与 subarray
const raw = new ArrayBuffer(8);
new Uint8Array(raw).set([0, 0, 0, 0, 0xde, 0xad, 0xbe, 0xef]);
const view = Buffer.from(raw, 4, 4); // 视图：不复制
view[0] = 0x01;
const rawChanged = new Uint8Array(raw)[4] === 0x01;
console.log(`[视图] Buffer.from(arrayBuffer, 4, 4) 与底层内存共享：写入视图 → 原始字节变化：${rawChanged}`);

const buf = Buffer.from([10, 20, 30, 40, 50]);
const sub = buf.subarray(2, 4); // 视图，不复制
sub[0] = 99;
console.log(`[视图] buf.subarray(2, 4) 也是视图：改动会写穿到原 Buffer：${buf[2] === 99}`);

// 5) 字节序
const be = Buffer.alloc(4);
be.writeUInt32BE(0x12345678);
console.log(
  `[字节序] writeUInt32BE(0x12345678)：readUInt32BE = ${be.readUInt32BE()}，readUInt32LE = ${be.readUInt32LE()}`,
);

// 6) chunk 收集 + concat（大流量下的标准姿势：别在循环里 += 字符串）
const chunks = [Buffer.from('abc'), Buffer.from('wxyz'), Buffer.from('汉b')]; // 3 + 4 + 4 字节
const joined = Buffer.concat(chunks);
const expected = Buffer.from('abcwxyz汉b');
console.log(
  `[拼接] 收集 chunk 后 Buffer.concat 总长度 = ${joined.length}（3 + 4 + 4），` +
    `逐字节与预期一致：${joined.equals(expected)}`,
);

// 7) 外部内存：Buffer 住在 V8 堆外
const mb = (n) => Math.round(n / 1024 / 1024 * 10) / 10;
const before = process.memoryUsage().external;
console.log(`[外部内存] 分配 100MB 前 external = ${mb(before)} MB（实测，随机器变化）`);
const big = Buffer.allocUnsafe(100 * 1024 * 1024); // allocUnsafe：马上整体覆盖，安全
big.fill(7);
const after = process.memoryUsage().external;
console.log(
  `[外部内存] 分配 100MB 后 external = ${mb(after)} MB，增长 ≥ 90MB：${after - before >= 90 * 1024 * 1024}`,
);
console.log('[结论] Buffer 住在 V8 堆外（external 统计）；buf.slice/subarray 是视图不是拷贝');
