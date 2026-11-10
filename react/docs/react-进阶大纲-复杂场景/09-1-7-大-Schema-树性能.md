---
title: "1.7 大 Schema 树性能"
---

> 本文是《1. 通用底座（1.5 周，先于一切场景）》按小节拆分后的续篇，上一部分见 [08-1-6-拖拽原理-dnd-kit-精讲.md](08-1-6-拖拽原理-dnd-kit-精讲.md)。

### 1.7 大 Schema 树性能

- zustand + **path 级 selector 订阅**：每个字段只订阅自己的路径（formily 的核心思想）
- 不可变按路径更新（immer）
- 大纲树虚拟化（react-arborist）
- ✍️ 练习：渲染 1000 节点树，修改单个节点，用 Profiler 验证只有 1 个组件重渲染

#### 为什么大树会卡：先量化问题

一页面 50 个字段的表单、1000 节点的低代码树。假设状态放在单个 state 里、组件全量订阅：每敲一个字符触发一次 set → 50/1000 个组件全部重渲染 + reconciliation。浏览器一帧预算 16.7ms，1000 个组件的 render + diff 轻松吃满，输入法直接感觉到"打字延迟"。**问题的根源不是组件多，而是"变更的粒度是全量、订阅的粒度也是全量"**——解法就是双管齐下：按路径更新（immer）+ 按路径订阅（zustand selector）。这也是 formily 的核心思想：每个字段只关心自己的路径。

#### zustand 的订阅机制：selector 为什么能省钱

zustand 的 `useStore(selector)` 工作方式：**每次 store 发生任何变更，所有组件的 selector 都会重新执行**，但只有 selector 返回值与上次不同（`Object.is` 比较）的组件才重渲染。所以性能取决于"selector 选得准不准"：

- 选得准（只选自己的路径）：别的路径变了，我的 selector 返回同一个引用 → 跳过渲染；
- 选得粗（选整个 store / 整棵树）：任何变化都会让返回值引用改变 → 全量重渲染。

selector 本身执行是很便宜的（一次属性访问/比较），贵的是组件 render——所以"selector 全跑、组件不渲染"就是胜利。

#### 反例：全量订阅的问题

```tsx
// ❌ 反例一：解构整店订阅——任何字段变化都重渲染
const { formData, setValue } = useFormStore()

// ❌ 反例二：看似用了 selector，实际选了整棵树——formData 引用每次都变
const formData = useFormStore((s) => s.formData)
return <input value={formData.name} /> // formData.name 变了，但其余 49 个字段也跟着重渲染
```

反例二的隐蔽性在于"我明明用了 selector"——但 selector 的粒度是整棵 `formData`，immer 更新任何字段都会产生新的 `formData` 根引用，订阅它的所有组件全部命中。**selector 的粒度必须细到"会变的最小单位"**。

#### 正解：path 级 selector 订阅的完整示例

```ts
// stores/formStore.ts
import { create } from 'zustand'
import { produce } from 'immer'

interface FormStore {
  formData: Record<string, unknown> // key 就是字段路径，如 "name"、"users.2.name"
  errors: Record<string, string | undefined>
  setValue: (path: string, value: unknown) => void
  setError: (path: string, error: string | undefined) => void
}

export const useFormStore = create<FormStore>()((set) => ({
  formData: {},
  errors: {},
  setValue: (path, value) =>
    set((state) => ({
      // 不可变按路径更新：只产生新引用的路径见下文 immer 说明
      formData: setByPath(state.formData, path, value),
    })),
  setError: (path, error) =>
    set((state) => ({ errors: setByPath(state.errors, path, error) })),
}))
```

```tsx
// components/Field.tsx —— 每个字段只订阅自己的 value 和 error
import { useFormStore } from '../stores/formStore'
import type { FormFieldSchema } from '../schema/form'

export function Field({ schema }: { schema: FormFieldSchema }) {
  // ✅ path 级订阅：selector 只取本字段的值
  const value = useFormStore((s) => s.formData[schema.fieldPath])
  const error = useFormStore((s) => s.errors[schema.fieldPath])
  const setValue = useFormStore((s) => s.setValue) // action 引用恒定，订阅无成本

  return (
    <label>
      {schema.label}
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setValue(schema.fieldPath, e.target.value)}
      />
      {error && <span className="error">{error}</span>}
    </label>
  )
}
```

