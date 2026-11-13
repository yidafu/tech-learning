# esbuild / SWC 为什么快：手段、代价与选型决策树

> [返回：第八阶段导览](01-导览.md)
> 对应大纲第 5 条。esbuild 把"转译打包"从秒级拉到毫秒级，SWC 把 Babel 的语法搬到了 Rust——但"快"不是魔法，是**四条各有代价的工程决策**。本册把四条手段拆开算账（每条都能对应回你前七阶段写过的东西），看完 Oxc/rolldown 生态位，最后给一张选型决策树。转译基准在本机实跑（esbuild 0.21.5 vs @babel/core 7.29.13，Node 24，Apple M4 Pro），数字为真实运行结果；SWC 本机无环境，相关表述不标实测。

## 快的四个手段

### 手段一：原生语言（无 GC 压力的内存布局、无 JIT 预热）

esbuild 用 Go、SWC 用 Rust。性能差距的第一来源不是"编译型语言跑得快"这种笼统话，而是三件具体的事：

- **AST 节点的内存布局**。JS 的 AST 节点是堆上的对象（属性字典 + 指针），cache 不友好、分配回收都走 GC；原生实现的节点是**紧凑 struct**（esbuild 的 Go 实现按节点类型分桶、紧凑排列），顺序扫描吃满 cache line。这与 [GC 专题的 arena 讨论](../10-GC算法专题/05-免GC的内存管理.md)同源：一次性分配整块、编译完整块丢弃——根本不给"逐对象回收"的问题出现机会。
- **无 JIT 预热**。V8 要跑几万次才把热函数升到 TurboFan；构建工具的单次进程里很多代码只跑几遍，恰好全是解释执行。原生二进制第一天就是峰值速度。
- **字符串驻留（interning）**。标识符在词法层就去重成指针/整数 id，后续比较是指令级操作——你在[第二阶段手写 lexer](../02-第二阶段/03-手写lexer.md)用过的思路（关键字先查表再比较）的工业版。

### 手段二：并行（按文件天然切分）

转译的并行度是白送的：**每个文件的 parse → transform → emit 相互独立**（打包的链接阶段才需要汇合）。esbuild 用 Go 协程、SWC 用 rayon，把文件级并行吃满核。对照 tsc：类型检查有跨文件依赖（改 utils 的类型，main 的检查结果变），并行只能做到"检查内部分阶段"，这就是为什么增量 tsc 快、全量 tsc 慢——[上一册](05-TypeScript编译器架构.md)的受影响集实验解释的正是"为什么它不能随便并行"。

### 手段三：单遍设计（解析与转换合并）

Babel 是三段式（parse → traverse → generate），AST 建完、遍历改、再打印；esbuild 尽量**边解析边变换**（解析出的节点即刻按 target 降级），SWC 解析后单遍转换。少两轮全树遍历，省的不只是 CPU 时间，还有**第二轮时的缓存不命中**。看一段单遍降级的真实产物（esbuild 0.21.5 实跑，可选链 + 类私有字段，target es2019）：

```js
const v = obj?.a?.b ?? 10;      // →
const v = (_b = (_a = obj == null ? void 0 : obj.a) == null ? void 0 : _a.b) != null ? _b : 10;
class P { x = 1; #y = 2; ... }  // → __publicField / __privateAdd 运行时辅助函数（按需注入）
```

降级即解析的副产品清晰可见：helper（`__publicField` 一族）**按需注入到文件头**、嵌套表达式一次成形——没有"先建完 `?.` 节点再回头改写"的第二遍。代价在定制性：插件想看到"完整解析后的树"再决定改什么，单遍架构给不了完整的先看后改。esbuild 的插件 API 因此设计在**文件级钩子**（onResolve/onLoad），不暴露内部 AST。实测它的插件协议长什么样：

```js
const demoPlugin = {
  name: 'demo-virtual',
  setup(build) {
    build.onResolve({ filter: /^virtual:/ }, (args) => ({
      path: args.path.replace(/^virtual:/, ''), namespace: 'demo',    // 劫持模块解析
    }));
    build.onLoad({ filter: /.*/, namespace: 'demo' }, (args) => ({
      contents: `export const name = "${args.path}"; ...`,             // 返回"文件内容"，不是 AST
      loader: 'js',
    }));
  },
};
```

