---
title: "A8. ref 体系与 API 生态"
---

## A8. ref 体系与 API 生态

- forwardRef 透传（React 19 起 ref 直接是 prop）；DOM ref vs 实例方法（`useImperativeHandle`：focus/open/scrollTo/reset）
- props 合并纪律：`{...rest}` 排除内部 props；clsx + tailwind-merge
- 泛型组件（`Select<T>` 的 value 类型推导）与 `ComponentProps` 类型工具

### A8.1 forwardRef 透传模板与 React 19 对照

**为什么必须透传 ref**：消费者给 Input 外面包东西、聚焦、接 react-hook-form 的 `register`/`Controller`，全要拿到底层 `<input>`。库组件不透传 ref，等于把消费者锁死在你的抽象外面。

```tsx
// React 18 写法：forwardRef 透传模板
import * as React from 'react';

export interface PanelProps extends React.ComponentPropsWithoutRef<'div'> {
  tone?: 'default' | 'brand';
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { tone = 'default', ...rest },
  ref // 第二个参数就是消费者传进来的 ref，绑到真实 DOM 上
) {
  return <div ref={ref} data-tone={tone} className="panel" {...rest} />;
});
```

```tsx
// React 19 写法：ref 是普通 prop，直接解构；forwardRef 已被官方标记为将废弃
import * as React from 'react';

export function Panel({
  ref,
  tone = 'default',
  ...rest
}: PanelProps & { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref} data-tone={tone} className="panel" {...rest} />;
}
```

迁移清单：删掉 `forwardRef` 包装与 `displayName` 手工赋值（函数声明自带名字）；props 类型从 `ComponentPropsWithoutRef` 换成 `ComponentPropsWithRef`（或显式加 `ref?: React.Ref<...>`）。React 19 还允许 ref 回调返回清理函数（挂载返回的函数在卸载时调用），写副作用型 ref 回调时用得上。存量库要同时兼容 18/19：保留 forwardRef 写法即可（19 仍支持），不必急迁。

### A8.2 DOM ref vs 实例方法：useImperativeHandle

透传 DOM ref 只覆盖"消费者想操作原生元素"的场景；库组件往往要暴露**组合能力**：Select 的 `focus()/open()`、虚拟列表的 `scrollTo(index)`、表单的 `reset()`。用 `useImperativeHandle` 定义实例句柄，消费者拿到的 ref 是这份句柄而非 DOM：

```tsx
// Picker.tsx —— 实例方法型 ref：focus / open / close / scrollToIndex / reset
import * as React from 'react';
import { useControllableState } from './useControllableState';

export interface PickerHandle {
  focus(options?: FocusOptions): void;
  open(): void;
  close(): void;
  scrollToIndex(index: number): void;
  reset(): void;
}

export interface PickerProps {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export const Picker = React.forwardRef<PickerHandle, PickerProps>(
  function Picker({ options, value, defaultValue, onChange }, forwardedRef) {
    const triggerRef = React.useRef<HTMLButtonElement>(null); // 内部：触发按钮的 DOM
    const listRef = React.useRef<HTMLUListElement>(null);     // 内部：下拉列表的 DOM
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = useControllableState<string | undefined>({
      value,
      defaultValue,
      onChange: (v) => onChange?.(v as string), // reset 产生的 undefined 不外抛
    });

    // 句柄对象：依赖数组为空也安全——闭包全走 ref/setState（永远最新），
    // 句柄只创建一次，消费者手里的 ref 不会每次渲染换对象
    React.useImperativeHandle(
      forwardedRef,
      () => ({
        focus: (focusOptions) => triggerRef.current?.focus(focusOptions),
        open: () => setOpen(true),
        close: () => setOpen(false),
        scrollToIndex: (index) => {
          const item = listRef.current?.children[index] as HTMLElement | undefined;
          item?.scrollIntoView({ block: 'nearest' }); // 滚到可见即可，不劫持页面滚动
        },
        reset: () => setSelected(undefined),
      }),
      [setSelected]
    );

    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {options.find((o) => o.value === selected)?.label ?? '请选择'}
        </button>
        {open && (
          <ul ref={listRef} role="listbox">
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === selected}
                onClick={() => {
                  setSelected(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
);
```

**DOM ref 与实例方法怎么选**：只有原生能力的（Input/Button）→ 透传 DOM ref；内部有多个 DOM、行为需要多元素协作的（Select/虚拟列表）→ useImperativeHandle。两者都要时，常见做法是句柄里同时带上关键 DOM 引用（antd 的 Input 句柄就暴露 `focus/blur/select` 等方法而不是裸 input），或者用 ref 合并：

```tsx
// composeRefs.ts —— 多方共享一个 DOM ref
import * as React from 'react';

export function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

// 用法：内部测量和消费者 ref 都要拿同一个 div
// <div ref={composeRefs(internalRef, forwardedRef)} />
```

