# JS/TS 深度学习工作区

按 `OUTLINE.md`（阶段 0–5）组织的学习材料：每个主题 = 一篇笔记（`notes/`）+ 一组可运行练习（`exercises/<topic>/`）。
笔记统一结构：**关键概念（含一手规范依据）→ 可运行示例 → 易错点与面试高频 → 输出预测题（答案在文末）→ 延伸阅读**。

## 怎么用

```bash
npx tsx exercises/<topic>/<file>.ts     # 运行练习（先自己推演「预期输出」注释，再跑对照）
npx vitest run                          # 全部测试（116 个用例）
npx vitest run exercises/milestone/     # 单目录测试
npx tsc --ignoreConfig --noEmit --strict --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom <file>   # 单文件类型检查（tsc ≥7 需 --ignoreConfig）
node --allow-natives-syntax exercises/v8-and-performance/01-hidden-class.mjs  # V8 natives 演示
node --expose-gc exercises/memory-management/02-weakref-finalization-registry.mjs
```

约定细则见 `AGENTS.md` 与 `notes/stage-0-setup/00-environment-setup.md`（含自测清单）。

## 文档站（Docusaurus）

`docs-site/` 内置文档站，docs-only 模式**直接读取 `../notes`**（笔记按阶段子目录分组，侧边栏同步按阶段分组），不移动、不复制笔记文件：

```bash
cd docs-site && npm run start   # 开发服务器（http://localhost:3000）
cd docs-site && npm run build   # 构建到 docs-site/build/
```

已全面接入 live codeblock（2026-11）：26 篇笔记的 179 个 `js`/`ts` 围栏转为 `live noInline`，可在浏览器内编辑运行——代码块下方「输出（console）」面板捕获 `console.log`（源码零改写，输出对齐 Node 格式）；故意抛错的演示块在错误条显示运行时错误；`ts` 块附带「类型检查（strict）」按钮，在浏览器内跑真实 tsc（与上方单文件类型检查命令同口径），编译错误演示与纯类型代码均可站内验证。约束：`live` 只在 MDX 编译路径生效——入选笔记 front matter 已加 `mdx: { format: mdx }`（纯 `.md` 里写 `live` 会静默降级为普通代码块，且该笔记正文裸露的 `{`/`<` 需转义，`scripts/fix-mdx-prose.mjs` 处理）。依赖 Node 的块（16 模块、18 vitest、19 eslint 配置等）保持静态；审计与转换脚本在 `docs-site/scripts/`（`live-audit` → 人工核对 → `apply-live`，`--revert` 可还原）。规则与示例见站内 `/live-playground` 页。

## 内容索引

### 阶段 0 · 环境准备
| 笔记 | 练习 |
| --- | --- |
| [00 环境准备 + 自测清单](notes/stage-0-setup/00-environment-setup.md) | — |

### 阶段 1 · JavaScript 核心机制
| 主题 | 笔记 | 练习目录 |
| --- | --- | --- |
| 1.1 类型系统与类型转换 | [01](notes/stage-1-js-core/01-types-and-coercion.md) | `exercises/types-and-coercion/`（4 个） |
| 1.2 作用域与闭包 | [02](notes/stage-1-js-core/02-scope-and-closure.md) | `exercises/scope-and-closure/`（4 个） |
| 1.3 this 与原型链 | [03](notes/stage-1-js-core/03-this-and-prototype.md) + 深化补充 [29](notes/stage-1-js-core/29-prototype-chain-supplement.md) | `exercises/this-and-prototype/`（7 个，07 配套笔记 29） |
| 1.4 异步编程 | [04](notes/stage-1-js-core/04-async-programming.md) | `exercises/async-programming/`（5 个） |
| 1.5 ES2015+ 关键特性 | [05](notes/stage-1-js-core/05-es2015-plus.md) | `exercises/es2015-plus/`（4 个） |
| 1.6 内存管理 | [06](notes/stage-1-js-core/06-memory-management.md) | `exercises/memory-management/`（2 个） |
| **里程碑：手写五件套** | [25](notes/stage-1-js-core/25-milestone-implementations.md) | `exercises/milestone/`（5 实现 + 5 测试，67 用例） |

### 阶段 2 · 引擎与运行时
| 主题 | 笔记 | 练习目录 |
| --- | --- | --- |
| V8 执行流程 / 隐藏类 / IC | [07](notes/stage-2-engine-runtime/07-v8-engine.md) | `exercises/v8-and-performance/`（5 个） |
| 渲染管线 / 防抖节流 / 切片 / Worker | [08](notes/stage-2-engine-runtime/08-render-and-performance.md) | 同上 |
| Node.js 运行时（streams/Buffer/子进程/worker_threads/cluster） | [35](notes/stage-2-engine-runtime/35-node-runtime.md) | `exercises/node-runtime/`（5 个 .mjs） |
| 性能工程（CPU profile/堆快照三快照法/事件循环延迟/六步法） | [36](notes/stage-2-engine-runtime/36-performance-engineering.md) | `exercises/performance-engineering/`（4 个 .mjs） |

