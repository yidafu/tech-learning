# WebGL 与 3D 框架学习大纲

> 目标：从零掌握 WebGL 渲染原理，最终自研一个迷你 3D 框架（数学库 + 场景图 + 渲染器 + 材质/资源系统），并用它做出可交互的 3D 场景。
> 用法：按阶段推进，学到哪一节就勾选对应条目；`[ ]` 未学，`[x]` 已完成。每阶段末尾有实践任务，"看懂"不算数，跑起来才算。

## 第一阶段：渲染管线与 WebGL 入门（2~3 周）

> 本阶段导览（分册索引）：[01-第一阶段/01-导览.md](01-第一阶段/01-导览.md)

- [ ] 1. 渲染管线全局观
  - CPU 与 GPU 的分工：绘制命令 vs 并行计算
  - 图形流水线：顶点着色 → 图元装配 → 光栅化 → 片元着色 → 输出合并
  - WebGL 与 OpenGL ES 的关系；WebGL1 vs WebGL2 的取舍
  - GPU 并行模型：着色器为什么对每个顶点/片元独立执行
- [ ] 2. 第一个 WebGL 程序
  - canvas、gl 上下文、clearColor / viewport
  - 顶点缓冲（VBO）、attribute 传参、drawArrays 画三角形
  - 着色器编译链接流程，shader 编译错误怎么排查
- [ ] 3. GLSL 基础
  - 类型与限定符：attribute / uniform / varying（WebGL2 的 in / out 统一）
  - 内置变量：gl_Position、gl_FragCoord、gl_FragColor
  - 精度限定符、向量运算与 swizzle 语法
- [ ] 4. 图形学数学基础
  - 向量：点积叉积的几何意义、归一化
  - 矩阵乘法与变换的复合；平移 / 旋转 / 缩放矩阵的推导
  - 模型 - 视图 - 投影（MVP）矩阵链
  - 手写 lookAt 与透视投影矩阵（perspective）
  - 坐标空间全链路：局部 → 世界 → 相机 → 裁剪 → NDC → 屏幕
- [ ] 实践任务：不借助任何库，画一个自转 + 公转的立方体（数学函数全部手写）

## 第二阶段：WebGL 核心渲染技术（3~4 周）

> 本阶段导览（分册索引）：[02-第二阶段/01-导览.md](02-第二阶段/01-导览.md)

- [ ] 1. 几何与索引绘制
  - 索引缓冲（IBO）与 drawElements：为什么立方体要用索引
  - 图元类型：TRIANGLES / STRIP / FAN / LINES / POINTS
- [ ] 2. 纹理
  - 图片加载、UV 坐标、采样 wrap / filter
  - mipmap 与多级采样
  - 多重纹理单元、纹理叠加混合
  - 像素存储参数：UNPACK_FLIP_Y 与预乘 alpha
- [ ] 3. 渲染状态与测试
  - 深度测试与 z-fighting
  - 混合（blend）与透明物体排序
  - 模板测试、正面/背面剔除（cull face）
- [ ] 4. 光照
  - 法线与法线矩阵（为什么不能用 model 矩阵直接变换法线）
  - 平行光 / 点光 / 聚光灯的数学模型
  - Phong 与 Blinn-Phong 着色；环境光 + 漫反射 + 高光分解
  - Gamma 校正与 sRGB
- [ ] 5. 帧缓冲与离屏渲染
  - FBO 与 renderbuffer 的关系
  - render to texture：把场景画到纹理上再用
- [ ] 6. WebGL2 特性
  - VAO：它到底省了什么
  - instancing 实例化绘制、UBO
  - transform feedback、MRT 多渲染目标
- [ ] 实践任务：Blitt-Phong 光照 + 纹理地球（自转 + 云层双纹理）；FBO 视频播放器

## 第三阶段：自研数学库与引擎雏形（2~3 周）

> 本阶段导览（分册索引）：[03-第三阶段/01-导览.md](03-第三阶段/01-导览.md)

- [ ] 1. 数学库 minmath
  - Vec2 / Vec3 / Vec4、Mat3 / Mat4、Quaternion
  - 欧拉角、四元数与万向节锁；slerp 球面插值
  - 列主序与行主序约定，与 WebGL uniformMatrix4fv 的对接
  - 用 vitest 给矩阵运算写单元测试
