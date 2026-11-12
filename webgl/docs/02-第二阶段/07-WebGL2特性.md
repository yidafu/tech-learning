# WebGL2 特性

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文展开大纲第二阶段第 6 条「WebGL2 特性」：VAO、instancing、UBO、transform feedback、MRT 五件套，每样都回答"它省了什么、代价是什么"；阶段导览见 [01-导览](01-导览.md)。

WebGL2 基于 OpenGL ES 3.0：GLSL 升到 ES 3.00（`#version 300 es` 必须是第一行，`attribute/varying` 变成 `in/out`，`gl_FragColor` 换成自己声明的 `out` 变量，`texture2D` 变成 `texture`），并补齐了一批桌面 GL 早有的能力。本节的线索只有一个：**前五个分册里所有"每帧重复做的 CPU 工作"，WebGL2 各给了一个一次性的机制**。上下文获取：`canvas.getContext('webgl2')`；WebGL2 设备覆盖率已接近 100%，检测失败再退 WebGL1 即可。

## 6.1 VAO：它到底省了什么

### 概念

顶点数组对象（Vertex Array Object，VAO）把"一次 draw 之前的顶点状态绑定序列"整体打包。WebGL1 每画一个网格都要重放一遍：

```javascript
// WebGL1：每个网格每次绘制都要跑的一串调用
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.enableVertexAttribArray(locPosition);
gl.vertexAttribPointer(locPosition, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(locNormal);
gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(locUV);
gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 32, 24);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);   // IBO 绑定是全局状态，不属于任何"对象"
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
```

一个网格 6~8 次 JS→驱动的调用，一千个网格就是每帧近万次状态切换——这是 draw call 昂贵的另一半原因（另一半是驱动校验与 GPU 提交）。WebGL2 里：

```javascript
// 建网格时：创建一次 VAO，绑定序列只跑一遍
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(2);
gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);   // 这次绑定被记进 VAO
gl.bindVertexArray(null);

// 每帧绘制：一次绑定 + 一次绘制
gl.bindVertexArray(vao);
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
```

### 原理：VAO 记什么、不记什么

| 记进 VAO | 不记（仍是上下文全局状态） |
|---|---|
| 每个属性的 enable/disable 状态 | `ARRAY_BUFFER` 的当前绑定（只记 pointer 时刻的引用） |
| 每个属性的 `vertexAttribPointer`（引用哪个 VBO、stride、offset） | uniform 值与 uniform 缓冲绑定 |
| 每个属性的 divisor（6.2 会用） | 纹理绑定 |
| `ELEMENT_ARRAY_BUFFER` 绑定（IBO 随 VAO 走） | FBO 绑定、viewport、所有渲染状态 |

两个推论：

1. **WebGL1 的"状态泄漏"类 bug 在 WebGL2 里天然消失**——A 网格的 IBO 绑定不会再影响 B 网格，因为各自在各自的 VAO 里；
2. VAO 解决的是"CPU 侧状态切换"，不减少 draw call 本身；真正减少 draw call 数量的是 6.2 的 instancing。两者正交，配合用。

附：WebGL1 可通过 `OES_vertex_array_object` 扩展获得 VAO（API 名带 `OES_` 前缀），覆盖率极高，但本文按 WebGL2 原生 API 讲。

## 6.2 instancing 实例化绘制

### 概念

实例化（instancing）：一份顶点数据 + 一组"每实例属性"，一次 draw 画 N 份。核心机制是 `vertexAttribDivisor(location, 1)`——把某个属性的分频设成"每 1 个实例推进一次"（默认 0 = 每顶点推进一次），配合 `drawArraysInstanced` / `drawElementsInstanced`。

```javascript
gl.vertexAttribDivisor(locOffset, 1);  // 位置属性：每实例一个值
gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 2000);  // 6 顶点的四边形 × 2000 实例
```

省了什么：2000 个四边形从"2000 次 draw + 每次数十次状态切换"变成**一次 draw**。CPU 只在每帧更新实例属性缓冲（也可以完全不动），GPU 并行处理所有实例。第五阶段的万级粒子就是它的直接应用。

