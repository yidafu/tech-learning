/**
 * 大纲章节：阶段 4 构建工具——转译器 vs 类型检查器的分工（笔记 17 §5/§7，另见笔记 19 可运行示例）
 * 主题：同一份「类型错了但运行时合法」的代码——
 *       ① transpileModule（tsx/esbuild 的角色位）：剥掉类型直接跑，成功；
 *       ② createProgram + getPreEmitDiagnostics（tsc 的角色位）：TS2322 当场抓获；
 *       ③ 两者的耗时差两个数量级 → dev/HMR 用转译器保速度，CI 用检查器保正确
 * 运行：node exercises/build-tools/02-transpile-vs-typecheck.mjs
 * 预期输出：
 *   ── ① 转译器（transpileModule）：剥类型、不看语义 ──
 *   function pad(s) {
 *       return 'v' + s;
 *   }
 *   const n = pad(1);
 *   console.log('[转译后运行] n =', n);
 *   [运行结果] 转译产物照样能跑（跑通 ≠ 类型对）：
 *   [转译后运行] n = v1
 *   ── ② 检查器（createProgram + checker）：同一行当场抓获 ──
 *     诊断数 = 1
 *     TS2322 @L4  Type 'string' is not assignable to type 'number'.
 *   ── ③ 分工的物证 ──
 *   [计时] 转译 30.2ms vs 检查 1055.1ms（差约 35 倍）   ← 数值每次不同，不参与逐行比对
 *   → dev/HMR 走转译器保交互速度，tsc --noEmit 进 CI 保正确性（笔记 17 §7/§8）
 */

import ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

// 小白鼠：第 5 行类型错误（string 赋给 number），但运行时毫无问题（'v1' 就是字符串）
const SRC = [
  'function pad(s: number): string {',
  "  return 'v' + s;",
  '}',
  "const n: number = pad(1);",
  "console.log('[转译后运行] n =', n);",
].join('\n');

// ────────────────────────────────────────────────────────────
// ① 转译器视角（transpileModule ≈ tsx/esbuild 干的事）：
//    单文件、不建程序、不看别的文件——类型标注直接丢弃
// ────────────────────────────────────────────────────────────
const t0 = performance.now();
const transpiled = ts.transpileModule(SRC, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tTranspile = performance.now() - t0;

console.log('── ① 转译器（transpileModule）：剥类型、不看语义 ──');
console.log(transpiled.trimEnd());
console.log('[运行结果] 转译产物照样能跑（跑通 ≠ 类型对）：');
new Function(transpiled)();

// ────────────────────────────────────────────────────────────
// ② 检查器视角（createProgram ≈ tsc --noEmit 干的事）：
//    建 Program、跑 binder + checker 的完整流程
// ────────────────────────────────────────────────────────────
const t1 = performance.now();
const dir = mkdtempSync(join(tmpdir(), 'tsc-role-'));
const file = join(dir, 'broken.ts');
writeFileSync(file, SRC);
const program = ts.createProgram([file], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts'],
  noEmit: true,
  strict: true,
});
const diags = ts
  .getPreEmitDiagnostics(program)
  .filter((d) => d.file?.fileName === file)
  .map((d) => {
    const { line } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
    return `TS${d.code} @L${line + 1}  ${msg.split('\n')[0]}`;
  });
const tCheck = performance.now() - t1;
rmSync(dir, { recursive: true, force: true });

console.log('── ② 检查器（createProgram + checker）：同一行当场抓获 ──');
console.log(`  诊断数 = ${diags.length}`);
for (const d of diags) console.log(`  ${d}`);

// ────────────────────────────────────────────────────────────
// ③ 耗时对照：转译是毫秒级，检查要建 Program（解析 + 绑定 + 全量检查）
// ────────────────────────────────────────────────────────────
console.log('── ③ 分工的物证 ──');
console.log(`[计时] 转译 ${tTranspile.toFixed(1)}ms vs 检查 ${tCheck.toFixed(1)}ms（差约 ${(tCheck / tTranspile).toFixed(0)} 倍）`);
console.log('→ dev/HMR 走转译器保交互速度，tsc --noEmit 进 CI 保正确性（笔记 17 §7/§8）');
