# TypeScript 编译器架构：Program / Checker / Transformer / Emitter

> [返回：第八阶段导览](01-导览.md)
> 对应大纲第 4 条。tsc 是你日常在用、却最少打开看的编译器——它把前四阶段的结构全部长在了一个进程里：**Program≈resolve（建文件图与符号）、Checker≈check（类型检查与推导）、Transformer+Emitter≈lowering+生成（语法降级与逐文件输出）**。本册三件事：四阶段职责与数据流、`.tsbuildinfo` 增量编译实验（实测改哪个文件重编哪些）、isolatedModules 禁 const enum 的约束根源；再用 ts.createProgram + TypeChecker 写一个"导出类型报告"小工具收尾。全部实验在本机实跑（TypeScript 5.9.3，复用 js-ts 站 node_modules），输出为真实运行结果。

## 四阶段：一张图 + 逐个职责

```
ts.createProgram(rootNames, options, host)
   │  ① Program：解析 tsconfig，读入全部源文件（含依赖的 .d.ts），
   │     生成 SourceFile[]（AST+文本+绑定信息）——这一步就完成了"文件图"
   ▼
checker = program.getTypeChecker()      ← ② Checker：懒执行！
   │  建符号表、解析每个名字的类型、做全部类型检查。
   │  tsc 80% 的时间在这里——不是解析，是"给每个表达式标类型"
   ▼
program.emit(targetFile?, writeFile?, ..., customTransformers?)
   │  ③ Transformer：语法降级（enum→IIFE、async→状态机、可选链→与运算……），
   │     分 before / 基线 / after 三层注入点——插件写在这
   ▼
   │  ④ Emitter：逐文件打印 JS + .d.ts + sourcemap，最终产物落盘
```

与前几阶段的对应，逐项到本站册目：

| tsc 组件 | 你写过的对应物 | 本站对应 |
|---|---|---|
| Program（文件图 + SourceFile） | 模块加载 + [AST 构造](../03-第三阶段/05-AST设计与错误恢复.md) | resolve 的前半 |
| Checker（符号 + 类型 + 检查） | [符号表](../04-第四阶段/02-符号表与作用域.md) + [类型检查/推导](../04-第四阶段/03-类型系统.md) | check 的全部 |
| Transformer（降级变换） | [第七阶段的 pass](../07-第七阶段/04-经典优化pass.md)（方向相反：降级而非优化） | lowering |
| Emitter（打印+sourcemap） | [sourcemap 生成](../07-第七阶段/06-前端工程优化对照.md) | codegen |

三个结构性事实，读完源码地图就能对上号：

1. **Checker 是懒的**。`createProgram` 不做任何类型检查；第一次问 checker 要任何类型（比如 `getPreEmitDiagnostics`），它才开始沿符号图推导。`tsc --noEmit` 之所以便宜不了多少，就是因为该跑的检查一步不少。
2. **语法降级在检查之后**。类型信息不参与 emit 的正确性（类型全擦掉），但**参与 Transformer 的可能性空间**——比如 `const enum` 的内联需要 checker 确认枚举值（下一节的实验正抓这个）。
3. **CompilerHost 是全部 IO 的抽象**。Program 通过 host 读文件/看时间戳/写文件——把 host 换成内存实现，tsc 就能在浏览器/单测里跑（Playground 的原理）。

"Checker 占大头"不是传闻，实测一下四阶段各花多少（40 个链式依赖的 .ts 文件，TypeScript 5.9.3，实跑输出）：

```text
createProgram（解析+文件图） : 111.3 ms
getPreEmitDiagnostics（Checker）: 256.0 ms  诊断 0 条
emit（Transformer+Emitter）  : 10.0 ms
```

