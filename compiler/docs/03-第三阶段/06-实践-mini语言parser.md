# 实践：mini 语言 parser 完整实现

> [返回：第三阶段导览](01-导览.md)
> 对应第三阶段实践任务。交付 `packages/parser`：语句层递归下降 + 表达式层 Pratt 的混合 parser，含错误恢复。与前两册不同，本册按"骨架 → 逐层填充"展开，你应当边读边写。

## Parser 骨架：token 游标与错误类型

```ts
// packages/parser/src/index.ts
import type { Token, Diagnostic } from 'mini-lexer';

export class ParseError extends Error {
  constructor(readonly token: Token, message: string) { super(message); }
}

export class Parser {
  private at = 0;
  readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  // ---- 游标三件套（递归下降与 Pratt 共用） ----
  private peek(): Token { return this.tokens[this.at]; }
  private prev(): Token { return this.tokens[this.at - 1]; }
  private advance(): Token { return this.tokens[this.at++]; }
  private check(t: TokenType): boolean { return this.peek().type === t; }
  private match(...types: TokenType[]): boolean {
    if (types.some(t => this.check(t))) { this.advance(); return true; }
    return false;
  }
  private consume(t: TokenType, message: string): Token {
    if (this.check(t)) return this.advance();
    throw this.error(this.peek(), message);    // 期待 t 却读到别的：抛给同步层
  }
  private error(token: Token, message: string): ParseError {
    // 统一话术：说"期待什么、看到什么"，永远带词面原文
    const m = token.type === 'eof'
      ? `${message}（在文件末尾；是否少了收尾符号？）`
      : `${message}，但看到 '${token.lexeme}'`;
    this.diagnostics.push({ code: 'E0301', message: m, start: token.start, end: token.end });
    return new ParseError(token, m);
  }
  private span(start: number): { start: number; end: number } {
    return { start, end: this.prev().end };    // 节点区间 = 首子节点 start 到已消费末 token end
  }
}
```

`consume` 抛异常、`declaration` 捕获后 `synchronize`——**异常只用于跨层跳出**（从任意深度回到语句边界），不做普通控制流。诊断在此刻入列（`error()` 里），所以异常丢失也不会丢诊断。

## 入口与语句层（递归下降）

```ts
export function parse(tokens: readonly Token[]): { program: Program; diagnostics: Diagnostic[] } {
  const p = new Parser(tokens);
  const body: Decl[] = [];
  while (!p.check('eof')) body.push(p.declaration());
  return { program: { type: 'Program', body, start: 0, end: tokens.length }, diagnostics: p.diagnostics };
}

private declaration(): Decl { /* 05 册：try/catch + synchronize 的完整实现 */ }

private statement(): Stmt {
  if (this.match('let')) return this.letDecl();
  if (this.match('if')) return this.ifStmt();
  if (this.match('while')) return this.whileStmt();
  if (this.match('{')) return this.block();
  if (this.match('return')) return this.returnStmt();
  return this.exprStmt();
}
```

三个代表性产生式的翻译（对照 02 册的五条规则）：

```ts
private letDecl(): Stmt {
  const kw = this.prev();
  const name = this.consume('ident', '期待变量名');
  const typeAnn = this.match(':') ? this.typeRef() : undefined;
  this.consume('=', "期待 '=' 完成变量声明");
  const init = this.parseExpr(0);
  this.consume(';', '期待 ";" 结束语句');
  return { type: 'LetDecl', name: name.lexeme, typeAnn, init, ...this.span(kw.start) };
}

private ifStmt(): Stmt {
  const kw = this.prev();
  this.consume('(', "if 后期待 '('");
  const cond = this.parseExpr(0);
  this.consume(')', "条件表达式后期待 ')'");
  const then = this.block();
  let els: IfStmt | Block | undefined;
  if (this.match('else')) {
    els = this.check('if') ? (this.advance(), this.ifStmt()) : this.block();
  }
  return { type: 'IfStmt', cond, then, else: els, ...this.span(kw.start) };
}

private block(): Block {
  const open = this.consume('{', "期待 '{' 开始块");
  const body: Stmt[] = [];
  while (!this.check('}') && !this.check('eof')) body.push(this.declaration());
  this.consume('}', "块未闭合（起始于这里）");     // eof 时报错信息足够定位
  return { type: 'Block', body, ...this.span(open.start) };
}
```

注意 `block()` 的循环条件：**`}` 和 `eof` 都停**——残缺输入（注释掉的 `}`）不会死循环，且 eof 的报错带"起始于"提示。

