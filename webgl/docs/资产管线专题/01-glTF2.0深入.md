# glTF 2.0 深入：格式、数据与导出

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文站在管线侧解剖 glTF 2.0（GL Transmission Format，Khronos 的 3D 传输格式）：为什么它是 Web 3D 的事实标准、JSON + 二进制双段结构怎么读、mesh/蒙皮/动画/材质数据存在哪、怎么用 Node 手写一个最小生成器，以及 DCC 导出时最常见的四个坑——[四阶段 07 资源管理](../04-第四阶段/07-资源管理.md)把它当加载器的输入，这里把它当管线的输出。

## 1.1 为什么是 glTF

### 1.1.1 定位：3D 界的 JPEG

glTF 的官方口号是"3D 界的 JPEG"（the JPEG of 3D）。JPEG 的本质特征不是"压缩率高"，而是：**运行时零解析、解码即渲染、人人都能打开**。glTF 对 3D 资产做了同样的事：

- **面向 GPU 的数据布局**：顶点、索引、矩阵在文件里就是最终要上传 GPU 的字节布局（对齐、类型、绕序都按 GPU 约定），加载器不需要"重建"几何，只需要搬运；
- **JSON 头 + 二进制体的可分层结构**：元数据（场景图、材质参数）是可读 JSON，大数据是不可读但高效的二进制——既能调试又能高效加载；
- **PBR 材质模型内建**：材质不是各家私有的节点图，而是标准的 metallic-roughness 参数（1.4），换引擎渲染结果可预期；
- **官方扩展机制**：压缩（Draco/meshopt）、KTX2 纹理、灯光、实例化都以扩展（extension）形式挂接，工具链可以逐项协商（2.5 的 extensionsRequired 闸门）。

一句话总结定位：**OBJ/FBX 是"编辑器之间的交换格式"，glTF 是"到运行时的投递格式"**。前者保真地保留制作信息，后者高效地交付渲染信息。这也决定了管线形状：DCC 工程文件永远留着，交付物永远是 glTF（或 GLB）。

### 1.1.2 与 OBJ / FBX / USD 的对比

| 维度 | glTF 2.0 | OBJ | FBX | USD |
|---|---|---|---|---|
| 归属 | Khronos 开放标准 | 波前（Wavefront）开放事实标准 | Autodesk 私有 | Pixar 开源 |
| 二进制 | .gltf（JSON+bin）或 .glb 单文件 | 仅文本（大文件慢） | 二进制或文本 | 二进制（.usdc/.usdz） |
| 场景图 | 有（node 层级 + TRS） | 无（只有网格列表） | 有 | 有（层组合 strongest） |
| 动画 | 有（关键帧轨道，1.3.4） | 无 | 有（且带动画曲线编辑语义） | 有 |
| 蒙皮 / morph | 有（skin / targets） | 无 | 有 | 有 |
| PBR 材质 | 内建 metallic-roughness | 无材质模型（靠 mtl） | 私有 Phong/PBR 变体 | UsdPreviewSurface |
| 压缩 | Draco / meshopt / KTX2 官方扩展 | 无 | 私有压缩 | 有 |
| Web 生态 | Three.js/Babylon/自研加载器原生 | 只当静态网格用 | 需转换（fbx2gltf） | 有限（usdz 主要走 Apple） |

选型结论：

- **Web 交付**：glTF/Glb，没有第二选项；FBX 直接扔给浏览器是反模式（SDK 私有、体积大、解析慢）；
- **与美术协作**：Blender 原生读写 glTF 双向质量都好；Maya/3ds Max 的 FBX 生态更成熟，可以在 DCC 内用 FBX、出包时统一转 glTF；
- **大型影视/多团队协作**：USD 的层（layer）机制是它的独门能力，但那是制作管线的事，Web 运行时最终仍会转出 glTF。

## 1.2 文件结构解剖

### 1.2.1 双段结构：JSON 目录 + 二进制仓库

一个分离式 `.gltf` 资产至少两个文件：`model.gltf`（JSON，全部描述信息）与 `model.bin`（一整块原始字节，全部大数据）。贴图是第三类文件（PNG/WebP/KTX2），JSON 里用相对 URI 引用。三类引用形态的解析规则（data URI / 绝对 URL / 相对路径）在[四阶段 07 的 6.2.2](../04-第四阶段/07-资源管理.md)已展开，这里只看结构：

