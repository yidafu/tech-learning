# mini-gui：贯穿 gui 课程的自研 GUI 框架 lab

TypeScript（ScriptC 0.0.35 + scriptc-raylib 1.0.4 + raylib 6.0）写的教学 GUI 框架——`gui/docs/` 八个阶段与 09 布局专题的每册分册都以本 lab 的真实源码与实跑数据为地基。**每个机制结论都能下钻到「册 → 源码行号 → 实测数字」三级。**

## 目录地图

```text
src/core/
  painter.ts / displaylist      Painter 契约 + 命令自包含（可重放/可缓存）——第二阶段
  text/                         度量、贪心断行、光标几何（offsetToX/xToOffset）——第三阶段
  render/
    constraints.ts              BoxConstraints 哨兵双表示（Infinity 与 MAX_SAFE_INTEGER）
    render-object.ts            渲染树基类：布局协议（约束下/尺寸上/位置归父）+ paint/paintInto 拆分
    flex.ts / flow.ts / grid.ts / constraint.ts / stack.ts   五种布局器（09 专题三引擎在此）
    owner.ts / pipeline.test    flushLayout/flushPaint/欠活清单/图层 blit——第六阶段
    scroll.ts / layout-widgets  ScrollView、边界盒等
  events/                       轮询事件源、命中链、手势状态机、FocusManager——第五阶段
  reactive/                     signals（读时收集/写时调度/惰性 computed）+ vdom（keyed 协调）——第七阶段
  widgets/                      TextField、RenderVirtualList（池化）——第八阶段
  pixel-probe.ts                无头像素断言（DisplayList 上虚拟取色）——第八阶段
  animation.ts                  AnimatedValue（tick 返回值即到点信号）——第六阶段
  config.ts                     环境开关（MINI_GUI_*）
src/scenes/                     各阶段集成场景（每场景带 *.test.ts）
src/apps/                       demo01~08 的窗口入口（每阶段一个）
src/platform/                   raylib backend/measurer/events + 字体加载（平台层，内核零平台分支）
```

## 常用命令

```bash
npm run test          # 全库 vitest：26 文件 204 断言（2026-11-14 口径）
npm run typecheck     # tsc --noEmit
npm run dev           # demo01；换 demo：scriptc-raylib run src/apps/08-widgets.ts --dev

# 环境开关四件套（demo 全家共享）
MINI_GUI_SECONDS=2 MINI_GUI_SHOT=shot08.png MINI_GUI_FPS=60 npx scriptc-raylib run src/apps/08-widgets.ts --dev
```

无头压测/诊断脚本（06 册性能度量、附录 A 压测骨架）：`/private/tmp/mini-gui-bench/` 下 bench.ts / segments.ts / diag.ts——import 必须绝对路径，replay 的对象是 DisplayList。

## 测试方法（四层塔，详见 docs/08-第八阶段/05-测试方法）

- **L1 纯单元**：布局手算断言（黄金用例：手算值写死为字面量）、信号传播、曲线值
- **L2 无头集成**：mount + frame 后查失效账（repaintedNodes/图层命令）
- **L3 像素探针**：`pixelAt/regionHasColor`——视觉直觉可断言化（文本不判定、零高几何测不出，能力边界见册）
- **L4 窗口实跑**：真渲染真输入真截图——「无头全绿 ≠ 完成」的最终防线（demo08 六缺陷里五个只有这一层能抓）

## 已知边界（诚实账本）

- 输入仅 ASCII 可达；CJK 走系统输入法但无 preedit 态（IME 边界，02 册 §6）
- 文本无 shaping（连字/双向/emoji 序列不支持）
- 单进程单窗口；blit 是命令拷贝非真合成（06 册诚实账本）
- ScriptC：能编译 ≠ 能跑（槽位返回型运行期校验）——交付前必须真跑窗口

## 实测签名数字（本机 macOS arm64，2026-11-14）

| 数字 | 值 | 出处 |
|---|---|---|
| idle 帧 | 0.014ms | 06 册 |
| 单叶变更 p95 | 0.074ms（边界粒度 2×） | 06 册 |
| 合并失效 | ≈120× | 06 册 |
| 分段账 | layout 0.009 / paint 0.047 / replay(2001 条) 0.016ms | 06 册 |
| demo08 稳态 | frames=115 liveRows=8 repainted=0 passes=frames+1 | 08 册 |
