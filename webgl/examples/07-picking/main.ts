// 07 射线拾取：悬停提亮、点击选中。射线与三角形求交的实现见本目录 raycast.ts。
// 对应分册：《04-第四阶段/05-交互系统.md》（Raycaster 推导 + Möller–Trumbore + 交互语义）。
// 交互语义沿用分册 4.4：hover = pointermove 逐次求交；click = 按下与抬起位移小于阈值才算点击，
// 与 OrbitControls 的拖拽互不干扰（控制器只改相机参数，不参与拾取）。

import { createGL2, createProgram, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, drawGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { Mat4, Vec3 } from '../src/common/math';
import { pointerToNDC, rayFromCamera, raycastGeometry } from './raycast';
import type { Ray } from './raycast';
import boxData from './boxes';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);

/* ---------- 着色器：漫反射 + uHighlight 高亮（hover / 选中两级） ---------- */
const VS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
out vec3 vNormal;
void main() {
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;
const FS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vNormal;
uniform vec3 uColor;
uniform float uHighlight;   // 0 无 / 0.35 悬停 / 0.9 选中
out vec4 fragColor;
void main() {
  float ndl = max(dot(normalize(vNormal), normalize(vec3(0.4, 0.9, 0.5))), 0.0);
  vec3 color = uColor * (0.2 + 0.8 * ndl);
  fragColor = vec4(mix(color, vec3(1.0), uHighlight), 1.0);
}
`;
const program = createProgram(gl, VS, FS);
if (!program) throw new Error('着色器创建失败，看控制台');
const uModel = gl.getUniformLocation(program, 'uModel');
const uVP = gl.getUniformLocation(program, 'uViewProjection');
const uColor = gl.getUniformLocation(program, 'uColor');
const uHighlight = gl.getUniformLocation(program, 'uHighlight');

/* ---------- 场景：一组缓慢自转的彩色立方体 ---------- */
interface Item {
  name: string;
  color: Vec3;
  position: Vec3;
  size: number;
  spinSpeed: number;
  angle: number;
  matrix: Mat4;
}
const items: Item[] = boxData.map((b) => ({
  ...b,
  angle: b.phase,
  matrix: new Mat4(),
}));
const geoData = createBox(1, 1, 1);
const geo = createGpuGeometry(gl, geoData);

const camera = new PerspectiveCamera(55, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.4, 0);
controls.minRadius = 3;
controls.maxRadius = 14;

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.07, 0.08, 0.11, 1);

/* ---------- 拾取：对全部几何求交，取最近命中 ---------- */
let hoverIndex = -1;
let selectedIndex = -1;
const infoEl = document.getElementById('info');
const ray: Ray = { origin: new Vec3(), direction: new Vec3() };

function pickAt(clientX: number, clientY: number): number {
  const ndc = pointerToNDC({ clientX, clientY }, canvas);
  const r = rayFromCamera(camera, ndc.x, ndc.y);
  ray.origin.copy(r.origin);
  ray.direction.copy(r.direction);
  let bestIndex = -1;
  let bestDist = Infinity;
  for (let i = 0; i < items.length; i++) {
    const hit = raycastGeometry(ray, items[i].matrix, geoData); // 内部做局部空间精测
    if (hit && hit.distance < bestDist) {
      bestDist = hit.distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

let downX = 0;
let downY = 0;
canvas.addEventListener('pointerdown', (e) => {
  downX = e.clientX;
  downY = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  // 拖拽阈值：位移小于 5 像素才算点击（拖拽归 OrbitControls）
  if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5) {
    selectedIndex = pickAt(e.clientX, e.clientY);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.buttons === 0) hoverIndex = pickAt(e.clientX, e.clientY); // 非拖拽时才做 hover
});

/* ---------- 渲染循环 ---------- */
const Y_AXIS = new Vec3(0, 1, 0);
const vp = new Mat4();
let prev = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  controls.update(dt);
  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());
  gl.useProgram(program);
  gl.uniformMatrix4fv(uVP, false, vp.elements);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    it.angle += it.spinSpeed * dt;
    it.matrix.fromTRS(it.position, Y_AXIS, it.angle, new Vec3(it.size, it.size, it.size));
    gl.uniformMatrix4fv(uModel, false, it.matrix.elements);
    gl.uniform3fv(uColor, [it.color.x, it.color.y, it.color.z]);
    gl.uniform1f(uHighlight, i === selectedIndex ? 0.9 : i === hoverIndex ? 0.35 : 0);
    drawGeometry(gl, geo);
  }

  const idx = selectedIndex >= 0 ? selectedIndex : hoverIndex;
  if (infoEl) {
    infoEl.textContent = idx < 0 ? '未命中' : `命中：${items[idx].name}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
