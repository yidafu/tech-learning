# 16 · 模块化：CommonJS 与 ESM 的机制差异

> 对应大纲：阶段 4 工程化 —— 模块化：ESM 与 CJS 差异、interop、`import()` 动态导入

## 学习目标

1. 能从**加载时机、导出语义、循环依赖行为**三个维度讲清 CJS 与 ESM 的机制差异，而不是背「CJS 值拷贝、ESM 引用」的结论
2. 能准确预测 Node 下 `import` 一个 CJS 模块时的每一种行为（default、命名导入、快照 vs live）
3. 掌握 `.mjs`/`.cjs`/`package.json` `type` 字段的判定规则，了解 `exports` 字段与双格式包的存在

## 关键概念

### 演化史一句话

`<script>` 全局污染 → IIFE 模块模式 → AMD/UMD（浏览器异步加载，RequireJS 时代）→ CommonJS（Node 服务端）→ **ESM（ECMA-262 语言级标准）**。前四代都是「社区约定」，只有 ESM 是语言内置。

### 判定流程：一个文件凭什么被当成 CJS 或 ESM

一手依据：Node.js 官方文档《Modules: Packages》→ Determining module system 一节。加载器按下面的优先级判定模块格式，**先命中先赢**：

1. 扩展名一票定：`.mjs` → ESM，`.cjs` → CJS（显式扩展名的优先级高于一切配置）
2. `.js`（及无扩展名入口）→ 看**最近一层** `package.json` 的 `type` 字段：`"module"` → ESM；`"commonjs"` 或**无字段** → CJS
3. 命令行/`--eval`/stdin 这类「没有文件路径」的代码，默认 CJS，可用 `--input-type=module` 显式声明为 ESM

三条推论：

- `node_modules` 里每个包自带 package.json，**判定以最近一层为准**——同一棵依赖树里 CJS 与 ESM 包可以共存，互不影响
- `type` 字段对 `.mjs`/`.cjs` 毫无效力——所以在 `"type": "module"` 的包里放一个 `.cjs` 配置文件，是双格式包之外最常用的**局部逃生门**（反过来，`"type": "commonjs"` 的包里放 `.mjs` 同理）
- 格式判定只看「文件路径 + 最近的 package.json」，**不看内容语法**——在 CJS 文件里写 `import` 语句是 SyntaxError，哪怕语法本身完全合法

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

### CJS 缓存的键与模块对象的完整字段

- **缓存键是「解析后的绝对路径」**：`require.cache` 以 `require.resolve('./x')` 的结果为键。同一模块经由 `./lib`、`../pkg/lib`、符号链接多条路径引用时，是否共享同一个单例，取决于它们是否规范化到同一个真实文件。
- **`require.resolve` 只解析、不执行**：返回「如果此刻 require 会加载哪个文件」的绝对路径，不运行任何代码——预检路径存在性、构造缓存键时用它。
- **热移除缓存**：`delete require.cache[require.resolve('./x')]` 之后再 `require` 才会重新执行模块。两个注意点：① 模块自己在 exports 上挂的定时器/监听器不会因此清理（重载 ≠ 重置）；② 循环依赖的另一半仍持有旧对象的引用——「删缓存热重载」在存在共享引用时天然不完整，这正是「热重载只在开发期玩」的机制细节。
- **module 对象的全字段**：`module.exports`、`module.id`（入口模块是 `'.'`）、`module.filename`、`module.loaded`（执行完才为 true）、`module.parent`/`module.children`（依赖图边）、`module.path`（查找 node_modules 的起点）、`module.paths`。`require.main === module` 判断「我是不是被直接运行的入口」——CLI 脚本的标准自测写法（`exercises/esm-cjs/math-lib.cjs` 末尾的自测段就是它）。

**`module.exports` 的四种常见形态**（后文互操作一节会回来引用这张表——形态决定 cjs-module-lexer 能探测出多少命名导出）：

| 形态 | 写法 | 命名导出探测 |
| --- | --- | --- |
| 命名逐个挂 | `exports.a = 1` / `module.exports.a = 1` | ✅ 可探测 |
| 末尾整体对象 | `module.exports = { a, b }` | ✅ 可探测（字面量内标识符引用） |
| 单一函数/类 | `module.exports = fn`（本体即导出） | 无命名面可言——default 就是函数/类本身 |
| 动态构造 | 循环挂属性、`Object.assign(module.exports, computed)` | ❌ 探测不到，只能 default 导入 |

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

