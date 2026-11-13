// 增量三色标记：把 while(队列非空) 拆成指令计数驱动的状态机
// 屏障可插拔：none（必坏）/ dijkstra / steele / yuasa(SATB) / hybrid(Go 混合)
// 对应文档：GC 专题 03 册《屏障与并发标记》+ 06 册《实践-增量三色标记》的可运行版。
// 栈/根槽位写入不打屏障（"栈引用免管"），正确性由收尾根重扫兜底——
// 对应 Go 混合屏障买回"免栈重扫"之前，各工业回收器的 STW 根重扫。

import { Addr, Collector, CollectReport, Node } from './core';

export type BarrierKind = 'none' | 'dijkstra' | 'steele' | 'yuasa' | 'hybrid';

export type Color = 'white' | 'gray' | 'black';

const INITIAL_GC = 1 << 10;

export class IncrementalHeap implements Collector {
  readonly name = 'incremental';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  /** 增量周期状态机 */
  phase: 'idle' | 'marking' = 'idle';
  /** 屏障策略旋钮：切到 none 即可复现"活对象被误收"事故 */
  barrier: BarrierKind = 'hybrid';
  /** 每步灰对象预算——停顿旋钮 */
  stepBudget = 8;
  /** 每 N 次 gcTick 走一步——增量密度旋钮 */
  markEvery = 64;
  stats = { ticks: 0, steps: 0, maxStep: 0, cycles: 0, rootRescans: 0 };
  bytes = 0;
  nextGC = INITIAL_GC;
  private nodes = new Map<Addr, Node>();
  private head: Addr | null = null;
  private epoch = 0;
  private grayWork: Addr[] = [];
  private graySet = new Set<Addr>(); // worklist 之外的 O(1) 灰判定
  private seq = 0;
  private nextId = 1;
  private lastReport: CollectReport | null = null;

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    if (this.phase === 'idle' && this.bytes + size > this.nextGC) this.beginMark(); // 分配压力开周期
    const a = ++this.seq;
    const n: Node = {
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      next: this.head,
      // 黑分配：标记期新生直接本轮免死（V8 老生代同款；浮动垃圾的另一来源）
      markEpoch: this.phase === 'marking' ? this.epoch : this.epoch - 1,
    };
    this.head = a;
    this.nodes.set(a, n);
    this.bytes += size;
    return a;
  }

  /** mutator 的每次操作后调一次；周期由这里驱动 */
  gcTick(): void {
    this.stats.ticks++;
    if (this.phase === 'idle') {
      if (this.bytes > this.nextGC) this.beginMark();
      return;
    }
    if (this.stats.ticks % this.markEvery === 0) this.step();
  }

  beginMark(): void {
    this.epoch++;            // 黑白翻转：上轮 mark 位瞬间作废
    this.grayWork = [];
    this.graySet.clear();
    this.phase = 'marking';
    this.stats.cycles++;
    this.markRoots();        // 只"入灰"，不扫完——增量由此开始
  }

  /** 引用写唯一入口：四种屏障全部拦在这里（none = 裸写） */
  writeRef(host: Addr, field: number, value: Addr | null): void {
    const n = this.node(host);
    const old = n.children[field];
    if (this.phase === 'marking') {
      if (this.barrier === 'dijkstra' || this.barrier === 'hybrid') this.shade(value); // 新值置灰
      if (this.barrier === 'yuasa' || this.barrier === 'hybrid') this.shade(old);      // 旧值置灰（SATB）
      if (this.barrier === 'steele' && value !== null && this.isBlack(host) && this.isWhite(value)) {
        this.gray(host); // 黑源退灰：我收回"扫完了"的宣言，待会重扫我自己
      }
    }
    n.children[field] = value;
  }

  /** 走一步标记。返回 true = 本轮标记完成（sweep 已做） */
  step(): boolean {
    let used = 0;
    while (used < this.stepBudget && this.grayWork.length) {
      const a = this.grayWork.pop()!;
      this.graySet.delete(a);
      const n = this.nodes.get(a)!;
      for (const c of n.children) {
        if (c !== null && this.isWhite(c)) this.gray(c); // 只捞白的：重灰黑子会死循环
      }
      used++;
    }
    this.stats.steps++;
    this.stats.maxStep = Math.max(this.stats.maxStep, used);
    if (this.grayWork.length) return false;
    // 队列空 → 收尾根重扫（栈免屏障的兜底，Go 术语里的 termination）
    this.markRoots();
    if (this.grayWork.length) {
      this.stats.rootRescans++;
      return false;
    }
    this.lastReport = this.finishCycle();
    return true;
  }

  /** 便捷口：一口气跑完一个增量周期 */
  collect(reason = 'manual'): CollectReport {
    this.beginMark();
    while (!this.step()) { /* 小步走完 */ }
    return this.lastReport!;
  }

  private markRoots(): void {
    for (const r of this.roots) {
      if (r !== null && this.isWhite(r)) this.gray(r);
    }
  }

  private shade(a: Addr | null): void {
    if (a !== null && this.isWhite(a)) this.gray(a);
  }

  private gray(a: Addr): void {
    const n = this.nodes.get(a)!;
    if (this.graySet.has(a)) return;
    n.markEpoch = this.epoch; // 白→灰 或 黑→灰（Steele 退灰复用同一条路）
    this.graySet.add(a);
    this.grayWork.push(a);
  }

  isWhite(a: Addr): boolean {
    return this.nodes.get(a)!.markEpoch !== this.epoch;
  }
  isBlack(a: Addr): boolean {
    return this.nodes.get(a)!.markEpoch === this.epoch && !this.graySet.has(a);
  }
  /** 三色不变式校验器用的颜色视图 */
  colorOf(a: Addr): Color {
    if (this.graySet.has(a) && this.nodes.get(a)!.markEpoch === this.epoch) return 'gray';
    return this.isBlack(a) ? 'black' : 'white';
  }

  /** debug 断言：标记期间不允许黑指白（事故表第 1 步的常驻化） */
  assertTriColorInvariant(): void {
    if (this.phase !== 'marking') return;
    for (const a of this.nodes.keys()) {
      if (!this.isBlack(a)) continue;
      for (const c of this.nodes.get(a)!.children) {
        if (c !== null && this.isWhite(c)) {
          throw new Error(`黑指白：${this.nodes.get(a)!.label}#${this.nodes.get(a)!.id} → ${this.nodes.get(c)!.label}#${this.nodes.get(c)!.id}`);
        }
      }
    }
  }

  private finishCycle(): CollectReport {
    let alive = 0;
    let reclaimed = 0;
    let work = 0;
    let link = this.head;
    let prev: Addr | null = null;
    while (link !== null) {
      const n = this.nodes.get(link)!;
      const next = n.next ?? null;
      work++;
      if (n.markEpoch === this.epoch) {
        prev = link;
        alive++;
      } else {
        if (prev === null) this.head = next;
        else this.nodes.get(prev)!.next = next;
        this.nodes.delete(link);
        this.bytes -= n.size;
        reclaimed++; // ← 这一行，就是所有屏障存在的理由
      }
      link = next;
    }
    this.nextGC = Math.max(this.bytes * 2, INITIAL_GC);
    this.phase = 'idle';
    this.graySet.clear();
    const line = `[gc:incremental/${this.barrier}] cycles ${this.stats.cycles} | steps ${this.stats.steps} | alive ${alive} | reclaimed ${reclaimed} | rescans ${this.stats.rootRescans}`;
    this.events.push(line);
    return { reason: 'incremental', reclaimed, survivors: alive, work };
  }

  isLive(a: Addr | null): boolean {
    return a !== null && this.nodes.has(a);
  }
  liveAddrs(): Iterable<Addr> {
    return this.nodes.keys();
  }
  node(a: Addr): Node {
    const n = this.nodes.get(a);
    if (!n) throw new Error(`地址 #${a} 已不在堆上（悬垂读取）`);
    return n;
  }
}
