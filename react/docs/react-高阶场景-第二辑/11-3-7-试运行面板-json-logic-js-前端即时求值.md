---
title: "3.7 试运行面板：json-logic-js 前端即时求值"
---

> 本文是《3. 动态查询构建器 / 规则引擎 UI ★全量展开 · 核心技术》按小节拆分后的续篇，上一部分见 [10-3-6-校验-空值-类型不匹配-between-要两个值-嵌套深度上限-条件数上限.md](10-3-6-校验-空值-类型不匹配-between-要两个值-嵌套深度上限-条件数上限.md)。

#### 3.7 试运行面板：json-logic-js 前端即时求值

**是什么**：编辑器旁边常驻一块"试验田"——左边是正在编辑的规则树（只读渲染），右边贴一份样例数据 JSON，中间用 json-logic-js **在浏览器里当场求值**：整树命中与否给一个大结果，同时**逐行高亮**每个条件/每个组的命中状态。原文的定位语原样保留：这是"用户信任感的来源，也是调试利器"。

**为什么需要它带来用户信任**：规则配置是高风险操作——配错的告警规则意味着漏报告警，配错的审批条件意味着单据走错流程。用户面对一堆且/或嵌套时的真实心理是"我配的这个东西到底会不会按我想的跑？"。没有试运行，用户只能在保存后去生产数据上"赌"；有了试运行，**"改一下、看一眼命中、再改一下"的秒级反馈闭环**把黑盒变成白盒，用户是在"验证过的确定性"上点保存，而不是在祈祷。对开发者它同样是调试利器：一套"规则 + 样例数据"天然就是回归测试用例，值得随规则一起存库（规则平台的高级形态：样例数据即断言）。

**怎么做（机制分步）**：

1. 装 json-logic-js（前端求值、后端同格式执行，一套规则两端跑）。
2. 样例数据输入防抖 300ms 后 `JSON.parse`，解析错误就地提示（不打断编辑）。
3. 求值复用 §3.5 的 `conditionToRule` 逐条件转 json-logic；组节点**先全量求子节点再聚合**（不能短路——短路了就拿不到每个子节点的命中状态用于高亮）。
4. 命中结果收进 `Map<nodeId, boolean>`，只读渲染器据此上色：命中绿、未命中灰。
5. 需要扩展操作符时用 `add_operation` 注册自定义算子（前后端各注册一份同名实现，口径一致）。

```bash
npm i json-logic-js
```

**代码——试运行面板完整实现**：

