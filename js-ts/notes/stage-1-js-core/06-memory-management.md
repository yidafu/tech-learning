---
mdx:
  format: mdx
sources:
  - stage-1-js-core
---
# 06 · 内存管理：V8 垃圾回收、泄漏排查与 Weak 家族

> 对应大纲：阶段 1.6（内存管理：V8 垃圾回收（分代、标记清除）、常见泄漏场景、WeakMap/WeakSet/WeakRef/FinalizationRegistry）

一手依据：V8 官方博客 v8.dev/blog（重点「Trash talk: the JavaScript garbage collection」系列的分代/Orinoco 并行增量并发各篇）与 v8.dev/features/weakrefs（WeakRef/FinalizationRegistry 的语义与警告）；Weak 集合的 API 形状以 ECMA-262 的 WeakMap/WeakSet 抽象操作为准（可注册值 CanBeHeldWeak）。

## 学习目标

1. 讲清「可达性」判定：能从 root 出发画一条引用链的对象活、画不到的死——并解释为什么循环引用在 JS 里**不是**问题（对照引用计数）
2. 能画出 V8 分代 GC 的结构：新生代半空间复制（Scavenger）+ 对象晋升、老生代 Mark-Sweep/Mark-Compact，以及增量/并发/并行分别解决什么停顿问题
3. 对五类高频泄漏场景，每个都能给出「最小复现 + 一句修法」
4. 能回答「WeakMap 为什么没有 size / 为什么不可遍历」这类语义问题（答案在 GC 语义，不在 API 设计）
5. 会用三快照对比法定位泄漏，并知道 --expose-gc 只是实验工具不是生产手段

## 关键概念

### 1. 内存生命周期与可达性

生命周期三步：分配（字面量/new/闭包捕获）→ 使用 → 释放。JS 把第三步交给 GC，但**「什么时候释放」由可达性决定，不由你写没写 `= null` 决定**。

- **root 集**：全局对象（浏览器 `window`、Node `globalThis`）、**当前调用栈上所有帧里的局部变量与参数**、以及引擎内部持有的活动引用（如正在等待的 Promise 链、定时器回调闭包）。
- **可达性判定**：从 root 出发沿引用做图遍历（标记），标记不到的对象「不可达 = 可回收」。这是**追踪式 GC**（tracing），不是引用计数（reference counting）。
- 为什么强调这点：**循环引用在追踪式 GC 下不是泄漏**——两个对象互相引用但整体从 root 不可达，照样被回收。早期 IE 的 DOM 引用计数才会被循环引用卡死，那是历史包袱，别背到现代引擎头上。
- 「不可达即可回收」的推论：`obj = null` 本身不释放内存，它只是**剪断一条引用边**；对象是否死，取决于剪断后还有没有别的路径。多数时候局部变量随作用域结束自动消亡，不需要手动置 null——需要手动置 null 的场景恰恰是「生命周期长的容器意外持有短生命周期对象」（下文泄漏场景都属此类）。
- 例外边：**弱引用不构成可达边**。WeakMap 的键、WeakSet 的值、WeakRef 的目标、FinalizationRegistry 的注册目标，都不阻止目标被回收——这是第 4、5 节的立足点。

一个 30 秒的可达性小实验（配合 `--expose-gc` 的完整版见练习 02）：

```mermaid
flowchart LR
    root["root（全局/调用栈）"]
    keep["{ keep }（可达：活）"]
    arr["arr（已置 null）"]
    timer["timer（setInterval 回调闭包）"]
    bigCache["bigCache（活：定时器是 root 性质的持有者）"]
    a["a"]
    b["b（不可达：死，追踪式 GC 对环免疫）"]
    root -->|"kept"| keep
    root -. "边已剪断 ✗" .- arr
    root --> timer
    timer --> bigCache
    a <-->|"循环引用，但无 root 路径"| b
```

**分代速览表**（先建骨架，细节在下面三小节）：

| | 新生代 | 老生代 |
| --- | --- | --- |
| 容量 | 小（MB 级） | 大（GB 级） |
| 算法 | Scavenger（半空间复制） | Mark-Sweep（+ 按需 Mark-Compact） |
| 成本模型 | 与**存活**对象数成正比（死对象零成本） | 与堆规模/标记对象数相关 |
| 碎片 | 无（复制天然紧凑） | Mark-Sweep 有，Compact 消除 |
| 触发频率 | 高 | 低 |
| 对象来源 | 新分配 | 晋升的幸存者、大对象直接进老生代 |

### 2. V8 分代 GC：为什么分两代，每代怎么收

依据 v8.dev/blog「Trash talk: the JavaScript garbage collection（半空间）」「Concurrent marking in V8」「Parallel garbage collection（Orinoco）」等篇。

**分代假说**：绝大多数对象朝生夕死（函数内临时对象、中间数组）。按存活时间分代，对「短命」的用便宜算法高频收，对「长命」的用贵算法低频收。

