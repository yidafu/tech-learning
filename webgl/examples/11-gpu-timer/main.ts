// 11 GPU 性能度量：EXT_disjoint_timer_query_webgl2 分阶段计时 + CPU 帧统计并排显示。
// 对应分册：《05-第五阶段/10-GPU性能度量与剖析.md》。
// 三个 GPU 段：shadow（深度 pass）/ scene（盒子方阵 + 可调片元负载）/ post（全屏模糊）。
// ↑/↓ 调整片元着色器负载，观察 GPU 时间爬升而 CPU 时间几乎不动（GPU 瓶颈的典型形态）。
// 扩展不可用（Firefox/Safari/移动端）时显示降级提示，画面照常运行。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, drawGeometry } from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { Mat4, Vec3 } from '../src/common/math';
import { GpuFrameTimer } from './gpu-timer';
import type { GpuSectionTime } from './gpu-timer';

/* ---------- 着色器（GLSL ES 3.00） ---------- */

const depthVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uLightVP;
uniform mat4 uModel;
void main() { gl_Position = uLightVP * uModel * vec4(aPosition, 1.0); }
`;
const emptyFS = /* glsl */ `
#version 300 es
precision mediump float;
void main() {}
`;

const sceneVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat4 uLightVP;
out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vShadowCoord;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vShadowCoord = uLightVP * world;
  gl_Position = uViewProjection * world;
}
`;

const sceneFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vShadowCoord;
uniform sampler2DShadow uShadowMap;
uniform vec3 uLightDir;
uniform vec3 uCameraPosition;
uniform int uWorkload;      // 片元负载旋钮：循环次数（0 = 关）
out vec4 fragColor;

float calcShadow(vec3 N, vec3 L) {
  vec3 proj = vShadowCoord.xyz / vShadowCoord.w;
  proj = proj * 0.5 + 0.5;
  if (proj.z > 1.0 || proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0) return 1.0;
  float bias = max(0.05 * (1.0 - dot(N, L)), 0.005);
  return texture(uShadowMap, vec3(proj.xy, proj.z - bias));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPosition - vWorldPos);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  vec3 baseColor = vec3(0.55, 0.58, 0.62);
  vec3 color = baseColor * 0.15 + baseColor * ndl + vec3(0.4) * pow(max(dot(N, H), 0.0), 40.0) * ndl;
  color *= calcShadow(N, L);

  // 可调片元负载：与 07 册"着色器瓶颈试探"同思路，这里做成旋钮便于观察 GPU 时间
  float acc = 0.0;
  for (int i = 0; i < uWorkload; ++i) {
    float fi = float(i);
    acc += sin(dot(vWorldPos.xz, vec2(fi * 3.1 + 0.7, fi * 1.7 + 0.3)) + fi);
  }
  color *= 1.0 + acc * 0.015; // 结果必须写进输出，否则整个循环会被编译器删除

  fragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}
`;

const postVS = /* glsl */ `
#version 300 es
out vec2 vUV;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  vUV = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;
const postFS = /* glsl */ `
#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D uScene;
uniform vec2 uTexelSize;
void main() {
  vec3 c = texture(uScene, vUV).rgb * 0.2; // 3x3 模糊：一个便宜但真实的全屏 GPU pass
  c += texture(uScene, vUV + vec2(-1, 0) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(1, 0) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(0, -1) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(0, 1) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(-1, -1) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(1, -1) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(-1, 1) * uTexelSize).rgb * 0.1;
  c += texture(uScene, vUV + vec2(1, 1) * uTexelSize).rgb * 0.1;
  fragColor = vec4(c, 1.0);
}
`;

/* ---------- 初始化 ---------- */

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLElement;
const gl = createGL2(canvas);
const gpuTimer = new GpuFrameTimer(gl);

const depthProg = createProgramOrFail(gl, depthVS, emptyFS);
const sceneProg = createProgramOrFail(gl, sceneVS, sceneFS);
const postProg = createProgramOrFail(gl, postVS, postFS);

