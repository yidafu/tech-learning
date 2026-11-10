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