**新生代（Young Generation，Scavenger 半空间复制）**：

- 结构：两块等大的半空间（from-space / to-space），总容量小（V8 默认约几 MB～几十 MB 级，随堆配置）。
- 回收过程（Cheney 复制算法的 V8 版）：把 from-space 里**仍被引用的**（root 直接或间接可达，含被老生代引用的「记录集」）对象**复制**到 to-space，然后整块 from-space 一次性清空——不需要逐对象释放，死了的对象连看都不看，这正是「多数对象已死」时最便宜的策略。
- **对象晋升（promotion）**：经历一次 Scavenge 仍存活的对象（或 to-space 放不下的大对象）复制进老生代。经验值「熬过两次回收晋升」，具体策略 V8 会自适应。
- 代价：空间换时间（任何时刻只有一半新生代可用）；存活对象多时复制成本上升——所以它只适合「死亡率极高」的新生代。

**老生代（Old Generation，Mark-Sweep / Mark-Compact）**：

- **Mark-Sweep（标记清除）**：从 root 标记所有可达对象，然后**只清除**不可达对象占用的内存块。不移动对象，速度稳定，但清除后内存出现**碎片**（hole）。
- **Mark-Compact（标记整理）**：标记后把存活对象**滑动聚拢**到内存一端，消除碎片。代价是移动对象需要更新所有指向它们的引用，更慢——所以 V8 只在碎片化到阈值时才做 compaction，平时 Mark-Sweep 为主、按需 compact。

**停顿问题与三色标记的演进**（面试「为什么会有卡顿」的完整答案链）：

- 老 GC 单次「全停顿」（stop-the-world）标记整堆，堆大了就是可感知的卡顿（几十到几百 ms）。
- **增量标记（incremental marking）**：把标记拆成小步，穿插在 JS 执行之间（写屏障 write barrier 记录增量期间被改动的引用），单次停顿变短，总时长略增。
- **并发标记（concurrent marking）**：大部分标记工作在**后台线程**做，主线程几乎不参与（v8.dev「Concurrent marking in V8」）。
- **并行（parallel）**：Scavenger 与 sweeping 也可以由多个辅助线程同时做，主线程只做最少的收尾（「Orinoco」项目的目标：把 major GC 的主线程时间压到几 ms 级）。
- 一句话总结三者：**增量=拆步骤、并发=移出主线程、并行=多线程一起干**——共同目标都是缩短主线程停顿，而不是「更快回收」。

一个对象的典型旅程（把上面的机制串起来）：

```js live noInline
function handle(req) {
  const temp = { rows: [] };        // ① 新生代 from-space 分配
  temp.rows.push(...req.items);
  return temp.rows.length;          // ② 返回后 temp 不可达
}                                    // ③ 下次 Scavenge：没被引用 → 直接留在 from-space 被整体清空（零成本死亡）
const cache = { hot: new Array(1e6) }; // ④ 大对象/长寿对象 → 晋升老生代，低频 Mark-Sweep 管理
```

**为什么 JS 不能选引用计数**：每次赋值都要更新计数（写路径开销）；环永远无法归零；跨线程共享计数更新需要原子操作。追踪式把成本集中到 GC 时刻，用分代把「大多数对象根本活不到 GC」变成优势。

### 3. 常见泄漏场景：最小复现 + 修法

统一心法：**泄漏 = 意外的可达边**。以下每个场景都先用一句话指出「哪条边」，再给复现。

**场景 1：意外全局变量**

```js live noInline
function calc() {
  result = heavyComputation(); // 忘了 const/let → 挂到全局对象，活到页面关闭
}
```

修法：`'use strict'`（ESM 默认严格，赋值给未声明变量直接 ReferenceError）+ lint 的 `no-implicit-globals`。注意：这里的泄漏是「全局对象的属性持有了大结果」，不是作用域问题。

**场景 2：被遗忘的定时器 / 事件监听器**（浏览器场景描述）

```js live noInline
function mountDashboard(el) {
  const bigCache = new Array(1e6).fill(0);   // 闭包持有的大对象
  const timer = setInterval(() => render(bigCache), 1000);
  el.addEventListener('resize', () => render(bigCache));
  return () => { /* 忘了清理 */ };
}
// SPA 路由离开后：dashboard 组件销毁，但 interval 与 listener
// 仍被事件循环/目标节点持有 → 回调闭包 → bigCache，整条链不可断
```

修法：卸载钩子里 `clearInterval(timer)` + `el.removeEventListener(...)`（或用 `AbortController` 的 `signal` 统一清理）。**定时器/监听器是 root 性质的持有者**，它们不死，闭包链就不死。

**场景 3：闭包持有大对象**

```js live noInline
function createHandler(rows) {      // rows: 100MB 数据
  const id = rows[0].id;            // 只需要一个小字段
  return () => console.log(id);
}
```

