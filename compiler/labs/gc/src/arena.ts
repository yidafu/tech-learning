// 免 GC 路线之一：arena / region——分配 = 碰头，释放 = 整代一次
// 对应文档：GC 专题 05 册《免GC的内存管理》（oxc/esbuild/rustc 的 AST 为什么快）。
// 与 RC/GC 的本质区别：没有每对象元数据（headerWork 恒 0）、没有逐个回收——
// 生命周期成批的对象（AST 节点、一帧里的临时值）用这个，成本曲线直接换掉。

export class Arena {
  private data: Uint8Array;
  used = 0;
  stats = { allocs: 0, resets: 0, headerWork: 0 };

  constructor(private capacity = 1 << 16) {
    this.data = new Uint8Array(capacity);
  }

  /** bump 分配：返回偏移。O(1)，零元数据 */
  alloc(size: number): number {
    if (this.used + size > this.capacity) throw new Error('OOM：arena 满了（修 AST 大小 or 换大 arena）');
    const off = this.used;
    this.used += size;
    this.stats.allocs++;
    return off;
  }

  write(off: number, i: number, byte: number): void {
    this.data[off + i] = byte;
  }
  read(off: number, i: number): number {
    return this.data[off + i];
  }

  /** 整代释放：O(1) 水位归零，不遍历任何对象——GC 世界里不存在的操作 */
  reset(): void {
    this.used = 0;
    this.stats.resets++;
  }

  /** region 栈：记住水位，作用域退出回滚（rustc 的 ty::Arena 按阶段就是这么用） */
  mark(): number {
    return this.used;
  }
  rollback(watermark: number): void {
    this.used = watermark;
  }
}
