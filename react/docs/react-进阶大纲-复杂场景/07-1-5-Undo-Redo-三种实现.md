---
title: "1.5 Undo/Redo 三种实现"
---

> 本文是《1. 通用底座（1.5 周，先于一切场景）》按小节拆分后的续篇，上一部分见 [06-1-4-表达式引擎.md](06-1-4-表达式引擎.md)。

### 1.5 Undo/Redo 三种实现

1. 命令模式：每个操作封装 `{ do(), undo() }` — 直观但样板多
2. **immer `produceWithPatches`（推荐）**：任何 mutation 自动生成正/反补丁
3. zundo：zustand 官方 temporal 中间件
- ⚠️ 坑：文本输入类操作必须**合并补丁**（300ms 防抖合并），否则 Cmd+Z 逐字符回退；产生新操作时清空 redo 栈

#### 是什么

撤销/重做 = 给状态变化维护一条可回放的时间线：每次变更记录"如何撤销"（必要时"如何重做"），undo 沿时间线回退、redo 前进。它是编辑器的底线能力——用户敢在画布上大胆操作的前提。

#### 为什么需要

没有撤销的编辑器，用户每个操作都提心吊胆；而撤销要做到"任何操作都可逆"，就不能依赖每种操作自觉补齐 undo 代码——那必然遗漏。正确思路是把"变更"抽象成统一形态（命令或补丁），撤销系统只面对统一形态。

#### 方案一：命令模式（每个操作封装 do/undo）

**怎么做**：把每种编辑操作写成一个对象，内含正向执行与逆向恢复两个方法；历史栈只存命令对象。

```ts
// undo/command.ts
interface Command {
  label: string      // 操作名，UI 显示"撤销 新增节点"
  do(): void
  undo(): void
}

class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private listeners = new Set<() => void>()

  execute(cmd: Command): void {
    cmd.do()
    this.undoStack.push(cmd)
    this.redoStack = []            // ★ 新操作产生 → redo 栈清空（时机见下文）
    this.emit()
  }

  undo(): void {
    const cmd = this.undoStack.pop()
    if (!cmd) return
    cmd.undo()
    this.redoStack.push(cmd)
    this.emit()
  }

  redo(): void {
    const cmd = this.redoStack.pop()
    if (!cmd) return
    cmd.do()
    this.undoStack.push(cmd)
    this.emit()
  }

  private emit(): void { this.listeners.forEach((l) => l()) }
  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }
}
```

具体命令——以 1.7 会用的扁平 schema store（`nodes` 表 + `childIds` 表）为例：

```ts
import { produce } from 'immer'
import type { SchemaStore } from './schemaStore'

/** 新增节点：do 插入，undo 删掉 */
function makeAddNode(
  store: SchemaStore,
  parentId: string,
  node: NodeDoc,
  index: number,
): Command {
  return {
    label: `新增 ${node.type}`,
    do() {
      store.setState((s) =>
        produce(s, (d) => {
          d.nodes[node.id] = node
          d.childIds[parentId].splice(index, 0, node.id)
        }),
      )
    },
    undo() {
      store.setState((s) =>
        produce(s, (d) => {
          delete d.nodes[node.id]
          d.childIds[parentId].splice(index, 1)
        }),
      )
    },
  }
}

/** 修改属性：do 记得先取旧值，undo 写回 */
function makeSetProps(
  store: SchemaStore,
  id: string,
  key: string,
  oldValue: unknown,
  newValue: unknown,
): Command {
  return {
    label: `修改属性 ${key}`,
    do() {
      store.setState((s) => produce(s, (d) => { d.nodes[id].props[key] = newValue }))
    },
    undo() {
      store.setState((s) => produce(s, (d) => { d.nodes[id].props[key] = oldValue }))
    },
  }
}
```

**评价**：优点是直观（每个操作的逆操作白纸黑字）、可组合（宏命令 = 数组命令一次 execute）。缺点致命：每种操作要写两套逻辑；`makeSetProps` 要求调用方**先取 oldValue**——忘了就做成"单向撤销"；最痛的是文本输入合并：输入"abc"是 3 次 setProps 命令，命令模式要合并得给 Command 加 `mergeWith` 方法、历史栈加合并逻辑，样板进一步膨胀。所以它适合"操作种类少且需要自定义逆逻辑"的场景，做 schema 编辑器不划算。

