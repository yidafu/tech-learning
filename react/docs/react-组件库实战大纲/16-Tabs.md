---
title: "Tabs（★★★）"
---

> 本文是《Lv3 复杂交互组件（公认最考功力）》按小节拆分后的续篇，上一部分见 [15-Table-中后台之王.md](15-Table-中后台之王.md)。

### Tabs（★★★）

Tabs 是 Lv3 里唯一"看起来简单"的组件——切个 tab 谁不会？但把它做到**键盘可用、读屏可用、动画流畅、页签可溢出**，每一项背后都是一个独立考点。Radix 的 Tabs 源码是这一节的最佳读物：它只做行为与无障碍，几百行，把四个考点全占齐了：

```tsx
import * as Tabs from '@radix-ui/react-tabs';

// Radix 的 compound API：结构由消费者拼装，行为由库注入
<Tabs.Root defaultValue="account">
  <Tabs.List aria-label="账户设置">
    <Tabs.Trigger value="account">账户</Tabs.Trigger>
    <Tabs.Trigger value="password">密码</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account">账户表单</Tabs.Content>
  <Tabs.Content value="password">密码表单</Tabs.Content>
</Tabs.Root>
```

考点清单（原文）：

- compound 模式 + roving tabindex + aria roles
- 懒渲染 vs 保持挂载（destroyInactiveTabPane）；溢出滚动箭头
- **指示条动画**（下划线宽度/位置过渡 = FLIP 的迷你应用）

#### 考点 1：compound 模式 + roving tabindex + aria 对照

**compound（复合组件）模式**：`Tabs.Root/List/Trigger/Content` 各自是独立组件，通过 Context 共享状态。相比"一个 props 大对象"（`tabs={[{key,label,content}]}`）的优势：结构与顺序由消费者 JSX 决定（Trigger 里塞图标/徽标、List 与 Content 之间插任意元素都不用改库）、类型上天然支持任意 ReactNode、 SSR 输出的 DOM 结构可控。这是 Part A 之外又一次"API 形态即架构"的示范。

**roving tabindex**（Part A4 内功在 Tabs 上的落地）：整个 tablist 只允许**一个 tab stop**——激活项 `tabIndex=0`，其余全部 `tabIndex=-1`。Tab 键从外部进入时直接落在激活项上；↑↓←→/Home/End 在 list 内部移动激活项，且**焦点必须跟着走**（只改 tabIndex 不调 focus() 是最常见的半成品）。aria 契约照抄 WAI-ARIA Tabs Pattern：

```text
元素            role       关键 aria 属性                                键盘行为
────────────────────────────────────────────────────────────────────────────────────────
Tabs.List       tablist    aria-orientation="horizontal"                自身不可聚焦
Tabs.Trigger    tab        aria-selected / aria-controls / id / tabIndex  ↑↓←→ Home End 移动激活并聚焦（roving）
Tabs.Content    tabpanel   aria-labelledby / tabIndex=0 / hidden          Tab 键进入 panel；panel 可自身滚动时也可聚焦
双 id 联动      —          trigger.id ↔ panel.aria-labelledby             两个方向的引用必须成对出现：
                           trigger.aria-controls ↔ panel.id               读屏靠它把"页签"和"面板"缝在一起
```
<!-- 保留原 ASCII 图:此处本质是元素/role/aria 属性/键盘行为的多列对照表,Mermaid 无等价图表类型(转图表会丢按行按列查询的对照语义),故不做替换 -->

完整实现（compound + Context + roving + aria，可直接运行）：

