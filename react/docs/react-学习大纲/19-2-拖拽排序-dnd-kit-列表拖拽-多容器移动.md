---
title: "2. 拖拽排序（dnd-kit：列表拖拽 + 多容器移动）"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [18-4-7-其他高频场景.md](18-4-7-其他高频场景.md)。

#### 2. 拖拽排序（dnd-kit：列表拖拽 + 多容器移动）

**是什么。** dnd-kit 是目前 React 生态的拖拽标准库（`@dnd-kit/core` 抽象"拖"与"放"，`@dnd-kit/sortable` 提供"排序"语义）。两个核心概念：**Sensor（传感器）**回答"什么输入算拖拽"（鼠标/触摸/键盘），**collisionDetection（碰撞策略）**回答"松手时落在哪个目标上"（`closestCenter` 按中心距离、`rectIntersection` 按矩形相交）。

**为什么需要。** 原生 HTML5 Drag and Drop API 在移动端触摸设备上不工作、键盘完全无法访问、样式定制极其别扭。dnd-kit 用 Pointer Events 统一了鼠标/触摸、内置键盘传感器（可访问性）、用 transform 驱动动画（不触发布局重排），且按"渲染时才订阅"的方式组织，性能远好于老的 react-beautiful-dnd（后者已停止维护）。

安装：

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**怎么做（机制分步）。**

*单列表排序*的分工：`DndContext` 包住整棵树，持有 sensors 与碰撞策略，回调里拿到"谁（active）拖到了谁（over）上面"；`SortableContext` 圈定参与排序的集合（`items` 是 id 数组）；每个列表项用 `useSortable({ id })`，它返回 `attributes`（无障碍属性）、`listeners`（指针/键盘事件，决定按住哪里能拖）、`setNodeRef`、`transform/transition`（驱动位移的样式）与 `isDragging`。`onDragEnd` 里用 `arrayMove` 不可变地交换数组位置——**React 靠新数组引用触发重渲染，绝不能原地 splice**。

*点击与拖拽的冲突*：PointerSensor 默认按下即拖，列表项上的按钮会点不动。解法是 `activationConstraint: { distance: 8 }`——移动超过 8px 才判定为拖拽，否则按点击处理；或者把 `listeners` 只铺在"拖拽把手"元素上（`<span {...attributes} {...listeners}>⠿</span>`），内容区留给按钮。

*多容器（Kanban）的增量知识*：每列用 `useDroppable` 注册为放置目标；`DndContext` 的碰撞策略换 `rectIntersection`（跨容器时 `closestCenter` 只算中心距离，容易"吸到错误的列"）；**跨容器搬运放在 `onDragOver` 里做**——拖动经过另一列时立刻把卡片搬过去（实时预览），`onDragEnd` 只负责最终的同列排序，这是官方 Kanban 示例的标准结构。Sensors 深入（启动延迟/启动距离/自定义传感器）与碰撞策略深入，见《react-进阶大纲-复杂场景》1.6「拖拽原理（dnd-kit 精讲）」。

**代码示例。** 单列表拖拽排序（完整可运行）：

```tsx
// components/SortableList.tsx
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Item {
  id: string;
  title: string;
}

/** 单行：useSortable 把这一项注册进排序系统 */
function SortableRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      {...attributes} // 无障碍：role/tabIndex/aria 描述（键盘用户也能拖）
      {...listeners}  // 指针与键盘事件：决定"按住哪里拖"
      className={isDragging ? 'row row-dragging' : 'row'}
      style={{
        transform: CSS.Transform.toString(transform), // dnd-kit 用 transform 驱动位移（不触发重排）
        transition,                                    // 抹位让出空位时的补间动画
      }}
    >
      <span className="handle">⠿</span>
      {item.title}
    </li>
  );
}

export function SortableList() {
  const [items, setItems] = useState<Item[]>([
    { id: 'a', title: '给客户回电话' },
    { id: 'b', title: '写周报' },
    { id: 'c', title: '买菜' },
  ]);

  const sensors = useSensors(
    // distance:8 —— 移动 8px 才算拖拽，让点击/选择文本不被误判
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // 键盘传感器：方向键选目标、空格落下（sortableKeyboardCoordinates 定义按键到坐标的映射）
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const from = prev.findIndex((i) => i.id === active.id);
        const to = prev.findIndex((i) => i.id === over.id);
        // arrayMove 不可变地移动：返回新数组，旧数组不动
        return arrayMove(prev, from, to);
      });
      // 真实业务在此调用 PATCH /api/todos/order 保存顺序
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // 单列表：找中心最近的落点足够
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="sortable-list">
          {items.map((item) => (
            <SortableRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
```

