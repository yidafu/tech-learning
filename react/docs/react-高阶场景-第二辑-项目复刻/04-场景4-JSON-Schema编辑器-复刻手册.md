> 返回：[高阶场景第二辑·项目复刻](./README.md)｜图纸：[15 · JSON Schema 编辑器 / 配置可视化编辑器](../react-高阶场景-第二辑/15-4-JSON-Schema-编辑器-配置可视化编辑器.md)

# 场景 4 复刻手册：JSON Schema 编辑器（配置可视化编辑器）

> 一句话目标：从零复刻一个"左树 · 中预览 · 右源码"的 JSON Schema 工作台——把任意 draft-07 子集 schema 解析成可编辑节点树（AST 化），分类型编辑元信息，`allOf/oneOf/anyOf` 折叠为联合选择、`$ref` 解析带环检测，数组项与属性可拖拽排序，ajv 校验错误按路径回写到具体节点，导入导出全程零丢失（未 UI 化关键字原样保留）。预计工期：1.5 周。前置要求：第一辑《00-公共底座》（不可变路径操作、递归渲染、path 级订阅）+ 图纸 15 号文件通读一遍。

## 0. 目标与总验收

复刻完成的判定标准——每条都可运行验证，逐条打勾：

- [ ] **解析 AST 化**：任意合法 schema JSON 一次解析为 `SchemaNodeModel[]` 扁平行集，行 id 即 JSONPath（`$.properties.user.items`），与右侧源码同一套地址系统；`JSON.parse(JSON.stringify(schema))` 前后深度相等（round-trip 不丢未 UI 化关键字）
- [ ] **分类型编辑**：六种类型（string/number/boolean/object/array/enum）各有元信息 Setter；type 切换弹确认并清洗不兼容元字段（object→string 时 `properties/required/items` 被清、enum 残留被清）
- [ ] **required 影子同步**：删除/改名/移动属性后，父节点 `required` 数组同步维护——树上永远不出现"幽灵必填项"（预览表单里有个字段不存在却标红）
- [ ] **联合选择**：`oneOf/anyOf` 节点渲染为"折叠芯片 + 变体下拉"，切换变体后中列预览随之变化；编辑某个变体内部字段写回 `schema.oneOf[i]`，其他变体零影响
- [ ] **$ref 安全**：`#/definitions/Address` 节点显示芯片不递归展开；点击跳转到定义并三视图同步；自引用类型（`Node.children → Node`）解析返回环错误信息而不是栈溢出
- [ ] **拖拽排序**：属性同级排序、跨级移动（键冲突自动改名 `key-2`）、禁止拖入自身子树；数组节点支持单 `items` 与 `prefixItems` 元组两种形态的行编辑与排序
- [ ] **错误定位回写**：schema 自身非法（`ajv.validateSchema` 失败或 compile 抛异常）时，错误按 `schemaPath` 定位到树节点（含 required 缺字段用 `params.missingProperty` 精确定位）并高亮
- [ ] **导入导出**：粘贴一份 schema JSON → 树即时重建（非法 JSON 拒绝并保留旧树）；导出的 schema 可被独立脚本 `ajv.compile` 直接消费；格式化 = 2 空格缩进稳定输出（同样输入两次导出 diff 为空）

## 1. 与图纸文档的关系

一句话：[图纸 15 号文件](../react-高阶场景-第二辑/15-4-JSON-Schema-编辑器-配置可视化编辑器.md)讲透了"编辑 schema 本身"这个元编程问题的原理与全部交互形态，本手册把它落成**按里程碑施工的可执行步骤**，两者不重复——图纸给"为什么"，手册给"怎么一步步做出来"。

一处刻意的分工要说清：图纸的贯穿性决策是**不引入中间模型、以标准 JSON Schema 为唯一数据源**。本手册的"AST 化"不违背它——`SchemaNodeModel` 是**派生投影**（每次 schema 变更后重建，类似图纸的 `flattenRows`），不是第二份真相；所有编辑操作通过不可变路径操作写回 schema，导出零转换。理解这一点，M1 的数据流就通了。

## 2. 里程碑切分

每个里程碑结束时代码可运行、验收可执行。依赖关系严格线性：M1 是地基，M3 依赖 M1 的路径系统，M5 依赖 M3 的 $ref 解析。

