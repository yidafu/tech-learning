/**
 * 大纲章节：阶段 5 专题深入 —— 响应式源码阅读（以 @vue/reactivity 为路线图）
 * 主题：手写迷你响应式：reactive（Proxy 惰性代理）+ effect（activeEffect 栈 + cleanup）+ computed（dirty 缓存）
 * 运行：npx tsx exercises/reactivity/mini-reactivity.ts
 * 测试：npx vitest run exercises/reactivity/
 * 预期输出：
 * --- 1) 基本收集：读取建立依赖，改值触发重跑 ---
 * 姓名:yidafu
 * 姓名:老傅
 * 姓名:老傅
 * --- 2) 嵌套对象：读到才代理（惰性）---
 * 北京
 * 上海
 * --- 3) 分支切换：cleanup 清掉旧依赖 ---
 * A值
 * B值
 * B值
 * --- 4) deleteProperty 同样触发 ---
 * bag.x = 1
 * bag.x = undefined
 * --- 5) Reflect + receiver：getter 的 this 指向代理 ---
 * 1
 * 2
 * --- 6) computed：dirty 缓存 + 置脏不重算 ---
 * 读取前 getter 执行次数: 0
 * sq.value = 9
 * 再读一次 sq.value = 9，getter 执行 1 次
 * set 之后、读取之前 getter 执行次数: 1
 * sq.value = 16
 * effect 驱动：sq = 16
 * 依赖再次变化：sq = 25
 */

// =============================================================================
// 与 @vue/reactivity 源码概念对照表（packages/reactivity/src/，以 v3.4/3.5 为参照，
// 不标注行号 —— 版本间会挪动；3.5 的依赖结构重构见文末注）
// -----------------------------------------------------------------------------
// 本文件                    ↔ @vue/reactivity 源码位置
// targetMap                  ↔ effect.ts: targetMap: WeakMap<Target, KeyToDepMap>
//                              （KeyToDepMap = Map<Key, Dep>；3.5+ Dep 类在 dep.ts）
// track(target, key)         ↔ effect.ts: track() → trackKey/trackEffects 一族
// trigger(target, key)       ↔ effect.ts: trigger() → triggerKey/triggerEffects 一族
// reactive(obj)              ↔ reactive.ts: reactive() → createReactiveObject()
// proxyMap                   ↔ reactive.ts: proxyMap（同一 target 缓存同一代理）
// get/set/deleteProperty 陷阱 ↔ baseHandlers.ts: createGetter / createSetter /
//                              deleteProperty（由 mutableHandlers 装配；has/ownKeys 亦在此）
// effect(fn)                 ↔ effect.ts: effect() 与 class ReactiveEffect（run 方法）
// activeEffect 栈            ↔ effect.ts: activeEffect + effectStack（3.4-）；
//                              3.5+ 重构为 activeSub + Dep/Sub 双向链表，语义相同
// cleanup                    ↔ effect.ts: cleanupEffect（3.4-）；3.5+ 由链表在 track 时自动断开旧边
// scheduler                  ↔ ReactiveEffect 构造选项 scheduler（批量更新 / nextTick /
//                              computed 的实现支柱，配合 runtime-core 的 queueJob）
// computed(getter)           ↔ computed.ts: class ComputedRefImpl（dirty 标志 + triggerRefValue）
// =============================================================================

// 演示守卫：被 vitest 导入时跳过演示输出。
// 本工作区 tsconfig types: []（无 @types/node），给 process 做最小环境声明。
declare const process: { env: Record<string, string | undefined> };

// ---------------------------------------------------------------------------
// 数据结构：targetMap: WeakMap<target, Map<key, Set<effect>>>
// 第一层用 WeakMap 的原因：key 是「原始对象」的弱引用 ——
// 原始对象被销毁时，它的整棵依赖记录随之被 GC，不会因为响应式系统持有引用而泄漏；
// 而且「原始对象 -> 依赖」天然是全局索引，Proxy 每次陷阱触发都能 O(1) 定位。
// ---------------------------------------------------------------------------

type EffectFn = (() => unknown) & {
  /** 反向指针：本 effect 目前被哪些依赖集合收录（cleanup 用） */
  deps: Set<Set<EffectFn>>;
  /** 调度器：有它时 trigger 不直接重跑，改调 scheduler（computed/批量的支柱） */
  scheduler?: (fn: EffectFn) => void;
};

let activeEffect: EffectFn | undefined;
const effectStack: EffectFn[] = [];

const targetMap = new WeakMap<object, Map<PropertyKey, Set<EffectFn>>>();

// ---------------------------------------------------------------------------
// track / trigger：依赖的收集与触发
// ---------------------------------------------------------------------------

function track(target: object, key: PropertyKey): void {
  if (activeEffect === undefined) return; // 不在 effect 内的读取：不收集
  let depsMap = targetMap.get(target);
  if (depsMap === undefined) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (dep === undefined) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);        // 正向：key -> effects
  activeEffect.deps.add(dep);   // 反向：effect -> 它所在的 dep 集合
}

