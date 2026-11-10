/**
 * 大纲章节：阶段 1.6 内存管理
 * 主题：WeakMap/WeakSet 的弱引用语义（API 形状 / 键必须是对象）/ Map vs WeakMap 持有语义 / WeakSet 去重 / 私有数据模式
 * 运行：npx tsx exercises/memory-management/01-weak-collections.ts
 * 预期输出：
 * --- 1. Weak 集合的 API 形状：没有 size、没有任何遍历手段 ---
 * WeakMap.prototype 有 size: false
 * WeakMap.prototype 有 forEach: false
 * WeakMap.prototype 有 keys: false
 * WeakMap.prototype 有 Symbol.iterator: false
 * Map.prototype 有 size: true（对照：Map 的成员集合是确定的，不随 GC 变化）
 * --- 2. WeakMap 的键必须是对象（可注册值）---
 * WeakMap.set(原始值) → TypeError 捕获（Invalid value used as weak key）
 * --- 3. Map vs WeakMap 持有同一份「对象→元数据」的语义差别 ---
 * Map 侧: strong.get(userA).lastUsed = 1
 * WeakMap 侧: weak.get(userB).lastUsed = 1（运行期读写行为完全一致）
 * （GC 语义差别见下方注释与 exercises/memory-management/02 的实测）
 * --- 4. WeakSet 去重：按「引用同一性」而非内容相等 ---
 * 处理 a（首次）
 * 跳过 a（同一个对象第二次进来）
 * 处理 内容相同的新对象（引用不同 → 不算已处理）（首次）
 * --- 5. 私有数据模式：数据挂在 WeakMap 里，实例上没有痕迹 ---
 * s1.describe() = session#1 的 token = t-1
 * s2.describe() = session#2 的 token = t-2
 * 'token' in s1 = false
 * JSON.stringify(s1) = {"id":1}（私有数据不出现在对象自身，也无法被枚举）
 */

// ---------- 1. API 形状：为什么没有 size / 不可遍历 ----------
// 根本原因：弱集合的成员集合「随 GC 变化」。引擎随时可能清掉「键已被回收」的条目，
// 任何确定性的 size/遍历结果都无法自洽 —— 所以规范干脆不给这些 API。
// 这不是实现偷懒，是 GC 语义决定的必然设计。
console.log('--- 1. Weak 集合的 API 形状：没有 size、没有任何遍历手段 ---');
console.log(`WeakMap.prototype 有 size: ${'size' in WeakMap.prototype}`);
console.log(`WeakMap.prototype 有 forEach: ${'forEach' in WeakMap.prototype}`);
console.log(`WeakMap.prototype 有 keys: ${'keys' in WeakMap.prototype}`);
console.log(`WeakMap.prototype 有 Symbol.iterator: ${Symbol.iterator in WeakMap.prototype}`);
console.log(`Map.prototype 有 size: ${'size' in Map.prototype}（对照：Map 的成员集合是确定的，不随 GC 变化）`);

// ---------- 2. 键必须是对象 ----------
// WeakMap 的键必须是「可注册值」（对象 / 非注册 Symbol，ES2023 起支持 Symbol），
// 因为弱引用机制必须挂在「可被 GC 回收的实体」上；原始值按值传递、永不可回收，弱引用无意义
console.log('--- 2. WeakMap 的键必须是对象（可注册值）---');
const wm = new WeakMap<object, string>();
try {
  wm.set('字符串不能做键' as unknown as object, 'v');
} catch {
  console.log('WeakMap.set(原始值) → TypeError 捕获（Invalid value used as weak key）');
}

// ---------- 3. Map vs WeakMap 持有「对象→元数据」的语义差别 ----------
// 场景：给临时对象挂元数据（缓存/标记）。两边的读写 API 完全一致，
// 差别只在「集合是否延长键对象的生命周期」：
//   Map：键槽是强引用 —— 只要 Map 活着，userA 就不可回收 → 对象生命周期被缓存「绑架」
//   WeakMap：键是弱引用 —— userB 只剩 WeakMap 引用时即可回收，条目随之消失
// 这就是「对象→元数据」缓存应使用 WeakMap 的原因（见 02 练习的 --expose-gc 实测）。
console.log('--- 3. Map vs WeakMap 持有同一份「对象→元数据」的语义差别 ---');
const strong = new Map<object, { lastUsed: number }>();
const weak = new WeakMap<object, { lastUsed: number }>();
const userA = { id: 'a' };
const userB = { id: 'b' };
strong.set(userA, { lastUsed: 1 });
weak.set(userB, { lastUsed: 1 });
console.log(`Map 侧: strong.get(userA).lastUsed = ${strong.get(userA)!.lastUsed}`);
console.log(`WeakMap 侧: weak.get(userB).lastUsed = ${weak.get(userB)!.lastUsed}（运行期读写行为完全一致）`);
// 把 userA / userB 的强引用清掉再触发全量 GC 后（02 练习实测）：
//   - userA 仍被 strong 的键槽强引用 → 不可回收（这是用 Map 做缓存的泄漏根源）
//   - userB 可回收 → WeakMap 条目随之消失，get(userB) 的能力也不复存在
console.log('（GC 语义差别见下方注释与 exercises/memory-management/02 的实测）');

// ---------- 4. WeakSet 去重 ----------
// 判断「这个对象是否处理过」只需要引用同一性；条目本身不应阻止对象被回收 → WeakSet
console.log('--- 4. WeakSet 去重：按「引用同一性」而非内容相等 ---');
const processed = new WeakSet<object>();
function visit(node: object, label: string): string {
  if (processed.has(node)) return `跳过 ${label}（同一个对象第二次进来）`;
  processed.add(node);
  return `处理 ${label}（首次）`;
}
const a = { id: 1 };
console.log(visit(a, 'a'));
console.log(visit(a, 'a'));
console.log(visit({ id: 1 }, '内容相同的新对象（引用不同 → 不算已处理）'));

// ---------- 5. 私有数据模式 ----------
// 私有数据放 WeakMap（键 = 实例），实例自身没有对应属性：
//  - 外部无法通过属性枚举/JSON 序列化拿到
//  - 实例被回收时，私有数据随之可回收（不延长生命周期）
//  现代 TS/JS 也可用 #private 字段（语言内建），WeakMap 方式是理解原理的经典实现
console.log('--- 5. 私有数据模式：数据挂在 WeakMap 里，实例上没有痕迹 ---');
const privateStore = new WeakMap<object, { token: string }>();
let sessionSeq = 0;
class Session {
  readonly id: number;
  constructor() {
    this.id = ++sessionSeq;
    privateStore.set(this, { token: `t-${this.id}` });
  }
  describe(): string {
    return `session#${this.id} 的 token = ${privateStore.get(this)!.token}`;
  }
}
const s1 = new Session();
const s2 = new Session();
console.log(`s1.describe() = ${s1.describe()}`);
console.log(`s2.describe() = ${s2.describe()}`);
console.log(`'token' in s1 = ${'token' in s1}`);
console.log(`JSON.stringify(s1) = ${JSON.stringify(s1)}（私有数据不出现在对象自身，也无法被枚举）`);
