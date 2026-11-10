---
title: "C6. 兼容：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测"
---
> 本文是《Part C：工程化（从 demo 到可发布）》按小节拆分后的续篇，上一部分见 [30-C5-版本-changesets-自动-changelog-semver-纪律.md](30-C5-版本-changesets-自动-changelog-semver-纪律.md)。
## C6. 兼容：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测

### 是什么

兼容性三问：**在哪些浏览器上跑**（browserslist 矩阵）、**在服务端渲染时不炸**（SSR hydrate 冒烟）、**在哪个 React 版本上跑**（18/19 双版本矩阵）。组件库的用户环境是"别人的项目"，边界必须显式声明并自动化验证，否则每次兼容问题都是用户工单倒逼。

### browserslist 矩阵：声明与影响

在根或各包 `package.json` 声明目标浏览器集合——它是整个前端工具链的公共契约（autoprefixer、babel、esbuild、core-js 都读它）：

```json
{
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "not op_mini all",
    "not dead",
    "not IE 11"
  ]
}
```

查询解析结果（写进 CI 或 README，让矩阵可见）：

```bash
npx browserslist
# 输出每个命中的浏览器及版本，例如：
# chrome 131
# chrome 130
# edge 131
# firefox 133
# ios_saf 18.2
# safari 18.2
```

**影响链条（声明如何改变产物）**：

1. **语法降级**：esbuild/babel 按矩阵决定是否把可选链 `?.`、空值合并 `??`、类字段转译为老语法。注意 esbuild 只做语法转译、不注入 API polyfill——`Array.prototype.at` 这类**新 API** 超出矩阵时必须另行处理；
2. **API polyfill**：组件库的正确姿势是**少用新 API**（`at`/`structuredClone` 换 `slice(-1)[0]` 等写法），而不是把 core-js 打进产物污染用户工程——polyfill 责任应留在业务侧；
3. **CSS 前缀**：autoprefixer 按矩阵输出 `-webkit-line-clamp`（Typography 多行省略）、`-webkit-backdrop-filter` 等前缀——省略组件库常踩；
4. **矩阵必须 ⊇ 用户矩阵**：库声明的目标集合要覆盖所有用户项目的集合，否则"业务在自己矩阵内一切正常，唯独引了你的组件在低版本 Safari 白屏"，这种锅最难甩清。

### SSR hydrate 冒烟测试：最小实现

**为什么**：Next.js/Nuxt 时代组件库必然被服务端渲染。hydration mismatch（服务端 HTML 与客户端首帧不一致）的后果是 React 丢弃服务端 HTML 整树重渲（性能退化），甚至白屏。jsdom 测不出这类问题——必须真的"renderToString 一次、hydrate 一次"。

**最小实现一：全量组件 renderToString 冒烟**（能抓住 window 未守卫、useLayoutEffect 告警类问题）：

```ts
// packages/components/src/ssr/ssr-smoke.test.ts
import { describe, it, expect } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import * as UI from '../index';

describe('SSR 冒烟：所有导出可被 renderToString', () => {
  // Object.entries 枚举全量导出，每个组件一条用例（it.each 自动生成用例名）
  it.each(Object.entries(UI))('%s 可服务端渲染', (name, exported) => {
    const Comp = exported as ComponentType;
    // 无必填 props 的组件直接渲染；有必填 props 的（如 Table 的 columns）另列 cases
    expect(() => renderToString(createElement(Comp))).not.toThrow();
  });
});
```

**最小实现二：hydrate 一致性断言**（能抓住真 mismatch）。注意 vitest 需要在 node 环境跑（jsdom 环境下 react-dom/server 行为不同），单独给这个文件配 `// @vitest-environment node`，并用 JSDOM 手动构造 DOM：

```ts
// packages/components/src/ssr/hydrate.test.tsx
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Modal } from '../modal';

// 捕获 console.error：React 18/19 的 hydration mismatch 以 console.error 形式报告
function catchConsoleError(fn: () => void): string[] {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args.join(' '));
  try {
    fn();
  } finally {
    console.error = original;
  }
  return errors;
}

describe('SSR hydrate 一致性', () => {
  it('Modal 服务端 HTML 与客户端首帧一致（无 mismatch 警告）', () => {
    const { window } = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost/', // 提供 location，避免组件内 window.location 访问炸掉
      pretendToBeVisual: true,  // 提供 requestAnimationFrame
    });

    // 服务端：用与客户端相同的组件、相同的 props 生成首屏 HTML
    // （真实项目里这一步发生在 Node 服务端；绝不能手写一段"看起来像"的 HTML 冒充——
    //   那样两侧必然不匹配，这个测试就永远红着，失去冒烟意义）
    const html = renderToString(<Modal open title="标题">内容</Modal>);

    // 客户端：hydrate 同一组件
    const errors = catchConsoleError(() => {
      const container = window.document.getElementById('root')!;
      container.innerHTML = html;
      hydrateRoot(container, <Modal open title="标题">内容</Modal>);
    });

    // React 的 mismatch 警告包含这两个关键词之一
    const mismatchErrors = errors.filter(
      (e) => e.includes('did not match') || e.includes('Hydration failed'),
    );
    expect(mismatchErrors).toEqual([]);
  });
});
```

