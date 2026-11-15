---
mdx:
  format: mdx
references:
  - 31-async-supplement
  - 16-modules-esm-cjs
  - 08-render-and-performance
  - 06-memory-management
---
# 35 · Node.js 运行时：streams、Buffer、子进程与并行模型

> 对应大纲：阶段 2 —— Node.js 运行时（streams 与背压、Buffer 与二进制数据、worker_threads 与 cluster、child_process、Node 特有的模块加载与进程模型）。
> 一手依据：Node 官方文档 [nodejs.org/api](https://nodejs.org/api/) 的 stream、buffer、child_process、worker_threads、cluster、process、modules 各页（本文所有 API 行为描述以官方文档为准，涉及本机实测的数字均标注环境）。
> 事件循环与 libuv 六阶段**不在本文重复**——见笔记 31（libuv 各阶段、nextTick/微任务、setImmediate vs setTimeout、饥饿对照）；ESM/CJS 的语法与 interop 见笔记 16；worker_threads 的通信机制（结构化克隆 + transferList）见笔记 08 第 6 节。

## 学习目标

- 能画出一个 Node 进程的线程全景：主线程、libuv 线程池、V8 后台线程、worker 线程各自做什么，「Node 是单线程」这句话错在哪一半。
- 能讲清背压的完整因果链：`highWaterMark` → `write()` 返回 `false` → `'drain'` 事件，以及为什么 `pipe` / `pipeline` / `for await...of` 天然正确。
- 能说清 Buffer 住在哪（V8 堆外）、怎么创建（`alloc` vs `allocUnsafe` vs `from`）、`slice`/`subarray` 为什么是视图不是拷贝。
- 给「调用外部命令 / CPU 密集纯计算 / HTTP 服务吃满多核」三类场景，能分别选出 child_process / worker_threads / cluster 并说清依据。
- 能说出 CJS 模块缓存与 ESM 模块求值在**进程模型**层面的推论：模块级单例的边界是进程，cluster 下每个 worker 各一份。

---

## 关键概念

### 1. 一个 Node 进程的线程全景

「Node 是单线程的」只对**你的 JS 代码**成立。一个真实 Node 进程里至少有四类线程：

```mermaid
flowchart TD
    M["主线程（JS 执行 + 事件循环）<br>你的代码、回调、微任务都跑在这里"] -->|"I/O 委托"| P["libuv 线程池（默认 4 个）<br>文件读写、dns.lookup、<br>crypto 的 pbkdf2/scrypt 等阻塞操作"]
    M -->|"V8 自管"| V["V8 后台线程<br>并发标记/清扫（GC，见笔记 06）、<br>后台编译"]
    M -->|"用户显式创建"| W["worker_threads<br>独立 V8 isolate 的 JS 线程"]
    P -->|"完成后把回调交回主线程对应阶段（见笔记 31 的 poll 阶段）"| M
```

- **libuv 线程池**大小由 `UV_THREADPOOL_SIZE` 控制（默认 4）。它解释了一个经典现象：4 个并发的 `fs.readFile` 大文件互不影响线程池，但 8 个并发的 `crypto.pbkdf2` 会排队——后者也跑在线程池里（`crypto` 文档明示 pbkdf2/scrypt/randomBytes 异步版走线程池）。
- **进程对象**三个高频要点：
  - `process.exit(code)` 立即退出，**会截断还在飞行中的异步 I/O**（stdout 没 flush 完就没了）。想「自然退出去设置 `process.exitCode`」，让事件循环自己走完。
  - 信号：`process.on('SIGTERM', handler)` 接管优雅停机（Kubernetes/Docker 发的就是 SIGTERM）；不注册处理器时 SIGTERM 直接终止进程。
  - `process.send` 是否存在 = 当前进程是不是被 `fork`/`cluster` 出来的子进程（练习 03/05 用它区分「父脚本 / 子模块」两种角色）。

### 2. Buffer：住在 V8 堆外的二进制数据

依据 [nodejs.org/api/buffer.html](https://nodejs.org/api/buffer.html)。

- **身份**：`Buffer` 是 `Uint8Array` 的子类，但底层字节**不分配在 V8 堆里**（C++ 侧分配），计入 `process.memoryUsage().external`——这正是笔记 06 第 6 节四字段表里 `external` 的来源。推论：`heapUsed` 不涨但 `rss` 涨，先查 Buffer（练习 01 实测：分配 100MB 后 `external` 从 1.6MB 涨到 101.6MB）。
- **三种创建**：

| 写法 | 语义 | 什么时候用 |
| --- | --- | --- |
| `Buffer.alloc(n)` | 零填充（安全默认） | 默认选择 |
| `Buffer.allocUnsafe(n)` | 不清洗旧字节；小于池上限的分配走 8KB 共享池 | 从文件/网络读数据**马上整体覆盖**时（读完就覆盖，旧数据无泄露面） |
| `Buffer.from(...)` | 从字符串（按编码）/数组/TypedArray/ArrayBuffer 构建 | 一切「从已有数据出发」的场景 |

- **`allocUnsafe` 的「Unsafe」指什么**：那块内存可能残留上一次使用的数据。所以「先用 allocUnsafe 再逐字节填」的代码里，填漏的字节就是信息泄露面——安全审计的真实条目，不只是性能话题。
- **零拷贝视图**：`Buffer.from(arrayBuffer, byteOffset, length)` 不复制字节，只是开视图；`buf.subarray(i, j)`（以及旧名 `slice`）同理。两个推论：改视图 = 改原数据；**长期持有一个小视图会「钉住」整块底层内存**（`external` 不回落的经典原因，练习 01 演示写穿语义）。
- **编码**：I/O 层默认 `utf8`（变长多字节）。`str.length` 是 UTF-16 码元数，`Buffer.byteLength(str, enc)` 才是字节数——`'汉'.length` 是 1，UTF-8 字节是 3，`utf16le` 字节是 2（单码元 BMP 字符）。一切按字节计费的场合（协议长度字段、截断）都必须用后者。
- **大流量的标准姿势**：收 chunk 进数组、结束后 `Buffer.concat(chunks)`；别在循环里反复拼字符串/拼 Buffer——每轮都产生新的中间产物，白给 GC 送工作量（衔接笔记 06 的分配压力）。

### 3. streams：四种流、两种读法与背压

依据 [nodejs.org/api/stream.html](https://nodejs.org/api/stream.html)（该页 Buffering 一节是背压语义的官方出处）。

**四种核心类型**：`Readable`（可读，如 `fs.createReadStream`、HTTP request）、`Writable`（可写，如 `fs.createWriteStream`、HTTP response）、`Duplex`（读写皆可，如 TCP socket）、`Transform`（读进什么规则变换后写出，如 `zlib.createGzip()`）。另有 WHATWG 风格的 Web Streams（`node:stream/web`），浏览器代码平移时用，本笔记不展开。

**两种读法**：

- **flowing（推）**：`stream.on('data', chunk => ...)`——数据来了就推给你，你不喊停就一直推。
- **paused（拉）**：`stream.on('readable', ...)` + `stream.read(size)`——你按自己的节奏拉。
- **`for await (const chunk of readable)` 是拉模式的语法糖**：循环体内每次迭代才取下一块，消费速度天然反压生产速度——这也是它在「读快写慢」场景里安全的规范理由。

**背压的完整因果链**（练习 02 逐步实测）：

```mermaid
flowchart LR
    P["生产端（快）"] -->|"write(chunk)"| W["Writable 内部缓冲"]
    W -->|"缓冲长度 ≥ highWaterMark<br>→ write() 返回 false"| P
    W -->|"消费端慢慢取走，缓冲清空<br>→ 触发 'drain' 事件"| P
    W --> V["慢设备（磁盘/网络对端）"]
```

1. `Writable` 内部有一个缓冲队列。`write(chunk)` 把 chunk 入队，**然后**比较内部缓冲长度与 `highWaterMark`：达到水位返回 `false`。
2. **`false` 不是错误、不会丢数据**，语义是「我积压到高水位了，请等我 `'drain'`（缓冲清空）再继续」。正确姿势：`false` 后停写，`await once(ws, 'drain')` 再写下一块。
3. 水位默认值以官方文档与本机实测为准：`new Writable()` / `new Readable()` 均为 **64KiB**（`stream.getDefaultHighWaterMark(false)` 实测 65536；objectMode 下是 **16 个对象**——按个数计，不按字节）。老教程里「Writable 默认 16KB」的说法对应旧版本 Node，别背数字、跑一下 `writableHighWaterMark` 就知道。
4. **忽略背压的后果**：快读慢写时，写不出去的数据全部滞留在内部缓冲里——内存无界增长 + 后面的数据排队延迟。练习 02 的对照实验（100 块 64KB 写进每块 1ms 的慢 sink）：硬写版缓冲峰值精确等于 100 × 64KB（同步循环期间消费端一次都轮不到执行）；礼貌版峰值恒为 1 块。
5. `readable.pipe(writable)` 内部实现了同一套暂停/恢复逻辑（读端按写端的速度调速）；`for await...of` 同理。**但 `pipe` 不转发流错误、出错也不清理**——生产代码一律用 `stream.pipeline`（callback 版 / `promisify` 版）：任何一个环节出错，整条链上的流全部 `destroy`，错误传给调用方。
6. `Transform` 有**双向独立**的缓冲与水位（读侧、写侧各管各的），所以「Transform 不等于零成本」——两侧速率不匹配时它自己也会积压。

### 4. child_process：四种衍生的边界

依据 [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html)。

| API | 过 shell？ | 输出 | IPC | 典型用途 |
| --- | --- | --- | --- | --- |
| `spawn(cmd, args)` | 否 | stdout/stderr 是**流** | 否 | 大输出、流式处理（构建工具、ffmpeg） |
| `execFile(cmd, args)` | 否 | 收集成整块 buffer，受 `maxBuffer`（默认 1MB） | 否 | 小输出的确定性命令 |
| `exec(cmdString)` | **是**（`/bin/sh`，Windows 是 cmd） | 同 execFile | 否 | 确实需要 shell 语法时（管道、通配符） |
| `fork(modulePath)` | 否 | 同 spawn | **是**（内置 channel） | Node 进程分身 + 消息通信 |

三个高频坑（练习 03 全部实测）：

- **`exec` 的注入面**：命令是拼出来的字符串，任何拼进去的用户输入都是 shell 注入素材。参数走 `spawn`/`execFile` 的 args 数组（不经 shell）是结构性防御。
- **`maxBuffer` 是安全阀不是配置项**：子进程输出超过 1MB 直接杀进程报 `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`。大输出换 `spawn` 流式读，而不是把 maxBuffer 调大——那是把内存问题改成超时问题。
- **`exit` 事件的 `code` 与 `signal` 互斥**：正常退出 `code` 是数字、`signal` 是 `null`；被信号杀死 `code` 是 `null`、`signal` 是 `'SIGTERM'` 之类。诊断「子进程为什么死」要同时看两者，另加 `'error'` 事件（启动失败时 `code`/`signal` 可能都是 `null`）。

`fork` 的 IPC（`process.send` / `child.on('message')`）与 worker_threads 的 `postMessage` 同族：消息走结构化克隆系序列化，**传不了函数**（笔记 08 第 6 节的克隆限制清单同样适用）。

### 5. worker_threads 与 cluster：并行的两条路

worker 的**通信机制**（独立 isolate、`postMessage` 结构化克隆、`transferList` 零拷贝转移）笔记 08 第 6 节已讲透；cluster 的**分发机制**练习 05 已实测。这里补齐「工程选型」这一层：

| 维度 | child_process（fork/spawn） | worker_threads | cluster |
| --- | --- | --- | --- |
| 隔离级别 | 独立进程（独立地址空间） | 独立线程 + 独立 V8 isolate（同进程） | 独立进程（primary 的分身） |
| 通信 | IPC / stdout 流 | `postMessage`（可 transfer） | IPC（fork 同款）+ 共享监听端口 |
| 启动成本 | 最高（fork 进程） | 中（线程 + isolate，数 MB 内存起） | 最高 |
| 崩溃影响 | 互不连坐 | worker 崩溃不拖垮主线程（需自己重启） | worker 崩溃不连坐，**重启责任在 primary** |
| 典型场景 | 跑外部命令、第三方脚本、强隔离 | CPU 密集纯计算、图像/加解密批处理 | HTTP 服务吃满多核 |

三条判据：

1. **worker 的账**：`(计算收益) > 2 × 通信成本` 才值得（结构化克隆不免费）。适用形态是「一次传数据进去、算很久、一次传结果出来」——练习 04 的素数统计（每片传 2 个数字、回 1 个数字）在 Apple M4 Pro / Node 24.10.0 上多次实测加速约 2.5–3.1 倍（4 workers，逐次运行有浮动）；反过来，高频小消息的「worker 池 RPC」经常比单线程还慢。
2. **cluster 的独特价值只有一个**：多个进程共享同一个监听端口。非 Windows 平台默认 round-robin——primary 统一 `accept` 连接再轮流分发（练习 05 实测 6 个请求 1/2 交替服务）。改造成本最低的多核扩容，代价是进程内存各一份。
3. **「独立进程」的推论**：模块级单例、内存缓存、计数器在**每个 worker 里各是一份**。跨 worker 共享状态必须外置（Redis 等）或走 IPC——这是「用 cluster 扩容后计数器对不上」这类事故的根源。

### 6. 模块加载与进程模型（Node 特有）

笔记 16 讲透了 ESM/CJS 的**语法与 interop**；这里只讲运行时行为在进程模型上的三个推论。

- **CJS：同步 `require` + 模块缓存**。`require.cache` 让同一模块在进程内只求值一次——模块级状态（配置、连接池）天然单例。推论一：删缓存热重载只在开发期玩（生产下等于赌博）；推论二：**循环依赖**拿到的是对方「部分完成的导出」（键可能在、值还是 `undefined`）——CJS 的加载是「执行到哪算哪」。解析顺序：内置 → 相对/绝对路径 → 逐级向上找 `node_modules`。
- **ESM：模块图异步构建 + 求值一次即冻结**。`import` 是异步语义（这正是笔记 31.1 里「ESM 顶层运行在微任务上下文」的根源），模块求值只发生一次、结果被模块图缓存。top-level await 会挂起整条依赖链（笔记 31.4）。
- **同步加载阻塞事件循环**：`require` 是同步 I/O + 同步执行。启动期无所谓；**请求路径上动态 `require`** 等于在主线程上插一段同步磁盘读 + 代码执行——和长任务同罪（笔记 31.1 的饥饿同源）。ESM 的动态 `import()` 是异步的，语义上安全得多。

---

## 可运行示例

配套练习（`exercises/node-runtime/`，全部实际运行验证过，预期输出逐行写在文件头注释）：

```bash
# Buffer：编码、堆外内存（external）、零拷贝视图、字节序
node exercises/node-runtime/01-buffer-basics.mjs

# streams 背压：硬写 vs 等 drain 的缓冲峰值对照 + pipeline 错误传播（全程确定值）
node exercises/node-runtime/02-streams-backpressure.mjs

# child_process 四件套：spawn/execFile/exec/fork；maxBuffer；exit code vs signal
node exercises/node-runtime/03-child-process.mjs

# worker_threads：素数统计串行 vs 4 workers（实测加速比，注明环境）
node exercises/node-runtime/04-worker-threads-pool.mjs

# cluster：2 worker 共享端口，6 个请求观察 round-robin 分发
node exercises/node-runtime/05-cluster-http.mjs
```

背压的最小感受版（摘自练习 02 的核心骨架）：

```js
import { Writable } from 'node:stream';
import { once } from 'node:events';

const sink = new Writable({
  write(chunk, _enc, cb) { setTimeout(cb, 1); }, // 模拟慢设备
});
const chunk = Buffer.alloc(64 * 1024, 1);

for (let i = 0; i < 100; i++) {
  const ok = sink.write(chunk);
  if (!ok) await once(sink, 'drain'); // false → 停写 → 等 drain：就这一行
}
sink.end();
```

---

## 易错点与面试高频

1. **「Node 是单线程」半对**：JS 执行单线程；libuv 线程池（文件/dns/部分 crypto）、V8 后台线程（GC/编译）、worker_threads 都是真线程。把这句话说全，就是面试里「Node 怎么利用多核」的开场答案。
2. **`write()` 返回 `false` 不是失败**：是「到高水位了，该等 drain」。忽略它不报错、不丢数据——代价是无界缓冲 + 排队延迟，比报错更隐蔽。
3. **`pipe` 不处理错误**：上游出错时管道静默停止且资源不清理。默认写法是 `pipeline`（错误时整链 destroy）。
4. **`buf.slice`/`subarray` 是视图**：改它会写穿原数据；持有小视图会钉住大块底层内存。「只想留一小段」请复制（`Buffer.from(buf.subarray(i, j))` 会拷贝出独立缓冲）。
5. **`allocUnsafe` 的名字是警告**：残渣可能属于上一个使用者。只有「分配后立即整体覆盖」的场景才允许用。
6. **`exec` 拼命令 = shell 注入面**：参数一律走 `spawn`/`execFile` 的数组；真需要 shell 语法时也要把用户输入放环境变量/文件传递，别拼进命令串。
7. **`maxBuffer` 超限的表现**：子进程被杀、回调收到 `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`——大输出用 `spawn` 流式读，不是调大缓冲。
8. **cluster 的默认分发**：非 Windows 是 round-robin（primary 集中 accept）；Windows 默认把端口交给系统分发。练习里「多 worker 交替服务」在 Windows 上顺序可能不同。
9. **cluster 下的模块级状态是每 worker 一份**：内存缓存/计数器不共享，跨 worker 一致性要外置存储或 IPC——「扩容后数据对不上」的根源。
10. **`process.exit()` 截断挂起中的 I/O**：优雅退出用 `process.exitCode` + 让事件循环自然走完；`SIGTERM` 处理器里先 `server.close()` 再退（练习 05 的停机骨架）。

---

## 输出预测题

### 题 1（背压时序）

```js
import { Writable } from 'node:stream';
const ws = new Writable({ write(c, e, cb) { setTimeout(cb, 5); } }); // 慢消费
const big = Buffer.alloc(64 * 1024); // 64KB，默认水位 64KiB
const results = [];
results.push(ws.write(big));   // ①
results.push(ws.write(big));   // ②
console.log(results.join(','));
ws.on('drain', () => console.log('drain'));
ws.end();
// 问：console.log 打印什么？'drain' 一共会触发几次？
//（本答案经实际运行验证：node 24，默认水位 64KiB）
```

### 题 2（Buffer 语义）

```js
const raw = Buffer.from('a汉b'); // UTF-8
const view = raw.subarray(1, 4);
view[0] = 0x62; // 'b'
console.log(raw.length, raw.toString('utf8'));
console.log(Buffer.byteLength('汉', 'utf8'), Buffer.byteLength('汉', 'utf16le'));
// 问：两行输出各是什么？view 的改动会不会影响 raw？
```

（答案见文末）

---

## 延伸阅读

- nodejs.org/api/stream.html —— 四种流、Buffering 与背压语义、pipeline、objectMode 的官方定义（本文第 3 节主要依据）
- nodejs.org/api/buffer.html —— Buffer/Uint8Array 关系、alloc 系列与共享池、编码与 byteLength
- nodejs.org/api/child_process.html —— 四 API 对照、maxBuffer、exit 的 code/signal 语义
- nodejs.org/api/worker_threads.html 与 nodejs.org/api/cluster.html —— worker/cluster 模型与调度策略（round-robin）
- nodejs.org/api/process.html —— exitCode/exit、信号、process.send
- nodejs.org/api/modules.html —— CJS 缓存、解析算法、循环依赖；ESM 见 nodejs.org/api/esm.html
- 衔接：笔记 31（libuv 六阶段与两微队列）、笔记 16（ESM/CJS interop）、笔记 08 第 6 节（结构化克隆与 Transferable）、笔记 06（external 与四字段内存表）

---

## 预测题答案

### 题 1

打印 **`false,false`**，'drain' 触发 **0 次**。

- 每块 64KB 入队后内部缓冲立即达到 64KiB 水位（`64 * 1024 ≥ 65536`），所以两次 `write` 都返回 `false`（false 只表示「到水位」，不是「写不进」——两块都进了缓冲）。
- **drain 一次都不触发**：`end()` 紧跟着两块未消化的写入被调用，流进入「收尾」状态；缓冲清空后直接走 `'finish'`。'drain' 的语义是「可以继续写了」——都已经 end 了，没有「继续写」可言。这是背压题的经典陷阱：**drain 只对「还想继续 write 的生产者」有意义**（对照练习 02 的礼貌版：不调 end，每次 false 后等 drain，drain 就如期触发）。

### 题 2

```
5 ab□□b     （□ 是两个替换字符 U+FFFD，终端通常显示为 ? 或豆腐块）
3 2
```

- `raw.length` = **5**：`'a'`(1 字节) + `'汉'`(3 字节) + `'b'`(1 字节)。`.length` 数的是字节，不是字符——第一个高频错点。
- `subarray(1, 4)` 恰好框住 `'汉'` 的 3 个字节（E6 B1 89），`view[0] = 0x62` 把首字节改成 `'b'`——**视图写穿原数据**。剩下的 B1 89 不再是合法 UTF-8 序列（延续字节没了前导字节），各自解码成 U+FFFD 替换字符，所以第二行输出 `a` + `b` + 两个替换字符 + `b`。
- 第三行：`'汉'` 是单个 BMP 码元（U+6C49），UTF-8 编码 3 字节；`utf16le` 每码元 2 字节 → **3 2**。别背「汉字都是 2 字节」——那是 UTF-16 码元的视角，UTF-8 下是 3。

## 附：Node 运行时心智模型速查（收尾增补）

本册覆盖了 Buffer/二进制/编码与运行时边界，收尾把"Node 里遇到数据/进程问题先想什么"压成心智模型速查表：

| 场景 | 心智模型的第一反应 | 本册出处 |
|---|---|---|
| 字符串乱码/替换字符 | 编码链哪一环断了（读/传输/写） | UTF-8 三节 |
| Buffer 与 string 互转 | encoding 参数显式给了吗 | 二进制数据节 |
| 大文件读写内存爆 | 流（stream）代替一次性读 | Node I/O 观 |
| 进程退出码非 0 | 哪一层抛的（用户码/运行时/信号） | 进程模型 |
| 环境变量读不到 | process.env 何时快照 | 运行时边界 |
| 跨平台路径错 | path.posix vs path.win32 | 平台层 |
| 定时器漂移 | 事件循环的相位（timer 阶段） | 事件循环一瞥 |

速查表的用法：**先定位"数据在这一刻的物理形态"**（string/Buffer/流字节），再问"谁在转换它"——八成运行时问题的根因都是"形态与预期不符"。

### 收尾自测（增补）

1. 速查表哪几行共同指向"编码链断裂"这一类问题？链路顺序是什么？
2. "流代替一次性读"的收益边界在哪？（小文件反而啰嗦——判据是尺寸吗？还是内存画像？）
3. 事件循环的 timer 相位解释了 setTimeout 精度的什么现象？setImmediate 与它的先后怎么记？

### 收尾一句话（增补）

Node 运行时层的知识都有一个共同形状：**V8 管语言语义，libuv 管时间与 I/O，两者之间的缝隙（编码、进程、路径）才是事故高发区**——本册速查表的每一行都站在某条缝隙上。

## 附二：进程与信号的一页补充

本册正文点到进程模型，这里把"进程怎么死"补成一页（运维事故的常客）：

| 退出方式 | 退出码 | 谁触发 | 典型场景 |
|---|---|---|---|
| 正常退出 | 0 | process.exit(0) / 事件循环清空 | 任务完成 |
| 未捕获异常 | 1 | 运行时默认 handler | bug（必须配 uncaughtException 兜底上报） |
| process.exit(n) | n | 代码主动 | 语义化失败码（脚本调用方判断） |
| SIGTERM | 143 | 编排系统（k8s/docker stop） | 优雅关闭窗口（先清连接再退） |
| SIGKILL | 137 | 强杀（不可捕获） | 超过优雅关闭时限 |
| OOM | 137（常见） | 内核 | 内存泄漏的终局 |

表的使用要点：**137 ≠ "被 OOM 了"**——它只是 128+9（SIGKILL），需要结合 dmesg/编排日志区分"谁杀的"；优雅关闭的正确姿势是监听 SIGTERM → 停止接新请求 → 等在途完成 → exit，而不是捕获后立刻退出（那和被杀没区别）。

### 附二自测

1. SIGTERM 与 SIGKILL 的可捕获性差异决定了什么工程纪律？（优雅关闭必须在 TERM 窗口内完成）
2. uncaughtException 里"记录 + 退出"为什么比"记录 + 继续跑"正确？（状态一致性已不可信）
3. 你的服务被 137 杀过吗？三步区分"OOM 还是人为 kill"。

---

## 深入一层：线程池账本、插队点实测与背压补充

### D1. libuv 线程池的四类任务与 UV_THREADPOOL_SIZE 的实测读法

线程池是**一个共享池**，官方文档口径下它承接这些任务：文件系统 I/O（`fs` 的异步 API）、`dns.lookup`（走 getaddrinfo 的阻塞解析）、部分 crypto（`pbkdf2`、`scrypt`、`randomBytes` 等的异步版本），以及少数其他阻塞系统调用的封装。四类任务共用同一个池，这是理解它的一切行为的起点：**一类任务把池占满，另外三类跟着排队**——8 个并发 `pbkdf2` 拖慢的是同一时刻发起的 `fs.readFile`，哪怕两者毫无业务关联。

池大小由环境变量 `UV_THREADPOOL_SIZE` 控制（默认 4，上限 1024，须在进程启动前设置）。下面的实跑取证节有同机对照：8 个并发 `pbkdf2` 在默认池约 18ms 完成，池缩到 1 变成约 39ms——并行宽度直接写进了总耗时。读这份账的正确姿势：耗时比值不会精确等于 4 比 1（任务粒度、调度与启动开销都在里面），但**量级与方向**稳定可复现。工程推论两条：其一，「调大线程池」只对「线程池被打满」这一种瓶颈有效，CPU 密集的 JS 计算阻塞主线程与池无关，调池无效；其二，池放大到几十之后每个线程都有独立栈内存，且池内任务对 CPU 核数的争夺开始反噬——无证据的调参不如加一次观测。

顺带钉死一个易混点：`dns.lookup` 与 `dns.resolve` 走的是两条路——lookup 走操作系统解析器（getaddrinfo，读 hosts 文件、吃系统缓存，因此**在线程池里跑**，阻塞一个池线程）；resolve 直接向 DNS 服务器发网络请求（异步网络调用，不占线程池）。官方文档对两者的这个分工有明文。「换 resolve 能不能解决线程池被占满」——只能缓解 dns 这一类的占用，文件与 crypto 类的占用它救不了。

### D2. 事件循环的微任务插队点：两条实跑时序

六阶段全图（timers、pending、poll、check、close 回调，加两个插队队列）见笔记 31，这里只放「插队点」的实测形态——本册的收据比常见二手口径多一个**模块系统维度**：

- 同一段调度代码，CJS（`.cjs` 或 `-e`）里跑出 `nextTick → microtask → setImmediate → setTimeout(0)`——经典的「nextTick 优先于 Promise 微任务」；
- 同样代码放进 ESM（`.mjs`）顶层，跑出 `microtask → nextTick → setImmediate → setTimeout(0)`——**微任务反而先于 nextTick**。机制：ESM 顶层模块求值结束后走的是 V8 的微任务检查点（这是顶层 await 语义的地基，笔记 16/31 有呼应），Promise 队列在那一刻先被清空，Node 的 nextTick 队列随后结算。

两条收据合起来给出准确口径：「nextTick 先于微任务」不是全局铁律，而是**每个插队点内部**的优先序——在宏任务回调（timer、I/O 事件）结束后，Node 先清 nextTick 队列再清微任务队列，这条不随模块系统变；ESM 顶层的差异来自「模块求值收尾」这个特殊边界点走的是另一条结算路径。另一个实测稳定项：`setImmediate` 与 `setTimeout(0)` 在主模块顶层同场竞技时，官方语义是**不定序**（谁先进循环下一相位取决于进入时机），本机多次实测均为 setImmediate 先行；而在 timer/I/O 回调内部同场竞技时，setImmediate **必然**先跑——当前已处于 timers/poll 相位，check 相位在本轮循环内马上到达，而 setTimeout(0) 至少要等下一轮循环的 timers 相位（且 1ms 门槛可能向上漂移）。收据 1 里 `inner setImmediate` 早于 `inner-inner setTimeout(0)` 正是这条。

### D3. stream 背压补遗：水位是策略阈值，不是容量限额

正文 §3 讲了背压因果链，这里补三个收尾细节。其一，`write()` 返回 `false` 之后数据**仍然入队**，所以「高水位」从来不是缓冲上限——它是「该切换策略」的信号灯；真正的上限纪律靠调用方遵守。其二，`stream.cork()` 与 `uncork()` 是手工版背压：连续写入先 cork 攒批、uncork 一次冲刷，适合「知道自己要写一小串」的场景；`pipeline` 与 `for await...of` 内部已经做了正确调度，手工 cork 在这些封装之上通常多余。其三，收尾三事件各司其职：`finish` 表示写端数据全部刷到底层；`close` 表示流资源彻底释放（句柄关掉）；`end` 是读端没有更多数据。等 `finish` 再关进程、等 `close` 再删临时文件，用错事件就是「文件写一半就被处理」类事故的根源；出错路径一律 `destroy(err)`——它绕过队列直接触发清理，是 pipeline 能「整链销毁」的机制支点。

### D4. worker_threads 与 child_process 的取舍：三问定方案

正文 §5 的对照表给了维度，这里把决策压成三问，按序问完即有答案。

**第一问：任务是谁的 CPU？** 是「我们自己能用 JS 表达的计算」，还是「外部世界」？外部命令、第三方 CLI、别的语言的编译产物，一律 child_process（按正文 §4 的四件套细分）；自己是 JS 可表达的纯计算，进第二问。

**第二问：隔离要求是什么？** 需要「崩溃不连坐、依赖独立、可单独换版本或换启动参数」的强隔离，用 fork 独立进程；只需要「并行算力」、接受同进程内共享内存与句柄表，worker_threads 更便宜——线程启动与消息延迟都低一个量级，还能用 transferList 零拷贝转移 ArrayBuffer（通信机制见笔记 08 第 6 节）。

**第三问：通信形态是什么？** 「一次传数据进去、算很久、一次传结果出来」worker 完胜；「高频小消息」先算结构化克隆的账，不划算就 SharedArrayBuffer（同步自理）或干脆留主线程；「需要完整 Node 生态与模块缓存语义」的选 fork（子进程有全套模块系统）。

两条边界补语。其一，worker 里没有「免费的全局」：每个 isolate 独立，模块缓存、全局单例各自一份，process.env 是可定制的副本——「把主线程的缓存对象直接发过去」的预期会落空，能传的只有结构化克隆副本或 transferable。其二，worker 不继承主线程的热身：V8 对每个 isolate 从冷起步（重新解析与编译），短命计算任务的「启动加编译加克隆」固定成本可能超过计算本身——这正是正文 §5「worker 账」里 2 × 通信成本那一项的构成，短任务方向通常是不并行。

## 实跑取证：四条命令与原始输出（node v24.10.0，Apple M 系/arm64）

以下脚本都只有十几行，任何机器三十秒内可复跑；输出行里的数字因机器与负载而异，**顺序与字段含义**才是要核对的对象。四条收据分别对应 D1 的池宽、D2 的插队点、正文 §2 的堆外内存与本节的漂移语义——把「结论」与「证据」一一挂牢，是这两册反复强调的纪律。

收据 1：调度时序（含模块系统维度）。

```js
// probe.mjs（ESM 顶层）
const order = [];
process.nextTick(() => order.push("nextTick"));
Promise.resolve().then(() => order.push("microtask"));
setTimeout(() => order.push("setTimeout(0)"), 0);
setImmediate(() => order.push("setImmediate"));
process.on("exit", () => console.log(order.join(" | ")));
```

```text
.mjs 运行：microtask | nextTick | setImmediate | setTimeout(0)
.cjs 运行：nextTick   | microtask | setImmediate | setTimeout(0)
```

另取「timer 回调内部再排两个」的版本（D2 的阶段内序）：`inner setImmediate` 稳定早于 `inner-inner setTimeout(0)`。读法见 D2。

收据 2：线程池宽度对照（8 个并发 `pbkdf2`，60000 轮迭代、sha256、32 字节）：

```text
默认池（4 线程）：8 concurrent pbkdf2 total ms: 18
UV_THREADPOOL_SIZE=1：8 concurrent pbkdf2 total ms: 39
```

同机同脚本两次运行，比值约二倍出头、不到四倍——任务粒度与启动开销掺在里面，方向与量级稳定（D1 的读法）。

收据 3：`process.memoryUsage` 的堆外字段（分配 5 块 20MB Buffer 前后，单位 MB，toFixed(1)）：

```text
heapUsed:     3.4  -> 3.2
external:     1.3  -> 101.3
arrayBuffers: 0.0  -> 100.0
rss:          39.5 -> 140.4
```

读法：100MB 全部落在 `external` 与 `arrayBuffers`（Buffer 底层是堆外 ArrayBuffer 的封装），`heapUsed` 纹丝不动；`rss` 同步涨 100MB——「堆没涨、进程内存涨」的排查入口就是这三行。

收据 4：主线程阻塞下的定时器漂移（`setInterval` 10ms，第 3 次回调内同步阻塞 200ms，记录相邻两次回调的实际间隔）：

```text
10ms setInterval 实际间隔: 10,13,12,200,12,12
```

读法：阻塞让下一次回调迟到约 200ms；此后间隔恢复 10ms 上下——**迟到的 tick 不会补偿性连发**，setInterval 的语义是「按当前时刻调度下一次」，不是「补齐错过次数」。监控定时器漂移就是监控这列数字的最大值，把它接进健康检查端点，阻塞类事故从「用户投诉发现」前移到「分钟级告警」。

## 工程三陷阱

**陷阱一：请求路径上的同步 I/O 与同步 crypto**。`fs.readFileSync`、`JSON.parse` 大响应体、`crypto.randomBytes` 与 `pbkdf2` 的同步版，都把阻塞直接钉在主线程上——线程池再宽也救不了，因为它们根本没进池。高并发服务的延迟毛刺十有八九源于此。处置：请求路径一律异步版（`randomBytes` 异步、`pbkdf2` 异步，或启动期预生成随机池）；确实必须同步的（启动期读配置）放到启动期。识别手法：漂移探针的异常尖峰与某个接口的调用对齐时，先审这个接口路径上的每一个同步调用——同步 API 的名字都带 Sync 或没有回调参数，机械扫描即可列全。

**陷阱二：调大 UV_THREADPOOL_SIZE 当万能药**。现象是「服务卡」就设 `UV_THREADPOOL_SIZE=32`。机制账：池是四类任务共享的（D1），加大后 pbkdf2 类 CPU 任务与文件 I/O 抢核；主线程阻塞类瓶颈完全不吃这一套；每线程还有独立栈内存。处置：先用收据 2 的对照法确认瓶颈真的在池上（缩池会显著变慢、扩池显著变快才算数），否则回到排查表找真凶。

**陷阱三：把 worker 当异步用，或用小消息轰炸 worker**。worker_threads 只为 CPU 密集纯计算；I/O 在主线程本来就是异步的，「开个 worker 去请求接口」只多付结构化克隆成本；反过来「高频小消息」的 worker 池 RPC（每次传几个数字）也常被克隆与调度成本吃掉收益（正文 §5 判据 1 的反面）。处置：按「一次传数据进去、算很久、一次传结果出来」的形态使用 worker；高频交互改 SharedArrayBuffer（要自己处理同步）或干脆留在主线程。

## 追问三则

- **为什么 `setTimeout(fn, 0)` 不是「立即执行」？** 传 0 会被收到最小阈值（毫秒级），且至少要等下一轮循环的 timers 相位；深层嵌套的短延时定时器还有进一步的最小阈值处理（Node 的定时器实现沿用了浏览器同款防滥用口径，细节以源码 `lib/timers.js` 为准）。想要「本轮循环内、尽可能快」，用 `setImmediate`——但按 D2 注意插队点与模块系统的差异。定时器的精度承诺是「不早于」，不是「等于」。
- **为什么文件 I/O 的异步 API 也要进线程池，网络 I/O 不用？** 网络套接字能被事件机制（epoll/kqueue 类）高效等待——「有没有数据」是个事件；普通文件的读写没有等价的就绪事件语义，同步系统调用就是会阻塞，libuv 只能用线程池**模拟**异步文件 I/O。这是 D1「四类任务」里文件类的机制根源，也解释了为什么高并发文件服务的瓶颈常常是池宽而不是 CPU。
- **cluster 的 round-robin 能换吗？** 能：`cluster.schedulingPolicy` 可设为交给操作系统分发的那档（正文 §5 判据 2 提到 Windows 默认走系统分发）。工程判据：短请求为主时 round-robin 更均匀；长连接为主时系统分发更均衡（连接建立与断开的节奏不再整齐）。选择前先用正文练习 05 的方法实测一轮真实流量形态，而不是按默认值将就。

## 排查速查表（事件循环阻塞诊断）

这张表的用法是「先分型、再取数」：延迟类现象取时间数据（漂移探针、lag 监控），内存类取字段数据（memoryUsage 三字段对照），排队类做对照实验（池大小二分）。所有手段都便宜——最重的也只是两次进程启动。比单次读数更值钱的是**变化率**：一次性读数只给基线，异常由趋势暴露；把这几条探针接进日常健康检查，比事故后再取证省一个数量级的成本。

| 现象 | 定位手段 | 一句话根因 |
| --- | --- | --- |
| 定时器漂移（间隔远超设定） | 本册收据 4 的漂移探针、`perf_hooks.monitorEventLoopDelay` | 主线程同步长任务 |
| CPU 占用高、吞吐反而低 | `--cpu-prof` 看顶层是业务函数还是 GC/序列化 | 阻塞调用分散在请求路径 |
| 偶发延迟毛刺、无规律 | event loop lag 心跳（自测 setTimeout 偏差） | 阶段被某个大回调卡住 |
| `heapUsed` 平、`rss` 涨 | `process.memoryUsage` 三字段对照（收据 3） | Buffer/堆外内存滞留 |
| fs/crypto 排队变慢 | 收据 2 的池对照实验 | 线程池被同类任务占满 |
| 定时器顺序输出困惑 | 收据 1 的时序探针 | 所处阶段与模块系统共同决定序 |
| 服务重启后偶发数据截断 | 检查退出路径是否 `process.exit` | 在飞行 I/O 被截断（正文 §1） |

## 决策速查表

这张表的每一行都能回溯到前文的一个机制或一条收据：选型不是查表背答案，而是「先说出这一行背后的机制，再抄结论」。给别人（或三个月后的自己）解释选型时，机制那句说不出，答案就还是别人的。

| 决策点 | 选 | 依据 |

| 决策点 | 选 | 依据 |
| --- | --- | --- |
| CPU 密集纯计算 | worker_threads | 正文 §5 判据 1，账要算通信成本 |
| 跑外部命令 | spawn/execFile（参数走数组） | shell 注入面与 maxBuffer（正文 §4） |
| HTTP 服务吃满多核 | cluster | 共享端口的最低改造成本 |
| 大文件/大响应 | `stream.pipeline` + 背压 | 正文 §3，水位是策略不是限额 |
| 高频随机字节 | 异步 randomBytes 或启动期预生成池 | 陷阱一，同步版钉死主线程 |
| 高频小消息并行 | 不并行，留主线程 | 陷阱三，克隆成本吃掉收益 |
| 池大小调不调 | 先做收据 2 的对照实验 | 陷阱二，无证据不调参 |
| 阻塞监控常态化 | `monitorEventLoopDelay` + 漂移探针 | 排查表前两行，接进健康检查 |

最后一句收束：本册与笔记 31 合起来是一台完整机器的两张图纸——31 画的是「时间如何被调度」（六阶段、两插队队列），35 画的是「空间如何被占用」（线程池、堆外内存、进程边界）。排查生产问题时先辨认症状落在哪张图上：延迟类（慢、毛刺、漂移）先查时间图，内存与进程类（rss、external、退出码）先查空间图；两张图的交汇点——「主线程与共享线程池的互相拖拽」与「事件循环与堆外 Buffer 的清理时机」——正是事故的高发带，速查表里最难的几行都站在这条带上。
