/**
 * 大纲章节：阶段 5 专题深入 —— 响应式源码阅读（mini-reactivity 的 Vitest 用例）
 * 主题：依赖收集 / 嵌套惰性代理 / 分支切换 cleanup / computed 缓存与置脏 / deleteProperty
 * 测试：npx vitest run exercises/reactivity/
 * 预期输出（vitest 摘要；时间与耗时数值随机器变化，其余行稳定）：
 *  RUN  v5.1.0 /Users/.../024877ef-2eb0-4b37-8b37-63ecf25410f0（工作区绝对路径）
 *  ✓ exercises/reactivity/mini-reactivity.test.ts (8 tests) 3ms
 *  Test Files  1 passed (1)
 *       Tests  8 passed (8)
 *    Start at  23:34:08
 *    Duration  215ms (transform 76%, import 13%, worker 7%, tests 3%)
 */

import { describe, expect, it } from 'vitest';
import { computed, effect, reactive } from './mini-reactivity';

describe('mini-reactivity', () => {
  it('属性读取被收集：改值触发 effect 重跑', () => {
    const state = reactive({ count: 0 });
    let dummy = -1;
    effect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0); // effect 立即执行一次，同时建立 count 依赖

    state.count = 1; // set 陷阱 → trigger(count) → effect 重跑
    expect(dummy).toBe(1);
  });

  it('嵌套属性：内层对象被读取时惰性代理，同样响应', () => {
    const state = reactive({ nested: { num: 0 } });
    let dummy = 0;
    effect(() => {
      dummy = state.nested.num;
    });
    expect(dummy).toBe(0);

    state.nested.num = 10; // state.nested 读取时才包 Proxy，依赖已收集到 nested.num
    expect(dummy).toBe(10);
  });

  it('未读取的属性不触发', () => {
    const state = reactive({ a: 'a', b: 'b' });
    let runs = 0;
    let seen = '';
    effect(() => {
      runs += 1;
      seen = state.b; // 只读了 b
    });
    expect(runs).toBe(1);

    state.a = 'a2'; // a 从未被读取：无依赖、无触发
    expect(runs).toBe(1);
    expect(seen).toBe('b');
  });

  it('分支切换后不再触发明分支（cleanup 生效）', () => {
    const state = reactive({ ok: true, text: 'yes', fallback: 'no' });
    let seen = '';
    let runs = 0;
    effect(() => {
      runs += 1;
      seen = state.ok ? state.text : state.fallback;
    });
    expect(seen).toBe('yes'); // 初始依赖 {ok, text}

    state.ok = false; // 重跑：先 cleanup 清掉 text 依赖，再收集 {ok, fallback}
    expect(seen).toBe('no');

    const runsAfterSwitch = runs;
    state.text = 'changed'; // text 的依赖集合里已没有该 effect
    expect(runs).toBe(runsAfterSwitch); // 不重跑
    expect(seen).toBe('no');
  });

  it('computed 缓存：依赖不变时 getter 不重算（计数器证明）', () => {
    const state = reactive({ n: 2 });
    let getterRuns = 0;
    const doubled = computed(() => {
      getterRuns += 1;
      return state.n * 2;
    });
    expect(doubled.value).toBe(4);
    expect(doubled.value).toBe(4);
    expect(getterRuns).toBe(1); // 两次读取只算一次：缓存生效
  });

  it('computed 依赖变化后重新计算（置脏 → 读取时才重算）', () => {
    const state = reactive({ n: 2 });
    let getterRuns = 0;
    const doubled = computed(() => {
      getterRuns += 1;
      return state.n * 2;
    });
    expect(doubled.value).toBe(4);

    state.n = 5;
    expect(getterRuns).toBe(1); // 依赖变化只置脏，不立即重算

    expect(doubled.value).toBe(10); // 读取时发现脏，才重算
    expect(getterRuns).toBe(2);
  });

  it('多次 set 只影响读取过该属性的 effect', () => {
    const state = reactive({ x: 1, y: 1 });
    let xRuns = 0;
    let yRuns = 0;
    let x = 0;
    let y = 0;
    effect(() => {
      xRuns += 1;
      x = state.x;
    });
    effect(() => {
      yRuns += 1;
      y = state.y;
    });
    expect(xRuns).toBe(1);
    expect(yRuns).toBe(1);

    state.x = 100; // 只触发读过 x 的 effect
    expect(x).toBe(100);
    expect(y).toBe(1);
    expect(xRuns).toBe(2);
    expect(yRuns).toBe(1);

    state.x = 200; // 再 set 一次：仍然只影响 x 的 effect
    expect(xRuns).toBe(3);
    expect(yRuns).toBe(1);
  });

  it('deleteProperty 触发 effect', () => {
    const state = reactive<{ tag?: string }>({ tag: 'on' });
    let seen = '';
    effect(() => {
      seen = String(state.tag);
    });
    expect(seen).toBe('on');

    delete state.tag; // 删除成功且 key 原本存在 → trigger
    expect(seen).toBe('undefined');
  });
});

export {};
