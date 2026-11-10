---
title: "useMemo / useCallback / memo"
---

> 本文是《阶段 2：状态与副作用 ⭐核心（2 周）》按小节拆分后的续篇，上一部分见 [07-useRef-场景.md](07-useRef-场景.md)。

### useMemo / useCallback / memo

先立主线，三个 API 讲的是同一件事的三面：

> React 的默认规则是**父组件渲染时，所有子组件无论 props 变没变都会重新渲染**（重新执行函数）。要跳过这层"连坐"，用 `memo` 给子组件加浅比较；而浅比较能否通过，取决于 props 的**引用相等性**；要保住引用，靠 `useMemo`/`useCallback`。

先厘清"重渲染"的成本：重新执行组件函数 ≠ 重新创建 DOM ≠ 用户可见变化，React 还要 diff 决定是否动 DOM。所以**多数重渲染是便宜的**，只有渲染本身很贵（大列表、重计算、大量 diff）时才值得干预——这是第 3 条"过度优化的代价"的伏笔。

#### 1. 引用相等性问题：什么时候子组件会无谓重渲染

**是什么**

JS 的对象、数组、函数都是引用类型：`{a:1} !== {a:1}`，每次求值字面量都是新分配。`memo(Comp)` 让 React 在渲染 Comp 前先用 `Object.is` 逐个浅比较新旧 props，**全部相等才跳过渲染**。而父组件每次渲染时写在 JSX 里的 `style={{...}}`、`items={[...]}`、`onChange={() => ...}` 都是新引用——浅比较必然失败，memo 形同虚设。

**为什么需要**

理解这条，你就理解了"为什么我加了 memo 还是在渲染"这个高频疑问的大半。它也解释了 useCallback/useMemo 存在的根本理由：**不是为了"缓存计算"这个微观收益，而是为了维持引用稳定，让下游的 memo 链条成立。**

**怎么做（机制分步）**

1. 父组件 setState → 父函数重新执行；
2. JSX 里的对象/数组/函数字面量**每次求值都分配新引用**；
3. React 到达 memo 包裹的子组件，逐项执行 `Object.is(prevProp, nextProp)`；
4. 遇到引用类型：两个不同地址的对象 → `false`；
5. 只要有任意一项不相等 → 照常渲染子组件。原始类型（string/number/boolean）按值比较，内容相同即通过。

**代码示例（完整演示：同一组件的三个实例，memo 分别生效/失效）**

```tsx
import { memo, useState, type CSSProperties } from 'react';

interface AvatarProps {
  url: string;
  style?: CSSProperties;
  onReport?: () => void;
}

// memo 包裹：props 浅比较全等才跳过渲染
const Avatar = memo(function Avatar({ url, style, onReport }: AvatarProps) {
  // 用 url 尾号区分是哪一个实例在渲染
  console.log('Avatar 渲染：', url.slice(-2));
  return (
    <span>
      <img src={url} alt="头像" style={style} width={40} height={40} />
      {onReport && <button onClick={onReport}>举报</button>}
    </span>
  );
});

export default function MemoFailDemo() {
  const [count, setCount] = useState(0);

  const style = { borderRadius: '50%' }; // 反例：每次渲染都是新对象
  const onReport = () => console.log('举报'); // 反例：每次渲染都是新函数

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* count 与三个头像毫无关系，但它的变化会触发父渲染 */}
      <button onClick={() => setCount((c) => c + 1)}>无关计数：{count}</button>

      {/* ① 生效：props 只有字符串，值没变 → 浅比较通过 → 不再渲染 */}
      <Avatar url="https://picsum.photos/40" />

      {/* ② 失效：style 每次都是新引用 → Object.is(旧 style, 新 style) === false */}
      <Avatar url="https://picsum.photos/41" style={style} />

      {/* ③ 失效：onReport 每次都是新函数 */}
      <Avatar url="https://picsum.photos/42" onReport={onReport} />
    </div>
  );
}
```

反复点按钮、观察控制台：只有 ① 安静，② ③ 每次都打印"Avatar 渲染"。修复方式（预览下一节）：`style` 若真是常量就提到组件外；`onReport` 用 `useCallback` 包住。

