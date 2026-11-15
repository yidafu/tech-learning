---
mdx:
  format: mdx
references:
  - 24-interview-prediction-questions
---
# 21 · 函数式编程：纯函数、组合与柯里化（TS 视角）

> 对应大纲：阶段 5 专题深入 —— 函数式编程（纯函数、组合、柯里化在 TS 中的表达）

## 学习目标

1. 用「同样输入 → 同样输出 + 无副作用」两判据识别纯函数，讲清引用透明如何带来可测性与可缓存性（memoize 的实现要点与陷阱）
2. 理解「把副作用推到系统边界」的组织方式：核心逻辑保持纯，I/O 集中在边缘
3. 区分 `const` 与 immutability、掌握 `readonly` 类型化与结构共享的概念
4. 讲清柯里化（curry）与偏应用（partial application）的区别（表格），能在 TS 里实现两者并类型化
5. 手写 compose/pipe，验证结合律，理解 point-free 的利弊
6. 说清 TS 类型化 pipe「变长元组重载」的实现思路与限制
7. 一句话讲清函子（Functor）与单子（Monad），用 `Array.prototype.map/flatMap` 落地
8. 建立「混合式 FP」的工程判断：什么时候值得纯函数化，什么时候是教条

## 关键概念

一手依据：《Mostly Adequate Guide》（Professor Frisby's Mostly Adequate Guide to Functional Programming，下称 MAG）第 3–7 章、第 9 章（Monad）；MDN《Array.prototype.map / flatMap》《Arrow functions》；TS Handbook《Variadic Tuple Types》。

### 1）纯函数与引用透明

纯函数的两个判据（MAG ch.3）：

1. **相同输入，永远得到相同输出**（输出只由输入决定，与环境无关）；
2. **没有可观察的副作用**（不写文件、不发请求、不改外部变量、不依赖可变全局状态）。

「引用透明」（referential transparency）：一个表达式可以**替换成它的值**而程序行为不变。纯函数的调用具有引用透明性 —— `double(21)` 永远可以安全地替换成 `42`。这是两类工程收益的根：

- **可测性**：单测不需要 mock 任何东西，断言就是 `f(input) === expected`；不需要「准备环境 → 调用 → 清理环境」。
- **可缓存性**：既然输出只由输入决定，就能按输入缓存输出 —— 这就是 memoize 的合法性来源。反过来，**不纯的函数 memoize 后行为会被改变**（副作用从 N 次变成 1 次），这是线上事故的常见来源。

**memoize 实现要点**（见练习 01）：

- 用 `Map` 而非对象做缓存：key 不限于字符串字面量、无原型链污染；
- Map 的 key 用 SameValueZero 比较，对象参数每次都是新引用 → 必须用 `keyFn` 把参数**序列化**成原始值；
- 序列化的三个坑：① 对象属性顺序不同 → 内容等价但 key 不同（缓存假未命中）；② `undefined`/函数/Symbol 属性会被 `JSON.stringify` 丢弃；③ `NaN`/`Infinity` 序列化成 `null` → 不同参数碰撞出同一个 key（**假命中，直接算错**）；
- 对策：keyFn 取业务主键（如 `userId`），或先按 key 排序再序列化。

### 2）副作用与「效应推到边界」

完全不写副作用的程序没有意义（没有输出）。FP 的工程主张不是「消灭副作用」，而是**把它推到系统的边界**（MAG ch.5 “A Chapter of Sorrows” 的核心教训）：

```
核心域逻辑（纯）：参数 → 返回值，可测、可组合、可缓存
        ↑ 调用                ↓ 返回结果
边界（不纯）：HTTP / DOM / 日志 / 随机数 / 时钟 / 全局状态
```

判断一个函数纯不纯的速查：把它想象成「查表」—— 如果存在一张无限的表能从输入查出输出，它就是纯的（`Math.random`、`Date.now`、`fetch` 都不存在这样的表）。

### 3）不可变性

三个层次要分清：

- **`const` ≠ immutable**：`const` 只锁定**绑定**（变量不能再指向别处），对象内容照样能改：`const a = {x:1}; a.x = 2` 合法。MDN 明确称之为「常量声明」而非「不可变对象」。
- **类型层 immutable**：`readonly` 属性、`Readonly<T>`、`ReadonlyArray<T>`（`readonly T[]`）、`as const`。注意 TS 的 readonly 是**编译期契约**，运行期不存在（抹掉类型后 `obj.x = 2` 照跑）；深层不可变要自己写 `DeepReadonly`（阶段 3 类型体操做过）。
- **结构共享（structural sharing）**：函数式更新不复制整棵对象树，而是「新对象复用旧对象的未变分支」：

  ```text
  setUser({...user, name: 'new'})   // 浅拷贝一层：user 的其它字段引用共享
  setList([...list, item])          // 数组「追加」也是新数组 + 共享元素引用
  ```

  Immer / Redux Toolkit 的 `produce` 用 Proxy 记录你改了哪条路径，最后只复制受影响路径（copy-on-write），兼顾「写起来像可变」与「结果是不可变」。这也是 React「新引用 → 重渲染」能与「省内存」共存的原因。

### 4）高阶函数

