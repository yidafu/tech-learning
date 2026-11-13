# 实践：从零实现 mini-lint

> [返回：第八阶段导览](01-导览.md)
> 对应大纲第 2 条。[上一册](02-Babel深度剖析.md)读懂了 Babel 的 traverse；本册反着来——**不用 @babel/traverse，自己写 25 行遍历器**，配上规则引擎、诊断与 autofix，得到一个三规则 mini-lint，全部单测实跑全绿（39 项断言，Node 24 + @babel/parser 7.29.13）。读完你应该能对照说清 ESLint 的 Linter / RuleTester 到底在干什么，以及它们各自为什么长那样。

## 规则引擎三要素

lint 工具= 遍历器 + 规则 + 诊断。拆开看：

1. **遍历器**：给每条规则一个"看到每个 AST 节点"的机会——规则的输入接口。
2. **规则**：`{ meta, create(context) → visitor }`——匹配到坏模式就 `context.report()`。规则之间互不知晓。
3. **诊断 + autofix**：report 落成 `{ 位置, 消息, 严重级, fix }`；fix 是**文本区间替换** `{ range: [start, end], text }`，不是 AST 变换——ESLint 的 autofix 永远在文本层做（比 Babel 的 replaceWith 保守），因为 fix 之后还要重新 parse 验证。

与 ESLint 的架构对照（概念级，不装包）：

| 本册 mini-lint | ESLint 对应物 | 备注 |
|---|---|---|
| `traverse(ast, hooks)` | eslint 的 Linter 内部遍历（基于 espree AST） | ESLint 有完整的 SourceCode/scope-manager，我们自写 |
| `Linter.verify(code, rules, config)` | `Linter#verify` | 规则实例化 → visitor 合并 → 一次遍历 |
| `Linter.verifyAndFix(...)` | `Linter#verifyAndFix` / `eslint --fix` | 多轮"修→再验"直到收敛 |
| `context.report({ node, message, fix })` | `context.report()` | ESLint 的 message 支持 `{placeholder}` 模板，我们用字符串 |
| `rules` 表里每条规则的 `meta` | rule 的 `meta.docs / meta.fixable` | `fixable: 'code'` 才允许 --fix |
| `RuleTester.run(name, rule, tests)` | `RuleTester` | 规则的单测契约：valid 零诊断、invalid 逐条断言 |

关键设计决策与 ESLint 一致：**规则返回的 visitor 被合并进一张大表，全树只遍历一次**——100 条规则的成本 ≈ 1 次遍历 + 100 次回调，而不是 100 次遍历。

## 要素一：遍历器（25 行）

不依赖 @babel/traverse，遍历器只需要"深度优先 + enter/exit + 父子信息"：

```js
const SKIP_KEYS = new Set(['loc', 'start', 'end', 'range', 'leadingComments',
  'trailingComments', 'innerComments', 'extra', 'tokens', 'comments']);
function traverse(ast, hooks) {                    // hooks: nodeType → { enter: [fn], exit: [fn] }
  const seen = new WeakSet();                      // 同一节点对象只访问一次（见下）
  function visit(node, parent, key) {
    if (!node || typeof node.type !== 'string' || seen.has(node)) return;
    seen.add(node);
    const h = hooks.get(node.type);
    if (h) for (const fn of h.enter ?? []) fn(node, parent, key);
    for (const k of Object.keys(node)) {
      if (SKIP_KEYS.has(k)) continue;
      const c = node[k];
      if (Array.isArray(c)) for (const child of c) visit(child, node, k);
      else if (c && typeof c.type === 'string') visit(c, node, k);
    }
    if (h) for (const fn of h.exit ?? []) fn(node, parent, key);
  }
  visit(ast, null, null);
}
```

