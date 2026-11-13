# WebGPU 迁移指南：为自研框架留好抽象层（选修前瞻）

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是技术专题第 4 篇，**选修前瞻**：服务第四阶段（框架架构——抽象层怎么切才不会白写）与第六阶段（Three/Babylon 源码里的后端设计）；不要求跟着敲代码，目标是「看懂差异 + 在自研 WebGL 框架里埋好接口」。前置阅读：[03-GPGPU与计算](03-GPGPU与计算.md)（compute 对照的那一半）与 [06-第六阶段/02-Three.js源码研读](../06-第六阶段/02-Three.js源码研读.md) 1.0 节（r163 Backend 重构线索）。

## 4.1 为什么看 WebGPU

### WebGL 的三个历史包袱

对着前五个阶段的痛处讲最直观：

1. **全局状态机**。WebGL 是一台共享槽位机：`useProgram`/`bindTexture`/`enable` 改的都是上下文全局状态，下一次绘制「继承」上一次的残留。第四阶段的 StateCache（[02-框架总体架构](../04-第四阶段/02-框架总体架构.md)）就是给这个设计打的补丁——但补丁再厚也改变不了两件事：驱动必须逐条校验隐式状态，「状态泄漏」类 bug 永远有生存空间。
2. **着色器编译黑盒**。`compileShader` 同步阻塞、真正的链接与优化时机不受控（不少驱动拖到第一次 draw 才报错），`getShaderInfoLog` 的信息质量看运气。第四阶段的编译缓存键（[04-材质与着色器系统](../04-第四阶段/04-材质与着色器系统.md)）管住了「何时编译」，管不住「何时报错、报得多含糊」。
3. **无计算着色器**。[03 篇](03-GPGPU与计算.md)整册在教「用光栅化模拟 compute」：浮点纹理扩展、纹素坐标当编号、MRT 顶输出数量、TF 的拓扑限制——每一条坑都是「没有原生 compute」缴的税。

### WebGPU 带来什么

| 包袱 | WebGPU 的答案 | 一句话 |
|---|---|---|
| 全局状态机 | **对象化管线**（GPURenderPipeline）：顶点布局/着色器/混合/深度/拓扑在创建时全部定死且不可变 | set-then-draw 变成 select-pipeline |
| 隐式资源语义 | **显式资源**：buffer/texture 创建时声明 usage（COPY_SRC、STORAGE、RENDER_ATTACHMENT……），非法用途直接验证报错 | 「忘了 flag」在创建时炸，不是画错时 |
| 按名传 uniform + 全局纹理单元 | **binding 模型**：bind group layout 声明槽位形状，bind group 装配真实资源，`setBindGroup` 整组挂载（4.4） | uniform 与纹理统一成一套机制 |
| 无 compute | **compute shader** 一等公民，`dispatchWorkgroups` 直接跑（4.5） | 03 篇的全部 hack 归零 |
| 逐条提交命令 | **命令编码**：CommandEncoder 把一帧录成 command buffer 一次 submit | CPU 侧开销与绘制解耦 |
| 静默未定义行为 | **严格验证**：`pushErrorScope`/`uncapturederror` 按对象报错 | WebGL 的「黑屏不报错」变成「当场抛诊断」 |

底层关系值得知道：WebGPU 是现代显式 API（Vulkan/Metal/D3D12）的 Web 封面（Chrome 用 Dawn、Firefox 用 wgpu、Safari 自研实现翻译到各自后端），WebGL 则是 90 年代 GL 血统经 ANGLE 翻译的兼容层。**观念上最大的切换：从「修改全局机器」到「创建不可变对象、按序编码命令」**——后面三节分别展开对象、绑定、命令三件事。

## 4.2 WGSL vs GLSL 对照

WGSL（WebGPU Shading Language）不是 GLSL 的小改版：没有版本行、没有精度限定符、入口带标注、阶段间数据走显式 struct。同一个 Blinn-Phong（第二阶段 05 分册的老朋友）双版本并排：

