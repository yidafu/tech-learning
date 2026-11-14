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

### 游标三件套的职责边界

六个游标方法各有严格的语义，写语句层之前先把边界钉死：

| 方法 | 副作用 | 用途 | 误用的症状 |
|---|---|---|---|
| `peek()` | 无 | 判分派、判循环边界 | — |
| `prev()` | 无 | 取刚消费的 token（造节点、算 span） | 在未消费任何 token 时拿到 undefined |
| `advance()` | at+1 | 确定要吃时使用 | 用它"偷看"会多消费 |
| `check(t)` | 无 | peek 的类型问句 | — |
| `match(...)` | 命中则 at+1 | 可选语法 / 分派（试吃） | 该用 consume 的地方用它，错误被吞 |
| `consume(t, msg)` | 命中则 at+1，否则抛 | **必须有**的语法（吃不到即报错） | 该用它的地方用 match，结构缺失静默 |

选用判据一句话：**"这里要么是这个 token，要么程序结构就错了" → consume；"有没有都行" → match**。`letDecl` 里的 `consume('=', ...)` 与 `ifStmt` 里的 `match('else')` 正是这对判据的各自示范。三件套是数组制的红利（[05-实践-mini语言lexer](../02-第二阶段/05-实践-mini语言lexer.md) 的交付形态一节）——`tokens[this.at]` 的随机访问让 peek/prev 都是一行。

### error() 的话术设计

错误信息全部经 `error()` 一道门出，三条话术纪律：

- **说"期待什么、看到什么"**：`期待 ';' 结束语句，但看到 'if'`——两个槽位（期待/来犯）都有具体词面，用户不需要去数列；
- **eof 单独措辞**：`${message}（在文件末尾；是否少了收尾符号？）`——"看到 ''" 是废话，eof 的根因几乎总是"少个收尾符号"，直接把猜测给出来（05 册码帧一节的落地）；
- **码统一 E0301**：v0.1 的语法错误单码——与 05 册 lexer 的 E0101 同一粒度取舍，码段（E03xx）是接口承诺、细分是内部自由。

`error()` 返回 ParseError 而不是直接抛，是个容易忽略的细节：**"造错误"与"抛错误"分离**——调用方可以先攒着、包一层上下文再抛（`consume` 就是造完立刻抛）。若以后做"错误路径上下文补充"（比如报"函数声明体内"），改的全是 error()/调用点这一层。

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

### 语句层走读：declaration 的 try/catch 边界

`declaration()` 是 05 册恢复策略的落地处（本册骨架里留了注释占位）：

```ts
private declaration(): Decl {
  try {
    if (this.match('fn')) return this.fnDecl();
    return this.statement();
  } catch (e) {
    if (e instanceof ParseError) {
      this.synchronize();
      return this.errorStmt(e);            // 占位节点：05 册的"保持形状"
    }
    throw e;                               // 非 ParseError 是代码 bug，原样重抛
  }
}
```

三个边界值得看清：**try 的范围只包"一条语句"**——包整个循环会让一个错误终止全文件解析（级联的反面教材）；**catch 只认 ParseError**——TypeError 之类的实现 bug 绝不被恢复机制消化（05 册"产品错误与实现 bug 分流"的兑现）；**返回占位节点而非 undefined**——body 的语句序列与源码位置对齐，sourcemap/诊断才有的放矢。`statement()` 的 switch 是 02 册 LL(1) 分派表的直接翻译：六个开头 token 两两互异，`exprStmt` 兜底（兜底调用的是 `parseExpr(0)`，完整绑定力表——03 册"语句层兜底别写死层级"的陷阱在此规避）。

### 三个产生式的翻译核对

对着 02 册的五条翻译规则逐条核对上面三个函数（这是"从代码反读文法"的练习场）：

| 函数片段 | 规则 | 对应产生式 |
|---|---|---|
| `consume('let')` → `consume('ident')` → … | 终结符 → consume；连接 → 顺序 | `letDecl → "let" ident typeAnn? "=" expr ";"` |
| `this.match(':') ? this.typeRef() : undefined` | 可选 → try/match | `typeAnn?` |
| `this.parseExpr(0)` | 非终结符 → 递归 | `expr` |
| `while (!this.check('}') && !this.check('eof'))` | 重复 → while 检查开头 | `stmt*` |
| `els = this.check('if') ? … : this.block()` | 选择 → 按前瞻分派 | `else → "if" ifStmt \| block` |

核对无误 = 代码与文法失同步的风险归零。**写完每个 parse 函数就做一遍这个五问**，比写完整个 parser 再调试便宜得多——02 册"对应是双向的"一节的实践版。

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

### parseExpr 循环的两道闸

主循环的返回条件是一行、两道闸：

```ts
const bp = Parser.INFIX[t.type];
if (!bp || bp[0] < minBp) return left;
```

