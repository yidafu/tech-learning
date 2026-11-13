# 手写 lexer：工程实现

> [返回：第二阶段导览](01-导览.md)
> 对应大纲第 2 条。本册是 mini lexer 的主体工程课：Token 结构、主循环、最长匹配、各类字面量的状态机，以及 JS/Python 两个"词法参与语法"的特例。

## Token 结构设计

```ts
export type TokenType =
  // 字面量
  | 'number' | 'string'
  // 标识符与关键字（关键字在扫描后查表升级）
  | 'ident'
  | 'fn' | 'let' | 'if' | 'else' | 'while' | 'return'
  | 'true' | 'false' | 'numberTy' | 'stringTy' | 'boolTy' | 'unitTy'
  // 运算符与标点
  | '+' | '-' | '*' | '/' | '%' | '=' | '==' | '!='
  | '<' | '>' | '<=' | '>=' | '&&' | '||' | '!'
  | '(' | ')' | '{' | '}' | ',' | ';' | ':' | '->'
  // 控制
  | 'eof';

export interface Token {
  readonly type: TokenType;
  readonly lexeme: string;     // 原始文本，永远保留（错误信息与 sourcemap 要用）
  readonly literal?: number | string;  // 解析后的值（仅字面量）
  readonly start: number;      // 源码偏移（含）
  readonly end: number;        // 源码偏移（不含）
}
```

设计要点：

- `lexeme` 与 `literal` 分开：`"3.14"` 的 lexeme 是六个字符，literal 是数值 3.14。**lexeme 永不丢弃**——诊断、sourcemap、minify 全靠原文。
- `start/end` 用偏移量而非 行:列——偏移是机器友好形态，行列在**报错时**才换算（见下一册的行首表）。
- 关键字不单独扫描：先按 ident 扫完整词再查保留字表——DFA 只需要"标识符"一个模式，关键字是**词表**不是**状态**。

## 主循环骨架

```ts
export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const isDigit = (c: string) => c >= '0' && c <= '9';
  const isIdentStart = (c: string) => /[A-Za-z_$\p{ID_Start}]/u.test(c);
  const isIdentPart  = (c: string) => /[0-9A-Za-z_$\p{ID_Continue}]/u.test(c);

  while (pos < src.length) {
    const start = pos;
    const c = src[pos];

    if (/\s/.test(c)) { pos++; continue; }          // 空白：跳过
    if (c === '/' && src[pos + 1] === '/') {        // 行注释
      while (pos < src.length && src[pos] !== '\n') pos++;
      continue;
    }

    if (isDigit(c))            { tokens.push(number_()); continue; }
    if (c === '"' || c === "'") { tokens.push(string_()); continue; }
    if (isIdentStart(c))       { tokens.push(identOrKeyword()); continue; }
    const op = operator();                           // 运算符/标点
    if (op) { tokens.push(op); continue; }

    // 走到这里 = 非法字符：报错并跳过（错误恢复见下一册）
    report(pos, `意外字符 '${c}'`); pos++;
  }
  tokens.push({ type: 'eof', lexeme: '', start: pos, end: pos });
  return tokens;
}
```

这个 `while + 分类 → 子程序` 的骨架就是上一册"直接编码 DFA"的落地产物：每个 `if` 分支是一组转移，子程序是接收状态的消费动作。

## 最长匹配（maximal munch）

规则：**永远吃掉能构成合法 token 的最长字符序列**。`>=` 决不能切分成 `>` 和 `=`。实现：运算符扫描先查双字符表、再退回单字符：

```ts
const TWO_CHAR = new Set(['==', '!=', '<=', '>=', '&&', '||', '->']);

function operator(): Token | undefined {
  const two = src.slice(pos, pos + 2);
  if (TWO_CHAR.has(two)) return makeToken(two as TokenType, 2);
  if ('+-*/%=<>!(){},;:'.includes(src[pos]))
    return makeToken(src[pos] as TokenType, 1);
  return undefined;
}
```

贪心的坑也有：`a-1` 里 `-` 是减号，但 `a->b`（如果 mini 有 `->`）会抢走——所以**双字符优先、单字符兜底**的顺序不能反。JS 的 `/` 更典型：它可能是除号**或**正则字面量的开头——词法器必须看上文（前一 token 是否运算符位置）才能裁决。mini v0.1 不含正则字面量，刻意绕开这个泥潭。

## 数值字面量

