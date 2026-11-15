---
sources:
  - stage-3-ts-types
---

# 14 · 声明文件与模块解析

> 对应大纲：阶段 3.6 —— 声明文件与模块解析：`.d.ts` 编写、`moduleResolution`（node10 vs bundler）、`declare`/`declare module`

## 学习目标

1. 说清 `.d.ts` 的本质（只描述类型、不产生值），以及 `declare` 家族各自的语义
2. 区分两种 `declare module`：给无类型 JS 库**整体补声明** vs 给已有模块**增强（augmentation）**
3. 背出 `moduleResolution` 四种模式的差异表，能解释「node16+ 为什么必须写 `.js` 后缀」
4. 讲出 TS 找类型的顺序：包自带 types → `@types` 作用域包 → 全局 `@types` 自动包含，并能对照本工作区 tsconfig 解释 `types: []`
5. 独立完成「给一个无类型模块写声明并使用」的全流程

## 关键概念

### 1. `.d.ts`：环境声明（ambient declaration）

一手依据：TS Handbook《Modules Reference》与《Declaration Reference》（"d.ts 声明文件" 相关章节）。

`.ts` 文件 = 类型 + 实现，会被编译成 JS；`.d.ts` 文件 = **只有类型的世界**，编译产物为零。它对编译器说「相信我，运行时存在这些名字」，运行时对它一无所知。因此：**环境声明永不包含函数体/初始值，成员签名以分号结尾。**

`declare` 家族语义速查：

| 写法 | 语义 |
| --- | --- |
| `declare const x: T` | 存在全局变量 `x`（如 CDN 引入的 `jQuery`） |
| `declare function f(a: A): B;` | 存在全局函数 |
| `declare class C {}` | 存在全局类（类型 + 构造器双重身份） |
| `declare namespace N {}` | 存在全局命名空间（jQuery 时代全局库的常见形态） |
| `declare module 'x' {}` | 见下：两种身份，取决于所在文件是脚本还是模块 |
| `declare global {}` | 模块文件内，向全局作用域合并成员（如给 `Array` 加方法） |

三斜线指令一句话：`/// <reference path="./other.d.ts" />` 手动把声明文件拉进编译（模块化时代基本被 import 取代）；`/// <reference types="node" />` 显式引入 `@types/node`——它是 tsconfig `types` 数组的前身，新代码用配置而非指令。

环境声明速查模板（覆盖无类型 JS 库的四种导出形态）：

```ts
declare module 'untyped-shapes' {
  // 1. 命名导出：函数可以写多条签名表达重载
  export function area(s: Circle): number;
  export function area(s: Square): number;
  // 2. 命名导出：常量/类型
  export const VERSION: string;
  export type Shape = Circle | Square;
  // 3. 默认导出是函数（而非类）时：export default function
  export default function init(options?: InitOptions): void;
  // 4. CJS 单导出对象：export =（配合 namespace 挂属性，见下节）
  // export = api;   // 同一个 declare module 内不要与 export default 混用
}
```

注意：同一个 `declare module` 里 `export default` 与 `export =` 不能同时出现——前者对应 ESM 的 `default`，后者对应 CJS 的 `module.exports`，一个模块运行时只有一种「整包导出」形态。混用实测报 **TS2309**: An export assignment cannot be used in a module with other exported elements.

### 2. `declare module` 的两副面孔（一个规则决定）

**规则：看所在文件是「全局脚本」还是「模块」**（有无顶层 `import`/`export`）：

- 所在文件是**全局脚本**（无顶层 import/export）→ `declare module 'untyped-shapes' { ... }` 是**环境模块声明**：凭空声明一个模块的全部类型，`'untyped-shapes'` 不需要真实存在。这就是「给无类型 JS 库整体补声明」；
- 所在文件是**模块** → `declare module 'lodash' { ... }` 是**模块增强（module augmentation）**：`'lodash'` 必须能被解析到（通常顶部还要 `import 'lodash'`），效果是**给已有模块追加成员**，原有成员不丢。

增强的典型用途：给第三方库补方法、给路由框架补字段：

```ts
// module-augmentation.ts（模块文件：有 import，declare module 才是「增强」）
import 'untyped-shapes';
declare module 'untyped-shapes' {
  export function perimeter(s: Shape): number; // 追加导出，原 area/createCircle 不受影响
}
```

本工作区实测的两个反例（容易踩，值得记错误码）：

- 全局脚本文件顶层写 `declare global` → **TS2669**（`declare global` 只能出现在模块文件里）；
- 给环境声明文件加一行 `export {}`（变模块）→ 环境模块声明失效成增强，消费方 `import` 立刻报 **TS2307**（找不到模块）。

结论：**环境模块声明（要脚本文件）与 `declare global`（要模块文件）不能同居一个文件**——所以练习里 `shapes.d.ts`（脚本）声明库，`Array` 的全局增强写在模块文件里。同理，`interface Array<T>` 写在全局脚本顶层也能直接合并进全局作用域（declaration merging），效果等价于 `declare global`。

### 3. `export =` / `import x = require()` 与 `import type`

一手依据：TS Handbook《Modules Reference》"export = and import = require" 小节；TS 3.8 Release Notes（import type）。

- `export =`：描述 CommonJS 库的「单一导出对象」（`module.exports = ...`）。消费方在 ESM 语境下用 `import x = require('mod')`（TS 专属语法），或开 `esModuleInterop` 后直接 `import x from 'mod'`：