mismatch 的典型来源与修法（与 A7 呼应）：随机数/时间戳（修法：`useId`、或首帧渲染占位 + `useEffect` 后再上真实值）、`useLayoutEffect`（服务端 warning，用 `useIsomorphicLayoutEffect` 包一层）、`typeof window` 分支渲染（首帧永远走服务端一致的分支）。

### React 18/19 双版本跑测：peerDependencies 与 CI 矩阵

**第一步：peerDependencies 放宽到区间**（各包统一）：

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

区间承诺"18 和 19 都支持"，就必须**真的在两个版本上跑过测试**——否则承诺只是愿望。

**第二步：CI 矩阵**。用 pnpm 在根上强制安装矩阵版本的 react，让 workspace 全部解析到同一套：

```yaml
# .github/workflows/ci.yml（节选）
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false            # 一个版本失败不取消另一个，两个结果都要看到
      matrix:
        react: [18, 19]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # 把根 devDependencies 的 react/react-dom/@types/react 钉到矩阵版本，
      # workspace 内所有包的 peer 解析随之统一
      - run: |
          pnpm add -w -D react@${{ matrix.react }} react-dom@${{ matrix.react }} @types/react@${{ matrix.react }}
      - run: pnpm build
      - run: pnpm test
```

**React 19 下组件库需要重点回归的差异清单**（18→19 的组件库视角）：

- `ref` 成为普通 prop（函数组件可不写 `forwardRef` 直接收 `ref`；`forwardRef` 仍兼容可用——库内可渐进迁移，对外 API 不变）；
- 函数组件的 `defaultProps` 被移除（18.3 起告警）——解构默认值的写法本来就免疫，库内若有残留必须清；
- `react-dom/test-utils` 移除，统一用 `React.act`；
- `useId` 的生成格式变化——绝不依赖其具体字符串（只用其唯一性）。

**第三步：测试环境的 act 声明**。React 18 的测试需要显式声明 act 环境，否则 Testing Library 报警告（React 19 侧 @testing-library/react v16 已内置处理）：

```ts
// vitest.setup.ts 顶部追加
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
```

### 常见坑

1. **症状**：CI 矩阵里 React 18 全绿、19 下批量报 ref 相关类型错误。**根因**：`@types/react@19` 的 `ref` prop 类型变化（forwardRef 返回类型推导差异）。**修法**：类型层兼容两端——`React.forwardRef` 写法在两个版本的类型下都成立（这就是它至今仍被保留的原因），不要为了"跟上 19"提前删除 forwardRef。
2. **症状**：本地组件测试全过，接入方 Next.js 报 hydration failed。**根因**：某个组件渲染了 `Date.now()` 派生内容或依赖 `window` 分支。**修法**：跑上面 hydrate 冒烟测试抓出来；改法回到 A7（useId / isomorphic hook / 首帧占位）。
3. **症状**：目标浏览器里组件白屏，报 `Object.flatMap is not a function` 类错误。**根因**：用了超出 browserslist 矩阵的新 API，且组件库没带 polyfill。**修法**：换等价旧 API（首选）；确需新 API 时在组件库内做特性检测 + 局部降级实现，并在文档标注。

---

## 学习路线与产出（约 9 周）

原大纲表格保留如下，表后逐周展开验收要点：

| 周 | 内容 | 产出 |
|---|---|---|
| 1–2 | Part A 内功逐项写 demo + Lv1 组件 | useControllableState 等 9 个内功 hook |
| 3–4 | Lv2：Modal + Toast + Tooltip + Drawer | 弹层四件套（含命令式 API） |
| 5–8 | Lv3 挑五个硬的：**Select / Tabs / DatePicker / Table / Tree** | 核心五件 |
| 9 | Part C 工程化 | monorepo + Storybook + changesets 发布 1.0 |