- **第一道 `!bp`（查表 miss）**：来犯不是中缀 token（`;`、`)`、`}`、eof…）——直接返回。03 册"常见误区"里那道"教学版省略的闸"，在本实现里**必须存在**：没有它，`a;` 的 `;` 会以 bp=0 参与 `0 < 0` 的比较然后被误吃；
- **第二道 `bp[0] < minBp`（优先级比较）**：来犯是中缀但"当前层不让它吃"。两道闸合起来才是"归还控制权"的完整语义——**miss 返回是结构性的（这不是我的操作数），minBp 返回是优先级的（是你的操作数，但轮不到我吃）**。

对着 03 册推演一（`a + b * c == d`）用本实现重跑一遍，逐步对上：步 6 `==` 在 minBp=12 层被第二道闸拦下、步 8 在 minBp=0 层通过——**03 册的纸面推演与本册的代码是同一台机器的两种投影**。验收标准里的"优先级自测：`20 + 22 * 2 == 44`"就是把这道对账固化成断言。

### prefix 的分派与"先吃后判"

`prefix()` 第一行 `const t = this.advance();` 先消费再判型——这个顺序有两个后果，写测试前必须知道：

1. **抛错的 token 已经被消费**：`let y = ;` 的 `;` 在报"期待表达式"时 prev 已是它——05 册演算二的第二轮正是这个约定（synchronize 的 atEnd 闸门因此挡住 eof 误消费）。若改成"先判后吃"，synchronize 的 prev 位置全变，恢复边界要重新校准——**改游标纪律必须连着错误恢复一起改**；
2. **括号表达式不造节点**：`prefix` 的 `(` 分支解析完 `parseExpr(0)` + `consume(')')` 后**原样返回内层表达式**——`(a)` 与 `a` 的 AST 相同（ESTree 同款取舍）。副作用是 AST 快照看不出括号，语义无损（括号的作用就是覆盖优先级，解析完使命即尽）；若第八阶段 lint 需要"用户写过括号"的信息，从 token 流取，别往 AST 塞。

调用 `(` 的特判放在**主循环**而非 prefix：它出现时左边必有 callee——正是 03 册"超高中缀"（led 特判）的落地。两处 `(`（前缀括号/调用括号）由"出现位置"自然区分，无需 token 之外的判别——Pratt 分派时序的红利。

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

### 用例逐条读法

五条用例各盯一类恢复行为，与 05 册的两条演算对上号：

| 用例 | 盯什么 | 对应机制 |
|---|---|---|
| 201 少分号 | 同步点"不消费"的一面：`if` 命中同步点集合原样放行 | 05 册演算一 |
| 202 不配对 | 消费边界扩张后仍能收束：报 1 条、块结构恢复 | 同步点集合 + 占位节点 |
| 203 连环错 | 两轮恢复互不污染：恰好 2 条 | 05 册演算二（逐 token 全程） |
| 204 括号深渊 | eof 闸门：丢弃循环绝不吃 eof，报错话术带"起始于" | error() 的 eof 措辞 |
| 205 假错误陷阱 | 误报回归：合法输入必须 0 条 | 全部合法语料共担 |

写新用例时保持两条纪律：**一个用例一个机制**（混多错会互相掩护）；**每个用例旁边放一条合法语料**（205 型不是点缀，是回归网）。断言模板里 `every(d => d.code === 'E0301')` 这类**码段断言**值得保留在所有错误用例里——它同时验证了"该报的报了"与"不该报的没报"（若有假错混入，码段集合会变多或数量对不上）。

### 断言的第三个维度：AST 快照

错误用例只断言诊断数量还不够——**恢复后的 AST 形状也要钉住**：

```ts
test('201-少分号后 if 语句存活', () => {
  const { program, diagnostics } = parse(tokenize(readFixture('201.mini')).tokens);
  expect(diagnostics).toHaveLength(1);
  expect(print(program)).toMatchFileSnapshot('__fixtures__/errors/201.ast.snap');
});
```

快照把"恢复成功"从口头断言变成可 diff 的事实：201 的快照里应能看到占位节点与完整的 `IfStmt` 并列。**诊断数量管"报了几个"、AST 快照管"剩下的树长什么样"**——两个维度缺一，恢复逻辑的回归就只剩人肉肉眼。打印器（05 册"AST 快照与打印"）在这里第一次投入生产。

### 调试流程：快照不匹配时的四步定位

开发期最常见的现场是"快照 diff 出了一坨红"。固定四步，不要凭感觉改代码：

1. **最小复现**：把失败 fixture 砍到最短仍失败的输入（比如 `20 + 22 * 2` 快照错，先试 `22 * 2`、再试 `20 + 22`）——二分掉无关语法；
2. **读 diff 的第一行**：第一个不同的节点是"多了/少了/错位"哪种？少了 → 某分支没走（查 INFIX 表项或分派 token）；错位 → 优先级数值（查两道闸）；区间漂移 → span 的 start 基准（查哪个 consume 时机变了）；
3. **上打印机不上调试器**：把中间状态的树打印出来（05 册的镜子），两棵树并排——比单步跟栈快一个量级；
4. **修完先跑合法语料**：确认 0 诊断与全部合法快照不变，再让失败快照转绿——防止"修好一个错例、弄坏三个对例"。

