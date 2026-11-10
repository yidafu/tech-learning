# 前端高阶场景全景图

> 定位：第三份文档。前两份覆盖了基础（`react-学习大纲.md`）与 Schema 驱动线（`react-进阶大纲-复杂场景.md`：动态表单/大盘/设计器/JSON 编辑器/低代码）。
> 第四份：`react-高阶场景-第二辑.md`（搭建器族增量 + 查询构建器/权限/多租户主题/动态 i18n 的 SaaS 三件套全量）。
> 本篇回答："还有哪些硬场景？"——7 大族群 23 个场景，含核心技术、难度、代表产品、入手路径。
> **用法：没人能全学。按"职业方向 × 兴趣"挑 2–3 个深扎，每个深扎 4–6 周。**

## 目录

- [这张全景图怎么用](#这张全景图怎么用)
  - [第一步：按"方向 × 兴趣 × 机会"挑出你的 2–3 个](#第一步按方向--兴趣--机会挑出你的-23-个)
  - [第二步：按 4–6 周的节奏深扎，每周有验收物](#第二步按-46-周的节奏深扎每周有验收物)
  - [第三步：把全景图当"索引"而不是"任务清单"](#第三步把全景图当索引而不是任务清单)
- [全景总览](#全景总览)
  - [族群 A：编辑器家族——把"用户输入"变成"内容模型"的机器](#族群-a编辑器家族把用户输入变成内容模型的机器)
  - [族群 B：实时与协同——让状态在多人多端间保持一致](#族群-b实时与协同让状态在多人多端间保持一致)
  - [族群 C：图形与可视化——把数据映射成视觉，且数据量大到 DOM 扛不住](#族群-c图形与可视化把数据映射成视觉且数据量大到-dom-扛不住)
  - [族群 D：大型应用架构——多团队多宿主下的代码组织与隔离](#族群-d大型应用架构多团队多宿主下的代码组织与隔离)
  - [族群 E：极端性能——数据量与操作频率超过"直接渲染"的舒适区](#族群-e极端性能数据量与操作频率超过直接渲染的舒适区)
  - [族群 F：AI 原生前端——LLM 输出如何变成可靠 UI](#族群-fai-原生前端llm-输出如何变成可靠-ui)
  - [族群 G：交互底座——每个产品都要、但每个都做不完美的基础件](#族群-g交互底座每个产品都要但每个都做不完美的基础件)
- [React 相关度过滤视图](#react-相关度过滤视图)
  - [为什么这一节是本篇的独特价值](#为什么这一节是本篇的独特价值)
  - [① 层详解：React 强相关——难点长在 React 生态内](#①-层详解react-强相关难点长在-react-生态内)
  - [② 层详解：混合——原理框架无关，工程实现 React 化](#②-层详解混合原理框架无关工程实现-react-化)
  - [③ 层详解：基本与 React 无关——React 只是 UI 壳，换框架知识原样保值](#③-层详解基本与-react-无关react-只是-ui-壳换框架知识原样保值)
  - ["原理层保值、实现层变现"的六步操作法](#原理层保值实现层变现的六步操作法)
- [A. 编辑器家族（与 Schema 线最近，壁垒最高）](#a-编辑器家族与-schema-线最近壁垒最高)
  - [A1. 富文本 / 块编辑器（★★★★★）——前端"皇冠明珠"](#a1-富文本--块编辑器前端皇冠明珠)
  - [A2. 电子表格（★★★★★）](#a2-电子表格)
  - [A3. 画布 / 白板编辑器（★★★★☆）](#a3-画布--白板编辑器)
  - [A4. 节点编排画布（★★★☆☆）](#a4-节点编排画布)
  - [A5. 在线代码编辑器 / 自研 DSL（★★★★☆）](#a5-在线代码编辑器--自研-dsl)
- [B. 实时与协同](#b-实时与协同)
  - [B1. 多人协同编辑 CRDT（★★★★★）](#b1-多人协同编辑-crdt)
  - [B2. IM / 长会话列表（★★★★☆）](#b2-im--长会话列表)
  - [B3. 音视频 / 直播（★★★★☆）](#b3-音视频--直播)
- [C. 图形与可视化](#c-图形与可视化)
  - [C1. 大数据可视化（★★★★☆）](#c1-大数据可视化)
  - [C2. 地图 GIS（★★★★☆）](#c2-地图-gis)
  - [C3. 3D / 数字孪生（★★★★★）](#c3-3d--数字孪生)
  - [C4. 高阶动画体系（★★★☆☆）](#c4-高阶动画体系)
- [D. 大型应用架构](#d-大型应用架构)
  - [D1. 插件化架构（★★★★☆）](#d1-插件化架构)
  - [D2. 微前端（★★★☆☆ 概念多、踩坑多）](#d2-微前端-概念多踩坑多)
  - [D3. 嵌入式第三方 Widget（★★★☆☆）](#d3-嵌入式第三方-widget)
  - [D4. 浏览器内构建与运行（★★★★★）——在线 IDE 的底座](#d4-浏览器内构建与运行在线-ide-的底座)
  - [D5. 桌面端（★★★☆☆）](#d5-桌面端)
  - [D6. 浏览器扩展（★★★☆☆）](#d6-浏览器扩展)
- [E. 极端性能与离线](#e-极端性能与离线)
  - [E1. 百万级数据渲染（★★★★☆）——面试硬通货](#e1-百万级数据渲染面试硬通货)
  - [E2. 离线优先 / Local-first（★★★★☆）](#e2-离线优先--local-first)
- [F. AI 原生前端（当下最热，且与你的 Schema 线天然衔接）](#f-ai-原生前端当下最热且与你的-schema-线天然衔接)
  - [F1. 流式对话 / 生成式 UI（★★★☆☆ 入门，做好极难）](#f1-流式对话--生成式-ui-入门做好极难)
  - [F2. Agent 工作流画布（★★★★☆）](#f2-agent-工作流画布)
- [G. 交互底座：复杂交互组件自研（★★★☆☆，性价比最高）](#g-交互底座复杂交互组件自研性价比最高)
- [怎么选：按职业方向匹配](#怎么选按职业方向匹配)
  - [逐行展开](#逐行展开)
- [给 React 开发者的三个"最值钱"建议](#给-react-开发者的三个最值钱建议)
- [与前两份大纲的衔接（内核复用）](#与前两份大纲的衔接内核复用)

---


先把引言这四行拆开读透，因为每一行都是一个使用约定：

- **"第三份文档"意味着你有前两份的底子**。默认你熟悉《react-学习大纲.md》基础阶段 0–10（hooks、状态管理、性能优化的基本盘），并且至少通读过《react-进阶大纲-复杂场景.md》的核心思想——尤其是第 1 章通用底座（schema 协议、注册表、递归渲染器、Undo/Redo、拖拽原理）。本篇场景会频繁"反向引用"前两份的内核，比如 F1 生成式 UI 就是进阶大纲 schema 渲染器的换皮应用。没做过前两份的练习也能读，但"内核复用"的爽感会打折扣。
- **"第四份"是本篇的姊妹篇**。《react-高阶场景-第二辑.md》对"搭建器族"（低代码搭建器、工作流编排、查询构建器、JSON Schema 编辑器、白板、块编辑器）做增量展开，并全量展开 SaaS 平台能力族（权限、多租户主题、动态 i18n）。两份合起来，"前端高阶场景"这块地图才完整。本篇讲广度与选型，第二辑讲其中几个场景的深度细节。
- **"还有哪些硬场景"是本篇的提问方式**。它不是教程目录，而是一张地图：先让你看清 23 个场景的全貌、彼此的依赖关系、与 React 的相关程度，然后再决定把生命投入到哪里。每个场景本篇给到"核心技术清单 + 难点本质 + 入手路径"的粒度——足够你起步，深扎时再回到对应的开源项目与文档。
- **"没人能全学"是清醒的自我认知**。这 23 个场景，任何一个做到"能生产环境扛住"都是 4–6 周起步。全景图的价值不是让你都学，而是让你**有依据地放弃**——知道哪些场景与自己的方向无关，放弃时不焦虑；知道哪两三个与方向强相关，投入时不犹豫。

## 这张全景图怎么用

### 第一步：按"方向 × 兴趣 × 机会"挑出你的 2–3 个

挑场景不要凭"哪个听起来酷"，用一个三变量筛选：

- **方向（权重最高）**：你的职业方向决定主场景。做 BI 的深扎大数据可视化，做 IM 的深扎长会话与性能，做低代码平台的深扎插件化与在线 IDE 底座。方向不对的场景，学到 ★★★★ 也不会有生产环境给你练手，投入产出比断崖式下跌。
- **兴趣（决定你能不能熬过第 3 周）**：4–6 周深扎的中段（第 3–4 周）必然进入"啃硬骨头"的枯燥期——读源码、调不可复现的 bug。兴趣是唯一能扛你过这一段的燃料。方向选主场景，兴趣选副场景，两者可以不是同一个。
- **机会（放大收益）**：当下市场什么岗位在溢价，就把它当加分项。写作本文时（2025–2026），F 族 AI 原生前端处于需求爆发期；但风口场景的溢价衰减也快，别把全部筹码押在"热"上。

推荐的一个稳定组合结构是：**1 个方向主场景（★★★★ 以上，4–6 周）+ 1 个兴趣副场景（★★★~★★★★，3–4 周）+ G 族交互底座（★★★，2–3 周，性价比打底）**。G 族特殊在它不是"一个场景"而是所有场景的地基——浮层、虚拟滚动、键盘导航、无障碍，任何主场景都直接受益，所以永远值得排进计划。

另外挑之前先看一眼后文的"依赖关系"小节：有些场景之间存在先后依赖（例如 B1 协同编辑依附于 A1 富文本——单机编辑都做不对，协同只会错得更快），选了下游场景却跳过上游，第 2 周就会卡死。

### 第二步：按 4–6 周的节奏深扎，每周有验收物

"深扎"不是"看教程看 4 周"。以下节奏表经过了多个场景的验证，直接套用：

| 周次 | 做什么 | 验收物 |
|---|---|---|
| 第 0 步（1–2 天） | 跑通 2 个官方 demo，确认"就是要它" | demo 在本地跑起来，改一处代码看到效果 |
| 第 1 周 | 用起来 + 魔改：照着官方文档把 demo 改出 3 个自己的功能 | 一个"改过的 demo"，能讲清每个功能背后的机制 |
| 第 2 周 | 最小复刻：把 demo 从零写一遍，不用脚手架 | 一个最小内核（通常 100–300 行），理解每行为什么存在 |
| 第 3–4 周 | 核心机制攻关：按本篇"核心技术"清单逐项实现，硬骨头都在这里 | 核心机制清单全部打勾，每项配一个能复现的测试 |
| 第 5 周 | 组合与工程化：接入自己业务（低代码平台/组件库），补性能与边界 | 在真实项目里跑起来，或一个可发布的 npm 包 |
| 第 6 周 | 收尾输出：修已知问题、写总结文章、代码整理开源 | 一篇技术文章 + 一个仓库；文章是最好的面试弹药 |

两个执行原则：

- **每周必须有验收物**。没有产出物的周等于没学——"看了很多文档"不产生能力增量。
- **允许第 3 周弃坑**。如果第 3 周发现自己对该场景实在无感，弃坑换场景的成本（3 周）远低于"含恨学完 6 周却再也不碰"的沉没成本。全景图让你弃坑时知道下一站去哪。

### 第三步：把全景图当"索引"而不是"任务清单"

23 个场景的正文展开程度不同：A 族（编辑器家族）在本篇逐场景详解（A1–A5 是全篇最厚的部分）；B–G 族本篇给到"核心技术清单 + 入手路径"的粒度，深扎细节一部分在《react-高阶场景-第二辑.md》，一部分要直接去啃开源项目。把本篇当地图索引：想做什么，先查表定位族群 → 读族群小节建立整体认知 → 进具体场景小节拿入手路径 → 出发。

---

## 全景总览

| 族群 | 场景 | 难度 |
|---|---|---|
| A 编辑器家族 | 富文本/块编辑器、电子表格、画布/白板、节点编排、在线代码编辑器 | ★★★★~★★★★★ |
| B 实时与协同 | 协同编辑(CRDT)、IM 长会话、音视频/直播 | ★★★★ |
| C 图形与可视化 | 大数据可视化、地图 GIS、3D/数字孪生、高阶动画 | ★★★~★★★★★ |
| D 大型应用架构 | 插件化、微前端、嵌入式 Widget、浏览器内运行时、桌面端、浏览器扩展 | ★★★~★★★★★ |
| E 极端性能 | 百万级数据渲染、离线优先 Local-first | ★★★★ |
| F AI 原生前端 | 流式对话/生成式 UI、Agent 工作流画布 | ★★★ 入门，做好极难 |
| G 交互底座 | 复杂交互组件自研（浮层/Cmd+K/虚拟滚动/无障碍） | ★★★ |

这张表是全篇的"目录 + 难度标尺 + 依赖地图"。下面把 7 大族群逐一展开：每个族群回答四个问题——解决什么问题域、族群内场景的共同内核是什么、难度为什么是这个量级、场景之间（以及与前两份文档）的依赖关系是什么。读完这 7 小节，你再看每个具体场景时就知道它"站在哪块地基上"。

### 族群 A：编辑器家族——把"用户输入"变成"内容模型"的机器

**问题域**：创建与编辑结构化内容。用户在屏幕上敲字、拖块、框选、粘贴，你的程序要把这些原始操作翻译成对"内容模型"的修改——且翻译过程必须可撤销、可序列化、可协同、在百万级内容量下不卡。富文本编辑文档树、表格编辑单元格矩阵、白板编辑图形场景、节点画布编辑有向图、代码编辑器编辑文本缓冲区，本质都是这一件事。

**共同内核**：四个场景共享同一套骨架——

1. **内容模型**：脱离 DOM 的独立数据结构（文档树 / 二维单元格网格 + 公式依赖图 / 图形对象列表 + 空间索引 / 节点边图 / 文本 + 语法树）。
2. **事务（Transaction/Command）**：一切修改走统一的命令通道，每笔修改携带足够信息以支持撤销（要么存逆操作，要么存补丁）。
3. **视图同步**：模型变了，视图做增量 diff 更新而不是全量重建——这正是 React 思想，但编辑器要在 DOM 的"最后一块主权领地"（光标、选区、输入法）上手工做。
4. **交互状态机**：选区、光标、拖拽中、编辑中……一组游离于内容模型之外的临时状态，它们的进入/退出条件比内容修改更容易出 bug。

**难度为什么 ★★★★~★★★★★**：三座大山叠加。第一，对抗浏览器：`contentEditable` 的光标/输入法/撤销三大坑（A1 详解）几乎每一个都是跨浏览器差异重灾区。第二，算法深度：公式引擎要依赖图 + 拓扑排序（A2），白板要坐标变换与空间索引（A3），都不再是"调 API"而是"造引擎"。第三，长尾无限：粘贴一段 Word HTML、中文输入法回删、双击选中、拖拽跨块——边界情况的清单永远写不完。所以编辑器是前端公认的"皇冠明珠"：壁垒最高，做出来的人最稀缺。

**依赖关系**：A 族与 Schema 线（前一份大纲）最近——低代码平台的画布、Setter、撤销、物料注册，全是编辑器骨架的子集；A4 节点画布直接是低代码"逻辑编排"模块，A5 反哺第 5 章 JSON 编辑器。族内依赖：A3（白板的几何内核）是 A4 的底座；A2 的剪贴板互操作与 A1 共享一套"TSV + HTML 双格式"知识；所有 A 族场景接上 B1（CRDT）就变成协同编辑器——协同是编辑器完成后的"第二增长曲线"。

### 族群 B：实时与协同——让状态在多人多端间保持一致

**问题域**：状态实时分发。两个人的光标在同一个文档里移动、十条消息同时到达、弱网下操作不丢——核心矛盾是"网络不可靠、消息会乱序、用户操作会并发"，而产品要求"看起来像没有网络这回事"。

**共同内核**：连接管理（WebSocket/WebRTC 的建连、断线重连、心跳）→ 消息协议（seq 排序、ack 确认、重试）→ 一致性模型（从 last-write-win 到 OT 到 CRDT，本质都是"并发的定义与消解规则"）→ 乐观 UI（先本地生效，服务端确认后校正）。B1/B2/B3 产品形态完全不同，但这四层一层不缺。

**难度为什么 ★★★★**：难点不在代码量，在**不可复现性**。并发 bug 无法稳定重放，只能靠日志与思维推演；CRDT 是数学（半格、因果关系、交换律），工程包装只是它的皮。这是唯一一个"读论文比读源码有用"的族群。

**依赖关系**：B1 协同依附于 A 族——y-prosemirror 绑富文本、y-monaco 绑编辑器，单机编辑内核不对，协同只会把错误放大一万倍。B2 IM 与 E1 共享长列表虚拟化与 React 渲染优化。B3 音视频相对独立（协议栈自成体系），是唯一几乎不依赖其他族群的场景。

### 族群 C：图形与可视化——把数据映射成视觉，且数据量大到 DOM 扛不住

**问题域**：数据 → 视觉通道（位置/颜色/大小/形状）的映射，外加"映射结果必须可交互（缩放/平移/框选/悬停）"。当数据量从几百涨到一百万，渲染管线要从 SVG 换到 Canvas 再换到 WebGL，这个"换管线"的能力是族群的核心竞争力。

**共同内核**：数据变换（过滤/聚合/降采样 LTTB）→ 视觉编码（D3 的比例尺与数据连接思想）→ 渲染分级选型（SVG <1k / Canvas 1w~10w / WebGL 100w+）→ 坐标系统（屏幕/世界/投影坐标系互转，与 A3 白板同源）→ 交互拾取（命中检测）。

**难度为什么 ★★★~★★★★★**：下限低（调 ECharts 的配置项就能出活），上限高（WebGL shader、数字孪生）。跨度最大的一族——C4 动画一周能入门，C3 数字孪生半年才敢说入门。

**依赖关系**：C1 与 C2 共享聚合与拾取；C3 的 r3f 是"用 React 的方式写 three.js"（React 相关度①层）；C4 与 G 族微交互相邻。C1 与前一份大纲的第 4 章仪表盘直接衔接——大盘的"渲染分级"进阶就是 C1。

### 族群 D：大型应用架构——多团队多宿主下的代码组织与隔离

**问题域**：当一个前端项目大到"一个团队装不下、一个技术栈装不下、一个浏览器标签页装不下"时怎么办。插件化解决"宿主 + 第三方扩展"，微前端解决"多团队多技术栈合并部署"，嵌入式 Widget 解决"把你的应用塞进别人的页面"，浏览器内运行时解决"把 Node 装进浏览器"，桌面端与扩展解决"跳出浏览器宿主"。

**共同内核**：边界与契约（注册表、协议、事件接口）+ 隔离（JS 沙箱、Shadow DOM、iframe、进程）+ 生命周期（加载、激活、失败降级、卸载）+ 通信（postMessage、事件总线、IPC）。六个场景都是这四件事在不同宿主环境下的变奏。

**难度为什么 ★★★~★★★★★**：D2/D5/D6 的 ★★★ 是"概念不难，坑多到怀疑人生"——版本兼容、样式泄漏、打包配置，琐碎但直观。D1 插件化要架构功底。D4 浏览器内运行时是全族天花板：在浏览器里造一台"操作系统"（编译、文件系统、进程隔离），★★★★★ 实至名归。

**依赖关系**：D1 是前一份大纲 §1.2 注册表模式的架构级放大；D2 是 D1 在组织维度的放大；D4 复用 A5（代码编辑器）与前一份大纲 §6.7 安全沙箱；D5（桌面端）复用你全部 Web 代码资产。D3/D6 相对独立，适合作为独立小项目。

### 族群 E：极端性能——数据量与操作频率超过"直接渲染"的舒适区

**问题域**：两个极端。E1 百万级渲染：数据大到"无脑渲染"直接冻死页面；E2 Local-first：把"服务器是唯一真相"翻转为"本地是第一真相、云端只是同步目标"，断网也要能用、恢复后要能合并。

**共同内核**：分而治之（虚拟化只渲染可见、Worker 把计算搬出主线程、分帧把长任务切碎）+ 测量先行（一切优化从 Profiler trace 开始，凭感觉的优化是负优化）+ 内存治理（泄漏排查、对象池）。E2 额外有一层"离线数据层"：Service Worker 缓存策略、IndexedDB、冲突解决——冲突解决的尽头又是 B1 的 CRDT。

**难度为什么 ★★★★**：需要数值化思维。它不引入新领域知识，但要求你对浏览器渲染管线、React 调度、内存模型都有可量化的理解——"大概懂"在百万级数据面前会当场露馅。E1 是面试硬通货，因为它能逼出你知识的全部模糊地带。

**依赖关系**：E1 被所有大数据场景引用（A2 表格、B2 消息流、C1 可视化、F1 长会话）；E2 与 B1 同源（一致性算法）。建议 E1 作为所有方向的公共底层能力，优先级仅次于 G 族。

### 族群 F：AI 原生前端——LLM 输出如何变成可靠 UI

**问题域**：大模型的两个输出特性对流经它的前端提出新要求——**流式**（token 一个个吐，UI 要边收边渲染，还要处理"代码块没闭合"这类半成品状态）与**结构化**（用 JSON Schema 约束输出，前端把它渲染成组件树）。

**共同内核**：F1 流式对话与生成式 UI 的内核是 schema 渲染器（与前一份大纲 §1.3/§2 完全同源）+ 流式状态机（收集中/完成/中断/重生成）+ 长会话性能（又回到 E1 虚拟化）；F2 Agent 画布的内核是 A4 节点编排 + 前一份大纲 §3 的 Setter 体系 + 高频状态更新调度。

**难度为什么 ★★★ 入门、做好极难**：入门 ★★★ 是真的——接 Vercel AI SDK 三天能跑起一个聊天页。"做好极难"也是真的：流式 Markdown 的未闭合代码块、中断后状态一致性、万级消息会话不卡、工具调用的可视化状态机，每一项单独拿出来都是硬课题。这是当前"投入产出比最高但方差也最大"的族群。

**依赖关系**：F 族是前一份大纲 Schema 线的"第三种应用"（动态表单、低代码之后，生成式 UI 接棒）——如果你做过进阶大纲的 schema 渲染器，F1 的核心你已经会了；F2 = A4 + Setter。所以本篇把 A4（★★★☆☆，全族最易）排在 F2 之前学，就是这个依赖顺序。

### 族群 G：交互底座——每个产品都要、但每个都做不完美的基础件

**问题域**：浮层定位、命令面板、虚拟滚动、无障碍组件、无限层级树——这些"不起眼但无处不在"的交互基础设施。它们单拎出来都不难，难在把每个边界情况都做对：浮层遇到视口边缘要翻转、Combobox 要照顾屏幕阅读器、树要支持十万节点拖拽换父。

**共同内核**：Web 平台知识（定位计算、ARIA 1.2 模式、焦点管理）+ 组件工程（受控/非受控、键盘导航、Portal）+ 性能（虚拟化又出现了）。五个组件几乎被所有 A–F 场景复用：编辑器要浮层和命令面板、IM 要虚拟滚动、低代码要树。

**难度为什么 ★★★**：单项三星，且 2–3 周可完成一个——是全图性价比最高的族群。给 ★★★ 不是说它简单，而是"投入可控、回报确定"。

**依赖关系**：G 是所有人的地基。学习顺序上建议最先做（哪怕只做浮层 + 虚拟滚动两件），因为你后续深扎的任何场景都会用到它们，早做早受益。

---

## React 相关度过滤视图

按"去掉 React 后还剩多少"给 23 个场景分三层（无论想滤掉还是只留 React 相关，都按这张表切）：

**① React 强相关——场景的难点就在 React 生态内**
- A4 节点编排（React Flow 本身是 React 库）
- F1 生成式 UI（LLM 结构化输出 → schema 渲染器，纯 React 问题）
- F2 Agent 画布（React Flow + 高频节点状态更新调度）
- 半边相关：C3 的 r3f、C4 的 framer-motion、B2/E1 的长列表重渲染与并发调优（memo/useTransition/Profiler）

**② 混合——原理框架无关，工程实现 React 化**
- A1 富文本（ProseMirror 核心无关，块编辑器视图层是 React）
- B2 IM（虚拟化算法无关，万级消息不卡靠 React 渲染优化）
- C1 大数据可视化（渲染分级无关，deck.gl 有 @deck.gl/react 层）
- D1 插件化（架构模式无关，扩展点用 React context/注册表实现）
- E1 百万级渲染（算法无关，React 并发/分帧调优是另一半）
- G 交互组件（ARIA/定位原理无关，组件实现 React 化）

**③ 基本与 React 无关——React 只是 UI 壳，换框架知识原样保值**
- A2 电子表格（二维虚拟滚动/公式依赖图/Canvas 自绘）
- A3 画布白板（坐标变换/命中检测/空间索引）
- A5 代码编辑器（Monaco/CodeMirror/Lezer/LSP）
- B1 协同 CRDT（Yjs 数据结构与合并算法）
- B3 音视频（WebRTC/hls.js/WebCodecs/Web Audio）
- C2 GIS（MapLibre/矢量瓦片/GCJ02 坐标）
- D2 微前端（qiankun/Module Federation）
- D3 嵌入式 Widget（Shadow DOM/postMessage）
- D4 在线 IDE 底座（sandpack/WebContainers/esbuild-wasm）
- D5 桌面端（Electron/Tauri 进程模型）
- D6 浏览器扩展（Manifest V3）
- E2 Local-first（Service Worker/IndexedDB/冲突解决）

> 结论：全景图的"硬核难点"大多落在 ③ —— CRDT 数学、WebRTC 协议、公式引擎、几何计算、编译管线，是**跨框架的前端硬通货**；① 是 React 开发者的差异化优势；② 的正确学法是：**原理层按通用技术学（保值），实现层用 React 练（变现）**。

### 为什么这一节是本篇的独特价值

市面上的"前端进阶路线图"都回答"学什么"，几乎没人回答"**你已有的 React 技能在每个场景里值几个钱**"。这个问题对你至关重要，因为它决定了三件事：学每个场景时该把力气花在哪一层、知识折旧时哪些资产是安全的、跳槽换技术栈时你能带走什么。

判定方法是一个思想实验，姑且叫**"抽掉 React 测试"**：设想把这个场景的核心难点代码（不是业务 CRUD，是让它配得上 ★★★★ 的那部分）搬到 Vue/Svelte/Solid 项目里，需要重写多少？

- 重写量 ≈ 0，知识原样保值 → ③ 层；
- 重写量 ≈ 100%，难点离开 React 根本不存在 → ① 层；
- 一半保值、一半报废 → ② 层。

下面逐层展开：每层的含义、学习策略，以及表内每个场景为什么这样归。

### ① 层详解：React 强相关——难点长在 React 生态内

**含义**：这些场景的"硬"来自 React 侧——渲染器、状态调度、组件体系。抽掉 React，场景的核心（React Flow 库、schema 渲染器）就不复存在。你的 React 功底在这里直接兑付，学习曲线最平缓。

**学习策略**：放心大胆地把时间全部投在 React 侧——渲染性能、状态设计、组件 API。这层的知识**变现最快**（简历立刻能写、面试立刻能聊），但也要清醒：它绑定 React 生态，框架更迭时折旧最快。① 层是你的差异化优势，不是你的养老金。

**每个场景的归类理由**：

- **A4 节点编排**：React Flow 本身就是 React 库——节点就是 React 组件，连线交互、状态更新全部在 React 体系内。Vue 生态要用同款能力得用 Vue Flow（社区移植），知识无法直接平移。归类理由：离开 React 连"场景本身"都不存在。
- **F1 生成式 UI**：LLM 结构化输出 → schema 渲染器，这是纯 React 问题——和你做过的动态表单渲染器是同一台机器，喂的 schema 从"人拖出来的"换成"模型吐出来的"。难点（schema 校验、组件映射、动态渲染、类型安全）全在 React 侧。
- **F2 Agent 画布**：React Flow + 高频节点状态更新调度。Agent 运行时节点状态每秒可能变几十次，`setNodes` 风暴的合并、批处理、`useTransition` 降级渲染——这是 React 并发特性的实战考场。
- **半边相关：C3 的 r3f**：three.js 本身与 React 无关（③ 层知识），但 react-three-fiber 是"用 React 写 3D 场景"——它把 three 的命令式对象模型包装成 React 组件树，这个包装思想（自定义 React 渲染器）是①层知识。所以 C3 建议：three.js 按通用图形学学，r3f 按 React 渲染器学。
- **半边相关：C4 的 framer-motion**：动画的物理模型（spring、FLIP 几何）是通用的，但 framer-motion 的 `layout` 动画深度绑定 React 渲染周期——`layoutId` 共享元素过渡依赖 React 组件树的身份。动画原理保值，库的用法是 React 专属。
- **半边相关：B2/E1 的长列表优化**：虚拟化算法（窗口计算、测量缓存）框架无关，但"万级消息不卡"的落地手段——`memo` 精确比较、`useTransition` 把更新标为非紧急、Profiler 定位重渲染元凶——全是 React API。所以这两处跨层：算法在 ②/③，优化手段在 ①。

### ② 层详解：混合——原理框架无关，工程实现 React 化

**含义**：这些场景像一枚硬币。正面是原理（算法、协议、模式），写下来与框架无关，十年后仍然成立；反面是工程实现（React 组件、hooks、渲染优化），是原理在 React 里的落地形态。只学正面，纸上谈兵；只学反面，换个框架全部报废。

**学习策略**：**双层拆开学，先原理后实现**（具体操作方法见本节末尾的六步法）。判断自己有没有学到家的标准：能不能脱稿讲清原理（不提 React 一个字），再用 React 把它做出来。

**每个场景的归类理由**：

- **A1 富文本**：ProseMirror 的四件套（Schema/State/Transaction/PluginView）是纯 TS 内核，不 import 任何 React；但块编辑器的视图层（块组件、斜杠命令面板、块菜单）用 React 写最顺手。硬币正面是文档模型与事务机制，反面是 React 视图绑定。
- **B2 IM**：虚拟化算法（动态高度测量、向上翻页锚定）是数据结构课题；但"万级消息不重渲染"靠 React 的 memo 体系。算法给 Vue 用照样对，优化代码给 Vue 用一行不能跑。
- **C1 大数据可视化**：渲染分级选型（SVG/Canvas/WebGL 的数量级分界）是图形学常识；deck.gl 提供 `@deck.gl/react` 层让图层声明式地长在 React 树里。选型知识保值，DeckGL 组件用法是 React 的。
- **D1 插件化**：contribution points、宿主 API 权限、生命周期——这是架构模式，VSCode 用任何语言都能实现；但"第三方注册一个 React 组件作为新面板"这个扩展点，落地手段是 React context + 组件注册表（前一份大纲 §1.2 的放大）。
- **E1 百万级渲染**：虚拟滚动、Worker 分片、脏矩形是算法；React 并发特性（`startTransition` 分离紧急/非紧急更新）与分帧调优是另一半。两个一半，缺一个都做不完。
- **G 交互组件**：ARIA 模式、定位几何（floating-ui 的 flip/shift 计算）、焦点管理是 Web 平台知识；组件以 React 组件库形态交付（Portal、受控 API 设计）。

### ③ 层详解：基本与 React 无关——React 只是 UI 壳，换框架知识原样保值

**含义**：这些场景的核心难点在领域知识里——数学、协议、编译器、浏览器内核机制。React 只负责画工具栏和设置面板，把这些难点围一圈 UI 壳。把 React 换成 Vue，壳重画一遍，内核代码原样搬运。

**学习策略**：学这层要明确告诉自己：**我在学前端，不是在学 React**。直接读算法原文、协议 RFC、引擎源码，用最朴素的 TS 实现练习；React 壳随手用什么都行。这层知识**半衰期最长**（WebRTC 协议二十年没变过本质，CRDT 论文 2011 年至今仍是基础），是越老越值钱的"养老金"资产。23 个场景里 ③ 层占了 12 个——全景图的硬核难点大多在此，这是本表最重要的一个发现。

**每个场景的归类理由**：

- **A2 电子表格**：二维虚拟滚动是数据结构、公式依赖图 + 拓扑排序是图算法、Canvas 自绘是 2D 图形——三项核心没有一项碰到 React。React 能做的只有工具栏按钮和右键菜单。这就是为什么 A2 难度 ★★★★★ 但 React 相关度垫底：它的难与 React 无关。
- **A3 画布白板**：坐标变换是线性代数（矩阵乘法与逆）、命中检测是计算几何、R-tree 是空间数据结构。Figma 的内核甚至不是 JS。React 在白板项目里的存在感约等于工具栏。
- **A5 代码编辑器**：Monaco、CodeMirror、Lezer、LSP 全部框架无关——LSP 协议的客户端可以对接任何编辑器。编辑器实例的生命周期甚至建议脱离 React state 手动管理（见 A5 详解），React 过度介入反而添乱。
- **B1 协同 CRDT**：Yjs 的数据结构（YATA 算法、RGN 顺序）与合并数学是分布式系统课题。y-prosemirror 只是它的一层绑定；绑 Monaco 还是绑自研编辑器，算法一个字不改。
- **B3 音视频**：WebRTC 是协议栈（SDP 协商、ICE 穿透）、hls.js 是流媒体协议实现、WebCodecs/Web Audio 是浏览器编解码与音频 API。这里"前端"的"端"指终端而非框架。
- **C2 GIS**：矢量瓦片原理、GCJ02 火星坐标偏移算法、点聚合——GIS 领域知识。会用 MapLibre 的 Vue 版和 React 版难度完全相同。
- **D2 微前端**：qiankun 的 proxy 沙箱、Module Federation 的运行时共享，解决的是 JS 引擎与打包器层面的问题。子应用用 React 还是 Vue 恰恰是它要抹平的差异。
- **D3 嵌入式 Widget**：Shadow DOM 与 postMessage 是浏览器标准。你的 Widget 用 Solid 写、宿主页用 React 写，两者照常协作——这个场景的立身之本就是"与宿主框架解耦"。
- **D4 在线 IDE 底座**：esbuild-wasm 是编译器、WebContainers 是浏览器里的 Node 运行时、import maps 是标准提案。整条编译管线没有一个环节认得 React。
- **D5 桌面端**：Electron/Tauri 的主/渲染进程模型、IPC、自动更新是系统层知识。界面用 React 还是纯 HTML，对桌面端架构一无所知。
- **D6 浏览器扩展**：Manifest V3 是浏览器扩展平台的规范。content script 与页面 React 应用的共存问题，考的是对浏览器隔离世界的理解，不是 React。
- **E2 Local-first**：Service Worker 缓存策略、IndexedDB 事务、冲突解决（LWW → CRDT）是 Web 平台 + 分布式一致性知识。

### "原理层保值、实现层变现"的六步操作法

② 层的正确学法一句话：**原理层按通用技术学（保值），实现层用 React 练（变现）**。这句话不落地就是口号，落地成一个可复用的六步流程。以"虚拟滚动"（E1/G 都有）为例：

1. **第 1 步（半天）——脱离 React 实现原理层**。用原生 DOM 写一个定高虚拟列表：手撸 `scrollTop` 监听、窗口计算、占位撑高。不许 import React。这一步的产出是"我理解了滚动容器的物理机制"。
2. **第 2 步（半天）——对照开源源码校准**。读 react-window / @tanstack/virtual-core 的核心 200 行（跳过所有 React 包装），对比自己的实现差在哪。注意读的是 `virtual-core`——它就是框架无关层，这个目录结构本身就是 ② 层分层的教科书。
3. **第 3 步（一天）——用 React 重写为 hook**。把第 1 步的原型包装成 `useVirtualizer(options)` 返回 `getVirtualItems()`，处理 SSR、ref、ResizeObserver。这一步练"实现层"：API 设计、hooks 心智、清理函数。
4. **第 4 步（一天）——加 React 侧专属难点**。`memo` 子组件避免逐项重渲染、`useTransition` 让大数据集切换不阻塞输入、key 策略对滚动锚定的影响。这些知识在 ① 层，只对 React 有效。
5. **第 5 步（半天）——做对比实验**。Profiler 录制"原生版 vs React 版 vs react-window 版"的 trace，量化差距并写结论。能解释"为什么 React 版比原生版多花 X ms、花在哪"才算过关。
6. **第 6 步（半天）——双笔记账输出**。为这个知识点记两笔账：**原理账**（滚动机制、测量缓存——写进"保值资产"，十年后还能用）与**实现账**（hook 设计、性能对比——写进"变现资产"，简历与面试用）。输出一篇短文，标题就叫"虚拟滚动：脱离框架讲原理 + React 实现细节"。

把第 1 步与第 3 步的产出形态摆出来看更直观——同一件事的两种挂点：

```ts
// 第 1 步产出（原理层，零 React）：定高虚拟列表的窗口计算核心，搬去任何框架都成立
export function computeWindow(scrollTop: number, viewportH: number, itemH: number, count: number, overscan = 3) {
  const start = Math.max(0, Math.floor(scrollTop / itemH) - overscan)
  const end = Math.min(count, Math.ceil((scrollTop + viewportH) / itemH) + overscan)
  return { start, end, total: count * itemH } // total 用于撑出滚动条
}
```

```tsx
// 第 3 步产出（实现层，React 专属）：把它包装成 hook，API 设计与清理逻辑都是 React 功底
import { useCallback, useState, useRef, useEffect } from 'react'
import { computeWindow } from './virtual-core'

export function useVirtualList(count: number, itemH: number, viewportH: number) {
  const [scrollTop, setScrollTop] = useState(0)
  const rafRef = useRef(0)
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    cancelAnimationFrame(rafRef.current)                    // rAF 合帧：高频滚动事件降频到每帧一次
    rafRef.current = requestAnimationFrame(() => setScrollTop(top))
  }, [])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []) // 卸载清理，防 setState 泄漏
  return { ...computeWindow(scrollTop, viewportH, itemH, count), onScroll }
}
```

这个六步法适用于所有 ② 层场景：把"虚拟滚动"换成"富文本事务"（A1）、"节点状态调度"（F2）、"插件注册表"（D1），流程不变。它强制你的每个知识点都有两个挂点——一个挂在领域知识树上（保值），一个挂在 React 生态上（变现）——这正是一个进阶开发者对抗技术折旧的核心策略。

## A. 编辑器家族（与 Schema 线最近，壁垒最高）

进入逐场景详解之前，先解释族标题里的两个判断。

**"与 Schema 线最近"**：前一份大纲《react-进阶大纲-复杂场景.md》的内核是"schema 树 + 注册表 + 递归渲染器 + Undo/Redo + 拖拽"。编辑器家族是把这套内核推到极限的场景群——富文本的文档树就是一棵 schema 树（节点有 type/attrs/children），ProseMirror 的 Transaction 就是"每笔修改可序列化"的命令通道，块编辑器的块拖拽就是进阶大纲 §1.6 拖拽原理的块级版本。你在低代码平台里做过的画布选中、Setter、撤销栈，在编辑器家族里以更严苛的形态重新出现。所以学 A 族不是开新坑，而是给 Schema 线"回炉淬火"。

**"壁垒最高"**：A 族要同时对抗三样东西——浏览器的原始行为（光标/输入法/撤销，浏览器给了你 `contentEditable` 但没给你控制权）、真正的算法（公式引擎的图算法、白板的计算几何）、以及无限的内容边界情况（粘贴、拖放、双击、折叠）。三样叠起来，市面上能从零做出生产级编辑器的团队屈指可数。也正因为壁垒高，A 族经验是前端领域公认的"越老越值钱"资产。

以下是 A1–A5 的逐场景详解。每个场景统一按六段展开：是什么（画像）→ 为什么难（难点本质）→ 核心技术逐项讲解 → 代表产品及其可学的点 → 入手路径与验收物 → 常见坑。

### A1. 富文本 / 块编辑器（★★★★★）——前端"皇冠明珠"

- **画像**：Notion/飞书文档式编辑器
- **核心技术**：contentEditable 的坑（光标管理、中文 IME、浏览器原生撤销污染）→ ProseMirror 四件套（Schema/State/Transaction/PluginView）→ TipTap 快速开发 → 块编辑器（块拖拽排序、嵌套、`/` 斜杠命令、块级菜单）
- **代表**：Notion、飞书文档、语雀
- **入手**：TipTap 官方 demo 改起 → **ProseMirror 官方 Interactive Guide 必读** → 做一个支持标题/列表/图片/斜杠命令/块拖拽的 mini Notion

#### A1.1 是什么：画像

富文本/块编辑器就是"Notion、飞书文档"里那个东西：用户敲字出字、回车分段、选中变粗，还能插入图片、表格、代码块，输入 `/` 弹出命令菜单，拖住块左侧的手柄给块排序。术语上区分两种形态：

- **富文本编辑器（inline 编辑）**：以"字符流 + 标记（mark）"为主，光标在字符间移动，如早期 Medium 编辑器、论坛发帖框。ProseMirror 是这一形态的学术级答案。
- **块编辑器（block 编辑）**：以"块"为最小操作单元，块可拖拽、可嵌套、可携带任意 props，如 Notion。块编辑器内部每个块又是一个小型富文本编辑器——它是"富文本内核 + 块级结构层"的两层建筑。

现代产品几乎都是后者，但后者建立在前者的地基上，所以学习顺序是先攻 A1 内核（contentEditable + ProseMirror），再上块层。

#### A1.2 为什么难：contentEditable 的三大坑

难点本质一句话：**`contentEditable` 让浏览器替你编辑 DOM，但浏览器编辑的是 DOM，而你的产品需要的是"模型"——两者之间的同步权、决定权全在你手里，而浏览器在每一个细节上跟你抢方向盘。**三大坑逐一拆解，每一坑都配症状、机理与对策。

**坑一：光标管理——DOM 选区与模型位置是两个世界**

是什么：光标（caret）与选区（selection）在浏览器里由 `Selection`/`Range` API 表达，它们描述的是 **DOM 节点与偏移**；而你的编辑器关心的是"模型位置"（第 3 个段落的第 5 个字符之后）。浏览器还允许光标落在你的模型里不存在的地方（两个表格单元格之间、块级元素的边界外），且各家对 Range 的归一化规则不一。

为什么需要重视：任何"光标相关的功能"——工具栏加粗、输入 `/` 弹菜单、显示协作者光标、恢复撤销后的光标——都需要"读写光标位置 + 在模型与 DOM 之间换算位置"。换算错一点，用户看到的就是光标乱跳、选区丢失。

典型的翻车现场：用户选中一段文字，点击工具栏的 B 按钮——按钮一获得焦点，编辑区失焦，**选区当场消失**，加粗操作找不到目标。

```ts
// 翻车复现：点按钮 → 编辑区失焦 → selection 被清空
// 对策一（最常用）：按钮按下时阻止它抢焦点，选区得以保留
function BoldButton({ onBold }: { onBold: () => void }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()} // 关键：阻止按钮获得焦点，编辑区不失焦
      onClick={onBold}
    >
      B
    </button>
  )
}

// 对策二：失焦前保存 Range，执行命令前恢复
let savedRange: Range | null = null
editorEl.addEventListener('selectionchange', () => {
  const sel = document.getSelection()
  if (sel && sel.rangeCount > 0 && editorEl.contains(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange() // 深拷贝，原 Range 会失效
  }
})
function restoreSelection() {
  if (!savedRange) return
  const sel = document.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(savedRange) // 恢复到上一次合法选区
}
```

还有一个高频跨浏览器差异：**由屏幕坐标反查光标位置**（拖拽插入、点击定位都要用）——Chrome/Safari 是非标准的 `caretRangeFromPoint`，Firefox/标准是 `caretPositionFromPoint`：

```ts
function caretFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(x, y) // Blink/WebKit
  }
  const pos = doc.caretPositionFromPoint?.(x, y) // Firefox / 标准
  if (!pos) return null
  const r = document.createRange()
  r.setStart(pos.offsetNode, pos.offset)
  return r
}
```

根本对策（也是 ProseMirror 的核心设计）：**不要让选区游离在模型之外**。把选区纳入文档状态（`state.selection`），DOM 选区只是它的投影；每次更新先用模型位置计算该显示什么，再单向地写到 DOM。这就是"单向数据流"思想在光标上的应用——A1.3 的四件套会看到它如何落地。

**坑二：中文 IME——composition 期间的竞态**

是什么：用拼音/注音输入法打字时，从敲下第一个字母到上屏，浏览器走一遍"组合输入"流程：`compositionstart` → 若干次 DOM 直接变更（预输入文字被浏览器直接插进 DOM）→ `compositionend`（上屏）。**组合期间，DOM 的变更不经过你、也不该被打断。**

为什么难：如果你的编辑器在组合期间做任何"以模型为准重建 DOM"的操作（例如 React 重渲染覆盖了编辑区、你的同步逻辑把预输入节点删了重建），输入法会话会被强制中止——用户正在敲的拼音词组直接丢失，候选框消失。中文用户一天撞几十次，属于"上线即被骂"级别的事故。

```ts
// 组合期守门：用一个标志位把"模型 → DOM"的同步挡在组合期外
let composing = false
editorEl.addEventListener('compositionstart', () => {
  composing = true // 拼音组合开始：浏览器将直接改 DOM
})
editorEl.addEventListener('compositionend', () => {
  composing = false // 组合结束：此刻才允许把 DOM 差异收编进模型
  scheduleSync()     // 统一补一次同步，模型追上 DOM 的最终状态
})

// 所有"要动 DOM"的路径都要先检查这个门
function syncFromModel() {
  if (composing) return // 组合期间：绝不重建 DOM，否则输入法会话被杀
  renderModelToDom()
}
```

机理补充：`compositionend` 的触发时机在各浏览器还有差异（上屏 vs 提交候选），且组合期间的撤销栈记录必须把整段拼音算作一步（半个词的撤销是灾难）。ProseMirror 在内部完成了这套守门（DOM 观察器在组合期挂起、组合结束统一解析变更），这也是"别裸写 contentEditable"最有说服力的理由之一。自研时最小要做到：组合期不碰 DOM、组合结束统一收编、撤销按整段记录。

**坑三：浏览器原生撤销——两本历史互相打架**

是什么：浏览器给 `contentEditable` 区域内置了一本撤销栈（Ctrl/Cmd+Z 走浏览器自己的 history），而你的编辑器必然还有一本自定义历史（模型级命令栈，见前一份大纲 §1.5 的 Undo/Redo 三种实现）。两本历史各自记录、互不知情。

为什么是灾难：用户按 Cmd+Z，浏览器撤销的是"上一次 DOM 变更"——可能是你的程序写 DOM（模型驱动），可能是用户手敲（你还没收编），于是 DOM 变了、模型不知道；再按一次，又轮到你的栈动模型、DOM 由你重绘，浏览器那本栈的锚点全废。表现是"撤销行为随机、光标乱跳、内容莫名消失"。

```ts
// 对策：拦截原生撤销入口，全部改道自定义历史
editorEl.addEventListener('beforeinput', (e) => {
  const inputType = (e as InputEvent).inputType
  if (inputType === 'historyUndo' || inputType === 'historyRedo') {
    e.preventDefault() // 拦下浏览器撤销栈
    inputType === 'historyUndo' ? myHistory.undo() : myHistory.redo() // 走自己的栈
  }
})
```

顺带说明：老一代编辑器靠 `document.execCommand('bold')` 这类 API 实现格式化——该 API 已废弃，行为各浏览器不一，现代方案全部改为"事务改模型 → 模型重绘 DOM"，`execCommand` 一行都不要写。而 `beforeinput` 的 `inputType`（`insertText` / `deleteContentBackward` / `historyUndo`…）是接管输入的正规入口，ProseMirror 内部正是基于它做输入拦截。

三坑合起来的结论：**contentEditable 只应该当作"输入事件的采集器 + 文字渲染的白板"，编辑权必须收回模型层。**这正是 ProseMirror 的立足点。

#### A1.3 核心技术一：ProseMirror 四件套（Schema / State / Transaction / PluginView）

ProseMirror 用四个概念回答"如何把编辑权收回模型层"：Schema 定义模型的合法形态，State 是不可变快照，Transaction 是修改的唯一通道，Plugin/PluginView 是扩展机制。四件逐个讲，然后给一份完整的讲解性代码把四件串起来。

**Schema——模型的"法律"**。是什么：一份声明式定义，规定文档里有哪些节点类型（paragraph、heading、image…）、每种节点的属性（attrs）、什么样的嵌套合法（content 表达式如 `"block+"`）、与 HTML 怎么互转（parseDOM/toDOM）。为什么需要：没有法律，粘贴进来的任意 HTML、用户光标的任意落点都会把文档树变成非法形态，后续所有功能（序列化、协同、校验）无从谈起。contentEditable 三坑的根治都从这里开始——非法位置在 Schema 层就进不了模型。

**State——不可变快照**。是什么：`EditorState` 持有当前文档 `doc`、选区 `selection`、以及各插件的状态，且**不可变**——任何修改都产生新的 State 而非原地修改。为什么需要：不可变性让"撤销"退化为"指回旧 State"，让协同编辑可以按事务粒度合并，让 React 渲染有可靠的相等性判断。这与你熟悉的 Redux 心智完全同构，可以把 EditorState 理解成"编辑器界的 store"。

**Transaction——修改的唯一通道**。是什么：一切变更（打字、加粗、粘贴、程序化修改）都被表达为一个 `Transaction`（tr），它记录若干 step（对文档树的最小操作）以及伴随的选区/滚动/元信息变更。`state.tr` 创建、链式追加操作、`view.dispatch(tr)` 提交。为什么需要：统一通道意味着撤销、协同、审计、时间旅行都能以事务为单位处理——B1 协同编辑（y-prosemirror）正是把 Transaction 翻译成 CRDT 操作。

**Plugin / PluginView——扩展机制**。是什么：插件是一个对象包，可以贡献四样东西——`props`（行为：快捷键、装饰、DOM 属性等）、`state`（随 State 流转的插件私有状态）、`view`（插件在视图层的"代理人"，带 `update/destroy` 生命周期，可以自由操作 DOM）、`key`（插件身份）。为什么需要：没有插件机制，任何功能都得改内核。Decoration（装饰）系统尤其关键——它允许"在不改文档模型的前提下"给视图加东西：占位符、拼写检查下划线、协同光标，全是 Decoration。

一份完整的讲解性代码，四件套全部登场（约 90 行，可直接放进任何 React 项目跑）：

```ts
// pm-core.ts —— ProseMirror 四件套讲解版
import { Schema, Node as PMNode } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'

// ────────────────────────────────────────────────
// ① Schema：模型的"法律"。哪些节点、什么嵌套、怎么和 HTML 互转
// ────────────────────────────────────────────────
export const schema = new Schema({
  nodes: {
    // content 表达式约束嵌套：根必须是 1 个以上块；段落内只能是行内内容
    doc:      { content: 'block+' },
    paragraph: {
      group: 'block', content: 'text*',
      parseDOM: [{ tag: 'p' }],                 // 粘贴 HTML 时：<p> → paragraph
      toDOM: () => ['p', 0],                    // 0 是"内容洞"：子内容渲染到这里
    },
    heading: {
      group: 'block', content: 'text*',
      attrs: { level: { default: 1 } },         // 属性带默认值，序列化时省体积
      parseDOM: [{ tag: 'h1', attrs: { level: 1 } },
                 { tag: 'h2', attrs: { level: 2 } }],
      toDOM: (node) => ['h' + node.attrs.level, 0],
    },
    text: { inline: true },                     // 文字节点：行内、无子节点
  },
})

// ────────────────────────────────────────────────
// ② State：不可变快照 = 文档 + 选区 + 插件状态
// ────────────────────────────────────────────────
// 用 Schema 的工厂函数手搓初始文档（生产中常改用 DOMParser.fromSchema(schema).parse(dom)）。
// 光标默认落在文档开头，无需手工构造 selection；需要时传 selection: TextSelection.atStart(doc)
export function createInitialState(): EditorState {
  const doc = schema.node('doc', null, [
    schema.node('heading', { level: 1 }, schema.text('第一个标题')),
    schema.node('paragraph', null, schema.text('下面的段落')),
  ])
  return EditorState.create({ schema, doc, plugins: [placeholderPlugin, wordCountPlugin] })
}

// ────────────────────────────────────────────────
// ③ Transaction：修改的唯一通道。注意每步都产生新 doc，state 本身不动
// ────────────────────────────────────────────────
export function demoTransaction(state: EditorState): EditorState {
  const tr = state.tr // 从当前 state 创建事务
  // 在当前光标处插入文本（tr 内部会同步移动选区到插入之后）
  tr.insertText('（追加）', tr.selection.from)
  // 把光标所在块改成二级标题：$from.before()/after() = 当前块的起止位置
  const { $from } = tr.selection
  tr.setBlockType($from.before(), $from.after(), schema.nodes.heading, { level: 2 })
  // 事务可以随时查"将生效的文档"——因为 steps 会在 tr.doc 上即时预演
  console.log('事务内预览：', tr.doc.textContent)
  tr.scrollIntoView() // 提交后让选区滚入可视区
  // 提交：产生全新 state（旧 state 保留，供撤销指回）
  return state.apply(tr)
}

// ────────────────────────────────────────────────
// ④ Plugin + PluginView：扩展机制（行为 + 状态 + 视图代理人）
// ────────────────────────────────────────────────
// 4a. 占位符插件：Decoration.widget——不改文档，只在视图上"贴"一个 DOM
const placeholderKey = new PluginKey<DecorationSet>('placeholder')
const placeholderPlugin = new Plugin<DecorationSet>({
  key: placeholderKey,
  state: {
    init: (_, state) => buildPlaceholder(state.doc),
    apply: (tr) => buildPlaceholder(tr.doc), // 每次 tr 后按新 doc 重算装饰
  },
  props: {
    // 视图询问"该显示哪些装饰"时，从插件状态里取
    decorations: (state) => placeholderKey.getState(state),
  },
})
function buildPlaceholder(doc: PMNode): DecorationSet {
  // 文档只有一个空段落时，往 pos 1（第一个块内部起点）挂一个提示词
  if (doc.childCount === 1 && doc.firstChild!.content.size === 0) {
    return DecorationSet.create(doc, [
      Decoration.widget(1, () => {
        const span = document.createElement('span')
        span.textContent = '输入 / 唤起命令…'
        span.style.color = '#94a3b8'
        return span
      }),
    ])
  }
  return DecorationSet.empty
}

// 4b. 字数统计插件：PluginView——带生命周期的视图代理，自由操作真实 DOM
const wordCountKey = new PluginKey<number>('wordCount')
const wordCountPlugin = new Plugin<number>({
  key: wordCountKey,
  state: {
    init: () => 0,
    // 只有 doc 变了才重算；tr.mapping 还能把历史位置映射到新位置（撤销时的关键能力）
    apply: (tr, value) => (tr.docChanged ? tr.doc.textContent.length : value),
  },
  view: (view) => {
    // mount 阶段：创建自己的 DOM，挂在编辑器旁边
    const badge = document.createElement('div')
    badge.textContent = '字数 0'
    view.dom.parentNode?.appendChild(badge)
    return {
      // 每次 state 更新后被调用：读插件状态，刷新自己的 DOM
      update: (v) => { badge.textContent = `字数 ${wordCountKey.getState(v.state)}` },
      // 卸载阶段：必须清理，否则泄漏（对应 React 的 cleanup 心智）
      destroy: () => badge.remove(),
    }
  },
})
```

```tsx
// pm-editor.tsx —— React 绑定：EditorView 的生命周期对齐 useEffect
import { useEffect, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { createInitialState } from './pm-core'

export function PmEditor() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let view!: EditorView
    view = new EditorView(hostRef.current!, {
      state: createInitialState(),
      // 事务提交的 React 侧处理：新 state → 一次性更新视图
      // （PM 自己做 DOM diff，只改变化的部分，绝不整棵重建——IME 坑的根治处）
      dispatchTransaction(tr) {
        view.updateState(view.state.apply(tr))
      },
    })
    return () => view.destroy() // 卸载销毁；漏掉这行 = 监听器泄漏 + StrictMode 下双实例
  }, [])

  return (
    <div>
      <div ref={hostRef} className="pm-host" />
    </div>
  )
}
```

四件套协作的完整旅程（一次按键发生什么）——把上面的代码串成时间线：

1. 用户按 `B` 键，浏览器准备在 contentEditable DOM 插入文字；
2. ProseMirror 通过 `beforeinput` 等钩子**拦截**浏览器行为（不让它直接改 DOM）；
3. 把"插入 b"翻译成一个 **Transaction**（`tr.insertText('b')`），其中含合法性与 Schema 校验；
4. `Transaction` 应用到 **State**，得到新 State（旧 State 原地不动，成为撤销候选）；
5. `view.updateState(新 State)` 触发视图 diff：ProseMirror 比较新旧文档，只把变化的那一小段同步到 DOM，并按新 State 的 selection 投影 DOM 光标；
6. 各插件的 `view.update` 与 Decoration 重算被调用（占位符消失、字数 +1）。

对照三坑：第 2 步拦截 + 第 5 步"只 diff 不重建"根治 IME 竞态；selection 进 State（第 5 步单向投影）根治光标漂移；history 插件（prosemirror-history，基于 Transaction 的 steps + invert 机制）配合 `beforeinput` 拦截根治原生撤销。四件套不是四个孤立 API，而是一条把编辑权从浏览器手里收回模型的完整管线。

#### A1.4 核心技术二：TipTap——站在 ProseMirror 肩上的快速开发层

是什么：TipTap 是 ProseMirror 的无头（headless）封装——把"定义 Schema、组装插件、管理视图生命周期"这些过程式劳动，改造成"声明式的 extension 列表 + 链式命令 API"，并官方提供 React 绑定。为什么需要：直接写 ProseMirror 意味着手动处理大量样板（Schema、keymap、history、粘贴规则），TipTap 把 80% 的样板变成一行 `extensions: [StarterKit]`，同时保留逃生舱（`editor.commands`（PM command）、自定义 Node/Mark extension 可下探到原生 Plugin）。

```tsx
// tiptap-editor.tsx —— 10 分钟起步一个带工具栏的富文本
import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function TiptapDemo() {
  const titleRef = useRef<HTMLSpanElement>(null)
  const editor = useEditor({
    extensions: [StarterKit], // 段落/标题/加粗/列表/历史 全家桶
    content: '<h2>你好</h2><p>开始编辑…</p>',
    immediatelyRender: false, // SSR/首屏安全：避免服务端创建 EditorView
    onUpdate: ({ editor }) => {
      // 每次事务提交后触发；注意这里只做轻量副作用，别把内容塞回 state 再受控回灌
      titleRef.current!.textContent = editor.getText().slice(0, 20) || '无标题'
    },
  })

  if (!editor) return null
  return (
    <div>
      <span ref={titleRef}>无标题</span>
      <div className="toolbar">
        {/* onMouseDown preventDefault：A1.2 坑一的标准对策，保住选区 */}
        <button onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

选型建议：产品节奏快、需求是"常规富文本 + 少量定制"——TipTap 起步，遇到天花板再下探 ProseMirror 层；需求是"深度定制文档模型/极致性能"——直接 ProseMirror。两者不冲突，TipTap 的 extension 底层就是 ProseMirror 插件，学的知识完全平移。

#### A1.5 核心技术三：块编辑器——块层四件套（拖拽排序 / 嵌套 / 斜杠命令 / 块菜单）

块层建在富文本内核之上，数据模型通常是一棵块树：

```ts
// 块模型：每个块 = 身份 + 类型 + 属性 + 子块（与低代码的页面 schema 同构！）
type Block = {
  id: string
  type: 'paragraph' | 'heading' | 'todo' | 'image' | 'group'
  props: Record<string, unknown> // heading 的 level、todo 的 checked、image 的 src
  children?: Block[]             // 嵌套：todo 缩进、分组容器
}
```

- **块拖拽排序**：是什么——拖住块手柄，把块（及其子树）移动到另一位置。为什么难——拖拽要跨"块边界"计算落点（放到上面/下面/里面），且拖动中的原块要"半透明占位"。怎么做——用 dnd-kit（前一份大纲 §1.6 精讲过）的 sortable 模式：每个块 `useSortable({ id: block.id })`，落点计算 `over` 指示器区分"插入兄弟"与"成为子块"。最小验收：拖一个 todo 块到另一个 todo 块右侧出现"成为子块"的缩进指示。
- **嵌套**：是什么——块可含子块（列表缩进、页面分组）。实现要点是递归渲染 + 折叠状态（折叠是 UI 态，不写进内容模型）+ 嵌套深度限制（防止用户造出 50 层嵌套压垮布局）。注意拖拽换父时"不能把自己拖进自己的子孙"（树成环），与 A4 连线校验的环检测同源。
- **`/` 斜杠命令**：是什么——输入 `/` 弹出命令面板，选择后插入对应块。机制分步——(1) 监听编辑器更新，检查光标前的文本是否匹配 `/^\\/(\\w*)$/`；(2) 匹配则弹出浮动面板（位置 = 光标坐标，用 A1.2 的坐标反查或 PM 的 `view.coordsAtPos`）；(3) 面板内键盘上下选择、回车确认；(4) 确认后**先删除触发词再执行插入命令**。TipTap 的 `@tiptap/suggestion` 工具把 (1)(2)(3) 封装成通用 suggestion 机制（@提及、斜杠命令同源）。最小实现示意：

```ts
// 斜杠命令的判定核心（配合任何编辑器内核都一样）
function onEditorUpdate(getTextBeforeCursor: () => string, open: (q: string, close: () => void) => void) {
  const m = getTextBeforeCursor().match(/^\/(\w*)$/) // 光标前只有 /xxx 才触发
  if (m) open(m[1], () => {})                        // 打开面板，携带过滤词
  // 选中命令后：先 deleteRange 掉 "/xxx"，再执行对应插入命令
}
```

- **块级菜单**：是什么——hover 块时出现的手柄（通常六点图标），点开是"复制/删除/转为/拖拽"菜单。实现要点：手柄是**块外浮层**（不属于 contentEditable，避免光标进去），位置跟随块 DOM（`view.nodeDOM(pos)` 反查），点击手柄弹出菜单用 floating-ui 定位（G 族知识）。手柄 `onMouseDown` 一样要 `preventDefault` 保选区。

#### A1.6 代表产品及其可学的点

- **Notion**：块模型的教科书。可学：块的粒度设计（一切都是块，连页面也是块）、`/` 命令的交互分寸（何时弹出、Esc 语义）、块属性的存储形态（块表 + 内容表分离的数据库思路）。
- **飞书文档**：工业级协同富文本。可学：y-prosemirror 在大规模生产的使用方式、评论锚定（选区与评论的绑定如何随编辑保持位置）、富文本与表格/画板的混排边界。
- **语雀**：Markdown 双向编辑的代表。可学：富文本模型与 Markdown 的双向序列化（WYSIWYG ↔ 文本态互转不丢信息），这正是 A5"自研 DSL"的前置知识——编辑器内核 + 文本序列化 = 一门自定义语言。

#### A1.7 入手路径与验收物

按原大纲的路径展开（与引言的 4–6 周节奏对齐）：

1. **第一步（第 1 周前半）**：clone TipTap 官方 demo，加两个自己的扩展——一个自定义 Node（比如"高亮块"），一个斜杠命令（输入 `/hl` 插入高亮块）。目的：跑通"extension 机制 + suggestion 机制"两个关键面。
2. **第二步（第 1 周后半）**：通读 **ProseMirror 官方 Interactive Guide**（必读，原大纲加粗不是偶然）——它以交互方式讲四件套，比任何二手教程准确。边读边把上面 90 行讲解代码手动扩展：加一个 image 节点、一个 custom 选项。
3. **第三步（第 2–4 周）**：做 mini Notion。**验收物清单**：支持标题（1–3 级）/ 无序有序列表 / 图片（粘贴与上传）/ `/` 斜杠命令（至少 5 个命令）/ 块拖拽排序（含嵌套落点）。**完成定义（DoD）**：8 条手测用例全过——中文输入法连续输入不丢字、Cmd+Z 撤销五步后光标位置正确、粘贴外部 HTML 被清洗只保留合法节点、图片块删除可撤销、斜杠命令 Esc 可取消、块拖拽后 id 不变（引用不断）、10 万字符文档输入不卡（每键 < 16ms）、导出 JSON 可重新加载无损。
4. **第 5–6 周**：接进自己的低代码平台做"富文本物料"，或接 B1 做双人协同（进阶方向）。

#### A1.8 常见坑

- **受控思维反噬**：把编辑器内容放进 React state，每键 `setHTML` 再灌回编辑器——光标必然跳、IME 必然丢。对策：编辑器内容非受控，React 只通过 `onUpdate` 单向取值；需要外部改内容时走 `editor.commands.setContent()`，绝不直接改 prop 回灌。
- **StrictMode 双挂载**：开发环境 effect 执行两次，EditorView 创建两次。`useEffect` 的 cleanup 正确 `destroy()` 即可无害通过；反之会出现"两个编辑器叠加、输入错乱"。
- **SSR 直崩**：EditorView/TipTap 都依赖真实 DOM，服务端渲染需 `immediatelyRender: false`（TipTap）或动态 import。
- **粘贴即 XSS**：直接把粘贴的 HTML 插入文档，`<img onerror>` 一类 payload 直接进模型。对策：所有外来 HTML 先过 `DOMParser.fromSchema(schema).parseSlice`——Schema 之外的标签和属性在解析层被丢弃，白名单清洗是唯一正确姿势。
- **大文档全量序列化**：每键 `getHTML()` 存库 = O(全文档) 序列化，大文档必卡。对策：按事务粒度持久化（或 debounce 保存 + 保存时才序列化）。
- **移动端软键盘**：contentEditable 在移动端的工具栏行为、选区手柄各浏览器差异更大，测试矩阵要单列 iOS Safari。

### A2. 电子表格（★★★★★）

- **画像**：Excel/飞书表格，前端复杂度天花板之一
- **核心技术**：二维虚拟滚动（行列双 windowing）、单元格渲染选型（DOM vs Canvas 自绘）、**公式引擎**（单元格依赖图 + 拓扑排序 + 循环引用检测，可 study HyperFormula/Univer 源码）、选区/框选/填充柄/冻结行列、剪贴板与 Excel 互操作（TSV + HTML 双格式）、条件格式、协同（接 B 族）
- **入手**：先做"虚拟滚动 + 单元格编辑"的最小表格，再引入公式依赖图

#### A2.1 是什么：画像

电子表格就是"网页版 Excel"：10 万行 × 200 列的网格、双击编辑单元格、输入 `=A1+B1*2` 出计算结果、框选一片区域拖填充柄批量复制公式、冻结首行首列滚动时表头不动、与真 Excel 互相复制粘贴不丢格式。它是前端复杂度的天花板之一，因为它是唯一一个"同时"要求下列全部能力的场景：二维虚拟化、每格可编辑、内嵌一门公式语言、与桌面软件互操作。

#### A2.2 为什么难：难点本质

本质一句话：**表格是"每格都是一个微型编辑器 × 一格一门的公式语言 × 一整张图的依赖网络"的乘积。**拆开看四个相乘的因子：(1) 规模——百万格的渲染与滚动，逼你放弃 DOM 常规做法；(2) 交互密度——单击选中、双击编辑、拖框选、拉填充柄、右键菜单，一屏之内五套手势状态机；(3) 计算——公式之间互相引用，改一格要按正确顺序重算所有受影响的格子；(4) 互操作——Excel 的剪贴板里同时放着纯文本与富表格两种格式，接不住就是"粘贴全乱"。四个因子两两相乘，难度以平方增长——这就是 ★★★★★ 的由来。

#### A2.3 核心技术一：二维虚拟滚动（行列双 windowing）

是什么：只渲染"可视区 + overscan"内的行列，其余由两个占位尺寸撑出滚动条。为什么需要：10 万行 × 200 列 = 2000 万个潜在 DOM 节点，直接渲染浏览器直接死；即便每格只是一个 `div`，也只能承受几千个。怎么做（机制分步）：(1) 外层滚动容器监听 `scrollTop/scrollLeft`；(2) 由滚动量推算可视行列区间 `[row0, row1] × [col0, col1]`，前后各多算 OVERSCAN 行/列防露白；(3) 内层放一个"总尺寸"的占位块（`ROWS*ROW_H` 高、`COLS*COL_W` 宽）骗出原生滚动条；(4) 可视单元格绝对定位到 `top: row*ROW_H, left: col*COL_W`。

```tsx
// sheet.tsx —— 定宽定高的最小二维虚拟表格（自包含可跑）
import { useMemo, useState } from 'react'

const ROWS = 100_000, COLS = 500
const ROW_H = 28, COL_W = 100
const VIEW_W = 800, VIEW_H = 500
const OVERSCAN = 3 // 缓冲区：滚动瞬间不露白

// 26 进制列名：0→A, 25→Z, 26→AA（与 Excel 一致，公式引用要用）
function colName(c: number): string {
  let s = ''
  c += 1
  while (c > 0) { s = String.fromCharCode(65 + ((c - 1) % 26)) + s; c = Math.floor((c - 1) / 26) }
  return s
}

export function Sheet() {
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [editing, setEditing] = useState<{ row: number; col: number; draft: string } | null>(null)

  // ① 窗口计算：滚动量 → 可视行列区间。这是虚拟滚动的全部核心，5 行
  const win = useMemo(() => {
    const row0 = Math.max(0, Math.floor(scroll.top / ROW_H) - OVERSCAN)
    const col0 = Math.max(0, Math.floor(scroll.left / COL_W) - OVERSCAN)
    const row1 = Math.min(ROWS, Math.ceil((scroll.top + VIEW_H) / ROW_H) + OVERSCAN)
    const col1 = Math.min(COLS, Math.ceil((scroll.left + VIEW_W) / COL_W) + OVERSCAN)
    return { row0, col0, row1, col1 }
  }, [scroll])

  // ② 生成可视单元格坐标（渲染层只认这个数组，与数据存储解耦）
  const visible = useMemo(() => {
    const out: { row: number; col: number }[] = []
    for (let r = win.row0; r < win.row1; r++)
      for (let c = win.col0; c < win.col1; c++) out.push({ row: r, col: c })
    return out
  }, [win])

  return (
    <div
      style={{ width: VIEW_W, height: VIEW_H, overflow: 'auto', position: 'relative' }}
      onScroll={(e) =>
        setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })
      }
    >
      {/* ③ 占位块：撑出总尺寸，骗出滚动条 */}
      <div style={{ width: COLS * COL_W, height: ROWS * ROW_H, position: 'relative' }}>
        {visible.map(({ row, col }) => {
          const key = `${colName(col)}${row + 1}` // A1 风格的坐标名
          const isEditing = editing && editing.row === row && editing.col === col
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: row * ROW_H, left: col * COL_W, width: COL_W, height: ROW_H,
                borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                padding: '0 6px', lineHeight: `${ROW_H}px`, fontSize: 13,
              }}
              onDoubleClick={() => setEditing({ row, col, draft: '' })}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editing!.draft}
                  onChange={(e) => setEditing({ ...editing!, draft: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                  style={{ width: '100%', height: ROW_H - 4, border: '2px solid #3b82f6' }}
                />
              ) : (
                key // demo：先显示坐标名；接上公式引擎后这里显示计算值
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

进阶两步（此 demo 未含，是练习点）：**动高行**——行高不一时要"行高前缀和数组 + 二分查找"定位 `scrollTop` 对应行；**冻结行列**——把视口拆成左上（固定）/ 左侧冻结列 / 顶部冻结行 / 主滚动区四个区域，共享同一套窗口计算但各自渲染。

#### A2.4 核心技术二：单元格渲染选型（DOM vs Canvas 自绘）

是什么：把"画格子"这件事在 DOM 与 Canvas 之间做选择，或分层混用。为什么需要选择：两条路线各有天花板——DOM 路线交互免费（点击、选中、无障碍全送），但 5000+ 节点滚动就掉帧；Canvas 路线性能无上限（一帧画完几万格），但点击命中、文本编辑、IME 全要自己造。

选型决策表：

| 路线 | 承受规模 | 交互成本 | 适用 |
|---|---|---|---|
| DOM + 虚拟化 | 数千可视格内 | 极低（原生） | 中小表格、快速起步（上面 demo 就是） |
| Canvas 自绘 | 数万~数百万格 | 极高（全手工） | 大数据表、专业电子表格 |
| 混合分层 | 大 | 中 | 主网格 Canvas，编辑浮层/选区框用 DOM 定位覆盖 |

混合分层是成熟产品的主流（含飞书表格类产品）：网格线、文字、背景色全画在 Canvas；编辑中的那个单元格上面叠一个真 `<input>`（这样 IME、光标、选区全是浏览器原生，躲开 A1 全套坑）；选区框、填充柄也用 DOM 绝对定位覆盖层，拖拽手势好写。Canvas 侧唯一新增的功课是**文本排版手工化**：`ctx.fillText` 不会帮你截断溢出、不会做省略号、对齐基线，`measureText` 的结果是布局依据。

#### A2.5 核心技术三：公式引擎（依赖图 + 拓扑排序 + 循环引用检测）

这是 A2 的灵魂，也是原大纲加粗的部分。分四步讲：为什么需要图、怎么建图、怎么排序、怎么检测环。

**为什么需要依赖图**：改了 `A1`，所有引用 `A1` 的格子（直接和间接）都要重算。暴力做法是全表重算——100 万格每次按键全算一遍，不可行。正确做法：从公式里提取"我引用了谁"（前驱），建成一张**单元格依赖图**，改动时只沿图传播重算。

**为什么需要拓扑排序**：`C1 = B1 + 1`，`B1 = A1 * 2`——必须先算 B1 再算 C1。拓扑排序把所有受影响格子排成"被依赖者在前"的线性顺序，照单重算即可。算法用 Kahn（入度剥洋葱）：反复取出"入度为 0"（不再依赖未算完的格子）的节点计算，计算完成后给它的下游减入度。

**为什么需要环检测**：用户输入 `A1 = B1`、`B1 = A1`，两格互指，重算永远排不完。Kahn 算法天然带检测：如果剥完洋葱还有节点没被取出（入度始终 > 0），这些节点必在环上——把它们标为循环引用错误，其余照常计算，**一个环不能污染整张表**。

```ts
// formula.ts —— 教学版公式引擎：建图 + 拓扑排序 + 环检测 + 求值
// 说明：正则抽引用是教学简化；生产实现必须在完整 parser 的 AST 上收集引用，
// 否则字符串字面量 "A1" 会被误当引用。HyperFormula/Univer 即如此。
type Cell = { raw: string; value: number | string }
type Cells = Map<string, Cell> // key 形如 "A1"

const REF = /\$?([A-Z]{1,3})\$?(\d{1,7})/g // 命中 A1 / $B$2 / C$3

// ── 1. 建图：解析每个公式，收集它引用的前驱格子 ──
function buildGraph(cells: Cells): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>()
  for (const [key, cell] of cells) {
    const deps = new Set<string>()
    if (cell.raw.startsWith('=')) {
      for (const m of cell.raw.matchAll(REF)) {
        const dep = `${m[1]}${m[2]}` // 去掉 $ 绝对引用符号后归一化
        if (dep !== key) deps.add(dep) // 自引用（A1 里写 =A1）直接按环处理
      }
    }
    g.set(key, deps)
  }
  return g
}

// ── 2. Kahn 拓扑排序（含环检测）：返回 { 顺序, 环上节点 } ──
function topoSort(g: Map<string, Set<string>>) {
  const inDeg = new Map<string, number>()       // 节点剩余入度
  const successors = new Map<string, Set<string>>() // 前驱 → 后继（反向边，用于传播）
  for (const [k, deps] of g) {
    inDeg.set(k, deps.size)
    for (const d of deps) {
      if (!successors.has(d)) successors.set(d, new Set())
      successors.get(d)!.add(k)
    }
  }
  const queue = [...inDeg].filter(([, d]) => d === 0).map(([k]) => k)
  const order: string[] = []
  while (queue.length) {
    const k = queue.shift()!
    order.push(k)                                 // 入度归零：它依赖的都算完了
    for (const s of successors.get(k) ?? []) {
      const left = inDeg.get(s)! - 1
      inDeg.set(s, left)
      if (left === 0) queue.push(s)
    }
  }
  // 剥不完的就是环：还留着入度的节点必然互相等待
  const cyclic = [...inDeg.keys()].filter((k) => inDeg.get(k)! > 0)
  return { order, cyclic }
}

// ── 3. 求值：按拓扑序逐格计算（教学版用受限 eval；生产用 AST 解释器）──
function evalCell(key: string, cells: Cells) {
  const cell = cells.get(key)!
  if (!cell.raw.startsWith('=')) {
    cell.value = cell.raw === '' ? 0 : Number(cell.raw) || cell.raw
    return
  }
  const expr = cell.raw.slice(1).replace(REF, (_, c: string, r: string) => {
    const v = cells.get(`${c}${r}`)?.value // 引用替换为"已算好的"值
    return typeof v === 'number' ? String(v) : '0'
  })
  try {
    cell.value = Function(`"use strict";return (${expr})`)() // 教学专用，生产禁止
  } catch {
    cell.value = '#ERROR!'
  }
}

// ── 4. 重算入口：改任何格子后调用 ──
export function recompute(cells: Cells): string[] {
  const g = buildGraph(cells)
  const { order, cyclic } = topoSort(g)
  for (const k of cyclic) cells.get(k)!.value = '#CIRCULAR!' // 环上的格子标错，不阻塞他人
  for (const k of order) evalCell(k, cells)
  return cyclic
}

// 用法示例：
// const cells: Cells = new Map([
//   ['A1', { raw: '10', value: 0 }],
//   ['B1', { raw: '=A1*2', value: 0 }],
//   ['C1', { raw: '=B1+A1', value: 0 }],
// ])
// recompute(cells) → C1 = 30；若加入 ['D1',{raw:'=D1+1',...}]，D1 = #CIRCULAR!
```

这份 80 行代码就是 HyperFormula/Univer 的骨架。study 源码时带着四个问题去：(1) 它们的 parser 怎么产出 AST、引用如何在 AST 上收集（答案决定了字符串 `"A1"` 不会被误判）；(2) 引擎如何缓存"变更集"做增量重算（上面是全图重排，工程上要按脏集传播）；(3) 插入/删除行列时引用如何平移（`A1:A10` 在第 5 行前插入行后应变 `A1:A11`——range 变换是表格特有的一座山）；(4) 500+ 内置函数如何注册分发（HyperFormula 用注册表模式，与你的低代码物料注册同构）。

```bash
# 引入成熟引擎（而非自研生产版）：
npm install hyperformula
# 注意 license：GPLv3 开源 / 商业双轨，商用前读授权条款。Univer（Apache-2.0）是替代项。
```

#### A2.6 核心技术四：选区、框选、填充柄、冻结行列

- **选区模型**：是什么——用 `(anchor, focus)` 两个格子坐标表达选区（鼠标按下处为 anchor，拖到处为 focus），矩形 = 两点的 min/max 包络。为什么不用"矩形四值"——Shift+点击扩展选区、Shift+方向键扩格时，anchor 不动 focus 动，两点模型天然支持，四值模型要额外记"扩展方向"。选区是游离于单元格数据之外的交互状态（与 A1 的 selection 同理）。
- **框选手势状态机**：`idle → pressing(记录 anchor) → dragging(focus 跟随 mousemove) → selected(mouseup 定格)`；拖动中要处理"拖出可视区自动滚动"（定时器按边缘距离加速滚动）与"跨过冻结区"的坐标换算。
- **填充柄**：是什么——选区右下角的小方块，拖动它把内容/公式向拖动方向复制 N 格。难点在**相对引用平移**：`B2 = A1*2` 拖到 B3 时公式应变 `A2*2`（相对引用随位移平移），`$A$1`（绝对引用）不变、`$A1`（混合引用）列锁行不锁。实现：复制公式时对每个引用按 (Δrow, Δcol) 平移非锁定分量——这正是 R1C1 表示法（`R[-1]C[-1]`）存在的原因：R1C1 下相对引用在平移前后字面不变。
- **冻结行列**：视口拆四象限（冻结区行/列交叉、冻结行、冻结列、滚动主体），共享滚动状态但冻结区反向钉住。实现要点是三个容器同一套窗口计算参数，只差 `position: sticky` 或独立渲染分支。

#### A2.7 核心技术五：剪贴板与 Excel 互操作（TSV + HTML 双格式）

是什么：从网页表格复制，粘贴进 Excel 要有行列表格；从 Excel 复制，粘贴回网页要带格式。机制：Excel 复制时在剪贴板同时放下 `text/plain`（TSV：Tab 分列、换行分行）与 `text/html`（带样式的 `<table>`）两种格式；粘贴方按能力取用。网页侧实现双写：

```ts
// 复制：同一份数据写两种格式，接收方按能力取最优
export function copySelection(rows: string[][]) {
  const tsv = rows.map((r) => r.join('\t')).join('\n') // Excel 兜底能认的纯文本
  const html = `<table>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</table>`
  navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([tsv], { type: 'text/plain' }),
    }),
  ])
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))
}

// 粘贴：优先取 text/html（保格式），无则降级 text/plain 按 TSV 切分
export async function pasteFromClipboard(): Promise<string[][]> {
  const items = await navigator.clipboard.read()
  const item = items[0]
  if (item.types.includes('text/html')) {
    const blob = await item.getType('text/html')
    const doc = new DOMParser().parseFromString(await blob.text(), 'text/html')
    return [...doc.querySelectorAll('tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent ?? '')
    )
  }
  const text = await (await item.getType('text/plain')).text()
  return text.split('\n').map((line) => line.split('\t'))
}
```

条件格式（规则引擎：值 → 样式映射，随重算刷新）与协同（接 B1，Yjs 有官方表格示例）在此不展开，思路与前面章节同构。

#### A2.8 代表产品及其可学的点

- **Excel/飞书表格**：交互标杆。可学：手势状态机的完备性（框选与拖动的冲突消解、双击进入编辑的时机）、填充柄对用户心智的顺应。
- **HyperFormula（HANDSONTABLE 出品）**：公式引擎开源实现，500+ 函数。可学：上述四问——AST 引用收集、增量重算、range 平移、函数注册表。
- **Univer（dream-num 出品）**：TS 实现的全套表格/文档/幻灯。可学：sheet 的整体架构分层（内核/渲染/交互/UI 四层怎么切）、Canvas 与 DOM 混合渲染的工程化。

#### A2.9 入手路径与验收物

按原大纲："先做'虚拟滚动 + 单元格编辑'的最小表格，再引入公式依赖图"。

1. **第一步（第 1 周）**：跑通 A2.3 的二维虚拟滚动 demo，补上"单击选中单格 + Shift 扩展 + 双击编辑 + Enter 下移一格"。验收物：10 万行滚动帧率稳定、编辑回车后焦点自动落到下一格。
2. **第二步（第 2 周）**：实现 A2.5 公式引擎（建图/拓扑/环检测/求值四函数），接到表格：单元格显示计算值、`#CIRCULAR!` 红字。验收物：构造三层依赖链改源头，下游按序刷新；构造 A1↔B1 互引环，两格标错但表内其他公式照常。
3. **第三步（第 3–4 周）**：填充柄（相对引用平移）+ 冻结首行首列 + TSV/HTML 双格式剪贴板。验收物：网页表格与 Excel 互贴往返各一次格式不丢。
4. **第 5–6 周（进阶）**：把 DOM 渲染换成 Canvas 主网格 + DOM 编辑浮层，或接 HyperFormula 替换自研引擎并对比行为。

#### A2.10 常见坑

- **编辑态单元格被虚拟化卸载**：正在编辑的格子滚出 overscan 区，input 连同草稿一起被卸载。对策：编辑态强制纳入渲染窗口（窗口计算时合并 `editing` 坐标），或编辑浮层独立于虚拟层。
- **插入/删除行后公式错位**：第 5 行前删一行，`B10 = A10` 若不变平移就指错数据。对策：所有引用按位移平移、range 按区间收缩/扩张，引用转换必须有专门模块与完整测试表（这是公式引擎里测试量最大的部分）。
- **只写 `text/plain` 丢格式**：粘贴到 Excel 全挤一列。对策：双格式双写（A2.7）。
- **全图重排卡死**：每键全量建图+排序，千格以上明显卡。对策：缓存图结构、变更只从脏格子沿后继边传播（Kahn 只在结构变化时跑）。
- **单击/双击/框选手势打架**：单击触发选中、快速两次单击又该进入编辑，状态机不严谨会出现"双击变成框选起点"。对策：手势用单一状态机管理（press → click / dblclick / drag 三分支），别用三个独立事件监听各自为政。
- **行高前缀和漂移**：动高行的前缀和用浮点累加，几万行后误差累积导致滚动错位。对策：前缀和取整存储，或增量校正。

### A3. 画布 / 白板编辑器（★★★★☆）

- **画像**：Figma/Excalidraw/海报编辑器/流程图
- **核心技术**：渲染选型（SVG 交互易 vs Canvas 性能强 vs 分层混合）、**坐标变换**（世界坐标↔屏幕坐标、zoom/pan 矩阵）、命中检测（几何计算 + R-tree 空间索引）、框选/多选/对齐吸附（吸附线算法）、组合成组、命令栈 undo/redo、脏矩形与分层渲染、导出（PNG/SVG）
- **代表**：Figma、Excalidraw、ProcessOn、稿定设计
- **入手**：用原生 Canvas 或 react-konva 做一个支持画矩形/选中/拖动/缩放画布的白板

#### A3.1 是什么：画像

白板编辑器是"无限画布 + 图形对象"的编辑工具：画矩形/椭圆/箭头/文字，选中它们拖动、缩放、旋转，画布本身可以无限平移缩放，多选对齐吸附，编组解组，Ctrl+Z 撤销，最后导出 PNG/SVG。Figma（设计工具）、Excalidraw（手绘风白板）、ProcessOn（流程图）、稿定设计（海报编辑器）是四个形态变体，内核完全一致。

#### A3.2 为什么难：难点本质

本质一句话：**白板把"屏幕上的像素"与"文档里的图形"解耦成两个坐标系，你的每一行交互代码都在两个坐标系之间穿梭，任何一处忘了变换就是 bug。**加之图形数量上千后，"每次重绘全量重画"和"每次命中遍历全表"都不可行，必须引入脏矩形与空间索引。A3 的难是数学的难（矩阵、几何）+ 数据结构的难（R-tree）+ 渲染工程的难（分层），三块都不难在 API。

#### A3.3 核心技术一：渲染选型（SVG vs Canvas vs 分层混合）

| 方案 | 交互 | 性能 | 适用 |
|---|---|---|---|
| SVG | 事件/无障碍/选中样式原生免费，DOM 可调试 | 千级元素后 DOM 布局重 | 流程图、<1000 图形 |
| Canvas | 全手工（命中检测自造） | 数万~数十万图元 | 白板、海报、Figma 类 |
| 分层混合 | 各层各取所长 | 最优 | 成熟产品标配 |

分层混合的做法：多个叠放的 canvas 各司其职——底层静态网格（几乎不重绘）、中层图形内容（脏矩形局部重绘）、顶层交互反馈（选区框、吸附线、拖拽幽灵），交互时只重绘顶层，内容层不动。react-konva 是 Canvas 上的声明式封装（Stage/Layer/Rect 组件化，内置命中检测与 Transformer 变换手柄），起步用它可以把精力先集中在坐标变换；原生 Canvas 则一切自主，练习价值最大。

#### A3.4 核心技术二：坐标变换（世界坐标 ↔ 屏幕坐标，zoom/pan 矩阵）

**是什么**：图形的 x/y 存在"世界坐标系"（无限大、原点任意），屏幕只是这个世界经"缩放 + 平移"后的一个取景框。视口状态用三元组 `(scale, panX, panY)` 表达。

**为什么需要**：没有这层抽象，"放大后拖动图形""缩放画布后框选"全都算不对——事件给你的是屏幕像素，图形存的是世界坐标，两边必须换算。

**怎么做（机制与公式）**：

世界 → 屏幕（渲染时用，即 2D 仿射矩阵 `M = T(pan) · S(scale)` 的展开）：

```text
screenX = worldX · scale + panX
screenY = worldY · scale + panY

矩阵形式（canvas 的 setTransform(a,b,c,d,e,f) 即此矩阵）：
┌ screenX ┐   ┌ scale   0    panX ┐ ┌ worldX ┐
│ screenY │ = │  0    scale  panY │ │ worldY │
└   1    ┘   └   0      0     1  ┘ └   1   ┘
```

屏幕 → 世界（命中检测时用，即逆矩阵 `M⁻¹ = S(1/scale) · T(-pan)`）：

```text
worldX = (screenX − panX) / scale
worldY = (screenY − panY) / scale
```

**以鼠标为锚缩放**（最难也最常用的一条）：滚轮缩放时，鼠标指向的那个世界点在缩放前后必须钉在原地，否则图形"从手下跑掉"。设鼠标屏幕坐标 p、原视口 v、新缩放比 scale'：

```text
k = scale' / scale
panX' = p.x − (p.x − panX) · k
panY' = p.y − (p.y − panY) · k
```

```ts
// viewport.ts —— 视口三函数：全部坐标变换就这三个
export type Viewport = { scale: number; panX: number; panY: number }
export type Pt = { x: number; y: number }

export function worldToScreen(p: Pt, v: Viewport): Pt {
  return { x: p.x * v.scale + v.panX, y: p.y * v.scale + v.panY }
}
export function screenToWorld(p: Pt, v: Viewport): Pt {
  return { x: (p.x - v.panX) / v.scale, y: (p.y - v.panY) / v.scale }
}
// 滚轮缩放：保持锚点下的世界点不动
export function zoomAt(p: Pt, v: Viewport, nextScale: number): Viewport {
  const k = nextScale / v.scale
  return {
    scale: nextScale,
    panX: p.x - (p.x - v.panX) * k,
    panY: p.y - (p.y - v.panY) * k,
  }
}
```

渲染时利用 canvas 的矩阵能力，可以"设置一次变换、全程按世界坐标作画"（连 dpr 一并处理）：

```ts
// 渲染骨架：dpr 处理 + 视口矩阵，之后所有 drawXxx 都直接用世界坐标
function applyViewport(ctx: CanvasRenderingContext2D, v: Viewport) {
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)       // 先抵消高分屏缩放
  ctx.translate(v.panX, v.panY)                // 再平移
  ctx.scale(v.scale, v.scale)                  // 最后缩放
  // 等价于 setTransform(dpr*v.scale, 0, 0, dpr*v.scale, dpr*v.panX, dpr*v.panY)
}
```

#### A3.5 核心技术三：命中检测（几何计算 + R-tree 空间索引）

**是什么**：给定世界坐标点 p，找出它落在哪些图形上；给定期望误差（线宽容差），找出"点中了哪条线"。

**为什么需要**：Canvas 没有 DOM 事件，点击/悬停/框选全靠自算；几百个图形时暴力遍历尚可，上万个时每次 mousemove 全表检测必然掉帧。

**怎么做（几何判定，逐形状）**：

```text
矩形（轴对齐，世界坐标）：x ∈ [rx, rx+w] 且 y ∈ [ry, ry+h]
矩形（旋转 θ）：先把点逆旋转回图形局部系再按轴对齐判定
椭圆：((px−cx)/rx)² + ((py−cy)/ry)² ≤ 1
线段（含容差 tol）：点到线段距离 ≤ tol（见下方代码）
多边形：射线法（见下方代码）
```

```ts
// hit.ts —— 三种基础命中检测
export type Pt = { x: number; y: number }

// 图形的最小接口：外包盒 + 自命中 + 平移（拖动 / 命令栈都要用）
export interface Shape {
  id: string
  x: number; y: number; w: number; h: number // 外包盒（世界坐标）
  hit(p: Pt, tol: number): boolean           // 精确命中（各自形状自己判）
  translate(dx: number, dy: number): void    // 平移（命令的 do/undo 依赖它）
}

// 点到线段距离：先投影求最近点，再算欧氏距离（不能只算到直线的距离！）
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  // t 是投影参数，clamp 到 [0,1] 把"垂足"限制在线段内
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  const closest = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.hypot(p.x - closest.x, p.y - closest.y)
}

// 射线法判断点在多边形内：水平射线与多边形边界交点数为奇数则在内
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].y, yj = poly[j].y
    if ((yi > p.y) !== (yj > p.y) &&                       // 边跨越了射线高度
        p.x < ((poly[j].x - poly[i].x) * (p.y - yi)) / (yj - yi) + poly[i].x) {
      inside = !inside                                     // 交点计数翻转
    }
  }
  return inside
}

// 从后往前找命中（后绘制者在上，先命中）
export function hitTest(p: Pt, shapes: Shape[], tol: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapes[i].hit(p, tol)) return shapes[i]
  }
  return null
}
```

**R-tree 空间索引**：图形上万时，先外包盒（bounding box）粗筛再做精确几何判定。R-tree 把外包盒组织成分层区域，查询复杂度从 O(n) 降到近似 O(log n)：

```ts
// 空间索引：rbush（多数白板/地图项目的选择）
import RBush from 'rbush'

type ShapeBBox = { id: string; minX: number; minY: number; maxX: number; maxY: number } // rbush 约定四字段

// Shape 的外包盒 → rbush 记录（rbush 只认 minX/minY/maxX/maxY 四字段）
function toBBox(s: Shape): ShapeBBox {
  return { id: s.id, minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h }
}

const index = new RBush<ShapeBBox>()
// 初始/大变更：load 批量构建（比逐条 insert 快得多）
index.load(shapes.map(toBBox))
// 单图形移动：remove 旧 + insert 新（rbush 无原地更新）
function onShapeMoved(s: ShapeBBox) {
  index.remove(s)          // 按对象引用移除
  index.insert(updated(s)) // 插入新 bbox
}
// 命中查询：先取候选集（几个），再逐个精确几何判定
const candidates = index.search({ minX: x - 4, minY: y - 4, maxX: x + 4, maxY: y + 4 })
const hit = candidates.length ? preciseHitTest(worldPt, candidates) : null
// 框选查询：选区矩形与外包盒相交的全部图形
const inMarquee = index.search({ minX, minY, maxX, maxY })
```

#### A3.6 核心技术四：框选、多选、对齐吸附、成组

- **框选**：拖出虚线矩形（交互顶层画布），`index.search(矩形)` 相交即选中；按住 Shift 追加。吸附线算法：拖动中的图形实时与"其他图形的 6 条参考线"（左/中/右 x 值，上/中/下 y 值）比较，差值小于 ε（如 6/scale——注意容差要除以 scale，换算到世界坐标）就吸附并画出洋红色辅助线。
- **多选与对齐**：多选集合的公共外包盒做对齐/分布（左对齐 = 各图形 x 置为集合 minX）；每个对齐操作是一个命令（见下）。
- **组合成组**：组是"变换的容器"——子图形坐标存为相对父级的局部系，组自带平移/旋转/缩放矩阵，组变换作用时全部子图形跟随。这与 A3.4 的视口矩阵同构（局部系 → 父系 → 世界系的矩阵连乘），理解了视口变换，成组就是把它嵌套一层。

#### A3.7 核心技术五：命令栈 undo/redo、脏矩形与分层渲染、导出

**命令栈**（前一份大纲 §1.5 讲过三种实现，白板最适合"命令模式"——每个操作带 do/undo 逆操作）：

```ts
// history.ts —— 命令模式的最小实现：所有编辑操作先包成 Command 再执行
export interface Command {
  label: string
  do(): void
  undo(): void
}
export class History {
  private done: Command[] = []
  private undone: Command[] = []
  exec(cmd: Command) {
    cmd.do()
    this.done.push(cmd)   // 新操作清空重做栈（线性历史，不可分叉）
    this.undone = []
  }
  undo() { const c = this.done.pop(); c?.undo(); if (c) this.undone.push(c) }
  redo() { const c = this.undone.pop(); c?.do(); if (c) this.done.push(c) }
}

// 拖动一个矩形的命令：undo 就是移回原位
function makeMoveCmd(shape: Shape, dx: number, dy: number): Command {
  return {
    label: 'move',
    do: () => shape.translate(dx, dy),
    undo: () => shape.translate(-dx, -dy),
  }
}
```

**脏矩形与分层渲染**：图形改动只标记自己外包盒为脏，下一帧只 `clearRect` 脏区域并重绘与脏区相交的图形；交互反馈（选框、吸附线）放独立顶层画布，拖拽全程不碰内容层。两招叠加，千级图形的拖动帧率立稳。

**导出**：PNG——按内容外包盒尺寸（×2 抗糊）建离屏 canvas，设视口矩阵后复用同一套渲染函数重绘，`canvas.toBlob` 落盘；SVG——遍历图形树生成 `<svg>` 标记（或 `XMLSerializer` 序列化既有 SVG 层），注意字体内联（未内联的字体在别人机器上会退化为默认字体）。

#### A3.8 代表产品及其可学的点

- **Figma**：天花板。可学：渲染管线的取舍（C++/WASM 渲染 + WebGL）、多选/编组/约束系统的交互设计、协同光标与编辑器的结合（B1）。
- **Excalidraw**：开源白板最佳学习对象。可学：手绘风线条生成（rough.js）、元素模型与场景序列化、Canvas 分层实践、本地优先存储。
- **ProcessOn / 稿定设计**：垂类变体。可学：流程图的连线正交路由（A4 也会遇到）、海报编辑器的模板化（与低代码 schema 思想相通）。

#### A3.9 入手路径与验收物

第一步（原大纲）：用原生 Canvas 或 react-konva 做一个白板，验收物按能力递进：(1) 画矩形（工具栏切到矩形工具，拖拽画出）；(2) 选中拖动（点击命中已有矩形，拖动跟随，用 A3.5 的命中检测）；(3) 缩放画布（滚轮 zoomAt 锚点缩放 + 空格拖拽平移）；(4) 命令栈撤销（Ctrl+Z 撤销画矩形与拖动）。DoD：缩放 400% 后拖动图形不跳位（逆变换正确）、500 个矩形拖动 60fps、连续撤销 10 步画面与初态一致、导出 PNG 与视口所见一致。第 3–4 周再加：椭圆/箭头/文字、框选多选、对齐吸附、编组、R-tree 索引（构造 1 万图形对比有无索引的命中耗时）。

#### A3.10 常见坑

- **高分屏发糊**：canvas 的 `width/height`（物理像素）没乘 `devicePixelRatio`，只设了 CSS 尺寸。对策：`canvas.width = cssW * dpr` 并在矩阵里乘 dpr（A3.4 骨架已含）。
- **缩放后命中错位**：命中检测忘了先把鼠标坐标 `screenToWorld`，拿着屏幕坐标去比世界坐标。症状是"放大后点不中/点错"。
- **容差没除 scale**：线宽容差 4px 在 400% 缩放下应为世界系 1px，写死 4 世界单位后放大后"点线太灵敏"。
- **getBoundingClientRect 坐标混用**：canvas 有 border/padding 时 `clientX - rect.left` 不等于画布内坐标。对策：布局归零（canvas 不设 border）或在换算时统一减去偏移。
- **全量重绘**：每次 mousemove 重画所有图形，千级即卡。对策：脏矩形 + 分层（A3.7）。
- **导出 SVG 字体走样**：没内联字体文件。对策：导出前把用到的字体 base64 进 `<style>`，或提示用户导出 PNG。

### A4. 节点编排画布（★★★☆☆）

- **画像**：n8n/Dify 式工作流，AI 时代的当红场景
- **核心技术**：@xyflow/react（React Flow）：自定义节点/边、连线规则校验（类型约束）、自动布局（dagre/ELK）、小地图、缩放平移、**运行态可视化**（节点状态流转、流式高亮）、变量面板
- **入手**：做一个"输入→处理→输出"三节点工作流，带校验与运行态

#### A4.1 是什么：画像

节点编排画布就是 n8n、Dify、Coze 的工作流编辑页：画布上摆节点，节点带输入输出锚点（Handle），从锚点拉线连接成有向流程图，画布可缩放平移，配小地图，点"运行"后节点按执行顺序依次点亮。它是 A3 的几何内核 + React Flow 的工程化封装 + 业务语义（节点类型系统、连线校验、运行态）的三层产物。AI 时代它成了当红场景——每个 LLM 应用编排平台（Dify/Coze/LangFlow）的编辑器都是它。

#### A4.2 为什么难：难点本质

A4 本体只有 ★★★☆☆——React Flow 把 A3 的坐标变换、命中、框选、缩放全部封装掉了，你不再手写矩阵。它的难在两处业务侧：一是**约束系统**（什么节点能连什么节点：类型匹配、禁止自环、禁止成环、只能一进多出……连线规则的校验与提示），二是**运行态可视化**（Agent 运行时节点状态高频变化——排队/执行中/成功/失败 + 流式 token 数滚动——`setNodes` 风暴下的性能与正确性）。前者是图论小题，后者是 React 性能题（正是 React 相关度①层的原因）。

#### A4.3 核心技术一：React Flow（@xyflow/react）的节点 / 边 / 自动布局

**数据模型**：节点 `{ id, type, position, data }`、边 `{ id, source, target, sourceHandle?, targetHandle? }`。两个数组是受控状态——React Flow 不藏状态，一切增删改经你之手（`onNodesChange` 回调 + `applyNodeChanges` 应用）。

**自定义节点**：注册式渲染（与前一份大纲的物料注册表同构）——`nodeTypes = { step: StepNode }` 传给 ReactFlow，节点数据里 `type: 'step'` 就用你的组件渲染；`Handle` 组件声明锚点（type=target 是入锚、source 是出锚）。

**自动布局**：dagre 把"节点 + 边"的图按层级（rank）排布——从入度 0 的节点起分层，同层上下排、层间左右排，消减边交叉。ELK 是更强的替代（支持更多约束）。布局结果是"每个节点一个中心坐标"，要转成 React Flow 要的左上角坐标。

一份完整可跑的讲解性代码（自定义节点 + 校验连线 + dagre 布局 + 运行态点亮）：

```tsx
// workflow.tsx —— 三节点工作流：布局 + 校验 + 运行态
import { useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

// ── 1. 自定义节点：状态描边色 + 左入右出两个锚点 ──
type StepStatus = 'idle' | 'running' | 'done' | 'error'
function StepNode({ data }: NodeProps) {
  const { label, status } = data as { label: string; status: StepStatus }
  const border = { idle: '#94a3b8', running: '#f59e0b', done: '#22c55e', error: '#ef4444' }[status]
  return (
    <div style={{ border: `2px solid ${border}`, borderRadius: 8, padding: '8px 14px', background: '#fff', minWidth: 120 }}>
      <Handle type="target" position={Position.Left} />   {/* 入锚点：别的边连到这里 */}
      <div>{label}</div>
      <Handle type="source" position={Position.Right} />   {/* 出锚点：从这里拉出边 */}
    </div>
  )
}
const nodeTypes = { step: StepNode } // 必须模块级常量：组件内重建 = 每帧重挂载所有节点

// ── 2. dagre 自动布局：图 → 有序坐标 ──
function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 }) // 从左到右；层间距 80
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 60 })) // 需要估宽高
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const { x, y } = g.node(n.id) // dagre 给的是中心点
    return { ...n, position: { x: x - 80, y: y - 30 } } // 转左上角
  })
}

const initialNodes: Node[] = [
  { id: 'input', type: 'step', position: { x: 0, y: 0 }, data: { label: '输入', status: 'idle' } },
  { id: 'process', type: 'step', position: { x: 0, y: 0 }, data: { label: '处理', status: 'idle' } },
  { id: 'output', type: 'step', position: { x: 0, y: 0 }, data: { label: '输出', status: 'idle' } },
]
const initialEdges: Edge[] = [
  { id: 'e1', source: 'input', target: 'process' },
  { id: 'e2', source: 'process', target: 'output' },
]

export default function Workflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes(initialNodes, initialEdges))
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // ── 3. 连线校验：拦截非法连接（isValidConnection 拖拽时实时反馈）──
  const isValidConnection = useCallback((c: Connection) => {
    if (c.source === c.target) return false                       // 禁自环
    // 禁成环：沿 target 的下游走，若能回到 source 则拒绝（DFS）
    const downstream = (id: string, seen = new Set<string>()): boolean => {
      if (id === c.source) return true
      if (seen.has(id)) return false
      seen.add(id)
      return edges.filter((e) => e.source === id).some((e) => downstream(e.target, seen))
    }
    return !downstream(c.target)
  }, [edges])

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge(c, eds)) // 校验通过（isValidConnection 已挡）才到这里
  }, [setEdges])

  // ── 4. 运行态可视化：按拓扑顺序依次 running → done ──
  const run = () => {
    const order = ['input', 'process', 'output']
    const setStatus = (id: string, status: StepStatus) =>
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)))
    order.forEach((id, i) => {
      setTimeout(() => {
        setStatus(id, 'running')
        setTimeout(() => setStatus(id, 'done'), 600)
      }, i * 800)
    })
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <button onClick={run} style={{ marginBottom: 8 }}>运行</button>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} isValidConnection={isValidConnection}
        nodeTypes={nodeTypes} fitView
      >
        <Background /> <Controls /> <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

**其余要点**：小地图（MiniMap）与缩放平移（Controls + 触控板手势）开箱即用；**变量面板**是 Dify 式产品的标配侧栏——展示"上游节点输出变量可被下游引用"，本质是把图执行后的产物做成树形选择器，复用 G 族的树组件。

#### A4.4 代表产品及其可学的点

- **n8n**：开源工作流自动化标杆。可学：节点类型系统的设计（trigger 普通节点/action/ 子流程）、几百种节点插件的注册机制（与 D1 插件化相通）。
- **Dify / Coze**：LLM 编排平台。可学：节点运行态与调试面板（单节点输入输出检视）、变量引用面板、版本对比。它们的编辑器正是本场景的完整答案，且 F2 会在此基础上讲流式更新调度。

#### A4.5 入手路径与验收物

按原大纲："做一个'输入→处理→输出'三节点工作流，带校验与运行态"。上面代码即第一周目标。验收物：三节点两连线，拖拽从 process 拉到 input 时连线被拒（成环校验生效）、点击运行后三节点依次点亮 amber → green、刷新页面布局不乱（dagre 结果持久化）。DoD：连线校验覆盖自环/成环/重复边三例；运行态轮播不重绘未变化节点（React DevTools Profiler 验证）。第二周起扩展：自定义边（带标签/条件分支）、ELK 布局对比、变量面板、接入 F2 的流式输出。

#### A4.6 常见坑

- **nodeTypes 写在组件内**：每次渲染新对象字面量，React Flow 视为"新节点类型"警告 + 全节点重挂载。对策：模块级常量或 `useMemo`。
- **受控不彻底**：只传 `nodes` 不传 `onNodesChange`/`applyNodeChanges`，节点拖不动或位置回弹。React Flow 是受控模型，两条回调缺一不可。
- **高频 setNodes 全量 map**：流式运行态每秒几十次 `nodes.map(...)` 生成全新数组，几百节点时每次 diff 全树。对策：状态更新用 requestAnimationFrame 合帧（一秒最多 N 次落账）；节点组件 `memo` 只依赖 `data`。
- **布局与手动拖动打架**：每次数据变化都重跑 dagre，用户手动摆的位置被覆盖。对策：只在用户点"自动整理"或结构变化时布局，位置持久化后尊重手动位置。
- **dagre 大图变慢**：上千节点布局秒级。对策：换 ELK 的分层布局并异步跑（Web Worker），或只布局受影响的子图。
- **边重叠不可读**：无约束的自由连线在大图上糊成一团。对策：dagre 消减交叉 + `type: 'smoothstep'` 正交边 + 边 label。

### A5. 在线代码编辑器 / 自研 DSL（★★★★☆）

- **画像**：Monaco/CodeMirror 深度定制（前一份大纲只覆盖了 JSON 场景）
- **核心技术**：自定义语言（Monarch tokenizer / CodeMirror 的 Lezer 语法）：高亮/补全/错误提示；LSP 进浏览器（monaco-languageclient）；多文件 Tab + 虚拟文件系统；TS Worker 类型提示
- **代表**：CodeSandbox、StackBlitz、JSON Schema 编辑器（你的第 5 章）
- **入手**：为自己的低代码协议写一个 DSL（高亮 + 补全 + 校验），反哺第 5 章 JSON 编辑器

#### A5.1 是什么：画像

Monaco（VSCode 同源编辑器）与 CodeMirror 6 的深度定制：给自己的领域语言做语法高亮、智能补全、实时错误提示；多文件 Tab 与虚拟文件系统；浏览器里跑 TS 类型检查。前一份大纲第 5 章已经用 `@monaco-editor/react` 做过 JSON 场景（JSON 自带语言支持，几乎零定制）；本场景更进一步——**自定义语言**，即你的低代码协议有自己的语法（或 JSON 方言），要让它像一门正经语言那样被编辑：高亮、补全、报错。

#### A5.2 为什么难：难点本质

本质一句话：**编辑器的语言能力是分层的（着色 → 语法树 → 语言服务），难点在于分层选对——想在着色层解决语义问题、或反过来用语言服务做高亮，都会掉进性能与复杂度的坑。**三层各自是什么、该放什么，是本场景的全部认知框架；此外多文件状态（model 生命周期）与 Worker 调度是工程难点。

#### A5.3 核心技术一：语言能力三层架构（Monarch / Lezer / LSP）

先把三层摆清楚（这是"分层"考点本身）：

| 层 | 是什么 | 做什么 | 不做什么 |
|---|---|---|---|
| 着色层：Monarch（Monaco）/ Lezer highlight（CodeMirror） | 正则状态机 / 增量语法树的样式标注 | 高亮、括号配对着色 | 不懂语义 |
| 语法层：Lezer（CodeMirror 6 的增量 parser） | 手写增量 LR 解析器 | 语法树、折叠范围、结构化导航 | 不做跨文件 |
| 语义层：LSP（Language Server Protocol） | 独立进程的语言服务，JSON-RPC 通信 | 补全/悬停/跳转/诊断/重命名 | 不关心编辑器是谁 |

**为什么分层**：着色必须每键全量快（正则/增量树，微秒级），语义必须慢而准（类型系统，百毫秒级）——两种性能曲线只能分层。企图在 keypress 路径上跑类型检查，输入即卡死。

**Monarch**（Monaco 的声明式 tokenizer）：一组"状态 → 正则规则 → token 类型"的表。给低代码协议的 JSON 方言做高亮：

```ts
// monach-lang.ts —— Monarch：给低代码协议 JSON 方言的着色规则
import * as monaco from 'monaco-editor'

monaco.languages.register({ id: 'lowcode' })

monaco.languages.setMonarchTokensProvider('lowcode', {
  tokenizer: {
    root: [
      // 协议关键字段名（后跟冒号的字符串）单独着色，一眼看出结构字段
      [/"(component|props|children|events|bind|if|for)"(?=\s*:)/, 'type.identifier'],
      [/"(?:[^"\\]|\\.)*"/, 'string'],                 // 普通字符串（含转义）
      [/\b(?:true|false|null)\b/, 'keyword'],          // 字面量
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],  // 数字
      [/[{}[\]]/, '@brackets'],                        // 括号配对（编辑器内置行为联动）
      [/:/, 'delimiter'], [/,/, 'delimiter'],          // 分隔符
      [/[ \t\r\n]+/, 'white'],                         // 空白（必须吃掉，否则死循环）
    ],
  },
})
```

补全在同一层用 provider 注册（提供"输入 `"` 后建议哪些字段名"）：

```ts
// 低代码协议字段补全：位置感知——只在"键位"触发，值位给物料名
monaco.languages.registerCompletionItemProvider('lowcode', {
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
      startColumn: word.startColumn, endColumn: word.endColumn,
    }
    const suggestions: monaco.languages.CompletionItem[] = [
      {
        label: 'component', kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: '"component": "${1:input}"', // snippet 占位符，Tab 跳转
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: '物料类型', range,
      },
      {
        label: 'bind', kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: '"bind": "${1:state.field}"',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: '状态绑定表达式', range,
      },
    ]
    return { suggestions }
  },
})
```

**Lezer**（CodeMirror 6 的语法层）：与 Monarch 的根本差异——Lezer 产出**真正的增量语法树**（增量解析：只重析变化影响的区间，大文件编辑恒定开销），语法用 `.grammar` 文件声明式描述、构建期生成 parser：

```text
// lowcode.grammar —— Lezer 语法文件（构建期由 @lezer/generator 编译成 JS parser）
@top File { Block }

Block { "{" (Prop ("," Prop)*)? "}" }
Prop { Ident ":" Value }
Value { Number | String | Boolean | Block | Array }
Array { "[" (Value ("," Value)*)? "]" }

@tokens {
  Ident { @asciiLetter (@asciiLetter | @digit | "-")* }
  String { '"' (![\"\\] | '\\' _)* '"' }
  Number { @digit+ ("." @digit+)? }
  Boolean { "true" | "false" }
  space { @whitespace+ }
}

@skip { space }
```

```bash
# 构建期把 .grammar 编译为增量 parser（进 package.json 的构建脚本）
npx lezer-generator src/lowcode.grammar -o src/lowcode.grammar.js
```

```ts
// 语法树接入 CodeMirror：LRLanguage 包装 parser
import { LRLanguage } from '@codemirror/language'
import { parser } from './lowcode.grammar.js'

export const lowcodeLanguage = LRLanguage.define({
  parser,
  languageData: { commentTokens: { line: '//' } },
})
```

有了语法树，折叠范围、结构化选取、错误定位（parser 报出的错误区间）都顺理成章——这是 Monarch 正则给不了的能力。

**LSP 进浏览器**（monaco-languageclient）：是什么——VSCode 的语言服务协议（Language Server Protocol）原本是"编辑器进程 ↔ 语言服务器进程"的 JSON-RPC 协议；monaco-languageclient 把 Monaco 变成 LSP 客户端，语言服务器可以跑在服务端、经 WebSocket 桥接（配合 `vscode-ws-jsonrpc`），也有 WASM 形态跑在浏览器。为什么需要——一门语言的分析逻辑（解析/类型/诊断/补全）写一次，VSCode、Vim、Emacs、你的网页编辑器全都能用；自研 DSL 接 LSP 生态等于白拿整个工具链。协议核心消息形态（收到诊断长什么样）：

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/publishDiagnostics",
  "params": {
    "uri": "file:///page.lowcode",
    "diagnostics": [
      {
        "range": {
          "start": { "line": 2, "character": 4 },
          "end":   { "line": 2, "character": 11 }
        },
        "severity": 1,
        "message": "未知物料类型：Inputx（你是想找 input 吗？）"
      }
    ]
  }
}
```

生命周期一句话：客户端 `initialize`（交换能力）→ `didOpen`/`didChange` 增量同步文档 → 服务端 `publishDiagnostics` 主动推送错误 → 用户补全时客户端 `completion` 请求。对低代码 DSL，量力而行：高亮用 Monarch/Lezer（前端本地）、"未知物料/非法 props"校验可以直接在 Monaco marker API 上做（参考第 5 章 JSON Schema 校验的思路），语义复杂了再上 LSP。

#### A5.4 核心技术二：多文件 Tab + 虚拟文件系统 + TS Worker

**多文件 Tab**：Monaco 的一个"文档"是一个 model（`monaco.editor.createModel(value, language, uri)`），一个编辑器实例可随时 `editor.setModel(model)` 切换——Tab 切换的原理就是切 model，光标/撤销历史都挂在 model 上不丢。虚拟文件系统 = 一个 `Map<uri, model>`，加上树形文件面板；跨文件能力（TS import 解析、重命名）都靠"同 URI 空间里有别的 model"成立。

```ts
// tabs.ts —— 多文件管理：model 即文档，Tab 切换即 setModel
import * as monaco from 'monaco-editor'

const vfs = new Map<string, monaco.editor.ITextModel>()

export function openFile(uri: string, content: string, editor: monaco.editor.IStandaloneCodeEditor) {
  const existing = monaco.editor.getModel(monaco.Uri.parse(uri))
  const model =
    existing ??
    monaco.editor.createModel(content, 'lowcode', monaco.Uri.parse(uri)) // 同 URI 幂等
  vfs.set(uri, model)
  editor.setModel(model) // 切 Tab = 切 model，光标与撤销历史都在 model 上保留
}

export function closeFile(uri: string) {
  const model = vfs.get(uri)
  vfs.delete(uri)
  model?.dispose() // 必须释放：model 持有 undo 历史/ decorations，泄漏大户
}
```

**TS Worker 类型提示**：Monaco 内置 TS 语言服务 Worker，可给你的 DSL 的 JSON 配置提供类型检查——把协议类型声明注入环境：

```ts
// 把低代码协议的 TS 类型喂给 Monaco 的 TS 服务，编辑 .ts 配置文件时获得类型提示
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  `
  interface PageNode { component: 'input' | 'select' | 'grid'; props?: Record<string, unknown> }
  interface PageSchema { version: 1; children: PageNode[] }
  `,
  'file:///lowcode-schema.d.ts', // 三斜线引用或同根目录即可被解析
)
```

#### A5.5 代表产品及其可学的点

- **CodeSandbox**：在线 IDE 定义者。可学：虚拟文件系统与浏览器内构建（衔接 D4 的 sandpack）、多 Tab 状态管理。
- **StackBlitz**：WebContainer 路线（D4 详解）。可学：把 Node 搬进浏览器后编辑器与运行时的协作。
- **JSON Schema 编辑器（你的第 5 章）**：本场景的直接前作。可学/反哺：第 5 章的"JSON + Schema 校验 + 自定义 marker"是本场景的退化形式——本场景把"语言"从 JSON 换成你的 DSL，校验从 JSON Schema 换成 Lezer parser + LSP。

#### A5.6 入手路径与验收物

按原大纲："为自己的低代码协议写一个 DSL（高亮 + 补全 + 校验），反哺第 5 章 JSON 编辑器"。分三步：

1. **第一步（第 1 周）**：取第 5 章的 JSON 编辑器，注册 `lowcode` 语言的 Monarch 规则（A5.3 代码），让 component/bind 等协议字段着色。验收物：打开任一低代码页面 schema，结构字段一眼可辨。
2. **第二步（第 2 周）**：加补全（协议字段 + 物料名清单）与错误提示（未知 component 标红，用 `monaco.editor.setModelMarkers`）。验收物：打错物料名即时红线，悬停有提示文案。
3. **第三步（第 3–4 周）**：两选一——(a) CodeMirror 6 + Lezer 重做一遍（体会有语法树的编辑器差别，折叠/结构导航）；(b) 接 LSP：用简单的 WS 服务端把校验逻辑挪到"语言服务器"，经 monaco-languageclient 供诊断。验收物（DoD）：三个文件 Tab 切换不丢撤销历史；关闭 Tab 后 memory 里 model 数量归零（DevTools 验证）；10000 行 DSL 编辑着色无可感延迟。

#### A5.7 常见坑

- **Monaco 体积爆炸**：直接 import 把几 MB 打进主包。对策：`@monaco-editor/react` 默认 CDN 懒加载（loader），或手动 dynamic import + MonacoEnvironment 配置。
- **Worker 配置缺失**：报错 "You must define a function MonacoEnvironment.getWorker"——TS/JSON 语言服务在 Worker 里跑，打包器需要专门配置（monaco-editor-webpack-plugin 或手写 getWorker）。这是 Monaco 接入的第一坑。
- **model 不 dispose**：每次打开文件都 createModel，同一 URI 会直接抛错（URI 必须唯一）；关闭 Tab 不 dispose 则 undo 历史与装饰常驻内存。对策：VFS 统一管理（A5.4 的 openFile/closeFile 模式）。
- **Monarch 忘写空白规则**：`[/[ \t\r\n]+/, 'white']` 漏掉后 tokenizer 在同一位置无法前进，编辑器假死或高亮错乱。
- **正则回溯灾难**：复杂贪婪正则（如嵌套字符串匹配）在长行上指数回溯，输入卡顿。着色规则要宁拆勿贪。
- **补全不填 range**：suggestion 缺 range 时插入位置错乱（插到行首）。每个 suggestion 都带 `model.getWordUntilPosition` 算出的 range。
- **CodeMirror 6 心智不适应**：它把语言/主题/快捷键全做成 extension 组合，没有"配置对象"心智。入门先读官方 example 迷你集，别按 Monaco 经验硬套。

---

以上 A1–A5 覆盖了编辑器家族全部五个场景。回到族标题的两个判断收束：**与 Schema 线最近**——A1 的文档树与 Transaction、A4 的节点注册、A5 的协议 DSL，处处是前一份大纲内核的进阶形态；**壁垒最高**——每个场景都要求你下探到浏览器输入管线（A1）、图算法（A2）、计算几何（A3）、图可视化工程（A4）、编译器分层（A5）其中至少一层。族内建议顺序 A4（最易，先赢一局）→ A1（内核，投入最重）→ 按方向选 A2/A3/A5。B 族及以后的场景在后续章节展开，其中 B1 协同编辑是 A1/A2/A3 完成后的天然下一步。

## B. 实时与协同

> 族群共性：状态不再是"我一个人改、刷新看结果"，而是**多个人的修改同时到达、乱序到达、离线后补到达，最终还必须收敛成同一份**。这一族里 React 退化为"UI 壳"，真正的难度在数据结构与协议层（B1 的 CRDT 数学、B2 的消息一致性与虚拟化、B3 的媒体传输协议），所以它们在"React 相关度过滤视图"里大多落在 ③（换框架知识原样保值）。学这族的心态：按通用技术学原理，用 React 练工程实现。

---

### B1. 多人协同编辑 CRDT（★★★★★）

**是什么**。让两个人（或多端）同时编辑同一份文档/表格/白板，所有人的修改实时可见、互不破坏，最终所有端内容完全一致。画像产品：Notion/飞书文档的多人编辑、Figma 的多人画板、Linear 的多端离线同步。协同其实包含三层诉求，混在一起谈会失焦：

1. **收敛（Consistency）**：不管谁在线谁离线、谁先谁后，所有端最终内容一致——这是 CRDT/OT 解决的核心；
2. **意图保留（Intention preservation）**：我插入的字不会被你的并发操作"吞掉"，你删的我不会复活；
3. **即时感知（Presence）**：看到对方光标、选区、头像——这是 awareness 层，和前两层是两套机制。

**为什么难**。因为分布式环境下**没有全局时钟，也没有"真实发生的顺序"**。来看三个递进的翻车现场。

**翻车现场一：last-write-win（按时间戳"后写赢"）会无声丢字。** 文档当前内容是 `Hello`，A 和 B 同时打开：

- A 在末尾追加了 ` World`，本地看到 `Hello World`；
- B 同时在末尾追加了 ` Yjs`，本地看到 `Hello Yjs`；
- 两端先后点保存，服务端按 `updatedAt` 比较：B 后保存 → 整份文档以 B 的版本覆盖 → A 写的 ` World` **无声消失**，没有任何报错、没有任何记录。

这不是实现 bug，是 LWW 合并策略的结构性缺陷：两份合法编辑合并时被迫二选一，必然丢一边。字段级的表单"互相覆盖"（同事改了标题把你改的正文冲掉）也是同一件事。

**翻车现场二：即使只传"操作"，位置在并发世界里也不成立。** 文档是 `AB`（下标 0=`A`、1=`B`）：

- A 在下标 0 前插入 `X`，本地得到 `XAB`；
- B 在下标 1 前插入 `Y`，本地得到 `AYB`；
- 广播重放：A 收到 B 的"在下标 1 前插入 Y"，在 `XAB` 上执行 → `XYAB`；B 收到 A 的"在下标 0 前插入 X"，在 `AYB` 上执行 → `XAYB`。

两端各执一词且都"看起来没错"。问题在于：**下标是相对某个历史版本而言的，版本分叉后下标失去全局意义**。OT 和 CRDT 做的全部努力，本质都是在回答"并发之后，插入位置和删除范围应该落到哪"。

**翻车现场三：删改交叠的语义必须有确定答案。** 初始 `Hello world`。A 选中 `Hello` 删除；B 同时在 `Hello` 后面输入 `!`。合并后 `!` 应该在还是不在？如果 B 的光标在 A 删除的范围内呢？这些都必须被算法严格定义，而不是"看运气"。

**OT vs CRDT：一句话讲清各自本质。**

- **OT（Operational Transformation，操作变换）**：客户端只传操作（`insert(pos, str)` / `delete(pos, len)`），由**中心服务器统一定序**，并让服务器对并发操作做**变换**（transform），使每个客户端重放变换后的操作仍能收敛。一句话：**中心定序 + 改写操作，让操作在别人的上下文里重放后结果一致**。Google Docs 是经典 OT 产品。
- **CRDT（Conflict-free Replicated Data Type，无冲突复制数据类型）**：把"可合并性"内置进数据结构本身——每个字符/值携带全局唯一 ID 和逻辑时钟，文档状态定义为"所有已见操作的集合"，而集合并集满足交换律，所以**无论 update 以什么顺序、从谁那里到达，结果恒定**。一句话：**用元数据换"顺序无关的合并"，天然去中心、天然离线友好**。

记忆钩子：**OT 改"操作"，CRDT 改"状态"；OT 依赖中心，CRDT 依赖元数据**。Yjs 是工业界最成熟的 CRDT 实现，下面全部围绕它展开。

#### 核心技术逐项

**1. Yjs 核心结构：Y.Doc / Y.Text / Y.Map / Y.Array**

- `Y.Doc`：一份协同文档的容器，持有共享类型树、唯一的 `clientID`，发出 `update`/`destroy` 事件；`doc.transact(fn)` 把 fn 内的多次修改合并成一个 update 一次广播（性能关键）。
- `Y.Text`：字符序列 CRDT（基于 YATA 算法），`insert/delete` 之外还支持 `format`（给区间加粗/变色等富文本属性）。文档正文、代码内容用它。
- `Y.Map`：键值 CRDT，值可以是原始值或嵌套的共享类型。注意一个精细区分：**单键内是 LWW（后写赢），但这是安全的**——因为值是原子替换，不存在"半个字段"的丢失；而"翻车现场一"里丢字的是文档级 LWW。文档的元信息、白板图元的属性、块结构（`Y.Map<blockId, Y.Map<props>>`）用它。
- `Y.Array`：列表 CRDT，适合块的有序排列。
- 另有 `Y.XmlFragment/XmlElement/XmlText`：为富文本树设计的类型，y-prosemirror 的对接面。

最小实验（Node 或浏览器跑都行，先不联网，纯本地感受"可合并"）：

```ts
import * as Y from 'yjs';

function simulateOfflineMerge() {
  // 两个端各自一份副本(模拟两个人离线各写各的)
  const alice = new Y.Doc();
  const bob = new Y.Doc();

  // 互不知晓地并发编辑同一位置
  alice.getText('doc').insert(0, 'Hello');
  bob.getText('doc').insert(0, 'World');

  // 上线:互相交换"我见过的全部操作"(全量 update)
  Y.applyUpdate(alice, Y.encodeStateAsUpdate(bob));
  Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice));

  console.log(alice.getText('doc').toString()); // 两端输出完全一致
  console.log(bob.getText('doc').toString());   // 谁的词都没丢;先后由 clientID 确定性决胜
}
```

对照"翻车现场一"：LWW 二选一丢一边，这里**两个词都保留、两端一致**。这就是"合并收敛性做进数据结构"的直观含义。

**2. 更新编码为什么可合并**

Yjs 的 update 不是快照，而是**操作的二进制日志**。每个操作被记录为 `[clientID, clock]`，`clock` 是该客户端内的单调递增序号——这个二元组全局唯一地标识一个操作。于是：

- 文档状态 = 所有已接收操作的**并集**。并集满足交换律（`A∪B = B∪A`）与结合律，所以 update 乱序、重复、迟到都不影响最终状态，重复投递也天然幂等（集合里已有就忽略）；
- **状态向量（State Vector）**：一个迷你摘要 `{clientID → 我见过的最大 clock}`。两个端交换状态向量后，各自能精确算出"对方缺什么"，只传差量——`Y.encodeStateVector` + `Y.diffUpdate` 就是干这个的，也是 y-websocket 同步协议的核心。

```ts
// 增量同步:只发对方缺的部分,而不是全量
const sv = Y.encodeStateVector(alice);                                  // alice 见过什么
const delta = Y.diffUpdate(Y.encodeStateAsUpdate(bob), sv);             // bob 比 alice 多的部分
Y.applyUpdate(alice, delta);                                            // 应用后两者一致
```

**3. awareness 是什么**

CRDT 管"文档内容"——要历史、要精确合并；awareness 管**临时的、只关心最新值的状态**：对方光标位置、选区范围、头像/名字/颜色、"正在输入中"。这类状态毫秒级过期、不需要合并历史，所以走完全不同的机制：各端全量覆盖自己的那一份并广播，谁断线谁的状态自动清除。注意它**不该**用 CRDT 存（白占元数据），也**不该**用高频 DOM 状态塞进去不节流（每帧广播会拖垮房间）。

```ts
import { WebsocketProvider } from 'y-websocket';

const provider = new WebsocketProvider('ws://localhost:1234', 'room-42', ydoc);
// 写:自己这份 awareness 的字段
provider.awareness.setLocalStateField('user', { name: 'Aimy', color: '#f783ac' });
provider.awareness.setLocalStateField('cursor', { anchor: 3, head: 7 });
// 读:房间里所有人的临时状态(clientID -> state)
provider.awareness.on('change', () => {
  for (const [clientID, state] of provider.awareness.getStates()) {
    console.log(clientID, state.user, state.cursor);
  }
});
```

**4. 编辑器绑定：y-prosemirror / y-monaco 的角色**

Yjs 只管数据，编辑器（ProseMirror/Monaco/CodeMirror）有自己的文档模型，两边的"位置体系"不同——并发合并后位置会漂移，你不能拿 textarea 硬绑（下一节的骨架会演示为什么不行）。绑定器（binder）做四件事：

1. 把本地编辑转成 Yjs 操作；
2. 把远端 update **带位置映射**地应用回编辑器（光标/选区跟着正确移动，而不是跳到末尾）；
3. 把 awareness 光标渲染成编辑器 decoration（对方彩色的光标和名字牌）；
4. 隔离 undo：本地 Ctrl+Z 只撤销自己的修改，不回滚别人的。

y-prosemirror 把 ProseMirror 的 Step 映射到 `Y.XmlFragment`（TipTap 的 `@tiptap/extension-collaboration` 就是它的封装）；y-monaco 把 Monaco 模型事件绑定到 `Y.Text`，一行绑定见后文。

**5. 离线 edits 合并**

Yjs 天然离线友好：本地产生的 update 先落 y-indexeddb，断网随便写；重连后双方交换状态向量、互发差量即可追平。离线期间的并发修改靠 CRDT 规则收敛（并发插入都保留，删除与插入交叠时字符级语义确定）。对比 OT：OT 的变换依赖服务器定序，离线堆积大量操作后变换矩阵的复杂度和出错面都会爆炸（学术圈经典的 dOPT puzzle 问题就是变换函数反例），所以 OT 产品的离线支持普遍孱弱——这是 Notion 早期离线体验差、Linear 选自研同步引擎的原因之一。

**6. 持久化：y-indexeddb**

把每次 update 追加写入 IndexedDB，启动时重放合并（内部会做 compaction 控制日志膨胀）。刷新页面不再回退到旧版本。

```ts
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const wsProvider = new WebsocketProvider('ws://localhost:1234', 'room-42', ydoc);
const idb = new IndexeddbPersistence('room-42', ydoc); // 本地持久层
idb.on('synced', () => {
  console.log('本地数据已恢复,等待服务器增量');
});
// 两个 provider 挂同一个 ydoc 即可:y-indexeddb 官方处理了「先回放本地、再与远端合并」的竞态
```

**7. 服务端选型：y-websocket / Liveblocks / PartyKit 定位差异**

- **y-websocket**：官方参考实现。服务端不理解文档语义，只做房间管理与 update 转发（哑中继），自带内存存储。`npx y-websocket` 一行起服务（默认 1234 端口）。定位：**开发联调、自建起步**。生产要自己补鉴权、持久化落库、水平扩展（Redis pub/sub 转发跨节点 update）。
- **Hocuspocus**（TipTap 团队）：可以理解为"生产级 y-websocket"，内置鉴权钩子、数据库持久化、水平扩展、扩展插件体系。自建生产服务端的事实标准。（大纲未列，顺带认知。）
- **Liveblocks**：托管 SaaS。房间/鉴权/在线状态 API/评论/通知等产品化模块开箱即用，按量付费。定位：**不想碰服务器细节、快速上线的买方案**。
- **PartyKit**：把"你自己的协同服务端代码"跑在 Cloudflare 边缘（Durable Objects 持有房间状态），适合需要自定义服务端逻辑（权限校验、AI 写入文档）又不想管扩容的团队；已被 Cloudflare 收编。定位：**边缘化的自建**。

选型口诀：demo 用 y-websocket，小团队快速上线用 Liveblocks，有后端团队要私有部署用 Hocuspocus/自建，要自定义服务逻辑跑在边缘用 PartyKit。

**8. 入手示例：两个 Tab 协同编辑的最小骨架**

先起服务：

```bash
# 终端 1:官方参考服务端,默认端口 1234
npx y-websocket
# 终端 2:安装依赖
npm i yjs y-websocket y-indexeddb
```

数据层 React 绑定——用 `useSyncExternalStore` 把 Y.Text 变成 React 可订阅的状态：

```tsx
// useYText.tsx
import { useSyncExternalStore } from 'react';
import * as Y from 'yjs';

/** 订阅一个共享文本,文档更新时组件重渲染 */
export function useYText(ydoc: Y.Doc, name: string): string {
  const ytext = ydoc.getText(name);
  return useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => onStoreChange();
      ytext.observe(handler);        // 订阅:任何来源的修改(本地/远端)都会触发
      return () => ytext.unobserve(handler);
    },
    () => ytext.toString(),          // getSnapshot:字符串天然满足「相同状态返回相同值」
  );
}
```

第一个骨架：textarea 版（**故意展示它的缺陷**）：

```tsx
// CollabTextarea.tsx
import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useYText } from './useYText';

export default function CollabTextarea() {
  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', 'demo-room', ydoc);
    new IndexeddbPersistence('demo-room', ydoc);
    return { ydoc, provider };
  }, []);

  const text = useYText(ydoc, 'draft');
  const [name] = useState(() => `User-${Math.floor(Math.random() * 100)}`);

  useEffect(() => () => { provider.destroy(); ydoc.destroy(); }, [provider, ydoc]);

  return (
    <div>
      <p>两个浏览器 Tab 打开本页,输入互通;断网继续打字,联网自动追平;刷新后由 IndexedDB 恢复。</p>
      <textarea
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          ydoc.transact(() => {
            const ytext = ydoc.getText('draft');
            ytext.delete(0, ytext.length); // 整段替换的糙写法:仅演示数据层
            ytext.insert(0, next);
          });
        }}
        rows={8}
        cols={60}
      />
    </div>
  );
}
```

开两个 Tab 输入互通没问题，但你马上会发现**光标老是跳到末尾**——因为整段替换丢掉了位置信息。这就是"编辑器绑定"存在的理由。正解用 TipTap v2（内部就是 y-prosemirror）：

```tsx
// CollabEditor.tsx —— TipTap v2.x
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEffect, useMemo } from 'react';

export default function CollabEditor() {
  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', 'rich-room', ydoc);
    new IndexeddbPersistence('rich-room', ydoc);
    return { ydoc, provider };
  }, []);

  const editor = useEditor({
    extensions: [
      // 协同场景必须关掉编辑器自带的历史栈,undo 由协同扩展接管(只撤销自己的操作)
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),      // 正文:ProseMirror <-> Y.XmlFragment
      CollaborationCursor.configure({                    // 他人光标/名字牌:awareness
        provider,
        user: { name: 'Aimy', color: '#f783ac' },
      }),
    ],
  });

  useEffect(() => () => { editor?.destroy(); provider.destroy(); ydoc.destroy(); }, [editor, provider, ydoc]);

  return <EditorContent editor={editor} />;
}
```

```css
/* 对方光标的样式(CollaborationCursor 输出的类名) */
.collaboration-cursor__caret {
  border-left: 1px solid;
  border-right: 1px solid;
  margin-left: -1px;
  margin-right: -1px;
  pointer-events: none;
  position: relative;
  word-break: normal;
}
.collaboration-cursor__label {
  border-radius: 3px 3px 3px 0;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  left: -1px;
  line-height: normal;
  padding: 0.1rem 0.3rem;
  position: absolute;
  top: -1.4em;
  user-select: none;
  white-space: nowrap;
}
```

Monaco 的等价物是 y-monaco，绑定只需一行：

```ts
import { MonacoBinding } from 'y-monaco';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type * as Monaco from 'monaco-editor';

export function bindMonaco(editor: Monaco.editor.IStandaloneCodeEditor, ydoc: Y.Doc) {
  const provider = new WebsocketProvider('ws://localhost:1234', 'code-room', ydoc);
  // ytext <-> Monaco model 双向绑定;editor 放进 Set 用于渲染他人光标 decoration
  new MonacoBinding(ydoc.getText('code'), editor.getModel()!, new Set([editor]), provider.awareness);
}
```

**代表**：Figma、Notion、Linear（原文代表）。注意它们的方案并不等于 Yjs：Figma 公开博客讲过其自研的属性级同步架构；Linear 走自研 Local-first 同步引擎；Yjs 是开源方案里的工业标准（被多家文档产品与 Liveblocks 等托管服务采用）。学 Yjs 学的是这类系统的共同内核。

**入手路径**（4 步，每步 2~5 天）：

1. 跑通上面的 textarea 骨架，体感"两个 Tab 互通、断网不丢"；读 `Y.Text` 的 observe 事件里的 `event.delta`（操作增量），理解 update 流；
2. 换成 TipTap + Collaboration，观察他人光标（awareness）；故意开三个 Tab，把中间那个断网 30 秒再恢复，验证增量追平；
3. 把 `Y.encodeStateAsUpdate(ydoc)` 存到后端（一个简单的 POST），实现"房间快照 + 增量落库"的最简持久化，理解状态向量差量同步；
4. 进阶：用 `y-websocket` 的权限缺口（任何人可连任何房间）练习给信令加 JWT 鉴权。

**验收物**：一个可部署的协同编辑页——两个 Tab（或两台设备）实时同步富文本、互相可见光标与名字；其中一端断网编辑 1 分钟后恢复不丢内容；刷新页面内容从 IndexedDB 恢复。

**常见坑**：

- **observe 回写死循环**：observe 里 setValue、onChange 里又触发 update，互相打架。原则：单一数据源——输入事件写 Yjs，渲染只读 Yjs；不要在 observe 里再做一次"纠正"；
- **用 JSON.stringify 序列化 Y.Doc**：文档必须用二进制编码（`Y.encodeStateAsUpdate` → Uint8Array）持久化/传输，JSON 会破坏结构；
- **awareness 塞高频状态**：每帧鼠标坐标直接 `setLocalState` 会形成广播风暴，高频信号先节流（光标一般 30~50ms 一次足够）；
- **每次渲染 new Y.Doc()**：Y.Doc/provider 是重对象，必须 `useMemo`（或模块级单例）创建、卸载时 `destroy()`，否则 IndexedDB 连接和 WebSocket 泄漏；
- **以为服务端能读文档**：y-websocket 服务端只是转发字节，想服务端渲染摘要/搜索，得在服务端也加载同一份 update 到一个 Y.Doc 里（Hocuspocus 的 hook 里做）。

---

### B2. IM / 长会话列表（★★★★☆）

**是什么**。Slack/Discord/钉钉式聊天前端：左侧几百个会话（未读徽标、置顶、@提及高亮），右侧万条历史消息的滚动流（乐观发送、翻页、已读、引用、反应、撤回）。画像里的每一个词背后都是一条独立的数据流。

**为什么难**。四个叠加的约束：

1. **量**：一个活跃频道几万条消息，每条是高度不定的 DOM（一行文本 vs 一张图 vs 带引用卡的代码块）——虚拟化必须动态测量；
2. **方向**：消息流"新在底、旧在顶"，翻历史是向上加载，滚动锚定逻辑与普通列表相反；
3. **一致性**：乐观消息（临时 id）与服务端消息（正式 seq）在同一列表里交错，还要与翻页数据归并去重；
4. **分布式状态**：未读数/已读回执是"每个用户 × 每个会话"一个游标，跨端同步。

数据模型先行（后面所有逻辑都围绕它）：

```ts
export interface Message {
  id: string;                 // 乐观阶段=本地 uuid;确认后=服务端 id
  reqId?: string;             // 发送请求 id(乐观替换的关键:服务端 ack 会带回它)
  clientId: string;           // 发送者
  seq: number | null;         // 服务端单调递增序号;乐观阶段为 null
  type: 'text' | 'image' | 'system';
  content: string;
  status: 'sending' | 'sent' | 'failed';
  replyTo?: string;           // 引用回复的消息 id
  reactions?: Record<string, string[]>; // emoji -> 已反应的 userId 列表
  editedAt?: number;          // 有值=已被编辑
  recalled?: boolean;         // 已撤回
  createdAt: number;
}
```

#### 核心技术逐项

**1. 两级列表虚拟化：会话列表 + 消息流，动态高度与测量缓存**

为什么是"两级"：侧栏会话列表与主消息流是两个独立滚动的虚拟化容器（前者基本定高，后者必须动高）。虚拟化的本质前面 E1/G 族会展开，这里只讲 IM 特有的部分。

动态高度三步走——**估、测、校**：

- **估（estimate）**：未测量前按消息类型给估值（纯文本 72px、图片 240px、引用卡 +56px），保证首屏滚动条不至于乱跳；
- **测（measure）**：元素真实渲染后量一次高度，写入缓存 `Map<key, measuredSize>`。`getItemKey` 必须返回稳定 id（消息 id 而不是数组下标），否则乐观替换/翻页归并后缓存全部错位；
- **校（correct）**：某项实测高度 ≠ 估算时，虚拟器修正总高度与后续项偏移。TanStack Virtual 的 `measureElement` 回调替你做了这一步。

```tsx
// MessageList.tsx
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from './types';

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (messages[i].type === 'image' ? 240 : 72), // 估
    getItemKey: (i) => messages[i].id,                              // 稳定 key:测量缓存的锚
    overscan: 8,
  });

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((v) => (
          <div
            key={v.key}
            data-index={v.index}
            ref={virtualizer.measureElement}   // 测:渲染后回传真实高度
            className="absolute w-full"
            style={{ transform: `translateY(${v.start}px)` }}
          >
            <MessageBubble msg={messages[v.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**向上加载的滚动锚定**（原理，必懂）：在顶部插入 50 条后，内容总高度增加 ΔH，而浏览器保持 `scrollTop` 数值不变——视口里显示的内容会瞬间"被顶下去"跳变。两种对策：

- 手动校正：`useLayoutEffect` 里在 paint 前执行 `el.scrollTop += (newContentHeight - oldContentHeight)`；
- 容器 `flex-direction: column-reverse` + 数据倒序（新消息物理上在顶部、视觉在底部）：浏览器的滚动锚点天然固定在底部，新消息到达自动"钉底"，翻历史变成向下 append，连锚定代码都省了。Discord 就是这个思路。代价是滚动条方向和 assistive tech 的语义都要适配。

**图片高度突变**是虚拟化另一杀手：图片异步加载完成后把撑高，后续所有项偏移全变、滚动条抖动。解法是**预留**：容器按宽高比占位（`aspect-ratio: 4 / 3`），图片加载完成前后尺寸不变。

**2. 消息顺序：服务端 seq 与乐观消息的临时 id→确认替换**

排序只有一条真理来源：**服务端每会话单调递增的 `seq`**。本地时间不可信（时钟漂移会让消息穿插），服务端接收顺序才是大家看到的顺序。乐观发送流：

1. 用户回车 → 立即 push 一条 `{ id: nanoid(), status: 'sending', seq: null }`，输入框清空、草稿清除——**零等待**的体感就来自这里；
2. 服务端处理完广播 ack：`{ reqId, message: { id, seq, ... } }`（reqId 是你发送时带上的请求 id）；
3. 客户端用 reqId 找到那条乐观消息，**原位替换字段**：`status → 'sent'`、`id → 服务端 id`、补 `seq`；
4. 超时/失败 → `status: 'failed'`，展示重试按钮；重试沿用同一个 reqId。

React 侧的关键技巧：**渲染 key 全程用"本地临时 id"**（服务端 ack 里回带 reqId 映射，key 不切换），确认时只改字段不改 key——否则整条消息 unmount/remount，图片重新加载、动画重播，视觉闪烁。

```ts
// store 片段:乐观发送 + ack 替换
import { nanoid } from 'nanoid';

function sendMessage(draft: string, convId: string) {
  const reqId = nanoid();                      // 本次发送请求的唯一标识
  const optimistic: Message = {
    id: reqId,                                 // 临时 id 直接复用 reqId,保证 key 稳定
    reqId,
    clientId: myUserId,
    seq: null,
    type: 'text',
    content: draft,
    status: 'sending',
    createdAt: Date.now(),
  };
  appendMessage(convId, optimistic);           // 立即上屏
  ws.send(JSON.stringify({ kind: 'msg.send', reqId, convId, content: draft }));
}

function onAck(payload: { reqId: string; message: Message }) {
  patchMessage(convId, payload.reqId, {        // 按 reqId 原位替换(不改数组位置,key 不变)
    id: payload.message.id,
    seq: payload.message.seq,
    status: 'sent',
  });
}
```

**3. 向上翻页补洞去重**

翻页请求"更老的 50 条"（按 seq 倒序），与此同时实时推送还在往尾部插新消息——两股数据流汇进同一个列表。三个问题一次解决：

- **排序**：确认消息按 seq 升序；`sending/failed` 恒在尾部；
- **去重**：用 `Set<id>`（或 seq 区间）做合并时的幂等键——分页与实时推送可能带回同一条；
- **补洞（gap）**：页 A 最老是 seq=1000，页 B 最新是 seq=980 → 中间缺 981~999（服务端清理/权限删除等原因）。检测到断档时插入一个"加载缺失消息"占位块，点击按区间拉取，而不是硬拼出一个跳跃的列表。

```ts
// mergeMessages.ts —— 纯函数:归并 + 去重 + 洞检测
import type { Message } from './types';

export interface MergeResult {
  messages: Message[];          // 归并后的有序列表
  gaps: { from: number; to: number }[]; // 检测到的 seq 断档
}

export function mergeMessages(existing: Message[], incoming: Message[]): MergeResult {
  const seen = new Set(existing.map((m) => m.id));      // 幂等键
  const merged = [...existing];
  for (const m of incoming) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }
  // 稳定排序:sending/failed 无 seq,排尾部
  const confirmed = merged.filter((m) => m.seq != null).sort((a, b) => a.seq! - b.seq!);
  const pending = merged.filter((m) => m.seq == null);
  const gaps: MergeResult['gaps'] = [];
  for (let i = 1; i < confirmed.length; i++) {
    const prev = confirmed[i - 1].seq!;
    const cur = confirmed[i].seq!;
    if (cur - prev > 1) gaps.push({ from: prev + 1, to: cur - 1 }); // 断档区间
  }
  return { messages: [...confirmed, ...pending], gaps };
}
```

**4. 已读回执 / 未读数的数据流**

模型极简：**每个用户对每个会话一个游标 `readSeq`（我读到哪）**。一切派生指标都从它算：

- 我的某会话未读数 = `latestSeq − myReadSeq`；
- 群聊"全部已读"判定：`msg.seq ≤ min(其他成员的 readSeq)`；
- @提及角标：未读消息里 `mentions` 含我的条数。

数据流三条线：

1. **上报**：我在会话里滚动 → 取"视口内最老可见消息的 seq"（比"最后一条"更诚实——用户没看的不该算已读）→ 防抖 500ms 后 `ws.send({ kind: 'read.report', convId, readSeq })`。防抖是必须的：快速滑过 200 条不该产生 200 次上报；
2. **接收**：服务器推送 `conversation.updated`（latestSeq/unread 变化，驱动侧栏徽标）与 `receipt.updated`（某成员 readSeq 变化，驱动我发出消息下方的"已读/未读"小标）；
3. **多端同步**：我在手机读了，桌面端徽标要消——游标变化同样走推送。

```ts
// 视口内最老可见 seq 的上报(demo 逻辑)
let reportTimer: ReturnType<typeof setTimeout> | undefined;
function onVisibleSeqChange(visibleOldestSeq: number, convId: string, myReadSeq: number) {
  clearTimeout(reportTimer);
  reportTimer = setTimeout(() => {
    const next = Math.max(visibleOldestSeq, myReadSeq); // 游标只进不退
    if (next > myReadSeq) {
      ws.send(JSON.stringify({ kind: 'read.report', convId, readSeq: next }));
    }
  }, 500);
}
```

**5. 引用回复树、@提及自动补全、表情反应聚合**

- **引用回复**：消息带 `replyTo`。现代 IM（Slack/Discord 飞书皆然）**不渲染整棵回复树**，而是"消息流扁平 + 气泡内引用预览卡 + thread 视图"三件套：点引用卡进入 thread（thread 就是一个复用的 MessageList，数据按 `parentId` 过滤）。渲染引用卡用 `Map<id, Message>` 索引 O(1) 查找，被引用消息未加载（太老）时显示"原消息未加载"，点击按需拉取；
- **@提及自动补全**：输入框监测 `@` 触发成员选择 popover（键盘上下+回车，参照 G 族的 Combobox 模式）。**存储时把 mention 作为结构化片段**而不是事后正则匹配：`[{type:'text',...},{type:'mention', userId}]`——渲染高亮、发送通知、删除整块都不会把 `@张三` 误伤成 `@张三丰`；
- **表情反应聚合**：原始事件流是 `reaction.add/remove {msgId, emoji, userId}`，前端聚合为 `Record<emoji, userId[]>`：count 取数组长度，"我是否已选"看数组含不含我，再点一次 = 取消。增量事件直接改聚合结构，不重拉消息。

```ts
// reactions 聚合 reducer
export function applyReaction(
  reactions: Record<string, string[]>,
  e: { emoji: string; userId: string; op: 'add' | 'remove' },
): Record<string, string[]> {
  const users = reactions[e.emoji] ?? [];
  const next =
    e.op === 'add'
      ? users.includes(e.userId) ? users : [...users, e.userId]
      : users.filter((u) => u !== e.userId);
  const cloned = { ...reactions };
  if (next.length) cloned[e.emoji] = next;
  else delete cloned[e.emoji];       // 空反应不显示
  return cloned;
}
```

**6. 图片视频懒加载**

虚拟化本身就是最强的懒加载（不可见不挂载），但仍有两个层次要做：

- **占位**：所有媒体容器按宽高比预留（见动态高度一节），缩略图用低清 URL，点开大图才加载原图——大图查看器是全局单例（Portal + 预加载相邻图）；
- **重内容延迟渲染**：长 markdown/代码高亮/自定义卡片只对"可见项"执行高亮计算，可视区外先渲染纯文本占位（否则快速滚动时高亮计算把主线程打爆）。视频消息 `preload="metadata"` 只拉时长和首帧。

**7. 撤回 / 编辑 diff**

- **撤回**：客户端发 `msg.recall`，**服务端校验时限**（如 2 分钟）后广播 `message.recalled`；所有端把气泡替换为灰字"XX 撤回了一条消息"（撤回后内容不留在客户端是合规要求，所以不是前端把内容涂掉就完事）；
- **编辑**：广播 `message.updated`，前端更新内容 + 显示"已编辑"标记；点"已编辑"展开旧→新对比视图。词级 diff 用最小 LCS 就够（消息都不长）：

```ts
// wordDiff.ts —— 词级 diff(LCS 动态规划)
export interface DiffOp { type: 'same' | 'del' | 'ins'; text: string }

export function wordDiff(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split(/(\s+)/);       // 保留空白分隔符,中文可按字切
  const b = newText.split(/(\s+)/);
  // dp[i][j] = a[i:] 与 b[j:] 的最长公共子序列长度(逆序填表)
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({ type: 'same', text: a[i++] }); j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: 'del', text: a[i++] });
    else ops.push({ type: 'ins', text: b[j++] });
  }
  while (i < a.length) ops.push({ type: 'del', text: a[i++] });
  while (j < b.length) ops.push({ type: 'ins', text: b[j++] });
  return ops;
}
```

**8. 草稿持久化**

每个会话一份 `{text, mentions, updatedAt}`。选 IndexedDB 而不是 localStorage：后者同步 API 会阻塞主线程且容量 ~5MB。防抖保存 + 进入恢复 + 发送成功清除：

```ts
// drafts.ts —— Dexie(IndexedDB)实现
import Dexie, { type EntityTable } from 'dexie';

export interface Draft {
  conversationId: string;
  text: string;
  mentions: string[];
  updatedAt: number;
}

const db = new Dexie('im-drafts') as Dexie & {
  drafts: EntityTable<Draft, 'conversationId'>;
};
db.version(1).stores({
  drafts: 'conversationId, updatedAt', // 主键在前,updatedAt 做索引便于清理旧草稿
});

export const saveDraft = (d: Draft) => db.drafts.put(d);
export const loadDraft = (conversationId: string) => db.drafts.get(conversationId);
export const clearDraft = (conversationId: string) => db.drafts.delete(conversationId);
```

**入手路径**（四阶段，每阶段 3~5 天）：

1. **基础聊天室**：WebSocket 广播收发（可以用一个 Node `ws` 服务器 50 行解决），普通列表渲染、滚动到底；
2. **上量**：造 1 万条假数据（高度参差：混图片/引用/代码），接 TanStack Virtual 动态高度，做向上翻页 + 滚动锚定；
3. **一致性**：乐观发送 + reqId→确认替换 + `mergeMessages` 归并去重补洞；断网发送 → 恢复重试；
4. **产品化**：已读回执与未读徽标、引用回复与 thread、@提及补全、反应聚合、撤回与编辑 diff、草稿持久化。

**验收物**：双窗口登录两个账号：万级历史消息流畅滚动（Performance 面板滚动帧 < 16ms 为主）；A 发消息 B 秒见、A 的"已读"随 B 阅读变化；断网时 A 继续发送显示 failed，恢复后一键重试成功；切走再切回，草稿与滚动位置都在。

**常见坑**：

- 用数组下标当 key：乐观替换、翻页归并之后全部错位闪烁；
- 用本地时间排序：两端时钟差 30 秒，消息就穿插，必须 seq；
- 图片无占位：加载完成高度突变，列表抖动；
- 每条消息各建一个 WebSocket/事件订阅：应该是全局一条连接 + 一个消息分发器（store 层），组件只订阅自己会话的切片；
- 草稿存 localStorage 且每次 keystroke 同步写：主线程卡顿，应防抖 + IndexedDB；
- `overflow-anchor`（浏览器原生滚动锚定）与手动 scrollTop 校正互相打架，二选一。

---

### B3. 音视频 / 直播（★★★★☆）

**是什么**。视频会议、直播、在线教育课堂、云剪辑。这一族是**概念重灾区**——SDP/STUN/TURN/ICE/SFU/MSE 一堆缩写。先把地图画出来：**拉流看**（用户看视频：hls.js）与**推流连麦**（用户产生视频：WebRTC）是两条完全不同的技术路线；前者的关键词是"切片与自适应"，后者是"建立浏览器之间的直连"。

**为什么难**。媒体数据量大（一路 720p 约 1~3 Mbps），实时性要求苛刻（通话延迟 > 300ms 就难受）；网络天然不可靠（丢包/抖动/对称 NAT）；浏览器 API 面广且各浏览器实现有差异。难点不在写代码量，而在**每个概念你得真的知道它为什么存在**。

#### 核心技术逐项

**1. hls.js 播放器：清晰度切换 / seek 精度 / 预加载**

先懂 HLS（HTTP Live Streaming，Apple 发明）：服务端把视频**转码成多档码率、切成几秒一个的小分片**（ts 或 fMP4），并生成两级文本索引——`master.m3u8`（有哪几档）和每档的媒体列表（分片 URL + 时长）。客户端循环"拉列表 → 按序拉分片 → 喂给浏览器播放"。**直播**就是服务器不断往列表尾巴追加新分片，客户端轮询跟进。为什么基于 HTTP 而不是专用协议（RTMP/RTP）：CDN 缓存天然友好、穿防火墙、运维成本极低；代价是延迟（分片时长 × 2~3 倍，常规 6s 切片约 15~30s 延迟，LL-HLS 可压到 ~2s）。

**ABR（自适应码率）**：客户端实测下载速度，自动在高/低档间切换——网差看 360p、网好跳 1080p。hls.js 默认就开着。

最小接入：

```tsx
// HlsPlayer.tsx
import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

export function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [current, setCurrent] = useState(-1); // -1 = 自动(ABR)

  useEffect(() => {
    const video = videoRef.current!;
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 }); // 前向缓冲 30 秒:越长越抗抖、越费流量
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video); // hls.js 解码分片后经 MSE 喂给 <video>
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // 清单解析完:拿到全部档位(高度/码率)
        setLevels(data.levels.map((l, i) => ({ index: i, label: `${l.height}p` })));
        void video.play();
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;                 // 非致命错误 hls.js 自己恢复
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad(); // 网络错误:重试拉流
        else hls.recoverMediaError();            // 媒体错误:软恢复
      });
      return () => hls.destroy();                // 切换频道必须销毁,否则内存泄漏
    }
    // Safari:iOS 原生支持 HLS,直接给 src
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src]);

  function switchQuality(index: number) {
    const hls = hlsRef.current;
    if (!hls) return;
    setCurrent(index);
    if (index === -1) {
      hls.currentLevel = -1; // 交还 ABR:按实测带宽动态切
    } else {
      hls.nextLevel = index; // 立即切:丢弃已缓冲数据,秒切但可能黑一瞬
      // hls.currentLevel = index 是平滑切:播完缓冲再切,无黑屏但慢
    }
  }

  return (
    <div>
      <video ref={videoRef} controls muted playsInline />
      <select value={current} onChange={(e) => switchQuality(Number(e.target.value))}>
        <option value={-1}>自动</option>
        {levels.map((l) => (
          <option key={l.index} value={l.index}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
```

**seek 精度**：视频流里只有关键帧（I 帧）能独立解码，seek 必须落在关键帧上——所以拖进度条后画面会"吸附"到最近的前一个关键帧，切关键帧间隔（GOP）越短 seek 越准、压缩率越差。直播里 seek 还受限于"列表里还有哪些分片"（回看窗口）。

**预加载策略**：详情页嵌了视频但不该立刻耗流量——`autoStartLoad: false` 先只解析清单拿时长/档位/首帧，用户点播放再 `hls.startLoad(0)`：

```ts
const hls = new Hls({ autoStartLoad: false });
hls.loadSource(src);
hls.attachMedia(video);
// 用户点击播放时:hls.startLoad(0) 从第 0 秒开始真正拉分片
```

**2. WebRTC 1v1 全流程（概念重灾区，逐词通俗讲）**

目标：两个浏览器直接互传音视频。先给一张角色表，每个词"是什么 + 为什么需要"：

| 词汇 | 是什么 | 为什么需要 |
|---|---|---|
| **P2P** | 浏览器之间直连传输媒体数据 | 不走你的服务器 = 低延迟、零带宽成本（除兜底） |
| **NAT** | 家庭/公司路由器的地址转换 | 内网设备没有公网 IP，是"直连"这件事的最大障碍 |
| **SDP** | 一封"自我介绍信"（文本格式） | 双方必须先互告"我支持哪些编解码/分辨率/传输参数"才能协商 |
| **信令服务器** | 你自己写的传话通道（通常 WebSocket） | WebRTC 标准**故意不管** SDP 怎么交换，任何能传消息的通道都行 |
| **STUN** | 一面"镜子"服务器 | 让浏览器知道"我的包从公网看是 x.x.x.x:port"（NAT 映射地址），这是候选地址之一 |
| **TURN** | 中转站服务器 | NAT 太严（对称 NAT/企业防火墙）打不通直连时，媒体全部经它转发——连通性兜底，成本大头 |
| **ICE** | 候选地址总调度 | 把"本机 IP + STUN 公网地址 + TURN 地址"全部收集为候选，两两测连通，选第一条通的 |

一句话串联：**信令帮双方互换 SDP 和 ICE 候选；STUN 帮你找到自己的公网地址；打不通时 TURN 替你转发；打通后媒体走 P2P 直连。**

完整时序（A 呼 B）：

```text
A 与 B 都: getUserMedia 拿本地流 → new RTCPeerConnection(iceServers) → addTrack(把流放进连接)
A(主叫): createOffer(我的能力清单) → setLocalDescription → 信令发给 B
B(被叫): setRemoteDescription(A 的清单) → createAnswer(交集) → setLocalDescription → 信令发给 A
A: setRemoteDescription(B 的应答)
双方: ICE 异步收集候选(onicecandidate)→ 信令互发 → addIceCandidate(对方候选)
双方: ICE 选定通路 → P2P 建立 → ontrack 收到对方画面
```

完整代码（React 组件，信令用 WebSocket，消息协议 JSON）：

```tsx
// CallRoom.tsx
import { useEffect, useRef } from 'react';

type Signal =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'candidate'; candidate: RTCIceCandidateInit };

export function CallRoom({ roomId, isCaller }: { roomId: string; isCaller: boolean }) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const signaling = new WebSocket(`wss://signal.example.com/room/${roomId}`);
    let pc: RTCPeerConnection | null = null;

    signaling.onopen = async () => {
      // ① 拿本地媒体(摄像头/麦克风授权弹窗在这里触发)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // ② 建连接:STUN 发现公网地址,TURN 是打不通时的中继兜底(生产必须配)
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:turn.example.com:3478', username: 'demo', credential: 'demo-pass' },
        ],
      });

      // ③ 放入本地轨道;对端轨道到达时触发 ontrack
      stream.getTracks().forEach((t) => pc!.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      // ④ ICE 每收集到一个候选地址,就经信令转发给对方
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          signaling.send(JSON.stringify({ kind: 'candidate', candidate: e.candidate }));
        }
      };

      // ⑤ 主叫方发起:生成 offer → 存本地描述 → 发给对方
      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.send(JSON.stringify({ kind: 'offer', sdp: pc.localDescription!.sdp! }));
      }
    };

    signaling.onmessage = async (e) => {
      if (!pc) return;
      const msg = JSON.parse(e.data) as Signal;
      if (msg.kind === 'offer') {
        // 被叫方:装进对方的描述 → 生成应答 → 回发
        await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signaling.send(JSON.stringify({ kind: 'answer', sdp: pc.localDescription!.sdp! }));
      } else if (msg.kind === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      } else if (msg.kind === 'candidate') {
        await pc.addIceCandidate(msg.candidate);
      }
    };

    return () => {
      signaling.close();
      pc?.close(); // 关连接会释放摄像头指示灯
    };
  }, [roomId, isCaller]);

  return (
    <div>
      {/* 本地画面必须 muted:否则自己的声音外放再被对方传回,形成啸叫 */}
      <video ref={localVideoRef} autoPlay muted playsInline width={240} />
      <video ref={remoteVideoRef} autoPlay playsInline width={480} />
    </div>
  );
}
```

**3. SFU 多人架构概念**

1v1 每人一路，.mesh 直连没问题。但 4 人 mesh：每人要同时向其他 3 人各发一路 720p → 上行带宽 ×3，手机直接发烫断流。三条多人路线：

- **Mesh**：全互联。0 服务器媒体成本，N=3~4 人上限；
- **SFU（Selective Forwarding Unit，选择性转发单元）**：每人只向服务器发 1 路，服务器按"谁订阅了谁"把流转发给其他人——**不转码、不混流**，只做转发，所以一台服务器能扛很多路；配合 **simulcast**（同一路同时发高/中/低三档，服务器按每个接收端的带宽挑一档转发）弹性更好。这是当下视频会议的主流架构；
- **MCU（混流单元）**：服务器把多路解码、合成一路画面/混音、再编码下发。接收端最省（只收一路），但服务器转码成本巨大、延迟叠加，如今基本只在电话混音场景残留。

开源认知：mediasoup、Janus、LiveKit（自建 SFU）；托管有 Agora/腾讯云等。前端侧只需要知道：连 SFU 的代码和 1v1 几乎一样（还是 RTCPeerConnection + addTrack），只是对端是服务器且要维护"发布/订阅"两组协商。

**4. 设备管理**

- `navigator.mediaDevices.enumerateDevices()`：列出全部摄像头/麦克风/扬声器。**坑**：授权之前 `label` 是空字符串（隐私限制），所以要先 getUserMedia 一次再枚举才有名字；
- 约束：`{ video: { width: { ideal: 1280 }, frameRate: { ideal: 30 } }, audio: { echoCancellation: true } }`，移动端 `facingMode: 'user' | 'environment'` 切前后摄；
- **热切换设备**：用 `sender.replaceTrack(newTrack)`——替换轨道但复用连接，**不触发重新协商**，对方画面无缝切换；
- 屏幕共享：`navigator.mediaDevices.getDisplayMedia({ video: true })`，监听 track 的 `onended` 处理"用户点了浏览器的停止共享"。

```ts
// 切换摄像头(不重新协商)
async function switchCamera(pc: RTCPeerConnection, deviceId: string) {
  const next = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
  const newTrack = next.getVideoTracks()[0];
  const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
  await sender?.replaceTrack(newTrack); // 换轨道不换连接
}
```

**5. MediaRecorder 录制**

把一个 MediaStream（本地或远端）录成 webm/mp4 文件：

```ts
export function startRecording(stream: MediaStream): MediaRecorder {
  // 探测本机支持的容器/编码:Chrome 系 webm,Safari 是 mp4
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((m) =>
    MediaRecorder.isTypeSupported(m),
  )!;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    URL.revokeObjectURL(url); // 用完释放
  };
  recorder.start(1000); // 每秒吐一次数据:页面崩溃最多丢最后 1 秒
  return recorder;
}
// 停止:recorder.stop() 会触发 onstop 完成拼装
```

**6. WebCodecs：云剪辑的概念**

传统"云剪辑"是服务器跑 ffmpeg：上传素材 → 服务器渲染 → 回传，一次导出等几分钟。**WebCodecs** 把解码器/编码器（`VideoDecoder` / `VideoEncoder` / `AudioDecoder` / `AudioEncoder`）以**帧级**API 暴露给浏览器——比 MSE 底一层：你能直接拿到解码后的 `VideoFrame`。云剪辑前端化的管线变成：

```text
素材 HTTP Range 按需拉取 → demux(mp4box.js 拆容器) → WebCodecs 解码成帧
  → WebGL 画布合成/加特效 → WebCodecs 编码 → 打包成文件下载
```

全程浏览器内完成：零上传、所见即所得、时间线拖动即时预览。对比另一条路线 **ffmpeg.wasm**（把整个 ffmpeg 编译到 wasm）：功能全但慢（wasm 单线程解码），适合当兜底。给一段帧级 API 的真实形状（感受用）：

```ts
// 概念示意:VideoDecoder 的真实签名
const decoder = new VideoDecoder({
  output: (frame) => {
    // 拿到解码后的一帧(VideoFrame),画到 WebGL 画布上做合成
    frame.close(); // VideoFrame 是 GPU 资源,用完必须显式 close,否则显存泄漏
  },
  error: (e) => console.error('decode error', e),
});
decoder.configure({ codec: 'avc1.64001f' }); // H.264 High Profile
decoder.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data: encodedBytes }));
```

**7. Web Audio AnalyserNode 声浪**

Web Audio 是一个"音频路由图"：`AudioContext` 里把节点连起来。声浪分析只需要三步：`MediaStreamSource → Analyser → （不连 destination）`——**故意不连扬声器**，只旁路分析，避免自己的麦克风外放产生啸叫。

```tsx
// VoiceWave.tsx
import { useEffect, useRef } from 'react';

export function VoiceWave({ stream }: { stream: MediaStream }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;                // 频段数 = fftSize / 2 = 128 个柱子
    analyser.smoothingTimeConstant = 0.75; // 时间平滑,不然柱子抖到眼花
    source.connect(analyser);              // 只分析不外放:不连 audioCtx.destination

    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data); // 频域能量(0-255),适合画柱状声浪
      // (画波形用 getByteTimeDomainData:每采样点的瞬时振幅)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / data.length;
      data.forEach((v, i) => {
        const h = (v / 255) * canvas.height;
        ctx.fillStyle = `hsl(${180 + (v / 255) * 120} 80% 55%)`;
        ctx.fillRect(i * barW, canvas.height - h, barW - 1, h);
      });
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void audioCtx.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={480} height={96} />;
}
```

**代表**：视频会议（Zoom/腾讯会议 Web 端）、直播（B 站/HLS 分发）、在线教育、云剪辑（剪映 Web 版是 WebCodecs 路线的代表）。

**入手路径**（对应大纲"先 hls.js 再 WebRTC"）：

1. 用公开测试流（如 Mux/Apple 的公开 m3u8）做 hls.js 播放器：倍速（`video.playbackRate`）、截图（canvas `drawImage(video)` → `toDataURL`）、缓冲进度条（`video.buffered`）三个功能点；
2. 双浏览器 Tab 做本地 WebRTC 1v1（信令可以直接用第一个 Tab 对 localStorage 的写入广播模拟，或 10 行 Node ws）；
3. 给 1v1 加：设备切换（replaceTrack）、录制（MediaRecorder）、声浪（AnalyserNode）；
4. 概念进阶：起一个 LiveKit/mediasoup demo 服务，体会 SFU 的发布/订阅模型。

**验收物**：一个播放器页（清晰度菜单 + 倍速 + 缓冲进度 + 截图下载）+ 一个通话页（1v1 视频、麦克风/摄像头设备切换、录制下载、实时声浪）。

**常见坑**：

- **autoplay 被拦截**：无用户手势时 `play()` 被拒——autoplay 策略要求 `muted` 才能自动播；`AudioContext` 同理要用户手势后 `resume()`；
- **没配 TURN 就上线**：办公室网络（对称 NAT）下"演示环境能通、客户环境黑屏"——coturn 自建或买 TURN 服务，并看 `pc.connectionState` 与 `getStats()` 里 `relay` 类型候选的占比监控兜底命中；
- **addTrack 晚于 createOffer**：offer 里不含该轨道，需要重新协商——轨道要在 createOffer 前加完；
- **ontrack 里反复设置 srcObject**：同一 stream 重复赋值会闪黑，判等后再赋；
- hls.js 切换频道不 `destroy()`：解码器与缓冲堆积，几轮后内存爆；
- Safari 分支判断写反：要先 `Hls.isSupported()` 再看原生支持，顺序错了 iOS 上起两套解码。

## C. 图形与可视化

> 族群共性：把数据变成像素。三个子问题的不同组合决定了每个场景的形态——**数据有多少**（决定渲染技术分级）、**数据在哪**（2D 屏幕坐标 / 地理坐标 / 3D 空间）、**数据怎么变**（静态 / 动画 / 实时流）。React 在这族里主要负责"壳"：面板、图例、tooltip、状态管理；像素层由 SVG/Canvas/WebGL/地图引擎接管。

---

### C1. 大数据可视化（★★★★☆）

**是什么**。BI 大盘、监控曲线、散点矩阵、轨迹图——元素数量从几百到百万级的可视化。分水岭问题只有一个：**"你的图上有多少个图形元素？"** 这个数字直接决定技术选型。

**为什么难**。DOM 是为文档设计的：每个 SVG 元素都是一个 DOM 节点，浏览器要为它维护样式、布局、事件，1000 个节点的树可以，10 万个节点浏览器就开始窒息。另一头，图表库（ECharts 等）解决 80% 常规需求，剩下 20% 的深度定制（特殊图形、极端性能、特殊交互）必须理解渲染层原理自己写。

#### 核心技术逐项

**1. 渲染分级选型：SVG / Canvas2D / WebGL 的数量级依据与判据表**

三种渲染方式的本质差异在于**"元素由谁维护"**：

- **SVG**：每个图形是一个 DOM 节点，浏览器维护它的全部生命周期。好处是交互白送（DOM 事件/hover/无障碍/DOM 检查器可调试），坏处是每次几何变化都走一遍 style→layout→paint 流水线，节点一多（经验值 **1k** 上下）每次更新都卡；
- **Canvas2D**：一张位图，你用 JS 指令画上去，浏览器不记住任何元素——所以"哪个元素被点了"要自己算。每帧成本 = 全量重绘的成本，1w~10w 级别的散点/矩形在 10ms 内重绘没有压力（**1w~10w** 是舒适区，10w+ 需要配合分层缓存与脏矩形）；
- **WebGL**：GPU 并行渲染，瓶颈从"画多少像素/多少元素"变成"多少次 draw call 与顶点上传组织"。**100w+** 点位的舒适区——但条件是批量提交（把 100 万个点放进一个 buffer 一次画完，而不是一百万次调用）。

判据表（数量是主判据，但不是唯一）：

| 技术 | 元素数量级 | 每帧成本来源 | 交互/拾取 | 开发成本 | 典型场景 |
|---|---|---|---|---|---|
| SVG | < 1k | DOM 布局与样式重算 | DOM 事件白送 | 低 | 常规图表、示意图、需无障碍 |
| Canvas2D | 1w ~ 10w | JS 全量重绘 | 自己实现（几何/颜色编码） | 中 | 散点/热力/轨迹、表格自绘 |
| WebGL | 100w+ | draw call 数与顶点组织 | 框架内建拾取（deck.gl） | 高（用 deck.gl 降为低） | 海量点、地图叠加、3D |

三条辅助判据：**动态性**（每帧都在动 → 直接 Canvas/WebGL，SVG 的 DOM 开销乘以帧率）、**交互密度**（每个元素都要 hover → SVG 或颜色拾取）、**是否需要导出矢量**（SVG 天然可导出）。经验补充：Canvas 分层缓存（静态背景画在离屏 canvas，只重绘动态前景）能把 Canvas2D 的舒适区再抬一个数量级。

**2. D3 核心思想：它不是图表库**

一句话定性：**ECharts 给你成品（配置项 → 图表），D3 给你厨具（原语 → 自己组合出任何图）**。D3 的核心是两件原语：

- **比例尺（Scale）**：数据域 → 像素域的纯函数。`scaleLinear`（连续数值）、`scaleBand`（分类轴）、`scaleTime`、`scaleSqrt/Log`（压缩量级）。所有可视化的第一步都是"把数据翻译成像素"，比例尺就是这个翻译器；
- **数据连接（Data Join：enter-update-exit）**：把"数据数组的每一项"和"DOM 节点的每一个"建立一一对应，并处理三种状态——**enter**（新数据没有对应节点，要创建）、**update**（两边都有，更新属性即可）、**exit**（节点对应的数据没了，要移除）。这是"数据驱动 DOM"的原始形态——React 的 key + reconciler 干的是同一件事，D3 用手动 join、React 用声明式。

30 行示例（柱状图，把两个原语都用到）：

```ts
// d3Bars.ts
import * as d3 from 'd3';

type Datum = { name: string; value: number };

export function renderBars(svg: SVGSVGElement, data: Datum[]) {
  const width = 640, height = 360;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };

  // 原语一:比例尺 —— 数据域映射到像素域
  const x = d3.scaleBand()                       // 分类轴:名称 → x 像素
    .domain(data.map((d) => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.2);
  const y = d3.scaleLinear()                     // 连续轴:数值 → y 像素(注意 y 轴反向)
    .domain([0, d3.max(data, (d) => d.value) ?? 0]).nice()
    .range([height - margin.bottom, margin.top]);

  const svgSel = d3.select(svg).attr('viewBox', `0 0 ${width} ${height}`);

  // 原语二:数据连接 —— 数据 ↔ rect,以 name 为 key
  svgSel.selectAll<SVGRectElement, Datum>('rect')
    .data(data, (d) => d.name)
    .join('rect')                                // join = enter+update+exit 三态的语法糖
    .attr('x', (d) => x(d.name)!)
    .attr('width', x.bandwidth())
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => y(0) - y(d.value))
    .attr('fill', 'steelblue');

  svgSel.selectAll('g.axis-y').data([null]).join('g')
    .attr('class', 'axis-y')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));                       // 轴生成器也只是"原语拼装件"
  svgSel.selectAll('g.axis-x').data([null]).join('g')
    .attr('class', 'axis-x')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
}
```

把 `.join('rect')` 拆开就是经典三态写法，理解它就理解了 D3 的心脏：

```ts
const sel = svgSel.selectAll('rect').data(data, (d) => d.name);
sel.exit().remove();                    // exit:数据没了的节点 → 移除
sel.enter().append('rect')              // enter:新数据 → 创建节点(可做进场动画)
  .merge(sel as d3.Selection<SVGRectElement, Datum, SVGSVGElement, unknown>)
  .attr('x', (d) => x(d.name)!);        // update:新旧一起 → 更新到最新位置
```

在 React 项目里用 D3 的正确姿势：**React 负责 DOM（JSX 渲染节点），D3 只当数学库用（scale/shape/插值）**，避免两边抢 DOM：

```tsx
// ReactBars.tsx
import * as d3 from 'd3';

export function ReactBars({ data }: { data: { name: string; value: number }[] }) {
  const x = d3.scaleBand().domain(data.map((d) => d.name)).range([0, 640]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) ?? 0]).range([360, 0]);
  return (
    <svg viewBox="0 0 640 400">
      {data.map((d) => (
        <rect
          key={d.name}                           // React 的 key ≈ D3 的 join key
          x={x(d.name)}
          width={x.bandwidth()}
          y={y(d.value)}
          height={360 - y(d.value)}
          fill="steelblue"
        />
      ))}
    </svg>
  );
}
```

**3. deck.gl：大数据图层框架的概念**

deck.gl（Uber 开源）把 WebGL 的脏活封装成**图层（Layer）**抽象：你声明"数据 + accessor"（`getPosition`/`getFillColor`/`getRadius`），框架把数据批量上传 GPU buffer、每帧用 shader 绘制、按视口裁剪、并内建拾取。`@deck.gl/react` 提供 React 组件，可与 MapLibre/Mapbox 底图叠加（这也是 C2 的衔接点）。常用图层：`ScatterplotLayer`（点）、`ArcLayer`（弧线，OD 流向）、`HexagonLayer`（六边形聚合）、`HeatmapLayer`（热力）、`TripsLayer`（轨迹动画）。

```tsx
// MassivePoints.tsx —— 10 万点,WebGL 渲染 + 内建拾取
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';

const points = Array.from({ length: 100_000 }, () => ({
  lng: 121.3 + Math.random() * 0.25,
  lat: 31.1 + Math.random() * 0.12,
  value: Math.random(),
}));

export function MassivePoints() {
  const layer = new ScatterplotLayer({
    id: 'points',
    data: points,
    getPosition: (d: (typeof points)[number]) => [d.lng, d.lat], // accessor:怎么取坐标
    getRadius: (d) => 20 + d.value * 80,
    getFillColor: (d) => [56, 189, 248, 200],
    radiusUnits: 'meters',
    pickable: true,   // 内建拾取(颜色编码法):hover/click 直接拿到 object
  });
  return (
    <DeckGL
      initialViewState={{ longitude: 121.42, latitude: 31.16, zoom: 11 }}
      controller
      layers={[layer]}
      getTooltip={(info) =>
        info.object ? { html: `<b>值</b>: ${info.object.value.toFixed(3)}` } : null
      }
    />
  );
}
```

**4. LTTB 降采样：原理与"为什么形状不失真"**

场景：时序库里 100 万个点的曲线，而屏幕绘图区宽度只有 1000px——每个像素横跨 1000 个点。全画既卡（绘制成本）又错（一条竖直线上画 1000 个样本，折线被"填充"成多边形）。必须降采样，而**均匀采样（每 N 个取 1）有事故级风险：尖峰会消失**——监控图上的异常毛刺恰是最重要的信息，等距抽样很可能正好跳过它，看图的人得出"一切平稳"的错误结论。

**LTTB（Largest-Triangle-Three-Buckets，最大三角形三桶法）**的核心思想：

1. 把序列按目标点数分成若干桶（首尾点必选，保证起点终点不丢）；
2. 每个桶内选一个点，判据是：**"上一个已选点 → 候选点 → 下一桶所有点的平均点"构成的三角形面积最大**；
3. 面积大 ⇔ 候选点偏离"前后连线"越远 ⇔ 它对折线形状的贡献越大。

于是趋势被保留（面积衡量了偏离趋势线的程度），峰谷被优先保留（峰谷正是偏离趋势最远的点）——**采样结果在视觉上与全量数据几乎同形状**。O(n) 单遍扫描：

```ts
// lttb.ts —— Largest-Triangle-Three-Buckets
export function lttb(data: [number, number][], threshold: number): [number, number][] {
  if (threshold >= data.length || threshold < 3) return data;
  const sampled: [number, number][] = [];
  const every = (data.length - 2) / (threshold - 2); // 每桶宽度
  sampled.push(data[0]);                              // 首点必选

  let sampledIndex = 0;
  for (let i = 0; i < threshold - 2; i++) {
    // 下一桶的平均点(右锚点):三角形的第三顶点
    const avgStart = Math.floor((i + 1) * every) + 1;
    const avgEnd = Math.min(Math.floor((i + 2) * every) + 1, data.length);
    let avgX = 0, avgY = 0;
    for (let j = avgStart; j < avgEnd; j++) { avgX += data[j][0]; avgY += data[j][1]; }
    avgX /= avgEnd - avgStart;
    avgY /= avgEnd - avgStart;

    // 当前桶内选"三角形面积最大"的点
    const rangeStart = Math.floor(i * every) + 1;
    const rangeEnd = Math.min(Math.floor((i + 1) * every) + 1, data.length);
    const pointAX = data[sampledIndex][0], pointAY = data[sampledIndex][1];
    let maxArea = -1;
    for (let j = rangeStart; j < rangeEnd; j++) {
      // 三角形面积(叉积的一半);比较大小,绝对值保号
      const area =
        Math.abs((pointAX - avgX) * (data[j][1] - pointAY) -
                 (pointAX - data[j][0]) * (avgY - pointAY)) / 2;
      if (area > maxArea) {
        maxArea = area;
        sampledIndex = j;
      }
    }
    sampled.push(data[sampledIndex]);
  }
  sampled.push(data[data.length - 1]);                // 尾点必选
  return sampled;
}
```

配套纪律：**画图用采样点，tooltip 用原始数据**（按 x 最近邻查回真实样本），否则用户悬停看到的数值是"挑出来的点"而非真实点，会误导。

**5. 聚合：热力与 hexbin**

降采样用于**有序数据**（时序，看形状）；聚合用于**无序散点**（空间分布，看密度）：

- **热力（heatmap）**：每个点叠一个高斯核，密度越高叠加值越大，最后映射成色带。表达"哪里更密"，不区分任何单个点；
- **hexbin（六边形分箱）**：把平面铺六边形网格，统计每格内点数 → 映射为高度/颜色。六边形优于正方形的原因很几何：六边形的 6 个相邻格**中心距离全部相等**，统计梯度没有方向性偏差（正方形的对角邻居比边邻居远 √2 倍）。deck.gl 的 `HexagonLayer` 开箱即用：

```tsx
import { HexagonLayer } from '@deck.gl/layers';

const hexLayer = new HexagonLayer({
  id: 'hexbin',
  data: points,
  getPosition: (d: (typeof points)[number]) => [d.lng, d.lat],
  radius: 120,          // 六边形边长(米)
  elevationScale: 60,   // 数量映射高度:密度立体化
  extruded: true,
  pickable: true,
});
```

**6. tooltip 拾取两法（颜色编码拾取的原理）**

SVG 有 DOM 事件白送；Canvas/WebGL 要自己回答"鼠标下面是哪个元素"。

- **方法一：空间索引**。把点集建 KD-Tree（最近邻查询）或 R-tree（范围查询），点击时查"半径 5px 内最近的点"；不规则图形用包围盒 + 精确几何判断。数据变了要重建索引（可放 Worker）。适合"点为主、需要宽容拾取半径"的场景；
- **方法二：颜色编码拾取（color picking）**——原理很妙：**给每个元素分配一个唯一颜色（把它的 id 编码进 RGB 24bit，可编码 1677 万个 id），在离屏 canvas 上用这个颜色把所有元素再画一遍（几何完全相同）。点击时读鼠标位置 1 像素的颜色 → 解码出 id → 反查数据**。妙在：光栅化的过程本身就是一次"空间索引"的构建——"这个像素属于谁"这个问题，在画拾取图时已经被 GPU/光栅器逐像素回答过了，查询是 O(1)、与元素总数无关；不规则形状（多边形、粗线、弧）通吃，不用写任何几何判断。

```tsx
// ColorPickingScatter.tsx —— 10 万点 Canvas 散点 + 颜色编码拾取
import { useEffect, useRef, useState } from 'react';

interface Pt { id: number; x: number; y: number; value: number }

/** id → 唯一颜色(24bit 可编码 1600 万个 id;0 号色保留给背景) */
function idToColor(id: number): string {
  const r = (id >> 16) & 0xff, g = (id >> 8) & 0xff, b = id & 0xff;
  return `rgb(${r},${g},${b})`;
}
/** 读 1 像素颜色 → 反解 id */
function pickAt(pctx: CanvasRenderingContext2D, x: number, y: number): number | null {
  const [r, g, b] = pctx.getImageData(x, y, 1, 1).data;
  if (r === 0 && g === 0 && b === 0) return null;  // 背景色 = 没点中
  return (r << 16) | (g << 8) | b;
}

export function ColorPickingScatter({ data }: { data: Pt[] }) {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const pickRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Pt | null>(null);

  useEffect(() => {
    const W = 800, H = 600;
    const view = viewRef.current!, pick = pickRef.current!;
    const dpr = window.devicePixelRatio || 1;

    // 可见层:按 dpr 放大画布再缩放坐标系,保证高清
    view.width = W * dpr; view.height = H * dpr;
    const vctx = view.getContext('2d')!;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.clearRect(0, 0, W, H);

    // 拾取层:故意不放大,坐标即 CSS 像素,getImageData 免换算
    pick.width = W; pick.height = H;
    const pctx = pick.getContext('2d')!;
    pctx.clearRect(0, 0, W, H);

    data.forEach((p) => {
      vctx.fillStyle = 'rgba(56,189,248,0.7)';
      vctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      pctx.fillStyle = idToColor(p.id + 1);        // +1:避开 0 号背景色
      pctx.fillRect(p.x - 3, p.y - 3, 6, 6);       // 拾取半径略大,好点中
    });
  }, [data]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={viewRef}
        style={{ width: 800, height: 600 }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const id = pickAt(pickRef.current!.getContext('2d')!,
                            e.clientX - rect.left, e.clientY - rect.top);
          setHover(id == null ? null : data.find((p) => p.id === id - 1) ?? null);
        }}
      />
      <canvas ref={pickRef} style={{ display: 'none' }} /> {/* 拾取层不可见 */}
      {hover && (
        <div className="tooltip">点 #{hover.id}: {hover.value.toFixed(3)}</div>
      )}
    </div>
  );
}
```

颜色拾取的已知坑：Canvas2D 的几何抗锯齿**不可完全关闭**，元素边缘像素是"元素色与背景色的混合"，可能解出错误 id。对策：拾取判定加宽容（解出的 id 不存在时向四周 ±2px 多试几个像素）、点元素画成实心方块、或命中后做一次真实距离校验。WebGL 拾取 pass 可以直接关 MSAA 从根上解决。

**7. 图表联动**。多张图共享一个"视觉域"状态（brush 选中的 x 区间存在 store 里），每张图的比例尺 domain 派生自它——brush 一动全图过滤。实现上是纯 React 状态问题，难点只在"比例尺 domain 联动时的动画平滑"（用 CSS transition 过渡 domain 数值，或 ECharts 的 dataZoom）。

**代表**：BI 大盘（Superset/Grafana）、地图大屏（衔接 C2 与前进阶大纲第 4 章）。

**入手路径**（对应大纲"Canvas 渲染 10 万散点 + 框选缩放"）：

1. 同一份 10 万点数据写两个版本：SVG 循环 append、Canvas 全量重绘，打开 Chrome Performance 面板录一段拖拽，对比帧率与脚本耗时（体感判据表的含义）；
2. 给 Canvas 版加颜色编码拾取 tooltip，再实现框选缩放（记录起止矩形 → 数据域过滤 → 重算比例尺重绘）；
3. 用 LTTB 把一条 100 万点监控曲线降到 2000 点，与均匀采样对比同一处尖峰的保留情况；
4. 用 deck.gl 重做第 2 步（10 行换掉你 200 行），体会框架封装的边界。

**验收物**：一个页面三个 Tab：SVG 版（1 万点开始卡）、Canvas 版（10 万点顺滑 + 拾取 + 框选缩放）、deck.gl 版（100 万点可交互），附 Performance 对比截图。

**常见坑**：

- Canvas 忘乘 `devicePixelRatio`：高分屏上全线发虚（上面代码的 `setTransform(dpr,...)` 是标准解法）；
- 每次点击都 `getImageData`（而不是只读 1px）：强制同步读回 GPU 缓冲，帧率骤降；
- 降采样后 tooltip 直接用采样点：数值失真，必须回查原始数据；
- SVG 图表里对成千上万个元素逐个绑 DOM 事件：改用容器级事件 + 命中计算，或干脆换渲染分级；
- 框选缩放后忘了"重置缩放"（比例尺 domain 回不去），用户被锁死在细节里。

---

### C2. 地图 GIS（★★★★☆）

**是什么**。物流轨迹大屏、出行热力、选址分析、数据大屏的"地理底座"。代表：物流、出行、数据大屏。技术核心是 MapLibre / Mapbox GL 这类**矢量瓦片渲染引擎**，难点则是地理学的三座山：瓦片体系（数据量）、坐标系（国内火星坐标）、海量点性能。

**为什么难**。地理数据天然巨大（全国路网几十 GB）、坐标体系不统一（国内法规导致的偏移坐标系是"业务大坑"）、而地图又是"每帧都在动"的渲染场景。

#### 核心技术逐项

**1. 矢量瓦片原理（本场景的地基）**

**为什么不能一次加载全国数据？** 算一笔账就懂：

- 全国路网 + POI + 水系 + 建筑物的 GeoJSON 粗略 5~15GB。下载：即使 20MB/s 也要十分钟；解析：浏览器 `JSON.parse` 一个 1GB 文本，峰值内存 2~4GB（源字符串 + 解析出的对象树），移动端直接页面崩溃；
- 而用户当屏看到的只是某座城市的一小块——为看一个路口付出全国数据的代价，工程上不成立。

**切片（tile）思想**：Web 墨卡托投影把世界铺成一张正方形大图（z=0 时 256×256px，覆盖全世界）。金字塔按缩放级 z 切分：

- z 级的瓦片数 = `4^z`：z0 是 1 张全世界，z5 是 1024 张，z14 约 2.7 亿张；每张瓦片固定 256/512px，用 `(z, x, y)` 三元组唯一索引；
- 相邻级分辨率翻倍：z+1 的一张瓦片覆盖 z 级一张的 1/4 区域、内容细节翻倍——这就是 **LOD（Level of Detail，细节层次）**；
- 每级还做**要素重要性过滤**：z5 只画省界/国道/大城市名，z15 才有楼块轮廓/小巷/门牌点——否则单张瓦片要素数爆炸。

**矢量瓦片 vs 栅格瓦片**：

| | 栅格瓦片 | 矢量瓦片 |
|---|---|---|
| 传输内容 | 服务端渲染好的 PNG/JPEG 图片 | MVT（Mapbox Vector Tile，protobuf 编码的裁剪后几何+属性） |
| 前端成本 | 近零（贴图即可） | GPU 实时渲染（引擎做，但耗电/耗性能） |
| 样式 | 服务端写死，换主题=重渲染全部瓦片 | 运行时改 style JSON 即换肤 |
| 高分屏/旋转 | 发糊、不能任意旋转倾斜 | 矢量无限清晰、任意视角 |
| 交互查询 | 像素而已，无法查要素 | `queryRenderedFeatures` 直接查属性 |

**前端如何按视口请求可见瓦片**：引擎每帧算出视口四角的经纬度 bounds + 当前 zoom → 换算出可见的 `(z,x,y)` 列表 → 按距屏幕中心优先级请求 → LRU 缓存淘汰；新瓦片未到时先显示父级瓦片放大兜底（overzoom）。换算公式（slippy map tilenames 标准）：

```ts
// tiles.ts —— 经纬度 → 瓦片坐标,以及"当前视口需要哪些瓦片"
export function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);                 // 经度线性映射
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(                                           // 纬度墨卡托(非线性)
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return [x, y];
}

/** 视口四角经纬度 → 覆盖的瓦片范围([[w,s],[e,n]] 为 bounds) */
export function visibleTiles(
  bounds: [[number, number], [number, number]],
  z: number,
): [number, number, number][] {
  const [[w, s], [e, n]] = bounds;
  const [x0, y1] = lngLatToTile(w, n, z);  // 西北角
  const [x1, y0] = lngLatToTile(e, s, z);  // 东南角
  const tiles: [number, number, number][] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push([z, x, y]);
  }
  return tiles; // 实际请求 URL 模板:/{z}/{x}/{y}.pbf,按离屏幕中心距离排序发请求
}
```

**2. WGS84 vs GCJ02 火星坐标（国内业务大坑）**

**坐标系是什么**：给地球上位置标号的参照系。前端必碰的三个：

- **WGS84**：GPS 卫星和绝大多数国际地图（OpenStreetMap、Google 地球）使用的国际标准经纬度。GPS 芯片、手机传感器吐出来的原始坐标就是它；
- **GCJ02**（"火星坐标"）：国家测绘局 02 标准要求国内互联网地图对真实坐标做**非线性加密偏移**后的坐标系。高德、腾讯、Google 中国区底图都是 GCJ02。偏移量因地点而异（约 100~700 米），算法不公开；
- **BD09**：百度在 GCJ02 基础上再偏一次，仅百度系使用。

**为什么存在**：国内测绘法规要求——公开地图数据必须经过非线性偏移才能上线，相当于给全国地图加了一层"防盗用/防直接测绘"的扰动。

**忘了会怎样**（每一条都是真实事故模板）：

- GPS 硬件回传的 WGS84 点直接画在高德底图（GCJ02）上：定位点整体漂移几百米，人"站在河里"、车"开进楼里"；
- 轨迹不贴路：GPS 轨迹是 WGS84，路网底图是 GCJ02，叠加后轨迹与道路平行偏开——很多人误以为要做"轨迹纠偏算法"，其实先查坐标系；
- 行政区边界、地理围栏、附近网点计算全部错位；导出 GeoJSON 给第三方系统，对方坐标系不同则全错。

**怎么转换**：WGS84→GCJ02 有社区逆向出的公开近似公式（精度 1~2 米，工程够用）；GCJ02→WGS84 因为偏移非线性**没有精确解析逆解**，用迭代逼近：

```ts
// gcj02.ts —— WGS84 <-> GCJ02 社区公开近似实现(精度约 1~2 米)
const PI = 3.14159265358979324;
const A = 6378245.0;               // 克拉索夫斯基椭球长半轴
const EE = 0.00669342162296594323; // 椭球第一偏心率平方

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  ret += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return ret;
}
function transformLon(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  ret += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
  return ret;
}

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271; // 境外不加偏
}

/** WGS84(GPS 原始)→ GCJ02(高德/腾讯底图) */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLon(lng - 105, lat - 35);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

/** GCJ02 → WGS84:偏移非线性、无解析逆,迭代逼近(5 次已收敛到厘米级) */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  let wgsLng = lng, wgsLat = lat;
  for (let i = 0; i < 5; i++) {
    const [gLng, gLat] = wgs84ToGcj02(wgsLng, wgsLat);
    wgsLng += lng - gLng; // 用正变换的误差修正估值
    wgsLat += lat - gLat;
  }
  return [wgsLng, wgsLat];
}
```

工程纪律：**项目第一周就定死坐标系约定**（建议：数据库统一存 WGS84，渲染层按当前底图类型转换），并在代码里用类型区分（`type Wgs84Coord = readonly [number, number]` 与 `type Gcj02Coord` 互不兼容），让"拿错坐标系"变成编译错误而不是线上事故。

**3. 海量点：Worker 端点聚合**

10 万个点即使 WebGL 画得动，信息上也是一坨密度噪点（缩小时全部重叠）。**聚合（clustering）**把密度编码为圆的大小，同时把渲染量降到几十个聚合圆。难点：每次缩放/平移都要重新聚合，在主线程做会卡帧——所以聚合下沉 Worker。事实标准是 supercluster（Mapbox 系）：load 时按 zoom 分层预建 KD-Tree 索引，之后每次查询 `getClusters(bbox, zoom)` 都近乎免费：

```ts
// cluster.worker.ts —— 在 Worker 里建索引与查询
import * as Comlink from 'comlink';
import Supercluster from 'supercluster';

const index = new Supercluster({ radius: 50, maxZoom: 16 });

const api = {
  /** 主线程把点集交进来(结构化克隆),只此一次重活 */
  load(points: GeoJSON.Feature[]) {
    index.load(points);
  },
  /** 每次视口变化查询:返回聚合圆(或未聚合的原始点) */
  query(bbox: [number, number, number, number], zoom: number) {
    return index.getClusters(bbox, Math.round(zoom));
  },
  /** 点击聚合圆:算出展开它需要的最小 zoom(动画飞入下一层) */
  expansionZoom(clusterId: number) {
    return index.getClusterExpansionZoom(clusterId);
  },
};

export type ClusterApi = typeof api;
Comlink.expose(api);
```

```ts
// map.ts —— 主线程侧
import * as Comlink from 'comlink';
import type { ClusterApi } from './cluster.worker';

const worker = new Worker(new URL('./cluster.worker.ts', import.meta.url), { type: 'module' });
const clusterApi = Comlink.wrap<ClusterApi>(worker);

// 初始化:灌一次数据
await clusterApi.load(pointFeatures);
// 地图 moveend:查当前视口聚合结果,再 setData 进 GeoJSON source
const features = await clusterApi.query(
  bounds.toArray() as [number, number, number, number],
  map.getZoom(),
);
(map.getSource('points') as maplibregl.GeoJSONSource)?.setData({
  type: 'FeatureCollection',
  features: features as GeoJSON.Feature[],
});
```

捷径：MapLibre 的 GeoJSON source 原生 `cluster: true` 选项（内部就是 supercluster + worker），自建 worker 是为了"聚合结果还要参与业务计算（按聚合统计指标）"的场景。

**4. 轨迹回放**

数据是带时间戳的点序列（车载设备每几秒上报一条）。回放 = 把"时间进度"映射成"位置插值"，用 rAF 驱动：

```tsx
// useReplay.tsx —— 轨迹回放:rAF + 相邻点线性插值
import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

export function useReplay(
  map: maplibregl.Map,
  track: { lng: number; lat: number; t: number }[], // 按 t 升序
  speed = 8,                                        // 倍速:8 = 8 倍速回放
) {
  useEffect(() => {
    const first = track[0], last = track[track.length - 1];
    const marker = new maplibregl.Marker().setLngLat([first.lng, first.lat]).addTo(map);
    let raf = 0, elapsed = 0, lastTs = performance.now();

    /** 二分找 t 所在段,段内线性插值出坐标 */
    function positionAt(t: number): [number, number] {
      let lo = 0, hi = track.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (track[mid].t < t) lo = mid + 1; else hi = mid;
      }
      const prev = track[Math.max(0, lo - 1)], cur = track[lo];
      const ratio = cur.t === prev.t ? 0 : (t - prev.t) / (cur.t - prev.t);
      return [
        prev.lng + (cur.lng - prev.lng) * ratio,
        prev.lat + (cur.lat - prev.lat) * ratio,
      ];
    }

    function step(ts: number) {
      elapsed += ((ts - lastTs) / 1000) * speed; // 真实时间 × 倍速 = 回放时间
      lastTs = ts;
      const t = Math.min(first.t + elapsed, last.t);
      marker.setLngLat(positionAt(t));
      if (t < last.t) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); marker.remove(); };
  }, [map, track, speed]);
}
```

工程细节：倍速切换就是改 `speed` 累加速率；"已走轨迹渐显"用一条 LineString 源，每帧 `setData` 更新已走过的子串；设备休眠造成的长时间断点要按 t 跳段而不是匀速爬。

**5. 行政区下钻（GeoJSON）**

数据：按行政区划代码（adcode，国标 6 位：省 2 位 + 市 2 位 + 县 2 位）预切好的边界 GeoJSON。交互链路：点击省 → `e.features[0].properties.adcode` → 拉取该 adcode 下一级 GeoJSON → `setData` 替换 → `fitBounds` 飞入。性能点：全国边界百万坐标点，必须先抽稀（`turf.simplify`）再渲染：

```ts
// 下钻点击处理(maplibregl;bbox 来自 @turf/turf)
map.on('click', 'district-fill', (e) => {
  const adcode = e.features?.[0]?.properties?.adcode as number | undefined;
  if (!adcode) return;
  fetch(`/geo/districts/${adcode}.json`)     // 预生成的下一级边界
    .then((r) => r.json())
    .then((geojson: GeoJSON.FeatureCollection) => {
      (map.getSource('districts') as maplibregl.GeoJSONSource).setData(geojson);
      map.fitBounds(bbox(geojson) as [number, number, number, number], {
        padding: 40,
        duration: 600,
      });
    });
});
```

**6. 空间计算：点在多边形内（射线法）**

"这个点属于哪个行政区/围栏？"的基础算法。**射线法（ray casting）**：从待测点向右水平引一条射线，数它与多边形各边的交点——奇数个交点在内部，偶数在外部。直觉：每穿过一条边界就"进出切换一次"，走奇数次说明最终停在内部。O(边数)，城市级范围经纬度可直接当平面坐标：

```ts
// pointInPolygon.ts —— 射线法(经典 PNPOLY 写法)
export function pointInPolygon(pt: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    // 条件一:边 i-j 跨过 pt 的水平线(一端在上、一端在下)
    // 条件二:边与水平线的交点在 pt 右侧(只数向右的射线)
    const intersect = yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside; // 每交一次切换内外状态
  }
  return inside;
}
```

生产建议：直接用 `@turf/turf` 的 `booleanPointInPolygon`（同算法、处理了多环 polygon 的洞）；海量点 × 海量多边形时先用 R-tree 对多边形建空间索引再逐个判断。

**代表**：物流（轨迹/围栏）、出行（热力/供需大屏）、数据大屏（衔接前进阶大纲第 4 章）。

**入手路径**（对应大纲"海量点聚合 + 行政区下钻 + 轨迹回放"）：

1. MapLibre + 免费底图（MapLibre Demo Tiles）跑通第一个地图页，理解 camera（center/zoom/bearing/pitch）；
2. 造 5 万个点，先直接画（看它卡/乱），再接 supercluster worker 聚合，点击聚合圆 `getClusterExpansionZoom` 下钻；
3. 省级 GeoJSON 下钻到市：点击省 → 加载市界 → fitBounds 飞入，加面包屑返回；
4. 给一条 1000 点的模拟轨迹做 8 倍速回放（marker + 已走轨迹渐显）；
5. 坐标系练习：GPS 原始 WGS84 点画上高德底图，肉眼确认偏移，用 `wgs84ToGcj02` 修正。

**验收物**：一个地图页：10 万点聚合流畅（缩放不卡帧）、省→市→县下钻、轨迹倍速回放、点在行政区内的 hover 提示，全程坐标系正确。

**常见坑**：

- **坐标系混用**（本场景第一大坑）：接任何新数据源先问"这是 84 还是 02"；
- worker 与主线程传大数组没用 Transferable/直接传字符串：结构化克隆大 GeoJSON 也要几十毫秒，用 `Float64Array` + transfer 零拷贝；
- 矢量瓦片 style 里 glyphs（字体）与 sprite（图标）跨域没配 CORS：文字与图标全部渲染失败，但地图"看起来正常"；
- 容器尺寸变化后没调 `map.resize()`：地图残缺、瓦片缺失；
- 经纬度顺序写反：GeoJSON 规范是 `[lng, lat]`，与直觉（先纬度）相反，反了地图飞到海里。

---

### C3. 3D / 数字孪生（★★★★★）

**是什么**。数字孪生大屏（楼宇/工厂/园区的 3D 模型 + 实时 IoT 数据映射为视觉状态）、3D 商品展示（电商 360° 看货）、互动营销（3D 活动页）。代表：数字孪生大屏、3D 商品展示、互动营销。

**为什么难**。3D 是一个几乎全新的技术栈：场景图、相机矩阵、材质光照、资产管线、GPU 性能模型——前端知识大面积清零。好消息是 r3f 把 React 的心智模型带进了 3D，学习曲线被大幅削平。

#### 核心技术逐项

**1. three.js 基础五件：场景 / 相机 / 材质 / 光照 / 射线拾取**

原生写法（看懂它，才能理解 r3f 帮你省了什么）：

```ts
// hello-three.ts —— 原生 three.js 最小完整程序
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('app')!;

// ① 场景(Scene):存放一切 3D 对象的容器,本质是一棵「场景图」树
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1020');

// ② 相机(PerspectiveCamera):定义「从哪里、以什么视角看」
//    fov 视场角 / aspect 宽高比 / near、far 裁剪面(太近太远都裁掉)
const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  1000,
);
camera.position.set(4, 4, 6);
camera.lookAt(0, 0, 0);

// ③ 物体(Mesh)= 几何(Geometry:形状)+ 材质(Material:表面外观)
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshStandardMaterial({ color: '#4f7cff' }), // PBR 材质:受光照影响
);
scene.add(box);

// ④ 光照:没有光,MeshStandardMaterial 就是一团黑
scene.add(new THREE.AmbientLight('#ffffff', 0.4));      // 环境光:打底,无方向
const dir = new THREE.DirectionalLight('#ffffff', 1.2); // 平行光:像太阳,有方向
dir.position.set(3, 5, 2);
scene.add(dir);

// ⑤ 渲染器与循环:每帧把场景从相机视角画出来
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);
new OrbitControls(camera, renderer.domElement);          // 鼠标轨道控制(拖转缩放)

function tick() {
  box.rotation.y += 0.01;                                // 每帧转一点
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
```

五件各自的"一句话"：

- **场景**：对象树，父子关系携带变换（移动父级带动子级）；
- **相机**：一台虚拟相机，透视相机的四个参数决定"3D 世界如何投影成 2D 画面"；
- **材质**：同一几何配不同材质是不同外观——`MeshBasicMaterial` 不受光（做 UI 辅助线）、`MeshStandardMaterial` 是 PBR（真实感标配）；
- **光照**：环境光打基础亮度、平行光造立体感、点光源做灯效；没有光 = 全黑是新手第一坑；
- **射线拾取（Raycaster）**：3D 里"点击了哪个物体"的解法——把屏幕点击坐标换算成一条从相机发出的射线，与场景中物体的包围盒/三角面求交，最近的交点即被点击对象。

原生拾取代码（r3f 的 onClick 底下就是它）：

```ts
// raycast.ts —— 屏幕点击 → 3D 物体
import * as THREE from 'three';

export function setupPicking(
  canvas: HTMLCanvasElement, camera: THREE.Camera, scene: THREE.Scene,
  onPick: (mesh: THREE.Object3D) => void,
) {
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,   // 屏幕 → NDC 归一化坐标
      -((e.clientY - rect.top) / rect.height) * 2 + 1,  // 注意 y 轴方向翻转
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);                // 相机 + NDC → 世界射线
    const hits = raycaster.intersectObjects(scene.children, true); // true = 递归子级
    if (hits.length > 0) onPick(hits[0].object);         // 最近的交点即被点对象
  });
}
```

**2. react-three-fiber：声明式 3D（与原生的对比）**

r3f 是一个把 React 渲染到 three 对象树上的渲染器（reconciler）——JSX 里的小写组件名就是 three 的类名（`<mesh>`、`<boxGeometry>`、`<meshStandardMaterial>`）。同一个旋转方块：

```tsx
// HelloR3F.tsx —— 与上面原生版功能等价
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function HelloR3F() {
  return (
    <Canvas camera={{ position: [4, 4, 6], fov: 60 }}>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#4f7cff" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
```

价值不在少打字，而在**心智模型**：场景图变成了可组合的组件树——状态驱动（`color={status}`）、Suspense 加载、hook 复用、与 React DevTools/生态全部兼容。事件也声明式化了：`<mesh onClick={(e) => { e.stopPropagation(); ... }}>`，r3f 内部完成 raycast。

**drei 生态价值**：r3f 的"瑞士军刀"库，把 3D 常用件组件化——`OrbitControls`（轨道控制）、`Environment`（一键环境光照贴图）、`Html`（把 DOM 面板挂进 3D 场景，信息面板神器）、`useGLTF`/`useTexture`（加载 + Suspense）、`Detailed`（LOD）、`Instances`、`Text`、`Stats`。用 r3f 不用 drei 等于只用半个生态。

**3. 模型管线：GLTF + Draco / meshopt**

GLTF/GLB 是 3D 资产交换的行业标准（"3D 界的 JPEG"）：网格、材质、贴图、骨架动画打包一个文件。数字孪生的楼宇模型从设计软件导出动辄 50MB+，必须压缩：

- **Draco**：几何压缩（顶点属性重编码），体积常降到 1/5~1/10，解码在 CPU——适合静态资产；
- **meshopt**：为 GPU 顶点拉取优化的压缩，解码更快，与 Draco 常搭配用；
- **KTX2/Basis**（认知即可）：纹理的 GPU 压缩格式，省显存。

制图管线一般是：Blender 导出 → `gltf-transform` CLI 优化（去重顶点/合并/压缩/缩贴图）→ glb 上 CDN。前端加载：

```tsx
// Building.tsx
import { useGLTF } from '@react-three/drei';

export function Building() {
  // 第二参数指定 Draco decoder 路径(默认从 CDN 拉,内网必须本地托管 /draco/)
  // meshopt 解码默认启用;drei 处理了挂起(Suspense)与缓存
  const { scene } = useGLTF('/models/building.glb', '/draco/');
  return <primitive object={scene} />;  // primitive:把现成 three 对象塞进场景树
}
```

**4. 性能：Instancing 与 LOD**

- **Instancing（实例化）**：先建立性能模型——CPU 每次向 GPU 提交一次绘制命令（draw call），1 万个 mesh 就是 1 万次 draw call，CPU 先于 GPU 成为瓶颈。`InstancedMesh` 让**同一几何一次 draw call 画 N 个实例**，每个实例一份变换矩阵（+可选逐实例颜色）。数字孪生里的一万个传感器指示灯就是标准场景：

```tsx
// SensorInstances.tsx —— 1 万个传感器点,1 次 draw call
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SensorInstances({
  data,
}: {
  data: { x: number; y: number; z: number; alarm: boolean }[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    data.forEach((d, i) => {
      m.setPosition(d.x, d.y, d.z);   // 每个实例自己的位置
      mesh.setMatrixAt(i, m);         // 写进实例矩阵缓冲
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [data]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // 逐实例着色:告警变红(直接写 GPU 缓冲,1 万条状态不进 React state)
    for (let i = 0; i < data.length; i++) {
      const alarm = data[i].alarm || (i + Math.floor(clock.elapsedTime)) % 97 === 0;
      color.set(alarm ? '#ef4444' : '#38bdf8');
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    // args = [geometry, material, count]:前两个由子组件提供,传 undefined 占位
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      <sphereGeometry args={[0.08, 12, 12]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
```

- **LOD（Level of Detail）**：远处低模、近处高模——屏幕上只占几十像素的模型用几万个面纯属浪费。three 的 `THREE.LOD` 在 drei 里是 `<Detailed distances={[0, 30, 120]}>`，按相机距离自动切换子级：

```tsx
import { Detailed } from '@react-three/drei';

<Detailed distances={[0, 30, 120]}>
  <BuildingHighPoly />   {/* 0~30:全细节 */}
  <BuildingMidPoly />    {/* 30~120:中模 */}
  <BuildingLowPoly />    {/* 120+:低模 */}
</Detailed>
```

**5. shader 入门定位**

shader 是跑在 GPU 上的两段小程序：**顶点着色器**（每个顶点执行一次：位移/波动/形变）与**片元着色器**（每个像素执行一次：颜色/光照/图案）。数字孪生的高频需求都靠它：扫描波（告警雷达扫过楼栋）、流光渐变、风场粒子、轮廓发光。

务实的入门定位（不搞错方向）：目标是**能看懂 GLSL、能调 uniforms、能往标准材质里注入片段**——three 的 `MeshStandardMaterial.onBeforeCompile` 允许替换/注入着色器代码，实现"保留 PBR 光照 + 叠加自定义效果"，这已覆盖 90% 的孪生视觉需求。从零手写完整光照管线是图形程序员的路线，前端不必。

**6. 模型与数据联动：设备状态着色（数字孪生核心回路）**

完整回路：IoT 网关 WebSocket 推 `{deviceId, status}` → 状态映射视觉（正常蓝/离线灰/告警红 + 呼吸自发光）→ 点击房间（raycast）→ 信息面板。这就是"数字孪生"区别于"3D 演示"的地方：**模型是数据的皮，数据是模型的魂**。

```tsx
// TwinScene.tsx —— 楼宇孪生:房间点击高亮 + 设备状态着色
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type DeviceStatus = 'normal' | 'warn' | 'offline';
const STATUS_COLOR: Record<DeviceStatus, string> = {
  normal: '#38bdf8',
  warn: '#ef4444',
  offline: '#64748b',
};

function Room({ name, position, status, selected, onSelect }: {
  name: string;
  position: [number, number, number];
  status: DeviceStatus;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  // 告警状态:自发光呼吸(useFrame 直改材质,不走 React 渲染)
  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    if (status === 'warn') {
      mat.emissive.set('#ef4444');
      mat.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(clock.elapsedTime * 3));
    } else {
      mat.emissive.set(selected ? '#facc15' : '#000000');
      mat.emissiveIntensity = selected ? 0.6 : 0;
    }
  });
  return (
    <mesh
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect(name); }}  // r3f 内建射线拾取
    >
      <boxGeometry args={[1, 0.6, 1]} />
      <meshStandardMaterial ref={matRef} color={STATUS_COLOR[status]} />
    </mesh>
  );
}

export function TwinScene() {
  const [selected, setSelected] = useState<string | null>(null);
  const [devices, setDevices] = useState<Record<string, DeviceStatus>>({
    '101': 'normal', '102': 'warn', '103': 'offline',
  });

  // IoT 推送 → 状态(真实项目接 WebSocket,这里用定时器模拟状态流转)
  useEffect(() => {
    const timer = setInterval(() => {
      setDevices((prev) => ({ ...prev, '101': Math.random() > 0.8 ? 'warn' : 'normal' }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Canvas camera={{ position: [3, 4, 6], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      {Object.entries(devices).map(([room, status], i) => (
        <Room
          key={room}
          name={room}
          position={[(i - 1) * 1.4, 0, 0]}
          status={status}
          selected={selected === room}
          onSelect={setSelected}
        />
      ))}
      {selected && (
        <Html position={[0, 1.6, 0]}>
          <div className="panel">房间 {selected} · {devices[selected]}</div>
        </Html>
      )}
      <OrbitControls />
    </Canvas>
  );
}
```

**代表**：数字孪生大屏（智慧园区/工厂/楼宇）、3D 商品展示（电商看鞋看房）、互动营销（3D 活动页）。

**入手路径**（对应大纲"r3f 加载 GLTF 楼宇模型，点击房间高亮并弹信息面板"）：

1. 过 r3f 文档的"Basics"，用 r3f 重做 three 官方第一个旋转方块，理解"JSX 组件 = 场景图节点"；
2. 给场景加 OrbitControls/光照/环境贴图，试着删掉每一样看后果（建立手感）；
3. 免费模型（Sketchfab 可下载的 CC 楼宇模型）走 gltf-transform 压缩管线，`useGLTF` 加载，对比压缩前后体积与首帧时间；
4. 实现点击房间高亮（onClick + 材质 emissive）+ `Html` 信息面板；
5. 加数据回路：setInterval 模拟 IoT 推送驱动颜色/呼吸告警；再上 InstancedMesh 放 1 万个状态点做性能压测。

**验收物**：一个孪生页：加载压缩后的 GLB 楼宇、点击房间高亮 + 信息面板、模拟数据驱动告警呼吸灯、1 万实例点不降帧、页面卸载无 WebGL context 泄漏。

**常见坑**：

- **忘记加光照**：`MeshStandardMaterial` 无光全黑，第一坑；调试可先换 `MeshBasicMaterial` 排除光照因素；
- **canvas 容器高度为 0**（父级没定高）：黑屏但无报错，先查布局再查 3D；
- **useFrame 里 setState**：每帧触发 React 渲染，帧率腰斩——帧循环内直接用 ref 改 three 对象，React 状态只管"低频结构"（选中项、面板开关）；
- **共享材质连坐**：GLTF 里多个 mesh 常共享同一 material 实例，改一个颜色全部变——改前 `material.clone()`；
- 模型坐标系 Z-up（Blender）vs Y-up（three）：模型"躺倒"或"侧翻"，用 `rotation-x={-Math.PI / 2}` 或导出时转换；
- 组件卸载不释放：geometry/material/texture 要 dispose（r3f 自动处理 JSX 声明的，`primitive` 塞入的对象要自己管）。

---

### C4. 高阶动画体系（★★★☆☆）

**是什么**。把"会动"从零散的 CSS 片段提升为体系：布局/共享元素过渡（FLIP 与 View Transitions）、滚动驱动动画、物理动画（spring）、设计系统层面的动画 token、大列表进出动画。

**为什么难**。三个结构性难题：**跨容器/跨路由的"同一个元素"过渡**（DOM 已经重建，常规 transition 失效）；**动画性能**（改 `width/top` 触发 layout，掉帧）；**一致性**（全站几百处动画的时长缓动各写各的，产品没有"统一的节奏感"）。以及容易被遗忘的**可访问性**（`prefers-reduced-motion`）。

#### 核心技术逐项

**1. FLIP：原理与手写**

浏览器里动画分两档：改布局属性（`top/left/width/height/margin`）每帧都触发 layout，主线程忙死；改 `transform/opacity` 只走合成器（GPU），丝滑。**FLIP 是把"必须发生的布局变化"偷换成"transform 动画"的技术**，四个字母是四步：

- **F**irst：元素变化前，记录旧位置尺寸（`getBoundingClientRect`）；
- **L**ast：让浏览器正常重排，得到新位置尺寸；
- **I**nvert：立刻用 `transform` 把元素从新位置**反向拉回旧位置**——视觉上它还在原地；
- **P**lay：把 transform 动画到 none，元素"滑"到新位置。全程不触发 layout。

完整手写（排序相册网格）：

```tsx
// FlipGrid.tsx —— 手写 FLIP,无任何动画库依赖
import { useLayoutEffect, useRef, useState } from 'react';

/** 容器内所有带 data-flip-id 的元素,在 deps 变化引发重排后做 FLIP 补间 */
function useFlip(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nextRects = new Map<string, DOMRect>();

    container.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => {
      const id = el.dataset.flipId!;
      const last = el.getBoundingClientRect();   // Last:新布局
      nextRects.set(id, last);

      const first = firstRects.current.get(id);  // First:上一轮记录的旧布局
      if (!first) return;
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / Math.max(last.width, 1);
      const sy = first.height / Math.max(last.height, 1);
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01) return; // 没动

      // Invert:先瞬移回旧位置(transform 不触发 layout)
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      // 强制同步布局:确保 Invert 先渲染生效,再开始 Play
      el.getBoundingClientRect();
      // Play:放开 transform,过渡回真实位置(GPU 合成)
      el.style.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
      el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
    });
    firstRects.current = nextRects; // 本轮结果成为下一轮的 First
  }, deps);

  return containerRef;
}

export function FlipGrid() {
  const [items, setItems] = useState(() =>
    Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, hot: 9 - i })),
  );
  const containerRef = useFlip([items]);
  return (
    <div>
      <button onClick={() => setItems((prev) => [...prev].reverse())}>倒序</button>
      <div
        ref={containerRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: 12 }}
      >
        {items.map((it) => (
          <img
            key={it.id}
            data-flip-id={it.id}
            src={`/photos/${it.id}.jpg`}
            alt={`热度 ${it.hot}`}
            width={120}
            height={120}
          />
        ))}
      </div>
    </div>
  );
}
```

**共享元素过渡**是 FLIP 的进阶应用：列表小图 → 详情大图是**两个不同的 DOM 节点**（甚至不同路由），常规 transition 无从谈起。做法：对两个节点分别做 FLIP——旧节点 Invert 到新位置同时淡出、新节点从旧位置 Invert 过来同时淡入，用户看到"同一张图放大了"。framer-motion 的 `layoutId` 就是自动化这套。

**2. View Transitions API：浏览器原生的"自动 FLIP"**

`document.startViewTransition(callback)` 的工作方式：给当前页面**截图**（旧快照）→ 执行 callback 改 DOM → 对新状态再截图 → 浏览器自动对两张快照做补间（交叉淡入）。如果新旧状态里存在**同名的 `view-transition-name` 元素**，浏览器自动对它做 FLIP（位置尺寸补间）——这就是**跨路由共享元素过渡**的原生解法。

与 FLIP 的关系：View Transitions 本质是"**浏览器代劳的截图版 FLIP**"——你不用手动测量（浏览器拿的是快照），连 DOM 动画都不发生；手写 FLIP 兼容一切浏览器、可控每一帧细节，View Transitions 省事但有兼容门槛（Chromium 全系、Safari 18+，Firefox 推进中）。

React 路由集成（SPA 内跨路由共享元素）：

```tsx
// useViewTransitionNavigate.tsx —— 路由跳转包一层 View Transition
import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback((to: string) => {
    if (!('startViewTransition' in document)) {
      navigate(to); // 不支持:直接降级为无动画跳转
      return;
    }
    document.startViewTransition(() => {
      // React 状态更新是异步的,必须 flushSync 让 DOM 在回调内同步更新完
      // 否则浏览器截图的还是旧页面
      flushSync(() => navigate(to));
    });
  }, [navigate]);
}
```

```css
/* view-transitions.css —— 定制过渡 */
/* 列表页与详情页都有 class="hero-img" 的图:同名即共享元素 */
.hero-img {
  view-transition-name: hero;
}
/* 整页默认是交叉淡入,这里定制节奏 */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 240ms;
}
/* hero 元素:快照自动做位置/尺寸补间,再补一个节奏 */
::view-transition-group(hero) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
```

**3. scroll-driven animations（CSS 滚动驱动动画）**

老方法：监听 `scroll` 事件 + `getBoundingClientRect` 算进度再改样式——主线程抖动、被动。新的 CSS 原生方案让**滚动位置本身成为动画的时间轴**，由合成器线程驱动，滚动多快动画就多准，零 JS：

```css
/* scroll-driven.css */
/* ① 页面顶部阅读进度条:滚动进度 0%→100% 驱动 scaleX */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: #4f7cff;
  transform-origin: left;
  animation: grow-x linear both;
  animation-timeline: scroll(nearest block); /* 最近可滚祖先的纵向滚动进度 */
}
@keyframes grow-x {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* ② 卡片进入视口时淡入上移:元素自身的「可见进度」做时间轴 */
.card {
  animation: card-in linear both;
  animation-timeline: view();           /* 元素相对视口的进出进度 */
  animation-range: entry 0% entry 80%;  /* 只在「进入视口」的前 80% 阶段播完 */
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 渐进增强:不支持则取消动画直接显示,内容可见性不可依赖动画 */
@supports not (animation-timeline: view()) {
  .card { animation: none; }
}
```

`scroll()` 做整页进度类（进度条、视差、吸顶工具栏随滚动变色），`view()` 做元素进场/离场类（reveal、图片随滚动放大）。对 React 项目这是纯 CSS 能力，组件里加类名即可。

**4. framer-motion：layout / gesture / spring**

framer-motion 是 React 动画库的事实标准，两个能力补齐了 CSS 做不到的空缺：

- **layout（自动 FLIP）**：元素加 `layout` 后，任何引发它布局变化的状态改变（排序、增删、面板开合、栅格换列）都会自动 FLIP 补间——`layoutId` 则跨组件树做共享元素过渡（列表小图 → 详情大图，路由跳转也行）。手写 FLIP 的所有测量/Invert/Play 它全包了；
- **gesture + spring（物理动画）**：`whileHover`/`whileTap` 声明手势状态，`drag` 一行开启拖拽；spring（弹簧物理：stiffness/damping）比贝塞尔更适合交互反馈——因为它的减速曲线是"物理惯性的"，跟手且不会机械对称。

```tsx
// MotionCards.tsx —— layout 排序 + 拖拽跟手 + 弹簧回弹
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState } from 'react';

export function MotionCards() {
  const [asc, setAsc] = useState(true);
  const items = [3, 1, 2].sort((a, b) => (asc ? a - b : b - a));
  return (
    <div>
      <button onClick={() => setAsc((v) => !v)}>切换排序(layout 自动补位)</button>
      <motion.ul layout style={{ display: 'flex', gap: 12, listStyle: 'none' }}>
        {items.map((n) => (
          <motion.li
            key={n}
            layout                                     // 布局变化自动 FLIP
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <DraggableCard title={`卡片 ${n}`} />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function DraggableCard({ title }: { title: string }) {
  // MotionValue:绕过 React 渲染的高频数值通道,拖拽全程 0 次 re-render
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-200, 200], [-8, 8]), {
    stiffness: 200,
    damping: 20,
  });
  return (
    <motion.div
      drag="x"
      style={{ x, rotate }}                          // 拖拽跟手 + 随偏移旋转
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.2}                              // 越界橡皮筋阻尼
      whileTap={{ cursor: 'grabbing' }}
    >
      {title}
    </motion.div>
  );
}
```

**5. token 化时长与缓动（微交互设计系统）**

把动画参数当设计 token 管理，与颜色/间距同权重：

```css
/* motion-tokens.css */
:root {
  /* 时长:语义命名,不写「300ms」这种裸值 */
  --duration-fast: 120ms;   /* hover/按压反馈 */
  --duration-base: 200ms;   /* 常规过渡:面板、下拉 */
  --duration-slow: 320ms;   /* 大位移:抽屉、共享元素 */
  /* 缓动:进(out)用减速曲线,出(in)用加速曲线 */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
}
/* 可访问性:系统偏好减少动效时,全局压扁所有动画 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```ts
// motionTokens.ts —— 与 CSS 变量同源的 TS 常量(framer-motion 侧使用)
export const duration = { fast: 0.12, base: 0.2, slow: 0.32 } as const;
export const springPreset = {
  gentle: { type: 'spring', stiffness: 200, damping: 26 },
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
} as const;
```

为什么必须 token 化：一致性（全站同一个"快"）、可调优（设计评审改一个变量全站生效）、可降级（reduced-motion 一处生效）。编排（stagger：列表项按 50ms 依次进场）也属于 token 体系的一部分。

**6. 大列表动画：AnimatePresence**

React 卸载组件时立即移除 DOM——**退出动画根本来不及播**。`AnimatePresence` 拦截卸载：带 `exit` 的子组件被移出树时，先播 exit 动画、播完才真正卸载。大列表的三件套：`layout`（剩余项补位）+ `exit`（离场）+ `mode="popLayout"`（离场元素立即脱离布局流，避免布局被"将死未死"的项撑着）：

```tsx
// TaskList.tsx —— 大列表的插入/删除/排序全套动画
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface Task { id: string; title: string }

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'a', title: '写周报' },
    { id: 'b', title: '发周报' },
    { id: 'c', title: '假装周报已读' },
  ]);
  return (
    <div>
      <button
        onClick={() =>
          setTasks((t) => [...t, { id: crypto.randomUUID(), title: `新任务 ${t.length + 1}` }])
        }
      >
        添加
      </button>
      <motion.ul layout style={{ listStyle: 'none', padding: 0 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {tasks.map((t) => (
            <motion.li
              key={t.id}
              layout                                            // 别人删了,我平滑补位
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}               // 卸载前先播这个
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              {t.title}
              <button onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}>
                删除
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
```

两个纪律：`key` 必须稳定且真实变化（拿数组下标当 key，退出动画永远不触发）；`initial={false}` 避免首屏所有项集体播进场动画（首屏应该"直接在"）。

**入手路径**（对应大纲"相册列表点开大图共享元素过渡 + 布局排序 FLIP"）：

1. 手写 FlipGrid（上面代码）跑通倒序/随机排序动画，故意把 transform 换成改 `top/left`，Performance 面板对比掉帧——建立"合成器动画"的体感；
2. 同一个排序用 framer-motion `layout` 重做（5 行），体会封装边界；
3. 相册列表 → 大图详情：先用手写共享元素过渡（两个节点互 FLIP）做一版，再换 `layoutId` 一行搞定；
4. 换 View Transitions API 实现第 3 步（`view-transition-name` + `useViewTransitionNavigate`），Safari/Firefox 验证降级；
5. 给全站落 motion token + `prefers-reduced-motion` 降级。

**验收物**：一个相册页：点小图 → 路由跳大图页共享元素过渡（FLIP 手写版、framer-motion 版、View Transitions 版三选一都行）；返回键反向过渡；列表按热度排序有 FLIP 补位；删除有 exit 动画；系统开启"减少动态效果"时全部动画自动关闭。

**常见坑**：

- 动画属性选错：`width/height/top/left` 每帧 layout；能用 `transform`（位移/缩放）与 `opacity` 就不要碰布局属性；高度过渡确实需要时用 `grid-template-rows: 0fr → 1fr` 或 FLIP 的 scaleY 技巧；
- FLIP 里少做"强制重排"（Invert 后读一次 `getBoundingClientRect()`）：跳过这一步会偶发"动画没播直接到位"（浏览器合并了样式写入）；
- View Transition 回调里忘记 `flushSync`：React 状态还没落到 DOM，浏览器截到的还是旧页面，过渡"看起来没发生"；
- `scroll()` 时间轴的元素与滚动容器不是祖孙关系：`nearest` 找不到可滚祖先，动画时间轴静止；
- AnimatePresence 的 key 不稳定或 `initial` 忘关：退出动画失效 / 首屏闪一排进场动画；
- 大列表所有项都套 motion 组件还开 `layout`：百万级测量开销，只对"会动的窗口"开动画。

## D. 大型应用架构

A/B/C 三族难在"单点场景做到极致"（编辑器、协同、图形），D 族难在**系统边界**：当一个产品大到需要第三方扩展、多团队并行、嵌入别人页面、甚至离开浏览器运行时，难点就从"某个交互怎么实现"变成"两段互不信任的代码如何共存"。按本篇开头的 React 相关度过滤视图：D1 插件化属于 ② 混合层（架构模式框架无关，但扩展点常用 React context/注册表实现），D2–D6 属于 ③ 基本与 React 无关层——React 只是 UI 壳，这里的知识（沙箱、进程模型、Service Worker、postMessage 协议）换任何框架原样保值。职业匹配上，这一族是"前端基建/平台组"的核心能力栈（D1+D2+D4+E1），也是独立开发者产品交付闭环（D5+E2+D6）的必经之路。

---

### D1. 插件化架构（★★★★☆）

#### 是什么

宿主（host）提供稳定的核心能力与扩展点（extension points），第三方在不动宿主源码的前提下编写插件（extension/plug-in）注入功能——VSCode 的语言支持与主题、Grafana 的自定义面板、Chrome 的扩展，全是这个模式。对你的低代码平台而言，这是注册表模式（《react-进阶大纲-复杂场景.md》§1.2）的架构级放大：注册表解决"平台内部模块怎么解耦"，插件化解决"外部开发者怎么给平台加东西"。

#### 为什么难

难的不是"写插件"，而是"定义边界"：

1. **API 稳定性**：一旦第三方依赖你暴露的接口，任何改动都是破坏性变更，你得像维护开源库一样维护宿主 API。
2. **信任问题**：插件代码质量不可控，一个插件抛异常不能拖死宿主；恶意插件不能拿到宿主的全部能力。
3. **版本组合爆炸**：插件 A 兼容宿主 1.x，插件 B 兼容 2.x，市场里同时存在——你需要一套协议版本机制。
4. **动态性**：插件要能不重新发宿主版本地热插拔，就要解决从哪里加载、如何隔离、如何回滚。

#### 核心技术逐项拆解

**1. 从注册表到 contribution points（声明式扩展点）**

注册表模式的初级形态是命令式 API：插件主动调用 `registry.register('panel', myPanel)`。它能解耦，但有三个致命问题：插件必须**执行代码**才能注册（无法静态分析它做了什么）；宿主无法在加载前**校验**贡献物是否合法；无法基于"是否用到"做惰性加载。

进化答案是 **contribution points（贡献点）声明**：插件用一个静态清单（manifest）声明"我贡献什么"，宿主声明"我接受哪些贡献点"，注册行为由宿主代劳。VSCode 的 `package.json` 就是最经典实现：

```json
{
  "name": "todo-highlight",
  "engines": { "vscode": "^1.75.0" },
  "activationEvents": ["onCommand:todo.openPanel"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{ "command": "todo.openPanel", "title": "打开 TODO 面板" }],
    "views": {
      "explorer": [{ "id": "todo.tree", "name": "TODO 列表" }]
    },
    "configuration": {
      "properties": { "todo.keywords": { "type": "array", "default": ["TODO", "FIXME"] } }
    }
  }
}
```

读法：`contributes` 下每个键（commands/views/configuration/menus…）就是一个**扩展点**；值必须符合该扩展点定义的 JSON Schema，宿主装插件时先 schema 校验、再逐点注册；`activationEvents` 声明何时才真正执行 `main`（`onCommand:` 表示用户第一次触发该命令才激活）——不用的插件零成本。

Grafana 同理，每个插件的 `plugin.json` 里 `type: "panel"` 声明自己贡献的是"面板"扩展点，`dependencies.grafanaVersion` 声明兼容的宿主版本：

```json
{
  "type": "panel",
  "id": "acme-barchart",
  "name": "Acme Bar Chart",
  "info": { "version": "1.2.0" },
  "dependencies": { "grafanaVersion": ">=10.0.0", "plugins": [] }
}
```

对比一下两代方案的能力差异：

| 维度 | 命令式注册表 | contribution points |
|---|---|---|
| 注册时机 | 插件代码执行时 | 安装时由宿主读取清单 |
| 静态校验 | 做不到 | JSON Schema 校验贡献物 |
| 惰性激活 | 做不到（必须先执行才能注册） | activationEvents 按需激活 |
| 市场审核/搜索 | 无法机器识别插件能力 | 清单即机器可读的能力描述 |
| 安全 | 插件一运行就拿到运行时 | 可先审清单再决定放行 |

**2. 宿主 API 暴露与能力权限模型**

铁律：插件永远不直接接触宿主内部对象（不暴露 window 上的任意属性、不传 React context 原始对象）。宿主暴露的是一个**命名空间化、按权限裁剪的 API 面**：插件在清单里声明要什么权限（如 `"permissions": ["storage", "network"]`），宿主按声明注入子集——没申请的能力在插件里 `undefined`。这与浏览器扩展、Android App 的权限模型同构。最小实现思路：

```ts
function createHostAPI(permissions: Permission[]): HostAPI {
  const has = (p: Permission) => permissions.includes(p);
  // 返回的对象冻结，且未授权能力直接不存在，而不是抛错——让越权代码尽早 TypeError
  return Object.freeze({
    log: console.log,
    ...(has('storage') ? { storage: createStorageNamespace() } : {}),
    ...(has('network') ? { fetch: limitedFetch } : {}),
    ...(has('notify') ? { notify: showNotification } : {}),
  });
}
```

**3. 生命周期钩子**

标准三段：`activate`（激活，收到 PluginContext）/ `deactivate`（卸载，清理副作用）/ 中间所有注册物挂到 `ctx.subscriptions`，卸载时统一 dispose——这是 VSCode `context.subscriptions` 的做法，把"清理"从插件的自觉变成宿主的机制：

```ts
ctx.subscriptions.push(api.registerMaterial(meta, comp));
// deactivate 时宿主遍历 subscriptions 逐个 dispose，插件忘了清也不泄漏
```

**4. 插件动态加载：CDN ESM vs 构建期动态 import**

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| 构建期动态 `import()` | 插件代码在宿主仓库里，`import('./plugins/chart')` | 类型完整、无网络问题 | 加新插件必须重发宿主，第三方无法参与 |
| CDN ESM | 清单里给 `entry: 'https://cdn.acme.com/chart-panel@1.2.0/index.js'`，运行时 `import(/* @vite-ignore */ url)` | 真正的开放生态，热更新插件 | 版本漂移、CDN 可用性、供应链安全（需 SRI/域名白名单） |

```ts
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
}

export async function loadPlugin(manifest: PluginManifest): Promise<PluginModule> {
  // @vite-ignore：告诉打包器别在构建期解析这个 URL，它是运行时才确定的
  const mod = await withTimeout(
    import(/* @vite-ignore */ manifest.entry),
    8000,
    `插件 ${manifest.id} 加载超时`,
  );
  if (typeof mod.activate !== 'function') throw new Error(`${manifest.id} 缺少 activate 导出`);
  return mod;
}
```

**5. 插件失败降级**

四层防线，一层层兜：加载层超时（上面的 `withTimeout`）；激活层 try/catch，单个插件激活失败只记录、不阻断宿主启动；渲染层给每个"插件贡献的 React 组件"包 Error Boundary，崩了只是那块区域消失；运营层留 kill switch——市场下架 + 宿主远程配置拉黑，已安装的插件也加载不进来。

```tsx
import { Component, type ReactNode } from 'react';

export class PluginBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true }; // 渲染降级：不再渲染这个插件的贡献物
  }
  componentDidCatch(err: unknown) {
    console.error(`[plugin:${this.props.name}]`, err); // 真实场景：上报插件市场，自动禁用
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
```

**6. 插件市场与版本兼容（与协议版本迁移的关系）**

关键认知：**清单里的 contributes 结构本身就是一份协议**（与低代码 Schema 协议同地位）。宿主给扩展点加一个必填字段，等价于 Schema 协议的 breaking change——处理手法完全复用协议版本迁移那套：宿主引擎版本 `semver` 化，插件清单用 `engine` 字段声明兼容范围，安装期校验：

```ts
import { satisfies } from 'semver';

const HOST_VERSION = '1.4.2';
export function assertCompatible(manifest: PluginManifest) {
  if (!satisfies(HOST_VERSION, manifest.engine)) {
    throw new Error(`插件 ${manifest.id} 声明兼容宿主 ${manifest.engine}，当前 ${HOST_VERSION}`);
  }
}
```

升级时提供 `migrate(manifest, fromVersion)` 迁移函数 + 市场侧按宿主版本过滤可装列表，避免"新宿主装旧插件静默坏掉"。

**7. 一个迷你插件系统接口设计（可直接当低代码平台的起点）**

```ts
import type { ComponentType } from 'react';

/** 插件清单：声明"我是谁、我贡献什么、我要什么权限、从哪加载" */
export interface PluginManifest {
  id: string;                 // 全局唯一，如 'com.acme.chart-panel'
  name: string;
  version: string;            // semver
  engine: string;             // 兼容的宿主版本范围，如 '^1.2.0'
  entry: string;              // ESM 入口 URL（CDN）
  activationEvents: string[]; // 惰性激活条件，如 ['onView:dashboard']
  permissions: Permission[];  // 能力权限申请
  contributes: Contributions; // 声明式扩展点贡献
}

export type Permission = 'storage' | 'network' | 'notify';

/** 插件可贡献的扩展点（低代码语境：物料/面板/Setter/命令/菜单） */
export interface Contributions {
  materials?: MaterialMeta[];   // 新物料（组件 + 物料描述协议）
  panels?: PanelMeta[];         // 新面板（编辑器左侧/右侧区域）
  setters?: SetterMeta[];       // 新属性设置器（进阶大纲 §3 的 Setter 体系）
  commands?: CommandMeta[];     // 命令面板项
  menu?: MenuItemContribution[];
}

/** 扩展点定义：宿主声明"我接受哪些贡献"，带 schema 校验与注册逻辑 */
export interface ContributionPointDefinition {
  id: string; // 如 'panels'
  jsonSchema: object;
  register(target: unknown, contribution: unknown, ctx: PluginContext): Disposable;
}

/** 宿主暴露给插件的 API 面（按 permissions 裁剪后注入，Object.freeze） */
export interface HostAPI {
  registerMaterial(meta: MaterialMeta, comp: ComponentType): Disposable;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
  storage: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> };
  fetch: typeof fetch;
}

export interface Disposable { dispose(): void }

/** 激活时注入的上下文 */
export interface PluginContext {
  pluginId: string;
  api: HostAPI;
  subscriptions: Disposable[]; // deactivate 时宿主统一 dispose
}

/** 插件模块：唯一的代码级约定 */
export interface PluginModule {
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

/** 宿主管理器：装清单、管生命周期、收错误 */
export interface PluginHost {
  registerPoint(def: ContributionPointDefinition): void;
  install(manifest: PluginManifest): Promise<void>;   // 校验 engine + schema → 存清单（可能不激活）
  activate(id: string): Promise<void>;                // 触发条件满足时才 import(entry)
  deactivate(id: string): Promise<void>;              // dispose 全部 subscriptions + 调 deactivate
  onPluginError(cb: (id: string, err: unknown) => void): Disposable;
}
```

#### 代表

VSCode（插件市场的天花板）、Grafana（面板/数据源两类扩展点）、Obsidian（社区插件 1000+）；国内低代码平台（宜搭、简道云）的"自定义组件/插件"生态同构。

#### 入手路径

给第 6 章低代码平台做插件系统：先做"第三方可注册新物料与新面板"——清单只声明 `materials` 和 `panels` 两个扩展点就够第一版；跑通后再加 permissions、activationEvents 与市场审核。

#### 常见坑

- 一上来就把宿主所有内部函数塞给插件（`api: window`）——之后每一次内部重构都是生态灾难。
- 忘了 activationEvents，装了 50 个插件启动全量 import，宿主首屏被拖垮。
- 扩展点结构没 schema 校验，一个插件写了 `{ title: 123 }`，渲染时才炸，排查到怀疑人生。
- deactivate 不 dispose：热卸载插件后事件监听还在，越用越卡——subscriptions 机制就是防这个的。
- CDN 插件无版本锁定（`entry` 不带精确版本号），第三方今天发版你的平台今天就变灰。

---

### D2. 微前端（★★★☆☆ 概念多、踩坑多）

#### 是什么

把一个大前端应用拆成多个可**独立开发、独立部署、独立技术栈**的子应用，运行时由主应用（基座）组合成一个整体。与 monorepo 的区别：monorepo 解决"源码组织"，微前端解决"运行时集成与团队自治"。

#### 为什么难

难在"多个本该独立运行的完整应用被塞进同一个页面"：它们共享同一个 `window`、同一个 DOM 树、同一个地址栏——全局变量互相覆盖、样式互相污染、路由互相打架、React 版本冲突，每一项都要靠沙箱机制硬隔离出来。

#### 核心技术逐项拆解

**1. qiankun 的 proxy JS 沙箱：为什么直接跑子应用会污染 window**

子应用本质是一段假定"整个页面只有我"的 JS。直接 `eval` 执行它，污染立刻发生：

- 子应用打包器把公共库挂全局：`window.$ = jQuery`。子应用 A 卸载后，宿主或子应用 B 读 `window.$`，拿到的是**A 遗留的那个版本**。
- 子应用写 `window.__APP_STATE__ = {...}`，两个子应用用了同一个变量名，后装的覆盖先装的。
- 最隐蔽的一类：子应用通过 `window.__POWERED_BY_QIANKUN__` 判断运行环境（qiankun 约定的注入标记），如果沙箱没把这个变量伪装好，子应用会按"独立运行"打包出**第二份 React**——两个 React runtime 同页，hooks 直接报 "Invalid hook call"。
- `document.querySelector('#app').innerHTML = ...`、卸载后仍在跑的 `setInterval`，是 DOM 与定时器维度的同类污染。

**第一代：快照沙箱（SnapshotSandbox）**——给不支持 `Proxy` 的老浏览器用，思路是"先拍照，卸载时 diff 还原"：

```ts
// 简化自 qiankun 的 SnapshotSandbox：只能单实例（一个时刻只有一个子应用激活）
class MiniSnapshotSandbox {
  private rawSnapshot = new Map<PropertyKey, unknown>(); // 宿主 window 原始状态
  private modifyMap = new Map<PropertyKey, unknown>();  // 子应用本轮的修改

  activate() {
    // 1) 激活前拍全量快照
    for (const k of Object.getOwnPropertyNames(window)) this.rawSnapshot.set(k, (window as any)[k]);
    // 2) 回放上次修改：恢复这个子应用的"世界观"
    this.modifyMap.forEach((v, k) => ((window as any)[k] = v));
  }

  deactivate() {
    // 3) diff：凡与快照不一致的都是子应用的修改——记下来，并把 window 还原给宿主
    for (const k of Object.getOwnPropertyNames(window)) {
      if ((window as any)[k] !== this.rawSnapshot.get(k)) {
        this.modifyMap.set(k, (window as any)[k]);
        (window as any)[k] = this.rawSnapshot.get(k);
      }
    }
  }
}
```

缺陷显而易见：每次切换要遍历整个 window（O(全部属性)）、无法多实例（两个子应用同时激活时快照互相覆盖）、子应用读不到"宿主没改过的属性属于谁"。中间还有一代 LegacySandbox（单实例但用 Proxy 记录新增/修改集合，减少 diff 成本），真正成熟的是：

**第二代：代理沙箱（ProxySandbox）**——给每个子应用发一个"假 window"：

```ts
// 简化自 qiankun 的 ProxySandbox：支持多实例，每个子应用一个 fakeWindow
class MiniProxySandbox {
  private fakeWindow: Record<PropertyKey, unknown> = {};
  proxy: WindowProxy;

  constructor() {
    const fakeWindow = this.fakeWindow;
    this.proxy = new Proxy(fakeWindow, {
      set(target, prop: string, value) {
        target[prop] = value; // 子应用写 window.xxx —— 全部落进 fakeWindow，真实 window 纹丝不动
        return true;
      },
      get(target, prop: string) {
        if (prop in target) return target[prop]; // 先读自己的
        const raw = (window as any)[prop];       // 再只读穿透到真实 window（读宿主的 React、document）
        return typeof raw === 'function' && !raw.prototype ? raw.bind(window) : raw; // 防 this 丢失
      },
      has(target, prop) {
        return prop in target || prop in window; // 让 'xxx' in window、with 语法正常工作
      },
    });
  }
}
```

子应用代码怎么"以为"自己在用真 window？qiankun 在 `getExecutableScript` 里把子应用入口代码包一层再 eval（简化版）：

```ts
// (function(window, self, globalThis){ 子应用代码 }).call(proxy, proxy, proxy, proxy)
// —— 子应用里所有裸的 window/self/globalThis 引用，实际拿到的都是 proxy
const wrapped = `(function(window, self, globalThis){\n${appCode}\n}).call(proxy, proxy, proxy, proxy);`;
(0, window.eval)(wrapped);
```

两代对比与适用场景：

| | SnapshotSandbox | ProxySandbox |
|---|---|---|
| 依赖 | 无（兼容 IE 等老环境） | `Proxy`（现代浏览器标配） |
| 隔离方式 | 事后还原（污染了再擦） | 事前拦截（根本碰不到真 window） |
| 实例数 | 只能单实例 | 每个应用独立 fakeWindow，**多实例并存**（同屏两个子应用互不可见对方的写入） |
| 性能 | 每次切换 O(window 全量 key) | 激活/卸载零成本（记录天然存在 fakeWindow 里，还能跨卸载保留状态） |

多实例不只是"同屏两个应用"：还有"同一个应用 keep-alive 式卸载重挂"——ProxySandbox 的 fakeWindow 在卸载后保留，重挂时子应用的全局状态还在，这是快照沙箱做不到的体验。

**2. qiankun 的样式隔离**

- `strictStyleIsolation: true`：把子应用容器套进 Shadow DOM，最强隔离；但 antd 的 Modal/Tooltip 这类 `createPortal` 到 `document.body` 的弹层会逃出 Shadow 根、瞬间裸奔（样式全丢），实战几乎不敢开。
- `experimentalStyleIsolation: true`：运行时给子应用样式规则改写选择器加作用域前缀（`div[data-qiankun="app-name"] .btn { ... }`），同时给容器加 `data-qiankun` 属性；解决"子应用污染宿主"，但解决不了"宿主的全局 reset 污染子应用"，且对 `@keyframes`、动态插入样式的改写有遗漏场景。

**3. qiankun 基本使用（看清沙箱开关在哪）**

```ts
import { registerMicroApps, start } from 'qiankun';

registerMicroApps(
  [
    {
      name: 'react-app',
      entry: '//localhost:7101',      // 子应用独立部署的地址
      container: '#subapp',           // 挂载点
      activeRule: '/react',           // 路由匹配规则：qiankun 拦截路由做分发
      props: { token: 'xxx' },        // 主→子通信：注入 props
    },
    { name: 'vue-app', entry: '//localhost:7102', container: '#subapp', activeRule: '/vue' },
  ],
  {
    beforeLoad: [(app) => console.log(`${app.name} 加载前`)],
    afterUnmount: [(app) => console.log(`${app.name} 已卸载`)],
  },
);

start({
  sandbox: { experimentalStyleIsolation: true }, // JS 沙箱默认开启（Proxy 优先，降级快照）
  prefetch: 'all',                               // 空闲时预取子应用资源，切换秒开
});
```

子应用侧只需导出三个生命周期（以 React 为例）：

```tsx
import ReactDOM from 'react-dom/client';
import App from './App';

let root: ReactDOM.Root | null = null;

export async function bootstrap() {}
export async function mount(props: { container?: HTMLElement }) {
  const el = props.container?.querySelector('#root') ?? document.getElementById('root');
  root = ReactDOM.createRoot(el!);
  root.render(<App />);
}
export async function unmount() {
  root?.unmount(); // 卸载必须干净：不留 DOM、不留监听，配合沙箱不留全局
  root = null;
}
```

**4. wujie：iframe + WebComponent 的另一条路**

qiankun 用 Proxy "骗"子应用，wujie 换思路：**JS 跑在真 iframe 里**（浏览器原生最强 JS 隔离，window/history/定时器全是自己独立的，天然多实例、天然支持不规范的老代码），**DOM 渲染到 WebComponent（自定义元素 + Shadow DOM）里**——iframe 内的 document 与 Shadow 容器之间由 wujie 做投递渲染，用户看到的 DOM 树仍在主文档中（可调试、可 SEO 相对友好）。代价是 iframe 与主文档之间的一切交互（事件、路由、样式变量）都要经过一层桥接，心智成本在"通信协议"而非"沙箱补丁"。React 基座里的用法：

```tsx
import WujieReact from 'wujie-react';

// alive: keep-alive 模式，切换回来不重挂；degrade: 浏览器不支持时降级为纯 iframe
<WujieReact name="vue-app" url="//localhost:7102" alive degrade />
```

**5. Module Federation：运行时共享依赖**

qiankun/wujie 解决"隔离"，Module Federation（webpack 5 内置）解决**共享**：A 应用在运行时 import B 应用构建产物里的模块，且双方声明 `shared` 的依赖（react/react-dom）只加载一份：

```ts
// 子应用 dashboard 的 webpack 配置：把自己暴露出去
import { ModuleFederationPlugin } from 'webpack';

new ModuleFederationPlugin({
  name: 'dashboard',
  filename: 'remoteEntry.js', // 构建产物入口，部署到 CDN
  exposes: { './Dashboard': './src/Dashboard' },
  shared: { react: { singleton: true, requiredVersion: '18' }, 'react-dom': { singleton: true, requiredVersion: '18' } },
});

// 主应用：声明远端与同样的 shared
new ModuleFederationPlugin({
  remotes: { dashboard: 'dashboard@https://cdn.example.com/dashboard/remoteEntry.js' },
  shared: { react: { singleton: true, requiredVersion: '18' }, 'react-dom': { singleton: true, requiredVersion: '18' } },
});
```

运行时机制：`remoteEntry.js` 加载后把自己注册进共享作用域（`__webpack_share_scopes__`）；主应用消费远端模块前先初始化共享作用域，双方**协商** react 版本——`singleton: true` 表示全页只允许一份 React（第二份直接复用不加载），这正是避免 "Invalid hook call" 的关键；版本不满足 requiredVersion 时会告警并按语义降级。

**6. 路由分发、应用通信、公共依赖治理、部署独立**

- 路由分发：基座监听路由变化，按 `activeRule` 加载/卸载子应用；子应用内部路由要约定"带前缀"（`/react/xxx`），避免互相覆盖。hash 与 history 模式的监听劫持策略不同，qiankun 已代劳。
- 通信——事件总线 vs 共享 store：

```ts
// 方案 A：qiankun 内置的全局状态（本质是发布订阅）
import { initGlobalState } from 'qiankun';
const actions = initGlobalState({ user: null });
actions.onGlobalStateChange((state, prev) => console.log('变化', state));
actions.setGlobalState({ user: { name: 'yd' } }); // 主子通用，跨技术栈

// 方案 B：框架无关事件总线（CustomEvent，React/Vue/原生子应用都能用）
const bus = new EventTarget();
bus.dispatchEvent(new CustomEvent('user:login', { detail: { name: 'yd' } }));
bus.addEventListener('user:login', (e) => console.log((e as CustomEvent).detail));
```

取舍：事件总线松耦合但"谁在监听、何时触发"全靠约定，链路长了不可追踪；共享 store（qiankun 全局状态或直接把 Redux/Zustand 实例通过 props 注入）数据可观测，但制造了运行时耦合，子应用脱离基座单跑时要 mock。实践：**高频共享状态（用户/主题）用注入 props，一次性通知用事件**。
- 公共依赖治理：目标"同页只有一份 react/react-dom"。手段排序：MF shared singleton > externals + CDN（import maps 统一地址，见 D4）> qiankun 配 `excludeAssetFilter` 放行公共 CDN 脚本。版本不齐时（子 A 用 React 17、子 B 用 18）接受双份并存，但绝不能让一份 React 被两个应用共享 DOM 渲染上下文。
- 部署独立：每个子应用独立仓库/流水线/CDN 目录，基座只依赖 `remoteEntry.js`/entry HTML 的**稳定 URL**；基座发版与子应用发版解耦，这才是微前端的组织收益。

**7. 反向知识：什么时候不该用微前端（反决策清单）**

1. **前端团队 ≤ 2 个**：微前端的核心收益是"组织并行"，没有多团队自治的诉求，付出的复杂度全是纯损耗。
2. **技术栈统一且没打算换**：统一栈下 monorepo + 路由级懒加载（`React.lazy(() => import('./routes/heavy'))`）已经拿到"按需加载、模块边界清晰"的全部好处，且无沙箱成本。
3. **想解决"构建太慢"**：那是构建工具问题——上 Rspack/Turbopack、远程缓存、增量编译；拆运行时是治错了病。
4. **想解决"代码太乱"**：代码乱靠模块边界与 lint 治理；微前端只会把烂代码连人一起分装进黑盒，跨应用排查更痛。
5. **应用间状态/组件高度共享**（仪表台、同一产品的多页签）：共享边界越多，沙箱越是反向阻力——每个共享物都要设计跨应用协议，等于自建分布式系统的通信成本。
6. **不能接受首屏瀑布**：基座 → 子应用 entry → 子应用 chunk 三级串行加载，即使有 prefetch，弱网下白屏时间显著高于单体。

什么时候该用：≥3 个团队各自有发版节奏、技术栈异构（React + Vue + 遗留 jQuery）、需要把巨型遗留系统增量迁移（新功能用新栈写、老页面按路由逐个搬）。**先证明 monorepo + 路由分包不够用，再上微前端。**

#### 代表

qiankun（蚂蚁，国内事实标准）、wujie（腾讯）、Module Federation（webpack 5 / rspack / vite 对应生态 federation 实现）、无界与 single-spa（qiankun 底层）。

#### 入手路径

主应用 + 两个子应用（React/Vue 各一），打通四件事：路由分发、initGlobalState 通信、MF shared 的 react 单例、独立 `npm run deploy` 各发各的。做完刻意制造一次"全局变量污染"（子应用里裸写 `window.foo`），观察两种沙箱下卸载后的表现差异。

#### 常见坑

- 子应用 `publicPath` 没改，静态资源 404——qiankun 注入 `window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__`，子应用构建时需把 `__webpack_public_path__` 指到它。
- antd 弹层在 `strictStyleIsolation` 下裸奔（见上文），最终都退回 `experimentalStyleIsolation`。
- 两个子应用各带一份 React 但共用了同一个 DOM 容器做 Portal，事件系统错乱——共享必须显式设计，不会"自动没事"。
- 忘了处理子应用卸载后的 `setInterval`/全局监听，内存随切换次数线性上涨。
- 把微前端当"架构洁癖"引入小团队，三个月后没人说得清路由分发规则——先过反决策清单。

---

### D3. 嵌入式第三方 Widget（★★★☆☆）

#### 是什么

把你的产品以一小块 UI 的形式嵌进**别人的任意网页**：Intercom 的客服气泡、Stripe 的支付按钮、Disqus 评论框。宿主页面技术栈未知（可能是 jQuery 老站、可能是 Vue），你只有一个 `<script>` 标签的机会。

#### 为什么难

你的一段代码要进入一个完全不受控的环境：宿主 CSS 可能污染你（全局 `* { margin:0 }`、`!important` 满天飞），你的 CSS 也可能污染宿主；宿主可能与你的 Widget 跨域，一切通信只能 postMessage；同一页面可能被嵌入多个实例；还要面对"宿主页面本身就慢/挂了/断网"的现实。

#### 核心技术逐项拆解

**1. `<script>` 注入与渐进初始化时序**

标准做法是"一行安装码 + 命令队列"：安装码极小（同步内联，不阻塞页面），先把用户调用排进队列，异步拉起真正的 SDK 后再重放——analytics.js 系的经典套路：

```html
<script>
  // 1) 暴露一个"假 API"：SDK 未就绪时只入队
  window.AcmeWidget = window.AcmeWidget || function () {
    (window.AcmeWidget.q = window.AcmeWidget.q || []).push(arguments);
  };
  window.AcmeWidget('init', { appId: 'app_123', theme: 'dark' }); // 立刻可调用，不报错

  // 2) 异步注入真正的 SDK（defer 语义，不阻塞宿主首屏）
  (function (d, t) {
    var s = d.createElement(t);
    s.async = true;
    s.src = 'https://widget.acme.com/v1/boot.js';
    s.onload = function () {
      // 3) SDK 就绪：重放队列，并把 AcmeWidget 替换成真实现
      var q = window.AcmeWidget.q || [];
      window.AcmeWidget = AcmeWidgetSDK.default;
      q.forEach(function (args) { window.AcmeWidget.apply(null, args); });
    };
    d.body.appendChild(s);
  })(document, 'script');
</script>
```

要点：假 API 必须在 SDK 之前定义且签名一致；SDK 失败时队列保留（弱网降级一节会用到）；所有初始化参数（appId/theme/回调）都从这行 script 或队列传入，宿主不需要任何构建工具。

**2. Shadow DOM 样式隔离：能隔离什么、不能隔离什么**

Widget UI 渲染进 `element.attachShadow({ mode: 'open' })` 里，自定义元素作为边界。能隔离的：**选择器互不穿透**——宿主的 `.btn { }`、`* { box-sizing }` 进不来（外部只能命中 `:host` 元素本身），你的 `.btn` 也跑不出去污染宿主。不能隔离的，必须心里有数：

- **可继承属性会穿透进来**：宿主 `body { color: red; font-size: 12px }` 会一路继承到 Shadow 内部所有未显式声明的元素。解法：`:host { all: initial; }` 先切断全部继承，再按需重建。
- **CSS 自定义属性穿透**：`--x` 定义在宿主 `:root`，Shadow 内 `var(--x)` 读得到——"挡不住"在这里反而是特性：用它做宿主换肤通道（下文）。
- 宿主对 Widget **容器元素**本身的操作：直接给你的 host 元素设 `display:none`、改 `zoom`、监听它的事件，Shadow DOM 管不了。
- 焦点/tab 顺序/表单提交仍属于整份文档，无法独立。

```ts
class AcmeChat extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      /* all: initial 切断宿主可继承样式；具体值显式重建 */
      :host { all: initial; display: block; font: 14px/1.5 var(--widget-font, system-ui, sans-serif); }
      .bubble { background: var(--widget-primary, #1677ff); color: var(--widget-on-primary, #fff);
                border-radius: 12px; padding: 8px 12px; }
    `;
    const panel = document.createElement('div');
    panel.className = 'bubble';
    panel.textContent = '你好';
    shadow.append(style, panel);
  }
}
customElements.define('acme-chat', AcmeChat);
```

**3. postMessage 协议设计（origin 白名单、握手、token 流转）**

Widget 主体跑在自家域的 iframe 里（JS 沙箱 + Cookie 隔离），与宿主页只剩 postMessage 一条通道。裸发字符串必然演化成灾难，必须一开始就定**带版本的信封协议**：

```ts
interface Envelope<T extends string, P> {
  v: 1;          // 协议版本：破坏性变更升 v，新旧协议可判定不兼容
  type: T;       // 消息类型字面量联合
  payload: P;
  seq?: number;  // 请求-响应配对号
}

type WidgetToHost =
  | Envelope<'handshake:init', { widgetId: string; protocol: 1 }>
  | Envelope<'handshake:ready', { instanceId: string }>
  | Envelope<'unread:change', { count: number }>
  | Envelope<'resize', { height: number }>;   // iframe 高度自适应

type HostToWidget =
  | Envelope<'handshake:ack', { theme: Record<string, string>; token: string }>
  | Envelope<'token:refresh', { token: string; expiresIn: number }>
  | Envelope<'theme:update', { theme: Record<string, string> }>
  | Envelope<'command:open', { conversationId: string }>;
```

宿主侧收消息，**第一行永远是 origin 校验**，不做校验等于把消息面暴露给任意页面：

```ts
const WIDGET_ORIGIN = 'https://widget.acme.com'; // 私有部署场景的白名单可以是数组

window.addEventListener('message', (e: MessageEvent<Envelope<string, unknown>>) => {
  if (e.origin !== WIDGET_ORIGIN) return;      // 1) origin 白名单
  if (e.data?.v !== 1) return;                 // 2) 协议版本过滤
  switch (e.data.type) {
    case 'handshake:init':                     // 3) 握手：确认对面是我们创建的那个 iframe
      if (e.source !== iframeEl.contentWindow) return;
      iframeEl.contentWindow?.postMessage(
        { v: 1, type: 'handshake:ack', payload: { theme: readCssVars(), token: issueSessionToken() } },
        WIDGET_ORIGIN,                          // 4) 发送也永远带目标 origin，不用 '*'
      );
      break;
    case 'resize': iframeEl.style.height = `${(e.data.payload as any).height}px`; break;
  }
});
```

token 流转链路：宿主页持有长期凭证（apiKey），iframe 加载 URL 时把一次性短期 token 放 **URL fragment**（`https://widget.acme.com/v1/frame#t=xxx`——fragment 不会出现在服务端日志与 Referer 中）；iframe 内用该 token 换会话；过期前由宿主经 `token:refresh` 消息续期。iframe 里**永不存储**长期密钥。开放嵌入（任意网站可装）与私有嵌入（仅自家域名）的区别在第一步：后者直接 origin 白名单硬校验；前者白名单不适用（宿主 origin 无限集），改为 token 里携带注册时绑定的域名声明，由 Widget 后端校验请求方 Referer/origin 与之一致。

**4. 多实例**

同一页面嵌两个 Widget（售前聊天 + 订单查询）：每个实例独立 `instanceId`（安装码生成 `Math.random().toString(36).slice(2)` 传入）；iframe 的 name 与 postMessage 的 seq 都带 instanceId 命名空间；宿主侧用一个 manager 按实例分发消息；Shadow DOM 自定义元素天然支持多实例（每个元素自己的 shadow root）。

**5. 宿主样式变量注入换肤**

利用"CSS 自定义属性能穿透 Shadow DOM"这一规则，把主题定义为变量契约，宿主只需声明变量即完成换肤，无需重新加载 Widget：

```html
<!-- 宿主页 -->
<style>
  :root {
    --widget-primary: #722ed1;
    --widget-font: Georgia, serif;
  }
</style>
<!-- 换肤 = 改变量；iframe 场景则由宿主发 theme:update，iframe 内 setProperty -->
<script>
  AcmeWidget('setTheme', { 'widget-primary': '#13c2c2' }); // 走协议消息，iframe 内 document.documentElement.style.setProperty(k, v)
</script>
```

契约（变量名清单 + 默认值）要写进接入文档，且 Widget 内每个 `var()` 都带 fallback（`var(--widget-primary, #1677ff)`），保证零配置也不裸奔。

**6. 弱网与宿主异常降级**

- SDK script 加载设 5s 超时：超时后重试一次（指数退避），再失败则渲染一个普通 `<a>`（mailto 链接或跳转兜底页），保证功能可达。
- iframe 内首帧给骨架屏；`navigator.connection.saveData === true` 时不加载头像等非关键图。
- 一切对外回调包 try/catch：宿主的回调抛异常不能中断 Widget 主流程。
- 队列（第 1 步的 `q`）持久化到 `sessionStorage`：宿主 SPA 路由切换重装 Widget 时，未完成的初始化指令不丢。

#### 代表

Intercom、Stripe（Payment Element/按钮）、Disqus、各类地图/表单/客服挂件。

#### 入手路径

做一个可嵌任意网站的聊天挂件 npm 包：安装码 → 自定义元素 + Shadow DOM 渲染 UI → iframe 加载真实会话逻辑 → 定信封协议（handshake/resize/theme 三条消息起步）→ 用一个"故意全局样式很脏"的测试页验证隔离。

#### 常见坑

- 收 message 不校验 `e.origin`、发送用 `'*'`——任何第三方页面都能伪造 Widget 消息驱动你的 UI。
- token 放 query string：进日志、进 Referer，泄露面失控；应走 fragment 或 postMessage。
- 忘了 `all: initial`，Widget 在"宿主全局改了 line-height"的页面上排版崩坏，用户以为是你坏了。
- iframe 高度写死，内容溢出被裁——必须有 `resize` 消息做自适应。
- 安装码同步拉 SDK（没走队列 + async），拖慢宿主首屏，接入方直接卸载你。

---

### D4. 浏览器内构建与运行（★★★★★）——在线 IDE 的底座

#### 是什么

CodeSandbox / StackBlitz 这类产品把"写代码 → 装依赖 → 编译 → 预览"整个前端工程链路搬进浏览器：不租服务器、毫秒级启动、天然多租户隔离。它是在线 IDE、组件文档 playground、低代码"实时预览用户自定义逻辑"的共同底座，也是进阶大纲 §5 JSON 编辑器与 §6.7"安全执行用户 JS"的集大成延伸——那里解决"单段代码的编辑与沙箱"，这里解决"整个工程在浏览器里的构建与运行"。

#### 为什么难

浏览器没有 npm、没有 Node、没有磁盘：`import App from './App'` 这个裸说明符浏览器不认识；TSX 必须编译；node_modules 动辄几十 MB；编译结果要能互相引用；预览的任意代码必须被关进笼子；编译错误还要精准透传回编辑器。每一环都要自建机制。

#### 核心技术逐项拆解

**1. sandpack：CodeSandbox 的开源方案及其能力边界**

sandpack（`@codesandbox/sandpack-react`）把"编辑器 + 编译 + 预览 iframe"封装成组件，是做 playground 性价比最高的起点：

```tsx
import { Sandpack } from '@codesandbox/sandpack-react';

export default function Playground() {
  return (
    <Sandpack
      template="react"                          // 预置模板：react/vite/react-ts 等
      files={{ '/App.js': { code: 'export default () => <h1>hi</h1>' } }}
      options={{ showNavigator: false, editorHeight: 420 }}
    />
  );
}
```

能力边界要认清：依赖预编译依赖 CodeSandbox 官方 bundler 服务（首次联网编译 npm 依赖，之后浏览器缓存），所以完全离线/私有化场景不成立；只支持其运行时能模拟的包——依赖 Node 原生模块、需要执行任意构建插件（自定义 webpack loader、postcss 配置全家桶）的工程跑不了；模板之外的复杂工程结构（monorepo、SSR）超出设计目标。结论：组件 playground/教学/demo 足够，做"真 IDE"就要往下看自研链路。

**2. esbuild-wasm：浏览器里的编译器**

esbuild 编译成 WASM 后可在浏览器执行（比 Go 原生版慢一个量级，但仍是 JS 系编译器里最快的梯队）。`transform` 做单文件转译，`build` + 虚拟插件做整包打包：

```ts
import * as esbuild from 'esbuild-wasm';

// 一次性初始化：加载 wasm 二进制（建议自托管并锁定版本）
await esbuild.initialize({ wasmURL: 'https://cdn.acme.com/esbuild-wasm@0.25.0/esbuild.wasm' });

// 单文件转译：TSX → 浏览器可直接执行的 ESM
const out = await esbuild.transform('const x: number = 1', { loader: 'tsx', format: 'esm' });
console.log(out.code);
```

**3. 虚拟文件系统（VFS）**

用内存里的 `Map<path, code>` 代替磁盘，提供 `write/read/resolve` 三原语；`resolve` 负责 `'./Button'` → `'/src/Button.tsx'` 的裸路径补全（目录拼接 + 扩展名探测）：

```ts
interface VFile { code: string }

class VirtualFS {
  private files = new Map<string, VFile>();

  write(path: string, code: string) { this.files.set(path, { code }); }
  read(path: string) { return this.files.get(path); }

  // from '/src/App.tsx' 引用 './Button' → 依次探测 /src/Button、/src/Button.tsx、/src/Button/index.tsx
  resolve(from: string, spec: string): string | null {
    if (this.files.has(spec)) return spec; // 绝对路径直接命中
    const dir = from.slice(0, from.lastIndexOf('/'));
    const joined = new URL(spec, `http://vfs${dir}/`).pathname;
    for (const cand of [joined, `${joined}.tsx`, `${joined}.ts`, `${joined}/index.tsx`]) {
      if (this.files.has(cand)) return cand;
    }
    return null;
  }
}
```

**4. esbuild-wasm + VFS 打通：把工程打成浏览器可执行的一个 bundle**

```ts
import * as esbuild from 'esbuild-wasm';

async function bundle(vfs: VirtualFS, entry: string): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    write: false, // 产物留在内存，不落盘（也没有盘可落）
    plugins: [{
      name: 'vfs',
      setup(build) {
        // http(s) 依赖走 external，交给 import maps（下一步）在浏览器里解析
        build.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, external: true }));
        // 其余说明符全部解析进 VFS 命名空间
        build.onResolve({ filter: /.*/ }, (args) => {
          if (args.namespace === 'vfs') {
            const resolved = vfs.resolve(args.importer, args.path);
            return resolved ? { path: resolved, namespace: 'vfs' } : { errors: [{ text: `找不到模块: ${args.path}` }] };
          }
          return { path: args.path, namespace: 'vfs' };
        });
        build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args) => {
          const file = vfs.read(args.path);
          return file ? { contents: file.code, loader: 'tsx' } : { errors: [{ text: `文件不存在: ${args.path}` }] };
        });
      },
    }],
  });
  return result.outputFiles[0].text;
}
```

**5. import maps：是什么、为什么关键**

import maps 是浏览器原生的"裸说明符映射表"：`<script type="importmap">` 声明 `react` → 某个具体 URL。它关键的三个原因：

- 没有它，浏览器遇到 `import 'react'` 直接报错——不认识的说明符只能由打包器改写，import maps 让"无打包执行"成为可能。
- **单实例保证**：工程里 50 个模块都 `import react`，只要映射到同一个 URL，浏览器只加载一份 React——这是"多模块共享依赖"最朴素的正确性基础。
- 它是虚拟路径 → 真实资源（blob: URL）的官方翻译层。

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "scheduler": "https://esm.sh/scheduler@0.23.0"
  }
}
</script>
<!-- 之后任何模块里 import 'react' 都解析到同一份；注意 importmap 必须出现在第一个 module script 之前 -->
```

（与第 4 步衔接：bundle 里被 external 的 `react` 保持原样，由 import maps 在浏览器侧解析——"本地代码打进 bundle、依赖走 CDN 共享"，在线 playground 的标准分工。）

**6. iframe 沙箱预览与错误透传**

预览必须放进 `sandbox="allow-scripts"` 的 iframe（无 allow-same-origin，获得唯一 opaque origin：脚本可跑、但读不到宿主任何同源数据——这就是 §6.7 安全沙箱的 iframe 形态）。编译后的 bundle 注入 srcDoc 执行，同时注入一段"错误探针"，把运行时错误 postMessage 回宿主渲染 overlay：

```ts
const ERROR_PROBE = `
<script>
  window.addEventListener('error', (e) => {
    parent.postMessage({ v: 1, type: 'preview:error', payload: { message: e.message, line: e.lineno, col: e.colno } }, '*');
  });
  window.addEventListener('unhandledrejection', (e) => {
    parent.postMessage({ v: 1, type: 'preview:error', payload: { message: String(e.reason) } }, '*');
  });
</script>`;

function renderPreview(bundleUrl: string) {
  const html = `<!DOCTYPE html><html><head>${ERROR_PROBE}</head>
    <body><div id="root"></div>
    <script type="module" src="${bundleUrl}"></script></body></html>`;
  return `<iframe sandbox="allow-scripts" srcDoc="${html.replace(/"/g, '&quot;')}"></iframe>`;
}

// 宿主侧：只信自己创建的 iframe 发来的错误（校验 e.source），透传到编辑器 overlay
window.addEventListener('message', (e) => {
  if (e.source !== previewIframe.contentWindow) return;
  if (e.data?.type === 'preview:error') showOverlay(e.data.payload); // 类 CRA 红色错误浮层
});
```

**7. WebContainers：浏览器里跑 Node 的原理与意义**

StackBlitz 的 WebContainers 把 Node API（fs/process/child_process/http）编译为浏览器内运行时：`boot()` 时注册一个 Service Worker **拦截虚拟域名下的所有请求**，文件系统、npm 安装、进程树全部在内存中由这套运行时解释执行——于是 `npm install`、`node server.js` 在浏览器里真实发生。意义：前端工程链路彻底本地化（零服务器成本、零冷启动、离线可用、代码不出浏览器即私有），这是"在线 IDE"与"云端开发环境"的分水岭。概念级 API：

```ts
import { WebContainer } from '@webcontainer/api';

const wc = await WebContainer.boot();            // 注册拦截请求的 Service Worker
await wc.mount({                                 // 挂载内存文件树
  'index.js': { file: { contents: "console.log('hello from node-in-browser')" } },
  'package.json': { file: { contents: '{"name":"demo"}' } },
});
const proc = await wc.spawn('node', ['index.js']); // 起一个"Node 进程"
proc.output.pipeTo(new WritableStream({ write: (chunk) => console.log(chunk) }));
await proc.exit;
```

#### 代表

CodeSandbox（sandpack 开源 + 在线 bundler）、StackBlitz（WebContainers，vscode.dev/bolt.new 的底座）。

#### 入手路径

两级跳：先用 sandpack 给《react-组件库实战大纲》的组件库做"文档实时 playground"（每个组件文档页嵌一个可编辑示例，替代部分 Storybook 场景）；再自研极简链路：esbuild-wasm + VFS + import maps + sandbox iframe，跑通"编辑 TSX → 500ms 内预览更新 + 编译错误高亮"，此时你就理解了 sandpack 内部做了什么。

#### 常见坑

- importmap 放在第一个 module script 之后——整张映射表被忽略且无报错。
- esm.sh 上 react 与 react-dom 版本不配套（react 18.3 + react-dom 17），hooks 报 invalid hook call；CDN 依赖必须整套锁版本。
- 给预览 iframe 同时开 `allow-scripts` 和 `allow-same-origin`：sandbox 形同虚设（可移除自身 sandbox 属性），永远别这么写。
- 编译错误只看 build 报错不看 warnings，用户 import 了不存在的模块却在运行时才白屏——onResolve 的 errors 要提前暴露。
- 每次按键都全量重打包：必须按"入口依赖图 + 变更文件"做增量，否则 10 万字符文件打字都卡。

---

### D5. 桌面端（★★★☆☆）

#### 是什么

用 Web 技术（React）写界面、用系统能力（文件、托盘、快捷键、自动更新）做壳，交付一个桌面 App。两大阵营：Electron（Chromium + Node 全家桶）与 Tauri（系统 WebView + Rust 后端）。

#### 为什么难

不在 UI（就是 React），而在**进程模型与安全边界**：桌面 App 的渲染进程会加载不可信内容（远程页面、用户文档里的任意 HTML），一旦把完整 Node 能力泄漏给渲染层，XSS 就升级为"攻击者在你电脑上执行任意命令"。另一难是工程组织：同一产品要出 Web 版 + 桌面版，代码怎么共享才不会两头漂移。

#### 核心技术逐项拆解

**1. Electron 主/渲染进程模型**

Electron = 1 个主进程（main，Node 环境，掌管窗口/菜单/系统 API/生命周期）+ N 个渲染进程（renderer，Chromium 环境，只负责页面）。为什么这样分：操作系统窗口与系统能力必须有唯一权威入口（主进程），而页面崩溃/卡死不该拖垮整个 App（进程级隔离，一个窗口崩了其他窗口还在）；同时把"有 Node 的部分"与"执行不可信内容的 Chromium 部分"在进程层面分开，安全模型才立得起来。主进程代码：

```ts
// main.ts（主进程）
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // 隔离 preload 与页面 JS（Electron 12+ 默认 true，别关）
      nodeIntegration: false, // 渲染进程禁 Node —— 见下方安全反例
      sandbox: true,          // Electron 20+ 默认 true：preload 也拿不到完整 Node
    },
  });
  win.loadFile(path.join(__dirname, 'dist/index.html')); // React 构建产物
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

// IPC 的 handle 端：渲染进程 invoke，主进程应答（对话式，比 send/on 好管理）
ipcMain.handle('fs:readText', async (_e, filePath: string) => {
  const allowed = path.normalize(filePath).startsWith(app.getPath('documents'));
  if (!allowed) throw new Error('路径越权'); // 主进程是权限闸门：再信任的渲染层也要校验参数
  return await fsp.readFile(filePath, 'utf8');
});
```

**2. contextBridge 安全 IPC：为什么必要（配安全反例）**

危险写法——让渲染进程直接摸到 Node：

```ts
// 危险：渲染进程 = 不可信内容 + 完整 Node 能力
const win = new BrowserWindow({
  webPreferences: { nodeIntegration: true, contextIsolation: false },
});
// preload 里再把 ipcRenderer 整个暴露出去：
contextBridge.exposeInMainWorld('ipc', ipcRenderer);
// 后果：页面被 XSS 注入一行脚本即可执行
// window.ipc.send('fs:readText', '/Users/yidafu/.ssh/id_ed25519')
// 甚至 require('child_process').exec('rm -rf ~')
// 渲染进程加载的内容必须默认"敌意"，Node 能力给它是桌面安全的第一大忌。
```

正确写法——contextBridge 只暴露**最小、白名单化、参数可校验**的方法面：

```ts
// preload.ts（隔离层：唯一能同时碰两个世界的位置）
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 页面只能调这个函数，拿不到 ipcRenderer 本体；能读什么由主进程 decide
  readDocumentText: (name: string) => ipcRenderer.invoke('fs:readText', name),
  openFilePicker: () => ipcRenderer.invoke('dialog:open'),
});
```

```ts
// 渲染进程（React 代码，与普通 Web 代码无异）
async function loadDoc(name: string) {
  const text = await window.electronAPI.readDocumentText(name);
  setText(text);
}
```

**3. Tauri：Rust 后端与体积优势**

Tauri 不捆绑 Chromium，用系统自带 WebView（macOS WKWebView / Windows WebView2 / Linux WebKitGTK），后端用 Rust 实现（窗口、IPC、文件、更新）。体积与内存优势的来源正是这两点：安装包从 Electron 的 ~80MB+ 降到 ~5–10MB。代价是 WebView 的跨平台一致性不如捆绑的 Chromium（字体、API 行为有差异，需回归测试）。前端代码不变，调后端用 `invoke`：

```ts
// React 渲染层：调 Rust 命令就是一次 RPC
import { invoke } from '@tauri-apps/api/core';

const version = await invoke<string>('get_app_version');
```

```text
// src-tauri/src/main.rs（Rust 侧命令，示意）
// #[tauri::command]
// fn get_app_version() -> String { app_version().to_string() }
// 权限模型：命令默认不开放，需要在 capabilities 配置里显式授权给前端
```

Tauri v2 的权限粒度（capabilities：哪个窗口能调哪些插件哪些命令）比 Electron 的"contextBridge 自觉收敛"更成体系。

**4. React 复用：monorepo 共享代码的组织**

Web 版与桌面版共享一切非平台代码，用包边界固化依赖方向：

```text
repo/
├── packages/
│   ├── core/        # 纯 TS 业务核心：schema 引擎、状态机、协议定义（无 DOM/Node 依赖）
│   ├── ui/          # React 组件库：只依赖 core，输出两版共用的界面
│   ├── web/         # 浏览器入口：路由、OAuth、PWA
│   └── desktop/     # Electron/Tauri 壳：主进程、preload、托盘、更新，只做"胶水"
└── pnpm-workspace.yaml
```

两条纪律：**依赖方向单向**（desktop → ui → core，core 永不 import ui）；**平台能力接口化**——`interface FileSystem { readText(p: string): Promise<string> }`，web 实现走 fetch/OPFS，desktop 实现走 ipc invoke/Tauri fs，在入口处注入（依赖注入而非环境 if/else 满天飞）。

**5. 托盘 / 全局快捷键 / 自动更新（概念）**

托盘（Tray）：常驻菜单入口（Electron `new Tray(icon)` + `setContextMenu`；Tauri tray 插件）。全局快捷键：系统级（不聚焦 App 也生效）注册（Electron `globalShortcut.register('CommandOrControl+Shift+D', cb)`，注意退出时 unregister，否则快捷键泄漏占坑）。自动更新：Electron 用 electron-updater（feed URL + 差量更新 + 签名校验）；Tauri v2 用 updater 插件（签名公钥内置 + endpoint 返回 latest 版本清单）。共同要点：**更新必须验签**，否则更新服务器被攻破 = 给所有用户推恶意版本。

#### 代表

VSCode（Electron 标杆）、Slack/Notion 桌面版（Electron）；1Password 8 / 部分 Rust 系工具（Tauri）。

#### 入手路径

把低代码平台包成桌面 App（Tauri 优先——体感现代打包链：`pnpm create tauri-app` 选 React 模板，把 web 构建产物指进去），加三件事：托盘"打开设计器"、全局快捷键唤起、updater 接一个静态 JSON endpoint 跑通签名更新。

#### 常见坑

- 为了图省事 `nodeIntegration: true` + 暴露 ipcRenderer——把桌面安全模型整个拆掉（见反例）。
- 主进程 IPC handler 不校验参数（路径/命令直接用），渲染层 XSS 直接穿透到系统层。
- 共享代码里混入 `window.` / `process.env`，桌面/Web 一边编译挂；平台差异必须走注入的接口。
- 自动更新不验签 / 不处理"更新失败回滚"，灰度变成全量事故。
- 忘了 macOS `window-all-closed` 的约定（不退出 App 等快捷键再激活），被审核拒。

---

### D6. 浏览器扩展（★★★☆☆）

#### 是什么

寄生在浏览器里的"合法外挂"：能在任意网页注入脚本与 UI（content script）、有独立的后台逻辑（background）、有弹窗（popup）、能跨域请求与本地存储。划词翻译、密码管理、RPA、页面标注都靠它。React 开发者的机会：popup/options/注入面板都可以用 React 写，等于"用 React 给整个互联网做 UI"。

#### 为什么难

它同时跨三个信任域：网页（不可信）、扩展后台（可信）、浏览器 API（高权）——每对域之间的通信与权限都要显式声明；MV3 的后台改成 Service Worker 后有生命周期约束（随时被杀）；注入的 UI 要与宿主页面的任意样式/框架共存（D3 同款问题）。

#### 核心技术逐项拆解

**1. Manifest V3 结构**

`manifest.json` 是扩展的总纲——权限、入口、资源全在这里声明（未声明的没有，与 D1 的权限模型同构）：

```json
{
  "manifest_version": 3,
  "name": "划词翻译",
  "version": "1.0.0",
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "activeTab", "contextMenus"],
  "host_permissions": ["https://api.translate.example.com/*"]
}
```

三个权限层不要混：`permissions` 是浏览器 API 能力；`host_permissions` 是"能跨域访问哪些站点"（fetch 跨域的放行依据）；`content_scripts.matches` 是"注入哪些页面"。最小化申请是过审与用户信任的关键。

**2. content script 的隔离世界与主世界**

content script 默认跑在**隔离世界（isolated world）**：与页面 JS 是两个独立的 JS 上下文，**共享 DOM 但不共享变量**——你的 `window.__myState` 页面脚本看不到，页面的变量你也读不到（这正是扩展不被页面脚本篡改的根基），但 `document.querySelector` 操作的是同一棵树。什么时候需要**主世界（main world）**：要 hook 页面函数（拦截页面的 `fetch`、读取页面框架挂的 `window.__NEXT_DATA__`）。MV3 两种方式：

```json
{ "content_scripts": [{ "matches": ["<all_urls>"], "js": ["hook.js"], "world": "MAIN" }] }
```

```ts
// 或运行时注册（Chrome 111+），同样 world: 'MAIN'
// chrome.scripting.registerContentScripts([{ id: 'hook', js: ['hook.js'], matches: ['<all_urls>'], world: 'MAIN' }])
```

主世界代码与页面同上下文，能互相读写，也意味着页面可以检测/覆盖你——所以标准姿势是"隔离世界放业务与通信，主世界只放最小 hook，两者 postMessage 桥接"。

**3. background service worker（与 MV2 的变化）**

MV2 的 background page 是常驻页面（有 DOM、有 window、永远活着）；MV3 换成 event-driven 的 Service Worker：**无 DOM**（不能用 window/alert）、**空闲约 30 秒被终止**、事件来了再唤醒。三条迁移铁律：所有 `chrome.*` 事件监听必须在顶层同步注册（唤醒后靠它们重新接事件，异步注册的监听会丢）；状态不能存内存变量（被杀即丢），存 `chrome.storage`；定时任务用 `chrome.alarms` 而非 `setInterval`。网络请求用 `fetch`（Service Worker 无 XMLHttpRequest）。

**4. 三方消息通信链路（content ↔ background ↔ popup）**

content script 能直接 fetch 跨域（需 host_permissions），但 API key 与状态不能放在每个页面的 content 里（页面不可信环境待太久）——正确链路：content 只做"采集与渲染 UI"，翻译请求经 background 代理（key 集中、可缓存、可限流），popup 向 background 要状态：

```ts
// content.js（隔离世界）：选中即问 background 要翻译
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'show-result') renderBubble(msg.payload); // background 算完推回来
});
window.addEventListener('mouseup', async () => {
  const text = getSelectionText();
  if (text) chrome.runtime.sendMessage({ type: 'translate', text });
});

// background.js（service worker）：唯一持有 API key 的地方
const API_KEY = (await chrome.storage.local.get('apiKey')).apiKey ?? '';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'translate') return;
  fetch(`https://api.translate.example.com/v1?q=${encodeURIComponent(msg.text)}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
    .then((r) => r.json())
    .then((payload) => chrome.tabs.sendMessage(sender.tab!.id!, { type: 'show-result', payload }))
    .catch((e) => chrome.tabs.sendMessage(sender.tab!.id!, { type: 'show-result', payload: { error: String(e) } }));
  return true; // 异步 sendResponse 必须返回 true，否则通道立刻关闭
});

// popup（React 应用）：读缓存状态即可，不重复请求
const stats = await chrome.runtime.sendMessage({ type: 'stats' });
```

**5. 与页面 React 应用共存（shadow DOM 注入 UI）**

划词气泡/侧边面板这类 UI 注入到任意页面，用 Shadow DOM 包住（同 D3 的理由：双向样式隔离），React 18 直接 `createRoot` 到 shadow root：

```tsx
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import Panel from './Panel';

let root: ReactDOM.Root | null = null;

export function mountPanel() {
  const host = document.createElement('div');
  host.id = 'acme-translator-host';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = ':host{all:initial} .panel{position:fixed;top:16px;right:16px;z-index:2147483647}';
  shadow.appendChild(style);

  root = ReactDOM.createRoot(shadow); // ShadowRoot 是合法容器
  root.render(<StrictMode><Panel /></StrictMode>);
  // 注意：Panel 里若用 Portal（弹层/tooltip），container 必须也指向 shadow 内的节点，
  // 默认 document.body 会逃出 Shadow 边界导致样式全丢 —— 与 D2 qiankun 弹层问题同源。
}

export function unmountPanel() {
  root?.unmount();
  document.getElementById('acme-translator-host')?.remove();
  root = null;
}
```

（宿主页面自己可能是 React 应用，两棵 React 树只要不在同一容器、不共享模块实例，互不干扰——扩展代码打包自包含即可。）

#### 代表

uBlock Origin（性能天花板）、Immersive Translate（划词/整页翻译）、React DevTools（把 React 面板注入 DevTools 的官方范本）、Grammarly（页面内 UI 注入）。

#### 入手路径

做"划词翻译 + 页面标注"扩展：popup 用 React 起一个 Vite 多入口工程（popup/content/background 三个 entry）；划词 → content 抓文本 → background fetch 代理 → shadow DOM 气泡渲染；标注数据存 `chrome.storage.local` 并支持导出。装上 Chrome/Edge 的"加载已解压的扩展程序"即可调试。

#### 常见坑

- background 里把状态放模块级变量，Service Worker 30 秒被杀后全丢——状态必须 `chrome.storage`。
- `onMessage` 异步处理后忘了 `return true`，`sendResponse` 永远不触发，调用方一直 pending。
- 在主世界注入了全部业务代码，页面方一行 `window.fetch = ...` 就把你 hook 逻辑换掉了。
- popup 与 content 各自持有一份状态且直接互相 fetch 通知，数据分叉——以 background 为唯一事实源。
- 弹层 Portal 到 `document.body`，在注入 UI 的 Shadow 隔离下裸奔（同 D2/D3 的坑，三处同源）。

## E. 极端性能与离线

D 族解决"应用怎么变大"，E 族解决"用户侧的两个物理极限"：一是浏览器的渲染与主线程极限（百万级数据还要交互不卡）；二是网络的可有可无（断网也能用、恢复自动同步）。E1 是面试与实战双重硬通货——按本篇开头 React 相关度视图，E1 处于 ② 混合层：虚拟滚动算法框架无关，但 React 并发（memo/useTransition/Profiler）与调度是它的另一半；E2 则几乎全在 ③ 层（Service Worker/IndexedDB/冲突解决，与框架无关）。两条线还有交叉：离线缓存的大 JSON 解析、队列重放，用的正是 E1 的 Worker 与切片技术。

---

### E1. 百万级数据渲染（★★★★☆）——面试硬通货

#### 是什么

表格 100 万行 × 20 列、日志查看器实时滚动、行情流刷屏——DOM 数量级远超浏览器舒适区（浏览器全量渲染 1 万个节点就会明显卡顿，100 万个节点直接假死），但用户仍要求搜索、排序、多选、编辑全部流畅。

#### 为什么难

三个瓶颈叠加：**渲染瓶颈**（DOM 节点数爆炸，布局/绘制成本线性涨）；**主线程瓶颈**（100 万条数据的排序/过滤/聚合，一次同步计算就是几百毫秒长任务，期间输入无响应）；**内存瓶颈**（数据本身几百 MB，处理不当反复克隆直接 OOM）。且三者互相纠缠：虚拟化解决渲染却放大计算占比，Worker 解决计算却带来数据传输拷贝。

#### 核心技术逐项拆解

**1. 虚拟滚动自研三部曲**

**第一部：定高公式**。行高固定时，一切皆除法——由 `scrollTop` 推可视区间，由总行数撑总高度（空容器占位），行绝对定位到 `index * 行高`：

```tsx
import { useEffect, useRef, useState } from 'react';

const ITEM_H = 36;   // 定高：每个元素高度已知且恒定
const VIEW_H = 720;
const OVERSCAN = 6;  // 上下多渲染几行，盖住快速滚动的空白

export function FixedList({ items }: { items: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current!;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true }); // passive：不阻塞滚动合成线程
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // 核心三公式：可视区起点 / 终点 / 总占位高度
  const start = Math.max(0, Math.floor(scrollTop / ITEM_H) - OVERSCAN);
  const end = Math.min(items.length, Math.ceil((scrollTop + VIEW_H) / ITEM_H) + OVERSCAN);
  const totalH = items.length * ITEM_H;

  return (
    <div ref={scrollerRef} style={{ height: VIEW_H, overflow: 'auto' }}>
      {/* 占位 div 撑出真实滚动条长度；只渲染 [start, end) */}
      <div style={{ height: totalH, position: 'relative' }}>
        {items.slice(start, end).map((text, i) => {
          const idx = start + i;
          return (
            <div key={idx} style={{ position: 'absolute', top: idx * ITEM_H, height: ITEM_H }}>
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**第二部：动高测量缓存**。真实行高不一（文本换行数不同）后除法失效，改用"估算 + 测量缓存 + 前缀和"：未测量的行用估算高度 `EST_H`（误差只影响滚动条长度，不影响正确性），渲染出来的行用 ref 回调测真实高度写入缓存，位置由前缀和数组 `offsets`（`offsets[i]` = 第 i 行顶部 y 坐标）维护，查找起点从除法换成**二分**：

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

const EST_H = 44; // 估算行高：误差只影响滚动条长度与初次跳变，不影响渲染正确性
const VIEW_H = 700;
const OVERSCAN = 5;

interface Row { id: number; text: string }

export function DynamicList({ rows }: { rows: Row[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heights = useRef<number[]>(rows.map(() => EST_H)); // 测量缓存：先全部用估算值
  const offsets = useRef<number[]>([0]);                   // 前缀和：offsets[i+1] = offsets[i] + heights[i]
  const [scrollTop, setScrollTop] = useState(0);

  const recompute = useCallback(() => {                    // O(n) 重建前缀和（优化：树状数组可 O(log n) 点更新）
    const acc = [0];
    for (let i = 0; i < heights.current.length; i++) acc.push(acc[i] + heights.current[i]);
    offsets.current = acc;
  }, []);

  useEffect(() => {
    heights.current = rows.map(() => EST_H);
    recompute();
  }, [rows, recompute]);

  useEffect(() => {
    const el = scrollerRef.current!;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // 二分找起点：最小的 i 使 offsets[i+1] > scrollTop（第一行还没滚出可视区）
  const findStart = (st: number) => {
    let lo = 0, hi = heights.current.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets.current[mid + 1] > st) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  // 测量回调：真实高度 != 缓存时更新缓存，并做 scrollTop 校正
  const measure = (index: number, el: HTMLDivElement | null) => {
    if (!el) return;
    const real = el.getBoundingClientRect().height;
    const guess = heights.current[index];
    if (Math.abs(real - guess) <= 1) return;
    heights.current[index] = real;
    recompute();
    // 第三部的校正逻辑见下
    if (index < findStart(scrollTop)) {
      const diff = real - guess;
      scrollerRef.current!.scrollTop += diff; // 校正：防止视口上方行高变化"偷走"滚动位置
      setScrollTop((prev) => prev + diff);
    }
  };

  const start = Math.max(0, findStart(scrollTop) - OVERSCAN);
  let end = start;
  while (end < rows.length && offsets.current[end] < scrollTop + VIEW_H) end++; // 前缀和推进终点
  end = Math.min(rows.length, end + OVERSCAN);

  return (
    <div ref={scrollerRef} style={{ height: VIEW_H, overflow: 'auto' }}>
      <div style={{ height: offsets.current[rows.length] ?? 0, position: 'relative' }}>
        {rows.slice(start, end).map((row, i) => {
          const idx = start + i;
          return (
            <div key={row.id} ref={(el) => measure(idx, el)}
                 style={{ position: 'absolute', top: offsets.current[idx], width: '100%' }}>
              {row.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**第三部：scrollTop 校正**。为什么必须校正：可视区**上方**的行被测出与估算不同的高度时，总高度变化会使后续所有行整体位移，但浏览器不会替你调 `scrollTop`，用户看到的内容会突然跳动/重影。规则是：`被测行 < 当前首个可视行` 时，把差值 `real - guess` 补进 `scrollTop`（上面 `measure` 内的最后几行），视口内容即视觉上原地不动。这是动高虚拟列表"丝滑"与否的分水岭，也是 react-window/react-virtuoso 内部的核心细节之一。三个已知局限与工业级对策：上方未渲染行的测量缺失（双向虚拟化/向上预渲染缓冲）、快速滚动时测量跟不上（滚动期间用估算、停止后再校正）、数据变更后缓存要按 key 失效（不能按 index——插入一行后全错位）。

**2. Canvas 自绘表格（自绘文本、滚动合成）**

当单元格数量再上一个量级（20 列 × 可视 40 行 = 800 个 DOM 单元格仍然重）或需要行内迷你图时，把"行"从 DOM 降级为**像素**：一个 `<canvas>` 自绘所有可见单元格文本，滚动时只重绘：

```tsx
import { useEffect, useRef } from 'react';

const ROW_H = 30;
const COLS = [80, 200, 120, 140]; // 每列宽度（二维虚拟化的列维度）

export function CanvasTable({ rows }: { rows: string[][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;   // 高分屏：画布物理像素 = css 像素 × dpr，否则发虚
    const W = COLS.reduce((a, b) => a + b, 0);
    const H = 720;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;

    const render = () => {
      const st = scrollRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // 之后全部按 css 像素画
      ctx.clearRect(0, 0, W, H);
      ctx.font = '13px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      const first = Math.max(0, Math.floor(st / ROW_H));            // 行虚拟化：与 DOM 版同一公式
      const last = Math.min(rows.length, Math.ceil((st + H) / ROW_H));
      for (let r = first; r < last; r++) {
        const y = r * ROW_H - st;
        if (r % 2 === 0) { ctx.fillStyle = '#fafafa'; ctx.fillRect(0, y, W, ROW_H); } // 斑马纹
        ctx.fillStyle = '#333';
        let x = 0;
        for (let c = 0; c < COLS.length; c++) {
          ctx.save();                                  // 列内裁剪：文字超宽不越界
          ctx.beginPath();
          ctx.rect(x + 8, y, COLS[c] - 16, ROW_H);
          ctx.clip();
          ctx.fillText(rows[r][c], x + 8, y + ROW_H / 2); // 自绘文本：没有 DOM，只有字形
          ctx.restore();
          x += COLS[c];
        }
      }
    };

    // 滚动合成：wheel 事件改虚拟 scrollTop，rAF 合并同一帧内的多次触发（一帧只画一次）
    let raf = 0;
    const onWheel = (e: WheelEvent) => {
      const max = rows.length * ROW_H - H;
      scrollRef.current = Math.max(0, Math.min(max, scrollRef.current + e.deltaY));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
    };
    canvas.addEventListener('wheel', onWheel, { passive: true });
    render();
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [rows]);

  // 点击命中检测：像素坐标反算行列 —— 自绘最大的代价：一切交互都要自己做几何换算
  // const rect = canvas.getBoundingClientRect();
  // const row = Math.floor((e.clientY - rect.top + scrollRef.current) / ROW_H);
  // 累加 COLS 宽度即可得 col。
  return <canvas ref={canvasRef} />;
}
```

要点：DPR 缩放不做则文字糊；滚动必须 rAF 合帧；文本裁剪/省略号、行高亮、选中框全是 `fillText/fillRect` 的工作；选中/编辑这类富交互通常混合方案——Canvas 画格 + 一个绝对定位的真实 DOM input 覆盖在编辑格上。DOM 虚拟化与 Canvas 的取舍：交互密度高（编辑/复制/无障碍）选 DOM 虚拟化，纯展示密度高（日志/行情）选 Canvas。

**3. Web Workers：任务下沉、transferable 零拷贝、Comlink RPC**

**任务下沉**——100 万行排序放主线程一次 300ms 长任务，挪进 Worker 变成主线程零参与（Vite/webpack 都支持 `new Worker(new URL(...))` 语法）：

```ts
// sort.worker.ts
self.onmessage = (e: MessageEvent) => {
  const { rows, key, asc } = e.data as { rows: Row[]; key: keyof Row; asc: boolean };
  const sorted = [...rows].sort((a, b) => (asc ? a[key] > b[key] ? 1 : -1 : a[key] < b[key] ? 1 : -1));
  (self as unknown as Worker).postMessage(sorted);
};
```

```ts
// 主线程
const worker = new Worker(new URL('./sort.worker.ts', import.meta.url), { type: 'module' });
worker.onmessage = (e) => setRows(e.data as Row[]);
worker.postMessage({ rows: rawRows, key: 'amount', asc: true });
```

**transferable 零拷贝**——postMessage 默认结构化克隆（数据复制一份，100 万行 Float64 就是 8MB 的拷贝，双向共三次）；Transferable 对象（ArrayBuffer/OffscreenCanvas/ImageBitmap 等）传的是**所有权**，零拷贝但主线程从此不能再用它：

```ts
// 100 万个金额做聚合：克隆版要复制 8MB；transferable 版本只移交句柄
const amounts = new Float64Array(1_000_000);
worker.postMessage(amounts, [amounts.buffer]); // 第二个参数是转移列表
console.log(amounts.byteLength); // 0 —— 所有权已归 worker，主线程再读是空壳
```

**Comlink RPC**——手写 onmessage/postMessage 很快退化成自定义协议泥潭；Comlink 把 Worker 包成 Promise 化的"远程对象"，像调本地函数一样 await：

```ts
// aggregate.worker.ts
import * as Comlink from 'comlink';

export const api = {
  sum(values: Float64Array): number {
    let s = 0;
    for (const v of values) s += v;
    return s;
  },
  async sumTransfer(buf: ArrayBuffer): Promise<number> {
    const values = new Float64Array(buf); // 收到的就是被转移进来的 buffer，无拷贝
    return api.sum(values);
  },
};
Comlink.expose(api);
```

```ts
// 主线程：泛型直接复用 worker 文件的类型，接口契约编译期可查
import * as Comlink from 'comlink';

const worker = new Worker(new URL('./aggregate.worker.ts', import.meta.url), { type: 'module' });
const api = Comlink.wrap<typeof import('./aggregate.worker').api>(worker);

const total = await api.sum(new Float64Array(1_000_000));           // 克隆传输
const total2 = await api.sumTransfer(bigBuf.buffer);                // 转移传输（bigBuf 之后不可用）
```

React 结合：Worker 实例放 `useRef`（组件重渲染不重建），接收结果用 state；大数组跨渲染保留时注意 transferable 会"掏空"原引用。

**4. OffscreenCanvas：把 E1-2 的绘图也搬离主线程**

Canvas 2D 调用全部发生在主线程，主线程一旦忙（React 大更新），滚动绘制照样掉帧。OffscreenCanvas 让 Canvas 上下文整体进 Worker：

```ts
// 主线程：把 canvas 的控制权一次性移交给 worker（此后主线程不能再 getContext）
const offscreen = canvasEl.transferControlToOffscreen();
worker.postMessage({ type: 'init-canvas', canvas: offscreen, dpr: window.devicePixelRatio }, [offscreen]);
// 之后只需把数据/滚动增量发给 worker，绘制完全在 worker 侧完成
```

```ts
// table.worker.ts：绘图代码与主线程 Canvas 写法完全一致（fillText/fillRect），只是宿主变成了 worker
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'init-canvas') {
    const canvas = e.data.canvas as OffscreenCanvas;
    ctx = canvas.getContext('2d');
    ctx!.scale(e.data.dpr, e.data.dpr);
  }
  if (e.data.type === 'scroll') {
    const scrollTop: number = e.data.scrollTop;
    // render(scrollTop) —— 与上文 CanvasTable 的 render 相同的可见区计算 + fillText
  }
};
```

限制：DOM 事件不进 worker（命中检测仍在主线程做几何换算后发消息），且 canvas 控制权移交不可逆。

**5. 长任务切片：scheduler.yield 与 rAF 分帧**

有些活离不开主线程（React 状态更新、大量同步计算），只能**切片让路**：干一小段就让出主线程，把输入响应与动画的优先级还给浏览器。`scheduler.yield()`（Chrome 129+）是为此生的标准 API；《react-源码复刻大纲》里复刻的 React Scheduler 时间切片（可中断、按优先级调度）与它是同一思想在框架层的实现：

```ts
// 通用让出函数：新 API 优先，旧浏览器退化为 setTimeout（粒度粗但行为正确）
function yieldToMain(): Promise<void> {
  if ('scheduler' in window && typeof (window as any).scheduler?.yield === 'function') {
    return (window as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// 切片处理 100 万行的同步加工：每 5000 行让一次
async function processInChunks<T>(items: T[], fn: (item: T) => void, chunkSize = 5000) {
  for (let i = 0; i < items.length; i += chunkSize) {
    for (let j = i; j < Math.min(i + chunkSize, items.length); j++) fn(items[j]);
    await yieldToMain(); // 让出：期间用户输入、rAF 动画得以插队执行
  }
}
```

纯绘制任务用 **rAF 分帧**（保证切片与渲染帧对齐，避免"渲染前一微秒才做完"的浪费）：批量绘制 N 个区块时每帧画 K 个，`requestAnimationFrame` 递归直到完成；低优先级兜底还有 `requestIdleCallback`（帧内空闲时间执行）。React 侧对应物：大 setState 拆 `startTransition`/`useDeferredValue`，让输入类更新插队——这正是 React 相关度视图里"B2/E1 长列表重渲染与并发调优"说的那一半。

**6. INP / LCP 治理实战**

**指标是什么**：LCP（Largest Contentful Paint，最大内容绘制）衡量加载体验——视口内最大元素（大图/大文本块）完成渲染的时刻，good ≤ 2.5s，poor > 4s。INP（Interaction to Next Paint，交互到下次绘制）在 2024 年 3 月正式取代 FID 成为 Core Web Vitals——取页面所有点击/按键/指针交互中（近似最差的）延迟分位：从 input 事件触发到**下一帧绘制**的全程，good ≤ 200ms，poor > 500ms。它比 FID 狠在 FID 只测首次交互的输入延迟、不管处理多久，INP 则把"处理 + 渲染"整段算上。

**常见坏因**：INP——交互处理器里巨型同步 setState（一个输入框 onChange 重渲染整页十万行列表）、长任务（同步排序/JSON.parse 几 MB 数据）、强制同步布局（循环里读写 offsetHeight 触发 layout thrashing）、水合期间整页不可交互、第三方脚本长任务；LCP——服务器 TTFB 慢、渲染阻塞 CSS/JS、首屏大图没有预加载/低优先级加载（`<img loading="lazy">` 用在了 LCP 图上是最经典自伤）、纯客户端渲染导致内容等待 JS。

**怎么定位**：

```ts
import { onINP, onLCP } from 'web-vitals'; // v4，RUM 上报必备

onINP((m) => reportToMonitor({ metric: 'INP', value: m.value, attribution: m.attribution }));
onLCP((m) => reportToMonitor({ metric: 'LCP', value: m.value, attribution: m.attribution }));
```

现场排查用 DevTools Performance 面板：录制 → 复现慢交互/慢加载 → 看 Interactions 轨道（INP）与 LCP 标记线；长任务在主线程轨道上表现为红色三角块，点开 Bottom-Up 找元凶函数；LCP 按其四段分解（TTFB → 资源加载延迟 → 资源加载时长 → 元素渲染延迟）看哪段超标（`performance.getEntriesByType('largest-contentful-paint')` 或 attribution 里直接给出）。React 场景再加 React DevTools Profiler 看一次交互触发了哪些组件重渲染、各commit 耗时。修法对应上文各节：重渲染失控用 memo/拆 state/并发特性；长计算下沉 Worker 或切片；LCP 图加 `fetchpriority="high"` + `<link rel="preload">`、去渲染阻塞资源、关键内容 SSR/SSG。

**7. 内存泄漏排查（heap snapshot、Detached DOM、监听器/echarts 未清理）**

操作步骤（DevTools Memory 面板）：

1. 选 Heap snapshot，拍快照 A（操作前基线）。
2. 执行疑似泄漏操作 N 次（如开关某个大弹窗 10 次），让泄漏特征被放大 N 倍。
3. 点面板上的强制 GC 图标（垃圾桶），把"没泄漏的垃圾"清干净，避免误判。
4. 拍快照 B；视图切到 **Comparison**、Base 选 A，按 Delta 排序看哪些对象只增不减。
5. 类名筛选 `Detached`：出现 **Detached HTMLDivElement / Detached Document** 即实锤——节点已离开 DOM 树，但 JS 仍引用着它，整棵子树都无法回收。
6. 选中泄漏对象看 **Retainers（保留链）**：从根到该对象的引用路径直接指出"是谁抓着它"（某个数组/闭包/定时器回调/全局 Map）。
7. 进阶三快照法：A（操作前）→ B（操作中）→ C（强制 GC 后），比对 B→C 仍存活的分配，可同时定位"分配过多"与"无法回收"。

Detached DOM 的最小复现，一行之差决定泄漏与否：

```ts
const detached: HTMLElement[] = []; // 模块级集合 —— 常见真身：缓存 Map、事件回调闭包、Promise 链
function openPanel() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.remove();          // 已离开 DOM，但下一行还持有引用 → Detached，永不回收
  detached.push(el);
}
```

React 场景两大惯犯——**effect 里加了监听没移除**、**echarts 等实例 init 了没 dispose**（且 React 18 StrictMode 下 dev 环境 effect 会执行两次，缺清理的代码当场翻车，这是最好的免费泄漏检测器）：

```tsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function TrendChart({ option }: { option: echarts.EChartsOption }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = echarts.init(ref.current!);       // init 两次（StrictMode/路由重挂）就是两个 canvas 实例
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);    // 监听器挂在 window：组件销毁也常驻，经典泄漏
    chart.setOption(option);
    return () => {
      window.removeEventListener('resize', onResize); // 两件事都要清：监听器
      chart.dispose();                                //            实例（echarts 自身持 canvas/动画定时器）
    };
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height: 320 }} />;
}
```

识别特征：内存曲线随操作次数**阶梯上涨且强制 GC 不回落**；heap snapshot 里 `ECharts`/`HTMLCanvasElement`/`EventListener` 类对象只增不减；Performance Monitor 面板（Cmd+Shift+P 输入 Performance Monitor）开 DOM Nodes 与 JS Heap Size 实时看，比反复拍快照快。

#### 代表

react-window/react-virtuoso（虚拟滚动）、TanStack Virtual（框架无关虚拟化）、AG Grid（百万行 Canvas 模式）、 echarts 大数据模式。

#### 入手路径

10 万行 × 20 列数据：搜索/排序/多选/行内编辑全部不卡——DOM 虚拟化一版 + Canvas 一版对比 Profiling（动手清单就是上面 7 项技术：定高 → 动高校正 → Worker 排序 → Comlink → OffscreenCanvas → 切片 → heap snapshot 前后对比）。G 族的"虚拟滚动自研"（本篇 G3）与 B2 IM 的两级虚拟化是同一算法的另外两个练习场。

#### 常见坑

- 动高列表不做 scrollTop 校正，快速向上滚动时内容疯狂跳动——"能用但极其难受"的根源都在这。
- 用 index 当 key 又允许数据插入：测量缓存整体错位，行高全乱。
- Worker 里 postMessage 传大对象不看是不是 transferable，排序 100 万行有 200ms 算力 400ms 拷贝。
- transferable 转移后主线程还引用原 buffer 读出空数据（`byteLength === 0`），且不报错。
- echarts/监听器只清一半（dispose 了忘 removeEventListener，或反之），泄漏减半不是不泄漏。
- 优化 LCP 先去压缩 JS bundle，结果 LCP 元素是首屏大图——先看 attribution 四段分解再动手，别猜。

---

### E2. 离线优先 / Local-first（★★★★☆）

#### 是什么

Notion/Linear 式体验：断网照常增删改查（读写都走本地），网络恢复后自动同步合并到服务端，多端最终一致。Local-first 更进一步把"本地数据库"当作 first-class 数据源，云端只是同步副本——网络从"前提条件"降级为"优化项"。

#### 为什么难

HTTP 的心智模型是"请求-响应"，断网即功能全灭，这不是 UI 问题而是数据流架构问题：读要改走本地（IndexedDB），写要改走"本地即成功 + 后台同步"，于是引出三座大山：缓存体系（App Shell 与数据分开治理）、冲突（两个端各自离线改了同一条数据）、以及"用户已看到成功但同步失败"时的补偿 UX。

#### 核心技术逐项拆解

**1. Service Worker 缓存策略矩阵（Workbox：precache/runtime/SWR）**

Service Worker 是页面与网络之间的可编程代理（独立线程、有生命周期、可拦截 fetch），Workbox 是它的"策略库"。先建立策略矩阵——**不同资源配不同策略**是唯一正确姿势：

| 策略 | 行为 | 适用 | Workbox |
|---|---|---|---|
| precache（预缓存） | 构建期生成完整资源清单，install 时一次性缓存，activate 时清旧版本 | App Shell（index.html/JS/CSS 等构建产物，URL 带 hash） | `precacheAndRoute` |
| CacheFirst | 查缓存命中即返回，未命中取网络并回填 | 字体、带 hash 的图片等永不变资源 | `CacheFirst` |
| NetworkFirst | 先网络，超时/失败回退缓存 | 关键数据（余额、今天日程） | `NetworkFirst` |
| StaleWhileRevalidate | 立即回缓存，同时后台取新版更新缓存（下次生效） | 非关键但最好新鲜（配置、列表） | `StaleWhileRevalidate` |
| NetworkOnly | 永远走网络 | 支付/鉴权等不可缓存接口 | `NetworkOnly` |

```ts
// sw.ts（由 workbox-build 注入 precache 清单后构建为 sw.js）
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

// ① precache：App Shell —— 构建产物全量预缓存，清单由构建工具注入（self.__WB_MANIFEST）
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches(); // 清理旧版本 precache 缓存

// ② SWR：非关键数据 —— 秒开，后台更新下次生效
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/looks'),
  new StaleWhileRevalidate({ cacheName: 'api-swr' }),
);

// ③ 网络优先：关键数据 —— 3 秒超时兜底旧缓存，弱网不白屏
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/critical'),
  new NetworkFirst({ cacheName: 'api-critical', networkTimeoutSeconds: 3 }),
);

// ④ 缓存优先 + 容量治理：图片 —— 7 天/最多 200 项
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'img',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

// ⑤ 变更类请求：NetworkOnly + BackgroundSync 失败排队（见第 4 小节的队列）
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/mutations') && request.method === 'POST',
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('mutation-queue', { maxRetentionTime: 24 * 60 })], // 保留 24h
  }),
);
```

```ts
// 注册（应用入口）：必须在 HTTPS 或 localhost 下
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}
```

两个机制性认知：**版本更替**——新 SW 安装后进入 waiting，旧 SW 继续控制页面，直到所有标签页关闭（或新 SW 内 `self.skipWaiting()` + 客户端 `clientsClaim()`，但要接受"新旧资源混用"的风险，precache 清单天然缓解）；**存储持久性**——浏览器可能在全球存储压力下清除站点数据，重要数据请求 `navigator.storage.persist()`，并在设置页告知用户。

**2. IndexedDB 事务与索引（Dexie）**

IndexedDB 是浏览器唯一的异步结构化本地库，原生 API 是回调时代的产物（`onsuccess/onsuccess/onsuccess`），且有两个易踩的事务规则：**事务在创建它的任务栈结束（微任务队列清空）时自动提交**，之后发起新请求会抛 `TransactionInactiveError`；**索引只能在 `versionchange`（升级）事务里建**，线上改 schema 必须升版本。Dexie 把这些包成 Promise + 类 ORM：

```ts
import Dexie, { type Table } from 'dexie';

export interface Todo {
  id?: number;
  text: string;
  done: boolean;
  updatedAt: number; // 同步字段：冲突解决要用
}

class TodoDB extends Dexie {
  todos!: Table<Todo, number>;

  constructor() {
    super('todo-offline');
    // schema 字符串：'主键, 索引1, 索引2'；++id 自增主键；&title 唯一索引
    this.version(1).stores({ todos: '++id, done, updatedAt' });
    this.version(2).stores({ todos: '++id, done, updatedAt, text' }).upgrade((tx) => {
      // 版本升级事务：给旧数据补默认值，等价于 SQL 的 migration
      return tx.table('todos').toCollection().modify((t) => { t.text ??= ''; });
    });
  }
}

export const db = new TodoDB();

// 事务：done 与 updatedAt 要么同时写入，要么都不写（原子性）
await db.transaction('rw', db.todos, async () => {
  const todo = await db.todos.get(id);
  if (!todo) throw new Error(`todo ${id} 不存在`); // 抛错 → 整个事务回滚
  await db.todos.update(id, { done: !todo.done, updatedAt: Date.now() });
});

// 索引查询：走 updatedAt 索引范围扫描，而非全表过滤
const recent = await db.todos.where('updatedAt').above(Date.now() - 86_400_000).toArray();
```

Dexie 的 `liveQuery` 还能订阅查询结果——本地库变更自动推送 UI 重渲染，这正是 Local-first "UI 即本地数据库的投影" 的实现基石。

**3. 后台同步与冲突解决（LWW → CRDT 升级路径）**

后台同步：`sync` 事件（Service Worker 侧）在浏览器认为网络恢复时触发（由 Background Sync API 保证，见第 4 小节代码）；也可以简单依赖页面侧 `window.addEventListener('online', ...)`——两者都要有，`navigator.onLine` 只代表网卡状态（连上无网 WiFi 仍为 true）。

冲突解决的三级演进：

- **LWW（last-write-win）**：每条记录带 `updatedAt`，同步时"最后写的覆盖先写的"。实现一行，代价是丢更新——A、B 离线各自改同一条，后同步者覆盖前者，前者的修改静默消失。时钟不可靠（客户端时间可被篡改/漂移）时用**服务器时间或 HLC（混合逻辑时钟）**裁决。适用：字段语义独立、覆盖可接受的场景（笔记的"最后修改时间"、设置项）。
- **字段级 LWW + 操作日志**：把整行覆盖缩小到字段覆盖，同步单元从"记录"变"操作"（`{ op: 'set', field: 'done', value: true, ts }`），各自操作幂等重放、按 ts 逐字段合并——同一行不同字段的离线修改不再互杀。代价：要设计操作协议与幂等键。
- **CRDT**：操作本身可交换、可合并（数学上保证收敛），离线双方**并发编辑都能保留**。Yjs 的用法形状：

```ts
import * as Y from 'yjs';

const doc = new Y.Doc();
const text = doc.getText('content');
text.insert(0, 'hello');          // 本地编辑：插入操作而非快照
const remoteUpdate: Uint8Array = receiveFromPeer();
Y.applyUpdate(doc, remoteUpdate); // 对端离线期间的编辑直接合并进来，无需裁决胜负
const full = Y.encodeStateAsUpdate(doc); // 可持久化（配 y-indexeddb）、可传输（配 y-websocket）
```

升级路径总结：**能用 LWW 的（业务上覆盖可接受）不上 CRDT；字段/记录一旦进入"多人并发编辑同一内容"（文档、表格、白板、任务描述），CRDT 是终点**——这正是 B1 协同编辑那一族的领地，E2 与 B1 在这里合流。

**4. 乐观 UI + 断网队列重放（配队列实现思路）**

乐观 UI：写操作**先改本地（IndexedDB + UI 立即反映）即视为成功**，真正的网络请求进队列后台执行；失败（含断网）留在队列，恢复后按序重放；服务端确认后用服务端状态（含最终 `updatedAt`）覆盖本地。核心是三件套：幂等键（服务端按 key 去重，重放不产生重复数据）、按序重放（同一记录的先后操作不能乱序）、永久失败的人工兜底（重试耗尽进死信，提示用户）。

```ts
// mutation-queue.ts：队列本体（持久化在 IndexedDB，刷新/崩溃不丢）
import { db, type OutboxItem } from './db';

export class MutationQueue {
  private draining = false;

  async enqueue(item: Omit<OutboxItem, 'id' | 'retries' | 'createdAt'>) {
    await db.outbox.add({ ...item, id: crypto.randomUUID(), retries: 0, createdAt: Date.now() });
    void this.drain(); // 入队即尝试排空（在线时近乎直发）
  }

  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (true) {
        const [item] = await db.outbox.orderBy('createdAt').limit(1).toArray(); // 按入队序重放
        if (!item) break;
        try {
          const serverState = await fetch('/api/mutations', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'idempotency-key': item.id }, // 幂等键
            body: JSON.stringify({ name: item.name, payload: item.payload }),
          }).then((r) => r.json());
          await db.transaction('rw', db.todos, db.outbox, async () => {
            await applyServerState(serverState);   // 服务端状态落地（含最终 updatedAt）
            await db.outbox.delete(item.id);       // 确认后才出队：at-least-once
          });
        } catch (err) {
          if (isPermanentError(err) || item.retries >= 5) {
            await markDeadLetter(item);            // 死信：进 UI 提示，不再自动重试
            await db.outbox.delete(item.id);
            break;
          }
          await db.outbox.update(item.id, { retries: item.retries + 1 });
          await backoff(item.retries);            // 指数退避：1s/2s/4s...
          break;                                  // 网络类失败：本轮终止，等 online/sync 再来
        }
      }
    } finally {
      this.draining = false;
    }
  }
}

async function backoff(retries: number) {
  await new Promise((r) => setTimeout(r, 1000 * 2 ** retries));
}
function isPermanentError(err: unknown): boolean {
  return err instanceof HttpError && err.status >= 400 && err.status < 500; // 4xx 重试无意义，5xx 值得再试
}
```

触发排空的三个钩子：入队时（在线直发）、页面 `online` 事件、Service Worker 的 Background Sync 事件（页面已关闭也能由浏览器唤醒 SW 排空队列）：

```ts
// sw.ts 内：注册的后台同步 tag 与 BackgroundSyncPlugin 的队列名配合
self.addEventListener('sync', (event: ExtendableEvent) => {
  if ((event as SyncEvent).tag === 'mutation-queue') {
    event.waitUntil(drainOutboxAndReport());
  }
});
```

页面主线程注册：

```ts
const reg = await navigator.serviceWorker.ready;
await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
  .sync.register('mutation-queue');
```

UX 关键：乐观更新在 UI 上要有"待确认"态（小转圈），确认后落定；死信要显式告警并允许用户编辑重发——**不能假装一切都会成功**。

**5. 数据层选型认知：RxDB / ElectricSQL / PowerSync**

自建到一定规模就该换成品，三者的定位差异要能一句话说清：

- **RxDB**：浏览器/Node 的响应式本地数据库（底层可插 IndexedDB），查询是 RxJS Observable（数据一变 UI 自动推），自带 replication 协议（可对接自建 GraphQL/REST/CouchDB），冲突策略可插拔。适合：自己掌控后端、要深度定制同步协议的团队。
- **ElectricSQL**：Postgres 专用同步层——读写全走本地（SQLite/WASM），后台与 Postgres 做部分复制（partial replication，按规则只同步用户该看的分片），冲突由其同步引擎合并。适合：后端就是 Postgres、想把 API 层省掉、数据分片复杂的产品。
- **PowerSync**：同步引擎 + 客户端 SQLite 离线库，后端无关（Postgres/Mongo/Firebase 都有连接器），同步规则用声明式 SQL 配置分片，写路径走"在线写 API + 同步回拉"。适合：已有后端服务与权限体系、只想加离线能力的存量 App。

选型口诀：**要控制权选 RxDB，全栈 Postgres 选 ElectricSQL，存量后端加离线选 PowerSync**；验证任何一家前，先用本节的手写版（Dexie + 队列 + LWW）跑通业务闭环，你会更清楚成品替你解决了什么。

#### 代表

Notion、Linear（断网可用、多端一致的标杆）、Figma（本地渲染 + 服务端同步的极端案例）；工具侧 Workbox、Dexie、RxDB。

#### 入手路径

给 IM 或 Todo 做离线可用：Workbox 三策略（precache + SWR + NetworkFirst）让外壳与只读数据离线可开；Dexie 存全量数据、liveQuery 驱动 UI；所有写操作走乐观更新 + outbox 队列；断网操作一批 → 恢复后自动重放 → 服务端 LWW 合并 → 断网期间另一端的改动按字段级规则保得住。做完顺手验证 B2 的衔接：IM 的"乐观发送/撤回"正是同一队列的两个操作类型。

#### 常见坑

- 所有接口一个策略（全 SWR）：余额/库存这类关键数据离线给旧值且无提示；或全 NetworkFirst：断网即死。策略必须按资源分。
- SW 更新不处理 waiting 态：用户永远跑旧版本，直到某天所有标签关闭"突然换新版"。
- 乐观 UI 只改内存 state 不落库：刷新页面"已成功的操作"消失——本地必须先持久化。
- 队列重放不做幂等键：网络超时但服务端已成功，重试产生重复数据（最常见的生产事故）。
- IndexedDB schema 改动不升版本/不写 upgrade：老用户升级后首次打开即崩。
- 忽略浏览器存储回收（尤其移动端隐身模式配额更小）：大数据不做 `persist()` 与容量规划，用户数据被静默清空。

## F. AI 原生前端（当下最热，且与你的 Schema 线天然衔接）

F 族只有两个场景，却是当前招聘需求增长最快的一族。先说清楚"AI 原生前端"和"给 AI 产品套个壳"的区别：后者是把现成组件库拼成聊天页，前者要自己解决**流式数据的渲染问题**（增量解析、未闭合语法、中断恢复）、**LLM 输出的结构化消费问题**（JSON Schema 约束、schema 渲染器复用）、以及**长会话与高频更新的性能问题**（消息虚拟化、节点画布的 rAF 合并）。这三类问题恰好都落在你的既有技能延长线上：流式渲染是"列表性能"的新变体，生成式 UI 就是进阶大纲的 schema 渲染器换了个数据生产者，Agent 画布是 A4 节点编排 + Setter 面板的组合。这也是本族难度标"★★★☆☆ 入门，做好极难"的原因——做出 demo 一小时，做到生产级要吃透本节每一个小节。

### F1. 流式对话 / 生成式 UI（★★★☆☆ 入门，做好极难）

- **核心技术**：
  - 流式：fetch ReadableStream / SSE / Vercel AI SDK（useChat 抽象）；**流式 Markdown 的"未闭合代码块"渲染坑**（增量解析/分段渲染）；打字机与平滑滚动；中断（AbortController）/重新生成/编辑重发；token 速度与用量展示
  - 长会话性能：消息流虚拟化（动态高度）、可视区外 markdown 不渲染、图片/代码块懒渲染
  - **生成式 UI：LLM 结构化输出（JSON Schema 约束）→ 动态组件渲染**——本质就是你进阶大纲的 schema 渲染器，直接复用！
  - 工具调用/思考过程可视化（步骤折叠、状态流转、失败重试）；RAG 引用溯源（高亮跳转）；敏感内容遮罩
- **代表**：ChatGPT、Claude、Dify、Coze
- **入手**：做一个支持流式渲染/中断重发/工具调用折叠的聊天界面，再加一个"LLM 输出 schema → 页面实时渲染"的生成式 UI demo

以上是骨架，下面按"流式 → 渲染 → 交互 → 性能 → 结构化"的顺序逐个击破。

---

#### F1.1 流式的三条路：fetch ReadableStream / SSE / Vercel AI SDK

**是什么**：LLM 接口不会等全文生成完再返回，而是把回答切成小块（delta）边生成边推送。前端拿到的是一条 HTTP 长响应， body 是持续增长的字节流。所谓"三条路"，是把这条字节流变成 React state 的三种工程选择：自己解析（fetch + ReadableStream）、用浏览器内置协议（SSE + EventSource）、用官方抽象（Vercel AI SDK 的 useChat）。

**为什么需要**：如果用普通 `await res.json()`，用户要盯着空白等 10–60 秒——对话产品的体感生死线就在这里。流式把"首字节时间"从几十秒压到 1 秒内，后续内容持续到达。而理解三条路的差异，决定了你在"快速出 demo"和"深度定制"之间怎么选。

##### 路线一：fetch + ReadableStream 手动解析（必学底层）

这是最裸的一条路：POST 请求、读字节流、自己按 SSE 格式切事件、自己维护缓冲。所有上层封装（包括 useChat）内核都是这套逻辑，出了问题（中文乱码、事件粘包、中断异常）只有读过这条路的人能修。

怎么做，机制分四步：

1. `fetch` 拿到 `Response`，`res.body` 是 `ReadableStream<Uint8Array>`；
2. `getReader()` 循环 `read()`，每次拿到一个网络分片（一个分片可能含半个事件，也可能含三个事件）；
3. `TextDecoder` 把字节解成字符串——注意必须用 `stream: true` 模式，否则一个多字节中文字符恰好被网络包从中间切开时会解出乱码；
4. 按 SSE 协议切事件：事件以**空行**（`\n\n`）结尾，数据行以 `data: ` 开头，OpenAI 风格用 `data: [DONE]` 表示流结束。

完整代码：

```ts
// streamChat.ts —— 手动解析 SSE 格式的流式对话响应（生产可用的骨架）
export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export async function streamChat(options: {
  url: string
  body: unknown
  onDelta: (text: string) => void // 每收到一段增量文本就回调
  onDone?: () => void
  signal?: AbortSignal // 中断信号，见 F1.4
}): Promise<void> {
  const res = await fetch(options.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body),
    signal: options.signal, // abort() 后 fetch/read() 会抛 AbortError
  })

  // 注意：流式接口的错误体也可能是 JSON，不能只 throw，先尝试读出来给上层展示
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.body) throw new Error('当前环境不支持流式响应')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = '' // 事件可能跨网络分片，必须留缓冲

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // stream:true 让 decoder 记住上一片的"半个字符"，多字节中文不乱码
    buffer += decoder.decode(value, { stream: true })

    // SSE 事件以空行分隔；最后一段可能不完整，pop 出来留到下一轮
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const evt of events) {
      // 一个事件内可能有多行 data:，按协议拼接
      const data = evt
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data || data === '[DONE]') continue
      const json = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>
      }
      const delta = json.choices?.[0]?.delta?.content
      if (delta) options.onDelta(delta)
    }
  }
  options.onDone?.()
}
```

在组件里消费它（状态设计先给最简版，完整状态机见 F1.4）：

```tsx
import { useRef, useState } from 'react'
import { streamChat, type ChatMessage } from './streamChat'

export function useChatSimple() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const abortRef = useRef<AbortController | null>(null)

  async function send(text: string) {
    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages([...history, { role: 'assistant', content: '' }]) // 先放一条空的 assistant 占位
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamChat({
        url: '/api/chat',
        body: { messages: history },
        signal: controller.signal,
        onDelta: (delta) => {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + delta }
            return next
          })
        },
      })
    } catch (err) {
      if (!controller.signal.aborted) throw err // 用户主动中断不算错误
    }
  }

  return { messages, send, stop: () => abortRef.current?.abort() }
}
```

常见坑：

- **症状**：中文偶尔出现"�"。**根因**：没开 `decoder.decode(value, { stream: true })`，一个 UTF-8 三字节字符被拆在两个分片里。**修法**：如上开 stream 模式，且 decoder 实例要跨分片复用（每次 new 一个等于白开）。
- **症状**：偶发丢 delta 或 JSON.parse 报错。**根因**：直接对单个分片 `split('\n\n')` 后把所有段都当完整事件解析，没把末段留缓冲。**修法**：`events.pop()` 留 buffer。
- **症状**：流到一半服务端报错，页面无感知地"卡住"。**根因**：有些网关在 200 已发出后用流内错误事件（如 `data: {"error": ...}`）表达失败。**修法**：在 parse 后检查错误字段，抛给上层状态机。
- `res.ok` 为 false 时 body 可能不是流，用 `res.text()` 读错误体，别直接 `getReader()`。

##### 路线二：SSE 与 EventSource（标准协议，能力受限）

SSE（Server-Sent Events）是把"服务端单向推流"标准化的协议：`Content-Type: text/event-stream`，事件格式就是上面手工解析的那套（`data:` 行 + 空行结束）。浏览器给了原生 `EventSource` API：

```tsx
// SSEClient.tsx —— EventSource 订阅服务端事件流
import { useEffect, useState } from 'react'

export function useCounter(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // 只能 GET；鉴权只能靠 Cookie（带自定义 Authorization 头做不到）
    const es = new EventSource('/api/events?channel=demo')

    es.onmessage = (e) => {
      // e.data 是单个 data: 行的内容字符串，需要自己 JSON.parse
      const payload = JSON.parse(e.data) as { type: string; value?: number }
      if (payload.type === 'count') setCount(payload.value ?? 0)
    }

    // EventSource 断线自动重连（这是它最大的便利）；服务端可用 `retry: 3000` 控制间隔
    es.onerror = () => {
      // 这里通常什么都不用做，浏览器会自动重连；想彻底停掉必须 close()
    }

    return () => es.close() // 组件卸载必须关，否则连接泄漏
  }, [])

  return count
}
```

为什么对话场景反而**很少**直接用 EventSource——它的四个硬限制：

1. **只支持 GET**：对话要 POST 一大坨 messages 历史，URL 塞不下；
2. **不能带自定义 Header**：`Authorization: Bearer ...` 加不进去，只能靠 Cookie 鉴权；
3. **自动重连无法关闭定制**：对话流断了重发整段请求，服务端会重新生成一遍，成本翻倍；
4. **无进度抽象**：onmessage 拿不到"这次连接对应哪次请求"的语义。

它的正确用途：通知中心、行情推送、任务进度广播这类"可重放的幂等订阅"。对话场景若想借 SSE 的标准格式，业界通行做法是路线一（fetch POST 手动解析 SSE 格式）或 `@microsoft/fetch-event-source`（支持 POST + 自定义头 + 手动重连控制的库），而不是 EventSource。

##### 路线三：Vercel AI SDK 的 useChat（官方抽象，快速上手）

`useChat` 把"发请求、解析流、维护 messages、中断、重试、乐观更新"全部封装掉，你只写 UI：

```tsx
// app/chat/page.tsx —— 客户端
'use client'
import { useChat } from '@ai-sdk/react' // AI SDK v5；v4 从 'ai/react' 导入
import { useEffect, useRef } from 'react'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, reload, error } =
    useChat({ api: '/api/chat' })

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView() // 最简跟随；平滑版见 F1.3
  }, [messages])

  return (
    <div className="chat">
      {messages.map((m) => (
        <div key={m.id} className={m.role}>
          {/* v5 里消息内容在 m.parts 数组（text/tool 等分块）；v4 直接用 m.content */}
          {m.parts?.map((p, i) => (p.type === 'text' ? <p key={i}>{p.text}</p> : null))}
        </div>
      ))}
      {error && <p className="error">{error.message}</p>}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        {isLoading ? <button onClick={stop}>停止</button> : <button type="submit">发送</button>}
        {!isLoading && messages.length > 0 && <button onClick={reload}>重新生成</button>}
      </form>
      <div ref={bottomRef} />
    </div>
  )
}
```

```ts
// app/api/chat/route.ts —— 服务端（Next.js App Router）
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
  })
  // 把文本流包装成 UI 消息流；v5 的方法名是 toUIMessageStreamResponse，v4 为 toDataStreamResponse
  return result.toUIMessageStreamResponse()
}
```

useChat 替你做了什么（也是评估"要不要自己写"的清单）：messages 状态与乐观 user 消息、流解析（含工具调用、推理内容等 part 类型）、`stop()`（内部就是 AbortController）、`reload()`（重新生成上一轮）、错误与重试、自定义请求头/请求体钩子。

**什么时候仍要退回路线一**：后端不是 AI SDK 的流格式（自研网关、gRPC 转 SSE 的私有协议）；需要在 delta 层做自定义处理（敏感词实时遮罩的流内检测、token 计速）；消息模型和它的 `UIMessage` 结构差异太大（如需要把每条消息拆成自己的 part 结构）。此时用路线一的 `streamChat` + F1.4 的状态机即可，工作量可控。

##### 三条路怎么选（决策表）

| 维度 | fetch + ReadableStream | SSE / EventSource | Vercel AI SDK useChat |
|---|---|---|---|
| 掌握后能修的层 | 全链路（字节→事件→状态） | 协议层 | 抽象层，协议被封装 |
| 请求方式 | 任意（POST/头/体） | GET + Cookie | POST，可定制 |
| 开发速度 | 慢（自己写状态机） | 中 | 快（分钟级 demo） |
| 定制自由度 | 最高 | 低 | 中（钩子够用则高） |
| 适用 | 自研协议/深度定制/学习期 | 幂等推送类订阅 | Next.js 或 AI SDK 生态内的产品开发 |

结论：**先用 useChat 把产品跑起来，同时必须手写一遍路线一**——面试和线上排障考的都是后者。

---

#### F1.2 流式 Markdown 的"未闭合代码块"渲染坑（本节是 F1 的密度担当）

**是什么**：助手回复通常是 Markdown，流式期间页面要"边到边渲"。当代码块的开始围栏 ` ``` ` 已经到达、而结束围栏还没到达时，naive 的渲染方案会出各种诡异现象。这是流式对话 UI 的第一大坑，几乎所有自研聊天前端都在这里翻过车。

**为什么需要专门处理**——先看两种典型症状的根因。

症状 A：**整段文本"变成代码"再"跳回正文"**。LLM 输出：

````text
先看示例：

```python
def add(a, b):
    return a + b
```

上面函数返回两数之和。
````

流式到达 ` ```python ` 和函数体之后、结束围栏之前，文档处于"围栏未闭合"状态。CommonMark 规范规定：**未闭合的代码围栏会一直吞到文档末尾**。所以此时"上面函数返回两数之和"还没到达没关系；真正难受的是——结束围栏到达前的任何后续普通文本（比如 LLM 在代码后继续写的说明）都会先以等宽代码字体渲染，结束围栏到达瞬间再整段跳回正常排版。用户看到的是：文字先是代码样式，突然"啪"一下整块重排、宽度变化、闪烁。

症状 B：**未闭合内容整段消失**。很多自研方案为了性能会把 markdown 按"块"切分、逐块渲染；如果切块逻辑不认识未闭合围栏，就会把 ` ```python ... `（无闭合）这一段当成"非法块"丢弃或原样输出反引号——于是代码内容忽隐忽现，闭合时又突然出现，观感就是闪烁 + 跳变。

**为什么不能每个 token 全量重渲**（性能层面的第二重坑）：

1. 每个到达的 delta 都让 `content` 变成新字符串；`<ReactMarkdown>{content}</ReactMarkdown>` 会**重新解析整篇文档**。一篇 N 字符的回复、按平均 3 字符一个 delta 到达，就是 O(N) 次解析、每次 O(N) 工作量，总成本 O(N²)。回答到几千字符时，主线程开始被解析占满，打字动画掉帧、输入框卡顿。
2. memo 全部失效：所有块的 props（同一棵 AST 或同一字符串）每次都是新引用，整条消息的所有子块每 token 重渲一次。
3. 代码高亮是重灾区：若对代码块逐 token 跑语法高亮（shiki/Prism），一个 30 行代码块会触发上百次全文高亮，而高亮本身是毫秒级操作，乘上去就是灾难。

**怎么做（解法）**：按块分段渲染 + 稳定 key + memo 冻结前缀块 + 尾块特殊处理（未闭合围栏自动补一个虚拟闭合围栏，让它立刻按代码块渲染成型）。核心洞察是：**流式追加只可能改变最后一个块，前面的块一旦完整就永远不变**——利用这一点把 O(N²) 降为 O(N)，同时消灭症状 A/B。

第一步，切块器（识别围栏状态机的完整实现）：

```ts
// splitMarkdownBlocks.ts —— 把流式 markdown 切成"稳定块"
// 规则：闭合的代码块、空行分隔的段落都是完整块；文档末尾允许存在一个未完成块
export type Block = {
  key: string
  content: string
  kind: 'code' | 'text'
  closed: boolean // false = 可能还在生长（流式尾部）
}

export function splitMarkdownBlocks(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let current: string[] = []
  let inFence = false
  let fenceMark = '```' // 记录开围栏的符号与长度：闭合围栏必须不短于它

  const flush = (kind: 'code' | 'text', closed: boolean) => {
    if (current.length === 0) return
    // key 用"序号 + 首行前缀"：前缀块内容不变则 key 不变，memo 与列表 diff 都吃到稳定 key
    blocks.push({
      key: `${blocks.length}|${current[0].slice(0, 24)}`,
      content: current.join('\n'),
      kind,
      closed,
    })
    current = []
  }

  for (const line of lines) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      if (!inFence) {
        flush('text', true) // 围栏开始前，把累积的普通段落先切出去（完整）
        inFence = true
        fenceMark = fence[1]
        current.push(line)
      } else if (line.trim().length >= fenceMark.length && line.trim().startsWith(fenceMark[0].repeat(3))) {
        current.push(line)
        inFence = false
        flush('code', true) // 完整闭合的代码块：从此进入"冻结区"，永远不再变
      } else {
        current.push(line) // 代码内容里出现的 ``` 字符串，原样保留在块内
      }
      continue
    }
    if (!inFence && line.trim() === '') {
      flush('text', true) // 空行 = 段落边界（含标题/列表/引用的粗粒度切分）
      continue
    }
    current.push(line)
  }
  // 收尾：围栏外 → 段落可能没写完；围栏内 → 代码块未闭合
  flush(inFence ? 'code' : 'text', !inFence)
  return blocks
}
```

第二步，流式渲染组件（memo 冻结 + 尾块特殊处理）：

```tsx
// MarkdownStream.tsx —— 流式 markdown 渲染：只有最后一个块在重渲
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { splitMarkdownBlocks } from './splitMarkdownBlocks'

// 单个稳定块：内容不变（引用相等）就跳过重渲 —— O(N²) 降到 O(N) 的关键
const StableBlock = memo(function StableBlock({ content }: { content: string }) {
  return (
    <div className="md-block">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
})

export function MarkdownStream({ content, streaming }: { content: string; streaming: boolean }) {
  const blocks = useMemo(() => splitMarkdownBlocks(content), [content])
  const last = blocks.length - 1

  return (
    <div className="md-stream">
      {blocks.map((b, i) => {
        // 尾块且是未闭合代码块：补一个虚拟闭合围栏，让它立刻按代码块渲染成型
        // —— 这一步同时消灭"整段消失"（症状 B）和"闭合瞬间跳变"（症状 A 的主要来源）
        const isTail = i === last && streaming
        const tailContent =
          isTail && !b.closed && b.kind === 'code' ? b.content + '\n```' : b.content
        return (
          <div key={b.key} className={isTail && !b.closed ? 'md-tail' : undefined}>
            <StableBlock content={tailContent} />
            {isTail && !b.closed && <span className="md-caret" aria-hidden />}
          </div>
        )
      })}
    </div>
  )
}
```

机制分步总结（对照上面代码）：

1. **切块**：状态机扫行，围栏内不按空行切，保证代码块整体性；
2. **冻结**：所有 `closed: true` 的块用 `memo` + 稳定 key，流式期间零重渲；
3. **尾块成型**：未闭合代码块补虚拟 ` ``` `，渲染结果与最终闭合后一致，用户看到的代码块从第一行代码到达时就"长对了"；
4. **打字指示**：尾块挂一个光标符号，闭合/流结束后移除。

常见坑：

- **高亮时机**：别在尾块上跑语法高亮（每 token 全文高亮）。正确做法：`StableBlock` 接收 `closed`，代码块 `closed === true` 才走高亮（配合 F1.6 的懒高亮组件），尾块渲染纯 `<pre>` 即可——视觉上几乎无差别，性能差一个数量级。
- **表格是同款坑**：Markdown 表格需要"表头行 + 分隔行"才成立。流式中表头先到、分隔行未到时，remark 会把它当普通段落渲染，分隔行到达时跳变为表格。用同样的"尾块特殊处理"思路：尾块若以 `|` 开头就按表格进行时渲染（或暂时按纯文本），完成后再切回。
- **行内代码跨 chunk**：`` `code `` 的一半先到，remark 当普通文本渲染，另一半到达时跳变。这个问题只存在于尾块且幅度小，通常可接受；追求极致可以对尾块延迟 1–2 个 delta 再渲。
- **key 别用内容 hash**：内容 hash 对"前缀块不变"没有帮助（hash 稳定但 memo 比较的是 props 引用），用上面的"序号 + 首行前缀"就够了。
- **`remark-gfm` 与纯 remark 的差异**：GFM 开启后表格/删除语法/任务列表的"未完成态"表现不同，切块器只需处理围栏，其余交给尾块策略兜底。

---

#### F1.3 打字机效果与平滑滚动

**是什么**：打字机效果指界面不是 delta 一到就整段刷出，而是以接近恒定的视觉速度逐字浮现；平滑滚动指新内容到达时视口始终"钉"在底部，用户上滚阅读时立即停止跟随。

**为什么需要**：LLM 的 delta 到达节奏极不均匀——网络抖动时半秒没动静，然后一口气来 200 字符。直接渲染的观感是"卡住→爆出一段→又卡住"。打字机本质是一个**消费缓冲队列**：到达速度的抖动被队列吸收，输出速度恒定。平滑滚动则解决"我正在往上翻历史，新内容到达把视口拽到底部"的经典骚扰。

**怎么做（打字机）**——rAF 追赶式打字（比 setInterval 逐字更顺滑，且自适应落后程度）：

```tsx
// useSmoothText.ts —— 追赶式打字机：落后越多每帧吐得越多
import { useEffect, useRef, useState } from 'react'

export function useSmoothText(target: string, active: boolean) {
  const [shown, setShown] = useState(active ? '' : target)
  const shownRef = useRef(shown)

  useEffect(() => {
    if (!active) {
      // 非流式状态（历史消息/流已结束）：直接显示全文，不播动画
      shownRef.current = target
      setShown(target)
      return
    }
    let raf = 0
    const step = () => {
      const pending = target.length - shownRef.current.length
      if (pending > 0) {
        // 自适应步长：落后 40 字符以内每帧 1 字（约 60 字/秒的"打字感"）；
        // 落后更多则加速追赶，避免"越落越远"永远播不完
        const n = pending > 40 ? Math.ceil(pending / 6) : 1
        shownRef.current = target.slice(0, shownRef.current.length + n)
        setShown(shownRef.current)
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, active])

  return shown
}
```

使用方式：`const shown = useSmoothText(assistantMessage.content, status === 'streaming')`，把 `shown` 喂给 F1.2 的 `MarkdownStream`。注意打字机 hook 与分段渲染天然兼容——`shown` 是 `content` 的前缀，切块器照样工作。

**怎么做（平滑滚动）**——stick-to-bottom（贴底跟随）三件套：

```tsx
// useStickToBottom.ts —— 视口贴底：用户上滚即脱钉，滚回底部重新钉住
import { useEffect, useRef, useState } from 'react'

export function useStickToBottom<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [pinned, setPinned] = useState(true) // 是否贴底跟随

  // 1. 滚动监听：判定"用户是否在底部附近"
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      setPinned(distance < 80) // 阈值 80px：容掉 iOS 橡皮筋与亚像素误差
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // 2. 每次渲染（内容增长都会触发渲染）时，钉住则贴底
  useEffect(() => {
    const el = ref.current
    if (pinned && el) el.scrollTop = el.scrollHeight // 直接设置，不用 smooth，原因见下
  })

  return { ref, pinned }
}
```

配套 UI：`pinned === false` 时右下角浮出"回到底部"按钮（顺带显示"↓ 3 条新消息"）：

```tsx
import { useStickToBottom } from './useStickToBottom'

export function ChatScroll({ children }: { children: React.ReactNode }) {
  const { ref, pinned } = useStickToBottom<HTMLDivElement>()
  return (
    <div className="chat-scroll-wrap">
      <div ref={ref} className="chat-scroll">
        {children}
      </div>
      {!pinned && (
        <button
          className="jump-bottom"
          onClick={() => {
            const el = ref.current
            if (el) el.scrollTop = el.scrollHeight // 点击回底，下一帧会重新钉住
          }}
        >
          回到底部
        </button>
      )}
    </div>
  )
}
```

常见坑：

- **别用 `scrollIntoView({ behavior: 'smooth' })` 做流式跟随**。流式期间每秒触发十几次，多个 smooth 动画互相打断、视口来回"抽搐"。流式跟随用 `scrollTop` 直赋；smooth 只用在"回到底部"按钮这类单次动作上。
- **打字机 + 表格/公式**：逐字渲染表格尾块会持续重排，配合 F1.2 的尾块策略（未完成表格暂按文本渲）可接受；对延迟敏感的场景可以直接跳过打字机（`active=false`），ChatGPT 早期就是这么做的。
- **脱钉判定要 passive 监听**：scroll 回调里不要做重活，否则滚动掉帧；判定只需读三个属性做减法。
- **虚拟化列表的贴底**（F1.6）不能读 `scrollHeight` 死值——条目动态测量时它会变，改为在测量完成后由虚拟器回调里补一次贴底。

---

#### F1.4 中断、重新生成、编辑重发的状态设计

**是什么**：对话产品的三个高频动作——中断（用户点"停止生成"）、重新生成（对答案不满意，重掷一次）、编辑重发（改自己之前的问题，从那个分叉点重跑）——共享同一套状态机。

**为什么需要**：这三个动作都会打破"消息数组只追加"的简单模型：中断要在半截内容上停、重新生成要"删掉重来"、编辑重发要**截断历史**（ChatGPT 编辑旧消息后会产生新分支，旧分支可切换）。状态设计没做好，典型 bug 是：中断后点重新生成，页面上出现两条半截回答；或编辑重发后旧回答还挂在列表里。

**怎么做**：一个 reducer 管消息数组与运行状态，一个"唯一的发起入口"管流。三条铁律：

1. **运行状态只有一份**：新一轮开始前必须 abort 上一轮（编辑重发时尤其容易漏）；
2. **中断不是错误**：abort 保留半截内容（用户可能就想看前半段），错误则要给出重试入口；
3. **重新生成 = 弹出尾部 assistant 消息再跑；编辑重发 = 截断到目标 user 消息前、替换内容再跑**。

完整状态机代码：

```tsx
// useConversation.ts —— 对话状态机：发送 / 流式追加 / 中断 / 重新生成 / 编辑重发
import { useCallback, useReducer, useRef, useState } from 'react'
import { streamChat } from './streamChat'

type Message = { id: string; role: 'user' | 'assistant'; content: string }
type Status = 'idle' | 'streaming' | 'error'

type State = { messages: Message[]; status: Status; error: string | null }

type Action =
  | { type: 'reset'; messages: Message[] }                      // 截断/重置（编辑重发、清空）
  | { type: 'append'; message: Message }                        // 追加（user 提问 / assistant 占位）
  | { type: 'delta'; id: string; text: string }                 // assistant 增量
  | { type: 'status'; status: Status; error?: string | null }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { ...state, messages: action.messages }
    case 'append':
      return { ...state, messages: [...state.messages, action.message] }
    case 'delta':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: m.content + action.text } : m,
        ),
      }
    case 'status':
      return { ...state, status: action.status, error: action.error ?? null }
  }
}

export function useConversation() {
  const [state, dispatch] = useReducer(reducer, { messages: [], status: 'idle', error: null })
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = state.messages // 渲染时同步一份 ref，回调里永远读到最新值（防闭包旧值）

  // 唯一的"跑一轮"入口：所有动作（发送/重发/编辑）最终都归约到它
  const run = useCallback(async (history: Message[]) => {
    abortRef.current?.abort() // 铁律 1：掐掉上一轮，任何入口进来都先执行
    const controller = new AbortController()
    abortRef.current = controller
    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    dispatch({ type: 'append', message: { id: assistantId, role: 'assistant', content: '' } })
    dispatch({ type: 'status', status: 'streaming' })

    try {
      await streamChat({
        url: '/api/chat',
        body: { messages: history },
        signal: controller.signal,
        onDelta: (text) => dispatch({ type: 'delta', id: assistantId, text }),
      })
      dispatch({ type: 'status', status: 'idle' })
    } catch (err) {
      // 铁律 2：用户主动中断 → 保留半截内容，回到 idle（不算 error）
      if (controller.signal.aborted) {
        dispatch({ type: 'status', status: 'idle' })
        return
      }
      dispatch({ type: 'status', status: 'error', error: String(err) })
    }
  }, [])

  // 发送新消息
  const send = useCallback(
    (text: string) => {
      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
      dispatch({ type: 'append', message: userMsg })
      run([...messagesRef.current, userMsg])
    },
    [run],
  )

  // 重新生成：弹掉尾部所有 assistant 消息（含被中断的半截），从最后一条 user 重跑
  const regenerate = useCallback(() => {
    const msgs = [...messagesRef.current]
    while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop()
    if (msgs.length === 0) return
    dispatch({ type: 'reset', messages: msgs }) // 铁律 3 前半：先删再跑，UI 不会出现双份
    run(msgs)
  }, [run])

  // 编辑重发：截断到 index 之前，替换 user 内容，从该分叉点重跑
  const editResend = useCallback(
    (index: number, newText: string) => {
      const head = messagesRef.current.slice(0, index) // 丢弃被编辑消息及其后全部消息
      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: newText }
      dispatch({ type: 'reset', messages: [...head, userMsg] })
      run([...head, userMsg])
    },
    [run],
  )

  // 中断：abort 会让 streamChat 的 fetch/read 抛 AbortError，走 run 里的 aborted 分支
  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { ...state, send, stop, regenerate, editResend }
}
```

编辑入口 UI 的最小示意（hover 历史消息出现"编辑"，渲染列表时把消息下标传进来）：

```tsx
function EditableUserMessage({
  msg,
  index,
  onResend,
}: {
  msg: Message
  index: number
  onResend: (index: number, text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(msg.content)
  if (!editing)
    return (
      <div className="msg user">
        {msg.content}
        <button onClick={() => setEditing(true)}>编辑</button>
      </div>
    )
  return (
    <div className="msg user editing">
      <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      {/* 把消息自身在数组中的下标传给 editResend：截断语义以它为锚点 */}
      <button onClick={() => onResend(index, draft)}>保存并重发</button>
      <button onClick={() => setEditing(false)}>取消</button>
    </div>
  )
}
```

常见坑：

- **闭包旧值**：`send` 里如果直接读 `state.messages` 而不用 `messagesRef`，连续快速点发送会丢消息——两次点击共用同一个旧的 `messages` 快照。用 ref 镜像或函数式更新解决。
- **"中断后重新生成出现两条回答"**：根因是重新生成没有先 `reset` 弹掉半截 assistant，而是直接 `run` 追加了一条新占位。务必先删后跑。
- **编辑重发后的"分支历史"**：产品要 ChatGPT 式的分支切换（编辑保留旧分支可回看），需要把 `messages` 存成树（每条消息带 `parentId`，UI 沿 active 叶子回溯成链）。没有这个需求就不要上树，线性数组 + 截断即可。
- **AbortError 的类型判断**：不要 `catch (e) { if (e.name === 'AbortError') }` 了事——有的环境抛 DOMException、有的抛普通 Error，用 `controller.signal.aborted` 判断最稳（代码里已用）。

---

#### F1.5 token 速度与用量展示

**是什么**：流式期间展示 tok/s（生成速度）与累计 token 用量；流结束展示本轮/本次会话消耗。小功能，但它是用户感知"模型快慢、成本几何"的唯一窗口，也是调试提示词（输出过长）的仪表。

**为什么需要**：tok/s 是流式体验的客观指标（同一模型不同部署差 3–5 倍很常见）；用量展示在企业场景是刚需（按 token 计费，用户要知道这轮花了多少钱）。

**怎么做**，机制三步：

1. **速度**：滑动窗口统计——记录每个 delta 的 `{ chars, t }`，每 500ms 汇总最近 2 秒窗口内的字符数，按"约 4 字符 ≈ 1 token（英文）"估算；中文大约 1 字符 ≈ 0.6–1 token（不同 tokenizer 差异大，估算仅供展示）。
2. **精确用量**：OpenAI 兼容接口在流模式下通过 `stream_options: { include_usage: true }` 让最后一个 chunk 带上 `usage: { prompt_tokens, completion_tokens, total_tokens }`；以它为准覆盖估算值。
3. **展示**：流式中显示 `12.4 tok/s · 约 356 tokens`，结束后显示 `本轮 482 tokens（输入 320 / 输出 162）`。

```tsx
// useStreamRate.ts —— 滑动窗口 token 速率估算
import { useEffect, useRef, useState } from 'react'

type Sample = { chars: number; t: number }

export function useStreamRate() {
  const samplesRef = useRef<Sample[]>([])
  const [rate, setRate] = useState(0) // 估算 tok/s
  const [totalChars, setTotalChars] = useState(0)

  // 组件里把它接到 onDelta：record(delta.length)
  const record = (chars: number) => {
    samplesRef.current.push({ chars, t: performance.now() })
    setTotalChars((c) => c + chars)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now()
      const windowStart = now - 2000 // 只统计最近 2 秒
      samplesRef.current = samplesRef.current.filter((s) => s.t >= windowStart)
      const chars = samplesRef.current.reduce((sum, s) => sum + s.chars, 0)
      const charPerSec = chars / 2
      setRate(charPerSec / 4) // 4 字符 ≈ 1 token 的粗估，仅展示用
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return { record, rate, totalTokens: Math.round(totalChars / 4) }
}
```

服务端开精确用量（OpenAI 兼容接口）：

```ts
// 服务端转发请求时带上 stream_options，最后一个 chunk 会包含 usage
await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    stream: true,
    stream_options: { include_usage: true }, // 关键：流模式也要 usage
    messages,
  }),
})
```

前端解析处加一个分支：`if (json.usage) dispatch({ type: 'usage', usage: json.usage })`。

常见坑：

- 估算值和真实值可能差 30%+（中英混排、代码、表情符的 token 密度完全不同），UI 上标注"约"，流结束用 `usage` 覆盖。
- 别每个 delta 都 `setState` 计速——采样窗口本身就该低频（500ms），高频 setState 会和打字机 hook 抢渲染。
- 重连/重新生成后要清零 `samplesRef` 与 `totalChars`，否则速率虚高。

---

#### F1.6 长会话性能：消息虚拟化、可视区外不渲染、懒高亮

**是什么**：会话超过几百条消息后，朴素的全量渲染会遇到三类成本：DOM 数量（每条消息几十到几百个节点，千条消息就是十万级 DOM）、markdown 解析（历史消息每次会话打开都要重新 parse）、代码块高亮（shiki 一块就要拉语法 + WASM）。解法分别是：消息流虚拟化（动态高度）、可视区外降级渲染、代码块/图片懒渲染。

**为什么需要**：虚拟化的动机与 B2 IM 完全一致（回指 B2 的"两级列表虚拟化"）——聊天记录只增不减，性能必须与总长度无关。动态高度是难点：消息高度依赖内容（一行文本 vs 一个 40 行代码块差 20 倍），且流式期间最后一条消息的高度持续变化。

**怎么做**——三层方案逐层叠加：

第一层：`@tanstack/react-virtual` 动态高度虚拟化。它按 `estimateSize` 先估、渲染后用 `measureElement` 实测修正，key 稳定时测量结果跨滚动复用：

```tsx
// MessageList.tsx —— 动态高度的消息流虚拟化
import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MarkdownStream } from './MarkdownStream'
import { useStickToBottom } from './useStickToBottom'
import type { Message } from './useConversation'

export function MessageList({
  messages,
  streamingId,
}: {
  messages: Message[]
  streamingId: string | null
}) {
  const { ref: scrollRef, pinned } = useStickToBottom<HTMLDivElement>()

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    // 估算值只是初值，实测后自动修正；给个偏中性的 96
    estimateSize: () => 96,
    // key 必须是消息 id：重新生成/编辑重发导致数组截断时，测量缓存才能正确复用
    getItemKey: (i) => messages[i].id,
    overscan: 6, // 上下多渲染 6 条，滚动时不露白
  })

  // 流式期间最后一条消息高度持续增长，触发重新测量即可，虚拟器自己处理
  useEffect(() => {
    if (pinned && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  })

  return (
    <div ref={scrollRef} className="chat-scroll" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const msg = messages[vi.index]
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={rowVirtualizer.measureElement} // 实测高度回写，修正 estimate 的误差
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`, // 用 transform 而非 top，走合成层
              }}
            >
              <div className={`msg ${msg.role}`}>
                {/* 历史消息 streaming=false，MarkdownStream 内部全部命中 memo，零解析成本 */}
                <MarkdownStream
                  content={msg.content}
                  streaming={msg.id === streamingId}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

第二层：可视区外不渲染 markdown。虚拟化本身已经不渲染视口外的行，但"上滚回看"会让离开视口的消息重新进入渲染——`MarkdownStream` 的 memo 让重进视口的开销变成"React 创建一遍 DOM"，而不必重新 parse markdown（parse 结果随组件实例销毁了）。要连 DOM 重建也省掉，用**内容快照降级**：离开视口较远的消息渲染纯文本快照（一个 `<div>{plain}</div>`），只有 overscan 范围内才挂 markdown 组件。写法是对比当前可视范围首尾 index 与该行 index 的距离：

```tsx
const items = rowVirtualizer.getVirtualItems()
const first = items[0]?.index ?? 0
const last = items[items.length - 1]?.index ?? 0
// ...
const nearViewport = vi.index >= first - 3 && vi.index <= last + 3
return (
  <div key={vi.key} data-index={vi.index} ref={rowVirtualizer.measureElement} style={rowStyle}>
    {nearViewport ? (
      <MarkdownStream content={msg.content} streaming={msg.id === streamingId} />
    ) : (
      // 降级：纯文本快照，结构与高度一致，重进视口再换回 markdown
      <div className="msg-plain">{msg.content}</div>
    )}
  </div>
)
```

（注意：降级块与 markdown 块高度要接近，否则来回切换引起测量抖动；`measureElement` 会在两种块之间修正，短暂抖动可接受。）

第三层：代码块懒高亮 + 图片懒加载。shiki 这类高亮器为了质量会带 Oniguruma WASM 和语法文件，不能为首屏的一块代码全量引入。模式：**先出纯文本 `<pre>`，进入视口前 200px 再动态 import 高亮器替换**：

```tsx
// LazyCodeBlock.tsx —— 进入视口前 200px 才加载高亮器
import { useEffect, useRef, useState } from 'react'

export function LazyCodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [near, setNear] = useState(false)
  const ref = useRef<HTMLPreElement>(null)

  // 1. 视口探测：rootMargin 提前 200px 预热
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setNear(true)
          io.disconnect() // 一次即可
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 2. 到达预热区才动态 import shiki（不进主包）
  useEffect(() => {
    if (!near || html) return
    let cancelled = false
    ;(async () => {
      const { codeToHtml } = await import('shiki')
      const out = await codeToHtml(code, { lang: lang === 'text' ? 'txt' : lang, theme: 'github-dark' })
      if (!cancelled) setHtml(out)
    })()
    return () => {
      cancelled = true
    }
  }, [near, code, lang, html])

  return html ? (
    <div className="shiki-host" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre ref={ref}>
      <code>{code}</code>
    </pre>
  )
}
```

图片懒加载用原生属性即可：`<img loading="lazy" decoding="async" />`；聊天场景里图片最好再限高（`max-height: 320px; object-fit: contain`），避免一张长图把后续消息顶出屏幕。

常见坑：

- **`getItemKey` 不给 id 用下标**：编辑重发截断数组后，下标错位导致测量缓存张冠李戴，滚动时高度乱跳。这是虚拟化列表的第一戒律（进阶大纲 §1.3 的"key 用 nodeId 绝不用 index"同源）。
- **流式最后一条的测量抖动**：内容每 delta 增长一次，`measureElement` 修正一次总高度，若组件挂了打字机（F1.3）则每帧都在变。保持 `pinned` 贴底即可掩盖抖动；脱钉状态用户在看历史，不受影响。
- **overscan 过大 = 白虚拟**：overscan 20 在千条会话里等于常驻渲染几十条 markdown。6 左右足够。
- **首屏反着滚的 IM 特例**（最新消息在底部）：@tanstack/react-virtual 支持 `initialOffset` 与 `observeElementRect` 之外还有 `scrollMargin` 处理"列表从底部开始"的需求；简单做法是初始时 `scrollRef.current.scrollTop = scrollHeight`。

---

#### F1.7 生成式 UI：LLM 结构化输出 → schema 渲染器（最小可跑 demo）

**是什么**：生成式 UI（Generative UI）指 LLM 不输出 markdown 文本，而是输出一份**描述界面的 JSON**（组件类型 + 属性 + 嵌套结构），前端用一个 schema 渲染器把它变成真实组件。用户问"给我看下上周销售"，模型直接"画"出一张统计卡 + 一个趋势图，而不是一段文字。

**为什么需要**：文本对话的天花板是"读"，生成式 UI 把天花板提到"操作"——卡片上的按钮、表单、图表都是活的。而对 React 开发者，这里有个结构性利好：**LLM 结构化输出的消费端，就是你在进阶大纲 §1.2（组件注册表）/§1.3（递归渲染器）已经写过的东西**。低代码是"人拖出 schema"，生成式 UI 是"LLM 吐出 schema"，渲染内核一字不改。

**怎么做**，机制四步：

1. **定义 UI 协议**：与低代码协议同构——可序列化、声明式、discriminated union、节点带稳定 id（进阶大纲 §1.1 的设计原则原样适用）；
2. **约束 LLM 输出**：用 JSON Schema 做硬约束。OpenAI 的 `response_format: { type: 'json_schema', strict: true }` 会保证输出严格符合 schema（拒绝不合规则的生成）；Anthropic 走 tool use 的 `input_schema` 达到同等效果。**永远不要**指望"提示词里求它输出 JSON"——无约束时模型有概率输出带注释/尾逗号/前后闲话的非法 JSON；
3. **校验**：渲染前用 ajv 或 zod 校验一遍。即便接口承诺 strict，自建网关/换模型时这层是保命符；
4. **渲染**：注册表 + 递归渲染器，复用进阶大纲 §1.2/§1.3。

先看服务端的约束调用长什么样（真实接口）：

```ts
// api/generate-ui/route.ts —— 用 JSON Schema 硬约束 LLM 输出 UI 协议
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

// 1. 协议用 zod 定义（与前端 UI 节点类型一一对应，见下）
// 注意：strict 模式要求所有字段 required、additionalProperties: false，
// 可选语义用 union 里加 null 值表达，zod 4 的 z.toJSONSchema() 会处理这些细节
const UiSchema = z.union([
  z.object({
    id: z.string(),
    type: z.literal('heading'),
    props: z.object({ text: z.string(), level: z.union([z.literal(2), z.literal(3)]) }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('paragraph'),
    props: z.object({ text: z.string() }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('stat'),
    props: z.object({
      label: z.string(),
      value: z.string(),
      trend: z.union([z.literal('up'), z.literal('down')]),
    }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('columns'),
    props: z.object({ gap: z.number() }),
    children: z.array(z.lazy(() => UiSchema)), // 递归结构：列容器
  }),
])

export async function POST(req: Request) {
  const { prompt } = await req.json()
  // 2. generateObject：AI SDK 的结构化输出封装，
  //    底层等价于 response_format json_schema strict（OpenAI）或 tool use（Anthropic）
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schemaName: 'ui_tree',
    schema: z.array(UiSchema), // 顶层是一个节点数组（页面 = 节点列表）
    prompt: `为以下需求生成一页 UI（营销周报场景，可用 heading/paragraph/stat/columns）：${prompt}`,
  })
  return Response.json({ nodes: object })
}
```

前端的最小可跑 demo（**模拟 LLM 返回 schema → 注册表渲染**，无后端也能跑，直接复制进任意 React 项目）：

```tsx
// GenerativeUIDemo.tsx —— 生成式 UI 最小 demo：mock LLM + 注册表 + 递归渲染
import { memo, useEffect, useState, type ComponentType, type ReactNode } from 'react'

// ── 1. UI 协议（与进阶大纲 §1.1 的低代码协议同构）──────────────────────
export type UiNode =
  | { id: string; type: 'heading'; props: { text: string; level: 2 | 3 } }
  | { id: string; type: 'paragraph'; props: { text: string } }
  | { id: string; type: 'stat'; props: { label: string; value: string; trend: 'up' | 'down' } }
  | { id: string; type: 'columns'; props: { gap: number }; children: UiNode[] }

// ── 2. 注册表：type → 组件（进阶大纲 §1.2 原样复用）───────────────────
// 每个组件只依赖自己那类节点的 props，类型安全由映射表保证
type WidgetMap = {
  [K in UiNode['type']]: ComponentType<
    Extract<UiNode, { type: K }> extends { children: infer C }
      ? { node: Extract<UiNode, { type: K }>; children: C }
      : { node: Extract<UiNode, { type: K }> }
  >
}

function Heading({ node }: { node: Extract<UiNode, { type: 'heading' }> }) {
  const Tag = node.props.level === 2 ? 'h2' : 'h3'
  return <Tag>{node.props.text}</Tag>
}
function Paragraph({ node }: { node: Extract<UiNode, { type: 'paragraph' }> }) {
  return <p>{node.props.text}</p>
}
function Stat({ node }: { node: Extract<UiNode, { type: 'stat' }> }) {
  const { label, value, trend } = node.props
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value} <span className={trend === 'up' ? 'trend-up' : 'trend-down'}>{trend === 'up' ? '↑' : '↓'}</span>
      </div>
    </div>
  )
}
function Columns({
  node,
  children,
}: {
  node: Extract<UiNode, { type: 'columns' }>
  children: ReactNode
}) {
  return (
    <div className="columns" style={{ display: 'flex', gap: node.props.gap }}>
      {children}
    </div>
  )
}

const registry: WidgetMap = {
  heading: Heading,
  paragraph: Paragraph,
  stat: Stat,
  columns: Columns,
}

// ── 3. 递归渲染器（进阶大纲 §1.3 原样复用：memo + key 用节点 id）───────
const RenderNode = memo(function RenderNode({ node }: { node: UiNode }) {
  const Widget = registry[node.type]
  if (node.type === 'columns') {
    // 布局容器：递归 children
    return (
      <Widget node={node}>
        {node.children.map((child) => (
          <RenderNode key={child.id} node={child} />
        ))}
      </Widget>
    )
  }
  // 原子组件：终止递归
  return <Widget node={node} />
})

// ── 4. mock LLM：模拟"按 JSON Schema 约束返回 UI 协议"的延迟与产出 ────
function mockGenerateUI(prompt: string): Promise<UiNode[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 真实场景里这份数组来自 LLM；此处模拟"销售周报"意图的输出
      resolve([
        { id: 'h1', type: 'heading', props: { text: `销售周报：${prompt.slice(0, 12)}`, level: 2 } },
        {
          id: 'c1',
          type: 'columns',
          props: { gap: 12 },
          children: [
            { id: 's1', type: 'stat', props: { label: '本周 GMV', value: '¥2,431 万', trend: 'up' } },
            { id: 's2', type: 'stat', props: { label: '客单价', value: '¥386', trend: 'down' } },
            { id: 's3', type: 'stat', props: { label: '退款率', value: '1.9%', trend: 'down' } },
          ],
        },
        {
          id: 'p1',
          type: 'paragraph',
          props: { text: 'GMV 环比上升 12%，主要由华南大促带动；客单价小幅下滑，建议关注搭售策略。' },
        },
      ])
    }, 600)
  })
}

// ── 5. 页面：输入 → 生成 → 渲染 ────────────────────────────────────────
export function GenerativeUIDemo() {
  const [prompt, setPrompt] = useState('上周销售情况')
  const [nodes, setNodes] = useState<UiNode[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    mockGenerateUI(prompt).then((result) => {
      if (!cancelled) {
        setNodes(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [prompt])

  return (
    <div>
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      {loading && <p>生成中…</p>}
      {nodes?.map((n) => <RenderNode key={n.id} node={n} />)}
    </div>
  )
}
```

这份 demo 与低代码渲染器的**唯一区别是 schema 的生产者**：低代码里是人拖出来的（进阶大纲 §3 的设计器），这里是 LLM 生成的。注册表、递归渲染、memo、key 策略全部照搬——这就是"生成式 UI 本质 = schema 渲染器"的具体含义。

进阶两个方向（有真实模型接口后再做）：

1. **流式生成 UI**：LLM 流式吐 JSON 时无法整段 parse。做法是流式累积字符串，用"容错 JSON 解析"（如 `partial-json` 这类库）边流边解析出已完整的子树，`RenderNode` 天然支持渐进渲染——子树完整一个渲染一个。协议设计时要让重要的摘要类节点（标题/统计卡）排在 children 前面，先出的先渲染。
2. **组件市场**：注册表做成可插拔的（进阶大纲 §1.2 的"注册表带物料元信息"），LLM 能用的组件越多，生成能力越强——这就与 D1 插件化合流了。

常见坑：

- **strict 模式下 zod schema 的限制**：OpenAI strict 要求所有属性 `required` 且 `additionalProperties: false`，`z.optional()` 会被拒绝——可选语义要用 `z.union([z.string(), z.null()])` 表达。`generateObject`/`z.toJSONSchema`（zod 4）会自动处理。
- **递归 schema 的深度**：限制 `columns` 嵌套层数（prompt 或 schema 里约束），LLM 偶尔会生成自嵌套 runaway 结构，渲染器最好加一个 maxDepth 保险（超过按纯文本渲染）。
- **id 生成**：让 LLM 顺带输出 id（schema 里要求），别渲染时用数组下标——LLM 修正输出（重生成）时下标会漂移，React 状态错乱。
- **危险组件白名单**：注册表是封闭集合，LLM 只能"选"，不能"造"（比如输出 `{ type: 'script' }` 时 registry 查不到，直接降级渲染成错误占位）。永远不要把"任意 HTML 渲染"当生成式 UI。

---

#### F1.8 工具调用与思考过程可视化

**是什么**：现代对话应用里，一条 assistant 回复常常不止文本：先是"思考过程"（reasoning），中间夹着若干次工具调用（tool call：查数据库、调搜索、执行代码），最后才是答案。UI 要把这条"执行轨迹"可视化：步骤折叠、状态流转、失败重试。

**为什么需要**：用户对"卡住 20 秒"的容忍度取决于透明度——看得见"正在搜索 → 正在读取第 3 个文件"就愿意等；调试 Agent 也依赖这个面板定位"哪一步的参数错了"。这是 Dify/Coze 类产品的标配组件。

**怎么做**——先定状态机，再做组件。

状态机（工具步骤的完整生命周期）：

```text
pending（排队）
   │ 开始执行
   ▼
running（执行中）
   │ 成功                 │ 失败
   ▼                      ▼
success（有结果）        error（有错误信息）
   │                      │ 用户点重试 / 自动退避重试
   │                      ▼
   └────────────────   retrying ──► running（第 N 次尝试）
                             │ 超过最大重试次数
                             ▼
                          failed（终态，需要人工介入）
```

数据模型与流转函数：

```ts
// toolSteps.ts —— 工具步骤的数据模型与纯函数流转
export type ToolStatus = 'pending' | 'running' | 'success' | 'error' | 'retrying' | 'failed'

export type ToolStep = {
  id: string
  name: string // 如 web_search / query_db / run_code
  args: unknown // 调用参数（LLM 生成）
  result?: unknown // 成功结果
  error?: string // 失败原因
  status: ToolStatus
  attempts: number // 已尝试次数（重试计数）
  startedAt?: number
  endedAt?: number
}

export const MAX_RETRIES = 2

// 纯函数：事件 → 新状态。所有流转集中在此，组件只管映射渲染
export function transition(step: ToolStep, event: ToolEvent): ToolStep {
  switch (event.type) {
    case 'start':
      return { ...step, status: 'running', startedAt: Date.now() }
    case 'success':
      return { ...step, status: 'success', result: event.result, endedAt: Date.now() }
    case 'error':
      return {
        ...step,
        status: step.attempts >= MAX_RETRIES ? 'failed' : 'error',
        error: event.message,
        endedAt: Date.now(),
      }
    case 'retry':
      if (step.status !== 'error') return step // 只有 error 态可重试，防止 success 后误触发
      return { ...step, status: 'retrying', attempts: step.attempts + 1 }
    case 'retry_started':
      return { ...step, status: 'running', error: undefined, startedAt: Date.now(), endedAt: undefined }
    default:
      return step
  }
}

type ToolEvent =
  | { type: 'start' }
  | { type: 'success'; result: unknown }
  | { type: 'error'; message: string }
  | { type: 'retry' }
  | { type: 'retry_started' }
```

组件（折叠 + 状态色 + 重试按钮）：

```tsx
// ToolStepView.tsx —— 单个工具步骤：可折叠、状态可视、失败可重试
import { useState } from 'react'
import type { ToolStep } from './toolSteps'

const STATUS_META: Record<ToolStep['status'], { label: string; className: string }> = {
  pending: { label: '排队中', className: 'st-pending' },
  running: { label: '执行中', className: 'st-running' },
  success: { label: '成功', className: 'st-success' },
  error: { label: '失败', className: 'st-error' },
  retrying: { label: '重试中', className: 'st-retrying' },
  failed: { label: '已失败', className: 'st-failed' },
}

export function ToolStepView({
  step,
  onRetry,
}: {
  step: ToolStep
  onRetry: (stepId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[step.status]
  const duration =
    step.startedAt && step.endedAt ? `${((step.endedAt - step.startedAt) / 1000).toFixed(1)}s` : null

  return (
    <div className={`tool-step ${meta.className}`}>
      <button className="tool-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="chevron">{open ? '▾' : '▸'}</span>
        <span className="tool-name">{step.name}</span>
        <span className="tool-status">{meta.label}</span>
        {duration && <span className="tool-dur">{duration}</span>}
        {step.attempts > 0 && <span className="tool-attempts">第 {step.attempts + 1} 次</span>}
      </button>

      {open && (
        <div className="tool-body">
          <section>
            <h4>参数</h4>
            <pre>{JSON.stringify(step.args, null, 2)}</pre>
          </section>
          {step.result != null && (
            <section>
              <h4>结果</h4>
              <pre>{JSON.stringify(step.result, null, 2)}</pre>
            </section>
          )}
          {step.error && (
            <section>
              <h4>错误</h4>
              <pre className="tool-error">{step.error}</pre>
            </section>
          )}
        </div>
      )}

      {/* 只有 error 态展示重试入口；failed 是终态（超过次数上限），提示人工介入 */}
      {step.status === 'error' && (
        <button className="tool-retry" onClick={() => onRetry(step.id)}>
          重试此步骤
        </button>
      )}
      {step.status === 'failed' && <span className="tool-manual">重试次数用尽，请检查参数或权限</span>}
    </div>
  )
}
```

失败重试的链路说明：单步重试需要后端支持"从某个 toolCallId 重新执行并接续对话"——请求体里带 `retryToolCallId`，服务端从该步骤起重放（Agent 框架的执行器普遍支持按步骤重放）。前端做的只是把用户意图（retry）翻译成请求 + 把该步骤状态置回 `retrying → running`。自动退避重试（网络类错误 500ms/2s 两挡）在 `onDelta` 事件循环里加一个 setTimeout 递归即可，但要设置 MAX_RETRIES 上限并在 UI 上如实显示尝试次数——静默重试会让用户误以为"模型很慢"。

**思考过程（reasoning）可视化**与工具步骤同构：把 reasoning 也当成一种 step（`name: 'thinking'`），默认折叠、流式期间展示末尾两行 + 呼吸动画。差别只在两点：思考内容通常整段替换而非追加（部分模型会输出多轮思考），折叠态要保留高度下限避免展开时跳动。

常见坑：

- **状态与消息分离**：工具步骤挂在 assistant 消息的 parts 里（`message.parts: [{type:'text'...}, {type:'tool-step', step}]`），不要放进全局 store 单独管理——编辑重发（F1.4）截断历史时，步骤要跟着消息一起被丢弃，挂在消息上天然正确。
- **折叠态别渲染大 JSON**：折叠时只渲染头部一行，`open` 才渲染参数/结果 JSON。几百 KB 的工具结果（如整页搜索返回）必须虚拟化或截断展示（"显示前 5KB"）。
- **错误信息要提纯**：把原始异常直接给用户看（含堆栈、内部 URL）既不友好也泄漏信息。`error.message` 做一层映射（网络错误/超时/权限/参数非法四类）。

---

#### F1.9 RAG 引用溯源（高亮跳转交互）

**是什么**：RAG（检索增强生成）场景下，回答里的每个论断都来自检索到的文档片段。UI 要做两件事：**行内引用角标**（`……同比增长 12%【1】`，可点击）与**溯源面板跳转**（点击后右侧原文卡片滚动定位到对应片段并高亮，反向可从原文跳回引用处）。

**为什么需要**：没有溯源的 RAG 回答无法核验，用户信任度断崖式下跌；企业知识库场景里"引用可点击"是验收标准而不是加分项。

**怎么做**，机制三步：

1. **数据模型**：回答不再是纯字符串，而是 parts 数组——文本片段与引用标记交错；引用的 `citationId` 关联到 sources 集合（含文档标题与原文片段）。这些结构由服务端在生成 RAG 回答时一并产出；
2. **行内渲染**：文本 part 照常渲染，引用 part 渲染成 `<sup>` 角标按钮；
3. **跳转高亮**：点击角标 → 右侧面板 `scrollIntoView` 定位到 source 卡片 → 加一个 CSS 动画类（背景闪两下）。

```tsx
// RagAnswer.tsx —— 引用角标 + 溯源面板的高亮跳转
import { useRef, useState } from 'react'

type Source = { id: string; docTitle: string; snippet: string }
type Part = { type: 'text'; text: string } | { type: 'citation'; citationId: string }

// 服务端产出的消息结构示例：
// parts: [
//   { type: 'text', text: '第三季度营收 ' },
//   { type: 'citation', citationId: 'src-1' },
//   { type: 'text', text: '，同比增长 12%，主要由企业级订阅带动' },
//   { type: 'citation', citationId: 'src-2' },
// ]
export function RagAnswer({ parts, sources }: { parts: Part[]; sources: Source[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击角标：记录激活 + 滚动定位 + 触发高亮动画
  const jumpToSource = (id: string) => {
    setActiveId(id)
    requestAnimationFrame(() => {
      // rAF 下一帧再查 DOM：确保新渲染的 active 类已挂上
      const el = panelRef.current?.querySelector(`[data-source-id="${id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <div className="rag-layout">
      <div className="rag-answer">
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i}>{p.text}</span>
          ) : (
            <sup key={i} className={`cite ${activeId === p.citationId ? 'cite-active' : ''}`}>
              <button onClick={() => jumpToSource(p.citationId)}>
                {sources.findIndex((s) => s.id === p.citationId) + 1}
              </button>
            </sup>
          ),
        )}
      </div>

      <div className="rag-sources" ref={panelRef}>
        <h4>引用来源（{sources.length}）</h4>
        {sources.map((s, idx) => (
          <div
            key={s.id}
            data-source-id={s.id}
            className={`source-card ${activeId === s.id ? 'source-flash' : ''}`}
          >
            <div className="source-title">
              [{idx + 1}] {s.docTitle}
            </div>
            <p className="source-snippet">{s.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

配套的高亮动画 CSS（进入视口后闪两下黄底）：

```css
/* source-flash：跳转定位后的高亮闪烁 */
.source-flash {
  animation: source-flash 1.6s ease-out;
}
@keyframes source-flash {
  0% { background: rgba(250, 204, 21, 0.45); }
  60% { background: rgba(250, 204, 21, 0.45); }
  100% { background: transparent; }
}
.cite-active button {
  background: #2563eb; /* 激活的角标染主色，双向可见"当前在看哪条引用" */
  color: #fff;
}
```

反向跳转（从原文卡片跳回引用处）：给每个角标加 `data-cite-id`，卡片上加"定位引用"按钮，`querySelector` + `scrollIntoView` 对称实现，此处逻辑与上面同构。

常见坑：

- **引用标记别让 LLM 输出成裸文本**：如果模型直接输出 `【1】` 字符串，前端只能靠正则猜——引用与文本的边界经常错。正确做法是结构化 parts（服务端在检索命中位置切分文本插入 citation part），或让模型按协议输出特殊 token（如 `<cite id="src-1"/>`）再由前端解析切分。
- **长片段折叠**：source 卡片的 snippet 默认 3 行 + "展开全文"；溯源面板本身超过 20 条也要虚拟化（复用 F1.6 的方案）。
- **流式期间角标闪烁**：引用 part 到达前，文本 part 里"同比增长 12%"后面紧跟着可能是半个角标 token。parts 模型天然规避（每个 part 原子到达），这也是坚持结构化 parts 的第二个理由。

---

#### F1.10 敏感内容遮罩

**是什么**：回答里可能包含不适合直接可见的内容——用户手机号/邮箱（PII）、内部价格、未过审的推理细节。UI 上表现为一段模糊（blur）文本，点击"显示"并确认后可见，展示行为要留痕。

**为什么需要**：合规红线（个人信息保护、企业数据分级）+ 产品信任。注意遮罩的**检测**必须在服务端做（客户端正则既不可靠也可被绕过——打开 devtools 就能看到明文），前端只负责"按服务端给的区间渲染遮罩 + 控制揭示交互"。

**怎么做**，机制三步：

1. 服务端在流式转发时对累计文本做检测（PII 正则/分类器），输出 `maskSpans: [{ start, end, reason }]`（字符区间）。**区间基于全量累计文本计算**，追加式更新下旧区间永不变位；
2. 前端渲染时把 `content` 按 spans 切成交错的明文段与遮罩段；
3. 遮罩段渲染 blur + 揭示按钮；揭示状态按 span 索引记录（用户揭示第 2 段不影响第 1 段）。

```tsx
// MaskedAnswer.tsx —— 按服务端区间渲染敏感内容遮罩
import { useState } from 'react'

type MaskSpan = { start: number; end: number; reason: 'pii' | 'confidential' }

// 把全文切成 [明文, 遮罩, 明文, 遮罩, ...] 的段序列
function splitBySpans(text: string, spans: MaskSpan[]) {
  const segments: Array<{ text: string; masked: boolean; reason?: string }> = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start), masked: false })
    segments.push({ text: text.slice(span.start, span.end), masked: true, reason: span.reason })
    cursor = span.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), masked: false })
  return segments
}

export function MaskedAnswer({
  content,
  spans,
  onReveal,
}: {
  content: string
  spans: MaskSpan[]
  onReveal?: (spanIndex: number) => void // 揭示留痕：审计要求记录谁在何时看了敏感段
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const segments = splitBySpans(content, spans)

  return (
    <p className="masked-answer">
      {segments.map((seg, i) =>
        !seg.masked ? (
          <span key={i}>{seg.text}</span>
        ) : revealed.has(i) ? (
          <span key={i} className="masked revealed">
            {seg.text}
          </span>
        ) : (
          <span key={i} className="masked blur" data-reason={seg.reason}>
            {seg.text}
            <button
              className="reveal-btn"
              onClick={() => {
                setRevealed((prev) => new Set(prev).add(i))
                onReveal?.(i) // 上报揭示事件
              }}
            >
              显示{seg.reason === 'pii' ? '个人信息' : '敏感内容'}
            </button>
          </span>
        ),
      )}
    </p>
  )
}
```

配套样式（blur 遮罩 + 揭示按钮悬浮）：

```css
.masked.blur {
  filter: blur(6px);           /* 用 blur 而非 ■■■：保留长度与排版形状，阅读节奏不破 */
  user-select: none;           /* 遮罩期禁止选中复制 */
  position: relative;
  cursor: pointer;
}
.masked.blur .reveal-btn {
  position: absolute;
  inset: 0;
  opacity: 0;                  /* 按钮透明铺满，点击整段即可揭示 */
}
.masked.revealed {
  background: #fef9c3;         /* 揭示后淡黄底，提醒"这段是敏感的" */
}
```

常见坑：

- **遮罩区间跨 delta 的正确性**：不要在每个 delta 到达时对"本 delta"单独检测后把区间相对化——一律对全量累计文本计算绝对区间，前端渲染时按绝对区间切。追加更新下这个模型永不错位；若服务端会"改写"已输出文本（罕见，如自动纠错），区间必须整体重算并 reset 揭示状态。
- **blur 会防住截屏吗**：不会，devtools 里就是明文。blur 是"交互层提醒"不是"安全层"，真正的脱敏（打码后再下发）在服务端对高密级场景仍是必须的。两层的取舍要在评审时讲清楚。
- **别用 `-webkit-text-security` 或 `color: transparent`**：前者兼容性差且形状语义不对；后者用户一划选就能复制。`filter: blur` + `user-select: none` 是当前通行做法。
- **无障碍**：读屏用户会被 blur 内容困惑，遮罩段要加 `aria-label="已遮罩的敏感内容，按回车显示"`（button 本身天然可聚焦，Enter 揭示），揭示后恢复正常朗读。

---

#### F1 小结与练习路径

把 F1 的十个小节串成一条实现顺序（也是"入手"任务拆解）：

1. 用 useChat 或 F1.1 的 `streamChat` 跑通最小流式（半天）；
2. 引入 F1.2 的 `MarkdownStream`，造一个会输出长代码块的真实 prompt 复现并修复"未闭合"坑（1 天）；
3. 加 F1.3 打字机与贴底滚动、F1.4 中断/重新生成/编辑重发（2 天）；
4. 加 F1.8 工具步骤折叠与重试、F1.9 引用溯源、F1.10 遮罩（2–3 天）；
5. 用 500 条 mock 消息压测，做 F1.6 虚拟化与懒高亮（2 天）；
6. 最后做 F1.7 生成式 UI demo，接真实模型替换 mock（2 天）。

**代表**：ChatGPT、Claude、Dify、Coze——建议精读 Vercel AI SDK 的 chat 模板（官方 streamChat/generative UI 示例代码量小、结构正，是 F1 的"标准答案"级参考）。

✍️ **入手（验收标准升级版）**：做一个支持流式渲染/中断重发/工具调用折叠的聊天界面，再加一个"LLM 输出 schema → 页面实时渲染"的生成式 UI demo。验收：流式期间打开 Performance 面板录 10 秒，无长任务（>50ms）超标；中断后重新生成不产生重复消息；mock 500 条消息滚动如丝。

---

### F2. Agent 工作流画布（★★★★☆）

- **画像**：Dify/Coze 的编排页 = A4 节点画布 + 你的低代码 Setter
- **核心技术**：React Flow 节点编排 + 节点运行态流式更新（高频 setNode 的性能合并）、调试面板（单节点输入输出）、版本对比（monaco diff 复用）
- **入手**：接 F1 的项目：画布编排"搜索→总结→生成"三步，运行时节点实时高亮

**为什么说 F2 = A4 + Setter（组合论证）**。拆开 Dify 的编排页看，它由三块组成，每块都在你已学的地图上：

1. **中间的画布**：拖节点、连线、校验连接合法性、自动布局、小地图——这就是 A4 节点编排的全部内容（React Flow 的自定义节点/边、`isValidConnection` 类型校验、dagre 自动布局）。F2 在画布机制上几乎没有新知识；
2. **右侧的属性面板**：选中一个"LLM 节点"，面板里出现模型选择、温度滑杆、system prompt 多行文本、变量绑定——这就是进阶大纲 §3 表单设计器的属性区（Setter 体系）：节点协议里声明 `paramsSchema`，面板用 schema 动态表单渲染（进阶大纲 §2 的成果直接复用）。换句话说，**Agent 节点 = 低代码物料的运行态亲戚**：低代码物料的 props 由设计者配置，Agent 节点的 params 由编排者配置，配置界面的实现是同一套 schema 驱动表单；
3. **运行态与调试**：这是 F2 真正的新增内容——画布从"静态编辑"变成"实时执行的监控面板"，节点状态高频流式更新（下面重点展开）、单节点输入输出可查（调试面板）、两个版本的 DSL 可 diff（版本对比）。

一句话：**画布复用 A4，属性面板复用 Setter，新增的只有"运行态"这一层**。这也是为什么 F2 难度标 ★★★★☆ 而不是五星——它的两大件你都已经有了。

#### F2.1 React Flow 节点编排（回指 A4，只讲增量）

画布本身按 A4 的路线做即可（自定义节点/边、`isValidConnection` 连线校验、dagre 自动布局、小地图）。F2 对 A4 的增量只有三点：

1. **节点协议要带 paramsSchema**，供 Setter 面板消费：

```ts
// agentDsl.ts —— Agent 工作流 DSL 的节点定义
import type { Node, Edge } from '@xyflow/react'

export type AgentNodeData = {
  title: string
  // 该节点属性面板的 schema（复用进阶大纲 §2 动态表单的协议）
  paramsSchema: {
    type: 'object'
    properties: Record<string, { type: string; title: string; enum?: string[] }>
  }
  params: Record<string, unknown> // 编排者填的参数值
  run?: RunState // 运行态（只在运行时存在，序列化 DSL 时剥离）
}

export type RunState = {
  status: 'idle' | 'queued' | 'running' | 'success' | 'error'
  outputPreview?: string
  durationMs?: number
}

export type AgentFlow = { nodes: Node<AgentNodeData>[]; edges: Edge[] }
```

2. **边上有变量引用语义**：上游节点的输出（如 `{{search_1.result}}`）可以在下游节点的 params 里引用。实现上用进阶大纲 §1.4 的表达式引擎，求值上下文注入各节点输出：`{ $nodes: { search_1: { result: '...' } } }`；
3. **连线类型校验更严**：LLM 节点不能直接连向量库输出等约束，用 A4 的 `isValidConnection`（回指 A4 的"连线规则校验（类型约束）"）。

#### F2.2 节点运行态流式更新：为什么必须 rAF 合并（100 节点卡死的机理）

**是什么**：工作流运行时，后端通过 SSE/WebSocket 推送每个节点的状态变化（queued → running → success、流式输出的预览片段、耗时）。前端要把这些变化实时反映到画布节点上。本节回答：为什么"收到事件就 setNodes"在 100 节点规模下会卡死，以及 rAF 合并为什么是标准解法。

**卡死机理分四层拆解**：

1. **事件频率远超渲染预算**。一次 10 节点 Chain 的运行，LLM 节点逐 token 推 preview，三个 LLM 节点并发，事件流轻松达到每秒 60–120 条。100 节点的大工作流调试回放（时间倍速）时，事件频率再乘几倍。
2. **每次 setNodes 都换整个数组**。`setNodes(nds => nds.map(...))` 产生新数组引用——哪怕只改了一个节点的 `data.status`。React Flow 的 store（内部基于 zustand）随之通知所有订阅"nodes 数组"的消费者：节点坐标系组件、边计算、小地图、以及所有自定义节点的外层 wrapper。
3. **React 18 自动批处理救不了跨任务的高频更新**。自动批处理合并的是**同一个任务里**的多次 setState；而每条 SSE/WebSocket 事件都是独立的宏任务——事件 A 触发的一次 setNodes 已经完成渲染提交，事件 B 的 setNodes 是下一轮完整渲染。也就是说每秒 120 条事件 = 每秒最多 120 次完整 render + commit，而屏幕只有 60 帧，一半的渲染白做，主线程被 reconciler 和 React Flow 的节点测量占满，输入事件（拖画布、滚轮缩放）排队超时——用户观感就是"卡死"。
4. **自定义节点重渲放大成本**。每个节点组件里有状态徽章、耗时计算、输出预览的 markdown（F1.2 的组件）。100 个节点里哪怕只有 1 个的数据真的变了，如果组件没被 `memo` 且 props 引用全变（常见错误：inline 传对象 `data={{...}}`），就是 100 个组件全量重渲。

**解法：rAF 合并（每帧最多一次提交）**。把"事件到达"与"状态提交"解耦：事件只写入一个待处理队列（Map，天然去重合并同一节点的多次更新），调度一个 `requestAnimationFrame`，在下一帧统一 flush 一次。这样无论事件多密集，渲染频率被钳制在 60fps，每次 flush 还把同一节点同帧内的多次 patch 合并成一次。

```tsx
// useNodePatches.ts —— 高频节点运行态更新的 rAF 合并器
import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow, type Node } from '@xyflow/react'

type NodeDataPatches = Map<string, Record<string, unknown>> // nodeId → 待合并的 data 补丁

export function useNodePatches() {
  const { setNodes } = useReactFlow()
  const queueRef = useRef<NodeDataPatches>(new Map())
  const rafRef = useRef(0)

  // flush：每帧最多执行一次，把队列里的补丁合并进 nodes
  const flush = useCallback(() => {
    rafRef.current = 0
    const queue = queueRef.current
    if (queue.size === 0) return
    queueRef.current = new Map() // 先换新队列：flush 期间新到的事件进下一帧
    setNodes((nds) =>
      nds.map((n) => {
        const patch = queue.get(n.id)
        // 未被 patch 的节点保持原引用 —— memo 才能跳过它们（见下方注意点）
        return patch ? ({ ...n, data: { ...n.data, ...patch } } as Node) : n
      }),
    )
  }, [setNodes])

  const patch = useCallback(
    (nodeId: string, dataPatch: Record<string, unknown>) => {
      const queue = queueRef.current
      // 同一节点同帧多次 patch 直接合并：最后写入覆盖前面的键
      queue.set(nodeId, { ...(queue.get(nodeId) ?? {}), ...dataPatch })
      if (rafRef.current === 0) {
        // 只在没有待执行帧时调度：事件风暴下也只跑每帧一次
        rafRef.current = requestAnimationFrame(flush)
      }
    },
    [flush],
  )

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []) // 卸载清理
  return patch
}
```

使用（运行事件 → patch → 节点徽章变色；演示用定时器模拟事件流，真实接入换成 SSE/WebSocket，解析复用 F1.1 的 `streamChat`）：

```tsx
// AgentCanvas.tsx —— 运行事件驱动节点状态
import { useEffect } from 'react'
import { ReactFlow, type NodeProps, type Node } from '@xyflow/react'
import { useNodePatches } from './useNodePatches'
import type { AgentNodeData, AgentFlow } from './agentDsl'

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const run = data.run // 只在自己的 data 变化时重渲（配合外层 memo）
  return (
    <div className={`agent-node st-${run?.status ?? 'idle'}`}>
      <div className="agent-title">{data.title}</div>
      {run?.status === 'running' && <span className="pulse-dot" />}
      {run?.durationMs != null && <span>{run.durationMs}ms</span>}
    </div>
  )
}

const nodeTypes = { agent: AgentNode }

type RunEvent = {
  type: 'node_status'
  nodeId: string
  status: 'queued' | 'running' | 'success' | 'error'
  preview?: string
  durationMs?: number
}

export function AgentCanvas({ initialFlow }: { initialFlow: AgentFlow }) {
  const patch = useNodePatches()

  // 演示：定时器按 10ms 间隔发出事件风暴（比真实 SSE 更狠），验证 rAF 合并是否扛得住。
  // 生产接入：把这里的 setTimeout 序列换成 F1.1 的 streamChat，onDelta 里 JSON.parse 出 RunEvent。
  useEffect(() => {
    const nodeIds = initialFlow.nodes.map((n) => n.id)
    const timers: ReturnType<typeof setTimeout>[] = []
    nodeIds.forEach((nodeId, i) => {
      timers.push(setTimeout(() => patch(nodeId, { run: { status: 'queued' } }), i * 100))
      timers.push(setTimeout(() => patch(nodeId, { run: { status: 'running' } }), i * 100 + 300))
      timers.push(
        setTimeout(
          () => patch(nodeId, { run: { status: 'success', durationMs: 400 + i * 50 } }),
          i * 100 + 900,
        ),
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [initialFlow, patch])

  return (
    // 非受控画布（defaultNodes）：useReactFlow().setNodes 生效的前提，见 @xyflow/react 文档受控/非受控说明
    <ReactFlow defaultNodes={initialFlow.nodes} defaultEdges={initialFlow.edges} nodeTypes={nodeTypes} fitView />
  )
}
```

两个配套注意点：

- **自定义节点必须 memo 且未变更节点引用必须稳定**。上面 flush 里"未被 patch 的节点保持原引用"是前提，React Flow 对节点组件有内部 memo，引用不变即可跳过。若你给自定义节点 inline 传了函数/对象 props，memo 全部失效——这是"为什么合并了还卡"的第一嫌疑。
- **更新粒度能小则小**。流式 preview 别把整段输出塞进 `data`（每次都是大字符串，比较与重渲都贵）：节点上只放"最新 120 字符摘要"，完整输出进调试面板的数据源（F2.3）。这条与 F1.6"可视区外降级渲染"是同一哲学：**高频通道上只走最小必要数据**。

补充一个进阶选项：React Flow 的 store 是 zustand，高频更新也可以完全绕开 React Flow 的 `setNodes`，自定义节点内部用 `useStore(selector)` 直接订阅独立的外部 store（把运行态放在一个独立的 zustand store，节点组件按 nodeId selector 订阅自己的状态）。这样连"nodes 数组换引用"都不发生，只有状态真正变化的节点重渲。rAF 合并方案胜在简单直观、先做先赢；selector 订阅方案是规模上去（几百节点 + 多路并发流）后的第二级火箭。

#### F2.3 调试面板（单节点输入输出查看）

**是什么**：点击画布上的节点，右侧抽屉展示该节点**本轮运行的输入（上游变量解析后的实参）、参数快照、输出全文、耗时与 token 消耗**。相当于给每个节点挂了一个"断点查看器"。

**为什么需要**：Agent 工作流的调试痛点是"链路黑盒"——最终结果不对时，需要定位是哪个节点的输入解析错了（变量引用打错名）还是模型输出不合格。没有单节点 IO 查看，调试只能靠加日志节点绕圈。

**怎么做**：

```tsx
// DebugPanel.tsx —— 单节点输入输出调试面板
import { useEffect, useState } from 'react'
import { useOnSelectionChange, type Node } from '@xyflow/react'
import type { AgentNodeData, AgentFlow } from './agentDsl'
import type { NodeRunRecord } from './runStore' // 运行记录：{ nodeId, input, output, params, durationMs, tokens }

export function DebugPanel({ flow, records }: { flow: AgentFlow; records: Map<string, NodeRunRecord> }) {
  const [selected, setSelected] = useState<Node<AgentNodeData> | null>(null)

  // React Flow 官方选中钩子：画布点选节点 → 面板切换
  useOnSelectionChange({
    onChange: ({ nodes }) => setSelected((nodes[0] as Node<AgentNodeData>) ?? null),
  })

  if (!selected) return <aside className="debug-panel empty">点击节点查看运行详情</aside>

  const rec = records.get(selected.id)
  return (
    <aside className="debug-panel">
      <h3>{selected.data.title}</h3>
      <section>
        <h4>参数快照</h4>
        <pre>{JSON.stringify(selected.data.params, null, 2)}</pre>
      </section>
      <section>
        <h4>输入（变量已解析）</h4>
        {/* 大结果截断展示，完整内容点"在新窗口打开"（避免面板内渲染 500KB JSON） */}
        <pre>{rec ? truncate(JSON.stringify(rec.input, null, 2), 5_000) : '本轮未运行'}</pre>
      </section>
      <section>
        <h4>输出</h4>
        <pre>{rec ? truncate(rec.output, 5_000) : '—'}</pre>
      </section>
      {rec && (
        <footer>
          耗时 {rec.durationMs}ms · {rec.tokens} tokens
        </footer>
      )}
    </aside>
  )
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}\n…（已截断，共 ${s.length} 字符）`
}
```

实现要点：运行记录（`NodeRunRecord`）来自 F2.2 的事件流，按 `nodeId` 存在一个普通 zustand store 里（面板低频更新，不需要 rAF 合并）；面板里的 JSON 长期用 `<pre>` 即可，若要做可折叠树再复用进阶大纲 §5 JSON 编辑器的只读模式。数据契约上，**输入要存"变量解析后"的实参**而不是原始 `{{search_1.result}}` 引用——后者在 params 快照里已经有了，调试恰恰要看的是解析结果对不对。

#### F2.4 版本对比（monaco diff 复用）

**是什么**：工作流 DSL 是 JSON（`AgentFlow` 序列化）。产品需要"对比当前版本与上一版本"：改了哪个节点的参数、删了哪条边。实现直接复用进阶大纲 §5 JSON 编辑器选定的 monaco，用它的 `DiffEditor`。

```tsx
// FlowVersionDiff.tsx —— 工作流版本对比（monaco diff 复用）
import { DiffEditor } from '@monaco-editor/react'
import type { AgentFlow } from './agentDsl'

export function FlowVersionDiff({ prev, curr }: { prev: AgentFlow; curr: AgentFlow }) {
  // 先序列化再 diff：直接 diff 对象无意义，diff 文本才能行级对齐
  const prevJson = JSON.stringify(prev, null, 2)
  const currJson = JSON.stringify(curr, null, 2)
  return (
    <div className="version-diff">
      <DiffEditor
        original={prevJson}
        modified={currJson}
        language="json"
        theme="vs-dark"
        options={{
          readOnly: true, // 对比视图只读
          renderSideBySide: true, // 左右并排；false 为行内差异（窄屏友好）
          renderOverviewRuler: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  )
}
```

体验增强（按需）：序列化前做一个**键排序**（`nodes`/`edges` 按 id 排），避免无关的顺序变化淹没真正的 diff；节点内 `params` 保持对象键序（人改参数的顺序有语义）。再进一步可以把 diff 结果结构化（用 `fast-json-patch` 生成补丁列表，展示"节点 LLM-1 的 temperature: 0.2 → 0.7"的人话摘要），monaco diff 作为"看原始证据"的折叠页。这里再次体现 DSL = JSON 的好处：**版本管理的全部基础设施（diff/patch/回滚）都是 JSON 生态现成的**。

**入手（验收标准升级版）**：接 F1 的项目：画布编排"搜索→总结→生成"三步，运行时节点实时高亮。验收：三节点运行事件以 10ms 间隔回放 100 轮（mock 事件风暴），画布拖拽/缩放不掉帧；调试面板能查到中间节点"总结"的输入（含搜索结果的变量解析）；改一版 DSL 后 diff 面板正确高亮参数变化。

## G. 交互底座：复杂交互组件自研（★★★☆☆，性价比最高）

造轮子是理解生态的最快路径，也是面试硬通货：

1. **浮层/定位引擎**（floating-ui 原理）：定位计算、flip/shift 防溢出、层级与遮挡治理、Portal
2. **Command Palette（Cmd+K）**：模糊搜索、分组、键盘导航、最近使用
3. **虚拟滚动自研**：定高 → 动高 → 横向/表格二维
4. **无障碍复杂组件**：ARIA 1.2 的 Combobox/Tree 模式、焦点管理（roving tabindex）、屏幕阅读器走查
5. **无限层级树**：大数据量 + 拖拽换父 + 虚拟化（react-arborist 源码）

这五项是"所有场景都要用"的底座：A 族编辑器用浮层和树（大纲树、块菜单），B 族 IM 用虚拟滚动和 Combobox（@ 提及），F 族对话用 Cmd+K（斜杠命令）和浮层（引用弹出卡）。学习成本 2–3 周封顶，回报作用于你之后写的每一个组件——这就是"性价比最高"的量化含义。下面逐项展开。

---

#### G.1 浮层/定位引擎（floating-ui 原理）

**是什么**：浮层指 tooltip、popover、select 下拉、右键菜单这类"锚定在触发元素旁、悬浮于页面之上"的组件。定位引擎解决的问题是：**给定锚点元素和浮层元素，算出浮层的 left/top**，并处理各种边界情况。

**为什么需要**：看似简单（`anchorRect.bottom` 就是 y 呀），实际上生产环境有一打坑：浮层被 `overflow: hidden` 的祖先裁剪、靠近视口边缘时溢出、页面滚动时错位、嵌套 transform 上下文、RTL 布局镜像、浏览器缩放、iframe 偏移……floating-ui（Popper 的继任者）就是把这些坑系统性解决掉的引擎。**自研的目标不是替代它，而是吃透它的算法骨架**——面试讲得清 flip/shift 的思路，线上知道为什么不能自己写。

**怎么做（机制分步）**：floating-ui 的 `computePosition` 是一条**中间件流水线**：

1. **测量**：读锚点与浮层的矩形（`getBoundingClientRect`）；
2. **基础定位**：按期望方位（如 `bottom-start`）算初始坐标——`x = ref.left`、`y = ref.bottom + offset`；
3. **中间件依次加工坐标**：每个 middleware 拿到 `{ x, y, rects, placement }`，返回修正后的坐标；顺序通常是 `offset → flip → shift → size → arrow`；
   - `offset(n)`：沿方位主轴留出 n px 间距（tooltip 与目标的间隙）；
   - `flip`：检测浮层在当前方位是否溢出视口（或被裁剪容器裁掉），溢出则尝试对侧/相邻方位，选空间最大者；若换了方位，会要求整条流水线**重跑一遍**（因为 shift 的参考轴变了）；
   - `shift({ padding })`：在方位的交叉轴上平移，把溢出量"推回来"（贴边留 padding）；可配 limiter 防止推过头跑到锚点另一侧；
4. **应用**：按策略（absolute 配 `left/top`，或 fixed）写回样式；
5. **持续同步**：`autoUpdate` 监听滚动/resize/锚点尺寸变化（内部用 `ResizeObserver` + scroll 监听 + 动画帧轮询兜底），任何变化就重跑 1–4。

一个 60 行的玩具版，把骨架说清楚（**演示用，勿上生产**）：

```ts
// miniPosition.ts —— 定位计算/flip/shift 的算法骨架（玩具版）
type Rect = { top: number; left: number; width: number; height: number }
type Side = 'top' | 'bottom'

export function miniComputePosition(
  ref: Rect,
  float: Rect,
  placement: Side,
  offset = 8,
  viewport = { width: window.innerWidth, height: window.innerHeight },
) {
  // 1. 基础定位：按期望方位贴边
  let x = ref.left
  let y = placement === 'bottom' ? ref.top + ref.height + offset : ref.top - float.height - offset
  let side = placement

  // 2. flip：主轴放不下就翻面（比较上下两侧可用空间）
  const spaceBelow = viewport.height - (ref.top + ref.height)
  const spaceAbove = ref.top
  if (side === 'bottom' && float.height + offset > spaceBelow && spaceAbove > spaceBelow) {
    side = 'top'
    y = ref.top - float.height - offset
  }

  // 3. shift：交叉轴防溢出（贴边留 8px）
  x = Math.min(Math.max(8, x), viewport.width - float.width - 8)

  return { x, y, side }
}
```

真实的 floating-ui 用法（生产代码该长的样子）：

```tsx
// SmartPopover.tsx —— floating-ui 标准接入：offset + flip + shift + autoUpdate
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'

export function SmartPopover({
  anchorRef,
  open,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current || !popRef.current) return
    const anchor = anchorRef.current
    const pop = popRef.current

    // autoUpdate：滚动/缩放/锚点变化时自动重算（手写监听至少要三个 Observer 才能追平）
    return autoUpdate(anchor, pop, () => {
      computePosition(anchor, pop, {
        placement: 'bottom-start',
        // 中间件顺序有语义：先留间距，再翻面，再平移
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => setCoords({ x, y }))
    })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      // 点浮层外关闭：浮层和锚点都算"内"
      if (!popRef.current?.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  // Portal：脱离 DOM 层级，避免被 overflow:hidden 的祖先裁剪（层级治理见下）
  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${coords.x}px, ${coords.y}px)` }}
      className="popover"
    >
      {children}
    </div>,
    document.body,
  )
}
```

**层级与遮挡治理**：浮层体系要有全局的 z-index 秩序，否则每个浮层各写 `z-index: 9999` 迟早打架。做法与设计系统的 token 化一致：

```css
/* layers.css —— 分层 token：数值只在这里出现，组件里只引用 var() */
:root {
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-overlay: 1040;   /* 遮罩 */
  --z-modal: 1060;
  --z-popover: 1080;   /* 浮层在 modal 之上：modal 里的 select 也要能弹出来 */
  --z-tooltip: 1100;   /* tooltip 永远最上 */
}
```

两条纪律：同层浮层后开者在上面（用 Portal 的挂载顺序天然保证）；跨层只比较 token，绝不允许组件里写裸数字。另外注意 stacking context 的隐形来源：任何创建了 transform/filter/opacity<1 的祖先都会生成新层叠上下文——浮层被"神秘遮挡"时，先查祖先链上有没有这类样式，这就是 Portal 到 body 的根本原因。

**为什么不要自己写**（面试标准答案）：自己能写出上面 60 行的骨架，但追平 floating-ui 要补齐——裁剪祖先检测（沿父链找 `overflow` 非 visible 者作为翻转参考容器）、fixed 与 absolute 的策略切换（滚动性能 vs transform 祖先兼容）、RTL 镜像、`iframe` 内偏移、浏览器缩放与亚像素、aria 焦点管理配套（@floating-ui/react 的 FloatingFocusManager）、shadow DOM 边界。每一条都是真实用户环境的 case，补齐成本是"人年级"。正确姿势：**懂原理、用成品**。

常见坑：

- **症状**：下拉被父容器裁掉一条。**根因**：浮层没 Portal，祖先 `overflow: hidden`。**修法**：Portal + absolute（floating-ui 默认）。
- **症状**：页面滚动时 tooltip 不跟随。**根因**：没用 `autoUpdate`，只在打开时算了一次。**修法**：接入 autoUpdate，它内部组合了 scroll 监听 + ResizeObserver。
- **症状**：select 弹层一闪一闪。**根因**：flip 在两个方位间振荡（两侧空间都在临界值附近）。**修法**：给 flip 配 `padding` 与 fallbackPlacements（优先序列），避免在等价方位间反复横跳。

---

#### G.2 Command Palette（Cmd+K）

**是什么**：Cmd/Ctrl+K 唤起的全局命令面板——顶部一个搜索框，下面是分组命令列表，全程键盘操作。Linear/GitHub/Slack 的标志性交互，现代 SaaS 的标配。

**为什么需要**：功能超过 20 个的应用，导航菜单的层级深度就成为负担；命令面板把所有操作拍平成一张可搜索的列表，"记得名字"比"记得位置"轻松得多。自研它是因为这五个设计点（模糊搜索评分、分组、键盘导航、最近使用、无障碍）各自都是可迁移的硬知识：模糊评分进 G3 前的练手，键盘导航与 roving tabindex 直接通向 G4。

**怎么做（完整设计要点 + 核心代码骨架）**，五个要点逐个落：

**要点一：模糊搜索评分**。不是"包含才显示"，而是"子序列匹配 + 打分排序"。fzf 风格评分规则：逐字符在目标中按顺序找匹配（子序列）；基础命中 +10 分；**连续命中奖励**（用户在打一个完整词）；**词首边界奖励**（匹配在 camelCase 分界/空格后，`gc` 命中 `Git Commit` 远好于命中 `loGic Course`）；**间隔惩罚**（跳过的字符越多越像碰巧撞上）。

```ts
// fuzzyScore.ts —— fzf 风格的模糊评分：返回 -1 表示不匹配，分越高越相关
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 1 // 空查询：全部返回，交给"最近使用"排序
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let score = 0
  let ti = 0
  let prevMatch = -2
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]
    const found = t.indexOf(ch, ti)
    if (found === -1) return -1 // 子序列断了：不匹配
    score += 10 // 基础命中分
    if (found === prevMatch + 1) score += 15 // 连续命中：用户在打一个词
    // 词首边界：首字符，或前一字符是分隔符，或当前字符在原串里是大写（驼峰分界——注意用原大小写判断，t 已被小写化）
    const prev = target[found - 1] ?? ''
    const cur = target[found] ?? ''
    const boundary = found === 0 || /[\s\-_/]/.test(prev) || (cur >= 'A' && cur <= 'Z')
    if (boundary) score += 20
    score -= Math.min(found - ti, 10) * 2 // 间隔惩罚：跳得越远越像碰巧
    prevMatch = found
    ti = found + 1
  }
  return score
}
```

**要点二：分组**。命令带 `group` 字段，展示按组分段（组头不可聚焦）；键盘导航与选中索引都在**拍平后的列表**上移动，展示时再按组切段——导航逻辑与展示逻辑分离，是这类组件的关键解耦。

**要点三：键盘导航**。输入框永远持有焦点，列表项用 `aria-activedescendant` 关联（这是 ARIA 标准做法，详见 G4）：↑↓ 在拍平列表里移动 active，Enter 执行，Esc 关闭，Home/End 跳首尾。active 项滚到可视区（`scrollIntoView({ block: 'nearest' })`）。

**要点四：最近使用**。执行命令时记录 `id → 最后使用时间`（localStorage 持久化）；空查询时按最近使用排序置顶展示"最近使用"组——这就是"记得名字"之外的第二条肌肉记忆通道。

**要点五：无障碍**。`role="dialog"` + 输入框 `role="combobox"`（见 G4 的模式），列表 `role="listbox"`、项 `role="option"`，`aria-activedescendant` 指向 active 项 id，Esc 关闭并归还焦点给触发元素。

核心骨架：

```tsx
// CommandPalette.tsx —— Cmd+K 命令面板核心骨架
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

type Command = {
  id: string
  label: string
  group: string            // 分组：导航 / 操作 / 设置…
  keywords?: string        // 额外匹配文本（中文命令配英文关键词）
  run: () => void
}

// 最近使用：localStorage 持久化的 id → 时间戳
function loadRecent(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('cmdk-recent') ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function CommandPalette({ commands, open, onClose }: { commands: Command[]; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0) // 拍平列表中的 active 下标
  const [recent, setRecent] = useState(loadRecent)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 打开时重置并聚焦
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus()) // 等 Portal/DOM 就绪再聚焦
    }
  }, [open])

  // 过滤 + 排序：空查询按最近使用置顶；有查询按模糊分降序
  const flat = useMemo(() => {
    if (!query) {
      const sorted = [...commands].sort(
        (a, b) => (recent[b.id] ?? 0) - (recent[a.id] ?? 0), // 最近使用的排前面
      )
      return sorted
    }
    return commands
      .map((c) => ({ c, s: Math.max(fuzzyScore(query, c.label), fuzzyScore(query, c.keywords ?? '')) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
  }, [commands, query, recent])

  // 拍平列表 → 分组视图（组头只是展示，不参与索引）
  const groups = useMemo(() => {
    const m = new Map<string, Command[]>()
    for (const c of flat) m.set(c.group, [...(m.get(c.group) ?? []), c])
    return [...m.entries()]
  }, [flat])

  const execute = (cmd: Command) => {
    setRecent((prev) => {
      const next = { ...prev, [cmd.id]: Date.now() } // 记录最近使用
      localStorage.setItem('cmdk-recent', JSON.stringify(next))
      return next
    })
    onClose()
    cmd.run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(flat.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flat[active]
      if (cmd) execute(cmd)
    } else if (e.key === 'Escape') {
      onClose() // 焦点归还：关闭后 focus 回触发按钮（由外层管理）
    }
  }

  // active 变化时滚入可视区
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, flat])

  if (!open) return null

  // 拍平列表里的全局下标（跨组累计），用于与 active 对齐
  let flatIndex = -1
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-label="命令面板" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={flat[active] ? `cmdk-item-${flat[active].id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0) // 新查询重置 active，防止停在越界位置
          }}
          onKeyDown={onKeyDown}
          placeholder="输入命令或搜索…"
        />
        <div ref={listRef} id="cmdk-list" role="listbox" className="cmdk-list">
          {groups.map(([group, items]) => (
            <div key={group} className="cmdk-group">
              <div className="cmdk-group-head">{group}</div>
              {items.map((c) => {
                flatIndex += 1
                const isActive = flatIndex === active
                return (
                  <div
                    key={c.id}
                    id={`cmdk-item-${c.id}`}
                    role="option"
                    aria-selected={isActive}
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onMouseEnter={() => setActive(flat.indexOf(c))} // 鼠标 hover 同步 active
                    onClick={() => execute(c)}
                  >
                    {c.label}
                  </div>
                )
              })}
            </div>
          ))}
          {flat.length === 0 && <div className="cmdk-empty">没有匹配的命令</div>}
        </div>
      </div>
    </div>
  )
}
```

全局快捷键与组装：

```tsx
// AppShell.tsx —— 全局 Cmd+K 唤起
import { useEffect, useState } from 'react'
import { CommandPalette, type Command } from './CommandPalette'

const commands: Command[] = [
  { id: 'nav-home', label: '前往首页', group: '导航', keywords: 'go home', run: () => (location.hash = '#/') },
  { id: 'nav-settings', label: '打开设置', group: '导航', keywords: 'settings preferences', run: () => (location.hash = '#/settings') },
  { id: 'act-new-doc', label: '新建文档', group: '操作', keywords: 'create new doc', run: () => console.log('new doc') },
  { id: 'act-toggle-theme', label: '切换主题', group: '设置', keywords: 'theme dark light', run: () => console.log('toggle theme') },
]

export function AppShell() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault() // Chrome 里 Cmd+K 默认是搜索栏聚焦，必须拦截
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      {/* …应用内容… */}
      <CommandPalette commands={commands} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

常见坑：

- **`flat.indexOf(c)` 在 mouseEnter 里的性能**：千级命令下 indexOf 是 O(n)，hover 高频触发。改用在渲染时构建 `id → flatIndex` 的 Map。骨架里为了可读用了 indexOf，注释说明。
- **Cmd+K 与浏览器默认行为**：必须 `preventDefault`，否则 Chrome 会聚焦地址栏。
- **执行后忘关面板**：`execute` 里先 `onClose` 再 `cmd.run()`——顺序反了的话 run 里的路由跳转可能与关闭动画打架。
- **分组排序不稳定**：有查询时组间顺序跟着第一条命中浮动，用户会感觉"列表在跳"。固定组的优先序（导航 > 操作 > 设置），组内再按分数排。

---

#### G.3 虚拟滚动自研三部曲（定高 → 动高 → 二维）

**是什么**：只渲染可视区附近的行、用总高度撑出滚动条的列表技术。三部曲是它的递进学习路径：定高（所有行一样高）→ 动高（行高随内容变化）→ 横向/表格二维（行和列都虚拟化）。

**为什么需要**：E1（百万级数据渲染）把虚拟滚动列为面试硬通货；B2 的消息流、A2 的表格、本篇 F1 的长会话全都建立在它上面。自研三步的价值在于理解库（@tanstack/react-virtual、react-window）在每一步替你做了什么——尤其动高的测量与校正，是所有虚拟滚动 bug 的老巢。

**为什么定高是地基**——公式只有一行：`startIndex = floor(scrollTop / itemHeight)`，`visibleCount = ceil(viewportHeight / itemHeight)`，再加 overscan。所有虚拟滚动（无论库多花哨）的可视区计算都是这个公式的变体。

第一步，定高版（完整可跑）：

```tsx
// FixedList.tsx —— 定高虚拟列表：虚拟滚动的全部秘密就是这一个公式
import { useRef, useState, type ReactNode } from 'react'

export function FixedList({
  itemCount,
  itemHeight,
  viewportHeight,
  overscan = 4,
  renderItem,
}: {
  itemCount: number
  itemHeight: number
  viewportHeight: number
  overscan?: number
  renderItem: (index: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // ① 公式：从 scrollTop 算出该渲染哪些行
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan)

  const visible: ReactNode[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    visible.push(
      <div key={i} style={{ height: itemHeight }}>
        {renderItem(i)}
      </div>,
    )
  }

  return (
    <div
      ref={ref}
      style={{ height: viewportHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} // ② 滚动是唯一的状态源
    >
      {/* ③ 撑出真实总高度，滚动条才不会说谎 */}
      <div style={{ height: itemCount * itemHeight, position: 'relative' }}>
        {/* ④ 可视行整体平移到正确位置 */}
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>{visible}</div>
      </div>
    </div>
  )
}
```

第二步，动高版。行高未知后公式失效，解法是**测量缓存 + 估算 + 校正**：

1. **估算**：先用 `estimateSize` 估计每行高度，按"估算高度的前缀和"定位 startIndex；
2. **测量**：渲染出的行用 `ResizeObserver` 实测高度，写缓存 `Map<key, measured>`；
3. **校正**：估算与实测的差异会让"startIndex 之上的总高度"算错，表现为滚动条跳动/行重叠。校正手段：缓存命中时用实测值；行高变化时重算前缀和；**滚动过程中若上方行被重测导致内容上移，需要补偿 scrollTop**（把差值加回 `scrollTop`，用户视口内容才不跳）。

核心代码（骨架级，生产用 @tanstack/react-virtual——它把这三步都做完了，F1.6 已示范用法）：

```tsx
// DynamicList.tsx —— 动高虚拟列表：测量缓存 + 前缀和定位 + scrollTop 校正
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function DynamicList<T>({
  items,
  getItemKey,
  estimateSize, // 行高估算函数：宁小勿大（小了多渲几行，大了露白）
  viewportHeight,
  overscan = 4,
  renderItem,
}: {
  items: T[]
  getItemKey: (i: number) => string
  estimateSize: (i: number) => number
  viewportHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const heightsRef = useRef(new Map<string, number>()) // key → 实测高度
  const observersRef = useRef(new Map<string, ResizeObserver>())
  const containerRef = useRef<HTMLDivElement>(null)

  // 前缀和：offsets[i] = 第 i 行的顶部 y 坐标（估算值，命中缓存用实测）
  const offsets = useRef<number[]>([])
  const recompute = () => {
    const arr: number[] = [0]
    for (let i = 0; i < items.length; i++) {
      const key = getItemKey(i)
      const h = heightsRef.current.get(key) ?? estimateSize(i)
      arr.push(arr[i] + h)
    }
    offsets.current = arr
  }
  recompute()
  const totalHeight = offsets.current[items.length]

  // 二分找 startIndex：第一个 offset > scrollTop 的行
  let start = 0
  let lo = 0
  let hi = items.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (offsets.current[mid + 1] <= scrollTop) lo = mid + 1
    else {
      start = mid
      hi = mid - 1
    }
  }
  const end = Math.min(items.length - 1, start + Math.ceil(viewportHeight / estimateSize(start)) + overscan)

  // 测量：每个渲染出的行挂 ResizeObserver，实测写缓存
  useEffect(() => {
    const observers = observersRef.current
    return () => observers.forEach((o) => o.disconnect()) // 卸载清理，防 Detached DOM 泄漏（回指 E1）
  }, [])

  const setRowRef = (index: number) => (el: HTMLDivElement | null) => {
    if (!el) return
    const key = getItemKey(index)
    const prevMeasured = heightsRef.current.get(key)
    const observer = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height
      const estimated = heightsRef.current.get(key) ?? estimateSize(index)
      heightsRef.current.set(key, h)
      // 校正：可视区"上方"的行长高了，内容会下坠，补偿 scrollTop 保住视口
      if (index < start && h !== estimated) {
        const delta = h - estimated
        if (containerRef.current) {
          const prev = containerRef.current.scrollTop
          recompute()
          containerRef.current.scrollTop = prev + delta // 把长高的量加回滚动位置
          setScrollTop(containerRef.current.scrollTop)
          return
        }
      }
      recompute()
      setScrollTop((s) => s) // 触发重渲（前缀和已变）
    })
    observersRef.current.get(key)?.disconnect()
    observersRef.current.set(key, observer)
    observer.observe(el)
    // 首次渲染后立即测一次（ResizeObserver 只在变化时回调，首测要手动触发一次空变化或直接读 offsetHeight）
    if (prevMeasured == null) heightsRef.current.set(key, el.offsetHeight)
  }

  return (
    <div
      ref={containerRef}
      style={{ height: viewportHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.slice(Math.max(0, start - overscan), end + 1).map((item, i) => {
          const index = Math.max(0, start - overscan) + i
          return (
            <div
              key={getItemKey(index)}
              ref={setRowRef(index)}
              style={{
                position: 'absolute',
                top: offsets.current[index], // 用前缀和定位：动高的核心
                left: 0,
                width: '100%',
              }}
            >
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

第三步，二维（表格/横向）。行方向复用动高方案，列方向再做一套前缀和（列宽也可不等）。表格的特有难点是**行内列对齐**：行虚拟化后每行独立渲染，列偏移必须用同一份列前缀和计算（或 table-layout: fixed + 定宽），否则滚动时列会"波浪错位"。E1 的"10 万行 × 20 列"练习就是二维虚拟化的实战考场；A2 电子表格的"行列双 windowing"指的也是它。

```ts
// columnWindow.ts —— 列窗口计算：与行方向同构的前缀和 + 二分
export function visibleColumnRange(
  colOffsets: number[], // 列前缀和，长度 = 列数 + 1
  scrollLeft: number,
  viewportWidth: number,
  overscan = 2,
): { start: number; end: number } {
  let start = 0
  let lo = 0
  let hi = colOffsets.length - 2
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (colOffsets[mid + 1] <= scrollLeft) lo = mid + 1
    else {
      start = mid
      hi = mid - 1
    }
  }
  let end = start
  while (end < colOffsets.length - 2 && colOffsets[end + 1] < scrollLeft + viewportWidth) end++
  return { start: Math.max(0, start - overscan), end: Math.min(colOffsets.length - 2, end + overscan) }
}
```

常见坑：

- **估算值偏差引发的"跳变"**：估算 80 实测 240 的行，快速滚动时 startIndex 来回修正，表现为白屏闪一下。缓解：估算函数按数据特征分级（图片行/文本行/代码行各一个基准值），并在首次测量后跨会话缓存（F1.6 的 `getItemKey` 策略配合）。
- **scrollTop 校正的边界**：上面骨架在"上方行增高"时补偿；"下方行增高"不影响视口无需补偿。校正是动高虚拟滚动所有"滚动跳跃 bug"的答案，库已内置，自研版必须自己处理。
- **transform vs top**：行定位用 `transform: translateY()`（走合成、不触发 layout）或 `top`（会 layout）性能差数倍——定高版代码里已用 transform，动高版因为 top 要参与前缀和计算用了 absolute top，二者取舍要在注释里讲清楚（生产建议 transform）。
- **滚动条拖动跳到几千行外**：估算误差被放大。库的解法是"远距离跳转时先渲染估算行，落地后重测校正"，自研版至少要处理 `onScroll` 中的大 delta。

---

#### G.4 无障碍复杂组件（ARIA 1.2 的 Combobox/Tree 模式、roving tabindex、读屏走查）

**是什么**：复杂组件（自动补全输入、树、菜单、网格）的无障碍不是"加个 alt"级别的活，而是遵循 WAI-ARIA 1.2 的**既定模式**：角色（role）、属性（aria-*）、键盘交互三件套都有规范答案。ARIA 1.2 的 Combobox 与 Tree 模式是中后台最高频的两个。

**为什么需要**：一是合规（政企、海外市场有法可依，如 EN 301 549、ADA 诉讼）；二是键盘可达性是所有用户的效率需求（G2 的 Cmd+K 已经在吃了）；三是 ARIA 模式是"别人替你把交互设计想好了"——照着实现，交互正确率比自由发挥高得多。

**怎么做**——两个模式的要点清单：

**Combobox 模式**（自动补全输入，G2 的命令面板搜索框、IM 的 @ 提及都是它）：

1. 输入框 `role="combobox"`，`aria-expanded`（弹层开合）、`aria-controls`（指向列表 id）、`aria-autocomplete="list"`；
2. 弹层容器 `role="listbox"`，选项 `role="option"` + `aria-selected`；
3. **焦点永远在输入框**，用 `aria-activedescendant` 指向当前 active 项（读屏会朗读该项）——这是最容易做错的一条：很多人把焦点真的移进列表，导致输入态丢失、Esc 语义混乱；
4. 键盘：↓/↑ 移动 active、Enter 选中、Esc 关闭弹层（不清空输入）、Home/End 首尾、可打印字符继续过滤；
5. 输入清空/失焦时按规范管理弹层开合（`aria-expanded` 必须与真实 DOM 状态一致）。

**Tree 模式**（文件树、大纲树、组织架构）：

1. 容器 `role="tree"`；树节点 `role="treeitem"`；子节点容器 `role="group"`；
2. 每个 treeitem 带 `aria-level`（层级深度，读屏靠它报"第 2 层"）、`aria-expanded`（可展开节点）、`aria-selected`；
3. **roving tabindex**（焦点漫游）：整棵树中**只有一个节点 `tabindex=0`**（"停留点"，通常是上次焦点或首节点），其余 `tabindex=-1`。Tab 键一次进出整棵树，进入后用 ↑↓ 在节点间移动焦点（真 focus，不是 active 高亮），← 折叠/去父级，→ 展开/进子级，Home/End 首尾。

roving tabindex 的最小实现：

```tsx
// RovingTree.tsx —— roving tabindex 树骨架：唯一 tabindex=0 + 方向键移动真焦点
import { useRef, useState, type KeyboardEvent } from 'react'

export type TreeNode = { id: string; name: string; children?: TreeNode[] }

// 把树拍平成"可见节点"序列（展开态过滤），键盘导航在这个序列上做
function flattenVisible(nodes: TreeNode[], expanded: Set<string>, level = 1, out: Array<{ node: TreeNode; level: number }> = []) {
  for (const n of nodes) {
    out.push({ node: n, level })
    if (n.children && expanded.has(n.id)) flattenVisible(n.children, expanded, level + 1, out)
  }
  return out
}

export function RovingTree({ data }: { data: TreeNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [tabStopId, setTabStopId] = useState<string | null>(null) // roving tabindex 的停留点
  const treeRef = useRef<HTMLDivElement>(null)
  const visible = flattenVisible(data, expanded)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = visible.findIndex((v) => v.node.id === document.activeElement?.id)
    if (idx === -1) return
    const move = (i: number) => {
      const target = visible[i]
      if (!target) return
      e.preventDefault()
      setTabStopId(target.node.id) // 焦点移到哪，tab 停留点跟到哪
      treeRef.current?.querySelector(`#${target.node.id}`)?.focus()
    }
    if (e.key === 'ArrowDown') move(idx + 1)
    else if (e.key === 'ArrowUp') move(idx - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(visible.length - 1)
    else if (e.key === 'ArrowRight') {
      const cur = visible[idx].node
      if (cur.children && !expanded.has(cur.id)) toggle(cur.id) // 未展开：右键展开
      else if (cur.children) move(idx + 1) // 已展开：进入第一个子节点
    } else if (e.key === 'ArrowLeft') {
      const cur = visible[idx].node
      if (cur.children && expanded.has(cur.id)) toggle(cur.id) // 已展开：左键折叠
      // 折叠态去父级的实现需要父指针，此处从略（拍平时记录 parentId 即可）
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelected(visible[idx].node.id) // 选中与焦点分离：Enter 选中，焦点仍可漫游
    }
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="文件树"
      onKeyDown={onKeyDown}
      style={{ width: 280 }}
    >
      {visible.map(({ node, level }) => (
        <div
          key={node.id}
          id={node.id}
          role="treeitem"
          aria-level={level}
          aria-expanded={node.children ? expanded.has(node.id) : undefined}
          aria-selected={selected === node.id}
          tabIndex={tabStopId === node.id || (tabStopId === null && level === 1 && node === data[0]) ? 0 : -1}
          onFocus={() => setTabStopId(node.id)} // 鼠标点击也要同步停留点
          onClick={() => {
            node.children && toggle(node.id)
            setSelected(node.id)
          }}
          style={{ paddingLeft: (level - 1) * 20, cursor: 'pointer' }}
        >
          {node.children && <span aria-hidden>{expanded.has(node.id) ? '▾ ' : '▸ '}</span>}
          {node.name}
        </div>
      ))}
    </div>
  )
}
```

（id 直接用数据 id 时注意转义：`querySelector('#a b')` 会出错，生产中给 id 加前缀并校验字符，或改用 ref 表定位。）

**读屏走查方法**（不改代码也要会做的验收动作）：

1. **macOS VoiceOver**：`Cmd + F5` 开启（VO 键 = Ctrl + Option）。`VO + →/←` 逐元素读，`VO + ↑/↓` 在容器间跳；进树后用 ↑↓ 听朗读是否报"第 N 层、已展开、已选中"。命令面板打开时应听到"命令面板 对话框"，输入后 `aria-activedescendant` 变化会让读屏自动朗读 active 项——不朗读就是 aria 链路断了。
2. **Windows NVDA**：`Ctrl + Alt + N` 启动（NVDA 键 = 小键盘 Insert 或 Caps Lock）。重点操作 `NVDA + 空格`：在"浏览模式/焦点模式"间切换——复杂组件必须切到焦点模式逐键走查，浏览模式下方向键被读屏自己截获，测不出键盘 bug。
3. **走查清单**（每组件过一遍）：只用键盘能否完成全部操作；焦点可见（focus 样式没被 `outline: none` 杀掉）；状态变化有播报（`aria-live` 用于异步结果，如"搜索完成，共 5 条"）；信息不依赖单一感官（颜色之外有文字/图标形状）；弹层关闭后焦点归还触发元素（G2 的 onClose 语义）。

常见坑：

- **ARIA 第一定律**："没有 native 元素可用时才加 ARIA"（`<button>` 天生可聚焦可回车，别用 `<div role="button">` 重造）。加了 `role` 只是改了朗读，不会 magically 补上键盘行为——role 与键盘处理必须成对出现。
- **aria-expanded 与真实状态不同步**：状态在 React 里是对的，但 DOM 属性没跟着更新（条件渲染把属性写在里层）。读屏用户据此误判。走查时在 devtools 里盯属性。
- **焦点样式**：`outline: none` 不配 `:focus-visible` 替代方案 = 键盘用户"盲飞"。设计系统统一在 reset 层处理。
- **树用 `<ul><li>` 还是 role**：都可以；用 role 方案时记得 `aria-owns` 处理虚拟化后"DOM 不连续"的层级关系（G5 的 react-arborist 内部就面对这个问题）。

---

#### G.5 无限层级树：大数据量 + 拖拽换父 + 虚拟化（react-arborist）

**是什么**：文件管理器式无限层级树，同时满足三个条件：万级节点（虚拟化）、拖拽换父（dnd）、键盘可操作。react-arborist 是这个交叉领域的代表实现（dnd-kit + 虚拟滚动的组合）。

**为什么需要**：树是编辑器族（大纲树）、文件类产品（网盘）、权限系统的公共底座；进阶大纲 §1.7 已经把它列为大 schema 树性能的解法。三条件的组合难在**虚拟化要求行高固定，而树有展开/折叠的动态可见集**——react-arborist 的做法是把树拍平成"可见行序列"再虚拟化，展开态变化 = 序列重算。

**怎么做**：

```tsx
// BigTree.tsx —— react-arborist：万级节点 + 拖拽换父 + 虚拟化
import { useMemo, useState } from 'react'
import { Tree, adjustMoveIndex, type NodeApi, type NodeRendererProps } from 'react-arborist'
import type { TreeNode } from './RovingTree' // 复用 G4 的节点类型 { id, name, children? }

// 生成测试数据：3 层 × 平均 30 子节点 ≈ 2.7 万节点
function genTree(): TreeNode[] {
  const mk = (i: number, depth: number): TreeNode => ({
    id: `n-${depth}-${i}`,
    name: `节点 ${depth}-${i}`,
    children: depth < 3 ? Array.from({ length: 30 }, (_, k) => mk(k, depth + 1)) : undefined,
  })
  return Array.from({ length: 30 }, (_, i) => mk(i, 1))
}

// 自定义行渲染：NodeRendererProps 里的 style 必须原样应用（虚拟化定位）
function Row({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  return (
    <div
      style={{ ...style, alignItems: 'center', display: 'flex' }}
      ref={dragHandle} // dragHandle 指定拖拽把手（整行可拖）
      onClick={() => node.toggle()} // 展开/折叠（叶子节点 toggle 是 no-op）
      role="treeitem"
      aria-level={node.level}
      aria-expanded={node.isInternal ? node.isOpen : undefined}
    >
      <span style={{ marginRight: 4 }} aria-hidden>
        {node.isInternal ? (node.isOpen ? '▾' : '▸') : '·'}
      </span>
      {node.data.name}
    </div>
  )
}

export function BigTree() {
  const [treeData, setTreeData] = useState<TreeNode[]>(() => genTree())

  // 拖拽换父：onMove 回调里更新自己的不可变数据（react-arborist 是受控的，不改你的 data）
  const onMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
    setTreeData((root) => moveNodes(root, args.dragIds, args.parentId, args.index))
  }

  return (
    <Tree
      data={treeData}
      width={360}
      height={520}
      rowHeight={28} // 虚拟化的前提：固定行高（树缩进由 indent 承担，不影响行高）
      indent={22}
      overscanCount={8}
      openByDefault={false} // 万级节点默认全展开会拍平出超长序列，默认折叠
      onMove={onMove}
    >
      {Row}
    </Tree>
  )
}

// 不可变的"摘下节点 + 插入新位置"工具（拖拽换父的数据层）
function moveNodes(
  root: TreeNode[],
  dragIds: string[],
  parentId: string | null,
  index: number,
): TreeNode[] {
  // 1) 先从原树摘掉被拖节点（返回 [新树, 摘下的节点]）
  const detached: TreeNode[] = []
  const remove = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .filter((n) => {
        if (dragIds.includes(n.id)) {
          detached.push(n)
          return false
        }
        return true
      })
      .map((n) => (n.children ? { ...n, children: remove(n.children) } : n))
  const afterRemove = remove(root)

  // 2) 插入目标父节点（parentId 为 null 表示根层）
  const insert = (nodes: TreeNode[]): TreeNode[] => {
    if (parentId === null) {
      const next = [...nodes]
      next.splice(index, 0, ...detached)
      return next
    }
    return nodes.map((n) => {
      if (n.id === parentId) {
        const children = [...(n.children ?? [])]
        children.splice(index, 0, ...detached)
        return { ...n, children }
      }
      return n.children ? { ...n, children: insert(n.children) } : n
    })
  }
  return insert(afterRemove)
}
```

两个来自文档的关键细节（不读源码/文档必踩）：

1. **onMove 的 index 是"摘除前槽位"**：官方说明 index 按被拖行还占着原位时计数，若先摘除再插入会错位一位。react-arborist 导出了 `adjustMoveIndex({ index, dragIds, siblingIds })` 来修正——拖到同一父节点内做排序时必须用它：

```ts
import { adjustMoveIndex } from 'react-arborist'

const onMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
  setTreeData((root) => {
    const siblingIds = findChildrenIds(root, args.parentId) // 目标父节点的现有子节点 id 序列
    const adjusted = adjustMoveIndex({ index: args.index, dragIds: args.dragIds, siblingIds })
    // 用 adjusted 而不是 args.index 做 remove + insert（把上面 moveNodes 的 index 换成 adjusted）
    return moveNodes(root, args.dragIds, args.parentId, adjusted)
  })
}
```

（`findChildrenIds` 是"按 parentId 找现有子节点 id 数组"的简单递归，实现如下，与 `moveNodes` 同构：）

```ts
// findChildrenIds.ts —— 找目标父节点的现有子节点 id 序列（根层传 null）
import type { TreeNode } from './RovingTree'

export function findChildrenIds(root: TreeNode[], parentId: string | null): string[] {
  if (parentId === null) return root.map((n) => n.id)
  for (const n of root) {
    if (n.id === parentId) return (n.children ?? []).map((c) => c.id)
    if (n.children) {
      const found = findChildrenIds(n.children, parentId)
      if (found.length > 0) return found
    }
  }
  return []
}
```

2. **受控数据 + 展开态**：`Tree` 的 `data` 是受控的，你的 `onMove` 必须返回新树，否则拖完弹回原位（骨架里 setTreeData 已处理）；展开态默认内部管理（非受控），要持久化展开状态（刷新后保持）就传 `initialOpenState` 或用 `TreeApi` 实例（ref 拿到）做 `open/close`。

性能与规模要点：万级节点下真正被渲染的只是可见的几十行（虚拟化），展开一个 5000 子节点的父节点也只是"可见序列变长"，渲染成本不变——但**拍平计算**（展开态 → 可见序列）是 O(总节点数) 的，在 10 万级要靠库内部的 memo 与增量更新；如果你的业务到这个量级，先做"默认折叠 + 搜索定位再展开"的产品约束，别硬扛全展开。

常见坑：

- **rowHeight 必须诚实**：行实际 34px 你传 28，滚动定位整体漂移、拖拽落点错位。树里"行高不一致"（分组标题更高）的诉求，react-arborist 不直接支持——把分组标题做成独立节点类型并统一行高。
- **拖拽把手与点击冲突**：整行做 dragHandle 时点击容易误触拖拽（鼠标微移 1px 就算拖）。dnd-kit 的 activationConstraint（进阶大纲 §1.6 的"启动延迟 vs 启动距离"）思想同样适用：把把手收窄到图标区，或给树配 `disableDrag` 后在行内单独放把手。
- **id 必须全局唯一**：换父操作按 id 匹配，重复 id 会让节点"被吸走"。测试数据生成器里的 id 拼接层级前缀（`n-${depth}-${i}`）就是为了这个。
- **拖拽预览闪烁**：虚拟化下拖动时原行被回收，预览层跟着闪。确认用了库自带的拖拽预览（renderDragPreview）而不是自己拿原行截图。

---

## 怎么选：按职业方向匹配

| 你的方向 | 首选深扎 | 组合技 | 对应能力栈 |
|---|---|---|---|
| 文档/协同产品 | 富文本(A1) + 协同(B1) + 表格(A2) | 编辑器内核 + CRDT 合并 + 二维虚拟化/公式引擎，三者共享虚拟化与命令栈底座 | Notion/飞书能力栈（壁垒最高） |
| BI / 数据智能 | 大数据可视化(C1) + GIS(C2) + 前一份大盘 | 渲染分级 + 地理坐标系 + Schema 驱动配置页（进阶大纲 §4） | 数据大屏/BI 全链路 |
| AI 应用（当前风口） | AI 前端(F1/F2) + E1 性能 + 前一份 schema 渲染 | 流式渲染 + 生成式 UI + 长会话性能，渲染内核 = schema 渲染器 | 生成式 UI 本质 = schema 渲染器 |
| 音视频/社交 | 音视频(B3) + IM(B2) + WebRTC | 播放器/WebRTC 传输 + 长会话虚拟化与乐观消息 | RTC 场景专家 |
| 前端基建/平台 | 插件化(D1) + 微前端(D2) + 在线 IDE(D4) + E1 | 注册表架构 + 沙箱隔离 + 构建管线 + 性能治理 | 大厂平台组方向 |
| 独立开发/全栈 | 桌面端(D5) + Local-first(E2) + 扩展(D6) | 跨端打包 + 离线数据层 + 轻量分发渠道 | 产品交付闭环 |

> 说明：原表第三列（组合技）的内容实际是第四列（对应能力栈）的描述、末列为空，本表已把语义归位，并为每个方向补上了真正的"组合技"——即这条路线里几个场景互相复用的公共技术。下面逐行展开：每行给出 6 个月的学习顺序建议与第一份工作的切入点。

### 逐行展开

**第一行：文档/协同产品（富文本 A1 + 协同 B1 + 表格 A2）**

这条路线的公共底座是"编辑器内核 + 数据合并 + 虚拟化"：A1 的 ProseMirror 命令栈与 B1 的 immer patch（进阶大纲 §1.5）是同一思想的两端，A2 的二维虚拟化直接复用 G3 第三步。三个场景彼此互喂，所以值得绑定深扎；代价是学习曲线最陡（ProseMirror + CRDT 都是"入门三个月"的怪物），周期放 6 个月不算宽裕。

6 个月顺序建议：第 1–2 月 A1——TipTap 官方 demo 改起，做 mini Notion（标题/列表/图片/斜杠命令/块拖拽），期间精读 ProseMirror Interactive Guide；第 3 月 B1——两个 Tab 用 y-websocket 协同编辑同一段富文本，吃透 Y.Doc/Y.Text/awareness；第 4 月 A2——最小表格（二维虚拟化 + 单元格编辑），再引入公式依赖图（study HyperFormula）；第 5 月整合：给 mini Notion 加协同（y-prosemirror），体验冲突合并；第 6 月打磨作品 + 投递。第一份工作切入点：飞书/语雀/钉钉文档、各类 SaaS 协作文档团队的"文档周边"岗位——评论、权限、导出、移动端适配，这些模块复杂度低于编辑器内核但需要懂内核的人做，是从外围进入内核组的经典路径；面试时你的 mini Notion + 协同 demo 就是硬通货。

**第二行：BI / 数据智能（大数据可视化 C1 + GIS C2 + 前一份大盘）**

公共底座是"渲染分级 + 坐标系统 + 配置化"：C1 的 Canvas/WebGL 分级、C2 的地理坐标变换，最终都服务"把一份 schema 数据变成一页可交互的报告"——而配置化页面正是进阶大纲 §4（大盘）的产物。这条线的特点是算法味重（降采样、聚合、空间索引），适合数学不怵的人。

6 个月顺序建议：第 1 月 D3 基础（Canvas 2D 手绘：散点/直方/热力，不用图表库，练"数据→像素"的直觉）+ C1 的 deck.gl 入门；第 2 月 C1 深入——Canvas 渲染 10 万散点 + 框选缩放，LTTB 降采样、tooltip 拾取；第 3 月 C2——MapLibre 上做海量点聚合 + 行政区下钻 + 轨迹回放，搞懂 GCJ02 坑；第 4 月整合进阶大纲 §4 的大盘：把图表块换成 deck.gl 图层、接真数据源；第 5 月性能与联动（图表联动、缩放节流、Worker 聚合）；第 6 月做一个"城市级数据大屏"完整作品。第一份工作切入点：数据可视化公司（如各类大屏外包转产品的厂商）、政企 BI 交付团队、物流/出行的地图组——大屏类岗位对"又懂图表又懂 GIS"的缺口最明显，且这类团队常缺前端功底好的人，你的 React 工程能力就是差异化。

**第三行：AI 应用（AI 前端 F1/F2 + E1 性能 + 前一份 schema 渲染）**

当前风口行。公共底座是"流式渲染 + 结构化输出消费 + 长列表性能"：F1 的十个小节（本篇已展开）+ E1 的虚拟化/Worker + 进阶大纲 §1–2 的注册表与渲染器，拼起来就是"生成式 UI 全家桶"。这条线的独特优势是增量学习成本最低——你已有的 schema 线能力直接变现。

6 个月顺序建议：第 1 月 F1 全部（按 F1 小结的六步练习路径）；第 2 月 F2 Agent 画布（接 F1 项目做三节点工作流 + 运行态 + 调试面板）；第 3 月进阶——结构化输出工程化：zod schema 设计、流式 JSON 渐进渲染、组件市场（注册表插件化）；第 4 月 E1——长会话极致性能（10 万消息压测：虚拟化 + Worker + 内存治理）；第 5 月接真模型生态：多模型切换、token 成本面板、评测（把"好不好用"量化）；第 6 月做一个开源的"AI 聊天前端组件库"或给 Dify 类开源项目提 PR。第一份工作切入点：所有在做 AI 产品的团队（大厂 AI 创新组、Agent 创业公司、把 AI 塞进现有 SaaS 的中厂）都在招"能把 LLM 能力变成好体验的前端"——切入点是聊天/画布这类成熟模块的迭代岗；你的杀手锏是 demo：一个流式渲染顺滑、支持工具调用折叠和生成式 UI 的作品集，比简历上任何一行字都有说服力。

**第四行：音视频/社交（音视频 B3 + IM B2 + WebRTC）**

公共底座是"实时数据流 + 长会话状态"：B3 的播放/传输管线与 B2 的消息流虚拟化、乐观更新组合成完整的实时社交产品。这条线协议与底层知识比重大（WebRTC/hls.js/WebCodecs），属于"换框架知识保值"型投资，但前端占比也高（设备管理、弱网 UI、消息性能）。

6 个月顺序建议：第 1 月 B3 播放器——hls.js 做倍速/截图/缓冲进度；第 2 月 WebRTC 1v1——信令/SDP/STUN/TURN 全流程跑通（自己搭信令服务器）；第 3 月 B2——WebSocket 聊天室（虚拟化 + 乐观发送 + 撤回 + 引用回复）；第 4 月 B2 深入——已读回执、@ 补全、图片预览、向上翻页补洞；第 5 月进阶——MediaRecorder 录制、多人 SFU 概念、声浪可视化；第 6 月做一个"连麦 + 聊天"的直播 demo。第一份工作切入点：直播/在线教育/社交 App 的音视频前端组，或 IM 中台（各家大厂基本都有）；切入点通常是播放器迭代与弱网体验优化（确定性需求、马上能干活），WebRTC 全栈能力在团队里往往稀缺、快速成为关键人。

**第五行：前端基建/平台（插件化 D1 + 微前端 D2 + 在线 IDE D4 + E1）**

公共底座是"架构能力 + 沙箱隔离 + 构建管线 + 性能治理"——这条线最不挑业务域，本质是"给几百个工程师造工具"。它的学习特点是概念密度高、动手环境重（要模拟多团队协作场景），适合已经有一定工程经验的人。

6 个月顺序建议：第 1 月 D1——给进阶大纲 §6 的低代码平台做插件系统（contribution points、能力权限、动态加载、失败降级）；第 2 月 D2——qiankun 主子应用 + Module Federation 共享依赖，并写清楚"什么时候不该用"的反向清单；第 3 月 D4——sandpack 做组件 playground，啃 WebContainers 概念；第 4 月 E1——10 万行表格（DOM 与 Canvas 双版本）+ 内存泄漏排查实战；第 5 月整合——把低代码平台做成"插件化 + 微前端接入 + 在线预览"的完整平台作品；第 6 月性能专项（INP/LCP 治理报告）。第一份工作切入点：大厂平台组（组件平台/低代码平台/研发效能）、云厂商控制台团队；切入点是"组件库建设与治理"（几乎所有平台组都缺这块），你的插件化 + 低代码作品直击其核心业务。

**第六行：独立开发/全栈（桌面端 D5 + Local-first E2 + 扩展 D6）**

公共底座是"产品交付闭环"：D5 解决"能装到用户电脑"，E2 解决"断网可用与多端同步"，D6 解决"轻量触达"。这条线的目标不是进某类公司，而是独立交付完整产品——技能组合围绕"一个人把产品做完"设计。

6 个月顺序建议：第 1 月 D5——把一个既有 Web 项目用 Tauri 打成桌面 App（多窗口、托盘、自动更新）；第 2 月 E2——Service Worker + IndexedDB 给它做离线可用（断网操作入队、恢复重放）；第 3 月 D6——做一个"划词翻译 + 标注"浏览器扩展（MV3、content script 隔离世界）；第 4 月整合——桌面 App 内嵌本地数据层（Dexie），体验 Local-first 的"秒开"；第 5 月产品化——登录/付费/更新分发（扩展商店 + 桌面端自动更新通道）；第 6 月发布一个真实产品（哪怕小工具），跑通"开发→分发→收费→迭代"全环。第一份工作切入点：严格说这条线的"工作"是"产品"——但若要映射到岗位，是出海工具团队、远程全栈岗、早期创业公司的"第一个前端"：这些岗位要的正是"前后端 + 打包 + 分发"都能自己闭环的人，你的已上线产品就是简历本身。

---

## 给 React 开发者的三个"最值钱"建议

1. **AI 原生前端（F 族）**：需求爆发期，且"生成式 UI"与你的 schema 渲染器一脉相通——同一条内核两种应用，学习成本最低、溢价最高。
2. **富文本 + 协同（A1+B1）**：壁垒最高、越老越值钱，但学习曲线陡，适合作为 6 个月以上的长线。
3. **交互组件自研（G 族）**：性价比打底，2–3 周完成，直接提升你所有项目的质量与面试深度。

逐条论证。

**第一条：为什么 AI 前端学习成本最低、溢价最高**。先算成本账：F 族的三个知识块——流式（F1.1–F1.6）、结构化输出消费（F1.7）、画布（F2）——分别复用你已有的三块资产：长列表性能直觉（E1/B2 的虚拟化直接平移到消息流）、schema 渲染器（进阶大纲 §1.2/§1.3 一字不改）、节点编排（A4 的 React Flow）。真正全新的知识只有"流式增量解析"和"LLM 结构化输出约束"两小块，两周能吃透——对比 A1 富文本（ProseMirror 四件套三个月起步）或 B3 音视频（WebRTC 协议栈 + 网络知识），F 族是对 React 开发者最友好的赛道。再算溢价账：市场定价由供需决定，2024 年以来"能把 LLM 输出变成好体验的前端"的需求增速远超供给增速，而多数在职前端还没系统补这块——供给缺口就是溢价。窗口期的风险当然存在（AI 热度可能回落），但即使回落，你沉淀的流式渲染、结构化消费、高频更新调度都是通用前端能力，下行有保底——这是一个"上行收益大、下行损失小"的赔率结构。

**第二条：为什么富文本 + 协同越老越值钱**。这类技能的价值曲线由三个特性决定：一是**知识不可速成**——ProseMirror 的 Schema/Transaction/Plugin 体系、CRDT 的合并语义、浏览器 contentEditable 的历史坑（中文 IME、光标管理、原生撤销污染），没有三年实战很难形成"能从零造一个"的判断力，速成者的半成品在真实用户面前会碎掉；二是**需求永续**——文档、表格、白板是人类协作的底层数据结构，产品形态再怎么更替（Notion→AI 原生文档），编辑器内核与合并算法的需求不变，甚至 AI 时代"模型直接改文档"让协同层（权限、冲突、审计）更重要；三是**供给恒定稀少**——每年入行的前端里，主动选择这条陡曲线的人占比很小。三者叠加的结果：这个岗位的市场价随你的年限单调上升，35 岁危机叙事在这里最弱（你踩过的坑就是定价权）。代价是前 6 个月几乎没有正反馈，所以定位为长线：用第一行路线表的双月节奏推进，允许它与其他路线并行。

**第三条：为什么 G 族性价比最高**。把三个变量乘起来看：**耗时**——2–3 周（floating-ui 原理 3 天、Cmd+K 4 天、虚拟滚动 5 天、无障碍 3 天、树 3 天）；**回报半径**——五项技能作用于你之后写的每一个项目（任何表单都要浮层与无障碍，任何列表都受益于虚拟化直觉，任何应用都能加 Cmd+K），这是"底座型投资"，与 F 族"赛道型投资"正交；**面试密度**——G 族每项都是高频面试题（"讲讲虚拟滚动""flip 怎么实现""roving tabindex 是什么"），且能答出实现细节的候选人极少。2–3 周换"所有项目质量 +1 档、面试硬通货 +5"，单位时间回报没有任何一族能比。顺序建议放在最前：先做 G（打底），再上 F（冲浪），长线挂 A1+B1（筑壁垒）。

---

## 与前两份大纲的衔接（内核复用）

- 生成式 UI（F1）＝ schema 渲染器（进阶大纲 §1.3/§2）
- Agent 画布（F2）＝ 节点编排（A4）+ Setter 体系（进阶大纲 §3）
- 在线 IDE（D4）＝ JSON 编辑器（进阶大纲 §5）+ 安全沙箱（进阶大纲 §6.7）
- 插件化（D1）＝ 注册表模式（进阶大纲 §1.2）的架构级放大
- 协同（B1）＝ Undo/Redo 补丁思想的分布式延伸（进阶大纲 §1.5）

五条映射逐条讲清"具体复用什么、在哪里接缝"。

**第一条：生成式 UI（F1）＝ schema 渲染器（进阶大纲 §1.3/§2）**。具体到代码级：F1.7 的 demo 里，`UiNode` 协议就是进阶大纲 §1.1 的 discriminated union 节点协议；`registry: WidgetMap` 就是 §1.2 的组件注册表（连"带物料元信息"的扩展位都保留了——生成式 UI 的组件市场就是物料系统的另一种卖法）；`RenderNode` 递归渲染器就是 §1.3 的 `renderNode`，连"key 用节点 id、Node 组件 memo"两个戒律都一字不差；如果生成式 UI 要做"填表后提交"的交互（比如 LLM 生成一张订单表单），§2 的动态表单整套（Field 组件、path 级订阅、visibleWhen 联动、校验）直接搬来。唯一的接缝在数据生产端：§1 的生产者是"设计器拖拽"（§3）或"手工 JSON"，F1 换成"LLM 结构化输出"——所以你在 §1 练的协议设计能力（可序列化、声明式、版本号、稳定 id）在这里是生死线：协议设计得好，LLM 的约束 schema（zod）就好写，strict 模式拒掉非法输出的能力就强。两种应用共享同一条内核，这就是"学习成本最低"的结构性原因。

**第二条：Agent 画布（F2）＝ 节点编排（A4）+ Setter 体系（进阶大纲 §3）**。拆到组件级：画布层——A4 的 React Flow 全套（自定义节点/边、isValidConnection 类型校验、dagre 布局、小地图）原样复用；属性层——选中 Agent 节点时右侧面板渲染参数表单，这正是 §3 表单设计器"属性区"的运行态版：节点协议里的 `paramsSchema`（本篇 F2.1 已给出类型）就是 §3 里物料的"setters 声明"，面板按 schema 渲染"模型选择器、温度滑杆、prompt 多行文本"的过程，就是 §2 动态表单的渲染过程（连"字段用 selector 只订阅自己的 value"的性能纪律都适用）。接缝在两点：一是变量的求值上下文——Agent 的 `{{node_1.output}}` 引用复用 §1.4 表达式引擎，把 `$form` 换成 `$nodes`；二是运行态（本篇 F2.2 新增的 rAF 合并层）挂在 A4 的静态画布之上，静态结构与动态监控分离，DSL 序列化时剥离 `run` 字段。

**第三条：在线 IDE（D4）＝ JSON 编辑器（进阶大纲 §5）+ 安全沙箱（进阶大纲 §6.7）**。在线 IDE 的三个核心件都能在前两份大纲里找到原型：编辑器——§5 已经为 JSON 场景啃过 Monaco（取值模型、光标控制、校验标注），D4 把语言从 JSON 扩展到任意语言（Monarch tokenizer/Lezer 语法），编辑器容器的工程问题（多 Tab、虚拟文件系统、TS Worker）是 §5 的外推；预览沙箱——§6.7 的"安全执行用户 JS"（iframe 沙箱、错误透传）就是 CodeSandbox 式预览的安全底座，D4 的增量是构建链（sandpack/WebContainers/esbuild-wasm/import maps）；版本对比——本篇 F2.4 的 monaco DiffEditor 直接是 §5 选型的复用。接缝认识：在线 IDE = "编辑器（§5）+ 沙箱（§6.7）+ 构建（新知识）"，真正要新学的只有构建管线一块。

**第四条：插件化（D1）＝ 注册表模式（进阶大纲 §1.2）的架构级放大**。§1.2 的注册表是"一个对象映射 + 元信息"，解决"组件从哪来"；D1 把同一个模式放大三个数量级：扩展点从"组件类型"变成**contribution points**（VSCode 式声明：插件声明"我要贡献一个面板 + 三个命令 + 一种物料"，宿主按声明合并进注册表）；注册来源从"编译期静态"变成**运行时动态**（CDN ESM / 动态 import，要处理加载失败降级与版本兼容）；信任模型从"全信任"变成**能力授权**（插件只能用宿主暴露的白名单 API，对应注册表元信息里的权限声明）。接缝在于：做 D1 之前必须先把 §1.2 的注册表用熟（你低代码平台里的物料系统就是现成宿主），否则 contribution points 的设计会退化为"什么都往全局塞"。这也是为什么 D1 的入手路径是"给第 6 章低代码平台做插件系统"——宿主已经有了，缺的只是放大。

**第五条：协同（B1）＝ Undo/Redo 补丁思想的分布式延伸（进阶大纲 §1.5）**。§1.5 的三种 undo/redo 实现里，`immer produceWithPatches` 生成正/反补丁的思想，在 B1 里的对应物是 CRDT 的**操作与逆操作可交换合并**：本地编辑 = 产生一个操作（patch），撤销 = 应用逆操作，协同 = 把操作广播给别人并保证任意顺序应用结果一致（CRDT 的数学保证，last-write-win 做不到）。更直接的复用在工程层：Yjs 的更新（update）就是一棵文档补丁的二进制编码，`Y.applyUpdate(doc, update)` 与"把 immer patch 应用到 draft"在心智模型上同构；两个 Tab 协同的调试、离线 edits 的合并回放，用的正是 §1.5 练过的"补丁流思维"。接缝认识：先把 §1.5 的补丁（含合并补丁防逐字符回退的坑）吃透，B1 的学习曲线会从"全新领域"降为"补丁思想的分布式版本"——省下的时间拿去攻 CRDT 真正的新知识（Yjs 的数据结构与 awareness）。

至此，23 个场景、7 大族群、"怎么选"与三条建议全部展开。回到开篇那句话：没人能全学——现在你已经有了完整的地图与每条路线的成本收益账，挑 2–3 个深扎 4–6 周，其余的知道"它是什么、难在哪、复用什么"就够。这份全景图的价值不在"都做一遍"，而在你面对任何一个新需求时，能立刻认出它是哪个场景的变体、内核在哪儿已经写过。
