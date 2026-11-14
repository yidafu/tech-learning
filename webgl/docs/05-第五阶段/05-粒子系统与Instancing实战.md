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

### 4.3.4 手工演算：把 4.3.2 的公式代进一组种子

着色器里每个粒子只是"种子 + uTime"的一次函数求值。取一组具体种子把 4.3.1 的公式走一遍（参数用 4.3.2 的默认值：uLifetime = 3.0，重力 9.8；uTime = 5.0），粒子种子取 aSeed = (0.125, 0.5, 0.3, 0.25)：

| 步骤 | 代入 | 结果 |
|---|---|---|
| 本地时间 | t = mod(5.0 + 0.25×3.0, 3.0) | mod(5.75, 3.0) = **2.75** |
| 方位角 theta | 0.125 × 6.2832 | ≈ 0.785（45°） |
| 仰角 phi | 0.6 + 0.5×0.4 | 0.8 |
| 初速大小 | 3.0 + 0.5×2.0 | 4.0 |
| 初速向量 v0 | (cosθ·cosφ, sinφ, sinθ·cosφ)×4 | ≈ (1.97, 2.87, 1.97) |
| 末位置 x, z | v0.xz × t | ≈ 5.42 |
| 末位置 y | v0.y × t − 4.9·t² | 2.87×2.75 − 4.9×7.56 ≈ **−29.2** |

最后一行的 y 是负的 29 米——**这颗粒子在寿命结束前早就坠到了发射平面以下约 29 个单位**。这不是算错，是无状态方案的物理事实：初速 y 分量约 2.87 m/s，上升峰值只有 v²/2g ≈ 0.42 个单位、在 t ≈ 0.29s 就到顶，之后一路自由落体；寿命 3 秒意味着后 2.4 秒都在地下穿行（被地面mesh遮住看不见，或者说在发射器正下方持续渲染着一批不可见粒子）。由此读出三个调参直觉：

1. **寿命与初速必须配对**：想让粒子全程可见，寿命应取"弹道回到发射平面附近"的时长（这套参数下约 0.6~0.8s），或把重力/初速调小。喷泉 demo 们普遍用"短寿命 + 高发射率"而不是"长寿命"来撑粒子量，原因就在这；
2. **无状态方案加不了地面反弹**——粒子穿地后本应反弹（y<0 时 v.y 取反），但反弹需要知道"已经反弹过"，这是状态（自测第 2 问的伏笔）。穿地即"死亡"或"淡出"是无状态下唯一诚实的处理；
3. **fade-out 的实际作用窗口**：淡出从 0.85×寿命（2.55s）开始，t = 2.75 时透明度已降到约六成以下——视觉上这颗粒子在被地面遮住之前就已经大半隐身，参数之间的耦合（寿命、淡出窗口、弹道）要整体看。

把这套代入在纸上演一遍，再回 4.3.2 的着色器逐行对号——"解析轨迹"四个字就从概念变成了你会算的东西。

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

### 4.4.3 ping-pong 的工程细节清单

4.4.2 只给了积分 pass 的着色器，把它落成能跑的工程还有五件事，每件都是独立的坑位：