```ts
// cjs-lib.d.ts
declare function greeter(name: string): string;
declare namespace greeter { const version: string; } // 函数上挂属性：CJS 库常见形态
export = greeter;

// 消费方（TS 文件）
import greeter = require('cjs-lib');        // 传统写法
// 或 esModuleInterop: true 时
import greeterDefault from 'cjs-lib';
```

- `import type` 的使用时机（一句话：**只取类型就写它**）：

```ts
import type { Shape } from 'untyped-shapes'; // 整行被擦除：不产生运行时 import
import type ShapeLib from 'untyped-shapes';  // 默认导出同理，ShapeLib 即实例类型
```

  三个硬收益：编译产物干净（少一个可能失败的运行时模块解析）、避免循环依赖中的值引用、`isolatedModules`/`verbatimModuleSyntax` 下类型导入必须显式标注（见 `notes/stage-3-ts-types/15-tsconfig.md`）。练习 `01-ambient-usage.ts` 正是用它做到「库不存在也能运行」。

### 4. `moduleResolution` 对比表

一手依据：TS Handbook《Modules Reference》"Module Resolution" 小节；TS 4.7 Release Notes（node16/nodenext）；TS 5.0 Release Notes（bundler；`node` 更名 `node10` 并废弃；`classic` 同批废弃）。

| 模式 | 对应 `module` | 相对导入扩展名 | `package.json exports` | 目录 index 解析 | 何时用 |
| --- | --- | --- | --- | --- | --- |
| `node10`（旧名 `node`，TS 5.0 起废弃） | commonjs | 可省略（老 Node 补全规则） | 不读（只看 `main`/`types`） | 支持 `dir/index.ts` | 只为维护老项目 |
| `node16` / `nodenext`（TS 4.7） | node16 / nodenext | **ESM 文件必须写 `.js`**；CJS 文件可省 | 读，含 `types` 条件 | ESM 不支持目录 index，CJS 支持 | 产物直接跑在 Node 上（CLI、SSR、Node 服务） |
| `bundler`（TS 5.0） | esnext / preserve | 可省略（bundler 会补） | 读，含 `types` 条件 | 支持 | 交给 Vite/webpack/esbuild/swc/tsx 打包的应用 |
| `classic` | — | — | — | — | 已废弃，别用 |

**为什么 node16+ 必须写 `.js` 后缀（原理不是刁难）**：Node 的 ESM 运行时**不做任何路径补全**——不猜扩展名、不找 `index.js`，`import './util'` 在 Node ESM 里直接 `ERR_MODULE_NOT_FOUND`。而 TS 的 `.ts` 源文件编译后扩展名会变成 `.js`，TS 又无法替你改写字符串里的导入路径，于是约定：**源码里写「编译后的目标名」**`import './util.js'`，TS 解析时把它映射回 `./util.ts`。这是「类型检查环境 = 运行时环境」理念的直接产物——nodenext 的 `next` 就是「跟着 Node 的下一个真实规则走」。

`exports` 字段与 `types` 条件（现代包的标配，决定「子路径能不能被 import」）：

```json
{
  "name": "my-lib",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",   // types 条件必须排在最前
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": "./dist/utils.js"      // 没列出的子路径 import 会直接报错
  }
}
```

注意：一旦声明 `exports`，**没列出的路径一律不可导入**（包括 `my-lib/dist/internal`）；`types` 条件必须写在 `import`/`require` 之前（TS 按声明顺序匹配）。

### 5. 类型解析顺序与全局 `@types` 自动包含

TS 为 `import 'x'` 找类型时按顺序尝试：

1. **包自带类型**：`x` 的 `package.json` 里 `types`/`typings` 字段 → 或包根的 `index.d.ts`；
2. **相邻 `@types` 作用域包**：`node_modules/@types/x`（`import 'x'` 能命中它）；
3. **全局类型自动包含**：`node_modules/@types/` 下**所有**包会被自动加进程序——不需要任何 import，`process`、`jest.fn()` 这类「凭空出现的全局名字」就是从这里来的。

对照本工作区 `tsconfig.json`（`"types": []`）：

```jsonc
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],   // console 来自 lib.dom.d.ts，不需要 @types/node
    "types": []                 // 关闭第 3 步：不自动包含任何 @types 包
  }
}
```

`types: []` 的效果：全局作用域只有 lib 里声明的名字（`console`、`setTimeout` 的 DOM 版本），`process.env` 之类 Node 专有 API 一律报错——除非显式 `npx tsc -p` 时把 `@types/node` 加回 `types` 数组。对本工作区这是刻意选择：TS 练习只用纯语言特性，需要 Node API 的演示走 `.mjs`。代价是每个 tsc 显式文件命令都不受 tsconfig 影响时，要自己带 `--lib`。

`@types` 的版本对应一句话： DefinitelyTyped 的包用「大版本 tag」跟库对齐——`lodash@4.x` 对应 `@types/lodash@4.x`；一个库升级改了 API 而 `@types` 没跟上时，先查 `@types` 的版本号是否落后于库的大版本。老包不支持 `exports` 字段的场景还有 `typesVersions`（在库自己的 package.json 里按版本范围映射 types 路径），见到要认识，新包首选 `exports.types`。

### 6. 编写实践：给无类型模块写声明的完整流程

