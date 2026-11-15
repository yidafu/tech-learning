---
sources:
  - stage-4-engineering
---

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

### 深入 §1：一条规则的解剖——「访问器模式」到底长什么样

每条规则都是一个对象：`meta`（文档、选项 schema、报错文案模板）+ `create(context)`（返回「节点类型 → 回调」的访问器表）。以一条 mini 版 `no-console` 示意结构（真实规则在 eslint 仓库 rules/ 下，结构同源）：

```js
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow console calls' },
    schema: [{ enum: ['allow', 'deny'] }],       // 选项声明——配置校验的依据
    messages: { forbidden: "Unexpected console.{{name}}()" }, // 文案模板与数据分离
    hasSuggestions: true,
  },
  create(context) {
    return {
      CallExpression(node) {                      // 访问器模式：只登记关心的节点类型
        const callee = node.callee;
        if (callee.object?.name === 'console') {
          context.report({
            node,
            messageId: 'forbidden',
            data: { name: callee.property.name },
            fix(fixer) {                          // --fix 的自动修复能力在这里声明
              return fixer.remove(node.parent);   // 修复必须精确、可重放，否则不提供 fix
            },
          });
        }
      },
    };
  },
};
```

三个设计要点：① **规则按节点类型注册回调**，遍历由 ESLint 统一驱动——这就是「访问器模式」的字面实现，也是插件互相独立、可任意组合的原因；② **`schema` 声明选项**，配置写错在启动期就报错——规则的行为面是自描述的；③ **`fix` 的契约是「精确且幂等」**——修复后重跑不应再产生新修复，做不到的（如需要跨文件信息）只能给 suggestion 不能自动 fix。工作区练习 `exercises/eslint-prettier/01-mini-linter.ts` 用 TS Compiler API 复刻的正是这套「AST 遍历 + 规则回调」骨架。

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

### 深入 §2：配置对象的字段速查与 ignores 的两种身份

flat config 里每个对象可用的核心字段（全字段见官方文档《Configuration Files》）：

| 字段 | 作用 | 备注 |
| --- | --- | --- |
| `files` | 本项适用的文件 glob | 不写 = 作用于所有被 lint 的文件 |
| `ignores` | 排除规则；**单独成项 = 全局忽略**，与 `files` 同项 = 组内排除 | 两种身份语义不同，最易写错 |
| `languageOptions` | `parser` / `parserOptions` / `globals` / `sourceType` / `ecmaVersion` | 取代 legacy 的 `parserOptions` + `env` + `globals` |
| `plugins` | 注册插件对象（显式 import 进来的） | 键名即规则前缀 |
| `rules` | 规则配置 | 后项覆盖前项（顺序语义） |
| `settings` | 给插件共享的杂项配置 | typed linting 的 `projectService` 之外的自定义信息走这里 |
| `linterOptions` | 元行为（如 `reportUnusedDisableDirectives`） | 管「lint 体系自身」的行为 |

**`ignores` 的两种身份**是高频坑：`{ ignores: [...] }` 单独成项 = **全局忽略**（这些文件完全不进入 lint 视野，等同旧 `ignorePatterns`）；`{ files: ['**/*.ts'], ignores: ['**/*.gen.ts'] }` 组内出现 = **从这组 files 里排除**——前者删除目标，后者过滤分组。写错位置的表现是「明明 ignore 了还是被报」或「想全局忽略却只对一组生效」。

**调试已合并配置的命令**：`npx eslint --print-config path/to/file.ts` 会打印该文件**最终合并生效**的完整配置（所有数组项按顺序合并后的结果）——「这条规则谁开的、被谁覆盖了」的争议用一条命令终结，等价于 TypeScript 的 `tsc --showConfig`。

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

### 深入 §3：typed linting 的开销治理与两个高频报错

开销控制的三个手段（官方《Typed Linting》的性能建议方向）：

