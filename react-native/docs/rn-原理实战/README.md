---
title: 模块十 · 原理实战
references:
  - 01-mini-react-native总览
  - 02-自定义TurboModule全流程
  - 03-Fabric原生组件开发
  - 04-调试工具链原理
  - 05-mini-react-native落地实现
  - 06-宿主工程与视图原语
  - 07-渲染器与更新管线
  - 08-布局器与上屏后端
  - 09-事件回路与收官自测
---

# 模块十 · 原理实战

> 检验原理理解的唯一标准是复刻。本模块以 mini-react-native 为主线，配合原生模块与组件的实战打通两端。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · mini-react-native 总览](01-mini-react-native总览.md) | 用 react-reconciler + JSI 手写一个能跑的"最小 RN"：目标与里程碑 |
| [02 · 自定义 TurboModule 全流程](02-自定义TurboModule全流程.md) | 从 TS spec 到双平台实现再到 JS 直调：原生侧埋点上报模块全流程实战 |
| [03 · Fabric 原生组件开发](03-Fabric原生组件开发.md) | Props / Event / State 三通道；圆形进度环组件的双平台实现 |
| [04 · 调试工具链原理](04-调试工具链原理.md) | Metro WebSocket 协议、Fast Refresh 模块替换机制、CDP 直连 Hermes 的断点调试 |
| [05 · mini-react-native 落地实现（M0–M5）](05-mini-react-native落地实现.md) | 里程碑逐级落地：N-API 替身 JSI、hostConfig、宿主侧布局器与真平台替换点 |
| [06 · 宿主工程与视图原语](06-宿主工程与视图原语.md) | M0–M1 全量工程：binding.gyp + mini_native.cc 全文、N-API↔JSI 对照、验收输出 |
| [07 · 渲染器与更新管线](07-渲染器与更新管线.md) | M2–M3 全量 hostConfig、diffProps 差量语义、批处理实验亲手造"帧" |
| [08 · 布局器与上屏后端](08-布局器与上屏后端.md) | M4–M5 两遍布局法全文、手工可验算的数值样例、dump/AppKit 双上屏后端 |
| [09 · 事件回路与收官自测](09-事件回路与收官自测.md) | 上行事件闭环（持久引用/队列/直调）、七道自测题与五道扩展挑战 |
