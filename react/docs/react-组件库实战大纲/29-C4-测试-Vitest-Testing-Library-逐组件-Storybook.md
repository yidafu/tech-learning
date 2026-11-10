---
title: "C4. 测试：Vitest + Testing Library 逐组件；Storybook play function 交互测试"
---
> 本文是《Part C：工程化（从 demo 到可发布）》按小节拆分后的续篇，上一部分见 [28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md](28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md)。
## C4. 测试：Vitest + Testing Library 逐组件；Storybook play function 交互测试

### 是什么：组件库的测试分层

| 层 | 工具 | 测什么 | 跑在哪 |
|---|---|---|---|
| 纯函数单测 | Vitest | conduct 三态算法、日历网格生成、useControllableState 的判断逻辑（抽出为纯函数） | Node（快） |
| 组件行为测试 | Vitest + Testing Library | 事件回调、aria 属性、受控协议 | jsdom（无布局） |
| 交互集成测试 | Storybook play function + test-runner | 真实浏览器里的交互流（焦点流转、键盘导航） | 无头浏览器 |
| 外观回归 | 视觉回归（C3） | 像素级样式 | 无头浏览器截图 |

分层的本质是**环境成本与真实性的取舍**：jsdom 秒级启动但没有布局引擎（`offsetWidth` 恒为 0），测不了视觉；真浏览器真实但慢。每类断言放在它"最便宜能测对"的那层。

### 为什么需要"逐组件"

组件库的测试对象是**契约**（props → 行为/DOM），不是实现。契约一旦发布就是对外承诺，任何破坏契约的改动都必须被拦下——这就是为什么测试文件与组件同目录（`button/button.test.tsx`）：改组件的 PR 里测试 diff 紧挨着实现 diff，reviewer 一眼对照"改了什么、契约变没变"。

### 怎么做：Vitest 配置与组件测试

