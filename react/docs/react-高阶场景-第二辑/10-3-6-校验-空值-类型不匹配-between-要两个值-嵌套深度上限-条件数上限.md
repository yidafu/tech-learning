---
title: "3.6 校验：空值、类型不匹配（between 要两个值）、嵌套深度上限、条件数上限"
---

> 本文是《3. 动态查询构建器 / 规则引擎 UI ★全量展开 · 核心技术》按小节拆分后的续篇，上一部分见 [09-3-5-协议转换层-前后端契约关键-条件树-json-logic-Mongo-query.md](09-3-5-协议转换层-前后端契约关键-条件树-json-logic-Mongo-query.md)。

#### 3.6 校验：空值、类型不匹配（between 要两个值）、嵌套深度上限、条件数上限

**是什么**：一个纯函数 `validateTree`，输入条件树 + 字段元数据表 + 上限配置，输出错误数组（每条错误带 `nodeId` 定位与人类可读路径），UI 层把错误按 nodeId 精确投到出错的行上标红。

**为什么需要**：编辑器是给非程序员用的，"配出不合法规则"不是异常而是日常——空值、between 只填一端、嵌套八层、条件塞两百条。没有前置校验，这些问题会在两个更贵的环节爆发：§3.5 转换层抛异常（用户已点保存，体验断裂），或后端执行时静默查错数据（最坏：告警规则配错，该告的没告）。校验是**保存按钮的门卫**，也是试运行（§3.7）的前置条件——对一棵非法树求值没有意义。

**怎么做（机制分步）**：

1. 逐条件校验：字段存在（含悬空字段检测，坑 2）→ 操作符在该字段白名单内 → 按操作符家族校验值（无值家族跳过；between 要二元数组且下限 ≤ 上限；in 要非空数组且（枚举字段）取值都在 options 内；通用家族查空值与类型匹配）。
2. 逐组校验：空组报错；条件总数与嵌套深度对上限。
3. 错误对象带 `nodeId`（机器定位）+ `path`（人读路径，如"根组 › 2 › 内层组 › 1"）+ `message`（中文人话）。
4. UI 侧：根组件集中算一次（§3.2 已接入），行内红框 + 错误文案，组深度超标时组头部报错。

**代码——完整校验实现**：

```ts
// validator.ts —— 校验：保存前的门卫，错误定位到节点
import type { ConditionNode, ConditionTree, ConditionTreeNode } from './condition-tree'
import { countConditions, treeDepth } from './tree-ops'
import { type FieldMeta, isValuelessOperator } from './field-meta'

export interface TreeValidationError {
  nodeId: string   // 定位：QueryRow 据此标红（§3.2 的 errors 索引）
  path: string     // 人读路径："根组 › 2 › 内层组 › 1"
  message: string
}

export interface ValidationOptions {
  maxDepth: number       // 嵌套深度上限（根组记 1）
  maxConditions: number  // 条件总数上限
}

export function validateTree(
  root: ConditionTree,
  fieldMap: Map<string, FieldMeta>,
  options: ValidationOptions,
): TreeValidationError[] {
  const errors: TreeValidationError[] = []

  const total = countConditions(root)
  if (total > options.maxConditions) {
    errors.push({
      nodeId: root.id,
      path: '根组',
      message: `条件总数 ${total} 超过上限 ${options.maxConditions}，请拆分为多条规则`,
    })
  }
  const depth = treeDepth(root)
  if (depth > options.maxDepth) {
    errors.push({
      nodeId: root.id,
      path: '根组',
      message: `嵌套深度 ${depth} 超过上限 ${options.maxDepth}，深层逻辑建议拆分规则或改用表达式`,
    })
  }

  const walk = (node: ConditionTreeNode, path: string): void => {
    if (node.kind === 'group') {
      if (node.children.length === 0) {
        errors.push({ nodeId: node.id, path, message: '条件组不能为空，请添加条件或删除该组' })
      }
      node.children.forEach((child, i) => walk(child, `${path} › ${i + 1}`))
      return
    }
    validateCondition(node, path)
  }

  const validateCondition = (c: ConditionNode, path: string): void => {
    const field = fieldMap.get(c.field)

    if (!field) {
      errors.push({ nodeId: c.id, path, message: `未知字段「${c.field}」，可能已被下线，请重新选择字段` })
      return // 字段都悬空了，后续校验没有意义
    }
    if (field.deprecated) {
      errors.push({ nodeId: c.id, path, message: `字段「${field.label}」已下线，规则将失效，请替换字段` })
    }
    if (!field.operators.includes(c.operator)) {
      errors.push({ nodeId: c.id, path, message: `操作符「${c.operator}」不适用于字段「${field.label}」` })
      return
    }
    if (isValuelessOperator(c.operator)) return // 无值操作符到这里就是合法的

    const v = c.value
    switch (c.operator) {
      case 'between': case 'notBetween': {
        if (!Array.isArray(v) || v.length !== 2 || v[0] == null || v[1] == null) {
          errors.push({ nodeId: c.id, path, message: '区间条件需要完整的两个值（最小值与最大值）' })
          return
        }
        const [min, max] = v as [number | string, number | string]
        if (typeof min === 'number' && typeof max === 'number' && min > max) {
          errors.push({ nodeId: c.id, path, message: `区间下限 ${min} 不能大于上限 ${max}` })
        }
        if (typeof min === 'string' && typeof max === 'string' && min > max) {
          errors.push({ nodeId: c.id, path, message: `日期区间起止颠倒：${min} 晚于 ${max}` }) // ISO 字典序即时间序
        }
        return
      }
      case 'in': case 'notIn': {
        if (!Array.isArray(v) || v.length === 0) {
          errors.push({ nodeId: c.id, path, message: '请至少选择一个候选项' })
          return
        }
        if (field.options) { // 枚举字段：取值必须都在合法选项内（防脏数据回填）
          const legal = new Set(field.options.map(o => o.value))
          v.forEach(item => {
            if (!legal.has(String(item))) {
              errors.push({ nodeId: c.id, path, message: `选项「${String(item)}」不在字段「${field.label}」的合法取值内` })
            }
          })
        }
        return
      }
      default: {
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
          errors.push({ nodeId: c.id, path, message: '条件值不能为空' })
          return
        }
        if (field.valueType === 'number' && typeof v !== 'number') {
          errors.push({ nodeId: c.id, path, message: `字段「${field.label}」需要数字类型的值` })
        }
      }
    }
  }

  walk(root, '根组')
  return errors
}
```

