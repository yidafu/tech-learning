---
title: "C2. 构建：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；sideEffects 精确声明（按需加载的命门）"
---
> 本文是《Part C：工程化（从 demo 到可发布）》按小节拆分后的续篇，上一部分见 [26-C1-仓库-pnpm-monorepo-components-hooks-tokens.md](26-C1-仓库-pnpm-monorepo-components-hooks-tokens.md)。
## C2. 构建：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）

### 构建器选型：三个工具的定位差异

| 工具 | 驱动内核 | 定位 | 适合 |
|---|---|---|---|
| **tsup** | esbuild（极快） | 零配置起步的通用库打包器，`dts: true` 一键出类型 | 组件库、hooks、utils 的默认选择，社区事实标准 |
| **father** | esbuild + babel 双模式 | 蚂蚁出品，面向"带样式的中大型组件库"：内置 less 编译、保留目录结构的 bundless 产物、与 dumi 文档链路天然衔接 | 样式走 less、生态对齐 antd 系的库 |
| **unbuild** | rollup + mkdist | 面向 JS 工具库，auto 模式自动判断入口，build.config.ts 极简 | 不带样式的纯逻辑包（CLI、SDK） |

一句话决策：**新组件库默认 tsup；样式链路重度对齐 antd（less、按需样式编译）选 father；纯工具包选 unbuild**。本篇以 tsup 为例。

### 是什么：构建要交付什么

组件库的构建产物要同时满足四种消费者：

1. **现代打包器**（Vite/webpack/Rspack）要 ESM——为了 tree-shaking（按需加载）。
2. **Node 侧 SSR/Jest** 要 CJS——`require()` 无法加载纯 ESM 包。
3. **TypeScript 用户**要 `.d.ts`——编辑器提示与类型检查。
4. **样式**要原样可引的 css 文件——`import '@react-ui/token/colors.css'`。

### 怎么做：tsup 配置完整示例