1. **按文件组开启**：typed 规则只对真正需要的 glob 开（`files: ['**/*.ts']` 的那一项里开 `projectService`），脚本/配置类文件留在无类型组——「按组分层」正是 flat config 的强项
2. **依赖 tsconfig 的 include 范围**：projectService 复用现有 tsconfig 的项目，tsconfig 本身窄（合理的 include/exclude），lint 的类型图就小——lint 性能与 TS 编译性能同源（呼应 `notes/stage-4-engineering/17-build-tools.md` 的「类型检查是全局计算」）
3. **预提交钩子只跑无类型子集**（前文折衷的重申）：编辑器/CI 全量 typed，pre-commit 跑语法层规则

两个高频报错的根因：

- **「parserServices … not provided / not found」**：规则需要类型信息，但当前文件组没开 `projectService`（或该文件根本不在任何 tsconfig 的 include 里，TS Program 建不起来）——排查顺序：配置是否开了 → 文件是否被 tsconfig 覆盖
- **typed 规则「静默不生效」**：配置写成了无类型预设（`recommended` 而非 `recommendedTypeChecked`），或规则配在了没开 projectService 的文件组里——规则不会报「我需要类型信息」，只是退化/沉默，比报错更隐蔽

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

### 深入 §4：Prettier 的选项面、忽略与插件

- **可配置项刻意极少**（官方《Option philosophy》的立场）：printWidth、tabWidth、分号/引号风格这一类「纯排版」选项，外加每语言少量特例。判断一个配置项该不该存在，官方的标准就是「是否影响排版结果的唯一性」——团队争论的消解器是「没有旋钮」，不是「旋钮很多」
- **`.prettierignore`**：与 `.gitignore` 同语法；产物目录、生成代码（`*.gen.ts`、锁文件）必须排除——格式化生成代码既慢又会在下次生成时被冲掉，纯属浪费
- **CI 用法**：`prettier --check .` 只校验不重写（退出码非 0 即失败），本地用 `--write`（或编辑器 formatOnSave）；**CI 里 check、本地里 write** 是同一份配置的两个入口，与 §5 的「编辑器体验 = CI 门禁」原则一致
- **per-glob 覆盖（overrides）**：极少数场景需要按文件组调整（如生成代码放宽行宽）——有，但能不用就不用，每个 override 都在稀释「单一风格」的确定性
- **插件生态一句话**：以「重打印」为接口，格式化范围可以扩展（如按序重排类名类插件）——插件仍走同一套 AST → 打印管线，不违背「唯一输出」原则

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

### 深入 §5：从编辑器到 CI 的完整质量链

四个环节按「反馈速度」排序，越快越该高频触发：

| 环节 | 范围 | 内容 | 时延目标 |
| --- | --- | --- | --- |
| 保存时 | 单文件 | Prettier 格式化 + ESLint fix | 毫秒级 |
| 提交前（pre-commit 钩子） | **本次改动的文件** | lint（无类型子集）+ format check | 秒级——只碰改动文件是关键（lint-staged 类工具的卖点） |
| CI | 全仓 | `eslint .`（typed）+ `prettier --check .` + `tsc --noEmit` + 测试 | 分钟级，权威门禁 |
| 定期 | 全仓 | 依赖升级引发的规则漂移检查（配置兜底重跑） | 低频 |

两条治理细节：

- **warning 的腐化**：规则配置成 `warn` 而门禁不拦 warning，仓库会静默积累到「满屏 warning 没人看」——要么 `error`，要么 CI 用 `--max-warnings 0` 把 warning 当 error 拦（选一个，别悬置）
- **ESLint 的 `--cache`**：lint 结果按文件内容缓存，只重查变更文件——CI 与本地大仓的提速开关；与 typed linting 的项目级缓存独立（类型图的开销不随 `--cache` 消失，这是它与格式化类工具的差异）

