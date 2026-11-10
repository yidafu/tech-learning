---
title: "C3. 文档：Storybook/dumi，MDX 用例即文档；视觉回归（Chromatic/Lost Pixel）；a11y 检查（axe 插件）"
---
> 本文是《Part C：工程化（从 demo 到可发布）》按小节拆分后的续篇，上一部分见 [27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md](27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md)。
## C3. 文档：Storybook/dumi，MDX 用例即文档；视觉回归（Chromatic/Lost Pixel）；a11y 检查（axe 插件）

### 是什么：文档站的两个流派

- **Storybook**：框架无关的"组件工作台"。核心资产是 stories 文件——每个组件一组的可交互用例，左侧目录树按组件组织，右侧可以改 props、看不同视口、跑 a11y 检查。文档页由 stories 自动生成，再用 MDX 补充散文与排版。
- **dumi**：为组件库文档站而生（Umi/antd 生态出品，2.x 支持任意框架）。核心理念是 **Markdown 优先**：一个组件一篇 md，demo 直接写在 md 里（内嵌代码块即实时渲染的用例），配 API 表自动生成，产出形态就是国内开发者熟悉的"组件文档站"。

### 为什么 dumi 在国内组件库场景流行

1. **形态模板对位**：国内组件库文档的标准形态是"设计价值观 + 何时使用 + demo 网格 + API 表 + FAQ"，dumi 把这个三段式做成了开箱模板；Storybook 的 Docs 页则是"工作台优先"的形态，做对外文档站需要更多拼装。
2. **生态示范效应**：antd、arco、semi、TDesign 一脉的文档站心智，读者已经形成阅读习惯，换成 dumi 意味着零学习成本。
3. **demo 工程链路**：dumi 的 demo 就是源码目录里的 tsx 文件，构建、按需加载、类型检查与组件本体完全同构；antd 内部从组件源码到文档站的链路就是 father + dumi。
4. **中文文档与社区**：文档全中文、issue 中文响应，对企业内网组件库团队是实打实的成本项。

**选择建议**：重交互调试、要上视觉回归（Chromatic 与 Storybook 深度绑定）→ Storybook；文档站形态向 antd 看齐、样式链路走 less → dumi。小团队二选一即可，本篇示例以 Storybook 为主（后续的视觉回归与 play 测试都以它为载体）。

### 怎么做：MDX 用例即文档