// 场景：地面 + 10x10 盒子方阵（同几何多 draw，负载集中在片元）
interface Obj { geo: GpuGeometry; matrix: Mat4 }
const unitBox = createGpuGeometry(gl, createBox(1, 1, 1));
const objects: Obj[] = [
  { geo: createGpuGeometry(gl, createBox(20, 0.2, 20)), matrix: new Mat4().fromTranslation(0, -0.1, 0) },
];
for (let ix = 0; ix < 10; ix++) {
  for (let iz = 0; iz < 10; iz++) {
    const x = (ix - 4.5) * 1.7;
    const z = (iz - 4.5) * 1.7;
    const h = 0.4 + ((ix * 7 + iz * 13) % 5) * 0.35; // 高低错落，阴影面积不等
    objects.push({
      geo: unitBox,
      matrix: new Mat4().fromTRS(new Vec3(x, h / 2, z), new Vec3(0, 1, 0), (ix + iz) * 0.17, new Vec3(0.9, h, 0.9)),
    });
  }
}

const camera = new PerspectiveCamera(55, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.8, 0);
controls.minRadius = 6;
controls.maxRadius = 30;

const LIGHT_DIR = new Vec3(0.55, 1.0, 0.4).normalize();
const lightView = new Mat4().lookAt(
  new Vec3(-LIGHT_DIR.x * 14, LIGHT_DIR.y * 14, -LIGHT_DIR.z * 14), new Vec3(0, 0, 0), new Vec3(0, 1, 0),
);
const lightProj = new Mat4().ortho(-11, 11, -11, 11, 2, 30);
const lightVP = new Mat4().copy(lightProj).multiply(lightView);

