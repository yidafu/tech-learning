---
title: "3.8 高级：规则模板库（协议 + 占位变量）、规则版本 diff（monaco diff 复用《进阶大纲》§5）"
---

> 本文是《3. 动态查询构建器 / 规则引擎 UI ★全量展开 · 核心技术》按小节拆分后的续篇，上一部分见 [11-3-7-试运行面板-json-logic-js-前端即时求值.md](11-3-7-试运行面板-json-logic-js-前端即时求值.md)。

#### 3.8 高级：规则模板库（协议 + 占位变量）、规则版本 diff（monaco diff 复用《进阶大纲》§5）

**是什么**：两个降本增效的增值件。**模板库**：把高频规则（"大额订单复核""工作时间告警""新客首单营销"）做成"协议 + 占位变量"的模板，一键套用后只填变量不搭结构。**版本 diff**：规则每次保存存一版，任意两版之间用 monaco 的 DiffEditor（复用《进阶大纲》§5 JSON 编辑器的同一套封装与 worker 配置）做并排对比，回答审计最高频的问题"这次到底改了什么"。

**为什么需要**：条件树对运营人员仍是有学习成本的构造物（嵌套组、且或组合），但 80% 的规则是 20% 的模式变体——模板把"结构知识"固化、只留"参数知识"给用户。版本 diff 则是合规刚需：审批流条件改了一行导致流程走错，回溯时要精确到"哪个操作者、哪个版本、改了哪个值"。

**怎么做（机制分步）**：

1. 模板协议：`RuleTemplate = { id, name, description, variables, tree }`，`tree` 就是标准条件树，值的位置嵌 `{{变量名}}` 占位符。
2. 套用 = `instantiateTemplate`：递归遍历，字符串值命中占位符则替换（数组里的占位符也要处理），同时 `deepCloneWithNewIds` 重新发 id。
3. diff 的关键预处理：**归一化**——去掉 id（每次保存 id 都变，不归一化 diff 全是噪音）、子节点按签名排序（顺序变化若语义无关就不该刷屏），再 `JSON.stringify(…, 2)` 喂给 DiffEditor。

**代码——模板协议与实例化**：

```ts
// rule-template.ts —— 模板：协议 + 占位变量
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import { deepCloneWithNewIds } from './tree-ops'

export interface TemplateVariable {
  key: string        // 占位符名，与树内 {{key}} 对应
  label: string      // 弹窗里的输入框标签
  defaultValue: string | number
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  variables: TemplateVariable[]
  tree: ConditionTree // 标准协议树，值里可嵌 {{key}} 占位符
}

/** 占位符替换：支持字符串值与数组元素两种位置 */
function resolvePlaceholder(v: unknown, values: Record<string, string | number>): unknown {
  if (typeof v === 'string') {
    const m = /^\{\{(\w+)\}\}$/.exec(v)
    if (m) return values[m[1]] ?? v // 没提供就保留原文，§3.6 校验会逼用户填
  }
  if (Array.isArray(v)) return v.map(item => resolvePlaceholder(item, values))
  return v
}

/** 套用模板：替换占位符 + 重新发 id（同一模板可反复套用而不撞 id） */
export function instantiateTemplate(
  tpl: RuleTemplate,
  values: Record<string, string | number>,
): ConditionTree {
  const cloned = deepCloneWithNewIds(tpl.tree)
  const walk = (n: ConditionTreeNode): ConditionTreeNode =>
    n.kind === 'group'
      ? { ...n, children: n.children.map(walk) }
      : { ...n, value: resolvePlaceholder(n.value, values) }
  return walk(cloned) as ConditionTree
}
```

一个真实模板的样子（"大额订单人工复核"，阈值与城市清单做成变量）：

```json
{
  "id": "tpl_large_order_review",
  "name": "大额订单人工复核",
  "description": "金额超过阈值，或命中重点城市 VIP 订单时，转人工复核",
  "variables": [
    { "key": "threshold", "label": "金额阈值（元）", "defaultValue": 1000 },
    { "key": "vipGrade", "label": "VIP 等级", "defaultValue": "GOLD" }
  ],
  "tree": {
    "kind": "group", "id": "tpl_root", "combinator": "or", "children": [
      { "kind": "condition", "id": "tpl_c1", "field": "amount", "operator": ">=", "value": "{{threshold}}" },
      { "kind": "group", "id": "tpl_g1", "combinator": "and", "children": [
        { "kind": "condition", "id": "tpl_c2", "field": "city", "operator": "in", "value": ["北京", "上海"] },
        { "kind": "condition", "id": "tpl_c3", "field": "vipGrade", "operator": "=", "value": "{{vipGrade}}" }
      ]}
    ]
  }
}
```

**代码——模板选择面板**（选中模板 → 填变量 → 灌入编辑器）：

