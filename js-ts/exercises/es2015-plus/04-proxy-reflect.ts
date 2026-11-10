/**
 * 大纲章节：阶段 1.5 ES2015+ 关键特性
 * 主题：常用 trap / Reflect.get 的 receiver 参数在 getter+继承场景的作用 / 代理不变量 TypeError / 迷你响应式（track/trigger 雏形）
 * 运行：npx tsx exercises/es2015-plus/04-proxy-reflect.ts
 * 预期输出：
 * --- 1. 日志代理：get/set/has/deleteProperty ---
 * [user] get name → da
 * da
 * [user] set age = 31
 * [user] has name → true
 * 'name' in proxy = true
 * [user] delete age
 * [user] has age → false
 * 删除后 'age' in proxy = false
 * --- 2. receiver 的作用（自有 getter 场景）：Reflect.get(t, k, receiver) 让 getter 里的 this 仍是 proxy ---
 * combined = F-S
 * 传 receiver 时经过 trap 的读取: combined → first → second（getter 内的 this 是 proxy，嵌套读取继续被拦截）
 * combined = F-S
 * 不传 receiver 时经过 trap 的读取: combined（this 落到原对象上，嵌套读取绕过了 proxy）
 * --- 3. 继承场景：receiver 决定原型上 getter 的 this ---
 * trap: get whoAmI
 * trap: get value
 * this.value = parent-value
 * --- 4. 代理不变量（ECMA-262 §6.1.7.2）---
 * set trap: x = 2，Reflect.set 返回 false（目标属性不可写）
 * trap 返回 false + 严格模式（ESM）→ TypeError 捕获（[[Set]] 失败必须以异常报告）
 * get trap 返回了与「不可写不可配置」数据属性不同的值 → TypeError 捕获（不变量：必须返回原值）
 * --- 5. 迷你响应式（track/trigger 雏形，阶段 5 手写响应式的基础）---
 * 首次 render()
 *   渲染: count=0
 * state.count = 1
 *   渲染: count=1
 * state.count = 2
 *   渲染: count=2
 * state.name = '改名'（render 从未读过 name，依赖集合里没有 name）
 * （没有新渲染输出 —— 印证依赖收集只发生在 get trap 里读过的 key）
 * 最终 count = 2
 */

// ---------- 1. 日志代理：常用 trap ----------
// Reflect 与 Proxy 的 trap 一一对应：在 trap 里转发默认行为是最标准的写法
function makeLoggedProxy<T extends object>(target: T, label: string): T {
  return new Proxy(target, {
    get(t, key, receiver) {
      const value = Reflect.get(t, key, receiver);
      console.log(`[${label}] get ${String(key)} → ${String(value)}`);
      return value;
    },
    set(t, key, value, receiver) {
      console.log(`[${label}] set ${String(key)} = ${String(value)}`);
      return Reflect.set(t, key, value, receiver);
    },
    has(t, key) {
      const result = Reflect.has(t, key);
      console.log(`[${label}] has ${String(key)} → ${String(result)}`);
      return result;
    },
    deleteProperty(t, key) {
      console.log(`[${label}] delete ${String(key)}`);
      return Reflect.deleteProperty(t, key);
    },
  });
}

console.log('--- 1. 日志代理：get/set/has/deleteProperty ---');
const user = makeLoggedProxy({ name: 'da', age: 30 }, 'user');
console.log(user.name); // 触发 get trap，随后打印返回值
user.age = 31; // 触发 set trap
const hasName = 'name' in user; // 触发 has trap
console.log(`'name' in proxy = ${hasName}`); // 用已取好的值，不再触发 trap
delete (user as { age?: number }).age; // 触发 deleteProperty trap
const hasAge = 'age' in user; // 再触发一次 has trap
console.log(`删除后 'age' in proxy = ${hasAge}`);

// ---------- 2. receiver 的作用：getter 里的 this ----------
// 关键：属性访问 getter 的 this 不是「属性所在的对象」，而是 [[Get]] 的 receiver。
// 在 trap 里用 Reflect.get(target, key, receiver) 转发，receiver = proxy → getter 内 this = proxy
const base = {
  first: 'F',
  second: 'S',
  get combined(): string {
    return `${this.first}-${this.second}`; // this 是谁？
  },
};

const seenWithReceiver: string[] = [];
const trackingProxy = new Proxy(base, {
  get(t, key, receiver) {
    seenWithReceiver.push(String(key));
    return Reflect.get(t, key, receiver); // getter 的 this = receiver（proxy）
  },
});

console.log('--- 2. receiver 的作用（自有 getter 场景）：Reflect.get(t, k, receiver) 让 getter 里的 this 仍是 proxy ---');
console.log(`combined = ${trackingProxy.combined}`);
console.log(`传 receiver 时经过 trap 的读取: ${seenWithReceiver.join(' → ')}（getter 内的 this 是 proxy，嵌套读取继续被拦截）`);

