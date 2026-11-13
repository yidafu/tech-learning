// 05 轨道相机控制：PerspectiveCamera + OrbitControls（src/common/controls.ts）。
// 对应分册：《03-第三阶段/03-引擎最小核心.md》2.2（球坐标 + 指数缩放 + 帧率无关阻尼）
// 与 2.4 的最小可跑示例（旋转的方盒）。
// 渲染循环按 2.1 的 deltaTime 约定手写（速度用秒做单位、dt 钳制上限）；分册提供 RenderLoop 类。

import { createGL2, createProgram, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, drawGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { Mat4, Vec3 } from '../src/common/math';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);

/* ---------- 着色器：漫反射（分册 2.4 的最小材质） ---------- */
const VS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;   // 非均匀缩放下法线仍正确的关键（本示例用 mat3(uModel) 近似）
out vec3 vWorldNormal;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjection * uView * world;  // 列向量约定：越左越后作用
}
`;
const FS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldNormal;
uniform vec3 uBaseColor;
uniform vec3 uLightDir;     // 指向光源的方向（世界系）
out vec4 fragColor;
void main() {
  vec3 n = normalize(vWorldNormal);
  float ndl = max(dot(n, normalize(uLightDir)), 0.0);
  vec3 color = uBaseColor * (0.15 + 0.85 * ndl);  // 环境光 + 漫反射
  fragColor = vec4(color, 1.0);
}
`;
const program = createProgram(gl, VS, FS);
if (!program) throw new Error('着色器创建失败，看控制台');
const U = {
  model: gl.getUniformLocation(program, 'uModel'),
  view: gl.getUniformLocation(program, 'uView'),
  proj: gl.getUniformLocation(program, 'uProjection'),
  normal: gl.getUniformLocation(program, 'uNormalMatrix'),
  baseColor: gl.getUniformLocation(program, 'uBaseColor'),
  lightDir: gl.getUniformLocation(program, 'uLightDir'),
};

/* ---------- 相机与控制器 ---------- */
const camera = new PerspectiveCamera(60, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.6, 0);
controls.minRadius = 2.5;
controls.maxRadius = 12;

/* ---------- 几何：一个自转方盒 + 地面参照 ---------- */
const cube = createGpuGeometry(gl, createBox(1.4, 1.4, 1.4));
const ground = createGpuGeometry(gl, createBox(6, 0.1, 6));

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.08, 0.09, 0.12, 1);

/* ---------- 渲染循环（deltaTime 约定见分册 2.1） ---------- */
const Y_AXIS = new Vec3(0, 1, 0);
const LIGHT_DIR = new Vec3(1, 1, 0.8).normalize();
const model = new Mat4();
const groundModel = new Mat4().fromTranslation(0, -0.35, 0);
let angle = 0;
let prev = performance.now();
let fpsSmoothed = 0;
const fpsEl = document.getElementById('fps');

function drawMesh(mesh: ReturnType<typeof createGpuGeometry>, m: Mat4, color: [number, number, number]): void {
  gl.uniformMatrix4fv(U.model, false, m.elements);
  // 旋转/均匀缩放下法线矩阵 = 左上 3x3；完整实现见分册的 Mat3.normalFromMat4
  const e = m.elements;
  gl.uniformMatrix3fv(U.normal, false, [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]]);
  gl.uniform3fv(U.baseColor, color);
  drawGeometry(gl, mesh);
}

function frame(now: number): void {
  const delta = Math.min((now - prev) / 1000, 0.1); // 毫秒转秒 + clamp（分册 2.1 四件事）
  prev = now;
  controls.update(delta);          // 阻尼收敛：k = 1 - e^(-lambda * delta)
  angle += 0.6 * delta;            // 每秒 0.6 弧度，与刷新率无关
  model.fromTRS(new Vec3(0, 0.75, 0), Y_AXIS, angle, new Vec3(1, 1, 1));

  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniformMatrix4fv(U.view, false, camera.updateViewMatrix().elements);
  gl.uniformMatrix4fv(U.proj, false, camera.updateProjectionMatrix().elements);
  gl.uniform3fv(U.lightDir, [LIGHT_DIR.x, LIGHT_DIR.y, LIGHT_DIR.z]);
  drawMesh(ground, groundModel, [0.22, 0.24, 0.3]);
  drawMesh(cube, model, [0.95, 0.75, 0.55]);

  // 帧率统计：指数平滑，读数不乱跳（分册 2.1 的消费方式之三）
  const fps = 1 / delta;
  fpsSmoothed = fpsSmoothed === 0 ? fps : fpsSmoothed * 0.95 + fps * 0.05;
  if (fpsEl) fpsEl.textContent = `FPS ${fpsSmoothed.toFixed(0)}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