### ESM 循环依赖求值 trace：把三阶段表跑一遍

相互递归是 ESM 循环依赖的标准正例，把它逐帧推演一遍（入口 `node main.mjs`）：

```js
// even.mjs
import { odd } from './odd.mjs';
export function even(n) { return n === 0 || odd(n - 1); }

// odd.mjs
import { even } from './even.mjs';
export function odd(n) { return n !== 0 && even(n - 1); }

// main.mjs
import { even } from './even.mjs';
console.log(even(10)); // true
```

1. **构造**：解析 main → 依赖 even → even 的依赖 odd → odd 的依赖 even 已在图中（环闭合，**不报错**）。此阶段没有任何代码执行。
2. **实例化**：按图序为 `even`/`odd` 的函数声明分配绑定并**完成初始化**（函数声明的特权——这正是「相互递归」能成立的前提）。
3. **求值**：深度优先后序——先 odd（其 import 的 `even` 已可用；模块体只有函数声明，无输出即完成）→ 再 even（同理完成）→ 最后 main：调用 `even(10)`，两边函数体都已就绪 → `true`。

**为什么函数声明互递归在循环里也稳**：调用发生在**运行时**，绑定在**实例化期**就已建立——只要调用时点晚于两边模块体求值，永远安全。真正的雷是**求值期就访问对方的 `let`/`const`**：

```js
// a.mjs
import { b } from './b.mjs';
export let a = 'a';
console.log('[a] b =', b); // 'b'：后序求值保证 b 已完成

// b.mjs
import { a } from './a.mjs';
export let b = 'b';
console.log('[b] a =', a); // ReferenceError：a 的绑定在（实例化期创建）但未初始化（TDZ）
```

以 a 为入口时求值后序是 b → a：b 执行到 `console.log('[b] a =', a)` 时，a 的模块体还没开始跑，`let a` 处于 TDZ。**把入口换成 b，输出顺序反转、TDZ 换到另一边**——「谁能用」取决于谁先被求值，这正是循环依赖不可移植的根源。

**与 CJS 同场景对照**（机制细节见前文 a.cjs/b.cjs 的时序推演）：

| 维度 | CJS | ESM |
| --- | --- | --- |
| 循环方拿到什么 | 半成品的 `module.exports` **对象** | 已实例化但可能未初始化的**绑定** |
| 函数声明互递归 | 看赋值时序（`exports.fn = ...` 必须发生在对方 require 之前） | 稳定可用（实例化期绑定） |
| 早期访问对端状态 | 得到 `undefined`（属性还没挂上） | 抛 `ReferenceError`（TDZ） |
| 事后可见性 | 同一对象，后续赋值互相可见 | live binding，互见 |
| 出错形态 | 值错了、多半还能跑 | 异常，直接抛 |

修复策略同源且按优先级排：**抽第三个公共模块切断环** > **把跨模块访问延迟到函数体内**（运行时才解引用）> 动态 `import()`。别依赖「恰好没炸」的求值顺序——入口一换，TDZ 就换边。

### 互操作：Node 下 import CJS

一手依据：Node.js 官方文档《Modules: CommonJS》→ Interoperability with ES modules；《Modules: ES modules》→ import specifiers。

- **`import cjs from './lib.cjs'` 的 default 就是 `module.exports` 对象本身**（不是拷贝），所以通过 `cjs.xxx` 访问属性永远是最新值
- **命名导入何时可用**：Node 用 **cjs-module-lexer** 对 CJS 源码做**静态探测**，识别 `module.exports = { add, mul }`、`exports.name = ...` 等可静态分析的模式，把它们包装成命名导出。动态构造（循环里挂属性、`Object.assign(module.exports, ...)` 的复杂结果）探测不到——那时只能 default 导入或 `import()` 后取属性
- **命名导入是值的快照，不是 live binding**（本工作区实证）：lexer 翻译时取当时属性值建立绑定；模块内部后来改写 `module.exports.version`，命名导入侧不变，只有 `default.version`（对象属性）变——这是「CJS 值拷贝」语义在互操作下的延续。见 `exercises/esm-cjs/esm-interop.mjs` [4] 组实验
- **CJS 模块的命名空间**额外包含 `default` 与 `module.exports` 两个键（后者是 `module.exports` 的 getter 别名），全部按键名排序
- **`esModuleInterop`（tsconfig）**：TS 编译输出的 `__importDefault` / `__importStar` 运行时 helper 解决「TS 源码里 `import fs from 'fs'`（CJS 无 default）」的错位——`__importDefault(mod)` 把没有 `__esModule` 标记的 CJS 模块包成 `{ default: mod }`；`__importStar` 把属性逐个拷贝到命名空间并打上 `__esModule` 标记，模拟「既有 default 又有命名导出」。没有它（或没开 `allowSyntheticDefaultImports`）时 `import fs from 'fs'` 直接类型报错
- **`import()` 动态导入**：表达式形式，返回 `Promise`，兑现值是 Module Namespace Object。三个要点：① 命名空间键**按名字排序**（规范要求，顺序确定）；② 它是 **CJS 文件里唯一可用的 ESM 语法**（`.cjs` 里不能写静态 import，但能 `await import()`）；③ 它是打包器做**代码分割**的切分信号——静态 import 进同一个 chunk，`import()` 的目标被切成异步 chunk 按需加载。见 `exercises/esm-cjs/dynamic-import.mjs`

