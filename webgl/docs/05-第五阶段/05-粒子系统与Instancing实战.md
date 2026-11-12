# 粒子系统与 Instancing 实战

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是第五阶段第 4 条「粒子系统与 instancing 实战（万级粒子不掉帧）」的完整展开：CPU/GPU 两种更新策略的成本模型、速度存 attribute 在顶点着色器里积分的万级粒子完整实现、状态化纹理 ping-pong 进阶，以及与逐粒子 drawArrays 的性能对比；阶段导览见 [01-导览](01-导览.md)。

## 4.1 粒子更新的两种策略：CPU 与 GPU

粒子系统 = 一堆状态（位置、速度、寿命）+ 每帧更新 + 渲染。三个环节里「更新在哪做」决定了整个架构：

### 4.1.1 CPU 更新（JS 循环 + bufferSubData 上传）

```javascript
// CPU 更新：每帧遍历所有粒子，算完整体上传
function updateParticles(dt) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) respawn(p);                    // 重置到发射点
    p.vel[1] -= 9.8 * dt;                           // 重力
    p.pos[0] += p.vel[0] * dt; p.pos[1] += p.vel[1] * dt; p.pos[2] += p.vel[2] * dt;
    positions[i * 3] = p.pos[0]; positions[i * 3 + 1] = p.pos[1]; positions[i * 3 + 2] = p.pos[2];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, posVBO);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);  // 整块上传 10 万 × 12 字节
}
```

- **优势**：逻辑无限制——碰撞检测、曲线插值、与场景物件交互、任意规则；写法直观；WebGL1 也能跑。
- **成本**：每粒子每帧约几十纳秒的 JS 计算 + 每 3~4 字节一次的 GC 压力（用 TypedArray 压到最低）+ 全量上传带宽。经验值：**1 万粒子轻松，5 万粒子在低端机开始掉帧**，瓶颈首先是 JS 单线程的更新循环。

### 4.1.2 GPU 更新（着色器里算位置）

把物理公式搬进着色器，CPU 每帧只传一个 `uTime`，**连一个粒子的数据都不用上传**。两种流派：

1. **无状态（stateless）**：位置是时间的纯函数 `pos = f(seed, t)`。粒子的出生属性（初速、发射角、出生时刻）一次性写进 attribute，顶点着色器按弹道公式现算。适合喷泉、烟花、雨雪这类「轨迹可以解析表达」的系统——4.3 的完整实现就是它；
2. **有状态（stateful）**：位置速度必须逐帧积分（碰撞反弹、流场噪声）。WebGL2 没有计算着色器（Compute Shader），用「片段着色器当处理器 + 纹理当显存」模拟：状态存浮点纹理，每帧一个积分 pass 读旧纹理写新纹理（ping-pong，思路与 2.1.3 相同），见 4.4。

| 维度 | CPU 更新 | GPU 无状态 | GPU 有状态 |
|---|---|---|---|
| 万级粒子 | 1 万可行，5 万吃紧 | 10 万无压力 | 10 万无压力 |
| 逻辑自由度 | 任意 | 仅解析轨迹 | 通用（逐帧积分） |
| 每帧上传量 | O(n) | O(1)（一个 time） | O(1)（一个 dt） |
| 调试难度 | 低（console.log） | 中（公式错全错） | 高（状态在显存） |
| 适用 | UI 少量特效、强交互 | 喷泉烟花雨雪 | 流场、碰撞、烟雾 |

## 4.2 instancing 与粒子几何：一个四边形画一万次

实例化渲染（Instancing，第二阶段第 6 节的 WebGL2 特性）的命令只有一条 `drawArraysInstanced`，GPU 内部把「同一份顶点数据 × 每实例一份 attribute」展开。粒子正是它的教科书场景：**几何只有一个小四边形（billboard，公告板，始终面向相机），每个实例一份出生属性**。

```typescript
// 粒子几何 + 每实例 attribute 的组装（WebGL2 + VAO）
function createParticleMesh(gl: WebGL2RenderingContext, COUNT: number) {
  // 1) 四边形 4 个角（两个三角形用索引拼），仅 2D 角点，billboard 在顶点着色器里展开
  const quad = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  // 2) 每实例属性：aSeed(随机种子) + aBirth(出生相位) + aSpeed(初速度) + aColor
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    seeds[i * 4 + 0] = Math.random();            // seed.x：方位角随机
    seeds[i * 4 + 1] = Math.random();            // seed.y：俯仰/速度随机
    seeds[i * 4 + 2] = Math.random();            // seed.z：颜色随机
    seeds[i * 4 + 3] = Math.random();            // seed.w：出生相位错开
  }

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  bindAttribute(gl, 0, quad, 2, 0);                                  // location 0：角点
  bindAttributeInstanced(gl, 1, seeds, 4, 0);                        // location 1：per-instance
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, indexCount: indices.length, instanceCount: COUNT };
}

// 关键 API：divisor=1 表示该 attribute 每实例前进一步（默认 0 是每顶点前进一步）
function bindAttributeInstanced(gl, loc, data, size, stride) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(loc, 1);   // <- instancing 的开关
}
```

