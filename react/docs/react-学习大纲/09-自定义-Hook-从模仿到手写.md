---
title: "自定义 Hook（从模仿到手写）"
---

> 本文是《阶段 2：状态与副作用 ⭐核心（2 周）》按小节拆分后的续篇，上一部分见 [08-useMemo-useCallback-memo.md](08-useMemo-useCallback-memo.md)。

### 自定义 Hook（从模仿到手写）

手写以下 Hooks 并写 demo 验证：`useFetch`、`useDebounce`、`useLocalStorage`、`useToggle`、`useWindowSize`、`useClickOutside`、`usePrevious`、`useInterval`

> 建议对照 [ahooks](https://ahooks.js.org/) 源码校对实现。

先把规则立清楚，否则写出来的东西会"看起来是 hook、用起来全是雷"：

- **是什么**：自定义 Hook = 名字以 `use` 开头、内部调用了其他 Hook 的普通函数。它复用的是**状态逻辑**而不是状态本身——每个组件调用它，都会得到一套完全独立的 state/ref 实例。
- **为什么需要**：组件里"三态请求、防抖、持久化、点外关闭"这类**带副作用的状态逻辑**无法用普通函数复用（函数里不能调 Hook），自定义 Hook 是 React 唯一的官方复用单元。
- **两条铁律**：只在函数组件或自定义 Hook 的**顶层**调用（不能放进 if/循环/回调里）；`eslint-plugin-react-hooks` 会强制检查，写的时候不要关掉它。
- **工程纪律**：对外返回的函数/对象必须包 `useCallback`/`useMemo`——上一节刚讲过，调用方的 memo 链条能不能闭合，取决于你吐出去的引用稳不稳定。

下面八个 hook，每个都按"解决什么场景 → 问题复现 → 实现 → 使用 demo → 常见坑"展开。

#### useFetch：把"请求三态 + 竞态取消 + 手动重发"收进一个函数

**解决什么场景**：每个数据页面都要 loading / error / data 三态样板、都要处理快速切换参数时的竞态、都想要一个"重试"按钮——把这些一次性收进 `useFetch(url)`。

**问题复现**（没有它时的日常写法，藏着竞态 bug）：

```tsx
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

// 反例：每个组件抄一遍三态样板，且没有取消逻辑
function UserPage({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then((r) => r.json())
      .then((data: User) => setUser(data)) // 隐患：快速切换 userId 时，慢的旧请求可能后到并覆盖新数据
      .catch((e: Error) => setError(e));
  }, [userId]);
  // ...渲染三态
  return loading ? <p>加载中…</p> : error ? <p>{error.message}</p> : <p>{user?.name}</p>;
}
```

快速点 1 → 2 → 3 切换用户：请求 1 的响应若最晚回来，页面最终显示用户 1——这就是阶段 2 useEffect 场景里点名的"竞态"。另外它还没有 refetch，卸载后 then 里的 `setUser` 也照样执行（React 18 起不再报警告，但纯属无效功）。

**实现**（含竞态取消与 refetch）：

```ts
import { useCallback, useEffect, useState } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** 手动重新请求（引用永远稳定，可直接传给 memo 子组件） */
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // tick 变化 → 依赖数组变化 → effect 重跑，这就是"手动重发"的全部机关
  const [tick, setTick] = useState(0);
  // useCallback + 空依赖：refetch 引用永远稳定（对上一节 memo 链条的交代）
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController(); // 每轮请求一个独立的取消器
    let outdated = false; // 双保险：即使忘了 abort，过期响应也不许落地

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`); // fetch 对 404/500 不 reject，必须手动抛
        return (await res.json()) as T;
      })
      .then((json) => {
        if (outdated) return; // 已被下一轮请求取代：丢弃
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        // 主动取消（url 变了/卸载了/refetch 了）不是错误，静默返回
        if (err instanceof Error && err.name === 'AbortError') return;
        if (outdated) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      outdated = true; // 先立"过期"标志，再掐请求
      controller.abort(); // url/tick 变化或组件卸载时触发
    };
  }, [url, tick]);

  return { data, loading, error, refetch };
}
```

机制分步：url 或 tick 变化 → 旧 effect 先跑 cleanup（旧请求被 abort、旧响应即使到达也被 `outdated` 拦截）→ 新 effect 发起请求 → 三态更新。两条防线（AbortController 与 outdated 标志）各司其职：前者真正省流量，后者兜住"来不及取消就已经 resolve"的窗口。

**使用 demo**：

```tsx
import { useState } from 'react';
import { useFetch } from './useFetch';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function UserCard() {
  const [userId, setUserId] = useState(1);
  const { data, loading, error, refetch } = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
  );

  return (
    <div>
      {[1, 2, 3, 4].map((id) => (
        <button key={id} onClick={() => setUserId(id)}>
          用户 {id}
        </button>
      ))}
      <button onClick={refetch}>重新请求</button>
      {loading && <p>加载中…</p>}
      {error && <p>出错了：{error.message}</p>}
      {data && (
        <p>
          {data.name}（{data.email}）
        </p>
      )}
    </div>
  );
}
```

**常见坑**：

- 坑 1：竞态复现——快速点按钮时数据闪回旧用户。
  - 症状：明明选了用户 3，页面先显示 3 又跳回 1。
  - 根因：没有取消机制，慢的旧响应后到覆盖新响应。
  - 修法：cleanup 里 `abort()` + `outdated` 标志（本实现已内置）。
- 坑 2：HTTP 404/500 进了"成功"分支。
  - 症状：`data` 是 undefined 或报 JSON 解析错。
  - 根因：fetch 只在网络层失败时 reject，HTTP 错误码仍算 resolve。
  - 修法：`if (!res.ok) throw new Error(...)`（实现里的关键行）。
- 坑 3：refetch 每次渲染都是新函数，拖垮调用方的 memo。
  - 根因：直接暴露 `() => setTick(...)`。
  - 修法：`useCallback` 包住（对比：不包的话调用方必须自己再包一层）。

**对照 ahooks**：看 [ahooks](https://ahooks.js.org/) 的 `useRequest`——它是 useFetch 的超集：缓存、轮询、防抖节流、重试、分页都做成挂在请求生命周期上的插件；重点看它如何组织"插件接口"与卸载时的统一清理，这是从"能用"到"库级"的分水岭。手写版阶段 4.2 还会升级一次。

#### useDebounce：给"值"装一个延迟稳定器

**解决什么场景**：搜索框每敲一个字符就触发一次请求/过滤，需要"停止输入 N 毫秒后才算输入结束"。

**问题复现**：

```tsx
import { useEffect, useState } from 'react';

