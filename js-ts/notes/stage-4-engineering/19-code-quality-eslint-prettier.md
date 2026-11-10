# 19 · 代码质量：ESLint（flat config）+ typescript-eslint + Prettier

> 对应大纲：阶段 4 工程化 —— 代码质量：ESLint + Prettier 配置要点

## 学习目标

1. 讲清 ESLint 的工作原理：AST（parser）→ 规则（rules）→ 插件/预设的三层结构
2. 会写 flat config（`eslint.config.js`），理解数组**顺序语义**，并对照旧 `.eslintrc`
3. 理解 typescript-eslint「带类型信息规则」为什么强、为什么慢；格式类规则为什么交给 Prettier
4. 记住三个高价值 TS 规则：`no-floating-promises`、`strict-boolean-expressions`、`no-misused-promises`

## 关键概念

### 1）ESLint 核心：基于 AST 的静态分析

一手依据：ESLint 官方文档《Getting Started》《Configuration Files（Flat Config）》。

ESLint 的处理流水线：

```
源码 → parser 生成 AST → 逐条规则以「访问器模式」遍历 AST → 命中即报告（可附带 --fix 自动修复）
```

三层复用结构（旧体系词汇，flat config 沿用概念）：

- **规则（rules）**：最小单元，如 `no-unused-vars`。每条规则注册对某类 AST 节点的访问回调，自行判断违规
- **插件（plugins）**：一组规则的命名空间包，如 `@typescript-eslint` 提供 `@typescript-eslint/no-floating-promises`
- **预设（configs）**：别人替你选好的规则集合，如 `eslint:recommended`、`@typescript-eslint/recommended`；旧配置叫 `extends`，flat config 里就是「往数组里再 push 一个 config 对象」

parser 有两个：JS 默认 `espree`；TS 项目用 `@typescript-eslint/parser`（产出与 ESTree 兼容、但保留 TS 语法的 AST）。

### 2）flat config：eslint.config.js 的数组顺序语义

一手依据：ESLint 官方文档《Configuration Files》与 typescript-eslint《Flat Config Usage》。

```js
// eslint.config.js（ESM，本工作区 "type":"module" 环境即如此写）
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,          // ① 先放基础预设
  ...tseslint.configs.recommended,     // ② 再放 TS 预设（覆盖/追加 ①）
  {
    files: ['**/*.ts'],                // ③ 可按文件组细分（取代旧 overrides）
    languageOptions: { parserOptions: { projectService: true } }, // 带类型信息（见 §3）
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['**/*.mjs'] },           // ignores 单独成项 = 全局忽略
);
```

**顺序语义**：配置是**对象数组的有序序列**，后面的项覆盖前面的项；规则取「最后一次出现」的值（`off` 也能覆盖前面的 `error`）。这与旧 `.eslintrc` 的 `extends` 继承链（子配置覆盖父链）等价，但从「嵌套配置文件 + extends 字符串引用」变成「显式数据结构」——可 lint、可条件拼接、无隐式解析。

与 `.eslintrc` 的对照表：

| 维度 | `.eslintrc.*`（legacy） | flat config |
| --- | --- | --- |
| 文件 | `.eslintrc.json/js/yml`，逐目录查找 + 合并 | 根部单个 `eslint.config.js` |
| 继承 | `extends: [...]` 字符串链 | 数组元素顺序即优先级 |
| 按文件区分 | `overrides` 字段 | 每项的 `files`/`ignores` 字段 |
| 环境/全局 | `env`、`globals` | `languageOptions.globals` |
| 插件解析 | `plugins` 名字 → 隐式约定解析 | 显式 `import` 后引用对象 |

（ESLint 9 起默认 flat config，legacy 进入维护态。）

### 3）typescript-eslint：带类型信息的规则

一手依据：typescript-eslint 官方文档《Typed Linting》《projectService》。

两类规则：

- **无类型规则**（`recommended`）：只看 AST 语法，快
- **带类型规则**（`recommendedTypeChecked` / 或单独开 `projectService: true`）：规则回调能拿到 `parserServices.program.getTypeAtLocation(node)` 这类**类型程序查询**

为什么强：很多 bug 只在类型层面可见。典型是 `no-floating-promises`——「调用了返回 Promise 的函数却没有 await/then/return」，语法完全合法，AST 上毫无破绽，但「这个调用的类型是 Promise」的信息一查便知。

为什么慢：类型信息不是免费的。tsc 的类型检查是**全局计算**（跨文件推断、`node_modules` 的 d.ts），typed linting 要求为整个项目建立一个 TypeScript Program 并保活——首次冷启动秒级、编辑时增量更新也要维护类型图。对比：无类型规则纯语法层，快一个数量级。工程折衷：CI/编辑器全开，预提交钩子只跑无类型子集。

