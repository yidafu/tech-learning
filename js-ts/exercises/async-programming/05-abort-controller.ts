/**
 * 大纲章节：阶段 1.4 异步编程
 * 主题：AbortController——abort 事件、signal.reason、AbortSignal.timeout、手写可取消 delay、晚到的监听器
 * 运行：npx tsx exercises/async-programming/05-abort-controller.ts
 * 预期输出：
 * == 1. abort() 的即时效果 ==
 *   abort 前: signal.aborted = false
 *   [abort 事件] 在 abort() 调用过程中同步触发
 *   abort 后: signal.aborted = true
 * == 2. signal.reason ==
 *   reason instanceof DOMException = true
 *   reason.name = AbortError
 *   reason.message = This operation was aborted
 *   自定义 reason = 自定义原因
 * == 3. 一个 signal 打通多个消费者 ==
 *   [10ms] 调用 shared.abort()，两个消费者同时收到取消
 *   job1 被取消（AbortError）；job2 被取消（AbortError）
 *   [3b] 没有取消时 20ms 后正常 resolve
 * == 4. AbortSignal.timeout ==
 *   创建时: aborted = false
 *   20ms 后被超时取消: reason.name = TimeoutError
 *   此刻 signal.aborted = true
 * == 5. 晚到的 abort 监听器 ==
 *   10ms 后晚到的监听器触发了吗: false
 *   可移植的写法: 订阅时先看 signal.aborted = true
 *   signal.throwIfAborted() 抛出: AbortError
 */

// ============================================================
// 核心观念：AbortController 取消的【不是 Promise 的状态】。
// Promise 一旦创建，只能由创建它的异步操作自然落定，外界无法改写；
// 「取消」的本质是：通知所有订阅了 signal 的【副作用】（定时器、
// 网络请求、循环……）尽快收尾，并让等待方提前得到一个确定的结局
// （通常是 reject AbortError）。
// ============================================================

// ===== 1. abort() 同步派发 abort 事件；signal.aborted 置位 =====
console.log("== 1. abort() 的即时效果 ==");
const c1 = new AbortController();
console.log("  abort 前: signal.aborted =", c1.signal.aborted);
c1.signal.addEventListener("abort", () => {
  // DOM Standard「signal abort」算法：fire an event named abort —— 同步派发
  console.log("  [abort 事件] 在 abort() 调用过程中同步触发");
});
c1.abort(); // 再次 abort() 是无操作：状态已定格，事件也不会重发
console.log("  abort 后: signal.aborted =", c1.signal.aborted);

// ===== 2. signal.reason：默认是 name 为 "AbortError" 的 DOMException =====
console.log("== 2. signal.reason ==");
const r1: unknown = c1.signal.reason;
console.log("  reason instanceof DOMException =", r1 instanceof DOMException);
console.log("  reason.name =", (r1 as DOMException).name);
// 注：name "AbortError" 由规范固定；message 的具体文本规范不保证
//（不同环境可能不同），生产代码只判断 name / instanceof，别匹配 message。
console.log("  reason.message =", (r1 as DOMException).message);
const c1b = new AbortController();
c1b.abort("自定义原因"); // abort(reason)：reason 可以是任意值
console.log("  自定义 reason =", c1b.signal.reason);

// ===== 3. 手写 cancellableDelay：把「取消」翻译成 reject =====
// 要点：
//   a. 订阅前先检查 signal.aborted —— 见第 5 节：abort 之后才 addEventListener
//      不会再收到事件（规范如此，Node 24 实测一致）；
//   b. 取消时清理自己的副作用（clearTimeout），再用 signal.reason reject，
//      让等待方立刻得到确定的结局，而不是傻等满时长。
function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason); // a. 已取消：直接拒绝，别再挂定时器
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer); // b. 清理副作用
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort); // 正常完成：退订
      resolve(undefined);
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

console.log("== 3. 一个 signal 打通多个消费者 ==");
const shared = new AbortController();
const job1 = cancellableDelay(80, shared.signal).then(
  () => "job1 完成",
  (e: unknown) => `job1 被取消（${(e as DOMException).name}）`,
);
const job2 = cancellableDelay(80, shared.signal).then(
  () => "job2 完成",
  (e: unknown) => `job2 被取消（${(e as DOMException).name}）`,
);
setTimeout(() => {
  console.log("  [10ms] 调用 shared.abort()，两个消费者同时收到取消");
  shared.abort(); // 一次 abort，所有订阅者的事件同时触发
}, 10);
const results: string[] = [await job1, await job2];
console.log("  " + results.join("；"));

await cancellableDelay(20, new AbortController().signal); // 未取消：正常走完
console.log("  [3b] 没有取消时 20ms 后正常 resolve");

// ===== 4. AbortSignal.timeout：到点自动 abort =====
// 与手动 abort 的区别在 reason：timeout 用 name 为 "TimeoutError" 的
// DOMException（规范行为），调用方因此能区分「主动取消」和「超时取消」。
console.log("== 4. AbortSignal.timeout ==");
const t = AbortSignal.timeout(20);
console.log("  创建时: aborted =", t.aborted);
await cancellableDelay(60, t).then(
  () => console.log("  不会走到这（20ms 先到，已被超时取消）"),
  (e: unknown) => console.log(`  20ms 后被超时取消: reason.name = ${(e as DOMException).name}`),
);
console.log("  此刻 signal.aborted =", t.aborted);
// 组合器补充：AbortSignal.any([s1, s2]) —— 任一源 abort 则合成信号 abort，
// 用于「用户取消或超时，先到先得」的场景（Node 20+ / 现代浏览器）。

// ===== 5. abort 之后再监听：不会补发 =====
// DOM Standard 只规定 abort() 时向【当时已注册】的监听器同步派发事件；
// 对之后才 addEventListener 的监听器没有补发要求。Node 24 实测：不补发。
// 所以可移植的写法是：订阅时先检查 signal.aborted，或用 throwIfAborted()。
console.log("== 5. 晚到的 abort 监听器 ==");
const c5 = new AbortController();
c5.abort();
let lateFired = false;
c5.signal.addEventListener("abort", () => {
  lateFired = true;
}, { once: true }); // once: true 表示触发一次后自动移除（本例根本不会触发）
await new Promise<void>((resolve) => setTimeout(resolve, 10));
console.log("  10ms 后晚到的监听器触发了吗:", lateFired);
console.log("  可移植的写法: 订阅时先看 signal.aborted =", c5.signal.aborted);
try {
  c5.signal.throwIfAborted(); // 已 aborted → 同步抛出 signal.reason
} catch (e) {
  console.log("  signal.throwIfAborted() 抛出:", (e as DOMException).name);
}

export {}; // 顶层 await 要求本文件是 ESM 模块