直觉以为闭包只捕获 `id`，但部分引擎实现按「整个变量环境」捕获——`rows` 可能因此活得和 handler 一样久。修法：在闭包外先提取需要的值（`const { id } = rows[0]` 再放进闭包），或让大对象的作用域尽早结束。现代 V8 有逃逸分析优化，但**不构成语义保证**，写代码按「闭包捕获整个词法环境」保守理解。

**场景 4：detached DOM 节点**

```js
const btn = document.querySelector('#go');
document.body.removeChild(btn);     // 从文档移除
const handlers = { click: () => {} };
btn.addEventListener('click', handlers.click);
globalThis.kept = handlers;          // JS 侧仍引用 btn（通过 listener 目标）→ 树虽被移除，节点不可回收
```

「detached」= 节点已不在文档树里，但 JS 变量/集合仍引用它：该节点连同其子树都保持可达。修法：移除前先 `removeEventListener`，并确保没有 JS 容器（Map/数组/全局变量）继续引用节点。DevTools 堆快照里搜 `Detached` 可直接看到（Detached DOMTree / Detached 节点的 Retainers 面板会指出 JS 侧的持有者）。

一个经典变体：`innerHTML` 整体替换看似「清空」了旧子树，但若旧节点曾被 JS 引用（如上面例子），替换后它们全部变成 detached 却不回收——「从文档消失」和「从内存消失」是两件事。

**场景 5：用 Map 做对象 → 元数据缓存**

```js live noInline
const metaCache = new Map();               // Map 的键是强引用！
function track(user) {
  metaCache.set(user, { lastSeen: Date.now(), history: [] }); // history 越积越大
}
// user 生命周期本应几秒，但只要 metaCache 活着，每个 user 都不可回收
```

修法：元数据不延长对象生命周期的场景（缓存/标记/私有数据）一律 WeakMap（见下节）；确需强引用的 LRU 用专门实现并设上限。

### 4. WeakMap / WeakSet：弱在「键的可回收性」

- **键必须是「可注册值」**：对象（ES2023 起还包括非注册 Symbol）。原始值按值传递、永不「回收」，弱引用对它们无从谈起，`new WeakMap().set('k', 1)` 直接 TypeError。
- **弱引用语义**：WeakMap 对**键**是弱引用（不阻止键被回收），对**值**仍是强引用。推论一：把对象本身存成值里的属性（`m.set(k, { self: k })`）会形成「值强引用键」的事实强环，键永远不可回收——规范不禁止，但语义上自败。推论二：从键能到达值（键死→条目死），从值**不应**回到键。
- **为什么没有 size / 不可遍历**：成员集合随 GC 变化。引擎随时可能清掉「键已回收」的条目，任何确定性的 size 或迭代顺序都无法自洽（「上一毫秒 size 是 3，现在是 2，谁对？」）。**这不是实现偷懒，是 GC 语义决定的必然**——面试答出这层因果即满分。
- 典型用途：
  - **对象元数据**：给第三方对象挂缓存/标记，对象死了元数据随之消失（对照场景 5）；
  - **私有数据**：`privateStore.set(this, {...})`，实例上无痕迹、随实例回收（现代代码可直接用 `#field`，WeakMap 方式利于理解原理，见练习 memory-management/01 Part 5）；
  - **WeakSet 去重/访问标记**：「这个对象处理过吗」只需要引用同一性判断，不应延长其生命周期。

### 5. WeakRef / FinalizationRegistry：观察回收的最后手段

- `new WeakRef(target)`：不阻止 target 被回收；`deref()` 存活返回对象、已回收返回 undefined。规范细节：**deref() 的返回值会被保持到当前 job 结束**（KeepDuringJob）——同一个同步任务里 deref 后立刻手动 GC 也看不到回收（练习 02 的实验教训）。
- `new FinalizationRegistry(held => ...)` + `register(target, held)`：target **被回收之后**，以 held value 为参数异步调用回调（held 通常用字符串 key，绝不能引用 target）。
- **规范的明确警告**（v8.dev/features/weakrefs 与 TC39 提案说明，逐条对应到行为）：
  1. 回调作为任务**异步**执行，时机不确定——可能 GC 后很久，顺序也不保证；
  2. 程序退出前**可能根本不执行**；
  3. 因此只能用于**机会性清理**（缓存失效），绝不能用于关键逻辑（释放锁/连接、提交数据）——正确性必须不依赖回调被调用；
  4. 不要在回调里 deref 同一对象「复活」它。
- **官方推荐用法**：可回收缓存——Map 存 `业务key → WeakRef(缓存值)`，FinalizationRegistry 在值被回收后删除对应槽位防 Map 膨胀（完整模式代码在 exercises/memory-management/02 底部注释）。

**Weak 家族总览**（选择器：按「你要什么语义」查表）：