#### 方案二（推荐主方案）：immer `produceWithPatches`

**原理**：immer 的 draft 代理在生成新状态的同时，能产出**正向补丁**（怎么从旧到新）与**反向补丁**（怎么从新回旧）。于是"任何 mutation 自动获得 undo/redo"——你只写一遍正向逻辑，逆方向是白送的。这正是它对编辑器的价值：变更逻辑只写一遍，漏写 undo 的风险为零。

**为什么必须 `enablePatches()`**：补丁生成是 immer 的插件能力（会带来一些体积与性能开销），需要显式开启。补丁的数据结构是 `{ op: 'add' | 'replace' | 'remove'; path: (string|number)[]; value? }` 三元组：

```ts
import { applyPatches, enablePatches, produceWithPatches } from 'immer'
enablePatches()

// 一次 mutation 同时拿到三样东西：
const [next, patches, inverse] = produceWithPatches(
  { profile: { name: 'a' }, tags: ['x'] },
  (draft) => {
    draft.profile.name = 'b'
    draft.tags.push('y')
  },
)
// next:    { profile: { name: 'b' }, tags: ['x', 'y'] }
// patches: [
//   { op: 'replace', path: ['profile', 'name'], value: 'b' },
//   { op: 'add', path: ['tags', 1], value: 'y' },
// ]
// inverse: [
//   { op: 'replace', path: ['profile', 'name'], value: 'a' },
//   { op: 'remove', path: ['tags', 1] },
// ]
```

**正/反补丁的应用**：`applyPatches(state, patches)` 把补丁打到任意状态上。撤销 = 对当前状态打反向补丁；重做 = 打正向补丁——这就是"时间线"的全部机制：

```ts
const undone = applyPatches(next, inverse) // 回到旧状态
const redone = applyPatches(undone, patches) // 再前进到新状态
```

**完整实现：基于 zustand 的历史 store（推荐方案的完整代码）**

