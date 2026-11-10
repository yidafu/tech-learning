---
title: "Collapse（★★☆）"
---

> 本文是《Lv3 复杂交互组件（公认最考功力）》按小节拆分后的续篇，上一部分见 [16-Tabs.md](16-Tabs.md)。

### Collapse（★★☆）

Collapse 星级不高，但它考的是 CSS 过渡模型的一个**原理级**问题：`height: auto` 为什么不能过渡。这道题是 CSS 面试的经典，也是手风琴组件 90% 动画 bug 的总根因。

考点清单（原文）：

- `height: auto` 不能过渡的经典难题 → `grid-template-rows: 0fr→1fr` 技巧或测量固定高

#### 考点 1：height: auto 为什么不能过渡

CSS transition 的工作方式是：在**起始计算值**与**结束计算值**之间做数值插值。而 `auto` 不是数值——它是"渲染时根据内容算出来"的指令，在布局发生前没有确定的像素值。规范层面 `height` 的 auto 值不可插值（non-interpolable），于是 `auto → 300px` 的过渡会**瞬跳**：浏览器把起点当作"无值可用"，直接显示终点。

推论有两个，都很致命：

- `height: 0 → auto` 同样瞬跳（展开方向也别想免费拿到动画）；
- 就算你量出固定高（0 → 240px），内容一变（异步数据到了、窗口缩放让文本换行）240px 就错了——**固定高是撒谎，auto 才是真相**。

于是手风琴动画史上有三条路：测量法（JS 把 auto 翻译成 px）、max-height 法（取一个足够大的上界，但有"动画时长分配不均"的怪癖）、以及现代正解——**grid 的 fr 插值**。

#### 考点 2：grid-template-rows: 0fr → 1fr（完整代码）

`fr` 单位是数值（比例因子），**可插值**。把"展开/收起"翻译成"行轨道从 0 份到 1 份"，浏览器替你做了全部数学——内容多高它就长多高，**内容变化时动画终点自动正确**，这正是 auto 做不到的。两个必要零件：外层 `display: grid` + 单轨道 `grid-template-rows`，内层 `overflow: hidden; min-height: 0`（`min-height: 0` 是最常见漏项——grid item 的自动最小尺寸是 min-content，不给 0 的话 0fr 收不起来）：

```tsx
import { useState } from 'react';

/** 纯 CSS 动画的折叠项：无测量、无 JS 高度管理 */
export function CollapseItem({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}>
      <button
        type="button"
        aria-expanded={open}                       // 无障碍：折叠语义的标准属性
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer' }}
      >
        {title}
      </button>
      <div className="clp-wrap" data-open={open}>  {/* data 属性驱动 CSS，避免内联样式覆盖 transition */}
        <div className="clp-inner">{children}</div>
      </div>
    </div>
  );
}
```

```text
/* 样式：0fr → 1fr 的插值就是过渡本体 */
.clp-wrap {
  display: grid;
  grid-template-rows: 0fr;              /* 收起：行轨道占 0 份空间 */
  transition: grid-template-rows 0.25s ease;
}
.clp-wrap[data-open="true"] {
  grid-template-rows: 1fr;              /* 展开：占满——具体多高由内容决定，但插值仍然成立 */
}
.clp-inner {
  overflow: hidden;                     /* 内容在 0 轨道里必须可裁剪 */
  min-height: 0;                        /* 关键！grid item 的自动最小尺寸（min-content）会顶住轨道，不置 0 就收不起 */
}
```

兼容性（`grid-template-rows` 的 fr 插值）：Chrome 107+、Safari 16+、Firefox 66+，2026 年的中后台基线环境完全可用；若要照顾更老的内嵌 WebView，回落到考点 3 的测量法。

#### 考点 3：测量固定高的备选方案（+ Radix 的变量法）

**测量法**：展开时读 `scrollHeight`（auto 内容的真实高），把 transition 的终点从 auto 换成这个 px 值；**动画结束后把 height 交还给 auto**（否则内容再变高就被裁）；收起则反过来：先从 auto 切到当前 scrollHeight（跳变不可见），下一帧再过渡到 0：

