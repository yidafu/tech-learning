/**
 * 大纲章节：阶段 4 工程化
 * 主题：ESM 导入 CJS——default = module.exports、命名导入（cjs-module-lexer 探测）、值拷贝快照、只读绑定
 * 运行：node exercises/esm-cjs/esm-interop.mjs
 * 预期输出：
 *   [1] default 导入拿到的就是 module.exports： ["add","mul","version","getCallCount","upgrade"]
 *   [2] 命名导入 add(2, 3) = 5
 *   [2] 命名导入 mul(4, 5) = 20
 *   [3] getCallCount() = 2
 *   [4] cjsLib.version（对象属性，同一引用，永远最新） = 2.0.0
 *   [4] 局部快照 versionSnapshot（读值那一刻的拷贝） = 1.0.0
 *   [4] 命名导入 version（lexer 建立的是「值的快照」） = 1.0.0
 *   [4] default.version（= module.exports.version） = 2.0.0
 *   [5] 给 import 绑定赋值 -> TypeError: Assignment to constant variable.
 */

// 同一个 CJS 模块既可以 default 导入，也可以命名导入（Node 对 CJS 做了特殊翻译）
import cjsLib from './math-lib.cjs';
import { add, mul, version, getCallCount } from './math-lib.cjs';

// [1] default 导入拿到的不是拷贝，而是 module.exports 对象本身
console.log('[1] default 导入拿到的就是 module.exports：', JSON.stringify(Object.keys(cjsLib)));

// [2] 命名导入为什么可用？Node 在加载 .cjs 时用 cjs-module-lexer 对源码做**静态分析**，
//     识别出 `module.exports = { add, mul, ... }` 这种可静态探测的属性名，
//     把它们包装成 ESM 命名导出。动态构造（如 for 循环里挂属性）是探测不到的——那时只能用 default。
console.log('[2] 命名导入 add(2, 3) =', add(2, 3));
console.log('[2] 命名导入 mul(4, 5) =', mul(4, 5));

// [3] 内部状态：getter 每次调用都返回模块内部最新值（require 缓存保证全程是同一个模块实例）
console.log('[3] getCallCount() =', getCallCount());

// [4] 「值拷贝快照」三连对照（核心实验）：
//     - 对象属性访问（cjsLib.version / default.version）：走的是同一个对象引用 → 活的
//     - 局部变量（versionSnapshot）：读值那一刻就拷贝走了 → 快照，之后永不变
//     - CJS 命名导入（version）：lexer 翻译时建立的也是**值的快照**，不是 ESM 那种 live binding
//       ——这正是「CJS 导出的是值的拷贝，ESM 导出的是绑定」在互操作场景下的具体表现。
const versionSnapshot = cjsLib.version; // 此刻读到 '1.0.0'，拷贝进局部变量
cjsLib.upgrade();                        // 模块内部改写 module.exports.version = '2.0.0'
console.log('[4] cjsLib.version（对象属性，同一引用，永远最新） =', cjsLib.version);
console.log('[4] 局部快照 versionSnapshot（读值那一刻的拷贝） =', versionSnapshot);
console.log('[4] 命名导入 version（lexer 建立的是「值的快照」） =', version);
console.log('[4] default.version（= module.exports.version） =', cjsLib.version);

// [5] import 建立的绑定是只读的（无论来源是 ESM 还是 CJS）：
//     规范把它实现成不可写的 indirect binding，赋值在严格模式（ESM 默认严格）下抛 TypeError
try {
  // 故意写错，验证只读语义
  version = '3.0.0';
} catch (err) {
  console.log('[5] 给 import 绑定赋值 ->', `${err.name}: ${err.message}`);
}
