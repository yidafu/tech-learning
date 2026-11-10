---
mdx:
  format: mdx
---
# 15 · tsconfig 关键项

> 对应大纲：阶段 3.7 —— tsconfig 关键项：`strictNullChecks`、`noUncheckedIndexedAccess`、`isolatedModules` 等

## 学习目标

1. 逐项说清 `strict` 家族每个开关「管什么、关了会漏掉什么、为什么建议开」
2. 讲出 `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` 这两个「strict 之外的严格项」的收益与代价，并解释本工作区为什么没全局开前者
3. 理解 `isolatedModules` / `verbatimModuleSyntax` 是「单文件转译器时代」的产物，知道 `const enum` 与类型 re-export 的坑
4. 能按项目形态（Node / Vite / 库）配出正确的 `module` + `moduleResolution` + `target` + `lib` 组合

依据来源：TSConfig Reference 官方文档（typescriptlang.org/tsconfig，以下按选项页名引用）与各版本 Release Notes（版本号随文标注，均实测于本工作区：TypeScript 7.0.2）。

## 关键概念

### 1. `strict` 家族逐项（TS 2.3 引入总开关，等于一次打开下面全部）

总开关 `strict: true` 包含：`noImplicitAny`、`noImplicitThis`、`strictNullChecks`、`strictFunctionTypes`、`strictBindCallApply`、`strictPropertyInitialization`、`alwaysStrict`、`useUnknownInCatchVariables`。

#### 1.1 `noImplicitAny`（TSConfig Reference《noImplicitAny》）

- 作用：参数/变量被推断为 `any` 时报错，而不是默默放行。
- 差异示例：`function parse(input) { ... }` —— 关：`input` 隐式 `any`，任何调用都通过；开：报 TS7006，逼你写 `input: string` 或泛型。
- 建议：永远开。隐式 `any` 是「类型检查的静默失效」，一个漏网点会污染整条调用链（`any` 传染，见 `notes/stage-3-ts-types/13`）。

#### 1.2 `strictNullChecks`（TS 2.0；TSConfig Reference《strictNullChecks》）——类型系统分水岭

- 作用：决定 `null` / `undefined` 是否「到处都是」。
- **关闭时**：`T` 隐含 `T | null | undefined`——`null` 可以赋给 `string`：

```ts live noInline
let name: string = getUserName(); // getUserName() 运行时可能返回 null
name.length;                       // 编译通过，运行时 TypeError: Cannot read properties of null
```

- **打开后**：`null` / `undefined` **离开所有类型**，必须显式出现在联合里：

```ts live noInline
declare function getUserName(): string | null;
let name: string = getUserName();        // 报 TS2322: Type 'string | null' is not assignable to type 'string'
let safe: string = getUserName() ?? '匿名'; // 显式处理 null 才放行
```

- 建议：这是「TS 有没有在认真工作」的分界线，永远开。历史注脚：2016 年（TS 2.0）才引入，且因为破坏面太大一度只能靠 `strict` 总开关推动普及——今天关闭它约等于把 TS 降级为「带类型注释的 JS」。

#### 1.3 `strictFunctionTypes`（TS 2.6；TSConfig Reference《strictFunctionTypes》）

- 作用：函数参数从「双变」收紧为「逆变」（只查函数属性，方法简写仍双变）。
- 差异示例：

```ts live noInline
const toFnProp: { sink: (x: unknown) => void } = { sink: (x: string) => {} };
// 关：通过（参数双变，两个方向都放行）；开：报 TS2322（string 参数接不住 unknown）
const toMethod: { sink(x: unknown): void } = { sink: (x: string) => {} };
// 开着也通过：目标是方法简写 → 双变（历史兼容，见 notes/stage-3-ts-types/13 §5）
```

- 建议：永远开。原理与数组协变的完整推演见 `notes/stage-3-ts-types/13-ts-type-theory.md`。

#### 1.4 `strictBindCallApply`（TS 3.2；TSConfig Reference《strictBindCallApply》）

- 作用：`bind` / `call` / `apply` 的参数按原函数签名检查。
- 差异示例：

```ts live noInline
function greet(name: string, times: number) { /* ... */ }
greet.call(null, 'a', 'b'); // 关：参数按 any 处理，不报；开：报 TS2345（'b' 不是 number）
```

- 建议：永远开。关闭时这三个反射 API 是 `any` 的免费通道。

#### 1.5 `strictPropertyInitialization`（TS 2.7；TSConfig Reference《strictPropertyInitialization》）

- 作用：类的属性必须在声明处或构造器里被赋值。
- 差异示例：