多容器 Kanban 的要点骨架（三列互拖，完整逻辑核心在 `onDragOver` + `onDragEnd` 两个回调）：

```tsx
// components/KanbanBoard.tsx
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  id: string;
  title: string;
}
type ColumnId = 'todo' | 'doing' | 'done';
type Board = Record<ColumnId, Card[]>;

function CardItem({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? 'kanban-card dragging' : 'kanban-card'}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {card.title}
    </div>
  );
}

function Column({ id, title, cards }: { id: ColumnId; title: string; cards: Card[] }) {
  // 每列注册为放置目标：卡片可以拖进来
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? 'kanban-col over' : 'kanban-col'}>
      <h3>
        {title}（{cards.length}）
      </h3>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </SortableContext>
    </div>
  );
}

/** 工具：id 可能是列 id 也可能是卡片 id，统一解析出它所在的列 */
function findColumn(board: Board, id: string): ColumnId | undefined {
  if (id === 'todo' || id === 'doing' || id === 'done') return id;
  return (Object.keys(board) as ColumnId[]).find((col) =>
    board[col].some((c) => c.id === id),
  );
}

export function KanbanBoard() {
  const [board, setBoard] = useState<Board>({
    todo: [
      { id: 'c1', title: '画原型' },
      { id: 'c2', title: '写接口文档' },
    ],
    doing: [{ id: 'c3', title: '登录接口联调' }],
    done: [{ id: 'c4', title: '需求评审' }],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // onDragOver：拖动过程中卡片经过另一列时"即时搬运"——这是跨容器体验的关键，
  // 等到 onDragEnd 才搬，用户看不到实时预览
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeCol = findColumn(board, String(active.id));
    const overCol = findColumn(board, String(over.id));
    if (!activeCol || !overCol || activeCol === overCol) return;

    setBoard((prev) => {
      const moving = prev[activeCol].find((c) => c.id === active.id);
      if (!moving) return prev;
      return {
        ...prev,
        [activeCol]: prev[activeCol].filter((c) => c.id !== active.id),
        [overCol]: [...prev[overCol], moving], // 先入列尾，松手时 onDragEnd 再精排
      };
    });
  }

  // onDragEnd：只在同列内做最终排序
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const col = findColumn(board, String(active.id));
    if (!col) return;
    setBoard((prev) => {
      const list = prev[col];
      const from = list.findIndex((c) => c.id === active.id);
      const to = list.findIndex((c) => c.id === over.id);
      if (from === -1 || to === -1 || from === to) return prev;
      return { ...prev, [col]: arrayMove(list, from, to) };
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection} // 多容器：按矩形相交判定落点，避免"吸错列"
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban">
        <Column id="todo" title="待办" cards={board.todo} />
        <Column id="doing" title="进行中" cards={board.doing} />
        <Column id="done" title="已完成" cards={board.done} />
      </div>
    </DndContext>
  );
}
```

**常见坑。**

- **症状**：列表项上的按钮点不动，一按就变成拖拽。**根因**：PointerSensor 按下即拖，`listeners` 铺满整行。**修法**：`activationConstraint: { distance: 8 }`，或把 `listeners` 只挂在把手元素上。
- **症状**：拖完之后列表顺序错乱、勾选状态串行。**根因**：列表 `key` 用了 index——排序改变后 index 与数据错位，React 复用错元素。**修法**：永远用稳定业务 id 作 key（`items.map(i => i.id)` 的 id 同时喂给 `SortableContext` 和 `key`，两处必须一致）。
- **症状**：拖动时元素原地不动或瞬移。**根因**：忘了把 `transform/transition` 绑到 style 上。**修法**：`style={{ transform: CSS.Transform.toString(transform), transition }}`。
- **症状**：Kanban 拖到两列之间松手，卡片落在错误的列。**根因**：多容器用了 `closestCenter`，它只比较中心距离，与"视觉上压住哪列"不符。**修法**：`rectIntersection`；更精细的（重叠面积最大）见《react-进阶大纲-复杂场景》1.6。
- **症状**：拖拽过程中整页卡顿。**根因**：`onDragOver` 高频触发，每次都做重计算/请求。**修法**：`onDragOver` 里只做本地状态搬运，防抖后才发请求；`DragOverlay` 的用法进阶篇再展开。