Storybook 8 的 CSF3 写法（9 同为 CSF3，仅 addons 配置有差异，见下文注释）（`packages/components/src/button/button.stories.tsx`）：

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',     // 左侧目录树的位置
  component: Button,
  args: { children: '确定' },      // 默认参数：下面所有 story 自动继承
  parameters: {
    layout: 'centered',           // 居中展示，避免整页白板
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// 每个 story = 一个"用例"：一个具体状态下的组件快照
export const Primary: Story = { args: { variant: 'primary' } };
export const Loading: Story = { args: { loading: true, children: '提交' } };
export const Danger: Story = { args: { danger: true, children: '删除' } };
```

stories 会自动聚合成 Docs 页（表格化的控件面板 + 每个 story 一个画布）。需要自定义文档叙事时用 MDX（`button.mdx`）：

```mdx
import { Canvas, Controls, Story } from '@storybook/blocks';
import * as ButtonStories from './button.stories';

# Button 按钮

按钮用于开始一个即时操作。加载中时按钮保持原宽度，防止文案变化导致的布局抖动（Lv1 细节考点）。

## 何时使用

- 操作立即生效、无需二次确认时；
- 危险操作建议配合 `danger` 变体并在视觉上与主操作分离。

## 用法

<Story of={ButtonStories.Primary} />

<Controls />
```

dumi 的等价写法（md 内嵌 demo，代码块即实时用例）：

````markdown
# Button 按钮

按钮用于开始一个即时操作。

## 何时使用

- 操作立即生效、无需二次确认时。

```tsx
import { Button } from '@react-ui/components';

export default () => <Button variant="primary">确定</Button>;
```
````

**用例即文档的纪律**：文档里出现的每个用例都必须是可运行的 story/demo 文件（而非截图或手写代码块）；组件 API 的每个分支（受控/非受控、加载态、危险态）至少一个用例。这样文档与代码在同一 PR 里演进，永不脱节——这也是 C4 "用例即测试"的地基。

monorepo 中 Storybook 装在 `apps/docs`，`.storybook/main.ts` 用 glob 扫描各包的 stories：

```ts
// apps/docs/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../../packages/*/src/**/*.stories.@(ts|tsx)'], // 扫描所有包的 story
  // 注意：addon-essentials 是 Storybook 8 的聚合包；9 起已拆分移除，
  // 需按需安装 addon-docs / addon-controls / addon-actions 等单个包
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

### 视觉回归：原理与流程

**是什么**：把每个 story 渲染成像素级截图，与基准图（baseline）逐像素比对，差异超阈值即失败。它兜住的是**没有人为断言的外观回归**——组件测试（C4）断言行为，测不出"某次重构让 Modal 的 padding 从 16 变成 12"、"token 误改导致全局圆角变化"这类问题。

**原理流程（五步）**：

1. CI 在 PR 上构建静态 Storybook（`storybook build` → `storybook-static/`）；
2. runner 读取产物里的 `index.json`（所有 story 的清单），在无头浏览器里逐个打开 story；
3. 等待渲染稳定（字体加载完成、异步数据到位、动画关闭）后按固定视口截图；
4. 每张截图与 baseline 逐像素 diff，差异像素占比超过阈值标记为"变更"；
5. 有权限者在 PR 界面逐张审查 diff：接受（成为新 baseline）或拒绝（打回修改）。

**Chromatic（云端方案）**：baseline、diff 审查界面、跨浏览渲染全在云端，与 GitHub PR 集成最深。GitHub Actions 接入：

```yaml
# .github/workflows/chromatic.yml
name: Visual Tests
on: [pull_request]
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # Chromatic 需要 git 历史来判定"哪些 story 受本次改动影响"
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook   # action 在仓库内执行该脚本构建静态站
          exitZeroOnChanges: false           # 有未接受的视觉变更时让 CI 失败（默认 false，显式写出便于理解）
```

**Lost Pixel（开源自托管方案）**：baseline 以图片文件形式入库（`.lostpixel/baseline/`），diff 在 CI 本地跑，适合不能把 UI 截图传第三方的企业场景。`lost-pixel.config.ts`：

```ts
// lost-pixel.config.ts（Lost Pixel v2 API）
import { CustomProjectConfig } from 'lost-pixel';

export const config: CustomProjectConfig = {
  storybookShots: {
    storybookUrl: './storybook-static', // 直接读静态构建产物，CI 里不必起 dev server
  },
  generate: {
    failOnDifference: true, // 有差异即失败
    beforeScreenshot: async (page) => {
      // 截图前关闭所有动画与过渡：这是视觉回归误报治理的第一课
      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }`,
      });
    },
  },
  differenceThreshold: 0.1, // 单像素颜色差异容忍度（0~1），吸收字体抗锯齿级的噪声
};
```

CI 命令（Lost Pixel v2 的三段式）：

```bash
# 1. 渲染当前所有 story 的截图
pnpm dlx lost-pixel generate shots
# 2. 与入库的 baseline 比对，有差异则非零退出
pnpm dlx lost-pixel
# 3. 确认差异为预期变更后，更新基准并随 PR 提交
pnpm dlx lost-pixel update baseline
```

**baseline 更新策略（纪律比工具重要）**：

- baseline 的变更必须**随 PR 显式提交**（Lost Pixel 入库图片；Chromatic 云端记录到具体 commit），PR 审查时 diff 图与代码一起看——"改了什么代码、导致哪些像素变化"是 reviewer 的固定检查项。
- **严禁**在 CI 里自动 accept 全部差异（"红了就全量更新 baseline"会把真回归连同误报一起吞掉）。
- 谁改 UI，谁在同一 PR 里更新 baseline 并在描述里说明原因。

**误报治理（没有这套治理，团队两周就会把视觉回归关掉）**：

| 误报源 | 症状 | 治理 |
|---|---|---|
| CSS 动画/过渡 | 同一 story 两次截图不同，diff 区域随机 | 截图前注入 `animation/transition: none`（上面 beforeScreenshot 已示范；Chromatic 自动暂停大部分动画） |
| 字体加载时序 | 文字区域整体闪烁性差异 | CI 环境固定字体版本；截图前等待 `document.fonts.ready` |
| 时间/日期 | DatePicker/倒计时类组件每次 diff | story 里 mock 固定时间（`Date` 固定到某常量），数据写死不随机 |
| 容器尺寸漂移 | 视口或父容器宽高不同导致整页 diff | story 用固定尺寸容器包裹；视口与 DPR 固定在配置里 |
| 亚像素渲染差异 | 1px 边缘的细碎噪点 | differenceThreshold/Lost Pixel 容忍度或 Chromatic 的像素阈值 |
| 本地与 CI 环境差异 | 本地绿、CI 红 | 以 CI 为准绳；CI 用固定 Docker 镜像保证字体与渲染栈一致 |

### a11y 检查：@storybook/addon-a11y 跑 axe

**是什么**：addon-a11y 在每个 story 上运行 [axe-core](https://github.com/dequelabs/axe-core) 规则引擎，把无障碍违例直接标红在文档面板里；配合 test-runner 可以把违例升级为 CI 失败。它免费覆盖 Part A 里 A5（键盘与 ARIA）的大部分"可机检"规则——键盘模型对不对仍要人工/play 测试，但 role 缺失、标签未关联、对比度不足这些可以机器兜底。

**接入**：addon 已在上文 `main.ts` 中注册，参数在 `preview.ts` 配置：

```ts
// apps/docs/.storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      config: {
        rules: [
          // 显式关闭个别规则必须写清原因并给恢复计划；严禁全局禁用 axe
          { id: 'color-contrast', enabled: false }, // 例：暗色主题 token 调整中，issue #123 修复后移除
        ],
      },
      options: {},
    },
  },
};