结论速查：传**原始类型** → memo 天然有效；传**对象/数组/函数字面量** → memo 失效；`children` 里写了 JSX 内容 → 同样每次是新元素引用 → 失效。

**常见坑**

- 坑 1："我加了 memo 怎么还在渲染？"
  - 症状：子组件照常重渲染。
  - 根因：props 里存在每次都变的引用（内联对象/函数/JSX children）。
  - 修法：稳定引用（见第 2 条），或把 props 拆成原始类型传下去（传 `width: 40` 而不是 `style: {width: 40}`）。
- 坑 2：把"必要渲染"误判为"memo 失效"。
  - 症状：props 里确实有父组件的 state 值，值变了子组件渲染。
  - 根因：memo 只拦截"props 没变"的渲染；props 真变了，渲染是**应该的**。
  - 修法：用 DevTools Profiler 的 "Why did this render?" 区分原因（props changed / parent rendered），别看见渲染就想优化。

#### 2. `memo` + `useCallback` 配合生效的条件

**是什么**

让 memo 真正生效的完整条件：**在"逻辑上没变"的那些渲染之间，传给 memo 组件的每一个 prop 的引用都必须不变**。函数 props 用 `useCallback`，对象/数组 props 用 `useMemo`，常量提到模块顶层，children 保持稳定。

**为什么需要**

`useCallback(fn, deps)` 的行为：deps 逐项 `Object.is` 比较，没变就返回**同一个函数对象**（实现上等价于 `useMemo(() => fn, deps)`）；deps 变了才换新引用——注意这是正确行为：回调闭包的内容真的变了。`useMemo(() => value, deps)` 同理作用于任意计算结果。二者合起来，就是把"引用稳定性"显式管理起来。

**怎么做（条件清单 + 各类 props 的稳定方法）**

| prop 形态 | 稳定引用的办法 |
|---|---|
| 函数 | `useCallback(fn, deps)` |
| 对象 / 数组 / 派生数据 | `useMemo(() => ({ ... }), deps)`；真常量直接提到模块顶层 |
| 空集合兜底（如 `items={[]}`） | 模块级 `const NO_ITEMS: Item[] = []`，天生稳定 |
| JSX children | 作为"元素"传入且用 `useMemo` 稳定；或改用 children-as-props 模式（阶段 6 展开） |
| 自定义 Hook 返回的函数/对象 | Hook 内部就包好 `useCallback`/`useMemo`（下一节的 8 个 hook 全部示范） |

**代码示例（完整配合：无关状态变化时，memo 子组件真正安静）**

```tsx
import { memo, useCallback, useMemo, useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}
interface TodoFilter {
  keyword: string;
  onlyUndone: boolean;
}

const BASE_ITEMS: Todo[] = [
  { id: 1, text: 'Learn React', done: false },
  { id: 2, text: 'Learn refs', done: true },
];

const TodoList = memo(function TodoList({
  items,
  filter,
  onToggle,
}: {
  items: Todo[];
  filter: TodoFilter;
  onToggle: (id: number) => void;
}) {
  console.log('TodoList 渲染（点"无关计数"时这行不应出现）');
  const visible = items.filter(
    (t) => (!t.done || !filter.onlyUndone) && t.text.includes(filter.keyword),
  );
  return (
    <ul>
      {visible.map((t) => (
        <li key={t.id} onClick={() => onToggle(t.id)}>
          [{t.done ? 'x' : ' '}] {t.text}
        </li>
      ))}
    </ul>
  );
});

export default function MemoWorkingDemo() {
  const [count, setCount] = useState(0); // 无关状态：制造"无谓渲染"的压力源
  const [onlyUndone, setOnlyUndone] = useState(false);
  const keyword = 'Learn';

  // ① 数组：依赖为空（演示数据是常量），引用永远稳定
  const items = useMemo(() => BASE_ITEMS, []);
  // ② 对象：依赖 keyword/onlyUndone，逻辑变了引用才变
  const filter = useMemo<TodoFilter>(() => ({ keyword, onlyUndone }), [keyword, onlyUndone]);
  // ③ 函数：依赖为空 → 引用稳定；内部用函数式更新，不依赖外部 state
  const onToggle = useCallback((id: number) => {
    console.log('toggle（演示版，真实项目里是 setItems 更新）', id);
  }, []);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>无关计数：{count}</button>
      <button onClick={() => setOnlyUndone((v) => !v)}>只看未完成：{String(onlyUndone)}</button>
      <TodoList items={items} filter={filter} onToggle={onToggle} />
    </div>
  );
}
```