##### 补充：实战变体——排序结果的持久化：保存什么、怎么防竞态、失败怎么回滚

**是什么。** 拖完顺序后要落到服务端。三个决策点：保存粒度（发什么）、请求竞态（连拖两次怎么办）、失败处理（回滚还是重试）。

**保存粒度取舍。**

| 方案 | 请求体 | 后端要做的事 | 适用 |
|---|---|---|---|
| 全量 id 数组 | `{ ids: [a, c, b, …] }` | 一个事务里按序重排（`UPDATE … CASE` 或逐行） | 几十到几百条，简单可靠，最常用 |
| 单项新位置 | `{ id, newIndex }` | 计算其余项如何腾位 | 列表很长、想发最小 payload；但两个客户端并发拖动时各自算的 newIndex 会互相踩 |
| 锚点相对位置 | `{ id, beforeId, afterId }` | 按锚点插入语义重排 | 跨端同步、有协同语义的场景最稳 |

下面按最常用的全量方案实现。

**竞态从哪来。** 用户拖 A→B（请求 1 在途），马上又拖 B→C（请求 2）。如果请求 2 先到服务端、请求 1 后到，最终落库的是旧顺序。这是请求序号守卫（13 号文件 4.2.1 已展开"读"侧）在**写入侧**的变体：写入侧的通用解法是单飞队列（single-flight）——在途请求未完成时，新顺序只进"最新待发"槽位，当前请求完成后只发槽里那份。中间版本根本不上路，服务端永远按顺序收到最后一个版本：

**代码示例。**

```tsx
// hooks/useOrderPersistence.ts
import { useCallback, useRef } from 'react';

interface UseOrderPersistenceArgs<T> {
  /** 真正的保存请求：发全量 id 顺序 */
  saveOrder: (ids: string[]) => Promise<void>;
  /** 保存失败且没有更新的排队时调用：调用方恢复快照并提示 */
  onGiveUp: (snapshot: T[]) => void;
}

export function useOrderPersistence<T extends { id: string }>({
  saveOrder,
  onGiveUp,
}: UseOrderPersistenceArgs<T>) {
  const snapshotRef = useRef<T[] | null>(null); // 最近一次拖动前的顺序
  const inFlightRef = useRef(false);
  const queuedRef = useRef<string[] | null>(null); // 最新待发顺序（只有一个槽位）

  const flush = useCallback(async () => {
    if (inFlightRef.current || queuedRef.current === null) return;
    inFlightRef.current = true;
    const payload = queuedRef.current;
    queuedRef.current = null; // 拿走即清空：途中又来的新顺序会重新入槽
    try {
      await saveOrder(payload);
    } catch {
      // 只有"没有更新的排队"才回滚——有排队说明用户又拖了，最新顺序即将出发，旧失败不回滚
      if (queuedRef.current === null && snapshotRef.current) {
        onGiveUp(snapshotRef.current);
      }
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current !== null) void flush(); // 排队期间又拖了：接着发最新的
    }
  }, [saveOrder, onGiveUp]);

  /** 拖动落定前捕获快照（handleDragEnd 里、计算 next 之前调用） */
  const capture = useCallback((snapshot: T[]) => {
    snapshotRef.current = snapshot;
  }, []);

  /** 拖动落定后调用：记录最新顺序并尝试出发 */
  const schedule = useCallback((items: T[]) => {
    queuedRef.current = items.map((i) => i.id);
    void flush();
  }, [flush]);

  return { capture, schedule };
}
```

接入 4.2 的 SortableList（只改 handleDragEnd，其余不动）：