```glsl
// blinn-phong.vert —— GLSL ES 3.00 版
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat4 uNormalMatrix;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
out vec3 vNormal;
out vec3 vWorldPos;
out vec2 vUV;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
  vUV = aUV;
  gl_Position = uViewProj * world;
}
```

```glsl
// blinn-phong.frag —— GLSL ES 3.00 版
#version 300 es
precision mediump float;
in vec3 vNormal;
in vec3 vWorldPos;
in vec2 vUV;
uniform sampler2D uBaseColor;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
out vec4 fragColor;
void main() {
  vec3 n = normalize(vNormal);
  vec3 l = normalize(-uLightDir);
  vec3 v = normalize(uCameraPos - vWorldPos);
  vec3 h = normalize(l + v);
  float diffuse = max(dot(n, l), 0.0);
  float specular = pow(max(dot(n, h), 0.0), 64.0);
  vec3 base = texture(uBaseColor, vUV).rgb;
  vec3 color = base * (vec3(0.08, 0.08, 0.10) + vec3(0.7) * diffuse)
             + vec3(1.0) * specular;
  fragColor = vec4(color, 1.0);
}
```

```wgsl
// blinn-phong.wgsl —— WGSL 版：一个文件、两个入口
struct FrameUniforms {
  viewProj  : mat4x4<f32>,
  cameraPos : vec3<f32>,
  lightDir  : vec3<f32>,          // 光的行进方向（约定与 GLSL 版一致）
}
struct ObjectUniforms {
  model        : mat4x4<f32>,
  normalMatrix : mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> frame  : FrameUniforms;    // 帧级
@group(1) @binding(0) var<uniform> object : ObjectUniforms;   // 物体级
@group(1) @binding(1) var baseColorTex     : texture_2d<f32>; // 材质级
@group(1) @binding(2) var baseColorSampler : sampler;

struct VSOut {
  @builtin(position) position : vec4<f32>,   // 代替 gl_Position
  @location(0) normal   : vec3<f32>,         // 代替 out/in 变量对
  @location(1) worldPos : vec3<f32>,
  @location(2) uv       : vec2<f32>,
}

@vertex
fn vsMain(@location(0) position : vec3<f32>,   // 代替 layout(location) in
          @location(1) normal   : vec3<f32>,
          @location(2) uv       : vec2<f32>) -> VSOut {
  var output : VSOut;
  let world  = object.model * vec4<f32>(position, 1.0);
  output.position = frame.viewProj * world;
  output.normal   = (object.normalMatrix * vec4<f32>(normal, 0.0)).xyz;
  output.worldPos = world.xyz;
  output.uv       = uv;
  return output;
}

@fragment
fn fsMain(input : VSOut) -> @location(0) vec4<f32> {
  let n = normalize(input.normal);
  let l = normalize(-frame.lightDir);
  let v = normalize(frame.cameraPos - input.worldPos);
  let h = normalize(l + v);
  let diffuse  = max(dot(n, l), 0.0);
  let specular = pow(max(dot(n, h), 0.0), 64.0);
  let base     = textureSample(baseColorTex, baseColorSampler, input.uv).rgb;
  let color    = base * (vec3<f32>(0.08, 0.08, 0.10) + vec3<f32>(0.7) * diffuse)
               + vec3<f32>(1.0) * specular;
  return vec4<f32>(color, 1.0);
}
```

### 迁移对照表

