# React 组件库实战大纲：组件实现的功力清单

> 定位：第五份文档。《基础大纲》阶段 3 只讲了组件设计模式，本章补全另一半：**组件库工程 + 每个组件的硬核考点**。
> 三层结构：Part A 通用内功（所有组件共享的硬技术，不先练这些，写任何复杂组件都会撞墙）→ Part B 组件清单（按功力分级，每个组件 = 考点 + 要点 + 对标）→ Part C 工程化（从 demo 到可发布的库）。
> 一句话：**组件库是 React 功力的试炼场——API 设计考抽象，组件实现考细节，工程化考全局。**

---

# Part A：通用内功（组件库的地基，先练这个）

## A1. 受控/非受控双模式（30 行 hook，处处要用）
- 原理：外部传 `value` 则受控（内部不存状态），否则用内部 state；`onChange` 永远回调
- 坑：受控↔非受控切换警告；`defaultValue` 只能消费一次（惰性初始化）；受控组件不回显的 bug
- ✍️ 实现 `useControllableState`，并写 Switch/Input/Select 三个双模式组件验证

## A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）
- **floating-ui**：定位计算 + flip/shift/size 中间件；为什么不要自己写定位
- Portal 挂载点与 z-index 治理（多级弹层的层级管理器）
- hover 意图延时（进 100ms 出 300ms）、级联菜单 hover 链保持
- 滚动/resize 时跟随重定位；`useClickOutside`（mousedown 阶段、忽略触发元素、多弹层嵌套豁免）

## A3. "退出动画"难题（visible/mounted 双状态机）
- 关闭时 `visible=false` 但**保持挂载**，播完动画才真正 unmount
- `onTransitionEnd` + timeout 兜底；CSSTransition / AnimatePresence 的原理都是这个
- 动画期间 `pointer-events: none`；列表项退出动画与卸载竞态
- ⚠️ 这是初级与高级组件代码最显眼的分水岭

## A4. 焦点管理
- **焦点陷阱**（Modal 内 Tab 循环：可聚焦元素查询 + wraparound + Shift+Tab）
- 打开时记住触发元素，关闭时焦点还回
- **roving tabindex**（Tabs/Radio 组的键盘模型：只有一个 tab stop，方向键移动）
- `:focus-visible` 与 `:focus` 样式区分（键盘用户才显示焦点圈）

## A5. 键盘导航与 ARIA
- **WAI-ARIA Authoring Practices 是组件库圣经**——每种组件都有标准键盘模型
- 必背模式：listbox（↑↓/Home/End/typeahead）、dialog（focus trap + Esc）、tree、combobox、grid
- typeahead：连按字母匹配选项
- `aria-live` 播报 Toast 数量、自动完成结果数（读屏用户体验）

## A6. 事件边界
- React 17+ 事件委托在 root；原生监听 document 时与 React 事件的执行顺序
- capture 阶段拦截技巧（编辑器画布、弹层互斥都靠它）
- passive listener（wheel/touch 性能）

## A7. SSR 与环境兼容
- `useId`（hydration 安全的表单 id 关联：label htmlFor ↔ input id）
- `useLayoutEffect` 的 SSR warning → `useIsomorphicLayoutEffect`
- window/document 守卫； hydration mismatch 的典型来源（随机数/时间）

## A8. ref 体系与 API 生态
- forwardRef 透传（React 19 起 ref 直接是 prop）；DOM ref vs 实例方法（`useImperativeHandle`：focus/open/scrollTo/reset）
- props 合并纪律：`{...rest}` 排除内部 props；clsx + tailwind-merge
- 泛型组件（`Select<T>` 的 value 类型推导）与 `ComponentProps` 类型工具

## A9. 样式与主题方案选型
- 四条路线对比：CSS Variables+BEM / CSS-in-JS（antd v5 cssinjs）/ Tailwind preset（shadcn 路线）/ CSS Modules
- ConfigProvider 注入 token；暗色主题（变量切换）；**样式按需加载**（cssinjs 天然按需 vs css 文件要 sideEffects 处理）

---

# Part B：组件清单（按功力分级）

## Lv1 基础组件（打地基，练细节功力）