```tsx
export function SortableList() {
  const [items, setItems] = useState<Item[]>([
    { id: 'a', title: '给客户回电话' },
    { id: 'b', title: '写周报' },
    { id: 'c', title: '买菜' },
  ]);

  const { capture, schedule } = useOrderPersistence<Item>({
    saveOrder: (ids) =>
      fetch('/api/todos/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    onGiveUp: (snapshot) => {
      setItems(snapshot); // UI 回滚到拖动前
      // toast.error('顺序保存失败，已恢复') —— 命令式 Toast 见 16 号文件 4.5.2
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // 事件回调里的 items 一定是拖动前的顺序：拖动过程中 items 没有被改过
    capture(items);
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    schedule(next); // 真实业务在此触发保存
  }
  // ...DndContext / SortableContext 的 JSX 同 4.2
}
```

**关键取舍与坑。**

1. **快照时机**：在 `handleDragEnd` 里直接读闭包中的 `items`——事件处理器拿到的必是本次渲染的最新值（拖动过程中列表未变），它就是"拖动前顺序"的本体，不存在陈旧闭包；不要在 `setItems` 的函数式更新里做 `capture`（更新函数应当是纯函数，StrictMode 双调用会执行两次）。
2. **失败回滚是"确认式保存"的策略。** 另一派是"乐观保存"：不等响应就当成功，失败再回滚——思想同 17 号文件 4.6.3 乐观更新，此处指路不展开。排序场景因为回滚会把用户辛苦拖的顺序跳回去、体验代价大，确认式（保存中给个轻提示）更稳。
3. **连拖可再叠一层防抖**：最后一个 dragEnd 之后 500ms 才 schedule，把"拖 5 次发 5 个请求"压成 1 个——防抖机制 14 号文件 4.3.1 已展开，单飞队列之上加一行定时器即可。
4. **多标签页并发**：单飞只管本标签页的请求顺序，管不了另一个标签页的写入——那是服务端版本号/乐观锁的课题；前端至少要在回滚提示文案里承认这种可能（"顺序保存失败，可能与他人操作冲突"）。

##### 补充：性能量化——大列表拖拽何时退化、怎么测、怎么救

**先说结论。** 拖拽本身用 transform 位移（合成器线程处理，不走布局）非常便宜，贵的永远是**重渲染的范围**。退化路径三级：行组件没 memo（任何 setState 全列表重渲染）→ `onDragOver` 高频触发且做重计算（看板搬运，每秒几十次全列渲染）→ 列表大到 DOM 本身成为瓶颈（千行级）。

**测量。**（方法论同 28 号性能篇"测量先行"：没有数据之前不谈优化。）

```tsx
// 用 Profiler 包住看板，拖一次看一行日志
import { Profiler } from 'react';

function BoardWithProfiler() {
  return (
    <Profiler
      id="kanban"
      onRender={(id, phase, actualDuration, baseDuration) => {
        // 拖动期间 phase 为 'update'；actualDuration 是本次提交这棵子树的实际渲染耗时
        console.log(
          `[perf] ${id} ${phase} 实际 ${actualDuration.toFixed(1)}ms / 基线 ${baseDuration.toFixed(1)}ms`,
        );
      }}
    >
      <KanbanBoard />
    </Profiler>
  );
}
```

操作脚本（保证可对比）：固定 300 张卡片，Performance 面板录制 10 秒匀速拖动横穿三列。判定标准：**单次 commit 的 actualDuration 超过 16ms 就会掉帧**；拖动期间 commit 次数 × 耗时把主线程吃满，说明重渲染范围失控。

**优化三步（按性价比排序）。**

1. **行组件 memo + props 引用稳定**。`const CardItem = memo(function CardItem(…) {})`；同时检查 props：`card` 对象引用要稳定（本节 Kanban 的 setBoard 用 filter/spread、不改旧对象，已满足）；不要在 JSX 里现场构造 props（内联 `style={{...}}`、内联对象都会让 memo 比较失败）。效果：onDragOver 搬运时只有"发生变化的列"重渲染，静态列整体跳过。
2. **查表代替遍历**。`findColumn` 对每次 onDragOver 做 O(列数 × 卡数) 遍历，300 卡 × 高频触发时不可忽视；用 `useMemo` 维护 id → 列 的 Map 索引，查询 O(1)：