### M1 schema 解析与 AST 化（约 2 天）

**目标**：`schema JSON → SchemaNodeModel 树`的转换器跑通，行 id 与 JSONPath 同源，required 从父节点投影。

**做什么**：

1. 定义 `JsonSchemaNode` 类型（图纸的版本直接可用：索引签名保留未 UI 化关键字）与 `SchemaNodeModel` 视图模型（见 §3）；
2. 写 `parseSchema(root): { rows: SchemaNodeModel[]; warnings: string[] }`：深度优先遍历 `properties`/`items`/`prefixItems`，`required` 从父节点投影到子行的 `required` 字段；
3. 写路径工具 `pathToSegs / getAt / setAt / deleteAt`（第一辑 00 手册的 setAt 直接搬，`$.a.b` 形态按 `.` 切分即可——本编辑器树只经 properties/items 下钻）；
4. 一个最小树组件渲染 rows（先不做交互，能看就行）。

**验收**：

```bash
npx vitest run src/schema-editor/parse.test.ts
```

- 用例 1：嵌套两层 object + 一层数组的 fixture，断言行 id、depth、required 投影全部正确；
- 用例 2：round-trip——`JSON.parse(JSON.stringify(node.raw))` 与原 schema 子树深度相等（`minLength`、`x-comment` 等未 UI 化字段不丢）；
- 用例 3：`required` 引用了不存在的属性名 → warnings 里出现一条（脏数据不静默）。

### M2 分类型编辑器（约 2 天）

**目标**：选中任意节点，右侧元信息面板按 `kind` 条件渲染 Setter；type 切换带确认与元字段清洗。

**做什么**：`type` Select（切换前确认丢子树）、`title/description` 失焦提交 Input、`required` Switch（写父节点）、`enum` 标签编辑器（string/number 两态）、`default` 按 type 分发（object/array 走 JSON 文本 + 解析错误行内提示）、`minimum/maximum/minLength/maxLength` 数值 Setter。结构操作在树上（增删字段）、语义编辑在面板上——图纸的密度取舍原样执行。

**验收**：string 节点面板出现 enum/minLength、object 节点出现"加子字段"入口、boolean 节点面板只有 title/default/description；`default` 不在 enum 内出现行内警示；type 从 object 切到 string 后 `properties/required/items/default` 全部被清洗（导出 JSON 里搜不到残留）。

### M3 高级关键字：联合与 $ref（约 2 天）

**目标**：`allOf/oneOf/anyOf` 折叠为联合选择；`$ref` 解析（含链式引用与环检测）+ 芯片跳转。

**做什么**：

1. 解析器把 `oneOf/anyOf` 子 schema 收进 `union.variants`（`allOf` 同构，UI 标注"必须同时满足"，编辑器按"叠加面板"处理——三个关键字共用一套变体渲染）；
2. 变体选择是**编辑器 UI 状态**（`unionSelection: Record<nodeId, number>`），不写进 schema；导出时 oneOf 数组原样保留（想持久化选中态用 `x-selected-variant` 扩展字段，属产品决策）；
3. `resolveRef`（§4 核心代码）+ 树上 `$ref` 芯片 + 点击跳转（跳转是三视图广播：树展开祖先并选中、源码滚动高亮、面板切换目标节点）。

**验收**：`npx vitest run src/schema-editor/ref.test.ts`——正常引用解析到目标节点；链式引用（A→B→C）解析到 C；自引用（A→A）与互引用（A→B→A）都返回带引用链的错误信息；`#/definitions/不存在的名字` 返回"找不到定义"。树上切换 oneOf 变体后编辑内部字段，`schema.oneOf[其他下标]` 的 JSON 序列化前后相等（零影响）。

### M4 数组项编辑与拖拽排序（约 2 天）

**目标**：dnd-kit 树拖拽三落区（before/inside/after）+ 数组 items 两种形态编辑。

**做什么**：

1. 拖拽主体搬图纸路线 1 的 `SchemaTree`（指针纵向比例 30/40/30 算落区、`moveProperty/reorderProperty/deleteProperty` 的 required 影子同步逻辑整段保留——它是本场景与普通树编辑器最大的协议差异）；
2. 数组节点支持两种形态：单 schema `items`（一行只读 `items`，选中后可改其类型）与 `prefixItems` 元组（每项一行，行间可拖拽排序，排序 = 数组元素换位，无 required 影子问题但有"删除中间项使后续下标前移"的路径补偿——先删后插，一次补偿）；
3. `enum` 值的排序复用同一套 dnd（enum 是有序数组，顺序即展示序）。

