# Babel 深度剖析：把前七阶段的流水线搬进真实工具链

> [返回：第八阶段导览](01-导览.md)
> 对应大纲第 1 条。Babel 是前端工程里离你最近的"真实编译器"：parser → traverse → generate 三段，与你第二、三阶段手写的流水线逐段同构。本册把它的四个核心抽象拆开——**三段架构、path、scope/binding、插件协议**——最后落到 babel-plugin-macro 的编译期展开。所有代码与输出在本机 Node 24 实跑（@babel/core 7.29.13，复用 react 站的 node_modules），输出为真实运行结果。

## 全景：@babel/core 只是编排，脏活在三件套

Babel 的架构图一句话：**@babel/core 是壳，@babel/parser → @babel/traverse → @babel/generator 是流水线**。

```
源码 ──@babel/parser──> AST ──@babel/traverse──> AST' ──@babel/generator──> 源码'
                        (acorn fork)    (visitor 改树)        (打印+sourcemap)
                └────── @babel/core 负责：配置解析、plugin/preset 装配、
                        缓存、sourceType 判定、错误恢复、sourcemap 拼接
```

三段手动拼起来（不经 @babel/core），代码比想象中短：

```js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const src = `function fib(n) { return n < 2 ? n : fib(n-1) + fib(n-2); }`;

const ast = parser.parse(src);                       // ① parse：字符串 → AST
traverse(ast, {                                      // ② traverse：visitor 改树
  BinaryExpression(path) {
    if (path.node.operator === '-' && path.node.right.value === 1) {
      path.node.right.value = 2;                     // 直接改 node 字段
    }
  },
});
const out = generate(ast);                           // ③ generate：AST → 字符串
```

实跑输出：

```text
手动三段: function fib(n) {
  return n < 2 ? n : fib(n - 2) + fib(n - 2);
}
AST 根类型: File | program body 长度: 1
```

同样的 visitor 塞给 @babel/core，一行得到相同结果（`babel.transformSync(src, { plugins: [...] })` 输出逐字符一致）。三段拆开的价值在第 [04 册](04-实践-Babel插件三选一.md)：写轻量 AST 工具时不需要 @babel/core 的配置/缓存全家桶，直接拼三件套即可——Babel 团队自己也是这么用 [@babel/standalone 做在线 playground 的](01-导览.md)。

两个与前几阶段的对应：parser 是 acorn 的 fork（你写过 [LL/Pratt](../03-第三阶段/03-Pratt解析.md)，现在看真实工业版）；AST 根节点是 `File`（包着 `program` + comments + tokens），错误恢复与 [AST 设计](../03-第三阶段/05-AST设计与错误恢复.md)里的容错字段同源。

## path 抽象：节点 + 位置 + 上下文

traverse 的回调拿到的**不是 AST 节点，是 NodePath**——"节点在树里的位置"的一等封装。这是 Babel 设计里最值得抄的一笔：光有节点（纯数据）不知道自己挂在谁下面、属于哪个作用域、怎么被替换删除，path 把这三样打包：

```js
traverse(ast, {
  BinaryExpression(path) {
    console.log(path.node.type);                 // 节点本身：'BinaryExpression'
    console.log(path.parent.type);               // 挂在哪：'ReturnStatement'
    console.log(path.key);                       // 挂在父节点的哪个字段：'argument'
    console.log(path.scope.block.type);          // 属于哪个作用域：'FunctionDeclaration'
    console.log(path.getFunctionParent().node.id.name);  // 最近函数祖先：'add'
  },
});
```

实跑输出（对 `function add(a, b) { return a + b; }`）：

```text
当前节点类型: BinaryExpression | 运算符: +
父节点类型: ReturnStatement | 在父节点的哪个字段: argument | listKey: undefined
作用域块类型: FunctionDeclaration
函数名: add
```

`path.key`/`path.listKey` 的区别在于挂点是不是数组：`return a + b` 里的表达式挂 `argument`（单字段，key='argument'，listKey=undefined）；语句挂 `body` 数组（key='body'，listKey=下标）。**"知道自己挂在哪"是 replaceWith/remove 能正确修补树的全部依据**——你在第四阶段符号表里记 `declNode` 时已经付过一次"指针维护"的成本，Babel 把它做成了框架职责。

NodePath 上还有一批"查询祖先"的便捷方法：`getPathLocation()`、`findParent()`、`getStatementParent()`、`getFunctionParent()`——lint 与 code-mod 的半数需求（"这个节点在不在函数顶层/在不在循环里"）都靠它们一句话解决。

## 三大操作：replaceWith / remove / skip

path 上的修改操作操作的是**位置**而不是节点——节点是数据，位置是数据结构里的槽位：