定义（MAG ch.4）：接收函数作为参数，或返回函数的函数。JS 里函数是一等公民（值），所以 `Array.prototype.map/filter/reduce`、`setTimeout(fn)`、`memoize(fn)`、`curry(fn)` 全是高阶函数。三种典型形态：

- **接收函数定制行为**：`map(fn)`（把「对每个元素做什么」抽象出来）；
- **返回函数（延迟/偏化）**：`bind`、防抖节流包装器、`curry`；
- **两者兼有**：`pipe`/`compose`（吃一组函数，吐一个新函数）。

闭包是高阶函数的实现基础：返回的函数「记住」定义时的词法环境（阶段 1 已展开）。

### 5）柯里化 vs 偏应用（表格）

| 维度 | 柯里化 curry | 偏应用 partial |
| --- | --- | --- |
| 形态变化 | `(a,b,c)=>R` → `a=>b=>c=>R`（拆成单参链） | `(a,b,c)=>R` → 固定前缀后 `(...rest)=>R` |
| 调用节奏 | 一环一参，逐环给出（`f(1)(2)(3)`） | 一次固定一批，剩余**一次给齐**（`p(2,3)`） |
| 能否跳位固定参数 | 需占位符版本（`f(_, 2)(1, 3)`） | 只能固定**前缀**，不能固定中间位 |
| 类型化难度 | 定长重载可实现（`Curry3`）；任意元数没有实用解 | 需要元组「减前缀」类型，同样要定长重载 |
| 典型用途 | 配置链式收敛（`log(level)(msg)`）、point-free | 依赖注入（`fetchWithToken = partial(fetch, url, headers)`） |

一句话区分：**curry 是「让函数随时可以少吃一点参数」，partial 是「现在就先喂它几个参数」**。lodash `_.curry` 默认带占位符 `_.`，是对两者能力的合流。见练习 03。

### 6）组合 compose / pipe 与结合律

- `pipe(f, g, h)(x) = h(g(f(x)))`：数据从左到右流（可读性优先）；
- `compose(f, g, h)(x) = f(g(h(x)))`：数学记法 `f ∘ g ∘ h`，从右到左（代数传统）；
- **结合律**：`(f ∘ g) ∘ h = f ∘ (g ∘ h)`。这让长管道可以任意切分、预组合、复用半成品（`const normalize = pipe(trim, lower)` 之后随时续接），而语义不变 —— 组合能当「搭积木」用，靠的就是这条代数性质（MAG ch.5 的 compose 定律）。
- 实现核心只是一个 `reduce` / `reduceRight`（见练习 02）。

### 7）point-free 风格：利与弊

point-free（tacit）：定义函数时不出现参数，直接用函数组合表达。

```ts
// 有参（point-ful）
const shout = (s: string) => exclaim(upper(s));
// point-free
const shout2 = pipe(upper, exclaim);
```

- **利**：消灭「参数搬运」胶水代码；命名的是**变换**而非中间值；强迫你思考数据流。
- **弊**：过长的无参管道难打调试断点（参数看不见了）；类型报错落在整条链上，定位慢；读者要在脑内展开数据流。工程经验：**1–4 个环节的 pipe 用 point-free，再长就抽中间函数并命名**。

### 8）TS 类型化 pipe：变长元组重载的思路与限制

目标签名：`pipe(strLen, double, gt5, label)` 的类型应推导为 `(x: string) => string`，且中间任何一环类型断链都在**调用处**报错。

- **思路 A（运行时简单 + 定长重载驱动校验）**——fp-ts / effect 的做法：实现签名用 `any`，另写一组**逐元递增的重载**（1 元到 19 元）。相邻两个函数在重载里被 `A→B, B→C` 链起来，TS 对重载逐个匹配 → 断链立刻报错。练习 02 的 `typedPipe` 演示到 4 元。
- **思路 B（变长元组递归推导返回类型）**：

  ```ts
  type PipeReturn<T extends readonly Fn[]> = T extends readonly [(x: infer I) => infer R]
    ? (x: I) => R
    : T extends readonly [(x: infer I) => infer R, ...infer Rest extends readonly Fn[]]
    ? (x: I) => (PipeReturn<Rest> extends (...args: never[]) => infer RR ? RR : never)
    : never;
  ```

  递归拆解元组：首参取第一个函数的参数，返回值递归取剩余链的返回。它能把 `[typeof f1, typeof f2, ...]` 推导成最终签名（练习 02 的 `typeProbe`），**但它只推导不校验** —— 中间断链时它不会在调用处报错。
- **限制（面试高频）**：「一条泛型签名同时完成整链逐对校验 + 推导」目前做不到。把校验塞进参数位置（如 `...fns: T & ValidatePipe<T>`）会破坏 T 的推断（实测推断退化）；递归条件类型理论上可行，但报错信息差、展开慢。所以主流库都用「定长重载 + any 实现」—— 这是类型系统表达力与务实工程之间的经典折中。

### 9）函子与单子：一句话 + Array 落地

