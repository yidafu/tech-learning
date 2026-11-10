'use strict';
/**
 * 大纲章节：阶段 4 工程化
 * 主题：CJS 小库——module.exports、内部状态 getter（演示「值拷贝快照」与 require 缓存下的模块单例）
 * 运行：node exercises/esm-cjs/math-lib.cjs（直接运行会执行底部的 require.main 自测段）
 * 预期输出：
 *   add(2, 3) = 5
 *   mul(2, 3) = 6
 *   getCallCount() = 2
 *   version = 1.0.0
 */

// —— 内部状态：调用计数。注意它没有被「导出变量本身」，外部只能通过 getter 读 ——
// CJS 的导出本质上只是 module.exports 这个对象的属性；
// 内部 let 变量和导出对象之间没有任何「绑定」关系。
let callCount = 0;

function add(a, b) {
  callCount += 1;
  return a + b;
}

function mul(a, b) {
  callCount += 1;
  return a * b;
}

// getter：任何时刻调用都返回模块内部的最新值（这是 CJS 里拿到「实时状态」的唯一途径）
function getCallCount() {
  return callCount;
}

const version = '1.0.0';

// 演示用：模块自己改写导出属性。
// 用于观察：(a) 通过对象属性访问永远拿到最新值；(b) 解构出来的原始值是旧快照。
function upgrade() {
  module.exports.version = '2.0.0';
}

module.exports = { add, mul, version, getCallCount, upgrade };

// CJS 惯用法：require.main === module 说明本文件是「被直接运行」而非被 require。
// （ESM 里没有这个惯例，需要用 import.meta.url 与 process.argv[1] 比较。）
if (require.main === module) {
  console.log(`add(2, 3) = ${add(2, 3)}`);
  console.log(`mul(2, 3) = ${mul(2, 3)}`);
  console.log(`getCallCount() = ${getCallCount()}`);
  console.log(`version = ${version}`);
}
