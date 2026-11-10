# React 组件库实战大纲：组件实现的功力清单

> 定位：第五份文档。《基础大纲》阶段 3 只讲了组件设计模式，本章补全另一半：**组件库工程 + 每个组件的硬核考点**。
> 三层结构：Part A 通用内功（所有组件共享的硬技术，不先练这些，写任何复杂组件都会撞墙）→ Part B 组件清单（按功力分级，每个组件 = 考点 + 要点 + 对标）→ Part C 工程化（从 demo 到可发布的库）。
> 一句话：**组件库是 React 功力的试炼场——API 设计考抽象，组件实现考细节，工程化考全局。**

## 目录

- [引言：这份大纲在六份文档里的位置](#引言这份大纲在六份文档里的位置)
- [A1. 受控/非受控双模式（30 行 hook，处处要用）](#a1-受控非受控双模式30-行-hook处处要用)
  - [A1.1 是什么：状态所有权的两种形态](#a11-是什么状态所有权的两种形态)
  - [A1.2 为什么需要：三种调用场景缺一不可](#a12-为什么需要三种调用场景缺一不可)
  - [A1.3 怎么做：useControllableState 完整实现](#a13-怎么做usecontrollablestate-完整实现)
  - [A1.4 三个双模式组件：Switch / Input / Select](#a14-三个双模式组件switch--input--select)
  - [A1.5 受控不回显的 bug 复现](#a15-受控不回显的-bug-复现)
  - [A1.6 常见坑](#a16-常见坑)
  - [✍️ 动手练习（原文：实现 `useControllableState`，并写 Switch/Input/Select 三个双模式组件验证）](#️-动手练习原文实现-usecontrollablestate并写-switchinputselect-三个双模式组件验证)
- [A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）](#a2-弹层体系popoverselecttooltipdatepicker-的共同地基)
  - [A2.1 弹层的四个公共难题](#a21-弹层的四个公共难题)
  - [A2.2 computePosition 与中间件机制](#a22-computeposition-与中间件机制)
  - [A2.3 useFloating 最小接入](#a23-usefloating-最小接入)
  - [A2.4 为什么不要自己写定位](#a24-为什么不要自己写定位)
  - [A2.5 Portal 挂载点治理](#a25-portal-挂载点治理)
  - [A2.6 z-index 治理：多级弹层层级管理器](#a26-z-index-治理多级弹层层级管理器)
  - [A2.7 hover 意图延时与级联链保持](#a27-hover-意图延时与级联链保持)
  - [A2.8 autoUpdate 的职责](#a28-autoupdate-的职责)
  - [A2.9 useClickOutside 的完整实现](#a29-useclickoutside-的完整实现)
  - [A2.10 常见坑](#a210-常见坑)
- [A3. "退出动画"难题（visible/mounted 双状态机）](#a3-退出动画难题visiblemounted-双状态机)
  - [A3.1 问题本质：卸载即消失，动画无处安放](#a31-问题本质卸载即消失动画无处安放)
  - [A3.2 双状态机与状态转移表](#a32-双状态机与状态转移表)
  - [A3.3 useMountTransition 完整实现](#a33-usemounttransition-完整实现)
  - [A3.4 完整组件：带退出动画的 Popup](#a34-完整组件带退出动画的-popup)
  - [A3.5 与 CSSTransition / AnimatePresence 的原理同构](#a35-与-csstransition--animatepresence-的原理同构)
  - [A3.6 列表项退出动画与卸载竞态](#a36-列表项退出动画与卸载竞态)
  - [A3.7 常见坑](#a37-常见坑)
  - [⚠️ 分水岭警示（原文：这是初级与高级组件代码最显眼的分水岭）](#️-分水岭警示原文这是初级与高级组件代码最显眼的分水岭)
- [A4. 焦点管理](#a4-焦点管理)
  - [A4.1 为什么焦点是弹层组件的一等公民](#a41-为什么焦点是弹层组件的一等公民)
  - [A4.2 焦点陷阱完整实现](#a42-焦点陷阱完整实现)
  - [A4.3 打开记住触发元素，关闭还回](#a43-打开记住触发元素关闭还回)
  - [A4.4 roving tabindex 完整实现](#a44-roving-tabindex-完整实现)
  - [A4.5 :focus-visible 与 :focus 的区别](#a45-focus-visible-与-focus-的区别)
  - [A4.6 常见坑](#a46-常见坑)
- [A5. 键盘导航与 ARIA](#a5-键盘导航与-aria)
  - [A5.1 WAI-ARIA APG 的地位与查阅方式](#a51-wai-aria-apg-的地位与查阅方式)
  - [A5.2 必背模式对照表](#a52-必背模式对照表)
  - [A5.3 typeahead：连按字母匹配](#a53-typeahead连按字母匹配)
  - [A5.4 aria-live：给读屏的"画外音"](#a54-aria-live给读屏的画外音)
  - [A5.5 常见坑](#a55-常见坑)
- [A6. 事件边界](#a6-事件边界)
  - [A6.1 React 17+ 事件委托机制图解](#a61-react-17-事件委托机制图解)
  - [A6.2 原生 document 监听与 React 事件的执行顺序](#a62-原生-document-监听与-react-事件的执行顺序)
  - [A6.3 capture 阶段拦截：编辑器画布与弹层互斥](#a63-capture-阶段拦截编辑器画布与弹层互斥)
  - [A6.4 passive listener：wheel/touch 的性能约定](#a64-passive-listenerwheeltouch-的性能约定)
  - [A6.5 常见坑](#a65-常见坑)
- [A7. SSR 与环境兼容](#a7-ssr-与环境兼容)
  - [A7.1 useId：hydration 安全的唯一 id 生成器](#a71-useidhydration-安全的唯一-id-生成器)
  - [A7.2 useIsomorphicLayoutEffect](#a72-useisomorphiclayouteffect)
  - [A7.3 window/document 守卫模式](#a73-windowdocument-守卫模式)
  - [A7.4 hydration mismatch 的典型来源与修复](#a74-hydration-mismatch-的典型来源与修复)
  - [A7.5 常见坑](#a75-常见坑)
- [A8. ref 体系与 API 生态](#a8-ref-体系与-api-生态)
  - [A8.1 forwardRef 透传模板与 React 19 对照](#a81-forwardref-透传模板与-react-19-对照)
  - [A8.2 DOM ref vs 实例方法：useImperativeHandle](#a82-dom-ref-vs-实例方法useimperativehandle)
  - [A8.3 props 合并纪律](#a83-props-合并纪律)
  - [A8.4 泛型组件与 ComponentProps 类型工具](#a84-泛型组件与-componentprops-类型工具)
  - [A8.5 常见坑](#a85-常见坑)
- [A9. 样式与主题方案选型](#a9-样式与主题方案选型)
  - [A9.1 四条路线对比](#a91-四条路线对比)
  - [A9.2 ConfigProvider 注入 token 的机制](#a92-configprovider-注入-token-的机制)
  - [A9.3 暗色主题：变量切换与防白闪](#a93-暗色主题变量切换与防白闪)
  - [A9.4 样式按需加载与 sideEffects](#a94-样式按需加载与-sideeffects)
  - [A9.5 常见坑](#a95-常见坑)
- [Lv1 基础组件（打地基，练细节功力）](#lv1-基础组件打地基练细节功力)
  - [Lv1-1 Button：把最常用的组件做到无可挑剔](#lv1-1-button把最常用的组件做到无可挑剔)
  - [Lv1-2 Icon：SVG 组件化与按需加载](#lv1-2-iconsvg-组件化与按需加载)
  - [Lv1-3 Typography：省略与"溢出才显示 Tooltip"](#lv1-3-typography省略与溢出才显示-tooltip)
  - [Lv1-4 Grid / Space / Divider：响应式 gutter 的 token 化设计](#lv1-4-grid--space--divider响应式-gutter-的-token-化设计)
  - [展开：为什么说"Lv1 考的不是难，是细节洁癖"](#展开为什么说lv1-考的不是难是细节洁癖)
- [Lv2 弹层与反馈组件（功力主考场之一）](#lv2-弹层与反馈组件功力主考场之一)
  - [Modal（★★★）](#modal)
  - [Toast / Message（★★★）](#toast--message)
  - [Tooltip（★★☆）](#tooltip)
  - [Drawer / Popover / Popconfirm / Notification](#drawer--popover--popconfirm--notification)
  - [Avatar / Badge / Tag](#avatar--badge--tag)
- [Lv3 复杂交互组件（公认最考功力）](#lv3-复杂交互组件公认最考功力)
  - [Select（★★★★）——键盘+a11y+长列表三合一考题](#select键盘a11y长列表三合一考题)
  - [DatePicker（★★★★★）——日历是最苦的组件](#datepicker日历是最苦的组件)
  - [Table（★★★★）——中后台之王](#table中后台之王)
  - [Tabs（★★★）](#tabs)
  - [Collapse（★★☆）](#collapse)
  - [Tree（★★★★）](#tree)
  - [Cascader / TreeSelect / Transfer（★★★☆）](#cascader--treeselect--transfer)
  - [Upload（★★★★）](#upload)
  - [Carousel / Slider / Rate / ColorPicker（★★★）](#carousel--slider--rate--colorpicker)
  - [水印 Watermark（★★☆，攻防趣味题）](#水印-watermark攻防趣味题)
  - [VirtualList / Anchor / Progress 等（★★☆）](#virtuallist--anchor--progress-等)
  - [ConfigProvider / App（模式级）](#configprovider--app模式级)
- [Lv4 范式之争（组件之上的认知）](#lv4-范式之争组件之上的认知)
- [C1. 仓库：pnpm monorepo（components / hooks / token / utils 分包），turbo 任务编排](#c1-仓库pnpm-monorepocomponents--hooks--token--utils-分包turbo-任务编排)
  - [是什么](#是什么)
  - [为什么需要](#为什么需要)
  - [怎么做：目录树与依赖关系](#怎么做目录树与依赖关系)
  - [配置示例](#配置示例)
  - [常见坑](#常见坑)
- [C2. 构建：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）](#c2-构建tsupfatherunbuildesmcjs-双产物dts-类型sideeffects-精确声明按需加载的命门)
  - [构建器选型：三个工具的定位差异](#构建器选型三个工具的定位差异)
  - [是什么：构建要交付什么](#是什么构建要交付什么)
  - [怎么做：tsup 配置完整示例](#怎么做tsup-配置完整示例)
  - [`sideEffects`：按需加载的命门（本节按第一性原理完整走一遍）](#sideeffects按需加载的命门本节按第一性原理完整走一遍)
  - [常见坑](#常见坑-0)
- [C3. 文档：Storybook/dumi，MDX 用例即文档；视觉回归（Chromatic/Lost Pixel）；a11y 检查（axe 插件）](#c3-文档storybookdumimdx-用例即文档视觉回归chromaticlost-pixela11y-检查axe-插件)
  - [是什么：文档站的两个流派](#是什么文档站的两个流派)
  - [为什么 dumi 在国内组件库场景流行](#为什么-dumi-在国内组件库场景流行)
  - [怎么做：MDX 用例即文档](#怎么做mdx-用例即文档)
  - [视觉回归：原理与流程](#视觉回归原理与流程)
  - [a11y 检查：@storybook/addon-a11y 跑 axe](#a11y-检查storybookaddon-a11y-跑-axe)
  - [常见坑](#常见坑-1)
- [C4. 测试：Vitest + Testing Library 逐组件；Storybook play function 交互测试](#c4-测试vitest--testing-library-逐组件storybook-play-function-交互测试)
  - [是什么：组件库的测试分层](#是什么组件库的测试分层)
  - [为什么需要"逐组件"](#为什么需要逐组件)
  - [怎么做：Vitest 配置与组件测试](#怎么做vitest-配置与组件测试)
  - [Storybook play function：用例即测试](#storybook-play-function用例即测试)
  - [常见坑](#常见坑-2)
- [C5. 版本：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）](#c5-版本changesets-自动-changelogsemver-纪律大版本迁移配-codemodjscodeshift)
  - [是什么：changesets 工作流](#是什么changesets-工作流)
  - [为什么需要](#为什么需要-0)
  - [怎么做：完整工作流（五步）](#怎么做完整工作流五步)
  - [codemod：把迁移指南变成一条命令](#codemod把迁移指南变成一条命令)
  - [常见坑](#常见坑-3)
- [C6. 兼容：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测](#c6-兼容browserslist-矩阵ssr-hydrate-冒烟测试react-1819-双版本跑测)
  - [是什么](#是什么-0)
  - [browserslist 矩阵：声明与影响](#browserslist-矩阵声明与影响)
  - [SSR hydrate 冒烟测试：最小实现](#ssr-hydrate-冒烟测试最小实现)
  - [React 18/19 双版本跑测：peerDependencies 与 CI 矩阵](#react-1819-双版本跑测peerdependencies-与-ci-矩阵)
  - [常见坑](#常见坑-4)
  - [第 1–2 周（Part A 内功 + Lv1）验收要点](#第-12-周part-a-内功--lv1验收要点)
  - [第 3–4 周（Lv2 弹层四件套）验收要点](#第-34-周lv2-弹层四件套验收要点)
  - [第 5–8 周（Lv3 核心五件）验收要点](#第-58-周lv3-核心五件验收要点)
  - [第 9 周（Part C 工程化）验收要点](#第-9-周part-c-工程化验收要点)
- [1. **Radix UI**：无样式组件的行为/无障碍实现，每个组件几百行，最易吸收](#1-radix-ui无样式组件的行为无障碍实现每个组件几百行最易吸收)
- [2. **antd**：工程化与细节功力（Wave 波纹、两个汉字空格、Watermark 攻防、Tree 三态）](#2-antd工程化与细节功力wave-波纹两个汉字空格watermark-攻防tree-三态)
- [3. shadcn/ui：cva 变体管理与现代形态](#3-shadcnuicva-变体管理与现代形态)
- [4. WAI-ARIA Authoring Practices：所有键盘/ARIA 行为的唯一权威](#4-wai-aria-authoring-practices所有键盘aria-行为的唯一权威)

---


## 引言：这份大纲在六份文档里的位置

《[react-学习大纲.md](react-学习大纲.md)》阶段 3 已经让你手写过一套迷你组件库（Button / Modal / Tabs / Select / Input），练的是**组件设计模式**：受控与非受控、组合优于配置、compound components、render props、泛型组件。那一份的产出是"能用的 demo"；本篇要补的是另一半——**"能发布的库"**。两者差别在哪？demo 只需在你自己的浏览器、你自己的样式体系、你自己的交互习惯下成立；库必须同时满足：

- **任意调用方**：受控也行、非受控也行，传 ref 也行、取实例方法也行；
- **任意环境**：SSR 能水合、暗色主题能切、React 18 和 19 都能跑；
- **任意位置**：组件被放进滚动容器、带 transform 的动画容器、嵌套弹层里，行为仍然正确。

把这三条"任意"逐条落地，就得到了 Part A 的九项通用内功。它们不是九个孤立技巧，而是所有复杂组件共享的地基：Select 的键盘导航、Modal 的退出动画、Tooltip 的定位翻转，背后用的是同一批 hook 与同一种思维——**把"用户的一次交互"拆解成状态机的确定转移，而不是一串 if-else 的即兴反应**。

**怎么读本篇**：Part A（本片段）按 A1–A9 顺序讲九项内功，每项都遵循"是什么 → 为什么需要 → 怎么做（机制分步）→ 代码示例 → 常见坑（症状→根因→修法）"。Part B 把这九项内功组合成分级组件清单（Lv1 基础 → Lv4 范式之争），Part C 讲 monorepo / 构建 / 发布。如果你是从 Part B 被某个组件的考点卡住而跳回来看的，直接定位对应小节即可：受控双模式看 A1，一切弹层问题看 A2+A3，键盘与读屏看 A4+A5。

**练习环境**（后续所有代码在同一工程中可运行）：

```bash
npm create vite@latest my-ui -- --template react-ts
cd my-ui
npm i @floating-ui/react clsx tailwind-merge
npm i -D @types/react
```

示例同时兼容 React 18 与 19；涉及两者差异处（ref 透传、useId 格式）会并列给出对照写法。

---

# Part A：通用内功（组件库的地基，先练这个）

九项内功与 Part B 组件清单的对应关系（先建立"练它为了什么"的地图）：

| 内功 | 服务于哪些组件 | 不练它的直接后果 |
|---|---|---|
| A1 受控/非受控 | Input/Switch/Select/DatePicker 一切带值组件 | 表单里值不同步、回显丢失 |
| A2 弹层体系 | Popover/Select/Tooltip/DatePicker/Modal 定位 | 弹层在视口边缘被裁、滚动时不跟、层级错乱 |
| A3 退出动画 | Modal/Drawer/Toast/Tag 一切会消失的组件 | 关闭瞬间闪没，廉价感明显 |
| A4 焦点管理 | Modal/Tabs/Radio/Menu | 键盘用户被锁死或焦点丢失 |
| A5 键盘与 ARIA | 全部交互组件 | 读屏用户完全不可用，验收被一票否决 |
| A6 事件边界 | 画布编辑器/弹层互斥/滚动锁定 | 原生与 React 监听互相打架 |
| A7 SSR 兼容 | 全部组件 | Next.js 接入即 hydration 报错 |
| A8 ref 体系 | 全部组件 | 消费方拿不到 DOM、类型推导断裂 |
| A9 样式与主题 | 全部组件 | 主题切不动、按需加载失效、包体积爆炸 |

依赖关系大致是：A1 与 A8 是一切组件的 API 面子；A2+A3 构成弹层类组件的身子；A4+A5 是可访问性的里子；A6/A7 是环境的边界的补；A9 决定发布形态。建议按编号顺序练，每项都动手跑通代码再往下走。

---

## A1. 受控/非受控双模式（30 行 hook，处处要用）

- 原理：外部传 `value` 则受控（内部不存状态），否则用内部 state；`onChange` 永远回调
- 坑：受控↔非受控切换警告；`defaultValue` 只能消费一次（惰性初始化）；受控组件不回显的 bug

### A1.1 是什么：状态所有权的两种形态

"受控/非受控"描述的是**组件值的所有权归谁**：

- **受控（controlled）**：调用方传 `value`，组件只是展示。值变不变完全由外部 state 决定，用户输入只通过 `onChange` 上报，组件自己无权改值。这是"状态提升"在组件库场景的化身。
- **非受控（uncontrolled）**：调用方最多传 `defaultValue` 作为初值，之后值归组件内部 state 所有，外部想读只能拿 ref。

一个合格的库组件必须**同时支持两种形态**：`<Input defaultValue="a" />` 在纯展示页直接可用；同一个 `<Input value={form.name} onChange={...} />` 在受控表单里也行为正确。判定规则只有一条：**`value !== undefined` 即受控**（对 boolean 组件同理，`checked !== undefined`）。

### A1.2 为什么需要：三种调用场景缺一不可

1. **原型/静态页**：调用方懒得建 state，传个 `defaultValue` 就走，非受控是最低成本路径。
2. **表单与联动**：输入框 A 联动清空输入框 B、提交前校验取值——值必须住在表单 store（或 `useForm`）里，受控是唯一选择。
3. **受控切换成本**：如果库只支持受控，第 1 类用户被迫写一堆 `useState`；只支持非受控，第 2 类用户拿不到值。所以 antd、Radix、Base UI 的做法一致：**双模式是默认 API 契约**，实现收敛到一个 hook 里，所有带值组件复用。

### A1.3 怎么做：useControllableState 完整实现

机制分四步：

1. **受控判定**：每次渲染算 `isControlled = value !== undefined`，渲染的是 `isControlled ? value : internalState`。
2. **惰性初始化**：内部 `useState(defaultValue)` 只在首次渲染消费 `defaultValue` 一次——这是 useState 的语义，也正是我们想要的行为（后续改 `defaultValue` 不影响现值）。
3. **写路径统一**：暴露一个 `setValue`。它先解析函数式更新得到新值；新旧值不同则**总是**回调 `onChange`（受控与否都回调，调用方靠它回写）；然后**仅非受控时**写内部 state（受控时内部不存，等 props 回流）。
4. **模式切换检测**：用 ref 记住上一次是否受控，渲染期间发现切换就 `console.warn`。这种切换是契约违反：非受控切受控，内部 state 瞬间作废；受控切非受控，值会"跳"回陈旧的内部 state。

完整代码：

```tsx
// useControllableState.ts
import * as React from 'react';

/** 更新动作：直接给值，或基于上一个值计算（对齐 useState 的函数式更新） */
export type SetStateAction<T> = T | ((prev: T | undefined) => T);

export interface UseControllableStateParams<T> {
  /** 受控值：传了（!== undefined）即为受控模式 */
  value?: T;
  /** 非受控初值：只在首次渲染消费一次 */
  defaultValue?: T;
  /** 值变化回调：受控与非受控模式下都会触发 */
  onChange?: (value: T) => void;
}

export function useControllableState<T>(
  params: UseControllableStateParams<T>
): [T | undefined, (action: SetStateAction<T>) => void] {
  const { value: valueProp, defaultValue, onChange } = params;

  // ── 步骤 1：受控判定 ─────────────────────────────────────────
  const isControlled = valueProp !== undefined;

  // ── 步骤 4：受控↔非受控切换警告（渲染期间比较上一次模式）────
  const wasControlledRef = React.useRef<boolean | null>(null);
  if (
    wasControlledRef.current !== null &&
    wasControlledRef.current !== isControlled
  ) {
    console.warn(
      `[useControllableState] 组件在受控与非受控之间切换（${wasControlledRef.current ? '受控→非受控' : '非受控→受控'}）。` +
        `这会导致值跳变。请保证 value 要么一直传、要么一直不传。`
    );
  }
  wasControlledRef.current = isControlled;

  // ── 步骤 2：内部 state，defaultValue 惰性消费一次 ─────────────
  const [internalState, setInternalState] = React.useState<T | undefined>(defaultValue);

  // 内部 state 的最新值镜像（供下面的稳定 setter 读，避免闭包过期）
  const internalStateRef = React.useRef<T | undefined>(internalState);
  internalStateRef.current = internalState;

  // 用 ref 保存"最新的一切"，让下面的 setter 可以稳定引用（不随渲染重建）
  const isControlledRef = React.useRef(isControlled);
  isControlledRef.current = isControlled;
  const valueRef = React.useRef<T | undefined>(valueProp);
  valueRef.current = valueProp;
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange; // 回调永远指向最新一次渲染传入的函数
  }, [onChange]);

  // 渲染用的值：受控取 props，非受控取内部
  const value = isControlled ? valueProp : internalState;

  // ── 步骤 3：统一的写路径 ─────────────────────────────────────
  const setValue = React.useCallback((action: SetStateAction<T>) => {
    const prev = isControlledRef.current
      ? valueRef.current                    // 受控：基准是外部最新值
      : internalStateRef.current;           // 非受控：基准是内部最新值
    const next =
      typeof action === 'function'
        ? (action as (p: T | undefined) => T)(prev)
        : action;

    if (!Object.is(next, prev)) {
      onChangeRef.current?.(next);          // onChange 永远回调（受控与否无关）
    }
    if (!isControlledRef.current) {
      setInternalState(next);               // 只有非受控才写内部状态
    }
  }, []);

  return [value, setValue];
}
```

三个容易被问的实现细节：

- **为什么 `onChange` 在新旧值相同（`Object.is` 相等）时不回调**：避免调用方 `setState(同值)` 触发无意义的重渲染链；这也是 React 自身 `useState` 的 bail-out 语义。
- **为什么要 `internalStateRef` 镜像**：`setValue` 被缓存成了稳定引用（`useCallback` 空依赖），闭包里的 `internalState` 会过期；受控基准走 `valueRef` 同理。
- **警告为什么写在渲染期间而不是 effect**：切换发生在渲染时，effect 里警告会晚一拍且在并发渲染下可能不触发；渲染期间 `console.warn` 是安全的（不产生副作用语义冲突）。

### A1.4 三个双模式组件：Switch / Input / Select

**Switch**（boolean 值，考点：点击后 UI 是否翻转取决于谁）：

```tsx
// Switch.tsx
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useControllableState } from './useControllableState';

export interface SwitchProps {
  checked?: boolean;                            // 受控：传了它就是受控模式
  defaultChecked?: boolean;                     // 非受控初值
  onCheckedChange?: (checked: boolean) => void; // 命名对齐 WAI-ARIA 的 switch 模式
  disabled?: boolean;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ checked, defaultChecked = false, onCheckedChange, disabled, className }, ref) {
    const [state, setState] = useControllableState<boolean>({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    return (
      <button
        ref={ref}
        type="button"                       // 防止在 form 里被当成 submit 触发器
        role="switch"                       // ARIA switch 语义（详见 A5）
        aria-checked={state ?? false}
        aria-disabled={disabled}
        disabled={disabled}
        className={className}
        onClick={() => setState((prev) => !prev)} // 点击只"上报意图"：受控时 UI 动不动看 props
      >
        <span className="switch-thumb" />
      </button>
    );
  }
);
```

**Input**（string 值，考点：`defaultValue` 只消费一次）：

原生 `<input>` 的 `value` 类型是 `string | ReadonlyArray<string> | number | undefined`，`onChange` 是完整事件对象。库组件不想要这么宽的签名——受控判定要的是干净的 `string | undefined`，业务方九成只关心值。所以先用 `Omit` 把值三件套从原生 props 里剔除，再按库的语义重新声明：

```tsx
// Input.tsx
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useControllableState } from './useControllableState';

export interface InputProps
  extends Omit<
    React.ComponentPropsWithoutRef<'input'>,
    'value' | 'defaultValue' | 'onChange'
  > {
  value?: string;   // 显式收回并收窄：受控判定只认 string | undefined
  defaultValue?: string;
  onValueChange?: (value: string) => void;               // 值回调：业务最常用的形态
  onChange?: React.ChangeEventHandler<HTMLInputElement>;  // 原生事件回调保留给高级用法
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ value, defaultValue, onValueChange, onChange, ...rest }, ref) {
    const [state, setState] = useControllableState<string>({
      value,
      defaultValue,
      onChange: onValueChange,
    });
    return (
      <input
        ref={ref}
        value={state ?? ''}
        onChange={(e) => {
          setState(e.currentTarget.value); // 统一走双模式写路径：受控与非受控都在这里分叉
          onChange?.(e);                    // 原生事件仍透传（A8 的 props 合并纪律）
        }}
        {...rest}
      />
    );
  }
);
```

这个"Omit + 重新声明"的纪律不只为类型好看：如果放任原生 `value` 混进 `rest` 再 `{...rest}` 展开，组件会在 JSX 里同时写 `value={state}` 和 `rest` 里的 `value`，展开顺序一旦颠倒，受控判定整个失效——这也是 antd 的 Input 选 `onChange: (e) => void`、而新一代库（Radix 系）选 `onValueChange` 这类收敛式签名的原因：**库的 props 协议必须是显式的，不能靠继承来的宽类型蒙混**。

**Select**（考点：一个组件里有两个受控维度——`value` 与 `open` 各自独立双模式）：

```tsx
// MiniSelect.tsx
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useControllableState } from './useControllableState';

export interface SelectOption { value: string; label: string }

export interface MiniSelectProps {
  options: SelectOption[];
  value?: string;                      // 维度一：选中值
  defaultValue?: string;
  onChange?: (value: string) => void;
  open?: boolean;                      // 维度二：展开状态（也允许受控！）
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MiniSelect = React.forwardRef<HTMLButtonElement, MiniSelectProps>(
  function MiniSelect(props, ref) {
    const { options, value, defaultValue, onChange, open, defaultOpen, onOpenChange } = props;

    // 两套双模式互不干扰：父组件可以只受控 value、放开 open
    const [selected, setSelected] = useControllableState<string>({
      value, defaultValue, onChange,
    });
    const [isOpen, setOpen] = useControllableState<boolean>({
      value: open, defaultValue: defaultOpen, onChange: onOpenChange,
    });

    return (
      <div className="mini-select">
        <button
          ref={ref}
          type="button"
          aria-haspopup="listbox"                 // 触发器语义（A5 详述）
          aria-expanded={isOpen ?? false}
          onClick={() => setOpen((prev) => !prev)}
        >
          {options.find((o) => o.value === selected)?.label ?? '请选择'}
        </button>
        {isOpen && (
          <ul role="listbox" className="mini-select__list">
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === selected}
                onClick={() => {
                  setSelected(opt.value);
                  setOpen(false);               // 选中后收起（受控 open 时只是上报）
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
```

**验证矩阵**（写完三个组件后逐行手测，这是 A1 的验收标准）：

| 操作 | 非受控（只传 default*） | 受控（传 value + onChange） |
|---|---|---|
| 点击 Switch / 输入 Input | UI 立即变化，`onChange` 回调 | **UI 不动**，只有 `onChange` 回调；父组件回写 value 后才动 |
| 外部异步把 `value` 改为 'x' | 无该 props，无效果 | UI 同步为 'x' |
| 挂载后再改 `defaultValue` | **无效果**（惰性消费一次） | — |
| 先传 `value` 后移除该 prop | 控制台切换警告，退回内部 state | — |
| Select 只受控 `open` 不受控 `value` | — | 展开收起由父管，选中值自由 |

### A1.5 受控不回显的 bug 复现

症状：受控模式下输入框打字无反应、Switch 点不动，控制台可能伴随 React 警告。两个复现：

```tsx
// 复现一：调用方的 bug —— 传了 value 却不处理变化
function FrozenInput() {
  const [value, setValue] = React.useState('初始');
  return <input value={value} onChange={(e) => {
    // 忘了 setValue：受控值永远不变 → 输入无反应（React 还会警告 value 无 onChange 处理）
    console.log('用户想输入', e.target.value);
  }} />;
}

// 复现二：组件库的 bug —— 受控时仍把值写进内部 state，渲染却信内部 state
function BuggySwitch({ checked, defaultChecked }: { checked?: boolean; defaultChecked?: boolean }) {
  // 错误：渲染基准永远是内部 state → 外部受控 value 变了 UI 不跟（脱钩）
  const [internal, setInternal] = React.useState(defaultChecked);
  return (
    <button type="button" role="switch" aria-checked={internal}
      onClick={() => setInternal(!internal)}>
      {String(internal)}
    </button>
  );
}
```

复现一是**受控语义的正确表现**（父不回写，UI 就该不动）——修法在调用方：`setValue(e.target.value)`。复现二是**组件实现错误**——修法即 A1.3 的 hook：渲染基准 = `isControlled ? valueProp : internalState`，两者取其一，永不同时信两个来源。

### A1.6 常见坑

1. **`value !== undefined` vs `'value' in props`**。症状：调用方写 `<Input value={cond ? text : undefined} />`，条件翻转时组件在受控/非受控间横跳并触发警告。根因：`undefined` 被当成"没传"。修法：契约上明确"不传就不受控"，调用方应整体不传 props（用条件展开 `{...(cond ? { value: text } : {})}`）；库侧保持 `!== undefined` 判定即可。
2. **`defaultValue` 传了 `null`**。症状：`useState(null)` 后 `value ?? ''` 渲染为空但类型上是 null，后续逻辑按 string 处理崩掉。根因：API 类型没收窄。修法：props 类型只允许 `undefined`（不写 `| null`）；需要"清空"语义时走显式的 `allowClear`/`reset()`（A8 的实例方法）。
3. **受控 + `useState` 镜像双写**。症状：输入偶发"吞字"或回退一个字符（中文输入法组合期间尤其明显）。根因：组件内部 `useEffect(() => setInternal(value), [value])` 做了受控镜像 + 组合输入（`compositionstart/end`）期间强制回写 DOM。修法：删掉镜像 state，非受控就完全交给 `useState`，受控就完全交给 props——同一个值的来源必须唯一。

### ✍️ 动手练习（原文：实现 `useControllableState`，并写 Switch/Input/Select 三个双模式组件验证）

展开为四步验收：

1. 不看本节，徒手实现 `useControllableState`，跑通 A1.4 验证矩阵前两行；
2. 给 Switch 补上键盘（原生 button 自带 Space/Enter 触发 click，验证 disabled 时键盘也无效）；
3. 给 MiniSelect 实现"只受控 open"：父组件用 state 驱动展开、点击选项选中值仍走内部；
4. 故意删掉 `setValue` 里的 `isControlledRef` 判断（受控也写内部 state），观察 A1.5 复现二的脱钩 bug 重现，再改回来。能解释"为什么删这一行就坏"，才算过关。

---

## A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）

- **floating-ui**：定位计算 + flip/shift/size 中间件；为什么不要自己写定位
- Portal 挂载点与 z-index 治理（多级弹层的层级管理器）
- hover 意图延时（进 100ms 出 300ms）、级联菜单 hover 链保持
- 滚动/resize 时跟随重定位；`useClickOutside`（mousedown 阶段、忽略触发元素、多弹层嵌套豁免）

### A2.1 弹层的四个公共难题

Popover、Select 下拉、Tooltip、DatePicker 面板，长得不同，底层是同一道题：**把一块 UI 放到"另一个元素旁边"，并且在整个生命周期里保持正确**。拆开是四件事：

1. **定位**：初始放在哪（placement × 对齐）；
2. **边界**：视口/滚动容器放不下怎么办（翻转/平移/限高）；
3. **层级与挂载**：怎么不被父级 `overflow: hidden` 裁掉、不被别的元素盖住、z-index 谁高谁低；
4. **时序**：什么时候开（hover 意图）、什么时候关（点外/Esc/滚动）、开了以后怎么跟随（滚动/resize 重算）。

floating-ui 解决 1、2 和 4 的重算部分；Portal 与层级管理器解决 3；意图延时与 click outside 解决 4 的其余部分。逐个来。

### A2.2 computePosition 与中间件机制

**是什么**：floating-ui（前身 Popper.js）把"定位"抽象成一个纯函数：输入参考元素与浮动元素的几何信息，输出浮动元素的 x/y 坐标。`@floating-ui/dom` 包提供底层 `computePosition`，所有上层 API（React hooks、Vue 适配）都构建在它之上。

**中间件机制分步**：

1. 按当前 `placement`（如 `bottom-start`）计算初始坐标：参考元素的哪条边 + 起始/居中/末尾对齐，加上边距；
2. 把坐标依次传给 middleware 链。每个中间件拿到一份状态（含双方 `rects`、当前坐标、当前 placement、`middlewareData`），可以**改坐标、改 placement，或要求 reset 重跑**；
3. 每个中间件的产出写进 `middlewareData.[name]`，后面的中间件与调用方都能读；
4. 全链跑完返回 `{ x, y, placement, middlewareData }`——`placement` 可能与传入不同（被 flip 改过），UI 箭头要跟着它调整。

常用中间件职责表（顺序敏感，通常 offset → flip → shift → size）：

| 中间件 | 职责 | 典型用法 |
|---|---|---|
| `offset(n)` | 沿主轴加间距（弹层与触发器的间隙） | Tooltip 离触发器 6px |
| `flip()` | 当前 placement 溢出时换边（可配 `fallbackPlacements` 候选序） | 底部放不下翻到顶部 |
| `shift()` | 沿轴平移让浮动元素回到边界内（`padding` 留边距，可配 limiter） | 视口左右边缘左右滑移 |
| `size()` | 把可用空间/参考元素尺寸喂给回调，由你设置宽高 | Select 下拉与触发器同宽、最大高度不超过可用空间 |
| `inline()` | 参考元素是行内文本跨行时按光标所在行矩形定位 | 富文本里给某个词加 popover |
| `hide()` | 检测被裁剪/参考元素滚出视口时给出标记，由你隐藏 | Tooltip 跟随元素滚走后消失 |

**手动接入的完整代码**（不用任何 React hook，看清它本质是个几何函数）：

```tsx
// manual-position.ts
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

export function attachFloating(
  trigger: HTMLElement,
  popup: HTMLElement,
  onDetach: (cleanup: () => void) => void
) {
  const update = () => {
    computePosition(trigger, popup, {
      placement: 'bottom-start',
      strategy: 'fixed', // fixed + Portal 挂 body：祖先 overflow/transform 都裁不到（见 A2.5）
      middleware: [
        offset(4),                  // 与触发器空开 4px
        flip({ fallbackPlacements: ['top-start', 'right'] }), // 底部不行翻顶部，再不行转右侧
        shift({ padding: 8 }),      // 左右溢出时平移回来，视口留 8px 呼吸边距
      ],
    }).then(({ x, y }) => {
      // left/top 固定 0，用 transform 移动：走合成器，不触发布局重排
      Object.assign(popup.style, {
        left: '0',
        top: '0',
        transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`, // 取整防亚像素模糊
      });
    });
  };

  // autoUpdate：挂载期间持续调用 update（职责详见 A2.8）
  onDetach(autoUpdate(trigger, popup, update));
}

// 用法示例（命令式风格）：
//   const stop = { fn: () => {} };                      // 先准备清理函数容器
//   attachFloating(triggerEl, popupEl, (cleanup) => { stop.fn = cleanup; });
//   popup.classList.add('my-popup');                    // .my-popup 需有 CSS：position: fixed;
//   // 组件卸载时：stop.fn();   // 停掉滚动/resize 监听
```

### A2.3 useFloating 最小接入

React 侧用 `@floating-ui/react` 包（它依赖 `@floating-ui/react-dom`，后者才是 hooks 层；装 `@floating-ui/react` 即全量）。它把 A2.2 的命令式过程包成 refs + styles + 交互 props：

```tsx
// Popover.tsx —— 最小可用的受控 Popover
import * as React from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate, // 关键一行：挂载期间自动重定位（滚动/resize/尺寸变化）
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });

  // 交互行为也是可组合的"中间件"：点击开合、Esc/点外关闭、dialog 语义
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <button ref={refs.setReference} {...getReferenceProps({ onClick: () => setOpen((v) => !v) })}>
        打开弹层
      </button>
      {open && (
        <FloatingPortal> {/* Portal 到 body，躲开祖先裁剪与 z-index（A2.5） */}
          <div
            ref={refs.setFloating}
            style={floatingStyles}   // 已含 position: fixed + transform 定位
            className="popover"
            {...getFloatingProps()}
          >
            {children}
            <button onClick={() => setOpen(false)}>关闭</button>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
```

`refs.setReference` / `refs.setFloating` 是 callback ref，把两个真实 DOM 交给 floating-ui；`floatingStyles` 是算好的定位样式对象。Select 下拉要加 `size` 中间件：

```ts
import { size } from '@floating-ui/dom'; // @floating-ui/react 同名再导出，二选一导入即可

middleware: [
  offset(4),
  flip(),
  shift({ padding: 8 }),
  size({
    padding: 8,
    apply({ rects, elements, availableHeight }) {
      // 宽度跟随触发器；最大高度不超过当前可用空间（选项多时内部滚动）
      Object.assign(elements.floating.style, {
        width: `${rects.reference.width}px`,
        maxHeight: `${Math.max(availableHeight, 160)}px`,
        overflowY: 'auto',
      });
    },
  }),
],
```

### A2.4 为什么不要自己写定位

"自己写个 `getBoundingClientRect` 相加减去 scrollTop 不就行了"——三周后必然在这个清单上阵亡（穷举）：

1. **视口边缘翻转**：你要同时处理 12 种 placement 的四边溢出判定、候选回退顺序、翻转后与 offset 的合成、交叉轴 start/end 对齐（RTL 下还要镜像）。手写版通常只覆盖"下方放不下翻上方"一种，用户把触发器拖到视口右下角时横轴溢出没人管——Select 下拉最后一项直接看不见。`flip` 的溢出判定还要区分"溢出多少以内可接受"（padding）与"完全放不下转 fallback"，这是经验参数的集合。
2. **滚动跟随**：弹层开着的时候页面滚了，`fixed` 元素不会自己动。你要监听所有能让参考元素移动的东西：window scroll、resize、每个滚动容器的 scroll。致命细节：**`scroll` 事件不冒泡**（只有 document 自身滚动会派发到 document），挂在 window 上的冒泡监听收不到内层 `div overflow: auto` 的滚动，必须 `addEventListener('scroll', fn, true)` 走捕获，或者递归遍历祖先逐个挂。`autoUpdate` 的第一职责就是这层捕获监听。
3. **嵌套滚动容器与包含块陷阱**：祖先链上可能有多个 `overflow: auto/hidden`（每个都可能裁剪或滚动）；更阴的是祖先带 `transform / filter / will-change / contain` 时，`position: fixed` 的包含块会从视口变成该祖先——"弹层在带进出场动画的容器里位置乱飘"的经典 bug 就是它。floating-ui 会检测 clipping ancestors 并在计算中处理；自己写大概率连发现这问题都要靠用户工单。
4. 附赠两个小鬼：**亚像素取整**（坐标小数导致文字模糊，所以要 `Math.round`）；**iframe 边界**（组件被嵌进 iframe 时"视口"该算哪个）。

结论：定位计算的边界情况数量远超业务组件本身，这是"用轮子"比"造轮子"收益最大的地方，没有之一。

### A2.5 Portal 挂载点治理

**为什么必须 Portal**：弹层若留在原 DOM 位置，会被祖先的 `overflow: hidden` 裁掉、被祖先的 `z-index` 上下文压住、被 `transform` 祖先劫持 fixed 定位。挂到 `document.body` 下的一孔，三个问题同时消失。

**挂载点不能写死成 body**，因为：全屏滚动的Modal里再开 Select，下拉应该跟着 Modal 的滚动容器（挂 body 会导致下拉不随 Modal 滚动）；局部主题容器（暗色区域）里的弹层要继承主题 class。所以库的标准做法是 **可配置的挂载容器**：antd 叫 `getPopupContainer`（可挂在 ConfigProvider 上全局统一），自建库用 context 提供默认值：

```tsx
// Portal.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';

const PortalContext = React.createContext<HTMLElement | null>(null); // 默认 null → 挂 body

export function PortalProvider({
  container,
  children,
}: {
  container: HTMLElement | (() => HTMLElement);
  children: React.ReactNode;
}) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    // 容器可能是延迟就绪的（比如某个 ref 指向的 div），effect 里再取
    setEl(typeof container === 'function' ? container() : container);
  }, [container]);
  return el ? <PortalContext.Provider value={el}>{children}</PortalContext.Provider> : <>{children}</>;
}

export function Portal({ children }: { children: React.ReactNode }) {
  const ctxContainer = React.useContext(PortalContext);
  const [host] = React.useState(() => {
    if (typeof document === 'undefined') return null; // SSR 守卫（A7）
    return document.createElement('div');             // 每个弹层一个宿主 div，卸载时连同移除
  });

  React.useEffect(() => {
    if (!host) return;
    (ctxContainer ?? document.body).appendChild(host);
    return () => { host.remove(); };                  // 卸载即清理，不留僵尸节点
  }, [host, ctxContainer]);

  return host ? createPortal(children, host) : null;
}
```

注意挂进自定义容器后，`strategy: 'fixed'` 可能失效（容器带 transform 时），此时应换 `strategy: 'absolute'` 并让 autoUpdate 继续跑——这也是"挂载点策略"与"定位策略"必须配套的原因。

### A2.6 z-index 治理：多级弹层层级管理器

**问题**：Modal（z-index 1000）里开 Select，Select 下拉也是 1000——同值时看 DOM 顺序，但两者都 Portal 到 body 下不同宿主 div，顺序不可控。写死"Select 1050、Tooltip 1070"（Bootstrap 的做法）在"Modal 里开 Modal 里再开 Popover"面前破产：第二个 Modal 的 z-index 无论如何配不过第一个 Modal 里的 Popover。

**思路**：全局计数器 + 栈。每打开一层弹层就入栈并领一个递增的 z-index（**后开的总在先开的上面**，符合直觉）；关闭时出栈并回收栈顶。嵌套弹层天然正确：父弹层开子弹层时子层后入栈所以更高。实现：

```tsx
// usePopupLayer.ts —— 弹层层级管理器
import * as React from 'react';

const BASE_Z_INDEX = 1000;        // 你的库的层级起点，避开业务常用值
const openLayers = new Set<number>(); // 当前打开的所有层的 z-index 集合
let top = BASE_Z_INDEX;           // 栈顶

function acquireZIndex(): number {
  top += 1;
  openLayers.add(top);
  return top;
}

function releaseZIndex(z: number): void {
  openLayers.delete(z);
  // 栈空则归零；否则回到剩余层的最大值，防止计数器只增不减
  top = openLayers.size === 0 ? BASE_Z_INDEX : Math.max(...openLayers);
}

/** 弹层打开时领号，关闭时归还 */
export function usePopupLayer(open: boolean): number {
  const [zIndex, setZIndex] = React.useState(BASE_Z_INDEX);

  React.useEffect(() => {
    if (!open) return;
    const z = acquireZIndex(); // 打开时入栈：后开的总盖住先开的
    setZIndex(z);
    return () => {
      releaseZIndex(z);        // 关闭出栈（含卸载兜底）
      setZIndex(BASE_Z_INDEX);
    };
  }, [open]);

  return zIndex;
}
```

使用方式：弹层根元素 `style={{ zIndex }}`。antd v5 在此基础上做了工业化版本：按组件类型设基准（弹层类上下文 `useZIndex`），再在基准上自增，保证"Tooltip 永远比 Modal 高"这类产品级约定。另外一个零成本技巧：同一父节点下**后 append 的兄弟天然盖住先 append 的**（同 z-index 时），所以"打开时才 append 宿主 div"本身就自带一层排序——计数器是对跨宿主、跨容器场景的补全。

### A2.7 hover 意图延时与级联链保持

**为什么需要**：鼠标划过触发器去别处，路径上蹭到的每个 Tooltip 都会闪现——噪音。解法是**不对称延时**：进入要快（100ms，真想看的人等不起），离开要慢（300ms，给手滑的人反悔时间）。**级联菜单**（hover 展开子菜单）依赖同一个机制：从父菜单项斜着移到子菜单需要时间，300ms 的关闭宽限 + 子菜单自身 hover 即续命，构成"hover 链"。

完整 hook（进 100ms / 出 300ms，参考与弹层两侧都要挂事件）：

```tsx
// useHoverIntent.ts
import * as React from 'react';

export interface UseHoverIntentOptions {
  openDelay?: number;    // 进入延时，默认 100ms
  closeDelay?: number;   // 离开延时，默认 300ms
  onOpenChange: (open: boolean) => void;
}

export function useHoverIntent({
  openDelay = 100,
  closeDelay = 300,
  onOpenChange,
}: UseHoverIntentOptions) {
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange; // 回调永远用最新的
  }, [onOpenChange]);

  const clearBoth = React.useCallback(() => {
    if (openTimer.current !== null) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  React.useEffect(() => clearBoth, [clearBoth]); // 卸载清计时器（A3 之前最常见的泄漏源）

  return React.useMemo(() => ({
    // 挂在触发器上
    getReferenceProps: () => ({
      onPointerEnter: () => {
        // 进入触发器：先撤销"计划中的关闭"（hover 链续命的关键），再安排打开
        if (closeTimer.current !== null) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        if (openTimer.current === null) {
          openTimer.current = window.setTimeout(() => {
            openTimer.current = null;
            onOpenChangeRef.current(true);
          }, openDelay);
        }
      },
      onPointerLeave: () => {
        // 离开触发器：撤销"计划中的打开"，安排延迟关闭
        if (openTimer.current !== null) {
          window.clearTimeout(openTimer.current);
          openTimer.current = null;
        }
        if (closeTimer.current === null) {
          closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            onOpenChangeRef.current(false);
          }, closeDelay);
        }
      },
    }),
    // 挂在弹层本体上：进入弹层 = 取消关闭；离开弹层 = 再次安排关闭（链式菜单的子级续命）
    getFloatingProps: () => ({
      onPointerEnter: () => {
        if (closeTimer.current !== null) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
      },
      onPointerLeave: () => {
        if (closeTimer.current === null) {
          closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            onOpenChangeRef.current(false);
          }, closeDelay);
        }
      },
    }),
  }), [openDelay, closeDelay, clearBoth]);
}
```

要点：**进入先撤销关闭、离开先撤销打开**——两个计时器互为对偶，才不会出现"进了还关、出了还开"的抖动。300ms 宽限对斜向移动到子菜单经常不够（子菜单离得远时），floating-ui 给的彻底解法是 **safePolygon**：以鼠标当前位置和子菜单的两个近角构成三角形，指针在三角形内就视为"在路上"，整条链不关：

```tsx
// floating-ui 侧的等价能力（对照学习）
import { safePolygon } from '@floating-ui/react';
import { useHover } from '@floating-ui/react';

const hover = useHover(context, {
  delay: { open: 100, close: 300 }, // 与上面的手写参数一致
  handleClose: safePolygon(),       // 三角形安全区：斜着移动到子菜单不关
});
```

### A2.8 autoUpdate 的职责

弹层打开后世界还在动：页面滚动、窗口缩放、内容图片加载把参考元素挤走、弹层自身内容变化改变高度。`autoUpdate(reference, floating, update)` 在挂载期间持续触发 `update`，返回清理函数。它监听的东西：

1. **祖先滚动**：对参考元素的每个滚动祖先挂 `scroll` 监听（capture 阶段——因为 scroll 不冒泡，A2.4 讲过）；
2. **祖先与两元素自身的尺寸变化**：`ResizeObserver`（图片加载、字体切换、内容增删都会触发）；
3. **window resize**：视口变化重算（flip/shift 的结论可能整个反转）；
4. 可选 `animationFrame: true`：每帧重算（参考元素被 CSS animation 持续移动时的兜底，成本高，别默认开）。

React 侧就是 A2.3 里那行 `whileElementsMounted: autoUpdate`。它返回的清理函数会被 floating-ui 在卸载时调用，所以不会泄漏监听。

### A2.9 useClickOutside 的完整实现

**三个细节先讲清楚，再上代码**：

- **为什么 mousedown 而不是 click**：其一，click 的目标是 mousedown 与 mouseup 元素的共同祖先——在弹层里按下、拖到外面松手，click 会落在弹层外的元素上，纯 click 方案会把"拖选弹层内文本"误判为外部点击而关门；其二，mousedown 先于 focus/blur 与一切 click 逻辑发生，关门动作不会和"焦点已经移进去又被关掉"打架；其三，click 更容易被别的库 `preventDefault` 吞掉，mousedown 语义更底层、干扰更少。
- **忽略触发元素**：点触发器开弹层的那一下，如果同一事件既被触发器的 onClick 翻转 open、又被 clickOutside 关一次，就会开合打架。用 mousedown 方案后天然规避大半，但严谨实现仍要把触发元素纳入"不算外部"的判定（下面代码通过把触发器一并 contains 检查）。
- **多弹层嵌套豁免**：点子菜单（它也是一个注册过的弹层）不该把父弹层关掉——维护一个"当前打开弹层集合"，点击落在**任何**已注册弹层内就视为内部点击。

```tsx
// useClickOutside.ts
import * as React from 'react';

/** 全局：当前打开的所有弹层根节点（多弹层嵌套豁免的数据基础） */
const openLayers = new Set<HTMLElement>();

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: (event: MouseEvent) => void,
  enabled = true
) {
  const handlerRef = React.useRef(onOutside);
  React.useEffect(() => {
    handlerRef.current = onOutside; // 回调最新化，避免闭包过期
  }, [onOutside]);

  React.useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    openLayers.add(el); // 注册自己：其它层的豁免判定能看见我

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // ① 点在自己内部 → 不管
      if (el.contains(target)) return;
      // ② 点在其它已打开弹层内（子菜单/子弹层）→ 豁免：那是"那一层"的内部点击
      for (const layer of openLayers) {
        if (layer !== el && layer.contains(target)) return;
      }
      // ③ 真正的外部点击
      handlerRef.current(e);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      openLayers.delete(el); // 注销（StrictMode 双挂载/卸载也安全：Set 去重）
    };
  }, [enabled, ref]);
}
```

使用约定：`enabled` 与弹层挂载同步开（`useClickOutside(layerRef, close, open)`），保证 `ref.current` 已经挂好。floating-ui 的 `useDismiss(context)` 把这套逻辑（外加 Esc、焦点原因判定）做成了声明式版本，能力对照着学即可。

### A2.10 常见坑

1. **弹层闪烁开关**。症状：点击触发器，弹层开了立刻关。根因：触发器 onClick 用 click 开层，clickOutside 的 mousedown 先把上一次的层关了/或同一事件被两处处理，时序纠缠。修法：统一事件相位——外部关闭用 mousedown，开合用 click，且开层那一刻的事件不再交给 clickOutside（A2.9 的判定顺序已处理）。
2. **`overflow: hidden` 容器里弹层被裁**。症状：Select 放在卡片里，下拉只有一条缝。根因：没走 Portal，或 Portal 挂到了带裁剪的容器。修法：默认挂 body + `strategy: 'fixed'`；必须跟随滚动容器时挂进容器并改 `strategy: 'absolute'`（A2.5）。
3. **子菜单 hover 不稳定**。症状：移向子菜单途中父层关闭。根因：只有固定的 closeDelay，没有安全区。修法：加 safePolygon（或手写三角形判定）；同时检查 getFloatingProps 是否真的挂到了弹层根元素上（挂在子元素上等于没续命）。
4. **z-index 军备竞赛**。症状：业务页写了 `z-index: 99999` 盖住你的 Modal。根因：层级靠魔法数。修法：库内计数器治理（A2.6）+ 文档声明库的层级起点（如 1000），并提供 `zIndex` prop 作为逃生舱。

---

## A3. "退出动画"难题（visible/mounted 双状态机）

- 关闭时 `visible=false` 但**保持挂载**，播完动画才真正 unmount
- `onTransitionEnd` + timeout 兜底；CSSTransition / AnimatePresence 的原理都是这个
- 动画期间 `pointer-events: none`；列表项退出动画与卸载竞态

### A3.1 问题本质：卸载即消失，动画无处安放

Modal 关闭的需求是"淡出 200ms 再消失"。直觉写法 `visible && <Modal />` 的问题：`visible` 变 false 的那一帧 React 就把 DOM 删了，transition 还没开始元素已经不在了——**动画需要元素活着，而关闭语义要求它死掉**。这两个诉求指向两个不同的状态变量，这就是双状态机的由来：

- `visible`：外部语义状态——"逻辑上开着吗"；
- `mounted`：内部实现状态——"DOM 还在吗"。

### A3.2 双状态机与状态转移表

三个角色：`visible`（props）、`mounted`（内部 state）、动画类名（由 phase 派生）。完整转移表：

| 阶段 | visible | mounted | phase（动画类名依据） | DOM/样式状态 | 进入该阶段的触发 |
|---|---|---|---|---|---|
| 初始关闭 | false | false | `unmounted` | 不在文档中 | — |
| 打开瞬间 | true | true | `enter` | 已挂载，opacity: 0（起始样式） | `setVisible(true)`，同步置 mounted=true |
| 进入过渡 | true | true | `entered` | opacity 0 → 1 过渡中 | 下一帧（双 rAF）切 phase |
| 稳定展示 | true | true | `entered` | opacity 1，过渡完成 | `transitionend`（无需处理） |
| 关闭中 | false | true | `exit` | **保持挂载**，opacity 1 → 0 过渡中 | `setVisible(false)`，mounted 仍为 true |
| 关闭完成 | false | false | `unmounted` | 真正卸载 | `transitionend` 或 timeout 兜底（先到先算） |

两条不变式：**打开路径 mounted 立即变 true（否则第一帧都画不出来）；关闭路径 mounted 必须晚于 visible 至少一个动画时长**。所有进出场动画库的全部秘密就是维护这两条不变式。

### A3.3 useMountTransition 完整实现

结束信号有两个来源，必须处理它们的关系：

- `onTransitionEnd`：精确（CSS 说的时长就是它），但**会冒泡**——弹层内部任何子元素（按钮的背景色过渡、图标的旋转）结束过渡时，事件都会冒泡到弹层根元素，不分辨就提前卸载、动画被腰斩。判据：`e.target === e.currentTarget`（只有目标是"我绑定的这个元素本身"才算数）。
- timeout 兜底：transitionend 有四种"不来"的情况——动画被新的样式变化打断（此时浏览器发的是 `transitioncancel` 而非 end）、元素/祖先 `display: none`、用户开了 `prefers-reduced-motion` 导致时长为 0、组件把 duration 写成 0。兜底时长取 `duration + 余量`。

两者**先到先结算，只结算一次**（竞态兜底：transitionend 先来就撤掉 timer；timer 先来就忽略之后的 end）。

```tsx
// useMountTransition.ts
import * as React from 'react';

export type TransitionPhase = 'unmounted' | 'enter' | 'entered' | 'exit';

/**
 * 可见性与挂载解耦的双状态机。
 * 返回 mounted（要不要渲染）、phase（渲染成什么样式阶段）、handleTransitionEnd（绑给根元素）。
 */
export function useMountTransition(
  visible: boolean,
  duration = 200,
  onExited?: () => void
) {
  const [phase, setPhase] = React.useState<TransitionPhase>(
    visible ? 'enter' : 'unmounted'
  );

  const phaseRef = React.useRef(phase);
  phaseRef.current = phase; // 回调里要读"当前阶段"，不能吃闭包旧值

  const timerRef = React.useRef<number | null>(null);
  const settledRef = React.useRef(false); // 竞态哨兵：结束只结算一次
  const onExitedRef = React.useRef(onExited);
  React.useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  const settle = React.useCallback(() => {
    if (settledRef.current) return;          // transitionend 与 timeout 谁先到谁生效
    settledRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current); // 撤掉另一个信号源
      timerRef.current = null;
    }
    setPhase('unmounted');                   // 真正卸载
    onExitedRef.current?.();                 // 通知调用方"退场完毕"（列表场景要用，见 A3.6）
  }, []);

  React.useEffect(() => {
    if (visible) {
      settledRef.current = false;
      setPhase('enter');
      // 双 requestAnimationFrame：第 1 帧提交 opacity:0 的起始样式，
      // 第 2 帧再切到 entered（opacity:1），浏览器记录过起始值，过渡必然触发。
      // 只用一帧（或 setState 后立即改类名）会"同帧合并"，动画闪跳。
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('entered'));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    // visible=false：本来就没挂载就别启动计时器（防止首帧 false 的组件空跑）
    if (phaseRef.current === 'unmounted') return;

    settledRef.current = false;
    setPhase('exit');                        // 保持挂载，只切样式
    timerRef.current = window.setTimeout(settle, duration + 60); // 兜底：比声明的时长多 60ms 余量
    return () => {
      if (timerRef.current !== null) {       // 依赖变化（如退出中又重开）时撤销旧 timer
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration, settle]);

  // 绑到弹层根元素的 onTransitionEnd
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return; // ① 子元素的 transitionend 冒泡上来：忽略
      if (phaseRef.current !== 'exit') return;  // ② 只在退出阶段结算（进入阶段结束无事可做）
      settle();
    },
    [settle]
  );

  return { mounted: phase !== 'unmounted', phase, handleTransitionEnd };
}
```

### A3.4 完整组件：带退出动画的 Popup

```tsx
// FadePopup.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useMountTransition } from './useMountTransition';
import { useClickOutside } from './useClickOutside';

const DURATION = 200;

export function FadePopup({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { mounted, phase, handleTransitionEnd } = useMountTransition(visible, DURATION);
  const layerRef = React.useRef<HTMLDivElement>(null);

  // 点外关闭只在"挂载中"启用（clickOutside 需要 ref 就绪）
  useClickOutside(layerRef, onClose, mounted);

  if (!mounted) return null; // 关闭完成：真正卸载

  return createPortal(
    <div
      ref={layerRef}
      onTransitionEnd={handleTransitionEnd}
      className={clsx(
        'fade-popup',
        (phase === 'enter' || phase === 'exit') && 'fade-popup--hidden', // 两端都停在透明
        phase === 'exit' && 'fade-popup--exiting'                        // 退出期：禁点击
      )}
    >
      {children}
      <button onClick={onClose}>关闭</button>
    </div>,
    document.body
  );
}
```

```css
/* fade-popup.css */
.fade-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 1;
  transition: opacity 200ms ease; /* 过渡声明在基类上，两端只改 opacity */
}
.fade-popup--hidden {
  opacity: 0;
}
.fade-popup--exiting {
  pointer-events: none; /* 关键：退出动画期间元素还在且在最上层，不禁点就会挡住下面的交互 */
}
```

`pointer-events: none` 的必要性展开：关闭中（exit）的弹层 DOM 还在、z-index 还很高，用户已经认为它关了去点底下的按钮，结果点到"正在消失的幽灵"上。视觉上它在消失，交互上它必须已经死透——**视觉死亡时间（动画结束）与交互死亡时间（visible=false）分离**，后者必须先行。

### A3.5 与 CSSTransition / AnimatePresence 的原理同构

| 概念 | 本节双状态机 | react-transition-group 的 CSSTransition | framer-motion 的 AnimatePresence |
|---|---|---|---|
| 关闭保挂载 | `mounted` 与 `visible` 解耦 | exit 阶段不卸载子元素 | children 被移除时延迟真正卸载 |
| 阶段类名 | enter/entered/exit | `*-enter` → `*-enter-active` → `*-exit` → `*-exit-active` | 变体（initial/animate/exit）驱动 |
| 结束信号 | transitionend + timeout 竞态结算 | `timeout` prop，或 addEndListener | 动画库自身的完成回调（如 `onAnimationComplete`） |
| 列表推广 | A3.6 的 Toast 列表 | TransitionGroup | AnimatePresence + key |

所以学会这 60 行 hook，再读 CSSTransition 源码（就是在管理这些类名的添加时机：enter 类先挂、下一帧挂 enter-active）和 AnimatePresence 文档（PresenceContext + `safeToRemove` 回调）会有"原来如此"的通透感。反过来，业务里临时要用，直接手写双状态机也比引一个库轻。

### A3.6 列表项退出动画与卸载竞态

单元素的难点是"保持挂载"；列表的难点是**数据删除与动画完成是两个异步时刻**。Toast 队列：`remove(key)` 时数据层恨不得立刻删（数组 splice），动画层需要它再活 300ms。解法：删除分两步——先标 `exiting`（渲染退场样式、`pointer-events: none`），动画时长后真正过滤掉。竞态点：定时器到点时，同 key 的新 toast 可能已经插进来了，不能误删。

```tsx
// ToastList.tsx
import * as React from 'react';
import clsx from 'clsx';

interface ToastItem {
  key: string;
  content: string;
  exiting?: boolean; // 退场标记：样式上消失，数据上还在
}

const EXIT_MS = 300;

export function ToastList() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((content: string) => {
    const key = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { key, content }]);
    // 自动销毁：到点若还在（未被手动关、未被复用），走 remove
    window.setTimeout(() => remove(key), 3000);
  }, []);

  const remove = React.useCallback((key: string) => {
    // 第一步：只标 exiting，DOM 保留播动画
    setItems((prev) => prev.map((t) => (t.key === key && !t.exiting ? { ...t, exiting: true } : t)));
    // 第二步：动画时长后真正移除。过滤条件带 exiting，防止同 key 的新 toast 被误删（竞态兜底）
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => !(t.key === key && t.exiting)));
    }, EXIT_MS);
  }, []);

  return (
    <div className="toast-list">
      {items.map((t) => (
        <div
          key={t.key}
          className={clsx('toast', t.exiting && 'toast--exiting')}
          onClick={() => remove(t.key)} // 点击提前关
        >
          {t.content}
        </div>
      ))}
      <button onClick={() => push('新消息')}>push</button>
    </div>
  );
}
```

```css
/* toast.css */
.toast {
  animation: toast-in 200ms ease;
}
.toast--exiting {
  animation: toast-out 300ms ease forwards; /* forwards 停在终态，等 JS 卸载 */
  pointer-events: none;                      /* 退场期不可交互（同 A3.4） */
}
@keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes toast-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-8px); } }
```

这里用 CSS animation 而非 transition（列表项不需要"从当前值反向过渡"的通用性，入场出场各自独立更省心），所以结束信号也可以用 `onAnimationEnd`，但 timeout 兜底的纪律不变。

### A3.7 常见坑

1. **退出动画偶发不播**。症状：有时淡出有时直接消失。根因：transitionend 被子元素事件提前触发（未判 `e.target !== e.currentTarget`）或 `display: none` 打断。修法：A3.3 的两道判定 + timeout 兜底。
2. **进入动画不播（元素直接以终态出现）**。根因：起始样式与终态样式在同一帧内被浏览器合并（React 18 批处理下 setState 后立即改类名就是一帧）。修法：双 `requestAnimationFrame`（A3.3），或读 `getComputedStyle` 强制样式回流后再切。
3. **快速开关竞态**。症状：退出中再点开，弹层卡在透明或直接消失。根因：旧的 exit timer 还在跑，把新打开的层卸载了。修法：effect cleanup 撤 timer（A3.3 已内置）+ `settledRef` 保证单次结算；打开路径先把 settled 复位为 false。
4. **动画期间挡住下层交互**。根因：忘了 `pointer-events: none`。修法：A3.4 的 `--exiting` 类；Modal 全屏遮罩同理。

### ⚠️ 分水岭警示（原文：这是初级与高级组件代码最显眼的分水岭）

为什么这一节被标成分水岭？因为它是**第一个"组件状态机必须大于用户心智模型"的地方**：用户心智里"关闭"是一个瞬间动作，而组件实现里"关闭"是一个 200ms 的过程（关闭中 → 关闭完成），期间要处理点击穿透、焦点还回（A4）、数据保留与列表竞态。初级代码只有 `visible` 一个布尔，于是出现闪没、挡点击、Toast 队列错乱；高级代码把它展开成显式状态机，一切边角都有明确的转移路径。**面试时让对方写一个"带淡出的 Modal"，能不能先画出 A3.2 那张表，十秒钟就能分层。**

---

## A4. 焦点管理

- **焦点陷阱**（Modal 内 Tab 循环：可聚焦元素查询 + wraparound + Shift+Tab）
- 打开时记住触发元素，关闭时焦点还回
- **roving tabindex**（Tabs/Radio 组的键盘模型：只有一个 tab stop，方向键移动）
- `:focus-visible` 与 `:focus` 样式区分（键盘用户才显示焦点圈）

### A4.1 为什么焦点是弹层组件的一等公民

Tab 键是键盘用户与读屏用户的"光标"。弹层打开时若什么都不做，焦点还留在触发按钮上，读屏会继续念按钮后面的页面内容——对话框对他们是隐形的。所以 dialog 模式的硬性要求（A5 的 APG 表也这么写）：**打开即把焦点移入弹层，存续期间焦点出不去（陷阱），关闭时把焦点还回触发元素**。这三件事分别对应本节三个实现；做错任何一个，可访问性审计（axe/Storybook a11y 插件）都会亮红。

### A4.2 焦点陷阱完整实现

机制分步：

1. **可聚焦元素查询**：用一组选择器穷举"默认可聚焦"元素（a[href]、button、input、select、textarea、iframe、contenteditable）加上"`tabindex` 非 -1"的自定义元素；
2. **过滤不可见项**：`display: none` 的元素仍会被 `querySelectorAll` 查到，但它不可聚焦——用 `getClientRects().length > 0` 过滤（有布局盒子才算活着）；
3. **Tab 拦截**：在容器上监听 keydown，捕获 Tab 后不让默认行为发生（`preventDefault`），改为手动 `focus()` 目标元素；
4. **wraparound**：焦点在最后一项上按 Tab → 跳回第一项；在第一项上按 Shift+Tab → 跳到最后一项；焦点不在容器内（被脚本移走了）→ 拉回第一/最后一项。

```tsx
// useFocusTrap.ts
import * as React from 'react';

/** 可聚焦元素查询选择器：默认可聚焦元素 + tabindex 正值/0 的自定义元素 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 // 过滤 display:none / 隐藏祖先里的"假可聚焦"
  );
}

export function useFocusTrap(active: boolean) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // 打开即聚焦：优先开发者指定的元素（data-autofocus），否则第一个可聚焦元素
    const initial =
      container.querySelector<HTMLElement>('[data-autofocus]') ?? getFocusable(container)[0];
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(container); // 每次现查：内容可能刚渲染/刚卸载
      if (focusable.length === 0) {
        e.preventDefault(); // 容器内没有可聚焦元素：吞掉 Tab，别让焦点逃逸
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab：第一项上按 → 回到最后（循环边界）
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab：最后一项上按 → 回到第一（wraparound）
        if (current === last || !container.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [active]);

  return containerRef;
}
```

放进 Modal（同时把 A2/A3 的能力拼上）：

```tsx
// TrapModal.tsx
import * as React from 'react';
import { useFocusTrap } from './useFocusTrap';
import { useFocusReturn } from './useFocusReturn';
import { useMountTransition } from './useMountTransition';

export function TrapModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const trapRef = useFocusTrap(open);       // 焦点陷阱
  useFocusReturn(open);                     // 打开记住触发元素、关闭还回（A4.3）
  const { mounted } = useMountTransition(open, 200); // 退出动画（A3）

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();    // Esc 关闭（dialog 模式标配，A5）
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <div ref={trapRef} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0 }}>
      {children}
      <button onClick={onClose}>关闭</button>
    </div>
  );
}
```

### A4.3 打开记住触发元素，关闭还回

```tsx
// useFocusReturn.ts
import * as React from 'react';

/** active 变 true 的那一刻记住当前焦点元素；变 false（或组件卸载）时把焦点还回去 */
export function useFocusReturn(active: boolean) {
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const el = triggerRef.current;
      // 判活：关闭前触发元素可能已随列表一起卸载（如表格行里的按钮），
      // 对已断开的节点 focus() 无效，焦点会丢在 body 上——这是可接受的下线
      if (el && el.isConnected) el.focus();
    };
  }, [active]);
}
```

两个细节：为什么在 **effect** 里记而不是渲染期——effect 时机是"打开这个提交已上屏"，此刻 `document.activeElement` 正是触发元素；渲染期记可能早于浏览器的焦点移动。为什么 `cleanup` 里还——`active` 变 false 或组件直接卸载两种路径都走 cleanup，统一覆盖。

### A4.4 roving tabindex 完整实现

**问题**：Tabs/Radio 组/菜单有 N 个同类项。如果每项都 `tabIndex: 0`，键盘用户要按 12 次 Tab 才能穿过 12 个 tab；如果都 -1，又完全到不了。APG 的解法是 **roving tabindex（游动制表位）**：**整组只有一个 tab stop（当前活动项），Tab 进出组件只停一次；组内导航用方向键**，方向键同时移动焦点和"游标"（tabIndex 0 的那项）。

```tsx
// useRovingIndex.ts
import * as React from 'react';

export interface RovingOptions {
  count: number;
  /** 方向：决定哪些方向键生效；'both' 用于菜单这类两轴都要的场景 */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** 到边界是否回绕（Tabs/Radio 组默认回绕） */
  loop?: boolean;
}

/**
 * roving tabindex：activeIndex 项 tabIndex=0（唯一 tab stop），其余 -1；
 * 方向键移动 activeIndex 并真实 focus 新项。
 * "选中"语义留给调用方：Tabs 把 activeIndex 当选中；Radio 把 activeIndex 当 checked。
 */
export function useRovingIndex({
  count,
  orientation = 'horizontal',
  loop = true,
}: RovingOptions) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const itemRefs = React.useRef<Array<HTMLElement | null>>([]);
  const activeIndexRef = React.useRef(0);
  activeIndexRef.current = activeIndex; // keydown 里要读最新索引，不吃闭包旧值

  const move = React.useCallback(
    (index: number) => {
      const next = loop
        ? ((index % count) + count) % count        // -1 → count-1，count → 0：循环边界
        : Math.min(count - 1, Math.max(0, index)); // 不回绕：钳在边界
      setActiveIndex(next);
      itemRefs.current[next]?.focus();             // tabIndex 变化之外，焦点必须真的移过去
    },
    [count, loop]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const mainNext = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const mainPrev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      // 'both'（菜单类）：另一对方向键也映射到前/后
      const isNext =
        e.key === mainNext || (orientation === 'both' && e.key === 'ArrowDown');
      const isPrev =
        e.key === mainPrev || (orientation === 'both' && e.key === 'ArrowUp');

      if (isNext) { e.preventDefault(); move(activeIndexRef.current + 1); return; }
      if (isPrev) { e.preventDefault(); move(activeIndexRef.current - 1); return; }
      if (e.key === 'Home') { e.preventDefault(); move(0); return; }        // 组首
      if (e.key === 'End')  { e.preventDefault(); move(count - 1); return; } // 组尾
    },
    [orientation, move, count]
  );

  /** 每一项展开：唯一 tab stop 由这个 tabIndex 计算保证 */
  const getItemProps = (index: number) => ({
    ref: (el: HTMLElement | null) => { itemRefs.current[index] = el; },
    tabIndex: index === activeIndex ? 0 : -1,
  });

  return { activeIndex, setActiveIndex, move, handleKeyDown, getItemProps };
}
```

**Tabs 消费方**（横向、方向键即选中——APG 的"selection follows focus"自动激活模式）：

```tsx
// Tabs.tsx
import * as React from 'react';
import { useRovingIndex } from './useRovingIndex';

export interface TabItem { value: string; label: string; content: React.ReactNode }

export function Tabs({ items }: { items: TabItem[] }) {
  const { activeIndex, setActiveIndex, handleKeyDown, getItemProps } = useRovingIndex({
    count: items.length,
    orientation: 'horizontal', // Tab 条横向：左右键
  });
  const active = items[activeIndex];

  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" onKeyDown={handleKeyDown}>
        {items.map((item, i) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`tab-${item.value}`}              // 与面板的 aria-labelledby 互指
            aria-selected={i === activeIndex}
            aria-controls={`panel-${item.value}`} // 声明"我控制哪个面板"
            onClick={() => setActiveIndex(i)}     // 鼠标点击也要同步游标
            {...getItemProps(i)}                  // ref 注册 + tabIndex 0/-1
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active.value}`}
        aria-labelledby={`tab-${active.value}`}
        tabIndex={0} // 面板本身可 Tab 进入：Tab 键离开 tablist 后落进面板
      >
        {active.content}
      </div>
    </div>
  );
}
```

**RadioGroup 消费方**（纵向、方向键移动即选中——radio 的 APG 语义，与 Tabs 的差别就在这一行）：

```tsx
// RadioGroup.tsx
import * as React from 'react';
import { useRovingIndex } from './useRovingIndex';
import { useEffect, useRef } from 'react';
import { useControllableState } from './useControllableState';

export interface RadioOption<T extends string> { value: T; label: string }

export function RadioGroup<T extends string>({
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  options: RadioOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}) {
  // 选中值是双模式的（复用 A1）；键盘游标（activeIndex）是另一个独立状态
  const [selected, setSelected] = useControllableState<T>({ value, defaultValue, onChange });
  const { activeIndex, move, handleKeyDown, getItemProps } = useRovingIndex({
    count: options.length,
    orientation: 'vertical', // 单选组常纵向：上下键
  });

  // "移动即选中"的正确实现：handleKeyDown 内部的 move 是 setState，
  // 本次 onKeyDown 闭包里的 activeIndex 仍是旧值（直接读会滞后一拍）。
  // 所以这里只标记"这次移动来自键盘"，等游标真正变化后在 effect 里同步选中。
  const movedByKeyboard = useRef(false);
  useEffect(() => {
    if (!movedByKeyboard.current) return;
    movedByKeyboard.current = false;
    const current = options[activeIndex];
    if (current && selected !== current.value) setSelected(current.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只随游标移动同步
  }, [activeIndex]);

  return (
    <div
      role="radiogroup"
      onKeyDown={(e) => {
        handleKeyDown(e);
        // 方向键被消费（defaultPrevented）说明游标动了：radio 语义要求"移动即选中"。
        // 不要在这里读 activeIndex——那是本次渲染的旧闭包值，新游标要下一轮渲染才到达
        if (e.defaultPrevented) movedByKeyboard.current = true;
      }}
    >
      {options.map((opt, i) => (
        <label key={opt.value}>
          <input
            type="radio"
            name={name}
            checked={selected === opt.value}
            onChange={() => {
              move(i);            // 鼠标点选也要把游标（tab stop）搬过来
              setSelected(opt.value);
            }}
            {...getItemProps(i)}  // 原生 radio + 同 name 本来就有方向键行为，
                                 // 但 tabIndex 被我们接管后，行为也必须由我们接管
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
```

### A4.5 :focus-visible 与 :focus 的区别

`e.target.focus()`（脚本）——浏览器有一套"焦点是否来自键盘"的启发式判定：最近一次输入是键盘（Tab、方向键），或焦点目标是文本输入框，就命中 `:focus-visible`；鼠标点出来的 focus 只命中 `:focus`。所以组件库的焦点样式纪律：

```css
/* focus.css —— 键盘用户才显示焦点圈，鼠标用户不被打扰 */
.btn {
  outline: none; /* 先清默认样式，统一自绘（前提是下面两条都写了） */
}
/* 焦点来自键盘导航：显示焦点圈 */
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
/* 焦点来自鼠标点击：:focus 命中但 :focus-visible 不命中 → 不画圈 */
.btn:focus:not(:focus-visible) {
  outline: none;
}
```

反例警告：只写 `.btn:focus { outline: none; }` 是可访问性头号杀手——键盘用户完全失去"我在哪"的反馈。清掉默认 outline 的唯一正当理由是"换成了更好的 :focus-visible 样式"。

### A4.6 常见坑

1. **陷阱查一次列表就缓存**。症状：弹层内懒渲染的表单区域永远聚焦不进去。根因：可聚焦元素列表在打开时算一次存了 ref。修法：每次 Tab 按下现查（A4.2 写法），内容是动态的。
2. **焦点还回去没反应**。症状：关闭 Modal 后焦点丢在 body，Tab 从头开始。根因：触发元素已被卸载（行删除）或变成 disabled（focus() 静默失败）。修法：`isConnected` 判活（A4.3）；业务上重要的场景在关闭回调里显式指定还焦目标。
3. **roving 后 Tab 顺序错乱**。症状：Tab 进入组件后，组内每项还能再停。根因：`getItemProps` 忘了展开（或元素自身 tabIndex=0 覆盖了它）。修法：确认 tabIndex 计算真的落到每个元素上；用键盘实际走一遍"Tab 进入 → 方向键 → Tab 离开"三段。

---

## A5. 键盘导航与 ARIA

- **WAI-ARIA Authoring Practices 是组件库圣经**——每种组件都有标准键盘模型
- 必背模式：listbox（↑↓/Home/End/typeahead）、dialog（focus trap + Esc）、tree、combobox、grid
- typeahead：连按字母匹配选项
- `aria-live` 播报 Toast 数量、自动完成结果数（读屏用户体验）

### A5.1 WAI-ARIA APG 的地位与查阅方式

ARIA 规范本身只定义**属性语义**（`aria-expanded` 是什么意思），不告诉你 Select 该按什么键。"Select 应该怎么按键盘"的权威在 **WAI-ARIA Authoring Practices Guide（APG，作者实践指南）**：w3.org/WAI/ARIA/apg/patterns/。它由 W3C 的 ARIA 工作组维护，每个模式页三段式：

1. **Keyboard Interaction 表**：每个按键 → 行为（这是面试与实现的答案来源）；
2. **ARIA Attributes 表**：容器/子项/触发器各挂什么 role 与 aria-*；
3. 可运行示例（原生 DOM 实现，是组件库行为的参照系）。

组件库开发的正确工作流：**动手前先开 APG 对应模式页，把两张表抄进组件的验收清单**，写完用键盘逐条过。没有对应模式时（如 DatePicker），拆成最近似模式的组合（combobox + grid），antd/Radix 都是这么做的。APG 的示例代码是原生 DOM 写的——这正好印证组件库的本质：**React 只是实现手段，交互契约是平台级的**。

### A5.2 必背模式对照表

| 模式 | 代表组件 | 键位 | 关键 ARIA |
|---|---|---|---|
| listbox | Select 下拉 | ↑↓ 移动高亮；Home/End 首/末项；Enter 选中；Esc 关闭；typeahead 跳转 | 触发器 `aria-haspopup="listbox" aria-expanded`；列表 `role="listbox"`；选项 `role="option" aria-selected`；容器用 `aria-activedescendant` 上报高亮项 |
| dialog | Modal/Drawer | Tab/Shift+Tab 焦点陷阱（A4）；Esc 关闭；焦点初置与还回 | `role="dialog" aria-modal="true" aria-labelledby`（命名）`aria-describedby`（描述） |
| tree | Tree/TreeSelect | ↑↓ 同级移动；→ 展开或进首个子级；← 收起或回父级；Home/End 首/末；Enter 激活 | `role="tree"`；节点 `role="treeitem" aria-expanded aria-level aria-selected`；子组 `role="group"` |
| combobox | 自动完成、可输入 Select | 打字过滤；↑↓ 高亮；Enter 提交；Esc 逐级退（先关列表再清输入）；Alt+↓ 展开列表 | 输入框 `role="combobox" aria-expanded aria-controls` `aria-autocomplete="list"/"inline"/"both"`；列表侧同 listbox；高亮经 `aria-activedescendant` 挂在输入框上 |
| grid | 数据表格、日历面板 | ↑↓←→ 单元格间移动；Home/End 行首/尾；Ctrl+Home/End 表首/尾；F2/Enter 进编辑；Esc 出编辑；PageUp/PageDown 翻页 | `role="grid"` `role="row"` `role="gridcell"/"columnheader"`；选中格 `aria-selected`；只读格 `aria-readonly` |

这张表是 Part B 里 Select（listbox+combobox）、Table（grid）、Tree、DatePicker（grid）的公共考纲——每个组件的实现清单都能从这里直接抄。

### A5.3 typeahead：连按字母匹配

机制：维护一个按键缓冲区 + 一个超时计时器。快速连按 "b"、"e" 视为一轮 "be"（前缀匹配 "Beijing"）；两次按键间隔超过 500ms（行业惯例值），缓冲清空重新开始。匹配策略两段：先整串前缀匹配；不中再退化为最后一个字符匹配（用户按错也能跳到同字母区）。

```tsx
// useTypeahead.ts
import * as React from 'react';

export interface TypeaheadOptions<T> {
  items: T[];
  getItemLabel: (item: T) => string;
  /** 匹配命中：把高亮/游标移过去（listbox 的 aria-activedescendant 也跟着变） */
  onHighlight: (index: number) => void;
  /** 超时重置窗口，默认 500ms */
  resetMs?: number;
}

export function useTypeahead<T>({
  items,
  getItemLabel,
  onHighlight,
  resetMs = 500,
}: TypeaheadOptions<T>) {
  const bufferRef = React.useRef('');            // 按键缓冲：连按串
  const timerRef = React.useRef<number | null>(null); // 非 null 表示"一轮进行中"
  const lastIndexRef = React.useRef(0);          // 上一次命中的索引：同字母连按要往后找
  const onHighlightRef = React.useRef(onHighlight);
  React.useEffect(() => {
    onHighlightRef.current = onHighlight;
  }, [onHighlight]);

  React.useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current); // 卸载清计时器
    },
    []
  );

  /** 返回是否消费了该键（消费了应 preventDefault） */
  const handleKey = React.useCallback(
    (e: React.KeyboardEvent): boolean => {
      // 带修饰键的组合（Ctrl+C 等）不是 typeahead；只有单字符可打印键参与
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.key.length !== 1) return false;

      // ① 判定"新一轮"：上一轮已超时 → 清缓冲，从"上次命中的下一项"开始环形找
      //    （同字母连按的循环语义：b、停顿、b → 跳到下一个 b 开头的项）
      const isNewRound = timerRef.current === null;
      if (isNewRound) bufferRef.current = '';
      bufferRef.current += e.key.toLowerCase();

      const labels = items.map((item, i) => ({ label: getItemLabel(item).toLowerCase(), i }));
      const start = isNewRound ? lastIndexRef.current + 1 : 0; // 新一轮从上次命中+1 环形找；续轮从 0

      // ② 两段匹配：整串前缀 → 退化为末字符前缀
      const findByPrefix = (prefix: string): number => {
        for (let k = 0; k < labels.length; k++) {
          const idx = (start + k) % labels.length; // 环形扫描一整圈，起点不影响可达性
          if (labels[idx].label.startsWith(prefix)) return idx;
        }
        return -1;
      };
      const prefixHit = findByPrefix(bufferRef.current);
      const hit = prefixHit !== -1 ? prefixHit : findByPrefix(bufferRef.current.slice(-1));

      // ③ 重置计时：本键之后的 resetMs 内再按，仍算同一轮
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        bufferRef.current = '';
      }, resetMs);

      if (hit !== -1) {
        lastIndexRef.current = hit;
        onHighlightRef.current(hit);
        return true;
      }
      return false; // 没匹配上：不消费，交给其它按键逻辑
    },
    [items, getItemLabel, resetMs]
  );

  return handleKey;
}
```

接进 listbox（与 A5.2 的键位表合并成一个 keydown）：

```tsx
// 键盘路由示意（节选）：方向键、Home/End、Enter/Esc、typeahead 各归各位
const handleTypeahead = useTypeahead({
  items: options,
  getItemLabel: (o) => o.label,
  onHighlight: setHighlightedIndex, // typeahead 命中 → 移动高亮
});

function onKeyDown(e: React.KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); setHighlightedIndex((i) => Math.min(i + 1, options.length - 1)); return;
    case 'ArrowUp':   e.preventDefault(); setHighlightedIndex((i) => Math.max(i - 1, 0)); return;
    case 'Home':      e.preventDefault(); setHighlightedIndex(0); return;
    case 'End':       e.preventDefault(); setHighlightedIndex(options.length - 1); return;
    case 'Enter':     e.preventDefault(); commit(options[highlightedIndex]); return;
    case 'Escape':    e.preventDefault(); close(); return;
    default:
      if (handleTypeahead(e)) e.preventDefault(); // 其余单字符交给 typeahead
  }
}
```

### A5.4 aria-live：给读屏的"画外音"

Toast 出现、自动完成结果数变化，都是**视觉信息**——读屏用户的"光标"（虚拟游标）没动，默认什么也不会念。`aria-live` 区域是专门的播报通道：内容一变，读屏主动念出来。

- `aria-live="polite"`：等当前播报结束再念（绝大多数场景用这个）；
- `aria-live="assertive"`：立刻打断当前播报（仅紧急信息，滥用会被读屏用户关掉）；
- `role="status"` 等价 polite + `aria-atomic`，`role="alert"` 等价 assertive——写 role 更简洁；
- `aria-atomic="true"`：每次变更播报**完整**文本而非差异。

```tsx
// LiveRegion.tsx
import * as React from 'react';

/** 视觉隐藏但不脱离无障碍树：读屏听得到，肉眼看不见 */
export function LiveRegion({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

```css
/* sr-only：标准剪裁法——视觉上脱离布局（1×1 像素裁到不可见），屏幕阅读器仍可读 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

用法（Toast 数量 / 自动完成结果数）：

```tsx
// Toast 容器常驻一个 LiveRegion（message 变化即播报）
<LiveRegion message={`${items.length} 条未读通知`} />

// 自动完成：结果数是关键信息，播数字不播全部内容
<LiveRegion message={loading ? '搜索中' : `${filtered.length} 个结果`} />
```

**最关键的机制坑**：live region 必须在内容变化**之前**就存在于 DOM。读屏监听的是"已存在节点的变更"；先插节点再马上改文本，部分读屏/浏览器组合不播。所以 Toast 的 LiveRegion 要**常驻渲染**（空串也渲染着），而不是出 toast 时才挂。React 对同一节点重渲染改文本是有效播报源。

### A5.5 常见坑

1. **aria 挂对了但键盘没实现**。症状：axe 检查全绿（它只验静态属性），键盘用户用不了。根因：ARIA 属性只改读屏语义，不产生任何行为。修法：A5.2 的键位表逐条手测；把"键盘清单"写进组件的验收 story。
2. **aria-activedescendant 与 DOM 不同步**。症状：读屏念的还是上一个高亮项。根因：id 拼错或高亮项卸载后未清空。修法：id 从数据 key 生成、组件卸载时置 `undefined`。
3. **Toast 无播报**。根因：live region 是动态插入的（A5.4 的机制坑）。修法：常驻节点 + 只改内容。
4. **在 div 上绑 keydown 却忘了 tabIndex**。症状：鼠标点点不进、键盘也到不了，处理函数永远不触发。修法：非可聚焦元素做键盘容器必须 `tabIndex={0}`（或改为 roving，A4.4——组内导航时容器本身不需要 focusable）。

---

## A6. 事件边界

- React 17+ 事件委托在 root；原生监听 document 时与 React 事件的执行顺序
- capture 阶段拦截技巧（编辑器画布、弹层互斥都靠它）
- passive listener（wheel/touch 性能）

### A6.1 React 17+ 事件委托机制图解

React 不把 `onClick` 直接绑在你的元素上。它在 **root 容器**（`createRoot(el)` 的那个 el）上为每种事件各挂一个原生监听，事件冒泡/捕获到 root 时，React 沿 fiber 树模拟派发合成事件（`SyntheticEvent`）。React 17 之前监听挂在 `document` 上，17 起迁到 root——解决多应用共存（微前端）与事件到达顺序两大问题。

```text
                    click 事件的一生（React 17+）
 ┌──────────────────────────────────────────────────────────────────┐
 │ 捕获阶段（外 → 内）                                               │
 │   window → document → #root → …祖先 div… → 目标 button            │
 │      │        │        │                                          │
 │      │        │        └ ② React 挂在 root 的捕获监听：             │
 │      │        └ ① 原生 document 捕获监听         派发 onXxxCapture  │
 │      │                    （addEventListener(fn, true)）          │
 ├──────────────────────────────────────────────────────────────────┤
 │ 目标阶段：button 上自己的原生监听（若有）                            │
 ├──────────────────────────────────────────────────────────────────┤
 │ 冒泡阶段（内 → 外）                                               │
 │   button → …祖先 div… → #root → document → window                 │
 │                     │        │                                    │
 │                     └ ③ React 挂在 root 的冒泡监听：               │
 │                        沿 fiber 树向上派发 onXxx                    │
 │                              └ ④ 原生 document 冒泡监听            │
 └──────────────────────────────────────────────────────────────────┘
 实际执行顺序：① → ② → 目标原生 → ③ → ④
```

### A6.2 原生 document 监听与 React 事件的执行顺序

从上图直接读出三条结论（面试高频）：

1. **React 冒泡处理器（③）先于原生 document 冒泡监听（④）**——因为 root 在 document 的内层，事件先到 root；
2. **原生 document 捕获监听（①）先于一切 React 处理器**——捕获方向上 document 最外层；
3. **目标元素上的原生监听先于 React 冒泡处理器**，但晚于 React 捕获处理器（②在 root 捕获，早于目标阶段）。

可运行验证：

```tsx
// EventOrderDemo.tsx —— 打印 React 与原生监听的真实顺序
import * as React from 'react';

export function EventOrderDemo() {
  React.useEffect(() => {
    const onDocCapture = () => console.log('1) 原生 document 捕获');
    const onDocBubble = () => console.log('5) 原生 document 冒泡');
    document.addEventListener('click', onDocCapture, true);  // true：捕获
    document.addEventListener('click', onDocBubble);          // 默认：冒泡
    return () => {
      document.removeEventListener('click', onDocCapture, true);
      document.removeEventListener('click', onDocBubble);
    };
  }, []);

  return (
    <div
      onClickCapture={() => console.log('2) React onClickCapture（root 捕获派发）')}
      onClick={() => console.log('4) 外层 div 的 React onClick')}
    >
      <button onClick={() => console.log('3) button 的 React onClick')}>
        点我，看控制台顺序 1→2→3→4→5
      </button>
    </div>
  );
}
```

工程含义：**想在所有 React 处理器之前拦截事件（互斥、画布锁），必须用 document/window 的捕获监听**；想"事后"观察事件，用 document 冒泡监听。另外注意：合成事件上调用 `e.stopPropagation()` 会同时停掉原生事件继续传播——④ 也将收不到；这是双刃剑（能挡住别的库的 document 监听，也会挡住合理的全局行为）。

### A6.3 capture 阶段拦截：编辑器画布与弹层互斥

**编辑器画布场景**：画布进入"框选/连线"模式时，画布内组件的一切指针交互（拖拽、点选、resize 手柄）都该失效。逐个组件加 `if (mode === 'select') return` 是散弹枪修改；正确做法是在 document 捕获阶段统一吃掉：

```tsx
// useCanvasSelection.ts —— 框选模式：捕获阶段吃掉画布内的一切指针交互
import * as React from 'react';

export function useCanvasSelection(
  active: boolean,
  canvasRef: React.RefObject<HTMLElement | null>,
  onFinish: (rect: { x: number; y: number; w: number; h: number }) => void
) {
  // 回调最新化：effect 只随 active 重建，别把 onFinish 拉进依赖导致监听反复拆装
  const onFinishRef = React.useRef(onFinish);
  React.useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  React.useEffect(() => {
    if (!active) return;
    let startX = 0, startY = 0, endX = 0, endY = 0;
    let dragging = false;

    const onPointerDown = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.contains(e.target as Node)) return; // 画布外的事件不管
      dragging = true;
      startX = endX = e.clientX;
      startY = endY = e.clientY;
      // 捕获阶段最先执行（A6.2 的 ①）：stopPropagation 之后，
      // 画布里组件的 React onPointerDown/onClick（②③）根本不会触发
      e.stopPropagation();
      e.preventDefault(); // 顺便吃掉默认行为（文本选中等）
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      endX = e.clientX;
      endY = e.clientY;
      // 这里可同步更新"选框预览"元素的几何（画一个跟随指针的虚线框即可）
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      onFinishRef.current({
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        w: Math.abs(endX - startX),
        h: Math.abs(endY - startY),
      });
    };

    document.addEventListener('pointerdown', onPointerDown, true); // true：捕获
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [active, canvasRef]);
}
```

**弹层互斥场景**：打开弹层 A 时要关掉弹层 B——"关闭 B"必须发生在"B 的触发器把 B 打开/保持"逻辑之前，所以同样走捕获。与 A2.9 的弹层集合联动：

```tsx
// 互斥逻辑节选：任何弹层打开时，先关掉链路之外的弹层
import { openLayers, closeLayer } from './layerStore'; // A2.6/A2.9 的弹层注册表

document.addEventListener(
  'mousedown',
  (e) => {
    for (const layer of openLayers) {
      if (layer.contains(e.target as Node)) continue; // 自己/子弹层：豁免（A2.9 规则②）
      closeLayer(layer);                              // 其余弹层：抢在一切打开逻辑之前关闭
    }
  },
  true // 捕获：保证先于所有 React onClick 执行
);
```

### A6.4 passive listener：wheel/touch 的性能约定

浏览器要保证滚动流畅（合成器线程直接滚），前提是事件监听**不调用 preventDefault**（一旦可能取消滚动，浏览器就得等 JS 执行完）。于是有了约定：**window/document/body 上的 `wheel`、`touchstart`、`touchmove` 默认按 passive 挂载**（Chrome 56 起）——passive 监听里 `preventDefault()` 无效，控制台报警 `Unable to preventDefault inside passive event listener`。

React 侧的连带影响：React 17 起 root 上的 `touchstart`、`touchmove`、`wheel` 也是 passive 挂载的——所以 **`onWheel` 里 `preventDefault()` 不起作用**。需要"滚轮缩放画布而不是滚动页面"这类需求，必须用原生 `addEventListener` 并显式声明 `{ passive: false }`：

```tsx
// ZoomableCanvas.tsx —— 滚轮缩放画布（preventDefault 必须生效的场景）
import * as React from 'react';

export function ZoomableCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scaleRef = React.useRef(1);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // 复位变换矩阵再重画，避免累积
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleRef.current, scaleRef.current);
      ctx.strokeRect(40, 30, 80, 60); // 示意图形：随缩放变大变小
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // 阻止页面滚动，改走缩放 —— 必须在 non-passive 监听里才有效
      scaleRef.current = Math.min(4, Math.max(0.5, scaleRef.current * (e.deltaY > 0 ? 0.9 : 1.1)));
      draw();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false }); // 显式关掉 passive
    draw();
    return () => canvas.removeEventListener('wheel', onWheel); // remove 时无须再传 passive
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      style={{ border: '1px solid #ccc', touchAction: 'none' }} /* touchAction 配套禁掉触摸滚动 */}
    />
  );
}
```

顺带：触摸场景还有一个纯 CSS 出口——`touch-action: none` 声明"这个元素上的触摸手势不产生滚动"，等于在浏览器层面免掉 preventDefault 纠缠，优先用它。

### A6.5 常见坑

1. **`onWheel` 里 preventDefault 没效果**。症状：页面照样滚/缩放和滚动同时发生，控制台 passive 警告。根因：A6.4——React 的 wheel 是 root 上 passive 挂载。修法：ref + 原生 `addEventListener('wheel', fn, { passive: false })`。
2. **click-outside 用 click 导致误关**。症状：在弹层里拖选文本、松手在弹层外，弹层关了。根因：click 的目标是 down/up 的共同祖先（A2.9）。修法：mousedown 阶段判定。
3. **document 捕获监听泄漏**。症状：组件卸载后某些事件"失灵"（被幽灵监听 stopPropagation 了）。根因：捕获监听忘了清理，或 cleanup 时 `removeEventListener` 没带相同的 capture 标志（`removeEventListener(type, fn, true)` 与 `removeEventListener(type, fn)` 不等价）。修法：add/remove 严格成对，capture 标志一致。

---

## A7. SSR 与环境兼容

- `useId`（hydration 安全的表单 id 关联：label htmlFor ↔ input id）
- `useLayoutEffect` 的 SSR warning → `useIsomorphicLayoutEffect`
- window/document 守卫； hydration mismatch 的典型来源（随机数/时间）

### A7.1 useId：hydration 安全的唯一 id 生成器

**问题**：组件内部需要把 `<label>` 与 `<input>` 关联起来，必须有个 id。手写 `id={'input-' + Math.random()}` 在服务端与客户端各算一次——hydration 时 React 发现属性不一致直接报错。自增计数器也不行：SSR 是流式/并发的，两端渲染顺序无法保证对齐。

`useId` 的机制：React 在组件树的位置坐标基础上生成 id（React 18 形如 `:r0:`，React 19 形如 `«r0»`），**同一次渲染流程里服务端与客户端对同一组件算出同一个值**——这就是它存在的全部理由。格式细节不要依赖（版本间会变），只当作不透明 token。

```tsx
// TextField.tsx —— label htmlFor ↔ input id 的标准接法
import * as React from 'react';

export function TextField({
  label,
  hint,
  ...inputProps
}: {
  label: string;
  hint?: string;
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'id'>) {
  const id = React.useId();                       // 两侧水合一致：不炸 hydration
  const hintId = hint ? `${id}-hint` : undefined; // 衍生 id 也保持同源
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hintId} {...inputProps} />
      {hint && <p id={hintId}>{hint}</p>}
    </div>
  );
}
```

同一组件渲染多次，id 互不相同；`aria-controls`、`aria-labelledby`、`aria-describedby` 一切"跨元素引用"都走这个模式（A4 的 tab↔panel 互指在真实库里也该用 useId 生成，示例里为可读性用了业务 value）。多 React root 共存（微前端）时用 `createRoot(el, { identifierPrefix: 'app1-' })` 区分前缀。

### A7.2 useIsomorphicLayoutEffect

`useLayoutEffect` 在服务端不执行，React 会打 warning（`useLayoutEffect does nothing on the server…`）——因为 SSR 期间调它没意义，但这警告在生产日志里是噪音。约定俗成的 shim：

```tsx
// useIsomorphicLayoutEffect.ts
import * as React from 'react';

// 服务端（无 window）退化为 useEffect：SSR 上两者都不执行，
// 客户端水合完成后恢复真正的 useLayoutEffect（测量 DOM 后同步重绘的场景）
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
```

使用纪律：组件库里"测量再渲染"的 effect（弹层定位、指示条 FLIP 动画、滚动修正）都应改用它。注意模块顶层的 `typeof window` 判断发生在**模块加载时**——Next.js 的客户端 bundle 里是真 window，服务端 bundle 里是 undefined，分支正确。

### A7.3 window/document 守卫模式

先纠正一个高频误解：**effect 在 SSR 上根本不执行**，所以 effect 里直接用 `window`/`document` 不需要守卫。真正需要守卫的是另外两处：

```tsx
// ① 模块级守卫：模块被服务端 import 时就执行的工具初始化
// if (typeof window !== 'undefined') {
//   setupResizeObserverPolyfill(); // 这类"碰 DOM 的副作用"只在浏览器执行
// }

// ② 渲染期守卫：渲染逻辑要读环境时（最危险，容易造成双端输出不一致）
// function useViewportWidth(): number {
//   return typeof window === 'undefined' ? 0 : window.innerWidth; // 服务端 0，客户端真实值 → mismatch！
// }
```

渲染期读环境的正确姿势是**两阶段渲染**：首帧输出与服务端一致的默认值，effect 里校正为真实值。以响应式断点 hook 为例：

```tsx
// useMediaQuery.ts —— SSR 安全的媒体查询
import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  // 首帧恒为 false：与服务端输出一致，hydration 无 mismatch
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches); // 水合完成后立即校正为真实值（可能闪一下，换来正确性）
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
```

### A7.4 hydration mismatch 的典型来源与修复

hydration 的契约：服务端 HTML 与客户端首次渲染的 DOM 必须**逐节点一致**。任何"服务端算不出、客户端才算得出"的值都是隐患。对照表：

| 来源 | 症状（控制台） | 根因 | 修复 |
|---|---|---|---|
| `Math.random()`/uuid | attribute/class mismatch | 双端各随一次机 | 渲染期只用确定性值；随机值放 effect；id 用 useId |
| `Date.now()`/`toLocaleString()` | text content mismatch | 毫秒必然不同；时区/语言环境不同 | 展示型时间用 `suppressHydrationWarning` 或 effect 填充 |
| `localStorage` 主题类 | class 不一致 | 服务端没有存储 | 首帧内联脚本（A9.3）或两阶段渲染 |
| 时区/货币格式化 | 文本不同 | 服务端容器常是 UTC，客户端是用户时区 | 格式化移到 effect；或服务端注入用户 locale |
| 渲染期读 `window.innerWidth` 分支 | 结构不同 | A7.3 ② | 首帧默认值 + effect 校正 |
| 浏览器插件改 DOM | 属性被插（`data-*`） | 与组件库无关的外因 | 无痕模式复现定位；不要拿 suppress 掩盖 |
| 非法 HTML 嵌套 | 服务端能出、客户端炸 | `<p>` 里渲染 `<div>` 等 | 改用合法结构（`<div>` 套 `<div>`） |

时间戳的标准处理（展示型"天然不一致"允许客户端值胜出）：

```tsx
// Timestamp.tsx
import * as React from 'react';

export function Timestamp({ ts }: { ts: number }) {
  return (
    // suppressHydrationWarning 只忽略"本元素文本/属性"的水合差异，客户端值生效；
    // 它是"此处确实双端不同"的显式声明，不是万能橡皮擦
    <time suppressHydrationWarning>
      {typeof document === 'undefined' ? '' : new Date(ts).toLocaleString('zh-CN')}
    </time>
  );
}
```

### A7.5 常见坑

1. **`useState` 惰性初始化里读环境**。症状：`useState(() => localStorage.getItem(...))` 在 SSR 报 `localStorage is not defined`。根因：初始化器在服务端渲染期也执行。修法：`typeof window` 守卫 + 接受首帧差异（配合 effect 校正），或值只在 effect 里读。
2. **以为 effect 需要守卫，加了一堆 `if (typeof window)`**。症状：代码噪音。根因：误解 A7.3。修法：删掉 effect 内守卫，把守卫留给模块级与渲染期。
3. **useId 的值当 CSS 选择器用**。症状：样式失效（React 18 的 `:r0:` 冒号在选择器里非法）。根因：依赖了格式细节。修法：用属性选择器或包一层自己控制的 class；React 19 的 `«r0»` 格式同理别解析。

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
import { useEffect, useRef } from 'react';
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
import { useEffect, useRef } from 'react';
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

---

## A9. 样式与主题方案选型

- 四条路线对比：CSS Variables+BEM / CSS-in-JS（antd v5 cssinjs）/ Tailwind preset（shadcn 路线）/ CSS Modules
- ConfigProvider 注入 token；暗色主题（变量切换）；**样式按需加载**（cssinjs 天然按需 vs css 文件要 sideEffects 处理）

### A9.1 四条路线对比

| 维度 | CSS Variables + BEM | CSS-in-JS（antd v5 @ant-design/cssinjs） | Tailwind preset（shadcn 路线） | CSS Modules |
|---|---|---|---|---|
| 按需加载 | 按组件拆 css 文件，依赖打包器与 sideEffects 声明 | **天然按需**：组件渲染时才注入对应样式，无独立 css 产物 | **原子级按需**：源码里出现过的类才会被生成 | 按组件文件拆分，同 BEM 路线的打包问题 |
| 主题能力 | 运行时换变量，零成本、支持多主题共存 | token 系统（seed/map/component 三层）驱动，hash 缓存；主题即对象 | preset 定义 token；运行时主题靠 CSS 变量承接 | 主题只能走 CSS 变量，类名本身编译期固定 |
| 运行时成本 | 零 | 有：token 序列化、样式生成与插入（有 hash 缓存，同主题只付一次） | 近零：编译期完成，运行时只有变量 | 零 |
| SSR | 零处理 | 要抽关键 CSS（createCache + extractStyle）防首帧裸奔 | 零处理 | 零处理 |
| 样式隔离 | 靠 BEM 命名纪律 | hash 类名 + `:where()` 零特异性 | 类名组合 + 前缀约束 | 编译期 hash 类名，天然强隔离 |
| 消费者覆盖成本 | 直接写覆盖类，特异性可控 | `:where()` 让覆盖容易，但要懂 token 体系 | 源码都在自己仓库（shadcn），随便改 | hash 类名对外不可读，覆盖需库方开出口子（prefix/className API） |
| 代表 | Arco Design（less 变量 + CSS 变量主题）、Element Plus（Vue 侧经典） | antd v5、MUI（emotion 底座） | shadcn/ui + Radix | 大量团队内部库与中后台项目 |

选型速记：**要运行时强主题（设计系统级）→ cssinjs 或 CSS 变量；要零运行时与最小体积 → BEM/Modules；要把最终形态交给业务方 → Tailwind preset（shadcn 形态，Part B Lv4 展开）**。四条路线的代码形态各看一眼：

```css
/* 路线一：CSS Variables + BEM —— button.css */
:root {
  --ui-color-primary: #1677ff;
}
.ui-btn {
  /* 命名即模块：块__元素--修饰符 */
  background: var(--ui-color-primary);
  border-radius: var(--ui-radius, 4px);
}
.ui-btn--large { padding: 8px 16px; }
.ui-btn__icon { margin-right: 4px; }
/* 主题 = 换变量集（见 A9.3），类名零改动 */
```

```tsx
// 路线二：CSS-in-JS —— 机制示意（antd v5 内部即 @ant-design/cssinjs）
// 样式是"token 的函数"，运行时生成 <style> 插入 <head>，见 A9.2 的机制分解
```

```ts
// 路线三：Tailwind preset —— my-ui/tailwind.preset.ts
import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        ui: {
          primary: 'var(--ui-color-primary)', // token 指到 CSS 变量：编译期定类名，运行时换值
        },
      },
    },
  },
} satisfies Config;

// 业务侧 tailwind.config.js：
// module.exports = { presets: [require('my-ui/tailwind.preset.js')] };
```

```css
/* 路线四：CSS Modules —— Button.module.css */
.btn { /* 编译后类名形如 Button_btn__x7f2q，天然隔离 */
  composes: base from './base.module.css'; /* composes：模块内组合复用 */
  background: var(--ui-color-primary);
}
```

### A9.2 ConfigProvider 注入 token 的机制

antd v5 的主题系统机制分步（理解了机制，换任何 cssinjs 库都能举一反三）：

1. **ConfigProvider 收 ThemeConfig**（`token`/`algorithm`/继承合并），通过 context 下发；
2. **token 分三层**：种子 token（`colorPrimary` 等 ~30 个）→ 映射 token（派生色板 `colorPrimaryBg`、悬浮色等）→ 组件 token（`Button.paddingInline` 这类单组件粒度）；
3. **cssinjs 引擎**把整棵 token 对象序列化算 hash：**同 token 必同 hash**，组件样式模板（CSS 模板字符串函数，入参是 token）执行结果挂上 `.css-{hash}` 类名插进 `<head>`，命中过的 hash 走缓存不再生成；
4. 组件根元素挂 hash 类；选择器包 `:where()`（零特异性）——消费者的覆盖样式天然赢，不需要 `!important`；
5. `theme.cssVar: true` 时改为先生成一轮 CSS 变量、样式引用变量：切主题从"重生成全部样式"变成"换变量值"。

```tsx
// antd v5 主题接入：种子 token + 暗色算法 + CSS 变量模式
import * as React from 'react';
import { ConfigProvider, theme } from 'antd';

export function ThemedApp({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#00b96b', borderRadius: 4 }, // 改种子：派生色板全跟着动
        algorithm: theme.darkAlgorithm,                        // 暗色算法（A9.3）
        cssVar: true,                                          // CSS 变量模式（antd 5.12+）：切换更便宜
      }}
    >
      {children}
    </ConfigProvider>
  );
}
```

SSR 配套（呼应 A7）：cssinjs 的样式在客户端是运行时注入的，服务端渲染的 HTML 里没有样式——首帧会"裸奔"，需要在服务端把样式抽出来塞进 `<head>`：

```tsx
// server-entry.tsx —— @ant-design/cssinjs 的服务端抽取
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs';

const cache = createCache(); // 用同一个 cache 承接渲染过程中的样式注册
const html = renderToString(
  <StyleProvider cache={cache}>{/* <App /> */}</StyleProvider>
);
const styleText = extractStyle(cache); // 汇总为 <style>…</style> 字符串，拼进 <head> 返回
```

### A9.3 暗色主题：变量切换与防白闪

自建库的标准暗色方案：**主题 = 一组 CSS 变量**，切换 = 换 `data-theme` 属性。难点不在切换，在**首帧**——`localStorage` 里存了 dark，但 HTML 生成时（SSR/首屏 JS 执行前）谁都不知道，等 React 挂载再切类名就是一次白闪（FOUC）。解法是 body 脚本抢在首帧之前：

```html
<!-- index.html —— 内联脚本：在任何渲染发生前把主题挂到 <html> 上 -->
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var theme =
        saved === 'dark' || saved === 'light'
          ? saved
          : matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
      document.documentElement.dataset.theme = theme; // 与 CSS 的 [data-theme='dark'] 对应
    } catch (e) {
      /* localStorage 被禁用（隐私模式）等：走默认亮色 */
    }
  })();
</script>
```

```css
/* tokens.css —— 主题即变量集合 */
:root {
  --color-bg: #ffffff;
  --color-text: #1f2329;
  --color-primary: #1677ff;
}
:root[data-theme='dark'] {
  --color-bg: #141414;
  --color-text: rgba(255, 255, 255, 0.88);
  --color-primary: #3c89ff; /* 暗色品牌色是重新调亮的，不是简单反色 */
}
```

```tsx
// useTheme.ts —— React 侧的读写与持久化
import * as React from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  // 首帧值由内联脚本提前挂好，这里只是"读现状"：与 SSR 输出一致，无 mismatch（A7.3）
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    return (document.documentElement.dataset.theme as Theme | undefined) ?? 'light';
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme; // 切变量集：所有组件瞬间换肤
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
```

antd v5 侧的暗色就是 A9.2 里的 `algorithm: theme.darkAlgorithm`（对色板做暗色反演而非逐值手写）；要"页面框架自己一套 + antd 一套"双轨并行时，让自建变量的切换与 ConfigProvider 的 algorithm 同源于同一个 `useTheme`，避免两套暗色不同步。

### A9.4 样式按需加载与 sideEffects

**机制分步**（以打包器视角）：

1. 业务 `import { Button } from 'my-ui'`，入口文件 re-export 了全部 50 个组件；
2. 打包器做 tree-shaking 的前提是"未用到的模块没有副作用"——`package.json` 里 `"sideEffects": false` 就是这个承诺。没有它，打包器**不敢删**任何模块（删除可能改变行为），全量 50 个组件的 JS 全进包；
3. css 文件路线下，样式必须与组件**同目录同文件级联**（`button/index.tsx` 里 `import './style.css'`）：Button 活下来它的 css 跟着活，Button 被摇掉 css 也跟着摇掉——按需自动成立；
4. 若库里存在"必须无条件生效"的样式（reset、字体声明），`sideEffects: false` 会连它们一起摇掉——此时用数组形式把例外声明出来。

```json
// package.json —— 样式与组件同目录级联时的标准声明
{
  "name": "my-ui",
  "module": "es/index.js",
  "sideEffects": false
}
```

```json
// package.json —— 带全局样式的库：数组形式，"这些路径有副作用，别摇"
{
  "name": "my-ui",
  "module": "es/index.js",
  "sideEffects": ["**/*.css", "./es/global.js"]
}
```

**cssinjs 为什么"天然按需"**：它没有独立 css 产物——样式是组件 JS 的一部分，渲染哪个组件才生成哪段样式、挂到 `<head>`；没渲染的组件既不进 bundle 以外的任何地方，也不产生 CSS。代价就是 A9.2 的运行时成本与 SSR 抽取步骤。**css 文件路线则是"构建期全量产物 + 靠 tree-shaking 按需"**：`sideEffects` 声明是命门——antd v4 时代全量 less 与 `babel-plugin-import`（把 `import { Button }` 改写成 `import Button from 'antd/es/button'` + 样式引入）就是没有 cssinjs 之前的工程答案；v5 换 cssinjs 后插件退役，是两种路线兴衰的最佳注脚。

验证按需是否真的生效（别信文档，信产物）：

```bash
# 业务项目构建后，检查产物中是否存在"未被引用组件"的样式痕迹
npx vite build
grep -l "ui-pagination" dist/assets/*.css || echo "Pagination 未被引用，样式已按需剔除"

# 再对照：把 sideEffects 改成不声明，重复构建，看产物体积差（通常差数倍）
```

### A9.5 常见坑

1. **暗色主题白闪一瞬**。症状：刷新暗色站先白后黑。根因：主题在 React 挂载后才切类名。修法：A9.3 的内联脚本抢首帧；`<html>` 上加 `suppressHydrationWarning`（若走 SSR，dataset 属性双端可能不同——见 A7.4 表格第 3 行的取舍）。
2. **cssinjs 在 RSC（Server Components）里报错**。症状：Next.js App Router 服务端组件直接渲染 antd 组件报 `window is not defined` 或样式失效。根因：cssinjs 与浏览器/客户端渲染耦合。修法：组件库组件标注 `"use client"` 边界，antd 官方在 Next.js 集成文档里同因——这也是 2023 年后社区重新偏爱"零运行时样式"的现实推动力。
3. **tailwind-merge 对不了自定义类**。症状：消费者传的 `p-6` 没能覆盖库里的 `p-3`。根因：库里混用了非 Tailwind 类（`panel-pad-md`）与原子类，twMerge 只认 Tailwind 类组。修法：库内样式统一走原子类（可封装成语义别名），或自定义 `extendTailwindMerge` 注册自己的类组。
4. **`sideEffects: false` 后全局样式丢了**。症状：升级库后 reset 样式消失、页面错乱。根因：A9.4 第 4 步——全局样式被当副作用摇掉。修法：改成数组声明；或把 reset 拆成独立入口（`import 'my-ui/reset.css'`）让业务显式引入。

# Part B：组件清单（按功力分级）

Part A 练的是"内功"——受控双模式、弹层体系、退出动画双状态机、焦点管理这些**所有组件共享的硬技术**。Part B 换一个视角：把一个真实组件库里最常见的组件排成一张功力清单，逐个拆解"把它做对需要哪些考点"。分级不是难度排行榜，而是**学习顺序**：

- **Lv1 基础组件**：逻辑简单，但每一行代码都在考布局模型、字体度量、包工程化这些"地基知识"。写不好 Lv1 的人，写 Lv3 时翻的也是同样的车，只是更难定位。
- **Lv2 弹层与反馈组件**：Part A 内功的集中消费点。Modal、Toast、Tooltip 每一个都是 Portal + 退出动画 + 键盘 + aria 的综合体，也是面试被问得最多的层。
- **Lv3 复杂交互组件**（下一片段）：Select、DatePicker、Table、Tree——状态机与虚拟滚动的硬战场。
- **Lv4 范式之争**：组件之上的认知（全样式库 / Headless / 复制粘贴式）。

星级（★★★）表示"面试与生产环境中该组件的考点密度"，★★★ 最高。每个组件按统一结构展开：**考点 → 逐个考点的实现（机制 + 代码）→ 常见坑（症状 → 根因 → 修法）**。所有代码为 TypeScript + React 19（`ref` 直接作为 prop，不再需要 `forwardRef`），并标注复用了 Part A 的哪一项内功。读者只读本片段即可理解，遇到与前文交叉的概念会在首次出现处给一句最小解释。

---

## Lv1 基础组件（打地基，练细节功力）

| 组件 | 考点 |
|---|---|
| **Button** | loading 时保持宽度防抖动；防重复点击（loading 期间 disabled）；波纹效果原理（antd Wave：一次性伪元素动画）；**中文双字自动加空格**（"确 定"，antd 的经典细节） |
| **Icon** | SVG 组件化、`fill: currentColor` 继承文字色、tree-shaking 按需引入 |
| **Typography** | 单行/多行省略（line-clamp）+ **溢出才显示 Tooltip**（JS 测量 scrollWidth） |
| Grid/Space/Divider | 响应式 gutter token 化 |

> Lv1 考的不是难，是**细节洁癖**——按钮 loading 宽度抖动这种 1px 问题最能区分功力。

这四行表格 + 一句 blockquote 就是 Lv1 的全部大纲。下面逐行展开：Button 四个考点每个都能写一节；Icon 考的是"一个组件如何变成一个 npm 包"的工程功力；Typography 的"溢出才显示 Tooltip"是测量类需求的标准范式；Grid/Space/Divider 考响应式 token 的设计感。最后回到那句 blockquote，论证为什么"Lv1 考的是细节洁癖"。

### Lv1-1 Button：把最常用的组件做到无可挑剔

Button 是组件库的门面——用户每天点几千次，任何 1px 的抖动都会被感知为"廉价"。它有四个考点，逐个展开。

#### 考点一：loading 时保持宽度防抖动（两种实现）

**症状**：点击"提交"按钮 → spinner 出现 → 文字被替换/挤掉 → 按钮宽度先变宽或变窄，几百毫秒后再回来。视觉上按钮"跳了一下"。

**根因**：按钮宽度默认由内容决定（`width: auto`）。loading 态的内容（spinner + "加载中…" 或仅 spinner）与原内容（"提 交"）宽度不同，浏览器在两个内容宽度之间切换。

**修法 A：min-width 预量**——在进入 loading 之前，把按钮的"自然宽度"量出来焊死为 `min-width`；退出 loading 后释放，允许按钮随内容继续伸缩。关键在于**测量时机**：必须测量"非 loading 态"的宽度。如果在 `loading` 变为 `true` 之后的 `useLayoutEffect` 里才量，DOM 已经换成了 spinner 内容，量到的是错误值。正确做法是**空闲期持续记录**：

```tsx
// useStableWidth.ts —— 空闲期记录自然宽度，loading 期间作为 min-width 焊死
import { useLayoutEffect, useRef, useState } from 'react';

export function useStableWidth<T extends HTMLElement>(loading: boolean) {
  const ref = useRef<T>(null);
  const [idleWidth, setIdleWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || loading) return;

    // 空闲期：记录当前自然宽度（内容变化、字体加载都会触发重记）
    const record = () => setIdleWidth(node.offsetWidth);
    record();
    const ro = new ResizeObserver(record); // 容器/字体变化导致按钮自身变宽时同步
    ro.observe(node);
    return () => ro.disconnect();
  }, [loading]);

  // loading 期间返回焊死的 min-width；空闲期返回 undefined 让内容自然伸缩
  const minWidth = loading ? idleWidth : undefined;
  return [ref, minWidth] as const;
}
```

注意 `record` 在 `loading` 仍为 `false` 的最后一个 layout effect 里执行——此时 DOM 还是旧内容，量到的是正确值；`loading` 翻 `true` 后 effect 因依赖变化被跳过（`if (loading) return`），`idleWidth` 保留。

**修法 B：固定占位 span**——loading 时不删除原内容，而是让它**不可见但继续占位**，spinner 绝对定位覆盖在按钮中央：

```tsx
// 方案 B：占位 span 保宽保高，spinner 覆盖层居中
<button className="xx-btn">
  {/* loading 时内容 visibility:hidden——仍参与布局，宽度不变 */}
  <span className="xx-btn-content" style={loading ? { visibility: 'hidden' } : undefined}>
    {children}
  </span>
  {loading && (
    <span className="xx-btn-loading-layer" aria-hidden="true">
      <span className="xx-btn-spinner" />
    </span>
  )}
</button>
```

```text
.xx-btn          { position: relative; }
.xx-btn-loading-layer {
  position: absolute; inset: 0;      /* 覆盖整个按钮 */
  display: flex; align-items: center; justify-content: center;
}
.xx-btn-spinner  { width: 1em; height: 1em; border: 2px solid currentColor;
                   border-right-color: transparent; border-radius: 50%;
                   animation: xx-spin 0.8s linear infinite; }
@keyframes xx-spin { to { transform: rotate(360deg); } }
```

两种方案对比：

| 方案 | 优点 | 缺点 |
|---|---|---|
| A：min-width 预量 | DOM 干净；退出 loading 无闪动 | 多一个 hook + ResizeObserver；极端情况下字体后加载导致预量偏小 |
| B：占位 span | 零测量、绝对稳（宽度物理上不可能变） | 多两层 span；按钮内容必须是"能整体隐藏"的节点 |

工程实践：内容固定的操作按钮（"提交"/"保存"）用 B 最稳；内容动态（含图标、插槽）用 A 更通用。两者都成立的共同原理是：**宽度由一个不随 loading 变化的东西兜底**——要么是量出来的 min-width，要么是仍在布局流里的隐藏内容。

#### 考点二：loading 期间 disabled 防重复点击（时序）

需求是三件事的联动：点击 → 异步执行期间按钮进入 loading 且**不可再点** → 完成后恢复。第一版通常这么写：

```tsx
// 反例：disabled 依赖 React 重渲染，存在竞态窗口
function SubmitButton({ onClick }: { onClick: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}  // ← 问题在这
      onClick={async () => {
        setLoading(true);
        await onClick();
        setLoading(false);
      }}
    >
      提交
    </button>
  );
}
```

**症状**：快速双击仍会发出两次请求。

**根因是时序，不是代码写错**：`setLoading(true)` 只是把状态放进队列，React 18+ 的自动批处理要等事件处理器返回后才重渲染、才把 `disabled` 属性写到 DOM 上。而原生 `<button disabled>` 的防点击是**浏览器在事件分发阶段检查 DOM 属性**——属性还没写上去，同一事件循环里紧跟着的第二击照常触发 `click`。`disabled={loading}` 防的是"渲染之后的连点"，防不了"渲染之前的连点"。

**修法：同步 ref 守卫 + disabled 双保险**——ref 写入是同步生效的，不依赖重渲染：

```tsx
// SubmitButton.tsx —— 同步守卫 + 异步 loading 双保险
import { useRef, useState } from 'react';

interface SubmitButtonProps
  extends React.ComponentPropsWithRef<'button'> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown | Promise<unknown>;
}

export function SubmitButton({ onClick, children, disabled, ...rest }: SubmitButtonProps) {
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(false); // 同步守卫：事件处理器内立即生效

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (pendingRef.current) return;           // 第二击在重渲染前到达，这里直接吞掉
    pendingRef.current = true;
    setLoading(true);                          // 触发重渲染 → disabled 上 DOM（异步生效）
    try {
      await onClick?.(e);                      // 支持返回 promise 的 onClick
    } finally {
      pendingRef.current = false;
      setLoading(false);                       // 无论成败都复位——忘记 finally 是"永久 loading"的头号根因
    }
  };

  return (
    <button disabled={disabled || loading} onClick={handleClick} {...rest}>
      {loading ? '处理中…' : children}
    </button>
  );
}
```

时序图说清两道防线各自拦哪一刀：

```text
用户双击（间隔 < 一帧）
  click#1 ──→ handleClick：pendingRef=false → 通过 → pendingRef=true, setLoading(true)
              （React 批处理：本事件处理器返回后才重渲染）
  click#2 ──→ handleClick：pendingRef=true → return   ← 第一道防线（同步 ref，总有效）
  ~~~~~~~~~~ React commit：disabled 属性写上 DOM ~~~~~~~~~~
  click#3 ──→ 浏览器事件分发见 button[disabled] → 不派发 click ← 第二道防线（重渲染后）
```

工程细节两条：第一，若业务方**受控**传入 `loading`（自己管理异步），组件只做 `disabled={disabled || loading}`，守卫交给业务——但要在文档里写明"loading 期间组件视为 disabled"；第二，`type="submit"` 的按钮在表单里连点还会重复触发 `form` 的 submit 事件，防重复提交要在表单层再加一道（见《react-学习大纲.md》阶段 4.1 表单）。

#### 考点三：波纹效果原理（antd Wave：一次性动画）

Material 风格的"点击涟漪"人人会写，写**对**的很少。antd 的 Wave 是教科书，分 v4 与 v5 两代实现，原理一脉相承：**点击时在按钮上叠加一个一次性的、播完即自我销毁的动画层**——大纲里叫"一次性伪元素动画"。

先说机制层面的三个关键认知，再看代码：

1. **为什么不用真的 CSS `::after` 伪元素**：伪元素无法由 JS 精确控制生命周期——"每次点击都重播一次"需要先把动画类移除、强制回流（`void node.offsetWidth`）、再加回来，三步缺一不可；而且伪元素颜色无法按按钮主题动态设置（除非借 `currentColor`）。所以两代 antd 都选择**动态创建一个真实节点**当"伪元素"用。
2. **动画的是什么属性**：不是 `transform: scale()`，而是 `box-shadow` 的扩散——`box-shadow: 0 0 0 0 currentColor` 过渡到 `0 0 0 6px currentColor`，同时 `opacity` 从 0.2 淡到 0。box-shadow 不触发 layout、不干扰内容、天然继承按钮的 `border-radius` 视觉。antd v5 源码（`components/_util/wave/style.ts`）的关键片段：

```text
/* antd v5 Wave 样式（节选） */
[componentCls]: {
  position: 'absolute',
  background: 'transparent',
  pointerEvents: 'none',
  color: varRef('color', colorPrimary),   /* 波纹色走 CSS 变量，默认主色 */
  boxShadow: '0 0 0 0 currentcolor',
  opacity: 0.2,
  '&.wave-motion-appear': {
    transition: 'box-shadow 0.4s <ease-out-circ>, opacity 2s <ease-out-circ>',
    '&-active': { boxShadow: '0 0 0 6px currentcolor', opacity: 0 },
  },
}
```

3. **颜色从哪来**：antd 的 `getTargetWaveColor` 读取按钮的 `getComputedStyle`，按 `borderTopColor → borderColor → backgroundColor` 的顺序取第一个"有效色"（跳过白色与所有透明色——默认按钮边框是白/透明时不能拿它当波纹色，否则白底上完全看不见）。

教学版完整实现（约 60 行，机制与 antd 一致，实现更直白）：

```tsx
// useWave.ts —— 一次性波纹：点击时插入动画节点，animationend 后自我销毁
import { useEffect, useRef } from 'react';

/** 取波纹色：边框色优先，白/透明色跳过（对齐 antd getTargetWaveColor 的取舍） */
function getWaveColor(node: HTMLElement): string {
  const style = getComputedStyle(node);
  const candidates = [style.borderTopColor, style.borderColor, style.backgroundColor];
  const invalid = (c: string | undefined) =>
    !c || c === 'transparent' ||
    /^#fff(fff)?$/i.test(c) || c === 'rgb(255, 255, 255)' ||
    /rgba\(.+, 0\)$/.test(c);
  return candidates.find((c) => !invalid(c)) ?? 'currentColor';
}

function playWave(target: HTMLElement) {
  if (target.hasAttribute('disabled')) return; // disabled 按钮不播波纹

  const wave = document.createElement('span');
  wave.className = 'xx-wave';
  wave.style.color = getWaveColor(target);
  target.appendChild(wave);
  // 一次性：动画播完自我销毁，不依赖外部清理（连点时多个波纹自然叠加，antd v5 同样允许叠加）
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
}

export function useWave<T extends HTMLElement>(disabled?: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;
    const onClick = () => playWave(node);      // 原生监听：disabled 时浏览器不派发 click，天然跳过
    node.addEventListener('click', onClick);
    return () => node.removeEventListener('click', onClick);
  }, [disabled]);
  return ref;
}
```

```text
.xx-wave {
  position: absolute;
  inset: 0;                        /* 覆盖宿主按钮 */
  border-radius: inherit;          /* 跟随按钮圆角——伪元素方案最难做到的一点 */
  pointer-events: none;            /* 不挡点击 */
  box-sizing: border-box;
  opacity: 0.2;
  box-shadow: 0 0 0 0 currentColor;
  animation: xx-wave-motion 0.4s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
}
@keyframes xx-wave-motion {
  to { box-shadow: 0 0 0 6px currentColor; opacity: 0; }
}
/* 宿主按钮需要 position: relative 让 .xx-wave 定位到自己 */
```

antd v5 的真实实现比教学版多了三处工程化，值得知道：它用 `requestAnimationFrame` 把同一帧内的多次点击合并成一次波纹（`useWave.ts` 的 `showDebounceWave`）；波纹层是一个真正的 React 组件 `WaveEffect`，用 `rc-util` 的 `render`（内部即 `createRoot`）挂进一个临时 `holder div`，并配 `ResizeObserver` 在动画期间跟随按钮尺寸变化；动画结束的判定监听的是 `transitionEnd` 且 `propertyName === 'opacity'`（box-shadow 在部分浏览器不派发 transitionend），之后 `unmount + holder.remove()` 双清。一代（v4）则是"加类名 + 强制回流重启 + 插入 `.ant-click-animating-node`"，若你要兼容极旧浏览器可回退到该方案。

#### 考点四：中文双字自动加空格（isTwoCNChar）

antd 的经典细节：两个汉字的按钮文案自动渲染成"确 定"。根因在字形度量：拉丁字母两侧有 side bearing（天然留白），而 CJK 字形是满宽的方块，两个汉字直接排在一起视觉上"贴死了"。三个及以上汉字反而有节奏感，**恰好只有两个时最挤**——所以规则精确匹配"恰好两个 CJK 字符"：

```tsx
// twoCNChar.ts —— 恰好两个 CJK 字符才插入空格
import * as React from 'react';

/** 基本区汉字（U+4E00–U+9FA5），antd 同款正则 */
const TWO_CJK_RE = /^[\u4e00-\u9fa5]{2}$/;

export function isTwoCNChar(str: string): boolean {
  return TWO_CJK_RE.test(str);
}

/**
 * 子节点为"恰好两个汉字的纯文本"时，在两字之间插入空格。
 * needInserted：仅当按钮没有图标、文本是唯一子节点时才处理（带图标的按钮视觉已不挤）。
 */
export function insertSpace(
  children: React.ReactNode,
  needInserted: boolean,
): React.ReactNode {
  if (!needInserted) return children;

  if (typeof children === 'string' && isTwoCNChar(children)) {
    return <span>{children.slice(0, 1)} {children.slice(1)}</span>; // "确定" → "确 定"
  }
  // 子节点是包裹了纯文本的元素（如 <span>确定</span>）：递归处理其 children
  if (React.isValidElement(children) && typeof children.props.children === 'string'
      && isTwoCNChar(children.props.children)) {
    return React.cloneElement(
      children, {},
      insertSpace(children.props.children, needInserted),
    );
  }
  return children;
}
```

两个工程决策要交代。第一，**全局开关**：这种排版干预未必符合所有团队口味，antd 把它挂在 ConfigProvider 的 `config.button.autoInsertSpace` 下（默认开，可关）——凡是"替用户做主"的行为都必须留开关。第二，**判定边界**：正则只覆盖基本区汉字，扩展 A 区（U+3400–U+4DBF）、兼容汉字都不匹配——antd 也如此，属于已知取舍，中文简体按钮文案 99.9% 落在基本区。

#### 合体：完整的 Button 组件

四个考点合并（占位 span 方案保宽 + 同步守卫 + Wave + 两字空格）：

```tsx
// Button.tsx —— React 19：ref 直接作为 prop
import * as React from 'react';
import { useWave } from './useWave';
import { insertSpace } from './twoCNChar';

export type ButtonType = 'primary' | 'default' | 'danger' | 'link';
export type ButtonSize = 'large' | 'middle' | 'small';

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  type?: ButtonType;
  size?: ButtonSize;
  loading?: boolean | { delay?: number };
  /** 恰好两个汉字时是否自动加空格，默认 true（对应 antd config.button.autoInsertSpace） */
  autoInsertSpace?: boolean;
}

export function Button(props: ButtonProps) {
  const {
    type = 'default', size = 'middle', loading = false,
    autoInsertSpace = true, disabled, children, className, onClick, ...rest
  } = props;
  const isLoading = typeof loading === 'object' ? true : loading; // 延迟 loading 见文末坑 4

  const waveRef = useWave<HTMLButtonElement>(disabled || isLoading);

  // 考点二：同步守卫（pendingRef）+ disabled 双保险
  const pendingRef = React.useRef(false);
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      await onClick?.(e);
    } finally {
      pendingRef.current = false;
    }
  };

  // 考点四：仅纯文本、无图标时做两字空格
  const needSpace = autoInsertSpace && typeof children === 'string';
  const kids = needSpace ? insertSpace(children, true) : children;

  return (
    <button
      ref={waveRef}
      type="button"
      className={`xx-btn xx-btn-${type} xx-btn-${size} ${className ?? ''}`}
      disabled={disabled || isLoading}   // 考点二第二道防线
      onClick={handleClick}
      {...rest}
    >
      {/* 考点一：占位 span——loading 时隐藏但保宽 */}
      <span className="xx-btn-content" style={isLoading ? { visibility: 'hidden' } : undefined}>
        {kids}
      </span>
      {isLoading && (
        <span className="xx-btn-loading-layer" aria-hidden="true">
          <span className="xx-btn-spinner" />
        </span>
      )}
    </button>
  );
}
```

波纹的 `position: relative` 与样式收敛进 `xx-btn` 的基础样式即可（见上文 `.xx-wave` 注释）。至此 Button 82 行，覆盖大纲全部四个考点。

#### Button 常见坑

**坑 1：loading 宽度抖动**
症状：点提交按钮跳一下。根因：内容宽度变化，见考点一。修法：min-width 预量或占位 span，二选一。

**坑 2：双击仍发两次请求**
症状：网络面板两条 POST。根因：`disabled` 依赖重渲染，同一事件循环内的第二击绕过了它（考点二的时序）。修法：事件处理器内同步 ref 守卫。

**坑 3：loading 永不复位**
症状：按钮卡在"处理中"。根因：`await onClick()` 抛异常时 `setLoading(false)` 未执行。修法：`try/finally`；若 loading 受控于业务方，文档必须写明"失败路径也要复位"。

**坑 4：loading 延迟**
症状：50ms 就完成的请求也闪一下 spinner，快速操作时按钮闪烁。修法：支持 `loading={{ delay: 300 }}`——300ms 内完成的请求不进 loading 态。实现：`useEffect` + `setTimeout(delay)` 把 `loading` 延迟镜像到内部 state，清理函数取消定时器。这是 antd 同名能力的核心。

**坑 5：波纹按钮圆角处穿帮**
症状：波纹是方的、按钮是圆的。根因：波纹层没有继承宿主圆角。修法：`.xx-wave { border-radius: inherit }`，且宿主必须有 `position: relative`（否则波纹定位到更外层）。

### Lv1-2 Icon：SVG 组件化与按需加载

Icon 表面是"把 SVG 塞进组件"，实际考两件事：**SVG 如何融入 React 的 props/样式体系**，以及**一个组件库如何组织产物让 tree-shaking 真正生效**。

#### 考点一：SVG 组件化模板（props 透传 / currentColor / 尺寸）

先看一个不合格的写法：把设计师给的 SVG 原样粘贴成组件——写死 `fill="#666"`、写死 `width="24"`、没有事件透传。合格版本要满足四条契约：

1. **props 全透传**：`{...rest}` 到 `<svg>` 上，让消费者能加 `className`、`onClick`、`aria-*`；
2. **颜色继承文字色**：内部元素不写死 `fill` 颜色值，统一 `fill="currentColor"`，Icon 颜色随上下文 `color` 走——按钮 hover 变色时图标自动跟随；
3. **尺寸跟字号**：`width/height` 默认 `1em`，图标随 `font-size` 缩放，与文字基线天然对齐；
4. **无障碍默认值**：装饰性图标 `aria-hidden` + `focusable="false"`（IE/旧 Edge 的 SVG 焦点 bug 遗产，保留无害）。

```tsx
// CheckIcon.tsx —— 单个图标的组件模板
import * as React from 'react';

export interface IconBaseProps extends React.ComponentPropsWithRef<'svg'> {
  size?: number | string;
}

// 通用模板：所有图标共用，保证行为一致
function IconBase({ size = '1em', width, height, children, ...rest }: IconBaseProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 24 24"       // viewBox 保留：等比缩放的依据，绝不能删
      fill="currentColor"       // 颜色继承文字色（描边类图标则用 stroke="currentColor"）
      aria-hidden="true"        // 装饰性图标对读屏隐藏；表意图标由消费者覆盖 aria-label
      focusable="false"
      {...rest}                 // className/onClick/style/data-* 全透传
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconBaseProps) {
  return (
    <IconBase {...props}>
      {/* path 上不写任何 fill —— 继承 svg 的 currentColor */}
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </IconBase>
  );
}
```

React 对 SVG 属性用 camelCase：`stroke-width` 要写成 `strokeWidth`、`stroke-linecap` 写成 `strokeLinecap`。这是 JSX 与 HTML 序列化的差异，不是 bug。

`currentColor` 是这套设计的支点：CSS 的 `color` 属性值可以被 `fill/stroke` 关键字引用，于是"danger 按钮里的图标自动变红"零 CSS 即可达成：

```text
.xx-btn-danger { color: #ff4d4f; }   /* 文字与图标同时变红，无需给图标单独写色 */
```

#### 考点二：tree-shaking 按需引入的 ESM 组织方式

图标库动辄上千个图标，如果 `import { CheckIcon } from 'xx-icons'` 会把 1000 个 SVG 全打进 bundle，组件库就废了。按需加载不是"使用者的自觉"，而是**库作者的产物组织纪律**。三条规则：

**规则一：每个图标一个模块文件，barrel 只做 re-export。**

```text
src/
  icons/
    CheckIcon.tsx
    CloseIcon.tsx
    SearchIcon.tsx
    ...（每个图标独立文件）
  IconBase.tsx
  index.ts            ← barrel：仅 re-export，不含任何实现与副作用
```

```ts
// index.ts —— 纯 re-export，一行实现都没有
export { CheckIcon } from './icons/CheckIcon';
export { CloseIcon } from './icons/CloseIcon';
export { SearchIcon } from './icons/SearchIcon';
export type { IconBaseProps } from './IconBase';
```

**规则二：`package.json` 必须同时声明 ESM 产物与 `sideEffects`。** tree-shaking 的两个前提——静态可分析（ESM 的 import/export 是编译期确定，CJS 的 require 是运行时）与无副作用声明（打包器需要知道"删掉这个 export 不会改变程序行为"）：

```json
{
  "name": "xx-icons",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

`sideEffects: false` 是按需加载的命门（Part C 工程化会展开）：它告诉打包器"未使用的 export 可以整模块内删除"。若库里有全局样式注入之类的副作用代码，就不能全局声明 false，而要精确到文件：`"sideEffects": ["**/*.css", "./dist/polyfill.js"]`。

**规则三：绝不提供"全量入口"的诱饵。** 常见反例是图标库提供一个 `import icons from 'xx-icons/all'` 聚合模块——它把一千个图标注册进一个对象，打包器无法按属性删除（对象属性访问是运行时行为），谁 import 谁全量。antd v4 的字体图标（`Icon.createFromIconfontCN` 全量加载字体文件）被 v5 的独立 SVG 图标（`@ant-design/icons` 每图标独立 ESM 模块）取代，正是同一条路。

验证方式：打包后搜索产物里是否包含未引入图标的 path 数据（如 `M9 16.17`）：

```bash
# 构建后 grep 未使用的图标特征 path——无输出说明 tree-shaking 生效
grep -r "M9 16.17" dist/assets/*.js | grep -v CheckIcon || echo "clean"
```

#### Icon 常见坑

**坑 1：图标颜色不听话**
症状：改 `color` 图标不变色。根因：path 上写死了 `fill="#666"`，优先级高于 svg 的 `currentColor`。修法：库内所有 path 一律不写 fill；消费者需要特殊色时用 CSS 覆盖（`.x svg path { fill: hotpink }`）或直接传 `fill` prop 到 svg 上。

**坑 2：按需引入失效，bundle 里全是图标**
症状：引了 3 个图标，产物里几千个。根因排查顺序：是否引了全量入口 → 库产物是否是 CJS → `sideEffects` 是否缺失或错误为 true。修法依次对应：删全量入口、构建器输出 ESM（tsup/father 配 `format: ['esm', 'cjs']`）、补 `sideEffects`。

**坑 3：图标与文字基线不齐**
症状：`<span>搜索<SearchIcon/></span>` 图标偏高。根因：inline SVG 默认 `vertical-align: baseline` 按字形基线排，而 1em 方块的字形重心在中部。修法：全局一行 `svg { vertical-align: -0.125em; }`（图标事实标准，ant-design/icons 同款）。

### Lv1-3 Typography：省略与"溢出才显示 Tooltip"

Typography 的考点表面是两段 CSS，真考点是**JS 测量**：CSS 能画省略号，但"现在到底有没有溢出"只有 JS 能回答，而这个问题决定了 Tooltip 该不该出现。

#### 考点一：单行/多行省略的 CSS

```text
/* 单行省略：四件套缺一不可 */
.xx-ellipsis {
  overflow: hidden;            /* 超出部分裁掉 */
  white-space: nowrap;         /* 不换行——没有它 scrollWidth 永远等于 clientWidth */
  text-overflow: ellipsis;     /* 裁掉的位置画省略号 */
  min-width: 0;                /* flex 子项陷阱：flex 子项默认 min-width:auto，溢出判定失效 */
}

/* 多行省略：-webkit-line-clamp 已进入标准，主流浏览器全绿 */
.xx-ellipsis-2 {
  display: -webkit-box;              /* 弹性盒的废弃前身，line-clamp 依赖它 */
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;             /* 第 2 行末尾画省略号 */
  overflow: hidden;
  word-break: break-all;             /* 中文长串/URL 需要断词配合，否则撑破不省略 */
}
```

`min-width: 0` 是最常被漏的一行：flex 子项默认 `min-width: auto`，内容宽度会成为下限，`overflow: hidden` 永远裁不到东西，省略号根本不出现——表格列里的"明明设了 ellipsis 却被撑开"基本都是它。

#### 考点二：溢出才显示 Tooltip 的 JS 测量（完整组件）

需求：文本省略后 hover 出 Tooltip 展示全文；**没省略就绝不弹**——弹一个内容与可见文本相同的 Tooltip 是负体验。CSS 无法表达"是否处于省略状态"这个条件，必须 JS 测量：

- 单行省略判定：`el.scrollWidth > el.clientWidth`（内容宽度超过可视宽度即被裁）；
- 多行 line-clamp 判定：`el.scrollHeight > el.clientHeight + 1`（+1 容忍亚像素舍入）。

测量必须挂在三个变化源上：**容器尺寸变**（ResizeObserver，注意要观察父级——RO 监听的是元素自身盒子，纯文本内容变化不改变盒子）、**窗口变**（resize，列宽跟随窗口时 RO 可能不触发）、**字体晚到**（web font 加载完成前用回退字体量出的宽度是错的，`document.fonts.ready` 后必须重测）。

```tsx
// Ellipsis.tsx —— 完整组件：CSS 省略 + JS 溢出判定 + 条件 Tooltip
import * as React from 'react';

/** 此处先以 antd Tooltip 为例；其内部机制（hover 延时/flip）在 Lv2 展开 */
import { Tooltip } from 'antd';

export interface EllipsisProps {
  /** 省略行数，1 为单行，>1 走 line-clamp */
  lineCount?: number;
  /** 溢出时是否显示 Tooltip，默认 true */
  tooltip?: boolean;
  children: string;
  className?: string;
  style?: React.CSSProperties;
}

function isOverflowing(el: HTMLElement, lineCount: number): boolean {
  // 单行看宽度，多行看高度——两者的"被裁"维度不同
  return lineCount === 1
    ? el.scrollWidth > el.clientWidth
    : el.scrollHeight > el.clientHeight + 1;
}

export function Ellipsis({
  lineCount = 1, tooltip = true, children, className, style,
}: EllipsisProps) {
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflowing(isOverflowing(el, lineCount));
  }, [lineCount]);

  React.useLayoutEffect(() => {
    measure(); // 首帧同步测：避免"先无 Tooltip 后有"的闪变

    // 源 1：容器尺寸变化——观察父级（自身盒子不随内容变）
    const parent = textRef.current?.parentElement;
    const ro = parent ? new ResizeObserver(measure) : null;
    if (parent && ro) ro.observe(parent);

    // 源 2：窗口变化
    window.addEventListener('resize', measure);

    // 源 3：web font 晚到——回退字体的度量是错的，字体就绪后重测
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, children]); // 内容变化 → 重新测量

  const text = (
    <span
      ref={textRef}
      className={lineCount === 1 ? 'xx-ellipsis' : `xx-ellipsis-${lineCount}`}
      style={style}
      title={undefined}
    >
      {children}
    </span>
  );

  // 条件渲染：只有"确实溢出"时才包 Tooltip
  return tooltip && overflowing ? <Tooltip title={children}>{text}</Tooltip> : text;
}
```

`document.fonts` 在 TS DOM lib 里类型为 `FontFaceSet`，`ready` 是 Promise——注意 `?.` 守卫旧环境（SSR 下本组件必须整体跑在 `useEffect` 侧，`measure` 在服务端不执行，`overflowing` 初值 false，hydration 一致）。

这个"CSS 表达 + JS 判定"的范式会再次出现在 Lv2 Tooltip 的"多行溢出自动触发"里——那时是 Tooltip 主动找 Ellipsis 联动，而不是 Ellipsis 包 Tooltip，两侧各留了组合点。

#### Typography 常见坑

**坑 1：省略号不出现**
症状：文本撑破容器。根因排序：`white-space: nowrap` 漏了（单行）/ flex 子项没 `min-width: 0` / 容器自身没有确定宽度约束（`width: auto` 的内联元素无界）。修法对应补齐。

**坑 2：Tooltip 有时弹有时不弹**
症状：同样的文案，慢网时不弹、刷新后弹。根因：字体未加载完成时测量偏小（回退字体窄），判定为"未溢出"。修法：`document.fonts.ready.then(measure)`，见上方代码源 3。

**坑 3：hover 即弹，即使没省略**
症状：短文本也弹 Tooltip。根因：无条件 `<Tooltip>` 包裹。修法：`overflowing` 条件渲染——这正是本考点的存在意义。

**坑 4：列表滚动时测量风暴**
症状：长列表百行 Ellipsis 滚动掉帧。根因：每行 ResizeObserver 回调里同步 setState，批量触发渲染。修法：`measure` 用 `requestAnimationFrame` 合帧（一帧只测一次）；或列表场景下沉为虚拟滚动 + 可视区测量（接 Lv3 VirtualList）。

### Lv1-4 Grid / Space / Divider：响应式 gutter 的 token 化设计

三个"布局原子"共用一个考点：**间距不写死，全部 token 化**——间距是设计系统里被改得最频繁的值（换设计稿先改间距），并且响应式布局要求它随断点变。

#### 考点：响应式 gutter（断点映射 CSS 变量）

antd 的 `gutter` 支持对象形式 `{ xs: 8, sm: 16, md: 24 }`。实现路线有两条，先看 antd 走的 JS 路线，再看更现代的 CSS 变量路线——大纲要求的是后者，因为它把"断点选择"从运行时 JS 移进了 CSS。

**路线一（antd 的做法）：matchMedia + useBreakpoint。** antd Grid 内部用 `responsiveObserver` 监听全部断点的 `matchMedia`，`useBreakpoint()` 返回 `{ xs: true, sm: false, ... }`，Row 据此在 JS 里算出**当前断点应取的 gutter 数值**，写入 inline style。缺点：JS 运行时参与布局、SSR 首帧不知道断点（首屏 gutter 可能跳一下）、断点切换走 React 渲染。

**路线二（token 化 CSS 变量）：JS 只下发"每个断点的值"，断点选择交给 CSS media query。** Row 把 gutter 对象的每个值写成一个 CSS 变量，一段静态 CSS 按断点"挑选"变量：

```tsx
// Row.tsx / Col.tsx —— gutter 对象 → CSS 变量；断点挑选交给 CSS
import * as React from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type Gutter = number | Partial<Record<Breakpoint, number>>;

/** 断点阈值与 antd 对齐：576/768/992/1200/1600 */
export const BREAKPOINT_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

export interface RowProps extends React.ComponentPropsWithRef<'div'> {
  gutter?: Gutter;
}

export function Row({ gutter = 0, style, ...rest }: RowProps) {
  const rowStyle = { ...style } as React.CSSProperties;

  if (typeof gutter === 'number') {
    rowStyle['--gutter'] = `${gutter}px`;       // 单值：所有断点共用
  } else {
    for (const bp of BREAKPOINT_ORDER) {
      const v = gutter[bp];
      if (v !== undefined) rowStyle[`--gutter-${bp}`] = `${v}px`; // 逐断点下发 token
    }
  }

  return <div className="xx-row" style={rowStyle} {...rest} />;
}

export interface ColProps extends React.ComponentPropsWithRef<'div'> {
  span?: number; // 24 栅格
}

export function Col({ span = 24, style, ...rest }: ColProps) {
  const pct = `${(span / 24) * 100}%`;
  return (
    // flex-basis + max-width 双保险：容器收缩时也不超过配额
    <div className="xx-col" style={{ flex: `0 0 ${pct}`, maxWidth: pct, ...style }} {...rest} />
  );
}
```

```text
/* 断点挑选链：从小到大逐级覆盖，未定义的断点回退到更小的断点值 */
.xx-row { display: flex; flex-wrap: wrap; column-gap: var(--gutter, var(--gutter-xs, 0px)); }
@media (min-width: 576px) { .xx-row { column-gap: var(--gutter-sm, var(--gutter-xs, var(--gutter, 0px))); } }
@media (min-width: 768px) { .xx-row { column-gap: var(--gutter-md, var(--gutter-sm, var(--gutter, 0px))); } }
@media (min-width: 992px) { .xx-row { column-gap: var(--gutter-lg, var(--gutter-md, var(--gutter, 0px))); } }
@media (min-width: 1200px) { .xx-row { column-gap: var(--gutter-xl, var(--gutter-lg, var(--gutter, 0px))); } }
@media (min-width: 1600px) { .xx-row { column-gap: var(--gutter-xxl, var(--gutter-xl, var(--gutter, 0px))); } }
```

机制的精髓：**inline style 只能设"无条件的值"，但 CSS 变量的"取值"可以被 media query 重新选择**——`column-gap: var(--gutter-sm, var(--gutter, 0px))` 在 sm 及以上取 `--gutter-sm`，没传就沿 fallback 链下落。于是断点切换零 JS、SSR 首帧即正确、`prefers-reduced-motion` 等媒体特性也能叠加进同一条链。这就是"断点映射 CSS 变量"的 token 化设计：JS 管语义（下发 token），CSS 管环境（挑选 token）。

Space 与 Divider 复用同一套间距 token。Space 是"行内项目间距"，语义是 `gap`；Divider 是"分隔内容的线"，间距语义是两侧留白：

```tsx
// Space.tsx —— 尺寸 token 化 + 方向 + 自动对齐
import * as React from 'react';

const SPACE_SIZE = { small: 8, middle: 16, large: 24 } as const;
export type SpaceSize = keyof typeof SPACE_SIZE | number;

export interface SpaceProps extends React.ComponentPropsWithRef<'div'> {
  size?: SpaceSize | [SpaceSize, SpaceSize]; // 支持横向/纵向二元组
  direction?: 'horizontal' | 'vertical';
  align?: 'start' | 'end' | 'center' | 'baseline';
  wrap?: boolean;
  split?: React.ReactNode; // 项目间的分隔元素（如 <Divider type="vertical" />）
}

export function Space({
  size = 'middle', direction = 'horizontal', align, wrap, split, children, style, ...rest
}: SpaceProps) {
  const [h, v] = Array.isArray(size) ? size : [size, size];
  const gap = (s: SpaceSize) => (typeof s === 'number' ? s : SPACE_SIZE[s]);

  const items = React.Children.toArray(children);
  return (
    <div
      className="xx-space"
      style={{
        display: 'inline-flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        flexWrap: wrap ? 'wrap' : undefined,
        alignItems: align ?? (direction === 'horizontal' ? 'center' : undefined),
        rowGap: `${gap(v)}px`,
        columnGap: `${gap(h)}px`,
        ...style,
      }}
      {...rest}
    >
      {/* split 注入项目之间而非两端：map + key 的标准手法 */}
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && split}
          {item}
        </React.Fragment>
      ))}
    </div>
  );
}
```

```tsx
// Divider.tsx —— 带文字的水平分隔线 / 垂直分隔线
import * as React from 'react';

export interface DividerProps extends React.ComponentPropsWithRef<'div'> {
  type?: 'horizontal' | 'vertical';
  orientation?: 'left' | 'center' | 'right'; // 文字位置（仅水平 + 有 children 时生效）
  dashed?: boolean;
  children?: React.ReactNode;
}

export function Divider({
  type = 'horizontal', orientation = 'center', dashed, children, className, ...rest
}: DividerProps) {
  const cls = [
    'xx-divider', `xx-divider-${type}`,
    dashed ? 'xx-divider-dashed' : '',
    children ? `xx-divider-with-text-${orientation}` : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} role="separator" {...rest}>
      {children && <span className="xx-divider-text">{children}</span>}
    </div>
  );
}
```

```text
.xx-divider-horizontal {
  margin: 16px 0;                    /* 间距 token：上下留白与 Space.middle 对齐 */
  border-top: 1px solid #e5e7eb;     /* 颜色应取主题 token（Part A9），此处示意 */
}
.xx-divider-dashed { border-top-style: dashed; }
.xx-divider-vertical {
  display: inline-block;
  width: 1px; height: 0.9em;         /* 0.9em：随字号缩放，视觉上与文字等高 */
  margin: 0 8px; vertical-align: middle;
  background: #e5e7eb;
}
/* 带文字：两侧用 border-bottom 的伪元素画线，文字绝对定位——避免 flex 换行破坏 */
.xx-divider-with-text-left  { position: relative; text-align: left; }
.xx-divider-text { padding: 0 8px; background: #fff; position: relative; z-index: 1; }
```

#### Grid/Space/Divider 常见坑

**坑 1：Row 嵌套 Row，内层 gutter 不对齐**
症状：内层栅格与外层列内容错开半个 gutter。根因：`column-gap` 方案中内层 Row 的起点是外层 Col 的内容盒，天然已含外层 gutter 的一半。修法：嵌套场景内层 `gutter` 设为外层一半并给 Col 加负 margin 归位；或约定"嵌套时内层不再设 gutter"。

**坑 2：CSS 变量 calc 里单位丢失**
症状：`column-gap: var(--gutter-sm, 0px)` 不生效，控制台 invalid property。根因：JS 侧把 `8` 直接赋给变量（`--gutter-sm: 8`），无单位数值不能用于长度上下文。修法：下发时永远 `${v}px`（见 Row 代码）。

**坑 3：垂直 Divider 撑满行高**
症状：vertical divider 高度和整行一样。根因：`height` 写了具体值但父级是 flex 拉伸。修法：`height: 0.9em` + `align-self: center`，或交给父容器 `align-items: center`。

### 展开：为什么说"Lv1 考的不是难，是细节洁癖"

回到大纲这句 blockquote，把它论证透。

**第一，Lv1 的每个问题都指向一块地基知识，而不是一个孤立技巧。** 按钮 loading 抖动背后是"内容决定宽度"的盒模型与"React 渲染是异步的"这两个底层事实的叠加；两字空格背后是 CJK 字形度量；省略号不出现背后是 flex 的 `min-width: auto`；gutter 断点跳动背后是"JS 运行时布局 vs CSS 声明式布局"的取舍。修好一个 Lv1 问题 = 真正掌握一块地基；背下十个组件 API = 什么都没掌握。这就是"细节洁癖"的教育价值：细节藏不了假。

**第二，用户对"低级感"的容忍度远低于对功能缺失的容忍度。** 按钮跳一下、提示框弹两次、省略号时有时无——用户说不出哪里不对，但会得出"这系统不专业"的结论。复杂功能缺失是"能力问题"，可以等迭代；细节抖动是"态度问题"，直接折损信任。产品观上，Lv1 决定组件库的第一印象。

**第三，面试信号的角度。** Lv3 组件（如 Select）的难点可以靠准备覆盖，而"你的 loading 按钮为什么会抖"这类追问现场暴露真实功力——因为修它需要同时理解渲染时序、盒模型和测量时机，三者缺一就答不完整。面试官用 Lv1 细节区分"用过组件库"和"能写组件库"，性价比极高。

**第四，antd 的护城河正是这类细节的密度。** Wave 的颜色 fallback 链、两字空格的全局开关、Avatar 的字号缩放、Icon 的 `vertical-align: -0.125em`……单看每一个都不难，难的是几百个细节同时在线、彼此风格一致、并且向后兼容多年。自研组件库追平 antd 的功能列表或许只要几个月，追平这些细节以年计。做组件库时，先接受"细节密度就是核心竞争力"这个设定，Lv1 的练习才有方向。

Lv1 练完，接下来进入 Part B 的功力主考场——Lv2 弹层与反馈组件。那里所有的考点都建立在本级的地基之上：滚动锁考盒模型，退出动画考渲染时序，命令式 API 考对 React 渲染体系的整体理解。

## Lv2 弹层与反馈组件（功力主考场之一）

Lv2 是 Part A 全部内功的集中消费点：每一个弹层组件都同时吃 Portal（挂载点）、A2（定位与 hover 意图）、A3（退出动画双状态机）、A4（焦点陷阱与还回）、A5（aria）——任何一项没练扎实，做这些组件时都会在同一个地方翻车。所以大纲给本级的定性是"功力主考场"：组件本身不难写，难的是把内功**同时**用对。

本级五个小节按星级给密度：Modal 与 Toast/Message 是 ★★★（全密度展开，含命令式 API 这种"库级"考点），Tooltip ★★☆（聚焦四个专有问题），Drawer/Popover/Popconfirm/Notification 无星（各取一两个代表考点），Avatar/Tag 收尾。每个组件依旧按"考点 → 实现（机制+代码）→ 常见坑"展开。

### Modal（★★★）

- Portal + 焦点陷阱 + ESC + **滚动锁**（body overflow hidden + 滚动条宽度补偿，防页面抖动）+ 退出动画（A3）
- 多层弹层 z-index 顺序；确认框动画期间的连点
- **`Modal.confirm()` 命令式 API**：`createRoot` 动态挂载、返回 Promise、更新内容
- ⚠️ 命令式的 context 丢失问题（静态方法拿不到 ConfigProvider 主题 → antd `<App>` 组件的由来，必懂）

四行考点清单就是 Modal 的实现检查表。下面逐项展开，顺序即实现顺序：先让弹层"挂得对"（Portal），再让它"关得掉"（ESC/焦点/滚动锁），再让它"动得对"（退出动画），最后让它"排得对"（z-index）；后半段解决两个"库级"问题——命令式 API 与 context 丢失。

#### 考点一：Portal——弹层为什么不能渲染在原地

```tsx
import { createPortal } from 'react-dom';

// 挂载到 body 之下，脱离触发组件的 DOM 上下文
const container = getContainer?.() ?? document.body;
return createPortal(<div className="xx-modal-root">{/* mask + panel */}</div>, container);
```

Portal 解决的是三个被祖先元素"污染"的问题：

1. **祖先 overflow: hidden / auto**：祖先有滚动容器时，原地渲染的弹层会被裁剪或跟着祖先滚动；
2. **祖先 transform**：CSS 规定 `transform` 非 none 的元素成为 fixed 定位的包含块——弹层写 `position: fixed` 也会相对这个祖先定位，遮罩盖不住全屏；
3. **z-index 层叠上下文**：祖先创建了层叠上下文（opacity < 1、filter、isolation 等）时，子元素 z-index 再大也逃不出祖先的层级。

注意 Portal 只改变 DOM 位置，**不改变 React 上下文**——事件仍沿 React 合成事件树冒泡（这是 Portal 的设计精髓：DOM 在外，逻辑在内）。`getContainer` prop 必须留：antd 的 `getPopupContainer` 同款能力，业务常要求弹层挂进特定滚动容器。《react-学习大纲.md》阶段 4.5 弹层体系首次引入了 `createPortal`，这里是它的工程化形态。

#### 考点二：焦点陷阱（复用 Part A4）

打开的 Modal 必须把键盘焦点"困"在弹层内：Tab 到最后一个可聚焦元素后折回第一个，Shift+Tab 反向折回；打开瞬间焦点进入弹层，关闭时焦点还给触发元素。这是 A4 的标准内功，此处给出 Modal 内联的精简版（完整版与取舍见 Part A4）：

```tsx
// useFocusTrap.ts —— A4 精简版：wraparound + Shift+Tab + 焦点还回
import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  // handlerRef 保证回调始终拿到最新的闭包而不需要重新绑定监听
  const handlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const trigger = document.activeElement as HTMLElement | null; // 记住触发元素

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement); // 排除 display:none

    // 打开瞬间：焦点进入弹层第一个可聚焦元素（通常是关闭按钮/取消按钮）
    requestAnimationFrame(() => getFocusable()[0]?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = getFocusable();
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault(); last.focus();          // Shift+Tab 在第一个 → 折回最后一个
      } else if (!e.shiftKey && current === last) {
        e.preventDefault(); first.focus();         // Tab 在最后一个 → 折回第一个
      }
    };

    container.addEventListener('keydown', onKeyDown);
    handlerRef.current = () => {};
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      trigger?.focus?.();                          // 关闭时焦点还回触发元素（A4）
    };
  }, [active, containerRef]);
}
```

两个工程细节：焦点进入用 `requestAnimationFrame` 推迟一帧——Portal 内容此刻可能还没 commit 到 DOM；"可聚焦"判定用 `el.offsetParent !== null` 排除隐藏元素，但 `position: fixed` 的弹层自身 offsetParent 为 null，所以留了 `|| el === document.activeElement` 兜底（更严谨的实现缓存容器 getBoundingClientRect 做命中测试，见 A4 的讨论）。

#### 考点三：ESC 多层叠加只有最上层响应

两个 Modal 叠开时按 ESC，**只能关掉最上面那个**——如果两个都监听 document keydown，一次 ESC 会连锁关掉全部。解法是全局层栈：每个弹层打开时把自己的关闭回调压栈，document 上只有一个统一的 keydown 分发器，永远只调栈顶：

```ts
// escLayerStack.ts —— 全局 ESC 层栈：只有栈顶响应
type EscHandler = () => void;
const stack: EscHandler[] = [];
let bound = false;

function dispatch(e: KeyboardEvent) {
  if (e.key !== 'Escape' || stack.length === 0) return;
  stack[stack.length - 1](); // 只派发给栈顶——下层 Modal 完全收不到，天然互斥
}

export function pushEscLayer(handler: EscHandler): () => void {
  if (!bound) {
    bound = true;
    document.addEventListener('keydown', dispatch, true); // capture 阶段：先于业务的冒泡监听
  }
  stack.push(handler);
  return () => {
    const i = stack.indexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}
```

```tsx
// useEscLayer.ts —— Modal 侧的 hook 封装
import { useEffect, useRef } from 'react';
import { pushEscLayer } from './escLayerStack';

export function useEscLayer(active: boolean, onEsc: () => void) {
  const ref = useRef(onEsc);
  ref.current = onEsc; // 每次渲染同步最新回调，避免闭包过期
  useEffect(() => {
    if (!active) return;
    return pushEscLayer(() => ref.current());
  }, [active]);
}
```

这个"层栈"模式是弹层互斥的通用底座：Radix 的 `DismissableLayer` 内部就是同构的 layer stack（它还处理了"指针按下时只让栈层响应 outside click"）。考点三与考点六的 z-index 是同一个"层级"问题的两个侧面——一个管事件顺序，一个管视觉顺序，工程上通常共享同一个栈。

#### 考点四：滚动锁 + 滚动条宽度补偿（接《react-学习大纲.md》4.5）

Modal 打开后背景页面不允许滚动（滚动穿透）。naive 写法 `document.body.style.overflow = 'hidden'` 有两个生产级 bug：

1. **页面抖动**：Windows/老 macOS 上滚动条占宽度（典型 17px）。`overflow: hidden` 移除滚动条瞬间，`documentElement.clientWidth` 突然变大 17px，整页内容右移——视觉上弹层"啪"地跳了一下。修法：锁滚动的同时给 body 补上等宽的 `padding-right`。
2. **多层互踩**：A、B 两个 Modal，A 先开（保存 body 原样式）→ B 开 → B 关（把自己保存的"原样式"写回——但那时 overflow 已经是 hidden）→ A 还开着，页面却已经能滚了。修法：引用计数，只有第一个加锁者记录原样式，最后一个解锁者恢复。

```ts
// scrollLock.ts —— 引用计数版滚动锁 + 滚动条宽度补偿
let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

export function lockBodyScroll(): () => void {
  if (lockCount++ === 0) {
    // 只有第一个加锁者负责记录原样式——后续加锁者不能再覆盖保存
    const body = document.body;
    // 滚动条宽度 = 视口宽度 - 文档可视宽度（overflow:hidden 之前量！）
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const basePadding = parseFloat(getComputedStyle(body).paddingRight) || 0;

    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      // 补偿：把消失的滚动条宽度补到 padding 上，内容纹丝不动
      body.style.paddingRight = `${scrollbarWidth + basePadding}px`;
    }
  }
  return () => {
    if (--lockCount === 0 && saved) {
      // 最后一个解锁者恢复原样式
      document.body.style.overflow = saved.overflow;
      document.body.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}
```

```tsx
// useScrollLock.ts
import { useEffect } from 'react';
import { lockBodyScroll } from './scrollLock';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return lockBodyScroll(); // effect 的清理函数即解锁——卸载/关闭都覆盖
  }, [active]);
}
```

两个细节：`scrollbarWidth` 必须在写 `overflow: hidden` **之前**读取（写了之后 clientWidth 已含原滚动条位置，差值为 0）；macOS 默认悬浮滚动条宽度为 0，`scrollbarWidth > 0` 的判断让它自动跳过补偿。iOS Safari 的 body 锁不彻底（橡皮筋），生产上要用 `touchmove` preventDefault 或 `position: fixed + top 记忆` 方案，antd 同样在此留有余地——这是 4.5"滚动锁定"议题的延伸，此处不展开。

#### 考点五：退出动画（复用 A3 双状态机）

关闭 Modal 时 `open=false` 立刻卸载，遮罩淡出动画根本没机会播。A3 的双状态机：`open`（视觉状态）与 `mounted`（挂载状态）分离——关闭时 `open` 先变 false 播退场动画，动画结束后才真正卸载：

```tsx
// usePresence.ts —— A3：visible/mounted 双状态机（含 timeout 兜底）
import { useEffect, useState } from 'react';

export function usePresence(open: boolean, duration = 300): boolean {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);            // 打开：立即挂载
      return;
    }
    // 关闭：等动画播完再卸载；onTransitionEnd 不可全信（被中断/元素隐藏时可能不触发），
    // timeout + 60ms 余量兜底——CSSTransition/AnimatePresence 的原理都是这一对
    const timer = setTimeout(() => setMounted(false), duration + 60);
    return () => clearTimeout(timer);
  }, [open, duration]);

  return mounted;
}
```

入场的对称问题：挂载瞬间就带 `data-state="open"`，浏览器不会播"从 close 到 open"的过渡（没有起点帧）。所以入场要**推迟一帧**再加 open 态：

```tsx
// Modal 内部（节选）
const MOTION_MS = 300;
const mounted = usePresence(open, MOTION_MS);   // A3
const [entered, setEntered] = useState(false);

useLayoutEffect(() => {
  if (!mounted) { setEntered(false); return; }
  const id = requestAnimationFrame(() => setEntered(true)); // 下一帧再进场
  return () => cancelAnimationFrame(id);
}, [mounted]);

const state = entered && open ? 'open' : 'closed'; // 关闭时 open=false → 立即进入退场过渡
```

```text
.xx-modal-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  opacity: 0; transition: opacity 0.3s;                 /* 默认（closed）为终态 */
}
.xx-modal-mask[data-state='open'] { opacity: 1; }

.xx-modal {
  transform: scale(0.96); opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
  pointer-events: none;                                 /* 动画期间不响应点击（A3） */
}
.xx-modal[data-state='open'] { transform: scale(1); opacity: 1; pointer-events: auto; }
```

退场结束的精确时机用 `onTransitionEnd` + 属性过滤（子元素过渡会冒泡上来，必须过滤 `target === currentTarget` 且只认最后一个属性）：

```tsx
const handlePanelEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
  if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
  if (!open) afterClose?.(); // 真正退场完毕的回调点：confirm 在这里销毁 root
};
```

`usePresence` 的 timeout 兜底与 `onTransitionEnd` 双保险是 A3 的既定结论：动画事件在标签页切后台、`display` 突变、浏览器省略过渡时都可能不触发，谁先到谁生效。

#### 考点六：多层 z-index 顺序管理

弹层 z-index 有两类正确性要求：**嵌套**（Modal 里再开 Modal，内层必须更高）与**叠开**（先后打开两个互不嵌套的弹层，后开者在上）。单一策略只能满足其一，组合方案：

```tsx
// zIndex.ts —— 全局序列 + 嵌套上下文，两者取大
import { createContext, useContext } from 'react';

let seq = 1000;                          // 全局递增序列：后打开的弹层必然更高（叠开正确性）
export function nextZIndex(base = 1000) {
  return Math.max(base, ++seq);
}

export const ZIndexContext = createContext(0); // 嵌套上下文：父弹层给子弹层的"地基"

export function useZIndex(base = 1000) {
  const parent = useContext(ZIndexContext);
  // 父上下文存在 → 至少比父高 10（嵌套正确性）；同时参与全局序列竞争（叠开正确性）
  return Math.max(parent ? parent + 10 : 0, nextZIndex(base));
}
```

Modal 消费：`const zIndex = useZIndex(props.zIndex)`，并把 `zIndex` 通过 `<ZIndexContext.Provider value={zIndex}>` 提供给弹层内容——内容里再开弹层时 `parent+10` 生效。消息条（Toast）这类"永远置顶"的组件则取 `useZIndex(1010)` 起步。antd 的 `zIndexContext`（v5.16+）与 Radix 各组件的默认 baseZIndex 是同一思想的不同包装；自研时把"取号逻辑"集中在这一个模块，禁止业务散落写 z-index 字面量，是层级治理（A2）的纪律线。

#### 合体：声明式 Modal 完整代码

```tsx
// Modal.tsx —— 考点一~六合体（React 19，ref 可直接透传到 panel）
import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from './usePresence';
import { useFocusTrap } from './useFocusTrap';
import { useEscLayer } from './useEscLayer';
import { useScrollLock } from './useScrollLock';
import { useZIndex, ZIndexContext } from './zIndex';

const MOTION_MS = 300;

export interface ModalProps {
  open: boolean;
  onClose: (reason: 'closeBtn' | 'mask' | 'esc') => void;
  title?: React.ReactNode;
  footer?: React.ReactNode | null;      // null 表示不要 footer（纯内容弹窗）
  width?: number | string;
  maskClosable?: boolean;               // 默认 true；确认框应为 false（防误触）
  keyboard?: boolean;                   // ESC 是否可关，默认 true
  closeIcon?: React.ReactNode;
  getContainer?: () => HTMLElement;     // Portal 目标，默认 document.body
  zIndex?: number;
  afterClose?: () => void;              // 退场动画真正结束（confirm 销毁的钩子点）
  children?: React.ReactNode;
}

export function Modal(props: ModalProps) {
  const {
    open, onClose, title, footer, width = 520,
    maskClosable = true, keyboard = true, closeIcon = '×',
    getContainer, zIndex: zIndexProp, afterClose, children,
  } = props;

  const mounted = usePresence(open, MOTION_MS);        // A3：双状态机
  const [entered, setEntered] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();                       // A7：hydration 安全的 aria 关联

  React.useLayoutEffect(() => {
    if (!mounted) { setEntered(false); return; }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  useFocusTrap(open, panelRef);                        // A4：焦点陷阱 + 还回
  useEscLayer(keyboard && open, () => onClose('esc')); // 层栈：只有栈顶响应
  useScrollLock(open);                                 // 引用计数 + 宽度补偿
  const zIndex = useZIndex(zIndexProp);

  const handleMaskEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'opacity') return;
    if (!open) afterClose?.();
  };

  if (!mounted) return null;

  const state = entered && open ? 'open' : 'closed';

  return createPortal(
    <ZIndexContext.Provider value={zIndex}>
      <div className="xx-modal-root" style={{ zIndex }}>
        <div
          className="xx-modal-mask"
          data-state={state}
          onClick={maskClosable ? () => onClose('mask') : undefined}
          onTransitionEnd={handleMaskEnd}
        />
        <div className="xx-modal-wrap">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className="xx-modal"
            style={{ width }}
            data-state={state}
            onTransitionEnd={handleMaskEnd}
          >
            {title !== undefined && (
              <header className="xx-modal-header">
                <h4 id={titleId} className="xx-modal-title">{title}</h4>
                <button
                  type="button"
                  className="xx-modal-close"
                  aria-label="关闭"
                  onClick={() => onClose('closeBtn')}
                >
                  {closeIcon}
                </button>
              </header>
            )}
            <div className="xx-modal-body">{children}</div>
            {footer !== null && (
              <footer className="xx-modal-footer">
                {footer ?? (
                  <>
                    <button type="button" className="xx-btn" onClick={() => onClose('closeBtn')}>
                      取消
                    </button>
                    <button type="button" className="xx-btn xx-btn-primary" onClick={() => onClose('closeBtn')}>
                      确定
                    </button>
                  </>
                )}
              </footer>
            )}
          </div>
        </div>
      </div>
    </ZIndexContext.Provider>,
    getContainer?.() ?? document.body,
  );
}
```

```text
.xx-modal-root   { position: fixed; inset: 0; }
.xx-modal-wrap   { position: absolute; inset: 0;
                   display: flex; align-items: center; justify-content: center;
                   overflow: auto; padding: 32px; }  /* 小屏弹窗超高可滚 */
.xx-modal        { position: relative; background: #fff; border-radius: 8px;
                   box-shadow: 0 6px 16px rgba(0,0,0,.08); max-width: calc(100vw - 32px); }
```

#### 考点七：确认框动画期间的连点防护

`Modal.confirm` 的完整实现在下个考点，这里先单独抽出"连点"这个时序问题，因为它同时吃了 Button 考点二与 A3 两个内功。确认框的关闭流程是：用户点"确定" → `onOk` 异步执行（按钮 loading） → 关闭指令 `open=false` → **300ms 退场动画期间弹层还在屏幕上** → 用户看到按钮恢复，再点一次。两道防护：

1. **异步期间**：确定按钮 `loading`（Button 考点二的同步守卫 + disabled），防重复触发 `onOk`；
2. **动画期间**：一旦发起关闭就置 `closingRef = true`，所有关闭入口（确定/取消/ESC/遮罩）先查这个标志，动画中的弹层对一切输入免疫（配合 A3 的 `pointer-events: none` 双保险——后者管鼠标，前者管键盘与已绑定的回调）。

```tsx
// 连点防护核心（在 ConfirmDialog 内）
const closingRef = React.useRef(false);
const guardClose = (fn: () => void) => () => {
  if (closingRef.current) return;   // 动画期间连点：直接吞掉
  closingRef.current = true;
  fn();
};
```

#### 考点八：`Modal.confirm()` 命令式 API 完整实现

声明式 Modal 服务于"渲染树里声明好的弹层"；但"删除确认"这类调用点希望一行代码弹窗并 `await` 结果——这就是命令式 API。实现 = **声明式 Modal + createRoot 动态挂载壳**：

```tsx
// Modal.confirm.tsx —— 命令式确认框：createRoot 挂载 / Promise / update()
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Modal, type ModalProps } from './Modal';
import { Button } from '../lv1/Button';

export interface ModalConfirmConfig {
  title?: React.ReactNode;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  onOk?: () => unknown | Promise<unknown>; // 返回 promise 则自动 loading 并等待
  onCancel?: () => unknown | Promise<unknown>;
  maskClosable?: boolean;                  // 确认框默认 false：防误触遮罩丢操作
}

export type ConfirmUpdate = (config: Partial<ModalConfirmConfig>) => void;
export type ConfirmReturn = Promise<boolean> & { update: ConfirmUpdate; destroy: () => void };

function confirm(config: ModalConfirmConfig): ConfirmReturn {
  // 1. 动态容器：每次调用一个独立 holder，confirm 们互不干扰
  const holder = document.createElement('div');
  holder.dataset.confirmHolder = '';
  document.body.appendChild(holder);
  const root: Root = createRoot(holder);

  let settled = false;          // Promise 只结算一次（连点/destroy 双保险）
  let closing = false;          // 动画期免疫
  let resolveFn!: (ok: boolean) => void;
  const promise = new Promise<boolean>((resolve) => { resolveFn = resolve; });

  const close = (ok: boolean) => {
    if (settled) return;
    settled = true;
    closing = true;
    resolveFn(ok);
    render({ ...current, open: false }); // 只翻 open——退场动画交给 Modal（A3）
  };

  const destroy = () => close(false);

  const update: ConfirmUpdate = (patch) => render({ ...current, ...patch });

  // 2. 每次状态变化整树重渲染（createRoot 的经典驱动方式：render 即 setState）
  let current: ModalConfirmConfig & { open?: boolean } = { maskClosable: false, ...config, open: true };
  function render(next: ModalConfirmConfig & { open?: boolean }) {
    current = next;
    root.render(
      <ConfirmDialog
        {...next}
        closing={closing}
        onOk={async () => {
          await next.onOk?.();   // 等业务异步完成才关——期间 ok 按钮 loading
          close(true);
        }}
        onCancel={() => {
          next.onCancel?.();
          close(false);
        }}
        afterClose={() => {
          // 3. 退场动画结束才销毁 root：保证用户看完整场动画
          root.unmount();
          holder.remove();
        }}
      />,
    );
  }
  render(current);

  // 4. 返回 thenable + 控制句柄：await confirm(...) 与 .update()/.destroy() 两用
  return Object.assign(promise, { update, destroy }) as ConfirmReturn;
}

function ConfirmDialog(props: {
  title?: React.ReactNode;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
  maskClosable?: boolean;
  open?: boolean;
  closing?: boolean;
  afterClose?: () => void;
}) {
  const { title, content, okText = '确定', cancelText = '取消', okButtonProps,
          onOk, onCancel, maskClosable = false, open = true, closing, afterClose } = props;

  // 异步 onOk 的 loading 态（连点防护第一道，见考点七）
  const [okLoading, setOkLoading] = React.useState(false);
  const handleOk = async () => {
    if (okLoading || closing) return;      // 连点/动画期双保险
    setOkLoading(true);
    try { await onOk(); } finally { setOkLoading(false); }
  };

  return (
    <Modal
      open={open}
      onClose={(reason) => {
        // maskClosable=false 时 Modal 不会因遮罩关闭；ESC 与按钮仍可取消
        if (reason === 'esc' || reason === 'mask') { if (!closing) onCancel(); return; }
        if (!closing) onCancel();
      }}
      title={title}
      width={416}
      maskClosable={maskClosable}
      afterClose={afterClose}
      footer={
        <>
          <Button disabled={closing} onClick={() => !closing && onCancel()}>{cancelText}</Button>
          <Button type="primary" loading={okLoading} disabled={closing} onClick={handleOk} {...okButtonProps}>
            {okText}
          </Button>
        </>
      }
    >
      <div className="xx-confirm-body">{content}</div>
    </Modal>
  );
}

// 对外 API：Modal.confirm() / Modal.info() 等一族便捷方法
export const ModalApi = Object.assign(Modal, { confirm });
```

使用侧的效果：

```tsx
// await 直接拿结果；update 演示"确认框内容随上传进度变化"
const action = Modal.confirm({
  title: '发布新版本',
  content: '即将发布 v2.0.0',
  onOk: async () => { await deploy(); },
});
const ok = await action; // true=点了确定且 onOk 成功；false=取消/destroy

// 动态更新内容：上传进度从 1% 涨到 100%，确认框原地变化，不新开弹窗
const upload = Modal.confirm({ title: '上传中', content: '已上传 1%' });
for (const p of [25, 50, 75, 100]) {
  await uploadProgress(p);
  upload.update({ content: `已上传 ${p}%` });
}
```

四个机制点值得记住：`render()` 整树重渲染是 createRoot 时代命令式组件的标准驱动方式（旧版 ReactDOM.render 已移除）；Promise 在 `close` 里同步结算、DOM 动画异步收尾，两者解耦；`afterClose` 是销毁 root 的唯一安全时机（提前 unmount 会掐断退场动画）；返回 thenable + 控制句柄的混合体是 antd `Modal.confirm` 同款形态（antd 返回值上还有 `.then/.catch`，语义与此一致）。

#### 考点九：context 丢失问题与 antd `<App>` 的解法

**症状**：`ConfigProvider` 配了暗色主题，页面里声明式 `Modal` 是暗的，`Modal.confirm()`/`message.success()` 弹出来的却是亮的（且拿不到国际化文案、`getPrefixCls` 等一切上下文配置）。

**根因在 React 的渲染模型**：Context 是**沿 React 组件树自上而下**传播的，传播范围以 root（`createRoot(container)` 的 container）为边界。命令式 API 用 `createRoot(holder)` 创建了一个**全新的独立 root**，渲染出的组件树与业务应用树没有任何祖先关系——业务树里 `ConfigProvider` 提供的 context 值到不了这个新树。这不是 bug，是 React 的边界设计："多个 root = 多棵树"。我们在考点八亲手写的 confirm 就有同样的问题。

**解法的方向只有一个：把命令式组件的渲染点搬回业务树内。** antd v5 给了两个入口，原理相同：

1. `message.useMessage()` / `Modal.useModal()` / `notification.useNotification()`——hook 返回 `[api, contextHolder]`，`contextHolder` 是一个**你渲染在业务树里的占位 ReactNode**，api 触发的所有弹层都 Portal 到这个占位内部。因为占位在 `ConfigProvider` 之下，context 自然流通。
2. `<App>` 组件——antd 官方推荐的应用外壳。它在根部渲染 `contextHolder` 并通过 `App.useApp()` 向下发放 `{ message, notification, modal }` 三个**已经连好 context 的实例**：

```tsx
// antd v5 官方姿势：ConfigProvider 与 App 必须成对出现
import { App, ConfigProvider } from 'antd';

export default function Root() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#00b96b' } }}>
      <App>
        <MyPage />
      </App>
    </ConfigProvider>
  );
}

// 任何深度的组件：
import { App } from 'antd';
function MyPage() {
  const { message, modal } = App.useApp();
  // 这些实例渲染在 <App> 的 contextHolder 里——主题/国际化全部生效
  const del = async () => {
    const ok = await modal.confirm({ title: '删除该记录？' }); // 暗色主题下也是暗的
    if (ok) { await api.delete(); message.success('已删除'); }
  };
  return <button onClick={del}>删除</button>;
}
```

`App.useApp` 的约束（antd 文档明示）：必须在 `<App>` 之下调用；`ConfigProvider` 与 `App` 需成对出现；全局单例（redux saga 等非组件环境想用，得先有一个组件调用 `App.useApp()` 把实例存到模块变量）。v6 进一步把静态方法标记为不推荐——命令式组件的 hooks 化是 createRoot 时代的正确姿势，Toast 一节还会从成本角度再论证一次。

自研库的最小复刻（30 行）——一个"InTreeHolder"模式：

```tsx
// useConfirm.ts —— 把命令式 confirm 的渲染点搬回业务树（context 由此流通）
import * as React from 'react';
import { ConfirmDialog, type ModalConfirmConfig } from './Modal.confirm';

type Pending = { config: ModalConfirmConfig; render: (open: boolean) => void };

export function useConfirm(): [
  (config: ModalConfirmConfig) => Promise<boolean>,
  React.ReactNode,
] {
  // 队列 + 订阅：api 调用时 push 并通知 holder 重渲染（生产建议换 useSyncExternalStore，见 Toast 节）
  const queueRef = React.useRef<Pending[]>([]);
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  const open = React.useCallback((config: ModalConfirmConfig) => {
    const p: Pending = { config, render: () => {} };
    queueRef.current.push(p);
    force(); // 触发本组件重渲染，新的 ConfirmDialog 进入下方 portal
    return new Promise<boolean>((resolve) => {
      p.render = (openState) => {
        p.config = { ...p.config, open: openState }; // open=false 播退场
        force();
        if (!openState) resolve(true);
      };
    });
  }, []);

  const items = queueRef.current;
  // contextHolder：渲染在调用方树里（ConfigProvider 之下），confirm 的 DOM 都从这里 Portal 出去
  const contextHolder = (
    <>
      {items.map((p, i) => (
        <ConfirmDialog
          key={i}
          {...p.config}
          onOk={async () => { await p.config.onOk?.(); p.render(false); }}
          onCancel={() => { p.config.onCancel?.(); p.render(false); }}
          afterClose={() => { queueRef.current = items.filter((x) => x !== p); }}
        />
      ))}
    </>
  );

  return [open, contextHolder];
}
```

（上面是最小演示：单实例 resolve 语义简化、未区分 ok/cancel。生产实现以 Toast 一节的 store 模式为准。）核心只有一个不变式：**api 的 DOM 出口必须长在业务树里**，context 问题就不存在。

#### Modal 常见坑

**坑 1：页面在弹窗打开瞬间横向跳动**
症状：Windows 下打开 Modal，背后内容右移十几像素。根因：`overflow: hidden` 移除滚动条，视口变宽。修法：滚动锁 + `paddingRight` 补偿（考点四完整代码）。

**坑 2：关掉第二个弹窗，第一个还没关但页面能滚了**
症状：A 开 → B 开 → B 关，背景开始滚动而 A 还开着。根因：每个 Modal 各自保存/恢复 body 样式，互相覆盖。修法：引用计数版 `lockBodyScroll`（考点四）。

**坑 3：焦点丢失**
症状：Modal 关闭后按 Tab，焦点从页面顶部重新开始；读屏用户"被扔出"弹窗。根因：关闭时没把焦点还给触发元素。修法：`useFocusTrap` 的清理函数 `trigger?.focus()`（A4）。

**坑 4：ESC 连锁关闭多层弹窗**
症状：两个弹窗叠开，按一次 ESC 全关了。根因：每个弹窗独立监听 document keydown。修法：全局 ESC 层栈，只派发栈顶（考点三）。

**坑 5：祖先有 transform，遮罩盖不住全屏**
症状：Modal 出现在某个小区域里，遮罩只有该区域大小。根因：transform 祖先成为 fixed 的包含块。修法：Portal 到 body（考点一）；`getContainer` 允许业务指定。

**坑 6：确认框动画期间再点确定，onOk 又跑了一次**
症状：退场动画 300ms 内的点击仍触发了删除请求。根因：`open=false` 后弹层仍在屏幕上，按钮仍可点。修法：`closingRef` 免疫 + 按钮 disabled + A3 的 `pointer-events: none` 三选二（考点七）。

### Toast / Message（★★★）

- 命令式 API 设计：`message.success()` / hooks 化 `useMessage`（React 18 createRoot 后的正确姿势）
- 队列与最大条数、**同 key 复用更新**（loading → success 原地变身）
- hover 暂停自动销毁；退出动画后卸载；`aria-live` 播报

Toast 是"命令式组件"的最小完整样本：容器生命周期、队列数据结构、定时器管理、退出动画、无障碍，全挤在 200 行里。按大纲三条展开，重点是**同 key 复用更新**——它会决定整个 store 的数据结构。

#### 考点一：命令式容器——`message.success()` 背后的东西

`message.success('已保存')` 不经过任何人的 render，凭什么能弹出来？拆开是三件事：**懒创建的宿主 root**（一个挂在 body 上的 `createRoot`，首次调用时创建）、**React 树外的 store**（队列数据结构，命令式 API 只是对它的读写）、**树内订阅渲染的 Host 组件**（把 store 状态渲染出来）。因为 store 在 React 外，用 `useSyncExternalStore` 把两者缝合：

```tsx
// message/store.ts —— 队列数据结构：Map<key, instance> + order 数组 + exiting 列表
import type * as React from 'react';

export type MessageType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastInstance {
  key: string;
  type: MessageType;
  content: React.ReactNode;
  remaining: number;      // 剩余展示时长（pause/resume 的账本）
  startedAt: number;     // 本轮计时起点（0 表示已暂停）
  timer: ReturnType<typeof setTimeout> | null;
  closing: boolean;      // true = 退出动画中（不再计入条数）
}

export interface OpenOptions {
  key?: string;
  type?: MessageType;
  content: React.ReactNode;
  duration?: number;     // 0 = 不自动关闭（loading 默认 0）
}

let seq = 0;

export class MessageStore {
  /** 活跃队列：key → 实例。同 key 的"更新"在这里命中 */
  private active = new Map<string, ToastInstance>();
  /** 活跃顺序：淘汰策略（maxCount）按此表头淘汰最旧的 */
  private queue: string[] = [];
  /** 退场动画中：仍要渲染，但不计入条数 */
  private exiting: ToastInstance[] = [];

  private listeners = new Set<() => void>();
  private snapshot: ToastInstance[] = []; // 缓存引用，useSyncExternalStore 要求同参同引

  constructor(private maxCount = 3) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  /** 任何变更后重建快照并广播——快照 = 退场中(在上) + 活跃队列(在下) */
  private commit() {
    this.snapshot = [
      ...this.exiting,
      ...this.queue.map((k) => this.active.get(k)!).filter(Boolean),
    ];
    this.listeners.forEach((l) => l());
  }

  private startTimer(inst: ToastInstance) {
    clearTimeout(inst.timer ?? undefined);
    inst.startedAt = Date.now();
    inst.timer = setTimeout(() => this.close(inst.key), inst.remaining);
  }

  /** 核心：open 是"更新 or 新建"的分岔口 */
  open(opts: OpenOptions): string {
    const key = opts.key ?? `__auto_${seq++}`;
    const duration = opts.duration ?? 3_000;

    const existing = this.active.get(key);
    if (existing) {
      // ── 同 key：走 update 路径，绝不新建 ──
      // 用新对象整体替换而非原地 mutate：生产实现里 Item 通常 React.memo，
      // 原地改字段不改变对象引用，memo 会跳过重渲染——内容就"变不了身"了
      const next: ToastInstance = {
        ...existing,
        type: opts.type ?? existing.type,
        content: opts.content,
        remaining: duration,        // 更新即重置计时
        closing: false,
      };
      this.active.set(key, next);
      if (duration > 0) {
        this.startTimer(next);
      } else {
        // 更新为 duration 0（如 success → loading）时必须清掉残留的自动关闭定时器
        clearTimeout(next.timer ?? undefined);
        next.timer = null;
      }
      this.commit();
      return key;
    }

    // ── 新 key：走 push 路径 ──
    const inst: ToastInstance = {
      key, type: opts.type ?? 'info', content: opts.content,
      remaining: duration, startedAt: 0, timer: null, closing: false,
    };
    this.active.set(key, inst);
    this.queue.push(key);
    if (duration > 0) this.startTimer(inst);

    // ── 与最大条数的交互：溢出则淘汰表头最旧一条（走退场动画）──
    while (this.queue.length > this.maxCount) {
      const oldest = this.queue[0];
      this.close(oldest); // close 会把它移出 active/queue，进 exiting
    }

    this.commit();
    return key;
  }

  close(key: string) {
    const inst = this.active.get(key);
    if (!inst || inst.closing) return;
    clearTimeout(inst.timer ?? undefined);
    this.active.delete(key);          // 立即让出条数名额
    this.queue = this.queue.filter((k) => k !== key);
    inst.closing = true;
    this.exiting.push(inst);          // 动画播完之前仍渲染
    this.commit();
  }

  /** Item 的退场动画 onTransitionEnd 回调到这里：真正卸载 */
  onExited(key: string) {
    this.exiting = this.exiting.filter((i) => i.key !== key);
    this.commit();
  }

  /** 全部关闭：destroy() 不带 key 时的实现 */
  closeAll() {
    for (const k of [...this.queue]) this.close(k);
  }

  pause(key: string) {
    const inst = this.active.get(key);
    if (!inst || !inst.timer) return;
    clearTimeout(inst.timer);
    inst.timer = null;
    inst.remaining -= Date.now() - inst.startedAt; // 扣掉本轮已展示的时长
    inst.startedAt = 0;
  }

  resume(key: string) {
    const inst = this.active.get(key);
    if (!inst || inst.timer) return;
    if (inst.remaining <= 0) { this.close(key); return; } // 暂停期间恰好到点
    this.startTimer(inst);
  }
}
```

注意数据结构的三处决定，全部服务于"同 key 复用更新"这个考纲点：`Map` 让同 key 命中是 O(1) 且天然去重；独立的 `queue` 数组维护展示顺序，让 maxCount 淘汰有明确的"谁最旧"依据（Map 迭代顺序虽也是插入序，但淘汰后语义不如显式数组清楚）；`exiting` 与活跃队列分离，使"退场动画中"不占条数名额——否则一条卡在动画里的旧消息会挤掉新消息的资格。

Host 与命令式 API：

```tsx
// message/index.tsx —— 宿主 root（懒创建）+ 命令式入口
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessageStore, type ToastInstance, type OpenOptions } from './store';

let globalStore: MessageStore | null = null;
let hostRoot: Root | null = null;

function ensureHost() {
  if (hostRoot || typeof document === 'undefined') return;
  globalStore = new MessageStore(3);
  const div = document.createElement('div');
  div.className = 'xx-message-root';
  document.body.appendChild(div);
  hostRoot = createRoot(div);          // 全局唯一的 message root——所有 toast 共用一个容器
  hostRoot.render(<MessageHost store={globalStore} />);
}

function MessageHost({ store }: { store: MessageStore }) {
  // 树外 store ↔ 树内渲染的缝合点；SSR 下返回空快照
  const items = React.useSyncExternalStore(
    store.subscribe, store.getSnapshot, () => EMPTY,
  );
  return (
    <div className="xx-message" role="status" aria-live="polite">
      {items.map((inst) => (
        <MessageItem key={inst.key} inst={inst} store={store} />
      ))}
    </div>
  );
}
const EMPTY: ToastInstance[] = [];

function MessageItem({ inst, store }: { inst: ToastInstance; store: MessageStore }) {
  // 初值取 inst.closing：直接以退场态挂载的实例（淘汰路径）也能播淡出而非闪断
  const [closing, setClosing] = React.useState(inst.closing);
  React.useEffect(() => { setClosing(inst.closing); }, [inst.closing]);

  return (
    <div
      className={`xx-message-item xx-message-${inst.type}`}
      data-state={closing ? 'closed' : 'open'}
      onMouseEnter={() => store.pause(inst.key)}   // hover 暂停计时（见考点三）
      onMouseLeave={() => store.resume(inst.key)}
      onTransitionEnd={(e) => {
        // 退场动画真正播完 → 通知 store 卸载（A3：先动画后卸载）
        if (e.target === e.currentTarget && e.propertyName === 'opacity' && closing) {
          store.onExited(inst.key);
        }
      }}
    >
      <span className="xx-message-icon" aria-hidden="true">
        {inst.type === 'success' ? '✓' : inst.type === 'error' ? '✕'
          : inst.type === 'loading' ? '⟳' : 'i'}
      </span>
      {inst.content}
    </div>
  );
}

/** 命令式 API——消费者看到的全部 */
export const message = {
  open: (opts: OpenOptions): string => {
    ensureHost();                      // 首次调用才创建 root，之后只操作 store
    return globalStore!.open(opts);
  },
  success: (content: React.ReactNode, opts?: Partial<OpenOptions>) =>
    message.open({ type: 'success', content, duration: 3_000, ...opts }),
  error:   (content: React.ReactNode, opts?: Partial<OpenOptions>) =>
    message.open({ type: 'error', content, duration: 5_000, ...opts }),  // 错误多留 2s 阅读时间
  info:    (content: React.ReactNode, opts?: Partial<OpenOptions>) =>
    message.open({ type: 'info', content, duration: 3_000, ...opts }),
  warning: (content: React.ReactNode, opts?: Partial<OpenOptions>) =>
    message.open({ type: 'warning', content, duration: 3_000, ...opts }),
  loading: (content: React.ReactNode, opts?: Partial<OpenOptions>) =>
    message.open({ type: 'loading', content, duration: 0, ...opts }),    // loading 不自动关
  destroy: (key?: string) => {
    if (!globalStore) return;
    key ? globalStore.close(key) : globalStore.closeAll();
  },
};

export { MessageStore };
```

```text
.xx-message { position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
              z-index: 1010; display: flex; flex-direction: column; align-items: center;
              gap: 8px; pointer-events: none; }        /* 容器不挡下层点击 */
.xx-message-item { pointer-events: auto;                 /* 条目本身要能 hover */
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; background: #fff; border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  opacity: 1; transform: translateY(0);
  transition: opacity .25s, transform .25s; }
.xx-message-item[data-state='closed'] { opacity: 0; transform: translateY(-100%) scale(.9); }
.xx-message-success .xx-message-icon { color: #52c41a; }
.xx-message-error   .xx-message-icon { color: #ff4d4f; }
.xx-message-loading .xx-message-icon { color: #1677ff; }
```

`ensureHost` 的懒创建（首次调用才建 root）是命令式容器的通用纪律：避免"引了包就往 body 塞节点"，兼容 SSR（`typeof document` 守卫）。antd 的 message 在此之上做了更多（同一时刻多容器隔离、`message.config` 全局配置），骨架与此一致。

#### 考点二：同 key 复用更新——loading → success 原地变身（深度展开）

这是 Toast 设计里最见功力的一条。需求形态：

```tsx
// 预期：一条 toast 先显示"正在保存"（转圈），保存完成后同一条变成"已保存"（绿勾），3 秒后消失
async function save() {
  message.loading({ key: 'save', content: '正在保存…' });
  await persist();
  message.success({ key: 'save', content: '已保存', duration: 3 });
}
```

两条调用、同一个 key。对照 store 代码，把两条路径走一遍：

**第一条：`message.loading({ key: 'save' })` → push 路径。** `active.get('save')` 为空 → 走新建分支：`active.set('save', {...type:'loading', remaining: 0})`（loading 不自动关，`duration: 0` 时 `startTimer` 不挂定时器），`queue = ['save']`。若此刻队列已满（3 条），`while (queue.length > maxCount)` 触发淘汰：`close(queue[0])` 把**最旧一条**移进 exiting——注意淘汰的是"最旧的活跃 toast"，不是这条新来的，也不受它是否带 key 影响；被淘汰者的 key 若将来再被 open，会重新走 push（它已不在 active 里）。

**第二条：`message.success({ key: 'save' })` → update 路径。** `active.get('save')` 命中 → 不 push、不淘汰、不改变队列位置——用新对象整体替换：`type` 从 loading 变 success、`content` 换文案、`remaining` 重置为 3000、`closing` 强制 false（覆盖"它已开始退场"的边缘情况：用户 hover 触发过关闭？见下），然后重挂定时器。DOM 上是**同一个 React 节点**（key 相同），只发生 props 变化——图标转绿、文案替换、计时重来，用户看到"原地变身"。

**与最大条数淘汰的交互**要专门想一遍：更新路径**不占新名额**（名额在 push 时已占），所以"队列满时 loading→success"不会挤掉别的 toast；但如果这条 toast 更新前已被淘汰进 exiting（`closing: true`、不在 active），update 路径就命中不了——它会当作新 key 走 push，屏幕上短暂出现两条（旧的那条还在退场动画里）。若要规避，可在 `close` 时把被淘汰的 key 留一张"复活票"（短 TTL 内同 key 复用 UI 位置），antd 的做法是让被关闭项立即从通知列表移除（退出动画由 CSS 完成、组件层不再复用）——两种取舍，前者省一次动画、后者逻辑简单，自研时二选一并写进文档。

三个配套设计说明为什么"同 key 复用"值得这么较真：**幂等性**——并发场景下两个请求共用 `key: 'save'`，后完成的 success 只会更新同一条，不会弹两条；**视觉连续**——位置不动，用户视线不用重新搜索；**计时语义**——变身即重置 duration，success 的 3 秒从"成功那一刻"起算，而不是从 loading 出现起算（这是产品经理最常提的需求差异点）。antd 的 `message.loading()` 返回 thenable 句柄、`open` 同 key 更新，语义与此完全同构。

#### 考点三：hover 暂停自动销毁

用户还没读完 error 文案，3 秒到了被销毁——怒气值最高的细节。修法：条目 `mouseenter` 暂停计时、`mouseleave` 恢复。难点在"恢复"不能重新给全量时长，必须**从暂停点继续**——所以 instance 上有 `remaining` 与 `startedAt` 两个账本字段：

```text
时间轴：open(t=0, duration=3000) ──→ hover(t=1200) ──→ leave(t=3500) ──→ close(t=5300)
  pause  计算 remaining -= Date.now() - startedAt → remaining = 3000-1200 = 1800
  resume startTimer：setTimeout(close, 1800) ——从暂停点继续，总展示时长 = 1200 + 1800 = 3000
```

代码已在 store 的 `pause/resume` 与 Item 的 `onMouseEnter/onMouseLeave` 里（见考点一），两个边缘情况都处理了：`resume` 时若 `remaining <= 0`（暂停期间恰好到点）立即 close；`pause` 只作用于有定时器的实例（`duration: 0` 的 loading 无 timer，跳过）。

#### 考点四：退出动画后卸载 + aria-live 播报

**退出动画**是 A3 的第三号应用场景，且比 Modal 多一个"列表竞态"维度：toast 被淘汰时若立即从 DOM 移除，消失是"闪断"；正确顺序是 `close()` 先把它移出**逻辑队列**（让出条数名额、`closing: true`）→ Item 淡出动画播放 → `onTransitionEnd` 里 `store.onExited(key)` 才真正移出渲染列表。清单式退场与 Modal 的差别在于：**队列名额与 DOM 存在是两件事**，名额让渡必须即时（否则新 toast 被卡），DOM 卸载必须等动画（否则闪断）。timeout 兜底同 A3（此处略，生产实现给 `onExited` 加 300ms 兜底定时）。

**aria-live**：视障用户"看"不到右下角弹出的 toast，必须依赖读屏播报。容器上加 `role="status" aria-live="polite"`：内容变化时读屏会朗读新增文本；`polite` 表示"不打断用户当前朗读，等空闲再播"——toast 是辅助信息，不该用 `assertive` 抢话（错误提示若业务上必须立刻被感知才用 assertive，慎用）。loading→success 变身场景下，同一节点的文本变化也会触发播报，读屏用户听到的序列与明眼用户看到的一致。

#### 考点五：hooks 化 useMessage——createRoot 时代的正确姿势

Modal 考点九已论证 context 丢失的机制；Toast 还有三条独立的账，共同构成"hooks 化是正确姿势"的完整论证：

1. **context/theme**：静态 `message.success` 的容器在独立 root，拿不到 ConfigProvider 的主题 token、国际化、暗色模式（机制见 Modal 考点九）；
2. **多 root 的工程成本**：静态方案的宿主 root 与应用 root 是两个 React 世界——DevTools 里是两棵树、StrictMode 的双调用行为不一致、应用卸载（微前端场景）时宿主 root 不会被连带卸载，成为泄漏源；
3. **React 18 并发特性参与不了**：Suspense、transition、useId 等特性以"一棵树"为前提，游离 root 里的组件享受不到（也接不上 React 的优先级调度）。

hooks 化的实现与 antd `message.useMessage()` 同形：返回 `[api, contextHolder]`，contextHolder 渲染在调用方树里：

```tsx
// useMessage.ts —— api 渲染在业务树内：context/theme/i18n 全部生效
import * as React from 'react';
import { MessageStore } from './store';
import { MessageHost } from './index'; // 考点一的 Host，接收外部 store

export function useMessage(maxCount = 3) {
  // 每个调用点独立 store：与 antd useMessage 一致（实例隔离，不与全局 message 混队）
  const storeRef = React.useRef<MessageStore | null>(null);
  if (!storeRef.current) storeRef.current = new MessageStore(maxCount);
  const store = storeRef.current;

  const api = React.useMemo(() => ({
    open: store.open.bind(store),
    success: (content: React.ReactNode, duration = 3_000) =>
      store.open({ type: 'success', content, duration }),
    error:   (content: React.ReactNode, duration = 5_000) =>
      store.open({ type: 'error', content, duration }),
    loading: (content: React.ReactNode) =>
      store.open({ type: 'loading', content, duration: 0 }),
    destroy: (key?: string) => (key ? store.close(key) : store.closeAll()),
  }), [store]);

  // 占位 div 渲染在业务树里；ref 挂上后 Host Portal 进来——api 的 DOM 出口从此长在树内
  const [holder, setHolder] = React.useState<HTMLDivElement | null>(null);
  const contextHolder = (
    <>
      <div ref={setHolder} style={{ display: 'contents' }} />
      {holder && createPortal(<MessageHost store={store} />, holder)}
    </>
  );

  return [api, contextHolder] as const;
}
```

```tsx
// 使用：contextHolder 放进渲染树（一次），api 到处用
import { useMessage } from './useMessage';
import { ConfigProvider } from 'antd'; // 或自研 Provider——context 都能流通

function App() {
  const [message, contextHolder] = useMessage();
  const save = async () => {
    message.loading('正在保存…');
    await persist();
    message.success('已保存');   // 没有 key 也行；要变身就传同 key，见考点二
  };
  return (
    <ConfigProvider>
      {contextHolder}
      <button onClick={save}>保存</button>
    </ConfigProvider>
  );
}
```

`display: contents` 让占位 div 不产生布局；`holder` 为 null 的第一帧 portal 尚未挂上，api 的调用只会先落进 store——Host 挂载后 `useSyncExternalStore` 立即取到快照，不丢消息。antd 的 `<App>` 组件（`App.useApp()` 拿 `{ message, notification, modal }`）就是这个模式的产品化封装：App 在根部渲染 contextHolder，全局共享同一组带 context 的实例。

#### Toast 常见坑

**坑 1：忘记传 key，loading 和 success 弹成两条**
症状：期望"变身"，实际"先一条转圈、又一条绿勾"。根因：两条没 key 的 toast 走了两次 push（自动 key 永不相同）。修法：业务语义上"同一件事的进度"必须共享显式 key。

**坑 2：更新后剩余时间没重置（或反过来：不该重置却重置了）**
症状 A：success 变身后 200ms 就消失。根因：update 路径沿用旧实例的 `remaining` 账本。修法：更新即重置（代码里 `remaining: duration`），若产品要求"沿用剩余时长"，改为 `remaining: Math.min(existing.remaining, duration)`——两种语义都合法，必须显式选一个并写文档。

**坑 3：hover 暂停后鼠标离开，toast 存活时长变长**
症状：3 秒的提示 hover 一下变成 6 秒。根因：resume 用了全量 duration 重新计时。修法：`remaining` 账本 + `pause` 扣减（考点三）。

**坑 4：退出动画期间组件已卸载**
症状：React 报 "setState on unmounted component"（或 toast 消失时闪断）。根因：close 立即把实例从渲染列表删除。修法：`closing` 标志 + exiting 列表 + `onTransitionEnd` 后 `onExited`（考点四）。

**坑 5：队列满了，新 toast 不出现**
症状：第 4 条怎么都不弹。根因：maxCount 淘汰没有释放名额（如 close 时未从 active/queue 移除）。修法：名额让渡在 close 里同步完成（store 代码的 `active.delete + queue.filter`），动画只是视觉延迟。

### Tooltip（★★☆）

- hover 意图延时、边界 flip、`disabled` 按钮不冒泡的坑（pointer-events）、多行溢出自动触发（与 Typography 联动）

Tooltip 的定位计算不自己造轮子——用 floating-ui（A2 的结论：定位是组合数学，flip/shift/size 的中间件生态已经把边界情况吃干净了）。本节聚焦大纲点名的四个专有问题。

#### 考点一：hover 意图延时（复用 A2）

鼠标扫过一排按钮时，tooltip 不该一路"噼里啪啦"地开关。意图判定延时（A2）：**进入 100ms、离开 300ms**——进入慢（等待确认用户真的想看），离开快但不瞬时（给"滑过头再回来"留后路，且从触发元素滑向 tooltip 本体时不该中途消失。A2 讲过进慢出快的心理依据与级联菜单的 `FloatingDelayGroup`，此处是它的落地）：

```tsx
// Tooltip.tsx —— floating-ui：意图延时 + 边界 flip + 视口平移
import * as React from 'react';
import {
  useFloating, useInteractions, useHover, useFocus, useRole,
  offset, flip, shift, FloatingPortal, autoUpdate, useId,
} from '@floating-ui/react';

export interface TooltipProps {
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;        // 单触发元素，props 注入式组合
  openDelay?: number;
  closeDelay?: number;
}

export function Tooltip({
  content, placement = 'top', children, openDelay = 100, closeDelay = 300,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    // 定位三件套（A2）：间距 6px / 视口放不下就翻转 / 翻转后仍溢出则平移收缩
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    // 触发元素或浮层尺寸/滚动变化时自动重算——跟随重定位（A2）
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: openDelay, close: closeDelay }, // 进 100ms 出 300ms：意图判定
    move: false,      // 已 open 后的鼠标小位移不重置计时，避免"贴着边缘抖"
    restMs: 40,       // 鼠标停下 40ms 才算"意图"，扫描路过不算
  });
  const focus = useFocus(context);                    // 键盘聚焦也显示（无障碍刚需）
  const role = useRole(context, { role: 'tooltip' }); // aria 语义由中间件注入
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role]);

  const tipId = useId(); // floating-ui 的 useId 与 React 19 的 useId 同源（A7：hydration 安全）

  return (
    <>
      {/* 触发元素：clone 注入 ref 与事件 props——不额外包 DOM，尊重消费者的元素类型 */}
      {React.cloneElement(children, {
        ref: refs.setReference,
        ...getReferenceProps({ 'aria-describedby': open ? tipId : undefined }),
      })}
      <FloatingPortal>
        {open && (
          <div
            id={tipId}
            ref={refs.setFloating}
            className="xx-tooltip"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
```

`restMs` 与 `delay` 是两套互补的意图判定：`delay` 管"事件发生后等多久"，`restMs` 管"鼠标必须停稳多久"——两者同时配置时，快速扫过（没停稳）与瞬移进入（没等满）都开不了 tooltip。一族相邻的触发元素要共享"剩余延时"（第一个等 100ms，后续即时出现——菜单级联的手感），用 floating-ui 的 `FloatingDelayGroup` 包住即可，机制在 A2 级联菜单一节。

#### 考点二：边界 flip

浮层定位的经典 bug：触发元素在视口边缘，tooltip 按声明的 `bottom` 摆放，直接被视口裁掉。flip 中间件的算法是"假设检验"：算出首选位置 → 检查四边是否溢出视口 → 溢出则沿主轴/交叉轴翻到对侧重算 → 仍溢出交给 `shift` 平移。上面代码 `middleware: [offset(6), flip(), shift({ padding: 8 })]` 的顺序即执行顺序，`offset` 必须最前（间距永远生效），`flip` 在 `shift` 前（先翻后挪）。**为什么不要自己写定位**（A2 的核心论点）在这里最具体：滚动容器嵌套、transform 缩放、`fixed` 与 `absolute` 切换、RTL——自写的版本永远在补下一种边界情况。

#### 考点三：disabled 按钮不触发事件的坑

**症状**：`<Tooltip><button disabled>删除</button></Tooltip>`——按钮禁用时 tooltip 不再出现。

**根因是两层**：其一，HTML 规范规定 disabled 表单控件**不派发鼠标事件**（pointer events 在命中测试阶段就被丢弃，更不冒泡），`pointerenter`/`mouseover` 根本不会触发；其二，不少组件库给 disabled 态写了 `pointer-events: none`（防 cursor 与 hover 样式），等于从 CSS 层再拦一道——事件连命中测试都过不了。

**修法：在 disabled 控件外面包一层不禁用的容器，让容器接收 hover**：

```tsx
// DisabledTrigger.tsx —— 包一层 span：事件由 span 接住
export function DisabledTrigger({ children }: { children: React.ReactElement }) {
  // span 天生不可禁用，pointer 事件正常派发与冒泡
  return (
    <span style={{ display: 'inline-block' }}>{children}</span>
  );
}

// 用法：Tooltip 的 ref/事件注入到 span 上（注入目标是最外层元素）
<Tooltip content="权限不足，联系管理员开通">
  <DisabledTrigger>
    <button disabled>删除</button>
  </DisabledTrigger>
</Tooltip>
```

antd Button 对 disabled 态做过同样处理（内部包 span 接事件），Radix 的 Tooltip 文档则明确要求使用者自行包裹 span——两边殊途同归。注意 `display: inline-block`（或 `inline-flex`）：inline 的 span 换行时事件区域会断开。

#### 考点四：多行溢出自动触发（与 Typography 联动）

Lv1 Typography 的 Ellipsis 已经解决"溢出才显示"的测量；Tooltip 侧要解决的是**组合方向反转**：不是 Ellipsis 主动包 Tooltip，而是触发元素"声明自己溢出时才让 tooltip 生效"。两个组件各留组合点即可——Ellipsis 暴露 `onOverflowChange` 回调，Tooltip 暴露 `open` 受控能力（floating-ui 天生支持）：

```tsx
// EllipsisTooltip.tsx —— 多行溢出自动触发：测量与定位各归其主
import * as React from 'react';
import { Tooltip } from './Tooltip';

export function EllipsisTooltip({
  content, lineCount = 1,
}: { content: string; lineCount?: number }) {
  const [overflowing, setOverflowing] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  // Lv1 Typography 的测量三源（RO/resize/fonts.ready），此处以回调形式收敛
  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      const over = lineCount === 1
        ? el.scrollWidth > el.clientWidth
        : el.scrollHeight > el.clientHeight + 1;
      setOverflowing(over);
    };
    measure();
    const ro = el.parentElement ? new ResizeObserver(measure) : null;
    el.parentElement && ro?.observe(el.parentElement);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [content, lineCount]);

  return (
    <Tooltip content={content}>
      <div
        ref={textRef}
        className={lineCount === 1 ? 'xx-ellipsis' : `xx-ellipsis-${lineCount}`}
        onPointerEnter={overflowing ? undefined : (e) => e.stopPropagation()} // 见下方说明
      >
        {content}
      </div>
    </Tooltip>
  );
}
```

说明：`stopPropagation` 的写法仅示意"未溢出时压制 hover"的可选手段；正规做法是给 Tooltip 加 `enabled` prop（未溢出时不挂 hover 中间件），语义更干净——两种方式都成立，选后者入生产。联动后即大纲说的"与 Typography 联动"：测量归 Typography（scrollWidth 判定），显示归 Tooltip（意图延时 + flip），谁也不越界。

#### Tooltip 常见坑

**坑 1：tooltip 闪现即灭**
症状：快速移动鼠标，tooltip 接连弹出又消失。根因：无意图延时。修法：`delay + restMs`（考点一）。

**坑 2：边缘触发元素，tooltip 出现在视口外**
症状：视口顶部的按钮，tooltip 在按钮上方被裁掉。根因：固定 placement。修法：`flip + shift` 中间件（考点二）。

**坑 3：disabled 控件上 tooltip 失效**
症状与修法见考点三——先查组件库有没有自带 span 包裹，再自己包。

**坑 4：tooltip 与触发元素之间有 6px 缝，鼠标滑过去半路消失**
症状：想移进 tooltip 点击里面的内容，半路 tooltip 关了。根因：close 后立即卸载 + gap 无桥接。修法：close 延时 300ms 内重开同 tooltip 不卸载（我们的实现里 open 条件渲染配合延时已天然成立）；若 tooltip 内有可交互内容，那它已经不是 tooltip 而是 Popover——换组件，别让 tooltip 长期驻留（读屏与键盘焦点语义都不同）。

### Drawer / Popover / Popconfirm / Notification

#### Drawer：四方向动画 + 拖拽改宽

Drawer 的动画考点在**方向参数化**：left/right/top/bottom 四个方向的滑入，只是 transform 起点不同。把方向算成数据而不是写四份 CSS 类——`data-placement` + `data-state` 两个 attribute 组合出八种状态：

```tsx
// Drawer.tsx —— 四方向动画（transform 起点）+ 拖拽改宽（pointer 事件）
import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../modal/usePresence';
import { useEscLayer } from '../modal/useEscLayer';
import { useScrollLock } from '../modal/useScrollLock';
import { useZIndex } from '../modal/zIndex';

export type Placement = 'left' | 'right' | 'top' | 'bottom';
const MOTION_MS = 300;

/** 四个方向的"关闭态偏移"：动画起点 = 面板完全贴在自己那一侧的外面 */
const CLOSED_TRANSFORM: Record<Placement, string> = {
  left: 'translateX(-100%)',
  right: 'translateX(100%)',
  top: 'translateY(-100%)',
  bottom: 'translateY(100%)',
};

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  placement?: Placement;
  size?: number;             // left/right 为宽度，top/bottom 为高度
  title?: React.ReactNode;
  resizable?: boolean;       // 是否可拖拽改宽（左右方向）
  minSize?: number;
  maxSize?: number;
  children?: React.ReactNode;
}

export function Drawer({
  open, onClose, placement = 'right', size = 378,
  title, resizable = false, minSize = 256, maxSize = 800, children,
}: DrawerProps) {
  const mounted = usePresence(open, MOTION_MS);          // A3：双状态机
  const [entered, setEntered] = React.useState(false);
  const [width, setWidth] = React.useState(size);         // 拖拽改宽的状态
  React.useLayoutEffect(() => {
    if (!mounted) { setEntered(false); return; }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  useEscLayer(open, onClose);
  useScrollLock(open);
  const zIndex = useZIndex(1000);

  // ── 拖拽改宽：pointer capture 三步曲 ──
  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null);
  const isHorizontal = placement === 'left' || placement === 'right';

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startW: width };
    e.currentTarget.setPointerCapture(e.pointerId); // 捕获：指针移出把手仍持续接收事件
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    // 方向感知：右抽屉向左拖是变宽，左抽屉向右拖是变宽
    const next = placement === 'right' ? d.startW - dx : d.startW + dx;
    setWidth(Math.min(maxSize, Math.max(minSize, next)));
  };
  const onHandlePointerUp = () => { dragRef.current = null; };

  if (!mounted) return null;
  const state = entered && open ? 'open' : 'closed';

  return createPortal(
    <div className="xx-drawer-root" style={{ zIndex }} data-placement={placement}>
      <div className="xx-drawer-mask" data-state={state} onClick={onClose} />
      <div
        className="xx-drawer-panel"
        data-state={state}
        data-placement={placement}
        style={isHorizontal ? { width } : { height: size }}
        role="dialog" aria-modal="true"
      >
        {title && <header className="xx-drawer-header">{title}</header>}
        <div className="xx-drawer-body">{children}</div>
        {resizable && isHorizontal && (
          <div
            className="xx-drawer-resize-handle"
            role="separator" aria-orientation="vertical"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
```

```text
.xx-drawer-root  { position: fixed; inset: 0; }
.xx-drawer-mask  { position: absolute; inset: 0; background: rgba(0,0,0,.45);
                   opacity: 0; transition: opacity .3s; }
.xx-drawer-mask[data-state='open'] { opacity: 1; }

/* 面板：先按 placement 定位到四边，closed 态再用对应 transform 推出去 */
.xx-drawer-panel  { position: absolute; transition: transform .3s ease;
                    background: #fff; display: flex; flex-direction: column; }
.xx-drawer-panel[data-placement='left']   { top: 0; bottom: 0; left: 0;
  transform: translateX(-100%); }        /* CLOSED_TRANSFORM 与 CSS 重复声明：
                                            CSS 驱动动画，TS 常量供文档/测试对齐 */
.xx-drawer-panel[data-placement='right']  { top: 0; bottom: 0; right: 0; transform: translateX(100%); }
.xx-drawer-panel[data-placement='top']    { left: 0; right: 0; top: 0; transform: translateY(-100%); }
.xx-drawer-panel[data-placement='bottom'] { left: 0; right: 0; bottom: 0; transform: translateY(100%); }
.xx-drawer-panel[data-state='open'] { transform: translate(0, 0); }  /* 回到原位：滑入 */
/* resize 把手贴在面板内边缘 */
.xx-drawer-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px;
  cursor: col-resize; }
.xx-drawer-panel[data-placement='right'] .xx-drawer-resize-handle { left: 0; }
.xx-drawer-panel[data-placement='left']  .xx-drawer-resize-handle { right: 0; }
```

两个考点收口：**四方向动画**的关键是把"关闭态偏移"表达为 `CLOSED_TRANSFORM` 的数据映射 + CSS `data-placement` 选择器，新增方向只加一行；**拖拽改宽**用 pointer 事件（统一鼠标/触摸/笔）+ `setPointerCapture`（指针快速甩出把手区域也不丢事件，这是 pointer 事件对 mousemove + 全局监听方案的两大优势），方向感知（`right` 抽屉向左拖变宽）与 min/max 夹逼是两处最易错的细节。keyboard 用户改宽需给把手加方向键步进（role="separator" 的标准交互，A5 的键盘模型清单），留作练习。

#### Popover：受控/非受控双模式 + trigger 数组

Popover = "带内容的 Tooltip"，两个考点：**双模式**（A1 首个大规模应用场景——外部传 `open` 则完全受控，否则内部自管理，`onOpenChange` 永远回调）与 **trigger 组合**（click / hover / focus / contextMenu 任意组合）。

```tsx
// Popover.tsx —— useControllableState（A1）+ trigger 数组 + floating-ui
import * as React from 'react';
import {
  useFloating, useInteractions, useClick, useHover, useFocus, useDismiss,
  useRole, offset, flip, shift, FloatingPortal, autoUpdate,
} from '@floating-ui/react';

/** A1 的 useControllableState（30 行版，完整版与警告细节见 Part A1） */
function useControllableState<T>(props: {
  value?: T; defaultValue?: T; onChange?: (v: T) => void;
}) {
  const { value, defaultValue, onChange } = props;
  const isControlled = value !== undefined;
  const [inner, setInner] = React.useState<T | undefined>(defaultValue);
  const current = (isControlled ? value : inner) as T;
  const set = (next: T) => {
    if (!isControlled) setInner(next); // 受控时内部不存状态，只上报
    onChange?.(next);                   // onChange 永远回调——受控/非受控行为一致
  };
  return [current, set] as const;
}

export type TriggerType = 'hover' | 'click' | 'focus' | 'contextMenu';

export interface PopoverProps {
  content: React.ReactNode;
  trigger?: TriggerType | TriggerType[];   // 数组：任意组合 ['hover','click']
  open?: boolean;                          // 传入即受控
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

export function Popover({
  content, trigger = 'hover', open: controlledOpen,
  defaultOpen = false, onOpenChange, placement = 'top', children,
}: PopoverProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: controlledOpen, defaultValue: defaultOpen, onChange: onOpenChange,
  });

  const triggers = Array.isArray(trigger) ? trigger : [trigger];

  const { refs, floatingStyles, context } = useFloating({
    open, onOpenChange: setOpen,
    placement,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // ── trigger 数组：每个 trigger 对应一个 interaction 中间件 ──
  // hooks 不能条件调用：trigger 运行时可能变化，所以 4 个中间件恒调用、
  // 用各自的 enabled 开关按需启用——这是 hooks 规则在"组合式 props"上的标准解法
  const hover  = useHover(context, {
    enabled: triggers.includes('hover'),
    restMs: 40, delay: { open: 100, close: 300 },
  });
  const click  = useClick(context, { enabled: triggers.includes('click') });
  const focus  = useFocus(context, { enabled: triggers.includes('focus') });
  // useDismiss：点击外部 / ESC 关闭（click 触发时的标配）
  const dismiss = useDismiss(context, { escapeKey: true });
  const role = useRole(context, { role: 'dialog' }); // Popover 承载交互内容，role 用 dialog 非 tooltip

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, focus, dismiss, role]);

  return (
    <>
      {React.cloneElement(children, {
        ref: refs.setReference,
        ...getReferenceProps({
          onContextMenu: triggers.includes('contextMenu')
            ? (e: React.MouseEvent) => { e.preventDefault(); setOpen(!open); }
            : undefined,
        }),
      })}
      <FloatingPortal>
        {open && (
          <div
            ref={refs.setFloating}
            className="xx-popover"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
```

`enabled` 开关是 floating-ui 中间件的标准能力：hooks 数量恒定、行为随 props 变化，"组合式 props"在 React hooks 规则下的唯一正解。双模式的价值在组合场景立刻显现：受控 `open` 让业务能"点表格行打开 Popover 详情"，trigger 数组让同一 Popover 既支持 hover 预览又支持点击固定——antd Popover 的 `trigger={['hover', 'click']}` 即此。

#### Popconfirm：气泡确认框

Popconfirm = Popover + 确认语义（删除确认比 Modal 轻，不打断上下文）。专有考点一个：**异步确认的 loading 与防重复**——点"确定"后请求发出，气泡内按钮 loading，期间不可再点：

```tsx
// Popconfirm.tsx —— Popover 受控模式 + 异步确认 loading
import * as React from 'react';
import { Popover } from './Popover';
import { Button } from '../lv1/Button';

export function Popconfirm({
  title, onConfirm, onCancel, children,
}: {
  title: React.ReactNode;
  onConfirm?: (e?: React.MouseEvent) => unknown | Promise<unknown>;
  onCancel?: (e?: React.MouseEvent) => void;
  children: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const confirm = async (e: React.MouseEvent) => {
    setLoading(true);                       // async onOk 自动 loading（Modal 考点七同款）
    try { await onConfirm?.(e); setOpen(false); }
    finally { setLoading(false); }          // 失败不关——让用户看到错误后重试或取消
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => { if (!loading) setOpen(next); }} // loading 期间点外部不关
      trigger="click"
      content={
        <div className="xx-popconfirm">
          <div className="xx-popconfirm-title">{title}</div>
          <div className="xx-popconfirm-buttons">
            <Button size="small" disabled={loading} onClick={(e) => { onCancel?.(e); setOpen(false); }}>
              取消
            </Button>
            <Button size="small" type="primary" loading={loading} onClick={confirm}>
              确定
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </Popover>
  );
}
```

Popover 的受控模式在这里被真实消费：确认流程中"loading 期间禁止外部关闭"只能由受控 `open + onOpenChange` 守卫实现——这就是 A1 双模式存在的意义（组件库不可能预知所有消费姿势）。

#### Notification：列表型与 message 的定位分工

Notification 与 message 同为"反馈"，工程上是一个 store 的两种视图（antd 里两者共享 rc-notification 内核），产品上是**定位分工**：

| 维度 | message | notification |
|---|---|---|
| 位置 | 页面顶部居中，堆叠成列 | 四角（默认右上），独立槽位列表 |
| 形态 | 单行轻提示，无交互 | 卡片：标题 + 正文 + 可带操作按钮 |
| 停留 | 1.5–3s 自动消失 | 4.5s 起步，常驻型（duration 0）合法 |
| 数量 | 队列 + maxCount 滚动淘汰 | 槽位列表，超出滚动或折叠 |
| 语义 | 操作的**即时回执**（保存成功） | 需要被**注意/可回看**的事件（系统公告、任务完成提醒） |
| 无障碍 | `role="status"` + polite | `role="alert"` 语义更重（带操作时 role=dialog 更合适） |

判定口诀：**看完即弃选 message，需要读完整句甚至动手选 notification**。实现层面 notification 只是把 Toast 的 store 换成"四角四条队列 + 卡片渲染"，数据结构、同 key 更新、hover 暂停、退出动画全部复用——这也是为什么 Toast 一节值得按 ★★★ 全密度展开：它是最小完整样本，Notification/Message/Result/Alert 都是它的换皮。

### Avatar / Badge / Tag

收尾一级：三个"小而精"的展示组件，考点集中在**组合形态**（堆叠）、**算法趣味**（hash 取色、字号缩放）与**列表动画**（Tag 增删）。

#### Avatar：堆叠组合 / 按名字 hash 取色 / 字符过多自动缩放

**堆叠（AvatarGroup）**：多个头像叠成一组，后一个压住前一个的右缘，超数显示 +N。两个实现点：负 margin 制造重叠、**z-index 逆序**（数组前面的头像要压在后面头像之上，即 `zIndex: count - index`）；hover 时抬升展开是常见交互增强：

```tsx
// AvatarGroup.tsx —— 堆叠：负 margin + 逆序 z-index + maxCount 溢出 +N
import * as React from 'react';

export function AvatarGroup({
  maxCount = 5, children,
}: { maxCount?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  const show = items.slice(0, maxCount);
  const rest = items.length - show.length;

  return (
    <div className="xx-avatar-group">
      {show.map((item, i) =>
        // clone 注入堆叠样式：定位与 z 序由 group 统一管理，单个 Avatar 保持纯净
        React.isValidElement(item)
          ? React.cloneElement(item as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
              style: {
                ...item.props.style,
                zIndex: show.length - i,      // 越靠前 z 越高：前面的脸不被挡
                marginLeft: i === 0 ? 0 : -8, // 负 margin：向左叠进前一个
              },
            })
          : item,
      )}
      {rest > 0 && (
        <span className="xx-avatar xx-avatar-overflow" style={{ zIndex: 0, marginLeft: -8 }}>
          +{rest}
        </span>
      )}
    </div>
  );
}
```

```text
.xx-avatar-group { display: inline-flex; align-items: center; }
.xx-avatar       { width: 32px; height: 32px; border-radius: 50%;
                   display: inline-flex; align-items: center; justify-content: center;
                   border: 2px solid #fff;    /* 描边避免重叠处颜色黏连 */
                   overflow: hidden; }
.xx-avatar-overflow { background: #eee; color: #666; font-size: 13px; }
```

**按名字 hash 取色**：头像没传图片时用名字首字符 + 背景色兜底，要求"同名同色、不同名大概率不同色"——确定性 hash + 色板取模：

```ts
// avatarColor.ts —— hash → 色板取模：稳定、离散、可调色板
/** djb2 变体：32 位循环内保持确定性（不同机器/会话同输入同输出） */
export function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; // ^ 与 >>>0：保证非负落点
  }
  return h;
}

/** 色板：饱和度/明度接近、彼此可区分，深色文字可直接叠上（对比度已按 WCAG AA 挑过） */
const PALETTE = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068', '#f50', '#2db7f5'];

export function colorByName(name: string): string {
  return PALETTE[hashString(name) % PALETTE.length];
}
```

算法要点三个：取模前必须 `>>> 0` 归一为无符号 32 位（JS 位运算产符号整数，负数取模会出负索引）；色板要**预先按对比度筛过**（hash 只管离散，可读性是色板的责任）；antd 旧版按"列表序号 % 4"循环取色，我们换成按名字 hash——代价是 hash 碰撞时两人同色（可接受，列表局部重复不损伤辨识），收益是跨页面/跨会话同人同色。

**字符过多自动缩放**：名字是"欧阳娜娜"四个字甚至英文全名时，32px 头像装不下——按"内容实际宽度 vs 容器可用宽度"算缩放比，用 `transform: scale` 压字而不是换更小的固定字号（保持基线与行高稳定）：

```tsx
// Avatar.tsx —— 缩放算法：先复位再量，按比例压缩
import * as React from 'react';
import { colorByName } from './avatarColor';

export function Avatar({
  src, name = '', size = 32,
}: { src?: string; name?: string; size?: number }) {
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    if (!root || !text) return;
    text.style.transform = 'none';               // 关键：先复位再测量，否则上一次的 scale 影响读数
    const available = root.clientWidth - 8;      // 两侧各留 4px 呼吸位
    const actual = text.scrollWidth;             // 内容自然宽度（未缩放时）
    const scale = available / actual;
    if (scale < 1) {
      text.style.transform = `scale(${Math.max(scale, 0.5)})`; // 下限 0.5：再小不可读，该截断了
    }
  }, [name, size]);                              // 名字或尺寸变化 → 重新测量缩放

  return (
    <span
      ref={rootRef}
      className="xx-avatar"
      style={{ width: size, height: size, background: colorByName(name) }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span ref={textRef} className="xx-avatar-text">
          {name.slice(0, 2)}                      {/* 头像惯例最多展示两个字 */}
        </span>
      )}
    </span>
  );
}
```

```text
.xx-avatar-text { font-size: 14px; color: #fff; white-space: nowrap;
                  display: inline-block; } /* nowrap：scrollWidth 才等于完整内容宽 */
```

测量三步曲"复位 → 测量 → 施加"是所有测量类算法的通用纪律（antd Avatar 的 `setScale` 同思路：`scale = (size - gap) / textWidth`）；scale 下限 0.5 之后走截断（`name.slice(0, 2)` 已在渲染层兜底）。

#### Tag：动态增删的进出场动画（受控关闭确认）

Tag 单个没有考点，**列表的增删动画**是 A3 的列表形态——新增从 0 高度/透明度展开，删除播完退场再卸载；外加一个受控协议：`onClose` 里 `e.preventDefault()` 可以拦截默认关闭（弹出"确认删除？"）：

```tsx
// TagList.tsx —— 进出场动画 + 受控关闭确认
import * as React from 'react';

export interface TagItem { id: string; label: string; removable: boolean }

const MOTION_MS = 220;

export function TagList({
  tags, onChange,
}: { tags: TagItem[]; onChange: (next: TagItem[]) => void }) {
  // 退场账本：id → 已确认删除（正在播退场动画）
  const [closingIds, setClosingIds] = React.useState<string[]>([]);

  const requestRemove = (item: TagItem, e: React.MouseEvent) => {
    // 受控关闭确认：默认行为是"标记退场"；业务 preventDefault 即拦截
    const confirmed = window.confirm(`移除「${item.label}」？`); // 演示用 confirm；生产换 Popconfirm
    if (!confirmed) { e.preventDefault(); return; }              // 拦截：Tag 保留
    setClosingIds((s) => [...s, item.id]);                        // 进入退场动画（A3：先动画）
  };

  const handleExited = (id: string) => {
    // 动画播完才真正从数据里删——卸载竞态的解（A3 列表形态）
    setClosingIds((s) => s.filter((x) => x !== id));
    onChange(tags.filter((t) => t.id !== id));
  };

  const add = (label: string) => onChange([...tags, { id: crypto.randomUUID(), label, removable: true }]);

  return (
    <div className="xx-tag-list">
      {tags.map((item) => {
        const closing = closingIds.includes(item.id);
        return (
          <span
            key={item.id}
            className="xx-tag"
            data-state={closing ? 'closing' : 'open'}
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget && e.propertyName === 'opacity' && closing) {
                handleExited(item.id); // 退场完成 → 数据删除 → 卸载
              }
            }}
          >
            {item.label}
            {item.removable && (
              <button
                type="button"
                className="xx-tag-close"
                aria-label={`移除 ${item.label}`}
                onClick={(e) => requestRemove(item, e)}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      <input
        className="xx-tag-input"
        placeholder="回车添加标签"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            add(e.currentTarget.value.trim());
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  );
}
```

```text
.xx-tag-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.xx-tag { display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; background: #f0f5ff; color: #1c3faa; border-radius: 4px;
  opacity: 1; transform: scale(1);
  transition: opacity .22s, transform .22s; }
.xx-tag[data-state='closing'] { opacity: 0; transform: scale(.8); } /* 入场反向：新 tag 从
                                                                       scale(.8)/opacity 0 过渡到 1 */
```

两个考点收口：**退场与数据删除分离**（`closingIds` 是"视觉遗嘱"，真正删数据等 `onTransitionEnd`）是 A3 列表卸载竞态的标准解——直接在点击时 `onChange(过滤)` 会把 DOM 瞬间拆掉，动画无从播放；**受控关闭**的协议设计（`onClose` 事件 + `preventDefault` 拦截默认行为）与原生表单、antd Tag 完全同构——"默认行为可拦截"是所有删除类交互的安全带。

至此 Lv2 收官。回看会发现一个模式：Modal 的滚动锁、Toast 的同 key 复用、Tooltip 的意图延时、Drawer 的方向动画、Tag 的退场分离——没有一个考点是"多写几行代码"的问题，全部是**时序与状态归属**的问题：谁先谁后、谁拥有状态、动画期间状态算谁的。这正是"弹层与反馈组件是功力主考场"的含义。下一片段进入 Lv3：Select、DatePicker、Table、Tree——把本级的时序功力放大到"状态机 + 虚拟滚动"的量级。

## Lv3 复杂交互组件（公认最考功力）

Lv1 考的是细节洁癖，Lv2 考的是弹层与焦点的地基，到了 Lv3，前面所有内功要**同时**发力：一个 Select 要同时处理键盘导航（A5）、弹层定位与失焦关闭（A2）、受控协议（A1）、长列表性能；一个 Table 表面上是渲染，骨子里是协议设计；一个 Tree 里藏着整个教程里最经典的联动算法。所以业界共识是：**弹层四件套写完只算入门，Lv3 能徒手写对，才算真的会写组件**。

本段按功力星级逐个展开 Select → DatePicker → Table → Tabs → Collapse → Tree → Cascader/TreeSelect/Transfer 七组组件。每个组件的展开结构固定为：**考点总览 → 逐考点实现（机制 + 完整代码）→ 常见坑（症状 → 根因 → 修法）**。所有代码 TypeScript + React 19 写法（`ref` 已是普通 prop，不再需要 `forwardRef`），可独立运行；antd 相关代码基于 v5 当前稳定版——若你的宿主应用是 React 19，antd v5 需要在入口补一行官方兼容包：

```ts
// React 19 + antd v5 官方兼容补丁（antd 文档「React 19 compatibility」小节）
import '@ant-design/v5-patch-for-react-19';
```

读本段有个建议：不要顺着读，挑一个组件**先合上文档自己写一遍**，写不动了再看对应考点。Lv3 的功力差距恰恰暴露在"以为自己会"和"真写对"之间——尤其是 Select 的键盘状态机、DatePicker 的日历生成、Tree 的三态传导这三处，是面试和实战的双重高发区。

---

### Select（★★★★）——键盘+a11y+长列表三合一考题

Select 之所以是三合一考题，是因为它同时踩三条最难的路：

1. **键盘 + a11y**：WAI-ARIA 的 combobox + listbox 模式要求"输入框是个 combobox，弹层是个 listbox，高亮项用 `aria-activedescendant` 关联"，键盘模型包括 ↑↓/Home/End/Enter/Esc/typeahead，一个都不能少。
2. **受控协议**：单选/多选/labelInValue/清空/后缀箭头，每一项都是一次 API 设计决策。
3. **长列表**：万级 options 直接渲染就是几万 DOM 节点，必须虚拟滚动；远程搜索又叠加防抖、loading、请求取消三件事。

考点清单（原文）：

- 高亮项与选中项分离；键盘全套（↑↓/Enter/Esc/typeahead）
- 受控非受控、labelInValue、清空、后缀箭头
- **万级 options 虚拟滚动**；远程搜索（防抖 + loading + 失焦取消）
- 多选：maxTag 溢出显示 "+2"、已选项被删除后的回显

#### 考点 1：高亮项（activeIndex）与选中项（value）为什么必须分离

先把这个 Select 里最容易被写错的设计决策讲透。一个下拉框里其实有两个"当前项"：

- **选中项（value）**：已经提交给业务方的数据，是受控协议的一部分，变了就要触发 `onChange`，下游可能跟着发请求、触发表单校验。
- **高亮项（activeIndex）**：键盘的"光标"。按 ↑↓ 移动的是它，Enter 才把它"提交"成 value。它纯属 UI 内部状态，永远不该触发 `onChange`。

两者一旦合并成一个 state，每按一次方向键就会触发一次 `onChange` → 一次网络请求/校验抖动，协议直接废掉。此外读屏语义也不同：`aria-activedescendant` 指向的是**高亮项**，`aria-selected` 标记的是**选中项**——两个概念在无障碍规范里就是两个 id、两个属性。

分离之后还有一条配套纪律：**打开面板时 activeIndex 要重置到选中项所在位置**（并滚动到可见），否则用户每次打开都从第 0 项开始，大列表里选中项在底部时体验极差。下面是包含完整键盘状态机的 Select 内核：

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export function useSelectCore(options: Option[]) {
  // value：选中项（受控/非受控由外层决定，这里以非受控示例）
  const [value, setValue] = useState<string | null>(null);
  // activeIndex：高亮项索引——与 value 分离，是本考点的核心
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  /** 打开时把高亮项对齐到选中项；没有选中则落回第一项可选项 */
  const openPanel = useCallback(() => {
    setOpen(true);
    const selectedIdx = options.findIndex((o) => o.value === value);
    const firstEnabled = options.findIndex((o) => !o.disabled);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : firstEnabled);
  }, [options, value]);

  /** 可选项之间移动：跳过 disabled（WAI-ARIA listbox 允许落在 disabled 上，但多数实现选择跳过） */
  const move = useCallback(
    (step: 1 | -1) => {
      if (!options.length) return;
      let next = activeIndex;
      for (let i = 0; i < options.length; i++) {
        next = (next + step + options.length) % options.length; // 环形移动，到达边界回绕
        if (!options[next].disabled) break;
      }
      setActiveIndex(next);
    },
    [activeIndex, options],
  );

  const selectActive = useCallback(() => {
    const opt = options[activeIndex];
    if (!opt || opt.disabled) return;
    setValue(opt.value);      // 只有 Enter / 点击才写 value —— onChange 只在这里发
    setOpen(false);
  }, [activeIndex, options]);

  /** 完整键盘模型：↑↓ 移动、Home/End 到首末、Enter 提交、Esc 关闭 */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':   e.preventDefault(); move(-1); break;
        case 'ArrowDown': e.preventDefault(); move(1); break;
        case 'Home':      e.preventDefault(); setActiveIndex(options.findIndex((o) => !o.disabled)); break;
        case 'End':       e.preventDefault(); {
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) { setActiveIndex(i); break; }
          }
          break;
        }
        case 'Enter': e.preventDefault(); selectActive(); break;
        case 'Escape': e.preventDefault(); setOpen(false); break; // Esc 只关面板，value 不动
      }
    },
    [move, options, selectActive],
  );

  return { value, setValue, activeIndex, setActiveIndex, open, setOpen, openPanel, onKeyDown, move };
}
```

读屏关联部分，触发器与弹层的 aria 契约如下（combobox 模式）：

```tsx
import { useId } from 'react';

// 触发器：combobox；弹层：listbox；高亮项：aria-activedescendant
function SelectA11y({
  listId, activeId, open, onKeyDown,
}: { listId: string; activeId: string | null; open: boolean; onKeyDown: React.KeyboardEventHandler }) {
  const inputId = useId(); // React 19 的 useId：SSR 安全的唯一 id（见 Part A7）
  return (
    <>
      <input
        id={inputId}
        role="combobox"                  // 声明自己是 combobox（输入 + 弹出列表）
        aria-expanded={open}             // 弹层是否打开
        aria-controls={listId}           // 指向弹层列表
        aria-autocomplete="list"
        aria-activedescendant={open ? activeId ?? undefined : undefined} // 只在打开时指向高亮项
        onKeyDown={onKeyDown}
      />
      <ul id={listId} role="listbox" aria-labelledby={inputId}>
        {/* option 渲染见考点 3 */}
      </ul>
    </>
  );
}
```

#### 考点 2：typeahead（连按字母匹配，含超时重置）

typeahead 是"按住键盘不打開下拉也能跳转"的体验：连按 `s``h` 高亮到"上海"，停顿超过阈值（惯例 500ms）后缓冲清空，再按 `g` 就从 `g` 重新匹配。三个实现细节决定成败：

1. **缓冲要累积**：一次按键只匹配单字母，连打就废了；
2. **超时要重置**：每次按键都重置计时器，静默超过 500ms 清空缓冲——这是"输入会话"的边界；
3. **匹配策略分级**：先找前缀匹配，找不到再退化到包含匹配。

```tsx
import { useEffect, useRef, useCallback } from 'react';
import type { Option } from './useSelectCore'; // 与上一段代码同文件时可省略此 import

/**
 * typeahead：可打印字符累积进缓冲，前缀优先、包含兜底，500ms 静默重置。
 * onMatch 会拿到目标索引，调用方负责 setActiveIndex 并滚动到可见。
 */
export function useTypeahead(
  getOptions: () => Option[],
  onMatch: (index: number) => void,
  timeoutMs = 500,
) {
  const bufferRef = useRef('');          // 已敲入的字符缓冲
  const timerRef = useRef<number>(0);    // 静默重置计时器

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // 只截获"单个可打印字符"，Ctrl/Cmd/Alt 组合键（快捷键）一律放行
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      bufferRef.current += e.key.toLowerCase();
      // 每次按键都重置倒计时：超时窗口是"距上次按键"而不是"距首次按键"
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => { bufferRef.current = ''; }, timeoutMs);

      const opts = getOptions().filter((o) => !o.disabled);
      const kw = bufferRef.current;
      const prefixIdx = opts.findIndex((o) => o.label.toLowerCase().startsWith(kw));
      const hitIdx = prefixIdx >= 0 ? prefixIdx : opts.findIndex((o) => o.label.toLowerCase().includes(kw));
      if (hitIdx >= 0) onMatch(hitIdx);
      e.preventDefault(); // 阻止字符进入输入框本体（Select 的输入框不真的收字符）
    },
    [getOptions, onMatch, timeoutMs],
  );

  // 卸载时清掉计时器，避免报错与内存泄漏
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  return { onKeyDown };
}
```

坑点预告：如果 Select 带**搜索输入框**（`showSearch`），typeahead 就不能再 `preventDefault` 抢字符了——此时输入框本身承担"输入 → 过滤"职责，typeahead 只在**无输入框**的形态下启用。antd 的处理就是按 `mode`/`showSearch` 分支切换这两套键盘逻辑。

#### 考点 3：受控/非受控 + labelInValue + 清空 + 后缀箭头

**双模式**是 Part A1 的 `useControllableState` 在 Select 上的落地：外部传了 `value` 就完全受控（内部不存、只回显），没传就用内部 state；`onChange` 无条件回调。这里给出独立可运行的 30 行实现，保证本片段自洽：

```tsx
import { useRef, useState, useEffect } from 'react';

/** 受控/非受控二合一（Part A1 同款思想的独立实现，供本片段所有示例复用） */
export function useControllable<T>({
  value,            // 外部受控值：传了（非 undefined）即受控
  defaultValue,     // 非受控初始值：惰性初始化，只在首帧消费一次
  onChange,         // 状态变化时永远回调（无论受控与否）
}: {
  value?: T;
  defaultValue?: T;
  onChange?: (next: T) => void;
}) {
  // 惰性初始化：defaultValue 若是昂贵计算结果，只在首渲染执行一次
  const [internal, setInternal] = useState<T | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const merged = isControlled ? value : internal;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = (next: T) => {
    if (!isControlled) setInternal(next);       // 受控时不写内部状态，等外部回灌
    onChangeRef.current?.(next);                // 永远回调：受控方拿它去 setState 完成闭环
  };
  return [merged as T, setValue] as const;
}

/** 受控/非受控切换报警：开发期捕获"先受控后非受控"的不一致（症状见文末坑 6） */
export function useControlledWarn(value: unknown) {
  const wasControlled = useRef(value !== undefined);
  useEffect(() => {
    if (wasControlled.current && value === undefined) {
      console.warn('组件从受控切换为非受控，行为将不可预期，请检查 value 的传递。');
    }
    wasControlled.current = value !== undefined;
  }, [value]);
}
```

**labelInValue**：默认 `value` 只是 key（`'sh'`），业务方要展示 label 还得自己查一遍 options。当 options 是异步的、随时可能被删除（见考点 5 的脏数据问题），key 和 label 就该绑在一起走协议：`value = { value: 'sh', label: '上海' }`。antd 用 `labelInValue` 开启，我们自己的类型定义：

```ts
/** labelInValue 开启后的 value 形状：label 跟着值走，options 缺失也能回显 */
export interface LabeledValue<V = string> {
  value: V;
  label: string;
}
export type SingleValue<V> = V | LabeledValue<V> | undefined;
```

**清空**：清空是协议事件，不是"把输入框置空字符串"。正确语义是 `onChange(undefined)`（labelInValue 下是 `undefined` 而不是 `{ value: undefined, label: '' }`），antd 还提供独立的 `onClear` 钩子。**后缀箭头**：箭头图标随 `open` 旋转（CSS `transform: rotate(180deg)` + `transition`），它还是天然的开关按钮——点击箭头区域应切换面板而非仅作装饰。把这三件事拼进触发器：

```tsx
import { useState } from 'react';

interface SelectTriggerProps {
  displayLabel: string;                    // 回显文本（多选时为 tags，见考点 5）
  open: boolean;
  allowClear: boolean;
  onToggleOpen: () => void;
  onClear: () => void;
  placeholder?: string;
}

export function SelectTrigger({ displayLabel, open, allowClear, onToggleOpen, onClear, placeholder = '请选择' }: SelectTriggerProps) {
  const [hover, setHover] = useState(false);
  const showClear = allowClear && hover && displayLabel; // hover 才出现清空钮，避免与箭头争位
  return (
    <div
      className="select-trigger"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onToggleOpen}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #d9d9d9', padding: '4px 8px', minWidth: 160, cursor: 'pointer' }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: displayLabel ? undefined : '#bfbfbf' }}>
        {displayLabel || placeholder}
      </span>
      {showClear && (
        <span
          role="button"
          aria-label="清空"
          onClick={(e) => { e.stopPropagation(); onClear(); }} // 阻止冒泡：清空不能顺带开关面板
          style={{ cursor: 'pointer' }}
        >
          ×
        </span>
      )}
      <span
        aria-hidden
        style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} // 箭头随开合旋转
      >
        ▾
      </span>
    </div>
  );
}
```

antd 对应写法（不用造轮子时）：

```tsx
import { Select } from 'antd';

<Select
  allowClear                 // 清空钮 + onClear 回调
  onClear={() => form.resetFields(['city'])}
  labelInValue               // value/onChange 全部携带 { value, label }
  suffixIcon={<MyIcon />}    // 自定义后缀箭头
  options={[{ value: 'sh', label: '上海' }, { value: 'hz', label: '杭州' }]}
/>
```

#### 考点 4：万级 options 虚拟滚动（定高窗口化）

一万条 options 全量渲染 = 一万个 `<li>` = 首帧几秒、滚动掉帧。虚拟滚动的核心是**窗口化（windowing）**：只渲染视口内（加上下各一段 overscan 缓冲）的几十条，其余用一根等高"撑高条"占位。定高场景的数学极其简单：

```tsx
import { useState, useRef, useEffect, type ReactNode } from 'react';

const ITEM_HEIGHT = 32; // 定高假设：每项 32px——变高列表需要测量缓存，见后文 VirtualList 小节

/** 定高虚拟列表：撑高条 + translateY 偏移，万级数据只渲染 ~30 个 DOM */
export function VirtualList<T>({
  items, viewportHeight = 256, overscan = 6, renderItem, activeIndex,
}: {
  items: T[];
  viewportHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  activeIndex?: number; // 键盘高亮项：变化时保证它滚入视口（见文末坑 4）
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 窗口计算：起点向上多留 overscan 条缓冲，向下多留 viewport 一屏 + overscan
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - overscan);
  const endIndex = Math.min(items.length, startIndex + Math.ceil(viewportHeight / ITEM_HEIGHT) + overscan * 2);
  const visible = items.slice(startIndex, endIndex);

  // 高亮项必须始终在 DOM 里，否则 aria-activedescendant 指向不存在的节点
  useEffect(() => {
    if (activeIndex == null || activeIndex < 0 || !containerRef.current) return;
    const top = activeIndex * ITEM_HEIGHT;
    const el = containerRef.current;
    if (top < el.scrollTop) el.scrollTop = top;                                       // 高于视口：贴顶
    else if (top + ITEM_HEIGHT > el.scrollTop + viewportHeight) el.scrollTop = top + ITEM_HEIGHT - viewportHeight; // 低于视口：贴底
  }, [activeIndex, viewportHeight]);

  return (
    <div
      ref={containerRef}
      style={{ height: viewportHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* 撑高条：总高度 = 条数 × 行高，让滚动条长度真实 */}
      <div style={{ height: items.length * ITEM_HEIGHT, position: 'relative' }}>
        {/* 窗口块整体位移到正确位置：transform 优于逐项 absolute top（合成层性能更好） */}
        <div style={{ transform: `translateY(${startIndex * ITEM_HEIGHT}px)` }}>
          {visible.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}
```

接到 Select 上——弹层列表换成 `VirtualList`，每项行高固定 32px，同时把高亮/选中两个状态分别落到 aria 和样式：

```tsx
import { useId } from 'react';
import { VirtualList } from './VirtualList';
import type { Option } from './useSelectCore';

export function SelectOptionList({
  options, activeIndex, value, onHover, onPick,
}: {
  options: Option[];
  activeIndex: number;
  value: string | null;
  onHover: (i: number) => void;
  onPick: (i: number) => void;
}) {
  const listId = useId();
  return (
    <VirtualList
      items={options}
      activeIndex={activeIndex}
      renderItem={(opt, i) => (
        <li
          key={opt.value}
          id={`${listId}-opt-${i}`}                        // aria-activedescendant 的指向目标
          role="option"
          aria-selected={opt.value === value}              // 选中项语义：与高亮项是两回事
          aria-disabled={opt.disabled}
          onMouseEnter={() => onHover(i)}                  // 鼠标悬停接管高亮（与键盘共用 activeIndex）
          onClick={() => onPick(i)}
          style={{
            height: 32, lineHeight: '32px', padding: '0 12px', cursor: 'pointer',
            background: i === activeIndex ? '#f5f5f5' : undefined,          // 高亮项
            fontWeight: opt.value === value ? 600 : undefined,             // 选中项用字重区分
            color: opt.disabled ? '#bfbfbf' : undefined,
          }}
        >
          {opt.label}
        </li>
      )}
    />
  );
}
```

antd 的 Select 默认就开着虚拟滚动（内部用独立的 `rc-virtual-list` 包），只有极端场景才需要 `virtual={false}` 关掉（例如选项高度不一旦不想做测量）。

#### 考点 5：远程搜索（防抖 + loading + 失焦取消）

远程搜索是"用户输入 → 300ms 防抖 → 发请求 → 更新 options"的流水线，加上两件最容易漏的事：**loading 状态**（触发器与弹层都要有）和**请求取消**（新请求发出时 abort 旧请求；失焦/卸载时 abort 在途请求）。竞态是这一考点的隐藏 boss：慢的旧响应比快的新响应后到，把新结果覆盖成旧结果—— AbortController 一并解决。

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Option } from './useSelectCore';

/** 远程搜索：防抖 300ms + AbortController 取消在途请求 + loading 状态 */
export function useRemoteSearch(fetcher: (kw: string, signal: AbortSignal) => Promise<Option[]>, debounceMs = 300) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number>(0);                     // 防抖计时器
  const abortRef = useRef<AbortController | null>(null);  // 在途请求控制器

  const run = useCallback(async (kw: string) => {
    abortRef.current?.abort();                            // 新请求发出：先取消上一个
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const data = await fetcher(kw, ac.signal);
      if (!ac.signal.aborted) setOptions(data);           // 只有无被取消才落地，杜绝竞态覆盖
    } catch (err) {
      // abort 触发的异常是预期内的流程，不是错误
      if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [fetcher]);

  /** 输入回调：只做防抖，不直接请求 */
  const search = useCallback((kw: string) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void run(kw), debounceMs);
  }, [run]);

  /** 失焦/卸载：取消在途请求并清掉未发出的防抖 */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    window.clearTimeout(timerRef.current);
    setLoading(false);
  }, []);

  useEffect(() => cancel, [cancel]); // 卸载兜底

  return { options, loading, search, cancel };
}

// 使用：fetcher 里把 signal 传给 fetch，浏览器层面真正断流
const fetcher = (kw: string, signal: AbortSignal) =>
  fetch(`/api/users?q=${encodeURIComponent(kw)}`, { signal })
    .then((res) => res.json() as Promise<Option[]>);

// const { options, loading, search, cancel } = useRemoteSearch(fetcher);
// onBlur={cancel} onSearch={search} —— loading 同时驱动触发器 spinner 与弹层"加载中"占位
```

antd 侧的对应配置是三件套：`showSearch` + `filterOption={false}`（关掉本地过滤，交给服务端）+ `onSearch`（接防抖）+ `loading`（回显状态）。

#### 考点 6：多选——maxTag 溢出 "+2" 的渲染测量 + 脏数据回显

多选 Select 的 value 是数组，回显是一排 Tag。两个考点：

**（1）maxTag 溢出 "+2" 怎么算出"能放几个"？** 答案不是数个数（`maxTagCount={3}` 那种写死模式简单但浪费空间），而是**测量**：容器宽度固定，每个 Tag 宽度不定（文字长短不一），要放尽可能多的 Tag 再用 "+N" 收尾。antd 的 `maxTagCount="responsive"` 就是这个行为（内部由 `rc-overflow` 包做逐项测量与收纳）。自己实现的思路是两遍渲染：

```tsx
import { useLayoutEffect, useRef, useState } from 'react';

interface TagItem { value: string; label: string }

/**
 * 响应式 maxTag：先在隐藏层渲染全部 Tag 测宽，再贪心装入容器，剩下的显示 "+N"。
 * 这是 rc-overflow 的简化版：二分/增量注册等优化略，原理一致。
 */
export function ResponsiveTags({
  items, containerRef, onRemove,
}: {
  items: TagItem[];
  containerRef: React.RefObject<HTMLElement | null>; // 容器 ref：宽度随外层布局变化
  onRemove: (value: string) => void;
}) {
  const [fitCount, setFitCount] = useState(items.length);
  const measureRef = useRef<HTMLDivElement>(null); // 隐藏测量层

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl) return;

    // ResizeObserver：容器宽度变化（窗口缩放/布局变化）时重算
    const compute = () => {
      const containerWidth = container.clientWidth - 24 - 40; // 减去内边距与 "+N" 预留宽
      const tagEls = measureEl.children;
      let used = 0, fit = 0;
      for (let i = 0; i < items.length; i++) {
        const w = (tagEls[i] as HTMLElement).offsetWidth + 4 /* gap */;
        if (used + w > containerWidth) break; // 装不下下一个：到此为止，剩余全部进 "+N"
        used += w; fit++;
      }
      // 与上次相同则不 setState：防止"测量→渲染→测量"死循环（见文末坑 5）
      setFitCount((prev) => (prev === fit ? prev : fit));
    };
    compute();
    const ro = new ResizeObserver(compute); // 容器尺寸变化（响应式布局）自动重算
    ro.observe(container);
    return () => ro.disconnect();
  }, [items, containerRef]);

  const overflow = items.length - fitCount;
  return (
    <>
      {/* 隐藏测量层：真实渲染全部 Tag，仅供 offsetWidth，视觉上不可见 */}
      <div ref={measureRef} aria-hidden style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', whiteSpace: 'nowrap', left: -9999 }}>
        {items.map((t) => <span key={t.value} style={{ padding: '0 8px' }}>{t.label}</span>)}
      </div>
      {items.slice(0, fitCount).map((t) => (
        <span key={t.value} style={{ background: '#fafafa', border: '1px solid #d9d9d9', padding: '0 8px', borderRadius: 4 }}>
          {t.label}
          <span role="button" aria-label={`移除 ${t.label}`} onClick={() => onRemove(t.value)} style={{ cursor: 'pointer', paddingLeft: 4 }}>×</span>
        </span>
      ))}
      {overflow > 0 && (
        <span title={items.slice(fitCount).map((t) => t.label).join('、')} // 悬浮看完整清单
          style={{ background: '#fafafa', border: '1px solid #d9d9d9', padding: '0 8px', borderRadius: 4 }}>
          +{overflow}
        </span>
      )}
    </>
  );
}
```

antd 写法对照：

```tsx
import { Select } from 'antd';

<Select
  mode="multiple"
  maxTagCount="responsive"                                  // 测量式收纳（rc-overflow）
  maxTagPlaceholder={(omitted) => `+${omitted.length}...`}  // "+N" 文案可定制
  options={options}
/>
// 固定个数模式则用 maxTagCount={2}，行为是"永远只显示前 2 个 + +N"
```

**（2）已选项被删除后的回显脏数据。** 场景：用户昨天选了"张三"，今天管理员把"张三"从系统里删了，`options` 里已无此人，但表单的 `value` 还存着他的 key。如果渲染逻辑写成 `options.find(o => o.value === v).label`，直接抛 `TypeError: Cannot read properties of undefined`——白屏级事故。解法是**label 缓存**：只要某个 key 曾经出现过 label，就把它记进一个 ref 级 Map，渲染时 `options` 查不到就回落缓存，缓存也没有才显示 key 本身。antd 的 rc-select 内部就是这么维护已选值列表（mergedValues）的，所以 antd 里删掉的选项回显不会丢 label。

```tsx
import { useRef } from 'react';
import type { Option } from './useSelectCore';

/** label 缓存：options 丢失已选项时仍能回显其 label（脏数据防线） */
export function useLabelCache(options: Option[]) {
  const cacheRef = useRef(new Map<string, string>());

  // options 在场的项：实时刷新缓存（label 可能被服务端改名）
  for (const o of options) cacheRef.current.set(o.value, o.label);
  // 注意：在渲染期间往 ref 写缓存是安全的——写入是幂等的，不触发额外渲染

  const labelOf = (value: string): string =>
    options.find((o) => o.value === value)?.label   // 1. 优先取当前 options
      ?? cacheRef.current.get(value)                // 2. 已被删除：回落历史缓存
      ?? value;                                     // 3. 从未见过：显示 key 本身，绝不 undefined

  const remember = (value: string, label: string) => cacheRef.current.set(value, label); // onChange 时写入
  return { labelOf, remember };
}
```

配套的纪律：`onChange` 拿到的值在**提交那一刻**就 `remember(value, label)` 存档，此后无论 options 怎么变，回显链路都有兜底。

#### Select 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：按一下 ↓ 就发出一次 onChange，下游请求刷屏。
根因：把高亮项和选中项写进了同一个 state，键盘移动被当成"选择"。
修法：拆成 activeIndex（纯 UI）与 value（协议数据），只有 Enter/点击写 value（见考点 1）。

坑 2
症状：远程搜索结果偶尔"闪回"上一次的关键词结果。
根因：请求竞态——旧关键词响应慢、后到，覆盖了新结果。
修法：AbortController（新请求 abort 旧的 + 失焦/卸载 cancel），或请求序号守卫（见考点 5）。

坑 3
症状：点清空后出现一个空标签/表单校验不触发。
根因：清空回调给了 '' 或 { value: undefined, label: '' }，组件把空串当成"有一项"渲染。
修法：清空语义固定为 onChange(undefined)，渲染层对 undefined/null 直接显示 placeholder。

坑 4
症状：虚拟滚动 + 键盘导航时，按 ↓ 到视口外，读屏不播报、视觉也看不见高亮。
根因：高亮项不在窗口内，DOM 里根本没有这个节点，aria-activedescendant 指向了不存在的 id。
修法：activeIndex 变化的 effect 里把该项滚动进视口（VirtualList 已内置），保证高亮节点始终存在。

坑 5
症状：maxTagCount "responsive" 模式下无限重渲染/宽度抖动。
根因：测量写在渲染后的 effect 里，setState 又触发重测量，形成循环；或 ResizeObserver 回调高频触发。
修法：fitCount 与上次相同则不 setState；测量逻辑用同一帧的 rect 做完；必要时对 ResizeObserver 回调做 rAF 节流。

坑 6
症状：Select 从受控切到非受控后行为错乱（改不动/突然清空）。
根因：受控↔非受控中途切换，内部 state 从未初始化又被接管（Part A1 的经典警告）。
修法：全生命周期钉死一种模式；条件受控用 value={maybeX ?? undefined} 之外的中转组件包装，绝不让 value 在 undefined 与有值间"漂移"。

坑 7
症状：多选回显出现裸 key（如显示 "u_1024"）。
根因：options 已删项，渲染层 options.find(...).label 直接取空。
修法：useLabelCache 三级兜底：options → 缓存 → key（见考点 6）。
```

**对标小结**：antd 的 Select 内核是 rc-select + rc-virtual-list 两个包——前者负责触发器/键盘/受控协议/多选收纳，后者负责窗口化渲染，职责切面正好对应本节考点 1–3 与考点 4。更妙的是这个底座还能再长出两个组件：TreeSelect（树换掉平铺列表）与 Cascader（级联列换掉单列表）。这套"Select 外壳 × 不同列表内容 = 新组件"的分层，是后文 Cascader/TreeSelect 一节的伏笔。

### DatePicker（★★★★★）——日历是最苦的组件

五星不是夸张。DatePicker 的苦不在代码量，在于它同时被四类问题夹击：**日期数学**（月长不齐、闰年、周起始日随 locale 变化）、**状态机**（范围选择的两段式 + hover 预览）、**双向同步**（手敲输入框与点面板是两条写 value 的路）、**i18n**（周起始日、月份名、今天的高亮、格式串全是 locale 相关）。面试里"写个日历"能筛掉八成候选人，筛的正是下面这七个考点。

考点清单（原文）：

- 日历生成算法：6×7 网格、前后月补齐、周起始日国际化
- 面板导航（月/年快捷切换）、范围选择（hover 实时预览区间）、禁用日期函数
- 键盘直接输入解析（dayjs parse 容错）、presets 快捷项
- 对标：antd DatePicker（看它怎么把"选择器"抽象成通用 PickerShell）

约定：本节统一用 dayjs（antd v5 的官方日期库），先做插件与 locale 初始化：

```ts
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/zh-cn';

dayjs.extend(customParseFormat); // 支持 dayjs(text, format, true) 严格解析（考点 4）
dayjs.extend(localeData);        // 支持 .localeData().firstDayOfWeek()（考点 1）
dayjs.extend(isSameOrBefore);

dayjs.locale('zh-cn'); // 周一起始、一月二月……全部中文；运行时可切 'en'（周日起始）
```

#### 考点 1：日历生成算法（6×7 网格，完整代码）

设计决策先行：**为什么固定 6 行 7 列 = 42 格？** 一个月最长 31 天，最多前导 6 天偏移（首日是"周起始日的前一天"的极端情况），31 + 6 = 37 格，向上取整到完整周 = 6 行。固定 42 格换来的是**面板高度恒定**——从 2 月翻到 3 月面板不跳动，这是所有成熟日历的共识。前后月补齐后，格子里的日期分属三个月（上月尾巴/本月/下月头），渲染时用 `inCurrentMonth` 打灰。

周起始日国际化是第一处"想当然就错"的地方：`dayjs().day()` 返回 0–6（0 = 周日），但面板第一列显示周日还是周一，取决于 locale——`zh-cn` 周一开头，`en` 周日开头。偏移公式必须对 7 取模防负数：

```tsx
import dayjs, { type Dayjs } from 'dayjs';

export interface CalendarCell {
  date: Dayjs;
  inCurrentMonth: boolean; // 是否当月（前后月补齐的格子置灰）
  isToday: boolean;
}

/**
 * 生成 6×7 日历网格。
 * @param view     面板当前视图（任意位于该月的 Dayjs，内部 startOf('month') 归一）
 * @param weekStart 周起始日：0=周日（en），1=周一（zh-cn）。来自 dayjs().localeData().firstDayOfWeek()
 */
export function generateMonthMatrix(view: Dayjs, weekStart: number): CalendarCell[] {
  const firstOfMonth = view.startOf('month');                       // 当月 1 号（时间归零）
  // 首日偏移：firstOfMonth.day() 是"1 号是周几(0=周日)"，减去周起始日再对 7 取模
  // +7 再 %7 保证非负——漏掉这一步，周一体系下周日(0)会算出 -1，整月错位（见文末坑 2）
  const leadOffset = (firstOfMonth.day() - weekStart + 7) % 7;
  const gridStart = firstOfMonth.subtract(leadOffset, 'day');       // 网格左上角（可能是上月最后几天）
  const today = dayjs().startOf('day');                             // "今天"按日粒度比较，避免时分秒干扰

  return Array.from({ length: 42 }, (_, i) => {
    const date = gridStart.add(i, 'day');
    return {
      date,
      inCurrentMonth: date.month() === view.month() && date.year() === view.year(), // 同月判定要看年！12 月跨年补齐
      isToday: date.isSame(today, 'day'),
    };
  });
}

/** 周表头：同样按 weekStart 旋转。labels 下标 0 恒为"周日"，旋转由 (weekStart + i) % 7 完成 */
export function weekLabels(weekStart: number): string[] {
  const labels = ['日', '一', '二', '三', '四', '五', '六']; // dayjs .day() 的语义顺序
  return Array.from({ length: 7 }, (_, i) => labels[(weekStart + i) % 7]);
}

// 用法：周起始日不要硬编码，从 locale 读，切换语言自动正确
const weekStart = dayjs().localeData().firstDayOfWeek(); // zh-cn → 1，en → 0
// const cells = generateMonthMatrix(dayjs('2026-11-01'), weekStart);
```

验算一遍（拿 2026 年 11 月、周一起始）：11 月 1 日是周日，`day()` = 0，`leadOffset = (0 - 1 + 7) % 7 = 6`，网格从 10 月 26 日（周一）开始，第一行是 10/26–11/1，最后一行 12/6 结束——42 格、三个月混合，与 macOS 日历完全一致。渲染面板：

```tsx
import type { Dayjs } from 'dayjs';

function CalendarGrid({ cells, weekStart, onPick, onHover, cellClassName }: {
  cells: CalendarCell[];
  weekStart: number;
  onPick: (d: Dayjs) => void;
  onHover?: (d: Dayjs | null) => void;
  cellClassName?: (d: Dayjs) => string;
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', textAlign: 'center' }}>
        {weekLabels(weekStart).map((w) => <span key={w} style={{ color: '#999' }}>{w}</span>)}
        {cells.map(({ date, inCurrentMonth, isToday }) => (
          <button
            key={date.format('YYYY-MM-DD')}              // 跨月补齐的格子也有全局唯一 key
            type="button"
            onClick={() => onPick(date)}
            onMouseEnter={() => onHover?.(date)}
            onMouseLeave={() => onHover?.(null)}
            style={{
              height: 36, color: inCurrentMonth ? undefined : '#d9d9d9', // 非当月置灰
              border: isToday ? '1px solid #1677ff' : undefined,          // 今天圈边
              background: cellClassName?.(date) ? undefined : undefined,
            }}
            className={cellClassName?.(date)}
          >
            {date.date()}
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### 考点 2：面板导航（viewYear/viewMonth 与 value 分离）

第二个高频设计错误：把选中值 `value` 直接当日历视图用。后果是**点哪天面板跳哪月**——用户 12 月 31 日想选 1 月 2 日（跨年比较），点完面板直接跳走。正确做法是两套状态：

- `value`：已提交的选择（协议数据）；
- `viewYear / viewMonth`：面板正在展示哪个月（纯视图状态，翻页只动它）。

联动规则只有一条：**面板打开时**把视图对齐到 value（或今天），之后翻页自由。头部导航包含四级：上月/下月（`±1 month`）、上一年/下一年（`±1 year`）、月快捷面板（点"2026 年 11 月"弹出 12 个月网格）、年快捷面板（点年份弹出十年页网格）。

```tsx
import { useState, useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

/** 面板导航：视图状态与选中值分离 + 月/年快捷切换子面板 */
export function usePanelView(value: Dayjs | null) {
  const now = dayjs();
  const [viewYear, setViewYear] = useState(value?.year() ?? now.year());
  const [viewMonth, setViewMonth] = useState(value?.month() ?? now.month());
  const [subPanel, setSubPanel] = useState<'date' | 'month' | 'year'>('date');

  // 打开（或 value 变化）时把视图拉回选中月——唯一允许 value 侵入视图的时机
  useEffect(() => {
    if (value) { setViewYear(value.year()); setViewMonth(value.month()); }
  }, [value]);

  const viewDate = dayjs().year(viewYear).month(viewMonth); // 当前视图锚点
  return {
    viewYear, viewMonth, subPanel,
    setSubPanel,
    goMonth: (delta: number) => {                           // ±1 月（自动跨年进退）
      const next = viewDate.add(delta, 'month');
      setViewYear(next.year()); setViewMonth(next.month());
    },
    goYear: (delta: number) => setViewYear((y) => y + delta), // ±1 年
    pickMonth: (m: number) => { setViewMonth(m); setSubPanel('date'); }, // 月面板选中 → 回日面板
    pickYear: (y: number) => { setViewYear(y); setSubPanel('month'); },  // 年面板选中 → 进月面板
  };
}

/** 年快捷面板：十年一页。页首 = floor(year/10)*10，展示 10 年 + 前后各一个灰格 */
export function decadeYears(viewYear: number): { year: number; inDecade: boolean }[] {
  const start = Math.floor(viewYear / 10) * 10; // 2026 → 2020
  return Array.from({ length: 12 }, (_, i) => {
    const year = start - 1 + i;                 // 2019..2030：首尾两个灰格提示还有上/下个十年
    return { year, inDecade: year >= start && year < start + 10 };
  });
}
```

注意年面板选完进月面板、月面板选完回日面板的**漏斗式层级**——这是"快捷切换"的完整体验，很多自研日历只有左右箭头，用户选 1990 年要按 36 次。

#### 考点 3：范围选择（RangePicker 状态机 + hover 实时预览）

RangePicker 是 DatePicker 翻倍难的地方：一次选择分两步，中间态必须让用户看得见。把它建模成显式状态机，一切就顺了：

```text
状态机（phase）：
  idle ──点击第 1 格──▶ pickingEnd ──点击第 2 格──▶ done（关闭面板，onChange 提交 [start, end]）
                          │  ▲
                          ▼  │（Esc / 清空 / 重新聚焦可回到 idle）
                     pickingEnd 期间 hover 任意格子 → 预览区间 [start, hover] 实时高亮
```

四条关键规则：

1. **hover 预览**只在 `pickingEnd` 阶段生效：`preview = [min(start, hover), max(start, hover)]`，格子落在闭区间内就上"区间背景色"；
2. **endBeforeStart 交换**：第二次点击的日期早于 start 时**不报错**，提交前归一化成 `[min, max]`——用户倒着选也应该成功，这是成熟组件的默契；
3. 第二次点击即提交并关面板，`onChange(values)` 一次给全；
4. 已有值再次打开：从 idle 开始，第一次点击视为"重选 start"（antd 同款语义）。

```tsx
import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

type Phase = 'idle' | 'pickingEnd' | 'done';

export function useRangePicking(onChange: (range: [Dayjs, Dayjs]) => void) {
  const [start, setStart] = useState<Dayjs | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hover, setHover] = useState<Dayjs | null>(null);

  /** 预览区间：只算不改，渲染层直接消费 */
  const preview = useMemo<[Dayjs, Dayjs] | null>(() => {
    if (phase !== 'pickingEnd' || !start || !hover) return null;
    return hover.isBefore(start, 'day')
      ? [hover.startOf('day'), start.endOf('day')]  // 倒着 hover：min/max 归一
      : [start.startOf('day'), hover.endOf('day')];
  }, [phase, start, hover]);

  const pickCell = (d: Dayjs) => {
    if (phase === 'idle' || phase === 'done') {
      setStart(d);            // 第一次点击（含重开面板的重选）
      setPhase('pickingEnd');
      return;
    }
    // 第二次点击：提交。倒选自动交换，绝不抛错
    const range: [Dayjs, Dayjs] = d.isBefore(start!, 'day') ? [d, start!] : [start!, d];
    setPhase('done');
    setHover(null);
    onChange(range);          // 一次回调带全两个端点
  };

  const reset = () => { setStart(null); setPhase('idle'); setHover(null); };

  return {
    phase, preview, reset,
    pickCell,
    hoverCell: (d: Dayjs | null) => { if (phase === 'pickingEnd') setHover(d); }, // 只在第二阶段追踪 hover
    /** 供渲染层判断格子是否在预览区间内（首尾两天给"端点"样式，中间给"连接"样式） */
    cellState: (d: Dayjs): 'start' | 'end' | 'in-range' | null => {
      if (!preview) return null;
      const [a, b] = preview;
      if (d.isSame(a, 'day')) return 'start';
      if (d.isSame(b, 'day')) return 'end';
      return d.isAfter(a, 'day') && d.isBefore(b, 'day') ? 'in-range' : null;
    },
  };
}
```

antd 的 RangePicker 把这套状态机藏在内部（`onCalendarChange` 会在第一次点击时就回调单边值，方便业务做"第二边禁用早于第一边"），提交值则从 `onChange(values: [Dayjs, Dayjs] | null)` 走。

#### 考点 4：disabledDate 禁用日期函数的约定

antd 定下的约定值得抄：`disabledDate: (current: Dayjs) => boolean`——入参是格子对应的 Dayjs（日粒度），返回 `true` 即禁用。三条纪律：

1. **纯函数 + 快**：42 个格子每格调用一次，翻页再调，里面别做任何昂贵计算；
2. **粒度对齐**：与"今天"比较前先 `startOf('day')`，否则当天下午比较 `isBefore(now)` 会把今天上午也禁了；
3. **上下文感知**：范围选择第二边需要"早于 start 的都禁"，这靠把 start 闭包进 disabledDate（antd 里用 `onCalendarChange` 记住第一边后动态生成）。

```tsx
import dayjs, { type Dayjs } from 'dayjs';

// 规则一：禁用今天之前（含/不含今天的两种口径，面试常问）
export const disablePastIncludeToday = (current: Dayjs) =>
  current.isBefore(dayjs().startOf('day'));          // 今天可选：今天 00:00 之前才禁
export const disablePastExcludeToday = (current: Dayjs) =>
  current.isBefore(dayjs().endOf('day'));            // 今天也不可选：今天 24:00 之前都禁

// 规则二：只允许未来 7 天内
export const disableBeyondWeek = (current: Dayjs) => {
  const start = dayjs().startOf('day');
  return current.isBefore(start) || current.isAfter(start.add(7, 'day'));
};

// 规则三：范围第二边——禁用所有早于 start 的日期（含当天则用 isSameOrBefore）
export const makeDisableBeforeStart = (start: Dayjs, includeStart = false) =>
  (current: Dayjs) =>
    includeStart
      ? current.isSameOrBefore(start, 'day')   // 连 start 当天也禁（选时间段的严格模式）
      : current.isBefore(start, 'day');

// antd RangePicker 里的组合用法：
// <RangePicker
//   disabledDate={current => current.isBefore(dayjs().startOf('day'))}
//   onCalendarChange={(vals) => setFirstPick(vals?.[0] ?? null)} // 第一次点击就暴露单边值
// />
// 第二边规则动态生成：firstPick ? makeDisableBeforeStart(firstPick) : 静态规则
```

#### 考点 5：键盘直接输入解析（input 与面板双向同步 + dayjs 容错）

面板是给鼠标的，键盘用户的路径是**直接敲输入框**。这就产生了两条写 value 的路：点面板、敲输入。同步策略：

- **输入 → 面板**：敲完（Enter 或 blur）解析文本，合法则写 value 且面板视图跳到该月；
- **面板 → 输入**：点选后输入框立即重排为 `format(value)`（value 是唯一事实源，输入框只是它的展示层）；
- **容错**：解析失败不清空输入框（保留用户原样，边框标红），blur 时从 value 重新格式化——**绝不静默吞掉用户输入，也绝不把非法输入写进 value**。

dayjs 的严格解析是容错核心：`dayjs(text, format, true)` 第三参开启严格模式，`2024-02-30`（2 月没有 30 日）、`2024-1`（缺位）、`2024/02/01`（分隔符不符）一律 `isValid() === false`。宽松模式的模糊回滚（2-30 悄悄变 3-1）正是要防的事故：

```tsx
import { useEffect, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

const DISPLAY_FORMAT = 'YYYY-MM-DD';
/** 用户手敲的合法形态白名单：逐个严格解析，谁先过用谁 */
const INPUT_FORMATS = ['YYYY-MM-DD', 'YYYY-M-D', 'YYYYMMDD', 'YYYY.MM.DD', 'YYYY/MM/DD'];

export function parseInputDate(text: string): Dayjs | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const fmt of INPUT_FORMATS) {
    const d = dayjs(trimmed, fmt, true);   // true = 严格模式：越界日期、缺位、错分隔符全部 Invalid
    if (d.isValid()) return d;
  }
  return null;                             // 全部不匹配：交由调用方标红，不静默回滚
}

/** 输入框 + 面板双向同步的受控桥 */
export function PickerInput({ value, onChange, disabledDate }: {
  value: Dayjs | null;
  onChange: (d: Dayjs | null) => void;
  disabledDate?: (d: Dayjs) => boolean;
}) {
  const [text, setText] = useState(() => value?.format(DISPLAY_FORMAT) ?? '');
  const [invalid, setInvalid] = useState(false);
  const focusedRef = useRef(false);

  // 面板 → 输入：value 变化时同步文本（聚焦中不覆盖用户正在敲的字——同步只发生在失焦/外部改值时）
  useEffect(() => {
    if (!focusedRef.current) setText(value?.format(DISPLAY_FORMAT) ?? '');
  }, [value]);

  const commit = () => {
    if (!text.trim()) { onChange(null); setInvalid(false); return; }   // 清空输入 = 清空值
    const parsed = parseInputDate(text);
    if (parsed && !(disabledDate?.(parsed) ?? false)) {
      onChange(parsed);                   // 合法且未禁用：写回 value，输入框随后被格式化重排
      setInvalid(false);
    } else {
      setInvalid(true);                   // 非法/禁用：标红保留原文，value 纹丝不动
    }
  };

  return (
    <input
      value={text}
      onFocus={() => { focusedRef.current = true; }}
      onChange={(e) => { setText(e.target.value); setInvalid(false); }}
      onBlur={() => { focusedRef.current = false; commit(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();                                     // Enter 立即提交
        if (e.key === 'Escape') {                                            // Esc 回滚到 value 的展示
          focusedRef.current = false;
          setText(value?.format(DISPLAY_FORMAT) ?? '');
          setInvalid(false);
          e.currentTarget.blur();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {                  // ↑↓ 步进 ±1 天（键盘党的日历）
          e.preventDefault();
          const base = value ?? dayjs();
          const next = e.key === 'ArrowUp' ? base.add(1, 'day') : base.subtract(1, 'day');
          onChange(next);
        }
      }}
      style={{ border: invalid ? '1px solid #ff4d4f' : '1px solid #d9d9d9', padding: '4px 8px' }}
      aria-invalid={invalid}
      placeholder="YYYY-MM-DD"
    />
  );
}
```

#### 考点 6：presets 快捷项

"今天 / 最近 7 天 / 本月"这类高频选择不该让用户点日历。antd v5 的 `presets` 直接吃 `{ label, value }` 数组（value 支持函数惰性求值——"今天"在面板每次打开时才计算）：

```tsx
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { RangePickerProps } from 'antd/es/date-picker';

// antd 用法（v5）：presets 渲染在面板左侧竖列
const rangePresets: RangePickerProps['presets'] = [
  { label: '今天', value: [dayjs(), dayjs()] },
  { label: '最近 7 天', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
];

<DatePicker.RangePicker presets={rangePresets} />;
```

自实现版本的核心是**把 preset 与"选择提交"走同一条路**——preset 不是独立的第三条写值通道，它只是替用户把一个区间塞进 `pickCell` 的结果位：

```tsx
interface PresetItem { label: string; getValue: () => [Dayjs, Dayjs] } // 惰性求值：点的那刻才算"今天"

function PresetPanel({ presets, onPick }: { presets: PresetItem[]; onPick: (r: [Dayjs, Dayjs]) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderRight: '1px solid #f0f0f0', padding: 8 }}>
      {presets.map((p) => (
        <button key={p.label} type="button" onClick={() => onPick(p.getValue())} style={{ textAlign: 'left' }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

#### 考点 7：PickerShell——antd 的分层思想

> 对标：antd DatePicker（看它怎么把"选择器"抽象成通用 PickerShell）

antd 的日期族（DatePicker/RangePicker/TimePicker，以及 date/week/month/quarter/year 五种 picker 变体）共用一套内核 rc-picker。它的分层是本组件族最重要的一课：

```text
rc-picker 内部分层（源码可查的真实结构）
├── PickerShell（外壳，全部变体共享）
│   ├── 输入框（含解析/格式化/脏状态，考点 5）
│   ├── 弹层开关与定位（接 Part A2 弹层体系）
│   ├── 键盘模型（Esc/Enter/方向键路由）
│   └── value 受控协议（onChange 只在提交时发）
└── Panel（面板，按粒度替换的插件）
    ├── DatePanel      6×7 网格（考点 1）
    ├── MonthPanel     12 格月网格
    ├── YearPanel      十年页
    ├── QuarterPanel   4 格季度
    ├── TimePanel      时分秒列
    └── DatetimePanel  DatePanel + TimePanel 的组合
```

收益立竿见影：新增"季度选择"只写了一个 4 格面板 + 一个格式串，外壳（输入、弹层、键盘、协议）零改动。我们自己也能抽出最小外壳：

```tsx
import type { ReactNode } from 'react';

const POPUP_Z_INDEX = 1050; // z-index 治理见 Part A2，这里以常量示意

/** 通用选择器外壳：输入 + 弹层 + 开关，面板内容完全由调用方注入 */
export function PickerShell({
  input, panel, open, onOpenChange,
}: {
  input: ReactNode;     // 输入区（PickerInput）
  panel: ReactNode;     // 面板区（DatePanel/MonthPanel/自定义面板——外壳不关心）
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }} onClick={() => !open && onOpenChange(true)}>
      {input}
      {open && (
        <div
          style={{ position: 'absolute', top: '100%', left: 0, zIndex: POPUP_Z_INDEX, background: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,.08)', marginTop: 4 }}
          onClick={(e) => e.stopPropagation()}                 // 点面板不触发"点外部关闭"
        >
          {panel}
        </div>
      )}
    </span>
  );
}
// 组装一个日期选择器 = PickerShell + PickerInput + CalendarGrid + usePanelView 的积木
// 组装周选择器 = 同一个 Shell，只换 panel（网格点击映射到 startOf('week')）
```

#### DatePicker 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：选完 12 月，面板自动跳回 10 月（value 所在月）。
根因：把 value 当视图状态用，每次 value 变化都把面板拉回。
修法：viewYear/viewMonth 独立状态，只在"面板打开"这一个时机对齐 value（见考点 2）。

坑 2
症状：英文环境（周日起始）一切正常，切中文（周一起始）后第一列错位、首行出现上上月。
根因：偏移量按固定 day() 计算，没有减 weekStart，负数又没 +7 取模。
修法：leadOffset = (first.day() - weekStart + 7) % 7，weekStart 从 localeData().firstDayOfWeek() 读（见考点 1）。

坑 3
症状：范围选择第二次点击比第一次早，面板无响应或提交出 [晚, 早]。
根因：没做端点交换，或交换只在 UI 层做了、提交没做。
修法：提交前归一化 [min, max]；预览区间同样用 min/max 计算（见考点 3）。

坑 4
症状：输入 2024-02-30 回车，value 变成了 2024-03-01。
根因：dayjs 宽松解析对越界日期静默回滚。
修法：dayjs(text, format, true) 严格模式 + 白名单 formats 逐个尝试，全部失败标红不写值（见考点 5）。

坑 5
症状：disabledDate 里写 current.isBefore(dayjs())，结果"今天"时好时坏（下午测通过、上午测失败）。
根因：拿日粒度格子与含时分秒的"现在"比较，结果随时钟漂移。
修法：比较前统一 startOf('day')/endOf('day')，"今天"口径显式写进规则（见考点 4）。

坑 6
症状：SSR 水合告警/客户端首帧"今天"高亮闪变。
根因：服务端与客户端 locale/时区不一致，"今天"各算各的。
修法：入口处统一 dayjs.locale（antd 侧由 ConfigProvider 注入 locale），"今天"的计算放在 effect 中二次校正。
```

---

### Table（★★★★）——中后台之王

Table 的渲染（几行 `map` 出 `<tr>`）只占它真实复杂度的两成。剩下八成是：**受控协议怎么设计**（分页/排序/筛选三种交互共享一个 onChange）、**布局怎么稳**（固定表头列、列宽拖拽、错位是 Table 的头号 bug）、**状态怎么跨页**（勾选、展开）、**万行怎么活**（虚拟滚动）。这就是原大纲那句判断的分量——

- ⚠️ 本质是"协议工程"：API 设计比渲染难

考点清单（原文）：

- 受控协议设计：分页/排序/筛选 onChange 一次回调带全参
- **固定表头 + 固定列**（sticky/双表同步滚动）；列宽拖拽（拖动时表格布局切换）
- 行选择跨页保持；展开行/树形数据
- 虚拟滚动（万行）；单元格 ellipsis + tooltip

#### 考点 1：受控协议设计（onChange 一次回调带全参，完整类型）

Table 有三种会改变数据视图的交互：翻页、排序、筛选。协议设计的灵魂拷问：分三个回调（onPageChange/onSortChange/onFilterChange）还是一个？antd 的答案是**一个**：`onChange(pagination, filters, sorter, extra)` 四参一次带全。为什么一个更好：

1. **服务端模式下三种状态要合并成一个查询**，分回调会导致业务方自己组装"最新全量状态"，竞态与遗漏全在调用方；
2. **交互有联动**——筛选变了应该回第 1 页，一个回调天然拿到"这次动作之后的完整快照"（`extra.action` 还告诉你这次动的是哪种）；
3. **向后兼容**：加第四种交互（如分组）时给 extra 加字段即可，不新增回调签名。

完整类型定义（与 antd v5 对齐的形态）：

```ts
import type { Key } from 'react';

/** 分页状态：current/pageSize 受控在调用方，total 由数据方回填 */
export interface TablePaginationConfig {
  current?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;   // 是否显示每页条数切换器
}

/** 单列排序结果：order 只有 ascend/descend 两态（三态 UI 的第三态是"取消排序"，用 undefined 表达） */
export interface SorterResult<RecordType> {
  column?: ColumnsType<RecordType>[number]; // 触发排序的列定义
  order?: 'ascend' | 'descend';
  field?: keyof RecordType;                 // 排序字段（取数用）
  columnKey?: string;                       // 列 key（多列排序时区分）
}

/** 筛选状态：列 key → 勾选的筛选值数组（null 表示该列筛选被清空） */
export type FilterValue = Key[] | null;
export type TableFilters = Record<string, FilterValue>;

/** extra：这次动作是什么 + 此刻全量数据是什么 */
export interface TableChangeExtra<RecordType> {
  action: 'paginate' | 'sort' | 'filter';
  currentDataSource: RecordType[];          // 前端模式下：已经过筛选+排序的当前数据（分页前）
}

/** 一次回调带全参——Table 协议的中心签名 */
export type TableOnChange<RecordType> = (
  pagination: TablePaginationConfig,
  filters: TableFilters,
  sorter: SorterResult<RecordType> | SorterResult<RecordType>[],
  extra: TableChangeExtra<RecordType>,
) => void;

export interface ColumnType<RecordType> {
  key?: string;
  title: React.ReactNode;
  dataIndex?: keyof RecordType;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: RecordType, b: RecordType) => number); // 前端排序给比较器；服务端排序给 true（只收状态不发数据）
  filters?: { text: string; value: Key }[];
  onFilter?: (value: Key, record: RecordType) => boolean;        // 前端过滤谓词
  ellipsis?: boolean | { showTitle?: boolean };
  render?: (value: unknown, record: RecordType, index: number) => React.ReactNode;
}
export type ColumnsType<RecordType> = ColumnType<RecordType>[];
```

调用方的完整用法（服务端模式 + 竞态守卫，可直接抄进项目）：

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { TableFilters, TablePaginationConfig, SorterResult } from './table-types';

interface OrderRow { id: string; amount: number; status: string; createdAt: string }

/** 服务端 Table 状态管理：三态合一 + 派生查询参数 + 请求竞态守卫 */
export function useServerTable() {
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<TableFilters>({});
  const [sorter, setSorter] = useState<SorterResult<OrderRow>>({});
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 唯一的 onChange 入口：一次拿到全量快照，派生查询参数只写一遍
  const onChange = useCallback<import('./table-types').TableOnChange<OrderRow>>(
    (nextPagination, nextFilters, nextSorter, extra) => {
      // 联动纪律：筛选/排序变化必须回到第 1 页，否则会停在不存在的高页码上
      if (extra.action !== 'paginate') nextPagination = { ...nextPagination, current: 1 };
      setPagination(nextPagination);
      setFilters(nextFilters);
      const s = Array.isArray(nextSorter) ? nextSorter[0] : nextSorter;
      setSorter(s);
    },
    [],
  );

  // 三态 → 查询参数：协议的"翻译层"，服务端只认这一种形状
  const query = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    orderBy: sorter.field ? String(sorter.field) : undefined,
    order: sorter.order,                       // ascend | descend | undefined
    ...Object.fromEntries(
      Object.entries(filters)
        .filter(([, v]) => v && v.length > 0)
        .map(([k, v]) => [k, (v as KeyLike[]).join(',')]),
    ),
  };

  useEffect(() => {
    const ac = new AbortController();          // 竞态守卫：同 Select 远程搜索同款（Lv3 Select 考点 5）
    setLoading(true);
    fetch(`/api/orders?${new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    )}`, { signal: ac.signal })
      .then((r) => r.json() as Promise<{ data: OrderRow[]; total: number }>)
      .then(({ data, total }) => {
        setRows(data);
        setPagination((p) => ({ ...p, total })); // total 由服务端回填——分页器才知道有几页
      })
      .catch(() => void 0)
      .finally(() => setLoading(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, filters, sorter.field, sorter.order]);

  return { rows, loading, pagination, filters, sorter, onChange };
}
type KeyLike = string | number;
```

antd 侧写法（`TableProps['onChange']` 直接复用官方类型）：

```tsx
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

const onChange: TableProps<OrderRow>['onChange'] = (
  pagination, filters: Record<string, FilterValue | null>,
  sorter: SorterResult<OrderRow> | SorterResult<OrderRow>[], extra,
) => {
  if (extra.action === 'filter') setPage(1); // antd 不会替你重置页码，联动要自己做（见文末坑 1）
  setQuery({ page: pagination.current ?? 1, pageSize: pagination.pageSize ?? 20,
    orderBy: sorter.field, order: sorter.order, filters });
};
```

#### 考点 2：固定表头 + 固定列（sticky + 双表同步滚动 + 阴影指示）

这是 Table 布局的头号难题，先讲清两代方案再动手：

- **双表方案（antd v4 风格）**：表头和表体拆成**两个独立的 `<table>`**，各自拥有同名 `colgroup`。外层容器纵向滚动时表头天然不动；难点是**列宽同步**——两个 table 必须逐列等宽，否则错位。rc-table 的做法是测量表头单元格真实宽度，再把宽度受控写回两个 colgroup 的 `<col>` 上（所以 antd Table 对"宽度不确定的列"敏感，见坑 2）。
- **sticky 方案（antd v5 现行）**：只渲染一个 `<table>`，表头 `th` 用 `position: sticky; top: 0`；固定列 `td/th` 用 `position: sticky; left/right: 偏移量`。偏移量不是手填的——左固定列的偏移 = 它左边所有左固定列宽度之和，由 `useStickyOffsets` 逐列累加算出。**阴影指示**：滚动位置在左边缘时左阴影不显示（否则静止状态也有裂痕感），rc-table 在容器上切换 `ant-table-ping-left / ant-table-ping-right` 两个类来开关首尾固定列的 box-shadow。

手写一个浓缩版（单表 + sticky 表头 + 左右固定列 + 阴影状态机）：

```tsx
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ColumnsType } from './table-types';

/** 粘性偏移计算：antd useStickyOffsets 的核心逻辑——左固定向右累加，右固定向左累加 */
export function useStickyOffsets<RecordType>(columns: ColumnsType<RecordType>, widths: number[]) {
  return useMemo(() => {
    const leftOffsets: (number | null)[] = [];
    let acc = 0;
    columns.forEach((col, i) => {
      if (col.fixed === 'left') { leftOffsets[i] = acc; acc += widths[i] ?? 0; }
      else leftOffsets[i] = null;
    });
    const rightOffsets: (number | null)[] = new Array(columns.length).fill(null);
    acc = 0;
    for (let i = columns.length - 1; i >= 0; i--) {           // 右固定从末列反向累加
      if (columns[i].fixed === 'right') { rightOffsets[i] = acc; acc += widths[i] ?? 0; }
    }
    return { leftOffsets, rightOffsets };
  }, [columns, widths]);
}

/** 固定表头 + 固定列 + 滚动阴影指示的最小实现 */
export function StickyTable<RecordType extends { id: string }>({
  columns, widths, data, maxHeight = 400,
}: {
  columns: ColumnsType<RecordType>;
  widths: number[];
  data: RecordType[];
  maxHeight?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ping, setPing] = useState({ left: false, right: false });
  const { leftOffsets, rightOffsets } = useStickyOffsets(columns, widths);

  // 阴影状态机：只有"真的滚进固定区"才亮对应阴影（对应 rc-table 的 ant-table-ping-left/right）
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setPing((prev) => {
      const next = {
        left: el.scrollLeft > 0,                                           // 左侧有内容被盖住 → 左阴影
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,        // 右侧还有内容 → 右阴影（-1 容差防小数）
      };
      return prev.left === next.left && prev.right === next.right ? prev : next; // 不变不 setState，防抖
    });
  };

  const cellStyle = (i: number): CSSProperties => ({
    position: 'sticky',
    left: leftOffsets[i] != null ? leftOffsets[i]! : undefined,
    right: rightOffsets[i] != null ? rightOffsets[i]! : undefined,
    zIndex: 1, // 高于普通单元格；表头的固定单元格再 +1（见下方 thead 覆盖）
    background: '#fff',                                // sticky 单元格必须不透明，否则滚动时底下内容透出
    boxShadow:
      columns[i].fixed === 'left' && ping.left && leftOffsets[i] === Math.max(...columns.map((c, j) => (c.fixed === 'left' ? leftOffsets[j] ?? -1 : -1)))
        ? '2px 0 8px rgba(0,0,0,.12)'                   // 最右一个左固定列：滚动中显示右侧阴影
        : columns[i].fixed === 'right' && ping.right && rightOffsets[i] === 0
          ? '-2px 0 8px rgba(0,0,0,.12)'                // 最左一个右固定列：滚动中显示左侧阴影
          : undefined,
  });

  return (
    <div ref={scrollRef} onScroll={onScroll} style={{ maxHeight, overflow: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
        {/* table-layout: fixed + colgroup 定宽：列宽完全受控，拖拽列宽（考点 3）才有效 */}
        <colgroup>{columns.map((c, i) => <col key={c.key ?? i} style={{ width: widths[i] }} />)}</colgroup>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={col.key ?? i} style={{ ...cellStyle(i), position: 'sticky', top: 0, zIndex: 2 /* 表头永远压过固定列 */ }}>
                {col.title as ReactNode}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col, i) => (
                <td key={col.key ?? i} style={cellStyle(i)}>
                  {col.render ? col.render(row[col.dataIndex!], row, i) : String(row[col.dataIndex!] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

antd 的对应开关极其简陋但讲究：`scroll={{ y: 400 }}` 开固定表头，`scroll={{ x: 'max-content' }}` 给横向滚动（固定列的前提），列上 `fixed: 'left' | 'right'`。**`scroll.x` 缺失是固定列错位的第一大根因**——没有横向滚动就没有 sticky 的用武之地。

#### 考点 3：列宽拖拽（colgroup 受控更新）

列宽拖拽的本质：**把 `<col>` 的 width 从"浏览器自主"改成"React 受控"**，拖动只是更新 state 里的 widths 数组。实现要点：

1. `table-layout: fixed` 必须开——auto 布局下浏览器自作主张调整列宽，拖了也不准；
2. 拖拽手柄用 **Pointer Events + `setPointerCapture`**（鼠标/触摸/笔统一，且移出元素仍持续接收 move）；
3. 拖动过程禁用文本选择（`user-select: none`）并 clamp 最小宽度；
4. antd 官方"可伸缩列"demo 用 react-resizable 的 `<Resizable>` 包住表头单元格，`onResize` 回调把宽度写回 columns——同一思想的现成轮子。

```tsx
import { useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';

/** 列宽拖拽手柄：pointer capture + 受控 colgroup 宽度 */
export function useColumnResize(initialWidths: number[], minWidth = 60) {
  const [widths, setWidths] = useState(initialWidths);
  const dragRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  const onHandlePointerDown = useCallback((colIndex: number) => {
    return (e: ReactPointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();                                    // 不能冒泡成表头点击（排序）
      dragRef.current = { colIndex, startX: e.clientX, startWidth: widths[colIndex] };
      e.currentTarget.setPointerCapture(e.pointerId);         // 捕获：指针移出窗口也持续收到 move/up
      document.body.style.userSelect = 'none';                // 拖动期间禁选文本
      document.body.style.cursor = 'col-resize';
    };
  }, [widths]);

  const onHandlePointerMove = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    setWidths((prev) => {
      const next = [...prev];
      next[drag.colIndex] = Math.max(minWidth, drag.startWidth + dx); // clamp 最小宽
      return next;
    });
  }, [minWidth]);

  const onHandlePointerUp = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleFor = (colIndex: number) => (
    <span                                                    // 渲染在 th 右缘的 4px 热区
      onPointerDown={onHandlePointerDown(colIndex)}
      onPointerMove={onHandlePointerMove}
      onPointerUp={onHandlePointerUp}
      style={{ position: 'absolute', right: -2, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }}
      aria-hidden
    />
  );

  return { widths, handleFor };
}
// 与 StickyTable 对接：把这里的 widths 传给 StickyTable 的 widths prop，
// th 渲染时追加 {handleFor(i)}——拖动即受控更新 colgroup，双表/sticky 布局同步生效。
```

与 react-resizable 整合的 antd 惯用形态（表头包 `<Resizable>`，宽度进 columns）：

```tsx
import { Resizable } from 'react-resizable'; // antd 官方 demo 同款依赖：pnpm add react-resizable

// <Resizable width={width} height={0} onResize={(_, { size }) => setColWidth(size.width)}>
//   <th style={{ position: 'relative' }}>{title}{handle}</th>
// </Resizable>
```

#### 考点 4：行选择跨页保持（rowKey 记录集合，而非页内索引）

行选择的状态必须是 **rowKey 的集合**（`Set<Key>`），绝不能是页内下标——翻页后下标 3 是另一行，勾选会"漂移"。跨页保持的关键在：**翻页只是 dataSource 换了一批，选择集合不动**；表头/行的三态勾选框由"当前页行 keys 与集合的交集"派生：

- 表头 checked：当前页所有行都在集合中；
- 表头 indeterminate：部分在；
- 反选表头：把当前页行 keys 从集合中整体加入/移除（不是清空集合）。

另一个深坑：**跨页已选的 rows 拿不到原始数据**。集合里存的是 key，第 3 页选的 key 翻回第 1 页时 dataSource 里没有对应行。antd 的 `preserveSelectedRowKeys` 只保证 keys 不丢，`selectedRows` 里依然只有"当前 dataSource 里找得到的行"——提交时需要 key → row 的自维护缓存：

```tsx
import { useMemo, useRef, useState } from 'react';
import type { Key } from 'react';

/** 跨页行选择：key 集合 + row 缓存（解决 selectedRows 缺行） */
export function useRowSelection<Row extends { key: Key }>(fetchRowByKey?: (keys: Key[]) => Promise<Row[]>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<Key>>(new Set());
  const rowCacheRef = useRef(new Map<Key, Row>());       // key → 原始行：翻页后仍可还原完整数据

  const toggleRow = (key: Key, row: Row) => {
    rowCacheRef.current.set(key, row);                   // 见到行就缓存，永远来得及
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /** 表头三态：以"当前页行"为基准派生，与全量集合解耦 */
  const headerState = (pageRows: Row[]) => {
    const hit = pageRows.filter((r) => selectedKeys.has(r.key)).length;
    return { checked: hit === pageRows.length && pageRows.length > 0, indeterminate: hit > 0 && hit < pageRows.length };
  };

  const togglePage = (pageRows: Row[], checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        rowCacheRef.current.set(r.key, r);
        checked ? next.add(r.key) : next.delete(r.key);  // 整页加入/移除，绝不动其他页的选择
      }
      return next;
    });
  };

  /** 提交口径：全部选中的完整 rows（含已不在当前页的），必要时回源补拉 */
  const selectedRows = useMemo(() => {
    const all = [...selectedKeys].map((k) => rowCacheRef.current.get(k)).filter((r): r is Row => !!r);
    return all;
  }, [selectedKeys]);

  const resolveMissing = async (): Promise<Row[]> => {
    const missing = [...selectedKeys].filter((k) => !rowCacheRef.current.has(k));
    if (missing.length && fetchRowByKey) {
      for (const r of await fetchRowByKey(missing)) rowCacheRef.current.set(r.key, r);
    }
    return [...selectedKeys].map((k) => rowCacheRef.current.get(k)!);
  };

  return { selectedKeys, selectedRows, toggleRow, togglePage, headerState, resolveMissing };
}
```

antd 的对应配置：`rowKey="id"`（唯一、稳定）+ `rowSelection={{ preserveSelectedRowKeys: true }}`。注意 antd 的 `onChange(selectedRowKeys, selectedRows)` 里 selectedRows 在跨页场景是"残缺"的，这正是上面自维护缓存的存在理由。

#### 考点 5：展开行 / 树形数据（children 递归渲染与缩进）

两种"行变多行"的形态共用一套机制：

- **展开行**：`expandedRowRender(record)` 给任意行配一个"子内容区"，占满整行宽，常用于详情/表单；
- **树形数据**：行自带 `children` 数组（antd 默认字段名 `children`，可用 `childrenColumnName` 改），子行是真正的表格行，按 `depth` 缩进 + 展开箭头。

实现要点：展开状态必须受控在 key 集合上（和行选择同理）；树形渲染就是 Part A 之外本篇 Tree 一节递归渲染的"表格版"——**缩进不用嵌套 DOM，用 depth 乘缩进单位算 paddingLeft**，这保证 colgroup 列宽语义不被破坏：

```tsx
import { Fragment, useState } from 'react';
import type { Key, ReactNode } from 'react';

export interface TreeRow { key: Key; name: string; children?: TreeRow[] }

export function TreeTableBody({
  rows, expandedKeys, onToggle, depth = 0, indentUnit = 24,
}: {
  rows: TreeRow[];
  expandedKeys: Set<Key>;
  onToggle: (key: Key) => void;
  depth?: number;
  indentUnit?: number;
}) {
  const renderRows = (list: TreeRow[], d: number): ReactNode =>
    list.map((row) => {
      const hasChildren = !!row.children?.length;
      const expanded = expandedKeys.has(row.key);
      return (
        // 一行 = 行本体 + 可选子行序列：Fragment 承载多节点，key 落在 Fragment 上（key 铁律不打折）
        <Fragment key={row.key}>
          <tr>
            <td>
              <span style={{ paddingLeft: d * indentUnit, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {hasChildren ? (
                  <button aria-label={expanded ? '收起' : '展开'} aria-expanded={expanded}
                    onClick={() => onToggle(row.key)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    {expanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span style={{ display: 'inline-block', width: 16 }} /> // 叶子行占位对齐
                )}
                {row.name}
              </span>
            </td>
          </tr>
          {/* 子行不是嵌套 DOM，而是平铺的 <tr>——paddingLeft 由 depth 计算 */}
          {hasChildren && expanded ? renderRows(row.children!, d + 1) : null}
        </Fragment>
      );
    });
  return <>{renderRows(rows, depth)}</>;
}

// 受控展开：
// const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());
// const onToggle = (k: Key) => setExpandedKeys(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
```

两个工程坑提前立牌：**`defaultExpandAllRows` 只在首挂载那一刻生效**，异步加载的数据不会再自动展开（要用受控 expandedKeys 自己算全量）；展开行的"整行跨列"实现要用 `colSpan={columns.length}` 吃掉整行。

#### 考点 6：虚拟滚动（万行）

万行的前 20 条在视口里，其余 9980 条的 `<tr>` 全是白渲染。行级窗口化与 Select 考点 4 的公式完全同源，差别只是行高通常更大、且要和 sticky 表头/固定列共存。antd v5.9+ 直接给 Table 开了 `virtual` 开关（要求同时给 `scroll.y`，行高需稳定）：

```tsx
import { Table } from 'antd';

// antd 万行：virtual 要求定高行；内部走 rc-virtual-list 窗口化
<Table
  virtual
  scroll={{ x: 1000, y: 500 }}
  rowKey="id"
  columns={columns}
  dataSource={tenThousandRows}
  pagination={false}
/>
```

自实现的行窗口化（与考点 2 的 StickyTable 拼装，公式与 Select 一致）：

```tsx
import { useState } from 'react';

const ROW_HEIGHT = 44;

export function useVirtualRows(total: number, viewportHeight: number, overscan = 8) {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const endIndex = Math.min(total, Math.ceil(viewportHeight / ROW_HEIGHT) + startIndex + overscan * 2);
  return {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop),
    startIndex, endIndex,
    topPad: startIndex * ROW_HEIGHT,                 // 撑高条（上）
    bottomPad: Math.max(0, (total - endIndex) * ROW_HEIGHT), // 撑高条（下）
    slice: <T,>(rows: T[]) => rows.slice(startIndex, endIndex),
  };
}
// 渲染：<tbody>
//   <tr style={{height: topPad}} aria-hidden />       ← 上撑高
//   {slice(data).map(row => <RealRow key={row.id} />)}
//   <tr style={{height: bottomPad}} aria-hidden />    ← 下撑高
// </tbody>
// 注意：行高必须恒定（ROW_HEIGHT 是协议的一部分）；动态行高需测量缓存，见本篇 VirtualList 小节
```

#### 考点 7：单元格 ellipsis + tooltip

长文本单元格三件套：`table-layout: fixed` + 列定宽 + CSS 三行省略；再加"**只有真溢出才给 tooltip**"（没溢出也弹 tip 是骚扰）——判定方法与 Lv1 Typography 同款：`scrollWidth > clientWidth` 即溢出。antd 列配置 `ellipsis: { showTitle: false }` 关掉原生 title，再在 render 里包自己的 Tooltip：

```tsx
import { useRef, useState, type ReactNode } from 'react';

/** 溢出才显示 tooltip 的单元格（判定：scrollWidth > clientWidth，Lv1 Typography 同款测量） */
export function EllipsisCell({ children, maxWidth = 200 }: { children: ReactNode; maxWidth?: number }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false); // hover 中且确实溢出才为 true
  return (
    <div
      ref={cellRef}
      onMouseEnter={() => {
        const el = cellRef.current;
        if (el) setOverflow(el.scrollWidth > el.clientWidth); // 悬停瞬间测量：内容随数据更新也总能测对
      }}
      onMouseLeave={() => setOverflow(false)}
      style={{ maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}
    >
      {children}
      {overflow && (
        <span
          role="tooltip"
          style={{ position: 'absolute', left: 0, bottom: '100%', background: 'rgba(0,0,0,.75)', color: '#fff',
            padding: '4px 8px', borderRadius: 4, whiteSpace: 'normal', zIndex: 10, pointerEvents: 'none' }}
        >
          {children} {/* 完整内容浮层：whiteSpace: normal 允许多行 */}
        </span>
      )}
    </div>
  );
}
```

antd 写法对照：`ellipsis: true`（原生 title 兜底）或 `ellipsis: { showTitle: false }` + render 里包 `<Tooltip title={text}>`。

#### 考点 8："本质是协议工程"的论证

> ⚠️ 本质是"协议工程"：API 设计比渲染难

这句话的完整论证分三层：

1. **一致性**：分页/排序/筛选/勾选/展开五种状态并存，每种又有前端/服务端两种模式。协议一旦不统一（比如排序单独搞个 `onSortChange`），调用方就要自己拼装"当前全量状态"，竞态、漏字段、双份事实源全在业务侧炸开。antd 用一个 `onChange` 四参快照 + `extra.action` 溯源，把一致性成本收进组件内部。
2. **组合爆炸**：树形 × 勾选 × 跨页保持 × 虚拟滚动 × 固定列——五个开关理论 32 种组合，每一种都可能是 bug 工单。协议设计者必须为组合排优先级（比如 antd 明确 virtual 与部分 expandable 组合的行为边界），这是渲染层永远不用面对的问题。
3. **向后兼容**：Table 是被成千上万后台页面依赖的组件，`onChange` 的参数形状改一个字段名就是破坏性变更。所以协议要"一次给全、字段可扩展、语义不漂移"——新能力加在 `extra`/列配置里，老回调签名十年不动。

反过来说：**把渲染写对只需要懂 React，把协议设计对需要懂"两年后的调用方会怎么骂你"**。这就是 Table 被称为中后台之王的真正原因——它考的不是 `map` 出 `<tr>`，是 API 的远见。

#### Table 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：筛选后停在空页（页码 5，结果只剩 2 页）。
根因：antd 的 onChange 不会替你重置 current——筛选/排序变更时页码保持原值。
修法：onChange 里判断 extra.action !== 'paginate' 时强制 current: 1（见考点 1 示例）。

坑 2
症状：固定列与表体错位 1~N 像素，窗口缩放后加剧。
根因：未设 scroll.x / 存在宽度不确定的列，sticky 偏移按"估算宽"累加与实际渲染宽不符。
修法：scroll={{ x: 'max-content' }} 或给每列定宽；拖拽列宽时同步更新 colgroup（见考点 2/3）。

坑 3
症状：控制台警告 "Each record in table should have a unique key"，且勾选/展开莫名错行。
根因：没配 rowKey，框架回落到数组 index；翻页/排序后 index 对应的行换了人。
修法：rowKey 指向业务唯一键；确实没有就先在数据层补一个稳定的派生 key。

坑 4
症状：跨页多选提交时 selectedRows 比 selectedRowKeys 少。
根因：antd 的 selectedRows 只含当前 dataSource 里能匹配到的行，翻页即"失忆"。
修法：preserveSelectedRowKeys 保 keys；rows 自维护 key→row 缓存，提交前按 keys 补齐（见考点 4）。

坑 5
症状：拖列宽时整表抖动/文本被选中成片高亮。
根因：未开 table-layout: fixed（浏览器 auto 布局反算列宽）+ 未禁 user-select。
修法：fixed 布局 + colgroup 受控宽度 + pointer capture 期间 body 层禁选文本（见考点 3）。

坑 6
症状：开了 virtual 后行高不一的表格滚动跳动、sticky 表头穿帮。
根因：虚拟窗口化的前提是定高，行高漂移导致窗口估算错位。
修法：让 ROW_HEIGHT 成为协议（截断/固定行高），变高内容放展开行而不是撑高单元格。

坑 7
症状：多列排序时 onChange 里的 sorter 是数组，取 sorter.field 拿到 undefined。
根因：多列排序（多列 sorter 同时激活）时 sorter 参数是数组。
修法：先 Array.isArray 判别再取值（见考点 1 类型定义，两者都写进了类型）。
```

### Tabs（★★★）

Tabs 是 Lv3 里唯一"看起来简单"的组件——切个 tab 谁不会？但把它做到**键盘可用、读屏可用、动画流畅、页签可溢出**，每一项背后都是一个独立考点。Radix 的 Tabs 源码是这一节的最佳读物：它只做行为与无障碍，几百行，把四个考点全占齐了：

```tsx
import * as Tabs from '@radix-ui/react-tabs';

// Radix 的 compound API：结构由消费者拼装，行为由库注入
<Tabs.Root defaultValue="account">
  <Tabs.List aria-label="账户设置">
    <Tabs.Trigger value="account">账户</Tabs.Trigger>
    <Tabs.Trigger value="password">密码</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account">账户表单</Tabs.Content>
  <Tabs.Content value="password">密码表单</Tabs.Content>
</Tabs.Root>
```

考点清单（原文）：

- compound 模式 + roving tabindex + aria roles
- 懒渲染 vs 保持挂载（destroyInactiveTabPane）；溢出滚动箭头
- **指示条动画**（下划线宽度/位置过渡 = FLIP 的迷你应用）

#### 考点 1：compound 模式 + roving tabindex + aria 对照

**compound（复合组件）模式**：`Tabs.Root/List/Trigger/Content` 各自是独立组件，通过 Context 共享状态。相比"一个 props 大对象"（`tabs={[{key,label,content}]}`）的优势：结构与顺序由消费者 JSX 决定（Trigger 里塞图标/徽标、List 与 Content 之间插任意元素都不用改库）、类型上天然支持任意 ReactNode、 SSR 输出的 DOM 结构可控。这是 Part A 之外又一次"API 形态即架构"的示范。

**roving tabindex**（Part A4 内功在 Tabs 上的落地）：整个 tablist 只允许**一个 tab stop**——激活项 `tabIndex=0`，其余全部 `tabIndex=-1`。Tab 键从外部进入时直接落在激活项上；↑↓←→/Home/End 在 list 内部移动激活项，且**焦点必须跟着走**（只改 tabIndex 不调 focus() 是最常见的半成品）。aria 契约照抄 WAI-ARIA Tabs Pattern：

```text
元素            role       关键 aria 属性                                键盘行为
────────────────────────────────────────────────────────────────────────────────────────
Tabs.List       tablist    aria-orientation="horizontal"                自身不可聚焦
Tabs.Trigger    tab        aria-selected / aria-controls / id / tabIndex  ↑↓←→ Home End 移动激活并聚焦（roving）
Tabs.Content    tabpanel   aria-labelledby / tabIndex=0 / hidden          Tab 键进入 panel；panel 可自身滚动时也可聚焦
双 id 联动      —          trigger.id ↔ panel.aria-labelledby             两个方向的引用必须成对出现：
                           trigger.aria-controls ↔ panel.id               读屏靠它把"页签"和"面板"缝在一起
```

完整实现（compound + Context + roving + aria，可直接运行）：

```tsx
import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';

/* ---------------- Context：compound 模式的"隐形总线" ---------------- */
interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  triggerRefs: Map<string, HTMLButtonElement | null>; // 每个 Trigger 注册自己的 DOM，供键盘移动时 focus
  baseId: string;                                     // useId 生成，保证同页多实例 id 不冲突（SSR 安全，Part A7）
}
const TabsContext = createContext<TabsContextValue | null>(null);
const useTabsCtx = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs 子组件必须渲染在 <Tabs.Root> 内——compound 模式的边界约束');
  return ctx;
};

export function TabsRoot({ defaultValue, children, onChange }: {
  defaultValue: string;
  children: ReactNode;
  onChange?: (v: string) => void;
}) {
  const baseId = useId();
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>()).current; // ref 稳定性：Map 实例跨渲染复用
  const [value, setValueRaw] = useState(defaultValue);
  const setValue = (v: string) => { setValueRaw(v); onChange?.(v); };
  return (
    <TabsContext.Provider value={{ value, setValue, triggerRefs, baseId }}>
      {children}
    </TabsContext.Provider>
  );
}

/* ---------------- List：键盘模型唯一入口 ---------------- */
export function TabsList({ children, 'aria-label': ariaLabel }: { children: ReactNode; 'aria-label'?: string }) {
  const { value, setValue, triggerRefs } = useTabsCtx();
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = [...triggerRefs.keys()];
    if (!keys.length) return;
    const idx = keys.indexOf(value);
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': next = (idx + 1) % keys.length; break; // 环形：末尾回绕到首个
      case 'ArrowLeft':  case 'ArrowUp':   next = (idx - 1 + keys.length) % keys.length; break;
      case 'Home': next = 0; break;
      case 'End':  next = keys.length - 1; break;
    }
    if (next != null) {
      e.preventDefault();
      const nextKey = keys[next];
      setValue(nextKey);                                  // 激活先行（automatic activation 模式）
      triggerRefs.get(nextKey)?.focus();                  // 焦点跟随——roving 的灵魂，漏掉就是"键盘假支持"
    }
  };
  return (
    <div role="tablist" aria-orientation="horizontal" aria-label={ariaLabel} onKeyDown={onKeyDown}
      style={{ display: 'flex', gap: 8, borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, setValue, triggerRefs, baseId } = useTabsCtx();
  const isActive = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}       // 指向面板：读屏可跳转
      tabIndex={isActive ? 0 : -1}                     // roving tabindex：整个 list 只有一个 tab stop
      ref={(el) => { triggerRefs.set(value, el); }}    // 注册 DOM：键盘移动时 focus 用（React 19 ref-as-prop）
      onClick={() => setValue(value)}
      style={{ padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
        color: isActive ? '#1677ff' : undefined, fontWeight: isActive ? 600 : 400 }}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, baseId } = useTabsCtx();
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}        // 反向引用：与 aria-controls 成对
      tabIndex={0}                                      // panel 自身可聚焦：键盘用户 Tab 能落到内容区起点
      hidden={!active}                                  // hidden 而非卸载：默认策略是"懒渲染后保持挂载"（见考点 2）
    >
      {active ? children : null}
    </div>
  );
}
```

antd 的非 compound 形态（`items` 数组）是另一种取舍：API 更紧凑、类型约束更强，但结构自由度低。两种形态都该会写。

#### 考点 2：懒渲染 vs 保持挂载（取舍表）

"没激活过的面板要不要渲染？离开的面板要不要销毁？"没有标准答案，只有取舍表：

| 策略 | antd 配置 | 挂载时机 | 组件状态 | 内存 | 典型场景 |
|---|---|---|---|---|---|
| 懒渲染 + 保持（默认） | `items` 默认行为 | **首次激活**才挂载，之后一直保持 | 保留 | 中 | 大多数后台页签 |
| 强制预挂载 | item 级 `forceRender` | 首屏即挂载（hidden 藏起） | 保留 | 高 | **隐藏页签里有 Form**：校验/取值需要字段真实在 DOM 中 |
| 离开即销毁 | Tabs 级 `destroyInactiveTabPane` | 离开即卸载 | 重置 | 低 | 页签内容昂贵（编辑器/播放器/长列表），或业务要求"每次进入全新" |

```tsx
import { Tabs } from 'antd';

<Tabs
  destroyInactiveTabPane                 // 离开即卸载：状态全部重来
  items={[
    { key: 'basic', label: '基本信息', children: <BasicForm /> },
    { key: 'ext', label: '扩展信息', forceRender: true, children: <ExtForm /> }, // 隐藏也要挂载：表单校验需要
  ]}
/>
```

判断口诀：**状态要不要跨页签保留？要 → 前两种；不要且内容贵 → 销毁。表单在隐藏页签 → forceRender，别犹豫**（校验错误提示需要真实 DOM，卸载态的表单校验是后台高频工单）。

#### 考点 3：溢出滚动箭头（scrollIntoView 时机）

页签多到放不下时，成熟方案是"横向滚动 + 两侧渐隐箭头"，三个细节：

1. **何时显示箭头**：`scrollWidth > clientWidth` 才显示（ResizeObserver 监听，窗口缩放实时正确）；
2. **激活页签必须可见**：切换页签后把它滚进视口——时机在**激活值变化后的 effect**里，此时 DOM 已更新但浏览器还没绘制，`scrollIntoView({ inline: 'nearest' })` 不会闪；
3. **首屏也要校准**：初始激活项可能一开始就在溢出区（defaultValue 是最后一个 tab），挂载 effect 同样跑一次。

```tsx
import { useEffect, useRef, useState } from 'react';

/** 溢出感知 + 激活项自动滚入视口 的 tablist 容器（包在 TabsList 外层） */
export function OverflowList({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null); // 滚动容器 = 查询作用域，同一个 ref 两个角色
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // 溢出检测：ResizeObserver 监听容器与内容（字体晚加载导致内容变宽也能感知）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const has = el.scrollWidth > el.clientWidth + 1;
      setOverflow((prev) => {
        const next = { left: has && el.scrollLeft > 0, right: has && el.scrollLeft < el.scrollWidth - el.clientWidth - 1 };
        return prev.left === next.left && prev.right === next.right ? prev : next; // 不变不触发渲染
      });
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild); // 内容尺寸变化（增删页签/字体加载）也触发
    el.addEventListener('scroll', check, { passive: true });    // 滚动时更新箭头可用态（passive：见 Part A6）
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  }, []);

  // 激活项滚入视口：值变化后的 effect —— DOM 已更新、尚未绘制，滚动不闪（时机是本考点的核心）
  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]') // TabsTrigger 渲染 data-active 属性
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  const scrollBy = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {overflow.left && <button aria-label="向左滚动" onClick={() => scrollBy(-1)}>‹</button>}
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
      {overflow.right && <button aria-label="向右滚动" onClick={() => scrollBy(1)}>›</button>}
    </div>
  );
}
```

antd/rc-tabs 内部同样实现了 overflow 感知 + 激活项 `scrollTo`，并把指示条几何信息（width/left）传给自定义 tabbar（`renderTabBar` 可拦截）。

#### 考点 4：指示条动画（FLIP 的迷你应用）

下划线指示条要从旧 tab 平滑滑到新 tab。难点：两个 tab 宽度不同、位置不同，`left/width` 的 CSS transition 在"宽度+位置同时变"时会走对角线插值（视觉上像伸缩虫）。标准解法是 **FLIP**（First-Last-Invert-Play）——把"布局变化"翻译成"从旧几何到新几何的 transform"，transform 走合成层，性能与观感都对：

- **First**：切换前记录指示条旧几何（offsetLeft/offsetWidth）；
- **Last**：切换后（useLayoutEffect，DOM 已更新）读取新几何；
- **Invert**：先给指示条施加 `translateX(旧左-新左) scaleX(旧宽/新宽)`（视觉上它还在旧位置），transition 关掉；
- **Play**：强制 reflow 后清掉 transform、打开 transition——浏览器从"旧几何"动画到"新几何"。

```tsx
import { useLayoutEffect, useRef, useState } from 'react';

/** Tabs 指示条：FLIP 迷你实现 */
export function TabIndicator({ listRef, activeKey }: { listRef: React.RefObject<HTMLElement | null>; activeKey: string }) {
  const barRef = useRef<HTMLSpanElement>(null);
  const prevRectRef = useRef<{ left: number; width: number } | null>(null); // First：上一次的几何
  const [, force] = useState(0); // 仅用于触发重渲染让指示条跟随首帧

  useLayoutEffect(() => {
    const bar = barRef.current;
    const activeEl = listRef.current?.querySelector<HTMLElement>(`[data-tab-key="${activeKey}"]`);
    if (!bar || !activeEl) return;

    const next = { left: activeEl.offsetLeft, width: activeEl.offsetWidth }; // Last：新几何
    const prev = prevRectRef.current;

    if (!prev) {
      // 首帧：直接就位，不播动画
      bar.style.transition = 'none';
      bar.style.transform = 'none';
      bar.style.width = `${next.width}px`;
      prevRectRef.current = next;
      force((n) => n + 1);
      return;
    }
    if (prev.left === next.left && prev.width === next.width) return;

    // Invert：先把指示条"摆回"旧几何（translate 覆盖位置差，scaleX 覆盖宽度差）
    bar.style.transition = 'none';
    bar.style.transformOrigin = 'left center';
    bar.style.transform = `translateX(${prev.left - next.left}px) scaleX(${prev.width / next.width})`;
    bar.style.width = `${next.width}px`;
    void bar.offsetWidth; // 强制同步 reflow：确保 Invert 态先生效，再启动过渡

    // Play：下一帧解除 Invert，transition 接管 → 从旧几何动画到新几何
    requestAnimationFrame(() => {
      bar.style.transition = 'transform .25s cubic-bezier(.4,0,.2,1)';
      bar.style.transform = 'none';
    });
    prevRectRef.current = next;
  }, [activeKey, listRef]);

  return (
    <span ref={barRef} aria-hidden style={{
      position: 'absolute', bottom: 0, left: 0, height: 2, background: '#1677ff',
      willChange: 'transform', // 合成层提示：动画期间不重排版
    }} />
  );
}
// 组装：TabsList 内放一个 <TabIndicator listRef={...} activeKey={value} />，
// 每个 TabsTrigger 加 data-tab-key={value} 与 data-active={isActive}。
// antd v5.21+ 的 Tabs indicator={{ size, align }} 即内置的同类能力。
```

FLIP 的价值在这里看得很清楚：指示条的"真实布局"永远直接等于激活项（无中间态），动画只是 transform 的把戏——**布局归 React，动画归合成层**，两件事互不纠缠。这个思想放大就是列表重排动画（详情见《高阶场景全景图》对应章节的 FLIP 全量讨论）。

#### Tabs 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：方向键能切换页签，但 Tab 键进去后焦点丢了/每按一次方向键要按两次 Tab 才出来。
根因：只改了激活态没做 roving——所有 Trigger 都是 tabIndex=0，或 tabIndex 移了但 focus 没跟。
修法：激活项 tabIndex=0 其余 -1；切换时显式 focus() 目标 Trigger（见考点 1）。

坑 2
症状：指示条动画从错误位置飞出，或宽度先变位置后变。
根因：Invert 之后没强制 reflow 就改 transition，浏览器把 Invert 和 Play 合并成一帧。
修法：void bar.offsetWidth 强制同步布局后再启动过渡（见考点 4）。

坑 3
症状：字体加载完成后指示条停在错误宽度。
根因：几何在 effect 里读的是"字体加载前"的 offsetWidth，字体晚到后布局变了但 effect 没重跑。
修法：ResizeObserver 监听 Trigger（或容器）变化时重算指示条几何（同考点 3 的 ro.observe 内容节点）。

坑 4
症状：隐藏页签里的表单提交时报"字段未注册"/校验不通过。
根因：懒渲染策略下未激活面板从未挂载，字段不存在于 DOM。
修法：该 item 配 forceRender（antd）或自己的实现里提供等价开关（见考点 2）。

坑 5
症状：destroyInactiveTabPane 下每次切回页签，滚动位置/输入内容被重置，用户投诉。
根因：销毁策略与"状态需保留"的业务预期冲突。
修法：策略按页签粒度选，不是全局一刀切；确要销毁又要保留的关键状态提升到父组件。
```

---

### Collapse（★★☆）

Collapse 星级不高，但它考的是 CSS 过渡模型的一个**原理级**问题：`height: auto` 为什么不能过渡。这道题是 CSS 面试的经典，也是手风琴组件 90% 动画 bug 的总根因。

考点清单（原文）：

- `height: auto` 不能过渡的经典难题 → `grid-template-rows: 0fr→1fr` 技巧或测量固定高

#### 考点 1：height: auto 为什么不能过渡

CSS transition 的工作方式是：在**起始计算值**与**结束计算值**之间做数值插值。而 `auto` 不是数值——它是"渲染时根据内容算出来"的指令，在布局发生前没有确定的像素值。规范层面 `height` 的 auto 值不可插值（non-interpolable），于是 `auto → 300px` 的过渡会**瞬跳**：浏览器把起点当作"无值可用"，直接显示终点。

推论有两个，都很致命：

- `height: 0 → auto` 同样瞬跳（展开方向也别想免费拿到动画）；
- 就算你量出固定高（0 → 240px），内容一变（异步数据到了、窗口缩放让文本换行）240px 就错了——**固定高是撒谎，auto 才是真相**。

于是手风琴动画史上有三条路：测量法（JS 把 auto 翻译成 px）、max-height 法（取一个足够大的上界，但有"动画时长分配不均"的怪癖）、以及现代正解——**grid 的 fr 插值**。

#### 考点 2：grid-template-rows: 0fr → 1fr（完整代码）

`fr` 单位是数值（比例因子），**可插值**。把"展开/收起"翻译成"行轨道从 0 份到 1 份"，浏览器替你做了全部数学——内容多高它就长多高，**内容变化时动画终点自动正确**，这正是 auto 做不到的。两个必要零件：外层 `display: grid` + 单轨道 `grid-template-rows`，内层 `overflow: hidden; min-height: 0`（`min-height: 0` 是最常见漏项——grid item 的自动最小尺寸是 min-content，不给 0 的话 0fr 收不起来）：

```tsx
import { useState } from 'react';

/** 纯 CSS 动画的折叠项：无测量、无 JS 高度管理 */
export function CollapseItem({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}>
      <button
        type="button"
        aria-expanded={open}                       // 无障碍：折叠语义的标准属性
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer' }}
      >
        {title}
      </button>
      <div className="clp-wrap" data-open={open}>  {/* data 属性驱动 CSS，避免内联样式覆盖 transition */}
        <div className="clp-inner">{children}</div>
      </div>
    </div>
  );
}
```

```text
/* 样式：0fr → 1fr 的插值就是过渡本体 */
.clp-wrap {
  display: grid;
  grid-template-rows: 0fr;              /* 收起：行轨道占 0 份空间 */
  transition: grid-template-rows 0.25s ease;
}
.clp-wrap[data-open="true"] {
  grid-template-rows: 1fr;              /* 展开：占满——具体多高由内容决定，但插值仍然成立 */
}
.clp-inner {
  overflow: hidden;                     /* 内容在 0 轨道里必须可裁剪 */
  min-height: 0;                        /* 关键！grid item 的自动最小尺寸（min-content）会顶住轨道，不置 0 就收不起 */
}
```

兼容性（`grid-template-rows` 的 fr 插值）：Chrome 107+、Safari 16+、Firefox 66+，2026 年的中后台基线环境完全可用；若要照顾更老的内嵌 WebView，回落到考点 3 的测量法。

#### 考点 3：测量固定高的备选方案（+ Radix 的变量法）

**测量法**：展开时读 `scrollHeight`（auto 内容的真实高），把 transition 的终点从 auto 换成这个 px 值；**动画结束后把 height 交还给 auto**（否则内容再变高就被裁）；收起则反过来：先从 auto 切到当前 scrollHeight（跳变不可见），下一帧再过渡到 0：

```tsx
import { useRef, useState } from 'react';

/** 测量法折叠：scrollHeight 驱动 + transitionend 归还 auto */
export function MeasuredCollapse({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto'); // 动画外的稳态恒为 auto
  const innerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const el = innerRef.current;
    if (!el) return;
    if (!open) {
      setHeight(el.scrollHeight);                                  // 展开：先固定到内容高（起点 0 由 CSS 提供）
      setOpen(true);
    } else {
      setHeight(el.scrollHeight);                                  // 收起：先从 auto 落到具体 px（同值跳变，不可见）
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0))); // 双 rAF 确保先"定格"再过渡
      setOpen(false);
    }
  };

  return (
    <div>
      <button aria-expanded={open} onClick={toggle} type="button">{title}</button>
      <div
        ref={innerRef}
        style={{
          height,
          overflow: 'hidden',
          transition: height === 'auto' ? 'none' : 'height .25s ease', // 稳态 auto 下关过渡，防内容变化误触发
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'height' && open) setHeight('auto');  // 展开动画结束：归还 auto，内容可自由长高
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

**Radix 的变量法**：Radix Collapsible 不做 JS 测量，它在展开时把内容真实高度写进 CSS 变量 `--radix-collapsible-content-height`，动画用 keyframes 从 0 演到 `var(...)`。思路与测量法同源（把 auto 翻译成 px），但翻译结果进了 CSS 变量，动画本体保持声明式：

```tsx
import * as Collapsible from '@radix-ui/react-collapsible';

<Collapsible.Root>
  <Collapsible.Trigger>展开</Collapsible.Trigger>
  <Collapsible.Content className="clp-content">内容</Collapsible.Content>
</Collapsible.Root>
```

```text
/* Radix 注入 --radix-collapsible-content-height，keyframes 引用它 */
@keyframes clp-down { from { height: 0 } to { height: var(--radix-collapsible-content-height) } }
@keyframes clp-up   { from { height: var(--radix-collapsible-content-height) } to { height: 0 } }
.clp-content[data-state="open"]   { animation: clp-down .25s ease }
.clp-content[data-state="closed"] { animation: clp-up .25s ease }
```

antd v5 的 Collapse 走的是 rc-motion 的 JS 测量路线（测高 → css transition → 结束回调），与上面 MeasuredCollapse 的机制一致，工程上多了中断与减速运动的处理。

#### 考点 4：嵌套手风琴

嵌套的麻烦在"外层的高度是多少"：内层展开时外层内容变高——测量法里外层若停在固定 px 就会把内层裁掉；**grid 技巧天然免疫**（外层轨道 1fr 的语义就是"内容多高我多高"，内层动画只是让"内容高"这个事实平滑变化）。所以嵌套场景直接全链路 grid 化：

```tsx
import { useState } from 'react';
import { CollapseItem } from './CollapseItem'; // 考点 2 的 grid 版实现

/** 嵌套手风琴：每层独立 open 状态，grid 技巧让外层高度自动跟随内层 */
export function NestedAccordion() {
  const [outerOpen, setOuterOpen] = useState(true);
  return (
    <div>
      <button aria-expanded={outerOpen} onClick={() => setOuterOpen((o) => !o)} type="button">
        分组一
      </button>
      <div className="clp-wrap" data-open={outerOpen}>
        <div className="clp-inner" style={{ paddingLeft: 12 /* 每层只加缩进，不复用高度逻辑 */ }}>
          <CollapseItem title="子项 1">子项 1 内容</CollapseItem>
          <CollapseItem title="子项 2（内层再嵌套）">
            <CollapseItem title="孙项 1">孙项内容</CollapseItem>
          </CollapseItem>
        </div>
      </div>
    </div>
  );
}
```

只开一个的"手风琴模式"（accordion）与全开模式（多个同时开）只是 `open` 状态的形状差异：accordion 用单值，全开用数组——与 Tabs 考点 1 的受控设计完全同构。

#### Collapse 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：grid 技巧"展开正常、收不起/收起时内容闪一下"。
根因：内层漏了 min-height: 0，grid item 的自动最小尺寸（min-content）把 0fr 轨道顶住了。
修法：.clp-inner 加 min-height: 0; overflow: hidden（见考点 2）。

坑 2
症状：测量法快速连点时动画卡在半高。
根因：transitionend 没触发（中途反向打断）就把 height 钉在了某个 px。
修法：transitionend 只处理 propertyName === 'height'；打断时直接同步 scrollHeight 重启；关键路径再加 setTimeout 兜底（Part A3 的双保险纪律）。

坑 3
症状：父容器 display: none（页签未激活）时测量高度为 0，切回来动画异常。
根因：display:none 下 scrollHeight 是 0，测量时机错了。
修法：改为容器可见后测量（IntersectionObserver / 页签激活回调），或干脆用 grid 技巧免测量。

坑 4
症状：展开后内容里的图片加载完成，内容变高被裁剪。
根因：测量法把 height 钉死在展开瞬间的 scrollHeight。
修法：动画结束立即归还 auto（见考点 3），或直接用 grid/Radix 变量法。
```

---

### Tree（★★★★）

树是"递归思维 + 联动算法 + 拖拽几何"三合一的考题。它的四个考点各自都值得单开一节：拍平虚拟化考的是**数据结构选择**，复选框三态考的是**联动算法**（本篇深度校准的样板戏），拖拽换父考的是**DOM 几何判定 + 不可变树操作**，异步加载与搜索考的是**状态与视图的解耦**。

考点清单（原文）：

- 递归渲染 + **虚拟化**（拍平树 + 动态缩进）
- 复选框三态（checked/halfChecked 父子联动算法）
- 拖拽换父、异步加载、搜索命中展开并高亮

统一数据模型（后文全部围绕它）：

```ts
/** 树节点协议：key 全局唯一是整棵树一切状态（展开/勾选/拖拽）的基石 */
export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  isLeaf?: boolean; // 异步加载场景：isLeaf=false 且无 children 的节点 = "还有子级待加载"
}

export const demoTree: TreeNode[] = [
  {
    key: 'all',
    title: '全部',
    children: [
      {
        key: 'east', title: '华东',
        children: [
          { key: 'sh', title: '上海' },
          { key: 'hz', title: '杭州' },
        ],
      },
      {
        key: 'south', title: '华南',
        children: [
          { key: 'sz', title: '深圳' },
          { key: 'gz', title: '广州' },
        ],
      },
    ],
  },
];
```

#### 考点 1：递归渲染与拍平 + 虚拟化（为什么先 flatten 再窗口化）

**递归渲染**是树的本能写法：组件渲染自己渲染 children。但它与虚拟滚动**结构性冲突**——窗口化的前提是"把连续索引区间切成窗口"，而递归渲染没有全局索引，每一层只看得见自己的 children；展开/收起任何节点都会让全局序号整体位移，递归栈里的每一层都无从得知。解法是先**拍平**：

> 把"当前展开状态下可见的节点"按渲染顺序拍平成一维数组，虚拟列表吃这个数组，缩进由拍平时记下的 `depth` 计算（`paddingLeft = depth × 缩进单位`），DOM 结构上根本没有嵌套。

```ts
/** 可见节点拍平：expanded 集合决定子树是否下钻。O(可见节点数)，配合 useMemo 只在树或展开态变化时重算 */
export interface FlatTreeNode {
  key: string;
  title: string;
  depth: number;   // 缩进层级：渲染时 paddingLeft = depth * INDENT
  isLeaf: boolean;
  hasChildren: boolean;
}
export const INDENT = 24;

export function flattenVisibleTree(tree: TreeNode[], expanded: Set<string>): FlatTreeNode[] {
  const out: FlatTreeNode[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      const hasChildren = !!n.children?.length;
      out.push({ key: n.key, title: n.title, depth, isLeaf: !hasChildren && (n.isLeaf ?? true), hasChildren });
      // 只有"有子级且已展开"才下钻：收起的子树整体从可见序列里消失——虚拟化只需处理"可见"节点
      if (n.children?.length && expanded.has(n.key)) walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}
```

窗口化渲染直接复用 Lv3 Select 考点 4 的 `VirtualList`——这就是"拍平之后，树 = 一个带缩进的定高列表"的红利：

```tsx
import { useMemo, useState } from 'react';
import { flattenVisibleTree, INDENT, type TreeNode } from './tree-model';
import { VirtualList } from './VirtualList'; // Select 考点 4 的同款实现：定高窗口化

/** 虚拟化树：拍平 → 窗口化，缩进由 depth 计算 */
export function VirtualTree({ treeData }: { treeData: TreeNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['all']));
  const flat = useMemo(() => flattenVisibleTree(treeData, expanded), [treeData, expanded]); // 拍平结果缓存：滚动不重算

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <VirtualList
      items={flat}
      renderItem={(node) => (
        <div key={node.key} style={{ height: 32, lineHeight: '32px', paddingLeft: node.depth * INDENT, display: 'flex', gap: 4 }}>
          {node.hasChildren ? (
            <button type="button" aria-label={expanded.has(node.key) ? '收起' : '展开'}
              aria-expanded={expanded.has(node.key)} onClick={() => toggle(node.key)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', width: 16 }}>
              {expanded.has(node.key) ? '▾' : '▸'}
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: 16 }} /> // 叶子占位：图标列对齐
          )}
          <span>{node.title}</span>
        </div>
      )}
    />
  );
}
```

antd 的 Tree 默认虚拟化（`virtual` 默认 true，配合 `height` 属性启用定高窗口化），内部同样是"展开态拍平 + rc-virtual-list 窗口化 + depth 缩进"这条路。另记一个工程细节：rc-tree 内部为每个节点维护 `pos` 路径（形如 `'0-1-0'`，根下第 2 个子节点的第 1 个子节点），拖拽与状态更新都靠它在 O(1) 内找到父链——我们下一考点的 `parentKey` 预计算就是同一思想。

#### 考点 2：复选框三态（checked / halfChecked 父子联动算法）

深度校准的样板考点。规则先立清楚：

- **向下联动（勾父全选子）**：勾选任意节点，其整个子树全部 checked；取消同理（子树里有"零散勾选"也整体清掉）；
- **向上联动（父链重算）**：父节点的状态**完全由子节点推导**——全部子 checked → 父 checked；部分子 checked 或 half → 父 halfChecked；全部子未选 → 父两态皆无（注意第三条：**"全没选"既不是 checked 也不是 half**，这里藏着最多 bug）。

**推演表**：拿 demoTree 依次操作，每一步每个节点的终态（✓=checked，◐=halfChecked，—=两态皆无）：

```text
树形（缩进即层级）：
all「全部」
├─ east「华东」
│  ├─ sh「上海」
│  └─ hz「杭州」
└─ south「华南」
   ├─ sz「深圳」
   └─ gz「广州」

操作                all   east  sh    hz    south sz    gz    │ 推导要点
───────────────────────────────────────────────────────────┼──────────────────────────────────────
① 勾选 sh            ◐     ◐     ✓     —     —     —     —    │ east：1/2 子选 → half；all：子 east 是 half → half
② 再勾选 hz          ◐     ✓     ✓     ✓     —     —     —    │ east：2/2 子选 → checked；all：south 全空 → 仍 half
③ 再勾选 sz          ◐     ✓     ✓     ✓     ◐     ✓     —    │ south：1/2 → half；all：仍不全 → half
④ 再勾选 gz          ✓     ✓     ✓     ✓     ✓     ✓     ✓    │ 全树闭合：south 2/2 → ✓，all 2/2 → ✓，half 清空
⑤ 取消 hz            ◐     ◐     ✓     —     ✓     ✓     ✓    │ 向下清 hz；east 重算 1/2 → half；all 重算 → half
⑥ 再取消 sh          ◐     —     —     —     ✓     ✓     ✓    │ east：0/2 → 两态皆无（不是 half！）；all：east 空 + south ✓ → half
```

第 ⑥ 行是"三态"最容易漏的分支：**子节点全空时父节点是"未选"，不是"半选"**——半选必须意味着"有后代被选中"。

**实现**分三个函数：预计算父链（`buildKeyEntities`）、向下传导（`conductDown`）、向上重算（`conductUp`）。勾选/取消都走同一个 `toggleCheck` 入口：

```ts
import type { TreeNode } from './tree-model';

/** 节点实体：预计算父键与子键列表——父链 O(1) 可达，是三态算法的地基（rc-tree 的 keyEntities 同思想） */
export interface KeyEntity {
  node: TreeNode;
  parentKey: string | null;
  childKeys: string[];
  depth: number;
}

export function buildKeyEntities(treeData: TreeNode[]): Map<string, KeyEntity> {
  const entities = new Map<string, KeyEntity>();
  const walk = (nodes: TreeNode[], parentKey: string | null, depth: number) => {
    for (const n of nodes) {
      entities.set(n.key, { node: n, parentKey, childKeys: (n.children ?? []).map((c) => c.key), depth });
      if (n.children?.length) walk(n.children, n.key, depth + 1);
    }
  };
  walk(treeData, null, 0);
  return entities;
}

/** 三态数据：checked（全选）与 half（半选）两个集合。Set 便于 O(1) 查询，提交时 [...set] 展开给业务 */
export interface CheckStates {
  checked: Set<string>;
  half: Set<string>;
}

/**
 * 向下传导：勾/取消某个 key，其整个子树跟随置位或清位。
 * 无论子树里原来是"零散勾选"还是"全选"，一律被整体覆盖——"勾父全选子"的语义来源。
 */
function conductDown(entities: Map<string, KeyEntity>, key: string, checked: boolean, states: CheckStates): void {
  const { checked: checkedSet, half: halfSet } = states;
  const stack: string[] = [key]; // 迭代代替递归：千级深度不爆栈
  while (stack.length) {
    const k = stack.pop()!;
    if (checked) checkedSet.add(k); else checkedSet.delete(k);
    halfSet.delete(k); // 子树整体置位后，内部节点不可能再半选
    for (const child of entities.get(k)!.childKeys) stack.push(child);
  }
}

/**
 * 向上重算：从被改节点的父节点开始，沿父链逐层"由子推父"。
 * 三分支与推演表一一对应：全子 checked → 父 checked；有 checked 或 half 的子 → 父 half；全空 → 父清空。
 */
function conductUp(entities: Map<string, KeyEntity>, key: string, states: CheckStates): void {
  const { checked: checkedSet, half: halfSet } = states;
  let parentKey = entities.get(key)!.parentKey;
  while (parentKey != null) {                       // 沿父链爬到根为止
    const { childKeys } = entities.get(parentKey)!;
    let allChecked = childKeys.length > 0;
    let someTouched = false;
    for (const child of childKeys) {
      if (checkedSet.has(child)) someTouched = true;          // 子全选：算"有接触"
      else {
        allChecked = false;
        if (halfSet.has(child)) someTouched = true;           // 子半选：也算"有接触"
      }
    }
    if (allChecked)              { checkedSet.add(parentKey); halfSet.delete(parentKey); }   // 分支 1
    else if (someTouched)        { checkedSet.delete(parentKey); halfSet.add(parentKey); }   // 分支 2（推演表 ①⑤⑥ 的 half）
    else                         { checkedSet.delete(parentKey); halfSet.delete(parentKey); } // 分支 3（推演表 ⑥ 的 east 清空）
    parentKey = entities.get(parentKey)!.parentKey;           // 继续向上：父变了，祖父也要重算
  }
}

/** 唯一入口：勾选（key 不在 checked）与取消（key 在 checked）共用。返回新对象，保证 React 状态更新可被感知 */
export function toggleCheck(entities: Map<string, KeyEntity>, key: string, prev: CheckStates): CheckStates {
  const states: CheckStates = { checked: new Set(prev.checked), half: new Set(prev.half) }; // 不可变更新
  const target = states.checked.has(key);   // 半选节点点击 → target 为 false → 走"勾选"分支（antd 同款语义）
  conductDown(entities, key, !target, states);
  conductUp(entities, key, states);
  return states;
}
```

**取消勾选的处理**就藏在 `toggleCheck` 的对称性里：取消 = `conductDown(false)`（整个子树清位，**子树里原本零散勾选的叶子也一并清掉**，与 antd 行为一致）+ `conductUp`（父链重算，父可能从 checked → half → 未选逐级退化，推演表第 ⑤⑥ 行）。组件接线：

```tsx
import { useMemo, useState } from 'react';
import { buildKeyEntities, toggleCheck, type CheckStates } from './tree-check';
import { flattenVisibleTree, INDENT, type TreeNode } from './tree-model';
import { VirtualList } from './VirtualList';

/** 三态勾选树：checked/half 两个集合渲染三种 checkbox 态 */
export function CheckableTree({ treeData }: { treeData: TreeNode[] }) {
  const [expanded] = useState<Set<string>>(new Set(['all']));
  const [states, setStates] = useState<CheckStates>({ checked: new Set(), half: new Set() });
  const entities = useMemo(() => buildKeyEntities(treeData), [treeData]); // 父链预计算只随树变化
  const flat = useMemo(() => flattenVisibleTree(treeData, expanded), [treeData, expanded]);

  return (
    <VirtualList
      items={flat}
      renderItem={(node) => {
        const checked = states.checked.has(node.key);
        const half = states.half.has(node.key);
        return (
          <label key={node.key} style={{ height: 32, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: node.depth * INDENT }}>
            <input
              type="checkbox"
              checked={checked}
              ref={(el) => { if (el) el.indeterminate = half && !checked; }} // 半选态：DOM 只能靠 indeterminate 属性表达
              onChange={() => setStates((prev) => toggleCheck(entities, node.key, prev))}
            />
            {node.title}
          </label>
        );
      }}
    />
  );
}
```

antd 的对应物：`<Tree checkable onCheck={...} />`，其回调第二参数带全量派生信息，`checkStrictly` 可关闭联动（此时 checkedKeys 变成 `{ checked, halfChecked }` 对象，父子各自独立）：

```tsx
import { Tree } from 'antd';
import type { TreeProps } from 'antd';

const onCheck: TreeProps['onCheck'] = (checked, info) => {
  // 联动模式：checked 是 Key[]；info.halfCheckedKeys 直接给半选集合（即本节 half 集合）
  console.log(checked, info.halfCheckedKeys, info.checkedNodes);
  // checkStrictly 模式下 checked 变为 { checked: Key[], halfChecked: Key[] }——类型联合，取值前先判别
};

<Tree checkable treeData={antdTreeData} onCheck={onCheck} />;
```

#### 考点 3：拖拽换父（drop 位置指示 line / gap 判定）

拖拽树节点到新位置，两件事：**几何判定**（拖到目标的哪里？上方插前面/下方插后面/中间当孩子）与**不可变树操作**（摘除 + 插入）。

几何判定用"高度三分"：dragover 时算 `e.clientY` 在目标行内的比例——上 1/4 是 before（画上边线），下 1/4 是 after（画下边线），中间是 inside（整行高亮，成为目标的孩子）。antd/rc-tree 的 `dropToGap`（true=插缝隙成为兄弟）与 `dropPosition` 就是这个判定的产物。

```tsx
import { useState } from 'react';

type DropPos = 'before' | 'after' | 'inside';

/** drop 指示状态：目标 key + 三分位置。渲染层据此画线（before/after）或整行高亮（inside） */
export function useDropIndicator() {
  const [dropTarget, setDropTarget] = useState<{ key: string; pos: DropPos } | null>(null);

  const onDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault(); // 不 preventDefault 浏览器拒绝 drop
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const pos: DropPos = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'; // 三分判定
    setDropTarget((prev) => (prev?.key === key && prev.pos === pos ? prev : { key, pos })); // 不变不刷
  };

  const onDragLeave = () => setDropTarget(null);
  const onDrop = (onMove: (dragKey: string, targetKey: string, pos: DropPos) => void, dragKey: string) =>
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dropTarget) onMove(dragKey, dropTarget.key, dropTarget.pos);
      setDropTarget(null);
    };

  return { dropTarget, onDragOver, onDragLeave, onDrop };
}
```

不可变树操作——先防环（拖到自己子孙下面 = 制造循环引用），再摘除，再插入：

```ts
import { buildKeyEntities } from './tree-check';     // 考点 2 的实现：keyEntities 预计算
import type { TreeNode } from './tree-model';        // 考点 1 的数据协议

/**
 * 移动节点（纯函数，返回新树）：
 * 1. 非法判定：目标是拖拽节点自己的后代 → 原样返回（防环：a 挂到 a 的子孙下就是循环引用）
 * 2. 摘除：深拷贝路径上把 dragKey 过滤掉
 * 3. 插入：inside=成为目标第一个孩子；before/after=与目标同级插前/插后
 */
export function moveTreeNode(
  tree: TreeNode[], dragKey: string, targetKey: string, pos: 'before' | 'after' | 'inside',
): TreeNode[] {
  const entities = buildKeyEntities(tree);
  // 防环：沿 target 的父链向上找，若遇到 dragKey，说明 target 在 drag 的子树里
  let ancestor: string | null = entities.get(targetKey)!.parentKey;
  while (ancestor != null) {
    if (ancestor === dragKey) return tree;
    ancestor = entities.get(ancestor)!.parentKey;
  }
  const dragNode = entities.get(dragKey)!.node;

  const remove = (nodes: TreeNode[]): TreeNode[] =>            // 摘除：逐层拷贝 + 过滤，保持不可变
    nodes
      .map((n) => (n.children?.length ? { ...n, children: remove(n.children) } : { ...n }))
      .filter((n) => n.key !== dragKey);
  const withoutDrag = remove(tree);

  const insert = (nodes: TreeNode[]): TreeNode[] =>
    nodes.flatMap((n) => {
      if (n.key === targetKey) {
        if (pos === 'inside') return [{ ...n, children: [dragNode, ...(n.children ?? [])] }]; // 挂为孩子（排最前）
        return pos === 'before' ? [dragNode, n] : [n, dragNode];                              // 同级插前/插后
      }
      return n.children?.length ? [{ ...n, children: insert(n.children) }] : [n];
    });
  return insert(withoutDrag);
}
```

antd 的写法（官方 normalize：`info.dropPosition` 是"绝对行位"，要减掉目标自身在父内的序号才得到 -1/0/1 相对位）：

```tsx
import { Tree } from 'antd';
import type { TreeProps } from 'antd';

const onDrop: TreeProps['onDrop'] = (info) => {
  const dropKey = info.node.key;                       // 目标节点
  const dragKey = info.dragNode.key;                   // 被拖节点
  const dropPos = String(info.node.pos).split('-');    // pos 路径如 '0-1-2'，末段是父内序号
  // 官方归一化：相对位置 = 绝对 dropPosition - 目标自身的父内序号 → -1(上方) / 0(成为孩子) / 1(下方)
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
  // dropPosition === -1 → before；0 → info.dropToGap 为 false，成为孩子；1 → after
  // 之后套用上面 moveTreeNode 的三步即可（antd 文档 demo 即此结构）
};

<Tree draggable treeData={treeData} onDrop={onDrop} />;
```

#### 考点 4：异步加载（loadData 约定与 expanded 状态）

antd 定下的约定：`loadData(node) => Promise`——展开一个 `isLeaf=false` 且还没有 children 的节点时触发，resolve 的数据成为该节点的子级。自实现的三件套：**loadedKeys**（加载过的不再加载）、**loadingKeys**（目标行的 spinner）、**expanded 受控**（展开是果，加载是因，都挂在 key 上）：

```tsx
import { useState } from 'react';
import { flattenVisibleTree, INDENT, type TreeNode } from './tree-model';
import { VirtualList } from './VirtualList';

/** 异步加载树：loadData 约定 + loaded/loading 两个集合 + expanded 受控 */
export function LazyTree({ fetchChildren }: { fetchChildren: (key: string) => Promise<TreeNode[]> }) {
  const [treeData, setTreeData] = useState<TreeNode[]>([
    { key: 'root', title: '根目录', isLeaf: false }, // isLeaf=false：承诺"我还有孩子，只是还没拉"
  ]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set()); // 已加载：防重复请求的第一道闸
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  /** 把拉回的 children 挂到指定 key 上（不可变更新） */
  const patchChildren = (nodes: TreeNode[], key: string, children: TreeNode[]): TreeNode[] =>
    nodes.map((n) =>
      n.key === key ? { ...n, children, isLeaf: children.length === 0 } // 拉回来是空 → 修正为叶子
        : n.children?.length ? { ...n, children: patchChildren(n.children, key, children) } : { ...n },
    );

  const toggle = async (node: TreeNode) => {
    const isExpanding = !expanded.has(node.key);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(node.key) ? next.delete(node.key) : next.add(node.key);
      return next;
    });
    // loadData 约定的触发条件：展开 + 从未加载 + 当前没有子级
    if (isExpanding && !loadedKeys.has(node.key) && !node.children?.length) {
      setLoadingKeys((prev) => new Set(prev).add(node.key));
      const children = await fetchChildren(node.key);       // 失败处理：catch 里回滚 expanded（此处从略，工程必做）
      setTreeData((prev) => patchChildren(prev, node.key, children));
      setLoadedKeys((prev) => new Set(prev).add(node.key)); // 只有成功才记账，失败下次展开可重试
      setLoadingKeys((prev) => { const n = new Set(prev); n.delete(node.key); return n; });
    }
  };

  const flat = flattenVisibleTree(treeData, expanded);
  return (
    <VirtualList
      items={flat}
      renderItem={(node) => (
        <div key={node.key} style={{ height: 32, lineHeight: '32px', paddingLeft: node.depth * INDENT, display: 'flex', gap: 4 }}>
          {loadingKeys.has(node.key) ? (
            <span aria-label="加载中">…</span>
          ) : node.hasChildren || node.isLeaf === false ? (
            <button type="button" onClick={() => toggle(node.key)} style={{ border: 'none', background: 'none', width: 16, cursor: 'pointer' }}>
              {expanded.has(node.key) ? '▾' : '▸'}
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: 16 }} />
          )}
          {node.title}
        </div>
      )}
    />
  );
}
```

antd 侧是声明式的：`<Tree treeData={...} loadData={(node) => promise} />`，内部同样维护 loadedKeys/loading 态。**受控 expandedKeys 时要自己保证"展开未加载的节点触发 loadData"的链路不被掐断**——见文末坑 6。

#### 考点 5：搜索命中展开并高亮（命中路径的集合计算）

树搜索的完整语义不是"过滤出命中节点"，而是三件事：**命中集合**（哪些节点命中）、**命中路径集合**（命中节点的全部祖先——它们必须展开，否则命中的节点根本看不见）、**高亮渲染**（命中文本片段染色）。三者全是纯计算，与渲染解耦：

```ts
/** 搜索：返回命中集合与"命中路径"（祖先全集）。expand = 路径集合，直接喂给 expandedKeys */
export function searchTree(tree: TreeNode[], keyword: string) {
  const kw = keyword.trim().toLowerCase();
  const matchedKeys = new Set<string>();
  const pathKeys = new Set<string>(); // 命中节点的祖先们：必须展开才可见
  if (!kw) return { matchedKeys, pathKeys };

  const walk = (nodes: TreeNode[], parents: string[]) => {
    for (const n of nodes) {
      if (n.title.toLowerCase().includes(kw)) {
        matchedKeys.add(n.key);
        for (const p of parents) pathKeys.add(p); // 命中 → 整条祖先路径入集合
      }
      if (n.children?.length) walk(n.children, [...parents, n.key]); // 携带父链下钻
    }
  };
  walk(tree, []);
  return { matchedKeys, pathKeys };
}
```

```tsx
/** 高亮渲染：按命中位置切开，中间片段染色（与 Lv1 Typography 的溢出 Tooltip 同属"文本切片渲染"家族） */
export function HighlightTitle({ title, keyword }: { title: string; keyword: string }) {
  const kw = keyword.trim();
  if (!kw) return <>{title}</>;
  const idx = title.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, idx)}
      <mark style={{ background: '#ffe58f', padding: 0 }}>{title.slice(idx, idx + kw.length)}</mark>
      {title.slice(idx + kw.length)}
    </>
  );
}

// 接线：搜索态下 expanded 用 pathKeys 替代用户展开态（antd 的 autoExpandParent 推荐只在搜索时打开，同一思想）
// const { matchedKeys, pathKeys } = searchTree(treeData, kw);
// <VirtualTree expanded={kw ? pathKeys : userExpanded} />
// 渲染 title 时：node.key 命中 matchedKeys → <HighlightTitle title={node.title} keyword={kw} />
```

antd Tree 的内置对应物是 `filterTreeNode`（返回 true 的节点高亮）配合搜索期间开 `autoExpandParent`；命中路径展开的逻辑同样内置。数据量大时把 `searchTree` 的结果用 `useMemo` 挂在 `[treeData, keyword]` 上，输入防抖 200ms 即可（复用 Select 考点 5 的防抖骨架）。

#### Tree 常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：勾选/展开总是作用到错误的节点，数据一刷新就串。
根因：key 不唯一（或用数组 index 当 key），两个节点共享同一个 key 后状态互相踩。
修法：树协议第一铁律——key 全局唯一且稳定；来源数据没有 key 就在入口处派生（path 拼串优于 index）。

坑 2
症状：勾了所有子节点，父节点还是半选。
根因：三态只做了向下传导，漏了向上重算（或向上只算了一层，祖父没算）。
修法：conductUp 沿父链 while 到根，父变祖父必变（见考点 2 推演表 ②）。

坑 3
症状：全部取消后父节点仍显示半选。
根因：向上重算漏了第三分支——"子全空"应是两态皆无，被误归为 half。
修法：三分支补全：allChecked→checked / someTouched→half / else→清空（推演表第 ⑥ 行）。

坑 4
症状：拖拽节点到自己的子孙下，页面卡死/栈溢出。
根因：没有防环判定，树成了环，递归渲染死循环。
修法：drop 前沿 target 父链向上找 dragKey，命中即拒绝（见考点 3 moveTreeNode 第 1 步）。

坑 5
症状：虚拟滚动树展开大节点后视口剧烈跳动。
根因：展开让拍平数组前面插入大量节点，当前窗口的索引整体位移。
修法：展开时记录锚点：以"视口首行 key"为准重设 scrollTop（首行索引 × 行高）；antd Tree 的 scrollTo 支持 key 定位。

坑 6
症状：受控 expandedKeys + loadData，每次展开都重复发请求。
根因：loadedKeys 判定失效（或受控切换把 loadedKeys 一起重置）。
修法：loaded/loading 独立于 expanded 维护；受控方只管 expanded，加载去重由组件内部集合兜底（见考点 4）。
```

---

### Cascader / TreeSelect / Transfer（★★★☆）

这一组是"组合型"考题：三个组件都不是从零造，而是**已有能力的再组合**——Cascader 是"逐级下钻的列表"，TreeSelect 是"树 + Select 收敛"，Transfer 是"两个列表 + 勾选集合"。考的正是识别组合的能力。

考点清单（原文）：

- Cascader：级联面板、搜索时展示全路径、异步加载子级
- TreeSelect：树 + 选择收敛（antd 把 Tree/Select 复用成三个组件，学它的分层）
- Transfer：双列表穿梭 + 搜索过滤

#### Cascader：级联面板

**逐级展示**：面板是 N 列并排的列表，第 1 列是顶层 options，点中某项后第 2 列出现它的 children，以此类推；激活路径就是 `value`（antd 的 Cascader value 是**全路径数组**，如 `['福建', '厦门']`——这是它和 Select 最大的协议差异）。列内容由路径实时派生：

```tsx
import { useState } from 'react';

export interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
  isLeaf?: boolean; // false = 还有下一级（可能未加载，见异步小节）
}

/** 列生成：沿激活路径逐级取 children。path=[省, 市] → [省级列, 市级列, 区级列(若市已选中且有 children)] */
export function getCascaderColumns(options: CascaderOption[], path: string[]): CascaderOption[][] {
  const columns: CascaderOption[][] = [options];
  let current = options;
  for (const v of path) {
    const hit = current.find((o) => o.value === v);
    if (!hit?.children?.length) break; // 路径中断（或已到叶子）就不再生成列
    columns.push(hit.children);
    current = hit.children;
  }
  return columns;
}

/**
 * 受控路径的级联面板。
 * 设计：path（内部路径）驱动列展示——点任意列任意项都是"截断到本列再落位"（跳列点击 = 换分支）；
 * onPathChange 每次点击都回调，是否"算完成"由调用方判定（点到叶子才收起提交，即 antd 默认口径；
 * changeOnSelect 语义则是对每个回调都照单全收）。
 */
export function CascaderPanel({ options, path, onPathChange }: {
  options: CascaderOption[];
  path: string[];                        // 当前激活路径：['福建','厦门'] → 已展示两列 + 第三列（厦门的 children）
  onPathChange: (next: string[]) => void;
}) {
  const columns = getCascaderColumns(options, path);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {columns.map((col, level) => (
        <ul key={level} role="listbox" style={{ listStyle: 'none', minWidth: 120, maxHeight: 240, overflowY: 'auto', margin: 0, padding: 4, borderRight: '1px solid #f0f0f0' }}>
          {col.map((opt) => {
            const active = path[level] === opt.value;                 // 本列激活项 = 路径第 level 段
            const isLeaf = !opt.children?.length && (opt.isLeaf ?? true);
            return (
              <li key={opt.value} role="option" aria-selected={active}
                onClick={() => onPathChange([...path.slice(0, level), opt.value])} // 截断到本列再落位
                style={{ padding: '4px 8px', background: active ? '#f0f5ff' : undefined, cursor: 'pointer' }}>
                {opt.label}
                {!isLeaf && <span style={{ float: 'right', color: '#999' }}>›</span>}
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}
// 调用方收尾：onPathChange 回调里判断新路径末项是否叶子，是则 onChange 提交并关闭面板（antd 默认）；
// changeOnSelect 场景则每次回调都提交。
```

**搜索时展示全路径**：级联数据搜索的正确姿势不是只匹配叶子名，而是**把所有"根到叶"的路径拍平成数组**，按完整路径文本过滤，命中项展示"福建 / 厦门 / 思明区"。用户搜"思明"能直接看到它挂在哪条链上，点选即提交整条路径：

```tsx
/** 路径拍平：所有根→叶路径 → {valuePath, labelPath}。Cascader 搜索的数据底座 */
export function flattenCascaderPaths(options: CascaderOption[], parents: CascaderOption[] = []): { valuePath: string[]; labelPath: string[] }[] {
  const out: { valuePath: string[]; labelPath: string[] }[] = [];
  for (const o of options) {
    if (o.children?.length) out.push(...flattenCascaderPaths(o.children, [...parents, o]));
    else out.push({ valuePath: [...parents, o].map((n) => n.value), labelPath: [...parents, o].map((n) => n.label) });
  }
  return out;
}

/** 搜索：按"完整路径文本"过滤，返回可渲染的命中行 */
export function searchCascader(options: CascaderOption[], keyword: string) {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  return flattenCascaderPaths(options)
    .filter(({ labelPath }) => labelPath.join(' / ').toLowerCase().includes(kw));
}
// 渲染：searchCascader(options, kw).map(hit => <li onClick={() => onChange(hit.valuePath)}>{hit.labelPath.join(' / ')}</li>)
```

antd 的对应能力是 `showSearch` 对象配置（`filter` 自定义过滤、`render` 自定义命中行渲染、`limit` 限流），语义与上面一致。

**异步加载子级**：antd 的 `loadData(selectedOptions)` 约定——点开 `isLeaf: false` 的选项时触发，把 children push 进最后一项（不可变更新 treeData）：

```tsx
import { Cascader } from 'antd';
import { useState } from 'react';

interface AntdOption {
  value: string;
  label: string;
  isLeaf?: boolean;
  loading?: boolean; // antd 选项级 loading 标记（官方异步 demo 即用此字段）
  children?: AntdOption[];
}

function LazyCascader() {
  const [options, setOptions] = useState<AntdOption[]>([
    { value: 'zhejiang', label: '浙江', isLeaf: false }, // isLeaf:false → 触发 loadData
  ]);

  const loadData = async (selectedOptions: AntdOption[]) => {
    const target = selectedOptions[selectedOptions.length - 1]; // 约定：最后一项是待加载的
    target.loading = true;                                      // 选项上直接标 loading，行内出 spinner
    const children: AntdOption[] = await fetch(`/api/regions?parent=${target.value}`)
      .then((r) => r.json() as Promise<{ value: string; label: string }[]>);
    target.loading = false;
    target.children = children.map((c) => ({ ...c, isLeaf: false })); // 逐级都可再加载
    setOptions([...options]);                                   // 触发重渲染（antd demo 同款写法）
  };

  return <Cascader options={options} loadData={loadData} onChange={(value) => console.log(value)} changeOnSelect />;
  // changeOnSelect：允许只选到中间层级（默认必须点到叶子）
}
```

#### TreeSelect：树 + 选择收敛（antd 的三层复用）

> TreeSelect：树 + 选择收敛（antd 把 Tree/Select 复用成三个组件，学它的分层）

antd 的 TreeSelect 内核是 rc-tree-select，它的分层是本组件最值得抄的架构：

```text
rc-select（选择器外壳）        触发器/标签收纳/键盘/搜索/虚拟列表 —— Select 考点 1–6 的全部资产
        ▲ 组合
rc-tree（树渲染内核）          拍平虚拟化/三态联动/异步加载/拖拽 —— Tree 考点 1–5 的全部资产
        ▼ 粘合层（rc-tree-select）
value ↔ 树状态映射            树的勾选集合 ↔ Select 的 value（标签）；搜索词 → 树的过滤
收敛策略 showCheckedStrategy   多选勾了一大片树，value 提交成什么形状——三个枚举：
```

**收敛策略**是粘合层的关键设计。设树为"华东(上海, 杭州)、华南(深圳)"，勾选上海+杭州（联动使华东 checked）。三种策略下的 value：

```text
策略                          value（提交口径）                     适用场景
──────────────────────────────────────────────────────────────────────────────
TreeSelect.SHOW_ALL          [华东, 上海, 杭州]                     需要完整还原勾选明细（回显最省事，数据最啰嗦）
TreeSelect.SHOW_PARENT       [华东]                                只要分组口径（提交最精简，回显需再查树）
TreeSelect.SHOW_CHILD        [上海, 杭州]                          只要叶子明细（统计报表类最常见）
```

```tsx
import { TreeSelect } from 'antd';

const { SHOW_CHILD } = TreeSelect;

<TreeSelect
  treeData={[
    { title: '华东', value: 'east', children: [
      { title: '上海', value: 'sh' },
      { title: '杭州', value: 'hz' },
    ] },
    { title: '华南', value: 'south', children: [{ title: '深圳', value: 'sz' }] },
  ]}
  treeCheckable                              // 开树勾选（三态联动自动生效，即 Tree 考点 2）
  showCheckedStrategy={SHOW_CHILD}           // 收敛策略：提交叶子明细
  treeDefaultExpandAll
  maxTagCount="responsive"                   // Select 考点 6 的溢出收纳，在树上直接复用
/>
```

"学它的分层"学到手的标准是：当你给团队写一个"组织架构选择器"时，第一反应不该是重写一个组件，而是**树数据源 + rc-select 外壳 + 一层 50 行的粘合**。Cascader、TreeSelect、Select 三个组件共享一套选择器底座——这就是分层对代码量的复利。

#### Transfer：双列表穿梭

Transfer 的状态模型三件套：**dataSource**（全量，含 key/title/description/disabled）、**targetKeys**（已在右侧的 key 集合，source/target 两个列表由它切分）、**selectedKeys**（两列表勾选框的集合，**跨列表共享**——某 key 属于哪侧由 targetKeys 推导）。移动操作的核心是"勾选集合整体迁移 + 迁移后清空勾选"：

```tsx
import { useMemo, useState } from 'react';

export interface TransferItem { key: string; title: string; description?: string; disabled?: boolean }

/** 穿梭框最小内核：双列表 + 勾选迁移 + 搜索过滤 */
export function MiniTransfer({ dataSource, targetKeys, onChange }: {
  dataSource: TransferItem[];
  targetKeys: string[];
  onChange: (nextTargetKeys: string[], direction: 'left' | 'right', moveKeys: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());        // 勾选集合：左右两侧共享
  const [kw, setKw] = useState({ left: '', right: '' });

  const targetSet = useMemo(() => new Set(targetKeys), [targetKeys]);
  const sourceItems = dataSource.filter((i) => !targetSet.has(i.key));     // 左：未在目标侧
  const targetItems = dataSource.filter((i) => targetSet.has(i.key));      // 右：已在目标侧
  const filter = (list: TransferItem[], k: string) =>
    k.trim() ? list.filter((i) => (i.title + (i.description ?? '')).toLowerCase().includes(k.trim().toLowerCase())) : list;

  const toggle = (key: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  /** 迁移：方向由"勾选项当前在哪侧"推导；迁移的恰是勾选项；完成后勾选必须清空（见文末坑 4） */
  const move = (direction: 'left' | 'right') => {
    const moveKeys = [...selected].filter((k) =>
      direction === 'right' ? !targetSet.has(k) : targetSet.has(k));       // 只动本侧的勾选
    const nextTarget = direction === 'right'
      ? [...targetKeys, ...moveKeys]
      : targetKeys.filter((k) => !moveKeys.includes(k));
    onChange(nextTarget, direction, moveKeys);
    setSelected(new Set());                                                // 关键收尾：不清空会立刻被反向移回
  };

  const Listbox = ({ items, side }: { items: TransferItem[]; side: 'left' | 'right' }) => (
    <div style={{ width: 220, border: '1px solid #d9d9d9', borderRadius: 4 }}>
      <input placeholder={`搜索${side === 'left' ? '待选' : '已选'}列表`} value={kw[side]}
        onChange={(e) => setKw((prev) => ({ ...prev, [side]: e.target.value }))} />
      <ul style={{ listStyle: 'none', maxHeight: 240, overflowY: 'auto', margin: 0, padding: 4 }}>
        {filter(items, kw[side]).map((item) => (
          <li key={item.key}>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: item.disabled ? 0.4 : 1 }}>
              <input type="checkbox" disabled={item.disabled} checked={selected.has(item.key)}
                onChange={() => toggle(item.key)} />
              {item.title}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );

  const sourceSelected = [...selected].filter((k) => !targetSet.has(k)).length; // 分侧统计：驱动按钮文案与禁用态
  const targetSelected = [...selected].filter((k) => targetSet.has(k)).length;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Listbox items={sourceItems} side="left" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" disabled={!sourceSelected} onClick={() => move('right')}>
          {sourceSelected ? `到右侧 (${sourceSelected})` : '到右侧'}
        </button>
        <button type="button" disabled={!targetSelected} onClick={() => move('left')}>
          {targetSelected ? `到左侧 (${targetSelected})` : '到左侧'}
        </button>
      </div>
      <Listbox items={targetItems} side="right" />
    </div>
  );
}
```

antd 的 Transfer 在此之上补齐了生产细节：`render`（自定义行渲染）、`pagination`（列表分页——大数据量的正解）、`showSearch` + `filterOption`（搜索）、`oneWay`（单向模式，右侧不显示勾选）、`rowKey`（自定义 key 字段）、`titles`/`operations`（文案）、`listStyle`：

```tsx
import { Transfer } from 'antd';
import type { TransferProps } from 'antd';

interface Dept { key: string; title: string; description: string; disabled?: boolean }

const onChange: TransferProps<Dept>['onChange'] = (targetKeys, direction, moveKeys) => {
  // 三参一次带全——和 Table 的 onChange 同款协议设计思想（Lv3 Table 考点 1 的"一致性"论证在这里复用）
  console.log('目标侧:', targetKeys, '方向:', direction, '本次移动:', moveKeys);
};

<Transfer
  dataSource={depts}
  targetKeys={targetKeys}
  onChange={onChange}
  showSearch
  filterOption={(inputValue, item) => item.title.includes(inputValue)} // 搜索过滤谓词
  render={(item) => `${item.title}（${item.description}）`}            // 行渲染
  pagination={{ pageSize: 10 }}                                        // 大列表分页，防万级卡死
  oneWay={false}
  rowKey={(record) => record.key}
/>
```

#### 本组常见坑（症状 → 根因 → 修法）

```text
坑 1
症状：Cascader 表单回显失败，value 明明是 '思明区' 却显示裸路径/空。
根因：Cascader 的 value 是全路径数组 ['福建','厦门','思明区']，只存末级值在 options 里找不到对应链。
修法：提交与回显统一用全路径数组；若后端只存末级，入参时用 flattenCascaderPaths 反查补全链路。

坑 2
症状：Cascader 异步 + 搜索，子级永远搜不到。
根因：搜索基于已加载的 options 拍平，未下钻过的子级根本不在内存里。
修法：二选一——搜索走后端接口（推荐，showSearch.filter 接远程），或预拉全部层级（数据量小时可行）。

坑 3
症状：TreeSelect 换了 showCheckedStrategy 后表单值形状变了，提交报错。
根因：三种策略的 value 形状语义不同（父键/叶子键/全量键），后端没跟着切。
修法：策略是"提交口径"的一部分，前后端一起定；中途切换要写值迁移（旧值按新策略重算）。

坑 4
症状：Transfer 移到右侧后，右侧列表的勾选还是亮的，再点一下按钮又被移回左侧。
根因：move 之后没清空勾选集合，同一批 key 还在 selectedKeys 里。
修法：迁移完成后 setSelected(new Set())（见 MiniTransfer.move 的收尾行）；antd 内部同样如此。

坑 5
症状：Transfer 两三千条数据列表滚动掉帧。
根因：双列表全量渲染 DOM。
修法：开 pagination 分页（antd 一等公民支持）；或列表体换虚拟滚动（复用 Lv3 Select 考点 4 的 VirtualList）。
```

---

到这里，Lv3 的七组组件全部展开完毕。下一节的 Upload（★★★★）会把战场从"展示与选择"切到"文件与网络"：隐藏 input、三入口上传、并发控制与分片续传——那是另一套完全不同的功力考卷。

### Upload（★★★★）

> 本节骨架（原大纲）：
> - 隐藏 input + 点击/拖拽/粘贴三入口
> - beforeUpload 返回 false 转手动上传；xhr onprogress 进度
> - **并发控制（p-limit）、分片上传、断点续传（hash 秒传）**、图片裁剪预览

Upload 是 Lv3 里一个特殊的存在：它的 DOM 极少（一个隐藏的 `<input type="file">` 而已），难点全部在**协议与流程**上——怎么把文件从浏览器安全地搬到服务端，怎么在弱网、大文件、批量并发、页面刷新这些现实条件下不出错。你可以把它理解为"文件版的 Table"：Table 的本质是受控协议工程（见前文 Table 一节），Upload 的本质是**上传状态机 + 网络工程**。antd 的 Upload 把这一整套封装成了 `action` / `data` / `headers` / `name` / `withCredentials` / `customRequest` 的 props 协议，本节我们从零把它造一遍，造完再回头看 antd 的 API 设计会非常亲切。

考点地图（与原大纲一一对应）：

1. **三入口**：点击、拖拽、粘贴，各自的监听方式与数据获取通道（`input.change` / `DataTransfer.files` / `clipboardData.files`），以及 `FileReader` 与 `URL.createObjectURL` 两条预览路线。
2. **beforeUpload 返回 false 转手动上传**：受控 `fileList` 的状态机（`uploading / done / error / removing`）。
3. **xhr onprogress 进度**：为什么进度条必须用 XHR 而不是 fetch；FormData 上传的完整函数。
4. **并发控制 p-limit**：实现原理（手写 20 行版）与批量/分片场景的接入方式。
5. **大文件分片上传全流程**：`slice` 分块 + SparkMD5 增量 hash + 并发上传 + 合并通知；断点续传与秒传的接口约定。
6. **图片裁剪预览要点**：显示坐标与原图坐标的换算、canvas 导出。

---

#### 考点一：隐藏 input + 点击/拖拽/粘贴三入口

**先分清两个"数据搬运工"**，这是本考点的概念地基：

- **`DataTransfer`**：拖拽（`event.dataTransfer`）和粘贴（`event.clipboardData`）事件对象上携带文件的容器，从**事件**里**拿 File 对象**，不读内容。
- **`FileReader`**：把 File 的**内容读进内存**（`readAsDataURL` / `readAsArrayBuffer` / `readAsText`），用于本地预览或前端处理（如压缩、hash）。`input.change` 拿到的 `event.target.files` 是 `FileList`，不经 DataTransfer。

一句话：DataTransfer 负责"取文件"，FileReader 负责"读文件"。取到 File 之后，预览还有一条更便宜的路——`URL.createObjectURL(file)` 直接生成一个 blob: URL 给 `<img src>`，不把文件内容复制进 JS 堆，代价是要记得 `revokeObjectURL` 释放引用。

**入口一：点击。** 原生文件选择器只能由用户手势触发，而且唯一的触发方式就是 input 元素自己的 `click()`。所以所有组件库的做法一致：渲染一个 `display: none` 的 input，点击自定义按钮时代理触发它：

```tsx
// input 必须真实存在于 DOM 中，display:none 即可（antd 同款做法）
<input ref={inputRef} type="file" style={{ display: 'none' }} multiple onChange={onChange} />
<button onClick={() => inputRef.current?.click()}>点击上传</button>
```

**入口二：拖拽。** 最容易踩的坑在这里：浏览器对"往页面里拖文件"有一个默认行为（松手后直接打开这个文件，等于整页被劫持）。要允许 drop，必须在 `dragover`（以及保险起见的 `dragenter`）上 `preventDefault()`，这个默认行为才会被取消：

```tsx
<div
  onDragOver={(e) => e.preventDefault()}          // 不取消默认行为就无法触发 drop
  onDragEnter={(e) => e.preventDefault()}
  onDrop={(e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files); // DataTransfer.files：FileList → 数组
    handleFiles(files);
  }}
>
  拖拽文件到此区域
</div>
```

顺手提一个进阶点：`e.dataTransfer.items` 里的 entry（`webkitGetAsEntry()`）能拿到**拖入的文件夹**结构，可递归遍历上传目录——网盘类产品靠它，普通业务不需要。

**入口三：粘贴。** 监听 `paste` 事件，文件在 `e.clipboardData.files` 里（QQ/微信截图后 Ctrl+V 就是这条通道）。注意 paste 只在页面有焦点时触发，用户如果焦点停在地址栏上是收不到的：

```tsx
useEffect(() => {
  const onPaste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length > 0) handleFiles(files);
  };
  document.addEventListener('paste', onPaste);
  return () => document.removeEventListener('paste', onPaste);
}, []);
```

**三个入口汇流之后有一个公共细节：input 重置。** 连续两次选择同一个文件，第二次 `change` 不触发——因为 input 的 value 没变。所以读走 files 后必须手动清空：

```tsx
const onChange = (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files ?? []);
  handleFiles(files);
  e.target.value = ''; // 允许再次选择同一个文件
};
```

把三个入口拼成一个完整的"文件采集器"：

```tsx
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

export function FilePicker({
  onFiles,
  accept,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    // 入口三：粘贴。挂在 document 上，组件卸载时解绑
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) onFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onFiles]);

  return (
    <div
      // 入口二：拖拽
      onDragOver={(e: DragEvent) => {
        e.preventDefault(); // 必须：否则松手时浏览器直接打开文件
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      style={{
        border: dragOver ? '2px dashed #1677ff' : '2px dashed #d9d9d9',
        padding: 24,
        textAlign: 'center' as const,
      }}
    >
      {/* 入口一：点击 */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = ''; // 重置：允许重复选择同一文件
        }}
      />
      点击选择 / 拖入文件 / Ctrl+V 粘贴截图
      <button onClick={() => inputRef.current?.click()} style={{ marginLeft: 12 }}>
        浏览文件
      </button>
    </div>
  );
}
```

---

#### 考点二：beforeUpload 返回 false 转手动上传（受控 fileList 状态机）

antd 的 `beforeUpload(file)` 支持四种返回值，语义各不相同，这是面试高频：

| 返回值 | 语义 |
|---|---|
| `true` / 不返回 | 走自动上传（组件自己发请求） |
| `false` | **阻止自动上传，但文件仍进入 fileList**——转手动上传模式 |
| `Promise<File \| Blob>` | 异步校验/加工后，用 resolve 出的新文件替换原文件（典型：前端压缩图片） |
| `Promise.reject` / `Upload.LIST_IGNORE` | 彻底拒绝，连 fileList 都不进 |

`false` 的价值：很多业务要求"先选一批、填好备注、点保存时连同表单一起提交"，或者"上传动作由父组件统一调度"。此时组件不该擅自发请求，只负责维护列表与状态。

**受控 fileList 是一个显式状态机**。antd 的 `UploadFile.status` 是 `'uploading' | 'done' | 'error' | 'removed'`（另有遗留的 `'success'`），我们的手写版保持同一形状：

```text
                选择文件，加入列表
                      │
                      ▼
                  ┌────────┐  上传成功   ┌──────┐
        ┌────────►│uploading├──────────►│ done │
        │         └────┬────┘           └──┬───┘
        │ 重试          │ 网络失败           │ 用户点删除
        │              ▼                   ▼
        └──────────┌──────┐  用户点删除  ┌─────────┐
                   │error │ ──────────► │removing │──动画/确认完成──► removed（从列表剔除）
                   └──────┘             └─────────┘
```

为什么需要 `removing` 这个过渡态：如果删除是即时的，列表项立刻消失，退出动画（见 A3 的 visible/mounted 双状态机）没有时间播；如果删除要走服务端确认（"确定删除？"），更需要一个"删除中"的状态防止连点。`removed` 则是 antd 约定的"本条已删除"信号——`onChange` 最后会收到一次 status 为 `removed` 的变更，父组件据此从自己的受控列表里过滤掉它。

完整的手动上传实现（受控 fileList + 状态机 + 下一节的 uploadFile 函数拼装即可跑通）：

```tsx
import { useState } from 'react';

// 文件条目：状态机 + 进度
interface UploadFile {
  uid: string;
  name: string;
  size: number;
  raw: File;
  status: 'uploading' | 'done' | 'error' | 'removing';
  percent: number; // 0-100
  url?: string;    // 上传成功后的服务端地址
}

type BeforeUpload = (file: File) => boolean | Promise<File | false>;

export function ManualUpload({
  beforeUpload,
  action,
}: {
  beforeUpload?: BeforeUpload;
  action: string;
}) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 不可变更新：所有状态迁移都返回新数组/新对象，绝不 push 原数组
  const patch = (uid: string, part: Partial<UploadFile>) =>
    setFileList((list) => list.map((f) => (f.uid === uid ? { ...f, ...part } : f)));

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      // beforeUpload 返回 false：只入列、不上传（本组件本来就是手动模式，这里用于"拒绝/加工"语义）
      const verdict = beforeUpload ? await beforeUpload(file) : true;
      if (verdict === false) continue;
      const real: File = verdict instanceof File ? verdict : file;
      setFileList((list) => [
        ...list,
        {
          uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: real.name,
          size: real.size,
          raw: real,
          status: 'uploading',
          percent: 0,
        },
      ]);
    }
  };

  // 手动模式的核心动作：由用户点击触发，而不是选中即传
  const upload = async (file: UploadFile) => {
    try {
      const { url } = await uploadFile(file.raw, {
        action,
        onProgress: (percent) => patch(file.uid, { percent }), // 状态机：uploading + percent 增长
      });
      patch(file.uid, { status: 'done', percent: 100, url });
    } catch {
      patch(file.uid, { status: 'error' }); // 状态机：error，等待重试或删除
    }
  };

  const remove = (file: UploadFile) => {
    // 先进 removing 过渡态（播退出动画 / 弹确认框），完成后真正剔除
    patch(file.uid, { status: 'removing' });
    setTimeout(() => {
      setFileList((list) => list.filter((f) => f.uid !== file.uid)); // removed：从列表消失
    }, 300);
  };

  return (
    <div>
      <FilePicker onFiles={addFiles} />
      <ul>
        {fileList.map((f) => (
          <li key={f.uid}>
            {f.name} · {f.status === 'uploading' ? `${f.percent}%` : f.status}
            {f.status === 'error' && <button onClick={() => upload(f)}>重试</button>}
            <button onClick={() => remove(f)}>删除</button>
          </li>
        ))}
      </ul>
      <button onClick={() => fileList.filter((f) => f.status === 'error' || f.percent === 0)
        .forEach(upload)}>
        开始上传
      </button>
    </div>
  );
}
```

注意三个状态机纪律：**受控列表只做不可变更新**；**所有网络终态（done/error）都必须落进状态**，否则 UI 与真实世界脱节；**重试是把状态机拨回 uploading 再走一遍上传函数**，而不是新开一条列表项。

---

#### 考点三：xhr onprogress 进度实现（FormData 上传完整函数）

**为什么进度条必须用 XHR。** fetch 长期没有上传进度事件：响应体可以流式读（`res.body`），但**请求体**的上传进度一直是空白。后来标准允许用 `ReadableStream` 做 duplex 请求体自己计量，但要求 HTTP/2、服务器配合，且 iOS Safari 等环境长期不支持——工业实践里上传进度依旧一律走 `xhr.upload.onprogress`。XHR 在 `xhr.upload`（XMLHttpRequestUpload 对象）上派发 `progress` 事件，`e.loaded / e.total` 就是已传/总字节数（`lengthComputable` 为 false 时拿不到 total，比如 chunked 编码）。

完整函数（上一节代码引用的就是它）：

```ts
interface UploadOptions {
  action: string;
  fieldName?: string;                       // 文件字段名，服务端按它取文件
  data?: Record<string, string>;            // 附带业务字段（如目录 id）
  headers?: Record<string, string>;         // 如鉴权 token
  onProgress?: (percent: number) => void;
}

export function uploadFile(file: File, options: UploadOptions): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append(options.fieldName ?? 'file', file);
    if (options.data) {
      for (const [k, v] of Object.entries(options.data)) form.append(k, v);
    }

    xhr.open('POST', options.action);
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) xhr.setRequestHeader(k, v);
    }

    // 进度：只有 XHR 有上传进度事件；fetch 做不到（工业环境）
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        options.onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      // HTTP 层完成还要看状态码：2xx 才算业务成功
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('响应不是合法 JSON'));
        }
      } else {
        reject(new Error(`上传失败：HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new TypeError('网络错误')); // 断网/DNS/CORS
    xhr.onabort = () => reject(new DOMException('已取消', 'AbortError')); // 可接 xhr.abort() 做取消上传

    xhr.send(form); // 千万不要手动设置 Content-Type（见下方坑表）
  });
}
```

一个必背细节：`xhr.send(FormData)` 会自动带上 `Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXX`，boundary 是随机生成的分隔符。如果你 `setRequestHeader('Content-Type', 'multipart/form-data')` 手动覆盖，boundary 丢失，服务端无法切分表单——这是新手最常见的一发必炸。JSON 字段放在 FormData 里一起传即可，不需要单独的 JSON 请求。

---

#### 考点四：并发控制 p-limit（实现原理：手写 20 行 + 接入）

**为什么需要并发控制。** 批量上传 50 个文件或大文件的 100 个分片时，`Promise.all(tasks.map(upload))` 会同时发出全部请求。浏览器的限制立刻撞上：HTTP/1.1 下同域名最多 6 个 TCP 连接（HTTP/2 虽多路复用但服务端并发处理、内存、限流仍在），结果就是队列尾部请求超时、服务端被打挂、进度条全员 0%。正确姿势：**用一个并发上限（如 3–6）的闸门，任务完成一个放行一个**。npm 上的事实标准是 sindresorhus 的 p-limit。

**p-limit 的原理只有三句话**：维护 `activeCount`（在跑的任务数）和一个 FIFO 等待队列；任务到达时若已满，把自己包装成"待唤醒"的 Promise 塞进队列挂起；任务结束（无论成败）在 `finally` 里 `activeCount--` 并唤醒队首。手写 20 行版（语义与 p-limit 一致）：

```ts
// 手写 p-limit：并发上限 + 先进先出 + 异常也释放槽位
export function createLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = []; // 等待者的 resolve 函数队列

  const next = () => {
    activeCount--;
    queue.shift()?.(); // 唤醒队首
  };

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (activeCount >= concurrency) {
      // 已满：挂起自己，等上一个任务结束时被唤醒
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeCount++;
    try {
      return await fn();
    } finally {
      next(); // 成败都释放槽位——否则一个 reject 就永久少一个坑
    }
  };
}
```

三个容易写错的点单独强调：

1. **释放必须在 `finally`**。写在 then 里，任务抛异常后槽位永久泄漏，后续任务全部饿死。
2. **`await new Promise(push resolve)` 的入队顺序就是执行顺序**。JS 单线程保证同步代码里 push 的先后即 FIFO，不需要锁。
3. **`limit(fn)` 返回的 Promise 依然要在调用方 `await`**。闸门只控制"开始执行"，不改变 Promise 语义。

**接入**（批量上传 + 聚合进度）：

```ts
async function uploadBatch(files: File[], onTotalProgress: (p: number) => void) {
  const limit = createLimit(3); // 并发 3
  let done = 0;
  await Promise.all(
    files.map((file) =>
      limit(async () => {
        await uploadFile(file, { action: '/api/upload' }); // 考点三的函数
        done++;
        onTotalProgress(Math.round((done / files.length) * 100)); // 聚合进度
      }),
    ),
  );
}
```

---

#### 考点五：大文件分片上传全流程（slice + SparkMD5 + 并发 + 合并；断点续传与秒传）

**为什么分片。** 一个 2GB 的视频走单请求：弱网传到 95% 断线，全部重来；网关（Nginx 默认 `client_max_body_size 1m`）直接 413；超时阈值拦腰截断；服务端还要把 2GB 整个缓冲。分片把问题全部拆小：单片 5MB，失败只重传单片，断点续传成为可能。全流程：

```text
选择大文件
   │
   ├─① slice 切成 N 片（不复制内存，只是视图引用）
   │
   ├─② 计算整文件 hash（SparkMD5 增量喂入，建议 Web Worker）
   │
   ├─③ POST /verify { hash, filename }
   │      ├─ exists: true ──────────────► 秒传：服务端已有同 hash 完整文件，直接返回 URL，结束
   │      └─ exists: false, uploaded: [0,3,5]
   │                                     断点续传：已传分片清单，跳过它们
   ├─④ 未传分片并发上传（p-limit 控制） POST /chunk (FormData: chunk, hash, index)
   │
   └─⑤ 全部完成后 POST /merge { hash, filename, size, chunkSize }
          服务端按 index 顺序拼接，落盘，返回最终 URL
```

**接口约定**（前后端共同遵守的契约，面试时能默写这张表是加分项）：

| 接口 | 方法 | 请求体 | 响应 | 语义 |
|---|---|---|---|---|
| `/api/upload/verify` | POST (JSON) | `{ hash, filename }` | `{ exists: boolean, uploaded: number[] }` | 秒传判定 + 已传分片清单 |
| `/api/upload/chunk` | POST (FormData) | 字段 `chunk`(Blob)、`hash`、`index` | `{ ok: true }` | 上传单个分片 |
| `/api/upload/merge` | POST (JSON) | `{ hash, filename, size, chunkSize }` | `{ url: string }` | 通知服务端按序合并 |

服务端只需两个持久化规则：分片文件按 `{hash}-{index}` 命名暂存；`/merge` 时校验分片齐全（`size / chunkSize` 推出总数）再顺序拼接。hash 用文件内容算出，所以**同一个文件在任何机器上 hash 相同**——这是秒传与断点续传成立的根基。

**① slice 分块 + ② SparkMD5 增量 hash**：

```ts
import SparkMD5 from 'spark-md5'; // npm i spark-md5 @types/spark-md5

// JSON 请求小助手：json() 返回 Promise<any>，这里收窄类型，后面三处复用
function postJSON<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json() as Promise<T>);
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB：兼顾请求数与重传成本（Nginx 需放行该上限）

// ① 分块：File 继承 Blob，slice 返回 Blob"视图"，不复制内存，秒级完成
function createChunks(file: File): Blob[] {
  const chunks: Blob[] = [];
  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    chunks.push(file.slice(start, start + CHUNK_SIZE));
  }
  return chunks;
}

// ② 增量 hash：SparkMD5.ArrayBuffer 支持分次 append，避免一次性读入整个大文件
async function hashFile(file: File): Promise<string> {
  const spark = new SparkMD5.ArrayBuffer();
  const count = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    const buf = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
    spark.append(buf); // 一片一片喂
  }
  return spark.end(); // 输出最终 MD5
}
```

为什么强调 **Web Worker**：hash 是纯 CPU 计算，1GB 文件在主线程算 MD5 会把页面卡死数秒（用户点击、动画全部冻结）。生产实现把 hashFile 搬进 worker（Vite 下零配置）：

```ts
// hash.worker.ts —— 独立线程算 hash，顺便回报进度
import SparkMD5 from 'spark-md5';

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data;
  const CHUNK = 5 * 1024 * 1024;
  const spark = new SparkMD5.ArrayBuffer();
  const count = Math.ceil(file.size / CHUNK);
  for (let i = 0; i < count; i++) {
    spark.append(await file.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer());
    self.postMessage({ type: 'hashing', percent: Math.round(((i + 1) / count) * 100) });
  }
  self.postMessage({ type: 'done', hash: spark.end() });
};

// 主线程（Vite 写法）：
// const worker = new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' });
// worker.postMessage({ file });
// worker.onmessage = (e) => e.data.type === 'done' ? e.data.hash : setHashPercent(e.data.percent);
```

顺带一句安全注脚：demo 用 MD5（快、生态成熟）；对防碰撞有要求的场景换 SHA-256（`crypto.subtle.digest`，但它是一次性全量计算，增量场景仍以 SparkMD5 或 wasm 实现为主），并在 verify 时同时校验 `size`，双因子降低碰撞误判。

**③④⑤ 全流程串起来**（秒传、断点续传、并发、合并一次到位）：

```ts
async function uploadLargeFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const chunks = createChunks(file);
  const hash = await hashFile(file); // 生产环境换成 worker 版

  // ③ 查询：秒传判定 + 断点续传清单
  const { exists, uploaded } = await postJSON<{ exists: boolean; uploaded: number[] }>(
    '/api/upload/verify',
    { hash, filename: file.name },
  );

  if (exists) {
    onProgress(100); // 秒传：内容相同的文件已存在，零字节上传
    return await queryUrlByHash(hash);
  }

  // ④ 只传缺失分片（断点续传的关键一行：过滤 uploaded）
  const pending = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ index }) => !uploaded.includes(index));
  const limit = createLimit(3); // 考点四的并发闸门
  let done = uploaded.length;

  await Promise.all(
    pending.map(({ chunk, index }) =>
      limit(async () => {
        const form = new FormData();
        form.append('chunk', chunk);
        form.append('hash', hash);
        form.append('index', String(index));
        await fetch('/api/upload/chunk', { method: 'POST', body: form });
        done++;
        onProgress(Math.round((done / chunks.length) * 100));
      }),
    ),
  );

  // ⑤ 合并通知：服务端按 index 顺序拼接落盘
  const { url } = await postJSON<{ url: string }>('/api/upload/merge', {
    hash,
    filename: file.name,
    size: file.size,
    chunkSize: CHUNK_SIZE,
  });

  return url;
}

// 辅助：秒传时服务端已持有该 hash 的文件，提供按 hash 取 URL 的查询
async function queryUrlByHash(hash: string): Promise<string> {
  const { url } = await fetch(`/api/upload/url?hash=${encodeURIComponent(hash)}`).then(
    (r) => r.json() as Promise<{ url: string }>,
  );
  return url;
}
```

断点续传还有一层"客户端缓存"变体：本地 `localStorage` 记录 `{ hash: [已传 index] }`，刷新页面后先比对本地清单再问服务端——但要以上传中的 `onUploadProgress` 打点为准，服务端清单才是唯一真相。**分片重传的失败处理**：单片失败重试 3 次（指数退避），仍失败则整体标记 error，让用户"续传"而不是"重传"——这正是断点续传的产品价值。

---

#### 考点六：图片裁剪预览要点

头像上传的标配链路：选择 → 预览 → 裁剪 → 导出 File → 上传。要点集中在**坐标系换算**：

- **预览**：`URL.createObjectURL(file)` 给 `<img src>`，便宜且同步；用完 `revokeObjectURL`。不需要 FileReader 的 dataURL（base64 会让内存膨胀 1/3）。
- **裁剪框坐标是"显示坐标"**（相对缩放后的 img 元素），**导出要的是"原图像素坐标"**（相对 naturalWidth/naturalHeight）。换算只需一个比例：`scale = img.naturalWidth / img.clientWidth`，裁剪框乘以 scale 即原图坐标。漏乘 scale 是裁剪类 bug 的第一大来源（症状：小图上裁剪偏移不明显，大图上裁出来的区域跑偏）。
- **导出**：`canvas.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)` 截取原图区域，`canvas.toBlob` 得 Blob，`new File([blob])` 回到 File 形态，重新进入上传链路。
- **交互要点**：固定比例（1:1 头像）时拖动只改位置不改形状；最小尺寸限制；`<img>` 加 `style={{ imageOrientation: 'from-image' }}` 处理手机照片的 EXIF 旋转，否则裁剪框和实际像素方向对不上。

一个最小可用裁剪器（拖动移动 + 等比导出）：

```tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function ImageCropper({
  src,
  onCropped,
}: {
  src: string; // createObjectURL 产出的预览地址
  onCropped: (file: File) => void;
}) {
  const SIZE = 200; // 固定 1:1、200×200 显示尺寸的裁剪框
  const [rect, setRect] = useState<CropRect>({ x: 40, y: 40, w: SIZE, h: SIZE });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragBase = useRef<{ px: number; py: number; rect: CropRect } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); // 拖出裁剪框仍持续跟随（见 Slider 一节）
    dragBase.current = { px: e.clientX, py: e.clientY, rect };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const base = dragBase.current;
    const img = imgRef.current;
    if (!base || !img) return;
    // 夹取在图片显示范围内
    const x = Math.min(Math.max(0, base.rect.x + e.clientX - base.px), img.clientWidth - base.rect.w);
    const y = Math.min(Math.max(0, base.rect.y + e.clientY - base.py), img.clientHeight - base.rect.h);
    setRect({ ...base.rect, x, y });
  };

  const exportCrop = async () => {
    const img = imgRef.current!;
    const scale = img.naturalWidth / img.clientWidth; // 显示坐标 → 原图像素坐标
    const sx = rect.x * scale;
    const sy = rect.y * scale;
    const sw = rect.w * scale;
    const sh = rect.h * scale;
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas
      .getContext('2d')!
      .drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); // 从原图抠区域到画布
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    if (blob) onCropped(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
  };

  return (
    <div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={src}
          style={{ maxWidth: 480, imageOrientation: 'from-image' }} /* EXIF 方向修正 */
          alt="待裁剪"
        />
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragBase.current = null)}
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            border: '2px solid #1677ff',
            cursor: 'move',
            touchAction: 'none', // pointer 事件与触摸滚动不抢手势
          }}
        />
      </div>
      <button onClick={exportCrop}>确认裁剪</button>
    </div>
  );
}
```

生产环境一般直接用 react-easy-crop / react-image-crop（缩放、旋转、多点触控都处理好了），但换算公式和导出代码与上面完全同构——这也是面试问"裁剪怎么实现"时真正想听的东西。

---

#### Upload 常见坑（症状 → 根因 → 修法）

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 第二次选择同一文件无反应 | input 的 value 没变，change 不触发 | 读完 `e.target.files` 后 `e.target.value = ''` |
| 2 | 拖入文件后浏览器打开了文件本身 | `dragover` 没有 `preventDefault()`，drop 被默认行为接管 | dragenter/dragover 双 `preventDefault()` |
| 3 | 进度条永远不动 | 用 fetch 上传，fetch 无上传进度事件 | 换 XHR `upload.onprogress`（考点三） |
| 4 | 服务端 422/解析失败 | 手动设置了 `Content-Type: multipart/form-data`，boundary 丢失 | 删掉该 header，让浏览器自动生成 |
| 5 | 受控 fileList 删了/传完 UI 不刷新 | 用 push/splice 直接改原数组，引用未变，React 不重渲染 | 一律 map/filter 生成新数组（考点二代码） |
| 6 | 粘贴截图收不到事件 | 焦点不在页面内（地址栏/其他窗口） | 提示用户先点击页面；或把监听放到内容区可编辑元素上 |
| 7 | 分片上传 413 | 网关 body 大小上限小于 CHUNK_SIZE（Nginx 默认 1m） | 服务端调 `client_max_body_size`，或减小 CHUNK_SIZE |
| 8 | 大文件卡在"计算 hash"页面冻结 | MD5 计算在主线程，阻塞渲染 | hash 搬 Web Worker（考点五 worker 版） |

### Carousel / Slider / Rate / ColorPicker（★★★）

> 本节骨架（原大纲）：
> - Carousel：自动播放（visibilitychange 暂停）、无限循环（clone 首尾）、拖拽切换
> - Slider：pointer capture 拖拽、键盘步进、tooltip 位置换算
> - ColorPicker：HSV 面板拖拽 + 渐变背景计算 + 格式转换

这四个组件是同一个母题的四种变奏：**把连续的几何输入（拖拽的位移、指针的坐标）离散成语义值（页码、数值、星级、颜色）**。它们共用两件内功：pointer 事件体系（`setPointerCapture` + `touch-action: none`）和"比例 ↔ 值"的换算公式。逐个看。

---

#### Carousel：自动播放、无限循环、拖拽切换

**考点 1：自动播放（interval + visibilitychange 暂停）。** 用 `setInterval` 推进页码，但必须处理两个经典缺陷：一是切到后台标签页时浏览器降频计时，回来瞬间连跳好几页；二是后台空转浪费电量。解法是监听 `document.visibilitychange`，隐藏即停、可见即启。同时注意 `setInterval` 回调用**函数式更新** `setIndex(i => i + 1)`，避免闭包捕获过期值。

**考点 2：无限循环（clone 首尾 + 瞬时跳回）。** 如果只是 `index = (index + 1) % n`，从最后一页回到第一页时，轨道会反向扫过全部内容（或无动画地闪跳），视觉穿帮。工业解法是**克隆首尾**，把循环边界藏在克隆页里：

```text
渲染序列：  [末页']   第0页   第1页  ...  第n-1页   [第0页']
序列下标：     0       1      2    ...    n       n+1
                              ▲                ▲
                         正常停在这里      动画滑到这里后：
                         （真实页区间）    ①关过渡 ②瞬移回下标 1 ③下一帧恢复过渡
```

第 n+1 位放的是第 0 页的**克隆**，两者像素级相同。从第 n 页滑到第 n+1 页（动画正常播完），在 `transitionend` 时刻关闭 transition、把 index 瞬改回 1——因为克隆页和真实页长得一模一样，这一帧的"瞬移"用户完全看不见。反向同理（滑到下标 0 的首克隆后跳回 n）。这就是"瞬时跳回"技巧的全部。

**考点 3：拖拽切换（pointer 拖动距离阈值判定）。** pointerdown 记录起点，pointermove 让轨道**跟手位移**（把位移 px 加进 transform），pointerup 时按**拖动行程是否过阈值**决定翻页还是回弹：阈值取 `min(容器宽 × 20%, 80px)`——既要"拖一点就能翻"的灵敏，又要防误触。拖动期间关闭 transition（否则跟手位移会被 0.4s 的过渡拖成"橡皮筋"），松手后恢复。

三个考点合体的完整实现：

```tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export function Carousel({
  children,
  interval = 3000,
}: {
  children: ReactNode[]; // 至少 2 张
  interval?: number;
}) {
  const count = children.length;
  const slides = [children[count - 1], ...children, children[0]]; // clone 首尾
  const total = slides.length; // count + 2

  const [index, setIndex] = useState(1); // 渲染序列下标，初始指向真实第 0 页
  const [animated, setAnimated] = useState(true); // 瞬时跳回时临时关闭过渡
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const start = useCallback(() => {
    stop();
    timerRef.current = window.setInterval(() => setIndex((i) => i + 1), interval);
  }, [interval, stop]);

  // 自动播放：页面不可见时暂停——回来不连跳、后台不空转
  useEffect(() => {
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [start, stop]);

  // 无限循环核心：动画落到克隆页后"关过渡 → 瞬移 → 恢复过渡"
  const handleTransitionEnd = () => {
    if (index === total - 1) {
      setAnimated(false);
      setIndex(1); // 瞬移回真实第 0 页（与尾克隆同貌，视觉无缝）
    } else if (index === 0) {
      setAnimated(false);
      setIndex(total - 2); // 瞬移回真实最后一页
    }
    if (index === 0 || index === total - 1) {
      // 等"无过渡跳变"绘制完成后，再恢复过渡——顺序不能反，否则瞬移也带动画
      requestAnimationFrame(() => setAnimated(true));
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId); // 拖出容器仍持续跟踪
    setDragging(true);
    stop(); // 拖动期间暂停自动播放
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    setDragX(e.clientX - dragStartX.current); // 跟手位移
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const width = containerRef.current?.clientWidth ?? 1;
    const threshold = Math.min(width * 0.2, 80); // 行程阈值：20% 宽或 80px 取小
    if (dx <= -threshold) setIndex((i) => i + 1); // 左拖过阈值 → 下一页
    else if (dx >= threshold) setIndex((i) => i - 1); // 右拖过阈值 → 上一页
    // 未过阈值：dragX 清零 + 恢复过渡 = 自动回弹到当前页
    dragStartX.current = null;
    setDragging(false);
    setDragX(0);
    start();
  };

  // 换算真实页码（供指示点高亮）：克隆位映射回真实边界
  const realIndex = index === 0 ? count - 1 : index === total - 1 ? 0 : index - 1;

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTransitionEnd={handleTransitionEnd}
        style={{
          display: 'flex',
          width: `${total * 100}%`, // 轨道总宽 = 页数 × 容器宽
          // translateX 百分比基准是轨道自身宽度，所以每页步长是 100/total %
          transform: `translateX(calc(${(-index * 100) / total}% + ${dragX}px))`,
          transition: dragging || !animated ? 'none' : 'transform 0.4s ease',
          touchAction: 'none', // 拖动与页面触摸滚动不抢手势
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} style={{ flex: `0 0 ${100 / total}%` }}>
            {slide}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 8, width: '100%', textAlign: 'center' }}>
        {children.map((_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              margin: '0 4px',
              borderRadius: '50%',
              background: i === realIndex ? '#1677ff' : 'rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

Carousel 常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 快速连点箭头后轮播卡在边界 | 连点触发 `transitioncancel`，`onTransitionEnd` 没跑到，瞬时跳回逻辑失守 | 跳回判定别只依赖 transitionend：在 effect 里对越界 index 做一帧兜底校正 |
| 2 | 拖动跟手"发黏" | 拖动中的 `dragX` 位移也被 0.4s transition 平滑了 | 拖动期间 `transition: none`（代码里的 `dragging` 分支） |
| 3 | 切后台再回来一次跳好几页 | 后台 tab 计时器降频堆积，恢复后连环触发 | `visibilitychange` 暂停/恢复 |
| 4 | 移动端拖不动 | 浏览器把横向触摸当作页面滚动，pointermove 被吞 | 轨道上 `touch-action: none` |

---

#### Slider：pointer capture、键盘步进、tooltip 位置换算

**先讲 `setPointerCapture` 的意义**——它是 Pointer Events 相对 Mouse Events 最大的工程红利。不用它，拖拽必须"在元素上 down、到 window 上挂 move/up 再清理"，元素一旦丢失指针（快速甩出、多显示器、被系统手势打断）就拖飞。调用 `el.setPointerCapture(pointerId)` 后，**后续所有该指针的事件都被重定向到这个元素**，无论指针跑到哪里，move/up 照收，直到 `pointerup` 自动释放。于是一套 onPointerDown/Move/Up 挂在同一个元素上就完成了完整拖拽。注意 `pointercancel`（系统打断，如来电、手势切换）也要复位状态。

**键盘步进**直接抄 APG（WAI-ARIA Authoring Practices，见 A5）的 slider 模型：`role="slider"` + `tabIndex={0}` + `aria-valuemin/max/now`；方向键 ±step、PageUp/Down ±10×step、Home/End 到两端，全部 `preventDefault()`（方向键默认会滚动页面）。

**tooltip 位置换算是本考点最常被问的公式。** 直觉写法 `left: ${percent * 100}%` 是错的，因为**手柄有宽度**：手柄中心的可移动范围不是 `[0, W]`，而是 `[thumb/2, W - thumb/2]`（手柄不能溢出轨道两端）。所以：

```text
thumbCenter = percent × (W − thumbW) + thumbW / 2

CSS 写法（免测量、响应式）：
left: calc((100% - 16px) * 0.4 + 8px);   /* percent=0.4、thumb=16px */
transform: translateX(-50%);              /* 以中心对齐 */
```

两端误差各 `thumbW/2`（本例 8px），percent=0 或 1 时最明显——症状就是"手柄/气泡在两端悬空或溢出"。

完整实现（含 A1 双模式受控）：

```tsx
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const THUMB = 16; // 手柄直径

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 0,
  onChange,
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: number; // 传入即受控（A1 双模式）
  defaultValue?: number;
  onChange?: (v: number) => void;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const percent = (current - min) / (max - min); // 0~1

  const commit = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      setInner(clamped);
      onChange?.(clamped);
    },
    [min, max, onChange],
  );

  // 指针横坐标 → 数值：百分比反算 + 步进对齐
  const setValueFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const snapped = Math.round((min + ratio * (max - min) - min) / step) * step + min;
      commit(Number(snapped.toFixed(6))); // 清除 0.30000000000000004 类浮点残渣
    },
    [min, max, step, commit],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); // 关键：出界不丢事件
    setDragging(true);
    setValueFromClientX(e.clientX); // 点哪跳哪
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    if (e.key in map) {
      e.preventDefault(); // 阻止方向键滚动页面
      commit(current + map[e.key]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(max);
    }
  };

  return (
    <div style={{ position: 'relative', padding: '12px 0', width: 320 }}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => dragging && setValueFromClientX(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)} // 系统打断时复位
        onKeyDown={onKeyDown}
        style={{
          height: 4,
          borderRadius: 2,
          background: '#e5e7eb',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        {/* 已滑过的填充 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent * 100}%`,
            background: '#1677ff',
            borderRadius: 2,
          }}
        />
      </div>
      {/* 手柄：中心位置公式 = percent × (轨道宽 − 手柄宽) + 手柄宽/2 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc((100% - ${THUMB}px) * ${percent} + ${THUMB / 2}px)`,
          transform: 'translate(-50%, -50%)',
          width: THUMB,
          height: THUMB,
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid #1677ff',
          pointerEvents: 'none', // 手柄不抢轨道的指针事件
        }}
      />
      {/* tooltip：与手柄同心，同一公式 */}
      {dragging && (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: `calc((100% - ${THUMB}px) * ${percent} + ${THUMB / 2}px)`,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {current}
        </div>
      )}
    </div>
  );
}
```

Slider 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 快速拖动到轨道外，数值停在半路 | 没有 pointer capture，出界后 move 不再派发 | `setPointerCapture(pointerId)` |
| 2 | 手柄在两端溢出/悬空 | `left: percent%` 没考虑手柄自身宽度 | `calc((100% − thumbW) × p + thumbW/2)` 公式 |
| 3 | 值出现 0.30000000000000004 | 浮点步进未对齐 | `Math.round(v/step)*step` + `toFixed(6)` |
| 4 | 按方向键页面跟着滚 | 键盘事件未 `preventDefault` | 见代码 onKeyDown |
| 5 | 受控模式拖不动 | 内部 state 与外部 value 打架（违反 A1 纪律） | 有 value 就完全以 value 为准，只回调不藏私 |

---

#### Rate：星级半星的换算

半星不是画了半颗星，而是**两层星星、上层按宽度百分比裁切**。核心换算只有一个：`value / count × 100%` = 覆盖层宽度。value=3.5、count=5 时覆盖 70%——第三颗星恰好露一半，第四第五颗保持灰色。半星的判定输入端同样简单：指针落在某颗星元素坐标的左半边记 `x.5`，右半边记 `x+1`：

```tsx
import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7-6.2-3.7-6.2 3.7 1.6-6.7L2.2 8.9l6.9-.6z" />
    </svg>
  );
}

export function Rate({
  count = 5,
  allowHalf = false,
  value,
  defaultValue = 0,
  onChange,
}: {
  count?: number;
  allowHalf?: boolean;
  value?: number;
  defaultValue?: number;
  onChange?: (v: number) => void;
}) {
  const [inner, setInner] = useState(defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const current = value ?? inner; // A1 双模式
  const shown = hover ?? current; // 悬停预览优先于已选值

  // 半星判定：当前星元素的左半边 → x.5；右半边 → x+1
  const valueAt = (e: ReactPointerEvent, i: number) => {
    if (!allowHalf) return i + 1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? i + 0.5 : i + 1;
  };

  // 键盘：左右方向按 step 步进（半星模式 step=0.5）
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = allowHalf ? 0.5 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(current + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(current - step);
    }
  };
  const commit = (v: number) => {
    const clamped = Math.min(count, Math.max(0, v));
    setInner(clamped);
    onChange?.(clamped);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setHover(null)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* 底层：灰色满排星星，同时承担全部交互 */}
      <div style={{ display: 'flex', gap: 4, color: '#d1d5db' }}>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            style={{ cursor: 'pointer' }}
            onPointerMove={(e) => setHover(valueAt(e, i))}
            onClick={(e) => commit(valueAt(e, i))}
          >
            <Star />
          </span>
        ))}
      </div>
      {/* 覆盖层：彩色星星，overflow:hidden + 宽度百分比 = 半星的全部秘密 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${(shown / count) * 100}%`,
          overflow: 'hidden',
          pointerEvents: 'none', // 纯视觉层，不挡底层交互
        }}
      >
        <div style={{ display: 'flex', gap: 4, width: 'max-content', color: '#f59e0b' }}>
          {Array.from({ length: count }, (_, i) => (
            <Star key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

两个实现细节值得圈出来：覆盖层内层用了 `width: max-content`——因为外层 `overflow: hidden` 会把 flex 子项压缩变形，`max-content` 让内层保持与底层同宽，裁切才精确；交互全部放在底层（覆盖层 `pointer-events: none`），避免两层星星的点击区域错位。

无障碍补充：antd 的 Rate 实现为 `role="radiogroup"` + 每颗星一个隐藏 radio（可聚焦、可 Tab），键盘模型与上面一致；上面的简化版用容器 `tabIndex` + 方向键也能过基本检查（A5 的原则：先保证键盘可达，再谈完美 aria）。

Rate 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 半星边界判定左右颠倒 | 星内 x 坐标没和自身宽度比，误用了容器坐标 | `e.clientX - rect.left < rect.width / 2` |
| 2 | 覆盖层星星被压扁 | `overflow: hidden` 的容器里 flex 子项被压缩 | 内层 `width: max-content` |
| 3 | hover 离开后高亮闪回旧值 | 没区分 hover 预览态与已选态 | 双状态 `shown = hover ?? current` |
| 4 | value=3.5 时第三颗星全灰 | 覆盖层宽度算成 `value/count` 后取整了 | 保留小数百分比，浏览器支持亚像素裁切 |

---

#### ColorPicker：HSV 面板拖拽、渐变背景计算、格式转换

**为什么拾色器都用 HSV。** RGB 是机器视角（三路信号强度），人挑颜色时想的是"什么色相、多鲜艳、多亮"——HSV 正好：H 色相 0–360（色环）、S 饱和度 0–1（离白多远）、V 明度 0–1（离黑多远）。更妙的是它天然映射 2D 拖拽：**SV 面板是一块矩形**（横轴 S、纵轴 V），**H 是一条色带**。antd ColorPicker、Sketch、Figma 全是这个结构。

**① 坐标 → hsv 的换算公式**（面板拖拽的核心，两行）：

```text
s = (pointerX − rect.left) / rect.width        // 横向比例即饱和度
v = 1 − (pointerY − rect.top) / rect.height    // 纵向比例取反即明度（原点在左上）
```

**② 渐变背景计算——为什么两层 linear-gradient 加一个纯色底，就"是"SV 面板。** 标准画法（注意 CSS 多背景**先写的在上层**）：

```text
第 1 层（最上）: linear-gradient(to top, #000, transparent)      ← 黑，自下而上淡出
第 2 层:        linear-gradient(to right, #fff, transparent)    ← 白，自左向右淡出
第 0 层（底色）: hsl(h, 100%, 50%)                               ← 当前色相的纯色
```

这不是"看起来像"的美术技巧，可以逐通道证明它精确等于 hsvToRgb：面板上任意一点 (s, v) 的合成色 = 纯色相先与白按横向比例 s 混合、再与黑按纵向比例 v 相乘。以 h=0（纯红）为例：顶边从左到右是 白→红，即通道值 `1` 与 `1-s`（对照 hsvToRgb(h, s, 1) 的 `r = c + m = s + (1-s) = 1`、`g = b = 1-s`，逐通道相等）；再向下乘 v（黑层 alpha 为 1−v，合成即顶色 × v，对照公式中全部通道同乘 v）。**两张渐变就是 hsvToRgb 公式的"物理实现"**，所以游标取色和背景渲染天然一致、永不分歧。（严格说浏览器在 sRGB 伽马空间做线性混合，与人眼感知曲线略有出入，但这是所有拾色器的标准做法。）

**③ 格式转换（hex/rgb/hsv 互转）**。四个函数覆盖全部六个方向（hex↔hsv 走 rgb 中转）：

```ts
// hex → rgb（处理 #fff 三位缩写与 #ffffff 六位两种形态）
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) throw new Error(`非法 hex: ${hex}`);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// rgb → hex
export function rgbToHex(r: number, g: number, b: number): string {
  const h = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return `#${h.toUpperCase()}`;
}

// rgb → hsv（h 取 0-360，s/v 取 0-1，与面板坐标一致）
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    // 最大通道决定色相所在扇区，其余两通道之差决定扇区内偏移
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: max === 0 ? 0 : d / max, v: max };
}

// hsv → rgb
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s; // 纯色强度
  const hp = ((h % 360) + 360) % 360 / 60; // 六扇区归一
  const x = c * (1 - Math.abs((hp % 2) - 1)); // 扇区内的过渡通道
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
             [c, 0, x];
  const m = v - c; // 明度补偿：整体向黑（v 减小）或向白（s 减小）平移
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
```

**④ 组件实现**（SV 面板 + Hue 条 + hex 回显，pointer capture 拖拽与 Slider 同构）：

```tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const HUE_GRADIENT =
  'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)';

interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export function ColorPicker({
  value,
  defaultValue = { h: 212, s: 0.9, v: 1 },
  onChange,
}: {
  value?: HSV; // 受控（A1）
  defaultValue?: HSV;
  onChange?: (c: HSV) => void;
}) {
  const [inner, setInner] = useState<HSV>(defaultValue);
  const current = value ?? inner;
  const set = (next: HSV) => {
    setInner(next);
    onChange?.(next);
  };

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const drag = useRef<'sv' | 'hue' | null>(null);

  const applyFromSv = (e: ReactPointerEvent) => {
    const rect = svRef.current!.getBoundingClientRect();
    // 坐标 → hsv：横向比例 = s；纵向比例取反 = v
    const s = clamp01((e.clientX - rect.left) / rect.width);
    const v = 1 - clamp01((e.clientY - rect.top) / rect.height);
    set({ ...current, s, v });
  };
  const applyFromHue = (e: ReactPointerEvent) => {
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp01((e.clientX - rect.left) / rect.width) * 360;
    set({ ...current, h });
  };

  const rgb = hsvToRgb(current.h, current.s, current.v);

  return (
    <div style={{ width: 240, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      {/* SV 面板：底色纯 hue + 白/黑两层渐变（见上文公式推导） */}
      <div
        ref={svRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = 'sv';
          applyFromSv(e);
        }}
        onPointerMove={(e) => drag.current === 'sv' && applyFromSv(e)}
        onPointerUp={() => (drag.current = null)}
        style={{
          position: 'relative',
          height: 160,
          borderRadius: 4,
          cursor: 'crosshair',
          touchAction: 'none',
          backgroundColor: `hsl(${current.h}, 100%, 50%)`, // 第 0 层：纯色相
          backgroundImage: [
            'linear-gradient(to top, #000, rgba(0,0,0,0))', // 第 1 层（最上）：黑
            'linear-gradient(to right, #fff, rgba(255,255,255,0))', // 第 2 层：白
          ].join(', '),
        }}
      >
        {/* 游标：位置 = 坐标换算的逆运算 */}
        <div
          style={{
            position: 'absolute',
            left: `${current.s * 100}%`,
            top: `${(1 - current.v) * 100}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue 条：一维渐变，横向即 h */}
      <div
        ref={hueRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = 'hue';
          applyFromHue(e);
        }}
        onPointerMove={(e) => drag.current === 'hue' && applyFromHue(e)}
        onPointerUp={() => (drag.current = null)}
        style={{
          position: 'relative',
          height: 12,
          marginTop: 12,
          borderRadius: 6,
          background: HUE_GRADIENT,
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${(current.h / 360) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            background: `hsl(${current.h}, 100%, 50%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 回显：hsv → rgb → hex 一路转换 */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            border: '1px solid #e5e7eb',
          }}
        />
        <code>{rgbToHex(rgb.r, rgb.g, rgb.b)}</code>
        <code style={{ color: '#6b7280' }}>
          rgb({rgb.r}, {rgb.g}, {rgb.b})
        </code>
      </div>
    </div>
  );
}
```

ColorPicker 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 拖到面板左上角不是纯白 | 渐变层顺序错了（白层盖在黑层上） | CSS 多背景先写的在上：黑层写前、白层写后 |
| 2 | 拖到面板底部反而变亮 | 纵轴忘了取反（原点在左上角） | `v = 1 − y比例` |
| 3 | 游标位置与颜色对不上 | 游标 left/top 没做坐标换算的逆运算（s→left、1−v→top） | 见代码游标两处 |
| 4 | h=360 或负数时色相跳变 | 没做模运算 | `((h % 360) + 360) % 360` |
| 5 | `#fff` 三位 hex 解析出 NaN | 只按六位解析 | 见 hexToRgb 的补全逻辑 |

---

### 水印 Watermark（★★☆，攻防趣味题）

> 本节骨架（原大纲）：
> - canvas 生成平铺、MutationObserver 防 DOM 删改（antd 源码的攻防博弈，值得一看）

水印是全场最有"攻防趣味"的组件：实现只有两步（canvas 画瓦片、平铺当背景），难的是**防守**——水印本质是一个 DOM 节点，任何用户打开 DevTools 都能删它、改它的 style。antd 源码里就有一段用 MutationObserver 做的"你删我挂、你改我还原"的博弈，值得逐行看。

**第一步：canvas 生成平铺水印。** 思路是画**一块**带留白的"单元瓦片"，导出 dataURL 后交给 CSS `background-repeat: repeat` 无限平铺——而不是用 JS 算坐标画 N 个文字（resize 还得重算，又贵又脆）。注意三个细节：按 `devicePixelRatio` 放大画布防高分屏发糊；先 `translate` 到瓦片中心再 `rotate`，让文字绕自身中心倾斜；瓦片尺寸 = 文字尺寸 + gap，gap 就是"水印密度"旋钮。

**第二步：MutationObserver 攻防。** 观察两组目标：父容器（childList，防"水印节点被删除"）和水印节点自身（attributes，防"被改 opacity/display/背景"）。关键技巧是**还原前先 `disconnect`、还原后重新 `observe`**——否则"我把 style 改回去"这个动作本身又是一条 mutation，观察者自己触发自己，进入死循环。

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

export function Watermark({
  content = '内部资料 · 禁止外传',
  children,
  font = '16px sans-serif',
  color = 'rgba(0, 0, 0, 0.15)',
  rotate = -22,
  gap = [100, 100],
  zIndex = 9,
}: {
  content?: string;
  children?: ReactNode;
  font?: string;
  color?: string;
  rotate?: number;
  gap?: [number, number];
  zIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const gapKey = `${gap[0]}-${gap[1]}`; // 数组 props 转字符串做依赖，避免每次渲染都重绘

  useEffect(() => {
    const container = containerRef.current!;
    const watermark = watermarkRef.current!;
    let backupStyle = ''; // 备份完整 style 串，被篡改时一把还原

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.removedNodes) {
            if (node === watermark) {
              // 防删除：水印被移出 DOM → 重新挂回（重挂会触发一次 childList 变更，
              // 但 observe 已在 draw 里重开，重新挂载这个动作本身被自己观察到也没关系：不是删除）
              container.appendChild(watermark);
              return;
            }
          }
        }
        if (record.type === 'attributes' && record.target === watermark) {
          // 防篡改：opacity/display/backgroundImage 被改 → 还原备份的完整 style
          draw();
          return;
        }
      }
    });

    function draw() {
      // ① 画一块"单元瓦片"：一条倾斜文字 + 四周留白
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = font;
      const textWidth = ctx.measureText(content).width;
      const textHeight = Number.parseInt(font, 10) * 1.4; // 近似行高

      const tileW = gap[0] + textWidth;
      const tileH = gap[1] + textHeight;
      canvas.width = tileW * ratio; // dpr 放大：高分屏不发糊
      canvas.height = tileH * ratio;
      ctx.scale(ratio, ratio);
      ctx.translate(tileW / 2, tileH / 2); // 原点移到瓦片中心，旋转绕文字自身
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(content, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      // ② 平铺：绝对定位 + repeat 背景盖在内容上
      backupStyle = [
        'position: absolute',
        'inset: 0',
        'pointer-events: none', // 不挡业务点击
        `z-index: ${zIndex}`,
        `background-image: url(${dataUrl})`,
        'background-repeat: repeat',
      ].join('; ');

      // ③ 攻防纪律：先停观察 → 改 DOM → 再重开，防止"我还原的动作又触发我"死循环
      observer.disconnect();
      watermark.setAttribute('style', backupStyle);
      observer.observe(container, { childList: true }); // 防删除：盯父容器
      observer.observe(watermark, {
        attributes: true,
        attributeFilter: ['style', 'class'], // 防篡改：盯自己
      });
    }

    draw();
    return () => observer.disconnect();
  }, [content, font, color, rotate, gapKey, zIndex]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {children}
      <div
        ref={watermarkRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex }}
      />
    </div>
  );
}
```

**攻防推演**——把浏览器当棋盘走几个回合：

- 回合 1（攻）：F12 → Elements → 选中水印 div → 按 Delete。**防**：父容器 childList 变更，观察者把节点重新 append 回去。攻击成本：一次按键，被自动化解。
- 回合 2（攻）：不删节点，改 `style="opacity: 0"` 或直接清空 `background-image`。**防**：attributes 监听命中，`draw()` 用备份的完整 style 串整体还原。
- 回合 3（攻）：先在 Console 执行 `MutationObserver.prototype.observe = () => {}`，再删节点。**破防**——原型被拔，观察者全部失明。（浏览器扩展、油猴脚本甚至能在页面脚本执行前注入。）
- 回合 4（攻）：DevTools → Sources → "Deactivate breakpoints" 旁的 **Disable JavaScript**，然后删节点。**破防**——一切 JS 防御的根都被拔了。
- 回合 5（攻，降维）：根本不碰 DOM——截图后用修图工具的"智能消除"抹掉水印，或直接手机翻拍屏幕。**任何 DOM 层防御对此天然无效。**

**为什么前端水印只能防君子**：防御代码与攻击代码运行在**同一台机器、同一个 JS 执行环境**里，且攻击者拥有最终执行权（随时可以禁用你的一切脚本）。这和"前端加密保存密钥不可信"是同一条原理——交付到客户端的代码，客户端永远可以不执行。所以前端水印的真实定位是：**把攻击成本从"一键删除"抬高到"需要懂 DevTools 甚至写脚本"**，拦截随手复制；真要威慑泄露，必须换赛道：

1. **服务端渲染水印**：图片出管时叠加、文档导出 PDF 时盖章、视频转码打标——攻击者拿到的每一份产出都天然带水印，DOM 攻防战根本不发生。
2. **动态内容溯源**：水印文案绑定用户 ID/姓名/时间（甚至做成肉眼难辨的低对比度），即使被截图也能定位泄露者。
3. **频域盲水印**（进阶）：把标识嵌入图像频域系数，肉眼不可见、缩放裁剪压缩后仍可检测——用信号处理对抗像素级攻击。

Watermark 常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 高分屏上水印发虚 | canvas 按 CSS 像素画，被拉伸 | 画布尺寸 × devicePixelRatio 再 `ctx.scale` |
| 2 | 水印盖住了按钮点不了 | 忘了 `pointer-events: none` | 水印层加 `pointer-events: none` |
| 3 | 观察者回调无限触发/页面卡死 | 还原 style 的动作又被自己观察到，自激励死循环 | 还原前 `disconnect`，还原后重新 `observe`（antd 同款思路） |
| 4 | 内容区滚动后水印跟着滚走 | 水印放在滚动容器内且非 fixed | 水印层盖在滚动容器的包裹层上（absolute + inset: 0 于外层） |
| 5 | 文字长的水印相邻两行打架 | 瓦片 gap 按短文字估算 | tile 尺寸 = measureText 实测宽 + gap，别写死 |

### VirtualList / Anchor / Progress 等（★★☆）

> 本节骨架（原大纲）：
> - VirtualList：**向上 prepend 时 scrollTop 修正**（IM 向上加载不跳动的关键，接 IM 场景）
> - Anchor：scrollspy（IntersectionObserver）+ 高亮同步
> - Progress：环形 svg `stroke-dashoffset`

这三个组件星数不高，但 VirtualList 的"向上加载修正"是**面试区分度极高**的一题——90% 的人写过"向下加载更多"，很少有人讲清"为什么向上加载会跳"。本节用整幅推导把它讲透。

---

#### VirtualList：向上 prepend 时 scrollTop 修正

**先补地基：定高虚拟滚动的三行数学。** 滚动容器里只渲染"视口 ± overscan"覆盖到的条目，用一个撑高 div 让滚动条长度反映全量：

```text
start = floor(scrollTop / itemHeight) − overscan
end   = ceil((scrollTop + viewportHeight) / itemHeight) + overscan
偏移   = translateY(start × itemHeight)
```

**正题：为什么向上加载会跳。** IM 场景的交互是：滚到顶部 → 拉取更早的历史消息 → **prepend 到列表头部**。问题在 prepend 的一瞬间爆发。看 prepend 前后的内容布局对照（设定：视口高 300px、每条消息定高 40px、用户正读到"消息 40"）：

```text
【prepend 之前】  容器 scrollTop = 200，总高 scrollHeight = 5000

offsetTop  ┌────────── 视口（300px）──────────┐
   200     │ 消息 40  ← 用户正在读这条（视口顶）│
   240     │ 消息 41                            │
   280     │ 消息 42                            │
           └───────────────────────────────────┘
           …（下方还有 4000+ px 内容）

【prepend 之后：顶部插入 20 条 × 40px = 800px，DOM 已提交、未修正】

           ┌────────── 视口（300px）──────────┐
   200     │ 新消息 5  ← 同一像素位置，内容换人了│
   240     │ 新消息 6                           │
   280     │ 新消息 7                           │
           └───────────────────────────────────┘
   1000    ↙ "消息 40" 被 prepend 顶下去，offsetTop = 200 + 800 = 1000
           总高 scrollHeight = 5800
```

**推导跳动的本质。** 浏览器在内容变化时保持的是 **scrollTop 数值**（200 还是 200）；而用户视觉锚定的是 **content**（"我正在读的那条消息"）。prepend 把 800px 塞进了视口上方，"offsetTop ↔ content"的映射整体平移——于是**同一 scrollTop 数值对应的像素位置上，放着的内容变了**（从"消息 40"变成"新消息 5"）。用户的感觉是屏幕猛地向下一窜 800px，其实是他锚定的那条消息被顶下去了。对比一下**向下 append 为什么天然不跳**：新内容加在滚动区末尾，既有内容的 offsetTop 一个都没动，"scrollTop ↔ content"映射不变——这就是为什么只有向上加载需要修正。

**修正公式。** 想让"消息 40"仍然出现在视口顶部，就要把它的 offsetTop 搬回 200，等价于把 scrollTop 补上被塞进来的增量：

```text
newScrollTop = oldScrollTop + (prepend 后 scrollHeight − prepend 前 scrollHeight)
             = 200 + (5800 − 5000)
             = 1000
```

动态高度列表（IM 消息有图有文，高度不一）无法事先算出 ΔH，最稳的做法就是**用 scrollHeight 差值实测**：prepend 前快照一次总高，DOM 提交后再量一次，差多少补多少。

**时序是第二个关键：必须 `useLayoutEffect`。** 修正要发生在"DOM 已提交、浏览器尚未绘制"的窗口里。`useEffect` 在绘制之后才执行，用户会看到一帧"窜上去又跳回来"的闪烁；`useLayoutEffect` 在 paint 前同步跑，跳变永远不会被画出来。React 18/19 并发渲染下这个保证依然成立。

完整实现（虚拟列表 + 触顶加载 + 修正三合一）：

```tsx
import { useCallback, useLayoutEffect, useRef, useState, type UIEvent } from 'react';

interface Message {
  id: string;
  text: string;
}

const ITEM_H = 40;   // 定高消息（动态高度的修法相同：仍用 scrollHeight 差值实测）
const VIEW_H = 300;
const OVERSCAN = 5;

// 模拟服务端按游标分页拉更早消息
async function fetchOlder(beforeId: string): Promise<Message[]> {
  const n = Number(beforeId.split('-')[1]);
  return Array.from({ length: 20 }, (_, i) => ({
    id: `m-${n - 20 + i}`,
    text: `历史消息 ${n - 20 + i}`,
  }));
}

export function IMList({ initial }: { initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef(0);   // prepend 前的 scrollHeight 快照
  const loadingRef = useRef(false);  // 防重复触发

  const loadOlder = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const older = await fetchOlder(messages[0].id);
    // ① 快照：在 setState 之前记录 prepend 前的总高
    prevHeightRef.current = containerRef.current!.scrollHeight;
    // ② prepend：不可变更新，旧数组原样排后
    setMessages((list) => [...older, ...list]);
    loadingRef.current = false;
  }, [messages]);

  // ③ 修正：DOM 提交后、浏览器绘制前执行（useLayoutEffect 是跳动与否的分水岭）
  useLayoutEffect(() => {
    if (prevHeightRef.current === 0) return;
    const el = containerRef.current!;
    el.scrollTop += el.scrollHeight - prevHeightRef.current; // 公式落地：补上 ΔH
    prevHeightRef.current = 0;
  }, [messages]);

  // 虚拟窗口计算
  const start = Math.max(0, Math.floor(scrollTop / ITEM_H) - OVERSCAN);
  const end = Math.min(messages.length, Math.ceil((scrollTop + VIEW_H) / ITEM_H) + OVERSCAN);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (el.scrollTop < ITEM_H * 2) loadOlder(); // 接近触顶就预拉历史
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: VIEW_H, overflowY: 'auto', border: '1px solid #e5e7eb' }}
    >
      {/* 撑高条：滚动条长度反映全量消息 */}
      <div style={{ height: messages.length * ITEM_H, position: 'relative' }}>
        {/* 只渲染窗口内条目，translateY 对齐到真实位置 */}
        <div style={{ transform: `translateY(${start * ITEM_H}px)` }}>
          {messages.slice(start, end).map((m) => (
            <div key={m.id} style={{ height: ITEM_H, lineHeight: `${ITEM_H}px` }}>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

读一遍闭环：触顶 → `loadOlder` 快照 → prepend 提交 → `useLayoutEffect` 在绘制前把 ΔH 补进 scrollTop → 用户正在读的那条消息在屏幕上纹丝不动，只是滚动条变长、顶部多了可拉的历史。这就是 IM 向上加载不跳动的全部秘密（接 IM 场景）。

**与浏览器原生 scroll anchoring 的取舍。** CSS `overflow-anchor: auto`（默认值）让浏览器自动做同一件事：内容变化时自选视口内一个"锚点节点"，调整 scrollTop 保持它不动。两条路线怎么选：

| 方案 | 优点 | 局限 |
|---|---|---|
| `overflow-anchor`（原生） | 零代码，浏览器级性能 | 锚点节点由启发式选择、**不可指定**；虚拟列表动态装卸节点会让锚点失效；与手动设 scrollTop 的逻辑互相打架时难调试 |
| 手动 scrollTop 修正 | 锚定对象完全可控（精确到"那条消息"）、可测试、可扩展（如"跳到某条消息并居中"） | 要自己管时序（useLayoutEffect）与快照 |

结论：纯内容流的"向上加载不跳"可以吃原生红利；**IM 和虚拟列表必须精确锚定到某条数据**，手动修正是工业界唯一可靠方案（antd List/虚拟滚动、主流 IM Web 端同思路）。

VirtualList 常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 向上加载闪一帧再跳回 | 修正写在 `useEffect`（绘制后才跑） | 挪进 `useLayoutEffect` |
| 2 | 修正量总是 0 | 快照时机在 setState 之后（已经 prepend 完了才量） | 快照必须在 setState 前 |
| 3 | 动态高度列表修正不准 | 用"条数 × 估算高"算 ΔH，与真实渲染高度不符 | 放弃估算，用 `scrollHeight` 差值实测 |
| 4 | 快速滚顶重复拉同一页 | 没有加载中互斥 | `loadingRef` 或请求去重 |
| 5 | 虚拟列表快速滚动白屏 | overscan 太小 / 撑高条高度算错 | 加大 overscan，核对 `items.length × itemHeight` |

---

#### Anchor：scrollspy（IntersectionObserver）+ 高亮同步

页面内导航的经典双问题：**滚动时高亮要跟着内容走（scrollspy）**，**点击导航要平滑滚到对应区块**——两个方向互相打架。

**scrollspy 用 IntersectionObserver 而不是 scroll 监听。** scroll 事件每帧触发、要手动 rAF 节流、还得逐个 `getBoundingClientRect` 量位置；IO 把"哪个区块可见"的判定交给浏览器合成线程，回调只在交叉状态变化时触发。**调参的钥匙是 `rootMargin`**：它按 CSS margin 语法（px/百分比，百分比按 root 尺寸解析）扩张（正值）/收缩（负值）root 的判定矩形。scrollspy 的惯用手法是把底边大幅上收（如 `-90%`），把判定矩形压成**视口顶部的一条带**——标题滚进这条带才算"正在读"，符合直觉：

```tsx
import { useEffect, useRef, useState } from 'react';

export function Anchor({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const lockRef = useRef(false); // 点击导航引发的平滑滚动期间，锁住 IO 高亮

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return; // 滚动动画进行中：不抢高亮
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      {
        // 底边上收 90%：判定矩形只剩视口顶部 10% 的一条带
        // 标题进入这条带才激活——太小高亮滞后，太大提前亮，按标题间距调
        rootMargin: '0px 0px -90% 0px',
        threshold: 0,
      },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  // 双向之一：点击驱动。立即高亮 + 平滑滚动 + 期间上锁
  const jump = (id: string) => {
    setActive(id);
    lockRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // scrollIntoView 的动画时长拿不到，用一段保守时长近似锁定
    window.setTimeout(() => (lockRef.current = false), 400);
  };

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sections.map(({ id, title }) => (
        <a
          key={id}
          href={`#${id}`}
          style={{
            color: active === id ? '#1677ff' : 'inherit',
            fontWeight: active === id ? 700 : 400,
          }}
          onClick={(e) => {
            e.preventDefault(); // 不用锚点默认跳转：瞬移 + 产生历史记录
            jump(id);
          }}
        >
          {title}
        </a>
      ))}
    </nav>
  );
}
```

**双向同步的冲突与解法**：点击导航后 `scrollIntoView({ behavior: 'smooth' })` 会**依次穿过**中间区块，IO 会一路高亮过去，视觉上高亮来回抖。解法就是代码里的 `lockRef`：点击后的滚动动画期间忽略 IO 更新，抵达后再交还控制权（滚动方向二：用户手动滚 → IO 正常驱动高亮）。这与上文 Carousel"拖拽期间停自动播放"是同一类互斥问题——**两个驱动源操作同一状态时，必须显式仲裁**。

Anchor 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 点击后高亮在中间标题上乱跳 | 平滑滚动穿过中间区块，IO 逐个触发 | 点击期间加锁（lockRef） |
| 2 | 高亮总是"滞后一屏" | rootMargin 没收缩，区块在视口任意位置就算激活 | `-90%` 底边上收成顶部判定带 |
| 3 | 最后一个短区块永远点不亮 | 区块太短，滚到底也进不了判定带 | 内容区底部补白（min-height），或对最后一个区块特殊处理 |
| 4 | 点击后浏览器地址栏多了 #hash、回退异常 | 用了原生锚点跳转 | `preventDefault` + `scrollIntoView` |

---

#### Progress：环形 svg stroke-dashoffset

环形进度不画弧线路径，而是**画一个完整的圆，用虚线偏移"挖掉"没走完的部分**。推导三步：

```text
① 半径：r = (size − strokeWidth) / 2        ← 直径要给描边厚度留出两侧空间
② 周长：C = 2πr                              ← 这就是 dasharray 的基准
③ 偏移：dashoffset = C × (1 − percent/100)   ← 百分比 → 弧长的一元一次换算
```

原理：`strokeDasharray = C` 定义了"描 C 长、空 C 长"的循环节（一整圈恰好一个节）；`strokeDashoffset` 把这个图案沿路径起点回退。于是**可见实线弧长 = C − offset**：进度 100% 时 offset = 0（整圈实线）；进度 0% 时 offset = C（整圈空白）；任意 p% ⇒ 可见弧长 C×p%。再补一个细节：SVG 圆的起点在 3 点钟方向，`rotate(-90)` 把起点搬到 12 点。

```tsx
export function CircleProgress({
  percent,
  size = 120,
  strokeWidth = 8,
  color = '#1677ff',
  trackColor = '#e5e7eb',
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const r = (size - strokeWidth) / 2; // ① 半径：扣除两侧描边厚度
  const C = 2 * Math.PI * r; // ② 周长：dasharray 基准
  const p = Math.min(100, Math.max(0, percent));
  const offset = C * (1 - p / 100); // ③ 百分比 → 偏移量

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 起点默认在 3 点钟方向，旋转 -90° 搬到 12 点 */}
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* 轨道圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆：dasharray=C 一个循环节；dashoffset 挖掉未完成部分 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round" // 圆头：注意两端各多出 strokeWidth/2 的视觉长度
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }} // 数值变化即平滑动画
        />
      </g>
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size / 5}
        fill="#374151"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}
```

这个"周长 + 偏移"模型是**所有 svg 描边动画的通用底座**：进度环、评分环、路径描边生长动画（把 dasharray 换成路径长度）全是同一招，值得一次学透。

Progress 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 进度环溢出 svg 边界 | r 没扣描边厚度（stroke 沿路径两侧各画一半） | `r = (size − strokeWidth) / 2` |
| 2 | 环形起点在右侧 3 点钟 | SVG 圆的天然起点 | `rotate(-90)` |
| 3 | 0% 时仍有一小段弧 | `strokeLinecap: round` 的圆帽在 offset=C 时仍画一个点 | 起点处 p===0 时不渲染进度圆，或接受圆点 |
| 4 | 进度条不动画 | 每次重渲染重建了 circle（key 变化） | 稳定 key，让 transition 生效于属性变化 |

---

### ConfigProvider / App（模式级）

> 本节骨架（原大纲）：
> - 全局上下文根：主题 token、国际化、弹层挂载容器
> - `<App>` 解决命令式组件的 context 隔离（接 Lv2 Modal）

这两个"组件"不考交互，考**架构**：当一个库被几百个页面引用时，全局约定（主题、语言、弹层挂哪）必须有一个统一的注入口，而命令式 API 又天然游离在 React 树外——ConfigProvider 和 App 分别回应这两个问题。

**ConfigProvider：全局上下文根的职责。** 它是整棵应用树包裹层的"配置根"，三大职责：

1. **主题 token**：`theme.token` 覆盖种子变量（`colorPrimary`、`borderRadius`…），组件的所有派生色（hover、active、disabled、边框、背景）由 token 体系按算法推出——你只改一个主色，整库换肤。`theme.algorithm` 一键切换 `theme.darkAlgorithm` / `theme.compactAlgorithm`，暗色不是"另一套色值"，而是同一批种子的另一套派生公式。
2. **国际化 locale**：DatePicker 的月份名、Modal 的确定/取消文案、分页器语言，全部由 `locale` 注入（如 `zhCN` / `enUS`），组件内部零硬编码文案。
3. **弹层挂载容器 getPopupContainer**：所有 Portal 弹层（Select 下拉、DatePicker 面板、Tooltip）挂到哪，见下。

```tsx
import { App, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export function Root() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: '#00b96b', borderRadius: 4 }, // 种子 token：派生全部组件色
        algorithm: theme.darkAlgorithm, // 暗色：同一批种子的另一套派生算法
      }}
      getPopupContainer={(triggerNode) => triggerNode.parentElement!} // 弹层挂到触发器父级
    >
      <App>
        <YourPages />
      </App>
    </ConfigProvider>
  );
}
```

**getPopupContainer 的意义与坑。** 默认弹层 Portal 到 `document.body`，理由充分：逃离祖先的 `overflow: hidden/auto` 裁剪、逃离 `transform` 祖先（transform 会把后代的 `position: fixed` 降级成相对自己定位，fixed 弹层直接错位）、逃离父级 z-index 层叠上下文。但在**内滚容器**场景（表格内、抽屉内、侧栏里）默认行为会翻车：弹层挂在 body 不随容器滚动，Select 下拉会脱离触发器漂移。于是把 `getPopupContainer` 指到滚动的祖先——代价接踵而至：

- 容器有 `overflow: hidden` 时弹层被裁掉（症状：下拉闪一下就消失）；
- 挂进容器后弹层从 body 直系变成容器内节点，要重新面对层叠上下文与裁剪问题；
- 弹层尺寸超出容器时同样被裁。

工程结论：**能挂 body 就挂 body**（配合 floating-ui 的滚动重定位，见 A2），只有明确需要"弹层随容器滚"时才改容器，且容器必须允许溢出可见或预留空间。

**`<App>` 解决命令式组件的 context 隔离（接 Lv2 Modal）。** Lv2 讲过 `Modal.confirm()` 命令式 API 的原理：内部 `createRoot` 在 body 下动态建一个**独立的 React 根**渲染确认框。问题就出在"独立"二字——context 沿 React 树流动，独立根不在 ConfigProvider 子树里：

```text
【静态方法的 context 断裂】

React 主根
└── ConfigProvider（theme/locale 的 Provider 都在这里）
    └── 业务树
        └── 按钮 onClick: Modal.confirm(...) ──createRoot──► 独立 React 根（body 下新节点）
                                                          ✗ 不在上面这棵树里
                                                          ✗ 读不到 theme/locale → 默认蓝、默认文案

【<App> 的机制：把动态挂载点收回 React 树内】

React 主根
└── ConfigProvider
    └── <App>（内部渲染一个专用挂载点 div）
        ├── 业务树
        └── 挂载点 div ──► App.useApp() 拿到的 modal/message/notification 实例都渲染在这里
                            ✓ 与业务树同根 → theme/locale 的 context 正常流动
```

也就是说 `<App>` 不是一个样式容器，而是一个**收容所**：它把命令式组件的渲染目的地从"body 下的野生根"改成"App 内部的挂载点"，让动态弹出的 Modal/Message 天然成为 ConfigProvider 的后代。用法上是两个动作：根部包 `<App>`，业务里用 `App.useApp()` 取实例代替静态方法：

```tsx
import { App } from 'antd';

function Page() {
  // hooks 化实例：渲染进 <App> 的挂载点，主题、国际化、dark 算法全部生效
  const { modal, message, notification } = App.useApp();

  const onDelete = async () => {
    const confirmed = await modal.confirm({
      title: '删除该记录？',            // 这里的按钮文案/配色吃得到 ConfigProvider 的 locale/theme
      content: '删除后不可恢复',
    });
    if (confirmed) {
      await apiDelete();
      message.success('已删除');
    }
  };
  return <button onClick={onDelete}>删除</button>;
}
```

顺带记住连带关系：`message.success()`、`notification.open()` 这些静态方法有同样的 context 断裂（这也是 Lv2 Toast 一节 hooks 化 API 的由来），`App.useApp()` 一次性给齐三个正确姿势的实例。原理层面这是"命令式 vs 声明式"张力的标准解法之一：**命令式 API 想吃 context，就必须在树内留一个可寻址的挂载点**——你以后设计任何"xx.confirm()"式 API 都会再遇到它。

本节常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | `Modal.confirm` 弹出的还是默认蓝、英文按钮 | 静态方法渲染在独立根，读不到 ConfigProvider | 根部包 `<App>` + `App.useApp()` |
| 2 | 改了 getPopupContainer 后下拉被裁剪 | 容器 overflow hidden/auto 裁掉了 Portal 弹层 | 容器放行溢出，或退回 body + 滚动重定位 |
| 3 | 弹层 position: fixed 却相对某祖先定位 | 祖先有 transform，fixed 被降级 | 弹层 Portal 到 body；或该祖先去 transform |
| 4 | App.useApp() 返回 undefined | 该组件不在 `<App>` 子树里 | 检查根部是否真的包了 `<App>` |

---

## Lv4 范式之争（组件之上的认知）

前面 Lv1–Lv3 练的是"怎么写组件"，Lv4 回答"**写完之后放在哪、给谁用**"。同一个 Dialog，可以做成带完整样式的成品（antd）、只带行为不带样式的半成品（Radix）、或者干脆变成你仓库里的一段源码（shadcn）——三条路线是对"组件库到底交付什么"的三种回答。

| 路线 | 代表 | 思想 |
|---|---|---|
| 全家桶（带样式） | antd / arco / semi | 开箱即用，主题 token 化 |
| **Headless（无样式）** | **Radix UI（交互圣经）**、HeadlessUI、Base UI | 只做行为/无障碍，样式全给消费者 |
| 复制粘贴式 | shadcn/ui | 源码进你的仓库，cva 管理变体，彻底可控 |

逐行展开。

**第一行：全家桶（带样式）—— antd / arco / semi：「开箱即用，主题 token 化」。** 交付的是**成品**：装上就能用，视觉统一、交互统一、连 Table/Form/DatePicker 这种成本极高的组件也白拿。它真正的工作量在"主题 token 化"：上一节看过，一个 `colorPrimary` 种子进 ConfigProvider，全库几百个组件的 hover/active/disabled/边框/背景色由派生算法自动算出，暗色/紧凑模式只是换一个 algorithm。开箱即用的代价同样明确：**定制的天花板**——改结构（往 DatePicker 面板里塞自定义区域）、改行为（Table 排序逻辑长在自己的数据流里）都要绕着它的受控协议走，深度定制往往以 fork 告终；再就是包体积与升级耦合（大版本 breaking 靠 codemod 迁移）。适合：中后台、交付节奏快、视觉要求"统一体面"而非"独一无二"。

**第二行：Headless（无样式）—— Radix UI（交互圣经）、HeadlessUI、Base UI：「只做行为/无障碍，样式全给消费者」。** 交付的是**行为与无障碍**：状态机、键盘模型、焦点管理、ARIA、Portal、退出动画时机——一个 className 都不掺和。Radix 被称为"交互圣经"不是客套：它把 WAI-ARIA Authoring Practices（A5 说的圣经）逐组件**工程化翻译**了一遍——Dialog 的焦点陷阱与焦点还回、Tabs 的 roving tabindex、Select 的 typeahead、受控/非受控双模式（A1）、SSR 安全的 id——每一样都是你 Part A 苦练的内功的标准答案，而且每个组件只有几百行，是最易吸收的源码读物（本大纲"源码阅读优先级"第一条）。看它交付一个 Dialog 的形态：

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function HeadlessDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="你的样式">打开</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-medium">标题</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-500">
            焦点陷阱、Esc 关闭、滚动锁、aria 属性、退出动画挂载时机——Radix 全包，
            样式一行不插手。
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className="mt-4">关闭</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

这条线的两个兄弟定位不同：**HeadlessUI** 是 Tailwind 团队出品，组件少而精（Listbox、Combobox、Menu、Dialog、Tabs 等），与 Tailwind 生态无缝，特点是简单克制、附 Transition 助手；**Base UI** 是 MUI 团队联合 Radix 与 Floating UI 的核心维护者打造的新一代 headless 库（2025 年已发布 1.0 稳定版，首发 35 个组件，包名 `@base-ui-components/react`），定位是 Radix 思路的现代化继任者：组件与 hooks 双形态输出、动画/过渡一等公民、体积更收敛。三者的共同哲学不变：**样式权完全交给消费者，行为与无障碍做到满分**。适合：有自己的设计系统、视觉必须独此一家、团队养得起样式层。

**第三行：复制粘贴式 —— shadcn/ui：「源码进你的仓库，cva 管理变体，彻底可控」。** 交付的是**起点而非依赖**：CLI（`npx shadcn@latest add dialog`）把组件源码复制进你的 `components/ui/` 目录，从那一刻起它是**你的代码**——没有 node_modules 里的黑盒，没有"想改一行只能 fork"的天花板。底下两层技术支撑：行为层直接复用 Radix（shadcn 的 Dialog 就是上文那段 Radix 包了 Tailwind 皮），变体层用 cva 管理（下节展开）。它的"升级策略"也自成一派：组件库语义化版本保护不了你改过的源码，shadcn 的答案是**版本化脚手架**——升级时 CLI 重新拉取新源码与你本地版本做 diff，由你逐块决定采纳与否；换句话说它放弃了"无痛升级"，换来了"任何改动都合法"。代价：初始要接受一整套 Tailwind + 目录约定，组件质量由你自己的仓库负责。适合：独立产品、创业团队、任何"设计终会长出自己的样子"的项目。

**cva（class-variance-authority）：变体的类型安全管理**（本大纲 Lv4 原始要点）。当样式变成"variant × size × 状态"的组合表，手拼 className 字符串很快失控：拼错没人报错、重复类互相覆盖。cva 把变体表声明成数据，类型系统自动接管。完整示例（shadcn 同款结构，cva + tailwind-merge 集成）：

```bash
npm i class-variance-authority clsx tailwind-merge
```

```tsx
// components/ui/button.tsx —— cva 变体定义 + cn 工具 + 类型安全的 Button
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';

// cn：先 clsx 做条件拼接，再 twMerge 让冲突的 Tailwind 类"后者胜"
// （业务传 className 覆盖组件默认类就是这么实现的）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// cva(基础类, { variants, defaultVariants })：变体即数据
const buttonVariants = cva(
  // base：所有变体共享的底座
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// 类型安全的关键一招：VariantProps 从 cva 定义"反查"出 variant/size 的字面量联合类型
// 于是 <Button variant="destuctive">（拼错）直接编译报错，而不是静默无样式
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)} // 调用方 className 最后合并 → 可覆盖
      {...rest}
    />
  );
}
```

cva 的机制两句话：`cva()` 返回一个**类名生成函数**（`buttonVariants({ variant, size })` → 拼好的字符串）；`VariantProps<typeof buttonVariants>` 用 TypeScript 的类型推导**从值反推出类型**——变体表既是运行时数据又是编译时类型源，一处定义、两处消费，永不漂移。`tailwind-merge` 解决 Tailwind 的类冲突语义：`px-4 px-8` 保留后者、`p-4 px-3` 收敛为后者补集、任意值 `w-[20px]` 也能识别；若你用了插件生成的自定义工具类（如 typography 的 `prose`），默认字典不认识，需用 `extendTailwindMerge` 注册。这也是 `cn()` 里 `className` 必须放最后的原因：调用方永远赢。

**建议：行为学 Radix，工程学 antd，形态学 shadcn**——论证展开。这句话不是三选一，是**三个学习方向的分工**：

- **行为学 Radix**：学"交互应该长什么样"。读 Radix 源码等于读 APG 的工程化标准答案——每种组件的键盘模型、焦点纪律、aria 结构、受控协议都摆在你面前，几百行一个，吸收成本最低。学完它，你自己写任何交互组件都有一把尺子。
- **工程学 antd**：学"一个库如何被几千个团队用十年"。token 派生体系、ConfigProvider 的全局注入口（上一节）、monorepo 分包、changesets 与 codemod 的版本纪律、双 React 版本测试矩阵（Part C 的全部话题）、以及 Wave 波纹、两字中文加空格、滚动锁宽度补偿这类真实边界 bug 的沉淀——这些是 Radix（刻意做小）永远不会教你的。
- **形态学 shadcn**：学"现代组件库的组装形态"。compound 组件 + cva 变体 + Tailwind token + cn 覆盖链，这套"形态"已经成为新组件库的事实模板——哪怕你用 antd 做业务，内部二方库长什么样也大概率向它看齐。

三线合一的真实项目形态也很常见：中后台用 antd 抢交付、设计系统层用 Radix 自建、内部工具用 shadcn 快速起盘——按团队所处阶段取用，而不是站队。

Lv4 选型常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | Headless 组件"丑到不能用"就放弃 | 拿成品库的预期去用无样式库 | Radix 是给有设计系统/愿意写样式团队的，先备好 Tailwind 或样式层 |
| 2 | shadcn 组件升级后自己改的逻辑丢了 | 复制粘贴式放弃 semver 保护，盲目覆盖 | 用 CLI 的 diff 升级，逐块审阅；自己的扩展放 wrapper 层而非改源文件 |
| 3 | variant 拼错静默失效 | 变体用字符串拼接而不是 cva 声明 | cva + VariantProps，让拼错变编译错 |
| 4 | 业务 className 覆盖不了组件默认样式 | 类冲突没有仲裁（后写的类不一定赢） | cn() 里 twMerge 兜底，className 放最后 |
| 5 | antd 深度定制改到 fork | 把"带样式成品"当成"可塑毛坯"用 | 结构级行为级定制一开始就该选 Headless 路线 |

# Part C：工程化（从 demo 到可发布）

前面 Part A 练的是"写得出"，Part B 练的是"写得对"，Part C 解决最后一公里：**写得出去**——让组件库变成一个陌生团队可以安装、可以按需加载、可以放心升级、跨项目跨 React 版本都能跑的正式 npm 包。一堆只有源码的组件文件夹，和一个可发布的组件库之间，隔着六道关卡：仓库怎么组织、产物长什么样、文档怎么呈现、测试怎么兜底、版本怎么承诺、兼容边界画在哪。任何一环缺失，组件库都会在某个规模节点上崩掉。

这六条不是并列清单，而是一条流水线：**仓库定骨架（代码怎么组织）→ 构建定产物（用户拿到什么）→ 文档定门面（用户怎么学会）→ 测试定底线（改坏了谁报警）→ 版本定契约（用户怎么敢升级）→ 兼容定边界（在谁的机器上能跑）**。本章逐条过关，每条按"是什么 → 为什么 → 怎么做 → 配置示例 → 常见坑"展开。

先保留原大纲骨架，后文逐条对应展开：

1. **仓库**：pnpm monorepo（components / hooks / token / utils 分包），turbo 任务编排
2. **构建**：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）
3. **文档**：Storybook/dumi，MDX 用例即文档；**视觉回归**（Chromatic/Lost Pixel）；a11y 检查（axe 插件）
4. **测试**：Vitest + Testing Library 逐组件；Storybook play function 交互测试
5. **版本**：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）
6. **兼容**：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测

---

## C1. 仓库：pnpm monorepo（components / hooks / token / utils 分包），turbo 任务编排

### 是什么

monorepo 是把多个可独立发布的包放进同一个代码仓库统一管理。pnpm workspace 提供包之间的互相引用（改一处、上下游同时可见、版本用 `workspace:*` 占位），turbo 负责按依赖拓扑并行执行构建/测试并做结果缓存。

### 为什么需要

- **发布粒度**：业务方常常只想要 hooks 或设计 token，不想拖走整个组件库。分包后可以单独发布 `@your-org/hooks`。
- **依赖单向化**：utils 被 token/hooks 用，token/hooks 被 components 用，分层清晰后改 utils 会立刻在下游的类型检查里暴露影响——这在多仓库里要等发版才能发现。
- **原子提交**："改 button 样式 + 修对应测试 + 更新文档 demo"是一个 PR，文档永不脱节。
- **为什么是 pnpm 而不是 npm/yarn workspaces**：pnpm 用符号链接构造严格 node_modules，**没有声明的依赖 import 不到**（防幽灵依赖，这是 npm 扁平化结构的顽疾），且硬链接存储让一百个包共用一份 react 时磁盘和安装速度都占优。

### 怎么做：目录树与依赖关系

完整目录树（可直接照抄的骨架）：

```text
react-ui/
├── package.json                 # 根包：只放脚本和开发工具，永不发布
├── pnpm-workspace.yaml          # workspace 成员声明
├── turbo.json                   # turbo 任务编排（依赖拓扑 + 缓存）
├── tsconfig.base.json           # 共享 TS 配置，各包 extends 它
├── .changeset/
│   ├── config.json              # changesets 配置（C5 展开）
│   └── bright-pandas-run.md     # 待消费的变更集文件（发布流程中自动删除）
├── packages/
│   ├── utils/                   # 【层 0】纯函数，零 React 依赖
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── dom.ts           # isElement / getOwnerDocument / getScrollParent
│   │   │   ├── number.ts        # clamp / toValidNumber
│   │   │   └── array.ts
│   │   ├── package.json         # name: @react-ui/utils
│   │   └── tsup.config.ts
│   ├── token/                   # 【层 1】设计 token：CSS Variables + TS 常量
│   │   ├── src/
│   │   │   ├── index.ts         # export * from './colors' 等 TS 侧出口
│   │   │   ├── colors.css       # :root { --ui-color-primary: #1677ff; ... }
│   │   │   └── colors.ts        # export const colors —— JS/canvas 场景取色用（Watermark 生成透明水印时就要拿到主色）
│   │   ├── package.json         # name: @react-ui/token
│   │   └── tsup.config.ts
│   ├── hooks/                   # 【层 1】通用 hook，不含任何 UI
│   │   ├── src/
│   │   │   ├── use-controllable-state.ts   # Part A 的 A1，Switch/Input/Select 三处复用
│   │   │   ├── use-click-outside.ts        # A2 弹层体系
│   │   │   ├── use-focus-trap.ts           # A4 焦点管理
│   │   │   ├── use-escape-key.ts
│   │   │   └── index.ts
│   │   ├── package.json         # name: @react-ui/hooks
│   │   └── tsup.config.ts
│   └── components/              # 【层 2】组件本体，聚合层
│       ├── src/
│       │   ├── button/
│       │   │   ├── button.tsx           # 实现
│       │   │   ├── button.test.tsx      # 测试与组件同目录（C4）
│       │   │   └── button.stories.tsx   # story 与组件同目录（C3）
│       │   ├── modal/
│       │   ├── select/
│       │   ├── index.ts                 # 统一出口：export * from './button' ...
│       │   └── index.css                # 全局重置/主题挂载样式（sideEffects 重点保护对象，C2 讲）
│       ├── package.json         # name: @react-ui/components
│       └── tsup.config.ts
└── apps/
    └── docs/                    # 文档站（Storybook 或 dumi），不发布，只 import packages
```

依赖关系必须**单向无环**：

```text
utils（层 0）
  ↑          ↑
token（层 1） hooks（层 1）
  ↑            ↑
  └── components（层 2）──┘
        ↑
   apps/docs（层 3，只消费）
```

分层依据不是"文件类型"，而是**变更频率与稳定性**：utils 是纯函数，几乎不改，发 patch 为主；token 随设计规范演进；hooks 随交互模式演进；components 变更最频繁。下层永远不知道上层的存在——hooks 里绝不能 import components 的类型，否则环出现、构建拓扑失效。

### 配置示例

`pnpm-workspace.yaml`（pnpm 9/10 写法一致）：

```yaml
packages:
  # packages/* 下每个目录是一个可发布的包
  - "packages/*"
  # apps/* 是不发布的工程（文档站、playground）
  - "apps/*"
```

根 `package.json`（只放编排脚本，不放任何业务依赖）：

```json
{
  "name": "react-ui",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build && changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

内部包互相引用用 workspace 协议（`packages/components/package.json` 节选）：

```json
{
  "name": "@react-ui/components",
  "dependencies": {
    "@react-ui/hooks": "workspace:*",
    "@react-ui/token": "workspace:*",
    "@react-ui/utils": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

`workspace:*` 在开发期直连本地源码；发布时 changesets 自动把星号替换成当时解析出的真实版本号（这个替换只有 changesets publish 会做，见 C5 的坑 3）。

`turbo.json`（Turborepo v2 用 `tasks` 键；v1 的 `pipeline` 已废弃）：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

三个关键配置的含义：

- `"dependsOn": ["^build"]`：`^` 表示**拓扑依赖**——先递归构建上游包。执行 `turbo run build` 时 turbo 读 workspace 依赖图，先建 utils，再并行建 token 和 hooks，最后建 components。这就是把"构建顺序"从人脑挪进配置。
- `"outputs": ["dist/**"]`：声明构建的可缓存产物。turbo 对每个任务计算输入哈希（源码、依赖任务的输出、环境变量），命中则直接还原 `dist/**`，跳过执行。
- `"test": { "dependsOn": ["build"] }`：注意**没有 `^`**——只依赖本包自己的 build（测试要 import 本包构建产物或类型），不依赖别的包的 build。`^build` 与 `build` 一字之差，就是"上游任务"和"同包任务"的差别。

缓存效果体感：第二次 `turbo run build` 全量命中，秒级返回；改了 utils 一个文件后重跑，utils 与其下游（token/hooks/components）重建，其余包继续吃缓存。在 CI 上配远程缓存后，队友之间也共享这份命中。

### 常见坑

1. **症状**：在 components 里 `import 'lodash-es'` 能跑，别的同事拉代码后报 "Cannot find module"。**根因**：lodash 装在别的包/根下，npm/yarn 的扁平结构把它提升到顶层 node_modules，components 是"蹭"来的幽灵依赖；换 pnpm 或换环境就炸。**修法**：用 pnpm workspace（默认禁止蹭），并且每个包用什么就声明什么——报错其实是保护机制在工作。
2. **症状**：CI 上测试时绿时红，本地永远绿。**根因**：测试代码里用了 `Date.now()`/随机数，或 turbo 缓存把上次的结果直接还原了（输入文件没变、行为变了，哈希感知不到）。**修法**：测试内 mock 时间与随机源；对这类任务在 turbo.json 里给 `test` 加 `"cache": false` 或在 CI 传 `--force`。
3. **症状**：发布后用户安装报 `ERR_PNPM_NO_MATCHING_VERSION`，npm 页面显示依赖是 `"@react-ui/hooks": "workspace:*"`。**根因**：绕过 changesets 直接 `pnpm publish`，workspace 协议没被替换就发了出去。**修法**：发布永远走 `changeset publish`（详见 C5），根 package.json 里不放 publish 脚本，从流程上杜绝手滑。

---

## C2. 构建：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）

### 构建器选型：三个工具的定位差异

| 工具 | 驱动内核 | 定位 | 适合 |
|---|---|---|---|
| **tsup** | esbuild（极快） | 零配置起步的通用库打包器，`dts: true` 一键出类型 | 组件库、hooks、utils 的默认选择，社区事实标准 |
| **father** | esbuild + babel 双模式 | 蚂蚁出品，面向"带样式的中大型组件库"：内置 less 编译、保留目录结构的 bundless 产物、与 dumi 文档链路天然衔接 | 样式走 less、生态对齐 antd 系的库 |
| **unbuild** | rollup + mkdist | 面向 JS 工具库，auto 模式自动判断入口，build.config.ts 极简 | 不带样式的纯逻辑包（CLI、SDK） |

一句话决策：**新组件库默认 tsup；样式链路重度对齐 antd（less、按需样式编译）选 father；纯工具包选 unbuild**。本篇以 tsup 为例。

### 是什么：构建要交付什么

组件库的构建产物要同时满足四种消费者：

1. **现代打包器**（Vite/webpack/Rspack）要 ESM——为了 tree-shaking（按需加载）。
2. **Node 侧 SSR/Jest** 要 CJS——`require()` 无法加载纯 ESM 包。
3. **TypeScript 用户**要 `.d.ts`——编辑器提示与类型检查。
4. **样式**要原样可引的 css 文件——`import '@react-ui/token/colors.css'`。

### 怎么做：tsup 配置完整示例

`packages/components/tsup.config.ts`：

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],        // 统一入口；sideEffects 小节会讲为什么它配合 tree-shaking 已经足够
  format: ['esm', 'cjs'],         // 双产物：index.mjs（摇树用）+ index.cjs（Node/老工具链用）
  dts: true,                      // 生成 dist/index.d.ts，并把内部类型打包成单文件
  sourcemap: true,                // 报错栈能映射回 TS 源码，用户提 issue 的可复现性翻倍
  clean: true,                    // 每次构建先清空 dist，防止旧产物残留混入发布
  external: ['react', 'react-dom'], // peer 依赖永不打进产物——用户环境里已有一份，打进第二份会出双 React 实例事故
  treeshake: true,                // 构建自身产物级别的摇树（注意：消费端的按需加载靠 ESM 格式 + sideEffects 声明，不是这个开关）
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.cjs', // 显式后缀，与包是否声明 "type": "module" 解耦
  }),
  banner: {
    // 组件用了 useState 等客户端 API，Next.js App Router 的服务端组件一旦 import 必须看到这行
    js: "'use client'",
  },
});
```

带样式的 token 包要处理 css——tsup 的定位是 JS 打包器，css 不该被卷进 JS，用构建钩子复制：

```ts
// packages/token/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // css 不参与 JS 编译：构建成功后复制进 dist，由 package.json 的 exports 子路径单独暴露
  onSuccess: async () => {
    const { copyFile, mkdir } = await import('node:fs/promises');
    await mkdir('dist', { recursive: true });
    await copyFile('src/colors.css', 'dist/colors.css');
  },
});
```

`packages/token/package.json`（产物声明的完整样板，components 同构）：

```json
{
  "name": "@react-ui/token",
  "version": "1.0.0",
  "description": "设计 token：CSS Variables 与 JS 侧常量",
  "sideEffects": ["**/*.css"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./colors.css": "./dist/colors.css",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup"
  }
}
```

四个字段各司其职：

- `exports` 是现代入口表，**`types` 条件必须排在最前**——TS 解析器按序短路，顺序错了类型直接丢。
- `"./colors.css"` 子路径让样式可独立引入；`"./package.json"` 子路径是好习惯（一些工具需要读它）。
- `files: ["dist"]` 限定发布内容，防止源码、测试、node_modules 混进 tarball。
- `main`/`module`/`types` 是给不读 `exports` 的老工具链的兜底，三者与 `exports` 保持一致就不会出现"构建器能解析、运行时找不到"的分裂。

### `sideEffects`：按需加载的命门（本节按第一性原理完整走一遍）

大纲把 `sideEffects` 单独加粗为"命门"，因为**这一行 JSON 决定了你的库引一个组件是进 10KB 还是进 500KB，且声明错误时构建零报错、问题只在用户端以"样式消失/功能失灵"的形式出现**。

#### 第一步：用户代码发生了什么

```tsx
// 业务工程
import { Button } from '@react-ui/components';
```

打包器（webpack/Rollup/Vite/esbuild 的生产构建）顺着 `exports` 的 `import` 条件找到 `dist/index.mjs`。**摇树只可能发生在 ESM 产物上**——为什么？

#### 第二步：ESM 的静态性是摇树的物理前提

ESM 规范有三条铁律：`import`/`export` 必须写在模块顶层、模块路径必须是静态字符串、导出的绑定对导入方只读。这三条让打包器**不必执行任何代码**，纯靠文本级的静态分析就能回答三个问题：每个文件导出了哪些名字、每个名字被谁引用、模块图的边（依赖边）是谁连向谁。CJS 做不到：`require()` 可以写在 `if` 里、路径可以字符串拼接、`exports` 可以运行时挂属性——模块边界对静态分析是黑盒，所以 `require` 产物永远整包进入。**这就是 C2 死磕双产物、且 `import` 条件必须指向 ESM 文件的原因之一。**

#### 第三步：标记-清除算法

打包器从用户入口做"标记-清除"（mark & sweep）：

1. `import { Button }` 只把 `Button` 这个**绑定名**标记为存活；
2. 顺藤摸瓜，Button 实现体内部 import 到的 `./styles`、`@react-ui/hooks/use-controllable-state` 也被标记存活；
3. `dist/index.mjs` 里 `export { Modal }`、`export { Select }`……没有任何入口引用它们，成为**死代码候选**。

"候选"不等于"能删"——差最后一道判决。

#### 第四步：副作用判决，sideEffects 就是判决书

模块顶层代码可能在被 import 的瞬间就产生可观察影响：`document.addEventListener(...)`、`window.__uiTheme = ...`、给原生原型打补丁、`import './button.css'`（对打包器来说这是一条**没有导出、纯靠副作用生效**的依赖边）。删掉一个有副作用的模块 = 改变程序行为。打包器默认保守：**不确定就不删**。

保守的直接后果：你的库永远整包进入用户产物——业务只用了 Button，Table、DatePicker、Tree 全被打了进去。组件库"体积原罪"就卡在这。

`sideEffects` 字段是包作者向打包器提交的**承诺书**，两种形态：

- `"sideEffects": false`："本包**任何**模块被删除都不会产生可观察影响" → 打包器把所有未标记模块连同其依赖边直接摇掉。
- `"sideEffects": ["**/*.css"]`：**精确承诺**。数组里匹配到的文件 = "有副作用，必须保留"；数组外的一切文件（所有 ts/tsx）= "无副作用，可摇"。

#### 第五步：错误声明的两种事故（构建零报错）

**事故 A：样式被摇掉。** 组件库样式走独立 css 文件，包作者照抄了某教程写 `"sideEffects": false`。`src/index.ts` 里有这样一行：

```ts
import './index.css'; // 全局主题挂载：给 :root 注入 CSS Variables
```

这行 import 没有任何导出绑定，静态分析里它是"无引用的副作用模块"。既然作者白纸黑字承诺全库无副作用，打包器删掉它天经地义——于是用户按需引 Button，**全局主题变量整表消失**，所有组件颜色回落到默认值。症状极其隐蔽：库作者自己的 demo 全量引入、每个组件的样式 import 都被实际组件引用着，永远正常；只有用户按需引入时才裸奔，且构建不报任何错。

**事故 B：全局注册被摇掉。** 假设 token 包入口有一段没有导出的注册代码（`registerTheme(defaultTheme)`，往全局注册表写默认主题）。它没有绑定名、没有引用者，`sideEffects: false` 让它直接蒸发。症状是"间歇性失灵"：显式 import 的组件工作正常，被摇掉的模块承担的注册任务无声消失，排查时 grep 代码明明都在。

两种事故的共同阴险点：**报错永远不会出现在你的构建日志里，只出现在用户的浏览器里**。

#### 第六步：正确声明

```json
{
  "sideEffects": ["**/*.css", "**/*.less"]
}
```

- glob 语义：`**/*.css` 匹配任意深度的 css 文件（含根目录——webpack 早期版本 `*.css` 匹配不到根目录文件，历史惯例会同时写 `["*.css", "**/*.css"]`，现代版本 `**/*.css` 已足够）。
- 原则是**最小集合**：只把真正"无导出、纯副作用"的文件类型列入。如果库里有运行时注册副作用，正确做法不是把它藏进数组，而是**把那段代码改造成显式 API**（导出一个 `setup()` 函数让用户主动调用）——副作用显式化后，它就能被静态分析理解，不再依赖声明兜底。
- 注意声明要**同时写在每个子包**里（utils/hooks/token/components 各自的 package.json），打包器摇的是整棵依赖图上每个包的承诺。

#### 第七步：闭环验证（库作者的必修动作）

```bash
# 建一个最小验证工程
mkdir side-effect-check && cd side-effect-check
npm init -y && npm i @react-ui/components vite
```

```ts
// main.ts —— 只引一个组件
import { Button } from '@react-ui/components';
document.body.append(Object.assign(document.createElement('ui-button'), {}));
// 简化：直接 render 也行，重点是不 import 其他组件
```

```bash
npx vite build
# 打开 dist/assets 里的产物：
# 1. 搜索 "Modal" 字符串 —— 搜不到 = tree-shaking 生效
# 2. 搜索 Button 对应的 css 规则（如 --ui-color-primary）—— 搜得到 = 样式未被误删
```

这个验证应做成 CI 的固定断言（构建后跑一次检查脚本），防止某次重构引入了隐性副作用而无人察觉。

#### 与 A9 样式方案的呼应

大纲 A9 讲过四条样式路线，这里补上它们与 sideEffects 的关系闭环：**CSS Variables/BEM 与 CSS Modules 路线**产出的独立 css 文件是"游离的副作用"，必须靠 sideEffects 数组保护；**cssinjs 路线（antd v5）**样式与组件运行时同体，组件被摇掉则样式注入代码同体消失，天然按需，代价是运行时开销与 SSR 抽样式的复杂度；**shadcn/Tailwind 路线**类名写进组件源码、原子 css 由 Tailwind 编译器扫描生成，树摇问题在这个维度上直接不存在。选样式方案时，"按需加载的实现代价"应当计入决策。

### 常见坑

1. **症状**：Node/Jest 工程 `require('@react-ui/components')` 报 `ERR_REQUIRE_ESM`。**根因**：只出了 ESM 产物，或 `exports` 里漏了 `require` 条件。**修法**：tsup `format: ['esm', 'cjs']` 双格式 + exports 双条件（上面的样板配置已覆盖）。
2. **症状**：dts 构建报 `TS4023: Exported variable has or is using name 'XXX' from external module but cannot be named`。**根因**：某公共 API 的类型引用了一个未被导出的内部类型，类型打包器无法在 .d.ts 里指名它。**修法**：把该类型从内部移到公共出口（`export type { ... }`），或改用 `import type` 显式标注。
3. **症状**：发布的包里没有 css，用户 `import '@react-ui/token/colors.css'` 报 404。**根因**：`onSuccess` 复制钩子没跑（本地手跑 tsup 绕过了 turbo），或 `files` 没含 dist。**修法**：发布统一走 `turbo run build && changeset publish`（见 C5），并在 CI 加"产物清单断言"——构建后检查 dist/colors.css 存在再放行。
4. **症状**：Next.js App Router 里组件报 "useState is not a function" 或 hydration 崩溃。**根因**：服务端组件环境 import 了用 hook 的组件，而产物没有客户端标记。**修法**：tsup `banner: { js: "'use client'" }`（hooks 包与 components 包都要加；utils 纯函数包不要加，加了反而阻止它在服务端组件中使用）。

---

## C3. 文档：Storybook/dumi，MDX 用例即文档；视觉回归（Chromatic/Lost Pixel）；a11y 检查（axe 插件）

### 是什么：文档站的两个流派

- **Storybook**：框架无关的"组件工作台"。核心资产是 stories 文件——每个组件一组的可交互用例，左侧目录树按组件组织，右侧可以改 props、看不同视口、跑 a11y 检查。文档页由 stories 自动生成，再用 MDX 补充散文与排版。
- **dumi**：为组件库文档站而生（Umi/antd 生态出品，2.x 支持任意框架）。核心理念是 **Markdown 优先**：一个组件一篇 md，demo 直接写在 md 里（内嵌代码块即实时渲染的用例），配 API 表自动生成，产出形态就是国内开发者熟悉的"组件文档站"。

### 为什么 dumi 在国内组件库场景流行

1. **形态模板对位**：国内组件库文档的标准形态是"设计价值观 + 何时使用 + demo 网格 + API 表 + FAQ"，dumi 把这个三段式做成了开箱模板；Storybook 的 Docs 页则是"工作台优先"的形态，做对外文档站需要更多拼装。
2. **生态示范效应**：antd、arco、semi、TDesign 一脉的文档站心智，读者已经形成阅读习惯，换成 dumi 意味着零学习成本。
3. **demo 工程链路**：dumi 的 demo 就是源码目录里的 tsx 文件，构建、按需加载、类型检查与组件本体完全同构；antd 内部从组件源码到文档站的链路就是 father + dumi。
4. **中文文档与社区**：文档全中文、issue 中文响应，对企业内网组件库团队是实打实的成本项。

**选择建议**：重交互调试、要上视觉回归（Chromatic 与 Storybook 深度绑定）→ Storybook；文档站形态向 antd 看齐、样式链路走 less → dumi。小团队二选一即可，本篇示例以 Storybook 为主（后续的视觉回归与 play 测试都以它为载体）。

### 怎么做：MDX 用例即文档

Storybook 8 的 CSF3 写法（9 同为 CSF3，仅 addons 配置有差异，见下文注释）（`packages/components/src/button/button.stories.tsx`）：

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',     // 左侧目录树的位置
  component: Button,
  args: { children: '确定' },      // 默认参数：下面所有 story 自动继承
  parameters: {
    layout: 'centered',           // 居中展示，避免整页白板
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// 每个 story = 一个"用例"：一个具体状态下的组件快照
export const Primary: Story = { args: { variant: 'primary' } };
export const Loading: Story = { args: { loading: true, children: '提交' } };
export const Danger: Story = { args: { danger: true, children: '删除' } };
```

stories 会自动聚合成 Docs 页（表格化的控件面板 + 每个 story 一个画布）。需要自定义文档叙事时用 MDX（`button.mdx`）：

```mdx
import { Canvas, Controls, Story } from '@storybook/blocks';
import * as ButtonStories from './button.stories';

# Button 按钮

按钮用于开始一个即时操作。加载中时按钮保持原宽度，防止文案变化导致的布局抖动（Lv1 细节考点）。

## 何时使用

- 操作立即生效、无需二次确认时；
- 危险操作建议配合 `danger` 变体并在视觉上与主操作分离。

## 用法

<Story of={ButtonStories.Primary} />

<Controls />
```

dumi 的等价写法（md 内嵌 demo，代码块即实时用例）：

````markdown
# Button 按钮

按钮用于开始一个即时操作。

## 何时使用

- 操作立即生效、无需二次确认时。

```tsx
import { Button } from '@react-ui/components';

export default () => <Button variant="primary">确定</Button>;
```
````

**用例即文档的纪律**：文档里出现的每个用例都必须是可运行的 story/demo 文件（而非截图或手写代码块）；组件 API 的每个分支（受控/非受控、加载态、危险态）至少一个用例。这样文档与代码在同一 PR 里演进，永不脱节——这也是 C4 "用例即测试"的地基。

monorepo 中 Storybook 装在 `apps/docs`，`.storybook/main.ts` 用 glob 扫描各包的 stories：

```ts
// apps/docs/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../../packages/*/src/**/*.stories.@(ts|tsx)'], // 扫描所有包的 story
  // 注意：addon-essentials 是 Storybook 8 的聚合包；9 起已拆分移除，
  // 需按需安装 addon-docs / addon-controls / addon-actions 等单个包
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

### 视觉回归：原理与流程

**是什么**：把每个 story 渲染成像素级截图，与基准图（baseline）逐像素比对，差异超阈值即失败。它兜住的是**没有人为断言的外观回归**——组件测试（C4）断言行为，测不出"某次重构让 Modal 的 padding 从 16 变成 12"、"token 误改导致全局圆角变化"这类问题。

**原理流程（五步）**：

1. CI 在 PR 上构建静态 Storybook（`storybook build` → `storybook-static/`）；
2. runner 读取产物里的 `index.json`（所有 story 的清单），在无头浏览器里逐个打开 story；
3. 等待渲染稳定（字体加载完成、异步数据到位、动画关闭）后按固定视口截图；
4. 每张截图与 baseline 逐像素 diff，差异像素占比超过阈值标记为"变更"；
5. 有权限者在 PR 界面逐张审查 diff：接受（成为新 baseline）或拒绝（打回修改）。

**Chromatic（云端方案）**：baseline、diff 审查界面、跨浏览渲染全在云端，与 GitHub PR 集成最深。GitHub Actions 接入：

```yaml
# .github/workflows/chromatic.yml
name: Visual Tests
on: [pull_request]
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # Chromatic 需要 git 历史来判定"哪些 story 受本次改动影响"
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook   # action 在仓库内执行该脚本构建静态站
          exitZeroOnChanges: false           # 有未接受的视觉变更时让 CI 失败（默认 false，显式写出便于理解）
```

**Lost Pixel（开源自托管方案）**：baseline 以图片文件形式入库（`.lostpixel/baseline/`），diff 在 CI 本地跑，适合不能把 UI 截图传第三方的企业场景。`lost-pixel.config.ts`：

```ts
// lost-pixel.config.ts（Lost Pixel v2 API）
import { CustomProjectConfig } from 'lost-pixel';

export const config: CustomProjectConfig = {
  storybookShots: {
    storybookUrl: './storybook-static', // 直接读静态构建产物，CI 里不必起 dev server
  },
  generate: {
    failOnDifference: true, // 有差异即失败
    beforeScreenshot: async (page) => {
      // 截图前关闭所有动画与过渡：这是视觉回归误报治理的第一课
      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }`,
      });
    },
  },
  differenceThreshold: 0.1, // 单像素颜色差异容忍度（0~1），吸收字体抗锯齿级的噪声
};
```

CI 命令（Lost Pixel v2 的三段式）：

```bash
# 1. 渲染当前所有 story 的截图
pnpm dlx lost-pixel generate shots
# 2. 与入库的 baseline 比对，有差异则非零退出
pnpm dlx lost-pixel
# 3. 确认差异为预期变更后，更新基准并随 PR 提交
pnpm dlx lost-pixel update baseline
```

**baseline 更新策略（纪律比工具重要）**：

- baseline 的变更必须**随 PR 显式提交**（Lost Pixel 入库图片；Chromatic 云端记录到具体 commit），PR 审查时 diff 图与代码一起看——"改了什么代码、导致哪些像素变化"是 reviewer 的固定检查项。
- **严禁**在 CI 里自动 accept 全部差异（"红了就全量更新 baseline"会把真回归连同误报一起吞掉）。
- 谁改 UI，谁在同一 PR 里更新 baseline 并在描述里说明原因。

**误报治理（没有这套治理，团队两周就会把视觉回归关掉）**：

| 误报源 | 症状 | 治理 |
|---|---|---|
| CSS 动画/过渡 | 同一 story 两次截图不同，diff 区域随机 | 截图前注入 `animation/transition: none`（上面 beforeScreenshot 已示范；Chromatic 自动暂停大部分动画） |
| 字体加载时序 | 文字区域整体闪烁性差异 | CI 环境固定字体版本；截图前等待 `document.fonts.ready` |
| 时间/日期 | DatePicker/倒计时类组件每次 diff | story 里 mock 固定时间（`Date` 固定到某常量），数据写死不随机 |
| 容器尺寸漂移 | 视口或父容器宽高不同导致整页 diff | story 用固定尺寸容器包裹；视口与 DPR 固定在配置里 |
| 亚像素渲染差异 | 1px 边缘的细碎噪点 | differenceThreshold/Lost Pixel 容忍度或 Chromatic 的像素阈值 |
| 本地与 CI 环境差异 | 本地绿、CI 红 | 以 CI 为准绳；CI 用固定 Docker 镜像保证字体与渲染栈一致 |

### a11y 检查：@storybook/addon-a11y 跑 axe

**是什么**：addon-a11y 在每个 story 上运行 [axe-core](https://github.com/dequelabs/axe-core) 规则引擎，把无障碍违例直接标红在文档面板里；配合 test-runner 可以把违例升级为 CI 失败。它免费覆盖 Part A 里 A5（键盘与 ARIA）的大部分"可机检"规则——键盘模型对不对仍要人工/play 测试，但 role 缺失、标签未关联、对比度不足这些可以机器兜底。

**接入**：addon 已在上文 `main.ts` 中注册，参数在 `preview.ts` 配置：

```ts
// apps/docs/.storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      config: {
        rules: [
          // 显式关闭个别规则必须写清原因并给恢复计划；严禁全局禁用 axe
          { id: 'color-contrast', enabled: false }, // 例：暗色主题 token 调整中，issue #123 修复后移除
        ],
      },
      options: {},
    },
  },
};

export default preview;
```

**升级为 CI 失败**：`@storybook/test-runner`（0.9 起）对每个 story 自动跑 axe，违例即失败：

```bash
# CI 中的完整链路：构建静态站 → 起静态服务 → 逐 story 断言渲染无错 + a11y 通过
pnpm --filter docs exec storybook build
npx http-server storybook-static --port 6006 --silent &
npx wait-on tcp:6006
pnpm --filter docs exec test-storybook
```

**axe 常见违例与修法（组件库高频 Top 5）**：

1. `button-name`：图标按钮没有可访问名。**修法**：Icon-only Button 必须有 `aria-label` 或内部隐藏文本 `<span class="sr-only">删除</span>`。
2. `nested-interactive`：交互元素嵌套（`<a>` 里放 `<Button>`，Card 可点击又内含按钮）。**修法**：调整 DOM 结构——外层用普通元素铺点击区，按钮独立平级；这是 Card/Tooltip 类组件设计的硬约束。
3. `label`：表单控件无关联标签。**修法**：Input 的 `label htmlFor` 指向 `input id`，id 用 `useId` 生成（A7：hydration 安全）。
4. `aria-hidden-focus`：对包含焦点元素的子树设置了 `aria-hidden`（常见于 Modal 打开时给背景加 aria-hidden，但焦点还没移进弹窗）。**修法**：打开弹窗的**同一个 tick** 内把焦点移入弹窗（A4 焦点陷阱的职责），再隐藏背景。
5. `color-contrast`：文字与背景对比度不足 4.5:1。**修法**：调 token 灰阶，而不是关规则——这条规则被违反往往意味着设计 token 本身不达标。

### 常见坑

1. **症状**：视觉回归在 CI "全红"，本地却看不到差异。**根因**：CI 容器字体与本地不同（抗锯齿渲染路径不同），所有含文字的截图整片 diff。**修法**：CI 镜像安装与本地一致的字体集，或统一走云端（Chromatic 自带固定渲染环境）；短期可用 differenceThreshold 吸收。
2. **症状**：story 里组件每次截图位置/大小都不同。**根因**：story 外层容器没有约束（auto 布局 + 异步内容）。**修法**：`layout: 'centered'` 或固定尺寸 wrapper；异步数据在 story 层 await 完成（用 loaders 或 play 前置步骤）。
3. **症状**：a11y 检查全绿，但读屏用户体验仍很差。**根因**：axe 只测"可机检规则"，键盘模型（Tab 顺序、方向键行为、typeahead）不在其覆盖内。**修法**：键盘行为用 C4 的 play function 写成交互测试，axe 当第一道闸而不是唯一一道。

## C4. 测试：Vitest + Testing Library 逐组件；Storybook play function 交互测试

### 是什么：组件库的测试分层

| 层 | 工具 | 测什么 | 跑在哪 |
|---|---|---|---|
| 纯函数单测 | Vitest | conduct 三态算法、日历网格生成、useControllableState 的判断逻辑（抽出为纯函数） | Node（快） |
| 组件行为测试 | Vitest + Testing Library | 事件回调、aria 属性、受控协议 | jsdom（无布局） |
| 交互集成测试 | Storybook play function + test-runner | 真实浏览器里的交互流（焦点流转、键盘导航） | 无头浏览器 |
| 外观回归 | 视觉回归（C3） | 像素级样式 | 无头浏览器截图 |

分层的本质是**环境成本与真实性的取舍**：jsdom 秒级启动但没有布局引擎（`offsetWidth` 恒为 0），测不了视觉；真浏览器真实但慢。每类断言放在它"最便宜能测对"的那层。

### 为什么需要"逐组件"

组件库的测试对象是**契约**（props → 行为/DOM），不是实现。契约一旦发布就是对外承诺，任何破坏契约的改动都必须被拦下——这就是为什么测试文件与组件同目录（`button/button.test.tsx`）：改组件的 PR 里测试 diff 紧挨着实现 diff，reviewer 一眼对照"改了什么、契约变没变"。

### 怎么做：Vitest 配置与组件测试

`packages/components/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',          // 组件测试需要 DOM
    setupFiles: ['./vitest.setup.ts'],
    globals: false,                // 显式 import describe/it，IDE 可跳转、类型可控
    css: false,                    // 不处理 css，jsdom 测不了样式
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`packages/components/vitest.setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'; // 提供 toBeVisible/toBeDisabled/toHaveAttribute 等断言
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 每个用例结束卸载渲染容器，防止状态/定时器跨用例泄漏
afterEach(() => {
  cleanup();
});
```

Button 的行为测试（覆盖 Lv1 的考点）：

```tsx
// packages/components/src/button/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('点击触发 onClick', async () => {
    const user = userEvent.setup(); // userEvent 模拟真实事件序列（pointerdown → focus → click），比 fireEvent 接近真实用户
    const onClick = vi.fn();
    render(<Button onClick={onClick}>确定</Button>);

    // 查询首选 getByRole：它按可访问性树查找，查询能通过 = 无障碍角色正确，一举两得
    await user.click(screen.getByRole('button', { name: '确定' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('loading 时 disabled 且不触发 onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        提交
      </Button>,
    );
    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '提交' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('中文双字自动加空格（antd 经典细节）', () => {
    render(<Button>确定</Button>);
    // 两个汉字之间插入了一个空格 span（Lv1 Button 考点），语义仍可按"确 定"匹配
    expect(screen.getByRole('button', { name: '确 定' })).toBeInTheDocument();
  });
});
```

Modal 的焦点陷阱测试（A4 的验收）：

```tsx
// packages/components/src/modal/modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

describe('Modal 焦点管理', () => {
  it('打开后焦点进入弹窗，Tab 循环不逃逸', async () => {
    const user = userEvent.setup();
    render(
      <Modal open title="删除确认" onOk={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="备注" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    // 弹窗打开后，焦点应已移入弹窗（首元素或容器本身）
    expect(dialog).toContainElement(document.activeElement);

    // 连续 Tab 五次，焦点始终在弹窗内循环（陷阱生效）
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement);
    }
  });

  it('Esc 触发 onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Modal open title="标题" onOk={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

**查询选择纪律**（Testing Library 的核心心法）：`getByRole`（优先，顺带保护无障碍）> `getByLabelText/getByText`（用户视角）> `getByTestId`（最后手段，说明前两者都没设计好）。断言 DOM 属性用 `toHaveAttribute('aria-expanded', 'true')` 这类契约断言，**禁止组件树快照**——快照会随实现细节碎掉，制造大量噪音。

**jsdom 的边界**：布局（`offsetWidth`、`getBoundingClientRect`）全部返回 0/空，伪元素、canvas、真实滚动都不可用。Button 的"loading 保持宽度防抖动"这类视觉断言**必须交给视觉回归**，组件测试只测行为与 aria——这个边界感是测试工程不腐烂的前提。

### Storybook play function：用例即测试

**是什么**：直接在 story 里写交互步骤（play 函数），`@storybook/test-runner` 在 CI 的无头浏览器里逐 story 执行并断言。因为 story 同时是文档用例，**文档里每个演示都变成了回归资产**——demo 坏了 = 文档坏了 = CI 红了。

```tsx
// packages/components/src/toast/toast.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test'; // storybook 侧的测试工具包（内含 jest-dom 断言）
import { Toast, toast } from './toast';
import { Button } from '../button';

const meta: Meta = {
  title: 'Components/Toast',
  component: Toast,
};
export default meta;

type Story = StoryObj;

// 文档里的演示同时是一条 CI 回归用例：loading → success 原地变身（Lv2 Toast 考点）
export const LoadingToSuccess: Story = {
  play: async ({ canvasElement, step, expect: storybookExpect }) => {
    const canvas = within(canvasElement); // 用 within 限定在本 story 的画布内查询
    await step('点击保存，出现 loading 提示并在完成后原地变身', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '保存' }));
      await storybookExpect(canvas.getByText('保存中...')).toBeVisible();
      // 同 key 复用：成功提示替换 loading，而不是新增一条
      await storybookExpect(canvas.getByText('保存成功')).toBeVisible();
      await storybookExpect(canvas.queryByText('保存中...')).not.toBeInTheDocument();
    });
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Button
          onClick={() => {
            const key = toast.loading({ content: '保存中...' });
            setTimeout(() => toast.success({ key, content: '保存成功' }), 1000);
          }}
        >
          保存
        </Button>
      </>
    ),
  ],
};
```

写法要点：`step` 把长流程分组（失败时报告指出卡在哪一步）；`expect` 由 Storybook 注入（等价 `@storybook/test` 的 expect，已扩展 jest-dom）；查询一律 `within(canvasElement)`——用全局 `screen` 在 Docs 页会同时命中多个 story 的 DOM，产生串扰。

CI 执行（与 C3 的 a11y 检查共用一条链路）：

```bash
pnpm --filter docs exec storybook build
npx http-server storybook-static --port 6006 --silent &
npx wait-on tcp:6006
pnpm --filter docs exec test-storybook   # 每个 story：渲染无错 + play 断言 + axe 检查
```

**play 测试相对 Vitest 组件测试的增量价值**：

1. **真实浏览器**：真实焦点流转、真实事件冒泡、真实 CSS（hover 态、`pointer-events`、`position: fixed`），jsdom 测不了的弹层行为在这里可测；
2. **一份用例三处消费**：同一个 story 同时是文档演示（C3）、交互测试（此处）、视觉回归截图对象（C3）——写一次，三道闸全过；
3. **演示即防伪**：文档里的 demo 不再可能是"过时的手抄代码"，因为它们本身在被 CI 执行。

### 常见坑

1. **症状**：组件测试报 "An update to Button inside a test was not wrapped in act(...)"。**根因**：异步状态更新（setTimeout 后 setState）发生在断言之后。**修法**：用 `vi.useFakeTimers()` 控制时间并 `vi.advanceTimersByTime(...)` 后再断言；或对异步用 `await waitFor(...)`/`findBy*` 查询，而不是裸 sleep。
2. **症状**：play 测试在本地 Storybook 里绿，CI 里 flaky。**根因**：故事里有真实延时（demo 里 setTimeout 1000ms），CI 机器慢时截图/断言跑在动画完成前。**修法**：story 的 decorator 里把延时注入为参数（默认 0，文档演示时改大），或断言用 `await expect(...).toBeVisible()` 之内置重试（`@storybook/test` 的 expect 自带 waitFor 语义，多数异步已覆盖；不覆盖的场景在 play 里用 `step` 拆小并显式等待）。
3. **症状**：test-runner 报 "connection refused" 或 404。**根因**：静态服务没起来就跑了 runner。**修法**：严格按 `build → serve → wait-on → test-storybook` 顺序（上面命令），或使用 test-runner 的 `--url` 参数显式指定地址。

---

## C5. 版本：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）

### 是什么：changesets 工作流

changesets 把"这次改动该发什么版本、写什么 changelog"从发布日的记忆劳动，变成**每次 PR 的即时声明**。核心对象是"变更集"（changeset）：一个 markdown 文件，声明影响的包、semver 级别和面向用户的描述。

### 为什么需要

手工维护多包版本有三宗罪：忘了哪个包该 bump（内部依赖断链）；changelog 与提交脱节（发布日补写两个月的内容）；发布操作多步手敲（漏 publish 一个子包）。changesets 把这三件事全部流程化，并且**版本决策发生在还有上下文的 PR 现场**，而不是发布时考古。

### 怎么做：完整工作流（五步）

**第 1 步：开发者在 PR 里写变更集。**

```bash
pnpm changeset
# CLI 交互：
# 1) 勾选受影响的包（自动列出 workspace 内所有可发布包）
# 2) 对每个包选 semver 级别（Patch / Minor / Major）
# 3) 写一段面向用户的变更描述
```

生成的文件（文件名随机，如 `.changeset/bright-pandas-run.md`），**格式是 frontmatter + 正文**：

```markdown
---
'@react-ui/components': minor
'@react-ui/hooks': patch
---

feat(components): Select 新增 `labelInValue`，选中值可携带 label；hooks 伴随修复 useControllableState 在受控值切换为 undefined 时的警告
```

frontmatter 是"包名 → semver 级别"映射（一次改动影响多个包就写多行），正文直接进 CHANGELOG。变更集文件随 PR 提交，reviewer 在 diff 里就能看到"这次改动承诺发布什么"。

**第 2 步：`.changeset/config.json`。**

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "your-org/react-ui" }
  ],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```

关键项：`access: "public"`（scoped 包发布 npm 必须显式 public，否则默认 private 发不出去）；`updateInternalDependencies: "patch"`（内部依赖默认跟随 patch bump，major 传递升级由 changesets 自动处理）；changelog-github 让 changelog 里带上 PR 与作者链接。

**第 3 步：CI 消费变更集，生成 Version PR。** 官方 action 在 main 分支发现未消费的变更集时，自动开一个名为 "Version Packages" 的 PR：执行 `changeset version` 会 bump 所涉及包的版本号、把变更集正文写入各包 CHANGELOG.md、按新版本更新内部依赖（`workspace:*` 仍在，发布时才替换）、删除已消费的变更集文件。这个 PR 的 diff 就是"下个版本的全部内容"，merge 它 = 决定发版。

**第 4 步：发布。** merge Version PR 后 CI 再次运行，此时已无变更集，action 转入 publish 模式：`turbo run build`（确保发布的是新鲜产物）→ `changeset publish`（bump 过版本的包逐一 `npm publish`，同时把 `workspace:*` 替换为真实版本号，并打 git tag）。

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write        # 打 tag
      pull-requests: write   # 维护 Version PR
      id-token: write        # npm provenance（可选）
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org/
      - run: pnpm install --frozen-lockfile
      - run: pnpm build                        # turbo 按拓扑构建全部子包
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish      # 有 Version PR 被 merge 时执行发布
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**CI 集成要点**：权限三件套（contents/PR/id-token）缺一不可；`NODE_AUTH_TOKEN` 通过 setup-node 的 registry-url 写入 .npmrc；publish 命令前必须有构建步骤，且构建必须走 turbo 拓扑（保证子包 dist 都是最新——这回到 C1 的任务编排）。

**第 5 步：semver 纪律。** 判断表（发版前对照）：

| 改动 | 级别 |
|---|---|
| 修 bug，API 与行为契约不变 | patch |
| 新增组件 / 新增可选 props / 新增导出，旧代码零改动 | minor |
| 删除或改名 props / API 签名变化 / 默认值或视觉规范级变化 | major |
| 提升 React 最低版本、收紧 peerDependencies | major |
| 修 bug 但可能有人依赖错误行为 | 起步 minor，影响面大则 major |

灰色地带的裁决原则：**问"用户升级后，现有代码有没有可能在无警告的情况下变行为"**——答案是"会"，就是 major。视觉微调（对齐 1px）惯例上 patch，系统性视觉改版是 major。

**废弃 API 的两版本缓冲策略**（组件库维护者的职业操守）：

1. **v1.2（当前 minor）**：新 API 上线；旧 API 标记 `@deprecated`（JSDoc + 编辑器删除线），运行时在 dev 模式 `console.warn('[deprecated] type="link" 将在 v3.0 移除，请改用 variant="text"，迁移见 CHANGELOG 的 codemod 章节')`；
2. **v2.0（下一个 major）**：旧 API 仍可工作，警告保留——major 允许破坏，但我们多留一个周期；
3. **v3.0**：真正删除，并在 changelog 顶部置顶迁移指引。

缓冲的意义：大型业务不可能随组件库的 major 即停即改，两个大版本的窗口给了他们完整的排期空间；警告在开发控制台持续刷存在感，是最高效的催迁移手段。

### codemod：把迁移指南变成一条命令

**是什么**：jscodeshift 是 Meta 出的 AST 代码变换工具——把"手工搜索替换"升级为**语法感知的批量重构**，不会被注释、字符串、多行格式骗到。大版本把 API 改名时，配套发布 codemod，用户跑一条命令完成全部迁移。

**示例：v2.0 把 Button 的 `type` prop 改名为 `variant`（值也做映射）**，完整可用的 transform：

```ts
// codemods/button-type-to-variant.ts
import type { FileInfo, API } from 'jscodeshift';

export default function transform(file: FileInfo, { j }: API) {
  const root = j(file.source);

  // 1. 从 import 语句拿到 Button 在本文件的局部名（处理 `import { Button as Btn }` 别名）
  const localNames: string[] = [];
  root
    .find(j.ImportDeclaration, { source: { value: '@react-ui/components' } })
    .forEach((importPath) => {
      j(importPath)
        .find(j.ImportSpecifier, { imported: { name: 'Button' } })
        .forEach((specPath) => {
          // local 存在即别名场景；否则局部名就是 imported 名
          localNames.push((specPath.node.local ?? specPath.node.imported).name);
        });
    });

  if (localNames.length === 0) return file.source; // 本文件未引用，原样返回（不产生 diff 噪音）

  // 2. 旧值 → 新值的映射（type 的语义在新 API 下拆成了 variant + htmlType）
  const valueMap: Record<string, string> = {
    primary: 'primary',
    default: 'secondary',
    link: 'text',
    dashed: 'secondary',
  };

  // 3. 遍历 <Button type="...">，改属性名并映射值
  for (const name of localNames) {
    root
      .findJSXElements(name)
      .find(j.JSXAttribute, { name: { name: 'type' } })
      .forEach((attrPath) => {
        const attr = attrPath.node;
        attr.name = j.jsxIdentifier('variant'); // type → variant
        if (attr.value?.type === 'StringLiteral' && attr.value.value in valueMap) {
          attr.value = j.stringLiteral(valueMap[attr.value.value]); // 值同步映射
        }
        // 值是表达式（变量/三元）时不动，留给人工确认——codemod 宁可少改不可错改
      });
  }

  return root.toSource({ quote: 'single' }); // 保持单引号风格，diff 最小化
}
```

在业务仓库执行：

```bash
# --parser=tsx 必须显式指定，否则 JSX 语法解析直接报错
pnpm dlx jscodeshift -t node_modules/@react-ui/components/codemods/button-type-to-variant.ts \
  src/ --extensions=tsx,ts --parser=tsx
```

codemod 随包发布（放进 components 包的 `codemods/` 目录并在 `files` 中包含），changelog 的迁移章节直接给这条命令。**验证纪律**：codemod 本身要有"输入 → 输出"快照测试（固定几个带别名、带表达式值的样本文件，跑 transform 断言输出），否则迁移工具自己变成事故源。

### 常见坑

1. **症状**：发布后用户装到的包依赖仍是 `"@react-ui/hooks": "workspace:*"`。**根因**：绕过 `changeset publish` 直接 `pnpm publish`。**修法**：如 C1 所述，发布入口唯一化；CI 的 publish 权限只给 bot 账号。
2. **症状**：Version PR 只 bump 了 components，没带动 hooks。**根因**：改动横跨两包但变更集里只勾了一个包。**修法**：PR 模板里提醒"跨包改动写全 changeset"；review 时把变更集覆盖面当检查项。
3. **症状**：codemod 跑完部分文件报错退出。**根因**：混入 `.js`/`.jsx` 文件却只给了 tsx parser，或文件里有非标准语法（装饰器、flow）。**修法**：按扩展名分批执行并各自指定 parser；对无法解析的文件让 jscodeshift 跳过（默认跳过并打印错误文件清单，事后人工处理该清单）。

---

## C6. 兼容：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测

### 是什么

兼容性三问：**在哪些浏览器上跑**（browserslist 矩阵）、**在服务端渲染时不炸**（SSR hydrate 冒烟）、**在哪个 React 版本上跑**（18/19 双版本矩阵）。组件库的用户环境是"别人的项目"，边界必须显式声明并自动化验证，否则每次兼容问题都是用户工单倒逼。

### browserslist 矩阵：声明与影响

在根或各包 `package.json` 声明目标浏览器集合——它是整个前端工具链的公共契约（autoprefixer、babel、esbuild、core-js 都读它）：

```json
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not op_mini all",
    "not dead",
    "not IE 11"
  ]
}
```

查询解析结果（写进 CI 或 README，让矩阵可见）：

```bash
npx browserslist
# 输出每个命中的浏览器及版本，例如：
# chrome 131
# chrome 130
# edge 131
# firefox 133
# ios_saf 18.2
# safari 18.2
```

**影响链条（声明如何改变产物）**：

1. **语法降级**：esbuild/babel 按矩阵决定是否把可选链 `?.`、空值合并 `??`、类字段转译为老语法。注意 esbuild 只做语法转译、不注入 API polyfill——`Array.prototype.at` 这类**新 API** 超出矩阵时必须另行处理；
2. **API polyfill**：组件库的正确姿势是**少用新 API**（`at`/`structuredClone` 换 `slice(-1)[0]` 等写法），而不是把 core-js 打进产物污染用户工程——polyfill 责任应留在业务侧；
3. **CSS 前缀**：autoprefixer 按矩阵输出 `-webkit-line-clamp`（Typography 多行省略）、`-webkit-backdrop-filter` 等前缀——省略组件库常踩；
4. **矩阵必须 ⊇ 用户矩阵**：库声明的目标集合要覆盖所有用户项目的集合，否则"业务在自己矩阵内一切正常，唯独引了你的组件在低版本 Safari 白屏"，这种锅最难甩清。

### SSR hydrate 冒烟测试：最小实现

**为什么**：Next.js/Nuxt 时代组件库必然被服务端渲染。hydration mismatch（服务端 HTML 与客户端首帧不一致）的后果是 React 丢弃服务端 HTML 整树重渲（性能退化），甚至白屏。jsdom 测不出这类问题——必须真的"renderToString 一次、hydrate 一次"。

**最小实现一：全量组件 renderToString 冒烟**（能抓住 window 未守卫、useLayoutEffect 告警类问题）：

```ts
// packages/components/src/ssr/ssr-smoke.test.ts
import { describe, it, expect } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import * as UI from '../index';

describe('SSR 冒烟：所有导出可被 renderToString', () => {
  // Object.entries 枚举全量导出，每个组件一条用例（it.each 自动生成用例名）
  it.each(Object.entries(UI))('%s 可服务端渲染', (name, exported) => {
    const Comp = exported as ComponentType;
    // 无必填 props 的组件直接渲染；有必填 props 的（如 Table 的 columns）另列 cases
    expect(() => renderToString(createElement(Comp))).not.toThrow();
  });
});
```

**最小实现二：hydrate 一致性断言**（能抓住真 mismatch）。注意 vitest 需要在 node 环境跑（jsdom 环境下 react-dom/server 行为不同），单独给这个文件配 `// @vitest-environment node`，并用 JSDOM 手动构造 DOM：

```ts
// packages/components/src/ssr/hydrate.test.tsx
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Modal } from '../modal';

// 捕获 console.error：React 18/19 的 hydration mismatch 以 console.error 形式报告
function catchConsoleError(fn: () => void): string[] {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args.join(' '));
  try {
    fn();
  } finally {
    console.error = original;
  }
  return errors;
}

describe('SSR hydrate 一致性', () => {
  it('Modal 服务端 HTML 与客户端首帧一致（无 mismatch 警告）', () => {
    const { window } = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost/', // 提供 location，避免组件内 window.location 访问炸掉
      pretendToBeVisual: true,  // 提供 requestAnimationFrame
    });

    // 服务端：用与客户端相同的组件、相同的 props 生成首屏 HTML
    // （真实项目里这一步发生在 Node 服务端；绝不能手写一段"看起来像"的 HTML 冒充——
    //   那样两侧必然不匹配，这个测试就永远红着，失去冒烟意义）
    const html = renderToString(<Modal open title="标题">内容</Modal>);

    // 客户端：hydrate 同一组件
    const errors = catchConsoleError(() => {
      const container = window.document.getElementById('root')!;
      container.innerHTML = html;
      hydrateRoot(container, <Modal open title="标题">内容</Modal>);
    });

    // React 的 mismatch 警告包含这两个关键词之一
    const mismatchErrors = errors.filter(
      (e) => e.includes('did not match') || e.includes('Hydration failed'),
    );
    expect(mismatchErrors).toEqual([]);
  });
});
```

mismatch 的典型来源与修法（与 A7 呼应）：随机数/时间戳（修法：`useId`、或首帧渲染占位 + `useEffect` 后再上真实值）、`useLayoutEffect`（服务端 warning，用 `useIsomorphicLayoutEffect` 包一层）、`typeof window` 分支渲染（首帧永远走服务端一致的分支）。

### React 18/19 双版本跑测：peerDependencies 与 CI 矩阵

**第一步：peerDependencies 放宽到区间**（各包统一）：

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

区间承诺"18 和 19 都支持"，就必须**真的在两个版本上跑过测试**——否则承诺只是愿望。

**第二步：CI 矩阵**。用 pnpm 在根上强制安装矩阵版本的 react，让 workspace 全部解析到同一套：

```yaml
# .github/workflows/ci.yml（节选）
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false            # 一个版本失败不取消另一个，两个结果都要看到
      matrix:
        react: [18, 19]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # 把根 devDependencies 的 react/react-dom/@types/react 钉到矩阵版本，
      # workspace 内所有包的 peer 解析随之统一
      - run: |
          pnpm add -w -D react@${{ matrix.react }} react-dom@${{ matrix.react }} @types/react@${{ matrix.react }}
      - run: pnpm build
      - run: pnpm test
```

**React 19 下组件库需要重点回归的差异清单**（18→19 的组件库视角）：

- `ref` 成为普通 prop（函数组件可不写 `forwardRef` 直接收 `ref`；`forwardRef` 仍兼容可用——库内可渐进迁移，对外 API 不变）；
- 函数组件的 `defaultProps` 被移除（18.3 起告警）——解构默认值的写法本来就免疫，库内若有残留必须清；
- `react-dom/test-utils` 移除，统一用 `React.act`；
- `useId` 的生成格式变化——绝不依赖其具体字符串（只用其唯一性）。

**第三步：测试环境的 act 声明**。React 18 的测试需要显式声明 act 环境，否则 Testing Library 报警告（React 19 侧 @testing-library/react v16 已内置处理）：

```ts
// vitest.setup.ts 顶部追加
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
```

### 常见坑

1. **症状**：CI 矩阵里 React 18 全绿、19 下批量报 ref 相关类型错误。**根因**：`@types/react@19` 的 `ref` prop 类型变化（forwardRef 返回类型推导差异）。**修法**：类型层兼容两端——`React.forwardRef` 写法在两个版本的类型下都成立（这就是它至今仍被保留的原因），不要为了"跟上 19"提前删除 forwardRef。
2. **症状**：本地组件测试全过，接入方 Next.js 报 hydration failed。**根因**：某个组件渲染了 `Date.now()` 派生内容或依赖 `window` 分支。**修法**：跑上面 hydrate 冒烟测试抓出来；改法回到 A7（useId / isomorphic hook / 首帧占位）。
3. **症状**：目标浏览器里组件白屏，报 `Object.flatMap is not a function` 类错误。**根因**：用了超出 browserslist 矩阵的新 API，且组件库没带 polyfill。**修法**：换等价旧 API（首选）；确需新 API 时在组件库内做特性检测 + 局部降级实现，并在文档标注。

---

# 学习路线与产出（约 9 周）

原大纲表格保留如下，表后逐周展开验收要点：

| 周 | 内容 | 产出 |
|---|---|---|
| 1–2 | Part A 内功逐项写 demo + Lv1 组件 | useControllableState 等 9 个内功 hook |
| 3–4 | Lv2：Modal + Toast + Tooltip + Drawer | 弹层四件套（含命令式 API） |
| 5–8 | Lv3 挑五个硬的：**Select / Tabs / DatePicker / Table / Tree** | 核心五件 |
| 9 | Part C 工程化 | monorepo + Storybook + changesets 发布 1.0 |

### 第 1–2 周（Part A 内功 + Lv1）验收要点

- **useControllableState**：三个验收用例——外部传 `value` 时内部不存状态（受控）；不传时 `defaultValue` 只在首帧消费一次（改 defaultValue 不影响后续，这是 `useState` 惰性初始化的直接推论）；运行中受控↔非受控切换必须抛出警告。用 Switch/Input/Select 三个组件分别接一遍，确认 API 一致。
- 其余 8 个内功 hook（clickOutside / focusTrap / escapeKey / hoverIntent / useId 化表单关联 / isomorphicLayoutEffect / roving tabindex / 弹层重定位）各有最小 demo 与单测；**每个 hook 一个文件一个 README 段**，从第 1 周就养成"内功可独立讲述"的习惯——第 9 周它们会被直接抽成 hooks 包发布。
- **Lv1 组件**：Button 的 loading 宽度不抖动（此验收靠视觉回归截图，jsdom 测不了布局）、中文双字自动空格（单测断言按钮可访问名含空格）；Icon 的 `fill: currentColor` 跟随文字色、按需引入不整包；Typography 的多行省略 + **溢出才显示 Tooltip**（`scrollWidth > clientWidth` 的 JS 测量逻辑抽成 hook 并单测）。
- 本阶段埋下工程伏笔：所有 demo 按 C3 的 story 格式写（用例即文档从第一天成立）。

### 第 3–4 周（Lv2 弹层四件套）验收要点

- **Modal**：五项硬验收——焦点陷阱（Tab 循环 + Shift+Tab 回绕 + 打开记 trigger、关闭还焦，C4 的测试代码就是验收脚本）；Esc 关闭；滚动锁无抖动（body overflow hidden + 滚动条宽度补偿）；退出动画播完才真正 unmount（A3 双状态机）；`Modal.confirm()` 命令式 API 返回 Promise 且可更新内容。
- **命令式 API 的 context 验收**：静态方法拿不到 ConfigProvider 主题的缺陷要能现场演示（改主题色后 confirm 弹窗不变色），并给出 `<App>` 组件包裹方案——这是面试高频考点，光看不算懂。
- **Toast**：同 key 复用更新（loading → success 原地变身，play 测试覆盖）；hover 暂停自动销毁；`aria-live="polite"` 播报。
- **Tooltip**：hover 意图延时（进 100ms 出 300ms）；disabled 按钮不触发事件的坑（pointer-events 方案）与解法。
- **Drawer**：四方向动画 + 拖拽改宽（pointer capture）。
- 出口标准：四个组件全部有 story + 组件测试 + axe 通过；弹层互斥（同时只开一个）与多级弹层 z-index 有手动验证记录。

### 第 5–8 周（Lv3 核心五件）验收要点

每组件的最低验收线：行为单测 + play 交互测试 + 虚拟滚动性能截图（万级数据 60fps 的 Performance 面板记录）+ APG 对照清单（键盘模型逐项勾选）。

- **Select（第 5 周上半）**：高亮与选中分离的架构；键盘全套（↑↓/Enter/Esc/Home/End/typeahead，每个按键一条测试用例——APG 键盘表就是测试清单）；万级 options 虚拟滚动；远程搜索的防抖 + loading + 失焦取消。
- **Tabs（第 5 周下半）**：compound 模式（TabsContext + 子组件自由组合）；roving tabindex；指示条 FLIP 动画；懒渲染与保持挂载两种模式可切换。
- **DatePicker（第 6 周）**：6×7 网格生成算法（纯函数化 + 单测覆盖前后月补齐、周起始日国际化）；范围选择的 hover 实时预览；键盘输入解析容错（dayjs parse 失败回退）；presets 快捷项。
- **Table（第 7 周）**：受控协议——分页/排序/筛选任何变化时 onChange 一次回调带全参（协议文档化，这是"协议工程"的验收）；固定表头 + 固定列双表同步滚动；列宽拖拽；行选择跨页保持。
- **Tree（第 8 周）**：checked/halfChecked 三态联动算法抽成纯函数并穷举单测（父选带动子、子全选带动父、半选传播）；拍平树 + 虚拟化 + level 缩进；拖拽换父后数据路径更新。
- 本阶段每个组件都按"协议文档 + story"双产出，第 9 周发布时文档站已自然成型。

### 第 9 周（Part C 工程化）验收要点

- **monorepo**：四个包目录与单向依赖就位；`turbo run build` 拓扑正确（改 utils 后仅 utils 及其下游重建，缓存命中其余）；`pnpm-workspace.yaml` 与 turbo.json 与本章 C1 示例逐项对齐。
- **构建**：tsup 双产物 + dts；**sideEffects 闭环验证**——最小工程按需引 Button，产物中搜不到 "Modal" 且搜得到按钮样式（C2 第七步脚本跑通并进 CI）。
- **文档与测试**：Storybook 站点（或 dumi）聚合全部组件 story；视觉回归接入并在 PR 上有 diff 审查记录；a11y 检查全绿（禁用规则有注释与 issue 链接）。
- **版本**：走通一次完整发布演练——`pnpm changeset` 声明 minor → CI 生成 Version PR → merge → 自动 publish 到 npm（私有 scope 也行）；CHANGELOG 生成正确；随后再发一个 patch 验证多包联动 bump。
- **兼容**：browserslist 矩阵写入并附 `npx browserslist` 输出；SSR 冒烟测试进 test 任务；React 18/19 双版本矩阵 CI 全绿。
- 最终产出物：**一个真实发布在 npm 上、文档站可访问、CI 五道闸（构建/测试/视觉/a11y/矩阵）齐备的 1.0 组件库**——这份产出在简历上的说服力超过十个 toy 项目。

---

# 源码阅读优先级

原大纲四项逐个展开。读源码的总原则：**带着一个具体问题进，只读回答问题的那几百行**，读完整理成"它解决了什么我没想到的问题"清单。

## 1. **Radix UI**：无样式组件的行为/无障碍实现，每个组件几百行，最易吸收

- **读什么**：不是读它的架构图，是读"行为契约的实现"。以 Dialog 为例，入口在 `packages/react/dialog/src/`（v1 早期文件名为 `dialog.tsx`，现版本 `Dialog.tsx`）：它把行为拆成可复用的独立原语——`FocusScope`（焦点陷阱，A4）、`DismissableLayer`（Esc + 外部点击关闭，含多层弹层豁免）、`Portal`、`Primitive`（aria 属性透传底座）。
- **为什么只有几百行**：因为它**只做行为与无障碍、完全不碰样式**——没有主题系统、没有设计 token、没有视觉分支，状态机与样式彻底解耦后每个组件剩下的就是纯交互逻辑。这正是 headless 路线（Lv4 表格）的工程价值：行为复杂度被独立打磨并发布，样式留给消费者。
- **怎么读**：打开 WAI-ARIA APG 的 Dialog 模式页（键盘模型 + ARIA 属性清单），对照源码逐项找实现位置——`aria-modal` 在哪设置、focus trap 在 `mount` 时如何取焦点、Esc 的 keydown 处理如何只关"最顶层"弹层。读一个组件通常能带走五六个"我没想到的分支"（焦点还回触发元素、`DialogContent` 缺 title 时的 console 警告、嵌套 dialog 的 DismissableLayer 分层）。
- **读后动作**：把 `DismissableLayer` 的"层叠豁免"思想抄进自己弹层体系（A2 的多弹层互斥）；把 FocusScope 的实现与自己第 3 周写的 useFocusTrap 对比，补齐漏掉的分支。

## 2. **antd**：工程化与细节功力（Wave 波纹、两个汉字空格、Watermark 攻防、Tree 三态）

antd 读四个指定点位，入口如下：

- **Wave 波纹**（`antd/components/_util/wave.tsx`）：一次性伪元素动画的实现——点击时插入带动画的伪元素节点、动画结束移除，避免常驻 DOM。要读的问题：它如何判断波纹颜色（从目标元素算出的合适前景色）与如何避免快速连点时的动画堆积。
- **两个汉字空格**（v5 在 `antd/components/button/buttonHelpers.tsx` 的 `spaceChildren`，v4 之前内联在 `button.tsx`）：`/^[\u4e00-\u9fa5]{2}$/` 判断子节点是恰好两个汉字的文本，插入一个空格 span——为什么是"恰好两个"（三个以上中文排版不需要）、为什么用 span 包裹而不是直接改文本（不能污染用户的 children 引用）。
- **Watermark 攻防**（`antd/components/watermark/`，index.tsx 装配 + useWatermark.ts 核心）：canvas 生成平铺背景（文字绘制、旋转、间距计算、`background-repeat` 挂到覆盖层）、MutationObserver 防 DOM 篡改（水印节点被删除或属性被改时重新挂载/恢复——攻防博弈：观察器自身也可能被断开，antd 用"删除后立即重建 + 重开观察"拉长攻击成本）。这是大纲 Lv3 Watermark 条目"攻防趣味题"的正主。
- **Tree 三态**（主体在独立包 `rc-tree`，antd 的 `components/tree` 是它的封装；三态联动核心在 `rc-tree` 的 util 里的 `conductCheck` 算法）：从选中 key 集合出发"父到子全选、子到父计数判半选"的双向传导。读完对照自己第 8 周的纯函数实现，重点看它如何处理"keys 里混入已禁用/不存在节点"的边界。

## 3. shadcn/ui：cva 变体管理与现代形态

- **读什么**：任意组件文件（如 `components/ui/button.tsx`），看它如何用 **cva**（class-variance-authority）把变体组织成一张类型安全的表：

```ts
// shadcn button 的骨架形态（示意其组织方式）
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium', // base：所有变体共享
  {
    variants: {
      variant: {                  // 每个变体轴是一张映射表
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white',
        outline: 'border border-input bg-background',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

cva 的价值：variants 表同时产出**类型**（props 自动推导出 `variant?: 'default' | 'destructive' | 'outline'`）与**运行时类名**——变体的类型安全、默认值、类名组织一表三得。这与自研库的 `clsx(cond && 'x')` 散写形成直接对照。
- **顺带读三件事**：`cn()`（clsx + tailwind-merge 的组合，A8 的 props 合并纪律）；`Slot` 的 `asChild` 模式（把渲染权交给子元素，行为注入不增 DOM）；**复制粘贴哲学的工程含义**——源码进用户仓库、没有 npm 依赖升级，大版本迁移 = git diff（与 C5 的 codemod 策略互为镜像：一个是"库不动用户动"，一个是"用户不动命令动"）。

## 4. WAI-ARIA Authoring Practices：所有键盘/ARIA 行为的唯一权威

- **是什么**：W3C 官方的组件模式指南（APG），给每类组件规定了 role 结构、键盘交互表、ARIA 状态属性——大纲 A5 称之为"组件库圣经"。
- **怎么当工具书用**（不是通读的书）：
  1. **实现前**：写 Select 前只读两节——Listbox 与 Combobox。抄下键盘表（每行 = 一个按键 + 预期行为）与 aria 属性清单（`role="listbox"`、`aria-activedescendant`、`aria-expanded` 等）。
  2. **把键盘表变成测试清单**：APG 说 "Down Arrow: Moves focus to the next option"，就写一条 `await user.keyboard('{ArrowDown}')` 的测试。APG 表有多少行，测试就有多少条——考纲即测试。
  3. **实现中对照**：自己实现的每个行为去 APG 找依据；APG 没规定的（视觉、动画、中文场景）才自己设计并写进文档。
  4. **与 Radix 互为印证**：Radix 是 APG 的工程化实现（第一优先级条目），APG 是考纲、Radix 是范文——两份对照着读，行为规范就不再是背诵而是理解。

---

# 面试高频考点速查（本章覆盖）

原句列表保留：

受控非受控双模式 / 退出动画双状态机 / 焦点陷阱与 roving tabindex / 命令式组件与 context 丢失 / Select 键盘导航与 typeahead / 弹层定位与 z-index 治理 / 树三态与递归虚拟化 / 滚动锁与宽度补偿 / 样式按需与 sideEffects

以下每条给"30 秒答案要点"——按这个框架说，3 到 5 句内是完整回答。

**1. 受控非受控双模式**

30 秒答案：受控与非受控的核心是"状态的所有权"——外部传了 `value` 就是受控，组件内部不存状态只负责回调和展示；没传就回退到内部 `useState`。我会用一个统一的 `useControllableState` hook 实现：`props.value !== undefined ? props.value : internalState`，`onChange` 在两种模式下都正常回调。两个坑要说清：`defaultValue` 只能消费一次，所以要 `useState(() => defaultValue)` 惰性初始化；运行中切换受控性（先传 value 又去掉）是反模式，React 会告警，库层面要主动检测并给出可读错误。最后用 Switch/Input/Select 三个组件验证同一套 hook，说明这是协议级抽象。

**2. 退出动画双状态机**

30 秒答案：问题本质是 React 没有"播完动画再卸载"的原生语义——`visible=false` 立即 unmount，退出动画根本来不及播。解法是把"是否显示"和"是否挂载"拆成两个状态：关闭时先 `visible=false`（触发 exit 样式），保持 mounted，在 `transitionend` 事件里才真正 `setMounted(false)` 卸载；同时用 timeout 兜底防止事件丢失导致永久挂载。CSSTransition 和 AnimatePresence 本质都是这个双状态机。两个细节加分项：动画期间给容器 `pointer-events: none` 防连点；列表项退出时可能有新项插入导致 key 错位，退出中的项要锁定数据快照。

**3. 焦点陷阱与 roving tabindex**

30 秒答案：焦点陷阱是 Modal 类组件的硬需求，实现是打开时把焦点移入弹窗，然后拦截 Tab——查询容器内所有可聚焦元素（`a[href]`、`button:not(:disabled)`、`input` 等选择器集合），焦点在最后一个元素上按 Tab 时回到第一个，Shift+Tab 在第一个上时跳到最后，形成循环；关闭时焦点还给触发元素。roving tabindex 解决的是 Tabs/Radio 组的键盘模型：容器内只有一个元素的 `tabIndex` 是 0（tab stop），其余是 -1，方向键在它们之间移动焦点并同步更新 tab stop 位置——这样用户 Tab 一次进入组、方向键在组内移动、Tab 一次离开，符合 WAI-ARIA APG 的规定。两者的共同思想：键盘路径必须是设计出来的，而不是 DOM 顺序的自然结果。

**4. 命令式组件与 context 丢失**

30 秒答案：`Modal.confirm()` 这类命令式 API 的实现是用 `createRoot` 在 body 上动态挂一个独立 React 根，往里 render 一个 Confirm 组件，并把 resolve 函数传进去让点击按钮时结束 Promise。它的固有缺陷是这棵新树脱离了应用树的 context——拿不到 ConfigProvider 注入的主题和国际化，深色模式下 confirm 弹窗是白的。React 18 以后还多一条约束：命令式弹层必须自己用 `createRoot`，旧的 `ReactDOM.render` 已废弃。修复方案是 hooks 化：提供 `App.useApp()` 返回绑定了 context 的 message/modal 实例（antd 的 `<App>` 组件就是这么来的），静态方法保留为兜底但文档标注 context 限制。

**5. Select 键盘导航与 typeahead**

30 秒答案：Select 要严格区分两个概念——高亮项（visual focus，列表里当前指向的项）和选中项（value），键盘移动只改高亮，Enter 才把高亮变成选中。键盘模型按 APG 的 listbox：↑↓ 移动高亮（到边界时循环或停止，两种都是合法实现但要固定）、Home/End 跳首尾、Enter 选中并关闭、Esc 关闭且还原。typeahead 是收集连按的可见字符（约 500ms 窗口内拼接），在 options 的 label 里找前缀匹配并跳高亮到那项；窗口超时就清空重新收集。无障碍上用 `aria-activedescendant` 指向高亮项的 id（焦点留在 input 上不动，读屏跟随该属性播报），配 `role="listbox"` 与 `aria-expanded`。万级 options 配合虚拟滚动——只渲染可视区行，键盘移动时同步滚动位置保证高亮项可见。

**6. 弹层定位与 z-index 治理**

30 秒答案：定位绝不自己写，用 floating-ui 的 `computePosition`——它把定位拆成"基准元素 + 锚点方位 + 中间件"：`flip` 空间不够时翻转方向、`shift` 贴边平移、`size` 反馈可用空间，且滚动 resize 时通过 `autoUpdate` 自动重算。z-index 治理的原则是"不让业务猜数字"：弹层统一 Portal 到 body 避免 stacking context 裁剪；库内部维护分层槽位（普通弹层、Modal、Toast 各占一个区间）加一个递增计数器保证同层后开者在上；多级弹层的关闭顺序按层栈处理（Esc 只关最顶层，靠"层注册栈"实现）。验收标准：嵌套 Popover 里开 Modal 里再开 Tooltip，三层都正确覆盖且 Esc 逐层关闭。

**7. 树三态与递归虚拟化**

30 秒答案：三态联动的核心算法是把 checked/halfChecked 的推导做成纯函数——从当前选中 key 集合和树的父子关系出发做两趟传导：父选中则全部子孙选中（自顶向下），子集合全选则父 checked、部分选则 halfChecked（自底向上）；antd 的 rc-tree 里这个函数叫 conductCheck，独立可测。虚拟化的关键是树没有天然的"行"结构，所以先拍平：深度优先遍历展开路径上的节点生成一维可见行数组（每行带 level），虚拟滚动按行高窗口渲染，缩进用 level 乘固定步长而不是嵌套 DOM——这样万级节点只渲染视口内几十行。两个难点：展开/收起时拍平数组局部重算的增量更新，以及勾选大面积节点时三态计算要缓存中间结果避免全树重算。

**8. 滚动锁与宽度补偿**

30 秒答案：Modal 打开要锁背景滚动，最朴素的做法是 `body { overflow: hidden }`，但在 Windows（非 overlay 滚动条）上滚动条占位约 17px，锁完整个页面向右抖 17px，关闭又抖回来。修法是补偿：加锁前测量 `window.innerWidth - document.documentElement.clientWidth` 得到真实滚动条宽，给 body 加等值的 `padding-right`，解锁时还原。现代方案是 CSS 的 `scrollbar-gutter: stable`，让布局永远给滚动条留位，从根上消除抖动，但要确认目标浏览器矩阵支持。还有两个工程细节：多层弹层要计数（引用计数为 0 才真正解锁）；iOS Safari 的 body overflow hidden 不生效，要用 `touchmove` preventDefault 或 position fixed 方案。

**9. 样式按需与 sideEffects**

30 秒答案：按需加载的完整链条是——业务写 `import { Button } from 'lib'`，打包器顺着 ESM 产物做静态分析（ESM 的 import/export 全是顶层静态声明，不执行代码就能建出模块图），然后标记清除：只有 Button 和它的依赖被标记存活，其余导出是死代码候选。能不能删取决于副作用判断：css import、全局注册这类"没有导出、靠执行生效"的模块，打包器默认保守保留，所以包必须在 package.json 里用 `sideEffects` 做精确承诺——`["**/*.css"]` 表示数组匹配的文件有副作用必须保留，其余文件保证无副作用可摇。命门在于写错 `sideEffects: false` 会把全局样式和注册代码无声摇掉，构建不报错、只在用户端裸奔；css-injs 方案（antd v5）样式与组件同体所以天然按需，代价是运行时开销。

---

# 与前五份文档的连接

本篇开头的定位句已经说明：**《基础大纲》阶段 3 只讲了组件设计模式，本篇（尤其 Part B + Part C）补全另一半**。学完本篇回头重看基础大纲，会经历一次"模式 → 纪律"的认知升级：

- 基础大纲的"受控组件"是一个用法知识点；本篇 A1 把它升级为组件库的**发布契约**——每个表单类组件必须同时支持双模式，且有统一 hook 与告警策略。回看时你会重新理解"状态提升"那章：受控的本质是所有权协议，库与业务的边界就画在这条线上。
- 基础大纲的"组合优于继承"是口诀；本篇 Part B 的 Tabs/ConfigProvider 把它落成 compound API 工程——组合不是风格选择，是让复杂组件的子组件可被替换、可读 context 的结构手段。再读基础大纲的组合模式一节，看到的不再是示例而是 API 设计决策。
- 基础大纲的自定义 hook 教你抽逻辑；本篇 C1/C4/C5 教你把 hook 变成**有版本、有测试、有 changelog 的产品**——`useControllableState` 从 demo 到 `@react-ui/hooks` 的距离，正是第 9 周要走的路。

与其余四份文档的呼应：

- **《react-进阶大纲-复杂场景.md》（Schema 驱动线）**：Schema 驱动的动态表单/表格，渲染底座正是本篇的 Form 组件与 Table 的受控协议（一次回调带全参的设计让 Schema 层可以无感接管状态）。读那篇遇到"协议设计"卡点时，回到本篇 Lv3 的 Table 条目。
- **《react-高阶场景全景图.md》（23 场景全景）**：IM 场景的虚拟列表向上加载（本篇 VirtualList 的 scrollTop 修正）、水印防篡改（Watermark 攻防）、大文件上传（Upload 的分片与断点续传）——全景图里的场景级难题，多数的组件级答案在本篇 Part B。
- **《react-高阶场景-第二辑.md》（搭建器 + SaaS 三件套）**：搭建器的物料层就是一个组件库，主题 token 化（A9）是低代码换肤的地基，画布的事件边界（A6 capture 拦截）直接来自本篇内功。先有本篇，搭建器才有可拼装的物料。
- **《react-源码复刻大纲.md》（mini React）**：复刻过 hooks 实现后，本篇的多个"为什么"会自动解开——`defaultValue` 只消费一次是 `useState` 惰性初始化的直接推论，`useId` 的稳定性来自 fiber 的树位置算法，`forwardRef` 的存在原因在 React 19 ref prop 化后看得更清。反过来，本篇的组件行为（退出动画双状态机的卸载时序、Modal 的并发渲染安全）也是检验 mini React 完备度的考题。

六份文档合起来的完整闭环：**基础大纲给招式，本篇给道场（把招式炼成可发布的功力），进阶与全景给战场（复杂场景里用招式），源码复刻给内功心法（知道招式为什么成立）**。组件库作为"React 功力的试炼场"，试炼的从来不只是写组件——是 API 设计的抽象力、组件实现的细节力、工程化的全局力，三者齐备，才敢说"懂 React"。