### 第 1–2 周（Part A 内功 + Lv1）验收要点

- **useControllableState**：三个验收用例——外部传 `value` 时内部不存状态（受控）；不传时 `defaultValue` 只在首帧消费一次（改 defaultValue 不影响后续，这是 `useState` 惰性初始化的直接推论）；运行中受控↔非受控切换必须抛出警告。用 Switch/Input/Select 三个组件分别接一遍，确认 API 一致。
- 其余 8 个内功 hook（clickOutside / focusTrap / escapeKey / hoverIntent / useId 化表单关联 / isomorphicLayoutEffect / roving tabindex / 弹层重定位）各有最小 demo 与单测；**每个 hook 一个文件一个 README 段**，从第 1 周就养成"内功可独立讲述"的习惯——第 9 周它们会被直接抽成 hooks 包发布。
- **Lv1 组件**：Button 的 loading 宽度不抖动（此验收靠视觉回归截图，jsdom 测不了布局）、中文双字自动空格（单测断言按钮可访问名含空格）；Icon 的 `fill: currentColor` 跟随文字色、按需引入不整包；Typography 的多行省略 + **溢出才显示 Tooltip**（`scrollWidth > clientWidth` 的 JS 测量逻辑抽成 hook 并单测）。
- 本阶段埋下工程伏笔：所有 demo 按 C3 的 story 格式写（用例即文档从第一天成立）。

### 第 3–4 周（Lv2 弹层四件套）验收要点

- **Modal**：五项硬验收——焦点陷阱（Tab 循环 + Shift+Tab 回绕 + 打开记 trigger、关闭还焦，C4 的测试代码就是验收脚本）；Esc 关闭；滚动锁无抖动（body overflow hidden + 滚动条宽度补偿）；退出动画播完才真正 unmount（A3 双状态机）；`Modal.confirm()` 命令式 API 返回 Promise 且可更新内容。
- **命令式 API 的 context 验收**：静态方法拿不到 ConfigProvider 主题的缺陷要能现场演示（改主题色后 confirm 弹窗不变色），并给出 `<App>` 组件包裹方案——这是面试高频考点，光看不算懂。
- **Toast**：同 key 复用更新（loading → success 原地变身，play 测试覆盖）；hover 暂停自动销毁；`aria-live="polite"` 播报。
- **Tooltip**：hover 意图延时（进 100ms 出 300ms）；disabled 按钮不触发事件的坑（pointer-events 方案）与解法。
- **Drawer**：四方向动画 + 拖拽改宽（pointer capture）。
- 出口标准：四个组件全部有 story + 组件测试 + axe 通过；弹层互斥（同时只开一个）与多级弹层 z-index 有手动验证记录。

### 第 5–8 周（Lv3 核心五件）验收要点

每组件的最低验收线：行为单测 + play 交互测试 + 虚拟滚动性能截图（万级数据 60fps 的 Performance 面板记录）+ APG 对照清单（键盘模型逐项勾选）。

- **Select（第 5 周上半）**：高亮与选中分离的架构；键盘全套（↑↓/Enter/Esc/Home/End/typeahead，每个按键一条测试用例——APG 键盘表就是测试清单）；万级 options 虚拟滚动；远程搜索的防抖 + loading + 失焦取消。
- **Tabs（第 5 周下半）**：compound 模式（TabsContext + 子组件自由组合）；roving tabindex；指示条 FLIP 动画；懒渲染与保持挂载两种模式可切换。
- **DatePicker（第 6 周）**：6×7 网格生成算法（纯函数化 + 单测覆盖前后月补齐、周起始日国际化）；范围选择的 hover 实时预览；键盘输入解析容错（dayjs parse 失败回退）；presets 快捷项。
- **Table（第 7 周）**：受控协议——分页/排序/筛选任何变化时 onChange 一次回调带全参（协议文档化，这是"协议工程"的验收）；固定表头 + 固定列双表同步滚动；列宽拖拽；行选择跨页保持。
- **Tree（第 8 周）**：checked/halfChecked 三态联动算法抽成纯函数并穷举单测（父选带动子、子全选带动父、半选传播）；拍平树 + 虚拟化 + level 缩进；拖拽换父后数据路径更新。
- 本阶段每个组件都按"协议文档 + story"双产出，第 9 周发布时文档站已自然成型。

### 第 9 周（Part C 工程化）验收要点

