---
title: 模块八 · Metro 打包与热更新
references:
  - 01-Metro三阶段与Bundle结构
  - 02-热更新原理
  - 03-Metro配置与工程化
---

# 模块八 · Metro 打包与热更新

> Bundle 不是黑盒：它是一段可逐行阅读的 JS。读懂结构，热更新的差分与签名就自然清楚了。

## 已成文（模块篇目已全部成文）

| 篇目 | 一句话简介 |
|------|-----------|
| [01 · Metro 三阶段与 Bundle 结构](01-Metro三阶段与Bundle结构.md) | Resolution / Transformation / Serialization；`__d`/`__r` 模块封装剖析 |
| [02 · 热更新原理（CodePush / expo-updates）](02-热更新原理.md) | 沙盒换读取点 + bsdiff 差分 + 签名/回滚/灰度；两大方案对照与生命周期教训 |
| [03 · Metro 配置与工程化](03-Metro配置与工程化.md) | resolver / transformer / serializer 三段定制、monorepo 要点与"无 code-splitting"的结构性原因 |