| 概念 | GLSL ES 3.00 | WGSL |
|---|---|---|
| 版本与入口 | `#version 300 es` + `void main()`，阶段由挂载位置隐式决定 | 无版本行；`@vertex` / `@fragment` / `@compute` 标注入口，一个文件多入口 |
| 标量类型 | `float` / `int` / `uint` | `f32` / `i32` / `u32`，字面量类型严格（`1.0` 不能赋给 `i32`） |
| 向量/矩阵 | `vec3` / `mat4` | `vec3<f32>`（简写 `vec3f`）/ `mat4x4<f32>`（`mat4f`） |
| 精度 | `precision highp/mediump float` | 无限定符，f32 即 IEEE 754；`f16` 需 `enable f16;` 且要设备特性 |
| 顶点输入 | `layout(location = 0) in vec3 a;` | 入口参数 `@location(0) a: vec3f` |
| 阶段间传递 | `out`/`in` 变量按名配对 | 显式 struct，字段带 `@location(k)` |
| 位置输出 | `gl_Position` | 返回值字段 `@builtin(position)` |
| uniform | 全局 `uniform` 变量，`getUniformLocation` 按名上传 | `@group(g) @binding(b) var<uniform>`，按槽位上传（4.4） |
| 纹理/采样器 | `sampler2D` 二合一 | `texture_2d<f32>` 与 `sampler` 分开声明 |
| 采样 | `texture()` 任意阶段 | `textureSample()` 仅 fragment；vertex/compute 用 `textureSampleLevel()` / `textureLoad()` |
| 片元输出 | 自声明 `out vec4` | 返回值 `-> @location(0) vec4f` |
| 坐标 | NDC z ∈ [-1,1]；`gl_FragCoord` 左下原点 | 裁剪空间 z ∈ [0,1]；片元 `@builtin(position)` 左上原点（4.6） |

### uniform 到 bind group 的映射

GLSL 的每个 uniform 由 CPU 按**名字**定位上传；WGSL 没有「按名上传」——数据写进一块连续内存的 uniform buffer，buffer 装进 bind group，bind group 挂到管线槽位。查找链条从「名字 → location」变成「struct 字段 → 偏移 → binding 槽位」。struct 的对齐规则与 std140 同族但不等同：vec3 对齐 16 一致，而 mat3x3<f32> 的总大小是 44（std140 的 mat3 是 48）——第二阶段 6.3 的偏移表手感可用，细节别照抄，实践同样建议用工具（wgsl 反射或类型生成器）查偏移而不是手算。

## 4.3 管线对象化：set-then-draw 的终结

WebGL 画一个立方体，每次绘制都要「重放」一遍状态（第四阶段 Renderer 的日常）：

```javascript
// —— WebGL：每次绘制的状态重放 ——
gl.useProgram(cubeProgram);                      // 换程序
gl.bindVertexArray(cubeVAO);                     // 换几何
gl.uniformMatrix4fv(loc.uViewProj, false, vp);   // 相机（每程序各传一遍）
gl.uniformMatrix4fv(loc.uModel, false, model);
gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cubeTex);
gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
// 任何状态都可能被「上一个物体」弄脏，所以每帧全部重放
```

WebGPU 把这些状态在**管线创建时**一次固化，且之后不可变：

```javascript
// —— WebGPU：管线创建（一次性，通常在初始化/材质首次出现时）——
const module = device.createShaderModule({ code: blinnPhongWGSL });
const pipeline = device.createRenderPipeline({
  layout: 'auto',                       // 让实现自动推导（4.4 讲何时手写）
  vertex: {
    module, entryPoint: 'vsMain',
    buffers: [{                         // 顶点布局也固化在管线里
      arrayStride: 32,
      attributes: [
        { shaderLocation: 0, offset: 0,  format: 'float32x3' },  // position
        { shaderLocation: 1, offset: 12, format: 'float32x3' },  // normal
        { shaderLocation: 2, offset: 24, format: 'float32x2' },  // uv
      ],
    }],
  },
  fragment: {
    module, entryPoint: 'fsMain',
    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
  },
  primitive: { topology: 'triangle-list', cullMode: 'back', frontFace: 'ccw' },
  depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
});
```

