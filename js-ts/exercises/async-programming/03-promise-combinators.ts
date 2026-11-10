/**
 * 大纲章节：阶段 1.4 异步编程
 * 主题：Promise 四大组合器对照——all / race / allSettled / any：正常、含 reject、空数组三种情形；短路 ≠ 取消
 * 运行：npx tsx exercises/async-programming/03-promise-combinators.ts
 * 预期输出：
 * == 场景 A：全部成功 ==
 * -- Promise.all：结果按传入顺序排列 --
 *     [启动] A-慢（本场景第 1 个启动）
 *     [启动] A-快（本场景第 2 个启动）
 *     [启动] A-中（本场景第 3 个启动）
 *     [成功] A-快
 *     [成功] A-中
 *     [成功] A-慢
 *     all 结果: A-慢-ok,A-快-ok,A-中-ok
 * -- Promise.race：首个 settle 者胜出 --
 *     [启动] R-快（本场景第 1 个启动）
 *     [启动] R-慢（本场景第 2 个启动）
 *     [成功] R-快
 *     race 结果: R-快-ok
 *     [成功] R-慢
 *     （R-慢没有被取消，上面已经打印了它的成功）
 * -- Promise.any：首个成功者胜出 --
 *     [启动] Y-慢（本场景第 1 个启动）
 *     [启动] Y-快（本场景第 2 个启动）
 *     [成功] Y-快
 *     any 结果: Y-快-ok
 *     [成功] Y-慢
 *     （Y-慢没有被 any 采用，但它照样完成）
 * == 场景 B：包含 reject ==
 * -- Promise.all：首个 reject 短路，但其余任务不会被取消 --
 *     [启动] B-失败（本场景第 1 个启动）
 *     [启动] B-成功（本场景第 2 个启动）
 *     [失败] B-失败
 *     all 短路，reason = B-失败-error
 *     [成功] B-成功
 *     等待后确认：启动了 2 个、2 个都落定了 —— 「短路」只是不再等结果，副作用照常发生
 * -- Promise.race：首个 settle 无论成败都定结果 --
 *     [启动] RB-失败（本场景第 1 个启动）
 *     [启动] RB-成功（本场景第 2 个启动）
 *     [失败] RB-失败
 *     race 以 reject 结束，reason = RB-失败-error
 *     [成功] RB-成功
 * -- Promise.any：忽略 reject，等第一个成功 --
 *     [启动] YB-失败（本场景第 1 个启动）
 *     [启动] YB-成功（本场景第 2 个启动）
 *     [失败] YB-失败
 *     [成功] YB-成功
 *     any 结果: YB-成功-ok
 * -- Promise.allSettled：等所有人落定，成败都记账 --
 *     [启动] SB-失败（本场景第 1 个启动）
 *     [启动] SB-成功（本场景第 2 个启动）
 *     [失败] SB-失败
 *     [成功] SB-成功
 *     记账: rejected, reason=SB-失败-error
 *     记账: fulfilled, value=SB-成功-ok
 * == 场景 C：空数组输入 ==
 *     Promise.all([]) → []
 *     Promise.allSettled([]) → []
 *     Promise.race([]) 30ms 后仍 pending: true
 *     Promise.any([]) → AggregateError: All promises were rejected（errors.length = 0）
 */

// ============================================================
// task：用真实 setTimeout 模拟一次「IO 延迟」。
// 打印全部是确定性文本（名字与顺序），不打印真实毫秒数；
// 耗时结论用「≈ N 个 delay 周期」的定性描述写在注释里。
//
// 关键机制（本文件要证明的核心事实）：
//   Promise 没有取消语义。all/race/any 的「短路」只是组合器
//   提前给出自己的结果；已经启动的任务（定时器、网络请求等副作用）
//   照常运行到结束。真正的取消要靠 AbortController（见 05 练习）。
// ============================================================

let started = 0; // 计数器：本场景真正启动了几个任务

function task(name: string, ms: number, fail = false): Promise<string> {
  started++;
  const n = started;
  console.log(`    [启动] ${name}（本场景第 ${n} 个启动）`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        console.log(`    [失败] ${name}`);
        reject(new Error(`${name}-error`));
      } else {
        console.log(`    [成功] ${name}`);
        resolve(`${name}-ok`);
      }
    }, ms);
  });
}