**验收**：同级排序、跨级移动（目标键冲突自动改名）、拖入自身子树被拒三例全绿；元组 `[string, number, boolean]` 拖成 `[number, boolean, string]` 后导出 JSON 与手工重排结果深度相等；一次拖拽 = 一次 undo（配合历史栈，若第一辑 00 的 historyStore 已接入）。

### M5 校验错误定位回写（约 1.5 天）

**目标**：`ajv` 错误（schema 自身错误 + 编译异常）映射回树节点 id，树上标红、点击滚动定位。

**做什么**：`runSelfCheck(schema)` 三步——`validateSchema`（元 schema 校验）→ `compile`（$ref 笔误在这抛异常，必须 try/catch，"无法校验"≠"校验失败"）→ 收集 `ErrorObject[]`；`schemaErrorToNodeId` 把 `schemaPath`（`#/properties/user/required`）转节点 id，required 错误用 `params.missingProperty` 精确到子行（§4 核心代码）。整链路 300ms 防抖。

**验收**：把 `required` 改成 `["age", "age"]`（重复）→ 树上 required 数组所在 object 节点标红；把 `$ref` 改成笔误 → compile 异常被捕获并定位到该 `$ref` 节点（不是白屏）；预览数据错误（`instancePath`）打到样例侧，schema 错误（`schemaPath`）打到树/源码侧——两个命名空间互不覆盖（图纸路线 4 的坑）。

### M6 导入导出与格式化（约 1 天）

**目标**：导入（粘贴/上传）→ 解析 → 树重建或拒绝；导出稳定格式化 JSON。

**做什么**：导入走 `parseSchema` + M5 自检，**解析失败拒绝导入并保留旧树**（宁可不动不可错动）；导出 `JSON.stringify(schema, replacer, 2)`，replacer 只做一件事——键序稳定化（可选，深排键让 diff 友好；默认保持插入序以忠实表达 `properties` 展示序）；"复制到剪贴板 + 下载 .json"两个出口；提供一个 CLI 冒烟脚本对导出产物跑独立 ajv。

**验收**：

```bash
node scripts/verify-export.mjs   # 读导出的 schema.json，独立 ajv.compile 成功即退出码 0
```

同一 schema 导出两次 diff 为空；导入一份含 `x-` 扩展字段与手写 `minLength` 的 schema，导出后逐字段比对零丢失。

## 3. 关键数据结构

```ts
// src/schema-editor/types.ts —— 唯一真相是 JsonSchemaNode；SchemaNodeModel 是它的派生投影

/** draft-07 子集。索引签名保留一切未 UI 化关键字——编辑器不许丢用户手写的数据 */
export interface JsonSchemaNode {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: (string | number)[];
  properties?: Record<string, JsonSchemaNode>; // 键序即展示序
  required?: string[];                          // ★ 挂在 object 自身，不挂在子字段上
  items?: JsonSchemaNode;                       // 数组：单 schema 形态
  prefixItems?: JsonSchemaNode[];               // 数组：元组形态（2019-09+；draft-07 的 items 数组按同构处理）
  allOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  $ref?: string;
  definitions?: Record<string, JsonSchemaNode>; // 根节点持有；$defs 同构支持
  [key: string]: unknown;                       // minLength / x-* 等原样保留
}

/** 视图模型：每次 schema 变更后由 parseSchema 重建，绝不手工修改后当作数据源 */
export type NodeKind =
  | 'object' | 'array' | 'tuple'        // 结构
  | 'string' | 'number' | 'integer' | 'boolean' | 'null'
  | 'enum'                               // string/number + enum 的合成视图
  | 'union'                              // oneOf/anyOf/allOf 折叠
  | 'ref'                                // $ref 芯片行
  | 'any';                               // 无 type 的裸 schema（按 object 容错）

export interface SchemaNodeModel {
  id: string;            // JSONPath，与源码同一套地址：'$.properties.user.items'
  key: string | null;    // 字段名；array 的 items 行固定 'items'；元组行是下标字符串
  kind: NodeKind;
  unionKeyword?: 'oneOf' | 'anyOf' | 'allOf';
  variantCount?: number; // 联合变体数（variants 本身也是 SchemaNodeModel，见 children 约定）
  refTarget?: string;    // $ref 原文
  required: boolean;     // 从父节点 required 投影（影子字段；写回时操作父节点）
  children: SchemaNodeModel[]; // object→properties；array→[items]；tuple→prefixItems；union→variants（折叠态默认不展开）
  depth: number;
  raw: JsonSchemaNode;   // 引用原 schema 子树（编辑入口），未 UI 化字段的唯一出处
}

export interface ParseResult {
  root: SchemaNodeModel;
  rows: SchemaNodeModel[];         // 扁平化后的可见行（供树渲染与虚拟滚动）
  warnings: string[];              // required 引用不存在属性等脏数据提示
}
```

