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


---

## 机制深一层：每个开关挂在编译管线的哪一段

> 收据口径：本节及以下各节的「实跑」均为 js-ts/node_modules 的 tsc 5.9.3、临时文件于 /tmp 实跑（严格项加 `--strict`）；运行时输出为 node v24.10.0 实跑。

### 1. 管线五段与开关归属

把 tsc 的一次编译想成五段流水线：**读配置 → 解析模块 → 扫描与绑定 → 检查 → 产物（emit）**。「读配置」段的产出是一份合并后的选项表（命令行优先于 tsconfig），后续每段只消费与自己相关的选项——理解了这一点，就明白为什么有的开关能只靠命令行验证（检查段选项），有的必须进 tsconfig（paths）——paths 在命令行上没有对应旗标，因为它属于解析段的映射表，不是布尔语义。本册所有开关都能在流水线上找到自己的工位：

- `strict` 全家族（§1 各项）全部驻守**检查段**：它们只改变「报不报错」，不改变产物一个字节；
- `noUncheckedIndexedAccess` 是检查段里「索引访问表达式」节点上的专项审查（TS 4.1 起在元素访问的返回类型上并 undefined）；
- `isolatedModules` 与 `verbatimModuleSyntax` 横跨**检查段与 emit 段**：前者拦「单文件转译器会编译错」的写法，后者还强制 emit 按字面保留导入；
- `target` 在 **emit 段**：决定语法降级（箭头函数要不要转成 function）；
- `lib` 在**声明包含层**：决定哪些 API 类型可见，与 target 解耦；
- `module`/`moduleResolution` 在**解析段**：决定 import 说明符怎么找到文件；
- `skipLibCheck` 是检查段的过滤器（跳过声明文件内部检查）；`incremental` 是覆盖全段的缓存层（`.tsbuildinfo`）。

检查段与 emit 段的解耦还有一层现代工程含义：tsc 负责 check（`noEmit: true`）、bundler 负责 emit（transform），两条管线各干各的——`isolatedModules` 存在的意义正是让 tsc 的检查口径与单文件转译器的转译口径对齐，它是一份「两管线协议」而非单纯开关。「开关挂在哪一段」直接解释了几个高频困惑：`noEmit: true` 仍会完整检查（检查段照跑，只砍掉 emit 段）；`lib` 与 `target` 可以自由错配（一个管类型一个管语法），错配的后果不是编译错，而是「类型可见的 API 运行时未必有」。

### 2. lib 错配的实测形态：TS2550 的完整报错

实测把 lib 压到 es2015 再用新 API：

```ts
Promise.allSettled([]);
```

报错原文（实跑收据）：`TS2550: Property 'allSettled' does not exist on type 'PromiseConstructor'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2020' or later.`——注意报错的可执行性：它直接给出「lib 要改到 es2020 或更高」的处方。这也是排查「明明文档说有这个方法」类问题的标准动作：先看项目的 lib 配置与该 API 的引入版本（`Promise.allSettled` 是 ES2020）对不对得上，而不是怀疑类型文件坏了。顺带记住「target 不背锅」：升 target 不等于升 lib——两者独立，报错指的是 lib，只改 target 无效。同族例子还有 Object.fromEntries（ES2019）、Array.prototype.at（ES2022）——错误码同为 TS2550，处方里的版本数字随 API 各自变化，所以「记版本对照表」不如「读处方」划算。

### 3. isolatedModules 背后是 ESM 链接语义

TS1205 拦截类型 re-export 的本质，要到 ECMA-262 的模块语义里找：模块链接阶段的 `resolveExport` 抽象操作在「被导入的绑定不存在」时判定链接失败，宿主抛 SyntaxError（错误消息形如「does not provide an export named 'ID'」）。单文件转译器看到 `export { ID } from './a'` 时无法知道 ID 是纯类型，只能按运行时导出 emit；一旦 a.ts 的转译产物里没有这个绑定，链接就在运行时炸。`isolatedModules` 把这个运行时风险提前到编译期（TS1205 原文见排查速查表），`export type` 语法则是显式声明「这条是类型、转译时删掉」的唯一通道。一手依据：ECMA-262 模块语义（Module Semantics）中 `resolveExport` 的失败路径，与本册题 2 第一段的实测行为互为印证。顺带回答「为什么 bundler 轨常常不炸」：打包器对导入做了自己的解析与容错（甚至能把「找不到的导出」静默摇掉），所以同一段代码换个下游就能跑——「能不能跑取决于下游工具」正是 isolatedModules 要根除的不确定性，与笔记 §3「最危险的是侥幸跑过」一句互为表里。运行时的报错形态也有既有实测口径可背：严格 ESM 链接语义的管线抛 SyntaxError，消息形如 `... does not provide an export named 'ID'`——与 `resolveExport` 的失败路径一一对应，这就是「编译期 TS1205」在运行时的镜像。