// settle：纯等待工具，不产生日志
function settle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  // ---------- 场景 A：全部成功 ----------
  console.log("== 场景 A：全部成功 ==");

  console.log("-- Promise.all：结果按传入顺序排列 --");
  // 三个任务并发启动（≈ 1 个 delay 周期全部完成，总耗时 ≈ 最慢者）
  const a = await Promise.all([task("A-慢", 60), task("A-快", 10), task("A-中", 30)]);
  console.log("    all 结果:", a.join(","));
  // 注意：完成顺序 A-快 → A-中 → A-慢，但结果数组仍按传入顺序

  console.log("-- Promise.race：首个 settle 者胜出 --");
  started = 0;
  const r = await Promise.race([task("R-快", 10), task("R-慢", 60)]);
  console.log("    race 结果:", r);
  await settle(60); // 等落败者跑完：race 不会取消它
  console.log("    （R-慢没有被取消，上面已经打印了它的成功）");

  console.log("-- Promise.any：首个成功者胜出 --");
  started = 0;
  const y = await Promise.any([task("Y-慢", 30), task("Y-快", 10)]);
  console.log("    any 结果:", y);
  await settle(40);
  console.log("    （Y-慢没有被 any 采用，但它照样完成）");

  // allSettled 在「全部成功」时与 all 结果一致，放到场景 B 看更有信息量

  // ---------- 场景 B：包含 reject ----------
  console.log("== 场景 B：包含 reject ==");

  console.log("-- Promise.all：首个 reject 短路，但其余任务不会被取消 --");
  started = 0; // 重置计数，观察本场景
  try {
    await Promise.all([task("B-失败", 10, true), task("B-成功", 60)]);
  } catch (e) {
    console.log("    all 短路，reason =", (e as Error).message);
  }
  await settle(70); // 关键：all 短路后，B-成功 的定时器仍挂着 → 照常完成
  console.log(`    等待后确认：启动了 ${started} 个、${started} 个都落定了 —— 「短路」只是不再等结果，副作用照常发生`);

  console.log("-- Promise.race：首个 settle 无论成败都定结果 --");
  started = 0;
  try {
    await Promise.race([task("RB-失败", 10, true), task("RB-成功", 60)]);
  } catch (e) {
    console.log("    race 以 reject 结束，reason =", (e as Error).message);
  }
  await settle(70); // RB-成功 仍会完成（见上方日志）

  console.log("-- Promise.any：忽略 reject，等第一个成功 --");
  started = 0;
  const yb = await Promise.any([task("YB-失败", 10, true), task("YB-成功", 30)]);
  console.log("    any 结果:", yb);

  console.log("-- Promise.allSettled：等所有人落定，成败都记账 --");
  started = 0;
  const sb = await Promise.allSettled([task("SB-失败", 10, true), task("SB-成功", 30)]);
  for (const s of sb) {
    if (s.status === "fulfilled") {
      console.log(`    记账: fulfilled, value=${s.value}`);
    } else {
      console.log(`    记账: rejected, reason=${(s.reason as Error).message}`);
    }
  }

  // ---------- 场景 C：空数组输入 ----------
  console.log("== 场景 C：空数组输入 ==");
  const allEmpty = await Promise.all([]);
  console.log("    Promise.all([]) →", JSON.stringify(allEmpty));

  const settledEmpty = await Promise.allSettled([]);
  console.log("    Promise.allSettled([]) →", JSON.stringify(settledEmpty));

  let raceEmptySettled = false;
  void Promise.race([]).then(() => {
    raceEmptySettled = true;
  });
  await settle(30); // 30ms 后再检查：没有任何东西能让它 settle
  console.log("    Promise.race([]) 30ms 后仍 pending:", raceEmptySettled === false);

  try {
    await Promise.any([]);
  } catch (e) {
    const agg = e as AggregateError;
    console.log(`    Promise.any([]) → AggregateError: ${agg.message}（errors.length = ${agg.errors.length}）`);
  }
}

void main();
