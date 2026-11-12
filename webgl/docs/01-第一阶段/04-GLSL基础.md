# GLSL 基础

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是第一阶段第 3 条"GLSL 基础"的完整展开，小节编号 3.x 与大纲一致；把 03 册里"混个脸熟"的着色器当成一门语言系统过一遍。前置阅读：[03-第一个WebGL程序](03-第一个WebGL程序.md)。

GLSL（OpenGL Shading Language）是写着色器的语言，语法接近 C。它分两个版本：WebGL1 用 GLSL ES 1.00，WebGL2 默认 GLSL ES 3.00（不写 `#version` 就是 1.00）。本文主线仍是 1.00（02 册 1.3 的取舍），讲到差异处对照 3.00。

## 3.1 类型与限定符：attribute / uniform / varying（WebGL2 的 in / out 统一）

### 3.1.1 类型系统

| 类别 | 类型 | 说明 |
|---|---|---|
| 标量 | `float` `int` `bool`（3.00 加 `uint`） | **没有 double**；字面量必须带小数点，`1` 是 int、`1.0` 才是 float |
| 浮点向量 | `vec2` `vec3` `vec4` | 图形学的主力；分量可用 `.x .y .z .w` 等访问 |
| 整型/布尔向量 | `ivec2/3/4` `bvec2/3/4` `uvec2/3/4`（3.00） | 循环计数、逻辑判断 |
| 矩阵 | `mat2` `mat3` `mat4`（3.00 另有 `mat2x3` 等非方阵） | 变换的主角，05 册整册推导 |
| 采样器 | `sampler2D` `samplerCube` | 纹理的"句柄"，只能当 uniform 用（第二阶段） |
| 聚合 | 数组、`struct` | 组织数据；3.00 的数组可用索引非常量 |

运算与内建函数都按**分量式（component-wise）**工作：`vec3 * vec3` 是逐分量相乘，**不是点积也不是矩阵乘**——点积必须写 `dot()`。常用内建先混个脸熟：`dot` `cross` `normalize` `length` `min` `max` `clamp` `mix` `step` `smoothstep` `pow` `abs` `floor` `fract`。

### 3.1.2 三个存储限定符：数据怎么进着色器

| 限定符 | 方向 | 数值来源 | 更新频率 | 典型用途 |
|---|---|---|---|---|
| `attribute` | 顶点着色器输入 | VBO 里每顶点一份 | 每顶点 | 位置、颜色、法线、UV |
| `uniform` | 两个着色器都可读 | JS 每次绘制前设置，本次绘制内恒定 | 每次绘制之间 | MVP 矩阵、时间、光源参数 |
| `varying` | 顶点输出 → 片元输入 | 顶点写出，GPU 在三角形上插值 | 每片元 | 插值颜色、插值 UV、世界坐标 |
| `const` | 编译期常量 | 写死在源码里 | 永不 | 常量系数 |

记忆口径对齐 02 册 1.4 的并行模型：**attribute 是"每个线程一份的输入"，uniform 是"所有线程共享的只读配置"，varying 是"顶点写给片元的、被自动摊平到像素的信息"**。由此立刻能推出三条硬规则：

1. attribute 只能出现在顶点着色器（片元没有"每顶点"的概念）。
2. uniform 在一次绘制内不可改——改了也要等下一次绘制才生效。
3. varying 在片元着色器里是只读的，且两边声明必须同名同类型（链接器要配对，03 册 2.3 的链接错误来源之一）。

### 3.1.3 WebGL2 的 in / out 统一

3.00 把"数据进出"统一成 `in` / `out`：进入当前阶段的写 `in`，离开当前阶段的写 `out`。于是 attribute / varying 消失，`gl_FragColor` 也改为用户自定义的 out 变量。同一对 shader 的两个版本对照：

```glsl
// ---- GLSL ES 1.00（WebGL1，或 WebGL2 上下文兼容编译） ----
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_mvp;
varying vec3 v_color;
void main() {
  v_color = a_color;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
```

```glsl
// ---- GLSL ES 3.00（第一行必须是 #version 300 es，不能有前导空白/换行） ----
#version 300 es
in vec3 a_position;            // 原 attribute
in vec3 a_color;
uniform mat4 u_mvp;            // uniform 不变
out vec3 v_color;              // 顶点侧：原 varying
void main() {
  v_color = a_color;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
```