### 4. 单文件模式与 tsconfig 的关系（版本差异备忘）

本册全部 /tmp 探针都从仓库目录（cwd 有 tsconfig.json）出发、用 tsc 5.9.3 显式指定单文件编译，均未触发任何「配置冲突」报错——**5.x 的单文件模式会忽略 cwd 的 tsconfig**。而笔记「可运行示例」一节提到的 TS5112 是 tsc ≥ 7 的行为：7.x 同样的命令要求显式 `--ignoreConfig`。两版行为都要会解释：单文件编译时「配置从哪来」本来就是歧义场景，新版本把它从「静默忽略」改成「报错要求表态」，方向是让意图显式——与 verbatimModuleSyntax 的设计哲学一脉相承。顺带一条组合陷阱要记：命令行旗标只覆盖**同名**选项，且布尔项合并容易、列表项（lib、types）合并语义微妙——「命令行加 --strict 再补一个文件」看到的配置与真实构建并不相同。所以严肃的收据与实验都要写明旗标口径（本册每条收据都注明了完整旗标），免得「我这里不报错」变成口径歧义。

### 5. strict 家族的联动图：八个子开关各堵一个「隐式漏洞」

把 §1 的八个子开关按「堵的是哪个隐式洞」重排一遍，联动关系就浮出来了：

- `noImplicitAny` 堵「参数与变量的隐式 any」；`noImplicitThis` 堵「this 指向不明」——两者是「隐式未知」家族；
- `strictNullChecks` 堵「null 与 undefined 的隐式在场」，是其余开关的地基：`strictPropertyInitialization` 检查的「属性可能 undefined」这件事，本身依赖 strictNullChecks 先把 undefined 从类型里请出去（官方文档明言该开关在 strictNullChecks 关闭时无效）；
- `strictFunctionTypes` 堵「函数参数双变」；`strictBindCallApply` 堵「bind/call/apply 三个反射 API 的免费通道」——两者是「函数边界」家族；
- `useUnknownInCatchVariables` 堵「catch 变量的隐式 any」；
- `alwaysStrict` 是全家唯一驻守 **emit 段**的：实测 CJS 产物首行出现 `"use strict";`，而 ESM 产物没有（ESM 本身恒为严格模式）——这一条同时解释了为什么「ESM 时代它近乎免费」。

面试追问「strict 是什么」时，用「一组各自独立、合起来覆盖隐式洞全集的开关包」作答，比背清单高一档：每个成员都能独立关（`--strict` 之外单独 `--xxx false`），堵的都是同一类东西——「编译器替你猜」。

### 6. noUncheckedIndexedAccess 的精确作用域：只治「长度未知」

实测对照（同文件同配置）：

```ts
const t: [string, number] = ['a', 1];
const x: string = t[0];       // 通过：元组按字面量下标访问不受影响
const arr: string[] = ['a', 'b'];
const y: string = arr[0];
// 报 TS2322: Type 'string | undefined' is not assignable to type 'string'
```

规律：该开关只在「长度未知的容器」的索引访问上并 undefined——元组长度已知、字面量下标必在界内，类型没有撒谎，所以豁免。这精确化了笔记 §2.1 的「一切索引访问」口径：一切**数组与索引签名**的访问，不包括元组的字面量下标。工程含义顺带就有：把「固定形状」从数组改标成元组，是降低该开关噪音的正路，而不是满屏 `??`。同族注意：索引签名（如 `Record<string, T>` 的读取）同样受该开关管辖——它的「长度未知」比数组更彻底，键域无限宽，读出的每个值都该当 undefined 对待。另一个降噪工具是 `Array.prototype.at`：配套练习 `exercises/tsconfig/02-unchecked-indexed-access.ts` 里就有 .at() 对照组——at 的返回类型自带 `| undefined`，语义上「可能越界」与开关的意图一致，适合替代语义上确实可能越界的访问。

