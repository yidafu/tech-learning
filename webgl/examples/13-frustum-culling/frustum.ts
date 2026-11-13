// 视锥剔除数学：Gribb–Hartmann 平面提取、包围球与 AABB（p-vertex）测试、
// AABB 的保守变换、视锥角点（线框用）。
// 对应分册：《05-第五阶段/12-视锥剔除与场景管理.md》11.1 / 11.2。
// 约定与《数学专题/02-仿射几何与齐次坐标.md》2.5 完全一致：
// π = (a,b,c,d)，π·x ≥ 0 表示在锥内侧，归一化后 π·x 是带符号距离。

import { Mat4, Vec3, transformHomogeneous } from '../src/common/math';

/** 齐次平面：a·x + b·y + c·z + d ≥ 0 在视锥内侧 */
export type Plane = [number, number, number, number];

/**
 * Gribb–Hartmann：从 view-projection 矩阵（列主序）的行加减取出六个平面。
 * 顶点可见条件 -w ≤ x,y,z ≤ w 的每个不等式都是一个齐次平面（分册 11.1.2）。
 * 提取后立即归一化，使 plane·p 成为带符号距离。顺序 [l, r, b, t, near, far]。
 */
export function extractFrustumPlanes(vp: Float32Array): Plane[] {
  const row = (r: number): Plane => [vp[r], vp[4 + r], vp[8 + r], vp[12 + r]];
  const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
  const planes: Plane[] = [
    [r3[0] + r0[0], r3[1] + r0[1], r3[2] + r0[2], r3[3] + r0[3]], // left   x ≥ -w
    [r3[0] - r0[0], r3[1] - r0[1], r3[2] - r0[2], r3[3] - r0[3]], // right  x ≤ +w
    [r3[0] + r1[0], r3[1] + r1[1], r3[2] + r1[2], r3[3] + r1[3]], // bottom y ≥ -w
    [r3[0] - r1[0], r3[1] - r1[1], r3[2] - r1[2], r3[3] - r1[3]], // top    y ≤ +w
    [r3[0] + r2[0], r3[1] + r2[1], r3[2] + r2[2], r3[3] + r2[3]], // near   z ≥ -w
    [r3[0] - r2[0], r3[1] - r2[1], r3[2] - r2[2], r3[3] - r2[3]], // far    z ≤ +w
  ];
  for (const p of planes) {
    const inv = 1 / Math.hypot(p[0], p[1], p[2]);
    p[0] *= inv; p[1] *= inv; p[2] *= inv; p[3] *= inv;
  }
  return planes;
}

/** 包围球 vs 视锥：任一平面带符号距离 < -radius ⇒ 整球在外。一次点积判一个面 */
export function sphereIntersectsFrustum(
  planes: Plane[], center: Vec3, radius: number,
): boolean {
  for (const p of planes) {
    if (p[0] * center.x + p[1] * center.y + p[2] * center.z + p[3] < -radius) return false;
  }
  return true;
}

/** 轴对齐包围盒 */
export interface Aabb {
  min: Vec3;
  max: Vec3;
}

/**
 * AABB vs 视锥：p-vertex 法（分册 11.2.2）。
 * 对每个平面取盒上"最靠内侧"的角（法线分量为正取 max、为负取 min）测试，
 * 该角是盒在平面正方向上的极值点——它都在负侧 ⇒ 全盒在外。
 * 保守：可能放行实际在外的盒（零误杀），绝不误剔实际在内的盒。
 */
export function aabbIntersectsFrustum(planes: Plane[], box: Aabb): boolean {
  for (const p of planes) {
    const px = p[0] >= 0 ? box.max.x : box.min.x;
    const py = p[1] >= 0 ? box.max.y : box.min.y;
    const pz = p[2] >= 0 ? box.max.z : box.min.z;
    if (p[0] * px + p[1] * py + p[2] * pz + p[3] < 0) return false;
  }
  return true;
}

/**
 * 局部 AABB -> 世界 AABB 的保守变换：8 个角点过 matrixWorld 后取 min/max。
 * 旋转后的轴对齐盒必须包住旋转后的原盒（一个 OBB），所以会变大——
 * 45° 旋转的正方形边长 ×√2（分册 11.2.3 的保守性代价）。
 */
export function transformAabb(m: Mat4, local: Aabb, out: Aabb): Aabb {
  const e = m.elements;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < 8; i++) {
    const x = (i & 1) ? local.max.x : local.min.x;
    const y = (i & 2) ? local.max.y : local.min.y;
    const z = (i & 4) ? local.max.z : local.min.z;
    const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
    const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
    const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
    if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
    if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
  }
  out.min.set(minX, minY, minZ);
  out.max.set(maxX, maxY, maxZ);
  return out;
}

/** 逆投影出视锥 8 角（世界空间）：画调试线框 / 手算验证用 */
export function frustumCorners(inverseVP: Mat4, out: Vec3[]): Vec3[] {
  for (let i = 0; i < 8; i++) {
    const h = transformHomogeneous(inverseVP, i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, 1);
    const w = h.w === 0 ? 1 : h.w;
    out[i].set(h.x / w, h.y / w, h.z / w);
  }
  return out;
}
