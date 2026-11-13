# 实践：mini 语言 lexer 完整实现

> [返回：第二阶段导览](01-导览.md)
> 对应第二阶段实践任务。本册交付 `packages/lexer` 的完整参考实现（可直接作为起点改造），附测试语料与验收标准。代码刻意朴素——没有微优化，每个分支都能对应到前三册的某一节。

## 完整实现

```ts
// packages/lexer/src/index.ts
export type TokenType =
  | 'number' | 'string' | 'ident'
  | 'fn' | 'let' | 'if' | 'else' | 'while' | 'return'
  | 'true' | 'false' | 'numberTy' | 'stringTy' | 'boolTy' | 'unitTy'
  | '+' | '-' | '*' | '/' | '%' | '=' | '==' | '!='
  | '<' | '>' | '<=' | '>=' | '&&' | '||' | '!'
  | '(' | ')' | '{' | '}' | ',' | ';' | ':' | '->'
  | 'eof';

export interface Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly literal?: number | string;
  readonly start: number;
  readonly end: number;
}

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

export interface LexResult {
  readonly tokens: Token[];
  readonly diagnostics: Diagnostic[];
}

const KEYWORDS = new Map<string, TokenType>([
  ['fn', 'fn'], ['let', 'let'], ['if', 'if'], ['else', 'else'],
  ['while', 'while'], ['return', 'return'], ['true', 'true'], ['false', 'false'],
  ['number', 'numberTy'], ['string', 'stringTy'], ['bool', 'boolTy'], ['unit', 'unitTy'],
]);

const TWO_CHAR = new Map<string, TokenType>([
  ['==', '=='], ['!=', '!='], ['<=', '<='], ['>=', '>='],
  ['&&', '&&'], ['||', '||'], ['->', '->'],
]);

const SINGLE_CHAR = new Map<string, TokenType>(
  [...'+-*/%=<>!(){},;:'].map(c => [c, c as TokenType] as const));

const NUM_RE = /^(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\d*\.\d+)(?:[eE][+-]?\d+)?)$/;
const ESCAPES: Record<string, string> = { n: '\n', t: '\t', '0': '\0', '\\': '\\', '"': '"', "'": "'" };

const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdentStart = (c: string) => /[\p{ID_Start}_$]/u.test(c);
const isIdentPart = (c: string) => /[\p{ID_Continue}0-9_$]/u.test(c);

export function tokenize(src: string): LexResult {
  const tokens: Token[] = [];
  const diags: Diagnostic[] = [];
  let pos = 0;

  const push = (type: TokenType, from: number, literal?: number | string) =>
    tokens.push({ type, lexeme: src.slice(from, pos), literal, start: from, end: pos });
  const report = (from: number, to: number, message: string) =>
    diags.push({ code: 'E0101', message, start: from, end: to });

  scan:
  while (pos < src.length) {
    const start = pos;
    const c = src[pos];

    // 空白与注释
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { pos++; continue; }
    if (c === '/' && src[pos + 1] === '/') {
      while (pos < src.length && src[pos] !== '\n') pos++;
      continue;
    }
    if (c === '/' && src[pos + 1] === '*') {          // 块注释（不支持嵌套）
      pos += 2;
      while (pos < src.length && !(src[pos] === '*' && src[pos + 1] === '/')) pos++;
      if (pos >= src.length) { report(start, pos, '未闭合的块注释'); break; }
      pos += 2; continue;
    }

    // 数值：整词扫描 + 整词校验（残缺即整词报错，见 04 册）
    if (isDigit(c)) {
      while (pos < src.length && /[0-9.eExXa-fA-F+-]/.test(src[pos]) &&
             !(src[pos] === '+' || src[pos] === '-') && true) {
        // 简化处理：+- 只在 e/E 后合法，这里用保守集合并交给 NUM_RE 终检
        if (!/[0-9.eExXa-fA-F]/.test(src[pos])) break;
        pos++;
      }
      const text = src.slice(start, pos);
      if (!NUM_RE.test(text)) {
        report(start, pos, `非法的数字字面量 '${text}'`);
        push('number', start);
      } else push('number', start, Number(text));
      continue;
    }

    // 字符串：单/双引号（转义），三引号 raw
    if (c === '"' || c === "'") {
      if (src.startsWith(c.repeat(3), pos)) {          // 多行 raw 字符串
        pos += 3;
        const close = src.indexOf(c.repeat(3), pos);
        if (close === -1) {
          report(start, src.length, `未闭合的多行字符串（起始 ${start}）`);
          push('string', start, src.slice(pos)); pos = src.length;
        } else {
          const raw = src.slice(pos, close);
          pos = close + 3; push('string', start, raw);
        }
        continue;
      }
      pos++;                                           // 跳过开引号
      let value = '';
      while (pos < src.length && src[pos] !== c) {
        if (src[pos] === '\\') {
          const esc = src[pos + 1];
          if (esc in ESCAPES) { value += ESCAPES[esc]; pos += 2; continue; }
          report(pos, pos + 2, `非法转义 '\\${esc}'`); pos += 2; continue;
        }
        if (src[pos] === '\n') break;                  // 单行字符串不跨行
        value += src[pos++];
      }
      if (pos >= src.length || src[pos] === '\n') {
        report(start, pos, `未闭合的字符串（起始 ${start}）`);
        push('string', start, value);
        continue;
      }
      pos++;                                           // 跳过闭引号
      push('string', start, value);
      continue;
    }

    // 标识符 / 关键字
    if (isIdentStart(c)) {
      while (pos < src.length && isIdentPart(src[pos])) pos++;
      const text = src.slice(start, pos);
      push(KEYWORDS.get(text) ?? 'ident', start);
      continue;
    }

    // 运算符：双字符优先（最长匹配），单字符兜底
    const two = src.slice(pos, pos + 2);
    if (TWO_CHAR.has(two)) { pos += 2; push(two as TokenType, start); continue; }
    if (SINGLE_CHAR.has(c)) { pos++; push(c as TokenType, start); continue; }

    // 非法字符：报错跳过，绝不 throw（04 册）
    report(start, start + 1, `意外字符 '${c}'`);
    pos++;
  }

  tokens.push({ type: 'eof', lexeme: '', start: pos, end: pos });
  return { tokens, diagnostics: diags };
}
```