### A8.3 props 合并纪律

库组件是 props 的"中间商"：内部 props 消化掉、外部 props 透传下去、同名 props 合并而非覆盖。四条纪律：

1. **`{...rest}` 前必须把内部 props 全部解构出来**——否则消费者的 `className` 会覆盖你的（或反过来，取决于展开顺序），属于隐性行为；
2. **className 合并**：`clsx` 管拼接，`tailwind-merge` 管冲突消解（消费者的 `p-6` 要赢过你的 `p-3`）；
3. **事件回调组合**而非覆盖：内部行为 + 消费者回调都执行；
4. **透传顺序**：显式属性在 `{...rest}` 之前或之后要想清楚——标准模板是"内部计算完的属性写死，rest 最后展开让 data-*/aria-* 全部通过，同名的已被解构拿走所以不冲突"。

```tsx
// cn.ts —— className 合并的标准工具
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  // clsx：条件拼接（false/undefined 自动跳过）
  // twMerge：同组冲突取后者（'p-3 p-6' → 'p-6'；'text-red-500 text-blue-500' → 后者）
  return twMerge(clsx(inputs));
}
```

```tsx
// CollapsePanel.tsx —— 合并纪律的完整样板
import * as React from 'react';
import { cn } from './cn';

export interface CollapsePanelProps extends React.ComponentPropsWithoutRef<'div'> {
  size?: 'md' | 'lg';
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CollapsePanel = React.forwardRef<HTMLDivElement, CollapsePanelProps>(
  function CollapsePanel(
    {
      size = 'md',
      defaultOpen = false,
      onOpenChange,
      className,       // ← 纪律 1：内部 props 全解构，rest 里只剩"真正的外部 props"
      onClick,
      children,
      ...rest          // data-*、aria-*、id、style 等全部原样透传
    },
    ref
  ) {
    const [open, setOpen] = React.useState(defaultOpen);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-white p-3 transition-colors', // 底座样式
          size === 'lg' && 'p-6',                              // 变体样式
          className                                            // ← 纪律 2：消费者的类放最后，冲突时赢
        )}
        onClick={(e) => {
          setOpen((v) => !v);   // 内部行为
          onOpenChange?.(!open);
          onClick?.(e);          // ← 纪律 3：组合而非覆盖，消费者仍拿得到完整事件
        }}
        {...rest}                // ← 纪律 4：最后展开，透传一切未处理的属性
      >
        {children}
      </div>
    );
  }
);
```

### A8.4 泛型组件与 ComponentProps 类型工具

**为什么 `Select` 必须泛型**：`options` 是 `{ value: T; label }[]`，`onChange` 回调 `T`。如果 T 固定成 `string`，用 `Select<Value = number>` 的业务方全程 `as string` 强转，类型系统形同虚设；写死 `string | number` 则选中值的类型永远是联合。泛型让 `value/onChange` 的类型从 `options` **自动推导**。

**React 18 的障碍**：`forwardRef` 的类型签名不支持泛型组件（它把 props 类型固定死了），需要"实现 + 断言"两段式：

```tsx
// Select.tsx —— React 18：泛型组件的 forwardRef 透传（标准断言模板）
import * as React from 'react';
import { useControllableState } from './useControllableState';

export interface SelectOption<T> { value: T; label: React.ReactNode }

export interface SelectProps<T>
  extends Omit<React.ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange'> {
  options: ReadonlyArray<SelectOption<T>>;
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}

function SelectInner<T>(
  { options, value, defaultValue, onChange, ...rest }: SelectProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const [selected, setSelected] = useControllableState<T>({ value, defaultValue, onChange });
  const label = options.find((o) => o.value === selected)?.label;
  return (
    <button type="button" ref={ref} {...rest}>
      {label ?? '请选择'}
    </button>
  );
}

// forwardRef 会把 T 擦成 unknown：用断言把调用处的泛型"接回来"
export const Select = React.forwardRef(SelectInner) as <T>(
  props: React.PropsWithoutRef<SelectProps<T>> & { ref?: React.Ref<HTMLButtonElement> }
) => React.ReactElement | null;
```

```tsx
// Select.tsx —— React 19：ref 是普通 prop，泛型不再需要断言
import * as React from 'react';

export function Select<T>({
  options,
  value,
  defaultValue,
  onChange,
  ref,
  ...rest
}: SelectProps<T> & { ref?: React.Ref<HTMLButtonElement> }) {
  const [selected, setSelected] = useControllableState<T>({ value, defaultValue, onChange });
  const label = options.find((o) => o.value === selected)?.label;
  return (
    <button type="button" ref={ref} {...rest}>
      {label ?? '请选择'}
    </button>
  );
}

// 调用处：T 自动推导为 number，onChange 收到的就是 number
// <Select options={[{ value: 1, label: '一' }]} onChange={(v) => console.log(v + 1)} />
```