错误定位到行的 UI 已在 §3.2 落位：`QueryBuilder` 里 `useMemo` 集中计算 → `Map<nodeId, error>` 进 Context → `QueryRow` 查 `errors.get(node.id)` 加红框与文案。保存按钮侧再取一次汇总：

```tsx
// SaveBar.tsx —— 保存门卫：有错禁用保存，并把错误列表摊给用户
import { validateTree, type ValidationOptions } from './validator'

export function SaveBar({ tree, fieldMap, onSave }: {
  tree: ConditionTree
  fieldMap: Map<string, FieldMeta>
  onSave: () => void
}) {
  const errors = validateTree(tree, fieldMap, { maxDepth: 5, maxConditions: 30 } satisfies ValidationOptions)
  return (
    <div className="qb-savebar">
      <button type="button" disabled={errors.length > 0} onClick={onSave}>
        保存规则{errors.length > 0 ? `（${errors.length} 处待修正）` : ''}
      </button>
      {errors.length > 0 && (
        <ul>
          {errors.map(e => <li key={e.nodeId + e.message}>【{e.path}】{e.message}</li>)}
        </ul>
      )}
    </div>
  )
}
```

**常见坑（校验层）**：
- 症状：校验全部通过，保存的规则后端执行报 `Invalid rule: {"var": "amount"}`。
- 根因：前端校验的是"UI 协议合法性"，后端校验的是"json-logic 可执行性"，两套标准没对齐——比如某自定义操作符（`startsWith`）前端认、后端规则引擎版本没有。
- 修法：保存链路改成"先 toJsonLogic → 后端 dry-run 校验 → 再落库"，前端校验只做体验层拦截（即时、免网络），后端校验是权威关卡（试运行面板同样走这条 dry-run，见 §3.7）；两边共享同一份操作符能力矩阵测试。

> 以下 3.6.1～3.6.3 为校验层的进阶补充小节（编号续接本文件 3.6 一节）：校验规则的三层来源与合并顺序、异步校验（命中数预估）、大树的增量校验与短路。

##### 3.6.1 校验规则的三层来源——协议级、字段级、业务级与合并顺序

**是什么**：把 `validateTree` 里混在一起的各种检查按**知识的归属**拆成三层：**协议级**（结构合法性——与任何业务无关的"语法"：kind 判别、between 必须二元数组、in 必须数组、组不能为空、深度/条件数上限）；**字段级**（元数据派生——§3.6 主体的"操作符在白名单内、选项在 options 内、数字字段配数字值"全部属于这层，规则来自 `FieldMeta`，换一张字段表校验自动跟着变）；**业务级**（特定业务形态对整棵树的语义约束——"告警规则必须包含 severity 条件""审批流分支的多棵树必须互斥且完备""营销人群的日期区间不得跨年"）。三层各是纯函数，`validateTree` 变成它们的组合。

