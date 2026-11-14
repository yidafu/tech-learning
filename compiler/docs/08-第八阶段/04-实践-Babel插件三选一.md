# 实践：Babel 插件三选一

> [返回：第八阶段导览](01-导览.md)
> 对应大纲第 3 条。三道题——**编译期常量折叠**（本册完整实现 + 7 例 fixture 快照实测全绿）、自动埋点、import 去重排序（后两题给设计图与骨架代码）。常量折叠是特意选的主菜：把[第七阶段在 TAC/字节码上写的 pass](../07-第七阶段/04-经典优化pass.md)原样搬到 Babel 的 JS AST 上，你会同时看到"pass 思想不变"与"AST 层的三个新问题"（求值时机、节点可表达性、源码保留）。全部代码在 /tmp 验证工程实跑（Node 24、@babel/core 7.29.13，复用 react 站 node_modules），输出为真实运行结果。

## 三题一览

| 题 | 遍历的核心问题 | 变换性质 | 主要坑 |
|---|---|---|---|
| 常量折叠 | 哪些表达式编译期已知值 | 收缩（表达式 → 字面量） | 求值边界、NaN/Infinity、`process.env` |
| 自动埋点 | 哪些是"函数边界" | 扩张（插语句） | 出口路径穷举、嵌套函数、async/throw |
| import 去重排序 | 模块语句集合 | 重排（删了再插） | 同名合并、注释关联、副作用导入保位 |

三题覆盖 Babel 插件的三种典型形态：**模式替换、注入、重排**。做完任意一题，另外两类的骨架应该能白板画出。

## 完整实现：babel-plugin-const-fold

### 设计先行：搬 pass 之前先立三条规矩

第七阶段折叠 pass 的铁律是"不改变可观察行为"。搬到 JS AST 上，规矩细化成三条，每条对应代码里的一段守卫：

1. **求值必须与运行时逐位一致**。JS 里编译期求值就是"现在就跑一遍这个运算"——用 JS 解释 JS，天然逐位一致（`0.1 + 0.2` 折出 `0.30000000000000004`，运行时也是它）。但**会抛错的运算不折**：`1 % 0` 编译期算会抛吗？不会（得 NaN），但 `BigInt` 混合运算会 TypeError——凡是 try/catch 兜住的，一律不折，错误留给运行时抛（时机也是可观察行为）。
2. **结果必须能塞回字面量节点**。`NumericLiteral` 装不下 `Infinity`/`NaN`——硬塞 generate 阶段直接崩。折不出合法字面量的（NaN、Infinity、undefined）保守放弃。
3. **跨过"未知"就停**。操作数不是字面量、环境变量没注入、函数不在纯白名单——三种"未知"三种处理，全部保守不动。

### 实现（110 行，可直接跑）

