---
mdx:
  format: mdx
---
# 08 · 渲染管线、事件循环与性能专题

> 对应大纲：阶段 2 —— 浏览器渲染管线与事件循环的关系（rAF、rIC、任务切片）；性能专题：防抖/节流、懒加载、Web Workers、长任务分析。
> 一手依据：HTML Standard《[Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)》与《[Rendering](https://html.spec.whatwg.org/multipage/rendering.html)》章节（update the rendering 处理模型）；Chrome 文档 scheduler.postTask / scheduler.yield 系列。

## 学习目标

- 能按 HTML Standard 的处理模型说出「一个 task 执行完之后浏览器发生了什么」，并解释 rAF、微任务、渲染三者顺序。
- 能诊断并修复强制同步回流（layout thrashing），理解读写分离为什么有效。
- 掌握防抖/节流的语义边界与实现要点，能按场景选型。
- 知道任务切片、懒加载、Web Workers 各自解决什么问题、各自的成本在哪。

---

## 关键概念

### 1. 渲染管线：style → layout → paint → composite

浏览器把 DOM 变成像素走四步（依据 HTML Standard Rendering 章节的渲染模型与 Chrome 实现术语）：

```mermaid
flowchart TD
    A["DOM + CSSOM"] -->|"Style（样式重算：匹配选择器，算出每个节点的计算样式）"| B["Layout（布局/回流：算出每个节点的几何盒模型，生成布局树）"]
    B --> C["Paint（绘制：生成绘制指令记录——先画什么后画什么、文本/图片/矩形）"]
    C --> D["Composite（合成：把若干图层交给 GPU 合成出最终帧；transform/opacity 可只走这步）"]
```

关键性质：**这条管线是按需、增量的**。改了 `class` 只触发 style→…；改几何属性触发 layout；只改 `transform`/`opacity` 可能只触发 composite（这正是 CSS 动画推荐用 `transform` 的原因）。

**强制同步回流（forced synchronous layout / layout thrashing）**是最大的性能陷阱：

```js
// 经典反模式：读写在循环里交替
for (const node of nodes) {
  node.style.height = '50px';       // 写：使布局「脏」
  console.log(box.offsetTop);       // 读：布局脏了 → 浏览器被迫【立刻同步】重算布局
}
```

浏览器本想把多次写合并成一次 layout（在帧末统一做）。但 `offsetTop`/`offsetHeight`/`getBoundingClientRect()` 这类**几何读取**必须返回「此刻」的准确值——布局脏着就必须先同步算完再返回。读写交替等于每圈循环强制一次完整 layout，复杂度变成 O(n × layout成本)。

修复思路是**读写分离 / 批量写**：

```js
// 先集中读，再集中写
const tops = nodes.map(n => n.offsetTop);       // 读：只触发一次强制回流
nodes.forEach((n, i) => { n.style.height = ...; }); // 写：统一标脏，帧末一次 layout
```

工程化方案即 FastDom 这类库的 read/write 双队列；`DocumentFragment` 批量插 DOM、`content-visibility: auto` 让屏外内容跳过渲染，也是同一思想。虚拟滚动/覆盖索引本质是「让 DOM 数量级下降，layout/paint 的输入变小」——一句话带过，不展开。

### 2. 事件循环与渲染的关系

依据 HTML Standard 9.7 节 Event loops 的处理模型：事件循环每轮做三件事——**取一个 task 执行 → 把微任务队列全部清空 → （如果需要渲染）执行 update the rendering**。update the rendering 的大致内部顺序：

```
一轮循环：
  1. 取出一个 task（宏任务）执行
  2. 清空整个 microtask 队列（Promise.then、queueMicrotask、MutationObserver）
  3. 若该渲染时机到了（对齐显示器的 vsync）：
     3a. 依次执行所有 requestAnimationFrame 回调
     3b. style → layout → paint → composite
     3c. 若本帧还有剩余时间：执行 requestIdleCallback（rIC，带 deadline）
```

画成 60Hz 的一帧时间线（约 16.7ms）：

```
|← task ←→ 微任务全清 ←→ rAF ←→ style/layout/paint ←→ rIC(剩余时间) →|
|----------------------------- 一帧 ≈ 16.7ms ------------------------------|
        任何一段超支，都会把「下一帧」推迟 → 掉帧
```

记住这个坐标系：后面所有性能手段（切片、防抖节流、懒加载、worker）本质都是在给这条时间线里**腾位置**。

三个高频推论：

- **微任务在 task 结束后立即清空，且一定在渲染之前**。所以一个 task 里塞 1000 个微任务，这一帧直接被吃掉。
- **rAF 回调运行在 style/layout 之前**——这是「先改样式再读几何」或「在渲染前更新动画」的唯一正规位置。
- **一帧预算 ≈ 16.7ms**（60Hz；120Hz 屏是 8.3ms）。注意 16.7ms 是「从上一帧到下一帧」的全部时间：task + 微任务 + rAF + 渲染全算在内。3c 里的 rIC 拿到的 `deadline.timeRemaining()` 就是这个预算的剩余值。

**长任务（long task）**：规范定义为主线程上**持续超过 50ms** 的任务（task 或渲染步骤连续占用）。50ms 这个数来自「人对『立刻』的感知边界」：交互响应被阻塞超过约 100ms 就会感觉卡，50ms 是留给输入处理与渲染的余量。它是 TBT（Total Blocking Time）、INP（Interaction to Next Paint）等指标的基础。

**为什么 setTimeout 动画会抖而 rAF 不掉帧**：

- `setTimeout(fn, 0)` 只保证「至少 0ms 后把 fn 放进 task 队列」。它对齐的是**任务队列**，不是显示器刷新。回调实际执行时刻取决于当时队列里还有什么；嵌套 5 层以上的 timer 还会被强制钳到 ≥4ms。于是动画帧可能与 vsync 错相：有时一帧里跑了两次回调，有时一帧一次都没有——肉眼看就是抖动/掉帧。
- `requestAnimationFrame` 的回调由浏览器在 **update the rendering 步骤里、绘制之前**统一调度——天然对齐 vsync，每帧恰好一次，且后台标签页会暂停（省电）。做动画只有一种正确选择：rAF + 帧间 `delta` 计算。

### 3. 任务切片：把控制权还给主线程

一个 10⁷ 元素的同步循环就是一个 >50ms 的长任务：期间输入事件排不上队、渲染停摆、用户点什么都没反应。切片（chunking）的原理：**把大任务拆成多个小 task，片与片之间事件循环有机会处理输入、执行渲染**。

三种实现，按现代程度排列：

| 方案 | 写法 | 特点 |
| --- | --- | --- |
| `setTimeout(fn, 0)` 链 | 每片末尾 `setTimeout(next, 0)` | 兼容一切环境；但嵌套钳制 ≥4ms，且 task 优先级不可控（可能插在用户输入后面） |
| `scheduler.postTask(fn, { priority })` | 显式优先级（`user-visible`/`user-blocking`/`background`），可 `AbortController` 取消 | 浏览器按优先级调度，让交互任务先跑 |
| `scheduler.yield()` | `await scheduler.yield()` 续行 | 语义是「让一拍再继续」：保持执行顺序（不让别的同优先级任务插队到逻辑前面），返回 Promise，写法最接近同步代码 |

交互延迟改善的原理一句话：**INP 测的是「用户点击 → 下一帧渲染」的时间**；同步长任务把点击事件的处理与随后的渲染全部压后；切片让点击 task 得以在片间执行，页面「看起来活着」。（虚拟滚动/覆盖索引那句话同前，不展开。）

练习 `04-task-slicing.mjs` 在 Node 里演示同样的机制：setTimeout(0) 切片期间，先注册的「交互任务」能穿插进两片之间执行——事件循环语义在浏览器与 Node 中一致。

### 4. 防抖 debounce / 节流 throttle

语义差异是第一位的，实现是第二位的：

- **防抖（debounce）= 停了才做**：连续调用会不断推迟执行，只有「安静了 wait 毫秒」才真正执行**最后一次**。类比：电梯关门——有人进来就重新等。
- **节流（throttle）= 期间最多一次**：不管调用多频繁，每个 wait 窗口内最多执行一次。类比：技能冷却。

| 维度 | debounce | throttle |
| --- | --- | --- |
| 触发时机 | 停止调用 wait 后（trailing）或首次立即（leading） | 窗口开始（leading）和/或窗口结束（trailing） |
| 典型场景 | 搜索输入联想（打完再查）、resize 结束后重算布局、表单自动保存 | scroll 加载更多、mousemove 拖尾、按钮防连点、埋点上报 |
| 期间调用 N 次 | 合并为 1 次（最后一次的参数） | 每窗口至多 1 次 |

**leading / trailing 选项**：

- leading：窗口**开始**时立即执行（响应快）。debounce + leading = 「第一次敲键立刻搜，之后静默期内的连击合并到最后一次」。
- trailing：窗口**结束**时补一次（不丢最后一次）。throttle 默认 leading + trailing；debounce 默认 trailing。

**两种实现路线**（面试高频）：

1. **时间戳法**：记录 `last`，每次调用比较 `now - last >= wait` 决定是否执行。
   - 优点：不需要定时器就能实现 leading；
   - 缺点：trailing 补发**必须有定时器**——「停止调用后自动来一次」这件事靠比较时间戳无法自发发生，得有人再调用一次才行。
2. **定时器法**：每次调用 `clearTimeout` + `setTimeout`。
   - 优点：天然支持 trailing；
   - 缺点：leading 需要额外状态（区分「窗口外第一枪」与「窗口内重复」）。

lodash 的成熟实现是两者混合。练习 `03-debounce-throttle.ts` 用**纯定时器法 + 可注入时钟**完整实现四个选项组合，并用假时钟逐 tick 验证触发序列。

### 5. 懒加载：IntersectionObserver

旧方案「监听 scroll + getBoundingClientRect」有两个致命伤：scroll 事件高频（必须节流）、getBoundingClientRect 是几何读取（配合样式修改就是 layout thrashing 教科书案例）。

**IntersectionObserver（IO）** 原理：你注册「目标元素 × 容器 × 阈值」，浏览器在**自己的渲染流程中**（布局信息本来就在算）顺带计算交集，只在「交叉状态发生**变化**」时把回调作为一个 task 派发给主线程。主线程不做持续轮询、不主动触发回流。

两个关键配置：

- **rootMargin**：把判定区域向四周扩/缩一圈（CSS margin 语法，如 `'200px 0px'`）。「提前 200px 开始加载图片」就是它——用户还没看到，加载已开始，体验上「即滚即有」。
- **threshold**：交叉比例阈值数组 `[0, 0.5, 1]`，跨越每个阈值都会触发一次回调；常用 `0`（刚出现）与 `1`（完全进入）。

配套一句：图片原生 `loading="lazy"`、CSS `content-visibility: auto` 把「屏外不渲染」下沉给了浏览器，能用原生就别手写。

最小用法：

```js live noInline
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.src = e.target.dataset.src; // 进入视口前 300px 才加载真实图片
      io.unobserve(e.target);              // 一次性任务记得取消观察
    }
  }
}, { root: null, rootMargin: '300px', threshold: 0 });
document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
```

### 6. Web Workers 与 Node worker_threads

- **模型**：Worker 是**独立的 JS 运行时实例**（独立堆、独立事件循环、独立线程），与主线程不共享普通对象。通信靠 `postMessage` 消息传递。
- **结构化克隆（structured clone）传值的限制**：`postMessage` 的数据按 HTML Standard 的可序列化算法深拷贝一份。**函数、闭包、DOM 节点、Symbol、`SharedArrayBuffer` 之外的「环境绑定」对象都不可克隆**——传不了。能传：原始值、普通对象/数组、Map/Set、Date/RegExp、ArrayBuffer（可转移）、TypedArray 等。想「传行为」只能传数据 + 让 worker 端代码自带处理逻辑。
- **Transferable 零拷贝**：`postMessage(data, [buffer])` 的 transferList 里放 `ArrayBuffer`，**所有权**从发送方转移给接收方——没有任何字节拷贝。代价：转移后发送方的这个 buffer 变成 **detached**，`byteLength === 0`，不可再用。典型用法：主线程填好 `Float64Array` 转给 worker 算，算完再转回来，全程零拷贝。
- **Node 对应 `node:worker_threads`**：同样的模型（独立线程 + `postMessage` 结构化克隆 + `transferList`），差异：Node 的 worker 可以 `require`/`import` 模块、有 `workerData` 传初始数据；浏览器 worker 没有 DOM，Node worker 没有 `window`。
- **适用 / 不适用**：
  - 适用：单次大计算（图像像素处理、大 JSON 解析、加密哈希、大排序），数据进出次数少、计算/通信比高；
  - 不适用：高频小消息——每次 postMessage 都是一次完整序列化/反序列化，**序列化开销可能吞掉并行收益**；也不适用需要直接操作 DOM/UI 状态的任务（还要排队回主线程）。
- 一句带过：真正的共享内存要 `SharedArrayBuffer` + `Atomics`（两个线程可同时访问同一块内存），用于极高性能场景。

主线程侧通信骨架（浏览器与 Node 写法几乎一致）：

```js
// 浏览器
const w = new Worker('worker.js');
w.postMessage({ rows: bigArray });            // 结构化克隆：深拷贝，函数传不过去
w.onmessage = (e) => render(e.data.result);

// Node（见练习 05）
import { Worker } from 'node:worker_threads';
const w = new Worker('./worker.mjs');
w.postMessage(new ArrayBuffer(8), [/* transferList */]); // 第二参数转移所有权，零拷贝
```

### 7. 长任务分析：怎么测量

- **performance.now() 分段计时**：对可疑代码块手工插桩（`t0 = performance.now()` … `performance.now() - t0`）。最朴素、跨环境，适合定位「哪一段慢」。注意：**只报告耗时，不阻塞、不修复**；分段粒度由你决定。
- **PerformanceObserver `longtask` 条目（浏览器）**：

  ```js
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) console.log('长任务', e.duration);
  }).observe({ type: 'longtask', buffered: true });
  ```

  浏览器在主线程上占用超过 50ms 的任务结束后自动上报，无需插桩。配合 DevTools Performance 面板可以看到长任务发生在哪、阻塞了多少交互。
- **Node 下如何近似**：Node 没有浏览器的 longtask 条目，但有对应工具：
  - `perf_hooks.monitorEventLoopDelay()` —— 事件循环延迟直方图（两次轮询之间的空闲间隙被吃掉的程度），是「主线程被长任务占住」的近似信号；
  - `perf_hooks.eventLoopUtilization()` —— 事件循环利用率（busy/total），适合采样监控；
  - 更细的归因仍靠 `performance.now()` 分段插桩（练习 04 的做法）。

---

## 可运行示例

配套练习（本工作区可直接运行）：

- `exercises/v8-and-performance/03-debounce-throttle.ts` —— 假时钟（可手动 `tick(ms)`）驱动，逐事件验证 debounce/throttle 的 leading/trailing 触发序列。
- `exercises/v8-and-performance/04-task-slicing.ts` —— 10⁷ 求和：同步版 vs setTimeout(0) 切片版，观察交互任务穿插。
- `exercises/v8-and-performance/05-worker-threads.mjs` —— worker_threads：结构化克隆传数组求和 + ArrayBuffer 零拷贝转移（转移后主线程 byteLength 变 0）。

浏览器侧最小感受版（粘贴到 DevTools Console）：

```js live noInline
// 1) 观察一帧内的顺序：task → microtask → rAF
setTimeout(() => console.log('timeout'));
Promise.resolve().then(() => console.log('microtask'));
requestAnimationFrame(() => console.log('rAF'));
console.log('sync');
// 输出顺序：sync → microtask → rAF → timeout（若该轮有渲染机会）

// 2) 强制同步回流的量化感受
const box = document.querySelector('header');
let t0 = performance.now();
for (let i = 0; i < 1000; i++) { box.style.marginTop = i + 'px'; box.offsetTop; } // 读写交替
console.log('thrashing 版相对耗时高:', performance.now() - t0);
t0 = performance.now();
for (let i = 0; i < 1000; i++) { box.style.marginTop = i + 'px'; } // 先写
box.offsetTop; // 后读
console.log('分离版:', performance.now() - t0); // 数量级更小
```

---

## 易错点与面试高频

1. **「微任务比 rAF 先」和「rAF 比微任务先」都听过？** 规范答案：本轮 task 结束先**清空全部微任务**，然后进入 update the rendering 才跑 rAF。顺序固定：task → microtask(全清) → rAF → style/layout/paint → rIC。
2. **`setTimeout(fn, 0)` 不是 0ms**：嵌套 5 层后被钳到约 4ms；且它排的是 task 队列，跟渲染帧没关系。「下一帧执行」的唯一承诺来自 rAF。
3. **防抖节流混为一谈**：面试必考。口诀：防抖「停了才做、合并最后一次」，节流「期间最多一次、匀速放行」。按钮防连点用 throttle（立即反馈 leading）或 debounce+leading；搜索联想用 debounce（trailing）；滚动无限加载用 throttle + IO。
4. **debounce + leading 的坑**：leading 那一枪之后，冷却期内的调用是否要在结束时补一次，取决于 trailing——想清楚语义再选，别抄了库的默认值不知道为什么。
5. **「交给 worker 就快了」**：小数据高频通信的序列化开销可能让总耗时更高。判断式：`(计算收益) > 2 × 序列化成本` 才值得。
6. **Transferable 转移后原 buffer 报错**：`ArrayBuffer` 转移后 `byteLength` 为 0、再读写它的 TypedArray 会抛 `TypeError`（detached）。这不是 bug，是所有权语义。
7. **IO 不是「立刻」回调**：回调是 task，可能在布局后的某个时机派发；别在 IO 回调里假设布局是「这一帧」的状态。
8. **长任务 50ms 是 task 粒度，不是函数粒度**：一个 task 里连续 10 个 6ms 的函数同样构成 60ms 长任务。优化目标是把控制权交出去，不是把每个函数都写快。

---

## 输出预测题

### 题 1（浏览器环境，事件循环与渲染顺序）

```js live noInline
console.log('A: script start');
setTimeout(() => console.log('B: timeout 0'));
Promise.resolve().then(() => console.log('C: microtask'));
requestAnimationFrame(() => console.log('D: rAF'));
console.log('E: script end');
// 浏览器 Console 中执行，写出一行输出顺序（假设该轮事件循环有渲染机会）。
```

### 题 2（throttle 触发序列）

```js
// 使用练习 03 的实现：throttle(fn, 100, { leading: true, trailing: true })
// fn 会打印触发的参数。调用时刻表如下（时间单位 ms）：
//   t=0   调用('a')   t=40  调用('b')   t=60  调用('c')
//   t=200 调用('d')   t=250 调用('e')
// 写出 fn 实际被触发的完整序列（时刻 + 参数）。
```

（答案见文末）

---

## 延伸阅读

- HTML Standard, Event loops —— html.spec.whatwg.org/multipage/webappapis.html#event-loops（task/microtask/渲染步骤的一手定义）
- HTML Standard, Rendering —— html.spec.whatwg.org/multipage/rendering.html（update the rendering 的展开步骤）
- web.dev/articles/long-tasks 与 W3C Long Tasks API（w3c.github.io/longtasks）—— 50ms 阈值与 PerformanceObserver longtask
- web.dev/articles/inp —— Interaction to Next Paint 的定义与长任务的关系
- developer.chrome.com/articles/scheduler-posttask/ 与 developer.chrome.com/blog/scheduler-yield/ —— 现代调度 API 对照
- developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API 与 w3c/IntersectionObserver 规范 —— 交集计算与 rootMargin/threshold
- MDN《Web Workers API / Structured clone algorithm》与 HTML Standard 可序列化值列表 —— 克隆限制的一手依据
- nodejs.org/api/worker_threads.html 与 nodejs.org/api/perf_hooks.html（monitorEventLoopDelay / eventLoopUtilization）—— Node 侧对应物

---

## 预测题答案

### 题 1

输出顺序：**A → E → C → D → B**。

- `A: script start` / `E: script end`：同步代码，最先、最后于本轮 task 内执行。
- task 结束 → **清空微任务**：`C: microtask`。
- 该轮有渲染机会 → update the rendering：先跑 rAF 回调 → `D: rAF`。
- 渲染（或跳过渲染）后进入下一轮事件循环，才从 task 队列取出 timer task → `B: timeout 0`。

### 题 2

触发序列：

```
t=0   → 'a'   （leading：冷却窗口开启时立即执行，窗口到 t=100）
t=100 → 'c'   （trailing：b、c 都在窗口内，只保留最后一次的参数）
t=200 → 'd'   （t=100 触发后窗口重开到 t=200；t=200 时无待发调用解锁，
                t=200 的 'd' 在窗口外 → 新窗口立即触发）
t=300 → 'e'   （'e' 在 t=200–300 窗口内被记录，窗口到期补发）
```

要点：throttle 的 trailing 触发会**重开下一个冷却窗口**（连续调用的节流匀速放行）；而 t=200 处没有候选时只是解锁、不重开。

---

## 替换清单（ASCII 图 → Mermaid）

| 原 ASCII 图位置/标题 | Mermaid 图表类型 |
| --- | --- |
| §1 渲染管线（DOM+CSSOM → Style → Layout → Paint → Composite） | flowchart (TD) |

延伸对比——若改成 `{ leading: false, trailing: true }`：t=0 的 'a' 不立即执行，只记录并开窗口到 t=100；t=100 触发 'a' 并重开窗口到 t=200；t=200 的 'd' 恰在窗口外，但 leading=false 不允许立即触发，只记录；t=250 的 'e' 覆盖记录；t=300 触发 'e'。序列变为 **t=100 → 'a'、t=300 → 'e'**。与练习 03 场景 4 的事件表对照可验证。

---

## 进阶机制：rAF 的帧截止、读写交错的记账法与 INP 三段分解

### rAF 与帧截止：回调拿到的 timestamp 是帧的起点

一手依据仍是 HTML Standard 的 update the rendering 处理模型：一帧里所有 rAF 回调**共享同一个时间戳**——`requestAnimationFrame(cb)` 的回调收到的 `DOMHighResTimeStamp` 不是「回调被调用的时刻」，而是**这一帧对齐的 vsync 起始时刻**。同一帧里注册的十几个 rAF 回调拿到的 timestamp 完全相同，用它算动画进度天然同步；跨帧比较要用上一帧保存的值做差——这就是「帧间 delta」的由来，也是动画循环的标准写法。

「帧截止」（frame deadline）是这个模型里隐含的预算线：从帧起点开始，rAF 回调加 style/layout/paint 全部要在这约 16.7ms（60Hz）内完成。推论有三条，每条都对应一类真实事故：

1. **rAF 不是「免费的渲染前空间」**。rAF 里塞 20ms 的 JS，渲染被推到预算之外，浏览器要么丢掉本帧的绘制（掉帧），要么把整帧拉长（卡顿）——rAF 只是给你一个「渲染之前」的位置，不给你额外时间。
2. **rAF 自调度循环的频率自动跟随刷新率**。每帧回调里再次 `requestAnimationFrame`，120Hz 屏上它就是每秒 120 次——所有每帧常量（移动速度、缓动步长）都要按 delta 缩放，否则同一份代码在高刷屏上动画跑成两倍速。
3. **rAF 里读写交错的位置最糟**。rAF 在 style/layout 之前、之后紧贴渲染——在这里写样式再读几何，强制布局的费用直接计入本帧最紧张的时段，没有「下一帧再算」的缓冲余地。

### 读写交错账：强制布局是「每轮清算」，不是「每次读取」

把 layout thrashing 算细一点，能解释很多「看起来差不多」的代码性能差一个数量级的现象。核心机制是**脏标记只清算一次**：

- 写几何样式 → 布局树被标脏（这一步便宜，只是打标记）；
- 写之后的第一次几何读取 → 布局脏着，必须**同步重算整棵布局树**（付全款）；
- 之后的连续读取 → 布局已经干净，**直接返回缓存值（免费）**；
- 再写一次 → 再次标脏，下一笔读取又要付全款。

所以一帧内的布局成本约等于**「写后读」的交错次数 × 单次布局成本**，而不是读取次数 × 布局成本。100 次读写交错就是 100 次全款；100 次读取排成一批只付 1 次，甚至 0 次——若本帧尚无任何写入，读到的就是上一帧渲染时算好的有效布局，连全款都不用付。这也解释了为什么「把读集中到写前面」是标准修复：读批免费或只付一次，写批只标脏一次，帧末统一清算。

另一个常被忽略的区分：**强制样式重算与强制布局是两笔不同的账**。`getComputedStyle` 之后读一个布局无关属性（如颜色）只需重算样式；读布局属性（`offsetHeight`、`getBoundingClientRect()`）才需要重算布局。DevTools 的 Performance 面板把它们分别记为 Recalculate Style 与 Layout 两类事件，排查时先分清是哪一笔在膨胀，再回头找对应的读写模式。

### Long Task 与 INP：把一次交互拆成三段看

INP（Interaction to Next Paint）测的是「用户输入 → 对应视觉更新绘制完成」的全程；web.dev 给的分级是 200ms 及以内算良好、500ms 以上算差，统计口径是页面生命周期内按第 98 百分位近似取「最差的那次交互」。把它拆成三段，每段对应不同的病灶与药方：

1. **输入延迟（input delay）**：事件发生 → 事件处理函数开始执行。被什么吃掉？当时正在跑的长任务，或排在它前面的其他事件处理。药方：任务切片、缩短 handler 之前的任务。
2. **处理时长（processing duration）**：事件处理函数本身同步执行的耗时。药方：handler 里只做必要的同步状态更新，重活拆出去（`scheduler.postTask` 派到 background、或进 worker）。
3. **呈现延迟（presentation delay）**：处理完 → 下一帧绘制完成。被什么吃掉？刚被 handler 改出来的脏布局要重算、大范围重绘。药方：改动收敛到 `transform`/`opacity`、缩小重绘区域、避免 handler 里再出现交错读写。

一句话诊断规则：**INP 差先看三段哪段最长，再对症下药**——只优化 handler 执行时长，最多只能救三段之一。

---

## 手推配方：一帧内读写序的逐步推演

配方目标：拿到任意一段「读几何 + 写样式」的代码，不跑性能面板也能推出本帧强制布局的次数、以及帧预算是否超支。

**例题（交错版）**：3 行表格行，循环里先写高度再读偏移：

```js
for (let i = 0; i < 3; i++) {
  rows[i].style.height = newHeights[i];   // 写
  total += rows[i].offsetTop;             // 读
}
```

逐步推演（判定口诀：每遇到「写之后的第一笔读」，记一笔全款布局；随后的连续读免费）：

```
i=0  写 height[0] → 布局标脏
i=0  读 offsetTop → 脏 → 强制布局 ①（整棵树）
i=1  写 height[1] → 布局标脏
i=1  读 offsetTop → 脏 → 强制布局 ②
i=2  写 height[2] → 布局标脏
i=2  读 offsetTop → 脏 → 强制布局 ③
帧末 update the rendering：布局已是干净的 → 不再布局，直接绘制
本帧布局总账：3 次（帧末那次免单）
```

**例题（先读后写版）**：

```js
const tops = rows.map((r) => r.offsetTop);       // 全部读
rows.forEach((r, i) => { r.style.height = newHeights[i]; }); // 全部写
```

```
读 offsetTop ×3 → 布局是干净的（本帧尚无写入）→ 0 次强制布局，读到的是上一帧的布局
写 height ×3 → 只标脏 3 次，标脏本身不花钱
帧末渲染：统一清算一次布局 → 本帧布局总账：1 次（帧内 0 次）
```

**帧预算推演**：设单次布局 6ms、脚本每段 5ms、绘制 3ms。交错版帧耗时 = 脚本 5 + 强制布局 3×6 + 绘制 3 ≈ 26ms，超出 16.7ms 预算约 9ms——表现为连续掉帧。先读后写版 = 读 0（免费）+ 脚本 5 + 帧末布局 6 + 绘制 3 = 14ms，预算内。两版业务语义完全相同，差的是布局次数：**3 次 × 6ms 对 1 次 × 6ms**。这就是「读写分离」的全部秘密：它不减少布局这件事，它把 N 次布局合并成 1 次。

**推广判定法**：任何一段代码按行扫一遍，维护一个布尔量「布局是否脏」：遇到几何写置真；遇到几何读时若为真，布局计数加一并置假。扫完的计数值就是这段代码每帧要交的布局税。这个方法在 code review 里可以纯目力执行，不需要任何工具。

---

## 工程三陷阱（渲染性能）

1. **把 thrashing 搬进 rAF**。知道「rAF 里该做动画」之后，常见错误是把读写交错原样搬进 rAF 回调：回调里改样式、接着读 `getBoundingClientRect()` 做碰撞检测。位置从「任务时段」变成了「渲染前的帧内最高权限时段」，强制布局直接吃掉本帧预算——比放在外面更糟。正确形态：**rAF 回调第一段集中读（读到局部变量），第二段集中写**；或干脆读上一帧保存下来的值。
2. **顺序分离了、次数没合并**。修复 thrashing 时容易做成「每个事件 handler 内部先读后写」，但 scroll/mousemove 一帧内可能触发多个 handler，每个 handler 各自「读批 + 写批」——布局税还是每 handler 一笔。合并的正确单位是**帧**而不是 handler：用 rAF 把「本帧所有读」排到帧头、「本帧所有写」排到写段（FastDom 的 read/write 双队列做的就是这件事），同一帧内多个 handler 的读共享一次布局。
3. **把 INP 当 handler 耗时优化**。只盯着「处理时长」一段压时间（比如把 handler 的核心逻辑 debounce 掉），输入延迟与呈现延迟两段没动，INP 几乎不变；而 debounce 还把「下一帧必须有视觉反馈」变成「几百毫秒后才有」，用户感知更差。正路是三段分别归因：切片消灭输入延迟、handler 瘦身、视觉更新收敛到合成器友好的属性。

---

## 排查速查表：Performance 面板现象 → 原因 → 下一步

| 面板现象 | 最可能原因 | 下一步 |
| --- | --- | --- |
| Summary 里 Script 出现连续 50ms 以上的整段长条 | 长任务占住主线程 | PerformanceObserver 的 longtask 条目定位；切片或搬进 worker |
| Experience 轨道密密麻麻的 Layout，且每次紧跟在一段 Script 后 | 强制同步回流（写后读交错） | Event Log 里查强制回流来源栈，按手推配方找写后读对 |
| Bottom-Up 排序里 Recalculate Style 占大头 | 强制样式重算（大范围改类后又读了样式属性） | 检查 `getComputedStyle()` 读取点与批量改类的交错 |
| 帧率锯齿但 Script、Layout 都不长 | 绘制/合成负担（大面积重绘、层爆炸） | Layers 面板看层数与重绘区域；动画属性换成 `transform`/`opacity` |
| 帧率正常但点击响应慢 | 输入延迟段被长任务吃掉 | INP 三段分解：input delay 长 → 切片；processing 长 → 瘦身 handler |
| rAF 时间轴帧间隔忽大忽小无规律 | 部分帧超支后 vsync 重新对齐 | 用帧预算推演找出超支来源段 |

读表姿势：现象列是「你在面板里看到的」，原因列是「机制上唯一说得通的解释」，下一步列给的是「能落到代码行的动作」。三列对不上的情况（现象怪异、原因不明）先怀疑测试环境——无痕窗口、禁用扩展、干净 profile、低端移动设备模拟，四件套齐了再下结论。

---

## 决策速查表：更新路径怎么选

| 需求 | 首选路径 | 一句理由 |
| --- | --- | --- |
| 每帧连续动画 | rAF + `transform`/`opacity` | 对齐 vsync，且大概率只走合成 |
| scroll/mousemove 高频事件 | rAF 合帧（每帧一次）或节流 | 事件频率高于帧频时必然有浪费 |
| 点击后立即反馈 | leading 节流 / 乐观更新 | 输入延迟段越短 INP 越好 |
| 不紧急的后台工作 | `scheduler.postTask` 派 background / rIC | 不与交互抢同一优先级队列 |
| 重计算（单次约 50ms 以上） | Web Worker | 主线程预算留给交互与渲染 |
| 长列表渲染 | 虚拟滚动 | 直接把布局与绘制的输入缩小一个数量级 |
| 屏外内容 | `content-visibility: auto` | 浏览器原生的「屏外跳过渲染」 |

---

## 进阶输出预测题

### 题 3（模拟帧循环）

下面是「用 setTimeout 模拟渲染机会」的帧循环模拟器：rAF 用队列模拟，帧作为普通宏任务执行（浏览器里渲染时机由 vsync 决定，模拟器里由定时器代替）：

```js
const rafQueue = [];
const rAF = (cb) => rafQueue.push(cb);
function frame() {
  const snapshot = [...rafQueue];
  rafQueue.length = 0;
  for (const cb of snapshot) cb();
  return 'style/layout/paint';
}
console.log('A script');
Promise.resolve().then(() => console.log('B microtask'));
rAF(() => console.log('C rAF'));
setTimeout(() => console.log('frame:', frame()), 0);
```

写出输出顺序。

### 题 4（长任务吃掉交互）

```js
const t0 = performance.now();
setTimeout(() => console.log('排队任务执行于 t =', Math.round(performance.now() - t0), 'ms'), 0);
const deadline = performance.now() + 50;
while (performance.now() < deadline) {}
console.log('长任务结束于 t =', Math.round(performance.now() - t0), 'ms');
```

问题：`setTimeout(fn, 0)` 的回调实际在 t 等于多少毫秒附近执行？为什么不是 0 或 1？（答案见文末）

---

## 进阶预测题答案

### 题 3

```
A script
B microtask
C rAF
frame: style/layout/paint
```

实跑收据：题面代码即收据代码，Node v24.10 实跑三次输出一致。推演：同步代码 `A` 先走；脚本 task 结束即清空微任务 → `B`；`C` 只是进了 rAF 队列还没人消费；`setTimeout(…, 0)` 的回调是下一个 task；该回调模拟「到达渲染时机」，先一次性取出 rAF 队列跑掉 → `C`，再做渲染 → `frame: style/layout/paint`。顺序与真实浏览器的「task → 微任务 → rAF → 渲染 → 下一个 task」同构——唯一差别是模拟器里渲染时机由定时器代替 vsync。这条模拟器证明的是「微任务在一切后续 task（含渲染时机）之前」的硬约束，它在 Node 与浏览器之间跨实现成立。

### 题 4

实测（Node v24.10 真实事件循环，题面代码原样连跑三次输出一致）：

```
长任务结束于 t = 50 ms
排队任务执行于 t = 51 ms
```

推演：`setTimeout(fn, 0)` 只承诺「至少 0ms 后进入 task 队列」；fn 进队之后还排在**当前正在同步执行的这段代码**后面——事件循环是单线程的，忙等不释放主线程，队头的 fn 干等 50ms；忙等结束、同步代码走完，下一个 tick 才轮到 fn（51ms 与 50ms 之间的 1ms 是计时器精度与进队时序的正常抖动）。对应到浏览器：这段 50ms 忙等就是一个 50ms 长任务，t=0 用户的点击事件排在它后面——INP 三段分解里的「输入延迟」就是这么产生的。收据里数值高度稳定不是巧合：忙等的时长由 `deadline` 锁死，抖动只发生在长任务结束后的毫秒级——这正说明长任务的破坏量级由它自己的时长决定，与回调何时入队无关。

---

## 机制补遗：CSS 动画、WAAPI 与 rAF 的分界

rAF 循环是「主线程上的每帧脚本」，而 CSS transition/animation 声明的 `transform`/`opacity` 动画有机会被浏览器**搬进合成器线程**执行——主线程忙成什么样都不影响动画本身的流畅（合成器独立工作，这是「页面卡死时 loading 转圈还能转」的机制答案）。分界判据有三条：

- 动画只涉及 `transform`/`opacity`、又不需要暂停/反转等精细脚本控制 → 交给 CSS 动画或 WAAPI（`element.animate()`），优先吃合成器路径；
- 动画需要每帧根据状态计算（弹簧物理、跟随手势的进度、Canvas 场景）→ rAF，同时接受它占主线程预算，别在里面再塞别的活；
- 手势驱动（拖拽）→ 用 rAF 读手势状态并更新 `transform`，手势事件本身的处理保持轻量。

工程上有一条常见的退化链路值得记住：CSS 动画本来跑在合成器上，但有人给它外挂了每帧同步逻辑（比如另一个 rAF 循环每帧读布局、或者动画元素上叠加了会触发重绘的属性改动），把合成器动画拖回主线程——合成器路径的收益就没了。守住「动画的数据流不进主线程」这条线，才能长期吃到合成器的便宜。判断某段 CSS 动画是否真的在合成器上，实证手段是 Performance 面板的 Frames/主线程轨道：合成器动画在主线程轨道上没有对应帧内脚本。

---

## 综合案例推演：长列表「滚动卡 + 点击慢」的完整归因

把本册所有工具串一次。现象：2000 行列表，滚动掉帧，行内按钮点击响应经常超过半秒。

第一步，先归因再动手（对照排查速查表）：滚动掉帧且 Experience 轨道 Layout 密集 → 每帧都在全量布局，列表行数太大、布局输入失控；点击慢但帧率尚可 → 输入延迟段长，滚动期间存在长任务排在交互前面。两份证据指向两条不同的病灶，对应两个不同的药方——**这是本案例最重要的方法论：先归因、再动手，不要凭感觉一把改**。

第二步，逐项修，每项修完复测（不合并修改，否则无法知道哪个改动起了作用）：

1. 虚拟滚动把 DOM 从 2000 行降到可视区约 20 行：布局与绘制的输入缩小两个数量级，滚动掉帧消失；
2. 按钮点击 handler 里有一段约 60ms 的同步序列化 → 拆成「立即更新选中态（同步、便宜）+ `scheduler.postTask` 派 background 做序列化」：点击的视觉反馈回到 100ms 以内；
3. 滚动监听残留的节流 handler 每次读 `getBoundingClientRect()` 又写行样式 → 按读写分离改写，并用 IntersectionObserver 接替「滚到边界加载更多」：布局税归零。

第三步，用数字验收：滚动帧间隔稳定在 16.7ms 上下；点击交互三段分解里 input delay 从数百毫秒降到个位数毫秒。注意第 2 条的结构——「便宜的状态更新留在同步段、贵的计算让位到低优先级」是 handler 瘦身的通用模板，不是这个案例的特例；把它抽成团队约定，能预防一大类交互延迟事故。

最后是复盘两问，把个案变成团队资产：其一，**当时的归因证据链能否复现**——把修复前的 Performance 录制与关键指标存档，下一次同类现象出现时直接对照，省掉从零排查的成本；其二，**这次修复有没有制造新的隐性成本**——比如虚拟滚动引入了行高估算的复杂度、postTask 的 background 任务在页面关闭时被取消，数据是否完整。性能优化不是一次性的胜利，是「预算与账本」的长期管理：每一次改动都应该在案卷里留下「花了什么、换了什么」的两行记录，账目清晰的团队才谈得上持续的性能文化。

