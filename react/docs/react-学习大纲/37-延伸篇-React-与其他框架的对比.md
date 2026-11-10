---
title: "延伸篇：React 与其他框架的对比"
---

## 延伸篇：React 与其他框架的对比

> 定位：本篇不是"背对比题的资料汇编"，而是把大纲前几个阶段你**亲手写过的场景**（计数器、受控输入、TodoMVC、组件通信），用 Vue 3、Svelte 5、SolidJS、Angular 再写一遍——同一个问题、两种解法，差异会自己浮出来。建议在完成阶段 1–2（至少写过计数器、TodoMVC、受控输入）之后阅读，或在面试前集中读一遍。没有写过也能读，但所有"对比"都会失去锚点，退化成又一篇看过就忘的特性清单。

### 1. 为什么要对比：四个真实动机

学一种框架时，你会默认它的做法是"理所当然"的：state 不可变、`setState` 不立即生效、Hooks 不能写在条件语句里——你把这些当常识背下来，却说不出"为什么必须这样、不这样会怎样"。直到你看到另一个框架**反着做还同样成立**（Vue 的 state 可变、赋值立即生效、ref 可以在任意位置创建），你才第一次真正理解双方。这是最被低估的动机，其余三个都很现实：

1. **选型**：新项目技术评审、老项目重构论证，绕不开"为什么是 React 不是 Vue"这类问题。答"团队熟 React"是对的，但你得先知道"换另一个会损失什么、得到什么"，才能让这个答案站得住。
2. **协作**：国内大量团队 React/Vue 混用（甚至同公司不同产品线各一栈），换组、接手别人项目、做公共库时的第一道坎不是语法，而是心智模型切换。
3. **面试**：对比题（"React 和 Vue 的区别"）是中高级面试的常客。它考的不是特性清单，是你是否理解**每个设计选择付出的代价**——本篇第 12 节给答题框架。

方法论先立好：**对比单位是"场景"，不是"特性"。**"Vue 有 `v-model`、React 没有"这类特性表记三个月就忘；"同一个双输入框表单，React 怎么写、Vue 怎么写、各自的拦截点在哪、为什么 React 刻意不提供 `v-model`"才记得住。所以本篇每一节都是：先摆一个你写过的场景，再并排放各框架的实现，最后追问机制层面的"为什么"。

对比对象选四个，各有明确的"出场理由"：

- **Vue 3**（Composition API + `<script setup>`）：国内市占最高的替代品，你最可能真的遇到它；同时它和 React 构成"细粒度响应式 vs 重渲染"最经典的一组对照。
- **Svelte 5**（Runes）：编译器路线的代表——框架在构建期被"编译掉"，用来理解"运行时框架"这个前提本身是可以被挑战的。
- **SolidJS**：细粒度响应式 + JSX。它的价值在于破除一个误解："JSX = React 心智"。Solid 写的是 JSX，组件却从头到尾只执行一次——你会 JSX 不等于你会 Solid。
- **Angular**：企业级全家桶（DI、路由、表单、测试一体），大厂后台系统常见；选型讨论里它是"约定与规范"路线的极端代表。

不排 React Native / Flutter 这类跨端方案——那是"用 React 写原生界面"，属于另一条线，不是框架对比。

---

### 2. 总览：三种响应式心智模型

先给一张定位表当"地图"，后面所有场景对比都在验证这张地图。**看不懂中间两列没关系，本节末尾和后面每一节会把它们逐个讲透**：

| 框架 | 渲染单位 | 响应式原语 | UI 表达 | 一句话定位 |
|---|---|---|---|---|
| React | 组件函数整体重跑 | `useState` / `useReducer`（不可变快照） | JSX（就是 JS 表达式） | UI = f(state)：重渲染 + 虚拟 DOM diff 兜底 |
| Vue 3 | 组件（模板编译为渲染函数） | `ref` / `reactive`（Proxy 代理，**可变**） | SFC 模板（受限 DSL） | 响应式系统 + 编译期优化的渐进式框架 |
| Svelte 5 | 组件（编译为接近原生 DOM 操作的代码） | `$state` / `$derived`（Runes，信号） | 模板 + 块语法 | "消失的框架"：运行时逻辑在构建期做掉 |
| SolidJS | 组件函数**只跑一次** | `createSignal` / `createMemo`（信号） | JSX（但语义与 React 不同） | 细粒度响应式，JSX 皮、信号心 |
| Angular | 组件 + 变更检测 | `signal`（16+，之前靠 Zone.js） | 模板 + 指令 | 企业级全家桶：DI/路由/表单/测试开箱即用 |

主流方案实际上只分三种心智模型，上面五个框架是这三种模型在不同程度上的混合：

**模型 A：重渲染（React）。** 数据变化 → 重新调用组件函数 → 生成新的虚拟 DOM → diff 出差异 → 打补丁。你写的函数会被**反复从头执行**，所以必须不可变（否则 diff 输入没变化）、必须纯（会被双调用）；"闭包读到旧值"是这套模型的必然副产品（阶段 2 闭包陷阱专题）。React **不追踪**"哪个数据被哪段 UI 使用"，它用"整个函数重跑 + diff"来兜底正确性。代价是重渲染风暴与手动 `memo`/`useMemo`（阶段 6 的全部内容），收益是模型极其简单：任何时刻，UI 都是当前 state 的纯函数映射，调试时不存在"数据变了但界面没跟上"的玄学——有的只是"函数没被重跑"或"重跑了但 diff 没变"。

