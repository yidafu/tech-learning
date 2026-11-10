/**
 * 大纲章节：阶段 5 编译原理视角——词法分析（token 流）与语法分析（AST）
 * 主题：用 TypeScript 自带的 compiler API 亲手观察编译器前两阶段的产物；
 *       验证两个关键事实：① AST 顺序 = 源码顺序，「提升」不是 AST 变换；
 *       ② 类型注解只是普通 AST 节点（为 03 的类型擦除做铺垫）
 * 运行：npx tsx exercises/compiler-perspective/01-scanner-and-ast.ts
 * 类型校验：npx tsc --noEmit --strict --esModuleInterop --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/compiler-perspective/01-scanner-and-ast.ts
 * 预期输出：
 * ConstKeyword(const) Identifier(answer) ColonToken(:) NumberKeyword(number) EqualsToken(=) NumericLiteral(6) AsteriskToken(*) NumericLiteral(7) SemicolonToken(;)
 * （AST 树：SourceFile → VariableStatement/ExpressionStatement/FunctionDeclaration 顺序不变）
 * x 的类型注解节点：kind = NumberKeyword，文本 = "number"
 */

import ts from "typescript";

// ============================================================
// 一、词法分析：scanner 把字符串切成 token 流（阶段①）
// ============================================================

const source = "const answer: number = 6 * 7;";
const scanner = ts.createScanner(
  ts.ScriptTarget.ES2022,
  true, // skipTrivia：跳过空白/注释（sourcemap/Prettier 才需要保留它们）
  ts.LanguageVariant.Standard,
  source,
);

// SyntaxKind 是「字符串⇄数值」双向枚举，且带 FirstStatement/LastStatement 等「哨兵别名」与真实种类共享数值，
// 直接反查会撞名（VariableStatement 会被显示成 FirstStatement）；自建反查表并跳过哨兵
const kindNames = new Map<number, string>();
for (const key of Object.keys(ts.SyntaxKind)) {
  const value: unknown = (ts.SyntaxKind as Record<string, unknown>)[key];
  if (typeof value === "number" && !/^(First|Last)/.test(key) && !kindNames.has(value)) {
    kindNames.set(value, key);
  }
}
const kindName = (kind: ts.SyntaxKind): string => kindNames.get(kind) ?? `Unknown(${kind})`;

const tokens: string[] = [];
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  tokens.push(`${kindName(token)}(${scanner.getTokenText()})`);
  token = scanner.scan();
}
console.log("== scanner：token 流 ==");
console.log(tokens.join(" "));
console.log("观察：冒号、类型名 `number` 都只是 token——词法层不关心「这是不是类型」");

// ============================================================
// 二、语法分析：parser 把 token 流组装成 AST（阶段②）
// ============================================================

// 刻意把调用写在函数声明之前——「提升」的经典场景
const code = [
  "const x: number = 1;", // 语句 1
  "double(x);", // 语句 2：调用在声明之前
  "function double(n: number) { return n * 2; }", // 语句 3
].join("\n");

const sf = ts.createSourceFile("demo.ts", code, ts.ScriptTarget.ES2022, false);

console.log("\n== parser：AST（深度 ≤ 2）==");

function dump(node: ts.Node, depth: number): void {
  if (depth <= 2) console.log(`${"  ".repeat(depth)}${kindName(node.kind)}`);
  if (depth < 2) ts.forEachChild(node, (child) => dump(child, depth + 1));
}
dump(sf, 0);

console.log("观察：顶层语句顺序 = 源码顺序（VariableStatement → ExpressionStatement → FunctionDeclaration）");
console.log("观察：没有任何节点被「移到顶部」——提升发生在下一阶段（环境实例化），不在 parse");

// ============================================================
// 三、类型注解是 AST 节点：找到 `number` 关键字节点
// ============================================================

let annotation: ts.Node | undefined;
function findNumberKeyword(node: ts.Node, parent: ts.Node): void {
  // createSourceFile 默认不设置 parent（setParentNodes=false），用参数显式携带父节点
  if (node.kind === ts.SyntaxKind.NumberKeyword && ts.isVariableDeclaration(parent)) {
    annotation = node;
  }
  ts.forEachChild(node, (child) => findNumberKeyword(child, node));
}
findNumberKeyword(sf, sf);

console.log("\n== 类型注解的 AST 身份 ==");
console.log(`x 的类型注解节点：kind = ${kindName(annotation?.kind ?? ts.SyntaxKind.Unknown)}，文本 = "${annotation?.getText(sf) ?? "?"}"`);
console.log("观察：类型以节点形式挂在 AST 上（VariableDeclaration.type 属性）——emitter「删类型」删的就是这些节点");