### 阶段 3 · TypeScript 类型系统
| 主题 | 笔记 | 练习目录 |
| --- | --- | --- |
| 3.1 类型收窄与守卫 | [09](notes/stage-3-ts-types/09-ts-narrowing.md) | `exercises/ts-narrowing/`（4 个） |
| 3.2 泛型深入 | [10](notes/stage-3-ts-types/10-ts-generics.md) | `exercises/ts-generics/`（3 个） |
| 3.3 类型编程（核心重点） | [11](notes/stage-3-ts-types/11-ts-type-programming.md) | `exercises/ts-type-programming/`（5 个） |
| 3.4 内置工具类型源码 + 手写 | [12](notes/stage-3-ts-types/12-ts-utility-types.md) | `exercises/ts-utility-types/`（手写 15 个 + 20 用例校验） |
| 3.5 类型系统理论（协变/逆变等） | [13](notes/stage-3-ts-types/13-ts-type-theory.md) | `exercises/ts-theory/`（3 个） |
| 3.6 声明文件与模块解析 | [14](notes/stage-3-ts-types/14-ts-declarations-and-modules.md) | `exercises/ts-declarations/`（含 .d.ts） |
| 3.7 tsconfig 关键项 | [15](notes/stage-3-ts-types/15-tsconfig.md) | `exercises/tsconfig/`（3 个 Compiler API 对照实验） |
| 3.8 类与接口（声明合并/private 名义化/this/mixin） | [33](notes/stage-3-ts-types/33-ts-classes-and-interfaces.md) | `exercises/ts-classes-interfaces/`（2 个） |
| 3.9 函数类型（重载/void 豁免/this/构造签名/NoInfer） | [34](notes/stage-3-ts-types/34-ts-function-types.md) | `exercises/ts-function-types/`（2 个） |
| 3.10 类型体操实战（里程碑：14 道递进题） | [32](notes/stage-3-ts-types/32-ts-type-challenges.md) | `exercises/ts-type-challenges/`（4 个） |

### 阶段 4 · 工程化
| 主题 | 笔记 | 练习目录 |
| --- | --- | --- |
| ESM 与 CJS | [16](notes/stage-4-engineering/16-modules-esm-cjs.md) | `exercises/esm-cjs/`（5 个 .mjs/.cjs） |
| 构建工具 | [17](notes/stage-4-engineering/17-build-tools.md) | `exercises/build-tools/`（2 个，零依赖 mini-bundler） |
| Vitest | [18](notes/stage-4-engineering/18-testing-vitest.md) | `exercises/vitest-basics/`（7 个文件，21 用例） |
| ESLint + Prettier | [19](notes/stage-4-engineering/19-code-quality-eslint-prettier.md) | `exercises/eslint-prettier/`（2 个，Compiler API 手写） |
| 包管理与 monorepo | [20](notes/stage-4-engineering/20-package-manager-monorepo.md) | `exercises/package-manager/`（2 个 + 迷你 pnpm workspace 沙盒） |

### 阶段 5 · 专题深入
| 主题 | 笔记 | 练习目录 |
| --- | --- | --- |
| 函数式编程 | [21](notes/stage-5-topics/21-functional-programming.md) | `exercises/functional-programming/`（3 个） |
| 设计模式 | [22](notes/stage-5-topics/22-design-patterns.md) | `exercises/design-patterns/`（3 个） |
| 响应式源码阅读（Vue reactivity） | [23](notes/stage-5-topics/23-reactivity-source-reading.md) | `exercises/reactivity/`（手写迷你响应式 + 8 用例） |
| 面试输出预测题集（27 题 + 简答 10 条） | [24](notes/stage-5-topics/24-interview-prediction-questions.md) | — |
| 附加：编译原理视角串讲 | [26](notes/stage-5-topics/26-compiler-perspective.md) | `exercises/compiler-perspective/`（01–05） |
| 附加：特异行为按编译阶段归位 | [27](notes/stage-5-topics/27-weird-behaviors-by-stage.md) | `exercises/compiler-perspective/06-weird-behaviors.mjs` |
| 附加：JS/TS 发展史（决策考古） | [28](notes/stage-5-topics/28-js-ts-history.md) | `exercises/js-ts-history/`（4 个） |
| 附加：底层实现 vs 主流语言 | [30](notes/stage-5-topics/30-internals-vs-mainstream.md) | `exercises/compiler-perspective/07-internals-vs-mainstream.mjs` |

## 里程碑状态

- [x] **阶段 1**：手写 `Promise`（Promises/A+ 逐条标注）/ `bind` / `new` / 深拷贝 / `EventEmitter` —— `npx vitest run exercises/milestone/`（67 用例全绿）
- [x] **阶段 3**：手写 15 个工具类型（含严格版 Omit）+ 类型体操 5 组练习 —— `npx vitest run exercises/ts-utility-types/`（20 用例全绿）
- [x] **阶段 3（扩展）**：类型体操 14 道递进题（easy → hard，含 `Curry`/`MinusOne`/`Get`）+ 类与接口 + 函数类型深入 —— `tsc --strict` 全部单文件校验通过（`exercises/ts-type-challenges/`、`ts-classes-interfaces/`、`ts-function-types/`）

## 质量口径

- 所有练习的「预期输出」注释与真实运行输出**逐行一致**（65+ 文件全部核验过）
- 所有测试文件 `npx vitest run` 全绿（共 116 用例）
- 类型练习通过 `tsc --strict` 单文件校验，故意写错处均有 `@ts-expect-error` 命中验证

## 学习约定（摘自 OUTLINE.md）

- 每周回顾：重做各笔记「输出预测题」，直到能闭卷解释
- 遇到「背结论」的知识点，回到规范（ECMA-262 / TS Handbook / v8.dev / HTML Standard）找一手依据——每篇笔记的「依据」标注即为此设
