/**
 * 大纲章节：阶段 1.4 异步编程（深化补充：ES2024/ES2026 异步新设施）
 * 主题：Promise.withResolvers、await using / Symbol.asyncDispose（显式资源管理）、
 *       AsyncDisposableStack、top-level await 对模块图的影响
 * 运行：npx tsx exercises/async-programming/08-with-resolvers-and-await-using.ts
 * 预期输出：（实测固化，见文末注释块）
 */

// ============================================================
// 两个新设施解决的是两类老痛点：
//   1. Promise.withResolvers（ES2024）——「resolver 泄漏到外层作用域」：
//      以前要把 resolve/reject 提到 new Promise 外面只能先声明
//      let resolve!，作用域被迫扩大；
//   2. await using / Symbol.asyncDispose（ES2026《Explicit Resource
//      Management》）——「try/finally 手写清理」：清理逻辑与业务逻辑
//      缠在一起，且多个资源要小心嵌套顺序。
// 本文件本身就是 ESM + top-level await 的活例子（见第 4 节）。
// ============================================================

import { EventEmitter } from "node:events";
// AsyncDisposableStack 是全局变量（V8 提供，非 node: 内置模块）——
// 与 Promise、structuredClone 一样直接可用

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------
// 1. Promise.withResolvers：解构出 resolve/reject
//    实战场景：把「事件」翻译成「Promise」的一次性等待器。
// ------------------------------------------------------------
function once<T>(emitter: EventEmitter, event: string): Promise<T> {
  // 旧写法（ES2023 及以前）：
  //   let resolve!: (v: T) => void;          // ← 作用域外提 + 非空断言
  //   const promise = new Promise<T>((r) => { resolve = r; });
  // 新写法：一行，resolve 与 promise 同源、作用域最小
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  emitter.once(event, (v: T) => {
    emitter.off("error", reject); // 正常收尾：把 error 监听摘掉
    resolve(v);
  });
  emitter.once("error", reject);
  return promise;
}

async function experimentWithResolvers(): Promise<void> {
  console.log("== 1. Promise.withResolvers：把事件翻译成 Promise ==");
  const bus = new EventEmitter();
  const answer = once<string>(bus, "data");
  await sleep(10);
  bus.emit("data", "来自事件的数据");
  console.log(`  收到: ${await answer}`);

  // 错误也能走同一条 Promise 通道
  const bus2 = new EventEmitter();
  const failing = once<number>(bus2, "data");
  await sleep(5);
  bus2.emit("error", new Error("连接断开"));
  console.log(`  错误通道: ${(await failing.then(
    () => "意外成功",
    (e: Error) => `rejection: ${e.message}`,
  ))}`);
}

// ------------------------------------------------------------
// 2. await using + Symbol.asyncDispose：确定性异步清理
//    语义：块结束时（无论正常还是抛错）自动 await 资源的
//    [Symbol.asyncDispose]()。多个资源像栈一样【逆序】清理。
// ------------------------------------------------------------
class Connection implements AsyncDisposable {
  constructor(readonly name: string) {}
  async query(sql: string): Promise<string> {
    await sleep(5);
    return `${this.name} 执行 ${sql}`;
  }
  async close(): Promise<void> {
    await sleep(2);
    console.log(`  [close] ${this.name} 已关闭`);
  }
  // 资源自己声明「怎么清理」——await using 只认这个协议
  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

async function experimentAwaitUsing(): Promise<void> {
  console.log("== 2. await using：正常路径 / 抛错路径 / 逆序清理 ==");

  // 2a 正常路径：块结束自动 close
  {
    await using conn = new Connection("conn-A");
    console.log(`  2a ${await conn.query("SELECT 1")}`);
  } // ← 块结束：这里自动 await conn[Symbol.asyncDispose]()
  console.log("  2a ← 离开块后连接已自动关闭");

  // 2b 抛错路径：异常照抛，但清理保证发生（这就是 try/finally 的活）
  try {
    await using conn = new Connection("conn-B");
    console.log("  2b 业务逻辑抛错");
    throw new Error("业务异常");
  } catch (e) {
    console.log(`  2b catch 到: ${(e as Error).message}（清理已在 catch 前完成）`);
  }

  // 2c 逆序清理：嵌套两个资源，后开的先关（栈语义）
  {
    await using outer = new Connection("outer");
    {
      await using inner = new Connection("inner");
      console.log("  2c 两个连接都在使用");
    } // inner 先关
  } // outer 后关
  console.log("  2c ← 逆序：inner 先关、outer 后关（栈）");
}

// ------------------------------------------------------------
// 3. AsyncDisposableStack：资源数量不定时的动态收集
//    use(r)：登记并接管清理；栈同样逆序 dispose。
// ------------------------------------------------------------
async function experimentStack(): Promise<void> {
  console.log("== 3. AsyncDisposableStack：动态资源清单 ==");
  await using stack = new AsyncDisposableStack();
  const conns: Connection[] = [];
  for (const name of ["s1", "s2", "s3"]) {
    const c = new Connection(name);
    conns.push(c);
    stack.use(c); // 登记进栈：块的 await using 负责统一 dispose
  }
  console.log(`  3c 查询结果: ${(await Promise.all(conns.map((c) => c.query("SELECT 1")))).join(" | ")}`);
} // ← 逆序清理 s3 → s2 → s1

// ------------------------------------------------------------
// 4. top-level await（ES2022）：本文件的 await 就在模块顶层
//    语义：模块求值被挂起直到所有顶层 await 落定；【任何导入
//    本模块的代码都会等到这一刻才执行】。因此它只能用于
//    「确实必须完成的异步初始化」，否则会把整个依赖链拖慢。
//    ESM 顶层求值本身经由 Promise 机制驱动（module job）——
//    这正是练习 06 G1 里 ESM/CJS 微任务次序差异的根源。
// ------------------------------------------------------------
async function main(): Promise<void> {
  await experimentWithResolvers();
  await experimentAwaitUsing();
  await experimentStack();
  console.log("== 4. top-level await ==");
  console.log("  本文件从顶层 await main() 处继续；导入本模块的代码会等 main() 落定");
}

await main(); // ← top-level await：ESM 模块顶层直接 await（CJS 无此能力）

/*
== 实测输出（Node v24.10.0）==
== 1. Promise.withResolvers：把事件翻译成 Promise ==
  收到: 来自事件的数据
  错误通道: rejection: 连接断开
== 2. await using：正常路径 / 抛错路径 / 逆序清理 ==
  2a conn-A 执行 SELECT 1
  [close] conn-A 已关闭
  2a ← 离开块后连接已自动关闭
  2b 业务逻辑抛错
  [close] conn-B 已关闭
  2b catch 到: 业务异常（清理已在 catch 前完成）
  2c 两个连接都在使用
  [close] inner 已关闭
  [close] outer 已关闭
  2c ← 逆序：inner 先关、outer 后关（栈）
== 3. AsyncDisposableStack：动态资源清单 ==
  3c 查询结果: s1 执行 SELECT 1 | s2 执行 SELECT 1 | s3 执行 SELECT 1
  [close] s3 已关闭
  [close] s2 已关闭
  [close] s1 已关闭
== 4. top-level await ==
  本文件从顶层 await main() 处继续；导入本模块的代码会等 main() 落定
*/