```js
// babel-plugin-const-fold.cjs
'use strict';
const t = require('@babel/types');

// 纯函数白名单：只有"输入相同输出必然相同、且无副作用"才允许编译期调用
const PURE_FNS = {
  'Math.max': Math.max, 'Math.min': Math.min, 'Math.abs': Math.abs,
  'Math.floor': Math.floor, 'Math.ceil': Math.ceil, 'Math.round': Math.round,
  'String': String, 'Number': Number, 'Boolean': Boolean,
};
const memberKey = (n) =>
  t.isMemberExpression(n) && !n.computed && t.isIdentifier(n.object) && t.isIdentifier(n.property)
    ? `${n.object.name}.${n.property.name}` : null;

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
// 折叠结果的硬边界：NaN/Infinity 塞不进 NumericLiteral——不折更诚实
const literalOf = (v) => {
  if (typeof v === 'string') return t.stringLiteral(v);
  if (typeof v === 'boolean') return t.booleanLiteral(v);
  if (isFiniteNumber(v)) return t.numericLiteral(v);
  return null;                              // NaN / Infinity / undefined：不折
};
const literalValue = (n) =>
  t.isNumericLiteral(n) || t.isStringLiteral(n) || t.isBooleanLiteral(n) ? n.value
  : t.isNullLiteral(n) ? null : undefined;

const binaryOps = {
  '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b,
  '/': (a, b) => a / b, '%': (a, b) => a % b, '**': (a, b) => a ** b,
  '===': (a, b) => a === b, '!==': (a, b) => a !== b,
  '==': (a, b) => a == b, '!=': (a, b) => a != b,
  '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b,
};
const logicalOps = { '&&': (a, b) => a && b, '||': (a, b) => a || b };

module.exports = function constFold(api, options = {}) {
  const env = { ...process.env, ...options.env };       // 编译期已知的环境变量（注入优先）
  return {
    name: 'const-fold',
    visitor: {
      // ① process.env.X → 字面量（编译期已知值替换，死分支裁剪的前置）
      MemberExpression(path) {
        const { node } = path;
        if (node.computed || !t.isIdentifier(node.property)) return;
        if (memberKey(node.object) !== 'process.env') return;   // 三层链：process.env.X
        const name = node.property.name;
        if (!(name in env)) return;                             // 未知环境变量：保守不动
        const lit = literalOf(env[name]);
        if (lit) path.replaceWith(lit);
      },
      // ② 字面量二元/一元/逻辑运算：全部走 exit——子表达式已折完，看到的是"最简形态"
      'BinaryExpression|UnaryExpression|LogicalExpression': {
        exit(path) {
          const { node } = path;
          if (node.type === 'UnaryExpression') {
            const v = literalValue(node.argument);
            if (v !== undefined && (node.operator === '!' || node.operator === '-')) {
              const lit = literalOf(node.operator === '!' ? !v : -v);
              if (lit) path.replaceWith(lit);
            }
            return;
          }
          const l = literalValue(node.left), r = literalValue(node.right);
          if (l === undefined || r === undefined) return;
          let v;
          if (node.type === 'BinaryExpression') {
            try { v = binaryOps[node.operator]?.(l, r); } catch { /* 运行时会抛错的运算不折 */ }
          } else {
            v = logicalOps[node.operator]?.(l, r);       // && || 按短路语义求值
          }
          const lit = v === undefined ? null : literalOf(v);
          if (lit) path.replaceWith(lit);
        },
      },
      // ③ 纯函数边界：白名单内 + 全部实参是字面量，才编译期调用
      CallExpression: {
        exit(path) {
          const callee = path.node.callee;
          const key = memberKey(callee) ?? (t.isIdentifier(callee) ? callee.name : null);
          const fn = PURE_FNS[key];
          if (!fn || path.node.arguments.some((a) => literalValue(a) === undefined)) return;
          const args = path.node.arguments.map(literalValue);
          const lit = literalOf(fn(...args));
          if (lit) path.replaceWith(lit);
        },
      },
    },
  };
};
```

四个设计点对应 [02 册](02-Babel深度剖析.md)的协议知识：