const seenWithoutReceiver: string[] = [];
const noReceiverProxy = new Proxy(base, {
  get(t, key) {
    seenWithoutReceiver.push(String(key));
    return Reflect.get(t, key); // 不传 receiver → receiver 默认是 target → getter 的 this = 原对象
  },
});
console.log(`combined = ${noReceiverProxy.combined}`);
console.log(`不传 receiver 时经过 trap 的读取: ${seenWithoutReceiver.join(' → ')}（this 落到原对象上，嵌套读取绕过了 proxy）`);

// ---------- 3. 继承场景：receiver 决定原型上 getter 的 this ----------
// childObj 自己没有 value 和 getter，都来自原型；
// 通过 proxy 访问 whoAmI → Reflect.get(t, key, receiver) 的 receiver=proxy →
// 原型上 getter 的 this = proxy → this.value 再走一次 proxy 的 [[Get]] → 再次进 trap
const protoWithGetter = {
  value: 'parent-value',
  get whoAmI(): string {
    return `this.value = ${String(this.value)}`;
  },
};
const childObj = Object.create(protoWithGetter);
const childProxy = new Proxy(childObj, {
  get(t, key, receiver) {
    console.log(`trap: get ${String(key)}`);
    return Reflect.get(t, key, receiver);
  },
});
console.log('--- 3. 继承场景：receiver 决定原型上 getter 的 this ---');
console.log(childProxy.whoAmI);

// ---------- 4. 代理不变量（ECMA-262 §6.1.7.2）----------
// 不变量是 proxy「不能比 target 更能撒谎」的底线，违反即 TypeError：
//  a) 目标属性不可写且不可配置（如 Object.freeze 之后）：
//     get trap 必须返回原值；set 不可能成功，trap 返回 false + 严格模式 → TypeError
console.log('--- 4. 代理不变量（ECMA-262 §6.1.7.2）---');
const frozen = Object.freeze({ x: 1 });
const frozenProxy = new Proxy(frozen, {
  set(t, key, value, receiver) {
    const ok = Reflect.set(t, key, value, receiver); // 不可写 → false
    console.log(`set trap: ${String(key)} = ${String(value)}，Reflect.set 返回 ${String(ok)}（目标属性不可写）`);
    return ok; // 把 false 如实上报
  },
});
try {
  // Object.freeze 的类型是 Readonly<...>，这里断言回可写以演示「运行时」行为：
  // 赋值表达式（而非 Reflect.set）才会把 [[Set]] 的失败以 TypeError 报告出来
  (frozenProxy as { x: number }).x = 2;
} catch {
  console.log('trap 返回 false + 严格模式（ESM）→ TypeError 捕获（[[Set]] 失败必须以异常报告）');
}

const locked = {} as { x: number };
Object.defineProperty(locked, 'x', { value: 42, writable: false, configurable: false });
const lyingProxy = new Proxy(locked, {
  get() {
    return 999; // 谎报：不可写不可配置的数据属性必须返回原值 42
  },
});
try {
  console.log(lyingProxy.x);
} catch {
  console.log('get trap 返回了与「不可写不可配置」数据属性不同的值 → TypeError 捕获（不变量：必须返回原值）');
}

// ---------- 5. 迷你响应式：track/trigger 雏形 ----------
// 思路：get trap 里收集「谁在读这个 key」（track）；set trap 里通知「这个 key 变了」（trigger）。
// 阶段 5 会在此基础上补全 effect 调度、嵌套对象递归代理、cleanup 等。
type Effect = () => void;
const targetMap = new Map<object, Map<string, Set<Effect>>>();
let activeEffect: Effect | null = null;

function track(target: object, key: string): void {
  if (activeEffect === null) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
}

function trigger(target: object, key: string): void {
  const dep = targetMap.get(target)?.get(key);
  if (dep) {
    for (const effect of [...dep]) effect(); // 拷贝后遍历，防止副作用中修改集合
  }
}

function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(t, key, receiver) {
      track(t, String(key));
      return Reflect.get(t, key, receiver);
    },
    set(t, key, value, receiver) {
      const old = Reflect.get(t, key, receiver);
      const ok = Reflect.set(t, key, value, receiver);
      if (ok && old !== value) trigger(t, String(key)); // 值真的变了才触发
      return ok;
    },
  });
}

const state = reactive({ count: 0, name: 'init' });

function render(): void {
  const prev = activeEffect;
  activeEffect = render; // 读 state.count 期间把自己登记为依赖
  const text = `  渲染: count=${state.count}`; // 触发 get trap → track(target, 'count')
  activeEffect = prev;
  console.log(text);
}

console.log('--- 5. 迷你响应式（track/trigger 雏形，阶段 5 手写响应式的基础）---');
console.log('首次 render()');
render();
console.log('state.count = 1');
state.count = 1; // set trap → trigger → 重新执行 render
console.log('state.count = 2');
state.count = 2;
console.log("state.name = '改名'（render 从未读过 name，依赖集合里没有 name）");
state.name = '改名'; // name 无依赖 → 不触发任何 effect
console.log('（没有新渲染输出 —— 印证依赖收集只发生在 get trap 里读过的 key）');
console.log(`最终 count = ${state.count}`);