- **monorepo**：四个包目录与单向依赖就位；`turbo run build` 拓扑正确（改 utils 后仅 utils 及其下游重建，缓存命中其余）；`pnpm-workspace.yaml` 与 turbo.json 与本章 C1 示例逐项对齐。
- **构建**：tsup 双产物 + dts；**sideEffects 闭环验证**——最小工程按需引 Button，产物中搜不到 "Modal" 且搜得到按钮样式（C2 第七步脚本跑通并进 CI）。
- **文档与测试**：Storybook 站点（或 dumi）聚合全部组件 story；视觉回归接入并在 PR 上有 diff 审查记录；a11y 检查全绿（禁用规则有注释与 issue 链接）。
- **版本**：走通一次完整发布演练——`pnpm changeset` 声明 minor → CI 生成 Version PR → merge → 自动 publish 到 npm（私有 scope 也行）；CHANGELOG 生成正确；随后再发一个 patch 验证多包联动 bump。
- **兼容**：browserslist 矩阵写入并附 `npx browserslist` 输出；SSR 冒烟测试进 test 任务；React 18/19 双版本矩阵 CI 全绿。
- 最终产出物：**一个真实发布在 npm 上、文档站可访问、CI 五道闸（构建/测试/视觉/a11y/矩阵）齐备的 1.0 组件库**——这份产出在简历上的说服力超过十个 toy 项目。

### 补充：React 18/19 双版本的特性探针与类型收窄

**是什么**：前文已给 CI 双跑矩阵与 19 的行为差异清单，[09-A8](09-A8-ref-体系与-API-生态.md) 给了"peer 含 18 就保留 forwardRef"的写法纪律；本节补两块增量：运行时**特性探针**（条件 API 的启用依据）与**类型层的双版本收窄**（含可运行的类型测试与 CI 补丁）。

**为什么值得单列**：双版本支持的真实难点不在"跑两遍测试"，在两处更细的缝：运行时要用"19 才有的能力"时怎么判断（版本字符串不可靠——rc/beta 跳版、被 bundler 改写都可能）；类型上 `@types/react@18` 与 `19` 公开类型不同，怎么保证两端用户的编译体验都成立。判断散落在各组件里必然腐烂，必须收口。

**机制与做法**。

第一步，探针集中在一个模块（组件只 import 布尔值，绝不散落判断）：

```ts
// packages/components/src/supports.ts
import * as React from 'react';

/** 主版本号（React.version 形如 "19.1.0"；Number.parseInt('19.1.0') === 19）。仅用于日志与人读 */
export const REACT_MAJOR = Number.parseInt(React.version, 10);

/** typeof 探针：直接问运行时对象"这个能力在不在"——比版本号比较可靠（不怕 beta/rc 跳版） */
export const supportsReactUse = typeof (React as { use?: unknown }).use === 'function';            // 19+
export const supportsActivity = typeof (React as { Activity?: unknown }).Activity !== 'undefined'; // 19.2+
```

第二步，条件 API 的标准形态（以 19.2 的 `<Activity>` 为例，回退 [16 号 Tabs](16-Tabs.md) 的 hidden 方案）：

```tsx
// packages/components/src/keep-alive/KeepAlive.tsx
import * as React from 'react';
import { supportsActivity } from '../supports';

type ActivityComponent = React.ComponentType<{
  mode: 'visible' | 'hidden';
  children?: React.ReactNode;
}>;

/**
 * 条件 API：宿主 React 19.2+ 时用官方 <Activity>（state 保留且 effects 卸载）；
 * 否则回退 hidden 方案（state 保留但 effects 不停——差异写进组件文档，取舍见 16 号 Tabs）
 */
export function KeepAlive({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (supportsActivity) {
    const Activity = (React as unknown as { Activity: ActivityComponent }).Activity;
    return <Activity mode={active ? 'visible' : 'hidden'}>{children}</Activity>;
  }
  return <div hidden={!active}>{children}</div>;
}
```

第三步，类型收窄的原则与类型测试。原则两条：**d.ts 以最低支持版本的 @types/react 编译**（18 的类型形状是 19 的子集，18 下编译通过的声明在 19 项目里也成立——这正是 09-A8"保留 forwardRef"的类型学根据）；**条件 API 的版本差异不进公开类型**（KeepAlive 对外只有一个 props 形状，内部分叉是实现细节）。然后用类型测试把契约钉死，防止类型悄悄漂移：