**ComponentProps 家族**（少写一半 interface 的利器）：

```tsx
// 三者的差别只在 ref：
type A = React.ComponentProps<'button'>;           // 含 ref（LegacyRef，历史遗留形态）
type B = React.ComponentPropsWithoutRef<'button'>; // 不含 ref：配 forwardRef 的 props 泛型用
type C = React.ComponentPropsWithRef<'button'>;    // 显式含 ref：React 19 ref-as-prop 用

// 也能从组件反取 props：给第三方组件包壳时不必翻它的类型定义
// type WrappedProps = React.ComponentProps<typeof SomeThirdPartyButton>;
```

选用规则：包 DOM 元素用 `ComponentPropsWithoutRef<'tag'>`（ref 由 forwardRef 泛型管）；包组件用 `ComponentProps<typeof Comp>`；React 19 的函数组件直接 `ComponentPropsWithRef`。

### A8.5 常见坑

1. **rest 展开把内部 props 打穿**。症状：消费者传的 `style` 把库的定位样式干掉了。根因：内部用 `style` 实现，又原样透传了 rest 里的同名项。修法：解构出 `style` 用工具函数浅合并（`style={{ ...internal, ...external }}`），或文档声明 `style` 只作用于某层。
2. **`forwardRef` 组件没设 displayName**。症状：DevTools 里显示 `ForwardRef` 一排匿名。根因：匿名箭头函数当渲染函数。修法：用具名函数表达式（A8.1 模板里的 `function Panel(...)`），或手工 `Panel.displayName = 'Panel'`。
3. **useImperativeHandle 依赖数组乱写**。症状：句柄方法读到旧闭包（focus 到已卸载元素）。根因：依赖里漏了真实依赖，或句柄每渲染重建导致消费者 `useEffect([ref])` 抖动。修法：句柄内部只经 ref/setState 访问世界（A8.2 的写法），依赖数组保持最小。

### A8.6 ref 的类型传递链：公开 ref 类型的最小正确写法

A8.1–A8.4 讲的是"单个组件怎么接 ref"；这一节讲"ref 类型怎么穿越多层"。消费者经常要包一层你的组件（FormItem 包 Select、业务 Input 包库 Input），类型链在三层地方断：**导出的类型形态不统一**、**wrapper 的 props 没继承 ref**、**泛型组件的 ref 在每一层被擦除**。断哪一层，消费者的 `useRef` 就开始写 `any`。

先看一次 ref 的完整旅程（类型视角），后面所有写法都是这条链上的节点：

```text
消费者 useRef<XxxRef>(null)
  → <FormItem ref={r} />          外层 props 声明 ref?: Ref<HTMLButtonElement>
    → FormItem 解构 ref 并转发      <Select ref={ref} />
      → Select 把 ref 绑到 DOM      <button ref={ref} />

类型检查只保证"props 类型里声明了 ref"；中间层若把它丢了
（没解构也没随 rest 展开，或展开到了不透传 ref 的第三方组件上），
类型层不报错，消费者的 ref.current 永远是 null——运行时才暴露。
```

先立三条导出约定（全库统一，挑一套就用到底）：

```tsx
// ref 类型的三种公开形态
// ① DOM 型组件：导出类型别名，名字即文档
export type InputRef = HTMLInputElement;

// ② 句柄型组件：导出独立 interface（A8.2 的 PickerHandle）
export interface PickerHandle {
  focus(options?: FocusOptions): void;
  open(): void;
  close(): void;
}

// ③ 包壳既有组件时：从组件反取，不必翻库的 d.ts
export type PickerRef = React.ComponentRef<typeof Picker>; // 即 PickerHandle
type PickerPropsFromLib = React.ComponentPropsWithRef<typeof Picker>; // props 同理可反取
```

`ComponentRef` 与老代码里的 `ElementRef` 是同义词（`ComponentRef<T> = ComponentPropsWithRef<T> extends RefAttributes<infer M> ? M : never`），新代码统一用 `ComponentRef`。React 19 类型下 `React.Ref<T>` 的定义是 `RefCallback<T> | RefObject<T | null> | null`——注意 `RefObject<T | null>`，这与下文坑 2 相关。

**泛型传递链**。真实的断链现场是泛型组件被包壳：A8.4 的 `Select<T>` 包进 FormItem 后，T 必须继续可推导、ref 必须继续可达。React 19 写法下两层都自然：