function SearchRaw() {
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    if (keyword) console.log('发起搜索：', keyword); // 输入 "react" 会打 5 次请求：r / re / rea / reac / react
  }, [keyword]);
  return <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />;
}
```

**实现**（值防抖——注意 cleanup 是正确性的核心）：

```ts
import { useEffect, useState } from 'react';

/**
 * 返回 value 的"防抖版"：value 停止变化 delay 毫秒后，返回值才跟上
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value); // 初始与源值同步，首渲染不延迟

  useEffect(() => {
    // 每轮 effect：设置一个"到点才生效"的定时器
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delay);
    // cleanup：value 或 delay 变化、以及组件卸载时，撤销上一个还没到点的定时器
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

**cleanup 的作用（必须讲透）**。effect 的执行顺序是：依赖变化 → 先执行**上一轮** effect 返回的 cleanup → 再执行本轮 effect。于是时间线变成：

```text
输入序列（间隔约 80ms）：r → e → a

t=0    value="r"   effect#1: setTimer(A, 300)
t=80   value="re"  先跑 effect#1 的 cleanup → clearTimeout(A)   ← A 永远不会到点
                   再跑 effect#2: setTimer(B, 300)
t=160  value="rea" cleanup#2 → clearTimeout(B)；effect#3: setTimer(C, 300)
t=460  C 到点 → setDebounced("rea")   ← 只有最后一次输入存活下来

若删掉 cleanup：A 在 t=300、B 在 t=380、C 在 t=460 依次触发
→ setDebounced 连打三次 → 下游请求照样打三次，防抖完全失效
```

结论：**cleanup 同时服务两条路径**——依赖变化时"撤销上一轮副作用"（防抖的核心），卸载时"撤销最后一轮副作用"（setDebounced 不再作用于已卸载组件）。防抖、节流、订阅、动画，全都靠这套"先收尾再开工"的机制才写得对。

**使用 demo**：

```tsx
import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

export default function SearchDemo() {
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 400); // 停顿 400ms 才更新

  useEffect(() => {
    if (!debounced) return;
    console.log('发起搜索：', debounced); // 连续输入只打印最后一次
    // 实战接法：const { data } = useFetch(`/api/search?q=${encodeURIComponent(debounced)}`)
    // useFetch 以 debounced 拼进 url → url 变化即 abort 旧请求，防抖与竞态取消无缝衔接
  }, [debounced]);

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索…" />
      <p>原始值：{keyword}</p>
      <p>防抖值（下游只认它）：{debounced}</p>
    </div>
  );
}
```

**常见坑**：

- 坑 1：防抖了，请求还是发了一串。
  - 症状：网络面板里仍能看到 r/re/rea 各一条。
  - 根因：下游 effect 依赖了**原始 keyword** 而不是 debounced；或者同时依赖了两者。
  - 修法：下游只订阅防抖值，让原始值只服务于受控输入框。
- 坑 2：最后一击丢失。
  - 症状：输入完立刻点"提交"，提交里读到的关键词是旧的。
  - 根因：最后一次输入的定时器还没到点。
  - 修法：提交动作直接用原始值，防抖值只用于"自动触发"类副作用。
- 坑 3：卸载后 setState。
  - 症状：离开页面瞬间输入，控制台提示对已卸载组件更新（取决于版本）。
  - 根因：没写 cleanup，最后一个定时器存活到到点。
  - 修法：cleanup 清理（本实现已内置）。

**对照 ahooks**：看 ahooks 的 `useDebounceFn`（函数防抖，基于 `useMemoizedFn` 与 debounce 库封装）与值版本 `useDebounce` 如何组合复用；再关注它额外的立即执行（leading）等配置。

#### useLocalStorage：把本地存储变成"响应式状态"

**解决什么场景**：让 `localStorage` 像 `useState` 一样用——读的时候容错、写的时候自动序列化、其他标签页改动时自动同步。

**为什么需要**：裸用 localStorage 的正确姿势太啰嗦：JSON 序列化/反序列化、SSR 环境没有 window、用户手改过的脏数据会让 JSON.parse 抛错、跨 tab 同步要监听 storage 事件——每一处都写一遍是灾难。

**实现**：

```ts
import { useCallback, useEffect, useState } from 'react';

/** 读：SSR 守卫 + JSON 容错 + null 兜底，任何异常都回退到默认值 */
function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback; // SSR / SSG 构建期没有 window
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T); // 没存过 → 默认值
  } catch {
    return fallback; // 脏数据（手动改坏）/ 隐私模式 / 超配额 → 容错回退
  }
}

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (next: T | ((prev: T) => T)) => void;
  remove: () => void;
}

const LOCAL_CHANGE_PREFIX = 'useLocalStorage:change:'; // 自定义事件前缀（见下文同页同步）

export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageResult<T> {
  // 惰性初始化：只在首渲染读一次磁盘，之后全走内存 state
  const [value, setValueState] = useState<T>(() => readFromStorage(key, initialValue));

  const write = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next)); // 写盘
      } catch {
        // 写失败（隐私模式/超配额）不阻断内存状态更新，功能降级但不崩
      }
      // storage 事件只在"其他文档"触发，本页的其他组件听不到
      // → 手动 dispatch 一个自定义事件，实现同页多实例同步
      window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_PREFIX + key, { detail: key }));
    },
    [key],
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved = next instanceof Function ? next(prev) : next; // 支持函数式更新
        write(resolved);
        return resolved;
      });
    },
    [write],
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 同上，写类操作都可能被浏览器策略拦下
    }
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_PREFIX + key, { detail: key }));
    setValueState(initialValue);
  }, [key, initialValue]);

  // 订阅两类"外部变更"：跨标签页（原生 storage）+ 同页其他实例（自定义事件）
  useEffect(() => {
    const syncFromStorage = () => setValueState(readFromStorage(key, initialValue));

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) syncFromStorage(); // 其他标签页改了这个 key
    };
    const onLocalChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail === key) syncFromStorage(); // 本页其他实例改的
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_CHANGE_PREFIX + key, onLocalChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_CHANGE_PREFIX + key, onLocalChange);
    };
  }, [key, initialValue]);

  return { value, setValue, remove };
}
```

机制分步：读（惰性 + 三重容错）→ 写（state 与磁盘同步更新，再广播）→ 听（storage 跨 tab + CustomEvent 同页）。注意 `storage` 事件的浏览器约定：**只有其他文档的修改才会触发**，本页 `setItem` 不触发——所以同页同步必须自己造事件，这是本 hook 最容易漏的一块。

**使用 demo**（主题偏好持久化）：

```tsx
import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark';