把这张表与 §6 的工作区实践对照：学习期只保留了「CI 角色」里 tsc + vitest 两环（工作区没有 CI，靠手动跑），lint/format 两环留给真实工程——环节越少，每环的职责边界越值得先想清楚。

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
- **`ignores` 单独成项与组内出现是两种语义**：全局忽略 vs 组内过滤——「ignore 不生效」先查它是不是单独成项
- **typed 规则静默失效比报错更危险**：没开 projectService 时不报错、只是判定退化——「这规则怎么不报了」用 `--print-config` 验证最终配置
- **`--fix` 的修复必须幂等**：修复后重跑不再产生新修复；做不到的规则只能给 suggestion 不能自动 fix——「自动修完还报错」说明 fix 写坏了（或修复后又触发别的规则，检查规则间冲突）
- **warning 悬置是最差的中间态**：要么 error + 门禁拦截，要么不开；`--max-warnings 0` 是 CI 侧的兜底写法

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

### 题 3（规则能力归因 + ignores 语义）

```js
export default [
  { ignores: ['**/dist/**'] },                    // ①
  { files: ['scripts/**'], ignores: ['**/*.gen.ts'] },  // ②
  ...tseslint.configs.recommended,                // ③（无类型预设）
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-floating-promises': 'error' } }, // ④
];
```

① `scripts/check.gen.ts` 会被 lint 吗？② `src/a.gen.ts` 呢？③ `src/app.ts`（一个 `.ts` 文件）里写了 `save(u);`（floating promise），第 ④ 项的规则会生效吗？若报错/不报，分别给出一句话根因。

## 预测题答案

### 题 1 答案

不带类型信息：**一处也发现不了**。A 和 B 在纯 AST 上完全合法（一个普通调用表达式、一个普通条件表达式），C 在语法层也成立（类型不匹配是类型错误不是语法错误）。开了 `projectService` 后：A 被 `no-floating-promises` 抓住（表达式类型是 `Promise<void>` 却没被 await/return）；B 被 `no-misused-promises` 抓住（`Promise<boolean>` 出现在期待 `boolean` 的条件位置）；C 被 `no-unsafe-assignment` / 基础类型不匹配类检查抓住（`string` 赋给 `number`，本质是类型程序查询）。结论：这三条规则的能力**完全来自 TS Program 的类型信息**，这正是 typed linting 慢（要建全项目类型图）但强的原因。

### 题 2 答案

最终：`quotes: off`、`semi: off`、`no-var: error`。机制：数组按顺序合并，`prettier` 在第二项把两个格式规则关掉，第三项的 `no-var` 不冲突照常生效。把 `prettier` 挪到**第一位**后 `quotes`/`semi` 会变回 `error`——后面的第一项重新把 `'single'`/`always'` 写回去了（后项覆盖前项）。所以「关冲突的预设必须放最后」不是风格建议，是顺序语义的硬要求。

### 题 3 答案

① **不会**——第 ① 项 `ignores` 单独成项 = 全局忽略，`dist/**` 下的文件完全不进入 lint 视野，任何后续配置都无法对它们生效。
② **会**——第 ② 项的 `ignores` 与 `files` 同项出现 = **组内过滤**，只把生成文件从 `scripts/**` 这一组里排除；`src/a.gen.ts` 不属于该组的 files，也不在任何全局忽略里，照常被 lint。
③ **报错能力看两件事的组合**：第 ④ 项把规则开到了 `'error'`，规则本身已经「启用」；但 `no-floating-promises` 是 **typed 规则**，而本配置从未开 `projectService`（③ 是无类型预设，④ 的文件组也没配 `languageOptions.parserOptions`）——所以该规则拿不到类型信息，**静默不报错**（这正是「typed 规则静默失效」的标本：启用 ≠ 生效）。修复：给第 ④ 项的文件组补 `languageOptions: { parserOptions: { projectService: true } }`，并确认 `src/app.ts` 在 tsconfig 的 include 里。两句话根因：启用靠 rules 顺序合并；生效靠 parserServices 的类型程序。

## 落地检查单

