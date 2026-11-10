# 前端高阶场景全景图

> 定位：第三份文档。前两份覆盖了基础（`react-学习大纲.md`）与 Schema 驱动线（`react-进阶大纲-复杂场景.md`：动态表单/大盘/设计器/JSON 编辑器/低代码）。
> 第四份：`react-高阶场景-第二辑.md`（搭建器族增量 + 查询构建器/权限/多租户主题/动态 i18n 的 SaaS 三件套全量）。
> 本篇回答："还有哪些硬场景？"——7 大族群 23 个场景，含核心技术、难度、代表产品、入手路径。
> **用法：没人能全学。按"职业方向 × 兴趣"挑 2–3 个深扎，每个深扎 4–6 周。**

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

---

## A. 编辑器家族（与 Schema 线最近，壁垒最高）

### A1. 富文本 / 块编辑器（★★★★★）——前端"皇冠明珠"
- **画像**：Notion/飞书文档式编辑器
- **核心技术**：contentEditable 的坑（光标管理、中文 IME、浏览器原生撤销污染）→ ProseMirror 四件套（Schema/State/Transaction/PluginView）→ TipTap 快速开发 → 块编辑器（块拖拽排序、嵌套、`/` 斜杠命令、块级菜单）
- **代表**：Notion、飞书文档、语雀
- **入手**：TipTap 官方 demo 改起 → **ProseMirror 官方 Interactive Guide 必读** → 做一个支持标题/列表/图片/斜杠命令/块拖拽的 mini Notion

### A2. 电子表格（★★★★★）
- **画像**：Excel/飞书表格，前端复杂度天花板之一
- **核心技术**：二维虚拟滚动（行列双 windowing）、单元格渲染选型（DOM vs Canvas 自绘）、**公式引擎**（单元格依赖图 + 拓扑排序 + 循环引用检测，可 study HyperFormula/Univer 源码）、选区/框选/填充柄/冻结行列、剪贴板与 Excel 互操作（TSV + HTML 双格式）、条件格式、协同（接 B 族）
- **入手**：先做"虚拟滚动 + 单元格编辑"的最小表格，再引入公式依赖图

### A3. 画布 / 白板编辑器（★★★★☆）
- **画像**：Figma/Excalidraw/海报编辑器/流程图
- **核心技术**：渲染选型（SVG 交互易 vs Canvas 性能强 vs 分层混合）、**坐标变换**（世界坐标↔屏幕坐标、zoom/pan 矩阵）、命中检测（几何计算 + R-tree 空间索引）、框选/多选/对齐吸附（吸附线算法）、组合成组、命令栈 undo/redo、脏矩形与分层渲染、导出（PNG/SVG）
- **代表**：Figma、Excalidraw、ProcessOn、稿定设计
- **入手**：用原生 Canvas 或 react-konva 做一个支持画矩形/选中/拖动/缩放画布的白板

### A4. 节点编排画布（★★★☆☆）
- **画像**：n8n/Dify 式工作流，AI 时代的当红场景
- **核心技术**：@xyflow/react（React Flow）：自定义节点/边、连线规则校验（类型约束）、自动布局（dagre/ELK）、小地图、缩放平移、**运行态可视化**（节点状态流转、流式高亮）、变量面板
- **入手**：做一个"输入→处理→输出"三节点工作流，带校验与运行态

### A5. 在线代码编辑器 / 自研 DSL（★★★★☆）
- **画像**：Monaco/CodeMirror 深度定制（前一份大纲只覆盖了 JSON 场景）
- **核心技术**：自定义语言（Monarch tokenizer / CodeMirror 的 Lezer 语法）：高亮/补全/错误提示；LSP 进浏览器（monaco-languageclient）；多文件 Tab + 虚拟文件系统；TS Worker 类型提示
- **代表**：CodeSandbox、StackBlitz、JSON Schema 编辑器（你的第 5 章）
- **入手**：为自己的低代码协议写一个 DSL（高亮 + 补全 + 校验），反哺第 5 章 JSON 编辑器

---

## B. 实时与协同