现在敲"name"字段的一个字符：`setValue('name', ...)` → `formData` 根引用换新，但只有 `"name"` 键的值变了。name 字段的 selector 返回新值 → 重渲染；其余 49 个字段的 selector 返回**同一个字符串/undefined 引用** → `Object.is` 相等 → 跳过。全表 50 个组件只有 1 个重渲染。这就是"path 级订阅"的全部魔法，配合 selector 返回原始值（字符串/数字）时连引用比较都最便宜。

#### immer 按路径更新与"结构共享"

```ts
// utils/setByPath.ts —— 通用路径写入：支持 "users.2.name" 这类点路径
import { produce } from 'immer'

export function setByPath<T>(obj: T, path: string, value: unknown): T {
  return produce(obj, (draft: any) => {
    const keys = path.split('.')
    let cursor = draft
    for (let i = 0; i < keys.length - 1; i++) {
      if (cursor[keys[i]] == null) {
        throw new Error(`路径中断：${keys.slice(0, i + 1).join('.')} 是 null/undefined`)
      }
      cursor = cursor[keys[i]]
    }
    cursor[keys[keys.length - 1]] = value
  })
}
```

immer 的关键性质是**结构共享**：`produce` 返回的新对象里，**未被修改的分支保持原引用**。改 `formData['name']` 时：`formData` 是新的，`formData['name']` 是新的，但 `formData['phone']`、`formData['city']`……全部还是旧引用。这一性质同时喂饱了两端：

1. **selector 订阅端**：订阅其他路径的 selector 拿到旧引用 → `Object.is` 相等 → 不渲染；
2. **memo 端（1.3）**：`NodeView` 收到的 `node` 引用没变 → memo 拦截 → 子树整棵跳过。

若不用 immer 而用 `JSON.parse(JSON.stringify(...))` 或手写展开复制，全树引用换新，上面两端全部失效——"按路径更新"与"按路径订阅"必须成对出现。

#### 树的规范化：扁平化让订阅路径更干净

1.5 的 `SchemaDoc` 已经用了扁平结构（`nodes` 表 + `childIds` 表），这里说明为什么它对性能友好：

```ts
interface FlatTree {
  nodes: Record<string, { id: string; type: string; title: string; props: Record<string, unknown> }>
  childIds: Record<string, string[]> // 每个容器的孩子顺序单独存
  rootId: string
}
```

- 嵌套树存法下，"移动一个节点"要动祖先链上的所有对象（虽然结构共享兜住了渲染，但 patch 路径长、diff 复杂）；扁平存法下移动只是 `childIds` 里两次 splice + `nodes` 零变化；
- 每个节点组件的订阅就是一行：`useTreeStore((s) => s.nodes[id])`——改别的节点，我的 selector 返回同一个 node 对象；
- 撤销补丁的 path 短（`['nodes', id, 'props', key]`），1.5 的历史系统直接受益。

```tsx
// 树节点组件：一个节点只订阅自己
import { memo } from 'react'
import { useTreeStore } from '../stores/treeStore'

export const TreeNode = memo(function TreeNode({ id }: { id: string }) {
  const node = useTreeStore((s) => s.nodes[id]) // ✅ 只订阅本节点
  const childIds = useTreeStore((s) => (node ? s.childIds[id] : undefined))
  if (!node) return null
  return (
    <div>
      <span>{node.title}</span>
      {childIds?.map((childId) => <TreeNode key={childId} id={childId} />)}
    </div>
  )
})
```

#### 大纲树虚拟化：react-arborist

1000 个节点全部渲染 = 1000 个 DOM 子树（即使组件不重渲染，初次挂载和滚动也很重）。虚拟化的思路：**只渲染视口内的行**——1000 节点的树展开后可能有 3000 行，视口里只看得到 20 行，那就只渲染 20 行，滚动时按需换内容。react-arborist 是专为"文件树/大纲树"设计的虚拟树组件，还内置了行级拖拽排序（与 1.6 呼应）：