```jsonc
{
  "asset": { "version": "2.0", "generator": "Blender 4.2" },
  "scene": 0,
  "scenes":  [{ "nodes": [0, 1] }],
  "nodes":   [{ "mesh": 0, "skin": 0, "translation": [0,0,0], "children": [1] }],
  "meshes":  [{ "primitives": [{ "attributes": { "POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2 },
                                  "indices": 3, "material": 0, "mode": 4 }] }],
  "materials": [{ "pbrMetallicRoughness": { "baseColorTexture": { "index": 0 } } }],
  "accessors":  [{ "bufferView": 0, "componentType": 5126, "count": 12345,
                   "type": "VEC3", "max": [1,2,3], "min": [-1,-2,-3] }],
  "bufferViews": [{ "buffer": 0, "byteOffset": 0, "byteLength": 148140, "target": 34962 }],
  "buffers":  [{ "uri": "model.bin", "byteLength": 200000 }],
  "images":   [{ "uri": "basecolor.png" }],
  "textures": [{ "source": 0 }]
}
```

完整的字段骨架在[四阶段 07 的 6.3.1](../04-第四阶段/07-资源管理.md)有一份带注释版本，两边可以对照读。核心心智模型：**JSON 是目录，bin 是仓库；目录里一切以数字索引互相引用**。

### 1.2.2 场景图：scenes 到 nodes 到 mesh

glTF 的场景组织就是一棵节点树，和自研框架的场景图（[四阶段 03 场景图](../04-第四阶段/03-场景图.md)）一一对应：

```text
scenes[scene].nodes ── 根节点索引列表
        │
        ▼
nodes[i] ── 每个 node：TRS 或 matrix、children（子节点索引）、可选引用
        │      mesh    → meshes[i]    挂网格
        │      skin    → skins[i]     蒙皮（节点同时引用 mesh+skin）
        │      camera  → cameras[i]   相机
        ▼
meshes[i].primitives[j] ── 一个 mesh = 若干 primitive（对应一次 draw call）
        │      attributes: { POSITION: accessor 索引, ... }
        │      indices:    accessor 索引
        ▼
materials[k] / accessors[n] / ...
```

两条规范细节在导出/加载两侧都常踩（加载侧的四阶段 6.3.4 已列，管线侧的对应行为是导出器写文件时的选择）：

1. **matrix 与 TRS 同在时 matrix 优先**——导出器遇到非均匀层级会直接写 16 个 float 的列主序矩阵，此时 TRS 字段是"仅供参考"或缺失；
2. **rotation 是四元数 (x, y, z, w)**——注意很多数学库的分量顺序是 (w, x, y, z)，接反的症状是模型姿势完全随机。

### 1.2.3 引用与数据的间接层：accessor / bufferView 为什么存在

从 mesh 的一个属性到真正的字节，中间隔着三层间接。这是 glTF 最容易被问"为什么搞这么复杂"的设计，值得单独拆开：

```text
primitive.attributes.POSITION = 0        ┐
primitive.indices            = 3         ├ 一切数据引用都是 accessor 索引
skins[0].inverseBindMatrices = 4         ┘
          │
          ▼  accessor：怎么读、读多少
accessors[0] = { bufferView: 0, componentType: 5126, count: 12345, type: "VEC3",
                 byteOffset: 0, min: [...], max: [...] }
          │
          ▼  bufferView：从 buffer 的哪里读、读多长
bufferViews[0] = { buffer: 0, byteOffset: 0, byteLength: 148140,
                   byteStride: 32(可选，交错时), target: 34962 }
          │
          ▼  buffer：字节本体在哪
buffers[0] = { uri: "model.bin" }        ┐
buffers[1] = { uri: "data:application/   ├ .bin 文件 / data URI / GLB 的 BIN chunk
               octet-stream;base64,..." } ┘
```

componentType 与 type 的查表（5126=FLOAT、VEC3=3 分量等）加载侧已背过，不重复。**为什么这样设计**，四条理由按重要性排：

1. **内存对齐换来零拷贝**：规范强制 bufferView 4 字节对齐、accessor 对齐到分量大小。对齐满足时，`new Float32Array(buffer, byteOffset, count)` 直接建立**视图**而不是复制数据——整块 bin 只读一次，所有 accessor 都是它的窗口。[四阶段 6.3.3 的 accessorToTypedArray](../04-第四阶段/07-资源管理.md)两分支里的"零拷贝分支"，吃的就是这个设计红利；管线上游（导出器/gltfpack）负责把数据排得满足对齐，加载器才能零拷贝。
2. **GPU 直传**：bufferView 的 `target` 标记 ARRAY_BUFFER（34962）/ELEMENT_ARRAY_BUFFER（34963），意味着这段字节可以整块 `bufferData` 上传、`vertexAttribPointer` 直接指过去，不需要 CPU 重组。量化压缩（02 的 2.2）之所以能全程保持这个性质，靠的也是这套间接层提供"归一化整数属性"的表达。
3. **共享与去重**：多个 accessor 可以指向同一个 bufferView 的不同区间（比如 POSITION 和 NORMAL 交错存一段、min/max 各自描述），多个 bufferView 指向同一个 buffer。1.5 的生成器与 02 的 gltfpack 都会利用"同 buffer 多视图"减少碎片。
4. **描述与负载分离**：JSON 可 diff、可脚本处理（Node 生态随便改），bin 保持不透明的大字节。1.5 手写生成器、2.4 的 Vite 插件都是在 JSON 层做手术、bin 层做搬运。