```tsx
// TrialRunPanel.tsx —— 试运行：左边规则右边样例数据，逐行高亮命中分支
import { useEffect, useMemo, useState } from 'react'
import jsonLogic from 'json-logic-js'
import type {
  ConditionTree,
  ConditionTreeNode,
  GroupNode,
} from './condition-tree'
import { countConditions } from './tree-ops'
import { type FieldMeta, OPERATOR_LABELS } from './field-meta'
import { conditionToRule } from './converters'

/** json-logic-js 的类型定义要求 RulesLogic，这里规则是动态生成的，做一次窄化断言 */
const applyLogic = (rule: Record<string, unknown>, data: unknown): boolean =>
  Boolean(jsonLogic.apply(rule as never, data))

/** 自定义算子示例：日期在某天之后。前后端必须注册同名实现，口径一致 */
jsonLogic.add_operation('dateAfter', (dateStr: unknown, boundary: unknown): boolean =>
  typeof dateStr === 'string' && typeof boundary === 'string' && dateStr > boundary,
)

/** 全树求值：返回根结果 + 每个节点的命中表。注意组节点不能短路（要拿全子节点状态做高亮） */
function evaluateTree(tree: ConditionTree, data: unknown, fieldMap: Map<string, FieldMeta>) {
  const hitMap = new Map<string, boolean>()
  const walk = (node: ConditionTreeNode): boolean => {
    if (node.kind === 'group') {
      const childHits = node.children.map(walk)         // 先全量求子节点
      const hit = node.combinator === 'and'
        ? childHits.every(Boolean)
        : childHits.some(Boolean)
      hitMap.set(node.id, hit)
      return hit
    }
    const rule = conditionToRule(node, fieldMap)        // 复用 §3.5 的单条件转换
    const hit = applyLogic(rule, data)
    hitMap.set(node.id, hit)
    return hit
  }
  const rootHit = walk(tree)
  return { rootHit, hitMap }
}

export function TrialRunPanel({ tree, fieldMap }: {
  tree: ConditionTree
  fieldMap: Map<string, FieldMeta>
}) {
  const [dataText, setDataText] = useState(
    '{\n  "amount": 150,\n  "city": "北京",\n  "isVip": false,\n  "order_no": "SO-2026-001",\n  "created_at": "2026-11-01"\n}',
  )

  // 防抖求值：输入停 300ms 再算，打字过程不卡
  const [state, setState] = useState<{
    parsed: Record<string, unknown> | null
    error: string | null
    rootHit: boolean | null
    hitMap: Map<string, boolean>
  }>({ parsed: null, error: null, rootHit: null, hitMap: new Map() })

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(dataText) as Record<string, unknown>
        const { rootHit, hitMap } = evaluateTree(tree, parsed, fieldMap)
        setState({ parsed, error: null, rootHit, hitMap })
      } catch (e) {
        setState({ parsed: null, error: `样例数据不是合法 JSON：${(e as Error).message}`, rootHit: null, hitMap: new Map() })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [dataText, tree, fieldMap])

  return (
    <div className="qb-trial">
      <div className="qb-trial-left">
        <div className={`qb-trial-result ${state.rootHit === null ? '' : state.rootHit ? 'is-hit' : 'is-miss'}`}>
          {state.error ? '—' : state.rootHit ? '命中：将执行动作' : '未命中：不执行'}
        </div>
        <PreviewNode node={tree} hitMap={state.hitMap} fieldMap={fieldMap} />
      </div>
      <div className="qb-trial-right">
        <label htmlFor="qb-sample">样例数据（模拟后端事件/数据行）</label>
        <textarea
          id="qb-sample"
          value={dataText}
          onChange={e => setDataText(e.target.value)}
          spellCheck={false}
          rows={14}
        />
        {state.error && <p className="qb-trial-error" role="alert">{state.error}</p>}
      </div>
    </div>
  )
}

/** 只读预览：条件行/组按命中状态上色——绿 = 命中，灰虚线 = 未命中 */
function PreviewNode({ node, hitMap, fieldMap, depth = 1 }: {
  node: ConditionTreeNode
  hitMap: Map<string, boolean>
  fieldMap: Map<string, FieldMeta>
  depth?: number
}) {
  const hit = hitMap.get(node.id)
  if (node.kind === 'condition') {
    const label = fieldMap.get(node.field)?.label ?? node.field
    const valueText = Array.isArray(node.value) ? `[${node.value.join(', ')}]` : String(node.value)
    return (
      <div className={`qb-preview-row ${hit ? 'is-hit' : 'is-miss'}`}>
        <code>{label} {OPERATOR_LABELS[node.operator]} {valueText}</code>
        <span className="qb-preview-hit">{hit === undefined ? '' : hit ? '✓ 命中' : '✗ 未命中'}</span>
      </div>
    )
  }
  return (
    <div className="qb-preview-group" data-depth={Math.min(depth, 4)}>
      <span className="qb-preview-comb">{node.combinator === 'and' ? '全部满足（且）' : '任一满足（或）'} · {countConditions(node)} 条</span>
      {node.children.map((child, i) => (
        <div key={child.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {i > 0 && <span className="qb-preview-chip">{node.combinator === 'and' ? '且' : '或'}</span>}
          <PreviewNode node={child} hitMap={hitMap} fieldMap={fieldMap} depth={depth + 1} />
        </div>
      ))}
    </div>
  )
}
```

配套样式要点（命中/未命中必须同时满足"色盲可辨"——不能只靠红绿）：

```text
.qb-preview-row.is-hit   { background: #e6f7ec; border-left: 3px solid #33a356; }  /* 绿底 + 实线左条 */
.qb-preview-row.is-miss  { background: #f7f8fa; border-left: 3px dashed #98a2b3; } /* 灰底 + 虚线左条 + ✓/✗ 文案 */
.qb-trial-result.is-hit  { color: #1f7a3d; font-weight: 600; }
.qb-trial-result.is-miss { color: #667085; }
```

**常见坑（试运行层）**：
- 症状：试运行显示命中，后端执行不命中（或反过来）。
- 根因：两端求值器不同——前端 json-logic-js 3.x、后端某个 Java 移植版旧版本；或前端注册了 `dateAfter` 自定义算子，后端没注册同名同义实现。
- 修法：自定义算子建立"算子注册表清单"（名字、语义、双端实现、单测用例）随契约文档维护；版本升级时跑同一套 golden case（一棵树 × N 份样例数据 × 双端结果比对）再发布。

> 以下 3.7.1～3.7.3 为试运行面板的进阶补充小节（编号续接本文件 3.7 一节）：试运行结果的三种形态、json-logic 自定义运算子注册与沙箱边界、批量求值的性能与超时保护。

