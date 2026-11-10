# 16 · 模块化：CommonJS 与 ESM 的机制差异

> 对应大纲：阶段 4 工程化 —— 模块化：ESM 与 CJS 差异、interop、`import()` 动态导入

## 学习目标

1. 能从**加载时机、导出语义、循环依赖行为**三个维度讲清 CJS 与 ESM 的机制差异，而不是背「CJS 值拷贝、ESM 引用」的结论
2. 能准确预测 Node 下 `import` 一个 CJS 模块时的每一种行为（default、命名导入、快照 vs live）
3. 掌握 `.mjs`/`.cjs`/`package.json` `type` 字段的判定规则，了解 `exports` 字段与双格式包的存在

## 关键概念

### 演化史一句话

`<script>` 全局污染 → IIFE 模块模式 → AMD/UMD（浏览器异步加载，RequireJS 时代）→ CommonJS（Node 服务端）→ **ESM（ECMA-262 语言级标准）**。前四代都是「社区约定」，只有 ESM 是语言内置。

### CJS 的机制：require 是普通的函数调用

一手依据：Node.js 官方文档《Modules: CommonJS》。Node 加载一个 `.cjs` 时，会把模块源码包进一个**包装函数**再执行，等价于：

```js
(function (exports, require, module, __filename, __dirname) {
  // 你的模块代码
  module.exports = { add, mul };
});
```

由此推出 CJS 的全部核心性质：

- **require 是运行时函数**：参数可以是变量、可以写在 `if` 里、可以循环——代价是**编译期无法确定依赖关系**
- **同步加载**：`require` 会阻塞后续代码直到目标模块执行完毕（为本地文件系统设计，网络场景致命）
- **导出的本质是 `module.exports` 这个对象**。`exports` 只是初始指向 `module.exports` 的**局部变量别名**；一旦写 `exports = {...}` 就切断了别名，这是经典事故
- **模块单例与缓存**：首次 `require` 执行模块并把 `module.exports` 存入 `require.cache`，之后所有 `require` 返回**同一个对象**——这就是「CJS 模块是单例」的机制来源
- **「值拷贝」的准确含义**：`module.exports` 对象本身是共享引用；所谓值拷贝发生在**你解构/赋值的那一刻**——`const { version } = require('./lib')` 把当时的属性值（原始值）拷进局部变量，之后模块内部怎么改写属性，这个局部变量都不会变。想拿最新值只能通过对象属性访问或 getter（见 `exercises/esm-cjs/math-lib.cjs` 的 `getCallCount`）

**CJS 循环依赖：拿到「部分完成的 exports」的时序推演**

```js
// a.cjs
exports.done = false;
const b = require('./b.cjs'); // ① a 执行到一半，去加载 b
console.log('[a] b.done =', b.done); // ④ b 已完整执行，true
exports.done = true;

// b.cjs
const a = require('./a.cjs'); // ② 循环触发：a 已在缓存（半成品），直接返回其 exports
console.log('[b] a.done =', a.done); // ③ false —— 拿到的是部分完成的 exports
exports.done = true;

// main.cjs
require('./a.cjs');
console.log('[main] a.done =', require('./a.cjs').done); // true（缓存里同一个对象，已被 a 改完）
```

输出顺序：`[b] a.done = false` → `[a] b.done = true` → `[main] a.done = true`。
关键机制：`require` 在**模块开始执行前**就把（当时还是半成品的）`module.exports` 放进了缓存，所以循环方拿到的是**部分填充**的对象——执行到哪一步，就看到哪一步的状态。

### ESM 的机制：编译期静态 + live binding

一手依据：ECMA-262《Modules》章节；Node.js 官方文档《Modules: ES modules》。

**1）静态确定导入导出。** `import`/`export` 必须出现在模块顶层、模块说明符必须是字符串字面量。解析（Parse）阶段就能确定完整的依赖图——不需要执行任何代码。这是以下能力的共同前提：

- tree-shaking（打包器可以证明「这个导出没人用，删掉安全」）
- 静态分析（IDE 跳转、自动按需引入、import 校验）
- 顶层 await 之外，`import` 被提升（hoisted）——写在文件末尾也能用

**2）live binding：导出的是「变量绑定」，不是值。** ECMA-262 中 `export let count` 建立的是一条指向**变量环境里那个绑定**的导出记录；`import { count }` 侧建立的是**只读的间接绑定**——每次读取 `count`，都是间接取目标模块变量**当前**的值。所以：

- 模块内 `count += 1` 后，导入方不重新 import 也能读到新值（`exercises/esm-cjs/live-binding.mjs` 的核心实验）
- 对 import 绑定赋值抛 `TypeError: Assignment to constant variable.`；对命名空间对象属性赋值抛 `TypeError: Cannot assign to read only property ...`（规范把 Module Namespace 的属性定义为不可写、不可配置）

**3）top-level `this` 为 `undefined`。** ESM 模块体处于严格语义下，模块顶层 `this` 是 `undefined`（CJS 包装函数里 `this` 是 `exports`）。可用来检测当前是哪种模块格式。

