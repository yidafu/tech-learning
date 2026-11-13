// 两指滑动整理（Lisp v2，1962）：标记 → 定址 → 改指针 → 滑动，四遍线性扫描
// 教学要点：forwarding 把"改引用"与"搬对象"解耦；地址压缩消灭碎片——
// 这是 mark-sweep 的碎片问题的根治方案，代价是多两遍全堆扫描。
// 对应文档：GC 专题 04 册"old 整理"、V8 Mark-Compact 的教学原型。

import { Addr, Collector, CollectReport, Node } from './core';

export class CompactHeap implements Collector {
  readonly name = 'mark-compact';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  private slots: (Node | null)[] = []; // Addr = 下标，地址有序
  private markStack: Addr[] = [];
  private seq = 0;
  private nextId = 1;

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    const a = this.slots.length;
    this.slots.push({
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      marked: false,
      forwarded: null,
    });
    return a;
  }

  writeRef(host: Addr, field: number, value: Addr | null): void {
    this.node(host).children[field] = value;
  }

  collect(reason = 'manual'): CollectReport {
    let work = 0;
    const prevCount = this.slots.filter((s) => s !== null).length;

    // 相 1：标记（灰栈 DFS，同 mark-sweep；用 marked 位，收尾统一复位）
    this.markStack = [];
    for (const r of this.roots) if (r !== null) this.mark(r);
    while (this.markStack.length) {
      const a = this.markStack.pop()!;
      for (const c of this.slots[a]!.children) if (c !== null) this.mark(c);
      work++;
    }

    // 相 2：定址——第二根手指压出每个存活对象的新地址（保持相对顺序）
    let free = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const n = this.slots[i];
      if (n && n.marked) {
        n.forwarded = free++;
        work++;
      }
    }

    // 相 3：改指针——全体存活对象改用转发地址（先改后搬，forwarding 解耦）
    for (let i = 0; i < this.slots.length; i++) {
      const n = this.slots[i];
      if (n && n.marked) {
        for (let f = 0; f < n.children.length; f++) {
          const c = n.children[f];
          if (c !== null) n.children[f] = this.slots[c]!.forwarded!;
        }
        work++;
      }
    }

    // 相 4：滑动搬家——存活对象压到堆底，死对象的空间被抹平
    const next: (Node | null)[] = new Array(free).fill(null);
    for (let i = 0; i < this.slots.length; i++) {
      const n = this.slots[i];
      if (n && n.marked) next[n.forwarded!] = n;
    }
    for (const n of next) {
      if (n) {
        n.forwarded = null;
        n.marked = false;
      }
      work++;
    }
    const reclaimed = prevCount - free;
    this.slots = next;
    const line = `[gc:${reason}] slid ${free} objs to [0..${free - 1}] | reclaimed ${reclaimed} | work ${work}`;
    this.events.push(line);
    return { reason, reclaimed, survivors: free, work };
  }

  private mark(a: Addr): void {
    const n = this.slots[a]!;
    if (n.marked) return;
    n.marked = true;
    this.markStack.push(a);
  }

  /** 存活对象数（整理后 = 堆长，无空洞的直接证据） */
  get usedSlots(): number {
    return this.slots.filter((s) => s !== null).length;
  }
  get heapLength(): number {
    return this.slots.length;
  }

  isLive(a: Addr | null): boolean {
    return a !== null && a < this.slots.length && this.slots[a] !== null;
  }
  liveAddrs(): Iterable<Addr> {
    const out: Addr[] = [];
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] !== null) out.push(i);
    return out;
  }
  node(a: Addr): Node {
    if (a >= this.slots.length || this.slots[a] === null)
      throw new Error(`地址 #${a} 已不在堆上（悬垂读取）`);
    return this.slots[a]!;
  }
}