##### 3.7.1 试运行结果的三种形态——命中明细、命中统计与执行解释

**是什么**：主体面板是"一份样例数据 → 一个大结果 + 逐行高亮"。真实使用中用户会问三个不同的问题，对应结果的三种形态：**命中明细**（"这批历史订单里哪些命中？"——多样本文档列表逐条标记，可点开看每条的逐条件命中）；**命中统计**（"大概命中多少？哪个条件最常拖后腿？"——命中率与逐条件命中率）；**执行解释**（"为什么没命中？"——从命中表反向推导一条人话链路："根组（且）未命中：被「城市 in [北京, 上海]」挡住"）。三种形态全部派生自同一份求值产物（`evaluateTree` 的 `{ rootHit, hitMap }`），只是聚合与呈现方式不同。

**为什么需要**：单样本回答"这条数据行不行"，三个新问题一个都答不了。告警规则上线前，运维想拿过去一周的真实事件回放（明细）；CDP 圈选要看命中率是否量级合理、哪个条件把人数砍得太狠（统计）；而**执行解释是新手救星**——用户面对一棵未命中的且/或树，肉眼在嵌套里找"到底是谁不满足"的成本极高，机器一行话就说清。这也呼应主体的定位：试运行是"用户信任感的来源"，信任感来自"我问什么它都能答"，而不是只有一个绿色/灰色结果。

**关键机制**：

1. **一份数据三种视图**：对每份样例跑一次 `evaluateTree`，产出 `{ sampleId, rootHit, hitMap }` 列表——明细、统计、解释全部从这份列表派生。**绝不为了三种视图写三条求值路径**（见本节坑）。
2. **逐条件命中率 = 规则调优的抓手**：`conditionHitRate(nodeId) = 命中该条件的样本数 / 总样本数`。配完一棵"且"树命中率只有 2%，逐条件命中率一眼看出"城市 in 只有 8%——候选城市选少了"，比肉眼猜快一个数量级。
3. **执行解释 = 从根向下的"追责链"**：根组未命中时，且组找第一个未命中的子节点、或组解释为"所有子分支都未命中"，递归下降到具体条件行，串成"根组（且）→ 内层组（或）→ VIP = true 未满足"的链。解释器只消费 `hitMap`，不重新求值。
4. **多样本的量级边界**：几百条样例同步求值无压力；上千条走 3.7.3 的分片。样例来源：用户手贴（主体已支持）、历史数据抽样按钮（后端拉 N 条脱敏样本）、golden case 回放（随规则存的样例即断言）。

**最小可行实现**——统计与解释（明细视图复用主体的 `PreviewNode` 渲染列表即可）：

```ts
// trial-run-stats.ts —— 逐条件命中率 + 执行解释：全部派生自 hitMap，不重新求值
import type { ConditionTree, ConditionTreeNode } from './condition-tree'
import type { FieldMeta } from './field-meta'
import { OPERATOR_LABELS } from './field-meta'

export interface SampleResult {
  sampleId: string
  rootHit: boolean
  hitMap: Map<string, boolean>
}

/** 逐条件命中率：条件行与组都统计，按命中率升序 = "最常拖后腿"排在最前 */
export function hitRates(tree: ConditionTree, results: SampleResult[]): Map<string, number> {
  const rates = new Map<string, number>()
  const walk = (node: ConditionTreeNode): void => {
    if (results.length > 0) {
      const hits = results.filter(r => r.hitMap.get(node.id) === true).length
      rates.set(node.id, hits / results.length)
    }
    if (node.kind === 'group') node.children.forEach(walk)
  }
  walk(tree)
  return rates
}

/** 执行解释：从根向下追责，产出一条人话链路。只消费 hitMap，永不重新求值 */
export function explain(tree: ConditionTree, result: SampleResult, fieldMap: Map<string, FieldMeta>): string {
  const label = (c: Extract<ConditionTreeNode, { kind: 'condition' }>): string => {
    const field = fieldMap.get(c.field)
    const valueText = Array.isArray(c.value) ? `[${c.value.join(', ')}]` : String(c.value)
    return `「${field?.label ?? c.field} ${OPERATOR_LABELS[c.operator]} ${valueText}」`
  }

  const walk = (node: ConditionTreeNode): string => {
    const hit = result.hitMap.get(node.id)
    if (node.kind === 'condition') {
      return hit ? `${label(node)} 满足` : `${label(node)} 不满足`
    }
    const comb = node.combinator === 'and' ? '且' : '或'
    if (hit) return `${comb}组命中（${node.children.length} 个子条件按「${comb}」组合通过）`
    if (node.combinator === 'and') {
      // 且组未命中：指认第一个不满足的子节点（追责链向下钻）
      const blocker = node.children.find(c => result.hitMap.get(c.id) !== true)
      return blocker
        ? `${comb}组未命中：被 ${walk(blocker)} 挡住`
        : `${comb}组未命中`
    }
    // 或组未命中：所有分支都不满足，逐条列出（通常分支不多，全列比指认更有用）
    const all = node.children.map(c => walk(c)).join('；')
    return `${comb}组未命中：所有分支都未通过——${all}`
  }

  return result.rootHit
    ? `命中：${walk(tree)}`.replace('命中：且组命中', '命中（所有条件满足）')
    : `未命中：${walk(tree)}`
}
```