三个决策点：**回调签名 `(node, parent, key)`**——parent/key 让规则能判断"这个 Identifier 是引用还是属性名"（no-unused-vars 全靠它）；**enter/exit 成对**——跨节点统计类规则（未用变量）必须等子树处理完在 exit 收尾；**WeakSet 去重**——`{ x }` shorthand 属性的 key 和 value 是同一个节点对象，不去重会重复计数（Babel AST 的真实坑，[02 册](02-Babel深度剖析.md)的 path 体系在框架层处理了同一问题）。

## 要素三：诊断与 autofix（先讲，规则要用它）

```js
const locOf = (source, node) => node.loc            // AST 有 loc 直接用（@babel/parser 默认给）
  ? { line: node.loc.start.line, column: node.loc.start.column + 1 }
  : (() => { /* 按 node.start 偏移逐行换算的兜底 */ })();

function applyFixes(source, messages) {             // fix = { range:[start,end], text }；自后向前应用
  let out = source;
  for (const m of [...messages].filter(m => m.fix)
                .sort((a, b) => b.fix.range[0] - a.fix.range[0]))   // 从大区间（后面）开始改，
    out = out.slice(0, m.fix.range[0]) + m.fix.text + out.slice(m.fix.range[1]);  // 前面的偏移不失效
  return out;
}
```

autofix 的设计守则三条：**文本区间而不是 AST**（fix 之后重新 parse，天然防改坏）；**区间互不重叠**由规则保证（同一条规则对相邻节点报 fix 要留缝）；**从后往前应用**让多个 fix 的偏移互不干扰。ESLint 的实现多一层"跳过重叠 fix"的保护，原则相同。

## 要素二：Linter 编排

```js
class Linter {
  constructor(parse) { this._parse = parse; }       // parser 注入：引擎零依赖，谁用谁配
  verify(code, rules, config) {
    const ast = this._parse(code);
    const messages = [];
    const hooks = new Map();
    const add = (type, phase, fn) => {
      if (!hooks.has(type)) hooks.set(type, {});
      const slot = hooks.get(type);
      (slot[phase] ??= []).push(fn);
    };
    for (const [name, rule] of Object.entries(rules)) {
      const level = config.rules[name];
      if (!level || level === 'off') continue;      // 规则开关：error/warn/off 三态
      const context = {
        source: code,
        report: ({ node, message, fix }) => messages.push({
          rule: name, severity: level === 'warn' ? 1 : 2, message, fix: fix ?? null,
          ...locOf(code, node),
        }),
      };
      for (const [selector, fn] of Object.entries(rule.create(context))) {
        const [type, phase = 'enter'] = selector.split(':');   // 'Program:exit' → exit 钩子
        add(type, phase, fn);
      }
    }
    traverse(ast, hooks);
    return messages.sort((a, b) => a.line - b.line || a.column - b.column);
  }
  verifyAndFix(code, rules, config, maxPasses = 10) {
    let output = code, fixed = false, passes = 0;
    while (passes++ < maxPasses) {                  // 修一轮 → 再验一轮，直到不再产生新 fix
      const messages = this.verify(output, rules, config);
      if (!messages.some(m => m.fix)) return { output, messages, fixed, passes };
      output = applyFixes(output, messages); fixed = true;
    }
    return { output, messages: this.verify(output, rules, config), fixed, passes };
  }
}
```

`selector.split(':')` 解析 `'Program:exit'` 这种 ESLint 同款语法；`context` 闭包进规则——规则拿不到引擎内部，只能通过 report 说话。**verifyAndFix 的多轮循环是必要的**：一个 fix 可能制造新的可修问题（`var a; var b;` 删第一条影响第二条的位置），ESLint 同样跑最多 10 轮直到收敛。

## 三条规则

### 规则一：no-var（autofix 的最简形态）

```js
const noVar = {
  meta: { name: 'no-var', fixable: 'code' },
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== 'var') return;
        context.report({
          node,
          message: "Unexpected var, use 'let' or 'const' instead.",
          fix: { range: [node.start, node.start + 3], text: 'let' },   // 'var' 3 字符就地换
        });
      },
    };
  },
};
```

### 规则二：eqeqeq（条件 fix——不是所有诊断都该给修法）

