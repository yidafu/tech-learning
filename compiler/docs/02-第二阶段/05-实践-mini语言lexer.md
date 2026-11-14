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

## 实现走读：每个分支对应前三册的哪一节

主循环的分支序列照抄 [03-手写lexer](03-手写lexer.md) 的骨架，这里把"分支 → 依据"的对应钉死，读代码时手边放这张表：

| 分支（按代码顺序） | 依据 | 关键机制 |
|---|---|---|
| 空白（显式四字符） | 03 册主循环 | 只动指针不产出 |
| 行注释 `//` | 同上 | 吃到 `\n` 为止（`\n` 留给空白分支） |
| 块注释 `/* */` | 03 册注释 / 04 册未闭合 | 不支持嵌套；未闭合报错后**终止**扫描 |
| 数字 | 03 册数值字面量 + 04 册整词校验 | 整词扫描 + `NUM_RE` 终检 |
| 字符串（三引号/单双引号） | 03 册字符串 | 转义表；未闭合产出残缺 token |
| 标识符/关键字 | 03 册关键字表 | 吃满再查 `KEYWORDS` |
| 双字符运算符 | 03 册最长匹配 | `TWO_CHAR` 先查 |
| 单字符运算符 | 同上 | `SINGLE_CHAR` 兜底 |
| 非法字符 | 04 册恢复策略 | 报错跳 1，绝不 throw |

两个次序上的细节：**空白分支在最前**（最高频，早判早走）；**双字符表先于单字符**（最长匹配，03 册裁决序）。任何一处次序调换，行为立刻变——这就是"词法的正确性依赖分支排列"的现场版。

### 实现走读：数值扫描的占位写法

看这段占位循环的真实行为（读代码要读到这一步）：

```ts
while (pos < src.length && /[0-9.eExXa-fA-F+-]/.test(src[pos]) &&
       !(src[pos] === '+' || src[pos] === '-') && true) {
  if (!/[0-9.eExXa-fA-F]/.test(src[pos])) break;
  pos++;
}
```

外层条件含 `+-`、内层条件又把它们排除——净效果是 **`+`/`-` 永远不会被吃进数字词**。于是 `1e+3` 的扫描在 `e` 后停下，词面是 `1e`，`NUM_RE` 校验失败，报"非法数字字面量 '1e'"，`+3` 由后续分支接手。这就是"保守集合"的代价：**合法输入被误伤**（`1e+3` 是 03 册状态机明确接受的形状）。为什么当初敢这么写？因为错误通道是健全的——误伤被"恰好一条诊断"兜住，不会静默出错值。这正是 04 册"先建立恢复通道、再逐步收紧规则"的工程次序。练习点 1 的修法就是 03 册那张状态机图：`e/E` 之后才允许 `+/-` 进集合（一个 `seenExp` 标志位即可）。

### 实现走读：三引号与单引号的两条路径

字符串分支先判三引号（`src.startsWith(c.repeat(3), pos)`）再走普通路径，两条路径的取舍：

