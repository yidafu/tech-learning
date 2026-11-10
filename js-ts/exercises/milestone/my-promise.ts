/**
 * 大纲章节：阶段 1 里程碑
 * 主题：手写符合 Promises/A+ 规范的 Promise（MyPromise<T>），逐分支标注条款号
 * 测试：npx vitest run exercises/milestone/my-promise.test.ts
 * 运行：npx tsx exercises/milestone/my-promise.ts
 */

// ———— Promises/A+ 条款速查（下文注释中的条款号均出自该规范）————
// 2.1 Promise States：pending / fulfilled / rejected，迁移单向且终态不可逆
// 2.2 then 方法：回调注册（2.2.1~2.2.6）、异步执行（2.2.4）、返回新 promise（2.2.7）
// 2.3 The Promise Resolution Procedure：对 resolve 值的展开规则
// ECMA-262（Promise 的运行时语义与之等价）：§27.2.3.1 Promise(executor)

/** 状态常量（2.1：一共只有这三种状态） */
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/** 最小 thenable 结构（2.3.3：只要 x.then 是函数，就按 thenable 对待） */
interface ThenableLike<T> {
  then(
    onFulfilled?: (value: T) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): unknown;
}

/** executor 类型。两个函数形参即 ECMA-262 §27.2.1 CreateResolvingFunctions 产出的 resolve/reject */
export type Executor<T> = (
  resolve: (value?: T | PromiseLike<T>) => void,
  reject: (reason?: unknown) => void,
) => void;

/** pending 期间暂存的 then 回调（2.2.6：promise 被决议时，所有已注册回调都要执行） */
interface PendingCallback<TValue> {
  fulfilled: (value: TValue) => void;
  rejected: (reason: unknown) => void;
}

export class MyPromise<T> implements PromiseLike<T> {
  /** 2.1：初始为 pending；fulfilled/rejected 是不可逆终态 */
  private _state: typeof PENDING | typeof FULFILLED | typeof REJECTED = PENDING;
  /** 2.1.2.2：fulfilled 时的终值（不可变） */
  private _value!: T;
  /** 2.1.3.2：rejected 时的拒因（不可变） */
  private _reason!: unknown;
  /**
   * 「决议权已被占用」标记：
   * - 已 settle（终态）后，后续 resolve/reject 一律忽略（2.1.1.1 / 2.1.2.1 / 2.1.3.1）；
   * - 正在采纳 thenable 期间（状态仍显示 pending），后续 resolve/reject 同样忽略——
   *   这与原生语义一致：resolve(promiseB) 后再 reject() 不生效，状态交给 promiseB 决定。
   */
  private _locked = false;
  private _callbacks: PendingCallback<T>[] = [];

  constructor(executor: Executor<T>) {
    // ECMA-262 §27.2.3.1 Promise(executor)：executor 由构造器同步执行，只执行一次
    const resolve = (value?: T | PromiseLike<T>): void => {
      this._resolveInternal(value, false);
    };
    const reject = (reason?: unknown): void => {
      // reject 不展开 thenable：reason 原样保存（与 resolve 的关键差异，
      // ECMA-262 §27.2.2.4 的 reject 分支不做 thenable 采纳）
      if (this._locked) return;
      this._settle(REJECTED, reason);
    };
    try {
      executor(resolve, reject);
    } catch (err) {
      // executor 抛错等价于调用 reject；若此前已决议，_settle 内部会静默忽略
      reject(err);
    }
  }

