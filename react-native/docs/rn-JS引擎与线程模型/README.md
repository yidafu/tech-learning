---
title: 模块三 · JS 引擎与线程模型
references:
  - 01-JS引擎对比与Hermes原理
  - 02-四线程模型
  - 03-Hermes深潜：字节码与GC
  - 04-同步与异步的边界
---

# 模块三 · JS 引擎与线程模型

> JS 跑在哪、怎么跑、和谁并行。引擎选型决定启动速度，线程模型决定一切性能归因的基础。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · JS 引擎对比与 Hermes 原理](01-JS引擎对比与Hermes原理.md) | JSC / Hermes / V8 三条路线的取舍；Hermes 字节码预编译为什么快 |
| [02 · 四线程模型](02-四线程模型.md) | JS / UI / Shadow / Native Modules 四线程的职责与协作时序 |
| [03 · Hermes 深潜：字节码与 GC](03-Hermes深潜：字节码与GC.md) | hbc 文件分区结构、无 JIT 的三重约束、Hades 并发 GC 与 Handle 体系 |
| [04 · 同步与异步的边界](04-同步与异步的边界.md) | 旧架构强制异步的结构根源、JSI 的同步常态、微任务与 rAF / InteractionManager 的线程语义 |