解析 111ms 里大头是加载几十个 `lib.*.d.ts`；检查 256ms——**两倍于解析**，而且这只是 40 个文件；emit 仅 10ms，降级+打印几乎免费。三个数字解释了整个 TS 工具链格局：转译便宜（esbuild 愿意做）、检查昂贵（只有 tsc 做）、所以"快工具链"的共同策略是**把检查挪出热路径**（CI 跑、IDE 增量跑、watch 时只在改动后跑）。

### 源码地图：四阶段在 microsoft/TypeScript 仓库的哪里

| 组件 | 源码位置 | 规模量级 |
|---|---|---|
| 命令行入口 | `src/compiler/tsc.ts` → `executeCommandLine` | 薄壳 |
| Program/SourceFile | `src/compiler/program.ts`、`parser.ts` | 中 |
| Checker | `src/compiler/checker.ts` | **全仓库最大单文件（数万行）** |
| Transformer | `src/compiler/transformer*.ts`（destructured / ts / jsx / declarations 各一个） | 中 |
| Emitter | `src/compiler/emitter.ts` | 中 |

checker.ts 一个文件几万行不是失控，是"惰性推导 + 巨型缓存"结构的自然结果：每种类型操作（ assignable/instantiate/infer/…）都是 checker 上的方法，共享同一套 symbol 与 node 缓存表——拆开反而要跨模块传状态。读它的正确姿势不是通读，是从一个具体问题进去（比如 `getTypeOfSymbol` 沿调用链走到 union 规约），配合本册的 API 实操建立手感。

顺带补全 Program 的另一半职责——**模块解析**：`import './colors'` 解析成哪个文件（`moduleResolution` 策略、路径别名、node_modules 查找）发生在 Program 构建期，结果就是 `Program.getSourceFiles()` 的文件清单。这是第四阶段 resolve 的"文件图版"：名字 → 声明的解析从"作用域内"扩展到"磁盘上"，LSP 的"跳转定义"跨文件那半边也靠它（`ts.resolveModuleName` 是独立可调的 API）。

## .tsbuildinfo 增量编译实验（实测）

机制先一句话：`.tsbuildinfo` 存"上一轮的类型图状态"——每个文件的**内容指纹（version）与对外形状指纹（signature）**、文件间的引用图。重编译时对比指纹，**改动文件 + "形状变了的文件"的全部（传递）引用者**才重新检查/输出。这正是[符号表](../04-第四阶段/02-符号表与作用域.md)版本化的工程实践：不是"记住了上次的检查结果"，而是"记住了每个符号的哈希，靠图传播判断谁受影响"。

实验设置：三个文件的小项目——`utils.ts`（被两层依赖）、`extra.ts`（import utils）、`main.ts`（import extra+utils），`tsconfig` 开 `incremental`。用 `--listEmittedFiles` 观察每轮真正落盘的文件（**以下全部为实跑输出**）：

```text
=== 冷启动（全量）===                       utils.js、extra.js、main.js
=== 无改动 ===                             （无输出：零文件重编译）
=== 只改 main.ts（叶子，无人导入它）===      main.js
=== 只改 extra.ts 的签名（加参数）===        extra.js、main.js
=== 改 utils.ts 函数体（签名不变）===        utils.js
=== 改 utils.ts 导出形状（TAX_RATE 0.14→0.09，常量字面量类型变了）===
                                            utils.js、extra.js、main.js
```

三个层级的结论：

- **图驱动的受影响集**：改 `extra.ts` 拉进 `main.ts`（它的引用者）；改叶子 `main.ts` 只重编自己。方向沿 import 反向传播——与[第七阶段 tree-shaking](../07-第七阶段/06-前端工程优化对照.md) 的"以导出为根的可达性"是同一张图、两个走法。
- **形状指纹决定传播距离**：`utils` 函数体变了但导出形状没变 → 引用者**不重输出**；`TAX_RATE` 的字面量类型是导出形状的一部分（`0.14` 的类型不是 `number` 是 `0.14`）→ 全体传递引用者遭殃。**改一个导出常量的值 = 全项目重编译**，这不是玄学，是 signature 语义。
- **无改动时零输出**：指纹全命中，连 emit 都省了——增量编译省的不只是检查，还有写盘。