对应练习 `exercises/ts-declarations/`（假想库 `untyped-shapes`）：

1. **看运行时 API 长什么样**（文档或源码）：`area(s)`、`createCircle(opts)`、默认导出的类 `ShapeLib`；
2. **写 `shapes.d.ts`**（全局脚本，`declare module 'untyped-shapes'`）：
   - 类型（`Shape`/`Circle`）用 `interface`/`type` 导出；选项对象必填项收顶层、可选项加 `?`；
   - 函数只写签名；类写 `constructor` + 成员，全部以分号结尾；
3. **让声明进入程序**：tsconfig `include` 覆盖它，或 tsc 命令行把它与使用文件一起传入（练习用后者：`npx tsc ... shapes.d.ts 01-ambient-usage.ts`）；
4. **消费方用 `import type`**：类型照常标注；运行时行为由库（练习中是内联 mock）提供；
5. **全局增强**（如 `Array.prototype.last`）：类型靠 `declare global`（写在模块文件）或全局 interface 合并（写在脚本文件），**运行时 polyfill 永远要自己补**——声明只动类型层。

### 7. `isolatedModules` 与 re-export type 的坑（引子）

单文件转译器（esbuild/swc/tsx）逐个文件编译，**看不见别的文件**。于是：

```ts
export { Shape } from 'untyped-shapes'; // Shape 是纯类型还是值？转译器不知道
```

如果它是纯类型，转译器仍会生成一条运行时 re-export，而运行时根本没有这个绑定 → 崩。修法是显式声明意图：`export type { Shape } from 'untyped-shapes';`。`isolatedModules`（或更强的 `verbatimModuleSyntax`）会把这类「必须二选一」的写法在编译期拦下——选项细节、`const enum` 的坑在 `notes/stage-3-ts-types/15-tsconfig.md` 展开。

## 可运行示例

```bash
# 运行（import type 被擦除，库不存在也能跑）
npx tsx exercises/ts-declarations/01-ambient-usage.ts

# 类型校验：声明与使用文件必须一起进程序
npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-declarations/shapes.d.ts exercises/ts-declarations/01-ambient-usage.ts
```

预期输出（与文件头注释一致）：

```text
createCircle: circle 1
area(circle r=1): 3.1416
area(square s=3): 9
默认导出类 new: ShapeLib(demo)
Array.prototype.last: 3 undefined
```

三个验证实验（都实测过）：

1. 只传 `01-ambient-usage.ts` 不传 `shapes.d.ts` → 两个 `import type` 报 TS2307，证明类型来自声明文件；
2. 运行时不传 shapes.d.ts 无所谓 → `import type` 被擦除，mock 全在使用文件里，`npx tsx` 照常运行，证明环境声明不产生值；
3. 给 `shapes.d.ts` 加一行 `export {}` 再校验 → TS2307 出现，证明「脚本/模块身份」决定 `declare module` 的语义。

## 易错点与面试高频

1. **`.d.ts` 里写实现** → 直接语法错误（环境上下文只允许声明）。
2. **`declare module` 加了 `export {}` 就坏** → 文件从脚本变模块，环境声明变成增强；反过来 `declare global` 必须在模块文件里。一个文件只能扮演一种身份。
3. **以为声明会带来运行时行为** → `Array.prototype.last` 声明了类型，不 polyfill 调用就是 `TypeError: ... last is not a function`。
4. **`module: esnext` + `moduleResolution: node10` 混搭** → 解析规则与目标环境不一致（exports 不读、扩展名判断错）。配对见 `notes/stage-3-ts-types/15-tsconfig.md` 的配对表。
5. **node16 下省略 `.js` 后缀** → TS2835："Relative import paths need explicit file extensions..."。记住原因：Node ESM 不补全路径，TS 不改写字符串。
6. **`types` 条件写在了 `import` 后面** → `exports` 条件按顺序匹配，类型解析失败。`types` 永远排第一。
7. **面试高频**：`import type` 与 `import` 的区别（擦除 vs 保留）；给 `window.foo` 补类型怎么做（`declare global { interface Window { foo: string } }`）；`@types/foo` 是怎么被找到的（解析顺序 1→2→3）。

## 输出预测题

### 题 1（删掉声明文件）

工作区里执行：

```bash
npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-declarations/01-ambient-usage.ts
# （注意：没有传 shapes.d.ts）
npx tsx exercises/ts-declarations/01-ambient-usage.ts
```

问：第一条命令报什么错？第二条命令的结果是什么？为什么类型挂了运行时却没事？

### 题 2（moduleResolution 判断）

同一个文件 `src/main.ts`：`import { helper } from './util';`（旁边存在 `src/util.ts`）。分别把 tsconfig 配成 A：`module: esnext, moduleResolution: bundler`；B：`module: nodenext, moduleResolution: nodenext`。问 A、B 是否各自通过？B 不通过的话报什么、怎么改？

## 预测题答案

### 题 1

- 第一条命令：两个 `import type` 处报 `TS2307: Cannot find module 'untyped-shapes' or its corresponding type declarations.`（随后依赖这些类型的 `never` 穷尽检查等连带报错）；`[1,2,3].last()` **不报错**——因为 `Array` 的 `declare global` 就写在 `01-ambient-usage.ts` 自己身上。
- 第二条命令：**照常运行并打印全部五行输出**。
- 原因：`import type` 在转译阶段整行擦除，运行时根本不会去解析 `'untyped-shapes'`；mock 实现与 polyfill 都在使用文件里。环境声明只服务于编译器——「类型挂了、运行时没事」正是它「只描述、不产生值」的本质。