**为什么难**：主体实现把前两层揉在一个 `walk` 里（协议级的空组检查与字段级的操作符检查交错出现），业务级则根本没有位置——真实项目里它们的下场是散落在业务组件里：`if (scene === 'approval') { if (!hasCondition(tree, 'severity')) ... }` 写在 SaveBar、写在页面 onSubmit、写在某行的 useEffect 里。散落的代价：换业务形态（告警改审批）要改五个文件；同一约束两处实现口径漂移；测试只能靠点页面。**校验知识的分层与元数据驱动（§3.3）是同一个思想：知识从组件代码挪进数据/声明，组件保持通用**。

**合并顺序与短路规则**（为什么是"协议 → 字段 → 业务"这个序）：

1. **协议级先跑、可短路**：结构非法（空组、between 不是二元数组）时，字段级与业务级对这棵树的判断没有意义——协议级产出错误后，同节点不再跑后两层（`validateCondition` 主体里"字段悬空就 return"就是这个规则的单点版）。
2. **字段级次之**：拿到"每个条件语法正确、取值合法"的树，才有资格谈语义。
3. **业务级最后、输入是整棵树**：前两层是逐条件的（局部知识），业务级是看整棵树的（全局语义）——"必须包含 severity"无法在单条件视角判断。
4. **错误合并去重**：三层可能对同一节点各报一条（字段级"值为空" + 业务级"该字段必填"），按 `nodeId + message` 去重；展示时同节点错误聚合成一条 + "还有 N 处"。

**最小可行实现**：

```ts
// layered-validator.ts —— 三层校验：各是纯函数，validateTree 是它们的组合
import type { ConditionTree } from './condition-tree'
import { validateTree as validateProtocolAndField, type TreeValidationError, type ValidationOptions } from './validator' // §3.6 主体的实现 = 协议级 + 字段级
import type { FieldMeta } from './field-meta'

/** 业务级规则的声明形状：输入整棵树 + 字段表，输出错误（与协议级同一错误类型，UI 无感） */
export interface BusinessRule {
  id: string                     // 'alert-must-have-severity'
  message: string                // 人话，出错时展示
  check: (tree: ConditionTree, fieldMap: Map<string, FieldMeta>) => boolean  // true = 通过
}

/** 业务规则注册表：按业务形态（scene）分组，页面挂载时选组注入 */
const BUSINESS_RULES = new Map<string, BusinessRule[]>()

export function registerBusinessRules(scene: string, rules: BusinessRule[]): void {
  if (BUSINESS_RULES.has(scene)) throw new Error(`业务规则组「${scene}」已注册（HMR？见 3.3.2 同款）`)
  BUSINESS_RULES.set(scene, rules)
}

/** 组合入口：协议级+字段级（主体实现）→ 有错短路 → 业务级整树检查 */
export function validateTreeLayered(
  root: ConditionTree,
  fieldMap: Map<string, FieldMeta>,
  options: ValidationOptions,
  scene?: string,
): TreeValidationError[] {
  const baseErrors = validateProtocolAndField(root, fieldMap, options)
  if (baseErrors.length > 0) return baseErrors        // 短路：语法不通，语义免谈

  const rules = scene ? BUSINESS_RULES.get(scene) ?? [] : []
  const errors: TreeValidationError[] = []
  for (const rule of rules) {
    if (!rule.check(root, fieldMap)) {
      errors.push({ nodeId: root.id, path: '根组', message: rule.message })
    }
  }
  return errors
}
```

业务规则的声明侧（三个真实形态，注意它们读的都是整棵树）：

```ts
// business-rules-alert.ts —— 告警场景的业务规则组
import type { ConditionTreeNode } from './condition-tree'
import { registerBusinessRules } from './layered-validator'

/** 递归找"是否存在某字段的条件"——业务规则的通用小工具 */
function hasConditionOn(node: ConditionTreeNode, field: string): boolean {
  if (node.kind === 'condition') return node.field === field
  return node.children.some(c => hasConditionOn(c, field))
}

registerBusinessRules('alert', [
  {
    id: 'alert-must-have-severity',
    message: '告警规则必须包含「告警级别」条件，否则无法路由到值班组',
    check: tree => hasConditionOn(tree, 'severity'),
  },
  {
    id: 'alert-no-self-reference',
    message: '告警条件不能引用告警结果字段（alert_state），会形成自我触发',
    check: tree => !hasConditionOn(tree, 'alert_state'),
  },
])
```

**错误展示的层级暗示**：业务级错误挂在根组（`nodeId: root.id`），UI 上不应该标红某一行——它没有行。SaveBar 的错误列表把它与行级错误分开渲染（"规则级问题"一节 + "条件行问题"一节），否则用户会在树里找半天"到底哪行错了"。

