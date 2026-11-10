/**
 * 大纲章节：阶段 1.4 异步编程（深化补充：Node.js 事件循环）
 * 主题：libuv 六阶段、process.nextTick vs 微任务（含 ESM/CJS 差异！）、
 *       setImmediate vs setTimeout、微任务饥饿
 * 运行：npx tsx exercises/async-programming/06-node-event-loop.ts
 * 预期输出：（实测固化，见文末注释块）
 */

// ============================================================
// 笔记 04 讲的是 WHATWG HTML Standard 的事件循环（浏览器）。
// Node 没有实现 HTML Standard 的事件循环，而是基于 libuv 的
// 六阶段模型，微任务清空时机由 Node 自己定义。一手依据：
// Node 官方文档《The Node.js Event Loop, Timers, and
// process.nextTick》与《Event loop and nextTick》两章。
//
// libuv 一轮：timers → pending callbacks → idle/prepare → poll
// → check → close callbacks，循环往复；每个阶段之间清空
// nextTick 队列与微任务队列（nextTick 队列优先——但有例外，见 G1）。
//   timers 阶段跑 setTimeout/setInterval 到期回调；
//   check 阶段跑 setImmediate 回调。
//
// 本文件 4 组实验分开跑、各自等待落定后再进下一组，
// 避免跨组微任务交错污染输出。
// ============================================================

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// 第 1 组：ESM 与 CJS 顶层代码里，nextTick 与微任务的次序不同！
//
// 「nextTick 队列优先于微任务队列」只对【宏任务上下文】成立。
// 本文件是 ESM：Node 的 ESM 模块求值由 ModuleJob 的 Promise 链
// 驱动（模块求值本身是异步语义，top-level await 依赖于此），
// 顶层代码运行在微任务上下文中——它注册的 then/queueMicrotask
// 直接追加进【正在清空的微任务队列】，队列见底之前 nextTick
// 队列根本轮不到。CJS 的 require 是同步调用，模块体跑在 task
// 同步栈上，task 结束后按「先 nextTick 队列、再微任务队列」清空。
// 下面用子进程把同一份代码按 CJS 跑一遍，与本文件（ESM）对照。
// ============================================================
async function group1(): Promise<void> {
  console.log("== G1 同一份代码，ESM（本文件）vs CJS（子进程）==");

  process.nextTick(() => console.log("ESM: nextTick 1"));
  Promise.resolve().then(() => console.log("ESM: then 1"));
  queueMicrotask(() => console.log("ESM: queueMicrotask 1"));

  // 等 ESM 三行打完（微任务队列见底 + nextTick 队列清空 + 一个 timer 代）
  await sleep(10);

  const cjsSource = `
    process.nextTick(() => console.log("CJS: nextTick 1"));
    Promise.resolve().then(() => console.log("CJS: then 1"));
    queueMicrotask(() => console.log("CJS: queueMicrotask 1"));
  `;
  execFileSync(process.execPath, ["-e", cjsSource], { stdio: "inherit" });

  // ---- 1b：证明「每个 timer 回调之后、下一个 timer 之前清空微任务」----
  // 两个同为 0ms 的 timer：T1 回调里排一个微任务。
  // Node >= 11：微任务插在 T1 与 T2 之间（逐回调即清，与浏览器对齐）；
  // Node < 11 的老行为是「整个 timers 阶段跑完才清」→ 微任务排在 T2 之后。
  console.log("== G1b 每个 timer 回调后立刻清空微任务 ==");
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log("G1b T1（第 1 个 timer 回调）");
      Promise.resolve().then(() => console.log("G1b ← T1 排的微任务，插在 T1 与 T2 之间"));
    }, 0);
    setTimeout(() => {
      console.log("G1b T2（第 2 个 timer 回调）");
      resolve();
    }, 0);
  });
}

// ============================================================
// 第 2 组：nextTick 队列与微任务队列的「交替见底」交错模型
// 规则（实测归纳）：清空过程按队列为单位交替——
//   正在清哪个队列，就先把这个队列清到见底（含过程中新排入的），
//   见底后切换到另一个队列，如此往复。
// 「哪个队列先开始清」取决于触发清空的上下文（见 G1 的 ESM/CJS 差异）。
// ============================================================
async function group2(): Promise<void> {
  console.log("== G2 nextTick 与微任务交替见底 ==");

  Promise.resolve().then(() => {
    console.log("G2 微任务 1");
    queueMicrotask(() => console.log("G2 ← 微任务 1 排的微任务（微任务队列还没见底）"));
    process.nextTick(() => console.log("G2 ← 微任务 1 排的 nextTick（等微任务队列见底）"));
  });
  process.nextTick(() => {
    console.log("G2 nextTick 1");
    Promise.resolve().then(() => console.log("G2 ← nextTick 1 排的微任务（等 nextTick 队列见底）"));
    process.nextTick(() => console.log("G2 ← nextTick 1 排的 nextTick（nextTick 队列还没见底）"));
  });

  await sleep(10);
}