点"无关计数"：`TodoList 渲染` 不再出现——memo 链条真正闭合。点"只看未完成"：`filter` 引用变化 → 正常渲染（这是必要渲染）。

`memo` 还接受第二个参数自定义比较函数：`memo(Comp, areEqual)`，`areEqual(prevProps, nextProps)` 返回 **true 表示"相等、跳过渲染"**——与 `Array.filter` 的语义相反，极易写反；仅当需要对"深层相等进行精细化控制"时才用（更好的做法通常是重构 props 让浅比较够用）。

**常见坑**

- 坑 1：只 memo 了子组件，props 原样透传。
  - 症状：包了 memo 没效果。
  - 根因：链条上任意一个 prop 引用不稳定，浅比较就失败；memo 是"父传的每个 prop 都稳定"的与运算。
  - 修法：按上面的表格逐项排查。
- 坑 2：`useCallback` 的引用"莫名其妙"变了。
  - 症状：依赖里有对象/函数/每次新建的字面量，deps 项本身就是新引用。
  - 根因：deps 逐项浅比较，依赖不稳定则 useCallback 形同虚设。
  - 修法：把依赖也稳定化（再往上一层 useCallback/useMemo），这是"稳定引用需要自上而下贯穿"的原因，也是自定义 Hook 应当内部消化稳定性的原因。
- 坑 3：自定义比较函数写反。
  - 症状：加 `memo(Comp, (a, b) => a.id === b.id)` 后数据更新 UI 不动。
  - 根因：比较函数返回 true 意为"视为相等 → 跳过"，返回 false 才渲染；`a.id === b.id` 只覆盖了 id 一个维度。
  - 修法：确认所有"应触发渲染"的字段都参与比较并返回 false，或干脆放弃自定义比较、回归浅比较。

#### 3. **过度优化的代价**：不要默认全加

**是什么**

`useMemo`/`useCallback`/`memo` 不是免费的：每次渲染要维护 deps 数组并逐项比较、缓存占内存、代码可读性下降；更重的是**依赖数组写错引入"陈旧值"bug**——这类 bug 比性能问题难查得多。React 官方文档因此把它们定位为"性能优化手段而非语义保证"：未来版本在内存紧张时可能丢弃缓存重建，你的代码必须在没有记忆化时依然正确。

**什么时候值得加**（满足其一再动手）：

- Profiler 证明该组件/子树渲染确实昂贵（大列表、昂贵计算、复杂 DOM diff）；
- 存在 memo 化的子组件，需要父侧供给稳定引用（第 2 条的配合链条）；
- 一个昂贵计算在无关渲染中被反复执行（`useMemo` 的本义场景）。

**什么时候反而更慢**：

- 子组件极轻：比较 props 的成本约等于甚至高于直接渲染的成本，memo 纯付学费；
- props 每次都变：记忆永远 miss，白付"比较 + 存缓存"的成本；
- 到处 `useCallback` 小函数：函数对象创建本身极便宜， deps 维护与代码噪音的代价可能超过收益。

**怎么做（用 Profiler 验证再优化）**

1. 安装 React DevTools 浏览器扩展，切到 Profiler 面板；
2. 打开设置齿轮，勾选 "Highlight updates when components render" 与 "Record why each component rendered..."（后者能回答 Why did this render?）；
3. 点录制按钮 → 执行目标交互（如快速输入搜索词）→ 停止；
4. 读结果：顶部每次提交（commit）一根柱子，颜色越黄越耗时；点击任意组件看"为什么渲染"（Props changed / The parent rendered / State changed / Hooks changed）；
5. 加 memo 前后各录一次，对比目标组件的渲染次数与耗时，确认收益为正再保留代码。

也可以在代码里用 `<Profiler>` 组件埋点（无需扩展，适合自动采集）：

