/**
 * 大纲章节：阶段 4 代码质量——Prettier：opinionated 的 AST 重打印（笔记 19 §4）
 * 主题：格式化的正确姿势 = parse → 按策略重打印（TS printer 在此充当极简版 Prettier）；
 *       三个证据：① 重打印归一化布局 ② 幂等（再印不变）③ 结构保真（AST 剥离位置后逐节点相同）；
 *       反例：正则在字符串层面扫 var 会误伤字符串字面量与注释——lint/format 必须活在 AST 层
 * 运行：npx tsx exercises/eslint-prettier/02-ast-reprint.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/eslint-prettier/02-ast-reprint.ts
 * 预期输出：
 *   ── [1] 丑格式源码 ──
 *   var   y=2;
 *   const   s   =   'text with var inside';
 *   // comment mentioning var too
 *   function   add(a,   b){return   a+b}
 *   if(y)   {add(y,   2)}
 *   ── [2] parse → 重打印（printer ≈ 极简版 Prettier：同一棵 AST，另一种打印策略）──
 *   var y = 2;
 *   const s = "text with var inside";
 *   // comment mentioning var too
 *   function add(a, b) { return a + b; }
 *   if (y) {
 *       add(y, 2);
 *   }
 *   ── [3] 幂等性：把 pretty 再 parse 再打印，逐字节相同 ──
 *   true
 *   ── [4] 结构保真：丑/pretty 两份 AST 剥离位置后比较 ──
 *   逐 token 比较 = false
 *   忽略分号 token 后 = true  ← printer 补上了 ASI 缺的分号（token 流多几个 SemicolonToken），语义结构不变（回扣笔记 02）
 *   ── [5] 为什么必须活在 AST 层：数一数 var ──
 *   正则命中 3 处（真声明 1 + 字符串字面量 1 + 注释 1）；AST 命中 1 处（只有真声明）
 *   → 字符串层面没有语法语境；Prettier 的 opinionated 本质 = 解析后按固定策略重打印，不提供逐条样式开关（笔记 19 §4）
 */

import * as ts from 'typescript';

// ────────────────────────────────────────────────────────────
// 丑格式源码：缺分号、挤压等号、随意空格；
// 并埋了两个「字符串层面的陷阱」——字符串字面量和注释里各有一个 var
// ────────────────────────────────────────────────────────────
const UGLY = [
  'var   y=2;',
  "const   s   =   'text with var inside';",
  '// comment mentioning var too',
  'function   add(a,   b){return   a+b}',
  'if(y)   {add(y,   2)}',
].join('\n');

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const parse = (src: string): ts.SourceFile =>
  ts.createSourceFile('ugly.ts', src, ts.ScriptTarget.ES2022, false);

// 结构指纹：剥离 pos/end/parent 等位置信息，只保留 kind 与子节点树
// （getChildren 必须传 sourceFile：parent 未设置时 node.getSourceFile() 拿不到）
function shape(node: ts.Node, sf: ts.SourceFile, ignoreSemicolons: boolean): unknown {
  const kids = node
    .getChildren(sf)
    .filter((ch) => !ignoreSemicolons || ch.kind !== ts.SyntaxKind.SemicolonToken);
  return { k: ts.SyntaxKind[node.kind], c: kids.map((ch) => shape(ch, sf, ignoreSemicolons)) };
}

console.log('── [1] 丑格式源码 ──');
console.log(UGLY);

console.log('── [2] parse → 重打印（printer ≈ 极简版 Prettier：同一棵 AST，另一种打印策略）──');
const pretty1 = printer.printFile(parse(UGLY));
console.log(pretty1.trimEnd());

console.log('── [3] 幂等性：把 pretty 再 parse 再打印，逐字节相同 ──');
const pretty2 = printer.printFile(parse(pretty1));
console.log(pretty1 === pretty2);

console.log('── [4] 结构保真：丑/pretty 两份 AST 剥离位置后比较 ──');
const sfUgly = parse(UGLY);
const sfPretty = parse(pretty1);
const rawEqual = JSON.stringify(shape(sfUgly, sfUgly, false)) === JSON.stringify(shape(sfPretty, sfPretty, false));
const noSemiEqual = JSON.stringify(shape(sfUgly, sfUgly, true)) === JSON.stringify(shape(sfPretty, sfPretty, true));
console.log(`逐 token 比较 = ${rawEqual}`);
console.log(`忽略分号 token 后 = ${noSemiEqual}  ← printer 补上了 ASI 缺的分号（token 流多几个 SemicolonToken），语义结构不变（回扣笔记 02）`);

// ────────────────────────────────────────────────────────────
// 反例：同一份源码，正则 vs AST 数 var
// ────────────────────────────────────────────────────────────
const regexHits = UGLY.match(/\bvar\b/g)?.length ?? 0;

let astHits = 0;
function countVar(node: ts.Node, sf: ts.SourceFile): void {
  if (ts.isVariableDeclarationList(node) && node.getFirstToken(sf)?.kind === ts.SyntaxKind.VarKeyword) astHits++;
  node.forEachChild((ch) => countVar(ch, sf));
}
countVar(sfUgly, sfUgly);

console.log('── [5] 为什么必须活在 AST 层：数一数 var ──');
console.log(`正则命中 ${regexHits} 处（真声明 1 + 字符串字面量 1 + 注释 1）；AST 命中 ${astHits} 处（只有真声明）`);
console.log('→ 字符串层面没有语法语境；Prettier 的 opinionated 本质 = 解析后按固定策略重打印，不提供逐条样式开关（笔记 19 §4）');
