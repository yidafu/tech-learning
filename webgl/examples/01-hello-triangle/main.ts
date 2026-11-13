// 01 第一个三角形：清屏 + VBO + attribute 接线 + drawArrays。
// 对应分册：《01-第一阶段/03-第一个WebGL程序.md》2.2（完整代码 hello-triangle.html）。
// 骨架（上下文 / 编译链接 / resize）已提炼到 src/common/gl.ts，本文件只保留本示例的核心。

import { createGL1, createProgram, resizeCanvas } from '../src/common/gl';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL1(canvas);

/* ---------- 1. 着色器源码（GLSL ES 1.00） ---------- */
const VS_SOURCE = `
attribute vec4 a_position;   // 每顶点输入（插座对着 vertexAttribPointer）
attribute vec3 a_color;
varying vec3 v_color;        // 输出给片元（光栅化插值）
void main() {
  v_color = a_color;
  gl_Position = a_position;  // 直接把 NDC 坐标当结果（还没乘矩阵）
}
`;
const FS_SOURCE = `
precision mediump float;     // 片元着色器必须显式声明 float 精度
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;

const program = createProgram(gl, VS_SOURCE, FS_SOURCE);
if (!program) throw new Error('着色器创建失败，看控制台');
gl.useProgram(program); // 状态机：把 program 设为"当前程序"

/* ---------- 2. 顶点数据与 VBO：交错布局 x y z r g b（NDC，y 向上） ---------- */
const vertices = new Float32Array([
  -0.5, -0.4, 0.0,   1.0, 0.35, 0.35,
   0.5, -0.4, 0.0,   0.35, 1.0, 0.35,
   0.0,  0.6, 0.0,   0.35, 0.55, 1.0,
]);
const vbo = gl.createBuffer();
if (!vbo) throw new Error('VBO 创建失败');
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

/* ---------- 3. 接线：vertexAttribPointer 记录"调用那一刻"绑定的 VBO ---------- */
const aPosition = gl.getAttribLocation(program, 'a_position');
const aColor = gl.getAttribLocation(program, 'a_color');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);  // stride/offset 单位是字节
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);    // 颜色偏移 12 字节

/* ---------- 4. 清屏并绘制（每帧重画，保证 resize 后画面仍在） ---------- */
gl.clearColor(0.063, 0.078, 0.094, 1.0);

function frame(): void {
  resizeCanvas(gl, canvas);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3); // 从顶点 0 开始画 3 个，按 TRIANGLES 组装
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
