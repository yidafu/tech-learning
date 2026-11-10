---
title: "3.3 字段元数据驱动（field schema）"
---

> 本文是《3. 动态查询构建器 / 规则引擎 UI ★全量展开 · 核心技术》按小节拆分后的续篇，上一部分见 [06-3-2-递归渲染-QueryGroup-QueryRow.md](06-3-2-递归渲染-QueryGroup-QueryRow.md)。

#### 3.3 字段元数据驱动（field schema）

**是什么**：一张"字段元数据表"（field schema），每个字段声明自己的类型、可用操作符集合、值编辑器形态。UI 不写死任何业务字段——字段下拉、操作符下拉、值编辑器三者的内容全部由这张表推导。原文的声明式写法：

```ts
{ type, operators: [...], valueEditor: 'input' | 'select' | 'multi-select' | 'date-range' }
```

**为什么需要**：没有元数据表，每加一个可筛选字段就要改三处 UI 代码（字段下拉、操作符映射、值控件分支），业务字段几十上百个时彻底失控。元数据驱动的本质是**把"字段能怎么比"的知识从组件代码挪进数据**：换一张表，编辑器立刻变成"工单筛选器""日志检索器"，组件一行不改——这正是《进阶大纲》"Schema 驱动"主线在本章的延续。而且这张表与动态表单的 schema 是同源的：后端下发同一份字段定义，既驱动查询构建器，也驱动结果表的列渲染，前后端字段口径天然一致。

**怎么做（机制分步）**：

1. 定义 `FieldMeta` 类型：静态声明 + 函数声明两种形态（操作符不同 → 编辑器不同时用函数）。
2. 定义 `resolveValueEditor(field, operator)`：**二维查一维**——(字段， 操作符) 二元组唯一确定值编辑器。无值操作符（`isEmpty`）在这里统一短路。
3. 定义 `defaultValueFor(field, editor)`：每种编辑器的"干净默认值"。
4. 两个联动函数 `applyFieldChange` / `applyOperatorChange`：字段或操作符变化的瞬间，**原子地**重置其余联动项——这是坑 1（value 类型残留）的正解，所有变更必须走这两个门，禁止在组件里手改 `operator` 而不动 `value`。

**代码——元数据协议与联动规则**：