**4）三阶段加载与循环依赖的差异。** 规范把 ESM 加载概念化为三步：

| 阶段 | 做什么 | 关键效果 |
| --- | --- | --- |
| 构造（Parsing/Construction） | 从入口递归解析、下载所有模块，建立模块图 | 不执行代码；循环依赖在这里只是图上有环，不报错 |
| 实例化（Instantiation） | 为每个导出分配内存、建立绑定；**函数声明在此完成初始化（提升）** | 导入/导出连接成绑定，而非拷贝值 |
| 求值（Evaluation） | 深度优先后序执行模块体 | 后序保证依赖先执行；循环处「跳过已在栈中的模块」 |

循环依赖的差异由此而来：因为**函数声明在实例化阶段就已可用**，即使模块体还没求值，导入方也能安全调用循环依赖里的函数声明（典型：相互递归）。但此时访问循环对端的 `let`/`const` 导出会因尚未初始化抛 `ReferenceError`（TDZ）。对比 CJS：循环方拿到的是「半成品对象」，能不能用纯看时序运气。

### 互操作：Node 下 import CJS

一手依据：Node.js 官方文档《Modules: CommonJS》→ Interoperability with ES modules；《Modules: ES modules》→ import specifiers。

- **`import cjs from './lib.cjs'` 的 default 就是 `module.exports` 对象本身**（不是拷贝），所以通过 `cjs.xxx` 访问属性永远是最新值
- **命名导入何时可用**：Node 用 **cjs-module-lexer** 对 CJS 源码做**静态探测**，识别 `module.exports = { add, mul }`、`exports.name = ...` 等可静态分析的模式，把它们包装成命名导出。动态构造（循环里挂属性、`Object.assign(module.exports, ...)` 的复杂结果）探测不到——那时只能 default 导入或 `import()` 后取属性
- **命名导入是值的快照，不是 live binding**（本工作区实证）：lexer 翻译时取当时属性值建立绑定；模块内部后来改写 `module.exports.version`，命名导入侧不变，只有 `default.version`（对象属性）变——这是「CJS 值拷贝」语义在互操作下的延续。见 `exercises/esm-cjs/esm-interop.mjs` [4] 组实验
- **CJS 模块的命名空间**额外包含 `default` 与 `module.exports` 两个键（后者是 `module.exports` 的 getter 别名），全部按键名排序
- **`esModuleInterop`（tsconfig）**：TS 编译输出的 `__importDefault` / `__importStar` 运行时 helper 解决「TS 源码里 `import fs from 'fs'`（CJS 无 default）」的错位——`__importDefault(mod)` 把没有 `__esModule` 标记的 CJS 模块包成 `{ default: mod }`；`__importStar` 把属性逐个拷贝到命名空间并打上 `__esModule` 标记，模拟「既有 default 又有命名导出」。没有它（或没开 `allowSyntheticDefaultImports`）时 `import fs from 'fs'` 直接类型报错
- **`import()` 动态导入**：表达式形式，返回 `Promise`，兑现值是 Module Namespace Object。三个要点：① 命名空间键**按名字排序**（规范要求，顺序确定）；② 它是 **CJS 文件里唯一可用的 ESM 语法**（`.cjs` 里不能写静态 import，但能 `await import()`）；③ 它是打包器做**代码分割**的切分信号——静态 import 进同一个 chunk，`import()` 的目标被切成异步 chunk 按需加载。见 `exercises/esm-cjs/dynamic-import.mjs`

### 文件扩展名与 package.json

一手依据：Node.js 官方文档《Modules: Packages》与《Package resolution》。

- `.mjs` 一定是 ESM，`.cjs` 一定是 CJS——扩展名优先级最高
- `.js` 看**最近一层** `package.json` 的 `type` 字段：`"type": "module"` → ESM，`"type": "commonjs"`（或无）→ CJS
- `exports` 字段定义包的**公开入口**：可同时声明 `.` 与子路径、用条件对象 `"import"`/`"require"` 分别给两种格式不同的文件（**双格式包**，dual-package）。深导入（直接 require 包内部路径）会被 `exports` 封锁。版本与发布细节见阶段 20（`notes/stage-4-engineering/20-package-manager-monorepo.md`）

## 可运行示例

全部可 `node` 直接运行，输出已逐行验证：

| 文件 | 演示内容 |
| --- | --- |
| `exercises/esm-cjs/math-lib.cjs` | CJS 小库：`module.exports`、内部状态 + getter、`require.main === module` 自测段 |
| `exercises/esm-cjs/esm-interop.mjs` | default = `module.exports`；命名导入可用性；**值拷贝快照三连对照**；给 import 绑定赋值抛 TypeError |
| `exercises/esm-cjs/counter.mjs` | live binding 的源模块：`export let count` + `increment` |
| `exercises/esm-cjs/live-binding.mjs` | live binding 证据：不重新 import 读到新值；绑定只读的两个 TypeError |
| `exercises/esm-cjs/dynamic-import.mjs` | `import()`：命名空间键序（排序确定性）、条件加载 CJS、代码分割意义 |

