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
cd exercises/package-manager/pm-workspace && pnpm install   # 迷你 pnpm monorepo（纯本地链接、离线；仅首次需要）
node ../02-verify-monorepo.mjs                                # workspace 链接 / 幽灵依赖拦截 / lockfile 证据（§3/§4）
```

> `pm-workspace/` 是刻意隔离的教学沙盒：只含本地 workspace 链接，不引入任何外部依赖，可随时整目录删除重建。

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

## 深挖三节：包管理器的机制底账

### lockfile 里的信息结构：它锁的到底是什么

打开一份 `package-lock.json` 会看到三类关键信息，各回答一个不同的问题：

| lockfile 内容 | 回答的问题 | 对应的失败模式（缺失时） |
|---|---|---|
| 每个包的**解析后确切版本 + resolved URL + integrity 哈希** | "这次装的是哪一字节序列？" | 两台机器装出不同产物（可复现性归零） |
| `dependencies` 与 `devDependencies` 的**分层树** | "谁需要它、经由哪条依赖链？" | 只看 package.json 无法判断传递依赖的来源 |
| peer 冲突记录与 optional 标记 | "安装时做了哪些裁决？" | 换环境后重装出现"当时能装现在装不上" |

值得强调的一点：lockfile 锁的是**解析结果**而不是意图——`^1.2.3` 的意图永远写在 package.json，lockfile 记录的是"上次解析命中了 1.4.1"。两者各司其职：改版本范围动 package.json（语义），固化可复现组合动 lockfile（事实）。`npm ci` 的严格性正来自这对分工：声明与事实不一致时，宁可拒绝安装也不静默修正——CI 里要的防线就是这条。

### pnpm 的三层结构：symlink 之上还有什么

面试标准答案"store + 硬链接 + symlink"值得拆到逐层可见：

```text
~/.pnpm-store/v3/           ① 全局内容寻址存储（按文件哈希存内容，全机器一份）
  └─ files/xx/yy/<hash>…
node_modules/
  ├─ express  → .pnpm/express@4.18.2/node_modules/express   ② 顶层 symlink（只有直接依赖）
  └─ .pnpm/
      └─ express@4.18.2/node_modules/
          ├─ express   （硬链接 → ① store）                  ③ 硬链接（真实字节在 store）
          └─ cookie    （硬链接 → ① store）                  ③ 传递依赖在"自己的邻接目录"
