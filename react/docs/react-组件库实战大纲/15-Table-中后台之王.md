---
title: "Table（★★★★）——中后台之王"
---

> 本文是《Lv3 复杂交互组件（公认最考功力）》按小节拆分后的续篇，上一部分见 [14-DatePicker-日历是最苦的组件.md](14-DatePicker-日历是最苦的组件.md)。

### Table（★★★★）——中后台之王

Table 的渲染（几行 `map` 出 `<tr>`）只占它真实复杂度的两成。剩下八成是：**受控协议怎么设计**（分页/排序/筛选三种交互共享一个 onChange）、**布局怎么稳**（固定表头列、列宽拖拽、错位是 Table 的头号 bug）、**状态怎么跨页**（勾选、展开）、**万行怎么活**（虚拟滚动）。这就是原大纲那句判断的分量——

- ⚠️ 本质是"协议工程"：API 设计比渲染难

考点清单（原文）：

- 受控协议设计：分页/排序/筛选 onChange 一次回调带全参
- **固定表头 + 固定列**（sticky/双表同步滚动）；列宽拖拽（拖动时表格布局切换）
- 行选择跨页保持；展开行/树形数据
- 虚拟滚动（万行）；单元格 ellipsis + tooltip

#### 考点 1：受控协议设计（onChange 一次回调带全参，完整类型）

Table 有三种会改变数据视图的交互：翻页、排序、筛选。协议设计的灵魂拷问：分三个回调（onPageChange/onSortChange/onFilterChange）还是一个？antd 的答案是**一个**：`onChange(pagination, filters, sorter, extra)` 四参一次带全。为什么一个更好：

1. **服务端模式下三种状态要合并成一个查询**，分回调会导致业务方自己组装"最新全量状态"，竞态与遗漏全在调用方；
2. **交互有联动**——筛选变了应该回第 1 页，一个回调天然拿到"这次动作之后的完整快照"（`extra.action` 还告诉你这次动的是哪种）；
3. **向后兼容**：加第四种交互（如分组）时给 extra 加字段即可，不新增回调签名。

完整类型定义（与 antd v5 对齐的形态）：

```ts
import type { Key } from 'react';

/** 分页状态：current/pageSize 受控在调用方，total 由数据方回填 */
export interface TablePaginationConfig {
  current?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;   // 是否显示每页条数切换器
}

/** 单列排序结果：order 只有 ascend/descend 两态（三态 UI 的第三态是"取消排序"，用 undefined 表达） */
export interface SorterResult<RecordType> {
  column?: ColumnsType<RecordType>[number]; // 触发排序的列定义
  order?: 'ascend' | 'descend';
  field?: keyof RecordType;                 // 排序字段（取数用）
  columnKey?: string;                       // 列 key（多列排序时区分）
}

/** 筛选状态：列 key → 勾选的筛选值数组（null 表示该列筛选被清空） */
export type FilterValue = Key[] | null;
export type TableFilters = Record<string, FilterValue>;

/** extra：这次动作是什么 + 此刻全量数据是什么 */
export interface TableChangeExtra<RecordType> {
  action: 'paginate' | 'sort' | 'filter';
  currentDataSource: RecordType[];          // 前端模式下：已经过筛选+排序的当前数据（分页前）
}

/** 一次回调带全参——Table 协议的中心签名 */
export type TableOnChange<RecordType> = (
  pagination: TablePaginationConfig,
  filters: TableFilters,
  sorter: SorterResult<RecordType> | SorterResult<RecordType>[],
  extra: TableChangeExtra<RecordType>,
) => void;

export interface ColumnType<RecordType> {
  key?: string;
  title: React.ReactNode;
  dataIndex?: keyof RecordType;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: RecordType, b: RecordType) => number); // 前端排序给比较器；服务端排序给 true（只收状态不发数据）
  filters?: { text: string; value: Key }[];
  onFilter?: (value: Key, record: RecordType) => boolean;        // 前端过滤谓词
  ellipsis?: boolean | { showTitle?: boolean };
  render?: (value: unknown, record: RecordType, index: number) => React.ReactNode;
}
export type ColumnsType<RecordType> = ColumnType<RecordType>[];
```

调用方的完整用法（服务端模式 + 竞态守卫，可直接抄进项目）：

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { TableFilters, TablePaginationConfig, SorterResult } from './table-types';

interface OrderRow { id: string; amount: number; status: string; createdAt: string }

/** 服务端 Table 状态管理：三态合一 + 派生查询参数 + 请求竞态守卫 */
export function useServerTable() {
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<TableFilters>({});
  const [sorter, setSorter] = useState<SorterResult<OrderRow>>({});
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 唯一的 onChange 入口：一次拿到全量快照，派生查询参数只写一遍
  const onChange = useCallback<import('./table-types').TableOnChange<OrderRow>>(
    (nextPagination, nextFilters, nextSorter, extra) => {
      // 联动纪律：筛选/排序变化必须回到第 1 页，否则会停在不存在的高页码上
      if (extra.action !== 'paginate') nextPagination = { ...nextPagination, current: 1 };
      setPagination(nextPagination);
      setFilters(nextFilters);
      const s = Array.isArray(nextSorter) ? nextSorter[0] : nextSorter;
      setSorter(s);
    },
    [],
  );

  // 三态 → 查询参数：协议的"翻译层"，服务端只认这一种形状
  const query = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    orderBy: sorter.field ? String(sorter.field) : undefined,
    order: sorter.order,                       // ascend | descend | undefined
    ...Object.fromEntries(
      Object.entries(filters)
        .filter(([, v]) => v && v.length > 0)
        .map(([k, v]) => [k, (v as KeyLike[]).join(',')]),
    ),
  };

  useEffect(() => {
    const ac = new AbortController();          // 竞态守卫：同 Select 远程搜索同款（Lv3 Select 考点 5）
    setLoading(true);
    fetch(`/api/orders?${new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    )}`, { signal: ac.signal })
      .then((r) => r.json() as Promise<{ data: OrderRow[]; total: number }>)
      .then(({ data, total }) => {
        setRows(data);
        setPagination((p) => ({ ...p, total })); // total 由服务端回填——分页器才知道有几页
      })
      .catch(() => void 0)
      .finally(() => setLoading(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, filters, sorter.field, sorter.order]);

  return { rows, loading, pagination, filters, sorter, onChange };
}
type KeyLike = string | number;
```

antd 侧写法（`TableProps['onChange']` 直接复用官方类型）：

```tsx
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

const onChange: TableProps<OrderRow>['onChange'] = (
  pagination, filters: Record<string, FilterValue | null>,
  sorter: SorterResult<OrderRow> | SorterResult<OrderRow>[], extra,
) => {
  if (extra.action === 'filter') setPage(1); // antd 不会替你重置页码，联动要自己做（见文末坑 1）
  setQuery({ page: pagination.current ?? 1, pageSize: pagination.pageSize ?? 20,
    orderBy: sorter.field, order: sorter.order, filters });
};
```

#### 考点 2：固定表头 + 固定列（sticky + 双表同步滚动 + 阴影指示）

这是 Table 布局的头号难题，先讲清两代方案再动手：

- **双表方案（antd v4 风格）**：表头和表体拆成**两个独立的 `<table>`**，各自拥有同名 `colgroup`。外层容器纵向滚动时表头天然不动；难点是**列宽同步**——两个 table 必须逐列等宽，否则错位。rc-table 的做法是测量表头单元格真实宽度，再把宽度受控写回两个 colgroup 的 `<col>` 上（所以 antd Table 对"宽度不确定的列"敏感，见坑 2）。
- **sticky 方案（antd v5 现行）**：只渲染一个 `<table>`，表头 `th` 用 `position: sticky; top: 0`；固定列 `td/th` 用 `position: sticky; left/right: 偏移量`。偏移量不是手填的——左固定列的偏移 = 它左边所有左固定列宽度之和，由 `useStickyOffsets` 逐列累加算出。**阴影指示**：滚动位置在左边缘时左阴影不显示（否则静止状态也有裂痕感），rc-table 在容器上切换 `ant-table-ping-left / ant-table-ping-right` 两个类来开关首尾固定列的 box-shadow。

手写一个浓缩版（单表 + sticky 表头 + 左右固定列 + 阴影状态机）：

```tsx
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ColumnsType } from './table-types';

