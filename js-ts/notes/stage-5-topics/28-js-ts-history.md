---
mdx:
  format: mdx
references:
  - 16-modules-esm-cjs
  - 03-this-and-prototype
  - 07-v8-engine
  - 23-reactivity-source-reading
  - 26-compiler-perspective
  - 13-ts-type-theory
  - 00-environment-setup
  - 04-async-programming
  - 01-types-and-coercion
---
# 28 · JS/TS 发展史：今天的每一个「怪」，都是当年的一次合理决定

> 对应大纲：阶段 5 补充专题（新增）。
> 一手依据（历史章节的一手史料，不是二手年表）：[Ecma International 的 ECMA-262 页面](https://ecma-international.org/publications-and-standards/standards/ecma-262/)（每一版 PDF 公开，第 17 版 = ES2026，2026-06 发布）；[tc39/proposals README](https://github.com/tc39/proposals) 的 stage 表与 [TC39 流程文档](https://tc39.es/process-document/)；[TypeScript 官方 release notes](https://devblogs.microsoft.com/typescript/) 与 [TypeScript Design Goals wiki](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals)；Brendan Eich 的回顾演讲与博客（"Popularity at 10" 等）；Anders Hejlsberg 2012 //build/ 首次公开 TypeScript 的演讲；Ryan Dahl JSConf EU 2009（Node 发布）与 2018《10 Things I Regret About Node.js》；Herb Sutter《The Free Lunch Is Over》（2005，频率墙与多核）；Dan Kegel 的 C10K（1999）；Project Zero 的 Spectre 博文（2018-01）；Siek & Taha 渐进类型论文（2006）；esbuild《Why is esbuild fast?》（2020）。

## 学习目标

1. **不背年表，做决策考古**：把历史当「决策记录」读——今天语言里每个反直觉行为，都能对应到当年的具体约束。背得出「ES6 是 2015 年」没有用；能讲清「为什么 ES6 之前要靠 Babel、为什么 strict mode 是 opt-in、为什么 TS 必须可擦除」才算懂。
2. 能用 TC39 stage 0–4 流程解释「某个特性为什么等了 N 年才进规范」（而不是「浏览器厂商慢」）。
3. 能用 TS 的三个设计决策（**可擦除、结构化、渐进**）解释阶段 3 学过的类型系统为什么长这样。
4. 建立「版本事实去一手来源核对」的习惯：网络年表错漏极多（尤其 ES4 时间线、Node ESM 时间线），本工作区的固定做法是回源。
5. 能把 JS/TS 的关键选择落到**硬件时间线**上：单核 → 频率墙 → 多核、IEEE 754、内存墙、Spectre——并学会区分「设计缺陷」和「地形限制」。
6. 能把 JS/TS 放进**语言潮流坐标**：GC 主流化、动态 → 静态的钟摆（渐进类型理论）、JIT → AOT 复兴；并能用反例（Dart、ES4）论证 TS 为什么「只能」长成现在这样。

---

## 关键概念

### 0. 六条主线总表（速览用，不要求背）

| 主线 | 关键节点 |
| --- | --- |
| 语言 | Mocha(1995) → ES1–3(1997–1999) → **ES4 失败**(1999–2008) → ES5(2009) → ES2015 大爆炸 → 年度小版本（ES2016…ES2026 = 第 17 版） |
| 标准化 | Netscape/Sun 双头(1995) → ECMA-262 / TC39(1997) → 2008 哈莫尼协议 → TC39 stage 流程(2014) |
| 运行时 | 浏览器专属 → V8(2008) → Node(2009) + npm(2010) → Wasm MVP(2017) → Deno(2020)/Bun(2022) |
| 模块 | `<script>` 拼接 → CJS / AMD / UMD 战争(2009–) → ESM 入规范(2015) → Node 稳定支持(2020)（详见笔记 16） |
| 编译到 JS | CoffeeScript(2009) 倒逼 ES6 → Babel(2014) 让 ES6 提前可用 → 这条管线为 TS 铺路 |
| 类型 | 无类型十年 → ES4 的类型注解胎死腹中 → TS(2012) vs Flow(2014) → TS 全胜 |

---

### 1. 1995：十天的 Mocha——四个约束决定一切

1995 年 5 月，Netscape 的 Brendan Eich 用约 10 天写出 Mocha 原型；9 月随 Navigator 2.0 beta 以 **LiveScript** 之名发布；12 月改名 **JavaScript**——纯粹是搭 Sun 公司 Java 的营销便车（两家共同持有商标，今天归 Oracle）。**「十天」不是趣闻，是这套语言的解释框架**：后面所有约束都在这十天里定型。

| 约束 | 当年的理由 | 留下的遗物（今天仍可运行） |
| --- | --- | --- |
| 语法要「长得像 Java」 | 市场部门要求，借 Java 热度 | C 风格大括号、`this`、`new`、`Date` 构造函数的样子 |
| 内核抄 Self + Scheme | Eich 自己的技术品味：原型委托（Self）、一等函数与闭包（Scheme） | 原型链（笔记 03）、函数是一等公民（阶段 1.2） |
| 只有十天，能抄就抄 | 没时间设计 | **`Date` 月份 0 基**：抄的是 JDK 1.0 的 `java.util.Date`——Java 自己在 JDK 1.1（1997）就废弃修复了，JS 永远改不动（练习第 2 节） |
| 值用 32 位 tag 表示 | 性能 | **`typeof null === "object"`**：object 的 tag 是 `000`，null 是空指针、低三位全 0 → 被归成 object；修复会破坏全网网页，永久保留（练习第 1 节） |
| 浏览器宿主，渐进增强 | 老浏览器不认 `<script>` 时，脚本要被 HTML 注释藏起来 | **HTML 型注释 `<!--`** 至今在非模块脚本里合法（ECMA-262 Annex B.1.3，练习第 6 节） |

另一个同年代遗物：**`void 0` 成语**。ES3 规范里全局 `undefined` 的属性特性是 `{ DontEnum, DontDelete }`——**没有 DontWrite，可写**。jQuery 时代的标准防御是参数阴影：`(function (undefined) { ... })()`。ES5 才把全局 `undefined` 改为不可写，但参数阴影至今合法（练习第 3 节）。

> 关键认知：**Web 兼容性是 JS 的宪法**。「修复 bug 会破坏已有页面」这个判断，让 `typeof null`、0 基月份这类问题永远只能留在原地。这不是技术失败，是平台特性。

### 2. 1996–1999：三国大战与第一次标准化

- 1996-08，IE3 携 **JScript** 上场（名字避开 Sun 的商标）——实现差异开始撕裂生态；
- 1996-11，Netscape 把语言提交 **Ecma International**，TC39 委员会成立；
- 1997-06，**ECMA-262 第 1 版**发布。语言只能叫 **ECMAScript**（商标问题）——「JavaScript 是方言名，ECMAScript 是标准名」的分裂从此固化；
- 1998 ES2（仅 ISO 对齐，无语言变化）；**1999-12 ES3**：正则、`try/catch`、更好的错误信息——这是之后**十年** Web 的实际基线，jQuery（2006）就是建立在 ES3 上的兼容层。

标准化从兼容战争中来，所以今天的 ECMA-262 里专门有 **Annex B（Web 兼容性遗留条款）**：把只有浏览器容错行为才存在的语法（HTML 注释、遗留八进制 `010` 等）合法化，但**只限非模块代码**——模块是 2015 年后才有的一张白纸，没有兼容包袱（练习 `.cjs` vs `.mjs` 对照的就是这条边界）。

### 3. 1999–2008：ES4——史上最重要的一次「没有发布」

ES4 试图一次到位：类、命名空间、**类型注解**、包系统、真多重继承……Adobe/Macromedia 全力支持（ActionScript 3 就是 ES4 草案的直系后代），Microsoft 反对把 JS 变成一门新语言。2008-10 奥斯陆 TC39 会议正式放弃 ES4，分裂成两摊：**ES3.1**（务实修补，→ ES5）与 **Harmony/哈莫尼**（长期演进，→ ES2015）。

**这个失败塑造了此后的一切**——JS 社区从此确立「渐进优于推倒重来」的铁律：

- ES5 的 **strict mode 是 opt-in 逃生舱**：旧代码一行不动，新语义只在新模式生效；
- TC39 把「不能破坏 Web」写成硬约束（test262 一致性测试 + 现有网页实测）；
- **TypeScript 的核心策略（纯子集 + 可擦除 + 渐进迁移）就是这条教训的直接继承**。

### 4. 2008–2010：两年内叠了三件大事，现代 JS 的地基

1. **2008-09 Chrome + V8**：JIT（隐藏类、内联缓存，思想源自 Self 论文）让 JS 快了一个量级 → 详见笔记 07；
2. **2009-12 ES5**：strict mode、`Object.defineProperty`（**Vue 2 响应式的地基**，笔记 23）、`JSON`、`bind`、数组方法全家桶；
3. **2009-05 Node**（Ryan Dahl，JSConf EU）：把 V8 + 事件循环搬出浏览器，JS 第一次成为通用语言；2010 npm 诞生。

模块战争随之展开：CJS（Node 同步）、AMD/RequireJS（浏览器异步加载）、UMD（兼容壳）→ ES2015 官方 **ESM** 入规范，但规范只给了语法没给加载器，Node 直到 **2020** 才稳定支持（`"exports"` 字段）——这段详见笔记 16。

后续：2018 Dahl《10 Things I Regret About Node.js》→ 2020 Deno（重返 ESM/Web 标准）；2022 Bun。2017 **Wasm MVP** 四大浏览器齐备——JS 没有被取代，反而确立新角色：**编译目标 + 生态胶水层**。

### 5. 2015：ES6 大爆炸、年度节奏与 TC39 流程

ES6（ES2015，2015-06）把 Harmony 十年积压一次发布：`let/const`、`class`、**ESM**、`Promise`、箭头函数、生成器、`Proxy/Reflect`、`Symbol`、`Map/Set`——**本工作区阶段 1 的全部主题都是这年的产物**。副产品是版本号改按年（ES2016 起），避免再憋十年。

**TC39 stage 流程**（2014 定稿，[流程文档](https://tc39.es/process-document/)）——这是解释一切「为什么等了 N 年」的钥匙：

| Stage | 名称 | 门槛 |
| --- | --- | --- |
| 0 | 稻草人 | 有想法，任何人可提 |
| 1 | 提案 | 有问题陈述 + 解决方向，指定 TC39 成员推动 |
| 2 | 草案 | **完整语法与语义**（规范文本初稿） |
| 2.7 | （2023 新增） | 有参考实现，收集实现反馈 |
| 3 | 候选 | 规范文本完成，等待实现与使用反馈 |
| 4 | 完成 | ≥ 2 个独立实现通过 test262 测试 → 进下一版规范草稿 |

两个用流程解释的实例：

- **`Array.prototype.sort` 的稳定性 ES2019 才写进规范**——不是引擎迟钝，是之前规范根本没承诺（V8 2018 年先把全数组改成稳定实现，规范次年追认）；
- **TS 跟踪 stage 3 是常态**：可选链/空值合并 stage 4 是 2019-12，TS 3.7（2019-11）在 stage 3 期间就实现；decorators 则相反——TS 1.5（2015）实现的是早期实验版，等 TC39 走到 stage 3 定稿后，**TS 5.0（2023）才换成标准版**。stage 3 ≈ 形态已定，才是跟进的安全线。

**Transpiler 时代**：CoffeeScript（2009，Jeremy Ashkenas）证明「编译到 JS」可行，并用箭头函数、类、解构倒逼 ES6（Eich 公开承认其影响）；Babel（2014，原名 6to5）让 ES6 在浏览器跟进前就能用。「写新语法 → 编译出旧代码」成为常态——**这条管线直接为 TypeScript 铺好了路**：TS 只是往里加了「类型」这一层。

### 6. 2012–2026：TypeScript——「可擦除 + 结构化 + 渐进」的三条路线

**起源**：2010 年 Microsoft 内部立项，解决大规模 JS 项目的可维护性；核心人物 **Anders Hejlsberg**（Turbo Pascal、Delphi、C# 之父）与 Luke Hoban、Steve Lucco 等。2012-10-01 公开 0.8 版（//build/ 大会），编译器**从一开始就用 TS 自身写**（self-hosting，笔记 26 讲的五阶段管道就是它）；2014-04 发布 1.0。

**三个设计决策**（一手依据：[TypeScript Design Goals](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals)，至今仍是那份）——用它们解释阶段 3 学到的一切：

1. **可擦除（erasure）**：类型只存在于编译期，运行时零开销。推论：TS 永远不做运行时校验（不是 C#）；`enum`/`namespace`/构造函数参数属性这类**带运行时副作用**的语法被认定为历史包袱——TS 5.8（2025-03）专门提供 `--erasableSyntaxOnly` 让你显式禁用它们；
2. **结构化（structural）**：类型兼容看形状不看名字。与 C#/Java 的名义类型相反——因为 JS 生态全是字面量对象与鸭子类型，名义类型会让迁移成本爆炸（笔记 13）;
3. **渐进（gradual）**：`any` 是逃生舱、`allowJs` 混合迁移、逐文件标注。**ES4 教训的直接应用**：不要求全量重写。

**版本 × 类型能力对照表**——阶段 3 的每个工具都有出生年份，「类型体操」不是 TS 生来就会的，是十年间一块块拼出来的：

| 版本 | 时间 | 类型能力 | 对应笔记 |
| --- | --- | --- | --- |
| 1.0 | 2014-04 | 注解、接口、泛型 | 09/10 |
| 1.4 | 2015-01 | 联合/交叉类型 | 13 |
| 2.0 | 2016-09 | `strictNullChecks`、`readonly`、`never` | 13/15 |
| 2.1 | 2016-12 | **`keyof`、映射类型**、`Partial`/`Pick` 等内置工具类型 | 11/12 |
| 2.3 | 2017-04 | 泛型参数默认值 | 10 |
| 2.8 | 2018-03 | **条件类型 + `infer`** | 11 |
| 3.0 | 2018-07 | `unknown`、project references | 13 |
| 3.7 | 2019-11 | 可选链/空值合并（同步 TC39 stage 3） | 05 |
| 4.0 | 2020-08 | 可变元组、标签元组元素 | 11 |
| 4.1 | 2020-11 | **模板字面量类型、映射类型 `as` 重映射、`Capitalize`** | 11 |
| 4.7 | 2022-05 | 方差注解、实例化表达式 | 13 |
| 4.9 | 2022-11 | `satisfies` | 09 |
| 5.0 | 2023-03 | 标准装饰器（TC39 stage 3）、`const` 类型参数 | 22 |
| 5.5 | 2024-06 | 推断类型谓词 | 09 |
| 5.8 | 2025-03 | `erasableSyntaxOnly` | 15 |
| 6.x / **7.0** | 2025–2026 | JS 线并行维护；**7.0（Go 原生编译器，前身 tsgo 预览）2026-07 GA，官方口径 ~10x 提速** | 15/26 |

**为什么赢了 Flow**（Facebook，2014-11 开源，同赛道的类型检查器）：DefinitelyTyped 的 `@types` 生态几乎覆盖所有主流库、VS Code（2015）免费且 IntelliSense 由 TS 语言服务驱动、Angular 2（2016）TS 优先、React 社区 2017 起弃 Flow 转 TS。根本原因只有一个：**渐进迁移的成本最低**——又是 ES4 教训。

**当下趋势**：Node 23.6（2025-01）起默认 **type stripping**（剥掉类型直接跑，`tsx` 一贯的做法，笔记 00 里「tsx 只转译不查类型」的注解），类型检查与执行正在解耦；TS 7.0 原生化后，编译器本身也成了笔记 26「编译原理视角」的新素材——管道五阶段不变，实现语言换了。

### 7. 方法论：怎么用一手史料核查历史

| 要核对的 | 去哪 |
| --- | --- |
| 版次、发布日期 | Ecma International 的 [ECMA-262 页面](https://ecma-international.org/publications-and-standards/standards/ecma-262/)（每版 PDF 公开；ES2026 = 第 17 版） |
| 特性现状（stage、进展） | [tc39/proposals](https://github.com/tc39/proposals) README 的 stage 表 + 各提案目录内的 README（历史决策都在） |
| TS 版本内容 | [官方 release notes](https://devblogs.microsoft.com/typescript/)（每个版本都有完整「What's new」） |
| TS 设计原则 | [TypeScript Design Goals wiki](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals) |
| 当事人一手叙述 | Eich 回顾演讲/博客、Hejlsberg 2012 //build/ 演讲、Dahl 2018 演讲 |

---

### 8. 计算机本身的变化：硬件一路「逼迫」语言

语言不是在真空里演化的。把 CPU / 内存 / 网络的时间线叠上来，JS/TS 的每个关键选择都多出一条硬约束——**很多「设计缺陷」其实是「地形限制」**。

**(1) 1995 年的机器：单核、~8–16MB 内存、拨号上网。**

- **单线程事件循环**：消费级 CPU 只有一个核，浏览器 GUI 本来就是单线程模型——「并行」没有需求还平白危险。单线程不是偷懒，是当年的最优解。多核普及后 JS 无法回头加线程（兼容 + 安全），只能平台层补救：Worker（2009 起，无共享内存的消息传递）→ `SharedArrayBuffer` + `Atomics`（ES2017）补真共享内存 → **2018-01 Spectre**：CPU 投机执行的缓存侧信道可以从 JS 计时里测出来，浏览器全线禁用 SAB，之后要求跨源隔离（COOP/COEP）才重新启用——**硬件漏洞直接改写了 Web 平台规范，这在语言史上极罕见**。Node 没有跨源概念，SAB/Atomics 在服务器上从未消失（练习第 4 节）。
- **所有数都是 IEEE 754 double（1985 标准）**：当年消费级 CPU 连硬件 64 位整数都稀罕（x86-64 要到 2003），double 一把梭省掉 int/float 两套算术和转换规则；代价是 2^53 整数上限（52 位尾数 + 隐含位），直到 ES2020 的 BigInt 才补上精确整数——**硬件晚了 17 年**（练习第 2 节）。
- **GC**：目标用户是网页作者而非 C 程序员，且 Java（同年发布）刚证明 GC 可工程化。
- 32 位 tag 值 → `typeof null`（第 1 节已讲）。

**(2) 2004–2005：频率墙（Dennard scaling 终结）→ 多核时代。**
一手依据：Herb Sutter《The Free Lunch Is Over》（2005）——「免费性能午餐结束了，软件必须学会并行」。此后单核性能增长趋缓，语言比拼变成「谁能便宜地用满多核」：Go 的 goroutine、Rust 的所有权并发、JS 的 async/await + Worker。Node 侧的回应长期是「一进程一核」（cluster/容器编排），`worker_threads` 到 2019 才稳定——**多核时代的 JS 押的是并发模型（事件循环）而不是并行模型（线程），这条路线贯穿至今**。

**(3) 内存墙与缓存层级。**
CPU 与 RAM 的速度差自 80 年代起持续拉大 → 性能 = 缓存友好的数据形状。V8 的隐藏类/内联缓存本质上是在为缓存层级「整形」（笔记 07）；TypedArray/ArrayBuffer（2011，为 WebGL 传显存数据而生）把线性连续内存带进 JS——语言第一次向硬件的内存布局妥协（练习第 3 节的字节序就是它暴露的）。这条线索 2020 年代在工具链上重演：esbuild/tsgo 的快清单里都有「共享单一 AST 形状」，理由同源。

**(4) 网络成为计算机。**

- 云/分布式时代（AWS 2006 起），JS 的字面量语法变成了数据交换格式：**JSON**（Crockford 2001–02 整理，2013 ECMA-404 定标）取代 XML——因为它是 JS 的子集，浏览器里零成本解析。「数据即代码」让 JS 天然占据胶水层。
- **C10K**（Kegel 1999）证明线程-每-连接在服务器上不 scale（线程栈内存 + 上下文切换）。事件循环服务器（Twisted 2002、Nginx 2004 先行）在 Node（2009）借 JS 落地：**JS 早已是回调母语，浏览器把它训练好了**——这就是「JS 凭什么离开浏览器」的根本答案：I/O 密集 + 事件循环，跟浏览器经验严丝合缝。
- 回调地狱 → 社区库（Q/bluebird）→ Promises/A+ → ES2015 Promise → ES2017 `async/await`（抄 C# 5.0，2012）：**库先吃螃蟹、规范追认**——这条管线在模块系统上重演过一遍（笔记 16）。

**(5) 移动与功耗：JIT 的账单。**
JIT 要内存（多级编译产物常驻）和电（后台编译线程）。移动/嵌入式场景转向快启动与低占用：V8 snapshot、Hermes（2019，React Native 的 AOT 字节码）。CLI 工具同样受不了 JIT 暖机——这正是工具链原生化的动机之一（见第 9 节）。

### 9. 语言趋势坐标：JS/TS 踩着的四股大潮流

**(1) GC 主流化（1995 前后）。** Java 与 JS 同年，GC 从奢侈品变成新语言的默认（Go/Swift/Kotlin 延续至今；Rust 是唯一的反例革命）。

**(2) 动态 → 静态的钟摆——最关键的一股。**

- 2004–2013 动态类型黄金期：Rails（2004）、Node（2009）——反馈快、起步爽；
- 代码规模一大，动态类型的税单到了：测试覆盖当类型系统用、IDE 只能 grep 式猜语义、重构靠运气；
- 钟摆回摆：Go（2009）、Swift（2014）、Rust（1.0 2015）、Kotlin（1.0 2016）——**全是静态类型**；
- 学术上早有理论储备：**渐进类型**（gradual typing，Siek & Taha 2006）——静态与动态可以在同一语言共存，`any` 就是理论里的逃生舱。**TS 是史上部署最广的渐进类型系统**，它赢在「回摆但不搬家」：把静态类型递给动态世界，而不是逼你换语言（对比 Flow：同一套理论，输在迁移成本与生态）。

**(3) JIT 时代 → AOT 复兴。**

- 1995–2015 主流新语言全跑在带 JIT 的 VM 上（JVM / CLR / V8）；
- 2010s 起 AOT 回归：Go（原生编译、快启动）、Rust（LLVM）、Swift；
- **JS 工具链的原生化重写是同一钟摆的 JS 版**：esbuild（2020，Go）、SWC/Rolldown/Biome/oxc（Rust）、tsgo/TS 7.0（2026，Go）。它们的「快」清单几乎一致——并行吃满多核（频率墙的遗产）、无 JIT 暖机（AOT 的遗产）、共享 AST 单一形状（内存墙的遗产）。**每条优化理由都能在第 8 节找到硬件出处。**

**(4) 演化管线变了：库先、转译器先、规范追认。**
Promises（社区库 → Promises/A+ → ES2015）、async/await（C# → ES2017）、可选链（TS 先实现，等 TC39 追认）、decorators（TS 1.5 实验版 → 等 stage 3 → TS 5.0 换标准版）。**TC39 不再是唯一的语言演化入口，转译器成了语言的实验台**——CoffeeScript/Babel 开创，TS 发扬光大。

**(5) 反面教材：Dart——为什么 TS 不能做成「新语言 + 新 VM」。**
Google 2011 发布 Dart，路线是「更好的语言 + 自带 VM」直接替换 JS，一度内嵌进 Chrome 实验。2015 年放弃内嵌路线，Dart 2.0（2018）转向 Flutter 才找到位置。对照结论：**浏览器是 JS 的运行时，而没有任何一家公司拥有浏览器**——任何类型方案只能是「现有运行时之上、可擦除的一层」。TS 的可擦除设计（第 6 节决策 a）不是审美偏好，是地形决定的；再叠加 ES4 的死（第 3 节——「往 JS 本体里加类型」在委员会层面已经死过一次），两条路都堵死后只剩这一条。

### 10. 拼成一条因果链

| 计算机的变化 | JS/TS 的回应 | 在哪验证 |
| --- | --- | --- |
| 单核 MHz 时代（–2004） | 事件循环、单线程 | 练习第 1 节：12 核机器上主线程仍是 1 个 |
| 频率墙 → 多核（2004–） | Worker → SAB/Atomics → Spectre 回撤 | 练习第 4 节；笔记 04 |
| 内存墙/缓存层级 | 隐藏类、TypedArray、工具链共享 AST | 笔记 07；esbuild/tsgo 的快清单 |
| 64 位普及（2003–） | double 顶了 17 年 → BigInt（ES2020） | 练习第 2 节 |
| 云/分布式（2006–） | JSON、事件循环服务器、async/await | 笔记 04/16 |
| 移动/功耗/冷启动 | Hermes/snapshot；AOT 复兴 | TS 7.0 原生化 |
| 代码规模 × 动态类型之痛 | 渐进类型（TS） | 本工作区 `strict: true` |

方法论收束：判断「语言为什么这样」，按 **商业约束 → 兼容性 → 硬件地形 → 设计者品味** 四层找原因，通常最后一层只占一小截——Eich 十天的品味决定了语法皮，决定 JS 命运的是前三层。

---

## 可运行示例

`exercises/js-ts-history/`（输出已实测，Node v24.10.0）：

```bash
node exercises/js-ts-history/historical-baggage.cjs   # 历史遗物：sloppy 脚本下全部合法
node exercises/js-ts-history/historical-baggage.mjs   # 同一份代码进模块：解析阶段就崩
node exercises/js-ts-history/computing-trends.mjs     # 计算机变化：核数/IEEE 754/字节序/SAB/JIT 暖机
node exercises/js-ts-history/erased.ts                # 可擦除现场：Node 直接跑 .ts（type stripping）
```

| 练习节 | 遗物 | 实测输出 | 归属年代 |
| --- | --- | --- | --- |
| 1 | `typeof null` | `"object"` | 1995（32 位 tag 偷懒） |
| 2 | `new Date(2026, 11, 5).getMonth()` | `11` | 1995（抄 `java.util.Date`） |
| 3 | 参数阴影 `undefined` / 全局描述符 | `true` / `{writable:false,...}` | ES3 → ES5 修复 |
| 4 | `010` 遗留八进制 | `8`（sloppy 脚本）/ `SyntaxError`（模块，报 strict 措辞——模块隐含 strict） | ES3 → Annex B |
| 5 | 稀疏数组：`[1,,3]` 的 `indexOf` vs `includes` | `-1` / `true` | 洞 vs undefined 的语义，ES2016 起才逐步统一 |
| 6 | `<!-- ... -->` HTML 注释 | sloppy 脚本合法；模块里 `SyntaxError: HTML comments are not allowed in modules` | 1995 → Annex B.1.3 |
| 7 | `navigator.hardwareConcurrency` / `os.cpus().length` | `12` / `12`——主线程仍是 1 个 | 1995 单核单线程；Worker（2009）是补丁 |
| 8 | `2**53 === 2**53 + 1` / BigInt 版 | `true` / `false` | IEEE 754（1985）；x86-64（2003）晚 17 年 |
| 9 | TypedArray 读字节序 | `1`（小端） | TypedArray（2011，WebGL）：语言向硬件内存布局妥协 |
| 10 | `SharedArrayBuffer` + `Atomics.add` | `"function"` / `0` / `41` | ES2017；Spectre（2018）只在浏览器侧回撤 |
| 11 | JIT 暖机 6 分片 | 27.7 → 24.4 ms（~15%） | V8（2008）；现代分层快，简单负载差距变小 |
| 12 | `node erased.ts` 直跑 TS | `{ id: 1, title: 'erasure' } getTitle 1` + `erasure`；`npx tsc --noEmit ...` PASS | 可擦除：`getTitle` 是类型层算完就扔的字符串 |

**核心观察**：`.cjs` 与 `.mjs` 的全部差异来自一条历史分界线——**Annex B 只适用于非模块代码**。模块是 2015 年后的一张白纸，没有兼容包袱；这也是「新代码请写 ESM」的语言层理由。

## 输出预测题

**题 1（Annex B 与模块边界）** 两个文件内容完全相同，预测各自输出/错误：

```js live noInline
// a.cjs
var x = 010 + 1;
console.log(x);
```

```js
// a.mjs —— 与 a.cjs 内容完全相同
var x = 010 + 1;
console.log(x);
```

再追问：把 `010` 改成 `0o10`，两个文件各输出什么？为什么？

&lt;details>&lt;summary>答案要点&lt;/summary>

- `a.cjs` → `9`：sloppy 脚本允许 Annex B 遗留八进制，`010 === 8`。
- `a.mjs` → 解析阶段 `SyntaxError`（V8 报 "Octal literals are not allowed in strict mode."——模块隐含 strict，Annex B 不适用），一行代码都不会执行。
- 改成 `0o10` 后两个文件都输出 `9`：`0o` 前缀是 ES2015 的正牌八进制字面量，strict/模块均合法。遗留与正规的边界就是「兼容包袱有没有」。

&lt;/details>

**题 2（版本考古 + 类型层求值）** 不查资料回答：

```ts live noInline
type GetterNames<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K];
};
type P = Partial<{ name: string; age: number }>;
type G = GetterNames<{ name: string }>;
```

(a) `P` 最早在哪个 TS 版本就能定义？`GetterNames` 呢？各自依赖哪些机制、机制又分别诞生于哪个版本？
(b) 写出 `G` 的展开结果。

&lt;details>&lt;summary>答案要点&lt;/summary>

(a) `P` → **TS 2.1（2016-12）**：依赖 `keyof` + 映射类型（均 2.1）+ 内置 `Partial`（同批内置）。`GetterNames` → **TS 4.1（2020-11）**：映射类型（2.1）+ **`as` 键重映射（4.1）** + **模板字面量类型（4.1）** + 固有 `Capitalize`（4.1 随模板字面量一起加的四个固有字符串工具类型之一）。中间隔了整整四年——这就是「类型体操能力是逐步拼出来的」的具体含义。
(b) `G = { getName: () => string }`：`as` 把键 `name` 重映射为 `` `get${Capitalize<"name">}` `` → `"getName"`，值类型 `() => T["name"]`。

&lt;/details>

**题 3（补充部分 · 硬件可观察）** 三行代码，逐行预测输出，并指出每一行对应的「计算机本身的」事实：

```js live noInline
console.log(2 ** 53 === 2 ** 53 + 1);
console.log(new Uint8Array(new Uint32Array([1]).buffer)[0]);
console.log(typeof SharedArrayBuffer);
```

&lt;details>&lt;summary>答案要点&lt;/summary>

1. `true`：double 只有 53 位有效位，2^53 + 1 不可表示 → 舍回 2^53。硬件事实：IEEE 754（1985）——当年消费级 CPU 连硬件 64 位整数都没有，所以 1995 年「一把梭 double」是合理决定。
2. `1`：Uint32 的 1 在内存中是 `01 00 00 00` → 小端序。硬件事实：x86-64/arm64 一律小端；TypedArray（2011，WebGL）是语言向硬件内存布局妥协的产物。
3. `"function"`（Node 环境）：SAB/Atomics 在服务器从未被禁。硬件事实：Spectre（2018-01）投机执行缓存侧信道 → 浏览器禁用，要求跨源隔离才重新启用。**同一个 API 在浏览器和 Node 可用性不同，本身就是硬件安全史的化石。**

&lt;/details>

**题 4（补充部分 · 归因）** 不查资料回答：

(a) Dart（新语言 + 自带 VM）失败了，TS（JS 子集 + 擦除层）成了——从「地形」层面给出两个证据。
(b) 从 esbuild / tsgo 的「快」里挑三条优化理由，分别指出它们各自对应哪次计算机变革。

&lt;details>&lt;summary>答案要点&lt;/summary>

(a) 证据一：ES4（1999–2008）——「往 ECMAScript 本体里加类型」在委员会层面已经死过一次；证据二：Dart 本身——2011 想替换运行时，2015 放弃内嵌 Chrome，转向 Flutter 才活下来。浏览器是 JS 的运行时且无人拥有它 → 类型只能做成运行时之上的可擦除层；叠加 ES4 教训确立的「渐进优于推倒重来」，TS 的三条设计决策是被地形逼出来的，不是选出来的。
(b) ① 并行吃满多核 ← 频率墙（2004–2005）后单核性能不再免费增长；② 无 JIT 暖机、快启动 ← AOT 复兴（移动功耗、CLI 冷启动）；③ 共享单一 AST 形状 ← 内存墙（缓存友好的数据形状，与 V8 隐藏类同源）。

&lt;/details>

## 回扣与下一步

- 笔记 01：`typeof null` 在类型转换章已遇过——现在你知道它为什么修不了；
- 笔记 07：V8（2008）是 JS 性能革命的原点，JIT 细节在那——练习里暖机差距只有 ~15% 的原因（现代分层管道）也在那；
- 笔记 04：async/await 的 C# 血统与「库先、规范追认」管线的异步篇；
- 笔记 16：CJS/AMD/UMD/ESM 战争的完整版在这里只是提了时间线；
- 笔记 23：ES5 `defineProperty`（Vue 2）→ ES2015 `Proxy`（Vue 3）就是「响应式实现随规范演进」的活案例；
- 笔记 26：TS 7.0 换了实现语言，但 scanner→parser→binder→checker→emitter 管道不变。
- 下一专题继续按大纲阶段 5 推进。

# 28 · JS/TS 发展史：今天的每一个「怪」，都是当年的一次合理决定

> 对应大纲：阶段 5 补充专题（新增）。
> 一手依据（历史章节的一手史料，不是二手年表）：[Ecma International 的 ECMA-262 页面](https://ecma-international.org/publications-and-standards/standards/ecma-262/)（每一版 PDF 公开，第 17 版 = ES2026，2026-06 发布）；[tc39/proposals README](https://github.com/tc39/proposals) 的 stage 表与 [TC39 流程文档](https://tc39.es/process-document/)；[TypeScript 官方 release notes](https://devblogs.microsoft.com/typescript/) 与 [TypeScript Design Goals wiki](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals)；Brendan Eich 的回顾演讲与博客（"Popularity at 10" 等）；Anders Hejlsberg 2012 //build/ 首次公开 TypeScript 的演讲；Ryan Dahl JSConf EU 2009（Node 发布）与 2018《10 Things I Regret About Node.js》；Herb Sutter《The Free Lunch Is Over》（2005，频率墙与多核）；Dan Kegel 的 C10K（1999）；Project Zero 的 Spectre 博文（2018-01）；Siek & Taha 渐进类型论文（2006）；esbuild《Why is esbuild fast?》（2020）。

## 学习目标

1. **不背年表，做决策考古**：把历史当「决策记录」读——今天语言里每个反直觉行为，都能对应到当年的具体约束。背得出「ES6 是 2015 年」没有用；能讲清「为什么 ES6 之前要靠 Babel、为什么 strict mode 是 opt-in、为什么 TS 必须可擦除」才算懂。
2. 能用 TC39 stage 0–4 流程解释「某个特性为什么等了 N 年才进规范」（而不是「浏览器厂商慢」）。
3. 能用 TS 的三个设计决策（**可擦除、结构化、渐进**）解释阶段 3 学过的类型系统为什么长这样。
4. 建立「版本事实去一手来源核对」的习惯：网络年表错漏极多（尤其 ES4 时间线、Node ESM 时间线），本工作区的固定做法是回源。
5. 能把 JS/TS 的关键选择落到**硬件时间线**上：单核 → 频率墙 → 多核、IEEE 754、内存墙、Spectre——并学会区分「设计缺陷」和「地形限制」。
6. 能把 JS/TS 放进**语言潮流坐标**：GC 主流化、动态 → 静态的钟摆（渐进类型理论）、JIT → AOT 复兴；并能用反例（Dart、ES4）论证 TS 为什么「只能」长成现在这样。

---

## 关键概念

### 0. 六条主线总表（速览用，不要求背）

| 主线 | 关键节点 |
| --- | --- |
| 语言 | Mocha(1995) → ES1–3(1997–1999) → **ES4 失败**(1999–2008) → ES5(2009) → ES2015 大爆炸 → 年度小版本（ES2016…ES2026 = 第 17 版） |
| 标准化 | Netscape/Sun 双头(1995) → ECMA-262 / TC39(1997) → 2008 哈莫尼协议 → TC39 stage 流程(2014) |
| 运行时 | 浏览器专属 → V8(2008) → Node(2009) + npm(2010) → Wasm MVP(2017) → Deno(2020)/Bun(2022) |
| 模块 | `<script>` 拼接 → CJS / AMD / UMD 战争(2009–) → ESM 入规范(2015) → Node 稳定支持(2020)（详见笔记 16） |
| 编译到 JS | CoffeeScript(2009) 倒逼 ES6 → Babel(2014) 让 ES6 提前可用 → 这条管线为 TS 铺路 |
| 类型 | 无类型十年 → ES4 的类型注解胎死腹中 → TS(2012) vs Flow(2014) → TS 全胜 |

---

### 1. 1995：十天的 Mocha——四个约束决定一切

1995 年 5 月，Netscape 的 Brendan Eich 用约 10 天写出 Mocha 原型；9 月随 Navigator 2.0 beta 以 **LiveScript** 之名发布；12 月改名 **JavaScript**——纯粹是搭 Sun 公司 Java 的营销便车（两家共同持有商标，今天归 Oracle）。**「十天」不是趣闻，是这套语言的解释框架**：后面所有约束都在这十天里定型。

| 约束 | 当年的理由 | 留下的遗物（今天仍可运行） |
| --- | --- | --- |
| 语法要「长得像 Java」 | 市场部门要求，借 Java 热度 | C 风格大括号、`this`、`new`、`Date` 构造函数的样子 |
| 内核抄 Self + Scheme | Eich 自己的技术品味：原型委托（Self）、一等函数与闭包（Scheme） | 原型链（笔记 03）、函数是一等公民（阶段 1.2） |
| 只有十天，能抄就抄 | 没时间设计 | **`Date` 月份 0 基**：抄的是 JDK 1.0 的 `java.util.Date`——Java 自己在 JDK 1.1（1997）就废弃修复了，JS 永远改不动（练习第 2 节） |
| 值用 32 位 tag 表示 | 性能 | **`typeof null === "object"`**：object 的 tag 是 `000`，null 是空指针、低三位全 0 → 被归成 object；修复会破坏全网网页，永久保留（练习第 1 节） |
| 浏览器宿主，渐进增强 | 老浏览器不认 `<script>` 时，脚本要被 HTML 注释藏起来 | **HTML 型注释 `<!--`** 至今在非模块脚本里合法（ECMA-262 Annex B.1.3，练习第 6 节） |

另一个同年代遗物：**`void 0` 成语**。ES3 规范里全局 `undefined` 的属性特性是 `{ DontEnum, DontDelete }`——**没有 DontWrite，可写**。jQuery 时代的标准防御是参数阴影：`(function (undefined) { ... })()`。ES5 才把全局 `undefined` 改为不可写，但参数阴影至今合法（练习第 3 节）。

> 关键认知：**Web 兼容性是 JS 的宪法**。「修复 bug 会破坏已有页面」这个判断，让 `typeof null`、0 基月份这类问题永远只能留在原地。这不是技术失败，是平台特性。

### 2. 1996–1999：三国大战与第一次标准化

- 1996-08，IE3 携 **JScript** 上场（名字避开 Sun 的商标）——实现差异开始撕裂生态；
- 1996-11，Netscape 把语言提交 **Ecma International**，TC39 委员会成立；
- 1997-06，**ECMA-262 第 1 版**发布。语言只能叫 **ECMAScript**（商标问题）——「JavaScript 是方言名，ECMAScript 是标准名」的分裂从此固化；
- 1998 ES2（仅 ISO 对齐，无语言变化）；**1999-12 ES3**：正则、`try/catch`、更好的错误信息——这是之后**十年** Web 的实际基线，jQuery（2006）就是建立在 ES3 上的兼容层。

标准化从兼容战争中来，所以今天的 ECMA-262 里专门有 **Annex B（Web 兼容性遗留条款）**：把只有浏览器容错行为才存在的语法（HTML 注释、遗留八进制 `010` 等）合法化，但**只限非模块代码**——模块是 2015 年后才有的一张白纸，没有兼容包袱（练习 `.cjs` vs `.mjs` 对照的就是这条边界）。

### 3. 1999–2008：ES4——史上最重要的一次「没有发布」

ES4 试图一次到位：类、命名空间、**类型注解**、包系统、真多重继承……Adobe/Macromedia 全力支持（ActionScript 3 就是 ES4 草案的直系后代），Microsoft 反对把 JS 变成一门新语言。2008-10 奥斯陆 TC39 会议正式放弃 ES4，分裂成两摊：**ES3.1**（务实修补，→ ES5）与 **Harmony/哈莫尼**（长期演进，→ ES2015）。

**这个失败塑造了此后的一切**——JS 社区从此确立「渐进优于推倒重来」的铁律：

- ES5 的 **strict mode 是 opt-in 逃生舱**：旧代码一行不动，新语义只在新模式生效；
- TC39 把「不能破坏 Web」写成硬约束（test262 一致性测试 + 现有网页实测）；
- **TypeScript 的核心策略（纯子集 + 可擦除 + 渐进迁移）就是这条教训的直接继承**。

### 4. 2008–2010：两年内叠了三件大事，现代 JS 的地基

1. **2008-09 Chrome + V8**：JIT（隐藏类、内联缓存，思想源自 Self 论文）让 JS 快了一个量级 → 详见笔记 07；
2. **2009-12 ES5**：strict mode、`Object.defineProperty`（**Vue 2 响应式的地基**，笔记 23）、`JSON`、`bind`、数组方法全家桶；
3. **2009-05 Node**（Ryan Dahl，JSConf EU）：把 V8 + 事件循环搬出浏览器，JS 第一次成为通用语言；2010 npm 诞生。

模块战争随之展开：CJS（Node 同步）、AMD/RequireJS（浏览器异步加载）、UMD（兼容壳）→ ES2015 官方 **ESM** 入规范，但规范只给了语法没给加载器，Node 直到 **2020** 才稳定支持（`"exports"` 字段）——这段详见笔记 16。

后续：2018 Dahl《10 Things I Regret About Node.js》→ 2020 Deno（重返 ESM/Web 标准）；2022 Bun。2017 **Wasm MVP** 四大浏览器齐备——JS 没有被取代，反而确立新角色：**编译目标 + 生态胶水层**。

### 5. 2015：ES6 大爆炸、年度节奏与 TC39 流程

ES6（ES2015，2015-06）把 Harmony 十年积压一次发布：`let/const`、`class`、**ESM**、`Promise`、箭头函数、生成器、`Proxy/Reflect`、`Symbol`、`Map/Set`——**本工作区阶段 1 的全部主题都是这年的产物**。副产品是版本号改按年（ES2016 起），避免再憋十年。

**TC39 stage 流程**（2014 定稿，[流程文档](https://tc39.es/process-document/)）——这是解释一切「为什么等了 N 年」的钥匙：

| Stage | 名称 | 门槛 |
| --- | --- | --- |
| 0 | 稻草人 | 有想法，任何人可提 |
| 1 | 提案 | 有问题陈述 + 解决方向，指定 TC39 成员推动 |
| 2 | 草案 | **完整语法与语义**（规范文本初稿） |
| 2.7 | （2023 新增） | 有参考实现，收集实现反馈 |
| 3 | 候选 | 规范文本完成，等待实现与使用反馈 |
| 4 | 完成 | ≥ 2 个独立实现通过 test262 测试 → 进下一版规范草稿 |

两个用流程解释的实例：

- **`Array.prototype.sort` 的稳定性 ES2019 才写进规范**——不是引擎迟钝，是之前规范根本没承诺（V8 2018 年先把全数组改成稳定实现，规范次年追认）；
- **TS 跟踪 stage 3 是常态**：可选链/空值合并 stage 4 是 2019-12，TS 3.7（2019-11）在 stage 3 期间就实现；decorators 则相反——TS 1.5（2015）实现的是早期实验版，等 TC39 走到 stage 3 定稿后，**TS 5.0（2023）才换成标准版**。stage 3 ≈ 形态已定，才是跟进的安全线。

**Transpiler 时代**：CoffeeScript（2009，Jeremy Ashkenas）证明「编译到 JS」可行，并用箭头函数、类、解构倒逼 ES6（Eich 公开承认其影响）；Babel（2014，原名 6to5）让 ES6 在浏览器跟进前就能用。「写新语法 → 编译出旧代码」成为常态——**这条管线直接为 TypeScript 铺好了路**：TS 只是往里加了「类型」这一层。

### 6. 2012–2026：TypeScript——「可擦除 + 结构化 + 渐进」的三条路线

**起源**：2010 年 Microsoft 内部立项，解决大规模 JS 项目的可维护性；核心人物 **Anders Hejlsberg**（Turbo Pascal、Delphi、C# 之父）与 Luke Hoban、Steve Lucco 等。2012-10-01 公开 0.8 版（//build/ 大会），编译器**从一开始就用 TS 自身写**（self-hosting，笔记 26 讲的五阶段管道就是它）；2014-04 发布 1.0。

**三个设计决策**（一手依据：[TypeScript Design Goals](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals)，至今仍是那份）——用它们解释阶段 3 学到的一切：

1. **可擦除（erasure）**：类型只存在于编译期，运行时零开销。推论：TS 永远不做运行时校验（不是 C#）；`enum`/`namespace`/构造函数参数属性这类**带运行时副作用**的语法被认定为历史包袱——TS 5.8（2025-03）专门提供 `--erasableSyntaxOnly` 让你显式禁用它们；
2. **结构化（structural）**：类型兼容看形状不看名字。与 C#/Java 的名义类型相反——因为 JS 生态全是字面量对象与鸭子类型，名义类型会让迁移成本爆炸（笔记 13）;
3. **渐进（gradual）**：`any` 是逃生舱、`allowJs` 混合迁移、逐文件标注。**ES4 教训的直接应用**：不要求全量重写。

**版本 × 类型能力对照表**——阶段 3 的每个工具都有出生年份，「类型体操」不是 TS 生来就会的，是十年间一块块拼出来的：

| 版本 | 时间 | 类型能力 | 对应笔记 |
| --- | --- | --- | --- |
| 1.0 | 2014-04 | 注解、接口、泛型 | 09/10 |
| 1.4 | 2015-01 | 联合/交叉类型 | 13 |
| 2.0 | 2016-09 | `strictNullChecks`、`readonly`、`never` | 13/15 |
| 2.1 | 2016-12 | **`keyof`、映射类型**、`Partial`/`Pick` 等内置工具类型 | 11/12 |
| 2.3 | 2017-04 | 泛型参数默认值 | 10 |
| 2.8 | 2018-03 | **条件类型 + `infer`** | 11 |
| 3.0 | 2018-07 | `unknown`、project references | 13 |
| 3.7 | 2019-11 | 可选链/空值合并（同步 TC39 stage 3） | 05 |
| 4.0 | 2020-08 | 可变元组、标签元组元素 | 11 |
| 4.1 | 2020-11 | **模板字面量类型、映射类型 `as` 重映射、`Capitalize`** | 11 |
| 4.7 | 2022-05 | 方差注解、实例化表达式 | 13 |
| 4.9 | 2022-11 | `satisfies` | 09 |
| 5.0 | 2023-03 | 标准装饰器（TC39 stage 3）、`const` 类型参数 | 22 |
| 5.5 | 2024-06 | 推断类型谓词 | 09 |
| 5.8 | 2025-03 | `erasableSyntaxOnly` | 15 |
| 6.x / **7.0** | 2025–2026 | JS 线并行维护；**7.0（Go 原生编译器，前身 tsgo 预览）2026-07 GA，官方口径 ~10x 提速** | 15/26 |

**为什么赢了 Flow**（Facebook，2014-11 开源，同赛道的类型检查器）：DefinitelyTyped 的 `@types` 生态几乎覆盖所有主流库、VS Code（2015）免费且 IntelliSense 由 TS 语言服务驱动、Angular 2（2016）TS 优先、React 社区 2017 起弃 Flow 转 TS。根本原因只有一个：**渐进迁移的成本最低**——又是 ES4 教训。

**当下趋势**：Node 23.6（2025-01）起默认 **type stripping**（剥掉类型直接跑，`tsx` 一贯的做法，笔记 00 里「tsx 只转译不查类型」的注解），类型检查与执行正在解耦；TS 7.0 原生化后，编译器本身也成了笔记 26「编译原理视角」的新素材——管道五阶段不变，实现语言换了。

### 7. 方法论：怎么用一手史料核查历史

| 要核对的 | 去哪 |
| --- | --- |
| 版次、发布日期 | Ecma International 的 [ECMA-262 页面](https://ecma-international.org/publications-and-standards/standards/ecma-262/)（每版 PDF 公开；ES2026 = 第 17 版） |
| 特性现状（stage、进展） | [tc39/proposals](https://github.com/tc39/proposals) README 的 stage 表 + 各提案目录内的 README（历史决策都在） |
| TS 版本内容 | [官方 release notes](https://devblogs.microsoft.com/typescript/)（每个版本都有完整「What's new」） |
| TS 设计原则 | [TypeScript Design Goals wiki](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals) |
| 当事人一手叙述 | Eich 回顾演讲/博客、Hejlsberg 2012 //build/ 演讲、Dahl 2018 演讲 |

---

### 8. 计算机本身的变化：硬件一路「逼迫」语言

语言不是在真空里演化的。把 CPU / 内存 / 网络的时间线叠上来，JS/TS 的每个关键选择都多出一条硬约束——**很多「设计缺陷」其实是「地形限制」**。

**(1) 1995 年的机器：单核、~8–16MB 内存、拨号上网。**

- **单线程事件循环**：消费级 CPU 只有一个核，浏览器 GUI 本来就是单线程模型——「并行」没有需求还平白危险。单线程不是偷懒，是当年的最优解。多核普及后 JS 无法回头加线程（兼容 + 安全），只能平台层补救：Worker（2009 起，无共享内存的消息传递）→ `SharedArrayBuffer` + `Atomics`（ES2017）补真共享内存 → **2018-01 Spectre**：CPU 投机执行的缓存侧信道可以从 JS 计时里测出来，浏览器全线禁用 SAB，之后要求跨源隔离（COOP/COEP）才重新启用——**硬件漏洞直接改写了 Web 平台规范，这在语言史上极罕见**。Node 没有跨源概念，SAB/Atomics 在服务器上从未消失（练习第 4 节）。
- **所有数都是 IEEE 754 double（1985 标准）**：当年消费级 CPU 连硬件 64 位整数都稀罕（x86-64 要到 2003），double 一把梭省掉 int/float 两套算术和转换规则；代价是 2^53 整数上限（52 位尾数 + 隐含位），直到 ES2020 的 BigInt 才补上精确整数——**硬件晚了 17 年**（练习第 2 节）。
- **GC**：目标用户是网页作者而非 C 程序员，且 Java（同年发布）刚证明 GC 可工程化。
- 32 位 tag 值 → `typeof null`（第 1 节已讲）。

**(2) 2004–2005：频率墙（Dennard scaling 终结）→ 多核时代。**
一手依据：Herb Sutter《The Free Lunch Is Over》（2005）——「免费性能午餐结束了，软件必须学会并行」。此后单核性能增长趋缓，语言比拼变成「谁能便宜地用满多核」：Go 的 goroutine、Rust 的所有权并发、JS 的 async/await + Worker。Node 侧的回应长期是「一进程一核」（cluster/容器编排），`worker_threads` 到 2019 才稳定——**多核时代的 JS 押的是并发模型（事件循环）而不是并行模型（线程），这条路线贯穿至今**。

**(3) 内存墙与缓存层级。**
CPU 与 RAM 的速度差自 80 年代起持续拉大 → 性能 = 缓存友好的数据形状。V8 的隐藏类/内联缓存本质上是在为缓存层级「整形」（笔记 07）；TypedArray/ArrayBuffer（2011，为 WebGL 传显存数据而生）把线性连续内存带进 JS——语言第一次向硬件的内存布局妥协（练习第 3 节的字节序就是它暴露的）。这条线索 2020 年代在工具链上重演：esbuild/tsgo 的快清单里都有「共享单一 AST 形状」，理由同源。

**(4) 网络成为计算机。**

- 云/分布式时代（AWS 2006 起），JS 的字面量语法变成了数据交换格式：**JSON**（Crockford 2001–02 整理，2013 ECMA-404 定标）取代 XML——因为它是 JS 的子集，浏览器里零成本解析。「数据即代码」让 JS 天然占据胶水层。
- **C10K**（Kegel 1999）证明线程-每-连接在服务器上不 scale（线程栈内存 + 上下文切换）。事件循环服务器（Twisted 2002、Nginx 2004 先行）在 Node（2009）借 JS 落地：**JS 早已是回调母语，浏览器把它训练好了**——这就是「JS 凭什么离开浏览器」的根本答案：I/O 密集 + 事件循环，跟浏览器经验严丝合缝。
- 回调地狱 → 社区库（Q/bluebird）→ Promises/A+ → ES2015 Promise → ES2017 `async/await`（抄 C# 5.0，2012）：**库先吃螃蟹、规范追认**——这条管线在模块系统上重演过一遍（笔记 16）。

**(5) 移动与功耗：JIT 的账单。**
JIT 要内存（多级编译产物常驻）和电（后台编译线程）。移动/嵌入式场景转向快启动与低占用：V8 snapshot、Hermes（2019，React Native 的 AOT 字节码）。CLI 工具同样受不了 JIT 暖机——这正是工具链原生化的动机之一（见第 9 节）。

### 9. 语言趋势坐标：JS/TS 踩着的四股大潮流

**(1) GC 主流化（1995 前后）。** Java 与 JS 同年，GC 从奢侈品变成新语言的默认（Go/Swift/Kotlin 延续至今；Rust 是唯一的反例革命）。

**(2) 动态 → 静态的钟摆——最关键的一股。**

- 2004–2013 动态类型黄金期：Rails（2004）、Node（2009）——反馈快、起步爽；
- 代码规模一大，动态类型的税单到了：测试覆盖当类型系统用、IDE 只能 grep 式猜语义、重构靠运气；
- 钟摆回摆：Go（2009）、Swift（2014）、Rust（1.0 2015）、Kotlin（1.0 2016）——**全是静态类型**；
- 学术上早有理论储备：**渐进类型**（gradual typing，Siek & Taha 2006）——静态与动态可以在同一语言共存，`any` 就是理论里的逃生舱。**TS 是史上部署最广的渐进类型系统**，它赢在「回摆但不搬家」：把静态类型递给动态世界，而不是逼你换语言（对比 Flow：同一套理论，输在迁移成本与生态）。

**(3) JIT 时代 → AOT 复兴。**

- 1995–2015 主流新语言全跑在带 JIT 的 VM 上（JVM / CLR / V8）；
- 2010s 起 AOT 回归：Go（原生编译、快启动）、Rust（LLVM）、Swift；
- **JS 工具链的原生化重写是同一钟摆的 JS 版**：esbuild（2020，Go）、SWC/Rolldown/Biome/oxc（Rust）、tsgo/TS 7.0（2026，Go）。它们的「快」清单几乎一致——并行吃满多核（频率墙的遗产）、无 JIT 暖机（AOT 的遗产）、共享 AST 单一形状（内存墙的遗产）。**每条优化理由都能在第 8 节找到硬件出处。**

**(4) 演化管线变了：库先、转译器先、规范追认。**
Promises（社区库 → Promises/A+ → ES2015）、async/await（C# → ES2017）、可选链（TS 先实现，等 TC39 追认）、decorators（TS 1.5 实验版 → 等 stage 3 → TS 5.0 换标准版）。**TC39 不再是唯一的语言演化入口，转译器成了语言的实验台**——CoffeeScript/Babel 开创，TS 发扬光大。

**(5) 反面教材：Dart——为什么 TS 不能做成「新语言 + 新 VM」。**
Google 2011 发布 Dart，路线是「更好的语言 + 自带 VM」直接替换 JS，一度内嵌进 Chrome 实验。2015 年放弃内嵌路线，Dart 2.0（2018）转向 Flutter 才找到位置。对照结论：**浏览器是 JS 的运行时，而没有任何一家公司拥有浏览器**——任何类型方案只能是「现有运行时之上、可擦除的一层」。TS 的可擦除设计（第 6 节决策 a）不是审美偏好，是地形决定的；再叠加 ES4 的死（第 3 节——「往 JS 本体里加类型」在委员会层面已经死过一次），两条路都堵死后只剩这一条。

### 10. 拼成一条因果链

| 计算机的变化 | JS/TS 的回应 | 在哪验证 |
| --- | --- | --- |
| 单核 MHz 时代（–2004） | 事件循环、单线程 | 练习第 1 节：12 核机器上主线程仍是 1 个 |
| 频率墙 → 多核（2004–） | Worker → SAB/Atomics → Spectre 回撤 | 练习第 4 节；笔记 04 |
| 内存墙/缓存层级 | 隐藏类、TypedArray、工具链共享 AST | 笔记 07；esbuild/tsgo 的快清单 |
| 64 位普及（2003–） | double 顶了 17 年 → BigInt（ES2020） | 练习第 2 节 |
| 云/分布式（2006–） | JSON、事件循环服务器、async/await | 笔记 04/16 |
| 移动/功耗/冷启动 | Hermes/snapshot；AOT 复兴 | TS 7.0 原生化 |
| 代码规模 × 动态类型之痛 | 渐进类型（TS） | 本工作区 `strict: true` |

方法论收束：判断「语言为什么这样」，按 **商业约束 → 兼容性 → 硬件地形 → 设计者品味** 四层找原因，通常最后一层只占一小截——Eich 十天的品味决定了语法皮，决定 JS 命运的是前三层。

---

## 可运行示例

`exercises/js-ts-history/`（输出已实测，Node v24.10.0）：

```bash
node exercises/js-ts-history/historical-baggage.cjs   # 历史遗物：sloppy 脚本下全部合法
node exercises/js-ts-history/historical-baggage.mjs   # 同一份代码进模块：解析阶段就崩
node exercises/js-ts-history/computing-trends.mjs     # 计算机变化：核数/IEEE 754/字节序/SAB/JIT 暖机
node exercises/js-ts-history/erased.ts                # 可擦除现场：Node 直接跑 .ts（type stripping）
```

| 练习节 | 遗物 | 实测输出 | 归属年代 |
| --- | --- | --- | --- |
| 1 | `typeof null` | `"object"` | 1995（32 位 tag 偷懒） |
| 2 | `new Date(2026, 11, 5).getMonth()` | `11` | 1995（抄 `java.util.Date`） |
| 3 | 参数阴影 `undefined` / 全局描述符 | `true` / `{writable:false,...}` | ES3 → ES5 修复 |
| 4 | `010` 遗留八进制 | `8`（sloppy 脚本）/ `SyntaxError`（模块，报 strict 措辞——模块隐含 strict） | ES3 → Annex B |
| 5 | 稀疏数组：`[1,,3]` 的 `indexOf` vs `includes` | `-1` / `true` | 洞 vs undefined 的语义，ES2016 起才逐步统一 |
| 6 | `<!-- ... -->` HTML 注释 | sloppy 脚本合法；模块里 `SyntaxError: HTML comments are not allowed in modules` | 1995 → Annex B.1.3 |
| 7 | `navigator.hardwareConcurrency` / `os.cpus().length` | `12` / `12`——主线程仍是 1 个 | 1995 单核单线程；Worker（2009）是补丁 |
| 8 | `2**53 === 2**53 + 1` / BigInt 版 | `true` / `false` | IEEE 754（1985）；x86-64（2003）晚 17 年 |
| 9 | TypedArray 读字节序 | `1`（小端） | TypedArray（2011，WebGL）：语言向硬件内存布局妥协 |
| 10 | `SharedArrayBuffer` + `Atomics.add` | `"function"` / `0` / `41` | ES2017；Spectre（2018）只在浏览器侧回撤 |
| 11 | JIT 暖机 6 分片 | 27.7 → 24.4 ms（~15%） | V8（2008）；现代分层快，简单负载差距变小 |
| 12 | `node erased.ts` 直跑 TS | `{ id: 1, title: 'erasure' } getTitle 1` + `erasure`；`npx tsc --noEmit ...` PASS | 可擦除：`getTitle` 是类型层算完就扔的字符串 |

**核心观察**：`.cjs` 与 `.mjs` 的全部差异来自一条历史分界线——**Annex B 只适用于非模块代码**。模块是 2015 年后的一张白纸，没有兼容包袱；这也是「新代码请写 ESM」的语言层理由。

## 输出预测题

**题 1（Annex B 与模块边界）** 两个文件内容完全相同，预测各自输出/错误：

```js live noInline
// a.cjs
var x = 010 + 1;
console.log(x);
```

```js
// a.mjs —— 与 a.cjs 内容完全相同
var x = 010 + 1;
console.log(x);
```

再追问：把 `010` 改成 `0o10`，两个文件各输出什么？为什么？

&lt;details>&lt;summary>答案要点&lt;/summary>

- `a.cjs` → `9`：sloppy 脚本允许 Annex B 遗留八进制，`010 === 8`。
- `a.mjs` → 解析阶段 `SyntaxError`（V8 报 "Octal literals are not allowed in strict mode."——模块隐含 strict，Annex B 不适用），一行代码都不会执行。
- 改成 `0o10` 后两个文件都输出 `9`：`0o` 前缀是 ES2015 的正牌八进制字面量，strict/模块均合法。遗留与正规的边界就是「兼容包袱有没有」。

&lt;/details>

**题 2（版本考古 + 类型层求值）** 不查资料回答：

```ts live noInline
type GetterNames<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K];
};
type P = Partial<{ name: string; age: number }>;
type G = GetterNames<{ name: string }>;
```

(a) `P` 最早在哪个 TS 版本就能定义？`GetterNames` 呢？各自依赖哪些机制、机制又分别诞生于哪个版本？
(b) 写出 `G` 的展开结果。

&lt;details>&lt;summary>答案要点&lt;/summary>

(a) `P` → **TS 2.1（2016-12）**：依赖 `keyof` + 映射类型（均 2.1）+ 内置 `Partial`（同批内置）。`GetterNames` → **TS 4.1（2020-11）**：映射类型（2.1）+ **`as` 键重映射（4.1）** + **模板字面量类型（4.1）** + 固有 `Capitalize`（4.1 随模板字面量一起加的四个固有字符串工具类型之一）。中间隔了整整四年——这就是「类型体操能力是逐步拼出来的」的具体含义。
(b) `G = { getName: () => string }`：`as` 把键 `name` 重映射为 `` `get${Capitalize<"name">}` `` → `"getName"`，值类型 `() => T["name"]`。

&lt;/details>

**题 3（补充部分 · 硬件可观察）** 三行代码，逐行预测输出，并指出每一行对应的「计算机本身的」事实：

```js live noInline
console.log(2 ** 53 === 2 ** 53 + 1);
console.log(new Uint8Array(new Uint32Array([1]).buffer)[0]);
console.log(typeof SharedArrayBuffer);
```

&lt;details>&lt;summary>答案要点&lt;/summary>

1. `true`：double 只有 53 位有效位，2^53 + 1 不可表示 → 舍回 2^53。硬件事实：IEEE 754（1985）——当年消费级 CPU 连硬件 64 位整数都没有，所以 1995 年「一把梭 double」是合理决定。
2. `1`：Uint32 的 1 在内存中是 `01 00 00 00` → 小端序。硬件事实：x86-64/arm64 一律小端；TypedArray（2011，WebGL）是语言向硬件内存布局妥协的产物。
3. `"function"`（Node 环境）：SAB/Atomics 在服务器从未被禁。硬件事实：Spectre（2018-01）投机执行缓存侧信道 → 浏览器禁用，要求跨源隔离才重新启用。**同一个 API 在浏览器和 Node 可用性不同，本身就是硬件安全史的化石。**

&lt;/details>

**题 4（补充部分 · 归因）** 不查资料回答：

(a) Dart（新语言 + 自带 VM）失败了，TS（JS 子集 + 擦除层）成了——从「地形」层面给出两个证据。
(b) 从 esbuild / tsgo 的「快」里挑三条优化理由，分别指出它们各自对应哪次计算机变革。

&lt;details>&lt;summary>答案要点&lt;/summary>

(a) 证据一：ES4（1999–2008）——「往 ECMAScript 本体里加类型」在委员会层面已经死过一次；证据二：Dart 本身——2011 想替换运行时，2015 放弃内嵌 Chrome，转向 Flutter 才活下来。浏览器是 JS 的运行时且无人拥有它 → 类型只能做成运行时之上的可擦除层；叠加 ES4 教训确立的「渐进优于推倒重来」，TS 的三条设计决策是被地形逼出来的，不是选出来的。
(b) ① 并行吃满多核 ← 频率墙（2004–2005）后单核性能不再免费增长；② 无 JIT 暖机、快启动 ← AOT 复兴（移动功耗、CLI 冷启动）；③ 共享单一 AST 形状 ← 内存墙（缓存友好的数据形状，与 V8 隐藏类同源）。

&lt;/details>

## 回扣与下一步

- 笔记 01：`typeof null` 在类型转换章已遇过——现在你知道它为什么修不了；
- 笔记 07：V8（2008）是 JS 性能革命的原点，JIT 细节在那——练习里暖机差距只有 ~15% 的原因（现代分层管道）也在那；
- 笔记 04：async/await 的 C# 血统与「库先、规范追认」管线的异步篇；
- 笔记 16：CJS/AMD/UMD/ESM 战争的完整版在这里只是提了时间线；
- 笔记 23：ES5 `defineProperty`（Vue 2）→ ES2015 `Proxy`（Vue 3）就是「响应式实现随规范演进」的活案例；
- 笔记 26：TS 7.0 换了实现语言，但 scanner→parser→binder→checker→emitter 管道不变。
- 下一专题继续按大纲阶段 5 推进。

