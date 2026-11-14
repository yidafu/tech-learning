# raylib 图形库解剖：给什么、不给什么

> [返回：第一阶段导览](01-导览.md)
> 对应大纲条目：第一阶段 3。本册解剖我们的「原料」raylib：它的主循环范式、批处理与帧提交、事件模型、绘制原语清单、资源生命周期，以及最重要的——它**刻意不给**的东西。这一份「不给清单」就是 mini-gui 后续七个阶段的施工清单。本册引用的代码逐字摘自 `gui/labs/mini-gui/src/apps/01-window.ts` 与 `src/core/config.ts`，日志与数字为 2026-11-14 本机（Apple M4 Pro / macOS）真实捕获。

## 1. raylib 是什么：库，不是框架

raylib 是一个面向教学与游戏原型的 C 图形库：开窗、输入、2D/3D 绘制、纹理、音频、默认字体，一庽数齐。它刻意保持「**库**」而非「**框架**」：

- 你调用它，它不调用你（主循环是你自己写，它完全不接管控制流）
- 没有控件、没有布局、没有事件分发、没有焦点、没有无障碍——只有像素与轮询

「你调用它，它不调用你」值得多说一句，这是库与框架最实用的判别法（控制反转与否）。用了 raylib 之后，`main` 函数仍然完整地属于你：循环写不写、一帧里先做什么后做什么、什么时候退出，全是你的决定。换成框架（比如 Flutter），控制流在框架手里，你只提供被调用的回调与描述。第 2 册五件事的「代管」之所以可能，前提正是框架握着控制流——raylib 把控制流留给我们，也就把「代管」的可能性留给了我们自己造。

本站通过 scriptc-raylib 绑定在 TypeScript 里驱动它：571 个官方函数经安全包装直调，编译为原生可执行文件（绑定细节与安全模型见第 5 册）。实测版本组合：**raylib 6.0 + scriptc-raylib 1.0.4（由 `@raylib/api` 6.0.1 元数据生成）+ scriptc 0.4.12**，macOS arm64（Apple clang 17 / Node 24.10）编译运行通过。

### 1.1 从 C API 到 TS 绑定：命名与常量

raylib 原生是 C API（`InitWindow`、`BeginDrawing`、`MOUSE_BUTTON_LEFT`、`RAYWHITE`）。scriptc-raylib 的 TS 侧保持一一对应，只做**命名改写**，对照着 `01-window.ts` 的 import 列表就能看出规则：

| C 侧（raylib） | TS 侧（scriptc-raylib） | 规则 |
|---|---|---|
| `InitWindow` / `SetTargetFPS` / `GetFrameTime` | `initWindow` / `setTargetFPS` / `getFrameTime` | 驼峰化，首字母小写，缩写词保持大写（FPS） |
| `MOUSE_BUTTON_LEFT` / `KEY_W` | `MOUSE_BUTTON_LEFT` / `KEY_W` | 枚举常量原样保留（大写下划线） |
| `RAYWHITE` / `SKYBLUE` / `MAROON` | `RAYWHITE` / `SKYBLUE` / `MAROON` | 颜色常量原样保留 |
| `Vector2` / `Color` | `Vector2` / `Color`（TS 接口） | 结构体映射为接口，值语义传递 |

命名一一对应不是偷懒，是教学价值：你在 raylib 官方 cheatchsheet / 示例里看到任何函数，把首字母小写就能在 TS 里用——**原料的文档生态完整继承**。第 5 册会讲这层绑定在 FFI 边界上真正做的事（远不止改名）。

## 2. 主循环范式：一切 demo 的骨架

raylib 的所有程序都长这一个样子（这是本站所有 `src/apps/*.ts` 的公共骨架，节选自 `src/apps/01-window.ts`，`// …` 为裁剪）：