```tsx
// KanbanBoard 内：id → 列 的索引，替代 findColumn 的双重遍历
const columnIndex = useMemo(() => {
  const map = new Map<string, ColumnId>();
  for (const col of Object.keys(board) as ColumnId[]) {
    for (const card of board[col]) map.set(card.id, col);
  }
  return map;
}, [board]);

// onDragOver 里：const activeCol = columnIndex.get(String(active.id));
```

索引依赖 `[board]`——它随每次搬运重建，成本 O(N) 但摊进一次渲染，比每次事件里 O(N) 遍历好（且非拖拽渲染也复用）。

3. **DragOverlay 隔离"跟手元素"**。不用 overlay 时，被拖卡片的 transform 随 pointermove 逐帧更新，它的组件每帧重渲染；用 `<DragOverlay>` 后原位只留占位、跟手的是独立 overlay 元素。用法与取舍在进阶篇 1.6 已展开，此处指路。

**典型量级对比**（300 卡、匀速拖动 10 秒，示例数据、看量级）：

| 阶段 | 每次 onDragOver 的 commit 耗时 | 现象 |
|---|---|---|
| 无 memo | 25~35ms（全列表重渲染） | 明显掉帧、拖动"粘滞" |
| 行 memo | 6~9ms（仅活动列渲染） | 基本流畅 |
| memo + Map 索引 | 3~5ms | 60fps 稳定 |

**何时彻底换方案。** 卡片数过千，无论怎么省，reconciliation 要 diff 的孩子数量摆在那里、DOM 节点数也是硬开销——上虚拟列表（14 号文件 4.3.3，只渲染视口内约 30 行）。dnd-kit 与虚拟化组合的两个注意点：虚拟行高要固定（测量与 transform 定位依赖它）；`SortableContext` 的 items 仍传**全量** id 数组（排序语义需要全量，虚拟化只管渲染）。

##### 补充：自测题与面试题

1. **PointerSensor 的 `activationConstraint: { distance: 8 }` 解决什么问题？还有哪种解法？**
   要点：区分点击与拖拽——按下即拖会让列表项上的按钮点不动；移动超过 8px 才判定为拖拽。替代方案：`listeners` 只铺在拖拽把手元素上，内容区留给交互。
2. **多容器场景为什么换 `rectIntersection`？跨容器搬运为什么写在 `onDragOver` 而不是 `onDragEnd`？**
   要点：`closestCenter` 只比较中心距离，两列并排时容易"吸到错误的列"；`onDragOver` 里即时搬运给出实时预览，`onDragEnd` 只做同列精排——等松手才搬，用户看不到中间态。
3. **拖拽列表的 `key` 为什么必须用稳定业务 id？用 index 会发生什么？**
   要点：排序改变后 index 与数据错位，React 按 key 复用错元素，勾选/输入状态"串行"；同一 id 要同时喂给 `SortableContext` 的 items 和列表项的 key，两处必须一致。
4. **保存拖拽顺序的三种请求方案与取舍？写入侧竞态怎么防？**
   要点：全量 ids（简单可靠、最常用）/ 单项 newIndex（最小 payload、并发互踩）/ 锚点相对位置（协同语义最稳）；竞态用单飞队列——在途时新顺序只进最新槽位，完成后只发最新，思想是写入版的请求序号守卫（读侧见 13 号文件 4.2.1）。
5. **拖拽卡顿的排查顺序？**
   要点：先 Profiler 量 commit 次数与耗时 → 行 memo + props 引用稳定 → onDragOver 内遍历换 Map 索引 → DragOverlay 隔离跟手元素 → 千行级上虚拟列表；不测量就优化是大忌。
6. **键盘怎么完成一次拖拽？**
   要点：KeyboardSensor + `sortableKeyboardCoordinates`：Tab 聚焦到把手（`attributes` 提供 role/tabIndex/aria 描述），空格拾起，方向键选目标，再按空格落下——无障碍是 dnd-kit 相对原生 DnD API 的核心优势之一（原生 API 触摸不工作、键盘完全不可达）。

