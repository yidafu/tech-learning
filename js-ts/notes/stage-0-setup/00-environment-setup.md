---
sources:
  - stage-0-setup
---

# 00 · 环境准备

> 对应大纲：阶段 0（0.5 天）

## 学习目标

1. 搭好「直接运行 TS」的最小环境，绕过一切构建步骤
2. 明确本工作区的运行约定（怎么跑笔记里的示例、怎么跑测试）
3. 建立「自测清单」：找出自己以为懂但讲不清的知识点，作为后续学习的优先级

## 环境清单

| 项目 | 要求 | 检查命令 | 说明 |
| --- | --- | --- | --- |
| Node | ≥ 18 | `node --version` | 需要 18+ 才有原生 `fetch`、稳定的 ESM 行为 |
| tsx | npx 按需拉取 | `npx tsx --version` | 直接运行 `.ts` 文件，内部走 esbuild 转译（**不做类型检查**） |
| tsc | npx 按需拉取 | `npx tsc --version` | 只用于类型检查（`--noEmit`） |
| Vitest | npx 按需拉取 | `npx vitest --version` | 所有测试统一用它 |

本工作区**没有构建系统、没有 git、没有 node_modules**。工具全部通过 `npx` 按需执行（首次会下载并缓存，之后秒开）。

## 运行约定

```bash
# 运行一个练习（tsx 只转译不查类型，跑通 ≠ 类型对）
npx tsx exercises/<topic>/<file>.ts

# 单文件类型检查（尽量每次写完 TS 都过一遍）
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom <file>

# 跑全部 / 某目录的测试
npx vitest run
npx vitest run exercises/milestone/
```

### tsconfig 说明（根目录已配好）

- `strict: true`：全家桶（`noImplicitAny`、`strictNullChecks`、`strictFunctionTypes` 等），所有示例默认按此标准写
- `noEmit` + `moduleResolution: "Bundler"`：只为编辑器与类型检查服务，不产出 JS
- `types: []`：不引入任何环境类型；TS 练习文件只用纯语言特性 + `console`，需要 Node 专有 API 的演示一律写成 `.mjs` 用 `node` 运行
- `noUncheckedIndexedAccess` **没有**全局开启（它会改变索引访问的返回类型），在 `notes/stage-3-ts-types/15-tsconfig.md` 中专题讨论

## 目录约定

```
notes/stage-N-<topic>/ 学习笔记，按大纲阶段分子目录（stage-0 到 stage-5），
                      一主题一文件，文件名带序号前缀（00–31）
exercises/<topic>/    每个主题一个目录；文件顶部注释写明：大纲章节 / 主题 / 运行命令 / 预期输出
```

**预期输出必须先写、后验证**：先在注释里写出你预测的输出，再实际运行对照。这比「跑一遍看结果」的记忆效果好一个量级。

## 自测清单（阶段 0 产出）

方法：对着下面每一项，**不看资料**用一句话说清「是什么 + 为什么」。说不清的标记 ❌，它就是你在阶段 1–3 的优先学习点。

- [ ] `[] + {}` 和 `{} + []` 的结果分别是什么？为什么不一样？
- [ ] `typeof null` 为什么是 `"object"`？（历史包袱具体是什么？）
- [ ] `==` 的转换顺序能不能手推出来（比如 `[] == ![]` 为什么是 `true`）？
- [ ] `let` 的 TDZ 本质是什么？和提升矛盾吗？
- [ ] 闭包为什么会阻止垃圾回收？内存图长什么样？
- [ ] 箭头函数的 `this` 到底是怎么确定的？它能被 `call` 改变吗？
- [ ] `instanceof` 沿着什么链查找？跨 realm 为什么会失效？
- [ ] `async/await` 编译成什么样？`await` 后面的代码在哪个队列执行？
- [ ] `Promise.all` 和 `Promise.allSettled` 对拒绝的处理差别是什么？
- [ ] `Partial<T>` 的实现一行就能写完，为什么能写完？
- [ ] 什么是分布式条件类型？`type T = never extends X ? 1 : 0` 结果是什么？
- [ ] ESM 的 live binding 是什么？CJS 循环依赖时拿到的是什么？

> 建议把结果抄进自己的笔记或 issue 里。全部能讲清 → 直接跳到里程碑自测；一半以上讲不清 → 按大纲顺序推进。

## 下一步

进入 `notes/stage-1-js-core/01-types-and-coercion.md`（阶段 1.1）。