`==` 改 `===` 并非总是安全：`x == null` 是惯用的"null 或 undefined"判断，机械改写会改变行为。**只在能证明不改错时才给 fix**：

```js
const literalKind = (n) =>
  n.type === 'StringLiteral' ? 'string' :
  n.type === 'NumericLiteral' ? 'number' :
  (n.type === 'BooleanLiteral' || n.type === 'NullLiteral') ? n.type.replace('Literal', '').toLowerCase() : null;

const eqeqeq = {
  meta: { name: 'eqeqeq', fixable: 'code' },
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== '==' && node.operator !== '!=') return;
        const want = node.operator === '==' ? '===' : '!==';
        const fixable = (() => {                    // 两侧都是同类字面量 → 改 === 必然不改语义
          const lk = literalKind(node.left), rk = literalKind(node.right);
          return lk && rk && lk === rk;
        })();
        context.report({
          node,
          message: `Expected '${want}' and instead saw '${node.operator}'.`,
          fix: fixable ? { range: [node.left.end, node.right.start], text: ` ${want} ` } : null,
        });
      },
    };
  },
};
```

fix 区间取 `[left.end, right.start]`（整个运算符连同两侧空白），文本 `' === '`——比精确替换 `==` 两个字符更稳，不吃正则/注释的亏。ESLint 真实的 eqeqeq 还有 `smart` 模式（字面量与变量比较时也放行），边界思路一脉相承：**fixable 是规则 meta 的一部分，修不修得了逐诊断决定**。

### 规则三：no-unused-vars（作用域分析 + 不可 fix）

最重的一条。直觉做法"遍历时看到声明记一个、看到引用加一"会栽在 **hoisting** 上：`function f() { return n; var n = 1; }` 里引用先于声明出现，"先声明后引用"的假设直接漏报。正确解法是第四阶段符号表的老套路——**先收集后解析（两阶段）**：

```js
const noUnusedVars = {
  meta: { name: 'no-unused-vars', fixable: null },  // 删声明需要类型系统兜底，不可 fix
  create(context) {
    const decls = [];                                // { name, node, depth }
    const refs = [];                                 // { name, depth }
    let depth = -1;                                  // Program 内为 0；每进函数 +1
    const fnEnter = (node) => {
      if (node.id && node.type === 'FunctionDeclaration')
        decls.push({ name: node.id.name, node: node.id, depth });   // 函数名绑定在外层
      depth++;
      for (const p of node.params)
        if (p.type === 'Identifier') decls.push({ name: p.name, node: p, depth });
    };
    return {
      Program: () => { depth = 0; },
      'Program:exit': () => {                        // 解析阶段：每个引用找"深度≤自己且最深"的同名声明
        const refCount = new Map();                  // 声明下标 → 引用数
        for (const ref of refs) {
          let best = -1;
          decls.forEach((d, i) => { if (d.name === ref.name && d.depth <= ref.depth
                                       && (best === -1 || d.depth > decls[best].depth)) best = i; });
          if (best >= 0) refCount.set(best, (refCount.get(best) ?? 0) + 1);  // 找不到 = 全局名，忽略
        }
        decls.forEach((d, i) => {
          if (!refCount.has(i)) context.report({ node: d.node, message: `'${d.name}' is defined but never used.` });
        });
      },
      FunctionDeclaration: fnEnter, 'FunctionDeclaration:exit': () => depth--,
      FunctionExpression: fnEnter, 'FunctionExpression:exit': () => depth--,
      ArrowFunctionExpression: fnEnter, 'ArrowFunctionExpression:exit': () => depth--,
      VariableDeclarator(node) { if (node.id.type === 'Identifier')
        decls.push({ name: node.id.name, node: node.id, depth }); },
      Identifier(node, parent, key) {                // 只统计"引用位置"的 Identifier
        if (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) return;  // obj.prop
        if (parent?.type === 'ObjectProperty' && key === 'key' && !parent.computed && !parent.shorthand) return;
        if (key === 'key' && parent?.type?.endsWith('Method') && !parent.computed) return;           // 方法名
        if (parent?.type === 'VariableDeclarator' && key === 'id') return;                           // 声明处
        if (key === 'id' && (parent?.type === 'FunctionDeclaration' || parent?.type === 'ClassDeclaration')) return;
        if (key === 'params') return;                                                                // 形参
        if (parent?.type === 'LabeledStatement' || ((parent?.type === 'BreakStatement'
            || parent?.type === 'ContinueStatement') && key === 'label')) return;
        refs.push({ name: node.name, depth });
      },
    };
  },
};
```

