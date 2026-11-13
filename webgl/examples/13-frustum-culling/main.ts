// 13 视锥剔除与场景管理：场景图层次剔除（父盒在外剪整棵子树）、
// 被剔除叶子以半透明红"幽灵"标记、HUD 统计每帧测试/剪枝/剔除数，
// 可见列表 front-to-back 排序（不透明物体吃 early-z，分册 11.5）。
// 对应分册：《05-第五阶段/12-视锥剔除与场景管理.md》。
// 场景：5x5 街区（每街区 10 栋盒子楼）+ 两个旋转群组（演示旋转后 AABB 保守放大）。
// 交互：C 剔除开关（对比 drawcall）、V 幽灵标记、F 视锥线框、拖拽/滚轮 = 轨道相机。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import { createBox, createGpuGeometry, drawGeometry } from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { Mat4, Vec3 } from '../src/common/math';
import { extractFrustumPlanes, frustumCorners } from './frustum';
import { collectVisible, CullNode } from './scene-graph';
import type { CullStats } from './scene-graph';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLElement;
const gl = createGL2(canvas);

/* ---------- 着色器：场景着色 + 幽灵/线框的平色 ---------- */
const sceneVS = /* glsl */ `
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
const sceneFS = /* glsl */ `
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
const flatVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uViewProjection;
void main() { gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0); }
`;
const flatFS = /* glsl */ `
#version 300 es
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
out vec4 fragColor;
void main() { fragColor = vec4(uColor, uAlpha); }
`;

const sceneProgram = createProgramOrFail(gl, sceneVS, sceneFS);
const flatProgram = createProgramOrFail(gl, flatVS, flatFS);

/* ---------- 场景构建 ---------- */
const boxGeo: GpuGeometry = createGpuGeometry(gl, createBox(1, 1, 1));
const root = new CullNode('root');
const PALETTE = [
  new Vec3(0.72, 0.7, 0.66), new Vec3(0.66, 0.72, 0.7),
  new Vec3(0.74, 0.66, 0.68), new Vec3(0.64, 0.68, 0.72),
];
const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/** 加一个盒子叶子：局部包围盒 = 位置 ± 尺寸/2，并把父组盒撑大（分册 11.3.1） */
function addBox(
  parent: CullNode, name: string,
  x: number, y: number, z: number,
  sx: number, sy: number, sz: number,
  color: Vec3,
): CullNode {
  const n = new CullNode(name);
  n.position.set(x, y, z);
  n.scale.set(sx, sy, sz);
  n.geo = boxGeo;
  n.color.copy(color);
  n.localAabb.min.set(x - sx / 2, y - sy / 2, z - sz / 2);
  n.localAabb.max.set(x + sx / 2, y + sy / 2, z + sz / 2);
  parent.add(n);
  parent.enclose(n.localAabb.min, n.localAabb.max);
  return n;
}

// 地面：大扁盒，几乎总与视锥相交（剔除它没戏，但作为叶子参与统计）
addBox(root, 'ground', 0, -0.15, 0, 78, 0.3, 78, new Vec3(0.34, 0.36, 0.4));

// 5x5 街区：每街区一个组节点 + 3x3 楼 + 1 地标高楼
const BLOCKS = 5, SPACING = 10.5;
for (let bz = 0; bz < BLOCKS; bz++) {
  for (let bx = 0; bx < BLOCKS; bx++) {
    const block = new CullNode(`block(${bx},${bz})`);
    block.position.set((bx - 2) * SPACING, 0, (bz - 2) * SPACING);
    const base = PALETTE[(bx + bz) % PALETTE.length];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const seed = bx * 31 + bz * 17 + i * 7 + j * 13;
        const h = 0.8 + rand(seed) * 2.2;
        const s = 1.1 + rand(seed + 0.5) * 0.9;
        const tint = 0.82 + rand(seed + 0.25) * 0.3;
        addBox(block, 'box',
          (i - 1) * 2.8, h / 2, (j - 1) * 2.8,
          s, h, s,
          new Vec3(base.x * tint, base.y * tint, base.z * tint));
      }
    }
    addBox(block, 'landmark', 2.4, 2.6, -2.4, 1.3, 5.2, 1.3,
      new Vec3(0.9, 0.62, 0.42));
    root.add(block);
  }
}

// 两个旋转群组：父节点自转带动整圈小盒（演示动态节点 + 旋转后世界 AABB 变大）
const clusters: CullNode[] = [];
for (const [cx, cz] of [[-16, 14], [17, -15]] as const) {
  const cluster = new CullNode('orbit-cluster');
  cluster.position.set(cx, 0, cz);
  for (const [ox, oy, oz] of [[4, 0.6, 0], [-4, 0.6, 0], [0, 0.6, 4], [0, 0.6, -4],
    [2.8, 1.9, 2.8], [-2.8, 1.9, -2.8]] as const) {
    addBox(cluster, 'orbiter', ox, oy, oz, 0.8, 0.8, 0.8, new Vec3(0.55, 0.75, 0.6));
  }
  root.add(cluster);
  clusters.push(cluster);
}
root.refreshCounts(); // 聚合 leafCount / subtreeNodes（子树剪枝的统计口径）

const allLeaves: CullNode[] = [];
root.traverse((n) => { if (n.geo) allLeaves.push(n); });
const TOTAL_NODES = root.subtreeNodes;

const camera = new PerspectiveCamera(55, 1, 0.5, 320);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2, 0);
controls.minRadius = 5;
controls.maxRadius = 150;

/* ---------- 视锥线框的静态资源 ---------- */
const EDGE_PAIRS: Array<readonly [number, number]> = [];
for (let i = 0; i < 8; i++) {
  for (const bit of [1, 2, 4]) if ((i ^ bit) > i) EDGE_PAIRS.push([i, i ^ bit]);
}
const lineVao = gl.createVertexArray();
const lineVbo = gl.createBuffer();
gl.bindVertexArray(lineVao);
gl.bindBuffer(gl.ARRAY_BUFFER, lineVbo);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
const lineVerts = new Float32Array(EDGE_PAIRS.length * 2 * 3);
const frustumCornerBuf: Vec3[] = Array.from({ length: 8 }, () => new Vec3());

/* ---------- 交互与状态 ---------- */
let cullingOn = true;
let showGhost = true;
let showLines = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') cullingOn = !cullingOn;
  if (e.code === 'KeyV') showGhost = !showGhost;
  if (e.code === 'KeyF') showLines = !showLines;
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.07, 0.08, 0.11, 1);

const vp = new Mat4();
const invVP = new Mat4();
const IDENTITY = new Mat4(); // 构造即单位阵：线框/兜底用
const visible: CullNode[] = [];
const visibleSet = new Set<CullNode>();
const stats: CullStats = { testedNodes: 0, prunedNodes: 0, drawnLeaves: 0, culledLeaves: 0 };

let hudClock = 0;
let prev = performance.now();

function updateHud(): void {
  const cluster = clusters[0];
  const w = cluster.worldAabb;
  const l = cluster.localAabb;
  const pct = allLeaves.length > 0 ? Math.round((stats.culledLeaves / allLeaves.length) * 100) : 0;
  hud.innerHTML =
    `<a href="../index.html">返回目录</a>\n` +
    `13 视锥剔除：层次 AABB 剔除 + front-to-back（${cullingOn ? '剔除开' : '剔除关'}）\n` +
    `节点 ${TOTAL_NODES}（叶子 ${allLeaves.length}）| 本帧 AABB 测试 ${stats.testedNodes}` +
    ` | 子树剪枝免测 ${stats.prunedNodes}\n` +
    `叶子：画 ${stats.drawnLeaves} / 剔 ${stats.culledLeaves}（${pct}%）` +
    `（剔除关 = ${allLeaves.length} draw）\n` +
    `旋转群组世界 AABB ${((w.max.x - w.min.x)).toFixed(1)}x${((w.max.y - w.min.y)).toFixed(1)}` +
    `x${((w.max.z - w.min.z)).toFixed(1)}（局部 ${((l.max.x - l.min.x)).toFixed(1)}` +
    `x${((l.max.y - l.min.y)).toFixed(1)}x${((l.max.z - l.min.z)).toFixed(1)}，旋转保守放大）\n` +
    `C 剔除开关 | V 被剔除幽灵: ${showGhost ? '开' : '关'} | F 视锥线框: ${showLines ? '开' : '关'}` +
    ` | 拖拽/滚轮 = 轨道相机`;
}

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  controls.update(dt);

  // 动画：两个群组反向自转（局部只改角度，世界矩阵由场景图合成）
  clusters[0].rotationAngle += dt * 0.7;
  clusters[1].rotationAngle -= dt * 0.5;
  clusters[0].setDirty();
  clusters[1].setDirty();
  root.updateMatrixWorld(); // 顺带把每个节点的局部盒保守变换成世界 AABB

  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());

  // ---- 收集：层次剔除（或关闭剔除的全量遍历，做对照） ----
  visible.length = 0;
  stats.testedNodes = 0;
  stats.prunedNodes = 0;
  stats.drawnLeaves = 0;
  stats.culledLeaves = 0;
  const planes = extractFrustumPlanes(vp.elements);
  if (cullingOn) {
    collectVisible(root, planes, visible, stats);
  } else {
    root.traverse((n) => { if (n.geo) visible.push(n); });
  }
  stats.drawnLeaves = visible.length;

  // front-to-back：不透明由近到远画，近处先写深度、远处被遮片元提前裁掉（分册 11.5）
  const cam = camera.position;
  const distSq = (n: CullNode): number => {
    const e = n.matrixWorld.elements;
    const dx = e[12] - cam.x, dy = e[13] - cam.y, dz = e[14] - cam.z;
    return dx * dx + dy * dy + dz * dz;
  };
  visible.sort((a, b) => distSq(a) - distSq(b));

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(sceneProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(sceneProgram, 'uViewProjection'), false, vp.elements);
  for (const n of visible) {
    gl.uniformMatrix4fv(gl.getUniformLocation(sceneProgram, 'uModel'), false, n.matrixWorld.elements);
    gl.uniform3fv(gl.getUniformLocation(sceneProgram, 'uColor'), [n.color.x, n.color.y, n.color.z]);
    drawGeometry(gl, n.geo!);
  }

  // ---- 幽灵：被剔除的叶子画成半透明红（它们本来一个像素都不该占） ----
  if (cullingOn && showGhost) {
    visibleSet.clear();
    for (const n of visible) visibleSet.add(n);
    gl.useProgram(flatProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uViewProjection'), false, vp.elements);
    gl.uniform3f(gl.getUniformLocation(flatProgram, 'uColor'), 0.85, 0.22, 0.25);
    gl.uniform1f(gl.getUniformLocation(flatProgram, 'uAlpha'), 0.3);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const n of allLeaves) {
      if (visibleSet.has(n)) continue;
      gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uModel'), false, n.matrixWorld.elements);
      drawGeometry(gl, n.geo!);
    }
    gl.disable(gl.BLEND);
  }

  // ---- 视锥线框：逆投影 NDC 立方体 8 角 ----
  if (showLines) {
    if (!Mat4.invert(invVP, vp)) throw new Error('相机矩阵不可逆');
    frustumCorners(invVP, frustumCornerBuf);
    let o = 0;
    for (const [a, b] of EDGE_PAIRS) {
      for (const i of [a, b]) {
        lineVerts[o++] = frustumCornerBuf[i].x;
        lineVerts[o++] = frustumCornerBuf[i].y;
        lineVerts[o++] = frustumCornerBuf[i].z;
      }
    }
    gl.useProgram(flatProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uViewProjection'), false, vp.elements);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uModel'), false, IDENTITY.elements);
    gl.uniform3f(gl.getUniformLocation(flatProgram, 'uColor'), 0.4, 1.0, 0.55);
    gl.uniform1f(gl.getUniformLocation(flatProgram, 'uAlpha'), 1);
    gl.bindVertexArray(lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVbo);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.LINES, 0, EDGE_PAIRS.length * 2);
    gl.bindVertexArray(null);
  }

  hudClock += dt;
  if (hudClock > 0.25) {
    hudClock = 0;
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