先看文件顶部注释里的「预期输出」自己推一遍，再运行对照：

```bash
node exercises/esm-cjs/esm-interop.mjs
node exercises/esm-cjs/live-binding.mjs
node exercises/esm-cjs/dynamic-import.mjs
```

## 易错点与面试高频

- **「CJS 导出值拷贝、ESM 导出引用」要讲准确**：CJS 拷贝发生在解构/读值那一刻；`module.exports` 对象本身是共享引用，属性访问是「活」的。ESM 导出的甚至不是「引用」而是「变量绑定」——只读、且跟随模块内重新赋值
- **`exports = {...}` 静默断链**：改的只是包装函数的局部变量，外界拿到的还是旧 `module.exports`。只能 `exports.a = 1` 或 `module.exports = {...}`
- **import CJS 的命名导入会「过期」**：lexer 快照 + 模块内部改写属性 ⇒ 命名导入读到旧值。跨格式边界尽量用 default 导入 + 属性访问
- **循环依赖**：CJS 靠缓存返回半成品对象（时序运气）；ESM 靠函数声明提升（实例化期可绑定）——「ESM 循环依赖为什么函数可用、let 会 TDZ」是高频追问
- **`import` 会被提升**且模块体默认严格模式（`this === undefined`、禁止 `with`）
- **`__dirname`/`__filename`/`require` 在 ESM 中不存在**，要 `import.meta.url` + `node:url` 的 `fileURLToPath`
- 面试高频：「require 的实现原理」（包装函数 + cache）；「tree-shaking 为什么依赖 ESM」（静态可分析 + 无副作用执行顺序约束）；「动态 import 与代码分割」

## 输出预测题

### 题 1（CJS 循环依赖时序）

```js
// x.cjs
exports.tag = 'x:start';
const y = require('./y.cjs');
console.log('[x] y.tag =', y.tag);

// y.cjs
const x = require('./x.cjs');
console.log('[y] x.tag =', x.tag);
exports.tag = 'y:done';

// main.cjs
const x = require('./x.cjs');
console.log('[main] x.tag =', x.tag);
```

`node main.cjs` 的输出是什么（逐行）？如果 `y.cjs` 里在 `exports.tag = 'y:done'` **之后**才 `console.log('[y] x.tag =', x.tag)`，第二行会变吗？

### 题 2（互操作快照 vs live binding）

```js
// state.mjs
export let n = 1;
export function set(v) { n = v; }

// legacy.cjs
module.exports = { k: 1 };

// main.mjs
import { n, set } from './state.mjs';
import { k } from './legacy.cjs';
import legacy from './legacy.cjs';

set(5);
legacy.k = 99;
console.log(n, k, legacy.k);
```

`node main.mjs` 打印什么？分别解释三个数字的机制来源。

## 预测题答案

### 题 1 答案

```
[y] x.tag = x:start
[x] y.tag = y:done
[main] x.tag = x:start
```

机制：`require('./x.cjs')` → x 开始执行，`exports.tag = 'x:start'` 后把**半成品** exports 放入缓存 → x `require('./y.cjs')` → y 执行，`require('./x.cjs')` 命中缓存拿到 `{ tag: 'x:start' }` → 打印 `x:start` → `y.tag = 'y:done'` → y 完整返回 → x 打印 `y.tag = y:done` → main 拿到的 x 对象此后**没有再被改写**（x 没有后续赋值），所以仍是 `x:start`。把 `console.log` 挪到 `exports.tag = 'y:done'` 之后**不会变**：y 读的是 x 的 exports 对象属性，而 x 从没改过 `tag`；y 改的是自己的 exports。（若 x 在 require y **之后**有 `exports.tag = 'x:end'`，main 才会看到新值——因为缓存里是同一个对象。）

### 题 2 答案

```
5 1 99
```

- `n = 5`：ESM live binding——`set` 修改的是 state.mjs 模块变量，main 侧 `n` 是绑定的只读视图，读到当前值
- `k = 1`：命名导入来自 CJS，是 cjs-module-lexer 翻译时建立的**值快照**，`legacy.k = 99` 改的是对象属性，快照不跟随
- `legacy.k = 99`：default 导入就是 `module.exports` 对象本身，属性访问永远最新

## 延伸阅读

- Node.js 官方文档《Modules: CommonJS》《Modules: ES modules》《Modules: Packages》（nodejs.org/docs）
- ECMA-262 《ECMAScript Language: Modules》章节（tc39.es/ecma262）
- cjs-module-lexer 仓库 README（静态探测 CJS 命名导出的规则清单）
- MDN《JavaScript modules》——三阶段加载的通俗版
- 探索 ESM 双格式包与 `exports` 条件：`notes/stage-4-engineering/20-package-manager-monorepo.md`（阶段 20）