编辑器状态（React 侧）：

```ts
export interface EditorState {
  schema: JsonSchemaNode;                       // 唯一可变真相（不可变更新）
  expanded: Set<string>;                        // 展开态
  selectedId: string | null;
  unionSelection: Record<string, number>;       // 联合变体选中态（UI 状态，不进 schema）
  errors: SchemaError[];                        // M5 的回写结果
}
```

## 4. 核心代码摘录

### 4.1 schema → 节点树转换器（M1）

```ts
// src/schema-editor/parse.ts —— 深度优先 + required 投影 + 联合/引用识别
import type { JsonSchemaNode, NodeKind, ParseResult, SchemaNodeModel } from './types';

function kindOf(node: JsonSchemaNode): NodeKind {
  if (typeof node.$ref === 'string') return 'ref';
  if (node.oneOf || node.anyOf || node.allOf) return 'union';
  if (node.enum?.length) return 'enum';
  switch (node.type) {
    case 'object': return 'object';
    case 'array': return Array.isArray(node.prefixItems) ? 'tuple' : 'array';
    case 'string': case 'number': case 'integer': case 'boolean': case 'null':
      return node.type;
    default: return 'any'; // 无 type：按 object 容错（图纸路线 1 的约定）
  }
}

function childEntries(node: JsonSchemaNode): Array<[string, JsonSchemaNode]> {
  // 展示顺序：properties → prefixItems（元组逐项）→ items → 联合变体
  const entries: Array<[string, JsonSchemaNode]> = Object.entries(node.properties ?? {});
  (node.prefixItems ?? []).forEach((it, i) => entries.push([String(i), it]));
  if (node.items && !Array.isArray(node.prefixItems)) entries.push(['items', node.items]);
  const union = node.oneOf ?? node.anyOf ?? node.allOf;
  (union ?? []).forEach((v, i) => entries.push([`variant-${i}`, v]));
  return entries;
}

export function parseSchema(root: JsonSchemaNode): ParseResult {
  const warnings: string[] = [];
  const rows: SchemaNodeModel[] = [];

  function walk(node: JsonSchemaNode, id: string, key: string | null, depth: number,
                parentRequired: Set<string> | null): SchemaNodeModel {
    const model: SchemaNodeModel = {
      id, key, kind: kindOf(node), required: key !== null ? parentRequired?.has(key) ?? false : false,
      children: [], depth, raw: node,
    };
    if (model.kind === 'union') {
      model.unionKeyword = node.oneOf ? 'oneOf' : node.anyOf ? 'anyOf' : 'allOf';
      model.variantCount = (node[model.unionKeyword] ?? []).length;
    }
    if (model.kind === 'ref') model.refTarget = node.$ref;

    rows.push(model);
    // ref 与 union 不自动下钻：ref 防循环展开，union 变体按选中态懒展开（M3 的折叠语义）
    if (model.kind === 'ref' || model.kind === 'union') return model;

    const requiredSet = new Set(node.required ?? []);
    for (const k of node.required ?? []) {
      if (!(k in (node.properties ?? {}))) warnings.push(`${id} 的 required 引用了不存在的属性「${k}」`);
    }
    for (const [childKey, child] of childEntries(node)) {
      model.children.push(
        walk(child, `${id}.${childKey}`, childKey, depth + 1, requiredSet),
      );
    }
    return model;
  }

  const rootModel = walk(root, '$', null, 0, null);
  return { root: rootModel, rows, warnings };
}
```