`packages/components/tsup.config.ts`：

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],        // 统一入口；sideEffects 小节会讲为什么它配合 tree-shaking 已经足够
  format: ['esm', 'cjs'],         // 双产物：index.mjs（摇树用）+ index.cjs（Node/老工具链用）
  dts: true,                      // 生成 dist/index.d.ts，并把内部类型打包成单文件
  sourcemap: true,                // 报错栈能映射回 TS 源码，用户提 issue 的可复现性翻倍
  clean: true,                    // 每次构建先清空 dist，防止旧产物残留混入发布
  external: ['react', 'react-dom'], // peer 依赖永不打进产物——用户环境里已有一份，打进第二份会出双 React 实例事故
  treeshake: true,                // 构建自身产物级别的摇树（注意：消费端的按需加载靠 ESM 格式 + sideEffects 声明，不是这个开关）
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.mjs' : '.cjs', // 显式后缀，与包是否声明 "type": "module" 解耦
  }),
  banner: {
    // 组件用了 useState 等客户端 API，Next.js App Router 的服务端组件一旦 import 必须看到这行
    js: "'use client'",
  },
});
```

带样式的 token 包要处理 css——tsup 的定位是 JS 打包器，css 不该被卷进 JS，用构建钩子复制：

```ts
// packages/token/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // css 不参与 JS 编译：构建成功后复制进 dist，由 package.json 的 exports 子路径单独暴露
  onSuccess: async () => {
    const { copyFile, mkdir } = await import('node:fs/promises');
    await mkdir('dist', { recursive: true });
    await copyFile('src/colors.css', 'dist/colors.css');
  },
});
```

`packages/token/package.json`（产物声明的完整样板，components 同构）：

```json
{
  "name": "@react-ui/token",
  "version": "1.0.0",
  "description": "设计 token：CSS Variables 与 JS 侧常量",
  "sideEffects": ["**/*.css"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./colors.css": "./dist/colors.css",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup"
  }
}
```

四个字段各司其职：

- `exports` 是现代入口表，**`types` 条件必须排在最前**——TS 解析器按序短路，顺序错了类型直接丢。
- `"./colors.css"` 子路径让样式可独立引入；`"./package.json"` 子路径是好习惯（一些工具需要读它）。
- `files: ["dist"]` 限定发布内容，防止源码、测试、node_modules 混进 tarball。
- `main`/`module`/`types` 是给不读 `exports` 的老工具链的兜底，三者与 `exports` 保持一致就不会出现"构建器能解析、运行时找不到"的分裂。

### `sideEffects`：按需加载的命门（本节按第一性原理完整走一遍）

大纲把 `sideEffects` 单独加粗为"命门"，因为**这一行 JSON 决定了你的库引一个组件是进 10KB 还是进 500KB，且声明错误时构建零报错、问题只在用户端以"样式消失/功能失灵"的形式出现**。

#### 第一步：用户代码发生了什么

```tsx
// 业务工程
import { Button } from '@react-ui/components';
```

打包器（webpack/Rollup/Vite/esbuild 的生产构建）顺着 `exports` 的 `import` 条件找到 `dist/index.mjs`。**摇树只可能发生在 ESM 产物上**——为什么？

#### 第二步：ESM 的静态性是摇树的物理前提

ESM 规范有三条铁律：`import`/`export` 必须写在模块顶层、模块路径必须是静态字符串、导出的绑定对导入方只读。这三条让打包器**不必执行任何代码**，纯靠文本级的静态分析就能回答三个问题：每个文件导出了哪些名字、每个名字被谁引用、模块图的边（依赖边）是谁连向谁。CJS 做不到：`require()` 可以写在 `if` 里、路径可以字符串拼接、`exports` 可以运行时挂属性——模块边界对静态分析是黑盒，所以 `require` 产物永远整包进入。**这就是 C2 死磕双产物、且 `import` 条件必须指向 ESM 文件的原因之一。**

#### 第三步：标记-清除算法

打包器从用户入口做"标记-清除"（mark & sweep）：

1. `import { Button }` 只把 `Button` 这个**绑定名**标记为存活；
2. 顺藤摸瓜，Button 实现体内部 import 到的 `./styles`、`@react-ui/hooks/use-controllable-state` 也被标记存活；
3. `dist/index.mjs` 里 `export { Modal }`、`export { Select }`……没有任何入口引用它们，成为**死代码候选**。

"候选"不等于"能删"——差最后一道判决。

#### 第四步：副作用判决，sideEffects 就是判决书

模块顶层代码可能在被 import 的瞬间就产生可观察影响：`document.addEventListener(...)`、`window.__uiTheme = ...`、给原生原型打补丁、`import './button.css'`（对打包器来说这是一条**没有导出、纯靠副作用生效**的依赖边）。删掉一个有副作用的模块 = 改变程序行为。打包器默认保守：**不确定就不删**。

保守的直接后果：你的库永远整包进入用户产物——业务只用了 Button，Table、DatePicker、Tree 全被打了进去。组件库"体积原罪"就卡在这。

`sideEffects` 字段是包作者向打包器提交的**承诺书**，两种形态：

- `"sideEffects": false`："本包**任何**模块被删除都不会产生可观察影响" → 打包器把所有未标记模块连同其依赖边直接摇掉。
- `"sideEffects": ["**/*.css"]`：**精确承诺**。数组里匹配到的文件 = "有副作用，必须保留"；数组外的一切文件（所有 ts/tsx）= "无副作用，可摇"。

#### 第五步：错误声明的两种事故（构建零报错）

**事故 A：样式被摇掉。** 组件库样式走独立 css 文件，包作者照抄了某教程写 `"sideEffects": false`。`src/index.ts` 里有这样一行：

```ts
import './index.css'; // 全局主题挂载：给 :root 注入 CSS Variables
```

这行 import 没有任何导出绑定，静态分析里它是"无引用的副作用模块"。既然作者白纸黑字承诺全库无副作用，打包器删掉它天经地义——于是用户按需引 Button，**全局主题变量整表消失**，所有组件颜色回落到默认值。症状极其隐蔽：库作者自己的 demo 全量引入、每个组件的样式 import 都被实际组件引用着，永远正常；只有用户按需引入时才裸奔，且构建不报任何错。

**事故 B：全局注册被摇掉。** 假设 token 包入口有一段没有导出的注册代码（`registerTheme(defaultTheme)`，往全局注册表写默认主题）。它没有绑定名、没有引用者，`sideEffects: false` 让它直接蒸发。症状是"间歇性失灵"：显式 import 的组件工作正常，被摇掉的模块承担的注册任务无声消失，排查时 grep 代码明明都在。

两种事故的共同阴险点：**报错永远不会出现在你的构建日志里，只出现在用户的浏览器里**。

#### 第六步：正确声明

```json
{
  "sideEffects": ["**/*.css", "**/*.less"]
}
```

- glob 语义：`**/*.css` 匹配任意深度的 css 文件（含根目录——webpack 早期版本 `*.css` 匹配不到根目录文件，历史惯例会同时写 `["*.css", "**/*.css"]`，现代版本 `**/*.css` 已足够）。
- 原则是**最小集合**：只把真正"无导出、纯副作用"的文件类型列入。如果库里有运行时注册副作用，正确做法不是把它藏进数组，而是**把那段代码改造成显式 API**（导出一个 `setup()` 函数让用户主动调用）——副作用显式化后，它就能被静态分析理解，不再依赖声明兜底。
- 注意声明要**同时写在每个子包**里（utils/hooks/token/components 各自的 package.json），打包器摇的是整棵依赖图上每个包的承诺。

