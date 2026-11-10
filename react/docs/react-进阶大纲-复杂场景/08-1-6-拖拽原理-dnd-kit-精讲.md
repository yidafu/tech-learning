---
title: "1.6 拖拽原理（dnd-kit 精讲）"
---

> 本文是《1. 通用底座（1.5 周，先于一切场景）》按小节拆分后的续篇，上一部分见 [07-1-5-Undo-Redo-三种实现.md](07-1-5-Undo-Redo-三种实现.md)。

### 1.6 拖拽原理（dnd-kit 精讲）

- 核心概念：`DndContext` / `useDraggable` / `useDroppable` / `useSortable` / `DragOverlay`
- Sensors：Pointer / Keyboard（无障碍）/ Touch；启动延迟 vs 启动距离（点击与拖拽冲突）
- 碰撞算法选择：`closestCenter`（排序）vs `closestCorners` vs `pointerWithin`（嵌套容器必用组合策略）
- **DragOverlay 预览层**：拖动时渲染"替身"，避免原元素被拉伸导致布局跳动（高频坑）
- ✍️ 练习：两个列表互拖 + Kanban 多列嵌套排序（含键盘拖拽）

#### 是什么

dnd-kit 是一套 headless（无头）拖拽原语库：它负责拖拽的全部**行为**（传感器、碰撞检测、键盘无障碍、自动滚动），不负责任何**样式**。相比 `react-beautiful-dnd`（已停止维护）和原生 HTML5 DnD（移动端几乎不可用、样式定制困难），dnd-kit 是当前 React 拖拽的事实标准，也是第 3 章表单设计器、第 6 章低代码画布的拖拽地基。

"headless"的含义：hook 返回 `transform`（位移）、`isDragging`（状态）等数据，元素长什么样、拖影是什么、容器多高，全由你决定。行为与 UI 分离，正好匹配本章"内核与物料分离"的思想。

#### 五个核心概念逐个讲

**概念 1：`DndContext`——拖拽会话的总控**

一条拖拽链路里只放一个 `DndContext`（dnd-kit 实际支持嵌套 DndContext 以实现拖拽把手等场景，但本课程的约定是：一个画布一个 DndContext，避免碰撞检测归属歧义），它统一配置传感器、碰撞算法、无障碍播报，并接管整段生命周期回调。一次拖拽从 pointerdown 到松手是一个"会话"，所有状态（谁在被拖、悬停在谁上）都由它调度：

```tsx
import {
  DndContext, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'

function Board() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(e: DragStartEvent) { /* 记录 activeId，供 DragOverlay 显示替身 */ }
  function handleDragOver(e: DragOverEvent) { /* 拖动过程中实时响应"悬停到了谁上" */ }
  function handleDragEnd(e: DragEndEvent) { /* 松手落位：数据变更在这里做 */ }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* 可拖/可放的元素都挂在 context 内 */}
    </DndContext>
  )
}
```

生命周期分工必须记牢：`onDragStart` 只做记录；`onDragOver` 做跨容器实时搬运（体验关键）；`onDragEnd` 做最终排序落位与数据提交。状态更新（undo 历史、store 写入）集中在 `onDragEnd`，`onDragOver` 里只做"搬运预览"级别的状态调整。

**概念 2：`useDraggable`——把元素变成"可拖的"**

```tsx
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function MaterialCard({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <button
      ref={setNodeRef}   // 元素本体注册进拖拽系统
      {...listeners}     // pointerdown 等事件绑定（必须挂上才能拖）
      {...attributes}    // role/aria-*/tabindex：键盘与读屏支持
      style={{
        // 位移用 translate 而不是改 left/top：只走合成层，不触发 layout
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1, // 被拖起时的样式反馈
      }}
    >
      {label}
    </button>
  )
}
```

`attributes` 值得单独强调：它包含 `role="button"`、`aria-describedby`、`tabindex`，是键盘拖拽与读屏播报（"已抬起，按方向键移动"）的基础。丢弃 attributes 等于丢掉无障碍。