```tsx
// RuleTemplatePanel.tsx —— 模板库面板
import { useState } from 'react'
import type { ConditionTree } from './condition-tree'
import { type RuleTemplate, instantiateTemplate } from './rule-template'

export function RuleTemplatePanel({ templates, onApply }: {
  templates: RuleTemplate[]
  onApply: (tree: ConditionTree) => void
}) {
  const [selected, setSelected] = useState<RuleTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string | number>>({})

  const pick = (tpl: RuleTemplate) => {
    setSelected(tpl)
    setValues(Object.fromEntries(tpl.variables.map(v => [v.key, v.defaultValue])))
  }

  return (
    <div className="qb-tpl">
      <ul>
        {templates.map(tpl => (
          <li key={tpl.id}>
            <button type="button" onClick={() => pick(tpl)}>
              <strong>{tpl.name}</strong>
              <span>{tpl.description}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="qb-tpl-form">
          {selected.variables.map(v => (
            <label key={v.key}>
              {v.label}
              <input
                value={values[v.key] ?? ''}
                onChange={e =>
                  setValues(prev => ({ ...prev, [v.key]: e.target.value }))
                }
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              onApply(instantiateTemplate(selected, values)) // 灌入编辑器，用户可继续微调
              setSelected(null)
            }}
          >
            套用模板
          </button>
        </div>
      )}
    </div>
  )
}
```

**代码——规则版本 diff（monaco DiffEditor 复用）**：

```tsx
// RuleVersionDiff.tsx —— 版本对比：monaco diff，复用《进阶大纲》§5 的封装与 worker 配置
import { useMemo } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { ConditionTree, ConditionTreeNode } from './condition-tree'

/** diff 前归一化：去 id、按签名排序——否则每次保存 id 全变，diff 全屏飘红 */
function normalizeForDiff(node: ConditionTreeNode): ConditionTreeNode {
  if (node.kind === 'condition') {
    return { kind: 'condition', id: '', field: node.field, operator: node.operator, value: node.value }
  }
  const children = node.children
    .map(normalizeForDiff)
    .sort((a, b) => signature(a).localeCompare(signature(b)))
  return { kind: 'group', id: '', combinator: node.combinator, children }
}

function signature(n: ConditionTreeNode): string {
  return n.kind === 'condition'
    ? `${n.field}|${n.operator}|${JSON.stringify(n.value)}`
    : `${n.combinator}:(${n.children.map(signature).join(',')})`
}

export function RuleVersionDiff({ current, previous, height = 420 }: {
  current: ConditionTree   // 当前版本（保存后的树）
  previous: ConditionTree  // 上一版本（规则历史表里取）
  height?: number
}) {
  const original = useMemo(() => JSON.stringify(normalizeForDiff(previous), null, 2), [previous])
  const modified = useMemo(() => JSON.stringify(normalizeForDiff(current), null, 2), [current])
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language="json"
      theme="vs"
      height={height}
      options={{
        readOnly: true,                 // diff 只读——版本内容不可在线篡改
        renderSideBySide: true,         // 并排视图：左旧右新，审计场景的标准姿势
        minimap: { enabled: false },    // 规则 JSON 不长，缩略图纯占地方
        fontSize: 12,
      }}
    />
  )
}
```

**常见坑（模板/diff 层）**：
- 症状：套用模板后保存报"未知字段 `vipGrade`"。
- 根因：模板内置的 `tree` 引用了当前环境字段表里不存在的字段——模板是"协议快照"，字段元数据演进（改名/下线）后模板过期了。
- 修法：模板入库与上线走同一套校验（`validateTree` + 字段表），管理端做"模板体检"批量扫描；这与坑 2 的存量规则悬空是同一个问题的两种形态，解法同源——**凡引用元数据的数据（规则/模板/看板），都要有元数据变更后的体检机制**。

> 以下 3.8.1～3.8.3 为模板库与版本管理的进阶补充小节（编号续接本文件 3.8 一节）：占位变量的类型系统与校验、模板实例化的交互闭环（预览/合并/撤销）、结构化 diff（节点移动识别与语义等价提示）。

##### 3.8.1 模板协议进阶——占位变量的类型系统与校验

**是什么**：主体协议里 `TemplateVariable` 只有 `key / label / defaultValue`（`defaultValue: string | number` 一个裸联合）——占位变量没有类型系统，"金额阈值"与"城市名"在协议里长得一模一样。本节给变量补上**类型与约束**（`type: 'number' | 'string' | 'enum' | 'date' | 'boolean'`，附 min/max/options/required），并补上**两段校验**：模板自身健康检查（占位符与声明双向一致、变量类型与目标字段类型匹配）与用户填参校验（实例化之前，错误定位到具体变量输入框）。