```tsx
// FormItem.tsx —— 包壳 A8.4 的泛型 Select：T 与 ref 全链传递（React 19）
import * as React from 'react';
import { Select, type SelectProps } from './Select';

export interface FormItemProps<T> extends Omit<SelectProps<T>, 'className'> {
  label: string;
  required?: boolean;
  wrapperClassName?: string; // 包装层自己的类名（与 Select 的 className 分开给，合并走 A8.3 的 cn）
}

export function FormItem<T>(
  { label, required, wrapperClassName, ref, ...rest }: FormItemProps<T> & {
    ref?: React.Ref<HTMLButtonElement>; // Select 的 ref 类型原样透出，不发明新形态
  },
) {
  return (
    <div className={wrapperClassName}>
      <span aria-hidden="true">{label}{required ? ' *' : ''}</span>
      <Select ref={ref} {...rest} />
    </div>
  );
}

// 消费侧：T 推导为 number，ref 拿到的是 Select 的 button
// <FormItem<number> label="数量" options={[{ value: 1, label: '一' }]} ref={btnRef} />
```

两个要点：`extends Omit<SelectProps<T>, ...>` 只 Omit 你**确实要接管**的 props（这里是 className），其余原样继承——大而全的 Omit 会让消费者的类型体验退化；`ref` 显式解构并写进返回类型交叉里，这是 React 19 的 ref-as-prop 纪律（A8.7 展开）。React 18 下同一条链每一层都要 A8.4 的断言模板，泛型在断言里"接回来"——这是 18 时代泛型组件包壳成本高的根源。

泛型链之外还有一类高频包壳：**不改 props、只做装饰**（包个外壳、加个后缀）。这种场景不该 extends（要点名库里每个 props 类型），而是整体反取：

```tsx
// BizInput.tsx —— 装饰层包壳：零维护的 props 反取模板（React 19）
import * as React from 'react';
import { Input } from 'my-ui';           // 只用库的公开导出，不 import 内部类型
import { cn } from './cn';               // A8.3 的合并工具

type LibInputProps = React.ComponentPropsWithRef<typeof Input>; // 反取：库升级加 prop 时这里零维护

export function BizInput(
  { className, suffix, ref, ...rest }: LibInputProps & { suffix?: React.ReactNode },
) {
  return (
    <span className="biz-input">
      <Input ref={ref} className={cn('biz-input-core', className)} {...rest} />
      {suffix && <span className="biz-input-suffix">{suffix}</span>}
    </span>
  );
}
```

extends 与反取的选择判据一句话：**要"点名"库的 props（加字段、改类型）就 extends 声明；一个都不点名（纯装饰）就 `ComponentPropsWithRef<typeof Inner>` 反取**。反取的维护成本是零，代价是读类型的人要跳一层——组件库里对外的最终组件适合 extends（文档即类型），业务侧的装饰壳适合反取（快且稳）。

类型链要用**类型测试**钉进 CI（ref 类型是最容易被"顺手改坏"又最难被业务测试发现的东西）：

```ts
// input.types.test.ts —— vitest 的 expectTypeOf：类型面即契约
import { describe, expectTypeOf, it } from 'vitest';
import { Input, type InputProps, type InputRef } from '.';

describe('Input 的公开类型面', () => {
  it('ref 是 DOM 引用', () => {
    expectTypeOf<InputRef>().toEqualTypeOf<HTMLInputElement>();
  });

  it('props 继承原生 input 且不带自造 ref 形态', () => {
    expectTypeOf<InputProps>().toExtend<React.ComponentPropsWithoutRef<'input'>>();
  });

  it('组件接受 ref prop（React 19 形态）', () => {
    expectTypeOf<Input>().parameter(0).toMatchTypeOf<{ ref?: React.Ref<HTMLInputElement> }>();
  });
});
```

这三条断言分别守住本节的三条链：Ref 类型别名没漂、props 继承没断、ref-as-prop 没被某次重构悄悄删掉。

常见坑：

1. **用 `ComponentProps<typeof 泛型组件>` 反取 props**。症状：包壳后 `options` 的元素类型变成 `unknown`/默认值，`onChange` 参数丢失泛型。根因：`typeof Select` 是泛型函数类型，`ComponentProps` 从中 infer props 时泛型参数被冻结（推断不出调用方的 T）。修法：包壳泛型组件必须重新声明 `WrapperProps<T> extends InnerProps<T>`（上面 FormItem 的写法），不能靠反取；反取只用于非泛型组件。
2. **`useRef<HTMLDivElement>(null)` 传给 `ref?: Ref<HTMLDivElement>` 报"不兼容"**。React 19 类型下 `useRef<T>(null)` 返回 `RefObject<T | null>`，而 `Ref<T>` 本就要求 `RefObject<T | null>`——正常传法是合法的。真正报错的通常是老代码里手写的 `MutableRefObject<HTMLDivElement>`（current 被断言为非空）。修法：统一从 `useRef<T>(null)` 起步，判空交给使用处；库的公开 API 不要出现 `MutableRefObject`。
3. **React 18 下用了 ref-as-prop 写法**。症状：18 的接入方拿不到 ref（无报错，只有 dev 警告"Function components cannot be given refs"）。根因：React 18 在把 props 交给函数组件**之前**就把 ref 抽走了，它根本进不了 props。修法：声明支持 18 的库必须保持 forwardRef 写法（19 也兼容），详见 A8.7 的迁移路线。
4. **公开了 ref 类型却没从入口导出**。症状：消费者写 `useRef<InputRef>(null)` 时 TS 报"模块 'my-ui' 没有导出的成员 'InputRef'"，库里明明定义了。根因：index barrel 只 re-export 了组件，漏了类型。修法：所有 ref/props/handle 类型与组件同文件定义、从入口统一 re-export；并让"类型可导入"进 d.ts 校验（C2 的产物类型检查跑一个模拟消费工程，漏导出当场红）。

