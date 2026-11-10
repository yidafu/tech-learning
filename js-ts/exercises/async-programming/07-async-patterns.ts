/**
 * 大纲章节：阶段 1.4 异步编程（深化补充：工程异步模式）
 * 主题：手写并发限制器 limit / 超时包装 withTimeout（race 模式与输家问题）/ 指数退避 retry / 三者组合
 * 运行：npx tsx exercises/async-programming/07-async-patterns.ts
 * 预期输出：（实测固化，见文末注释块）
 */

// ============================================================
// 笔记 04 的 4.4 说过「短路 ≠ 取消」、4.5 说过串行 vs 并发。
// 本练习补上工程侧的三个手写件，它们是生产代码 daily driver：
//   1. limit(n)：把「启动 N 个、并发 ≤ n」做成可复用原语；
//   2. withTimeout：给任何 Promise 加期限，并处理 race 输家；
//   3. retry：指数退避 + 只重试「值得重试」的错误 + 可被 AbortSignal 打断。
// 三个组件全部只用语言自带设施（Promise / AbortSignal / setTimeout）。
// ============================================================

// ------------------------------------------------------------
// 1. limit：并发限制器（pLimit 的核心原理）
//    active 计数 + 等待队列；槽位释放时出队一个排队者。
//    关键：限的是「同时进行的任务数」，不是「任务总数」。
// ------------------------------------------------------------
function limit(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = (): void => {
    active--;
    waiting.shift()?.(); // 叫醒最早排队的那个
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = (): void => {
        active++;
        task().then(
          (v) => {
            release();
            resolve(v);
          },
          (e) => {
            release(); // 失败也释放槽位，别让一个错误堵死整条队列
            reject(e);
          },
        );
      };
      if (active < concurrency) execute(); // 有空槽：立即启动
      else waiting.push(execute); // 没空槽：排队
    });
  };
}

// ------------------------------------------------------------
// 2. withTimeout：Promise.race 模式 + 输家问题
//    race 赢家定后，输家照常跑完（笔记 04「短路 ≠ 取消」）——
//    输家稍后若 reject 而无人处理 → unhandledRejection。
//    防御版给输家挂一个 noop catch「接管」它迟到的 rejection。
//    真正要停掉输家的副作用，必须把 signal 传进任务本身。
// ------------------------------------------------------------
function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(
    Object.assign(new Error(`timeout after ${ms}ms`), { name: "TimeoutError" }),
  ), ms);
  // 超时 = abort 信号（通知任务收尾）+ race 兜底（保证调用方拿到结局）
  const guarded = task(controller.signal).finally(() => clearTimeout(timer));
  return Promise.race([
    guarded,
    // 输家（guarded 若超时后 reject）由这个 catch 接管，防止 unhandledRejection
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(controller.signal.reason);
        guarded.catch(() => {}); // 吞掉输家迟到的 rejection
      }, { once: true });
    }),
  ]);
}

// ------------------------------------------------------------
// 3. retry：指数退避重试
//    - shouldRetry：只重试「值得重试」的错误（网络抖动），
//      4xx 这类确定性失败重试多少次都一样，直接抛；
//    - 退避等待挂在 signal 上：取消能立刻生效，不用等睡醒；
//    - sleep 的实现就是练习 05 的 cancellableDelay 简化版。
// ------------------------------------------------------------
interface RetryOptions {
  retries: number;
  baseMs: number;
  shouldRetry?: (err: unknown) => boolean;
  signal?: AbortSignal;
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(t);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function retry<T>(task: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { retries, baseMs, shouldRetry = () => true, signal } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await task(); // await 在 try 里：任务异常才有资格被下面的 catch 重试
    } catch (err) {
      const canRetry = attempt < retries && shouldRetry(err);
      if (!canRetry) throw err;
      const wait = baseMs * 2 ** attempt; // 指数退避：base, 2×base, 4×base…
      console.log(`    [retry] 第 ${attempt + 1} 次失败，${wait}ms 后重试（${(err as Error).message}）`);
      await abortableDelay(wait, signal ?? new AbortController().signal);
    }
  }
}

// ============================================================
// 验证区：四个实验
// ============================================================

// ---- 1. limit：8 个任务、并发 3，统计并发峰值 ----
function experimentLimit(): Promise<void> {
  console.log("== 1. limit(3) 跑 8 个任务 ==");
  const run = limit(3);
  let active = 0;
  let peak = 0;
  const task = (id: number, ms: number): (() => Promise<number>) =>
    () =>
      new Promise<number>((resolve) => {
        active++;
        peak = Math.max(peak, active);
        console.log(`  [开始] 任务 ${id}（当前并发 ${active}）`);
        setTimeout(() => {
          active--;
          console.log(`  [完成] 任务 ${id}`);
          resolve(id);
        }, ms);
      });

  const durations = [40, 30, 20, 10, 50, 30, 20, 10];
  return Promise.all(durations.map((d, i) => run(task(i + 1, d)))).then(() => {
    console.log(`  并发峰值 = ${peak}（≤ 3：${peak <= 3 ? "通过" : "失败"}）`);
  });
}