```

三层的职责边界：①解决"磁盘上的字节只存一份"（省空间）；③解决"同一个包的多版本并存"（`.pnpm` 下按 `名字@版本` 隔离）；②解决"谁能看见谁"（幽灵依赖防线）。三个问题正交，缺一层就漏一类事故——只做①③没有②，就是"省了磁盘的 npm 扁平化"，幽灵依赖照样通行。**看清每层防的是什么，比背三层名词重要**。

### workspace 协议的三种写法与替换时机

`"a": "workspace:*"`、`"workspace:^"`、`"workspace:~"` 的差别在**发布时刻**的替换结果：

| 写法 | 发布时替换为 | 适用 |
|---|---|---|
| `workspace:*` | 精确版本 `1.2.3` | 锁死配套发布的包族（编译产物强耦合时） |
| `workspace:^` | `^1.2.3` | 语义化兼容的兄弟包（多数 monorepo 的默认选择） |
| `workspace:~` | `~1.2.3` | 只接受补丁联动的紧耦合包 |

未发布（本地开发）时三者都解析成 symlink 直连源码——差别只在 `pnpm publish`（或 changesets 流程）那一瞬。坑位也在这：用 `file:` 协议的旧写法**不会被替换**，发布出去的包指向一个不存在的相对路径——`npm pack` 检查产物时 `ls` 一下 tar 包里的 package.json 是唯一可靠的验收。

## Node 的解析算法：require 到底怎么找文件

幽灵依赖、顶层 symlink、`.pnpm` 邻接目录——这些概念的裁判是 Node 的模块解析算法。把算法走一遍（CJS 侧，ESM 的规则见 [16 册](16-modules-esm-cjs.md)）：

```text
require('cookie') 的查找序列（从当前文件目录开始）：
① dir/node_modules/cookie（目录：看 package.json main / index.js）
② dir/../node_modules/cookie …逐级向上
③ 每一级同时尝试 cookie.js / cookie/index.js 等形态
④ 直到根目录 node_modules 也没有 → MODULE_NOT_FOUND
```

三个推论直接从算法读出：

1. **"向上查找"是幽灵依赖的物理原理**——第②步让子包能"看到"祖先目录里的所有包，npm 扁平化把传递依赖抬到顶层后，这条祖先链就成了幽灵依赖的高速公路。pnpm 的邻接目录布局没有改变算法，改变的是**算法沿途能看见什么**；
2. **同名包的最近优先**——如果 `dir/node_modules/cookie` 与 `dir/../node_modules/cookie` 都存在，命中前者。这个"就近遮蔽"规则是 monorepo 里"为什么这个包用了旧版本"事故的第一嫌疑人；
3. **解析成本与目录深度成正比**——深层嵌套的文件每次 require 都要走很多级。 bundler 的 resolve 缓存（[17 册](17-build-tools.md)）与 pnpm 的扁平 symlink 层都在为这一条付工程解法。

**声明（package.json）与解析（Node 算法）是两套独立的事实系统**——package.json 说"我需要什么"，算法说"运行时真能找到什么"。幽灵依赖的本质是两套系统的脱节：解析能成功、声明不存在。pnpm 做的事只是把解析系统拉回声明系统旁边，让脱节立刻暴露。

### 版本选择与依赖仲裁：装的不是"最新"是"命中"

`pnpm install` 时面对 `^1.2.3` 的真实工作序列（定性描述）：

| 步 | 动作 | 关键规则 |
|---|---|---|
| 1 | 查 lockfile | 有记录 → 直接用记录的版本（可复现的来源） |
| 2 | 无记录 → 查 registry 的版本列表 | 只看**正式版 + 符合 prerelease 规则**的版本 |
| 3 | 在范围内挑最高版本 | `^1.2.3` → 1.x 里最高的；0.x 特例按题 1 的边界 |
| 4 | 写回 lockfile | 记录确切版本 + integrity 哈希 |

两个高频误读在这里现形：**"install 会自动升级"**——不会，lockfile 在就不动（升级是 `pnpm update` 的专职）；**"锁文件锁住后 registry 删版本也没事"**——对，integrity + resolved URL 让安装不再依赖 registry 的当前状态，这正是可复现性的字面意思。dist-tag（`latest`/`next`）只在无范围约束（如 `npm i foo`）时影响选择，有 `^` 范围后它是背景板。

### monorepo 任务编排：为什么还需要 turbo/nx

pnpm workspace 解决的是**依赖布局**，多包项目的另一半是**任务编排**——几十个包各自 `build`/`test`，按什么顺序跑、哪些能并行、哪些结果能复用：

| 能力 | pnpm 本体 | turbo/nx 补的 |
|---|---|---|
| 依赖关系图 | 有（workspace 协议构成拓扑） | 有（同源数据） |
| 拓扑序执行 | `pnpm -r --workspace-concurrency` 可并行 | 任务图 + 缓存感知调度 |
| 增量跳过 | 无（全量重跑） | 输入哈希不变 → 直接命中缓存跳过 |
| 远程缓存 | 无 | CI 与本地共享构建产物 |

判据一句话：**包少到"全量跑也就几分钟"就别上编排器**（多一层概念税）；包多到"改一个包要等全仓库重构建"再上，且先把 pnpm 的 workspace 协议梳理干净——编排器的缓存键完全建立在"依赖图 + 文件哈希"上，底层布局乱则缓存必失效。工具栈的正确叠法是逐层解决当层的问题：Node 解析 → pnpm 布局 → 编排器调度，跳层上工具是把别人的复杂度搬进自己的仓库。

## 延伸阅读

- pnpm 官方《动机》文档（pnpm.io/zh/motivation）与《symlinked node_modules structure》
- npm 官方文档《npm ci》《workspaces》《About semantic versioning》
- semver.org 规范全文（0.x 与预发布优先级的一手定义）
- 《关于 npm 幽灵依赖》相关讨论（如 pnpm 博客与知乎专栏文章）
- turborepo 文档《Remote Caching》、changesets 文档（github.com/changesets/changesets）
- 呼应：`notes/stage-4-engineering/16-modules-esm-cjs.md`（exports 字段与双格式包）、`notes/stage-4-engineering/17-build-tools.md`（lockfile 变化触发 Vite 依赖预构建失效）

---

## 机制增补：lockfile 逐字段解析与 diff 的语义

前文「深挖三节」给了 lockfile 的信息结构总览，这里下沉到逐字段——以本工作区真实存在的 lockfile 为实物。收据：node v24.10 读取本仓 `js-ts/package-lock.json` 与 `js-ts/docs-site/package-lock.json` 实测，以下数字均为实读结果。

- **顶层四键**：`lockfileVersion`（值 3，v3 是当前主流形态）、`name`（工程名）、`packages`（核心区）、`requires`（v1 时代的遗留键，v3 里已无实际作用——读 lockfile 时忽略它）。
- **`packages` 是一张「路径 → 条目」映射**：键是 `node_modules/...` 形式的**安装路径**，另有一个空字符串键代表根工程（实测根条目带 `name` 与 `devDependencies`）。条目核心字段五件套：
  - `version`：解析后的精确版本（实测 typescript 5.9.3、@types/node 26.6.6）；
  - `resolved`：下载 URL（registry 快照地址）；
  - `integrity`：子资源完整性哈希（实测 `sha512-` 前缀）——「装到的字节」与「解析时看到的字节」逐位对账的依据；
  - `dev`：是否仅开发依赖（实测 @types/node 与它的依赖 undici-types 全部 `dev: true`——dev 标记沿依赖树传播，生产安装据此裁剪）；
  - `dependencies`：条目自身的依赖（如有）。
- **同名多版本不需要任何特殊标记**：键名即路径，两个版本天然是两个键。收据（实测 docs-site 的 lockfile）：1542 个条目中 119 个包名存在多版本，例如 `@algolia/autocomplete-shared` 同时以 1.19.12（顶层）与 1.19.2（`node_modules/@docsearch/react/node_modules/...` 路径下）两个键存在——这是 Node「就近解析」在 lockfile 层的固化形态，也给出「同一个包为什么有两份」这类问题的查法：搜包名、数键、看路径。
- **pnpm-lock.yaml 的双区结构**（文档依据手推，pnpm 官方对 lockfile 格式的说明）：`importers:` 区按 workspace 包逐个记录直接依赖的**范围声明**（谁要什么），`packages:` 区按「包名@版本（可选 peer 后缀）」记录解析结果与 integrity（装的是什么）。对照 npm v3 的单区映射，差异本质是 pnpm 把**声明层也进了锁**——workspace 包多、声明分散时，一份锁文件即可还原每个包各自要什么。

**lockfile diff 的四类语义**（review 依赖变更时逐行在读什么）：

| diff 行 | 语义 | 附加动作 |
|---|---|---|
| specifier（声明范围）变化 | 有人改了 package.json | 核对声明改动是否合理、意图是否成对出现 |
| resolved/version 变化、键不变 | 范围内重解析（重装或更新触发） | 确认是有意升级还是意外松动 |
| 新增一整棵条目树 | 引入了新依赖 | 回到声明侧看谁引入、为何需要 |
| integrity 变化、其余不变 | 上游重发了同版本 dist（少见） | 安全审查点：确认发布方公告再放行 |

理解 diff 语义的直接收益在合并冲突现场：能判断「这行冲突属于哪一类」，而不是逐行盲选一边。

---

## 决策速查表：包管理器与 monorepo 工具

包管理器选型（对正文选型建议表的机制细化）：

| 维度 | npm | pnpm | yarn classic（1.x） | yarn berry（2 以上） |
|---|---|---|---|---|
| 依赖布局 | 扁平 hoist | symlink 加 `.pnpm` 邻接 | 扁平 hoist | PnP（默认无 node_modules） |
| 幽灵依赖 | 普遍存在 | 结构性杜绝 | 普遍存在 | 杜绝（无 node_modules 可钻） |
| 磁盘与安装速度 | 一般 | store + 硬链接，最优 | 一般 | zip 模式快，兼容层有成本 |
| 工具链兼容 | 最好 | 极少数「依赖路径假设」的工具需逃生舱 | 好 | 需要编辑器与 CI 适配（PnP 门槛） |
| 适用判据 | 小项目、零心智负担 | 默认推荐：单仓与 monorepo 通吃 | 存量项目维护 | 有专人管工具链的团队 |

判据一句话：**新项目默认 pnpm，除非明确付不起 symlink 的边角成本；yarn berry 是「有专人负责工具链」团队的选项，不是团队默认**。

monorepo 编排工具（与正文「为什么还需要 turbo/nx」互补的信号表）：

| 信号 | 选择 |
|---|---|
| 包少于约 5 个、全量构建几分钟内 | 不上编排器（概念税大于收益） |
| 包多、CI 时长主要耗在重复构建 | turbo（约定优于配置，接 pnpm workspace 顺滑） |
| 需要代码生成、分布式任务、精细依赖图策略 | nx（插件生态与任务图能力更强，配置面更大） |
| 多语言、非 Node 包共存 | 先声明边界：已超出本册范围，评估 bazel 级方案 |

---

## 工程三陷阱（依赖管理）

1. **lockfile 合并冲突手乱解**。冲突时手动「两边都保留」或随手 checkout 一方，产出的锁文件「既不代表任何一方的意图、也不对应任何真实解析」——声明区与 packages 区脱节、resolved 与 integrity 错位。CI 的 `npm ci` 当场报错算轻的，重则静默装出一份没人见过的组合。正解：**冲突不留手解，整文件重新生成**——以合并后的 package.json 为准重跑安装（npm 有 `--package-lock-only` 模式，不动 node_modules 只重算锁；pnpm 直接 `pnpm install`），把生成结果整体提交；review 看的是「重新生成的 diff 是否只包含两个分支声明的并集」。
2. **monorepo 根目录 add 运行时依赖**。`pnpm add xxx` 不带 `--filter` 就落在根 package.json。开发工具（typescript、eslint、turbo）放根没问题，但**运行时依赖放根是幽灵依赖的 monorepo 变体**：各包代码沿 node_modules 向上解析，能 require 到根里的包，而包自己的 package.json 从未声明；单包 pack 发布后消费者装不上，线上 MODULE_NOT_FOUND。判据：**运行时依赖必须进「用它」的那个包**，根目录只留跨包开发工具。
3. **peer 依赖写成 dependencies**。React 组件库把 `react` 放进自己的 `dependencies`——安装者项目里本来有 React，又给库装了一份它的 React，同一应用两个 React 实例并存：hooks 报「Invalid hook call」、状态互不相通，而且报错点在业务代码、根因却在库的依赖声明。判据：**宿主环境必然提供的包写 `peerDependencies`**（组件库对 React、路由封装对 react-router），并且 peer 范围要克制——声明兼容 `^18` 就别用 19 才有的 API。库作者发包前解包 `npm pack` 产物：依赖分区是验收点之一。

---

## 排查速查表：安装与运行现象 → 根因 → 动作

| 现象 | 最可能根因 | 动作 |
|---|---|---|
| 本地能跑，CI 或同事机器 MODULE_NOT_FOUND | 幽灵依赖：能 require 到是因为 hoist，不是声明 | 补 package.json 声明；上依赖 lint 防复发 |
| `npm ci` 报 lock 与 package.json 不一致 | 改了声明、锁没重生成 | 重跑安装重生成锁，整体提交 |
| 本地与 CI 装出的版本不同 | CI 误用 install（顺手更新了锁）或锁没入库 | CI 强制 ci；锁文件必须提交 |
| 明明装了还是找不到 | 同名包就近遮蔽（嵌套 node_modules 里的旧版挡路） | 删 node_modules 重装；查锁里该包有几个键、各在什么路径 |
| ERESOLVE：peer 冲突装不上 | 宿主包与插件声明的 peer 范围打架 | 升级统一版本；应急用 overrides 钉版本 |
| node_modules 磁盘异常巨大 | 跨分区安装使硬链接退化为拷贝 | store 与项目放同一分区，`pnpm store path` 核对 |
| docker 镜像或网盘里 symlink 失效 | COPY 或同步工具不支持符号链接 | 支持链接的复制方式，或临时 hoisted 布局 |
| 切 pnpm 后「隐式能用的包」全断 | 幽灵依赖被结构性杜绝始于切换 | 逐个补声明——这是切换的收益，不是事故 |

分诊三步：现象先分「装不上（解析期）」还是「装上了跑不起来（运行期）」；装不上再看报错出自依赖仲裁（ERESOLVE 走 peer 通道）还是文件解析（MODULE_NOT_FOUND 走 Node 解析算法）；跑不起来再分本地与 CI 的差异（锁与安装方式）还是本地之间的差异（遮蔽与幽灵）。三步走完，多数依赖事故能定位到四套事实系统（声明、解析、安装、发布）中的哪一套。

---

## Code review 检查单（依赖变更）

依赖相关 PR 按此单过，每条可机械执行：

- package.json 与 lockfile 必须在同一 PR 内变更（只改声明不带锁，等于让别人 CI 挂）；
- lockfile diff 按四类语义逐类过目：specifier 变化对应声明意图；resolved 变化确认是有意升级；integrity 变化必须有公告依据；
- 新增依赖三问：有没有更轻的现成方案？维护度如何（最近发布时间、open issues 走势）？体积与传递依赖数量多少？
- workspace 内部依赖用 `workspace:` 协议，禁止 `file:`（发布不替换，产物必坏）；
- peer 声明克制：宿主必然提供的才进 peerDependencies，范围与实际用到的 API 匹配；
- overrides 与 resolutions 必须附注释：为什么覆盖、上游修复后何时拆除——应急手术要有拆线计划；
- 版本与发布类改动必须随 changeset 文件（版本是流程的产出，不是拍脑袋）；
- 发库类改动跑 `npm pack` 检查产物：依赖分区、files 白名单、协议替换逐一确认；
- 依赖 lint（dependency-cruiser 一类）在 CI 保持绿：幽灵依赖新增即拦截。

清单的底层逻辑是本册机制的逆向应用：每一条检查都在把「声明、解析、安装、发布」四套事实系统的脱节点提前到 review 阶段暴露——与其在 CI 或线上撞上，不如在 diff 上对齐。

---

## 机制增补二：changesets 发布流程逐步走

正文用一句话带过了 changesets，这里把一次完整发布按时间轴走通——monorepo 发包的坑大多长在流程的衔接处，逐段看清才能排障。

第一步，开发者在 PR 里附 changeset 文件：`npx changeset` 交互式生成，产物是一个 markdown 文件，frontmatter 写「哪些包、什么级别」，正文写给人看的变更说明：

```yaml
---
"@acme/ui": minor
"@acme/app": patch
---
Button 补充暗色主题对比度与 focus 态样式。
```

级别就是 semver 三位（major/minor/patch），正文是 CHANGELOG 的素材。文件随 PR 提交——**代码改动与版本意图在同一 PR 里评审**，这是流程的第一道闸：评审者看到的不是「有人要发版」，而是「这次改动声称自己破坏了什么、新增了什么」。

第二步，PR 合并后，CI 里的 changesets 机器人（Version Job）消费所有积累的 changeset：把「多包级别」翻译成版本号 bump、重写各包 CHANGELOG，随后处理**互为依赖的兄弟包联动**——ui 升了 minor，依赖它的 app 的依赖声明按所选协议写法更新指向新版本。机器人开出一个「Version PR」，内容就是全部版本号与 CHANGELOG 的变更。人类 review 这个 PR 等于 review「这次发布到底发了什么」——发布内容本身成了可评审对象。

第三步，合并 Version PR 后 CI 的 Publish Job 执行发布：构建、逐包 `npm publish`、打 git tag。`workspace:*` 在 publish 时刻被替换成真实版本号（正文深挖三节已展开三种协议写法的替换差异）——「发布时自动替换」的机制位置就在这一步；替换前的产物可用 `npm pack` 预检。

两个进阶配置一句话带过：**fixed 版本组**——组内包版本号强制一致，适合强耦合包族（一个成员发版全组齐升）；**prerelease 模式**——进入 RC 通道，版本按 prerelease 规则递增，适合「发而不放」的灰度节奏。

判据收尾：为什么不手改版本号？手改绕过了流程的三个产物——CHANGELOG 缺素材、多包联动退化成人脑对表、发布时机不可审计。changesets 的本质是把**版本号变成版本控制之下可评审、可回滚的流程产物**；monorepo 的包越多，这条越接近刚需，而不是流程洁癖。排障时也按这三段定位：版本没动查 changeset 文件是否随 PR 入库，Version PR 没开查机器人配置与令牌权限，publish 失败查 registry 令牌与 workspace 协议替换产物。

---

## 手推配方：pnpm install 之后磁盘上有什么——按路径逐步推演

给定最小 monorepo：`packages/web` 依赖 `packages/ui`（workspace 协议）与外部包 `lodash`；`packages/ui` 也依赖 `lodash`。根 package.json 只声明开发工具。跑完 `pnpm install`，磁盘形态可逐条推出（依据：正文的三层结构与 workspace 文档，手推口径）：

```text
<root>/node_modules/
  .pnpm/                          ① 全部外部包的「包@版本」虚拟目录
    lodash@4.17.21/node_modules/lodash/   （内容硬链接 → 全局 store）
  .bin/                           ② 全仓开发工具的可执行链接
  （没有 lodash——根没声明它）