统计视图的 UI 一角（解释直接放结果徽标下方，`role="alert"` 让读屏用户也能获得"为什么"）：

```tsx
// TrialRunStats.tsx —— 命中率榜单：最常拖后腿的条件排最前，点击滚动定位到该行
function TrialRunStats({ tree, results, fieldMap, onLocate }: {
  tree: ConditionTree
  results: SampleResult[]
  fieldMap: Map<string, FieldMeta>
  onLocate: (nodeId: string) => void
}) {
  const rates = hitRates(tree, results)
  const rows = [...rates.entries()]
    .filter(([id]) => tree.id !== id)
    .sort(([, a], [, b]) => a - b)                     // 升序：拖后腿的在前
    .slice(0, 5)
  const totalRate = results.length > 0
    ? results.filter(r => r.rootHit).length / results.length
    : 0
  return (
    <div className="qb-trial-stats">
      <p>整体命中率：{(totalRate * 100).toFixed(1)}%（{results.length} 份样本）</p>
      <ul>
        {rows.map(([nodeId, rate]) => (
          <li key={nodeId}>
            <button type="button" onClick={() => onLocate(nodeId)}>
              {(rate * 100).toFixed(0)}%
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

（榜单行的文案由调用侧从 `hitMap` 对应的节点取 `label(node)` 拼出，此处省略——避免把"展示逻辑"混进"统计逻辑"。）

**样例数据的治理**（三种形态共用的地基）：样例集随规则演进要防两种腐化——全绿样本（全部命中，解释不了未命中路径）与全红样本（全部不命中，统计失去分辨力）。保存规则时校验样本集至少覆盖"至少一条命中 + 至少一条未命中"，golden case 才有断言价值。

**选型与学习路径**：先做解释（一行 `explain` 调用，价值/成本比最高）；统计在有"调优"诉求（CDP、告警阈值）时做；明细在有多样本回放诉求时做。解释器的"追责链"写法与主流规则引擎的"why not" 面板（Drools 的 audit log、Elasticsearch 的 explain API）同构——命名就借自 ES 的 `_explain`，值得对照读一篇文章感受"解释是执行引擎的一等公民"这个设计共识。

**坑（三形态）**：
- 症状：改协议后（新增 `startsWith` 操作符），求值结果正常，执行解释里该条件永远显示"满足"——不管样例数据是什么。
- 原因：解释器没有消费 `hitMap`，而是自己写了一套 `explainCondition` 逐条件重新判断（顺手抄了求值逻辑）——协议加操作符时求值器改了（switch 加分支），解释器没改，新算子走到了它的 default 分支返回 true。
- 修法：解释的唯一数据源是 `hitMap`（本节实现），解释器里不允许出现操作符级的判断逻辑——它的全部智慧只有"且组找未命中子节点、或组全列"两条结构规则。自检方法：grep 解释模块，出现 `case '>'` 这类操作符分支就是违规。

##### 3.7.2 json-logic 自定义运算子注册与沙箱边界

**是什么**：把主体里一行 `jsonLogic.add_operation('dateAfter', ...)` 的随手写法，升级成一张**算子注册表**：每个自定义算子登记名字、参数与返回契约、纯度声明、双端实现索引与 golden case；并在注册表的入口处守住 json-logic 的安全边界——**json-logic 的安全性来自"规则是数据不是代码"，自定义算子是唯一能破坏这个保证的口子**。真需要执行不可信代码时（用户写脚本），那不是 json-logic 的问题，指路《进阶大纲》14-6 路线 7（iframe sandbox / quickjs 的领域隔离）与 06-1-4 表达式引擎（`new Function` 的逃逸演示）。

**为什么需要**：主体坑已讲"双端注册清单"，本节补的是**单端内部**的工程化与安全模型。两个真实威胁：① **闭包捕获**——算子写成 `(a, b) => a > getCurrentUser().vipThreshold`，捕获了应用状态：同一份规则、同一样例，用户切了个租户结果就变——规则求值从"数据的函数"变成"数据 × 隐藏上下文的函数"，golden case 全部失效且没人知道为什么；② **攻击面**——json-logic 规则是从后端下发的数据（存量规则库），若前端注册的算子封装了 IO 能力（发请求、写 storage、读 cookie），被篡改的规则 JSON 就能驱动这些能力——13-3-9-坑 对标节已立"算子注册表要当攻击面管理"，这里给落地。

**json-logic 的安全模型先讲清**（守边界前先知道边界在哪）：规则 JSON 只能引用**已注册的操作符**，操作符做什么完全由宿主定义——所以 json-logic 天生不是 eval：规则里写不出 `fetch(...)`，除非你注册的算子内部调了 fetch。推论：**安全性 = 你注册的每一个算子的安全性之和**。内置操作符（比较/逻辑/取数）是纯函数，零风险；风险全部来自 `add_operation`。

**三条注册纪律**：

1. **纯函数**：算子只允许依赖参数——禁止闭包捕获组件 state、模块级可变量、`Date.now()`/`Math.random()`（不确定性同样破坏 golden case——需要"当前时间"的算子把 now 作为参数传入，由调用方注入）。
2. **无 IO**：不发请求、不碰 storage/cookie/DOM。需要外部数据的逻辑（"商品是否在营销池"）不属于规则求值——它属于数据准备层，把结果作为字段喂进 data 对象，规则里用普通比较。
3. **异常契约**：算子对非法输入要么返回 `false`（保守不命中），要么抛带名字的错——统一选一种写进契约。json-logic 的 `apply` 不捕获算子异常，抛错会直接炸穿面板（本节坑）。

**最小可行实现**：

```ts
// operator-registry.ts —— 自定义算子注册表：声明、守卫、双端索引
import jsonLogic from 'json-logic-js'