```ts
import { /* … */ } from "scriptc-raylib";

initWindow(800, 450, "mini-gui 01 window");  // ① 开窗（初始化 OpenGL 上下文）
setTargetFPS(60);                            // ② 软件帧率限制（vsync 之外的第二道闸）

while (!windowShouldClose()) {               // ③ 主循环：每圈一帧
  const dt = getFrameTime();                 // ④ 上一帧耗时（delta time）

  // ⑤ 更新：轮询输入 + 推进状态
  const mouse = getMousePosition();
  if (isMouseButtonDown(MOUSE_BUTTON_LEFT)) { /* … */ }

  beginDrawing();                            // ⑥ 帧绘制开始（内部开一个绘制批）
  clearBackground(RAYWHITE);                 //    清屏
  drawText("hello", 16, 16, 20, BLACK);
  drawCircle(mouse.x, mouse.y, 18, GOLD);
  endDrawing();                              // ⑦ 帧绘制结束（提交批处理 + 交换缓冲区）
}

closeWindow();                               // ⑧ 收尾
```

八步骨架对应第 2 册的一帧图：①② 是 E 层（窗口宿主）的初始化，③~⑤ 是应用层的主导权（轮询输入、改状态），⑥⑦ 是 D 层（渲染后端）的批处理窗口，⑧ 收尾。**框架与库的差别在这个骨架上最直观**：Flutter 应用里你找不到这个循环——它被框架藏起来替你跑了；raylib 把它明晃晃地交给你，于是每帧的每一微秒花在哪，全都看得见、也都归你管。

| 步 | 调用 | 层 | 它回答的问题 |
|---|---|---|---|
| ① | `initWindow` | E | 我怎么拥有一块屏幕矩形 |
| ② | `setTargetFPS` | E | 帧节奏的软件上限 |
| ③ | `windowShouldClose` | E | 该退出吗（轮询关窗事件） |
| ④ | `getFrameTime` | E | 上一帧过了多久（delta time） |
| ⑤ | `getMousePosition` 等 | E→A | 输入的「现在」与「本帧边沿」 |
| ⑥ | `beginDrawing` | D | 开批：本帧绘制事务开始 |
| ⑦ | `endDrawing` | D | 提交批 + 交换缓冲（§3） |
| ⑧ | `closeWindow` | E | 资源卸载与上下文销毁 |

注意 ③~⑦ 每圈都要重走：**没有「界面没变就跳过一帧」的捷径**——那是第六阶段脏标记要给 mini-gui 补上的能力。目前的 01-window.ts 哪怕画面完全静止，也每帧从头画全部内容，这是「没有失效调度」的直接代价（§7 第四行）。

**实跑：一帧背后发生了什么**（`MINI_GUI_SECONDS=1` 跑构建产物 `./main`，日志原文节选）：

```text
INFO: Initializing raylib 6.0
INFO: Platform backend: DESKTOP (GLFW)
INFO: DISPLAY: Device initialized successfully
INFO:     > Display size: 1512 x 982
INFO:     > Screen size:  800 x 450
INFO: GL: OpenGL device information:
INFO:     > Vendor:   Apple
INFO:     > Renderer: Apple M4 Pro
INFO:     > Version:  4.1 Metal - 90.5      ← macOS 上走 Metal 后端的 GL 4.1 兼容层
INFO: SHADER: [ID 1..3] … Default shader loaded successfully
INFO: RLGL: Render batch vertex buffers loaded successfully in VRAM (GPU)
INFO: TEXTURE: [ID 2] Texture loaded successfully (128x128 | GRAY_ALPHA | 1 mipmaps)
INFO: FONT: Default font loaded successfully (224 glyphs)       ← 默认字体：内嵌图集
INFO: SYSTEM: Working Directory: …/mini-gui/build/macos-universal
INFO: TIMER: Target time per frame: 16.667 milliseconds         ← setTargetFPS(60)
INFO: TEXTURE: [ID 2] Unloaded texture data from VRAM (GPU)     ← 退出时的资源卸载
INFO: Window closed successfully
```

