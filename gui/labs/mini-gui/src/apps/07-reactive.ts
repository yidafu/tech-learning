// 07 声明式与响应式：signals 驱动的声明式 UI（计数/列表 keyed 协调/主题切换）
// 对应分册：《07-第七阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/07-reactive.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=2 MINI_GUI_SHOT=shot07.png npx scriptc-raylib run src/apps/07-reactive.ts --dev
//
// 操作：+/- 计数（细粒度更新）；add/remove/shuffle 触发 keyed 协调；theme 切换深浅色
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
import { buildReactiveScene } from "../scenes/reactive-scene";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 07 reactive");
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

const scene = buildReactiveScene(measurer, 16, { width: WIDTH, height: HEIGHT });
dispatcher.mount(scene.root);
focus.mount(scene.root);

let frames = 0;
let elapsed = 0;
let lastCommands = 0;
let lastWave = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  // 输入 → 事件 → 手势（按钮 onClick 内部 set 信号 → effects 同步波）
  for (const ev of events.poll()) {
    if (ev.kind === "key") focus.dispatchKey(ev);
    else dispatcher.dispatch(ev);
  }

  scene.owner.frame(); // 声明式波已把 VNode 变化 reconcile 进渲染树；这里跑布局+绘制
  const rootLayer = scene.root.layer;
  if (rootLayer !== null) lastCommands = rootLayer.commands.length;
  lastWave = scene.waves.value;

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
  `[07-reactive] frames=${frames} elapsed=${elapsed.toFixed(2)}s waves=${lastWave} ` +
    `layoutPasses=${scene.owner.layoutPasses} paintPasses=${scene.owner.paintPasses} lastCommands=${lastCommands}`,
);