/** 粘性偏移计算：antd useStickyOffsets 的核心逻辑——左固定向右累加，右固定向左累加 */
export function useStickyOffsets<RecordType>(columns: ColumnsType<RecordType>, widths: number[]) {
  return useMemo(() => {
    const leftOffsets: (number | null)[] = [];
    let acc = 0;
    columns.forEach((col, i) => {
      if (col.fixed === 'left') { leftOffsets[i] = acc; acc += widths[i] ?? 0; }
      else leftOffsets[i] = null;
    });
    const rightOffsets: (number | null)[] = new Array(columns.length).fill(null);
    acc = 0;
    for (let i = columns.length - 1; i >= 0; i--) {           // 右固定从末列反向累加
      if (columns[i].fixed === 'right') { rightOffsets[i] = acc; acc += widths[i] ?? 0; }
    }
    return { leftOffsets, rightOffsets };
  }, [columns, widths]);
}

/** 固定表头 + 固定列 + 滚动阴影指示的最小实现 */
export function StickyTable<RecordType extends { id: string }>({
  columns, widths, data, maxHeight = 400,
}: {
  columns: ColumnsType<RecordType>;
  widths: number[];
  data: RecordType[];
  maxHeight?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ping, setPing] = useState({ left: false, right: false });
  const { leftOffsets, rightOffsets } = useStickyOffsets(columns, widths);

  // 阴影状态机：只有"真的滚进固定区"才亮对应阴影（对应 rc-table 的 ant-table-ping-left/right）
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setPing((prev) => {
      const next = {
        left: el.scrollLeft > 0,                                           // 左侧有内容被盖住 → 左阴影
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,        // 右侧还有内容 → 右阴影（-1 容差防小数）
      };
      return prev.left === next.left && prev.right === next.right ? prev : next; // 不变不 setState，防抖
    });
  };

  const cellStyle = (i: number): CSSProperties => ({
    position: 'sticky',
    left: leftOffsets[i] != null ? leftOffsets[i]! : undefined,
    right: rightOffsets[i] != null ? rightOffsets[i]! : undefined,
    zIndex: 1, // 高于普通单元格；表头的固定单元格再 +1（见下方 thead 覆盖）
    background: '#fff',                                // sticky 单元格必须不透明，否则滚动时底下内容透出
    boxShadow:
      columns[i].fixed === 'left' && ping.left && leftOffsets[i] === Math.max(...columns.map((c, j) => (c.fixed === 'left' ? leftOffsets[j] ?? -1 : -1)))
        ? '2px 0 8px rgba(0,0,0,.12)'                   // 最右一个左固定列：滚动中显示右侧阴影
        : columns[i].fixed === 'right' && ping.right && rightOffsets[i] === 0
          ? '-2px 0 8px rgba(0,0,0,.12)'                // 最左一个右固定列：滚动中显示左侧阴影
          : undefined,
  });

  return (
    <div ref={scrollRef} onScroll={onScroll} style={{ maxHeight, overflow: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
        {/* table-layout: fixed + colgroup 定宽：列宽完全受控，拖拽列宽（考点 3）才有效 */}
        <colgroup>{columns.map((c, i) => <col key={c.key ?? i} style={{ width: widths[i] }} />)}</colgroup>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={col.key ?? i} style={{ ...cellStyle(i), position: 'sticky', top: 0, zIndex: 2 /* 表头永远压过固定列 */ }}>
                {col.title as ReactNode}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col, i) => (
                <td key={col.key ?? i} style={cellStyle(i)}>
                  {col.render ? col.render(row[col.dataIndex!], row, i) : String(row[col.dataIndex!] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

antd 的对应开关极其简陋但讲究：`scroll={{ y: 400 }}` 开固定表头，`scroll={{ x: 'max-content' }}` 给横向滚动（固定列的前提），列上 `fixed: 'left' | 'right'`。**`scroll.x` 缺失是固定列错位的第一大根因**——没有横向滚动就没有 sticky 的用武之地。

#### 考点 3：列宽拖拽（colgroup 受控更新）

列宽拖拽的本质：**把 `<col>` 的 width 从"浏览器自主"改成"React 受控"**，拖动只是更新 state 里的 widths 数组。实现要点：

1. `table-layout: fixed` 必须开——auto 布局下浏览器自作主张调整列宽，拖了也不准；
2. 拖拽手柄用 **Pointer Events + `setPointerCapture`**（鼠标/触摸/笔统一，且移出元素仍持续接收 move）；
3. 拖动过程禁用文本选择（`user-select: none`）并 clamp 最小宽度；
4. antd 官方"可伸缩列"demo 用 react-resizable 的 `<Resizable>` 包住表头单元格，`onResize` 回调把宽度写回 columns——同一思想的现成轮子。

```tsx
import { useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';

/** 列宽拖拽手柄：pointer capture + 受控 colgroup 宽度 */
export function useColumnResize(initialWidths: number[], minWidth = 60) {
  const [widths, setWidths] = useState(initialWidths);
  const dragRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  const onHandlePointerDown = useCallback((colIndex: number) => {
    return (e: ReactPointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();                                    // 不能冒泡成表头点击（排序）
      dragRef.current = { colIndex, startX: e.clientX, startWidth: widths[colIndex] };
      e.currentTarget.setPointerCapture(e.pointerId);         // 捕获：指针移出窗口也持续收到 move/up
      document.body.style.userSelect = 'none';                // 拖动期间禁选文本
      document.body.style.cursor = 'col-resize';
    };
  }, [widths]);

  const onHandlePointerMove = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    setWidths((prev) => {
      const next = [...prev];
      next[drag.colIndex] = Math.max(minWidth, drag.startWidth + dx); // clamp 最小宽
      return next;
    });
  }, [minWidth]);

  const onHandlePointerUp = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleFor = (colIndex: number) => (
    <span                                                    // 渲染在 th 右缘的 4px 热区
      onPointerDown={onHandlePointerDown(colIndex)}
      onPointerMove={onHandlePointerMove}
      onPointerUp={onHandlePointerUp}
      style={{ position: 'absolute', right: -2, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }}
      aria-hidden
    />
  );

  return { widths, handleFor };
}
// 与 StickyTable 对接：把这里的 widths 传给 StickyTable 的 widths prop，
// th 渲染时追加 {handleFor(i)}——拖动即受控更新 colgroup，双表/sticky 布局同步生效。
```

与 react-resizable 整合的 antd 惯用形态（表头包 `<Resizable>`，宽度进 columns）：

```tsx
import { Resizable } from 'react-resizable'; // antd 官方 demo 同款依赖：pnpm add react-resizable

// <Resizable width={width} height={0} onResize={(_, { size }) => setColWidth(size.width)}>
//   <th style={{ position: 'relative' }}>{title}{handle}</th>
// </Resizable>
```

#### 考点 4：行选择跨页保持（rowKey 记录集合，而非页内索引）

行选择的状态必须是 **rowKey 的集合**（`Set<Key>`），绝不能是页内下标——翻页后下标 3 是另一行，勾选会"漂移"。跨页保持的关键在：**翻页只是 dataSource 换了一批，选择集合不动**；表头/行的三态勾选框由"当前页行 keys 与集合的交集"派生：

- 表头 checked：当前页所有行都在集合中；
- 表头 indeterminate：部分在；
- 反选表头：把当前页行 keys 从集合中整体加入/移除（不是清空集合）。

另一个深坑：**跨页已选的 rows 拿不到原始数据**。集合里存的是 key，第 3 页选的 key 翻回第 1 页时 dataSource 里没有对应行。antd 的 `preserveSelectedRowKeys` 只保证 keys 不丢，`selectedRows` 里依然只有"当前 dataSource 里找得到的行"——提交时需要 key → row 的自维护缓存：

```tsx
import { useMemo, useRef, useState } from 'react';
import type { Key } from 'react';

/** 跨页行选择：key 集合 + row 缓存（解决 selectedRows 缺行） */
export function useRowSelection<Row extends { key: Key }>(fetchRowByKey?: (keys: Key[]) => Promise<Row[]>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<Key>>(new Set());
  const rowCacheRef = useRef(new Map<Key, Row>());       // key → 原始行：翻页后仍可还原完整数据

  const toggleRow = (key: Key, row: Row) => {
    rowCacheRef.current.set(key, row);                   // 见到行就缓存，永远来得及
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /** 表头三态：以"当前页行"为基准派生，与全量集合解耦 */
  const headerState = (pageRows: Row[]) => {
    const hit = pageRows.filter((r) => selectedKeys.has(r.key)).length;
    return { checked: hit === pageRows.length && pageRows.length > 0, indeterminate: hit > 0 && hit < pageRows.length };
  };

  const togglePage = (pageRows: Row[], checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        rowCacheRef.current.set(r.key, r);
        checked ? next.add(r.key) : next.delete(r.key);  // 整页加入/移除，绝不动其他页的选择
      }
      return next;
    });
  };

  /** 提交口径：全部选中的完整 rows（含已不在当前页的），必要时回源补拉 */
  const selectedRows = useMemo(() => {
    const all = [...selectedKeys].map((k) => rowCacheRef.current.get(k)).filter((r): r is Row => !!r);
    return all;
  }, [selectedKeys]);

  const resolveMissing = async (): Promise<Row[]> => {
    const missing = [...selectedKeys].filter((k) => !rowCacheRef.current.has(k));
    if (missing.length && fetchRowByKey) {
      for (const r of await fetchRowByKey(missing)) rowCacheRef.current.set(r.key, r);
    }
    return [...selectedKeys].map((k) => rowCacheRef.current.get(k)!);
  };

  return { selectedKeys, selectedRows, toggleRow, togglePage, headerState, resolveMissing };
}
```

antd 的对应配置：`rowKey="id"`（唯一、稳定）+ `rowSelection={{ preserveSelectedRowKeys: true }}`。注意 antd 的 `onChange(selectedRowKeys, selectedRows)` 里 selectedRows 在跨页场景是"残缺"的，这正是上面自维护缓存的存在理由。

#### 考点 5：展开行 / 树形数据（children 递归渲染与缩进）

两种"行变多行"的形态共用一套机制：

- **展开行**：`expandedRowRender(record)` 给任意行配一个"子内容区"，占满整行宽，常用于详情/表单；
- **树形数据**：行自带 `children` 数组（antd 默认字段名 `children`，可用 `childrenColumnName` 改），子行是真正的表格行，按 `depth` 缩进 + 展开箭头。

实现要点：展开状态必须受控在 key 集合上（和行选择同理）；树形渲染就是 Part A 之外本篇 Tree 一节递归渲染的"表格版"——**缩进不用嵌套 DOM，用 depth 乘缩进单位算 paddingLeft**，这保证 colgroup 列宽语义不被破坏：

```tsx
import { Fragment, useState } from 'react';
import type { Key, ReactNode } from 'react';

export interface TreeRow { key: Key; name: string; children?: TreeRow[] }

export function TreeTableBody({
  rows, expandedKeys, onToggle, depth = 0, indentUnit = 24,
}: {
  rows: TreeRow[];
  expandedKeys: Set<Key>;
  onToggle: (key: Key) => void;
  depth?: number;
  indentUnit?: number;
}) {
  const renderRows = (list: TreeRow[], d: number): ReactNode =>
    list.map((row) => {
      const hasChildren = !!row.children?.length;
      const expanded = expandedKeys.has(row.key);
      return (
        // 一行 = 行本体 + 可选子行序列：Fragment 承载多节点，key 落在 Fragment 上（key 铁律不打折）
        <Fragment key={row.key}>
          <tr>
            <td>
              <span style={{ paddingLeft: d * indentUnit, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {hasChildren ? (
                  <button aria-label={expanded ? '收起' : '展开'} aria-expanded={expanded}
                    onClick={() => onToggle(row.key)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    {expanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span style={{ display: 'inline-block', width: 16 }} /> // 叶子行占位对齐
                )}
                {row.name}
              </span>
            </td>
          </tr>
          {/* 子行不是嵌套 DOM，而是平铺的 <tr>——paddingLeft 由 depth 计算 */}
          {hasChildren && expanded ? renderRows(row.children!, d + 1) : null}
        </Fragment>
      );
    });
  return <>{renderRows(rows, depth)}</>;
}

// 受控展开：
// const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());
// const onToggle = (k: Key) => setExpandedKeys(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
```

两个工程坑提前立牌：**`defaultExpandAllRows` 只在首挂载那一刻生效**，异步加载的数据不会再自动展开（要用受控 expandedKeys 自己算全量）；展开行的"整行跨列"实现要用 `colSpan={columns.length}` 吃掉整行。

#### 考点 6：虚拟滚动（万行）

万行的前 20 条在视口里，其余 9980 条的 `<tr>` 全是白渲染。行级窗口化与 Select 考点 4 的公式完全同源，差别只是行高通常更大、且要和 sticky 表头/固定列共存。antd v5.9+ 直接给 Table 开了 `virtual` 开关（要求同时给 `scroll.y`，行高需稳定）：

```tsx
import { Table } from 'antd';

// antd 万行：virtual 要求定高行；内部走 rc-virtual-list 窗口化
<Table
  virtual
  scroll={{ x: 1000, y: 500 }}
  rowKey="id"
  columns={columns}
  dataSource={tenThousandRows}
  pagination={false}
/>
```

自实现的行窗口化（与考点 2 的 StickyTable 拼装，公式与 Select 一致）：

```tsx
import { useState } from 'react';

const ROW_HEIGHT = 44;

export function useVirtualRows(total: number, viewportHeight: number, overscan = 8) {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const endIndex = Math.min(total, Math.ceil(viewportHeight / ROW_HEIGHT) + startIndex + overscan * 2);
  return {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop),
    startIndex, endIndex,
    topPad: startIndex * ROW_HEIGHT,                 // 撑高条（上）
    bottomPad: Math.max(0, (total - endIndex) * ROW_HEIGHT), // 撑高条（下）
    slice: <T,>(rows: T[]) => rows.slice(startIndex, endIndex),
  };
}
// 渲染：<tbody>
//   <tr style={{height: topPad}} aria-hidden />       ← 上撑高
//   {slice(data).map(row => <RealRow key={row.id} />)}
//   <tr style={{height: bottomPad}} aria-hidden />    ← 下撑高
// </tbody>
// 注意：行高必须恒定（ROW_HEIGHT 是协议的一部分）；动态行高需测量缓存，见本篇 VirtualList 小节
```

#### 考点 7：单元格 ellipsis + tooltip

长文本单元格三件套：`table-layout: fixed` + 列定宽 + CSS 三行省略；再加"**只有真溢出才给 tooltip**"（没溢出也弹 tip 是骚扰）——判定方法与 Lv1 Typography 同款：`scrollWidth > clientWidth` 即溢出。antd 列配置 `ellipsis: { showTitle: false }` 关掉原生 title，再在 render 里包自己的 Tooltip：

```tsx
import { useRef, useState, type ReactNode } from 'react';

/** 溢出才显示 tooltip 的单元格（判定：scrollWidth > clientWidth，Lv1 Typography 同款测量） */
export function EllipsisCell({ children, maxWidth = 200 }: { children: ReactNode; maxWidth?: number }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false); // hover 中且确实溢出才为 true
  return (
    <div
      ref={cellRef}
      onMouseEnter={() => {
        const el = cellRef.current;
        if (el) setOverflow(el.scrollWidth > el.clientWidth); // 悬停瞬间测量：内容随数据更新也总能测对
      }}
      onMouseLeave={() => setOverflow(false)}
      style={{ maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}
    >
      {children}
      {overflow && (
        <span
          role="tooltip"
          style={{ position: 'absolute', left: 0, bottom: '100%', background: 'rgba(0,0,0,.75)', color: '#fff',
            padding: '4px 8px', borderRadius: 4, whiteSpace: 'normal', zIndex: 10, pointerEvents: 'none' }}
        >
          {children} {/* 完整内容浮层：whiteSpace: normal 允许多行 */}
        </span>
      )}
    </div>
  );
}
```

antd 写法对照：`ellipsis: true`（原生 title 兜底）或 `ellipsis: { showTitle: false }` + render 里包 `<Tooltip title={text}>`。

#### 考点 8："本质是协议工程"的论证

> ⚠️ 本质是"协议工程"：API 设计比渲染难

这句话的完整论证分三层：

1. **一致性**：分页/排序/筛选/勾选/展开五种状态并存，每种又有前端/服务端两种模式。协议一旦不统一（比如排序单独搞个 `onSortChange`），调用方就要自己拼装"当前全量状态"，竞态、漏字段、双份事实源全在业务侧炸开。antd 用一个 `onChange` 四参快照 + `extra.action` 溯源，把一致性成本收进组件内部。
2. **组合爆炸**：树形 × 勾选 × 跨页保持 × 虚拟滚动 × 固定列——五个开关理论 32 种组合，每一种都可能是 bug 工单。协议设计者必须为组合排优先级（比如 antd 明确 virtual 与部分 expandable 组合的行为边界），这是渲染层永远不用面对的问题。
3. **向后兼容**：Table 是被成千上万后台页面依赖的组件，`onChange` 的参数形状改一个字段名就是破坏性变更。所以协议要"一次给全、字段可扩展、语义不漂移"——新能力加在 `extra`/列配置里，老回调签名十年不动。

反过来说：**把渲染写对只需要懂 React，把协议设计对需要懂"两年后的调用方会怎么骂你"**。这就是 Table 被称为中后台之王的真正原因——它考的不是 `map` 出 `<tr>`，是 API 的远见。

#### Table 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：筛选后停在空页（页码 5，结果只剩 2 页）。
根因：antd 的 onChange 不会替你重置 current——筛选/排序变更时页码保持原值。
修法：onChange 里判断 extra.action !== 'paginate' 时强制 current: 1（见考点 1 示例）。

坑 2
症状：固定列与表体错位 1~N 像素，窗口缩放后加剧。
根因：未设 scroll.x / 存在宽度不确定的列，sticky 偏移按"估算宽"累加与实际渲染宽不符。
修法：scroll={{ x: 'max-content' }} 或给每列定宽；拖拽列宽时同步更新 colgroup（见考点 2/3）。

坑 3
症状：控制台警告 "Each record in table should have a unique key"，且勾选/展开莫名错行。
根因：没配 rowKey，框架回落到数组 index；翻页/排序后 index 对应的行换了人。
修法：rowKey 指向业务唯一键；确实没有就先在数据层补一个稳定的派生 key。

坑 4
症状：跨页多选提交时 selectedRows 比 selectedRowKeys 少。
根因：antd 的 selectedRows 只含当前 dataSource 里能匹配到的行，翻页即"失忆"。
修法：preserveSelectedRowKeys 保 keys；rows 自维护 key→row 缓存，提交前按 keys 补齐（见考点 4）。

坑 5
症状：拖列宽时整表抖动/文本被选中成片高亮。
根因：未开 table-layout: fixed（浏览器 auto 布局反算列宽）+ 未禁 user-select。
修法：fixed 布局 + colgroup 受控宽度 + pointer capture 期间 body 层禁选文本（见考点 3）。

坑 6
症状：开了 virtual 后行高不一的表格滚动跳动、sticky 表头穿帮。
根因：虚拟窗口化的前提是定高，行高漂移导致窗口估算错位。
修法：让 ROW_HEIGHT 成为协议（截断/固定行高），变高内容放展开行而不是撑高单元格。

坑 7
症状：多列排序时 onChange 里的 sorter 是数组，取 sorter.field 拿到 undefined。
根因：多列排序（多列 sorter 同时激活）时 sorter 参数是数组。
修法：先 Array.isArray 判别再取值（见考点 1 类型定义，两者都写进了类型）。
```

#### 考点 9：树形表格展开——数据协议、受控 expandedRowKeys 与 Tree 拍平的复用

考点 5 已经用递归渲染 + depth 缩进做出了树形表格的最小形态；这一节补上它没讲的三块：**树数据协议的校验**、**受控 expandedRowKeys 的完整形态**（含 `defaultExpandAllRows` 异步失效的正解）、以及**拍平渲染**——后者直接复用 [18-Tree.md](18-Tree.md) 考点 1 的 `flattenVisibleTree`（先 flatten 再窗口化），勾选父子联动、搜索命中路径等树操作算法也可复用 18-Tree 考点 2/5，本节不重复展开。

机制三条：

1. **数据协议**：行带 `children` 数组（`childrenColumnName` 可改），入口一次校验——重复 rowKey 让展开/勾选错行（树里更隐蔽：同名 key 在不同子树互串）；**循环引用**（A.children 指回祖先）让递归渲染直接爆栈，校验必须先于渲染。
2. **受控展开**：`expandedRowKeys` + `onExpandedRowsChange` 与行选择（考点 4）同构——状态是 key 集合，翻页/刷新不动集合。`defaultExpandAllRows` 只在首挂载生效（考点 5 已立牌），异步数据的正解是**数据到达后显式算全量父节点的 key**（展开全部 = 展开所有"当过父节点"的行，叶子无展开可言）。
3. **拍平渲染替代递归渲染**：`flattenTableTree(rows, expandedKeys)` 产出带 `depth/hasChildren/parentKey` 的平铺行数组，表体就是一次 `map`——与虚拟滚动（考点 6 要求平铺序）、跨页勾选天然兼容；递归渲染的唯一优势（子行包在父行 DOM 内）在 `<table>` 里根本用不上：`<tr>` 不能嵌套。

```ts
// tableTree.ts —— 树形表格的拍平与协议校验（18-Tree flattenVisibleTree 的表格版）
import type { Key } from 'react';

export interface FlatRow<R> {
  row: R;
  key: Key;
  depth: number;          // 根为 0；渲染缩进 = depth * indentUnit（考点 5）
  hasChildren: boolean;
  parentKey: Key | null;  // 树操作（勾选联动/命中路径）要沿它回溯，18-Tree 考点 2/5 直接复用
}

export interface FlattenTreeOptions<R> {
  getRowKey: (row: R) => Key;
  getChildren: (row: R) => R[] | undefined;   // childrenColumnName 的函数化（协议入口）
  expandedKeys: Set<Key>;
  validate?: boolean;                         // dev 期协议校验：重复 key / 循环引用，生产可关
}

export function flattenTableTree<R>(rows: R[], opts: FlattenTreeOptions<R>): FlatRow<R>[] {
  const out: FlatRow<R>[] = [];
  const seen = new Set<Key>();                       // 重复 key 检测账本

  const walk = (list: R[], depth: number, parentKey: Key | null, ancestors: Set<Key>) => {
    for (const row of list) {
      const key = opts.getRowKey(row);
      if (opts.validate) {
        if (seen.has(key)) console.warn(`[Table] duplicate rowKey: ${String(key)}（展开/勾选会错行）`);
        if (ancestors.has(key)) throw new Error(`[Table] 循环引用：${String(key)} 是自己的祖先（渲染会爆栈）`);
        seen.add(key);
      }
      const children = opts.getChildren(row);
      const hasChildren = !!children && children.length > 0;
      out.push({ row, key, depth, hasChildren, parentKey });
      if (hasChildren && opts.expandedKeys.has(key)) {
        ancestors.add(key);
        walk(children!, depth + 1, key, ancestors);  // 只有展开的分支继续下钻——拍平结果随展开态伸缩
        ancestors.delete(key);
      }
    }
  };
  walk(rows, 0, null, new Set());
  return out;
}

/** 全展开的正确集合：所有"含 children 的行"的 key（全树深度，与当前展开态无关） */
export function collectParentKeys<R>(rows: R[], getRowKey: (r: R) => Key, getChildren: (r: R) => R[] | undefined): Set<Key> {
  const keys = new Set<Key>();
  const walk = (list: R[]) => {
    for (const row of list) {
      const children = getChildren(row);
      if (children && children.length > 0) {
        keys.add(getRowKey(row));
        walk(children);                              // 子树里的父节点也要展开，孙行才可见
      }
    }
  };
  walk(rows);
  return keys;
}
```

受控展开 hook 与 antd 侧写法：

```tsx
// useTreeExpansion.ts —— 受控 expandedRowKeys + 异步数据的全展开正解
import { useCallback, useMemo, useState } from 'react';
import type { Key } from 'react';
import { flattenTableTree, collectParentKeys } from './tableTree';

export function useTreeExpansion<R>(rows: R[], getRowKey: (r: R) => Key,
  getChildren: (r: R) => R[] | undefined) {
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());

  const flat = useMemo(
    () => flattenTableTree(rows, { getRowKey, getChildren, expandedKeys, validate: true }),
    [rows, getRowKey, getChildren, expandedKeys],
  );

  const toggle = useCallback((key: Key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  /** defaultExpandAllRows 的异步正解：数据到达后由业务调用（或 effect 监听 rows 变化时调用一次） */
  const expandAll = useCallback(() => setExpandedKeys(collectParentKeys(rows, getRowKey, getChildren)), [rows, getRowKey, getChildren]);

  return { flat, expandedKeys, toggle, expandAll };
}

// antd 侧受控形态：expandable={{ expandedRowKeys, onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]) }}
// 状态唯一入口是 onExpandedRowsChange；onExpand 额外带 (expanded, record)，只做埋点不改状态。
```

```ts
// tableTree.test.ts —— 拍平顺序、循环防护与全展开集合
import { describe, it, expect } from 'vitest';
import { flattenTableTree, collectParentKeys } from './tableTree';

interface Row { id: string; children?: Row[] }
const getRowKey = (r: Row) => r.id;
const getChildren = (r: Row) => r.children;

const tree: Row[] = [
  { id: 'a', children: [
    { id: 'a1', children: [{ id: 'a1x' }] },
    { id: 'a2' },
  ]},
  { id: 'b' },
];

describe('flattenTableTree', () => {
  it('按展开态拍平，depth 与 parentKey 正确', () => {
    const flat = flattenTableTree(tree, { getRowKey, getChildren, expandedKeys: new Set(['a']) });
    expect(flat.map((f) => f.key)).toEqual(['a', 'a1', 'a2', 'b']); // a1x 不可见（a1 未展开）
    expect(flat[1]).toMatchObject({ depth: 1, parentKey: 'a', hasChildren: true });
    expect(flat[3]).toMatchObject({ depth: 0, parentKey: null, hasChildren: false });
  });
  it('循环引用抛错（先于渲染爆栈）', () => {
    const loop: Row[] = [{ id: 'x', children: [] as Row[] }];
    loop[0].children!.push(loop[0]);
    expect(() => flattenTableTree(loop, { getRowKey, getChildren, expandedKeys: new Set(['x']), validate: true }))
      .toThrow(/循环引用/);
  });
  it('collectParentKeys 覆盖全树父节点（含子树）', () => {
    expect([...collectParentKeys(tree, getRowKey, getChildren)].sort()).toEqual(['a', 'a1']);
  });
});
```

| 坑 | 症状 | 根因 | 修法 |
| --- | --- | --- | --- |
| 异步数据 defaultExpandAllRows 不生效 | 接口返回后树全收起 | 它只在首挂载（空数据）那一刻求值 | 数据到达后 `expandAll()`（collectParentKeys 算全量父） |
| 页面卡死/爆栈 | 数据源里 children 指回祖先 | 渲染前无循环检测 | 入口 `validate` 走 DFS 祖先集合 |
| 展开错行 | 不同子树里两行同 key | rowKey 不唯一（树里更隐蔽） | 重复 key 入口告警；业务侧补唯一键 |
| 展开后虚拟滚动跳动 | 递归渲染的子行绕过了窗口化 | `<tr>` 嵌套不存在，递归序 != 平铺序 | 拍平渲染（flat 数组直接 slice，考点 6 兼容） |
| 收起父行后勾选集合残留孙行 | 展开态与勾选态各自维护、无联动约定 | 两个 key 集合没有明确的一致性策略 | 显式决策：收起不丢勾选（antd 默认）并写进文档；需要联动时沿 parentKey 收集 |

#### 考点 10：列宽拖拽 × 固定列 × ellipsis 的冲突治理

考点 2（sticky 偏移 + 阴影）、考点 3（拖拽）、考点 7（ellipsis）各自成立；真实表格是三者叠加：**拖拽改宽度 → sticky 偏移重算 → 总宽变了 ping 状态重估 → ellipsis 溢出判定跟着变**。这条依赖链上任一环脱钩，就是"拖完列宽固定列错位"——Table 头号 bug 换了个马甲。冲突清单：

| # | 冲突 | 根因 | 修法 |
| --- | --- | --- | --- |
| 1 | 拖拽后固定列错位 | colgroup 更新了，sticky 偏移还按旧宽累加 | 偏移计算把 `widths` 作为依赖（考点 2 的 `useStickyOffsets` 已如此——拖拽只改一个 widths 数组，偏移自动重算） |
| 2 | 双表方案拖拽只动了一半 | 表头表体两个 table 各有 colgroup | 拖拽只写 state，两处 colgroup 都从同一 state 渲染（单一事实源，禁止任何一侧直改 DOM） |
| 3 | 拖窄后内容穿出/省略号消失 | min-width 未约束或 ellipsis 依赖的盒子被压缩 | minWidth 协议（省略号 + 图标宽度）+ `overflow: hidden` 在单元格内容盒上 |
| 4 | 拖宽一列整表变宽、出现横向滚动 | 总宽 = Σwidths，拖拽即扩表（extend 模式） | 按产品选模式：extend（Excel 右缘）或 squeeze（相邻列反向补偿，总宽不变） |
| 5 | 窗口缩放后阴影残留/丢失 | ping 状态只在 scroll 事件里重估，容器尺寸变化不触发 | ResizeObserver 监听滚动容器，尺寸变化时重算 ping |
| 6 | 拖最后一列（flex 列）无效 | 该列无 width，吃剩余空间 | 首次拖拽即把它转为定宽列（widths 从测量值初始化） |

```tsx
// useTableColumnsLayout.ts —— 拖拽/偏移/阴影的单一事实源：一个 widths 数组喂三处
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useStickyOffsets } from './StickyTable';       // 考点 2：输入 columns + widths，输出偏移
import type { ColumnsType } from './table-types';

export type ResizeMode = 'extend' | 'squeeze';          // 冲突 4 的两种产品答案

export function useTableColumnsLayout(columns: ColumnsType<unknown>, initialWidths: number[], opts: {
  mode?: ResizeMode; minWidth?: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;   // ping 状态的重估载体（考点 2 的滚动容器）
} & { onScrollRecompute?: () => void }) {
  const { mode = 'extend', minWidth = 60 } = opts;
  const [widths, setWidths] = useState<number[]>(initialWidths);
  const dragRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);

  // 冲突 1：偏移把 widths 作为依赖——拖拽落地即重算，无须手工联动
  const { leftOffsets, rightOffsets } = useStickyOffsets(columns, widths);

  const resizeColumn = useCallback((col: number, targetWidth: number) => {
    setWidths((prev) => {
      const next = [...prev];
      const wanted = Math.max(minWidth, targetWidth);
      if (mode === 'extend' || col + 1 >= prev.length) { next[col] = wanted; return next; }
      // squeeze：相邻可伸缩列反向补偿，总宽守恒（相邻列到 minWidth 后，差额退回被拖列）
      const rightIsFixed = columns[col + 1]?.fixed != null;
      if (rightIsFixed) { next[col] = wanted; return next; }        // 固定列不让宽——退化为 extend
      const give = Math.min(wanted - prev[col], prev[col + 1] - minWidth);
      next[col + 1] = prev[col + 1] - give;
      next[col] = prev[col] + give;
      return next;
    });
  }, [mode, minWidth, columns]);

  // 拖拽手柄（pointer capture 三件套与考点 3 相同，宽度出口统一走 resizeColumn）
  const handleFor = (col: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLSpanElement>) => {
      e.preventDefault(); e.stopPropagation();                       // 不冒泡成表头排序点击
      dragRef.current = { col, startX: e.clientX, startWidth: widths[col] };
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
    },
    onPointerMove: (e: ReactPointerEvent<HTMLSpanElement>) => {
      const d = dragRef.current;
      if (d && d.col === col) resizeColumn(col, d.startWidth + (e.clientX - d.startX));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLSpanElement>) => {
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.userSelect = '';
    },
  });

  // 冲突 5：容器尺寸变化也要重估 ping——ResizeObserver 补 scroll 事件的盲区
  useEffect(() => {
    const el = opts.scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => opts.onScrollRecompute?.());
    ro.observe(el);
    return () => ro.disconnect();
  }, [opts.scrollRef, opts.onScrollRecompute]);

  const colgroup = useMemo(                                   // 冲突 2：colgroup 是 widths 的纯投影，
    () => columns.map((c, i) => ({ key: String(c.key ?? i), width: widths[i] })), // 双表方案两处渲染同一投影
    [columns, widths],
  );

  return { widths, colgroup, leftOffsets, rightOffsets, handleFor, resizeColumn };
}
```

```ts
// useTableColumnsLayout.test.ts —— squeeze 守恒与偏移重算（纯函数部分）
import { describe, it, expect } from 'vitest';

// 把 resizeColumn 的纯计算逻辑抽出测试（与 hook 内一致）：
export function squeezeStep(prev: number[], col: number, targetWidth: number, minWidth: number, rightFixed: boolean): number[] {
  const next = [...prev];
  const wanted = Math.max(minWidth, targetWidth);
  if (rightFixed || col + 1 >= prev.length) { next[col] = wanted; return next; }
  const give = Math.min(wanted - prev[col], prev[col + 1] - minWidth);
  next[col + 1] = prev[col + 1] - give;
  next[col] = prev[col] + give;
  return next;
}

describe('column resize', () => {
  it('squeeze 模式总宽守恒（相邻列补偿）', () => {
    const prev = [100, 200, 300];
    const next = squeezeStep(prev, 0, 160, 60, false);
    expect(next[0]).toBe(160); expect(next[1]).toBe(140);           // 0 列 +60，1 列 -60
    expect(next.reduce((a, b) => a + b, 0)).toBe(prev.reduce((a, b) => a + b, 0));
  });
  it('相邻列到 minWidth 后差额退回被拖列（不再守恒于目标）', () => {
    const prev = [100, 70, 300];
    const next = squeezeStep(prev, 0, 200, 60, false);              // 想要 +100，右邻只能给 10
    expect(next[1]).toBe(60); expect(next[0]).toBe(110);            // 实得 +10
  });
  it('相邻列是固定列时退化为 extend（不让宽）', () => {
    const prev = [100, 200, 300];
    const next = squeezeStep(prev, 0, 160, 60, true);
    expect(next).toEqual([160, 200, 300]);
  });
  it('低于 minWidth 时钳制', () => {
    expect(squeezeStep([100, 200], 0, 10, 60, false)[0]).toBe(60);
  });
});
```

（阴影与 ellipsis 联动的其余部分不需要新代码：ping 状态机在考点 2 的 onScroll 里，ResizeObserver 已把尺寸变化路由回它；ellipsis 的溢出判定是悬停时测量的（考点 7），拖窄后下一次 hover 自动测对。）

#### 考点 11：表格状态 URL 同步——可分享的列表页

中后台的高频诉求：「把筛选结果发我一份」。做法是把分页/排序/筛选状态编码进 URL query——链接即状态，打开即还原。难点不在 encode/decode，在**双向同步的方向治理**：state 变 → URL（要节流）；用户后退 → URL 变 → state（这条路上绝不能再回写 URL，否则循环）。

机制四条：

1. **方向约定（镜像模式）**：state 是运行时事实源，URL 是它的投影；唯独 popstate 时刻（后退/前进、外部改址）URL 反客为主回填 state。两个方向各自单向，永不同时流动。
2. **schema 驱动编码**：每个状态字段声明 `{ key, parse, stringify, default }`——数字页码、枚举排序、多值筛选各写各的 codec，encode/decode 是对 schema 的纯遍历；加字段 = 加一行声明，不改同步机制。
3. **parse 必须防御**：URL 是用户可手改的输入。页码 NaN/越界回退 1，非法排序方向丢弃，未知筛选值清空——URL 崩不了组件，只是回到默认态。
4. **replaceState + trailing 节流**：`replaceState` 不产生历史记录（后退不会"退回第 3 页"）；连续变化 300ms trailing 合并为一次写入。分享链接就是同一 encode 的产物，无需第二套逻辑。

```ts
// useTableUrlState.ts —— schema 驱动的表格状态 ↔ URL 双向同步
import { useCallback, useEffect, useRef, useState } from 'react';

/** 字段编解码声明：T 为该字段在 state 里的类型；多值（?status=a&status=b）用字符串数组表达 */
export interface UrlField<T> {
  key: string;                                          // URL 参数名
  default: T;
  parse: (raw: string[] | undefined) => T;              // URL → state；非法值必须回退 default
  stringify: (v: T) => string[] | undefined;            // state → URL；undefined = 等于默认值，从 URL 删除（短链纪律）
}

/** 常用 codec：页码（防御 NaN/越界）、排序方向（枚举）、多值筛选 */
export const pageParam: UrlField<number> = {
  key: 'page', default: 1,
  parse: (raw) => {
    const n = Number(raw?.[0]);
    return Number.isInteger(n) && n >= 1 ? n : 1;       // NaN/0/负数/小数一律回第 1 页
  },
  stringify: (v) => (v === 1 ? undefined : [String(v)]),
};
export const orderParam: UrlField<'ascend' | 'descend' | undefined> = {
  key: 'order', default: undefined,
  parse: (raw) => (raw?.[0] === 'ascend' || raw?.[0] === 'descend' ? raw[0] : undefined),
  stringify: (v) => (v ? [v] : undefined),
};
export const valuesParam = (key: string): UrlField<string[]> => ({
  key, default: [],
  parse: (raw) => (raw ?? []).filter((v) => v.length > 0), // 空串过滤：?status= 不产生幽灵筛选项
  stringify: (v) => (v.length ? v : undefined),
});

export function encodeTableState<S extends Record<string, unknown>>(
  state: S, schema: { [K in keyof S]: UrlField<S[K]> },
): URLSearchParams {
  const params = new URLSearchParams();
  for (const name of Object.keys(schema) as (keyof S)[]) {
    const field = schema[name];
    const values = field.stringify(state[name]);
    values?.forEach((v) => params.append(field.key, v)); // 多值用重复参数（值含逗号也安全）
  }
  return params;
}

export function decodeTableState<S extends Record<string, unknown>>(
  params: URLSearchParams, schema: { [K in keyof S]: UrlField<S[K]> },
): S {
  const out = {} as S;
  for (const name of Object.keys(schema) as (keyof S)[]) {
    const field = schema[name];
    out[name] = field.parse(params.getAll(field.key));   // getAll：重复参数 → 字符串数组
  }
  return out;
}

/** trailing 节流的 replaceState：连续变化只写最后一次（机制 4） */
export function createThrottledReplace(ms = 300, replace: (url: string) => void = (u) => window.history.replaceState(null, '', u)) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;
  return (url: string) => {
    pending = url;                                       // trailing：后值覆盖前值
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (pending != null) { replace(pending); pending = null; }
    }, ms);
  };
}