**为什么难**：没有类型系统的占位符是字符串替换游戏，两个事故按先后脚到来：**类型漂移**——模板里 `amount >= {{threshold}}`，用户在输入框填了"一千"，`instantiateTemplate` 照样替换（字符串替换不挑食），产出 `"amount >= '一千'"`，§3.6 校验"数字字段需要数字类型的值"拦下时用户已经填完整个表单，报错还得自己翻译回"哪个变量填错了"；**声明漂移**——模板作者改树时删了 `{{vipGrade}}` 条件、忘了删 variables 声明（表单里留着一个填了没用的输入框），或反过来树里新写了 `{{city}}`、声明里没有（`resolvePlaceholder` 的 `?? v` 兜底让 `{{city}}` 字面量直接进了 value——规则里出现一个值为 `"{{city}}"` 的条件，试运行永远不命中且无人察觉）。**占位符系统是模板作者与模板用户之间的微型契约，契约没有 schema 与校验，漂移只是时间问题**——这正是 §3.1 协议层教训（"契约必须有守门人"）在模板子协议上的重演。

**关键机制**：

1. **变量类型与字段类型对齐**：占位符落在哪个字段、该字段 `FieldMeta.valueType` 是什么，模板健康检查时静态比对——number 变量只能落在 number 字段，date 变量只落 date 字段。占位符的位置（field + operator）在树里是可定位的，检查是确定性的。
2. **双向一致性**：树里出现的 `{{key}}` 集合 = variables 声明的 key 集合。多出（未声明）与缺少（未使用）都是错误，前者致命（字面量进树），后者是警告（脏表单）。
3. **填参校验复用字段级逻辑**：用户填的值按变量的 type 走一遍与 §3.6 同源的规则（number 要 `Number.isFinite`、enum 要在 options 内、date 要 ISO 格式）——错误消息直接说"金额阈值必须是数字"，而不是事后再由树校验兜底。
4. **类型决定表单控件**：填参表单按变量 type 渲染控件（number→数字框、enum→下拉、date→日期框、boolean→开关）——主体面板那个唯一的 `<input>` 升级为按类型分发的控件族。

**最小可行实现**：

```ts
// template-variables.ts —— 占位变量类型系统 + 两段校验
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import type { FieldMeta } from './field-meta'

export type VariableType = 'number' | 'string' | 'enum' | 'date' | 'boolean'

export interface TemplateVariable {
  key: string
  label: string
  type: VariableType
  defaultValue: string | number | boolean
  required?: boolean                  // 缺省 true：占位符没值就不该实例化
  min?: number                        // type === 'number' 时生效
  max?: number
  options?: string[]                  // type === 'enum' 时生效（合法取值）
}

export interface TemplateVariableError {
  key: string                         // 变量 key（表单输入框定位用）
  message: string
}

/* ---- 第一段：模板健康检查（模板作者侧，入库前跑） ---- */

/** 收集树里全部占位符引用：(key, 落点字段, 落点操作符) */
export function collectPlaceholderRefs(tree: ConditionTree): { key: string; field: string }[] {
  const refs: { key: string; field: string }[] = []
  const RE = /^\{\{(\w+)\}\}$/
  const scan = (v: unknown, field: string): void => {
    if (typeof v === 'string') {
      const m = RE.exec(v)
      if (m) refs.push({ key: m[1], field })
    } else if (Array.isArray(v)) {
      v.forEach(item => scan(item, field))
    }
  }
  const walk = (node: ConditionTreeNode): void => {
    if (node.kind === 'group') { node.children.forEach(walk); return }
    scan(node.value, node.field)
  }
  walk(tree)
  return refs
}

export function validateTemplate(
  tree: ConditionTree,
  variables: TemplateVariable[],
  fieldMap: Map<string, FieldMeta>,
): TemplateVariableError[] {
  const errors: TemplateVariableError[] = []
  const refs = collectPlaceholderRefs(tree)
  const declared = new Set(variables.map(v => v.key))

  for (const ref of refs) {
    if (!declared.has(ref.key)) {
      errors.push({ key: ref.key, message: `树内占位符 {{${ref.key}}} 未在 variables 中声明——实例化时字面量会进树` })
      continue
    }
    // 类型匹配：占位符落点的字段类型 vs 变量类型
    const field = fieldMap.get(ref.field)
    const variable = variables.find(v => v.key === ref.key)!
    if (field) {
      const compatible: Record<VariableType, FieldMeta['valueType'][]> = {
        number: ['number'], date: ['date'], boolean: ['boolean'],
        string: ['string', 'enum'], enum: ['enum', 'string'],
      }
      if (!compatible[variable.type].includes(field.valueType)) {
        errors.push({ key: ref.key, message: `变量 {{${ref.key}}} 类型是 ${variable.type}，但落在 ${field.valueType} 字段「${field.label}」上` })
      }
    }
  }
  for (const v of variables) {
    if (!refs.some(r => r.key === v.key)) {
      errors.push({ key: v.key, message: `变量 {{${v.key}}} 已声明但树内未使用（脏表单项，请删除声明）` })
    }
    if (v.type === 'enum' && (!v.options || v.options.length === 0)) {
      errors.push({ key: v.key, message: `枚举变量 {{${v.key}}} 必须声明 options` })
    }
  }
  return errors
}

/* ---- 第二段：填参校验（模板用户侧，实例化前跑） ---- */

export function validateVariableValues(
  variables: TemplateVariable[],
  values: Record<string, unknown>,
): TemplateVariableError[] {
  const errors: TemplateVariableError[] = []
  for (const v of variables) {
    const value = values[v.key]
    if (value == null || value === '') {
      if (v.required !== false) errors.push({ key: v.key, message: `${v.label} 未填写` })
      continue
    }
    switch (v.type) {
      case 'number': {
        const n = Number(value)
        if (!Number.isFinite(n)) { errors.push({ key: v.key, message: `${v.label} 必须是数字` }); break }
        if (v.min !== undefined && n < v.min) errors.push({ key: v.key, message: `${v.label} 不能小于 ${v.min}` })
        if (v.max !== undefined && n > v.max) errors.push({ key: v.key, message: `${v.label} 不能大于 ${v.max}` })
        break
      }
      case 'enum':
        if (!v.options?.includes(String(value))) errors.push({ key: v.key, message: `${v.label} 必须是 ${v.options?.join(' / ')} 之一` })
        break
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) errors.push({ key: v.key, message: `${v.label} 需要是 yyyy-MM-dd 格式的日期` })
        break
      case 'boolean':
        if (typeof value !== 'boolean') errors.push({ key: v.key, message: `${v.label} 必须是布尔值` })
        break
    }
  }
  return errors
}
```