```js
// 3a. skip：命中某节点后跳过它的整个子树
traverse(ast, {
  CallExpression(path) {
    if (path.node.arguments[0]?.value === 2) path.skip();
  },
  Identifier(path) { idents.push(path.node.name); },
});
```

对一段含 `console.log(1)` ~ `console.log(4)` 的源码，实跑对比：

```text
不 skip，访问到的 Identifier: console,log,f,console,log,console,log,console,log
skip console.log(2) 子树:    console,log,f,console,log,console,log
（少了子树内的 log —— 兄弟节点 console.log(3)/(4) 不受影响）
```

skip 的两个用途：性能（深层子树不需要再进）与**防重入**——你自己 replaceWith 了一个新节点，而新节点又匹配本 visitor 时，skip 断掉无限循环。

```js
// 3b. remove：删除 console.log 调用所在的整条语句
traverse(ast, {
  CallExpression(path) {
    if (t.isIdentifier(path.node.callee.object, { name: 'console' })) {
      path.getStatementParent().remove();        // 删语句而不是删调用——留下裸的 arguments 会语法错误
    }
  },
});
```

实跑后 `console.log(1/2/3/4)` 全部消失，只剩 `function f() { if (false) {} }`。注意 `remove()` 删的是**这个位置上的整棵子树**：删 CallExpression 会留下 `undefined;` 式残骸，所以先 `getStatementParent()` 上浮一层——"删到哪一层"是 code-mod 设计的第一决策。

```js
// 3c. remove 之后容器索引会变：多兄弟删除要防御
traverse(ast, {
  VariableDeclaration(path) {
    if (path.node.declarations[0].id.name.startsWith('drop')) {
      path.remove();
      path.skip();     // 容器已变，跳过本容器后续兄弟的重入
    }
  },
});
```

实跑 `const keep=1; const drop=2; const keep2=3;` → 正确删掉 drop 留下两行。删除兄弟节点时 traverse 的内部迭代器还拿着旧下标，**删一个就要 skip 一次**——这是 Babel 插件 bug 榜第一名（官方 handbook 的 "shared deletions" 一节专门讲它）。

## scope 与 binding：第四阶段符号表的工具层复刻

