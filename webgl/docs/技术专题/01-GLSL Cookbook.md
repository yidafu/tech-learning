# GLSL Cookbook：着色器技法箱

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是技术专题第一篇：在第二阶段 Blinn-Phong 光照（[02-第二阶段/05-光照](../02-第二阶段/05-光照.md)）的地基上，给出九组"效果描述 → 原理 → 完整 GLSL → 调参表 → 成本"的进阶技法，服务第二、五阶段的加深与第六阶段毕业项目的效果需求；分册导览见 [00-导览](00-导览.md)。

三条全篇约定：

- WebGL1 语法，顶点/片元成对给出、配好 varying，可整段复制；JS 骨架（createProgram、m4 矩阵库）直接用 [02-第二阶段/05-光照](../02-第二阶段/05-光照.md) 的实现。
- 所有动画吃 `uTime`（秒），不依赖帧计数；法线在片元里一律重新 `normalize`（原因见光照篇常见坑 2）。
- 每节末尾的调参表给出推荐区间，抄走后先扫一遍表再改。

## 1.1 菲涅尔边缘光（Fresnel Rim）

**效果**：物体轮廓边缘泛起一圈亮色，正对相机的表面几乎不受影响。用于角色逆光补亮、水面远处反光、能量护盾/传送门的发光边。

**原理**：菲涅尔（Fresnel）效应——视线越掠射（grazing angle，与表面夹角趋近 90°），表面反射率越高。物理版 Schlick 近似 `F = F0 + (1 − F0)(1 − cosθ)^5` 在 [PBR 入门 3.2.2](../05-第五阶段/04-PBR入门.md) 已推导，本文不重复；这里只要"边缘亮"的**曲线形状**，所以把固定指数 5 泛化成 `uRimPower`，再用 `uRimRange` 截掉中心残留：

```
rim = (1 − cosθ)^p        cosθ = dot(N, V)：1 正对相机，0 掠射边缘
p=2：从中心到边缘整条坡都在亮（大范围柔光/逆光补亮）
p=5：中心接近 0，只有边缘翘起（贴近 Schlick，细边描线）
```

```glsl
// rim.vert —— 全篇标准骨架：世界空间位置 + 法线
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel, uView, uProjection;
uniform mat3 uNormalMatrix;
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = uNormalMatrix * aNormal;
  gl_Position = uProjection * uView * world;
}
```

```glsl
// rim.frag
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
uniform vec3 uCameraPos;
uniform vec3 uRimColor;
uniform float uRimPower;     // 边缘收束指数
uniform float uRimRange;     // 中心截断阈值
uniform float uRimStrength;  // 强度
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  float cosTheta = max(dot(N, V), 0.0);
  float rim = pow(1.0 - cosTheta, uRimPower);
  rim = smoothstep(uRimRange, uRimRange + 0.15, rim) * uRimStrength;
  vec3 base = vec3(0.16, 0.18, 0.24);   // 占位底色：替换为你的光照结果再叠加
  gl_FragColor = vec4(base + uRimColor * rim, 1.0);
}
```

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uRimPower | 边缘宽度指数，越大光带越窄 | 2（大范围柔光）～ 6（细边） |
| uRimRange | 截断阈值，抬高后中心不渗光 | 0 ～ 0.6 |
| uRimStrength | 亮度倍率 | 0.5 ～ 3 |
| uRimColor | 边缘光颜色 | 冷色科技感，暖色逆光 |

**场景与成本**：本节是后面多个技法的零件——1.2 的内描边、1.5 的反射混合、1.6 的全息边缘、1.8 的水色混合全用它。成本：每片元一次 dot + pow，可忽略不计。

## 1.2 卡通着色（Cel / Toon Shading）

**效果**：漫反射变成一档一档的色带，高光变成整块亮斑——赛璐璐（Cel）动画的着色质感，二次元游戏标配。

**原理**：把 Blinn-Phong 的**连续输出量化（quantization）**。对 [02-第二阶段/05-光照](../02-第二阶段/05-光照.md) 的漫反射项 `max(N·L, 0)` 做分层：`floor(ndl × steps) / steps` 把 [0,1] 切成 steps 档；高光项 `pow(N·H, s)` 本来连续衰减，套一层 `step(阈值, ·)` 变成"有/无"的硬块。改造点对照：

| 项 | Blinn-Phong（光照篇 4.3） | 卡通版 |
|---|---|---|
| 漫反射 | `ndl` 连续渐变 | `floor(ndl·steps)/steps` 阶梯 |
| 高光 | `pow(N·H, s)` 连续衰减 | `step(阈值, pow)` 整块亮/灭 |
| 衰减与环境 | 点光三项衰减 + ambient | 通常砍掉距离衰减，保一阶最暗底色 |
| 边缘 | 无 | 菲涅尔实心内描边（1.1 改造） |