- [ ] flat config 单文件生效，`npx eslint .` 与 IDE 插件报同一批错（配置源唯一，双源必漂移）。
- [ ] type-aware 规则只挂 `.ts/.tsx` 文件组，`projectService: true` 已开——题 3 的"静默失效"标本就是漏了这步。
- [ ] prettier 是唯一 formatter，`eslint-config-prettier` 放在配置数组**最后一位**（题 2 的顺序语义）。
- [ ] lint-staged 只跑暂存文件保手感，CI 全量跑保底线；两层共用同一份 config。
- [ ] CI 用 `--max-warnings 0` 做卡口，每条 `// eslint-disable-next-line` 带一句"为什么"。
- [ ] 新规则走"warn 观察 → 全量 fix → 转 error"三段，不打断在途分支。
- [ ] `ignores` 语义自查过：全局忽略（单独成项）与组内过滤（与 files 同项）没有混用（题 3 ①②）。

七条全绿，质量门才算从口号变成机器守的约。检查单与 [18-testing-vitest](18-testing-vitest.md)、[17-build-tools](17-build-tools.md) 的验收线同一风格：能勾的才算装好，勾不了的回去补对应小节。

## 延伸阅读

- ESLint 官方文档《Configuration Files (Flat Config)》《Rules》
- typescript-eslint 官方文档《Getting Started》《Typed Linting》《projectService》《Extension Rules》
- Prettier 官方文档《Option philosophy》《Integrating with Linters》
- eslint-config-prettier 仓库 README（冲突规则清单与放置顺序说明）

---

## 深入一层：生效序的完整路径、projectService 的内部与边界终版

### C1. 合并生效序：一条规则值是怎么定下来的

正文 §2 讲了「后项覆盖前项」，这里把「一条规则最终是什么值」的完整判定路径写全（依据 ESLint 官方文档《Configuration Files》的合并语义，手推整理口径）：

1. ESLint 对**每个被 lint 的文件**独立求值配置：遍历配置数组，把每一项里「能匹配该文件」的对象收集起来——没有 `files` 字段的项对全部文件生效，有 `files` 的项按 glob 匹配（相对配置文件所在目录）。
2. 收集到的对象**保持数组顺序**逐个合并；`rules` 字段按键粒度合并——同一个规则键以「数组里最后一次出现」的值为准，数组整体合并，不是浅覆盖整个 `rules` 对象。这意味着后面一项只写一条规则，不会冲掉前面项配置的其他规则。
3. 预设（`eslint.configs.recommended` 这类）在数组里等价于「原地展开成一组配置对象」，展开位置就是它在数组中的位置——`tseslint.config()` 帮手函数做的正是展开与扁平化，并提供类型提示与「单独的 ignores 项自动放末尾」的便利。
4. 全局忽略（`ignores` 单独成项）在第一步之前生效：文件被忽略就根本不进入收集环节，任何后续配置都无从谈起——这是「全局忽略压过一切」的机制解释。

两个推论值得点破：其一，「顺序语义」是**按键的**——`quotes` 被 `eslint-config-prettier` 关掉与否，取决于那一项相对其他写 `quotes` 的项的位置，而不是看整个对象的先后；其二，同一个文件同时命中多个 `files` 分组时，各分组的规则会**叠加**到这个文件身上，所以「给测试文件放宽」的分组要放在严格的分组之后，放宽才有机会生效。

### C2. projectService 到底省了什么、漏了什么

正文 §3 与「深入 §3」讲过 projectService 的开销与两个高频报错，这里补它的机制本体（依据 typescript-eslint 官方文档《projectService》，手推整理口径）。typed linting 需要 parserServices 提供一个活的 TypeScript Program；老式做法是 `parserOptions.project`——你手工列 tsconfig 路径，插件为每个文件去这些项目里建/查 Program。projectService 换了一个策略：**复用编辑器同款的「项目服务」**，按当前文件的路径自动找到包含它的 tsconfig 项目，直接挂上去。省掉的是「手工维护 tsconfig 清单」这份配置成本与错配风险；没省的是类型图本身的构建——该建的项目还是要建，typed 规则的运行成本仍在。

三个边界细节：

