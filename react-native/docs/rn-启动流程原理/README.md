---
title: 模块二 · 启动流程原理
references:
  - 01-Android启动链路
  - 02-iOS启动链路与runApplication
  - 03-Bundle加载策略
  - 04-启动优化原理
---

# 模块二 · 启动流程原理

> App 图标点下去到首屏可交互之间发生了什么。两条平台链路各拆一遍，再回到 Bundle 加载与启动优化。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · Android 启动链路](01-Android启动链路.md) | MainActivity → ReactContext → CatalystInstance → 加载 Bundle → runApplication |
| [02 · iOS 启动链路与 runApplication](02-iOS启动链路与runApplication.md) | AppDelegate → RCTBridge → RCTRootView → JS 侧 AppRegistry.runApplication |
| [03 · Bundle 加载策略](03-Bundle加载策略.md) | dev 向 Metro 要活包、prod 读死文件；multi-bundle 与 RAM 的"懒加载"思想 |
| [04 · 启动优化原理](04-启动优化原理.md) | TTI 五段拆解模型、逐段手段表与 ReactMarker / RCTPerformanceLogger 度量方法 |