### 题 2

- A（bundler）：通过。bundler 模式模拟打包器行为，允许省略扩展名（由 Vite/esbuild 运行时补全）。
- B（nodenext）：**报 TS2835**（Relative import paths need explicit file extensions...）。原因：Node 的 ESM 运行时不做路径补全，而 TS 不会改写导入字符串，因此要求写「编译后的名字」。改成 `import { helper } from './util.js';` 即通过——TS 会自动把 `./util.js` 映射到同目录的 `src/util.ts`。

## 延伸阅读

- TS Handbook《Modules Reference》（moduleResolution 各模式、exports/types 条件、export = ）：https://www.typescriptlang.org/docs/handbook/modules-reference.html
- TS Handbook《Declaration Reference》（.d.ts 与 declare 家族）：https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html
- TS 3.8 Release Notes（import type）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html
- TS 4.7 Release Notes（node16/nodenext）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html
- TS 5.0 Release Notes（bundler、node10 更名与废弃）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- Node.js 官方文档《Packages》（exports 字段）：https://nodejs.org/api/packages.html
- 下一站：`notes/stage-3-ts-types/15-tsconfig.md`（阶段 3.7 tsconfig 关键项）

## 附：声明文件的现场排查速查（收尾增补）

本册讲了 .d.ts 的结构与模块解析，收尾把"装了包却没有类型 / 类型不对"的排查路径压成速查表：

| 症状 | 第一嫌疑 | 验证动作 |
|---|---|---|
| `import x from 'pkg'` 报"找不到声明" | 包没带类型且无 @types | ls node_modules/pkg 看 types 字段；查 DefinitelyTyped |
| 类型是隐式 any（noImplicitAny 没报） | skipLibCheck 或宽松 tsconfig | 查 tsconfig 的 three lines：strict/skipLibCheck/moduleResolution |
| 补全出来的类型是 any | 解析到了 JS 而非 .d.ts | 查 package.json 的 types/exports.types 字段指向 |
| 类型与运行时不符（版本漂移） | @types 版本与包版本脱钩 | 对齐两边的版本号；库自带类型时删 @types |
| monorepo 里 monorepo 内包没有类型 | 没走 source 直接引用 | workspace 协议 + 源码引用（含 tsconfig paths） |
| `export =` 的包 import 失败 | CJS/ESM 互操作姿势 | esModuleInterop / allowSyntheticDefaultImports |

排查表的统一心法：**类型丢失永远是"解析链"断了**——从 import 语句到 types 字段到 tsconfig 三开关，六行症状对应六处断点。逐行对号比全局重装快得多。

### 收尾自测（增补）

1. 排查表的六行各断在解析链的哪一环？按链路顺序复述一遍。
2. skipLibCheck 关掉了什么检查、省了什么成本？为什么它几乎总是开着？
3. `export =` 与 `export default` 的互操作差异在 importsNotUsedAsValues/esModuleInterop 下各怎么表现？
4. 给你的包加类型的三种发布姿势（随包/@types/直接源码）各自的适用条件是什么？

排查表再补最后一节"预防优于排查"——发包前的一次自查，能消灭表里的前四行症状：

- 包内有手写 .d.ts → package.json 写 `"types": "./dist/index.d.ts"`，发版前 tsc 空消费一次（新建空项目 install 你的包试 import）；
- 依赖 @types → 确认 @types 的版本约定与主包对齐（README 写清楚对应关系）；
- 双格式包（[16 册](../stage-4-engineering/16-modules-esm-cjs.md)）→ exports 里 types 条件放第一位，双入口各指向对应声明；
- monorepo 内部包 → 直接发布 TS 源 + 消费方 include，或走 build 产物 + 声明，二选一并写进 ADR，不要两套并存。

预防清单四行 = 发布类型包的全部纪律。本册与 16 册（模块）、[13 册](13-ts-type-theory.md)（类型理论）合起来构成"类型如何跨文件、跨包流动"的完整链路——声明文件是这条链路的最后一公里，也是工程上最容易断的一环。

### 收尾一句话（增补）

声明文件的本质是**类型宇宙的接口契约**——运行时靠 package.json 的入口字段，类型靠 types 字段，两套入口并行不悖；排查一切"类型找不到"的问题，都是在追这两套入口谁断了。

### 补充：类型入口与运行时入口的对齐表（最终）

| 入口种类 | package.json 字段 | 断链症状 | 修复 |
|---|---|---|---|
| CJS 运行时 | main | require 找不到 | 补 main |
| ESM 运行时 | module / exports.import | ESM 消费失败 | 补 exports 条件 |
| CJS 类型 | exports.types / types | 消费方隐式 any | 补 types 条件 |
| ESM 类型 | exports."types" | 同上（另一入口） | 双条件各配 types |
| 子路径 | exports"./x" | 深路径 import 失败 | 每个子路径单独配 |

五行对齐表是"发布一个可被正确消费的包"的完整清单——运行时与类型各两条入口 + 子路径扩展，任何一行缺失都是排查表里某行症状的根因。

### 收尾自测（增补）