```ts
// field-meta.ts —— 字段元数据协议 + "二维查一维"的编辑器推导 + 联动重置
import type { ConditionNode, Operator } from './condition-tree'

export type ValueEditorType =
  | 'none'               // 无值操作符（isEmpty / isNotEmpty）→ 渲染 null
  | 'input'              // 单行文本（订单号、模糊匹配词）
  | 'number'             // 数字输入
  | 'number-range'       // 数字区间（between 两个输入框）
  | 'select'             // 单选下拉（枚举）
  | 'multi-select'       // 多选下拉（in / notIn）
  | 'date'               // 单日期（原生 <input type="date">）
  | 'date-range'         // 日期区间（between 两个日期框）
  | 'switch'             // 布尔开关
  | 'remote-select'      // 远程单选（外键引用，§3.4）
  | 'remote-multi-select'// 远程多选

export type FieldValueType = 'number' | 'string' | 'enum' | 'boolean' | 'date'

export interface FieldOption { label: string; value: string }

export interface RemoteSource {
  url: string            // 返回 { list: Record<string, unknown>[] } 的搜索接口
  labelKey?: string      // 用作 label 的响应键，默认 name
  valueKey?: string      // 用作 value 的响应键，默认 id
}

export interface FieldMeta {
  name: string           // 协议里的 field 值，必须与数据对象的键一致（json-logic {var} 靠它取值）
  label: string          // UI 展示名
  valueType: FieldValueType
  operators: Operator[]  // 该字段允许的操作符（操作符下拉的唯一来源）
  valueEditor: ValueEditorType | ((operator: Operator) => ValueEditorType)
  options?: FieldOption[]          // 枚举字段：本地选项
  remote?: RemoteSource           // 外键字段：远程选项（懒加载，§3.4）
  defaultValue?: unknown          // 新建行时的初始值建议（可以为空，交给校验兜底）
  deprecated?: boolean            // 已下线：新规则不可选，存量规则渲染时标红（坑 2）
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  '=': '等于', '!=': '不等于',
  '>': '大于', '>=': '大于等于', '<': '小于', '<=': '小于等于',
  in: '属于（任一）', notIn: '不属于',
  contains: '包含', notContains: '不包含',
  between: '介于', notBetween: '不介于',
  isEmpty: '为空', isNotEmpty: '不为空',
}

const VALUELESS_OPERATORS: Operator[] = ['isEmpty', 'isNotEmpty']
export function isValuelessOperator(op: Operator): boolean {
  return VALUELESS_OPERATORS.includes(op)
}

/** 元数据 + 操作符 → 值编辑器类型（二维查一维，全编辑器只有一个真相源） */
export function resolveValueEditor(field: FieldMeta, operator: Operator): ValueEditorType {
  if (isValuelessOperator(operator)) return 'none'
  if (typeof field.valueEditor === 'function') return field.valueEditor(operator)
  if (operator === 'between' || operator === 'notBetween') {
    // between 恒为二元值：日期字段给日期区间，其余给数字区间
    return field.valueType === 'date' ? 'date-range' : 'number-range'
  }
  return field.valueEditor
}

/** 每种编辑器的"干净默认值"——操作符/字段切换后，旧 value 必须回到这里 */
export function defaultValueFor(field: FieldMeta, editor: ValueEditorType): unknown {
  switch (editor) {
    case 'none': return null
    case 'multi-select': case 'remote-multi-select': return []
    case 'number-range': case 'date-range': return [null, null]
    case 'switch': return false
    case 'number': return null // 宁可空着交给校验报错，也不替用户编造一个业务值
    default: return field.defaultValue ?? ''
  }
}

/** 操作符变更：一次原子完成"换操作符 + 按新编辑器重置值"（坑 1 正解） */
export function applyOperatorChange(
  node: ConditionNode,
  nextOperator: Operator,
  field: FieldMeta | undefined,
): ConditionNode {
  if (!field) return { ...node, operator: nextOperator }
  const editor = resolveValueEditor(field, nextOperator)
  return { ...node, operator: nextOperator, value: defaultValueFor(field, editor) }
}

/** 字段变更：操作符退回该字段第一个合法操作符，值一并重置 */
export function applyFieldChange(
  node: ConditionNode,
  nextField: string,
  fieldMap: Map<string, FieldMeta>,
): ConditionNode {
  const field = fieldMap.get(nextField)
  if (!field) return { ...node, field: nextField } // 悬空字段：只改字段名，渲染层标红（坑 2）
  const operator = field.operators[0]
  const editor = resolveValueEditor(field, operator)
  return { ...node, field: nextField, operator, value: defaultValueFor(field, editor) }
}
```

**代码——五类典型字段的元数据示例**（数字 / 字符串枚举 / 日期 / 布尔 / 外键引用，覆盖中后台 90% 的字段形态）：

```ts
// fields-order.ts —— 订单域字段元数据表：换表即换产品
import type { FieldMeta } from './field-meta'

export const ORDER_FIELDS: FieldMeta[] = [
  {
    name: 'amount', label: '订单金额', valueType: 'number',
    operators: ['=', '!=', '>', '>=', '<', '<=', 'between', 'notBetween'],
    valueEditor: 'number',
  },
  {
    name: 'city', label: '城市', valueType: 'enum',
    operators: ['=', '!=', 'in', 'notIn'],        // 枚举字段没有 > 这类比较
    // 函数形态：= / != 单选，in / notIn 多选——同一字段按操作符切编辑器
    valueEditor: op => (op === 'in' || op === 'notIn' ? 'multi-select' : 'select'),
    options: [
      { label: '北京', value: 'BJ' }, { label: '上海', value: 'SH' },
      { label: '广州', value: 'GZ' }, { label: '深圳', value: 'SZ' },
    ],
  },
  {
    name: 'created_at', label: '下单时间', valueType: 'date',
    operators: ['>=', '<=', '>', '<', 'between', 'notBetween'],
    valueEditor: op => (op === 'between' || op === 'notBetween' ? 'date-range' : 'date'),
  },
  {
    name: 'is_vip', label: 'VIP 客户', valueType: 'boolean',
    operators: ['='],                              // 布尔只有等于（= false 即"非 VIP"）
    valueEditor: 'switch', defaultValue: false,
  },
  {
    name: 'owner_id', label: '所属销售', valueType: 'enum',
    operators: ['=', '!=', 'in', 'notIn'],
    // 外键引用：选项不在本地，搜索接口懒加载（§3.4 的 useRemoteOptions）
    valueEditor: op => (op === 'in' || op === 'notIn' ? 'remote-multi-select' : 'remote-select'),
    remote: { url: '/api/users/search', labelKey: 'name', valueKey: 'id' },
  },
  {
    name: 'order_no', label: '订单号', valueType: 'string',
    operators: ['=', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
    valueEditor: 'input',
  },
]
```

