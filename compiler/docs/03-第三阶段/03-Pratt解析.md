# Pratt 解析：运算符优先级的统一模型

> [返回：第三阶段导览](01-导览.md)
> 对应大纲第 2 条（本阶段重点）。分层文法到八级优先级就是八层函数；Pratt 把"层数"压成一张**绑定力数值表**，前缀/中缀/后缀统一处理。acorn、swc、rustc、TypeScript 的表达式解析全是它的变体。

## 分层文法的痛

上一册的分层文法（expr → term → factor → unary → call → primary）每加一个优先级就加一层函数、每层函数结构雷同：

```ts
function expr()   { let l = term();   while (op('+'|'-'))  l = bin(l, term());   return l; }
function term()   { let l = factor(); while (op('*'|'/'))  l = bin(l, factor()); return l; }
function factor() { let l = unary();  while (op('*'|'/'))  /* 抄错一个就出 bug */ }
```

六个优先级 = 六个几乎相同的函数；改优先级顺序要在多个函数间搬代码；右结合（`=`、`**`）还得单独写递归变体。**优先级是数据，不是控制流**——这就是 Pratt 的出发点。

## 绑定力模型

给每个运算符一对数值 **(leftBp, rightBp)**（binding power）。解析表达式的主循环只有一条规则：

> 循环看下一个中缀运算符：若它的 **leftBp < 当前允许的最小绑定力 minBp**，就返回（把控制权交回调用者）；否则吃掉它，**用它的 rightBp 作为新的 minBp** 递归解析右操作数。

```ts
function parseExpr(minBp = 0): Expr {
  let left = parsePrefix();                    // 先解析一个前缀表达式
  for (;;) {
    const t = peek();
    const bp = infixBp(t.type);                // 中缀绑定力（无则 0）
    if (bp.left < minBp) return left;          // 归还控制权
    advance();
    const right = parseExpr(bp.right);         // 关键：用右绑定力递归
    left = { type: 'BinaryExpr', op: t.type, left, right,
             start: left.start, end: right.end };
  }
}
```

只看这一条规则，三种结合性全部涌现：

| 运算符 | (leftBp, rightBp) | 效果 | 例子 |
|---|---|---|---|
| `+` `-` | (1, 2) | left < right → **左结合** | `a-b-c` = `(a-b)-c` |
| `=` | (9, 8) | left > right → **右结合** | `a=b=c` = `a=(b=c)` |
| `==` | (5, 6) | 高于 `\|\|` 低于 `*` | 优先级即数值大小 |

**左结合的机理**：递归用 rightBp=2，下一层遇到同级的 `-`（leftBp=1 < 2）会返回，于是回到外层循环把它并进**外层**的左操作数——树往左长。**右结合相反**：递归用 rightBp=8，同级 `=`（leftBp=9 ≥ 8）继续被吃——树往右长。没有特判、没有分层，两张数字定生死。

## 前缀、后缀、"超高中缀"

**前缀**（`!`、`-`、`(...)`、字面量、标识符）由 `parsePrefix()` 处理：读一个 token，按类型分派——一元负号给个右绑定力（如 7，高于 `*`）递归右操作数；`(` 则 `parseExpr(0)` 后 `consume(')')`。

**后缀与"调用"**：`f(1)(2)`、`a[i].b` 是**左结合的中缀**，绑定力设为最高（如 (11, 11)），右操作数为空——即"循环体里特殊处理"：

```ts
if (t.type === '(') {
  advance();
  const args = parseArgs();
  left = { type: 'CallExpr', callee: left, args, ... };
  continue;                                    // 不走 parseExpr，绑定力无穷大
}
```

**三元 `?:`** 也可以编码为 (4, 4) 的中缀 + 内部再 `parseExpr(0)` 解析 else 支——一切"特殊语法"都尽量压进绑定力表，表之外的特例越少，parser 越可维护。

## mini 语言的绑定力表

```ts
const INFIX: Partial<Record<TokenType, [number, number]>> = {
  '||': [1, 2], '&&': [3, 4],
  '==': [5, 6], '!=': [5, 6],
  '<': [7, 8], '>': [7, 8], '<=': [7, 8], '>=': [7, 8],
  '+': [9, 10], '-': [9, 10],
  '*': [11, 12], '/': [11, 12], '%': [11, 12],
  '=': [15, 14],                               // 右结合：left > right
};
const PREFIX_BP = { '!': 13, '-': 13 };        // 一元：高于 */，低于后缀
// 调用 '(' = 超高中缀（特判），括号 '(' = 前缀（特判）
```

加一个运算符 = 加一行表项。把优先级从 12 层文法压缩成 14 个数字，这就是"为什么 acorn、swc、rustc 都用它"的全部理由——**可维护性与性能兼得**（主循环零递归开销地处理二元链，`a+b+c+d` 不再每次过 4 层函数）。

## 与递归下降的配合

mini parser 的分工（05、06 册落地）：

- **语句层**：递归下降（`fn/let/if/while/{/return` 的分派是天然 LL(1)）
- **表达式层**：Pratt（绑定力表驱动）

这不是发明——acorn 的 `parseStatement` 与 `parseExpr` 正是同样分工；rustc 的表达式解析在 2020 年前后也从分层改为 Pratt（rust-lang PR #70545，动机就是消除优先级分层的样板代码）。**两个技术各打各的最强区**：语句结构低频且分支稳定（LL 直观），表达式高频且优先级密集（表驱动）。

## 自测

1. 用绑定力表手动模拟 `a = b || c && d` 的解析过程（写出每层 minBp 与返回点），验证 `&&` 先于 `||`、`=` 最后。
2. `-a * b` 为什么是 `(-a) * b` 而不是 `-(a*b)`？PREFIX_BP=13 与 `*` 的 (11,12) 谁决定了这一点？
3. 给 `**`（右结合、优先级介于一元与乘法之间，类似 JS）设计绑定力对，并解释选择。
4. 把 `f(1)(2)` 的两次调用画成 AST——调用为什么天然左结合？
