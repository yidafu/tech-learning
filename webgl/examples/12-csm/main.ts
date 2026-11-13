// 12 级联阴影（CSM）：把相机视锥按 practical split scheme 切成 3 段，
// 每段一张 2048² 深度图（纹理数组），近级小而精、远级大而粗。
// 对应分册：《05-第五阶段/11-级联阴影CSM.md》。
// 场景：长走廊地面 + 远近高低错落的物体；HUD 打印每级纹素世界尺寸。
// 交互：[ / ] 调 λ（分割方案）、S 纹素对齐开关（关掉后转相机看阴影抖动）、
// C 按级染色（红近/绿中/蓝远）、B 画每级光锥线框、空格开关阴影。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, createSphere, drawGeometry } from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { degToRad, Mat4, Vec3, transformHomogeneous } from '../src/common/math';
import {
  attachCascadeLayer, createCascadeShadowTarget, createLightBasis,
  fitCascadeCamera, frustumSegmentCorners, practicalSplits, CASCADE_COUNT,
} from './csm';
import type { CascadeCamera } from './csm';
import { debugFS, debugVS, mainFS, mainVS, shadowFS, shadowVS } from './shaders';

const SHADOW_SIZE = 2048;

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLElement;
const gl = createGL2(canvas);

const shadowProgram = createProgramOrFail(gl, shadowVS, shadowFS);
const mainProgram = createProgramOrFail(gl, mainVS, mainFS);
const debugProgram = createProgramOrFail(gl, debugVS, debugFS);

/* ---------- 光源与级联状态 ---------- */
const LIGHT_DIR = new Vec3(0.55, 0.9, 0.35).normalize(); // 指向光源（固定方向）
const lightBasis = createLightBasis(LIGHT_DIR);          // 只有旋转、逐帧不变
const shadow = createCascadeShadowTarget(gl, SHADOW_SIZE, CASCADE_COUNT);
const cascades: CascadeCamera[] = Array.from(
  { length: CASCADE_COUNT }, () => ({ lightVP: new Mat4(), texelWorldSize: 0, depthRange: 1 }),
);
const splitFars: number[] = new Array(CASCADE_COUNT).fill(0);
const lightVPArray = new Float32Array(16 * CASCADE_COUNT); // 一次上传 uLightVP[3]
const singleMap = { lightVP: new Mat4(), texelWorldSize: 0, depthRange: 1 }; // 对照：单张覆盖全程
let lambda = 0.85;   // practical split 的混合系数
let snapTexels = true;

/* ---------- 场景：走廊地面 + 近景小物 + 中景柱阵 + 远景高塔 ---------- */
interface Obj { geo: GpuGeometry; matrix: Mat4; color: Vec3 }
const boxGeo = createGpuGeometry(gl, createBox(1, 1, 1));
const sphereGeo = createGpuGeometry(gl, createSphere(0.55, 32, 16));
const trs = (x: number, y: number, z: number, angle: number, s: Vec3): Mat4 =>
  new Mat4().fromTRS(new Vec3(x, y, z), new Vec3(0, 1, 0), angle, s);

const objects: Obj[] = [
  { geo: createGpuGeometry(gl, createBox(64, 0.3, 96)), matrix: new Mat4().fromTranslation(0, -0.15, -16),
    color: new Vec3(0.42, 0.44, 0.48) },
  // 近景：小物体，检验近级阴影的细节（0.5m 级物体要能投出干净锐利的影子）
  { geo: boxGeo, matrix: trs(-1.6, 0.5, 0.6, degToRad(30), new Vec3(0.7, 1.0, 0.7)), color: new Vec3(0.91, 0.55, 0.3) },
  { geo: boxGeo, matrix: trs(1.0, 0.25, -1.3, degToRad(-15), new Vec3(0.5, 0.5, 0.5)), color: new Vec3(0.35, 0.62, 0.9) },
  { geo: boxGeo, matrix: trs(0.2, 0.15, 1.8, degToRad(60), new Vec3(0.3, 0.3, 0.3)), color: new Vec3(0.55, 0.78, 0.4) },
  { geo: sphereGeo, matrix: new Mat4(), color: new Vec3(0.92, 0.86, 0.7) }, // 浮动球，动画里重建矩阵
  // 中景：柱阵（z ≈ -14 ~ -22）
  { geo: boxGeo, matrix: trs(-3.5, 1.3, -15, 0, new Vec3(0.9, 2.6, 0.9)), color: new Vec3(0.7, 0.65, 0.6) },
  { geo: boxGeo, matrix: trs(0, 1.55, -17, degToRad(20), new Vec3(1.0, 3.1, 1.0)), color: new Vec3(0.75, 0.7, 0.62) },
  { geo: boxGeo, matrix: trs(3.5, 1.3, -15, 0, new Vec3(0.9, 2.6, 0.9)), color: new Vec3(0.7, 0.65, 0.6) },
  { geo: boxGeo, matrix: trs(0, 0.4, -22, degToRad(-30), new Vec3(3.2, 0.8, 1.4)), color: new Vec3(0.6, 0.66, 0.72) },
  // 远景：高塔（z ≈ -34 ~ -52，远级管辖，阴影允许粗一些）
  { geo: boxGeo, matrix: trs(-6, 2.2, -36, degToRad(10), new Vec3(1.6, 4.4, 1.6)), color: new Vec3(0.66, 0.6, 0.56) },
  { geo: boxGeo, matrix: trs(6, 2.2, -36, degToRad(-10), new Vec3(1.6, 4.4, 1.6)), color: new Vec3(0.66, 0.6, 0.56) },
  { geo: boxGeo, matrix: trs(0, 3.0, -48, degToRad(45), new Vec3(2.2, 6.0, 2.2)), color: new Vec3(0.72, 0.58, 0.5) },
  { geo: boxGeo, matrix: trs(-10, 1.7, -52, 0, new Vec3(1.4, 3.4, 1.4)), color: new Vec3(0.6, 0.64, 0.66) },
  { geo: boxGeo, matrix: trs(10, 1.7, -52, 0, new Vec3(1.4, 3.4, 1.4)), color: new Vec3(0.6, 0.64, 0.66) },
];
const SPHERE_HOME = new Vec3(0.1, 1.5, -0.4);
const SPHERE_IDX = 4;