export interface CustomOperation {
  name: string                          // 'dateAfter'：规则 JSON 里引用的名字
  signature: string                     // '(date: ISO string, boundary: ISO string) => boolean'
  /** 纯度声明进类型：注册时就要回答这个问题 */
  purity: 'pure'                        // 只允许 'pure'——需要 IO 的逻辑不许进这张表（纪律 2）
  frontend: (...args: unknown[]) => unknown
  backendImpl: string                   // 后端实现的索引（仓库名/类名），双端对齐的抓手
  goldenCases: { args: unknown[]; expected: unknown }[]
}

const REGISTRY = new Map<string, CustomOperation>()

export function defineOperation(op: CustomOperation): void {
  if (REGISTRY.has(op.name)) throw new Error(`算子「${op.name}」已注册（HMR 重复注册见 3.3.2 同款）`)
  // 守卫：包一层 try/catch + 参数透传，异常按契约转 false（纪律 3 的执行侧）
  const guarded = (...args: unknown[]): unknown => {
    try {
      return op.frontend(...args)
    } catch (e) {
      console.error(`[operator:${op.name}] 求值异常，按不命中处理：`, e)
      return false
    }
  }
  jsonLogic.add_operation(op.name, guarded)
  REGISTRY.set(op.name, op)
}

/** 注册表导出：golden case 跑批器与"注册清单"文档生成共用 */
export function listOperations(): CustomOperation[] {
  return [...REGISTRY.values()]
}

/** 规则加载前的依赖检查：规则 JSON 里出现的自定义算子必须都已注册 */
export function assertOperationsAvailable(rule: unknown): string[] {
  const missing: string[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (!REGISTRY.has(key) && !isBuiltIn(key)) missing.push(key)
        walk(value)
      }
    }
  }
  walk(rule)
  return [...new Set(missing)]
}

const BUILTIN = new Set(['var', 'missing', 'and', 'or', '!', '!!', '==', '===', '!=', '!==',
  '>', '>=', '<', '<=', '+', '-', '*', '/', '%', 'max', 'min', 'in', 'cat', 'substr', 'if', '?:', 'log', 'map', 'reduce', 'filter', 'all', 'none', 'some', 'merge'])

function isBuiltIn(name: string): boolean {
  return BUILTIN.has(name)
}