export default function ThemeDemo() {
  const { value: theme, setValue: setTheme } = useLocalStorage<Theme>('app-theme', 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme; // 挂到根节点配合 CSS 变量
  }, [theme]);

  return (
    <div>
      <p>当前主题：{theme}</p>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>切换主题</button>
    </div>
  );
}
```

再开一个浏览器标签页访问同页面、切一次主题，两个页面会同时变化——storage 事件在起作用。

**常见坑**：

- 坑 1：SSR / Next.js 水合报 mismatch。
  - 症状：Hydration failed / 服务端 HTML 与客户端首渲染不一致。
  - 根因：服务端没有 window（返回 fallback），客户端首渲染直接读到 localStorage 真值，两端产出不同 HTML。
  - 修法：改成"两端首渲染都用 fallback，挂载后再读"：

```ts
import { useEffect, useState } from 'react';

export function useLocalStorageCSR<T>(key: string, fallback: T) {
  // 首渲染两端都用 fallback → HTML 必然一致
  const [value, setValueState] = useState<T>(fallback);
  useEffect(() => {
    setValueState(readFromStorage(key, fallback)); // 挂载后（仅客户端）读真值，多付一次渲染
  }, [key, fallback]); // 注意 fallback 必须是模块级常量或 memo 过的稳定引用，否则每次渲染都会重读覆盖
  // ...写与订阅逻辑与上面一致
  return [value, setValueState] as const;
}
```

- 坑 2：同页两个组件共用一个 key，互不同步。
  - 根因：storage 事件不触发本页文档。
  - 修法：本实现的 CustomEvent 广播；更系统的做法见下一条 ahooks 提示。
- 坑 3：存对象后页面白屏。
  - 症状：JSON.parse 抛 "Unexpected token"。
  - 根因：用户/旧版本代码写入了非 JSON 字符串。
  - 修法：readFromStorage 的 try/catch 回退默认值（已内置）。

**对照 ahooks**：看 `useLocalStorageState` 如何用 `useSyncExternalStore` 把 localStorage 桥接进 React（getSnapshot / getServerSnapshot / subscribe 三件套，天然解决同页多实例与 SSR），以及它开放的 `serializer/deserializer` 配置位。

#### useToggle：布尔开关的最小抽象

**解决什么场景**：Modal / 下拉 / 抽屉的开关逻辑——`setOpen(!open)` 到处写，还想要"直接设为某值 / 按前值计算"两种升级形态。

**实现**（支持 next 值与切换函数）：

```ts
import { useCallback, useState } from 'react';

export interface UseToggleResult<T> {
  state: T;
  /** 无参调用：布尔值取反；传值：直接设置；传函数：按前值计算 */
  toggle: (next?: T | ((prev: T) => T)) => void;
  /** 无脑设置（写起来比 toggle(值) 语义更直白时用） */
  set: (value: T) => void;
}

export function useToggle<T = boolean>(defaultValue: T = false as T): UseToggleResult<T> {
  const [state, setState] = useState<T>(defaultValue);

  const toggle = useCallback((next?: T | ((prev: T) => T)) => {
    setState((prev) => {
      if (typeof next === 'function') {
        // 形态三：函数式更新——prev 是最新的，天然免疫闭包陷阱，可表达三态循环等任意规则
        return (next as (p: T) => T)(prev);
      }
      if (next !== undefined) {
        // 形态二：显式目标值
        return next;
      }
      // 形态一：无参取反——只在值真的是布尔时有意义
      // 若 T 不是布尔（比如三态字符串），无参调用视为空操作，静默返回原值
      return typeof prev === 'boolean' ? ((prev as boolean) ? (false as T) : (true as T)) : prev;
    });
  }, []);

  const set = useCallback((value: T) => setState(value), []);

  // 返回对象：字段语义自解释；用 as const 需返回数组时再换
  return { state, toggle, set };
}
```

注意设计取舍：`toggle` 的三种形态对应三类真实用法——开关灯（无参）、点击遮罩强制关闭（传值）、"三态循环"（传函数，因为下一个状态依赖前一个状态，函数式更新避免读到旧值）。

**使用 demo**：

```tsx
import { useToggle } from './useToggle';

type Theme = 'light' | 'dark' | 'system';

export default function ToggleDemos() {
  // 用法 1：布尔开关（Modal）
  const modal = useToggle(false);
  // 用法 2：三态循环（主题：light → dark → system → light）
  const theme = useToggle<Theme>('light');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <button onClick={() => modal.toggle()}>打开弹窗（无参取反）</button>
        {modal.state && (
          <div
            role="dialog"
            style={{ padding: 24, border: '1px solid #888' }}
            onClick={() => modal.toggle(false)} /* 点遮罩：显式关闭（传值形态） */
          >
            <p>弹窗内容</p>
            <button onClick={(e) => e.stopPropagation()}>停在我身上点不会关（阻止冒泡）</button>
          </div>
        )}
      </div>

      <button
        onClick={() =>
          theme.toggle((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'))
        }
      >
        当前主题：{theme.state}（点我循环切换）
      </button>
    </div>
  );
}
```

**常见坑**：

- 坑 1：非布尔类型上无参调用没反应。
  - 症状：`theme.toggle()` 毫无变化、也不报错。
  - 根因：本实现把无参语义定义为"仅布尔可取反"，其他类型静默返回原值。
  - 修法：非布尔场景必须传值或传函数；开发期也可以选择在无参 + 非布尔时 `console.warn` 暴露误用。
- 坑 2：连续两次 toggle 只生效一次。
  - 症状：`toggle(); toggle();` 期望还原，结果没变。
  - 根因：这不是本 hook 的问题——两次 `setState(false)` 式调用会被批处理合并；若写成 `toggle(state)` 读外部变量，则读到同一个旧值。
  - 修法：凡"基于当前值"的更新都走函数形态 `toggle((v) => !v)`，或依赖无参取反（内部本就是函数式更新）。

**对照 ahooks**：看 `useToggle`——纯 boolean 版本，提供 `toggle() / set(state) / setLeft() / setRight()` 四个方法；体会"小 hook 也把 API 语义拆细"的设计品味。

#### useWindowSize：把视口尺寸变成响应式状态

**解决什么场景**：JS 里要根据视口宽度切换布局分支（移动/桌面）、把画布铺满可视区——需要把 `window.innerWidth/innerHeight` 变成响应式状态。

**为什么需要**：纯 CSS media query 覆盖不了"JS 逻辑分支"（比如移动端渲染另一套组件树）；而 resize 事件一秒能触发几十次，无脑 setState 会让整棵树跟着高频重渲染——所以提供"即时/防抖"两种模式，默认建议防抖。

**实现**（防抖/即时两种 + SSR 守卫）：

```ts
import { useEffect, useState } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * SSR 守卫哨兵值：服务端没有 window，用 Infinity 而不是 0——
 * 0 会被断点逻辑误判为"移动端"，Infinity 则落在最大断点，避免错误布局闪现
 * （这也是 ahooks useWindowSize 采用的约定值）
 */
const SERVER_SIZE: WindowSize = { width: Infinity, height: Infinity };

function getSize(): WindowSize {
  if (typeof window === 'undefined') return SERVER_SIZE;
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * @param debounceMs 0 = 即时模式（每次 resize 立刻更新）；>0 = 防抖模式
 */
export function useWindowSize(debounceMs = 0): WindowSize {
  // 初始化同样要守卫：SSR 首渲染走 getSize 的 SERVER_SIZE 分支
  const [size, setSize] = useState<WindowSize>(getSize);

  useEffect(() => {
    if (debounceMs <= 0) {
      // 即时模式：布局强一致场景（画布、拖拽辅助线），代价是拖拽窗口期间连续渲染
      const onResize = () => setSize(getSize());
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    // 防抖模式：拖拽停顿 debounceMs 毫秒才更新一次（与 useDebounce 的 cleanup 机制同理）
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSize(getSize()), debounceMs);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer); // 卸载时清掉挂着的定时器
      window.removeEventListener('resize', onResize);
    };
  }, [debounceMs]); // delay 变化会重绑监听（数字是原始类型，引用稳定，通常不会无谓触发）

  return size;
}
```

**使用 demo**：

```tsx
import { useWindowSize } from './useWindowSize';