逐行给这张日志点名（它把 raylib 内部初始化的次序全招了）：

- `Platform backend: DESKTOP (GLFW)`——E 层的窗口宿主由 GLFW 承包（第 2 册 §1.1 的 F→E 对话在这里发生）。
- `Display size: 1512 x 982` vs `Screen size: 800 x 450`——前者是物理屏幕，后者是我们请求的窗口；两个「size」并存提醒你：窗口坐标与屏幕坐标是两个坐标系（D 层绘制永远以窗口为参照）。
- `Version: 4.1 Metal - 90.5`——macOS 的 OpenGL 已被 Apple 标记废弃，Apple Silicon 上由 Metal 后端支撑，版本串里的 `Metal` 字样就是这层关系的直接证据。知道这件事，第 6 册解释「为什么 avgFps 追不上 targetFPS」时就有底了：帧提交要穿过这层实现与系统合成器，抖动来源不止一个。
- `RLGL: Render batch vertex buffers loaded successfully in VRAM (GPU)`——批处理的顶点缓冲在启动时就分配好了，§3 展开。
- `TEXTURE [ID 2] 128x128 GRAY_ALPHA`——默认字体的图集纹理（灰度+alpha 双通道恰好够用：颜色由绘制调用指定）。
- `FONT Default font 224 glyphs`——默认字体开箱即用，224 个字形全是拉丁字符；`01-window.ts` 的头注释写着对应约束：屏幕文字一律用 ASCII，中文要等第三阶段加载字体。
- `TIMER: Target time per frame: 16.667 milliseconds`——`setTargetFPS(60)` 的直接产物：1000/60 ≈ 16.667ms。这是**软件等待**的配置值，和 vsync 是两道独立的闸（§8 误区 3）。

值得单独记住的三件事（原版三条，展开成判读方法）：

1. **默认字体开箱即用**（224 个字形、128×128 图集）——第三阶段文本排版的地基已经打好；但它只有拉丁字形，这行日志同时是「demo 里为什么全是英文」的答案。
2. **「纹理卸载」日志出现在退出时**——raylib 的资源（纹理/字体/音频）是 C 侧句柄，生命周期要自己管，脚本侧卸错会被注册表拒绝（详见第 5 册绑定安全模型）。
3. `Target time per frame: 16.667ms`——帧率限制是**软件等待**实现的，和 vsync 是两道独立的闸（第六阶段帧调度会实测它们的叠加效果）。

## 3. 批处理与帧提交：begin/endDrawing 的真相

`beginDrawing()`/`endDrawing()` 不是可有可无的仪式，它们是**批处理（batching）的边界**：

```text
一帧的绘制流水（D 层内部）
┌──────────────────────────────────────────────────────────┐
│ beginDrawing()                                           │
│   └─ 重置当前批（顶点缓冲回到起点）                        │
│ clearBackground / drawText / drawCircle / …              │
│   └─ 不画！只把每个图元翻译成顶点，攒进批里                │
│ endDrawing()                                             │
│   ├─ 提交整批给 GPU（一次或少数几次 draw call）            │
│   └─ 交换前后帧缓冲（这一帧的像素上屏）                    │
└──────────────────────────────────────────────────────────┘
```

两个直接推论，一个是性能的、一个是正确性的：

- **性能**：`drawCircle` 们便宜不是因为 GPU 快，是因为它们只是在往 CPU 侧的数组里追加顶点；昂贵的是 draw call，而批处理把一帧几百次绘制调用合并成极少的提交。「每个绘制原语一次 draw call」的写法（第二阶段之前不会这么写，但值得知道）会把这个优势丢光。
- **正确性**：批没提交之前，屏幕上还是上一帧。`01-window.ts` 里有一段用注释钉死的教训（逐字摘录）：

```ts
// 截图必须在 endDrawing() 之后：绘制调用只是往批里攒顶点，endDrawing 才提交。
// 在它之前截图只能拍到 clearBackground 的清屏色（实测踩过）。
if (shotPath !== undefined) takeScreenshot(shotPath);
```