```tsx
import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';

/* ---------------- Context：compound 模式的"隐形总线" ---------------- */
interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  triggerRefs: Map<string, HTMLButtonElement | null>; // 每个 Trigger 注册自己的 DOM，供键盘移动时 focus
  baseId: string;                                     // useId 生成，保证同页多实例 id 不冲突（SSR 安全，Part A7）
}
const TabsContext = createContext<TabsContextValue | null>(null);
const useTabsCtx = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs 子组件必须渲染在 <Tabs.Root> 内——compound 模式的边界约束');
  return ctx;
};

export function TabsRoot({ defaultValue, children, onChange }: {
  defaultValue: string;
  children: ReactNode;
  onChange?: (v: string) => void;
}) {
  const baseId = useId();
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>()).current; // ref 稳定性：Map 实例跨渲染复用
  const [value, setValueRaw] = useState(defaultValue);
  const setValue = (v: string) => { setValueRaw(v); onChange?.(v); };
  return (
    <TabsContext.Provider value={{ value, setValue, triggerRefs, baseId }}>
      {children}
    </TabsContext.Provider>
  );
}

/* ---------------- List：键盘模型唯一入口 ---------------- */
export function TabsList({ children, 'aria-label': ariaLabel }: { children: ReactNode; 'aria-label'?: string }) {
  const { value, setValue, triggerRefs } = useTabsCtx();
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = [...triggerRefs.keys()];
    if (!keys.length) return;
    const idx = keys.indexOf(value);
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': next = (idx + 1) % keys.length; break; // 环形：末尾回绕到首个
      case 'ArrowLeft':  case 'ArrowUp':   next = (idx - 1 + keys.length) % keys.length; break;
      case 'Home': next = 0; break;
      case 'End':  next = keys.length - 1; break;
    }
    if (next != null) {
      e.preventDefault();
      const nextKey = keys[next];
      setValue(nextKey);                                  // 激活先行（automatic activation 模式）
      triggerRefs.get(nextKey)?.focus();                  // 焦点跟随——roving 的灵魂，漏掉就是"键盘假支持"
    }
  };
  return (
    <div role="tablist" aria-orientation="horizontal" aria-label={ariaLabel} onKeyDown={onKeyDown}
      style={{ display: 'flex', gap: 8, borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, setValue, triggerRefs, baseId } = useTabsCtx();
  const isActive = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}       // 指向面板：读屏可跳转
      tabIndex={isActive ? 0 : -1}                     // roving tabindex：整个 list 只有一个 tab stop
      ref={(el) => { triggerRefs.set(value, el); }}    // 注册 DOM：键盘移动时 focus 用（React 19 ref-as-prop）
      onClick={() => setValue(value)}
      style={{ padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
        color: isActive ? '#1677ff' : undefined, fontWeight: isActive ? 600 : 400 }}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, baseId } = useTabsCtx();
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}        // 反向引用：与 aria-controls 成对
      tabIndex={0}                                      // panel 自身可聚焦：键盘用户 Tab 能落到内容区起点
      hidden={!active}                                  // hidden 而非卸载：默认策略是"懒渲染后保持挂载"（见考点 2）
    >
      {active ? children : null}
    </div>
  );
}
```

antd 的非 compound 形态（`items` 数组）是另一种取舍：API 更紧凑、类型约束更强，但结构自由度低。两种形态都该会写。

#### 考点 2：懒渲染 vs 保持挂载（取舍表）

"没激活过的面板要不要渲染？离开的面板要不要销毁？"没有标准答案，只有取舍表：

| 策略 | antd 配置 | 挂载时机 | 组件状态 | 内存 | 典型场景 |
|---|---|---|---|---|---|
| 懒渲染 + 保持（默认） | `items` 默认行为 | **首次激活**才挂载，之后一直保持 | 保留 | 中 | 大多数后台页签 |
| 强制预挂载 | item 级 `forceRender` | 首屏即挂载（hidden 藏起） | 保留 | 高 | **隐藏页签里有 Form**：校验/取值需要字段真实在 DOM 中 |
| 离开即销毁 | Tabs 级 `destroyInactiveTabPane` | 离开即卸载 | 重置 | 低 | 页签内容昂贵（编辑器/播放器/长列表），或业务要求"每次进入全新" |

```tsx
import { Tabs } from 'antd';

<Tabs
  destroyInactiveTabPane                 // 离开即卸载：状态全部重来
  items={[
    { key: 'basic', label: '基本信息', children: <BasicForm /> },
    { key: 'ext', label: '扩展信息', forceRender: true, children: <ExtForm /> }, // 隐藏也要挂载：表单校验需要
  ]}
/>
```

判断口诀：**状态要不要跨页签保留？要 → 前两种；不要且内容贵 → 销毁。表单在隐藏页签 → forceRender，别犹豫**（校验错误提示需要真实 DOM，卸载态的表单校验是后台高频工单）。

#### 考点 3：溢出滚动箭头（scrollIntoView 时机）

页签多到放不下时，成熟方案是"横向滚动 + 两侧渐隐箭头"，三个细节：

1. **何时显示箭头**：`scrollWidth > clientWidth` 才显示（ResizeObserver 监听，窗口缩放实时正确）；
2. **激活页签必须可见**：切换页签后把它滚进视口——时机在**激活值变化后的 effect**里，此时 DOM 已更新但浏览器还没绘制，`scrollIntoView({ inline: 'nearest' })` 不会闪；
3. **首屏也要校准**：初始激活项可能一开始就在溢出区（defaultValue 是最后一个 tab），挂载 effect 同样跑一次。

```tsx
import { useEffect, useRef, useState } from 'react';

/** 溢出感知 + 激活项自动滚入视口 的 tablist 容器（包在 TabsList 外层） */
export function OverflowList({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null); // 滚动容器 = 查询作用域，同一个 ref 两个角色
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // 溢出检测：ResizeObserver 监听容器与内容（字体晚加载导致内容变宽也能感知）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const has = el.scrollWidth > el.clientWidth + 1;
      setOverflow((prev) => {
        const next = { left: has && el.scrollLeft > 0, right: has && el.scrollLeft < el.scrollWidth - el.clientWidth - 1 };
        return prev.left === next.left && prev.right === next.right ? prev : next; // 不变不触发渲染
      });
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild); // 内容尺寸变化（增删页签/字体加载）也触发
    el.addEventListener('scroll', check, { passive: true });    // 滚动时更新箭头可用态（passive：见 Part A6）
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  }, []);

  // 激活项滚入视口：值变化后的 effect —— DOM 已更新、尚未绘制，滚动不闪（时机是本考点的核心）
  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]') // TabsTrigger 渲染 data-active 属性
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  const scrollBy = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {overflow.left && <button aria-label="向左滚动" onClick={() => scrollBy(-1)}>‹</button>}
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
      {overflow.right && <button aria-label="向右滚动" onClick={() => scrollBy(1)}>›</button>}
    </div>
  );
}
```

