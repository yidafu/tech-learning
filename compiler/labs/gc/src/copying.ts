// Cheney 半空间复制：分配 = bump 指针碰头，回收 = 活区翻面
// 三条教学要点：转发指针去重（菱形共享只搬一次）、to-space 即队列（广度优先）、
// 50% 空间税（存活集必须装得进单个半空间）。
// 对应文档：GC 专题导览"三条读法"中追踪路线的第三种形态。

import { Addr, Collector, CollectReport, Node } from './core';

export class CopyHeap implements Collector {
  readonly name = 'copying';
  readonly roots: (Addr | null)[] = [];
  readonly events: string[] = [];
  private from: (Node | null)[];   // 当前分配半空间
  private to: (Node | null)[];     // 复制目标半空间
  /** bump 指针（对象数）：分配 = top+1，无空闲表——O(1) 的全部秘密 */
  top = 0;
  private toTop = 0;
  private seq = 0;
  private nextId = 1;

  constructor(private capacity = 64) {
    this.from = new Array(capacity).fill(null);
    this.to = new Array(capacity).fill(null);
  }

  addRoot(): number {
    this.roots.push(null);
    return this.roots.length - 1;
  }

  alloc(label: string, size: number, fields: number): Addr {
    if (this.top + 1 > this.capacity) {
      this.collect('space-full'); // 碰头即触发回收（翻面腾出连续空间）
      if (this.top + 1 > this.capacity)
        throw new Error('OOM：存活集装不进单个半空间（复制算法的 50% 税收据）');
    }
    const a = this.seq++;
    this.from[a] = {
      id: this.nextId++,
      label,
      size,
      children: new Array(fields).fill(null),
      forwarded: null,
    };
    this.top++;
    return a;
  }

  writeRef(host: Addr, field: number, value: Addr | null): void {
    this.node(host).children[field] = value; // 复制式不并发，无屏障
  }

  collect(reason = 'manual'): CollectReport {
    let work = 0;
    this.toTop = 0;
    this.to.fill(null);
    const copy = (a: Addr | null): Addr | null => {
      if (a === null) return null;
      const n = this.from[a]!;
      if (n.forwarded !== null && n.forwarded !== undefined) return n.forwarded; // 已搬：转发指针直达新家（菱形去重的全部机制）
      const newAddr = this.toTop++;
      n.forwarded = newAddr;
      this.to[newAddr] = n; // 同一 Node 实例搬家——id 天然稳定
      return newAddr;
    };
    // ① 根搬家（根槽位改写为新地址）
    for (let i = 0; i < this.roots.length; i++) {
      this.roots[i] = copy(this.roots[i]);
      work++;
    }
    // ② Cheney 扫描：to-space 本身就是 BFS 队列，scan 追 top
    let scan = 0;
    while (scan < this.toTop) {
      const n = this.to[scan]!;
      for (let f = 0; f < n.children.length; f++) {
        n.children[f] = copy(n.children[f]);
      }
      scan++;
      work++;
    }
    // ③ 统计垃圾（从未获转发的旧空间对象）
    let dead = 0;
    for (let i = 0; i < this.top; i++) {
      const n = this.from[i];
      if (n && n.forwarded === null) {
        dead++;
        work++;
      }
    }
    const survivors = this.toTop;
    // ④ 翻面：to 成为新的 from；清转发指针，为下一轮复位
    [this.from, this.to] = [this.to, this.from];
    this.top = this.toTop;
    for (let i = 0; i < this.top; i++) this.from[i]!.forwarded = null;
    const line = `[gc:${reason}] copied ${survivors} objs | dead ${dead} | work ${work}`;
    this.events.push(line);
    return { reason, reclaimed: dead, survivors, work };
  }

  isLive(a: Addr | null): boolean {
    return a !== null && a < this.top && this.from[a] !== null;
  }
  liveAddrs(): Iterable<Addr> {
    const out: Addr[] = [];
    for (let i = 0; i < this.top; i++) if (this.from[i] !== null) out.push(i);
    return out;
  }
  node(a: Addr): Node {
    if (a >= this.top || this.from[a] === null)
      throw new Error(`地址 #${a} 已不在堆上（悬垂读取）`);
    return this.from[a]!;
  }
}