### 互操作行为速查表与双格式包隐患

把本节规则与前文机制收成一张「从 ESM 侧碰 CJS」的行为表（Node 运行时）：

| 写法 | 得到什么 | live 还是快照 | 依赖的机制 |
| --- | --- | --- | --- |
| `import cjs from './lib.cjs'` | `module.exports` 对象本身 | **live**（对象属性访问永远最新） | default = module.exports |
| `import { add } from './lib.cjs'` | lexer 探测出的命名导出 | **快照**（翻译时取值） | cjs-module-lexer 静态探测 |
| `import * as ns from './lib.cjs'` | 命名空间：`default` + 探测出的命名导出 + `module.exports` getter 别名，键名排序 | 命名键是快照、`default` 是 live | Module Namespace 记录 |
| `createRequire(import.meta.url)('./lib.cjs')` | 与 CJS 世界完全相同的 `require`（含 cache） | live | 显式桥接，绕开 lexer |
| `import data from './data.json' with { type: 'json' }` | JSON 模块（import attributes 语法） | 求值一次即冻结 | JSON 模块包装 |

两条工程推论：

- **跨格式边界只认「default + 属性访问」**：快照问题（`esm-interop.mjs` 的 [4] 组实验）与动态导出探测失败问题，指向同一条实践准则——有内部状态或动态导出面的 CJS 模块，import 侧一律走 default。
- **`createRequire` 的适用面**：ESM 文件里需要 `require.resolve`、需要复用 CJS 的缓存语义、或工具链要求 require 上下文时用它；它不解决反向问题——CJS 里用 ESM 包，只能 `await import()`。

**双格式包隐患（dual-package hazard）**：一个包同时发布 ESM 与 CJS 两个入口（`exports` 条件的 `"import"`/`"require"`，见下一节），而应用的两条依赖路径分别以两种格式加载了**同一个包**——该包就被**求值两次**，产生两个独立实例：模块级状态翻倍、`instanceof`（拿 A 侧实例比对 B 侧的类）失败、内存缓存/单例失效。「逻辑上只装了一个库，运行时却有两个世界」。缓解方向（Node 文档《Dual package hazard》的思路）：优先单一格式发布；确需双格式时让两种入口**共享同一份实现文件**（条件导出指向同一模块，包装层只做适配），或把跨格式必须一致的状态放进不随格式复制的位置（外部存储、全局单例注册表）。

### 文件扩展名与 package.json

一手依据：Node.js 官方文档《Modules: Packages》与《Package resolution》。

- `.mjs` 一定是 ESM，`.cjs` 一定是 CJS——扩展名优先级最高
- `.js` 看**最近一层** `package.json` 的 `type` 字段：`"type": "module"` → ESM，`"type": "commonjs"`（或无）→ CJS
- `exports` 字段定义包的**公开入口**：可同时声明 `.` 与子路径、用条件对象 `"import"`/`"require"` 分别给两种格式不同的文件（**双格式包**，dual-package）。深导入（直接 require 包内部路径）会被 `exports` 封锁。版本与发布细节见阶段 20（`notes/stage-4-engineering/20-package-manager-monorepo.md`）

`exports` 条件对象的判定逻辑与本文全篇呼应（示意，非特定包的真实配置）：