```javascript
// —— WebGPU：每帧只是「按序编码命令，一次提交」——
const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    clearValue: { r: 0.04, g: 0.05, b: 0.08, a: 1 },
    loadOp: 'clear', storeOp: 'store',
  }],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1.0,               // z ∈ [0,1] 后「远」是 1（4.6）
    depthLoadOp: 'clear', depthStoreOp: 'store',
  },
});
pass.setPipeline(pipeline);              // 「选管线」而不是「改状态」
pass.setBindGroup(0, frameBindGroup);    // 相机（帧级）
pass.setBindGroup(1, cubeBindGroup);     // 模型矩阵 + 纹理（物体/材质级）
pass.setVertexBuffer(0, cubeVBO);
pass.setIndexBuffer(cubeIBO, 'uint16');
pass.drawIndexed(indexCount);
pass.end();
device.queue.submit([encoder.finish()]); // 一帧命令一次提交
```

三个本质差异：

1. **着色器编译提前**：着色器在 `createRenderPipeline` 时被真正消费，诊断可从 `getCompilationInfo()` 拿结构化信息——对比 WebGL 的「可能拖到第一次 draw 才炸」；第四阶段的「预编译 + 缓存」策略在 WebGPU 是 API 语义的一部分；
2. **状态不可变**：想换混合方式？不是 `blendFunc`，而是创建（或从缓存取）另一个 pipeline 对象。于是框架层的「材质 → pipeline」天然需要一张缓存表——设计思路与第四阶段的「参数签名 → program」同构；
3. **验证前移**：descriptor 写错当场抛错，不留到运行时黑屏。

## 4.4 资源绑定模型：bind group 三段式

WebGL 的资源挂载有两个互不相干的机制：uniform 按名上传、纹理走全局单元。WebGPU 统一成三段式：**layout 声明形状 → bind group 装配资源 → setBindGroup 挂载**。

```javascript
// 1) bind group layout：声明这组绑定「长什么样」（形状与资源解耦）
const layout = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' } },                              // uniform 块
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },  // 纹理
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },  // 采样器
  ],
});

// 2) bind group：把真实资源装进「插槽模板」
const bindGroup = device.createBindGroup({
  layout,
  entries: [
    { binding: 0, resource: { buffer: materialUBO } },
    { binding: 1, resource: baseColorTexture.createView() },
    { binding: 2, resource: device.createSampler({ magFilter: 'linear' }) },
  ],
});

// 3) 绘制时整组挂载（不再逐个 activeTexture / uniformMatrix4fv）
pass.setBindGroup(1, bindGroup);
```

与 WebGL 的对应关系：

| WebGL | WebGPU | 变化 |
|---|---|---|
| `getUniformLocation` + `uniformMatrix4fv` | `queue.writeBuffer(uniformBuffer, ...)` + bind group | 按名上传 → 按槽上传，字符串查询消失 |
| UBO + `bindBufferBase`（第二阶段 6.3） | `var<uniform>` + bind group entry | 语义几乎一对一，最近的类比 |
| `activeTexture` + `bindTexture` 全局单元 | texture/sampler binding | 全局状态 → 显式成组，换纹理不再「污染」别人 |
| （无对应物） | bind group layout / pipeline layout | 新概念：先声明形状，管线与绑定组据此校验匹配 |

工程上的关键惯例是**分组分层**：group 0 放帧级数据（相机、灯光，每帧换一次）、group 1 放材质级（纹理与材质参数，按材质换）、group 2 放物体级（模型矩阵，按物体换）。`setBindGroup(2, ...)` 的开销远小于重新装配整个资源集——「高频换的放靠后的组号」与第四阶段渲染队列「按材质聚堆减少状态切换」是同一个思想，只是机制从「记账避免重复调用」升级为「结构性分组」。

## 4.5 Compute Shader 初体验：不再需要 hack

03 篇的全部复杂度——浮点纹理扩展、全屏三角形、纹素坐标当编号、MRT 拆输出——都源于「没有原生 compute」。现在看原生版有多平：一个双缓冲数值积分（弹簧振子阵列，半隐式欧拉与 03 篇 3.3 的积分次序一致）：