- **函子（Functor）**：实现了 `map` 且满足 Functor Laws（恒等/结合）的容器。一句话：**「装着值的容器，能把一个纯函数施加到容器里的每个值上，容器结构不变」**。`Array` 是最熟悉的函子：`[1,2].map(double)` → `[2,4]`。
- **单子（Monad）**：在函子之上再多一个 `flatMap`（bind，`>>=`），解决「map 之后嵌套容器」的问题。一句话：**「能 flatMap 的函子：把『装进容器的函数』应用到容器值上并把结果摊平，从而让链式计算不层层嵌套」**。`[[1],[2]].flatMap(x => x.map(double))` → `[2,4]`（不是 `[[2],[4]]`）。Promise 也是单子：`.then` 既是 map 又是 flat（thenable 会被摊平 —— 见笔记 24 异步题）。
- 律：`x.flatMap(f).flatMap(g) === x.flatMap(v => f(v).flatMap(g))`（结合律）。链不会因为拆嵌套而改变语义。

### 10）工程判断：混合式，不要教条

全盘 FP 在 JS/TS 生态成本很高的场景：DOM 事件、动画、与后端 IO、团队认知负担。实用主义的分界线：

- **值得纯函数化**：业务规则计算（价格、权限、状态转移 reducer）、数据变换（DTO → ViewModel）。这些是测试主战场，收益最大。
- **接受不纯**：入口（事件 handler、路由钩子）、IO 模块、日志。把它们做薄，只做「收集输入 → 调用纯核心 → 施加副作用」。
- 判断口诀：**逻辑越靠近「决策」越该纯，越靠近「世界」越可以不纯**。Redux 的 reducer 纯 / middleware 不纯、React 的 render 纯 / effect 不纯，都是这条线的官方化。

## 可运行示例

| 练习 | 覆盖点 | 运行 |
| --- | --- | --- |
| `exercises/functional-programming/01-pure-functions.ts` | 纯/不纯对照实验、memoize + keyFn 三坑、引用透明手动替换 | `npx tsx exercises/functional-programming/01-pure-functions.ts` |
| `exercises/functional-programming/02-compose-pipe.ts` | any 简版 compose/pipe、结合律验证、定长重载类型安全版、point-free 改造 | `npx tsx exercises/functional-programming/02-compose-pipe.ts` |
| `exercises/functional-programming/03-curry.ts` | 经典 curry、占位符版、partial 对照、`Curry3` 类型化 | `npx tsx exercises/functional-programming/03-curry.ts` |

每个文件顶部注释有逐行预期输出，运行后逐行比对。

## 易错点与面试高频

1. **「纯函数就是没有 return 之外的语句」**——错。判据是「输出只依赖输入 + 无副作用」；`console.log` 也是副作用（可观察）。
2. **memoize 一个发请求的函数**——副作用被缓存吞掉：第二次调用不再发请求。若语义要求「必须每次发」，这个函数本来就不该 memoize。
3. **`const arr = [1,2]; arr.push(3)`**——合法：`const` 锁绑定不锁内容；类型层要 `readonly number[]` 才拦（拦的也只是 TS 层）。
4. **curry 与 partial 混为一谈**——curry 是形态变换（一次一参的链），partial 是预先固定参数；面试常追问「lodash 的 `_.curry` 和 `_.partial` 区别」。
5. **把 pipe 的类型安全寄托在 `any` 简版上**——中间断链编译期无感。要类型安全就要重载（fp-ts 思路），并知道其元数上限。
6. **point-free 滥用**——长管道无参数名，可读性崩塌；调试断点无处下。
7. **`flatMap` 与 `map + flat`**——`xs.flatMap(f) === xs.map(f).flat()`（深度 1），单子结合律保证链式语义一致。
8. **「函数式一定慢」**——memoize 常常更快；不可变更新的浅拷贝成本通常可忽略（结构共享），真正的热点再上 Immer。

## 输出预测题

### 题 1（memoize 与副作用）

```ts live noInline
let reqCount = 0;
function getUser(id: number): string {
  reqCount += 1; // 模拟副作用：发请求
  return `user-${id}`;
}
const cache = new Map<string, string>();
const memoGet = (id: number): string => {
  const key = String(id);
  if (cache.has(key)) return cache.get(key) as string;
  const v = getUser(id);
  cache.set(key, v);
  return v;
};

const a = memoGet(7);
const b = memoGet(7);
console.log(a, b, reqCount);
```

输出是什么？为什么 `reqCount` 是这个值？

### 题 2（pipe 与结合律）

```ts live noInline
const inc = (x: number): number => x + 1;
const dbl = (x: number): number => x * 2;
const pipe =
  (...fns: Array<(x: number) => number>) =>
  (x: number): number =>
    fns.reduce((v, f) => f(v), x);

const left = pipe(pipe(inc, dbl), inc); // 先绑前两个
const right = pipe(inc, pipe(dbl, inc)); // 先绑后两个
console.log(left(3), right(3));
```

输出是什么？若把 `dbl` 换成 `(x) => x * 2 + 1`（不再是「纯数学意义上可交换关注」的问题，仅改函数体），结合律还成立吗？

## 预测题答案

### 题 1

```
user-7 user-7 1
```

