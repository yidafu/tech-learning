// 分代回收：新代频繁小回收（复制/晋升），老代偶尔大回收；写屏障维护 remembered set
// 对应文档：GC 专题 04 册 V8"半空间 + old"、02 册"remembered set = 增量化的追踪"。
// 教学取舍：晋升只换所属集合、地址不变（真实收集器在此搬运）——聚焦"扫描集合"逻辑，
// 因为 minor GC 便宜的全部秘密是：**老年代本体一步都不碰**（oldTraversed 恒 0）。

import { Addr, Collector, CollectReport, Node } from './core';

export class GenerationalHeap implements Collector {
  readonly name = 'generational';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  private young = new Map<Addr, Node>();
  private old = new Map<Addr, Node>();
  /** 老代宿主登记表：老→新 边的集合（写屏障维护） */
  remembered = new Set<Addr>();
  /** 屏障开关：关掉即可复现"old→young 目标被误收"（屏障存在性证明） */
  barrierEnabled = true;
  /** 每轮 minor 的量化账本："小 GC 为什么便宜"就看这三个数 */
  lastMinor = { rootRefs: 0, rememberedHosts: 0, oldTraversed: 0, promoted: 0, reclaimed: 0 };
  minorThreshold = 32;
  bytes = 0;
  private youngBytes = 0;
  private epoch = 0;
  private seq = 0;
  private nextId = 1;

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    const a = this.seq++;
    this.young.set(a, {
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      markEpoch: this.epoch - 1,
      generation: 'young',
    });
    this.bytes += size;
    this.youngBytes += size;
    if (this.youngBytes > this.minorThreshold) this.minorGC('threshold');
    return a;
  }

  writeRef(host: Addr, field: number, value: Addr | null): void {
    const n = this.node(host);
    n.children[field] = value;
    // 写屏障：老收新 → 登记宿主进 remembered set（一行的税，换来 minor 不扫老代）
    if (this.barrierEnabled && this.old.has(host) && value !== null && this.young.has(value)) {
      this.remembered.add(host);
    }
  }

  /** minor：根 + remembered set 是仅有的两个扫描源 */
  minorGC(reason = 'minor'): CollectReport {
    this.epoch++;
    const marked = new Set<Addr>();
    const markYoung = (a: Addr | null): void => {
      if (a === null || !this.young.has(a) || marked.has(a)) return;
      marked.add(a);
      for (const c of this.young.get(a)!.children) markYoung(c); // 新代内部可达
    };
    let rootRefs = 0;
    for (const r of this.roots) {
      if (r !== null) rootRefs++;
      markYoung(r);
    }
    let rememberedHosts = 0;
    for (const h of this.remembered) {
      if (!this.old.has(h)) continue; // 宿主可能已被 major 收走
      rememberedHosts++;
      for (const c of this.old.get(h)!.children) markYoung(c); // 登记边指到的新代
    }
    // 活者晋升，死者当场从新代注销；老代本体一步未碰
    let promoted = 0;
    let reclaimed = 0;
    const promo: [Addr, Node][] = [];
    for (const [a, n] of this.young) {
      if (marked.has(a)) promo.push([a, n]);
      else {
        this.young.delete(a); // Map 迭代中删除安全；死者必须真下葬，不能只记数
        this.bytes -= n.size;
        reclaimed++;
      }
    }
    for (const [a, n] of promo) {
      n.generation = 'old';
      this.old.set(a, n);
      this.young.delete(a);
      promoted++;
    }
    this.youngBytes = 0;
    this.remembered.clear();
    this.lastMinor = { rootRefs, rememberedHosts, oldTraversed: 0, promoted, reclaimed };
    const line = `[gc:${reason}] roots ${rootRefs} | remembered ${rememberedHosts} | oldTraversed 0 | promoted ${promoted} | reclaimed ${reclaimed}`;
    this.events.push(line);
    return { reason, reclaimed, survivors: promoted, work: rootRefs + rememberedHosts };
  }

  /** major：全堆三色，两代一起清（对应 V8 Mark-Compact / G1 Full GC） */
  majorGC(reason = 'major'): CollectReport {
    this.epoch++;
    const lookup = (a: Addr | null): Node | null =>
      a === null ? null : this.young.get(a) ?? this.old.get(a) ?? null;
    const gray: Addr[] = [];
    const mark = (a: Addr | null): void => {
      const n = lookup(a);
      if (!n || n.markEpoch === this.epoch) return;
      n.markEpoch = this.epoch;
      gray.push(a!);
    };
    for (const r of this.roots) mark(r);
    let work = 0;
    while (gray.length) {
      const a = gray.pop()!;
      for (const c of lookup(a)!.children) mark(c);
      work++;
    }
    let reclaimed = 0;
    let survivors = 0;
    for (const m of [this.young, this.old]) {
      for (const [a, n] of m) {
        if (n.markEpoch === this.epoch) survivors++;
        else {
          m.delete(a);
          reclaimed++;
          this.bytes -= n.size;
        }
      }
    }
    this.remembered = new Set([...this.remembered].filter((h) => this.old.has(h)));
    const line = `[gc:${reason}] alive ${survivors} (young ${this.young.size} / old ${this.old.size}) | reclaimed ${reclaimed}`;
    this.events.push(line);
    return { reason, reclaimed, survivors, work };
  }

  collect(reason = 'minor'): CollectReport {
    return reason === 'major' ? this.majorGC(reason) : this.minorGC(reason);
  }

  isLive(a: Addr | null): boolean {
    return a !== null && (this.young.has(a) || this.old.has(a));
  }
  liveAddrs(): Iterable<Addr> {
    return [...this.young.keys(), ...this.old.keys()];
  }
  node(a: Addr): Node {
    const n = this.young.get(a) ?? this.old.get(a);
    if (!n) throw new Error(`地址 #${a} 已不在堆上（悬垂读取）`);
    return n;
  }
}