`packages/components/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',          // 组件测试需要 DOM
    setupFiles: ['./vitest.setup.ts'],
    globals: false,                // 显式 import describe/it，IDE 可跳转、类型可控
    css: false,                    // 不处理 css，jsdom 测不了样式
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`packages/components/vitest.setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'; // 提供 toBeVisible/toBeDisabled/toHaveAttribute 等断言
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 每个用例结束卸载渲染容器，防止状态/定时器跨用例泄漏
afterEach(() => {
  cleanup();
});
```

Button 的行为测试（覆盖 Lv1 的考点）：

```tsx
// packages/components/src/button/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('点击触发 onClick', async () => {
    const user = userEvent.setup(); // userEvent 模拟真实事件序列（pointerdown → focus → click），比 fireEvent 接近真实用户
    const onClick = vi.fn();
    render(<Button onClick={onClick}>确定</Button>);

    // 查询首选 getByRole：它按可访问性树查找，查询能通过 = 无障碍角色正确，一举两得
    await user.click(screen.getByRole('button', { name: '确定' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('loading 时 disabled 且不触发 onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        提交
      </Button>,
    );
    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '提交' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('中文双字自动加空格（antd 经典细节）', () => {
    render(<Button>确定</Button>);
    // 两个汉字之间插入了一个空格 span（Lv1 Button 考点），语义仍可按"确 定"匹配
    expect(screen.getByRole('button', { name: '确 定' })).toBeInTheDocument();
  });
});
```

Modal 的焦点陷阱测试（A4 的验收）：

```tsx
// packages/components/src/modal/modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

describe('Modal 焦点管理', () => {
  it('打开后焦点进入弹窗，Tab 循环不逃逸', async () => {
    const user = userEvent.setup();
    render(
      <Modal open title="删除确认" onOk={vi.fn()} onCancel={vi.fn()}>
        <input aria-label="备注" />
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    // 弹窗打开后，焦点应已移入弹窗（首元素或容器本身）
    expect(dialog).toContainElement(document.activeElement);

    // 连续 Tab 五次，焦点始终在弹窗内循环（陷阱生效）
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement);
    }
  });

  it('Esc 触发 onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Modal open title="标题" onOk={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

**查询选择纪律**（Testing Library 的核心心法）：`getByRole`（优先，顺带保护无障碍）> `getByLabelText/getByText`（用户视角）> `getByTestId`（最后手段，说明前两者都没设计好）。断言 DOM 属性用 `toHaveAttribute('aria-expanded', 'true')` 这类契约断言，**禁止组件树快照**——快照会随实现细节碎掉，制造大量噪音。

**jsdom 的边界**：布局（`offsetWidth`、`getBoundingClientRect`）全部返回 0/空，伪元素、canvas、真实滚动都不可用。Button 的"loading 保持宽度防抖动"这类视觉断言**必须交给视觉回归**，组件测试只测行为与 aria——这个边界感是测试工程不腐烂的前提。

### Storybook play function：用例即测试

**是什么**：直接在 story 里写交互步骤（play 函数），`@storybook/test-runner` 在 CI 的无头浏览器里逐 story 执行并断言。因为 story 同时是文档用例，**文档里每个演示都变成了回归资产**——demo 坏了 = 文档坏了 = CI 红了。

```tsx
// packages/components/src/toast/toast.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test'; // storybook 侧的测试工具包（内含 jest-dom 断言）
import { Toast, toast } from './toast';
import { Button } from '../button';

const meta: Meta = {
  title: 'Components/Toast',
  component: Toast,
};
export default meta;

type Story = StoryObj;

// 文档里的演示同时是一条 CI 回归用例：loading → success 原地变身（Lv2 Toast 考点）
export const LoadingToSuccess: Story = {
  play: async ({ canvasElement, step, expect: storybookExpect }) => {
    const canvas = within(canvasElement); // 用 within 限定在本 story 的画布内查询
    await step('点击保存，出现 loading 提示并在完成后原地变身', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '保存' }));
      await storybookExpect(canvas.getByText('保存中...')).toBeVisible();
      // 同 key 复用：成功提示替换 loading，而不是新增一条
      await storybookExpect(canvas.getByText('保存成功')).toBeVisible();
      await storybookExpect(canvas.queryByText('保存中...')).not.toBeInTheDocument();
    });
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Button
          onClick={() => {
            const key = toast.loading({ content: '保存中...' });
            setTimeout(() => toast.success({ key, content: '保存成功' }), 1000);
          }}
        >
          保存
        </Button>
      </>
    ),
  ],
};
```

写法要点：`step` 把长流程分组（失败时报告指出卡在哪一步）；`expect` 由 Storybook 注入（等价 `@storybook/test` 的 expect，已扩展 jest-dom）；查询一律 `within(canvasElement)`——用全局 `screen` 在 Docs 页会同时命中多个 story 的 DOM，产生串扰。

CI 执行（与 C3 的 a11y 检查共用一条链路）：

```bash
pnpm --filter docs exec storybook build
npx http-server storybook-static --port 6006 --silent &
npx wait-on tcp:6006
pnpm --filter docs exec test-storybook   # 每个 story：渲染无错 + play 断言 + axe 检查
```

**play 测试相对 Vitest 组件测试的增量价值**：

1. **真实浏览器**：真实焦点流转、真实事件冒泡、真实 CSS（hover 态、`pointer-events`、`position: fixed`），jsdom 测不了的弹层行为在这里可测；
2. **一份用例三处消费**：同一个 story 同时是文档演示（C3）、交互测试（此处）、视觉回归截图对象（C3）——写一次，三道闸全过；
3. **演示即防伪**：文档里的 demo 不再可能是"过时的手抄代码"，因为它们本身在被 CI 执行。

### 常见坑

1. **症状**：组件测试报 "An update to Button inside a test was not wrapped in act(...)"。**根因**：异步状态更新（setTimeout 后 setState）发生在断言之后。**修法**：用 `vi.useFakeTimers()` 控制时间并 `vi.advanceTimersByTime(...)` 后再断言；或对异步用 `await waitFor(...)`/`findBy*` 查询，而不是裸 sleep。
2. **症状**：play 测试在本地 Storybook 里绿，CI 里 flaky。**根因**：故事里有真实延时（demo 里 setTimeout 1000ms），CI 机器慢时截图/断言跑在动画完成前。**修法**：story 的 decorator 里把延时注入为参数（默认 0，文档演示时改大），或断言用 `await expect(...).toBeVisible()` 之内置重试（`@storybook/test` 的 expect 自带 waitFor 语义，多数异步已覆盖；不覆盖的场景在 play 里用 `step` 拆小并显式等待）。
3. **症状**：test-runner 报 "connection refused" 或 404。**根因**：静态服务没起来就跑了 runner。**修法**：严格按 `build → serve → wait-on → test-storybook` 顺序（上面命令），或使用 test-runner 的 `--url` 参数显式指定地址。

### 补充：测试分层与 CI 时长治理

**是什么**：本文开头的四行表回答了"每类断言放哪层"；时长治理回答"这些层加起来还跑得动吗"。组件库测试量的增长是乘法（组件数 × 状态数 × story 数），50 个组件的库轻松到上千条用例、几百张截图——没有预算与增量选择机制，CI 会从安全网劣化成"大家下班前才扫一眼的红绿灯"。

**为什么值得单列**：慢 CI 的真实代价不是等待，是信任流失——超过 15 分钟后，"重跑一次碰运气"成为团队肌肉记忆，红灯的严肃性荡然无存。时长必须像产物体积一样被当作工程指标来管理。

**机制：预算与增量两条腿**。

第一条腿，分层时长预算（数字写进 CI 的 PR 检查注释，超预算视为回归，与测试失败同级处理）：

| 层 | 工具 | 预算（参考值） | 超预算的排查动作 |
|---|---|---|---|
| 纯函数 + 组件行为（jsdom） | Vitest | < 3 min | 查真实定时器/网络请求泄漏进用例；查 it.each 是否该抽样 |
| 交互集成（真浏览器） | test-runner | < 8 min | 合并重复 story；低价值 story 降为纯渲染冒烟 |
| 视觉回归 | Chromatic / Lost Pixel | < 10 min | 开增量截图（Chromatic 的 TurboSnap，见下文视觉基线节） |
| e2e 冒烟 | Playwright | < 10 min | 只保留下层无法覆盖的链路（安装 npm 产物 → 渲染 → 核心流） |

预算的本质是倒逼分层：e2e 慢就往下层挪——能用组件测试断言的行为绝不上 e2e。注意 e2e 这一行是对开头四行表的**增量**：那里没有 e2e 层，因为组件库的 e2e 只有一条固定链路（装 npm 产物而非源码，跑通核心组件），不属于逐组件测试体系。

第二条腿，按 changed files 的增量选择（PR 只跑受影响的部分）：

```yaml
# .github/workflows/ci.yml（增量选择核心步骤，其余 checkout/setup 同常规配置）
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                     # 增量判定需要基线提交可寻址
      # …pnpm / node 安装略…
      - name: 受影响包的测试（turbo 按依赖拓扑过滤）
        run: |
          BASE_SHA="${{ github.event.pull_request.base.sha }}"
          pnpm turbo test --filter="...[${BASE_SHA}]"
          # 语义：只跑"自基线以来有改动"的包及其全部下游包；未变包直接命中 turbo 缓存
```

`--filter="...[<ref>]"` 是 turbo 的 affected 语法：`...` 前缀表示"改动包及其依赖它的包"，方括号内是基线（分支名或 SHA 均可）。配套三条纪律：

1. **turbo 缓存是增量的一半**：`test` 任务声明的 inputs 决定缓存命中——测试文件必须在 inputs 内（默认 `src/**` 已含），改 README 不重跑、改测试必重跑；
2. **main 分支必须全量**：增量只用于 PR；merge 后 main 全量跑并记录时长趋势（CI artifact 存 time report），防止"每个 PR 都快、main 慢到没人发现"；
3. Vitest 侧的包内补充手段：`vitest related --run <改动文件>` 只跑与改动有依赖关系的用例；`vitest --changed HEAD~1 --run` 按 git 变更选文件；量再大用 `--shard=1/4` 分片并行。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 改了 utils，components 的测试没跑 | filter 少了 `...` 前缀（只测改动包本身，没带上下游） | 用 `"...[sha]"`（含下游）而不是 `"[sha]"` |
| PR 绿、merge 后 main 红 | PR 存活期长，基线落后于 main 新提交 | 基线取 PR merge 后的 SHA，或要求 rebase；main 全量兜底 |
| turbo 缓存命中但本该红 | test 任务的 inputs 漏了新目录（如 codemods/） | inputs 显式列举并加 `"$TURBO_DEFAULT$"` 兜底 |

### 补充：a11y 自动化：jest-axe 静态扫描与人工走查的分工

**是什么**：[28-C3](28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md) 的 addon-a11y 已覆盖 story 层的 axe 扫描与 CI 升级；本节补单测层的 jest-axe——在 Vitest 组件测试里对 `render()` 出的 DOM 直接跑 axe-core，与行为断言同文件。三层链条就此闭合：jest-axe（单测层，扫组件的每个关键状态）→ addon-a11y/test-runner（story 层，扫文档站全部演示）→ 人工走查（键盘模型与读屏实测，键位清单见 [35 号 APG 文档](35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA.md)）。

**为什么需要单测层再来一道**：story 是"演示状态"，而组件测试的状态更细——loading、disabled、报错、超长文本截断这些边界态未必都有 story。jest-axe 把"每个组件的每个关键状态过一遍 axe"变成可执行、可计数的测试资产，而不是依赖 story 覆盖度碰运气。

**怎么做**：

```bash
pnpm --filter @react-ui/components add -D jest-axe
```

```tsx
// packages/components/src/select/select.a11y.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Select } from './select';

expect.extend(toHaveNoViolations); // 注册断言（vitest 兼容 jest 匹配器）

// axe 是异步遍历规则树，必须 await 后再断言
async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

describe('Select a11y 静态扫描', () => {
  it('闭合态：combobox 有可访问名', async () => {
    const { container } = render(
      <Select label="城市" options={[{ value: 'hz', label: '杭州' }]} />,
    );
    expect(screen.getByRole('combobox', { name: '城市' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('展开态：listbox 与 option 的 aria 结构合规', async () => {
    const { container } = render(
      <Select open label="城市" options={[{ value: 'hz', label: '杭州' }]} />,
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
```

**能抓什么、漏什么**（这张表决定它只能当第一道闸）：

| 类别 | jest-axe 能抓 | jest-axe 抓不到（归其他层） |
|---|---|---|
| 语义 | role 非法或缺失、元素无可访问名（button-name/link-name）、duplicate-id | 语义对了但行为没实现（aria-expanded 挂了、键盘打不开） |
| 结构 | aria 父子约束（listbox 的孩子必须是 option）、aria 属性值域 | 焦点顺序、焦点陷阱、关闭还焦（A4 的行为验收） |
| 内容 | 图片缺 alt、表格缺关联表头 | 读屏实际播报效果（aria-live 何时念、怎么念） |
| 对比度 | color-contrast——jsdom 无布局，多数结果为 incomplete（既非 pass 也非 fail） | 真实渲染的对比度、hover/焦点态样式（归 28-C3 的真浏览器层） |

**与人工走查的互补机制**：把机器测不了的固化成仓库内的走查清单（`docs/a11y-checklist.md`），每个组件发布前过一遍——键盘模型按 35 号 APG 键位表逐项勾选，读屏用 NVDA/VoiceOver 各过一轮核心流。jest-axe 防低级疏漏，走查防系统性设计缺陷，两层不可互相替代（06-A5 已从键盘侧论证过同一件事）。

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| axe 报一堆 color-contrast "incomplete"，报告噪音大 | jsdom 无布局，对比度规则拿不到最终计算色值 | CI 报告过滤 incomplete 项；对比度真检交给 story 层（真浏览器） |
| 同一违例单测与 test-runner 各报一次 | 两层 axe 扫到同一状态 | 可接受——单测层覆盖非 story 状态、story 层覆盖整站；报告归口同一处即可 |
| axe 全绿但键盘完全不可用 | axe 只验静态属性 | 键盘行为用 play function 断言（本文上文），走查清单兜底 |

### 补充：视觉回归的基线治理：继承、重组与误报的流程面

**是什么**：[28-C3](28-C3-文档-Storybook-dumi-MDX-用例即文档-视觉回归-Chromatic.md) 已覆盖原理、Chromatic/Lost Pixel 接入、baseline 更新三纪律与六个误报源；本节补基线的**时间维度**：baseline 存在哪、随分支怎么继承、UI 大改时如何整体重组、误报如何作为流程问题治理。

**为什么值得单列**：视觉回归几乎只有一种死法——基线腐化。日常小 diff 没人细看就 accept，三个月后 baseline 早已不是"设计正确时的样子"而是"上次全接受的随便什么样子"；真回归出现时，diff 淹没在历史噪音里。基线治理就是防这一天。

**机制（以 Chromatic 为例，Lost Pixel 的 baseline 入库于 git，天然随分支走，无需额外机制）**，分三步：

1. **baseline 绑定分支**：每个 git 分支持有自己的 baseline 集合，新分支从 main 继承；PR 上的截图与"本分支当前 baseline"比对；
2. **接受即写回**：PR 里 accept 的变更在 merge 后成为 main 的新 baseline——每次"接受"都是在给 main 立法，这也是 accept 权限要收敛的机制依据；
3. **TurboSnap 增量截图**：Chromatic 按 git diff 圈定受影响 story，只重建这些 story 的截图——这正是视觉层的"按 changed files 增量选择"，与本文时长治理节同一条腿（它要求 checkout 带 `fetch-depth: 0`，28-C3 的 yaml 已有）。

**UI 大改时的基线重组**（设计规范级改版：换字体、改圆角 token、全站 spacing 调整——预期内 diff 可能上千张）：

1. **单独开"基线重组 PR"**：只含视觉变更、不含逻辑改动——让 reviewer 明确知道"本 PR 的全部 diff 都是预期的视觉变化"，不需要逐张判断是不是 bug；
2. PR 描述写明重组原因与影响面（例："字体从 Inter 切到系统字体，影响全部 412 个 story"），然后全量接受；此时 CI 加 `--force-rebuild` 全量重截，防止 TurboSnap 因 story 文件未变而漏截；
3. 重组前后各留一次全量构建的链接存档（改版前后的对照记录，验收与回溯都要用）；
4. 重组 PR merge 后**冻结日常视觉变更约一周**（都堆进重组 PR 处理），避免"重组 diff + 日常 diff"叠在一起失去对照意义。

**误报治理的流程面**（工具侧六表见 28-C3，这里补组织动作）：

| 动作 | 内容 |
|---|---|
| flaky 备案制 | 无代码变更而两次结果不同的 story 记入 flaky 清单并当周治理（多为动画/异步未等稳）；逾期不治理的从 CI 移除并挂 issue，不许长期"红了先重跑" |
| diff 面积阈值 | 差异面积低于阈值（如 0.01%）自动通过并留痕——亚像素噪音不值得人眼审查 |
| snapshot 数量预算 | 每 story 默认 1 个视口；响应式断点在 play 内切 viewport，不乘出多份 snapshot |
| accept 权限收敛 | 有 accept 权限的只有 owner 与本 PR 改动者；"接受全部"每次使用都在 PR 描述留原因 |

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| 重组后部分 story 还是旧截图 | TurboSnap 按 git diff 圈 story，字体/token 变更不改 story 文件 → 未被圈中 | 重组 PR 用 `--force-rebuild` |
| rebase 后基线"丢了"（大量假 diff） | rebase 改写提交历史，分支与 main 的共同祖先变化 | rebase 后全量构建并接受继承差异；或约定 squash merge 保持历史线性 |
| merge 进 main 后视觉 CI 突然红 | 并行的两个视觉 PR 先后 merge，后者的 baseline 不含前者变更 | 含视觉变更的 PR 走 merge queue 串行化 |

### 补充：时序类组件测试：fake timers、退出动画与 user-event/fireEvent 选型

**是什么**：Toast 自动关闭、Tooltip 进出延时、退出动画播完才卸载（[04-A3](04-A3-退出动画-难题-visible-mounted-双状态机.md) 双状态机）——这些组件的契约含时间维度，测试必须能**推进时间**而不是等待时间。核心工具 `vi.useFakeTimers()`：把 `setTimeout/setInterval/Date` 换成受控实现，`vi.advanceTimersByTime(ms)` 手动走到任意时刻。

**为什么值得单列**：时序测试是 flaky 重灾区——真实等待（`sleep(3000)`）让单条用例吃满 3 秒、CI 慢机器必挂；而 fake timers 又有与 user-event、动画事件配合的隐藏坑。选型与写法值得一次讲清。

**怎么做**：Toast 时序契约（duration 到点进入退出态、退出动画播完才卸载——两个时刻分开断言）：

```tsx
// packages/components/src/toast/toast.timing.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { toast, ToastProvider } from './toast';

afterEach(() => {
  vi.useRealTimers();
  toast.destroy(); // holder 是模块级单例（Lv2），RTL 的 cleanup 管不到，必须手动清
});

function renderApp() {
  return render(
    <ToastProvider>
      <button onClick={() => toast.success({ content: '已保存', duration: 3000 })}>触发</button>
    </ToastProvider>,
  );
}

describe('Toast 时序契约', () => {
  it('duration 到点进入退出态，退出动画播完才真正卸载', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));

    // 2999ms：仍在（自动关闭计时未到）
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByText('已保存')).toBeInTheDocument();

    // 3000ms：进入退出态——A3 双状态机 visible=false / mounted=true
    act(() => vi.advanceTimersByTime(1));
    const item = screen.getByText('已保存');
    expect(item.className).toContain('toast-exit');

    // jsdom 不跑 CSS transition（04-A3），transitionend 必须手动派发；
    // A3 若是"transitionend 优先 + 超时兜底"，这里走兜底计时 + 手动事件的组合
    act(() => vi.advanceTimersByTime(300)); // 退出动画 300ms 的兜底计时
    fireEvent.transitionEnd(item);
    expect(screen.queryByText('已保存')).not.toBeInTheDocument(); // 此刻才 unmount
  });

  it('hover 暂停自动关闭，移开后重新计时', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: '触发' }));
    const item = screen.getByText('已保存');

    fireEvent.mouseEnter(item);
    act(() => vi.advanceTimersByTime(10_000)); // hover 中：不关
    expect(screen.getByText('已保存')).toBeInTheDocument();

    fireEvent.mouseLeave(item);
    act(() => vi.advanceTimersByTime(3000)); // 移开后重计 3000ms
    expect(screen.queryByText('已保存')).not.toBeInTheDocument();
  });
});
```

三个机制要点：

1. **`advanceTimersByTime` 必须包 `act`**：推进时间会触发 setState，不包 act 则 React 的更新落在本轮断言之后（本文坑 1 的时序变体）；
2. **jsdom 不实现 CSS transition**：`getComputedStyle` 不计算动画、`transitionend` 永不自然触发——所以退出动画的首选路径（事件）与兜底路径（超时）要各测一遍：事件用 `fireEvent.transitionEnd` 手动派发，超时用 advanceTimers 推进；
3. **此处用 fireEvent 是正确选择而非妥协**：`transitionEnd` 不是用户输入，是对浏览器事件的模拟——这正是 fireEvent 的本职（选型表见下）。

**user-event 与 fireEvent 的选型表**（原则：模拟"用户"用 user-event，模拟"事件"用 fireEvent）：

| 维度 | userEvent | fireEvent |
|---|---|---|
| 模拟层级 | 完整输入序列：pointerdown → focus → pointerup → click，带坐标与指针语义 | 单个合成事件直达元素 |
| 焦点行为 | 真实移动焦点（focus 变化可被断言） | 不触发焦点移动（除显式 fireEvent.focus） |
| 键盘语义 | 按键序列有映射（`{Enter}` 在按钮上会触发 click） | keyDown 就只是 keyDown |
| 适用场景 | 一切"用户会怎么做"的交互断言 | 引擎事件（transitionEnd/scroll）、带 dataTransfer 的 drag（[07-A6](07-A6-事件边界.md) 的用法）、直接改受控值驱动 onChange |
| 与 fake timers 共存 | 必须 `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`，否则内部延时永不前进 | 天然兼容 |

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| userEvent 点击后用例挂起直到超时 | fake timers 下 userEvent 内部的延时走假时钟，永不前进 | `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` |
| advanceTimers 后断言仍拿到旧 DOM | 状态更新发生在 act 之外 | 推进动作包 `act(() => vi.advanceTimersByTime(n))` |
| 用例间出现"幽灵 toast" | toast holder 模块级单例，cleanup 卸不掉 | afterEach：`toast.destroy()` + `vi.useRealTimers()` |
| transitionEnd 派发了但没卸载 | 监听节点与派发节点不一致（监听在 toast 容器，事件派在文本节点上） | 对照实现确认监听者，必要时 `item.closest('.toast')` 定位 |

### 补充：jsdom 的能力边界与 Playwright 补位

**是什么**：jsdom 是纯 JS 实现的 DOM——文档结构、事件模型、脚本执行是真的；布局、渲染与浏览器专有 API 是没有的。[07-A6.7](07-A6-事件边界.md) 从"自定义指针交互"一个切口讲过 jsdom/Playwright 两层分工；本节给组件库视角的系统性缺失清单、统一 mock 策略，以及"何时停止 mock、上 Playwright"的判定线。

**缺失清单与受灾区**：

| jsdom 缺失 | 具体表现 | 受影响组件（本大纲语境） |
|---|---|---|
| 布局引擎 | `offsetWidth/offsetHeight` 恒 0，`getBoundingClientRect()` 全 0 矩形 | Typography 溢出检测（[23 号](23-VirtualList-Anchor-Progress-等.md)）、Tooltip 定位、Table 固定列 |
| IntersectionObserver | `window.IntersectionObserver` undefined，构造即抛 | Anchor scrollspy（23 号）、虚拟列表可视触发、LazyImage |
| ResizeObserver | undefined | Tree 行高回写（[18 号](18-Tree.md)）、Collapse 测量 |
| 真实滚动 | `scrollTop` 可赋值但无滚动行为；`scrollIntoView` 不存在 | Table 双表同步、锚点定位 |
| CSSOM 动画 | `getComputedStyle` 不计算 transition/animation；`getAnimations` 无 | A3 退出动画（见上节） |
| matchMedia | undefined | Drawer 移动端判定、暗色模式监听 |
| canvas 光栅化 | 2d context 存在但无渲染管线 | Watermark（[22 号](22-水印-Watermark-攻防趣味题.md)）、ColorPicker 取色 |

**mock 策略：集中、可触发、可断言**。mock 的价值不在"让代码不报错"，而在把浏览器回调变成测试可手动触发的信号。mock 实现放 `src/test/mock-io.ts`（测试要 import 它拿实例），setup 只负责挂载：

```ts
// packages/components/src/test/mock-io.ts —— 可被测试 import 的 mock 实现
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    MockIntersectionObserver.instances.push(this); // 登记：测试由此拿到实例
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect() {
    this.observed = [];
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  /** 测试专用：手动报告某元素的交叉状态（jsdom 没有真实交叉计算） */
  trigger(el: Element, isIntersecting: boolean) {
    this.callback(
      [{ target: el, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }] as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}
```

```ts
// vitest.setup.ts 追加（原 setup 见本文上文）
import { MockIntersectionObserver } from './src/test/mock-io';

// 挂载 IO mock
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// ResizeObserver：够用的最小 mock（组件库测试很少需要手动触发行高变化）
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { writable: true, value: MockResizeObserver });

// matchMedia（matches 可控；window.matchMedia 默认 undefined）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {}, // 旧 API，老组件还在用
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

// scrollIntoView：jsdom 无此方法，组件内调用会 TypeError
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function scrollIntoView() {};
```

用 mock 驱动的可运行用例（Anchor 的 scrollspy 逻辑：IO 报告可见 → 高亮同步）：

```tsx
// packages/components/src/anchor/anchor.io.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MockIntersectionObserver } from '../test/mock-io';
import { Anchor } from './anchor';

beforeEach(() => {
  MockIntersectionObserver.instances = []; // 用例间清空实例登记
});

describe('Anchor scrollspy（IO mock 驱动）', () => {
  it('区块进入判定区 → 对应锚点高亮', () => {
    render(
      <Anchor
        items={[
          { key: 'a', href: '#a', label: '章节A' },
          { key: 'b', href: '#b', label: '章节B' },
        ]}
      />,
    );
    const io = MockIntersectionObserver.instances.at(-1)!;
    const linkA = screen.getByRole('link', { name: '章节A' });

    expect(linkA.getAttribute('aria-current')).toBeNull(); // 初始无高亮

    act(() => io.trigger(io.observed[0], true)); // 手动报告第一个区块可见
    expect(linkA.getAttribute('aria-current')).toBe('true');
  });
});
```

**何时停止 mock、上 Playwright**——判定线是"mock 之后测的还是不是原命题"：

- 值得 mock：组件对 API 的**消费逻辑**（收到 isIntersecting=true 之后做什么）——mock 只替换信号源，被测逻辑不变；
- 不值得 mock：**API 自身的语义**（rootMargin 怎么折算判定区、scrollIntoView 连滚所有可滚祖先）——mock 的行为是自己写的，测它等于测 mock；
- 必须真浏览器：布局断言（宽高/位置）、滚动行为、hover/焦点态的真实 CSS、跨浏览器差异。

Playwright 侧最小用例（布局断言的归属示例）：

```ts
// e2e/typography-overflow.spec.ts —— 与 07-A6.7 的指针用例同一层
import { test, expect } from '@playwright/test';

test('Typography 溢出时截断且保留完整文本', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=components-typography--overflow');
  const text = page.getByTestId('ellipsis-line');
  // 只有真浏览器里才成立：scrollWidth > clientWidth = 真溢出
  const overflowed = await text.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflowed).toBe(true);
});
```

**坑**：

| 症状 | 根因 | 修法 |
|---|---|---|
| mock 后全绿，真浏览器里功能挂 | mock 只满足"API 存在"，真实语义（阈值/时序）与 mock 不一致 | 按判定线归层：语义断言移 Playwright，mock 只驱动消费逻辑 |
| 部分用例仍报 matchMedia undefined | 多 project/workspace 配置下该项目的 setupFiles 没引这份 setup | 逐项目核对 vitest 配置的 setupFiles |
| io.trigger 没生效 | IO 在 useEffect 里构造，断言先于 effect 执行 | 渲染断言用 getByRole（自带等待渲染完成）后再触发；trigger 本身包 act |
