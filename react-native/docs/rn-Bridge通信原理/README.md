---
title: 模块四 · Bridge 通信原理（旧架构）
references:
  - 01-Bridge本质与消息队列
  - 02-NativeModules调用链
  - 03-Bridge瓶颈量化
  - 04-跨语言通信的通用设计
---

# 模块四 · Bridge 通信原理（旧架构）

> 旧架构的心脏：一条异步、批量、JSON 序列化的消息通道。读懂它，就读懂了新架构为什么要出现。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · Bridge 本质与消息队列](01-Bridge本质与消息队列.md) | MessageQueue 的三个队列、批量刷队时机、JSON 序列化开销 |
| [02 · Native Modules 调用链](02-NativeModules调用链.md) | JS 代理生成、`@ReactMethod` 注册、双向调用与事件回传全流程 |
| [03 · Bridge 瓶颈量化](03-Bridge瓶颈量化.md) | 单次调用五段成本解剖、一帧预算沙盘与闭环塌方模型；spy / Perfetto / 微基准三件套 |
| [04 · 跨语言通信的通用设计](04-跨语言通信的通用设计.md) | 通道/序列化/线程/语义/契约五要素框架；WebView、Flutter、Electron 的同构演化路径 |