`takeScreenshot` 抓的是**帧缓冲**，而 `beginDrawing` 与 `endDrawing` 之间帧缓冲还没被本帧内容覆盖——在批提交前截图，拍到的是清屏色。「调用了绘制函数」≠「像素已在屏幕上」，这是批处理模型最容易咬人的一口。

### 3.1 这对第二阶段 Painter 意味着什么

批处理的存在决定了 Painter 接口的形状：

- **绘制调用的顺序就是顶点进批的顺序**——Painter 不能重排调用（除非自己先记显示列表），这就是第二阶段「记录后重放」设计的原始动机：先把一帧的指令收进一张表（可以插入、排序、按裁剪分段），再按最终顺序喂给 raylib。
- **裁剪是批的属性**（`beginScissorMode`/`endScissorMode` 划定批内一段区域），不是单个图元的属性——裁剪栈必须在指令表层面维护，重放时翻译成 scissor 区段的开关。
- **批是有限资源**：顶点缓冲有上限，超了内部会切批（多一次提交）。极端大一帧 = 多次 draw call = 帧时间上升——「为什么显示列表要控制指令数量」的第一性解释。

一句话总结：批处理模型决定了 Painter 的三个设计输入——顺序敏感、裁剪是区段不是属性、提交次数是稀缺资源。

## 4. 事件模型：轮询，不是回调

raylib 的输入 API 是**轮询式**：没有 `onClick` 回调，每帧自己问一遍「现在什么状态」：

| 问法（每帧调用） | 回答 |
|---|---|
| `getMousePosition()` | 鼠标当前坐标 |
| `isMouseButtonDown(MOUSE_BUTTON_LEFT)` | 左键**现在**是否按着 |
| `isMouseButtonPressed(MOUSE_BUTTON_LEFT)` | 左键是否在**本帧**刚按下（帧内边沿） |
| `isKeyDown(KEY_W)` / `isKeyPressed(KEY_W)` | 同上，键盘版 |
| `getKeyPressed()` | 本帧按下的任意键码（0=无） |
| `getMouseWheelMove()` | 本帧滚轮增量 |
| `windowShouldClose()` | 关窗事件是否发生（点红叉 / Esc） |

### 4.1 状态、边沿与流：三种问法的语义

这张表里的问法其实分三类，语义严格不同：

- **状态（Down 系）**：答案描述「现在」。连问两帧都是 true，只说明一直按着。适合持续效果（按住时高亮、WASD 移动）。
- **边沿（Pressed/Released 系）**：答案描述「本帧内发生的一次跳变」。它的有效期只有一帧——下一帧再问就是 false，**不管你问没问过**。适合离散动作（计数、触发点击）。
- **流（getKeyPressed 系）**：从事件队列里取一个本帧到达的键码，0 表示没有。它是「事件」最接近的形态，但取走即消费、无次序保证的语义要自己补。

### 4.2 与回调模型（浏览器）的对照

| 维度 | 轮询（raylib） | 回调（浏览器 addEventListener） |
|---|---|---|
| 谁发起 | 应用每帧主动问 | 事件到达时框架调用你 |
| 错过时机 | 边沿只有一帧有效期，帧太慢会漏 | 事件进队列，回调总会执行 |
| 监听器泄漏 | 不存在（没有注册这个动作） | 忘记 removeEventListener 就泄漏 |
| 事件次序/目标 | 没有「目标」概念，坐标是原始数据 | target + 捕获冒泡，次序明确 |
| 与帧的关系 | 天然同步（就在主循环里） | 与渲染循环解耦，时机在任务队列 |

轮询模型的直接后果：

