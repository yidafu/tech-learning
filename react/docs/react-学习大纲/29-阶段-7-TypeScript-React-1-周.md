---
title: "阶段 7：TypeScript + React（1 周）"
---

## 阶段 7：TypeScript + React（1 周）

到阶段 6 为止，你已经能用 JavaScript 思维写出完整应用了。这一周要换一副眼镜：**TypeScript 视角下的 React**。前六个阶段解决"能不能写出来"，这一周解决"写出来的东西敢不敢让别人改"——当组件被第三个同事调用、当 props 有十几个字段、当一个 hook 要同时服务五种接口时，类型系统是唯一能在编译期把错误拦下来的防线。

先明确这一周的定位：它**不是** TypeScript 语言教程（默认你已掌握 `interface`、联合类型、泛型基础、`typeof`/`keyof` 这些语言特性），而是 TS 与 React 组件模型的**交叉地带**。这六个场景是从"会写组件"到"能设计被别人复用的组件 API"的门槛，也是你将来阅读任何主流库（react-hook-form、TanStack Query、antd）类型定义的钥匙——那些库的 `.d.ts` 里写的就是本节这六类东西的放大版。

学习方式建议：每个场景在阶段 0 建好的项目里开一个 demo 文件，**先故意写错**（传错类型、删掉泛型参数），看编译器报什么错、报在哪一行，再改对。对报错信息的熟悉程度，直接决定你将来排查类型问题的速度。

原大纲条目（骨架）：

1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`
2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用
3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）
4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍
5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）
6. 给第三方 JS 库写 `.d.ts` 声明

---

### 1. Props 类型、`children: ReactNode`、事件类型 `React.ChangeEvent<HTMLInputElement>`

**是什么。** Props 类型就是给组件的"输入参数表"定义形状。React 组件本质上是一个函数，props 是它的参数；TS 对普通函数参数所做的一切（形状约束、自动补全、编译期报错、调用点检查），对 props 全部适用。一个组件的 Props 接口，就是这个组件对外的全部 API 文档。

**为什么需要。** 三个工程价值，缺一个都值得花这一周：

1. **自文档**：调用方把鼠标悬停在 `<Button ` 上，IDE 直接弹出字段列表与注释，不用翻实现代码。
2. **编译期拦截**：`size="middle"` 拼错一个字母，浏览器里表现为"样式没生效"这种很难追的 bug；有类型后，构建直接失败并指出那一个字符。
3. **重构安全**：把 `onSelect` 改名为 `onChange`，TS 会把所有漏改的调用点标红。项目越大，这一条的杠杆越高——没有类型的 React 项目改一个公共组件 props，只能靠全局搜索加人肉确认。

**怎么做（机制分步）。** 三步：

1. 用 `interface`（或 `type`）声明 Props 形状，可选字段加 `?`。
2. 组件参数处解构，并把类型标注上去；给可选字段设默认值。
3. 从 `react` 包用 `import type` 导入所需类型（`import type` 表示只导入类型、运行时不产生代码，是官方推荐的写法）。

**代码示例：一个 Props 定义规范的 Button。**

```tsx
// src/components/Button.tsx
import type { ReactNode, MouseEventHandler } from 'react';

