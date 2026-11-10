---
title: "A5. 键盘导航与 ARIA"
---

## A5. 键盘导航与 ARIA

- **WAI-ARIA Authoring Practices 是组件库圣经**——每种组件都有标准键盘模型
- 必背模式：listbox（↑↓/Home/End/typeahead）、dialog（focus trap + Esc）、tree、combobox、grid
- typeahead：连按字母匹配选项
- `aria-live` 播报 Toast 数量、自动完成结果数（读屏用户体验）

### A5.1 WAI-ARIA APG 的地位与查阅方式

ARIA 规范本身只定义**属性语义**（`aria-expanded` 是什么意思），不告诉你 Select 该按什么键。"Select 应该怎么按键盘"的权威在 **WAI-ARIA Authoring Practices Guide（APG，作者实践指南）**：w3.org/WAI/ARIA/apg/patterns/。它由 W3C 的 ARIA 工作组维护，每个模式页三段式：

1. **Keyboard Interaction 表**：每个按键 → 行为（这是面试与实现的答案来源）；
2. **ARIA Attributes 表**：容器/子项/触发器各挂什么 role 与 aria-*；
3. 可运行示例（原生 DOM 实现，是组件库行为的参照系）。

组件库开发的正确工作流：**动手前先开 APG 对应模式页，把两张表抄进组件的验收清单**，写完用键盘逐条过。没有对应模式时（如 DatePicker），拆成最近似模式的组合（combobox + grid），antd/Radix 都是这么做的。APG 的示例代码是原生 DOM 写的——这正好印证组件库的本质：**React 只是实现手段，交互契约是平台级的**。

### A5.2 必背模式对照表

| 模式 | 代表组件 | 键位 | 关键 ARIA |
|---|---|---|---|
| listbox | Select 下拉 | ↑↓ 移动高亮；Home/End 首/末项；Enter 选中；Esc 关闭；typeahead 跳转 | 触发器 `aria-haspopup="listbox" aria-expanded`；列表 `role="listbox"`；选项 `role="option" aria-selected`；容器用 `aria-activedescendant` 上报高亮项 |
| dialog | Modal/Drawer | Tab/Shift+Tab 焦点陷阱（A4）；Esc 关闭；焦点初置与还回 | `role="dialog" aria-modal="true" aria-labelledby`（命名）`aria-describedby`（描述） |
| tree | Tree/TreeSelect | ↑↓ 同级移动；→ 展开或进首个子级；← 收起或回父级；Home/End 首/末；Enter 激活 | `role="tree"`；节点 `role="treeitem" aria-expanded aria-level aria-selected`；子组 `role="group"` |
| combobox | 自动完成、可输入 Select | 打字过滤；↑↓ 高亮；Enter 提交；Esc 逐级退（先关列表再清输入）；Alt+↓ 展开列表 | 输入框 `role="combobox" aria-expanded aria-controls` `aria-autocomplete="list"/"inline"/"both"`；列表侧同 listbox；高亮经 `aria-activedescendant` 挂在输入框上 |
| grid | 数据表格、日历面板 | ↑↓←→ 单元格间移动；Home/End 行首/尾；Ctrl+Home/End 表首/尾；F2/Enter 进编辑；Esc 出编辑；PageUp/PageDown 翻页 | `role="grid"` `role="row"` `role="gridcell"/"columnheader"`；选中格 `aria-selected`；只读格 `aria-readonly` |

这张表是 Part B 里 Select（listbox+combobox）、Table（grid）、Tree、DatePicker（grid）的公共考纲——每个组件的实现清单都能从这里直接抄。

### A5.3 typeahead：连按字母匹配

机制：维护一个按键缓冲区 + 一个超时计时器。快速连按 "b"、"e" 视为一轮 "be"（前缀匹配 "Beijing"）；两次按键间隔超过 500ms（行业惯例值），缓冲清空重新开始。匹配策略两段：先整串前缀匹配；不中再退化为最后一个字符匹配（用户按错也能跳到同字母区）。