| 组件 | 考点 |
|---|---|
| **Button** | loading 时保持宽度防抖动；防重复点击（loading 期间 disabled）；波纹效果原理（antd Wave：一次性伪元素动画）；**中文双字自动加空格**（"确 定"，antd 的经典细节） |
| **Icon** | SVG 组件化、`fill: currentColor` 继承文字色、tree-shaking 按需引入 |
| **Typography** | 单行/多行省略（line-clamp）+ **溢出才显示 Tooltip**（JS 测量 scrollWidth） |
| Grid/Space/Divider | 响应式 gutter token 化 |

> Lv1 考的不是难，是**细节洁癖**——按钮 loading 宽度抖动这种 1px 问题最能区分功力。

## Lv2 弹层与反馈组件（功力主考场之一）

### Modal（★★★）
- Portal + 焦点陷阱 + ESC + **滚动锁**（body overflow hidden + 滚动条宽度补偿，防页面抖动）+ 退出动画（A3）
- 多层弹层 z-index 顺序；确认框动画期间的连点
- **`Modal.confirm()` 命令式 API**：`createRoot` 动态挂载、返回 Promise、更新内容
- ⚠️ 命令式的 context 丢失问题（静态方法拿不到 ConfigProvider 主题 → antd `<App>` 组件的由来，必懂）

### Toast / Message（★★★）
- 命令式 API 设计：`message.success()` / hooks 化 `useMessage`（React 18 createRoot 后的正确姿势）
- 队列与最大条数、**同 key 复用更新**（loading → success 原地变身）
- hover 暂停自动销毁；退出动画后卸载；`aria-live` 播报

### Tooltip（★★☆）
- hover 意图延时、边界 flip、`disabled` 按钮不冒泡的坑（pointer-events）、多行溢出自动触发（与 Typography 联动）

### Drawer / Popover / Popconfirm / Notification
- Drawer：四方向动画 + 拖拽改宽
- Popover：受控/非受控双模式（A1）+ trigger 数组
- Notification：列表型与 message 的定位分工

### Avatar / Badge / Tag
- Avatar：堆叠组合、按名字 hash 取色、字符过多自动缩放（scale 算法）
- Tag：动态增删的进出场动画（受控关闭确认）

## Lv3 复杂交互组件（公认最考功力）

### Select（★★★★）——键盘+a11y+长列表三合一考题
- 高亮项与选中项分离；键盘全套（↑↓/Enter/Esc/typeahead）
- 受控非受控、labelInValue、清空、后缀箭头
- **万级 options 虚拟滚动**；远程搜索（防抖 + loading + 失焦取消）
- 多选：maxTag 溢出显示 "+2"、已选项被删除后的回显

### DatePicker（★★★★★）——日历是最苦的组件
- 日历生成算法：6×7 网格、前后月补齐、周起始日国际化
- 面板导航（月/年快捷切换）、范围选择（hover 实时预览区间）、禁用日期函数
- 键盘直接输入解析（dayjs parse 容错）、presets 快捷项
- 对标：antd DatePicker（看它怎么把"选择器"抽象成通用 PickerShell）

### Table（★★★★）——中后台之王
- 受控协议设计：分页/排序/筛选 onChange 一次回调带全参
- **固定表头 + 固定列**（sticky/双表同步滚动）；列宽拖拽（拖动时表格布局切换）
- 行选择跨页保持；展开行/树形数据
- 虚拟滚动（万行）；单元格 ellipsis + tooltip
- ⚠️ 本质是"协议工程"：API 设计比渲染难

### Tabs（★★★）
- compound 模式 + roving tabindex + aria roles
- 懒渲染 vs 保持挂载（destroyInactiveTabPane）；溢出滚动箭头
- **指示条动画**（下划线宽度/位置过渡 = FLIP 的迷你应用）

### Collapse（★★☆）
- `height: auto` 不能过渡的经典难题 → `grid-template-rows: 0fr→1fr` 技巧或测量固定高

### Tree（★★★★）
- 递归渲染 + **虚拟化**（拍平树 + 动态缩进）
- 复选框三态（checked/halfChecked 父子联动算法）
- 拖拽换父、异步加载、搜索命中展开并高亮