```jsonc
{
  "name": "some-pkg",
  "exports": {
    ".": {
      "import": "./esm/index.mjs",    // ESM 加载器（import/动态 import）命中
      "require": "./cjs/index.cjs",   // CJS 加载器（require）命中
      "default": "./cjs/index.cjs"    // 兜底：未知加载器环境
    },
    "./package.json": "./package.json" // 白名单式放开一个内部路径
  }
}
```

注意条件对象里键的**书写顺序不决定优先级**——Node 按固定的条件优先序匹配（`import`/`require` 等按规范排列），这与 flat config「数组顺序即优先级」的设计哲学相反，是两套配置体系经常被搞混的点。

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
- **「格式判定看内容」是直觉陷阱**：只看扩展名与最近 package.json——在 CJS 判定的 `.js` 里写 `import` 直接 SyntaxError，与语法合法性无关
- **循环依赖修复优先级**：抽公共第三模块 > 延迟到函数体访问 > 动态 `import()`；「入口一换 TDZ 就换边」说明顺序依赖不可接受
- **命名空间对象「冻结」的是键集合不是值**：`import * as ns` 的对象不可增删改属性（规范定义不可写不可配置），但每个属性是绑定视图、值跟随源模块（ESM→ESM 场景 live）
- **面试加分项**：「为什么 ESM 循环依赖里函数可用」要答到实例化期函数声明绑定，而不是「ESM 更先进」这类空话

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

### 题 3（ESM 循环依赖求值顺序）

```js
// a.mjs
import { helper } from './b.mjs';
export const TAG = 'A';
export function run() { return helper() + TAG; }

// b.mjs
import { TAG, run } from './a.mjs';
export function helper() { return TAG.toLowerCase(); }

// main.mjs
import { run } from './a.mjs';
console.log(run());
```

① 以 `main.mjs` 为入口，写出模块体的求值顺序与全部输出。
② 若 b.mjs 在模块体顶层（`helper` 定义之前）直接加一行 `console.log(TAG)`，会发生什么？再加一行 `console.log(run())` 呢？两者的差异说明什么？

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

### 题 3 答案

① 输出 **`aA`**，不报错。模块图：main → a → b（b 的依赖 a 在环上，构造期闭合，不报错）。求值深度优先后序：**b 先执行**（模块体只有函数声明——函数声明在实例化期已初始化，模块体等于空转）→ a 执行（`TAG` 初始化、`run` 就绪）→ main 执行 `run()`。调用时 `helper()` 读 `TAG`：a 已求值完毕，值为 `'A'` → `'a' + 'A'` = `aA`。整条链能工作的关键：**所有跨模块访问都发生在运行时（函数体内），而绑定在实例化期就已建立**。
② `console.log(TAG)` 抛 `ReferenceError`：此刻 b 是第一个求值的模块体，a 还没开始执行，`TAG` 的绑定在实例化期已创建（所以不是「不存在」），但初始化器未运行——TDZ。换成 `console.log(run())` 同样抛：`run` 作为函数声明**可以引用、可以调用**（实例化期已就绪），但调用进入函数体后读 `TAG`，照样踩 TDZ。差异说明：**「引用导出」与「安全使用导出」是两回事**——函数声明给你的是「调用通道」，通道里的值是否就绪取决于对端模块体的求值进度；安全时点只有「对端求值完成之后」，即把访问推迟到运行时的函数体内。

## 延伸阅读

- Node.js 官方文档《Modules: CommonJS》《Modules: ES modules》《Modules: Packages》（nodejs.org/docs）
- ECMA-262 《ECMAScript Language: Modules》章节（tc39.es/ecma262）
- cjs-module-lexer 仓库 README（静态探测 CJS 命名导出的规则清单）
- MDN《JavaScript modules》——三阶段加载的通俗版
- 探索 ESM 双格式包与 `exports` 条件：`notes/stage-4-engineering/20-package-manager-monorepo.md`（阶段 20）
- Node.js 文档《Dual package hazard》与《Determination of module system》（双实例问题的官方分析与判定流程的一手出处）
- 回扣：`notes/stage-4-engineering/17-build-tools.md`（ESM 静态性 → tree-shaking / 预打包的 CJS→ESM 转换）、`notes/stage-2-engine-runtime/35-node-runtime.md`（模块缓存在进程模型上的推论）

---

## 深一层实测：require.cache 的单例语义与热移除