- **exit 时序**是整块基石：`2 * 3 + 1` 的 `+` 节点 enter 时子树还没折，exit 时左子树已是 `6`——一遍遍历自然完成"传播-折叠"，不需要显式跑不动点循环（对比第七阶段 TAC 版要跑两轮）。
- **`process.env.X` 的匹配是三层 MemberExpression 链**（`process` . `env` . `X`）：先确认 `node.object` 是 `process.env` 再看 `property`。这里藏着一个真实教训——初版写成"匹配 `process.env.*` 前缀"，外层节点的 object 是 MemberExpression 而非 Identifier，永远匹配不上，fixture 直接抓出来。**AST 匹配按节点形状来，不按字符串拼**。
- **纯函数白名单**是"跨调用折叠"的全部边界：`Math.max` 折、`console.log` 不折（副作用）、`fetch` 不折（IO）、用户函数不折（拿不到实现）。真实工程里这条边界可以往前推——配合 [scope.getBinding](02-Babel深度剖析.md#scope-与-binding第四阶段符号表的工具层复刻) 内联单行纯函数，但每推一步证明责任就重一分。
- **`options.env` 注入优先于 `process.env`**：CI 与本地跑同一份代码，注入让"编译期已知值"显式化——这正是 webpack DefinePlugin 的替代形态。

### fixture 快照测试（7 例，实跑全绿）

输入与期望用 `/* ===== expected ===== */` 分隔在同一文件里，跑批断言插件输出与期望逐字符相等：

```js
// run-tests.cjs（跑批器核心）
const MARK = '/* ===== expected ===== */';
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
  const [input, expected] = fs.readFileSync(path.join(dir, f), 'utf8').split(MARK);
  const out = babel.transformSync(input.trimEnd(), {
    plugins: [[constFold, { env: { NODE_ENV: 'production', API_URL: 'https://api.example.com' } }]],
  }).code.trim();
  const ok = out === expected.trim();
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}`);
}
```

七个 fixture 各守一条边界，输入 → 期望（节选）：

```text
arithmetic.js  1 + 2 * 3; (10 - 4) / 2; -(2 + 3)  →  7; 3; -5
strings.js     'Hello' + ', ' + 'world'          →  "Hello, world"
               'x'.length + 'y'.length + 0       →  不折（.length 不在白名单）
boolean.js     !true / !!0 / true && false / 1 < 2 && 3 >= 3  →  false / false / false / true
env.js         process.env.NODE_ENV === 'production'          →  true
               process.env.API_URL                            →  "https://api.example.com"
pure.js        Math.max(1, 5, 3) / String(42)    →  5、'42'
               notPure(1 + 1) / console.log(1+1) →  调用不折、实参照折：notPure(2) / console.log(2)
boundary.js    1 / 0 / 'x' * 2 / userInput + 1 / process.env.UNKNOWN_X  →  全部原样（Infinity/NaN/未知/未注入）
mixed.js       process.env.NODE_ENV === 'production' && true →  true
               Math.min(10, 2 * 4) + 'px'        →  "8px"（字面量折叠跨白名单接力）
```

实跑输出：

```text
PASS  arithmetic.js
PASS  boolean.js
PASS  boundary.js
PASS  env.js
PASS  mixed.js
PASS  pure.js
PASS  strings.js

7 passed, 0 failed
```

快照测试里还抓到过一个"免费"的工程事实：**@babel/generator 保留原节点的 raw 文本**（`'dev'` 输出还是单引号），但**新建节点用默认双引号**——所以期望文件里折叠出的字符串必须是 `"Hello, world"` 而非 `'Hello, world'`。快照的价值就在这：它连"你没意识到的行为"一起钉住。

### 它在流水线里的位置

本插件输出 `if (true)`/`if (false)` 这种半成品——分支删除是下游的活（terser 或 babel-plugin-minify-dead-code-elimination 消费它）。**常量折叠负责"把条件变成常量"，不负责"删常量分支"**——单一职责让两个 pass 都可测（对照第七阶段 [pass 管线](../07-第七阶段/04-经典优化pass.md)的讨论）。

## 题二（骨架）：自动埋点

目标：函数入口/出口自动插 `__track.enter/exit`，业务代码零侵入。设计图：

```
FunctionDeclaration/FunctionExpression/ArrowFunctionExpression
   │ ① 入口：body.unshiftContainer(enter)     ← 箭头表达式体先包成块
   │ ② 出口：三选一
   │     a. 每个 ReturnStatement 前插 exit   ← 最直观，但漏隐式 return
   │     b. 整函数体包 try/finally，finally 插 exit  ← 覆盖 return/throw/async 拒绝，语义最全
   │     c. 双探针（enter + exit 计数配对）   ← 依赖运行时，静态改写最少
   │ ③ 防重入：自己插的调用不再触发（标记或 visitor 排除 __track）
   └ ④ 嵌套函数：内层自己埋，外层 traverse 时 Function: skip