const camera = new PerspectiveCamera(55, 1, 0.5, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.2, -6);
controls.minRadius = 3;
controls.maxRadius = 45;

/* ---------- 交互开关 ---------- */
let shadowEnabled = 1.0;
let showTint = false;
let showBoxes = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') shadowEnabled = shadowEnabled > 0.5 ? 0 : 1;
  if (e.code === 'KeyC') showTint = !showTint;
  if (e.code === 'KeyB') showBoxes = !showBoxes;
  if (e.code === 'KeyS') snapTexels = !snapTexels;
  if (e.code === 'BracketLeft') lambda = Math.max(0, lambda - 0.05);
  if (e.code === 'BracketRight') lambda = Math.min(1, lambda + 0.05);
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.09, 0.1, 0.14, 1);

/* ---------- 每帧拟合级联 ---------- */
const vp = new Mat4();
const invVP = new Mat4();
const corners: Vec3[] = Array.from({ length: 8 }, () => new Vec3());

function updateCascades(): void {
  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());
  if (!Mat4.invert(invVP, vp)) throw new Error('相机矩阵不可逆');
  const splits = practicalSplits(camera.near, camera.far, CASCADE_COUNT, lambda);
  let depthNear = camera.near;
  for (let i = 0; i < CASCADE_COUNT; i++) {
    frustumSegmentCorners(invVP, camera.position, camera.near, depthNear, splits[i], corners);
    fitCascadeCamera(corners, lightBasis, SHADOW_SIZE, snapTexels, cascades[i]);
    splitFars[i] = splits[i];
    depthNear = splits[i];
    lightVPArray.set(cascades[i].lightVP.elements, i * 16);
  }
  // 对照量：单张 SHADOW_SIZE 深度图要罩住整程视锥时的纹素尺寸
  frustumSegmentCorners(invVP, camera.position, camera.near, camera.near, camera.far, corners);
  fitCascadeCamera(corners, lightBasis, SHADOW_SIZE, false, singleMap);
}

/* ---------- 每级光锥的调试线框 ---------- */
// NDC 立方体 8 角、12 条边：每对 (i, i^bit) 只在 partner 更大时入列，正好每边一次
const EDGE_PAIRS: Array<readonly [number, number]> = [];
for (let i = 0; i < 8; i++) {
  for (const bit of [1, 2, 4]) if ((i ^ bit) > i) EDGE_PAIRS.push([i, i ^ bit]);
}
const CASCADE_COLORS = [
  [1.0, 0.35, 0.3], // 级 0 红
  [0.4, 1.0, 0.5],  // 级 1 绿
  [0.45, 0.6, 1.0], // 级 2 蓝
];
const lineVao = gl.createVertexArray();
const lineVbo = gl.createBuffer();
gl.bindVertexArray(lineVao);
gl.bindBuffer(gl.ARRAY_BUFFER, lineVbo);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
const lineVerts = new Float32Array(CASCADE_COUNT * EDGE_PAIRS.length * 2 * 3);
const invLightVP = new Mat4();

