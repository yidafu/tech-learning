/**
 * 大纲章节：阶段 4 工程化
 * 主题：ESM live binding 的源模块——导出 let 变量 + 修改它的函数
 * 运行：node exercises/esm-cjs/live-binding.mjs（本文件是被导入的库，直接 node 运行无输出）
 * 预期输出：（无输出——仅声明导出，供 live-binding.mjs / dynamic-import.mjs 导入）
 */

// 关键点：export 导出的不是「count 现在的值」，而是「count 这个变量绑定」。
// 模块内 count 变了，导入方读到的就是新值（live binding）。
// 对比 CJS（math-lib.cjs）：内部 let callCount 变了，导入方只能靠 getter 重新问。
export let count = 0;

export function increment() {
  count += 1;
}