```ts live noInline
class User {
  name: string;            // 开：报 TS2564（没赋值）；关：通过，运行时 undefined
  constructor() { /* 忘了赋值 */ }
}
```

- 逃生舱：`name!: string`（非空断言声明，表示「我保证运行时会有」——框架注入场景常用）、参数属性 `constructor(public name = 'x')`。
- 建议：永远开；`!` 每用一次都该有注释。

#### 1.6 `alwaysStrict`（TS 2.1；TSConfig Reference《alwaysStrict》）

- 作用：编译产物文件顶部 emit `"use strict"`，并禁止八进制字面量等严格模式语法。
- 差异示例：关（且模块非 ESM）时产物可能是 sloppy mode；ESM 产物本身就严格，此项主要保护 CJS 输出。
- 建议：随 `strict` 打开即可，不用单独管。

#### 1.7 `useUnknownInCatchVariables`（TS 4.4；TSConfig Reference《useUnknownInCatchVariables》）

- 作用：`catch (e)` 的 `e` 从 `any` 变 `unknown`。
- 差异示例：

```ts live noInline
try { risky(); } catch (e) {
  e.message;   // 关：通过（e 是 any）；开：报 TS18046 'e' is of type 'unknown'
  console.log(e instanceof Error ? e.message : String(e)); // 开后必须先收窄
}
```

- 建议：永远开。异常是「不知道是什么」的典型入口，正该用 top type 承接（`notes/stage-3-ts-types/13` §7）。

### 2. strict 之外的严格项

#### 2.1 `noUncheckedIndexedAccess`（TS 4.1；TSConfig Reference《noUncheckedIndexedAccess》）

- 作用：索引访问的返回类型自动并上 `undefined`——`arr[i]` 从 `T` 变 `T | undefined`、`obj[key]` 同理（实测：连 `arr[0]` 这种「看着就在界内」的访问也变 `number | undefined`）：

```ts live noInline
const arr: number[] = [1, 2, 3];
const a: number = arr[0];   // 开：报 TS2322: Type 'number | undefined' is not assignable to 'number'
const b = arr[0] ?? 0;      // 处理掉 undefined 才能拿回 number
```

- **理由**：JS 的索引访问越界不抛错、返回 `undefined`——类型系统声称 `T` 是在撒谎（这是 TS 有意保留的 unsound 点，见 `notes/stage-3-ts-types/13` §8）。
- **代价**：所有索引访问都要 `??` / `!` / 收窄；与第三方声明、迁移中代码摩擦大，所以不进 `strict`。
- **本工作区为什么没全局开**：根 tsconfig 聚焦「讲清机制」；开了之后每个示例都会被 `?? undefined` 噪音淹没（教学信噪比优先）。真实业务代码建议开——查一下自己项目里 `arr[i].id` 这种行，它防的就是那个深夜线上 NPE。

#### 2.2 `exactOptionalPropertyTypes`（TS 4.4；TSConfig Reference《exactOptionalPropertyTypes》）

- 作用：区分「属性缺失」与「属性存在但值是 undefined」。开启后 `opt?: number` **不含** `undefined` 值，只表示「可以没有这个键」。
- 差异示例（实测）：

```ts live noInline
interface Opts { opt?: number }
const a: Opts = { opt: undefined };
// 关：通过（opt?: number ≈ number | undefined）；开：报 TS2375: 'undefined' is not assignable to 'number'
const b: Opts = {};              // 两种模式都通过：键缺失是合法的
```

- 什么时候开：`opt` 的语义是「没传就走默认值」且下游会 `key in obj` 判断时，这个开关能防止「显式传 undefined」悄悄绕过默认值。代价是跨边界代码要写 `opt?: number | undefined`。

#### 2.3 `noFallthroughCasesInSwitch`（TSConfig Reference 同名页）

- 作用：case 分支没有 `break`/`return` 就落穿时报错（空 case 连写 `case 1: case 2:` 分组不受影响）。
- 建议：开。落穿几乎总是漏写 `break` 的事故而非特性。

#### 2.4 `noImplicitOverride`（TS 4.3；TSConfig Reference 同名页）

- 作用：子类覆盖基类成员必须写 `override` 关键字。
- 差异示例：基类把 `render()` 改名 `paint()` 后——关：子类 `render()` 悄悄变成一个「新方法」，调用点静默错位；开：子类没写 `override` 的重名成员直接报错，改名波及面立刻可见。
- 建议：开（TS 4.3+）。

#### 2.5 `noUnusedLocals` / `noUnusedParameters`（TSConfig Reference 同名页）

