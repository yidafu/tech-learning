/**
 * 大纲章节：阶段 1.4 异步编程
 * 主题：Promise 状态机——状态不可逆、resolve 只认第一次、值穿透、thenable adoption、catch/finally 位置
 * 运行：npx tsx exercises/async-programming/02-promise-state-machine.ts
 * 预期输出：
 * [demo1] executor 同步执行完毕（之后的 resolve/reject 都被忽略）
 * [demo1] then 返回的是新 Promise: true
 * [demo1] then 收到 v=1（只打印这一次）
 * [demo2] 开始：then(123) 与 then(null) 都不是函数
 * [demo2] 第三层才拿到 v=穿透值（前两层被「穿透」）
 * [demo3] 对照：返回普通值 vs 返回自定义 thenable
 * [demo3] A 执行，返回自定义 thenable
 * [demo3] B 执行，返回普通值 99
 * [demo3] thenable.then 被调用（多出的拍）
 * [demo3] D 执行，v=99
 * [demo3] C 执行，v=99
 * [demo4] 错误沿链传播，直到最近的 onRejected
 * [demo4] S1 抛错
 * [demo4] S2 catch 捕获: boom
 * [demo4] S3 收到恢复值: recovered
 * [demo4] catch 被跳过，值原样透传: ok
 * [demo5] finally 不改值，但回调抛错会覆盖结果
 * [demo5] 1) fulfilled 的 finally 执行
 * [demo5] 2) 值透传: payload
 * [demo5] 3) rejected 的 finally 也执行
 * [demo5] 4) reason 透传: fatal
 * [demo5] 5) finally 回调抛出异常
 * [demo5] 6) 原值被覆盖，收到: from finally
 * [demo6] 及时 catch: must-be-caught
 */

// 每个_demoN 用 async 函数 + 顶层 await 串行执行，
// 保证各 demo 的输出互不交错（交错排序见 01-event-loop-order.ts）。

// ============================================================
// demo1 状态机：pending → fulfilled/rejected 不可逆
// ECMA-262 §27.2 Promise：resolve/reject 只有第一次调用生效，
// 之后再调用直接返回（Promise 的 [[PromiseState]] 已不是 pending）。
// then/catch/finally 都返回【新的】Promise，这是链式的基础。
// ============================================================
async function demo1(): Promise<void> {
  const p1 = new Promise<number>((resolve, reject) => {
    resolve(1);                    // ← 第一次：生效，p1 = fulfilled(1)
    resolve(2);                    // ← 已 settled：静默忽略
    reject(new Error("nope"));     // ← 同样忽略
  });
  console.log("[demo1] executor 同步执行完毕（之后的 resolve/reject 都被忽略）");

  const t1 = p1.then((v) => console.log(`[demo1] then 收到 v=${v}（只打印这一次）`));
  // （用 as object 抹掉泛型差异，只比较引用是否相同）
  console.log("[demo1] then 返回的是新 Promise:", (t1 as object) !== (p1 as object));
  await t1;
}

// ============================================================
// demo2 值穿透：then 的参数不是函数时，不会报错，
// 而是被当作 identity 处理（值/原因原样传给下一层）。
// 依据 ECMA-262 PerformPromiseThen / PromiseReactionJob：
// 非 callable 的 onFulfilled 等价于 undefined → 用默认行为透传。
// ============================================================
async function demo2(): Promise<void> {
  console.log("[demo2] 开始：then(123) 与 then(null) 都不是函数");
  const p = Promise.resolve("穿透值")
    // @ts-expect-error 故意传非函数：类型上是错误，运行时按 identity 透传
    .then(123)
    .then(null) // null 不是 callable，同样透传
    .then((v) => {
      console.log(`[demo2] 第三层才拿到 v=${v}（前两层被「穿透」）`);
    });
  await p;
}