/** 按钮组件的对外契约：调用方看这里就知道怎么用 */
interface ButtonProps {
  /** 子内容：字符串、JSX、多段混合都可以，所以用 ReactNode */
  children: ReactNode;
  /** 点击回调。等价手写形式：(event: React.MouseEvent<HTMLButtonElement>) => void */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** 原生 type 属性，默认 'button'，防止在 form 里被当成 submit 误触提交 */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({ children, onClick, type = 'button', disabled = false }: ButtonProps) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

**children 为什么是 `ReactNode`。** `ReactNode` 是"一切 React 能渲染的东西"的总类型：字符串、数字、JSX 元素、元素数组、`null`、`undefined`、布尔值，乃至它们的任意嵌套组合。对比两个常见错误选择：

- 写 `children: string`——`<Button><Icon />保存</Button>` 直接报错，把图标挡在门外。
- 写 `children: JSX.Element`——`<Button>保存</Button>` 报错，因为 `"保存"` 是 string 不是元素；而且只能装"一个"元素，`<Icon />保存` 两个节点也不行。

`ReactNode` 的宽泛在这里恰好是对的：组件对 children 的态度通常就是"原样放进来、渲染出去"，不需要知道它具体是什么。**特例**：如果组件要"处理"children（比如函数式 children `<Select>{(item) => <Row item={item} />}</Select>`），ReactNode 就不够了，必须显式声明函数形状：`children: (item: Item) => ReactNode`。判断标准：你是"透传"还是"调用"。

**常用事件类型速查表。** 给事件处理器标注类型是新手最常卡住的地方，规律只有一个：**类型名 = React + 原生事件类别，泛型参数 = 绑定事件的元素标签类型**。

| 场景 | 处理函数参数类型 | 备注 |
|---|---|---|
| input 的 `onChange` | `React.ChangeEvent<HTMLInputElement>` | 受控输入最常用 |
| textarea / select 的 `onChange` | `React.ChangeEvent<HTMLTextAreaElement>` / `React.ChangeEvent<HTMLSelectElement>` | 泛型参数跟着元素换 |
| 表单 `onSubmit` | `React.FormEvent<HTMLFormElement>` | 记得 `e.preventDefault()` |
| 按钮 `onClick` | `React.MouseEvent<HTMLButtonElement>` | div 上则是 `HTMLDivElement` |
| `onKeyDown` / `onKeyUp` | `React.KeyboardEvent<HTMLInputElement>` | 判断 `e.key === 'Enter'` |
| `onFocus` / `onBlur` | `React.FocusEvent<HTMLInputElement>` | 常用来控制校验时机 |
| `onScroll` | `React.UIEvent<HTMLDivElement>` | 滚动容器 |
| `onDragStart` / `onDrop` | `React.DragEvent<HTMLDivElement>` | 拖拽场景（阶段 4.7） |
| `onCopy` / `onPaste` | `React.ClipboardEvent<HTMLInputElement>` | 粘贴拦截 |
| `onAnimationEnd` / `onTransitionEnd` | `React.AnimationEvent<HTMLDivElement>` / `React.TransitionEvent<HTMLDivElement>` | 动画结束回调 |

逐行展开几个关键点：

- **泛型参数为什么是元素类型**：`React.ChangeEvent<HTMLInputElement>` 让 `e.target` 被收窄为 `HTMLInputElement`，于是 `e.target.value`、`e.target.checked` 都有类型。泛型填错（比如把 div 的事件写成 `HTMLInputElement`），`e.target.value` 处就会报错。
- **React 的 onChange 不是原生 change**：原生 `change` 事件要失焦才触发；React 的 onChange 实际代理的是 `input` 事件，输入每个字符都触发——这是受控组件"实时跟随输入"的底层原因（合成事件机制见阶段 10）。
- **e.target vs e.currentTarget**：`currentTarget` 的类型由泛型参数**保证**就是绑定处理器的那个元素；`target` 是"事件实际发生的元素"，可能是它的子元素（事件冒泡上来），类型是 `EventTarget`，取值前常需要收窄。要稳定拿到绑定元素，用 `e.currentTarget`。

**代码示例：受控输入 + 表单提交，事件类型齐全。**

```tsx
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');

  // 泛型参数写 HTMLInputElement，e.target.value 才有类型提示
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 阻止浏览器默认提交行为（整页刷新）
    console.log('提交邮箱：', email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        邮箱
        <input type="email" value={email} onChange={handleChange} />
      </label>
      <button type="submit">登录</button>
    </form>
  );
}
```

**偷懒技巧：从内置元素反查事件类型。** 不记得类型名时，用 `ComponentProps` 从原生元素身上"抄"：`type InputOnChange = ComponentProps<'input'>['onChange']`（等价于手写 `React.ChangeEvent<HTMLInputElement>`）。给第三方组件包 wrapper、复用某个 HTML 属性类型时非常好用；rest props 透传也靠它：`interface Props extends ComponentProps<'button'> { ... }` 一次拿到 button 的全部原生属性类型。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`e.target.value` 报错 `Property 'value' does not exist on type 'EventTarget'`。根因：处理器参数写成了原生 `Event`（或没标类型被推成别的），`target` 只是 `EventTarget`。修法：标注 `React.ChangeEvent<HTMLInputElement>`，或直接使用上面 `ComponentProps` 反查法。
2. 症状：给 `onClick` 的处理器标了 `MouseEvent` 却报类型不兼容。根因：没加 `React.` 前缀时，`MouseEvent` 解析到的是 **DOM 全局的** `MouseEvent`（构造函数类型），不是 React 的合成事件。修法：写 `React.MouseEvent<HTMLButtonElement>`，或 `import type { MouseEvent } from 'react'` 后用短名。
3. 症状：`<Select options={xs}>{(item) => <Row item={item} />}</Select>` 报 children 类型错。根因：`children: ReactNode` 不包含函数。修法：显式声明 `children: (item: Item) => ReactNode`——需要"调用"children 的组件永远不该用 ReactNode。
4. 症状：把 `onMouseEnter` 的事件参数当 `React.MouseEvent` 用一切正常，但同事的 `onScroll` 写成 `React.MouseEvent` 编译不过。根因：不同事件类别类型不同，鼠标/键盘/焦点/剪贴板各自一套。修法：对照上面速查表；TS 的报错信息本身会给出期望类型，直接照抄即可。

---

### 2. `useState<T>` 泛型、类型收窄在 JSX 分支中的应用

**是什么。** `useState` 是泛型函数：`useState<S>(initial: S | (() => S))`。多数时候 S 能从初始值自动推导，不需要手写；需要手写的场景恰恰是状态类型设计的关键点。类型收窄（narrowing）则是指：当一个联合类型状态的"当前分支"确定后，TS 自动知道这个分支上有哪些字段可用——在 JSX 的 if/switch 分支里这非常好用。

**为什么需要。** 先看推导规则表，理解什么时候 TS 帮你、什么时候必须自己写：

| 写法 | 推导出的状态类型 | 评价 |
|---|---|---|
| `useState(0)` | `number` | 正确，不用手写 |
| `useState<User \| null>(null)` | `User \| null` | 初始 null 时不写泛型就永远是 `null`，必须手写 |
| `useState<Level>('info')` | `Level`（字面量联合） | 想收窄取值范围时手写 |
| `useState<Cart>(() => loadCart())` | `Cart` | 惰性初始化时手写，顺便检查 initializer 的返回值 |

第二行是最高频的坑：`const [user, setUser] = useState<User>(null)` 直接编译报错——`null` 不是 `User`。"暂时没有、将来有"的状态，类型必须是 `User | null`，用的时候判空，判空之后 TS 自动收窄成 `User`。这一判一窄，就是本条目的核心机制。

**怎么做（机制分步）：用判别联合建模状态机。** 与其用三个布尔 `isLoading` / `isError` / `isSuccess` 组合状态（4 种组合里至少一种是非法的，比如 loading 和 error 同真），不如用一个"判别联合"（discriminated union）：

1. 定义若干互斥的"状态分支"，每个分支都有一个**字面量类型的公共字段**（如 `status`），这个字段叫判别字段（discriminant）。
2. 每个分支只携带该分支存在的数据：`success` 分支才有 `data`，`error` 分支才有 `message`。
3. `setState` 时必须提供完整分支对象；JSX 里根据 `status` 分支渲染，TS 在每个分支内自动收窄出对应字段。

非法状态（"加载中但已有数据"）在这个模型里**根本无法表达**——这就是"让非法状态不可表示"（make illegal states unrepresentable），它是 TS 建模业务状态最重要的一条思想。

**代码示例：完整的请求状态机组件。**

```tsx
import { useEffect, useState } from 'react';

/** 四个互斥状态：status 是判别字段；data 只在 success 分支存在，message 只在 error 分支存在 */
type TagsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

export function TagsPanel() {
  const [state, setState] = useState<TagsState>({ status: 'idle' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch('https://api.example.com/tags', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>; // 把 unknown 的 json() 断言为 string[]
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // 已被取消的请求不更新状态（竞态防护）
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : '未知错误',
        });
      });

    return () => controller.abort(); // 卸载时取消在途请求
  }, []);

  // switch 分支里，TS 根据 status 的字面量自动收窄每个分支的可用字段
  switch (state.status) {
    case 'idle':
      return <p>尚未开始加载</p>;
    case 'loading':
      return <p>加载中…</p>;
    case 'success':
      return (
        <ul>
          {state.data.map((tag) => (
            // 这里 state.data 一定是 string[]，不需要判空
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      );
    case 'error':
      return <p role="alert">出错了：{state.message}</p>; // state.message 一定是 string
  }
}
```

注意 `switch` 没有 default：因为四个分支穷尽了联合，TS 知道函数到这里必然返回。将来给 `TagsState` 加第五个分支（比如 `{ status: 'empty' }`）而忘了改 switch，函数"存在未返回的路径"会直接编译报错——又一个编译期兜底。想更严格，可以加"穷尽性检查"惯用法：

```ts
default: {
  const _exhaustive: never = state; // 若有分支漏判，state 不可能是 never，此行报错
  return _exhaustive;
}
```

**JSX 内联分支也支持收窄。** 判别联合的收窄不只发生在 switch 里，if、三元、`&&` 都行：

```tsx
{state.status === 'success' && <TagCount count={state.data.length} />}
```

这一行里 `state.data` 的收窄由 `state.status === 'success'` 这个条件自动完成。**但注意**：收窄只在"同一层控制流"里有效——把 `state` 解构出来（`const { status } = state`）再用，`data` 的依赖关系还在（TS 4.6+ 支持判别联合解构后的收窄）；但如果把 state 传进回调函数里，收窄丢失，需要重新判断。原则：**分支判断与字段使用写在同一个作用域，不要隔着一个函数边界**。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`useState(false)` 起手，后来想存对象，`setLoading({ ... })` 报错。根因：初始值把类型锁死为 `boolean`。修法：状态的"完整形状"一开始就设计好（用判别联合），宁可后面加分支，不要后面换类型。
2. 症状：`const [level, setLevel] = useState('info')`，把 `level` 传给要求 `'debug' | 'info' | 'error'` 的子组件时报错 `string 不能赋给联合`。根因：初始值推导出宽泛的 `string`，字面量类型丢了。修法：显式 `useState<Level>('info')`。
3. 症状：`setState({ status: 'success' })` 编译报错缺 `data`。根因：这不是坑，这是**这个模式的价值**——分支对象必须完整，运行时的"忘了带数据"被提前到编译期。修法：把数据带上；如果真的存在"成功但无数据"的语义，那应该是独立的 `empty` 分支。
4. 症状：在 `.then` 回调里访问 `state.data`，TS 说 data 可能不存在。根因：回调函数跨越了控制流边界，外面的收窄不可信（回调执行时机晚）。修法：在分支内部同步使用字段；异步回调里重新判断，或把需要的数据先存入局部变量。

---

### 3. **泛型组件**（`List<T>`、`Select<T>`）与泛型 Hook（`useRequest<T>`）

**是什么。** 泛型组件/泛型 hook 是"类型参数由调用点决定"的组件与 hook：`<Select<Level> ...>` 或 `useRequest<Todo[]>(url)`。绝大多数时候泛型参数可以省略——TS 会从传入的 props/实参**推断**出来。

**为什么需要。** 看一个不用泛型的 Select 会烂在哪：

```tsx
// ❌ 非泛型版：value、options.value、onChange 的入参被迫用宽类型
interface SelectProps {
  value: string | number | null;
  options: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
}
```

后果：调用方传了 `{ value: 'debug' | 'info' | 'error' }` 的选项数组，回调拿到的参数却是 `string | number`，赋给自己的 `Level` 状态直接报错；更糟的是 `options` 里混进一个 `value: 1` 也没人管。**泛型的意义：让"同一个组件"里的多个位置共享同一个类型变量**——options 的 value 类型、受控 value 类型、onChange 回调参数类型，三者被 T 绑定为同一个东西，一处推断、处处一致。

**怎么做（机制分步）。**

1. 在函数签名上声明类型参数并约束：`function Select<T extends string | number>`（约束保证可比较、可作 key）。
2. Props 接口也带 `<T>`，凡"应该一致"的字段都用 T。
3. 调用点通常不写 `<Level>`：从 `options`/`value` 自动推断；推断退化时再显式标注。

**代码示例：泛型 Select 完整实现。**

```tsx
// src/components/Select.tsx
import { useState, type ReactNode } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

export interface SelectProps<T extends string | number> {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}

// 注意：泛型组件必须用函数声明（或函数表达式），不能标 FC，原因见第 4 节
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = '请选择',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="select">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {options.find((o) => o.value === value)?.label ?? placeholder}
      </button>
      {open && (
        <ul role="listbox">
          {options.map((option) => (
            <li key={String(option.value)} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value); // option.value 的类型就是 T，调用方拿到的不是宽类型
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

调用方视角——体会 T 的自动推断：

```tsx
import { useState } from 'react';
import { Select } from './Select';

type Level = 'debug' | 'info' | 'error';

// satisfies：检查数组形状满足 { value: Level } 的要求，同时保留每个 value 的字面量类型
const levelOptions = [
  { value: 'debug', label: '调试' },
  { value: 'info', label: '信息' },
  { value: 'error', label: '错误' },
] satisfies { value: Level; label: string }[];

export function LogFilter() {
  const [level, setLevel] = useState<Level>('info');

  return (
    <Select
      options={levelOptions} // T 被推断为 'debug' | 'info' | 'error'
      value={level}
      onChange={(next) => setLevel(next)} // next 自动是 Level，setLevel 不报错
    />
  );
}
```

这里有个关键细节：如果 `levelOptions` 没用 `satisfies`（或 `as const`）而是先声明成 `{ value: string; label: string }[]` 的变量，T 会被推断成 `string`，`setLevel(next)` 立刻报错。**泛型的推断质量取决于传入数据的字面量保留程度**——`satisfies` 是既检查形状又不丢字面量的最优解。

**泛型 Hook：`useRequest<T>` 完整实现。** 它把上一节的请求状态机封装成可复用的 hook，T 表示"接口响应体的类型"。请重点看三处泛型相关的注释：

```tsx
// src/hooks/useRequest.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/** 请求状态：判别联合（与上一节 TagsState 同一模式，data 换成了泛型 T） */
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export type UseRequestResult<T> = RequestState<T> & {
  /** 手动重新发起请求 */
  refetch: () => void;
};

export function useRequest<T>(url: string, init?: RequestInit): UseRequestResult<T> {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' });

  // 保存"当前这次请求"的 AbortController：url 变化或组件卸载时用来取消旧请求
  const controllerRef = useRef<AbortController | null>(null);

  // init 通常是调用方每次渲染新建的对象字面量，引用每次都变；
  // 直接放进 useCallback 依赖会导致请求函数每次渲染都重建、effect 反复重跑。
  // 存进 ref：只取"最新的值"，不参与依赖比较。
  const initRef = useRef(init);
  initRef.current = init;

  const run = useCallback(async () => {
    controllerRef.current?.abort(); // 发起新请求前取消上一个（竞态防护）
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: 'loading' });
    try {
      const res = await fetch(url, { ...initRef.current, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T; // 响应体按 T 解释（调用方负责与真实接口一致）
      if (!controller.signal.aborted) {
        setState({ status: 'success', data });
      }
    } catch (err) {
      if (controller.signal.aborted) return; // 已被更新的请求取消，丢弃过期结果
      setState({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [url]); // 依赖只有 url：URL 变化才应触发重新请求

  useEffect(() => {
    run();
    return () => controllerRef.current?.abort(); // 组件卸载时取消在途请求
  }, [run]);

  return { ...state, refetch: run };
}
```

使用示例——T 由调用点显式指定，从此 `data` 全链路有类型：

```tsx
import { useRequest } from './hooks/useRequest';

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export function TodoList() {
  // 显式写 <Todo[]>，请求结果在 success 分支就是 Todo[]
  const { status, data, error, refetch } = useRequest<Todo[]>(
    'https://jsonplaceholder.typicode.com/todos?_limit=5',
  );

  if (status === 'loading') return <p>加载中…</p>;
  if (status === 'error') {
    return (
      <button onClick={refetch}>加载失败：{error.message}，点击重试</button>
    );
  }
  if (status !== 'success') return null; // idle

  return (
    <ul>
      {/* data 已收窄为 Todo[]，todo.title、todo.completed 都有类型与补全 */}
      {data.map((todo) => (
        <li key={todo.id}>
          {todo.completed ? '✓' : '○'} {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

再强调一次诚实边界：`as T` 只是"你向编译器保证响应是这个形状"，运行时没人检查。线上接口悄悄改字段，类型不会救你；要真安全，在 `run` 里接一层运行时校验（如 zod：`TodoSchema.parse(raw)`，校验失败落入 error 分支），这也是阶段 9 Server Actions 里会用到的手法。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：想写 `const Select: FC<SelectProps<T>> = ...`，报 `Cannot find name 'T'`。根因：`T` 是**函数**的类型参数，而 FC 的写法把类型放在了值的类型标注位置，没有地方声明 T。修法：泛型组件必须写成函数声明/表达式 `function Select<T>(props: SelectProps<T>) {...}`——这也是"新代码不再推荐 FC"的直接原因之一，详见下节。
2. 症状：泛型推断出 `string` 而不是字面量联合，onChange 回调传给 `setLevel` 报错。根因：传入的 options 数组先被存成了宽类型变量，字面量信息丢失。修法：`satisfies` 约束形状、或 `as const` 断言，保证字面量保留。
3. 症状：把 `init` 对象直接写进 `useCallback` 依赖后，每次渲染都重新发请求。根因：调用处 `<Comp init={{ headers: {...} }} />` 每次渲染都是新对象，引用不等 → `run` 重建 → effect 重跑 → setState → 又渲染，形成循环。修法：如上用 ref 快照；或要求调用方 `useMemo` 住 init。这是自定义 hook 设计的通用课题：**哪些参数进依赖、哪些只取最新值**。
4. 症状：`useRequest<Todo>(url)` 少写了数组，`data.map` 报 `map 不存在于 Todo`。根因：接口返回数组时 T 应为 `Todo[]`。修法：泛型参数写完整形状；从接口文档复制示例 JSON 反推类型是好习惯。

---

### 4. `ReactNode` vs `ReactElement` vs `JSX.Element`；`ComponentType` / `FC` 的取舍

**是什么。** 这三个类型描述"React 可渲染物"的三个层次，加上 `FC`/`ComponentType` 两个"组件类型"，构成 React 类型系统的主干。分不清它们的直接代价：props 类型写错位置、children 类型收不进来、接收组件的 prop 写成接收元素的类型。

**三者的定义与关系。** 看 `@types/react` 的简化定义：

```ts
// 简化示意，帮助理解层次关系
interface ReactElement<P = unknown> {
  type: string | ((props: P) => ReactNode); // 'div' 或组件函数
  props: P;                                 // 传给它的 props
  key: string | number | null;              // 列表 key
}

type ReactNode =
  | ReactElement        // 一个元素
  | ReactPortal         // createPortal 的返回值
  | string              // 文本节点
  | number              // 数字
  | boolean             // React 19 类型：渲染为空（{cond && <X/>} 的 false 分支）
  | Iterable<ReactNode> // Fragment、数组、嵌套组合
  | null
  | undefined
  | Promise<ReactNode>; // React 19 新增：异步组件的返回值也合法
```

一句话记住包含关系：**`JSX.Element` 是 `ReactElement` 的一种（默认泛型实例化），`ReactElement` 是 `ReactNode` 的一个成员**。`<div />` 求值后是一个 `JSX.Element`（一个普通对象）；而 `<div>总分：{score}</div>` 整体的类型是 `ReactNode`（元素 + 字符串 + 数字的混合物）。所以：

- children、插入点 `{...}` —— 用 **ReactNode**（要"装下一切"）。
- 变量里存"一个元素"、props 传插槽 —— 用 **ReactElement**（要"恰好一个元素"，比如传给 cloneElement）。
- `JSX.Element` —— 你几乎不需要直接写它；它是全局 JSX 命名空间下的产物，React 18 起全局 `JSX` 命名空间已迁移到 `React.JSX`（避免多框架同装时命名空间冲突），写 `React.JSX.Element`。判断标准很简单：如果你发现自己要写 `JSX.Element`，九成应该写 `ReactNode`。

**FC 的历史包袱与现状建议（本节重点）。** `FC`（FunctionComponent）曾是标注函数组件的标准姿势，它经历过一次重要的语义变化，理解这段历史才能理解今天的建议：

- **React 17 及更早的 @types/react**：`FC<Props>` 隐含了 `children?: ReactNode`（等价于自动 `PropsWithChildren<Props>`）。任何 FC 组件都"默默接受任意 children"。
- **代价**：设计上不该有 children 的组件（比如 `<Icon />`）写上 `<Icon>点我</Icon>` 不报错，"点我"被静默吞掉——这成了大量静默 bug 的来源。
- **@types/react 18（2022 年起）**：移除了隐含 children。`FC<Props>` 只表示 `(props: Props) => ReactNode`，要用 children 必须显式写 `PropsWithChildren<Props>` 或自己声明 children 字段。

FC 如今还提供什么、又失去什么：

| 维度 | FC | 普通函数（推荐） |
|---|---|---|
| 返回类型 | 自动约束为 ReactNode | 自动推导，同样安全（配 `react-jsx` 转换） |
| children | 不再隐含（需 PropsWithChildren） | 不隐含（需 PropsWithChildren） |
| 泛型组件 | **无法表达** | 直接 `function Select<T>()` |
| 异步组件（返回 Promise） | React 19 类型下兼容 | 兼容 |
| 可读性 | 多一层包装 | 函数签名即全部信息 |
| 官方示例 | 不使用 | react.dev 全部用普通函数 |

结论：**新代码用普通函数声明**，react.dev 的所有示例也是这么写的。FC 不是禁用项（老项目大量存在），但它的两个历史收益（隐含 children、早期 TS 无法推导 JSX 返回类型时提供标注）一个被移除、一个被现代 TS 取代，剩下的只有约束返回类型这一个边际好处，而它恰恰挡住了泛型组件。代码对照：

```tsx
import type { FC, PropsWithChildren } from 'react';

// —— FC 写法（历史姿势）——
// @types/react 18+ 里 FC 不再隐含 children：
const CardA: FC<{ title: string }> = ({ title }) => (
  <section><h2>{title}</h2></section>
);
// <CardA title="a">正文</CardA>  ← 现在会报错：children 不在 props 里

// 需要 children 的 FC 必须显式包 PropsWithChildren：
const CardB: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

// —— 普通函数写法（推荐，react.dev 风格）——
function Card({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

泛型与 FC 的冲突回看一眼（上一节坑 1 的根因）：

```tsx
// ❌ T 在 FC 的类型标注位置无处声明，直接编译错误
// const Select: FC<SelectProps<T>> = (props) => { ... }

// ✅ 泛型组件天然属于函数声明
function Select<T extends string | number>(props: SelectProps<T>) {
  /* ... */
}
```

**ComponentType：接收"组件"作为 props 时用。** 与 `ReactElement`（接收"已渲染的元素"）严格区分，二者不可互换：

```tsx
import type { ComponentType, ReactElement } from 'react';

interface RowProps<T> {
  item: T;
}

interface ListProps<T> {
  items: T[];
  /** 传"组件类型"（类或函数组件）：每个 item 需要单独实例化时用它 */
  RowComponent: ComponentType<RowProps<T>>;
  /** 传"元素"（已经渲染好的 JSX）：静态内容（空态兜底）用它 */
  emptyFallback?: ReactElement;
}

function List<T>({ items, RowComponent, emptyFallback }: ListProps<T>) {
  if (items.length === 0) return emptyFallback ?? <p>暂无数据</p>;
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          <RowComponent item={item} /> {/* 组件在此实例化，item 的类型就是 T */}
        </li>
      ))}
    </ul>
  );
}
```

三个"把渲染交给别人"的类型怎么选：

| props 类型 | 语义 | 典型用法 |
|---|---|---|
| `ComponentType<P>` | 传组件，组件会被 `<X {...P} />` 实例化 | 每行渲染器、图标组件映射表 |
| `ReactElement` | 传一个现成元素，直接放进树里 | fallback、空态、右侧插槽 |
| `(data: T) => ReactNode` | 传函数（render props） | 同样能按 item 实例化，且更轻量，不要求对方是"组件" |

**常见坑（症状 → 根因 → 修法）。**

1. 症状：项目从 @types/react 17 升到 18 后，一批 FC 组件的 children 用法集体报错。根因：FC 隐含 children 被移除。修法：需要 children 的组件补 `PropsWithChildren<...>`；不需要的组件顺手删掉误用的 children——这批报错正是当年埋下的静默 bug 被翻出来。
2. 症状：`<List RowComponent={<Row />} />` 运行时报 "Element type is invalid"。根因：把**元素**传给了期待**组件**的位置，`<RowComponent />` 处等于对元素再求值。修法：传 `RowComponent={Row}`（不带尖括号）；类型上 ComponentType 与 ReactElement 不兼容，故意写错会在编译期暴露，所以这种 bug 多发生在无类型的 JS 文件里。
3. 症状：`cloneElement(children, { onClick })` 时 props 类型全是 any。根因：children 被声明成了宽泛的 ReactNode。修法：窄化声明 `children: ReactElement`（cloneElement 本身已不推荐用于新代码，优先用 render props 或直接传函数）。

---

### 5. 样式 props、模板字面量类型约束（`type Variant = 'small' | 'large'`）

**是什么。** 组件的视觉变体（尺寸、色调、风格）用**字面量联合类型**表达，变体到类名/样式的映射用 `Record` 表达；再进一步，用**模板字面量类型**（template literal type）约束"由规则拼出来的字符串"（如 `"8px"`、`var(--space-md)`）。这两招是所有 CSS-in-TS 方案（含 tailwind-variants、cva）的类型基础。

**为什么需要。** 样式 props 的两大痛点：字符串魔法值（`size="大"` 拼错无人知道）和样式映射散落（if/else 三元连缀，新增一个变体要改五处）。类型约束把"允许哪些值"变成编译期契约，`Record` 把"值到样式的映射"变成一张必须填完整的表。

**怎么做（机制分步）。**

1. 变体定义为字面量联合：`type Variant = 'small' | 'medium' | 'large'`。
2. 类名映射定义为 `Record<Variant, string>`——Record 的 key 必须**穷尽**联合的每个成员，漏一个编译报错。
3. props 用联合类型 + 默认值；新增变体时先扩联合，编译器立刻标红所有要补的 Record。

**代码示例：Variant 联合 + Record 映射的 Badge。**

```tsx
// src/components/Badge.tsx
import type { PropsWithChildren } from 'react';

type Variant = 'small' | 'medium' | 'large';
type Intent = 'primary' | 'secondary' | 'danger';

// Record：key 必须覆盖联合的每一个成员。新增 'xlarge' 到 Variant 时，
// 这里会立刻报错"缺少 xlarge"，强迫你补全映射——穷尽性由编译器保证。
const variantClasses: Record<Variant, string> = {
  small: 'px-2 py-0.5 text-xs',
  medium: 'px-3 py-1 text-sm',
  large: 'px-4 py-1.5 text-base',
};

const intentClasses: Record<Intent, string> = {
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-slate-200 text-slate-800',
  danger: 'bg-red-600 text-white',
};

interface BadgeProps {
  variant?: Variant; // 不传则用默认值 medium
  intent?: Intent;   // 不传则用默认值 primary
}

export function Badge({ children, variant = 'medium', intent = 'primary' }: PropsWithChildren<BadgeProps>) {
  const className = [variantClasses[variant], intentClasses[intent]].join(' ');
  return <span className={`inline-flex rounded font-medium ${className}`}>{children}</span>;
}
```

对比一下没有 Record 的写法（if/三元连缀），新增变体的改动点从"1 处联合 + 1 处映射"退化成"5 处 if"，而且漏改哪一处都不会报错。**Record 映射的本质是把"样式分支"从控制流变成数据**，查表 O(1)，类型系统还能验证表的完整性。

**模板字面量类型：约束"拼出来的字符串"。** 当合法值是一个规则而不是有限集合时（比如任意合法 CSS 长度），用模板字面量类型描述规则：

```ts
/** 只接受 "8px"、"1.5rem" 这类合法长度字符串；"abc"、"8" 都不合法 */
type Length = `${number}px` | `${number}rem`;

/** 由基础 token 拼出 CSS 变量名 */
type Space = 'sm' | 'md' | 'lg';
type SpaceVar = `var(--space-${Space})`;
// 推导结果：'var(--space-sm)' | 'var(--space-md)' | 'var(--space-lg)'

/** Tailwind 式组合：基础色 × 明度档位 */
type Shade = 50 | 100 | 200 | 300;
type ColorToken = `bg-${'blue' | 'gray'}-${Shade}`;
// 推导结果：'bg-blue-50' | 'bg-blue-100' | ... | 'bg-gray-300' 共 8 个成员
```

放进组件 props：

```tsx
interface StackProps {
  /** 间距："8px" 合法，"abc" 编译报错 */
  gap?: Length;
  /** 内边距：只能引用设计 token，禁止随手写魔法数 */
  padding?: SpaceVar;
}

export function Stack({ gap = '8px', padding = 'var(--space-md)', children }: PropsWithChildren<StackProps>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, padding }}>
      {children}
    </div>
  );
}
```

**重要边界：模板字面量是编译期检查。** 来自接口、URL、localStorage 的字符串不会经过编译器。运行时入口必须配 guard：

```ts
function isLength(value: string): value is Length {
  return /^\d+(\.\d+)?(px|rem)$/.test(value);
}

const raw: unknown = JSON.parse(localStorage.getItem('gap') ?? '"8px"');
const gap = typeof raw === 'string' && isLength(raw) ? raw : '8px'; // 不合法就回退默认值
```

**cva 提及。** 上面"联合 + Record + 默认值"的三件套，社区库 cva（class-variance-authority）帮你标准化了，并额外解决"props 类型与类名映射要写两遍"的问题——用 `VariantProps` 从 cva 配置**反推** props 类型：

```tsx
// bash: npm install class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';
import type { PropsWithChildren } from 'react';

const badge = cva('inline-flex rounded font-medium', {
  variants: {
    intent: {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-slate-200 text-slate-800',
      danger: 'bg-red-600 text-white',
    },
    size: {
      small: 'h-5 px-2 text-xs',
      medium: 'h-6 px-3 text-sm',
      large: 'h-8 px-4 text-base',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'medium',
  },
});

// VariantProps<typeof badge> 自动得到 { intent?: 'primary'|'secondary'|'danger'; size?: ... }
// 变体清单只写一处：加变体时改 cva 配置即可，props 类型跟着变
export type BadgeVariants = VariantProps<typeof badge>;

export function CvaBadge({ children, ...variants }: PropsWithChildren<BadgeVariants>) {
  return <span className={badge(variants)}>{children}</span>;
}
```

组件库场景下 cva 的完整工程化（变体设计规范、与 tailwind-variants 对比、主题 tokens）见《[react-组件库实战大纲.md](../react-组件库实战大纲/README.md)》。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：Record 缺 key 编译报错，新手用 `as Record<Variant, string>` 把报错"压掉"。根因：把类型系统当敌人。修法：这个报错是**功能不是故障**——它保证新增变体时映射必然补全。永远不要用 as 绕过穷尽性检查。
2. 症状：映射表对象被推断成宽类型，`variantClasses[variant]` 报"索引不存在"。根因：对象先存变量再标注时写成了 `const m = {...}; const variantClasses: Record<...> = m` 之外的奇怪路径，或中间夹了一层函数。修法：声明时直接标注（如示例那样一步到位）；对象需要保留字面量推导时配 `satisfies`。
3. 症状：模板字面量类型把 API 返回的字符串放行了，运行时样式坏了。根因：编译期类型对运行时数据无约束力。修法：运行时入口一律加 guard（如上 `isLength`），非法值回退默认值并上报日志。

---

### 6. 给第三方 JS 库写 `.d.ts` 声明

**是什么。** `.d.ts` 是"类型声明文件"（declaration file）：只有类型、没有实现，用来告诉 TS"这个模块长什么样"。给无类型的第三方 JS 库手写声明，核心语法是环境模块声明 `declare module '包名' { ... }`。

**为什么需要。** npm 生态里大量小而美的库是纯 JS 的（无类型、也无 @types 包）。`import toast from 'tiny-toast'` 一旦解析不到类型，整个 import 静默变成 `any`——不止这一个文件，**所有使用它的下游代码的检查全部失效**（`strict` 模式下污染沿调用链扩散）。补上 `.d.ts` 后，any 的洞被堵住，补全与报错全部恢复。这是渐进式类型系统的"补墙"工作。

**怎么做（流程分步）。** 动手写之前先按顺序排查，避免重复造轮子：

1. **查 DefinitelyTyped**：`npm install -D @types/包名`。社区类型仓库覆盖了绝大多数流行库，有现成的就不要自己写。
2. **查包本身**：看它的 package.json 有没有 `types`/`typings` 字段、仓库里有没有 `*.d.ts`——很多新库已内置类型。
3. **都没有才自己写**：在项目里建 `src/types/包名.d.ts`，按 README 的 API 写 `declare module`。
4. **（可选）回馈社区**：声明写稳定后，提 PR 到 DefinitelyTyped，别人就不用再写一遍。

**代码示例：为一个典型 JS 小库补全声明。** 假设项目用了虚构的纯 JS 库 `tiny-toast`，其 README 描述的 API 是：默认导出一个对象，`success/error/info(message, options?)` 返回数字 id，`dismiss(id)` 手动关闭，options 支持 `duration`（毫秒）、`position`（'top'/'bottom'）、`onClose` 回调。对应的声明文件：

```ts
// src/types/tiny-toast.d.ts
// 文件名任意、后缀必须是 .d.ts；这里的内容是对外部模块的"环境声明"（ambient declaration）

declare module 'tiny-toast' {
  /** 可配置项：与库 README 逐条对应，能可选的全部可选 */
  export interface ToastOptions {
    /** 显示时长（毫秒），默认 3000 */
    duration?: number;
    /** 出现位置，默认 'top' */
    position?: 'top' | 'bottom';
    /** 关闭回调，参数是这条 toast 的 id */
    onClose?: (id: number) => void;
  }

  /** 默认导出对象上的方法集合 */
  export interface ToastApi {
    success(message: string, options?: ToastOptions): number;
    error(message: string, options?: ToastOptions): number;
    info(message: string, options?: ToastOptions): number;
    /** 手动关闭指定 id 的 toast */
    dismiss(id: number): void;
  }

  const toast: ToastApi;
  export default toast;
}
```

写完立即生效（TS 会把项目内所有 `.d.ts` 自动纳入），使用体验的变化：

```tsx
import { useEffect } from 'react';
import toast from 'tiny-toast';

export function SaveButton() {
  useEffect(() => {
    const id = toast.success('保存成功', { duration: 2000 }); // id: number，options 有补全
    return () => toast.dismiss(id); // 组件卸载时关掉，避免僵尸提示
  }, []);

  // toast.succes('拼写错误'); // ❌ 编译期标红，而不是运行时 undefined is not a function
}
```

**确保声明被编译器看到。** `.d.ts` 必须落在 tsconfig 的 `include` 覆盖范围内。Vite + React 项目的常规配置（`src/types/` 在 `src` 下，天然被覆盖）：

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**两个进阶变体。**

其一，老旧 CommonJS 库用 `export =` 导出（module.exports = 整个函数）：

```ts
declare module 'old-cjs-lib' {
  interface Options { retries?: number }
  function main(input: string, options?: Options): Promise<string>;
  export = main; // CJS 风格导出：配合 tsconfig 的 esModuleInterop，import main from 'old-cjs-lib' 可用
}
```

其二，**模块扩充**（module augmentation）——库**已有**类型，你想补充（或给它的接口打补丁）。同样是 `declare module`，但因为目标模块存在类型，这里是"追加"而不是"凭空声明"：在 `declare module 'tiny-toast' { interface ToastApi { addToast(message: string): number } }` 里给 ToastApi 追加新方法（库新版加了方法、官方类型还没跟上的场景）。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：写了 `.d.ts` 但 import 还是 any。根因（按概率排序）：声明文件不在 tsconfig `include` 范围内；`declare module 'tiny-toast'` 的模块名与 import 的字符串**不完全一致**（差一个 `@scope/` 前缀或子路径，比如声明了主包却 import 了 `tiny-toast/lite`）。修法：先确认 include，再逐字符比对模块名；子路径入口需要为 `'tiny-toast/lite'` 单独声明。
2. 症状：import 默认导出拿到 undefined。根因：库实际是 CJS（`export =`），声明却写成了 `export default`；或反之。修法：打开库的产物代码确认导出形式，声明与实现严格对应。
3. 症状：`declare module 'x' {}` 空着先"占个位"。根因：空花括号是合法的"简写环境模块"，效果是把整个模块声明为 any——比不写更糟（让 any 显得像有类型）。修法：占位也别用空壳，至少把已用到的函数签名写上。
4. 症状：改了 `.d.ts` 后 IDE 没更新。根因：TS 语言服务的缓存。修法：重启 TS Server（VS Code 命令面板 "TypeScript: Restart TS Server"）。

---

**阶段 7 收束。** 六个场景串起来是一条能力线：第 1、2 条让你**写对**自己的组件；第 3、4 条让你**设计**给别人用的组件与 hook（泛型与组件类型的取舍是库作者的基本功）；第 5 条把类型系统延伸到视觉层；第 6 条把类型边界修到第三方生态。检验这一周的标准很简单：打开你阶段 3 写的迷你组件库，给每个组件补齐完整的 Props 类型、把 Select 改造成泛型组件、给 useFetch 重构成本节的 `useRequest<T>`——改完之后，"调用方传错东西"这件事在你的项目里应该已经属于编译错误了。类型就位后，下一阶段进入质量保障的另一半：自动化测试。

---

### 7. 类型守卫与 `unknown`：驯服运行时不可信的数据

**是什么。** `unknown` 是"安全版 any"：任何值都能赋给它，但**使用前必须先收窄**（unknown 上不允许直接调方法、取属性）。类型守卫（type guard）就是执行收窄的判断函数：写法是返回类型 `value is T` 的谓词函数，或 `asserts value is T` 的断言函数。

**为什么需要。** 第 2、3 节的 `as T` 是"你向编译器担保数据是这个形状"，运行时没人验——一旦接口悄悄改字段、localStorage 里存了旧版本结构，错误被 `as` 压到渲染深处才爆炸，报错位置离真正的根因（数据入口）相距万里。数据的真实入口全部不可信：`fetch` 的 `res.json()`、`JSON.parse`、URL 查询参数、`postMessage`、`localStorage`。`unknown` + 守卫的分工是：**入口处一律标 unknown，收窄逻辑钉死在边界上，边界之内全是可信类型**。TodoMVC 产出篇里手写过 `isTodo` 守卫处理 localStorage 迁移（《[10-产出-TodoMVC…](10-产出-TodoMVC-增删改查-状态过滤-localStorage-持久化-useDebounce.md)》），本节把它展开成完整方法论。

**怎么做（三层防线分步）。** 同一个"从 localStorage 恢复筛选条件"的需求，三种实现由轻到重：

```ts
// 第一层：手写谓词守卫——字段少（≤3）时的零依赖方案
interface Filters {
  status: 'all' | 'active' | 'done';
  keyword: string;
}

function isFilters(value: unknown): value is Filters {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>; // 中转断言：只在本函数内使用，不外流
  return (
    (f.status === 'all' || f.status === 'active' || f.status === 'done') &&
    typeof f.keyword === 'string'
  );
}

const raw: unknown = JSON.parse(localStorage.getItem('filters') ?? 'null');
const filters: Filters = isFilters(raw) ? raw : { status: 'all', keyword: '' }; // 不合法回退默认值
```

```ts
// 第二层：断言函数——校验失败直接抛，通过后下游自动收窄
function assertFilters(value: unknown): asserts value is Filters {
  if (!isFilters(value)) throw new Error('本地存储的筛选条件已损坏，已重置');
}

function loadFilters(): Filters {
  const raw: unknown = JSON.parse(localStorage.getItem('filters') ?? 'null');
  assertFilters(raw); // 此行之后，raw 的类型自动是 Filters
  return raw;
}
```

```ts
// 第三层：zod——字段多、嵌套深时的机器守卫，schema 成为类型的唯一来源
import { z } from 'zod';

const FiltersSchema = z.object({
  status: z.enum(['all', 'active', 'done']),
  keyword: z.string().max(50),
});

type FiltersFromZod = z.infer<typeof FiltersSchema>; // 类型从 schema 反推，不再两处维护

const parsed = FiltersSchema.safeParse(raw);
const filters: FiltersFromZod = parsed.success ? parsed.data : { status: 'all', keyword: '' };
```

选择标准一句话：**谓词用于"判断"，断言用于"入口收口"，zod 用于"类型与校验合一"**。第 6 节的 `isLength` 是谓词的最小形态，Next.js 的 Server Action 校验（阶段 9）是 zod 的标准形态。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：`catch (err) { toast(err.message) }` 报 `Property 'message' does not exist on type 'unknown'`。根因：`strict` 下 TS 4.4 起 catch 的参数就是 unknown（throw 的可以是任何东西，编译器不该假装它是 Error）。修法：`err instanceof Error ? err.message : String(err)`——本文件第 2 节的请求状态机里就是这么写的。
2. 症状：守卫函数写错但编译器毫无察觉，线上照样崩。根因：`function isNum(v: unknown): v is number { return true; }` 完全合法——谓词是"你向编译器担保"，写错了就是担保了假话。修法：守卫函数保持极简（只做 typeof/字面量比对）、可被单元测试覆盖；复杂结构交给 zod 这类机器守卫。
3. 症状：code review 看到 `value as unknown as Filters`。根因：双重断言意味着先放弃 unknown 的保护再强行指定类型，编译器被彻底捂嘴。修法：仅允许出现在测试造数据处；业务代码见到就打回。
4. 症状：`const f: Filters = JSON.parse(text)` 一切正常，直到某天 localStorage 里是旧版本结构。根因：`JSON.parse` 返回 any，赋给具体类型零验证、零报错——这是 any 最隐蔽的入口。修法：先落 unknown 变量再走守卫，让"这里的数据不可信"在代码上可见。

---

### 8. 泛型工具类型实战：从 API 类型反推组件 Props

**是什么。** TS 内置的工具类型（`Pick` / `Omit` / `Partial` / `Required` / `ReturnType` / `Awaited`）与 `keyof` 约束组合，让"后端接口类型"成为项目里唯一的类型源头，组件的 Props 全部从它**派生**而不是手抄。手抄的Props 是两份会漂移的真相；派生的 Props 永远同步。

**为什么需要。** 用户管理页有三处需要 User 相关类型：表格列定义、编辑弹窗的表单、下拉选项。手写三份的结果是接口加字段时只改了两处，第三处静默过期。派生的结果是一处定义、处处跟随、漏改必红。

**怎么做（完整场景：用户表格 + 编辑弹窗）。** 单一来源与派生群：

```ts
// src/api/users.ts —— 唯一的手写类型：与接口文档对应
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export async function fetchUsers(): Promise<User[]> { /* ... */ return []; }
```

```ts
// src/users/types.ts —— 全部派生，不出现第二个手写 User
export type EditableUser = Omit<User, 'id' | 'createdAt'>;      // 编辑弹窗只改这些字段
export type UserSummary = Pick<User, 'id' | 'name'>;             // 角色选择下拉只要这两项
export type UserDraft = Partial<EditableUser>;                   // 表单草稿：任意字段可能未填
export type UserList = Awaited<ReturnType<typeof fetchUsers>>;   // 不手写 Promise 展开
```

泛型表格列定义——`key` 字段用交叉类型 `string & keyof T` 约束，杜绝拼错字段名：

```tsx
// src/components/DataTable.tsx
import type { ReactNode } from 'react';

export interface Column<T extends Record<string, unknown>> {
  /** 只允许 T 的真实字段名，且保留字面量补全 */
  key: string & keyof T;
  header: ReactNode;
  /** 自定义渲染；不传时按原值展示 */
  render?: (row: T) => ReactNode;
}

export function DataTable<T extends Record<string, unknown>>(
  { rows, columns }: { rows: T[]; columns: Column<T>[] },
) {
  return (
    <table>
      <thead>
        <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(row) : String(row[c.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

调用方视角——接口改字段时所有漏改当场编译报红：

```tsx
import { DataTable, type Column } from './DataTable';
import type { User } from '../api/users';

const columns: Column<User>[] = [
  { key: 'name', header: '姓名' },
  { key: 'email', header: '邮箱' },
  { key: 'role', header: '角色', render: (u) => (u.role === 'admin' ? '管理员' : '只读') },
  // { key: 'nickname', header: '昵称' }, // ❌ 编译报错：nickname 不在 User 上
];
```

编辑弹窗用派生类型收口表单：

```tsx
interface EditDialogProps {
  user: EditableUser; // Omit 之后不存在 id/createdAt，表单想多传都过不了编译
  onSave: (draft: EditableUser) => Promise<void>;
}
```

**常见坑（症状 → 根因 → 修法）。**

1. 症状：泛型组件里 `keyof T` 表现得像 `string | number`，字段名约束完全没生效。根因：类型参数没有约束时，T 可以是任何东西，`keyof T` 退化为 `string | number | symbol` 的宽类型。修法：给约束 `T extends Record<string, unknown>`（如上面 DataTable 的写法）。
2. 症状：`Partial` 一路传染到提交——保存函数拿到的还是 `Partial<EditableUser>`，把"没填"和"填了空串"混在一起。根因：Partial 只该活在"编辑中"的生命周期里。修法：提交前收口回完整类型：zod `EditableUserSchema.parse(draft)`（失败即校验错误，呼应第 7 节）或手写守卫。
3. 症状：`Omit<User, 'idd'>` 拼错字段名不报错，等于什么都没删。根因：`Omit` 的第二个参数是宽松的 `string | number | symbol` 联合，不存在的 key 也合法。修法：用严格版 `type StrictOmit<T, K extends keyof T> = Omit<T, K>`，拼错立即编译报错。
4. 症状：接口函数重构（改名/挪文件）后 `ReturnType<typeof fetchUsers>` 红了。根因：这不是坑，是价值——派生类型把重构的影响面全部标红。修法：顺着红灯改调用点；这正是"单一来源"的意义。

---

### 9. 类型工程落地：严格化开关、CI 检查与 Code Review 清单

**是什么。** 类型安全不是"开了 strict 就完事"，而是一条工程流水线：更严的编译选项 → CI 强制类型检查 → review 时的人工类型关卡。三个环节缺一个，类型债务都会悄悄积累。

**怎么做（三步分步）。**

第一步，在阶段 0 的 `strict: true` 之上追加两个高性价比开关（`tsconfig.app.json`）：

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true
  }
}
```

两个开关在 React 代码里的具体影响，前后对照：

```tsx
interface Row { id: number; name: string }
declare const rows: Row[];

// —— noUncheckedIndexedAccess 开启前 ——
const first = rows[0];      // Row —— 编译器撒谎了：空数组时是 undefined
first.name;                // 通过，运行时崩溃

// —— 开启后 ——
const first = rows[0];      // Row | undefined
// first.name;              // ❌ 编译报错，逼你处理"空列表"
const first2 = rows.at(0);  // 同样 Row | undefined，语义更显式
if (first) first.name;      // 判空后收窄，安全
```

`verbatimModuleSyntax` 强制"类型导入必须写 `import type`"（本文件第 1 节推荐过的写法升级为强制）：值导入与类型导入在产物里彻底分离， bundler 才能安全地摇掉类型。开启后全仓把 `import { ReactNode } from 'react'` 批量改成 `import type` 即可（IDE 一键修复）。

第二步，类型检查进 CI——在阶段 0 的 GitHub Actions 流水线（husky + lint 那套，见《[02-阶段-0-环境与工具](02-阶段-0-环境与工具-0-5-周.md)》0.4 节）旁追加一个 job：

```yaml
# .github/workflows/ci.yml —— 与 lint job 平级
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit   # 类型红灯：禁止"先合了再修类型"
```

第三步，压制注释的纪律与防回涨。原则：**禁用 `@ts-ignore`（无条件压制）；`@ts-expect-error`（压制并要求报错存在，错误消失后它自己会红）可以用于确有缺口处，但必须带注释与到期条件**。再用一行脚本锁住数量基线，防止蔓延：

```bash
# scripts/check-ts-expect.sh —— 基线 12 处，只许减少不许增加
count=$(grep -rn "@ts-expect-error" src --include='*.ts' --include='*.tsx' | wc -l | tr -d ' ')
[ "$count" -le 12 ] || { echo "ts-expect-error 数量上升：$count（基线 12）"; exit 1; }
```

**Code Review 类型检查清单（8 项）。**

1. [ ] 新增 props/hook 参数有没有"手抄的重复类型"——应从 API 类型派生（第 8 节）。
2. [ ] 有没有新增的 `as` 断言——每一个都要能答上"为什么这里断言是安全的"；`as unknown as` 直接打回。
3. [ ] 有没有新增的 `@ts-ignore`——有就删；`@ts-expect-error` 是否带注释与到期条件。
4. [ ] 联合类型的新分支是否被 switch 穷尽处理（判别联合 + `never` 检查，第 2 节）。
5. [ ] Record 映射是否穷尽所有 key（第 5 节）；新增变体时红灯有没有被"as 压掉"。
6. [ ] 数据入口（fetch/json/parse/localStorage）是否先落 `unknown` 再收窄（第 7 节）。
7. [ ] 事件处理器类型是否来自 React 命名空间或 `ComponentProps` 反查（第 1 节）。
8. [ ] 新公开导出的类型有没有 `/** */` 注释——公开类型即 API 文档。

**常见坑（症状 → 根因 → 修法）。**

1. 症状：开启 `noUncheckedIndexedAccess` 后全仓几百处爆红，团队当场放弃。根因：存量代码里大量"裸索引访问"。修法：小项目集中修一轮（多半是加判空或 `.at()`）；大项目先跑 `tsc --noEmit` 记录错误数作基线，CI 脚本锁"只许减少"，按模块逐步清零。
2. 症状：开启 `verbatimModuleSyntax` 后 `import React from 'react'` 报错。根因：默认导入与运行时导入方式冲突。修法：React 17+ 的 `react-jsx` 转换下本就不需要导入 React，删掉；只留 `import { useState } from 'react'` 这类值导入。
3. 症状：CI 上 `tsc --noEmit` 报错，但本地 IDE 干净。根因：IDE 用了另一套 tsconfig（比如根目录的，或插件缓存）。修法：确认编辑器使用 `tsconfig.app.json`（VS Code 底部状态栏可切换）；必要时 "TypeScript: Restart TS Server"（第 6 节坑 4 的同款操作）。