注意 `name` 的命名纪律：`created_at`、`owner_id` 用蛇形，与数据库行、后端事件流的键保持一致——§3.5 转成 json-logic 后 `{ "var": "created_at" }` 靠这个键取数，前端一份、样例数据一份、后端一份，三处必须同键，否则试运行面板测得好好的、上线取不到值。

**常见坑（元数据层）**：
- 症状：`isVip` 字段配了 `>` 操作符，运行期转换层抛"未支持的操作符"，或后端执行报类型错误。
- 根因：操作符数组是"协议自由度"声明，写错的组合在 TS 层无法拦截（`operators: Operator[]` 是宽类型）。
- 修法：用类型收紧——按 `valueType` 定义字面量联合（`type NumericOperator = '>' | '>=' | '<' | '<=' | 'between' | ...`，让 `operators: NumericOperator[]`），把"数字字段配 contains"这类错误赶到编译期；同时 §3.6 校验层做运行时兜底双保险。

> 以下 3.3.1～3.3.3 为字段元数据驱动的进阶补充小节（编号续接本文件 3.3 一节）：字段表从哪来（三种来源模式）、字段类型系统怎么扩展（自定义类型注册）、元数据缓存怎么保鲜（版本与失效）。

##### 3.3.1 字段来源的三种模式——前端静态、后端元数据、OpenAPI 推导

**是什么**：§3.3 主体假设字段表（`ORDER_FIELDS`）是前端写死的一个常量。真实系统里这张表有三种来历：**前端静态声明**（写死在代码里）、**后端元数据接口**（运行时下发）、**OpenAPI 推导**（从接口文档自动生成底稿）。三种模式不是互斥选项，多数生产系统是"一主一辅"的混合。

**为什么需要**：字段表的来源决定了它**跟随业务变化的节奏**——字段会新增（业务上新的维度）、会下线（坑 2 的悬空问题源头）、会改口径（label、单位、可选操作符）。前端静态表每次变更要发版；后端元数据随服务端发版即时生效但要求后端提供接口；OpenAPI 推导免维护但缺业务语义。选错模式的代价在半年后显现：要么前端每个迭代都改字段表改到吐，要么接口部门被频繁的元数据需求拖垮。

**三种模式对照**：

| 维度 | 模式一：前端静态 | 模式二：后端元数据接口 | 模式三：OpenAPI 推导 |
|---|---|---|---|
| 时效性 | 跟前端发版（天/周） | 跟后端发版，即时 | 跟接口文档，构建期或运行时 |
| 权威性 | 前端自己说了算（可能与后端口径漂移） | **后端是唯一事实源** | 接口结构是事实源，业务语义缺失 |
| 前端工作量 | 零（写一遍） | 一个 loading/error/重试的 hook | 一个推导脚本 + 人工 curated 层 |
| 后端工作量 | 零 | 一个元数据接口 | 零（复用 openapi.json） |
| 权限裁剪 | 前端过滤（不可信） | **服务端按租户/角色裁剪**（正确姿势，模型见场景 8） | 无法裁剪 |
| 适用 | Demo、字段极稳定的内部工具 | 多租户 SaaS、字段随业务频繁变 | 接口已有 OpenAPI、字段量大、语义层稳定 |

**模式一（前端静态）**：§3.3 的 `fields-order.ts` 原样即用，不再展开。唯一要补的纪律：文件头注释写清"字段 name 与后端事件流的键对齐"（§3.3 已强调的三处同键），并在 code review 里把"改 name"当破坏性变更对待。

**模式二（后端元数据）——契约即本章协议**。关键是后端下发的就是 `FieldMeta[]`（前后端共享同一份 TS 类型，monorepo 里放共享包；跨仓则用 OpenAPI 生成）：

