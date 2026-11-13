# Prolog 合一与回溯：另一种计算模型

> [返回：演练场导览](01-导览.md)
> 对应演练场 [playground/prolog](https://yidafu.github.io/tech-learning/compiler/playground/prolog)。源码：`src/playground/prolog.js`（约 320 行）。本册讲清逻辑式编程的两个核心算法——合一与回溯搜索，以及它与第四阶段类型推导的血脉联系。

## 声明式：只说"是什么"，不说"怎么做"

同样一个"亲属关系"问题，命令式与逻辑式的对比：

```
// 命令式（mini/JS 风格）：写清怎么找           // Prolog：只声明事实与规则
function grandparent(x, z) {                    parent(tom, bob).
  for (const y of childrenOf(x))                grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
    if (childrenOf(y).includes(z)) return true;
  return false;
}
```

Prolog 程序 = **事实**（`parent(tom, bob).`）+ **规则**（`h :- g1, g2.` 读作"h 成立，若 g1 且 g2 成立"）。你提交一个**查询** `?- grandparent(tom, Who).`，引擎负责找出所有让查询为真的 `Who`。循环、遍历、递归统统消失——**控制流被引擎接管**，这叫反向执行（inverted execution）。

## 项的世界：Prolog 只有一种数据结构

```js
{ t: 'v', id, name }            // 变量：大写开头（X、Who、_）；每个有唯一 id
{ t: 'a', name }                // 原子：小写开头的常量（tom、[]）
{ t: 'n', v }                   // 数字
{ t: 'c', name, args }          // 复合项：parent(tom, bob)
```

列表 `[1,2|T]` 解析成 `'.'(1, '.'(2, T))` 的 cons 链——和 Lisp 的链表、第四阶段 AST 的孩子数组是同一个结构换个皮。**Prolog 的代码与数据也是同构的**（规则本身是项），所以它有 `assert/retract` 这样的"程序修改自己"能力。

## 合一：带等式求解的模式匹配

求解一个目标 = 让**查询项**与**规则头**相等，求出变量取值。这个"求等式解"的算法就是**合一（unification）**：

```js
function unify(a, b, s) {          // s: 替换表 varId → 项
  a = walk(a, s); b = walk(b, s);  // 沿绑定链走到头
  if (a.t === 'v' && b.t === 'v' && a.id === b.id) return s;
  if (a.t === 'v') {
    if (occurs(a, b, s)) return null;   // occurs check：X = f(X) 是无限项，拒绝
    return bind(s, a, b);
  }
  if (b.t === 'v') return unify(b, a, s);
  if (/* 原子/数字 */) return a.name === b.name ? s : null;
  if (/* 复合项 */) return 同名同元 && args 逐个 unify ? s : null;
  return null;
}
```

合一比"相等"强、比"赋值"泛：`append([1,2], [3,4], Zs)` 正向解出 Zs，`append(Xs, Ys, [1,2])` **反向**解出三种拆法——同一个规则，双向可用。这是声明式威力的算法根源。

**注意 occurs check**：查询 `X = f(X)` 会被拒绝（否则无限项）。很多教学实现省略它换取速度，我们保留——因为第四阶段讲过：**Hindley-Milner 类型推导的核心就是合一算法**（Robinson 1965）。`unify(t1: int→a, t2: int→int)` 解出 `a = int`，与 `unify(append([1],L,R), append([1],[2],Z))` 解出变量绑定，是同一个函数在两个世界工作。类型是项，类型相等是合一——把这句话想通，第四阶段最难的一节就通了。

## 回溯：把搜索树走一遍

求解器是深度优先的树搜索（SLD 树）：

```js
function solve(goals, clauses, s) {
  if (goals.length === 0) return onSolution(s);   // 目标清空：报告解
  const [g, ...rest] = goals;
  for (const clause of matchingClauses(g)) {      // 每个子句是一个选择点
    const { head, body } = renameClause(clause);  // α-改名：变量是新的
    const s2 = unify(g, head, s);
    if (s2) solve([...body, ...rest], clauses, s2);  // 体目标拼到队列前
  }   // 循环耗尽 = 此路不通，自然"回溯"给上一层换个选择
}
```

三个细节：

- **α-改名**：规则每次被使用，变量都换成全新的（名字保留只为显示）。否则两次使用 `parent(X,Y)` 会互相污染绑定。这对应 λ 演算的 α-等价（下一册）——**"变量是占位符而非存储位置"**，声明式语言共享这个世界观。
- **回溯不需要显式代码**：JS 调用栈 + for 循环的天然回卷就是回溯。`solve` 的每层循环就是一个选择点（choice point）。
- **失败驱动**：没有解 = 树走完，报告 `false.`。SWI-Prolog 里 `fail` 谓词强制失败、`(a ; b)` 析构或——都是在这棵树上做文章。

手工推演一遍（最重要的练习）：查询 `append([1], L, R)` 对规则 `append([], L2, L2).` / `append([H|T], L2, [H|R2]) :- append(T, L2, R2).`——第一步子句一头合一失败（[1] ≠ []），子句二解出 H=1、T=[]，递归后子句一成功……**规则被双向、递归地重用**，这就是"程序 = 逻辑 + 控制"里的逻辑部分。

## is 与算术：纯度的妥协

```prolog
factorial(N, F) :- N > 0, N1 is N - 1, factorial(N1, F1), F is N * F1.
```

`is` 强制先求值右端再合一左端——因为 `N - 1` 在纯逻辑里只是个**未求值的项**（第三阶段 AST 里的 `BinaryExpr` 节点！）。Prolog 的算子缺省是"结构保留"的：`X = 1 + 2` 之后 X 绑定的是 `+(1,2)` 这个项而不是 3。**求值是一种显式请求**——与 Lisp（读入即求值）、Forth（书写即执行）形成三种哲学对照。

## 与主线对照

| | Prolog 引擎 | 主线对应物 |
|---|---|---|
| 合一 unify | 第四阶段类型合一 | 同一算法（Robinson），类型是项 |
| 深度优先搜索 | ——（新知识） | 回溯是 `?` 正则（NFA 回溯）的思想亲戚 |
| α-改名 renameClause | λ 演算 α-转换 | 变量 = 占位符 |
| 结构保留的算子 | AST 节点（不求值） | "求值"是解释器给 AST 的服务 |
| 未定义过程 → 报错 | 诊断系统 | 编译期 vs 运行期发现 |

## 自测

1. `append(Xs, Ys, [1, 2])` 有几个解？手推每一个解的合一过程。
2. occurs check 拒绝的查询长什么样？关掉它，`X = f(X)` 会发生什么？
3. 为什么规则使用前必须 α-改名？构造一个不改名就出错的两个查询。
4. `factorial(5, F)` 的求解树里，`F is N * F1` 为什么必须放在递归调用**之后**？（提示：F1 未绑定时 `5 * F1` 是什么。）
5. 动手：在演练场里写一个 `reverse(Xs, Ys)`（提示：先写 `reverse([], [])` 与三元组辅助谓词 `rev(Xs, Acc, Ys)`），再查询 `reverse(Y, [1,2,3])` 看反向枚举。
