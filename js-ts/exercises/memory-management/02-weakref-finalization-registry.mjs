/**
 * 大纲章节：阶段 1.6 内存管理
 * 主题：WeakRef 观察对象回收（--expose-gc 下确定性验证）/ FinalizationRegistry 回调触发与其时机警告
 * 运行：node --expose-gc exercises/memory-management/02-weakref-finalization-registry.mjs
 *       （必须带 --expose-gc，否则全局 gc 不可用，脚本会打印提示后退出）
 * 预期输出：
 * --- Part 1: WeakRef（node --expose-gc）---
 * 清强引用前: ref.deref() === obj → true
 * （等待一个宏任务：deref 的 KeepDuringJob 语义 + 旧栈帧销毁，对象才真正「不可达」）
 * 清强引用 + gc() 后: ref.deref() === undefined → true（WeakRef 不阻止目标被回收）
 * --- Part 2: FinalizationRegistry ---
 * gc() 后轮询等待回调（回调是异步任务，时机由引擎决定）...
 * 回收后回调已触发: held = token-1（结论：回调发生在对象回收之后，且延迟不确定 → 不能用于关键逻辑）
 * --- Part 3: 官方推荐用法走查（本段不运行，见文件底部注释）---
 * 缓存模式要点: Map 存槽位 + WeakRef 包装缓存值 + FinalizationRegistry 在值被回收后清理槽位
 */

// —— 安全检查：没带 --expose-gc 时给出明确提示 ——
if (typeof gc !== 'function') {
  console.log('请用 node --expose-gc exercises/memory-management/02-weakref-finalization-registry.mjs 运行');
  process.exit(1);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Part 1: WeakRef ----------
// 两个必须知道的规范/引擎事实，否则实验结果「看起来不对」：
//  1. KeepDuringJob：deref() 返回的目标对象会被保持「到当前 job 结束」——
//     在同一个同步任务里 deref 后立刻 gc()，对象必然存活；
//  2. 栈上残留：对象在函数里创建后，其指针可能残留在旧栈帧，V8 的保守栈扫描
//     会把它当作存活引用（宁可多留、不可误杀）。
// 所以标准做法是：对象在「工厂函数」里创建（帧弹出后不可达）→ 等一个宏任务 → 再 gc()。
function makeWeakRef() {
  const obj = { name: 'big-buffer', payload: new Array(1000).fill(0) };
  const ref = new WeakRef(obj);
  console.log('--- Part 1: WeakRef（node --expose-gc）---');
  console.log(`清强引用前: ref.deref() === obj → ${ref.deref() === obj}`);
  return ref; // obj 的唯一强引用随本函数栈帧销毁而消失
}

const ref = makeWeakRef();
console.log('（等待一个宏任务：deref 的 KeepDuringJob 语义 + 旧栈帧销毁，对象才真正「不可达」）');
await delay(0); // 跨宏任务边界：KeepDuringJob 清空 + 旧栈帧彻底销毁
gc(); // 全量垃圾回收
console.log(`清强引用 + gc() 后: ref.deref() === undefined → ${ref.deref() === undefined}（WeakRef 不阻止目标被回收）`);
// 注：真实线上没有 gc()，WeakRef 的语义是「目标可能已被回收也可能还活着」，
// 代码必须两种情况都能处理（这也是它只适合缓存类场景的原因）。

// ---------- Part 2: FinalizationRegistry ----------
// 规范（TC39 weakrefs 提案 + MDN）的明确警告，写代码前必须知道：
//   1. 回调作为「任务」异步执行，时机不确定（可能在 GC 后很久才跑）；
//   2. 程序退出前回调可能根本不执行；
//   3. 不保证顺序，不同对象的回调可能乱序；
//   4. 因此只能把回调当「机会性清理/缓存失效」，绝不能当关键逻辑（如释放锁、提交事务）。
// 本段用轮询等待回调触发，把「时机不定」变成可观察的确定性结论。
console.log('--- Part 2: FinalizationRegistry ---');
let finalized = false;
let finalizedHeld = '';
const registry = new FinalizationRegistry((held) => {
  // 回调只应使用 held value（这里它被赋值给外部标志），绝不能引用 target 本身
  finalized = true;
  finalizedHeld = held;
});
function registerTarget() {
  const target = { tag: 'target-1', payload: new Array(500).fill(1) };
  registry.register(target, 'token-1'); // held value 是字符串，不引用 target
}
registerTarget(); // 帧弹出后 target 不可达
await delay(0); // 同样跨宏任务边界
gc();
gc();
console.log('gc() 后轮询等待回调（回调是异步任务，时机由引擎决定）...');
const deadline = Date.now() + 2000;
while (!finalized && Date.now() < deadline) {
  await delay(50);
}
if (finalized) {
  console.log(
    `回收后回调已触发: held = ${finalizedHeld}（结论：回调发生在对象回收之后，且延迟不确定 → 不能用于关键逻辑）`,
  );
} else {
  // 规范允许这种情况；本机多次实测均触发，若见此行说明该环境调度更慢 —— 输出本身仍是确定性的
  console.log('2 秒内回调未触发（规范允许：回调可能延迟甚至不调用，不应依赖）');
}

// ---------- Part 3: 官方推荐用法走查（不运行）----------
console.log('--- Part 3: 官方推荐用法走查（本段不运行，见文件底部注释）---');
console.log('缓存模式要点: Map 存槽位 + WeakRef 包装缓存值 + FinalizationRegistry 在值被回收后清理槽位');

// ==========================================================================
// Part 3 注释：WeakRef + FinalizationRegistry 的经典「可回收缓存」模式
// （来自 TC39 weakrefs 提案 README 的示意，说明了这套 API 的设计初衷）
//
//   const cache = new Map(); // 键：业务 key（字符串）；值：WeakRef 包装的缓存值
//   const registry = new FinalizationRegistry((key) => {
//     // 值对象被回收后，若槽位里的 WeakRef 已失效则删除槽位，防止 Map 无限膨胀
//     const ref = cache.get(key);
//     if (ref !== undefined && ref.deref() === undefined) cache.delete(key);
//   });
//
//   function getCached(key, makeValue) {
//     const ref = cache.get(key);
//     if (ref !== undefined) {
//       const value = ref.deref(); // 存活则复用
//       if (value !== undefined) return value;
//     }
//     const value = makeValue();
//     cache.set(key, new WeakRef(value)); // Map 不强引用 value → 内存紧张时可整体回收
//     registry.register(value, key);      // held value 用 key（字符串），不引用 value
//     return value;
//   }
//
// 要点：
//   - Map 强引用「键与槽位」，WeakRef 弱引用「值」→ 缓存不绑架对象生命周期；
//   - 回调只做「清理缓存槽位」这种即使漏做也不影响正确性的事（下次 get 时兜底）；
//   - 绝不在回调里 deref 同一个对象来「复活」它，也不要在回调里做业务关键动作。
// ==========================================================================
