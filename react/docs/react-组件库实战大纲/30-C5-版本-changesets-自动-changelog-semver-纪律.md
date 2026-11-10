---
title: "C5. 版本：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）"
---
> 本文是《Part C：工程化（从 demo 到可发布）》按小节拆分后的续篇，上一部分见 [29-C4-测试-Vitest-Testing-Library-逐组件-Storybook.md](29-C4-测试-Vitest-Testing-Library-逐组件-Storybook.md)。
## C5. 版本：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）

### 是什么：changesets 工作流

changesets 把"这次改动该发什么版本、写什么 changelog"从发布日的记忆劳动，变成**每次 PR 的即时声明**。核心对象是"变更集"（changeset）：一个 markdown 文件，声明影响的包、semver 级别和面向用户的描述。

### 为什么需要

手工维护多包版本有三宗罪：忘了哪个包该 bump（内部依赖断链）；changelog 与提交脱节（发布日补写两个月的内容）；发布操作多步手敲（漏 publish 一个子包）。changesets 把这三件事全部流程化，并且**版本决策发生在还有上下文的 PR 现场**，而不是发布时考古。

### 怎么做：完整工作流（五步）

**第 1 步：开发者在 PR 里写变更集。**

```bash
pnpm changeset
# CLI 交互：
# 1) 勾选受影响的包（自动列出 workspace 内所有可发布包）
# 2) 对每个包选 semver 级别（Patch / Minor / Major）
# 3) 写一段面向用户的变更描述
```

生成的文件（文件名随机，如 `.changeset/bright-pandas-run.md`），**格式是 frontmatter + 正文**：

```markdown
---
'@react-ui/components': minor
'@react-ui/hooks': patch
---

feat(components): Select 新增 `labelInValue`，选中值可携带 label；hooks 伴随修复 useControllableState 在受控值切换为 undefined 时的警告
```

frontmatter 是"包名 → semver 级别"映射（一次改动影响多个包就写多行），正文直接进 CHANGELOG。变更集文件随 PR 提交，reviewer 在 diff 里就能看到"这次改动承诺发布什么"。