7. 双格式包的 exports 里 types 条件为什么必须放第一组？放第二组会发生什么？

---

## 机制深一层：三斜线指令、声明文件与程序的「装配顺序」

**三斜线指令的解析规则。** 一手依据 Handbook《Triple-Slash Directives》：

> "Triple-slash directives are only valid at the top of their containing file. A triple-slash directive can only be preceded by single or multi-line comments, including other triple-slash directives."

两个要点：其一，「只许在顶部」的判定是语法级的——出现在任何语句或声明之后的三斜线注释会被当普通注释，**不报错但失效**，这是「明明写了指令却没生效」的隐蔽根因；其二，`/// <reference path="..." />` 按原文 "resolved relative to the containing file" 相对**当前文件**解析，与 tsconfig 的 include 相对项目根解析不是一回事，混用时会出现「本地能编、别人不能编」。

三种指令的分工：`path` 声明文件级依赖（把另一个文件拉进编译）；`types` 声明对 @types 包的依赖——原文的比喻是 "an import for declaration packages"（声明包的 import），解析过程与 import 语句相同，`/// <reference types="node" />` 就是「把 @types/node 拉进编译」；`lib` 允许单个文件显式拉内置 lib（原文示例：`/// <reference lib="es2017.string" />` 等价于编译时给 `--lib es2017.string`）。三者的共同点：它们都是**声明依赖**，不是「加载实现」，运行时语义为零——和环境声明同宗。

**程序是怎么被装配出来的。** 一次编译的程序由四路来源汇成：入口与 import 的传递闭包（源码与声明文件都算）、tsconfig 的 include/files、`types` 数组显式点名的 @types 包、自动包含的 `node_modules/@types` 全家（`types: []` 关掉的是最后一路）。理解装配顺序能解释很多灵异现象：为什么删一个没人 import 的 `.d.ts` 会让远处报错（它可能只靠 include 进程序）；为什么 `types: []` 之后 `process` 消失（正文 §5）；为什么同一个 `declare module` 在脚本里是「凭空造模块」、在模块里是「增强已有模块」——后者只有当真实模块通过 import 链或 @types 进了程序才成立，否则增强落空（幽灵库实验，见进阶预测题 1）。

**文件语境：nodenext 判断 ESM / CJS 的实测。** 正文 §4 说「node16/nodenext 下 ESM 文件必须写 `.js`、CJS 可省」。实测把这个「文件是 ESM 还是 CJS」的判定条件演示了出来：依据是**最近的 package.json 的 type 字段**（TS 4.7 Release Notes "type in package.json and New Extensions" 小节）。三组对照（`--module nodenext --moduleResolution nodenext`，全部真跑过）：

| 语境 | 写法 | 结果 |
| --- | --- | --- |
| 附近没有 package.json | `import { helper } from './util'` | 通过——默认按 CommonJS 处理，CJS 允许老 Node 补全规则 |
| package.json 为 `"type": "module"` | `import { helper } from './util'` | TS2835，报错原文自带修正建议 `Did you mean './util.js'?` |
| 同上 ESM 语境 | `import { helper } from './util.ts'` | TS5097：默认只许写编译后的名字 |

TS 4.7 同时引入 `.mts` 与 `.cts` 扩展名（"New File Extensions" 小节），用文件名直接钉死语境、不依赖 package.json——在双格式仓库里比来回改 type 字段干净得多。注意第一行的推论：**「文件是 ESM 还是 CJS」不是文件自己的属性，是语境的属性**；同一个文件换个目录就可能改变导入书写规则。

## 工程三陷阱：声明文件落地时的三个翻车点

**陷阱一：声明文件没被装进编译程序，类型静默缺失。** 触发场景：新增的 `types/api.d.ts` 放在 include 覆盖不到的目录；或者临时用 tsc 命令行检查时只传了消费文件、没传声明文件——`import type` 全线 TS2307；更糟的是宽松配置下变隐式 any，一个报错都没有。根因：环境声明不靠 import 生效，靠「被装配进程序」（见机制深一层第二段），装配链断了它就等于不存在。规避：声明目录显式写进 tsconfig 的 include；CI 的类型检查命令把声明文件与消费文件一起传（正文可运行示例正是这么做的）；再配一道「空消费」冒烟测试——新目录建个 index.ts，import 你声明的模块，`tsc --noEmit` 必须零报错才算声明可用。

**陷阱二：同名增强互相打架，TS2717。** 触发场景：两个团队各自给 `Window` 加 `foo` 属性——一处声明 string、一处声明 number。实测报错原文：`Subsequent property declarations must have the same type. Property 'foo' must be of type 'string', but here has type 'number'.`（TS2717）。根因：声明合并的规则是「同名接口成员的重复声明类型必须完全一致」，模块增强就是声明合并，所以冲突在合并处爆，而不是像普通变量那样报重名。规避：全局增强集中到固定文件统一管理（本工作区把 Array 与 Window 的增强各放在一个文件）；给第三方补全局成员前先全仓搜索既有声明；能不用 declare global 就不用——模块作用域的增强比全局增强可控得多。