`.tsbuildinfo` 里到底存了什么（12 KB JSON，节选实跑）：

```text
顶层 keys: fileNames, fileIdsList, fileInfos, root, options, referencedMap, version
version: 5.9.3
fileInfos 条数: 54 | fileNames 条数: 54        （含全部 lib.*.d.ts）
  utils.ts -> {"version":"f9f1dec…","signature":"5e99fc8…"}
  extra.ts -> {"version":"69e7047…","signature":"013bf78…"}
  main.ts  -> {"version":"7290ac8…","signature":"8e609bb…"}
referencedMap raw: [[53,1],[54,2]]
fileIdsList raw: [[52],[52,53]]
```

`version` 与 `signature` 双指纹是全部增量判定（version 变了→重查本文件；signature 变了→把引用者拉进来）；`referencedMap`/`fileIdsList` 是压缩存储的引用图（哪个文件引用哪些文件的去重集合池——内部格式按版本会变，无兼容承诺，别拿它写工具，懂语义即可）。

## isolatedModules 禁 const enum 的约束根源

`isolatedModules: true` 模拟"每个文件可以被独立转译"的世界（esbuild/swc/babel 都活在这世界）。约束根源一句话：**单文件转译器看不到跨文件类型信息，一切依赖全程序信息的语法要么被禁、要么语义降级**。const enum 恰好两边都占了，实测（TS 5.9.3）：

```ts
// colors.ts
export const enum Color { Red, Green = 5, Blue }
// app.ts
import { Color } from './colors';
export const bg = Color.Green;
```

```text
=== tsc 正常模式（全程序可见）===
out-normal/app.js:    exports.bg = 5 /* Color.Green */;     ← 内联！编译期把成员替换成字面量
out-normal/colors.js: （空模块——const enum 完全擦除，无运行时对象）

=== tsc --isolatedModules（单文件世界观）===
out-iso/colors.js:    var Color; (function (Color) { … Color[Color["Green"] = 5] = "Green" … })(…)
out-iso/app.js:       exports.bg = colors_1.Color.Green;    ← 退化为普通 enum + 属性访问
```

**同一份源码，两种产物语义**——正常模式内联（`5 /* Color.Green */`，连注释都替你留着），isolated 模式退化成运行时对象。而 babel 转译 TypeScript 时（`@babel/preset-typescript`，实跑）同样输出运行时 enum 对象——单文件转译器没得选。分界线在 **ambient const enum**（声明在 `.d.ts` 里的），单文件世界连"退化"都做不到（`.d.ts` 根本不产 JS），所以直接禁止：

```text
=== tsc --isolatedModules 编译 use-ambient.ts（import 自 ambient.d.ts 的 declare const enum）===
use-ambient.ts(2,24): error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.
```

这就是"禁 const enum"的准确表述：**不是 isolatedModules 禁止你声明 const enum（本文件的会退化为普通 enum），而是禁止消费 ambient const enum；至于 `export const enum`，正常 tsc 与 isolated 模式产物语义已经分叉**——所以工程规范（以及 TS 官方风格建议）干脆一刀切：开了 isolatedModules 的项目别用 const enum，用 `as const` 对象替代。同一根源的还有一条常见禁令：类型再导出必须显式 `export type { X }`——单文件转译器分不清 `export { X }` 导出的是值还是纯类型，转译后要么产物缺东西、要么留下悬空 import。

## 四阶段 API 速查表