```tsx
import { useRef, useState } from 'react';

/** 测量法折叠：scrollHeight 驱动 + transitionend 归还 auto */
export function MeasuredCollapse({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto'); // 动画外的稳态恒为 auto
  const innerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const el = innerRef.current;
    if (!el) return;
    if (!open) {
      setHeight(el.scrollHeight);                                  // 展开：先固定到内容高（起点 0 由 CSS 提供）
      setOpen(true);
    } else {
      setHeight(el.scrollHeight);                                  // 收起：先从 auto 落到具体 px（同值跳变，不可见）
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0))); // 双 rAF 确保先"定格"再过渡
      setOpen(false);
    }
  };

  return (
    <div>
      <button aria-expanded={open} onClick={toggle} type="button">{title}</button>
      <div
        ref={innerRef}
        style={{
          height,
          overflow: 'hidden',
          transition: height === 'auto' ? 'none' : 'height .25s ease', // 稳态 auto 下关过渡，防内容变化误触发
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'height' && open) setHeight('auto');  // 展开动画结束：归还 auto，内容可自由长高
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

**Radix 的变量法**：Radix Collapsible 不做 JS 测量，它在展开时把内容真实高度写进 CSS 变量 `--radix-collapsible-content-height`，动画用 keyframes 从 0 演到 `var(...)`。思路与测量法同源（把 auto 翻译成 px），但翻译结果进了 CSS 变量，动画本体保持声明式：

```tsx
import * as Collapsible from '@radix-ui/react-collapsible';

<Collapsible.Root>
  <Collapsible.Trigger>展开</Collapsible.Trigger>
  <Collapsible.Content className="clp-content">内容</Collapsible.Content>
</Collapsible.Root>
```

```text
/* Radix 注入 --radix-collapsible-content-height，keyframes 引用它 */
@keyframes clp-down { from { height: 0 } to { height: var(--radix-collapsible-content-height) } }
@keyframes clp-up   { from { height: var(--radix-collapsible-content-height) } to { height: 0 } }
.clp-content[data-state="open"]   { animation: clp-down .25s ease }
.clp-content[data-state="closed"] { animation: clp-up .25s ease }
```

antd v5 的 Collapse 走的是 rc-motion 的 JS 测量路线（测高 → css transition → 结束回调），与上面 MeasuredCollapse 的机制一致，工程上多了中断与减速运动的处理。

#### 考点 4：嵌套手风琴

嵌套的麻烦在"外层的高度是多少"：内层展开时外层内容变高——测量法里外层若停在固定 px 就会把内层裁掉；**grid 技巧天然免疫**（外层轨道 1fr 的语义就是"内容多高我多高"，内层动画只是让"内容高"这个事实平滑变化）。所以嵌套场景直接全链路 grid 化：

```tsx
import { useState } from 'react';
import { CollapseItem } from './CollapseItem'; // 考点 2 的 grid 版实现