- 作用：未使用的局部变量 / 参数报错。`_` 前缀的参数豁免。
- 建议：应用与库开发开（配合编辑器灰显）；本工作区练习常含「故意赋值证明类型错误」的行（`// @ts-expect-error` 目标行），全局开会一直误伤，故未开。

### 3. `isolatedModules`：单文件转译器时代的必要性（TSConfig Reference《isolatedModules》）

背景：`tsc` 是全程序分析（能看到所有文件），而 **esbuild / swc / tsx 是逐文件转译**（别的文件一概不看）。有些 TS 构造只有在「看得到全程序」时才能正确编译——`isolatedModules` 就是让 tsc 把这些构造提前拦下，保证代码在任何单文件转译器下行为一致。本工作区的 `npx tsx` 正是单文件转译（esbuild 内核），所以下面的坑都可能真的踩到：

- **坑 1：类型 re-export**。`export { Shape } from './types';`——`Shape` 是纯类型还是值？单文件视角不知道。若它是纯类型，转译器仍生成运行时 re-export，而模块里根本没有这个绑定 → 严格遵循 ESM 链接语义的管线运行时报 `SyntaxError`（实测 tsc 全程序模式通过、isolatedModules 模式报 **TS1205**: Re-exporting a type ... requires using 'export type'；tsx 的 CJS interop 兜底可能侥幸跑过——「能不能跑」取决于工具，这才最危险）。修法：`export type { Shape } from './types';`（TS 3.8 的 `export type`）。
- **坑 2：`const enum`**。普通 `enum` 是「运行时真实存在的对象」；`const enum` 依赖**跨文件内联**（用到的每个文件里被替换成字面量）——这是全程序能力。esbuild/swc 看不到声明方，只能把 `const enum` 当普通 `enum` 处理（行为与 tsc 不一致）；ambient `const enum`（`declare const enum`）更是直接被拦（TS2748：isolatedModules 下不能访问 ambient const enum）。**现代共识：别用 `const enum`**，普通 `enum` 或 `as const` 对象替代。
- 建议：凡 tsx/esbuild/swc/Vite 参与编译链的项目一律开（Vite 脚手架默认开）。详见 `notes/stage-3-ts-types/14` §7。

### 4. `verbatimModuleSyntax`（TS 5.0；TSConfig Reference 同名页）

- 定位：**取代** `importsNotUsedAsValues`（TS 3.8）与 `preserveValueImports`（TS 4.15）——这两个旧选项在 TS 5.0 被废弃，由它统一。
- 行为：**导入按字面原样保留**，tsc 不再做「这个 import 只用于类型所以帮你删掉」的智能优化。于是：
  - 纯类型导入**必须**写 `import type { Shape } from './types';`——否则一条「导入运行时不存在的东西」被原样 emit，运行时崩；
  - 值导入不会被误删——副作用导入（`import './polyfill'`）与「看似没用实际是值」的导入都安全。
- 与 `isolatedModules` 的关系：开了 `verbatimModuleSyntax` 自动隐含 `isolatedModules`；它比后者更严格（后者只拦「会编译错」的，前者强制「意图显式」）。
- 迁移提示：老代码里混着类型与值的一条 `import { A, B } from` 需要拆成值导入 + `import type`；它配合 ES 系 `module`（esnext / preserve / nodenext）最符合本意。

### 5. `module` / `moduleResolution` / `target` / `lib` 配对

四个选项各管一段：`target` 管语法降级（箭头函数编译后还在不在）、`lib` 管可用 API 类型（`Promise.allSettled` 认不认）、`module` 管模块格式（emit 出 ESM 还是 CJS 语法）、`moduleResolution` 管「import 说明符怎么找到文件」。**`module` 与 `moduleResolution` 必须配对**（解析规则模拟的就是目标运行时的行为），错配要么报错要么静默解析错误。

| 项目形态 | module | moduleResolution | target | lib | 备注 |
| --- | --- | --- | --- | --- | --- |
| Vite / webpack 前端应用 | `esnext`（或 `preserve`） | `bundler` | `es2020`+ | `["es2022","dom","dom.iterable"]` | bundler 允许省略扩展名、读 exports；本工作区即此组合 |
| Node ESM（`"type":"module"`） | `nodenext` | `nodenext` | `es2022` | `["es2022"]` | 相对导入必须写 `.js`（TS2835，原因见 `notes/stage-3-ts-types/14` §4） |
| Node CJS（维护期） | `commonjs` | `node10` | `es2020` | `["es2020"]` | 仅存量项目 |
| 双格式库（ESM+CJS 产物） | 构建时分 `nodenext` 轨 | `nodenext` | 按 support 矩阵最低版 | 同左 | 源码按 Node 规则写最不容易错 |