- **三引号路径**：`indexOf` 找闭合、`slice` 取原文——**raw 语义**，无转义、可跨行。用 `indexOf` 而不是手写循环是把"找子串"交给宿主优化；代价是闭引号前的全部内容一次切片（大文件大字符串时内存峰值），教学规模无所谓，工业 lexer 会用手写循环流式消费；
- **单双引号路径**：逐字符循环，`\` 触发转义表，`\n` 直接 `break`（单行字符串不跨行）——**未闭合的判定与 04 册的边界估计一致**：撞到换行或 EOF 都算未闭合，报错后产出残缺 token，pos 停在原处（换行由下一轮空白分支吃掉）。

注意两条路径对 `literal` 的填充：三引号填 raw 原文、普通路径填解码后的 value——同一个字段两种语义，读 AST 时要记得 string 节点的 value **不总是解码产物**（v0.1 的已知简化，第四阶段 checker 不依赖它即可）。

### 实现走读：fixture 002 的完整产出

对着语料 `let s = "a\tb\n";`（002-string.mini 的骨架）把实现跑一遍，得到：

| # | type | lexeme | literal | 说明 |
|---|---|---|---|---|
| 1 | `let` | `let` | — | KEYWORDS 命中 |
| 2 | `ident` | `s` | — | 查表 miss |
| 3 | `=` | `=` | — | 双字符表查 `=␠` miss，单字符兜底 |
| 4 | `string` | `"a\tb\n"`（原文 8 字符） | `a␉b␊`（解码后 4 字符） | 转义表两次命中 |
| 5 | `;` | `;` | — | 单字符 |
| 6 | `eof` | `` | — | 主循环出口补 |

这张表就是快照文件 `002-string.tokens.snap` 的内容来源。**手工算出期望序列 → 快照对答案**是本阶段的基本功：快照测试的价值不是"替你写期望"，是"把你的期望钉在文件里，改动时逼你重看一遍"。第三阶段 AST 快照沿用同一打法。

### 实现走读：单码 E0101 的简化与接口承诺

04 册的 `Diagnostic` 接口里 code 是 `'E0001' | 'E0002' | ...` 的联合类型加 `nextCode(message)` 分派；本实现把它简化成**单码 `E0101`** 覆盖全部词法错误。这是刻意的：错误码的**段**（E01xx = 词法）是给第三阶段的接口承诺，段内的细分码是内部实现自由——测试断言码段前缀而非具体码，parser 就不会被词法错误分类的调整波及。**接口冻结冻的是段，不是每一码**——这个粒度选择本身就是一条工程经验。

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

### 语料的组织：编号即分类

fixture 命名把分类编码进文件名，三个约定：

- **编号段分性质**：`0xx` 合法、`1xx` 词法错误（第三阶段沿用 `2xx` 语法错误，见 [06-实践-mini语言parser](../03-第三阶段/06-实践-mini语言parser.md) 的 201~205）——看到编号就知道断言形态（诊断 0 条还是恰好 N 条）；
- **合法语料一次多样**：001 一行覆盖四则与优先级、003 同时含两种注释——每个文件尽量多踩几个分支，20 个文件的语料面覆盖全部 token 类型；
- **错误语料一次一错**：101 只放 `$`、104 只放非法转义——"恰好一条诊断"的断言只有在每个文件只含一个错误时才成立。混多错会掩盖级联（本该 1 条报成 3 条却因为互相掩护而过测）。

fixture 用文件而不是内联字符串，还有一个隐性收益：**语料可以被其他阶段的测试复用**——parser 快照、checker 诊断、VM 求值全部读同一批文件，"同一输入贯穿流水线"是全站测试策略的地基（第一阶段工程约定就定了这一条）。

### 快照测试的口径：为什么只快照 `type:lexeme`

骨架里快照的是 ``tokens.map(t => `${t.type}:${t.lexeme}`)``，不是完整 Token。口径差异：

| 快照内容 | 优点 | 缺点 |
|---|---|---|
| 完整 JSON（含 start/end/literal） | 一张快照验证所有字段 | 改一处空白全量重录，diff 噪声大 |
| `type:lexeme`（本实现） | diff 聚焦结构变化 | start/end、literal 需另测 |

被快照省略的字段并没有裸奔：**区间用不变量断言补**（验收第 3 条的 `src.slice(t.start, t.end) === t.lexeme` 全量跑一遍）、**literal 用错误样例补**（非法字面量的残缺 token 不带 literal）。**快照管形状、不变量管正确性**——两层合起来才等价于"完整 Token 快照"，而 diff 噪声小一个量级。

## 验收标准

- [ ] 20 个合法样例：诊断 0 条、token 快照全过。
- [ ] 10 个错误样例：每个**恰好一条**诊断（不多报、不漏报）。
- [ ] 全部 token 的 start/end 覆盖原文（`src.slice(t.start, t.end) === t.lexeme` 恒成立——加一个全量断言测试）。
- [ ] `tokenize` 对任意输入不 throw（fuzz 一轮随机字节验证）。
- [ ] 导出 API 只有 `Token/TokenType/Diagnostic/LexResult/tokenize` 六个名字——接口即契约，第三阶段 parser 只依赖这些。

### 验收标准的逐条解读

五条验收不是清单仪式，每条都在锁一类 bug：

- **20 合法样例快照全过**：锁"识别正确性"——token 类型与词面；
- **10 错误样例恰好一条**：锁"恢复正确性"——不多报（级联）不漏报（静默吞错）；
- **区间覆盖不变量**：锁"位置正确性"——这是全流水线报错/sourcemap 的根基，单独全量断言跑在每个测试里；
- **fuzz 不 throw**：锁"健壮性"——任意字节序列进、结构化结果出，异常 = 词法器有没设防的路径；
- **API 面冻结**：锁"依赖方向"——parser 只许 import 这六个名字，将来词法内部怎么重构都不越界。

### fuzz 的实现要点

fuzz 一轮的构成（约 15 行测试代码）：

```ts
// 伪代码：随机字节 → tokenize → 三条 oracle
const input = randomBytes(round);        // 可混入语料片段拼接（变异测试）
const { tokens, diagnostics } = tokenize(input);
expect(() => tokenize(input)).not.toThrow();              // 1. 永不 throw
for (const t of tokens)
  expect(input.slice(t.start, t.end)).toBe(t.lexeme);     // 2. 区间不变量
