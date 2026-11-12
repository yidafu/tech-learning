# Metro 配置与工程化

> 01 篇讲了 Metro 的三阶段（Resolution / Transformation / Serialization），本篇讲**这三段各能怎么改**：resolver 的平台与 monorepo、transformer 的注入、serializer 的多包 id，最后回答那个经典问题——**Metro 为什么没有 code-splitting**。

## 1. metro.config.js 的三段定制地图

```js
const { getDefaultConfig, mergeConfig } = require('react-native/metro.config');

const config = {
  resolver: {
    /* 模块怎么被"找到" */
  },
  transformer: {
    /* 源码怎么被"改写" */
  },
  serializer: {
    /* 模块怎么被"组织进 bundle" */
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

| 段 | 常用定制 | 典型用途 |
|----|---------|---------|
| resolver | `platforms`、`sourceExts`、`nodeModulesPaths`、`resolveRequest`（自定义解析函数） | 平台后缀、monorepo、别名、拦截特定依赖 |
| transformer | `babelTransformerPath`、`assetRegistryPath`、`assetPlugins` | 自定义 babel 预设、资产处理插件 |
| serializer | `processModuleFilter`、`createModuleIdFactory`、`getRunModuleStatements` | 挑模块、**自定义模块 id**、控制入口执行 |

> 原则：**永远从 `getDefaultConfig` 开始 merge**，不要手写整份配置——默认值里有平台后缀、流量置换（资产 registry）等大量隐含行为。

## 2. monorepo：watchFolders 与 node_modules 转链接

把 RN App 放进 monorepo（与 Web 端、共享包同仓）时，Metro 默认"只看自己目录"的世界观会被打破，两个经典配置：

```js
resolver: {
  // ① 让 Metro 能"看到"工作区根（共享包在那里被引用与监听变更）
  //（0.72+ 已默认支持 watch 根目录与 symlinks，老版本需显式 watchFolders）
  // ② 告诉 Metro 去哪里解析依赖（hoisted 的 node_modules 在根目录）
  nodeModulesPaths: [`${root}/node_modules`, `${app}/node_modules`],
},
```

配套概念：

- **symlink 解析**：workspace 里的包是软链，`resolveSymlinks` 决定 Metro 把它当"真实路径"还是"链接路径"——影响的是**模块去重**（同一包若被解析成两个路径，会进 bundle 两次，单例状态失效）；
- **package exports**：现代 npm 包的 `exports` 字段默认不被 Metro 理解（历史原因），需要时显式开启——"明明装了包却 cannot resolve"的常见来源；
- 排查工具：`npx react-native config` 输出 Metro 视角下的依赖图，monorepo 问题先看它。

## 3. serializer：模块 id 与多 bundle

01 篇讲过 `__d(id, factory)` 的封装——**id 从哪来**就是 `createModuleIdFactory` 决定的：

```js
serializer: {
  // 单包默认：自增数字
  createModuleIdFactory: () => (path) => numberId(path),
  // 多包（模块二 03）必须改成"路径哈希"，保证同一个模块在所有包里 id 一致：
  createModuleIdFactory: () => (path) => stablePathId(path),
},
```

多 bundle 场景的三件套：

1. `createModuleIdFactory`：路径稳定 id（防跨包冲突）；
2. `processModuleFilter`：公共包构建时排除业务模块 / 业务包排除公共模块（防重复进包）；
3. 构建顺序与加载顺序：公共包先执行，业务包 `__r` 才找得到依赖（模块二 03）。

## 4. 为什么 Metro 没有 code-splitting

Web 打包器的 `import()` = **异步加载一个 chunk**（网络请求 + 时机可控）。RN 里这个语义不成立，原因有三层：

1. **require 是同步契约**：JS 代码假设"require 返回即得模块"（模块三 04 的同步边界）。没有"异步 require"，就没有天然的分割点；
2. **单 JS 环境**：一个 Hermes 引擎、一个全局模块表，`__d/__r` 都在同一个闭包世界里——chunk 的"隔离单元"不存在；
3. **加载通道受控**：Web 的 chunk 可以运行时 HTTP 拉；RN 的文件要么打进包、要么走热更新系统整体替换（模块八 02），没有"运行时按需拉一段 JS 插进模块表"的通道。

替代方案谱系（共同思想：**把"分割"从运行时挪到工程时**）：

| 方案 | 机制 | 落点 |
|------|------|------|
| inline requires | require 延迟到使用处（执行懒，不分割文件） | babel 配置 |
| RAM bundle | 文件内按偏移懒解析 | 模块二 03 |
| multi-bundle | 工程期拆多个包，按需加载执行 | 本篇 + 模块二 03 |

## 5. 与 Web 打包器的心智对照

| | Metro | Webpack/Vite |
|--|-------|--------------|
| 目标环境 | 单 JS 引擎（Hermes/JSC），require 同步 | 浏览器，ESM/import() 异步 |
| 分包 | 无运行时 chunk，工程期多包 | 运行时 code-splitting 一等公民 |
| HMR | 模块级替换 + Fast Refresh（模块十 04） | 模块级替换 + 框架 HMR |
| 解析 | 平台后缀（.native/.ios）、导出字段保守 | exports/条件导出全面支持 |
| 定制哲学 | 默认保守，显式开启新行为 | 一切可配，生态插件 |

**迁移经验**：从 Web 工程转 RN，最容易踩的不是配置而是**心智**——"按需加载"在 RN 里是工程期决策（拆包/懒执行），不是运行时语法。

## 小结

- Metro 三段各管一段：resolver 找模块（monorepo/平台/别名）、transformer 改源码（babel/资产）、serializer 组织包（模块 id/过滤/入口）；
- monorepo 的核心是 watch 范围 + node_modules 路径 + symlink 解析的一致性，排查靠 `react-native config`；
- 无 code-splitting 是**同步 require + 单引擎 + 无运行时拉取通道**的结构性结果，替代方案全是"工程期分割 + 执行期懒"；
- 定制从 getDefaultConfig merge 起步，默认值里藏着大量隐含行为，覆写前先读。