```tsx
// useTypeahead.ts
import * as React from 'react';

export interface TypeaheadOptions<T> {
  items: T[];
  getItemLabel: (item: T) => string;
  /** 匹配命中：把高亮/游标移过去（listbox 的 aria-activedescendant 也跟着变） */
  onHighlight: (index: number) => void;
  /** 超时重置窗口，默认 500ms */
  resetMs?: number;
}

export function useTypeahead<T>({
  items,
  getItemLabel,
  onHighlight,
  resetMs = 500,
}: TypeaheadOptions<T>) {
  const bufferRef = React.useRef('');            // 按键缓冲：连按串
  const timerRef = React.useRef<number | null>(null); // 非 null 表示"一轮进行中"
  const lastIndexRef = React.useRef(0);          // 上一次命中的索引：同字母连按要往后找
  const onHighlightRef = React.useRef(onHighlight);
  React.useEffect(() => {
    onHighlightRef.current = onHighlight;
  }, [onHighlight]);

  React.useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current); // 卸载清计时器
    },
    []
  );

  /** 返回是否消费了该键（消费了应 preventDefault） */
  const handleKey = React.useCallback(
    (e: React.KeyboardEvent): boolean => {
      // 带修饰键的组合（Ctrl+C 等）不是 typeahead；只有单字符可打印键参与
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.key.length !== 1) return false;

      // ① 判定"新一轮"：上一轮已超时 → 清缓冲，从"上次命中的下一项"开始环形找
      //    （同字母连按的循环语义：b、停顿、b → 跳到下一个 b 开头的项）
      const isNewRound = timerRef.current === null;
      if (isNewRound) bufferRef.current = '';
      bufferRef.current += e.key.toLowerCase();

      const labels = items.map((item, i) => ({ label: getItemLabel(item).toLowerCase(), i }));
      const start = isNewRound ? lastIndexRef.current + 1 : 0; // 新一轮从上次命中+1 环形找；续轮从 0

      // ② 两段匹配：整串前缀 → 退化为末字符前缀
      const findByPrefix = (prefix: string): number => {
        for (let k = 0; k < labels.length; k++) {
          const idx = (start + k) % labels.length; // 环形扫描一整圈，起点不影响可达性
          if (labels[idx].label.startsWith(prefix)) return idx;
        }
        return -1;
      };
      const prefixHit = findByPrefix(bufferRef.current);
      const hit = prefixHit !== -1 ? prefixHit : findByPrefix(bufferRef.current.slice(-1));

      // ③ 重置计时：本键之后的 resetMs 内再按，仍算同一轮
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        bufferRef.current = '';
      }, resetMs);

      if (hit !== -1) {
        lastIndexRef.current = hit;
        onHighlightRef.current(hit);
        return true;
      }
      return false; // 没匹配上：不消费，交给其它按键逻辑
    },
    [items, getItemLabel, resetMs]
  );

  return handleKey;
}
```

接进 listbox（与 A5.2 的键位表合并成一个 keydown）：

```tsx
// 键盘路由示意（节选）：方向键、Home/End、Enter/Esc、typeahead 各归各位
const handleTypeahead = useTypeahead({
  items: options,
  getItemLabel: (o) => o.label,
  onHighlight: setHighlightedIndex, // typeahead 命中 → 移动高亮
});

function onKeyDown(e: React.KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); setHighlightedIndex((i) => Math.min(i + 1, options.length - 1)); return;
    case 'ArrowUp':   e.preventDefault(); setHighlightedIndex((i) => Math.max(i - 1, 0)); return;
    case 'Home':      e.preventDefault(); setHighlightedIndex(0); return;
    case 'End':       e.preventDefault(); setHighlightedIndex(options.length - 1); return;
    case 'Enter':     e.preventDefault(); commit(options[highlightedIndex]); return;
    case 'Escape':    e.preventDefault(); close(); return;
    default:
      if (handleTypeahead(e)) e.preventDefault(); // 其余单字符交给 typeahead
  }
}
```

### A5.4 aria-live：给读屏的"画外音"