---

## 附录 A · 环境坑排查速查表

排查环境问题的三步纪律：**先最小化复现**——把报错场景缩成一个单文件脚本，排除项目结构的干扰；**只读第一行错误**——Node 输出的第一行才是结论，下面的调用栈先忽略；**二分注释**——脚本类报错注释掉一半代码看错误是否转移，两三次就能定位行。多数所谓「环境问题」其实不是环境问题，而是模块系统判定（CJS 还是 ESM）和工具职责（转译还是类型检查）没有分清。

| 现象 | 常见根因 | 处置 |
| --- | --- | --- |
| `node: command not found` | 未安装；或用版本管理器装完没重启 shell、初始化片段没写进 shell 配置 | 先 `command -v node` 确认 PATH；按安装器提示把初始化片段加进 shell 配置，新开终端验证 |
| `npx tsx` 每次都很慢、像在重新下载 | npx 缓存未命中，或走官方源网络慢 | 看附录 C 换镜像；或把工具固定为 devDependency 后用 scripts 调用 |
| `npm install` 卡住、超时、`ECONNRESET` | 本机到官方 registry 的网络不稳定 | 换镜像（附录 C）；公司内网查代理环境变量 `HTTPS_PROXY` 是否拦截 |
| `EACCES permission denied`（全局安装时） | 用了系统自带 Node，全局目录归 root，npm 想写没权限 | **不要 sudo**。换版本管理器把 Node 装进用户目录（附录 B），权限问题连根消失 |
| `SyntaxError: Cannot use import statement outside a module` | 文件被判定为 CommonJS，却写了 `import` | 改后缀 `.mjs`，或在最近一层 `package.json` 写 `"type": "module"`（实跑收据见附录 E） |
| `ReferenceError: require is not defined in ES module scope` | ESM 文件里用了 `require` | 改成 `import`，或改用 `await import(...)` 的动态导入形式 |
| `ERR_MODULE_NOT_FOUND` | ESM 相对导入漏写 `./` 或漏写扩展名（ESM 必须写全） | 补 `./` 与扩展名；裸 node 不认路径别名，别名需要打包器或解析配置支持 |
| `ERR_REQUIRE_ESM`（老版本 Node） | CommonJS 里 `require` 了一个 ESM 模块 | Node 22 起已支持 `require(esm)`，本仓库 v24 实测可用；老版本改 `await import(...)` |
| 跑通了但类型检查报错 | tsx 与原生 node 只转译不查类型，这是本册运行约定 | 属于设计如此：跑通只证明语法与运行时行为，类型对错必须 `npx tsc --noEmit` 验收 |
| `tsc` 报 `Cannot find name 'console'` | 当前 `lib` 组合里没有 console 的类型声明 | 本工作区命令固定带 `--lib es2022,dom`；自己裸跑 tsc 时记得补 lib（实跑收据见附录 E） |

## 附录 B · Node 版本管理决策表

为什么强调「不要裸装系统 Node」：系统级安装把可执行文件放进了需要管理员权限的目录，全局包安装也随之需要 sudo——这正是 `EACCES` 类报错的总根源。版本管理器把 Node 装进用户主目录，切换版本不动任何系统文件，全局包权限问题连根消失。

版本线怎么选：Node 偶数版本每年 10 月进入 LTS，维护期约 30 个月；学习和业务项目默认跟 LTS 线，写本册时 Node 22 与 24 均在 LTS 线内（本仓库实测 v24.10.0）；奇数 Current 线用于追新特性，不建议进团队项目。

| 决策维度 | nvm | fnm | Volta |
| --- | --- | --- | --- |
| 定位 | 老牌 shell 集成方案 | Rust 实现，主打快 | 按项目「钉死」整套工具链 |
| 切换方式 | `.nvmrc` 配合 `nvm use` | 读 `.node-version` 或 `.nvmrc`，进目录自动切 | 读 `package.json` 里的 volta 字段自动固定 |
| 速度感受 | 首次 shell 初始化偏慢 | 快 | 快 |
| 团队约定的落点 | 仓库根放 `.nvmrc` | 同左，另在 `package.json` 写 `engines` | `package.json` 写 `volta` 字段，版本随仓库走 |

配套约定建议：仓库根放一个 `.nvmrc`（内容就是版本号，例如 `24`），`package.json` 写 `engines.node` 做声明（默认只是提示，除非开启 `engine-strict` 才强制）。核心原则是**版本来源唯一**：`.nvmrc`、`engines`、CI 的 node-version 三处各写各的，迟早漂移——让 CI 配置去读同一份来源。

