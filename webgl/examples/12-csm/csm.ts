// 级联阴影（CSM）核心：practical split scheme 分割、每级光正交相机的
// tight fitting 与纹素对齐稳定化、深度纹理数组 FBO。
// 对应分册：《05-第五阶段/11-级联阴影CSM.md》10.2（分割公式）、
// 10.3（光空间拟合与 texel snapping）、10.5.1（纹理数组）。

import { Mat4, Vec3, transformHomogeneous } from '../src/common/math';

/** 级联数：3 级（近/中/远）是教学与工业的常见起点 */
export const CASCADE_COUNT = 3;

/** 拟合余量（世界单位）：容纳视锥外的投射物、PCF 采样半径与法线偏移 */
const FIT_MARGIN = 3;

export interface CascadeCamera {
  /** lightProj · lightBasis：世界 -> 该级光源裁剪空间。光视图只有旋转，平移由 ortho 参数吸收 */
  readonly lightVP: Mat4;
  /** 拟合后一个纹素覆盖的世界尺寸——级联的意义就是这个数逐级变小（分册 10.1） */
  texelWorldSize: number;
  /** 该级沿光方向的深度跨度（世界单位），bias 归一化用 */
  depthRange: number;
}

/**
 * practical split scheme（分册 10.2.3，Zhang et al. 2006）：
 *   对数分割 log_i = n·(f/n)^(i/N)   近处细分、深度按比例增长
 *   均匀分割 uni_i  = n + (f-n)·i/N  等距、远处浪费
 *   实用分割 z_i    = λ·log_i + (1-λ)·uni_i
 * λ=1 纯对数、λ=0 纯均匀。返回 [z_1..z_N]（正的视深），末项 clamp 到 far。
 */
export function practicalSplits(
  near: number, far: number, count: number, lambda: number,
): number[] {
  const splits: number[] = [];
  for (let i = 1; i <= count; i++) {
    const log = near * Math.pow(far / near, i / count);
    const uni = near + ((far - near) * i) / count;
    splits.push(Math.min(lambda * log + (1 - lambda) * uni, far));
  }
  return splits;
}

/**
 * 光对齐基（世界 -> 光空间，只有旋转、无平移）：lookAt 的 eye 放在原点，
 * 平移分量恒为 0。方向固定的平行光下它逐帧不变——这是纹素对齐能锚定
 * 格线的前提（分册 10.3.3）。up 与光方向接近平行时换参考轴。
 */
export function createLightBasis(lightDir: Vec3): Mat4 {
  return new Mat4().lookAt(
    new Vec3(0, 0, 0), new Vec3(lightDir.x, lightDir.y, lightDir.z), new Vec3(0, 1, 0),
  );
}

/**
 * 视锥段 8 角点（世界空间）：先逆投影出近平面 4 角（NDC x/y = ±1、z = -1），
 * 得到"相机 -> 锥角"射线，再按视深等比缩放——落点的 -z_view 恰为给定深度。
 * out 长度必须 ≥ 8（复用调用方的数组，避免每帧分配）。
 */
export function frustumSegmentCorners(
  inverseVP: Mat4,
  cameraPosition: Vec3,
  cameraNear: number,
  depthNear: number,
  depthFar: number,
  out: Vec3[],
): void {
  const kNear = depthNear / cameraNear;
  const kFar = depthFar / cameraNear;
  for (let i = 0; i < 4; i++) {
    const ndcX = i & 1 ? 1 : -1;
    const ndcY = i & 2 ? 1 : -1;
    const h = transformHomogeneous(inverseVP, ndcX, ndcY, -1, 1);
    const w = h.w === 0 ? 1 : h.w; // 防御：正常透视矩阵 w 不会为 0
    const dx = h.x / w - cameraPosition.x;
    const dy = h.y / w - cameraPosition.y;
    const dz = h.z / w - cameraPosition.z;
    out[i * 2].set(cameraPosition.x + dx * kNear, cameraPosition.y + dy * kNear, cameraPosition.z + dz * kNear);
    out[i * 2 + 1].set(cameraPosition.x + dx * kFar, cameraPosition.y + dy * kFar, cameraPosition.z + dz * kFar);
  }
}