### 完整代码：2000 个实例化四边形

```javascript
// main.js —— instancing（WebGL2 / GLSL ES 3.00）
const canvas = document.querySelector('#gl');
const gl = canvas.getContext('webgl2');

const vsSource = `#version 300 es
layout(location = 0) in vec2 aCorner;      // 每顶点：单位四边形角点
layout(location = 1) in vec3 aOffset;      // 每实例：位置
layout(location = 2) in vec2 aSize;        // 每实例：尺寸
layout(location = 3) in vec3 aColor;       // 每实例：颜色
uniform mat4 uViewProjection;
out vec3 vColor;
void main() {
  vColor = aColor;
  vec3 world = aOffset + vec3(aCorner.x, 0.0, aCorner.y) * vec3(aSize.x, 1.0, aSize.y);
  gl_Position = uViewProjection * vec4(world, 1.0);
}`;

const fsSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 fragColor;
void main() { fragColor = vec4(vColor, 1.0); }`;

function createProgram(gl, vs, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

const program = createProgram(gl, vsSource, fsSource);
gl.useProgram(program);

// —— 每顶点数据：单位四边形（两个三角形，XZ 平面躺平）——
const quadCorners = new Float32Array([
  -0.5, -0.5,  0.5, -0.5,  0.5, 0.5,
  -0.5, -0.5,  0.5,  0.5, -0.5, 0.5,
]);

// —— 每实例数据：确定性伪随机布置一片"发光地砖" ——
const N = 2000;
let seed = 42;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const offsets = new Float32Array(N * 3);
const sizes = new Float32Array(N * 2);
const colors = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const a = rand() * Math.PI * 2;
  const r = 0.8 + Math.pow(rand(), 0.5) * 9;      // 方形分布也行，环形更有层次
  offsets[i * 3] = Math.cos(a) * r;
  offsets[i * 3 + 1] = 0;
  offsets[i * 3 + 2] = Math.sin(a) * r;
  sizes[i * 2] = 0.1 + rand() * 0.5;
  sizes[i * 2 + 1] = 0.1 + rand() * 0.5;
  const warm = rand();
  colors[i * 3] = 0.15 + 0.85 * warm;
  colors[i * 3 + 1] = 0.3 + 0.3 * rand();
  colors[i * 3 + 2] = 0.9 - 0.75 * warm;
}

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

function attributeBuffer(location, data, size, divisor) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  if (divisor) gl.vertexAttribDivisor(location, divisor);  // 关键：1 = 每实例推进
}
attributeBuffer(0, quadCorners, 2, 0);   // divisor 0：每顶点
attributeBuffer(1, offsets, 3, 1);
attributeBuffer(2, sizes, 2, 1);
attributeBuffer(3, colors, 3, 1);

// —— m4：第一阶段手写实现（列主序），同 02 分册 ——
const m4 = {
  multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1]
                     + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0,
      0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  lookAt(eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let x = [up[1] * zz - up[2] * zy, up[2] * zx - up[0] * zz, up[0] * zy - up[1] * zx];
    const xl = Math.hypot(...x); x = x.map(v => v / xl);
    const y = [zy * x[2] - zz * x[1], zz * x[0] - zx * x[2], zx * x[1] - zy * x[0]];
    return new Float32Array([
      x[0], y[0], zx, 0, x[1], y[1], zy, 0, x[2], y[2], zz, 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
      -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
  },
};

const locVP = gl.getUniformLocation(program, 'uViewProjection');
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.04, 0.05, 0.08, 1);

function frame(time) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const t = time * 0.0004;
  const eye = [Math.cos(t) * 14, 7, Math.sin(t) * 14];
  const vp = m4.multiply(
    m4.perspective(Math.PI / 3, canvas.width / canvas.height, 0.1, 100),
    m4.lookAt(eye, [0, 0, 0], [0, 1, 0]));
  gl.uniformMatrix4fv(locVP, false, vp);

  gl.bindVertexArray(vao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, N);   // 一次 draw，2000 个实例
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