- **文件必须被某个 tsconfig 包含**，否则报「找不到所属项目」。逃生舱是 `allowDefaultProject`：给极少数不在 tsconfig 里但又想 lint 的文件（如根目录的少量脚本）用一份默认配置兜底——能不用就不用，兜底清单一长就退回手工维护时代。
- **`.js` 文件想被 typed 规则覆盖**，取决于 tsconfig 是否 `checkJs`/include 了它们；默认情况下 JS 文件即使被 lint，也拿不到完整类型服务——「同一规则对 js 不报」的争议先查这里。
- **tsconfig 里读不到的语法**（比如项目没开的实验性语法）同样影响规则判定——typed linting 的准确性天花板就是它挂靠的那个 tsconfig，这也是「lint 与 tsc 共用一份 tsconfig、不要另造」的另一个理由。

### C3. prettier 与 eslint 的边界：终版分工清单

正文 §4 给了分工总表，这里把工程里真正会争的灰色地带一次裁完（口径：纯排版归 prettier，凡需要读懂语义的归 eslint）：

| 争议项 | 裁决 | 理由 |
| --- | --- | --- |
| 缩进、换行、引号、分号、尾逗号 | prettier | 纯排版，重打印的主场 |
| 成员排序（import 顺序、class 成员顺序） | 两可，倾向 prettier 插件或 eslint 各选一 | 它是「可重排的排版」，关键是**只让一个工具拥有排序权**，两个都开必然互相打架 |
| 未使用变量、参数 | eslint（`no-unused-vars` 系） | 需要作用域语义，且有豁免模式（下划线前缀） |
| Promise 误用、布尔真值陷阱 | eslint（typed 规则） | 需要类型程序，正文 §5 的三位主角 |
| 命名规范、复杂度上限、最大行数告警 | eslint | 语义/可维护性判断，不是排版 |

这张表的实用结论：**每一个「改写代码文本」的职责只能有一个所有者**。lint 里残留一条格式规则（哪怕是 `semi`），和 prettier 就是双所有者；排序类规则两边同开也是双所有者。出现「保存一次、内容变两次」的现象，先查这张表里谁越界了。

### C4. 版本过渡：flat config 与旧生态的兼容口径

ESLint 9 起默认读 flat config（正文 §2 的结论），但插件生态的迁移是渐进的：一部分插件直接提供 flat 形式的预设对象，一部分还停留在旧 `eslintrc` 格式的字符串预设。过渡期的正确姿势有三条：

- 新项目直接起 flat config，不为兼容旧格式做任何妥协——生态主流已经就位，新债务没有必要。
- 存量迁移时若某个旧格式预设暂时无可替换，用官方兼容层（`@eslint/eslintrc` 包的 `FlatCompat`）把旧预设**临时**转成 flat 形式塞进数组——它只是过渡脚手架，对应插件出 flat 预设后应当即替换并删除兼容层；长期双轨会让配置文件同时携带两套心智模型，是另一种配置漂移。
- typescript-eslint 自带的 `tseslint.config()` 帮手函数已经是 flat 语义（展开、扁平、类型提示），用它就不需要兼容层——正文 §2 示例走的就是这条路。

一条判别纪律：看到教程里出现 `extends:` 字符串写法，先核对它针对的是哪一代配置体系再抄——flat config 时代照抄 `extends` 是「规则不生效」排查表里最常见的进门错误之一。版本问题的所有现象（规则静默、插件报错、`--print-config` 输出里规则缺失），都先问一句：这个插件在这个版本下，以哪一代配置格式被引入？

## 决策速查表

| 决策点 | 建议选 | 判断依据 |
| --- | --- | --- |
| 规则集起步档位 | `recommended`（无类型）先行，稳定后再升 `recommendedTypeChecked` | 先让团队习惯 lint 存在，再引入慢但强的档位（正文 §3 的开销账） |
| `strict` 系预设要不要上 | 团队有 TS 熟手、存量干净时上 | strict 档噪声大，适合当「重构季」的临时档而非常驻档 |
| 格式类规则 | 全关，格式归 prettier | §4 分工与 C3 裁决 |
| 何时引入 `eslint-plugin-import` | 跨模块路径错误多、循环依赖频发的仓库 | 它管「模块解析层面的卫生」，纯单文件仓库收益小 |
| 何时引入框架插件（react/vue） | 用了对应框架即刻引入其 recommended | 框架特有坑（hook 依赖数组、模板坑）只有专用规则看得见 |
| 何时引入 `eslint-plugin-unicorn` 等 opinionated 系 | 团队明确想要「更现代的写法推动」 | 属于风格强推而非缺陷捕捉，值得与否看团队共识 |
| 学习仓库要不要上 lint | 可以不上 | 正文 §6 的立场：反馈环最小化；但要能说清「上了会有什么」 |