正文里说「CJS 模块是单例」，本节把「单」的准确层级钉进实验：缓存值是 Module 对象（不是 exports 本身），`require` 返回的是缓存记录上的 `exports` 属性。两个实验代码与实跑输出（Node 24.10.0）如下：

```js
// counter.cjs
module.exports.n = 0;
```

```js
// main-cache.cjs
const path = require.resolve('./counter.cjs');
const c1 = require('./counter.cjs');
c1.n += 1;
const c2 = require('./counter.cjs');
console.log('c2.n =', c2.n);
console.log('c1 === c2 :', c1 === c2);
console.log('cache size:', Object.keys(require.cache).length);
delete require.cache[path];
const c3 = require('./counter.cjs');
console.log('after delete: c3.n =', c3.n, '| c3 === c1 :', c3 === c1);
console.log('c1.n untouched =', c1.n);
```

实跑输出逐行是 `1`、`true`、`2`、`0 | false`、`1`。两个细节值得圈出来：其一，cache size 是 **2** 不是 1——`require.cache` 里**入口模块自身也占一条**，排查缓存问题时别被键的数量骗到；其二，删除缓存键重新加载得到的是全新对象，而 c1 手里的旧对象纹丝不动——「热移除」重置的只是缓存的登记，不是对象的世界。单例的「单」是**缓存键层面**的单：同一进程内同一绝对路径只有一条 Module 记录，键一删、世界就可以裂成两半。

## 循环依赖的进阶形态：循环中途重赋值 module.exports

关键概念一节讲过「半成品 exports」；真正的深水区是模块在循环方 require 返回**之后**重赋值 `module.exports`——此时两个世界拿到的不再是同一个对象：

```js
// m.cjs
module.exports.v = 'm1';
const n = require('./n.cjs');
module.exports.v = 'm2';

// n.cjs
const m = require('./m.cjs');
console.log('[n] m.v =', m.v);
module.exports.v = 'n';

// main.cjs
const m = require('./m.cjs');
console.log('[main] m.v =', m.v);
```

实跑输出：`[n] m.v = m1` → `[main] m.v = m2`。机制：n 在循环点拿到的是 m 当时的 `module.exports` 对象（`v: 'm1'` 那个）；随后 m 重赋值 `module.exports`，包装函数里的 `module` 变量指向了新对象；main 的 `require` 在 m 执行完毕后返回**当前的** `module.exports`——新对象。于是 n 手里是旧对象、main 手里是新对象，同一个模块在同一进程里以两个身份存活。这正是双格式包双实例问题在单格式世界的微缩模型：`instanceof` 失败、模块级状态分裂，五行代码全部可复现。防御：模块一旦可能被循环引用，就不要中途重赋值 `module.exports`；要导出「会成长的接口」，就在初始对象上继续挂属性。

## 动态 import() 的三种失败模式

`import()` 把加载失败从「进程级崩溃」变成「可捕获的 rejection」，但三种失败的行为并不相同（全部 node 实跑，Node 24.10.0）：

**模式一：定位失败（文件不存在）。** 捕获物是普通 Error，`code` 为 `ERR_MODULE_NOT_FOUND`，主流程继续。细节：**错误对象不缓存**——同一缺失文件 import 两次，两次 rejection 是两个不同的 Error 对象（实测 `e1 === e2` 为 `false`），每次都重新走解析。对照静态 `import` 同一个缺失文件：定位失败发生在链接期，任何代码都不会执行，进程直接以退出码 1 崩溃（实测 `never printed` 一行不存在）。

**模式二：语法错误。** 目标模块源码解析不过（比如 `export let x = ;`），`import()` 的 promise 以 `SyntaxError` 拒绝，可捕获——主模块照常运行（实测 `caught: SyntaxError`）。静态导入同样的模块则整张模块图报废。

**模式三：求值期抛错。** 目标模块体执行到一半 throw：模块体的副作用**只发生一次**（实测 `[boom] module evaluating` 只打印一遍），错误对象**被缓存**，此后每次 `import()` 都以**同一个** Error 对象拒绝（实测 `e1 === e2` 为 `true`）。

模式一与模式三的对照是本节最值钱的结论：定位失败可以重试（比如装好依赖之后再 `import()`，第二次会真的成功）；求值失败不能靠重试恢复——Node 记住了失败的求值状态，同一进程内再怎么 import 都是同一个错误，想重新求值只能换子进程或换模块 URL（URL 上加查询参数本质就是换 URL）。把「重试一定有救」写进容错逻辑之前，先分清失败发生在哪个阶段。