```tsx
import { Profiler, useState, type ReactNode } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
): void {
  // actualDuration：本次提交中该组件及其子树的实际渲染耗时（毫秒）
  console.log(`[Profiler ${id}] ${phase}，耗时 ${actualDuration.toFixed(2)}ms`);
}

export default function ProfilerDemo({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  return (
    <Profiler id="search-area" onRender={onRenderCallback}>
      <button onClick={() => setTick((t) => t + 1)}>触发更新：{tick}</button>
      <div>{children}</div>
    </Profiler>
  );
}
```

**经验法则**：默认不优化；先做结构性改善——状态下放（只影响子树的状态放子树里）、组件拆分、children 作为 props 传入（这些在阶段 6 系统展开）；出现可感知卡顿后用 Profiler 拿证据，只对热点路径加 memo；把"稳定引用"内聚到自定义 Hook 内部对外输出（下一节的 8 个 hook 全部遵守这一纪律），调用方就不必层层 useCallback。

#### 4. 性能量化实战：一万行列表 + 每秒跳动的无关状态——退化点、测量与前后对比

**场景与需求。** 商品目录页：10,000 条商品，输入关键词过滤并渲染前 50 条命中项；同一页面还有一个每秒跳动的"秒杀倒计时"。症状：倒计时每跳一次，整个列表跟着重新渲染；打字明显跟手慢。先建立基线再谈优化。

**版本 A（基线：不优化）。**

```tsx
import { useState } from 'react';

interface Item { id: number; title: string; price: number; }

const ALL_ITEMS: Item[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `商品 ${String(i + 1).padStart(5, '0')}`,
  price: (i % 97) * 1.5,
}));

export default function CatalogA() {
  const [keyword, setKeyword] = useState('');
  const [countdown, setCountdown] = useState(60); // 无关状态：每秒 -1

  setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000); // 演示用；真实项目放 effect + cleanup

  const filtered = ALL_ITEMS.filter((it) => it.title.includes(keyword)); // 每次渲染全量重算

  return (
    <div>
      <p>秒杀倒计时：{countdown}s（它每跳一次，下面的列表全部重新渲染）</p>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <p>命中 {filtered.length} 条</p>
      <ul>
        {filtered.slice(0, 50).map((it) => (
          <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{it.title}</span>
            <span>¥{it.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**第一步：把"计算"与"渲染"的成本拆开测。** 用 `performance.now` 写一个 20 行的基准函数（浏览器 Console 或临时模块里跑），先回答"该优化什么"：

```ts
// bench.ts —— 先量化纯计算成本，避免优化错方向
const items = Array.from({ length: 10000 }, (_, i) => `商品 ${String(i + 1).padStart(5, '0')}`);

function bench(name: string, fn: () => void, times = 200) {
  fn(); // 预热一轮触发 JIT
  const start = performance.now();
  for (let i = 0; i < times; i++) fn();
  const per = (performance.now() - start) / times;
  console.log(`${name}: ${per.toFixed(3)}ms/次`);
}

bench('filter 10000 字符串 includes', () => items.filter((s) => s.includes('商品 00')));
// 典型输出（M1 Pro / Chrome）：0.5 ~ 1.5ms/次
```

结论：1 万条字符串过滤约 1ms——**计算本身不是瓶颈，瓶颈是无关渲染引发的"整棵子树重新执行 + 50 行 diff"**。优化目标是"让列表子树在倒计时跳动时被跳过"，而不是抠 filter 的实现。

**版本 B（结构性拆分 + useMemo + memo）。**

```tsx
import { memo, useEffect, useMemo, useState } from 'react';