```ts
// packages/components/src/button/button.test-d.ts —— 用 vitest --typecheck 运行
import { describe, it, expectTypeOf } from 'vitest';
import type { ComponentProps } from 'react';
import { Button } from './button';

describe('公开 API 类型契约（18/19 两端不得漂移）', () => {
  it('Button props 的形状与联合类型钉死', () => {
    expectTypeOf<ComponentProps<typeof Button>>().toHaveProperty('loading');
    // 刻意钉住联合：谁收紧 variant（少一个合法值）这条测试立即红——提醒按 30 号的 semver 判定表升 major
    expectTypeOf<ComponentProps<typeof Button>['variant']>().toEqualTypeOf<
      'primary' | 'secondary' | 'text' | undefined
    >();
  });
});
```

运行：`vitest --typecheck`（typecheck 默认收集 `*.test-d.ts`）。

第四步，CI 补丁：矩阵里加类型双跑——`@types/react` 换版本后，ref 类型等差异才能被机器捕获：

```yaml
# 前文矩阵 job 的 steps，在 pnpm test 旁追加一步：
      - run: pnpm -r typecheck   # 每个矩阵条目（18/19 两套 @types/react）下各跑一遍
```

配套 `@ts-expect-error` 纪律：抑制型注释必须精确到"某版本类型的已知差异"；tsc 对已失效的 `@ts-expect-error` 会报 unused 错误——在双版本矩阵里它会自然红起来，这是提示"该清理了"的特性而非噪音。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 探针在宿主页面读到"另一份" React 的能力 | import 到的 React 就是消费方解析的那份——探针测的是"我拿到的这份"，双 React 页面下两份库各测各的 | 这是探针的正确语义；根治双 React 见下文"多版本共存"节 |
| `Number(React.version.split('.')[0])` 得到 NaN | 版本串被 bundler define 改写或非标准形态 | 用 `Number.parseInt(v, 10)` 兜底，且逻辑判断一律走 typeof 探针 |
| 用了 `<Activity>` 后 @types/react@18 编译失败 | 18 的类型没有 Activity 导出 | 如上用 `React as unknown as { Activity: ... }` 收窄引用，运行时受 supportsActivity 保护 |
| 19 项目里组件 props 推导出多余字段 | d.ts 用 @types/react@19 编译，引入了 19 独有的类型形状 | d.ts 固定用最低支持版本的 @types 编译（原则第一条） |

### 补充：peerDependencies 范围策略与装错时的报错链

**是什么**：peer 范围是对宿主环境的单方面承诺，写法决定"装错时用户看到什么"。前文与 [26-C1](26-C1-仓库-pnpm-monorepo-components-hooks-tokens.md) 用的是 `">=18"`；本节讲它与 `^18.0.0 || ^19.0.0` 的差别、装错时各包管理器的报错链，以及"library 不是 app"的依赖纪律。

**两种写法的语义差异**：

| 写法 | 含义 | React 20 发布当天 | 评价 |
|---|---|---|---|
| `>=18` | 18 及以上一切 | 用户的 React 20 直接装上——库从未在 20 上跑过测试 | 不推荐：把未测试版本也承诺了进去 |
| `^18.0.0 \|\| ^19.0.0` | 18.x 或 19.x | 安装报 peer 冲突，用户明确知道"等库适配" | 推荐：范围内每个版本都是矩阵测过的 |

`^` 的上界保护是关键差别：`^19.0.0` 等价 `>=19.0.0 <20.0.0`。semver 细节顺带钉死：**prerelease 不满足 `^` range**（`19.0.0-rc.1` 不匹配 `^19.0.0`）——想让早期用户跑 rc，需显式加 `|| 19.0.0-rc.1` 通道，通常只对内部/种子用户开。

**装错时的报错链**（用户视角；这段可直接抄进排障文档）：

| 包管理器 | peer 冲突时的行为 | 库作者要做的事 |
|---|---|---|
| npm 7+ | 默认**自动安装 peer**：满足时无感；无法满足时报 ERESOLVE——用户用 `--force`/`--legacy-peer-deps` 绕过后，版本图可能落成嵌套的第二份 react | 文档写明"不要绕过，先对齐版本" |
| pnpm（v8+ 默认 auto-install-peers=true） | 缺 peer 自动补装；**版本冲突**时 `ERR_PNPM_PEER_DEP_ISSUES` 拒绝安装整棵树 | 报错信息会带上期望范围——peer 写得越准报错越可读 |
| yarn berry | strict 模式安装失败，输出冲突清单 | 同上 |