**主体实现的检查归属映射**（重构时的对照表——主体 `validateTree` 的每个检查属于哪层，搬家不丢件）：

| 主体里的检查 | 归属层 | 搬家说明 |
|---|---|---|
| 空组报错、深度/条件数上限 | 协议级 | 纯结构判断，不碰 fieldMap |
| between 二元数组且下限 ≤ 上限、in 非空数组 | 协议级 | 形状与序的合法性——即使字段表为空也应能报 |
| 字段存在、deprecated、操作符白名单 | 字段级 | 依赖 fieldMap，主体已实现 |
| in 取值在 options 内、数字字段配数字 | 字段级 | 依赖 field.options / valueType |
| "告警必须含 severity"这类约束 | 业务级 | 主体没有位置——本节的注册表是它们的家 |

**错误去重的实现**（三层合并时的收尾一步）：

```ts
// dedup-errors.ts —— 同节点同类错误去重：三层各报一次时合并为一条
import type { TreeValidationError } from './validator'

export function dedupErrors(errors: TreeValidationError[]): TreeValidationError[] {
  const seen = new Set<string>()
  return errors.filter(e => {
    const key = `${e.nodeId}:${e.message}`        // 同节点同文案只留第一条
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
// 接线：validateTreeLayered 的返回值过一遍 dedupErrors 再交 UI；
// 同节点不同文案的多条错误不去重——那是"还有 N 处"折叠的事（坑 5 的 Map 覆盖是它的反例）
```

**与后端校验的分界**（呼应主体坑）：本节三层全部是**前端体验层**——即时报错、免网络；后端 dry-run 仍是权威关卡（主体坑的修法），业务级规则必须在后端再声明一份（通常就是同一句话的 SQL/代码版）。前端的业务规则注册表与后端规则清单要一起 code review——**两边的业务口径文档上是同一行字**。

**选型与学习路径**：先做协议级与字段级的显式分文件（把主体 `validateTree` 拆成 `validate-protocol.ts` 与 `validate-field.ts` 两个函数，行为零变化——这只是为业务级腾位置）；业务规则等第一个真实需求出现再上注册表（与 3.3.2 类型注册表同一纪律：不为预留抽象写半成品）。动态表单侧的对照物是《进阶大纲》§2 的 schema 校验与业务校验钩子分层，思想同构。

**坑（分层校验）**：
- 症状：产品要求"审批流场景的规则不能引用金额字段"，两周后在另一个页面发现同一约束没有生效——那边忘了抄这段 if。
- 原因：业务级校验写在组件里（`if (scene === 'approval')`），复用靠人肉复制；两个页面的 scene 字符串还打错了大小写，静默跳过。
- 修法：业务规则进注册表（本节实现），页面只传 `scene` 字符串；注册表 key 用字面量联合类型（`type Scene = 'alert' | 'approval' | 'cdp'`），打错编译期就红；再加一条单测：每个已注册 scene 至少有一条规则且 check 函数被调用过（防"注册了空组"）。

##### 3.6.2 异步校验——命中数预估的 loading、竞态与降级

**是什么**：一类校验的答案不在前端——"这条规则会命中多少数据"必须问后端（CDP 人群圈选要预估人数、告警规则要预估触发量、高级筛选要预估结果行数）。本节给它的完整工程闭环：**防抖 500ms → POST 条件树（json-logic）给预估接口 → 三件套（取消/序号/防抖，复用 §3.4）→ loading 与陈旧标注 → 失败降级为"预估不可用"（不阻塞保存）**。14 号文件练习册第 3 题（CDP 人群圈选）引用的"10 的异步校验思路"就是本节。

**为什么难**：三个同步校验没有的问题全部冒出来——**时延**（请求 300ms～2s，用户在这期间继续改树，回来的数字对应的是旧树）；**竞态**（连改三次，三个请求并发，最先发出的可能最后回来）；**成本**（后端预估通常是 count 查询或采样，大表上很贵，不能每键一次）；**失败语义**（预估接口挂了，保存要不要拦？）。同步校验的"调函数得结果"心智在这里全部失效，必须按"异步资源"管理。

**关键机制**：

1. **防抖放宽到 500ms**（比 §3.4 远程搜索的 300ms 更长）：预估是参考信息不是即时反馈，且后端更贵——用户停顿半秒再问。
2. **发送的是转换后的协议**：POST 的是 `toJsonLogic(tree)`（或 3.5.1 的 `convert` 产物）+ 业务上下文（数据集 id），不是编辑器协议——预估接口模拟的是**执行端**视角，与后端 dry-run（主体坑的修法）共用同一条链路。
3. **请求三件套照抄 §3.4**：AbortController 取消在途、序号守卫丢过期响应、防抖合并连击——这里的"过期"定义更严格：**响应回来时树已变，数字立即作废**。
4. **陈旧标注优先于精确**：请求期间树又变了（防抖窗内的新一轮还没发），显示的数字标"基于 2 秒前的规则"——用户需要知道这个数字对的是哪个版本的树。
5. **预估是参考，不是门卫**：除非业务显式定阈值（"命中超过 10 万条禁止保存"），预估失败/为空都不 disable 保存按钮——参考信息的可用性不能绑架主流程。

