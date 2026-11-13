# AST 设计与错误恢复

> [返回：第三阶段导览](01-导览.md)
> 对应大纲第 4 条。AST 是前三阶段的最终产物、后四阶段的核心输入——它的类型设计决定 checker/ir/optimizer 的编写体验。本册定稿 mini AST 类型体系，并解决"一次报多个错"的错误恢复。

## 节点体系：三大 union + 判别字段

mini AST 与 ESTree 同构（节点名对齐、字段对齐），分三大类：

```ts
// ---------- 表达式 ----------
export type Expr =
  | NumberLiteral | StringLiteral | BoolLiteral
  | Identifier
  | UnaryExpr | BinaryExpr | LogicalExpr      // Logical 单列：短路求值（第五阶段要特判）
  | AssignExpr | CallExpr;

export interface BinaryExpr {
  readonly type: 'BinaryExpr';
  readonly op: '+' | '-' | '*' | '/' | '%' | '<' | '>' | '<=' | '>=' | '==' | '!=';
  readonly left: Expr; readonly right: Expr;
  readonly start: number; readonly end: number;
}
// NumberLiteral: { type, value: number, start, end } ……全族同构，略

// ---------- 语句 ----------
export type Stmt =
  | ExprStmt | LetDecl | IfStmt | WhileStmt | Block | ReturnStmt;

export interface IfStmt {
  readonly type: 'IfStmt';
  readonly cond: Expr;
  readonly then: Block;                 // 强制块：没有"单语句裸奔"，AST 少一个变体
  readonly else?: IfStmt | Block;       // else-if 链：else 直接挂下一个 IfStmt
  readonly start: number; readonly end: number;
}

// ---------- 声明与程序 ----------
export type Decl = FnDecl | Stmt;

export interface FnDecl {
  readonly type: 'FnDecl';
  readonly name: string;
  readonly params: readonly { name: string; typeAnn?: TypeAnn }[];
  readonly retType?: TypeRef;
  readonly body: Block;
  readonly start: number; readonly end: number;
}

export interface Program {
  readonly type: 'Program';
  readonly body: readonly Decl[];
  readonly start: number; readonly end: number;
}
```

四条设计决策的理由：

1. **discriminated union**：每个节点第一个字段 `type` 是字面量类型——TypeScript 的 `switch (n.type)` 自动窄化，checker/optimizer 里零类型断言。这是 TS 写编译器的最大红利。（这其实是**代数数据类型（ADT）**的手工实现：节点体系 = sum of products，`type` 字段就是代数意义上的 tag——展开见[第四阶段补充分册：代数数据类型与模式匹配](../04-第四阶段/06-代数数据类型与模式匹配.md)。）
2. **Logical 单列于 Binary**：`&&`/`||` 的求值是短路的（第五阶段 lowering 不同、第四阶段类型规则不同），与普通二元分开在前面每个阶段都少一次 `if (isLogical)`。
3. **`else?: IfStmt | Block`**：`else if` 不是特殊语法，就是 else 分支挂了个 IfStmt——树高但统一，遍历代码零特判。
4. **强制块**：`if (c) singleStmt` 直接非法。少一个 AST 变体、少一类风格争论——语言设计的"减法"直接变成编译器的"减法"。

与 ESTree 的差异仅两处：`IfStmt`（ESTree 叫 IfStatement）与保留 `start/end` 数字偏移（ESTree 是对象 `{start, end}`——数字在 TS 里更顺手，且与 Token 一致）。**同构的价值**在第八阶段兑现：你写 Babel 插件时的肌肉记忆直接迁移。

## source span 与合成节点

- 每个节点带 `start/end`（UTF-16 偏移，与 Token 一致）。**构造节点时用子节点的区间并集**—— parser 工具函数统一处理，见 06 册的 `span()`。
- **合成节点**（synthetic）：语法糖脱糖、宏展开产生的节点没有真实源码区间，约定 `start === end`（空区间）。第四阶段的诊断与 sourcemap 对空区间"跳过定位"——现在花一行约定，将来少一类诡异 bug。

## 遍历：visitor 不急着上

前三阶段用**手写递归函数**遍历（`checkExpr/checkStmt` 各自 switch）；等第七、八阶段出现"同一棵树多种变换"，再抽 visitor。提前抽象的代价：类型窄化被回调打散、调用栈变深、调试跳来跳去。Babel 的 visitor（`path` 抽象）要到第八阶段才真正需要——**按需演进**。

## 错误恢复：同步点与防级联

目标：**一次编译报出全部独立错误**。策略三层：

**1. 语句级同步（panic mode）**：解析一条语句失败 → 报错 → **丢弃 token 直到同步点**（`;`、`}`，或下一个语句开头关键字 `fn/let/if/while`）→ 继续解析下一条语句：

```ts
function synchronize(): void {
  while (!atEnd()) {
    if (prev().type === ';') { advance(); return; }
    switch (peek().type) {
      case '}': case 'fn': case 'let': case 'if': case 'while': case 'return':
        return;                        // 同步点：新语句的开头
      default: advance();
    }
  }
}

function declaration(): Decl {
  try {
    if (match('fn')) return fnDecl();
    return statement();
  } catch (e) {
    if (e instanceof ParseError) {     // ParseError：携带位置的诊断已入列
      synchronize();                   // 跳到安全点，继续
      return errorStmt(e);             // 占位节点：保持 AST 形状完整（可带下游跑出更多错）
    }
    throw e;                           // 非 parse 错误（bug）不吞
  }
}
```

**2. 块级同步**：块内语句恢复后，`}` 永远是硬同步点——绝不能把 `}` 丢掉，否则外层块跟着塌（级联的常见来源）。

**3. 防级联的量化验收**：错误用例的断言不是"报了错"而是"**报错数 ≤ 真实错误数 + 1**"。误报的根源通常两个：恢复点选太远（吞掉了合法语句）、占位节点缺失（下游在残缺 AST 上崩）。

## 对照 acorn：两个工程样本

**ASI 的实现**：acorn 的 `semicolon()`——期待 `;` 时若当前 token 在行首或 `}`/EOF，**视为隐式分号**（记录 `start` 供 sourcemap），否则报错。词法/语法协同：分号插入发生在 parser 而非 lexer（因为需要"行首"这个语法上下文）。

**宽松模式（sloppy mode）**：acorn 大量 `if (this.inFunction) ...`、`if (this.options.ecmaVersion >= N) ...` 的分支——文法不再是静态的纯函数，而是**带状态的文法**。这就是"文法在我脑中、代码在我手中"的代价与自由：同一个函数体里装下 30 年的语言演化。

## 自测

1. 画出 `if (a) { b(); } else if (c) { d(); } else { e(); }` 的 IfStmt 树——`else-if` 链为什么"零特判"？
2. `LogicalExpr` 与 `BinaryExpr` 分开的两阶段理由分别是什么？（第四/第五阶段各一个）
3. `synchronize` 为什么把 `}` 设为"不消费的同步点"，而 `;` 要消费掉？
4. 给"错误数 ≤ 真实 + 1"设计一个反例输入，让你的初版 parser 超标——然后修它。