对比 [02 册](02-Babel深度剖析.md)的 Babel visitor：esbuild 插件操作的是"给引擎喂什么文件"，Babel 插件操作的是"树上的节点怎么改"——两种协议没有优劣，分别匹配两种架构（单遍文件级 vs 三段树级）。这是**架构性的取舍，不是 API 设计不努力**。

### 手段四：低内存 AST（指针紧排 + 尽量少的中间表示）

esbuild/SWC 的 AST 比同规模 Babel AST 小数倍：字段更少（很多 Babel 节点字段是为了 round-trip 保真——loc/extra/parenStart 这类"打印时还原源码风格"的信息，转译器可以不保真）、布局紧凑、没有 per-node 的 JS 对象头。这呼应 [GC 专题](../10-GC算法专题/05-免GC的内存管理.md)那句"oxc/esbuild 的 AST 快的一半答案"：**快的一半来自不产生需要管理的垃圾**。

### 四工具 × 四手段对照

| | esbuild | SWC | Babel | tsc |
|---|---|---|---|---|
| 原生语言 | Go | Rust | JS | JS |
| 文件级并行 | ✓（goroutine） | ✓（rayon） | ✗（单线程） | 部分（检查分阶段） |
| 单遍设计 | ✓（解析即变换） | 大体单遍 | ✗（三段式） | ✗（多轮遍历） |
| AST 形态 | 紧凑 struct | 紧凑 struct | JS 对象（保真字段多） | JS 对象（含类型节点） |
| 类型检查 | ✗ | ✗（standalone 检查器仍在建设） | ✗ | ✓（唯一的） |
| AST 定制 | 文件级插件（无 AST） | Rust/WASM 插件 | **JS visitor（最强）** | before/after 变换器 |

表格的读法：**没有一列全勾**。esbuild/SWC 赢前三行、输后两行；Babel 输性能、赢生态；tsc 输速度、独占检查。工具链选型（见文末决策树）本质是在这张表上按项目需求挑列。

## 代价：砍掉流水线的哪几段

快是用功能换的，砍掉的正是前几册花大篇幅建的东西：

- **不类型检查**（esbuild/SWC 的 TS 支持都是"擦类型"）。实测对照，同一个带类型错误的 .ts：

  ```text
  === esbuild transformSync（类型错误照样过）===
  const n = "not a number";        ← 类型擦了，错误一个不报
  function add(a, b) { return a + b; }
  export const r = add(n, 1);
  --> 无任何报错：esbuild 只擦类型不做检查

  === tsc --noEmit（同文件）===
  typecheck-demo.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.
  ```

  类型检查需要全程序类型图（[上一册](05-TypeScript编译器架构.md)的 Checker），与单遍按文件转译**在架构上不相容**——这不是"还没实现"，是路线选择。
- **语法支持取舍**。"砍掉流水线一段"的另一面：**降不动的语法直接报错，不做近似**。实测把 BigInt 降到 es2019：

  ```text
  esbuild 报错： Big integer literals are not available in the configured target environment ("es2019")
  ```

  Babel 面对同类问题会引入 polyfill/辅助函数路线（@babel/runtime 一族）；esbuild 的哲学是"不能保真就不做"——降级目标集合自己维护，新语法跟进快，历史包袱（legacy 装饰器等 Babel 生态语义）说不支持就不支持。选它之前先确认项目没有踩在这类需求上。
- **定制性弱于 Babel**。esbuild 插件拿不到 AST；SWC 有 Rust 层插件但要求写 Rust/WASM，生态与调试体验远不如 Babel 的 JS 插件（[02 册](02-Babel深度剖析.md)那套 visitor 协议的复用性正是 Babel 的护城河）。

## SWC 的位置：另一条原生路线

