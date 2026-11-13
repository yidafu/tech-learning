// 阴影工具：深度 FBO（sampler2DShadow 比较模式）与光源正交相机拟合。
// 对应分册：《05-第五阶段/02-阴影与PCF软阴影.md》1.1.4（深度纹理与 FBO）、
// 1.3.2（sampler2DShadow 硬件比较）、1.1.3（fitOrthoToBounds）。

import { Mat4, Vec3 } from '../src/common/math';

export interface ShadowTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  size: number;
}

/**
 * 创建深度纹理 FBO：
 * - 内部格式 DEPTH_COMPONENT24（兼容性与精度的平衡点）；
 * - 比较模式 COMPARE_REF_TO_TEXTURE + LEQUAL：texture() 采样在硬件里完成
 *   "采样 -> 比较 -> 返回 0~1"，此时 LINEAR 过滤合法（免费送一次 2x2 PCF）。
 */
export function createShadowTarget(gl: WebGL2RenderingContext, size = 2048): ShadowTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error('深度纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0,
    gl.DEPTH_COMPONENT24,
    size, size, 0,
    gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('FBO 创建失败');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
  gl.drawBuffers([gl.NONE]); // 深度 pass 不写颜色，显式声明更稳
  gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, texture, size };
}

export interface LightCamera {
  lightView: Mat4;
  lightProj: Mat4;
}

/**
 * 平行光的"虚拟相机"：把世界 AABB 的 8 个角变换到光视图空间取各轴 min/max，
 * 用正交投影恰好罩住场景（正交投影深度线性分布，对深度对比的精度友好）。
 * up 与光方向接近平行时请传入别的参考轴，否则 lookAt 退化（分册"常见坑"6）。
 */
export function fitLightCamera(
  lightDir: Vec3, // 指向光源的单位向量
  sceneMin: Vec3,
  sceneMax: Vec3,
  up: Vec3,
): LightCamera {
  const center = new Vec3(
    (sceneMin.x + sceneMax.x) / 2,
    (sceneMin.y + sceneMax.y) / 2,
    (sceneMin.z + sceneMax.z) / 2,
  );
  // 沿光照反方向把相机拉远（取包围盒对角线长度，保证包围盒在近平面之后）
  const diag = Math.hypot(
    sceneMax.x - sceneMin.x, sceneMax.y - sceneMin.y, sceneMax.z - sceneMin.z,
  );
  const lightPos = new Vec3(
    center.x - lightDir.x * diag,
    center.y - lightDir.y * diag,
    center.z - lightDir.z * diag,
  );
  const lightView = new Mat4().lookAt(lightPos, center, up);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < 8; i++) {
    const corner = new Vec3(
      (i & 1) ? sceneMax.x : sceneMin.x,
      (i & 2) ? sceneMax.y : sceneMin.y,
      (i & 4) ? sceneMax.z : sceneMin.z,
    ).applyMat4(lightView); // 世界 -> 光视图
    minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z); maxZ = Math.max(maxZ, corner.z);
  }
  const m = 0.5; // 边缘余量
  const lightProj = new Mat4().ortho(
    minX - m, maxX + m, minY - m, maxY + m,
    -maxZ - m, -minZ + m, // z 取反：光视图空间里相机看向 -Z
  );
  return { lightView, lightProj };
}
