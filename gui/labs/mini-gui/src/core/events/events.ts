// 规范化事件类型：平台层（raylib 轮询）翻译成这些值对象，内核与控件只见它们。
// 第五阶段《02-输入抽象》的落点。

export const PointerPhase = {
  down: 0,
  move: 1,
  up: 2,
} as const;
export type PointerPhaseValue = (typeof PointerPhase)[keyof typeof PointerPhase];

export const KeyPhase = {
  down: 0,
  up: 1,
  repeat: 2,
} as const;
export type KeyPhaseValue = (typeof KeyPhase)[keyof typeof KeyPhase];

export interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

export interface PointerEvent {
  kind: "pointer";
  phase: PointerPhaseValue;
  /** 窗口逻辑坐标。 */
  x: number;
  y: number;
  button: number; // 0=左键
  time: number; // 秒（宿主时钟）
  modifiers: Modifiers;
}

export interface WheelEvent {
  kind: "wheel";
  x: number;
  y: number;
  /** 滚轮增量（行数为单位，向下为正）。 */
  dy: number;
  dx: number;
  time: number;
}

export interface KeyEvent {
  kind: "key";
  phase: KeyPhaseValue;
  /** 宿主键码（raylib KeyboardKey 数值）。 */
  code: number;
  time: number;
  modifiers: Modifiers;
}

export type UiEvent = PointerEvent | WheelEvent | KeyEvent;

export const NO_MODIFIERS: Modifiers = { shift: false, ctrl: false, alt: false };

/** 事件源抽象：每帧把宿主输入轮询翻译成规范化事件（平台实现见 platform/raylib-events.ts）。 */
export abstract class EventSource {
  /** 取走自上次调用以来的全部事件（可为空数组）。 */
  abstract poll(): UiEvent[];
}

/** 测试用合成事件源：预置事件队列逐帧吐出。 */
export class SyntheticEventSource extends EventSource {
  private queue: UiEvent[];
  private cursor = 0;

  constructor(events: UiEvent[]) {
    super();
    this.queue = events;
  }

  poll(): UiEvent[] {
    const out: UiEvent[] = [];
    while (this.cursor < this.queue.length) {
      out.push(this.queue[this.cursor] as UiEvent);
      this.cursor += 1;
    }
    return out;
  }
}

export function pointerEvent(phase: PointerPhaseValue, x: number, y: number, time: number, button = 0): PointerEvent {
  return { kind: "pointer", phase, x, y, button, time, modifiers: NO_MODIFIERS };
}

export function wheelEvent(x: number, y: number, dy: number, time: number): WheelEvent {
  return { kind: "wheel", x, y, dx: 0, dy, time };
}

export function keyEvent(phase: KeyPhaseValue, code: number, time: number): KeyEvent {
  return { kind: "key", phase, code, time, modifiers: NO_MODIFIERS };
}