```ts
// use-field-schema.ts —— 模式二：加载后端字段元数据
import { useCallback, useEffect, useState } from 'react'
import type { FieldMeta } from './field-meta'

interface FieldMetaResponse {
  version: string       // 元数据版本号——3.3.3 失效机制的钩子，必带
  fields: FieldMeta[]   // 服务端已按当前租户/角色裁剪过（权限模型见场景 8）
}

type Status =
  | { state: 'loading' }
  | { state: 'ready'; fields: FieldMeta[]; version: string }
  | { state: 'error'; error: Error; retry: () => void }

export function useFieldSchema(domain: string): Status {
  const [status, setStatus] = useState<Status>({ state: 'loading' })

  const load = useCallback(() => {
    setStatus({ state: 'loading' })
    fetch(`/api/meta/fields?domain=${encodeURIComponent(domain)}`)
      .then(async res => {
        if (!res.ok) throw new Error(`元数据接口错误 HTTP ${res.status}`)
        return res.json() as Promise<FieldMetaResponse>
      })
      .then(json => setStatus({ state: 'ready', fields: json.fields, version: json.version }))
      .catch((error: Error) => setStatus({ state: 'error', error, retry: load }))
  }, [domain])

  useEffect(() => { load() }, [load])
  return status
}
// 编辑器接入：loading 时渲染骨架行（别渲染空编辑器——空字段下拉会让用户误以为"没有可筛字段"）；
// error 时整块降级并给 retry（元数据不可用 = 编辑器不可用，这是硬依赖，不做静默兜底）
// 网络层缓存（去重/失效）不在这个 hook 里做——见 3.3.3 的 store 层
```

**模式三（OpenAPI 推导）——底稿自动生成，语义人工覆盖**。推导分构建期与运行时两档：构建期用 `openapi-typescript` 生成类型 + 脚本产出 `FieldMeta` 底稿文件（可 review、可改）；运行时直接拉 `openapi.json` 推导（永远最新，但每次推导有成本且缺人工校对）。**推荐构建期**——推导产物进 git，字段变更在 PR 里可见：

```ts
// scripts/gen-field-meta.ts —— 构建期从 OpenAPI 推导字段底稿（node 脚本，pnpm gen:fields）
import { writeFileSync } from 'node:fs'
import type { FieldMeta } from '../src/field-meta'

interface OpenApiProperty {
  type?: string
  format?: string
  enum?: unknown[]
  description?: string
  'x-filterable'?: boolean   // 后端在 OpenAPI 扩展字段里显式标注：开放给查询构建器
  'x-label'?: string         // 可选：业务名标注
}
interface OpenApiSchema { properties?: Record<string, OpenApiProperty> }
interface OpenApiDoc { components?: { schemas?: Record<string, OpenApiSchema> } }

/** JSON Schema 类型 → FieldMeta.valueType 的映射表——推导的全部"智慧"就这一张表 */
function mapValueType(prop: OpenApiProperty): FieldMeta['valueType'] | null {
  if (prop.enum) return 'enum'
  if (prop.format === 'date' || prop.format === 'date-time') return 'date'
  switch (prop.type) {
    case 'integer': case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'string': return 'string'
    default: return null // array/object 等复合类型：本章协议不直接支持，进不了筛选
  }
}

export async function generate(domain: string, entity: string, outPath: string) {
  const doc = (await fetch('https://api.example.com/openapi.json').then(r => r.json())) as OpenApiDoc
  const schema = doc.components?.schemas?.[entity]
  if (!schema?.properties) throw new Error(`OpenAPI 里找不到实体 ${entity}`)

  const fields: FieldMeta[] = []
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (prop['x-filterable'] !== true) continue        // 只收显式标注的字段——见本节坑
    const valueType = mapValueType(prop)
    if (!valueType) continue
    fields.push({
      name,
      label: prop['x-label'] ?? prop.description ?? name,
      valueType,
      operators: defaultOperatorsFor(valueType),       // 按 valueType 给默认操作符集（查 3.3.2 的注册表）
      valueEditor: defaultEditorFor(valueType),
    })
  }
  writeFileSync(outPath, `// 由 scripts/gen-field-meta.ts 生成，请勿手改；语义覆盖见 fields-override.ts\nexport const ${domain}_FIELDS: FieldMeta[] = ${JSON.stringify(fields, null, 2)}\n`)
}
```

**混合策略（生产最常见）**：自动产物只做底稿，业务语义用覆盖层表达，合并时机在运行时：

```ts
// merge-fields.ts —— 混合模式：自动底稿 + 人工覆盖层
import type { FieldMeta } from './field-meta'

/** 覆盖层：只写要改的键——新增字段自动进，下线字段靠 deprecated 覆盖（不物理删，坑 2） */
const OVERRIDES: Partial<Record<string, Partial<FieldMeta>>> = {
  amount: { label: '订单金额（元）', valueEditor: 'number' },
  created_at: { label: '下单时间', operators: ['>=', '<=', 'between'] },
  legacy_channel: { deprecated: true }, // 已下线：覆盖层标 deprecated，底稿还在（存量规则可渲染）
}