export default preview;
```

**升级为 CI 失败**：`@storybook/test-runner`（0.9 起）对每个 story 自动跑 axe，违例即失败：

```bash
# CI 中的完整链路：构建静态站 → 起静态服务 → 逐 story 断言渲染无错 + a11y 通过
pnpm --filter docs exec storybook build
npx http-server storybook-static --port 6006 --silent &
npx wait-on tcp:6006
pnpm --filter docs exec test-storybook
```

**axe 常见违例与修法（组件库高频 Top 5）**：

1. `button-name`：图标按钮没有可访问名。**修法**：Icon-only Button 必须有 `aria-label` 或内部隐藏文本 `<span class="sr-only">删除</span>`。
2. `nested-interactive`：交互元素嵌套（`<a>` 里放 `<Button>`，Card 可点击又内含按钮）。**修法**：调整 DOM 结构——外层用普通元素铺点击区，按钮独立平级；这是 Card/Tooltip 类组件设计的硬约束。
3. `label`：表单控件无关联标签。**修法**：Input 的 `label htmlFor` 指向 `input id`，id 用 `useId` 生成（A7：hydration 安全）。
4. `aria-hidden-focus`：对包含焦点元素的子树设置了 `aria-hidden`（常见于 Modal 打开时给背景加 aria-hidden，但焦点还没移进弹窗）。**修法**：打开弹窗的**同一个 tick** 内把焦点移入弹窗（A4 焦点陷阱的职责），再隐藏背景。
5. `color-contrast`：文字与背景对比度不足 4.5:1。**修法**：调 token 灰阶，而不是关规则——这条规则被违反往往意味着设计 token 本身不达标。

### 常见坑

1. **症状**：视觉回归在 CI "全红"，本地却看不到差异。**根因**：CI 容器字体与本地不同（抗锯齿渲染路径不同），所有含文字的截图整片 diff。**修法**：CI 镜像安装与本地一致的字体集，或统一走云端（Chromatic 自带固定渲染环境）；短期可用 differenceThreshold 吸收。
2. **症状**：story 里组件每次截图位置/大小都不同。**根因**：story 外层容器没有约束（auto 布局 + 异步内容）。**修法**：`layout: 'centered'` 或固定尺寸 wrapper；异步数据在 story 层 await 完成（用 loaders 或 play 前置步骤）。
3. **症状**：a11y 检查全绿，但读屏用户体验仍很差。**根因**：axe 只测"可机检规则"，键盘模型（Tab 顺序、方向键行为、typeahead）不在其覆盖内。**修法**：键盘行为用 C4 的 play function 写成交互测试，axe 当第一道闸而不是唯一一道。

### C3.1 Docusaurus 与 Storybook 的分工：教程站与组件工作台各放什么

**是什么**：先点破——本大纲站点本身就是 Docusaurus 搭的（你正在读的页面就是证明）。组件库的文档体系因此是两层：**Docusaurus 教程站**（怎么接入、怎么选主题、怎么迁移、更新日志——长 prose、SEO、版本化快照）+ **Storybook 组件工作台**（每个组件全部可交互用例、Controls 调参、a11y 面板、视觉回归 baseline）。正文讲的 Storybook vs dumi 是"组件工作台层"的二选一；本节讲的是教程站与工作台**之间**的分工——dumi 也能兼任教程站，但视觉回归与 test-runner 链路（本文件上文与 C4）在 Storybook 一侧最深。

**为什么难**：两边都能写组件说明，API 表双份必漂移；iframe 嵌入有一串体验陷阱（高度、主题、字体）；导航割裂——用户在教程里看到 Button 想调下 props，却被链接甩到另一个站点。

**机制分步**：

1. **四问判据**决定内容落点：

| 问题 | 答"是"→ | 答"否"→ |
|---|---|---|
| 需要运行真实组件并交互吗？ | Storybook story | Docusaurus 页面 |
| 需要进 CI 回归（视觉/play/a11y）吗？ | Storybook（baseline 资产） | Docusaurus |
| 是长 prose / 需要 SEO / 面向"评估者"？ | Docusaurus | Storybook Docs |
| 需要按版本冻结快照吗？ | Docusaurus versioning（C3.4） | Storybook（current 即开发版） |

落位示例：快速上手、主题定制指南、SSR 接入、迁移指南、changelog → Docusaurus；组件 API 表、props 矩阵、无障碍演示、视觉 diff → Storybook。

2. **嵌入模式**：Storybook 静态站有个专门给 iframe 用的页面 `iframe.html`，URL 形如 `/storybook/iframe.html?id=<storyId>&viewMode=story`（无工具栏、纯净画布）；storyId 是 `<目录>--<story 名>` 的 kebab-case（如 `components-button--primary`）。
3. **唯一真源纪律**：组件 API 表只活在 Storybook autodocs（C3.2）里；Docusaurus 教程页放文字 + `<StoryFrame/>` + 链接，**不复制表格**。
4. **主题对齐**：Storybook 的 preview 引同一份 token css、背景色对齐文档站——iframe 内外一个视觉，读者感知不到边界。

**完整配置代码**：

`apps/docs/src/components/StoryFrame.tsx`（Docusaurus 页面里嵌一个"活"的 story）：

```tsx
// apps/docs/src/components/StoryFrame.tsx
// storyId 格式见机制第 2 步；major 参数用于版本化文档（C3.4 坑 3）
export function StoryFrame({
  id,
  height = 240,
  major,
}: {
  id: string;
  height?: number;
  major?: number;
}) {
  const base = major ? `/storybook/v${major}` : '/storybook';
  return (
    <iframe
      src={`${base}/iframe.html?id=${id}&viewMode=story`}
      title={`story: ${id}`}
      loading="lazy"
      style={{ width: '100%', height, border: '1px solid var(--ifm-color-border)' }}
    />
  );
}
```

MDX 里的用法：

```mdx
import { StoryFrame } from '@site/src/components/StoryFrame';