1. **两套纹理两个 FBO，成对交换**：posTex/velTex 各配一个 FBO（MRT 一帧写两张，也可以合一）。每帧顺序固定：读 A/B → 积分 pass 写进 C/D → **交换指针**（JS 侧一个两元素的数组换下标即可，别重建对象）→ 渲染 pass 采样"刚写完的那对"。交换发生在帧末，两个 pass 看到的永远是完整一致的一帧状态；
2. **初始状态从 CPU 写一次**：第 0 帧的"旧纹理"里必须有合法数据（否则 `texelFetch` 读到全 0，寿命 w=0 会触发全员第一帧重生，表现为"开局所有粒子闪一下"）。用 `texImage2D` 直接上传一个填好初始 pos/vel 的 Float32Array——这是整个系统里唯一一次 CPU 写状态；
3. **重生哈希要"逐粒子不同且逐次不同"**：4.4.2 重生分支里的 `hash3(tc)` 只用了纹素坐标，重生后每次轨迹完全相同（同一编号的粒子永远走同一条路线，肉眼可辨"复制感"）。把 uTime（取模后的）或重生计数混进哈希输入，让每次重生的初速方向都不同；
4. **精度纪律与 4.3 相同但更严**：位置在纹理里逐帧累加，float32 的误差会**永久积累**（无状态方案每帧从头求值，误差不积累；有状态方案是积分器，误差会漂）。运行几分钟后粒子整体缓慢漂移，就是浮点积分的误差在攒——对视觉特效通常可接受，做仿真就要换高精度或定期归一化；
5. **纹理尺寸就是粒子上限**：128×128 = 16384 个粒子是**硬编码在纹理尺寸里的**，扩容要重建纹理并重新写初始状态（不是改个 uniform 的事）。选尺寸时按 4.5 的移动端系数留好余量，别等上线了再改。

对照记忆：这五件事与第七章 6.3 的显存/生命周期纪律同源——"谁创建谁释放""创建移出循环""动态数据用对更新方式"，在 ping-pong 里全部有具体的对应物。

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

## 4.6 填充率：instancing 解决不了的另一半预算

4.5 的表格全部在讲"提交侧"（drawcall 与上传）。但粒子是像素机器：**一万个小四边形叠在屏幕中央，GPU 的片元阶段要为它们逐个着色**，这部分成本 instancing 一分钱都省不掉。算一笔填充率的账（算术示例，取值随意但方法通用）：

| 量 | 算式 | 结果 |
|---|---|---|
| 单粒子的屏幕面积 | 24×24 像素的四边形 | 576 片元 |
| 全系统片元量 | 10000 粒子 × 576 | ≈ 576 万片元/帧 |
| 与满屏片元的对比 | 1080p 满屏 ≈ 207 万片元 | **≈ 2.8 个满屏 pass 的量** |
| overdraw 的实际放大 | 粒子聚集在喷射点附近，局部重叠 5~10 层很常见 | 局部区域片元量再乘重叠层数 |

也就是说：哪怕渲染提交便宜到近乎免费，这一帧的片元着色器仍然要在喷射点附近把同样的十几层像素各算一遍——每层都是采样混合 + 加法混合的读改写带宽。**这就是 4.5 提醒三"粒子上限按填充率估"的算术来源**。控制手段按性价比排：

1. **缩四边形的屏幕尺寸**（`uSize` 与透视衰减 jointly 决定）：片元量按尺寸平方掉，24px 减到 16px 直接省一半多——最便宜的一刀；
2. **减粒子数前先减"看不见的粒子"**：寿命末端已坠地/已透明的粒子（4.3.4 演算里那 29 米）照样占四边形并可能生成片元。淡出到阈值以下就该缩到零尺寸——透明度可以留在 shader，尺寸必须真的归零；
3. **密度上限**：限制单位屏幕面积上的粒子数（发射器分摊/距离衰减），防的是"聚集处局部过载"，比全局限额更对症；
4. **混合方式影响带宽**：加法混合（SRC_ALPHA, ONE）每个覆盖片元都是"读颜色缓冲 → 加 → 写回"，overdraw 区的带宽开销与片元量同阶——比几何优化更容易成为移动端瓶颈，降粒子尺寸的收益在这里二次兑现。

一句话：**顶点侧的问题用 instancing 解决，片元侧的问题用"更小的四边形 + 更少的重叠 + 更短的可见寿命"解决**——两本账分开算，粒子系统的预算才算完整。

## 常见坑