#### 第七步：闭环验证（库作者的必修动作）

```bash
# 建一个最小验证工程
mkdir side-effect-check && cd side-effect-check
npm init -y && npm i @react-ui/components vite
```

```ts
// main.ts —— 只引一个组件
import { Button } from '@react-ui/components';
document.body.append(Object.assign(document.createElement('ui-button'), {}));
// 简化：直接 render 也行，重点是不 import 其他组件
```

```bash
npx vite build
# 打开 dist/assets 里的产物：
# 1. 搜索 "Modal" 字符串 —— 搜不到 = tree-shaking 生效
# 2. 搜索 Button 对应的 css 规则（如 --ui-color-primary）—— 搜得到 = 样式未被误删
```

这个验证应做成 CI 的固定断言（构建后跑一次检查脚本），防止某次重构引入了隐性副作用而无人察觉。

#### 与 A9 样式方案的呼应

大纲 A9 讲过四条样式路线，这里补上它们与 sideEffects 的关系闭环：**CSS Variables/BEM 与 CSS Modules 路线**产出的独立 css 文件是"游离的副作用"，必须靠 sideEffects 数组保护；**cssinjs 路线（antd v5）**样式与组件运行时同体，组件被摇掉则样式注入代码同体消失，天然按需，代价是运行时开销与 SSR 抽样式的复杂度；**shadcn/Tailwind 路线**类名写进组件源码、原子 css 由 Tailwind 编译器扫描生成，树摇问题在这个维度上直接不存在。选样式方案时，"按需加载的实现代价"应当计入决策。

### 常见坑

1. **症状**：Node/Jest 工程 `require('@react-ui/components')` 报 `ERR_REQUIRE_ESM`。**根因**：只出了 ESM 产物，或 `exports` 里漏了 `require` 条件。**修法**：tsup `format: ['esm', 'cjs']` 双格式 + exports 双条件（上面的样板配置已覆盖）。
2. **症状**：dts 构建报 `TS4023: Exported variable has or is using name 'XXX' from external module but cannot be named`。**根因**：某公共 API 的类型引用了一个未被导出的内部类型，类型打包器无法在 .d.ts 里指名它。**修法**：把该类型从内部移到公共出口（`export type { ... }`），或改用 `import type` 显式标注。
3. **症状**：发布的包里没有 css，用户 `import '@react-ui/token/colors.css'` 报 404。**根因**：`onSuccess` 复制钩子没跑（本地手跑 tsup 绕过了 turbo），或 `files` 没含 dist。**修法**：发布统一走 `turbo run build && changeset publish`（见 C5），并在 CI 加"产物清单断言"——构建后检查 dist/colors.css 存在再放行。
4. **症状**：Next.js App Router 里组件报 "useState is not a function" 或 hydration 崩溃。**根因**：服务端组件环境 import 了用 hook 的组件，而产物没有客户端标记。**修法**：tsup `banner: { js: "'use client'" }`（hooks 包与 components 包都要加；utils 纯函数包不要加，加了反而阻止它在服务端组件中使用）。

### C2.1 多产物配置实战：esm/cjs/umd 三格式、tsup vs vite lib 与条件导出

**是什么**：正文已交付 esm+cjs 双产物；umd 补上第三种消费方式——`<script>` 直引（无打包器的存量页、CodePen、内部平台 iframe）。多产物的另一半是**条件导出**：同一个入口按消费环境（打包器 / Node / 浏览器 / 开发 / 生产）分发不同文件。

**为什么难**：umd 有硬约束（仅单入口、无代码分割、需要全局名）；构建器要在 tsup 与 vite lib 之间选；exports 的条件顺序本身就是语义——写错不报错，只在不同用户环境里表现不同。

**机制分步**：