```ts
// undo/historyStore.ts
import { create } from 'zustand'
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer'

enablePatches()

interface NodeDoc {
  id: string
  type: string
  title: string
  props: Record<string, unknown>
}

/** 扁平化 schema：nodes 表 + 孩子顺序表（1.7 会解释为什么扁平化） */
interface SchemaDoc {
  nodes: Record<string, NodeDoc>
  childIds: Record<string, string[]>
  rootId: string
}

interface HistoryEntry {
  patches: Patch[]     // 正向：从"改前"到"改后"
  inverse: Patch[]     // 反向：从"改后"回到"改前"
  label: string        // 操作名（"撤销 新增 input"）
  mergeKey?: string    // 合并标识：同一输入框的连续输入才会合并
  time: number         // 提交时间：判断是否落在合并窗口内
}

interface HistoryStore {
  present: SchemaDoc   // 当前状态
  past: HistoryEntry[] // 已提交的历史（栈顶最近）
  future: HistoryEntry[] // 被 undo 的条目（redo 来源）
  commit: (label: string, recipe: (draft: SchemaDoc) => void, mergeKey?: string) => void
  undo: () => void
  redo: () => void
  jump: (steps: number) => void
  reset: (doc: SchemaDoc) => void
}

const MERGE_WINDOW = 300 // ms

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  present: { nodes: {}, childIds: { root: [] }, rootId: 'root' },
  past: [],
  future: [],

  /** 所有编辑操作的唯一入口：写一遍正向逻辑，补丁自动生成 */
  commit: (label, recipe, mergeKey) => {
    const { present, past } = get()
    const [next, patches, inverse] = produceWithPatches(present, recipe)
    if (patches.length === 0) return // 状态没变就不入历史（避免空撤销）

    const now = Date.now()
    const last = past[past.length - 1]
    const mergeable =
      mergeKey != null &&               // 本次声明了合并键
      last?.mergeKey === mergeKey &&    // 与上一条是同一个输入源
      now - last.time <= MERGE_WINDOW   // 且在时间窗口内

    if (mergeable) {
      // 合并：不新增条目，把本次补丁"接"到上一条后面
      const merged: HistoryEntry = {
        patches: [...last.patches, ...patches], // 正向：先旧后新（按发生顺序重放）
        inverse: [...inverse, ...last.inverse], // 反向：先新后旧（逆序回退）
        label: last.label,
        mergeKey,
        time: now, // 窗口从最后一次输入重新计时
      }
      set({ present: next, past: [...past.slice(0, -1), merged], future: [] })
    } else {
      set({
        present: next,
        past: [...past, { patches, inverse, label, mergeKey, time: now }],
        future: [], // ★ 关键：产生新操作时清空 redo 栈
      })
    }
  },

  /** 撤销：对当前状态应用"栈顶条目"的反向补丁 */
  undo: () => {
    const { present, past, future } = get()
    const last = past[past.length - 1]
    if (!last) return
    const prev = applyPatches(present, last.inverse)
    set({ present: prev, past: past.slice(0, -1), future: [last, ...future] })
  },

  /** 重做：对当前状态应用"队头条目"的正向补丁 */
  redo: () => {
    const { present, past, future } = get()
    const [entry, ...rest] = future
    if (!entry) return
    const next = applyPatches(present, entry.patches)
    set({ present: next, past: [...past, entry], future: rest })
  },

  /** 多步跳转：撤销历史面板"回到 5 步前" */
  jump: (steps) => {
    let { present, past, future } = get()
    const n = Math.max(-past.length, Math.min(steps, future.length))
    if (n < 0) {
      const moved = past.slice(n) // n 为负：取出最后 |n| 条
      past = past.slice(0, n)
      for (const entry of moved) present = applyPatches(present, entry.inverse)
      future = [...moved.reverse(), ...future]
    } else if (n > 0) {
      const moved = future.slice(0, n)
      future = future.slice(n)
      for (const entry of moved) present = applyPatches(present, entry.patches)
      past = [...past, ...moved]
    }
    set({ present, past, future })
  },

  /** 外部导入新 schema：重置历史（也可改为入一条"整体替换"补丁） */
  reset: (doc) => set({ present: doc, past: [], future: [] }),
}))
```

业务操作层只写正向 recipe，并声明 mergeKey：

```ts
// undo/actions.ts
import { nanoid } from 'nanoid'
import { useHistoryStore } from './historyStore'

export const schemaActions = {
  setProps(id: string, key: string, value: unknown) {
    useHistoryStore.getState().commit(
      `修改属性 ${key}`,
      (draft) => {
        draft.nodes[id].props[key] = value
      },
      `setProps:${id}:${key}`, // 同一个输入框的连续输入 → 合并键相同
    )
  },

  addNode(parentId: string, type: string, index?: number) {
    const id = nanoid(8)
    useHistoryStore.getState().commit('新增节点', (draft) => {
      draft.nodes[id] = { id, type, title: type, props: {} }
      const list = draft.childIds[parentId]
      list.splice(index ?? list.length, 0, id)
    })
    // 无 mergeKey：结构操作永不合并
  },

  removeNode(id: string) {
    useHistoryStore.getState().commit('删除节点', (draft) => {
      const parentId = findParentId(draft, id)
      const list = draft.childIds[parentId]
      list.splice(list.indexOf(id), 1)
      delete draft.nodes[id]
      // 子孙节点清理：遍历删除（undo 时靠反向补丁整体恢复，不需要手写"删了什么"）
    })
  },

  moveNode(id: string, from: number, to: number) {
    useHistoryStore.getState().commit('移动节点', (draft) => {
      const list = draft.childIds[findParentId(draft, id)]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
    })
  },
}
```

注意 `removeNode` 的注释：**删除一整个子树不用手写"恢复子树"的 undo**——反向补丁天然包含整棵子树的恢复。这是补丁方案对命令模式的降维优势。

UI 接线：

