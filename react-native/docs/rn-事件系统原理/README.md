---
title: 模块六 · 事件系统原理
references:
  - 01-触摸事件链路与手势仲裁
  - 02-GestureHandler原理化
  - 03-滚动与列表事件
  - 04-动画系统原理
  - 05-键盘与TextInput链路
---

# 模块六 · 事件系统原理

> 触摸从指尖到 JS 回调要走多远；RN 如何在没有 DOM 事件流的平台上模拟出一套手势仲裁。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · 触摸事件链路与手势仲裁](01-触摸事件链路与手势仲裁.md) | 原生触摸 → 事件表 → JS；Responder System 的协商与仲裁 |
| [02 · Gesture Handler 原理化](02-GestureHandler原理化.md) | 识别与仲裁搬回原生、worklet 零过桥闭环——RNGH + Reanimated 的通道降级 |
| [03 · 滚动与列表事件](03-滚动与列表事件.md) | scrollEventThrottle 的真实含义、滚动阶段状态机、双平台嵌套滚动协议与下拉刷新链路 |
| [04 · 动画系统原理](04-动画系统原理.md) | Animated 值节点图、useNativeDriver 的下沉机制、Reanimated worklet——通道降级的终点 |
| [05 · 键盘与 TextInput 链路](05-键盘与TextInput链路.md) | 受控组件的击键往返、State 与 IME 组合态、键盘事件与双平台避让路线 |