阶梯边界本质是量化噪声，静止看是干净的硬边，相机移动时边界会"爬"（走样的一种，见 [数学专题/05](../数学专题/05-采样卷积与频域.md) 5.1.4）——加一层轻微 dither 可以缓解，风格化项目一般忍受它。

```glsl
// toon.vert —— 与 1.1 的 rim.vert 完全相同，复制即可
```

```glsl
// toon.frag —— 三处改造点对应上表
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;       // 指向光源（平行光）
uniform vec3 uBaseColor;
uniform float uSteps;         // 色阶数
uniform float uSpecThreshold; // 高光块阈值
uniform float uShininess;
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimRange;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPos);

  // 改造 1：漫反射阶梯化（先抬底再分层，保住最暗一阶不死黑）
  float ndl = max(dot(N, L), 0.0);
  ndl = ndl * 0.9 + 0.1;
  float diffuse = floor(ndl * uSteps) / uSteps;
  diffuse = max(diffuse, 1.0 / uSteps);

  // 改造 2：高光硬阈值化（Blinn 半程向量过 step）
  vec3 H = normalize(L + V);
  float spec = step(uSpecThreshold, pow(max(dot(N, H), 0.0), uShininess));

  // 改造 3：菲涅尔内描边（1.1 的 rim，光带换成实心描边色）
  float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  float line = smoothstep(uRimRange, uRimRange + 0.06, rim);

  vec3 color = uBaseColor * diffuse + vec3(spec) * 0.7;
  color = mix(color, uRimColor, line);
  gl_FragColor = vec4(color, 1.0);
}
```

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uSteps | 色阶数 | 2 ～ 4（再多就不像卡通） |
| uSpecThreshold | 高光块出现门槛 | 0.75 ～ 0.95 |
| uShininess | 高光集中度 | 32 ～ 128 |
| uRimRange / uRimPower | 内描边宽度控制 | 0.5 ～ 0.8 / 3 ～ 6 |

**场景与成本**：风格化角色、UI 图标渲染。成本与 Blinn-Phong 同量级（floor/step 比 pow 还便宜）。

## 1.3 轮廓描边三法

**效果**：角色/物体外圈一条 (通常) 深色描边。三种实现路线成本与适用面完全不同。

### 法一：背面扩张法（back-face expansion）

把网格沿法线膨胀一圈，剔除正面只画背面——膨胀壳露出本体边缘的部分就是描边。

```glsl
// outline.vert —— 膨胀壳：与本体共用同一份顶点数据
attribute vec3 aPosition;
attribute vec3 aOutlineNormal;   // 平滑法线：硬边修复见下文
uniform mat4 uModel, uView, uProjection;
uniform mat3 uNormalMatrix;
uniform float uOutlineWidth;     // 世界空间宽度
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  // 世界空间沿法线外推；非一致缩放必须走 normalMatrix（光照篇 4.1）
  world.xyz += normalize(uNormalMatrix * aOutlineNormal) * uOutlineWidth;
  gl_Position = uProjection * uView * world;
}
```

```glsl
// outline.frag
precision mediump float;
uniform vec3 uOutlineColor;
void main() { gl_FragColor = vec4(uOutlineColor, 1.0); }
```

```javascript
// 描边 pass 的渲染状态（画在本体之后，同一个 mesh 画第二遍）
gl.useProgram(outlineProgram);
gl.cullFace(gl.FRONT);          // 只画壳的背面，绕序与剔除见 02/04 3.4
gl.depthMask(false);            // 壳不写深度，避免遮挡后续透明物体
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
gl.cullFace(gl.BACK); gl.depthMask(true);   // 恢复状态
```

**法线外扩的硬边问题**：立方体这类硬边模型，同一条棱两侧的顶点被复制了两份、法线各指各的面——外扩方向不同，壳在棱处被撕开，描边出现裂缝。修复：给描边 pass 单独准备一份"按位置焊接后平均的平滑法线"attribute：

```typescript
// buildOutlineNormals：按位置聚合顶点求平均法线（描边专用）
export function buildOutlineNormals(pos: Float32Array, nrm: Float32Array): Float32Array {
  const key = (i: number) =>
    `${Math.round(pos[i] * 1e4)},${Math.round(pos[i + 1] * 1e4)},${Math.round(pos[i + 2] * 1e4)}`;
  const acc = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.length; i += 3) {
    const k = key(i);
    const a = acc.get(k) ?? [0, 0, 0];
    a[0] += nrm[i]; a[1] += nrm[i + 1]; a[2] += nrm[i + 2];
    acc.set(k, a);
  }
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = acc.get(key(i))!;
    const len = Math.hypot(x, y, z) || 1;
    out[i] = x / len; out[i + 1] = y / len; out[i + 2] = z / len;
  }
  return out;
}
```