[path](#path-抽象节点--位置--上下文) 之外，traverse 在遍历时顺手做了你第四阶段做过的事：**构建作用域树与符号表**。`path.scope.getBinding('x')` 就是当年的 `Scope.lookup('x')`：

```js
const src = `
const price = 100;               // 模块级绑定
function calc(n) {
  const ratio = 0.8;
  return price * ratio * n;
}
function outer() {
  const price = 1;               // 遮蔽（shadowing）
  return price + calc(2);
}`;
traverse(ast, {
  Identifier(path) {
    if (!path.isReferencedIdentifier()) return;      // 只看"作为引用"出现的 price
    const binding = path.scope.getBinding('price');
    console.log(`第 ${path.node.loc.start.line} 行的 price → 声明于第 ${binding.identifier.loc.start.line} 行`,
                `| kind: ${binding.kind} | constant: ${binding.constant}`,
                `| 引用次数: ${binding.referencePaths.length}`);
  },
});
```

实跑输出：

```text
第 5 行的 price 解析到: 声明于第 2 行 | kind: const | constant: true | 引用次数: 1 | 声明所在作用域块: Program
第 9 行的 price 解析到: 声明于第 8 行 | kind: const | constant: true | 引用次数: 1 | 声明所在作用域块: FunctionDeclaration
```

第 5 行与第 9 行的 `price` 解析到**不同声明**——遮蔽被正确处理。与[第四阶段符号表](../04-第四阶段/02-符号表与作用域.md)的逐项对应：

| 你的 mini（第四阶段） | Babel（@babel/traverse） | 备注 |
|---|---|---|
| `Scope.lookup(name)` 沿 parent 上溯 | `scope.getBinding(name)` 沿作用域链上溯 | 同一套词法作用域算法 |
| `Symbol.declNode` | `binding.identifier` | 声明处节点（诊断指回去） |
| `Symbol.kind: 'let' \| 'fn' \| 'param'` | `binding.kind: 'let' \| 'const' \| 'param' \| 'module' \| ...` | Babel 细分到模块绑定 |
| `resolvedTo` 反查边表 | `binding.referencePaths`（数组） | 引用→声明的边，双向可走 |
| ——（未实现） | `binding.constant` / `constantViolations` | 该绑定是否从未重赋值 |
| ——（未实现） | `binding.scope.rename(old, new)` | alpha-renaming 一次到位 |

binding 比 mini 符号表多出的三样都是"变换器刚需"：**constant** 告诉内联类优化"可以放心展开"；**referencePaths** 支撑"查找引用"；**rename** 是符号表驱动重命名的直接变现——实跑 `binding.scope.rename('ratio', 'discountRate')`，声明与全部引用一次改齐，输出里 `const ratio = 0.8; ... price * ratio * n` 变成 `const discountRate = 0.8; ... price * discountRate * n`。第三册的 lint 会再消费同一套抽象（自己实现一遍轻量版）。

## 插件协议：visitor 是接口，时序是契约

插件 = `{ name, pre, visitor, post }`。visitor 的键是 AST 节点类型（或别名如 `Function`），值是函数（=enter）或 `{ enter, exit }`。用四个探针插件实测时序：

```js
const P = (tag) => ({
  name: tag,
  pre(state)  { log.push(`${tag}:pre`); },
  visitor: {
    Program: { enter() {}, exit() {} },
    Function: {                                 // 别名：匹配全部函数形态
      enter(p) { log.push(`${tag}:Function.enter(${p.node.type})`); },
      exit(p)  { log.push(`${tag}:Function.exit(${p.node.type})`); },
    },
    Identifier(p, state) {                      // 第二参数 state = PluginPass
      if (p.node.name === 'secret') log.push(`${tag}:Identifier, opts=${JSON.stringify(state.opts)}`);
    },
  },
  post(state) { log.push(`${tag}:post`); },
});
babel.transformSync('function f() { const secret = 1; }', {
  plugins: [[P('A'), { env: 'production' }], P('B')],   // A 带选项、B 不带
});
```

实跑输出的完整时序：

```text
A:pre
B:pre
A:Program.enter
B:Program.enter
A:Function.enter(FunctionDeclaration)
B:Function.enter(FunctionDeclaration)
A:Identifier 命中 secret, opts={"env":"production"}
B:Identifier 命中 secret, opts={}
A:Function.exit(FunctionDeclaration)
B:Function.exit(FunctionDeclaration)
A:Program.exit
B:Program.exit
A:post
B:post
```

这份时序表藏着三个要点：

1. **插件不是"逐个跑完"**。A、B 的 visitor 被合并成一张大表，**每个节点上按插件序轮流触发**——`A:Function.enter` 之后是 `B:Function.enter`，而不是 A 全树遍历完再轮到 B。这意味着插件间可以通过 AST 传递信息（A 在 enter 里做的标记，B 在同一节点的 enter 里就能看到），也意味着"顺序敏感"的插件组合要靠声明序保证。
2. **enter/exit 给出"内-外"两种视角**。子节点在父节点 exit 前已处理完——第 [04 册](04-实践-Babel插件三选一.md)的常量折叠全部写在 exit：进入 `2*3+1` 的 `+` 时子节点还没折，exit 时左子树已是 `6`。
3. **pre/post 是全树前后钩子**，state（PluginPass）携带 `state.opts`（用户选项）、`state.file`（整个文件的元数据）——宏实现里用它存"已注册的宏名单"。

## preset 与 plugin 的关系

preset 就是**插件的打包**——一个函数返回 `{ plugins: [...] }`，没有第二种语义。但执行顺序有两条反直觉的规则，实测为证：

```js
babel.transformSync('x;', {
  plugins: [mk('插件1'), mk('插件2')],
  presets: [{ plugins: [mk('preset内层1'), mk('preset内层2')] }],
});
// 实跑：plugins + preset 顺序: 插件1 → 插件2 → preset内层1 → preset内层2

babel.transformSync('x;', {
  presets: [{ plugins: [mk2('presetA')] }, { plugins: [mk2('presetB')] }],
});
// 实跑：presetA, presetB 声明顺序 → 实际: presetB → presetA
```

- **plugin 全部先于 preset**（你手写的业务插件能看到 preset 转换前的语法）；
- **plugin 按声明序、preset 按声明逆序**——preset 逆序是为了让 `preset-env` 这类"越靠后越具体"的直觉成立（`@babel/preset-flow, @babel/preset-react, @babel/preset-env` 从右往左流动）。规则来源是 Babel 的配置合并器，记住结论即可，但**写靠顺序吃饭的插件组合时必须知道**。

## babel-plugin-macro：编译期展开

[Babel 插件](#插件协议visitor-是接口时序是契约)要进构建配置才能生效，业务代码改不动构建时的世界。babel-plugin-macro 的思路是反过来：**业务源码里写一个普通函数调用（从 `xxx.macro` 导入），编译期被展开成任意 AST**——Lisp macro 在 JS 生态的受限版（受限在于：只能整调用替换，拿不到调用处上下文）。tailwind / styled-components / lodash 的 `_.template` tag 都是这条路。

自己实现一个 30 行的简化版，机制一目了然：**用"导入来源后缀 .macro"做标记，导入表查表，调用点整棵替换**。

```js
// 宏实现表：名字 → (实参节点数组, 编译期上下文) => 替换 AST
const MACROS = {
  range: (args) => {                       // range(n) → [0, 1, ..., n-1]
    const n = args[0].value;
    return t.arrayExpression(Array.from({ length: n }, (_, i) => t.numericLiteral(i)));
  },
  envFlag: (args, { env }) =>              // envFlag('X') → 编译期环境变量求值成布尔
    t.booleanLiteral(env[args[0].value] === '1'),
};

function macroPlugin() {
  return {
    name: 'mini-macro',
    visitor: {
      ImportDeclaration(path, state) {     // ① 收集并摘除宏导入
        if (!path.node.source.value.endsWith('.macro')) return;
        for (const spec of path.node.specifiers)
          state.file.set(spec.local.name, true);       // 记下"哪些标识符是宏"
        path.remove();
      },
      CallExpression(path, state) {        // ② 展开宏调用
        if (!t.isIdentifier(path.node.callee)) return;
        if (!state.file.get(path.node.callee.name)) return;
        const replacement = MACROS[path.node.callee.name](path.node.arguments, { env: process.env });
        path.replaceWith(replacement);
      },
    },
  };
}
```

输入（`FEATURE_PAY=1`）与实跑输出：

```text
[macro] 展开 range(...) → [0, 1, 2]
[macro] 展开 envFlag(...) → true
--- 转换后 ---
const seats = [0, 1, 2];
if (true) {
  pay();
} else {
  legacy();
}
```

真实生态比这多两件事：宏文件在编译期被 `require` 执行（宏是**构建机上跑的 JS**，能用 fs/网络拉数据）；返回 `{ references, source, state }` 让宏拿到每个引用点的 path 自己决定替换（不止整调用替换，还能给标识符包一层）。安全边界因此重要：**宏跑在你的构建机上，权限等于你的构建脚本**——装第三方宏等于装第三方构建脚本。`envFlag` 的输出 `if (true)` 顺手展示了宏与 [04 册常量折叠](04-实践-Babel插件三选一.md)的接力：宏负责"值从哪来"，折叠 pass 负责"算简它"。

## 工程要点：把本册变成肌肉记忆

- **调试三件套**：`astexplorer.net`（左源码右 AST，选 @babel/parser）对节点结构；`console.log(generate(path.node).code)` 在 visitor 里打片段；`path.debug()` 打印路径链。
- **优先用 @babel/template 构造 AST**：手拼 `t.*` 节点容易漏字段（`listKey`、loc），`template.statement\`a = b\`` 直接吃源码字符串——本册宏 demo 为展示机制用了手拼，生产代码用 template。
- **visitor 键写别名少写枚举**：`Function`、`Statement`、`Expression`、`LVal` 覆盖大半需求（`@babel/types` 的 `FLIPPED_ALIAS_KEYS` 是权威表）。
- **改树后想重跑 pass**：`path.requeue()` 把替换出的新节点塞回遍历队列（常量折叠的"传播到不动点"用得上）。

## 与 mini 项目的关系

mini 的 [parser/AST](../03-第三阶段/06-实践-mini语言parser.md)与 [符号表](../04-第四阶段/02-符号表与作用域.md)分别对应 Babel 的 parser 与 scope——差别只在工程完备度（错误恢复、sourcemap、十类 binding、模块作用域）。下一册把 traverse 也换掉：**不用 @babel/traverse，自己写 25 行遍历器**，配上规则引擎，得到一个能用的 mini-lint——你会发现"读懂 Babel"和"写出 Babel 的核心 10%"是同一件事。

## 自测

1. 不查资料写出"把所有 `==` 换成 `===`"的插件骨架：visitor 键是什么？fix 的替换区间怎么算（从哪个节点的 start 到哪个节点的 end）？
2. `path.remove()` 之后同容器还有兄弟节点，为什么必须配 `path.skip()`？如果不配，最坏会发生什么？
3. `path.scope.getBinding('x').constant === true` 能推出哪些优化是安全的？举一个它支撑的具体变换（提示：内联）。
4. 插件 A、B 都监听 `Program.exit`，谁先触发？如果 B 在 `Program.enter` 里改了树，A 的 `Program.exit` 看到的是改前还是改后？用第 [五节](#插件协议visitor-是接口时序是契约)的时序表推。
5. preset 为什么按声明逆序执行？给一个"顺序反了就出错"的具体插件组合。
6. babel-plugin-macro 与 Babel 插件的边界各在哪？为什么说宏"受限"？如果宏想拿到调用处的词法作用域信息，现在的协议给得了吗？
