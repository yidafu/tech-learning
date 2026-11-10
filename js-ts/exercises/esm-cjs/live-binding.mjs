/**
 * 大纲章节：阶段 4 工程化
 * 主题：ESM live binding——导入方不重新导入，也能读到导出变量的最新值；import 绑定只读
 * 运行：node exercises/esm-cjs/live-binding.mjs
 * 预期输出：
 *   [1] count 初始 = 0
 *   [2] increment() 两次后 count = 2
 *   [3] ns.count（动态 import 同一实例） = 2
 *   [4] 给 import 绑定赋值 -> TypeError: Assignment to constant variable.
 *   [4] 给命名空间属性赋值 -> TypeError: Cannot assign to read only property 'count' of object '[object Module]'
 *   [5] 对照 CJS：命名导入 version = 1.0.0 （快照不变），对象属性 = 2.0.0
 */
import { count, increment } from './counter.mjs';

// [1] live binding 的起点：读到的是导出变量的当前值
console.log('[1] count 初始 =', count);

// [2] 核心证据：increment 修改的是 counter.mjs 模块作用域里的 count 变量，
//     本文件没有重新 import，但 count 读到的就是新值。
//     机制：export let count 建立的是「变量绑定」；import 侧拿到的是这个绑定的只读视图，
//     每次读取都间接（indirect）取到变量当前的值。对比 CJS 的 esm-interop.mjs [4]：
//     CJS 命名导入在翻译时取的是「值快照」，模块内部变了也不会同步。
increment();
increment();
console.log('[2] increment() 两次后 count =', count);

// [3] 动态 import() 同一模块：ESM 模块是单例，拿到的还是同一个实例，属性同样是 live 视图
const ns = await import('./counter.mjs');
console.log('[3] ns.count（动态 import 同一实例） =', ns.count);

// [4] 只读性验证：绑定像 const——写入抛 TypeError（ESM 模块默认严格模式）
try {
  // 故意写错，验证只读语义
  count = 999;
} catch (err) {
  console.log('[4] 给 import 绑定赋值 ->', `${err.name}: ${err.message}`);
}
try {
  // 命名空间对象（Module Namespace Object）的属性也是只读的（且不可配置）
  ns.count = 999;
} catch (err) {
  console.log('[4] 给命名空间属性赋值 ->', `${err.name}: ${err.message}`);
}

// [5] 对照 CJS 侧「值不变」：复述 math-lib 的快照行为。
//     CJS 的 version 被模块内部 upgrade() 改写后：
//     - 命名导入 version：翻译时建立的快照，仍是 1.0.0（不变）
//     - 对象属性 mathLib.version：同一个 module.exports 对象，读到 2.0.0
const { default: mathLib, version } = await import('./math-lib.cjs');
mathLib.upgrade();
console.log('[5] 对照 CJS：命名导入 version =', version, '（快照不变），对象属性 =', mathLib.version);