**最小可行实现**：

```ts
// use-hit-estimate.ts —— 命中数预估：防抖 + 取消 + 序号 + 陈旧标注 + 降级
import { useEffect, useRef, useState } from 'react'
import type { ConditionTree } from './condition-tree'
import type { FieldMeta } from './field-meta'
import { toJsonLogic } from './converters'
import { validateTree, type ValidationOptions } from './validator'

type EstimateState =
  | { phase: 'idle' }                                       // 树非法或刚挂载：不预估
  | { phase: 'loading'; stale?: number }                    // stale = 上一轮数字（树已变，等新数字）
  | { phase: 'done'; count: number; asOfTree: ConditionTree } // 数字 + 它对应的树
  | { phase: 'unavailable'; reason: string }                // 降级：不阻塞保存

interface EstimateResponse { count: number }

export function useHitEstimate(
  tree: ConditionTree,
  fieldMap: Map<string, FieldMeta>,
  validation: ValidationOptions,
  datasetId: string,
): EstimateState {
  const [state, setState] = useState<EstimateState>({ phase: 'idle' })
  const seqRef = useRef(0)
  const lastDoneRef = useRef<EstimateState>({ phase: 'idle' })   // 陈旧数字的暂存

  useEffect(() => {
    // 前置：同步校验不过就不问后端（§3.6 是试运行与预估的共同前置）
    if (validateTree(tree, fieldMap, validation).length > 0) {
      setState({ phase: 'idle' })
      return
    }
    const seq = ++seqRef.current
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      // loading 期间保留上一轮数字做"陈旧参考"（比纯 spinner 信息量大）
      setState(prev => (prev.phase === 'done' ? { phase: 'loading', stale: prev.count } : { phase: 'loading' }))
      try {
        const res = await fetch(`/api/rules/estimate?dataset=${encodeURIComponent(datasetId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule: toJsonLogic(tree, fieldMap) }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`预估接口错误 HTTP ${res.status}`)
        const json = (await res.json()) as EstimateResponse
        if (seqRef.current !== seq) return                  // 过期响应：树已变，丢弃
        const done: EstimateState = { phase: 'done', count: json.count, asOfTree: tree }
        lastDoneRef.current = done
        setState(done)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        if (seqRef.current !== seq) return
        setState({ phase: 'unavailable', reason: (e as Error).message })   // 降级：参考信息失效，不拦保存
      }
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [tree, fieldMap, validation, datasetId])

  return state
}
```

UI 侧的三态呈现（SaveBar 内一角）：

```tsx
// EstimateBadge.tsx —— 预估徽标：done / loading(带陈旧值) / unavailable 三态
function EstimateBadge({ state }: { state: EstimateState }) {
  if (state.phase === 'idle') return null
  if (state.phase === 'loading') {
    return state.stale !== undefined
      ? <span className="qb-estimate qb-estimate--stale">预估中…（上一版约 {state.stale.toLocaleString()} 条）</span>
      : <span className="qb-estimate">预估中…</span>
  }
  if (state.phase === 'unavailable') {
    return <span className="qb-estimate qb-estimate--off">命中数暂不可用（不影响保存）</span>
  }
  return <span className="qb-estimate">约命中 {state.count.toLocaleString()} 条数据</span>
}
```

**后端配合的两件事**（写进契约）：① 预估接口要**便宜**——大表用 `EXPLAIN` 的估算行数或采样（5% 样本 × 20），别真跑 count；返回体带 `accuracy: 'exact' | 'sampled'`，前端把"约"字如实反映精度。② 接口要能**拒绝**——规则代价太高（嵌套过深、contains 全表扫）时返回 422 + 原因，前端进 `unavailable` 态展示原因，这是保护数据库的正当动作。

**竞态守卫的单测**（异步校验最值得锁死的行为——三件套在这里是可测的纯时序问题）：

```ts
// use-hit-estimate.test.ts —— 序号守卫：慢的旧响应不得覆盖快的新响应
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createCondition, createGroup } from './tree-ops'
import { type FieldMeta } from './field-meta'
import { type ValidationOptions } from './validator'
import { useHitEstimate } from './use-hit-estimate'