**填参表单按类型分发控件**（主体 `RuleTemplatePanel` 里那个裸 `<input>` 的替换件）：

```tsx
// VariableField.tsx —— 按变量类型分发控件：number→数字框、enum→下拉、date→日期框
export function VariableField({ variable, value, onChange, error }: {
  variable: TemplateVariable
  value: unknown
  onChange: (v: unknown) => void
  error?: TemplateVariableError
}) {
  const common = { 'aria-label': variable.label, 'aria-invalid': error ? true : undefined }
  return (
    <label className="qb-var-field">
      {variable.label}
      {variable.type === 'number' && (
        <input type="number" {...common} value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      )}
      {variable.type === 'enum' && (
        <select {...common} value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}>
          <option value="">请选择</option>
          {(variable.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {variable.type === 'date' && (
        <input type="date" {...common} value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {variable.type === 'boolean' && (
        <input type="checkbox" {...common} checked={value === true} onChange={e => onChange(e.target.checked)} />
      )}
      {variable.type === 'string' && (
        <input type="text" {...common} value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {error && <span className="qb-var-error" role="alert">{error.message}</span>}
    </label>
  )
}
```

注意 number 档在 onChange 里就完成了 `Number()` 转换（不是把字符串塞给 values 再事后洗）——**类型转换在输入边界完成**，`instantiateTemplate` 拿到的 values 天然类型正确，与 §3.5 "脏值在关口洗掉"是同一条纪律的两处应用。

**选型与学习路径**：变量类型系统只有五个类型是有意的——它对齐 `FieldMeta.valueType`（§3.3），两边一套词汇；不要发明"变量特有"的类型（如"金额"），类型语义的扩展走 3.3.2 的字段类型注册表，变量类型只做"落点兼容性判断"。模板健康检查接入管理端的"模板体检"（主体坑的修法已提出批量扫描），填参校验接模板选择面板（3.8.2 的闭环里它是"套用"按钮的门卫）。

**坑（变量类型）**：
- 症状：套用"大额订单复核"模板，阈值填了 `1000`，保存成功；上线后该规则**从不命中**任何订单——后端执行日志里条件是 `amount >= "1000"`（字符串）。
- 原因：填参表单是裸 `<input type="text">`（主体实现），用户输入进 values 的是字符串 `"1000"`；`resolvePlaceholder` 字符串替换原样进树；§3.5 转换层的 `coerceValue` 本应在关口把它转 number，但该业务走的是 ES 方言、转换器是 3.5.1 注册表接入前复制的旧代码，没带 coerce——三道防线缺了两道，第三道（后端）把字符串当 term 查询，永false 不报错。
- 修法：本节的两段校验补齐前两道（输入边界转类型 + 填参校验查 `Number.isFinite`）；第三道（转换层 coerce）回归 3.5.1 的统一管线。**类型安全是链式的：输入、协议、转换三关任何一关失守，兜底的那关就要独自面对全部脏值**——三关都设防，单关失效才是可容忍的。

##### 3.8.2 模板实例化的交互闭环——预览、合并策略与可撤销

**是什么**：主体 `RuleTemplatePanel` 的流程是"选模板 → 填变量 → `onApply` 灌入编辑器"，交互上有三个未回答的问题，本节补成闭环：**灌入前预览**（只读渲染实例化后的树，占位值高亮——所见即所得，套用前就知道会得到什么）；**合并策略**（当前编辑器里已有内容时，"灌入"是替换、追加还是包成子组？三种语义完全不同，必须让用户选）；**可撤销**（模板实例化是一次大规模结构变更，必须可一步 undo——04 交互规范五的"有可靠 undo 才配砍掉确认框"，这里是它的正向应用：不弹确认框，靠 undo 兜底）。

