// 事件分发：命中 → 冒泡 → hover 差分 → 按压捕获。
// 分发顺序铁律：
//   pointer down  命中链自底向上（先最深）
//   pointer move  有按压时发给「按下时的目标」（捕获），否则命中链
//   pointer up    同捕获；同时驱动手势状态机
//   wheel         命中链上第一个挂了 onWheel 的节点（滚轮不冒泡穿透）
//   hover         每次指针位置变化后做链差分：旧的发 Leave，新的发 Enter
import { hitTest } from "./hit-test";
import type { PointerEvent, UiEvent, WheelEvent } from "./events";
import type { RenderObject } from "../render/render-object";
import { GestureController } from "./gestures";

export class EventDispatcher {
  private root: RenderObject | null = null;
  private hoverChain: RenderObject[] = [];
  /** 按下时的命中链（捕获期所有 move/up 都发给它）。 */
  private pressChain: RenderObject[] | null = null;
  /** 手势状态机（可选：挂上后每个指针事件喂给它）。 */
  gestures: GestureController | null = null;

  mount(root: RenderObject): void {
    this.root = root;
    this.hoverChain = [];
    this.pressChain = null;
  }

  dispatch(ev: UiEvent): void {
    if (this.root === null) return;
    if (ev.kind === "pointer") {
      this.dispatchPointer(ev);
    } else if (ev.kind === "wheel") {
      this.dispatchWheel(ev);
    }
    // key 事件不走这里（焦点系统负责，见 focus.ts）
  }

  private dispatchPointer(ev: PointerEvent): void {
    if (ev.phase === 1 /* move */) {
      if (this.pressChain !== null) {
        // 捕获期：move 只发给按下目标链（拖拽中途出界不丢事件）
        this.deliverPointer(this.pressChain, ev);
        if (this.gestures !== null) this.gestures.handle(ev, this.pressChain);
      } else {
        const chain = hitTest(this.root as RenderObject, ev.x, ev.y).chain;
        this.updateHover(chain, ev);
        this.deliverPointer(chain, ev);
        if (this.gestures !== null) this.gestures.handle(ev, chain);
      }
      return;
    }

    if (ev.phase === 0 /* down */) {
      const chain = hitTest(this.root as RenderObject, ev.x, ev.y).chain;
      this.pressChain = chain;
      this.updateHover(chain, ev);
      this.deliverPointer(chain, ev);
      if (this.gestures !== null) this.gestures.handle(ev, chain);
      return;
    }

    // up：捕获链 + 解除捕获
    const chain = this.pressChain ?? hitTest(this.root as RenderObject, ev.x, ev.y).chain;
    this.pressChain = null;
    this.deliverPointer(chain, ev);
    if (this.gestures !== null) this.gestures.handle(ev, chain);
    const nowChain = hitTest(this.root as RenderObject, ev.x, ev.y).chain;
    this.updateHover(nowChain, ev);
  }

  /** 链上每个节点依次收事件（自底向上 = 冒泡顺序）。 */
  private deliverPointer(chain: RenderObject[], ev: PointerEvent): void {
    for (const node of chain) {
      if (ev.phase === 0) node.onPointerDown(ev);
      else if (ev.phase === 1) node.onPointerMove(ev);
      else if (ev.phase === 2) node.onPointerUp(ev);
    }
  }

  /** hover 差分：旧链有新链没有 → Leave（从浅到深发）；新有旧无 → Enter（从深到浅发）。 */
  private updateHover(newChain: RenderObject[], ev: PointerEvent): void {
    const enterEv: PointerEvent = { ...ev, phase: 1 };
    for (const node of this.hoverChain) {
      if (newChain.indexOf(node) < 0) node.onPointerLeave(enterEv);
    }
    // newChain[0] 是最深节点：Enter 从深到浅 = 正序遍历
    for (const node of newChain) {
      if (this.hoverChain.indexOf(node) < 0) node.onPointerEnter(enterEv);
    }
    this.hoverChain = newChain.slice();
  }

  private dispatchWheel(ev: WheelEvent): void {
    const chain = hitTest(this.root as RenderObject, ev.x, ev.y).chain;
    for (const node of chain) {
      if (node.onWheel(ev)) {
        return; // 被第一个处理器吞掉（嵌套滚动由内层先处理）
      }
    }
  }
}