要点：`rows` 是遍历的副产品（天然有序），树组件直接消费它，不需要二次扁平化；`required` 在 walk 参数里从父节点"带下来"，投影到子行——**读投影、写父级**，这是 required 影子同步的读写分离形态。

### 4.2 $ref 解析器（含环检测，M3）

```ts
// src/schema-editor/resolveRef.ts —— JSON Pointer 寻址 + 链式解析 + 环检测
import type { JsonSchemaNode } from './types';

export interface RefResolution {
  node: JsonSchemaNode | null; // null = 解析失败
  error?: string;              // 失败原因（找不到定义 / 循环引用 / 外部 ref）
  chain: string[];             // 走过的 ref 链：['#/definitions/A', '#/definitions/B']
}

/** '#/definitions/Address' → ['definitions','Address']；'$defs' 同构 */
function refToSegs(ref: string): string[] {
  return ref.slice(2).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~')); // 转义还原
}

export function resolveRef(root: JsonSchemaNode, ref: string, seen: string[] = []): RefResolution {
  if (!ref.startsWith('#/')) {
    return { node: null, error: `仅支持本文件内 $ref（收到 ${ref}；外部文件引用见图纸进阶）`, chain: seen };
  }
  if (seen.includes(ref)) {
    return { node: null, error: `循环引用：${[...seen, ref].join(' → ')}`, chain: seen };
  }
  let cur: unknown = root;
  for (const seg of refToSegs(ref)) {
    if (cur === null || typeof cur !== 'object') {
      return { node: null, error: `ref 路径中途失效：${ref}`, chain: seen };
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (cur === undefined || cur === null || typeof cur !== 'object') {
    return { node: null, error: `找不到定义：${ref}`, chain: seen };
  }
  const target = cur as JsonSchemaNode;
  // 链式引用：目标自身也是 $ref → 带上当前 ref 继续走（seen 即环检测栈）
  if (typeof target.$ref === 'string') {
    return resolveRef(root, target.$ref, [...seen, ref]);
  }
  return { node: target, chain: [...seen, ref] };
}

/** 反向索引：definition 名 → 引用它的节点 path 列表（删除保护 / 改名双写的数据源） */
export function buildRefIndex(root: JsonSchemaNode): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const walk = (node: unknown, path: string): void => {
    if (node === null || typeof node !== 'object') return;
    const n = node as JsonSchemaNode;
    if (typeof n.$ref === 'string') {
      const list = index.get(n.$ref) ?? [];
      list.push(path);
      index.set(n.$ref, list);
    }
    for (const [k, child] of Object.entries(n.properties ?? {})) walk(child, `${path}.properties.${k}`);
    if (n.items && !Array.isArray(n.prefixItems)) walk(n.items, `${path}.items`);
    (n.prefixItems ?? []).forEach((it, i) => walk(it, `${path}.prefixItems.${i}`));
    for (const kw of ['oneOf', 'anyOf', 'allOf'] as const) {
      (n[kw] ?? []).forEach((v, i) => walk(v, `${path}.${kw}.${i}`));
    }
  };
  walk(root, '$');
  for (const [name, def] of Object.entries({ ...(root.definitions as Record<string, JsonSchemaNode> | undefined) ?? {} })) {
    walk(def, `$.definitions.${name}`); // ★ 定义体内部的自引用/互引用也要进索引，否则改名漏改
  }
  return index;
}
```

环检测的判据是 `seen` 数组包含当前 ref 即停——它能同时抓住自引用（A→A，seen 长度 1）与互引用（A→B→A，seen 长度 2）。`chain` 原样进错误信息，用户能看懂环在哪；树渲染层只要"kind === 'ref' 不下钻"就永远不会触发展开级栈溢出，`resolveRef` 是给跳转/校验用的显式出口。

### 4.3 校验错误路径映射（M5）