export function mergeFields(base: FieldMeta[], overrides: Partial<Record<string, Partial<FieldMeta>>>): FieldMeta[] {
  return base.map(f => ({ ...f, ...(overrides[f.name] ?? {}) }))
}
```

混合的分工哲学：**底稿回答"有哪些字段、什么类型"（结构事实），覆盖层回答"叫什么、给什么操作符、还让不让选"（业务决策）**——结构事实自动跟随接口演进，业务决策集中在一处由前端团队掌控。

**选型与学习路径**：内部工具从模式一起步（§3.3 的示例即用）；要做多租户/字段权限时升模式二（唯一正解是服务端裁剪）；接口已有 OpenAPI 且字段量五十个以上时叠模式三（先省掉抄写工作）。三个模式都不改变 §3.3 的下游——`resolveValueEditor`、两个 apply 联动函数、§3.6 校验吃的都是 `FieldMeta[]`，来源切换对它们透明，这正是元数据分层的好处。

**坑（推导层）**：
- 症状：第一次跑 OpenAPI 推导，字段下拉冒出 200 个字段——`id`、`tenant_id`、`updated_at`、各种内部外键全在里头，用户找一个业务字段要滚三屏。
- 根因：接口 schema 描述的是**存储结构**，不是**筛选视图**——技术字段与业务字段在 schema 里一视同仁，推导器没有"哪些该暴露"的知识。
- 修法：白名单制——只有后端显式标注 `x-filterable: true` 的字段才进底稿（上面代码的 `if (prop['x-filterable'] !== true) continue`）。没有后端配合时，退化为前端的 curated 名单文件（同样有效，代价是名单要人工维护）。**推导器永远不要"全量倒"**，这是模式三能落地的第一原则。

##### 3.3.2 字段类型系统的可扩展性——自定义类型注册

**是什么**：`FieldValueType` 目前是五个字面量的封闭联合（`number | string | enum | boolean | date`）。业务一定会长出第六种类型——`duration`（时长，毫秒存储按秒展示）、`money`（金额，分存储带币种）、`version`（语义化版本比较）。本节把"类型的行为"从 if/else 散落处收进一张**类型注册表**：每种类型声明自己的默认操作符集、默认值、值矫正与展示函数。

**为什么需要**：不注册化，每加一种类型要改五处——`defaultValueFor` 的 switch、`resolveValueEditor` 的兜底、§3.5 转换层的 `coerceValue`、§3.6 校验的类型分支、只读预览的格式化。注册化之后**加类型 = 一个文件 + 一行注册**，与《进阶大纲》§1.2 组件注册表是同一个模式在数据侧的投影（渲染侧的对应物是 §3.4 的 `valueEditorRegistry`，两表分工见下）。

**关键机制——类型注册表（数据侧行为）**：

```ts
// value-types.ts —— 字段类型注册表：valueType → 行为
import type { Operator } from './condition-tree'

export interface ValueTypeMeta {
  /** 该类型字段的默认操作符集（FieldMeta.operators 缺省时的来源） */
  defaultOperators: readonly Operator[]
  /** 新建条件行的干净默认值（§3.3 defaultValueFor 的注册化版本） */
  defaultValue: () => unknown
  /** 值矫正：编辑期第一道（§3.5 coerceValue 是转换关口的第二道，两道不冗余） */
  coerce: (value: unknown) => unknown
  /** 只读展示（§3.7 试运行预览、审计日志里的人类可读格式） */
  toDisplay: (value: unknown) => string
}

const registry = new Map<string, ValueTypeMeta>()

export function defineValueType(name: string, meta: ValueTypeMeta): void {
  if (registry.has(name)) {
    throw new Error(`字段类型「${name}」已注册——重复注册通常是 HMR 或循环依赖，请检查导入路径`)
  }
  registry.set(name, meta)
}

export function getValueTypeMeta(name: string): ValueTypeMeta {
  const meta = registry.get(name)
  if (!meta) throw new Error(`未注册的字段类型「${name}」`)
  return meta
}