export default function ResponsiveDemo() {
  const size = useWindowSize(200); // 防抖 200ms：拖拽结束才更新
  const isMobile = size.width < 768;

  return (
    <div>
      <p>
        视口：
        {Number.isFinite(size.width) ? `${size.width} × ${size.height}` : 'SSR 环境（哨兵值）'}
      </p>
      {/* JS 逻辑分支：CSS media query 做不到"渲染另一套组件" */}
      {isMobile ? <nav>移动端：底部 Tab</nav> : <nav>桌面端：侧边栏</nav>}
    </div>
  );
}
```

**常见坑**：

- 坑 1：SSR 水合后布局"闪一下"。
  - 症状：服务端渲染的桌面布局，客户端水合后变成移动布局。
  - 根因：两端首渲染值不同（Infinity vs 真实宽度）→ 这本质是"视口是客户端才有的状态"，与 useLocalStorage 的水合坑同源。
  - 修法：首渲染统一用哨兵/固定值渲染一个中性态，挂载后再切换；纯视觉差异优先交给 CSS media query。
- 坑 2：移动端地址栏伸缩导致高度抖动。
  - 症状：滚动时页面布局频繁重排。
  - 根因：移动浏览器滚动时 URL 栏收起会触发 resize，innerHeight 变化。
  - 修法：高度分支尽量用 CSS（`100dvh` 等），JS 只依赖宽度；确需精确视口可关注 `visualViewport` API。
- 坑 3：监听器泄漏。
  - 根因：effect 里 addEventListener 但 cleanup 忘了 remove。
  - 修法：永远成对出现（本实现的两个 return）。

**对照 ahooks**：看 `useWindowSize` 的 SSR 哨兵值处理与基于 `useEventListener` / `useSyncExternalStore` 的组合实现——多个小 hook 组装成稍大 hook 的典型范例。

#### useClickOutside：弹层的"点外面关闭"

**解决什么场景**：下拉菜单、浮层、行内编辑器打开后，点击"外部区域"应关闭——但"外部"必须先定义清楚（触发按钮算内部还是外部？）。

**mousedown vs click 怎么选**：

- `mousedown`：按下瞬间就触发。体验上"点到即关"没有迟滞；不受"按下后在弹层内拖出去松开"这类怪异交互影响；文本选择、拖拽场景配合更好。
- `click`：完整的一次"按下+抬起"才触发，与用户对"点击"的心智更一致；但按下弹层外、松开在别处时 click 目标是共同祖先，判断会变得微妙。
- 经验默认 `mousedown`；若产品语义是"完成一次点击才算"（如某些菜单约定），换 `click`。键盘可达性还要配 ESC 关闭与焦点管理（阶段 4.5 弹层体系展开）。

**实现**（支持 ref 数组）：

```ts
import { useEffect, useRef, type RefObject } from 'react';

export type ClickOutsideTarget = RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>;

function toRefArray(target: ClickOutsideTarget): Array<RefObject<HTMLElement | null>> {
  return Array.isArray(target) ? target : [target]; // 单 ref 与数组统一处理
}

/**
 * @param target  一个 ref 或 ref 数组——数组里所有元素围成的区域都算"内部"
 * @param handler 判定为"点在外面"时的回调
 * @param eventName 用 mousedown 还是 click（默认 mousedown，理由见上文）
 */
export function useClickOutside(
  target: ClickOutsideTarget,
  handler: (event: MouseEvent) => void,
  eventName: 'mousedown' | 'click' = 'mousedown',
): void {
  // Dan 模式提前登场：ref 保存最新回调，避免"handler 引用不稳定导致反复解绑重绑"
  // 也让调用方可以放心传内联函数（与 useInterval 的原理完全一致）
  const savedHandler = useRef(handler);
  useEffect(() => {
    savedHandler.current = handler;
  });

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const refs = toRefArray(target);
      // contains 走真实 DOM 层级：只要点击落点在任一"内部"元素里，就不算外部
      const clickedInside = refs.some((ref) => ref.current?.contains(event.target as Node));
      if (!clickedInside) {
        savedHandler.current(event); // 到点才执行"最新的"回调
      }
    };
    document.addEventListener(eventName, listener);
    return () => document.removeEventListener(eventName, listener); // 卸载/参数变化时解绑
  }, [target, eventName]); // 故意不含 handler：回调更新不需要重绑全局监听
}
```

为什么需要 ref 数组：下拉 = 触发按钮 + 弹出菜单两块 DOM。若只把菜单算"内部"，点按钮切换时这次点击会立刻被判定为"外部"把菜单关掉——菜单闪开闪关。把两个 ref 都放进数组即可。另外 `contains` 走的是**真实 DOM 层级**，所以菜单即使通过 `createPortal` 渲染到 `document.body`，ref 指向的仍是那个真实节点，判断不受 React 组件树结构影响。

**使用 demo**：

```tsx
import { useRef, useState } from 'react';
import { useClickOutside } from './useClickOutside';