/* ---- 业务侧注册：时间比较算子，now 由调用方注入，算子本身不取时钟 ---- */
defineOperation({
  name: 'dateAfter',
  signature: '(date: ISO string, boundary: ISO string) => boolean',
  purity: 'pure',
  frontend: (date, boundary) =>
    typeof date === 'string' && typeof boundary === 'string' && date > boundary, // ISO 字典序即时间序（§3.5 的日期纪律）
  backendImpl: 'rule-engine-java#DateOps.dateAfter',
  goldenCases: [
    { args: ['2026-11-02', '2026-11-01'], expected: true },
    { args: ['2026-11-01', '2026-11-01'], expected: false },
    { args: [null, '2026-11-01'], expected: false },   // 非法输入 → false（纪律 3）
  ],
})
```

golden case 的双端跑法：注册表导出全部算子的 `goldenCases`，前端用 `jsonLogic.apply` 跑一遍断言，后端 CI 用同一份 JSON（放进契约仓库）跑它的实现——两边共用用例文件，正是主体坑"算子注册表清单"的自动化形态。前端侧的跑批器不到二十行：

```ts
// operator-golden.test.ts —— 算子行为锁定：注册即测，防"注册了但没人验证过"
import { describe, expect, it } from 'vitest'
import jsonLogic from 'json-logic-js'
import { listOperations } from './operator-registry'

describe('自定义算子 golden case', () => {
  for (const op of listOperations()) {
    it(`${op.name}: ${op.signature}`, () => {
      for (const { args, expected } of op.goldenCases) {
        expect(jsonLogic.apply({ [op.name]: args } as never, {})).toBe(expected)
      }
    })
  }
})
// 新算子注册的那一刻，它的用例自动出现在测试列表里——"没有用例的注册"
// 在 CI 里表现为 it 块数为 0，一眼可见（再加一条：goldenCases.length === 0 的算子直接 fail）
```

**"需要当前时间"的算子怎么保持纯**——把 now 作为参数注入，规则里由调用方传入（后端执行时由引擎注入执行时刻，前端试运行由面板注入用户指定的"模拟时刻"）：

```ts
// 时间算子的纯化：dateAfterNow(date, now) —— now 是数据不是环境
defineOperation({
  name: 'dateAfterNow',
  signature: '(date: ISO string, now: ISO string) => boolean',
  purity: 'pure',
  frontend: (date, now) => typeof date === 'string' && typeof now === 'string' && date > now,
  backendImpl: 'rule-engine-java#DateOps.dateAfterNow',
  goldenCases: [
    { args: ['2026-11-02', '2026-11-01'], expected: true },
    { args: [null, '2026-11-01'], expected: false },
  ],
})
// 试运行面板注入：applyLogic(rule, { ...sampleData, __now: userPickedMockNow })
// 规则里的写法：{ "dateAfterNow": [{ "var": "created_at" }, { "var": "__now" }] }
```

这个模式买到的能力不止是纯度：**试运行可以测"未来才触发"的规则**——把 `__now` 设到明天，时间窗规则立刻可验证，不必等时钟走到那一刻。

**什么时候需要真沙箱**（边界之外的世界的指路）：算子是**你写的**（纯函数）→ 永远不需要沙箱；规则里要嵌**用户写的 JS 片段**（低代码平台的计算节点）→ json-logic 根本表达不了，那是执行不可信代码的问题——《进阶大纲》14-6 路线 7 给了完整方案（iframe `sandbox="allow-scripts"` 的 opaque origin 隔离、quickjs-emscripten 的独立 WASM 解释器），06-1-4 表达式引擎有两行逃逸演示说明为什么"遮蔽变量名"式沙箱是假的。**不要把"给 json-logic 加算子"和"执行用户脚本"混为一谈**——前者是注册表管理，后者是领域隔离。

**选型与学习路径**：算子数量在 5 个以内时，注册表的收益主要是纪律（守卫 + 双端索引）；超过 5 个或多人协作时，`assertOperationsAvailable`（加载前检查）与 golden case 自动化变成刚需。内置操作符优先：很多"自定义"需求其实内置就有——`in`（数组/子串）、三参 `<=`（between）、`!!`（真值）——先翻 json-logic 文档的操作符表再立项写算子。

**坑（算子层）**：
- 症状：试运行面板偶发整块白屏，错误上报 `Cannot read properties of undefined (reading 'slice')`，栈里指向 json-logic 的 apply。
- 原因：某自定义算子（`inLastDays(date, days)`）对参数做 `date.slice(...)` 前没有类型检查；后端下发的存量规则里有一条样例数据的 `created_at` 是 `null`（老数据没有该字段）——算子抛 TypeError，`jsonLogic.apply` 不捕获算子异常，直接炸穿 useEffect 与渲染。
- 修法：两层兜底——注册表守卫统一 try/catch 转 false（上面实现的 `guarded`，异常按"不命中"处理并上报）；算子内部对每个参数做类型守卫（非法 → false），与 §3.6 校验的"字段悬空就 return"是同一防御哲学：**求值链路上的每个节点都要能对脏数据优雅降级**。

##### 3.7.3 批量求值的性能与超时保护——分片、预算与取消

**是什么**：样本从 1 份到一万份（golden case 回放、历史事件回放、人群预估的前端模拟、3.7.1 的多样本明细）时，"一个 setTimeout 里 for 循环跑完"的写法会把主线程卡死数秒——页面冻结、输入无响应、浏览器弹"页面无响应"。本节给批量求值的调度层：**按帧预算分片**（每片 ≤ 8ms，跑完一片让出主线程）、**整体超时**（预算用尽提前收尾并标注"部分完成"）、**可取消**（用户改树/关面板，旧批次立即作废）、**进度反馈**（已完成 N/M）。

**为什么需要**：单份样例求值是微秒级（json-logic 的 apply 很快），一万份 × 30 条件 ≈ 数百毫秒到数秒的同步计算——同步跑就是一次长任务（long task），期间：用户的键盘输入排队、动画掉帧、React 的任何更新都进不来。更糟的是它与防抖联动失效：用户每改一下树，防抖后重跑一批——连续编辑等于连续卡顿。**分片不是优化技巧，是把"批处理"变成"可与用户交互共存的后台任务"的唯一路径**。Web Worker 是另一条路（计算完全离开主线程），但代价是求值环境搬运（注册表要在 worker 里再注册一遍）与结果序列化——《进阶大纲》14-6 的对比表把它列为"作者半可信的纯计算型"首选；**主线程分片是零基建成本的 80 分方案，先分片、真不够再上 Worker**。

**关键机制**：

1. **生成器分片**：`function* evaluateBatch()` 每产出一个样本的结果就 yield——调度器数着时间片收产出，超预算就 `setTimeout(0)` 让出，下一片继续。生成器把"算什么"与"怎么调度"解耦，两半各自可测。
2. **帧预算 8ms**：一帧 16ms，留给 React 提交与渲染一半——实测宁可设小（6~8ms），分片开销（每次让出约 0.1ms 级）远小于卡顿代价。
3. **批次序号防串**：用户改树触发新一轮批次，旧批次靠序号自废——与 §3.4/3.6.2 的竞态守卫同一模式在"批处理"上的变体。
4. **整体超时**：`deadline`（如 3s）到点停止取产出，返回已完成部分 + `truncated: true`——批次可能永远跑不完（样本太多），UI 要能展示部分结果而不是无限 loading。
5. **结果缓存**：`(ruleHash, sampleHash) → result` 的 Map——改树只影响 ruleHash，改样本只影响 sampleHash，两边都不变的重跑（切 tab 回来）零计算。

**最小可行实现**：

```ts
// batch-evaluate.ts —— 批量求值调度器：生成器 + 帧预算 + 超时 + 取消
import type { ConditionTree } from './condition-tree'
import type { FieldMeta } from './field-meta'
import { evaluateTree } from './trial-run'        // §3.7 主体的单份求值（含组不短路的 hitMap）