antd/rc-tabs 内部同样实现了 overflow 感知 + 激活项 `scrollTo`，并把指示条几何信息（width/left）传给自定义 tabbar（`renderTabBar` 可拦截）。

#### 考点 4：指示条动画（FLIP 的迷你应用）

下划线指示条要从旧 tab 平滑滑到新 tab。难点：两个 tab 宽度不同、位置不同，`left/width` 的 CSS transition 在"宽度+位置同时变"时会走对角线插值（视觉上像伸缩虫）。标准解法是 **FLIP**（First-Last-Invert-Play）——把"布局变化"翻译成"从旧几何到新几何的 transform"，transform 走合成层，性能与观感都对：

- **First**：切换前记录指示条旧几何（offsetLeft/offsetWidth）；
- **Last**：切换后（useLayoutEffect，DOM 已更新）读取新几何；
- **Invert**：先给指示条施加 `translateX(旧左-新左) scaleX(旧宽/新宽)`（视觉上它还在旧位置），transition 关掉；
- **Play**：强制 reflow 后清掉 transform、打开 transition——浏览器从"旧几何"动画到"新几何"。

```tsx
import { useLayoutEffect, useRef, useState } from 'react';

/** Tabs 指示条：FLIP 迷你实现 */
export function TabIndicator({ listRef, activeKey }: { listRef: React.RefObject<HTMLElement | null>; activeKey: string }) {
  const barRef = useRef<HTMLSpanElement>(null);
  const prevRectRef = useRef<{ left: number; width: number } | null>(null); // First：上一次的几何
  const [, force] = useState(0); // 仅用于触发重渲染让指示条跟随首帧

  useLayoutEffect(() => {
    const bar = barRef.current;
    const activeEl = listRef.current?.querySelector<HTMLElement>(`[data-tab-key="${activeKey}"]`);
    if (!bar || !activeEl) return;

    const next = { left: activeEl.offsetLeft, width: activeEl.offsetWidth }; // Last：新几何
    const prev = prevRectRef.current;

    if (!prev) {
      // 首帧：直接就位，不播动画
      bar.style.transition = 'none';
      bar.style.transform = 'none';
      bar.style.width = `${next.width}px`;
      prevRectRef.current = next;
      force((n) => n + 1);
      return;
    }
    if (prev.left === next.left && prev.width === next.width) return;

    // Invert：先把指示条"摆回"旧几何（translate 覆盖位置差，scaleX 覆盖宽度差）
    bar.style.transition = 'none';
    bar.style.transformOrigin = 'left center';
    bar.style.transform = `translateX(${prev.left - next.left}px) scaleX(${prev.width / next.width})`;
    bar.style.width = `${next.width}px`;
    void bar.offsetWidth; // 强制同步 reflow：确保 Invert 态先生效，再启动过渡

    // Play：下一帧解除 Invert，transition 接管 → 从旧几何动画到新几何
    requestAnimationFrame(() => {
      bar.style.transition = 'transform .25s cubic-bezier(.4,0,.2,1)';
      bar.style.transform = 'none';
    });
    prevRectRef.current = next;
  }, [activeKey, listRef]);

  return (
    <span ref={barRef} aria-hidden style={{
      position: 'absolute', bottom: 0, left: 0, height: 2, background: '#1677ff',
      willChange: 'transform', // 合成层提示：动画期间不重排版
    }} />
  );
}
// 组装：TabsList 内放一个 <TabIndicator listRef={...} activeKey={value} />，
// 每个 TabsTrigger 加 data-tab-key={value} 与 data-active={isActive}。
// antd v5.21+ 的 Tabs indicator={{ size, align }} 即内置的同类能力。
```

FLIP 的价值在这里看得很清楚：指示条的"真实布局"永远直接等于激活项（无中间态），动画只是 transform 的把戏——**布局归 React，动画归合成层**，两件事互不纠缠。这个思想放大就是列表重排动画（详情见《高阶场景全景图》对应章节的 FLIP 全量讨论）。

#### Tabs 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：方向键能切换页签，但 Tab 键进去后焦点丢了/每按一次方向键要按两次 Tab 才出来。
根因：只改了激活态没做 roving——所有 Trigger 都是 tabIndex=0，或 tabIndex 移了但 focus 没跟。
修法：激活项 tabIndex=0 其余 -1；切换时显式 focus() 目标 Trigger（见考点 1）。

坑 2
症状：指示条动画从错误位置飞出，或宽度先变位置后变。
根因：Invert 之后没强制 reflow 就改 transition，浏览器把 Invert 和 Play 合并成一帧。
修法：void bar.offsetWidth 强制同步布局后再启动过渡（见考点 4）。