/** 嵌套手风琴：每层独立 open 状态，grid 技巧让外层高度自动跟随内层 */
export function NestedAccordion() {
  const [outerOpen, setOuterOpen] = useState(true);
  return (
    <div>
      <button aria-expanded={outerOpen} onClick={() => setOuterOpen((o) => !o)} type="button">
        分组一
      </button>
      <div className="clp-wrap" data-open={outerOpen}>
        <div className="clp-inner" style={{ paddingLeft: 12 /* 每层只加缩进，不复用高度逻辑 */ }}>
          <CollapseItem title="子项 1">子项 1 内容</CollapseItem>
          <CollapseItem title="子项 2（内层再嵌套）">
            <CollapseItem title="孙项 1">孙项内容</CollapseItem>
          </CollapseItem>
        </div>
      </div>
    </div>
  );
}
```

只开一个的"手风琴模式"（accordion）与全开模式（多个同时开）只是 `open` 状态的形状差异：accordion 用单值，全开用数组——与 Tabs 考点 1 的受控设计完全同构。

#### Collapse 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：grid 技巧"展开正常、收不起/收起时内容闪一下"。
根因：内层漏了 min-height: 0，grid item 的自动最小尺寸（min-content）把 0fr 轨道顶住了。
修法：.clp-inner 加 min-height: 0; overflow: hidden（见考点 2）。

坑 2
症状：测量法快速连点时动画卡在半高。
根因：transitionend 没触发（中途反向打断）就把 height 钉在了某个 px。
修法：transitionend 只处理 propertyName === 'height'；打断时直接同步 scrollHeight 重启；关键路径再加 setTimeout 兜底（Part A3 的双保险纪律）。

坑 3
症状：父容器 display: none（页签未激活）时测量高度为 0，切回来动画异常。
根因：display:none 下 scrollHeight 是 0，测量时机错了。
修法：改为容器可见后测量（IntersectionObserver / 页签激活回调），或干脆用 grid 技巧免测量。

坑 4
症状：展开后内容里的图片加载完成，内容变高被裁剪。
根因：测量法把 height 钉死在展开瞬间的 scrollHeight。
修法：动画结束立即归还 auto（见考点 3），或直接用 grid/Radix 变量法。
```

---

> 以下考点 5–7 为续补小节（编号续接上文考点 4）：三方案对决、嵌套高度传递与手风琴受控。坑条目就近放在各考点末尾，编号续排。

#### 考点 5：height: auto 三方案对决——max-height 补全、对比矩阵与中断续接

**是什么**：考点 2（grid fr）与考点 3（JS 测量 + Radix 变量法）已各讲了一种方案，本节补上历史最悠久的第三种——**max-height 过渡**，并把三方案放在同一张矩阵里对比。重点补一个前文没展开的维度：**中断续接表现**——动画播到一半反向操作时，哪种方案能从当前位置平滑折返，哪种会跳变。这与 [04-A3-退出动画-难题-visible-mounted-双状态机.md](04-A3-退出动画-难题-visible-mounted-双状态机.md) A3.9 的中断续接是同一族问题：动画的"起点"不是初始值，而是被打断那一刻的计算值。

**为什么难**：三方案的差异不在"能不能展开收起"（都能），而在三个隐性维度上：内容变化时终点对不对、中断时续不续接得平、要不要 JS。选型答错的症状都是延迟暴露的——内容里加载出一张图片、用户手快连点两下，问题才现形。

**机制**：

**（1）max-height 方案**：把"展开"翻译成"max-height 从 0 过渡到一个足够大的上界"。零测量、零 JS，但有个先天缺陷——**时长分配不均**：内容实际高 120px 而上界设了 400px 时，收起动画的前 70% 时间在"从 400px 压到 120px"这段**看不见的区间**里空转，视觉上"先顿一下再动"；缓动曲线还播在错误区间上，收起"先快后慢"的观感全乱。上界贴着内容设就没这问题——但"贴着内容"就意味着要测量，那就变成测量法了。它真正适合的场景：内容高度已知且稳定（设计稿固定的折叠面板）。

```tsx
// MaxHeightCollapse.tsx —— max-height 方案：最简单，代价是时长错位
import { useState } from 'react';

export function MaxHeightCollapse({ title, children, maxHeight = 400 }: {
  title: React.ReactNode; children: React.ReactNode; maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{title}</button>
      <div style={{
        maxHeight: open ? maxHeight : 0, // 展开的上界：需 >= 内容真实高，否则裁剪
        overflow: 'hidden',
        transition: 'max-height .3s ease',
      }}>
        {children}
      </div>
    </div>
  );
}
```

**（2）三方案对比矩阵**（grid fr = 考点 2、测量法 = 考点 3、max-height = 本节）：