// ============================================================
// demo3 thenable adoption：resolve 一个 thenable 会「多一拍」
// 依据 ECMA-262 NewPromiseResolveThenableJob：
//   reaction 里 return 一个 thenable → 先排一个 Job 去调它的 then(...)
//   → then 回调 resolve 外层 promise → 再排一个 reaction 给下一层。
// 对照组 B 返回普通值，只差一个 reaction，所以 D 先于 C 打印。
// （这也是面试题「then 链里 return promise 为什么多一拍」的答案）
// ============================================================
async function demo3(): Promise<void> {
  console.log("[demo3] 对照：返回普通值 vs 返回自定义 thenable");

  const thenable = {
    then(onFulfilled: (v: number) => void, _onRejected?: (reason: unknown) => void): void {
      console.log("[demo3] thenable.then 被调用（多出的拍）");
      onFulfilled(99);
    },
  };

  const chainA = Promise.resolve("start")
    .then(() => {
      console.log("[demo3] A 执行，返回自定义 thenable");
      // TS 的类型系统不建模 thenable adoption（下一层运行时收到的是 99），
      // 这里断言成 number 正是在描述「adoption 之后」链上传递的真实值类型。
      return thenable as unknown as number;
    })
    .then((v) => console.log(`[demo3] C 执行，v=${v}`));

  const chainB = Promise.resolve("start")
    .then(() => {
      console.log("[demo3] B 执行，返回普通值 99");
      return 99;
    })
    .then((v) => console.log(`[demo3] D 执行，v=${v}`));

  await Promise.all([chainA, chainB]);
}

// ============================================================
// demo4 catch 的位置语义：
// - 错误沿链向后传播，直到最近的 onRejected（catch / then 的第二个参数）；
// - catch 处理完，链条恢复 fulfilled，后面的 catch 不会再触发；
// - fulfilled 的链会「跳过」catch，值原样透传。
// ============================================================
async function demo4(): Promise<void> {
  console.log("[demo4] 错误沿链传播，直到最近的 onRejected");

  const p = Promise.resolve()
    .then(() => {
      console.log("[demo4] S1 抛错");
      throw new Error("boom");
    })
    .catch((e: Error) => {
      console.log(`[demo4] S2 catch 捕获: ${e.message}`);
      return "recovered"; // catch 的返回值 → 链条恢复 fulfilled
    })
    .then((v) => console.log(`[demo4] S3 收到恢复值: ${v}`))
    .catch(() => console.log("[demo4] S4 不会执行")); // 不会再有错误传到这里
  await p;

  const q = Promise.resolve("ok")
    .catch(() => {
      console.log("[demo4] 不打印：fulfilled 会跳过 catch");
      return "swallowed";
    })
    .then((v) => console.log(`[demo4] catch 被跳过，值原样透传: ${v}`));
  await q;
}

// ============================================================
// demo5 finally：
// - 回调不接收参数、正常返回时【透传】值和 rejected 状态；
// - 但 finally 的回调如果自己 throw，会用新异常【覆盖】原结果。
// ============================================================
async function demo5(): Promise<void> {
  console.log("[demo5] finally 不改值，但回调抛错会覆盖结果");

  await Promise.resolve("payload")
    .finally(() => console.log("[demo5] 1) fulfilled 的 finally 执行"))
    .then((v) => console.log(`[demo5] 2) 值透传: ${v}`));

  await Promise.reject(new Error("fatal"))
    .finally(() => console.log("[demo5] 3) rejected 的 finally 也执行"))
    .catch((e: Error) => console.log(`[demo5] 4) reason 透传: ${e.message}`));

  await Promise.resolve("original")
    .finally(() => {
      console.log("[demo5] 5) finally 回调抛出异常");
      throw new Error("from finally");
    })
    .catch((e: Error) => console.log(`[demo5] 6) 原值被覆盖，收到: ${e.message}`));
}

// ============================================================
// demo6 unhandled rejection（Node 的表现）：
// 1) rejected 的 Promise 若在本轮微任务清空后仍没有 onRejected，
//    宿主会被通报（ECMA-262 HostPromiseRejectionTracker）；
// 2) Node 15+ 默认策略：触发 process 级 'unhandledRejection' 后直接
//    【抛出】使进程以非 0 退出码退出（ERR_UNHANDLED_REJECTION 打到 stderr）；
// 3) 之后才补 .catch 会收到 'rejectionHandled'，但进程可能早已退出。
// 结论：每条链末端都要有 catch。本 demo 演示「及时 catch」——
// 在同一同步代码里补上处理器，tracker 视为已处理，不会告警。
// ============================================================
async function demo6(): Promise<void> {
  const risky: Promise<never> = Promise.reject(new Error("must-be-caught"));
  const handled = risky.catch((e: Error) => {
    console.log(`[demo6] 及时 catch: ${e.message}`);
  });
  await handled;
}

await demo1();
await demo2();
await demo3();
await demo4();
await demo5();
await demo6();

export {}; // 顶层 await 要求本文件是 ESM 模块
