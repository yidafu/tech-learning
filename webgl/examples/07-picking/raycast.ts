// 射线拾取：屏幕点 -> 世界射线 -> 三角形求交。
// 对应分册：《04-第四阶段/05-交互系统.md》4.1（Raycaster 五步推导）/ 4.2（Möller–Trumbore）。

import type { GeometryData } from '../src/common/geometry';
import type { PerspectiveCamera } from '../src/common/controls';
import { Mat4, transformHomogeneous, Vec3 } from '../src/common/math';

export interface Ray {
  origin: Vec3;
  direction: Vec3; // 已归一化
}

export interface MeshHit {
  distance: number; // 世界空间距离
  point: Vec3;      // 世界空间交点
}

/** 屏幕事件坐标 -> NDC（用 CSS 尺寸；y 翻转：屏幕 y 向下，NDC y 向上） */
export function pointerToNDC(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
  };
}

/**
 * 相机 + NDC 点 -> 世界射线（分册 4.1.2 五步）：
 * NDC 近/远两点 -> 齐次坐标 -> 乘 (projection·view) 的逆 -> 齐次除法 -> 组装射线。
 * 齐次除法不可省略：正交相机下 w 恒为 1"暂时没事"，透视相机下漏掉必歪。
 */
export function rayFromCamera(camera: PerspectiveCamera, ndcX: number, ndcY: number): Ray {
  const vp = new Mat4().copy(camera.updateProjectionMatrix())
    .multiply(camera.updateViewMatrix());
  const invVP = Mat4.invert(new Mat4(), vp);
  if (!invVP) throw new Error('viewProjection 矩阵奇异，无法求逆');

  const nearH = transformHomogeneous(invVP, ndcX, ndcY, -1, 1);
  const farH = transformHomogeneous(invVP, ndcX, ndcY, 1, 1);
  const origin = new Vec3(nearH.x / nearH.w, nearH.y / nearH.w, nearH.z / nearH.w);
  const direction = new Vec3(
    farH.x / farH.w - origin.x,
    farH.y / farH.w - origin.y,
    farH.z / farH.w - origin.z,
  ).normalize();
  return { origin, direction };
}

/* ---------- Möller–Trumbore 射线-三角形求交（分册 4.2.2） ---------- */

const _edge1 = new Vec3();
const _edge2 = new Vec3();
const _pvec = new Vec3();
const _tvec = new Vec3();
const _qvec = new Vec3();
const TRI_EPSILON = 1e-8;

export interface TriangleHit {
  t: number; // 射线参数：交点 = origin + t * direction
  u: number; // 重心坐标（相对 v1）
  v: number; // 重心坐标（相对 v2）
}

/** 两次叉积、三次点积解出 (t, u, v)；"算一个验一个"的顺序对未命中平均快一倍以上 */
export function intersectTriangle(
  origin: Vec3,
  direction: Vec3,
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  cullBackface = false,
): TriangleHit | null {
  Vec3.subtract(v1, v0, _edge1);          // E1
  Vec3.subtract(v2, v0, _edge2);          // E2
  Vec3.cross(direction, _edge2, _pvec);   // pvec = D × E2

  const det = _edge1.dot(_pvec);          // det = E1 · pvec
  if (cullBackface ? det < TRI_EPSILON : Math.abs(det) < TRI_EPSILON) {
    return null; // 背面（cull 时）或平行
  }
  const invDet = 1 / det;

  Vec3.subtract(origin, v0, _tvec);       // tvec = O - V0
  const u = _tvec.dot(_pvec) * invDet;
  if (u < 0 || u > 1) return null;        // 快速剔除：u 出界

  Vec3.cross(_tvec, _edge1, _qvec);       // qvec = tvec × E1
  const v = direction.dot(_qvec) * invDet;
  if (v < 0 || u + v > 1) return null;    // v 出界或 u+v 出界

  const t = _edge2.dot(_qvec) * invDet;
  if (t < 0) return null;                 // 三角形在射线背后
  return { t, u, v };
}

/**
 * 射线 vs 整个几何（先粗后细的精测段：射线逆变换到模型局部空间逐三角形）。
 * 方向变换后记录未归一化长度 len，世界距离 = t_local * len（分册 4.2.2 末尾的换算）。
 */
export function raycastGeometry(ray: Ray, matrixWorld: Mat4, geo: GeometryData): MeshHit | null {
  const invWorld = Mat4.invert(new Mat4(), matrixWorld);
  if (!invWorld) return null;

  const localOrigin = ray.origin.clone().applyMat4(invWorld);
  const e = invWorld.elements;
  const d = ray.direction;
  const dx = e[0] * d.x + e[4] * d.y + e[8] * d.z;
  const dy = e[1] * d.x + e[5] * d.y + e[9] * d.z;
  const dz = e[2] * d.x + e[6] * d.y + e[10] * d.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-10) return null;
  const localDir = new Vec3(dx / len, dy / len, dz / len); // 局部单位方向

  const v0 = new Vec3();
  const v1 = new Vec3();
  const v2 = new Vec3();
  const read = (index: number, out: Vec3): void => {
    const i = index * 3;
    out.set(geo.positions[i], geo.positions[i + 1], geo.positions[i + 2]);
  };

  let best: number | null = null;
  for (let i = 0; i < geo.indices.length; i += 3) {
    read(geo.indices[i], v0);
    read(geo.indices[i + 1], v1);
    read(geo.indices[i + 2], v2);
    const hit = intersectTriangle(localOrigin, localDir, v0, v1, v2);
    if (hit && (best === null || hit.t < best)) best = hit.t;
  }
  if (best === null) return null;

  const distance = best * len;
  const point = ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance));
  return { distance, point };
}