自动安装 peer 的隐患单独强调：绕过 ERESOLVE 的安装（`--force`）可能装出嵌套的第二份 react（宿主一份、你的库一份）——从此页面双 React，症状是运行时 `Invalid hook call`（两份 React 各持一套 hooks dispatcher）。这也是下节"多版本共存"最常见的成因。

**library 不是 app：依赖纪律清单**（组件库 package.json 的 react 相关铁律）：

```jsonc
// packages/components/package.json —— peer 的完整声明形态
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@types/react": "^18 || ^19"
  },
  "peerDependenciesMeta": {
    "@types/react": { "optional": true } // JS 项目没装 @types/react 也不报 peer 错——类型依赖永远是可选的
  }
}
```

1. `react`/`react-dom` 只出现在两处：`peerDependencies`（承诺范围）+ `devDependencies`（本地测试与类型，锁矩阵内版本）；**绝不进 `dependencies`**——进去等于把 React 发给用户装第二份（这是 [27-C2](27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md) 构建 external 的运行时对偶）；
2. peer 范围内**每个大版本都进 CI 矩阵**（前文 matrix）——写了 `|| ^19` 就必须真的双跑，否则承诺是空头支票；
3. alpha/rc 不进 peer 范围（上界保护会挡掉，不要手动放开）；
4. `@types/react` 作为可选 peer 声明（如上）——JS 用户不被强迫装类型包，TS 用户则受版本约束。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 用户 ERESOLVE 后 `--force` 强装，运行时 Invalid hook call | 嵌套出第二份 react | 排障文档预置"先 `npm ls react` 找双份来源"步骤；库侧坚持 peer 上界 |
| peer 写 `>=18` 但代码用了 19 API（如 use） | 18 用户运行时炸——范围承诺与实现脱节 | 新 API 一律走探针 + 回退（上节）；或收紧范围升 major |
| pnpm 用户装不上，报 ERR_PNPM_PEER_DEP_ISSUES | 宿主 react 与 peer 范围确实不交 | 这是指引清晰的失败：引导用户对齐 react 或等库适配，不要教用户绕过 |

### 补充：浏览器目标与构建产物的联动配置

**是什么**：前文 browserslist 节讲了声明与影响链条，[27-C2](27-C2-构建-tsup-father-unbuild-ESM-CJS-双产物-dt.md) 讲了 JS 产物；本节把三者联动的落地配置补齐：tsup/esbuild **不读** browserslist 的对齐办法、core-js 按使用注入的正确位置（业务侧模板）、CSS 侧的 postcss-preset-env。

**问题一：esbuild 不读 browserslist**。tsup 的 esbuild 内核只认 `target`（`es20xx` 或引擎名），矩阵与 target 的换算是手动的、且必须随矩阵变更同步：

```ts
// packages/components/tsup.config.ts —— 在 27-C2 完整配置上只动 target 一行
import { defineConfig } from 'tsup';

export default defineConfig({
  // …其余配置见 27-C2…
  target: 'es2020',
  // 换算：矩阵最老是 Safari 14 时，语法 target 取 es2020（Safari 14 完整支持 ES2020 语法）；
  // API 缺口（如 Promise.any 要 Safari 15）按前文"少用新 API"原则处理，target 管不到 API；
  // 矩阵收紧（如去掉 Safari 14）后此项随同一 PR 上调
});
```

配套一条防漂移的提醒脚本（CI 可跑，输出供人对照）：

```bash
#!/usr/bin/env bash
# scripts/check-target-align.sh —— 打印矩阵内最老的引擎，人工对照 tsup target 是否仍成立
echo "ios_saf: $(npx browserslist | grep '^ios_saf' | sort -V | head -1)"
echo "chrome : $(npx browserslist | grep '^chrome ' | sort -V | head -1)"
echo "safari : $(npx browserslist | grep '^safari ' | sort -V | head -1)"
```

**问题二：core-js 按使用注入是业务侧的配置**（前文已定调"polyfill 责任留在业务侧"；这份模板放进接入文档）：

```js
// babel.config.js —— 业务侧/文档站示例：按使用注入，core-js 版本必须钉到 minor
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: '> 0.5%, last 2 versions, not dead', // 与业务自己的 browserslist 同源
      useBuiltIns: 'usage',                          // 扫描源码用到的新 API，逐个注入对应 polyfill
      corejs: { version: '3.38', proposals: false }, // 钉到 minor：注入清单由 core-js 版本决定
    }],
  ],
};
```