**模型 B：细粒度响应式（Vue 3 / Solid / Svelte 5 的 Runes / Angular Signals）。** 数据是"信号"（signal），UI 在读取信号时**自动登记订阅**；数据变了，只有真正用到它的那一小段 DOM 会更新——组件函数甚至可能从头到尾只执行一次（Solid 就是这样）。数据是**可变**的（`count.value++`），没有快照、没有闭包旧值问题；但它有自己的坑：解构丢响应性、依赖追踪的"魔法"边界（哪些写法会被追踪、哪些不会）。你在 React 里学的"谁订阅谁更新"在 Zustand 的 selector、TanStack Query 的按 key 订阅里已经出现过了——信号只是把这套思想推进到 DOM 粒度。

**模型 C：编译器路线（Svelte / Vue 模板编译 / React Compiler）。** Svelte 是激进派：没有虚拟 DOM、没有运行时 diff，编译器直接分析你的组件，产出"更新这个文本节点"这样的原生 DOM 操作代码，框架本身"被编译掉"，打包产物只剩你实际用到的几 KB。Vue 模板是温和派：模板里的表达式受限（每个绑定只能是单条表达式），正因受限，编译器能做静态分析——静态节点提升、patch flag 标记动态部分，diff 之前已经跳过大半工作。React 原本是"运行时兜底"派，React Compiler（已随 React 19 时代正式发布）代表它开始吸收编译器路线：静态分析你的组件，自动插入 memo 化，把阶段 6 里手动做的优化自动化。

由此得出本篇最重要的一个判断——**"表达能力 vs 优化能力"是根本权衡**：JSX 是完整的 JS，可以在列表里塞任意逻辑，但编译器几乎无法静态预测它会渲染出什么，所以 React 长期只能靠运行时重渲染 + diff 兜底；Vue/Svelte 模板的表达受限（不能随意写语句、指令集合固定），换来了编译期优化空间。两个方向都成立，也都付出了代价——这就是为什么"React 和 Vue 谁更好"是伪问题，"你的场景更吃哪边的代价"才是真问题。

还有一条贯穿全篇的提醒：**JSX ≠ React 心智**。Solid 用 JSX 但组件只跑一次，`{count()}` 是函数调用不是插值；反之模板 ≠ 简单。判断你是否理解一个框架，标准是开篇的三条自测（盲写/坑位/讲授），不是"语法长得像不像我已经会的"。

---

### 3. 场景对比｜计数器：状态更新的三种哲学

用阶段 2 的第一个场景开刀，因为它是所有差异的最小可复现单元。需求不变：**点一次按钮，count +3**。这个"点一次 +3"的写法差异，恰好把三大模型的状态更新哲学全部暴露出来。

React 版（阶段 2 已详述机制，这里只放结论代码）：

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const add3 = () => {
    setCount(c => c + 1); // 必须：函数式更新，站在上一步结果上算
    setCount(c => c + 1);
    setCount(c => c + 1);
    // 若写成 setCount(count + 1) ×3，只会 +1——count 是本次渲染的快照
  };

  return <p>count = {count}<button onClick={add3}>点我 +3</button></p>;
}
```

Vue 3 版：

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);

function add3() {
  count.value += 1; // 写入立即生效，count.value 此刻已经是 1
  count.value += 1;
  count.value += 1; // 结束时 count.value === 3，无需任何特殊写法
}
</script>

<template>
  <!-- 模板里自动解包，不用写 count.value -->
  <p>count = {{ count }}</p>
  <button @click="add3">点我 +3</button>
</template>
```

Svelte 5 版：

```svelte
<script>
  let count = $state(0); // Runes：看起来是普通变量，实际是编译器指令

  function add3() {
    count += 1; // 编译器把"对 $state 变量赋值"翻译成信号更新
    count += 1;
    count += 1;
  }
</script>

<p>count = {count}</p>
<button onclick={add3}>点我 +3</button>
```

SolidJS 版：

```jsx
import { createSignal } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);

  const add3 = () => {
    setCount(count() + 1); // setCount 立即生效，count() 此刻已经是 1
    setCount(count() + 1); // 也可以写函数式 setCount(c => c + 1)，但这里不是"必须"
    setCount(count() + 1);
  };

  // 注意：这个组件函数整个生命周期只执行一次
  return <p>count = {count()}<button onClick={add3}>点我 +3</button></p>;
}
```

Angular（signal + `update`）：

```tsx
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>count = {{ count() }}</p>
    <button (click)="add3()">点我 +3</button>
  `,
})
export class CounterComponent {
  count = signal(0);

