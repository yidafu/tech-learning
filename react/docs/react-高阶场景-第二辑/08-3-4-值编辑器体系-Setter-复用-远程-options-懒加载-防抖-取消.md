---
title: "3.4 值编辑器体系 = Setter 复用；远程 options 懒加载（防抖 + 取消）"
---

> 本文是《3. 动态查询构建器 / 规则引擎 UI ★全量展开 · 核心技术》按小节拆分后的续篇，上一部分见 [07-3-3-字段元数据驱动-field-schema.md](07-3-3-字段元数据驱动-field-schema.md)。

#### 3.4 值编辑器体系 = Setter 复用；远程 options 懒加载（防抖 + 取消）

**是什么**：一族按 `ValueEditorType` 注册的值输入组件（文本/数字/区间/单选/多选/日期/区间日期/开关/远程单选/远程多选），经注册表查表取用。**它与《进阶大纲》§3 的 Setter 体系是同一套东西的两次出场**：Setter 是"属性名 → 编辑器"的一维映射（schema 声明字段类型，注册表给出组件），值编辑器是"(字段, 操作符) → 编辑器"的二维映射——映射维度多了一维，组件本身原封不动。真实工程里，`SelectEditor`/`MultiSelectEditor`/`DateEditor` 就是直接从 Setter 注册表 import 过来的同一些组件，本章为了片段自包含重新内联实现；工程落地时应回收到同一个注册表，避免两个平行体系各自长歪。

**为什么需要**：操作符切换时值编辑器必须跟着换（`>` 是数字框、`in` 是多选、`between` 是双框），如果用 if/else 散落在 QueryRow 里，每加一种编辑器改一次组件、回归一次全量。注册表模式把"类型 → 组件"的映射收敛成数据，QueryRow 永远只有一行 `valueEditorRegistry[editorType]`——这也是组件库"按协议分发"的通用解法。

**怎么做（机制分步）**：

1. 定义统一的 `ValueEditorProps`（value / onChange / field / operator 四个Props，受控）。
2. 实现各编辑器组件，组成 `Record<ValueEditorType, ComponentType<ValueEditorProps>>` 注册表。
3. 远程类编辑器：搜索关键词防抖 300ms → AbortController 取消上一次请求 → 序号守卫丢弃过期响应（乱序防御）→ loading/error 呈现。
4. 远程选项**首次聚焦才拉**（懒加载）：远程字段可能在树里出现几十行，一渲染就并发几十个搜索请求是事故级浪费。

**代码——值编辑器注册表**：