实现刻意留了三处粗糙（都是练习点）：

1. 数值扫描的字符集偏保守（`+-` 处理是占位写法）——练：用小状态机重写，使 `1e+3` 的 `+` 只在指数位被吃。
2. 行注释/块注释被直接丢弃——练：记录 trivia 区间（注释起止偏移列表），IDE 场景（第八阶段插件）会需要。
3. 转义表与 `ESCAPES` 顺序耦合——练：提取 `readEscape()` 并补齐 `\u{...}`。

## 测试语料

正常样例（节选，全套见 `__fixtures__/legal/`）：

```ts
// 001-arith.mini → 20 + 22 * 2;
// 002-string.mini → let s = "a\tb\n"; print(s);
// 003-comment.mini → /* 块注释 */ let x = 1; // 行注释
// 004-hex.mini → let mask = 0xFF;
// 005-raw.mini → let doc = """多行\n原样""";
// 006-unicode.mini → let 变量名 = 1;      // \p{ID_Start} 生效
```

```ts
// 快照测试骨架（vitest）
test('001-arith', () => {
  const { tokens, diagnostics } = tokenize(readFixture('001-arith.mini'));
  expect(diagnostics).toEqual([]);
  expect(tokens.map(t => `${t.type}:${t.lexeme}`)).toMatchFileSnapshot(
    '__fixtures__/legal/001-arith.tokens.snap');
});
```

错误样例（每条恰好一条诊断）：

```ts
// 101：意外字符 '$'          → 1 条 E0101
// 102：未闭合字符串 "abc     → 1 条（残缺 token 照常产出）
// 103：非法数字 1.2.3        → 1 条（整词跳过，不级联）
// 104：非法转义 "\q"         → 1 条（继续扫后续字符）
// 105：未闭合块注释          → 1 条
```

## 验收标准

- [ ] 20 个合法样例：诊断 0 条、token 快照全过。
- [ ] 10 个错误样例：每个**恰好一条**诊断（不多报、不漏报）。
- [ ] 全部 token 的 start/end 覆盖原文（`src.slice(t.start, t.end) === t.lexeme` 恒成立——加一个全量断言测试）。
- [ ] `tokenize` 对任意输入不 throw（fuzz 一轮随机字节验证）。
- [ ] 导出 API 只有 `Token/TokenType/Diagnostic/LexResult/tokenize` 六个名字——接口即契约，第三阶段 parser 只依赖这些。

## 与下一阶段的接口

parser 将以 `Token.type` 的**前瞻一个 token**驱动（递归下降 + Pratt 的输入都是 `tokens[at]`）。也就是说：lexer 的产品规格 = token 类型全集 + `eof` 哨兵 + 位置三件套。这个接口一旦冻结，parser 开发期间 lexer 的任何内部重构（性能、trivia）都不再影响下游——分阶段解耦的第一份真实收益。