坑 3
症状：字体加载完成后指示条停在错误宽度。
根因：几何在 effect 里读的是"字体加载前"的 offsetWidth，字体晚到后布局变了但 effect 没重跑。
修法：ResizeObserver 监听 Trigger（或容器）变化时重算指示条几何（同考点 3 的 ro.observe 内容节点）。

坑 4
症状：隐藏页签里的表单提交时报"字段未注册"/校验不通过。
根因：懒渲染策略下未激活面板从未挂载，字段不存在于 DOM。
修法：该 item 配 forceRender（antd）或自己的实现里提供等价开关（见考点 2）。

坑 5
症状：destroyInactiveTabPane 下每次切回页签，滚动位置/输入内容被重置，用户投诉。
根因：销毁策略与"状态需保留"的业务预期冲突。
修法：策略按页签粒度选，不是全局一刀切；确要销毁又要保留的关键状态提升到父组件。
```

---

> 以下考点 5–7 为续补小节（编号续接上文考点 4）：挂载策略的深水区、动态页签与溢出滚动的进阶。坑条目就近放在各考点末尾。

#### 考点 5：懒加载 vs keep-mounted 深水区——表单/视频页签与缓存失效

**是什么**：考点 2 给了三种挂载策略的取舍表，本节补"为什么"——同样是 keep-mounted，表单页签和视频页签踩的是完全不同的雷；以及"keep 住的缓存什么时候该作废"。核心是一句话：**hidden 保持挂载保住的是 React state，DOM 副作用一个都没停**——视频还在播、轮询还在转、IntersectionObserver 还在观察，"看不见"不等于"不存在"。

**为什么难**：挂载策略的代价是**延迟支付**的——选错策略当下没症状，等视频页签切走了还在出声、表单页签提交时才发现校验状态丢了，才有人回头查 Tabs 的挂载行为。而且"缓存失效"没有框架级答案：React 只负责挂不挂，数据的新鲜度完全是组件库与业务的契约。

**机制**：

1. **表单类页签**：keep-mounted（或 `forceRender`）下隐藏面板的表单字段真实在 DOM 中，校验/取值链路完整——这是考点 2 表格里"隐藏页签里有 Form 用 forceRender"的根因。反向注意 rc-field-form 的行为：`destroyInactiveTabPane` 卸载字段时**值默认保留在 store（preserve）**，但**校验状态丢失**——切回来是"值还在、错误提示没了"，用户以为校验通过了。
2. **视频/播放器类页签**：keep-mounted 的问题不是状态而是**副作用没收口**。修法是给面板内容一个"失活钩子"——失活即暂停播放/停止轮询，这是组件库该提供的基础设施，不该让每个业务面板自己写。
3. **缓存失效**：keep 住的面板数据会 stale。三种失效策略按成本排序：手动重刷（业务按钮）、TTL（超时作废）、**版本化 key**——给面板元素 key 拼上版本号，版本一变元素重建，state 与请求缓存全部天然作废，一行代码把"细粒度失效"变成"重建即失效"。
4. **平台方向**：React 19.2 起官方提供 `<Activity mode="hidden">`——state 保留、effects 卸载、界面不参与布局。它比 `hidden` 属性强在"副作用也停了"（视频这类 effect 型副作用自动刹车），是 keep-mounted 的未来标准写法；宿主 React ≥ 19.2 可直接替换自研实现。

**完整代码**：

```tsx
// TabPanelHost.tsx —— 三策略 + 版本化缓存失效的统一宿主
import { useState, type ReactNode } from 'react';

export type MountMode = 'lazy-keep' | 'force' | 'destroy';

export interface PanelItem {
  key: string;
  children: ReactNode;
  mountMode?: MountMode; // 默认 lazy-keep
  version?: number;      // 版本号变化 → 面板重建 → 缓存失效
}

export function TabPanelHost({ activeKey, items }: { activeKey: string; items: PanelItem[] }) {
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([activeKey]));
  // 渲染期补账（React 官方"渲染中修正 state"模式）：激活新页签当帧即记账，
  // 比 useEffect 少一帧"面板闪空"。只在新增 key 时 setState，不会循环。
  if (!visited.has(activeKey)) setVisited(new Set(visited).add(activeKey));

  return (
    <>
      {items.map(({ key, children, mountMode = 'lazy-keep', version = 0 }) => {
        const active = key === activeKey;
        const shouldMount =
          mountMode === 'destroy' ? active
          : mountMode === 'force' ? true
          : visited.has(key); // lazy-keep：激活过就一直在
        if (!shouldMount) return null;
        return (
          <div
            key={version > 0 ? `${key}::v${version}` : key} // 版本号拼进 key：变版本 = 换元素 = 失效缓存
            role="tabpanel"
            hidden={!active}
          >
            {children}
          </div>
        );
      })}
    </>
  );
}
```

```tsx
// usePanelActive.ts —— keep-mounted 的副作用刹车：失活即停
import { useEffect, useRef } from 'react';