```tsx
// value-editors.tsx —— 值编辑器族：与《进阶大纲》§3 Setter 同构的注册表
import { useState, type ComponentType } from 'react'
import type { Operator } from './condition-tree'
import type { FieldMeta, ValueEditorType } from './field-meta'

export interface ValueEditorProps {
  value: unknown
  onChange: (next: unknown) => void
  field?: FieldMeta
  operator: Operator
}

/* 无值操作符：什么都不渲染 */
function NoneEditor(_props: ValueEditorProps) { return null }

function InputEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      placeholder="输入关键词"
    />
  )
}

function NumberEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="number"
      value={typeof value === 'number' ? value : ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

/* between 专用：双数字框，value 恒为 [min, max] */
function NumberRangeEditor({ value, onChange }: ValueEditorProps) {
  const pair = Array.isArray(value) ? (value as [number | null, number | null]) : [null, null]
  const set = (i: 0 | 1, v: number | null) => {
    const next: [number | null, number | null] = [pair[0], pair[1]]
    next[i] = v
    onChange(next) // 整体替换，保证协议形状不变
  }
  return (
    <span className="qb-range">
      <input type="number" placeholder="最小" value={pair[0] ?? ''} onChange={e => set(0, e.target.value === '' ? null : Number(e.target.value))} />
      <span>~</span>
      <input type="number" placeholder="最大" value={pair[1] ?? ''} onChange={e => set(1, e.target.value === '' ? null : Number(e.target.value))} />
    </span>
  )
}

function SelectEditor({ value, onChange, field }: ValueEditorProps) {
  return (
    <select value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="">请选择</option>
      {(field?.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function MultiSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <select
      multiple
      size={Math.min(4, Math.max(2, (field?.options ?? []).length))}
      value={selected}
      onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
    >
      {(field?.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/* 日期统一走 ISO-8601 字符串（yyyy-MM-dd）：字符串比较与字典序一致，转换层无需再转 */
function DateEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="date"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function DateRangeEditor({ value, onChange }: ValueEditorProps) {
  const pair = Array.isArray(value) ? (value as [string | null, string | null]) : [null, null]
  const set = (i: 0 | 1, v: string) => {
    const next: [string | null, string | null] = [pair[0], pair[1]]
    next[i] = v === '' ? null : v
    onChange(next)
  }
  return (
    <span className="qb-range">
      <input type="date" value={pair[0] ?? ''} onChange={e => set(0, e.target.value)} />
      <span>~</span>
      <input type="date" value={pair[1] ?? ''} onChange={e => set(1, e.target.value)} />
    </span>
  )
}

function SwitchEditor({ value, onChange }: ValueEditorProps) {
  return (
    <input
      type="checkbox"
      checked={value === true}
      onChange={e => onChange(e.target.checked)}
    />
  )
}

/* 远程单选/多选：搜索框 + 结果下拉，选项来自懒加载接口 */
function RemoteSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const [keyword, setKeyword] = useState('')
  const { options, loading, error } = useRemoteOptions(field?.remote, keyword)
  return (
    <span className="qb-remote">
      <input placeholder="搜索…" value={keyword} onChange={e => setKeyword(e.target.value)} />
      <select value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
        <option value="">{loading ? '加载中…' : '请选择'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="qb-remote-error" role="alert">{error}</span>}
    </span>
  )
}

function RemoteMultiSelectEditor({ value, onChange, field }: ValueEditorProps) {
  const [keyword, setKeyword] = useState('')
  const { options, loading, error } = useRemoteOptions(field?.remote, keyword)
  const selected = Array.isArray(value) ? (value as string[]) : []
  return (
    <span className="qb-remote">
      <input placeholder="搜索…" value={keyword} onChange={e => setKeyword(e.target.value)} />
      <select
        multiple
        size={4}
        value={selected}
        onChange={e => onChange(Array.from(e.target.selectedOptions, o => o.value))}
      >
        <option disabled>{loading ? '加载中…' : `共 ${options.length} 项`}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="qb-remote-error" role="alert">{error}</span>}
    </span>
  )
}

/** 注册表：类型字符串 → 组件。QueryRow 永远只做一次查表 */
export const valueEditorRegistry: Record<ValueEditorType, ComponentType<ValueEditorProps>> = {
  none: NoneEditor,
  input: InputEditor,
  number: NumberEditor,
  'number-range': NumberRangeEditor,
  select: SelectEditor,
  'multi-select': MultiSelectEditor,
  date: DateEditor,
  'date-range': DateRangeEditor,
  switch: SwitchEditor,
  'remote-select': RemoteSelectEditor,
  'remote-multi-select': RemoteMultiSelectEditor,
}
```

**代码——远程 options 懒加载 hook（防抖 + 取消 + 乱序守卫）**：

```ts
// use-remote-options.ts —— 远程选项三件套：防抖、取消、过期丢弃
import { useEffect, useRef, useState } from 'react'
import type { FieldOption, RemoteSource } from './field-meta'

interface RemoteOptionsState {
  options: FieldOption[]
  loading: boolean
  error: string | null
}

interface SearchResponse { list: Record<string, unknown>[] } // 后端契约：{ list: [...] }

export function useRemoteOptions(
  source: RemoteSource | undefined,
  keyword: string,
  delay = 300,
): RemoteOptionsState {
  const [state, setState] = useState<RemoteOptionsState>({ options: [], loading: false, error: null })
  const seqRef = useRef(0) // 请求序号：只认最新一次，过期响应直接丢弃

  useEffect(() => {
    if (!source?.url) return
    const seq = ++seqRef.current
    const controller = new AbortController() // 取消上一次未完成请求
    const timer = setTimeout(async () => {    // 防抖：停止输入 300ms 才发请求
      setState(s => ({ ...s, loading: true, error: null }))
      try {
        const url = new URL(source.url, window.location.origin)
        url.searchParams.set('keyword', keyword)
        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(`搜索接口错误 HTTP ${res.status}`)
        const json = (await res.json()) as SearchResponse
        if (seqRef.current !== seq) return    // 乱序守卫：旧请求晚到，静默丢弃
        const labelKey = source.labelKey ?? 'name'
        const valueKey = source.valueKey ?? 'id'
        setState({
          loading: false,
          error: null,
          options: json.list.map(item => ({
            label: String(item[labelKey] ?? ''),
            value: String(item[valueKey] ?? ''),
          })),
        })
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // 主动取消不算错误
        if (seqRef.current !== seq) return
        setState(s => ({ ...s, loading: false, error: (e as Error).message }))
      }
    }, delay)

    return () => {           // 清理函数：下一次 effect 前取消计时器与在途请求
      clearTimeout(timer)
      controller.abort()
    }
  }, [source?.url, keyword, delay, source])

  return state
}
```

