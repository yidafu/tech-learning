/**
 * 大纲章节：阶段 1 里程碑
 * 主题：MyPromise 测试——覆盖 Promises/A+ 关键条款（2.1.x 状态 / 2.2.x then / 2.3.x Resolution）
 * 运行：npx vitest run exercises/milestone/my-promise.test.ts
 * 说明：异步用例用真实微任务 flush（setTimeout 宏任务清空整个微任务队列），不用假计时器
 */
import { describe, it, expect } from 'vitest';
import { MyPromise } from './my-promise';

/** flush：挂一个宏任务，回调执行前当前已排队的微任务（含链上后续微任务）全部执行完 */
const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0));

describe('MyPromise：状态与 executor（2.1.x）', () => {
  it('executor 同步执行：先于 new 之后的代码', () => {
    const order: string[] = [];
    new MyPromise<number>(() => order.push('executor'));
    order.push('after new');
    expect(order).toEqual(['executor', 'after new']);
  });

  it('executor 抛错 → promise 变 rejected', async () => {
    let caught: unknown;
    try {
      await new MyPromise<number>(() => {
        throw new Error('executor boom');
      });
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('executor boom');
  });

  it('resolve 二次调用无效：只认第一次（2.1.1.1 / 2.1.2.1）', async () => {
    const p = new MyPromise<number>((resolve) => {
      resolve(1);
      resolve(2); // 静默忽略
    });
    expect(await p).toBe(1);
  });

  it('reject 后再 resolve 无效（2.1.3.1）', async () => {
    let caught: unknown;
    try {
      await new MyPromise<number>((resolve, reject) => {
        reject(new Error('first'));
        resolve(99); // 静默忽略
      });
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('first');
  });

  it('resolve(thenable) 后再 reject 无效：决议权已被 thenable 占用', async () => {
    let caught: unknown;
    const p = new MyPromise<number>((resolve, reject) => {
      resolve({
        then: (res: (v: number) => void) => {
          queueMicrotask(() => res(42));
        },
      } as unknown as PromiseLike<number>);
      reject(new Error('too late')); // 应被忽略
    });
    expect(await p).toBe(42);
    expect(caught).toBeUndefined();
  });
});

describe('MyPromise：then 行为（2.2.x）', () => {
  it('then 回调异步执行：同步段先完成（2.2.4）', async () => {
    const order: string[] = [];
    MyPromise.resolve(42).then((v) => order.push(`then:${v}`));
    order.push('sync');
    expect(order).toEqual(['sync']);
    await flush();
    expect(order).toEqual(['sync', 'then:42']);
  });

  it('链式值传递：普通返回值传给下一个 then（2.2.7.1 / 2.3.4）', async () => {
    const result = await MyPromise.resolve(1)
      .then((v) => v + 1)
      .then((v) => v * 10);
    expect(result).toBe(20);
  });

  it('非函数参数值穿透：then(42) 原样透传终值（2.2.7.3）', async () => {
    const result = await MyPromise.resolve(7).then(42 as unknown as undefined);
    expect(result).toBe(7);
  });

  it('无 onRejected 时错误穿透到链尾（2.2.7.4）', async () => {
    let caught: unknown;
    try {
      await MyPromise.reject(new Error('pass through')).then((v) => v).then((v) => v);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('pass through');
  });

  it('错误冒泡到 catch', async () => {
    const caught = await MyPromise.reject(new Error('boom'))
      .catch((e: Error) => e.message);
    expect(caught).toBe('boom');
  });

  it('then 的 onFulfilled 抛错 → 下一个 promise rejected（2.2.7.2）', async () => {
    let caught: unknown;
    try {
      await MyPromise.resolve(1).then(() => {
        throw new Error('callback boom');
      });
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('callback boom');
  });

  it('onRejected 返回值能恢复链路：下一个 then 走 fulfilled', async () => {
    const result = await MyPromise.reject(new Error('r'))
      .then(undefined, (e: Error) => `recovered:${e.message}`)
      .then((s) => s.toUpperCase());
    expect(result).toBe('RECOVERED:R');
  });

  it('同一个 promise 上多次注册 then：各自独立、按注册序执行（2.2.6）', async () => {
    const order: string[] = [];
    const p = new MyPromise<number>((resolve) => queueMicrotask(() => resolve(1)));
    p.then((v) => order.push(`a:${v}`));
    p.then((v) => order.push(`b:${v}`));
    p.then((v) => order.push(`c:${v}`));
    await flush();
    expect(order).toEqual(['a:1', 'b:1', 'c:1']);
  });

  it('微任务链顺序：链上多个微任务都在同步代码之后依次执行', async () => {
    const order: string[] = [];
    MyPromise.resolve(1)
      .then((v) => {
        order.push('a');
        return v + 1;
      })
      .then((v) => {
        order.push('b');
        return new MyPromise<number>((res) => res(v + 1)); // thenable 采纳 → 再排一个微任务
      })
      .then(() => {
        order.push('c');
      });
    order.push('sync');
    await flush();
    expect(order).toEqual(['sync', 'a', 'b', 'c']);
  });
});

describe('MyPromise：thenable 采纳（2.3.x）', () => {
  it('采纳异步 settle 的 thenable（2.3.3.3）', async () => {
    const thenable = {
      then(res: (v: number) => void) {
        setTimeout(() => res(99), 0);
      },
    } as unknown as PromiseLike<number>;
    expect(await MyPromise.resolve(thenable)).toBe(99);
  });

  it('then getter 抛错 → promise rejected（2.3.3.2）', async () => {
    const evil = {
      get then() {
        throw new Error('getter boom');
      },
    };
    let caught: unknown;
    try {
      await MyPromise.resolve(evil as unknown as PromiseLike<number>);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('getter boom');
  });

  it('x.then 只取一次：getter 计数为 1（2.3.3.1 防多次取 then）', async () => {
    let accessCount = 0;
    const thenable = {
      get then() {
        accessCount++;
        return (res: (v: number) => void) => res(42);
      },
    };
    const value = await MyPromise.resolve(thenable as unknown as PromiseLike<number>);
    expect(value).toBe(42);
    expect(accessCount).toBe(1);
  });

  it('thenable 的 then 抛错且未调用回调 → rejected（2.3.3.3.2）', async () => {
    const thenable = {
      then() {
        throw new Error('then call boom');
      },
    };
    let caught: unknown;
    try {
      await MyPromise.resolve(thenable as unknown as PromiseLike<number>);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('then call boom');
  });

  it('thenable 把 promise 本身 resolve 回去 → TypeError（2.3.1）', async () => {
    let q: MyPromise<number>;
    q = new MyPromise<number>((resolve) => {
      resolve({
        then(r: (v: unknown) => void) {
          r(q); // 把承载它的 promise 自己传回
        },
      } as unknown as PromiseLike<number>);
    });
    let caught: unknown;
    try {
      await q;
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TypeError);
  });

  it('then 回调返回 promise2 自身 → TypeError（2.3.1）', async () => {
    let p2: MyPromise<number>;
    p2 = MyPromise.resolve(1).then((): MyPromise<number> => p2);
    let caught: unknown;
    try {
      await p2;
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TypeError);
  });

  it('嵌套 thenable 递归展开（2.3.3.3.1）', async () => {
    const inner = {
      then(res: (v: number) => void) {
        res(7);
      },
    };
    const outer = {
      then(res: (v: unknown) => void) {
        res(inner);
      },
    };
    const value = await MyPromise.resolve(outer as unknown as PromiseLike<number>);
    expect(value).toBe(7);
  });

  it('MyPromise.resolve 展开 thenable；入参已是 MyPromise 实例时原样返回', async () => {
    const thenable = {
      then(res: (v: string) => void) {
        res('expanded');
      },
    } as unknown as PromiseLike<string>;
    expect(await MyPromise.resolve(thenable)).toBe('expanded');

    const existing = MyPromise.resolve(3);
    expect(MyPromise.resolve(existing)).toBe(existing); // 同一引用
  });
});

describe('MyPromise：组合方法', () => {
  it('all：全部 fulfilled → 按输入顺序返回数组', async () => {
    const result = await MyPromise.all([
      MyPromise.resolve(1),
      2, // 普通值被 MyPromise.resolve 包装
      new MyPromise<number>((res) => setTimeout(() => res(3), 0)),
    ]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('all：任一 rejected → 整体 rejected（且第一个拒因胜出）', async () => {
    let caught: unknown;
    try {
      await MyPromise.all([
        new MyPromise<number>((res) => setTimeout(() => res(1), 20)),
        MyPromise.reject(new Error('boom')),
      ]);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('boom');
  });

  it('all：空数组 → resolve([])', async () => {
    expect(await MyPromise.all<number>([])).toEqual([]);
  });

  it('race：第一个 settle 者胜出（即使是 reject）', async () => {
    const winner = await MyPromise.race([
      new MyPromise<number>((res) => setTimeout(() => res(1), 20)),
      MyPromise.resolve(2),
    ]);
    expect(winner).toBe(2);

    let caught: unknown;
    try {
      await MyPromise.race([MyPromise.reject(new Error('fast fail')), MyPromise.resolve(1)]);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('fast fail');
  });

  it('allSettled：无论成败全部记录（加分项）', async () => {
    const result = await MyPromise.allSettled([
      MyPromise.resolve(1),
      MyPromise.reject(new Error('nope')),
    ]);
    expect(result).toEqual([
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: new Error('nope') },
    ]);
  });

  it('any：第一个 fulfilled 胜出；全灭时 AggregateError（加分项）', async () => {
    const first = await MyPromise.any([
      MyPromise.reject(new Error('a')),
      MyPromise.resolve(2),
      new MyPromise<number>((res) => setTimeout(() => res(3), 0)),
    ]);
    expect(first).toBe(2);

    let caught: unknown;
    try {
      await MyPromise.any([MyPromise.reject(new Error('x')), MyPromise.reject(new Error('y'))]);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toHaveLength(2);
  });

  it('finally：不接收参数、结果穿透、回调返回值被忽略', async () => {
    const received: unknown[] = [];
    const result = await MyPromise.resolve('keep')
      .finally((...args: unknown[]) => received.push(args))
      .finally(() => 'ignored');
    expect(result).toBe('keep');
    expect(received).toEqual([[]]); // 无参数

    let caught: unknown;
    try {
      await MyPromise.reject(new Error('still here')).finally(() => 'ignored');
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).toBe('still here'); // 错误也穿透
  });
});
