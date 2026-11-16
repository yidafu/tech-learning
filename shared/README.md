# shared —— 站群统一主题（唯一源头）

11 站（architecture / react / react-native / observability / compiler / js-ts /
browser / security / backend / webgl / gui）共用的设计系统。
仓库刻意不做 workspaces（见根 README），因此共享物以**同步产物**形式进入各站：

| 源头 | 同步到各站 | 说明 |
|---|---|---|
| `theme/custom.css` | `src/css/custom.css` | 版式层：hero 结构、卡片网格、callout、文档排版。**11 站逐字节相同，不含任何主色** |
| `brand/theme/<站名>.css` | `src/css/brand.css` | **各站主色**：由该站 Logo 色派生（浅色 / 深色 / hero 三档），`custom.css` 第一行 `@import` 它 |
| `theme/components/*.jsx` | `src/components/site/` | `SiteHero`（首页 hero）、`FeatureCardGrid` / `FeatureCard`（卡片） |
| `brand/sites/<站名>/` | `static/img/` | **各站独立** Logo / favicon（11 站各不相同），由 `brand/build.py` 生成 |

## Logo 与 favicon（各站独立）

标记系统见 `brand/brand-guide.pdf`（规范手册）。唯一源头是 `brand/build.py`，
各站 `static/img/` 下的产物**勿手改**，改完源头重跑即可：

```bash
python3 shared/brand/build.py      # 生成 11 站 SVG + 透明 PNG + brand-spec.json
python3 shared/brand/validate.py   # 结构 / 安全区 / 配色 / 对比度自检
node    shared/sync-theme.mjs      # 把 brand/sites/<站名>/ 分发到各站 static/img/
```

每站产出 `favicon.svg`（16px 简化图案）、`logo.svg`（主标）、`logo-small.svg`、
`logo-dark.svg`、`logo-mono.svg`；backend 另有 `app-icon.svg` 与 PWA / Apple 图标。

例外：`react` 与 `react-native` **直接使用官方标志**（源文件在 `brand/official/`，权利人
Meta Platforms, Inc.，几何与配色未改），因此**没有** `logo-mono.svg`——给他人商标做单色版
属于修改。这两站的图形本身相同（RN 官方标志就是 React 原子），只能靠描边/填充与色相区分。

⚠️ 历史坑：早期版本由 `shared/static/img/` 覆盖**全部**站点的 logo 与 favicon，
11 个站被迫共用同一个图标。改动 `sync-theme.mjs` 时不要退回那种写法。

## 文档主题色（各站不同）

主色不再是全局一个蓝，而是**从各站 Logo 的底板色派生**：色相与彩度不动，只把亮度
解到白底 4.55:1（Logo 底板是正白字压色块 3.9:1，直接当链接色不达 AA）。深色模式另解
一档到 `#1b1b1d` 上 4.55:1。规则、公式与 11 站实测对比度见手册「文档主题色」一页。

```bash
python3 shared/brand/build.py      # 同时输出 shared/brand/theme/<站名>.css
node    shared/sync-theme.mjs      # 分发为各站 src/css/brand.css
```

改动时注意：

- **不要在 `custom.css` 里写 `--ifm-color-primary`**，它会被同文件的 `@import` 顺序反压，
  且会让 11 站重新变回同一个颜色。
- Infima 的 `--ifm-color-primary-contrast-background/-foreground` 默认写死蓝，已在
  `brand.css` 里按主色 `color-mix` 派生；新增用到这两个变量的组件时不要写死颜色。
- `--brand-hero-from/mid/to` 固定在浅色那套（hero 自己就是深色面），深色模式不反转。

## 改样式 / 组件的流程

1. 只改 `shared/` 下的源头文件（颜色改 `brand/build.py`，版式改 `theme/custom.css`）；
2. `node shared/sync-theme.mjs`（幂等）；
3. 各站首页 `src/pages/index.js` 只写内容数据（卡片列表、按钮目标），结构统一走共享组件；
4. 提交同步产物（CI 不跑本脚本，各站必须自带副本）。

## 各站约定（config 层，改 config 时保持）

- `onBrokenLinks: 'warn'`、`markdown.format: 'detect'`、`onBrokenMarkdownLinks: 'warn'`
- navbar：站名 title + logo（`img/logo.svg`）+ 左侧本站导航 + 右侧「站群」dropdown（链接 landing 与兄弟站，绝对 URL）
- footer：`style: 'dark'` + **三列**站群导航（`前端与框架` / `架构与服务` / `底层与图形`，
  各站自站链接不出现）+ `© ${年} yidafu · 站名 · 用 Docusaurus 构建`；排布与断行由
  `theme/custom.css` 的「页脚」段负责（≤768px 折两列、≤520px 单列），改 config 时只填链接
- favicon：`img/favicon.svg`

## 注意事项

- architecture 的 `scripts/copy-samples.mjs` 在每次 build 前清理 `static/`，已改为只清理
  `static/第N阶段/` 生成目录，`static/img/` 不受影响——改该脚本时勿恢复全目录 `rmSync`。
