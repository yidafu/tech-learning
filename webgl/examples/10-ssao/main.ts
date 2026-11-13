// 10 屏幕空间环境光遮蔽（SSAO）：G-buffer(MRT) -> 遮蔽计算 -> 模糊 -> 光照合成。
// 对应分册：《05-第五阶段/09-屏幕空间环境光遮蔽.md》。
// 场景：墙角 + 盒子 + 球——凹腔与接触处是 AO 的主场。空格开关 AO，V 查看遮蔽缓冲。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, createSphere, drawGeometry } from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { degToRad, Mat4, Vec3 } from '../src/common/math';
import {
  createGBuffer, createNoiseTexture, createRTarget, createSsaoKernel,
  disposeGBuffer, disposeRTarget,
} from './ssao';
import { blurFS, fullscreenVS, gbufferFS, gbufferVS, lightingFS, ssaoFS } from './shaders';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);
if (!gl.getExtension('EXT_color_buffer_float')) {
  throw new Error('EXT_color_buffer_float 不可用：G-buffer 与遮蔽图都是浮点渲染目标');
}

/* ---------- 程序 ---------- */
const gbufferProg = createProgramOrFail(gl, gbufferVS, gbufferFS);
const ssaoProg = createProgramOrFail(gl, fullscreenVS, ssaoFS);
const blurProg = createProgramOrFail(gl, fullscreenVS, blurFS);
const lightingProg = createProgramOrFail(gl, fullscreenVS, lightingFS);

/* ---------- 场景：墙角 + 盒子 + 球 ---------- */
interface Obj { geo: GpuGeometry; matrix: Mat4 }
const unitBox = createGpuGeometry(gl, createBox(1, 1, 1));
const sphereGeo = createGpuGeometry(gl, createSphere(0.6, 40, 20));
const trs = (x: number, y: number, z: number, angle: number, s: Vec3): Mat4 =>
  new Mat4().fromTRS(new Vec3(x, y, z), new Vec3(0, 1, 0), angle, s);
const scaled = (w: number, h: number, d: number): GpuGeometry =>
  createGpuGeometry(gl, createBox(w, h, d));

const objects: Obj[] = [
  // 地面用厚盒而不是单面平面：G-buffer 里两面都有法线，不会因剔除设置意外露底
  { geo: scaled(14, 0.2, 14), matrix: new Mat4().fromTranslation(0, -0.1, 0) },
  // 两面墙：一个内凹墙角（AO 最明显的结构）
  { geo: scaled(10, 4, 0.4), matrix: new Mat4().fromTranslation(0, 2, -5) },
  { geo: scaled(0.4, 4, 10), matrix: new Mat4().fromTranslation(-5, 2, 0) },
  // 盒子：贴墙、贴地、堆叠
  { geo: unitBox, matrix: trs(-3.4, 0.75, -3.4, degToRad(30), new Vec3(1.5, 1.5, 1.5)) },
  { geo: unitBox, matrix: trs(-3.6, 2.15, -3.6, degToRad(10), new Vec3(0.8, 0.8, 0.8)) },
  { geo: unitBox, matrix: trs(-1.2, 0.5, -2.2, degToRad(-20), new Vec3(1, 1, 1)) },
  { geo: unitBox, matrix: trs(0.8, 0.45, -1.4, degToRad(50), new Vec3(1.5, 0.9, 0.6)) },
  // 球：与地面接触处的圆形遮蔽
  { geo: sphereGeo, matrix: trs(1.8, 0.6, 0.8, 0, new Vec3(1, 1, 1)) },
  { geo: sphereGeo, matrix: trs(-2.6, 0.45, 1.6, 0, new Vec3(0.75, 0.75, 0.75)) },
];

const camera = new PerspectiveCamera(50, 1, 0.1, 50);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-0.6, 0.8, -0.6);
controls.minRadius = 3;
controls.maxRadius = 14;

const LIGHT_DIR = new Vec3(0.5, 0.9, 0.35).normalize(); // 指向光源（世界空间）
const LIGHT_COLOR = new Vec3(1.1, 1.05, 0.95);

/* ---------- SSAO 数据 ---------- */
const kernel = createSsaoKernel(64);
const noiseTex = createNoiseTexture(gl);
const RADIUS = 0.7;  // 场景包络约 10 个单位，半径取其 7%（分册 8.6 参数表）
const BIAS = 0.025;