**第 2 步：`.changeset/config.json`。**

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "your-org/react-ui" }
  ],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```

关键项：`access: "public"`（scoped 包发布 npm 必须显式 public，否则默认 private 发不出去）；`updateInternalDependencies: "patch"`（内部依赖默认跟随 patch bump，major 传递升级由 changesets 自动处理）；changelog-github 让 changelog 里带上 PR 与作者链接。

**第 3 步：CI 消费变更集，生成 Version PR。** 官方 action 在 main 分支发现未消费的变更集时，自动开一个名为 "Version Packages" 的 PR：执行 `changeset version` 会 bump 所涉及包的版本号、把变更集正文写入各包 CHANGELOG.md、按新版本更新内部依赖（`workspace:*` 仍在，发布时才替换）、删除已消费的变更集文件。这个 PR 的 diff 就是"下个版本的全部内容"，merge 它 = 决定发版。

**第 4 步：发布。** merge Version PR 后 CI 再次运行，此时已无变更集，action 转入 publish 模式：`turbo run build`（确保发布的是新鲜产物）→ `changeset publish`（bump 过版本的包逐一 `npm publish`，同时把 `workspace:*` 替换为真实版本号，并打 git tag）。

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write        # 打 tag
      pull-requests: write   # 维护 Version PR
      id-token: write        # npm provenance（可选）
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org/
      - run: pnpm install --frozen-lockfile
      - run: pnpm build                        # turbo 按拓扑构建全部子包
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish      # 有 Version PR 被 merge 时执行发布
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**CI 集成要点**：权限三件套（contents/PR/id-token）缺一不可；`NODE_AUTH_TOKEN` 通过 setup-node 的 registry-url 写入 .npmrc；publish 命令前必须有构建步骤，且构建必须走 turbo 拓扑（保证子包 dist 都是最新——这回到 C1 的任务编排）。

**第 5 步：semver 纪律。** 判断表（发版前对照）：

| 改动 | 级别 |
|---|---|
| 修 bug，API 与行为契约不变 | patch |
| 新增组件 / 新增可选 props / 新增导出，旧代码零改动 | minor |
| 删除或改名 props / API 签名变化 / 默认值或视觉规范级变化 | major |
| 提升 React 最低版本、收紧 peerDependencies | major |
| 修 bug 但可能有人依赖错误行为 | 起步 minor，影响面大则 major |

灰色地带的裁决原则：**问"用户升级后，现有代码有没有可能在无警告的情况下变行为"**——答案是"会"，就是 major。视觉微调（对齐 1px）惯例上 patch，系统性视觉改版是 major。

**废弃 API 的两版本缓冲策略**（组件库维护者的职业操守）：

1. **v1.2（当前 minor）**：新 API 上线；旧 API 标记 `@deprecated`（JSDoc + 编辑器删除线），运行时在 dev 模式 `console.warn('[deprecated] type="link" 将在 v3.0 移除，请改用 variant="text"，迁移见 CHANGELOG 的 codemod 章节')`；
2. **v2.0（下一个 major）**：旧 API 仍可工作，警告保留——major 允许破坏，但我们多留一个周期；
3. **v3.0**：真正删除，并在 changelog 顶部置顶迁移指引。

缓冲的意义：大型业务不可能随组件库的 major 即停即改，两个大版本的窗口给了他们完整的排期空间；警告在开发控制台持续刷存在感，是最高效的催迁移手段。

### codemod：把迁移指南变成一条命令

**是什么**：jscodeshift 是 Meta 出的 AST 代码变换工具——把"手工搜索替换"升级为**语法感知的批量重构**，不会被注释、字符串、多行格式骗到。大版本把 API 改名时，配套发布 codemod，用户跑一条命令完成全部迁移。

**示例：v2.0 把 Button 的 `type` prop 改名为 `variant`（值也做映射）**，完整可用的 transform：

```ts
// codemods/button-type-to-variant.ts
import type { FileInfo, API } from 'jscodeshift';

export default function transform(file: FileInfo, { j }: API) {
  const root = j(file.source);

  // 1. 从 import 语句拿到 Button 在本文件的局部名（处理 `import { Button as Btn }` 别名）
  const localNames: string[] = [];
  root
    .find(j.ImportDeclaration, { source: { value: '@react-ui/components' } })
    .forEach((importPath) => {
      j(importPath)
        .find(j.ImportSpecifier, { imported: { name: 'Button' } })
        .forEach((specPath) => {
          // local 存在即别名场景；否则局部名就是 imported 名
          localNames.push((specPath.node.local ?? specPath.node.imported).name);
        });
    });

  if (localNames.length === 0) return file.source; // 本文件未引用，原样返回（不产生 diff 噪音）

  // 2. 旧值 → 新值的映射（type 的语义在新 API 下拆成了 variant + htmlType）
  const valueMap: Record<string, string> = {
    primary: 'primary',
    default: 'secondary',
    link: 'text',
    dashed: 'secondary',
  };

  // 3. 遍历 <Button type="...">，改属性名并映射值
  for (const name of localNames) {
    root
      .findJSXElements(name)
      .find(j.JSXAttribute, { name: { name: 'type' } })
      .forEach((attrPath) => {
        const attr = attrPath.node;
        attr.name = j.jsxIdentifier('variant'); // type → variant
        if (attr.value?.type === 'StringLiteral' && attr.value.value in valueMap) {
          attr.value = j.stringLiteral(valueMap[attr.value.value]); // 值同步映射
        }
        // 值是表达式（变量/三元）时不动，留给人工确认——codemod 宁可少改不可错改
      });
  }

  return root.toSource({ quote: 'single' }); // 保持单引号风格，diff 最小化
}
```

在业务仓库执行：

```bash
# --parser=tsx 必须显式指定，否则 JSX 语法解析直接报错
pnpm dlx jscodeshift -t node_modules/@react-ui/components/codemods/button-type-to-variant.ts \
  src/ --extensions=tsx,ts --parser=tsx