## 按钮

操作立即生效时使用。

<StoryFrame id="components-button--primary" height={200} />
```

同域部署（一个 CI 产物装下两个站，天然避开跨域）：

```yaml
# .github/workflows/docs.yml 节选
- run: pnpm --filter docs exec docusaurus build
- run: pnpm --filter docs exec storybook build -o ../../apps/docs/build/storybook --test
```

Storybook 侧的主题对齐（`apps/docs/.storybook/preview.ts` 追加）：

```ts
import '@react-ui/token/colors.css'; // 同一份 token：iframe 内外一个色板（A9 的方案）

const preview: Preview = {
  parameters: {
    backgrounds: { default: 'docs', values: [{ name: 'docs', value: '#ffffff' }] },
  },
};
export default preview;
```

**坑**：

1. **症状**：iframe 高度塌陷或出现"滚动条套滚动条"。**根因**：story 无约束布局（auto 高度）+ viewMode 没锁定。**修法**：`viewMode=story`（无 Docs 工具栏）；StoryFrame 固定 height；长列表类组件在 story 内部限高（`maxHeight` + 内滚）。
2. **症状**：Storybook 部署在另一域名，字体闪变、部分企业内网 iframe 被拦。**根因**：跨域。**修法**：同域子路径部署（上面 `storybook build -o .../build/storybook` 的方案天然同域）。
3. **症状**：Docusaurus 页面里手抄了一份 props 表，两周后与实现漂移。**根因**：双份真源。**修法**：API 表唯一真源在 autodocs；页面只放 `<StoryFrame/>` 与链接（机制第 3 步的纪律）。
4. **症状**：MDX 里用 `<StoryFrame/>` 构建报 `window is not defined`。**根因**：iframe 标签本身 SSR 安全（输出的是字符串属性），报错的多半是外包的自定义逻辑读了 `window`/`location`。**修法**：那部分逻辑用 `<BrowserOnly>` 包裹（C3.3 同款修法）。

### C3.2 CSF 深入：故事即测试用例、args 组合矩阵与 docs 集成

**是什么**：CSF 的 story 本质是**数据**（component + args + parameters + render），不是"页面代码"。所以同一份 story 文件能被多个 runner 消费：

| 消费者 | 用途 | 出处 |
|---|---|---|
| Storybook UI | 渲染、Controls 调参 | 本文件上文 |
| Docs/autodocs | 自动生成 API 文档 | 本节 |
| test-runner | 渲染无错断言 + axe + play 交互测试 | [29-C4](29-C4-测试-Vitest-Testing-Library-逐组件-Storybook.md)（play 的完整写法与 CI 链路在此，不重复） |
| Chromatic / Lost Pixel | 视觉回归截图 | 本文件上文 |
| Vitest（portable stories） | story 直接变组件测试用例 | 本节 |

**为什么难**：props 组合爆炸靠手写 story 必漏角——`loading + disabled` 叠加、`size × variant × 状态` 矩阵，漏掉的角在重构时最先坏；docs 的质量与测试的覆盖都建立在"story 组织得好"上，矩阵化是规模化的钥匙。

**机制分步**：

1. **数据本质**：story 不执行任何东西，只描述"组件 + 这一组 args"。这让生成、遍历、复用都成为普通的数据操作。
2. **args 组合矩阵**：用代码生成组合清单，一条 render 把全部组合画成网格——视觉回归**一张截图覆盖整个矩阵**，play 测试可按可访问名逐格断言（C4）。若必须让每个组合成为独立 story（便于单独定位失败），用**代码生成静态 stories 文件**（codegen 进仓库），不要在模块运行时循环挂 export——ESM 的导出是静态的，运行时动态挂不进索引。
3. **覆盖率纪律**：每个 boolean prop 的 true/false 至少各出现一次；高频交互组合优先（用户真会撞上的叠加态）。
4. **docs 集成**：meta 上 `tags: ['autodocs']` 自动生成 Docs 页（C3.1 的"API 表唯一真源"落点）；`argTypes` 控制 Controls 面件的呈现（control 类型错了面板就是一排乱控件）；options 数组用 `satisfies` 与组件类型锁死，防止文档能选出不存在的值。
5. **portable stories**：Vitest 里 `setProjectAnnotations`（把 preview 的 decorators/parameters 带进来）+ `composeStories` 把 story 变测试用例，与 C4 的 play function 组合成"文档即测试"的完整闭环。

**完整配置代码**：

`button.stories.tsx`（正文 CSF3 样板的完整化：autodocs + argTypes + 矩阵）：

```tsx
// packages/components/src/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { Button } from './button';

