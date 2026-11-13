# GLSL 速查卡

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是"附录速查"第二张卡：GLSL 语言侧的高密度速查层——忘了类型、限定符、内置变量、函数签名、公式写法时来这里。全篇只放表与片段，规则详解一律链回 [着色器语言专题](../着色器语言专题/00-导览.md)；JS 侧 API 忘了查 [01-WebGL API 速查](01-WebGL-API速查.md)。

小节导航：

| 小节 | 忘了什么 |
|---|---|
| [2.1 类型与构造](#21-类型与构造) | 类型名、构造器写法、swizzle 读写 |
| [2.2 限定符速查](#22-限定符速查) | 存储/精度/插值三类一页表 |
| [2.3 内置变量](#23-内置变量) | gl_Position / gl_FragCoord / gl_VertexID 全表 |
| [2.4 内置函数速查表](#24-内置函数速查表) | 按字母序 + 按用途分类双视图 |
| [2.5 常用公式片段](#25-常用公式片段) | 旋转/菲涅尔/luma/伽马/hash/noise/billboard 抄走就用 |

## 2.1 类型与构造

规则详解（构造器全集、运算符语义）：[语言核心 1.1~1.3](../着色器语言专题/01-语言核心.md)。

### 类型表

| 类别 | 类型 | 说明 |
|---|---|---|
| 标量 | `float` / `int` / `bool` | 无隐式提升：`1 + 1.0` 非法，必须显式转换 |
| 无符号（3.00） | `uint` | 位运算、回绕计数首选 |
| 浮点向量 | `vec2` / `vec3` / `vec4` | 最高频类型，分量运算式工作 |
| 整型向量 | `ivec2/3/4` | 纹理坐标取整、循环索引 |
| 无符号向量（3.00） | `uvec2/3/4` | |
| 布尔向量 | `bvec2/3/4` | 配合 lessThan 等比较函数 |
| 方阵 | `mat2` / `mat3` / `mat4` | **列主序**存储；mat*vec 按 `M * v` 列组合 |
| 非方阵（3.00） | `matCxR`（mat2x3 等 6 种） | C 列 R 行 |
| 采样器 | `sampler2D` / `samplerCube` | 只能当 uniform / 函数参数传 |
| 采样器（3.00） | `sampler3D` / `sampler2DArray` / `sampler2DShadow` / `isampler*` / `usampler*` | 大全见 [ES3 特性 5.3](../着色器语言专题/05-ES3特性与调试规范.md) |
| 聚合 | 数组、struct | 3.00 数组有构造器与 `length()`；struct 可打包 uniform |

### 构造与运算一行例

```glsl
vec4 a = vec4(1.0);                       // 标量广播：xyzw 全 1
vec4 b = vec4(vec2(0.0, 1.0), 0.0, 1.0);  // 拼接：vec2 + 两个 float
vec3 c = b.xyz * 2.0 - vec3(0.5);         // 分量式算术：数乘、加减
vec3 d = vec3(0.0) - c;                   // 取反即 0 - c
mat4 m = mat4(1.0);                       // 单位矩阵（对角线 1，其余 0）
mat4 n = mat4(a, b, a, b);                // 4 个 vec4 依次为 4 列（列主序）
vec4 e = m * b;                           // 矩阵左乘向量（M*v，v 是列向量）
ivec2 g = ivec2(vec2(1.7, -1.2));         // 显式转换：小数截断 → (1, -1)
float h = float(3) / 2.0;                 // int → float 必须显式 cast
```

### swizzle 读写

```glsl
vec4 v = vec4(1.0, 2.0, 3.0, 4.0);
vec3 p = v.xyz;        // 读：任选 1~4 个分量，可重复（v.xxy、v.rrg 合法）
vec2 q = v.st;         // 同一分量集只能用一套名字：xyzw / rgba / stpq，不可混（v.xg 非法）
v.xy = vec2(9.0, 8.0); // 写：左值不可重复分量（v.xx = ... 非法）
v.zw *= 2.0;           // 读改写一体
```

| 坑 | 说明 |
|---|---|
| 一套名字 | `.xyzw`（位置）、`.rgba`（颜色）、`.stpq`（纹理）语义等价，单个表达式内不许混用 |
| 写入重复分量 | `v.xx = vec2(0.0)` 编译失败 |
| swizzle 免拷贝 | `v.xzy` 这类乱序在多数硬件是免费指令，不必先拷到临时变量再换序 |
| 左值限定 | swizzle 结果可整体赋值/算术，但不能当函数 out 参数传（ES3 接口块同理） |

### 显式转换与运算符

| 转换 | 一行例 | 说明 |
|---|---|---|
| int → float | `float(3) / 2.0` | int 参与浮点运算必须先 cast（`3 / 2.0` 非法） |
| float → int | `int(1.7)` | 向零截断得 1；`int(-1.7)` 得 -1（不是 floor） |
| 向量互转 | `ivec2(vec2(1.7, -1.2))` | 分量各自截断 → (1, -1) |
| float → bool | `bool(0.0)` | 0 为 false，非零为 true |
| 向量 → 标量 | `float(v.x)` 不需要；`v.x` 本来就是标量 | 常见误解 |

| 运算符 | 可用性 | 坑 |
|---|---|---|
| `+ - * /` | 标量/向量/矩阵分量式（mat*mat、mat*vec 是代数乘） | `vec + mat` 非法，只有 `mat * vec` 与 `vec * mat` |
| `++ --` `+=` 等 | 全可用 | 1.00 附录 A 循环里也允许 |
| `%` 取余 | **ES 1.00 保留字，不可用**；ES 3.00 仅 int/uint | 浮点取余一律用 `mod()` |
| 位运算 `& \| ^ ~ << >>` | ES 3.00 仅整数 | ES 1.00 全是保留字 |
| 比较运算符 | 只能比较标量 | 向量比较用 lessThan 等函数（见 2.4 布尔类） |

## 2.2 限定符速查

三类限定符只放表；规则课（默认精度、插值配对纪律）：[语言核心 1.1](../着色器语言专题/01-语言核心.md) 与 [ES3 特性 5.1/5.4](../着色器语言专题/05-ES3特性与调试规范.md)，精度深讲 [精度与编译器行为](../着色器语言专题/04-精度与编译器行为.md)。

### 存储类

| 限定符 | ES 1.00 顶点 | ES 1.00 片元 | ES 3.00 | 一句话 |
|---|---|---|---|---|
| `attribute` | in | 不允许 | 弃用 → `in` | 逐顶点数据，配 vertexAttribPointer |
| `varying` | out | in | 弃用 → `out` / `in` | 阶段间插值传递 |
| `uniform` | 全阶段 | 全阶段 | 保留 | 全顶点/片元共享；同一 draw 内不变 |
| `const` | 全阶段 | 全阶段 | 保留 | 编译期常量，必须初始化 |
| uniform block | —— | —— | `layout(std140) uniform Block {}` | UBO（配 01 卡 1.8 的 bindBufferBase） |
| 片元输出 | —— | `gl_FragColor` | 自声明 `layout(location=0) out vec4 oColor;` | MRT 声明多个 out |

### 精度类

规范下限（实际实现只会更好）：与 [精度与编译器行为 4.1](../着色器语言专题/04-精度与编译器行为.md) 同源。

| 限定符 | float 范围 | float 精度 | int 范围 | 典型实现 |
|---|---|---|---|---|
| `highp` | ±2^62 | 相对 2^-24 | ±2^31（32 位） | fp32 / 32 位整数 |
| `mediump` | ±2^14 | 相对 2^-10 | 约 ±2^15 | 移动端常为真 fp16；桌面常当 fp32 |
| `lowp` | ±2 | 绝对 2^-8 | 约 ±2^8 | 颜色 [0,1] 够用 |

默认精度（漏写即编译失败的高频点）：

| 阶段 | float 默认 | int 默认 | sampler 默认 |
|---|---|---|---|
| 顶点 | `highp` | `highp` | `lowp` |
| 片元 | **没有默认，必须手写** `precision mediump float;` | `mediump` | `lowp` |

三条速记：位置/深度/时间用 highp；颜色/uv 用 mediump；mediump 范围只有 ±2^14，`uTime * 1000` 这类数先在 CPU 侧收敛再传。

### 插值类（ES 3.00）

| 限定符 | 语义 | 用途 |
|---|---|---|
| `smooth`（默认） | 重心插值 | 常规 |
| `flat` | 不插值，取 provoking vertex 的值 | 整数 ID、逐图元选择 |
| `noperspective` | 屏幕空间线性插值 | 特殊后期/等距效果 |

配对纪律：顶点 `out` 与片元 `in` 的插值限定符必须一致，否则链接失败。

限定符书写顺序：精度放在存储类之后，如 `varying highp vec3 vWorldPos;`（ES3 插值再插在中间：`flat out highp int vId;`）。ES 1.00 → 3.00 迁移对照：

| ES 1.00 | ES 3.00 |
|---|---|
| `attribute vec3 aPos;` | `in vec3 aPos;` |
| `varying vec3 vColor;`（顶点写/片元读） | 顶点 `out`、片元 `in`，两边各声明一次 |
| `gl_FragColor = vec4(c, 1.0);` | `layout(location = 0) out vec4 oColor;` 自声明输出 |
| `texture2D(uTex, uv)` | `texture(uTex, uv)` |

## 2.3 内置变量

入门介绍 [GLSL 基础 3.2](../01-第一阶段/04-GLSL基础.md)；MRT 与片元多输出见 [WebGL2 特性 6.5](../02-第二阶段/07-WebGL2特性.md)。

### 顶点着色器

| 变量 | 类型 | 方向 | 说明 |
|---|---|---|---|
| `gl_Position` | vec4 | 输出 | 裁剪空间坐标；不写结果未定义 |
| `gl_PointSize` | float | 输出 | 点精灵像素大小；POINTS 必写（默认 1） |
| `gl_VertexID` | int | 输入（3.00） | 当前顶点序号，可免传 index buffer 属性 |
| `gl_InstanceID` | int | 输入（3.00） | 当前实例序号，instancing 配 divisor=0 的替代方案 |

### 片元着色器

| 变量 | 类型 | 方向 | 说明 |
|---|---|---|---|
| `gl_FragColor` | vec4 | 输出（1.00） | ES 3.00 删除，改自声明 out |
| `gl_FragData[n]` | vec4[] | 输出（1.00） | 需 `EXT_draw_buffers`；3.00 改多个 out + drawBuffers |
| `gl_FragCoord` | vec4 | 输入 | xy = 窗口像素坐标，**原点左下**，中心在 x.5；z 为窗口深度 |
| `gl_FrontFacing` | bool | 输入 | 当前片元是否正面（由绕序决定）；双面材质翻转法线用 |
| `gl_PointCoord` | vec2 | 输入 | 点精灵内 2D 坐标 [0,1]，**原点左上**（与 FragCoord 相反） |
| `gl_FragDepth` | float | 输出（3.00） | 手写深度时输出；写后早深度优化失效 |

三条使用速记：`gl_FragCoord.xy` 是屏幕空间效果（渐变、波纹、FXAA）的坐标来源；`gl_PointCoord` 原点在**左上**，与 FragCoord 的左下相反，做点精灵贴图翻转时最容易搞错；`gl_FrontFacing` 配合 `-N` 实现双面材质（法线一律 `faceforward` 或 `normalize` 后再用）。

## 2.4 内置函数速查表

双视图：先按用途分组（选函数用），再按字母序（对不上名字用）。深挖与逐函数详解：[内置函数速查与深用](../着色器语言专题/03-内置函数速查与深用.md)。标记约定："3.00" = ES 3.00 新增；"扩展" = WebGL1 需 `#extension`；`genType` = float/vec2/vec4 分量式家族。

两个视图怎么用：先在视图 A 按用途缩小候选，再到视图 B 查签名与坑；标"3.00"的行在 ES 1.00 着色器里不可用（标"扩展"的需 `#extension`）。

### 视图 A：按用途分组

| 用途 | 函数清单 | 选用要点 |
|---|---|---|
| 三角与幂 | `radians` `degrees` `sin` `cos` `tan` `asin` `acos` `atan` `pow` `exp` `log` `exp2` `log2` `sqrt` `inversesqrt` | 归一化用 `inversesqrt`（一条指令）；`exp2/log2` 硬件最友好 |
| 区间与插值 | `abs` `sign` `floor` `ceil` `fract` `mod` `min` `max` `clamp` `mix` `step` `smoothstep`（3.00 加 `modf` `trunc` `round`） | 开关用 step，平滑开关用 smoothstep；分界/权重全靠这组 |
| 向量几何 | `length` `distance` `dot` `cross` `normalize` `faceforward` `reflect` `refract` | 光照八件套；法线一律先 normalize |
| 矩阵 | `matrixCompMult`（3.00 加 `transpose` `inverse`） | 逐分量乘是 matrixCompMult；`*` 才是矩阵乘法 |
| 布尔向量比较 | `lessThan` `lessThanEqual` `greaterThan` `greaterThanEqual` `equal` `notEqual` `any` `all` `not` | 向量没有 `>` 运算符，比较必须走这组再 any/all |
| 屏幕导数 | `dFdx` `dFdy` `fwidth`（扩展/3.00 核心） | 抗锯齿线条、flat 法线重建；分支内使用属未定义行为 |
| 整数与打包（3.00） | `bitfieldExtract/Insert/Reverse` `bitCount` `findLSB` `findMSB` `packUnorm4x8` `packSnorm4x8` `packHalf2x16` 及 unpack 系列 `floatBitsToInt` 等 | 顶点压缩、按位 flag、浮点位重解释 |
| 数值检测（3.00） | `isnan` `isinf` | NaN 黑屏排查输出用 |
| 采样（1.00） | `texture2D` `textureCube` 及 `*Proj` 变体；顶点着色器内必须用 `*Lod` 变体 | 顶点里无隐式导数 |
| 采样（3.00） | `texture` 统一入口 + `textureLod` `texelFetch` `textureSize` `textureOffset` `textureProj` `textureGrad` | `texelFetch` 整数坐标取单纹素不过滤 |

### 视图 B：按字母序

| 函数 | 类别 | 一句话 | 坑 |
|---|---|---|---|
| `abs(x)` | 区间 | 分量绝对值 | |
| `acos(x)` / `asin(x)` | 三角 | 反三角 | `\|x\| > 1` 未定义，先 clamp |
| `all(b)` / `any(b)` / `not(b)` | 布尔 | bvec 全真/任一真/取反 | |
| `atan(y[, x])` | 三角 | 单参 arctan / 双参 atan2 方位角 | 双参 `(0,0)` 未定义 |
| `bitCount` / `findLSB` / `findMSB`（3.00） | 整数 | 位 1 计数 / 找最低最高位 | |
| `bitfieldExtract` / `bitfieldInsert` / `bitfieldReverse`（3.00） | 整数 | 位域抽取/插入/反转 | 只作用于 int/uint |
| `ceil(x)` / `floor(x)` | 区间 | 取整，**返回仍是 float** | 要整数索引用 `int(floor(x))` |
| `clamp(x, a, b)` | 区间 | 夹紧 | `a > b` 未定义 |
| `cos(x)` / `sin(x)` / `tan(x)` | 三角 | 三角主力 | tan 接近 ±π/2 爆炸；mediump 下 sin(大数) 精度崩 |
| `cross(a, b)` | 几何 | 叉积，只 vec3 | |
| `degrees(x)` / `radians(x)` | 三角 | 弧度↔角度 | |
| `dFdx` / `dFdy` / `fwidth` | 导数 | 屏幕空间偏导 / `abs(dFdx)+abs(dFdy)` | ES1 需 OES_standard_derivatives；非均匀控制流内未定义 |
| `distance(p0, p1)` | 几何 | `length(p0 - p1)` | |
| `dot(a, b)` | 几何 | 点积 | |
| `equal(v1, v2)` / `notEqual(v1, v2)` | 布尔 | 逐分量等/不等 → bvec | 与 `==` 不同：返回 bvec 不返回 bool |
| `exp(x)` / `exp2(x)` | 三角 | e^x / 2^x | |
| `faceforward(N, I, Nref)` | 几何 | 让 `dot(N_ref, I) < 0` 的 N | 双面光照翻转法线 |
| `floatBitsToInt` / `floatBitsToUint` / `intBitsToFloat` / `uintBitsToFloat`（3.00） | 整数 | 浮点位重解释 | NaN 位形保留 |
| `fract(x)` | 区间 | `x - floor(x)`，恒 [0,1) | 负数也对（不是去掉负号） |
| `greaterThan` / `greaterThanEqual` / `lessThan` / `lessThanEqual` | 布尔 | 逐分量比较 → bvec | |
| `inversesqrt(x)` | 三角 | `1/sqrt(x)` 单指令 | `x <= 0` 未定义 |
| `isinf(x)` / `isnan(x)`（3.00） | 检测 | 分量是否 inf/NaN | |
| `length(v)` | 几何 | 模长 | |
| `log(x)` / `log2(x)` | 三角 | 自然对数 / 以 2 为底 | `x <= 0` 未定义 |
| `matrixCompMult(m1, m2)` | 矩阵 | 矩阵逐分量乘 | `*` 才是线性代数乘法 |
| `max(x, y)` / `min(x, y)` | 区间 | 逐分量取大/小 | |
| `mix(a, b, t)` | 区间 | `a(1-t) + b t` | 第三参用 step/条件可当开关 |
| `mod(x, y)` | 区间 | `x - y*floor(x/y)`，符号随 y | 与 C 的 % 不同；`%` 仅 3.00 整数 |
| `modf(x, out i)`（3.00） | 区间 | 拆整数与小数 | |
| `normalize(v)` | 几何 | 单位化 | 零向量未定义；片元里法线常需再归一 |
| `packUnorm2x16` / `packUnorm4x8` / `packSnorm2x16` / `packSnorm4x8` / `packHalf2x16`（3.00） | 打包 | 浮点压进整数 | 配 unpack 系列 |
| `pow(x, y)` | 三角 | 幂 | `x < 0`、`x=0 且 y<=0` 未定义 |
| `reflect(I, N)` | 几何 | `I - 2*dot(N,I)*N` | N 须单位化 |
| `refract(I, N, eta)` | 几何 | 斯涅尔折射 | 全内反射返回 0 向量 |
| `round(x)` / `roundEven(x)`（3.00） | 区间 | 四舍五入 / 银行家舍入 | |
| `sign(x)` | 区间 | -1 / 0 / 1 | |
| `smoothstep(e0, e1, x)` | 区间 | Hermite 平滑 0→1 | `e0 >= e1` 未定义；边界外夹紧 |
| `sqrt(x)` | 三角 | 平方根 | `x < 0` 未定义 |
| `step(edge, x)` | 区间 | `x < edge ? 0 : 1` | |
| `tan(x)` | 三角 | 见 cos 行 | |
| `texelFetch(sampler, coord, level)`（3.00） | 采样 | 整数坐标取单纹素，无过滤 | 越界未定义 |
| `texture(sampler, uv[, bias])`（3.00） | 采样 | 统一采样入口 | 替代 texture2D/textureCube |
| `texture2D(s, uv)` / `textureCube(s, dir)` | 采样 | ES 1.00 采样 | 顶点着色器内必须用 `*Lod` 变体 |
| `texture2DLod` / `textureCubeLod` / `texture2DProj(Lod)` | 采样 | 显式 LOD 版 | ES 1.00 顶点采样唯一合法形式 |
| `textureGrad` / `textureLod` / `textureOffset` / `textureProj` / `textureSize`（3.00） | 采样 | LOD/梯度/偏移/投影/尺寸家族 | |
| `transpose(m)` / `inverse(m)`（3.00） | 矩阵 | 转置 / 求逆 | ES1 没有逆，法线矩阵 CPU 算好再传 |
| `trunc(x)`（3.00） | 区间 | 截断取整 | |

## 2.5 常用公式片段

每个片段 5~10 行，抄走即用；出处分册已标注。片段间公用约定：向量均世界空间、法线已归一；角度制输入先过 `deg2rad`。

```glsl
const float PI  = 3.141592653589793;  // 全片段共用的常量
const float TAU = 6.283185307179586;  // 2π：波浪、圆周动画常用
```

### 角度转弧度 + 2D 旋转

```glsl
const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;
float deg2rad(float d) { return d * PI / 180.0; }

mat2 rot2D(float a) {                 // 列主序：第一列 (c, s)
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}
// 用：p2 = rot2D(deg2rad(45.0)) * p;
```

出处：[图形学数学基础 4.2](../01-第一阶段/05-图形学数学基础.md)；五种旋转表示互转：[旋转表示与转换 3.2](../数学专题/03-旋转表示与转换.md)。

### 3D 旋转：axis-angle（罗德里格斯公式）

```glsl
mat3 rotAxis(vec3 n, float a) {       // n 任意单位轴，a 弧度；列主序构造
  n = normalize(n);
  float c = cos(a), s = sin(a), t = 1.0 - c;
  return mat3(
    t*n.x*n.x + c,      t*n.x*n.y + s*n.z,  t*n.x*n.z - s*n.y,
    t*n.x*n.y - s*n.z,  t*n.y*n.y + c,      t*n.y*n.z + s*n.x,
    t*n.x*n.z + s*n.y,  t*n.y*n.z - s*n.x,  t*n.z*n.z + c
  );
}
```

出处：[旋转表示与转换 3.2](../数学专题/03-旋转表示与转换.md)（四元数版同节）。

### 菲涅尔（Schlick 近似）

```glsl
// cosTheta = dot(N, V)；F0 = 基础反射率（非金属约 0.04）
float fresnelSchlick(float cosTheta, float f0) {
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
```

出处：边缘光大表（可调指数版）：[GLSL Cookbook 1.1](../技术专题/01-GLSL%20Cookbook.md)；物理推导：[PBR 入门](../05-第五阶段/04-PBR入门.md)。

### 亮度 luma 与饱和度调整

```glsl
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); } // Rec.709 权重

vec3 adjustSaturation(vec3 c, float s) {   // s=0 灰度，1 原样，>1 增饱和
  return mix(vec3(luma(c)), c, s);
}
```

出处：[色彩数学 8.5](../数学专题/08-色彩数学.md)；FXAA 里 luma 的用法：[后处理管线 2.3](../05-第五阶段/03-后处理管线.md)。

### 伽马转换（linear ↔ sRGB）

```glsl
vec3 linearToSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }   // 近似，够多数 demo
vec3 sRGBToLinear(vec3 c) { return pow(c, vec3(2.2)); }

// 精确分段版（sRGB 规范）：
vec3 linearToSRGBExact(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}
```

出处：[色彩数学 8.3](../数学专题/08-色彩数学.md)（Gamma 2.2 vs sRGB 分段的取舍）；工程链路优先用 `SRGB8_ALPHA8` 硬件转换（01 卡 1.4）。

### hash 最小版与 value noise

```glsl
// 经典一维/二维 hash：结果 [0,1)
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// 简易版 fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453)：桌面可用，
// 移动端 mediump 下 sin(大数) 精度崩，优先用上面的乘法 hash

float vnoise(vec2 p) {                // 2D value noise：格点 hash + 平滑插值
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);   // smoothstep 形状的缓动
  return mix(mix(hash12(i),             hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
```

出处：hash 家族与噪声深讲：[内置函数速查与深用 3.8](../着色器语言专题/03-内置函数速查与深用.md)。

### billboard 三行版（面向相机）

```glsl
// 顶点着色器；uCamRight / uCamUp = 相机世界矩阵的右/上轴（每帧 CPU 传入）
vec3 world = uCenter                                   // 粒子/面板中心
           + uCamRight * aPosition.x * uScale.x        // 用相机基向量替代模型旋转
           + uCamUp    * aPosition.y * uScale.y;
gl_Position = uProjection * uView * vec4(world, 1.0);

// 轴对齐变体（绕世界 Y 直立，草/树/血条）：只替换上轴
// vec3 world = uCenter + uCamRight * aPosition.x * uScale.x + vec3(0.0, 1.0, 0.0) * aPosition.y * uScale.y;
```

出处：三种朝向（视角对齐/轴对齐/屏幕对齐）完整版：[文本与 2D 渲染 2.5](../技术专题/02-文本与2D渲染.md)。