三个防御缺一不可，对应三种真实事故：**防抖**治"每敲一个字一个请求"把搜索接口打爆；**取消**治用户已经切走、旧请求仍在占连接；**乱序守卫**治"搜`张`的响应比搜`张三`的先回来"导致下拉显示过时结果——取消只能终止未完成的请求，已经回到浏览器的响应 abort 管不到，必须靠序号比对。

**常见坑（编辑器层）**：
- 症状：多选框勾了三个城市，切换到 `=` 后页面崩溃：`value.includes is not a function`（编辑器拿到了数组却当字符串渲染）。
- 根因：编辑器切换入口不止一处（改操作符、改字段、回填历史规则），某一处忘了走 `applyOperatorChange` 的原子重置，旧类型 value 流进了新编辑器。
- 修法：所有切换路径收敛到 §3.3 的两个 apply 函数；同时在编辑器组件入口做防御性规整（`Array.isArray(value) ? ... : ...`），把"上游违约"降级为"显示为空"而非崩溃。

> 以下 3.4.1～3.4.3 为值编辑器体系的进阶补充小节（编号续接本文件 3.4 一节）：注册表的二级分发与受控/非受控双态、复合值编辑器（between 双值、变长数组）、远程 options 的跨实例缓存层。

##### 3.4.1 注册表进阶——二级分发链与受控/非受控双态

**是什么**：§3.4 主体的 `resolveValueEditor` 是"函数 or 常量"二选一的扁平查找。本节把它升级成一条**显式的查找链**（操作符特判 → 字段声明 → 类型默认 → 兜底），再把值编辑器补上**受控/非受控双态**——同一个组件，两种提交节奏。

**为什么需要**：查找链解决的是"声明优先级"问题——字段元数据来自三种模式（3.3.1：静态/接口/OpenAPI 推导），推导底稿只能给"类型默认"，人工覆盖层给"字段特判"，两者的优先级必须有明确规则，否则覆盖层永远盖不住底稿（或反过来）。双态解决的是"提交节奏"问题——受控（每键上树）所见即所得、试运行面板（§3.7）即时联动，但每次输入触发整树更新（3.2.3 的连坐链路）；大树 + 打字高频时，"局部编辑、失焦提交"的非受控档是性能逃生舱。

**查找链——四档显式优先级**：

```ts
// resolve-value-editor.ts —— 查找链：后一档永远是前一档的缺省
import type { Operator } from './condition-tree'
import { type FieldMeta, type ValueEditorType, isValuelessOperator } from './field-meta'
import { getValueTypeMeta } from './value-types'   // 3.3.2 的类型注册表（数据侧）

/** 类型默认编辑器：查数据侧注册表，类型先注册行为再配组件（多数自定义类型配现成编辑器） */
function defaultEditorForType(valueType: string): ValueEditorType {
  switch (valueType) {
    case 'number': case 'duration': return 'number'
    case 'enum': return 'select'
    case 'boolean': return 'switch'
    case 'date': return 'date'
    default: return 'input'
  }
}

export function resolveValueEditor(field: FieldMeta, operator: Operator): ValueEditorType {
  // 第 1 档：操作符特判——协议级规则，任何字段声明都盖不过它
  if (isValuelessOperator(operator)) return 'none'
  if (operator === 'between' || operator === 'notBetween') {
    // between 恒为二元值：字段声明了专用区间编辑器则尊重，否则按类型给默认区间
    if (typeof field.valueEditor === 'function') {
      const declared = field.valueEditor(operator)
      if (declared !== 'input') return declared       // 声明过非兜底值就采用
    }
    return field.valueType === 'date' ? 'date-range' : 'number-range'
  }
  // 第 2 档：字段声明（静态声明或函数声明）——业务覆盖层的主通道
  if (typeof field.valueEditor === 'function') return field.valueEditor(operator)
  if (typeof field.valueEditor === 'string') return field.valueEditor
  // 第 3 档：类型默认——OpenAPI 推导底稿（无显式声明）走这里
  return defaultEditorForType(field.valueType)
}
```

链上四档的分工与 3.3.1 的混合模式一一对应：**协议规则 > 业务覆盖 > 类型默认 > 兜底**。把优先级写成一条链而不是散在字段定义里，"为什么我的声明没生效"这类问题就有了排查路径（从链头往链尾找第一个命中的档位）。

**与设计器 Setter 体系的对齐**：《进阶大纲》§3 表单设计器的 Setter 是"属性名 → 声明 → 翻译成字段协议 → 注册表取组件"的一维链路（`setterToField` 翻译器），本章值编辑器是"(字段, 操作符) → 编辑器"的二维链路——**翻译器思想同构，维度多一维**（本章开头已点破）。工程回收的正确做法不是把两套注册表合并成一个（键空间不同：属性 setter 键 vs 值编辑器类型键），而是**组件同源、注册表各表**——同一个 `SelectEditor` 模块，在设计器仓库注册为 `selectSetter`，在查询构建器注册为 `'select'`：