### A8.7 React 19 的 ref 体系变化：ref as prop、回调清理与迁移路线

A8.1 给了新旧两版模板与一段迁移清单；这一节把 React 19 的 ref 体系变化讲全（不止 forwardRef 一项），并给出库作者视角的分步迁移路线。四项变化：

1. **ref 是函数组件的普通 prop**：直接解构，不需要 forwardRef；
2. **forwardRef 被官方标记弃用**：19 里仍可工作，未来大版本移除——存量代码有迁移窗口，不必恐慌；
3. **ref 回调可以返回清理函数**：挂载/更新时返回的函数，会在 ref 分离（卸载或换目标）时调用——语义对齐 effect 的清理；
4. **回调协议变了**：18 的分离通知是"再调一次回调、传 null"；19 下**若回调返回了清理函数，React 不再传 null 调用它**——两套协议不能混用。

ref 回调清理最实际的收益是"副作用型 ref 回调"不再需要手工记账（挂了全局监听要记得摘）。A8.2 的 composeRefs 在 19 下应当升级——旧版给每个回调转发 node，却丢弃了它们可能返回的清理函数：

```tsx
// composeRefs.ts —— React 19 版：转发清理函数，并对齐对象 ref 的卸载语义
import * as React from 'react';

export function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void | (() => void) {
  return (node) => {
    const cleanups: Array<() => void> = [];
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        const cleanup = ref(node);        // 消费者的回调可能返回清理函数
        if (typeof cleanup === 'function') cleanups.push(cleanup);
      } else {
        ref.current = node;               // React 19 类型下 RefObject.current 可写
      }
    }
    return () => {
      cleanups.forEach((fn) => fn());
      for (const ref of refs) {           // React 对"直接传对象 ref"的卸载语义是置 null，
        if (ref && typeof ref !== 'function') ref.current = null; // 经我们转发时要自己补上
      }
    };
  };
}

// 用法（注意 memo：内联调用每次渲染产生新函数，
// React 会视为"ref 变了"而先清理再重挂）：
// const mergedRef = React.useMemo(() => composeRefs(internalRef, forwardedRef), []);
// <div ref={mergedRef} />
```

**句柄型组件的迁移实录**（A8.2 的 Picker 迁到 19，forwardRef 泛型组件里最常见的一类）：

```tsx
// 迁移前（React 18）：forwardRef + useImperativeHandle
export const Picker = React.forwardRef<PickerHandle, PickerProps>(
  function Picker(props, forwardedRef) {
    React.useImperativeHandle(forwardedRef, () => ({ /* 句柄 */ }), []);
    // ……
  },
);

// 迁移后（React 19）：ref 是 prop，useImperativeHandle 第一个参数直接用 ref
export function Picker(
  { options, value, defaultValue, onChange, ref }: PickerProps & {
    ref?: React.Ref<PickerHandle>; // 句柄类型从"forwardRef 的第二个泛型"挪到"props 的一个字段"
  },
) {
  React.useImperativeHandle(
    ref, // Ref<PickerHandle> 覆盖 RefObject/回调/undefined 三态，hook 自己处理
    () => ({
      focus: (o) => triggerRef.current?.focus(o),
      open: () => setOpen(true),
      // ……
    }),
    [],
  );
  // ……
}
```

迁移要点：句柄类型的位置变了——`forwardRef<PickerHandle, Props>` 的第一个泛型变成 props 交叉里的 `ref?: React.Ref<PickerHandle>`。这不只是写法差异，**公开 API 文档里的类型签名也要跟着改**（消费者是从 d.ts 里找句柄类型的），属于 changelog 里要单独列出的类型层变化。

**迁移路线**（库作者视角，四步走）：