逐步：① `memoGet(7)` 未命中 → 真调用 `getUser(7)`，`reqCount: 0→1`，缓存 `7 -> 'user-7'`；② `memoGet(7)` 命中缓存，**函数体（含副作用）完全不执行**；③ `reqCount` 停在 1。一句话原理：**memoize 的前提是纯函数——缓存命中意味着「不执行函数体」，副作用会被吞掉**；这既是它对纯函数安全的原因，也是它对不纯函数危险的原因。

### 题 2

```
9 9
```

逐步：两种结合顺序展开后都是同一串变换「+1 → ×2 → +1」依序作用于 3：`3+1=4 → 4×2=8 → 8+1=9`。left 先绑前两个（`pipe(pipe(inc, dbl), inc)`），right 先绑后两个（`pipe(inc, pipe(dbl, inc))`），只是**分组方式**不同，变换的先后次序没变 —— 这正是结合律的内容。把 `dbl` 换成 `(x) => x * 2 + 1` 后实测输出 `10 10`，依然一致：**结合律与具体函数的内容无关**（换成什么函数都成立）；与函数内容有关的是交换律（`pipe(inc, dbl) ≠ pipe(dbl, inc)`，`4×2=8` 与 `6+1=7`），那才是不成立的。

## 延伸阅读

- 《Mostly Adequate Guide》ch.3–7（纯函数/柯里化/组合）、ch.9（Monad）—— 本笔记函数式部分的一手依据
- MDN：《Array.prototype.flatMap》《Map》《const》文档
- TS Handbook：《Variadic Tuple Types》
- fp-ts 源码 `function.ts` 里 `pipe` 的 19 个重载 —— 「定长重载」路线的工业实现
- Immer 文档《How Immer works》：结构共享与 copy-on-write

## 附：FP 三问收尾（把概念钉进工程判断）

学完函数式的概念与练习之后，真正要在项目里落地的判断收敛为三问——本附把三问连同答案口径钉死：

### 一问：这个抽象值得吗（代价比）

- **收益信号**：同一变换出现在 ≥3 个上下文；测试需要"纯函数可枚举输入"；并发/缓存想拿"引用透明"的红利；
- **代价信号**：团队不熟（可读性税）；性能热点（分配器压力）；调试链变长（栈帧不再直观）；
- **判据**：数据变换类（map/filter/reduce 组合）默认值得；流程控制类（用 monad 管理业务分支）只在复杂度临界时值得。

### 二问：落到什么深度（分层谱系）

| 层 | 写法 | 何时停 |
|---|---|---|
| L0 命令式直写 | for + 临时变量 | 热点路径（分配敏感） |
| L1 表达式集合 | map/filter/reduce、箭头函数 | 默认层 |
| L2 函数组合 | pipe/compose、柯里化、point-free | 变换链 ≥3 步才用 |
| L3 类型层 FP | Result/Either、ADT + 模式匹配 | 错误传播复杂到需要显式建模 |
| L4 完整 FP 库 | fp-ts 风格 HKT | 极少数领域（金融/解析器） |

每个项目都有自己的合理停层——L1 是默认，L2 起需要团队共识，L3 起需要文档化约定。**"停在哪层"是架构决策不是个人口味**，混层才是可读性事故的主因。

### 三问：怎么不被反噬（常见反模式）

- 无意义的柯里化：单调用点的函数做成 curry，读者要脑内部分求值；
- point-free 迷信：为消除参数把逻辑搬进组合链，栈不可读；
- 惰性滥用：把有副作用的操作塞进"惰性序列"，求值时机变成薛定谔的坑；
- 不可变的表演：一层浅拷贝当深不可变用，改了嵌套层还宣称"纯"。

四条反模式各对应一个"FP 词汇被用于 FP 语义之外"的场景——判断标准只有一条：**这个写法让数据的变换更可预测了吗**？是，用；不是，回 L0/L1。

### 收尾一句话

函数式的工程价值不在"函数式编程"这个标签，而在两个可检验的性质：**纯函数让测试变枚举、不可变让并发变简单**——任何写法拿不出这两条中的至少一条，就退回普通写法。

### 与站内其他篇的接口（复述收尾）

- 纯函数与不可变：[02-作用域与闭包](../stage-1-js-core/02-scope-and-closures.md) 的闭包捕获是"隐式可变状态"的头号来源——FP 化改造常从这里开刀；
- 柯里化与组合：[32-ts-type-challenges](../stage-3-ts-types/32-ts-type-challenges.md) 的 Curry 题是这个概念的类型层版本；
- Result/ADT：[13-ts-type-theory](../stage-3-ts-types/13-ts-type-theory.md) 的代数类型是 L3 层的地基。

## 附：三问速查表（一页版）

| 场景信号 | 应对 | 层级 |
|---|---|---|
| 同一变换出现 ≥3 处 | 抽组合函数 | L1→L2 |
| 错误处理分支爆炸 | Result/Either 建模 | L3 |
| 测试需要枚举输入 | 抽纯函数、注入依赖 | L1 |
| 热点路径分配压力 | 退回 L0 + 复用缓冲 | L0 |
| 团队新人多 | 停在 L1，L2 起写 ADR | 共识 |
| 并发共享状态 | 不可变结构 + 结构共享 | L1+ |

