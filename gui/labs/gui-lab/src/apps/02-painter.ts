// 02 绘制层：Painter API + 显示列表 + raylib 后端
// 对应分册：《02-第二阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/02-painter.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=3 MINI_GUI_SHOT=shot02.png npx scriptc-raylib run src/apps/02-painter.ts --dev
import {
  RAYWHITE,
  beginDrawing,
  clearBackground,
  closeWindow,
  endDrawing,
  genImageChecked,
  getFrameTime,
  initWindow,
  loadTextureFromImage,
  setTargetFPS,
  takeScreenshot,
  unloadImage,
  windowShouldClose,
} from "scriptc-raylib";
import { envNumber } from "../core/config";
import { rgba } from "../core/color";
import { sin } from "../core/math";
import { DisplayList, StatefulPainter } from "../core/painter";
import { RaylibBackend } from "../platform/raylib-backend";
import { buildCardScene } from "../scenes/card-scene";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 02 painter");
setTargetFPS(targetFps);

const backend = new RaylibBackend();

// 程序化生成 64x64 棋盘格纹理（不往仓库放二进制素材）
const img = genImageChecked(64, 64, 4, 4, rgba(46, 124, 246), rgba(238, 241, 245));
const tex = loadTextureFromImage(img);
unloadImage(img);
const checkerTex = backend.registerTexture(tex, { width: 64, height: 64 });

// 「记录」与「重放」是两个独立环节：先在显示列表里攒命令，再交给后端执行
const displayList = new DisplayList();
const scene = new StatefulPainter(displayList);

let frames = 0;
let elapsed = 0;
let lastEmitted = 0;
let lastCulled = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  // ---- 1. 记录：场景 → 显示列表（发生在 beginDrawing 之前）----
  displayList.clear();
  scene.culled = 0; // 统计按帧清零
  const scroll = ((sin(elapsed * 0.8) + 1) / 2) * (12 * 36 - 220);
  buildCardScene(scene, { scrollY: scroll, texture: checkerTex }, WIDTH, HEIGHT);
  lastEmitted = displayList.commands.length;
  lastCulled = scene.culled;

  // ---- 2. 重放：显示列表 → raylib 后端（scissor 只在裁剪变化时切换）----
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
  `[02-painter] frames=${frames} elapsed=${elapsed.toFixed(2)}s ` +
    `lastFrame: commands=${lastEmitted} culled=${lastCulled} ` +
    `clipSwitches=${displayList.clipSwitches()} backendScissorSwitches=${backend.scissorSwitches}`,
);