// options 与组件的真实类型锁死：Button 的 variant 若加档，这里编译期就红
const variants = ['primary', 'dashed', 'text'] as const satisfies readonly NonNullable<
  ComponentProps<typeof Button>['variant']
>[];

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'], // 自动生成 Docs 页：API 表唯一真源（C3.1）
  args: { children: '确定' },
  argTypes: {
    variant: { control: 'radio', options: [...variants] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    onClick: { action: 'clicked' },
    // 内部实现细节不进文档表
    internalId: { table: { disable: true } },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// 手写的"代表作"story：docs 叙事骨干
export const Primary: Story = { args: { variant: 'primary' } };
export const Loading: Story = { args: { loading: true, children: '提交' } };

// 组合矩阵：一个 story 渲染全部组合网格
// 视觉回归一张截图覆盖 3 × 4 = 12 种组合；play 可按可访问名逐格断言（C4）
type Combo = { label: string; args: ComponentProps<typeof Button> };
const states = [
  { key: 'default', args: {} },
  { key: 'loading', args: { loading: true } },
  { key: 'disabled', args: { disabled: true } },
  { key: 'loading-disabled', args: { loading: true, disabled: true } },
] as const;

const combos: Combo[] = [];
for (const variant of variants) {
  for (const state of states) {
    combos.push({ label: `${variant}-${state.key}`, args: { variant, ...state.args } });
  }
}

export const Matrix: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, max-content)' }}>
      {combos.map(({ label, args: comboArgs }) => (
        <Button key={label} {...args} {...comboArgs}>
          {label}
        </Button>
      ))}
    </div>
  ),
};
```

Vitest 侧复用（portable stories）：

```ts
// packages/components/src/setup-tests.ts（vitest.config 的 setupFiles 指向它）
// preview 建议抽到共享位置（如 @react-ui/test-utils），避免包反向依赖 apps
import { setProjectAnnotations } from '@storybook/react';
import * as preview from '../../apps/docs/.storybook/preview';