```tsx
// outline/OutlineTree.tsx
import { Tree } from 'react-arborist'
import { useMemo } from 'react'
import type { FlatTree } from '../stores/treeStore'

/** 扁平树 → arborist 的嵌套 data（id/name/children 是它的默认字段约定） */
interface TreeNodeData { id: string; name: string; children?: TreeNodeData[] }

function buildTreeData(flat: FlatTree, rootId: string): TreeNodeData[] {
  const childrenOf = (parentId: string): TreeNodeData[] | undefined => {
    const ids = flat.childIds[parentId]
    if (!ids?.length) return undefined
    return ids.map((id) => ({ id, name: flat.nodes[id].title, children: childrenOf(id) }))
  }
  return [{ id: rootId, name: flat.nodes[rootId].title, children: childrenOf(rootId) }]
}

export function OutlineTree({
  flat, rootId, selectedId, onSelect,
}: {
  flat: FlatTree; rootId: string; selectedId: string | null; onSelect: (id: string | null) => void
}) {
  const data = useMemo(() => buildTreeData(flat, rootId), [flat, rootId])

  return (
    <Tree
      data={data}                          // 树数据
      width={280}                          // 视口尺寸：虚拟化按此计算可见行
      height={480}
      rowHeight={28}                       // 行高：必须准确（虚拟滚动的数学基础）
      indent={18}                          // 缩进宽度
      selection={selectedId ?? undefined}  // 受控选中：与画布选中态双向联动
      onSelectionChange={(ids) => onSelect(ids[0] ?? null)}
    >
      {({ node, style, dragHandle }) => (
        // style 是虚拟化算出的绝对定位，必须展开到行 div 上
        <div ref={dragHandle} style={{ ...style, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{node.isLeaf ? '·' : node.isOpen ? '▾' : '▸'}</span>
          <span>{node.data.name}</span>
        </div>
      )}
    </Tree>
  )
}
```

要点：`height`/`rowHeight` 决定"渲染哪些行"，行高不准会出现滚动跳跃；`style` 必须透传（虚拟定位）；选中态走受控 `selection`，与画布（1.3 的渲染器）选中同一个 store 字段，即得"点树选中画布、点画布高亮树"的双向联动；`dragHandle` 提供行级拖拽（内置实现即可满足大纲树调序，复杂拖拽仍走 1.6 的 dnd-kit）。

#### Profiler 验证步骤（✍️ 练习的验收方法）

目标实验：渲染 1000 节点树，修改单个节点，验证只有 1 个组件重渲染。

**方式一：React DevTools Profiler（可视化）**

1. 安装浏览器扩展 React Developer Tools，打开 Components/Profiler 面板；
2. Profiler 面板左上角设置里勾选 "Record why each component rendered"（记录重渲染原因，便于归因）；
3. 点击左上角录制按钮（圆点）→ 在页面里修改一个节点（比如改它的 title 输入框敲一个字符）→ 点停止；
4. 时间轴出现若干 commit 条。点开最新一条的火焰图：**有颜色 = 本次 commit 渲染了，灰色 = 没渲染**。达标画面：只有 1 个 TreeNode（及其 input）有颜色，其余 999 个全灰；
5. 若不达标，选中被误渲染的组件，右侧 "Why did this render?" 会给出原因（"props changed" / "context changed" / "hook X changed"）——顺藤摸瓜定位订阅泄漏。

**方式二：`<Profiler>` API（可量化、可留档）**

```tsx
import { Profiler } from 'react'

type Phase = 'mount' | 'update' | 'nested-update'

function onRender(
  id: string,
  phase: Phase,
  actualDuration: number, // 本次 commit 实际渲染耗时
  baseDuration: number,   // 整棵子树不 memo 时的基准耗时
): void {
  console.log(`[Profiler:${id}] ${phase} actual=${actualDuration.toFixed(2)}ms`)
}

export function App({ children }: { children: React.ReactNode }) {
  return (
    <Profiler id="schema-tree" onRender={onRender}>
      {children}
    </Profiler>
  )
}
```

达标判据：修改单节点时只产生一条 `update` commit，`actualDuration` 在零点几毫秒量级（对比全量渲染的几十毫秒）。

