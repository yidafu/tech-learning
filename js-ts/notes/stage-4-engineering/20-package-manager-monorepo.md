# 20 · 包管理：npm/pnpm、semver、workspace 与 monorepo

> 对应大纲：阶段 4 工程化 —— 包管理：npm/pnpm、workspace（monorepo）基础

## 学习目标

1. 手推 semver 三种约束（`^`/`~`/精确）的解析范围，含 `0.x` 特例；讲清 lockfile 解决什么问题、`npm install` 与 `npm ci` 的差异
2. 讲清 pnpm 的两个核心机制：content-addressable store + 硬链接省磁盘、symlink 版 `node_modules` 为什么天然防幽灵依赖
3. 理解 workspace（`workspaces` 字段、`workspace:` 协议、单锁单 node_modules）与 hoist 策略差异
4. 建立「个人项目 / npm 库 / 大型 monorepo」的选型判断

## 关键概念

### 1）semver：^ ~ 精确版本

一手依据：semver.org；npm 官方文档《About semantic versioning》《Dependencies》。

版本 `MAJOR.MINOR.PATCH`：不兼容变更 / 向后兼容的新功能 / 向后兼容的修复。声明依赖时的三种写法：

| 声明 | 解析范围（对 `1.2.3`） | 直觉 |
| --- | --- | --- |
| `^1.2.3` | `>=1.2.3 <2.0.0` | 「同一大版本内随便升」（MINOR/PATCH 可动） |
| `~1.2.3` | `>=1.2.3 <1.3.0` | 「只动 PATCH」 |
| `1.2.3` | `=1.2.3` | 完全锁定 |

**0.x 特例**（高频考点）：`0.y.z` 阶段 semver 视为「不稳定，MINOR 位就是不兼容变更位」，所以：

- `^0.2.3` → `>=0.2.3 <0.3.0`（不是 `<1.0.0`！）
- `^0.0.3` → `=0.0.3`（连 PATCH 都不能动）

### 2）lockfile：可复现安装

`package.json` 里的范围声明（`^1.2.3`）**不决定**你实际装到的版本——不同时间安装会解析到不同的 `1.x`。lockfile（`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`）把**整棵依赖树的解析结果**（每个包的精确版本 + 完整依赖图 + 完整性哈希）固化下来，保证「任何人任何时候安装都得到同一棵树」。三类文件互不通用（哈希结构与图模型不同），迁移工具链时要重新生成。

`npm install` vs `npm ci`（一手依据：npm 官方文档《npm ci》）：

| | `npm install` | `npm ci` |
| --- | --- | --- |
| 依据 | 范围声明，可更新依赖、**会改写 lockfile** | 严格按 lockfile 安装；lock 与 package.json 不一致直接报错 |
| 前置 | 增量 | 先删除整个 `node_modules` |
| 场景 | 本地开发 | CI/生产部署（可复现是硬要求） |

**peerDependencies 一句话**：声明「我需要宿主环境提供某个包的兼容版本」（插件型包的典型需求，如 React 组件库声明 `react: ^18`）；npm 7+ 默认自动安装 peer，版本冲突时报 `ERESOLVE` 错误——这是「用 pnpm/不同包管理器安装同一项目表现不同」的高发区。

### 3）pnpm 原理：store + 硬链接 + symlink 布局

一手依据：pnpm.io/zh/motivation（官方动机文档）与《关于 npm 幽灵依赖》讨论。

**npm 的问题**：npm v2 把每个依赖的依赖完整嵌套安装（同包多副本、路径深）；npm v3+ 改为**扁平化（hoist）**——把所有传递依赖尽量提升到根 `node_modules`。两种布局对照：

```
npm v2（嵌套）                     npm v3+（扁平化 hoist）
node_modules/                     node_modules/
  express/                          express/
    node_modules/                    cookie/      ← 传递依赖被提升到顶层
      cookie/                        send/
    node_modules/                    ...
      send/
```

扁平化解决了嵌套的磁盘/路径问题，却制造了两个新问题：