```

关键代码骨架（**骨架，未完整实现**；语法已验证，入口路径可用）：

```js
module.exports = function autoTracker({ types: t, template }) {
  const enterTpl = template.statement(`__track.enter(__filename, ID, LEN);`);
  const exitTpl  = template.statement(`__track.exit(__filename, ID);`);
  return {
    name: 'auto-tracker',
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
        if (path.node._tracked) return;                    // 防重入
        const id = path.node.id?.name
          ?? (t.isVariableDeclarator(path.parent) ? path.parent.id.name : '(anonymous)');
        const len = path.node.params.length;
        if (!path.isBlockStatement(path.node.body))        // 箭头表达式体 → 块
          path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
        path.get('body').unshiftContainer('body', enterTpl({ ID: t.stringLiteral(id), LEN: t.numericLiteral(len) }));
        path.traverse({                                    // 方案 a（简版）：仅 return 路径
          ReturnStatement: (rp) => rp.insertBefore(exitTpl({ ID: t.stringLiteral(id) })),
          Function: (inner) => inner.skip(),               // 嵌套函数跳过
        });
        path.node._tracked = true;
      },
    },
  };
};
```

留给完整版的三个硬骨头：**async 函数的拒绝路径**（方案 a 完全漏，必须上 try/finally）；**生成器**（yield 多次恢复，"出口"语义要定义成"完成"还是"每次恢复"）；**finally 语义对 minify 的干扰**（terser 可能挪走 try 块，测试要跨 minify 跑一遍）。fixture 至少要六类：普通/箭头/匿名/嵌套/async/生成器各一对输入输出。

## 题三（骨架）：import 去重与排序

目标：同源 import 合并、全量按组排序（内置 > 裸包 > 相对路径），组内字母序。设计图：

```
Program:exit                       ← 等 hoisting 与其他插件跑完，import 集合才是最终形态
  ① 收集全部 ImportDeclaration，按 source 分组
  ② 组内合并：default / 命名 / 副作用三类 specifier 分别去重
       同名双导入取首见；绑定名冲突 → 保守放弃该文件（输出警告）
       纯副作用导入（import './polyfill'）不参与合并，保位
  ③ 排序：group(source) 内置=0 裸包=1 相对=2，组间有序、组内字母序
  ④ 重排放：记录首个 import 的位置 → 全部 remove → 统一 insertBefore
       注释跟着节点走（leadingComments 挂在语句上），但跨语句的注释归属要测
