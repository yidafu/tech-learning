# shared —— 站群统一主题（唯一源头）

五站（architecture / js-ts / observability / react / security）共用的设计系统。
仓库刻意不做 workspaces（见根 README），因此共享物以**同步产物**形式进入各站：

| 源头 | 同步到各站 | 说明 |
|---|---|---|
| `theme/custom.css` | `src/css/custom.css` | 主色 `#2e7cf6` 蓝系、hero 渐变、卡片网格、callout、文档排版 |
| `theme/components/*.jsx` | `src/components/site/` | `SiteHero`（首页 hero）、`FeatureCardGrid` / `FeatureCard`（卡片） |
| `static/img/{logo,favicon}.svg` | `static/img/` | navbar logo 与 favicon 五站共用 |

## 改样式 / 组件的流程

1. 只改 `shared/` 下的源头文件；
2. `node shared/sync-theme.mjs`（幂等）；
3. 各站首页 `src/pages/index.js` 只写内容数据（卡片列表、按钮目标），结构统一走共享组件；
4. 提交同步产物（CI 不跑本脚本，各站必须自带副本）。

## 各站约定（config 层，改 config 时保持）

- `onBrokenLinks: 'warn'`、`markdown.format: 'detect'`、`onBrokenMarkdownLinks: 'warn'`
- navbar：站名 title + logo（`img/logo.svg`）+ 左侧本站导航 + 右侧「站群」dropdown（链接 landing 与兄弟站，绝对 URL）
- footer：`style: 'dark'` + 「站群导航」链接列 + `© ${年} yidafu · 站名 · 用 Docusaurus 构建`
- favicon：`img/favicon.svg`

## 注意事项

- architecture 的 `scripts/copy-samples.mjs` 在每次 build 前清理 `static/`，已改为只清理
  `static/第N阶段/` 生成目录，`static/img/` 不受影响——改该脚本时勿恢复全目录 `rmSync`。