### 法二：菲涅尔内描边

直接复用 1.1/1.2 改造 3：`mix(color, lineColor, smoothstep(...))` 把边缘光带画成实心色。零额外 pass，但宽度随表面曲率变化（平坦区域没有线），只能算"轮廓区着色"，做不了干净的外描边。

### 法三：后处理 Sobel 边缘检测

先把场景画进 FBO（[02-第二阶段/06-帧缓冲与离屏渲染](../02-第二阶段/06-帧缓冲与离屏渲染.md)），再用 Sobel 核（3×3 卷积，定义见 [数学专题/05](../数学专题/05-采样卷积与频域.md) 5.2）对亮度求梯度——梯度大的地方就是边缘。邻居采样思路与 [FXAA](../05-第五阶段/03-后处理管线.md) 2.3 同族，顶点用该篇 2.1.2 的全屏大三角形。

```glsl
// sobel.frag —— 全屏后处理 pass
precision highp float;
varying vec2 vUV;
uniform sampler2D uScene;    // 场景颜色纹理
uniform vec2 uTexelSize;     // vec2(1/width, 1/height)
uniform float uThreshold;    // 边缘判定阈值
uniform vec3 uOutlineColor;
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 t = uTexelSize;
  float tl = luma(texture2D(uScene, vUV + vec2(-t.x,  t.y)).rgb);
  float tc = luma(texture2D(uScene, vUV + vec2( 0.0,  t.y)).rgb);
  float tr = luma(texture2D(uScene, vUV + vec2( t.x,  t.y)).rgb);
  float ml = luma(texture2D(uScene, vUV + vec2(-t.x,  0.0)).rgb);
  float mr = luma(texture2D(uScene, vUV + vec2( t.x,  0.0)).rgb);
  float bl = luma(texture2D(uScene, vUV + vec2(-t.x, -t.y)).rgb);
  float bc = luma(texture2D(uScene, vUV + vec2( 0.0, -t.y)).rgb);
  float br = luma(texture2D(uScene, vUV + vec2( t.x, -t.y)).rgb);
  // Sobel 核：横/纵梯度
  float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
  float gy = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);
  float edge = step(uThreshold, length(vec2(gx, gy)));
  vec3 scene = texture2D(uScene, vUV).rgb;
  gl_FragColor = vec4(mix(scene, uOutlineColor, edge), 1.0);
}
```

对颜色做 Sobel 会把**纹理内部的明暗边界**也描出来（砖缝、阴影边全成线）；工业做法是用 MRT（[02-第二阶段/07-WebGL2特性](../02-第二阶段/07-WebGL2特性.md)）多输出一张深度/法线缓冲，对**深度不连续**描边——只有几何轮廓，不误伤纹理。

### 三法对比

| 方法 | 额外成本 | 线宽可控性 | 内部线条 | 适用 |
|---|---|---|---|---|
| 背面扩张 | 整个网格重画一遍（drawcall + 顶点负载翻倍） | 世界空间常宽，透视下远处变细 | 无 | 中低模角色、卡通游戏标配 |
| 菲涅尔内描边 | 零（并进本体着色器） | 随曲率变化，不均匀 | 无 | 已有卡通/菲涅尔着色时的顺手补充 |
| Sobel 后处理 | 一整个全屏 pass（每像素 9 次采样）+ 前置 FBO | 靠阈值控"灵敏度"，不是真宽度 | 有（颜色边界都算线） | 截图风格化、任意几何；换深度缓冲可做工业级 |

## 1.4 溶解效果（Dissolve）

**效果**：物体从随机分布的边缘开始烧穿、消失，烧穿的边界带一条发光。死亡、传送、载具损毁的经典表现。

**原理**：噪声场给每个片元一个 [0,1] 的"淘汰序号"；阈值 `uThreshold` 从 0 推到 1，序号低于阈值的片元 `discard`；紧贴阈值上方用 smoothstep 画一条亮带伪装"烧红的边缘"。噪声不需要素材，用正弦哈希（hash）函数现场生成，再做双线性插值得到值噪声（value noise）——插值的手算细节在 [数学专题/05](../数学专题/05-采样卷积与频域.md) 5.1.2。

```glsl
// dissolve.vert —— 任意网格通用，只需 UV
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModel, uView, uProjection;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
```

