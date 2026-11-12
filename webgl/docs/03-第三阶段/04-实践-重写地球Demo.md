# 实践任务：用自研 API 重写地球 Demo

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 一句话定位：第三阶段的毕业任务——把第二阶段"纹理地球（自转 + 云层双纹理 + Blinn-Phong 光照）"用 minmath 与引擎核心完整重写，功能一项不减、demo 主文件压到约 100 行，并沉淀第四阶段的改造钩子。前置：[02-数学库minmath](02-数学库minmath.md)、[03-引擎最小核心](03-引擎最小核心.md) 的代码已经入库且测试全绿。

## 目标与验收标准

先立验收，再动手。第二阶段地球 demo 的功能清单是硬约束，一项都不能少：

- [ ] 地球本体：球体网格 + 白天贴图 + Blinn-Phong 光照（环境光 + 漫反射 + 高光）
- [ ] 自转：绕地轴匀速旋转，从北极上方看逆时针（向东）
- [ ] 地轴倾斜：23.44 度，倾斜方向固定不动
- [ ] 云层：第二张贴图、比地球大一圈、转速不同、半透明混合
- [ ] 交互：鼠标拖拽环绕、滚轮缩放（这两项第二阶段没有，属于本阶段新增的最低体验要求）
- [ ] resize：窗口比例变化时画面不变形

验收度量（对着量，不凭感觉）：

| 类别 | 标准 | 度量方式 |
|---|---|---|
| 功能 | 上面的清单全部保留 | 逐项手动过一遍 |
| 代码量 | demo 主文件（earth.ts + shaders）不超过约 100 行；项目里不存在内联矩阵运算与手写顶点数据 | `wc -l`；全局搜 `Math.tan`、`new Float32Array([...])` 应只命中库文件 |
| 复用 | 地球与云层共享同一份 Geometry；新增第三颗星球（如月球）改动不超过 10 行 | 实际加一颗试一试 |
| 质量 | `npx vitest run` 全绿；`npx tsc --noEmit` 无错 | 命令行 |
| 手感 | 拖拽/缩放有阻尼、后台切回不跳变（deltaTime clamp 生效） | 肉眼 + 慢速拖动观察 |

第二阶段的主文件大概率在 250~350 行（手写矩阵函数约 100 行、球体顶点生成约 60 行、uniform 上传与状态设置约 60 行，全挤在渲染逻辑旁边）。重写后这些全部变成库调用——"代码量减半"是保守说法，实测通常只剩三分之一。

## 重构步骤

### 步骤一：项目骨架归位

把前两册敲出来的代码按分层归位，这是后续所有步骤的地基：

```text
src/
  math/        common.ts  Vec2.ts  Vec3.ts  Vec4.ts  Mat3.ts  Mat4.ts  Quaternion.ts  index.ts
  core/        RenderLoop.ts  PerspectiveCamera.ts  OrbitControls.ts
  geometry/    types.ts  generators.ts
  render/      Geometry.ts  Material.ts  Mesh.ts  renderMesh.ts  texture.ts
  demo/        earth.ts  shaders.ts
tests/         helpers.ts  mat4.test.ts  quaternion.test.ts
```

验收：`npx vitest run` 全绿，`npx tsc --noEmit` 无错。**这一步不过，后面全部免谈**——地基歪了，上面每一步的排查成本都会翻倍。

### 步骤二：地球本体

用 `createSphere` 生成几何、`createTextureFromUrl` 加载白天贴图，着色器沿用第二阶段的 Blinn-Phong（第二阶段 4 节的手写版搬过来，attribute 声明改成 `layout(location = n)` 约定即可）：

```typescript
const sphere = new Geometry(gl, createSphere(2, 64, 32));

const earthMat = new Material(gl, EARTH_VERT, EARTH_FRAG);
earthMat.uniforms.uMap = { type: 'texture', value: dayTexture };
earthMat.uniforms.uLightDir = { type: 'vec3', value: LIGHT_DIR };
earthMat.uniforms.uCameraPos = { type: 'vec3', value: camera.position }; // 高光用

const earth = new Mesh(sphere, earthMat);
```

验收：静态地球正确显示；贴图经线 0 度处无撕缝（有缝说明第二阶段手写顶点时没有接缝列、而现在误改了生成器）；北极对应贴图顶部（南北反了查 2.3 的 UV 约定与 FLIP_Y 是否配套）；两极无黑洞（退化三角形被正确跳过）。

着色器主体（与第二阶段的差别只在 attribute 声明与 uniform 名对齐本框架）：

```glsl
// EARTH_VERT：与 2.4 的顶点着色器完全一致（aPosition/aNormal/aUv + 四个标准矩阵）
```