**常见误判**：StrictMode 开发期会双调用 render，看着像渲染了两次——用 Profiler 看 commit（不是 render 调用数），或先关 StrictMode 复测；父组件重渲染带动子组件（未 memo）也会污染计数，给容器组件补 memo 后再测。

#### 常见坑

- **症状**：已经 path 级订阅了，Profiler 里字段还是全亮。
  **根因**：selector 返回了**新对象**——`useFormStore((s) => ({ v: s.formData.a, e: s.errors.a }))` 每次执行都新建对象，`Object.is` 永不相等。
  **修法**：拆成两个 selector 分别订阅；确实要选对象时用 `useShallow`（zustand v5 从 `zustand/react/shallow` 导入）做浅比较。
- **症状**：zustand v4 升 v5 后，原来 `useStore(selector, shallow)` 的写法类型报错。
  **根因**：v5 移除了 selector 的第二 equalityFn 参数，统一走 `useShallow` 包装。
  **修法**：`import { useShallow } from 'zustand/react/shallow'` 后 `useStore(useShallow((s) => ({ a: s.a, b: s.b })))`。
- **症状**：虚拟树滚动时白屏/行高跳变。
  **根因**：`rowHeight` 与实际行高不符（行内有换行/图标撑高）。
  **修法**：固定行高（行内容溢出用省略号）；确需动态高度时按 arborist 文档配置估高，别硬猜。
- **症状**：改一个节点，它的父链组件也重渲染了。
  **根因**：这不是 bug——immer 结构共享下，被修改路径上的祖先节点引用确实换新了（这是必要的，React 需要新引用才能感知变化）。渲染的是"路径上"的少量组件，数量 = 树深度，可接受；若连"路径外"的兄弟子树也渲染，才是订阅泄漏，回看坑一。

✅ **阶段产出**：一个能渲染嵌套 schema 的 mini renderer + 全局 undo/redo + 表达式求值器。

把产出拆成可验收的三件：

**1. mini renderer（1.1 + 1.2 + 1.3 + 1.7 的合成）**

- 渲染 1.1 的页面协议（嵌套容器 + 原子组件），未注册类型渲染占位而不是白屏；
- 注册表带完整物料元信息（label/icon/defaultProps/setters/isContainer）；
- `NodeView` 用 nodeId 作 key、用 memo 包裹，状态更新走 immer（结构共享）；
- 验收：渲染 1000 节点树，修改单个节点，Profiler 火焰图里只有 1 个节点组件亮起（1.7 的实验步骤）。

**2. 全局 undo/redo（1.5）**

- immer patches 历史栈：commit/undo/redo/jump 齐全；
- 属性输入 300ms 按 mergeKey 合并（连续输入 5 个字符，Cmd+Z 一次回退整串）；
- 产生新操作清空 redo 栈（undo → 新操作 → redo 按钮置灰）；
- Cmd+Z / Cmd+Shift+Z 快捷键与按钮可用态正确。

**3. 表达式求值器（1.4）**

- tokenize → parse → evaluate 三层齐全，通过 1.4 的 10 条测试用例；
- AST 缓存、`checkExpression` 语法检查、`useExpression` hook 可在组件里跑通 `visibleWhen` 联动；
- 坏表达式（语法错、未知变量）不炸页面，返回 undefined 并能在配置期标红。

**自测清单**（全部打勾再进第 2 章）：

- [ ] schema 里没有函数、class、Date——`JSON.stringify` 无损 round-trip；
- [ ] 节点 id 全局唯一且不复用，控制台无 key 警告；
- [ ] 删除/移动/复制节点后（复制递归换 id），各组件内部状态不串位；
- [ ] 改属性 → undo → redo，画布与属性面板状态完全一致；
- [ ] 同一输入框连续输入只占一条历史；结构操作各占一条；
- [ ] 表达式求值异常被兜住，页面不白屏。

这三件产出的复用地图（也是对本章"内核"论的最终验证）：第 2 章动态表单 = 协议 + 注册表 + 渲染器 + 表达式 + path 订阅的整队合练；第 3 章设计器 = 加上 dnd-kit 拖拽 + Setter 自举 + undo 接入；第 4 章仪表盘 = 注册表换一批 panel 物料 + Setter 复用；第 5 章 JSON 编辑器 = 给 schema 开文本消费入口；第 6 章低代码 = 全部总装。底座越扎实，后面每一章越是"组装"而非"新写"。