// ============================================================
// 第 3 组：I/O 回调里 setImmediate 恒先于 setTimeout
// 主模块里两者次序不确定；但在 I/O 周期内（poll 阶段执行的
// 回调里）注册的两者顺序恒定：poll → check（immediate）
// → 下一轮循环的 timers（timer）。
// ============================================================
async function group3(): Promise<void> {
  console.log("== G3 I/O 回调内 setImmediate vs setTimeout ==");

  await readFile(import.meta.filename!, "utf8"); // 任意一次真实 I/O
  // 此刻的续体运行在「I/O 完成通知」之后，等价于文档说的 I/O cycle 内
  setImmediate(() => console.log("G3 setImmediate（check 阶段：poll 后、下一轮 timers 前）"));
  setTimeout(() => console.log("G3 setTimeout 0（要等下一轮循环的 timers 阶段）"), 0);

  await sleep(10);
}

// ============================================================
// 第 4 组：饥饿对照——递归 nextTick 饿死 timer，递归
// setImmediate 每代之间事件循环照转（timer 能插入）
// ============================================================
async function group4(): Promise<void> {
  console.log("== G4 递归 nextTick vs 递归 setImmediate ==");

  // 4a：10 万次递归 nextTick。nextTick 队列见不了底，
  // 事件循环就进不了下一个阶段，timer 只能等全部跑完。
  let n = 0;
  const tickRecurse = (): void => {
    if (++n >= 100_000) return;
    process.nextTick(tickRecurse);
  };
  process.nextTick(tickRecurse);
  setTimeout(() => console.log(`G4a timer 终于轮到（此时 nextTick 已排 ${n} 次）`), 0);
  await sleep(10);

  // 4b：同样 10 万次，但每次排 setImmediate。immediate 回调跑在
  // check 阶段，两代之间事件循环完整转了一圈 → timers 阶段有机会
  // 执行，timer 早早插入。
  let m = 0;
  const immediateRecurse = (): void => {
    if (++m >= 100_000) return;
    setImmediate(immediateRecurse);
  };
  setImmediate(immediateRecurse);
  setTimeout(() => console.log(`G4b timer 插队成功（此时 immediate 才排到第 ${m} 次）`), 0);
  await new Promise<void>((resolve) => {
    const check = (): void => (m >= 100_000 ? resolve() : setImmediate(check));
    setImmediate(check);
  });
}

// ============================================================
// 串行跑四组（每组的 await 兜底保证组间不交错）
// ============================================================
(async (): Promise<void> => {
  await group1();
  await group2();
  await group3();
  await group4();
})();

/*
== 实测输出（Node v24.10.0，npx tsx，多次运行稳定）==
== G1 同一份代码，ESM（本文件）vs CJS（子进程）==
ESM: then 1
ESM: queueMicrotask 1
ESM: nextTick 1
CJS: nextTick 1
CJS: then 1
CJS: queueMicrotask 1
== G1b 每个 timer 回调后立刻清空微任务 ==
G1b T1（第 1 个 timer 回调）
G1b ← T1 排的微任务，插在 T1 与 T2 之间
G1b T2（第 2 个 timer 回调）
== G2 nextTick 与微任务交替见底 ==
G2 微任务 1
G2 ← 微任务 1 排的微任务（微任务队列还没见底）
G2 nextTick 1
G2 ← 微任务 1 排的 nextTick（等微任务队列见底）
G2 ← nextTick 1 排的 nextTick（nextTick 队列还没见底）
G2 ← nextTick 1 排的微任务（等 nextTick 队列见底）
== G3 I/O 回调内 setImmediate vs setTimeout ==
G3 setImmediate（check 阶段：poll 后、下一轮 timers 前）
G3 setTimeout 0（要等下一轮循环的 timers 阶段）
== G4 递归 nextTick vs 递归 setImmediate ==
G4a timer 终于轮到（此时 nextTick 已排 100000 次）
G4b timer 插队成功（此时 immediate 才排到第 1~5 次——插入点有调度抖动，
    但都是「早早插进来」，与 4a 的「等满 10 万次」形成对照）
*/