export interface Sample { id: string; data: Record<string, unknown> }
export interface BatchResult {
  completed: { sampleId: string; rootHit: boolean; hitMap: Map<string, boolean> }[]
  truncated: boolean          // 超时/取消：结果不完整
  elapsedMs: number
}

/** 生成器：每份样本 yield 一次——调度与计算解耦的关键 */
function* evaluateSamples(tree: ConditionTree, samples: Sample[], fieldMap: Map<string, FieldMeta>) {
  for (const sample of samples) {
    const { rootHit, hitMap } = evaluateTree(tree, sample.data, fieldMap)
    yield { sampleId: sample.id, rootHit, hitMap }
  }
}

export function runBatch(
  tree: ConditionTree,
  samples: Sample[],
  fieldMap: Map<string, FieldMeta>,
  opts: { frameBudgetMs?: number; deadlineMs?: number; isStale?: () => boolean; onProgress?: (done: number, total: number) => void } = {},
): Promise<BatchResult> {
  const { frameBudgetMs = 8, deadlineMs = 3000, isStale = () => false, onProgress } = opts
  const startedAt = performance.now()
  const iter = evaluateSamples(tree, samples, fieldMap)

  return new Promise(resolve => {
    const completed: BatchResult['completed'] = []
    const step = (): void => {
      // 三个终止条件先查：批次作废（树已变）、整体超时、跑完
      if (isStale()) { resolve({ completed, truncated: true, elapsedMs: performance.now() - startedAt }); return }
      const frameStart = performance.now()
      while (performance.now() - frameStart < frameBudgetMs) {
        const next = iter.next()
        if (next.done) {
          resolve({ completed, truncated: false, elapsedMs: performance.now() - startedAt })
          return
        }
        completed.push(next.value)
      }
      onProgress?.(completed.length, samples.length)
      if (performance.now() - startedAt > deadlineMs) {
        resolve({ completed, truncated: true, elapsedMs: performance.now() - startedAt }) // 超时收尾：部分结果好过没有
        return
      }
      setTimeout(step, 0)       // 让出主线程：React/输入/动画在这一拍里跑
    }
    step()
  })
}
```

React 侧的接线（批次序号 + 防抖 + 结果状态）：

```ts
// use-trial-batch.ts —— 批量试运行 hook：批次防串，进度进 state
import { useEffect, useRef, useState } from 'react'
import type { ConditionTree } from './condition-tree'
import type { FieldMeta } from './field-meta'
import { runBatch, type BatchResult, type Sample } from './batch-evaluate'