```ts
// src/schema-editor/errorMap.ts —— ajv schemaPath → 树节点 id
import Ajv, { type ErrorObject } from 'ajv';
import type { JsonSchemaNode } from './types';

const ajv = new Ajv({ allErrors: true, strict: false });

export interface SchemaError {
  nodeId: string;     // 树节点 id（定位失败退化为最近的祖先节点）
  keyword: string;
  message: string;
  raw: ErrorObject;   // 保留原始错误（调试面板用）
}

export function runSelfCheck(schema: JsonSchemaNode): SchemaError[] {
  // 第 1 步：元 schema 校验。失败在这里返回，不进第 2 步（"无法校验"和"校验失败"分层）
  if (!ajv.validateSchema(schema)) {
    return (ajv.errors ?? []).map((e) => ({
      nodeId: schemaPathToNodeId(schema, e.schemaPath, e),
      keyword: e.keyword, message: e.message ?? '', raw: e,
    }));
  }
  // 第 2 步：编译。$ref 笔误在这里抛异常——必须捕获，且定位到含 $ref 的节点
  try {
    ajv.compile(schema);
    return [];
  } catch (err) {
    return [{
      nodeId: locateBadRef(schema, String(err)),
      keyword: '$ref', message: String(err), raw: { keyword: '$ref' } as ErrorObject,
    }];
  }
}

/** '#/properties/user/required' → '$.properties.user.required'，再存在性回溯到真实节点 */
export function schemaPathToNodeId(root: JsonSchemaNode, schemaPath: string, e?: ErrorObject): string {
  // 特判：required 缺字段错误。schemaPath 指向父对象的 required，
  // 但用户要找的是"哪个字段缺了"——params.missingProperty 直接拼出精确地址
  if (e?.keyword === 'required' && typeof (e.params as { missingProperty?: string })?.missingProperty === 'string') {
    const parentSegs = schemaPathToPointer(schemaPath).replace(/\/required$/, '').split('/').filter(Boolean);
    const missing = (e.params as { missingProperty: string }).missingProperty;
    return `$.${[...parentSegs, 'properties', missing].join('.')}`;
    // 注意：字段名含 '.' 时该拼接会歧义——字段名校验拒绝 '.'（坑 4），或升级为转义协议
  }
  let segs = schemaPathToPointer(schemaPath).split('/').filter(Boolean);
  while (segs.length > 0) {
    if (getAtPointer(root, segs) !== undefined) return `$.${segs.join('.')}`;
    segs = segs.slice(0, -1); // 尾段常是关键字（required/minimum/…），逐级上溯到真实节点
  }
  return '$';
}

function schemaPathToPointer(schemaPath: string): string {
  return schemaPath.replace(/^#\/?/, '');
}

function getAtPointer(root: JsonSchemaNode, segs: string[]): unknown {
  let cur: unknown = root;
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[s];
  }
  return cur;
}

/** compile 异常文本里找 '#/definitions/xxx' 线索，定位到第一个引用它的 $ref 节点 */
function locateBadRef(root: JsonSchemaNode, message: string): string {
  const m = /#\/(?:definitions|\$defs)\/[A-Za-z0-9_-]+/.exec(message);
  if (!m) return '$';
  let hit: string | null = null;
  const walk = (node: unknown, path: string): void => {
    if (hit !== null || node === null || typeof node !== 'object') return;
    const n = node as JsonSchemaNode;
    if (n.$ref === m[0]) hit = path;
    for (const [k, child] of Object.entries(n.properties ?? {})) walk(child, `${path}.properties.${k}`);
    if (n.items) walk(n.items, `${path}.items`);
  };
  walk(root, '$');
  return hit ?? '$';
}
```

### 4.4 required 影子同步的最小集（M2/M4 共用）

```ts
// src/schema-editor/ops.ts —— 凡是动 properties 键的操作，required 必须同步（图纸第一坑的收口）
import type { JsonSchemaNode } from './types';

/** 删属性：连 required 一起清 */
export function deleteProperty(root: JsonSchemaNode, parentSegs: string[], key: string): JsonSchemaNode {
  const parent = getAt(root, parentSegs) as JsonSchemaNode;
  const properties = { ...(parent.properties ?? {}) };
  delete properties[key];
  const required = (parent.required ?? []).filter((k) => k !== key);
  const next: JsonSchemaNode = {
    ...parent, properties,
    ...(parent.required ? { required } : {}), // 原本没有 required 就不添空数组
  };
  return setAt(root, parentSegs, next);
}

/** 改键名：properties 键迁移 + required 键名同步替换（保位置） */
export function renameProperty(root: JsonSchemaNode, parentSegs: string[], from: string, to: string): JsonSchemaNode {
  const parent = getAt(root, parentSegs) as JsonSchemaNode;
  if (parent.properties?.[to]) return root; // 重名拒绝
  const entries = Object.entries(parent.properties ?? {}).map(([k, v]) => [k === from ? to : k, v] as const);
  const next: JsonSchemaNode = { ...parent, properties: Object.fromEntries(entries) };
  if ((parent.required ?? []).includes(from)) {
    next.required = (parent.required ?? []).map((k) => (k === from ? to : k));
  }
  return setAt(root, parentSegs, next);
}

// getAt / setAt：第一辑 00 手册 §M2 的实现原样搬入（copy-on-write 路径写入），此处不重复
declare function getAt(root: JsonSchemaNode, segs: string[]): unknown;
declare function setAt(root: JsonSchemaNode, segs: string[], value: unknown): JsonSchemaNode;
```

