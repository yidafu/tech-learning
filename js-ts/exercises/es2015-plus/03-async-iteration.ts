/**
 * 大纲章节：阶段 1.5 ES2015+ 关键特性
 * 主题：async generator + for await...of / 手写 asyncIterable / value 解包差异 / 普通 for...of 消费 Promise 的对照 / 异步队列批处理
 * 运行：npx tsx exercises/es2015-plus/03-async-iteration.ts
 * 预期输出：
 * --- 1. async function* + for await...of：按产出顺序逐个等待、逐个处理 ---
 * 收到: 数据-a
 * 收到: 数据-b
 * 收到: 数据-c
 * --- 2. 手写 asyncIterable（Symbol.asyncIterator + next 返回 Promise<IteratorResult>）---
 * 手写 asyncIterable: 10
 * 手写 asyncIterable: 20
 * 手写 asyncIterable: 30
 * --- 3. 解包差异：手写 asyncIterable 的 value 原样给出；async generator 的 yield 值被隐式 await ---
 * 手写 asyncIterable：for await 拿到的 value 是 Promise 吗 = true（value 不被额外解包）
 * async generator：for await 拿到的 value 是 Promise 吗 = false，值 = p1（该值来自 yield Promise.resolve(...)，被隐式 await）
 * async generator：for await 拿到的 value 是 Promise 吗 = false，值 = p2（非 Promise 值原样给出）
 * --- 4. 普通 for...of 消费 Promise：拿到的是 Promise 对象，必须手动 await ---
 * 普通 for...of 拿到: [object Promise] → 手动 await 后: 100
 * 普通 for...of 拿到: [object Promise] → 手动 await 后: 200
 * --- 5. 异步队列：逐个 await 模拟批处理 ---
 * 任务 t1 完成（累计 1/3）
 * 任务 t2 完成（累计 2/3）
 * 任务 t3 完成（累计 3/3）
 * 批处理结束，结果数 = 3
 */

// ---------- 1. async generator + for await...of ----------
// async function* 内部可以 await；yield 出去的值会被隐式 await 后再交给消费方；
// for await...of 每一步都等上一个 Promise 落定后才继续 → 严格的产出顺序
async function* fetchLike(): AsyncGenerator<string, void, unknown> {
  for (const n of ['a', 'b', 'c']) {
    await Promise.resolve(); // 模拟每次请求的异步等待
    yield `数据-${n}`;
  }
}

// ---------- 2. 手写 asyncIterable ----------
// 异步迭代器协议：[Symbol.asyncIterator]() 返回「next() 返回 Promise<IteratorResult>」的对象。
// 注意与同步协议的区别就这一处：next 的结果包在 Promise 里。
const handRolled: AsyncIterable<number> = {
  [Symbol.asyncIterator](): AsyncIterator<number> {
    let i = 0;
    return {
      next: (): Promise<IteratorResult<number>> => {
        i++;
        if (i <= 3) return Promise.resolve({ value: i * 10, done: false });
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  },
};

// ---------- 3. 解包差异 ----------
// 手写 asyncIterable 的 IteratorResult.value 原样交给循环体（哪怕它本身是 Promise）；
// async generator 的 yield expr 会先 await expr 再产出 —— 两种行为不同，容易混淆
const valueIsPromise: AsyncIterable<Promise<string>> = {
  [Symbol.asyncIterator]() {
    const items = [Promise.resolve('q1')];
    let i = 0;
    return {
      next: (): Promise<IteratorResult<Promise<string>>> => {
        if (i < items.length) return Promise.resolve({ value: items[i++]!, done: false });
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  },
};

async function* yieldsPromises(): AsyncGenerator<string | Promise<string>, void, unknown> {
  yield Promise.resolve('p1'); // 运行时被隐式 await，产出 'p1'
  yield 'p2'; // 非 Promise 值原样产出
}

// ---------- 4. 普通 for...of 消费 Promise 的对照 ----------
// 同步可迭代对象产出 Promise 时，for...of 不会等 —— 拿到的就是 Promise 对象本身
const syncOfPromises: Iterable<Promise<number>> = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: (): IteratorResult<Promise<number>> =>
        i < 2 ? { value: Promise.resolve((++i) * 100), done: false } : { value: undefined, done: true },
    };
  },
};

// ---------- 5. 异步队列：逐个 await 模拟批处理 ----------
// 「边生产边消费」：生成器内部模拟异步取任务，消费方逐个 await 处理
async function* taskQueue(tasks: string[]): AsyncGenerator<string, void, unknown> {
  for (const t of tasks) {
    await Promise.resolve(); // 模拟异步获取任务
    yield `任务 ${t} 完成`;
  }
}

// 注意：TS 对 for await 的元素类型按 Awaited<T> 处理（假定值会被 await），
// 所以这里用 Object.prototype.toString 判断而不是 instanceof（后者在 string 类型上无法通过类型检查），
// 运行时的真实行为以输出为准 —— 手写 asyncIterable 的 value 并不会被解包。
const isPromiseObject = (u: unknown): boolean => Object.prototype.toString.call(u) === '[object Promise]';

async function main(): Promise<void> {
  console.log('--- 1. async function* + for await...of：按产出顺序逐个等待、逐个处理 ---');
  for await (const item of fetchLike()) {
    console.log(`收到: ${item}`);
  }

  console.log('--- 2. 手写 asyncIterable（Symbol.asyncIterator + next 返回 Promise<IteratorResult>）---');
  for await (const v of handRolled) {
    console.log(`手写 asyncIterable: ${v}`);
  }

  console.log('--- 3. 解包差异：手写 asyncIterable 的 value 原样给出；async generator 的 yield 值被隐式 await ---');
  for await (const v of valueIsPromise) {
    console.log(`手写 asyncIterable：for await 拿到的 value 是 Promise 吗 = ${isPromiseObject(v)}（value 不被额外解包）`);
  }
  let yieldIdx = 0;
  for await (const v of yieldsPromises()) {
    yieldIdx++;
    const note = yieldIdx === 1 ? '该值来自 yield Promise.resolve(...)，被隐式 await' : '非 Promise 值原样给出';
    console.log(`async generator：for await 拿到的 value 是 Promise 吗 = ${isPromiseObject(v)}，值 = ${v}（${note}）`);
  }

  console.log('--- 4. 普通 for...of 消费 Promise：拿到的是 Promise 对象，必须手动 await ---');
  for (const p of syncOfPromises) {
    console.log(`普通 for...of 拿到: ${Object.prototype.toString.call(p)} → 手动 await 后: ${await p}`);
  }

  console.log('--- 5. 异步队列：逐个 await 模拟批处理 ---');
  const done: string[] = [];
  for await (const result of taskQueue(['t1', 't2', 't3'])) {
    done.push(result);
    console.log(`${result}（累计 ${done.length}/3）`);
  }
  console.log(`批处理结束，结果数 = ${done.length}`);
}

main();