- **没有事件丢失一说**——状态就在那，但**边沿**（按下/抬起那一瞬间）只有一帧的有效期，下一帧再问就没了；低帧率时两次快速点击可能挤进同一帧，只表现为一次边沿
- 控件无法「订阅」自己的事件——第五阶段的**事件总线**就是把这份轮询原料加工成有目标、有次序、可冒泡的事件流的加工厂：每帧收齐原始输入 →（未来的）命中测试找到目标 → 沿树分发。第 2 册 §4.1 的浏览器点击时序图，右边那几格现在还全是空的。

### 4.3 实例走读：01-window.ts 的输入段

三种问法在 `01-window.ts` 里全部登场（逐字摘录，注释为原文）：

```ts
  // ---- 2. 输入（轮询：每帧主动去问「现在是什么状态」）----
  const mouse = getMousePosition();                        // 状态：坐标
  const leftDown = isMouseButtonDown(MOUSE_BUTTON_LEFT);   // 状态：按着吗
  if (isMouseButtonPressed(MOUSE_BUTTON_LEFT)) clicks += 1;// 边沿：本帧刚按下 → 计数
  const key = getKeyPressed();                             // 流：本帧键码
  if (key !== 0) lastKey = key;                            // 0=无（哨兵值）
```

四个调用四种语义，正好是 §4.1 的活教材：

- `getMousePosition()` 每帧必然有值（坐标状态常在）——十字线反馈的数据源。
- `leftDown` 是状态，**在绘制段还会再读一次**（按住画实心圆、松开画空心圆）——状态查询天然幂等，问几次都一样。
- `isMouseButtonPressed` 是边沿，语义上只该消费一次（这里是计数 `clicks += 1`）；如果两处代码都判断这个边沿，点击会算两次——**边沿语义要求全帧恰好消费一次**，第五阶段事件总线要保证的次序纪律从这里就有了雏形。
- `getKeyPressed()` 是流，取走即消费：`if (key !== 0)` 的 0 是「无」的哨兵值，不是键码——第五阶段把它翻译成事件对象时，这个 0 要规范化掉（否则「按了 0 键」和「没按键」无法区分）。

## 5. 绘制原语清单：第二阶段 Painter 的原料

| 类别 | 原语（节选） | 备注 |
|---|---|---|
| 清屏 | `clearBackground` | 每帧第一步 |
| 矩形 | `drawRectangle` / `drawRectangleLines(Ex)` / `drawRectangleRounded` | 圆角矩形原生就有 |
| 圆 | `drawCircle(V)` / `drawCircleLines` / `drawCircleSector` | |
| 线 | `drawLine(Ex)` / `drawLineStrip` / `drawLineBezier` | `Ex` 版本可加粗 |
| 文本 | `drawText` / `measureText(Ex)` | 默认字体即可用；`Ex` 版支持任意 Font 与字距 |
| 纹理 | `drawTexture(Pro)` / NPatch 九宫格 | `Pro` 版带源/目标矩形与旋转 |
| 裁剪 | `beginScissorMode` / `endScissorMode` | 矩形裁剪，第二阶段裁剪栈的地基 |
| 帧缓冲 | `beginTextureMode` / render texture | 离屏渲染（第六阶段图层备用） |

绘制语义要点：**调用顺序即绘制顺序**（后画的盖前画的），没有 z 序概念——「z 序」是框架要在树里自己解决的（第二阶段显示列表）。

「顺序即层级」展开说：这既是简化也是约束。简化在于心智模型极小——界面上元素的遮挡关系就是源码里的书写顺序；约束在于**顺序是全局唯一的**，一旦想让某个后画的元素插到中间去，只能重排代码，而重排代码意味着重排逻辑。第二阶段的显示列表就是解法：先在内存里建一张有序的绘制指令表（可以任意插入、排序、分段），再整张表交给后端重放——顺序从「代码的副作用」升级为「数据」。

另有一个第二阶段会反复用到的事实：`measureText` 的存在意味着**文本宽度是可查询的**——布局（第四阶段）与断行（第三阶段）都建立在「先量后画」之上。

### 5.1 实例走读：01-window.ts 的绘制段