| 维度 | grid 0fr→1fr | JS 测量（scrollHeight） | max-height |
|---|---|---|---|
| 原理 | fr 是数值可插值，轨道 = 内容高 | 把 auto 翻译成 px，结束归还 auto | 上界过过渡，真实高藏在上界内 |
| 内容变化自适应 | 天然（1fr 永远 = 当前内容高） | 需归还 auto + 再次展开重测 | 上界拍脑袋，错了就裁内容 |
| 中断续接 | **最好**：transition 的数值插值天然可逆，反向时从当前计算值续播 | **最差**：transitionend 不会来，height 钉在中间 px，必须手动重置（见下 reducer） | 可逆（数值过渡），但续接播的还是错位时长 |
| JS 依赖 | 无 | 重（测量 + 归还 + 兜底） | 无 |
| 兼容性 | Chrome 107+ / Safari 16+ / FF 66+ | 全版本 | 全版本 |
| 适用 | 现代基线的默认选择 | 需兼容老 WebView；要精确控制时长曲线 | 内容高度已知稳定的窄场景 |

**（3）测量法的中断续接状态机**：把"动画进行中反向"处理成显式状态迁移，而不是靠 transitionend 兜底碰运气。四个状态 + 两个事件，reducer 纯函数可穷举测试（A3.8 的纪律）：

```ts
// collapse-phase.ts —— 折叠动画相位机：toggle 在动画中即"反向续接"
export type ClsPhase = 'closed' | 'opening' | 'open' | 'closing';

export type ClsEvent = { type: 'toggle' } | { type: 'end' }; // end = transitionend（高度属性）

export function clsPhaseReducer(phase: ClsPhase, ev: ClsEvent): ClsPhase {
  switch (ev.type) {
    case 'toggle':
      // 动画中 toggle = 反向：opening→closing / closing→opening（中断续接的语义层）
      if (phase === 'closed') return 'opening';
      if (phase === 'open') return 'closing';
      return phase === 'opening' ? 'closing' : 'opening';
    case 'end':
      if (phase === 'opening') return 'open';
      if (phase === 'closing') return 'closed';
      return phase; // 已在稳态收到 end（兜底 timeout 补发）：幂等
  }
}
```

```tsx
// RobustCollapse.tsx —— 中断续接的完整接线：反向时从"当前计算值"重新锁起点
import { useReducer, useRef, useState } from 'react';
import { clsPhaseReducer, type ClsPhase } from './collapse-phase';

export function RobustCollapse({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [phase, dispatch] = useReducer(clsPhaseReducer, 'closed');
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const innerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const el = innerRef.current;
    if (!el) return;
    // 关键：锁的起点是"当前视觉高度"（动画中间态也是有效起点），不是 scrollHeight（全量内容高）
    setHeight(el.getBoundingClientRect().height);
    const target: ClsPhase = phase === 'open' || phase === 'opening' ? 'closing' : 'opening';
    // 双 rAF：先让"锁定帧"提交，再宣布目标，transition 才会从锁定点向新终点播放
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setHeight(target === 'closing' ? 0 : el.scrollHeight);
    }));
    dispatch({ type: 'toggle' });
  };

  const openish = phase === 'opening' || phase === 'open';
  return (
    <div>
      <button type="button" aria-expanded={openish} onClick={toggle}>{title}</button>
      <div
        ref={innerRef}
        style={{
          height,
          overflow: 'hidden',
          transition: height === 'auto' ? 'none' : 'height .25s ease',
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName !== 'height') return; // 只认高度属性（A3 坑的同类纪律）
          dispatch({ type: 'end' });
          if (phase === 'opening') setHeight('auto'); // 到达展开稳态：归还 auto（考点 3 纪律）
        }}
      >
        {children}
      </div>
    </div>
  );
}
// 工程补强（略）：transitionend 之外加 setTimeout(时长+50ms) 兜底双保险（A3.3 的纪律），
// 兜底触发时幂等（reducer 的 end 已处理稳态重复事件）。
```

最小 Vitest（相位机穷举）：

