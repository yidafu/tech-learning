// 整体式标记-清除：教科书三色的直译
// 要点：侵入式堆链表 + 黑白翻转（mark epoch）+ 自适应阈值。
// 对应文档：06-第六阶段/04-实践-标记清除GC.md 与 GC 专题 06 册的"上一代"。

import { Addr, Collector, CollectReport, Node } from './core';

const INITIAL_GC = 1 << 10; // 实验室规模：1KB 起步（文档里 1MB 缩小 1000 倍，比例不变）

export class MarkSweepHeap implements Collector {
  readonly name = 'mark-sweep';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  private nodes = new Map<Addr, Node>(); // Addr → Node
  private head: Addr | null = null;      // 侵入式链表头（分配头插）
  bytes = 0;                             // 公开：阈值测试要看
  nextGC = INITIAL_GC;
  private epoch = 0;
  private grayWork: Addr[] = [];         // 灰色待办栈（LIFO = DFS）
  private seq = 0;
  private nextId = 1;

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    if (this.bytes + size > this.nextGC) this.collect('threshold');
    const a = ++this.seq;
    const n: Node = {
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      next: this.head,
      markEpoch: this.epoch - 1, // 生而为白：绝不能被上一轮的 mark 位误保
    };
    this.head = a;
    this.nodes.set(a, n);
    this.bytes += size;
    return a;
  }

  writeRef(host: Addr, field: number, value: Addr | null): void {
    this.node(host).children[field] = value; // 整体式无屏障：全停顿世界没有并发问题
  }

  collect(reason = 'manual'): CollectReport {
    let work = 0;
    this.epoch++; // 黑白翻转：全堆 mark 位一秒清零（清零免费的秘密）
    this.markRoots();
    while (this.grayWork.length) {
      const a = this.grayWork.pop()!; // 灰出队
      work += this.blacken(a);        // 扫子引用：白子入灰
    }
    return this.sweep(reason, work);
  }

  private markRoots(): void {
    for (const r of this.roots) if (r !== null) this.mark(r);
  }

  private mark(a: Addr): void {
    const n = this.nodes.get(a)!;
    if (n.markEpoch === this.epoch) return; // 已标（黑）
    n.markEpoch = this.epoch;               // 白 → 黑，同时入灰待办
    this.grayWork.push(a);
  }

  private blacken(a: Addr): number {
    const n = this.nodes.get(a)!;
    for (const c of n.children) if (c !== null) this.mark(c);
    return 1;
  }

  private sweep(reason: string, work: number): CollectReport {
    let alive = 0;
    let reclaimed = 0;
    let link = this.head;
    let prev: Addr | null = null;
    while (link !== null) {
      const n = this.nodes.get(link)!;
      const next = n.next ?? null;
      work++;
      if (n.markEpoch === this.epoch) {
        prev = link; // 黑：留
        alive++;
      } else {
        // 白：链表摘除 + 从堆注销
        if (prev === null) this.head = next;
        else this.nodes.get(prev)!.next = next;
        this.nodes.delete(link);
        this.bytes -= n.size;
        reclaimed++;
      }
      link = next;
    }
    this.nextGC = Math.max(this.bytes * 2, INITIAL_GC); // 自适应阈值：一行换一个量级的聪明
    const line = `[gc:${reason}] work ${work} | alive ${alive} objs (${this.bytes}B) | reclaimed ${reclaimed} | threshold ${this.nextGC}B`;
    this.events.push(line);
    return { reason, reclaimed, survivors: alive, work };
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