绘制段是「调用顺序即绘制顺序」的现场（代码语句逐字摘录，行尾 ①~⑦ 为本册批注，`// …` 为裁剪）：

```ts
  // ---- 4. 绘制 ----
  beginDrawing();
  clearBackground(RAYWHITE);

  drawText("delta-driven (px/s)", TRACK_LEFT, 70, 20, DARKGRAY);   // ① 先写标签
  drawLine(TRACK_LEFT, 120, TRACK_LEFT + TRACK_LEN, 120, DARKGRAY); // ② 再画轨道
  drawCircle(// …, 120, 14, SKYBLUE);                               // ③ 球盖在轨道上

  drawText("frame-driven (px/frame)", TRACK_LEFT, 160, 20, DARKGRAY);
  drawLine(TRACK_LEFT, 210, TRACK_LEFT + TRACK_LEN, 210, DARKGRAY);
  drawCircle(// …, 210, 14, MAROON);

  // WASD 控制的方块
  drawRectangle(playerX - 16, playerY - 16, 32, 32, LIME);          // ④ 独立元素

  // 鼠标反馈：十字线 + 按下高亮
  drawLine(mouse.x, 0, mouse.x, HEIGHT, GOLD);                      // ⑤ 十字线盖在
  drawLine(0, mouse.y, WIDTH, mouse.y, GOLD);                       //    所有内容之上
  if (leftDown) {
    drawCircle(mouse.x, mouse.y, 18, GOLD);                         // ⑥ 最顶层
  } else {
    drawCircleLines(mouse.x, mouse.y, 18, GOLD);
  }

  drawText(
    `fps ${getFPS()}   dt ${(dt * 1000).toFixed(2)} ms   frame ${frames}`,
    16,
    16,
    20,
    BLACK,
  );                                                                // ⑦ HUD 文字
  // …
  endDrawing();
```

七个标注就是七层「z 序」：标签被轨道盖住？没有（文字在轨道上方 50px 的位置，几何上不重叠——顺序和几何都是自己管的）；球盖在轨道上（③ 在 ② 后）；十字线盖在一切内容上（⑤ 在 ①~④ 后）。**当前靠书写顺序实现的层级，在界面元素跨越多个函数/模块后就维护不动了**——这正是显示列表要数据化的动机。另外注意 ⑦：`getFPS()` 是运行时查询（滑动平均的帧率），与 `dt * 1000` 的当帧耗时并列显示——HUD 同时暴露两个时间口径，第 6 册解读它们的差值。

## 6. 资源生命周期：C 侧句柄

纹理、字体、音频这类资源在 raylib 里是 **C 侧对象**：`loadTexture` 之后你拿到的（经 scriptc-raylib）不是像素数据，而是一个代际句柄（第 5 册 §4 详述），真正的数据住在 GPU/C 内存里。退出日志里那行 `TEXTURE: [ID 2] Unloaded texture data from VRAM (GPU)` 演示了正常的一生：加载进 VRAM → 使用 → 退出时卸载。

要点三条：

- **加载/卸载是配对操作**。泄漏 VRAM 不会立刻崩，而是慢慢吃光显存——第 5 册注册表拒绝重复释放、悬空句柄，就是在配对纪律上加的保险。
- **默认资源（默认字体、默认纹理）由 raylib 自己管理**（启动加载、退出卸载都在日志里），应用代码不需要也不应该去动它们。
- mini-gui 第二阶段的 Painter 会把「句柄的创建/销毁」收拢到后端一处，内核只见抽象的资源 ID——与 scriptc-raylib 的注册表思路同构（第 5 册 §4）。

把默认字体的一生画出来（每一步都有日志作证）：

```text
load：  启动时  FONT: Default font loaded successfully (224 glyphs)
                TEXTURE: [ID 2] Texture loaded successfully (128x128 | GRAY_ALPHA | 1 mipmaps)
使用：  每帧    drawText → 查字形 → 从 [ID 2] 图集取子矩形 → 顶点进批
unload：退出时  TEXTURE: [ID 2] Unloaded texture data from VRAM (GPU)
        随后    Window closed successfully
```