```ts
// collapse-phase.test.ts
import { describe, it, expect } from 'vitest';
import { clsPhaseReducer } from './collapse-phase';

describe('clsPhaseReducer 中断续接', () => {
  it('稳态 toggle：closed↔open 起动画', () => {
    expect(clsPhaseReducer('closed', { type: 'toggle' })).toBe('opening');
    expect(clsPhaseReducer('open', { type: 'toggle' })).toBe('closing');
  });
  it('动画中 toggle = 反向续接', () => {
    expect(clsPhaseReducer('opening', { type: 'toggle' })).toBe('closing');
    expect(clsPhaseReducer('closing', { type: 'toggle' })).toBe('opening');
  });
  it('end 收敛到稳态；稳态收到 end 幂等', () => {
    expect(clsPhaseReducer('opening', { type: 'end' })).toBe('open');
    expect(clsPhaseReducer('closing', { type: 'end' })).toBe('closed');
    expect(clsPhaseReducer('open', { type: 'end' })).toBe('open');
  });
  it('连点两下（opening→closing→opening）后 end 仍收敛 open', () => {
    let p = clsPhaseReducer('closed', { type: 'toggle' });
    p = clsPhaseReducer(p, { type: 'toggle' });
    p = clsPhaseReducer(p, { type: 'toggle' });
    expect(p).toBe('opening');
    expect(clsPhaseReducer(p, { type: 'end' })).toBe('open');
  });
});
```

**坑（症状 → 根因 → 修法）**：

```text
坑 5
症状：max-height 方案收起时"先顿 200ms 再动"，展开"最后一段变慢"。
根因：上界远大于内容高——动画时长按上界区间分配，真实可见区间只分到尾部一小段。
修法：内容高度已知就把上界贴着设；不确定就换 grid 或测量法（本节矩阵）。

坑 6
症状：grid 方案一切正常，测量法快速连点后高度卡死在中间值。
根因：transitionend 在中途反向时永远不触发，height 钉在打断瞬间的 px。
修法：toggle 时从 getBoundingClientRect().height 重新锁起点 + 双 rAF 宣布新目标（本节 RobustCollapse）；transitionend 只处理 propertyName==='height'。

坑 7
症状：Radix 变量法（keyframes）动画中反向，内容闪回全高再播收起。
根因：animation 的中断语义是"换 animation-name 从头播"，不像 transition 能从当前值续。
修法：交互频繁的折叠用 transition 系方案；Radix 形态适合低频的展示型折叠。

坑 8
症状：收起动画结束后内容仍露出一条缝（1-2px）。
根因：grid 的 0fr 收起时内层仍有 min-content 最小尺寸顶住；或测量法收起目标写成了 scrollHeight 的舍入值。
修法：grid 检查内层 min-height: 0 + overflow: hidden（考点 2）；测量法收起目标写死 0。
```

#### 考点 6：嵌套高度传递——测量法语境下的 ResizeObserver 跟随

**是什么**：考点 4 已说 grid 技巧对嵌套"天然免疫"（外层 1fr 轨道永远等于当前内容高，内层展开只是让"内容高"这个事实平滑变化）。本节讲测量法语境下的同类问题：**子折叠展开时，父的高度动画怎么跟着走**。方案是 ResizeObserver 监听内容元素，动画进行中动态修正终点。

**为什么难**：测量法的父容器在动画期间停在某个**固定 px** 上，而内层折叠一展开，内容高度立刻变了——固定 px 立刻变错。三难：父停在 auto 稳态时内层展开，父高度**瞬跳**（没有过渡）；父被钉在 px 时内层展开，内容**被裁**；父正在动画中内层又展开，**终点失效**。三者共用一个解法：让父的目标高度永远跟随"内容实时高"。

**机制**：

1. **RO 观察"内容元素"而非"动画容器"**：动画容器自身高度是过渡的产物（由 JS 驱动），观察它等于自己观察自己；真正该观察的是内部那个 `height: auto` 的内容层——它变高才是"内容真的变高了"的证据。
2. **transition 的 retarget 特性是免费的平滑**：动画进行中把目标 height 改成新值，浏览器会**从当前计算值**向新终点续播——不需要打断重启，"父高度动画跟随子折叠"的丝滑感全部来自这一平台特性（与考点 5 的中断续接是同一原理的正用）。
3. **相同值不 setState**：RO 回调里 scrollHeight 读数可能有亚像素抖动，值不变（或差值 < 1px）就不更新，否则"测量→渲染→测量"成环（Select 考点 6 坑 5 同族）。

