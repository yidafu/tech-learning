/**
 * 大纲章节：阶段 4 工程化
 * 主题：import() 动态导入——Module Namespace 对象、条件加载 CJS、代码分割入口
 * 运行：node exercises/esm-cjs/dynamic-import.mjs
 * 预期输出：
 *   [1] 静态导入侧 count = 1
 *   [2] ns keys = ["count","increment"]
 *   [2] ns.count = 1
 *   [2] increment 后 ns.count = 2
 *   [3] 条件成立，动态加载 math-lib.cjs
 *   [3] math ns keys = ["add","default","getCallCount","module.exports","mul","upgrade","version"]
 *   [3] default.add(10, 5) = 15
 *   [3] 命名空间属性 add(2, 3) = 5
 *   [4] import() 是构建器的「代码分割信号」：本例中 math-lib 只有条件命中才会被加载
 */
import { count, increment } from './counter.mjs';

increment(); // count: 0 -> 1

// [1] 静态导入侧先读一次（live binding）
console.log('[1] 静态导入侧 count =', count);

// [2] import() 返回 Promise，兑现值是 Module Namespace Object（模块命名空间对象）。
//     与静态 import 同一模块 → 同一实例（ESM 模块单例，无重复执行）。
const ns = await import('./counter.mjs');
// 键顺序确定性：规范要求命名空间对象的键按「名字字符串排序」返回（不是源码里的导出顺序）。
// counter.mjs 的导出顺序恰好是 count, increment，这里排序后不变；若导出顺序相反，键仍会是 count 在前。
console.log('[2] ns keys =', JSON.stringify(Object.keys(ns)));
console.log('[2] ns.count =', ns.count);
increment();
console.log('[2] increment 后 ns.count =', ns.count); // 命名空间属性也是 live 视图

// [3] 条件动态导入 CJS：import() 是表达式，可以出现在 if / 事件回调 / 路由懒加载里。
//     这也是它在 CJS 文件里唯一可用的「ESM 语法」（CJS 里不能写静态 import，但能 await import()）。
const needMath = true;
if (needMath) {
  console.log('[3] 条件成立，动态加载 math-lib.cjs');
  const mathNs = await import('./math-lib.cjs');
  // CJS 命名空间的键 = lexer 探测到的命名导出 + default + module.exports（按名字排序）
  console.log('[3] math ns keys =', JSON.stringify(Object.keys(mathNs)));
  console.log('[3] default.add(10, 5) =', mathNs.default.add(10, 5));
  console.log('[3] 命名空间属性 add(2, 3) =', mathNs.add(2, 3));
} else {
  // 分支不执行时，math-lib.cjs 完全不会被加载——这是运行时层面真正的「按需」
  console.log('[3] 条件不成立，math-lib.cjs 不会加载');
}

// [4] 代码分割的意义（构建期视角）：
//     - 静态 import 构成「模块图」，打包器（Rollup/Vite/webpack）会把它们合进引用方的 chunk；
//     - import() 是显式的异步边界，打包器会把它引用的模块切成**独立的异步 chunk**，
//       首屏不下载，首次执行到 import() 时才发起请求（典型应用：路由级懒加载）。
console.log('[4] import() 是构建器的「代码分割信号」：本例中 math-lib 只有条件命中才会被加载');