```glsl
// ---- 片元着色器，ES 1.00 ----
precision mediump float;
varying vec3 v_color;                    // 输入：原 varying
void main() {
  gl_FragColor = vec4(v_color, 1.0);     // 内置输出
}
```

```glsl
// ---- 片元着色器，ES 3.00 ----
#version 300 es
precision mediump float;
in vec3 v_color;                         // 输入
out vec4 fragColor;                      // 输出改为自己声明（名字任意）
void main() {
  fragColor = vec4(v_color, 1.0);
}
```

统一的好处：多阶段管线（几何着色器、变换反馈）里每个阶段都是"in 进 out 出"，不需要为每对相邻阶段发明新关键字；同时 3.00 允许整型顶点属性（`in ivec3`），老三样表达不了。3.00 还给插值加了 `smooth`（默认，透视校正）/ `flat`（不插值，三个顶元取 provoking vertex 的值）限定符，做平面着色时用得上。

## 3.2 内置变量：gl_Position、gl_FragCoord、gl_FragColor

| 变量 | 阶段 | 读/写 | 类型 | 含义 |
|---|---|---|---|---|
| `gl_Position` | 顶点 | 写 | vec4 | **必须赋值**的裁剪空间坐标（05 册 4.5 的链路起点）；没写就是未定义行为 |
| `gl_PointSize` | 顶点 | 写 | float | 画 POINTS 时的点直径（像素），受设备上限约束 |
| `gl_FragCoord` | 片元 | 读 | vec4 | 窗口空间坐标：xy 是像素坐标、**原点在左下**、像素中心在 `(x.5, y.5)`；z 是深度 |
| `gl_PointCoord` | 片元 | 读 | vec2 | 点精灵内部 0~1 坐标（02 册点云实验用它削圆点） |
| `gl_FrontFacing` | 片元 | 读 | bool | 片元属于正面还是背面三角形（配合剔除/双面材质） |
| `gl_FragColor` | 片元 | 写 | vec4 | 输出颜色；**仅 1.00**，3.00 要自己声明 out（见上） |
| `gl_VertexID` / `gl_InstanceID` | 顶点（3.00） | 读 | int | 当前顶点序号 / 实例序号（instancing 用，第二阶段） |
| `gl_FragDepth` | 片元（3.00，可选支持） | 写 | float | 手动写深度（会关掉 early-z，慎用） |

值得停下来的是 `gl_Position` 与 `gl_FragCoord` 的对照：**前者是管线上"可编程入口"的空间（裁剪空间），后者是"可编程出口"的空间（窗口空间）**，中间隔着裁剪、透视除法、视口变换、光栅化——正好是 05 册 4.5 要画的那张全链路图的两端。另外注意 `gl_FragCoord` 原点在**左下**（GL 传统），而鼠标事件 / CSS 的 y 是向下的——将来做拾取要翻转，先埋个记号。

## 3.3 精度限定符、向量运算与 swizzle 语法

### 3.3.1 精度限定符（precision qualifier）

GLSL 允许给 float / int 声明三档精度：`highp` / `mediump` / `lowp`。可以写在函数/变量上，更常见的是在着色器开头一次性声明默认精度：

```glsl
precision highp float;   // 之后所有 float 默认 highp
```

各档大致对应（GLSL ES 规范规定的下限）：

| 精度 | float 大约 | int |
|---|---|---|
| highp | 32 位浮点（float32），范围约 ±3.4e38，24 位尾数 | 32 位 |
| mediump | 半精度（float16），范围 ±65504，约 3 位十进制有效数字 | 16 位 |
| lowp | 范围 [-2, 2]，步长约 1/256 | 8 位 |

**为什么片元着色器必须手写 precision**：规范没有给片元着色器的 float 设默认精度（顶点着色器默认 highp float / highp int），不声明直接编译失败——这就是 03 册报错表里 `No precision specified for type 'float'` 的由来。历史原因是老移动 GPU 的片元高精度很贵；如今 WebGL 规范已强制要求片元支持 highp（可用 `GL_FRAGMENT_PRECISION_HIGH` 宏查询），所以**在 WebGL 里写 `precision highp float;` 是安全的**，写 mediump 也常见（省带宽、颜色计算够用）。

