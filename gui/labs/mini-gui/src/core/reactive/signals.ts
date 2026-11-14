// signals 细粒度响应式内核（惰性求值模型，对标 preact-signals 的教学简化）。
// 0.0.35 的实测边界决定了形态：Set 只能存 number（SC2009）、泛型类方法调用不支持（SC1090）、
// instanceof 收窄与 as 下行会撞 ICE（SC9001）→ 全虚分发：
//   noteDep（读时反向登记，默认空）与 Reaction 中间类（run / collectInto）。
//
// 传播模型：
//   读时收集：effect/computed 运行期间读信号 → 自动登记订阅 + 反向记依赖
//   写时调度：set 只做「标脏可达 computed + 收集可达 effect」，每个 effect 每波恰运行一次；
//             computed 惰性——被读到时才重算（读到的一定是新值 → 无 glitch，
//             diamond 每个 computed 每波恰算一次）。level 是依赖深度元数据（诊断用）。
export abstract class Reactive {
  /** 依赖图深度（signal=0；computed = 最深依赖 +1）。 */
  level = 0;
  protected subs: Reaction[] = [];

  subscriberLevel(): number {
    return this.level;
  }

  /** 读信号时由 track() 调用；computed 覆写以反向记依赖，其余为空。 */
  noteDep(_source: Reactive): void {}

  protected track(): void {
    if (current === null) return;
    if (this.subs.indexOf(current) < 0) this.subs.push(current);
    current.noteDep(this);
  }

  /** 写路径：标脏可达的 computed，收集可达的 effect，各运行一次（批内则暂存）。 */
  protected notifySubs(): void {
    const effects: Effect[] = [];
    for (const s of this.subs) {
      s.collectInto(effects, []);
    }
    if (batchDepth > 0) {
      for (const e of effects) {
        if (pending.indexOf(e) < 0) pending.push(e);
      }
      return;
    }
    for (const e of effects) e.run();
  }

  /** 向上继续传播（computed 用；遍历自己的订阅者逐个 collectInto）。 */
  protected collectUp(effects: Effect[], seen: Reactive[]): void {
    for (const s of this.subs) {
      s.collectInto(effects, seen);
    }
  }
}

/** 当前正在运行的效果/计算（读信号时向它登记）。 */
let current: Reaction | null = null;
/** batch 状态。 */
let batchDepth = 0;
let pending: Effect[] = [];

/** 可被调度/传播的响应式节点（computed 与 effect 的公共形状）。 */
export abstract class Reaction extends Reactive {
  abstract run(): void;
  abstract collectInto(effects: Effect[], seen: Reactive[]): void;
}

export class SignalN extends Reactive {
  value: number;
  constructor(v: number) {
    super();
    this.value = v;
  }
  get(): number {
    this.track();
    return this.value;
  }
  set(v: number): void {
    if (v === this.value) return;
    this.value = v;
    this.notifySubs();
  }
}

export class SignalS extends Reactive {
  value: string;
  constructor(v: string) {
    super();
    this.value = v;
  }
  get(): string {
    this.track();
    return this.value;
  }
  set(v: string): void {
    if (v === this.value) return;
    this.value = v;
    this.notifySubs();
  }
}

export class SignalB extends Reactive {
  value: boolean;
  constructor(v: boolean) {
    super();
    this.value = v;
  }
  get(): boolean {
    this.track();
    return this.value;
  }
  set(v: boolean): void {
    if (v === this.value) return;
    this.value = v;
    this.notifySubs();
  }
}

export class SignalList extends Reactive {
  value: string[];
  constructor(v: string[]) {
    super();
    this.value = v;
  }
  get(): string[] {
    this.track();
    return this.value;
  }
  set(v: string[]): void {
    this.value = v;
    this.notifySubs();
  }
}

/** 数值计算属性：惰性——被读时若脏才重算；依赖在重算时重建（支持条件依赖切换）。 */
export class ComputedN extends Reaction {
  private fn: () => number;
  private deps: Reactive[] = [];
  dirty = true;
  value = 0;

  constructor(fn: () => number) {
    super();
    this.fn = fn;
    this.evaluate(); // 首次求值：建立依赖与 level
  }

  private evaluate(): number {
    this.deps = [];
    const prev = current;
    current = this;
    try {
      this.value = this.fn();
    } finally {
      current = prev;
    }
    let max = 0;
    for (const d of this.deps) {
      const l = d.subscriberLevel();
      if (l + 1 > max) max = l + 1;
    }
    this.level = max;
    this.dirty = false;
    return this.value;
  }

  /** Reactive.noteDep 覆写：反向记依赖。 */
  noteDep(source: Reactive): void {
    if (this.deps.indexOf(source) < 0) this.deps.push(source);
  }

  /** 惰性读取：脏则先重算（上游新值此刻都已写好）；干净读取也要补订阅。 */
  get(): number {
    if (this.dirty) this.evaluate();
    this.track();
    return this.value;
  }

  run(): void {
    this.evaluate();
  }

  collectInto(effects: Effect[], seen: Reactive[]): void {
    const me: Reactive = this; // ScriptC：this-type 无静态表示（SC2011），显式落成基类型
    if (seen.indexOf(me) >= 0) return;
    seen.push(me);
    this.dirty = true;
    this.collectUp(effects, seen);
  }
}

/** 副作用：依赖变化时被调度重跑。effect() 返回句柄可 stop。 */
export class Effect extends Reaction {
  private fn: () => void;
  private stopped = false;
  /** 运行次数观测口（测试「每波恰一次」用）。 */
  runCount = 0;

  constructor(fn: () => void) {
    super();
    this.fn = fn;
    this.run();
  }

  run(): void {
    if (this.stopped) return;
    const prev = current;
    current = this;
    try {
      this.fn();
    } finally {
      current = prev;
    }
    this.runCount += 1;
  }

  stop(): void {
    this.stopped = true;
  }

  collectInto(effects: Effect[], _seen: Reactive[]): void {
    if (effects.indexOf(this) < 0) effects.push(this);
  }
}

export function effect(fn: () => void): Effect {
  return new Effect(fn);
}

export function computedN(fn: () => number): ComputedN {
  return new ComputedN(fn);
}

/** 一批写合并传播：批内的 set 只收集 effect，退出时统一运行一次。 */
export function batch(fn: () => void): void {
  batchDepth += 1;
  try {
    fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0 && pending.length > 0) {
      const effects = pending;
      pending = [];
      for (const e of effects) e.run();
    }
  }
}
