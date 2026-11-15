// 动画系统：Tween（显式）、AnimatedValue（隐式补间）、曲线族。
// 全部多项式曲线（0.0.35 无 Math.sin——elastic 用自带 sin）；驱动由宿主每帧 tick(dt)。
import { clamp, lerp, sin } from "./math";

/** 曲线：[0,1] → 映射后的进度。 */
export type Curve = (t: number) => number;

export const Curves = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t * t,
  easeOut: (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t),
  easeInOut: (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
  /** 过冲回落（按钮弹跳感）。 */
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const u = t - 1;
    return 1 + c3 * u * u * u + c1 * u * u;
  },
  /** 弹性衰减（用自带 sin，见 core/math 的 ScriptC 说明）。 */
  elasticOut: (t: number): number => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * 3.141592653589793) / 3;
    return (2 ** (-10 * t)) * sin((t * 10 - 0.75) * c4) + 1;
  },
} as const;

/** 显式补间：from → to，duration 秒，每帧 tick 驱动。 */
export class Tween {
  from: number;
  to: number;
  duration: number;
  curve: Curve;
  elapsed = 0;
  running = false;
  /** 可空函数槽（ScriptC：可空而非可选，见 render-object 的事件区注释）。 */
  onUpdate: ((v: number) => void) | null = null;
  onComplete: (() => void) | null = null;

  constructor(from: number, to: number, duration: number, curve?: Curve) {
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.curve = curve ?? Curves.linear;
  }

  start(): void {
    this.elapsed = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  /** 推进一帧。返回本帧是否在活动（还在跑）。 */
  tick(dt: number): boolean {
    if (!this.running) return false;
    this.elapsed += dt;
    const t = clamp(this.elapsed / this.duration, 0, 1);
    const v = lerp(this.from, this.to, this.curve(t));
    const fn = this.onUpdate;
    if (fn !== null) fn(v);
    if (t >= 1) {
      this.running = false;
      const done = this.onComplete;
      if (done !== null) done();
    }
    return this.running;
  }
}

/** 隐式补间：改 target 自动从当前值补间过去（AnimatedContainer 的思想）。 */
export class AnimatedValue {
  current: number;
  target: number;
  duration: number;
  curve: Curve;
  private from: number;
  private elapsed: number;
  private active = false;

  constructor(initial: number, duration = 0.25, curve?: Curve) {
    this.current = initial;
    this.target = initial;
    this.from = initial;
    this.duration = duration;
    this.curve = curve ?? Curves.easeOut;
    this.elapsed = 0;
  }

  /** 设新目标：从「当前值」起补（半路改向不停顿）。 */
  set(target: number): void {
    if (target === this.target && !this.active) return;
    this.from = this.current;
    this.target = target;
    this.elapsed = 0;
    this.active = true;
  }

  /** 推进。返回是否仍在活动。 */
  tick(dt: number): boolean {
    if (!this.active) return false;
    this.elapsed += dt;
    const t = clamp(this.elapsed / this.duration, 0, 1);
    this.current = lerp(this.from, this.target, this.curve(t));
    if (t >= 1) this.active = false;
    return this.active;
  }
}

/** 动画宿主：统一 tick（宿主每帧调用一次）。 */
export class AnimationHost {
  private readonly tweens: Tween[] = [];

  add(tween: Tween): Tween {
    this.tweens.push(tween);
    return tween;
  }

  /** 推进全部动画，返回仍在活动的数量。 */
  tick(dt: number): number {
    let active = 0;
    for (const t of this.tweens) {
      if (t.tick(dt)) active += 1;
    }
    return active;
  }
}