**陷阱三：exports 字段配错，消费方静默 any 或 TS2307。** 触发场景：发双格式包时 types 条件写在 import 或 require 之后（条件按声明顺序匹配，解析到运行时分支就不再看类型）；或子路径没逐个列进 exports——实测：对只声明了 `.` 的包 import 未列出的 `pkg/internal`，nodenext 与 bundler 两种解析模式**都**报 TS2307。根因：exports 是白名单，没列的路径在包层就被拒绝；条件顺序让「先写运行时条件」的包解析到错误的类型入口。规避：发包前做「空消费三件套」——空项目安装后消费一次；`--module nodenext` 与 `--moduleResolution bundler` 各跑一遍 `tsc --noEmit`；`node -e "require('pkg')"` 与动态 import 各验一次运行时入口。类型入口与运行时入口是两套字段，测试也要两套。

## 排查速查表：声明与模块解析错误码（本机实测口径）

前六行均在 tsc 5.9.3 下实测复现，末行为纪律项：

| 错误码与关键信息 | 触发场景 | 根因 | 处置 |
| --- | --- | --- | --- |
| TS2307 `Cannot find module` | 声明没进程序；exports 没列子路径；无 @types | 解析链断在某一环 | 逐一核对 include、exports、@types 三个入口 |
| TS2669 `Augmentations for the global scope...` | 全局脚本文件里写 declare global | declare global 只许模块文件 | 文件加 `export {}`，或改用顶层 interface 合并 |
| TS2309 `An export assignment cannot be used in a module with other exported elements` | declare module 里 `export =` 混 `export default` 或具名导出 | 一个模块只有一种整包导出形态 | 二选一；CJS 库的属性用 namespace 挂 |
| TS2835 `Relative import paths need explicit file extensions...` | nodenext 下 ESM 文件省了 `.js` | Node ESM 不补全路径，TS 不改写字符串 | 写「编译后的名字」`./util.js` |
| TS5097 `An import path can only end with a '.ts' extension...` | 源码里写 `./util.ts` | 默认禁写 TS 后缀，防产物路径错位 | 改 `.js`；bundler 场景可开 allowImportingTsExtensions |
| TS2717 `Subsequent property declarations must have the same type` | 两处增强同名全局属性且类型不一致 | 声明合并要求成员类型完全一致 | 集中管理增强；统一类型或换属性名 |
| （无错误码）类型对了运行时炸 | 声明与运行时漂移（版本错配、手抄错签名） | 声明只动类型宇宙，运行时是另一套（正文 §1） | 空消费测试 + 双语境运行时冒烟 |

七个症状对应六类根因——装配链、文件身份、导出形态、语境判定、声明合并、声明漂移。与正文「附」的排查表合看：那张管「类型找不到」，这张管「类型对不上」。

## code review 检查单：声明与发包评审 8 条

- [ ] `.d.ts` 里没有任何实现、初始值、函数体（环境上下文只许声明，写实现直接语法错误——正文易错点第 1 条）。
- [ ] 每个含 `declare module` 或 `declare global` 的文件，脚本/模块身份与意图一致吗？脚本身份做整体补声明、模块身份做增强，两者不能同居一个文件（正文 §2）。
- [ ] 新增声明文件确实被装配进编译程序了吗（include 覆盖或随命令显式传入）？用「删掉它会不会报错」反向验证过吗？
- [ ] `export =` 与 `export default` 没有混用（TS2309）？CJS 库的挂载属性用 namespace 写了吗？
- [ ] exports 字段：types 条件排第一组、每个子路径逐条列出、双格式入口各配各的声明？
- [ ] nodenext 产物的源码里，ESM 相对导入全部写 `.js` 吗？仓库存在无 type 字段的 package.json 时，意识到语境按「最近的 package.json」判定了吗（见机制深一层对照表）？
- [ ] 只取类型的导入写了 `import type` 吗（isolatedModules 与 verbatimModuleSyntax 下是硬要求，正文 §3）？
- [ ] 发布前做过「空消费三件套」吗：空项目安装消费、nodenext 与 bundler 双跑 `tsc --noEmit`、双格式运行时冒烟？

## 输出预测题（进阶）

三题全部实测（tsc 5.9.3）。

**题 1**（文件身份决定 declare module 的语义）：

```ts
// ghost1.d.ts —— 无 import / export，全局脚本
declare module 'ghost-lib' {
  export const version: string;
}
```

消费方 `import { version } from 'ghost-lib'` 编译通过。现在在 ghost1.d.ts 顶部加一行 `export {}`（文件变成模块），再编译会发生什么？

**题 2**（nodenext 的语境判定）：同一仓库两个目录。A 目录附近没有 package.json；B 目录的 package.json 写 `"type": "module"`。两个目录各有一个 `main.ts`，内容都是 `import { helper } from './util';`（旁边都有 util.ts）。A、B 哪个能过、哪个报错、报什么？

**题 3**（增强冲突）：程序里有两处 `declare global { interface Window { foo: ... } }`，一处声明 string、一处声明 number。编译报什么？两处改成完全相同的类型呢？

## 进阶预测题答案

**题 1**：消费方报 TS2307（`Cannot find module 'ghost-lib' or its corresponding type declarations`），报在 import 处。机制：`export {}` 把声明文件从全局脚本变成模块，`declare module 'ghost-lib'` 随之从「环境模块声明」（凭空造一个模块类型，不需要真实包存在）变成「模块增强」（给已解析到的真实模块追加成员）——而 ghost-lib 是幽灵库，无包可增强，声明整个落空。正文 §2 的结论「一个文件只能扮演一种身份」在这里闭环：身份翻转不是语法细节，直接改写 declare module 的语义。

