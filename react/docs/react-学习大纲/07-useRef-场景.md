---
title: "useRef 场景"
---

> 本文是《阶段 2：状态与副作用 ⭐核心（2 周）》按小节拆分后的续篇，上一部分见 [06-闭包陷阱专题-必练.md](06-闭包陷阱专题-必练.md)。

### useRef 场景

上一节的闭包陷阱里，`ref` 已经以"解药"的身份出场过一次：`setInterval` 里读旧 state，除了函数式更新，另一种解法就是把最新值放进 ref。这一节系统性讲 ref 的三类用途，以及它和 state 的本质区别。先给一句总纲，后面所有内容都是它的展开：

> **state 是渲染的数据源；ref 是 React 渲染模型之外的储物间。** 放进 state 的东西必须"值得一次重渲染"，其余的（DOM 节点、定时器句柄、第三方实例、上一次的值）都该放 ref。

React 官方对 ref 的定位是"逃生舱（escape hatch）"：React 的声明式模型覆盖不到的需求——命令式操作 DOM、跨渲染持有可变数据——通过 ref 这条官方通道解决，而不是绕过 React 直接操作全局。

#### 1. DOM 操作：聚焦、滚动定位、测量尺寸

**是什么**

`useRef(initialValue)` 返回一个形如 `{ current: T }` 的普通 JS 对象，React 保证在组件整个生命周期内返回的是**同一个对象**。它有两类用法：保存任意可变值（第 2、3 条讲）；把 ref 对象作为 `ref` 属性挂到 JSX 元素上——React 会在该元素挂载完成后把**真实 DOM 节点**写进 `ref.current`，卸载时置回 `null`。本条讲第二种。

**为什么需要**

React 是声明式 UI："UI = f(state)"，你声明状态与模板，DOM 由 React 全权管理。但有一类需求天然是**命令式**的：聚焦输入框（`focus()`）、滚动到某个元素（`scrollIntoView()`）、读取元素实时尺寸（`getBoundingClientRect()`）——浏览器只提供了这些命令式 API，必须拿到真实节点才能调用。直接 `document.querySelector` 去查 React 渲染出来的节点是反模式：选择器脆弱（改个 className 就断）、可能命中条件渲染之外的元素、并且绕过了 React 对 DOM 的所有权（节点被替换后你手里的引用就失效了）。ref 是 React 提供的官方通道："节点归 React 管，但我借出来操作一下"。

**怎么做（机制分步）**

1. 声明容器：`const inputRef = useRef<HTMLInputElement>(null)`；
2. 绑定到 JSX：`<input ref={inputRef} />`；
3. 首次渲染**提交**后，React 执行 `inputRef.current = <input 真实节点>`；
4. 组件卸载时，React 执行 `inputRef.current = null`；
5. 你在**事件处理器或 useEffect** 里通过 `inputRef.current` 拿到节点做命令式操作。

两个关键时序必须记住：首次渲染函数执行期间 `current` 一直是 `null`（DOM 还没创建）；`current` 的写入发生在提交阶段之后——所以任何"挂载后立刻用节点"的逻辑，天然属于 `useEffect` 的领地。

**代码示例（demo 1：自动聚焦 + 手动聚焦）**

```tsx
import { useEffect, useRef } from 'react';

export default function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // effect 在提交后执行，此时 DOM 一定存在，focus 是安全的
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <input ref={inputRef} placeholder="挂载后我会自动聚焦" />
      {/* 事件处理器里访问 DOM 同样安全：事件发生时页面必然已提交 */}
      <button onClick={() => inputRef.current?.focus()}>失去焦点后点我重新聚焦</button>
    </div>
  );
}
```

**代码示例（demo 2：表单校验失败时滚动定位到第一个错误字段）**

这是长表单场景的经典需求：提交失败时页面有十几个字段，不能让用户自己找红字。