| | 持有的引用 | 可遍历/计数 | 键/目标类型 | 典型用途 |
| --- | --- | --- | --- | --- |
| Map | 键、值都强引用 | 是（size/迭代/clear） | 任意 | 需要确定性集合语义 |
| WeakMap | 键弱、值强 | 否 | 可注册值（对象/非注册 Symbol） | 对象→元数据、私有数据 |
| WeakSet | 值（成员）弱 | 否 | 同上 | 去重/访问标记 |
| WeakRef | 目标弱 | —（单个句柄） | 对象 | 观察存活、缓存命中 |
| FinalizationRegistry | 注册目标弱（held 强引用） | —（回调式） | 对象 + 任意 held | 机会性清理/缓存失效 |

### 6. 排查思路（概念）

- **Heap snapshot 三快照对比法**（DevTools Memory 面板）：
  1. 快照 A（操作前）→ 重复执行疑似泄漏操作 N 次（如切 10 次路由）→ 快照 B → 强制 GC（面板垃圾桶按钮）→ 快照 C；
  2. 对比 B→C（或 A→C）的**增量**：按 Retained Size 排序，看「本应释放却仍增长」的构造器/对象，展开 Retainers 面板读出**是谁在引用它**——那条引用链就是泄漏边。
- **Allocation instrumentation on timeline**：记录每次分配的时间轴，看「蓝色条（分配）持续高于灰色条（回收）」的区间，定位到具体分配栈。
- **Node 环境**：`process.memoryUsage()` 粗看趋势；`node --inspect` + Chrome DevTools 同样可用；`v8.writeHeapSnapshot()` 在代码里触发快照。**`--expose-gc` 只用于实验**（把 gc() 交到你手里做确定性验证，如练习 02），生产代码永远拿不到这个确定性——这也是 WeakRef 语义「可能存活也可能已回收」必须两头处理的原因。

`process.memoryUsage()` 四个字段怎么看：

| 字段 | 含义 | 看泄漏时怎么用 |
| --- | --- | --- |
| `rss` | 进程实际占用物理内存 | 持续上涨的第一信号（含非 JS 部分） |
| `heapTotal` | V8 已申请的堆总量 | 与 heapUsed 的差是「未回收空间」 |
| `heapUsed` | 堆中实际使用 | 重复操作后 GC 仍不回落 → 重点怀疑 |
| `external` | 堆外内存（Buffer/字符串外置数据） | Buffer 泄漏看这里而不是 heapUsed |
- 判断口诀：**泄漏看的不是「内存高」，而是「重复操作后 Retained Size 单调增长且 GC 后不回落」**。

## 可运行示例

配套练习（均经实际运行验证，输出逐行写在文件头注释里）：

```bash
# WeakMap/WeakSet 的 API 形状 / 键必须是对象 / Map vs WeakMap 持有语义 / 去重 / 私有数据
npx tsx exercises/memory-management/01-weak-collections.ts

# WeakRef 确定性观察回收 + FinalizationRegistry 回调触发（注意 --expose-gc）
node --expose-gc exercises/memory-management/02-weakref-finalization-registry.mjs
```

WeakRef 确定性实验的三步骨架（细节与坑见练习 02 注释）：

```js
// node --expose-gc
const makeWeakRef = () => {
  const obj = { payload: new Array(1000).fill(0) };
  return new WeakRef(obj);          // obj 只活在本帧，返回后不可达
};
const ref = makeWeakRef();
await new Promise((r) => setTimeout(r, 0)); // 关键：跨宏任务边界
//   —— 1) deref 的 KeepDuringJob 在 job 结束才失效
//   —— 2) 工厂函数的旧栈帧彻底销毁（V8 保守栈扫描不再看到残留指针）
gc();
ref.deref() === undefined;          // true：对象已回收，WeakRef 没能留住它
```

## 易错点与面试高频

1. **「循环引用导致泄漏」**——现代引擎错。追踪式 GC 看可达性不看计数；只有历史 IE 的引用计数才怕环。
2. **「`obj = null` 释放内存」**——错。它只剪一条引用边；内存释放发生在下一次 GC 且对象不可达之后。手写置 null 的正确场景是「长寿容器持有短命对象」。
3. **「WeakMap 是『性能更好』的 Map」**——错。它牺牲了 size/遍历/清空（clear 已废弃），换「不绑架键生命周期」这一种语义；需要遍历/计数时它根本不可用。
4. **「WeakMap 的值也是弱引用」**——错。弱在键；值是强引用（所以值别引用键）。
5. **「FinalizationRegistry 可以当析构函数用」**——危险。回调时机不定、可能永不执行；只能做机会性清理。
6. **新生代为什么用复制而不是标记清除**：死亡率高时复制只碰活对象、整块清空零成本；代价是空间减半——只对「小而短命」的代划算。
7. **老生代为什么需要 Mark-Compact**：Mark-Sweep 产生碎片，未来大对象分配可能「总空闲够、连续块不够」；compaction 移动对象修碎片段，代价是更新全部引用，故按需触发。
8. **增量/并发/并行的区别一句话**：增量=拆小步穿插执行、并发=后台线程做、并行=多线程同时做；都为压停顿，不为提速回收本身。
9. **detached DOM**：节点移出文档 ≠ 可回收，JS 侧任何引用都会吊住整棵子树；排查时直接在堆快照搜 `Detached`。
10. **「内存涨了 = 泄漏」**——不一定。V8 惰性释放、GC 时机不定；泄漏的判据是「重复操作后 Retained Size 单调增长且 GC 后不回落」。

