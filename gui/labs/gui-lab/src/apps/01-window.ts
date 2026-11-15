// 01 第一个窗口：帧循环 + delta time + 输入轮询
// 对应分册：《01-第一阶段/06-第一个窗口与帧循环.md》
//
// 运行（交互）：npx scriptc-raylib run src/apps/01-window.ts --dev
// 运行（回归）：MINI_GUI_SECONDS=2 npx scriptc-raylib run src/apps/01-window.ts --dev
//   MINI_GUI_SECONDS  累计时间到达后自动退出并打印统计（不设 = 一直跑到关窗）
//   MINI_GUI_FPS      目标帧率（默认 60），用来做「帧率无关」对照实验
//   MINI_GUI_SHOT     退出前把最后一帧存成 PNG（文件名，如 shot.png）
//
// 注意：raylib 默认字体只有拉丁字形，屏幕文字一律用 ASCII；中文要等第三阶段加载字体。
import {
  BLACK,
  DARKGRAY,
  GOLD,
  KEY_A,
  KEY_D,
  KEY_S,
  KEY_W,
  LIME,
  MAROON,
  MOUSE_BUTTON_LEFT,
  RAYWHITE,
  SKYBLUE,
  beginDrawing,
  clearBackground,
  closeWindow,
  drawCircle,
  drawCircleLines,
  drawLine,
  drawRectangle,
  drawText,
  endDrawing,
  getFPS,
  getFrameTime,
  getKeyPressed,
  getMousePosition,
  initWindow,
  isKeyDown,
  isMouseButtonDown,
  isMouseButtonPressed,
  setTargetFPS,
  takeScreenshot,
  windowShouldClose,
} from "scriptc-raylib";
import { envNumber, pingPong } from "../core/config";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

// 两种驱动方式的对照：
//   delta 驱动：速度以「像素/秒」定义，位移 = 速度 × 本帧耗时
//   逐帧驱动：速度以「像素/帧」定义，位移与帧率绑死（反例）
const SPEED_PX_PER_SEC = 120;
const STEP_PX_PER_FRAME = 2; // 只有恰好 60fps 时才等价于 120 px/s

const TRACK_LEFT = 60;
const TRACK_LEN = WIDTH - 120;

initWindow(WIDTH, HEIGHT, "mini-gui 01 window");
setTargetFPS(targetFps);

let frames = 0;
let elapsed = 0;
let deltaDistance = 0;
let frameDistance = 0;
let maxDt = 0;

let playerX = WIDTH / 2;
let playerY = 330;
let clicks = 0;
let lastKey = 0;

while (!windowShouldClose()) {
  // ---- 1. 时间 ----
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;
  if (dt > maxDt) maxDt = dt;

  // ---- 2. 输入（轮询：每帧主动去问「现在是什么状态」）----
  const mouse = getMousePosition();
  const leftDown = isMouseButtonDown(MOUSE_BUTTON_LEFT);
  if (isMouseButtonPressed(MOUSE_BUTTON_LEFT)) clicks += 1;
  const key = getKeyPressed();
  if (key !== 0) lastKey = key;

  // ---- 3. 更新 ----
  deltaDistance += SPEED_PX_PER_SEC * dt;
  frameDistance += STEP_PX_PER_FRAME;

  const move = 200 * dt;
  if (isKeyDown(KEY_A)) playerX -= move;
  if (isKeyDown(KEY_D)) playerX += move;
  if (isKeyDown(KEY_W)) playerY -= move;
  if (isKeyDown(KEY_S)) playerY += move;

  // ---- 4. 绘制 ----
  beginDrawing();
  clearBackground(RAYWHITE);

  drawText("delta-driven (px/s)", TRACK_LEFT, 70, 20, DARKGRAY);
  drawLine(TRACK_LEFT, 120, TRACK_LEFT + TRACK_LEN, 120, DARKGRAY);
  drawCircle(pingPong(deltaDistance, TRACK_LEFT, TRACK_LEN), 120, 14, SKYBLUE);

  drawText("frame-driven (px/frame)", TRACK_LEFT, 160, 20, DARKGRAY);
  drawLine(TRACK_LEFT, 210, TRACK_LEFT + TRACK_LEN, 210, DARKGRAY);
  drawCircle(pingPong(frameDistance, TRACK_LEFT, TRACK_LEN), 210, 14, MAROON);

  // WASD 控制的方块
  drawRectangle(playerX - 16, playerY - 16, 32, 32, LIME);

  // 鼠标反馈：十字线 + 按下高亮
  drawLine(mouse.x, 0, mouse.x, HEIGHT, GOLD);
  drawLine(0, mouse.y, WIDTH, mouse.y, GOLD);
  if (leftDown) {
    drawCircle(mouse.x, mouse.y, 18, GOLD);
  } else {
    drawCircleLines(mouse.x, mouse.y, 18, GOLD);
  }

  drawText(
    `fps ${getFPS()}   dt ${(dt * 1000).toFixed(2)} ms   frame ${frames}`,
    16,
    16,
    20,
    BLACK,
  );
  drawText(`clicks ${clicks}   lastKey ${lastKey}   WASD to move`, 16, HEIGHT - 32, 20, BLACK);

  endDrawing();

  if (exitAfterSeconds > 0 && elapsed >= exitAfterSeconds) break;
}

// 截图必须在 endDrawing() 之后：绘制调用只是往批里攒顶点，endDrawing 才提交。
// 在它之前截图只能拍到 clearBackground 的清屏色（实测踩过）。
if (shotPath !== undefined) takeScreenshot(shotPath);
closeWindow();

// 回归输出：同样的 2 秒，换帧率后 delta 路程应该几乎不变，逐帧路程按帧数成倍变化
console.log(
  `[01-window] targetFps=${targetFps} frames=${frames} elapsed=${elapsed.toFixed(3)}s ` +
    `avgFps=${(frames / elapsed).toFixed(1)} maxDt=${(maxDt * 1000).toFixed(2)}ms`,
);
console.log(
  `[01-window] deltaDistance=${deltaDistance.toFixed(1)}px frameDistance=${frameDistance.toFixed(1)}px`,
);
