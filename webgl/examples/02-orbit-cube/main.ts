// 02 自转 + 公转立方体：六面异色立方体，一边绕自身倾斜轴自转、一边绕中心"恒星"公转。
// 对应分册：《01-第一阶段/06-实践-自转公转立方体.md》（完整代码 orbit-cube.html）。
// 分册要求数学函数全部手写；工程里已把它们提炼为 src/common/math.ts（minmath 最小集），
// 本文件演示矩阵链 M = R_y(公转) · T(半径) · R_x(倾斜) · R_y(自转) 的组装。

import { createGL1, createProgram, resizeCanvas } from '../src/common/gl';
import { degToRad, Mat4, Vec3 } from '../src/common/math';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL1(canvas);

/* ---------- 1. 着色器：只认 u_mvp 一个矩阵，CPU 预乘 P·V·M ---------- */
const VS_SOURCE = `
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_mvp;
varying vec3 v_color;
void main() {
  v_color = a_color;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;
const FS_SOURCE = `
precision mediump float;
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;
const program = createProgram(gl, VS_SOURCE, FS_SOURCE);
if (!program) throw new Error('着色器创建失败，看控制台');
gl.useProgram(program);
const uMvp = gl.getUniformLocation(program, 'u_mvp');

/* ---------- 2. 立方体几何：6 面 × 2 三角 × 3 顶点 = 36 顶点（交错 x y z r g b） ---------- */
const vertices: number[] = [];
function face(
  a: [number, number, number], b: [number, number, number],
  c: [number, number, number], d: [number, number, number],
  color: [number, number, number],
): void {
  for (const p of [a, b, c, a, c, d]) {
    vertices.push(p[0], p[1], p[2], color[0], color[1], color[2]);
  }
}
const h = 0.5; // 半边长；每面从外部看逆时针
face([-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h], [0.91, 0.30, 0.30]);   // 前 +z
face([h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h], [0.30, 0.52, 0.95]); // 后 -z
face([-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h], [0.95, 0.95, 0.95]);   // 上 +y
face([-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h], [0.55, 0.27, 0.68]); // 下 -y
face([h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h], [0.38, 0.83, 0.37]);   // 右 +x
face([-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h], [0.95, 0.78, 0.25]); // 左 -x

const vbo = gl.createBuffer();
if (!vbo) throw new Error('VBO 创建失败');
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'a_position');
const aColor = gl.getAttribLocation(program, 'a_color');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);

// 深度测试：后面的面必须被前面的面挡住才立体（原理见第二阶段分册）
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.055, 0.063, 0.094, 1.0);

/* ---------- 3. 渲染循环：deltaTime 累计角度，与帧率解耦 ---------- */
const ORBIT_SPEED = 40; // 公转角速度（度/秒）
const SPIN_SPEED = 90;  // 自转角速度（度/秒）
const TILT = degToRad(18); // 自转轴倾斜，让自转更可感
const ORBIT_RADIUS = 2.1;
const Y_AXIS = new Vec3(0, 1, 0);
const X_AXIS = new Vec3(1, 0, 0);

const scratch = new Mat4(); // 复用的临时矩阵（风格与分册一致：每帧重算矩阵链）
let orbitAngle = 0;
let spinAngle = 0;
let prev = performance.now();

function frame(now: number): void {
  // 钳制 dt：防后台切回时累计时间一次性灌进角度
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  orbitAngle = (orbitAngle + ORBIT_SPEED * dt) % 360;
  spinAngle = (spinAngle + SPIN_SPEED * dt) % 360;
  resizeCanvas(gl, canvas);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 相机与投影：本帧不变，P·V 先乘一次
  const aspect = canvas.width / canvas.height;
  const vp = new Mat4()
    .perspective(degToRad(60), aspect, 0.1, 100)
    .multiply(new Mat4().lookAt(new Vec3(3.4, 2.4, 5.2), new Vec3(0, 0, 0), Y_AXIS));

  // 物体一：中心"恒星"，静止小方块（复用同一 VBO，仅换矩阵）
  const sunModel = new Mat4().fromScaling(0.55, 0.55, 0.55);
  gl.uniformMatrix4fv(uMvp, false, scratch.copy(vp).multiply(sunModel).elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // 物体二：M = R_y(公转) · T(半径) · R_x(倾斜) · R_y(自转)
  // 右往左读：先自转、再倾斜、再挪上轨道、最后整体公转
  const orbit = new Mat4().fromRotation(Y_AXIS, degToRad(orbitAngle));
  const tiltSpin = new Mat4().fromRotation(X_AXIS, TILT)
    .multiply(new Mat4().fromRotation(Y_AXIS, degToRad(spinAngle)));
  const model = orbit
    .multiply(scratch.fromTranslation(ORBIT_RADIUS, 0, 0))
    .multiply(tiltSpin);
  gl.uniformMatrix4fv(uMvp, false, scratch.copy(vp).multiply(model).elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
