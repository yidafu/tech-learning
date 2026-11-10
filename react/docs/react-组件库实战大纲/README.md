---
title: "React 组件库实战大纲：组件实现的功力清单"
references:
  - 01-引言-这份大纲在六份文档里的位置
  - 02-A1-受控-非受控双模式-30-行-hook-处处要用
  - 03-A2-弹层体系-Popover-Select-Tooltip-DatePicker
  - 04-A3-退出动画-难题-visible-mounted-双状态机
  - 05-A4-焦点管理
  - 06-A5-键盘导航与-ARIA
  - 07-A6-事件边界
  - 08-A7-SSR-与环境兼容
  - 09-A8-ref-体系与-API-生态
  - 10-A9-样式与主题方案选型
  - 11-Lv1-基础组件-打地基-练细节功力
  - 12-Lv2-弹层与反馈组件-功力主考场之一
  - 13-Lv3-复杂交互组件-公认最考功力
  - 14-DatePicker-日历是最苦的组件
  - 15-Table-中后台之王
  - 16-Tabs
  - 17-Collapse
  - 18-Tree
  - 19-Cascader-TreeSelect-Transfer
  - 20-Upload
  - 21-Carousel-Slider-Rate-ColorPicker
  - 22-水印-Watermark-攻防趣味题
  - 23-VirtualList-Anchor-Progress-等
  - 24-ConfigProvider-App-模式级
  - 25-Lv4-范式之争-组件之上的认知
  - 26-C1-仓库-pnpm-monorepo-components-hooks-tokens
  - 27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt
  - 28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic
  - 29-C4-测试-Vitest-Testing-Library-逐组件-Storybook
  - 30-C5-版本-changesets-自动-changelog-semver-纪律
  - 31-C6-兼容-browserslist-矩阵-SSR-hydrate-冒烟测试-React
  - 32-D1-Radix-UI-无样式组件的行为-无障碍实现-每个组件几百行-最易吸收
  - 33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark
  - 34-D3-shadcn-ui-cva-变体管理与现代形态
  - 35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA
---

# React 组件库实战大纲：组件实现的功力清单

> 定位：第五份文档。《基础大纲》阶段 3 只讲了组件设计模式，本章补全另一半：**组件库工程 + 每个组件的硬核考点**。
> 三层结构：Part A 通用内功（所有组件共享的硬技术，不先练这些，写任何复杂组件都会撞墙）→ Part B 组件清单（按功力分级，每个组件 = 考点 + 要点 + 对标）→ Part C 工程化（从 demo 到可发布的库）。
> 一句话：**组件库是 React 功力的试炼场——API 设计考抽象，组件实现考细节，工程化考全局。**

> 本文档原为单文件（11849 行），已按章节拆分为 35 个文件，从下方目录按顺序阅读。完整原件见 `完整版备份/`（仓库根目录，未纳入文档站），更早的精简大纲见 `大纲原件备份/`（仓库根目录，未纳入文档站）。

## 分章目录