  add3() {
    this.count.update(c => c + 1);
    this.count.update(c => c + 1);
    this.count.update(c => c + 1);
  }
}
```

四个版本语义全部正确（都显示 3），但**底层发生的事完全不同**。逐动作对照：

| 动作 | React | Vue 3 | Svelte 5 | Solid / Angular |
|---|---|---|---|---|
| 读取状态 | 读渲染快照里的普通变量 | `count.value`：Proxy 的 get，**顺路收集依赖** | 读编译生成的信号 | `count()`：getter，同样收集依赖 |
| 写入状态 | `setCount` 只是**排队一个更新请求** | 赋值**立即改真实值**，触发订阅者 | 赋值经编译变成信号更新 | `setCount` 立即写真实值 |
| 写完立刻再读 | **旧值**（快照不变） | **新值** | **新值** | **新值** |
| 界面更新时机 | 重渲染（重跑组件函数）+ diff 之后 | 排队到微任务批量 flush | 编译期调度（微任务） | 同步细粒度更新 DOM |
| 是否需要函数式更新 | 新值依赖旧值时**必须** | 永远不需要 | 永远不需要 | 可选（两种都对） |

表格里最关键的一行是"写完立刻再读"。React 的 `setCount` 之后 `count` 纹丝不动——这不是实现细节没做好，而是设计：**state 是"本次渲染的快照"，更新是"提交一次请求"**，这个模型让渲染成为纯函数、让并发渲染成为可能（阶段 10 会看到这是 Fiber 时间切片的前提）。Vue/Solid/Svelte 的赋值立即生效——因为它们的模型是"信号 + 订阅"，写入就该立刻反映到数据本身，UI 的同步是订阅的事，与"读值"无关。

于是四个框架各有自己的"招牌坑"，而且坑与坑之间互为镜像：

- **React 的坑**：闭包旧值——`setTimeout`/事件订阅里读到过期 state（阶段 2 闭包陷阱专题的完整推理）。根源：快照模型。
- **Vue 的坑**：解构丢响应性——`reactive` 对象解构出来的是普通值：

  ```js
  const state = reactive({ count: 0 });
  const { count } = state; // ❌ count 是普通数字，与 state.count 断开连接
  count++;                 // state.count 仍是 0，界面也不会更新
  ```

  修法是 `toRefs(state)`，或者干脆全程用 `ref`。根源：响应性附着在 Proxy **对象**上，解构把值从对象里"拔"了出来。（注意区分：Vue 3.5 起 `defineProps` 的解构是**特例**，编译器会处理成保留响应性——这恰恰说明"解构丢响应"是心智负担，官方要专门做编译补偿。）
- **Svelte 5 的坑**：忘写 Runes——`let count = 0` 不加 `$state`，编译器把它当普通变量，改了不更新界面，且**没有任何报错**。根源：编译器路线的一切都建立在"你告诉了编译器什么"上。
- **Solid 的坑**：组件顶层解构 props——组件只跑一次，解构发生在"一次"里，之后 props 更新跟你解构出来的常量无关，官方文档用整页警告这件事。根源同 Vue：响应性附着在访问行为上，解构把"访问"固化成了"值"。

把这个场景收进面试题落点："为什么 React 同一函数里连调三次 `setState` 只加一？"——只答"因为批处理"得一半分；答出"因为快照模型 + 更新队列，函数式更新让每一步站在前一步的结果上"是满分；而能补一句"Vue 里不存在这个问题，因为 `count.value` 是立即生效的代理写入——两种模型各自催生了对方的经典坑（快照闭包 vs 解构丢响应）"，是把两个框架都真正学过的信号。

---

### 4. 场景对比｜表单输入：受控组件 vs 双向绑定

场景来自阶段 3 模式 1：一个文本输入框，且要求**过滤空白字符**——有拦截需求的表单才见真章，因为纯展示的双向同步用哪个框架都一样舒服。

React 版——没有"双向绑定"这个概念，数据永远单向：state → `value`；用户输入 → `onChange` → `setState` → 重渲染：

```tsx
function NameForm() {
  const [name, setName] = useState('');

  return (
    <input
      value={name}
      onChange={(e) => {
        const v = e.target.value;
        setName(v.replace(/\s/g, '')); // 拦截点：不 setState，界面就不变
      }}
    />
  );
}
```

Vue 3 版——`v-model` 及其展开：

```vue
<script setup>
import { ref } from 'vue';
const name = ref('');
</script>

<template>
  <!-- 语法糖形态 -->
  <input v-model="name" />

  <!-- 对文本框，等价于： -->
  <!-- <input :value="name" @input="name = $event.target.value" /> -->

  <!-- 要拦截时，拆开语法糖自己写（或用 watch）： -->
  <input :value="name" @input="name = $event.target.value.replace(/\s/g, '')" />
</template>
```

Svelte 5 版——`bind:` 指令：

```svelte
<script>
  let name = $state('');
</script>

<!-- 默认形态 -->
<input bind:value={name} />