## 表达式层（Pratt）

```ts
// 03 册的绑定力表原样落地
private static readonly INFIX: Partial<Record<TokenType, readonly [number, number]>> = {
  '||': [1, 2], '&&': [3, 4],
  '==': [5, 6], '!=': [5, 6],
  '<': [7, 8], '>': [7, 8], '<=': [7, 8], '>=': [7, 8],
  '+': [9, 10], '-': [9, 10],
  '*': [11, 12], '/': [11, 12], '%': [11, 12],
  '=': [15, 14],
};
private static readonly PREFIX = { '!': 13, '-': 13 } as const;

parseExpr(minBp = 0): Expr {
  let left = this.prefix();
  for (;;) {
    const t = this.peek();
    if (t.type === '(') {                     // 调用：超高中缀
      this.advance();
      const args = this.check(')') ? [] : this.args();
      this.consume(')', "调用表达式未闭合");
      left = { type: 'CallExpr', callee: left, args, ...this.span(left.start) };
      continue;
    }
    const bp = Parser.INFIX[t.type];
    if (!bp || bp[0] < minBp) return left;
    this.advance();
    const right = this.parseExpr(bp[1]);
    const kind = t.type === '&&' || t.type === '||' ? 'LogicalExpr' : t.type === '=' ? 'AssignExpr' : 'BinaryExpr';
    left = { type: kind, op: t.type, left, right, ...this.span(left.start) } as Expr;
  }
}

private prefix(): Expr {
  const t = this.advance();
  if (t.type === 'number') return { type: 'NumberLiteral', value: t.literal as number, start: t.start, end: t.end };
  if (t.type === 'string') return { type: 'StringLiteral', value: t.literal as string, start: t.start, end: t.end };
  if (t.type === 'ident') return { type: 'Identifier', name: t.lexeme, start: t.start, end: t.end };
  if (t.type === '!' || t.type === '-') {
    const operand = this.parseExpr(Parser.PREFIX[t.type]);
    return { type: 'UnaryExpr', op: t.type, operand, start: t.start, end: operand.end };
  }
  if (t.type === '(') {
    const e = this.parseExpr(0);
    this.consume(')', "括号表达式未闭合");
    return e;
  }
  throw this.error(t, '期待表达式');
}
```

`AssignExpr` 的左值合法性（`a = 1` 合法、`1 = a` 非法）**不在这里判**——parser 只管结构，"左值"是语义问题（第四阶段 checker 用类型规则判），这是流水线分层的又一次兑现。

## 错误用例集（验收的核心）

20+ 用例按"恢复能力"分层断言：

```ts
// 201 少分号：let x = 1  print(x);     → 1 条诊断（print 语句仍被解析）
// 202 不配对：if (a { b(); }           → 1 条 + if 语句恢复成功
// 203 连环错：let = 1; let y = ;       → 恰好 2 条（各自独立恢复）
// 204 括号深渊：(((((1)                → 1 条（eof 提示起始于）
// 205 假错误陷阱：let ok = f(1, 2);    → 0 条（合法输入，防误报回归）
```

断言模板：

```ts
test('203-连环错恰好两条诊断', () => {
  const { diagnostics } = parse(tokenize(readFixture('203.mini')).tokens);
  expect(diagnostics).toHaveLength(2);
  expect(diagnostics.every(d => d.code === 'E0301')).toBe(true);
});
```

## 验收标准

- [ ] 全部合法语料（第一阶段的 10 例 + 表达式补充样例）诊断 0 条，AST 快照过。
- [ ] 20+ 错误用例：每个错误数 ≤ 真实 + 1，无误报用例（205 类）。
- [ ] 优先级自测：`20 + 22 * 2 == 44` 的 AST 嵌套层次正确（乘内层、比较外层）。
- [ ] 右结合自测：`a = b = c` 为 `a = (b = c)`。
- [ ] fuzz：随机 token 序列 1000 组，`parse` 不 throw、不死循环（超时保护）。
- [ ] 导出 API：`parse` + AST 类型 + `ParseError`——第四阶段 checker 只依赖这些。

## 阶段性回顾

到这里，mini 语言的前端主体完工：**字符流 → token 流 → AST + 诊断**。第四阶段给这棵树装"理解力"（作用域与类型），第五阶段把它降级为字节码。你现在拥有的是一个**能对任意残缺输入保持体面**的 parser——这在后面每个阶段都会持续回收投资。