一页版的价值是"review 现场可查"——每行都是一个可以直接引用的裁决依据，比"要不要函数式"这种大问题好回答得多。

收尾一句话（增补）：FP 不是风格而是**约束的购买**——每往上一层买"可预测性"，付"间接性"；知道自己在哪层、为什么付钱，才算会用。

### 补充：L2 组合的两个纪律（进组合链前的门槛）

- 链上每个函数必须可独立测试（纯或显式注入副作用）——有一个不纯，整条链的可推理性归零；
- 链长硬上限：超过 5 步先拆命名中间层（可读性劣化早于抽象收益出现）。

两条纪律是"组合爆炸可读性事故"的疫苗——review 时看到超长链直接要求拆名。

补一句 L2 的工具位：`pipe` 手写版在练习工程里有完整实现（含类型层重载），团队引入组合链前先读那个实现——类型重载链的长度就是"TS 愿意陪你玩多少个参数"的边界，超过就该退回具名函数了。

---

## 机制深一层：引用透明的判据边界、函子代数律与 Lens 组合

### 引用透明的操作性检验：替换实验

引用透明的判定不是「语法上看不到副作用」，而是**替换实验**：把表达式替换成它的值，程序的所有可观察行为（返回值、副作用次数、耗时量级）都不变。三个容易漏判的边界，判定时必须下探：

- **属性访问器藏副作用**：`obj.count` 若是 getter 且每次读取自增，句法上是属性访问、语义上是副作用。判定必须追到定义处，不能停在调用形态。
- **「半纯」函数读模块级配置**：函数体只做计算，但读了模块顶层的配置常量——配置不变时它纯，配置热更新后纯性悄悄破裂。判据：**纯性是相对「环境闭包」而言的**；把环境显式参数化（配置变成参数传进来）才能把纯性钉死。
- **时序敏感**：读 `Date.now()`、`performance.now()`、`Math.random()` 的函数不纯；抽时钟（把当前时刻变成参数）是标准的纯化手法——调用方（边界）读一次时刻、显式传入，函数恢复引用透明。

替换实验同时是 code review 的速判法：看到 `render(f(b))`，问一句「把 `f(b)` 换成它的返回值，行为会变吗」——若 `f` 内部有日志或埋点，替换后副作用少一次，行为变了，`f` 就不纯。这个动作纯目力可完成，评审现场即可执行。

### 函子代数律与实际违反案例

以 Array 为例，两条律的正式陈述：

- **恒等律**：`xs.map((x) => x)` 与 `xs` 元素相同、结构相同；
- **结合律**：`xs.map(f).map(g)` 与 `xs.map((x) => g(f(x)))` 结果相同。

律不是仪式——**任何对 map 的「顺手优化」都必须过律的检验**。看一个真实的违反案例：有人给 map 加了「顺带清理空值」的能力，实现为条件收集：

```js
const compactMap = (xs, f) => {
  const out = [];
  for (const x of xs) {
    const v = f(x);
    if (v !== null && v !== undefined) out.push(v); // 多做了一步「清理」
  }
  return out;
};
const xs = [1, -2, 3];
const f = (x) => (x > 0 ? x : null);
const g = (n) => n * 10;
console.log('pathA =', JSON.stringify(compactMap(xs, f).map(g)));        // 先清后映射
console.log('pathB =', JSON.stringify(compactMap(xs, (x) => g(f(x)))));  // 结合律要求的等价形式
const ys = [1, null, 3];
console.log('恒等律 =', JSON.stringify(compactMap(ys, (x) => x)), '而 ys =', JSON.stringify(ys));
```

实跑收据（node v24.10，连跑多次一致）：

```
pathA = [10,30]
pathB = [10,0,30]
恒等律 = [1,3] 而 ys = [1,null,3]
```

推演：pathA 先清出 `[1,3]` 再映射；pathB 把 g 塞进回调，`null` 乘十得 `0`、不是 null，清理没发生——两路径结果不同，**结合律破坏**；恒等律同样破坏（输入含 null 时 `x => x` 都不保元素）。工程翻译：**map 的语义是契约——一对一变换、不增不减、不改序**；任何增删元素的诉求都该用 filter/flatMap 显式表达，而不是藏进 map。review 判据：任何 map 实现（或封装）里出现条件收集，直接要求拆分。

顺带一句 Promise 的辨析：`then` 兼具 map 与 flat 双语义（回调返回非 thenable 走 map、返回 thenable 走摊平），所以「Promise 满足哪条律」必须先拆开再谈——律是对单个操作的命题，混合操作要分别验证（thenable 摊平的细节在 24 册异步专题）。

### Lens：函数式的「可寻址引用」

透镜是「读 + 写」一对函数——`get: (s: S) => A` 与 `set: (a: A, s: S) => S`（set 返回新结构、不原地改）。它把「嵌套字段的访问路径」本身变成可传递、可组合的值。三条律保证它 behave 得像一个引用：

1. **set-get 回路**：写后读必得刚写的值；
2. **get-set 回路**：用读到的值写回去，结构不变；
3. **set-set 幂等**：连写两次，后者覆盖前者——保证 set 不偷改别的字段。

组合的实现只有两行，结构共享自动成立。完整最小例：

