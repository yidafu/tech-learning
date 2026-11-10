/**
 * 大纲章节：阶段 4 代码质量——ESLint 核心：基于 AST 的静态分析（笔记 19 §1/§3）
 * 主题：手写 mini-ESLint（零依赖，TS Compiler API）——规则注册表 + 访问器 + 单次遍历；
 *       3 条语法层规则（no-var / eqeqeq / no-eq-null）+ 2 条 typed 规则（for-in-array / no-floating-promises）
 *       → 语法层只读 AST；typed 规则必须建 Program 拿 checker（这就是 typescript-eslint 慢、要配 project 的原因）
 * 运行：npx tsx exercises/eslint-prettier/01-mini-linter.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/eslint-prettier/01-mini-linter.ts
 * 预期输出：
 *   ── mini-ESLint 报告（5 条规则：3 语法层 + 2 需类型）──
 *   L1:1  no-var                         Unexpected var, use 'let' or 'const' instead.
 *   L3:7  eqeqeq                         Expected '===' and instead saw '=='.
 *   L3:7  no-eq-null                     Use '===' to compare with null.
 *   L4:7  eqeqeq                         Expected '===' and instead saw '=='.
 *   L8:19  for-in-array          [typed]  For-in over an array (keys are indexes). Use for-of instead.
 *   L14:1  no-floating-promises  [typed]  Promises must be awaited, returned, or explicitly ignored.
 *   共 6 条（语法层 4 / 需 checker 2）
 *   → 语法层规则单文件 AST 就够；typed 规则必须建 Program——typescript-eslint 慢且要配 project 的根源（笔记 19 §3）
 */

import * as ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ────────────────────────────────────────────────────────────
// 小白鼠：每行瞄准一条规则
// ────────────────────────────────────────────────────────────
const FIXTURE = [
  'var legacy = 1;',                                   // 1  ← no-var
  "function eq(a: string, b: number) {",               // 2
  "  if (a == null) return 'nullish';",                // 3  ← eqeqeq + no-eq-null
  "  if ('1' == 1) return 'coerced';",                 // 4  ← eqeqeq
  '  return a + b;',                                   // 5
  '}',                                                 // 6
  "const list: string[] = ['a', 'b'];",                // 7
  'for (const key in list) {',                         // 8  ← for-in-array（typed）
  '  eq(list[key]!, 1);',                              // 9
  '}',                                                 // 10
  'async function work(): Promise<number> {',          // 11
  '  return 1;',                                       // 12
  '}',                                                 // 13
  'work();',                                           // 14 ← no-floating-promises（typed）
].join('\n');

// ────────────────────────────────────────────────────────────
// ESLint 形状的骨架：context.report + 规则返回「访问器表」+ 单次遍历分发
// ────────────────────────────────────────────────────────────
interface Finding {
  line: number;
  col: number;
  ruleId: string;
  message: string;
  typed: boolean;
}

interface Context {
  report(node: ts.Node, message: string): void;
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
}

interface Rule {
  id: string;
  typed: boolean; // true = 需要类型信息（typescript-eslint 的 project 服务）
  create(ctx: Context): Array<{ kinds: ts.SyntaxKind[]; visit(node: ts.Node): void }>;
}