```tsx
import { useRef, useState, type FormEvent } from 'react';

interface FieldErrors {
  name: string | null;
  email: string | null;
  age: string | null;
}

const NO_ERRORS: FieldErrors = { name: null, email: null, age: null };

export default function ScrollToErrorForm() {
  // 三个字段各一个 ref，用于"滚动定位 + 聚焦"
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const next: FieldErrors = {
      name: String(fd.get('name')).trim() ? null : '姓名必填',
      email: /^\S+@\S+\.\S+$/.test(String(fd.get('email'))) ? null : '邮箱格式不正确',
      age: Number(fd.get('age')) >= 18 ? null : '未满 18 岁不能注册',
    };
    setErrors(next);

    // 按字段顺序找到第一个出错的 ref，滚动到它并聚焦
    const firstErrorRef = next.name
      ? nameRef
      : next.email
        ? emailRef
        : next.age
          ? ageRef
          : null;
    if (firstErrorRef?.current) {
      firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorRef.current.focus({ preventScroll: true }); // 已在平滑滚动，聚焦时别再瞬移
    }
  };

  return (
    // 故意把表单拉长，制造"错误字段在视口外"的效果
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 56 }}>
      <label>
        姓名 <input name="name" ref={nameRef} />
        {errors.name && <span role="alert"> {errors.name}</span>}
      </label>
      <label>
        邮箱 <input name="email" ref={emailRef} />
        {errors.email && <span role="alert"> {errors.email}</span>}
      </label>
      <label>
        年龄 <input name="age" type="number" ref={ageRef} />
        {errors.age && <span role="alert"> {errors.age}</span>}
      </label>
      <button type="submit">提交（留空试一试滚动定位）</button>
    </form>
  );
}
```

**代码示例（demo 3：测量尺寸——手动测量 + ResizeObserver 持续监听）**

