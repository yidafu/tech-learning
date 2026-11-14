// 06 渲染管线与调度：脏标记 + 重绘边界图层合成 + 动画 + 帧统计 HUD
// 对应分册：《06-第六阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/06-pipeline.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=3 MINI_GUI_SHOT=shot06.png npx scriptc-raylib run src/apps/06-pipeline.ts --dev
import {
  RAYWHITE,
  beginDrawing,
  clearBackground,
  closeWindow,
  endDrawing,
  getFPS,
  getFrameTime,
  initWindow,
  setTargetFPS,
  takeScreenshot,
  windowShouldClose,
} from "scriptc-raylib";
import { envNumber } from "../core/config";
import { RaylibBackend } from "../platform/raylib-backend";
import { RaylibMeasurer } from "../platform/raylib-measurer";
import { loadUiFont } from "../platform/font";
import { buildAnimScene } from "../scenes/anim-scene";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 06 pipeline");
setTargetFPS(targetFps);

const backend = new RaylibBackend();
const measurer = new RaylibMeasurer();
const uiFont = loadUiFont();
backend.setFont(uiFont.font);
measurer.switchFont(uiFont.font);
const scene = buildAnimScene(measurer, 16, { width: WIDTH, height: HEIGHT });

let frames = 0;
let elapsed = 0;
let lastRepainted = 0;
let lastCommands = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  lastRepainted = scene.frame(dt, `fps ${getFPS()}  repainted ${lastRepainted}  cmds ${lastCommands}`);
  const rootLayer = scene.root.layer;
  if (rootLayer !== null) lastCommands = rootLayer.commands.length;

  beginDrawing();
  clearBackground(RAYWHITE);
  // 帧呈现：根图层（局部坐标 = 窗口坐标，根在原点）整段重放到后端
  if (rootLayer !== null) rootLayer.replay(backend);
  backend.endFrame();
  endDrawing();

  if (exitAfterSeconds > 0 && elapsed >= exitAfterSeconds) break;
}

if (shotPath !== undefined) takeScreenshot(shotPath);
closeWindow();

console.log(
  `[06-pipeline] frames=${frames} elapsed=${elapsed.toFixed(2)}s lastRepainted=${lastRepainted} ` +
    `lastCommands=${lastCommands} layoutPasses=${scene.owner.layoutPasses} paintPasses=${scene.owner.paintPasses}`,
);
