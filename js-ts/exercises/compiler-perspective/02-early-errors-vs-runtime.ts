/**
 * 大纲章节：阶段 5 编译原理视角——ECMA-262 的「编译期」：Early Errors vs 运行时语义
 * 主题：错误分类实验——early error（解析期即抛，不可达也拦不住）vs 运行时错误（没执行就不抛）；
 *       同一段 `let a; let a;` 交给三种工具（V8 解析器 / 仅转译的 transpileModule / 完整 tsc 检查）结果完全不同，
 *       证明「错误检测发生在哪个阶段」由工具截取的编译管道决定
 * 运行：npx tsx exercises/compiler-perspective/02-early-errors-vs-runtime.ts
 * 类型校验：npx tsc --noEmit --strict --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/compiler-perspective/02-early-errors-vs-runtime.ts
 * 预期输出：
 * SyntaxError      if (false) { let a; let a; }    ← early error，不可达也抛
 * （不抛错）       if (false) { null.x; }           ← 运行时错误，未执行
 * （不抛错）       if (false) { x; let x; }         ← TDZ 是运行时检查，未执行
 * ReferenceError   if (true) { x; let x; }          ← TDZ 真的发生
 * TypeError        let b = 1; b();                  ← 运行时错误，执行到了
 * SyntaxError      with (Math) { PI; }              ← strict 禁 with（early error）
 * 三种工具：V8 → SyntaxError；transpileModule → 诊断数 0（输出原样）；完整 tsc → 2×TS2451
 */

import ts from "typescript";

// ============================================================
// 一、五段代码的分类实验（V8 真实解析/执行）
// ============================================================
// 本文件是 ESM 模块（恒为 strict），直接 eval 的代码继承 strict 语义

const cases: ReadonlyArray<{ code: string; note: string }> = [
  { code: "if (false) { let a; let a; }", note: "重复 let：early error（static semantics）" },
  { code: "if (false) { null.x; }", note: "TypeError：运行时语义，块不可达" },
  { code: "if (false) { x; let x; }", note: "TDZ：运行时语义（binding 未初始化），不可达不抛" },
  { code: "if (true) { x; let x; }", note: "TDZ：真的发生了 → ReferenceError" },
  { code: "let b = 1; b();", note: "TypeError：运行时且执行到了" },
  { code: "with (Math) { PI; }", note: "strict 禁 with：early error" },
];

console.log("== 分类实验：错误在哪个阶段被抓住 ==");
for (const { code, note } of cases) {
  let result: string;
  try {
    eval(code);
    result = "（不抛错）";
  } catch (e) {
    result = (e as Error).name;
  }
  console.log(`${result.padEnd(16)} ${code}   【${note}】`);
}

// ============================================================
// 二、同一段坏代码 × 三种工具：检测阶段各不相同
// ============================================================

const bad = "let a; let a;";

// 工具 1：V8 解析器——ECMA-262 early error，ParseScript 阶段即抛
let v8 = "不抛";
try {
  eval(bad);
} catch (e) {
  v8 = (e as Error).name;
}

// 工具 2：ts.transpileModule——只走 parser+emitter（转译器），无 binder/checker
const transpiled = ts.transpileModule(bad, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const transpileDiagCount = transpiled.diagnostics?.length ?? 0;

// 工具 3：完整 tsc 检查——createProgram + checker（语义分析）
function diagnose(code: string): ts.Diagnostic[] {
  const fileName = "virtual.ts";
  const options: ts.CompilerOptions = {
    strict: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const libName = ts.getDefaultLibFileName(options);
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false);
  const host: ts.CompilerHost = {
    getSourceFile: (name: string) =>
      name === fileName
        ? sourceFile
        : name === libName
          ? ts.createSourceFile(name, "", ts.ScriptTarget.Latest, false)
          : undefined,
    writeFile: () => undefined,
    getCurrentDirectory: () => "",
    getCanonicalFileName: (f: string) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => libName,
    fileExists: (f: string) => f === fileName || f === libName,
    readFile: () => "",
  };
  const program = ts.createProgram([fileName], options, host);
  const sf2 = program.getSourceFile(fileName);
  if (!sf2) return [];
  return [...program.getSyntacticDiagnostics(sf2), ...program.getSemanticDiagnostics(sf2)];
}

const diags = diagnose(bad);

console.log("\n== `let a; let a;` × 三种工具 ==");
console.log(`V8 解析器（early error）          → ${v8}`);
console.log(`ts.transpileModule（仅转译）       → 诊断数 ${transpileDiagCount}，输出 ${JSON.stringify(transpiled.outputText.trim())}`);
console.log(`完整 tsc 检查（binder + checker） → 诊断数 ${diags.length}`);
for (const d of diags) {
  console.log(`  TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}
console.log("结论：转译器（transpileModule/esbuild/tsx）没有语义检查——这就是 tsx 跑得快、也永远不查类型的原因");
