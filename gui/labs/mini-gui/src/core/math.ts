// 自带数学库：scriptc-raylib 锁定的 scriptc 0.0.35 静态编译不含
// Math.sqrt / Math.pow / Math.PI / 三角函数（它们属于内嵌动态引擎，本项目构建禁用，
// 实测报 SC2012）。可用的只有：max / min / round / floor / ceil / trunc / abs、**、random。
// 于是 mini-gui 自带一份确定性实现——顺带的好处：跨宿主（原生 / Node）逐位一致。
import { clamp } from "./geometry";

/** 圆周率（动画与缓动精度足够）。 */
export const PI = 3.141592653589793;
const TWO_PI = PI * 2;

/** 牛顿迭代开方：相对容差收敛（初值 max(x,1) 对大数要先经历约 log2 轮折半再二次收敛，固定 6 次不够）。 */
export function sqrt(x: number): number {
  if (x <= 0) return 0;
  let r = x > 1 ? x : 1; // 初值取 max(x, 1) 保证从上方收敛
  for (let i = 0; i < 60; i++) {
    const next = (r + x / r) / 2;
    if (Math.abs(next - r) <= next * 1e-15) {
      return next; // 相对收敛即停（二次收敛阶段一两轮就到 double 精度）
    }
    r = next;
  }
  return r;
}

/** 欧几里得模：结果与除数同号（TS 的 % 是截断取余，负数行为不同）。 */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * 正弦：先归约到 [-π, π)，再按象限折到 [-π/2, π/2]，最后泰勒展开到 13 次。
 * 截断误差在 θ=π/2 处为 θ¹⁵/15! ≈ 6.6e-10（math.test.ts 以 <1e-9 断言）。
 * 动画与缓动专用，不做数值库级保证。
 */
export function sin(x: number): number {
  const t = mod(x + PI, TWO_PI) - PI; // 归约到 [-π, π)
  let theta = t;
  if (theta > PI / 2) theta = PI - theta; // 第二象限折回第一象限
  else if (theta < -PI / 2) theta = -PI - theta; // 第三象限折回第四象限
  // sin(θ) ≈ θ·(1 - θ²/6·(1 - θ²/20·(1 - θ²/42·(1 - θ²/72·(1 - θ²/110·(1 - θ²/156))))))
  const t2 = theta * theta;
  return theta * (1 - (t2 / 6) * (1 - (t2 / 20) * (1 - (t2 / 42) * (1 - (t2 / 72) * (1 - (t2 / 110) * (1 - t2 / 156))))));
}

/** 余弦 = sin(x + π/2)。 */
export function cos(x: number): number {
  return sin(x + PI / 2);
}

/** 线性插值。 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 反插值：v 在 a..b 区间的进度，钳制到 [0,1]。 */
export function invLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

export { clamp };
