/**
 * 大纲章节：阶段 4 包管理与 monorepo——workspace 包互通 + pnpm 严格布局（笔记 20 §3/§4）
 * 主题：迷你 pnpm monorepo（mini-workspace/，纯本地链接、离线可复现）的四个证据：
 *       ① workspace 协议把包间依赖变成 symlink ② 跨包调用真实跑通
 *       ③ 幽灵依赖在 pnpm 严格布局下解析失败（npm 提升布局下会「成功」——这正是坑）
 *       ④ lockfile importers 段记录 link: 关系（可复现安装）
 * 准备：cd exercises/package-manager/mini-workspace && pnpm install（仅首次；纯本地链接，无需网络）
 * 运行：node exercises/package-manager/02-verify-monorepo.mjs
 * 预期输出：
 *   ── [1] workspace 链接证据（pnpm：声明了什么，node_modules 里才有什么）──
 *     packages/app/node_modules/@mini/math-lib         → ../../../math-lib
 *     packages/math-lib/node_modules/@mini/shared-utils → ../../../shared-utils
 *   ── [2] 跨包调用（app → math-lib → shared-utils，走的就是上面两条链接）──
 *   [app] addClamped(2, 3, 4) = 4
 *   [app] 幽灵依赖 @mini/shared-utils：解析失败：ERR_MODULE_NOT_FOUND
 *   ── [3] Node 解析器视角 ──
 *     声明的 @mini/math-lib 解析到：exercises/package-manager/mini-workspace/packages/math-lib/index.mjs（Node 默认解开 symlink，直达源码包本体）
 *     未声明的 @mini/shared-utils：MODULE_NOT_FOUND（CJS 解析器错误码；[2] 里 ESM 动态导入报 ERR_MODULE_NOT_FOUND——两套解析器码不同）
 *     → pnpm 严格布局拦截幽灵依赖；npm 扁平提升布局下这里会“成功”——坑就埋在这（笔记 20 §3/题 2）
 *   ── [4] lockfile 的 importers 段（可复现安装的证据：specifier → link）──
 *   importers:
 *     .: {}
 *     packages/app:
 *       dependencies:
 *         '@mini/math-lib':
 *           specifier: workspace:*
 *           version: link:../math-lib
 *     packages/math-lib:
 *       dependencies:
 *         '@mini/shared-utils':
 *           specifier: workspace:*
 *           version: link:../shared-utils
 *     packages/shared-utils: {}
 */

import { createRequire } from 'node:module';
import { readlinkSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative, resolve } from 'node:path';
import { run } from './mini-workspace/packages/app/index.mjs';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const rootDir = resolve(here('../../')); // 学习工作区根，用来把绝对路径缩成相对路径好读
const shorten = (p) => relative(rootDir, p);

console.log('── [1] workspace 链接证据（pnpm：声明了什么，node_modules 里才有什么）──');
console.log(`  packages/app/node_modules/@mini/math-lib         → ${readlinkSync(here('./mini-workspace/packages/app/node_modules/@mini/math-lib'))}`);
console.log(`  packages/math-lib/node_modules/@mini/shared-utils → ${readlinkSync(here('./mini-workspace/packages/math-lib/node_modules/@mini/shared-utils'))}`);

console.log('── [2] 跨包调用（app → math-lib → shared-utils，走的就是上面两条链接）──');
console.log(run());

console.log('── [3] Node 解析器视角 ──');
const appRequire = createRequire(here('./mini-workspace/packages/app/index.mjs'));
console.log(`  声明的 @mini/math-lib 解析到：${shorten(appRequire.resolve('@mini/math-lib'))}（Node 默认解开 symlink，直达源码包本体）`);
try {
  appRequire.resolve('@mini/shared-utils');
  console.log('  未声明的 @mini/shared-utils：解析成功（不该发生——pnpm 严格布局失效了？）');
} catch (err) {
  console.log(`  未声明的 @mini/shared-utils：${err.code}（CJS 解析器错误码；[2] 里 ESM 动态导入报 ERR_MODULE_NOT_FOUND——两套解析器码不同）`);
  console.log('  → pnpm 严格布局拦截幽灵依赖；npm 扁平提升布局下这里会“成功”——坑就埋在这（笔记 20 §3/题 2）');
}

console.log('── [4] lockfile 的 importers 段（可复现安装的证据：specifier → link）──');
const lock = readFileSync(here('./mini-workspace/pnpm-lock.yaml'), 'utf8');
console.log(
  lock
    .slice(lock.indexOf('importers:'))
    .split('\n')
    .filter((l) => l.trim() !== '')
    .join('\n'),
);