```js
const lensProp = (k) => ({
  get: (s) => s[k],
  set: (v, s) => ({ ...s, [k]: v }),
});
const composeLens = (l1, l2) => ({
  get: (s) => l2.get(l1.get(s)),
  set: (v, s) => l1.set(l2.set(v, l1.get(s)), s),
});
const user = { name: 'a', addr: { city: '杭州', zip: '310000' } };
const cityOf = composeLens(lensProp('addr'), lensProp('city'));
const next = cityOf.set('上海', user);
console.log('原对象 city =', user.addr.city, '| 原对象 zip =', user.addr.zip);
console.log('新对象 city =', next.addr.city, '| 新对象 zip =', next.addr.zip);
console.log('顶层新建 =', next !== user, '| addr 新建 =', next.addr !== user.addr);
console.log('组合 get =', cityOf.get(next));
```

实跑收据（node v24.10，多次一致）：

```
原对象 city = 杭州 | 原对象 zip = 310000
新对象 city = 上海 | 新对象 zip = 310000
顶层新建 = true | addr 新建 = true
组合 get = 上海
```

解读：只改 city 一层，但顶层与 addr 都是新引用（set 的浅拷贝语义），zip 原样保留——这正是「不可变更新 + 结构共享」在 Lens 里的具体形态。React/Redux reducer 里手写的嵌套展开更新（`{...state, addr: {...state.addr, city}}`），就是 composeLens 的展开式写法；样板超过三层就该换 Lens 级抽象（`set` 的组合代替逐层展开）。Lens 属于 L3 层工具（谱系见文末对齐表）。

---

## 手推配方：compose/pipe 与 curry 的类型签名逐步推演

**目标 1：推 `pipe(f, g)` 的类型。** 设 `f: (x: string) => number`、`g: (x: number) => boolean`。二元重载的形状：

```ts
declare function pipe<A, B, C>(
  f1: (a: A) => B,
  f2: (b: B) => C
): (a: A) => C;
```

推演步骤：

1. TS 从第一个实参抓取 A 与 B：`f` 的参数是 string → `A = string`；返回 number → `B = number`；
2. 用已锁定的 `B = number` 检查第二个实参：`g` 的参数是 number，匹配；`g` 的返回 boolean → `C = boolean`；
3. 结果签名代入：`(a: string) => boolean`——与手工推导 `pipe(f, g)(x) = g(f(x))` 的类型完全一致。

断链推演：若 `g` 是 `(x: boolean) => boolean`，第 2 步里 B 已锁成 number、g 的参数却是 boolean → 报错落在第二个实参处。**校验能力来自「相邻两个参数共享同一个类型变量 B」**——这一条约束就是「链上类型不断裂」的类型学表达。

**目标 2：为什么 any 实现签名不破坏这一切？** TS 的规则：函数带重载声明时，调用只按重载逐一匹配，**实现签名仅约束函数体自身、不参与调用检查**。「实现写 any、校验靠重载」因此是合法分工而非取巧（一手依据：TS Handbook《More on Functions》的 Overloads 小节——实现签名对调用方不可见）。理解这条规则，才能理解 fp-ts 的 19 个重载为什么全部堆在声明层。

**目标 3：三元 curry 的类型化。** 现成的配方是一次条件类型抓全参数、再逐层嵌套箭头：

```ts
type Curry3<F> = F extends (a: infer A, b: infer B, c: infer C) => infer R
  ? (a: A) => (b: B) => (c: C) => R
  : never;
```

推演：`F = (a: number, b: string, c: boolean) => void` 匹配条件分支 → infer 一次抓出 `A = number`、`B = string`、`C = boolean`、`R = void` → 结果类型 `(a: number) => (b: string) => (c: boolean) => void`。配方口诀：**元数固定的 curry 化等于「infer 抓参数元组 + 逐层包箭头」**。元数不固定时没有实用解的机制根源也在这里：infer 无法对「任意长度的参数列表」逐层展开——变长版本要用元组递归拆参，报错信息差、展开慢（正文 §8 的限制，此处给出了它在 infer 层面的原因）。

---

## 工程三陷阱（函数式）

1. **组合链混进时序依赖的不纯函数**。链上某个环节读了共享可变变量（全局费率、模块级计数器、环境配置），整条链的输出从「输入的函数」变成「输入 × 调用时刻的函数」。实跑收据（node v24.10）：

   ```js
   let now = 0;                               // 模拟共享费率
   const tax = (amount) => amount + now;      // 不纯：读外部变量
   const total = (items) => items.map(tax).reduce((a, b) => a + b, 0);
   const items = [100, 200];
   console.log('时刻一 total =', total(items));
   now = 5;
   console.log('时刻二 total =', total(items));
   ```

   输出 `300` 与 `310`——同样的 items、两次调用结果不同。这类代码单测通过（测试时刻费率恰好稳定）、生产偶发错账（费率热更新后）。修复方向：环境读取提升为参数（`tax` 改收费率，pipe 第一环注入），total 恢复纯函数。排查口诀：**「同样输入、两次调用、结果不同」的函数，沿闭包捕获链找共享可变量**。