```wgsl
// integrate.wgsl —— 一次 dispatch 更新全部粒子
struct Params {
  dt        : f32,
  stiffness : f32,
  damping   : f32,
}
struct Particle {
  pos : vec4<f32>,   // xyz 位置；注意必须 vec4：storage 数组元素步长须 16 对齐
  vel : vec4<f32>,   // xyz 速度
}
@group(0) @binding(0) var<uniform>         params : Params;
@group(0) @binding(1) var<storage, read>       src : array<Particle>;
@group(0) @binding(2) var<storage, read_write> dst : array<Particle>;

@compute @workgroup_size(64)               // 每个工作组 64 个「线程」
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let i = gid.x;                           // 全局线程号 = 数据下标，无需纹素换算
  if (i >= arrayLength(&src)) { return; }  // 非整组时尾部线程退出
  var p = src[i];
  let acc = -params.stiffness * p.pos.xyz - params.damping * p.vel.xyz;
  p.vel.xyz = p.vel.xyz + acc * params.dt; // 先速度
  p.pos.xyz = p.pos.xyz + p.vel.xyz * params.dt; // 再位置（半隐式欧拉）
  dst[i] = p;
}
```

```typescript
// 调用侧：创建 → 双 bind group 对调 → 每帧 dispatch
const N = 1 << 17;                                   // 131072 个粒子
const stride = 32;                                   // 两个 vec4，天然 16 字节对齐
const srcBuf = device.createBuffer({ size: N * stride,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
const dstBuf = device.createBuffer({ size: N * stride,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
device.queue.writeBuffer(srcBuf, 0, initParticles(N));   // 初始化直写队列

const pipeline = device.createComputePipeline({
  layout: 'auto',
  compute: { module: device.createShaderModule({ code: integrateWGSL }),
             entryPoint: 'main' },
});
// 与 03 篇的 swap 完全同构：两个 bind group（A→B 与 B→A），轮着用
const bindAB = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: paramBuf } },
    { binding: 1, resource: { buffer: srcBuf } },
    { binding: 2, resource: { buffer: dstBuf } },
  ] });
const bindBA = /* 对调 src/dst，同上 */;

let flip = false;
function step(dt: number) {
  device.queue.writeBuffer(paramBuf, 0, new Float32Array([dt, 4.0, 0.8, 0])); // 末位补 0 对齐 16 字节
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, flip ? bindBA : bindAB);
  pass.dispatchWorkgroups(Math.ceil(N / 64));       // 参数是「组数」，除以 workgroup 大小
  pass.end();
  device.queue.submit([encoder.finish()]);
  flip = !flip;
}
```

（读回也显式化：`copyBufferToBuffer` 到一个 `MAP_READ` buffer，`submit` 后 `mapAsync` 异步取——03 篇 3.6 的 fence + PBO 模式成了原生 API。）

与 3.2 GPGPU 范式的对照：

| 维度 | WebGL GPGPU hack | WebGPU compute |
|---|---|---|
| 状态存储 | 浮点纹理（受扩展与格式支持制约） | storage buffer（原生，任意结构体） |
| 触发 | 全屏三角形 + FBO | `dispatchWorkgroups` |
| 数据定位 | `gl_FragCoord` ↔ 纹素坐标 ↔ 粒子编号 | `global_invocation_id` 即下标 |
| 输出 | 受 MRT 附件数限制 | 随机写任意 `read_write` buffer |
| 邻居交互 | 只能靠纹理采样（boids 的排序绕行，03 篇 3.4） | 随机读 + `atomicAdd`（网格化塌缩成一次 dispatch） |
| 读回 | `readPixels` 同步停顿 | copy + `mapAsync` 显式异步 |
| 精度回退 | 16F hack | f32 默认；f16 是可选加速 |