一次绘制调用：`gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, COUNT)`。

## 4.3 完整实现：速度存 attribute，GLSL 里积分

### 4.3.1 无状态弹道：位置是时间的函数

喷泉粒子的物理是抛体运动，高中物理就能写出解析解。粒子 i 的「本地时间」从出生时刻起算，用 `mod` 循环寿命：

$$t_{local} = mod(uTime + aBirth \cdot uLifetime,\ uLifetime)$$

初速由随机种子构造（球面随机方向 × 速度），位置：

$$p = p_0 + v_0 \, t + \frac{1}{2} g\, t^2$$

透明度沿寿命淡出，尺寸做透视衰减（近大远小，与投影推导一致：`size / w`）。**注意「积分在编译期就完成了」**——顶点着色器不是逐帧推进，而是对任意 t 直接求值，这正是无状态方案零上传的秘密，也意味着碰撞、变加速度这类「下一步依赖上一步」的物理进不来（那是 4.4 的领地）。

### 4.3.2 完整着色器

```glsl
// particle.vert —— 万级粒子：物理全部在顶点着色器现算
#version 300 es
layout(location = 0) in vec2 aCorner;    // 四边形角点 (-1..1)
layout(location = 1) in vec4 aSeed;      // 每实例：4 个随机数

uniform mat4 uProj;
uniform mat4 uView;                      // 仅用于取相机右/上向量做 billboard
uniform float uTime;
uniform float uLifetime;
uniform float uSize;

out float vAlpha;
out vec3 vColor;

void main() {
  // 1) 本地时间：寿命内循环，出生相位由种子错开
  float t = mod(uTime + aSeed.w * uLifetime, uLifetime);
  // 2) 初速：种子决定水平方位角与仰角（锥形喷射）
  float theta = aSeed.x * 6.2831853;
  float phi   = 0.6 + aSeed.y * 0.4;            // 仰角限制在锥内
  float speed = 3.0 + aSeed.y * 2.0;
  vec3 v0 = vec3(
    cos(theta) * cos(phi),
    sin(phi),
    sin(theta) * cos(phi)
  ) * speed;
  // 3) 抛体运动解析解（GLSL 里"积分"= 直接代公式）
  vec3 pos = vec3(0.0, 0.0, 0.0) + v0 * t + 0.5 * vec3(0.0, -9.8, 0.0) * t * t;
  // 4) billboard：用视图矩阵的行向量拿到相机的右/上方向（世界空间）
  vec3 camRight = vec3(uView[0][0], uView[1][0], uView[2][0]);
  vec3 camUp    = vec3(uView[0][1], uView[1][1], uView[2][1]);
  float size = uSize * (0.5 + aSeed.z * 0.5);   // 种子决定大小差异
  vec3 worldPos = pos + (camRight * aCorner.x + camUp * aCorner.y) * size;
  // 5) 输出 + 透视尺寸感（片元里做圆形裁剪用 aCorner 传下去也行，此处用 alpha）
  gl_Position = uProj * uView * vec4(worldPos, 1.0);
  // 6) 淡入淡出：出生与死亡各留 15% 寿命过渡
  vAlpha = smoothstep(0.0, 0.15 * uLifetime, t) * (1.0 - smoothstep(0.85 * uLifetime, uLifetime, t));
  vColor = mix(vec3(1.0, 0.85, 0.4), vec3(1.0, 0.4, 0.1), aSeed.z); // 火花色随机
}
```

```glsl
// particle.frag —— 圆形软粒子
#version 300 es
precision mediump float;
in float vAlpha;
in vec3 vColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vColor, vAlpha);
  // 配合混合状态：gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);（加法混合出"发光"感）
}
```

### 4.3.3 渲染状态与主循环

粒子是透明物体，遵守第二阶段的渲染队列纪律：**不透明先画、粒子后画、深度测试开但深度写入关**（`depthMask(false)`），否则粒子会往深度缓冲里写一堆四边形互相遮挡。