## 输出预测题

先闭卷推理，再看文末答案。

### 题 1（可达性判定）

```js live noInline
function build() {
  let a = { name: 'a' };
  let b = { name: 'b', ref: a };
  a.ref = b;        // 循环引用
  const keep = { name: 'keep' };
  b.k = keep;
  a = null;
  b = null;
  return keep;
}
const kept = build();
// 问：函数返回、局部变量 a/b 已置 null 后：
// 1) {name:'a'}、{name:'b'} 能否被回收？
// 2) {name:'keep'} 能否被回收？
// 3) 若这是引用计数的引擎，答案有什么不同？
```

### 题 2（泄漏找茬）

```js live noInline
const sessions = new Map(); // key: 用户对象（每个请求新建），value: 会话数据
function onLogin(user) {
  sessions.set(user, { cart: new Array(10000).fill(null), log: [] });
}
function onLogout(user) {
  sessions.get(user).log.push('logout');   // 故意不 delete
}
// 问：1) 哪条「意外的可达边」导致泄漏？2) 给出最小修法（两行以内）；
//     3) 若把 Map 换成 WeakMap，onLogout 里 sessions.get(user) 还能保证拿到值吗？为什么？
```

## 预测题答案

### 题 1 答案

1. **都能回收**。`a`、`b` 置 null 后，root（返回值 `kept` → `keep` 对象）到 `a`/`b` 的任何路径都断开；`a.ref = b`、`b.ref = a` 的循环引用在「从 root 出发的标记」中根本不可达——追踪式 GC 对环免疫。
2. **不能回收**。`keep` 被 `kept`（模块级变量，属于 root 可达）持有；虽然 `b.k = keep` 曾是另一条路径，但即使剪掉它，`kept` 这条边仍在。可达性只要求**至少一条** root 路径。
3. 引用计数引擎下，`a` 与 `b` 互相引用使双方计数都不归零（哪怕外界引用已清空）→ **两个对象都泄漏**——这正是追踪式 GC 取代引用计数的核心原因。

### 题 2 答案

1. 泄漏边：`sessions`（模块级，长期存活）→ Map 键槽**强引用**每个 user 对象 → user → `{cart, log}`（约 80KB/人）。用户对象本应请求结束即回收，却被缓存「绑架」，流量越大涨得越快。
2. 修法一（保留 Map）：`onLogout` 里补 `sessions.delete(user)`；修法二（更符合语义）：`const sessions = new WeakMap()`——元数据不应延长键对象的生命周期，泄漏边整体消失。
3. **不保证**。WeakMap 的键是弱引用：onLogout 执行时如果 user 对象已经不可达且发生过 GC，条目（连同 value）可能已被清除，`get` 返回 undefined。WeakMap 只适合「对象活着才有意义」的元数据——这正说明它是语义选择而不是性能选择；如果业务要求「登出时数据必然还在」，就该用 Map + 显式 delete（或加 TTL）。

## 延伸阅读

- v8.dev/blog：「Trash talk: the JavaScript garbage collection (part 1/2)」（分代与半空间）、「Concurrent marking in V8」、「Parallel Garbage Collection（Orinoco 系列）」
- v8.dev/features/weakrefs：WeakRef / FinalizationRegistry 的官方说明与警告
- MDN：Memory management（生命周期与可达性教学版）、WeakMap / WeakRef / FinalizationRegistry、Chrome DevTools 「Fix memory problems」（三快照法操作步骤）
- TC39 提案：tc39/proposal-weakrefs（README 的缓存示例，即练习 02 Part 3 的来源）
- 阶段衔接：阶段 2 的性能专题（长任务与 GC 停顿观测）、阶段 5 源码阅读（Vue reactivity 对 WeakMap 依赖映射的使用）

---

## 替换清单（ASCII 图 → Mermaid）

| 原 ASCII 图位置/标题 | Mermaid 图表类型 |
| --- | --- |
| §1 可达性小实验（root 出发的引用图） | flowchart (LR) |

## 附录 A：机制深一层——分代假说、写屏障与 Weak 家族的不确定性

### A.1 分代假说的两半，与跨代引用这道坎

正文 §2 说了分代假说的前半句「绝大多数对象朝生夕死」；它其实还有后半句：**幸存者倾向于继续长寿**——一个对象熬过了最初几次回收，它的预期剩余寿命会显著变长。两半合起来才推出「熬过一两次 Scavenge 就晋升老生代」是划算的：反复在新生代里复制注定长寿的对象是白花钱，早点送进「低频但便宜按存活数摊」的老生代更经济。