#### 补充：坑位补遗——订阅体系与大树的五个新坑

- **症状**：path 订阅明明很细，打字还是卡；Profiler 里大量时间不属于任何组件的 render。
  **根因**：zustand 每次 set 会重跑**所有**订阅者的 selector。selector 本该是"一次属性访问"，有人往里塞了遍历/求值——N 个订阅者 × 每键一次 × O(N) 计算 = O(N²)。
  **最小复现**：

```tsx
// ❌ 每个挂载节点都算一遍"后代数量"：1000 节点的树每敲一键 = 1000 次 DFS
const descendantCount = useTreeStore((s) => countDescendants(s.childIds, id))
```

  **修法**：派生数据进 store——只在 childIds 变更的那一次 produce 里重算，selector 退化回一次属性访问：

```ts
// ✅ 结构变化的同一轮 produce 里重算派生表，组件订阅 O(1)
moveNode: (from, to) =>
  set((s) => produce(s, (draft) => {
    /* ...childIds 的搬移... */
    draft.counts = recountAll(draft.childIds)   // 只在结构变化这一次算
  })),
// 组件侧：const count = useTreeStore((s) => s.counts[id])
```

- **症状**：大纲树行内重命名（input 的值存在行组件的 useState 里），把这一行滚出视口再滚回来，输入到一半的文字没了。
  **根因**：虚拟化只渲染视口内的行——滚出 = 卸载，行组件局部状态随之销毁；滚回来是"按同一份数据新挂载"，useState 从头初始化。与列表场景"滚动位置丢失"同源（阶段 4.3 列表场景修法 4 讲过"状态上移"的思想），树这里更隐蔽，因为"行看起来还是那一行"。
  **修法**：行内编辑草稿上移 store（`renaming: { id, draft }`），行组件只做受控渲染，blur/回车才写 `nodes[id].title`：

```tsx
// 行组件：草稿在 store，滚动回收/恢复都不丢
const draft = useTreeStore((s) => (s.renaming?.id === id ? s.renaming.draft : undefined))
```

- **症状**：改一个与树无关的状态（比如侧栏折叠开关），react-arborist 整棵重渲染、滚动出现卡顿。
  **根因**：`OutlineTree` 的 `useMemo(() => buildTreeData(flat, rootId), [flat, rootId])` 依赖的 `flat` 引用不稳定——上游用了返回新对象的 selector（`useTreeStore((s) => ({ nodes: s.nodes, childIds: s.childIds }))`，正是前文坑 1 的变体），或父组件渲染时现场 `{...flat}` 展开。data 引用一换，arborist 视作全新数据：重建行、重测 rect。
  **最小复现**：把 OutlineTree 的 flat 换成上述对象 selector 的返回值，点侧栏折叠 10 次，Profiler 里 OutlineTree 每次都整树 update。
  **修法**：selector 拆成 `nodes`、`childIds` 两个原始引用分别订阅，buildTreeData 依赖这两个；数据确实高频重建时给树数据加版本号（结构变更 +1），data 按版本缓存。

- **症状**：自动保存/离开拦截要判断"改没改"，每次比较卡 30–80ms（万级节点），输入每键都触发一次。
  **根因**：用 `JSON.stringify(current) !== JSON.stringify(saved)` 判 dirty——序列化整棵树是 O(N)，还产生大量中间字符串。
  **修法**：结构共享已经把答案备好了——任何修改都会换根引用，比较本身是一次指针比较：

```tsx
// 保存成功时记录：lastSavedRef.current = useTreeStore.getState().formData
const dirty = useTreeStore((s) => s !== lastSavedRef.current)   // O(1)，selector 返回布尔值不破订阅
```

- **症状**：给 TreeNode 加了 `memo(TreeNode, lodash.isEqual)`，render 时间没降多少，火焰图里反而多出大块"比较时间"。
  **根因**：深比较本身要遍历属性，节点对象大时比渲染还贵；而结构共享 + 默认浅比较已保证"没变的节点引用不变"，深比较是负收益。
  **修法**：删掉自定义比较函数，保持 memo 默认浅比较；确有"内容相同、引用不同"的外部数据（不是 store 产的），把深比较收敛到那一小片叶子组件，绝不放在递归的 TreeNode 上。

