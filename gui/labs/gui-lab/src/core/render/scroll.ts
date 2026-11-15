// 滚动视口：内容坐标与视口坐标分离 + 惯性物理。
// 要点：
//   - 内容子节点被摆到 y = -scrollY（位置归父协议的现场应用），命中测试自动获得正确坐标
//   - 滚动只是改内容 y，不触发重布局（布局缓存友好）
//   - 惯性：滚轮赋初速，update(dt) 指数衰减；夹到 [0, maxScroll]
import { PALETTE } from "../color";
import type { Painter } from "../painter";
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";
import { clamp } from "../geometry";
import type { WheelEvent } from "../events/events";

/** 滚轮一格换算的像素数（宿主约定）。 */
export const WHEEL_STEP_PX = 40;

export class RenderScrollView extends RenderObject {
  scrollY = 0;
  velocity = 0;
  /** 每帧宿主调用：惯性推进（dt 秒）。 */
  update(dt: number): void {
    if (this.velocity === 0) return;
    this.scrollBy(this.velocity * dt);
    // 指数衰减：v *= e^(-6t) 的离散近似
    const decay = Math.max(0, 1 - 6 * dt);
    this.velocity = this.velocity * decay;
    if (Math.abs(this.velocity) < 4) this.velocity = 0;
    this.clampVelocity();
  }

  /** 立即滚动 delta 像素（无惯性）。位移是纯绘制变化 → 标脏重绘，不触发重布局。 */
  scrollBy(delta: number): void {
    this.scrollY = clamp(this.scrollY + delta, 0, this.maxScroll());
    this.placeContent();
    this.markNeedsPaint();
  }

  /** 滚轮入口（覆写基类事件方法，签名严格一致）：转发到 handleWheel。 */
  onWheel(ev: WheelEvent): boolean {
    this.handleWheel(ev.dy);
    return true;
  }

  /** 滚轮格数 → 像素：直接滚动 + 赋惯性初速。 */
  handleWheel(dy: number): void {
    this.scrollBy(dy * WHEEL_STEP_PX);
    this.velocity = dy * WHEEL_STEP_PX * 2;
    this.clampVelocity();
  }

  private clampVelocity(): void {
    const max = this.maxScroll();
    // 顶/底弹回：到达边界时速度清零
    if ((this.scrollY <= 0 && this.velocity < 0) || (this.scrollY >= max && this.velocity > 0)) {
      this.velocity = 0;
    }
  }

  maxScroll(): number {
    const content = this.children[0];
    if (content === undefined) return 0;
    return Math.max(0, content.height - this.height);
  }

  /** 内容子节点相对视口的偏移（负 = 向下滚）。scrollY=0 时写 0 而非 -0（Object.is 语义）。 */
  private placeContent(): void {
    const content = this.children[0];
    if (content !== undefined) {
      content.y = this.scrollY === 0 ? 0 : -this.scrollY;
    }
  }

  protected performLayout(c: BoxConstraints): void {
    const content = this.children[0];
    // 视口尺寸：尽量占满约束（有界时）
    const viewW = c.maxWidth === Infinity ? (content?.width ?? 0) : c.maxWidth;
    const viewH = c.maxHeight === Infinity ? (content?.height ?? 0) : c.maxHeight;
    if (content !== undefined) {
      // 内容：交叉轴跟视口（宽同宽），主轴（高）无界自由生长
      content.layout({ minWidth: 0, maxWidth: viewW, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER });
      this.scrollY = clamp(this.scrollY, 0, Math.max(0, content.height - viewH));
      this.placeContent();
    }
    this.setSize(c, { width: viewW, height: viewH });
  }

  /** 滚动条（简化：右侧细条，比例与位置示意；自身坐标，在视口裁剪之外）。 */
  private paintScrollbar(p: Painter): void {
    const content = this.children[0];
    if (content === undefined || content.height <= this.height) return;
    const trackH = this.height;
    const thumbH = Math.max(24, (this.height / content.height) * trackH);
    const thumbY = (this.scrollY / this.maxScroll()) * (trackH - thumbH);
    p.fillRect({ x: this.width - 6, y: thumbY, width: 4, height: thumbH }, PALETTE.textMuted);
  }

  /** 视口容器：裁剪由基类协议包住整个子树（含内容），滚动条在本方法里画（同裁剪内，无碍）。 */
  protected clipsContent(): boolean {
    return true;
  }

  protected paintSelf(p: Painter): void {
    this.paintScrollbar(p);
  }
}