```

codemod 随包发布（放进 components 包的 `codemods/` 目录并在 `files` 中包含），changelog 的迁移章节直接给这条命令。**验证纪律**：codemod 本身要有"输入 → 输出"快照测试（固定几个带别名、带表达式值的样本文件，跑 transform 断言输出），否则迁移工具自己变成事故源。

### 常见坑

1. **症状**：发布后用户装到的包依赖仍是 `"@react-ui/hooks": "workspace:*"`。**根因**：绕过 `changeset publish` 直接 `pnpm publish`。**修法**：如 C1 所述，发布入口唯一化；CI 的 publish 权限只给 bot 账号。
2. **症状**：Version PR 只 bump 了 components，没带动 hooks。**根因**：改动横跨两包但变更集里只勾了一个包。**修法**：PR 模板里提醒"跨包改动写全 changeset"；review 时把变更集覆盖面当检查项。
3. **症状**：codemod 跑完部分文件报错退出。**根因**：混入 `.js`/`.jsx` 文件却只给了 tsx parser，或文件里有非标准语法（装饰器、flow）。**修法**：按扩展名分批执行并各自指定 parser；对无法解析的文件让 jscodeshift 跳过（默认跳过并打印错误文件清单，事后人工处理该清单）。

### 补充：changesets 实操命令序列与 monorepo 版本联动

**是什么**：前文五步给了主干（写 change → Version PR → publish，含 config 与 release.yml）；本节补手上功夫：本地完整命令序列（发版前必须真敲过一遍的演练）、monorepo 联动版本的 fixed/linked 两种模式、prerelease（next 渠道）的完整进出序列。

**为什么值得单列**：changesets 的事故几乎都发生在"第一次"与"演练缺失"——version 预演没做过就不知道联动 bump 长什么样；pre 模式没玩过就不知道退出时要收敛版本号。这些只能靠命令序列本身解决。

**本地全流程命令序列**（可完整粘贴的演练）：

```bash
# 1. 写变更集（交互式：勾包 → 选级别 → 写描述）
pnpm changeset

# 2. 查看未消费的变更集（PR 自查"这次会发什么"用）
pnpm changeset status --verbose

# 3. 本地预演 version：bump 版本 + 写 CHANGELOG + 删除已消费变更集
pnpm changeset version
git diff   # 审查三处变化：各包版本号、CHANGELOG 排版、内部依赖的联动 bump 是否符合预期

# 4. 预演结束，丢弃产物（变更集必须留给 CI 的 Version PR 消费）
git restore .changeset packages
```

第 3/4 步的价值：`status` 只给清单，`version` 才给真实的版本算术与 CHANGELOG 排版。预演后丢弃，正式消费仍走 Version PR——两条路径产物一致，因为跑的是同一条命令。

**monorepo 联动版本：fixed 与 linked**（`.changeset/config.json`）：

```jsonc
// .changeset/config.json（节选，其余键见前文完整配置）
{
  "fixed": [["@react-ui/icons", "@react-ui/styles", "@react-ui/components"]],
  "linked": [["@react-ui/components", "@react-ui/hooks"]]
}
```

| 模式 | 语义 | 适用 |
|---|---|---|
| 不配置（默认） | 各包独立版本；A 依赖 B 时，B 的升级按 `updateInternalDependencies`（patch）带动 A | 版本节奏独立的包（utils 与 components） |
| `fixed` | 组内版本号**强制相同**：任何一包的变更集都把整组拉到同一版本 | "必须成套发布"的包（图标/样式/组件三件套，类似 Angular 的统一版本） |
| `linked` | 组内**同类型联动 bump**，但保留各自的版本差（A 3.1.2、B 2.8.0，一起升 minor 后仍差一个大版本） | major 不必同步、但 minor/patch 希望一起动的包组 |

判定口诀：**用户是否永远同时升级这两包**——是则 fixed；不总是但常联动则 linked；各自独立则不配。

**prerelease：next 渠道的进出序列**（2.0 大版本先发 next 给种子用户试）：

```bash
# 1. 进入 pre 模式（参数即 dist-tag 名）
pnpm changeset pre enter next