```text
components/editors/                 ← 组件本体只有一份（受控、无业务耦合）
  SelectEditor.tsx
  DateEditor.tsx
  NumberRangeEditor.tsx
form-designer/setters.ts           ← 注册表 A：SetterKind → 组件（一维）
query-builder/value-editors.ts     ← 注册表 B：ValueEditorType → 组件（一维，resolveValueEditor 已把它二维化）
```

两边各自演化（设计器要预览态、查询构建器要 operator 上下文），共享的只是"组件本体 + Props 形状"（`ValueEditorProps` 的 value/onChange 两件套正是 Setter 的最小公约数）。react-querybuilder 的 `controls` 属性可替换一切控件（13-3-9-坑 对标节）就是这个设计推到极致的样子。

**受控/非受控双态——`useLocalCommit`**。原理与 30 行 `useControllableState`（《组件库实战大纲》A1，双模式的通用功力那里系统讲过）相同，但 QB 的用法是反的：**组件默认受控（§3.2 的纪律"不留半受控状态"），只对"高频输入型编辑器"开非受控档**——所以这里的 hook 不是"外部传不传 value 决定模式"，而是"编辑期间局部暂存、按节奏上树"：

```tsx
// use-local-commit.ts —— 值编辑器的提交节奏档位：即时 / 失焦 / 防抖
import { useEffect, useRef, useState } from 'react'

export function useLocalCommit<T>(value: T, onCommit: (next: T) => void) {
  const [local, setLocal] = useState<T>(value)
  const dirtyRef = useRef(false)

  // 外部值回流：只有"没有未提交的本地编辑"时才同步（否则会打断用户输入）
  useEffect(() => {
    if (!dirtyRef.current) setLocal(value)
  }, [value])

  // 卸载兜底：行被删除时 unmount 不触发 blur——脏值在这里最后一跳
  useEffect(() => {
    return () => {
      if (dirtyRef.current) onCommit(localRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 卸载时提交一次，依赖闭包的初值是错的，localRef 存最新
  const localRef = useRef(local)
  localRef.current = local

  return {
    local,
    set: (v: T) => { dirtyRef.current = true; setLocal(v) },
    commit: () => {
      if (dirtyRef.current) { dirtyRef.current = false; onCommit(local) }
    },
  }
}

/** 失焦提交档的文本编辑器：打字不上树，blur 才 commit */
export function LazyInputEditor({ value, onChange }: ValueEditorProps) {
  const { local, set, commit } = useLocalCommit(typeof value === 'string' ? value : '', onChange)
  return (
    <input
      type="text"
      value={local}
      onChange={e => set(e.target.value)}
      onBlur={commit}
      placeholder="输入关键词"
    />
  )
}
```

三档节奏的适用表：**即时上树**（默认）——树小（<50 行）时试运行联动（§3.7）与校验（§3.6）的即时反馈价值大于性能代价；**失焦提交**——大树（预算 1 超标时），配 3.2.3 的 memo 边界一起上；**防抖提交**（300ms）——折中档，远程校验字段（值要查后端，如"客户编号是否存在"）用它天然合并连击。注意卸载兜底那段的 `onCommit` 目标行可能已被删除——`updateNodeById` 找不到 id 会原样返回树（§3.2 的实现），提交静默落空，天然安全，无需额外判断。

**提交节奏也元数据化**——哪类字段开哪档，不应该散在各编辑器里硬编码，FieldMeta 上加一个可选声明即可：

```ts
// field-meta.ts 的增补：提交节奏声明（缺省 'eager'，全局默认不变）
export interface FieldMeta {
  // ...原有字段
  /** 值提交节奏：eager 每键上树（默认）/ lazy 失焦提交 / debounced 防抖 300ms */
  commitMode?: 'eager' | 'lazy' | 'debounced'
}

// QueryRow 侧的分发：编辑器组件不变，包一层节奏壳
// import { useEffect, useRef, type ComponentType } from 'react'
function withCommitMode(mode: FieldMeta['commitMode'], Editor: ComponentType<ValueEditorProps>) {
  if (mode === 'eager' || mode === undefined) return Editor     // 零包装零开销

  return function CommitModeEditor(props: ValueEditorProps) {
    const { local, set, commit } = useLocalCommit(props.value, props.onChange)
    // hooks 全部提到分支之前（mode 对某个包装组件是常量，但保持 hooks 顺序无条件的纪律）
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

    if (mode === 'lazy') {
      return (
        // React 的 onBlur 随 focusout 冒泡：包一层 span，行内任意控件失焦即提交，
        // 编辑器本体零改动（不用每个编辑器都记得挂 onBlur）
        <span onBlur={commit}>
          <Editor {...props} value={local} onChange={set} />
        </span>
      )
    }

    // debounced 档：set 起定时器、到点自动 commit
    const setDebounced = (v: unknown) => {
      set(v)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(commit, 300)
    }
    return <Editor {...props} value={local} onChange={setDebounced} />
  }
}
```