**完整代码**：

```tsx
// NestedMeasuredCollapse.tsx —— RO 跟随的嵌套折叠（测量法语境）
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function NestedMeasuredCollapse({ title, children }: { title: ReactNode; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);   // 动画容器：height + overflow hidden
  const innerRef = useRef<HTMLDivElement>(null);   // 内容层：auto 高，RO 的观察对象
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  // 带容差的写值：<1px 的抖动不落地，杜绝"测量→渲染→测量"成环（Select 考点 6 坑 5 同族）
  const apply = (h: number | 'auto') =>
    setHeight((prev) =>
      typeof prev === 'number' && typeof h === 'number' && Math.abs(prev - h) < 1 ? prev : h);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;

    if (!open) {
      // 收起时序（考点 3）：先锁"当前视觉高"（不是内容全量高——动画中间态反向不能跳），
      // 双 rAF 后归零。
      apply(outer.getBoundingClientRect().height);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => apply(0)); });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }

    // 展开态：目标是内容实时高。RO 让"动画中内层又展开"时终点自动修正——
    // transition retarget 从当前值向新终点续播，父高度丝滑跟随。
    apply(inner.scrollHeight);
    const ro = new ResizeObserver(() => apply(inner.scrollHeight));
    ro.observe(inner);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{title}</button>
      <div ref={outerRef} style={{
        height,
        overflow: 'hidden',
        transition: height === 'auto' ? 'none' : 'height .25s ease',
      }}
        onTransitionEnd={(e) => {
          // 到达展开稳态：归还 auto（考点 3 纪律）。RO 只在 open 时挂载，稳态 auto 不会成环。
          if (e.propertyName === 'height' && open) setHeight('auto');
        }}
      >
        {/* 内容层：auto 高度，永远渲染全部内容——被 outer 裁掉的部分依然占位（scrollHeight 才有全量高） */}
        <div ref={innerRef}>{children}</div>
      </div>
    </div>
  );
}
```

嵌套用法（对照考点 4 的 grid 版）：

```tsx
// 内层展开 → RO 触发 → 外层终点修正 → 外层动画跟随，全链路无手工传值
<NestedMeasuredCollapse title="分组一">
  <NestedMeasuredCollapse title="子项 1">内容 1</NestedMeasuredCollapse>
  <NestedMeasuredCollapse title="子项 2">内容 2</NestedMeasuredCollapse>
</NestedMeasuredCollapse>
```

**坑（症状 → 根因 → 修法）**：

```text
坑 9
症状：控制台刷 "ResizeObserver loop completed with undelivered notifications"，且高度抖动。
根因：RO 回调改了被观察元素的尺寸（观察自己/回调里同步改布局），形成布局环。
修法：观察内容层而非动画容器（本节双 ref 结构）；相同读数不 setState（<1px 容差）。

坑 10
症状：子折叠展开，父容器"咔"地瞬跳到新高度，没有过渡。
根因：父在 auto 稳态——auto 不是过渡值，高度变化自然瞬变。
修法：动画体系内不要长期停在 auto：展开动画结束后如需跟随子级变化，保持"px + RO"而不是归还 auto；或整树换 grid 方案（考点 4）。

坑 11
症状：内层展开动画还没播完，外层已经先一步到位/慢半拍。
根因：外层 RO 在内层每一帧都触发，终点被追到"半途高度"后又要再修正——表现为外层抖动追赶。
修法：RO 回调对读数做 rAF 合帧（连续触发只取最后一帧的值）；时长上外层略长于内层（外 .3s/内 .25s）观感更稳。

坑 12
症状：折叠在未激活的页签里初始化（display:none 祖先），展开动画高度恒为 0。
根因：display:none 下 scrollHeight = 0，测量时机错了（考点 3 坑 3 的嵌套版）。
修法：容器可见后再初始化（页签激活回调）；或改用 grid 方案免测量。
```