Toast 出现、自动完成结果数变化，都是**视觉信息**——读屏用户的"光标"（虚拟游标）没动，默认什么也不会念。`aria-live` 区域是专门的播报通道：内容一变，读屏主动念出来。

- `aria-live="polite"`：等当前播报结束再念（绝大多数场景用这个）；
- `aria-live="assertive"`：立刻打断当前播报（仅紧急信息，滥用会被读屏用户关掉）；
- `role="status"` 等价 polite + `aria-atomic`，`role="alert"` 等价 assertive——写 role 更简洁；
- `aria-atomic="true"`：每次变更播报**完整**文本而非差异。

```tsx
// LiveRegion.tsx
import * as React from 'react';

/** 视觉隐藏但不脱离无障碍树：读屏听得到，肉眼看不见 */
export function LiveRegion({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

```css
/* sr-only：标准剪裁法——视觉上脱离布局（1×1 像素裁到不可见），屏幕阅读器仍可读 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

用法（Toast 数量 / 自动完成结果数）：

```tsx
// Toast 容器常驻一个 LiveRegion（message 变化即播报）
<LiveRegion message={`${items.length} 条未读通知`} />

// 自动完成：结果数是关键信息，播数字不播全部内容
<LiveRegion message={loading ? '搜索中' : `${filtered.length} 个结果`} />
```

**最关键的机制坑**：live region 必须在内容变化**之前**就存在于 DOM。读屏监听的是"已存在节点的变更"；先插节点再马上改文本，部分读屏/浏览器组合不播。所以 Toast 的 LiveRegion 要**常驻渲染**（空串也渲染着），而不是出 toast 时才挂。React 对同一节点重渲染改文本是有效播报源。

### A5.5 常见坑

1. **aria 挂对了但键盘没实现**。症状：axe 检查全绿（它只验静态属性），键盘用户用不了。根因：ARIA 属性只改读屏语义，不产生任何行为。修法：A5.2 的键位表逐条手测；把"键盘清单"写进组件的验收 story。
2. **aria-activedescendant 与 DOM 不同步**。症状：读屏念的还是上一个高亮项。根因：id 拼错或高亮项卸载后未清空。修法：id 从数据 key 生成、组件卸载时置 `undefined`。
3. **Toast 无播报**。根因：live region 是动态插入的（A5.4 的机制坑）。修法：常驻节点 + 只改内容。
4. **在 div 上绑 keydown 却忘了 tabIndex**。症状：鼠标点点不进、键盘也到不了，处理函数永远不触发。修法：非可聚焦元素做键盘容器必须 `tabIndex={0}`（或改为 roving，A4.4——组内导航时容器本身不需要 focusable）。

### A5.6 roving tabindex 的两种实现：index 移动 vs DOM 序查找

**是什么**：A4.4 的实现是 **index 法**——`useState` 存游标 + `count` 推算边界，方向键算新 index 再 `itemRefs[index].focus()`。另一条路线是 Radix `RovingFocusGroup` 的 **DOM 序法**：不存数字游标，keydown 时从"当前聚焦的元素"出发，在注册表里按文档顺序找相邻项。两条路线的取舍是组件库的真实设计决策，不是谁对谁错。

**为什么难（index 法的三宗罪）**：

1. **动态增删**：删除当前项后 activeIndex 悬空（指向已被删的位置），焦点/样式落在错误项上；插入项后 index 全体错位；
2. **count 与 DOM 失真**：条件渲染（禁用项不渲染）、数据驱动渲染（count 传的是 options.length，DOM 里却是"过滤后的 options"）时，方向键 focus 到一个不存在的节点——静默失败；
3. **注册顺序假设**：`getItemProps(index)` 假设调用序与视觉序一致，StrictMode 双挂载、HMR、或子组件用条件包一层时错位。

DOM 序法对这三条免疫：它从 `e.target`（当前真实聚焦元素）出发，永远在真实 DOM 里找邻居，index 从未存在过。它的代价：**tabIndex 计算需要 id 注册表桥接**——渲染期想知道"我是不是停泊项"，但渲染期拿不到自己的 DOM 节点，必须用 JSX 里声明的 id 做中介（这正是 Radix 用 id 而不是 index 的原因）。

**机制（DOM 序法的可用形态）**：

1. `nodesRef: Map<id, HTMLElement>`——item 的 ref callback 注册/注销（卸载即删，动态增删天然自愈）；
2. 排序：`compareDocumentPosition` 位判定文档序（绝不真的存 index）；
3. 停泊位（tab stop）是 `currentId` 状态，由 **focus 事件**更新（键盘移动与鼠标点击统一覆盖）；
4. 停泊项被卸载：`nodesRef.has(currentId)` 判活，失效则回退第一项——index 法的"悬空游标"问题在此处变成一行防御。

```tsx
// useRovingGroup.ts —— DOM 序 roving：id 注册表 + compareDocumentPosition
import * as React from 'react';

export interface RovingGroupOptions {
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function useRovingGroup({
  loop = true,
  orientation = 'horizontal',
}: RovingGroupOptions = {}) {
  const nodesRef = React.useRef(new Map<string, HTMLElement>());
  const [currentId, setCurrentId] = React.useState<string | null>(null);

  const registerItem = React.useCallback((id: string, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id); // 卸载即注销：动态增删的正确性来源
  }, []);

  const sortedIds = React.useCallback((): string[] => {
    return Array.from(nodesRef.current.entries())
      .sort(([, a], [, b]) =>
        // 位掩码判定：b 在 a 之后 → a 排前（返回值是 bitmask，绝不能 ===）
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      )
      .map(([id]) => id);
  }, []);

  const focusItem = React.useCallback((id: string) => {
    nodesRef.current.get(id)?.focus();
    setCurrentId(id);
  }, []);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const ids = sortedIds();
      if (ids.length === 0) return;
      const idx = currentId === null ? -1 : ids.indexOf(currentId);
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

      if (e.key === nextKey || e.key === prevKey) {
        e.preventDefault();
        const dir = e.key === nextKey ? 1 : -1;
        const start = idx === -1 ? 0 : idx;
        const next = loop
          ? (start + dir + ids.length) % ids.length
          : Math.min(ids.length - 1, Math.max(0, start + dir));
        focusItem(ids[next]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusItem(ids[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusItem(ids[ids.length - 1]);
      }
    },
    [currentId, loop, orientation, sortedIds, focusItem]
  );

  // 停泊项判活：被卸载（nodesRef 里没了）则回退第一项——悬空游标的一行防御
  const effectiveCurrentId =
    currentId !== null && nodesRef.current.has(currentId)
      ? currentId
      : (sortedIds()[0] ?? null);

  return { registerItem, currentId: effectiveCurrentId, onItemFocus: setCurrentId, onKeyDown };
}
```

```tsx
// RovingItem.tsx —— 条目侧：注册 + tabIndex 计算（渲染期靠 id，不靠 DOM）
import * as React from 'react';
import { useRovingGroup } from './useRovingGroup'; // 实际通过 Context 下发，示意从简

export function makeRovingItem(useGroup: () => ReturnType<typeof useRovingGroup>) {
  return function RovingItem({
    id,
    disabled = false,
    children,
  }: {
    id: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) {
    const group = useGroup();
    return (
      <button
        type="button"
        ref={(node) => group.registerItem(id, disabled ? null : node)} // 禁用项不注册：导航天然跳过
        tabIndex={group.currentId === id ? 0 : -1}
        onFocus={() => group.onItemFocus(id)}
        aria-disabled={disabled || undefined}
        disabled={disabled}
      >
        {children}
      </button>
    );
  };
}
```

两条路线的决策表：

| 维度 | index 法（A4.4） | DOM 序法（本节） |
|---|---|---|
| 动态增删 | 游标悬空，需手动修 | Map 注销即自愈 |
| 条件渲染/禁用跳过 | count 失真要额外对齐 | 不注册即跳过，天然一致 |
| tabIndex 计算 | 渲染期直接比（index 是数据） | 需要 id 注册表桥接 |
| 每次 keydown 成本 | O(1)（数组下标） | O(n log n)（排序；可缓存到 focus/注册变化） |
| 适用 | 静态组（Tabs/Radio） | 菜单、Toolbar、可增删列表 |

坑：

1. **`compareDocumentPosition` 用 `===` 比较**。症状：排序结果随机错乱。根因：返回值是位掩码（`DOCUMENT_POSITION_FOLLOWING` 是 4，还可能叠加 `DISCONNECTED` 8 等位）。修法：一律 `& Node.DOCUMENT_POSITION_FOLLOWING` 位与判定。
2. **排序每次 keydown 都跑**。症状：千项菜单方向键卡顿。修法：把 `sortedIds` 缓存，仅在注册表变化或 focus 变化时失效（对照 A4.7 的缓存失效纪律——同一套 MutationObserver/ref 触发思路，这里注册表本身就是自有数据，失效时机更可控）。
3. **禁用项仍占停泊位**。症状：Tab 进入组落在 disabled 按钮上（浏览器对 `disabled` 按钮不可聚焦，焦点丢到组外）。根因：停泊项判活只查"注册表中存在"，disabled 项不注册但 currentId 可能还指着它。修法：注册/注销时顺带校正 currentId（注销的 id 若等于 currentId 则迁移到前一项）；本节实现用"不注册"规避了大半，残存场景在 Tab 进入前用 `effectiveCurrentId` 兜住。

### A5.7 网格键盘导航：2D 焦点移动（grid 模式）

**是什么**：A5.2 键位表里的 grid 行展开：焦点在 `(row, col)` 二维坐标上移动——↑↓ 跨行、←→ 跨列、Home/End 行首尾、Ctrl+Home/End 表首尾、PageUp/Down 近似翻页。所有 gridcell `tabIndex=-1`，聚焦格是唯一 0：roving tabindex 的二维化。Table、日历面板（14 号文档）、看板都是它的宿主。

**为什么难**：

1. **行长不齐**：colspan、每行渲染的 cell 数不同、虚拟化下有些行根本不在 DOM——维护一张显式坐标矩阵（`cells[row][col]`）会在第一处不齐处崩溃；
2. **格内 widget 冲突**：单元格里是 button/slider/input 时，方向键该操纵 widget 还是移格子？两边都 `preventDefault` 就死锁，都不管就漂移；
3. **APG 的正式答案是模式切换**（F2/Enter 进入单元格交互模式、Esc 返回网格导航），但简化实现常用"格内已聚焦且 widget 能处理就让路"的启发式。

**机制（DOM 相对导航——不建坐标矩阵的解法）**：

1. 当前格 = `(e.target as HTMLElement).closest('[role=gridcell/rowheader/columnheader]')`；
2. 当前行 = cell 的 `[role=row]` 祖先；所有行 = grid 内 DOM 序的 `[role=row]` 集合；
3. 目标格 = `rows[r±1]` 的第 `col` 个 cell（col 是当前格在行内的序）——**取目标行"第 col 个"天然近似 colspan 与不齐行**：目标行短就贴到最后（clamp），行长不齐也不崩；
4. 模式让路：焦点目标是格内 widget 且键属于 widget 语义（input 的方向键移动光标）时不接管——用"事件是否已被消费 + 目标是否为格内控件"双判。

```tsx
// useGridNavigation.ts —— grid 键盘导航（DOM 相对法）
import * as React from 'react';

const CELL_SELECTOR = '[role="gridcell"], [role="rowheader"], [role="columnheader"]';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function useGridNavigation() {
  const gridRef = React.useRef<HTMLDivElement>(null);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>(CELL_SELECTOR);
    const row = cell?.closest<HTMLElement>('[role="row"]');
    if (!cell || !row || !grid.contains(cell)) return; // 焦点不在格上：不接管

    // 让路判定：格内控件自己消费方向键（input 光标移动等）——简化版模式切换
    const targetIsCellItself = e.target === cell;
    const WIDGET_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!targetIsCellItself && WIDGET_KEYS.includes(e.key)) return;

    const rows = Array.from(grid.querySelectorAll<HTMLElement>('[role="row"]'));
    const rowIndex = rows.indexOf(row);
    const cells = Array.from(row.querySelectorAll<HTMLElement>(CELL_SELECTOR));
    const colIndex = cells.indexOf(cell);
    if (rowIndex === -1 || colIndex === -1) return;

    const focusCell = (r: number, c: number) => {
      const targetRow = rows[clamp(r, 0, rows.length - 1)];
      if (!targetRow) return;
      const targetCells = Array.from(targetRow.querySelectorAll<HTMLElement>(CELL_SELECTOR));
      targetCells[clamp(c, 0, targetCells.length - 1)]?.focus();
    };

    switch (e.key) {
      case 'ArrowDown':  e.preventDefault(); focusCell(rowIndex + 1, colIndex); return;
      case 'ArrowUp':    e.preventDefault(); focusCell(rowIndex - 1, colIndex); return;
      case 'ArrowRight': e.preventDefault(); focusCell(rowIndex, colIndex + 1); return;
      case 'ArrowLeft':  e.preventDefault(); focusCell(rowIndex, colIndex - 1); return;
      case 'Home':
        e.preventDefault();
        focusCell(e.ctrlKey ? 0 : rowIndex, 0); // Ctrl+Home 表首 / Home 行首（列都归 0）
        return;
      case 'End':
        e.preventDefault();
        // Number.MAX_SAFE_INTEGER 被 clamp 到"最后一项"：省去两次分支
        focusCell(e.ctrlKey ? rows.length - 1 : rowIndex, Number.MAX_SAFE_INTEGER);
        return;
      case 'PageDown':   e.preventDefault(); focusCell(rowIndex + 10, colIndex); return;
      case 'PageUp':     e.preventDefault(); focusCell(rowIndex - 10, colIndex); return;
    }
  }, []);

  return { gridRef, onKeyDown };
}
```

```tsx
// GridTable.tsx —— 接线：gridcell 的 tabIndex 由"谁被聚焦"派生（focusin 同步）
import * as React from 'react';
import { useGridNavigation } from './useGridNavigation';

export function GridTable({ rows }: { rows: string[][] }) {
  const { gridRef, onKeyDown } = useGridNavigation();
  const [activeCell, setActiveCell] = React.useState<HTMLElement | null>(null);

  return (
    <div
      ref={gridRef}
      role="grid"
      tabIndex={0} // Tab 进入网格的落点（进入后方向键接管；首格聚焦可按需再加）
      onKeyDown={onKeyDown}
      onFocusCapture={(e) => {
        // focusin（捕获）同步 activeCell：键盘/鼠标/程序 focus 三来源统一
        setActiveCell((e.target as HTMLElement).closest('td, [role="gridcell"]'));
      }}
    >
      <table>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} role="row">
              {cells.map((text, c) => {
                const cellId = `${r}-${c}`;
                return (
                  <td
                    key={c}
                    role="gridcell"
                    data-cell={cellId}
                    tabIndex={activeCell?.dataset.cell === cellId ? 0 : -1}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

坑：

1. **table 里嵌原生控件全废**。症状：格内的 checkbox 能点但方向键一按整个格子跑了，用户勾选时误触导航。根因：让路判定只看"目标是格内控件"，checkbox 的空格键不该被移格逻辑放走（它不属于 WIDGET_KEYS，没冲突——真正冲突的是 select 展开的 ↑↓）。修法：格内是复合控件时上正式模式切换——F2/Enter 进"格内模式"、Esc 回网格模式（APG grid 的编辑模型），简化版覆盖不了就别硬塞。
2. **虚拟化行不在 DOM 时 Ctrl+End 落空**。症状：大表按 Ctrl+End 没反应。根因：目标行未渲染，`focusCell` 找不到节点。修法：两段式——先 `scrollToRow(最后一行)`（A2.12 的定位数学），用 effect 监听渲染窗口变化后再补 focus；"导航意图"与"DOM 就绪"解耦是虚拟化 grid 的通用解。
3. **grid 外层再包一层 tabIndex=0 的 div**。症状：Tab 两次才进网格。根因：容器 tabIndex 与首格 tabIndex 形成两个 tab stop。修法：网格只需一个 tab stop（容器或首格二选一）；本节实现选容器（首行未渲染时也稳定），选首格则容器去掉 tabIndex。

### A5.8 aria-activedescendant 模式与虚拟列表的配合

**是什么**：listbox/combobox 的"高亮上报"有两条路线（APG 两者都承认）：**焦点移动制**——option 逐个真实 focus（A4.4 的 roving 延伸）；**activedescendant 制**——容器（input 或 listbox 自身）持焦不动，`aria-activedescendant` 指向高亮项的 id，读屏跟随该属性播报。虚拟列表场景里后者几乎是必选：滚动不抢焦点、键盘移动不要求目标项"可聚焦"、每次移动只改一个属性。

**为什么难**：

1. **指向的 id 必须真实存在于 DOM**——虚拟列表会回收行，高亮行滚出渲染窗口 = activedescendant 指向虚空，读屏沉默（13 号文档已把这个列为症状，本节把它升级为库级防御）；
2. **id 稳定性**：用 index 拼 id，数据一插入全体漂移，读屏念错项——必须用业务 key；
3. **播报完整性**：activedescendant 播报的是目标节点的"无障碍名字"——虚拟行若懒挂载内容（远程 label 未到、图标未加载），播报残缺。

**机制**：

1. id 生成协议：`${listId}-opt-${item.key}`，listId 用 `useId` 防同页多实例撞车；
2. **DOM 存在性契约**：渲染窗口必须包含高亮行（A2.12 接入点 5 的 union 已保证）；开发期在 effect 里断言 `document.getElementById(activeId)` 存在，违者 `console.error`——契约从注释变成报警；
3. 滚动同步复用 A2.12 的 `ensureVisible`；
4. 容器持焦：键盘路由全部在容器 keydown 上（A5.3 的路由代码原样可用），option 不需要也不应该可聚焦。

```tsx
// useActiveDescendant.ts —— activedescendant 制：id 协议 + 开发期存在性断言
import * as React from 'react';

export interface ActiveDescendantOptions<T> {
  listId: string;
  items: T[];
  getItemKey: (item: T, index: number) => string;
  /** -1 表示无高亮（列表关闭/空） */
  highlightedIndex: number;
  /** 断言只在 open 期间跑：关闭后高亮清空，不必检查 */
  open: boolean;
}