```typescript
// 渲染循环里的粒子 pass（伪代码，衔接第三阶段引擎雏形）
gl.useProgram(particleProgram);
gl.uniformMatrix4fv(loc.uProj, false, camera.proj);
gl.uniformMatrix4fv(loc.uView, false, camera.view);
gl.uniform1f(loc.uTime, elapsed);            // CPU 每帧只传这几个 uniform
gl.uniform1f(loc.uLifetime, 3.0);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);          // 加法混合：火花亮度叠加
gl.depthMask(false);                          // 粒子不写深度（透明物纪律）

gl.bindVertexArray(particleMesh.vao);
gl.drawElementsInstanced(gl.TRIANGLES, particleMesh.indexCount, gl.UNSIGNED_SHORT, 0, particleMesh.instanceCount);
// 10000 个粒子：一次 drawcall 结束
```

10 万粒子时每帧 CPU 负载 = 几个 uniform 上传；顶点着色器执行 40 万次（每粒子 4 顶点）对 GPU 是毫秒以内的事——**万级粒子不掉帧的全部秘密就是：上传 O(1) + 绘制 O(1)**。

## 4.4 进阶：状态存纹理的 GPU 更新（ping-pong 积分）

无状态方案表达不了「每帧依赖上一帧」的物理。WebGL2 的替代：**浮点纹理当显存，片段着色器当积分器**。

### 4.4.1 数据布局

两张 `RGBA32F` 纹理（ping-pong，思路同 2.1.3）：

- **posTex**：xyz 存位置，w 存剩余寿命；
- **velTex**：xyz 存速度，w 空闲（可存质量/温度）。

纹理尺寸如 128×128 = 16384 粒子。粒子的「编号」就是纹素坐标。

### 4.4.2 积分 pass 与渲染 pass

```glsl
// integrate.frag —— 状态积分 pass：一个纹素 = 一个粒子的下一帧状态
#version 300 es
precision highp float;
// WebGL2 原生支持浮点纹理渲染目标（EXT_color_buffer_float 需开启）
uniform sampler2D uPosTex;   // 读旧
uniform sampler2D uVelTex;   // 读旧
uniform float uDt;
uniform float uTime;
out vec4 outPos;             // 写新（FBO 附件 0）
layout(location = 1) out vec4 outVel;             // MRT：附件 1（第二阶段第 6 节）
void main() {
  ivec2 tc = ivec2(gl_FragCoord.xy);              // 纹素坐标即粒子编号
  vec4 pos = texelFetch(uPosTex, tc, 0);
  vec4 vel = texelFetch(uVelTex, tc, 0);
  if (pos.w <= 0.0) {                             // 死亡：重生到发射点
    outPos = vec4(0.0, 0.0, 0.0, 2.0 + fract(sin(float(tc.x) * 12.9898 + float(tc.y) * 78.233)) * 2.0);
    outVel = vec4(hash3(tc) * 5.0, 1.0);
    return;
  }
  // 半隐式欧拉：先更新速度，再用新速度更新位置（比显式欧拉稳定）
  vec3 acc = vec3(0.0, -9.8, 0) + curlNoise(pos, uTime) * 2.0; // 流场噪声可选
  vel.xyz += acc * uDt;
  pos.xyz += vel.xyz * uDt;
  pos.w   -= uDt;
  outPos = pos;
  outVel = vel;
}
```

渲染 pass 的顶点着色器里用 `texelFetch` 按实例编号取出状态（`gl_InstanceID` 换算成纹素坐标），billboard 展开与 4.3 相同：

```glsl
// stateful particle.vert 片段：从纹理取状态
uniform sampler2D uPosTex;
uniform sampler2D uVelTex;
void main() {
  int N = textureSize(uPosTex, 0).x;              // 纹理边长
  ivec2 tc = ivec2(gl_InstanceID % N, gl_InstanceID / N);
  vec4 pos = texelFetch(uPosTex, tc, 0);
  // ... billboard 展开、alpha 由 pos.w（寿命）驱动，同 4.3
}
```

这个模式的本质是**用光栅化模拟通用计算**：一张 1×N 像素的「全屏」绘制就是 N 个并行线程各自积分一个粒子。WebGPU 的 Compute Shader 里这套模式原生存在，概念可以直接迁移。

## 4.5 性能对比：逐粒子 drawArrays vs instancing

### 4.5.1 成本模型

逐粒子绘制的写法（每粒子一次 `drawArrays(gl.POINTS)` + 换算位置 uniform）：

