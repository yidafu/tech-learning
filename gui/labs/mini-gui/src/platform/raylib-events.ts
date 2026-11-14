// raylib 事件源：把轮询 API 翻译成规范化 UiEvent。
// 轮询 → 边沿的翻译规则（第五阶段《02-输入抽象》）：
//   move    坐标变化即发（每帧最多一条）
//   down/up isMouseButtonPressed/Released 就是「本帧边沿」
//   wheel   getMouseWheelMove() != 0；raylib 正值 = 远离用户（上滚），协议 dy 向下为正 → 取负
//   key     getKeyPressed() 队列取到 0 为止（仅 down；up/repeat 本版不做，见分册取舍）
import {
  KEY_LEFT_ALT,
  KEY_LEFT_CONTROL,
  KEY_LEFT_SHIFT,
  KEY_RIGHT_SHIFT,
  MOUSE_BUTTON_LEFT,
  getKeyPressed,
  getMousePosition,
  getMouseWheelMove,
  getTime,
  isKeyDown,
  isMouseButtonPressed,
  isMouseButtonReleased,
} from "scriptc-raylib";
import {
  EventSource,
  type KeyEvent,
  type UiEvent,
} from "../core/events/events";

export class RaylibEventSource extends EventSource {
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  poll(): UiEvent[] {
    const out: UiEvent[] = [];
    const t = getTime();
    const mods = {
      shift: isKeyDown(KEY_LEFT_SHIFT) || isKeyDown(KEY_RIGHT_SHIFT),
      ctrl: isKeyDown(KEY_LEFT_CONTROL),
      alt: isKeyDown(KEY_LEFT_ALT),
    };

    const m = getMousePosition();
    if (m.x !== this.lastX || m.y !== this.lastY) {
      this.lastX = m.x;
      this.lastY = m.y;
      out.push({ kind: "pointer", phase: 1, x: m.x, y: m.y, button: 0, time: t, modifiers: mods });
    }
    if (isMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
      out.push({ kind: "pointer", phase: 0, x: m.x, y: m.y, button: 0, time: t, modifiers: mods });
    }
    if (isMouseButtonReleased(MOUSE_BUTTON_LEFT)) {
      out.push({ kind: "pointer", phase: 2, x: m.x, y: m.y, button: 0, time: t, modifiers: mods });
    }
    const wheel = getMouseWheelMove();
    if (wheel !== 0) {
      out.push({ kind: "wheel", x: m.x, y: m.y, dx: 0, dy: -wheel, time: t });
    }
    // 键盘：本帧按下的键全部入列（0 = 空）
    let code = getKeyPressed();
    let guard = 0;
    while (code !== 0 && guard < 16) {
      const ev: KeyEvent = { kind: "key", phase: 0, code, time: t, modifiers: mods };
      out.push(ev);
      code = getKeyPressed();
      guard += 1;
    }
    return out;
  }
}