#### 补充：高频外部更新的边界——合帧、丢弃与 transient 订阅

**场景**：协同编辑/实时监控的树，WebSocket 每秒推几十条节点更新。若每条消息一次 set：一次 set = 全部订阅者的 selector 跑一遍，60 msg/s × 2000 订阅者 = 每秒 12 万次 selector 求值 + 最多 60 次 commit——输入直接卡死。三层防御按序上：

**第 1 层：合帧（coalesce）——消息洪峰压成每帧最多一次 set**：

```ts
// store/realtime.ts
type NodePatch = { id: string; patch: Record<string, unknown> }

export function createCoalescedUpdater(flushEveryMs = 16) {
  const pending = new Map<string, NodePatch>()
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    ingest(msgs: NodePatch[], apply: (batch: NodePatch[]) => void) {
      for (const m of msgs) pending.set(m.id, m)   // 同 id 只留最新：中间帧天然被丢弃（这同时就是第 3 层的降级）
      if (timer != null) return
      timer = setTimeout(() => {
        timer = null
        const batch = [...pending.values()]
        pending.clear()
        apply(batch)                               // 一次 set 应用整帧，selector 风暴从"每消息一次"降到"每帧一次"
      }, flushEveryMs)
    },
    cancel() {
      if (timer != null) { clearTimeout(timer); timer = null }
      pending.clear()
    },                                             // 组件卸载/连接关闭时调用，否则定时器悬挂（内存泄漏源一）
  }
}
```

为什么用 `setTimeout(16ms)` 而不是 rAF：后台标签页 rAF 完全停转，消息会无限积压；定时器只是被浏览器节流（后台节流的完整讨论见第 4 章路线 7，此处不展开）。

**第 2 层：transient 订阅——纯展示节点绕过 React 渲染**。实时数值徽标这类"只显示、不参与交互"的节点，为一个数字走 render 不值得。zustand 原生 `subscribe` + 直接改 DOM：

```tsx
// nodes/LiveBadge.tsx —— 高频数值：订阅但不渲染
import { useEffect, useRef } from 'react'
import { useTreeStore } from '../stores/treeStore'

export function LiveBadge({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // subscribe 返回退订函数——这就是防内存泄漏的全部：
    // 不退订 = 回调带着 ref 永久留在 store 的监听列表里（泄漏 + 卸载后仍执行）
    const unsubscribe = useTreeStore.subscribe((state) => {
      const value = state.nodes[id]?.props.value
      if (ref.current && value != null) ref.current.textContent = String(value)
    })
    return unsubscribe
  }, [id])

  return <span ref={ref} className="live-badge" />
}
```

三条边界：(a) 只用于纯展示——节点还有 hover/选中交互就必须走渲染，两套更新路径混在同一个 UI 上会撕裂；(b) 回调里禁止再触发 setState（绕一圈回到渲染，还可能成环）；(c) `aria-live` 保持 off，否则每秒读屏播报。同一 API 在 1.5 里做过"undo 后校正选中态"的跨 store 派生，思想同源：subscribe 负责"读与通知"，不负责"渲染"。

**第 3 层：洪峰降级与背压**。合帧也扛不住时（一次 flush 就要 30ms+），显式降档而不是硬扛：`pending.size` 超阈值（如 5000）时丢低优先级补丁（仅 `props.value` 变化的展示节点）、保留结构变更；UI 给出"实时同步已暂停（积压 N 条），点击恢复"。原则：**宁可数据旧一秒，不可输入卡一帧**。

**清理清单**（这一节的内存纪律）：

- 每个 `subscribe` 必须在 effect cleanup 里退订（LiveBadge 已示范）；
- WebSocket 的 close、合帧器的 cancel 在组件卸载时显式调用；
- dev 期自查订阅泄漏——zustand 没有内置订阅面板，一次 monkey-patch 就能数：