/** 面板内容感知自己的激活态：视频 pause、轮询 clearInterval、动画 cancel 都挂在这 */
export function usePanelActive(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevActive = useRef(active);
  useEffect(() => {
    if (prevActive.current && !active) videoRef.current?.pause(); // 失活沿：刹车
    prevActive.current = active;
  }, [active]);
  return videoRef;
}

// 用法：<video ref={usePanelActive(isActive)} /> —— DOM 还在、内存还占，但声音立刻停。
```

```tsx
// React 19.2+：官方原生 keep-mounted 原语（此前实验名 <Offscreen>）
import { Activity } from 'react';

function Panel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <Activity mode={active ? 'visible' : 'hidden'}>
      {children}
    </Activity>
  );
}
// hidden：组件 state 保留、界面不参与布局渲染、effects 卸载——
// 视频自动停、定时器自动清（effect 型副作用），比 hidden 属性语义更强。
// 注意：低版本 React 直接报错，库代码要按宿主版本 gate。
```

antd 侧对照：`destroyInactiveTabPane`（Tabs 级）、`forceRender`（item 级）对应 destroy/force 两端；antd 没有内置版本化失效，业务上通常用 `items` 重新生成时换 children 引用 + `destroyOnHidden` 组合达成同等效果（v5.25 起 `destroyInactiveTabPane` 更名 `destroyOnHidden`，旧名仍兼容）。

**坑（症状 → 根因 → 修法）**：

```text
坑 6
症状：切走视频页签后声音还在播；后台轮询页签切走后请求照发。
根因：keep-mounted 保住的是 React state，DOM 副作用（播放/定时器/IO 观察者）不会因为 hidden 自动停。
修法：usePanelActive 类的失活钩子统一刹车；或 React ≥19.2 直接用 <Activity>（effects 自动卸载）。

坑 7
症状：destroy 策略的表单页签切回来：填的值还在，但上次的校验错误提示没了。
根因：rc-field-form 卸载字段时值默认 preserve 保留、校验状态不保留——"半保 state"。
修法：表单页签不用 destroy（用 forceRender）；或切回时业务显式 trigger 一次 revalidate。

坑 8
症状：keep-mounted 面板里的列表数据停在一小时前。
根因：keep 即缓存，但没有失效机制——挂载策略只管"在不在"，不管"新不新"。
修法：版本化 key（本节 TabPanelHost）：version 变 → 元素重建 → state 与请求缓存整体作废。

坑 9
症状：自定义样式后面板全部叠在一起显示。
根因：CSS reset 或自定义 display 覆盖了 hidden 属性的 UA 样式（[hidden] 的 display:none 优先级很低）。
修法：库样式里显式 [hidden] { display: none !important }，或改用条件渲染。
```

#### 考点 6：动态页签——受控 keys、增删与激活态转移

**是什么**：浏览器页签式的可增删 Tabs（antd 的 `type="editable-card"`）。动态化把 Tabs 从"静态配置"变成"运行时数据"，三个新问题随之而来：**keys 的所有权**（受控模型）、**关闭激活页签后激活给谁**（转移策略）、**新增页签怎么让用户看见**（滚动到可见）。

**为什么难**：静态 Tabs 的 key 写死在 JSX 里，永远不会失效；动态页签的 key 是运行时身份，一旦用 index 当 key、或关闭后激活态没转移，症状是"状态串页签""面板区空白"这类极难复现的 bug。激活转移看似小事，却是产品语义决策——关掉当前页签，焦点给左边还是右边？各浏览器给了不同答案，组件库必须把答案**写死在代码并写进文档**。

**机制**：

1. **受控模型**：items（含 keys）与 activeKey 都归业务持有，组件只发事件（`onAdd`/`onRemove`/`onChange`）。组件内部绝不偷偷增删 keys——"受控数据单一数据源"（A1 纪律的集合版）。
2. **激活转移策略**（本节采用"右邻优先、末尾回左邻、全关为空"的浏览器惯例）：关闭的**不是**激活页签时激活态不动；关闭的是激活页签时优先右邻，关的是最后一个则给左邻；全关完回 `null`，由业务决定回退页或显示"新建引导"。
3. **新增后滚动到可见**：新增页签通常落在溢出区右端，不滚过去用户以为没点上、连点 N 次——新增后在 effect 里把新页签滚进视口（滚动实现见考点 7 的手写数学）。

**完整代码**：

```ts
// dynamic-tabs.ts —— 增删与激活转移的纯逻辑层（可单测）
export interface DynTab { key: string; label: string }

export interface DynTabsState { tabs: DynTab[]; activeKey: string | null }

export type DynTabsEvent =
  | { type: 'add'; tab: DynTab }
  | { type: 'remove'; key: string }
  | { type: 'activate'; key: string };

/** 关闭页签后的激活转移：非激活页签被关 → 激活态不动；激活页签被关 → 右邻优先，末尾回左邻 */
export function nextActiveAfterRemove(
  tabs: readonly DynTab[], removedIdx: number, currentActive: string | null,
): string | null {
  if (currentActive !== tabs[removedIdx]?.key) return currentActive;
  const neighbor = tabs[removedIdx + 1] ?? tabs[removedIdx - 1]; // 优先右邻；关的是最后一个 → 左邻
  return neighbor ? neighbor.key : null;                          // 全关完：null
}