**为什么需要**：三个问题对应三类真实翻车。无预览：用户填完变量点"套用"，编辑器里的树瞬间被替换成一棵结构没见过的树——填参数时他并不知道模板长什么样（列表页只有一句 description），套用成了开盲盒；无合并策略：用户已经配了七八个条件，套模板想把"VIP 判断"补进来，结果整棵树被模板覆盖，半小时工作消失（且没有 undo 就真消失了）；策略实现错语义：**"追加到根组"看起来温和，实际上改变了根组的逻辑语义**——根组是"且"，追加的模板根组是"或"子树，追加后整棵树的真值条件变了，用户以为"加了几行"，实际是"加了括号"。

**合并策略的三种语义**（这是本节真正的决策点，产品文案要说人话但语义要精确）：

| 策略 | 树操作 | 语义后果 | 适用 |
|---|---|---|---|
| **替换** | `onChange(instanceTree)` | 当前树丢弃，规则 = 模板 | 从零开始、或明确要重配 |
| **追加至根组** | `insertChild(current, rootId, instanceRoot)` | 模板整棵成为根组的**一个子节点**：根组"且"时 = 且上模板全部条件；根组"或"时 = 或上——**语义由根组 combinator 决定，用户必须看清楚根组当前是且还是或** | 给现有规则补充一组条件 |
| **包成子组** | `insertChild(current, rootId, createGroup([instanceRoot], 'and'))` | 等价于"且上模板"——不受根组 combinator 影响，语义最可预测 | 补充条件且不想被根组的或影响 |

三选一的默认值：当前树为空 → 替换（唯一合理）；非空 → **包成子组**（语义最可预测）。"追加至根组"要展示根组当前的 combinator 并在文案里写明后果（"将作为「且」条件并入当前规则"）。

**最小可行实现**：

```ts
// apply-template.ts —— 三种合并策略 + 预览数据：一次实例化，两处消费
import type { ConditionTree } from './condition-tree'
import { createGroup, insertChild } from './tree-ops'
import { type RuleTemplate, instantiateTemplate } from './rule-template'

export type MergeStrategy = 'replace' | 'append-to-root' | 'wrap-as-group'

export interface ApplyTemplatePlan {
  instance: ConditionTree        // 实例化产物（预览渲染它）
  merged: ConditionTree          // 按策略合并后的整树（预览也可以直接渲染它——所见即所得）
  strategy: MergeStrategy
}

/** 生成计划：预览与落盘共用一次计算，预览显示的就是将要发生的 */
export function planApplyTemplate(
  current: ConditionTree,
  template: RuleTemplate,
  values: Record<string, string | number>,
  strategy: MergeStrategy,
): ApplyTemplatePlan {
  const instance = instantiateTemplate(template, values)
  switch (strategy) {
    case 'replace':
      return { instance, merged: instance, strategy }
    case 'append-to-root':
      return { instance, merged: insertChild(current, current.id, instance), strategy }
    case 'wrap-as-group':
      return { instance, merged: insertChild(current, current.id, createGroup([instance], 'and')), strategy }
  }
}
```

面板侧的闭环（预览 + 策略选择 + undo 接线，替换主体的 `onApply` 调用点）：

```tsx
// TemplateApplyDialog.tsx —— 套用闭环：预览 → 选策略 → 应用（可撤销）
import { useMemo, useState } from 'react'
import type { ConditionTree } from './condition-tree'
import { type RuleTemplate } from './rule-template'
import { planApplyTemplate, type MergeStrategy } from './apply-template'
import { validateVariableValues, type TemplateVariableError } from './template-variables'

const STRATEGY_LABELS: Record<MergeStrategy, string> = {
  replace: '替换当前规则（当前内容将丢弃）',
  'append-to-root': '并入当前规则根组（按根组的「且/或」组合）',
  'wrap-as-group': '作为一个「且」条件组追加（推荐，语义最可预测）',
}

export function TemplateApplyDialog({ current, template, values, onApply, onCancel }: {
  current: ConditionTree
  template: RuleTemplate
  values: Record<string, string | number>
  onApply: (next: ConditionTree) => void      // 上层：onChange(next) 之前先 pushUndo（见下）
  onCancel: () => void
}) {
  const currentEmpty = current.children.length === 0
  const [strategy, setStrategy] = useState<MergeStrategy>(currentEmpty ? 'replace' : 'wrap-as-group')
  const errors = validateVariableValues(template.variables, values)
  const plan = useMemo(
    () => errors.length === 0 ? planApplyTemplate(current, template, values, strategy) : null,
    [current, template, values, strategy, errors.length],
  )

  return (
    <div className="qb-tpl-dialog" role="dialog" aria-label="套用模板">
      <fieldset>
        <legend>合并方式</legend>
        {(Object.keys(STRATEGY_LABELS) as MergeStrategy[]).map(s => (
          <label key={s}>
            <input
              type="radio" name="tpl-merge" value={s}
              disabled={currentEmpty && s !== 'replace'}   // 空树只有替换一种语义
              checked={strategy === s}
              onChange={() => setStrategy(s)}
            />
            {STRATEGY_LABELS[s]}
          </label>
        ))}
      </fieldset>
      {/* 预览：渲染 plan.merged（§3.7 的只读 PreviewNode 换个皮肤复用），
          模板来源的节点加 data-from-template 高亮——用户看清"哪些是已有的、哪些是新增的" */}
      {plan && <div className="qb-tpl-preview" data-strategy={strategy}>{/* <PreviewNode node={plan.merged} … /> */}</div>}
      <div className="qb-tpl-actions">
        <button type="button" onClick={onCancel}>取消</button>
        <button
          type="button"
          disabled={plan === null}
          onClick={() => plan && onApply(plan.merged)}
        >
          套用（可撤销）
        </button>
      </div>
    </div>
  )
}
```

