// 03 纹理地球：程序化双纹理 + Blinn-Phong + 独立自转的透明云层。
// 对应分册：《02-第二阶段/08-实践-纹理地球.md》（完整代码 main.js）。
// 流程：球体生成器 -> 双纹理 -> 地球着色（Gamma/海洋高光）-> 云层透明遍 -> 动画与交互。

import { createGL2, createProgramOrFail, resizeCanvas, uploadCanvasTexture } from '../src/common/gl';
import { createGpuGeometry, createSphere, drawGeometry } from '../src/common/geometry';
import { degToRad, Mat4, Vec3 } from '../src/common/math';
import { makeCloudCanvas, makeEarthCanvas } from './texture';
import { cloudFS, earthFS, earthVS } from './shaders';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);

const earthProgram = createProgramOrFail(gl, earthVS, earthFS);
const cloudProgram = createProgramOrFail(gl, earthVS, cloudFS); // 顶点着色器两球共用

// ---------- 第 1 步：球体几何（生成器见 src/common/geometry.ts） ----------
const earthMesh = createGpuGeometry(gl, createSphere(1.0, 64, 32));
const cloudMesh = createGpuGeometry(gl, createSphere(1.02, 64, 32)); // 半径差 0.02 防z-fighting

// ---------- 第 2 步：双纹理（TEXTURE0 地球 / TEXTURE1 云） ----------
uploadCanvasTexture(gl, 0, makeEarthCanvas());
uploadCanvasTexture(gl, 1, makeCloudCanvas());

// ---------- 第 5 步：动画状态与交互 ----------
const AXIAL_TILT = degToRad(23.4); // 地轴倾角
const Y_AXIS = new Vec3(0, 1, 0);
const Z_AXIS = new Vec3(0, 0, 1);
const EYE = new Vec3(0, 0.35, 3.1);
const ORIGIN = new Vec3(0, 0, 0);
const UP = new Vec3(0, 1, 0);
const sun = new Vec3(1, 0.3, 0.6);

let earthAngle = 0;
let cloudAngle = 0;
let paused = false;
let sunAzimuth = 0.9;
let sunElevation = 0.35;

window.addEventListener('pointermove', (e) => {
  sunAzimuth = (e.clientX / window.innerWidth - 0.5) * Math.PI * 2;
  sunElevation = 0.5 - (e.clientY / window.innerHeight) * 0.9;
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') paused = !paused;
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.015, 0.02, 0.05, 1);

/** 两球共用的矩阵/光照 uniform 上传 */
function setCommonUniforms(program: WebGLProgram, model: Mat4, vp: Mat4): void {
  gl.useProgram(program);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, model.elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewProjection'), false, vp.elements);
  gl.uniform3fv(gl.getUniformLocation(program, 'uLightDirection'), [
    sun.x, sun.y, sun.z,
  ]);
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05); // 钳制：防切后台回来 dt 巨大
  last = now;
  if (!paused) {
    earthAngle += dt * 0.25;            // rad/s
    cloudAngle += dt * 0.25 * 1.35;     // 云比地面快 35%
  }

  sun.set(
    Math.cos(sunElevation) * Math.cos(sunAzimuth),
    Math.sin(sunElevation),
    Math.cos(sunElevation) * Math.sin(sunAzimuth),
  );

  resizeCanvas(gl, canvas);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const vp = new Mat4()
    .perspective(Math.PI / 4, canvas.width / canvas.height, 0.5, 20)
    .multiply(new Mat4().lookAt(EYE, ORIGIN, UP));
  const tiltZ = new Mat4().fromRotation(Z_AXIS, AXIAL_TILT);

  // —— 不透明遍：地球（正常深度写入）——
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  const earthModel = new Mat4().copy(tiltZ)
    .multiply(new Mat4().fromRotation(Y_AXIS, earthAngle)); // 先自转再倾斜，地轴朝向固定
  setCommonUniforms(earthProgram, earthModel, vp);
  gl.uniform3fv(gl.getUniformLocation(earthProgram, 'uCameraPosition'), [EYE.x, EYE.y, EYE.z]);
  gl.uniform1i(gl.getUniformLocation(earthProgram, 'uEarth'), 0);
  drawGeometry(gl, earthMesh);

  // —— 透明遍：云层（开混合、关深度写入，画完恢复）——
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  const cloudModel = new Mat4().copy(tiltZ)
    .multiply(new Mat4().fromRotation(Y_AXIS, cloudAngle));
  setCommonUniforms(cloudProgram, cloudModel, vp);
  gl.uniform1i(gl.getUniformLocation(cloudProgram, 'uCloud'), 1);
  gl.uniform1f(gl.getUniformLocation(cloudProgram, 'uCloudOpacity'), 0.85);
  drawGeometry(gl, cloudMesh);
  gl.depthMask(true);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
