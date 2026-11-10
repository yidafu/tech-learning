/**
 * 大纲章节：阶段 3.7 tsconfig 关键项——strict 家族逐项（笔记 15 §1）
 * 主题：strict 总开关 = 一次打开全家（SNC / noImplicitAny / SPI / SFT / catch unknown）；
 *       家族成员是相互独立的布尔项，可单独开关（TSConfig Reference《strict》）
 * 运行：npx tsx exercises/tsconfig/01-strict-family.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/tsconfig/01-strict-family.ts
 * 预期输出：
 *   ── 轮次 1：全关（sloppy 时代，类型只当注释用） ──
 *     诊断数 = 0
 *   ── 轮次 2：--strict（总开关 = 一次打开全家） ──
 *     诊断数 = 5
 *     TS2322 @L2  Type 'null' is not assignable to type 'number'.
 *     TS7006 @L3  Parameter 'name' implicitly has an 'any' type.
 *     TS2564 @L6  Property 'desc' has no initializer and is not definitely assigned in the constructor.
 *     TS2322 @L12  Type '(x: { name: string; age: number; }) => void' is not assignable to type 'Fn'.
 *     TS18046 @L13  'e' is of type 'unknown'.
 *   ── 轮次 3：只开 strictNullChecks（其余照旧宽松） ──
 *     诊断数 = 1
 *     TS2322 @L2  Type 'null' is not assignable to type 'number'.
 */

import * as ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────────────────────────────────────────
// 对照实验的「小白鼠」：同一份代码，只有开关不同。
// 每行注释标出它瞄准的家族成员。
// ────────────────────────────────────────────────────────────
const FIXTURE = [
  "let count: number;",                                    // 1
  "count = null;",                                         // 2  ← strictNullChecks
  "function greet(name) { return 'hi ' + name; }",         // 3  ← noImplicitAny（参数 name）
  "class Box {",                                           // 4
  "  label: string;",                                      // 5  ← 构造器里有赋值 → SPI 不报（对照组）
  "  desc: string;",                                       // 6  ← strictPropertyInitialization（从未赋值）
  "  constructor(label: string) { this.label = label; }",  // 7
  "}",                                                     // 8
  "type Fn = (x: { name: string }) => void;",              // 9
  "// 参数刻意选「单向兼容」的结构：{name} 可赋给 {name,age}，反向不行。",   // 10
  "// 双向检查（SFT 关）时能通过；仅逆变检查（SFT 开）时才报——隔离出开关效果。", // 11
  "const f: Fn = (x: { name: string; age: number }) => {};", // 12 ← strictFunctionTypes
  "try { JSON.parse('{'); } catch (e) { e.message; }",     // 13 ← useUnknownInCatchVariables
].join('\n');

// ────────────────────────────────────────────────────────────
// diagnose：把源码写到临时文件，用给定 CompilerOptions 建一次编译，
// 返回「TS 码 @行号: 消息首行」数组。
// tsconfig.json 里的字段 = ts.CompilerOptions 的字段——
// 这也是本练习不用 CLI 而用 API 的原因：开关就是数据，可以随意组合。
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// 轮次 1：全关（ES5 时代的「JS 直译」姿态）
// 轮次 2：--strict（一次打开全家）
// 轮次 3：只开 strictNullChecks——证明家族成员是独立开关
// ────────────────────────────────────────────────────────────
round('轮次 1：全关（sloppy 时代，类型只当注释用）', diagnose('target.ts', FIXTURE, {}));
round('轮次 2：--strict（总开关 = 一次打开全家）', diagnose('target.ts', FIXTURE, { strict: true }));
round('轮次 3：只开 strictNullChecks（其余照旧宽松）', diagnose('target.ts', FIXTURE, { strictNullChecks: true }));