export function dynTabsReducer(s: DynTabsState, ev: DynTabsEvent): DynTabsState {
  switch (ev.type) {
    case 'add':
      return { tabs: [...s.tabs, ev.tab], activeKey: ev.tab.key }; // 新增即激活
    case 'remove': {
      const idx = s.tabs.findIndex((t) => t.key === ev.key);
      if (idx < 0) return s; // 边界：重复关闭/未知 key 幂等
      return {
        tabs: s.tabs.filter((t) => t.key !== ev.key),
        activeKey: nextActiveAfterRemove(s.tabs, idx, s.activeKey),
      };
    }
    case 'activate':
      return s.activeKey === ev.key ? s : { ...s, activeKey: ev.key };
  }
}
```

```tsx
// DynamicTabs.tsx —— 受控 items + 事件外发；组件不藏 keys
import { useEffect, useRef } from 'react';
import { dynTabsReducer, type DynTab, type DynTabsEvent } from './dynamic-tabs';

export function DynamicTabs({
  tabs, activeKey, onAdd, onRemove, onChange,
}: {
  tabs: DynTab[];                      // 受控：keys 归业务
  activeKey: string | null;            // 受控：激活态也归业务
  onAdd: () => void;                   // 组件只发事件：新增页签的 key/label 由业务生成并回灌 items
  onRemove: (key: string) => void;
  onChange: (key: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // 事件编排层：用受控真值（props）跑一遍 reducer 拿转移结果，全部以事件外发——
  // 组件内部不落 tabs 真值，杜绝双数据源（坑 13）。
  const send = (ev: DynTabsEvent) => {
    const next = dynTabsReducer({ tabs, activeKey }, ev);
    if (ev.type === 'remove') onRemove(ev.key);
    if (ev.type === 'add') onAdd();
    if (next.activeKey && next.activeKey !== activeKey) onChange(next.activeKey); // 激活转移结果外发
  };

  // 新增后滚到可见：tabs.length 变长 → 最后一项滚进视口（滚动数学见考点 7）
  useEffect(() => {
    const el = listRef.current;
    if (!el || !el.lastElementChild) return;
    const last = el.lastElementChild as HTMLElement;
    el.scrollLeft = last.offsetLeft + last.offsetWidth - el.clientWidth; // 贴右对齐
  }, [tabs.length]);

  return (
    <div>
      <div ref={listRef} role="tablist" style={{ display: 'flex', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <div key={t.key} role="tab" aria-selected={t.key === activeKey}
               style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
            <button type="button" onClick={() => onChange(t.key)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer',
                             color: t.key === activeKey ? '#1677ff' : undefined }}>
              {t.label}
            </button>
            <button type="button" aria-label={`关闭 ${t.label}`}
                    onClick={(e) => { e.stopPropagation(); send({ type: 'remove', key: t.key }); }} // 关闭不激活
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
          </div>
        ))}
        {/* 示例触发器：本地生成占位 tab 只为让 reducer 算出转移结果；生产实现由 onAdd 里业务生成并回灌 items */}
        <button type="button" aria-label="新增页签" onClick={() => send({ type: 'add', tab: { key: `tab-${Date.now()}`, label: '新页签' } })}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>＋</button>
      </div>
      {/* 面板宿主接考点 5 的 TabPanelHost */}
    </div>
  );
}
```

antd 写法对照：

```tsx
import { Tabs } from 'antd';

<Tabs
  type="editable-card"                     // 可增删形态：每个页签带关闭钮 + 尾部加号
  hideAdd={false}                          // 隐藏内置加号则 true（自己放触发器时）
  onEdit={(action, info) => {              // action: 'add' | 'remove'（remove 时 info 是被删 key）
    if (action === 'remove') handleRemove(info as string);
  }}
  activeKey={activeKey}                    // 受控激活：关闭激活页签后 antd 会自动转移到相邻项
  items={items}                            // 受控 keys：增删由业务 setState items 完成
/>
```

最小 Vitest（激活转移是动态页签的灵魂逻辑，穷举四种位置）：

```ts
// dynamic-tabs.test.ts
import { describe, it, expect } from 'vitest';
import { dynTabsReducer, nextActiveAfterRemove, type DynTab } from './dynamic-tabs';

