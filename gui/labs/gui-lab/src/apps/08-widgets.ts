// 08 毕业控件：TextField 完整键盘编辑 + 万行虚拟列表（只挂可见池行）。
// 对应分册：《08-第八阶段》02（控件库）03（虚拟列表）05（测试方法）
//
// 运行（交互）：npx scriptc-raylib run src/apps/08-widgets.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=2 MINI_GUI_SHOT=shot08.png npx scriptc-raylib run src/apps/08-widgets.ts --dev
//
// 操作：点击文本框聚焦 → 全键盘编辑（字符/Backspace/Delete/←→/Home/End/Enter）
//       滚轮在列表上滚动（万级行只挂可见池行；HUD liveRows 恒定）
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
import { EventDispatcher } from "../core/events/dispatcher";
import { GestureController } from "../core/events/gestures";
import { FocusManager } from "../core/events/focus";
import { RaylibBackend } from "../platform/raylib-backend";
import { RaylibEventSource } from "../platform/raylib-events";
import { RaylibMeasurer } from "../platform/raylib-measurer";
import { loadUiFont } from "../platform/font";
import { buildWidgetsScene } from "../scenes/widgets-scene";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 08 widgets");
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

const scene = buildWidgetsScene(measurer, 16, { width: WIDTH, height: HEIGHT }, 10000);
dispatcher.mount(scene.root);
focus.mount(scene.root);
focus.focusNode(scene.field); // 默认焦点在输入框（键盘可完整操作的演示前提）

let frames = 0;
let elapsed = 0;
let lastRepainted = 0;
let lastLiveRows = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  // 输入 → 键盘走焦点（TextField 编辑），指针走手势/滚动
  for (const ev of events.poll()) {
    if (ev.kind === "key") focus.dispatchKey(ev);
    else dispatcher.dispatch(ev);
  }

  scene.list.update(dt); // 虚拟列表惯性推进
  scene.owner.frame();   // 布局 + 绘制（池行重绑、失效消化）
  const rootLayer = scene.root.layer;
  lastRepainted = scene.owner.repaintedNodes;
  if (rootLayer !== null) lastLiveRows = scene.list.liveRows;

  beginDrawing();
  clearBackground(RAYWHITE);
  if (rootLayer !== null) rootLayer.replay(backend);
  backend.endFrame();
  endDrawing();

  if (exitAfterSeconds > 0 && elapsed >= exitAfterSeconds) break;
}

if (shotPath !== undefined) takeScreenshot(shotPath);
closeWindow();

console.log(
  `[08-widgets] frames=${frames} elapsed=${elapsed.toFixed(2)}s repainted=${lastRepainted} ` +
    `liveRows=${lastLiveRows} layoutPasses=${scene.owner.layoutPasses} paintPasses=${scene.owner.paintPasses}`,
);