这样"哪个字段懒提交"成了元数据表里的一行字——与 3.3 的总主题严丝合缝：**行为知识进数据，组件保持通用**。

**坑（双态层）**：
- 症状：切了失焦提交档后，用户填完值直接点"保存规则"——保存的树里这个值是空的（还没 blur，commit 没发生）。
- 根因：提交节奏是编辑器内部约定，保存链路不知道"还有未提交的脏值"。
- 修法：保存动作前广播一次 flush——Context 里挂一个 `flushAll()`（各脏编辑器注册 flush 回调，保存按钮先调它再取树），或最简版：保存按钮 `onMouseDown` 时 `document.activeElement.blur()`（mousedown 先于焦点转移与 click，能赶在读取树之前触发 blur → commit）。前者正规后者鸡贼，都能救急。

##### 3.4.2 复合值编辑器——between 双值、变长数组与边界规整

**是什么**：协议里 `value` 的形状只有三种——标量、二元组（between）、定长数组（in）——但真实字段的值编辑需求是**复合的**：金额要"数字 + 币种"、标签匹配要"可增长的词条列表"、区间要"下限上限 + 单位"。复合值编辑器就是"一个编辑器管一个复合形状的 value"，配套三条纪律保证它不把协议搞脏。

**为什么需要**：复合需求的直觉解法是"加字段"——给 `ConditionNode` 加 `unit`、`extraValue` 之类。这是协议腐化的开始：每个复合需求加一对字段，转换层（§3.5）四种方言都要跟着改，json-logic 里塞不下的字段最后变成前端私有数据，规则换个系统执行就丢信息。**复合的正确落点是"value 的形状复合"而不是"节点字段复合"**——`value` 本来就是 `unknown`，形状自由度是协议留给编辑器的口子。

**三条纪律**（复合编辑器的宪法）：

1. **整体替换**：编辑器内部怎么拆（哪个输入框改哪个分量）都行，但 `onChange` 永远吐**完整的新 value**（§3.4 主体的 `NumberRangeEditor.set` 已经是这个写法——本条把它升格为所有复合编辑器的纪律）。禁止"只传变化的那一半"，否则上游要猜怎么合并。
2. **入口规整**：渲染第一行先做 `normalize(value)`——形状不对（上游违约、历史脏数据）降级为"空形状"而不是崩溃（§3.4 主体的防御性规整推广到复合形状）。
3. **形状可序列化**：value 只用 JSON 友好的结构（数组/元组/扁平对象），禁止 Date 对象、Map、类实例——它要能进 json-logic（§3.5）、能进版本 diff（§3.8）、能存库。

**最小实现一：`TagListEditor`——变长字符串数组**（`contains` 多关键词匹配的编辑器；协议里注册为自定义编辑器类型，字段声明 `valueEditor: 'tag-list'` 时启用）：

```tsx
// TagListEditor.tsx —— 变长词条编辑器：Enter 添加、Backspace 删除、IME 守卫
import { useState, type KeyboardEvent } from 'react'
import type { ValueEditorProps } from './value-editors'

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function TagListEditor({ value, onChange }: ValueEditorProps) {
  const tags = normalizeTags(value)              // 纪律 2：入口规整
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false) // IME 守卫：组词中的 Enter 不是"提交"

  const addDraft = () => {
    const v = draft.trim()
    if (v === '' || tags.includes(v)) { setDraft(''); return }
    onChange([...tags, v])                       // 纪律 1：整体替换
    setDraft('')
  }
  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !composing) { e.preventDefault(); addDraft() }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))                // 空草稿时退格删最后一个词条（标签输入的通用交互）
    }
  }

  return (
    <span className="qb-tags">
      {tags.map((tag, i) => (
        <button key={`${tag}:${i}`} type="button" className="qb-tag" onClick={() => remove(i)}>
          {tag} ✕
        </button>
      ))}
      <input
        className="qb-tags-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        placeholder={tags.length === 0 ? '输入后回车添加' : ''}
      />
    </span>
  )
}
```

IME 守卫是中文产品的生死线：拼音组词时按 Enter 是"上屏候选词"，不拦就会把半个拼音变词条。场景 6（富文本）对 IME 有整节的深挖，此处照方抓药：`compositionstart/end` 之间的按键全部放行给输入法。