function trigger(target: object, key: PropertyKey): void {
  const depsMap = targetMap.get(target);
  if (depsMap === undefined) return;
  const dep = depsMap.get(key);
  if (dep === undefined || dep.size === 0) return;

  const effectsToRun = new Set<EffectFn>();
  for (const fn of dep) {
    // 跳过自己：effect 内部改自己依赖的值（如 state.count++）会无限自触发
    if (fn !== activeEffect) effectsToRun.add(fn);
  }
  // 必须拷贝后遍历：重跑会先 cleanup（从 dep 里 delete）再重新 add，
  // 直接遍历原集合属于「迭代中修改」，会跳元素甚至死循环
  for (const fn of effectsToRun) {
    if (fn.scheduler !== undefined) {
      fn.scheduler(fn); // 有调度器：把「何时跑」交给调度器（见 computed）
    } else {
      fn();
    }
  }
}

/** 清空 effect 的全部旧依赖：每次重跑前调用，防止分支切换后的残留。 */
function cleanup(effectFn: EffectFn): void {
  for (const dep of effectFn.deps) {
    dep.delete(effectFn);
  }
  effectFn.deps.clear();
}

// ---------------------------------------------------------------------------
// effect：把「读取了什么」变成「依赖了什么」
// 嵌套场景靠栈恢复：内层 effect 执行完，activeEffect 恢复为外层，
// 否则内层结束后再读取的属性会错误地收集到内层名下（或收不到）。
// ---------------------------------------------------------------------------

interface EffectOptions {
  lazy?: boolean;
  scheduler?: (fn: EffectFn) => void;
}

function effect(fn: () => unknown, options: EffectOptions = {}): EffectFn {
  const effectFn: EffectFn = (() => {
    cleanup(effectFn);        // ① 先清旧依赖（分支切换防残留）
    activeEffect = effectFn;  // ② 登记：接下来的读取都会 track 到我名下
    effectStack.push(effectFn);
    try {
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1]; // ③ 恢复外层
    }
  }) as EffectFn;
  effectFn.deps = new Set();
  effectFn.scheduler = options.scheduler;
  if (!options.lazy) effectFn();
  return effectFn;
}

// ---------------------------------------------------------------------------
// reactive：Proxy + Reflect
// ---------------------------------------------------------------------------

/** 代理缓存：同一个原始对象只包一次，保证嵌套代理的引用稳定。 */
const proxyMap = new WeakMap<object, object>();

function reactive<T extends object>(target: T): T {
  const existing = proxyMap.get(target);
  if (existing !== undefined) return existing as T;

  const proxy = new Proxy(target, {
    get(target: T, key: string | symbol, receiver: unknown): unknown {
      track(target, key);
      // Reflect + receiver：receiver 就是「最初发起读取的代理」。
      // 若 getter 内部再读 this.xxx，this 会指向 receiver（代理）而不是原始对象，
      // 于是 getter 里碰到的嵌套对象也会走代理 —— 这是响应式能穿透 getter 的关键（见演示 5）。
      const result = Reflect.get(target, key, receiver);
      // 惰性嵌套代理：真正读到内层对象才递归包装（Vue 同款策略，避免初始化即深遍历）
      if (typeof result === 'object' && result !== null) {
        return reactive(result as object);
      }
      return result;
    },
    set(target: T, key: string | symbol, value: unknown, receiver: unknown): boolean {
      const oldValue = Reflect.get(target, key, receiver);
      const ok = Reflect.set(target, key, value, receiver); // 先写入
      if (ok && !Object.is(oldValue, value)) {
        trigger(target, key); // 写成功且值真的变了才触发（Object.is：NaN === NaN）
      }
      return ok;
    },
    deleteProperty(target: T, key: string | symbol): boolean {
      const hadKey = Reflect.has(target, key);
      const ok = Reflect.deleteProperty(target, key);
      if (ok && hadKey) trigger(target, key);
      return ok;
    },
    // Vue 的 baseHandlers.ts 还实现了 has（in 操作符）与 ownKeys（Object.keys/for...in），
    // 分别对应 TrackOpTypes.HAS / ITERATE 依赖；本迷你版聚焦 get/set/delete 三条主干。
  });

  proxyMap.set(target, proxy);
  return proxy as T;
}

// ---------------------------------------------------------------------------
// computed：dirty 标志 + 缓存 + 「置脏不重算」
// 三个支柱：
// 1) lazy effect：getter 不立即执行，首次读取才算；
// 2) scheduler：依赖变化时不重跑 getter，只把 dirty 置 true（省掉无效计算）；
// 3) 双向依赖：外层 effect 读 .value 时 track 到 computed 对象自己身上，
//    依赖变化时由 scheduler 反向 trigger 这些外层 effect —— 外层重跑时重新读
//    .value，此刻才发现 dirty、才真正重算（惰性求值链）。
// ---------------------------------------------------------------------------