纪律：组件层**禁止**直接改 `properties` 键——删、改名、移动全部走本文件收口的三个函数，这是图纸"required 与 properties 影子同步"坑的结构化修法。

### 4.5 联合变体的切换与编辑写回（M3）

```ts
// src/schema-editor/unionOps.ts —— oneOf/anyOf 的"折叠为联合选择"读写两端
import type { JsonSchemaNode } from './types';

type UnionKeyword = 'oneOf' | 'anyOf' | 'allOf';

function unionKeywordOf(node: JsonSchemaNode): UnionKeyword | null {
  if (node.oneOf) return 'oneOf';
  if (node.anyOf) return 'anyOf';
  if (node.allOf) return 'allOf';
  return null;
}

/**
 * 读端：变体的行 id。变体 i 的地址 = `${unionNodeId}.${keyword}.${i}`，
 * 与 parseSchema 的 walk 命名一致（childEntries 里 `variant-${i}` 是展示键，
 * 写回用 keyword 索引寻址——展示键与数据键分离，防止 UI 命名泄漏进协议）。
 */
export function variantPath(unionNodeId: string, node: JsonSchemaNode, index: number): string {
  const kw = unionKeywordOf(node);
  if (!kw) throw new Error(`${unionNodeId} 不是联合节点`);
  return `${unionNodeId}.${kw}.${index}`;
}

/**
 * 写端：编辑"当前选中变体"的内部字段 = 编辑 schema.oneOf[i] 子树。
 * 与普通节点走同一套 setAt/getAt——变体没有任何特殊写路径，折叠只是渲染层语义。
 * unionNodeId 形如 '$.properties.user'；variantSegs 即 pathToSegs(variantPath(...)) + 目标子段。
 */
export function patchVariant(
  root: JsonSchemaNode,
  unionNodeId: string,
  index: number,
  patch: (variant: JsonSchemaNode) => JsonSchemaNode, // 对变体子树的纯修改
): JsonSchemaNode {
  const segs = unionNodeId.replace(/^\$\.?/, '').split('.').filter(Boolean);
  let node = getAt(root, segs) as JsonSchemaNode;
  const kw = unionKeywordOf(node);
  if (!kw) throw new Error(`${unionNodeId} 不是联合节点`);
  const variants = [...((node[kw] as JsonSchemaNode[]) ?? [])];
  if (index < 0 || index >= variants.length) return root;
  variants[index] = patch(variants[index]!);
  node = { ...node, [kw]: variants } as JsonSchemaNode;
  return setAt(root, segs, node);
}

// 选中态约定（EditorState.unionSelection）：
//   读：unionSelection[nodeId] ?? 0 —— UI 状态，切变体只改这个 Record，不碰 schema；
//   持久化（可选）：写进 x-selected-variant 扩展字段，导出后端需协商忽略；
//   校验闭环：切换变体后 M5 的 ajv 编译仍用完整 oneOf（校验语义是"任一满足"，
//   编辑视图的"当前变体"只决定表单预览渲染哪一份，不影响协议）。
declare function getAt(root: JsonSchemaNode, segs: string[]): unknown;
declare function setAt(root: JsonSchemaNode, segs: string[], value: unknown): JsonSchemaNode;
```

要点：`allOf` 的 UI 语义不同——它不是"选一个"而是"全部叠加"，编辑器按"多面板并列"渲染（同一套 variants 数据、无切换器）；三个关键字共享 `variantPath/patchVariant` 的寻址与写回，差异只在渲染层。

## 5. 坑与调试