03 篇每一条「坑」在这一列都有了正解。学 GPGPU 的思维（数据并行、双缓冲、读回成本意识）全部迁移，只有技巧退役。

## 4.6 坐标系与细节差异清单

迁移时最容易「图不对/深度不对/绕序不对」的一张表：

| 差异点 | WebGL | WebGPU | 迁移动作 |
|---|---|---|---|
| 裁剪空间 z | [-1, 1] | **[0, 1]** | 投影矩阵改两格（下）；`depthClearValue: 1.0` |
| 纹理坐标原点 | 左下 | **左上**（texel 与帧缓冲一致） | 采样 v 翻转，或 `copyExternalImageToTexture` 设 `flipY: true` |
| 与 WebGL 资产混用 | — | 帧缓冲行序与 WebGL 相反 | 常见解法：投影矩阵同乘翻 Y（注意下一条连锁） |
| Y 翻转的连锁 | — | 翻 Y 后三角形绕序视觉反转 | `frontFace: 'cw'` 或 cull 反面，二选一 |
| 片元坐标 | `gl_FragCoord` 左下原点 | `@builtin(position)` 左上原点 | 后处理类 shader 逐个检查 |
| 精度 | `highp`/`mediump` 可选档 | 无限定符，f32 严格 | 移动端靠 mediump 省电的优化没了（f16 扩展可补） |
| 点精灵 | `gl.POINTS` + `gl_PointSize` | 核心**不支持** point-list | 改 instanced quad（第五阶段 4.2 的做法原样可用） |
| uniform 对齐 | std140 | WGSL struct 规则（vec3 仍占 16） | 布局代码基本照搬，偏移用工具查 |
| 循环下标 | int 随便混用 | u32/i32 严格区分 | `for (var i = 0u; ...)`，比较两侧同型 |
| 错误行为 | 多数静默未定义 | 验证层当场报错 | 调试期监听 `uncapturederror` |

投影矩阵只需要改两格（对照 [03-第三阶段/02-数学库minmath](../03-第三阶段/02-数学库minmath.md) 的 perspective 实现）：

```typescript
// z ∈ [0,1] 的透视投影：只改 m[10] 与 m[14]（列主序）
// 约束：z_view = -n → z_ndc = 0，z_view = -f → z_ndc = 1，解得 A = f/(n-f)、B = fn/(n-f)
const nf = 1 / (near - far);
const m = m4.perspective(fovy, aspect, near, far);   // 原实现（z ∈ [-1,1]）
m[10] = far * nf;             // 原 (far + near) * nf
m[14] = far * near * nf;      // 原 2 * far * near * nf
// 其余全部不动——这也是数学层与渲染层分层的直接收益（4.7）
```

## 4.7 框架的迁移预留设计：渲染后端抽象

选修篇的落点：**现在写的 WebGL 框架，哪些层到 WebGPU 时代能原样活下来**。把 [02-Three.js源码研读](../06-第六阶段/02-Three.js源码研读.md) 1.1 的分层图拿来对照，答案非常清晰：

| 层 | 迁移时 | 原因 |
|---|---|---|
| 数学层（minmath） | **不动** | 纯计算，只改投影矩阵两格（4.6） |
| 场景图 / 脏标记 / 渲染队列排序 | **不动** | 纯数据结构与策略，无 GL 依赖 |
| 动画 / 拾取（CPU raycast）/ 加载器 | **不动** | 同上 |
| Shader 封装（模板 + 缓存键） | **换语言不换思想** | GLSL 模板变 WGSL 模板；「参数签名 → program」变「材质参数 → pipeline」 |
| StateCache（状态机补丁） | **整个消失** | 被「不可变管线 + 命令编码」结构性替代 |
| 资源层（texture/buffer/FBO 管理） | **重写** | usage 声明、bind group、texture view 都是新模型 |
| 渲染循环（beginPass / draw / submit） | **重写** | 从逐条调用变命令编码 |