## 附录 C · npm 镜像与网络配置速查

```bash
npm config get registry                                 # 查当前源
npm config set registry https://registry.npmmirror.com  # 切国内镜像
npm config delete registry                              # 删配置，回到官方源
```

要点：

- 配置优先级：**项目内 `.npmrc` 大于用户级 `~/.npmrc` 大于全局配置**。想让团队共享镜像设置就提交项目内 `.npmrc`；纯个人习惯放用户级，避免污染别人的环境。
- `npx` 拉包走同一套 registry 配置，所以换镜像同时解决了 `npx tsx` 首次下载慢的问题（本册的工具全靠 npx，这一步收益直接）。
- 镜像与官方源存在同步延迟：刚发布的版本镜像可能暂时拉不到，报「版本不存在」先回官方源验证，CI 上建议回官方源或走公司私有代理。
- 缓存异常的处置阶梯：先 `npm cache verify`（温和校验清理），不行再 `npm cache clean --force`（激进清空）；删 `node_modules` 重装是最后的机械手段，别一上来就用。

## 附录 D · 运行工具链取舍：tsx / ts-node / vitest / 原生 node

本工作区选择「tsx 运行加 tsc 检查」两件套的理由，逐个说清：

- **tsx**：内部用 esbuild 把 TS 转译成 JS 再交给 node，启动是毫秒级；代价是**完全不做类型检查**，类型错误照样跑。它的定位是「跑示例」，不是「验类型」。
- **ts-node**：在 node 的模块加载链上挂 loader，做相对完整的 TS 编译，启动明显偏慢；ESM 场景的 loader 配置历史包袱多，教学场景不值当。
- **vitest**：测试场景专用，自带 esbuild 转译、断言库、watch 与并发执行。跑测试一律用它，不要再造轮子。
- **tsc --noEmit**：唯一可信的类型验收。它只报类型错、不执行代码，职责与上面三者正交。
- **原生 node 直接跑 TS**：Node 22.6 引入 type stripping（只剥掉类型标注，不转译、不检查），v24 已默认开启，`node xxx.ts` 可直接运行——本册有实跑收据（附录 E）。它和 tsx 一样**不查类型**，且不支持 enum、命名空间这类「需要生成额外代码」的旧语法，只适合纯类型标注风格的文件。可以当 tsx 的零依赖替代品，但验收纪律不变：类型对错必须过 tsc。

| 场景 | 用什么 | 一句话理由 |
| --- | --- | --- |
| 跑单个示例、冒烟验证 | `npx tsx`（或 v24 的 `node xxx.ts`） | 秒级反馈，先看行为 |
| 类型验收 | `npx tsc --noEmit --strict ...` | 唯一权威的类型结论 |
| 写测试、跑回归 | `npx vitest run` | 断言与 watch 开箱即用 |
| 演示 node 专有 API | 写 `.mjs`，`node` 直接跑 | 本工作区 `types: []`，node 类型不进 TS 环境 |

## 附录 E · 常见报错逐条处置（附实跑收据）

**实跑收据一**（Node v24.10.0）：`.cjs` 文件里写 `import` 语句：

```text
SyntaxError: Cannot use import statement outside a module
```

处置：该文件被强制按 CommonJS 解析。要么改后缀为 `.mjs`，要么在最近一层 `package.json` 写 `"type": "module"`。

**实跑收据二**（同版本）：ESM 导入一个不存在的文件：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/tmp/rec4/no-such-file.js'
  imported from /private/tmp/rec4/err-missing.js