`getBoundingClientRect()` 返回的是"调用那一刻"的尺寸快照，不会自动更新。要持续感知尺寸变化，标准做法是 `ResizeObserver`（观察元素自身尺寸，窗口变化、内容增长、字体加载都能捕捉到）。

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export default function MeasureDemo() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [lines, setLines] = useState(1); // 内容行数，用来"撑大"盒子

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return; // 挂载前/卸载后访问必须判空
    const rect = el.getBoundingClientRect(); // 视口坐标系下的位置与尺寸（小数精度）
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
  }, []);

  useEffect(() => {
    measure(); // 挂载后先测一次
    // resize 事件只能捕捉"窗口引起"的尺寸变化；
    // 内容展开、字体加载等引起的变化要靠 ResizeObserver
    const ro = new ResizeObserver(() => measure());
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect(); // 不 disconnect 会持有已卸载节点的引用，造成泄漏
  }, [measure]);

  return (
    <div style={{ padding: 16 }}>
      <div
        ref={boxRef}
        style={{ width: '60%', padding: 16, background: '#282c34', color: '#fff' }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <p key={i}>第 {i + 1} 行：拖动窗口宽度、或点下面的按钮，观察尺寸读数</p>
        ))}
      </div>
      <p>
        当前尺寸：{size.width} × {size.height} px
      </p>
      <button onClick={() => setLines((n) => n + 1)}>加一行（触发 ResizeObserver）</button>
      <button onClick={measure}>手动测量（getBoundingClientRect 快照）</button>
    </div>
  );
}
```

**常见坑**

- 坑 1：`Cannot read properties of null (reading 'focus')`。
  - 症状：渲染函数体内直接调用 `ref.current.focus()` 报空指针。
  - 根因：首次渲染执行期间 DOM 尚未创建，`current` 是 `null`；或该元素是条件渲染的，此刻根本没有挂载。
  - 修法：命令式操作一律放进事件处理器或 `useEffect`，并用 `?.` 判空；条件渲染元素的存在性用 state 驱动，先保证"该渲染"，再保证"可操作"。
- 坑 2：渲染期间读 `ref.current` 参与渲染，首帧显示 0、第二帧才正确。
  - 症状：`<div>{boxRef.current?.offsetWidth ?? 0}</div>` 首渲染为 0。
  - 根因：渲染期间读到的 `current` 是**上一次提交**写入的值（首次渲染就是 `null`），比"本次将要呈现的 DOM"旧一拍；渲染期间测量本质是把命令式读取混进了声明式渲染。
  - 修法：测量放 effect，结果存进 state，由 state 驱动渲染（demo 3 正是这个结构）。
- 坑 3：回调 ref 打印出一次 `null`。
  - 症状：`ref={(el) => console.log(el)}` 输出先节点后 `null`（或反之多出一次 null）。
  - 根因：元素卸载时 React 会以 `null` 调用回调 ref 做清理；React 18 中若回调是内联函数，每次重新渲染也会先以 `null` 调用旧函数、再以节点调用新函数。
  - 修法：回调 ref 内部按"节点 / null"两条分支写逻辑（null 分支做清理），或把回调 ref 定义成 `useCallback` 稳定引用，避免无谓的 detach/attach。

#### 2. 保存不触发渲染的值（定时器 id、上一次值 `usePrevious`）

**是什么**

`ref.current` 可以直接读写，写入**不会触发任何重渲染**。所以 ref 适合存放"只是记录、不驱动 UI"的数据：定时器 id、动画帧 id、订阅的取消函数、上一次渲染的值。`useState` 的 setter 则相反——每次调用都调度一次重渲染。

**为什么需要**

先看反例：把定时器 id 放进 state 会怎样？`setTimerId(id)` 触发一次毫无意义的重渲染（id 变了 UI 也没东西可显示）；更麻烦的是 setState 是异步调度的，你在当前渲染里读 `timerId` 拿到的还是旧值，没法立即用它 `clearInterval`。而 `ref.current = id` 立即可读、零渲染成本。判断标准就一条：**这个值变了，UI 需要变吗？需要 → state；不需要 → ref。**

**ref 与 state 的本质区别**（这张表值得抄进笔记）：

| 维度 | state | ref |
|---|---|---|
| 写入方式 | `setState(x)`，调度更新 | `ref.current = x`，直接赋值 |
| 写入后立即可读？ | 否（当前渲染仍读到旧值） | 是 |
| 触发重渲染 | 是 | 否 |
| 渲染期间读它 | 安全且应当（它就是渲染输入） | **不要**（见下文规则） |
| 典型内容 | 列表数据、表单值、开关 | DOM 节点、定时器 id、实例、旧值 |

**"渲染期间别读写 ref"的规则与原因**：渲染函数应当是纯函数——同样的 props/state 输入应产出同样的 JSX。`ref.current` 是可变的共享变量，在渲染期间读写它会破坏这个契约：(1) StrictMode 会双调用渲染函数，若渲染期间有写入，两次结果可能不同；(2) 并发渲染下一次渲染可能被丢弃重来，期间对 ref 的写入会污染这一次"作废"的渲染；(3) 渲染期间读到的永远是"上次提交"的值，比你以为的旧一拍。所以规则是：**读、写 ref 都只发生在事件处理器和 effect 里；渲染期唯一例外是首次初始化（`if (ref.current === null) ref.current = create()`）。**

**怎么做（机制分步）+ 代码示例（demo：跨事件共享定时器 id 的秒表）**

```tsx
import { useEffect, useRef, useState } from 'react';

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  // 定时器 id 只是"句柄"，UI 不展示它 → 放 ref；放 state 会多一次无意义渲染
  const timerRef = useRef<number | null>(null);

  const start = () => {
    if (timerRef.current !== null) return; // 已在计时，防止叠加第二个定时器
    timerRef.current = window.setInterval(() => {
      // 函数式更新：不依赖外部的 elapsed，天然免疫闭包陷阱（上一节专题的解法一）
      setElapsed((ms) => ms + 100);
    }, 100);
  };

  const stop = () => {
    if (timerRef.current === null) return;
    window.clearInterval(timerRef.current);
    timerRef.current = null; // 置空，"开始"才能再次生效
  };

  // 兜底：组件卸载时必须停表，否则定时器永远空转、闭包里的 setElapsed 变成无效功
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(1)} 秒</p>
      <button onClick={start}>开始</button>
      <button onClick={stop}>暂停</button>
      <button
        onClick={() => {
          stop();
          setElapsed(0);
        }}
      >
        重置
      </button>
    </div>
  );
}
```

什么时候必须用 ref 而不是 effect 局部变量：如果定时器"在 effect 里开、在同一个 effect 的 cleanup 里关"，id 放 effect 局部变量就够了；一旦像上面这样"开始/暂停分属两个事件处理器"，id 必须跨函数共享——这就是 ref 的领地。

**代码示例（`usePrevious` 最小版）**

保存"上一次渲染的值"是 ref 的招牌应用，最小实现只要 6 行（完整讨论与另一种"渲染期比较"写法见本章自定义 Hook 一节的 usePrevious）：

```ts
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value; // 提交之后才更新 → 返回值恰好是"上一次提交"的值
  }); // 故意不写依赖数组：每次提交都要同步
  return ref.current;
}
```

**常见坑**

- 坑 1：改了 `ref.current`，界面纹丝不动。
  - 症状：期待 UI 变化，但没有任何反应。
  - 根因：ref 不是响应式的，这是设计而非 bug。
  - 修法：需要驱动 UI 的数据用 state；若"实例内部状态"（如撤销栈的 canUndo）确实存在 ref 里，就必须在操作后手动触发一次渲染（下一节的 `setVersion` 技巧）。
- 坑 2：渲染函数里读 `ref.current` 得到"上一拍"的值。
  - 症状：显示的计数永远差一拍 / 首帧是 undefined。
  - 根因：渲染期间读 ref 读到的是上次提交的快照。
  - 修法：在 effect/事件里读，或改用 state。
- 坑 3：`useRef(new Something())` 每次渲染都白白 new 一个对象。
  - 根因：`useRef` 的参数**每次渲染都会求值**，只是求值结果被丢弃。
  - 修法：惰性初始化模式，见下一条。

#### 3. 跨渲染保存可变实例

**是什么**

`ref.current` 可以放任意对象：自己写的类实例、`Map`/`Set`、第三方库的控制器。React 完全不干涉它的内容，也**不会在卸载时帮你清理**——清理是 effect cleanup 的责任。

**为什么需要**

类实例天生可变、有内部状态，硬塞进 state 很荒谬：每次变更都得 `new` 一个全新实例副本（昂贵且丢失内部状态）；而有些实例必须"从生到死是同一个"才有意义（订阅器、撤销栈、缓存表）。ref 恰好承诺"整个生命周期同一个容器"，且允许你原地修改。

**怎么做（机制分步）**

1. 声明可空容器：`useRef<SomeClass | null>(null)`；
2. 首渲染惰性初始化：`if (ref.current === null) ref.current = new SomeClass()`——判断写在渲染期是官方认可的例外（仅初始化，无副作用外溢）；
3. 事件/效果中通过 `ref.current` 调用实例方法；
4. 若实例持有外部资源（订阅、observer、网络连接），在 effect cleanup 里显式释放；
5. 若 UI 依赖实例的内部状态（如 `canUndo`），在每次操作后手动 bump 一个 state 触发渲染。

**代码示例（demo：撤销/重做——可变实例与 state 的混合建模）**

```tsx
import { useRef, useState } from 'react';

