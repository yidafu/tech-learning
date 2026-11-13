# Forth 栈机与字典：逆波兰序的极简世界

> [返回：演练场导览](01-导览.md)
> 对应演练场 [playground/forth](https://yidafu.github.io/tech-learning/compiler/playground/forth)。源码：`src/playground/forth.js`（约 230 行）。本册讲清数据栈与字典这两个原语，以及它与第五阶段字节码 VM 的同构关系。

## Forth 世界观：一切经过栈

Forth（Chuck Moore，1970）的哲学激进到只有一个数据结构——**数据栈**，和一种组合方式——**逆波兰序（RPN）**：

```
1 2 + .        \ 等价于 C 语言的 printf("%d", 1 + 2)
```

执行轨迹：`1` 入栈 → `2` 入栈 → `+` 弹两个数压回 3 → `.` 弹栈打印。**没有表达式语法、没有优先级、没有括号**——求值顺序就是书写顺序。HP 的科学计算器用了几十年 RPN，因为它的状态可以随时用 `.s` 看到：计算过程是**完全透明的**。

Forth 程序员写"栈效应注释"来代替类型签名：`dup ( a -- a a )`——左边是执行前的栈，右边是执行后。**这其实就是一个一元算子式的类型系统**（concatenative language 的学术名称由此而来）。

## 两个原语：栈与字典

```js
// 字典：名字 → 内建函数 或 用户单词的 token 数组
dict.set(name, builtinFn)      // 内建：JS 函数直接操作栈
dict.set(name, bodyTokens)     // 用户定义：: name … ; 的体

// 执行：walk tokens；用户单词递归解释——线程码（threaded code）的雏形
const word = dict.get(t);
if (typeof word === 'function') word(ctx);
else interpret(word, ctx);
```

`: square dup * ;` 把三个 token 存进字典。调用 `5 square` 时递归解释这串 token。**这是第五阶段 FnProto 的直系祖先**：

| Forth | 第五阶段 mini VM | 说明 |
|---|---|---|
| 数据栈 | 求值栈 `stack: Value[]` | 同一个东西 |
| 字典条目（token 数组） | FnProto（字节码数组） | "代码"就是一个可跳转执行的序列 |
| 内建单词（JS 函数） | NATIVE 内建函数 | 运行时与语言的边界 |
| `: name … ;` | `CLOSURE f` + 常量池 | 定义即"存进代码区" |
| 递归 interpret 用户单词 | CALL 压帧 | 控制流 = 调用链 |

区别只在**编码密度**：Forth 存 token 字符串，字节码存数字操作码——一个面向人调试，一个面向机器解释。`ADD` 指令"弹两个压一个"的语义，就是 Forth 里一条 `+` 单词。**读懂 Forth 就读懂了栈式字节码的操作模型。**

## 控制流：我们的简化与真实 Forth

教学实现里，`if/then`、`do/loop`、`begin/until` 用**配对扫描**实现：

```js
case 'if': {
  if (pop() === 0) i = scanTo(tokens, i, 'then');  // 假：向前跳到 else/then
  continue;
}
```

运行时跳过分支体 = 解释器在 token 数组上"扫"过去。**真实 Forth 不是这样**：`:` 进入编译态，`if` 编译一条 `0BRANCH (addr)` 指令并把地址坑位留在码流里，`then` 回填跳转目标——这正是第五阶段 `patchJump` 跳转回填的完整同型物。我们跳过了"编译态/解释态双模态"这个 Forth 最迷人（也最烧脑）的设计，换取 30 行可通读的控制流。想见识双模态，去找 jonesforth 或 Gforth 的 `IF` 定义源码——它们用 Forth 自己定义自己的控制流（自举）。

## 变量：栈模型下的可变状态

```
variable count      \ 定义一个"单元格"，名字即地址
0 count !           \ ( x addr -- )：把 0 存进 count
count @             \ ( addr -- x )：读出来
: bump  count @ 1 + count !  count @ . ;
```

Forth 的变量是**显式的地址操作**——`@`/`!` 就是 load/store 指令的 REPL 形态。对照第三~四阶段：`count` 这个 Identifier 不像现代语言那样"自动"解析成值，你必须自己声明"我要读（@）还是写（!）"。现代语言把这件事交给编译器（左值/右值分析、`resolvedTo` 引用边），Forth 把它交给人。

## 为什么 Forth 值得每个编译器学习者玩一周

- **透明性**：`.s` 随时看栈，每个单词的效应都能注释清楚——调试即观察。
- **极简的完整**：两百行实现里有定义、递归、控制流、可变状态——图灵完备的最小工程形态。
- **历史地位**：Forth 是"语言即虚拟机"思想的源头之一；PostScript（打印机语言）、JVM 字节码、我们的 mini VM，栈模型一脉相承。NASA 的航天器上至今跑着 Forth。

## 自测

1. 手写 `1 2 swap over` 每步的栈状态；`rot ( a b c -- b c a )` 用 swap 怎么凑出来？
2. 为什么 Forth 不需要 Pratt 解析？前缀/后缀表达式与中缀表达式在文法复杂度上的本质差异是什么？
3. `5 fact` 里 `dup` 出现了两次，各自解决什么问题？如果删掉第二个 dup 会怎样（跟踪栈状态）？
4. 我们的控制流是"解释时扫描"，真实 Forth 是"编译时回填"——用第五阶段 `emit(JMP_IF_FALSE, 0)` + `patchJump` 的代码指出这两者的对应关系。
5. 动手：给演练场 Forth 加一个 `nip ( a b -- b )` 单词；再写一个 `: gcd … ;` 用辗转相除（mod + begin/until）实现。