每帧实例属性要动起来（比如位置更新），把三个实例缓冲改成 `gl.DYNAMIC_DRAW` 并每帧 `bufferSubData` 覆盖即可——CPU 只写 N 个 float，不做矩阵乘法、不重复绑定。要"连实例属性上传都省掉"，用着色器内的 `gl_InstanceID`（ES 3.00 内置变量，0 到 N−1 的实例编号）在 VS 里算位置，或直接上 6.4 的 transform feedback。

WebGL1 回退：`ANGLE_instanced_arrays` 扩展提供 `vertexAttribDivisorANGLE` / `drawArraysInstancedANGLE`，语义相同。

## 6.3 UBO：Uniform Buffer Object

### 概念

uniform 每个程序各存一份：视图/投影矩阵对场景里所有程序都一样，却要每个程序 `uniformMatrix4fv` 一遍。统一缓冲对象（Uniform Buffer Object，UBO）把一组 uniform 放进 buffer 对象，**一次上传、多个程序共享**（通过绑定槽 binding point）。GLSL 侧用 uniform block：

```glsl
#version 300 es
layout(std140) uniform FrameBlock {
  mat4 uViewProjection;   // 偏移 0，占 64 B
  vec3 uLightDir;         // 偏移 64，占 12 B（对齐 16）
  float uTime;            // 偏移 76，紧跟 vec3 填进同一个 16 B 槽
};
```

### 原理：std140 布局规则

`std140` 是跨平台统一的内存布局（不加 layout 限定符时的默认），规则表：

| 类型 | 基础对齐 | 尺寸 |
|---|---|---|
| 标量（int/float/bool） | 4 | 4 |
| vec2 | 8 | 8 |
| **vec3** | **16** | 12 |
| vec4 | 16 | 16 |
| mat4 | 16（按列，即 4 个 vec4） | 64 |
| **mat3** | **16** | **48（每列按 vec4 填充）** |
| **T 的数组** | **元素步长 = T 的对齐向上取整到 16** | N × 步长 |
| 结构体 | 最大成员的对齐 | 尺寸向上取整到对齐倍数 |

三个粗体行是全部的坑：`vec3[4]` 每个元素占 16 B（不是 12）；`mat3` 占 48 B（当 3 列 vec4 用）；结构体成员间可能有 padding。**实践建议：不背规则，用 `getActiveUniforms` 查询真实偏移**：

```typescript
const blockIndex = gl.getUniformBlockIndex(program, 'FrameBlock');
const names = ['uViewProjection', 'uLightDir', 'uTime'];
const indices = gl.getUniformIndices(program, names);
const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET); // 字节偏移

// 一次上传，所有程序共享
const staging = new Float32Array(20); // 80 B
// 按 offsets 写入：viewProjection 写 [0,64)、lightDir 写 [64,76)、time 写 [76,80)
const ubo = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
gl.bufferData(gl.UNIFORM_BUFFER, staging, gl.DYNAMIC_DRAW);
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);           // 挂到 0 号绑定槽
gl.uniformBlockBinding(program, blockIndex, 0);         // 程序的 FrameBlock 读 0 号槽

// 之后每帧只更新变化部分（例如只有 time）：
gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
gl.bufferSubData(gl.UNIFORM_BUFFER, 76, new Float32Array([time]));  // 偏移 76 只写 time
```

任何 program 只要它的 block 也 `uniformBlockBinding` 到 0 号槽，就共享同一份数据——换材质/换着色器不再重传相机矩阵。

## 6.4 transform feedback：把顶点着色器当"通用计算"用

### 概念

变换反馈（transform feedback）把顶点着色器的**输出**捕获进 buffer 而不是（只）送去光栅化——顶点着色器因此变成一台"每个顶点跑一段程序、结果写回显存"的并行计算器。经典用途：GPU 粒子（位置积分在 VS 里做，CPU 零参与）。

三个 API 要点：