### 1.2.4 GLB 容器格式：chunk 布局

`.glb` 是官方单文件容器：把 JSON 与 bin（以及可选的贴图）打进一个文件。布局手画如下（数字为字节偏移示例）：

```text
偏移   0        4         8         12
      +--------+---------+---------+----------------------+
      │ magic  │ version │ length  │                      │  文件头 12 字节
      │"glTF"  │    2    │ 整文件长 │                      │  magic = 0x46546C67
      +--------+---------+---------+----------+-----------+
      │ chunkLength      │ chunkType          │           │  chunk 头 8 字节
      +------------------+--------------------+-----------+
      │ JSON 文本（UTF-8）…… 空格 0x20 填充到 4 的倍数     │  JSON chunk
      +------------------+--------------------+-----------+   type = 0x4E4F534A ("JSON")
      │ chunkLength      │ chunkType          │           │  chunk 头 8 字节
      +------------------+--------------------+-----------+
      │ 二进制数据 …… 0x00 填充到 4 的倍数                 │  BIN chunk（可选）
      +---------------------------------------------------+   type = 0x004E4942 ("BIN\0")
```

规则清单（写加载器/打包器都按这个来）：

- 文件头固定 12 字节：magic（小端 uint32 0x46546C67，即 ASCII "glTF"）、version（2）、length（整个文件字节数，含头）；
- 每块 chunk 前有 8 字节头：chunkLength（**含填充**的数据长度）、chunkType；
- JSON chunk 必须第一个，用空格（0x20）填充到 4 字节倍数——JSON 解析器把尾部空格当空白忽略，不影响语义；
- BIN chunk 第二个，用零（0x00）填充到 4 字节倍数；chunkLength 记的是含填充的长度，解析器切片要按它来；
- bin 里 bufferViews 的对齐基点是 BIN chunk 数据区的起点（不是文件头）；
- JSON 里 buffers[0] 没有 uri 字段，就指这个 BIN chunk。

对照实现：[四阶段 6.3 自测第 7 题](../04-第四阶段/07-资源管理.md)要求写 GLB 解析步骤清单，本节的布局图就是答案的一半；另一半（与 .gltf 路径的分叉点在"步骤 2 buffers 加载"——JSON 里的 uri 为空时从 BIN chunk 切）在 02 的 2.5 还会以代码形式出现。

肉眼检查 GLB 不用任何工具——文件头就是四个可读字符。用 Node 十行就能做个"GLB 听诊器"：