按阶段把常用 API 立一张表（配合 [源码地图](#源码地图四阶段在-microsofttypescript-仓库的哪里)食用，都是公开稳定接口）：

| 阶段 | API | 用途 |
|---|---|---|
| Program | `ts.createProgram(rootNames, options)` | 建文件图（本册实操的入口） |
| Program | `program.getSourceFiles()` / `getFileNames()` | 文件清单（含 lib.d.ts） |
| Program | `ts.createSourceFile(name, text, langVer)` | 纯解析单文件，不做检查（轻工具首选） |
| Program | `ts.transpileModule(src, opts)` | 单文件"解析+降级+打印"一步出（无 Program） |
| Checker | `program.getTypeChecker()` | 拿 checker（惰性） |
| Checker | `checker.getSymbolAtLocation(node)` / `getExportsOfModule(sym)` | 节点→符号、模块导出表 |
| Checker | `checker.getTypeOfSymbolAtLocation` / `typeToString` | 符号→类型→可读串 |
| Checker | `checker.signatureToString(sig)` | 函数签名打印（本册实操用过） |
| Checker | `ts.getPreEmitDiagnostics(program)` | 全程序诊断（触发检查的钥匙） |
| Transformer | `program.emit(f, w, ck, only, { before, after })` | 自定义变换注入点 |
| Emitter | emit 的 writeFile 参数 | 输出拦截（写内存/字符串） |
| Emitter | options: `declaration` / `sourceMap` / `outDir` | 产物形态控制 |

`ts.transpileModule` 值得单独一提：它是"没有 Program 的单文件编译"，等价于 esbuild/SWC 的世界观——**类型擦除 + 降级，零跨文件信息**。isolatedModules 的语义约束（下一节）正是"要求你的代码在 `transpileModule` 逐文件跑时依然正确"。

## 实操：ts.createProgram + TypeChecker 小工具

"列出一个 .ts 文件导出的符号与类型"——30 行 Checker API，这是理解 Checker 最快的路（也是"导出类型→文档"工具的最小内核）。完整实现（实跑通过）：

```js
// exports-report.cjs：node exports-report.cjs sample.ts
'use strict';
const ts = require('typescript');
const path = require('path');

const file = path.resolve(process.argv[2] || 'sample.ts');
const program = ts.createProgram([file], { strict: true, target: ts.ScriptTarget.ES2020 });
const checker = program.getTypeChecker();
const sf = program.getSourceFile(file);
const exported = checker.getExportsOfModule(checker.getSymbolAtLocation(sf));   // 模块符号表

for (const exp of exported) {
  const kind =
    (exp.flags & ts.SymbolFlags.Function) ? 'function' :
    (exp.flags & ts.SymbolFlags.Class) ? 'class' :
    (exp.flags & ts.SymbolFlags.Interface) ? 'interface' :
    (exp.flags & ts.SymbolFlags.TypeAlias) ? 'type alias' :
    (exp.flags & ts.SymbolFlags.BlockScopedVariable) ? 'const' : '?';
  let type;
  if (exp.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.BlockScopedVariable)) {
    const t = checker.getTypeOfSymbolAtLocation(exp, exp.valueDeclaration ?? sf);  // 值符号 → 值类型
    const sigs = t.getCallSignatures();
    type = sigs.length ? sigs.map((s) => checker.signatureToString(s)).join(' | ')   // 函数打签名
                       : checker.typeToString(t);
  } else {
    type = checker.typeToString(checker.getDeclaredTypeOfSymbol(exp));            // 类型符号 → 声明类型
  }
  console.log(`  ${kind.padEnd(10)} ${exp.name}: ${type}`);
}
const diags = ts.getPreEmitDiagnostics(program);       // Checker 干活的入口：全程序诊断
console.log(`类型错误: ${diags.length} 条`);
```

对 sample.ts（interface User、type ID、const MAX_RETRY、泛型函数 parse、泛型类 Repo）实跑输出：

```text
文件: sample.ts  导出 5 个符号

  function   parse: <T extends ID>(raw: string): T | null
  interface  User: User
  type alias ID: ID
  const      MAX_RETRY: 3
  class      Repo: Repo<U>

类型错误: 0 条
```

三个 API 细节全是 Checker 的核心概念：**Symbol 是"名字"（声明处），Type 是"名字的类型"**——值符号走 `getTypeOfSymbolAtLocation`，类型符号走 `getDeclaredTypeOfSymbol`，走错拿到的是 `any`；`MAX_RETRY: 3` 那个字面量类型是 checker 推导的最精确类型（const + 字面量初始化 → 字面量类型），与上一节 signature 实验里的 `TAX_RATE: 0.14` 呼应；`getPreEmitDiagnostics` 是"让懒 Checker 真正跑起来"的钥匙。把本工具改造成"生成 API 文档 / 检查导出破坏性变更"只差遍历层——毕业项目 B 可以从这里起步。

## 顺手：Transformer 注入点实测

`program.emit` 的第五参就是插件口（`before/after` 各一层数组），Angular 编译器、ts-loader 的 `getCustomTransformers`、tstl（TypeScript→Lua）都挂在这。10 行实测——一个把字符串字面量全部大写的 before 变换器：

```js
const upperStrings = (ctx) => (sf) => {
  const { factory } = ctx;
  function walk(node) {
    if (ts.isStringLiteral(node)) return factory.createStringLiteral(node.text.toUpperCase(), node.singleQuote);
    return ts.visitEachChild(node, walk, ctx);       // 与 Babel 的 path.replaceWith 对应：重建子树
  }
  return walk(sf);
};
program.emit(undefined, (fileName, text) => { /* 自定义 writeFile：打进内存 */ },
             undefined, false, { before: [upperStrings] });
```

实跑输出（`const greeting = 'hello'; const tag = 'tag: ' + 'x';`）：

```text
Checker 错误数: 0
--- emit 输出: sample2.js ---
"use strict";
const greeting = "HELLO";
const tag = "TAG: " + "X";
```

与 Babel 的差异值得记两笔：tsc 变换器**不可变工厂**（`factory.createXxx` 新建节点、`visitEachChild` 重建子树），没有 path 里的原地 replaceWith/remove——树是"重建"不是"修改"；且**变换器只能影响 emit 产物，类型检查看不到变换后的世界**（after 层产出还会再检查一遍）。Babel 单遍改树 vs tsc 工厂重建，是两套都可成立的 AST 变换世界观。

## 与 mini / 本站其他册的关系

mini 的 [检查器](../04-第四阶段/05-检查器工程化与实践.md) 是"同步一次遍历查完所有"；tsc 的 Checker 是"惰性按需推导 + 图缓存"——单文件小项目两者无差别，十万行的 monorepo 只有后者能活。增量实验的受影响集思想在[第七阶段 DCE](../07-第七阶段/04-经典优化pass.md)（可达性）与本册反复出现的"图 + 指纹 + 传播"是同一个抽象；下一册的 esbuild 则代表另一个极端——不做类型图、不缓存跨文件状态，把全部预算砸在单文件转译速度上。

## 自测

1. Program 建好了但不调 checker，有没有类型检查发生？`tsc --noEmit` 省掉了四阶段里的哪一段？
2. 改 `utils.ts` 的函数体（签名不变），哪些文件重新 emit？再改它的导出常量值呢？两者的判定差异用 version/signature 双指纹解释。
3. ambient const enum 为什么在 isolatedModules 下直接报错，而本文件 const enum 只是退化？如果允许 ambient 内联会发生什么？
4. `const MAX_RETRY = 3` 的类型为什么是 `3` 不是 `number`？这个事实如何同时解释上一节"改常量值引发全量重编译"？
5. 用 `getExportsOfModule` 拿到的 Symbol，值符号与类型符号分别走哪个 API 拿类型？搞反了症状是什么？
6. tsc 的 Transformer 为什么用不可变工厂而不是 Babel 式原地改树？两种设计对"变换后再检查"各自意味着什么？