### B1. 多人协同编辑 CRDT（★★★★★）
- **画像**：多人同时编辑文档/表格/白板而不冲突
- **核心技术**：为什么需要 OT/CRDT（last-write-win 会互相覆盖）；Yjs 核心结构（Y.Doc / Y.Text / 更新编码可合并）；awareness（他人光标/在线状态）；编辑器绑定（y-prosemirror / y-monaco）；离线 edits 合并；持久化（y-indexeddb）；服务端（y-websocket / Liveblocks / PartyKit）
- **代表**：Figma、Notion、Linear
- **入手**：两个浏览器 Tab 用 y-websocket 协同编辑一段富文本 + 显示对方光标

### B2. IM / 长会话列表（★★★★☆）
- **画像**：Slack/Discord/钉钉式聊天
- **核心技术**：两级列表虚拟化（会话列表 + 消息流，动态高度 + 测量缓存）；消息顺序（服务端 seq 排序、本地乐观消息）；**向上翻页补洞去重**；已读回执/未读数；引用回复树、@提及自动补全、表情反应聚合；图片视频懒加载与预览；撤回/编辑 diff；草稿本地持久化
- **入手**：做一个 WebSocket 聊天室：虚拟化 + 乐观发送 + 撤回 + 引用回复

### B3. 音视频 / 直播（★★★★☆）
- **画像**：视频会议、直播、在线教育、云剪辑
- **核心技术**：播放器（hls.js：清晰度切换/seek 精度/预加载策略）；WebRTC 1v1 全流程（信令服务器/SDP/STUN/TURN/P2P）→ 多人 SFU 架构概念；设备管理（摄像头/麦克风/屏幕共享）；MediaRecorder 录制；WebCodecs 帧级处理（云剪辑）；Web Audio 声浪可视化（AnalyserNode）
- **入手**：先做 hls.js 播放器（倍速/截图/缓冲进度），再做 WebRTC 1v1 通话

---

## C. 图形与可视化

### C1. 大数据可视化（★★★★☆）
- **核心技术**：**渲染分级选型**（SVG <1k 元素 / Canvas2D 1w~10w / WebGL 100w+）；D3 核心思想（比例尺/数据连接 enter-update-exit，而非图表库）；deck.gl 大数据图层；**降采样算法（LTTB）**与聚合（热力/hexbin）；tooltip 拾取（颜色编码拾取/空间索引）；图表联动
- **入手**：Canvas 渲染 10 万散点 + 框选缩放，Profiling 对比 SVG 版本

### C2. 地图 GIS（★★★★☆）
- **核心技术**：MapLibre/Mapbox GL（矢量瓦片原理）；**坐标系坑（WGS84 vs GCJ02 火星坐标）**；海量点（worker 端点聚合）；轨迹绘制与回放动画；行政区划下钻（GeoJSON）；空间计算（点在多边形内）；与大屏联动（见前进阶大纲第 4 章）
- **代表**：物流、出行、数据大屏
- **入手**：做一个"海量点聚合 + 行政区下钻 + 轨迹回放"的地图页

### C3. 3D / 数字孪生（★★★★★）
- **核心技术**：three.js 基础（场景/相机/材质/光照/射线拾取 Raycaster）；**react-three-fiber 声明式 3D + drei 生态**；模型管线（GLTF + Draco/meshopt 压缩）；性能（Instancing 合并渲染、LOD）；shader 入门；模型与数据联动（设备状态着色）
- **代表**：数字孪生大屏、3D 商品展示、互动营销
- **入手**：r3f 加载一个 GLTF 楼宇模型，点击房间高亮并弹出信息面板

### C4. 高阶动画体系（★★★☆☆）
- **核心技术**：FLIP 技术与共享元素过渡；**View Transitions API**（跨路由共享元素，浏览器原生）；scroll-driven animations（CSS scroll-timeline）；spring 物理动画（framer-motion 深入：layout/gesture）；微交互设计系统（token 化时长/缓动）；大列表动画（AnimatePresence 退出）
- **入手**：给相册列表做"点开大图共享元素过渡 + 布局排序 FLIP"

---

## D. 大型应用架构