**题 2**：A 通过、B 报 TS2835。语境按最近的 package.json 判定：A 没有 type 字段，默认按 CommonJS，CJS 相对导入允许省扩展名（老 Node 补全规则仍在）；B 显式 ESM，Node ESM 运行时不补全路径，TS 要求写「编译后的名字」，TS2835 原文还附了建议（`Did you mean './util.js'?`）。两个目录的代码一模一样，差别只在配置文件一个字段——再次印证「文件是 ESM 还是 CJS」是语境属性。

**题 3**：报 TS2717，原文 `Subsequent property declarations must have the same type. Property 'foo' must be of type 'string', but here has type 'number'.`。声明合并允许同名成员重复声明的前提是类型完全一致，不一致就在后一处爆；把两处改成完全相同的类型则合并成功、不报错。所以 TS2717 既是陷阱二的风险，也是同一机制的善意面：它逼所有增强提供方对齐签名。

## 收尾自测（增补）

1. 三斜线指令「失效但不报错」的具体条件是什么？`path` 与 `types` 的解析基准各是什么？三者与「运行时加载」的关系是什么？
2. 复述程序装配的四路来源；`types: []` 关掉的是哪一路、留下的是哪几路？删一个「没人 import 的 .d.ts」会让哪里报错、为什么？
3. 进阶预测题 2 里，「附近没有 package.json」为什么按 CJS 处理？这个默认与 Node 的文件系统查找规则是什么关系？`.mts` 扩展名在什么场景比 package.json 更合适？
4. 陷阱三的「空消费三件套」分别验证两个宇宙的哪个入口？（提示：类型宇宙看 exports.types 与解析模式组合；运行时宇宙看 main 与 exports 条件。）

---

## 机制深一层（续）：包的双宇宙入口与「包引用自己」

**两个宇宙各自的入口链。** 类型宇宙：package.json 的 `types` / `typings` 字段 → 包根的 `index.d.ts` → 相邻的 `@types/x` → 现代包 `exports` 里的 `types` 条件（按声明顺序匹配，所以必须排第一组，正文 §4）。运行时宇宙：`main`（CJS 入口）→ `exports` 的 `import` / `require` / `default` 条件（ESM 与 CJS 各走各的）——`module` 字段只是打包器社区的约定，Node 本身不认它。两份入口清单完全独立，改一边不会带动另一边；排查表里的症状全部是这两条链断链的表现。

**包引用自己（self-referencing）。** TS 4.7 Release Notes 的 "package.json Exports, Imports, and Self-Referencing" 小节确认：只要 package.json 声明了 `exports`，包内部就可以**用自己的名字 import 自己**——在 my-lib 的源码里写 `import { x } from 'my-lib'`，解析落在自己 exports 声明的入口上。工程价值有二：单测可以直接对「公共入口」断言导出完整性，不必维护一长串相对路径；同时它逼着 exports 保持真实——自引用解析失败就是白名单配错的直接信号。配套的 `imports` 字段（`#` 开头的包内私有子路径，同一小节有述）则用来替代深层相对引用，重构目录时不用全文改正则路径。

**声明文件里的依赖声明。** 正文 §1 提过三斜线指令，这里补它在 `.d.ts` 发布场景的分工：包的声明文件用 `/// <reference types="node" />` 表达「本声明的类型需要 @types/node 进程序」，等价于把依赖登记进**类型宇宙**；而运行时依赖仍要老老实实写进 dependencies。一句话记忆：**类型宇宙的依赖用 types 指令与 @types 登记，运行时宇宙的依赖用 dependencies 登记**——两本账，混记的后果就是「类型进得来、运行时崩」或反之。

## 规范原文对照：import type 的擦除语义与运行时对照

**原文。** TS 3.8 Release Notes《Type-Only Imports and Exports》：

> "import type only imports declarations to be used for type annotations and declarations. It always gets fully erased, so there's no remnant of it at runtime."

解读：两个限定词决定一切——"only for type annotations"（只许进类型位）与 "fully erased"（整行擦除）。前者让编译器在语法层就拒绝误用（把 import type 导入的名字当值用直接报错），后者让它与运行时彻底无关。正文 §3 的三个硬收益（产物干净、避免循环值引用、isolatedModules 下必须显式标注）全部由这两句推出；正文 §7 的 re-export type 坑则是它的补集——「该擦的没擦」会在产物里留下指向不存在绑定的运行时导入。

**运行时对照收据。** 用 node 直接验证「普通 import 会加载模块」：写一个带副作用打印的 ESM 模块与一个普通 import 它的消费者，`node consumer.mjs` 实测输出两行——先打印模块体里的 `side-effect ran`，再打印消费者的 `consumer done`，模块体确实执行。对照面则按原文口径：换成 `import type` 后转译产物里**不存在这条导入**（"no remnant of it at runtime" 的直译），模块体永远不执行。两半合起来才是完整证据链：前半是运行时实测，后半是转译语义的一手规范依据——「类型宇宙的入口在转译期分流」，分流点就在这个关键字上。

## 输出预测题（补充）：擦除与条件顺序

**题 4**（import type 与副作用）：

```ts
// side.ts
console.log('side-effect ran');
export const tag = 'side';

// consumer.ts
import type { tag } from './side';
console.log('consumer done');
```