### 7. moduleResolution 的三套算法一句话模型

`node10`：只看 package.json 的 `main`/`types` 字段，逐级找 node_modules——老 Node 算法，读不了 `exports`。`nodenext`/`node16`：完整模拟现代 Node——认 `exports` 子路径、ESM 强制产物名扩展名。`bundler`：Node 算法加宽——保留 `exports` 解析、放宽扩展名（给打包器省事）。选型口诀：运行时是谁就模拟谁；介于两者之间的打包器场景才用 bundler。另外记一个现代组合：`module: preserve`（TS 5.4+）让 emit 原样保留你写的模块语法、格式问题交给下游——与 bundler 搭配是前端应用的省心组合（笔记 §5 表格「esnext（或 preserve）」的「或」字即此）。错误码的分工也沿这条线：TS2835/TS2307 的扩展名类报错多半是 nodenext 轨的纪律，而「子路径读不到」的 TS2307 先查 `exports` 字段与 node10 的错配（笔记 §易错 5）。

## 工程三陷阱

**陷阱一：lib 落后于运行时或落后于代码。** 触发场景：老项目把 lib 锁在 es2015，新人用了 `Promise.allSettled`/`Object.fromEntries`/`Array.prototype.at`，报 TS2550，于是有人改代码迁就老 lib——把该用的 API 写成兼容垫片甚至干脆绕路。根因：lib 决定 API 类型可见性，它反映的应该是「运行时最低支持版本」，不是「项目年龄」。规避：按支持矩阵一次性把 lib 配对（§5 的配对表），新 API 引入时同步升 lib；TS2550 的报错文本自带处方，照办即可。判别动作：遇到 TS2550 先查 API 的引入版本（MDN 或规范都有），再查项目 lib 与目标运行时，三边对齐后问题必然消失。lib 的另一半是环境面：前端加 `dom`、`dom.iterable`，Node 侧不加——防止 `window`、`document` 混进 Node 代码（笔记 §6 的 A/B 两份配置分别示范了「库不配 DOM」与「应用配 DOM」）。

**陷阱二：`paths` 只改类型解析、不改产物。** 触发场景：配了 `@/*` 别名，`tsc -p` 通过、编辑器跳转正常，tsc 直接 emit 的产物里 import 说明符原样是 `@/util`，Node 直跑炸「Cannot find module」。实测收据：`tsc -p`（含 paths 配置）解析通过后，产出的 `dist/main.js` 第一行仍是 `import { v } from '@/util'`——说明符一个字符都没被改写。根因：paths 是解析段（resolver）的别名表，emit 段不做等价改写；tsc 的立场是「模块格式转换已经够复杂，别名改写交给下游」。规避：bundler 轨让 bundler 配同名 alias；Node 轨用 tsc-alias 一类后处理；或干脆相对路径。Node 轨还有一个原生正解值得优先考虑：package.json 的 `imports` 字段（subpath imports，`#` 开头的说明符），Node 原生解析、TS 同样认——别名需求若只在 Node 轨，它比 paths 加后处理更省心。判别口诀：**paths 负责「找得到」，不负责「跑得通」**。

**陷阱三：nodenext 的扩展名纪律按「产物名」写。** 触发场景：ESM 语境（`.mts` 源或 `"type": "module"`）下相对导入不写扩展名，报 TS2835；照报错提示之外的习惯补了 `.js`，又报 TS2307。实测三连（同一目录同一文件 `util.mts`）：

- `import './util'` → `TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './util.mjs'?`
- `import './util.js'` → `TS2307: Cannot find module './util.js' or its corresponding type declarations.`（目录里只有 util.mts，.js 指向不存在的产物）
- `import './util.mjs'` → 通过。