// 深度 FBO（比较模式，08 示例 shadow.ts 的精简版）
const SHADOW_SIZE = 1024;
const shadowTex = gl.createTexture();
if (!shadowTex) throw new Error('深度纹理创建失败');
gl.bindTexture(gl.TEXTURE_2D, shadowTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE, 0,
  gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
const shadowFbo = gl.createFramebuffer();
if (!shadowFbo) throw new Error('FBO 创建失败');
gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
gl.drawBuffers([gl.NONE]);
gl.readBuffer(gl.NONE);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// 场景离屏纹理（post 的输入，resize 时重建）
let sceneW = canvas.width;
let sceneH = canvas.height;
let sceneTex = gl.createTexture();
let sceneFbo = gl.createFramebuffer();
function rebuildSceneTarget(): void {
  gl.deleteTexture(sceneTex);
  gl.deleteFramebuffer(sceneFbo);
  sceneTex = gl.createTexture();
  sceneFbo = gl.createFramebuffer();
  if (!sceneTex || !sceneFbo) throw new Error('离屏目标创建失败');
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sceneW, sceneH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
rebuildSceneTarget();

let workload = 8;
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp') workload = Math.min(workload + 8, 96);
  if (e.code === 'ArrowDown') workload = Math.max(workload - 8, 0);
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.06, 0.07, 0.1, 1);

const emptyVao = gl.createVertexArray();
const vp = new Mat4();

/* ---------- 统计与 HUD ---------- */

interface SectionStat { sum: number; n: number; last: number; max: number }
const gpuStats = new Map<string, SectionStat>();
const cpuTimes: number[] = [];
let frames = 0;
let hudClock = 0;

function recordGpu(list: GpuSectionTime[]): void {
  for (const s of list) {
    const e = gpuStats.get(s.name) ?? { sum: 0, n: 0, last: 0, max: 0 };
    e.sum += s.ms;
    e.n += 1;
    e.last = s.ms;
    e.max = Math.max(e.max, s.ms);
    gpuStats.set(s.name, e);
  }
}

function updateHud(): void {
  const cpuAvg = cpuTimes.reduce((a, b) => a + b, 0) / Math.max(cpuTimes.length, 1);
  const cpuMax = cpuTimes.reduce((a, b) => Math.max(a, b), 0);
  const fps = cpuTimes.length > 0 ? 1000 / (cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length) : 0;
  let gpuTotal = 0;
  const rows: string[] = [];
  for (const [name, e] of gpuStats) {
    gpuTotal += e.sum / e.n;
    rows.push(`  ${name.padEnd(8)} avg ${(e.sum / e.n).toFixed(3)}ms  last ${e.last.toFixed(3)}ms  max ${e.max.toFixed(3)}ms`);
  }
  hud.innerHTML =
    `<a href="../index.html">返回目录</a><br>` +
    `11 GPU 性能度量（↑/↓ 调片元负载 = ${workload}，拖拽/滚轮 = 轨道相机）<br>` +
    (gpuTimer.available
      ? `扩展 EXT_disjoint_timer_query_webgl2 可用；disjoint 丢弃 ${gpuTimer.disjointCount} 次<br>` +
        `CPU 帧时间 avg ${cpuAvg.toFixed(2)}ms / max ${cpuMax.toFixed(2)}ms | fps ${fps.toFixed(0)}<br>` +
        `GPU 段耗时（落后 1~3 帧的滑动平均）：合计 ≈ ${gpuTotal.toFixed(3)}ms<br>` + rows.join('<br>')
      : `扩展不可用（Firefox/Safari/移动端不支持）——本机只能看 CPU 侧：<br>` +
        `CPU 帧时间 avg ${cpuAvg.toFixed(2)}ms / max ${cpuMax.toFixed(2)}ms | fps ${fps.toFixed(0)}<br>` +
        `GPU 归因回到 07 册 6.5.3 的试探法`);
  gpuStats.clear();
  cpuTimes.length = 0;
}

/* ---------- 主循环 ---------- */

let prev = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  controls.update(dt);
  const resized = resizeCanvas(gl, canvas);
  if (resized) {
    sceneW = canvas.width;
    sceneH = canvas.height;
    rebuildSceneTarget();
  }
  camera.setAspect(canvas.width / canvas.height);
  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());
  frames++;

  gpuTimer.beginFrame();

  // ---- Pass 1：阴影（深度 only）----
  gpuTimer.begin('shadow');
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
  gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(depthProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(depthProg, 'uLightVP'), false, lightVP.elements);
  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(depthProg, 'uModel'), false, obj.matrix.elements);
    drawGeometry(gl, obj.geo);
  }
  gpuTimer.end();

  // ---- Pass 2：场景（渲染进离屏纹理，post 的输入）----
  gpuTimer.begin('scene');
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
  gl.viewport(0, 0, sceneW, sceneH);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(sceneProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(sceneProg, 'uViewProjection'), false, vp.elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(sceneProg, 'uLightVP'), false, lightVP.elements);
  gl.uniform3fv(gl.getUniformLocation(sceneProg, 'uLightDir'), [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z]);
  gl.uniform3fv(gl.getUniformLocation(sceneProg, 'uCameraPosition'),
    [camera.position.x, camera.position.y, camera.position.z]);
  gl.uniform1i(gl.getUniformLocation(sceneProg, 'uWorkload'), workload);
  gl.uniform1i(gl.getUniformLocation(sceneProg, 'uShadowMap'), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadowTex);
  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(sceneProg, 'uModel'), false, obj.matrix.elements);
    drawGeometry(gl, obj.geo);
  }
  gpuTimer.end();

  // ---- Pass 3：后处理（3x3 模糊到屏幕）----
  gpuTimer.begin('post');
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(postProg);
  gl.uniform2f(gl.getUniformLocation(postProg, 'uTexelSize'), 1 / sceneW, 1 / sceneH);
  gl.uniform1i(gl.getUniformLocation(postProg, 'uScene'), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST);
  gpuTimer.end();

  gpuTimer.endFrame();
  const done = gpuTimer.poll();
  if (done) recordGpu(done);

  // CPU 帧时间：本帧从控制到提交完成（不含等待）
  const cpuEnd = performance.now();
  cpuTimes.push(cpuEnd - (now - 0)); // now 是 rAF 传进的本帧起点
  hudClock += dt;
  if (hudClock > 0.5) {
    hudClock = 0;
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