1. 三格式职责：esm 给打包器（tree-shaking）、cjs 给 Node/Jest、umd 给 script 直引（自带模块系统语义，全局名挂 window）。
2. tsup 出三格式：把正文的单配置升级为**配置数组**——esm/cjs 一段（多入口自由）、umd 一段（单入口 + `globalName`）。umd 档做**自包含**（react 一起打进来）：script 直引场景通常没有另一份 React，自包含才能开箱即用；代价是体积自负，所以 C2.4 给它单设一档预算。
3. vite lib 对照：`build.lib` 声明入口与 formats，rollup 生态的插件（`output.globals` 映射外部依赖的全局名、css 处理）原生可用；零运行时样式链路（css modules / vanilla-extract）的完整 vite lib 案例 A9 已给（[10-A9-样式与主题方案选型.md](10-A9-样式与主题方案选型.md) 的 A9.6），不重复。
4. 选型决策：无样式/轻样式（hooks、utils、CSS Variables 路线的 components）→ tsup；重样式链路、需要 rollup 插件精细控制（globals、css 注入、多产物变体）→ vite lib。两者别同时用。
5. 条件导出：`types` 永远第一、`default` 永远最后，中间按"越具体的条件越靠前"排（browser → development/production → import → require）。

**完整配置代码**：

`packages/components/tsup.config.ts`（正文单配置升级为三格式数组）：

```ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // 面向打包器与 Node：双格式 + 类型（正文配置原样保留）
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    noExternal: [/^@react-ui\//],           // 内部包内联（C1.3 策略 B）
    outExtension: ({ format }) => ({
      js: format === 'esm' ? '.mjs' : '.cjs',
    }),
    banner: { js: "'use client'" },
  },
  {
    // 面向 <script> 直引：umd 自包含档（react 一并打入，见机制第 2 步）
    entry: ['src/index.ts'],               // umd 仅支持单入口：多入口在此段直接报错
    format: ['umd'],
    globalName: 'ReactUI',                 // window.ReactUI.Button（发布前确认 window 无同名占用）
    target: 'es2018',                      // script 直引场景没有转译器，目标放低
    minify: true,
    sourcemap: false,
    clean: false,                          // 数组里第二段不能 clean，否则清掉第一段的产物
    noExternal: [/^@react-ui\//],
    outExtension: () => ({ js: '.umd.js' }),
  },
]);
```

`package.json` 的入口表在正文样板之上补 umd 与 legacy CDN 字段：

```json
{
  "unpkg": "./dist/index.umd.js",
  "jsdelivr": "./dist/index.umd.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./index.css": "./dist/index.css",
    "./package.json": "./package.json"
  }
}
```

vite lib 模式对照（与 tsup 二选一）：

```ts
// packages/components/vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [libInjectCss(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs', 'umd'],
      name: 'ReactUI',
      // 显式后缀：vite 默认全出 .js，package.json 未开 "type":"module" 时 Node 会把 ESM 语法的
      // .js 当 CJS 解析，require 直接 ERR_REQUIRE_ESM
      fileName: (format) =>
        ({ es: 'index.mjs', cjs: 'index.cjs', umd: 'index.umd.js' })[format],
    },
    rollupOptions: {
      // vite lib 自动 external dependencies + peerDependencies；
      // devDependencies 里的内部包会被打进产物，与 C1.3 策略 B 一致
      output: { assetFileNames: 'index.[ext]' },
    },
  },
});
```

进阶条件导出（用到再加；每个条件都必须有配套产物，否则是指向不存在文件的死条件）：

```jsonc
{
  ".": {
    "types": "./dist/index.d.ts",
    "browser": "./dist/index.browser.mjs",   // 浏览器构建：Node 专属模块换浏览器实现
    "development": "./dist/index.dev.mjs",   // 开发构建：含 prop 类型警告
    "production": "./dist/index.prod.mjs",   // 生产构建：警告剥离
    "default": "./dist/index.mjs"
  }
}
```

webpack/vite 的生产构建会命中 `production`，开发服务器命中 `development`，Node 的 require 兜底命中 `default`——同一份依赖，开发有提示、生产无体积，这正是 react、styled-components 们的做法。

**坑**：