interface ComputedRef<T> {
  readonly value: T;
}

function computed<T>(getter: () => T): ComputedRef<T> {
  let value: T | undefined;
  let dirty = true;

  const runner = effect(getter, {
    lazy: true,
    scheduler() {
      if (dirty) return; // 已脏：不重复置脏、不重复通知（幂等）
      dirty = true;
      // 通知所有读取过 .value 的外层 effect 重跑；
      // 它们重跑时会重新读 .value，那时才因 dirty 重新执行 getter
      trigger(obj, 'value');
    },
  });

  const obj = {
    get value(): T {
      if (dirty) {
        value = runner() as T; // 以 runner 身份执行 getter → 依赖收集到 runner 名下
        dirty = false;
      }
      track(obj, 'value'); // 外层 effect 对 .value 的依赖挂在 computed 对象上
      return value as T;
    },
  };
  return obj;
}

// ---------------------------------------------------------------------------
// 演示（被 vitest 导入时跳过，见文件顶部守卫）
// ---------------------------------------------------------------------------

function main(): void {
  console.log('--- 1) 基本收集：读取建立依赖，改值触发重跑 ---');
  const user = reactive({ name: 'yidafu', age: 18 });
  let rendered = '';
  effect(() => {
    rendered = `姓名:${user.name}`;
  });
  console.log(rendered);
  user.name = '老傅';
  console.log(rendered);
  user.age = 19; // effect 从未读过 age：不触发，rendered 不变
  console.log(rendered);

  console.log('--- 2) 嵌套对象：读到才代理（惰性）---');
  const s = reactive({ profile: { city: '北京' } });
  let city = '';
  effect(() => {
    city = s.profile.city;
  });
  console.log(city);
  s.profile.city = '上海'; // 内层对象在「被读取时」才包代理，同样响应
  console.log(city);

  console.log('--- 3) 分支切换：cleanup 清掉旧依赖 ---');
  const flag = reactive({ on: true, a: 'A值', b: 'B值' });
  let branch = '';
  effect(() => {
    branch = flag.on ? flag.a : flag.b; // 依赖随分支变化：on=true 依赖 {on,a}，false 依赖 {on,b}
  });
  console.log(branch);
  flag.on = false; // 重跑 → cleanup 先清掉对 a 的旧依赖，再收集 b
  console.log(branch);
  flag.a = 'A值已改'; // a 已不在依赖集合：不重跑 —— 这就是 cleanup 防的「残留依赖」
  console.log(branch);

  console.log('--- 4) deleteProperty 同样触发 ---');
  const bag = reactive<{ x?: number }>({ x: 1 });
  let seen = '';
  effect(() => {
    seen = `bag.x = ${String(bag.x)}`;
  });
  console.log(seen);
  delete bag.x; // deleteProperty 陷阱：删除成功且 key 原本存在 → trigger
  console.log(seen);

  console.log('--- 5) Reflect + receiver：getter 的 this 指向代理 ---');
  const base = {
    nested: { value: 1 },
    get current(): { value: number } {
      // this 不是 base！是「发起读取的代理」（receiver 转发而来）
      // 所以 this.nested 会再走一次 get 陷阱 → 返回的是嵌套代理 → 依赖能收集到 nested.value
      return this.nested;
    },
  };
  const r = reactive(base);
  let watched = 0;
  effect(() => {
    watched = r.current.value;
  });
  console.log(watched);
  r.nested.value = 2; // 若 getter 的 this 指向原始对象，这里不会触发（读的是未代理对象）
  console.log(watched);

  console.log('--- 6) computed：dirty 缓存 + 置脏不重算 ---');
  const nums = reactive({ n: 3 });
  let getterRuns = 0;
  const sq = computed(() => {
    getterRuns += 1;
    return nums.n * nums.n;
  });
  console.log(`读取前 getter 执行次数: ${getterRuns}`); // 0：惰性，没人读就不算
  console.log(`sq.value = ${sq.value}`); // 9：首次读取，getterRuns=1
  console.log(`再读一次 sq.value = ${sq.value}，getter 执行 ${getterRuns} 次`); // 缓存生效
  nums.n = 4; // 依赖变化：只置脏 + 通知 .value 的订阅者，不重算
  console.log(`set 之后、读取之前 getter 执行次数: ${getterRuns}`); // 仍是 1：置脏不重算
  console.log(`sq.value = ${sq.value}`); // 16：此刻才重算
  let log = '';
  effect(() => {
    log = `sq = ${sq.value}`;
  });
  console.log(`effect 驱动：${log}`);
  nums.n = 5; // 置脏 → 通知外层 effect → 重跑 → 重新读 .value → 重算
  console.log(`依赖再次变化：${log}`);
}

if (process.env.VITEST === undefined) {
  main();
}

export { reactive, effect, computed, track, trigger, targetMap };

export {};
