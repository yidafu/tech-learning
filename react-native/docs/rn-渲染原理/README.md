---
title: 模块五 · 渲染原理
references:
  - 01-三棵树与Reconciler
  - 02-Yoga布局引擎
  - 03-视图提交与批量挂载
  - 04-样式DPI与平台适配
---

# 模块五 · 渲染原理

> RN 不渲染 DOM，也不自绘像素——它把 React 的虚拟树翻译成原生控件树。三棵树与 Yoga 是本模块的主线。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · 三棵树与 Reconciler](01-三棵树与Reconciler.md) | Element Tree → Shadow Tree → Native View Tree；react-reconciler 的 RN 定制 |
| [02 · Yoga 布局引擎](02-Yoga布局引擎.md) | flexbox 如何在 C++ 中跨平台计算、布局线程与 mount 阶段 |
| [03 · 视图提交与批量挂载](03-视图提交与批量挂载.md) | createView / manageChildren 指令流；影子线程积攒、UI 线程按帧消费的操作合并 |
| [04 · 样式、DPI 与平台适配](04-样式DPI与平台适配.md) | 样式对象 → YGStyle 的无级联直通、逻辑/物理像素换算、@2x/@3x 与平台分支机制 |