### Cascader / TreeSelect / Transfer（★★★☆）
- Cascader：级联面板、搜索时展示全路径、异步加载子级
- TreeSelect：树 + 选择收敛（antd 把 Tree/Select 复用成三个组件，学它的分层）
- Transfer：双列表穿梭 + 搜索过滤

### Upload（★★★★）
- 隐藏 input + 点击/拖拽/粘贴三入口
- beforeUpload 返回 false 转手动上传；xhr onprogress 进度
- **并发控制（p-limit）、分片上传、断点续传（hash 秒传）**、图片裁剪预览

### Carousel / Slider / Rate / ColorPicker（★★★）
- Carousel：自动播放（visibilitychange 暂停）、无限循环（clone 首尾）、拖拽切换
- Slider：pointer capture 拖拽、键盘步进、tooltip 位置换算
- ColorPicker：HSV 面板拖拽 + 渐变背景计算 + 格式转换

### 水印 Watermark（★★☆，攻防趣味题）
- canvas 生成平铺、MutationObserver 防 DOM 删改（antd 源码的攻防博弈，值得一看）

### VirtualList / Anchor / Progress 等（★★☆）
- VirtualList：**向上 prepend 时 scrollTop 修正**（IM 向上加载不跳动的关键，接 IM 场景）
- Anchor：scrollspy（IntersectionObserver）+ 高亮同步
- Progress：环形 svg `stroke-dashoffset`

### ConfigProvider / App（模式级）
- 全局上下文根：主题 token、国际化、弹层挂载容器
- `<App>` 解决命令式组件的 context 隔离（接 Lv2 Modal）

## Lv4 范式之争（组件之上的认知）

| 路线 | 代表 | 思想 |
|---|---|---|
| 全家桶（带样式） | antd / arco / semi | 开箱即用，主题 token 化 |
| **Headless（无样式）** | **Radix UI（交互圣经）**、HeadlessUI、Base UI | 只做行为/无障碍，样式全给消费者 |
| 复制粘贴式 | shadcn/ui | 源码进你的仓库，cva 管理变体，彻底可控 |

- cva（class-variance-authority）：变体的类型安全管理
- 建议：**行为学 Radix，工程学 antd，形态学 shadcn**

---

# Part C：工程化（从 demo 到可发布）

1. **仓库**：pnpm monorepo（components / hooks / token / utils 分包），turbo 任务编排
2. **构建**：tsup/father/unbuild；ESM+CJS 双产物；dts 类型；`sideEffects` 精确声明（按需加载的命门）
3. **文档**：Storybook/dumi，MDX 用例即文档；**视觉回归**（Chromatic/Lost Pixel）；a11y 检查（axe 插件）
4. **测试**：Vitest + Testing Library 逐组件；Storybook play function 交互测试
5. **版本**：changesets 自动 changelog；semver 纪律；大版本迁移配 codemod（jscodeshift）
6. **兼容**：browserslist 矩阵、SSR hydrate 冒烟测试、React 18/19 双版本跑测

---

# 学习路线与产出（约 9 周）

| 周 | 内容 | 产出 |
|---|---|---|
| 1–2 | Part A 内功逐项写 demo + Lv1 组件 | useControllableState 等 9 个内功 hook |
| 3–4 | Lv2：Modal + Toast + Tooltip + Drawer | 弹层四件套（含命令式 API） |
| 5–8 | Lv3 挑五个硬的：**Select / Tabs / DatePicker / Table / Tree** | 核心五件 |
| 9 | Part C 工程化 | monorepo + Storybook + changesets 发布 1.0 |

# 源码阅读优先级

1. **Radix UI**：无样式组件的行为/无障碍实现，每个组件几百行，最易吸收
2. **antd**：工程化与细节功力（Wave 波纹、两个汉字空格、Watermark 攻防、Tree 三态）
3. shadcn/ui：cva 变体管理与现代形态
4. WAI-ARIA Authoring Practices：所有键盘/ARIA 行为的唯一权威

# 面试高频考点速查（本章覆盖）

受控非受控双模式 / 退出动画双状态机 / 焦点陷阱与 roving tabindex / 命令式组件与 context 丢失 / Select 键盘导航与 typeahead / 弹层定位与 z-index 治理 / 树三态与递归虚拟化 / 滚动锁与宽度补偿 / 样式按需与 sideEffects
