---
title: "3. 验收：用你的 mini React 写真实应用（1 周）"
---

## 3. 验收：用你的 mini React 写真实应用（1 周）

- 用它实现 **TodoMVC**：useState 管列表/输入、useEffect 持久化 localStorage、列表渲染带 key、事件全走你的合成事件
- 行为对齐测试：与真 React 版本并排跑，重点验证——删除中间项（key）、连续 setState 批处理、effect 清理
- 能跑通 = 你的 React 知识闭环了；跑不通的地方 = 突破理解盲区，回炉对应里程碑

复刻跑通的每一步都是"在自己的规则里自洽"，只有写一个真实应用，规则之间打架的地方才会暴露：key 与删除的交互、批处理与事件系统的耦合、effect 清理与组件卸载的时序。验收周不需要新知识，需要的是把 M1–M10 的成果放到同一张页面上互相摩擦。

> 修订注：TodoMVC 本身不依赖并发三部曲（M11–M13），用 M9 末的版本即可完成验收；如果你已做完 M13，建议追加 M13.9 的搜索大列表 demo 作为第 4 项验收——那是并发层唯一值得进验收周的实验。

### 3.1 API 覆盖对照：TodoMVC 用到什么、验收哪个里程碑

| TodoMVC 里的用法 | 用到的 API | 验收的里程碑 |
|---|---|---|
| 输入框文本、待办列表、筛选状态 | `useState`（或 `useReducer` 重构） | M7（链表、队列、函数式更新） |
| localStorage 持久化、TodoItem 追踪日志 | `useEffect` + cleanup + 依赖数组 | M8 |
| 挂载后自动聚焦输入框 | `useRef` + ref prop | M9.1 |
| 筛选模式全局下发（三处按钮 + 列表过滤共用） | `useContext` + Provider | M9.4 |
| 筛选后的列表缓存 | `useMemo` | M9.2 |
| 添加/删除/切换的批量逻辑 | `useReducer`（推荐重构版） | M9.3 |
| 点击/输入/回车全部交互 | 合成事件（click/input/keydown） | M9.6 |
| 一次点击里"改列表 + 清输入" | 批处理（两次 dispatch 一次渲染） | M9.5 |
| 列表项的稳定身份 | `key={todo.id}` | M5 |

### 3.2 TodoMVC 完整实现

先打一个必要的补丁：JSX 里 `{todos.map(...)}` 会把**数组**作为单个 child 传给 `createElement`，M1 版本没处理数组。给 `createElement` 的 children 段打补丁（真实 React 的 jsx-runtime 同样会做扁平化）：

```js
props.children = children
  .flat(Infinity) // 摊平 {list.map(...)} 传入的嵌套数组
  .filter((child) => child != null && child !== false && child !== true) // 对齐 React：布尔/空不渲染
  .map((child) =>
    typeof child === 'object' || typeof child === 'function' ? child : createTextElement(child)
  )
```

然后是完整应用（可直接放进 8.0 基线 + M9/M10 增量的环境运行）：