**最小实现二：`UnitNumberEditor`——数字 + 单位的元组**。协议形状选择先想清楚（这是复合编辑器设计的真正决策点）：

```text
方案 A：元组 [数值, 单位]      → "[1000, 'CNY']"
方案 B：对象 { amount, unit }  → "{ \"amount\": 1000, \"unit\": \"CNY\" }"
```

元组序列化短、json-logic 的数组算子原生认识；对象可读、扩展第三分量（如"单位锁定"标记）不破坏索引语义。**本章选元组**——因为下游（§3.5 转换、§3.7 求值）把数组当一等公民，而对象需要自定义算子配合（`add_operation` 注册 `moneyEquals` 之类，§3.7 有示例）。把取舍写进字段的元数据注释，别让下一个人猜：

```tsx
// UnitNumberEditor.tsx —— 数字 + 单位：value 恒为 [数值, 单位键]（元组，形状见上方讨论）
import type { ValueEditorProps } from './value-editors'
import type { FieldOption } from './field-meta'

const UNITS: FieldOption[] = [
  { label: '元（CNY）', value: 'CNY' },
  { label: '美元（USD）', value: 'USD' },
]

export function UnitNumberEditor({ value, onChange }: ValueEditorProps) {
  const pair = normalizeUnitNumber(value)        // 纪律 2：非二元组一律回 [null, 默认单位]
  const setNumber = (n: number | null) => onChange([n, pair[1]])   // 纪律 1：整体替换
  const setUnit = (unit: string) => onChange([pair[0], unit])
  return (
    <span className="qb-unit-number">
      <input
        type="number"
        value={pair[0] ?? ''}
        onChange={e => setNumber(e.target.value === '' ? null : Number(e.target.value))}
      />
      <select value={pair[1]} onChange={e => setUnit(e.target.value)} aria-label="币种">
        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
      </select>
    </span>
  )
}

function normalizeUnitNumber(value: unknown): [number | null, string] {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'string') {
    return [value[0], value[1]]
  }
  return [null, UNITS[0].value]
}
```

**自定义编辑器怎么进注册表**：`ValueEditorType` 与 `valueEditorRegistry` 都是封闭定义（§3.4 主体），复合编辑器要注册进去，用的正是 3.3.2 同款的"字面量联合开放化"技巧——类型开放、注册表类型跟着开放：

```ts
// value-editors.ts 的增补：开放编辑器类型（内置类型保留补全，业务类型自由注册）
import { type ComponentType } from 'react'

/** 开放后的编辑器类型：内置 11 种 + (string & {}) 兜底任意业务自定义类型 */
export type OpenValueEditorType = ValueEditorType | (string & {})

/** 注册表改为开放 Record——注意不再用 Record<ValueEditorType, ...>（那是穷尽封闭的写法） */
export const valueEditorRegistry: Record<string, ComponentType<ValueEditorProps>> = {
  // ...内置 11 项原样搬入（§3.4 主体的注册表）
}

/** 注册函数：业务侧自定义编辑器的唯一入口（幂等保护，防 HMR 重复注册——3.3.2 同款坑） */
export function registerValueEditor(
  type: OpenValueEditorType,
  Editor: ComponentType<ValueEditorProps>,
): void {
  if (valueEditorRegistry[type]) {
    throw new Error(`值编辑器「${type}」已注册`)
  }
  valueEditorRegistry[type] = Editor
}

// 业务侧：TagListEditor / UnitNumberEditor 一行进表
registerValueEditor('tag-list', TagListEditor)
registerValueEditor('unit-number', UnitNumberEditor)
// 字段元数据里即可声明：valueEditor: 'tag-list'（resolveValueEditor 第 2 档直接命中）
```

这里能看到注册表模式在两个维度上的完整对称：**类型系统开放化（`& {}`）+ 注册入口幂等化（防重复）+ 查找链兜底（3.4.1）**——把它背下来，任何注册表（组件、Setter、值编辑器、字段类型）都是同一套动作。

**between 的边界自愈交给 UX 层，合法性交给校验层**：用户把上限填得比下限小（`[500, 100]`）时，编辑器**不自动交换**（自动交换会吃掉误操作的线索——用户不知道自己输了反，交换后规则看起来"对了"但意图可能相反），只做视觉警示（两框标橙 + title 提示"下限大于上限"），真正的报错由 §3.6 的校验统一出（那里有完整的 between 双值校验）。**编辑器管输入体验，校验管合法性判定，别越界**。