const tabs: DynTab[] = [
  { key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' },
];

describe('nextActiveAfterRemove', () => {
  it('关的不是激活页签 → 激活态不动', () => {
    expect(nextActiveAfterRemove(tabs, 0, 'b')).toBe('b');
  });
  it('关的是激活页签（中间）→ 右邻接管', () => {
    expect(nextActiveAfterRemove(tabs, 1, 'b')).toBe('c');
  });
  it('关的是最后一个激活页签 → 回左邻', () => {
    expect(nextActiveAfterRemove(tabs, 2, 'c')).toBe('b');
  });
  it('全关完 → null（业务决定回退）', () => {
    expect(nextActiveAfterRemove([tabs[0]], 0, 'a')).toBeNull();
  });
});

describe('dynTabsReducer', () => {
  it('新增即激活；重复 remove 幂等', () => {
    let s = dynTabsReducer({ tabs, activeKey: 'a' }, { type: 'add', tab: { key: 'd', label: 'D' } });
    expect(s.activeKey).toBe('d');
    s = dynTabsReducer(s, { type: 'remove', key: 'ghost' });
    expect(s.tabs).toHaveLength(4); // ghost 不存在：原样返回
  });
});
```

**坑（症状 → 根因 → 修法）**：

```text
坑 10
症状：删掉一个页签后，另一个页签的内容/滚动位置串了。
根因：用 index 当 key——增删后 index 错位，React 复用错元素。
修法：key 用业务身份（id），运行时生成用递增序号/uid，绝不用 index（Tree 坑 1 同族铁律）。

坑 11
症状：关闭当前页签后面板区空白，页签栏还剩好几项。
根因：没做激活转移，activeKey 指向已删除的 key。
修法：nextActiveAfterRemove 的四分支穷举（本节），并把策略写进文档。

坑 12
症状：新增页签"没反应"，用户连点加号开了一排。
根因：新增页签落在溢出区没有滚动到可见，且新增后未激活——两件事都是"新增即激活 + 滚动到可见"该做的。
修法：add 后置 activeKey 并把新页签滚进视口（本节 useEffect）。

坑 13
症状：组件内部藏了一份 tabs state，业务删除后页面与真值不同步。
根因：动态页签的 keys 是业务数据，组件非受控复制了一份——双数据源。
修法：items/keys 全受控，组件只发事件（本节受控模型）；内部 reducer 只做转移计算不落真值。
```

#### 考点 7：溢出滚动进阶——渐隐遮罩、滚动同步与手写滚动数学

**是什么**：考点 3 给了"溢出箭头 + active 追随 scrollIntoView"的骨架，本节补三块进阶：**左右渐隐遮罩**（与箭头并列的另一种溢出提示方案）、**滚动同步**（滚动时指示条与遮罩的状态一致）、**手写滚动数学**（替代 scrollIntoView 的精确控制）。

**为什么难**：遮罩方案有个反直觉的坑——CSS `mask` 影响命中测试，渐隐到全透明的区域**点不到**，页签明明看得见却点不响；滚动同步的难点在于指示条几何（考点 4 的 FLIP）记录的是布局坐标，滚动本身不动布局，两种坐标系极易混淆；而 scrollIntoView 在特定页面结构下会连滚外层（[03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md](03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md) 坑 1 在 Tabs 场景同样成立），组件库想要"绝不带动页面滚动"就得自己写数学。

**机制**：

1. **渐隐遮罩**：`mask-image` 的 linear-gradient 按滚动位置动态生成——滚到最左则左侧渐隐关闭（内容从最左开始没必要提示），能往右滚则右侧渐隐开启。它与箭头方案二选一：遮罩安静优雅适合内容型页签，箭头可点击适合工具型页签。
2. **滚动同步**：onScroll 时同步两件事——遮罩形态（重算 mask 字符串）与指示条位置（若指示条挂在滚动容器**外**，需按 scrollLeft 平移；挂在容器内则布局坐标天然随内容滚动，无需处理）。触控板惯性滚动会高频触发 scroll，重算逻辑要做到"值不变不 setState"并用 rAF 节流。
3. **手写滚动数学**：`scrollIntoView` 会尽义务滚所有可滚祖先；手写只动容器自身。核心是两行比较：目标行左缘露出不足 → 贴左；右缘超出 → 贴右。前提是容器为 `position: relative`（保证 `offsetLeft` 相对容器而非更外层）。

**完整代码**：

```ts
// edge-mask.ts —— 遮罩形态的纯函数（可单测）：能往哪滚，哪边就渐隐
export function edgeMask(canLeft: boolean, canRight: boolean, fade = 24): string {
  const stops: string[] = [];
  stops.push(canLeft ? 'transparent 0' : 'black 0');
  stops.push(`black ${fade}px`);
  stops.push(`black calc(100% - ${fade}px)`);
  stops.push(canRight ? 'transparent 100%' : 'black 100%');
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
```

```tsx
// FadingTabList.tsx —— 渐隐遮罩 + 滚动同步 + 手写滚动数学的完整容器
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { edgeMask } from './edge-mask';

export function FadingTabList({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // 溢出/滚动同步：scroll 与 ResizeObserver 共用同一检查，值不变不刷
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const left = el.scrollLeft > 0;
      const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    const scheduled = () => { if (!raf) raf = requestAnimationFrame(check); }; // 惯性滚动 rAF 节流
    check();
    const ro = new ResizeObserver(scheduled);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild); // 内容增删/字体加载
    el.addEventListener('scroll', scheduled, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('scroll', scheduled);
    };
  }, []);

  // active 追随：手写数学，只动容器 scrollLeft，绝不连滚页面（对照 A2 坑 1）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-tab-key="${activeKey}"]`);
    if (active) scrollRowIntoView(el, active);
  }, [activeKey]);

  return (
    // 遮罩施加在滚动容器上：注意 mask 会影响命中测试——渐隐区只应覆盖边缘空白，
    // 若首个页签会滚进渐隐区，改用"装饰遮罩层"方案（见坑 14）。
    <div
      ref={scrollRef}
      style={{
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
        position: 'relative', // 手写数学的前提：让 offsetLeft 相对本容器
        maskImage: edgeMask(edges.left, edges.right),
        WebkitMaskImage: edgeMask(edges.left, edges.right), // Safari 需要 -webkit- 前缀（15.4 起支持无前缀）
      }}
      // 滚动同步（遮罩形态更新）在上方 effect 里做：onScroll 只触发原生事件，React 无需再挂
    >
      {children}
    </div>
  );
}

