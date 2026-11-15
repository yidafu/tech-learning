// 04 控件树与布局：RenderObject 树 + 布局协议 + 组合场景
// 对应分册：《04-第四阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/04-layout.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=3 MINI_GUI_SHOT=shot04.png npx scriptc-raylib run src/apps/04-layout.ts --dev
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
import { PipelineOwner } from "../core/render/owner";
import { RaylibBackend } from "../platform/raylib-backend";
import { RaylibMeasurer } from "../platform/raylib-measurer";
import { loadUiFont } from "../platform/font";
import { buildPanelTree } from "../scenes/panel-tree";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 04 layout");
setTargetFPS(targetFps);

const backend = new RaylibBackend();
const measurer = new RaylibMeasurer();
const uiFont = loadUiFont();
backend.setFont(uiFont.font);
measurer.switchFont(uiFont.font);

// 建树 → mount → 每帧 flushLayout（不脏时零重排）→ paint 到显示列表 → 重放
const tree = buildPanelTree(measurer, 16);
const owner = new PipelineOwner();
owner.mount(tree, { width: WIDTH, height: HEIGHT }); // 生产语义：tight 根
owner.flushLayout();

const displayList = new DisplayList();
const painter = new StatefulPainter(displayList);

let frames = 0;
let elapsed = 0;
let lastCmdCount = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  owner.flushLayout(); // 无变化时全部命中布局缓存（totalPerformLayouts 不增长）
  displayList.clear();
  tree.paint(painter);
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
  `[04-layout] frames=${frames} elapsed=${elapsed.toFixed(2)}s layoutPasses=${owner.layoutPasses} ` +
    `totalPerformLayouts=${owner.totalPerformLayouts} lastFrameCommands=${lastCmdCount}`,
);
