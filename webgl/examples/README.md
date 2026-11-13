# WebGL 示例工程

[webgl 分册](../docs/WebGL与3D框架学习大纲.md) 的递进式可运行示例：把各阶段分册里内嵌的代码块落成一个 **clone 下来就能跑** 的 Vite + TypeScript 工程。无框架、无三方运行时依赖——WebGL 调用、数学库、几何生成器、相机控制器全部手写，API 命名与分册保持一致。

## 运行

```bash
npm install        # 仅安装 devDependencies：vite + typescript
npm run dev        # 开发服务器，打开 http://localhost:5173/ 进入导航页
npm run build      # 类型检查（tsc --noEmit）+ 多页面构建，产物在 dist/
npm run preview    # 本地预览构建产物
```

> 国内网络如安装缓慢：`npm install --registry=https://registry.npmmirror.com`

## 示例清单

| 示例 | 对应分册 | 演示什么 |
|---|---|---|
| [01-hello-triangle](01-hello-triangle/index.html) | [第一阶段 / 第一个 WebGL 程序](../docs/01-第一阶段/03-第一个WebGL程序.md) | VBO 上传、attribute 接线（stride/offset 单位是字节）、drawArrays 画渐变三角形 |
| [02-orbit-cube](02-orbit-cube/index.html) | [第一阶段 / 实践：自转公转立方体](../docs/01-第一阶段/06-实践-自转公转立方体.md) | 矩阵链 `M = R_y(公转)·T(轨道)·R_x(倾斜)·R_y(自转)`、perspective/lookAt、深度测试、deltaTime |
| [03-textured-earth](03-textured-earth/index.html) | [第二阶段 / 实践：纹理地球](../docs/02-第二阶段/08-实践-纹理地球.md) | UV 球生成器、canvas 程序化双纹理（零外部素材）、Blinn-Phong + Gamma、透明云层遍（关深度写入） |
| [04-minmath-test](04-minmath-test/index.html) | [第三阶段 / 数学库 minmath](../docs/03-第三阶段/02-数学库minmath.md) | `src/common/math.ts` 的运行时断言页：黄金值 / 性质 / 往返三类用例（分册用 vitest，本页在浏览器跑） |
| [05-orbit-controls](05-orbit-controls/index.html) | [第三阶段 / 引擎最小核心](../docs/03-第三阶段/03-引擎最小核心.md) | 球坐标轨道相机：拖拽旋转、滚轮指数缩放、`k = 1 - e^(-λ·dt)` 帧率无关阻尼、投影矩阵脏标记 |
| [06-scene-graph](06-scene-graph/index.html) | [第四阶段 / 场景图](../docs/04-第四阶段/03-场景图.md) | 8 节点父子变换树（恒星-行星-月球）：`matrixWorld = 父 × 局部`、双脏标记剪枝、空轨道节点带动公转 |
| [07-picking](07-picking/index.html) | [第四阶段 / 交互系统](../docs/04-第四阶段/05-交互系统.md) | 屏幕点 -> NDC -> 逆投影 -> 世界射线，Möller–Trumbore 三角形求交（局部空间 + t 缩放换算），hover/click 语义 |
| [08-shadows](08-shadows/index.html) | [第五阶段 / 阴影与 PCF 软阴影](../docs/05-第五阶段/02-阴影与PCF软阴影.md) | 两 pass shadow map（`DEPTH_COMPONENT24` + `sampler2DShadow`）、光源正交相机按 AABB 拟合、坡度 bias + 3x3 PCF |

每个示例的 `main.ts` 顶部注释都标注了对应分册路径；交互方式见各页面左上角 HUD。

## 目录结构

```text
examples/
├── index.html                  # 示例导航页（纯 HTML + 内联样式）
├── package.json                # name: webgl-examples，仅 vite/typescript 两个 devDependencies
├── tsconfig.json               # TypeScript 严格模式（strict + noUnusedLocals 等）
├── vite.config.ts              # 多页面入口：rollupOptions.input 逐个列出 9 个 html
├── src/common/                 # 公共层（从各分册提炼，示例共用）
│   ├── gl.ts                   # 上下文创建 / 着色器编译链接（带行号日志）/ resize+dpr / canvas 纹理上传
│   │                           #   <- 01-第一阶段/03-第一个WebGL程序.md
│   ├── math.ts                 # minmath 最小集：Vec3 + Mat4（multiply/perspective/lookAt/
│   │                           #   fromRotation/fromTranslation/invert/ortho...），列主序
│   │                           #   <- 03-第三阶段/02-数学库minmath.md
│   ├── geometry.ts             # createPlane/createBox/createSphere 生成器（纯数据）+ WebGL2 VAO 上传
│   │                           #   <- 03-第三阶段/03-引擎最小核心.md 2.3/2.4
│   └── controls.ts             # PerspectiveCamera + OrbitControls（球坐标 + 帧率无关阻尼）
│                               #   <- 03-第三阶段/03-引擎最小核心.md 2.2
├── 01-hello-triangle/          # 每个示例一个目录：index.html + main.ts（+ 按需拆分的辅助 ts）
├── 02-orbit-cube/
├── 03-textured-earth/          #   额外：texture.ts（程序化纹理）、shaders.ts
├── 04-minmath-test/
├── 05-orbit-controls/
├── 06-scene-graph/             #   额外：scene-graph.ts（Node3D）
├── 07-picking/                 #   额外：raycast.ts、boxes.ts（场景数据）
└── 08-shadows/                 #   额外：shadow.ts（深度 FBO + 光相机）、shaders.ts
```

## 与分册的对应关系说明

- **API 命名**：`compileShader / createProgram / lookAt / perspective / fromTRS / OrbitControls / createSphere / ...` 均沿用分册命名；分册里"每个 demo 原样复制"的骨架（上下文、编译链接、resize）统一提炼进了 `src/common/`。
- **WebGL 版本**：01/02 按第一阶段分册用 GLSL ES 1.00（WebGL1 语法）；03-08 用 WebGL2（VAO、`DEPTH_COMPONENT24` 等，与三、四、五阶段分册一致）。
- **刻意的精简**（均在代码注释中标明出处）：`math.ts` 是 minmath 的最小集（无 Quaternion/Mat3，场景图用"轴 + 角"代替四元数）；法线矩阵在纯旋转场景直接取 `mat3(uModel)`（分册注明完整实现须用 `normalFromMat4`）。