/** 手写滚动数学：把目标行滚进容器视口，只动 container.scrollLeft。
 *  与 scrollIntoView 的差别：后者会尽义务滚动所有可滚祖先（页面跟着滚），前者绝对局部。 */
export function scrollRowIntoView(container: HTMLElement, row: HTMLElement, padding = 8): void {
  const left = row.offsetLeft;                       // 相对 offsetParent——容器必须 position:relative
  const right = left + row.offsetWidth;
  if (left - padding < container.scrollLeft) {
    container.scrollLeft = left - padding;           // 左缘没露够：贴左
  } else if (right + padding > container.scrollLeft + container.clientWidth) {
    container.scrollLeft = right + padding - container.clientWidth; // 右缘超出：贴右
  }
  // 两条件都不满足 = 已在视口内：不动（scrollIntoView('nearest') 的等价语义）
}
```

```tsx
// 装饰遮罩层方案：mask 命中测试坑的替代——渐隐只是视觉，不裁剪交互
export function FadeOverlay({ left, right }: { left: boolean; right: boolean }) {
  return (
    <>
      {left && (
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, pointerEvents: 'none',
          background: 'linear-gradient(to right, #fff, transparent)', // 需要与容器底色一致——这是它的代价
        }} />
      )}
      {right && (
        <div aria-hidden style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, pointerEvents: 'none',
          background: 'linear-gradient(to left, #fff, transparent)',
        }} />
      )}
    </>
  );
}
```

最小 Vitest（遮罩形态是纯字符串逻辑，边界一次穷举）：

```ts
// edge-mask.test.ts
import { describe, it, expect } from 'vitest';
import { edgeMask } from './edge-mask';

describe('edgeMask', () => {
  it('双边可滚：两端渐隐', () => {
    expect(edgeMask(true, true)).toBe(
      'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
    );
  });
  it('贴死左边：左渐隐关闭，只提示右边', () => {
    expect(edgeMask(false, true)).toBe(
      'linear-gradient(to right, black 0, black 24px, black calc(100% - 24px), transparent 100%)',
    );
  });
  it('完全放得下：纯 black（无渐隐）', () => {
    expect(edgeMask(false, false)).toBe(
      'linear-gradient(to right, black 0, black 24px, black calc(100% - 24px), black 100%)',
    );
  });
});
```

**坑（症状 → 根因 → 修法）**：

```text
坑 14
症状：滚到中间时，最左/最右的页签看得见半截却点不中。
根因：CSS mask 影响命中测试——alpha 趋零的区域不响应指针，渐隐同时"渐隐了可点区"。
修法：a) 渐隐宽度只覆盖边缘空白（首尾页签不会被滚进渐隐区的布局）；b) 改用 FadeOverlay 装饰层方案（视觉渐隐 + pointerEvents:none，代价是要知道底色）。

坑 15
症状：切换页签时页面竖向跟着滚了一下。
根因：用了 scrollIntoView——浏览器义务是把所有可滚祖先都滚到让元素"完全可见"。
修法：手写 scrollRowIntoView 数学（本节），只动容器 scrollLeft；容器加 position:relative 保证 offsetLeft 基准正确。

坑 16
症状：触控板横滑页签栏时 CPU 飙高/掉帧。
根因：scroll 事件在惯性滚动期间高频触发，每次都同步 setState + 重算遮罩。
修法：rAF 节流（本节 scheduled）+ 值不变不 setState（edges 比较）。

坑 17
症状：指示条在页签滚动后停在错误位置/不动。
根因：指示条挂在滚动容器外，但几何用的是容器内布局坐标——两种坐标系混淆。
修法：指示条挂容器内（布局坐标天然随滚动）或滚动时按 scrollLeft 平移指示条（考点 4 FLIP 记录的是布局坐标，滚动不动布局，FLIP 不需要重跑）。
```

---

## 附:ASCII 图替换清单

本文档图形化改版,原 ASCII 字符图与 Mermaid 图表对应关系如下:

| 原图位置 / 标题 | 处理结果 |
| --- | --- |
| 考点 1 aria 契约对照表(元素/role/关键 aria 属性/键盘行为) | 保留原图(多列对照表,Mermaid 无等价图表类型) |