注意「字体」在资源上其实是**两层**：字形度量数据（224 个字形的尺寸与位置）+ 图集纹理（[ID 2]）。第三阶段加载中文 TTF 字体时会重新走一遍这条流水线，只是度量数据换成几千个字形、图集换成按需打包的大纹理——届时「字体加载很慢」「图集会长大」这些工程问题都会在这条时间线上出现。

## 7. 刻意不给的清单：mini-gui 的施工图

| raylib 不给 | 你的应用会怎么痛 | mini-gui 的补法 | 阶段 |
|---|---|---|---|
| 控件树 | 100 个界面元素 = 100 段手写绘制代码，层级靠脑记 | Widget/RenderObject 双树 | 四 |
| 布局 | 窗口一 resize，所有 x/y 手算重排 | BoxConstraints 单遍协议 | 四 |
| 事件分发 | 「点了哪个控件」要自己遍历矩形 | 命中测试 + 命中链 + 冒泡 | 五 |
| 焦点 | 键盘事件没有「收件人」，Tab 顺序无人管理 | 焦点链 + 遍历序 | 五 |
| 文本编辑 | 光标/选区/键盘编辑全要自己造 | TextField 几何与状态机 | 八 |
| 失效调度 | 每帧全画，或自己记账脏区 | 脏标记 + 局部重绘 | 六 |
| 状态到界面 | 改一个数据，手动同步 N 处界面 | signals + 声明式组件 | 七 |
| 无障碍 | 屏幕阅读器完全不知道你在画什么 | 概念对照（语义树），不实现 | 八 |

> **读法建议**：这张表每一行都别背。每完成一个阶段，回来划掉一行，感受「痛 → 机制」的对应关系。

这张表还有第 2 册没明说的第二层读法：**每一行的「不给」都是刻意的**。raylib 的设计目标是让人用最少的概念画出东西，控件/布局/焦点每一样都会把「概念数」翻倍；而 GUI 框架的全部价值就在这八行上。所以「raylib 不给」与「mini-gui 要造」是同一张纸的正反面——本课程的选题理由就在这里。

第三层读法是排期依据：八行的顺序不是随便排的，它大致等于「手写痛感的增长曲线」——控件树与布局最先痛（元素一多就乱），事件与焦点其次（一交互就乱），失效调度在界面变大后才痛，状态同步则贯穿始终。第四~八阶段的推进顺序与这张表逐行对齐，每阶段的导览都会回指这里。

## 8. 常见误区

**误区 1：「raylib 是游戏引擎。」**
按行业惯例，游戏引擎 = 图形库 + 场景图 + 资产管线 + 脚本运行时 + …。raylib 只有第一项：没有场景图（你画什么它记什么都不是）、没有资产管线（纹理要自己加载管理）、没有 ECS、没有编辑器。它的自我定位是「编程电子游戏的简单易用库」——库。叫它引擎，就会期待引擎的服务，然后发现§7 的清单全部没人管——而这正是本课程选择它的原因。

**误区 2：「`isKeyPressed` 返回 false = 用户这一下没按。」**
它只说明**这一帧**没有边沿。如果按键与抬起都发生在同一帧内（低帧率下的快速操作），边沿可能被合并、丢失或只可见一次。轮询模型里「没查到」和「没发生」不是一回事——判断时序问题时，先问「这个事件的有效期是几帧」。第 6 册的实测里 avgFps=30 时一帧 33ms，两次间隔 20ms 的点击就会挤进同一帧。

**误区 3：「vsync 和 setTargetFPS 是同一个东西的两种写法。」**
两道独立的闸：vsync 在帧提交/缓冲交换处（E 层，屏幕刷新率说了算），`setTargetFPS` 是主循环里的软件等待（日志 `TIMER: Target time per frame: 16.667 milliseconds` 是它的配置）。两道闸同时开时，实际帧率受**较慢**的一道限制，且软件等待是「至少等到这么久」，不保证不多等——这就是第 6 册 avgFps=57.7 < 60 的原因。第六阶段做帧预算会再回到这里。