```glsl
// EARTH_FRAG
#version 300 es
precision highp float;

in vec3 vWorldNormal;
in vec3 vWorldPos;
in vec2 vUv;

uniform sampler2D uMap;
uniform vec3 uLightDir;    // 指向光源（世界系）
uniform vec3 uCameraPos;

out vec4 fragColor;

void main() {
  vec3 albedo = texture(uMap, vUv).rgb;
  vec3 n = normalize(vWorldNormal);
  vec3 l = normalize(uLightDir);
  vec3 v = normalize(uCameraPos - vWorldPos);       // 视线方向
  vec3 h = normalize(l + v);                         // Blinn 半程向量

  float ndl = max(dot(n, l), 0.0);
  float specular = pow(max(dot(n, h), 0.0), 32.0);   // 海面高光

  vec3 color = albedo * (0.08 + 0.92 * ndl) + specular * 0.25;
  fragColor = vec4(color, 1.0);
}
```

### 步骤三：自转与地轴倾斜（四元数组合）

这是本任务唯一的"新数学"，也是 02 册 1.2 留的思考题的答案。

要求：地球绕**倾斜后的地轴**自转，轴本身在世界里固定指向。分解成两步：先绕自身 Y 轴转 spin（自转），再把这个已旋转的地球整体绕世界 Z 轴倾斜 23.44 度。列向量约定下"越右越先作用"，所以：

```text
q = qTilt ⊗ qSpin      （先自转，后倾斜）
```

若写反成 `qSpin ⊗ qTilt`，自转会变成绕**世界 Y 轴**转、倾斜只是开场一次性摆位——地轴看起来始终竖直，只有"姿态整体是歪的"，且随 spin 增长歪的方向还会漂移。两种顺序跑一遍肉眼即可分辨，这个对比值得亲手做一次。

```typescript
const TILT_AXIS = new Vec3(0, 0, 1);
const SPIN_AXIS = new Vec3(0, 1, 0);
const EARTH_TILT = (23.44 * Math.PI) / 180;
const SPIN_SPEED = 0.15;               // 弧度/秒

// 循环外常驻对象：热路径零分配
const tiltQ = new Quaternion().setFromAxisAngle(TILT_AXIS, EARTH_TILT);
const spinQ = new Quaternion();

// 每帧（delta 来自 RenderLoop）：
spin += SPIN_SPEED * delta;
spinQ.setFromAxisAngle(SPIN_AXIS, spin);
earth.rotation.copy(tiltQ).multiply(spinQ);   // qTilt ⊗ qSpin
earth.updateMatrix();
```

两个细节：

- **自转方向**：绕 +Y 正角度 = 从北极上方看逆时针 = 向东转，与地球一致；若贴图是"从太空看"的标准视角而你的地球转反了，把 SPIN_SPEED 取负即可。
- **每帧重建 spinQ** 而不是 `rotation.multiply(deltaQ)` 连乘：避免 1.2 常见坑里的"连乘漂移"，角度是唯一状态源，绝对可靠。

验收：从北极上方俯视，逆时针转；地轴倾角始终指向同一方向；不同刷新率的屏幕上转速一致（帧率无关验证）。

### 步骤四：云层——共享 Geometry、独立 Mesh、透明混合

云层与地球同形状、不同大小、不同转速、不同材质——正是 Mesh 抽象的目标场景。**几何不必重建**：同一个 Geometry 实例给两个 Mesh 用，顶点数据只在显存里存一份，尺寸差异用 Mesh.scale 表达：

```typescript
const cloudMat = new Material(gl, EARTH_VERT, CLOUD_FRAG);
cloudMat.uniforms.uMap = { type: 'texture', value: cloudTexture };

const clouds = new Mesh(sphere, cloudMat);          // 复用同一个 sphere
clouds.scale.set(1.015, 1.015, 1.015);              // 半径大 1.5%
clouds.rotation.copy(tiltQ).multiply(cloudSpinQ);   // 同轴倾斜、1.15 倍速
clouds.updateMatrix();                              // scale 经 compose 进 modelMatrix
```

云层片元着色器：白色输出、按纹理 alpha（或亮度）混合：

```glsl
// CLOUD_FRAG
#version 300 es
precision highp float;

in vec3 vWorldNormal;
in vec3 vWorldPos;
in vec2 vUv;

uniform sampler2D uMap;
uniform vec3 uLightDir;

out vec4 fragColor;

void main() {
  vec4 tex = texture(uMap, vUv);
  // 若云贴图是黑底 JPG（无 alpha 通道），用亮度当透明度：float alpha = tex.r;
  float alpha = tex.a;
  float ndl = max(dot(normalize(vWorldNormal), normalize(uLightDir)), 0.0);
  fragColor = vec4(vec3(1.0) * (0.2 + 0.8 * ndl), alpha);
}
```