expect(tokens[tokens.length - 1].type).toBe('eof');       // 3. eof 收尾
```

三条 oracle 对应三类失败模式：throw（没设防的分支）、区间漂移（pos 与 slice 不同步）、eof 缺失（主循环出口漏掉）。**语料拼接式变异**（从合法语料随机截段再拼错误片段）比纯随机字节更容易打中边界——纯随机的 `$` 满天飞反而很难凑出三引号嵌套这类结构边界。fuzz 失败时的最小复现要存档成新的错误语料（`1xx` 加一条）——**fuzz 的产出是语料，不是修复补丁**。

## 与下一阶段的接口

parser 将以 `Token.type` 的**前瞻一个 token**驱动（递归下降 + Pratt 的输入都是 `tokens[at]`）。也就是说：lexer 的产品规格 = token 类型全集 + `eof` 哨兵 + 位置三件套。这个接口一旦冻结，parser 开发期间 lexer 的任何内部重构（性能、trivia）都不再影响下游——分阶段解耦的第一份真实收益。

### 接口冻结：冻什么、放什么

"冻结"是双向承诺，边界画在这里：

| 冻结（第三阶段依赖） | 不冻（内部自由） |
|---|---|
| `TokenType` 全集与语义 | 错误码段内的细分（E0101 可拆 E0102…） |
| `Token` 五字段与区间语义 | 内部辅助函数、字符分类的写法 |
| `eof` 哨兵保证 | 数值扫描的状态机重写（练习点 1） |
| `LexResult` 双通道形状 | trivia 记录的加做（练习点 2，只增不改） |

练习点 2 尤其值得看清：加 trivia 是**只增不改**——`LexResult` 加一个可选字段，老调用方零感知。冻结不是封死演进，是把演进约束在"下游无感"的方向上。

### Token 流的交付形态：数组够吗

mini 交付 `Token[]` 数组。工业界有另一形态——**惰性迭代器**（V8 scanner 按需吐 token）：

| 形态 | 优点 | 代价 |
|---|---|---|
| 数组（mini） | 随机访问（Pratt 常用 peek）、可重复遍历、测试直观 | 全量物化，大文件内存峰值 |
| 迭代器 | 增量友好（IDE 只扫新 token）、零物化 | 只能向前 peek、重放要自己缓存 |

mini 选数组的原因写在 06 册的用法里：parser 是 `tokens[this.at]` 的随机访问游标，数组让游标三件套一行一个。第五阶段 REPL 场景（逐行喂输入）若嫌物化重，届时给 `tokenize` 包一层流式适配即可——**接口冻结让这类改造是纯内部事务**。

## 自测

1. 走读数值扫描占位循环：`1e+3` 在当前实现下产出哪些 token 与几条诊断？练习点 1 修好后各变成什么？
2. 三引号字符串用 `indexOf` 找闭合在教学实现里为什么可接受？写出它在什么输入规模/形态下开始难受，以及工业版的替代结构。
3. "错误语料一次一错"的约定若被打破（一个文件放两个错误），哪一类 bug 会因此漏测？回想 04 册的错误级联定义。
4. 快照只含 `type:lexeme`，区间与 literal 各由哪条验收补位？为什么"完整 JSON 快照"不是更强的方案？
5. fuzz 的三条 oracle 各自针对哪类失败？为什么说"fuzz 的产出是语料"？
6. 接口冻结表里"错误码段内的细分"属于不冻侧：给出一个具体的拆码方案（未闭合字符串、非法转义分开），说明为什么拆了不破坏第三阶段。

本册交付后，第二阶段收工。带伤扫描也能保持结构完整的 token 流，即将进入 [02-自顶向下LL族](../03-第三阶段/02-自顶向下LL族.md)——语法层见。