// ---- 2. withTimeout：超时后输家还在跑；防御版没有 unhandledRejection ----
async function experimentTimeout(): Promise<void> {
  console.log("== 2. withTimeout：超时、输家、取消联动 ==");

  // 2a 慢任务 60ms，30ms 超时：拿到 TimeoutError，但慢任务照常跑完
  const result = await withTimeout(
    (signal) => new Promise<string>((resolve) => {
      const t = setTimeout(() => resolve("慢任务结果"), 60);
      signal.addEventListener("abort", () => {
        // 任务自己响应 signal 清理副作用（真正的取消在这里发生）
        clearTimeout(t);
        console.log("  [慢任务] 收到 abort，清理副作用（ clearTimeout ）");
      }, { once: true });
    }),
    30,
  ).then(
    (v) => `成功: ${v}`,
    (e) => `超时: ${(e as Error).name}: ${(e as Error).message}`,
  );
  console.log(`  2a 结果 → ${result}`);

  // 2b 30ms 内完成：正常拿到值
  const fast = await withTimeout(() => new Promise<string>((r) => setTimeout(() => r("够了"), 10)), 30);
  console.log(`  2b 结果 → ${fast}`);
}

// ---- 3. retry：先失败两次再成功；确定性错误不重试；AbortSignal 打断等待 ----
async function experimentRetry(): Promise<void> {
  console.log("== 3. retry：指数退避 / 错误分类 / 可取消 ==");

  // 3a 前 2 次抛网络错，第 3 次成功（退避 10ms + 20ms，共 ~30ms）
  let calls = 0;
  const v = await retry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("网络抖动");
      return "ok";
    },
    { retries: 3, baseMs: 10 },
  );
  console.log(`  3a 共调用 ${calls} 次，结果 = ${v}`);

  // 3b shouldRetry 判定 404 不值得重试 → 第 1 次失败直接抛
  let calls2 = 0;
  try {
    await retry(
      async () => {
        calls2++;
        throw Object.assign(new Error("404 Not Found"), { status: 404 });
      },
      { retries: 3, baseMs: 10, shouldRetry: (e) => (e as { status?: number }).status !== 404 },
    );
  } catch (e) {
    console.log(`  3b 只调用 ${calls2} 次就放弃（404 是确定性错误）: ${(e as Error).message}`);
  }

  // 3c 第 1 次失败后退避 80ms，但 20ms 时外部 abort → 立刻退出
  const c = new AbortController();
  setTimeout(() => c.abort(), 20);
  try {
    await retry(async () => {
      throw new Error("网络抖动");
    }, { retries: 5, baseMs: 80, signal: c.signal });
  } catch (e) {
    console.log(`  3c 退避等待被取消打断: ${String((e as Error).message)}`);
  }
}

// ---- 4. 组合：limit(2) + 每任务 withTimeout + 内层 retry ----
async function experimentCombo(): Promise<void> {
  console.log("== 4. 组合实战：限 2 并发 + 30ms 超时 + 重试 1 次 ==");
  const run = limit(2);
  // 每个任务一份「脚本」：第 n 次尝试的时长。
  // 任务 2：第一次 40ms 超时 → 重试 15ms 成功；任务 3：恒 50ms 恒超时。
  const script: Record<number, number[]> = { 1: [15], 2: [40, 15], 3: [50, 50] };
  const attemptCount: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  const results = await Promise.allSettled([1, 2, 3].map((id) =>
    run(() =>
      retry(
        () => withTimeout(
          () => new Promise<string>((r) =>
            setTimeout(() => r(`任务 ${id} 完成`), script[id][attemptCount[id]++])),
          30,
        ),
        { retries: 1, baseMs: 5, shouldRetry: (e) => (e as Error).name === "TimeoutError" },
      ),
    ),
  ));
  for (const [i, r] of results.entries()) {
    console.log(`  任务 ${i + 1} → ${r.status === "fulfilled" ? `成功：${r.value}` : `失败：${r.reason.message}`}`);
  }
}

(async (): Promise<void> => {
  await experimentLimit();
  await experimentTimeout();
  await experimentRetry();
  await experimentCombo();
})();

/*
== 实测输出（Node v24.10.0；timer 粒度 1ms，同时长任务间次序有 ± 抖动）==
== 1. limit(3) 跑 8 个任务 ==
  [开始] 任务 1（当前并发 1）
  [开始] 任务 2（当前并发 2）
  [开始] 任务 3（当前并发 3）
  [完成] 任务 3
  [开始] 任务 4（当前并发 3）
  [完成] 任务 2
  [开始] 任务 5（当前并发 3）
  [完成] 任务 4
  [开始] 任务 6（当前并发 3）
  [完成] 任务 1
  [开始] 任务 7（当前并发 3）
  [完成] 任务 7
  [开始] 任务 8（当前并发 3）
  [完成] 任务 6
  [完成] 任务 8
  [完成] 任务 5
  并发峰值 = 3（≤ 3：通过）
== 2. withTimeout：超时、输家、取消联动 ==
  [慢任务] 收到 abort，清理副作用（ clearTimeout ）
  2a 结果 → 超时: TimeoutError: timeout after 30ms
  2b 结果 → 够了
== 3. retry：指数退避 / 错误分类 / 可取消 ==
    [retry] 第 1 次失败，10ms 后重试（网络抖动）
    [retry] 第 2 次失败，20ms 后重试（网络抖动）
  3a 共调用 3 次，结果 = ok
  3b 只调用 1 次就放弃（404 是确定性错误）: 404 Not Found
    [retry] 第 1 次失败，80ms 后重试（网络抖动）
  3c 退避等待被取消打断: This operation was aborted
== 4. 组合实战：限 2 并发 + 30ms 超时 + 重试 1 次 ==
    [retry] 第 1 次失败，5ms 后重试（timeout after 30ms）
    [retry] 第 1 次失败，5ms 后重试（timeout after 30ms）
  任务 1 → 成功：任务 1 完成
  任务 2 → 成功：任务 2 完成
  任务 3 → 失败：timeout after 30ms
*/