什么时候 mediump 会真坏事：一是**大数值坐标**——世界坐标上万米时，float16 的步长已经是 8 的量级，物体顶点会"一格一格"抖动；二是**平滑渐变**——颜色精度不够出现色带（banding）。经验法则：**坐标与方向的计算 highp，颜色可以 mediump；拿不准就 highp**。

### 3.3.2 向量运算与构造器

```glsl
vec3 a = vec3(1.0);              // (1, 1, 1)：单标量广播
vec3 b = vec3(0.2, 0.4, 0.6);
vec3 c = a * b;                  // 逐分量乘：(0.2, 0.4, 0.6)；不是点积！
vec3 d = a * 2.0 + b;            // 与标量运算也是逐分量
vec4 e = vec4(b, 1.0);           // (小向量, 标量) 拼接 → (0.2, 0.4, 0.6, 1.0)
vec4 f = vec4(a.xy, b.yz);       // 向量拼接向量
vec3 g = vec3(e);                // vec4 → vec3 显式截断，合法
float dotAB = dot(a, b);         // 点积必须用 dot()
```

最容易踩的是**没有隐式类型转换**：`float x = 1;` 直接编译错误（对比 JS 的宽松），`x = i * 0.1;`（i 是 int）同样报错，要写 `x = float(i) * 0.1;`。写着色器时"1 还是 1.0"要时刻警觉。

### 3.3.3 swizzle：分量的花式访问

向量的分量有四套等价名字：`.xyzw`（位置习惯）、`.rgba`（颜色习惯）、`.stpq`（纹理习惯）。**swizzle** 指一次取多个分量，规则两条：

- 读（右值）：可以乱序、可以重复、最多取 4 个；一次 swizzle 里只能用同一套名字。
- 写（左值）：不能重复分量。

```glsl
vec4 v = vec4(1.0, 2.0, 3.0, 4.0);
vec3 a = v.xyz;      // (1, 2, 3)
vec3 b = v.bgr;      // (3, 2, 1)：颜色习惯 + 逆序，合法
vec2 c = v.xx;       // (1, 1)：重复，右值合法
float d = v.w;       // 单分量
v.xy = vec2(9.0, 8.0);   // 左值 swizzle：合法
// v.xx = vec2(9.0, 8.0);   // 非法：左值不能重复分量
// vec3 e = v.xg;           // 非法：混用了 xyzw 与 rgba 两套名字
```

三个高频用途：**重排**（`color.bgr` 调色相）、**打包拆包**（`position.xz` 取平面坐标、`vec4(v.xyz, 1.0)` 升维）、**构造**（配合构造器一行完成变换输出）。写着色器时 swizzle 比到处下标干净得多。

## 完整代码：渐变三角形——varying、swizzle 与 gl_FragCoord 一次看全