```js
/** @jsx createElement */

// —— reducer：把"改列表"的三种动词集中到一个纯函数 ——
function todosReducer(todos, action) {
  switch (action.type) {
    case 'add':
      return [...todos, { id: Date.now(), text: action.text, done: false }]
    case 'remove':
      return todos.filter((t) => t.id !== action.id)
    case 'toggle':
      return todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t))
    case 'clearDone':
      return todos.filter((t) => !t.done)
    default:
      return todos
  }
}

function restore() {
  try {
    return JSON.parse(localStorage.getItem('mini-todos') || '[]')
  } catch (e) {
    return [] // 脏数据兜底：localStorage 里的旧格式不该炸掉整个应用
  }
}

function TodoItem({ todo, onToggle, onRemove }) {
  // effect 清理的验收载体：每条待办"开始/停止追踪"成对出现
  useEffect(() => {
    console.log(`[TodoItem ${todo.id}] effect：开始追踪「${todo.text}」`)
    return () => console.log(`[TodoItem ${todo.id}] cleanup：停止追踪`)
  }, [todo.text])
  return (
    <li data-id={todo.id} onClick={onToggle} style={{ cursor: 'pointer' }}>
      {todo.done ? '✓ ' : ''}{todo.text}
      <button
        style={{ marginLeft: 8 }}
        onClick={(e) => { e.stopPropagation(); onRemove(todo.id) }} // stopPropagation：删按钮不触发 li 的 toggle
      >
        x
      </button>
    </li>
  )
}

// context 提到模块顶层（"挂根"，9.4）：筛选模式由 Provider 下发、列表层消费，
// 三处筛选按钮与列表过滤共用一份状态，不靠 props 层层传递
const FilterContext = createContext('all')

function TodoList({ todos, dispatch }) {
  const filter = useContext(FilterContext) // 深层组件直接读，无需中间层转发
  const visible = useMemo(
    () =>
      filter === 'done' ? todos.filter((t) => t.done)
      : filter === 'active' ? todos.filter((t) => !t.done)
      : todos,
    [todos, filter]
  )
  return (
    <ul>
      {visible.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => dispatch({ type: 'toggle', id: todo.id })}
          onRemove={(id) => dispatch({ type: 'remove', id })}
        />
      ))}
    </ul>
  )
}

function TodoApp() {
  const [todos, dispatch] = useReducer(todosReducer, null, restore) // init 惰性恢复
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem('mini-todos', JSON.stringify(todos)) // deps=[todos]：只有列表变才写盘
  }, [todos])

  useEffect(() => {
    inputRef.current && inputRef.current.focus() // 挂载聚焦：一次性 effect
  }, [])

  function addTodo() {
    if (!text.trim()) return
    dispatch({ type: 'add', text: text.trim() })
    setText('') // 与上一行同一事件里两次更新 → 批处理验收点：只 render 一次
  }

  return (
    <FilterContext.Provider value={filter}>
    <div>
      <h1>mini-react todos</h1>
      <input
        ref={inputRef}
        value={text}
        onInput={(e) => setText(e.value)}        // 合成事件的统一 value
        onKeydown={(e) => { if (e.key === 'Enter') addTodo() }}
      />
      <button onClick={addTodo}>添加</button>
      <p>
        <button onClick={() => setFilter('all')}>全部</button>
        <button onClick={() => setFilter('active')}>未完成</button>
        <button onClick={() => setFilter('done')}>已完成</button>
        <button onClick={() => dispatch({ type: 'clearDone' })}>清除已完成</button>
      </p>
      <TodoList todos={todos} dispatch={dispatch} />
      <p>{todos.filter((t) => !t.done).length} 项未完成</p>
    </div>
    </FilterContext.Provider>
  )
}

render(<TodoApp />, document.getElementById('root'))
```

看几个实现选择：`FilterContext` 与 `TodoList` 的拆分是 9.4 机制的实战形态——筛选按钮在 `TodoApp` 层改 state，`value={filter}` 从 Provider 下行，`TodoList` 里 `useContext` 直接读，中间不需要任何转发 props；`TodoItem` 故意接收 `onToggle`/`onRemove` 回调 props 而不从 context 拿 `dispatch`，是为了演示"props 传行为、context 传环境值"这条惯用分界；`useReducer(todosReducer, null, restore)` 的第三个参数是惰性初始化——localStorage 只在挂载时读一次，而不是每次 render 都解析一遍 JSON。

### 3.3 行为对齐测试清单：每条都有"如何验证"的具体操作

与真 React 版并排跑（两个 iframe 或并排两个 root，各挂一份实现），逐条对照。