SWC 与 esbuild 手段同源（Rust、并行、单遍、紧凑 AST），差异在**出身与绑定的生态**：esbuild 是独立构建工具（转译+打包一体），SWC 定位"可嵌入的转译内核"——**Next.js 把它内建为默认编译器**（替代了此前的 Babel 管线，Jest 的 swc 变体、Parcel/Deno 也在用），所以多数人第一次吃到 SWC 的加速是在升级 Next.js 时"顺便"发生的。两处工程细节值得记：

- **SWC 的降级语义以 Babel 为对齐目标**（同样的提案转译、同样的 helper 形态），迁移成本因此低——"换引擎不换语义"是它能在存量项目里铺开的前提，对照 esbuild 的"不能保真就报错"哲学，两条路线的取舍取向不同。
- **插件层**：原生 Rust 插件（要写 Rust）或 WASM 插件（慢一个量级、能力受限）——所以"业务插件多"的项目仍留 在 Babel（决策树的第二问）。Next.js 的解法是把高频定制（styled-components、匿名化等）做成 SWC 内建开关，用配置换插件。

## 实测：esbuild vs Babel 转译同一文件

本机基准：同一份 102 KB 现代语法样本（类 + 私有字段 + async + 展开运算 + 模板字符串，重复 200 份），各转译 20 轮（目标 ≈ ES2017），`process.hrtime.bigint` 计时：

```text
样本: sample.js 102.2 KB，每工具转译 20 轮（含冷启动轮）

esbuild                 min/median/mean  7.9 / 8.5 / 12.7 ms     输出 141.3 KB
@babel/core(preset-env)  min/median/mean  132.8 / 147.4 / 166.2 ms   输出 182.1 KB
倍率（mean）: babel / esbuild ≈ 13.1x
esbuild 版本: 0.21.5 | @babel/core 版本: 7.29.13
Node: v24.10.0 | 芯片: Apple M4 Pro
```

13 倍（mean 口径；median 口径约 17 倍）。两个附注让数字更诚实：esbuild 的 `transformSync` 是 JS 到 Go 二进制的进程内调用，冷启动轮（12.7ms 里的 min-median 差）主要是协议建立；babel 的 preset-env 带着完整插件装配与 compat 数据查表。**输出体积差 29%（141 vs 182 KB）**是单遍降级 vs 插件链各改各的副产品——同一目标，产物并不等价，做体积对比时别只看速度。SWC 未在本机实测（需要 Rust 原生二进制，按环境约束不装），公开基准通常落在 esbuild 的 0.5~2 倍区间，**此处数字不作承诺**。

基准方法论三条（否则数字会骗你）：**同一目标语义**（target 都对齐 ES2017，且抽查产物语义等价——比如 async 两侧都降级成状态机了吗）；**多轮取 median 而非单轮**（冷启动、GC 抖动都污染单轮数据，看 min/median/mean 的离散度反而是信息）；**输入要"真实感"**（纯字面量文件会高估折叠类优化、纯函数体会低估 parser 差距——本基准样本混合类/私有字段/async/展开运算，就是为了让两类工作量都在场）。

## 生态一瞥：Oxc 与 rolldown

这两年的新变量，路线值得认一下：

- **Oxc**（Rust）：**分层复用的工具链套件**——每层独立可嵌入，上层按需拼装：

  | 组件 | 对标 | 说明 |
  |---|---|---|
  | oxc-parser | @babel/parser | Rust 实现，速度一个数量级 |
  | oxlint | ESLint | 并行规则引擎，规则兼容子集持续扩张 |
  | oxc-transformer | Babel/SWC 转译 | TS/JSX 降级 |
  | oxc-resolver | enhanced-resolve | 模块解析（webpack/Vite 系的依赖） |
  | oxc-minifier / sourcemap | terser / 字符串工具链 | 收尾段 |

  对标的是"重写整条工具链"，不只是单点换一个转译器。对照 [03 册](03-实践-mini-lint.md)：oxlint 的规则引擎结构与你写的 mini-lint 同构（遍历器/规则/诊断），差距全在工程完备度与性能层。