1. **症状**：tsup 配了多入口 + umd，构建报错。**根因**：umd 仅支持单入口（无代码分割的格式约束）。**修法**：拆配置数组——esm/cjs 多入口、umd 单入口聚合（上面配置的结构就是为此）；或 umd 档交给 vite lib。
2. **症状**：TS 用户装包后编辑器"没有类型"，JS 用户一切正常。**根因**：exports 里 `types` 条件不在第一位——TS 按序短路，先命中了 import/require 就不再找类型。**修法**：`types` 永远第一；同时保持顶层 `types` 字段与之一致（正文四个字段各司其职）。
3. **症状**：Node 工程 `require('@react-ui/components')` 报 ERR_REQUIRE_ESM，明明配了 cjs 产物。**根因**：fileName/outExtension 没写显式后缀，cjs 产物叫 `index.js`，而包没声明 `"type": "module"` 之外的歧义被 Node/打包器按 ESM 解析（vite lib 默认后缀全 `.js`）。**修法**：显式 `.mjs`/`.cjs` 后缀（上面两份配置都示范了）。
4. **症状**：unpkg/jsdelivr 打开 404。**根因**：umd 段配置没进构建（CI 只跑了第一段）、或 `files` 漏 dist。**修法**：构建统一入口一条命令跑完整个配置数组；发布前加 tarball 清单断言（C1.3 断言脚本同思路：检查 `dist/index.umd.js` 存在）。
5. **症状**：Jest 28+ 的 jsdom 测试跑的是 browser 条件产物，与 Node 用户侧行为不一致。**根因**：jsdom 环境默认带 `browser` 导出条件。**修法**：`testEnvironmentOptions: { customExportConditions: ['node', 'require'] }`，让测试对齐 Node 消费路径。

### C2.2 d.ts 生成收口：tsc / rollup-plugin-d.ts / api-extractor 三路线

**是什么**：类型是发布物的一半（编辑器提示、类型检查都消费它），三条生成路线：

| 路线 | 机制 | 产物形态 | 附加能力 |
|---|---|---|---|
| tsc `declaration` | 编译器原生 emit | 每模块一个 .d.ts，目录与源码同构 | 零依赖；declarationMap 支持跳回源码 |
| tsup dts / rollup-plugin-d.ts | rollup 把声明图打成单文件 | `dist/index.d.ts` 一个文件 | 与 JS 构建同一份配置；`resolve` 内联依赖类型 |
| api-extractor | 先 tsc 出声明，再 rollup + 修剪 | 单文件 + **API 报告 `api/*.api.md`** | 公共类型面可 diff 进 CI；trimming 控制体积 |

**为什么难**：类型体积直接进用户的 node_modules 和 TS server 索引；跨包类型引用（C1.3 策略 B 下 `.d.ts` 里不能残留 `@react-ui/*` 路径，npm 上没这些包）；公共类型面没人审查地膨胀——每个顺手 `export` 都是对外的永久承诺。

**机制分步**：

1. **tsc 路线**：`emitDeclarationOnly` 只出声明；结构保留让 deep import 的类型自然可寻；缺点是文件数多、重复的 utility 类型不消重。
2. **tsup dts 路线**：`dts: true` 基于 rollup-plugin-d.ts 把整张声明图收成单文件；`dts: { resolve: true }` 连 workspace 内部包与 node_modules 的类型一起内联——**策略 B 的必配项**，收口后 `.d.ts` 里不再出现 `@react-ui/hooks` 的 import。
3. **api-extractor 路线**：tsc 先出临时声明 → api-extractor rollup 成发布用的单个 `dist/index.d.ts`，同时生成 `api/@react-ui/components.api.md`（公共 API 的可读清单）进 git；CI 里报告没提交则失败——**类型面的变更从此有 code review**。
4. **类型体积与 chunking**：单文件路线顺带消重（同一 utility 类型 N 处引用收成一份）；tsc 路线靠目录天然分块但要接受文件数；跨包共享的类型抽成 `@react-ui/types` 公共类型包——注意这个包**必须发布**（聚合包类型里会引用它），别掉进 C1.3 的私有包 404 坑；`declarationMap` 是"跳转体验 vs tarball 体积"的二选一。

**完整配置代码**：

tsconfig.build.json（路线一/三共用的声明发射）：

```jsonc
// packages/components/tsconfig.build.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,        // 发布取舍见机制第 4 步；不发布就删掉这两行
    "emitDeclarationOnly": true,
    "outDir": "dist/types",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx", "src/**/*.stories.tsx", "src/**/__tests__/**"]
}
```

tsup 路线只改一行：

```ts
export default defineConfig({
  // ...
  dts: { resolve: true },          // 内联 workspace 与 npm 依赖的类型（C1.3 策略 B 必配）
});
```

api-extractor.json（路线三）：

```jsonc
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "./dist/types/index.d.ts",
  "apiReport": {
    "enabled": true,
    "reportFolder": "./api/",
    "reportTempFolder": "./api/tmp/"
  },
  "docModel": { "enabled": false },
  "dtsRollup": {
    "enabled": true,
    "untrimmedFilePath": "./dist/index.d.ts"
  },
  "tsdocMetadata": { "enabled": false },
  "messages": {
    "compilerMessageReporting": { "default": { "logLevel": "error" } },
    "extractorMessageReporting": { "default": { "logLevel": "error" } },
    "tsdocMessageReporting": { "default": { "logLevel": "none" } }
  }
}
```