1. **幽灵依赖（phantom dependencies）**：你只声明了 `express`，但扁平化后 `express` 的传递依赖（如 `cookie`）也躺在顶层 `node_modules` 里，代码里 `require('cookie')` **能成功**——你的 package.json 里根本没有它。上游某天改依赖，你的构建原地爆炸
2. **磁盘浪费**：十个项目各装一份 React，十份拷贝（每个项目的 node_modules 都是独立实体）

**pnpm 的答案（三层结构）**：

```
~/.pnpm-store/            # ① content-addressable store：按「文件内容哈希」全局存一份
<project>/node_modules/
  .pnpm/                  # ② 每个包一个硬链接目录（指向 store，同盘零拷贝）
    react@18.3.1/node_modules/react/...
  express -> .pnpm/express@4.18.2/...   # ③ 顶层只放「直接依赖」的 symlink
```

- **content-addressable store**：以文件内容哈希为地址，内容相同的文件全局只存一份；项目安装时**硬链接**到 store（同分区零数据拷贝）——省磁盘、装得快
- **symlink 版 `node_modules`**：顶层**只暴露 package.json 里声明过的直接依赖**（符号链接进 `.pnpm`）；传递依赖藏在各包自己的 `.pnpm/<pkg>@<ver>/node_modules` 邻接结构里。`require('cookie')`（未声明）在顶层找不到 → **幽灵依赖在结构层面不可能发生**，而不是靠纪律
- 副作用：极少数依赖做「依赖路径假设」的老工具链可能不适应，可用 `shamefully-hoist=true` 退化成扁平布局（逃生舱，非默认）

**一次 `pnpm install` 的完整流程**（把上面三层串起来）：

```
① 解析依赖树（读 pnpm-lock.yaml，可复现）
② 对每个包的每个文件：算内容哈希 → store 里已有则跳过，没有则写入 ~/.pnpm-store
③ 在项目 node_modules/.pnpm/ 下为每个 包@版本 建「虚拟存储目录」，内部用硬链接指向 store
④ 按包各自的依赖关系，在 .pnpm 内部互相 symlink（邻接结构）
⑤ 顶层 node_modules 只放 package.json 直接依赖的 symlink（+ workspace 链接）
```

第 ② 步是「装得快 + 省磁盘」的全部来源：全局按内容去重 + 硬链接零拷贝。

### 4）workspace：monorepo 的包互通

一手依据：npm 官方文档《workspaces》、pnpm 官方文档《Workspaces》。

```
monorepo/
  package.json         # 根：{ "workspaces": ["packages/*"] }（pnpm 用 pnpm-workspace.yaml）
  pnpm-lock.yaml       # ① 单一 lockfile
  node_modules/        # ② 单一（pnpm 结构的）node_modules
  packages/
    ui/      # @acme/ui，依赖 @acme/utils
    utils/   # @acme/utils
    app/     # @acme/app，依赖 @acme/ui
```

- **`workspaces` 字段**：声明哪些目录是「工作区包」，包管理器把它们视为同一棵依赖树的一部分
- **`workspace:` 协议**：包内依赖写 `"@acme/utils": "workspace:*"`——直接链接到本地源码（改 utils，app 立即可见，无需发版）；**发布时自动替换为真实版本号**
- **单锁单 node_modules**：整个仓库一份 lockfile、一个 node_modules——升级一次全仓生效、CI 只装一次，这是 monorepo 相比多仓的最大工程红利
- **hoist 策略对比**：

| | npm/yarn（classic） | pnpm 默认 |
| --- | --- | --- |
| 传递依赖位置 | 提升到根，全扁平 | 藏在 `.pnpm`，仅直接依赖可见 |
| 幽灵依赖 | 普遍存在（靠 lint 工具如 `dependency-cruiser`/`check-dependencies` 兜底） | 结构性杜绝 |
| 逃生舱 | — | `shamefully-hoist` |

**workspace 日常命令**（以 pnpm 为例）：

```bash
pnpm install                          # 全仓安装（单锁单 node_modules，一次完成）
pnpm --filter @acme/app dev           # 只在 app 包里跑 dev 脚本
pnpm --filter @acme/ui... test        # 跑 ui 及「依赖它的所有包」的测试（拓扑感知）
pnpm --filter @acme/utils add zod     # 给 utils 这个包单独加依赖（写进它自己的 package.json）
```