**A. 删除中间项（key 的正确性）——验证 M5。** 操作：依次添加 A、B、C 三条待办，点 B 的 x。验证分两层。第一层（数据）：剩 A、C，未完成计数减一，两个版本一致——这层只能证明"没算错"，证明不了"复用对了"。第二层（DOM 身份）：给每个 li 打开 DevTools Elements 面板，观察 `data-id="b"` 的节点。正确行为（`key={todo.id}`）：B 节点被移除，A、C 节点**原样保留**——进一步，在控制台先执行 `const a = document.querySelector('[data-id="a"]')` 保存引用，删除后再执行 `a.isConnected`，返回 `true` 说明 A 的 DOM 从未被重建。错误行为对照（把 `key={todo.id}` 改成 `key={index}` 再跑一遍）：控制台同样先存 A 的引用，删除后 `a.isConnected` 仍是 `true`，但 A 节点里渲染的文本变成了 C 的内容——因为 index 对比下"key=1 的那条"被理解为"内容从 B 更新成 C"、末位"key=2"被删除，三条数据串了位。在受控输入场景（每行一个 input）里这个串位会直接导致输入内容跟错行。两个版本并排各跑一遍，"为什么不能用 index"从口诀变成肌肉记忆。

**B. 连续 setState 批处理——验证 M9.5。** 操作：在 `TodoApp` 函数体第一行加 `console.count('render')`，然后点一次"添加"按钮（内部 `dispatch` + `setText` 两次更新）。验证：mini 版计数恰好 +1，React 18 版同样 +1，且中间不出现"列表已加、输入框未清"的中间态上屏。加测一档：把两次更新包进 `setTimeout(addTodo, 0)`，两边计数仍应各 +1——如果 mini 版变成 +2，说明你的微任务调度入口没有统一（回炉 9.5：是不是有某个 setState 还在直接建 `wipRoot`？）。

**C. effect 清理——验证 M8.4 与卸载时机。** 操作：添加 A、B、C 三条，然后删掉 B。验证：控制台出现 `[TodoItem <B的id>] cleanup：停止追踪`，且**只有 B 的**——A、C 的 effect 不重跑（它们的 deps `[todo.text]` 没变）。再验证成对性：把 A 的文本相关的 effect 依赖换成 `[todo]`（对象每次更新都是新引用），点 A 切换完成状态，应看到"A 的 cleanup → A 的 effect"成对出现，顺序绝不颠倒。最后验证不泄漏：删掉全部待办后，控制台不再有任何 TodoItem 日志增量。

**D. localStorage 持久化——验证 M8.2 的依赖粒度。** 操作：添加两条待办 → 刷新页面 → 列表恢复。反向验证粒度：在输入框打字（触发 `setText`，组件重渲染，但 `todos` 未变）→ Network/Application 面板观察 localStorage 的 `mini-todos` 值不变，effect 没有执行（deps `[todos]` 命中缓存路径）。如果每次打字都写盘，说明依赖写成了 `undefined` 或漏了。

**E. 合成事件三件套——验证 M9.6。** 回车添加（keydown + `e.key`）、输入实时上屏（input + `e.value`）、点 x 不触发外层 toggle（stopPropagation）。三件事同时验一个系统：如果回车无效但点击有效，先查 `supportedEvents` 是否包含 `keydown`；如果 stopPropagation 失效，查 `dispatchSyntheticEvent` 的 `_propagationStopped` 检查是否写在了 handler 调用之后。

### 3.4 跑不通的地方 = 理解的盲区：症状 → 回炉映射表

| 症状 | 大概率的盲区 | 回炉 |
|---|---|---|
| 列表删除后内容串位 / 输入跟错行 | key 的身份语义、index 兜底的退化行为 | M5 |
| 一次点击渲染两次 / 中间态上屏 | 调度入口未统一、微任务收集窗口理解偏差 | M9.5 |
| effect 重复执行不清理 / 卸载后定时器还在跑 | cleanup 收集路径（deletions 子树遍历） | M8.3/8.4 |
| effect 读到旧值 | 闭包与依赖数组的配合 | M8.5 |
| hooks 顺序报错、状态错乱 | memoizedState 链表对齐、hookIndex 游标 | M7 |
| 事件处理器不触发 / 冒泡异常 | dom._fiber 维护、委托冒泡循环 | M9.6 |
| 抖一下才到正确位置 | 两个 effect 的时机差 | M10.1 |
