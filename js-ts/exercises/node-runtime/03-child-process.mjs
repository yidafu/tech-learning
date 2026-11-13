/**
 * 大纲章节：阶段 2 引擎与运行时（Node.js 运行时）
 * 主题：child_process 四件套：spawn / execFile / exec / fork；exit code vs signal；maxBuffer；IPC
 * 运行：node exercises/node-runtime/03-child-process.mjs
 * 预期输出（逐行；全部经主进程代打印，顺序确定）：
 *   == child_process：spawn / execFile / exec / fork ==
 *   [spawn] stdout = "hello from child"，exit code = 0，signal = null
 *   [execFile] 子命令本想输出 2MB，maxBuffer = 1024 → 报错 code = ERR_CHILD_PROCESS_STDIO_MAXBUFFER
 *   [execFile] maxBuffer 是「安全阀」：大输出应该用 spawn 流式读取，而不是调大 maxBuffer
 *   [exec] 经 shell 执行表达式 1+1 → stdout = "2"（err = 无）
 *   [exit] process.exit(3) 的子进程：code = 3，signal = null
 *   [exit] 被 SIGTERM 杀死的子进程：code = null，signal = SIGTERM
 *   [fork] 同文件分身：父进程发 {n:12}，子进程回平方 144，IPC 往返 2 条消息
 *   [结论] fork = spawn + 内置 IPC；code 与 signal 互斥；exec 的命令串过 shell，参数必须自己拼安全
 */

// ---------------------------------------------------------------------------
// 原理（对应笔记 notes/stage-2-engine-runtime/35-node-runtime.md 第 4 节）：
//
// 1. 四件套的边界：
//    - spawn(command, args)：不经过 shell，参数走数组（无注入面），stdout/stderr 是流；
//    - execFile(command, args)：同 spawn 不经 shell，但把输出收集成整块 buffer，
//      受 maxBuffer 限制（默认 1MB）—— 超限即杀子进程并报
//      ERR_CHILD_PROCESS_STDIO_MAXBUFFER；
//    - exec(commandString)：把整个命令串交给 /bin/sh（Windows 是 cmd.exe）执行，
//      「拼接用户输入进命令串」= shell 注入；
//    - fork(modulePath)：spawn 的特化 —— 补一条内置 IPC channel
//      （process.send / child.on('message')），消息走结构化克隆系序列化。
//
// 2. exit 事件的 code 与 signal 互斥：正常退出 code 是数字、signal 是 null；
//    被信号杀死 code 是 null、signal 是 'SIGTERM' 之类。两者可能都为 null
//    （启动失败），所以判断「子进程为什么死」要同时看两者 + 'error' 事件。
//
// 3. 本文件同时是「父脚本」与「fork 的子模块」：文件末尾用 process.send
//    是否存在区分角色（与 exercises/v8-and-performance/05-worker-threads.mjs
//    用 isMainThread 区分是同一个「单文件双角色」模式）。
// ---------------------------------------------------------------------------

import { spawn, execFile, exec, fork } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// ---------- fork 的子进程分支 ----------
if (process.send) {
  let received = 0;
  process.on('message', (msg) => {
    received++;
    if (msg.cmd === 'square') {
      process.send({ result: msg.n * msg.n }); // 子进程只回数据，不打印（保证输出顺序确定）
    }
    if (msg.cmd === 'bye') {
      // 收 2 条（square + bye）后退出，由父进程统一汇报
      process.send({ received });
      process.disconnect(); // 关闭 IPC channel：否则子进程会因 channel 存活而不退出
    }
  });
} else {
  // ---------- 父进程主流程 ----------
  const nodeBin = process.execPath; // 用当前 node 可执行文件，跨平台不写死路径
  console.log('== child_process：spawn / execFile / exec / fork ==');

  // 1) spawn：流式收集 stdout
  {
    const child = spawn(nodeBin, ['-e', 'console.log("hello from child")']);
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    const [code, signal] = await once(child, 'exit'); // exit 事件参数是 (code, signal)
    console.log(`[spawn] stdout = "${out.trim()}"，exit code = ${code}，signal = ${signal}`);
  }

  // 2) execFile 的 maxBuffer 安全阀
  {
    await new Promise((resolve) => {
      execFile(
        nodeBin,
        ['-e', 'process.stdout.write("x".repeat(2 * 1024 * 1024))'], // 想输出 2MB
        { maxBuffer: 1024 },
        (err) => {
          console.log(
            `[execFile] 子命令本想输出 2MB，maxBuffer = 1024 → 报错 code = ${err?.code}`,
          );
          console.log('[execFile] maxBuffer 是「安全阀」：大输出应该用 spawn 流式读取，而不是调大 maxBuffer');
          resolve();
        },
      );
    });
  }

  // 3) exec：整串命令交给 shell
  {
    await new Promise((resolve) => {
      exec(`"${nodeBin}" -e "console.log(1+1)"`, (err, stdout) => {
        console.log(`[exec] 经 shell 执行表达式 1+1 → stdout = "${stdout.trim()}"（err = ${err ? '有' : '无'}）`);
        resolve();
      });
    });
  }

  // 4) exit code vs signal
  {
    const c1 = spawn(nodeBin, ['-e', 'process.exit(3)']);
    const [code1, signal1] = await once(c1, 'exit');
    console.log(`[exit] process.exit(3) 的子进程：code = ${code1}，signal = ${signal1}`);

    const c2 = spawn(nodeBin, ['-e', 'process.kill(process.pid, "SIGTERM")']);
    const [code2, signal2] = await once(c2, 'exit');
    console.log(`[exit] 被 SIGTERM 杀死的子进程：code = ${code2}，signal = ${signal2}`);
  }

  // 5) fork：同文件双角色 + IPC
  {
    const child = fork(fileURLToPath(import.meta.url)); // fork 本文件 → 子进程里 process.send 存在
    const messages = [];
    child.on('message', (m) => messages.push(m));
    child.send({ cmd: 'square', n: 12 });
    await once(child, 'message'); // 等平方结果
    const square = messages[0].result;
    child.send({ cmd: 'bye' });
    const [summary] = await once(child, 'message'); // 等子进程汇报收到的消息数
    await once(child, 'exit'); // channel 关闭后子进程自然退出
    console.log(
      `[fork] 同文件分身：父进程发 {n:12}，子进程回平方 ${square}，IPC 往返 ${summary.received} 条消息`,
    );
  }

  console.log('[结论] fork = spawn + 内置 IPC；code 与 signal 互斥；exec 的命令串过 shell，参数必须自己拼安全');
}