describe('命中数预估竞态', () => {
  const fieldMap = new Map<string, FieldMeta>([
    ['amount', { name: 'amount', label: '金额', valueType: 'number', operators: ['>'], valueEditor: 'number' }],
  ])
  const opts: ValidationOptions = { maxDepth: 5, maxConditions: 30 }
  const buildTree = (threshold: number) =>
    createGroup([createCondition('amount', '>', threshold)])

  it('后发先至：旧请求晚回，UI 显示新请求数字', async () => {
    let resolveFirst!: (v: Response) => void
    globalThis.fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(res => { resolveFirst = res }))  // 第一轮：挂起不放
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ count: 42 }) } as Response))

    const v1 = buildTree(100)
    const v2 = buildTree(500)                        // 改阈值 → 触发第二轮
    const { rerender, result } = renderHook(
      ({ tree }) => useHitEstimate(tree, fieldMap, opts, 'ds_orders'),
      { initialProps: { tree: v1 } },
    )
    rerender({ tree: v2 })                            // 第二轮发起，fetch mock 42 先回
    await waitFor(() => expect(result.current.phase).toBe('done'))
    expect(result.current).toMatchObject({ phase: 'done', count: 42 })

    resolveFirst({ ok: true, json: async () => ({ count: 9_999 }) } as Response)  // 旧响应此刻才回
    await new Promise(r => setTimeout(r, 0))
    expect(result.current).toMatchObject({ phase: 'done', count: 42 })  // 序号守卫丢弃：不是 9_999
  })
})
```

（用例用 Testing Library 的 `renderHook` 驱动；断言的核心是最后一行——旧响应晚到之后 UI 数字纹丝不动。把"最后一轮失败"的姊妹用例（第一轮 resolve、第二轮 reject）也补上，断言进入 `unavailable` 而不是回落旧数字——本节坑的正主。）

**选型与学习路径**：异步校验的通用功力（防抖/取消/竞态三件套）在 §3.4 远程 options 已练过一次——本节是它在"校验"场景的变体，差异只有两点：请求体从关键词换成整棵树、失败语义从"搜索失败重试"变成"降级不阻塞"。做完本节建议回看《进阶大纲》§2 动态表单的异步校验（用户名查重），三个场景（搜索/查重/预估）对照，三件套就内化了。

**坑（异步校验）**：
- 症状：用户连续调整条件，命中数先显示 8 万、再显示 23 万，最后停在 23 万——但他最后只加了一个"城市=北京"的条件（收窄），直觉上人数应该变少。事后查日志发现 23 万对应的是倒数第二版树。
- 原因：最后一轮请求被网关限流 429，进了 catch；而序号守卫只丢弃"过期响应成功"的场景——**失败的这一轮成了最后一轮，之前的成功响应反而成了"最新"**。竞态守卫覆盖了乱序成功，没覆盖"最后一轮失败"。
- 修法：失败分支也要推进陈旧标注——`unavailable` 态显示"预估暂不可用"而不是沿用旧数字（上面实现里 `setState({ phase: 'unavailable' })` 已经替换掉 done 态，旧数字不再展示）；若业务必须保留参考数字，则明确标注"基于更早版本的规则"并把 `asOfTree` 与当前树比对后加"已过期"角标。**竞态守卫的完备判据：任何一轮请求的终态（成功/失败）之后，UI 显示的都必须能追溯到"哪一版树"**。

##### 3.6.3 大树的增量校验与短路——引用缓存、错误上限与协议先行

**是什么**：主体 `validateTree` 每次全树重算，30 条件的树 < 5ms（05 补充三预算 4）毫无压力；到几百条件的 CDP 圈选树，配合 3.2.3 的连坐链路，每次打字都全量重算就不划算了。本节三个优化，按收益排序：**按节点引用的增量缓存**（结构共享让"没改的子树引用不变"天然成立，缓存以节点引用为键自动失效）、**错误数上限熔断**（错误超 N 条停止收集，防攻击性大树把错误列表本身变成性能问题）、**协议级检查先行**（便宜的结构检查先跑完再跑贵的字段级——3.6.1 的分层顺便给了这个顺序）。

**为什么难**：增量校验的坑不在算法在**失效判断**——"这个节点的校验结果还能用吗"。直觉方案是按 `nodeId` 缓存（`Map<nodeId, result>`），但 nodeId 在 undo/redo、跨树复制粘贴、模板实例化（deepCloneWithNewIds 前后 id 不同但内容可能相同）里都不可靠：id 相同内容已变（undo 回旧树，id 没变但字段表变了）、id 不同内容全同（两棵树互抄）。**节点引用是唯一可靠的失效信号**——不可变更新（§3.2 tree-ops）保证了"引用没变 = 内容没变"，这是结构共享送给校验层的免费红利（3.2.3 的 memo 边界用的是同一个性质）。

**关键机制**：

1. **引用缓存**：`WeakMap<ConditionTreeNode, NodeErrors>`——节点被替换（引用变）自动 miss，节点被移除自动被 GC（WeakMap 不阻止回收，长会话不泄漏——呼应预算 9）。子树的校验结果同样缓存在子树根节点上，`countConditions`/`treeDepth` 这类聚合也可以顺手进同一张缓存（一次遍历多份收益）。
2. **失效的外部信号**：节点内容没变但**环境**变了的情况只有一种——`fieldMap` 变了（字段下线、options 变更）。缓存键里带上 fieldMap 的版本（3.3.3 的元数据 `version` 字段正好用上）：`WeakMap` 外再包一层 `Map<metaVersion, WeakMap>`，元数据版本一变整体换新。
3. **错误上限熔断**：`maxErrors = 50`——收集到 50 条错误后停止 walk，返回的错误列表末尾加一条"错误过多，已停止收集（修复前 N 条后会继续）"。防的是"用户粘贴了一棵 5000 条件的树，每条都空值"——5000 条错误消息的生成、传递、渲染都是浪费。
4. **协议先行**：3.6.1 的短路顺序在增量场景同样成立——本地缓存的字段级结果只在"该节点协议级通过"时才复用。

**最小可行实现**：

```ts
// incremental-validator.ts —— 增量校验：引用缓存 + 错误熔断 + 聚合顺手缓存
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import type { TreeValidationError, ValidationOptions } from './validator'
import type { FieldMeta } from './field-meta'