# 2. 正常写变更集（级别按最终版选：这批发完应是 2.0.0 就选 major）
pnpm changeset
pnpm changeset version      # 版本变为 2.0.0-next.0；后续消费得到 next.1、next.2…

# 3. 发布：pre 模式下自动打 next dist-tag（npm install 默认不会装到 prerelease）
pnpm changeset publish
# 种子用户显式安装：npm install @react-ui/components@next

# 4. 预发收敛，转正式版
pnpm changeset pre exit     # 状态记录在 .changeset/pre.json
pnpm changeset version      # 2.0.0-next.3 收敛为 2.0.0
pnpm changeset publish      # 正式版回到 latest
```

**PR 防呆：没有变更集的改动要被看见**。changesets/action 的内置行为——PR 改了包但 `.changeset/` 里没有新变更集时，Version PR 会带 "Packages without a changeset" 注释（不阻塞，但 reviewer 有依据打回）。配套最低配：PR 模板加勾选项"本 PR 已写变更集 / 不需要（纯文档、CI 改动）"。

**发版检查单**（Version PR merge 前 60 秒过一遍，本节坑表里的"忘了 pre exit"就靠它拦）：

- [ ] `.changeset/pre.json` 不存在（或本次就该 pre 发）
- [ ] 变更集覆盖面 = 改动横跨的包（对照 git diff 的包目录）
- [ ] fixed 组整组同版本、linked 组联动类型符合预期
- [ ] dist-tag 正确（正式 latest / 预发 next）
- [ ] post-publish smoke 绿（配置见下文事故节）

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 正式版一直发成 next | pre 状态存在 `.changeset/pre.json` 里随 git 长期存活，忘了 exit | release 检查单第一项：pre.json 是否存在 |
| fixed 组版本没对齐 | 组内包名拼写错误，或对联动机制有误解（以为只 bump 有变更集的包） | 核对 fixed 数组包名；fixed 的语义就是整组拉齐 |
| 本地预演的 version 产物误提交 | 预演与正式消费撞车 | 预演后必 `git restore .changeset packages`；CI 是唯一合法消费方 |

### 补充：semver 灰色案例判定表

**是什么**：前文第五步的基础表回答了常规改动；本节把灰色案例逐个裁决成表。它们共有的陷阱是：**答案取决于用户代码是否显式依赖了被改变的那一层**——判定要看证据（用户的写法空间），不是感觉。

**为什么值得单列**：灰色案例是每次发版评审的争论点，没有成文判定表，结论随在场的人漂移；而"判轻了"的代价（用户升级即编译失败/行为变化）由用户全额承担。

**判定表**（默认裁决 + 升降级条件）：

| 灰色案例 | 默认裁决 | 升 major 的条件 | 降 patch 的条件 |
|---|---|---|---|
| 新增可选 prop（带默认值） | minor | 新 prop 名与组件透传的 DOM 属性冲突（如组件 spread rest，新 prop 截走了用户正在用的 `title`） | —（新增就是 minor） |
| 新增 prop 且默认开启新行为 | minor | 默认值使**不传该 prop 的既有用法**渲染/行为变化——这是"新增"包装下的默认值变更 | — |
| 收紧 TS 类型（`string` → `'a' \| 'b'`） | minor | 宽类型被真实使用（用户传任意 string 变量），收紧即用户编译失败——类型是公开契约 | 原宽类型是笔误级错误且合法值集合实际不变 |
| 放宽 TS 类型 | patch~minor | 放宽改变泛型推导结果（用户代码里的类型跟着变宽） | 纯放宽、推导不变 |
| 默认值变更（视觉可感知，如 size 默认 M→S） | major | 用户未写该 prop 的地方全部变样——最常见的隐性 breaking | — |
| 默认值变更（行为，如 Esc 不关→关） | major | 同上：不配置的既有用法行为变了 | 原行为是公认 bug 且有 issue 佐证 |
| CSS 类名/DOM 结构变化 | minor | 文档事实支持的"CSS 覆盖样式"写法大面积失效 | 内部实现类名（已声明不保证稳定） |
| 修 bug 但错误行为可能被依赖（用户 catch 该错误做流程控制） | minor 起步 | 已知有用户依赖错误行为 | — |
| 收紧 peerDependencies / 提升 React 最低版本 | major | （前文基础表已定，列入表中便于对照） | — |

**裁决流程**（拿不准时按序三问，第一句命中即止）：

1. **有没有用户的代码会失败？**（编译失败、运行时报错、CSS 选择器失效）——有 → major；
2. **有没有用户的代码"能跑但结果变了"？**（渲染输出、回调时序、默认行为，且非公认 bug 修复）——有 → major；
3. **只新增、无既有路径受影响？** → minor；三者皆无才是 patch。

**判定证据从哪来**（不要拍脑袋，去查三处）：

1. 仓库内文档与示例代码——自己示范过的写法就是被依赖的契约；
2. issue/工单搜索被改变的关键词——有人报告过的用法即真实存在；
3. codemod 扫描（对外库可用用户样本/对内库可扫公司仓库）——统计"这个 prop 被传了哪些值"。

**类型算契约的证据意识**：判定"收紧类型"是否 breaking，先看库的公开声明——若文档写明"类型遵循 semver"（TypeScript、React 类型生态的通行做法），收紧致用户编译失败就是 breaking；若声明"类型尽力而为"，可 minor。关键是**把选择写进文档**，而不是每次发版重新吵。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| "只收紧了类型"发 minor，用户升级后编译全红 | 类型是公开契约，编译失败对用户就是 breaking | 升 major；或两步走：新增精确类型、旧宽类型标记 deprecated |
| 新增可选 prop 发 minor，用户升级后页面变了 | 新 prop 默认开启、改变了既有渲染（隐性默认值变更） | 新 prop 默认关（off 值），显式开启才生效 |

### 补充：npm deprecate 与弃用 API 的最小 codemod

**是什么**：前文"两版本缓冲策略"覆盖了 JSDoc `@deprecated` 与运行时警告，并给了一个带 import 追踪与值映射的完整 codemod；本节补发布侧另一半——npm deprecate 的命令、文案与范围语法，以及一个**最小** codemod（直改版）加它的可运行测试。最小例的价值是当模板：大多数弃用迁移就是"prop 改名"，用不上完整版的机关。

**npm deprecate：装包时就能看到的弃用提示**（与运行时警告互补：一个在安装时、一个在使用时）：

```bash
# 单版本弃用
npm deprecate @react-ui/components@2.5.0 "2.5.0 的 Modal 焦点陷阱失效，请升级 2.5.1+"

