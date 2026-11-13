# WebGL API 速查

> [返回：WebGL 与 3D 框架学习大纲](../WebGL与3D框架学习大纲.md)
> 本文是"附录速查"第一张卡：WebGL JS 侧 API 的高密度速查层——忘了参数顺序、常量名、合法组合时来这里。全篇只有表格与最小片段，详解链回对应分册。速查层用法见 [00-导览](00-导览.md)。

小节导航：

| 小节 | 忘了什么 |
|---|---|
| [1.1 上下文与视口](#11-上下文与视口) | getContext 属性、DPR 三行公式 |
| [1.2 资源创建全家桶](#12-资源创建全家桶) | 每类资源的 create→bind→data→delete |
| [1.3 缓冲与属性](#13-缓冲与属性) | usageHint 九格、vertexAttribPointer 六参数、attribDivisor |
| [1.4 纹理 API](#14-纹理-api) | texImage2D 合法组合、texStorage2D 差异、WRAP/FILTER 全表 |
| [1.5 状态与测试](#15-状态与测试) | 能力位、blendFunc 三例、深度/模板函数 |
| [1.6 绘制与同步](#16-绘制与同步) | draw 家族、flush vs finish、fenceSync |
| [1.7 uniform 上传表](#17-uniform-上传表) | uniform1f~Matrix 对应关系、null 容错 |
| [1.8 WebGL2 新 API 增量表](#18-webgl2-新-api-增量表) | VAO/UBO/TF/MRT/sampler/getBufferSubData |

## 1.1 上下文与视口

上下文创建与初始化流程详解：[第一个 WebGL 程序 2.1](../01-第一阶段/03-第一个WebGL程序.md)；DPR 策略详解：[移动端与兼容性 2.3](../工程专题/02-移动端与兼容性.md)。

### getContext 与常用查询

| 事项 | API | 说明 |
|---|---|---|
| 获取上下文 | `canvas.getContext('webgl2', attrs)`，回退 `'webgl'` | 返回 `null` 表示创建失败，必须判空 |
| 读属性 | `gl.getContextAttributes()` | 返回实际生效的属性快照（不等于请求值） |
| 版本探测 | `gl.getParameter(gl.VERSION)` / `gl.SHADING_LANGUAGE_VERSION` | 如 `"WebGL 2.0 (OpenGL ES 3.0 ...)"` |
| 常用上限 | `MAX_TEXTURE_SIZE` / `MAX_VERTEX_ATTRIBS`(≥16) / `MAX_VERTEX_UNIFORM_VECTORS` / `MAX_TEXTURE_IMAGE_UNITS` / `MAX_DRAW_BUFFERS`(2) | 初始化时打印一次备用 |
| 扩展 | `gl.getSupportedExtensions()` / `gl.getExtension('OES_vertex_array_object')` | 后者返回扩展对象（扩展 API 挂在它上面），`null` 即不支持 |

### getContextAttributes 全表

| 参数 | 默认 | 作用 | 典型改法 |
|---|---|---|---|
| `alpha` | `true` | 绘冲带 alpha 通道，参与页面合成 | 画不透明 3D 设 `false`，避免与 CSS 背景错误混合 |
| `antialias` | `true` | 默认绘冲多重采样（MSAA） | 自己做后处理 AA 时可关掉提速 |
| `depth` | `true` | 分配深度缓冲 | 纯 2D / 后处理 pass 可关 |
| `stencil` | `false` | 分配模板缓冲 | 用模板时才开（描边、镜面） |
| `premultipliedAlpha` | `true` | 页面合成假定颜色已乘 alpha | 与 DOM 合成、导出截图时注意一致性 |
| `preserveDrawingBuffer` | `false` | 每帧合成后是否保留绘冲内容 | `toDataURL` 截图要么开它，要么在 rAF 回调内同步截 |
| `powerPreference` | `'default'` | GPU 选择提示：`'high-performance'` / `'low-power'` / `'default'` | 双显卡设备提示独显；只是提示不保证 |
| `failIfMajorPerformanceCaveat` | `false` | 软渲染回退时直接创建失败 | 一般保持默认 |
| `desynchronized` | `false` | 低延迟合成（实验性） | 兼容性差，慎用 |

### canvas 尺寸与 DPR：三行公式

```javascript
const dpr = Math.min(window.devicePixelRatio || 1, 2);        // 0. 设备像素比，通常夹上限省电
canvas.width  = Math.round(canvas.clientWidth  * dpr);        // 1. 绘冲尺寸（物理像素）
canvas.height = Math.round(canvas.clientHeight * dpr);        //    CSS 尺寸只管显示大小
gl.viewport(0, 0, canvas.width, canvas.height);               // 2. 视口盖满整个绘冲
```

| 要点 | 说明 |
|---|---|
| 三套尺寸别混 | `clientWidth`（CSS 布局）、`canvas.width`（绘冲物理像素）、`gl.drawingBufferWidth`（实际分配，可能被上限截断） |
| 改 width/height 的副作用 | 立即清空绘冲；viewport **不会自动重置**，必须手动再调 |
| scissor 联动 | 开着 `SCISSOR_TEST` 时，resize 后 scissor 矩形也要跟着改，否则 clear 只清一块 |

### 上下文丢失三事件

| 事件 / API | 说明 |
|---|---|
| `canvas.addEventListener('webglcontextlost', e => e.preventDefault())` | 丢失时必须 preventDefault，否则浏览器认为放弃恢复 |
| `webglcontextrestored` | 之后触发；**所有 GPU 资源作废**，必须整体重建 |
| `gl.isContextLost()` | 查询当前是否已丢失（丢失后所有 GL 调用变 no-op） |
| `WEBGL_lose_context` 扩展 | 手动触发丢失/恢复，测恢复逻辑（测试按钮见 [03 卡 3.7](03-常用代码片段.md)） |

## 1.2 资源创建全家桶

生命周期统一是"create → bind → 填数据/配置 → delete"四步；VAO 详解 [WebGL2 特性 6.1](../02-第二阶段/07-WebGL2特性.md)，FBO 详解 [帧缓冲与离屏渲染](../02-第二阶段/06-帧缓冲与离屏渲染.md)。

| 资源 | create | bind（目标） | 填数据/配置 | delete |
|---|---|---|---|---|
| 顶点缓冲 VBO | `createBuffer()` | `bindBuffer(ARRAY_BUFFER, b)` | `bufferData(ARRAY_BUFFER, Float32Array, usage)` | `deleteBuffer(b)` |
| 索引缓冲 IBO | `createBuffer()` | `bindBuffer(ELEMENT_ARRAY_BUFFER, i)` | `bufferData(ELEMENT_ARRAY_BUFFER, Uint16Array, usage)` | `deleteBuffer(i)` |
| 纹理 | `createTexture()` | `bindTexture(TEXTURE_2D / TEXTURE_CUBE_MAP, t)` | `texImage2D`（或 `texStorage2D`+`texSubImage2D`）+ `texParameteri` | `deleteTexture(t)` |
| 渲染缓冲 | `createRenderbuffer()` | `bindRenderbuffer(RENDERBUFFER, r)` | `renderbufferStorage(DEPTH_COMPONENT16, w, h)` | `deleteRenderbuffer(r)` |
| 帧缓冲 | `createFramebuffer()` | `bindFramebuffer(FRAMEBUFFER, f)` | `framebufferTexture2D` / `framebufferRenderbuffer` + `checkFramebufferStatus` 完整性检查 | `deleteFramebuffer(f)` |
| 着色器 | `createShader(VERTEX_SHADER / FRAGMENT_SHADER)` | 无绑定概念 | `shaderSource` + `compileShader` | `deleteShader(s)`（链接成功后立即删） |
| 程序 | `createProgram()` | `useProgram(p)` 即"启用" | `attachShader` × 2 + `linkProgram` + `getProgramParameter(LINK_STATUS)` | `deleteProgram(p)` |
| VAO（WebGL2） | `createVertexArray()` | `bindVertexArray(v)` | 内部记录 attrib 指针与 enable 状态 | `deleteVertexArray(v)` |
| UBO（WebGL2） | `createBuffer()` | `bindBuffer(UNIFORM_BUFFER, b)` | `bufferData(UNIFORM_BUFFER, data, usage)` + `bindBufferBase(UNIFORM_BUFFER, slot, b)` | `deleteBuffer(b)` |

| 记忆点 | 说明 |
|---|---|
| 解绑 | bind 目标传 `null` 即解绑；VAO 解绑 `bindVertexArray(null)` |
| VAO 记住什么 | 各 attribute 的：启用状态、pointer（指向哪个 buffer + 格式）、divisor；**连 ELEMENT_ARRAY_BUFFER 绑定也记** |
| 绑定点约束 | 同一个 buffer 可换绑不同目标；但 IBO 的 `ELEMENT_ARRAY_BUFFER` 绑定在 WebGL2 里是 VAO 状态的一部分，解绑 VAO 时会连带还原 |
| delete 的时机 | delete 后句柄作废；还附着在 FBO 上的纹理被 delete，附着点自动断开 |
| WebGL1 等价扩展 | VAO → `OES_vertex_array_object`（`createVertexArrayOES` 等）；instancing → `ANGLE_instanced_arrays`；深度纹理 → `WEBGL_depth_texture` |

buffer 绑定目标全表（同一个 buffer 对象可换目标复用）：

| 绑定目标 | 版本 | 用途 |
|---|---|---|
| `ARRAY_BUFFER` | 1 | 顶点数据（VBO） |
| `ELEMENT_ARRAY_BUFFER` | 1 | 索引（IBO） |
| `UNIFORM_BUFFER` | 2 | UBO（bindBufferBase 配槽位） |
| `TRANSFORM_FEEDBACK_BUFFER` | 2 | TF 捕获输出 |
| `COPY_READ_BUFFER` / `COPY_WRITE_BUFFER` | 2 | copyBufferSubData 的中转，避免打断已有绑定 |
| `PIXEL_PACK_BUFFER` / `PIXEL_UNPACK_BUFFER` | 2 | readPixels / texImage 的暂存 |

## 1.3 缓冲与属性

### usageHint 九格表：`bufferData(target, data, usage)`

usage = 更新频率 × 使用方向，两维各选一格拼成常量名：

| 频率 \ 方向 | DRAW（应用写入，绘制读） | READ（应用读回） | COPY（GL 内部复制） |
|---|---|---|---|
| STATIC（写一次，用很多次） | `STATIC_DRAW`：静态几何首选 | `STATIC_READ` | `STATIC_COPY` |
| STREAM（写一次，用几次就丢） | `STREAM_DRAW`：每帧整块换新数据 | `STREAM_READ` | `STREAM_COPY` |
| DYNAMIC（反复写，反复用） | `DYNAMIC_DRAW`：CPU 每帧更新 | `DYNAMIC_READ` | `DYNAMIC_COPY` |

| 要点 | 说明 |
|---|---|
| 只是提示 | usage 不改变功能，只影响驱动把数据放哪块显存；选错不报错，只影响性能 |
| 局部更新 | `bufferSubData(target, byteOffset, srcData)` 改其中一段，不重新分配 |
| WebGL2 读回 | `getBufferSubData(target, srcByteOffset, dstBuffer)`（见 1.8） |

缓冲常用操作一览：

| API | 作用 |
|---|---|
| `bufferData(target, dataOrSize, usage)` | 整块分配 + 上传（传 size 数字则只分配） |
| `bufferSubData(target, offset, srcData)` | 局部更新，尺寸不能超已分配量 |
| `getBufferParameter(target, gl.BUFFER_SIZE)` | 查已分配字节数 |
| `copyBufferSubData(readTarget, writeTarget, readOff, writeOff, length)`（WebGL2） | GPU 侧 buffer 互拷，不经过 CPU |
| `vertexAttribIPointer`（WebGL2） | 整数 attribute 专用（不归一化，配 GLSL int/uint） |

### vertexAttribPointer 六参数

```javascript
gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
```

| 参数 | 取值 | 一句话 |
|---|---|---|
| `index` | GLuint | attribute 槽位号 = `getAttribLocation(prog, 'aPosition')`，或 ES3 `layout(location = n)` 写死 |
| `size` | 1~4 | 每顶点取几个分量：vec3 填 3，vec2 填 2 |
| `type` | 见下表 | 单个分量的数据类型 |
| `normalized` | bool | 整型是否映射到 [0,1]（无符号）或 [-1,1]（有符号）；float 类型恒 `false` |
| `stride` | 字节数 | 相邻顶点同一属性的字节间距；`0` 表示紧密排列（自动 = size × 类型字节数） |
| `offset` | 字节数 | 首个顶点该属性在 buffer 内的字节起点（须为类型字节数的倍数） |

| type | 字节 | normalized 后范围 |
|---|---|---|
| `FLOAT` | 4 | 不归一化 |
| `HALF_FLOAT`（WebGL2） | 2 | 不归一化 |
| `UNSIGNED_BYTE` | 1 | [0, 1]（除以 255） |
| `BYTE` | 1 | [-1, 1] |
| `UNSIGNED_SHORT` | 2 | [0, 1] |
| `SHORT` | 2 | [-1, 1] |
| `UNSIGNED_INT` / `INT`（WebGL2） | 4 | [0,1] / [-1,1]，或用 `vertexAttribIPointer` 保持整数 |

交错布局示例（pos:vec3 + uv:vec2 + normal:vec3，全 float，stride = 8 × 4 = 32 字节）：

```text
byte: 0            12       20                  32           44       52
      [pos x y z  ][uv s t  ][normal x y z     ][下一顶点 pos ][uv s t  ][normal ...
       offset=0              offset=20
取址公式：第 i 顶点该属性地址 = 绑定 buffer 首址 + stride × i + offset
```

### vertexAttribDivisor

| 调用 | 语义 |
|---|---|
| `gl.vertexAttribDivisor(loc, 0)` | 默认：逐顶点推进（普通 attribute） |
| `gl.vertexAttribDivisor(loc, 1)` | 每 1 个实例推进一次（逐实例数据：偏移、颜色、缩放……） |
| `gl.vertexAttribDivisor(loc, n)` | 每 n 个实例共享一份 |

- 仅影响 drawArraysInstanced / drawElementsInstanced（见 1.6）。
- WebGL1 用 `ANGLE_instanced_arrays.vertexAttribDivisorANGLE`。
- 实战：[粒子系统与 Instancing 实战](../05-第五阶段/05-粒子系统与Instancing实战.md)、[WebGL2 特性 6.2](../02-第二阶段/07-WebGL2特性.md)。

## 1.4 纹理 API

纹理基础详解 [纹理](../02-第二阶段/03-纹理.md)；压缩纹理与显存见 [性能优化 6.3~6.4](../05-第五阶段/07-性能优化与调试.md)。

### texImage2D 参数全景

```javascript
// 九参：自己分配尺寸（显存立即保留）
gl.texImage2D(target, level, internalformat, width, height, 0/*border 恒 0*/, format, type, null);
// 六参：从 DOM 源上传（尺寸自动取源的尺寸）
gl.texImage2D(target, level, internalformat, format, type, imageOrCanvas);
// WebGL2 推荐：texStorage2D 一次性分配 + texSubImage2D 填充（不可变存储，见下文差异表）
gl.texStorage2D(target, levels, internalformat, width, height);
```

| 参数 | 说明 |
|---|---|
| `target` | `TEXTURE_2D`；cubemap 用 `TEXTURE_CUBE_MAP_POSITIVE_X + i`（i = 0..5，顺序 +X, -X, +Y, -Y, +Z, -Z） |
| `level` | mipmap 层号，最精细层为 0 |
| `internalformat` | WebGL1 只能用非尺寸化名（必须与 format 相同）；WebGL2 用尺寸化名（R8/RGBA16F……） |
| `format` / `type` | 像素在内存里的排布，与 internalformat 必须是下表合法组合 |
| 最后一参 | 数据或 `null`（null = 只分配显存） |

### WebGL1 合法组合（internalformat = format）

| internalformat/format | type | 用途 |
|---|---|---|
| `RGBA` | `UNSIGNED_BYTE` | 最常用，32 位 |
| `RGBA` | `UNSIGNED_SHORT_4_4_4_4` | 16 位压缩色 |
| `RGBA` | `UNSIGNED_SHORT_5_5_5_1` | 带 1 位 alpha |
| `RGB` | `UNSIGNED_BYTE` | 24 位，不带 alpha |
| `RGB` | `UNSIGNED_SHORT_5_6_5` | 16 位无 alpha |
| `LUMINANCE_ALPHA` | `UNSIGNED_BYTE` | 灰度 + alpha |
| `LUMINANCE` / `ALPHA` | `UNSIGNED_BYTE` | 单通道（WebGL2 起改用 R8） |

NPOT（非 2 次幂）限制（WebGL1）：不能生成 mipmap、wrap 只能 `CLAMP_TO_EDGE`、min filter 只能 NEAREST/LINEAR；WebGL2 全面放开。

### WebGL2 尺寸化格式高频组合

| internalformat | format | type | 用途 |
|---|---|---|---|
| `R8` | `RED` | `UNSIGNED_BYTE` | 单通道：遮罩、灰度 |
| `RG8` | `RG` | `UNSIGNED_BYTE` | 双通道 |
| `RGB8` / `RGBA8` | `RGB` / `RGBA` | `UNSIGNED_BYTE` | 标准颜色 |
| `SRGB8_ALPHA8` | `RGBA` | `UNSIGNED_BYTE` | **采样时硬件自动 sRGB→线性**，色彩正确性首选（见 [色彩数学](../数学专题/08-色彩数学.md)） |
| `R11F_G11F_B10F` | `RGB` | `UNSIGNED_INT_10F_11F_11F_REV`（或 HALF_FLOAT/FLOAT） | 无 alpha 的 HDR 颜色，省显存 |
| `R16F` / `RG16F` / `RGBA16F` | `RED` / `RG` / `RGBA` | `HALF_FLOAT`（或 FLOAT） | HDR 半精度渲染目标 |
| `R32F` / `RGBA32F` | `RED` / `RGBA` | `FLOAT` | GPGPU 全精度状态纹理 |
| `R8UI` / `RGBA8UI` | `RED_INTEGER` / `RGBA_INTEGER` | `UNSIGNED_BYTE` | 整数纹理，配 isampler/usampler 原样读整数 |
| `DEPTH_COMPONENT16` | `DEPTH_COMPONENT` | `UNSIGNED_SHORT` / `UNSIGNED_INT` | 深度附件（WebGL1 需扩展） |
| `DEPTH_COMPONENT24` | `DEPTH_COMPONENT` | `UNSIGNED_INT` | 主流深度附件 |
| `DEPTH24_STENCIL8` | `DEPTH_STENCIL` | `UNSIGNED_INT_24_8` | 深度+模板一体 |

| 浮点纹理要点 | 说明 |
|---|---|
| 渲染到浮点 | WebGL2 需 `EXT_color_buffer_float` 扩展才能把 16F/32F 挂为颜色附件 |
| 线性过滤 | 16F 核心可过滤；32F 过滤需 `OES_texture_float_linear` |
| 压缩格式 | `compressedTexImage2D` 走 ETC2/ASTC 等，工程链路（KTX2/Basis）见 [性能优化 6.4](../05-第五阶段/07-性能优化与调试.md) |

### texStorage2D vs texImage2D 差异

| 维度 | texImage2D（可变存储） | texStorage2D（不可变存储，WebGL2） |
|---|---|---|
| 分配方式 | 每次（每层）调用都可能重新分配 | 一次调用分配全部 mipmap 层 |
| 格式与尺寸 | 可再次调用改变 | 定死，之后只能 `texSubImage2D` 填数据 |
| 驱动行为 | 需防御性校验，可能产生临时拷贝 | 驱动可做更优布局，显存与校验开销更小 |
| mipmap | 手动逐层传或 `generateMipmap` | 层数在参数里一次声明 |
| 选择建议 | 兼容 WebGL1、动态尺寸数据 | WebGL2 下静态纹理优先用它 |

### 参数设置全表：WRAP / FILTER

| 参数名 | 取值 | 说明 |
|---|---|---|
| `TEXTURE_WRAP_S` / `T`（/ `R` 3D） | `CLAMP_TO_EDGE` | 超界夹到边缘 |
| | `REPEAT` | 超界取模平铺（需 POT，WebGL1） |
| | `MIRRORED_REPEAT` | 镜像平铺 |
| `TEXTURE_MAG_FILTER` | `NEAREST` / `LINEAR` | 放大时取最近/双线性 |
| `TEXTURE_MIN_FILTER` | `NEAREST` / `LINEAR` | 缩小不用 mipmap 的两档 |
| | `NEAREST_MIPMAP_NEAREST` / `LINEAR_MIPMAP_NEAREST` | 层间最近 |
| | `NEAREST_MIPMAP_LINEAR` / `LINEAR_MIPMAP_LINEAR` | 层间线性（`LINEAR_MIPMAP_LINEAR` 质量最高，走样最小） |
| `TEXTURE_COMPARE_MODE`（WebGL2） | `NONE` / `COMPARE_REF_TO_TEXTURE` | 后者采样深度纹理直接返回比较结果 0~1，硬件 PCF 用（[阴影 1.3](../05-第五阶段/02-阴影与PCF软阴影.md)） |
| `TEXTURE_COMPARE_FUNC`（WebGL2） | `LESS` / `LEQUAL` …… | 比较函数 |
| `TEXTURE_MAX_ANISOTROPY_EXT` | 1~上限 | 各向异性过滤，需 `EXT_texture_filter_anisotropic` 扩展 |

| 像素存储（pixelStorei） | 值 | 说明 |
|---|---|---|
| `UNPACK_FLIP_Y_WEBGL` | true/false | 上传时上下翻转，让图片 v 轴与 UV 习惯一致（详解 [纹理 2.5](../02-第二阶段/03-纹理.md)） |
| `UNPACK_PREMULTIPLY_ALPHA_WEBGL` | true/false | 上传时颜色乘 alpha |
| `UNPACK_COLORSPACE_CONVERSION_WEBGL` | `NONE` | 跳过浏览器色彩空间转换 |

纹理操作一览：

| API | 作用 |
|---|---|
| `texSubImage2D(target, level, xoff, yoff, w, h, format, type, src)` | 只改一块区域；texStorage2D 分配后唯一的数据入口 |
| `generateMipmap(target)` | 从 level 0 生成全金字塔（尺寸须 2 次幂，WebGL1） |
| `copyTexImage2D / copyTexSubImage2D` | 把当前颜色缓冲拷进纹理（WebGL1 的"屏幕截图"老路） |
| `texParameterf(target, TEXTURE_MIN_LOD/MAX_LOD, x)`（WebGL2） | LOD 上下限（sampler 对象同样可设） |
| `getTexParameter` / `getError` 常伴 | 参数写错多数静默，排查看 [03 卡 3.7](03-常用代码片段.md) |

## 1.5 状态与测试

详解 [渲染状态与测试](../02-第二阶段/04-渲染状态与测试.md)。WebGL 是全局状态机：`enable`/`disable` 开能力，伴随 API 设参数。

### 能力位全表

| 能力位（gl.enable / gl.disable） | 默认 | 伴随 API | 说明 |
|---|---|---|---|
| `DEPTH_TEST` | 关 | `depthFunc` / `depthMask` / `depthRange` | 深度测试；`depthMask(false)` 只关写入（预通道常用） |
| `BLEND` | 关 | `blendFunc` / `blendFuncSeparate` / `blendEquation` / `blendColor` | 混合，透明物体必开 |
| `CULL_FACE` | 关 | `cullFace(BACK/FRONT/FRONT_AND_BACK)` + `frontFace(CCW)` | 面剔除；绕序决定正反面 |
| `SCISSOR_TEST` | 关 | `scissor(x, y, w, h)` | 裁剪矩形，**影响 clear 与绘制**；用完即关 |
| `STENCIL_TEST` | 关 | `stencilFunc` / `stencilOp` / `stencilMask` | 模板测试 |
| `POLYGON_OFFSET_FILL` | 关 | `polygonOffset(factor, units)` | 深度微偏移，shadow acne / 共面叠加用 |
| `DITHER` | 开 | 无参数 | 抖动，输出低精度颜色时才相关 |
| `SAMPLE_ALPHA_TO_COVERAGE` / `SAMPLE_COVERAGE` | 关 | `sampleCoverage(value, invert)` | MSAA alpha 覆盖（透明几何 AA 的另一条路） |
| `RASTERIZER_DISCARD`（WebGL2） | 关 | 无参数 | 丢弃光栅化输出，transform feedback 纯计算用 |

### blendFunc 常量与三例

常用因子：`ZERO` / `ONE` / `SRC_COLOR` / `ONE_MINUS_SRC_COLOR` / `SRC_ALPHA` / `ONE_MINUS_SRC_ALPHA` / `DST_ALPHA` / `ONE_MINUS_DST_ALPHA` / `DST_COLOR` / `ONE_MINUS_DST_COLOR` / `SRC_ALPHA_SATURATE`（仅源） / `CONSTANT_COLOR` / `CONSTANT_ALPHA`（配 `blendColor(r,g,b,a)`）。
blendEquation：`FUNC_ADD`（默认）/ `FUNC_SUBTRACT` / `FUNC_REVERSE_SUBTRACT`（WebGL2 另有 `MIN`/`MAX`）。

| 场景 | 调用 | 效果与注意 |
|---|---|---|
| 常规透明 | `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` | 最常用；物体仍需按远近排序 |
| 加色发光 | `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)` | 火花、光晕叠加，黑背景效果好；排序无关 |
| 预乘合成 | `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` | 纹理/FBO 输出已预乘 alpha 时用，否则边缘发暗或发白 |

### 深度与模板函数表

depthFunc / stencilFunc 共用 8 个比较函数（对 ref 与缓冲值比较）：

| 函数 | 通过条件 |
|---|---|
| `NEVER` / `ALWAYS` | 永不 / 恒通过 |
| `LESS` / `GREATER` | 严格小于 / 大于 |
| `EQUAL` / `NOTEQUAL` | 等于 / 不等 |
| `LEQUAL` / `GEQUAL` | 小于等于 / 大于等于 |

| 深度相关 | 调用 | 说明 |
|---|---|---|
| 比较函数 | `gl.depthFunc(gl.LEQUAL)` | 默认 LESS |
| 写入开关 | `gl.depthMask(false)` | 透明物体渲染阶段关写 |
| 深度范围 | `gl.depthRange(0, 1)` | NDC z 映射窗口深度 |

| 模板相关 | 调用 | 说明 |
|---|---|---|
| 参考与掩码 | `gl.stencilFunc(func, ref, mask)` | `(ref & mask) func (stencil & mask)` |
| 三种结果的操作 | `gl.stencilOp(fail, zfail, zpass)` | 分别是：模板失败 / 模板过但深度失败 / 都过 |
| 写掩码 | `gl.stencilMask(0xFF)` | 0 = 只读 |

stencilOp 的操作数：`KEEP` / `ZERO` / `REPLACE`（写 ref）/ `INCR` / `DECR` / `INCR_WRAP` / `DECR_WRAP`（回绕不饱和）/ `INVERT`。

### clear 家族与写掩码

| 调用 | 说明 |
|---|---|
| `gl.clearColor(r, g, b, a)` / `clearDepth(z)` / `clearStencil(s)` | 设各缓冲的清除值（depth 默认 1，stencil 默认 0） |
| `gl.clear(gl.COLOR_BUFFER_BIT \| gl.DEPTH_BUFFER_BIT \| gl.STENCIL_BUFFER_BIT)` | 位掩码组合；clear 受 scissor/colorMask/depthMask 影响 |
| `gl.colorMask(r, g, b, a)` | 逐通道写开关；渲染"只写深度"时 colorMask 全 false |
| `gl.depthMask(false)` | 关深度写（透明 pass 标配） |

## 1.6 绘制与同步

### 绘制家族一页表

| API | 版本 | 签名要点 | 说明 |
|---|---|---|---|
| `drawArrays(mode, first, count)` | 1 | first = 起始顶点索引 | 从 VBO 顺序取 count 个顶点 |
| `drawElements(mode, count, type, offset)` | 1 | type：`UNSIGNED_BYTE`/`UNSIGNED_SHORT`/`UNSIGNED_INT`(2)；offset 是字节 | 按 IBO 索引取，复用共享顶点 |
| `drawArraysInstanced(mode, first, count, instanceCount)` | 2 | 尾加实例数 | 配 `vertexAttribDivisor`（1.3） |
| `drawElementsInstanced(mode, count, type, offset, instanceCount)` | 2 | 同上 | 实例化索引绘制 |
| `drawRangeElements(mode, start, end, count, type, offset)` | 2 | start/end 圈定用到的顶点索引范围 | 给驱动的访存提示，可少 flush |

| mode 图元 | 顶点组织 |
|---|---|
| `TRIANGLES` | 每 3 个一三角；count 是**顶点/索引个数**，不是三角形数 |
| `TRIANGLE_STRIP` / `TRIANGLE_FAN` | 条带 / 扇形，省索引 |
| `LINES` / `LINE_STRIP` / `LINE_LOOP` | 线段三种 |
| `POINTS` | 点精灵，配合 `gl_PointSize` 与 `gl_PointCoord` |

| 同步 | 语义 | 什么时候用 |
|---|---|---|
| `gl.flush()` | 立即提交命令，异步不等 GPU | 几乎不用，浏览器每帧末自动 flush |
| `gl.finish()` | 阻塞到 GPU 全部完成 | 仅精确计时 / 排查同步 bug；正常管线禁用 |
| `fenceSync` + `clientWaitSync` | 异步问"GPU 追平没有" | 读回（getBufferSubData / readPixels）前轮询，减少阻塞 |

fenceSync 用法三行：

```javascript
const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);  // 1. 在关心的命令之后插栅栏（WebGL2）
const st = gl.clientWaitSync(sync, 0, 0);                     // 2. 立即返回：ALREADY_SIGNALED / CONDITION_SATISFIED = 完成
if (st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED) gl.deleteSync(sync); // 3. 用完删除
```

## 1.7 uniform 上传表

一次搞清"uniform 类型 → 调用 → JS 怎么传"。矩阵列主序与数学库对接详解 [数学库 minmath 1.3](../03-第三阶段/02-数学库minmath.md)。

| uniform 类型 | 标量形式 | v 形式（数组/复用） | JS 传参示例 |
|---|---|---|---|
| `float` | `uniform1f(loc, 1.0)` | `uniform1fv(loc, [1.0, 2.0])` | number / number[] |
| `vec2` / `vec3` / `vec4` | `uniform2f(loc, x, y)`（3f/4f 同理） | `uniform2fv(loc, arr)` | `gl.uniform3fv(loc, [1, 2, 3])` 或 `Float32Array` |
| `int` / `ivec2/3/4` | `uniform1i(loc, 1)` | `uniform1iv(loc, arr)` | number / Int32Array |
| `uint`（WebGL2） | `uniform1ui(loc, 1u)` | `uniform1uiv(loc, arr)` | 无符号整数 |
| **sampler 全家** | `uniform1i(loc, unit)` | —— | 传的是**纹理单元号**，不是纹理对象；先 `activeTexture(TEXTURE0 + unit)` + `bindTexture` |
| `bool` | `uniform1i(loc, 1)`（0/1） | `uniform1iv` | |
| `mat2` / `mat3` / `mat4` | —— | `uniformMatrix2fv/3fv/4fv(loc, false, arr)` | `Float32Array(16)`，**列主序**，transpose 恒传 `false` |
| `mat2x3` 等 6 种非方阵（WebGL2） | —— | `uniformMatrix2x3fv(loc, false, arr)` 等 | 列优先 6/8/12 元素 |
| 数组 uniform `uLights[0]` | —— | 用 v 形式一次全传 | getUniformLocation 用 `uLights[0]` 取头地址 |

location 为 null 的容错提醒：

```javascript
const loc = gl.getUniformLocation(prog, 'uColor'); // 拼错 / 被优化掉 / 宏分支未用到 → 返回 null
gl.uniform4f(loc, 1, 0, 0, 1);                    // 规范规定这是静默 no-op：不报错、不置 getError
// 排查：枚举 program 里实际存在的 uniform（优化掉的不在里面）
const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
for (let i = 0; i < n; i++) console.log(gl.getActiveUniform(prog, i).name);
```

三个高频踩点：名字拼写与 GLSL 完全一致（含大小写）；uniform 在着色器里没被实际使用会被编译器裁掉；同一 program 的 location 可缓存复用（见 [03-常用代码片段 3.2](03-常用代码片段.md)）。

uniform 三件套查询：

| API | 用途 |
|---|---|
| `gl.getUniformLocation(prog, name)` | 拿 location；数组用 `name + '[0]'` |
| `gl.getActiveUniform(prog, i)`（i < `ACTIVE_UNIFORMS`） | 枚举实际 uniform：名字、类型、数组长度 |
| `gl.getUniform(prog, loc)` | 读回当前值（调试用） |

## 1.8 WebGL2 新 API 增量表

逐项详解 [WebGL2 特性](../02-第二阶段/07-WebGL2特性.md)；GLSL 侧配套是 `#version 300 es`（差异总表见 [着色器语言专题导览](../着色器语言专题/00-导览.md)）。

| 能力 | 关键 API | 速记 |
|---|---|---|
| VAO | `createVertexArray` / `bindVertexArray` / `deleteVertexArray` | 一次绑定整套 attribute 状态，替代每帧十几条 pointer 调用 |
| 实例化 | `drawArraysInstanced` / `drawElementsInstanced` / `vertexAttribDivisor` | 一个 draw 画万级重复物 |
| UBO | GLSL `layout(std140) uniform Block` + `getUniformBlockIndex` / `uniformBlockBinding` + `bindBufferBase(UNIFORM_BUFFER, slot, buf)` | 多 program 共享一份 uniform 显存 |
| Transform Feedback | `transformFeedbackVaryings(prog, ['v_pos'], gl.SEPARATE_ATTRIBS)` + `createTransformFeedback` / `bindTransformFeedback` / `bindBufferBase(TRANSFORM_FEEDBACK_BUFFER, i, buf)` + `beginTransformFeedback` / `endTransformFeedback`（配 `enable(RASTERIZER_DISCARD)`） | 顶点着色器输出写回 buffer，GPGPU 基石 |
| MRT | 多个 `framebufferTexture2D(FRAMEBUFFER, COLOR_ATTACHMENT1..)` + `drawBuffers([COLOR_ATTACHMENT0, COLOR_ATTACHMENT1])`；GLSL 多个 `out` | 一 pass 出多张图（G-buffer） |
| sampler 对象 | `createSampler` / `bindSampler(unit, s)` / `samplerParameteri` | 采样参数从纹理对象剥离，一张纹理多种采样方式 |
| 读回 | `getBufferSubData(target, offset, dst)` / `copyBufferSubData(readT, writeT, ..)` | GPU→CPU 读回 / buffer 间复制；配合 fenceSync 轮询 |
| 同步对象 | `fenceSync` / `clientWaitSync` / `deleteSync` | 见 1.6 |
| 3D / 数组纹理 | `texStorage3D` / `TEXTURE_2D_ARRAY` / `TEXTURE_3D`；GLSL `sampler3D` / `sampler2DArray` | 体数据、图集动画 |
| 整数纹理与整数顶点 | `R8UI` 等格式 + `vertexAttribIPointer`；GLSL `uint` / `isampler2D` | 顶点 ID、精确整数值不再归一化 |
| MSAA FBO | `renderbufferStorageMultisample` + `blitFramebuffer` | 离屏也抗锯齿，blit 解析 |
| sRGB 内建 | `SRGB8_ALPHA8`（1.4 表） | 采样即线性化 |

WebGL1 需要扩展才能做的事，WebGL2 全部核心化：VAO、instancing、深度纹理、浮点纹理（渲染仍需 `EXT_color_buffer_float`）、多渲染目标、非 POT mipmap。

配套的 GLSL ES 3.00 最小模板（用了上表任何 WebGL2 特性，着色器就要切到 3.00）：

```glsl
#version 300 es              // 必须第一行，前面不能有空行/空格
in vec3 aPosition;           // attribute → in
out vec3 vColor;             // varying → out（顶点）
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(aPosition, 1.0);
  vColor = aPosition * 0.5 + 0.5;
}
```

```glsl
#version 300 es
precision mediump float;     // 片元仍必须手写 float 精度
in vec3 vColor;              // varying → in（片元）
out vec4 oColor;             // gl_FragColor 删除，自声明输出
void main() {
  oColor = vec4(vColor, 1.0);
}
```

迁移纪律：`#version` / attribute→in / varying→out,in / gl_FragColor→out / texture2D→texture 五处一次换完，混用必编译失败（清单见 [ES3 特性 5.1](../着色器语言专题/05-ES3特性与调试规范.md)）。
