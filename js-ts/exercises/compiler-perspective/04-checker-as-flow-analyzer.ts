/**
 * 大纲章节：阶段 5 编译原理视角——checker 是一台静态分析引擎：narrowing = 控制流敏感的数据流分析
 * 主题：用 ~40 行代码把 TypeScript 的 checker 当分析器调用：
 *       ① 打印同一变量在不同控制流位置的类型（类型沿流变化——数据流分析的可视化）；
 *       ② 闭包边界：从未重赋值 → 保持窄化；之后被重赋值 → 保守放大（宁可不报错，不可漏报）；
 *       ③ const 保持字面量不拓宽、let 立即拓宽；
 *       ④ 顺手得到一个自制 mini-tsc 诊断器（getSemanticDiagnostics）
 * 运行：npx tsx exercises/compiler-perspective/04-checker-as-flow-analyzer.ts
 * 类型校验：npx tsc --noEmit --strict --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/compiler-perspective/04-checker-as-flow-analyzer.ts
 * 预期输出：
 * L 7: Shape        ← 声明类型（显示别名）
 * L 9: string       ← typeof 收窄
 * L11: string       ← 闭包保持窄化（shape 从未重赋值）
 * L13: Shape        ← 分支汇合
 * L20: Shape        ← 闭包保守放大（shape 之后被重赋值）
 * L24: number       ← if 分支 return → 隐式 else 窄化
 * L34: 1            ← const 保持字面量
 * L35: number       ← let 立即拓宽
 * 诊断数：1（L29 TS2345: Argument of type 'Shape' is not assignable to parameter of type 'string'.）
 */

import ts from "typescript";

// ============================================================
// 一、被分析的虚拟程序（__probe 是探针：让 checker 在指定程序点报出参数的流类型）
// ============================================================

const virtualCode = `
type Shape = string | number;
declare function __probe<T>(x: T): T;
declare function size(s: string): number;

function render(shape: Shape) {
  __probe(shape);              // 期望 Shape（声明类型；checker 显示别名）
  if (typeof shape === "string") {
    __probe(shape);            // 期望 string（typeof 收窄）
    const keep = () => shape;
    __probe(keep());           // 期望 string（shape 从未重赋值 → 闭包内保持窄化）
  }
  __probe(shape);              // 期望 Shape（分支汇合，回到声明类型）
  return shape;
}

function flip(shape: Shape) {
  if (typeof shape === "string") {
    const lost = () => shape;
    __probe(lost());           // 期望 Shape（shape 稍后被重赋值 → 分析必须保守放大）
    shape = 9;
    return shape;
  }
  __probe(shape);              // 期望 number（if 分支 return → 隐式 else 窄化）
  return shape;
}

function broken(shape: Shape) {
  return size(shape);          // 唯一的类型错误在这里
}

const c1 = 1;
let w1 = 1;
__probe(c1);                   // 期望 1（const：字面量不拓宽）
__probe(w1);                   // 期望 number（let：立即拓宽）
`;

// ============================================================
// 二、组装 mini-tsc：Program + checker（binder 在幕后建符号表与控制流图）
// ============================================================

function createVirtualProgram(code: string): { program: ts.Program; checker: ts.TypeChecker; file: ts.SourceFile } {
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
  const file = program.getSourceFile(fileName);
  if (!file) throw new Error("virtual source file missing");
  return { program, checker: program.getTypeChecker(), file };
}

const { program, checker, file } = createVirtualProgram(virtualCode);

// ============================================================
// 三、打印每个探针点的流类型——类型「沿控制流」变化
// ============================================================

function probeTypes(): string[] {
  const out: string[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "__probe"
    ) {
      const arg = node.arguments[0];
      const { line } = file.getLineAndCharacterOfPosition(arg.getStart(file));
      out.push(`L${String(line + 1).padStart(2)}: ${checker.typeToString(checker.getTypeAtLocation(arg))}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return out;
}

console.log("== checker 报出的流类型（数据流分析可视化）==");
for (const line of probeTypes()) console.log(line);
console.log("观察：同一个变量 shape，类型随程序点变化——这正是「narrowing = 控制流敏感分析」");

// ============================================================
// 四、自制诊断器：语义诊断（相当于 tsc --noEmit 对虚拟文件干的事）
// ============================================================

const diags = program.getSemanticDiagnostics(file);
console.log("\n== mini-tsc：语义诊断 ==");
console.log(`诊断数：${diags.length}`);
for (const d of diags) {
  const { line } = file.getLineAndCharacterOfPosition(d.start ?? 0);
  console.log(`  L${line + 1} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}
console.log("结论：checker 沿 binder 建好的控制流图给每个程序点算类型状态；");
console.log("      闭包/重赋值处放大类型不是 bug，是保守近似——宁可放过，不可冤枉");