undo 的接线（一句话，机制在《进阶大纲》§1.5）：`onApply` 的实现是 `pushUndo(current); onChange(plan.merged)`——结构大变更成为一次可 Cmd+Z 的原子操作，所以对话框不需要"确认"按钮的二次确认（已有预览 + 策略选择两道明示，再加确认框就是三重打扰）。若项目还没接 undo，套用动作**必须**弹确认——这是 04 规范五的边界条件的反向执行。

**选型与学习路径**：预览复用 §3.7 的只读渲染器（`PreviewNode`），策略函数是三个 tree-ops 一行调用——本节几乎没有新机制，全部是已有件的对齐组合，这是 3.x 系列走到这里的红利（协议统一、只读渲染器可复用、tree-ops 齐备）。新交互模式的学习样本是 IDE 的"应用代码模板/重构预览"（IntelliJ 的 refactor preview 对"将要发生什么"的展示粒度值得抄——diff 视图标注新增/修改/删除）。

**坑（实例化交互）**：
- 症状：用户配了 20 分钟的复杂规则，想套模板补一个 VIP 判断，点"套用"后整棵树没了——只剩模板那三行。找产品投诉"数据丢失"，实际数据在，但用户不知道 undo 能救回来（而且项目根本没接 undo）。
- 原因：`onApply(instantiateTemplate(...))` 直接替换 value——主体的默认行为；无预览（用户没意识到会替换）、无策略选择（没有"追加"可选）、无 undo（错了无法回退）。三个缺失叠加，"套用"成了一个不可逆的破坏性操作却长得像普通按钮。
- 修法：本节闭环三件套全上：非空树默认"包成子组"（破坏性最小）、预览展示合并后的整树、套用前 pushUndo 且按钮文案标注"可撤销"。**破坏性操作的产品判断只有一条依据：它的最坏后果是否可一步恢复**——可恢复就别打断流程（无确认框），不可恢复就必须明示（确认框或不可点）。

##### 3.8.3 结构化 diff——节点移动识别与语义等价提示

**是什么**：主体的 `RuleVersionDiff` 把两棵树归一化后 `JSON.stringify` 喂给 monaco 文本 diff——审计能用，但读 JSON 文本的 diff 是在**字符层面**理解树的变化。本节给版本对比一层**结构化 diff**：直接对两棵树做树级比对，产出带语义类型的补丁列表——`added`（新增节点）/ `removed`（删除）/ `modified`（值或操作符变了）/ `moved`（节点挪了位置但内容没变）——外加**语义等价提示**（"仅子节点顺序变化，'且'组内顺序不影响语义""in 数组顺序变化，语义不变"）。monaco 文本 diff 保留为"查看原始 JSON"的第二视图，两者并列。

**为什么需要**：文本 diff 的两个盲区正好是审计最高频的问题。**移动盲区**：用户把一个条件组从"根组第 1 位"拖到"第 3 位"，文本 diff 显示两段删除 + 两段新增（JSON 里位置变了就是"这里删了那里加了"）——审计报告变成"删了 5 个条件、加了 5 个条件"，实际语义零变化；**等价盲区**：`in [北京, 上海]` 改成 `in [上海, 北京]`，文本 diff 一行红一行绿，语义完全相同。两个盲区让 diff 报告充满噪音，审计人员对"这次到底改了什么实质"的答案要从十几行红绿里人工提炼——**结构化 diff 的价值就是把"实质变化"与"无语义变化"分开呈现**。另一个工程动机：3.8.2 的合并策略、规则同步（多环境搬运规则时的冲突检测）消费的也是这份结构化补丁——文本 diff 只能给人看，结构化补丁可以被程序消费。

