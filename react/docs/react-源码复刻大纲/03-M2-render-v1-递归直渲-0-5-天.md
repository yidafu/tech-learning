---
title: "M2：render v1 —— 递归直渲（0.5 天）"
---

> 本文是《2. 复刻路线：十个里程碑（每步可运行，命名沿用经典 didact）》按小节拆分后的续篇，上一部分见 [02-2-复刻路线-十个里程碑-每步可运行-命名沿用经典-didact.md](02-2-复刻路线-十个里程碑-每步可运行-命名沿用经典-didact.md)。

### M2：render v1 —— 递归直渲（0.5 天）

- `render(element, container)`：递归 createDOM / appendChild / 设置 props（含事件）
- **故意保留缺陷**：递归不可中断 → 渲染万级节点卡死主线程（亲身体验，Fiber 的动机就刻在心里了）

M1 产出的是"描述"（element 树），M2 写第一个"执行者"：把描述变成真实 DOM。实现策略是最朴素的深度优先递归——这个版本**在功能上是完整的**（能渲染任意大的树），**在架构上是 React 15 的化石**（Stack Reconciler 同款：一旦开始，跑完为止）。我们故意保留缺陷，因为它是全篇最重要的教具。

完整实现（在 M1 的 `didact.js` 末尾追加）：

```js
// —— M2 追加：递归直渲 ——
export function render(element, container) {
  // ① 为当前节点创建真实 DOM
  const dom = createDom(element)

  // ② 深度优先递归孩子：先让孩子在 dom 里长完，再把自己挂上
  //    （先递归后 append 与先 append 后递归，最终 DOM 相同；
  //     差别在"屏幕何时开始出现内容"，M4 的 MutationObserver 实验能看到）
  element.props.children.forEach(child => render(child, dom))

  // ③ 把自己挂进文档
  container.appendChild(dom)
}

// 约定签名是 createDom(fiber)：M2 传进来的是 element，
// M3 起传 fiber——两者都有 .type 与 .props，本函数一个字都不用改就能用到 M9。
// fiber 本来就是 element 的超集，这不是巧合，是设计
export function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('') // 文本：先建空节点，nodeValue 由 updateDom 设置
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props) // 首次渲染 = 一次"从空 props 到满 props"的全量更新
  return dom
}

// —— props 的应用与更新（M5 的 diff 将原样复用这四个过滤器）——
const isEvent = name => name.startsWith('on') // onClick / onInput ... 事件类 prop
const isProperty = name =>
  name !== 'children' && !isEvent(name) // 普通属性：排除 children（不进 DOM）与事件
const isNew = (prev, next) => name => prev[name] !== next[name] // 新增或值变了
const isGone = (prev, next) => name => !(name in next) // 旧有新无 → 应清除

export function updateDom(dom, prevProps, nextProps) {
  // ① 事件：先摘掉"被替换或被删除"的旧监听
  //    注意过滤条件——事件名还在但回调函数变了，也要先摘旧的，否则监听叠加
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(name => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2) // onClick → 'click'
      dom.removeEventListener(eventType, prevProps[name])
    })

  // ② 事件：挂上新增或变化的新监听
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // ③ 属性：清除旧有新无的
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '' // 置空而非 removeAttribute，简单且对多数属性有效
    })

  // ④ 属性：设置新增/变化的
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name] // className、id、href、value... 直接赋 DOM 同名属性
    })
}
```

几个实现细节值得停下来咀嚼：

**为什么事件要"先摘后挂"两趟？** `dom.addEventListener('click', fn)` 对同一函数引用是幂等的，但 JSX 每次渲染都产生**新的**函数引用（`onClick={() => {...}}` 的箭头函数每次求值都是新对象）。如果只挂不摘，三次渲染后一个按钮上摞着三个旧回调，点一次触发三次。真实 React 用事件委托从机制上绕开了这个问题（M9 展开），我们的直挂方案则必须老老实实先摘后挂。

**属性为什么用赋值而不是 `setAttribute`？** `dom.className = 'x'` 与 `setAttribute('class', 'x')` 等价，但赋值对 `value`、`checked` 这类"活属性"行为更符合直觉（`input.value = 'x'` 更新的是当前值，`setAttribute('value')` 只改默认值）。教学版统一走赋值通道，代价是少数属性（如 `data-*`、`aria-*`、SVG 属性）赋值无效——如实声明这是简化，真实 React 在 `ReactDOMHostConfig` 里维护着一张精细的属性分发表。另外 `style` 只支持字符串形式（`style: 'padding:2px'`）；对象形式需要遍历赋值到 `dom.style` 的各子属性，留给读者作课后小改。