export function useTrialBatch(tree: ConditionTree, samples: Sample[], fieldMap: Map<string, FieldMeta>) {
  const [state, setState] = useState<{ running: boolean; result: BatchResult | null; progress: [number, number] | null }>(
    { running: false, result: null, progress: null },
  )
  const batchSeq = useRef(0)

  useEffect(() => {
    if (samples.length === 0) return
    const seq = ++batchSeq.current
    const timer = setTimeout(() => {
      setState({ running: true, result: null, progress: [0, samples.length] })
      runBatch(tree, samples, fieldMap, {
        isStale: () => batchSeq.current !== seq,     // 用户又改了树：本批次自废
        onProgress: (done, total) => { if (batchSeq.current === seq) setState(s => ({ ...s, progress: [done, total] })) },
      }).then(result => {
        if (batchSeq.current !== seq) return
        setState({ running: false, result, progress: null })
      })
    }, 300)                                          // 防抖：连续编辑不连发批次
    return () => clearTimeout(timer)
  }, [tree, samples, fieldMap])

  return state
}
```

**超时后的产品文案**要如实：`truncated: true` 时显示"已完成 6,400 / 10,000 份（达到时间预算，结果基于已完成的 64%）"——统计形态（3.7.1）在此要标注"部分样本"，不要把部分结果当全量结论。若业务必须全量（精确人群数），那是后端预估接口（3.6.2）的职责，前端批处理天然是"尽力而为"。

**进度回调节流**（坑里点到的纪律，代码收口在调度器一侧而不是每个调用方各自 setTimeout）：

```ts
// runBatch 的 opts 里加一个节流包装（调度器内部实现，调用方无感）：
const lastProgressAt = { value: 0 }
const throttledProgress = (done: number, total: number): void => {
  const now = performance.now()
  if (now - lastProgressAt.value < 200 && done < total) return   // 200ms 一报，末次必报
  lastProgressAt.value = now
  onProgress?.(done, total)
}
// step() 里原来的 onProgress?.(completed.length, samples.length) 换成 throttledProgress(...)
// "末次必报"的 && done < total 保证跑完时进度一定到 100%——节流最常漏的就是最后一帧
```

**选型与学习路径**：分片的适用线很清晰——样本 × 条件数超过十万次 apply（约 >300ms 同步耗时）就值得；万级以下直接同步跑。Worker 升级路径（需要时）：求值依赖（tree、fieldMap、算子注册表）全部可序列化是前提——本节注册表（3.7.2）的纯函数纪律正好保证了这一点（无闭包捕获 = 可搬运），这是两条小节之间的暗合约。React 18+ 还有一条中间路线：`startTransition` 包住结果 setState 让 UI 不阻塞——但它只救渲染不救计算，长计算该分片还得分片。

**坑（批处理）**：
- 症状：接入批量回放后，样例加载到 5,000 条时页面每隔几秒冻结一次，输入框打字丢字符；Performance 面板里是连续的 long task。
- 原因：分片调度器写好了，但结果缓存的 key 用了 `JSON.stringify(samples)`（每次新字符串），缓存永不命中；更隐蔽的是进度回调 `onProgress` 每片都 `setState`——一帧 60 片让 React 的更新队列被打爆，**计算让出了主线程，状态更新又把它抢回去了**。
- 修法：缓存 key 用内容哈希（样本数 + 首尾 id + 长度拼串，或持久 hash）；`onProgress` 节流到每 200ms 一次（进度是人看的，人不需要 60fps 的进度条）。分片调度的两条隐性纪律：**让出计算的同时要管住伴生的状态更新频率**，否则分片白做；一切伴随计算产生的副作用（日志、上报）同样要离开热循环。

