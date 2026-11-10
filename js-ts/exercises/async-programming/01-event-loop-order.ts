/**
 * 大纲章节：阶段 1.4 异步编程
 * 主题：事件循环输出顺序综合——同步代码 / 微任务（then、queueMicrotask、await 续体）/ 宏任务（setTimeout）
 * 运行：npx tsx exercises/async-programming/01-event-loop-order.ts
 * 预期输出：
 * G1 [同步] 脚本开始
 * G1 [async 同步段] 调用即执行到 await 前
 * G1 [同步] 脚本结束
 * G1 [await 续体] 微任务第 1 个（先入队）
 * G1 [then 回调] 微任务第 2 个
 * G1 [queueMicrotask] 微任务第 3 个
 * G1 [setTimeout 回调] 宏任务：本轮微任务全部清空后才执行
 * G2 [同步] 脚本开始
 * G2 [同步] 脚本结束
 * G2 [微任务] then 第 1 层
 * G2 [微任务] then 第 2 层（比第 1 层晚一拍）
 * G2 [宏任务 T1] 第 1 层 setTimeout 回调
 * G2 [微任务] T1 排入的微任务（T1 之后、T2 之前）
 * G2 [宏任务 T2] 第 2 层 setTimeout 回调
 * G3 [同步] 脚本开始
 * G3 [async 同步段] IIFE 立即执行
 * G3 [同步] 脚本结束
 * G3 [await 续体] 微任务（第 1 个入队）
 * G3 [微任务] then 第 1 层回调
 * G3 [同步] new Promise 的 executor 立即执行
 * G3 [微任务] 脚本里的 queueMicrotask（排在 adoption 之前入队）
 * G3 [微任务] then 第 2 层收到 v=42（因 adoption 多等了 2 拍）
 * G3 [微任务] then 第 3 层
 * G3 [宏任务 T1] setTimeout 回调
 * G3 [微任务] T1 排入的微任务
 */

// ============================================================
// 整个脚本的初始执行本身就是一个 task（WHATWG HTML Standard
// 《Event loops》8.1.7 processing model）：
//   一轮循环 = 取 1 个 task 执行 → 清空整个 microtask 队列
//   （包括清空过程中新入队的微任务）→ （浏览器）rAF → 渲染。
//
// 因此下面三组如果直接平铺书写，它们的微任务会在同一个 task 结束后
// 按全局 FIFO 交错执行。为了让每组自成一个可读的实验，每组包进
// async 函数并在末尾 await 兜底定时器等本组全部落定，三组再串行 await。
//
// 兜底要按「定时器代数」等：定时器回调里再 setTimeout 会产生下一代
// 定时器（晚创建、晚触发），所以 group2（T1 的回调里还有 T2）要等两代。
// ============================================================

