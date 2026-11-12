---
title: 模块七 · 新架构（JSI / Fabric / TurboModules）
references:
  - 01-JSI原理
  - 02-Fabric渲染管线
  - 03-TurboModules
  - 04-Codegen
  - 05-新旧架构对比与迁移
---

# 模块七 · 新架构（JSI / Fabric / TurboModules）

> 四件套分工：JSI 是通道、TurboModules 是模块系统、Fabric 是渲染管线、Codegen 是粘合剂。逐个拆开，最后对照旧架构收束。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · JSI 原理](01-JSI原理.md) | 引擎无关的 C++ 接口层；HostObject 如何实现同步直调 |
| [02 · Fabric 渲染管线](02-Fabric渲染管线.md) | C++ Shadow Tree、同步布局、commit / mount 两阶段与并发优先级 |
| [03 · TurboModules](03-TurboModules.md) | 懒加载实例化、双平台模块管理器与旧模块的 Interop 兜底通道 |
| [04 · Codegen](04-Codegen.md) | TS spec → C++ / Java / ObjC 绑定代码的 IDL 编译器；错误前移 + 绑定前移 |
| [05 · 新旧架构对比与迁移](05-新旧架构对比与迁移.md) | 六维对照表、bridgeless 数据流复盘、四步迁移路线与性能预期管理 |
