// 08 阴影：shadow map 两 pass（光源视角渲染深度 -> 主 pass 采样对比）+ 3x3 PCF 软阴影。
// 对应分册：《05-第五阶段/02-阴影与PCF软阴影.md》。
// 场景：地面 + 三个立方体 + 一个浮动自转的球；空格切换阴影开关做对比。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, createSphere, drawGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { degToRad, Mat4, Vec3 } from '../src/common/math';
import { createShadowTarget, fitLightCamera } from './shadow';
import type { GpuGeometry } from '../src/common/geometry';
import { mainFS, mainVS, shadowFS, shadowVS } from './shaders';

const SHADOW_SIZE = 2048;
const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);

const shadowProgram = createProgramOrFail(gl, shadowVS, shadowFS);
const mainProgram = createProgramOrFail(gl, mainVS, mainFS);

/* ---------- 光源与光相机：固定方向的平行光，正交投影恰好罩住场景 AABB ---------- */
const LIGHT_DIR = new Vec3(0.6, 1.0, 0.45).normalize(); // 指向光源
const lightCamera = fitLightCamera(
  LIGHT_DIR, new Vec3(-4, -0.2, -4), new Vec3(4, 3, 4), new Vec3(0, 1, 0),
);
const lightVP = new Mat4().copy(lightCamera.lightProj).multiply(lightCamera.lightView);
const shadow = createShadowTarget(gl, SHADOW_SIZE);

/* ---------- 场景：地面 + 三个盒子 + 浮动球（unit 几何 + 模型矩阵缩放摆放） ---------- */
interface Obj {
  geo: GpuGeometry;
  matrix: Mat4;
  color: Vec3;
  spin: number; // 自转速度（球浮动动画在循环里叠加）
}
const boxGeo = createGpuGeometry(gl, createBox(1, 1, 1));
const sphereGeo = createGpuGeometry(gl, createSphere(0.55, 32, 16));
const objects: Obj[] = [
  { geo: boxGeo, matrix: new Mat4().fromTRS(new Vec3(0, -0.1, 0), new Vec3(0, 1, 0), 0, new Vec3(8, 0.2, 8)), color: new Vec3(0.42, 0.45, 0.5), spin: 0 },
  { geo: boxGeo, matrix: new Mat4().fromTRS(new Vec3(-1.4, 0.6, 0.6), new Vec3(0, 1, 0), degToRad(25), new Vec3(1.1, 1.2, 1.1)), color: new Vec3(0.91, 0.55, 0.3), spin: 0 },
  { geo: boxGeo, matrix: new Mat4().fromTRS(new Vec3(1.5, 0.45, -0.9), new Vec3(0, 1, 0), degToRad(-40), new Vec3(0.8, 0.9, 0.8)), color: new Vec3(0.35, 0.62, 0.9), spin: 0 },
  { geo: boxGeo, matrix: new Mat4().fromTRS(new Vec3(0.4, 0.3, 1.8), new Vec3(0, 1, 0), degToRad(60), new Vec3(0.55, 0.55, 0.55)), color: new Vec3(0.55, 0.78, 0.4), spin: 0 },
  { geo: sphereGeo, matrix: new Mat4(), color: new Vec3(0.92, 0.86, 0.7), spin: 1.1 },
];
const sphereHome = new Vec3(0.2, 1.7, -0.4);

const camera = new PerspectiveCamera(50, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.6, 0);
controls.minRadius = 4;
controls.maxRadius = 16;

let shadowEnabled = 1.0;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') shadowEnabled = shadowEnabled > 0.5 ? 0 : 1;
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.1, 0.11, 0.15, 1);

const vp = new Mat4();
const Y_AXIS = new Vec3(0, 1, 0);
let elapsed = 0;
let prev = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  elapsed += dt;
  prev = now;
  controls.update(dt);
  // 球：浮动 + 自转（矩阵每帧重建，验证动态物体的阴影也正确）
  objects[4].matrix.fromTRS(
    new Vec3(sphereHome.x, sphereHome.y + Math.sin(elapsed * 1.4) * 0.35, sphereHome.z),
    Y_AXIS, objects[4].spin * elapsed, new Vec3(1, 1, 1),
  );

  // ---- Pass 1：阴影 pass（以光源为相机，只渲染深度） ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.fbo);
  gl.viewport(0, 0, shadow.size, shadow.size);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(shadowProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, 'uLightVP'), false, lightVP.elements);
  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, 'uModel'), false, obj.matrix.elements);
    drawGeometry(gl, obj.geo);
  }

  // ---- Pass 2：主 pass（真实相机，片元里采样 shadow map 对比） ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());

  gl.useProgram(mainProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uViewProjection'), false, vp.elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uLightVP'), false, lightVP.elements);
  gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uLightDir'), [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z]);
  gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uCameraPosition'),
    [camera.position.x, camera.position.y, camera.position.z]);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uShadowTexelSize'), 1 / SHADOW_SIZE);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uShadowEnabled'), shadowEnabled);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadow.texture);
  gl.uniform1i(gl.getUniformLocation(mainProgram, 'uShadowMap'), 0);

  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uModel'), false, obj.matrix.elements);
    gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uBaseColor'),
      [obj.color.x, obj.color.y, obj.color.z]);
    drawGeometry(gl, obj.geo);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
