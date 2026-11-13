# Lisp 元循环解释器：S-表达式与 eval/apply

> [返回：演练场导览](01-导览.md)
> 对应演练场 [playground/lisp](https://yidafu.github.io/tech-learning/compiler/playground/lisp)。源码：`src/playground/lisp.js`（约 250 行）。本册讲清它为什么是"最小的完整语言"，以及 eval/apply 这对核心循环。

## 为什么从 Lisp 开始

Lisp 诞生于 1958 年，是第二古老的高级语言（仅次于 Fortran），却拥有最年轻的语法——因为它几乎**没有语法**：

```lisp
(+ 1 2 (* 3 4))     ; 这是一段程序
["+", 1, 2, ["*", 3, 4]]   ; 这就是它的 AST（数组表示）
```

**语法即数据（homoiconicity）**：括号前缀表达式既是源码文本又是语法树。别的语言要写 300 行 parser 才能拿到 AST，Lisp 的 parser 是 20 行的 `read`。这就是宏系统、代码即数据哲学的源头，也是我们第一个实现它的原因——**它把"词法+语法"两个阶段压缩成一层**，让你直接站在语义层的门口。

## 读取器：20 行的 lexer + parser 合体

```js
function tokenize(src) {
  const noComments = src.replace(/;[^\n]*/g, '');
  return noComments.match(/\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s()'"]+/g) ?? [];
}

function read() {
  const t = tokens[pos++];
  if (t === '(') {           // 左括号：递归读到右括号，收集成一个数组
    const list = [];
    while (tokens[pos] !== ')') list.push(read());
    pos++;
    return list;
  }
  if (t === "'") return [new LSym('quote'), read()];  // 'x ≡ (quote x)
  return atom(t);            // 数字转 number，其余是符号
}
```

对照主线的第二、三阶段：tokenize 干了 lexer 的活（一行正则），read 干了 parser 的活（递归下降的最小形态——文法只有 `expr → atom | '(' expr* ')'`）。**没有优先级、没有结合性、没有歧义**：前缀表达式里运算符永远在操作数前面，天然无歧义。Pratt 解析要解决的整个问题域在这里根本不存在。

## eval：十条规则走天下

```js
function evaluate(x, env) {
  if (x instanceof LSym) return env.lookup(x);   // 符号：查环境
  if (!Array.isArray(x)) return x;               // 字面量：自求值
  const [head, ...rest] = x;
  if (head instanceof LSym) switch (head.name) {
    case 'quote':  return rest[0];
    case 'if':     return evaluate(rest[0], env) !== false
                     ? evaluate(rest[1], env) : evaluate(rest[2], env);
    case 'define': /* 绑定到 env */ return;
    case 'set!':   /* 沿 env 链找到并改写 */ return;
    case 'lambda': return { params, body, env };  // 闭包：代码 + 定义环境
    case 'begin':  /* 顺序求值取最后一个 */ return;
    case 'let':    /* 脱糖为 lambda 调用 */ return;
  }
  return applyFn(evaluate(head, env), rest.map(a => evaluate(a, env)));  // 应用
}
```

整门语言的核心语义就这一屏。两个观察：

- **special forms 是"不求值第一个参数"的例外**：`(quote x)` 的 x 不求值、`(define n v)` 的 n 不求值、`if` 的分支惰性求值。应用规则（最后那行）假设所有参数先求值——special form 就是不遵守这条假设的形状。宏系统本质上是"用户自定义 special form"。
- **动态类型的代价**：每一步 `evaluate` 都要区分符号/数组/字面量。主线第四阶段的 checker 在编译期做完这些，VM 里一条指令一个动作——同一个决策，提前到编译期就是静态语言，留在运行期就是动态语言。

## 环境链与闭包

```js
class Env {
  constructor(outer) { this.map = new Map(); this.outer = outer; }
  lookup(sym) {
    for (let e = this; e; e = e.outer)
      if (e.map.has(sym.name)) return e.map.get(sym.name);
    throw new LispError(`未定义的变量：${sym.name}`);
  }
}
```

闭包计数器示例的机制：`make-counter` 的 `let ((n 0))` 创建子环境 E1，返回的 lambda 捕获 E1。两次调用 `make-counter` 生成两个独立的 E1——所以两个计数器互不影响。这与第五阶段 upvalue 拆盒解决的是**同一个问题**（变量逃出作用域后如何存活），方案却是"整环境保留" vs "只把被捕获的变量搬进盒子"——前者省事，后者省内存。

## 元循环：用 Lisp 写 Lisp 的求值器

Lisp 的著名魔术——eval 本身可以用 Lisp 定义（SICP §4.1）：

```lisp
(define (eval exp env)
  (cond ((symbol? exp) (lookup exp env))
        ((pair? exp)
         (if (special-form? (car exp))
             (eval-special (car exp) (cdr exp) env)
             (apply (eval (car exp) env)
                    (eval-args (cdr exp) env))))
        (else exp)))   ; 字面量
```

我们用 JS 写的 `evaluate` 是它的直译。**"语言实现者与语言用户用同一种语言"**不是趣味魔术：Babel 插件用 JS 处理 JS AST、`eval`、IDE 的语言服务，全是元循环思想的工程化身。第八阶段写 Babel 插件时你会再次站在这里。

## 与 mini 语言主线对照

| | 演练场 Lisp | 主线 mini |
|---|---|---|
| 词法+语法 | 一层 read（20 行） | lexer + Pratt parser（两阶段） |
| 类型检查 | 无（运行时报错） | resolve + check 双遍（编译期） |
| 执行方式 | 树遍历解释（evaluate 递归） | 编译到字节码 + 栈式 VM |
| 变量访问 | 名字查环境链（O(链深)） | 编译期定槽位，`GET_LOCAL i` O(1) |
| 错误处理 | 抛异常即停 | 诊断收集 + 错误恢复，一次报多个 |

树遍历解释器（tree-walking interpreter）是每个真实引擎的起点：Ruby（YARV 之前）、早期 PHP、Babel 的模板求值都是它。它慢在哪里？**每个节点每次执行都要重新判型、重新查环境**——这正是字节码存在的理由，也是第七阶段优化的对象。

## 自测

1. `'x` 与 `x` 求值结果有什么不同？quote 为什么必须是 special form 而不是函数？
2. `(let ((a 1)) body)` 脱糖成什么？由此解释为什么 `let` 的绑定体不能递归引用自己，而 `letrec`（等价于 define）可以。
3. 把 `evaluate` 里 `case 'if'` 的两条分支都提前求值会发生什么？`if` 的哪个特性被破坏了？
4. 我们的环境链查找是 O(链深) 的。mini 语言的 `GET_LOCAL slot` 为什么能做到 O(1)？这个改进发生在编译的哪个阶段？
5. 动手：给演练场 Lisp 加一个 `(and a b)` special form（短路求值），再把它实现成普通函数——体会后者为什么做不到短路。