```glsl
// dissolve.frag
precision highp float;
varying vec2 vUV;
uniform float uThreshold;   // 淘汰进度：0 完整 → 1 全部溶解
uniform float uEdgeWidth;   // 发光带宽度
uniform float uNoiseScale;  // 噪声频率
uniform vec3 uBaseColor;
uniform vec3 uEdgeColor;

float hash(vec2 p) {
  // 正弦伪随机：输出 [0,1)
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);   // smoothstep 权重的双线性插值
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  // 两个频率叠加：低频定大形状，高频补细节
  float n = valueNoise(vUV * uNoiseScale) * 0.7
          + valueNoise(vUV * uNoiseScale * 3.7) * 0.3;
  if (n <= uThreshold) discard;                        // 已烧穿
  float band = 1.0 - smoothstep(uThreshold, uThreshold + uEdgeWidth, n);
  vec3 color = uBaseColor + uEdgeColor * band * band;  // 越贴边界越亮
  gl_FragColor = vec4(color, 1.0);
}
```

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uThreshold | 淘汰进度，由动画驱动 | 0 → 1 匀速推 0.5～1.5 秒 |
| uEdgeWidth | 发光带宽度（噪声值域单位） | 0.03 ～ 0.15 |
| uNoiseScale | 噪声频率（烧穿孔洞的密度） | 3 ～ 10 |
| uEdgeColor | 边缘发光色 | 燃烧橙 / 魔法蓝 |

**场景与成本**：死亡/传送/护盾破裂。注意 `discard` 会禁用 early-z（被遮挡片元也要完整执行着色器），全屏大面积溶解时帧时间可见——控制溶解物体在屏幕上的占比，或改用 alpha 混合淡出（见常见坑 3）。

## 1.5 玻璃与折射

**效果**：透过玻璃看到后面的场景被扭曲偏移，正对时通透、掠射时泛白反光。

**原理**：真折射要按斯涅尔定律（Snell's law）算折射角、沿折射线查询场景——实时管线做不到。屏幕空间近似：先把**不含玻璃的场景**画进 FBO 纹理（[02-第二阶段/06-帧缓冲与离屏渲染](../02-第二阶段/06-帧缓冲与离屏渲染.md)），玻璃片元把自己的屏幕坐标 UV 沿**视空间法线**的 xy 分量偏移一段，采样这张纹理。法线变化的地方偏移量跟着变，视觉上就是"折射扭曲"。反射用 1.1 的 Schlick 菲涅尔混合。

```glsl
// glass.vert —— 同 1.1 的 rim.vert（世界位置 + 法线）
```

```glsl
// glass.frag
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
uniform sampler2D uSceneTex;   // 场景先画进 FBO（02/06）
uniform vec2 uViewport;        // FBO 像素尺寸
uniform mat4 uView;            // 世界 → 视空间
uniform vec3 uCameraPos;
uniform float uRefractStrength; // 折射扭曲强度（UV 单位）
uniform vec3 uTint;            // 玻璃体吸收色
uniform vec3 uEnvColor;        // 简化环境反射色（进阶换 cubemap：05/06）
void main() {
  vec3 N = normalize(vNormal);
  vec3 Nv = normalize(mat3(uView) * N);   // 视空间法线：xy 才对应屏幕方向
  vec3 V = normalize(uCameraPos - vWorldPos);

  // 折射近似：屏幕 UV 沿视空间法线 xy 偏移
  vec2 screenUV = gl_FragCoord.xy / uViewport;
  vec3 refracted = texture2D(uSceneTex, screenUV + Nv.xy * uRefractStrength).rgb;

  // 菲涅尔：正对透射为主，掠射反射为主（同 1.1 的 Schlick）
  float cosTheta = max(dot(N, V), 0.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 5.0);
  vec3 color = mix(refracted * uTint, uEnvColor, fresnel);
  gl_FragColor = vec4(color, 1.0);
}
```

渲染顺序（三步）：

1. 场景（**不含玻璃**）画进 FBO；
2. FBO 纹理原样上屏（或作为后处理链输入，[05-第五阶段/03-后处理管线](../05-第五阶段/03-后处理管线.md)）；
3. 玻璃最后画（透明队列，排序见 [02-第二阶段/04-渲染状态与测试](../02-第二阶段/04-渲染状态与测试.md) 3.2），片元里采 FBO。

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uRefractStrength | 扭曲强度 | 0.01（平板玻璃）～ 0.08（厚透镜/水） |
| uTint | 透射吸收色 | 淡绿/淡蓝，接近 (1,1,1) 则近乎无色 |
| uEnvColor | 反射色 | 天空平均色 |

**场景与成本**：玻璃窗、冰块、水下镜头、热浪扭曲（法线换成滚动噪声）。成本：一次 FBO 场景渲染 + 每片元 1 次额外采样。穿帮点：偏移采样没有折射正确性——玻璃后物体刚好出屏或被裁剪时，会采到错误位置的内容；色散变体是 R/G/B 三次采样、偏移量按 0.9/1.0/1.1 缩放。

