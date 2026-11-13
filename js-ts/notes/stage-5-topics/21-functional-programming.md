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