let aoEnabled = 1.0;
let debugAo = 0.0;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') aoEnabled = aoEnabled > 0.5 ? 0 : 1;
  if (e.code === 'KeyV') debugAo = debugAo > 0.5 ? 0 : 1;
});

/* ---------- 离屏目标（resize 时整体重建） ---------- */
let gbuffer = createGBuffer(gl, canvas.width, canvas.height);
let ssaoTarget = createRTarget(gl, canvas.width, canvas.height);
let blurTarget = createRTarget(gl, canvas.width, canvas.height);
const emptyVao = gl.createVertexArray();

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.05, 0.05, 0.08, 1);

const vp = new Mat4();
let prev = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  controls.update(dt);
  if (resizeCanvas(gl, canvas)) {
    // 中间纹理不会自动跟随 canvas，resize 时整体重建（03-后处理管线"常见坑"6 的纪律）
    disposeGBuffer(gl, gbuffer);
    disposeRTarget(gl, ssaoTarget);
    disposeRTarget(gl, blurTarget);
    gbuffer = createGBuffer(gl, canvas.width, canvas.height);
    ssaoTarget = createRTarget(gl, canvas.width, canvas.height);
    blurTarget = createRTarget(gl, canvas.width, canvas.height);
  }
  camera.setAspect(canvas.width / canvas.height);
  const view = camera.updateViewMatrix();
  vp.copy(camera.updateProjectionMatrix()).multiply(view);
  const w = canvas.width;
  const h = canvas.height;

  // ---- Pass 1：G-buffer（视空间位置 + 法线 + 深度）----
  gl.bindFramebuffer(gl.FRAMEBUFFER, gbuffer.fbo);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(gbufferProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(gbufferProg, 'uViewProjection'), false, vp.elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(gbufferProg, 'uView'), false, view.elements);
  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(gbufferProg, 'uModel'), false, obj.matrix.elements);
    drawGeometry(gl, obj.geo);
  }

  // ---- Pass 2：SSAO 遮蔽计算（64 采样 x 噪声旋转）----
  gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoTarget.fbo);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(ssaoProg);
  gl.uniform3fv(gl.getUniformLocation(ssaoProg, 'uSamples'), kernel);
  gl.uniform2f(gl.getUniformLocation(ssaoProg, 'uNoiseScale'), w / 4, h / 4);
  gl.uniform1f(gl.getUniformLocation(ssaoProg, 'uRadius'), RADIUS);
  gl.uniform1f(gl.getUniformLocation(ssaoProg, 'uBias'), BIAS);
  gl.uniformMatrix4fv(gl.getUniformLocation(ssaoProg, 'uProjection'), false,
    camera.updateProjectionMatrix().elements);
  gl.uniform1i(gl.getUniformLocation(ssaoProg, 'uPosition'), 0);
  gl.uniform1i(gl.getUniformLocation(ssaoProg, 'uNormal'), 1);
  gl.uniform1i(gl.getUniformLocation(ssaoProg, 'uNoise'), 2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.position);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.normal);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // ---- Pass 3：4x4 盒滤波去噪 ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, blurTarget.fbo);
  gl.useProgram(blurProg);
  gl.uniform2f(gl.getUniformLocation(blurProg, 'uTexelSize'), 1 / w, 1 / h);
  gl.uniform1i(gl.getUniformLocation(blurProg, 'uOcclusion'), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ssaoTarget.texture);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // ---- Pass 4：光照合成（AO 只乘环境光）----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, w, h);
  const lightDirView = LIGHT_DIR.clone().transformDirection(view); // 世界 -> 视空间
  gl.useProgram(lightingProg);
  gl.uniform3fv(gl.getUniformLocation(lightingProg, 'uLightDirView'),
    [lightDirView.x, lightDirView.y, lightDirView.z]);
  gl.uniform3fv(gl.getUniformLocation(lightingProg, 'uLightColor'),
    [LIGHT_COLOR.x, LIGHT_COLOR.y, LIGHT_COLOR.z]);
  gl.uniform1f(gl.getUniformLocation(lightingProg, 'uAoEnabled'), aoEnabled);
  gl.uniform1f(gl.getUniformLocation(lightingProg, 'uDebugAo'), debugAo);
  gl.uniform1i(gl.getUniformLocation(lightingProg, 'uPosition'), 0);
  gl.uniform1i(gl.getUniformLocation(lightingProg, 'uNormal'), 1);
  gl.uniform1i(gl.getUniformLocation(lightingProg, 'uAo'), 2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.position);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.normal);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, blurTarget.texture);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.DEPTH_TEST);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