作用域用**深度数字**近似（Program=0，函数嵌套逐层 +1），遮蔽取"深度 ≤ 自己且最深"的声明——正好是 `Scope.lookup` 沿链上溯的代数等价。简化处（诚实声明）：块级 let/const 视为函数级、解构模式与 import/export 不展开——ESLint 用 eslint-scope（Babel scope 的姊妹实现）做完整版，但那已是另一个项目的体量。

## RuleTester：规则的单测契约

ESLint 生态所有规则共享同一套测试格式——`valid`（必须零诊断）与 `invalid`（逐条断言 + 可选修复后快照）。复刻：

```js
class RuleTester {
  constructor(linter) { this.linter = linter; }
  run(ruleName, rule, { valid, invalid }) {
    const rules = { [ruleName]: rule }, config = { rules: { [ruleName]: 'error' } };
    let pass = 0, fail = 0;
    const check = (cond, label) => { cond ? pass++ : (fail++, console.error('  ✗ ' + label)); };
    for (const code of valid) {
      const m = this.linter.verify(code, rules, config);
      check(m.length === 0, `valid 但报了 ${m.length} 条: ${JSON.stringify(m)} | ${code}`);
    }
    for (const t of invalid) {
      const m = this.linter.verify(t.code, rules, config);
      check(m.length === t.errors.length, `诊断数 ${m.length} ≠ 预期 ${t.errors.length} | ${t.code}`);
      t.errors.forEach((e, i) => {
        const got = m[i];
        check(!!got && (e.message === undefined || got.message.includes(e.message))
          && (e.line === undefined || got.line === e.line)
          && (e.column === undefined || got.column === e.column),
          `第 ${i + 1} 条诊断不符: got ${got ? got.line + ':' + got.column + ' ' + got.message : '无'}`);
      });
      if (t.output !== undefined) {                  // 断言修复后全文（最强断言）
        const { output } = this.linter.verifyAndFix(t.code, rules, config);
        check(output === t.output, `修复后输出不符:\n  期望 ${JSON.stringify(t.output)}\n  实际 ${JSON.stringify(output)}`);
      }
    }
    console.log(`${ruleName}: ${pass} passed, ${fail} failed ${fail ? '' : '✓'}`);
    if (fail) process.exitCode = 1;
  }
}
```

断言三层强度递增：诊断**条数** → 每条的**行列/消息** → 修复后**全文**。invalid 用例里藏着关键 fixture：`if (x != null)` 断言 `output` 与输入**相同**（eqeqeq 对它只报不修）；`function hoist() { return n; var n = 1; }` 在 valid 里（引用先于声明，两阶段解析不误报）。实跑结果：

```text
no-var: 12 passed, 0 failed ✓
eqeqeq: 15 passed, 0 failed ✓
no-unused-vars: 12 passed, 0 failed ✓
```

39 项断言全绿（valid 10 例 + invalid 13 例，含修复后快照断言）。

## CLI 形态：像真的 linter 一样跑

引擎加上 15 行壳（读文件、格式化输出、--fix 落盘），对一个真实示例文件实跑：