const RULES: Rule[] = [
  {
    id: 'no-var',
    typed: false,
    create: (ctx) => [
      {
        kinds: [ts.SyntaxKind.VariableStatement],
        visit: (node) => {
          if (!ts.isVariableStatement(node)) return;
          if (node.declarationList.getFirstToken()?.kind === ts.SyntaxKind.VarKeyword) {
            ctx.report(node, "Unexpected var, use 'let' or 'const' instead.");
          }
        },
      },
    ],
  },
  {
    id: 'eqeqeq',
    typed: false,
    create: (ctx) => [
      {
        kinds: [ts.SyntaxKind.BinaryExpression],
        visit: (node) => {
          if (!ts.isBinaryExpression(node)) return;
          const op = node.operatorToken.kind;
          if (op === ts.SyntaxKind.EqualsEqualsToken) ctx.report(node, "Expected '===' and instead saw '=='.");
          if (op === ts.SyntaxKind.ExclamationEqualsToken) ctx.report(node, "Expected '!==' and instead saw '!='.");
        },
      },
    ],
  },
  {
    id: 'no-eq-null',
    typed: false,
    create: (ctx) => [
      {
        kinds: [ts.SyntaxKind.BinaryExpression],
        visit: (node) => {
          if (!ts.isBinaryExpression(node)) return;
          const loose = node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
            node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken;
          const againstNull = node.left.kind === ts.SyntaxKind.NullKeyword || node.right.kind === ts.SyntaxKind.NullKeyword;
          if (loose && againstNull) ctx.report(node, "Use '===' to compare with null.");
        },
      },
    ],
  },
  {
    id: 'for-in-array',
    typed: true, // 必须问 checker：表达式的类型是不是数组——AST 上看不出来
    create: (ctx) => [
      {
        kinds: [ts.SyntaxKind.ForInStatement],
        visit: (node) => {
          if (!ts.isForInStatement(node)) return;
          const type = ctx.checker.getTypeAtLocation(node.expression); // 公开 API 是 getTypeAtLocation（getTypeAtNode 是内部方法）
          if (String(type.symbol?.escapedName ?? '') === 'Array') {
            ctx.report(node.expression, 'For-in over an array (keys are indexes). Use for-of instead.');
          }
        },
      },
    ],
  },
  {
    id: 'no-floating-promises',
    typed: true, // 简化判定：只看类型符号名；真规则还要穿透 union/any（typescript-eslint 源码即如此）
    create: (ctx) => [
      {
        kinds: [ts.SyntaxKind.ExpressionStatement],
        visit: (node) => {
          if (!ts.isExpressionStatement(node)) return;
          const type = ctx.checker.getTypeAtLocation(node.expression);
          if (String(type.symbol?.escapedName ?? '') === 'Promise') {
            ctx.report(node.expression, 'Promises must be awaited, returned, or explicitly ignored.');
          }
        },
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// 引擎：建 Program（typed 规则的地基）→ 合并访问器 → 深度优先分发
// ────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'mini-lint-'));
const file = join(dir, 'fixture.ts');
writeFileSync(file, FIXTURE);
const program = ts.createProgram([file], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts'],
  noEmit: true,
  strict: true,
});
const sourceFile = program.getSourceFile(file)!;
const checker = program.getTypeChecker();

const findings: Finding[] = [];
const ctx: Context = {
  checker,
  sourceFile,
  report: (node, message) => {
    const rule = RULES.find((r) => r.id === currentRuleId)!; // 访问器执行期间记录当前规则
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({ line: line + 1, col: character + 1, ruleId: rule.id, message, typed: rule.typed });
  },
};
let currentRuleId = '';

const visitors = RULES.flatMap((rule) => {
  currentRuleId = rule.id; // create 阶段不需要 ctx，这里只为对齐 ESLint 生命周期示意
  return rule.create(ctx).map((v) => ({ rule, kinds: new Set(v.kinds), visit: v.visit }));
});

function walk(node: ts.Node): void {
  for (const v of visitors) {
    if (v.kinds.has(node.kind)) {
      currentRuleId = v.rule.id;
      v.visit(node);
    }
  }
  node.forEachChild(walk);
}
walk(sourceFile);
rmSync(dir, { recursive: true, force: true });

console.log(`── mini-ESLint 报告（${RULES.length} 条规则：${RULES.filter((r) => !r.typed).length} 语法层 + ${RULES.filter((r) => r.typed).length} 需类型）──`);
for (const f of findings) {
  const tag = f.typed ? '[typed]' : '       ';
  console.log(`L${f.line}:${f.col}  ${f.ruleId.padEnd(22)}${tag}  ${f.message}`);
}
console.log(`共 ${findings.length} 条（语法层 ${findings.filter((f) => !f.typed).length} / 需 checker ${findings.filter((f) => f.typed).length}）`);
console.log('→ 语法层规则单文件 AST 就够；typed 规则必须建 Program——typescript-eslint 慢且要配 project 的根源（笔记 19 §3）');
