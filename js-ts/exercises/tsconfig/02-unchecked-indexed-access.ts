/**
 * 大纲章节：阶段 3.7 tsconfig 关键项——strict 之外的严格项（笔记 15 §2）
 * 主题：noUncheckedIndexedAccess（索引访问补 undefined）与 exactOptionalPropertyTypes（? 与 |undefined 分家）；
 *       对照组：.at() 自带 T|undefined —— 开关无关、永远报，说明 NuIA 的意义是让 arr[0] 与 .at(0) 口径一致
 * 运行：npx tsx exercises/tsconfig/02-unchecked-indexed-access.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/tsconfig/02-unchecked-indexed-access.ts
 * 预期输出：
 *   ── 轮次 1：--strict（NuIA 未开：arr[0] 撒谎说是 number） ──
 *     诊断数 = 1
 *     TS2322 @L6  Type 'number | undefined' is not assignable to type 'number'.
 *   ── 轮次 2：--strict + --noUncheckedIndexedAccess ──
 *     诊断数 = 3
 *     TS2322 @L2  Type 'number | undefined' is not assignable to type 'number'.
 *     TS2322 @L5  Type 'number | undefined' is not assignable to type 'number'.
 *     TS2322 @L6  Type 'number | undefined' is not assignable to type 'number'.
 *   ── 轮次 3：--strict + --exactOptionalPropertyTypes ──
 *     诊断数 = 2
 *     TS2322 @L6  Type 'number | undefined' is not assignable to type 'number'.
 *     TS2375 @L8  Type '{ opt: undefined; }' is not assignable to type 'Opts' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
 */

import * as ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────────────────────────────────────────
// 小白鼠：数组/Record 的索引访问 + 可选属性写入
// ────────────────────────────────────────────────────────────
const FIXTURE = [
  "const arr = [1, 2, 3];",                       // 1
  "const a: number = arr[0];",                    // 2  ← NuIA：arr[0] 从 number 变 number | undefined
  "const b: number | undefined = arr[0];",        // 3  ← NuIA 下 OK（显式接住 undefined）
  "const dict: Record<string, number> = {};",     // 4
  "const c: number = dict['k'];",                 // 5  ← NuIA：字符串索引访问同样补 undefined
  "const d: number = arr.at(0);",                 // 6  ← 对照组：.at() 签名自带 T|undefined，开关无关永远报
  "type Opts = { opt?: number };",                // 7
  "const o1: Opts = { opt: undefined };",         // 8  ← eOPT：`?` 不再包含「显式传 undefined」
  "const o2: Opts = {};",                         // 9  ← 两种模式都 OK（真·省略）
].join('\n');

// 与 01 相同的对照实验台：写临时文件 → 按 CompilerOptions 编译 → 收集诊断
function diagnose(name: string, source: string, extra: ts.CompilerOptions): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'tsconfig-lab-'));
  const file = join(dir, name);
  writeFileSync(file, source);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts'],
    noEmit: true,
    ...extra,
  };
  const program = ts.createProgram([file], options);
  const diags = ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === file);
  rmSync(dir, { recursive: true, force: true });
  return diags.map((d) => {
    const file2 = d.file!;
    const { line } = file2.getLineAndCharacterOfPosition(d.start ?? 0);
    const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
    return `TS${d.code} @L${line + 1}  ${msg.split('\n')[0]}`;
  });
}

function round(title: string, results: string[]): void {
  console.log(`── ${title} ──`);
  console.log(`  诊断数 = ${results.length}`);
  for (const r of results) console.log(`  ${r}`);
}

round('轮次 1：--strict（NuIA 未开：arr[0] 撒谎说是 number）', diagnose('index.ts', FIXTURE, { strict: true }));
round('轮次 2：--strict + --noUncheckedIndexedAccess', diagnose('index.ts', FIXTURE, { strict: true, noUncheckedIndexedAccess: true }));
round('轮次 3：--strict + --exactOptionalPropertyTypes', diagnose('index.ts', FIXTURE, { strict: true, exactOptionalPropertyTypes: true }));