#### 考点 7：手风琴受控——activeKey 数组、互斥切换与 region 语义

**是什么**：把 Collapse 从"每项自己管 open"升级成"整组受控"：`activeKey` 数组（哪些项展开）走 [02-A1-受控-非受控双模式-30-行-hook-处处要用.md](02-A1-受控-非受控双模式-30-行-hook-处处要用.md) 的双模式协议；accordion 模式（同时只开一个）是一个**互斥切换**纯函数；无障碍按 WAI-ARIA Accordion Pattern 补 `region` 语义。

**为什么难**：数组受控与标量受控（A1）有个关键差异——**onChange 必须回传全量新数组**，受控方 `setState(next)` 直接闭环；回传增量（"新增了 b"）或差量（"移除了 a"）都是协议错误，消费端无法闭环。互斥切换则是"一个纯函数承载产品语义"：再点自己关不关、开新的是否关旧的、允不允许全收——三个产品决策都要落到同一函数里并写进测试。

**机制**：

1. **互斥切换函数**：`single` 模式下开新项 = 整个数组替换为 `[key]`（互斥的来源）；再点已开项 = `[]`（允许全收；要"至少保一个"就改成回落到 `[key]`）。`multiple` 模式是普通的数组加减。
2. **双模式接线**：受控优先（`activeKey !== undefined` 即受控），非受控内部 state 兜底，`onChange` 无条件全量回调——A1.3 的纪律原样平移到数组值。
3. **region 语义**：APG 规定折叠面板容器是 `role="region"` + `aria-labelledby` 指回标题按钮；按钮带 `aria-expanded` + `aria-controls` 指向面板。双 id 成对出现（与 16-Tabs 考点 1 的纪律同款）：region 的 labelledby 与按钮的 controls 互为反向引用，读屏靠它们把"标题-内容"缝成一体。

**完整代码**：

```ts
// accordion-toggle.ts —— 互斥切换纯函数
export type AccordionMode = 'single' | 'multiple';

/** single：开新关旧（数组替换实现互斥），再点自己 → 全收；multiple：数组加减 */
export function toggleAccordionKey(active: readonly string[], key: string, mode: AccordionMode): string[] {
  const isOpen = active.includes(key);
  if (mode === 'single') return isOpen ? [] : [key];
  return isOpen ? active.filter((k) => k !== key) : [...active, key];
}
```

```tsx
// Accordion.tsx —— 受控数组 + 互斥 + region 语义
import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { toggleAccordionKey, type AccordionMode } from './accordion-toggle';

interface AccordionCtxValue {
  activeKeys: readonly string[];
  toggle: (key: string) => void;
  baseId: string;
}
const AccordionCtx = createContext<AccordionCtxValue | null>(null);
const useAccordionCtx = () => {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error('Accordion.Item 必须渲染在 <Accordion> 内');
  return ctx;
};

export function Accordion({ mode = 'multiple', activeKey, defaultActiveKey = [], onChange, children }: {
  mode?: AccordionMode;
  activeKey?: string[];              // 受控：数组，全量回灌
  defaultActiveKey?: string[];       // 非受控初始：仅首帧消费（A1.8 快照纪律）
  onChange?: (next: string[]) => void; // 全量回传：受控方 setState(next) 即闭环
  children: ReactNode;
}) {
  const [internal, setInternal] = useState<string[]>(defaultActiveKey);
  const isControlled = activeKey !== undefined;
  const merged = isControlled ? activeKey : internal;
  const baseId = useId();

  const toggle = (key: string) => {
    const next = toggleAccordionKey(merged, key, mode);
    if (!isControlled) setInternal(next);
    onChange?.(next); // 无论受控与否都回调（A1 纪律）
  };

  return <AccordionCtx.Provider value={{ activeKeys: merged, toggle, baseId }}>{children}</AccordionCtx.Provider>;
}

export function AccordionItem({ itemKey, header, children }: {
  itemKey: string; header: ReactNode; children: ReactNode;
}) {
  const { activeKeys, toggle, baseId } = useAccordionCtx();
  const open = activeKeys.includes(itemKey);
  const btnId = `${baseId}-btn-${itemKey}`;
  const panelId = `${baseId}-panel-${itemKey}`;
  return (
    <div>
      <button
        type="button"
        id={btnId}
        aria-expanded={open}
        aria-controls={panelId}          // 正向引用：按钮 → 面板
        onClick={() => toggle(itemKey)}
      >
        {header}
      </button>
      <div
        id={panelId}
        role="region"                    // APG Accordion：面板是 region
        aria-labelledby={btnId}          // 反向引用：面板 → 按钮（与 aria-controls 成对）
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
// 动画形态：把 hidden 换成考点 2 的 grid 0fr/1fr 结构、或考点 5 的 RobustCollapse 即可——
// 受控与无障碍在容器层，高度动画在样式层，两层正交。
```