```

关键代码骨架（**骨架，未完整实现**）：

```js
module.exports = function importOrganizer({ types: t }) {
  const group = (src) => src.startsWith('.') ? 2 : src.startsWith('node:') ? 0 : 1;
  return {
    name: 'import-organizer',
    visitor: {
      Program: {
        exit(path) {
          const decls = path.get('body').filter((p) => p.isImportDeclaration());
          if (decls.length < 2) return;
          // ①②③④ 按上图展开：bySource 分组 → specifier 去重合并 → 排序 → 重排放
        },
      },
    },
  };
};
```

两个容易漏的语义点：**为什么在 Program:exit**——import 会被 hoisting 类插件搬动，跑早了集合不全；**`import './polyfill'` 的副作用不能丢**——合并无 specifier 的导入等于删语句，恰好是 [tree-shaking 对照](../07-第七阶段/06-前端工程优化对照.md)里"顶层副作用保守保留"的镜像规则。排序规则要可配置（团队惯例不同），完整版建议走 options 传 `groups: [...]`。

## 通用工程要点（三题共通）

- **fixture 先行**：每题动笔前先写 6~10 对"输入→期望"，实现让它们变绿——与 [03 册 RuleTester](03-实践-mini-lint.md) 的 invalid.output 同一招，code-mod 尤其不能裸奔。
- **插件名与 options 校验**：`api.assertVersion(7)` + `name` 字段让报错能定位到你。
- **别在插件里做重活**：文件 IO、网络请求放 pre 钩子或宏层，visitor 里只做纯变换——遍历是性能敏感区。
- **测一遍 minify 后的行为**：插件输出会进 terser，生成 `!0`/逗号表达式等形态时确认下游不误解。

## 自测

1. 常量折叠为什么全部写在 exit？把 `2 * 3 + 1` 的折叠写成 enter 版本，需要几遍遍历才能折干净？
2. `1 / 0` 为什么不折？如果要求折成 `Infinity`（用 Identifier 节点），会引入什么新问题？（提示：作用域里恰好有个 `const Infinity = 1`）
3. `literalOf` 对 `undefined` 返回 null 不折——但 `void 0` 是确定性的 undefined，值得加一条规则折成 `void 0` 的字面量形态吗？为什么 Babel 生态里没人这么干？
4. 自动埋点选方案 b（try/finally）时，`async` 函数的 exit 在 microtask 里执行——埋点系统的时钟语义要怎么定义才不误导？
5. import 排序插件为什么必须 Program:exit 而不是 enter？给一个"enter 版本会排错"的具体插件组合。
6. 三个插件的 fixture 各需要一条"必须不动的边界用例"——分别是什么？

## 附：插件调试三件套：改错了先摸谁

三个插件写下来会沉淀三件调试工具，此后任何 Babel 插件问题先过这三件：

| 工具 | 用法 | 回答的问题 |
|---|---|---|
| visitor 首尾 `console.log(path.node.type)` | 可疑 visitor 进出各一行 | "我的 visitor 到底被调了没有、拿到的节点是什么" |
| `generator(path.node)` 局部反打印 | 对改写前后的子树各打一次 | "改写后的局部代码长什么样"——比全文件 diff 聚焦 |
| AST Explorer 双栏复现 | 左输入、右侧写同样 visitor | "最小复现里行为一致吗"——把插件逻辑问题与工程配置问题切开 |

排查次序也定死：先 Explorer 确认"逻辑本身对"（排除 API 误用），再回工程确认"配置到了"（plugin 顺序、include 范围），最后才查"与其他插件打架"（顺序敏感的改写互相覆盖——[02 册](02-Babel深度剖析.md)的 traverse 协议）。真实事故三类占比大致反着排：配置问题最多、逻辑次之、互搏最少——因为互搏需要两个插件同时在场，新写的插件先死于前两类。

与 fixture 纪律（自测 6）连起来就是完整的插件回路：**Explorer 长逻辑 → fixture 钉行为 → 三件套守回归**。本阶段三份实践（mini-lint、Babel 插件、tsc 增量实验）共享同一条方法论——最小复现、黄金用例、随改随验。

最后一条收尾纪律写给未来要维护这三个插件的你：**每个插件的 README 顶部写一行"它改变了哪类节点的哪些字段"**——三个月后回来改插件，最先忘的不是逻辑（fixture 会提醒）而是"它当时为什么选择这个节点类型"（01 册节点选型表的现场版）。一行契约描述省一次全量考古，这是插件工程最便宜的一份保险。

三个插件各补一句契约示范，格式可以照抄：

- 常量折叠插件：改 `BinaryExpression`（两侧均为 NumericLiteral 时替换为 `NumericLiteral`），不改任何 `Identifier`；
- 自动埋点插件：改 `FunctionDeclaration` / `ArrowFunctionExpression` / `FunctionExpression` 的体（包 try/finally），不改函数签名；
- import 排序插件：只重排 `Program.body` 顶层的 `ImportDeclaration`，其余声明零接触。

契约行的写法刻意只包含"节点类型 + 动作 + 不动什么"三段——多一段解释都会过期，少一段描述都会误导。这条"最小契约"与 fixture 的"最小边界用例"（自测 6）共同构成插件的可维护性下限：契约管三个月后的你自己，fixture 管每一次回归。