/**
 * 拟合一级的光正交相机（tight fitting + 可选纹素对齐，分册 10.3）：
 * 1) 8 角点变到光对齐空间，取三轴 min/max（正交投影下这就是精确包围）；
 * 2) 加余量后可选做纹素对齐——把各轴范围向外量化到"一个纹素世界尺寸"的
 *    整数倍。光基锚在世界原点，纹素格线因此在世界空间固定，相机的亚纹素
 *    移动不再带动采样点漂移（消 shimmer）；
 * 3) ortho 直接吃下 [min,max]，光视图不需要 lookAt 的平移。
 */
export function fitCascadeCamera(
  corners: readonly Vec3[],
  lightBasis: Mat4,
  shadowSize: number,
  snapTexels: boolean,
  out: CascadeCamera,
): void {
  const e = lightBasis.elements;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of corners) {
    // 光对齐空间坐标 = 光基的行与点的点积（基无平移，直接三线性式）
    const x = e[0] * p.x + e[4] * p.y + e[8] * p.z;
    const y = e[1] * p.x + e[5] * p.y + e[9] * p.z;
    const z = e[2] * p.x + e[6] * p.y + e[10] * p.z;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  minX -= FIT_MARGIN; maxX += FIT_MARGIN;
  minY -= FIT_MARGIN; maxY += FIT_MARGIN;
  minZ -= FIT_MARGIN; maxZ += FIT_MARGIN;
  if (snapTexels) {
    const tx = (maxX - minX) / shadowSize;
    const ty = (maxY - minY) / shadowSize;
    const tz = (maxZ - minZ) / shadowSize;
    minX = Math.floor(minX / tx) * tx; maxX = Math.ceil(maxX / tx) * tx;
    minY = Math.floor(minY / ty) * ty; maxY = Math.ceil(maxY / ty) * ty;
    minZ = Math.floor(minZ / tz) * tz; maxZ = Math.ceil(maxZ / tz) * tz;
  }
  // z 轴取反传入：光对齐空间里"靠近光源"是 -z 侧（同 08 示例 shadow.ts 的约定）
  out.lightVP.ortho(minX, maxX, minY, maxY, -maxZ, -minZ).multiply(lightBasis);
  out.texelWorldSize = (maxX - minX) / shadowSize;
  out.depthRange = maxZ - minZ;
}

export interface CascadeShadowTarget {
  fbo: WebGLFramebuffer;
  /** TEXTURE_2D_ARRAY：CASCADE_COUNT 层 DEPTH_COMPONENT24，比较模式（分册 10.5.1） */
  texture: WebGLTexture;
  size: number;
}

/**
 * 深度纹理数组 FBO：一张数组纹理存 N 级深度。采样端 sampler2DArrayShadow
 * 一次绑定全部可用（层号是坐标分量，可动态选择）；渲染端逐层挂附件。
 * 对照方案是 N 张独立 TEXTURE_2D + N 个采样器——多占纹理单元且选级要分支。
 */
export function createCascadeShadowTarget(
  gl: WebGL2RenderingContext,
  size: number,
  layers: number,
): CascadeShadowTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error('深度纹理数组创建失败');
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  // texStorage3D 不可变分配：一次建好全部层，比逐层 texImage3D 少驱动往返
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH_COMPONENT24, size, size, layers);
  // 比较模式 + LEQUAL + LINEAR：硬件里完成"采样 -> 比较 -> 0~1"，LINEAR 即免费 2x2 PCF
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('FBO 创建失败');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, texture, 0, 0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, texture, size };
}

/** 阴影 pass 逐级渲染前调用：把深度附件切到第 layer 层 */
export function attachCascadeLayer(
  gl: WebGL2RenderingContext,
  target: CascadeShadowTarget,
  layer: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, target.texture, 0, layer);
}