function flushTimers(generations: number): Promise<void> {
  let p: Promise<void> = Promise.resolve();
  for (let i = 0; i < generations; i++) {
    p = p.then(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  }
  return p;
}

// ============================================================
// 第 1 组（基础）：同步段 → 微任务队列 → 宏任务队列
// ============================================================
async function group1(): Promise<void> {
  console.log("G1 [同步] 脚本开始");

  // (a) 调用 async 函数：await 之前的函数体是【同步】执行的
  async function g1Async(): Promise<void> {
    console.log("G1 [async 同步段] 调用即执行到 await 前");
    await null; // await 非 thenable：续体被包成 1 个微任务入队，函数在此暂停并返回
    console.log("G1 [await 续体] 微任务第 1 个（先入队）");
  }
  void g1Async();
  // 快照：调用栈回到同步代码；微任务队列 = [g1Async 续体]；宏任务队列 = []

  // (b) then 回调：给已 fulfilled 的 promise 注册 reaction → 微任务
  Promise.resolve().then(() => {
    console.log("G1 [then 回调] 微任务第 2 个");
  });
  // 快照：微任务队列 = [g1Async 续体, then 回调]

  // (c) queueMicrotask：把回调直接排进微任务队列
  queueMicrotask(() => {
    console.log("G1 [queueMicrotask] 微任务第 3 个");
  });
  // 快照：微任务队列 = [g1Async 续体, then 回调, queueMicrotask 回调]

  // (d) setTimeout(fn, 0)：真实含义是「下一轮循环的 task」
  //     （HTML Standard《timers》：嵌套层级 ≥ 5 且 delay < 4 时强制 4ms；
  //      但无论 delay 多小，它都是宏任务，永远排在本次清空的微任务之后）
  setTimeout(() => {
    console.log("G1 [setTimeout 回调] 宏任务：本轮微任务全部清空后才执行");
  }, 0);
  // 快照：微任务队列同上；宏任务队列 = [演示定时器]

  console.log("G1 [同步] 脚本结束");
  // 快照：同步 task 结束 → 逐个清空微任务（FIFO）→ 才取下一个宏任务

  await flushTimers(1); // 兜底：本组只有 1 代定时器
}

// ============================================================
// 第 2 组（进阶）：then 多层链 与 setTimeout 嵌套 的相对次序
// 每个 .then 的回调是独立的微任务：两层 then 至少隔一拍；
// 定时器回调里排入的微任务，在「本 task 结束后、下一个宏任务前」清空。
// ============================================================
async function group2(): Promise<void> {
  console.log("G2 [同步] 脚本开始");

  setTimeout(() => {
    console.log("G2 [宏任务 T1] 第 1 层 setTimeout 回调");
    Promise.resolve().then(() => {
      console.log("G2 [微任务] T1 排入的微任务（T1 之后、T2 之前）");
    });
    setTimeout(() => {
      console.log("G2 [宏任务 T2] 第 2 层 setTimeout 回调");
    }, 0);
  }, 0);

  Promise.resolve()
    .then(() => {
      console.log("G2 [微任务] then 第 1 层");
    })
    .then(() => {
      console.log("G2 [微任务] then 第 2 层（比第 1 层晚一拍）");
    });

  console.log("G2 [同步] 脚本结束");
  // 快照：微任务队列 = [then 第 1 层]；宏任务队列 = [T1]
  // 执行流：then 第 1 层 → 入队第 2 层 → 第 2 层 → 微任务空 → T1
  //        → T1 内入队微任务 + 宏任务 T2 → 清空微任务 → T2

  await flushTimers(2); // 兜底：T1 回调里还创建了第 2 代的 T2，要等两代
}

// ============================================================
// 第 3 组（最难）：async 同步段、executor 同步执行、thenable adoption「多一拍」
// 三个要点：
//   1. new Promise(executor) 的 executor 是【同步】执行的；
//   2. then 回调里 return 一个 promise/thenable，下一层要「多等拍」：
//      ECMA-262 NewPromiseResolveThenableJob —— resolve 一个 thenable
//      会先排一个 Job 去调用它的 then(...)，其结果再排一个 reaction，
//      因此比 return 普通值多出 2 个微任务拍；
//   3. 微任务队列严格 FIFO：谁先入队谁先执行。
// ============================================================
async function group3(): Promise<void> {
  console.log("G3 [同步] 脚本开始");

  setTimeout(() => {
    console.log("G3 [宏任务 T1] setTimeout 回调");
    queueMicrotask(() => {
      console.log("G3 [微任务] T1 排入的微任务");
    });
  }, 0);

  void (async (): Promise<void> => {
    console.log("G3 [async 同步段] IIFE 立即执行");
    await null;
    console.log("G3 [await 续体] 微任务（第 1 个入队）");
  })();

  Promise.resolve()
    .then((): Promise<number> => {
      console.log("G3 [微任务] then 第 1 层回调");
      // executor 在 then 回调执行到这一行时【同步】运行：
      return new Promise<number>((resolve) => {
        console.log("G3 [同步] new Promise 的 executor 立即执行");
        resolve(42);
      });
    })
    .then((v: number) => {
      console.log(`G3 [微任务] then 第 2 层收到 v=${v}（因 adoption 多等了 2 拍）`);
    })
    .then(() => {
      console.log("G3 [微任务] then 第 3 层");
    });

  queueMicrotask(() => {
    console.log("G3 [微任务] 脚本里的 queueMicrotask（排在 adoption 之前入队）");
  });

  console.log("G3 [同步] 脚本结束");
  // 快照：微任务队列 = [await 续体, then 第 1 层, queueMicrotask]；宏任务 = [T1]
  // 关键对照：then 第 2 层因 adoption 多等 2 拍，反而排在
  //          「更晚入队」的 queueMicrotask 之后 —— 这就是面试里的「多一拍」题。

  await flushTimers(1);
}

await group1();
await group2();
await group3();

export {}; // 顶层 await 要求本文件是 ESM 模块