**格式类规则应关闭**：缩进/分号/引号这类规则既与 Prettier 冲突，又消耗 typed lint 的预算。官方建议：`@typescript-eslint/stylistic` 系列默认不开，格式全部交给 Prettier（见 §4）。

**`no-unused-vars` 与 tsconfig 的关系**：TS 编译器自带 `noUnusedLocals` / `noUnusedParameters`（编译错误、无豁免语法）；ESLint 的 `@typescript-eslint/no-unused-vars` 更灵活，可配置豁免模式：

```js
'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
```

约定俗成：故意忽略的参数命名加 `_` 前缀。库工程常见做法是 tsconfig 不开 noUnused*（编译与「未使用」解耦），由 lint 承担该职责。

### 4）Prettier：opinionated 的 AST 重打印

一手依据：Prettier 官方文档《Option philosophy》。

工作方式：**解析成 AST → 丢弃几乎全部原始排版 → 按固定算法从头打印**。因为抛弃了作者的所有格式决策，可配置项刻意极少（printWidth、quote 风格等），「怎么格式化」没有讨论空间——这正是消除团队格式争论的设计目标。

**与 ESLint 的分工**：

| | ESLint（+typescript-eslint） | Prettier |
| --- | --- | --- |
| 关心 | 代码**正确性/潜在 bug**（类型误用、未处理 Promise、死代码） | 代码**排版**（缩进、换行、引号） |
| 判断依据 | AST 语义（可带类型信息） | AST 结构 + 固定风格算法 |
| 输出 | 诊断 + 部分 --fix | 整文件重写 |

**`eslint-config-prettier`**：一个「全 off 清单」预设——把 ESLint 侧所有**与 Prettier 冲突**的格式类规则关掉（它是 config 不是 plugin，不做格式化，只负责关闭冲突）。放在 flat config 数组**最后**，保证覆盖前面任何预设里误开的格式规则。

### 5）三个高价值规则（TS 项目优先开）

| 规则 | 抓什么 | 示例 |
| --- | --- | --- |
| `@typescript-eslint/no-floating-promises` | 调了 async 函数/返回 Promise 却没 await：错误被静默吞掉 | `saveUser(u);` 忘了 `await`，失败无人知晓（需类型信息） |
| `@typescript-eslint/strict-boolean-expressions` | 条件里的隐式真值转换：`''`、`0`、`[]` 都是 falsy/truthy 陷阱 | `if (items.length)` 合法但 `if (name)` 在 `name: string` 下 `''` 也过——规则要求显式 `name !== ''` |
| `@typescript-eslint/no-misused-promises` | 把 Promise 放进非 Promise 位置 | `if (check())` 当 `check` 是 async 时恒真；`setTimeout(asyncFn, 0)` 把 Promise 当返回值传 |

**编辑器集成**：ESLint/Prettier 各自的 LSP 在保存时运行。典型 VS Code 配置：

```jsonc
// .vscode/settings.json（示意）
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" } // Prettier 管格式，ESLint 管修复
}
```

原则：**格式问题 Prettier 修，语义问题 ESLint 报**，与 CI 里 `eslint . && prettier --check .` 一致——编辑器体验与 CI 门禁是同一套规则的两种入口。

**monorepo 补充**：flat config 天然适配 monorepo——根部一个 `eslint.config.js`，用 `files`/`ignores` 区分 `packages/*` 的规则差异（或各包子目录放自己的 config 交给根配置显式组合），避免 legacy 时代「逐目录 .eslintrc 合并语义」的混乱。typed 规则在 monorepo 下开销更大（projectService 要解析多个 tsconfig），按包粒度开。

### 6）本工作区为什么没有 lint 配置

刻意为之：学习期追求「噪音最小化」——阶段 1–5 的练习文件多为片段式实验，typecheck（`tsc --noEmit`）+ 测试（vitest）已覆盖关键反馈；引入 lint 体系属于阶段 4 的「知识储备」，等进入真实工程（或阶段 5 之后的实战项目）再按本笔记落地。

## 可运行示例

本工作区未安装 ESLint（不引入 node_modules），可运行部分是「机制验证」：

```bash
# ① AST 是 lint 的地基——用 tsx 感受「语法 vs 语义」的差异：
npx tsx exercises/vitest-basics/debounce.ts      # 转译运行，不查类型
npx tsc --ignoreConfig --noEmit --strict \
  --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom \
  exercises/vitest-basics/debounce.ts            # 类型检查：与 lint 的 typed 规则同源（都用 TS Program）

# ② 把 debounce.ts 里任意参数类型故意改错再跑：tsx 依旧成功，tsc 报错
#    ——这就是「no-floating-promises 需要类型信息」的直观体验：
#    语法层工具（espree/esbuild）看不到的，类型层工具（TS Program）看得到
```

