---
references:
  - 01-第一阶段
  - 02-第二阶段
  - 03-第三阶段
  - 04-第四阶段
  - 05-第五阶段
  - 06-第六阶段
  - 07-第七阶段
  - 08-第八阶段
---

# GUI 框架学习大纲

> 目标：从零掌握 GUI 框架的核心概念，用 TypeScript 驱动纯图形库 raylib，亲手造一个自绘保留模式 GUI 框架（绘制 → 文本 → 布局 → 事件 → 调度 → 声明式），并读懂 Flutter / Qt / Slint / GPUI / egui 各自的架构取舍。
> 用法：按阶段推进，学到哪一节就勾选对应条目；`[ ]` 未学，`[x]` 已完成。每阶段末尾有实践任务，"看懂"不算数，跑起来才算。

## 技术选型与实验平台

| 层 | 选型 | 说明 |
|---|---|---|
| 语言 | TypeScript | 框架与应用全部用 TS 编写 |
| 编译器 | ScriptC（Vercel Labs） | TS 编译为原生可执行文件（C 后端，不内嵌任何 JS 引擎） |
| 图形库 | raylib 6.0 + scriptc-raylib 绑定 | 纯图形库：开窗、输入轮询、2D 绘制原语、默认字体——只给原料，不给框架 |
| 实验平台 | macOS / Linux（x64、arm64）桌面原生窗口 | 无浏览器、无 DOM；所有「浏览器替你做的事」都要亲手做一遍 |

- 选型理由：raylib 刻意只有图形库没有 GUI 框架——没有控件、没有布局、没有事件分发、没有焦点。把这套空缺亲手补出来，就是本课程的主线。
- 已实测版本组合：ScriptC 0.4.12 + scriptc-raylib 1.0.4（`@raylib/api` 6.0.1 元数据生成）+ raylib 6.0，macOS arm64（Apple clang 17）编译运行通过；Linux 由工具链提供 x64 / arm64 目标。
- 工程注意：消费项目的 `package.json` 必须声明 `"type": "module"`；构建入口用 `scriptc-raylib run/build src/main.ts`，不要裸调 `scriptc build`（它无法发现绑定包的原生清单）。

**贯穿项目：mini-gui 框架生长路线**

| 阶段完成后 | mini-gui 获得的能力 | 产出物 |
|---|---|---|
| 一 | 开窗与帧循环 | 最小窗口 + 输入轮询 + delta 驱动动画 |
| 二 | 平台无关绘制 | Painter API + raylib 后端 + 显示列表 |
| 三 | 能排版文字 | TextPainter + 断行器 + 富文本 span |
| 四 | 能组织界面 | RenderObject 树 + 布局协议 + Row/Column/Stack |
| 五 | 能交互 | 事件总线 + 命中测试 + 焦点链 + 滚动 |
| 六 | 跑得快 | 脏标记 + 局部重绘 + 动画系统 |
| 七 | 好写好用 | signals + 声明式组件 + keyed 协调 |
| 八 | 是个框架 | 控件库 + 虚拟列表 + 测试 + 毕业项目 |

**与站群其他站的关系**

- react 站的源码复刻走 VDOM / Fiber / hooks 全量重渲染路线；本站第七阶段的 signals 走细粒度依赖追踪路线——同一问题（UI = f(state)）的两种正交解法，刻意不重复。
- webgl 站覆盖 GPU 渲染管线；本站绘制后端以 raylib 的 OpenGL 批处理为宿主，第八阶段展望 GPU 自绘后端时衔接。
- compiler 站覆盖编译原理；第八阶段展望「UI DSL 编译」时衔接（声明式 API → 编译期代码生成的演进方向）。

## 第一阶段：全局观与第一个窗口（2 周）

> 本阶段导览（分册索引）：[01-第一阶段/01-导览.md](01-第一阶段/01-导览.md)

- [ ] 1. GUI 框架是什么
  - 分层解剖：窗口宿主 / 渲染后端 / 框架内核（树、布局、事件）/ 组件层 / 应用
  - 框架替你做了哪些事：布局、命中测试、焦点、文本输入、无障碍、主题
  - 保留模式 vs 立即模式（Qt / Flutter / Slint vs egui / Dear ImGui）；浏览器 DOM 也是一套 GUI 框架——与桌面框架的同构分层
