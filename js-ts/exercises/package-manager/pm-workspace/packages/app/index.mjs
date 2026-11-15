import { addClamped } from 'math-lib';

// 声明的依赖只有 math-lib。
// 下面这个动态 import 是「幽灵依赖」实验：直接引用传递依赖 shared-utils——
// npm 提升布局下通常能解析成功（node_modules 扁平化）；
// pnpm 严格布局下 app 的 node_modules 里根本没有它 → ERR_MODULE_NOT_FOUND（见 02-verify-monorepo.mjs 输出）。
let ghost = '（未执行）';
try {
  await import('shared-utils');
  ghost = '解析成功（提升布局的幽灵依赖）';
} catch (err) {
  ghost = `解析失败：${err.code ?? err.message}`;
}

export function run() {
  return [
    `[app] addClamped(2, 3, 4) = ${addClamped(2, 3, 4)}`,
    `[app] 幽灵依赖 shared-utils：${ghost}`,
  ].join('\n');
}