# 区间弃用（某批版本都有问题）
npm deprecate '@react-ui/components@>=2.5.0 <2.5.2' "2.5.0–2.5.1 存在焦点问题，请升级 2.5.2+"

# 整包弃用（更名/停止维护）
npm deprecate '@react-ui/components@*' "已更名为 @your-org/ui，迁移指南：https://your-org.github.io/ui/migrate"

# 解除弃用（传空字符串）
npm deprecate @react-ui/components@2.5.0 ""
```

要点：

1. **文案四要素**：谁（版本/范围）、为什么（一句话）、怎么办（升级到哪/换哪个包）、链接（issue/迁移文）。用户看到它的场景是 install 时的红字——没有"怎么办"的弃用提示只制造焦虑；
2. **弃用 ≠ 下架**：deprecate 后仍可安装（提示不阻断），unpublish 才是真移除（见下节，慎用）；
3. 权限：包 maintainer 才能执行；开启 2FA 时按提示输入 OTP；
4. 弃用非 latest 版本时日常无人看到（装不到就不提示）——这是特性：只有真装到坏版本的人才需要被提醒。

三条弃用通道各司其职（与前文缓冲策略的 JSDoc/运行时警告拼成完整矩阵）：

| 通道 | 触达时机 | 适合放什么 |
|---|---|---|
| `npm deprecate` | 安装/升级时 | 版本级问题（坏版本、安全）、包更名 |
| 运行时 `console.warn`（前文） | 开发使用时 | API 弃用的迁移指引（可带 codemod 命令） |
| JSDoc `@deprecated`（前文） | 写代码时 | 编辑器删除线、精确到符号的迁移目标 |

**最小 codemod：`visible` → `open`**（Modal 的 prop 改名，antd 真实发生过的迁移；值不动、无映射）：

```ts
// codemods/modal-visible-to-open.ts —— 最小直改版
import type { FileInfo, API } from 'jscodeshift';