做法与 Three r163 的 Backend 重构（见源码研读篇 1.0 节）同构：渲染器面向一个后端接口，具体实现可替换：

```typescript
/** 渲染后端接口：Renderer 只面向它；实现有 WebGLBackend / WebGPUBackend */
interface RenderBackend {
  initialize(canvas: HTMLCanvasElement): Promise<boolean>;
  // 资源物化：WebGL 侧创建 VAO/program/texture；WebGPU 侧创建 buffer/view/pipeline
  createGeometry(desc: GeometryDescriptor): GeometryHandle;
  createShader(desc: ShaderDescriptor): ShaderHandle;
  /** WebGL：diff 状态机并记账；WebGPU：命中 pipeline 缓存或按描述创建新管线 */
  setPipelineState(state: PipelineState): PipelineHandle;
  setBindGroup(slot: number, data: FrameUniforms | MaterialUniforms): void;
  beginPass(target: RenderTarget, clear: ClearState): void;
  endPass(): void;
  draw(geo: GeometryHandle, pipeline: PipelineHandle, instances?: number): void;
  dispose(handle: Handle): void;
}
```

两条实战判断：

1. **接口形状照着 WebGPU 的心智模型切，用 WebGL 实现**。`PipelineState` 描述符式（显式列出拓扑/混合/深度/剔除）在 WebGL 侧就是 StateCache 的输入，在 WebGPU 侧几乎直译成 pipeline descriptor——抽象层不偏向任何一方，两边都是「描述 → 物化 + 缓存」；
2. **别急着写 WebGPUBackend**。价值在「Renderer 已经不直接碰 `gl.`」这个纪律：拾取、动画、队列、材质参数全在抽象层之上，未来迁移是「新增一个后端文件」而不是「重写框架」。Three 用一次大重构（r163 起 `renderers/common/` 公共层 + `WebGLBackend`/`WebGPUBackend`，同一套节点材质系统双后端跑）买到这个能力；Babylon 走的路类似——`WebGPUEngine` 在 2022 年就已落地，其后 Engine 抽象合流（设计取舍见 [03-生态横向一瞥](../06-第六阶段/03-生态横向一瞥.md)）。自研框架从第一天就用接口隔离，成本远低于事后重构。

## 4.8 现状与兼容：2026 年视角

### 浏览器支持

| 浏览器 | WebGPU 默认开启 | 备注 |
|---|---|---|
| Chrome / Edge | 113（2023-04，Windows/macOS/ChromeOS）；Android 121 起 | 经 Dawn 翻译到 D3D12/Metal/Vulkan；Linux 桌面 2024 年补齐 |
| Safari | 18（2024 秋，macOS/iOS） | 此前多年只在 Technology Preview |
| Firefox | 141（2024 年中，Windows）；其余平台 2025 年内陆续 | 经 wgpu |
| 非浏览器 | Node / Deno / Bun 借 Dawn 暴露 `navigator.gpu` | 服务端渲染与管线测试用 |

（版本细节会漂移，动手前以 caniuse 与 webgpu.io 的实现状态页为准；这张表的意义是量级判断：**主流平台已全线可用数年**。）

### WebGL 的长期共存判断

WebGL 不会退场：它是 ANGLE 之上的兼容层，Safari 的 WebGL 同样跑在现代后端上；数以亿计的存量页面决定了「移除 WebGL」对浏览器是净损失。合理的判断是：**WebGL 冻结在当前能力（约等于 ES 3.0），作为稳定兼容层长期存在；WebGPU 承接全部新能力**。对自研框架，这意味着 WebGL 路线依然值得写完（学习价值 + 覆盖面），WebGPU 是增量而非重写。

### 渐进增强策略