```
123    十进制整数
3.14   小数（必须两侧都有数字：.5 与 5. 都非法）
0xFF   十六进制
1e3    指数
```

状态机（对应 DFA）：`整数部分 → (可选 . 分数部分) → (可选 e 指数部分)`。注意 `.5` 被拒绝是为了让 `.` 永远是标点——**词法歧义最小化是语言设计原则**，不是疏忽。解析成 `number` 用 `Number(lexeme)` 兜底（进制与指数它全认），但要防 `1e`、`1.2.3` 这类残缺——在扫描状态机里拒绝即可，别把残缺词扔给 `Number`。

## 字符串：转义与多行

```
"a\tb\n"        双引号 + 转义
'...'           单引号同权（v0.1 起两者等价）
"""多行
   字符串"""     三引号原样（raw，无转义）
```

扫描逻辑：一个 `while (pos < len && src[pos] !== quote)` 循环，遇 `\` 消费两字符并解码转义（`\n \t \\ \" \0`），遇 `\n` 在单行字符串里即报"未闭合"。三引号模式吃一切直到 `"""`——它是**词法模式切换**的最简案例（复杂版就是 JS 模板串的 `${}` 模式栈）。

`literal` 的解码在扫描时一次完成（别在 parser 里再解码一遍——字面量的"值"属于词法产物）。

## 关键字表

```ts
const KEYWORDS = new Map<string, TokenType>([
  ['fn', 'fn'], ['let', 'let'], ['if', 'if'], ['else', 'else'],
  ['while', 'while'], ['return', 'return'],
  ['true', 'true'], ['false', 'false'],
  ['number', 'numberTy'], ['string', 'stringTy'],
  ['bool', 'boolTy'], ['unit', 'unitTy'],
]);

function identOrKeyword(): Token {
  const start = pos;
  while (pos < src.length && isIdentPart(src[pos])) pos++;
  const text = src.slice(start, pos);
  return { type: KEYWORDS.get(text) ?? 'ident', lexeme: text, start, end: pos };
}
```

保留字策略：mini 采用**强保留**（`fn` 不能当变量名）。弱保留（contextual keyword，如 TS 的 `type`）需要 parser 反馈——那是第三阶段的话题，v0.1 不碰。

## Unicode 与性能细节

- 标识符分类用 `\p{ID_Start}` / `\p{ID_Continue}`（Unicode 标准，不是"字母数字"的想当然）——上面骨架里的 `u` 正则已就位。
- JS 字符串是 UTF-16：`'𝕕'.length === 2`（代理对）。偏移量按 UTF-16 code unit 计（与 ESTree/JS 引擎一致），报错换算行列时同理——**不要自己发明"按码点计数"的第三种偏移**，会和生态打架。
- 性能三则：缓存 `src.length`；`src[pos]` 比 `charAt` 直接；高频分类（数字/空白）用手写区间比较、正则只用于低频的 Unicode 类别。词法是编译器里跑得最频繁的循环之一，但**先正确再快**——第三阶段前不需要任何微优化。

## 两个特例：ASI 与缩进敏感

**JS 的分号自动插入（ASI）**：词法器在"换行 + 下一 token 无法接续当前语句"时插入 `;`。规则三条：`}` 后、行尾遇受限产生式（return/break/continue/throw）、下一行开头会拼出非法 token。经典坑 `return \n value`——ASI 在 return 后插了分号，value 成了死代码。**词法器读到了"语句能不能接续"的语法信息**，这是词法/语法边界被语言设计者主动打通的例子。

**Python 的缩进**：词法器维护缩进栈，行首缩进变深产出 `INDENT` token、变浅产出 N 个 `DEDENT`、与栈顶比较不等则报错。**BLOCK 结构被编码进 token 流**，parser 因此不需要块产生式。代价是空行/注释/续行的词法规则极其琐碎——两站式设计（词法给语法让渡部分结构职责）的代价样本。

mini v0.1 用显式 `{}` + 强制 `;`——两个特例都写进笔记是为了**理解边界可以被怎样移动**，不是照抄。

## 自测

1. 写出 `x1 >= 3.14e2  // note` 的完整 token 序列（含每个 token 的 start/end）。
2. 为什么双字符运算符必须先于单字符匹配？给出一个反例输入。
3. `.5` 被拒绝的真实理由是什么？如果允许它，`a.5` 会被怎么切分？
4. `"""a\ntimes"""` 里 `\n` 是转义换行还是字面两个字符？为什么三引号模式这样设计？