## 1.6 全息与故障艺术（Hologram & Glitch）

**效果**：横向条带随机抖动、RGB 错位、滚动扫描线、边缘泛光——科幻投影/损坏屏幕的观感。

**原理**：三个便宜 trick 的叠加。① 块抖动：把 UV 纵向分条带，每条带用"时间量化的正弦伪随机"决定水平位移——随机函数就是 1.4 的 hash 换成一维版，时间也过 `floor`，抖动是**跳变**而非滑动，才有"信号故障"感；② RGB 分离：R/B 通道各往左右偏移采样一点点；③ 扫描线：`sin(uv.y × 密度 × 2π + t)` 调制整行亮度。

```glsl
// hologram.vert —— 需要位置 + 法线 + UV（骨架同 1.1，多传 vUV）
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;
uniform mat4 uModel, uView, uProjection;
uniform mat3 uNormalMatrix;
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = uNormalMatrix * aNormal;
  vUV = aUV;
  gl_Position = uProjection * uView * world;
}
```

```glsl
// hologram.frag —— 贴在角色/面板上的全息材质
precision highp float;
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform sampler2D uBaseTex;   // 任意底图（角色纹理/UI 图）
uniform float uTime;
uniform vec3 uCameraPos;
uniform vec3 uHoloColor;
uniform float uRowDensity;    // 条带密度
uniform float uGlitchSpeed;   // 故障频率
float hash1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  vec2 uv = vUV;

  // 1) 块抖动：条带 + 时间量化，只抖一部分条带
  float row = floor(uv.y * uRowDensity);
  float tick = floor(uTime * uGlitchSpeed);
  float jitter = hash1(row + tick * 13.7) - 0.5;
  float active = step(0.75, hash1(tick * 311.7 + row * 0.13));
  uv.x += jitter * 0.08 * active;

  // 2) RGB 分离：R/B 反向偏移，G 不动
  float split = 0.004 + 0.003 * sin(uTime * 3.0);
  vec3 base;
  base.r = texture2D(uBaseTex, uv + vec2(split, 0.0)).r;
  base.g = texture2D(uBaseTex, uv).g;
  base.b = texture2D(uBaseTex, uv - vec2(split, 0.0)).b;

  // 3) 扫描线 + 整体闪烁（两个不可公约的频率相乘，避免规律感）
  float scan = 0.8 + 0.2 * sin(uv.y * uRowDensity * 6.2831 + uTime * 10.0);
  float flicker = 0.92 + 0.08 * sin(uTime * 31.0) * sin(uTime * 7.7);

  // 4) 菲涅尔边缘增亮（1.1）
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorldPos);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  vec3 color = base * uHoloColor * scan * flicker + uHoloColor * rim * 0.8;
  gl_FragColor = vec4(color, 0.85);   // 配加法混合（ONE, ONE）更像投影
}
```

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uRowDensity | 条带/扫描线密度 | 24 ～ 96 |
| uGlitchSpeed | 故障跳变频率 | 4 ～ 12（越高越"神经质"） |
| uHoloColor | 全息主色 | 青/蓝紫 |
| split | RGB 分离量 | 0.002 ～ 0.01 |

**场景与成本**：科幻 UI、Boss 登场演出、损坏监视器。成本：每片元 3 次采样 + 若干三角函数，很便宜。注意 hash 内的 `sin(大数)` 必须跑在 highp 下，mediump 移动端会精度崩坏（见常见坑 4）。

## 1.7 顶点动画：摆动与波纹

**效果**：草/旗帜随风摆动、地面点击处荡开涟漪——不动骨骼、不换模型，位移全部写在顶点着色器里。

**原理**：摆动 = 正弦相位沿高度传播，`pow(h, bendPower)` 把位移集中在尖端、根部钉死；相邻草片用**世界位置错开相位**，否则整片草地齐刷刷同摇非常假。波纹 = 圆形行波 `sin(d·freq − t·speed)` 乘一个以波前为中心的窗口衰减。

```glsl
// grass.vert —— 面片草：根部钉住，尖端摆动
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModel, uView, uProjection;
uniform mat3 uNormalMatrix;
uniform float uTime;
uniform float uSwayAmp;    // 摆动幅度（世界单位）
uniform float uSwayFreq;   // 摆动频率
uniform float uBendPower;  // 弯曲随高度的幂次
varying vec2 vUV;
varying vec3 vNormal;
void main() {
  vec3 pos = aPosition;
  float h = aUV.y;                                   // 0 根部，1 尖端
  vec3 anchor = (uModel * vec4(aPosition, 1.0)).xyz; // 用原始位置算相位
  float phase = uTime * uSwayFreq + anchor.x * 0.8 + anchor.z * 1.1;
  float sway = sin(phase) + 0.33 * sin(phase * 2.7 + 1.7);  // 双频叠加去机械感
  float bend = pow(h, uBendPower);
  pos.x += sway * uSwayAmp * bend;
  pos.z += cos(phase * 0.83) * uSwayAmp * 0.6 * bend;
  vec4 world = uModel * vec4(pos, 1.0);
  vUV = aUV;
  vNormal = uNormalMatrix * vec3(0.0, 0.0, 1.0);     // 面片草用固定法线即可
  gl_Position = uProjection * uView * world;
}
```