规律一句话：**说明符写「编译产物的名字」**——`.ts` 源写 `.js`，`.mts` 源写 `.mjs`；TS 按产物名反向映射回源文件。触发前提也别忘了：这套纪律只在 ESM 语境生效——`.mts`/`.mjs` 源，或最近 package.json 带 `"type": "module"` 的 `.ts`；CJS 语境下扩展名可省（笔记 §5 表格里 nodenext 行的注释即此意）。报错提示的「Did you mean」会按当前源文件的后缀给出正确答案，跟着提示走即可。换个说法：TS2835 的 Did you mean 就是解析器在当场教你正确的产物名——读全报错再动手，能省掉一半试错。

## 与手写实现对照：同一机制的「开关版」与「手写版」

tsconfig 的每个严格项，都等价于一类「手写纪律」的机制化。逐条对照后会发现：开关赢在不会漂移，手写版赢在粒度可控——知道两者对应关系，才能在「加开关」与「加约定」之间做正确的取舍：

| 开关 | 手写版替代 | diff 要点 |
| --- | --- | --- |
| `noUncheckedIndexedAccess` | 封装 `at<T>(xs, i): T \| undefined` 一类的帮助函数，逼调用方判空 | 开关在「声明处」一刀切地并 undefined；手写版靠纪律覆盖每一次访问，漏一处就漏一类 |
| `exactOptionalPropertyTypes` | 下游手写 `key in obj` 判断「真的传了没有」 | 开关把「缺失与 undefined 分家」写进类型；手写版写进运行时判断，类型层仍然分不出 |
| `verbatimModuleSyntax` | 团队约定「类型导入必须 import type」+ code review 盯 | 机器拦截（TS1484）与约定俗成的差距就是漂移率 |
| `isolatedModules` | 约定「不用 const enum、类型 re-export 写 export type」 | 同上；约定随人员流动衰减，开关随 tsconfig 固化 |
| `strictNullChecks` | 满地 `x ?? 默认值` 与 `!` 断言 | 开关逼出收窄逻辑；手写版用默认值掩盖「到底会不会是 null」的思考 |
| `alwaysStrict`（emit 段） | 产物检查脚本 grep `"use strict"` | 开关在 emit 时直接写；手写版是事后补救，ESM 下还会白查一遍（规范已保证） |

一句话总结：**开关是机制化的团队约定**。评审 tsconfig 时的正确问法不是「为什么开了这么多」，而是「这些开关对应的手写纪律，如今哪些可以退役了」——开关到位后继续手写同类纪律是冗余，反之靠纪律硬扛开关的语义则迟早漂移。再往深一层：开关的语义是「类型层契约」，手写纪律里只有运行时判断（如 `key in obj`）是类型层表达不了的——所以真正的分工是：类型层能表达的交给开关，必须发生在运行时的判断写成代码，两者各留一行注释指向对方。

## 排查速查表

读表姿势：先按「挂在管线哪一段」定位是配置问题还是代码问题，再看处置列。前四行是本册实测收据的高频项。

| 报错（码 · 原文要点） | 挂在管线哪一段 | 根因与处置 |
| --- | --- | --- |
| TS2550 · Property 'x' does not exist ... Try changing the 'lib' compiler option | lib（声明包含层） | lib 低于 API 引入版本；按提示升 lib |
| TS2322 · Type 'string \| null' is not assignable to type 'string' | 检查段（strictNullChecks） | 可空值未收窄；`??`/判空/可选链处理后再赋值 |
| TS18048 · 'x' is possibly 'undefined' | 检查段（NuIA 叠加） | 索引读出未收窄；先判空或 `?.`/`??` |
| TS2375 · `Type '{ opt: undefined; }' is not assignable ... with 'exactOptionalPropertyTypes'` | 检查段 | 把「键缺失」写成「显式 undefined」；省略键或类型上写明 `\| undefined` |
| TS7006 · Parameter 'x' implicitly has an 'any' type | 检查段（noImplicitAny） | 参数缺标注；补类型或默认值 |
| TS2835 · Relative import paths need explicit file extensions ... | 解析段（nodenext） | ESM 相对导入缺扩展名；按产物名补（`.js`/`.mjs`） |
| TS2307 · Cannot find module './util.js' | 解析段 | 说明符与磁盘/产物对不上；核对扩展名与路径 |
| TS1205 · Re-exporting a type when 'isolatedModules' is enabled requires using 'export type' | 检查 + emit | 类型 re-export 未标 type；改 `export type { ... }` |
| TS2748 · Cannot access ambient const enums when 'isolatedModules' is enabled | 检查 + emit | ambient const enum 依赖跨文件内联；改普通 enum 或 as const |
| TS1484 · 'ID' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled | 检查 + emit | 纯类型导入未写 `import type`/`type` 修饰符；补上 |
| TS5112（tsc ≥ 7 单文件且 cwd 有 tsconfig.json） | 读配置段 | 5.x 单文件静默忽略 cwd 配置、7.x 要求表态；加 `--ignoreConfig`（笔记既有口径，本册 5.9.3 探针未触发） |