1. **类型先行**：`npx types-react-codemod@latest preset-19 ./src`——把 props/ref 类型、`useRef` 必须给初值等类型层改动一次做完，类型绿了再动行为；
2. **机械改写**：`npx codemod@latest react/19/migration-recipe`——官方配方覆盖 `ReactDOM.render` → `createRoot` 等批量改写；forwardRef 解包多数可自动完成，但 A8.4 那种"泛型 + 断言"模板要人工核对（codemod 不知道你的泛型意图）；
3. **双版本兼容期**：`peerDependencies: { react: '>=18' }` 的库**保留 forwardRef 写法**（19 完全支持它），只在新组件上用 ref-as-prop——两条写法在同一库共存没有问题；等 peerDep 收到 `>=19` 再统一解包；
4. **迁完的收益**：泛型组件不再需要断言（A8.4 对照）、函数名自动成为 DevTools 显示名（省掉 displayName 手工赋值）、少一层包装组件（包体与 DevTools 树都更干净）。

两条官方命令集中放这里（顺序固定：先类型后行为）：

```bash
# ① 类型层升级：props/ref 类型、useRef 必须给初值等
npx types-react-codemod@latest preset-19 ./src
# ② 行为层改写：render → createRoot 等批量替换
npx codemod@latest react/19/migration-recipe
```

codemod 能自动到什么程度，心里要有数（决定迁移 PR 里人工 review 的重点）：

| 改动 | codemod 可自动 | 备注 |
|---|---|---|
| `ReactDOM.render` → `createRoot`/`hydrateRoot` | 是 | 官方 recipe 内含 |
| 非泛型组件的 forwardRef 解包 | 基本可以 | 解包后跑测试确认；displayName 删除可能带动快照变化 |
| 泛型 + 断言模板（A8.4） | 否 | codemod 不知道泛型意图，手工重写——好在 19 写法本身更短 |
| props 类型换 `ComponentPropsWithRef` | 是 | `types-react-codemod preset-19` 处理 |
| 测试里对 ref 的断言/工具封装 | 否 | 测试套件跑一遍，红点就是人工清单 |

**什么时候值得迁**（把"是否迁移"本身决策化）：

| 库的现状 | 建议 |
|---|---|
| peerDependencies 含 18 | 不迁。新组件也保持 forwardRef 写法——同库两种写法并存没问题，但同一"组件族"内混用会让贡献者困惑 |
| peerDep ≥ 19，以非泛型组件为主 | 迁。codemod + 快照重录，半天量级，收益立取 |
| peerDep ≥ 19，泛型组件为主 | 迁。手工量更大，但每处迁移都在删代码（A8.4 的断言模板变直写），净收益最高 |
| 内部应用（非发布库） | 跟随框架升级节奏顺带做，不单独立项 |

无论哪档，迁移 PR 的检查单固定五项：props 类型（WithoutRef → WithRef）、displayName 清理、测试红点清零、公开 d.ts 里 ref 类型位置的变化写进 changelog、peerDependencies 与 README 的版本声明同步。

迁移"完成"要有可观察的判据，三个动作逐个过：

1. DevTools 组件树里不再出现 `ForwardRef(...)` 包装层（组件名直接显示）；
2. 句柄链实测：消费者 `ref.current?.open()` / `focus()` 真能驱动组件（挑一个句柄型组件手动走一遍）；
3. 泛型调用处 hover 检查 `onChange` 参数类型——T 推导无回退（没有悄悄变成 `unknown` 或 `string | number`）；
4. 产物抽查：bundle 的 source map 里搜不到 forwardRef 的引用——"少一层包装"的收益落到了实处，而不只是写法好看。

常见坑：

1. **双支持期在新组件上用了 ref-as-prop**。症状：18 接入方静默丢 ref（见 A8.6 坑 3）。修法：库的 React 最低支持版本决定写法，不是你本地的版本。
2. **ref 回调返回了非函数值**。症状：TypeScript 直接报错（19 类型把 `RefCallback` 的返回值收窄为 `void | 清理函数`），运行时也会得到警告。典型现场：`ref={(node) => setNodes((arr) => [...arr, node])}`——`setNodes` 返回的是数组。修法：回调体加大括号 `{ ... }` 明确返回 void，或把返回清理函数写全。
3. **同一回调里既处理 `node === null` 又返回清理函数**。症状：19 下 `null` 分支永远不执行，成为死代码；行为悄悄漂移。根因：19 的协议是"有清理就调清理，不再传 null"。修法：选边——要兼容 18 的回调只能靠 null 入参判断分离；19-only 的代码删掉 null 分支，全部逻辑放清理函数。
4. **迁移 PR 里快照测试成片变红**。症状：解包 forwardRef 后几十个快照失败，diff 只有组件名。根因：DevTools/快照里的组件名从 `ForwardRef(Picker)` 变成 `Picker`（这正是迁移收益之一，但快照记住了旧名字）。修法：`vitest -u`（或等价命令）重录快照；review 迁移 PR 时把"仅名字变化"的快照与"行为变化"的快照分开看，前者批量过、后者逐个看。

### A8.8 imperative handle 的 API 设计评审