透明物体的渲染顺序规则（第二阶段 3 节的结论在此落地）：**先画不透明的地球，再开混合画云层，且云层不写深度**：

```typescript
renderMesh(gl, earth, camera);          // 1) 不透明：正常写深度

gl.enable(gl.BLEND);                    // 2) 透明：开混合、关深度写入
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.depthMask(false);
renderMesh(gl, clouds, camera);
gl.depthMask(true);                     // 3) 恢复，别污染下一帧的状态
gl.disable(gl.BLEND);
```

验收：透过云的缝隙能看见地表；云与地表之间无 z-fighting；缩放相机到近处云层在地表外 1.5% 处"悬浮"。

### 步骤五：相机与交互

```typescript
const camera = new PerspectiveCamera(50, 1, 0.1, 50);
const controls = new OrbitControls(camera, canvas);
controls.minRadius = 2.6;    // 刚好卡在云层外，不会穿进地球
controls.maxRadius = 15;
```

验收：拖拽环绕目标点（阻尼平滑）、滚轮缩放不触发页面滚动、拖到接近正上方/正下方画面不跳变（phi clamp 生效）。

### 步骤六：渲染循环与 resize

把每帧要做的事按固定顺序排好：**输入收敛（controls.update）→ 状态推进（自转积分、矩阵更新）→ 状态设置 → 按序绘制**。

## 完整代码：earth.ts 成品

```typescript
// src/demo/earth.ts
import { Vec3, Quaternion } from '../math';
import { RenderLoop } from '../core/RenderLoop';
import { PerspectiveCamera } from '../core/PerspectiveCamera';
import { OrbitControls } from '../core/OrbitControls';
import { createSphere } from '../geometry/generators';
import { Geometry } from '../render/Geometry';
import { Material } from '../render/Material';
import { Mesh } from '../render/Mesh';
import { renderMesh } from '../render/renderMesh';
import { createTextureFromUrl } from '../render/texture';
import { EARTH_VERT, EARTH_FRAG, CLOUD_FRAG } from './shaders';

const TILT = (23.44 * Math.PI) / 180;
const SPIN_SPEED = 0.15;                    // 弧度/秒
const CLOUD_SPEED = SPIN_SPEED * 1.15;

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const gl = canvas.getContext('webgl2')!;

async function main(): Promise<void> {
  const [dayTex, cloudTex] = await Promise.all([
    createTextureFromUrl(gl, 'assets/earth-day.jpg'),
    createTextureFromUrl(gl, 'assets/earth-clouds.png'),
  ]);

  const camera = new PerspectiveCamera(50, 1, 0.1, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.minRadius = 2.6;
  controls.maxRadius = 15;

  const sphere = new Geometry(gl, createSphere(2, 64, 32)); // 地球与云层共享

  const earthMat = new Material(gl, EARTH_VERT, EARTH_FRAG);
  earthMat.uniforms.uMap = { type: 'texture', value: dayTex };
  earthMat.uniforms.uLightDir = { type: 'vec3', value: new Vec3(3, 1, 2).normalize() };
  earthMat.uniforms.uCameraPos = { type: 'vec3', value: camera.position };
  const earth = new Mesh(sphere, earthMat);

  const cloudMat = new Material(gl, EARTH_VERT, CLOUD_FRAG);
  cloudMat.uniforms.uMap = { type: 'texture', value: cloudTex };
  cloudMat.uniforms.uLightDir = { type: 'vec3', value: new Vec3(3, 1, 2).normalize() };
  const clouds = new Mesh(sphere, cloudMat);
  clouds.scale.set(1.015, 1.015, 1.015);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // resize 闭包住 camera：窗口变化 -> 画布物理像素 + viewport + 投影矩阵三件事一次同步
  function resize(): void {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * devicePixelRatio);
    canvas.height = Math.round(h * devicePixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    camera.setAspect(canvas.width / canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // 热路径常驻对象
  const tiltQ = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), TILT);
  const spinQ = new Quaternion();
  const UP = new Vec3(0, 1, 0);
  let spin = 0;
  let cloudSpin = 0;

  new RenderLoop((delta) => {
    // 1) 输入收敛
    controls.update(delta);

    // 2) 状态推进：qTilt ⊗ qSpin（先自转后倾斜），角度是唯一状态源
    spin += SPIN_SPEED * delta;
    cloudSpin += CLOUD_SPEED * delta;
    earth.rotation.copy(tiltQ).multiply(spinQ.setFromAxisAngle(UP, spin));
    earth.updateMatrix();
    clouds.rotation.copy(tiltQ).multiply(spinQ.setFromAxisAngle(UP, cloudSpin));
    clouds.updateMatrix();

    // 3) 状态设置 + 4) 按序绘制：不透明先、透明后
    gl.clearColor(0.015, 0.02, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderMesh(gl, earth, camera);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    renderMesh(gl, clouds, camera);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }).start();
}

main().catch(console.error);
```

