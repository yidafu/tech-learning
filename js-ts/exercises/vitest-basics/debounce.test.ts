/**
 * 大纲章节：阶段 4 工程化
 * 主题：fake timers——vi.useFakeTimers + advanceTimersByTimeAsync 精确测试 debounce
 * 运行：npx vitest run exercises/vitest-basics/
 * 预期输出：（vitest 摘要；时间数字随机器变化）
 *   ✓ exercises/vitest-basics/debounce.test.ts (3 tests)
 *   与其他两个测试文件合计 Test Files 3 passed / Tests 21 passed
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { debounce } from './debounce';

// fake timers：替换宿主的 setTimeout/clearTimeout/Date 等，
// 时间不再真流逝，而是由 advanceTimersByTimeAsync 精确“拨动”。
// 好处：不用真实等待 300ms，测试既快又是确定性的（不会受调度抖动影响）。
afterEach(() => {
  vi.useRealTimers(); // 每个用例后恢复，避免污染其他测试
});

describe('debounce（fake timers）', () => {
  it('wait 窗口内的多次调用只保留最后一次', async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const log = debounce((s: string) => {
      calls.push(s);
    }, 100);

    log('a');
    log('b');
    log('c'); // c 重置计时器，a/b 被取消
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(99); // 只推进 99ms：还差 1ms
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(1); // 到达 100ms：只有 c 触发
    expect(calls).toEqual(['c']);
  });

  it('两次调用间隔超过 wait：各自生效', async () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const log = debounce((n: number) => {
      calls.push(n);
    }, 100);

    log(1);
    await vi.advanceTimersByTimeAsync(100); // 第一次静默期结束 → 触发 1
    log(2);
    await vi.advanceTimersByTimeAsync(100); // 第二次静默期结束 → 触发 2
    expect(calls).toEqual([1, 2]);
  });

  it('advanceTimersByTimeAsync 会 flush 期间产生的微任务，能测异步回调', async () => {
    vi.useFakeTimers();
    const saved: string[] = [];
    const save = debounce(async (s: string) => {
      // 异步回调：即使 fn 是 async，advanceTimersByTimeAsync 也会等它 settle
      await Promise.resolve();
      saved.push(s);
    }, 50);

    save('x');
    expect(saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(saved).toEqual(['x']); // 若用同步版 advanceTimersByTime，这里可能拿到 []
  });
});