其余一句话项（TSConfig Reference 各同名页）：

- `skipLibCheck: true`：跳过所有 `.d.ts`（主要是 node_modules 里三方包）的内部检查——提速 + 避免三方声明互相冲突；你**自己代码对三方 API 的使用仍然照查**。建议开。
- `incremental: true`：增量编译，把类型图缓存到 `.tsbuildinfo`，大项目二次检查明显变快。
- `composite` / `references`：项目引用——monorepo 里把包拆成可独立增量构建的单元，`tsc -b` 按 DAG 编排。
- `baseUrl` / `paths`：非相对导入别名（`@/x` → `src/x`）。注意 `paths` 只影响类型解析，**不改写 emit 产物里的说明符**——bundler 侧需要同名 alias，Node 侧需要 tsc-alias 之类的后处理。

### 6. 两份推荐配置

**A. 学习 / 库开发（严格全家桶）**——把「编译期能拦的都拦掉」：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],                  // 库按支持矩阵取舍；要 DOM 再加 "dom"
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,                     // §1 全家桶
    "noUncheckedIndexedAccess": true,   // 索引访问并上 undefined
    "exactOptionalPropertyTypes": true, // 区分「缺失」与「undefined」
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,            // 单文件转译器兼容
    "verbatimModuleSyntax": true,       // import type 强制显式
    "declaration": true,                // 库：产出 .d.ts
    "skipLibCheck": true
  }
}
```

**B. Vite 应用**——与 Vite 脚手架同源（bundler 轨 + DOM 环境）：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",                 // Vite 的 esbuild 按此降级语法
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",      // 允许省略扩展名；读 package.json exports
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "useDefineForClassFields": true,    // 与 Vite 的 esbuild class 语义对齐
    "noEmit": true,                     // 产物交给 Vite，tsc 只做检查
    "skipLibCheck": true
  }
}
```

对照本工作区根 tsconfig：等于「B 去掉 DOM 之外的几项 + `types: []`（关闭全局 @types 自动包含，见 `notes/stage-3-ts-types/14` §5）+ `noEmit`」。差异都是有意的：学习区不需要打包器、不想要 Node 全局类型混进来。

## 可运行示例

tsconfig 不用「运行」，用**对照实验**验证（每个开关一开一关各跑一次 tsc）：

```bash
# strictNullChecks 关 vs 开：同一行代码，第二次开始报 TS2322
npx tsc --noEmit --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom <file>
npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom <file>

# 索引访问实验：加 --noUncheckedIndexedAccess 后 arr[0] 变 number | undefined
# 可选属性实验：加 --exactOptionalPropertyTypes 后 { opt: undefined } 报 TS2375
# nodenext 扩展名实验：--module nodenext --moduleResolution nodenext 下 './util' 报 TS2835
```

练习文件里的机制演示（与本篇各节一一对应）：

```bash
npx tsx exercises/ts-theory/01-structural-typing.ts   # strictFunctionTypes 证据（§1.3）
npx tsx exercises/ts-theory/03-never-unknown.ts       # useUnknownInCatchVariables 证据（§1.7）
npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-declarations/shapes.d.ts exercises/ts-declarations/01-ambient-usage.ts  # import type 擦除（§3/§4，见 notes/stage-3-ts-types/14）
```

配套练习（本主题专属 `exercises/tsconfig/`，用 Compiler API 把开关当数据做三轮对照，均可 `npx tsx` 直接运行）：

```bash
npx tsx exercises/tsconfig/01-strict-family.ts             # strict 家族逐项：全关 / --strict / 单开 strictNullChecks（§1）
npx tsx exercises/tsconfig/02-unchecked-indexed-access.ts  # NuIA + exactOptionalPropertyTypes，含 .at() 对照组（§2）
npx tsx exercises/tsconfig/03-isolated-modules-verbatim.ts # isolatedModules / verbatim / nodenext + transpileModule 输出对照（§3–§5）
```

## 易错点与面试高频