```tsx
// undo/HistoryBar.tsx
import { useEffect } from 'react'
import { useHistoryStore } from './historyStore'

export function HistoryBar() {
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.past.length > 0)
  const canRedo = useHistoryStore((s) => s.future.length > 0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta || e.key.toLowerCase() !== 'z') return
      e.preventDefault() // 阻止浏览器默认的输入框内撤销，避免双轨冲突
      const { undo: u, redo: r } = useHistoryStore.getState()
      e.shiftKey ? r() : u() // Cmd+Z 撤销 / Cmd+Shift+Z 重做
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div>
      <button disabled={!canUndo} onClick={undo}>撤销</button>
      <button disabled={!canRedo} onClick={redo}>重做</button>
    </div>
  )
}
```

**300ms 补丁合并：为什么以及怎么算**

为什么必须合并：属性面板输入框每敲一个字符触发一次 `setProps`，若每次都入历史，"输入 5 个字符 → Cmd+Z 按五次才删完"，且历史栈被 5 条同质补丁灌满。产品预期是"一次 Cmd+Z 撤销整串输入"。

合并的数学（上面 `commit` 里两行注释的展开）：设连续两次修改 e1（补丁 p1 / 反补丁 i1）、e2（p2 / i2），合并后条目为：

- 正向 `[...p1, ...p2]`：从 e1 之前的状态按发生顺序重放 p1、p2，结果等于 e2 之后的状态（补丁是确定性操作，顺序重放即复现）；
- 反向 `[...i2, ...i1]`：从 e2 之后的状态先撤销 e2 再撤销 e1，逆序回退到 e1 之前。

验证一下字符输入：p1 = replace name ''→'a'，p2 = replace name 'a'→'ab'。undo 时打 `[i2, i1]` = replace 'ab'→'a' 再 replace 'a'→''，一次 Cmd+Z 回到空串。正确。

三个实现细节：`mergeKey` 必须能定位到"同一个输入源"（`setProps:{id}:{key}`），否则改 A 属性的补丁会错误合并进改 B 属性的历史；窗口从**最后一次**输入重新计时（用户停顿 300ms 以上就切新条目，两段输入可分别撤销）；结构操作（增删移动节点）永远不带 mergeKey。

**redo 栈清空时机：为什么"产生新操作就清空"**

规则：任何新的 commit（包括合并进旧条目的输入）发生时，`future` 必须清空。原因不是惯例而是正确性：future 里的补丁是**针对它被撤销时的状态**计算的。走一个反例：

1. 用户删除节点 X（补丁记录 path `['nodes', 'x']`），undo 恢复 X，此时该条目进入 future；
2. 用户改为删除节点 Y——**没有清空 future**，继续操作；
3. 用户点 redo：系统把"恢复 X"的补丁打到当前状态上。若步骤 2 之后的结构变化恰好挪动了相关索引，redo 会把补丁打到**错误的路径**上——轻则状态错乱，重则 immer 直接抛"路径不存在"。即便侥幸不错乱，redo 出来的"恢复 X"也不是用户期待的语义。

时间线分叉（undo 之后做新操作 = 走进了新分支）在语义上就该丢弃旧分支，这是所有编辑器（VSCode、Figma）的一致行为。另一个容易忽视的时机：**纯视图状态不要进历史**——选中态切换、面板开合如果也走 commit，会白白清空 redo 栈并灌入无意义历史。选中态应放独立 store（第 3 章实践）。

#### 方案三：zundo（zustand 官方 temporal 中间件）

**原理**：zundo 不算补丁，它给任何 zustand store 外挂一个"时间线 store"，自动把**状态快照**压栈（默认 limit 100）。零侵入、十行接入，代价是内存 O(limit × 状态体积)。

```ts
// undo/zundoStore.ts
import { create } from 'zustand'
import { temporal } from 'zundo'
import { produce } from 'immer'

interface EditorState {
  nodes: Record<string, NodeDoc>
  selectedId: string | null
  setProps: (id: string, key: string, value: unknown) => void
  select: (id: string | null) => void
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      nodes: {},
      selectedId: null, // 选中态留在主 store，但用 partialize 把它排除出历史
      setProps: (id, key, value) =>
        set((s) => ({
          nodes: produce(s.nodes, (d) => {
            d[id].props[key] = value
          }),
        })),
      select: (id) => set({ selectedId: id }),
    }),
    {
      limit: 100,
      // 只跟踪 schema 本体：选中态等瞬态不入历史
      partialize: (state) => ({ nodes: state.nodes, selectedId: undefined }),
      // 相等性判断：nodes 引用没变（immer 结构共享）就不压栈，挡掉无意义快照
      equality: (pastState, currentState) => pastState.nodes === currentState.nodes,
      // 输入类高频 set 的合并：300ms 节流压栈（对应 immer 方案的补丁合并）
      handleSet: (handleSet) => {
        let timer: ReturnType<typeof setTimeout> | null = null
        let pending: EditorState | null = null
        return (state) => {
          pending = state
          if (timer) return
          timer = setTimeout(() => {
            timer = null
            if (pending) handleSet(pending)
          }, 300)
        }
      },
    },
  ),
)
```