1. `gl.transformFeedbackVaryings(program, ['vData'], gl.INTERLEAVED_ATTRIBS)`——**必须在 linkProgram 之前**声明要捕获哪些 VS 输出（交错存进一个 buffer）；
2. 绘制时 `gl.enable(gl.RASTERIZER_DISCARD)` 关掉光栅化（不产生片元）；
3. 输出 buffer 用 `bindBufferBase(TRANSFORM_FEEDBACK_BUFFER, 0, buf)` 挂上，`beginTransformFeedback(gl.POINTS)` 后正常 `drawArrays`。

### 完整示例：GPU 弹跳粒子

数据布局每个粒子一个 `vec4(x, y, vx, vy)`，两个 buffer 乒乓：A 读 B 写、下一帧对调。

```javascript
const N = 4096;
const datas = [gl.createBuffer(), gl.createBuffer()];
const initData = new Float32Array(N * 4);
for (let i = 0; i < N; i++) {
  initData[i * 4] = (Math.random() * 2 - 1) * 0.5;      // x
  initData[i * 4 + 1] = Math.random() * 1.5;            // y
  initData[i * 4 + 2] = (Math.random() * 2 - 1) * 0.3;  // vx
  initData[i * 4 + 3] = Math.random() * 0.5;            // vy
}
for (const buf of datas) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, initData, gl.DYNAMIC_COPY);
}

const updateVS = `#version 300 es
layout(location = 0) in vec4 aData;
uniform float uDt;
out vec4 vData;                       // 将被 transform feedback 捕获
void main() {
  vec2 p = aData.xy;
  vec2 v = aData.zw;
  v.y -= 0.8 * uDt;                   // 重力
  p += v * uDt;                       // 积分
  if (p.y < -1.0) { p.y = -1.0; v.y = -v.y * 0.92; }   // 地面反弹 + 阻尼
  if (abs(p.x) > 1.9) v.x = -v.x;                       // 左右墙
  vData = vec4(p, v);
}`;
const passFS = `#version 300 es
precision mediump float;
out vec4 o; void main() { o = vec4(0.0); }`;  // 光栅化被丢弃，随便输出
```

链接更新程序（注意 varyings 在 link 前设置）：

```javascript
const updateProgram = gl.createProgram();
// attachShader 两个着色器后：
gl.transformFeedbackVaryings(updateProgram, ['vData'], gl.INTERLEAVED_ATTRIBS);
gl.linkProgram(updateProgram);        // 必须在 link 之前！

const renderVS = `#version 300 es
layout(location = 0) in vec4 aData;
uniform mat4 uViewProjection;
void main() {
  gl_Position = uViewProjection * vec4(aData.xy, 0.0, 1.0);
  gl_PointSize = 3.0;
}`;
// renderFS：输出暖白色即可

const updateVAOs = [gl.createVertexArray(), gl.createVertexArray()];
datas.forEach((buf, i) => {
  gl.bindVertexArray(updateVAOs[i]);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
});
gl.bindVertexArray(null);

let current = 0;   // 当前帧的输入缓冲编号
const tf = gl.createTransformFeedback();

function step(dt) {
  const src = current, dst = 1 - current;
  gl.useProgram(updateProgram);
  gl.uniform1f(gl.getUniformLocation(updateProgram, 'uDt'), dt);

  gl.bindVertexArray(updateVAOs[src]);                    // 读 src
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, datas[dst]);  // 写 dst

  gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, N);                         // "绘制"即计算
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  current = dst;                                          // 下一帧对调
}
```

渲染 pass 把 `updateVAOs[current]` 绑给 renderProgram 正常 `drawArrays(gl.POINTS, 0, N)` 即可（粒子不缩放的简单场景直接正交投影）。两条铁律：**输入与输出不能是同一个 buffer**（反馈环，同 5.3 的坑）、**varyings 声明必须先于 link**。这就是 GPU 粒子系统的雏形——第五阶段的万级粒子只是把 `vData` 换成更复杂的运动模型。

## 6.5 MRT：多渲染目标

### 概念

