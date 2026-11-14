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