<!-- 要拦截时，同样拆开：value 单向 + oninput 手动同步 -->
<input value={name} oninput={(e) => (name = e.currentTarget.value.replace(/\s/g, ''))} />
```

三个版本功能等价。真正的差异是**"你在哪一层看见数据流"**，这决定了拦截、联动、调试的手感：

1. **React 把每一步写在明面上，所以拦截是默认能力。** 受控组件的本质是"DOM 的值由 state 驱动"——`onChange` 里不调 `setState`，输入框就不变，天然是个过滤器/格式化器。阶段 3 模式 1 的"双模式 Input"、只允许输数字的金额框、输入时自动去首尾空格，全都是同一个模式的变体。Vue/Svelte 的 `v-model`/`bind:value` 把"读 DOM → 写数据"这一步藏进了语法糖，默认形态下 DOM 是源头、数据跟随——要拦截就得**主动拆开糖**（如上面代码），或绕到 `watch`/修饰符（Vue 的 `.lazy`、`.number` 本质是预制的拦截器）。
2. **谁拥有 input 的 DOM 值。** React 受控 = state 是唯一事实源，DOM 是投影；Vue 默认 = DOM 是源头，ref 是影子。做个思考题：在 Vue 里实现和 React 受控组件**完全一样**的"强制大写输入框"（用户敲小写，框里显示大写）——你会发现 `@input` 里改了 ref 之后，DOM 值不一定跟着回写（浏览器已把字符放进 input，Vue 不会无差别重设 `value`），要靠 `nextTick` 或强制赋值处理边界。亲手踩一遍，你就理解 React 为什么把"受控"做成默认路径：**它把"UI 是数据的投影"这条原则贯彻到了表单，代价是每个输入框都要手写 onChange。**
3. **组件层的双向绑定。** Vue 在组件上用 `v-model` 时，实际是 `modelValue` prop + `update:modelValue` 事件的合成；Vue 3.4+ 的 `defineModel()` 宏把这两步合成一步：

   ```vue
   <!-- 子组件 CustomInput.vue -->
   <script setup>
   const model = defineModel(); // 等价于：接 modelValue prop + emit('update:modelValue')
   </script>

   <template>
     <input v-model="model" />
   </template>
   <!-- 父组件：<CustomInput v-model="name" /> -->
   ```

   React 没有对应物——你在阶段 3 模式 9 写的"受控 + 非受控双模式组件"（接 `value`/`onChange`，内部再兼容 `defaultValue`），就是 Vue `defineModel` 展开后的样子，只是 React 要求你显式写全，也因此你能自由决定暴露几个控制点（`value` 之外再加 `open`、`activeIndex`……）。

生态映射一句话收尾：表单库的路线也跟着分野——React 的 react-hook-form 走**非受控优先**（注册 ref、少重渲染，阶段 4.1 讲过原因），Vue 的 vee-validate 跟随 `v-model` 直觉；Angular 更极端，官方直接内置两套表单体系（模板驱动 vs 响应式）让你选。框架的表单哲学，就是它的数据流哲学的投影。

---

### 5. 场景对比｜列表与 key：diff 的输入从哪来

场景来自阶段 1 场景 3：渲染 `todos` 列表，并保证插入/删除/排序时**带输入框的子组件状态不串位**（那个"删中间一项、底下输入内容错位"的经典 bug）。

React 版——列表就是普通 JS 表达式，`key` 是你唯一能递给 diff 的线索：

```tsx
{todos.map((todo) => (
  <TodoItem key={todo.id} todo={todo} />
))}
```

Vue 3 版——模板指令 + `:key`：

```vue
<TodoItem v-for="todo in todos" :key="todo.id" :todo="todo" />
```

Svelte 5 版——each 块，key 写在括号里：

```svelte
{#each todos as todo (todo.id)}
  <TodoItem {todo} />
{/each}
```

三个框架都要求"稳定唯一 id 作 key、别用数组索引"——因为列表更新的正确性都依赖 key 做新旧节点的配对。**但"diff 发生之前"的世界完全不同**，这是面试对比题的真正得分点：

1. **React：重渲染是常态，diff 是唯一防线。** `todos` 变化 → 组件函数重跑 → `map` 全量执行 → 生成全新的虚拟 DOM 树 → diff 逐个比对新旧 → 决定哪些真实 DOM 复用、哪些更新。key 决定配对关系，React 用"从左到右遍历 + key 索引映射"的方式配对。因为函数组件每次全量重跑，diff **没有**任何编译期信息可以借助——这就是阶段 6 里 `memo`、key 稳定性、列表项拆组件这些优化手段存在的原因。
2. **Vue：diff 之前已经跳过了大半工作。** 模板编译时，编译器标记了每个节点的性质：完全静态的节点被**提升**到渲染函数外（每次重渲染直接复用，不进 diff），动态节点被打上 **patch flag**（"只有 class 会变""只有文本会变"），diff 时按 flag 只比对会变的部分。列表 diff 用**最长递增子序列**算法找"不需要移动的节点"，移动次数比朴素配对少。Vue 3 渲染函数的重跑只发生在"依赖变化的组件"上，粒度已经比 React 小一层。
3. **Svelte：把"列表更新"编译成定向 DOM 操作。** `{#each}` 块编译后就是一段"根据 key 增删移动这些 DOM 节点"的原生代码，不存在"重跑组件、重新生成整棵虚拟树"这回事——更新成本的量级从"树 diff"降到"节点操作"。

补一个 Vue 特有的坑（React 里不存在对应物）：**同一标签上 `v-if` 与 `v-for` 同时使用**。Vue 3 中 `v-if` 的优先级**高于** `v-for`，所以 `v-if="todo.done"` 里引用迭代变量 `todo` 会直接报错——条件想依赖循环项，要套一层 `<template v-for>`。React 里条件渲染和列表是同一层 JS 表达式，优先级问题在语法上不可能发生——这是"模板受限换优化"的另一面账单。

最后看一眼 Solid，它把这个场景推到了逻辑终点：`<For each={todos}>` 组件用**引用相等**直接复用节点，数据变的时候，只有"值真的变了的那几个文本节点"被更新——没有"重渲染列表"这个概念，key 的意义退化成排序提示。你可以不喜欢它的抽象，但它清楚地展示了重渲染模型省掉的到底是哪些开销。

---

### 6. 场景对比｜派生与副作用：useEffect vs computed / watch vs $derived

场景来自阶段 2：商品单价 × 折扣 → 展示折后价（**派生值**）；购物车数量变化时上报埋点（**副作用**）。这组对比最值得做，因为两条路线的框架在这里**殊途同归**。

React 版（阶段 2 的结论：派生值不要存 state，渲染中直接算；副作用进 effect）：

```tsx
function Cart({ price, discount, quantity }) {
  const discounted = price * discount; // 派生：直接算，不用 useState 存

  useEffect(() => {
    track('cart_change', quantity); // 副作用：声明式地挂在依赖上
  }, [quantity]);

  return <p>折后价：{discounted}</p>;
}
```

Vue 3 版——两个原语分开：

```vue
<script setup>
import { computed, watch } from 'vue';

const props = defineProps(['price', 'discount', 'quantity']);

const discounted = computed(() => props.price * props.discount); // 派生：自动收集依赖 + 缓存

watch(
  () => props.quantity,
  (q) => track('cart_change', q) // 副作用：显式声明"谁变了就跑"
);
</script>

<template>
  <p>折后价：{{ discounted }}</p>
</template>
```

Svelte 5 版——Runes 一一对应：

```svelte
<script>
  let { price, discount, quantity } = $props();

  let discounted = $derived(price * discount); // 派生

  $effect(() => {
    track('cart_change', quantity); // 副作用
  });
</script>

<p>折后价：{discounted}</p>
```

逐概念对齐成一张表（这张表建议抄进 NOTES.md，比背任何对比文章都管用）：

| 意图 | React | Vue 3 | Svelte 5 | Solid |
|---|---|---|---|---|
| 派生值（有缓存、可共享） | 渲染中直接算；跨组件共享时 `useMemo` | `computed` | `$derived` | `createMemo` |
| 响应数据变化的副作用 | `useEffect` | `watch` / `watchEffect` | `$effect` | `createEffect` |
| 依赖怎么来 | **手写**依赖数组（错了不报错，靠 lint） | **自动收集**（读到了什么就追什么） | 自动收集 | 自动收集 |
| 派生值缓存语义 | 每次渲染重算（`useMemo` 按依赖缓存，但缓存不保证保留） | 依赖不变直接返回缓存 | 惰性按需重算 | 按依赖缓存 |
| 官方"能不用就不用"清单 | 《You Might Not Need an Effect》 | `watch` 文档同款提醒 | `$effect` 文档红字警告 | 同 |

几个值得停下来的点：

1. **`useMemo` ≈ `computed`，但差一个"自动"**。语义上它们都是"依赖不变的派生缓存"，区别只在依赖来源：Vue 读到什么追什么（运行时自动），React 要你手写数组（写错了靠 `exhaustive-deps` lint 兜底）。React Compiler 的核心卖点就是把这个手写自动化——等于官方承认"手写依赖数组"是这套模型的主要摩擦点。
2. **`useEffect` 在响应式框架里没有单一对应物**。Vue 把 React 一个 `useEffect` 承担的职责拆成了四个：`watch`（响应数据）、`watchEffect`（自动收集 + 立即跑一次）、`onMounted`（首次挂载）、`onUnmounted`（清理）。这不是 Vue 更啰嗦，而是"副作用"这个词在 React 里被一个 API 承载了太多含义——阶段 2 里你列过 useEffect 的五类用途（订阅、定时器、请求、DOM 测量、日志），在 Vue 里它们本来就分属不同的原语。
3. **纪律完全收敛**。三边的官方文档都有一页"什么时候不该用我"：派生就用派生原语、别在副作用里同步状态、别用副作用驱动渲染。你在 React 里背过的《You Might Not Need an Effect》清单，逐条翻译过去在 Vue/Svelte 依然成立——**框架会变，数据流的纪律不变**。这也是第 12 节对比题的高分心法。

---

### 7. 场景对比｜组件通信：props 下行、事件上行、跨层注入

场景来自阶段 1 场景 6 + 阶段 3 模式 5：`TodoList` 传项给 `TodoItem`，`TodoItem` 里点删除要通知回来；再往深处，主题配置要跨五层传递。

先说**不变量**：所有主流框架都是**单向数据流**——props 下行、事件上行、禁止子组件直接改父组件的数据。分歧只在"事件"怎么表达。

React 版（传回调 props）：

```tsx
function TodoItem({ todo, onRemove }: { todo: Todo; onRemove: (id: number) => void }) {
  return (
    <li>
      {todo.text}
      <button onClick={() => onRemove(todo.id)}>删除</button>
    </li>
  );
}
// 父组件：<TodoItem todo={t} onRemove={removeTodo} />
```

Vue 3 版——事件要**显式声明**（`emit`）：

```vue
<!-- 子组件 TodoItem.vue -->
<script setup>
defineProps(['todo']);
const emit = defineEmits(['remove']);
</script>

<template>
  <li>
    {{ todo.text }}
    <button @click="emit('remove', todo.id)">删除</button>
  </li>
</template>

<!-- 父组件 -->
<!-- <TodoItem v-for="t in todos" :key="t.id" :todo="t" @remove="removeTodo" /> -->
```

Svelte 5 版——用回调 props，**正在向 React 收敛**：

```svelte
<script>
  let { todo, onRemove } = $props();
</script>

<li>
  {todo.text}
  <button onclick={() => onRemove(todo.id)}>删除</button>
</li>
```

三个观察：

1. **React"一切皆 props（含回调）"的表达正在被吸收**。Svelte 4 的 `createEventDispatcher` 在 Svelte 5 已被标记为不推荐，官方推荐就是上面这种回调 props；Vue 社区也常在逻辑组件（headless 组件）里直接传函数 props。函数式表达（传函数）vs 声明式表达（声明事件名）之争，实践中正在向前者收敛——但模板生态里 `@event` 的可读性和 DevTools 的事件追踪仍有价值。
2. **跨层注入的差异直接反映响应式模型**。React 的 Context（阶段 3 模式 5、阶段 5 的性能陷阱）：Provider 的 `value` 是普通对象，引用一变，**所有消费组件全量重渲染**——所以要拆分 Context、要 memo value。Vue 的 `provide`/`inject`：传下去的是 ref，消费方拿到的是**订阅**，只有真正用到的那部分更新——React 阶段 5 里"拆 Context"的优化手段，在这里不需要，因为细粒度订阅是白送的。Svelte 的 `setContext`/`getContext` 同理（传 store/信号，天然按订阅更新）。
3. **插槽的表达**。React 用"组件即属性"表达插槽：`children`、具名 children（`<Card title={...} footer={<Footer />} />`，阶段 3 模式 2），没有专门语法；模板系有专门语法——Vue 的 `slot`/具名插槽/作用域插槽，Svelte 5 用 snippet（`{#snippet}` + `{@render}`）。React 的做法更"反直觉但更一致"（还是 props），模板系的做法更"直观但多一套 DSL"。

跨层传递在 Angular 里走的是 DI 容器（`inject()` 服务），把"共享"从组件树里拿出来放到依赖图里——这也是它"全家桶"定位的一个切片：配置、日志、HTTP 客户端都是可注入服务，组件树只负责渲染。

---

### 8. 场景对比｜生命周期：组件函数到底跑几次

不背生命周期 API 对照表（背了也会忘），只回答一个根问题：**组件的代码到底执行几次**。这是所有生命周期差异的源头，也是"hooks 为什么不能写在条件语句里"这道面试题的完整答案所在。

| 时机 | React | Vue 3 | Svelte 5 | Solid |
|---|---|---|---|---|
| 组件"初始化代码" | 首次渲染时函数体第一次执行 | `setup` 顶层（`<script setup>`）**只跑一次** | 组件初始化时执行 | 组件体**只跑一次** |
| 数据更新时 | **整个函数体重跑** | 只有模板渲染函数重跑（setup 不重跑） | 依赖变化时局部更新对应 DOM | 无"组件更新"概念 |
| 挂载完成 | `useEffect(() => {}, [])` | `onMounted` | `$effect` 首次运行 | `onMount` |
| 卸载清理 | effect 返回清理函数 | `onUnmounted` | `$effect` 返回清理函数 | `onCleanup` |

用这张表能一次性解释三件之前"背过但没懂"的事：

1. **为什么 React Hooks 不能写在条件/循环里？** React 靠调用顺序把"第 N 个 Hook"和"第 N 个状态槽"对上号（链表），重渲染时必须按同样的顺序调用同样的 Hooks——条件调用会让槽位错位。而 Vue 的 `ref()`/Solid 的 `createSignal()` 是普通函数调用，**与调用位置和顺序无关**，想放哪放哪——因为响应式框架的"状态"附着在信号对象本身上，不依附执行上下文。同一道面试题，React 侧答"链表顺序"，Vue/Solid 侧答"根本没有这个约束，因为模型不同"。
2. **为什么 Vue/Solid 的"自定义逻辑复用"（composable / 响应式函数）没有 React Hook 的那堆规则？** 它们就是普通函数，在 setup/组件体里调用一次，闭包捕获信号，没有"每次渲染重建"的问题。React 的自定义 Hook（阶段 2）之所以要讲那么久，正是因为"函数每次渲染都重跑"这个前提衍生出了闭包、依赖数组、调用顺序三整套纪律。
3. **为什么 Vue/Svelte 组件里"顶层代码"和 React 组件里"顶层代码"含义完全不同？** React 组件函数体每次渲染都执行——放逻辑会反复跑，所以才有 useMemo/useCallback；Vue 的 setup/Solid 的组件体只执行一次——放的是"初始化 + 建立订阅"，天然的"构造函数"语义。**把 React 代码翻译成 Vue 时，最危险的不是语法，是"这段代码会跑几次"的直觉全部要重装。**

---

### 9. 生态对照：从状态库到元框架

框架本体只解决"响应式 + 组件"，日常开发 80% 的时间在生态里。逐领域对照（加粗为各领域事实标准或官方推荐）：

| 领域 | React | Vue 3 | Angular | Svelte |
|---|---|---|---|---|
| 路由 | **React Router v7** | **vue-router** | Angular Router | SvelteKit 内置 |
| 全局状态 | **Zustand** / RTK / Jotai | **Pinia**（官方） | Signals + 服务 / NgRx | stores + runes |
| 服务器状态 | **TanStack Query** | TanStack Query（vue-query） | TanStack Query | TanStack Query |
| 表单 | **react-hook-form** + zod | vee-validate + zod | Reactive Forms（内置） | 生态较弱，常自写 |
| SSR / 元框架 | **Next.js** | **Nuxt** | Analog（老方案 Universal） | **SvelteKit** |
| 移动端 | **React Native** | uni-app（Vue 语法，多端） | Ionic/Angular | 生态弱 |
| 国内常用组件库 | Ant Design / MUI | Element Plus / Naive UI | Angular Material | Skeleton 等 |
| TypeScript 体验 | 原生好（JSX 即 TS） | 好，模板需 vue-tsc 辅助 | 最好（全 TS 起步） | 好 |

三个值得展开的观察：

1. **你在阶段 5 学的"客户端状态 vs 服务器状态分离"，是跨框架共识。** TanStack Query 五个框架全都有官方适配——服务器状态管理这块早就脱离了框架之争。Pinia 的 API（state/getter/action + 组合式 store）几乎就是 Zustand 思路的 Vue 翻译；学会一个，另一个半天上手。
2. **服务端方向的分野（衔接阶段 9）**：React 的 App Router 走得最激进——RSC（服务端组件）把"组件在服务端渲染、不进客户端 bundle"变成一等公民，代价是概念复杂度（Server/Client 边界、缓存语义）全行业最高；Nuxt/SvelteKit 是更传统的"同构应用"路线（SSR/SSG/水合），约定优于配置、目录即路由，上手曲线平缓。选型时"团队能否吃下 RSC 心智模型"是一个真实的成本项。
3. **生态位决定了"学哪个不亏"**：React 的生态广度（headless 库、AI 生成代码的质量、招聘池、跨端延伸 RN）仍然是最大护城河；Vue 的优势在"官方一体化"（Pinia/vue-router/Vite 全官方出品，版本对齐，文档中文一流）；Angular 赢在强约定带来的多人协作下限；Svelte 赢在产物体积与 DX，但生态深度（企业级组件库、跨端、招聘）短期是短板。

---

### 10. 选型决策：什么时候选 React，什么时候不选

把上面的机制差异落成决策表。先说总原则：**绝大多数业务系统里，React 和 Vue 的差距远小于"写得好与写得烂"的差距**——所以这张表里每一行的前提都是"团队能力相当"，如果团队只会其中一栈，答案立刻变成那一栈。

| 场景 | 倾向 | 理由 |
|---|---|---|
| 团队有 React 经验 / 代码资产 | React | 迁移成本 > 框架间理论差距 |
| 中后台管理系统（国内） | React 或 Vue | AntD 与 Element Plus 双雄并立，组件密度都够 |
| 重交互的编辑器/白板/可视化大屏 | Solid/Svelte 值得评估；React 走 Compiler + 细粒度拆分 | 高频细粒度更新是重渲染模型的痛点 |
| 超大型多人协作、强规范诉求 | Angular 有工程化优势（强约定、DI、全 TS） | 下限高、上限低，国内团队搭建成本高 |
| 内容站/营销页（SEO 优先） | Next.js 或 Astro | Astro 可混用 React 组件，按岛隔离水合 |
| 小程序/多端（国内现实） | uni-app（Vue 系）或 Taro（React 系） | 按团队栈选语法，底层同跨端 |
| 开源库 / 设计系统 | React 生态最大 | headless 基建（Radix/Headless UI）最厚 |
| 团队大多为新人和中级工程师 | React 或 Vue 都行，**避开过度抽象** | 简单可预测的心智 > 框架基准分 |

三条国内环境的现实补充：

1. **招聘池与协作惯性是硬约束**。一线城市两栈都好招；二线及外包链路里 Vue（尤其 Element 系中后台）存量极大。技术评审里"我们组 React 的人更多"是正当理由，不必包装成性能论证。
2. **小程序生态是隐形选票**。如果产品矩阵里有小程序，Taro（React 语法）和 uni-app（Vue 语法）的选择会反过来影响 Web 端框架——很多团队的栈是这么定下来的，坦诚面对它比假装"纯技术选型"更有用。
3. **真正的护城河是可迁移能力**。阶段 1–8 练的组件设计、状态建模、性能方法论、测试观，迁移成本很低；框架语法只占你能力的薄薄一层。这也是本篇安排"移植实验"（下一节产出）的原因——跨框架能力本身就是简历上的差异化项。

---

### 11. 迁移指南：React 开发者的 Vue 速查（与反向）

概念映射表（左边是你已掌握的，中间是 Vue 3 对应物，右边是关键差异）：

| React | Vue 3 | 关键差异 |
|---|---|---|
| `useState` | `ref()` / `reactive()` | 可变、赋值立即生效；模板自动解包 |
| `useMemo` | `computed` | 自动收集依赖，不用手写数组 |
| `useEffect` | `watch` / `watchEffect` / `onMounted` | 一个 API 的职责被拆成多个原语 |
| `useContext` | `provide` / `inject` | 细粒度订阅，无"value 引用变化全量重渲染"问题 |
| `children` / 具名 children | slot / 具名插槽 | 模板系有专门语法 |
| Render Props | 作用域插槽 | 概念等价 |
| HOC / 自定义 Hook | 组合式函数（composable，`useXxx()`） | 普通函数，无调用顺序规则 |
| `key` | `:key` | 语义相同 |
| `className` | `class` | |
| `dangerouslySetInnerHTML` | `v-html` | |
| `onClick` | `@click` | |
| 受控 input | `v-model` | 语法糖；拦截时拆开写 |
| `React.lazy` + `Suspense` | `defineAsyncComponent` | Vue 无 Suspense 级别的统一约定 |
| `<></>` Fragment | 多根节点（Vue 3 原生支持） | |
| StrictMode 双调用暴露副作用 | 无对应机制 | 自觉守纪律 |

**React → Vue 的五个高频坑**（每个都是真实迁移项目里反复出现的）：

1. **解构丢响应性**：`const { count } = reactive(...)` 之后 `count` 是死值（本篇第 3 节详述）。用 `toRefs`，或全程 `ref`。props 的解构是 Vue 3.5+ 特例（编译器补偿），但 `reactive` 对象的解构永远不保留。
2. **直接改 props**：Vue 里 props 可以读、改了会告警；子组件要改就 `emit` 或 `defineModel`——和 React 单向流的纪律一致，只是 Vue 给了更顺手的官方通道。
3. **`.value` 写错位置**：script 里忘写 `.value`（拿到的是 ref 对象不是值），template 里多写 `.value`（模板自动解包，写了反而是读对象属性）。初期 90% 的"界面不更新"都栽在这。
4. **watch 的依赖边界**：自动收集只追"响应式来源"——追不到解构出来的普通变量、追不到非响应式的普通对象。直觉来源是 React 的"依赖数组要写全"，在这里要反过来：**让响应式对象保持在原始形态被读取**，别在中途拔值。
5. **生命周期直觉重装**：setup 只跑一次。React 心智里"组件体 = 每次渲染"在这里不成立——把"每次数据变化都要重算"的逻辑写进 setup 顶层等于只算了一次。派生进 `computed`、响应进 `watch`。

**Vue → React 的三条**（反过来同样致命）：

1. **没有 `.value`、没有自动追踪**：所有"依赖变了就自动跑"的直觉失效，`useEffect` 靠手写依赖数组，漏写不报错、只产生 stale bug（阶段 2 闭包陷阱专题全部适用）。
2. **不许原地改 state**：把可变对象塞进 `useState` 然后 `state.list.push(x)`——引用没变，React 视为无更新。必须替换引用（阶段 2 不可变更新专题）。
3. **`v-model` 消失**：每个输入框都要 `value` + `onChange` 成对出现；表单量大直接上 react-hook-form，别手搓三十个受控 Input——阶段 4.1 的终点形态就是为此准备的。

---

### 12. 面试高频对比题：答题框架

五道最高频的题，给**答题骨架**（要点与推进顺序），不背全文——骨架 + 你亲手写过的场景例子，比背来的标准答案可信一个量级：

1. **"React 和 Vue 的响应式/更新机制有什么区别？"**
   骨架：快照重渲染（不可变 → setState 请求 → 函数重跑 → diff）vs 依赖追踪（可变 → Proxy/信号 → 细粒度更新）→ 各自的经典坑互为镜像（闭包旧值 vs 解构丢响应）→ React Compiler 在吸收对方优点 → 收尾：场景例子（三次 setCount 的机制分步，你亲手画过队列图）。
2. **"虚拟 DOM 是什么？Svelte 没有它为什么更快？"**
   骨架：VDOM 是"声明式 UI 的运行时兜底抽象"（用 diff 换正确性）→ Svelte 把这层工作搬到编译期（静态分析 → 定向 DOM 操作）→ 但代价是模板表达受限、动态性差的代码反而难优化 → 结论：不是"有没有 VDOM"分高下，是"运行时成本 vs 编译期约束"的取舍。
3. **"为什么 React Hooks 不能写在条件语句里？"**
   骨架：Hook 状态靠调用顺序对号（链表）→ 条件调用导致槽位错位 → 对照：Vue/Solid 的信号与调用位置无关，所以没有这条规则 → 延伸：这说明 Hook 的规则是 React"执行模型"的产物，不是函数式编程的教条。
4. **"React 和 Vue 的 diff 算法有什么区别？"**
   骨架：React 单向从左到右 + key 映射 → Vue 3 最长递增子序列 + 编译期 patch flag/静态提升，diff 前已跳过大半 → 落点：真正决定性能的是"重渲染范围"（React 组件级全量 vs Vue 细粒度 + 模板编译优化），比 diff 算法本身影响大。
5. **"新项目你会怎么选 React 还是 Vue？"**
   骨架：拒绝"X 更好"的开场 → 给决策维度（团队栈与招聘、存量资产、场景类型：中后台/编辑器/内容站、小程序多端诉求、生态基建）→ 用第 10 节决策表的 2–3 行举例 → 收尾：团队写得好的那个就是对的那个。

答题心法一句话：**对比题考的是"你是否理解每个设计选择付出的代价"，而不是"你背了多少特性"。** 每答一个差异，补一句"这个选择的代价是 X、收益是 Y"，立刻和背答案的候选人拉开差距。

---

### ✅ 产出：TodoMVC 的框架移植实验

把阶段 2 的产出（TodoMVC：增删改查 + 状态过滤 + localStorage 持久化）移植到另外两个框架，这是本篇唯一且必须动手的练习：

1. **Vue 3 版**：`<script setup>` + `ref`/`computed`，Vue 官方文档的"快速上手"章节够用。目标 ≤ 150 行。
2. **Svelte 5 版**：`$state`/`$derived`，Svelte 官方交互教程过一遍 Runes 章节即可。目标 ≤ 120 行。
3. 每个版本写三行对比笔记：哪一段最顺手（大概率是"不用手写依赖数组"）、哪一段需要换脑子、哪里踩了 React 心智的坑（大概率是 setup 顶层重算逻辑或 `.value`）。
4. **终极一问**（写进笔记）：状态过滤（all/active/done）在 React 里你怎么写的？在 Vue 里你会用 `computed` 吗？在 Svelte 里 `$derived` 吗？为什么三个框架最终收敛到同一个形态？（提示：第 6 节的"纪律收敛"。）
5. **加分**：把其中一个实现再移植回 React，体会"翻译腔"——逐行翻译出来的 React 代码会到处想找 `computed`，惯用写法是渲染中直接算 + `useMemo`。这个"翻译腔"的体感，就是本篇想给你的东西。

时间预算：Vue 一天、Svelte 一天、笔记半天。自测标准沿用开篇三条：能盲写 Vue 版计数器、能演示"解构丢响应"并说出修法、能讲清"Solid 组件为什么只跑一次"。

**延伸阅读**（各取所需，不必全读）：Vue 官方文档的《深入响应式系统》（理解 Proxy 依赖追踪的机制层）与《Vue 与其他框架对比》页（官方视角，克制且准确）；Solid 文档的《Comparison to React》（把"组件只跑一次"讲得最清楚的一页）；Svelte 官方交互教程（Runes 部分半天能过完，是四个框架里上手体验最好的）。