`--filter` 的 `...` 后缀（「及其依赖方」）是 monorepo 增量操作的关键：改了 utils，只重新测/构建真正受影响的包——turbo/nx 的任务图缓存正是把这个模式工业化（输入哈希相同直接回放）。

**依赖版本强制覆盖一句话**：npm 的 `overrides` / pnpm 的 `pnpm.overrides`（yarn 的 `resolutions`）可以强制整棵依赖树里某个传递依赖的版本——处理「上游不修的安全漏洞」时的最后手段，属于应急手术而非常规操作。

### 5）任务编排与发包（一句话级）

- **turbo / nx**：monorepo 任务编排器。把 `build/test/lint` 建成**任务依赖图**，拓扑并行；核心卖点**远程缓存**——以「任务输入（源码+依赖+配置）的哈希」为键，任何机器/CI 命中过的任务直接回放产物，不再重复执行
- **changesets**：npm 库的版本与发布管理。每个 PR 附一个 changeset 文件（描述改动 + semver 级别），合并后由 CI 汇总成版本号 bump + 自动生成 CHANGELOG + 发包——「版本是流程的产出，不是拍脑袋」

### 6）选型建议表

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 个人小项目 / 学习 | npm 或 pnpm 皆可 | npm 零配置心智负担最小；pnpm 省磁盘且顺便杜绝幽灵依赖（值得养成习惯） |
| 发布到 npm 的库 | pnpm/npm + changesets；**必须提交 lockfile 与 CI `npm ci`** | 库的安装者是别人：lockfile 保证 CI 测的就是你发布的组合；changesets 管版本与 CHANGELOG；依赖声明要克制（少幽灵、少 peer 冲突） |
| 大型 monorepo | pnpm workspace + turbo（或 nx） | 单锁结构 + 天然防幽灵依赖 + 任务图与远程缓存；pnpm 的严格布局在多包规模下收益最大 |
| 接手遗留 npm 扁平项目 | 先 npm，迁移评估后再 pnpm | `shamefully-hoist` 作过渡；先跑 `pnpm import` 从 package-lock 生成 pnpm-lock |

## 可运行示例

本工作区刻意无 node_modules、无多包结构，可运行的是「semver 范围手推」验证：

```bash
# ① 用 Node 内置 semver 计算器式的验证（npx 拉取，无本地依赖）：
npx semver -r ">=1.2.3 <2.0.0" 1.9.9   # 输出 1.9.9（^1.2.3 范围内）
npx semver -r "^0.2.3" 0.3.0           # 无输出（0.3.0 不在 ^0.2.3 内——0.x 特例）
npx semver -r "~1.2.3" 1.3.0           # 无输出（~ 只允许 PATCH 位）

# ② 观察本工作区：package.json 声明的是 scripts 而非 dependencies——
#    所以一切工具走 npx 缓存，天然没有「幽灵依赖」的土壤（没有 node_modules 可钻）
```

> 说明：`npx semver` 首次运行需要网络下载，其余练习均不需要网络。相关机制（exports 双格式包的版本分发）见 `notes/stage-4-engineering/16-modules-esm-cjs.md` 的互操作一节——双格式包正是在本篇的「发布 npm 库」语境下才出现的需求。

配套练习（本主题专属 `exercises/package-manager/`）：

```bash
npx tsx exercises/package-manager/01-semver-range-engine.ts  # 手写 semver 范围引擎 + 13 例判定表（§1）
cd exercises/package-manager/mini-workspace && pnpm install   # 迷你 pnpm monorepo（纯本地链接、离线；仅首次需要）
node ../02-verify-monorepo.mjs                                # workspace 链接 / 幽灵依赖拦截 / lockfile 证据（§3/§4）
```

> `mini-workspace/` 是刻意隔离的教学沙盒：只含本地 workspace 链接，不引入任何外部依赖，可随时整目录删除重建。

## 易错点与面试高频