package.json scripts（tsup 出 JS，tsc + api-extractor 收类型）：

```json
{
  "scripts": {
    "build": "tsup && tsc -p tsconfig.build.json && api-extractor run && rimraf dist/types",
    "build:api-local": "tsc -p tsconfig.build.json && api-extractor run --local"
  },
  "devDependencies": {
    "@microsoft/api-extractor": "^7.47.0",
    "rimraf": "^6.0.0"
  }
}
```

CI 审查步骤（公共类型面的卡点）：

```yaml
- name: API report must be committed (public type surface review)
  run: |
    pnpm --filter @react-ui/components run build
    git diff --exit-code -- packages/components/api/ || \
      (echo "API 报告未提交：公共类型面的变更需要随 PR 审查后重新生成提交" && exit 1)
```

**坑**：

1. **症状**：用户 TS 报 TS2307，找不到模块 `@react-ui/utils`——npm 上确实没有。**根因**：聚合包内联了 JS 但 `.d.ts` 里还残留内部包 import。**修法**：`dts: { resolve: true }` 或 api-extractor 的 dtsRollup 打平；再加一条产物断言——`grep -c '@react-ui/' dist/index.d.ts` 必须为 0。
2. **症状**：api-extractor 首次跑直接失败或把报告清空。**根因**：没有先本地生成并提交 `api/*.api.md` 基线，CI 模式发现"报告缺失"按设计失败。**修法**：先 `pnpm build:api-local` 生成基线随 PR 提交，之后 CI 只审查增量。
3. **症状**：IDE 从 .d.ts 跳转"定义"落到 node_modules 里不存在的 src 路径。**根因**：declarationMap 指向的源码没进发布包（本就不该进）。**修法**：要么不生成 declarationMap（体积最优），要么接受"跳转到 .d.ts 本体"——发布前把 `*.d.ts.map` 从 files 清单排除。
4. **症状**：`.d.ts` 单文件几 MB，TS server 在大仓库里索引卡顿。**根因**：泛型工具类型层层展开、无 trimming。**修法**：api-extractor 的 `publicTrimmedFilePath`/`betaTrimmedFilePath` 修剪等级；共享类型下沉 `@react-ui/types`；给 CI 加一条 `dist/index.d.ts` 体积上限断言（如 500KB）。

### C2.3 tree-shaking 验证：agadoo、真实打包断言与 sideEffects 粒度

**是什么**：两件工具把正文 sideEffects 小节第七步的一次性手工验证变成 CI 资产——**agadoo**（一条命令快筛"这个入口可不可摇"）与**真实打包断言**（以用户视角打一个 mini 入口，断言未用组件缺席、样式在场）。

**为什么难**：正文两起事故（样式被摇掉 / 全局注册被摇掉）的共同阴险点是"构建零报错、只在用户端发作"——所以验证必须**模拟用户打包**，而不是检查自己的构建日志；agadoo 只覆盖"导出可摇性"，摇不摇得干净（组件间隐性依赖边、css 是否误删）必须真实打包才知道。

**机制分步**：

1. **agadoo 快筛**：`pnpm dlx agadoo ./packages/components/dist/index.mjs`——对入口做打包分析并报告可摇性。它回答"设计上能不能摇"（ESM、无副作用标记、导出可追踪），不回答"摇完剩多少"。
2. **搭"用户替身"工程** `apps/treeshake-check`：只依赖 workspace 里的组件包 + esbuild；两个入口——`entry-button.ts`（只 import Button）、`entry-css.ts`（只 import index.css）。
3. **断言脚本**：esbuild bundle 且**不 minify**（标识符不被重命名，断言才稳定），断言三件事：Button 在场（反向事故——sideEffects 数组写错时可能全被摇掉）；未引用组件的稳定标记缺席（标记选实现里的字符串字面量：类名前缀、错误文案——压缩与重命名都不影响字面量）；css 变量在样式产物里（正文事故 A 的 CI 化）。
4. **sideEffects 粒度三档**：`false`（全纯——css 走显式 import 才安全，正文事故 A 的雷区）；`["**/*.css"]`（默认推荐）；逐文件清单（库里确有 js 副作用模块时才用——而更好的做法仍是把副作用显式化为 API，正文第六步原则）。若走 C2.4 的 es/ 按需档，再加一条 deep import 样式子路径的存在性断言。

**完整配置代码**：

`apps/treeshake-check/package.json`：

```json
{
  "name": "@react-ui/treeshake-check",
  "private": true,
  "scripts": {
    "verify": "node verify.mjs"
  },
  "dependencies": {
    "@react-ui/components": "workspace:*"
  },
  "devDependencies": {
    "esbuild": "^0.24.0"
  }
}
```