export function useActiveDescendant<T>({
  listId,
  items,
  getItemKey,
  highlightedIndex,
  open,
}: ActiveDescendantOptions<T>) {
  const optionId = React.useCallback(
    (index: number): string | undefined => {
      const item = items[index];
      return item !== undefined ? `${listId}-opt-${getItemKey(item, index)}` : undefined;
    },
    [listId, items, getItemKey]
  );

  const activeId =
    highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined;

  // 库级防御：高亮行的 id 必须在 DOM。虚拟窗口没含住高亮行时立刻报警（A2.12 接入点 5 的契约化）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !open || activeId === undefined) return;
    if (document.getElementById(activeId) === null) {
      console.error(
        `[${listId}] aria-activedescendant 指向的 #${activeId} 不在 DOM 中，` +
          `读屏将无法播报高亮项。检查虚拟列表渲染窗口是否包含高亮行（A2.12 接入点 5）。`
      );
    }
  }, [activeId, listId, open]);

  /** 挂到持焦容器的属性组（combobox：容器是 input；listbox：容器是列表自身） */
  const getContainerProps = React.useCallback(
    () => ({
      'aria-activedescendant': activeId,
      'aria-owns': listId, // 辅助部分读屏建立"容器-列表"关系（列表不在容器 DOM 子树内时必备）
    }),
    [activeId, listId]
  );

  return { activeId, optionId, getContainerProps };
}
```

两条路线的决策表：

| 维度 | 焦点移动制（option 真实 focus） | activedescendant 制 |
|---|---|---|
| 焦点位置 | 在 option 上逐个移动 | 永远在容器（input/listbox） |
| :focus 样式成本 | 每次移动触发 focus/blur 重绘 | 只变一个 aria 属性，样式走 data 高亮 |
| 虚拟列表兼容 | 差：focus 目标必须在 DOM 且可聚焦 | 好：行只要存在，不需要可聚焦 |
| 滚动行为 | focus() 默认滚（preventScroll 可关） | 滚动完全由库控（ensureVisible） |
| 事件复杂度 | 每次 move 两个 focus 事件 + 外部 blur 监听全要过滤 | 单容器 keydown，路由简单 |
| 读屏兼容 | 无争议 | 现代读屏（NVDA/JAWS/VoiceOver 近年版本）OK，远古组合有缺口 |
| APG 建议 | listbox 两种皆可 | combobox 推荐（输入框必须持焦） |

接线示例（combobox：输入框持焦 + 虚拟列表 + activedescendant 三件套合体，衔接 A2.12）：

```tsx
// ComboboxList.tsx —— 节选：容器属性、键盘路由、虚拟窗口如何咬合
import * as React from 'react';
import { useActiveDescendant } from './useActiveDescendant';
import { useVirtualListBox } from './useVirtualListBox'; // A2.12