**文本节点的 diff 思路**（此刻还没有 diff，但通道已铺好）：文本 fiber 的 props 是 `{ nodeValue: '新文本', children: [] }`。将来 M5 对比新旧 fiber 发现 `nodeValue` 变化时，调 `updateDom(dom, oldProps, newProps)`，第 ④ 趟过滤 `isProperty('nodeValue')` 为 true、`isNew` 为 true，执行 `dom.nodeValue = '新文本'`——这恰好是更新 Text 节点文本的原生 API。M1 借名 `nodeValue` 的伏笔在这里兑现：**文本更新与属性更新共用同一条通道，零特判**。

**递归结构就是调用栈结构。** `render` 自己调自己处理孩子，整棵树的遍历状态保存在 JS 调用栈里——栈有多深，树就有多深，中途想暂停？栈帧里的位置信息没有任何手段导出。**这就是"不可中断"的本质：遍历状态存在一个无法序列化、无法暂停的地方。** 记住这句话，M3 的链表方案就是对它的正面回答。

**亲手复现"渲染 1 万个节点卡死"。** 这是本篇最重要的实验，benchmark 代码：

```js
// src/index.jsx —— M2 卡死实验
import { createElement, render } from './didact.js'

// ① 屏幕上挂一个 100ms 跳一次的毫秒时钟：它是"主线程是否健康"的心电监护仪
const clock = document.createElement('div')
clock.style.cssText = 'position:fixed;top:0;right:0;font:14px monospace;background:#000;color:#0f0;padding:4px 8px;z-index:9999'
document.body.appendChild(clock)
setInterval(() => {
  clock.textContent = 'clock: ' + (performance.now() / 1000).toFixed(2) + 's'
}, 100)

// ② 造 1 万行列表的 element 树
const rows = Array.from({ length: 10000 }, (_, i) =>
  createElement(
    'li',
    { key: String(i), style: 'padding:2px 4px' },
    '第 ' + i + ' 行：',
    createElement('b', null, '这是一段有点长度的文本内容')
  )
)

// ③ 计时渲染
const start = performance.now()
render(createElement('ul', null, ...rows), document.getElementById('root'))
console.log('render() 同步耗时(ms)：', (performance.now() - start).toFixed(0))
```

跑起来你会看到（具体数字随机器浮动，量级稳定）：

- `render()` 同步耗时几百到几千毫秒——**期间整个页面纹丝不动**；
- 最有信息量的现象：右上角的 clock **停跳了**。100ms 一次的 `setInterval` 回调被排队但无法执行，等 render 返回后 clock 一次性跳到位。JS 执行与定时器同住主线程，长任务把所有人堵在门外；
- 打开 Performance 面板录一次：一条远超 50ms 阈值的红色 Long Task 横贯其中，期间的 Frames 轨道全部空白（浏览器没机会渲染一帧）；
- 渲染期间用鼠标点击页面任何按钮，click 回调同样排队等 render 结束——**用户眼里这就是"页面死了"**。

再叠加一个交互实验把体感做实：render 之前放一个按钮，`onclick` 里 `alert('clicked')`。render 卡死的几秒里点它，alert 要等渲染完才弹出来。你对"主线程被独占"的理解从此不再是名词解释，而是肌肉记忆。

把这个现象和 §1 的架构地图对上：M2 的递归 render 同时干了 Scheduler（立即开始）、Reconciler（递归 diff）和 Renderer（顺手 appendChild）三层所有的活，且以"一整条不可分割的同步调用栈"的形式——这正是 Stack Reconciler 的结构。React 16 的全部重写动机，就是你刚才那几秒的卡死放大到 Facebook 的信息流场景。**Fiber 的动机到此刻已经刻在你心里了，后面 M3/M4 的每一行代码都是在还这笔债。**

**验收方式（M2）**：① 跑 benchmark，控制台看到 render 同步耗时进入数百毫秒以上量级、clock 停跳后一次追平；② Performance 面板录到一条覆盖渲染全程的 Long Task；③ 把数量降到 100 行再跑，页面正常渲染出带样式的列表、`<b>` 嵌套正确——确认功能本身没坏，坏的只是"规模承受力"；④ （可选）给列表里某行加 `onClick`，DevTools Elements 面板确认监听挂在对应 li 上，点击有效。四项全过，M2 完成——带着那份"卡死的体感"进 M3。