/* ---- 内置五类型：§3.3 散落逻辑的收编 ---- */
defineValueType('number', {
  defaultOperators: ['=', '!=', '>', '>=', '<', '<=', 'between', 'notBetween'],
  defaultValue: () => null,
  coerce: v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
  toDisplay: v => (v == null ? '—' : String(v)),
})
defineValueType('string', {
  defaultOperators: ['=', '!=', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  defaultValue: () => '',
  coerce: v => (v == null ? '' : String(v)),
  toDisplay: v => (v === '' ? '空' : String(v)),
})
defineValueType('boolean', {
  defaultOperators: ['='],
  defaultValue: () => false,
  coerce: v => v === true || v === 'true',
  toDisplay: v => (v === true ? '是' : '否'),
})
defineValueType('date', {
  defaultOperators: ['>=', '<=', '>', '<', 'between', 'notBetween'],
  defaultValue: () => null,
  coerce: v => v, // 日期编辑器产出即 ISO 字符串（§3.4），无需矫正
  toDisplay: v => (typeof v === 'string' ? v : '—'),
})
defineValueType('enum', {
  defaultOperators: ['=', '!=', 'in', 'notIn'],
  defaultValue: () => null,
  coerce: v => v,
  toDisplay: v => String(v ?? '—'),
})

/* ---- 业务侧：注册 duration 类型（毫秒存储、按秒展示）---- */
defineValueType('duration', {
  defaultOperators: ['>', '>=', '<', '<=', 'between', 'notBetween'],
  defaultValue: () => null,
  coerce: v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
  toDisplay: v => {
    if (v == null) return '—'
    const ms = Number(v)
    return Number.isFinite(ms) ? `${Math.round(ms / 1000)} 秒` : '—'
  },
})
```

**FieldMeta 的类型放宽**——封闭联合要允许业务扩展，同时保住内置五类型的自动补全。TS 的惯用技巧是"字面量联合 ∪ 任意字符串"：

```ts
/** 内置类型保留自动补全；(string & {}) 兜住任意自定义类型——鱼与熊掌的写法 */
export type FieldValueType =
  | 'number' | 'string' | 'enum' | 'boolean' | 'date'
  | (string & {})   // 交叉空对象字面量类型：不影响补全，但让联合对任意 string 开放
```

配套纪律：`applyFieldChange`（§3.3）新建行时，操作符缺省值改为 `getValueTypeMeta(field.valueType).defaultOperators[0]`——类型的行为注册一次，编辑器所有入口（新建、字段切换、模板回填）自动一致。

**与校验层（§3.6）的联动**：`validateCondition` 里"按类型校验值"的分支（`valueType === 'number' && typeof v !== 'number'` 这类）可以从注册表取矫正后的结果来判——`coerce(value)` 之后仍是 `NaN`/`null` 才报"类型不符"。这样"输入框漏转数字"这类脏值在编辑期就被 `coerce` 洗掉，校验只拦真正的类型错误（矫正与校验的完整分工在 §3.6，此处只挂注册表侧的钩子）。注册表自身的行为用单测锁死：

```ts
// value-types.test.ts —— 自定义类型的行为锁定：操作符集、矫正、展示
import { describe, expect, it } from 'vitest'
import { getValueTypeMeta } from './value-types'

describe('duration 类型', () => {
  const meta = getValueTypeMeta('duration')

  it('字符串数字被矫正为 number（编辑器漏转的兜底）', () => {
    expect(meta.coerce('1500')).toBe(1500)
    expect(meta.coerce('')).toBe('')
  })
  it('展示按秒换算，空值给占位符', () => {
    expect(meta.toDisplay(1500)).toBe('2 秒')
    expect(meta.toDisplay(null)).toBe('—')
  })
  it('默认操作符集不含枚举类操作符', () => {
    expect(meta.defaultOperators).not.toContain('in')
  })
})
```

**与 §3.4 注册表的分界**（两张表，别混）：`valueTypeRegistry`（本节）是**数据侧**——类型有什么操作符、默认值、怎么矫正、怎么展示；`valueEditorRegistry`（§3.4）是**渲染侧**——类型/编辑器形态用哪个 React 组件。连接点只有一处：`resolveValueEditor` 的最后一档兜底查本节的类型（如 `duration → 'number'` 编辑器），字段仍可用 `valueEditor` 声明覆盖成专用编辑器（"60 秒快捷选"这种）。类型先注册行为，再考虑要不要配专用组件——多数自定义类型配现有编辑器就够。

**选型与学习路径**：先收编内置五类型（把 §3.3 的 `defaultValueFor` 等 switch 迁进注册表，行为零变化、可单测验证）；等第一个真实自定义类型出现再写 `defineValueType`——不要为了"扩展性"预留半成品抽象，注册表模式的成本足够低，晚接不亏。

**坑（注册表层）**：
- 症状：Vite 开发期保存任意文件，控制台抛"字段类型「duration」已注册"，页面报错，必须整页刷新。
- 根因：模块级 `registry` 单例 + HMR——带 `defineValueType` 调用的模块热更新时重新执行，往同一个单例里二次注册。
- 修法：注册函数幂等化（同名且 meta 相等视为重复注册直接 return，只有"同名不同物"才抛错），或用工厂替代单例（`createValueTypeRegistry()` 返回实例，测试与 SSR 隔离也靠它——每个测试文件 fresh registry，避免用例间污染）。单例 + HMR/测试并行是前端模块级可变状态的经典雷区，《组件库实战大纲》的 ConfigProvider 章有同款讨论。

##### 3.3.3 元数据缓存与失效——版本号、TTL 与引用审计的分界

**是什么**：给 3.3.1 模式二（后端元数据）加一层**网络之上的缓存**：域内共享一份（多组件/多页面不重复请求）、带 TTL、支持版本号主动失效与跨标签页广播。目标是一句话：**元数据"常用常新"，且任何时刻编辑器用的字段表与服务端权威版本之间的偏差有界**。

**为什么需要**：字段表是编辑器的硬依赖（3.3.1 的 hook），而打开规则编辑页的路径很多——列表页、模板库、审批回跳、URL 直链。无缓存时每条路径都拉一次接口（同一秒内三个组件拉三次是常态）；无失效时用户开着页面一小时，服务端刚上线的字段他看不到、刚下线的字段他还在配——后者会直接生产坑 2 的悬空规则。**缓存与失效是同一问题的两半**：只缓存不失效制造过期，只失效不缓存浪费请求。

**与相邻问题的分界**（三件事常常被混为一谈）：本节管"**前端缓存的时效**"；坑 2（13-3-9-坑）管"**下线字段的存量处置**"（软删除、红牌行、审计迁移）——缓存再新也挡不住"规则里已引用的字段被删"，那是引用完整性问题；3.4.3 管"**远程 options 值候选的缓存**"（每字段 × 每关键词一份、高频变、体量大）——与本节"每域一份、低频变、体量小"是两种缓存形态。三者的失效策略、存储粒度、清理时机全部不同，不要设计成一套。

**最小可行实现——store 层（去重 + TTL + 版本失效 + 广播）**：

```ts
// field-meta-store.ts —— 元数据缓存层：域级缓存、in-flight 去重、TTL、版本比对
import type { FieldMeta } from './field-meta'

interface CacheEntry {
  fields: FieldMeta[]
  version: string
  fetchedAt: number
}
interface MetaResponse { version: string; fields: FieldMeta[] }

const CACHE = new Map<string, CacheEntry>()                 // domain → entry
const INFLIGHT = new Map<string, Promise<CacheEntry>>()     // 同域并发请求共享同一个 Promise
const TTL_MS = 5 * 60 * 1000                                // 兜底 TTL：5 分钟内直接用缓存
const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('field-meta')                      // 跨标签页失效广播
  : null

export async function loadFieldMeta(domain: string, opts?: { force?: boolean }): Promise<CacheEntry> {
  const cached = CACHE.get(domain)
  if (cached && !opts?.force && Date.now() - cached.fetchedAt < TTL_MS) {
    // SWR 变体：新鲜缓存直接返回；临期的由调用方决定是否 force 后台刷新（见下方 hook）
    return cached
  }
  const pending = INFLIGHT.get(domain)
  if (pending) return pending                               // 去重：同域并发只发一条请求

  const request = (async (): Promise<CacheEntry> => {
    const res = await fetch(`/api/meta/fields?domain=${encodeURIComponent(domain)}`)
    if (!res.ok) throw new Error(`元数据接口错误 HTTP ${res.status}`)
    const json = (await res.json()) as MetaResponse
    const entry: CacheEntry = { fields: json.fields, version: json.version, fetchedAt: Date.now() }
    CACHE.set(domain, entry)
    return entry
  })().finally(() => { INFLIGHT.delete(domain) })
  INFLIGHT.set(domain, request)
  return request
}

/** 版本主动失效：服务端发版后，任意一个标签页调用，全站（含其他标签页）下次读取必走网络 */
export function invalidateFieldMeta(domain?: string): void {
  if (domain) CACHE.delete(domain)
  else CACHE.clear()
  channel?.postMessage({ type: 'invalidate', domain: domain ?? null })
}

channel?.addEventListener('message', msg => {
  if ((msg.data as { type?: string })?.type === 'invalidate') {
    const d = (msg.data as { domain: string | null }).domain
    if (d) CACHE.delete(d)
    else CACHE.clear()
  }
})
```

**React 侧的 SWR 用法——先吐缓存、后台保鲜**。3.3.1 的 `useFieldSchema` 每次挂载都 loading，接上缓存层后升级为两段式：有缓存立即 `ready`（编辑器零白屏），后台静默比对版本，变了才更新 state（用户无感换表）：

```ts
// use-field-meta-swr.ts —— 缓存层之上的 hook：stale 立即可用 + 后台 revalidate
import { useEffect, useState } from 'react'
import type { FieldMeta } from './field-meta'
import { loadFieldMeta } from './field-meta-store'

type MetaStatus =
  | { state: 'loading' }                                        // 首次（无缓存）
  | { state: 'ready'; fields: FieldMeta[]; version: string }     // 有数据（可能是 stale）
  | { state: 'error'; error: Error; retry: () => void }

export function useFieldMeta(domain: string): MetaStatus {
  const [status, setStatus] = useState<MetaStatus>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    const load = (force: boolean) => {
      loadFieldMeta(domain, { force })
        .then(entry => {
          if (!alive) return
          // 关键：同版本不 setState——stale 但版本一致时，避免无意义的全树重渲染
          setStatus(prev =>
            prev.state === 'ready' && prev.version === entry.version
              ? prev
              : { state: 'ready', fields: entry.fields, version: entry.version },
          )
        })
        .catch((error: Error) => { if (alive) setStatus({ state: 'error', error, retry: () => load(true) }) })
    }
    load(false)          // 第一跳：命中新鲜缓存即返回；TTL 过期则走网络
    const timer = setInterval(() => load(true), 60_000) // 后台保鲜：每分钟带 force 比对（304 则零成本）
    return () => { alive = false; clearInterval(timer) }
  }, [domain])

  return status
}
// 版本一致不 setState 是这条链路最重要的一行：字段表引用一变，QueryBuilder 的
// fieldMap useMemo 就重算，全树重渲染——"每分钟拉一次"绝不能变成"每分钟闪一次"
```

**失效的三条通道，各管一种时滞**：① **TTL（被动兜底）**——最长 5 分钟偏差，覆盖"用户开着页面不动"的场景；② **版本号（主动精确）**——启动时或路由切换时带 `If-None-Match`（或响应里的 `version` 比对），版本没变 304 秒回、变了拉新，覆盖"跨天挂着的老标签页"；③ **广播（多标签同步）**——一个标签页发现新版本并刷新缓存后广播，其他标签页立即失效，覆盖"运营在 A 标签页改了字段、用户在 B 标签页配规则"。三条都便宜，全上。其中②的请求侧细节（有 ETag 的版本比对fetch）：

```ts
// 带 ETag 的条件请求：304 时 body 为空，几乎零成本——"每分钟 force 拉一次"敢这么写全靠它
const res = await fetch(url, {
  headers: cached ? { 'If-None-Match': cached.etag } : {},   // 上次的 ETag 随请求带回
})
if (res.status === 304) {
  return { ...cached!, fetchedAt: Date.now() }               // 没变：只续期，不重建对象（引用稳定）
}
const etag = res.headers.get('ETag')
const json = (await res.json()) as MetaResponse
// 存 entry 时带上 etag 字段，供下一次条件请求使用
```

服务端配合只需一件事：元数据接口返回 `ETag` 或 body 里的 `version` 字段，且 `304` 语义正确——这是接口契约里一行字的事，价值极高。

**常见坑（缓存层）**：
- 症状：测试环境"新字段看不到"投诉，开发排查半小时，最后发现是某个同事"优化"时把缓存写进了 `sessionStorage`——用户浏览器里的缓存跨了他午餐时间 + 一次服务端发版，且没有任何失效通道能碰到它。
- 根因：持久化存储（sessionStorage/localStorage）被当作内存缓存的等价物，但**进程内缓存随刷新归零、持久缓存不归零**——TTL 之外，它还需要版本键与存储清理，否则"偏差有界"被打破。
- 修法：默认只用模块级内存缓存（刷新即重新拉取，偏差上界 = TTL）；确要持久化（弱网优化），缓存键必须含 `version`（`qb-meta:${domain}:${version}`），并在 `storage` 事件里监听其他标签页的版本变化；永远不要持久化**没有版本标识**的元数据。