setProjectAnnotations(preview);
```

```tsx
// packages/components/src/button/button.test.tsx —— story 直接变测试用例
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import * as stories from './button.stories';

const { Primary, Matrix } = composeStories(stories);

test('Primary story 可渲染且文案正确', () => {
  render(<Primary />);
  expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
});

test('组合矩阵 12 种全部在场', () => {
  render(<Matrix />);
  expect(screen.getAllByRole('button')).toHaveLength(12);
});
```

**坑**：

1. **症状**：autodocs 的 Controls 全是 any、args 无类型推导。**根因**：meta 没写 `Meta<typeof Button>`。**修法**：泛型永远带上（正文样板的写法）；argTypes 的 options 再用 `satisfies` 与组件类型锁一遍（上面代码）。
2. **症状**：矩阵 story 的视觉回归频繁误报。**根因**：网格里混入了异步/动态内容，回到上文"误报治理"的问题域。**修法**：矩阵内全部静态化（时间与随机源 mock），动态场景单独成 story 并配 loader。
3. **症状**：composeStories 渲染的组件缺了全局 decorator（如 ConfigProvider 主题）。**根因**：Vitest 进程没有加载 Storybook 的 preview 配置。**修法**：setupFiles 里 `setProjectAnnotations`（上面 setup-tests.ts）。
4. **症状**：想运行时循环生成多个 export 的 story，Storybook 里不出现。**根因**：ESM 导出是静态的，运行时挂到模块对象上进不了 CSF 索引。**修法**：单 story + render 网格（上面的 Matrix），或 codegen 生成静态 stories 文件进仓库（机制第 2 步）。

### C3.3 可交互 playground：live editor 的编译时与运行时取舍

**是什么**：live playground 的两种实现路线——**编译时**（构建期把 demo 代码编译成真实组件：Storybook story、dumi 的 md 内嵌 demo 都是这一类；浏览器零编译负担，但读者改不了代码）与**运行时**（浏览器现场编译：react-live 是单文件/表达式级，Sandpack 是完整工程级）。本站点自身的 `jsx live` 代码块（`@docusaurus/theme-live-codeblock`）与 react-live 4.x 的硬规则，在[《写作指南-MDX-与在线代码块》](../写作指南-MDX-与在线代码块.mdx)已详细展开；Sandpack 的基础形态在《高阶场景全景图》[07-D-大型应用架构](../react-高阶场景全景图/07-D-大型应用架构.md)的 D4 已写。本节只写组件库文档语境的三块增量：**选型决策、SSR 兼容、沙箱里加载组件库本体**。

**为什么难**：教学价值（可改代码）与工程代价（编译器体积、SSR、依赖解析）直接冲突；组件库文档还有第三难：沙箱里的组件库必须是"真身"，否则文档与实现漂移。

**机制分步**：

1. **决策表**：

| 维度 | 编译时（story / dumi demo） | 运行时（react-live / Sandpack） |
|---|---|---|
| 读者改代码 | 不能 | 能（教学价值核心） |
| 站点体积 | 零额外成本 | 背一个编译器：百 KB 级（react-live）到 MB 级（Sandpack 全栈） |
| SSR/SSG | 天然安全（构建期完成） | 需 BrowserOnly + 客户端水合 |
| 依赖解析 | 构建器全能力（alias 到库源码） | react-live 无模块系统（scope 单通道）；Sandpack 走 npm CDN |
| 错误呈现 | 构建失败（作者侧拦截，读者永远看不到坏示例） | 运行时报错 UI（读者侧可接受） |

结论：**教程里"看得懂"的示例用编译时；"上手练"的练习页用运行时**——按页面目的混用，不是全站二选一。
2. **react-live 路线**：scope 是沙箱里唯一的依赖通道——demo 代码不能写 import（react-live 硬规则，详见写作指南），组件从 scope 注入；scope 的组件库通过 alias 指向**源码**，demo 与实现同步演进、无需发版。
3. **Sandpack 路线**：`customSetup.dependencies` 从 npm CDN 拉依赖，演示的天然是"已发布版本"；要演示开发中版本，把 esm 产物作为虚拟文件注入 files（一条 re-export 文件即可），或等发版。
4. **SSR 兼容**：Docusaurus 是 SSG，编译器与预览组件是纯浏览器动物——`BrowserOnly` 包裹，服务端输出静态代码块作 fallback，编辑器与预览客户端水合后才出现。

**完整配置代码**：

`LiveDemo.tsx`（Docusaurus 里安全地跑 react-live）：

```tsx
// apps/docs/src/components/LiveDemo.tsx
import BrowserOnly from '@docusaurus/BrowserOnly';
import { LiveProvider, LiveEditor, LivePreview, LiveError } from 'react-live';
import * as UI from '@react-ui/components';

