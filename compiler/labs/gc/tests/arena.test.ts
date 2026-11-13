import { describe, expect, it } from 'vitest';
import { Arena } from '../src/arena';

describe('免 GC 路线：arena/region', () => {
  it('bump 分配：偏移单调推进，零每对象元数据', () => {
    const arena = new Arena(128);
    const o1 = arena.alloc(16);
    const o2 = arena.alloc(32);
    expect(o1).toBe(0);
    expect(o2).toBe(16);
    expect(arena.used).toBe(48);
    expect(arena.stats.headerWork).toBe(0); // RC 的计数、GC 的 mark 位——这里都不存在
    arena.write(o1, 0, 42);
    expect(arena.read(o1, 0)).toBe(42);
  });

  it('reset O(1)：整代一次释放，不遍历任何对象', () => {
    const arena = new Arena(1 << 16);
    for (let i = 0; i < 1000; i++) arena.alloc(16);
    expect(arena.used).toBe(16000);
    arena.reset();
    expect(arena.used).toBe(0);
    expect(arena.stats.resets).toBe(1);
    expect(arena.stats.headerWork).toBe(0); // 一千个对象的释放成本 = 一次赋值
  });

  it('region 栈：mark/rollback 嵌套作用域（rustc 按阶段清理 AST 的方式）', () => {
    const arena = new Arena(256);
    const m1 = arena.mark();
    arena.alloc(16);
    const m2 = arena.mark();
    arena.alloc(32);
    arena.alloc(32);
    arena.rollback(m2); // 内层作用域退出：一次水位回滚
    expect(arena.used).toBe(m1 + 16);
    arena.rollback(m1); // 外层退出：全清
    expect(arena.used).toBe(0);
    expect(arena.stats.resets).toBe(0); // rollback 不是 reset：按区域，不按整代
  });

  it('容量耗尽抛 OOM（arena 不假装无限）', () => {
    const arena = new Arena(32);
    arena.alloc(16);
    arena.alloc(16);
    expect(() => arena.alloc(1)).toThrow(/OOM/);
  });
});