  /**
   * The Promise Resolution Procedure（2.3）的完整实现。
   * @param x         被决议的值：then 回调返回值 / resolve 的入参
   * @param bypassLock 采纳 thenable 的递归调用需绕过 _locked 检查（决议权已在本流程手中）
   */
  private _resolveInternal(x: unknown, bypassLock: boolean): void {
    if (!bypassLock && this._locked) {
      // 只处理第一次决议：后续 resolve 一律静默忽略
      return;
    }
    // 2.3.1：promise 与 resolve 的目标是同一引用 → TypeError（防无限循环）
    if (x === this) {
      this._settle(REJECTED, new TypeError('Chaining cycle detected for promise'));
      return;
    }
    // 2.3.3：x 是对象或函数 → 尝试当 thenable 展开
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      let thenProp: unknown;
      try {
        // 2.3.3.1：只访问一次 x.then，结果存入局部变量。
        // 规范注释明确要求该属性访问的副作用至多发生一次（getter 只会被调用一次）。
        thenProp = (x as ThenableLike<unknown>).then;
      } catch (err) {
        // 2.3.3.2：取 x.then 本身抛错 → 直接以该错误 reject
        this._settle(REJECTED, err);
        return;
      }
      if (typeof thenProp === 'function') {
        // 进入 thenable 采纳阶段：占用决议权（this._locked = true），
        // 之后外部的 resolve/reject 全部失效，状态由 thenable 的回调决定
        this._locked = true;
        // 2.3.3.3.3.1 / 2.3.3.3.3.2：resolvePromise / rejectPromise 只有第一次调用生效
        let called = false;
        // ECMA-262 §27.2.2.2 步骤 12-13 / NewPromiseResolveThenableJob：
        // 对 thenable 的 then 的调用是一个入队的 Promise Job（微任务），不是同步调用。
        // 这保证「let p = new MyPromise(res => res(thenable))」在 thenable 回调
        // 执行时 p 已完成赋值（同步栈已清空）——与原生 Promise 顺序一致。
        queueMicrotask(() => {
          try {
            (thenProp as (
              onFulfilled: (value: unknown) => void,
              onRejected: (reason: unknown) => void,
            ) => unknown).call(
              x,
              (y: unknown) => {
                if (called) return;
                called = true;
                // 2.3.3.3.1：以 y 再次走完整的 Resolution Procedure（递归展开嵌套 thenable）
                this._resolveInternal(y, true);
              },
              (r: unknown) => {
                if (called) return;
                called = true;
                // 2.3.3.3.2：thenable 内部拒绝 → 当前 promise rejected
                this._settle(REJECTED, r);
              },
            );
          } catch (err) {
            // 2.3.3.3.2（后半）：调用 then 时抛错，且回调尚未被调用过 → 以该错误 reject
            if (!called) {
              called = true;
              this._settle(REJECTED, err);
            }
          }
        });
        return;
      }
      // 2.3.3.4：then 不是函数 → x 只是普通对象，直接 fulfill
      this._settle(FULFILLED, x);
      return;
    }
    // 2.3.4：普通值 → 直接 fulfill
    this._settle(FULFILLED, x);
  }

  /** 终态迁移：唯一入口，保证状态只能从 pending 迁移一次 */
  private _settle(state: typeof FULFILLED | typeof REJECTED, outcome: unknown): void {
    // 2.1.1.1：pending → fulfilled 只发生一次
    // 2.1.2.1：fulfilled 之后再 reject 无效
    // 2.1.3.1：rejected 之后再 resolve 无效
    if (this._state !== PENDING) return;
    this._locked = true;
    this._state = state;
    const callbacks = this._callbacks;
    this._callbacks = [];
    if (state === FULFILLED) {
      this._value = outcome as T; // 2.1.2.2：终值不可变
      // 2.2.6：promise 被 resolve 后，所有已注册的 onFulfilled 按注册序执行
      for (const cb of callbacks) cb.fulfilled(this._value);
    } else {
      this._reason = outcome; // 2.1.3.2：拒因不可变
      // 2.2.6：被 reject 后，所有已注册的 onRejected 按注册序执行
      for (const cb of callbacks) cb.rejected(this._reason);
    }
  }

  // —————————————————— then（2.2）——————————————————

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): MyPromise<TResult1 | TResult2> {
    // 2.2.1 / 2.2.1.1 / 2.2.1.2：参数不是函数时忽略，替换为「值穿透」代理：
    //   - onFulfilled 缺省 → 等价 (v) => v，把终值原样传给下一个 promise（2.2.7.3）
    //   - onRejected 缺省  → 等价 (r) => { throw r; }，把错误继续向后抛（2.2.7.4）
    const realOnFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value: T): T => value;
    const realOnRejected =
      typeof onRejected === 'function' ? onRejected : (reason: unknown): never => {
        throw reason;
      };

    // 2.2.7：then 必须返回一个「新」promise（promise2）——链式的根基
    const promise2 = new MyPromise<TResult1 | TResult2>((resolve, reject) => {
      // 2.2.4 / 2.2.5：onFulfilled / onRejected 必须异步执行——
      // 规范原文：「在执行上下文栈只包含 platform code 时调用」，即当前同步栈清空之后。
      // queueMicrotask 把回调挂入微任务队列，是「platform code」的标准入口。
      const dispatchFulfilled = (value: T): void => {
        queueMicrotask(() => {
          try {
            // 2.2.2：以 promise 的终值调用 onFulfilled
            // 2.2.7.1：以回调返回值 x 走 Promise Resolution Procedure（resolve 内部即 2.3 全流程）
            resolve(realOnFulfilled(value) as TResult1 | PromiseLike<TResult1>);
          } catch (err) {
            // 2.2.7.2：回调抛错 → promise2 变为 rejected
            reject(err);
          }
        });
      };
      const dispatchRejected = (reason: unknown): void => {
        queueMicrotask(() => {
          try {
            // 2.2.3：以拒因调用 onRejected；返回值同样走 2.3（2.2.7.1）
            resolve(realOnRejected(reason) as TResult2 | PromiseLike<TResult2>);
          } catch (err) {
            // 2.2.7.2：onRejected 抛错 → promise2 rejected
            reject(err);
          }
        });
      };

      if (this._state === FULFILLED) {
        dispatchFulfilled(this._value); // 2.2.2：已终态 → 调度执行
      } else if (this._state === REJECTED) {
        dispatchRejected(this._reason); // 2.2.3：已终态 → 调度执行
      } else {
        // 2.2.2 / 2.2.5：pending 时暂存回调（fulfilled 与 rejected 各自单独暂存），
        // 2.2.6：同一个 promise 上多次 then 各自独立、按注册序执行
        this._callbacks.push({ fulfilled: dispatchFulfilled, rejected: dispatchRejected });
      }
    });
    return promise2;
  }

  /** ECMA-262 §27.2.5.1 Promise.prototype.catch：就是 then(undefined, onRejected) 的语法糖 */
  catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): MyPromise<T | TResult> {
    return this.then<T, TResult>(undefined, onRejected);
  }

  /**
   * ECMA-262 §27.2.5.4 Promise.prototype.finally：
   *   回调不接收参数；结果与错误都「穿透」；回调返回 thenable 时等待其 settle
   */
  finally(onFinally?: (() => unknown) | null): MyPromise<T> {
    const run = (continuation: () => unknown): MyPromise<T> =>
      MyPromise.resolve(onFinally === null || onFinally === undefined ? undefined : onFinally()).then(
        continuation,
      ) as MyPromise<T>;
    return this.then(
      (value: T) => run((): T => value),
      (reason: unknown) =>
        run((): never => {
          throw reason;
        }),
    );
  }

  // —————————————————— 静态方法 ——————————————————

  /** ECMA-262 §27.2.4.6 Promise.resolve：入参已是本类实例 → 原样返回；否则展开（含 thenable） */
  static resolve<U>(value?: U | PromiseLike<U> | MyPromise<U>): MyPromise<U> {
    if (value instanceof MyPromise) return value as MyPromise<U>;
    return new MyPromise<U>((resolve) => {
      resolve(value); // value 是 thenable 时由 2.3 采纳
    });
  }

  /** ECMA-262 §27.2.4.7 Promise.reject：reason 原样传递，永不展开 thenable */
  static reject<U = never>(reason?: unknown): MyPromise<U> {
    return new MyPromise<U>((_resolve, reject) => {
      reject(reason);
    });
  }

  /**
   * ECMA-262 §27.2.4.1 Promise.all：
   *   空 iterable → 同步 resolve([])（准确说也是一个微任务内的决议）；
   *   任一 reject → 整体 reject；全部 fulfilled → 结果按输入顺序
   */
  static all<T>(items: Iterable<T | PromiseLike<T>>): MyPromise<T[]> {
    return new MyPromise<T[]>((resolve, reject) => {
      const inputs = Array.from(items);
      const results: T[] = new Array<T>(inputs.length);
      let remaining = inputs.length;
      if (remaining === 0) {
        resolve(results);
        return;
      }
      for (let i = 0; i < inputs.length; i++) {
        MyPromise.resolve(inputs[i]).then(
          (v: T) => {
            results[i] = v; // 固定索引：保证输出顺序与输入一致
            if (--remaining === 0) resolve(results);
          },
          (r: unknown) => {
            // 第一个 reject 胜出；后续 settle 调用被 _locked 忽略
            reject(r);
          },
        );
      }
    });
  }

  /**
   * ECMA-262 §27.2.4.5 Promise.race：
   *   第一个 settle（无论 fulfill 还是 reject）者胜出；空 iterable → 永远 pending
   */
  static race<T>(items: Iterable<T | PromiseLike<T>>): MyPromise<T> {
    return new MyPromise<T>((resolve, reject) => {
      for (const item of items) {
        MyPromise.resolve(item).then(resolve, reject);
      }
    });
  }

  /** ECMA-262 §27.2.4.2 Promise.allSettled：等待全部终态，永不 reject */
  static allSettled<T>(
    items: Iterable<T | PromiseLike<T>>,
  ): MyPromise<PromiseSettledResult<T>[]> {
    return new MyPromise<PromiseSettledResult<T>[]>((resolve) => {
      const inputs = Array.from(items);
      const results: PromiseSettledResult<T>[] = new Array(inputs.length);
      let remaining = inputs.length;
      if (remaining === 0) {
        resolve(results);
        return;
      }
      for (let i = 0; i < inputs.length; i++) {
        MyPromise.resolve(inputs[i]).then(
          (v: T) => {
            results[i] = { status: 'fulfilled', value: v };
            if (--remaining === 0) resolve(results);
          },
          (r: unknown) => {
            results[i] = { status: 'rejected', reason: r };
            if (--remaining === 0) resolve(results);
          },
        );
      }
    });
  }

  /** ECMA-262 §27.2.4.3 Promise.any：第一个 fulfilled 胜出；全灭 → AggregateError */
  static any<T>(items: Iterable<T | PromiseLike<T>>): MyPromise<T> {
    return new MyPromise<T>((resolve, reject) => {
      const inputs = Array.from(items);
      const errors: unknown[] = new Array(inputs.length);
      let remaining = inputs.length;
      if (remaining === 0) {
        reject(new AggregateError(errors, 'All promises were rejected'));
        return;
      }
      for (let i = 0; i < inputs.length; i++) {
        MyPromise.resolve(inputs[i]).then(
          (v: T) => resolve(v),
          (r: unknown) => {
            errors[i] = r;
            if (--remaining === 0) {
              reject(new AggregateError(errors, 'All promises were rejected'));
            }
          },
        );
      }
    });
  }
}

export default MyPromise;

// —————————————————— demo（tsx 冒烟）——————————————————

/** 供 npx tsx 直接运行的冒烟演示；测试文件不依赖它 */
export function demo(): void {
  console.log('--- MyPromise demo ---');
  const order: string[] = [];

  // 链式调用 + thenable 展开：then 返回另一个 MyPromise 时会被 2.3 采纳
  MyPromise.resolve(1)
    .then((v) => {
      order.push(`then1:${v}`);
      return v + 1;
    })
    .then((v) => new MyPromise<number>((res) => queueMicrotask(() => res(v * 10))))
    .then((v) => {
      order.push(`then3:${v}`);
    })
    .catch(() => undefined); // 防止 demo 产生未处理 rejection

  MyPromise.all([MyPromise.resolve('a'), 'b', MyPromise.resolve('c')]).then((vs) =>
    console.log('all:', vs.join(',')),
  );

  // then 回调异步执行（2.2.4）：同步段先打印
  console.log('sync first →', order.length === 0 ? '(empty)' : order.join(','));
  queueMicrotask(() => console.log('after microtasks →', order.join(',')));
}

demo();