**概念 3：`useDroppable`——把元素变成"可放的"**

```tsx
import { useDroppable } from '@dnd-kit/core'

function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 80,
        outline: isOver ? '2px dashed skyblue' : '1px dashed #ccc', // 悬停高亮
      }}
    >
      放到这里
    </div>
  )
}
```

`isOver` 表示"当前拖拽物悬停在我上方"，由碰撞检测算法裁决——它判得准不准，取决于你选的碰撞算法（下文）。设计器"物料区 → 画布"的拖入，目标 droppable 就是各容器节点。

**概念 4：`useSortable`——列表内排序（= draggable + droppable + 排序动画）**

排序场景要的是"拖起第 2 项，其余项实时腾位"，手动组合 draggable+droppable 很难写对，`useSortable` 打包了全部三件事，配合 `SortableContext` 提供列表上下文（items 顺序、排序策略）：

```tsx
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ id, title }: { id: string; title: string }) {
  const {
    attributes, listeners,
    setNodeRef, setActivatorNodeRef, // 后者：把手元素（只有把手能拖，其余区域可放按钮/输入框）
    transform, transition, isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), // 腾位动画的位移
        transition,                                    // 腾位动画的缓动（库算好时长）
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span ref={setActivatorNodeRef} {...listeners} {...attributes} className="handle">
        ⠿ 拖我
      </span>
      <span>{title}</span>
      <button onClick={() => console.log('正常点击不受拖拽影响')}>操作</button>
    </li>
  )
}

function SortableList({ items }: { items: { id: string; title: string }[] }) {
  return (
    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <ul>{items.map((item) => <SortableItem key={item.id} id={item.id} title={item.title} />)}</ul>
    </SortableContext>
  )
}
```

`onDragEnd` 里用 `arrayMove` 完成数据落位：

```tsx
import { arrayMove } from '@dnd-kit/sortable'

function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over || active.id === over.id) return
  const oldIndex = items.findIndex((i) => i.id === active.id)
  const newIndex = items.findIndex((i) => i.id === over.id)
  setItems((prev) => arrayMove(prev, oldIndex, newIndex)) // 不可变移动
}
```

策略（strategy）还有 `horizontalListSortingStrategy`、`rectSortingStrategy`（网格）等，按列表方向选。`items` 传 id 数组——又见 1.1 的"稳定 id"原则，dnd-kit 全链路用 id 标识条目。

**概念 5：`DragOverlay`——拖拽预览层（替身）**