## code review 检查单

- [ ] `strict: true` 在场，且能逐项说出八个子开关；追问时答得出「最关键的是 strictNullChecks」。
- [ ] `lib` 与运行时支持矩阵一致，没有为了压报错而降 lib。
- [ ] 编译链上有 tsx/esbuild/swc/Vite 的项目，`isolatedModules` 与 `verbatimModuleSyntax` 已开；仓库里搜不到 `export { 纯类型 }` 与 `const enum`。
- [ ] `module`/`moduleResolution` 按运行时配对（bundler 轨或 nodenext 轨），没有 esnext 配 node10 的杂交。
- [ ] Node ESM 轨的相对导入全部带产物名扩展名（`.js`/`.mjs`）。
- [ ] 用了 `paths` 的项目，bundler alias 或 tsc-alias 后处理在场——「解析通过」不等于「产物可跑」。
- [ ] 业务仓库评估过 `noUncheckedIndexedAccess`（默认建议开）；教学/示例仓库可以不开但要写明理由。
- [ ] `exactOptionalPropertyTypes` 开启时，跨边界类型（API 参数、配置）显式区分「缺键」与「undefined 值」。
- [ ] `skipLibCheck: true`（提速）且清楚它只跳过声明文件内部检查，不影响自己代码对三方 API 的调用检查。
- [ ] strict 家族的每项手写「兜底纪律」（满地 `??`、人肉盯 import type）是否已在对应开关开启后退役，避免机制与约定双轨并行。
- [ ] tsconfig 的变更走 diff review：每一项改动都说得出挂在管线哪一段、影响的是检查口径还是产物形态。
- [ ] monorepo 评估过 `composite`/`references` 与 `incremental`，构建按 DAG 走而不是全量串行。

## 输出预测题（进阶）

**题 1（四档配置矩阵）**：

```ts
interface Opts { opt?: string }
const arr: string[] = [];
const v = arr[0];
const o: Opts = { opt: undefined };
const w = v?.length;
```

问：在下列四档配置下，各有哪些行报错、报什么码？
A 档：什么严格项都不开；B 档：只开 `--strict`；C 档：`--strict --noUncheckedIndexedAccess`；D 档：`--strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes`。

**题 2（两个模块开关的分工）**：以下三段写法，分别在「只开 isolatedModules」「只开 verbatimModuleSyntax」两种配置下的表现：

```ts
// ① re-export 一个纯类型
export { ID } from './a';
// ② 导入一个纯类型但不写 type
import { ID } from './a';
const id: ID = 'x';
// ③ 访问 ambient const enum
declare const enum E { A }
const e = E.A;
```

**题 3（扩展名三选一）**：`nodenext` 轨、源文件 `main.mts`、目录里有 `util.mts`。三个说明符 `'./util'`、`'./util.js'`、`'./util.mjs'` 各自的下场？

**题 5（emit 段的开关）**：`alwaysStrict: true` 下分别以 `--module commonjs` 与 `--module esnext` 编译同一文件，产物首行各是什么？为什么只有一个带 `"use strict"`？

**题 4（产物预言）**：tsconfig 配了 `paths: { "@/*": ["src/*"] }` 与 `outDir: "dist"`，`src/main.ts` 里写 `import { v } from '@/util'`。`tsc -p` 之后 `dist/main.js` 的第一行 import 是什么？这个产物直接交给 Node 跑会怎样？

## 进阶题解析