## conditions 字段与自定义条件

关键概念一节见过 `import`、`require`、`default` 三个条件；`exports` 条件对象其实是**加载环境与包作者之间的协商通道**——运行时激活哪些条件名，决定包的哪个文件被加载。运行时内置激活的有 `node`（Node 环境专用实现）、`import` 与 `require`（按加载器格式）、兜底的 `default`；打包器会额外激活 `browser`、`module` 等名字；`types` 条件只有 TypeScript 的解析器消费，Node 运行时对它视而不见。

自定义条件用 `--conditions` 旗标激活，实测一组（Node 24.10.0）：包的入口条件对象写成 `night` 指向 `./night.mjs`、`import` 指向 `./esm.mjs`、`default` 指向 `./default.mjs`，主模块从包名导入一个标记导出——不带旗标跑打印 `loaded: esm.mjs`，加 `--conditions=night` 跑打印 `loaded: night.mjs`。这就是「同一份代码在不同环境解析出不同文件」的标准机制：测试环境常用它激活 `development` 或 `test` 条件切出调试入口，而不必改包的源码。读懂条件激活还有一层排查收益：遇到「同一个包在不同环境行为不一致」，第一件事就是列出各环境的条件激活集合——浏览器打包器、Node 服务端、测试运行器各自激活的名字不同，同一份 package.json 自然解析出不同的文件。

它与双格式包隐患的关系要钉牢：条件对象指向的每个不同文件，都是双实例风险的入口。官方缓解思路落在条件上就是——`import` 与 `require` 两个条件**指向同一份实现文件**（或让两者都引一个共享核心），包装层只做格式适配，模块级状态就只会有一份。

## 双格式包的最小安全骨架

关键概念一节给过双格式包的示意配置，但那份配置恰好就是双实例风险的形态——`import` 与 `require` 各指向一个独立文件，各自带完整实现。官方文档《Dual package hazard》给出的最小安全骨架是把「实现」与「格式壳」分开：条件对象让两种格式各自命中一个**薄壳**，薄壳再引同一份核心实现：

```jsonc
{
  "name": "some-pkg",
  "exports": {
    ".": {
      "import": "./esm-wrapper.mjs",
      "require": "./cjs-wrapper.cjs",
      "default": "./cjs-wrapper.cjs"
    }
  }
}
```

两个薄壳都只做一件事——引入并转手唯一的核心实现文件，自己不持有任何模块级状态。这样即便应用的两条依赖路径分别以两种格式加载这个包，被复制两次的只是「壳」，所有真正的状态都住在唯一的核心里：`instanceof` 要比对的类、单例、缓存全部只有一份。工程判断顺序再强调一遍：能单格式就单格式；确需双格式，先画一张「哪个文件持有状态」的图——状态文件不在壳上的骨架才是安全骨架，否则条件写得再漂亮也只是把双实例问题推迟到运行期才炸。

## 工程三陷阱

**陷阱一：把「删缓存重 require」当成状态重置。** 本节实测已经给出反例：删掉缓存键后 `c3 === c1` 为 `false`、`c1.n` 仍是 1——旧对象被任何持有者握着就还活着；模块在 exports 上挂的定时器与监听器更不会因此清理。防御：需要「重置」语义的模块自己提供 `reset()` 或 `dispose()` 接口；热重载工具只在开发期玩，这与正文「删缓存热重载天然不完整」的结论互为表里。

**陷阱二：把「动态 import 失败重试」当万能恢复。** 模式三的求值失败被缓存，同一进程内重试只会拿到同一个 Error 对象（实测为证）。容错代码要按失败模式分流：定位失败可退避重试，求值失败只能换进程、换 URL 或直接降级。两者不分的重试逻辑在生产里的表现为「重试十次全红，日志里始终是同一个错误堆栈」。

**陷阱三：把双格式包当纯性能问题。** 双实例的代价不是「多占一点内存」：`instanceof` 跨实例必败、模块级开关（日志只打一次、连接池单例）静默翻倍、缓存命中率腰斩，而且全程没有任何报错。防御次序：优先单格式发布；确需双格式时让两个入口共享同一份实现文件；跨格式必须一致的状态放到不随格式复制的位置（外部存储或全局注册表）。

## 输出预测题（增补）

### 题 4（循环中途重赋值）

题 1 的姊妹版——把「读属性」换成「整个对象被换掉」：