**误区 4：「`beginDrawing` 之前/`endDrawing` 之后不能调用绘制函数，否则崩溃。」**
边界之外调用绘制函数不是崩溃问题，而是**语义**问题：批外调用会被丢弃或落到错误的帧里（不同后端行为不同），即使不崩也不该指望它出现在屏幕上。把 begin/end 理解为「事务边界」更准：begin 开事务，end 提交；事务外的写操作没有意义。§3 的截图教训是同一个原理的另一个出口。

## 9. 延伸阅读与本册小结

三座邻站对本册各有一段接口：

- **webgl 站《渲染管线全局观》**：§3 的批处理往下挖一层就是顶点缓冲、draw call、帧缓冲交换的 GPU 细节。raylib 把这些包好了，但 Painter 后端想要「知道自己在为什么付钱」，去 webgl 站第一阶段看一遍管线。
- **react 站**：§4 的「轮询 vs 回调」对照表里，回调那一列的完整机制（事件循环、任务队列）就是浏览器/JS 的运行时——react 站的大纲与实战对这些有系统展开。
- **compiler 站**：§6 的「加载/卸载配对」纪律，与 GC 专题的分配器设计是同一门课：谁分配、谁释放、何时释放。

本册小结：

- raylib 主循环 = `initWindow → while(!windowShouldClose){ 更新; begin/endDrawing } → closeWindow`；控制流完全归应用。
- 启动日志把内部次序全招了：GLFW 宿主、GL 4.1 Metal 兼容层、批缓冲进 VRAM、默认字体 224 字形、软件帧限制 16.667ms。
- begin/endDrawing 是批处理事务边界：调用只攒顶点，end 才提交；截图必须在 end 之后（实测踩过）。
- 输入是轮询式：状态常在、边沿一帧即逝、键码流取走即消费——事件总线是第五阶段的加工厂。
- 绘制「顺序即层级」、默认字体开箱即用（仅拉丁字形）、资源是 C 侧句柄要配对管理。
- 「不给清单」八行 = mini-gui 后续七个阶段的施工清单，且每一行都是刻意不给。

## 自测

1. `beginDrawing/endDrawing` 之间如果调用了更新逻辑，会出什么问题？为什么更新要放在绘制之外？
2. `isMouseButtonPressed` 与 `isMouseButtonDown` 的区别是什么？如果一帧内既判断了 pressed 又错过了当帧，会发生什么？
3. 「调用顺序即绘制顺序」意味着什么场景下必须引入显式的 z 序？第二阶段的显示列表把「顺序」从什么变成了什么？
4. 轮询模型为什么天然没有「事件监听器泄漏」问题？又为什么做不了「事件捕获」？
5. 默认字体 224 个字形够用吗？中文字符会怎样？（第三阶段实测）
6. 启动日志里 `Display size` 与 `Screen size` 各是什么？为什么 D 层绘制只关心后者？
7. vsync 与 `setTargetFPS` 分别在哪一层起作用？两道闸同时开时帧率由什么决定？
8. `takeScreenshot` 放在 `beginDrawing` 之后、`endDrawing` 之前会拍到什么？用批处理模型解释原因。
9. 纹理资源的一生于日志中可见哪几行？「加载/卸载配对」做错的两种典型后果分别是什么？
10. 实操题：跑 `MINI_GUI_SECONDS=1 npx scriptc-raylib run src/apps/01-window.ts --dev`，在你的机器上找到本册 §2 日志的对应行（提示：重点看 TIMER 一行的毫秒数）；如果 `MINI_GUI_FPS=30`，TIMER 行的数值应是多少？（用 1000/30 算，再跑一遍验证。）