<root>/packages/web/node_modules/
  lodash   → ① 的 symlink        ③ web 的直接外部依赖
  @acme/ui → ../../ui            ④ workspace 协议链接：直连源码目录
<root>/packages/ui/node_modules/
  lodash   → ① 的 symlink        ⑤ ui 的直接外部依赖，与 ③ 同一虚拟目录
```

六条推论直接从这张图读出：

1. **一份字节、多个视口**：lodash 的真实字节只在 store 一份，`.pnpm` 里一个虚拟目录，web 与 ui 各持一个 symlink 入口——「省磁盘」与「各包依赖隔离」同时成立的原因就在这里；
2. **workspace 链接进的是「依赖方」的 node_modules**（④），不是根 node_modules——这与 npm workspaces 把 workspace 包提升到根的做法不同，查「为什么 app 找不到 ui」时先看依赖方的 node_modules；
3. **根代码 require lodash 会失败**（根没有声明）——monorepo 级幽灵依赖的拦截点；
4. **web 里的 ui 源码改动立即可见**（④ 直连源码目录，无构建同步环节）；
5. **删 node_modules 重装不重复下载**（store 还在，硬链接重建是本地操作）——CI 缓存策略可利用这一点缓存 store 而不是缓存整个 node_modules；
6. **升级 lodash 只动 `.pnpm` 与各 symlink**——版本仲裁与磁盘布局解耦，lockfile 的 diff 只体现声明与解析变化。

这份推演是排查的底图：任何「链接在哪、字节在哪、谁能看见谁」的疑问，先在这张图上定位，再用 `ls`（列目录）验证——目录树是机制的可视化投影，机制背熟了，目录树不用背。

---

## 进阶输出预测题

### 题 3（lockfile diff 推事故）

对照机制增补的四类 diff 语义，判断以下三段 diff「发生了什么」，并给出 review 的追问点：

- 段 A：packages 区新增 `node_modules/left-pad` 条目（无子依赖），package.json 的 dependencies 多了 `"left-pad": "^1.3.0"`；
- 段 B：`node_modules/typescript` 的 version 从 5.9.3 变为 5.9.4、resolved 相应更新，package.json 未动；
- 段 C：`node_modules/somepkg` 仅 integrity 字段变化，version 与 resolved 均不变。

### 题 4（0.x 的发布联动）

monorepo 里 `@acme/utils` 当前版本 0.3.0，`@acme/app` 用 `"@acme/utils": "workspace:*"` 声明依赖。changeset 给 utils 标了 major，发布后：

1. utils 的版本变成什么？app 的声明在发布时被替换成什么？
2. monorepo 之外的外部消费者声明 `"@acme/utils": "^0.3.0"`，能否装到新版本？为什么？（答案见文末）

---

## 进阶预测题答案

### 题 3

段 A：新增依赖的正常形态——声明行与条目树**成对出现**，diff 自洽；追问点只剩「为什么需要它」与体积评估（检查单三问），没有机制疑点。

段 B：范围内重解析——声明未动而 version 变了，说明有人跑了更新类命令触发了范围重解析；patch 位升级（5.9.3 到 5.9.4）在 `^5.9.3` 范围内合法。追问点：这是有意的升级吗？若是有意，配套的 changeset/测试在哪里；若是误触发（比如本地误跑更新提交了锁），恢复锁文件即可——**声明未动而锁动了，永远是 review 的必问项**。

段 C：同版本重发 dist——version 与 resolved 都没动、只有 integrity 变，这是「上游用同一个版本号重新发布了包」的特征签名。这是安全敏感场景：可能是一次正常的修复性重发，也可能是供应链事故的前兆。处置：核实发布方公告与官方渠道后才能放行，不能当作普通变更合并；已装环境可对照新旧哈希确认实际字节。

### 题 4

1. 按 semver.org 规范手推：major 位直接进一，0.3.0 的下一个 major 是 **1.0.0**（0.x 转 1.0 没有特殊规则；changesets 工具的具体行为以其文档为准，级别语义与 semver 对齐）。app 的声明在发布时 `workspace:*` 替换为 **`"@acme/utils": "1.0.0"`**（精确版本——`workspace:*` 的替换结果）。
2. **不能**。外部消费者声明的 `^0.3.0` 按 0.x 特例解析为 `>=0.3.0 <0.4.0`（0.x 阶段 MINOR 位承载不兼容变更），1.0.0 不在范围内——这正是正文反复强调的 0.x 特例在发布链路上的后果：内部包族用 workspace 协议全速联动，外部消费者却被 0.x 范围锁死在 0.3.x。**发包前尽快把 0.x 毕业到 1.x** 是库作者的常规责任：0.x 的「MINOR 即破坏」语义只适合开发期，长期停在 0.x 等于把每次功能发布都变成外部消费者的破坏性升级。