这张表与排查速查表是配套的：决策表回答「该不该有」，排查表回答「为什么没有按预期工作」。评审同事的配置改动时，两表合用——先问这次改动落在哪一行决策，再问它会不会动摇排查表里的某条根因。拿不准的配置项，宁可先不开、观察段里看告警量再定，也不要以「更严格」的名义一次性全开——门禁的信用是靠「每次报错都值得看」攒起来的，告警疲劳是比漏报更贵的失败模式。

## 工程三陷阱

**陷阱一：双格式化打架——保存一次、内容变两次**。现象：保存后文件先被 prettier 排好，随即又被另一股力量改回去（或反过来），最终结果与两者单独跑都不同。机制：编辑器里同时存在两个「写文件」的入口——formatOnSave 的 prettier 扩展与 `source.fixAll.eslint` 的代码动作，若 eslint 配置里还残留格式规则，eslint 的 fix 会用**另一套排版**覆盖 prettier 的结果。处置照 C3：eslint 配置末尾挂 `eslint-config-prettier` 清光格式规则，编辑器只留一个 defaultFormatter；验收标准是「同一文件保存两次，diff 为零」。

**陷阱二：CI 里的 typed linting 慢到不可用后，被整段关掉**。typed 规则要建全项目类型图，大仓冷启动分钟级；团队等不起，于是把 typed 预设从 CI 摘掉——最强的规则随之失守。机制与正文「深入 §3」的开销账同源，但这里的教训是治理层的：**性能问题应该用分层与缓存解决，而不是用降级解决**。正确姿势：typed 只挂真正需要的文件组；CI 加 lint 缓存（`--cache`）；把「lint 全量」从合并门禁挪到定期任务，合并门禁只跑改动文件——每一档都保留 typed 能力，只是触发频率不同。

**陷阱三：「我本地没报、CI 报了」——双源配置漂移**。编辑器插件用的 ESLint/解析器版本与 CI 不一致（IDE 的全局安装 vs 项目的 devDependencies）、或编辑器还在读残留的 `.eslintrc` 而仓库已迁 flat config，都会造成两套结果。机制是「配置源不唯一」——正文落地检查单第一条的对立面。处置：编辑器强制用工作区版本（IDE 插件设置指向项目内 ESLint 包）、删除全部遗留配置文件、用 `npx eslint --print-config 文件名` 的输出与 IDE 里看到的规则状态对账；版本对齐写进仓库 README，新人入职当天可验证。

## 排查速查表

| 现象 | 先查什么 | 一句话根因 |
| --- | --- | --- |
| 改了规则不生效 | `--print-config` 里该规则的最终值 | 配置双源或数组顺序把改写压住了 |
| prettier 保存后又变回去 | C3 双所有者 + 编辑器双入口 | 格式规则还在 eslint 里活着 |
| typed 规则静默不报 | 文件组是否开了 projectService、文件是否在 tsconfig include 内 | 启用不等于生效（正文题 3 标本） |
| lint 突然报出成百错误 | 是否刚升级了 ESLint/插件 major | 规则漂移；走 warn 观察段，不要当场全关 |
| 单文件 disable 注释无效 | 注释的行号与作用域（next-line 与 block 的范围） | 注释放错行或范围没包住目标 |
| `--fix` 后仍然报错 | 修复是否幂等、规则间是否冲突 | fix 写坏或两规则互相触发（正文易错点） |
| monorepo 子包规则没生效 | 根配置的 files glob 是否匹配子包相对路径 | glob 从配置文件目录起算，路径写法要核对 |
| lint 跑得比测试还慢 | typed 文件组范围、有无 `--cache` | 类型图按组收缩，缓存按内容复用 |