分代方案真正的技术难点是**跨代引用**：Scavenge 只从「新生代的 root 集」出发复制——栈和全局里的直接引用，加上一个**记录集（remembered set）**。如果只扫这些，老生代某对象指向新生代对象的边就会被漏掉，活对象会被误判为死。引擎的解法是**写屏障（write barrier）**：每次执行引用赋值，多做一次便宜的检查——「这次写入是否形成了老生代对象指向新生代对象的边」，是就把这个老对象登记进记录集，供下次 minor GC 当作额外的遍历起点。也就是说，**全程序的每次引用写都替 minor GC 交了一小笔「过路费」**，换来 minor GC 不必扫描整个老生代。

同一套 write barrier 基础设施还有第二个雇主：**增量标记**。三色标记法有个不变式——不允许出现「黑色对象直接指向白色对象」的边（黑色=已扫完，白色=待回收），否则增量间隙里白对象会被误回收。增量标记期间用户代码随时可能造出这种边，写屏障负责发现并记下它（或当场把白端变灰）。所以「增量标记与分代回收共享写屏障」不是巧合：两者都要在「GC 拆成小片」之后，靠运行时的旁路记录补齐全局视角。一手依据：V8 博客「Trash talk」系列对 Scavenge 与记录集的描述、「Concurrent marking in V8」对三色不变式与屏障的描述。

### A.2 WeakRef/FinalizationRegistry 的不确定性：规范到底把什么交给了实现

§5 列了四条警告，这里把「为什么必须这么警告」往规范深处推一层——不确定性感来自三个互相叠加的层次：

- **规范层**：ECMA-262 从头到尾没有规定「何时回收、是否回收」——GC 时机是留给实现的自由度。WeakRef 的 `deref()` 在目标「已不可达且已被回收」时返回 undefined，但「被回收与否」本身不确定，于是 `deref()` 的结果被规范明确标为**实现相关**：同一份代码，不同引擎、甚至同一引擎两次运行，都可能得到不同答案。规范还定了 KeepDuringJob：同一次 job 内 `deref()` 的结果保持一致（存活就全程存活），避免「一个 job 里两次 deref 说法打架」这种更碎的不确定性。
- **实现层**：以 V8 为例，「不可达」的判定依赖**保守栈扫描**——扫描器把栈和寄存器里的值一律当成「疑似指针」，凡看着像指向堆内对象的就保留。刚返回的函数若还有残留值躺在栈上，目标就可能「死不了」。练习 02 那个「跨一个宏任务边界再 `gc()`」的实验姿势，本质就是等旧栈帧彻底作废，让保守扫描不再误保。
- **推论层**：两个层次叠加之后，「cleanup callback 何时执行、按什么顺序执行、甚至执不执行」都无从承诺——程序退出前回收器可能压根没跑。所以正确性**永远不能**押在回调上；回调里也**永远不要**尝试「复活」目标：规范把进入 cleanup callback 的目标视为「已清除」，此时 `deref()` 必返回 undefined——语言层就把「死而复生」这条路焊死了，因为「程序以为死了、GC 又觉得活着」的分裂状态没有一致的语义可定义。

### A.3 内存泄漏分类账：四类泄漏边的 Node 等价场景

§3 的五个场景多是浏览器叙事；在纯 Node 服务里它们各有等价形态，统一记成「分类账」——每行一个泄漏边、一个 Node 可复现的等价物：

| 泄漏边 | 浏览器叙事 | Node 等价场景 | 剪边方式 |
| --- | --- | --- | --- |
| 闭包 | 回调闭包持有大数组 | 工厂返回的处理函数捕获了请求级的 Buffer | 工厂内先提取小字段再打包进闭包 |
| 定时器 | 组件销毁没清 interval | `setInterval` 的回调闭包持有连接池/缓存，模块退出前无人 `clearInterval` | 明确的生命周期终点成对调用 `clearInterval` |
| Map 键 | 组件 → 元数据缓存 | 模块级 `Map` 以每请求对象为键做会话缓存，只在登录时 set | 出口 delete，或语义合适时换 WeakMap |
| detached 子树 | DOM 节点移出文档仍被引用 | 「子模块对象」从主状态树摘除，但事件注册表/全局容器仍引用它（等价于整棵引用子图活着） | 摘除时同步清容器引用，容器用弱键 |

detached DOM 的 Node 等价值得多说一句：它吓人的地方从来不是「一个节点」，而是**引用子图整体存活**——DOM 节点拖着子树、样式、监听器；Node 里「从主树摘除的模块对象」同样拖着自己引用的一整族下游对象。堆快照里两者都表现为「retained size 远大于自身字段的图谱孤岛」，顺着 Retainers 往回读，第一条出口边就是答案。

## 附录 B：实跑取证——trace-gc 触发观察与 heapUsed 三阶段实验

两个实验都在 node v24.10.0 实跑，总时长 3 秒内、峰值堆增量不到 10 MB——观察 GC 不需要先把自己机器打爆。