多渲染目标（Multiple Render Targets，MRT）让片元着色器**一次输出多个颜色**到不同附件——延迟渲染（deferred shading）的地基：G-buffer 一遍把"颜色、法线、材质参数、深度"分别画进多张纹理，光照 pass 再逐像素读取。

片元着色器用 `layout(location = N)` 声明多个输出，绘制前 `gl.drawBuffers` 指明各槽位对应的附件：

```glsl
#version 300 es
precision mediump float;
layout(location = 0) out vec4 oColor;    // → COLOR_ATTACHMENT0
layout(location = 1) out vec4 oNormal;   // → COLOR_ATTACHMENT1
in vec3 vNormal;
in vec3 vColor;
void main() {
  oColor = vec4(vColor, 1.0);
  oNormal = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);  // 法线压到 [0,1] 存储
}
```

```javascript
// FBO：两张同尺寸颜色纹理（法线那张格式可以是 RGBA8 或 RG16F）
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTex, 0);
gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);   // 关键一步
// 深度照常挂 renderbuffer；光 pass 里像普通纹理一样采样两张图
```

`drawBuffers` 默认只有 `[COLOR_ATTACHMENT0]`，不调用则 location 1 的输出全部丢弃。所有附件同尺寸、格式合法（WebGL2 要求），完整性检查照旧。调试 MRT 的技巧：加一个只采 normalTex 的全屏 pass（同 5.3 的 pass 2），法线编码错不错一眼看穿（朝向相机是 (0.5, 0.5, 1) 的淡紫，+x 面是 (1, 0.5, 0.5) 的红调）。

## 常见坑

1. **`#version 300 es` 不在第一行**（哪怕前面只有一个空行）直接编译失败，报错信息还常常只说语法错；
2. **VAO 里忘绑 IBO**：VAO 记录的是"绑定 VAO 时刻"的 ELEMENT_ARRAY_BUFFER 绑定，创建 VAO 时顺序错了（先解绑 IBO 再建 VAO）就把 null 记进去了；
3. **divisor 设了但用 drawArrays**（不是 Instanced 版本）：每实例属性不推进，画出 2000 个完全重叠的图元；
4. **std140 手算偏移**：`vec3` 数组、`mat3` 的填充规则最容易错，一律用 `getActiveUniforms` 查询；改 block 结构后偏移全部重查；
5. **transformFeedbackVaryings 放在 link 之后**：链接的程序没有捕获配置，`beginTransformFeedback` 报 INVALID_OPERATION；
6. **反馈环**：TF 的输入输出 buffer 必须不同，且 TF 结束前不要把输出 buffer 绑去采样；
7. **drawBuffers 只在 FBO 上有意义**：默认帧缓冲只有一个后缓冲，MRT 结构挂默认帧缓冲上没有效果；
8. **ES 3.00 里残留旧关键字**：`attribute`/`varying`/`gl_FragColor`/`texture2D` 在 300 es 里全部非法，从第一阶段示例迁移时要整体替换。

## 【本节自测】

1. VAO 把哪些状态收进去了？为什么 `ARRAY_BUFFER` 的绑定反而"不记"？给出一个"记了反而出错"的场景（提示：pointer 时刻的快照语义）。
2. 2000 个实例从传统绘制换成 instancing，每帧 JS 侧的 API 调用次数大约从多少降到多少？实例属性的分频机制（divisor）解决的是数据供给的什么问题？
3. 设计一个 UBO block：`mat4 view; mat4 proj; vec3 cameraPos; vec3 lightPos; float time;`——按 std140 手排每个成员的字节偏移，再用哪两个 API 验证你的答案？
4. GPU 粒子为什么需要两个 buffer 乒乓？如果只用一个 buffer 会触发什么问题（联系 5.3 的反馈环）？
5. MRT 的一遍 G-buffer 渲染相比"每盏灯都完整渲染一遍场景"省了什么？代价是什么（提示：显存、带宽、透明物体怎么办）？

下一篇：[08-实践-纹理地球](08-实践-纹理地球.md)——把 2.x、3.x、4.x 一起用掉。