## Code Review 检查单（评审视角，与「落地检查单」互补）

落地检查单管「配置装没装对」，这一张管「每次 PR 里 lint 相关改动的评审点」：

- [ ] 新增的 `eslint-disable` 是否带一句「为什么」，且范围最小（next-line 优先于整文件）。
- [ ] 新开启的规则是否做过**全仓**修复与评估，而不是只对新增代码生效——「新文件干净、旧文件报错」是债务扩容。
- [ ] 对测试文件/脚本目录的豁免走 `files` 分组，而不是逐文件 disable；豁免范围与目录职责一致。
- [ ] 生成代码（codegen 产物）进全局 ignores，而不是人工维护一排 disable 注释。
- [ ] 本次 PR 若动了 eslint/prettier 版本或配置，描述里附 `--print-config` 的关键差异或一段说明——配置变更是行为变更。
- [ ] 报错文案面向人（messageId 与 data 用得对），评审时顺手读一遍新规则触发的报错是否可读。

## 迁移配方：存量仓库接入五步

每步带验收标准，做完一步再进下一步：

1. **基线快照**。跑一次全量 lint（此时还没写配置，用最小预设），把现存问题数量与分布记进 PR 描述。验收：团队对「存量有多少债」有同一个数字——先接纳存量，任何规则都先不在存量上阻塞合并。
2. **格式先行、单独成 PR**。全仓跑一次 `prettier --write`，这个 PR **只含格式化、零语义改动**，说明里写明 blame 影响与 `--ignore-rev` 类的追溯方法（git 官方支持对指定修订免 blame）。验收：之后的 PR diff 里不再出现纯格式噪音；配置侧同步挂好 `eslint-config-prettier`（数组最后一位，正文题 2 的顺序语义）。
3. **无类型预设起步**。接 `recommended` 档，存量问题按「文件分组 + 逐规则」处理：能 `--fix` 的批量修，不能修的走 warn 观察段并配基线注释。验收：全仓 `--max-warnings 0` 下仍可通过（观察段规则此时未升 error）。
4. **分文件组开 typed**。对 `src` 的文件组开 `projectService: true`，接入 `recommendedTypeChecked`；脚本/配置目录留在无类型组。验收：正文「深入 §3」两个高频报错零出现；`no-floating-promises` 在 src 内至少抓到过一颗真雷（抓不到说明规则静默，回头查 include）。
5. **门禁与治理**。CI 全量 `eslint .` 加 `prettier --check .`，`--max-warnings 0` 卡口；warn 转 error 走「观察、全量 fix、升档」三段；disable 必须带理由；pre-commit 只跑改动文件的无类型子集保手感。验收：从任意分支拉一个新提交，门禁在十分钟内给出可读、可定位的反馈。

五步的共同原则：**每一步都让仓库处于「门禁可用」状态**—— lint 体系是逐步收紧的，不是一夜之间从零到 strict；收紧的节奏由观察段的告警量决定，而不是由配置文件的一次性大爆炸决定。

## 迁移期问答三则

- **存量错误太多，先修还是先配基线？** 先配基线（记录哪些文件允许哪些规则继续告警），让门禁先立起来，再按目录分批清债。反过来「修完再开门禁」在实践中几乎总死于「修不完」。
- **lint 与 `tsc --noEmit` 重复吗？** 有重叠（未使用检查等）但职责不同：tsc 管类型正确性这一整块，eslint 的 typed 规则管「类型正确但用法错误」的语义坑（floating promise 在 tsc 眼里完全合法）。两者同用一份 tsconfig 是底线（C2），删掉任何一方都留缺口。
- **团队有人坚持自己的格式偏好怎么办？** 把争论升级为工具决策而不是 review 评论：所有排版偏好由 prettier 的（极少的）配置项一次性裁决，之后 review 里不讨论格式——「没有旋钮」就是这问题的唯一可持续答案（正文 §4 的 Option philosophy 立场）。