```js
// m.cjs
module.exports.v = 'm1';
const n = require('./n.cjs');
module.exports.v = 'm2';

// n.cjs
const m = require('./m.cjs');
console.log('[n] m.v =', m.v);

// main.cjs
const m = require('./m.cjs');
console.log('[main] m.v =', m.v);
```

`node main.cjs` 输出什么？n 与 main 拿到的是同一个对象吗？

### 题 5（失败模式判别）

两个脚本各输出什么（第二行是 `true` 还是 `false`）？为什么一个缓存错误对象、一个不缓存？

```js
// a.mjs —— 目标模块 boom.mjs 求值期 throw new Error('boom')
let e1, e2;
try { await import('./boom.mjs'); } catch (e) { e1 = e; }
try { await import('./boom.mjs'); } catch (e) { e2 = e; }
console.log(e1.message, '| same:', e1 === e2);
```

```js
// b.mjs —— 目标模块 ghost.mjs 不存在
let f1, f2;
try { await import('./ghost.mjs'); } catch (e) { f1 = e; }
try { await import('./ghost.mjs'); } catch (e) { f2 = e; }
console.log(f1.code, '| same:', f1 === f2);
```

### 题 6（缓存单例）

counter.cjs 只有 `module.exports.n = 0`。main 依次：require 并把 `n` 加到 1；再次 require 得 `c2`，打印 `c2.n`；删除该路径的缓存键后重新 require 得 `c3`，打印 `c3.n` 与 `c3 === c1`。四行输出各是什么？

## 增补题答案

### 题 4 答案

`[n] m.v = m1` → `[main] m.v = m2`（实跑一致）。**不是同一个对象**：n 在循环点拿走的是 m 当时的 exports（`v: 'm1'` 那个），此后 m 重赋值 `module.exports` 换成了新对象，main 要等 m 执行完才拿到当前的 exports——新对象。对照题 1：题 1 里 main 与 y 共享同一个对象（因为 x 从未重赋值），本题恰好踩在「重赋值切断共享」这个开关上。这也补全了「CJS 循环依赖结果不可移植」的另一半：不只时序影响属性值，中途重赋值还能让循环双方各持一个世界。

### 题 5 答案

a 打 `boom | same: true`（boom.mjs 的求值副作用只发生一次），b 打 `ERR_MODULE_NOT_FOUND | same: false`（实跑一致）。差异的机制：求值状态记录在模块图上——模块一旦求值抛错，Node 记住的就是这个失败状态，后续 import 直接重抛同一个错误对象；定位失败发生在**解析阶段**，模块记录根本没建立，每次 import 重新解析、重新构造错误。工程含义即陷阱二：求值失败重试无效，定位失败重试有效。

### 题 6 答案

`1`、`0`、`false`（实跑一致）。第一次与第二次 require 命中同一缓存记录，`c2 === c1`，所以 `c2.n` 是 1；删除缓存键后重新执行模块，`c3.n` 回到 0，且与 c1 不同对象。注意 `require.cache` 的键数量此时是 2 不是 1——入口模块自身也在缓存里，别把「缓存里有一条」当成「只加载了一个模块」。

## 模块排查速查表

| 症状 | 机制根源 | 排查动作 |
| --- | --- | --- |
| 命名导入读到旧值 | lexer 快照 + 模块内改写属性 | 改 default 导入 + 属性访问 |
| instanceof 失败、状态翻倍 | 双格式包双实例 | 给两格式入口打加载标记日志数实例；让入口共享实现文件 |
| 循环依赖拿到 undefined 或 TDZ | 求值顺序随入口变化 | 画模块图找环；抽公共第三模块切环 |
| 删缓存后状态没清干净 | 旧对象被其他模块持有 | 搜旧对象的引用持有者；给模块加 dispose |
| ESM 里用不了 require 与 `__dirname` | ESM 没有包装函数 | `createRequire(import.meta.url)` + `fileURLToPath` |
| `.js` 改 ESM 写法直接 SyntaxError | 最近一层 package.json 的 type | 确认 type 字段或改扩展名为 `.mjs` |
| 逻辑上装了一个包、行为像两个 | 条件导出把两种格式解析到不同文件 | 分别解析两种格式的入口路径对照 |

最后一行的排查入口动作：把 `import` 与 `require` 两条路径各自解析出的文件打出来一对照，就知道包是不是被加载成了两份——双实例问题几乎总能在这条命令的输出里现形。
