// 05 事件与交互：事件总线 + 命中 + 手势 + 焦点 + 滚动
// 对应分册：《05-第五阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/05-events.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=3 MINI_GUI_SHOT=shot05.png npx scriptc-raylib run src/apps/05-events.ts --dev
//
// 操作：点击按钮计数；hover 变色；Tab 切换焦点（焦点环）；列表区滚轮（带惯性）
import {
  RAYWHITE,
  beginDrawing,
  clearBackground,
  closeWindow,
  endDrawing,
  getFrameTime,
  initWindow,
  setTargetFPS,
  takeScreenshot,
  windowShouldClose,
} from "scriptc-raylib";
import { envNumber } from "../core/config";
import { DisplayList, StatefulPainter } from "../core/painter";
import { EventDispatcher } from "../core/events/dispatcher";
import { GestureController } from "../core/events/gestures";
import { FocusManager } from "../core/events/focus";
import { RaylibBackend } from "../platform/raylib-backend";
import { RaylibEventSource } from "../platform/raylib-events";
import { RaylibMeasurer } from "../platform/raylib-measurer";
import { loadUiFont } from "../platform/font";
import { buildInteractiveScene } from "../scenes/interactive-scene";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 05 events");
setTargetFPS(targetFps);

const backend = new RaylibBackend();
const measurer = new RaylibMeasurer();
const uiFont = loadUiFont();
backend.setFont(uiFont.font);
measurer.switchFont(uiFont.font);
const events = new RaylibEventSource();
const dispatcher = new EventDispatcher();
dispatcher.gestures = new GestureController();
const focus = new FocusManager();

const scene = buildInteractiveScene(measurer, 16, { width: WIDTH, height: HEIGHT });
dispatcher.mount(scene.root);
focus.mount(scene.root);

const displayList = new DisplayList();
const painter = new StatefulPainter(displayList);

let frames = 0;
let elapsed = 0;
let lastCmdCount = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  // ---- 1. 输入轮询 → 规范事件 → 分发（指针/滚轮）或焦点路由（键盘）----
  for (const ev of events.poll()) {
    if (ev.kind === "key") {
      focus.dispatchKey(ev);
    } else {
      dispatcher.dispatch(ev);
    }
  }
  scene.scroll.update(dt); // 惯性推进

  // ---- 2. 布局（脏才排）+ 焦点态同步到按钮 ----
  scene.owner.flushLayout();
  for (const b of scene.buttons) {
    b.focused = focus.focused === b;
  }

  // ---- 3. 绘制 ----
  displayList.clear();
  scene.root.paint(painter);
  lastCmdCount = displayList.commands.length;

  beginDrawing();
  clearBackground(RAYWHITE);
  displayList.replay(backend);
  backend.endFrame();
  endDrawing();

  if (exitAfterSeconds > 0 && elapsed >= exitAfterSeconds) break;
}

if (shotPath !== undefined) takeScreenshot(shotPath);
closeWindow();

console.log(
  `[05-events] frames=${frames} elapsed=${elapsed.toFixed(2)}s clicks=${scene.clicks.value} ` +
    `scrollY=${scene.scroll.scrollY.toFixed(1)} focusLog=[${focus.log.slice(-3).join(",")}] ` +
    `lastFrameCommands=${lastCmdCount}`,
);