两个入口：

```ts
// apps/treeshake-check/src/entry-button.ts —— 用户替身 1：只用 Button
import { Button } from '@react-ui/components';

// 引用一下，防止被当作纯 re-export 优化掉
console.log(Button);
```

```ts
// apps/treeshake-check/src/entry-css.ts —— 用户替身 2：只引全局样式（正文事故 A 的探测器）
import '@react-ui/components/index.css';
```

断言脚本：

```js
// apps/treeshake-check/verify.mjs —— CI 断言：按需产物干净、样式未被误删
import { build } from 'esbuild';

const js = await build({
  entryPoints: ['src/entry-button.ts'],
  bundle: true,
  format: 'esm',
  write: false, // 不落盘：只要产物文本
});

const css = await build({
  entryPoints: ['src/entry-css.ts'],
  bundle: true,
  write: false,
});

const jsText = js.outputFiles.map((f) => f.text).join('\n');
const cssText = css.outputFiles.map((f) => f.text).join('\n');

const failures = [];

// 1. 用了的必须在场（反向事故：sideEffects 声明异常时可能连 Button 都被摇掉）
if (!/\bButton\b/.test(jsText)) failures.push('Button 被整体摇掉：sideEffects 声明异常');

// 2. 没用的必须缺席——标记从真实 dist 里复制（先全量 import 一遍 grep 出
//    仅存在于对应组件实现里的字面量），不是拍脑袋写的组件名
for (const marker of ['ui-modal', 'ui-tree', 'ui-date-picker']) {
  if (jsText.includes(marker)) failures.push(`未引用组件的标记 ${marker} 进入产物：tree-shaking 失效`);
}

// 3. 样式必须在场（正文事故 A 的 CI 化）
if (!cssText.includes('--ui-color-primary')) {
  failures.push('CSS 变量缺席：全局样式被摇掉（sideEffects 数组漏 css）');
}

if (failures.length) {
  console.error('FAIL: tree-shaking 断言失败\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('ok: tree-shaking 验证通过');
```

turbo 任务与 CI 接线（turbo.json 追加，C1.2 的完整配置里插一项）：

```json
{
  "tasks": {
    "verify": { "dependsOn": ["^build"], "outputs": [] }
  }
}
```

```yaml
- name: Tree-shaking assertions (user-perspective bundle)
  run: pnpm turbo run verify --filter=@react-ui/treeshake-check
```

`--filter` + `dependsOn: ["^build"]` 保证断言永远跑在新鲜产物上（上游先构建，缓存照常生效）。

**坑**：

1. **症状**：agadoo 绿灯，业务侧就是摇不动。**根因**：业务命中的不是被验证的那个文件——exports 的 import/default 条件指向了 cjs/umd 产物，或业务侧打包配置只读 `main`。**修法**：agadoo 指向的入口与 exports `import` 条件指向的文件必须是同一个；条件导出自查见 C2.1。
2. **症状**：断言永远绿（假阴性），或 minify 环境下误报。**根因**：标记选了组件名/标识符——minify 会改名（漏报），而未压缩产物里组件名可能因内部引用意外在场（误报）。**修法**：标记必须从 dist 产物里实际复制（先故意全量 import 一遍，grep 出只在目标组件实现里出现的字面量，再写进断言），并在脚本里保持不 minify。
3. **症状**：css 断言在 cssinjs 路线（A9）下失效——产物里根本搜不到变量名。**根因**：样式运行时注入，不在静态 css 文件里。**修法**：该路线的验证改为"渲染一个组件，断言 style 标签出现"（jsdom 一条 Vitest 用例即可），与 A9 的路线选型对齐。
4. **症状**：CI 里断言吃到旧产物，本地正常。**根因**：绕过 turbo 直接 `node verify.mjs`，上游 dist 是上次的。**修法**：一律 `turbo run verify --filter=...` 走任务图（上面的接线），不要裸跑脚本。

### C2.4 包体积三档预算：es 按需 / esm 全量 / umd+polyfill，size-limit 卡进 CI

**是什么**：三档预算 = 按三种消费方式各设一条体积红线，对齐 [01-引言](01-引言-这份大纲在六份文档里的位置.md)验收指标 #10（es/module、esm、umd 三产物可用）：

| 档 | 模拟的用户 | 度量对象 |
|---|---|---|
| es 按需档 | `import { Button }`（tree-shaking 后） | 单组件净体积 |
| esm 全量档 | `import * as UI` 全量引入 | 整库 gzip |
| umd+polyfill 档 | `<script>` 直引（无转译） | 自包含产物（含 react）+ 目标浏览器 polyfill |