```typescript
for (let i = 0; i < COUNT; i++) {
  gl.uniform3f(loc, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); // 每粒子 1 次 uniform 上传
  gl.drawArrays(gl.POINTS, i, 1);                                 // 每粒子 1 次 drawcall
}
```

按第七章 6.1 的成本模型：一次 WebGL 绘制调用的 CPU 侧开销（JS→浏览器进程→驱动校验）数量级在**几微秒**，1 万次即几十毫秒——**60fps 的帧预算（16.6ms）在几千次 drawcall 就烧完了，GPU 还没开始干活**。这是 CPU 驱动开销问题，GPU 填充率根本不是瓶颈。

| 方案 | drawcall 数 | 每帧上传 | 1 万粒子帧耗时（桌面 Chrome 量级） |
|---|---|---|---|
| 逐粒子 drawArrays | 10000 | 10000 次 uniform | 30~80ms（CPU 满载，掉到十几帧） |
| 动态 VBO + 一次 drawArrays | 1 | O(n)（位置数组整体上传） | 2~5ms（更新循环在上传上） |
| instancing 无状态（4.3） | 1 | O(1)（几个 uniform） | <1ms（渲染部分几乎免费） |
| instancing + 纹理积分（4.4） | 2（积分 + 绘制） | O(1) | 1~2ms |

三点提醒：

1. **对比要连同更新成本一起算**：动态 VBO 方案把绘制省了，但 CPU 更新循环还在（4.1.1），一万粒子尚可、十万粒子回到老问题；
2. **别过早上 4.4**：几百个粒子用 CPU 更新最便宜也最好调试；架构按粒子量级选型，不是按技术新旧；
3. **移动端系数**：移动 GPU 的顶点吞吐与填充率都低一档，粒子上限按桌面的 1/5~1/10 估，粒子四边形像素面积（填充率）反而可能先成瓶颈。

## 常见坑

1. **`vertexAttribDivisor` 设了但 VAO 没绑定就调用**——divisor 是 VAO 状态，设置时必须正在绑定该 VAO，否则设到了别的（或默认）VAO 上，实例间 attribute 不变、一万粒子叠成一点。
2. **billboard 取错相机轴**：`uView[0]` 是矩阵第一列不是第一行。GLSL 的 `m[i]` 是第 i 列，相机右向量 = 视图矩阵第一**行** = `vec3(uView[0][0], uView[1][0], uView[2][0])`（4.3.2 代码已写对，抄的时候容易把后两个下标写成 `[0][1]`、`[0][2]`）。
3. **粒子写深度**——`depthMask(false)` 没关，透明粒子互相深度剔除，加法混合出现「黑洞」。透明物体不写深度是第二阶段的老规矩，粒子是重灾区。
4. **`mod` 循环寿命导致粒子「集体重生」**——出生相位不是随机而是同相位时，所有粒子同生同死呈脉冲状。`aSeed.w` 必须铺满 [0,1)。
5. **RGBA32F 渲染目标没开 `EXT_color_buffer_float`**——纹理采样浮点 WebGL2 原生支持，但**渲染进**浮点 FBO 需要该扩展（与 2.1.1 的 RGBA16F 同一条规则）。
6. **半隐式与显式欧拉搞混**——`pos += vel * dt` 用的若是旧速度（显式欧拉），弹跳粒子能量会发散；先更新 vel 再更新 pos（4.4.2 的顺序）稳定得多。
7. **状态纹理采样用了 `texture()` 带过滤**——积分 pass 里必须 `texelFetch`（无过滤逐纹素），`texture()` 的线性过滤会把相邻粒子状态插值出一个「中间粒子」。

## 本节自测

1. 三种方案（CPU 更新、GPU 无状态、GPU 状态纹理）各自「每帧上传多少数据」？分别适合什么物理逻辑？
2. 无状态方案里「积分」发生在什么时候？为什么碰撞检测进不来？如果要加地面反弹（y < 0 时 v.y 取反），两种方案各要怎么改？
3. `vertexAttribDivisor(loc, 1)` 改变的是什么语义？一个 4 顶点的 quad + divisor=1 的 attribute，实例化后 attribute 总共被读取多少次？
4. 推导 billboard 为什么要用视图矩阵的行而不是列；写出相机右向量在 GLSL 里的下标表达式。
5. 逐粒子 drawArrays 掉帧时，Chrome 性能面板里烧时间的是主线程 JS 还是 GPU？由此说明「优化粒子」的第一刀该砍哪里。
6. 状态纹理方案里粒子编号与纹素坐标如何互转？渲染 pass 与积分 pass 各自的「每个粒子执行一次」分别由光栅化的什么机制保证？