```glsl
// grass.frag —— 根暗尖亮（伪 AO）+ 半兰伯特
precision mediump float;
varying vec2 vUV;
varying vec3 vNormal;
uniform vec3 uLightDir;
uniform vec3 uColorRoot;
uniform vec3 uColorTip;
void main() {
  vec3 N = normalize(vNormal);
  float ndl = dot(N, normalize(uLightDir)) * 0.5 + 0.5;  // 半兰伯特：背光不死黑
  gl_FragColor = vec4(mix(uColorRoot, uColorTip, vUV.y) * ndl, 1.0);
}
```

旗帜是同一招换轴：`h = 1.0 - aUV.x`（旗杆边钉住），相位再加 `aUV.x * 3.0` 让波沿旗面传播。

```glsl
// ripple.vert —— 平面网格上的圆形行波（点击涟漪/波纹扩散）
attribute vec3 aPosition;   // XZ 平面网格，y = 0
uniform mat4 uModel, uView, uProjection;
uniform vec3 uCenter;       // 波源（世界空间）
uniform float uTime;
uniform float uWaveAmp;
uniform float uWaveFreq;
uniform float uWaveSpeed;
uniform float uWaveRadius;  // 波前窗口宽度
varying float vHeight;
void main() {
  vec3 pos = aPosition;
  float d = distance(pos.xz, uCenter.xz);
  float front = uTime * uWaveSpeed;                        // 波前已走过的距离
  float falloff = clamp(1.0 - abs(d - front) / uWaveRadius, 0.0, 1.0);
  float wave = sin(d * uWaveFreq - uTime * uWaveSpeed);
  pos.y += wave * uWaveAmp * falloff * falloff;            // 波前之外衰减为 0
  vHeight = wave * falloff;
  gl_Position = uProjection * uView * uModel * vec4(pos, 1.0);
}
```

```glsl
// ripple.frag —— 按波高染色：峰亮谷暗
precision mediump float;
varying float vHeight;
uniform vec3 uBaseColor;
uniform vec3 uWaveColor;
void main() {
  float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(uBaseColor, uWaveColor, t), 1.0);
}
```

**草海概览**：单株草两个三角形，十万株靠 instancing——每实例一份 attribute（位置、朝向、缩放、随机相位），一个 `drawArraysInstanced` 画完，顶点着色器里把面片沿相机 right/up 展开成 billboard。这套展开正是 [05-第五阶段/05-粒子系统](../05-第五阶段/05-粒子系统与Instancing实战.md) 4.3 的做法，instancing 机制见该篇 4.2，此处不重复实现。

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uSwayAmp / uSwayFreq | 摆幅/频率 | 世界高的 10%～20% / 1 ～ 3 |
| uBendPower | 根部锁定强度 | 2 ～ 4 |
| uWaveAmp / uWaveFreq / uWaveSpeed | 波幅/频率/速度 | 按场景尺度，freq 常取 2π/波长 |

**场景与成本**：草、旗帜、飘带、水波前奏（1.8）。成本全在顶点着色器的 sin/pow，每顶点几次，可忽略；真正的开销在草海的顶点总量——控制面片数与实例数。

## 1.8 水面简化版

**效果**：起伏的大波浪、近处看进水里的深色、远处反射天光的亮色、一坨会随视角移动的太阳高光。

**原理**：三层结构，各管一段频段。

1. **顶点 Gerstner 波**：普通正弦只把顶点上下挪（横截面是圆管），Gerstner 波额外让顶点沿波向**水平**挪——波峰被挤尖、波谷被拉宽，才像水。深水波的参数关系：波数 `k = 2π/L`（L 波长），波速 `c = √(g/k)`（g 取 9.8）；振幅用陡度（steepness）Q 反解 `A = Q/k`，多个波的 Q 之和不超过 1，否则波峰翻卷自交。
2. **片元双层法线滚动**：细波纹的频率远超顶点网格密度，画不起，就在片元里用两组方向/速度不同的滚动噪声高度场做中央差分重建法线（思路同 [数学专题/07](../数学专题/07-切空间与几何算法.md) 7.4 的高度图重建法线），叠加到大波浪法线上。
3. **菲涅尔混色 + 高光**：1.1 的 Schlick 决定"深水色还是天色"，Blinn 高光给太阳亮斑。