/** 撤销/重做栈：纯可变实例，不驱动 UI → 放 ref 的标准候补 */
class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];

  /** 记录一次变更：把"变更之前"的值压入历史 */
  record(previous: T): void {
    this.past.push(previous);
    this.future = []; // 新动作会"封死"重做分支（与图形编辑器行为一致）
  }
  /** 撤销：传入当前值（将被记住以便重做），返回要恢复的旧值 */
  undo(current: T): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(current);
    return prev;
  }
  /** 重做：传入当前值，返回要恢复的值 */
  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    return next;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
}

export default function UndoableCounter() {
  const [count, setCount] = useState(0); // 数据本体：驱动 UI → state

  // 惰性初始化：只有首渲染真正 new，之后复用同一个实例
  const historyRef = useRef<HistoryStack<number> | null>(null);
  if (historyRef.current === null) {
    historyRef.current = new HistoryStack<number>();
  }
  const history = historyRef.current;

  // 实例内部状态（canUndo/canRedo）变化不触发渲染 → 用版本号手动"通知"React
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const increment = () => {
    history.record(count); // 先记"变更前"的值
    setCount((c) => c + 1);
    refresh(); // 不 refresh 的话，撤销按钮的 disabled 不会立刻更新
  };

  const undo = () => {
    const prev = history.undo(count);
    if (prev !== null) {
      setCount(prev);
      refresh();
    }
  };

  const redo = () => {
    const next = history.redo(count);
    if (next !== null) {
      setCount(next);
      refresh();
    }
  };

  // version 本身不展示也要"用"一下，避免 TS 报未使用（也可以用它渲染调试信息）
  return (
    <div>
      <h2>{count}</h2>
      <button onClick={increment}>+1</button>
      <button onClick={undo} disabled={!history.canUndo}>
        撤销
      </button>
      <button onClick={redo} disabled={!history.canRedo}>
        重做
      </button>
      <p>渲染版本 v{version}：实例内部状态的变化必须靠它推动</p>
    </div>
  );
}
```

这个 demo 浓缩了"ref 存实例"的全部要点：数据本体（count）在 state、可变附件（历史栈）在 ref、实例内部状态影响 UI 时手动 bump 渲染。

另一个常见形态是用 `Map` 收集列表项 DOM（回调 ref 写法）：

```tsx
import { useRef } from 'react';

