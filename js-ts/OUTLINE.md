# JS/TS 深度学习大纲

面向中级前端工程师，目标是从「会用」进阶到「深度理解」。每个主题按 **关键概念 → 可运行示例 → 输出预测题** 三步学习。

## 阶段 0：环境准备（0.5 天）

- Node ≥ 18、`npx tsx` 直接运行 TS 文件
- VS Code + TypeScript 语言服务；`tsconfig.json` 全程 `strict: true`
- 建立自测清单：列出自己「以为懂但讲不清」的知识点，作为优先级依据

## 阶段 1：JavaScript 核心机制（3–4 周）

1. **类型系统与类型转换**
   - 7 种原始类型、包装对象（boxing）、`typeof`/`instanceof` 的坑
   - 显式/隐式转换、`ToPrimitive`、`==` vs `===`、`Object.is`
   - `Symbol`（内置 Symbol、well-known symbols）
2. **作用域与闭包**
   - 词法作用域、作用域链、变量提升与 TDZ
   - 闭包原理与内存影响、IIFE、模块模式
3. **this 与原型链**
   - `this` 绑定四规则、箭头函数、`call/apply/bind`
   - 原型链查找、`prototype`/`__proto__`、class 本质（语法糖）、继承方式对比
   - 深化补充（`notes/stage-1-js-core/29-prototype-chain-supplement.md`）：谱系速查、槽位规则、`instanceof` 内部、键序三段规则、原型污染攻防
4. **异步编程**
   - 事件循环：宏任务/微任务执行顺序
   - Promise 内部状态机、错误传播、`Promise.all/race/allSettled/any`
   - `async/await` 本质（生成器 + Promise）、`AbortController` 取消
   - 深化补充（`notes/stage-1-js-core/31-async-supplement.md`）：Node 事件循环（libuv 六阶段、nextTick vs 微任务「交替见底」、**ESM/CJS 顶层次序翻转**、setImmediate vs setTimeout、饥饿对照）、工程三件套手写（`limit`/`withTimeout`/`retry`）、异步资源管理（`Promise.withResolvers`、`await using`/`Symbol.asyncDispose`、top-level await 对模块图的阻塞）
5. **ES2015+ 关键特性**
   - 解构、剩余/展开、可选链、空值合并
   - 迭代器与生成器（`yield*`、异步迭代 `for await...of`）
   - Proxy/Reflect（实现响应式数据的核心原理）
6. **内存管理**
   - V8 垃圾回收（分代、标记清除）、常见泄漏场景
   - `WeakMap`/`WeakSet`/`WeakRef`/`FinalizationRegistry`

**里程碑**：手写 `Promise`（符合 Promises/A+）、`bind`、`new`、深拷贝、EventEmitter。

## 阶段 2：引擎与运行时（1–2 周）

- V8 执行流程：解析 → 解释执行（Ignition）→ 热点编译（TurboFan）（编译器全景视角见阶段 5「编译原理视角」专题）
- 隐藏类（hidden classes）与内联缓存对性能的影响
- 浏览器渲染管线与事件循环的关系（rAF、rIC、任务切片）
- 性能专题：防抖/节流、懒加载、Web Workers、长任务分析

## 阶段 3：TypeScript 类型系统（3–4 周）

1. **基础与类型收窄**：窄化、类型守卫（`is`/`in`/`typeof`）、断言、可辨识联合
2. **泛型深入**：泛型约束、默认值、泛型类与函数
3. **类型编程**（核心重点）
   - 映射类型（`keyof`、`in`、`as` 重映射、修饰符 `readonly?`）
   - 条件类型与 `infer`、分布式条件类型
   - 模板字面量类型
4. **内置工具类型源码级理解**：`Partial`、`Pick`、`Omit`、`Record`、`ReturnType`、`Parameters` 等，并手写实现
5. **类型系统理论**：结构类型、协变/逆变、`never`/`unknown` 的角色
6. **声明文件与模块解析**：`.d.ts` 编写、`moduleResolution`（node10 vs bundler）、`declare`/`declare module`
7. **tsconfig 关键项**：`strictNullChecks`、`noUncheckedIndexedAccess`、`isolatedModules` 等

**里程碑**：完成 10–15 道类型体操（如 `DeepReadonly`、`TupleToUnion`、`Curry`），能手写常用工具类型。

## 阶段 4：工程化（2 周）

- 模块化：ESM 与 CJS 差异、interop、`import()` 动态导入
- 构建工具：Vite/esbuild/SWC 原理浅析，为什么快
- 测试：Vitest 基础（describe/it/expect、mock）
- 代码质量：ESLint + Prettier 配置要点
- 包管理：npm/pnpm、workspace（monorepo）基础

## 阶段 5：专题深入（按需）

- 函数式编程（纯函数、组合、柯里化在 TS 中的表达）
- 常见设计模式的 TS 实现
- 源码阅读：一个响应式库（如 Vue reactivity 或 signal 实现）
- **编译原理视角看 JS/TS**：编译器经典五阶段对照 JS 引擎（token → AST → 字节码 → JIT）；ECMA-262 的 early errors 与 hoisting/TDZ 的静态语义；TS 编译器五阶段（scanner → parser → binder → checker → emitter）与类型擦除；类型检查即静态分析（narrowing = 控制流敏感分析、类型体操 = 类型层求值）；Babel/esbuild/ESLint 作为编译器前端
- **特异行为按编译阶段归位**（`notes/stage-5-topics/27-weird-behaviors-by-stage.md`）：延续笔记 26 的五阶段管道，把每个「怪现象」定位到具体编译环节（early errors / hoisting / TDZ / 运行时语义）
- **JS 特性的底层实现 vs 主流语言**（`notes/stage-5-topics/30-internals-vs-mainstream.md`）：三段式对比（JS 怎么实现 → 主流语言怎么实现 → 差异根源）——tagged word 与位运算/2^53、闭包实现结构（`[[Environment]]`）与各语言捕获策略、原型派发 vs vtable；一手依据 ECMA-262 + v8.dev + JLS
- **JS/TS 发展史**（`notes/stage-5-topics/28-js-ts-history.md`）：不背年表，做「决策考古」——每个现存怪行为对应当年的具体约束（Annex B、`typeof null`、0 基月份）；计算机本身的变化（单核→频率墙→多核、IEEE 754、内存墙、Spectre）如何一路约束语言；语言趋势坐标（GC 主流化、动态→静态钟摆/渐进类型、JIT→AOT 复兴、Dart 反例）；TC39 stage 0–4 流程；TS 三大设计决策（可擦除/结构化/渐进）与版本 × 类型能力对照表；版本事实一律回一手来源（ECMA-262 版次、tc39/proposals、TS release notes）核对
- 面试高频输出预测题集

---

## 学习约定

- 每主题产出：笔记（`notes/`）+ 可运行练习（`exercises/<topic>/`）
- 每周回顾：重做输出预测题，直到能闭卷解释
- 遇到「背结论」的知识点，回到规范（ECMA-262 / TS Handbook）找一手依据
