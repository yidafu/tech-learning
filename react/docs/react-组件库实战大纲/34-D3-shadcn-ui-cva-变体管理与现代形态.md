---
title: "D3. shadcn/ui：cva 变体管理与现代形态"
---
> 本文是《源码阅读优先级》按小节拆分后的续篇，上一部分见 [33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark.md](33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark.md)。
## D3. shadcn/ui：cva 变体管理与现代形态

- **读什么**：任意组件文件（如 `components/ui/button.tsx`），看它如何用 **cva**（class-variance-authority）把变体组织成一张类型安全的表：

```ts
// shadcn button 的骨架形态（示意其组织方式）
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium', // base：所有变体共享
  {
    variants: {
      variant: {                  // 每个变体轴是一张映射表
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white',
        outline: 'border border-input bg-background',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

cva 的价值：variants 表同时产出**类型**（props 自动推导出 `variant?: 'default' | 'destructive' | 'outline'`）与**运行时类名**——变体的类型安全、默认值、类名组织一表三得。这与自研库的 `clsx(cond && 'x')` 散写形成直接对照。
- **顺带读三件事**：`cn()`（clsx + tailwind-merge 的组合，A8 的 props 合并纪律）；`Slot` 的 `asChild` 模式（把渲染权交给子元素，行为注入不增 DOM）；**复制粘贴哲学的工程含义**——源码进用户仓库、没有 npm 依赖升级，大版本迁移 = git diff（与 C5 的 codemod 策略互为镜像：一个是"库不动用户动"，一个是"用户不动命令动"）。

### 带读路线：读前准备——它不是库，是"复制源"

- **第一件事是纠正阅读姿势**：shadcn/ui **没有可 import 的组件 npm 包**（要装 npm 的只有它的 CLI）。你项目里的 `components/ui/dialog.tsx` 就是"源码本体"——它从官方 registry 复制而来，进你仓库后随意改。所以读它读的不是"它怎么实现的"，而是"**它给了你什么模板、模板怎么组织、你怎么改**"——与 32 号（读行为契约）、33 号（读两层工程）是三种完全不同的读法。
- **仓库**：[github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)。组件模板源文件放在仓库 apps/ 站点目录的 registry 里（路径随站点版本代号 v3/v4 变动，以仓库现状为准），CLI 从 registry 取模板。**读模板不必 clone**：你 `npx shadcn@latest add` 拉进项目里的文件与 registry 里的同源，直接读项目里的即可；要读"全量模板与 registry 协议"才去仓库。
- **版本约定**：模板随站点改版演进（风格代号 new-york 系、样式基线 v3/v4 两代），**以你本地 CLI 生成的东西为准**，博客教程的类名可能对不上。涉及版本差异处本篇一律用"以现行 CLI 为例"。
- **工具**：在一个试验项目里跑 `npx shadcn@latest init`（生成 `components.json`）→ `npx shadcn@latest add dialog button`（复制模板 + 装依赖）——读完本篇你要能回答"这两条命令各做了什么"，那是带读路线一的内容。
- **前置**：三件套的原理已在大纲别处展开——asChild 在 [25-Lv4-范式之争](25-Lv4-范式之争-组件之上的认知.md)的 asChild/slot 补充节、cva 变体表在本文开头、`cn()`（clsx + tailwind-merge）在 [09-A8](09-A8-ref-体系与-API-生态.md) A8.3 与 [10-A9](10-A9-样式与主题方案选型.md) 的 tailwind-merge 坑——本篇只讲它们在模板里的**组合形态**，不重复原理。

### 带读路线一：cli add 的机制（components.json 与 registry 协议）

`npx shadcn@latest add dialog` 做了四件事，也是本路线的四个读点：

1. **读 `components.json`**（init 时生成的项目配置）：`style`（风格）、`rsc`（是否 React Server Components 环境）、`tailwind` 段（`config`/`css` 路径、`baseColor`、`cssVariables` 开关）、`aliases`（`components`/`ui`/`utils`/`lib`/`hooks` 的路径别名）——**registry 里的模板是通用代码，aliases 决定它落到你项目的哪里**。完整形态（以现行 CLI 为例，字段以你本地的为准）：

```jsonc
// components.json —— CLI 的工作合同：读它决定模板去哪、怎么改
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",            // 风格代号（决定从哪个模板集取）
  "rsc": true,                     // Next.js App Router 环境（模板按 RSC 兼容写法生成）
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts", // v4 基线改为 css 内配置，此字段可能缺省
    "css": "app/globals.css",       // cssVars 与 baseColor 的注入落点
    "baseColor": "neutral",
    "cssVariables": true            // 开关：true 时颜色走 CSS 变量（自研换肤的地基）
  },
  "aliases": {
    "components": "@/components",   // 模板 import 路径改写的依据
    "utils": "@/lib/utils",         // cn 的家
    "ui": "@/components/ui",        // add 的默认落点
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

   读点：`cssVariables: true` + `css` 路径 = 主题系统的全部落点（复刻任务要动的就是这里下发的变量）；`aliases.ui` = 模板的家；`rsc` = 模板的服务端兼容声明。**改 aliases 可以把模板引进 monorepo 的自研包目录**——这是"用 shadcn 起步自研库"最实用的一招（路线三第 3 步的前置）；
2. **按 registry 协议取模板**：CLI 请求 registry 的 item 定义（Dialog 的 item），拿到 `files`（模板源码或路径）、`dependencies`（要装的 npm 包，如 `@radix-ui/react-dialog`）、`registryDependencies`（**递归依赖的其他 registry item**——Dialog 依赖 utils 里的 `cn`，CLI 会把 utils 一起拉下来）；
3. **写入与改写**：模板按 aliases 写到 `components/ui/dialog.tsx`，import 路径改写为你的别名（`@/lib/utils`）；npm 依赖安装；
4. **CSS 变量注入**（`cssVariables: true` 时）：把 item 声明的 `cssVars`（亮/暗两套 `--background`、`--primary` 等）合并进你的全局 CSS。

**registry item 的 schema（以现行 CLI 为例）**是"自研库换一种分发方式"的关键参照，核心字段：

```jsonc
// registry item 的骨架（字段名以官方 schema 为准：ui.shadcn.com/schema）
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",              // registry:ui / registry:lib / registry:block / registry:style …
  "files": [ /* { path, content | target } 模板本体 */ ],
  "dependencies": ["@radix-ui/react-dialog"],   // npm 依赖
  "registryDependencies": ["utils"],  // 其他 registry item（递归拉取）
  "cssVars": { /* 亮暗两套 CSS 变量 */ }
}
```

读点三个：`registryDependencies` 的递归解析（自研库的"组件依赖组件"在复制模型下怎么表达）；`type` 枚举的分工（ui 是原子件、lib 是工具、block 是整页组合）；`cssVars` 与 `baseColor` 的关系（颜色系统的落点在 CSS 变量，不在 JS）。**自研启示**：registry 协议 = "npm 包 + monorepo"之外的第三种组件分发方案（模板分发），内部组件库（设计强定制、不需要热更新）用它反而更顺手——C1 的仓库形态可以保留，分发层换成自建 registry。

协议之上还有一层**索引**：registry 的总清单（registry.json 一类的索引文件）列出所有可用 item 及其元信息，CLI 的 `add` 命令按索引找到 item 再按前述四步执行。自建 registry 时索引 + item 两层都要提供（最小实现：一个静态 JSON 索引 + 一组模板文件，挂到任意静态服务器或 npm 私服即可）。验证协议理解的最快方式：**手写一个只有 utils + button 两个 item 的迷你 registry，用 CLI 的自定义 registry 配置把它拉进试验项目**——这条验证写进路线一的读后动作。

路线一读后动作（两条，做完才算过站）：
1. 上述迷你 registry 验证（utils 一个 item + button 一个 item，button 的 `registryDependencies` 指向 utils）；
2. 用 `git diff` 记录一次 `add` 的全部落盘变化（新文件、改动的 css、lockfile）——这份 diff 就是"模板分发到底动了我的项目什么"的完整答案，也是复制哲学与传统 npm 安装差异的物证。

### 带读路线二：组件模板长什么样（Radix + cva + tailwind-merge 三件套）

以 `components/ui/dialog.tsx`（add 后）为标本，从上到下五个读点：

1. **import 区——三件套分工**：`@radix-ui/react-dialog`（全部行为：开合状态、焦点圈、Esc、层叠——32 号带读过的 focus-scope/dismissable-layer 都在里面）、`cva`（本文件 overlay/content 的变体表——本文开头已用 button 展开过 cva 机制，此处看它用在动画态上）、`cn`（来自 `@/lib/utils`，clsx + tailwind-merge 的组合，A8.3 已展开）；
2. **导出面——十来个命名导出**：`Dialog`（root，转发 Radix）、`DialogTrigger`/`DialogClose`（asChild 让渡渲染权——25 号已展开）、`DialogPortal`、`DialogOverlay`（遮罩）、`DialogContent`（主容器）、`DialogHeader`/`DialogFooter`（纯布局件）、`DialogTitle`/`DialogDescription`（无障碍命名件——**这两个不是摆设**，缺了它们 Radix 会 console 警告，呼应 32 号 Dialog 站的"缺 title 警告"分支）。导出按职责分四类：

| 类别 | 导出 | 模板里做的事 | 删了会怎样 |
|---|---|---|---|
| root | Dialog | 转发 Radix root（状态/context） | 全散 |
| 触发/关闭 | DialogTrigger、DialogClose | 转发 + asChild 让渡 | 只能命令式开关 |
| 视觉件 | DialogPortal、DialogOverlay、DialogContent | cva 变体 + cn 合并的重灾区 | 本任务改造对象 |
| 语义件 | DialogTitle、DialogDescription、DialogHeader、DialogFooter | 布局/无障碍命名，几乎无样式 | 读屏拿不到名字 + Radix 警告 |

   这张分类表就是改造时的"动哪些、不动哪些"地图（视觉件动词汇表，语义件保命名链）；
3. **forwardRef + cn 合并**——每个导出的固定形态：

```tsx
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80',           // 库方类
      'data-[state=open]:animate-in ...',          // data-state 驱动的进入/退出动画
      className,                                    // 消费者类（tailwind-merge 保证能赢）
    )}
    {...props}
  />
));
```

   这个形态是三件套的汇合点：**行为来自 Radix 原语（overlay 是 DialogPrimitive.Overlay）、样式来自原子类 + data-state 选择器、合并纪律来自 cn**——对照 A8.3 的三条合并纪律（内部 props 解构、className 合并、事件组合）逐条打勾。注意两个细节：泛型参数用 `React.ElementRef/ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>` 从 Radix 原语**借类型**（自己不维护 props 类型，原语升级类型自动跟随）；`className` 参数排在 cn 的**最后一位**（消费者的类在 tailwind-merge 的类组消解下天然赢过库方类——A8.3 的"消费者覆盖库"纪律的落地）；
4. **data-state 驱动样式**：Radix 原语在开/关时给节点挂 `data-state="open|closed"`，模板用 `data-[state=open]:...` 选择器挂动画类——**行为与样式的接缝就这一个属性**（headless 的 data-state 契约，25 号 Lv4 表格里"库交付行为层"的具体落点）。退出动画能播，靠的是 Radix presence 的延迟卸载（32 号问题 5）——模板自己一行状态机都没写。验证实验：DevTools 选中 overlay 节点，手动把 `data-state` 从 open 改成 closed——**动画立刻播放**，说明样式层只认属性不认状态（属性在，动画就在；这就是"接缝"的全部含义）。这个实验也解释了为什么 token 改造必须保留 data-state（复刻任务的翻车点第一条）；
5. **动画插件依赖**：`animate-in` 这类类名不是原生 Tailwind，来自动画后缀库（v3 时代是 tailwindcss-animate、v4 基线用 tw-animate-css 一类，以你模板的 tailwind 配置为准）——这是"模板能跑"的隐形依赖，读 `components.json` 与全局 CSS 的 `@plugin`/配置段确认。

读完五个读点，回答本路线的总问题：**shadcn 模板 = Radix 的行为 + cva 的变体组织 + cn 的合并纪律 + data-state 的接缝**——四样东西拼出一个"可无限改的起点"，它卖的不是组件，是**组装方式**。

对照读法（半小时）：把 `button.tsx`（本文开头已展过 cva 骨架）与 `dialog.tsx` 并排开，做一张小对照表——button 是**单元素组件**（cva 表全在 trigger 一层，变体轴是 variant/size）；dialog 是**复合组件**（cva 分散在 overlay/content 两层，变体轴主要是动画态）。对照后回答：复合组件的 cva 为什么按"视觉部件"拆表而不是一张总表？（每张表的生命周期不同——overlay 的动画词汇与 content 的尺寸词汇无关，拆表让各自演化不互相牵连。）这个问题没有标准答案，答出自己的理由就算过站。

路线二读后动作（一条）：用 `wc -l` 数一下 dialog.tsx 与 button.tsx 的行数，再数一下"纯样式行"（cva 表 + cn 调用）与"纯转发行"（forwardRef 壳 + props 透传）的比例——这个比例就是"模板=组装说明书"的量化证据，也是你判断"某个组件值不值得收编进自研库"的快速指标（转发占比越高，自己写越亏）。

### 带读路线三：改造成自研库的起点

为什么拿它当起点而不是从零写：模板经过了超大规模生产验证（键盘/无障碍由 Radix 背书，32 号已读）、样式全部 token 化（换肤只动 CSS 变量）、代码量小（每文件一两百行，无黑盒）。改造路线四步：

1. **token 换血**：把模板里的 Tailwind 原子类（`bg-background`、`rounded-lg`）替换/映射为自研 token（`bg-surface`、语义半径变量）——保留结构（forwardRef/cn/data-state 三件），只换样式词汇表；
2. **合并器替换（可选）**：不用 Tailwind 的库把 `cn` 换成自写合并器（A8.3 的纪律不变，实现换掉）——注意 tailwind-merge 的类组消解能力会丢，A9.5 坑 3 讲过对策；
3. **分发决策**：模板收进自研 monorepo（C1 结构）当 npm 包发，或自建 registry 走复制分发（路线一的协议）——两条路的维护成本模型不同（C5 的版本纪律 vs git diff 迁移），按库的受众选；
4. **补测试**：模板默认不带测试——键盘行为加 C4 的 Testing Library 用例（APG 键盘表翻测试的完整方法在 [35-D4](35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA.md)，35 号的复刻任务正好是 Tree 的范文）。

每步都是"增量替换"而非重写——这正是模板哲学的用法：**你接管的不是黑盒依赖，是一份有维护历史的初始代码**。

改造前先做"三问体检"（决定这个模板值不值得收编）：
- **问行为**：这个模板背后的 Radix 原语集，与 32 号我读过/复刻过的原语重合度多高？（重合度高 = 心里有数，敢改；几乎没读过 = 先回 32 号对应组件站）
- **问词汇**：模板的类名词汇表（bg-background/border-input/…）与我自研 token 的语义粒度差多少？（一对一能映射的改造最便宜；一对多/多对一要先画映射表再动手——复刻任务的验收 2 依赖这张表）
- **问接缝**：data-state 之外模板还有没有别的行为-样式接缝（如 data-disabled、aria-hidden 驱动的样式）？（每个接缝都要在 token 版里保留，漏一个就出现"功能在但视觉不响应"的暗病）

三问的答案决定改造的成本量级：三问全绿（重合高、词汇一对一、接缝只有 data-state）改一个 dialog 半天；三问全红（Radix 没读过、词汇错位、接缝散落）先回 32 号与 A9 补课，硬改只会产出一个"既不像 shadcn 也不像自研"的四不像。

### 复刻小任务：用它的 Dialog 模板改一个自研 theme token 版

**输入**：`npx shadcn@latest add dialog` 得到的 `components/ui/dialog.tsx`（保持 Radix 依赖不动）。
**任务**：把 overlay 与 content 的样式词汇表换成自研 token——目标是"换主题只改 token 文件，组件文件零改动"。

动手顺序（先映射后替换，顺序错了会返工）：
1. **枚举**：把 dialog.tsx 里 overlay/content 两个 cva 表中的全部原子类抄成清单，按视觉职责分组（颜色/间距/圆角/阴影/动画）；
2. **映射**：每组给一个自研 token 名（对照路线三"三问体检"的词汇表），亮/暗两套值写进 token 文件；
3. **替换**：cva 表里原子类换成 token 类名，data-state 接缝原样保留（state 变体继续驱动 in/out 动画类）；
4. **回归**：按验收 1-4 逐条过，任何一条红都先回第 2 步查映射表。

token 文件的最小形态（两个主题各一份，组件文件只引用变量名）：

```css
/* tokens/dialog.css —— 词汇表：组件层的类名只允许引用这里的变量 */
.dialog-surface {
  background: var(--dialog-bg);
  color: var(--dialog-fg);
  border: 1px solid var(--dialog-border);
  border-radius: var(--dialog-radius);
  box-shadow: var(--dialog-shadow);
}
.dialog-overlay { background: var(--dialog-overlay-bg); }

[data-theme='light'] {
  --dialog-bg: var(--color-surface);
  --dialog-overlay-bg: rgb(0 0 0 / 50%);
  --motion-enter: ...;
}
[data-theme='dark'] {
  --dialog-bg: var(--color-surface-inverse);   /* 换肤只动这两块 */
  --dialog-overlay-bg: rgb(0 0 0 / 70%);
}
```

改造对照（示意骨架，改造点注释标出）：

```tsx
// dialog.tsx（改造后骨架）——行为零改动，只换样式词汇表
const dialogContent = cva('dialog-surface', {          // 原：'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg ...'
  variants: {
    state: {
      open: 'dialog-surface--in',                      // 原：data-[state=open]:animate-in fade-in-0 zoom-in-95 ...
      closed: 'dialog-surface--out',                   // 原：data-[state=closed]:animate-out ...
    },
  },
});

// token 侧（CSS）：语义变量全部来自主题文件
// .dialog-surface { background: var(--dialog-bg); border-radius: var(--dialog-radius); ... }
// .dialog-surface--in { animation: var(--motion-enter) ...; }
// @media (prefers-color-scheme: dark) 或 [data-theme='dark'] 下只需重定义变量
```

验收标准（全部满足才算完成）：
1. **行为等价**：键盘模型与原模板完全一致——Tab 循环、Esc 关闭、焦点还回触发元素、打开时焦点入 content（用键盘手测或 [35-D4](35-D4-WAI-ARIA-Authoring-Practices-所有键盘-ARIA.md) Dialog 模式页的键盘表逐条过）——Radix 没动，这条必须全绿，否则说明把行为层改坏了；
2. **换肤零侵入**：亮/暗两套主题各一份 token 文件（CSS 变量定义），切换主题时组件文件 git diff 为零；
3. **布局件保真**：Header/Footer/Title/Description 语义件保留且 `aria-labelledby`/`aria-describedby` 链路完整（读屏能念出标题与描述——用 devtools 的 accessibility 面板验）；
4. **退出动画仍在**：关闭时退出动画正常播完再消失（data-state 接缝没被 token 改造破坏）；
5. **登记**：把改造后的模板登进你自己的 registry（哪怕是本地文件夹 + 一份手写 registry.json item），`registryDependencies` 指向你的 utils——体会路线一协议的"组件依赖组件"。

常见翻车点（做之前扫一眼，返工率最高的是前两条）：
- **把 `data-[state=...]` 类名一起换掉**——data-state 是行为接缝不是样式词汇，换掉它等于把开关拆了（验收 4 会红）；
- **token 值写死在组件文件里**（"就一个 dialog 先写死"）——验收 2 的"换肤零侵入"直接失败，坚持所有值进 token 文件；
- **只改了 content 忘了 overlay**——遮罩的暗色/模糊没跟上主题，暗色模式发灰；
- **把 `forwardRef` 链改断**（改造时顺手重构 props 转发）——A8 的 ref 生态断在中间层，消费者拿不到 DOM 节点。

### 坑：读不下去的五个时刻（症状 → 根因 → 修法）

shadcn 的坑与 32/33 号不同源：Radix/antd 的坑多在"读不懂源码"，shadcn 的坑多在**"姿势错位"与"版本漂移"**——它太新、迭代太快、且形态反直觉（不是库）。五个时刻按出现频率排序，前两个几乎人人踩。

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 想读"库的源码"，clone 了仓库却不知道读哪个目录 | 它不是库——组件模板在 registry 目录里，且随站点版本代号移动路径 | 直接读你项目里 `components/ui/*.tsx`（与 registry 同源）；要读全量再去仓库搜 registry 目录 |
| 2 | 博客里的模板类名与你 add 出来的对不上 | 模板随站点改版演进（风格代号 + Tailwind v3/v4 基线差异） | 以本地 CLI 产物为准；对照差异时先看 `components.json` 的 style 与 tailwind 段 |
| 3 | 照模板抄的 `data-[state=open]:animate-in` 不生效 | 动画类依赖后缀插件（v3 的 tailwindcss-animate / v4 的 tw-animate-css 一类），没装或没在配置里启用 | 看全局 CSS 的插件引入与模板文档的安装前置；以你模板的 tailwind 配置为准 |
| 4 | 消费者传的 `p-6` 盖不掉模板的 `p-3`（或自定义类合并异常） | tailwind-merge 只认 Tailwind 类组；换 token 后若残留非 Tailwind 类，merge 失效 | 对策见 [10-A9](10-A9-样式与主题方案选型.md) A9.5 坑 3（自定义类组注册或统一原子类） |
| 5 | 想给模板加功能（如受控 open），一改就断 | 模板把状态所有权完全交给 Radix root，中间层没有 state 可插 | 在最外层包装自己的受控组件转发给 `Dialog`（A1 的双模式套在外面），不要钻进模板改 Radix 的传参链 |

最后一条与 32 号的判断标准同构：**读 shadcn 读不下去，多半不是它难，是你在用"读库"的姿势读"读模板"**——模板的正确打开方式是改它（复刻任务），不是理解它。改完一个 Dialog 模板，你对"headless + 样式层"分工的理解会比再读三个组件源码更深（分工的完整论述在 [25-Lv4-范式之争](25-Lv4-范式之争-组件之上的认知.md)）。

与同系列其他三篇的接口：
- **32 号（Radix）**：shadcn 模板的行为底座就是 32 号带读的原语集——改模板遇到"为什么 Esc 只关最顶层"这类问题，答案都在 32 号问题 2；反过来，32 号读完没有消费场景的话，用 34 号的模板当"Radix 使用范文"效果最好（读 Radix 源码时拿 shadcn 模板对照消费侧，理解会完整一倍）；
- **33 号（antd）**：同为"主题 token 化"（antd v5 cssinjs 的 seed/map/alias 派生 vs shadcn 的 CSS 变量直出）——两篇读完各写三行对比（运行时开销、SSR 行为、换肤粒度），这份对比就是 A9 样式选型表的现实注脚；
- **35 号（APG）**：模板行为等价的验收标准（本篇验收 1）就是 APG Dialog 模式页的键盘表——35 号把"表格翻测试"的方法讲透，本篇的验收直接复用。

读完本篇的固定动作（与前两篇相同的归宿规则）：token 版 Dialog 进自研库的 dialog 目录，迷你 registry 的两个 item 留在库里当"模板分发"的试验田；`components.json` 的 aliases 改造记录写成一篇内部笔记（下次起新库直接抄）。