```glsl
// water.vert —— 三个 Gerstner 波叠加，法线解析求出（不差分）
attribute vec3 aPosition;   // XZ 平面网格，细分 64x64 起步
uniform mat4 uModel, uView, uProjection;
uniform float uTime;
uniform vec2 uDir1, uDir2, uDir3;        // 波传播方向（xz 平面）
uniform float uSteep1, uSteep2, uSteep3; // 陡度 Q，三波之和 <= 1
uniform float uLen1, uLen2, uLen3;       // 波长（世界单位）
varying vec3 vWorldPos;
varying vec3 vNormal;

vec3 gerstner(vec2 xz, vec2 dir, float steepness, float wavelength,
              inout vec3 tangent, inout vec3 binormal) {
  float k = 6.2831853 / wavelength;   // k = 2π/L
  float c = sqrt(9.8 / k);            // 深水波速 c = √(g/k)
  vec2 d = normalize(dir);
  float f = k * (dot(d, xz) - c * uTime);
  float a = steepness / k;            // 振幅由陡度反解，保证不翻卷
  // 位置增量：水平拖拽（波峰变尖的关键）+ 竖直起伏
  tangent  += vec3(-d.x * d.x * steepness * sin(f),
                    d.x * steepness * cos(f),
                   -d.x * d.y * steepness * sin(f));
  binormal += vec3(-d.x * d.y * steepness * sin(f),
                    d.y * steepness * cos(f),
                   -d.y * d.y * steepness * sin(f));
  return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
}

void main() {
  vec3 p = aPosition;
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  p += gerstner(p.xz, uDir1, uSteep1, uLen1, tangent, binormal);
  p += gerstner(p.xz, uDir2, uSteep2, uLen2, tangent, binormal);
  p += gerstner(p.xz, uDir3, uSteep3, uLen3, tangent, binormal);
  vec4 world = uModel * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(cross(binormal, tangent));
  gl_Position = uProjection * uView * world;
}
```

```glsl
// water.frag —— 双层滚动法线 + 菲涅尔混色 + 高光
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
uniform vec3 uCameraPos;
uniform vec3 uSunDir;          // 指向太阳
uniform vec3 uDeepColor;
uniform vec3 uSkyColor;
uniform float uTime;
uniform float uFlow1Speed, uFlow2Speed;
uniform float uDetailStrength;
uniform float uFresnelPower;

// hash / valueNoise：与 1.4 相同
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float valueNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// 滚动高度噪声的中央差分法线
vec3 noiseNormal(vec2 xz, vec2 flow, float t) {
  float e = 0.35;
  float h  = valueNoise(xz + flow * t);
  float hx = valueNoise(xz + vec2(e, 0.0) + flow * t);
  float hz = valueNoise(xz + vec2(0.0, e) + flow * t);
  return normalize(vec3(h - hx, 1.2, h - hz));
}
void main() {
  vec3 N = normalize(vNormal);                  // 大波浪法线（顶点级）
  vec3 n1 = noiseNormal(vWorldPos.xz * 0.6,  vec2( 0.03, 0.01), uTime * uFlow1Speed);
  vec3 n2 = noiseNormal(vWorldPos.xz * 0.23, vec2(-0.02, 0.04), uTime * uFlow2Speed);
  vec3 detail = normalize(n1 + n2) - vec3(0.0, 1.0, 0.0);  // 去均值，剩扰动
  N = normalize(N + detail * uDetailStrength);

  vec3 V = normalize(uCameraPos - vWorldPos);
  // 菲涅尔：近处看进水里（深色），远处反光（天色）
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
  vec3 color = mix(uDeepColor, uSkyColor, fresnel);

  // 太阳高光（Blinn，02/05）
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 240.0);
  gl_FragColor = vec4(color + vec3(1.0, 0.95, 0.85) * spec, 1.0);
}
```

| 参数 | 含义 | 推荐范围 |
|---|---|---|
| uLen1/2/3 | 三个波的波长 | 大:中:小 ≈ 24:11:5，错开才有层次 |
| uSteep1/2/3 | 陡度 Q | 三者之和 0.6 ～ 1.0，到 1 就开始翻卷 |
| uFlow1/2Speed | 细波滚动速度 | 0.5 ～ 2，两层方向要不同 |
| uDetailStrength | 细节法线强度 | 0.1 ～ 0.5 |
| uFresnelPower | 水色过渡指数 | 3 ～ 6 |
| uDeepColor / uSkyColor | 深水色 / 反光色 | 深蓝绿 / 天空平均色 |