export function ComboboxList(props: {
  listId: string;
  items: Array<{ key: string; label: string }>;
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  onCommit: (index: number) => void;
}) {
  const { listId, items, highlightedIndex, setHighlightedIndex, onCommit } = props;

  const { getContainerProps, optionId } = useActiveDescendant({
    listId,
    items,
    getItemKey: (item) => item.key,
    highlightedIndex,
    open: true, // 节选假设列表常开；真实组件随 open 传入并关闭时重置 -1
  });
  const { viewportRef, renderRange } = useVirtualListBox({
    itemHeight: 32,
    count: items.length,
    highlightedIndex,
    initialIndex: highlightedIndex, // 打开时定位到当前选中项
  });

  // 键盘路由：焦点永远在 input 上，列表项一个 focusable 都没有（两路线分野的物化）
  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, items.length - 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        return;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) onCommit(highlightedIndex);
        return;
    }
  };

  return (
    <>
      <input
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        onKeyDown={onKeyDown}
        {...getContainerProps()} // aria-activedescendant / aria-owns 落在持焦者身上
      />
      <div id={listId} ref={viewportRef} role="listbox" style={{ overflowY: 'auto' }}>
        {Array.from({ length: renderRange[1] - renderRange[0] + 1 }, (_, i) => {
          const index = renderRange[0] + i;
          const item = items[index];
          return (
            <div
              key={item.key}
              id={optionId(index)} // 与 aria-activedescendant 指向同一 id：协议闭环
              role="option"
              aria-selected={index === highlightedIndex}
              data-highlighted={index === highlightedIndex || undefined}
              style={{ height: 32 }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </>
  );
}
```

坑：

1. **id 撞车**。症状：同页两个 Select，读屏念的是另一个的选项。根因：listId 写死（如 `"select-list"`）。修法：`useId()` 生成 listId（SSR 也安全，A7 的 hydration 纪律）；id 协议写进组件文档。
2. **关闭时未清空**。症状：列表关了，读屏还在播 option。根因：`open=false` 后 activeId 仍指向已卸载的行。修法：`highlightedIndex` 在关闭时重置 -1（A5.5 坑 2 的契约化），且 `getContainerProps` 在关闭时不输出该属性（本节实现 `activeId === undefined` 时属性自然缺省，语义正确）。
3. **播报残缺**。症状：读屏只念"选项 42"不念内容。根因：虚拟行的远程 label 未到，渲染了占位符。修法：label 未到时 option 输出 `aria-busy="true"` + 占位文案（"加载中"），到了再替换——读屏会重播；绝不让"空文本"进入无障碍树。
