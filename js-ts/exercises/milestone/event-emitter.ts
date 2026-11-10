/**
 * 大纲章节：阶段 1 里程碑（发布订阅模式 + once 的 wrapper 语义）
 * 主题：手写 EventEmitter——对照 Node events 模块语义（once 包装、off 引用一致性、
 *       maxListeners 警告、emit 快照遍历）
 * 测试：npx vitest run exercises/milestone/event-emitter.test.ts
 * 运行：npx tsx exercises/milestone/event-emitter.ts
 */

/** 监听器：任意参数个数 */
type AnyListener = (...args: any[]) => void;

/**
 * 内部存储单元：
 *   raw  —— 用户注册的「原函数」，是 off/引用一致性的锚点
 *   call —— 实际被调用的函数；on 时就是 raw，once 时是包了一层「先移除再调用」的 wrapper
 * 这样设计后，off(event, 原函数) 天然能移除 once 注册的监听——
 * Node events 的 once 陷阱正来自「移除时拿到的是 wrapper 而不是原函数」。
 */
interface ListenerEntry {
  raw: AnyListener;
  call: AnyListener;
}

/**
 * 泛型参数 Events 用于事件名 → 参数元组的映射（如 { ping: [number] }），
 * 不传则退化为 Record<string, any[]>（任意事件、任意参数）。
 */
export class EventEmitter<Events extends Record<string, any[]> = Record<string, any[]>> {
  /** Node 语义：defaultMaxListeners = 10（超过才警告，0 表示不限制） */
  static defaultMaxListeners = 10;

  private _events = new Map<keyof Events & string, ListenerEntry[]>();
  private _maxListeners: number = EventEmitter.defaultMaxListeners;
  /** 同一事件只警告一次（对照 Node events 在 listener 数组上挂 warned 标记的做法） */
  private _warned = new Set<string>();

  /** 设置单事件最大监听数；0 表示不限制 */
  setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this._maxListeners;
  }

  on<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => void): this {
    return this._addListener(event, listener as AnyListener, false);
  }

  /**
   * once：触发一次后自动移除。
   * 实现要点：wrapper 先 off 再调用原函数；raw 记录的仍是原函数，
   * 所以 off(event, 原函数) 可以在触发前正确移除（引用一致性）。
   */
  once<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => void): this {
    return this._addListener(event, listener as AnyListener, true);
  }

  private _addListener(event: keyof Events & string, listener: AnyListener, once: boolean): this {
    let list = this._events.get(event);
    if (!list) {
      list = [];
      this._events.set(event, list);
    }
    const entry: ListenerEntry = once
      ? {
          raw: listener,
          call: (...args: any[]) => {
            this.off(event, listener); // 先移除（此时按 raw 匹配，能删掉自己这个 entry）
            listener(...args); // 再调用原函数——保证「只触发一次」
          },
        }
      : { raw: listener, call: listener };

    list.push(entry);

    // Node events 语义：监听数超过 maxListeners（且 maxListeners > 0）→ console.warn 一次
    if (this._maxListeners > 0 && list.length > this._maxListeners && !this._warned.has(event)) {
      this._warned.add(event);
      console.warn(
        `(node) Warning: Possible EventEmitter memory leak detected. ` +
          `${list.length} ${String(event)} listeners added to [EventEmitter]. ` +
          `Use emitter.setMaxListeners() to increase limit`,
      );
    }
    return this;
  }

  /**
   * off（Node 里的 removeListener）：按「原函数」引用匹配移除第一个。
   * 因为 entry.raw 存的是用户传入的函数，once 注册的也能用原函数移除。
   */
  off<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => void): this {
    const list = this._events.get(event);
    if (!list) return this;
    const idx = list.findIndex((entry) => entry.raw === (listener as AnyListener));
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) this._events.delete(event);
    }
    return this;
  }

  /**
   * emit：无监听返回 false；有监听按序同步调用并返回 true。
   * 遍历的是「快照拷贝」——emit 过程中回调里 on/off（含 once 的自动移除）
   * 不影响本次派发（与 Node 的拷贝派发一致）。
   */
  emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean {
    const list = this._events.get(event);
    if (!list || list.length === 0) return false;
    for (const entry of [...list]) {
      entry.call(...args);
    }
    return true;
  }

  /** 不传 event 清空全部；传 event 只清该事件 */
  removeAllListeners<K extends keyof Events & string>(event?: K): this {
    if (event === undefined) {
      this._events.clear();
    } else {
      this._events.delete(event);
    }
    return this;
  }

  /** 返回拷贝：外部对返回数组 push/splice 不影响内部派发 */
  listeners<K extends keyof Events & string>(event: K): Array<(...args: Events[K]) => void> {
    const list = this._events.get(event);
    return list ? list.map((entry) => entry.raw as (...args: Events[K]) => void) : [];
  }

  listenerCount(event: keyof Events & string): number {
    return this._events.get(event)?.length ?? 0;
  }
}

export default EventEmitter;

// —————————————————— demo（tsx 冒烟）——————————————————

/** 供 npx tsx 直接运行的冒烟演示；测试文件不依赖它 */
export function demo(): void {
  console.log('--- EventEmitter demo ---');
  const bus = new EventEmitter();

  bus.on('hello', (name: string) => console.log('  hello,', name));

  const tick = () => console.log('  tick!');
  bus.once('tick', tick);
  bus.on('tick', () => console.log('  tick (persistent)')); // 同一事件可混搭 on/once

  bus.emit('hello', 'world');
  bus.emit('tick');
  bus.emit('tick'); // once 的已自动移除，只剩 persistent

  console.log('  emit 无监听事件 →', bus.emit('nobody' as never)); // false
  console.log('  listeners(hello).length =', bus.listeners('hello').length);
}

demo();