const ResultList = memo(function ResultList({ items }: { items: Item[] }) {
  console.log('ResultList 渲染', items.length); // 观察点：无关渲染时这行不应出现
  return (
    <ul>
      {items.slice(0, 50).map((it) => (
        <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{it.title}</span>
          <span>¥{it.price.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
});

export default function CatalogB() {
  const [keyword, setKeyword] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // 引用稳定化：keyword 不变时（倒计时引发的渲染）filtered 是同一个数组引用
  const filtered = useMemo(
    () => ALL_ITEMS.filter((it) => it.title.includes(keyword)),
    [keyword]
  );

  return (
    <div>
      <p>秒杀倒计时：{countdown}s</p>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <p>命中 {filtered.length} 条</p>
      <ResultList items={filtered} /> {/* props 只有一个数组：memo + useMemo 闭合链条 */}
    </div>
  );
}
```

链条读法：倒计时变化 → CatalogB 重渲染 → `useMemo` 命中缓存返回同一引用 → `ResultList` 的 props 浅比较全过 → 子树整体跳过。击键时 keyword 变化 → 缓存未命中 → 重算 + 列表渲染（这是必要渲染，不应也无法跳过）。

**第二步：用 Profiler API 自动采集前后数据。**

```tsx
import { Profiler, type ReactNode } from 'react';

const samples: { phase: string; duration: number }[] = [];

function onRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  duration: number
) {
  if (phase === 'update') samples.push({ phase, duration }); // 只关心更新提交
}

export function MeasuredCatalog({ children }: { children: ReactNode }) {
  return <Profiler id="catalog" onRender={onRender}>{children}</Profiler>;
}

// 交互结束后在 Console 汇总：
const avg = samples.reduce((a, s) => a + s.duration, 0) / samples.length;
console.table({
  更新次数: samples.length,
  平均耗时ms: Number(avg.toFixed(2)),
  最大耗时ms: Math.max(...samples.map((s) => s.duration)),
});
```

**前后对比（示例数据：M1 Pro / Chrome 生产构建，10,000 条、渲染 50 条、倒计时跳 10 次 + 击键 10 次；绝对值因机器而异，量级与方法才是重点，务必在目标机型重测）。**

```text
版本 A：
  倒计时引发的 update：平均 ~24ms —— 每秒一次全列表 diff，页面周期性卡顿
  击键引发的 update：  平均 ~26ms —— filter 1ms + 列表 diff，倒计时与打字互相拖累
版本 B：
  倒计时引发的 update：平均 ~1.2ms —— ResultList 被跳过，只剩父组件自身几行 JSX
  击键引发的 update：  平均 ~9ms —— 必要渲染：filter + 列表 diff 一次性发生
```

读数要点：useMemo 省的不是"击键那一次"的计算（那次省不掉），而是**无关渲染时的重复计算 + 子树 diff**；两个数字（无关渲染耗时、必要渲染耗时）要分开汇报，只报一个平均数会互相稀释。

**测量纪律与退化判据（checklist）。** 一律在生产构建测（`npm run build` + preview，dev 模式耗时普遍翻倍以上且不稳定）；单次 commit 耗时超过 16.7ms（60fps 预算）或 8ms（120Hz）即掉帧；Profiler 的 "Why did this render" 里大量 "The parent rendered" 说明该做结构性拆分/memo，"Props changed" 则去查引用稳定性；行数上千且必须全量渲染时 memo 也救不了，考虑虚拟滚动（只渲染可视区）。每次只改一处、复测一次、数据留档——没有前后数字的优化提交无法 review。

#### 5. 高频坑位补遗

**坑 1：memo 拦不住组件自身 state 与 Context。**

```tsx
const Badge = memo(function Badge() {
  const cart = useCart();                 // 订阅了 Context
  const [hover, setHover] = useState(false); // 自己的 state
  return <span onMouseEnter={() => setHover(true)}>{cart.count}</span>;
});
```

症状：以为包了 memo 就不该渲染，结果 cart 一变、hover 一变照样渲染，误判 memo 坏了。根因：memo 只拦截"由父组件引发的 props 驱动渲染"；自身 setState 与订阅的 Context 变化是另外两条独立通路。修法：这是 memo 的边界不是 bug——用 Profiler 的渲染原因区分通路，别为它加自定义比较函数硬压。

**坑 2：原地修改 useMemo 的返回值。**

```tsx
const sorted = useMemo(() => [...items].sort(compare), [items]);
sorted.push(newItem); // 错误：改的是缓存数组本体
```

症状：依赖未变时后续渲染读到"被塞过数据的缓存"；而 React 在内存压力或未来版本丢弃缓存重建后行为又"恢复正常"——不可复现的幽灵 bug。根因：useMemo 的约定是 deps 未变时返回同一引用，调用方必须当只读数据用。修法：要改先复制 `[...sorted, newItem]`；团队层面用 ESLint（如 `no-param-reassign`）或 immer 约束不可变纪律。

**坑 3：把 useMemo/useCallback 当"只执行一次"用。**

```tsx
const id = useMemo(() => createId(), []);       // 想"生成一次"的 id
const log = useCallback(() => track('mounted'), []); // 想"只在挂载时"建回调
```

症状：StrictMode 开发期工厂函数被双调用（官方故意暴露这种依赖）；并发渲染下缓存也可能被丢弃重算。根因：官方定位是"性能优化而非语义保证"——正确性不能建立在"恰好只算一次"上。修法：必须恰好一次的资源用 `useState(() => createId())[0]`（state 初始化器保证只保留一次结果）或 effect + ref；useMemo 只用来省"重计算"。

**坑 4：`[]` 依赖闭住旧 props 的 useMemo。**

```tsx
const summary = useMemo(() => `${title}：${rows.length} 行`, []); // title/rows 漏申报
```

症状：title 变了摘要不变——与 useEffect 漏依赖完全同构。根因：缓存以 deps 声明为准，声明为空就永远返回首轮结果；很多人对 effect 开了 exhaustive-deps 硬错误，却对 useMemo/useCallback 的同类警告视而不见。修法：如实申报 `[title, rows]`，CI 里把这条规则的严重级别对齐 effect。

**坑 5：不稳定的 key 让 memo 形同虚设。**

```tsx
{rows.map((r) => <Row key={Math.random()} item={r} />)} // 错误：每次渲染 key 全变
{rows.map((r, i) => <Row key={i} item={r} />)}          // 列表会重排/删头部时同样是坑
```

症状：子项加了 memo 还是全量重建；每行内部的本地 state（勾选、输入）莫名丢失。根因：key 变化意味着元素身份变化——卸载旧元素、挂载新元素，key 的优先级高于 memo 的比较。修法：用稳定业务 id 作 key；`index` 仅限"静态、不重排、不从头部增删"的列表。

#### 6. 自测题与面试题

**Q1：memo 的浅比较基于什么相等语义？`Object.is(NaN, NaN)` 与 `Object.is(0, -0)` 的结果说明什么？**
要点：基于 `Object.is`（SameValue）：NaN 视为相等、+0 与 -0 视为不等——不是严格等于的简单复用；对象比较的是引用，这是引用相等性问题的根源。

**Q2：写出 useCallback 与 useMemo 的等价关系。**
要点：`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`；useCallback 是"函数版本"的专用语法糖，两者共享同一套依赖比较与缓存机制。

**Q3：memo 组件跳过渲染的完整条件链是什么？**
要点：父组件更新 → React 到达 memo 包裹的子组件 → 逐 prop `Object.is` 比较 → 全部相等才跳过。任意一环断裂（内联对象/函数/children JSX 任一引用不稳）即失效；组件自身 setState 与 Context 更新不受此拦截。

**Q4：为什么"给每个函数都包 useCallback"可能更慢？**
要点：每次渲染要分配 deps 数组并逐项比较、缓存占内存、代码噪音上升；被包的函数若不传给 memo 子组件也不进 effect 依赖，稳定引用没有"买家"，收益为零成本照付；deps 里若混入不稳定引用，比较本身也是白做。

**Q5：React 官方为什么强调 useMemo 是"性能优化而非语义保证"？对写法有什么硬约束？**
要点：未来版本可能在内存紧张时丢弃缓存重算、StrictMode 开发期双调用工厂函数；硬约束：不得依赖"只执行一次"（副作用禁止进 useMemo）、不得原地修改返回值、代码必须在无记忆化时依然正确。

**Q6：Context 与 memo 的关系？memo 能否挡住 context 更新引发的渲染？**
要点：不能。memo 只比较 props；context 消费是渲染的另一条输入通路，订阅了该 context 的组件在值变化时必然重渲染，即使 props 全等——误把这类渲染归咎 memo 失效是高频误诊。

**Q7：线上反馈"列表页卡"，给出基于 Profiler 的完整排查步骤。**
要点：生产构建复测（dev 耗时失真）→ Profiler 录制卡顿操作 → 看 commit 柱状图定位耗时组件 → 逐组件看 "Why did this render"（parent rendered → 结构性拆分/状态下放/memo；props changed → 检查引用稳定性链条）→ 一次只改一处并复测对比、数字留档 → 行数过大时考虑虚拟滚动而不是继续堆 memo。