```tsx
// undo/ZundoBar.tsx —— temporal 是一个独立 store，可订阅其撤销能力
import { useEditorStore } from './zundoStore'

export function ZundoBar() {
  const undo = useEditorStore.temporal((t) => t.undo)
  const redo = useEditorStore.temporal((t) => t.redo)
  const canUndo = useEditorStore.temporal((t) => t.pastStates.length > 0)
  const canRedo = useEditorStore.temporal((t) => t.futureStates.length > 0)
  return (
    <div>
      <button disabled={!canUndo} onClick={() => undo()}>撤销</button>
      <button disabled={!canRedo} onClick={() => redo()}>重做</button>
    </div>
  )
}
```

`handleSet` 的节流语义与 immer 方案的 mergeKey 不同：它是**全局时间维**的合并（300ms 内的一切变更合成一帧），实现简单但"同时改两个输入框"会被错误合并；mergeKey 是**输入源维度**的合并，更精确。这是"快照+节流"与"补丁+合并键"的真实差异点。

#### 三方案对比

| | 命令模式 | immer patches（推荐） | zundo |
|---|---|---|---|
| 原理 | 每操作手写 do/undo | 数据 diff 出正/反补丁 | 快照时间线 |
| 变更逻辑要写几遍 | 两遍（易漏） | 一遍 | 一遍 |
| 内存 | 小 | O(变更大小) | O(limit × 状态体积) |
| 输入合并 | 手工扩展 | mergeKey（精细） | handleSet 节流（粗粒度） |
| 侵入性 | 高（每个操作包命令） | 低（统一 commit 入口） | 极低（包一层中间件） |
| 适合 | 操作少、需自定义逆逻辑（如复杂协同） | schema/文档类编辑器 | 快速接入、状态不大的应用 |

#### 常见坑

- **症状**：点撤销，历史条目弹出了，画布却没变化。
  **根因**：组件订阅的是旧状态引用（比如绕过 store 直接持有对象），或 undo 分支里忘了 `applyPatches` 返回新状态而是原地改。
  **修法**：撤销后状态必须是 `applyPatches(present, inverse)` 的**返回值**（不可变更新），组件全部通过 selector 订阅 store，不要缓存 store 外的对象引用。
- **症状**：Cmd+Z 一次只回退半个字符，或者撤销后状态"错位"。
  **根因**：mergeKey 设计错误——不同输入源共用了一个 key（如所有 setProps 都用 `'input'`），或合并窗口内混入了结构操作。
  **修法**：mergeKey 精确到 `{nodeId}:{propKey}`；结构操作绝不传 mergeKey。
- **症状**：zundo 方案下内存随编辑时间线性上涨。
  **根因**：快照方案固有成本 + limit 设得过大 + 把大对象（图片 base64 之类）放进了被 partialize 的状态。
  **修法**：收紧 limit；partialize 只留真正需要撤销的字段；状态很大时换 immer patches 方案。
- **症状**：聚焦在输入框里按 Cmd+Z，有时撤了输入框、有时撤了画布。
  **根因**：浏览器原生输入框撤销与全局历史"双轨"竞争。
  **修法**：全局 keydown 里判断 `document.activeElement` 是否可编辑，可编辑时优先让原生处理（或统一 preventDefault 走全局历史，二选一并保持一致）。

---

#### 1.5.1 补充：坑位补遗——栈无上限、选中悬空、输入在途竞态、大 value 进历史