- [ ] 2. 引擎最小核心
  - 渲染循环：requestAnimationFrame 与增量时间（deltaTime）
  - PerspectiveCamera 与 OrbitCamera 轨道控制器（鼠标拖拽 / 缩放）
  - Geometry 生成器：box / sphere / plane（位置、法线、UV 一次到位）
  - Mesh = Geometry + Material 的最小抽象
- [ ] 实践任务：把第二阶段的 demo 用自己的 API 重写，代码量减半

## 第四阶段：框架架构与工程化（3~4 周，重点）

> 本阶段导览（分册索引）：[04-第四阶段/01-导览.md](04-第四阶段/01-导览.md)

- [ ] 1. 框架总体架构
  - 分层设计：数学层 / 渲染层 / 场景层 / 资源层 / 交互层
  - Renderer 与 WebGL 状态托管：状态缓存为什么能提速
  - 对象生命周期：create / update / dispose 与显存回收
- [ ] 2. 场景图（Scene Graph）
  - 父子变换链与 worldMatrix 更新、脏标记优化
  - 渲染队列：不透明先渲染、透明按距离排序
- [ ] 3. 材质与着色器系统
  - Shader 封装：编译缓存、uniform 反射与自动上传
  - 材质参数到 uniform 的映射；#define 宏开关（uber shader 思路）
- [ ] 4. 交互系统
  - Raycaster 拾取：屏幕坐标 → NDC → 世界射线 → 三角形相交
  - 事件系统与控制器抽象
- [ ] 5. 动画系统
  - 关键帧插值与动画混合（mix / blend）
  - 骨骼蒙皮入门：骨骼矩阵与 skin pallete
- [ ] 6. 资源管理
  - 加载队列、依赖管理与 Promise 化
  - 简版 glTF 加载器（网格 + 材质 + 场景层级）
- [ ] 7. 工程化
  - TypeScript 严格模式、模块边界（ESM）
  - 单测覆盖数学库与核心流程；打包发布为 npm 库
- [ ] 实践任务：框架定名并发布 npm 包，配套 README + 在线示例

## 第五阶段：进阶渲染与性能（3~4 周）

> 本阶段导览（分册索引）：[05-第五阶段/01-导览.md](05-第五阶段/01-导览.md)

- [ ] 1. 阴影：shadow map 深度纹理、光源正交相机、PCF 软阴影
- [ ] 2. 后处理管线：ping-pong 双缓冲、bloom、FXAA、色调映射
- [ ] 3. PBR 入门：Cook-Torrance BRDF、金属度/粗糙度工作流、IBL 概念
- [ ] 4. 粒子系统与 instancing 实战（万级粒子不掉帧）
- [ ] 5. 雾效、天空盒（cubemap）与环境反射
- [ ] 6. 性能优化
  - drawcall 是什么、合批（batching）思路
  - 显存管理、纹理压缩格式（KTX2 / Basis）概念
  - 调试工具：Spector.js 抓帧分析、性能埋点

## 第六阶段：源码对标与毕业项目（2~3 周）

> 本阶段导览（分册索引）：[06-第六阶段/01-导览.md](06-第六阶段/01-导览.md)

- [ ] 1. Three.js 源码研读（对照自研框架查漏补缺）
  - 目录结构与模块划分
  - WebGLRenderer 的状态机与渲染队列
  - Object3D 变换链、材质与 shader chunk 体系
- [ ] 2. 生态横向一瞥：Babylon / regl / Oasis 的设计取舍
- [ ] 3. 毕业项目：用自研框架做一个完整可交互场景（太阳系 / 3D 展厅任选）
  - 综合运用：场景图 + 光照阴影 + 后处理 + 拾取交互 + 动画

## 参考资料与工具

- WebGL1/2 spec 与 MDN WebGL 文档
- 《WebGL 编程指南》《Fundamentals of Computer Graphics》
- webglfundamentals.org / webgl2fundamentals.org（每篇都有可运行示例）
- Three.js 源码（r150+）与官方示例
- 调试：Spector.js、Chrome GPU 任务管理器