第 2 步的三分类（少节点/错结构/漂区间）覆盖绝大多数 parser bug，根源分别对应：分派条件、绑定力与闸、游标时序——**三类 bug、三个责任人区域**，定位时先归类再进代码。

## 验收标准

- [ ] 全部合法语料（第一阶段的 10 例 + 表达式补充样例）诊断 0 条，AST 快照过。
- [ ] 20+ 错误用例：每个错误数 ≤ 真实 + 1，无误报用例（205 类）。
- [ ] 优先级自测：`20 + 22 * 2 == 44` 的 AST 嵌套层次正确（乘内层、比较外层）。
- [ ] 右结合自测：`a = b = c` 为 `a = (b = c)`。
- [ ] fuzz：随机 token 序列 1000 组，`parse` 不 throw、不死循环（超时保护）。
- [ ] 导出 API：`parse` + AST 类型 + `ParseError`——第四阶段 checker 只依赖这些。

### 验收条目的实现提示

几条验收的实现要点，卡住时按此排查：

- **fuzz 的输入是"随机 token 序列"不是随机字节**——lexer 已 fuzz 过字节，parser 的 fuzz 应从合法 token 池抽样（含大量括号/分号，专打嵌套与恢复）；超时保护用"计数器上限"（比如单次 parse 最多消费 tokens.length × 50 个游标动作，超出即判死循环）比真用 timer 稳定可测；
- **优先级/右结合自测写成 AST 快照**：`20 + 22 * 2 == 44` 与 `a = b = c` 各一张快照——比手写嵌套对象断言可读，且天然覆盖区间字段；
- **"无误报用例（205 类）"要与合法语料全量并跑**：第一阶段的 10 例 + 表达式补充样例全过 0 诊断，才算"不无中生有"——只跑 205 一条不够；
- **导出 API 检查**：`index.ts` 的 export 列表 diff 进 CI（或最简单：一条测试 `expect(Object.keys(await import('./index')))`）——接口冻结靠机器守，不靠自觉。

## 阶段性回顾

到这里，mini 语言的前端主体完工：**字符流 → token 流 → AST + 诊断**。第四阶段给这棵树装"理解力"（作用域与类型），第五阶段把它降级为字节码。你现在拥有的是一个**能对任意残缺输入保持体面**的 parser——这在后面每个阶段都会持续回收投资。

### 下一站：checker 会怎么消费这棵树

接口冻结表（第一册 lexer 建立的打法）在此续写，第四阶段的期待清单：

| checker 拿到什么 | 用来做什么 |
|---|---|
| `Program` + 完整 span | 作用域建帧（Block 开帧）、诊断定位（行首表换算） |
| `diagnostics`（词法 E01xx + 语法 E03xx） | **透传**——checker 的输出 = 自己的诊断 + 上游诊断，一次构建报全部 |
| `Token.lexeme`（若需要原文） | 提示信息里的词面（"变量 `变量名` 未声明"） |

透传那条最值得现在想明白：**错误通道是流水线级的串联**——每个阶段消费上游诊断、追加自己的、整体下传。本册验收的"每错误 ≤ 真实 + 1"若失守，污染的不再是一个阶段的测试，而是下游所有阶段的诊断快照。**前端三册的测试纪律是同一条纪律在三层的重复：合法零误报、错误不级联、位置可回溯。**

## 自测

1. 游标方法表里"`consume` 该用没用"的症状是"结构缺失静默"：构造一个输入，让 `letDecl` 里的 `consume('=')` 换成 `match('=')` 后不报错但 AST 缺字段，说明 checker 会因此在哪一步栽跟头。
2. `prefix()` 改成"先判型后消费"后，重推 05 册演算二的第二轮：synchronize 的 prev、恢复边界各变成什么？这个改动值不值得？
3. `parseExpr` 的两道闸各拦什么？构造两个输入，分别只有一道闸能拦住（另一道拦不住）。
4. `let x = (1 + 2);` 的 AST 里为什么找不到括号？若 lint 需要报"多余的括号"，信息从哪里取？
5. fuzz 用"随机 token 序列"而非随机字节的原因是什么？两条 fuzz（lexer 对字节、parser 对 token）的 oracle 各是什么？
6. 接口冻结表给 checker 的三样东西里，哪一样坏了会让"一次编译报全部错误"失效？为什么？

第三阶段至此收工。带着这棵树与诊断通道，下一站 [02-符号表与作用域](../04-第四阶段/02-符号表与作用域.md)——AST 即将开始"被理解"。