```

处置：ESM 的相对导入必须以 `./` 开头且写全扩展名，缺任何一个都是这个错——它是「解析失败」，不是「文件内容错误」。（路径里的 `/private/tmp` 是 macOS 上 `/tmp` 的真实指向，属正常现象。）

**实跑收据三**（同版本）：CommonJS `require` 一个 `.mjs` 文件——在 Node 24 上**正常工作**，`require(esm)` 已受支持（实测打印出了导出值 `1`）。`ERR_REQUIRE_ESM` 是 Node 20 及更早版本的报错；维护老项目遇到它时，升级 Node 或把调用点改成 `await import(...)`。

**实跑收据四**（同版本）：对只含两行的 `.ts` 文件执行 `node hello.ts`，直接输出 `hello from ts`——v24 默认开启 type stripping，运行 TS 不需要任何第三方工具；但如附录 D 所述它不查类型，故意写 `const n: number = 'x'` 它照样跑。

**实跑收据五**（tsc 5.9.3，`--strict --noEmit --lib es2022`，不带 dom）：对一个只写了一行 `console.log` 的临时文件执行检查：

```text
error TS2584: Cannot find name 'console'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
```

处置：`console` 的类型声明来自 dom 库（或 `@types/node`）。本工作区的检查命令固定带 `--lib es2022,dom`，所以平时遇不到；自己在 `types: []` 的极简环境里裸跑 tsc 时，忘记补 lib 就是这个错。

## 附录 F · 高频坑展开：模块判定规则

附录 A 表格里第一类坑（import 报错一族）值得单独展开，因为它们全都源于同一套**模块格式判定规则**。node 决定一个文件按 CommonJS 还是 ESM 解析，优先级从高到低：

1. **后缀直接定死**：`.mjs` 永远是 ESM，`.cjs` 永远是 CommonJS，不看任何配置；
2. **最近一层 `package.json` 的 `type` 字段**：`"type": "module"` 让范围内的 `.js` 按 ESM，缺省或 `"commonjs"` 按 CommonJS；
3. **`.js` 且无 `type` 字段**：默认 CommonJS——这就是「我明明写了 import 却报 Cannot use import statement」的最常见入口；
4. **语法侦测兜底**：较新的 node 对无 `type` 字段的 `.js` 会先嗅探是否含 ESM 语法，含则按 ESM 解析——所以同一份代码在不同 node 版本报错行为可能不同，排查时先固定 node 版本。

由此得到一条稳定的自保策略：**不依赖默认值**。要么显式后缀（脚本用 `.mjs`），要么项目根 `package.json` 显式写 `"type": "module"`，让判定永远停在第 1 或第 2 层，不进兜底逻辑。

另一条展开是「tsx 跑通但 tsc 报错」。这不是任何一方的 bug：tsx 的管线是「esbuild 剥类型 → node 执行」，剥掉的类型根本不参与运行；tsc 的管线是「类型系统全量核对」。两个工具看的是同一个文件的两个侧面。约定因此是：**跑通是行为验收，tsc 是类型验收，两者独立、都过才算过**。反过来也一样——类型全对不代表运行时行为对（类型系统不校验逻辑），所以先写预期输出、再跑行为、最后过类型，三步缺一不可。

## 附录 G · 编辑器与工作流配置建议

编辑器里其实有三层工具在同时工作，职责分清能省掉大量「为什么这里标红那里不标」的困惑：

- **TS 语言服务**：VS Code 内置，读根目录 `tsconfig.json` 决定红线与补全。编辑器报错与命令行 tsc 报错应当同源；若两边不一致，先确认编辑器打开的工作区根目录就是含这份 tsconfig 的目录——多开根目录时语言服务可能拿错了配置文件。
- **格式化工具**（如 Prettier）：只管排版，不碰语义。把「保存时格式化」交给它，把「对不对」留给语言服务和 tsc，三层各司其职。
- **检查命令**：编辑器红线是即时提示，最终验收以命令行 `npx tsc --noEmit` 为准——CI 里跑的是命令行版本，编辑器只是它的预览。

最低摩擦的日常闭环是四步循环：**写示例 → tsx 跑 → 对照预期输出 → tsc 验收**。集成终端里用 shell 历史重复上一条检查命令，比切窗口快；把这条检查命令存进编辑器任务或 package.json scripts 里，就不用每次手敲长参数。

## 附录 H · 阶段 0 收尾自测（环境向）

语言向的自测清单在正文，这里补环境向的五问。每问都要求**能动手复现**，光说概念不算过：

- [ ] 不看资料说出模块格式判定的优先级（后缀 → `type` 字段 → 默认值 → 语法侦测），并徒手制造一次「Cannot use import statement outside a module」
- [ ] 解释为什么 tsx 跑通了 tsc 还能报错，两者结论冲突时信谁、流程怎么走
- [ ] 用版本管理器完成一次版本切换，说出 `.nvmrc` 放在哪、谁读它
- [ ] 查出当前 npm registry，完成「换镜像 → 验证 → 恢复官方源」一轮，说出配置优先级
- [ ] 复现附录 E 五条收据中的任意三条（尤其是 TS2584：裸 tsc、不带 dom、触发 console 报错）

全部打勾，环境就不再是你后续学习的变量；任何一条含糊，回到对应附录补齐再进阶段 1。

## 附录 I · npx 的执行语义与全局安装的取舍

本工作区所有工具都通过 `npx` 按需执行，它的实际行为值得说透：执行 `npx tsx` 时，先找当前项目的 `node_modules/.bin` 里有没有这个命令，有就直接用；没有则查 npm 缓存；缓存也没有才去 registry 下载到缓存后执行。所以「首次慢、之后秒开」是缓存命中的表现，而「每次都重新下载」几乎总是网络问题而不是 npx 的特性（回到附录 C 换镜像即可）。

全局安装（`npm install -g`）与 npx 的取舍标准：全局装一份工具后命令处处可用，但版本跟随全局环境，不同项目需要的版本不一致时会互相踩；npx 每个项目用各自的版本，代价是首次下载。**学习与多项目并行场景选 npx，固定的个人常用工具才考虑全局**。还有一条中间路径是装成 devDependency 后写进 scripts，让版本随仓库提交——团队项目里这是最可复现的一种，因为所有协作者拿到的都是同一份版本号。

最后是版本对齐问题：`npx tsx` 与 `npx tsc` 若不加版本约束，不同时间拉到的可能不是同一版本，行为细节会有漂移。严格的做法是写明版本（例如 `npx tsx@4` 这类带主版本号的调用），或干脆走 scripts 固定。教学环境对版本漂移不敏感，但养成「调用时心里知道用的是哪个版本」的习惯，将来排查「昨天还好好的」一类问题时会省很多时间。

## 附录 J · 把约定写进仓库：环境可复现的最后一环

环境问题的终极解法不是记住更多报错，而是让环境**由仓库文件描述**，让「我这里能跑」变成「任何人拉下来就能跑」。按投入产出排一个清单：

- `package.json` 的 `scripts`：把运行、类型检查、测试三条命令固化，协作者不需要读文档就能跑——命令只写一处，漂移为零；
- `engines` 字段：声明期望的 node 版本区间，装包时给出提示；
- 版本管理器配置文件（`.nvmrc` 等）：让切换工具读到的版本与声明一致；
- 镜像类个人配置放用户级 `~/.npmrc`，**不要**把国内镜像写进团队仓库——CI 环境通常在别处，强行统一反而制造网络问题；
- 本仓库的反向示范：刻意不设构建系统、不提交 `node_modules`，全部依赖 npx 按需执行。这是「约定最少化」的极端形态，适合纯学习仓库；业务项目应当在「最少约定」与「可复现构建」之间找平衡点，而不是照搬。

读到这里可以做一个收束：环境搭建的全部内容，归结起来就是三句话——**职责分清**（转译、类型检查、测试各用各的工具）、**来源唯一**（node 版本、registry、命令入口各只有一个事实来源）、**约定落盘**（一切口头约定变成仓库里的配置文件）。后续阶段的笔记默认这三条已成立。

## 附录 K · 求助提问模板：报错解决不了时先做完五步

自查五步走完还没解决、需要向同事或社区提问时，把下面五件事做在提问之前——它们既是礼貌，更是效率：多数问题在整理这五步的过程中自己就暴露了答案。

1. **固定版本信息**：贴出 `node --version`、`npm --version`（以及操作系统）。同一报错在不同 node 版本上结论可能完全相反（例如 `ERR_REQUIRE_ESM` 在新旧版本上的处置），没有版本信息的提问无法回答；
2. **贴完整报错**：从第一行错误到栈的最后一行，用代码块原样粘贴，不要只贴中间一句或者截图。报错的第一行是结论，栈的第一行是自己代码的入口，这两处最关键；
3. **给最小复现**：一个目录、两三个文件、一条命令能触发。把项目裁剪到最小复现的过程，本身就是二分排查，约一半问题在这一步自行消解；
4. **说清预期与实际的差异**：「我以为输出 1，实际报错」比「跑不了」包含的信息多一个量级；
5. **列出已试过的处置**：对照附录 A 的表格逐条试过哪些、哪些无效——排除项能帮回答者直接跳过已知分支。

最后补一条阅读报错的通用心法：node 与 tsc 的报错信息都是写给「照着改就能修」的人看的，先读**第一行的错误码或错误类别**（例如 `ERR_MODULE_NOT_FOUND`、`TS2584`），再读后面的补充说明。把错误码当作检索主键去查官方文档或 issue 区，命中率远高于把整段报错粘进搜索引擎。