```typescript
async function createBackend(canvas: HTMLCanvasElement): Promise<RenderBackend> {
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) {
      const device = await adapter.requestDevice();
      return new WebGPUBackend(canvas, device);    // 能力检测通过且拿到设备
    }
  }
  return new WebGLBackend(canvas);                 // 回退：4.7 的接口让两条路共享上层
}
```

策略分层，避免双后端维护成本失控：常规渲染走 4.7 的后端抽象双实现（接受少量功能差异）；**compute 类重特性（大规模 GPGPU、流体、粒子）只在 WebGPU 路径提供**，WebGL 路径降级为简化版（如 03 篇的纹理 hack 或更少的粒子数）——渐进增强的边界画在「特性」级，不是「像素级等价」。

## 常见坑

1. **投影矩阵没改 z 行**：深度全错（近平面外的物体消失或前后颠倒）。4.6 的两格改写是第一刀，改完用「红球在蓝球前」的用例验证。
2. **修了 Y 翻转但没改绕序**：`flipY` 或投影翻 Y 后三角形绕序视觉反转，开了 cullFace 的模型「内外翻转」像半透明壳。改 `frontFace: 'cw'` 或对调 cull 面。
3. **`textureSample` 用在 vertex/compute**：编译失败——采样带隐式导数只允许 fragment；vertex 用 `textureSampleLevel()`，compute 用 `textureLoad()`。
4. **storage 数组元素不是 16 字节对齐**：`array<vec3<f32>>` 的步长按 16 算，JS 侧按 12 字节写数据必错。结构体成员用 vec4/f32×4 补齐（4.5 的 Particle 就是因此用两个 vec4）。
5. **`layout: 'auto'` 与手写 bindGroupLayout 混用**：auto 推导的布局要用 `pipeline.getBindGroupLayout(0)` 取出来创建 bind group，不能拿自己 createBindGroupLayout 的对象去配——验证层直接拒绝。
6. **buffer 少声明 usage**：要读回的少 `COPY_SRC`、初始化写入的少 `COPY_DST`、要 map 的少 `MAP_READ`——创建时不报错，用的时候当场抛。
7. **`dispatchWorkgroups` 传了总线程数**：参数是工作组数，忘了除以 `@workgroup_size`——要么超量（白跑），要么不足（尾部数据不更新）。
8. **WGSL 类型之间无隐式转换**：字面量 `0` 是抽象整数可自动适配，但具体类型混用直接编译失败——最常见的是 `for (var i = 0; i < arrayLength(&src); i++)`：左边推导为 i32，右边 `arrayLength` 返回 u32，比较报错。循环计数从 `0u` 起、比较两侧同型。
9. **不处理 device lost**：`device.lost.then(...)` 必须挂（操作系统回收、驱动重置都会触发），桌面调试时最容易漏——上线后偶发黑屏的常见来源。

## 本节自测

1. 用一句话分别向「写 WebGL 的自己」解释：为什么状态机、着色器编译、compute 三件事在 WebGPU 里不再是包袱？每条对应 WebGPU 的哪个机制？
2. 把第二阶段 05 分册的 Phong 着色器（无高光 half 向量，只有 ambient+diffuse）手工改写成 WGSL：入口标注、阶段间 struct、`var<uniform>` 三处新语法各出现在哪里？
3. bind group 的三段式（layout → bind group → setBindGroup）分别解决什么问题？「帧级/材质级/物体级」分组与第四阶段渲染队列的「按材质聚堆」在目标上有什么相同点？
4. 推导 z ∈ [0,1] 的透视投影矩阵第三列（两个约束两个未知数），并说明为什么只改两格就够；顺带解释为什么「翻 Y 修纹理」会连锁到 frontFace。
5. 4.7 的表格里「StateCache 整个消失」和「Shader 封装换语言不换思想」分别怎么理解？结合 Three r163 的 Backend 拆分说明：如果自研框架现在就引入 RenderBackend 接口，毕业项目的哪些代码（场景图/动画/拾取/材质参数）可以原样带进 WebGPU 时代？
