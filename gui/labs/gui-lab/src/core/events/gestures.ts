// 手势状态机：把指针事件流加工成 click / double-click / drag 三种手势。
// 状态：空闲 → 按下 →（位移超阈值）拖拽中 → 抬起；抬起时位移未超阈值 = 点击。
// 双击：同目标两次点击间隔 < doubleClickWindow（0.3s）。
import type { PointerEvent } from "./events";
import type { RenderObject } from "../render/render-object";

export interface GestureOptions {
  /** 点击判定的位移阈值（px）：按下到抬起位移不超过它才算点击。 */
  dragThreshold?: number;
  /** 双击窗口（秒）。 */
  doubleClickWindow?: number;
}

export class GestureController {
  dragThreshold: number;
  doubleClickWindow: number;

  /** 观测口：手势识别日志（测试断言「识别出了什么、发给谁」）。 */
  readonly log: string[] = [];

  private pressTarget: RenderObject | null = null;
  private pressX = 0;
  private pressY = 0;
  private pressTime = 0;
  private dragging = false;
  private lastClickTarget: RenderObject | null = null;
  private lastClickTime = -1;

  constructor(opts?: GestureOptions) {
    this.dragThreshold = opts?.dragThreshold ?? 6;
    this.doubleClickWindow = opts?.doubleClickWindow ?? 0.3;
  }

  /** 由 EventDispatcher 在指针事件命中后调用；chain[0] 是最深的命中节点。 */
  handle(ev: PointerEvent, chain: RenderObject[]): void {
    if (ev.phase === 0 /* down */) {
      const target = chain.length > 0 ? chain[0] ?? null : null;
      this.pressTarget = target;
      this.pressX = ev.x;
      this.pressY = ev.y;
      this.pressTime = ev.time;
      this.dragging = false;
      return;
    }

    if (ev.phase === 1 /* move */) {
      if (this.pressTarget === null || this.dragging) {
        if (this.dragging && this.pressTarget !== null) {
          this.pressTarget.onDragUpdate(ev);
        }
        return;
      }
      const dx = ev.x - this.pressX;
      const dy = ev.y - this.pressY;
      const dist = dx * dx + dy * dy;
      if (dist > this.dragThreshold * this.dragThreshold) {
        this.dragging = true;
        this.log.push("drag-start");
        this.pressTarget.onDragStart(ev);
      }
      return;
    }

    // up
    const target = this.pressTarget;
    this.pressTarget = null;
    if (target === null) return;
    if (this.dragging) {
      this.dragging = false;
      this.log.push("drag-end");
      target.onDragEnd(ev);
      return;
    }
    this.log.push("click");
    target.onClick(ev);
    if (
      this.lastClickTarget === target &&
      ev.time - this.lastClickTime < this.doubleClickWindow
    ) {
      this.log.push("double-click");
      target.onDoubleClick(ev);
      this.lastClickTarget = null; // 三连击从零计数
    } else {
      this.lastClickTarget = target;
      this.lastClickTime = ev.time;
    }
  }
}
