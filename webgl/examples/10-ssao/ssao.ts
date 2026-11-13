// 10 SSAO 的离屏目标与采样数据：G-buffer（MRT）、R16F 单通道目标、半球采样核、噪声纹理。
// 对应分册：《05-第五阶段/09-屏幕空间环境光遮蔽.md》8.2.3（G-buffer 组装）、8.3（核与噪声）。

import { Vec3 } from '../src/common/math';

export interface GBuffer {
  fbo: WebGLFramebuffer;
  position: WebGLTexture; // RGBA16F：视空间位置
  normal: WebGLTexture;   // RGBA16F：视空间法线
  depth: WebGLTexture;    // DEPTH_COMPONENT24
  width: number;
  height: number;
}

/** MRT G-buffer：附件 0 位置、附件 1 法线 + 深度纹理（drawBuffers 声明顺序） */
export function createGBuffer(gl: WebGL2RenderingContext, width: number, height: number): GBuffer {
  const mkTex = (internalFormat: number, format: number, type: number): WebGLTexture => {
    const tex = gl.createTexture();
    if (!tex) throw new Error('纹理创建失败');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };

  const position = mkTex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
  const normal = mkTex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
  const depth = gl.createTexture();
  if (!depth) throw new Error('深度纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, depth);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0,
    gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('FBO 创建失败');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, position, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normal, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); // location 0/1 <-> 附件顺序

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('G-buffer FBO 不完备：多半是 EXT_color_buffer_float 没启用');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, position, normal, depth, width, height };
}

export interface RTarget {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture; // R16F 单通道
}

/** R16F 单通道渲染目标（遮蔽图与模糊结果） */
export function createRTarget(gl: WebGL2RenderingContext, width: number, height: number): RTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, width, height, 0, gl.RED, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('FBO 创建失败');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('R16F FBO 不完备：EXT_color_buffer_float 对 R16F 同样必需');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, texture };
}

/**
 * 64 个半球采样方向（视空间，法线朝 +Z）：
 * 单位方向 x 距离按 t^2 偏向圆心——近处遮挡贡献大，权重前移减少 banding（分册 8.3.1）。
 */
export function createSsaoKernel(size = 64): Float32Array {
  const kernel = new Float32Array(size * 3);
  for (let i = 0; i < size; i++) {
    const v = new Vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()).normalize();
    const t = i / size;
    const scale = 0.1 + t * t * 0.9; // lerp(0.1, 1.0, t^2)
    kernel[i * 3] = v.x * scale;
    kernel[i * 3 + 1] = v.y * scale;
    kernel[i * 3 + 2] = v.z * scale;
  }
  return kernel;
}

/** 4x4 旋转噪声：xy 是随机旋转方向（z=0），REPEAT 平铺整个屏幕（分册 8.3.2） */
export function createNoiseTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const data = new Float32Array(16 * 4);
  for (let i = 0; i < 16; i++) {
    data[i * 4] = Math.random() * 2 - 1;
    data[i * 4 + 1] = Math.random() * 2 - 1;
    // z/w 留 0
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error('噪声纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); // 噪声必须平铺，CLAMP 会条纹化
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return texture;
}

export function disposeGBuffer(gl: WebGL2RenderingContext, gbuffer: GBuffer): void {
  gl.deleteFramebuffer(gbuffer.fbo);
  gl.deleteTexture(gbuffer.position);
  gl.deleteTexture(gbuffer.normal);
  gl.deleteTexture(gbuffer.depth);
}

export function disposeRTarget(gl: WebGL2RenderingContext, target: RTarget): void {
  gl.deleteFramebuffer(target.fbo);
  gl.deleteTexture(target.texture);
}