`version` 为什么钉到 minor：`usage` 注入哪些 polyfill 取决于装的 core-js 里**有什么**——写 `"3"` 时 core-js 的 minor 升级会静默多注入一批，产物体积无解释地涨。库侧重申一句：库产物零 polyfill、代码层换等价旧写法（前文影响链条第 2 条），这是"矩阵 ⊇ 用户矩阵"承诺成立的前提。

**问题三：CSS 兼容用 postcss-preset-env**（autoprefixer 的超集，组件库 CSS 构建标配）：

```js
// packages/components/postcss.config.cjs —— CSS 侧唯一入口；目标读 package.json 的 browserslist（单一来源）
module.exports = {
  plugins: [
    require('postcss-preset-env')({
      stage: 2, // 只启用 stage 2+ 的特性转译——更低 stage 的规范还会变，升级即事故
      features: {
        'nesting-rules': true,     // CSS 嵌套平铺：iOS Safari 16.5 前无原生嵌套
        'custom-properties': false, // CSS 变量矩阵内原生支持，显式关掉转译防误开
      },
      // 不传 browsers：自动读最近 package.json 的 browserslist——与 JS 侧同一份矩阵
    }),
  ],
};
```

要点：preset-env 内含 autoprefixer（不必再单独挂）；`browsers` 参数**不传**，让它读 package.json——JS 与 CSS 的兼容目标永远是同一份，这本身就是防漂移设计。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 换了 target 没换 browserslist（或反之），老 Safari 白屏 | 两者各自为政，语法降级与声明矩阵脱节 | target 随矩阵变更同一 PR 改；PR 模板两项并列检查 |
| 业务侧 core-js 写 "3"，某次升级后 bundle 涨 30KB | usage 注入清单随 core-js minor 漂移 | 钉 "3.38" 这类 minor，lockfile 同步锁 |
| postcss 里同时挂 preset-env 和 autoprefixer，前缀重复 | preset-env 已内含 autoprefixer | 删独立 autoprefixer |
| CSS 变量被转成静态值、主题切换失效 | 误开 custom-properties 转译（IE 时代选项） | 显式 false；矩阵若还含 IE，正确决策是砍 IE 而不是转译变量 |

### 补充：同页面多版本库共存：根因与共享单例方案

**是什么**：微前端（qiankun/single-spa/Module Federation）或大仓库 hoisting 失败时，同一页面出现两份组件库、甚至两份 React。症状千奇百怪（hooks 崩、主题不生效、弹层互斥失灵），根因只有两类：**模块实例重复**与 **React 实例重复**。[08-A7](08-A7-SSR-与环境兼容.md) 讲过多 root 的 identifierPrefix，[12 号](12-Lv2-弹层与反馈组件-功力主考场之一.md)讲过宿主 holder 的卸载泄漏——本节讲"两份库为什么打架"的机制层与治理。

**为什么值得单列**：这类问题最难排查——每份库单独跑都好好的，组合才炸；报错（Invalid hook call）指向 React，锅却在安装与打包结构。不理解模块身份机制，只能碰运气式重装。

**机制：两个身份问题，一个 Symbol 陷阱**。

1. **ES 模块的身份 = 模块实例的内存地址**。"装了两份 @react-ui/components"就是两个独立模块实例：各自执行顶层代码、各持模块级状态——库里的全局单例全裂成两半：[03-A2](03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md) 的 Esc 栈（两套栈各弹各的、互相不排空）、Modal 滚动锁计数器（一份锁了 body、另一份计数为零去解锁——要么锁死要么提前解锁）。
2. **React Context 的身份 = `createContext` 返回的那个对象**。`useContext` 的机制是沿组件树向上找**同一个对象**的 Provider。两份库各自 `createContext` → 两个不同对象 → A 份的 `<ConfigProvider>` 供不上 B 份的 `useConfig()`，B 拿默认值——**主题/国际化全部失灵且零报错**（这比崩溃更坏：没有报错可查）。若连 React 也是两份则更根本：B 的 hooks 从 B 的 React 取 dispatcher，组件渲染在 A 的 React 树上，直接 `Invalid hook call`。
3. **Symbol 陷阱与解法**：跨副本协议若用 `Symbol('x')` 做 key，每个 Symbol 出厂都是新身份——两份代码各拿各的，注册表对不上。`Symbol.for('x')` 走**全局注册表**，跨副本是同一个值。React 自己就是这个解法的使用者：内部元素类型定为 `Symbol.for('react.transitional.element')`，所以两份 React 打包在一起时仍能识别"这是 React 元素"。另一层 duplication 要区分：依赖链里两份 core-js（v2 与 v3）都会往 `Array.prototype[Symbol.iterator]` 写各自实现——`Symbol.iterator` 本身全局唯一，但两份 polyfill 互不兼容，v2 创建的迭代器 v3 不认，数组"看起来不像数组"。全局补丁类依赖必须归一，没有 Symbol.for 级的侥幸。