1. **幽灵必填项**（症状：预览表单里标红一个已删除的字段）。根因：`required` 挂在父对象上，删 `properties` 键时没同步清 `required`。修法：§4.4 的收口三函数；单测固定覆盖"删字段 → required 数组少一项"。
2. **type 切换后元字段残留**（症状：导出的 schema 被严格校验器拒绝——string 节点上还挂着 `items`）。根因：Setter 各改各的，没人负责联动清洗。修法：type 变更统一走面板 `patch` 里的清洗段（非标量删 enum、非 array 删 items、非 object 删 properties/required、容器删 default）。
3. **联合变体选中态写进 schema**（症状：导出的 schema 多了莫名字段、后端拒绝）。根因：把 UI 状态（当前看哪个变体）误当成协议数据。修法：选中态进 `unionSelection`（编辑器状态）；确要持久化走 `x-selected-variant` 扩展字段并在团队内成文。
4. **字段名含 `.` 时路径错乱**（症状：`user.name` 作为字段名被切成两级）。根因：本编辑器的行 id 用 `.` 拼接，与字段名字符集冲突。修法：字段名校验（新增/改名时拒绝 `.` 与 `$` 开头）；或升级为 JSON Pointer 转义协议（`~1` `/`、`~2` `.`）——图纸用 `~1` 处理 `/`，本手册留作扩展练习。
5. **拖拽跨级移动后字段"消失"**（症状：树上看不到，预览里却有）。根因：先删后插的目标路径补偿写错，节点被插到了折叠的父级下。修法：`moveProperty` 里删除后重新 `getAt` 拿新引用（父对象已换引用），插入后自动展开目标父级（图纸路线 1 的 `onExpandedChange` 即时反馈）。
6. **compile 异常被当校验结果**（症状：面板显示"校验失败"但拿不到任何错误对象）。根因：`ajv.compile` 抛异常是"无法编译"（$ref 笔误、结构非法），不是 `validate` 返回 false。修法：两态分层——异常单独成一条错误并定位到 `$ref` 节点（§4.3 第 2 步）。
7. **全链路每键入重跑导致打字卡顿**（症状：源码打字每键一顿）。根因：parse + ajv + 树全量重渲染挂在 onChange 上。修法：三层防抖（解析 300ms、ajv 300ms、树用冻结快照兜底）；行组件 `React.memo`；`rows` 按 id 稳定 key。
8. **反向索引漏掉定义体内部引用**（症状：改 definition 名后 ajv 报 `can't resolve reference`）。根因：收集引用时没遍历 `definitions` 子树自身。修法：`buildRefIndex` 必须走定义体（§4.2 末尾的循环）；改名 = 双写（重建 definitions 键序 + 按索引精确替换每个 `$ref` 整值，绝不做全文子串替换——`Address` 会殃及 `AddressList`）。

调试口：树行加 `data-node-id={row.id}`、错误条目点击时 `setSelectedId + 展开祖先链`——两件小事做完，"错误 → 定位"链路的排查成本降一个数量级。

## 6. 自测清单

- [ ] M1：嵌套 fixture 的 rows/depth/required 投影单测全绿；round-trip 零丢失
- [ ] M2：六种类型面板条件渲染正确；type 切换确认 + 清洗；default 不在 enum 内有行内警示
- [ ] M3：oneOf 变体切换只影响编辑视图，导出仍含完整 oneOf 数组；$ref 正常/链式/自环/互环/笔误五类用例全绿
- [ ] M3：点击 ref 芯片三视图同步跳转（树展开选中、源码高亮、面板切换）
- [ ] M4：同级排序 / 跨级移动（键冲突改名）/ 防拖入子树三例正确；元组排序导出比对一致
- [ ] M4：删字段、改键名后 required 数组同步（单测断言）
- [ ] M5：schemaPath → 节点 id 映射（含 required 特判、上溯回退）单测全绿；错误点击滚动定位
- [ ] M5：compile 异常与 validateSchema 失败两态分层展示，互不覆盖
- [ ] M6：导入非法 JSON 拒绝并保留旧树；导出两次 diff 为空；`node scripts/verify-export.mjs` 退出码 0
- [ ] 性能：500 属性节点的 schema，树上打字/拖拽无可感知卡顿（Profiler 无全树 update）
- [ ] 诚实性：手工在源码视图写 `minLength`，切回树视图再导出——该字段仍在