**坑（复合形状层）**：
- 症状：版本 diff（§3.8）里同一个"in [上海, 北京]"的规则，两次保存 diff 出两条改动——只是词条顺序换了。
- 根因：`in/notIn` 的语义与顺序无关，但数组 value 是顺序敏感的数据结构；编辑器保持用户输入序（正确），diff 层拿原始数组逐位比较（错误）。
- 修法：分工各归其位——编辑器不排序（保持用户心智），§3.8 的 `normalizeForDiff` 已按签名排序（那里正是为这种情况设计的）；如果你们的 diff 没做归一化，这就是必须补的场景。同理，TagListEditor 的"已存在词条拒绝重复添加"（上面 `tags.includes(v)`）也在源头减少无意义的形状变化。

##### 3.4.3 远程 options 的缓存层——请求去重、预取与权限隔离

**是什么**：在 §3.4 主体的 `useRemoteOptions`（每实例一份 state、防抖/取消/乱序守卫三件套）之上，加一层**跨实例共享的模块级缓存**：同字段多行、同关键词的搜索只发一条请求；命中缓存零延迟出选项；外加两个增值件——**预取**（字段选中的瞬间拉首页）与**权限隔离**（缓存键必须带权限域）。

**为什么需要**：三件套解决的是"**一个实例内**的时序正确"（竞态、取消、过期响应），缓存层解决的是"**多实例间**的重复与延迟"。查询构建器里同一远程字段会出现在多行（十个"所属销售"行）、多个编辑器实例（主编辑器 + 只读预览 + 模板表单）——无缓存时用户在十行里都搜"张"，就是十条一模一样的请求；而"行内首次点开下拉要等 300ms 防抖 + 网络"的延迟，靠预取消掉。

**与相邻知识的分工**：《进阶大纲》§2 动态表单的 RemoteSelect（防抖 + AbortController）是三件套的教学版，本章 §3.4 主体已内联同款——本节不重复它们，只加第四件（共享缓存）。另外它与 3.3.3 的元数据缓存是两种形态：字段表缓存"每域一份、低频变、小"，options 缓存"每字段 × 每关键词一份、高频变、量大"——所以失效策略不同（元数据靠版本号，options 靠 TTL + 容量上限），不要设计成一套。

**最小可行实现——缓存核心**：

```ts
// options-cache.ts —— 跨实例远程选项缓存：去重 + TTL + 权限隔离 + 容量上限
import type { FieldOption, RemoteSource } from './field-meta'

interface CacheEntry {
  options: FieldOption[]
  fetchedAt: number
  promise?: Promise<FieldOption[]>   // in-flight：同 key 的并发请求共享同一个 Promise
}

/** 缓存键三要素：url + 规整后的关键词 + 权限域（缺一是事故，见坑） */
export interface OptionsCacheKey {
  url: string
  keyword: string
  scope: string                      // 当前租户/用户域（从会话上下文取，绝不能省）
}

const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 60 * 1000             // options 是高频变数据：TTL 短，过期即重拉
const MAX_ENTRIES = 200              // 容量上限：LRU 式淘汰，防长会话内存涨

const keyOf = (k: OptionsCacheKey): string =>
  `${k.scope}|${k.url}|${k.keyword.trim().toLowerCase()}`

export async function getOptions(
  key: OptionsCacheKey,
  fetcher: (url: string, keyword: string, signal: AbortSignal) => Promise<FieldOption[]>,
  signal: AbortSignal,
): Promise<FieldOption[]> {
  const cacheKey = keyOf(key)

  const cached = CACHE.get(cacheKey)
  if (cached && !cached.promise && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.options             // 新鲜缓存：零网络、零延迟
  }
  if (cached?.promise) {
    return cached.promise             // in-flight 去重：第十行搜"张"复用第一行的在途请求
  }

  const promise = fetcher(key.url, key.keyword, signal)
    .then(options => {
      CACHE.set(cacheKey, { options, fetchedAt: Date.now() })
      if (CACHE.size > MAX_ENTRIES) {
        // 容量淘汰：Map 迭代序即插入序，删最早的（简易 LRU 够用，别引真 LRU 库）
        const oldest = CACHE.keys().next().value
        if (oldest !== undefined) CACHE.delete(oldest)
      }
      return options
    })
    .finally(() => {
      const entry = CACHE.get(cacheKey)
      if (entry?.promise === promise) entry.promise = undefined // 在途标记清除
    })
  CACHE.set(cacheKey, { options: [], fetchedAt: 0, promise })
  return promise
}

/** 预取：不等用户输入，先把"空关键词首页"拉进缓存——字段下拉选中远程字段的瞬间调用 */
export function prefetchOptions(key: Omit<OptionsCacheKey, 'keyword'>,
  fetcher: (url: string, keyword: string, signal: AbortSignal) => Promise<FieldOption[]>,
): void {
  const cacheKey = keyOf({ ...key, keyword: '' })
  if (CACHE.has(cacheKey)) return
  const controller = new AbortController()
  getOptions({ ...key, keyword: '' }, fetcher, controller.signal).catch(() => {})
}
```