2. **Result 与异常双轨制**。L3 层用 Result/Either 建模了错误通道，边界上又混用 throw——两套通道并存时，调用方对「这个函数的错误走哪条」失去判断：该判 err 的当合法值用、该处理的异常没人接。收敛规则：**模块内部一种错误一种通道**；跨边界（尤其 async 边界）统一转换成 Result；throw 只保留给编程错误（断言失败、不变量破坏），运行期可预期的失败一律 Result。review 判据：catch 块出现在模块内部（而非系统边界）多半是双轨制的症状。
3. **浅冻结/浅只读当深不可变**。`Readonly<T>` 与 `Object.freeze` 都只覆盖第一层——嵌套对象照样可变。收据：下面代码经 tsc 5.9.3 `--strict --noEmit` 编译**零报错**（退出码 0，实跑）：

   ```ts
   type User = { name: string; addr: { city: string } };
   const u: Readonly<User> = { name: 'a', addr: { city: '杭州' } };
   u.addr.city = '上海'; // 只读只到第一层，这里不报错
   ```

   运行期的 `Object.freeze` 同理是浅冻结（嵌套层赋值不抛错，除非深层也逐层冻结）。对策：深层契约自写 `DeepReadonly`（阶段 3 类型体操已实现过）或运行期深冻结；更实用的替代是让「不可变更新 + 结构共享」（Immer / 展开写法 / Lens）成为写法惯性——防线不如习惯。

---

## 进阶输出预测题

### 题 3（Lens 组合与结构共享）

```js
const lensProp = (k) => ({
  get: (s) => s[k],
  set: (v, s) => ({ ...s, [k]: v }),
});
const composeLens = (l1, l2) => ({
  get: (s) => l2.get(l1.get(s)),
  set: (v, s) => l1.set(l2.set(v, l1.get(s)), s),
});
const user = { name: 'a', addr: { city: '杭州', zip: '310000' } };
const cityOf = composeLens(lensProp('addr'), lensProp('city'));
const next = cityOf.set('上海', user);
console.log('原对象 city =', user.addr.city, '| 原对象 zip =', user.addr.zip);
console.log('新对象 city =', next.addr.city, '| 新对象 zip =', next.addr.zip);
console.log('顶层新建 =', next !== user, '| addr 新建 =', next.addr !== user.addr);
console.log('组合 get =', cityOf.get(next));
```

写出四行输出。追问：若 `lensProp` 的 set 改成原地写 `s[k] = v` 再返回 `s`，四行输出里哪些值会变？

### 题 4（flatMap 只摊平一层）

```js
const nested = [[[[1]]]];
console.log('flatMap 一次 =', JSON.stringify(nested.flatMap((x) => x)));
console.log('map 后结构 =', JSON.stringify(nested.map((x) => x)));
const pairs = [1, 2].flatMap((n) => [n, n * 10]);
console.log('flatMap 展开 =', JSON.stringify(pairs));
```

写出三行输出。追问：要把 `[[[[1]]]]` 完全摊平成一层数字，语言内置的解法是什么？

### 题 5（时序依赖不纯）

```js
let now = 0;
const tax = (amount) => amount + now;
const total = (items) => items.map(tax).reduce((a, b) => a + b, 0);
const items = [100, 200];
console.log('时刻一 total =', total(items));
now = 5;
console.log('时刻二 total =', total(items));
```

写出两行输出。追问：不改变「读全局费率」这一业务需求，怎么让 `total` 恢复引用透明？（答案见文末）

---

## 进阶预测题答案与收据

### 题 3

实跑输出（node v24.10，多次一致）：

```
原对象 city = 杭州 | 原对象 zip = 310000
新对象 city = 上海 | 新对象 zip = 310000
顶层新建 = true | addr 新建 = true
组合 get = 上海
```

推演：`composeLens` 的 set 先在里层（addr）用 cityLens.set 造出新的 addr，再在外层用 addrLens.set 造出新的顶层——两层浅拷贝、深层引用共享，zip 原样保留。追问答案：原对象 city 会变成「上海」（原地写污染原对象）、顶层新建变 false、addr 新建变 false——set 律（get-set 回路）要求「写回不改变原结构」，原地写直接破坏不可变语义，调用方持有旧引用时读到新值，是并发与时间旅行调试（Redux DevTools）的天敌。

### 题 4

实跑输出（node v24.10）：

```
flatMap 一次 = [[[1]]]
map 后结构 = [[[[1]]]]
flatMap 展开 = [1,10,2,20]
```

推演：`flatMap` 等于 `map` 后接**深度 1** 的 flat——四层嵌套只削一层得三层；第三行是它的正常用武之地（回调返回数组、摊开并入）。追问答案：`Array.prototype.flat` 接受深度参数，`nested.flat(Infinity)` 递归摊平到全一层——语言内置，不必手写递归。原理链接：flatMap 的「只摊一层」正是单子 bind 的形态（把「装进容器的函数」应用后摊平一层），多层嵌套的容器不是单次 bind 的目标。

### 题 5

实跑输出（node v24.10，连跑三次一致）：

```
时刻一 total = 300
时刻二 total = 310
```