（两处细节：`resize` 定义在 `main` 内部闭包住 camera，窗口变化时画布物理像素、viewport、投影矩阵三件事一次同步；`uCameraPos` 的 value 直接引用 `camera.position` 对象，每帧渲染时读到的自然是最新的——这正是"可变对象 + 引用共享"的正确用法，与"跨帧保留要 clone"并不矛盾：这里恰恰要的就是始终读到最新值。）

## 与第二阶段的对照

| 第二阶段（手写） | 第三阶段（自研 API） |
|---|---|
| `perspective()`、`lookAt()` 函数 60+ 行写在 demo 文件里 | `new PerspectiveCamera(50, 1, 0.1, 50)` |
| 手写球体顶点/法线/UV 生成 60+ 行，地球云层各一份 | `createSphere(2, 64, 32)`，两 Mesh 共享 |
| 自转角手写欧拉角/矩阵乘法，倾斜与自转的组合现场推 | `rotation.copy(tiltQ).multiply(spinQ)` |
| 每帧手动 `uniformMatrix4fv` 十来次，uniform 位置散落全局 | `renderMesh` 代管标准矩阵，材质 uniform 走字典 |
| 相机固定、交互靠改常量重跑 | `OrbitControls`：拖拽 + 缩放 + 阻尼 |
| 动画速度"每帧 +0.01"，换屏幕变快变慢 | `RenderLoop` 的 delta 积分，帧率无关 |

统计方法：`wc -l src/demo/earth.ts src/demo/shaders.ts` 对照第二阶段主文件；再全局搜索确认库外没有散落的矩阵运算。行数减半只是结果，真正的收益是**变化的隔离**——换贴图改一行、调半径改一行、加月球十行，这在第二阶段的单文件里都做不到。

最后做一次"钩子盘点"，这是通往第四阶段的接口（每条都对应第四阶段的一个主题）：

- 渲染状态（depthMask/BLEND）散在 demo 里手工切换 → Renderer 状态托管与状态缓存
- earth 与 clouds 的 Material 各持一个 program，哪怕 shader 几乎相同 → shader 编译缓存与 uber shader
- 透明物体的绘制顺序是手排的 → 渲染队列（不透明先、透明按距离排序）
- resize、camera.aspect、viewport 各自为政 → Renderer 统一接管画布与上下文
- dispose 无人调用，页面级 demo 无感、长驻应用会泄漏显存 → 对象生命周期管理

## 常见坑

1. **四元数乘反（qSpin ⊗ qTilt）**：地轴不再固定，倾斜方向随自转漂移。诊断特征：整体姿态"歪着但轴竖直"或轴向缓慢打转。
2. **云层忘关 depthMask 或顺序画反**：云画在地球前面但被深度测试剔除成镂空，或地球把云"顶开"闪烁。口诀：不透明先画、透明关深度写。
3. **状态忘了恢复**：`depthMask(false)`、`BLEND` 用完不复位，下一帧的地球被透明混合毁掉。帧末必须还原。
4. **共享 Geometry 想当然改半径**：改 `createSphere(2.03, ...)` 新建一份，浪费显存且忘了改另一处；正确做法是 Mesh.scale。
5. **云贴图格式想当然**：PNG 带 alpha 用 `tex.a`，黑底 JPG 得用亮度（`tex.r`）当 alpha——先看一眼资源再写 shader。
6. **uCameraPos 传了 clone**：`uniforms.uCameraPos.value` 若存 `camera.position.clone()`，相机移动后高光方向不再跟随；要存引用本身，让每帧读取的都是最新值（与"跨帧保留要 clone"并不矛盾：这里恰恰要的就是共享最新值）。
7. **自转方向反了**：贴图视角与绕 +Y 正方向不一致。负号解决，不要去改生成器。

## 本节自测（阶段复盘）

1. 复盘整个重构：第二阶段到第三阶段最痛的一次迁移是哪一步？如果一开始就把第二阶段代码写成"库 + demo"两层的结构，哪些痛可以避免、哪些不能？
2. 不看正文，写出倾斜 + 自转的四元数组合式并解释乘法顺序为什么如此；再说说把它换成两个 Mat4 相乘（`T·Rtilt·Rspin`）有什么性能与正确性上的差别。
3. 对照 three.js 文档的 `PerspectiveCamera`、`Mesh`、`BufferGeometry`、`MeshStandardMaterial`，指出它们各自对应你自研框架的哪个类、哪些设计你已能看穿、哪些是你第四阶段才要补的（提示：状态托管、场景图、自动 uniform）。
4. 用本册"钩子盘点"里的任意两条，各写一段"现状—问题—第四阶段的方案"三行描述，作为你进入第四阶段的第一份笔记。