**hook 改造——三件套照旧，数据来源换缓存**。关键认识：缓存层**不替代**防抖/取消/序号——缓存回答"要不要发请求"，三件套回答"发了的请求如何时序正确"，两层正交。改造后的 hook 只在"缓存未命中"时才走原来的网络分支：

```ts
// use-remote-options-cached.ts —— 三件套 + 缓存：§3.4 主体的 hook 接入缓存层
import { useEffect, useRef, useState } from 'react'
import type { FieldOption, RemoteSource } from './field-meta'
import { getOptions, type OptionsCacheKey } from './options-cache'

interface RemoteOptionsState {
  options: FieldOption[]
  loading: boolean
  error: string | null
}

export function useRemoteOptionsCached(
  source: RemoteSource | undefined,
  keyword: string,
  scope: string,                        // 权限域：调用方从会话上下文传入
  delay = 300,
): RemoteOptionsState {
  const [state, setState] = useState<RemoteOptionsState>({ options: [], loading: false, error: null })
  const seqRef = useRef(0)

  useEffect(() => {
    if (!source?.url) return
    const seq = ++seqRef.current
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState(s => ({ ...s, loading: true, error: null }))
      try {
        const options = await getOptions(
          { url: source.url, keyword, scope },           // ← 唯一的改动点：数据走缓存层
          async (url, kw, signal) => {
            const u = new URL(url, window.location.origin)
            u.searchParams.set('keyword', kw)
            const res = await fetch(u.toString(), { signal })
            if (!res.ok) throw new Error(`搜索接口错误 HTTP ${res.status}`)
            const json = (await res.json()) as { list: Record<string, unknown>[] }
            const labelKey = source.labelKey ?? 'name'
            const valueKey = source.valueKey ?? 'id'
            return json.list.map(item => ({
              label: String(item[labelKey] ?? ''),
              value: String(item[valueKey] ?? ''),
            }))
          },
          controller.signal,
        )
        if (seqRef.current !== seq) return                // 序号守卫：原样保留
        setState({ options, loading: false, error: null })
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        if (seqRef.current !== seq) return
        setState(s => ({ ...s, loading: false, error: (e as Error).message }))
      }
    }, delay)                                            // 防抖：原样保留
    return () => { clearTimeout(timer); controller.abort() } // 取消：原样保留
  }, [source?.url, source, keyword, scope, delay])

  return state
}
// 预取接入：QueryRow 的字段变更处理里（§3.3 applyFieldChange 之后）：
// if (nextField.remote) prefetchOptions({ url: nextField.remote.url, scope }, fetcher)
// 用户从字段下拉选中"所属销售"→ 空关键词首页已在缓存 → 点开值下拉秒出选项
```

**权限隔离的正确姿势**：options 的权限过滤**必须发生在服务端**（搜索接口按当前用户/租户裁剪结果），前端过滤只是防呆兜底——前端拿到的列表就应该是"这个用户可见的全部"，任何前端 `filter()` 都挡不住接口越权（那是安全模型问题，整体方案见场景 8）。前端的责任只有一条且不可省：**`scope` 进缓存键**——否则多租户/多角色环境下，A 域的缓存条目会被 B 域命中，A 的可见数据直接漏给 B（本节坑的正主）。

**自研 vs 现成库**：项目里已有 TanStack Query / SWR 的话，**别自研**——`useQuery` 的 queryKey 天然是"键 + 去重 + 缓存"，把 `keyOf` 拼成 queryKey、TTL 换成 `staleTime` 即可，三件套里的取消交给 `AbortSignal` 集成。自研 50 行的适用场景：编辑器要作为独立组件库分发（不绑定宿主的数据层）、或宿主项目零数据层。两者能力对照一行：现成库多了窗口聚焦重验证、离线持久化这些你暂时用不上的东西，自研版少了它们但每一行都可解释。

**坑（缓存层）**：
- 症状：多租户环境测试"数据串租"——B 租户用户的"所属销售"下拉里出现了 A 租户的销售名单，且只在"两个租户都搜过同名关键词"时偶现。
- 根因：缓存键只用了 `url + keyword`。两个租户访问同一接口，`scope` 不同但键相同——B 用户命中了 A 用户刚写入的缓存条目。这是缓存层最恶性的 bug：**越权数据通过缓存侧信道泄露**，且极难复现（要两个租户撞关键词）。
- 修法：缓存键强制三要素（上面 `keyOf` 的实现），`scope` 从会话上下文取而不是由编辑器组件随手传（组件容易漏）；配套一条单测：两个不同 scope 请求同键，断言缓存条目为两条、各自返回各自的列表。