- **Rolldown**（Rust，Vite 的下一代打包内核）：Rollup 兼容的打包器 + esbuild 级速度 + 内置 Oxc 系转译。要理解它解决什么，先看 Vite 现状的双轨制：**dev 用 esbuild（快，模块级按需转译），build 用 Rollup（慢，但插件生态与产物优化成熟）**——两条流水线产物有微妙差异（chunk 划分、降级选择），双轨维护是历史包袱。Rolldown 的目标是 dev/build 同内核 + Rollup 插件兼容：**用 Rust 写引擎、用 JS 插件协议兼容存量生态**——这正是不重蹈"快但没人用"覆辙的关键。

生态的总体走向：**底层原生重写、插件层保持 JS 协议**——性能换在引擎，兼容性留在边界。还有一条旁线值得记：微软官方的 **TypeScript 原生移植（tsgo，Go 实现）**，目标直指"[上一册](05-TypeScript编译器架构.md)实测里占 68% 的 Checker"——类型检查这一段也要被原生重写。它验证了本册的账算对了：tsc 慢不是 JS 的错，是"惰性类型图推导"这个结构本身的成本，治它要么砍掉（esbuild 路线），要么原生重写（tsgo 路线）。

## 选型决策树

```
需要类型检查作为流水线的一环吗（CI 卡口 / monorepo 依赖图）？
 ├─ 是 → tsc 上链（--noEmit 或 project references）。
 │        转译/打包仍可另选（见下），但检查这一段只有 tsc 能做
 └─ 否 ↓
       需要深度 AST 定制吗（业务 Babel 插件 / macro / code-mod）？
        ├─ 是 → Babel（或 SWC 的 JS 互操作层，若生态允许）
        │        —— [02 册]的 visitor/scope/binding 协议、[04 册]的插件生态都在这
        └─ 否 ↓
              只是转译 + 打包（新项目 / 无特殊语法需求）？
               ├─ 是 → esbuild / SWC / Rolldown（按团队栈：Vite 系→esbuild/Rolldown，
               │        Next.js 系→SWC 已内建）
               └─ 混合场景 → 双轨：tsc --noEmit 管类型 + esbuild 管产物
                        （Next.js/Vite dev 的实际架构：快者转译、tsc 或 checker 独立跑）
```

三条决策依据的流水线事实：类型检查要全程序图（只有 tsc）；深度 AST 定制要开放的树协议（Babel 最成熟）；纯转译打包是"无跨文件语义"问题（谁快用谁）。**"要不要上 SWC"的正确答案形态**（对应[导览](01-导览.md)自测）：不是"因为快"，而是"我的流水线里类型检查与 AST 定制这两段是否有别人能接——有（tsc 独立跑、无业务插件），换快的；没有，留着 Babel"。

## 与 mini 项目的关系

mini 的优化 pass 都跑在"自产 AST/字节码"上，天然单遍可并行——你其实一直在用 esbuild 的架构假设（单文件独立编译）。本册给毕业项目的启示在工具层：给 mini 写 playground 时，转译内核选"独立组合 parser+traverse+generator"（[04 册](04-实践-Babel插件三选一.md)的做法）而不是拖 @babel/core 全家桶；要展示性能对比时，把本册的基准脚本改成 mini 字节码 vs wasm 后端（[Wasm 专题](../11-Wasm专题/05-工具链与性能真相.md)），就是现成的"两个后端的收益分析"。

## 自测

1. 四条手段各砍掉了哪个"经典编译器阶段/结构"？（提示：单遍对三段式、低内存 AST 对节点保真、并行对依赖图、原生语言对……）
2. esbuild 不做类型检查是"没实现"还是"不能"？用 [上一册](05-TypeScript编译器架构.md)的 Checker 惰性图推导解释架构不相容在哪。
3. 基准里输出体积差 29%，列两个可能的原因（提示：插件链改写风格、单遍降级路径选择）。
4. 为什么 Rolldown 刻意兼容 Rollup 插件 API？用一个"快但没人用"的反例场景说明兼容层的价值。
5. 你们团队的项目要上 Vite（dev 快）+ CI 里卡类型检查：画出这条流水线里 tsc、esbuild、Rollup/Rolldown 各自负责哪段。
6. SWC 声称"Babel 的 Rust 替代"，但你的项目里有三个自研 Babel 插件与一个 macro——迁移决策要检查哪几件事？
