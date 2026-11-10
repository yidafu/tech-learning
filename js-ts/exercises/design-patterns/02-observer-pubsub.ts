/**
 * 大纲章节：阶段 5 专题深入 —— 设计模式（Observer vs Pub-Sub）
 * 主题：类型安全 EventEmitter（Events map 泛型约束）对照 PubSub 中介版（含通配符）
 * 运行：npx tsx exercises/design-patterns/02-observer-pubsub.ts
 * 预期输出：
 * --- 1) Observer：subject 直接持有 observers（类型安全版）---
 * [observer] yidafu 登录
 * [observer] 订单 1001 金额 99 元
 * [observer] 订单 1002 金额 199 元
 * 取消订阅后再 emit：上面没有新订单输出
 * --- 2) 编译期拦截：4 类错误全部以 @ts-expect-error 标注在源码中 ---
 * 未知事件名 / 参数类型错误 / 参数个数不足 / 监听器签名不符 —— 编译期全拦下
 * --- 3) Pub-Sub：中介（broker）解耦 + 通配符订阅 ---
 * [pubsub/order] order: {"id":1}
 * [pubsub/*] 任意主题 order: {"id":1}
 * [pubsub/user] user: "u-9"
 * [pubsub/*] 任意主题 user: "u-9"
 */

// ---------------------------------------------------------------------------
// 1) Observer 模式：被观察者（subject）自己维护观察者列表
//    关键：没有任何中介 —— subject 持有 observer 的直接引用，notify 是同步调用。
//    类型安全实现的核心技巧：Events map（接口把「事件名 -> 参数元组」声明出来），
//    泛型参数 E 约束为 Record<PropertyKey, unknown[]>，让 on/emit 的 key 与参数
//    在编译期对齐 —— 这就是 mitt / socket.io 等库的类型方案。
// ---------------------------------------------------------------------------

// 注意：这里用 type 而不是 interface —— interface 没有隐式索引签名，
// 无法满足 Record<PropertyKey, unknown[]> 约束（TS 只对对象字面量类型放宽）
type Events = {
  'user:login': [username: string];
  'order:create': [orderId: number, amount: number];
};

class TypedEmitter<E extends Record<PropertyKey, unknown[]>> {
  #listeners = new Map<keyof E, Set<(...args: never) => void>>();

  /** 订阅：返回取消订阅函数（比返回 this 更函数式，也避免手动管理 off 的参数）。 */
  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): () => void {
    let set = this.#listeners.get(event);
    if (set === undefined) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(listener as (...args: never) => void);
    return () => {
      this.off(event, listener);
    };
  }

  off<K extends keyof E>(event: K, listener: (...args: E[K]) => void): void {
    this.#listeners.get(event)?.delete(listener as (...args: never) => void);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.#listeners.get(event);
    if (set === undefined) return;
    // 拷贝一份再遍历：监听器里可能取消订阅，边遍历边改集合会跳过元素
    for (const fn of [...set]) {
      (fn as (...args: E[K]) => void)(...args);
    }
  }
}

const emitter = new TypedEmitter<Events>();

console.log('--- 1) Observer：subject 直接持有 observers（类型安全版）---');
const offLogin = emitter.on('user:login', (username) => {
  console.log(`[observer] ${username} 登录`);
});
const offOrder = emitter.on('order:create', (orderId, amount) => {
  console.log(`[observer] 订单 ${orderId} 金额 ${amount} 元`);
});

emitter.emit('user:login', 'yidafu');
emitter.emit('order:create', 1001, 99);
offLogin();
emitter.emit('user:login', 'ghost'); // 已取消：无输出
emitter.emit('order:create', 1002, 199);
console.log('取消订阅后再 emit：上面没有新订单输出');
void offOrder;

// ---------------------------------------------------------------------------
// 2) 编译期拦截演示：下面每一行都在编译期报错（@ts-expect-error 验证「确实报错」）
// ---------------------------------------------------------------------------

console.log('--- 2) 编译期拦截：4 类错误全部以 @ts-expect-error 标注在源码中 ---');

// 演示行包成「只编译不调用」的箭头函数：错误在编译期被拦下，运行期不会执行
// （否则 emit 缺参会以 undefined 真的跑一遍）

// @ts-expect-error - 未知事件名：'user:logout' 不在 Events map 里
const bad1 = () => emitter.emit('user:logout');

// @ts-expect-error - 参数类型错误：user:login 的参数是 string，不是 number
const bad2 = () => emitter.emit('user:login', 42);

// @ts-expect-error - 参数个数不足：order:create 需要 (number, number) 两个参数
const bad3 = () => emitter.emit('order:create', 1001);

// @ts-expect-error - 监听器签名不符：监听 user:login 却声明 number 参数（逆变不兼容）
const bad4 = () => emitter.on('user:login', (n: number) => n);

void bad1;
void bad2;
void bad3;
void bad4;

console.log('未知事件名 / 参数类型错误 / 参数个数不足 / 监听器签名不符 —— 编译期全拦下');

// ---------------------------------------------------------------------------
// 3) Pub-Sub（发布订阅）：发布者和订阅者互不相识，中介统一转发
//    与 Observer 的两点区别：
//    a) 解耦程度：Observer 里 subject 直接持有 observers；Pub-Sub 里双方只认识
//       broker，彼此完全解耦（也因此可以跨模块、跨进程、甚至跨机器）；
//    b) 类型契约：中介用通用的 topic/payload 转发，编译期类型约束天然弱化，
//       契约变成「约定文档 + 运行时校验」—— 这是解耦换来的代价。
//    通配符 *：broker 独有的能力（Observer 模式没有「订阅所有事件」的自然位置）。
// ---------------------------------------------------------------------------

type PubSubHandler = (topic: string, payload: unknown) => void;

class PubSubBroker {
  #subs = new Map<string, Set<PubSubHandler>>();

  subscribe(topic: string, handler: PubSubHandler): () => void {
    let set = this.#subs.get(topic);
    if (set === undefined) {
      set = new Set();
      this.#subs.set(topic, set);
    }
    set.add(handler);
    return () => {
      this.#subs.get(topic)?.delete(handler);
    };
  }

  publish(topic: string, payload: unknown): void {
    // 精确订阅者 + 通配符订阅者各通知一遍
    for (const h of this.#subs.get(topic) ?? []) {
      h(topic, payload);
    }
    for (const h of this.#subs.get('*') ?? []) {
      h(topic, payload);
    }
  }
}

const bus = new PubSubBroker();

console.log('--- 3) Pub-Sub：中介（broker）解耦 + 通配符订阅 ---');
bus.subscribe('order', (topic, payload) => {
  console.log(`[pubsub/${topic}] ${topic}: ${JSON.stringify(payload)}`);
});
bus.subscribe('user', (topic, payload) => {
  console.log(`[pubsub/${topic}] ${topic}: ${JSON.stringify(payload)}`);
});
bus.subscribe('*', (topic, payload) => {
  console.log(`[pubsub/*] 任意主题 ${topic}: ${JSON.stringify(payload)}`);
});

bus.publish('order', { id: 1 });
bus.publish('user', 'u-9');

export {};