应用侧 size-limit 的基础（预算概念、为什么卡 CI）在《react-学习大纲》[28-阶段-6-性能优化与调试-1-周](../react-学习大纲/28-阶段-6-性能优化与调试-1-周.md)已讲，本节只写库侧三档的配置。

**为什么难**：库体积是乘法——库胖 1KB，全公司几百个页面各胖 1KB；三档**互相独立**，只盯一档会漏（按需档被入口文件里的隐性 import 拖胖，umd 档被内联 react 拖胖）；没有 CI 卡点的预算等于没有预算。

**机制分步**：

1. **按需档**：size-limit 的 `import` 字段是关键——它让 size-limit 只打包 `{ Button }` 这一个导出，测出的才是用户按需引入的真实体积；漏写 import 就测成全量（假红/假绿）。按需的另一条腿是 antd 式 **es/ 目录**（tsup 配置数组里追加一段 `preserveModules: true` 的 bundless 配置，产出 `dist/es/`），给不支持 tree-shaking 的老打包器提供 deep import 通道；注意它与 C1.3 策略 B 的耦合——preserveModules 下内部包的 import 不会被打平成相对路径，es/ 目录形态天然更适合策略 A（子包独立发布），配 C2.3 第 4 步的样式子路径断言一起上。
2. **全量档**：直接度量主入口 bundle 的 gzip。
3. **umd 档**：C2.1 的自包含 umd（react 已内联，体积自负）；polyfill 取舍写死口径——**一般不内置** core-js（script 直引用户自带 polyfill，文档写明支持矩阵），确要内置就单列第四档预算。
4. **预算制定纪律**：初版 = 当前实测值上浮 10% 落档；只紧不松（每次体积优化 PR 顺手收紧）；预算进 git，改动必须出现在 PR diff 里被人看见。
5. **CI 卡点**：单独一个 workflow，超限非零退出天然拦截；要 PR 评论体积对比可换 `andresz1/size-limit-action`（此处用裸命令保持零外部依赖）。

**完整配置代码**：

`packages/components/.size-limit.json`：

```json
[
  {
    "name": "按需档：只引 Button（tree-shaking 后净体积）",
    "path": "packages/components/dist/index.mjs",
    "import": "{ Button }",
    "limit": "8 KB"
  },
  {
    "name": "全量档：整库 ESM",
    "path": "packages/components/dist/index.mjs",
    "limit": "90 KB",
    "gzip": true
  },
  {
    "name": "umd 档：script 直引自包含（含 react，不含 polyfill）",
    "path": "packages/components/dist/index.umd.js",
    "limit": "160 KB",
    "gzip": true
  }
]
```

`packages/components/package.json` 追加：

```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "^8.2.6",
    "size-limit": "^8.2.6"
  }
}
```

`.github/workflows/size.yml`：

```yaml
name: Size
on: [pull_request]
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # 先按需构建组件包（turbo 缓存保证产物与 CI 一致，见 C1.2）
      - run: pnpm turbo run build --filter=@react-ui/components
      - name: Size budget (3 tiers)
        run: pnpm --filter @react-ui/components run size
      - name: Show breakdown on failure
        if: failure()
        run: pnpm --filter @react-ui/components run size:why
```

**坑**：

1. **症状**：按需档的数字与全量档一样大。**根因**：漏写 `import` 字段，size-limit 度量了整个入口。**修法**：按需档必须带 `import`（`"{ Button }"`）；两档数字接近本身就是报警信号。
2. **症状**：预算"达标"，用户实测超标。**根因**：只盯 gzip，css 与运行时注入的样式 raw 体积大 gzip 压不掉多少；或 umd 档没写明是否含 polyfill 的口径。**修法**：预算名里写死口径（上面三条 name 即文档）；css 相关的档同时看 raw 与 gzip。
3. **症状**：CI 上 size 数字来回抖。**根因**：size-limit 在 CI 里自己装依赖/构建，与主干缓存产物不同源。**修法**：先 `turbo run build`（远程缓存保证同源）再跑 size（上面 workflow 的顺序）；size 任务本身不缓存（`outputs: []`）。
4. **症状**：新组件上线一周，全量档悄悄涨穿预算。**根因**：预算长期没人看，超限才炸。**修法**：预算只紧不松的纪律 + `size:why` 在失败时自动输出构成（上面 workflow 的 failure 步骤），让"哪里胖了"和"CI 红了"同时出现。
