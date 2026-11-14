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