/** 镜像模式的完整接线：初始化还原（分享链接）→ 变更镜像 → popstate 回填 */
export function useTableUrlState<S extends Record<string, unknown>>(
  schema: { [K in keyof S]: UrlField<S[K]> },
) {
  const [state, setState] = useState<S>(() => (          // 初始化：URL → state（分享还原的唯一入口）
    typeof window === 'undefined' ? ({} as S) : decodeTableState(new URLSearchParams(window.location.search), schema)
  ));
  const mirrorRef = useRef(true);                        // popstate 回填期间关闭镜像（防循环）

  useEffect(() => {                                      // state → URL（节流镜像）
    if (typeof window === 'undefined' || !mirrorRef.current) return;
    const qs = encodeTableState(state, schema).toString();
    createThrottledReplace()(window.location.pathname + (qs ? `?${qs}` : ''));
  }, [state, schema]);

  useEffect(() => {                                      // URL → state（仅 popstate：后退/前进/外部改址）
    const onPop = () => {
      mirrorRef.current = false;                         // 回填不回写
      setState(decodeTableState(new URLSearchParams(window.location.search), schema));
      requestAnimationFrame(() => { mirrorRef.current = true; }); // 回填落地后恢复镜像
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [schema]);

  const shareUrl = useCallback(() => {                   // 分享链接：encode 的同一产物
    const qs = encodeTableState(state, schema).toString();
    return window.location.origin + window.location.pathname + (qs ? `?${qs}` : '');
  }, [state, schema]);

  return { state, setState, shareUrl };
}
// 使用：useTableUrlState({ page: pageParam, order: orderParam, status: valuesParam('status') })，
// <Table pagination={{ current: state.page }} onChange={(p) => setState((s) => ({ ...s, page: p.current ?? 1 }))} />
```

```ts
// useTableUrlState.test.ts —— codec 防御、round-trip 与节流（纯函数层）
import { describe, it, expect, vi } from 'vitest';
import { encodeTableState, decodeTableState, createThrottledReplace, pageParam, orderParam, valuesParam } from './useTableUrlState';

const schema = { page: pageParam, order: orderParam, status: valuesParam('status') };

describe('table url state', () => {
  it('非法 URL 回退默认（页码 NaN/越界、非法枚举）', () => {
    const s = decodeTableState(new URLSearchParams('page=abc&order=up&status='), schema);
    expect(s.page).toBe(1);
    expect(s.order).toBeUndefined();
    expect(s.status).toEqual([]);                        // 空串被过滤
  });
  it('round-trip：默认值不进 URL（短链），非默认值进 URL 且可还原', () => {
    const p1 = encodeTableState({ page: 1, order: undefined, status: [] }, schema);
    expect(p1.toString()).toBe('');                      // 全默认 → 干净 URL
    const state2 = { page: 3, order: 'descend' as const, status: ['open', 'pending'] };
    const p2 = encodeTableState(state2, schema);
    expect(p2.toString()).toBe('page=3&order=descend&status=open&status=pending'); // 多值重复参数
    expect(decodeTableState(p2, schema)).toEqual(state2);
  });
  it('trailing 节流：连续三次只 replace 最后一次', () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    const push = createThrottledReplace(300, replace);
    push('/t?page=1'); push('/t?page=2'); push('/t?page=3');
    expect(replace).not.toHaveBeenCalled();             // 窗口内不写
    vi.advanceTimersByTime(301);
    expect(replace).toHaveBeenCalledTimes(1);           // 只写最后一次
    expect(replace).toHaveBeenCalledWith('/t?page=3');
    vi.useRealTimers();
  });
});
```

| 坑 | 症状 | 根因 | 修法 |
| --- | --- | --- | --- |
| 后退按钮逐页退（第 5 页 → 4 → 3…） | 每次翻页 pushState 进历史 | 用了 pushState | replaceState + 节流；真正的历史节点交给路由层 |
| 手改 URL 页码页面白屏 | parse 直接 Number(raw) 未防御 | URL 是不可信输入 | codec 层回退 default（NaN/越界/非法枚举） |
| popstate 与镜像互相触发（无限循环） | URL→state 的 useEffect 又触发 state→URL | 双向无方向闸门 | mirrorRef：回填期间关镜像 |
| 拖动筛选连点 20 次 history 写 20 次 | 无节流，Safari 控制台报 replaceState 频率超限 | 每次变化立即写 | trailing 节流（300ms 只写最后值） |
| 分享链接还原后筛选丢失 | 部分字段没进 schema（如 pageSize） | 编码清单与状态清单不同步 | schema 与 state 类型联动（`{ [K in keyof S]: UrlField<S[K]> }` 编译期强制字段对齐） |

#### 考点 12：可编辑单元格——受控编辑态与就地校验

中后台"改一个数字就为它开抽屉/弹窗"太重，就地编辑（点单元格变输入框，回车保存）是 Table 的进阶能力。状态所有权的通用机制（受控/非受控双模式）在 [02-A1-受控-非受控双模式-30-行-hook-处处要用.md](02-A1-受控-非受控双模式-30-行-hook-处处要用.md) 的 A1.3 `useControllableState` 已详述；本节的核心增量是一个**所有权切分决策**：**编辑态（editing）必须受控，草稿值（draft）必须非受控**——

- editing 受控：同一时刻"哪一格在编辑"是全局互斥约束（父组件要冻结行操作、高亮脏行），这个约束的裁判只能在父级；用 `editingKey`（`${rowKey}:${dataIndex}`）一个值表达。
- draft 非受控：草稿是输入中间态，外部没有消费方（没有人需要在"用户敲到第 3 个字"时介入），受控它只会换来每次击键两级数据流。提交时一次性上报——这是 A1"状态放低"原则的活例子。

状态机 `idle → editing ⇄ validating → idle`：双击/回车进入；Esc 丢弃草稿回 idle；Enter/blur 提交 → validating（异步校验/落库）→ 成功回 idle，**失败留在 editing 并就地显示错误**（错误上下文就在这个格子里，不用全局 toast）。

```tsx
// EditableCell.tsx —— 状态机 + 受控 editing + 非受控 draft + 就地校验
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface EditableCellProps<R> {
  value: ReactNode;                                   // 展示态渲染（通常来自 record 字段）
  record: R;
  editing: boolean;                                   // 受控：由父级 editingKey 派生
  onEditingChange: (editing: boolean) => void;        // 进入/退出都走它（父级改 editingKey）
  /** 提交：reject = 落库失败，保持编辑并就地显示异常文案 */
  onCommit: (draft: string) => Promise<void> | void;
  /** 同步校验：返回错误文案（null = 通过），失败就地显示 */
  validate?: (draft: string) => string | null;
  parse?: (draft: string) => string;                  // 提交前的归一（如 trim）
  editOn?: 'doubleClick' | 'click';
  'aria-label'?: string;
}

export function EditableCell<R>({ value, editing, onEditingChange, onCommit, validate,
  parse = (s) => s.trim(), editOn = 'doubleClick', ...rest }: EditableCellProps<R>) {
  const [draft, setDraft] = useState('');             // 非受控草稿：中间态不出组件
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑：草稿从当前值起笔 + 聚焦全选（覆盖式编辑是中后台主流）
  useEffect(() => {
    if (!editing) return;
    setDraft(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
    setError(null);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [editing, value]);

  const abort = () => {                               // Esc：丢弃草稿、清错误、退出编辑
    setError(null);
    onEditingChange(false);
  };

  const commit = async () => {
    const normalized = parse(draft);
    const localError = validate?.(normalized) ?? null;
    if (localError) { setError(localError); return; } // 同步校验失败：就地红字，保持 editing
    setSaving(true);
    try {
      await onCommit(normalized);                     // 异步落库：reject = 失败
      onEditingChange(false);                         // 成功才退出（失败留在 catch）
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败'); // 落库失败就地展示，可改后重试
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div
        {...(editOn === 'click' ? { onClick: () => onEditingChange(true) } : { onDoubleClick: () => onEditingChange(true) })}
        className="xx-editable-cell" title="双击编辑" tabIndex={0}  // 键盘可达：聚焦后 Enter 进入（A5 纪律）
        onKeyDown={(e) => { if (e.key === 'Enter') onEditingChange(true); }}
      >
        {value ?? '—'}
      </div>
    );
  }
  return (
    <div className="xx-editable-cell is-editing" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={draft}
        disabled={saving}
        aria-invalid={!!error || undefined}           // 校验状态进 aria（A5）
        aria-label={rest['aria-label']}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}  // 修改即清错（反馈即时消失）
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          if (e.key === 'Escape') { e.preventDefault(); abort(); } // Esc：丢弃草稿回展示态
        }}
        onBlur={() => { if (!error) void commit(); }} // blur 提交是默认；校验失败时不抢焦点冲突
        style={{ width: '100%', border: error ? '1px solid #ff4d4f' : '1px solid #d9d9d9', padding: '2px 6px' }}
      />
      {error && (
        <span role="alert" className="xx-editable-cell-error" style={{ position: 'absolute', top: '100%', left: 0,
          background: '#fff1f0', color: '#cf1322', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 10 }}>
          {error}
        </span>
      )}
    </div>
  );
}
```

父级装配三要点（editingKey 受控互斥的实现心法）：

- `editingKey` 用 `` `${rowKey}:${dataIndex}` `` 复合键，一个 state 表达"全表哪一格在编辑"——新格子进入时旧格子自动退出（互斥免费获得）；
- 列的 render 里 `<EditableCell editing={editingKey === cellKey} onEditingChange={(open) => setEditingKey(open ? cellKey : null)} …/>`，校验器按列注入（金额列 `/^\d+(\.\d{1,2})?$/`）；
- `onCommit` 的协议带 record/oldValue（组件 props），业务侧做乐观更新与失败回滚；组件只管"成功退出编辑、失败留在编辑"。

```tsx
// EditableCell.test.tsx —— 状态机关键路径（Testing Library，C4 的标准栈）
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableCell } from './EditableCell';