### D1. 插件化架构（★★★★☆）
- **画像**：VSCode/Grafana 式"宿主 + 扩展"，你的低代码平台的下一步
- **核心技术**：注册表的进阶——**contribution points 声明式扩展点**；宿主 API 暴露与能力权限（插件只能用授权的 API）；生命周期钩子；插件动态加载（CDN ESM / 动态 import）；插件隔离与失败降级；插件市场与版本兼容（对应协议版本迁移）
- **入手**：给第 6 章低代码平台做插件系统：第三方可注册新物料与新面板

### D2. 微前端（★★★☆☆ 概念多、踩坑多）
- **核心技术**：qiankun（proxy JS 沙箱、样式隔离）、wujie（iframe + WebComponent）、Module Federation（运行时共享依赖）；路由分发、应用通信（事件总线/共享 store）、公共依赖治理、部署独立；**反向知识：什么时候不该用微前端**（monorepo + 路由分包够就别上）
- **入手**：主应用 + 两个子应用（React/Vue 各一），打通路由/通信/共享依赖

### D3. 嵌入式第三方 Widget（★★★☆☆）
- **画像**：Intercom 客服气泡、Stripe 支付按钮
- **核心技术**：`<script>` 注入与渐进初始化；Shadow DOM 样式隔离；**postMessage 协议设计（origin 白名单、握手、token 流转）**；多实例管理；宿主页样式变量注入（主题定制）；弱网/宿主异常降级
- **入手**：做一个可嵌任意网站的聊天挂件 npm 包

### D4. 浏览器内构建与运行（★★★★★）——在线 IDE 的底座
- **画像**：CodeSandbox/StackBlitz 原理
- **核心技术**：sandpack（CodeSandbox 开源方案）；WebContainers（浏览器里跑 Node）；esbuild-wasm 编译；import maps；虚拟文件系统；iframe 沙箱预览与错误透传（衔接你第 6 章的"安全执行用户 JS"）
- **入手**：用 sandpack 做一个"组件文档实时 playground"，反哺组件库 Storybook

### D5. 桌面端（★★★☆☆）
- **核心技术**：Electron（主/渲染进程、contextBridge 安全 IPC、自动更新、多窗口）vs Tauri（Rust 后端、体积小、系统能力）；React 复用（与 Web 共享 monorepo 代码）；托盘/全局快捷键/通知/文件关联
- **入手**：把你的低代码平台包成桌面 App（Tauri 优先，体验现代打包链）

### D6. 浏览器扩展（★★★☆☆）
- **核心技术**：Manifest V3；content script 的隔离世界/主世界注入；background service worker；消息通信（content ↔ background ↔ popup）；跨域权限与存储；与页面 React 应用的共存（shadow DOM 注入 UI）
- **入手**：做一个"划词翻译 + 页面标注"扩展

---

## E. 极端性能与离线

### E1. 百万级数据渲染（★★★★☆）——面试硬通货
- **核心技术**：虚拟滚动自研（定高→动高→测量缓存与 scrollTop 校正）；Canvas 自绘表格/列表（自绘文本、滚动合成）；**Web Workers 任务拆分**（排序/过滤/聚合下沉，transferable 零拷贝、Comlink RPC）；OffscreenCanvas；长任务切片（scheduler.yield、rAF 分帧）；INP/LCP 治理实战；**内存泄漏排查**（heap snapshot、Detached DOM、监听器/echarts 实例未清理）
- **入手**：10 万行 × 20 列数据：搜索/排序/多选/行内编辑全部不卡（DOM 虚拟化一版 + Canvas 一版对比）

### E2. 离线优先 / Local-first（★★★★☆）
- **画像**：Notion/Linear 式"断网可用、多端一致"
- **核心技术**：Service Worker 缓存策略矩阵（Workbox：precache/runtime/SWR）；IndexedDB（事务、索引，Dexie）；后台同步与冲突解决（LWW → CRDT）；乐观 UI + 断网队列重放；数据层选型（RxDB/ElectricSQL/PowerSync 认知即可）
- **入手**：给 IM 或 Todo 做离线可用：断网操作入队，恢复后重放合并

---

## F. AI 原生前端（当下最热，且与你的 Schema 线天然衔接）