function drawCascadeBoxes(): void {
  for (let c = 0; c < CASCADE_COUNT; c++) {
    if (!Mat4.invert(invLightVP, cascades[c].lightVP)) continue;
    let o = c * EDGE_PAIRS.length * 2 * 3;
    for (const [a, b] of EDGE_PAIRS) {
      for (const i of [a, b]) {
        const h = transformHomogeneous(invLightVP, i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, 1);
        const w = h.w === 0 ? 1 : h.w;
        lineVerts[o++] = h.x / w;
        lineVerts[o++] = h.y / w;
        lineVerts[o++] = h.z / w;
      }
    }
  }
  gl.useProgram(debugProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(debugProgram, 'uViewProjection'), false, vp.elements);
  gl.bindVertexArray(lineVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineVbo);
  gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.DYNAMIC_DRAW);
  for (let c = 0; c < CASCADE_COUNT; c++) {
    gl.uniform3fv(gl.getUniformLocation(debugProgram, 'uColor'), CASCADE_COLORS[c]);
    gl.drawArrays(gl.LINES, c * EDGE_PAIRS.length * 2, EDGE_PAIRS.length * 2);
  }
  gl.bindVertexArray(null);
}

/* ---------- HUD ---------- */
let hudClock = 0;
function updateHud(): void {
  const texels = cascades.map((c) => c.texelWorldSize);
  hud.innerHTML =
    `<a href="../index.html">返回目录</a>\n` +
    `12 级联阴影 CSM：3 级 x ${SHADOW_SIZE}² 深度数组 | practical split λ=${lambda.toFixed(2)}（[ / ] 调整）\n` +
    `分割深度: ${camera.near} -> ${splitFars.map((z) => z.toFixed(1)).join(' -> ')}\n` +
    `每级纹素世界尺寸: ${texels.map((t) => t.toFixed(4)).join(' / ')}（单张罩全程 ≈ ${singleMap.texelWorldSize.toFixed(4)}）\n` +
    `S 纹素对齐: ${snapTexels ? '开' : '关（转相机看阴影边缘抖动）'} | 空格 阴影开关\n` +
    `C 按级染色: ${showTint ? '开' : '关'} | B 光锥线框: ${showBoxes ? '开' : '关'} | 拖拽/滚轮 = 轨道相机`;
}

/* ---------- 主循环 ---------- */
const Y_AXIS = new Vec3(0, 1, 0);
let elapsed = 0;
let prev = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  elapsed += dt;
  prev = now;
  controls.update(dt);
  // 浮动球：验证动态物体在各级下阴影都正确
  objects[SPHERE_IDX].matrix.fromTRS(
    new Vec3(SPHERE_HOME.x, SPHERE_HOME.y + Math.sin(elapsed * 1.4) * 0.3, SPHERE_HOME.z),
    Y_AXIS, elapsed * 1.1, new Vec3(1, 1, 1),
  );
  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  updateCascades();

  // ---- Pass 1：阴影 pass，逐级渲染（每级换深度附件层，只画深度） ----
  gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
  gl.useProgram(shadowProgram);
  for (let c = 0; c < CASCADE_COUNT; c++) {
    attachCascadeLayer(gl, shadow, c);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, 'uLightVP'), false, cascades[c].lightVP.elements);
    for (const obj of objects) {
      gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, 'uModel'), false, obj.matrix.elements);
      drawGeometry(gl, obj.geo);
    }
  }

  // ---- Pass 2：主 pass（真实相机，片元里按视深选级采样） ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(mainProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uViewProjection'), false, vp.elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uView'), false, camera.updateViewMatrix().elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uLightVP[0]'), false, lightVPArray);
  gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uLightDir'), [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z]);
  gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uCameraPosition'),
    [camera.position.x, camera.position.y, camera.position.z]);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uTexelSize'), 1 / SHADOW_SIZE);
  gl.uniform1fv(gl.getUniformLocation(mainProgram, 'uSplitFar[0]'), splitFars);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uNearDepth'), camera.near);
  gl.uniform1fv(gl.getUniformLocation(mainProgram, 'uNormalOffset[0]'),
    cascades.map((c) => c.texelWorldSize * 1.5));
  gl.uniform1fv(gl.getUniformLocation(mainProgram, 'uBiasTexelNdc[0]'),
    cascades.map((c) => c.texelWorldSize / c.depthRange));
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uBlendBand'), 0.15);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uShadowEnabled'), shadowEnabled);
  gl.uniform1f(gl.getUniformLocation(mainProgram, 'uShowCascadeTint'), showTint ? 1 : 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, shadow.texture);
  gl.uniform1i(gl.getUniformLocation(mainProgram, 'uShadowMap'), 0);

  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(mainProgram, 'uModel'), false, obj.matrix.elements);
    gl.uniform3fv(gl.getUniformLocation(mainProgram, 'uBaseColor'),
      [obj.color.x, obj.color.y, obj.color.z]);
    drawGeometry(gl, obj.geo);
  }

  if (showBoxes) drawCascadeBoxes();

  hudClock += dt;
  if (hudClock > 0.25) {
    hudClock = 0;
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