const setup = (props: Partial<Parameters<typeof EditableCell>[0]> = {}) =>
  render(<EditableCell value="100" record={{}} editing onEditingChange={vi.fn()} onCommit={vi.fn()} {...props} />);

describe('EditableCell', () => {
  it('Esc 丢弃草稿并退出编辑', () => {
    const onEditingChange = vi.fn();
    setup({ onEditingChange });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onEditingChange).toHaveBeenCalledWith(false); // 草稿未进 onCommit
  });

  it('同步校验失败：就地显示错误、保持编辑、不调 onCommit', () => {
    const onCommit = vi.fn();
    setup({ validate: (v) => (Number.isNaN(Number(v)) ? '必须是数字' : null), onCommit });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('必须是数字');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('落库失败（onCommit reject）：留在编辑态并显示异常文案', async () => {
    setup({ onCommit: () => Promise.reject(new Error('网络错误')) });
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByRole('alert')).toHaveTextContent('网络错误');
  });

  it('成功提交：草稿经 parse 归一后上报', async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined);
    const onEditingChange = vi.fn();
    setup({ onCommit, onEditingChange });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: ' 42 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith('42')); // trim 归一
    await waitFor(() => expect(onEditingChange).toHaveBeenCalledWith(false));
  });
});
```

| 坑 | 症状 | 根因 | 修法 |
| --- | --- | --- | --- |
| 两格同时编辑 | editing 各存在各的 | 编辑态没受控到父级 | editingKey 受控（`${rowKey}:${dataIndex}` 全表互斥） |
| 每敲一键整表重渲染 | 草稿受控到父 state | 中间态没有外部消费方 | draft 非受控 local state，提交时一次性上报 |
| blur 与校验错误打架（焦点循环） | blur 强制提交又失败，错误浮层又被 blur | 两个出口竞争 | error 存在时 blur 不 commit（校验失败不抢焦点） |
| 落库失败值已变（假成功） | 乐观更新后没有回滚路径 | onCommit 只给新值 | 协议带 oldValue/record（父级装配层可回滚） |
| Esc 被 Modal 的 ESC 层栈抢走（12 号文档考点三） | 格子在弹层内时两级 ESC 都监听 | 层栈粒度太粗 | 格子 keydown 先 stopPropagation，再交给 Modal 层（A6 事件边界） |