- **`^0.2.3` 的范围**：`<0.3.0` 不是 `<1.0.0`——0.x 的 MINOR 位承载不兼容变更（必考）
- **lockfile 不提交 / CI 用 install**：可复现性归零；`npm ci` 在 lock 与声明不一致时报错恰是想要的防线
- **「装得上」≠「声明过」**：npm 扁平化下 `import cookie` 成功不代表可以依赖它——幽灵依赖的定义与 pnpm 的结构解法是面试标准题
- **硬链接 vs 拷贝**：pnpm 省磁盘靠的是「同内容只存一份 store + 硬链接引用」，不是压缩
- **`workspace:*` 发布忘了替换**：现代包管理器自动替换为真实版本，但手写 `"file:` 或漏配工具链会导致发布物损坏——发包前 `npm pack` 检查产物
- **peerDependencies 冲突（ERESOLVE）**：多包 React 版本打架时的排障思路：统一 peer 版本 / `--legacy-peer-deps` 只能救急
- 高频面试题：「pnpm 和 npm 的区别」（store/硬链接/symlink 三层结构）；「lockfile 的作用与 install vs ci」；「workspace 协议如何工作」

## 输出预测题

### 题 1（semver 范围）

写出以下每个声明匹配的版本范围，并判断给定版本是否命中：

1. `^2.3.4` vs `2.9.9` / `3.0.0`
2. `~0.5.7` vs `0.5.9` / `0.6.0`
3. `^0.0.2` vs `0.0.3`
4. `^1.2.3-beta.4`（预发布）vs `1.2.3`

### 题 2（幽灵依赖机制）

项目只声明了 `express`。npm（扁平化）下 `require('cookie')` 成功，pnpm 默认布局下失败。分别从两种 `node_modules` 的目录结构解释原因；再说明 pnpm 下如果真的需要 `cookie` 应该怎么做。

## 预测题答案

### 题 1 答案

1. `^2.3.4` → `>=2.3.4 <3.0.0`：`2.9.9` **命中**；`3.0.0` 不命中（大版本禁止）
2. `~0.5.7` → `>=0.5.7 <0.6.0`：`0.5.9` **命中**；`0.6.0` 不命中（~ 只放行 PATCH 位；且注意这是 0.x，PATCH 升级也要求不破坏——范围边界在 0.6.0）
3. `^0.0.2` → `=0.0.2`：`0.0.3` **不命中**——`^` 对 `0.0.x` 退化成精确锁定（0.0.x 阶段连 PATCH 都视为不兼容）
4. `^1.2.3-beta.4` → `>=1.2.3-beta.4 <2.0.0`；对 `1.2.3`：**命中**（正式版 1.2.3 > 预发布 1.2.3-beta.4，semver 规定同版本号下 prerelease 优先级更低）

### 题 2 答案

npm 扁平化：express 的全部传递依赖被提升到根 `node_modules` 顶层，与直接依赖平铺在一起；Node 解析 `require('cookie')` 时沿 `node_modules` 向上查找，在顶层命中——**能 require 到，但你的 package.json 从未声明它**（幽灵依赖；express 换实现或调整依赖后悄然失效）。pnpm：顶层 `node_modules` 只有直接依赖的 symlink，`cookie` 位于 `node_modules/.pnpm/express@x.y.z/node_modules/` 这样的邻接目录——只有 express 自己解析得到，`app 代码向上查找`到不了那里，require 报 `MODULE_NOT_FOUND`。真正需要时：在 package.json 显式声明 `"cookie": "^x.y.z"` 再安装（pnpm 会为它在顶层创建链接）——幽灵依赖问题的正解永远是「把隐式依赖显式化」。

## 延伸阅读

- pnpm 官方《动机》文档（pnpm.io/zh/motivation）与《symlinked node_modules structure》
- npm 官方文档《npm ci》《workspaces》《About semantic versioning》
- semver.org 规范全文（0.x 与预发布优先级的一手定义）
- 《关于 npm 幽灵依赖》相关讨论（如 pnpm 博客与知乎专栏文章）
- turborepo 文档《Remote Caching》、changesets 文档（github.com/changesets/changesets）
- 呼应：`notes/stage-4-engineering/16-modules-esm-cjs.md`（exports 字段与双格式包）、`notes/stage-4-engineering/17-build-tools.md`（lockfile 变化触发 Vite 依赖预构建失效）