配合阅读 `notes/stage-4-engineering/17-build-tools.md`（transpile-only 与类型检查的分工）与 `notes/stage-4-engineering/18-testing-vitest.md`（测试作为质量反馈的另一半）。

配套练习（本主题专属 `exercises/eslint-prettier/`，零依赖——不装 ESLint/Prettier，用 TS Compiler API 站到它们的位置）：

```bash
npx tsx exercises/eslint-prettier/01-mini-linter.ts  # 手写 mini-ESLint：3 条语法层规则 + 2 条 typed 规则（§1/§3）
npx tsx exercises/eslint-prettier/02-ast-reprint.ts  # Prettier 原理：重打印 / 幂等 / 结构保真 + 正则误伤反例（§4）
```

## 易错点与面试高频

- **flat config 顺序**：后项覆盖前项；`eslint-config-prettier` 忘了放最后 → 格式规则冲突复发（双修复打架的根源）
- **把 Prettier 当 ESLint 插件跑格式化**（eslint-plugin-prettier）：官方已不推荐——两个工具串行解析同一文件两次，慢且诊断混乱；正确姿势是分工 + config-prettier 关冲突
- **typed 规则不生效**：忘了 `projectService: true`（或旧式 `parserOptions.project`），`no-floating-promises` 等规则静默变成无类型判定或直接不工作
- **`no-unused-vars` 误伤回调参数**：用 `argsIgnorePattern: '^_'`，而不是全局关规则
- **CI 只跑 lint 不跑 format check**：`prettier --check .` 应与 `eslint .` 并列进 CI
- 高频面试题：「ESLint 原理」（parser → AST → 规则访问器）；「为什么 no-floating-promises 必须开 projectService」；「ESLint 与 Prettier 分工」；「flat config 与 eslintrc 区别」

## 输出预测题

### 题 1（typed 规则判断）

```ts
async function save(u: User): Promise<void> { await api.put(u); }
function check(): Promise<boolean> { return api.validate(); }

save(user);            // A
if (check()) { ... }   // B
const n: number = maybe; // C：maybe: string
```

不带类型信息的 ESLint（仅 `@typescript-eslint/parser`，未开 `projectService`）能发现哪几处？开了 `projectService` 后又是哪几处（各对应什么规则）？

### 题 2（flat config 顺序）

```js
export default [
  { rules: { quotes: ['error', 'single'], semi: ['error', 'always'] } },
  prettier, // eslint-config-prettier（关掉所有与 Prettier 冲突的格式规则）
  { rules: { 'no-var': 'error' } },
];
```

最终生效的 `quotes` / `semi` / `no-var` 状态分别是什么？如果把 `prettier` 挪到数组第一位，`quotes` 会变吗？

## 预测题答案

### 题 1 答案

不带类型信息：**一处也发现不了**。A 和 B 在纯 AST 上完全合法（一个普通调用表达式、一个普通条件表达式），C 在语法层也成立（类型不匹配是类型错误不是语法错误）。开了 `projectService` 后：A 被 `no-floating-promises` 抓住（表达式类型是 `Promise<void>` 却没被 await/return）；B 被 `no-misused-promises` 抓住（`Promise<boolean>` 出现在期待 `boolean` 的条件位置）；C 被 `no-unsafe-assignment` / 基础类型不匹配类检查抓住（`string` 赋给 `number`，本质是类型程序查询）。结论：这三条规则的能力**完全来自 TS Program 的类型信息**，这正是 typed linting 慢（要建全项目类型图）但强的原因。

### 题 2 答案

最终：`quotes: off`、`semi: off`、`no-var: error`。机制：数组按顺序合并，`prettier` 在第二项把两个格式规则关掉，第三项的 `no-var` 不冲突照常生效。把 `prettier` 挪到**第一位**后 `quotes`/`semi` 会变回 `error`——后面的第一项重新把 `'single'`/`always'` 写回去了（后项覆盖前项）。所以「关冲突的预设必须放最后」不是风格建议，是顺序语义的硬要求。

## 延伸阅读

- ESLint 官方文档《Configuration Files (Flat Config)》《Rules》
- typescript-eslint 官方文档《Getting Started》《Typed Linting》《projectService》《Extension Rules》
- Prettier 官方文档《Option philosophy》《Integrating with Linters》
- eslint-config-prettier 仓库 README（冲突规则清单与放置顺序说明）