- [01-引言-这份大纲在六份文档里的位置.md](01-引言-这份大纲在六份文档里的位置.md) — 引言：这份大纲在六份文档里的位置
- [02-A1-受控-非受控双模式-30-行-hook-处处要用.md](02-A1-受控-非受控双模式-30-行-hook-处处要用.md) — A1. 受控/非受控双模式（30 行 hook，处处要用）
- [03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md](03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md) — A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）
- [04-A3-退出动画-难题-visible-mounted-双状态机.md](04-A3-退出动画-难题-visible-mounted-双状态机.md) — A3. "退出动画"难题（visible/mounted 双状态机）
- [05-A4-焦点管理.md](05-A4-焦点管理.md) — A4. 焦点管理
- [06-A5-键盘导航与-ARIA.md](06-A5-键盘导航与-ARIA.md) — A5. 键盘导航与 ARIA
- [07-A6-事件边界.md](07-A6-事件边界.md) — A6. 事件边界
- [08-A7-SSR-与环境兼容.md](08-A7-SSR-与环境兼容.md) — A7. SSR 与环境兼容
- [09-A8-ref-体系与-API-生态.md](09-A8-ref-体系与-API-生态.md) — A8. ref 体系与 API 生态
- [10-A9-样式与主题方案选型.md](10-A9-样式与主题方案选型.md) — A9. 样式与主题方案选型
- [11-Lv1-基础组件-打地基-练细节功力.md](11-Lv1-基础组件-打地基-练细节功力.md) — Lv1 基础组件（打地基，练细节功力）
- [12-Lv2-弹层与反馈组件-功力主考场之一.md](12-Lv2-弹层与反馈组件-功力主考场之一.md) — Lv2 弹层与反馈组件（功力主考场之一）
- [13-Lv3-复杂交互组件-公认最考功力.md](13-Lv3-复杂交互组件-公认最考功力.md) — Lv3 复杂交互组件（公认最考功力） · Select（★★★★）——键盘+a11y+长列表三合一考题（本节起）
   - [14-DatePicker-日历是最苦的组件.md](14-DatePicker-日历是最苦的组件.md) — Lv3 复杂交互组件（公认最考功力） · DatePicker（★★★★★）——日历是最苦的组件
   - [15-Table-中后台之王.md](15-Table-中后台之王.md) — Lv3 复杂交互组件（公认最考功力） · Table（★★★★）——中后台之王
   - [16-Tabs.md](16-Tabs.md) — Lv3 复杂交互组件（公认最考功力） · Tabs（★★★）
   - [17-Collapse.md](17-Collapse.md) — Lv3 复杂交互组件（公认最考功力） · Collapse（★★☆）
   - [18-Tree.md](18-Tree.md) — Lv3 复杂交互组件（公认最考功力） · Tree（★★★★）
   - [19-Cascader-TreeSelect-Transfer.md](19-Cascader-TreeSelect-Transfer.md) — Lv3 复杂交互组件（公认最考功力） · Cascader / TreeSelect / Transfer（★★★☆）
   - [20-Upload.md](20-Upload.md) — Lv3 复杂交互组件（公认最考功力） · Upload（★★★★）
   - [21-Carousel-Slider-Rate-ColorPicker.md](21-Carousel-Slider-Rate-ColorPicker.md) — Lv3 复杂交互组件（公认最考功力） · Carousel / Slider / Rate / ColorPicker（★★★）
   - [22-水印-Watermark-攻防趣味题.md](22-水印-Watermark-攻防趣味题.md) — Lv3 复杂交互组件（公认最考功力） · 水印 Watermark（★★☆，攻防趣味题）
   - [23-VirtualList-Anchor-Progress-等.md](23-VirtualList-Anchor-Progress-等.md) — Lv3 复杂交互组件（公认最考功力） · VirtualList / Anchor / Progress 等（★★☆）
   - [24-ConfigProvider-App-模式级.md](24-ConfigProvider-App-模式级.md) — Lv3 复杂交互组件（公认最考功力） · ConfigProvider / App（模式级）
- [25-Lv4-范式之争-组件之上的认知.md](25-Lv4-范式之争-组件之上的认知.md) — Lv4 范式之争（组件之上的认知）
- [26-C1-仓库-pnpm-monorepo-components-hooks-tokens.md](26-C1-仓库-pnpm-monorepo-components-hooks-tokens.md) — C1. 仓库：pnpm monorepo（components / hooks / token / utils 分包），turbo 任务编排
- [27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md](27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md) — C2. 构建：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）
- [28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md](28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md) — C3. 文档：Storybook/dumi，MDX 用例即文档；视觉回归（Chromatic/Lost Pixel）；a11y 检查（axe 插件）
- [29-C4-测试-Vitest-Testing-Library-逐组件-Storybook.md](29-C4-测试-Vitest-Testing-Library-逐组件-Storybook.md) — C4. 测试：Vitest + Testing Library 逐组件；Storybook play function 交互测试
- [30-C5-版本-changesets-自动-changelog-semver-纪律.md](30-C5-版本-changesets-自动-changelog-semver-纪律.md) — C5. 版本：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）
- [31-C6-兼容-browserslist-矩阵-SSR-hydrate-冒烟测试-React.md](31-C6-兼容-browserslist-矩阵-SSR-hydrate-冒烟测试-React.md) — C6. 兼容：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测
- [32-D1-Radix-UI-无样式组件的行为-无障碍实现-每个组件几百行-最易吸收.md](32-D1-Radix-UI-无样式组件的行为-无障碍实现-每个组件几百行-最易吸收.md) — D1. **Radix UI**：无样式组件的行为/无障碍实现，每个组件几百行，最易吸收
- [33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark.md](33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark.md) — D2. **antd**：工程化与细节功力（Wave 波纹、两个汉字空格、Watermark 攻防、Tree 三态）
- [34-D3-shadcn-ui-cva-变体管理与现代形态.md](34-D3-shadcn-ui-cva-变体管理与现代形态.md) — D3. shadcn/ui：cva 变体管理与现代形态
- [35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA.md](35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA.md) — D4. WAI-ARIA Authoring Practices：所有键盘/ARIA 行为的唯一权威