interface CachedNodeResult {
  errors: TreeValidationError[]          // 该子树内所有错误（含子孙）
  conditionCount: number                 // 聚合顺手缓存：条件总数
  depth: number                          // 聚合顺手缓存：子树深度
}

const MAX_ERRORS = 50

/** 缓存结构：fieldMap 版本 → (节点引用 → 结果)。版本来自 3.3.3 的元数据接口 */
export class IncrementalValidator {
  private layers = new Map<string, WeakMap<ConditionTreeNode, CachedNodeResult>>()

  constructor(
    private validateCondition: (node: ConditionTreeNode, fieldMap: Map<string, FieldMeta>) => TreeValidationError[],
  ) {}

  validate(
    root: ConditionTree,
    fieldMap: Map<string, FieldMeta>,
    metaVersion: string,
    options: ValidationOptions,
  ): { errors: TreeValidationError[]; truncated: boolean } {
    let layer = this.layers.get(metaVersion)
    if (!layer) { layer = new WeakMap(); this.layers.set(metaVersion, layer) }

    const errors: TreeValidationError[] = []
    let truncated = false

    const walk = (node: ConditionTreeNode): CachedNodeResult => {
      const cached = layer!.get(node)
      if (cached) return cached                       // 引用没变 = 内容没变：直接复用

      if (node.kind === 'condition') {
        // 注意：缓存里的错误不带 path——path 依赖节点位置（"根组 › 2 › 内层 › 1"），
        // 节点挪动不改引用但改位置，path 只能在 collect 展平时按当前位置现算
        const nodeErrors = this.validateCondition(node, fieldMap).map(e => ({ ...e, path: '' }))
        const result: CachedNodeResult = { errors: nodeErrors, conditionCount: 1, depth: 0 }
        layer!.set(node, result)
        return result
      }
      const childResults = node.children.map(c => walk(c))
      const nodeErrors: TreeValidationError[] = node.children.length === 0
        ? [{ nodeId: node.id, path: '', message: '条件组不能为空，请添加条件或删除该组' }]
        : []
      const result: CachedNodeResult = {
        errors: nodeErrors,
        conditionCount: childResults.reduce((s, r) => s + r.conditionCount, 0),
        depth: 1 + Math.max(0, ...childResults.map(r => r.depth)),
      }
      layer!.set(node, result)
      return result
    }

    // 组装全树错误：根组一趟展开（子树结果来自缓存，这趟是 O(节点数) 的浅遍历；
    // path 在这一层按当前遍历位置补写，与主体实现的 path 口径一致）
    const collect = (node: ConditionTreeNode, path: string): void => {
      if (truncated) return
      const r = walk(node)
      for (const e of r.errors) {
        if (errors.length >= MAX_ERRORS) { truncated = true; return }
        errors.push({ ...e, path })
      }
      if (node.kind === 'group') node.children.forEach((child, i) => collect(child, `${path} › ${i + 1}`))
    }
    collect(root, '根组')

    // 全局上限（条件总数/深度）用缓存的聚合算，不再单独遍历
    const rootResult = walk(root)
    if (rootResult.conditionCount > options.maxConditions) {
      errors.push({ nodeId: root.id, path: '根组', message: `条件总数 ${rootResult.conditionCount} 超过上限` })
    }
    if (rootResult.depth > options.maxDepth) {
      errors.push({ nodeId: root.id, path: '根组', message: `嵌套深度 ${rootResult.depth} 超过上限` })
    }
    return { errors, truncated }
  }
}
```

注意 `collect` 与 `walk` 的分工：`walk` 递归产出并缓存子树结果，`collect` 负责展平顺序与熔断——熔断后未访问的子树**不产生缓存写入也无妨**（下次访问再算），缓存与熔断互不干扰。

**量化预期**（对照预算 4）：增量版在"改一个值"的场景只重算一条链（根到被改节点的路径，树深 d 个节点）+ 一趟 O(n) 浅遍历，1000 条件的树从"全量校验 ~30ms"降到"路径重算 + 浅遍历 ~3ms"；`conditionCount`/`treeDepth` 的免费化还顺带消灭了主体实现里 `countConditions(root)` 与 `treeDepth(root)` 的两次独立全树遍历。**30 条件以下不要上这套**——主体实现 5ms 以内，增量的复杂度（缓存层、版本层）是纯负债。

**与 3.2.3 的接线**：增量校验的产物要进 3.2.3 的"errors 内容寻址引用稳定"——增量版天然满足一半（子树错误来自缓存，引用稳定），但展平后的 `errors` 数组仍是新数组；照 3.2.3 的方案给数组加内容键（`nodeId:message` 拼串比较），"值没变的打字"最终连 errors 相关重渲染都省掉。

**缓存行为的三条单测**（增量校验的契约，缺一条都可能在重构里静默丢失）：

```ts
// incremental-validator.test.ts —— 复用、失效、环境版本三契约
import { describe, expect, it, vi } from 'vitest'