1. **`vertexAttribDivisor` 设了但 VAO 没绑定就调用**——divisor 是 VAO 状态，设置时必须正在绑定该 VAO，否则设到了别的（或默认）VAO 上，实例间 attribute 不变、一万粒子叠成一点。
2. **billboard 取错相机轴**：`uView[0]` 是矩阵第一列不是第一行。GLSL 的 `m[i]` 是第 i 列，相机右向量 = 视图矩阵第一**行** = `vec3(uView[0][0], uView[1][0], uView[2][0])`（4.3.2 代码已写对，抄的时候容易把后两个下标写成 `[0][1]`、`[0][2]`）。
3. **粒子写深度**——`depthMask(false)` 没关，透明粒子互相深度剔除，加法混合出现「黑洞」。透明物体不写深度是第二阶段的老规矩，粒子是重灾区。
4. **`mod` 循环寿命导致粒子「集体重生」**——出生相位不是随机而是同相位时，所有粒子同生同死呈脉冲状。`aSeed.w` 必须铺满 [0,1)。
5. **RGBA32F 渲染目标没开 `EXT_color_buffer_float`**——纹理采样浮点 WebGL2 原生支持，但**渲染进**浮点 FBO 需要该扩展（与 2.1.1 的 RGBA16F 同一条规则）。
6. **半隐式与显式欧拉搞混**——`pos += vel * dt` 用的若是旧速度（显式欧拉），弹跳粒子能量会发散；先更新 vel 再更新 pos（4.4.2 的顺序）稳定得多。
7. **状态纹理采样用了 `texture()` 带过滤**——积分 pass 里必须 `texelFetch`（无过滤逐纹素），`texture()` 的线性过滤会把相邻粒子状态插值出一个「中间粒子」。
8. **uTime 跑几个小时后粒子"发抖"**——float 只有约 7 位十进制有效数字，uTime 到几万秒量级时 `mod(uTime + 相位, uLifetime)` 的小数部分精度崩掉，轨迹抖动/跳变。对策：CPU 侧把时间在"寿命周期"上取模后再上传（GPU 只见周期内的小数值，精度问题消失）；多个不同寿命的系统各传各的周期内时间。
9. **换了 alpha 混合但没恢复透明排序**——加法混合（SRC_ALPHA, ONE）与顺序无关（加法交换律），所以粒子可以不排序；一旦换成普通半透明混合（SRC_ALPHA, ONE_MINUS_SRC_ALPHA），顺序就直接影响结果，第二阶段"透明物体按深度从远到近"的队列纪律必须恢复，否则粒子重叠区闪烁/发灰。改混合模式等于重新做一次排序需求的评估，不是换个参数那么简单。

## 本节自测

1. 三种方案（CPU 更新、GPU 无状态、GPU 状态纹理）各自「每帧上传多少数据」？分别适合什么物理逻辑？
2. 无状态方案里「积分」发生在什么时候？为什么碰撞检测进不来？如果要加地面反弹（y < 0 时 v.y 取反），两种方案各要怎么改？
3. `vertexAttribDivisor(loc, 1)` 改变的是什么语义？一个 4 顶点的 quad + divisor=1 的 attribute，实例化后 attribute 总共被读取多少次？
4. 推导 billboard 为什么要用视图矩阵的行而不是列；写出相机右向量在 GLSL 里的下标表达式。
5. 逐粒子 drawArrays 掉帧时，Chrome 性能面板里烧时间的是主线程 JS 还是 GPU？由此说明「优化粒子」的第一刀该砍哪里。
6. 状态纹理方案里粒子编号与纹素坐标如何互转？渲染 pass 与积分 pass 各自的「每个粒子执行一次」分别由光栅化的什么机制保证？
7. 按 4.3.4 的演算路子，自己取一组种子（记下每一步算式）：本地时间是多少？末位置在哪？这颗粒子寿命的百分之几花在"可见弧段"上？由此说出无状态方案选 uLifetime 的一条原则。
8. 加法混合为什么让粒子可以不做深度排序？换成普通 alpha 混合后必须恢复哪条纪律、否则画面出什么问题？4.6 的填充率账里，混合方式影响的是成本中的哪一项？
