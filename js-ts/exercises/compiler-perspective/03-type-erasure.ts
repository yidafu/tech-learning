/**
 * 大纲章节：阶段 5 编译原理视角——tsc 的 emitter：类型擦除与「不可擦除语法」
 * 主题：用 ts.transpileModule 对比「擦除前 vs 擦除后」：
 *       可擦除（interface / type / 注解 / as 断言）蒸发得无影无踪；
 *       不可擦除（enum / namespace 含运行时值 / 参数属性）会凭空生成运行时代码——
 *       「TS 类型运行时不存在」只对第一类成立（TS 5.8 erasableSyntaxOnly 即为此边界立法）
 * 运行：npx tsx exercises/compiler-perspective/03-type-erasure.ts
 * 类型校验：npx tsc --noEmit --strict --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/compiler-perspective/03-type-erasure.ts
 * 预期输出：
 * 可擦除段输出：const p = { x: 1, y: 2 }; const id = "u-1"; function len(s) { return s.length; }
 * 不可擦除段输出：var Color; (function (Color) { Color[Color["Red"] = 0] = "Red"; ... })(Color || (Color = {}));
 *   var Util; (function (Util) { Util.id = (v) => v; })(Util || (Util = {}));
 *   class Box { value; constructor(value) { this.value = value; } }
 * transpileModule + erasableSyntaxOnly → 诊断数 0（转译器不执法）
 * 完整 tsc + erasableSyntaxOnly → 3×TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
 * 改写为 type + as const 后 → 诊断数 0
 */

import ts from "typescript";

function compile(code: string): string {
  const result = ts.transpileModule(code.trim(), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  if ((result.diagnostics?.length ?? 0) > 0) {
    return `（编译报错 ×${result.diagnostics?.length}）`;
  }
  return result.outputText.trim();
}

// ============================================================
// 一、可擦除语法：emitter 只是「删掉」类型相关节点
// ============================================================

const erasable = `
interface Point { x: number; y: number }
type ID = string | number;
const p = { x: 1, y: 2 } as Point;
const id: ID = "u-1";
function len(s: string): number { return s.length; }
`;

console.log("== 可擦除语法 ==");
console.log(compile(erasable));
console.log("观察：interface、type、注解、as 断言全部消失，剩下的就是普通 JS");

// ============================================================
// 二、不可擦除语法：emitter 要「生成」运行时代码
// ============================================================

const notErasable = `
enum Color { Red, Green }
namespace Util {
  export const id = (v: unknown) => v;
}
class Box {
  constructor(public value: number) {}
}
`;

console.log("\n== 不可擦除语法 ==");
console.log(compile(notErasable));
console.log("观察：enum 变成 IIFE 构造的双向映射对象；namespace 变成立即执行的模块壳；");
console.log("      参数属性 constructor(public value) 变成 this.value = value——这些都不是「擦除」是「转译」");

// ============================================================
// 三、erasableSyntaxOnly（TS 5.8+）：谁在执法？——完整检查在执法，转译器不执法
// ============================================================

// 先看 transpileModule：它只转译，即使打开开关也照样把 enum 编译出去
const looseResult = ts.transpileModule(notErasable.trim(), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, erasableSyntaxOnly: true },
  reportDiagnostics: true,
});
console.log("\n== transpileModule + erasableSyntaxOnly ==");
console.log(`诊断数：${looseResult.diagnostics?.length ?? 0}，且照样输出了 enum 的运行时代码——转译器不执法`);

// 再看完整检查（createProgram：走 binder + checker）
function fullCheck(code: string, extra: ts.CompilerOptions): string[] {
  const fileName = "virtual.ts";
  const options: ts.CompilerOptions = {
    strict: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
    ...extra,
  };
  const libName = ts.getDefaultLibFileName(options);
  const sourceFile = ts.createSourceFile(fileName, code.trim(), ts.ScriptTarget.Latest, false);
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
  const sf = program.getSourceFile(fileName);
  if (!sf) return ["（虚拟文件丢失）"];
  const diags = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
  return diags.map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}

console.log("\n== 完整 tsc 检查 + erasableSyntaxOnly ==");
for (const msg of fullCheck(notErasable, { erasableSyntaxOnly: true })) console.log(`  ${msg}`);

// ============================================================
// 四、对照：把 enum 改成可擦除写法，就能通过
// ============================================================

const erasableVersion = `
type Color = "red" | "green";
const ColorMap = { red: 0, green: 1 } as const;
`;

console.log("\n== 改写为可擦除等价物后（完整检查 + erasableSyntaxOnly）==");
const ok = fullCheck(erasableVersion, { erasableSyntaxOnly: true });
console.log(`诊断数：${ok.length}${ok.length === 0 ? "——type 别名与 as const 对象全部合法（as const 是值语法，不受限）" : ""}`);
for (const msg of ok) console.log(`  ${msg}`);
console.log("结论：类型层信息（type）零运行时痕迹；想要运行时痕迹就得写运行时代码（对象/enum）——");
console.log("      「类型擦除」的边界 = 「类型语法」与「值语法」的边界");
console.log("      而边界的「执法者」是 checker，不是转译器——同一个开关，两种工具，两种态度");