**实验一：`--trace-gc` 看 Scavenge 的触发与成本**。让脚本在 1.5 秒内持续造「上一轮即死」的数组垃圾：

```js
const deadline = Date.now() + 1500;
let sink = [];
let i = 0;
while (Date.now() < deadline) {
  sink = new Array(10000).fill({ n: i++ }); // 上一轮立即变成垃圾
}
```

`node --trace-gc`（输出取前几行）：

```
[50880:0x99e80c000]        8 ms: Scavenge 4.2 (5.1) -> 3.5 (6.1) MB, ... 0.17 / 0.00 ms ... allocation failure
[50880:0x99e80c000]        9 ms: Scavenge 4.2 (6.1) -> 3.4 (6.3) MB, ... 0.12 / 0.00 ms ... allocation failure
[50880:0x99e80c000]        9 ms: Scavenge 4.3 (6.3) -> 3.4 (6.3) MB, ... 0.04 / 0.00 ms ... allocation failure
```

逐字段读：`Scavenge` 是回收类型（新生代半空间复制）；`4.2 -> 3.5 MB` 是回收前后的堆用量——**每轮几乎全是垃圾，回收后不降反稳**，且耗时只有 0.04~0.17 ms，完美印证「Scavenge 成本与存活对象数成正比，死对象零成本」；行尾的 `allocation failure` 是触发原因——不是定时闹钟，而是「想分配、新生代装不下」。

**实验二：全局泄漏的 heapUsed 三阶段对比**。`--expose-gc` 下做「基线 → 持有 → 剪边」三个确定性观测点：

```js
gc();
const baseline = process.memoryUsage().heapUsed;
const leak = [];
for (let i = 0; i < 200000; i++) leak.push({ id: i, tag: "leak" });
gc();                 // 强制回收后测量：可达对象不该被回收
const retained = process.memoryUsage().heapUsed;
leak.length = 0;      // 剪断唯一的引用边
gc();
const released = process.memoryUsage().heapUsed;
```

实跑输出：

```
baseline: 3.2 MB
after leak + gc: 12.8 MB
after drop + gc: 3.2 MB
```

中间那个 12.8 MB 是全实验的题眼：**已经调用过 `gc()`，堆却没降**——因为模块级数组这条边还连着，20 万个对象全体可达，回收器无权处理。`leak.length = 0` 剪边之后回到 3.2 MB，证明了本册反复强调的两句话：「`obj = null` 类操作只是剪边，释放发生在剪边后的下一次 GC」与「泄漏判据是 GC 后不回落」。生产里没有 `gc()` 和确定性，所以判据要换成「重复操作 N 次后看趋势」（附录 D 的三快照法）；实验里我们恰好可以用确定性换来 3 秒内的干净结论。

## 附录 C：工程三陷阱（增补）

**陷阱一：缓存只进不出**。正文场景 5 的 Map 缓存问题在生产里最常见的形态不是「忘了 delete」，而是「压根没有出口设计」：缓存初始化代码写完，容量、淘汰、过期三件事全都缺位，直到内存告警才被想起。修法按语义三选一：键与值生命周期天然同步的元数据用 WeakMap（零维护）；有容量概念的用 LRU 并显式设上限（容量即成本上界）；有新鲜度概念的用 TTL。**评审时对每个模块级缓存问一句「它的出口在哪里」**，答不出就是陷阱一的候补。

**陷阱二：WeakMap 的三种语义误用**。误用一：值里引用键（`m.set(k, { self: k })`）——值是强引用，形成「值吊住键」的事实强环，弱键语义自败，条目永不回收。误用二：把它当「性能更好的 Map」——恰恰相反，它没有 size、不能遍历、不能清空（§4 的 GC 语义决定了这些 API 不可能存在），换来的唯一好处是不绑架键；要遍历就老实用 Map + 显式清理。误用三：需要「确定还在」的场合用了它——比如登出时要读回会话数据，WeakMap 的条目可能已被 GC 顺手清掉（正文预测题 2 第 3 问的正解）；「确定性还在」的需求必须 Map + 显式生命周期管理。

**陷阱三：把 FinalizationRegistry 当析构函数**。§5 警告的第 3 条值得展开成一条工程红线：凡「回调不被调用就出事故」的清理——释放锁、归还连接、落盘提交——写进 cleanup callback 就是把正确性押在一个规范明说「可能不执行」的机制上。正确的分工是：**关键清理走显式路径**（显式 `close()`，或语言化的 `await using`/`Symbol.asyncDispose`，见 31 册 §31.4——它把「抛错也清理、逆序清理」交给语言保证）；FinalizationRegistry 只接「漏网之鱼」：正常路径漏掉清理时的缓存失效、水位回收等机会性兜底。

## 附录 D：排查速查表——Node 侧三快照对比法与缓存策略决策

**三快照对比法的 Node 落地步骤**（浏览器版见 §6，Node 版把 DevTools 换成 `v8.writeHeapSnapshot()` + 同一份分析面板）：