```tsx
import { DndContext, DragOverlay } from '@dnd-kit/core'

function Board() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeItem = items.find((i) => i.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={(e) => { handleDragEnd(e); setActiveId(null) }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableList items={items} />
      {/* 替身：渲染在 body 级 portal，跟随指针，落点动画由 dropAnimation 配置 */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem ? <ItemCard item={activeItem} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**DragOverlay 为什么能防布局跳动**（高频坑的原理）。不用 overlay 时，位移 `transform` 直接打在**原元素**上，而原元素仍在文档流里占着位置，问题接连而来：

1. **被拉伸/裁剪**：原元素受父容器约束——flex 拉伸、`overflow: hidden` 裁剪、`max-width` 换行。拖到列表边缘时替身"变扁""被切角"，就是原元素被父容器揉捏的结果；
2. **"取出原元素"的两难**：你想给原元素 `position: fixed` 让它脱离约束？原位置立即塌陷，兄弟节点先整体跳一下（补位），落点处再跳一下（回填）——这就是"布局跳动"的直接来源；
3. **每帧 layout**：跟随指针若靠改 `left/top`，每帧触发重排。

DragOverlay 的解法：原元素**留在原地**（半透明显示，布局纹丝不动），替身渲染在 `DndContext` 外层的 portal 里（body 直属、`position: fixed`、不受任何业务容器约束），跟随指针只改 `transform`——合成层动画，零 layout。落点动画（dropAnimation）由库统一收尾。总结成一句：**占位与跟随分离，布局天然稳定**。

#### Sensors：启动延迟 vs 启动距离

**问题的本质**：`pointerdown` 既是"点击"的开始，也是"拖拽"的开始，浏览器无法读心。不做约束的话，想点元素的瞬间就会启动拖拽，click 事件被吞掉；触屏更糟——手指按下即拖拽启动，连列表滚动都做不到（一滚就变拖拽）。所以每种 Sensor 都支持 `activationConstraint`，用两种策略区分意图：

| 策略 | 语义 | 效果 | 适用 |
|---|---|---|---|
| `distance: N` | 移动超过 N 像素才算拖拽 | 按下不动 = 点击（0 干扰），拖拽 0 延迟 | 鼠标/指针 |
| `delay: N` | 按住 N 毫秒才算拖拽 | 按住不动才进入拖拽，期间移动可配 `tolerance` 容忍抖动 | 触屏（保留滚动） |

```tsx
import {
  PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  // 鼠标：移动 5px 才启动 → 点击零延迟、拖拽不误触
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  // 触屏：按住 180ms 才启动，8px 容差 → 手指滑动仍是滚动列表
  useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  // 键盘：配合 sortableKeyboardCoordinates，方向键在"列表间/列表内"正确移动
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

经验值：Pointer `distance` 4–8px；Touch `delay` 150–250ms + `tolerance` 5–8px。另一个缓解手段是**拖拽把手**（`setActivatorNodeRef`）：只有把手区域可拖，元素其余部分正常点击/输入——物料卡片上放一个 ⠿ 图标当把手，点击与拖拽天然分域。键盘 Sensor 是无障碍刚需：Tab 聚焦到条目 → Space 抬起 → 方向键移动（sortableKeyboardCoordinates 让上下左右映射到排序/跨容器语义）→ Space 落下。

#### 碰撞算法：三种算法与嵌套组合策略

拖动过程中，"悬停在谁上"（`over`）由碰撞检测算法裁决。三个内置算法的计算方式与适用面：

| 算法 | 怎么算 | 适用 |
|---|---|---|
| `closestCenter` | 拖拽物中心到各 droppable **中心**的距离，取最近 | 同质条目的排序列表（默认首选） |
| `closestCorners` | 拖拽物与各 droppable 的 4 对角点距离之和，取最小 | 条目**大小不一**时更稳（大容器的中心可能很远，但角点近） |
| `pointerWithin` | **指针坐标**是否落在 droppable 矩形内 | 嵌套容器（判断"指针在哪一层"语义最直接） |
| `rectIntersection` | 拖拽物矩形与 droppable 矩形是否相交 | 大体积拖拽物 / 快速移动的兜底 |

**为什么嵌套容器必用组合策略**——两个原因：

1. **嵌套时矩形重叠**。画布里 grid 套 card 套 grid，外层容器与内层容器的矩形是包含关系，指针同时"在两层里"。用距离法（closestCenter/closestCorners）判层级靠距离直觉，外层容器面积大、中心可能反而更近，会出现"指针明明在内层 grid 上，over 却给了外层"的判定错乱——第 3 章"拖到哪个容器里判定错误"的最大坑源。`pointerWithin` 用"包含关系"直接回答"指针物理在哪一层"，命中的多个容器再按距离排序，通常最内层（矩形最小、离指针最近）胜出，语义正确。
2. **快速移动会"飞出"所有矩形**。指针快速甩动时相邻两帧之间可能没有任何矩形包含指针位置（矩形还在动、指针已出界），单一 `pointerWithin` 会返回空 → over 丢失 → 拖放中断。必须兜底到矩形相交或角点距离。

组合策略的完整实现：

```tsx
import {
  pointerWithin, rectIntersection, closestCorners,
  type CollisionDetection,
} from '@dnd-kit/core'

/** 嵌套容器的组合碰撞：指针包含优先，矩形相交兜底，角点距离收尾 */
const nestedCollisionDetection: CollisionDetection = (args) => {
  // 1. 优先：指针落在哪个 droppable 内（嵌套时内层通常排最前）
  const pointerHits = pointerWithin(args)
  if (pointerHits.length > 0) return pointerHits
  // 2. 兜底：指针飞出所有矩形时，找与拖拽矩形相交的
  const rectHits = rectIntersection(args)
  if (rectHits.length > 0) return rectHits
  // 3. 收尾：连相交都没有（完全脱离），按角点距离找回最近的
  return closestCorners(args)
}
```

第 3 章会把该策略与"容器权重"结合（小容器优先），这里先记住组合的理由。

#### ✍️ 练习完整骨架：两个列表互拖

需求：todo / done 两列，条目可列内排序、可跨列拖动，拖动跟随用 DragOverlay。跨列的体验关键在 `onDragOver` 做**实时搬运**（拖到一半条目就先搬过去），`onDragEnd` 只做列内排序落位：

```tsx
// dnd/CrossList.tsx
import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useSortable,
  closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Item { id: string; title: string }
type ListKey = 'todo' | 'done'

export function CrossList() {
  const [lists, setLists] = useState<Record<ListKey, Item[]>>({
    todo: [
      { id: 't1', title: '调研 dnd-kit' },
      { id: 't2', title: '实现底座' },
    ],
    done: [{ id: 'd1', title: '读完大纲' }],
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  /** id → 所在列表：条目 id 或列表容器 id 都能定位 */
  const findList = (id: string): ListKey | null => {
    if (id === 'todo' || id === 'done') return id
    return (['todo', 'done'] as ListKey[]).find((k) =>
      lists[k].some((item) => item.id === id),
    ) ?? null
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  /** 核心 1：拖动经过另一列时，把条目"实时"搬过去（不等人松手） */
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeList = findList(String(active.id))
    const overList = findList(String(over.id))
    if (!activeList || !overList || activeList === overList) return // 同列不用管

    setLists((prev) => {
      const from = prev[activeList]
      const to = prev[overList]
      const activeIndex = from.findIndex((i) => i.id === active.id)
      const overIndex = to.findIndex((i) => i.id === over.id)

      // 悬停目标是列表容器本身（空列表/列表空白处）→ 放末尾
      // 否则按"指针在目标条目上半/下半"决定插它前面还是后面
      let insertIndex = to.length
      if (overIndex >= 0) {
        const activeRect = active.rect.current.translated
        const isBelowOverItem =
          activeRect != null && over.rect != null &&
          activeRect.top > over.rect.top + over.rect.height / 2
        insertIndex = overIndex + (isBelowOverItem ? 1 : 0)
      }

      return {
        ...prev,
        [activeList]: from.filter((i) => i.id !== active.id), // 从源列移除
        [overList]: [
          ...to.slice(0, insertIndex),
          from[activeIndex],                                 // 插入目标列
          ...to.slice(insertIndex),
        ],
      }
    })
  }

  /** 核心 2：松手只处理"同列内排序"（跨列搬运已在 onDragOver 完成） */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const list = findList(String(active.id))
    if (!list) return
    const oldIndex = lists[list].findIndex((i) => i.id === active.id)
    const newIndex = lists[list].findIndex((i) => i.id === over.id)
    if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
      setLists((prev) => ({
        ...prev,
        [list]: arrayMove(prev[list], oldIndex, newIndex),
      }))
    }
  }

  const activeItem =
    (['todo', 'done'] as ListKey[]).flatMap((k) => lists[k]).find((i) => i.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {(['todo', 'done'] as ListKey[]).map((key) => (
          <SortableContext key={key} items={lists[key].map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ListColumn columnId={key} items={lists[key]} />
          </SortableContext>
        ))}
      </div>
      <DragOverlay>
        {activeItem ? <div className="card overlay">{activeItem.title}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

/** 列组件：列表容器本身也是 droppable（空列也要能接收拖入） */
function ListColumn({ columnId, items }: { columnId: string; items: Item[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  return (
    <ul
      ref={setNodeRef}
      style={{
        width: 220, minHeight: 120, listStyle: 'none', padding: 8,
        background: isOver ? 'rgba(56,189,248,.12)' : '#f7f7f7',
      }}
    >
      {items.map((item) => <SortableCard key={item.id} item={item} />)}
    </ul>
  )
}

/** 条目组件：useSortable + 拖拽把手 */
function SortableCard({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1, // 原元素留位变淡；跟随指针的是 DragOverlay 替身
        background: 'white', border: '1px solid #ddd', borderRadius: 6,
        padding: '6px 8px', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center',
      }}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', border: 'none', background: 'none' }}
      >
        ⠿
      </button>
      <span>{item.title}</span>
    </li>
  )
}
```

骨架的三个关键决策，迁移到 Kanban 多列（把 `ListKey` 换成任意列 id 数组）只需改数据结构：

1. **列表容器本身注册 droppable**（`useDroppable({ id: columnId })`），空列表才有落点；
2. **跨列搬运放 `onDragOver`**，同列排序放 `onDragEnd`——顺序反了（都在 end 做）会没有"拖过半程条目先跳过去"的体验；
3. **DragOverlay 全程只显示替身**，原元素 `opacity` 压暗但**保留占位**——这就是防布局跳动的落地。

#### 常见坑

- **症状**：给拖拽源加了 onClick，但点不动。
  **根因**：PointerSensor 没有 `activationConstraint.distance`，pointerdown 立即进入拖拽会话，click 被吞。
  **修法**：加 `{ distance: 4 }`；或把拖拽绑定收敛到把手（`setActivatorNodeRef`），点击区与拖拽区分开。
- **症状**：快速拖动时悬停高亮"丢失"（over 变 null，条目闪回原处）。
  **根因**：单一 `pointerWithin` 在指针快速移动时找不到包含矩形。
  **修法**：组合策略（pointerWithin + rectIntersection/closestCorners 兜底）。
- **症状**：嵌套容器里拖放，条目总是落到外层容器。
  **根因**：距离类算法对重叠矩形的判层不可靠。
  **修法**：pointerWithin 优先的组合策略；再给内层小容器加"权重"（自定义 collisionDetection 对内层命中的 id 排序加权，第 3 章实践）。
- **症状**：拖动时整页滚动条疯狂抖动。
  **根因**：自动滚动与 transform 位移互相反馈。
  **修法**：检查被拖元素是否被 `overflow: auto` 容器包裹；给 DndContext 配置合适的 `autoScroll` 选项（如拖拽源在 overlay 模式下不参与测量），或用 DragOverlay 让原元素不再位移。

#### 补充：实战变体——网格卡片排序（rectSortingStrategy + 二维键盘坐标）

**需求**（首页卡片收藏夹 / 仪表盘"我的面板"格子）：几十张等大卡片按 CSS Grid 铺 N 列，鼠标拖动换位、键盘上下左右也能换位、拖动跟随用替身。它与竖排列表的差异只有三处，但每一处都独立成坑：

1. 排序策略换 `rectSortingStrategy`——腾位动画按矩形网格推算，`verticalListSortingStrategy` 会把位移算成竖排的；
2. `sortableKeyboardCoordinates` 只懂一维——网格键盘拖拽必须自己写坐标换算，而换算依赖"列数"这个 CSS 侧的事实；
3. 列数随容器宽度变化（响应式）——JS 的列数计算必须与 `grid-template-columns` 同源，两处各算各的必然错位。

完整代码：

```tsx
// dnd/SortableGrid.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable, rectIntersection,
  type DragEndEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Tile { id: string; title: string }

const TILE_WIDTH = 148   // 含 gap 的列宽基准：CSS Grid 与键盘换算共用这一个常量
const GRID_GAP = 12

/**
 * 二维键盘坐标：方向键按"列数"换算目标 tile，返回目标 tile 的中心坐标。
 * ids/columns 用 getter 传入——sensor 只创建一次，直接闭包捕值会过期（拖到一半增删卡片后换算用的是旧数组）。
 */
function gridKeyboardCoordinates(
  getIds: () => string[],
  getColumns: () => number,
): KeyboardCoordinateGetter {
  return (event, { context: { active, droppableRects } }) => {
    const ids = getIds()
    const columns = getColumns()
    const from = ids.indexOf(String(active.id))
    if (from < 0 || columns < 1) return
    let to = from
    switch (event.code) {
      case 'ArrowUp': to = from - columns; break
      case 'ArrowDown': to = from + columns; break
      case 'ArrowLeft': to = from - 1; break
      case 'ArrowRight': to = from + 1; break
      default: return
    }
    if (to < 0 || to >= ids.length) return          // 上下出界：不动
    if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight')
      && Math.floor(to / columns) !== Math.floor(from / columns)) return  // 行首/行尾不回卷
    const rect = droppableRects.get(ids[to])
    if (!rect) return
    // 返回目标中心：碰撞检测据此把 over 判到目标 tile，无需自己模拟位移过程
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
}

/** 纯展示 tile：既给列表用（外面包 sortable），也给 DragOverlay 替身用——替身绝不挂 useSortable */
function Tile({ title, style }: { title: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: 88, borderRadius: 8, background: '#fff', border: '1px solid #ddd',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab', touchAction: 'none', ...style,
      }}
    >
      {title}
    </div>
  )
}

function SortableTile({ tile }: { tile: Tile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,   // 原位占位变淡，跟随指针的是替身
      }}
    >
      <Tile title={tile.title} />
    </div>
  )
}

export function SortableGrid({ items, onReorder }: {
  items: Tile[]
  onReorder: (next: Tile[]) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  // 列数与 CSS Grid 同源：同一个宽度 / 同一个 TILE_WIDTH
  useEffect(() => {
    if (!container) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(container)
    return () => ro.disconnect()
  }, [container])
  const columns = Math.max(1, Math.round(width / (TILE_WIDTH + GRID_GAP))) || 3

  // 现读通道：sensor 创建一次，getter 保证键盘换算永远拿到最新 ids/columns
  const idsRef = useRef<string[]>([])
  idsRef.current = items.map((i) => i.id)
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: gridKeyboardCoordinates(() => idsRef.current, () => columnsRef.current),
    }),
  )

  const { setNodeRef: setDropRef } = useDroppable({ id: 'grid-root' })  // 空网格/网格空白处的兜底落点

  const ids = useMemo(() => items.map((i) => i.id), [items])
  const activeTile = items.find((i) => i.id === activeId)

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return               // 防御：拖拽期间数据被外部改动（见"边界与防御"节）
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      // 等大 tile 时矩形相交与"视觉压住谁就换谁"最贴合；tile 尺寸差异大换 closestCorners
      collisionDetection={rectIntersection}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div ref={setDropRef} style={{ padding: GRID_GAP }}>
        <div
          ref={setContainer}
          style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, ${TILE_WIDTH}px)`, gap: GRID_GAP }}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {items.map((tile) => <SortableTile key={tile.id} tile={tile} />)}
          </SortableContext>
        </div>
      </div>
      {/* 替身渲染纯展示组件：替身若挂 useSortable 会造成同 id 重复注册 */}
      <DragOverlay>
        {activeTile ? <Tile title={activeTile.title} style={{ opacity: 0.9, boxShadow: '0 8px 24px rgba(0,0,0,.18)' }} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**三个关键取舍**：

- **tile 有跨列跨行（span）时别硬用排序策略**：rectSortingStrategy 的腾位推算假设等大矩形，span tile 的实际布局与推算位移对不上，腾位会闪。"自由布局 + 拖拽"是布局引擎的领地（react-grid-layout，第 4 章展开）；排序策略只服务"等大 tile 换位"这一类需求。
- **键盘换算的列数必须与 CSS 同源**：本例两者都从 `width / (TILE_WIDTH + GRID_GAP)` 来，且用 ResizeObserver 跟踪宽度。把列数写死在 JS、CSS 又用 `auto-fill`，窗口一拖宽键盘落位就整体漂移。
- **替身与本体分离**：`SortableTile`（注册进排序系统）与 `Tile`（纯展示）拆开，DragOverlay 只渲染后者——替身参与碰撞/排序注册是新手照抄列表代码时的高频错误。

#### 补充：坑位补遗——六个原清单没讲的坑

- **症状**：拖放本身正常，但 `onDragEnd` 里 `findIndex` 永远 -1，`arrayMove` 静默无操作（顺序就是不变）；或 `active.id === over.id` 判重失效导致重复提交。
  **根因**：id 类型不一致——后端给 number，前端某处（URL 参数、日志、模板字符串）转成了 string。dnd-kit 全链路原样传递 id（`UniqueIdentifier = string | number`），而 `1 !== '1'`。
  **最小复现**：

```tsx
const items = [{ id: 1, title: 'a' }, { id: 2, title: 'b' }]  // 后端 number id
function handleDragEnd({ active, over }: DragEndEvent) {
  const from = items.findIndex((i) => i.id === active.id)  // active.id 是 '1'（被某层 String 过）
  setItems(arrayMove(items, from, -1))                      // arrayMove(prev, -1, -1)：原样返回，无声失败
}
```

  **修法**：数据进场就归一化（map 一遍 `id: String(raw.id)`），key、`SortableContext items`、回调比较全部用同一份 string id——别让两种类型并存，比在每个比较处 `String()` 更稳。

- **症状**：拖到一半按 Esc，拖拽"结束"了，但 DragOverlay 的替身还挂在页面上、原元素一直半透明；下一次拖起才消失。
  **根因**：Esc/pointercancel 走的是 `onDragCancel` 而不是 `onDragEnd`，只清了 end 的 activeId。
  **最小复现**：把 CrossList 骨架里的 `onDragCancel={() => setActiveId(null)}` 删掉，Tab 聚焦把手 → Space 抬起 → Esc。
  **修法**：cancel 与 end 走同一个清理出口（下一节的 `useDragSession` 是完整姿势）。

- **症状**：列表放进 `<form>` 后，按住把手拖一下，松手页面刷新 / 发出提交请求。
  **根因**：把手用了 `<button>` 且没写 `type`——HTML 默认 `type="submit"`，pointerup 被浏览器当成对"提交按钮"的 click。
  **最小复现**：

```tsx
<form onSubmit={() => console.log('提交了！')}>
  <SortableList /* 把手是 <button>⠿</button>，无 type */ />
</form>
```

  **修法**：把手 button 一律 `type="button"`（或改用 `<span role="button">`，`attributes` 会补齐 a11y 属性）。本文 CrossList 的把手没写 type，因为它不在 form 里——同一份代码拷进表单就会踩坑。

- **症状**：拖动过程中列表被另一路 setState 重排/删除（协同消息、轮询刷新），松手后列表出现重复项或丢项。
  **根因**：`onDragEnd` 拿闭包里的 items 算 index 时数据已是新的；`findIndex` 得 -1 后 `arrayMove` 会把 undefined 塞进数组。
  **最小复现**：`setInterval(() => setItems((p) => [...p].reverse()), 2000)`，拖到一半等 2 秒再松手。
  **修法**：两道防线——(a) `onDragEnd` 里 from/to 任一 < 0 直接 return（放弃落位也不写脏数据）；(b) 会话期间冻结外部更新：store 里 activeId 非空时把外部 set 缓冲进队列，会话结束一次性应用。

- **症状**：跨列拖动时条目以肉眼可见的频率在两列之间来回横跳，CPU 飙高。
  **根因**：onDragOver 的搬运本身改变了 over 的判定——条目搬进 B 列后，指针下方换成了 B 列的新邻居，碰撞检测重新给出的 over 又被判为"跨列"，于是搬回 A，如此往复。
  **最小复现**：把 CrossList 的 `handleDragOver` 里 `if (activeList === overList) return` 这一行守卫删掉。
  **修法**：守卫必须存在（源列 === 目标列直接 return）；同列内的精排留给 `onDragEnd`，onDragOver 只做"跨容器搬运预览"这一件事。

- **症状**：触屏能拖，但长按把手约 500ms 弹出系统菜单（iOS 呼出菜单/放大镜）或选中了周围文字。
  **根因**：`touch-action: none` 只管住了滚动手势（拖不动的那半个坑已在《00-公共底座》M8 展开，此处不重复）；长按呼出（`-webkit-touch-callout`）与文本选择（`user-select`）是另外两个独立开关。
  **修法**：把手元素补 `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;`。

#### 补充：边界与防御——拖拽会话的异常中断与状态复原

一次拖拽会话有四种"非正常死亡"方式，每种都要有明确处置：

| 中断源 | 库的行为 | 你要做的 |
|---|---|---|
| Esc（键盘会话） | 回调 `onDragCancel` | 清 activeId 与一切预览态 |
| pointercancel（触屏系统手势/来电抢占） | 传感器结束会话，走取消链路 | 同上 |
| 窗口失焦（Alt+Tab、系统弹窗盖住页面） | pointerup 可能永远收不到，不同版本行为不一 | 自己监听 blur/visibilitychange 兜底 |
| 会话中组件卸载（路由切走） | React 卸载你的状态容器 | 本地状态随之消失，但要保证没有悬挂的全局副作用（定时器、外部 set 缓冲） |

核心防御姿势是**把"会话结束"收敛成一个出口**——三个回调共用，谁触发都走同一段清理：

```tsx
// dnd/useDragSession.ts
import { useCallback, useEffect, useState } from 'react'

export function useDragSession(onSettle?: () => void) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const endSession = useCallback(() => {
    setActiveId((current) => {
      if (current !== null) onSettle?.()   // 真正发生过会话才通知（空会话不触发）
      return null
    })
  }, [onSettle])

  // 兜底：窗口失焦/页面隐藏时终结会话。条件挂监听（activeId 非空才挂）保证不拖拽时零开销
  useEffect(() => {
    if (activeId === null) return
    window.addEventListener('blur', endSession)
    document.addEventListener('visibilitychange', endSession)
    return () => {
      window.removeEventListener('blur', endSession)
      document.removeEventListener('visibilitychange', endSession)
    }
  }, [activeId, endSession])

  return {
    activeId,
    handlers: {
      onDragStart: (e: { active: { id: string | number } }) => setActiveId(String(e.active.id)),
      onDragEnd: endSession,
      onDragCancel: endSession,
    },
  }
}
```

接线方式——数据落位仍在 DndContext 的业务回调里做，会话状态只归 hook 管：

```tsx
const session = useDragSession(() => flushPendingExternalUpdates())  // 会话结束：放出缓冲的外部更新

<DndContext
  sensors={sensors}
  onDragStart={session.handlers.onDragStart}
  onDragEnd={(e) => { commitDrag(e); session.handlers.onDragEnd(e) }}  // 先落位再关会话
  onDragCancel={session.handlers.onDragCancel}
>
```

`commitDrag` 自己也要防御（对应坑位补遗的"外部改动"坑）：

```tsx
function commitDrag({ active, over }: DragEndEvent) {
  if (!over) return                                          // 拖到有效目标外：什么都不做
  const from = items.findIndex((i) => i.id === active.id)
  const to = items.findIndex((i) => i.id === over.id)
  if (from < 0 || to < 0) return                             // 会话期间数据被外部改动：放弃落位
  if (from !== to) onReorder(arrayMove(items, from, to))
}
```

两点边界认知，防止对这个兜底产生错觉：

1. **blur 兜底清的是"我们这层的预览状态"**（替身、高亮、半透明），dnd-kit 内部会话以它自己的传感器事件为准。两层都干净才算复原——这正是把清理收敛到单一出口的价值：任何新加的预览状态只需要在 `endSession` 里清一次。
2. **失焦兜底要接受误杀**：用户按住鼠标再切窗口，回来时会话已被终结。这正确——回不来 pointerup 的会话继续挂着更糟（替身冻在原地、后续 pointermove 全部喂给死会话）。