```javascript
// glb-inspect.mjs —— node glb-inspect.mjs model.glb：读文件头与两个 chunk 头
import { readFileSync } from "node:fs";

const buf = readFileSync(process.argv[2]);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("不是 GLB：magic 错误");
console.log("version:", dv.getUint32(4, true), "total:", dv.getUint32(8, true), "bytes");

let offset = 12;
while (offset < buf.length) {
  const len = dv.getUint32(offset, true);
  const type = dv.getUint32(offset + 4, true);
  const name = type === 0x4e4f534a ? "JSON" : type === 0x004e4942 ? "BIN " : "未知";
  console.log(`chunk ${name}: length=${len}（含填充），数据区 [${offset + 8}, ${offset + 8 + len}）`);
  if (name === "JSON") {
    console.log("  asset:", JSON.parse(buf.subarray(offset + 8, offset + 8 + len).toString()).asset);
  }
  offset += 8 + len; // chunkLength 含填充，直接跳到下一个 chunk
}
```

排查 GLB 相关问题（对齐错、chunk 长度对不上、JSON 里 uri 残留）时，先跑它确认容器层没坏，再谈内容。

## 1.3 核心数据：mesh、蒙皮与动画

### 1.3.1 mesh primitive 与 attribute 语义

一个 primitive 就是"一次 draw call 要的全部输入"：attributes（顶点流）、indices（可选索引）、material、mode（图元类型，默认 4=TRIANGLES）。attributes 是"语义名 → accessor 索引"的字典，语义名由规范定义：

| 语义 | 类型 | 必需 | 说明 |
|---|---|---|---|
| POSITION | VEC3 FLOAT | 是 | 顶点位置；**accessor 必须带 min/max**（包围盒、剔除、2.2 的量化网格都用它） |
| NORMAL | VEC3 | 否 | 平滑法线；缺失时加载器应计算平面法线 |
| TANGENT | VEC4 | 否 | 切线；w 分量编码副切线手性（左右切空间二选一），法线贴图需要 |
| TEXCOORD_0 / _1 | VEC2 | 否 | 多套 UV；注意 v 轴与常见图片上下相反（四阶段 6.3.4 坑 1） |
| COLOR_0 | VEC4 | 否 | 顶点色，线性乘进 baseColor |
| JOINTS_0 | VEC4 | 蒙皮时必需 | 每顶点最多 4 个关节索引（对应 skin.joints 的下标） |
| WEIGHTS_0 | VEC4 | 蒙皮时必需 | 与 JOINTS_0 配对的权重，每顶点 4 个、和为 1 |

两个实践要点：

- **POSITION 的 min/max 是免费的包围盒**。自研框架的视锥剔除（四阶段 03）初始化包围体时不必读完顶点算 AABB，直接从 JSON 拿；
- **一个 mesh 多个 primitive** 常见于"一个物体多材质"（每材质一组图元）。合并与否由管线决定（02 的 gltfpack -mm/-km），加载器只要循环处理。

### 1.3.2 morph target：targets 与 weights

morph target（形态目标，Blender 叫 shape key）是一组"相对基础网格的位移"：

```jsonc
{
  "meshes": [{
    "primitives": [{
      "attributes": { "POSITION": 0, "NORMAL": 1 },
      "targets": [                       // 每个 target 是一组"位移 accessor"
        { "POSITION": 5, "NORMAL": 6 },  // 语义同名，但存的是 delta（差值）
        { "POSITION": 7, "NORMAL": 8 }
      ]
    }],
    "weights": [0.0, 0.0]                // mesh 级初始权重
  }],
  "nodes": [{ "mesh": 0, "weights": [0.0, 1.0] }]   // node 级覆盖初始权重
}
```

语义三句话：

1. target 里的 POSITION 存的是**位移差**：最终位置 = base + weight × delta（shader 里一个 mad 指令的事）；
2. 权重初始值在 mesh 或 node 上声明，**node 优先**；
3. 动画系统通过 `path: "weights"` 的轨道驱动权重（1.3.4），表情动画 = N 条 weights 标量轨道，output 的每个分量对应一个 target。

### 1.3.3 skin 与 joint：蒙皮数据放哪

蒙皮（skinning）数据分三处存储，凑齐"骨骼、权重、绑定姿势"：

```jsonc
{
  "skins": [{
    "joints": [2, 3, 5],              // 关节 = node 索引列表（骨骼就是普通节点树）
    "skeleton": 2,                     // 可选：骨架根 node（算蒙皮包围盒用）
    "inverseBindMatrices": 4           // accessor：每关节一个 MAT4（绑定姿势逆矩阵）
  }],
  "nodes": [{ "mesh": 0, "skin": 0 }]  // 蒙皮挂在"同时引用 mesh 和 skin 的 node"上
}
```

- **骨骼不是独立类型**：joints 引用的一组普通 node，靠层级关系组成骨架。骨骼节点没有 mesh、只有变换，但**必须挂在场景树里**参与 matrixWorld 更新（四阶段 6.3.4 坑 6：导出器把骨架放树外的加载侧对策）；
- **inverseBindMatrices**：每关节 16 个 float 的 MAT4 accessor，把顶点从网格空间带回"绑定那一刻该关节的空间"，再乘关节当前世界矩阵得到最终位置——完整两步推导与 shader 实现在[四阶段 5.3 骨骼蒙皮](../04-第四阶段/06-动画系统.md)；
- 加上 1.3.1 的 JOINTS_0/WEIGHTS_0（每顶点选 4 根骨骼、给 4 个权重），蒙皮的输入就齐了：**权重在顶点流里，骨骼变换在节点树里，桥梁在 skin 里**。

### 1.3.4 animation：sampler 到 channel 到 target

动画数据的组织是三级："怎么插值"（sampler）与"驱动谁"（channel）分离，同一个 sampler 可复用到多个 channel：

```jsonc
{
  "animations": [{
    "name": "Run",
    "samplers": [{                       // 时间 → 值 的一段表
      "input": 10,                       // 时间轴 accessor：SCALAR FLOAT、单调不减（秒）
      "output": 11,                      // 值 accessor：VEC3/VEC4/SCALAR×N
      "interpolation": "LINEAR"          // LINEAR | STEP | CUBICSPLINE
    }],
    "channels": [{                       // 把 sampler 的输出接到某个节点的某条路径
      "sampler": 0,
      "target": { "node": 3, "path": "rotation" }   // path: translation|rotation|scale|weights
    }]
  }]
}
```

加载侧的对应关系（详细实现见[四阶段 5.1 关键帧插值](../04-第四阶段/06-动画系统.md)）：

- **input/output 就是两条 accessor**，动画数据与顶点数据共用同一套 buffer 体系——2.2 的量化与 meshopt 压缩可以无缝作用到动画轨道上（gltfpack 的 -at/-ar/-as 就是干这个）；
- **rotation 轨道必须四元数插值（slerp）**，LINEAR 对 VEC4 rotation 的定义就是 slerp；直接 lerp 四元数会得到非单位四元数，症状是模型缩放抖动；
- **CUBICSPLINE** 每个关键帧存三元组 [入切线, 值, 出切线]，output 的 count 是 input 的 3 倍；
- **weights 轨道**驱动 morph target：output 是 count × target 数的 SCALAR 序列；
一个稍微完整点的例子——跑步动画同时驱动根节点位移与表情：

```jsonc
{
  "animations": [{
    "name": "Run",
    "samplers": [
      { "input": 10, "output": 11, "interpolation": "LINEAR" },  // 0: 根节点位移（VEC3）
      { "input": 10, "output": 12, "interpolation": "STEP"   },  // 1: 表情权重（复用同一条时间轴）
    ],
    "channels": [
      { "sampler": 0, "target": { "node": 3, "path": "translation" } },
      { "sampler": 1, "target": { "node": 7, "path": "weights" } }   // 7 号节点挂 morph mesh
    ]
  }]
}
```

- 同一 node 的同一条 path 出现在多条 channel 是未定义行为，导出器有责任合并（Blender 导出器会做，自写生成工具要小心）。

## 1.4 材质：metallic-roughness 参数表

### 1.4.1 核心参数

glTF 的材质是单一的 metallic-roughness（金属度-粗糙度）PBR 模型（渲染方程背景见[五阶段 04 PBR 入门](../05-第五阶段/04-PBR入门.md) 3.3）：

| 参数 | 类型 / 默认值 | 作用 |
|---|---|---|
| baseColorFactor | vec4，[1,1,1,1] | 漫反射基色（sRGB 语义），alpha 在 w；乘 baseColorTexture |
| baseColorTexture | 纹理引用 | 基色贴图，sRGB 编码（1.6 坑 4） |
| metallicFactor | float，1.0 | 金属度：1=金属（镜面反射带颜色），0=介电体（镜面恒白） |
| roughnessFactor | float，1.0 | 粗糙度：0=镜面，1=完全粗糙漫反射 |
| metallicRoughnessTexture | 纹理引用 | 两通道打包：**G 通道=粗糙度、B 通道=金属度**，R 通道空闲（常被 ORM 打包复用，见 2.3） |
| normalTexture + normalScale | 纹理 + float 1.0 | 切线空间法线扰动及强度（TANGENT 属性为它服务） |
| occlusionTexture + occlusionStrength | 纹理 + float 1.0 | 环境光遮蔽（AO），强度系数；读 **R 通道** |
| emissiveFactor / emissiveTexture | vec3 / 纹理 | 自发光颜色（sRGB），不参与光照直接叠加输出 |
| alphaMode / alphaCutoff | OPAQUE（默认）/ MASK / BLEND；cutoff 默认 0.5 | MASK 用 cutoff 硬裁剪（可开深度写入），BLEND 是真混合（进透明队列） |
| doubleSided | bool，false | true 时禁背面剔除并在 shader 翻转法线 |

通道映射是最容易想当然的地方：metallicRoughnessTexture 的金属度在 **B**、粗糙度在 **G**——与直觉的 RGB 顺序相反；occlusion 只读 R。这也是"ORM 打包"（Occlusion-Roughness-Metallic 拼一张图）能把三张贴图合成一张的通道依据。

材质表之外还有一张容易忽略的小表：**samplers**（纹理采样状态，与动画的 sampler 同名不同物）。`textures[i].sampler` 指向 `samplers[j]`，描述过滤与包裹：

```jsonc
{
  "samplers": [{
    "magFilter": 9729,             // 放大：LINEAR
    "minFilter": 9987,             // 缩小：LINEAR_MIPMAP_LINEAR（默认值）
    "wrapS": 10497, "wrapT": 10497 // REPEAT（默认）
  }]
}
```

两个管线相关的推论：默认 minFilter 是三线性（带 mip），意味着**贴图没有完整 mip 链会产生采样偏差**——PNG 贴图靠 GPU 生成 mip，KTX2 则在编码期内嵌 mip 链（2.3.3 的卖点之一）；wrap 默认 REPEAT，而 WebGL1 的 REPEAT 只支持 2 的幂尺寸贴图——这是 gltfpack 提供 `-tp`（贴图缩放到 2 的幂）选项的原因，WebGL2 项目可以不管。

### 1.4.2 KHR 材质扩展家族速览

核心材质之外的效果都走 KHR 扩展，声明在材质的 `extensions` 字段 + 顶层 `extensionsUsed`/`extensionsRequired`。只需认脸（加载器不支持时能报对名字），细节按需查规范：

| 扩展 | 用途一句话 |
|---|---|
| KHR_materials_transmission | 透射（玻璃）：透射率与透射贴图 |
| KHR_materials_clearcoat | 清漆层（车漆、漆木）：额外一层高光 |
| KHR_materials_ior | 折射率：控制介电体 F0，配合 transmission |
| KHR_materials_sheen | 织物绒感（天鹅绒）：掠射角彩色高光 |
| KHR_materials_volume | 体积吸收散射（配 transmission 做果冻、玉石）：厚度与衰减系数 |
| KHR_materials_specular | 镜面强度/颜色微调（修补 metallic-roughness 的 F0 控制） |
| KHR_materials_emissive_strength | 自发光倍增（做灯泡、屏幕时超过 1 的强度） |
| KHR_materials_iridescence | 薄膜干涉彩虹（肥皂泡、甲虫壳） |
| KHR_materials_unlit | 直出颜色、不受光照（做 UI、卡通描边底色） |

管线上游的事实：Blender 的原理化 BSDF（Principled BSDF）导出时把 Transmission/Roughness/Coat 等参数映射到这张表（Sheen→sheen，Transmission→transmission，Coat→clearcoat…）；gltfpack 2.4 的扩展支持清单里也有它们。加载器侧，自研框架第一步支持"核心材质 + 全部忽略"即可，扩展按 `extensionsRequired` 闸门拒绝（2.5）。

## 1.5 动手验证：手写最小 glTF 生成器

读懂结构的最好办法是亲手生成一个。下面用 Node 内置模块（零依赖）生成"一个红色三角形 + 材质"的合法 `.gltf`，它可以直接被四阶段的加载器加载（自测第 6 题用它当测试夹具）。

### 1.5.1 完整生成器代码

```javascript
// make-triangle.mjs —— 最小 glTF 2.0 生成器：三角形 + 材质，零依赖
// 运行：node make-triangle.mjs   产出：triangle.gltf
import { writeFileSync } from "node:fs";

// ---------- 1. 顶点数据：三个顶点，CCW 绕序，法线朝 +Z ----------
const positions = new Float32Array([
  0.0,  0.5, 0.0,    // 顶点 0：上
 -0.5, -0.5, 0.0,    // 顶点 1：左下
  0.5, -0.5, 0.0,    // 顶点 2：右下
]);
const normals = new Float32Array([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
]);

// ---------- 2. 打包 buffer：两段数据背靠背，天然 4 字节对齐 ----------
const posBytes = Buffer.from(positions.buffer);  // 36 字节
const norBytes = Buffer.from(normals.buffer);    // 36 字节
const bin = Buffer.concat([posBytes, norBytes]); // 72 字节，对齐满足（36 % 4 == 0）

// ---------- 3. 组装 JSON：按 1.2 的间接层从底向上写 ----------
const gltf = {
  asset: { version: "2.0", generator: "handmade-triangle" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],                       // 单节点引用 mesh，无变换
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 }, // 语义名 -> accessor 索引
      material: 0,
      mode: 4,                                // TRIANGLES
    }],                                       // 无 indices：非索引绘制
  }],
  materials: [{                               // 1.4 参数表的最小子集
    pbrMetallicRoughness: {
      baseColorFactor: [0.8, 0.16, 0.1, 1.0], // 一点点红的基色
      metallicFactor: 0.0,
      roughnessFactor: 0.9,
    },
  }],
  accessors: [
    { // 0: POSITION —— 规范强制带 min/max（免费包围盒，见 1.3.1）
      bufferView: 0, componentType: 5126, count: 3, type: "VEC3",
      min: [-0.5, -0.5, 0.0],
      max: [ 0.5,  0.5, 0.0],
    },
    { // 1: NORMAL
      bufferView: 1, componentType: 5126, count: 3, type: "VEC3",
    },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0,  byteLength: 36, target: 34962 }, // ARRAY_BUFFER
    { buffer: 0, byteOffset: 36, byteLength: 36, target: 34962 },
  ],
  buffers: [{
    byteLength: bin.length,
    // 用 data URI 内嵌，产出单文件、无外部依赖的测试资产
    uri: `data:application/octet-stream;base64,${bin.toString("base64")}`,
  }],
};

writeFileSync("triangle.gltf", JSON.stringify(gltf, null, 2));
console.log(`triangle.gltf 写出完成：JSON + ${bin.length} 字节 buffer`);
```

注意生成器里体现的规范细节：position accessor 带 min/max；bufferView 对齐（byteOffset 0/36 都是 4 的倍数）；componentType 5126（FLOAT）；mode 4；无 indices 走非索引路径（加载器 6.3.2 步骤 6 要兼容这条路径）。

### 1.5.2 读回验证：用四阶段的 accessor 逻辑检查

生成之后读回来，正好复用[四阶段 6.3.3 的 accessor 读取](../04-第四阶段/07-资源管理.md)路径做往返验证（roundtrip）：

```javascript
// read-back.mjs —— 读回 triangle.gltf，重建 POSITION TypedArray 并比对
import { readFileSync } from "node:fs";

const gltf = JSON.parse(readFileSync("triangle.gltf", "utf8"));

// data URI -> ArrayBuffer（对应四阶段 6.2.2 的 decodeDataURI）
const uri = gltf.buffers[0].uri;
const bin = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);

// accessor -> TypedArray：无 stride，零拷贝视图（四阶段 6.3.3 的快速分支）
const view = gltf.bufferViews[0];
const acc = gltf.accessors[0];
const byteOffset = view.byteOffset + (acc.byteOffset ?? 0);
const pos = new Float32Array(buffer, byteOffset, acc.count * 3);

console.log(Array.from(pos));
// 期望输出：[ 0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0 ]
```

读回一致 = 生成器与加载器对同一份规范的理解对齐了。这个"生成 → 读回 → 比对"的循环就是资产管线的最小回归测试，02 的 Vite 插件与 CI 质量门（[工程专题 03](../工程专题/03-测试与质量.md)）都是它的放大版。

### 1.5.3 glTF Validator

Khronos 官方校验器（[glTF-Validator](https://github.com/KhronosGroup/glTF-Validator)）检查规范符合性：对齐、索引越界、缺失的 min/max、非法扩展声明等。三种用法按门槛从低到高：

1. **网页版**：打开 [github.khronos.org/glTF-Validator](https://github.khronos.org/glTF-Validator/)，拖入文件，出报告——排查单个文件最快；
2. **Node 脚本**（npm 包 `gltf-validator` 是库不是命令行，包一层即可进 CI）：

```javascript
// validate.mjs —— npm i gltf-validator；node validate.mjs triangle.gltf
import { readFileSync } from "node:fs";
import validator from "gltf-validator";

const data = new Uint8Array(readFileSync(process.argv[2]));
const report = await validator.validateBytes(data, {
  maxIssues: 20,
  // 有外部 .bin/贴图时校验器按这个函数取字节；data URI 内嵌则用不到
  externalResourceFunction: (uri) =>
    Promise.resolve(new Uint8Array(readFileSync(uri))),
});
console.log(`errors: ${report.issues.numErrors}, warnings: ${report.issues.numWarnings}`);
report.issues.messages.forEach((m) =>
  console.log(` ${m.severity}: ${m.message} (${m.pointer ?? "root"})`));
```

3. **原生二进制**：KhronosGroup/glTF-Validator 的 Release 页提供各平台 `gltf_validator` 可执行文件，适合大规模批处理。

纪律：**导出/压缩产物的每一次变更都过一遍 Validator**（1.6 的坑一半能被它提前抓到）；error 必须清零，warning 逐条确认。

## 1.6 常见坑：导出四坑

以下四个坑全部发生在"从 DCC 导出"这一步，每个按"症状 → 检查点 → 修法"给出。加载侧的坑（byteStride 交错、matrix 优先、索引无符号、FLIP_Y、骨骼进树）在[四阶段 6.3.4](../04-第四阶段/07-资源管理.md)已有清单，两边不重复。

### 1.6.1 坐标系：Y-up 与 Z-up 的转换

glTF 规定右手系、Y 轴向上；Blender 是右手系、Z 轴向上（朝向观察者为 +X 的约定也不同）。

- **症状**：模型导入后"躺平"——原本直立的物体绕 X 轴转了 90 度；或地面朝天、相机看到的永远是侧面；
- **检查点**：打开 `.gltf` 看 scenes 的根节点：Blender 导出器（"+Y Up" 勾选时）会写入一个绕 X 轴 -90 度的四元数，rotation ≈ `[-0.7071, 0, 0, 0.7071]`——看到它说明转换正常做了；再在加载器里打印场景 AABB（用 POSITION 的 min/max），y 范围应当覆盖"直立"的高度；
- **修法**：保持导出器的 "+Y Up" 勾选（默认），让转换发生在导出这一步；**不要**在引擎里再转一次（双重旋转），也**不要**手动给场景挂"修正空物体"再导出（导出器会把两次变换叠加）。相机与灯光本身就是 Y-up 约定的一部分，改场景不如遵守约定。

### 1.6.2 单位：glTF 的米

glTF 的长度单位是米（这影响物理引擎、相机运动速度、以及 2.2 量化精度的手算基准）。

- **症状**：模型比预期大/小 100 倍——相机近平面 0.1、远平面 100，模型实际 200 米高，于是"什么都看不见"（要么整个被裁掉、要么相机在模型内部）；或者相反，模型只有 2 厘米，缩成屏幕上的一个点；
- **检查点**：读 POSITION accessor 的 min/max 算包围盒尺寸：一个人形角色应当在 1~2 米量级、一间屋子在几米量级；再对照相机的 near/far。Blender 默认 1 单位=1 米没问题，多坑在"从 Maya（默认厘米）/CAD（毫米）转手"或"父级带 0.01 缩放未应用"的文件；
- **修法**：在 DCC 侧统一到米（Blender 的单位缩放、Maya 导出前 Freeze/换算）；导出前应用缩放（Blender：Object > Apply > Scale）；管线上游无法控制质量时，加载器可用 accessor min/max 做一次"自动适配兜底"（检测数量级后归一），但这只救展示、不救物理。

### 1.6.3 绕序：正面逆时针（CCW）

glTF 规定三角形的**正面（front face）是顶点逆时针（counter-clockwise）环绕**（从正面看过去），配合默认的背面剔除。

- **症状**：模型"内外翻转"——看到的是内壁（口腔、胸腔），外表面消失；或半透明物体的渲染顺序错乱加剧；甚至有的面片正常有的翻转（拓扑不一致）；
- **检查点**：临时 `gl.disable(gl.CULL_FACE)` 对比：翻转现象消失 = 绕序/剔除问题；再检查数据链上有没有**负缩放（镜像）**节点——镜像变换（变换矩阵行列式为负）会翻转绕序，这是最隐蔽的来源；手写生成器（如 1.5）则直接检查顶点顺序：三角形 (0,1,2) 从 +Z 看是不是逆时针；
- **修法**：相信导出器：Blender 导出器遇到负缩放子树会自动翻转三角形绕序补偿，别手动改；自写转换工具时，对 determinant < 0 的子树统一做绕序翻转（交换每个三角形的后两个索引）；**不要**全局改 `gl.frontFace(gl.CW)` 来"修复"——这会连累场景里所有正常资产，且只在这一个模型上碰巧正确。

### 1.6.4 贴图色彩空间标记

glTF 规范按用途固定了每张贴图的编码：baseColorTexture 与 emissiveTexture 是 **sRGB**；normalTexture、metallicRoughnessTexture、occlusionTexture 一律**线性**（数学背景见[数学专题 08 色彩数学](../数学专题/08-色彩数学.md)）。

- **症状**：整套 PBR 发灰发暗（或过亮发粉）、金属高光"糊"；或法线贴图效果像被 gamma 提亮过、粗糙度整体偏移——是"所有贴图统一按 sRGB 处理（或统一不处理）"的典型症状；
- **检查点**：逐张贴图核对加载器上的色彩空间设置是否与用途匹配（按上面的规范清单）；用"纯灰阶 baseColor"做对照实验：sRGB 处理正确时中间灰视觉一致，错误时出现可感知的明暗偏移；
- **修法**：WebGL2 下颜色贴图上传用 `SRGB8_ALPHA8` 内部格式，让硬件在采样时解码（四阶段材质映射处接线）；数据贴图保持 RGBA8 直传、shader 里不做 2.2 换算；DCC 侧确认贴图文件本身的"颜色/非颜色数据（Color / Non-Color）"标记正确——Blender 的 Non-Color 标记会被导出流程感知，Basis/KTX2 编码时也要用线性模式（2.3 的 toktx --linear/--normal_map 就是管这事的）。

四坑速查（详细症状与修法见上文各小节）：

| 坑 | 一句话记忆 |
|---|---|
| 坐标系 | +Y Up 让导出器转，引擎里不再转 |
| 单位 | glTF 是米；导出前应用缩放 |
| 绕序 | 正面 CCW；镜像变换要补绕序翻转 |
| 色彩空间 | 颜色贴图 sRGB、数据贴图线性，按用途逐张设 |

## 【本节自测】

1. 一句话向美术同学解释：为什么交付用 glTF 而协作内部可以继续用 FBX？
2. GLB 的 JSON chunk 与 BIN chunk 各用什么字节填充对齐？chunkLength 含不含填充字节？buffers[0] 在 GLB 里靠什么指认 BIN chunk？
3. 为什么 accessor 不直接存"到 buffer 的偏移"？三层间接（accessor/bufferView/buffer）至少说出三条设计收益，并指出哪一条支撑了四阶段 6.3.3 的零拷贝分支。
4. morph target 的 target.POSITION 存的是什么语义的数据？初始权重声明在哪、动画怎么驱动它（哪个 path）？
5. 蒙皮的三个组成部分（权重、骨骼、绑定逆矩阵）分别存放在文件的哪些位置？
6. 手算：一个 12 顶点、带 POSITION(FLOAT VEC3)/NORMAL(FLOAT VEC3)/TEXCOORD_0(FLOAT VEC2)、无索引的 primitive，三个紧密打包的 bufferView 的 byteOffset/byteLength 各是多少？哪个 accessor 必须带 min/max？
7. 排查题：美术交付的角色在场景里躺平且只有原来 1% 大小。列出你的检查顺序（至少三个检查点），并说出每步的判定依据。
8. 设计题：给 1.5 的生成器加 GLB 输出。写出步骤清单（不写代码）：文件头怎么算、JSON 与 BIN chunk 怎么填充、buffers[0] 的 uri 怎么改。

下一篇 [02-压缩与工具链](02-压缩与工具链.md)：文件格式懂了，让它小到能上线——体积账、Draco/meshopt/KTX2、gltfpack 与构建期自动化。