**治理：按场景选共享单例方案**。

| 方案 | 做法 | 适用 |
|---|---|---|
| 版本锁定（治本首选） | 宿主用 overrides/resolutions 把所有子应用与传递依赖钉到同一版本 | 单一部署单元 |
| 构建别名 | 子应用把 `react`/`react-dom`（必要时含组件库）alias 到宿主的同一份物理文件 | webpack/Vite `resolve.alias` |
| Module Federation | 运行时按需共享 + singleton 约束（下方配置） | 微前端主子应用 |
| import maps | 浏览器层把裸模块名钉到同一 URL | 原生 ESM 微前端 |

```js
// 子应用 webpack 配置（宿主与其余子应用同款声明；运行时全页只保留一份）
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'sub_app_orders',
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0 || ^19.0.0', strictVersion: true },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0 || ^19.0.0', strictVersion: true },
        '@react-ui/components': {
          singleton: true,     // 组件库也共享：Context、Esc 栈、滚动锁全部归一
          requiredVersion: '^2',
          strictVersion: true, // 版本对不上构建期报错——把失败从运行时提前到构建期
        },
      },
    }),
  ],
};
```

`strictVersion: true` 的哲学与上节 peer 报错链同源：**装错了就明确失败，好过运行时静默双份**。

原生 ESM 微前端用 import maps 达到同一效果（宿主页面钉死裸模块名的物理指向，所有子应用共用一份）：

```html
<!-- 宿主 index.html —— import map 把裸模块名钉到同一 URL -->
<script type="importmap">
{
  "imports": {
    "react": "https://cdn.example.com/shared/react@19.1.0/index.mjs",
    "react-dom": "https://cdn.example.com/shared/react-dom@19.1.0/index.mjs",
    "@react-ui/components": "https://cdn.example.com/shared/react-ui@2.5.1/index.mjs"
  }
}
</script>
```

**库作者侧的防御性写法**（不能强迫宿主共享，但可以少裂、裂了就大声说）：

1. **跨副本协议 key 用 `Symbol.for` 或字符串**：Esc 栈若走 window 自定义事件（事件名是字符串，天然跨副本）或以 `Symbol.for('react-ui.esc-stack')` 登记，两份库也能对上同一份注册表；`Symbol()` 出厂的私有 key 一律禁止用于跨模块协议；
2. **Context 不提供跨副本 API**：文档明示"同页面只允许一份本库实例"，主题注入设计为每份库自产自销；
3. **双副本显式检测**（开发模式大声失败，别静默）：

```ts
// packages/components/src/index.ts 顶层 —— 双副本检测（仅 dev 执行）
declare global {
  interface Window {
    __REACT_UI_VERSION__?: string;
  }
}

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  if (window.__REACT_UI_VERSION__) {
    console.error(
      `[react-ui] 检测到第二个实例（页面已有 ${window.__REACT_UI_VERSION__}，当前 ${VERSION}）。` +
        '双实例会导致主题不生效与弹层互斥失灵，共享单例方案见文档《兼容性》章节。',
    );
  } else {
    window.__REACT_UI_VERSION__ = VERSION;
  }
}
```

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| Invalid hook call（页面渲染一半崩） | 双 React：hooks dispatcher 与渲染树不同源 | `npm ls react` 找第二份来源；按上表共享/钉版本 |
| ConfigProvider 主题对子应用组件不生效、零报错 | 组件库双实例，Context 对象身份不同 | 组件库纳入 Federation singleton 或全局钉版本 |
| 弹层互斥/滚动锁错乱 | 模块级单例裂成两份（03-A2 的栈、滚动锁计数） | 治理同上；库侧把跨副本协议迁到 Symbol.for/字符串通道 |
| `npm ls react` 显示一份，运行时仍双 React | 打包器把 react 打进了某个 bundle（未 external/未共享） | 查子应用构建的 externals/shared；扫产物里 react 的特征字符串 |
| 双副本检测在 qiankun 下失灵 | JS 沙箱把子应用的 window 代理掉，`window.__REACT_UI_VERSION__` 各沙箱可见、互相看不见 | 检测标记挂到 `document`（沙箱间共享的真实 DOM），或由宿主统一做检测 |