推演：`tax` 读共享变量 `now`，两次调用之间 `now` 从 0 变 5——同样输入不同输出，引用透明的实测破坏形态。追问答案：把费率读提升到函数体外——`total` 改签名收费率（`total(rate, items)`），由调用方（系统边界）在调用时刻读一次费率并显式传入。`total` 恢复纯函数，测试可以直接枚举费率而无需操控全局变量；「谁在什么时刻读环境」这件事也被显式记录在调用点，而不是藏在函数体内。

---

## 与 L0~L4 谱系的对齐补遗

附录的分层谱系回答「停在哪层」，这里把本册每个知识点钉进对应层，并补上「入级信号与退级信号」——让升降级变成可检验的条件而非口味之争：

| 知识点 | 所属层 | 入级信号 | 退级信号 |
|---|---|---|---|
| 纯函数判据/引用透明 | L1 的地基 | 所有业务计算函数默认适用 | —（这是底线要求） |
| memoize + keyFn | L1 | 重复计算热点且参数有稳定主键 | 参数是复杂对象且无稳定主键 |
| curry/partial | L2 | 同一函数存在多个「固定前缀」复用点 | 只有一个调用点（脑内部分求值税） |
| pipe/compose 手写 | L2 | 链长 3~5 步且需复用半成品 | 断点调试时间超过编码时间 |
| pipe 的定长重载类型化 | L2 的类型工程 | 团队 TS 水平齐、链路类型稳定 | 类型报错难懂到需要文档解释 |
| 函子律/单子 | L3 的理论 | 容器抽象被两个以上类型复用 | 只有一个容器还在谈律 |
| Result/Either | L3 | 错误分支嵌套三层以上或跨多层传播 | 一层 try/catch 就能说清 |
| Lens | L3 | 嵌套不可变更新样板超过三层 | 一层浅拷贝够用 |
| HKT 完整 FP 库 | L4 | 领域是解析器/金融计算/编译器 | 其余几乎所有场景 |

两个信号值得单独强调。其一，**理论先行是 L3 误用的头号来源**：只有一个容器却先谈律、只有两层错误分支就上 Either——抽象税先于收益出现，review 时用「入级信号」列逐条对答即可拦下。其二，**样板长度是 L3 缺位的客观信号**：嵌套更新样板超过三层、错误传播开始跨模块，说明该引入对应抽象了——「忍着不抽象」与「提前抽象」都是错位。升降级的评审证据统一取自信号列：不是谁喜欢什么风格，是信号到没到。这张表与附录三问表配合使用：三问表回答「现在停在哪层」，对齐表回答「每个具体工具离哪层最近」。

---

## 补遗：函数纯度的五级光谱（评审口径）

「纯/不纯」的二分在实际评审里粒度太粗——两段都被判「不纯」的代码，风险与处置完全不同。把纯度拉开成五级光谱，每级配一个处置动作，评审时可以逐函数标级：

| 级别 | 定义 | 例子 | 评审处置 |
|---|---|---|---|
| P0 纯 | 同输入同输出，零可观察副作用 | 价格计算、格式化、reducer | 默认目标层 |
| P1 读环境 | 读配置/时钟/随机，不写入 | 读费率配置的计价函数 | 抽环境为参数，升到 P0 |
| P2 写局部 | 只写自己新建的对象或局部变量 | 局部缓冲、原地构建临时结构 | 允许（性能惯用法），review 时确认「局部」边界 |
| P3 写外部 | 改参数对象、全局变量、DOM、发请求 | 状态库写入、表单提交 | 集中到边界并显式命名（save/mutate 前缀约定） |
| P4 非确定 | 依赖并发时序、读共享可变状态 | 无锁共享计数、双重检查缓存 | 禁区（并发原语封装层除外） |

两个容易标错的案例，正好测出光谱的分辨率：

- **原地排序的快排**：只看函数体是 P2（写的都是局部下标）；但若排序目标是调用方传入的数组，它就是 P3——**写参数对象也是写外部**。同一实现、纯度随数据所有权而变，标级前先问「这块内存归谁」。
- **带局部缓存的函数**：缓存对象是函数私有、外部不可观察时是 P2，引用透明未破坏（替换实验仍通过）；但缓存键读了全局请求上下文就是 P1、缓存与并发请求竞态就是 P4——一个「缓存」细节可以把同一函数标到三个级别。

五级光谱的收尾口径一句话：**副作用不可怕，不可声明、不可定位的副作用才可怕**。P3 的处置不是消灭而是收拢（推到边界、写进函数名），P1 的处置是参数化，P4 才是真正要清零的级别。这份光谱与三问表、对齐表共同构成评审现场的三张纸：前者定风险等级，后两者定抽象层级。

评审实操是两步动作：第一步给改动涉及的每个导出函数标级（对照表格二十秒一个），第二步只对 P3 以上逐个问「为什么必须写外部、能不能收拢到边界」。标级本身不改变代码，但它把「这段代码纯不纯」的口舌之争变成了「它是 P 几、处置动作是什么」的对表核查——讨论从口味落到了判据上。团队把这个动作跑熟之后，P1/P2 的容忍边界与 P3 的收拢手法会自然形成共识，函数式的工程收益（可测、可缓存、可推理）也就跟着纯度水位一起涨上来。