1. **「strict: true 到底开了什么」**——八个成员逐项能报出（含容易被漏掉的 `noImplicitThis`、`useUnknownInCatchVariables`）是高频面试题；追问「哪个最重要」答 `strictNullChecks`（类型系统分水岭）。
2. **`noUncheckedIndexedAccess` 为什么不在 strict 里**：收益大但迁移摩擦大（所有索引访问都要处理 `undefined`），TS 把选择权留给项目。能说出代价与收益两面才算懂。
3. **`opt?: number` 与 `opt: number | undefined` 的区别**——前者「可以没有键」，后者「必须有键」（开启 `exactOptionalPropertyTypes` 后两者彻底分家）。
4. **`isolatedModules` 与 `verbatimModuleSyntax` 混为一谈**——前者保证「单文件转译不出错」（拦会编译错的写法），后者强制「导入意图显式」（隐含前者）。`const enum` 的坑两篇都会考。
5. **module/moduleResolution 错配**——典型症状：`module: esnext` + `moduleResolution: node10` 时读不到包的 `exports` 字段，某些子路径导入报 TS2307。按 §5 配对表配。
6. **`skipLibCheck` 会藏自己的错吗**——不会：它只跳过声明文件**内部**的检查，你对 API 的调用照样查。

## 输出预测题

### 题 1（strictNullChecks + noUncheckedIndexedAccess）

```ts live noInline
declare function getUser(id: number): { name: string } | null;
const users = [{ name: 'a' }, { name: 'b' }];
const first = users[0];
const name1 = first.name;
const name2 = getUser(1)?.name;
console.log(name1, name2);
```

问：在 `--strict --noUncheckedIndexedAccess` 下，`name1`、`name2` 行分别报不报错？各是什么原因？`name2` 的类型是什么？

### 题 2（isolatedModules 判断）

以下两段代码在「tsc 全程序编译」与「esbuild 逐文件转译（isolatedModules 语义）」下分别表现如何？

```ts
// a.ts
export type ID = string;
// b.ts
export { ID } from './a';
// c.ts
import { ID } from './b';
const id: ID = 'x';
```

```ts
// enum.ts
export const enum Color { Red }
// use.ts
import { Color } from './enum';
const c = Color.Red;
```

## 预测题答案

### 题 1

- `first` 的类型是 `{ name: string } | undefined`（`noUncheckedIndexedAccess`：一切索引访问并上 `undefined`，即使下标是字面量 0）→ `first.name` 报 **TS18048**（'first' is possibly 'undefined'）。修复：`users[0]?.name` 或先判空。
- `getUser(1)?.name` 不报错：返回类型已是 `string | null`，可选链处理了 null/undefined——`name2` 的类型是 `string | undefined`（`?.` 短路时得到 `undefined`）。
- 考点：两个开关叠加后，「数组看似安全的第一项」和「显式可空的返回值」需要同样的防御——这正是该选项把索引访问 `undefined` 显式化的意义。

### 题 2

- 第一段：tsc 全程序下 `export { ID } from './a'` 合法（tsc 知道 `ID` 是纯类型，emit 时会删掉这条 re-export）。esbuild 逐文件下，b.ts 的 re-export 被原样保留为运行时导出，而 `ID` 在运行时不存在：严格 ESM 链接语义的管线直接 `SyntaxError: ... does not provide an export named 'ID'`（实测 tsx 的 interop 兜底能侥幸跑过——「换个工具就炸」正是要根除的问题）。修法：`export type { ID } from './a';`——实测 isolatedModules 下 tsc 编译期即报 **TS1205**: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'。
- 第二段：tsc 全程序下 `const enum` 被内联成字面量 `0 /* Red */`，`enum.ts` 甚至不产生运行时对象。esbuild/swc 看不到 `enum.ts` 的声明，只能把 `const enum` 当普通 `enum` 编译（生成真实对象）——能用但与 tsc 行为不一致、失去内联收益；ambient 形式（`declare const enum`）则直接被拦（TS2748）。结论：在 isolatedModules 时代统一改用普通 `enum` 或 `as const` 对象。

## 延伸阅读

- TSConfig Reference（各选项官方页，本篇多处直接引用）：https://www.typescriptlang.org/tsconfig/
- TS 2.0 Release Notes（strictNullChecks）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
- TS 2.3 Release Notes（strict 总开关）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html
- TS 2.6 Release Notes（strictFunctionTypes）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html
- TS 4.1 Release Notes（noUncheckedIndexedAccess）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html
- TS 4.4 Release Notes（useUnknownInCatchVariables、exactOptionalPropertyTypes）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- TS 5.0 Release Notes（verbatimModuleSyntax 取代两个旧选项）：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- esbuild 文档中关于 const enum / isolatedModules 兼容性的说明：https://esbuild.github.io/content-types/
- 回顾：`notes/stage-3-ts-types/13-ts-type-theory.md`（方差与 never/unknown 的原理）、`notes/stage-3-ts-types/14-ts-declarations-and-modules.md`（moduleResolution 细节）