describe('IncrementalValidator', () => {
  const fieldMap = new Map<string, FieldMeta>([
    ['amount', { name: 'amount', label: '金额', valueType: 'number', operators: ['>'], valueEditor: 'number' }],
  ])
  const opts: ValidationOptions = { maxDepth: 5, maxConditions: 100 }

  it('未改子树的条件校验器不再被调用（引用缓存生效）', () => {
    const spy = vi.fn(() => [])
    const v = new IncrementalValidator(spy)
    const tree = buildTree(50)                       // 50 条件
    v.validate(tree, fieldMap, 'v1', opts)           // 首跑：50 次
    v.validate(tree, fieldMap, 'v1', opts)           // 同引用：0 次
    expect(spy).toHaveBeenCalledTimes(50)
  })

  it('updateNodeById 只重算被改路径（结构共享的红利可观测）', () => {
    const spy = vi.fn(() => [])
    const v = new IncrementalValidator(spy)
    const tree = buildTree(50)
    const someRowId = findNodeById(tree, tree.children[0].id)!.id   // 取一个确定存在的条件行
    const touched = updateNodeById(tree, someRowId, n => ({ ...n, value: 100 }))
    v.validate(tree, fieldMap, 'v1', opts)
    spy.mockClear()
    v.validate(touched, fieldMap, 'v1', opts)        // 49 个未触及子树命中缓存
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('元数据版本一变，整层缓存作废（坑的正主）', () => {
    const spy = vi.fn(() => [])
    const v = new IncrementalValidator(spy)
    const tree = buildTree(2)
    v.validate(tree, fieldMap, 'meta-1', opts)
    spy.mockClear()
    v.validate(tree, fieldMap, 'meta-2', opts)       // 同一棵树、新版本：全量重算
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
```

（`buildTree` 复用 05 补充三基准测试的同款构造器。第二条用例是结构共享的**可观测证明**——它同时是 3.2.3 memo 契约的姊妹断言：tree-ops 若被改成深拷贝实现，这条测试立即变红。）

**坑（增量校验）**：
- 症状：接入增量校验后，测试偶现"字段已从元数据表下线，但存量条件行没有标红"——直接刷新页面才出现。
- 原因：缓存键只用了节点引用，没带 fieldMap 版本——3.3.3 的后台保鲜把字段表换新（`deprecated: true`），但节点引用没变，缓存命中返回了旧表的校验结果。
- 修法：缓存必须带环境版本（上面实现的 `layers: Map<metaVersion, WeakMap>`）；元数据接口没上 3.3.3 时，退而求其次用 fieldMap 的引用做外层键（`Map<FieldMap, WeakMap>`——引用不稳会多建几层，但不会脏命中）。**增量缓存的完备判据：影响结果的所有输入（节点内容、字段表、校验配置）都要进缓存键或触发失效**。