- [ ] 2. 主流框架架构地图
  - Flutter：Widget / Element / RenderObject 三树
  - Qt：QWidget + 信号槽 + raster/GL 后端；GTK4：snapshot 式录制渲染
  - SwiftUI：属性图 + diffing；Slint：声明式 DSL；GPUI（Zed）；egui：立即模式
  - 一张对照表：渲染后端、布局协议、响应式模型、无障碍支持
- [ ] 3. raylib：图形库不是框架
  - raylib 的 C API 面貌与主循环范式：`InitWindow → while (!WindowShouldClose) { 更新; BeginDrawing…EndDrawing } → CloseWindow`
  - 它给什么：开窗、事件轮询、绘制原语、纹理、默认字体
  - 它刻意不给什么：控件、布局、事件分发、焦点、无障碍——正是本课程要补的每一层
- [ ] 4. ScriptC 工具链
  - TS → 原生可执行文件（实验性编译器，官方文档 scriptc.dev）；不内嵌 JS 引擎；构建需要链接器与平台 SDK（macOS 为 Xcode Command Line Tools）
  - FFI 机制：在 TS 里声明 C 函数签名，manifest 绑定 C 符号——scriptc-raylib 的 shim 即基于此（构建产物里能看到 `ffi.json`、`raylib_shim.o`、`libraylib_shim.a`）
  - scriptc-raylib 绑定的安全模型：571 个函数的安全包装、句柄式资源管理（拒绝悬空句柄/重复释放）、字符串借用规则
  - 构建命令与产物布局：`scriptc-raylib run src/main.ts --dev`、release 构建、`build/<平台>/` 下的可执行文件与相邻 raylib 动态库
- [ ] 5. 第一个窗口与帧循环
  - 事件循环：轮询模型 vs 阻塞等待；vsync 与 targetFPS 的关系
  - delta time：帧率无关的动画驱动
  - 工程骨架：`package.json`（`"type": "module"`）、`src/main.ts`、开发/发布命令
- [ ] 实践任务：跑通最小窗口（自动关闭的可回归脚本）；用 delta 驱动一个动画；读取鼠标键盘输入并在屏幕上画出反馈

## 第二阶段：绘制层（2~3 周）

> 本阶段导览（分册索引）：[02-第二阶段/01-导览.md](02-第二阶段/01-导览.md)

- [ ] 1. 从裸调用到 Painter API
  - 为什么要平台无关抽象：后端可替换（raylib / Canvas2D / 软件光栅器 / GPU 自绘）
  - 接口设计：立即绘制 vs 记录显示列表；save/restore 语义
- [ ] 2. 基础图元
  - 颜色模型与调色板、fill / stroke 分离
  - 矩形、圆角矩形、圆与椭圆、线段；线条端点与交叠
- [ ] 3. 裁剪与变换
  - scissor 矩形裁剪栈（嵌套裁剪的求交）
  - 平移 / 缩放 / 旋转变换栈；局部坐标系与嵌套容器
- [ ] 4. 位图与九宫格
  - 纹理加载与句柄生命周期；drawImage 的源矩形/目标矩形
  - NPatch 九宫格拉伸：边框不变形的背景图
- [ ] 5. 显示列表与绘制批处理
  - 记录绘制命令的意义：重放、重排序、可测性
  - 按纹理与状态分组合批；z 序与绘制顺序的关系
- [ ] 实践任务：实现 Painter 接口 + raylib 后端；用显示列表画一张卡片 UI（圆角、边框、嵌套裁剪的滚动区、九宫格背景）

## 第三阶段：文本与排版（2 周）

> 本阶段导览（分册索引）：[03-第三阶段/01-导览.md](03-第三阶段/01-导览.md)

- [ ] 1. 字体与字形
  - 默认字体从哪来；加载 TTF；字形光栅与图集（glyph atlas）概念
  - 字号、行高与 DPI 的关系
- [ ] 2. 文本度量
  - advance、基线（ascent / descent）、行间距
  - measureText 的等价实现；单行 / 多行对齐
