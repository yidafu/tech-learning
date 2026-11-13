// 09 IBL 资产生成管线：equirect -> env cubemap -> irradiance / prefilter / BRDF LUT。
// 对应分册：《05-第五阶段/08-基于图像的光照.md》7.2~7.5。
// 依赖 EXT_color_buffer_float（浮点渲染目标）；生成是一次性的，启动时跑一遍。

import { createBox, createGpuGeometry } from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { createProgramOrFail } from '../src/common/gl';
import { Mat4, Vec3 } from '../src/common/math';
import { brdfLutFS, brdfLutVS, captureVS, equirectFS, irradianceFS, prefilterFS } from './shaders';

export interface IblAssets {
  /** 环境立方体贴图：天空盒显示 + 卷积输入 */
  envCube: WebGLTexture;
  /** 漫反射辐照度贴图（存 E/π，分册 7.3） */
  irradiance: WebGLTexture;
  /** 镜面预过滤贴图：粗糙度写进 mip（分册 7.4） */
  prefilter: WebGLTexture;
  /** BRDF 积分查找表：R=A、G=B（分册 7.5） */
  brdfLut: WebGLTexture;
  /** 预过滤 mip 链最大级号（运行时 textureLod 的乘数） */
  maxPrefilterLod: number;
}

/** 浮点渲染目标是 IBL 预处理的硬前提（分册 7.1.2 第 1 条） */
export function requireFloatColorBuffer(gl: WebGL2RenderingContext): void {
  if (!gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('EXT_color_buffer_float 不可用：无法渲染到浮点纹理，IBL 预处理不可用');
  }
}

/** GL cubemap 面朝向约定：6 个面的 (forward, up)，见分册 7.2.2 的表 */
const FACE_VIEWS: Array<[forward: Vec3, up: Vec3]> = [
  [new Vec3( 1, 0, 0), new Vec3(0, -1, 0)],
  [new Vec3(-1, 0, 0), new Vec3(0, -1, 0)],
  [new Vec3( 0, 1, 0), new Vec3(0, 0, 1)],
  [new Vec3( 0,-1, 0), new Vec3(0, 0,-1)],
  [new Vec3( 0, 0, 1), new Vec3(0, -1, 0)],
  [new Vec3( 0, 0,-1), new Vec3(0, -1, 0)],
];

export interface IblOptions {
  envSize?: number;         // 环境贴图每面边长（默认 256）
  irradianceSize?: number;  // 辐照度每面边长（默认 32，分册 7.3.3）
  prefilterSize?: number;   // 预过滤 mip0 边长（默认 128）
  prefilterMips?: number;   // 预过滤 mip 级数（默认 5）
  lutSize?: number;         // BRDF LUT 边长（默认 512）
}

export function generateIblFromEquirect(
  gl: WebGL2RenderingContext,
  equirect: WebGLTexture,
  opts: IblOptions = {},
): IblAssets {
  const envSize = opts.envSize ?? 256;
  const irradianceSize = opts.irradianceSize ?? 32;
  const prefilterSize = opts.prefilterSize ?? 128;
  const prefilterMips = opts.prefilterMips ?? 5;
  const lutSize = opts.lutSize ?? 512;

  const equirectProg = createProgramOrFail(gl, captureVS, equirectFS);
  const irradianceProg = createProgramOrFail(gl, captureVS, irradianceFS);
  const prefilterProg = createProgramOrFail(gl, captureVS, prefilterFS);
  const lutProg = createProgramOrFail(gl, brdfLutVS, brdfLutFS);

  const cubeGeo: GpuGeometry = createGpuGeometry(gl, createBox(2, 2, 2));
  const emptyVao = gl.createVertexArray(); // 全屏三角形无 attribute，空 VAO 即可

  const faceViews = FACE_VIEWS.map(([fwd, up]) => new Mat4().lookAt(new Vec3(0, 0, 0), fwd, up));
  const captureProj = new Mat4().perspective(Math.PI / 2, 1, 0.1, 10); // 90° 正方形
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('FBO 创建失败');

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.disable(gl.DEPTH_TEST); // 捕获 pass 不需要深度
  gl.disable(gl.CULL_FACE);  // 相机在立方体内部，面剔除会把画面剔没

  // ---- 7.2 equirect -> env cubemap ----
  const envCube = gl.createTexture();
  if (!envCube) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCube);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.RGBA16F, envSize, envSize);
  setCubeParams(gl, gl.LINEAR);
  gl.useProgram(equirectProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(equirectProg, 'uProjection'), false, captureProj.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, equirect);
  gl.uniform1i(gl.getUniformLocation(equirectProg, 'uEquirect'), 0);
  renderAllFaces(gl, equirectProg, cubeGeo, faceViews, envCube, 0, envSize);

  // ---- 7.3 env cubemap -> irradiance（32×32，存 E/π）----
  const irradiance = gl.createTexture();
  if (!irradiance) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, irradiance);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.RGBA16F, irradianceSize, irradianceSize);
  setCubeParams(gl, gl.LINEAR);
  gl.useProgram(irradianceProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(irradianceProg, 'uProjection'), false, captureProj.elements);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCube);
  gl.uniform1i(gl.getUniformLocation(irradianceProg, 'uEnvironment'), 0);
  renderAllFaces(gl, irradianceProg, cubeGeo, faceViews, irradiance, 0, irradianceSize);

  // ---- 7.4 env cubemap -> prefilter（逐 mip：粗糙度 = mip / (级数-1)）----
  const prefilter = gl.createTexture();
  if (!prefilter) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, prefilter);
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, prefilterMips, gl.RGBA16F, prefilterSize, prefilterSize);
  setCubeParams(gl, gl.LINEAR_MIPMAP_LINEAR); // 粗糙度落在两级之间时插值
  gl.useProgram(prefilterProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(prefilterProg, 'uProjection'), false, captureProj.elements);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envCube);
  gl.uniform1i(gl.getUniformLocation(prefilterProg, 'uEnvironment'), 0);
  for (let mip = 0; mip < prefilterMips; mip++) {
    gl.uniform1f(gl.getUniformLocation(prefilterProg, 'uRoughness'), mip / (prefilterMips - 1));
    renderAllFaces(gl, prefilterProg, cubeGeo, faceViews, prefilter, mip, prefilterSize >> mip);
  }

  // ---- 7.5 BRDF LUT（RG16F，无输入纯数学积分）----
  const brdfLut = gl.createTexture();
  if (!brdfLut) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, brdfLut);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16F, lutSize, lutSize);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, brdfLut, 0);
  gl.viewport(0, 0, lutSize, lutSize);
  gl.useProgram(lutProg);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // 收尾：恢复中性状态（调用方再按需开启深度/剔除）
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST);
  return { envCube, irradiance, prefilter, brdfLut, maxPrefilterLod: prefilterMips - 1 };
}

function setCubeParams(gl: WebGL2RenderingContext, minFilter: number): void {
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** 渲染 cubemap 的 6 个面（level 指定 mip 级号，预过滤逐级渲染用） */
function renderAllFaces(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  cubeGeo: GpuGeometry,
  faceViews: Mat4[],
  cube: WebGLTexture,
  level: number,
  size: number,
): void {
  for (let face = 0; face < 6; face++) {
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, faceViews[face].elements);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, cube, level,
    );
    gl.viewport(0, 0, size, size);
    gl.bindVertexArray(cubeGeo.vao);
    gl.drawElements(gl.TRIANGLES, cubeGeo.indexCount, gl.UNSIGNED_SHORT, 0);
  }
}