**关键机制**：

1. **签名匹配**（复用主体的 `signature` 函数）：条件签名 = `field|operator|value`，组签名 = `combinator:(children signatures)`。旧树节点按签名建索引，新树逐节点查——签名相同即"同一节点"。
2. **四种补丁类型的判定顺序**：先按签名配对（配上 = 未变或移动），未配上的旧节点 = removed，未配上的新节点 = added；"值变了的修改"（`modified`）在签名层面配不上（value 进了签名）——所以 modified 的识别要**放宽一层**：按 `field + operator`（去掉 value）再配一次，配上而 value 不同的对为 modified。两级配对（先严后宽）是树 diff 的标准做法，单级配对会把"改了个值"误报成"删旧加新"。
3. **移动的判定**：签名配对成功的节点，比较 `(parentId, index)`——父子关系变了 = 跨组移动；同父但 index 变了 = 组内移动。**组内移动要再做语义判定**：父组是"且"/"或"时顺序无语义 → 归入"语义等价"；顺序有语义的场景（未来若协议支持有序语义，如 switch 分支）才是真移动。
4. **等价类提示挂在补丁上**：`moved` 补丁带 `semanticChange: false` 与提示文案；`modified` 里 in/notIn 的数组 value 做无序比较，顺序变化归入等价类（3.4.2 的坑已从编辑器侧指出这一点，这里在 diff 侧给出对偶实现）。

**最小可行实现**：

```ts
// tree-diff.ts —— 结构化 diff：组内两级配对（自顶向下）+ 跨组移动救援 + 语义等价标注
import type { ConditionTree, ConditionTreeNode, GroupNode } from './condition-tree'

export type TreePatch =
  | { type: 'added'; node: ConditionTreeNode }
  | { type: 'removed'; node: ConditionTreeNode }
  | { type: 'modified'; before: ConditionTreeNode; after: ConditionTreeNode; equivalent?: boolean; note?: string }
  | { type: 'moved'; after: ConditionTreeNode; semanticChange: boolean; note?: string }

/** 完整签名（与主体 normalizeForDiff 的 signature 同构）；宽松签名去掉 value，用于识别"改值" */
function fullSignature(n: ConditionTreeNode): string {
  return n.kind === 'condition'
    ? `${n.field}|${n.operator}|${JSON.stringify(n.value)}`
    : `${n.combinator}:(${n.children.map(fullSignature).join(',')})`
}
function looseSignature(n: ConditionTreeNode): string {
  return n.kind === 'condition' ? `${n.field}|${n.operator}` : `group:${n.combinator}`
}

/** in/notIn 的 value 与顺序无关 */
function arrayEqualsUnordered(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map(x => JSON.stringify(x)).sort()
  const sb = [...b].map(x => JSON.stringify(x)).sort()
  return sa.every((x, i) => x === sb[i])
}

export function diffTrees(before: ConditionTree, after: ConditionTree): TreePatch[] {
  const patches: TreePatch[] = []
  const removed: ConditionTreeNode[] = []
  const added: ConditionTreeNode[] = []

  /* 第一遍：组内配对（自顶向下递归）。配对只发生在"已配对的组"内部，
     "父组是谁"由递归结构天然回答——不靠 id、不靠父签名比对 */
  const diffGroup = (oldG: GroupNode, newG: GroupNode): void => {
    const matched = new Set<ConditionTreeNode>()

    newG.children.forEach((newChild, newIndex) => {
      // 第 1 级：完整签名配对——内容完全相同的节点（组则递归无补丁，条件则对比位置）
      const exact = oldG.children.find(c => !matched.has(c) && fullSignature(c) === fullSignature(newChild))
      if (exact) {
        matched.add(exact)
        const oldIndex = oldG.children.indexOf(exact)
        if (oldIndex !== newIndex) {
          patches.push({ type: 'moved', after: newChild, semanticChange: false,
            note: '组内顺序变化，且/或组内顺序不影响语义' })
        }
        if (newChild.kind === 'group' && exact.kind === 'group') diffGroup(exact, newChild) // 完整签名相同则内部零差异，这趟是防御性递归
        return
      }
      // 第 2 级（条件）：同 field+operator 但值不同 → modified（含 in 乱序的等价判定）
      if (newChild.kind === 'condition') {
        const loose = oldG.children.find(c =>
          c.kind === 'condition' && !matched.has(c) && looseSignature(c) === looseSignature(newChild))
        if (loose && loose.kind === 'condition') {
          matched.add(loose)
          const bothArrays = Array.isArray(newChild.value) && Array.isArray(loose.value) &&
            (newChild.operator === 'in' || newChild.operator === 'notIn')
          if (bothArrays && arrayEqualsUnordered(newChild.value, loose.value)) {
            patches.push({ type: 'modified', before: loose, after: newChild, equivalent: true,
              note: '选项顺序变化，in/notIn 语义与顺序无关' })
          } else {
            patches.push({ type: 'modified', before: loose, after: newChild })
          }
          return
        }
      }
      // 第 2 级（组）：组合器相同的未配对组 → 内容有变的组，下钻让内部补丁说话
      if (newChild.kind === 'group') {
        const looseGroup = oldG.children.find(c =>
          c.kind === 'group' && !matched.has(c) && c.combinator === newChild.combinator)
        if (looseGroup && looseGroup.kind === 'group') {
          matched.add(looseGroup)
          diffGroup(looseGroup, newChild)
          return
        }
      }
      added.push(newChild)
    })
    oldG.children.forEach(c => { if (!matched.has(c)) removed.push(c) })
  }
  diffGroup(before, after)

  /* 第二遍：跨组移动救援——removed 与 added 里完整签名相同的对，改判为 moved */
  for (const r of [...removed]) {
    const hit = added.findIndex(a => fullSignature(a) === fullSignature(r))
    if (hit >= 0) {
      const [movedNode] = added.splice(hit, 1)
      removed.splice(removed.indexOf(r), 1)
      patches.push({ type: 'moved', after: movedNode, semanticChange: true, note: '跨组移动' })
    }
  }
  patches.push(...added.map(node => ({ type: 'added' as const, node })))
  patches.push(...removed.map(node => ({ type: 'removed' as const, node })))
  return patches
}
```