1. 可疑进程以 `node --inspect` 启动；不便挂 inspector 时在关键代码点直接调 `v8.writeHeapSnapshot()`（返回 `.heapsnapshot` 文件路径）。
2. 采快照 A（操作前）→ 把疑似泄漏操作重复 N 次（如处理 50 个请求、挂载/卸载 20 次）→ 采快照 B → 强制 GC（`--expose-gc` 下调 `gc()`，或 DevTools Memory 面板的垃圾桶按钮）→ 采快照 C。
3. 把快照文件拖进 Chrome DevTools 的 Memory 面板（面板有 Load 入口），选 Comparison 视图对比 B 与 C，按 **Retained Size** 降序——只看「GC 之后仍然比 A 多出来」的构造器，它们才是疑似泄漏；旁边 Objects allocated 区间对比可辅助定位分配增长点。
4. 对嫌疑对象展开 **Retainers** 面板，从对象往上读引用链到 root：**链条上第一个「不该存在」的持有者就是泄漏边**（一个忘了 delete 的 Map、一个没清的 interval、一个全局数组）。修复后重跑第 2 步，增量消失即闭环。

判据回扣正文口诀：**看的不是内存高，是「重复操作后单调增长、且强制 GC 后不回落」**。

**缓存策略决策表**（按「数据的生命周期语义」选型，每行可回指本册机制）：

| 场景语义 | 策略 | 一句话理由 | 机制出处 |
| --- | --- | --- | --- |
| 值的寿命等于键的寿命（元数据、私有数据） | WeakMap | 键死条目死，无需出口维护 | §4 |
| 有容量概念的热点数据 | LRU + 显式上限 | 容量即内存成本的上界 | §3 场景 5 |
| 有新鲜度概念的数据 | TTL 过期 | 失效与容量解耦，按时钟剪边 | §3 场景 5 |
| 必须跨 GC 确定存在（会话、票据） | Map + 显式 delete + 容量监控 | 确定性优先，弱语义不可接受 | §4 / 预测题 2 |
| 大对象缓存且内存敏感 | WeakRef 持值 + FinalizationRegistry 清槽 | 让 GC 按内存压力裁决，收尾只做机会性清理 | §5 |
| 需要遍历统计的集合 | 普通 Map/Set + 出口 | 弱集合无 size/迭代，语义就不允许 | §4 |

选型的错误姿势是「按性能直觉选」——WeakMap 不比 Map 快，它是一种生命周期契约；契约选错了，代码再高效也是在错的轨道上跑。

## 附录 E：GC 观测的三个反直觉结论与一条排查纪律

做内存排查前先校准三个反直觉的判断，否则监控数据摆在那里也会读错方向。

**反直觉一：heapUsed 的锯齿是健康信号，病灶看「锯齿底部抬升」。** 正常服务的 heapUsed 曲线是锯齿波——分配把线推高，回收把线拉低，循环往复。新手常把锯齿当泄漏，其实是 GC 在正常工作。真正的泄漏信号藏在锯齿的**谷底**：每次回收后的最低点一轮比一轮高，说明有一批对象每轮回收都活着、且总量在爬坡——这正是「重复操作后单调增长」的曲线形态。读监控图时盯谷底连线，别盯峰值。

**反直觉二：单次暂停短，不等于 GC 不构成性能问题。** 实验一里 Scavenge 只要 0.04~0.17 ms，看起来完全无害；但暂停短和触发频繁是两回事。每秒分配量 × 存活率决定回收频率，高频回收即使每次都便宜，累积起来也在持续抽走主线程时间片——这正是「降低分配速率比优化单个回收更有效」的原因。观测时的正确问题是「单位时间回收了几次、每次救回多少」，而不是「最长的那一次多久」；预算思维（每轮回收的摊派成本）比峰值思维更贴近真实体验。

**反直觉三：rss 涨不等于 JS 泄漏。** `process.memoryUsage()` 的四个字段（§6 的表）里，rss 是进程物理内存总量，它还包含 V8 堆之外的部分：`external` 里的 Buffer、原生扩展自己 malloc 的内存、线程栈等。典型误诊：服务大量使用 Buffer（网络 I/O 的常规配置），rss 稳步上涨而 heapUsed 平稳——这是堆外内存的行为，去查 Buffer 池的持有链，别在 JS 对象堆里翻快照。三条线的分流判读：heapUsed 谷底抬升 → JS 对象泄漏，走三快照法；rss 涨而 heapUsed 平 → 查 external 与原生层；尖峰后回落 → 只是流量峰值，不是泄漏。

**一条排查纪律把三个结论串起来**：任何内存告警，第一步永远是**分类**（哪条线在涨、按什么节奏涨），第二步才轮到工具——三快照法只对第一类有效。跳过分类直接开快照，是内存排查里最常见的「工具先行、问题错位」：对着堆快照找了一下午，问题的根在堆外。

