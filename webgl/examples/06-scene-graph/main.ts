// 06 微型场景图：8 个节点的父子变换树（恒星 + 两颗带卫星的行星系）。
// 对应分册：《04-第四阶段/03-场景图.md》2.1（worldMatrix 合成）/ 2.2（脏标记剪枝）。
// 看点：子节点只改局部"自转角"，公转由父"轨道节点"的旋转带动——
// matrixWorld(子) = matrixWorld(父) × localMatrix(子)，一阶段手写的矩阵链在这里被自动化。

import { createGL2, createProgram, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, drawGeometry } from '../src/common/geometry';
import { degToRad, Mat4, Vec3 } from '../src/common/math';
import { Node3D } from './scene-graph';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);

/* ---------- 着色器：uModel 取 matrixWorld，直接观察场景图的输出 ---------- */
const VS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
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
out vec4 fragColor;
void main() {
  float ndl = max(dot(normalize(vNormal), normalize(vec3(0.5, 0.9, 0.6))), 0.0);
  fragColor = vec4(uColor * (0.25 + 0.75 * ndl), 1.0);
}
`;
const program = createProgram(gl, VS, FS);
if (!program) throw new Error('着色器创建失败，看控制台');
const uModel = gl.getUniformLocation(program, 'uModel');
const uVP = gl.getUniformLocation(program, 'uViewProjection');
const uColor = gl.getUniformLocation(program, 'uColor');

/* ---------- 构建树：根 -> 恒星 / 轨道A -> 行星 -> 月球轨道 -> 月球 / 轨道C -> 行星2 ---------- */
const Y_AXIS = new Vec3(0, 1, 0);
const TILTED = new Vec3(0, 1, 0.35).normalize();

function box(name: string, color: Vec3, size: number): Node3D {
  const n = new Node3D(name);
  n.color = color;
  n.scale.set(size, size, size);
  return n;
}

const root = new Node3D('root(场景根)');          // 不画
const sun = box('sun(恒星 自转)', new Vec3(0.95, 0.78, 0.25), 1.0);
const orbitA = new Node3D('orbitA(公转)');        // 空节点：只负责带动子树公转
const planet = box('planet(行星 自转)', new Vec3(0.3, 0.52, 0.95), 0.55);
planet.position.set(2.1, 0, 0);
const moonOrbit = new Node3D('moonOrbit(月球公转)');
// 月球轨道挂在行星局部系里：父的 scale(0.55) 会被继承，
// 故此偏移与月球尺寸都按比例补偿（场景图语义：父变换影响整棵子树）
moonOrbit.position.set(0.95, 0, 0);               // 世界距离 = 0.95 * 0.55
const moon = box('moon(月球)', new Vec3(0.75, 0.78, 0.82), 0.45); // 世界大小 = 0.45 * 0.55
const orbitC = new Node3D('orbitC(反向公转 倾斜轨道)');
orbitC.rotationAxis.copy(TILTED);
const planet2 = box('planet2(行星2 自转)', new Vec3(0.38, 0.83, 0.37), 0.4);
planet2.position.set(-1.7, 0, 0);

root.add(sun).add(orbitA).add(orbitC);
orbitA.add(planet);
planet.add(moonOrbit);   // 月球轨道挂在行星下：行星的"自转+公转"全部被月球继承
moonOrbit.add(moon);
orbitC.add(planet2);

/* ---------- 渲染 ---------- */
const cube = createGpuGeometry(gl, createBox(1, 1, 1)); // 全树共用一份几何，大小由 scale 决定
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.055, 0.063, 0.094, 1);

const vp = new Mat4();
const scratch = new Mat4();
let prev = performance.now();
let spin = 0;

// HUD：打印树结构，直观看到"谁是谁的父"
const treeEl = document.getElementById('tree');
function dumpTree(node: Node3D, depth = 0): string {
  return '  '.repeat(depth) + (node.color ? '' : '(空) ') + node.name + '\n'
    + node.children.map((c) => dumpTree(c, depth + 1)).join('');
}
if (treeEl) {
  treeEl.innerHTML =
    `<a href="../index.html">返回目录</a>\n06 微型场景图（8 节点）\n\n${dumpTree(root)}`
      .replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
}

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  spin += dt;

  // 只改局部量：轨道节点转 = 公转；天体转 = 自转。子树的世界矩阵由 updateMatrixWorld 合成
  orbitA.rotationAngle += dt * 0.6;
  orbitC.rotationAngle -= dt * 0.45;
  moonOrbit.rotationAngle += dt * 1.6;
  sun.rotationAngle += dt * 0.3;
  planet.rotationAngle += dt * 1.2;
  planet2.rotationAngle += dt * 0.9;
  for (const n of [orbitA, orbitC, moonOrbit, sun, planet, planet2]) n.setDirty();
  root.updateMatrixWorld(); // 双脏标记：未动整枝零重算（分册 2.2）

  resizeCanvas(gl, canvas);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vp.perspective(degToRad(55), canvas.width / canvas.height, 0.1, 100)
    .multiply(scratch.lookAt(new Vec3(4.2, 3.2, 5.6), new Vec3(0, 0, 0), Y_AXIS));
  gl.useProgram(program);
  gl.uniformMatrix4fv(uVP, false, vp.elements);

  root.traverse((node) => {
    if (!node.color) return;
    gl.uniformMatrix4fv(uModel, false, node.matrixWorld.elements);
    gl.uniform3fv(uColor, [node.color.x, node.color.y, node.color.z]);
    drawGeometry(gl, cube);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