**题 1**：A 档全部通过——不严格的代价就是全放行。B 档也全部通过：`--strict` 既不含 `noUncheckedIndexedAccess`（`v` 仍是 `string`），也不含 `exactOptionalPropertyTypes`（`opt: undefined` 是对 `string | undefined` 的合法赋值），第四行的 `number | undefined` 也无处报错。C 档：`v` 变 `string | undefined`，但第四行用的是可选链，合法通过；真正的变化在下游——`w` 的类型多了 `undefined`，若有人把 `w` 当 number 用，报错出现在下游而非这里。D 档：第三行报 **TS2375**（实跑收据：`Type '{ opt: undefined; }' is not assignable to type 'Opts' with 'exactOptionalPropertyTypes: true' ...`）。矩阵要点：每开一个开关只在其「管辖语义」上加新报错、互不越界；且有的开关（NuIA）以「下游类型变宽」而非「本行报错」的形式呈现——读配置矩阵必须同时盯报错与类型变化两个维度。把四档矩阵背成「开关乘以语义」的笛卡尔表，任何组合都能现场推演——这是被面试官往深处追问时的护城河。

**题 2**：① 在 isolatedModules 下报 **TS1205**（收据原文见速查表）；verbatimModuleSyntax 隐含 isolatedModules，同样报。② 在 verbatimModuleSyntax 下报 **TS1484**（收据：`'ID' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.`）；只开 isolatedModules 时不报（单文件转译器会把这条导入原样 emit，是否炸留给运行时）。③ 在 isolatedModules 下报 **TS2748**（收据：`Cannot access ambient const enums when 'isolatedModules' is enabled.`）。三个错误码分别对应「emit 不安全」「意图不显式」「跨文件内联不可用」三种根因——两个开关的分工线就画在这里。延伸判断：② 在「两者都不开」时也不报——tsc 全程序模式知道 ID 是纯类型、emit 时会删掉这条导入，但这正是「换下游就炸」的伏笔；两个开关的价值就是把这种隐式行为变成显式规则。

**题 3**：`'./util'` 报 **TS2835**，提示 `Did you mean './util.mjs'?`；`'./util.js'` 报 **TS2307**（目录里没有 util.js，产物名映射按后缀走，`.mts` 对应 `.mjs`）；`'./util.mjs'` 通过。三条全部实跑收据，规律见陷阱三：说明符写产物名，产物名随源后缀变。背后的机制是 TS 维护的一张产物名↔源名映射表：`.js` 对 `.ts`/`.tsx`、`.mjs` 对 `.mts`、`.cjs` 对 `.cts`，与 Node 的模块格式一一对应——所以 nodenext 轨「按产物名写说明符」不是约定而是解析规则，写错就是 TS2307。

**题 4**：第一行仍是 `import { v } from '@/util';`（实跑收据：tsc -p 成功产出，`dist/main.js` 首行原样保留 `@/util`）。直接交给 Node 跑会按包解析规则找 `@/util` 这个包名——除非项目配了对应的运行时 loader/subpath imports，否则报 ERR_MODULE_NOT_FOUND。这题是陷阱二的浓缩：**paths 在解析段生效、在 emit 段失效**，类型检查的绿色从不为运行时的可达性背书。修复链条也顺手排一下：要么 bundler 轨交给打包器配 alias（Vite 的 resolve.alias），要么 Node 轨 tsc-alias 在 emit 后改写说明符，要么改用 subpath imports（`#` 说明符）让 Node 原生解析——三条路的共同点是把「别名」交给运行时真的认的那一层。

**题 5**：CJS 产物首行是 `"use strict";`，ESM 产物没有这一行（两条均为实跑收据，见机制深一层 §5）。原因：ESM 规范要求模块代码恒为严格模式，运行时已保证，产物里再写一行是冗余；CJS 无此保证，`alwaysStrict` 靠 emit 段显式补写。这题是「开关挂在管线哪一段」的定量注脚——strict 家族几乎全在检查段，唯一的 emit 段成员就是 alwaysStrict，且它的效果随模块格式自动增减。面试压缩版一句话：strict 全家只有 alwaysStrict 会在产物上留痕，其余成员纯粹改变检查口径——一句话同时回答「strict 改不改产物」。