保存为 `glsl-demo.html` 运行：一个多彩渐变三角形，暗角效果由片元着色器用 `gl_FragCoord` 实时计算。代码骨架沿用 03 册模板（含 2.3 的完整排查函数），着色器是主角。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>GLSL 实验：varying、swizzle 与 gl_FragCoord</title>
<style>
  html, body { margin: 0; height: 100%; background: #101418; }
  canvas { display: block; width: 100vw; height: 100vh; }
</style>
</head>
<body>
<canvas id="gl"></canvas>
<script>
'use strict';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (!gl) { document.body.textContent = '当前浏览器不支持 WebGL'; throw new Error('no webgl'); }

const VS_SOURCE = `
attribute vec4 a_position;
varying vec2 v_uv;
void main() {
  // 把 NDC [-1,1] 映射到 [0,1]，当作"参数化坐标"传下去
  v_uv = a_position.xy * 0.5 + 0.5;
  gl_Position = a_position;
}
`;
const FS_SOURCE = `
precision highp float;          // 片元必须声明精度；坐标计算选 highp（见 3.3.1）
varying vec2 v_uv;              // 光栅化插值后的"位置参数"
uniform vec2 u_resolution;      // 画布像素尺寸，用于归一化 gl_FragCoord
void main() {
  vec3 warm = vec3(0.95, 0.55, 0.20);
  vec3 cold = vec3(0.15, 0.35, 0.85);
  vec3 grad = mix(cold, warm, v_uv.x);        // 水平渐变：varying 插值驱动

  vec3 shuffled = grad.bgr;                    // swizzle：交换 R/B 分量

  // gl_FragCoord：窗口坐标（原点左下），归一化到 [-1,1]
  vec2 p = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
  float vignette = 1.0 - 0.35 * dot(p, p);     // 点积算暗角：越靠边越暗

  vec3 color = mix(grad, shuffled, v_uv.y) * vignette;  // 纵向再混一次
  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(gl, type, source, name) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`[${name}] 编译失败:\n` + gl.getShaderInfoLog(shader));
    source.split('\n').forEach((line, i) => console.error(`${i + 1} | ${line}`));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource, 'vertex');
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource, 'fragment');
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('链接失败:\n' + gl.getProgramInfoLog(program));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

const program = createProgram(gl, VS_SOURCE, FS_SOURCE);
if (!program) throw new Error('着色器创建失败，看控制台');
gl.useProgram(program);

const vertices = new Float32Array([
  -0.6, -0.5, 0.0,
   0.6, -0.5, 0.0,
   0.0,  0.7, 0.0,
]);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 12, 0);

const uResolution = gl.getUniformLocation(program, 'u_resolution');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr) || 1;
  const h = Math.floor(canvas.clientHeight * dpr) || 1;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uResolution, w, h);    // 尺寸变了同步给片元着色器
  }
}
window.addEventListener('resize', resize);

gl.clearColor(0.063, 0.078, 0.094, 1.0);
resize();
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLES, 0, 3);
</script>
</body>
</html>
```

改着色器玩三个实验（01 导览任务 3）：把 `vignette` 的 `dot(p, p)` 换成 `abs(p.x)` 看竖条纹；用 `step(0.5, fract(v_uv.x * 8.0))` 做斑马条纹（分量式替代 if 的标准姿势）；把 `precision highp float` 改成 `lowp` 再看渐变色带（3.3.1 的坑眼见为实）。

## 常见坑

1. **片元着色器忘写 `precision`**：1.00 直接编译失败；报错文本见 03 册对照表。3.00 同样没有 float 默认精度，别以为升级版本就免了。
2. **int / float 字面量混用**：`float x = 1;`、`i * 0.1`（i 为 int）都报错；GLSL 全程无隐式转换，构造转换写 `float(i)`。
3. **swizzle 混命名集或左值重复**：`v.xg`、`v.xx = ...` 都是编译错；一套名字取到底。
4. **在 3.00 着色器里用 1.00 关键字**：`attribute` / `varying` / `gl_FragColor` 全部编译失败；对照 3.1.3 的迁移表逐个替换。反方向（1.00 着色器在 WebGL2 上下文）没问题。
5. **uniform 静默失效**：声明了但没用被优化掉，`getUniformLocation` 返回 null，之后所有 uniform 调用被静默忽略——症状是"值怎么改都不变"（03 册 2.3 的排查法）。
6. **mediump 精度事故**：大世界坐标抖动、渐变出现色带；坐标计算用 highp。
7. **以为 `vec3 * vec3` 是点积**：它是逐分量乘；点积 `dot`、叉积 `cross`、矩阵乘 `*`（mat 与 vec）各有各的语义。
8. **varying 两边类型不一致**（一边 vec3 一边 vec4）：链接期失败或数据错乱；同名同类型是硬约束。

## 本节自测

1. attribute / uniform / varying 分别在什么范围可见、多久更新一次？为什么 attribute 不能出现在片元着色器里？
2. 把下面 1.00 片元着色器改写成 ES 3.00：`precision mediump float; varying vec3 v_c; void main() { gl_FragColor = vec4(v_c, 1.0); }`（注意所有需要改动的点）。
3. `gl_FragCoord` 的坐标原点在哪个角？像素中心的坐标是小数还是整数？它与鼠标事件的坐标系差在哪？
4. 解释 `vec3 a = vec3(1.0); vec4 b = vec4(a.xy, 0.3, 1.0);` 每一步发生了什么；`a * a` 与 `dot(a, a)` 结果类型与含义分别是什么？
5. 片元着色器里 `float x = i * 0.5;`（i 是 int 循环变量）为什么编译失败？两种修法是什么？

---

下一篇：[05-图形学数学基础](05-图形学数学基础.md)——管线图上每一站之间的"路"，全部手推。