export default function DropdownDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // 按钮和菜单都算"内部"：必须传数组（只传 menuRef 试试，点按钮会闪关）
  useClickOutside([buttonRef, menuRef], () => setOpen(false));

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={buttonRef} onClick={() => setOpen((o) => !o)}>
        选择动作
      </button>
      {open && (
        <ul
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            margin: 0,
            padding: '8px 16px',
            listStyle: 'none',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          {['复制', '移动', '删除'].map((action) => (
            <li key={action} onClick={() => setOpen(false)}>
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**常见坑**：

- 坑 1：点按钮打开菜单，菜单立刻又关了。
  - 症状：click 先开又瞬间关（闪烁）。
  - 根因：按钮不在"内部"集合里，mousedown 被判为外部 → 关闭回调与打开 setState 在同一次点击里竞争。
  - 修法：target 传 `[buttonRef, menuRef]`。
- 坑 2：内联 handler 导致监听反复解绑重绑。
  - 根因：把 handler 放进依赖数组，而内联函数每次渲染都是新引用（正是 memo 一节讲过的引用相等性问题）。
  - 修法：内部 savedHandler 模式（本实现），或调用方自行 useCallback。
- 坑 3：portal 弹层"点外面关不掉/误关"。
  - 症状：渲染到 body 的 Modal 上的点击也被判为外部。
  - 根因：只把触发器算内部、忘了把 portal 内容的 ref 也加入数组。
  - 修法：portal 不影响 contains 判断（它判断真实 DOM），把弹层 ref 一并传入即可。

**对照 ahooks**：看 `useClickOutside` 如何基于 `useEventListener` 实现（SSR 守卫、target 支持 ref/元素/函数等多种形态），事件名参数化与本文一致。

#### usePrevious：拿到"上一次渲染的值"

**解决什么场景**：展示变化方向（价格涨/跌、数值升降箭头）、对比前后两次输入——React 只给你"当前值"，"上一次"需要自己保存。

**实现一（ref 版：提交后更新，也就是 useRef 一节里的 6 行）**：

```ts
import { useEffect, useRef } from 'react';

export function usePreviousRef<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value; // effect 在"提交之后"执行 → 渲染期间读 ref.current 拿到的恰是上一轮的值
  });
  return ref.current;
}
```

原理：渲染第 N 轮时，第 N 轮的 effect 还没跑，`ref.current` 里存的是第 N-1 轮提交时写入的值——"晚一拍"从缺陷变成了特性。

**实现二（函数式更新内比较的经典写法：渲染期间调整 state）**：

```ts
import { useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  // 元组：[当前已确认的值, 它的上一个值]
  const [tuple, setTuple] = useState<[T, T | undefined]>([value, undefined]);

  // 渲染期间比较"本轮要渲染的值"与"已确认的值"：
  // 不相等 → 排队一次 setState，把 [新值, 旧确认值] 存好
  // React 会丢弃本轮渲染输出并用新 state 立即重渲一次（不会两棵子树都提交，也不会无限循环——
  // 因为第二轮比较时两者已相等，条件不再成立）
  if (tuple[0] !== value) {
    setTuple([value, tuple[0]]);
  }

  return tuple[1];
}
```

两版怎么选：ref 版简单，但它的返回值本质是"渲染期间读 ref"——在 effect / 事件处理器里用没有问题；如果返回值要**直接参与 JSX 计算**（涨跌颜色），React 官方文档推荐 setState 版（"渲染期间调整 state"是被官方认可的模式，而不是反模式），它保证渲染纯度：同样的输入在两次渲染中产出同样的结果。注意渲染期间 setState 的两条纪律：条件必须能收敛（否则死循环）；只允许更新**当前组件**的 state。

**使用 demo**：

```tsx
import { useState } from 'react';
import { usePrevious } from './usePrevious';

export default function PriceTicker() {
  const [price, setPrice] = useState(100);
  const prevPrice = usePrevious(price); // 首渲染是 undefined（没有"上一次"）

  const direction =
    prevPrice === undefined || price === prevPrice
      ? 'flat'
      : price > prevPrice
        ? 'up'
        : 'down';

  return (
    <div>
      <p style={{ color: direction === 'up' ? 'green' : direction === 'down' ? 'red' : 'inherit' }}>
        当前价格：{price}
        {direction === 'up' && '（涨）'}
        {direction === 'down' && '（跌）'}
      </p>
      <button onClick={() => setPrice((p) => Math.max(1, p + Math.round(Math.random() * 10 - 5)))}>
        模拟下一笔成交
      </button>
    </div>
  );
}
```

**常见坑**：

- 坑 1：首渲染拿到 undefined 直接参与计算。
  - 症状：`prevPrice.toFixed is not a function`。
  - 根因：第一次渲染没有"上一次"。
  - 修法：`prevPrice === undefined` 显式分支（demo 的写法）。
- 坑 2：ref 版返回值用于渲染，StrictMode 下行为差异引发困惑。
  - 症状：StrictMode 双渲染时两次输出一致（effect 未跑），但开发者误以为"每次渲染都该更新"。
  - 根因：ref 版语义就是"上次提交的值"，渲染期读 ref 不参与 React 的纯度保证。
  - 修法：渲染期依赖旧值就换 setState 版。
- 坑 3：期望"比较的是深层相等"。
  - 症状：对象每次都是新引用，`!==` 恒成立。
  - 根因：两版都用引用/浅层比较。
  - 修法：传入原始值或稳定化的引用（useMemo），深层比较自己按字段写。

**对照 ahooks**：看 `usePrevious` 的 ref + useEffect 实现（与实现一逐行同构），确认手写版与库一致。

#### useInterval：把 setInterval 变成声明式 Hook（闭包陷阱的标准解法案例）

**解决什么场景**：既要求**回调里永远读到最新的 state/props**，又要求 **delay 可以动态调整**——两个再朴素不过的需求，直接 `setInterval` 一个都做不到。这是 Dan Abramov 的经典案例（overreacted.io 的《Making setInterval Declarative with React Hooks》），必须讲透。

**问题复现**（错误写法一：空依赖 → 旧闭包）：

```tsx
import { useEffect, useState } from 'react';

export default function CounterBroken() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount(count + 1); // count 是"第一次渲染"的 0，永远停在 0
    }, 1000);
    return () => window.clearInterval(id);
  }, []); // 空依赖：effect 只跑一次，定时器里的闭包被冻结在第一帧

  return <h1>{count}</h1>; // 现象：永远显示 1，再也不涨
}
```

这就是上一节闭包陷阱专题的定时器版：effect 捕获的是**第一帧的 count**，每秒执行 `setCount(0 + 1)`。

两种"看起来能修"的朴素解法，各有局限：

- 解法 A：函数式更新 `setCount((c) => c + 1)` 能修这个**特例**——因为它不再依赖闭包里的 count。但回调一旦要做更复杂的事（读 props、调接口、连续操作多个 state），函数式更新就不够用了，总不能所有状态都塞进一个函数式更新。
- 解法 B：把 count 加进依赖数组。功能上"数字会动"，但每秒渲染一次 → 每秒 clear + set 一次定时器：**"每 1000ms 一拍"的节拍被不断重置**（变成"渲染后 1000ms"），依赖一多就变成"任何 state 变化都重置时钟"，高频时抖动明显；语义完全跑偏——回调变化 ≠ 频率变化。

**Dan 版完整实现**：

```ts
import { useEffect, useRef } from 'react';

/**
 * 声明式的 setInterval：
 * - 回调每次渲染更新，定时器到点执行的永远是"最新"的回调（解决旧闭包）
 * - delay 变化才重建定时器；传 null 表示暂停（解决动态频率）
 */
export function useInterval(callback: () => void, delay: number | null): void {
  // 通道一：保存"最新回调"的容器
  const savedCallback = useRef(callback);

  // 1️⃣ 每次渲染提交后，把最新的回调塞进 ref——回调再怎么变都追得上
  useEffect(() => {
    savedCallback.current = callback;
  });

  // 2️⃣ 定时器的生命周期只由 delay 决定：频率没变就不重建
  useEffect(() => {
    if (delay === null) return; // null = 暂停（不设定时器，已有的被 cleanup 清掉）

    const id = window.setInterval(() => {
      // 3️⃣ 到点执行的是 ref 里的"最新回调"，而不是 effect 创建时捕获的那个闭包
      savedCallback.current();
    }, delay);

    return () => window.clearInterval(id); // delay 变化或卸载时重建/清理
  }, [delay]);
}
```

**两步分别解决什么**（这个拆分是整个案例的灵魂）：

```text
直接 setInterval(fn, delay)：fn 是第一帧的闭包 → 永远读旧 state（错误写法一）
把 fn 挂进依赖：每次渲染 clear+set → 节拍被不断重置（错误写法二）

Dan 版把两件事拆成互不干扰的两条通道：
  通道一（回调新鲜度）：每次提交后 savedCallback.current = callback   → 修"旧闭包"
  通道二（定时器生命周期）：useEffect(..., [delay])                   → 修"动态频率"
回调变化 → 只走通道一（换回调，不动定时器）
频率变化 → 只走通道二（clear+set，重建定时器）
```

`savedCallback.current()` 之所以拿到的是新值：调用发生在**未来的某次 tick**，而每次渲染提交后 ref 都被刷新——执行时经由 ref 这个"中转站"，绕开了 effect 闭包的冻结。这正是"闭包陷阱的 ref 解法"的标准化形态，与 useRef 一节、useClickOutside 的 savedHandler 是同一个模式。

**使用 demo**（计数 + 滑块动态调频 + 暂停）：

```tsx
import { useState } from 'react';
import { useInterval } from './useInterval';

export default function DynamicTimer() {
  const [count, setCount] = useState(0);
  const [delay, setDelay] = useState(1000);
  const [running, setRunning] = useState(true);

  // 注意：这里的回调每次渲染都是新函数、且直接读 count——
  // 在 Dan 版 useInterval 里这完全没问题，内部 ref 会一直追最新闭包
  useInterval(() => {
    setCount(count + 1); // 直接读 state：不再是旧值（对比错误写法一）
  }, running ? delay : null); // 暂停 = 传 null，而不是条件渲染组件

  return (
    <div>
      <h2>计数：{count}</h2>
      <label>
        间隔：{delay}ms
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))} // 拖动滑块：定时器按需重建
        />
      </label>
      <button onClick={() => setRunning((r) => !r)}>{running ? '暂停' : '继续'}</button>
    </div>
  );
}
```

验证要点：拖滑块时计数节奏实时变化（通道二生效）；暂停/继续无损（null 分支 + cleanup）；回调里写 `count + 1` 或 `setCount((c) => c + 1)` 结果一致（旧闭包已不存在）。

**常见坑**：

- 坑 1：StrictMode 下"定时器跑了两份"。
  - 症状：开发模式日志/请求双份。
  - 根因：React 18/19 的 StrictMode 会挂载→卸载→再挂载 effect 来暴露缺失的清理，定时器被建两次；cleanup 保证最终只有一份存活。
  - 修法：无需修——这正是 cleanup 的价值；测试观察日志时知道这个现象即可。
- 坑 2：delay 传 `undefined` 与 `null` 行为不同。
  - 症状：期望暂停却跑了。
  - 根因：本实现只把 `null` 当暂停；`undefined` 传给 setInterval 会被浏览器当 0（立即、逐帧触发）。
  - 修法：类型上只收 `number | null`（TS 已拦截），运行时来自接口的话先归一化。
- 坑 3：回调里发请求但没处理竞态。
  - 根因：轮询场景回调每次都 fetch，慢响应可能乱序覆盖。
  - 修法：回调内用本节 useFetch（url 不变 + refetch），或自己加 AbortController。

**对照 ahooks**：看 `useInterval` 在 Dan 版之上补的 `immediate`（首次立即执行）配置，以及它如何统一处理 delay 为负数等边界。

#### 八个 hook 的公共收束

回看会发现两个反复出现的模式：**cleanup 先于下一轮执行**（useFetch 的 abort、useDebounce 的 clearTimeout、useWindowSize 的解绑）和 **ref 保存最新回调**（useClickOutside 的 savedHandler、useInterval 的 savedCallback）。把这两个模式练到肌肉记忆，绝大多数自定义 Hook 都能自己推导出来。

#### 补充：手写 useEvent——把"最新回调"模式收编成通用 Hook

**解决什么场景**：前文的 useClickOutside、useInterval 在**内部**各自维护了 savedHandler / savedCallback，能力是私有的。调用方经常需要这份能力的"外销版"：一个**引用永远稳定、执行时却总是最新实现**的函数。两类高频需求：

- 把回调传给 memo 子组件：`useCallback` 的依赖一变引用就变，子组件白 memo（引用稳定性的机制见 [08-useMemo-useCallback-memo.md](08-useMemo-useCallback-memo.md)）；
- 把回调交给 React 之外的长寿对象（WebSocket、地图 SDK、图表实例、事件总线）：它们通常只在初始化时收一次回调，之后引用再变它们也无感——闭包从此冻结在注册那一刻。

**反例一（useCallback 救不了）**：

```tsx
import { memo, useCallback, useState } from 'react';

const LogPanel = memo(function LogPanel({ onPick }: { onPick: (id: number) => void }) {
  console.log('LogPanel 渲染（昂贵子树）');
  return <button onClick={() => onPick(42)}>选中 42</button>;
});

export default function Parent() {
  const [keyword, setKeyword] = useState('');
  // 依赖 keyword：keyword 一变 onPick 就是新引用 → memo 失效，昂贵子树每次击键陪葬
  const onPick = useCallback(
    (id: number) => console.log('选中', id, '，当前关键词：', keyword),
    [keyword],
  );
  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <LogPanel onPick={onPick} />
    </>
  );
}
```

**反例二（网上流传的"渲染期写 ref"简版，是错的）**：

```ts
import { useCallback, useRef } from 'react';

export function useEventBroken<A extends unknown[], R>(
  callback: (...args: A) => R,
): (...args: A) => R {
  const ref = useRef(callback);
  ref.current = callback; // 渲染期间写 ref：违反"渲染必须纯净"
  return useCallback((...args: A) => ref.current(...args), []);
}
```

为什么错：渲染函数必须纯净——同样的输入产出同样的结果、不产生副作用。并发渲染（React 18/19）下一次渲染可能被中断、丢弃、重试；在渲染中途写 ref，等于把"中间状态"泄漏给同轮的其他读取者，同轮渲染先后用到它的两个组件可能读到不一致的杂交结果。前文 useInterval / useClickOutside 把 ref 赋值写在 effect 里，正是避开了这一点。

**实现**（对齐 React 官方 useEvent RFC 的思路；该 Hook 截至目前仍未内置，生产可手写）：

```ts
import { useCallback, useInsertionEffect, useRef } from 'react';

/**
 * 返回一个"引用永远稳定"的函数；调用时执行的永远是最近一次渲染的 callback。
 * 语义定位：事件响应函数（onClick / 订阅回调），不是 effect 依赖的替代品
 */
export function useEvent<A extends unknown[], R>(
  callback: (...args: A) => R,
): (...args: A) => R {
  const ref = useRef<((...args: A) => R) | null>(null);

  // 在"提交后、绘制前"刷新实现（useInsertionEffect 是最早的 effect 档位）：
  // 1) 不在渲染期间写 ref（纯渲染约定 + 并发安全）
  // 2) 不用 useEffect：passive effect 绘制后才异步执行，
  //    理论上用户可能在浏览器 flush 前触发一次点击、拿到上一帧实现
  useInsertionEffect(() => {
    ref.current = callback;
  });

  // 壳：空依赖 useCallback → 引用终身稳定；到点转发给最新实现
  return useCallback((...args: A) => {
    const fn = ref.current;
    if (!fn) throw new Error('useEvent: 实现尚未挂载（绘制之前不应被调用）');
    return fn(...args);
  }, []);
}
```

（`useInsertionEffect` 是 React 18 为 CSS-in-JS 引入的"最早 effect"，官方 useEvent RFC 采用同款档位；换成 `useLayoutEffect` 也成立。）

**使用 demo**（修掉反例一：memo 不再被击穿，回调里永远读得到最新 state）：

```tsx
import { memo, useState } from 'react';
import { useEvent } from './useEvent';

const LogPanel = memo(function LogPanel({ onPick }: { onPick: (id: number) => void }) {
  console.log('LogPanel 渲染（昂贵子树）');
  return <button onClick={() => onPick(42)}>选中 42</button>;
});

export default function Parent() {
  const [keyword, setKeyword] = useState('');
  const onPick = useEvent((id: number) => {
    console.log('选中', id, '，当前关键词：', keyword); // 执行时才读取：永远最新
  });

  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <LogPanel onPick={onPick} /> {/* 击键不再触发昂贵子树重渲染 */}
    </>
  );
}
```

**常见坑**：

- 坑 1：在渲染期间调用返回的稳定函数（渲染体 / useMemo 里直接调）。
  - 症状：拿到上一帧实现的结果。
  - 根因：本轮 insertion effect 还没跑，ref 里还是旧实现。
  - 修法：返回值只在事件、回调、effect 里调用——它是"事件回调"，不参与渲染计算。
- 坑 2：把它当"依赖数组豁免权"，期望"值变了 effect 重跑"。
  - 症状：effect 对 keyword 变化不再反应。
  - 根因：稳定函数引用永不变 → 依赖数组认为一切如旧；"执行时读最新值"与"值变化时重新执行"是两个语义。
  - 修法：需要"值变化触发"的 effect 老实写依赖；useEvent 只解决"引用稳定 + 执行时最新"。
- 坑 3：对返回值再包一层 `useCallback(fn, [dep])`。
  - 根因：多此一举，且重新引入依赖后引用又开始变。
  - 修法：直接用。

**对照生态**：ahooks 的 `useMemoizedFn`（useDebounce 一节点过名）是同思路的工程版——额外保留了 this 与函数名；React 官方 `useEvent` 仍在 RFC 阶段，内置之前手写上面十几行即可。

#### 补充：usePolling——轮询的暂停、可见性降级与失败退避

**解决什么场景**：构建状态页、消息红点、监控看板——"每 15 秒查一次"。裸 `setInterval(() => fetch(...), 15000)` 在生产有四宗罪：请求重叠（响应慢于间隔时越积越多）、后台标签页照常轮询（白烧配额与电量）、失败后仍按原间隔硬重试（服务端故障时雪上加霜）、卸载后请求照发。轮询与长轮询 / WebSocket 怎么选见 [17-4-6-实时与异步.md](17-4-6-实时与异步.md)，本节解决"确定要轮询之后，怎么轮得体面"。

**实现**（串行调度 + visibilitychange 暂停 + 指数退避 + abort）：

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePollingResult<T> {
  data: T | null;
  error: Error | null;
  /** 立即触发一轮（引用稳定，可传给 memo 子组件） */
  refresh: () => void;
}

export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  options: { enabled?: boolean; maxBackoffMs?: number } = {},
): UsePollingResult<T> {
  const { enabled = true, maxBackoffMs = 300_000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0); // 手动刷新机关：与 useFetch 的 refetch 同款
  // fetcher 允许内联传（每次渲染新引用）：最新实现走 ref（本文 savedCallback 模式）
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let paused = document.hidden; // 页面不可见 → 不调度新请求
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let runId = 0; // 只有"最新一轮"有资格排下一轮，防止恢复时排出两条链
    let backoffMs = intervalMs;

    const run = async () => {
      const id = ++runId;
      controller = new AbortController();
      try {
        const result = await fetcherRef.current(controller.signal);
        if (stopped || id !== runId) return; // 已被取消/取代：丢弃
        setData(result);
        setError(null);
        backoffMs = intervalMs; // 成功复位
      } catch (err) {
        if (stopped || id !== runId) return;
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err : new Error(String(err)));
          backoffMs = Math.min(backoffMs * 2, maxBackoffMs); // 15s→30s→60s…封顶 5 分钟
        }
      } finally {
        controller = null;
        if (!stopped && !paused && id === runId) {
          timer = window.setTimeout(run, backoffMs); // 串行：上一轮结束才排下一轮
        }
      }
    };

    const start = () => {
      window.clearTimeout(timer);
      controller?.abort(); // 回前台立即补一轮时，掐掉可能还挂着的旧请求
      void run();
    };
    const onVisibility = () => {
      paused = document.hidden;
      if (paused) window.clearTimeout(timer); // 切后台：停调度（在途请求自然结束并被丢弃）
      else start(); // 回前台：立即补一轮并恢复节奏
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true; // 迟到响应一律丢弃（useFetch 同款防线）
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, maxBackoffMs, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, refresh };
}
```

机制分步：**自调度 setTimeout 链**保证串行——run 完成后才排下一个，响应再慢也不会重叠堆积；`visibilitychange` 把"看不见就别刷"变成默认行为；**指数退避**在连续失败时间隔翻倍、成功即复位；cleanup 的 `stopped + abort + runId` 是 useFetch 双保险的同构加强版。

**使用 demo**（构建状态轮询）：

```tsx
import { usePolling } from './usePolling';

interface Build {
  status: 'running' | 'success' | 'failed';
  durationMs: number;
}

export default function BuildBanner({ buildId }: { buildId: string }) {
  const { data, error, refresh } = usePolling(
    async (signal) => {
      const res = await fetch(`/api/builds/${buildId}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`); // fetch 对 4xx/5xx 不 reject
      return (await res.json()) as Build;
    },
    15_000,
  );

  const color = data?.status === 'success' ? 'green' : data?.status === 'failed' ? 'red' : 'orange';
  return (
    <div style={{ color }}>
      {error ? `轮询失败：${error.message}` : data ? `构建${data.status}` : '加载中…'}{' '}
      <button onClick={refresh}>立即刷新</button>
      {/* 验证：切走标签页 30 秒再回来——Network 面板没有后台请求，回来立刻补一轮 */}
    </div>
  );
}
```

**常见坑**：

- 坑 1：用 setInterval 导致请求重叠。
  - 症状：接口 P99 超过轮询间隔时，Network 面板同时挂多个未完成请求，响应乱序互相覆盖。
  - 根因：setInterval 不管上一轮是否完成，到点就发。
  - 修法：setTimeout 自调度链（本实现），"上一轮结束才排下一轮"。
- 坑 2：后台标签页持续轮询。
  - 症状：挂 10 个 tab，服务器 QPS 无故 ×10；移动端还耗电。
  - 根因：页面不可见时定时器照常触发（浏览器只降频不停）。
  - 修法：visibilitychange 暂停（本实现内置）。
- 坑 3：失败后按原间隔硬重试。
  - 症状：服务器抖动时轮询变成压测，帮它彻底倒下。
  - 根因：没有退避策略。
  - 修法：指数退避 + 上限 + 成功复位（本实现内置）。
- 坑 4：切回标签页瞬间排出两条轮询链。
  - 症状：Network 面板里请求频率变成两倍。
  - 根因：后台时一个在途请求还没结束，恢复时又 start 一轮，两轮的 finally 各自排了下一个定时器。
  - 修法：runId 只让最新一轮拥有排程权，start 前先 abort 旧请求（本实现内置）。

#### 补充：自定义 Hook 自测题与面试题

1. **两个组件调用同一个自定义 Hook，state 共享吗？**
   要点：不共享。自定义 Hook 复用"逻辑"不复用"状态"，每次调用都是独立的一套 state/ref（React 按调用位置记账）。要共享得把状态提升到公共祖先，或放 store / Context。
2. **为什么自定义 Hook 返回的函数/对象必须包 useCallback/useMemo？**
   要点：调用方会把这些值放进 effect 依赖或 memo 子组件的 props；引用不稳 → 调用方无谓重跑/重渲染，且锅算 hook 作者的。返回数组时用 `as const` 也是一种稳定化。
3. **useInterval 为什么不能把回调放进依赖数组？**
   要点：回调每次渲染变 → 定时器被不断 clear+set，节拍被持续重置、语义跑偏。Dan 版拆两条通道：ref 追最新回调（管新鲜度）、`[delay]` 管定时器生命周期（管频率），互不干扰。
4. **手写 useEvent 时，为什么不能在渲染期间写 `ref.current = fn`？**
   要点：渲染必须纯净；并发渲染会中断/重试，渲染期写 ref 会把中间态泄漏给同轮读取者。正确姿势：insertion/layout effect 在提交后、绘制前刷新 ref。
5. **useFetch 为什么 AbortController 和 outdated 标志要"双保险"？只用一个行不行？**
   要点：abort 拦不住"响应已 resolve、then 微任务已入队"的窗口，outdated 标志兜正确性；只有标志没有 abort，请求白白跑完费流量。一个省流量、一个保正确，职责不同。
6. **同页两个组件用 useLocalStorage 监听同一个 key，为什么 storage 事件帮不上忙？**
   要点：浏览器约定 storage 事件只对"其他文档"的修改触发，本页 setItem 不通知本页。需自定义事件广播，或用 useSyncExternalStore 统一桥接（原理见 [32-阶段-10-进阶原理-可选-面试导向.md](32-阶段-10-进阶原理-可选-面试导向.md)）。
7. **怎么给自定义 Hook 写单测？**
   要点：`@testing-library/react` 的 `renderHook` + `act` 包裹交互与断言；定时器类 hook（useDebounce/useInterval）配 fake timers。展开见 [30-阶段-8-测试与质量-1-周.md](30-阶段-8-测试与质量-1-周.md)。
8. **什么逻辑不该抽成自定义 Hook？**
   要点：无状态无副作用的纯计算抽普通函数即可；只在一处使用的"预防性抽象"等第二个消费者出现再抽。抽的标准：带状态/副作用的逻辑被 ≥2 处复用，或需要收口清理逻辑。