- **症状**：编辑器连续用两小时，Memory 曲线稳步上涨，Heap 快照里 past 数组的 replace 补丁占大头。
  **根因**：commit 只入栈不淘汰；immer 的 replace 补丁携带完整 value（正向带新值、反向带旧值），每次属性修改都在历史里留双份数据，长会话累计成灾。
  **修法**：给历史条目数设上限——"可回退步数"本来就是产品承诺（VSCode、Figma 也只保留有限步），入栈后截断：

```ts
const MAX_HISTORY = 200 // 按"一条 ≈ 两次属性值体积"估算内存预算后定值

function cap(past: HistoryEntry[]): HistoryEntry[] {
  return past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past
}
// commit 的两个分支（合并进旧条目 / 新增条目）统一在 set 前过 cap：
set({ present: next, past: cap(nextPast), future: [] })
```

- **症状**：撤销"新增节点"后，右侧属性面板白屏——`nodes[selectedId].props` 解构报错。
  **根因**：选中态在独立 store（本节"纯视图状态不进历史"的正确设计），但 undo 改的是 schema store——selectedId 指向的节点已被撤销掉，两个 store 之间没有联动校验。
  **修法**：两层防御。消费侧 selector 兜底（属性面板对"选中悬空"渲染空态）；源头侧订阅 present，节点消失即清空选中：

```ts
// 消费侧：任何"按 id 取节点"的 selector 都必须接受 null
const node = useEditorStore((s) => (s.selectedId ? s.nodes[s.selectedId] ?? null : null))
if (!node) return <Empty hint="请选择画布中的节点" />

// 源头侧：present 变化（含 undo/redo/jump/reset）后校正选中态
useHistoryStore.subscribe((s, prev) => {
  if (s.present === prev.present) return
  const selected = useEditorStore.getState().selectedId
  if (selected && !s.present.nodes[selected]) {
    useEditorStore.getState().select(null)
  }
})
```

- **症状**：中文输入法组合到一半按 Cmd+Z：画布确实回退了，但紧接着上屏的候选词又触发 onChange，把旧值"写回去"，状态与历史错乱一拍。
  **根因**：输入事件在 undo 之后才到达（组合输入期间事件是排队上屏的），commit 基于已回退的 present 计算补丁——两个写入方竞态。Chrome 的 onChange 在组合期间照样触发，不处理就每个拼音字母都是一条独立历史。
  **修法**：属性面板的输入组件自己做"组合期挂起 + 失焦兜底"，历史层不必知道 IME 的存在：

```tsx
function PropsInput({ id, propKey, value }: { id: string; propKey: string; value: string }) {
  const [draft, setDraft] = useState(value)
  const composing = useRef(false)

  useEffect(() => setDraft(value), [value]) // 外部（undo/redo）改值时同步草稿

  return (
    <input
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        if (!composing.current) schemaActions.setProps(id, propKey, e.target.value)
      }}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={(e) => {
        composing.current = false
        schemaActions.setProps(id, propKey, e.currentTarget.value) // 组合结束一次性提交
      }}
      onBlur={() => schemaActions.setProps(id, propKey, draft)}
    />
  )
}
```

- **症状**：节点支持"封面图"后，换一次图内存涨几 MB，200 条上限的历史能吃掉几百 MB。
  **根因**：replace 补丁的 value 是整段 base64（或巨型对象），正反补丁各存一份——大资源把"增量历史"退化成"全量快照 ×2"。
  **修法**：大资源不进 schema——上传后 props 只存资源 URL/id，资源本体走资源库；再加一道 commit 内的体积哨兵，防止后来人不知不觉把大对象塞回 props：

```ts
const PATCH_BYTES_BUDGET = 256 * 1024 // 单条历史的 JSON 体积预算

function estimateBytes(patches: Patch[]): number {
  return JSON.stringify(patches).length
}
// commit 入栈前：
const bytes = estimateBytes(patches) + estimateBytes(inverse)
if (bytes > PATCH_BYTES_BUDGET) {
  console.warn(`历史条目「${label}」体积 ${(bytes / 1024).toFixed(0)}KB 超预算，检查是否有大对象进了 schema`)
  reportMetric('history.oversize', { label, bytes }) // 监控埋点：超预算事件按条目 label 聚合
}
```
