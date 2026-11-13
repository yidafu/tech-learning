// 引用计数实验室：朴素 → 延迟(Deutsch–Bobrow 1960s) → 合并(Hughes 1982) → 试删(Bacon–Rajan 2001)
// 对应文档：GC 专题 02 册《引用计数的进化》——每种模式对应一节"进化"。
// 教学主线：每次进化都是赎一张罚单——赋值税（延迟/合并）或缓存行乒乓（偏向，此处略）
// 或循环引用（试删）。

import { Addr, Collector, CollectReport, Node } from './core';

export type RCMode = 'naive' | 'deferred' | 'coalescing';

export class RefCountHeap implements Collector {
  readonly name = 'refcount';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  private nodes = new Map<Addr, Node>();
  private zct: Addr[] = []; // 零计数表：延迟 RC 的"候选集"（归零 ≠ 死刑，等安全点核对）
  /** 合并 RC 的赋值流水账（公开：测试要断言"税被递延"的证据） */
  journal: { old: Addr | null; new: Addr | null }[] = [];
  private seq = 0;
  private nextId = 1;
  stats = { retains: 0, releases: 0, zctScans: 0, journalFlushes: 0 };

  constructor(public mode: RCMode = 'naive') {}

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    const a = this.seq++;
    this.nodes.set(a, {
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      rc: 0,
    });
    if (this.mode === 'deferred') this.zct.push(a); // 新对象 rc=0 只被栈持有 → 一并候选（D-B 方案）
    return a;
  }

  /** 根槽位写（栈引用）。naive/coalescing 当场计税；deferred 全程免税 */
  setRoot(i: number, v: Addr | null): void {
    const old = this.roots[i];
    if (this.mode === 'deferred') {
      this.roots[i] = v;
      if (old !== null) this.zct.push(old); // 旧值成候选：免税但待安全点核对
      return;
    }
    if (v !== null) this.retain(v); // 先加后减：自赋值（old === v）也安全
    this.roots[i] = v;
    if (old !== null) this.release(old);
  }

  /** 引用写唯一入口。coalescing 只记账不结账；naive/deferred 当场结税 */
  writeRef(host: Addr, field: number, value: Addr | null): void {
    const n = this.node(host);
    const old = n.children[field];
    n.children[field] = value;
    if (this.mode === 'coalescing') {
      this.journal.push({ old, new: value }); // 赋值缓冲：p.f 写一万次，净效果只有一条
      return;
    }
    if (value !== null) this.retain(value);
    if (old !== null) this.release(old);
  }

  private retain(a: Addr): void {
    this.node(a).rc!++;
    this.stats.retains++;
  }

  private release(a: Addr): void {
    this.stats.releases++;
    const n = this.node(a);
    if (--n.rc! === 0) {
      if (this.mode === 'naive') this.freeSubtree(a);
      else this.zct.push(a); // 归零 ≠ 死刑：进候选集
    }
  }

  /** naive：计数归零 → 递归释放。确定性析构：作用域退出即回收 */
  private freeSubtree(a: Addr): number {
    const n = this.node(a);
    let k = 1;
    for (const c of n.children) {
      if (c !== null) k += this.freeSubtree(c);
    }
    this.nodes.delete(a);
    return k;
  }

  /** 安全点：ZCT 核对——栈引用恢复计数，仍为零者整组释放 */
  scanZCT(): number {
    if (this.mode === 'naive') return 0;
    this.stats.zctScans++;
    const candSet = new Set(this.zct.filter((a) => this.nodes.has(a)));
    this.zct = [];
    for (const c of candSet) {
      for (const r of this.roots) {
        if (r === c) this.node(c).rc!++; // Deutsch–Bobrow：栈引用此时才数回去
      }
    }
    let freed = 0;
    const toFree: Addr[] = [];
    for (const c of candSet) if (this.node(c).rc! === 0) toFree.push(c);
    while (toFree.length) {
      const a = toFree.pop()!;
      if (!this.nodes.has(a) || this.node(a).rc! !== 0) continue;
      const n = this.node(a);
      this.nodes.delete(a);
      freed++;
      for (const c of n.children) {
        if (c === null || !this.nodes.has(c)) continue;
        const cn = this.node(c);
        if (--cn.rc! === 0) {
          let stackHeld = false;
          for (const r of this.roots) if (r === c) stackHeld = true;
          if (!stackHeld) toFree.push(c); // 补刀候选：核对过栈引用才准死
        }
      }
    }
    return freed;
  }

  /** Hughes 合并：流水账结净账——增量/即时 → 安全点批量 */
  flushJournal(): number {
    if (!this.journal.length) return 0;
    this.stats.journalFlushes++;
    const entries = this.journal;
    this.journal = [];
    const inc = new Map<Addr, number>();
    const dec = new Map<Addr, number>();
    for (const e of entries) {
      if (e.new !== null) inc.set(e.new, (inc.get(e.new) ?? 0) + 1);
      if (e.old !== null) dec.set(e.old, (dec.get(e.old) ?? 0) + 1);
    }
    for (const [a, k] of inc) this.node(a).rc! += k;
    let freed = 0;
    const pending: Addr[] = [];
    for (const [a, k] of dec) {
      const n = this.node(a);
      n.rc! -= k;
      if (n.rc! === 0) pending.push(a);
    }
    while (pending.length) {
      const a = pending.pop()!;
      if (!this.nodes.has(a) || this.node(a).rc! !== 0) continue;
      const n = this.node(a);
      this.nodes.delete(a);
      freed++;
      for (const c of n.children) {
        if (c === null || !this.nodes.has(c)) continue;
        const cn = this.node(c);
        if (--cn.rc! === 0) pending.push(c);
      }
    }
    return freed;
  }

  // ---------- 试删法（Bacon–Rajan 2001，Python gc 模块的算法内核）----------
  // 相 1 trial delete：沿候选子图的每条边临时减一（模拟"环内互指全部不算数"）
  // 相 2 scan：有外部引用者（rc 仍 > 0）把整组恢复计数（scanBlack）；否则整组判白
  // 相 3 collect white：白的整环回收，环发出的边顺手把外部对象的计数减掉

  /** candidates 省略 = 全堆容器（Python 的启发式在此处退化为全扫——教学取最简） */
  collectCycles(candidates?: Addr[]): number {
    for (const n of this.nodes.values()) n.cycleColor = undefined; // 每轮全部重新着色
    const cands = candidates ?? [...this.nodes.keys()];
    for (const a of cands) {
      const n = this.nodes.get(a);
      if (n && n.cycleColor === undefined) this.markGray(a);
    }
    for (const a of cands) {
      const n = this.nodes.get(a);
      if (n && n.cycleColor === 'gray') this.scan(a);
    }
    let freed = 0;
    for (const a of cands) {
      const n = this.nodes.get(a);
      if (n && n.cycleColor === 'white') freed += this.collectWhite(a);
    }
    const line = `[gc:cycles] candidates ${cands.length} | freed ${freed}`;
    this.events.push(line);
    return freed;
  }

  private markGray(a: Addr): void {
    const n = this.node(a);
    if (n.cycleColor !== undefined) return;
    n.cycleColor = 'gray';
    for (const c of n.children) {
      if (c !== null && this.nodes.has(c)) {
        this.node(c).rc!--; // 每条内部边减一：与"这条边可能随环一起死"严格对账
        this.markGray(c);
      }
    }
  }

  private scan(a: Addr): void {
    const n = this.node(a);
    if (n.cycleColor !== 'gray') return;
    if (n.rc! > 0) {
      this.scanBlack(a); // 有外部引用：整组复活
    } else {
      n.cycleColor = 'white'; // 先着白再递归：自环/环上递归安全终止
      for (const c of n.children) {
        if (c !== null && this.nodes.has(c)) this.scan(c);
      }
    }
  }

  private scanBlack(a: Addr): void {
    const n = this.node(a);
    if (n.cycleColor === 'black') return;
    n.cycleColor = 'black';
    for (const c of n.children) {
      if (c !== null && this.nodes.has(c)) {
        this.node(c).rc!++; // 每条出边各恢复一次——与 markGray 的每边减一严格对偶
        this.scanBlack(c);
      }
    }
  }

  private collectWhite(a: Addr): number {
    const n = this.node(a);
    if (n.cycleColor !== 'white') return 0;
    n.cycleColor = 'black';
    let freed = 1;
    for (const c of n.children) {
      if (c !== null && this.nodes.has(c)) {
        // 注意：这里不减计数——死环发出的边在 markGray 相已经减过（trial delete 的本义），
        // collectWhite 只负责下葬；再减一次就是双重扣税（曾让外部对象计数变 0 的真 bug）
        freed += this.collectWhite(c);
      }
    }
    this.nodes.delete(a);
    return freed;
  }

  /** Python 模型：RC 管日常，周期检测管环。coalescing 先结账，deferred 先核对 */
  collect(reason = 'manual'): CollectReport {
    let freed = 0;
    if (this.mode === 'coalescing') freed += this.flushJournal();
    if (this.mode === 'deferred') freed += this.scanZCT();
    freed += this.collectCycles();
    const line = `[gc:${reason}/${this.mode}] freed ${freed} | alive ${this.nodes.size}`;
    this.events.push(line);
    return { reason, reclaimed: freed, survivors: this.nodes.size, work: this.stats.releases };
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