interface Item {
  id: number;
  title: string;
}

export default function ItemRegistry({ items }: { items: Item[] }) {
  // 跨渲染保存的 Map：id → 真实 DOM 节点，供"跳转到某项"等命令式操作使用。
  // 用上面坑 3 的惰性初始化模式，而不是 useRef(new Map())——后者每次渲染都白白 new
  const nodeMapRef = useRef<Map<number, HTMLLIElement> | null>(null);
  if (nodeMapRef.current === null) {
    nodeMapRef.current = new Map(); // 只在首次渲染时创建
  }

  const scrollTo = (id: number) => {
    const el = nodeMapRef.current!.get(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div>
      <button onClick={() => scrollTo(items[items.length - 1].id)}>跳到最后一项</button>
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            ref={(el) => {
              // 回调 ref：挂载时 el 是节点，卸载时是 null（见上一节的坑 3）
              if (el) nodeMapRef.current.set(item.id, el);
              else nodeMapRef.current.delete(item.id);
            }}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**常见坑**

- 坑 1：`useRef(new Xxx())` 的隐性浪费。
  - 症状：Profiler 里渲染耗时莫名偏高，或构造函数有副作用（打日志/发请求）被重复执行。
  - 根因：参数每次渲染都求值，只有第一次的结果被保留。
  - 修法：惰性初始化三行套式（`null` 容器 + `if (ref.current === null)` + 赋值）。
- 坑 2：实例在组件卸载后仍然占着外部资源。
  - 症状：反复挂载/卸载组件后，订阅数只增不减、内存上涨。
  - 根因：React 只置空 `ref.current`，不会调用实例的任何销毁方法。
  - 修法：`useEffect(() => () => { instance.dispose(); }, [])`，把释放写进 cleanup。
- 坑 3：按钮状态（disabled 等）依赖实例内部状态但不刷新。
  - 症状：撤销栈明明空了，按钮还能点。
  - 根因：`ref.current` 内部变化不触发渲染。
  - 修法：操作后 `setVersion(v => v + 1)` 强制一次渲染；或者反过来审视设计——如果这个内部状态频繁驱动 UI，也许它该直接用 state 建模。

#### 4. 实战变体：useImperativeHandle——向父组件暴露最小命令式 API

**是什么。** `useImperativeHandle(ref, create, deps)` 用来自定义"父组件通过 ref 拿到的东西"：不传整个 DOM 节点，而是把 `create()` 的返回值写进父组件的 `ref.current`。它是 ref 世界的"接口裁剪器"。

**为什么需要。** 父组件有时必须命令子组件：让视频播放器播放/暂停、让对话框聚焦第一个可交互元素。两条路都有问题：把内部 DOM ref 直接透传给父组件（React 18 需 forwardRef）——父可以随意改子内部 DOM，封装全碎；全靠 props 回调（`onRequestPlay`）——"命令浏览器 API"这种动作被翻译成一堆状态与回调，绕。useImperativeHandle 的定位：**对外只暴露方法（动作），对内保留 DOM 的完全所有权。**

**怎么做（机制分步）。**

1. 子组件定义对外契约类型（只有方法的接口）；
2. 内部照常 `useRef<HTMLXxxElement>(null)` 绑定真实 DOM；
3. `useImperativeHandle(外部ref, () => ({ ...方法 }), deps)` 在提交时把方法表安装到外部 ref 上；
4. 父组件 `ref.current?.方法()` 调用；`current` 在子组件挂载前是 `null`，必须可选链。

**完整代码（React 19 写法：ref 直接作为 prop）。**

```tsx
// VideoPlayer.tsx —— React 19：函数组件的 ref 可以直接作为普通 prop 接收
import { useImperativeHandle, useRef, useState, type Ref } from 'react';

/** 对外契约：父组件只能做这三件事，video 元素的其余 DOM 细节全部封死在内部 */
export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  isPaused: () => boolean; // 方法是"实时读取"，不是缓存的状态快照
}

interface VideoPlayerProps {
  src: string;
  ref?: Ref<VideoPlayerHandle>;
}

export function VideoPlayer({ src, ref }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  // 把"裁剪过的 API"安装到父组件传入的 ref 上
  // 第三个参数 []：API 的形状不随渲染变化，方法内部通过 videoRef 实时取节点
  useImperativeHandle(
    ref,
    () => ({
      play: () => void videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      isPaused: () => videoRef.current?.paused ?? true,
    }),
    []
  );

  return (
    <div>
      <video ref={videoRef} src={src} controls muted={muted} />
      <p>内部状态：{muted ? '静音' : '有声'}（父组件无需感知）</p>
      <button onClick={() => setMuted((m) => !m)}>内部切换静音</button>
    </div>
  );
}
```

React 18 对照写法：组件要用 `forwardRef` 包裹、`ref` 从渲染函数第二个参数取，`useImperativeHandle` 的调用与上面完全一致：

```tsx
// React 18：仅外壳不同——useImperativeHandle(ref, () => ({ play, pause, isPaused }), []) 原样照搬
export const VideoPlayer18 = forwardRef<VideoPlayerHandle, { src: string }>(
  function VideoPlayer18({ src }, ref) { /* ref 交给 useImperativeHandle，内部实现同上 */ }
);
```

父组件使用（TypeScript 会在 `player.current` 上只提示这三个方法）：

```tsx
// CoursePage.tsx
import { useRef } from 'react';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';

export default function CoursePage() {
  const player = useRef<VideoPlayerHandle>(null);
  return (
    <div>
      <button onClick={() => player.current?.play()}>播放</button>
      <button onClick={() => player.current?.pause()}>暂停</button>
      <span>{player.current?.isPaused() ? '已暂停' : '播放中'}</span>
      <VideoPlayer ref={player} src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" />
    </div>
  );
}
```

**关键取舍与坑。** 其一，方法里"要状态的"一律通过 `videoRef.current` 实时读取（如 `isPaused`），不要闭包 state——`deps: []` 的方法表闭住的是首轮 state；确实要暴露可变状态时，要么让方法返回函数实时取值，要么把变化的实现放进 `deps`。其二，父侧调用全部 `?.`：挂载前与条件渲染未出现时 `current` 为 `null`。其三，能用受控 props 表达的就别用命令式接口（`isPlaying` prop + 子组件同步），声明式优先；useImperativeHandle 只留给"浏览器 API 独有的动作"（play/focus/scrollIntoView 这类）。

#### 5. 边界与防御式写法：useClickOutside 与无限滚动（判空、清理、防重复触发）

**场景一：点击外部关闭下拉菜单。** 防御点有三：面板条件渲染未挂载时判空；"点触发按钮"不算外部点击（否则 document 层先关、按钮 click 又开，出现永远关不掉的开关循环）；handler 通常是内联函数，用 ref 镜像取最新实现。

```ts
// useClickOutside.ts
import { useEffect, useRef, type RefObject } from 'react';

/**
 * 指针落在两个区域之外时触发 handler。
 * panelRef：要守住的区域；triggerRef：触发按钮（点它不算 outside，避免"关-开"循环）。
 * 两个参数都是 ref 对象，引用恒定，进依赖无副作用。
 */
export function useClickOutside(
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  handler: () => void
) {
  // 防御三：handler 是内联函数会每次渲染变，镜像最新实现，监听器只挂一次
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return; // 防御一：target 判空
      if (panelRef.current?.contains(target)) return;   // 防御二：面板可能未挂载（current 为 null）
      if (triggerRef.current?.contains(target)) return;  // 点击触发按钮：交给按钮自己的 onClick 处理
      handlerRef.current();
    };
    // pointerdown 早于 mousedown/click：按下即判定，拖拽选择文本不会误触
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [panelRef, triggerRef]);
}
```

配套下拉菜单（开关循环不复现）：

```tsx
import { useRef, useState } from 'react';
import { useClickOutside } from './useClickOutside';

export default function FontMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(panelRef, triggerRef, () => setOpen(false));

  return (
    <div>
      <button ref={triggerRef} onClick={() => setOpen((v) => !v)}>
        字号 {open ? '▲' : '▼'}
      </button>
      {open && (
        <div ref={panelRef} style={{ border: '1px solid #999', padding: 8 }}>
          {['小', '中', '大'].map((s) => <button key={s} onClick={() => setOpen(false)}>{s}</button>)}
        </div>
      )}
    </div>
  );
}
```

**场景二：IntersectionObserver 无限滚动。** 防御点：哨兵未挂载不观察；卸载 `disconnect()`（observer 持有节点引用，不拆就是泄漏）；加载回调走 ref 镜像；用 `rootMargin` 提前 400px 触发预加载；配合调用方的"在飞去重 + 竞态丢弃"。

```ts
// useInfiniteScroll.ts
import { useEffect, useRef, type RefObject } from 'react';

export function useInfiniteScroll(
  sentinelRef: RefObject<HTMLElement | null>,
  loadMore: () => void
) {
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore; // 回调取最新，观察本身只建立一次
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return; // 防御：哨兵是条件渲染的，此刻可能不存在

    const observer = new IntersectionObserver(
      (entries) => {
        // rootMargin 提前 400px：用户滚到之前请求已在路上
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreRef.current();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect(); // 不 disconnect：observer 持有已卸载节点 → 泄漏
  }, [sentinelRef]);
}
```

调用方（在飞去重 + 竞态丢弃，两条防线缺一不可）：

```tsx
import { useEffect, useRef, useState } from 'react';
import { useInfiniteScroll } from './useInfiniteScroll';

interface Row { id: number; title: string; }

export default function Feed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useInfiniteScroll(sentinelRef, () => {
    if (!isFetching) setPage((p) => p + 1); // 防线一：在飞的加载不叠加
  });

  useEffect(() => {
    let ignore = false;
    setIsFetching(true);
    fetch(`/api/feed?page=${page}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((next: Row[]) => {
        if (!ignore) setRows((prev) => [...prev, ...next]);
      })
      .finally(() => {
        if (!ignore) setIsFetching(false);
      });
    return () => {
      ignore = true; // 防线二：快速翻页时丢弃迟到页（useEffect 场景第 3 条的 ignore 标志）
    };
  }, [page]);

  return (
    <div>
      <ul>{rows.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
      {isFetching && <p>加载中…</p>}
      <div ref={sentinelRef} style={{ height: 1 }} /> {/* 哨兵：滚到附近即触发 */}
    </div>
  );
}
```

**两个 Hook 的防御清单（review 时逐项对照）。** 条件渲染的 ref 先判空再访问；观察器/监听器在 cleanup 里 disconnect/remove；回调经 ref 镜像或 useEffectEvent 取最新；触发源做在飞去重；异步结果用 ignore 标志或 AbortController 防竞态；`rootMargin`/触发时机按网络情况调参（400px 是常见起点，慢接口调大）。

#### 6. 高频坑位补遗

**坑 1：同一个事件里"显示并聚焦"无效。**

```tsx
// 复现：点击后输入框出现了，但没有焦点
const [show, setShow] = useState(false);
const inputRef = useRef<HTMLInputElement>(null);

const handleClick = () => {
  setShow(true);
  inputRef.current?.focus(); // 此刻渲染还没发生、DOM 还没创建，current 仍是 null，静默失败
};
```

根因：setState 只调度渲染，同步代码继续跑时新 DOM 尚未提交。修法：把聚焦放进以 show 为依赖的 effect（该次提交之后 DOM 必已存在）：

```tsx
useEffect(() => {
  if (show) inputRef.current?.focus();
}, [show]);
```

"挂载即聚焦"的简单场景也可以用回调 ref：`ref={(el) => el?.focus()}`。

**坑 2：StrictMode 下惰性初始化执行两次。**

```tsx
const connRef = useRef<Connection | null>(null);
if (connRef.current === null) {
  connRef.current = createConnection(roomId); // 开发期双调用渲染：建了两条连接，只用上一条
}
```

根因：严格模式故意双调用渲染函数检验纯度；若构造含副作用（连接、订阅、自增 id），泄漏一半且不可见。修法：构造保持纯（只建对象不碰外部系统），真正的连接放进 effect 的 setup/cleanup 成对逻辑里（双调用会被正确清理）；对照第 3 条 HistoryStack 的做法——纯类，变更只在事件里发生。

**坑 3：ref 当 state 用，界面"时灵时不灵"。**

```tsx
const countRef = useRef(0);
const [text, setText] = useState('');

const inc = () => { countRef.current += 1; }; // 只改 ref，不触发渲染
// 界面上的 {countRef.current} 大多数时候不更新；
// 但某次 setText 引发渲染后它"突然对了"——偶现 bug 与"玄学优化"的温床
```

根因：渲染读取 `ref.current` 读到的是"本次提交时恰好在里面"的值，任何其他 state 引发的渲染都会顺带"刷新"显示，造成随机正确。修法：驱动 UI 的值一律 state；确实存实例内部状态的，操作后统一 bump version（第 3 条模式），把"手动通知"写成固定套式。

**坑 4：卸载后异步回调访问 `ref.current`。**

```tsx
useEffect(() => {
  const t = setTimeout(() => {
    inputRef.current?.focus(); // 3 秒后组件可能早已卸载：React 已把 current 置回 null
  }, 3000);
  // 缺少 cleanup：卸载后回调照样执行
}, []);
```

可选链防住了崩溃，但"默默失败"本身也是 bug（该聚焦的没聚焦、该上报的没上报）。修法：cleanup 清掉定时器，让回调随组件一起消失：`return () => clearTimeout(t);`。

**坑 5：ref 的 TS 类型对不齐。**

```tsx
const elRef = useRef(); // 错误：推断为 undefined，挂到 <div ref={elRef}> 直接编译报错

const nodeRef = useRef<HTMLDivElement>(null);  // RefObject<HTMLDivElement | null>：DOM ref 标准形态
const stateRef = useRef<HTMLDivElement | null>(null); // 可写形态：渲染期之外可以整体赋值
// 传给子组件时对齐：
//   React 19：props 里声明 ref?: Ref<HTMLDivElement>
//   React 18：forwardRef<HTMLDivElement, Props>
//   自定义命令式 API：useRef<VideoPlayerHandle>(null) + 子侧 Ref<VideoPlayerHandle>（第 4 条的标准写法）
```

要点：DOM ref 用 `useRef<T>(null)` 得到只读语义的 `RefObject<T | null>`；需要可写 current 时才用双泛型形态；Handle 类型必须两侧同名对齐，否则父组件的 `player.current` 上没有方法提示。