**场景与成本**：河流湖面、护城河、风格化海面。成本大头是顶点网格密度与三波计算；想再进一步（反射真实场景、焦散、泡沫线）就接 cubemap（[05-第五阶段/06-雾效与天空盒](../05-第五阶段/06-雾效与天空盒.md)）与 planar reflection，超出本节"简化版"边界。

## 1.9 技法组合套路

单个技法是零件，产品里的效果几乎都是拼装的。三个常用配方：

### 组合一：卡通角色的死亡溶解

配方：1.2 卡通着色 + 1.3 背面描边 + 1.4 溶解。接线：死亡动画把 `uThreshold` 在 0.8 秒内从 0 推到 1。**关键坑**：描边壳与本体的 UV 相同，但描边 pass 默认没有 discard——本体烧完了黑壳还飘在原地。修法：把 1.4 的噪声与阈值逻辑同步塞进描边 program 的片元着色器（两个 pass 读同一组 uniform），描边跟着一起烧穿。成本：本体 2 个 drawcall + 一批 discard，中低模角色毫无压力。

### 组合二：传送门 / 能量护盾

配方：1.5 屏幕折射 + 1.1 菲涅尔 + 1.6 扫描线。接线：门面 quad 用 1.5 采样"门后世界"——不必是当前场景，可以另开一台相机朝门后方向渲染一张低分辨率 FBO，廉价地伪造"门后空间"；`uEnvColor` 换成 1.6 的扫描线调制色；边缘用 1.1 的 rim 增亮一圈。成本：多一台相机的场景渲染（可降分辨率）。

### 组合三：风格化开放场景

配方：1.8 水面 + 1.7 instancing 草海 + 1.2 角色。接线要点是**共用环境参数**：水面 `uDir1` 与草的摆动方向一致（同一阵风）、共用同一个 `uTime`，观感才统一；草海用 05/05 的 instancing，每实例随机相位（1.7 的世界位置错相位在实例化下自动成立）。成本：水面顶点数 + 草海一个 drawcall，移动端都扛得住。

组合的通用心法：先想清楚**每个 pass 写不写深度、谁先谁后**（透明后画、描边壳与本体同帧同阈值），再把公共参数（时间、风向、主色）收敛成一组共享 uniform，避免各效果"各吹各的风"。

## 常见坑

1. **`pow` 的底数为负**：GLSL 里 `pow(负数, y)` 未定义，边缘全花。所有 `pow` 前先 `max(x, 0.0)`——本文所有 rim/fresnel 都这么写了，自己扩展时别忘。
2. **法线插值后不归一化**：rim/折射/水面全部依赖 `dot(N, V)`，插值缩短的法线会让边缘光在三角形边界断裂（同 [02/05](../02-第二阶段/05-光照.md) 常见坑 2）。
3. **discard 拖慢整帧**：alpha 测试（discard）禁用 early-z，被遮挡的片元也要跑完整着色器。大面积溶解/镂空优先考虑 alpha 混合，或控制物体屏幕占比。
4. **hash 的 sin 精度**：`sin(dot(p, vec2(127.1, 311.7)) * 43758.5)` 的参数极大，mediump（移动端默认片元精度）下直接崩成条纹。片元着色器开头写 `precision highp float;`。
5. **描边宽度透视失真**：背面扩张是世界空间常宽，远处物体描边细到看不见。修法：宽度按视距缩放 `uOutlineWidth * clamp(dist / refDist, 1.0, 3.0)`。
6. **折射的 uViewport 过期**：窗口 resize / dpr 变化后没更新 `uViewport`，`gl_FragCoord.xy / uViewport` 整体偏斜。每帧或 resize 回调里同步 FBO 实际像素尺寸。
7. **toon 色阶边界爬动**：量化边界的走样，加 dither（随机 ±1/255）缓解，别用 smoothstep 糊——那等于放弃了硬边风格。
8. **动画用帧计数驱动**：用 `frame++` 计数，帧率一变速度全变。统一用秒（`performance.now() / 1000`）传 `uTime`。

## 【本节自测】

1. 写出 Schlick 近似公式；1.1 把指数 5 泛化成 `uRimPower` 后，"物理正确性"丢了什么，为什么边缘光场景不在乎？
2. 背面扩张描边在非一致缩放的模型上会怎样？硬边模型为什么描边会裂、修复思路是什么？
3. Sobel 法为什么对颜色纹理做检测会"误伤"？工业上怎么改？
4. 溶解的 discard 为什么会拖慢整帧？如果改用 alpha 混合实现"渐隐"，与 discard 的观感差异在哪？
5. Gerstner 波相对纯 sin 竖位移多了哪一项位移，带来了什么形状变化？三个波的陡度之和超过 1 会发生什么？

下一篇：[02-文本与2D渲染](02-文本与2D渲染.md)——把"字"画进 3D 世界的四条路线与框架 Label 系统设计。