```ts
// main.tsx 仅 dev 环境启用：数活跃订阅，只涨不跌就是泄漏
if (import.meta.env.DEV) {
  let active = 0
  const orig = useTreeStore.subscribe.bind(useTreeStore)
  useTreeStore.subscribe = (...args: Parameters<typeof orig>) => {
    active += 1
    console.log('[subs]', active)
    const unsub = orig(...args)
    return () => { active -= 1; return unsub() }
  }
}
```

#### 补充：性能量化与回归门禁——把"只有 1 个组件亮"变成数字和断言

手测 Profiler 会忘、回归却天天发生（"有人顺手在容器里加了 `const nodes = useTreeStore((s) => s.nodes)`"就够让全树重渲染）。两个数字 + 一条门禁：

**数字一：订阅通知成本（selector 风暴）**。zustand 的 set 是同步通知，一次 set 的耗时 ≈ 全部 selector 求值 + 调度，包一层就能测：

```ts
// dev 工具：给 setState 计时，超预算告警
export function instrumentStore<T extends { setState: Function }>(store: T, budgetMs = 4) {
  const original = store.setState.bind(store)
  store.setState = (...args: Parameters<typeof original>) => {
    const t0 = performance.now()
    const result = original(...args)
    const dt = performance.now() - t0
    if (dt > budgetMs) console.warn(`[perf] setState 通知耗时 ${dt.toFixed(1)}ms（预算 ${budgetMs}ms）`)
    return result
  }
  return store
}
```

判读：通知耗时高 = selector 太贵（坑位补遗坑 1）或订阅基数太大（该上合帧/transient）。它不含 React commit——commit 看 Profiler 的 actualDuration（前文"Profiler 验证步骤"）。

**数字二：退化曲线（何时该换手段）**。1000 节点级树、笔记本级设备的量级感受：

| 场景 | 每次通知成本 | 结论 |
|---|---|---|
| 1000 订阅者 × 一次属性访问 | < 0.5ms | path 订阅的舒适区 |
| 5000 订阅者 × 一次属性访问 | 2–4ms | 仍可行，已逼近预算 |
| 2000 订阅者 × O(子树) 计算 | 30ms+ | 已退化——派生进 store 或 transient |
| 外部每秒 60 次 set（无合帧） | ×60 | 输入必卡——合帧是唯一解 |

**一条门禁：渲染计数写进 CI**。把"改单节点只产生一次 commit"变成 vitest 断言（挂载与节点生成复用《00-公共底座》M9 的 genStressSchema 思路）：

```tsx
// __tests__/tree.perf.test.tsx
import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { Profiler } from 'react'
import { useTreeStore } from '../stores/treeStore'
import { genTree } from '../test/genTree'
import { TreeNode } from '../components/TreeNode'

describe('大树渲染计数', () => {
  it('修改单节点：恰好 1 次 update commit，且耗时在预算内', () => {
    let updates = 0
    let lastDuration = Infinity

    act(() => { useTreeStore.getState().loadTree(genTree(1000)) })
    render(
      <Profiler
        id="tree-root"
        onRender={(_, phase, actualDuration) => {
          if (phase === 'update') { updates += 1; lastDuration = actualDuration }
        }}
      >
        <TreeNode id="root" />
      </Profiler>,
    )

    act(() => { useTreeStore.getState().renameNode('node-500', '新标题') })

    expect(updates).toBe(1)                 // 精确断言：一次修改 = 一次 commit
    expect(lastDuration).toBeLessThan(8)    // 时长断言：CI 机器比开发机慢，阈值放宽
  })
})
```

断言为什么这样设计（都是踩过的坑）：

- **数 commit 不数 render**：StrictMode 开发期双调用 render，commit 才是用户可见的渲染单位（前文"常见误判"同一结论）；
- **commit 次数 + 时长两条一起断**：全量重渲染也是"一次 commit"，只数次数拦不住它——时长断言负责拦"渲染范围"，次数断言负责拦"渲染次数"（例如 effect 回写造成的连锁）；
- **别包 startTransition**：并发特性会把一次更新拆成多次 commit，测试环境里保持同步更新，断言才稳定。

CI 落地三条：性能测试单独 job（不与单测混跑，避免互相拖慢放大抖动）；时长断言失败先重跑一次再判（flaky 兜底），计数断言不重跑（它是确定性的）；PR 评论里输出基准数字，回归超 20% 标红。