### F1. 流式对话 / 生成式 UI（★★★☆☆ 入门，做好极难）
- **核心技术**：
  - 流式：fetch ReadableStream / SSE / Vercel AI SDK（useChat 抽象）；**流式 Markdown 的"未闭合代码块"渲染坑**（增量解析/分段渲染）；打字机与平滑滚动；中断（AbortController）/重新生成/编辑重发；token 速度与用量展示
  - 长会话性能：消息流虚拟化（动态高度）、可视区外 markdown 不渲染、图片/代码块懒渲染
  - **生成式 UI：LLM 结构化输出（JSON Schema 约束）→ 动态组件渲染**——本质就是你进阶大纲的 schema 渲染器，直接复用！
  - 工具调用/思考过程可视化（步骤折叠、状态流转、失败重试）；RAG 引用溯源（高亮跳转）；敏感内容遮罩
- **代表**：ChatGPT、Claude、Dify、Coze
- **入手**：做一个支持流式渲染/中断重发/工具调用折叠的聊天界面，再加一个"LLM 输出 schema → 页面实时渲染"的生成式 UI demo

### F2. Agent 工作流画布（★★★★☆）
- **画像**：Dify/Coze 的编排页 = A4 节点画布 + 你的低代码 Setter
- **核心技术**：React Flow 节点编排 + 节点运行态流式更新（高频 setNode 的性能合并）、调试面板（单节点输入输出）、版本对比（monaco diff 复用）
- **入手**：接 F1 的项目：画布编排"搜索→总结→生成"三步，运行时节点实时高亮

---

## G. 交互底座：复杂交互组件自研（★★★☆☆，性价比最高）

造轮子是理解生态的最快路径，也是面试硬通货：
1. **浮层/定位引擎**（floating-ui 原理）：定位计算、flip/shift 防溢出、层级与遮挡治理、Portal
2. **Command Palette（Cmd+K）**：模糊搜索、分组、键盘导航、最近使用
3. **虚拟滚动自研**：定高 → 动高 → 横向/表格二维
4. **无障碍复杂组件**：ARIA 1.2 的 Combobox/Tree 模式、焦点管理（roving tabindex）、屏幕阅读器走查
5. **无限层级树**：大数据量 + 拖拽换父 + 虚拟化（react-arborist 源码）

---

## 怎么选：按职业方向匹配

| 你的方向 | 首选深扎 | 组合技 | 对应能力栈 |
|---|---|---|---|
| 文档/协同产品 | 富文本(A1) + 协同(B1) + 表格(A2) | Notion/飞书能力栈（壁垒最高） | |
| BI / 数据智能 | 大数据可视化(C1) + GIS(C2) + 前一份大盘 | 数据大屏/BI 全链路 | |
| AI 应用（当前风口） | AI 前端(F1/F2) + E1 性能 + 前一份 schema 渲染 | 生成式 UI 本质 = schema 渲染器 | |
| 音视频/社交 | 音视频(B3) + IM(B2) + WebRTC | RTC 场景专家 | |
| 前端基建/平台 | 插件化(D1) + 微前端(D2) + 在线 IDE(D4) + E1 | 大厂平台组方向 | |
| 独立开发/全栈 | 桌面端(D5) + Local-first(E2) + 扩展(D6) | 产品交付闭环 | |

## 给 React 开发者的三个"最值钱"建议

1. **AI 原生前端（F 族）**：需求爆发期，且"生成式 UI"与你的 schema 渲染器一脉相通——同一条内核两种应用，学习成本最低、溢价最高。
2. **富文本 + 协同（A1+B1）**：壁垒最高、越老越值钱，但学习曲线陡，适合作为 6 个月以上的长线。
3. **交互组件自研（G 族）**：性价比打底，2–3 周完成，直接提升你所有项目的质量与面试深度。

## 与前两份大纲的衔接（内核复用）

- 生成式 UI（F1）＝ schema 渲染器（进阶大纲 §1.3/§2）
- Agent 画布（F2）＝ 节点编排（A4）+ Setter 体系（进阶大纲 §3）
- 在线 IDE（D4）＝ JSON 编辑器（进阶大纲 §5）+ 安全沙箱（进阶大纲 §6.7）
- 插件化（D1）＝ 注册表模式（进阶大纲 §1.2）的架构级放大
- 协同（B1）＝ Undo/Redo 补丁思想的分布式延伸（进阶大纲 §1.5）
