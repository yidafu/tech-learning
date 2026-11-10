/**
 * 大纲章节：阶段 3.7 tsconfig 关键项——isolatedModules / verbatimModuleSyntax（笔记 15 §3–§5）
 * 主题：为什么单文件转译器（esbuild/tsx/babel）需要这些约束——它们没有跨文件信息，
 *       「这名字是类型还是值」必须由语法自己说清（export type / import type / 显式扩展名）。
 *       实验一（诊断对照）+ 实验二（transpileModule 直接看两种模式下的输出差异）
 * 运行：npx tsx exercises/tsconfig/03-isolated-modules-verbatim.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/tsconfig/03-isolated-modules-verbatim.ts
 * 预期输出：
 *   ── A1 默认：整程序视角，tsc 自己知道 UserType 是类型 ──
 *     诊断数 = 0
 *   ── A2 +isolatedModules：语法必须自证 ──
 *     诊断数 = 1
 *     TS1205 @L1  Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.
 *   ── B1 默认：tsc 替你擦掉只用做类型的导入 ──
 *     诊断数 = 0
 *   ── B2 +verbatimModuleSyntax：写的是什么就输出什么 ──
 *     诊断数 = 1
 *     TS1484 @L1  'UserType' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
 *   ── C1 bundler 解析：无扩展名照常 ──
 *     诊断数 = 0
 *   ── C2 module/moduleResolution nodenext：对齐 Node 真实解析 ──
 *     诊断数 = 1
 *     TS2835 @L1  Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './util.js'?
 *   ── 转译输出对照（transpileModule = tsx/esbuild 的角色）──
 *   [默认]      tsc 推断 UserType 只用作类型 → 擦掉 import：
 *   export const u = { id: 'a' };
 *   export default u;
 *   [verbatim 开] 语法即输出，import 原样保留（types.ts 若没有同名值导出，运行时立刻崩）：
 *   import { UserType } from './types';
 *   export const u = { id: 'a' };
 *   export default u;
 */

import * as ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────────────────────────────────────────
// 实验台（多文件版）：一个临时目录里放若干文件，编译入口，收集诊断
// ────────────────────────────────────────────────────────────
function diagnoseFiles(files: Record<string, string>, entry: string, extra: ts.CompilerOptions): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'tsconfig-lab-'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts'],
    noEmit: true,
    ...extra,
  };
  const program = ts.createProgram([join(dir, entry)], options);
  const entryAbs = join(dir, entry);
  const diags = ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === entryAbs);
  rmSync(dir, { recursive: true, force: true });
  return diags.map((d) => {
    const file = d.file!;
    const { line } = file.getLineAndCharacterOfPosition(d.start ?? 0);
    const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
    return `TS${d.code} @L${line + 1}  ${msg.split('\n')[0]}`;
  });
}

function round(title: string, results: string[]): void {
  console.log(`── ${title} ──`);
  console.log(`  诊断数 = ${results.length}`);
  for (const r of results) console.log(`  ${r}`);
}

// 实验 A：再导出类型——整程序视角下 tsc 能查到 ./types 再决定擦不擦；
// 单文件转译器没这个视角，所以 isolatedModules 直接要求语法自证（export type）
const FILES_A: Record<string, string> = {
  'types.ts': "export type UserType = { id: string };\n",
  'main.ts': "export { UserType } from './types';\n",
};
round('A1 默认：整程序视角，tsc 自己知道 UserType 是类型', diagnoseFiles(FILES_A, 'main.ts', {}));
round('A2 +isolatedModules：语法必须自证', diagnoseFiles(FILES_A, 'main.ts', { isolatedModules: true }));

// 实验 B：仅类型使用的导入——verbatimModuleSyntax（TS 5.0）下必须 import type
const FILES_B: Record<string, string> = {
  'types.ts': "export type UserType = { id: string };\n",
  'main.ts': "import { UserType } from './types';\nexport const u: UserType = { id: 'a' };\nexport default u;\n",
};
round('B1 默认：tsc 替你擦掉只用做类型的导入', diagnoseFiles(FILES_B, 'main.ts', {}));
round('B2 +verbatimModuleSyntax：写的是什么就输出什么', diagnoseFiles(FILES_B, 'main.ts', { verbatimModuleSyntax: true }));

// 实验 C：nodenext 下相对导入必须带扩展名（要 ESM 解释需 package.json type:module）
const FILES_C: Record<string, string> = {
  'package.json': '{"type":"module"}',
  'util.ts': "export function helper() { return 1; }\n",
  'main.ts': "import { helper } from './util';\nexport const v = helper();\n",
};
round('C1 bundler 解析：无扩展名照常', diagnoseFiles(FILES_C, 'main.ts', {}));
round('C2 module/moduleResolution nodenext：对齐 Node 真实解析', diagnoseFiles(FILES_C, 'main.ts', { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }));

// ────────────────────────────────────────────────────────────
// 实验二：transpileModule —— 站在 esbuild/tsx 的位置看输出
// 单文件转译器只能依据「本文件语法」决定擦除；verbatim 让语法与输出一一对应
// ────────────────────────────────────────────────────────────
const SRC = "import { UserType } from './types';\nexport const u: UserType = { id: 'a' };\nexport default u;\n";
const base = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } as const;
const outOld = ts.transpileModule(SRC, { compilerOptions: { ...base } }).outputText;
const outVerbatim = ts.transpileModule(SRC, { compilerOptions: { ...base, verbatimModuleSyntax: true } }).outputText;

console.log('── 转译输出对照（transpileModule = tsx/esbuild 的角色）──');
console.log('[默认]      tsc 推断 UserType 只用作类型 → 擦掉 import：');
console.log(outOld.trimEnd());
console.log('[verbatim 开] 语法即输出，import 原样保留（types.ts 若没有同名值导出，运行时立刻崩）：');
console.log(outVerbatim.trimEnd());