先判断 `npx tsx consumer.ts` 会不会打印 `side-effect ran`；再判断把 `import type` 改成普通 import 后会打印什么。

**答案**：import type 版本只打印 `consumer done`——按 "fully erased" 原文，转译产物里没有这条导入，side.ts 的模块体根本不执行。改成普通 import 后两行都打印，模块体执行（node 实测收据见上一节）。推论成对出现：**想要副作用必须用值导入**，`import type` 不可能触发模块初始化；反过来，isolatedModules 语境下给「只含类型」的导出写值导入，产物会多一条指向不存在绑定的运行时导入，加载即崩——与正文 §7 是同一枚硬币的两面。

**题 5**（types 条件的顺序）：一个包的 exports 写成：

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

消费方用 bundler 模式 import 这个包，类型解析会发生什么？怎么修？

**答案**：解析器按声明顺序匹配条件（正文 §4 与 §5 的既述规则，此处为手推口径）：先命中 `import` 就按 `./dist/index.mjs` 处理，排在最后的 `types` 轮不到，类型解析落到错误入口或落空——宽松配置下表现为隐式 any，零报错、最危险。修正：把 `types` 挪到第一组。动手验证的办法是复制正文可运行示例的假包结构、只调换 exports 里条件的顺序，再对 bundler 与 nodenext 各跑一次 `tsc --noEmit`——不同解析模式对条件的匹配策略有差异，单跑一种测不出顺序问题，这正是「空消费三件套」要求双解析模式各跑一遍的原因。

## 机制深一层（三）：语境判定的完整判名录

nodenext 判定「一个文件按 ESM 还是 CJS 处理」的完整规则，可以压成一张判名录（依据 TS 4.7 Release Notes 与 Node 模块文档要点整理；前两行有本机实测收据）：

| 判据 | 语境结论 | 出处与口径 |
| --- | --- | --- |
| 最近的 package.json 无 type 字段 | CJS | 实测收据（机制深一层对照表第一行） |
| 最近的 package.json 为 `"type": "module"` | ESM | 实测收据（TS2835 那一行） |
| 文件扩展名为 `.mts` / `.cts` | ESM / CJS，无视 package.json | TS 4.7 "New File Extensions" 小节 |
| 文件扩展名为 `.mjs` / `.cjs`（JS 侧） | ESM / CJS | Node 模块文档口径 |
| package.json 的 main / exports 条件 | 决定包**入口**落在哪个文件，不改变单文件语境 | Node 模块文档口径 |

三条工程推论：

1. 「最近的 package.json」是沿目录向上查找到的第一个 package.json——monorepo 里子包自己没写 package.json 时，其文件会继承**仓库根**的 type 字段，这是「子包行为与根不一致」类灵异问题的根源；
2. `.mts` / `.cts` 是文件级的最终裁决，优先于任何 package.json——双格式仓库里给「注定单一形态」的文件用它们最省心，改目录、挪包都不受影响；
3. main 与 exports 决定「别人 import 包时落在哪个文件」，但不改变包内文件的语境——所以 exports 指到 `.mjs` 不代表包内 `.js` 文件是 ESM，两套判据各管各的。

复述口令：**先看扩展名（`.mts` / `.cts` 一锤定音），再看最近的 package.json 的 type，最后才轮到入口字段**。判名录的排列顺序，就是排查「模块语境」类问题的排查顺序。

## 收尾自测（续）

1. 判名录五行的判定顺序是什么？为什么扩展名能一锤定音、而入口字段管不了单文件语境？
2. monorepo 子包没有自己的 package.json 时会发生什么？这个「继承最近的 package.json」的规则对 type 字段意味着什么？
3. exports 指向 `.mjs` 能改变包内 `.js` 文件的语境吗？结合「main / exports 管入口、type 与扩展名管语境」复述两套判据的分工。
4. 除「空消费三件套」外，self-referencing 能给发布前检查增加什么断言？（提示：包内用自己名字 import 公共入口，等于免费验证 exports 白名单。）

## 册末补记：把两套入口钉在一张卡上

面试或事故复盘时，把本册内容压成一张卡片就够了。**运行时宇宙**以 package.json 的 main 与 exports 条件为入口；Node 按 type 字段与文件扩展名决定每个文件按 ESM 还是 CJS 解释；exports 是白名单，条件按声明顺序匹配。**类型宇宙**以 types/typings 字段、包根 index.d.ts、相邻 @types 包与 exports.types 条件为入口；解析模式（node10 不读 exports、node16/nodenext 严格 ESM、bundler 模拟打包器）决定这条链怎么查。两个宇宙唯一的交点是转译器：它把类型宇宙整体擦除、把源码改写成运行时宇宙的形态。于是本册三条核心纪律全部可以推导出来——「相对导入写 `.js`」来自「TS 不改写字符串」；「import type」来自 "only for annotations" 加 "fully erased"；「types 条件排第一组」来自「条件按声明顺序匹配」。记卡片时带上本册六张实测收据（TS2307、TS2669、TS2309、TS2835、TS5097、TS2717）：每条错误码背后，都是这张卡片上的一个字段或一条规则。

5. 册末补记说「三条纪律全部可以推导出来」，请逐条复述推导链：每条纪律从卡片上的哪句规则推出来？
6. 六个实测错误码各对应卡片上的哪个字段或哪条规则？合上笔记默写一遍，再对照排查速查表核错。