- [ ] 3. 断行
  - 贪心断行算法与断行点选择（空格、标点、CJK 断行）
  - 中西文混排差异；overflow 三件套：clip / fade / 省略号
- [ ] 4. 富文本 span
  - 样式分段（字重 / 颜色 / 字号）；两遍布局：先测宽再摆位
  - span 与命中几何：为第五阶段的文本光标做地基
- [ ] 5. 文本缓存
  - 测量结果缓存与失效；字形缓存策略
- [ ] 实践任务：实现 TextPainter（单行 / 多行 / 省略 / 富文本 span），并提供 `offsetToX` / `xToOffset` 几何 API（第五阶段输入框直接用）

## 第四阶段：控件树与布局（3 周）

> 本阶段导览（分册索引）：[04-第四阶段/01-导览.md](04-第四阶段/01-导览.md)

- [ ] 1. 为什么是两棵树
  - Widget（不可变描述）与 RenderObject（可变布局+绘制对象）分层；Flutter 三树的简化版
  - attach / detach 与父子关系维护；owner 树遍历
- [ ] 2. 布局协议：约束向下、尺寸向上
  - 单遍布局（single-pass）：父传约束 → 子返尺寸 → 父定位置
  - BoxConstraints（min/max 宽高）；紧约束与松约束；为什么这套协议一遍就能完成布局
- [ ] 3. 盒模型与基础布局器
  - Padding、Align、SizedBox；装饰盒（背景 / 边框 / 圆角）与内容盒分离
- [ ] 4. Flex 布局
  - Row / Column：主轴与交叉轴、flex 因子分配算法
  - mainAxisAlignment / crossAxisAlignment；溢出检测与可视化
  - Stack 与 Positioned：层叠布局
- [ ] 5. 布局性能
  - 布局缓存：约束没变就不重排
  - relayout boundary：子树尺寸不受父约束影响时自成边界
  - 失效传播：markNeedsLayout 自底向上冒泡，一帧内合并
- [ ] 实践任务：实现 RenderObject 基类 + 布局协议 + Padding/Align/Row/Column/Stack；写布局断言测试（给定约束断言输出尺寸，无头可跑，不需要窗口）

## 第五阶段：事件与交互（3 周）

> 本阶段导览（分册索引）：[05-第五阶段/01-导览.md](05-第五阶段/01-导览.md)

- [ ] 1. 输入抽象
  - 把 raylib 轮询 API 转成事件流：pointerDown / Move / Up、wheel、keyDown / keyUp、文本输入
  - 事件规范化：时间戳、修饰键、坐标从窗口像素到逻辑坐标（衔接 HiDPI）
- [ ] 2. 命中测试
  - 逆深度优先遍历；hitTest 自底向上组装命中链
  - 不透明区吞噬事件（hitTestBlocking）与穿透；命中链与事件冒泡的关系
- [ ] 3. 指针状态机
  - hover 进入 / 离开；press / click / drag 判定（移动阈值）
  - 双击与长按；拖拽协议 onDragStart / onDragUpdate / onDragEnd
- [ ] 4. 焦点系统
  - FocusScope / FocusNode 焦点链；请求与让出焦点
  - Tab 遍历顺序（树序 vs 视觉序）；焦点环绘制；Esc / Enter 的默认处理
- [ ] 5. 滚动与手势
  - 视口坐标与内容坐标分离；滚动物理（惯性 + 阻尼的简化实现）
  - 滚动条浮现策略；手势识别器抽象（tap / drag / long-press 的竞裁）
- [ ] 实践任务：实现事件总线 + 命中测试 + 指针状态机 + 焦点链；做出三件套：可点击的 Button、可滚动的列表、键盘可导航的网格

## 第六阶段：渲染管线与调度（2~3 周）

> 本阶段导览（分册索引）：[06-第六阶段/01-导览.md](06-第六阶段/01-导览.md)

- [ ] 1. 帧流水线
  - 一帧的完整旅程：输入轮询 → 动画 tick → 失效布局 → 失效绘制 → 呈现
  - vsync 与 targetFPS；帧预算 16.6ms 的含义
- [ ] 2. 脏标记与失效传播
  - markNeedsLayout / markNeedsPaint；首个脏节点定位
  - 一帧内多次失效的合并；为什么失效是自底向上、执行是自顶向下