// scope 是沙箱唯一的依赖通道（机制第 2 步）；组件来自 alias 指向的库源码
const scope = { Button: UI.Button, Modal: UI.Modal, Select: UI.Select };

export function LiveDemo({ code }: { code: string }) {
  return (
    // SSG 阶段输出静态代码块（fallback），浏览器水合后才出现编辑器与实时预览
    <BrowserOnly fallback={<pre>{code}</pre>}>
      {() => (
        <LiveProvider code={code} scope={scope}>
          <LivePreview />
          <LiveEditor />
          <LiveError />
        </LiveProvider>
      )}
    </BrowserOnly>
  );
}
```

docusaurus.config.js 的源码 alias（demo 永远跑在组件库源码上，文档与实现零漂移）：

```js
// apps/docs/docusaurus.config.js 节选
import path from 'node:path';

/** @type {import('@docusaurus/types').Config} */
const config = {
  // ...
  webpack: {
    js: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-ui/components': path.resolve(__dirname, '../../packages/components/src'),
      };
      return config;
    },
  },
};

export default config;
```

Sandpack 演示"已发布版本"（与 react-live 的"开发中版本"互补）：

```tsx
import { Sandpack } from '@codesandbox/sandpack-react';

// dependencies 走 npm CDN：读者看到的就是线上版本的行为
<Sandpack
  template="react-ts"
  customSetup={{ dependencies: { '@react-ui/components': '^2.1.0' } }}
  files={{
    '/App.tsx': `import { Button } from '@react-ui/components';

export default function App() {
  return <Button variant="primary">确定</Button>;
}`,
  }}
