/**
 * 大纲章节：阶段 5 编译原理视角——类型层求值：类型体操 = 让 checker 执行一段类型级函数式程序
 * 主题：把 4 段递归类型程序（模式匹配 / 模板拼接 / 字符串计数 / 深度只读）交给 checker「求值」，
 *       打印求值结果——直观建立「条件类型 = 分支 + 模式匹配、infer = 逻辑变量、递归类型 = 递归函数」的心智模型
 * 运行：npx tsx exercises/compiler-perspective/05-type-level-evaluation.ts
 * 类型校验：npx tsc --noEmit --strict --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/compiler-perspective/05-type-level-evaluation.ts
 * 预期输出：
 * A1 = string                 ← Flatten<string[][]> 递归解包
 * A2 = number
 * E1 = string | number        ← 分布式条件类型：成员各自求值再重组
 * B1 = "app.user"             ← 模板字面量拼接
 * C1 = 5                      ← Len<"deep!"> 字符串长度（元组计数）
 * D1 = { readonly v: { readonly w: 1; }; }   ← 递归映射 DeepReadonly
 */

import ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

// ============================================================
// 一、待求值的类型层程序（对照阶段 3.3 类型编程——这里关注「谁在执行它」）
// ============================================================

const virtualCode = `
type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;
type A1 = Flatten<string[][]>;               // 递归解包到元素类型
type A2 = Flatten<number>;
type E1 = Flatten<string[] | number[]>;      // 分布式条件类型：联合成员各自求值再重组

type Join<K, P> = K extends string ? (P extends string ? \`\${K}.\${P}\` : never) : never;
type B1 = Join<"app", "user">;               // 模板字面量：类型层字符串拼接

type Len<S extends string, Acc extends readonly unknown[] = []> =
  S extends \`\${string}\${infer Rest}\` ? Len<Rest, [...Acc, 0]> : Acc["length"];
type C1 = Len<"deep!">;                      // 递归 + 元组计数：字符串长度

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
type D1 = DeepReadonly<{ v: { w: 1 } }>;     // 递归映射：深度加工结构
`;

// ============================================================
// 二、组装 Program + checker（mini-tsc 样板，与练习 04 的差别见下方注释）
// ============================================================

// 关键差别：这里必须加载真实的 lib.d.ts——类型层的 Array/T[]/方法都定义在
// node_modules/typescript/lib/lib.*.d.ts 里，而那本身就是一份几十万行的 TS 类型程序
// （noLib 环境下 T[] 无法求值，练习 04 不用数组所以可以 noLib）

const nodeRequire = createRequire(import.meta.url);
const tsLibDir = path.join(path.dirname(nodeRequire.resolve("typescript/package.json")), "lib"); // node_modules/typescript/lib
const libCache = new Map<string, ts.SourceFile>();

function loadSourceFile(name: string): ts.SourceFile | undefined {
  const resolved = name.includes("/") ? name : path.join(tsLibDir, name);
  const cached = libCache.get(resolved);
  if (cached) return cached;
  if (!fs.existsSync(resolved)) return undefined;
  const created = ts.createSourceFile(name, fs.readFileSync(resolved, "utf8"), ts.ScriptTarget.Latest, false);
  libCache.set(resolved, created);
  return created;
}

function createVirtualProgram(code: string): { checker: ts.TypeChecker; file: ts.SourceFile } {
  const fileName = "virtual.ts";
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true, // 只对虚拟文件做检查，跳过 lib 自身的检查以提速
    target: ts.ScriptTarget.Latest,
  };
  const libName = ts.getDefaultLibFileName(options);
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false);
  const host: ts.CompilerHost = {
    getSourceFile: (name: string) => (name === fileName ? sourceFile : loadSourceFile(name)),
    writeFile: () => undefined,
    getCurrentDirectory: () => "",
    getCanonicalFileName: (f: string) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => libName,
    fileExists: (f: string) => f === fileName || fs.existsSync(f.includes("/") ? f : path.join(tsLibDir, f)),
    readFile: (f: string) => {
      if (f === fileName) return code;
      const resolved = f.includes("/") ? f : path.join(tsLibDir, f);
      return fs.existsSync(resolved) ? fs.readFileSync(resolved, "utf8") : undefined;
    },
  };
  const program = ts.createProgram([fileName], options, host);
  const file = program.getSourceFile(fileName);
  if (!file) throw new Error("virtual source file missing");
  return { checker: program.getTypeChecker(), file };
}

const { checker, file } = createVirtualProgram(virtualCode);

// ============================================================
// 三、让 checker 对每个「结果别名」求值并打印
// ============================================================

const wanted = new Set(["A1", "A2", "E1", "B1", "C1", "D1"]);

console.log("== checker 的求值结果 ==");
function visit(node: ts.Node): void {
  if (ts.isTypeAliasDeclaration(node) && wanted.has(node.name.text)) {
    const type = checker.getTypeAtLocation(node.name);
    // InTypeAlias：分布式条件类型的结果会带上「别名自身」的显示名，此标志强制按结构展开
    const printed = checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
    );
    console.log(`${node.name.text} = ${printed}`);
  }
  ts.forEachChild(node, visit);
}
visit(file);

console.log("\n对应关系：");
console.log("  条件类型 = if/else + 模式匹配（extends 左边对右边做结构匹配，infer 解出「逻辑变量」U）");
console.log("  infer    = 逻辑变量（匹配时被「解出来」，由 checker 求解）");
console.log("  递归类型 = 递归函数（有深度限制，TS 4.1+ 有尾递归优化）");
console.log("  映射类型 = 类型层的 map（对 keyof T 的每个成员做变换）");
console.log("结论：写类型体操 = 写一段类型层的函数式小程序，checker 是它的解释器");