- [ ] 3. 局部重绘
  - 脏矩形合批与求并；用 scissor 限定重绘范围
  - repaint boundary：独立图层隔离子树；什么时候局部重绘反而更慢（raylib 清屏成本低的诚实讨论）
- [ ] 4. 动画系统
  - Ticker 与帧驱动；插值器与曲线（线性 / ease / 弹性）
  - 动画状态机（forward / reverse / stop）；隐式动画（样式变化自动补间）
- [ ] 5. 性能度量
  - 帧时间统计与长帧溯源；绘制命令计数；脏区面积占比
  - 对照 scriptc-raylib 仓库提供的 FPS 基准方法（1000 矩形压力测试）
- [ ] 实践任务：实现脏标记管线 + repaint boundary + 动画系统；做一个叠加在窗口角落的帧时间面板；跑 1000 控件滚动压力测试并给出数字

## 第七阶段：声明式与响应式层（3 周）

> 本阶段导览（分册索引）：[07-第七阶段/01-导览.md](07-第七阶段/01-导览.md)

- [ ] 1. 命令式之痛
  - 直接操纵 RenderObject 的样板代码；UI = f(state) 的诉求
  - 两条路线：全量重渲染 + diff（React / 本站 react 站源码复刻）vs 细粒度依赖追踪（Solid / 本阶段）——为什么本框架内核适合后者
- [ ] 2. signals 细粒度响应式
  - 三原语：signal / computed / effect；依赖收集（读时登记）与传播（写时通知）
  - diamond 问题与 glitch-free：按拓扑序（层级）更新，每个 computed 一帧只算一次
  - 与 VDOM 全量重渲染的对照实验：同场景两种实现的更新次数
- [ ] 3. 声明式组件 API
  - TS 函数组件与 `h()` 构建函数（JSX 可选）；props 不可变
  - 组件树 → RenderObject 树的挂接：reconcile 最小形态（同位置同类型则复用）
- [ ] 4. 树协调
  - keyed 列表更新：同 key 复用节点避免重建状态；增 / 删 / 移动
  - 与 React keyed diff 的差异：细粒度节点级更新 vs Fiber 全树遍历
- [ ] 5. 生命周期与主题
  - mount / unmount / dispose（含 effect 清理）；状态提升与单向数据流
  - 主题系统：design token → 主题表 → 控件默认样式
- [ ] 实践任务：实现 signals 内核（单元断言：依赖失效、diamond 更新恰好一次）+ reconcile + keyed 列表；用声明式 API 重写第五阶段的三件套，代码量对半砍

## 第八阶段：工程化与毕业项目（3 周）

> 本阶段导览（分册索引）：[08-第八阶段/01-导览.md](08-第八阶段/01-导览.md)

- [ ] 1. 控件库补全
  - TextField 深水区：光标、选区、复制粘贴、IME 概念边界（桌面 IME 的现实约束）
  - Checkbox / Radio / Switch；Dialog 与 Overlay 层（浮层路由）；菜单与弹出定位
- [ ] 2. 虚拟列表
  - 视口裁剪 + 只构建可见项；回收池；滚动位置保持
  - 大数据量下的布局分帧（把一帧拆不完的布局摊到多帧）
- [ ] 3. 平台细节
  - HiDPI 缩放：窗口坐标 vs 像素坐标、DPI 变化事件
  - 多窗口概念；窗口系统（Wayland / X11 / Cocoa）与合成器在本栈中的位置
- [ ] 4. 测试
  - 无头像素断言：给定状态断言某点颜色 / 区域快照
  - 事件回放测试；布局黄金用例；把「跑起来才算」固化成脚本
- [ ] 5. 对标与展望
  - mini-gui vs Flutter / Qt / Slint / GPUI / egui 取舍表
  - 下一步：GPU 自绘后端（衔接 webgl 站）、无障碍树、UI DSL 编译（衔接 compiler 站）
- [ ] 实践任务（毕业项目三选一）：文件浏览器（树 + 列表 + 滚动 + 主题）；todo 应用（声明式 + signals + 动画）；简易文本编辑器（TextField 深水区 + 虚拟滚动）
