// 03 文本与排版：断行、富文本、省略号、光标几何（offsetToX / xToOffset 交互）
// 对应分册：《03-第三阶段/01-导览.md》全阶段
//
// 运行（交互）：npx scriptc-raylib run src/apps/03-text.ts --dev
// 回归 + 截图：
//   MINI_GUI_SECONDS=3 MINI_GUI_SHOT=shot03.png npx scriptc-raylib run src/apps/03-text.ts --dev
import {
  RAYWHITE,
  beginDrawing,
  clearBackground,
  closeWindow,
  endDrawing,
  getFrameTime,
  getMousePosition,
  initWindow,
  isMouseButtonPressed,
  MOUSE_BUTTON_LEFT,
  setTargetFPS,
  takeScreenshot,
  windowShouldClose,
} from "scriptc-raylib";
import { envNumber } from "../core/config";
import { PALETTE } from "../core/color";
import { rect } from "../core/geometry";
import { DisplayList, StatefulPainter } from "../core/painter";
import { layoutText, offsetToX, paintText, xToOffset } from "../core/text/text-layout";
import { RaylibBackend } from "../platform/raylib-backend";
import { RaylibMeasurer } from "../platform/raylib-measurer";
import { CJK_SAMPLE, loadUiFont } from "../platform/font";

const WIDTH = 800;
const HEIGHT = 450;

const targetFps = envNumber(process.env.MINI_GUI_FPS, 60);
const exitAfterSeconds = envNumber(process.env.MINI_GUI_SECONDS, 0);
const shotPath = process.env.MINI_GUI_SHOT;

initWindow(WIDTH, HEIGHT, "mini-gui 03 text");
setTargetFPS(targetFps);

const backend = new RaylibBackend();
const measurer = new RaylibMeasurer();

// 统一 UI 字体：全 ASCII + CJK 样本码点（首版只传样本码点，ASCII 标签丢字形——实测教训）
const uiFont = loadUiFont();
backend.setFont(uiFont.font);
measurer.switchFont(uiFont.font);
const cjkFontLoaded = uiFont.isSystemFont;

// ---- 排版对象（缓存：内容不变就只排一次）----
const PARAGRAPH =
  "The greedy line breaker packs chunks of text into lines; trailing spaces at " +
  "wrap points are dropped, and overlong words are split character by character.";
const wrapped = layoutText([{ text: PARAGRAPH }], { fontSize: 18, color: PALETTE.text, width: 360 }, measurer);
const ellipsized = layoutText([{ text: PARAGRAPH }], { fontSize: 16, color: PALETTE.textMuted, width: 360, maxLines: 2, overflow: "ellipsis" }, measurer);
const rich = layoutText(
  [
    { text: "rich ", color: PALETTE.text },
    { text: "spans", color: PALETTE.accent },
    { text: " share one ", color: PALETTE.text },
    { text: "line", color: PALETTE.ok },
    { text: " and wrap together", color: PALETTE.text },
  ],
  { fontSize: 18, color: PALETTE.text, width: 300 },
  measurer,
);
const cjk = cjkFontLoaded
  ? layoutText([{ text: CJK_SAMPLE }], { fontSize: 18, color: PALETTE.text, width: 360 }, measurer)
  : null;

// 光标交互行
const CARET_TEXT = "click to move the caret";
const caretLine = layoutText([{ text: CARET_TEXT }], { fontSize: 22, color: PALETTE.text }, measurer);
const CARET_X0 = 60;
const CARET_Y0 = 340;
const CARET_LINE_W = Math.ceil(caretLine.lines[0]?.width ?? 0);
let caretOffset = 0;

let frames = 0;
let elapsed = 0;

while (!windowShouldClose()) {
  const dt = getFrameTime();
  frames += 1;
  elapsed += dt;

  // 交互：点击文字把光标移到最近边界
  const mouse = getMousePosition();
  if (isMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
    caretOffset = xToOffset(caretLine, 0, mouse.x - CARET_X0, measurer);
  }

  const list = new DisplayList();
  const p = new StatefulPainter(list);

  p.fillRect(rect(0, 0, WIDTH, HEIGHT), PALETTE.bg);

  // 左列：wrap / ellipsis
  p.text("wrap (width 360)", 40, 24, 16, PALETTE.textMuted);
  paintText(p, wrapped, 40, 48);

  p.text("ellipsis (maxLines 2)", 40, 160, 16, PALETTE.textMuted);
  paintText(p, ellipsized, 40, 184);

  p.text("rich spans", 40, 250, 16, PALETTE.textMuted);
  paintText(p, rich, 40, 274);

  // 右列：CJK
  if (cjk !== null) {
    p.text("cjk wrap (width 360)", 440, 24, 16, PALETTE.textMuted);
    paintText(p, cjk, 440, 48);
  } else {
    p.text("cjk font not found on this host", 440, 24, 16, PALETTE.textMuted);
  }

  // 光标交互行
  p.fillRoundedRect(rect(CARET_X0 - 12, CARET_Y0 - 10, CARET_LINE_W + 24, 44), 8, PALETTE.surface);
  paintText(p, caretLine, CARET_X0, CARET_Y0);
  if (Math.floor(elapsed * 2) % 2 === 0) {
    const cx = CARET_X0 + offsetToX(caretLine, 0, caretOffset, measurer);
    p.fillRect(rect(cx, CARET_Y0, 2, 26), PALETTE.accent);
  }

  beginDrawing();
  clearBackground(RAYWHITE);
  list.replay(backend);
  backend.endFrame();
  endDrawing();

  if (exitAfterSeconds > 0 && elapsed >= exitAfterSeconds) break;
}

if (shotPath !== undefined) takeScreenshot(shotPath);
closeWindow();

const caretRoundtrip = xToOffset(caretLine, 0, offsetToX(caretLine, 0, caretOffset, measurer), measurer);
console.log(
  `[03-text] cjkFont=${cjkFontLoaded} wrappedLines=${wrapped.lines.length} ` +
    `ellipsisLines=${ellipsized.lines.length} richLines=${rich.lines.length} ` +
    `caretOffset=${caretOffset} roundtrip=${caretRoundtrip === caretOffset}`,
);
console.log(
  `[03-text] measure: raw=${measurer.rawMeasures} cacheHits=${measurer.cacheHits} ` +
    `hitRate=${((measurer.cacheHits / (measurer.cacheHits + measurer.rawMeasures)) * 100).toFixed(1)}%`,
);