A8.2 讲了 useImperativeHandle 怎么实现；这一节讲**该暴露什么**。句柄是组件的公开 API：每一个方法都是永久承诺（删方法是 breaking change，要走大版本），所以"哪些进句柄"是一个设计评审题，不是实现顺手题。

四条评审原则，配一个现场评审：

1. **只暴露动词，不暴露名词**。方法（open/close/scrollTo）是行为契约；裸 DOM 引用、内部 setState、内部数据结构都是实现细节。暴露名词等于把内幕焊死在 API 上。
2. **每个命令式方法都该有声明式孪生**（focus 一族例外——焦点本来就是命令式领域）。`open()` 的孪生是 `open` prop；若某方法没有孪生，说明组件把本该 props 化的能力藏进了 ref，是设计味道。
3. **镜像平台动词优先于自造动词**。focus/blur/select/scrollTo/reset 沿用平台命名——消费者不用学；自造动词（如 `reveal()` 代替 `scrollIntoView()`）必须给出"平台词为何不够"的理由。
4. **句柄必须可版本化**：接口命名统一（`XxxHandle` 或 antd 风格的 `XxxRef`，全库一致）；方法注释标注引入版本；查询型方法（getXxx）要写明"返回即时快照"。

四条原则落到常见组件上的速查表（评审时的对照基线）：

| 组件 | ref 形态 | 推荐句柄 | 声明式孪生 |
|---|---|---|---|
| Button | DOM | 不做句柄（DOM 自带 focus/blur） | — |
| Input | DOM | focus / blur / select / reset | value / defaultValue |
| Select | 句柄 | focus / open / close / scrollToIndex | open / value 受控（A1） |
| Modal | 句柄 | open / close / returnFocus | open / onOpenChange |
| VirtualList | 句柄 | scrollTo(offset) / scrollToIndex(index) | ——滚动位置不 props 化 |

VirtualList 的"无孪生"是原则 2 的重要例外：滚动位置这类高频连续值做成 props 是性能与语义的双重灾难。孪生原则的边界画在这里——**离散、可被外部状态机表达的动作用 props；连续/高频/测量型的动作用句柄**。Button 行则展示另一头：原生元素的能力不重复包装，透传 DOM ref 就是最小正确 API。

现场评审一个坏句柄（Modal 的真实评审记录风格）：

```tsx
// 反例：这个句柄泄露了三层实现
export interface ModalHandle {
  setVisible: React.Dispatch<React.SetStateAction<boolean>>; // ① 内部 state 的 setter
  maskRef: React.RefObject<HTMLDivElement>;                  // ② 内部 DOM
  contentScrollTop: number;                                  // ③ 属性形式的"查询"：句柄创建后即过期
}
```

逐条：① 消费者可以 `setVisible(true)` 绕过 A3 的双状态机——退出动画状态被直接跳过，Modal 移除时动画丢失且无告警；② 消费者给 mask 直接挂监听、改样式，下次你重构 DOM 结构就是批量工单；③ `contentScrollTop` 是创建句柄那一刻的快照，消费者读到的永远是旧值——查询必须做成方法。

修成可长期维护的形态：

```tsx
// ModalHandle.tsx —— 评审通过版
export interface ModalHandle {
  /** 打开。声明式孪生：<Modal open /> */
  open(): void;
  /** 关闭。走正常关闭流程（含退出动画），声明式孪生：open 置 false */
  close(): void;
  /** 关闭后把焦点还给指定元素（默认触发器）——A4 焦点哨兵的收尾动作 */
  returnFocus(target?: HTMLElement): void;
  /** body 滚动锁状态查询。返回即时快照（命名带 get 表明语义） */
  getScrollLocked(): boolean;
}
```

```tsx
// Modal.tsx —— 句柄实现骨架（动画与焦点细节见 A3/A4，此处只看句柄纪律）
import * as React from 'react';
import { useMountTransition } from './useMountTransition'; // A3.3

export function Modal(
  { open, onOpenChange, children, ref }: ModalProps & { ref?: React.Ref<ModalHandle> },
) {
  const [mounted, setVisible] = useMountTransition(open, 200);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      open: () => onOpenChange?.(true),       // 复用声明式通道：句柄只是糖
      close: () => onOpenChange?.(false),     // 不直戳 setVisible——动画状态机不可绕过
      returnFocus: (target) => (target ?? returnFocusRef.current)?.focus(),
      getScrollLocked: () => mounted && open, // 方法形态的查询：每次调用取当下值
    }),
    [mounted, open, onOpenChange],
  );
  // ……渲染部分省略
}
```

两个设计决定值得点破：`open/close` 内部走的是 `onOpenChange`（声明式通道）而非直呼 `setVisible`——命令式方法只是"在无法声明的时间点触发"的糖，绝不另开一条状态通路；`getScrollLocked` 做成方法而非属性，因为句柄对象一旦创建，属性就冻结在创建那一刻（A8.5 坑 3 的根治方式之一是"句柄只经 ref/setState 访问世界"，查询型方法读取的也必须是当下的值）。