export default function transform(file: FileInfo, { j }: API): string {
  const root = j(file.source);
  let touched = false;

  root
    .findJSXElements('Modal') // 只处理 <Modal>；别名与 <UI.Modal> 成员表达式场景用前文完整版的 import 追踪思路
    .find(j.JSXAttribute, { name: { name: 'visible' } })
    .forEach((path) => {
      path.node.name = j.jsxIdentifier('open'); // 只改属性名；值（boolean/表达式）原样保留
      touched = true;
    });

  return touched ? root.toSource({ quote: 'single' }) : file.source;
}
```

与完整版的分工：业务代码 `import { Modal }` 直引且只改 prop 名时，最小版够用且永不误伤（无 Modal 的文件原样返回零 diff）；存在 `Modal as M` 别名、成员表达式写法或值映射需求时上完整版。

**codemod 的最小 Vitest 测试**（把前文"输入 → 输出快照测试"的纪律落成可运行代码）：

```ts
// codemods/modal-visible-to-open.test.ts
import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import type { API } from 'jscodeshift';
import transform from './modal-visible-to-open';

const run = (source: string): string =>
  transform(
    { path: 'demo.tsx', source },
    { j: jscodeshift, jscodeshift, stats: () => {}, report: () => {} } as unknown as API,
  );

describe('codemod: modal visible → open', () => {
  it('改写 JSX 属性名，值保留', () => {
    expect(run('<Modal visible={show} onCancel={close} />')).toBe(
      '<Modal open={show} onCancel={close} />',
    );
  });

  it('不碰非 Modal 元素与已迁移的 Modal', () => {
    const src = '<Drawer visible={show} />\n<Modal open={show} />';
    expect(run(src)).toBe(src);
  });

  it('无 Modal 的文件原样返回', () => {
    const src = 'const visible = true;\nexport { visible };';
    expect(run(src)).toBe(src);
  });
});
```

业务侧执行命令与前文一致（`jscodeshift -t <该文件> src/ --extensions=tsx,ts --parser=tsx`）。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| deprecate 提示没出现 | 弃用的是非 latest 版本，只有装到它才提示 | 符合预期；重大问题配合 changelog 顶置与 issue |
| codemod 把 `<Drawer visible>` 也改了 | 元素过滤写成了全局 `find(j.JSXAttribute)` 扫描 | 限定在 `findJSXElements('Modal')` 之下；测试第二例就是防这个的 |
| toSource 后引号/换行风格大变，PR diff 巨大 | recast 打印风格与原文件不一致 | 保持 `quote: 'single'` 贴近项目风格；无法收敛时接受一次性 format diff 并在迁移说明里注明 |

### 补充：发布事故与回滚

**是什么**：发了坏包（产物缺失、误发未完成代码、依赖错乱）之后的应急处置序列。先立核心认知：**npm 包一旦被人安装就回不去了**——回滚不是"撤回"，而是"把安装流量引回好版本 + 标记坏版本 + 尽快向前发修复"。

**为什么值得单列**：事故处理速度直接决定影响面，而它恰恰不能现场发挥——权限、命令、顺序都必须在演练里固化。第一次查 unpublish 用法的搜索不应该发生在事故进行时。

**工具箱与约束**：

| 手段 | 效果 | 限制 |
|---|---|---|
| `npm dist-tag add pkg@x.y.z latest` | latest 指回好版本：此后不带版本的安装都拿到好版本 | 已装用户不受影响 |
| `npm deprecate pkg@bad "…"` | 装该版本时红字警告 + npm 页面标记 | 不阻断安装 |
| 快发修复版（bad 是 2.5.0 就发 2.5.1） | 版本序列向前走，lockfile 语义完好 | 最诚实的回滚：npm 版本只增不减 |
| `npm unpublish pkg@bad --force` | 真移除该版本 | **72 小时窗口**内且无其他包依赖该版本才允许；超窗只能 deprecate + 联系 support |

**应急序列**（按序执行，每一步都独立止损）：

```bash
# 前提：坏版本 2.5.0，上一好版本 2.4.2