两个实现决策的说明。**组内顺序变化的噪音聚合**：往组头插入一个条件会让后续所有配对节点的下标位移，逐条产出"组内顺序变化"补丁——UI 侧把同类补丁聚合为一行"该组内 N 个条件顺序变化（语义等价）"，比数据层做特殊合并干净（数据层如实记录，展示层做摘要）。**同级多组同组合器的配对是贪心的**：两个"或"子组都被改动时，宽松配对取第一个未配对的——配对结果可能不是"语义上最相关"的那对，但内部补丁（哪些条件改了值）仍然准确，只有"改的是哪个组"的归属可能有歧义；这类 diff 靠 `note` 提示人工确认即可，不必上最优配对算法。

**UI 与 monaco 的分工**：结构化补丁列表是默认视图（每条补丁一行：类型徽标 + 节点摘要 + 语义等价灰字 + 点击滚动定位到编辑器对应行——`nodeId` 与 §3.6 错误定位同一套机制）；monaco DiffEditor（主体实现）作为"原始 JSON"折叠面板保留——审计要留档时文本 diff 的上下文更完整。两个视图共享同一对归一化输入（主体的 `normalizeForDiff` 产物），保证"列表里 3 处修改、文本里也只该有 3 处红绿"——**多视图一致性靠共享预处理，不靠两个视图各自为政**。

**与相邻话题的分界**：协作编辑（两人同时编辑一棵树的 OT/CRDT 合并）不是本节话题——diff 是"两个版本的事后对比"，协同是"并发编辑的实时融合"，难度差一个量级，选型见《全景图》05-B（实时与协同）族；Monaco 的多光标/命令体系/worker 配置见《进阶大纲》13-5（本章主体的 DiffEditor 已复用它的封装，此处不重复）。

**选型与学习路径**：两级配对（full → loose signature）覆盖了本章协议的全部节点形态，先写配对逻辑与四类补丁，语义等价类按业务逐个加（第一批：组内顺序、in 乱序；第二批可加 `x > 5` 与 `5 < x` 这类交换等价——先不做，等审计反馈"哪些等价被误报"再补，等价类判定宁缺毋滥：**误报等价（把真变化标成语义不变）比漏报严重**——审计漏看真变化是事故，多看一眼假变化只是费眼）。深入学习材料：`diff` 算法族（Myers diff 是文本 diff 的基础，树 diff 看 Zhang-Shasha 算法——本节的签名配对是它的工程简化版，足够本章协议用；真需要最优树编辑距离时再上算法）。

**坑（结构化 diff）**：
- 症状：审计月报里，某次规则变更被记录为"删除 2 个条件、新增 2 个条件、修改 1 个条件"，风控要求回滚"删除的部分"——实际那 2 个"删除"只是被拖进了子组（移动），回滚操作把好规则改坏了。
- 原因：版本对比用的是文本 diff（或没做两级配对的结构化 diff）：移动在 JSON 位置层面就是"删旧处 + 增新处"；审计结论按补丁面值执行，没有人做"删除的两条和新增的两条内容完全一样"的人工核对——一天的变更量下，这种核对不现实。
- 修法：diff 产物必须带 `moved` 类型（本节的两级配对），审计报表按"实质变化"聚合（modified + semanticChange: true 的 moved 才进"实质变更"统计，等价移动单列"结构整理"一节）；报表生成器消费结构化补丁而不是文本 diff 的行数。**给下游（审计/风控）的接口决定上游必须产出什么：下游要"实质变更"，上游就必须做语义级 diff**——这是"契约倒逼实现"的又一次应验。