可选的加固：**冻结句柄**，防消费者给句柄打猴子补丁（也给库作者一个"句柄不会被外部扩展"的心理契约）：

```tsx
React.useImperativeHandle(
  ref,
  () =>
    Object.freeze({
      open: () => onOpenChange?.(true),
      close: () => onOpenChange?.(false),
    }),
  [onOpenChange],
);
// freeze 只锁句柄对象本身（浅冻结），不是安全边界，是"礼貌加固"
```

最后把本节收成**句柄 PR 的五问**（可直接贴进组件库贡献模板）：

1. 新方法有声明式孪生吗？没有的话属于哪条豁免（高频/连续/测量型）？
2. 动词进全库词根表了吗（open/close、load/reset、focus/blur）？
3. 有查询方法吗？是 `getXxx()` 形态并注明了"即时快照"语义？
4. 句柄接口从入口导出了吗、JSDoc 标注引入版本了吗（A8.6 坑 4）？
5. 有删除/改名吗？changesets 会按 major 拦截（C5），别绕过它发 patch。

与五问配套的是**文档义务**：句柄是 API，就要有 API 文档的完整形态。组件文档站里每个带句柄的组件至少展示三样——句柄的类型签名（从 d.ts 生成，不手抄）、一个最小可运行用例（按钮调 `handle.open()` 的 playground）、句柄方法与声明式孪生 props 的对照表（哪些事两种方式都能做、哪些只有句柄能做）。第三样最常被省略，也最能减少消费者的误用——大多数人是在"不知道有孪生 props"的情况下才滥用句柄的。

常见坑：

1. **句柄暴露内部 setState**。症状：消费者 `handle.setVisible(true)` 后退出动画消失、 onClose 不触发。根因：状态机被外戳（A3 双状态机的入口必须唯一）。修法：句柄方法内部统一走对外回调/受控通道，setter 永不出口。
2. **句柄暴露内部 DOM ref**。症状：消费者 `handle.maskRef.current.style.background = 'red'`；你重构 DOM 结构后批量炸。根因：名词泄露（原则 1）。修法：确实需要定制的外观收口成 props/className（A8.3 合并纪律），DOM 引用不出库。
3. **查询做成句柄属性**。症状：消费者读到过期值，偶现且难复现。根因：句柄是创建那一刻的对象，属性不会随组件状态更新。修法：查询一律方法化（getXxx），文档写明"即时快照"；能改造成回调/受控 props 的优先改造。
4. **动词命名漂移**。症状：A 组件是 show/hide，B 组件是 open/close，C 组件是 setVisible。根因：句柄设计没有词根表。修法：全库统一词根（弹层类 open/close，数据类 load/reset，焦点类 focus/blur/focusLast），写进组件库贡献指南。
5. **句柄方法抛错直穿消费者**。症状：消费者调 `handle.scrollToIndex(999)`，库内部某分支 throw，调用方没有 try/catch，整页崩。根因：句柄是普通函数调用，异常栈原样穿透；而命令式 API 的调用点多在事件处理器里，没人包 try/catch。修法：索引越界这类可预期输入**静默收敛**（clamp 到合法范围）而非 throw；确实需要抛错的 precondition 在 JSDoc 标注"throws"，让消费者有契约可依——库的命令式 API 以失败安全为默认。

收尾一个综合反模式：**句柄当事件总线**。症状：句柄上出现 `handle.onChange(fn)`、`handle.on('scroll', cb)` 这类"注册回调"型方法。根因：把句柄当成了组件与外界的第二条数据通道。危害是双重的——订阅的生命周期没人管（组件卸载后回调还挂着，泄漏），且与 props 回调/受控值形成平行的两条数据流（A1 的"值的来源必须唯一"在事件维度同样成立）。修法：事件通知用 props 回调（`onScroll`），持续变化的状态走受控（A1 双模式），句柄只保留"消费者主动发起的动作"。判别口诀：**句柄的方法应该是动词原形（open/scroll/focus），出现 on 开头的方法就停手**。

把口诀落成签名对照（评审时一眼识别）：

```tsx
// 反模式的形状："注册/通知/裸引用"混进句柄
interface BadListHandle {
  on(eventName: string, cb: () => void): void;        // 事件总线：生命周期无人管
  setVisible(next: boolean): void;                     // 裸 setter：绕过状态机
  listRef: React.RefObject<HTMLUListElement>;          // 裸 DOM：实现泄露
}

// 好句柄的形状：全部是"消费者主动发起的动作"
interface GoodListHandle {
  scrollToIndex(index: number): void;
  scrollToOffset(offset: number): void;
  focus(options?: FocusOptions): void;
}
```