# 1. 止血（第 1 分钟）：latest 指回好版本，切断新增受害者
npm dist-tag add @react-ui/components@2.4.2 latest

# 2. 标记（第 5 分钟）：装到坏版本的人立刻看到原因与去向
npm deprecate @react-ui/components@2.5.0 \
  "2.5.0 ESM 产物缺失，安装后无法 import。请锁定 2.4.2 或升级 2.5.1（当天发布）。issue: https://github.com/your-org/react-ui/issues/123"

# 3. 修复：正向发 2.5.1（修复合入 → changeset(patch) → Version PR → publish）
#    不要试图原地"重发 2.5.0"——即使 unpublish 成功，CDN 缓存也会新旧混杂，且 registry 拒绝同号重发

# 4. 收尾：2.5.1 发布后 latest 自动前移；核对 deprecate 文案里的指引仍然准确
```

**unpublish 的 72 小时规则**（npm 现行策略）：发布未满 72 小时、且没有任何包依赖该版本时可 unpublish；超窗或存在依赖者会被拒，只能走 deprecate + 修复版路线。它**不是常规回滚手段**：即便成功，已写进用户 lockfile 的 tarball URL 在 CDN 上仍可能存活数小时到数天，形成"有人能装、有人 404"的分裂态。只有密钥泄露、严重安全缺陷才值得动用。

**锁版本止损**（业务侧动作，写进事故通报模板）：

```jsonc
// 受影响但暂无法升级的业务，锁到好版本——三种包管理器任选其一
// npm（package.json）
{ "overrides": { "@react-ui/components": "2.4.2" } }
// pnpm（package.json 或 pnpm-workspace.yaml）
{ "pnpm": { "overrides": { "@react-ui/components": "2.4.2" } } }
// yarn (berry)
{ "resolutions": { "@react-ui/components": "2.4.2" } }
```

**事故通报模板**（影响面通报比技术细节更急，模板化才能在事发 10 分钟内发出）：

1. 现象与影响版本（谁装到会坏、症状是什么）；
2. 已执行的即时动作（latest 已回指 x.y.z；坏版本已 deprecate）；
3. 用户侧选项（锁版本三选一配置，直接抄上文 jsonc）；
4. 修复进度（2.5.1 预计发布时间）与跟踪 issue 链接。

**防复发的 CI 闸**：发布后自检——publish 步骤之后追加"装刚发的版本并冒烟"：

```yaml
# release.yml 的 publish 步骤之后追加
      - name: post-publish smoke
        run: |
          cd "$(mktemp -d)"
          npm init -y >/dev/null
          npm install @react-ui/components@latest react@18 react-dom@18
          node -e "import('@react-ui/components').then(m => { if (!m.Button) { console.error('smoke fail'); process.exit(1); } console.log('smoke ok'); })"
```

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| unpublish 后部分用户仍装到坏包 | CDN 缓存未过期；公司镜像源同步延迟 | 接受现实：unpublish 只保证主库移除；镜像问题在事故通报里说明 |
| unpublish 报 not permitted | 超 72 小时或存在依赖者 | 走 deprecate + 修复版路线（本就是首选） |
| 想"覆盖"同版本号重发 | npm 不允许覆盖；unpublish 后同号重发也被 registry 拒绝（防投毒） | 版本只向前走：发 2.5.1 |
| dist-tag 移回后，公告里的安装命令拿到的版本"不对" | latest 的语义就是默认安装目标，回指正是目的 | 公告与文档一律写具体版本号，不写"装 latest" |