/>
```

**坑**：

1. **症状**：`pnpm docusaurus build` 报 `window is not defined` 或线上 hydration mismatch。**根因**：编译器/预览组件在 SSG 阶段执行。**修法**：`BrowserOnly` 包裹（上面 LiveDemo 的结构）；fallback 给静态代码块，SEO 与首屏都不损失。
2. **症状**：demo 代码里写 `import { Button } from ...` 直接 SyntaxError。**根因**：react-live 无模块系统，import 不是它能编译的语法。**修法**：组件走 scope 注入、demo 只写 JSX 表达式（noInline 的两种模式与限制详见写作指南）。
3. **症状**：playground 里组件报 "Invalid hook call"。**根因**：沙箱里出现两份 React——scope 注入的组件库意外带了另一份 react。**修法**：库侧 peer 外部化（C2 tsup 的 external）+ 文档站 alias 保证单例；这与 C1.3 坑 2 的双实例 Context 是同族问题。
4. **症状**：live demo 的代码与 Storybook 的示例渐渐不一致。**根因**：同一段示例手抄了两份。**修法**：live 的 code 从 story/组件 demo 文件 import 进 MDX（MDX 可引用变量），单一真源；手抄第二份的那天就是漂移的开始。

### C3.4 文档版本化：Docusaurus versioning 与组件库版本对齐

**是什么**：Docusaurus 内置版本化——`docs/` 目录永远是 current（下一版/开发中）；`docusaurus docs:version 3.0` 把 current 快照固化到 `versioned_docs/version-3.0/` 并生成独立 sidebar，navbar 出现版本下拉。组件库发 major 时切一次，让"用户看哪个版本的文档"与"用户装哪个版本的包"对齐。

**为什么难**：用户"看 v2 文档、装 v3 包"的错位是支持成本的大头；切版本频率要克制（minor 也切会让版本下拉爆炸）；changelog 双份手写必漂移；旧版页面里的 demo 若引用了新 API，会直接误导停留在旧版本的用户。

**机制分步**：

1. **cut 的快照语义**：`versioned_docs/` 是冻结快照，后续改动只进 current；旧版文档的 hotfix 修正必须显式双写（cherry-pick 到 versioned 目录）。
2. **只对 major 切**，与 C5 的发版节奏对齐：major 发布的同一条流水线里追加 `docs:version` 步骤（配置见下）——文档版本与包版本出自同一个 PR，不存在"发了包忘切文档"的窗口。minor 的文档增量只进 current（读者默认看最新稳定版的文档快照 + current 的滚动更新）。
3. **changelog 单源**：changesets 生成的 `packages/*/CHANGELOG.md` 是唯一真源，构建期同步成 Docusaurus 页面（脚本见下），不在文档站里手写第二份。
4. **旧版 demo 策略**（三选一，按成本升序）：旧版页面的 `<StoryFrame>` 传 `major` 指向对应版本的 Storybook 静态实例（部署 `/storybook/v2/`、`/storybook/v3/`，StoryFrame 已留了参数）；或旧版页面用 Sandpack 固定旧版本号（C3.3 的"已发布版本"模式）；最低成本是旧版页面降级为静态截图。
5. **版本差异标注**：新特性页面用 admonition 标注引入版本（`:::note v3.2 起支持 :::`）；`versions` 配置里给旧版本挂 banner（unmaintained/deprecated）。

**完整配置代码**：

`apps/docs/docusaurus.config.js` 节选：

```js
const config = {
  presets: [
    [
      'classic',
      {
        docs: {
          versions: {
            current: { label: 'v3（开发中）', path: 'next' },
            '2.0': { label: 'v2.0', banner: 'unmaintained' }, // 旧版横幅：停留有成本，引导升级
          },
        },
      },
    ],
  ],
  navbar: {
    items: [{ type: 'docsVersionDropdown', position: 'left' }],
  },
};
export default config;
```

`apps/docs/package.json` scripts：

```json
{
  "scripts": {
    "docs:version": "docusaurus docs:version",
    "sync:changelogs": "node scripts/sync-changelogs.mjs"
  }
}
```

发版流水线对齐（追加到 C5 的 release workflow 的 publish 之后）：

```yaml
- name: Cut docs version (major only)
  run: |
    MAJOR=$(node -p "require('./packages/components/package.json').version.split('.')[0]")
    if [ ! -d "apps/docs/versioned_docs/version-${MAJOR}.0" ]; then
      cd apps/docs && pnpm docs:version "${MAJOR}.0" && cd ../..
      git config user.name "release-bot" && git config user.email "bot@example.com"
      git add apps/docs/versioned_docs apps/docs/versioned_sidebars apps/docs/docusaurus.config.js
      git commit -m "docs: cut version v${MAJOR}.0" && git push
    fi
```

changelog 同步脚本：

```js
// apps/docs/scripts/sync-changelogs.mjs —— changesets 的 CHANGELOG.md 是唯一真源
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PKGS = ['components', 'hooks', 'token', 'utils'];

for (const pkg of PKGS) {
  const md = await readFile(join('..', '..', 'packages', pkg, 'CHANGELOG.md'), 'utf8');
  const target = join('docs', 'changelog', pkg);
  await mkdir(target, { recursive: true });
  // MDX 会把裸的 <T> 当 JSX 解析：变更描述里的尖括号必须留在代码块内（changesets 正文本就如此）
  await writeFile(
    join(target, 'index.md'),
    `---\ntitle: "@react-ui/${pkg} 更新日志"\nsidebar_position: 1\n---\n\n${md}`,
  );
  console.log(`synced: ${pkg}`);
}
```

在 `docusaurus build` 前跑 `pnpm --filter docs run sync:changelogs`（进 CI，不进 git——产物不落库）。

**坑**：

1. **症状**：版本下拉里二十多个版本，没人找得到要看的那个。**根因**：minor/patch 也执行了 cut。**修法**：只 major cut（上面流水线的判断就是为此）；中间版本的文档差异靠 current 的滚动更新 + changelog 页面兜住。
2. **症状**：直接在 `versioned_docs/` 里改错字，下个版本发布时改动"消失"。**根因**：versioned 是快照，下一次 cut 从 current 重新生成（git 历史里能找回，但体验是"丢"）。**修法**：改动永远先落 current，再 cherry-pick 到对应 versioned 目录（两个 diff 在同一个 PR 里过审）。
3. **症状**：旧版文档页面里的 `<StoryFrame>` 播放着最新版组件的 demo——v2 用户看到 v3 才有的行为。**根因**：Storybook 只有 current 一个实例。**修法**：按 major 部署多个 Storybook 静态实例，`StoryFrame` 传 `major` 拼路径（C3.1 的组件已留参数）；实例数随仍在维护的 major 数走。
4. **症状**：文档站上的 changelog 与 GitHub releases 各说各话。**根因**：两处手写。**修法**：changesets 生成的 CHANGELOG.md 是唯一真源，文档页构建期同步（上面脚本）；手写入口全部撤掉。