```text
$ node cli.cjs demo.js
demo.js
  demo.js:1:1  error    Unexpected var, use 'let' or 'const' instead.  no-var (fixable)
  demo.js:4:3  error    Unexpected var, use 'let' or 'const' instead.  no-var (fixable)
  demo.js:5:7  error    Expected '===' and instead saw '=='.  eqeqeq
  demo.js:11:1  error   Unexpected var, use 'let' or 'const' instead.  no-var (fixable)
  demo.js:11:5  warning 'unusedLegacy' is defined but never used.  no-unused-vars
  demo.js:12:5  error   Expected '===' and instead saw '=='.  eqeqeq (fixable)

✖ 6 problems (5 errors, 1 warnings)
```

注意 `5:7 cache == null` 那条**不带 (fixable)**——eqeqeq 的条件 fix 生效了；`12:5 'dev' == 'dev'` 两侧同类字面量才给修法。`--fix` 实跑（2 轮收敛）：

```diff
-var API_BASE = 'https://api.example.com';
+let API_BASE = 'https://api.example.com';
...
-  var url = API_BASE + '/users/' + userId;
+  let url = API_BASE + '/users/' + userId;
...
-  if (cache == null) {      // ← 未被修复：语义依赖 ==，只报不修
+var unusedLegacy = fetchUser(1);
+let unusedLegacy = fetchUser(1);
-if ('dev' == 'dev') {
+if ('dev' === 'dev') {
```

五个可修诊断全部落盘，`cache == null` 原样保留——**修复的行为与报告的承诺严格一致**。

## 与 ESLint 的真实差距（以及为什么值得做 mini 版）

1. **scope-manager**：ESLint 用 eslint-scope 建完整作用域图（块级、模块、class、TDZ），我们用深度数字近似——no-unused-vars 的所有边界差异都源于此。
2. **指令注释**：`/* eslint-disable */`、`// eslint-enable-line` 需要预处理注释并按区间过滤诊断——纯文本工程，不影响架构。
3. **配置系统**：flat config（eslint.config.js）的解析、级联合并占了 ESLint 真实代码量的大头——与"lint 算法"无关。
4. **性能**：ESLint 的 Linter 对同一文件缓存 SourceCode；规则按文件 lazily 实例化；`--fix` 的多轮有"跳过重叠 fix"保护。我们的 mini 版在正确性路径上与它同构。

mini 版的价值不在功能覆盖，而在**把"Linter/RuleTester"从名词变成你写过的东西**——之后读 ESLint 任何规则的源码，看到的都是熟悉的 `create(context) → visitor → report` 骨架。

## code-mod 思维：lint 的激进兄弟

lint 的 autofix 保守（一个 fix 一个模式）；code-mod（jscodeshift / babel-plugin 系）激进（整树重写，如全量迁移 API）。分界线在**验证方式**：lint 靠"fix 后重新 parse + 单测"，code-mod 靠**快照测试兜底**——迁移脚本必须有输入/期望输出对（本册 RuleTester 的 invalid.output 就是它的微缩版），并承诺"不改变程序可观察行为"（[第七阶段](../07-第七阶段/06-前端工程优化对照.md)优化铁律的同款表述）。写 code-mod 的工程节奏：fixture 先行（先写 10 个"迁移前→迁移后"对子），实现让测试变绿，review 时看 diff 而不是看代码。

## 自测

1. 把遍历器的 `seen` WeakSet 去掉，哪个 fixture 会先挂？为什么 shorthand 对象属性会触发重复访问？
2. `applyFixes` 为什么从大区间（靠后的）往前应用？如果从小到大应用，构造一个会修错的两个 fix。
3. eqeqeq 的 fix 为什么不给 `x == null`？如果产品要求"null 检查必须显式写 `x === null || x === undefined`"，fix 的 range/text 要怎么写才算安全？
4. no-unused-vars 的"深度数字"作用域模型在什么代码上会误报/漏报？给出一个需要完整 eslint-scope 才能判定的例子（提示：块级遮蔽 + 同名）。
5. 为什么 ESLint 的 fix 约束为"同一轮内区间互不重叠"，而不是"尽力修"？
6. 给 mini-lint 加一条 `no-debugger` 规则（debugger 语句报错）：visitor 键、fix、RuleTester 用例各怎么写？估计多少行？