antd 侧对照（注意类型联合的坑）：

```tsx
import { Collapse } from 'antd';

<Collapse
  accordion                              // 互斥模式：同一时刻至多一项展开
  activeKey={activeKey}                  // 类型是 string | string[]：accordion 下实际流动单值
  onChange={(key) => setActiveKey(key as string)} // 受控方必须按联合类型收窄
  items={[{ key: 'a', label: 'A', children: <A /> }]}
/>
// 非 accordion 模式：activeKey / onChange 是 string[]（全量数组，语义同本节 multiple）。
```

最小 Vitest（互斥语义穷举）：

```ts
// accordion-toggle.test.ts
import { describe, it, expect } from 'vitest';
import { toggleAccordionKey } from './accordion-toggle';

describe('toggleAccordionKey', () => {
  it('single：开新项 = 数组替换（互斥），长度恒 ≤ 1', () => {
    expect(toggleAccordionKey(['a'], 'b', 'single')).toEqual(['b']);
    expect(toggleAccordionKey(['a'], 'a', 'single')).toEqual([]); // 再点自己：全收
  });
  it('multiple：数组加减，互不影响', () => {
    expect(toggleAccordionKey(['a'], 'b', 'multiple')).toEqual(['a', 'b']);
    expect(toggleAccordionKey(['a', 'b'], 'a', 'multiple')).toEqual(['b']);
  });
  it('切换幂等：同一 key 连点两次回到原状（multiple）', () => {
    const once = toggleAccordionKey(['a'], 'b', 'multiple');
    const twice = toggleAccordionKey(once, 'b', 'multiple');
    expect(twice).toEqual(['a']);
  });
});
```

**坑（症状 → 根因 → 修法）**：

```text
坑 13
症状：受控模式下点哪项都"没反应"或勾选集合越点越少。
根因：onChange 回传了增量/差量（如 ['b'] 表示"新增 b"），受控方当全量理解——协议歧义。
修法：数组受控的 onChange 永远回传全量新数组（本节 toggle），文档里写死。

坑 14
症状：antd accordion 模式下一次展开了两项，或受控回灌数组多项时行为怪异。
根因：accordion（single）语义下给了多项 activeKey——联合类型 string | string[] 在运行时不拦截。
修法：受控方在 accordion 模式只维护单值（取数组末位或首位的转换要显式写）；TS 侧收窄 as string。

坑 15
症状：读屏用户在面板间导航，只听到 "region" 不知道是谁的内容。
根因：面板漏了 aria-labelledby（region 没有可访问名字）。
修法：role="region" 必配 aria-labelledby 指回标题按钮（本节 AccordionItem 的双 id）。

坑 16
症状：受控切换后想用 defaultActiveKey 重置回初始，没效果。
根因：default 只在首帧消费一次（A1.8 的快照语义），后续重置必须走受控值。
修法：重置 = setActiveKey(初始数组)，别指望 default 值复活。
```
