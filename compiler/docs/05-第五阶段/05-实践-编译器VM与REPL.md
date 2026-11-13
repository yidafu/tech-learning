# 实践：编译器、VM 与 REPL 落地

> [返回：第五阶段导览](01-导览.md)
> 对应第五阶段实践任务。把前三册拼成可运行的工具链：`packages/ir`（AST → 字节码）、`packages/vm`（执行 + 内建 + REPL）。本册给编译器主体与 REPL 的完整骨架，以及三件套验收用例。

## 编译器：AST → 字节码

```ts
// packages/ir/src/index.ts
export function compile(program: Program, global: Scope): FnProto {
  const c = new Compiler();
  for (const d of program.body) c.decl(d);
  return c.finish();                       // 顶层 script 也是一个 FnProto
}

class Compiler {
  private code: number[] = [];
  private constants: (number | string | FnProto | Native)[] = [];
  private consts = new Map<string, number>();   // 常量去重（驻留池雏形）

  // ---- emit 三件套 ----
  emit(op: OpCode, ...operands: number[]): number {
    this.code.push(op, ...operands);
    return this.code.length - 1 - operands.length;   // 返回 op 的偏移（跳转回填用）
  }
  private constIndex(v: number | string | FnProto): number {
    const key = typeof v === 'object' ? `fn:${v.name}` : `${typeof v}:${v}`;
    if (!this.consts.has(key)) { this.consts.set(key, this.constants.length); this.constants.push(v); }
    return this.consts.get(key)!;
  }

  // ---- 语句：一表达式一栈位，语句要求栈平衡 ----
  private stmt(s: Stmt): void {
    switch (s.type) {
      case 'LetDecl':
        this.expr(s.init);
        this.emit(OpCode.SET_LOCAL, slotOf(s));     // checker 的 index 在这里兑现
        return;
      case 'ExprStmt':
        this.expr(s.expression);
        this.emit(OpCode.POP);                       // 表达式的值必须有人收（栈平衡铁律）
        return;
      case 'IfStmt': this.ifStmt(s); return;
      case 'WhileStmt': {
        const loop = this.here();
        this.expr(s.cond);
        const exit = this.emit(OpCode.JMP_IF_FALSE, 0);   // 偏移占位
        for (const st of s.then.body) this.stmt(st);
        this.emit(OpCode.JMP, loop - (this.code.length + 1));
        this.patchJump(exit);                        // 回填：知道体长后才能填出口
        return;
      }
      case 'ReturnStmt':
        if (s.value) { this.expr(s.value); this.emit(OpCode.RETURN); }
        else this.emit(OpCode.RETURN_UNIT);
        return;
      /* Block: 顺序；FnDecl: 编译子 FnProto + CLOSURE + SET_LOCAL */
    }
  }

  // ---- 表达式：结束时机"值在栈顶" ----
  private expr(e: Expr): void {
    switch (e.type) {
      case 'NumberLiteral': this.emit(OpCode.CONST, this.constIndex(e.value)); return;
      case 'Identifier':
        this.emit(e.resolvedTo!.isUpvalue ? OpCode.GET_UPVALUE : OpCode.GET_LOCAL,
                  e.resolvedTo!.index);
        return;
      case 'BinaryExpr': {
        this.expr(e.left); this.expr(e.right);
        // 类型化分派：checker 的 inferredType 在这里兑现
        if (e.op === '+' && e.inferredType!.kind === 'string')
          this.emit(OpCode.ADD_STR);
        else this.emit(BINOP[e.op]);                 // '+':ADD '-':SUB '<':LT ...
        return;
      }
      case 'LogicalExpr': /* 上一册的短路模板，JMP_IF_FALSE/JMP 回填 */
      case 'AssignExpr': this.expr(e.right); this.emit(OpCode.SET_LOCAL, /*…*/); return;
      case 'CallExpr': {
        this.expr(e.callee);
        for (const a of e.args) this.expr(a);
        this.emit(OpCode.CALL, e.args.length);
        return;
      }
    }
  }
}
```

两条不变式（写错任何一条，VM 立刻栈失衡）：

- **语句栈平衡**：每条语句编译前后，求值栈深度不变（表达式语句要 POP、let 用 SET_LOCAL 收）。
- **表达式留单值**：每个表达式编译后，恰好一个新值在栈顶。

调试手段：`disassemble` + 一个 `assertStackBalanced()` 的开发期检查（每个语句块前后断言深度）——**不变式是测出来的，不是想出来的**。

## VM 骨架的拼装

`packages/vm` 的主体（解释循环、Frame、upvalue 链）在上一册已成文，落地时补三件：

1. **入口脚本也是函数**：program 编译成匿名的顶层 FnProto，`vm.run(top)` 从它开始——脚本与函数统一为一种执行单元。
2. **栈溢出保护**：`frames.length > 512` 抛 RuntimeError（带"调用链最后 10 帧"的回溯）——`fn f() { return f(); }` 的友好报错就靠它。
3. **运行时错误的回溯**：RuntimeError 收集沿途每帧的 `proto.name + 源码行`，输出格式对齐主流解释器：

```
runtime error: 除数为零
  at fib (fib.mini:3:14)
  at <script> (fib.mini:7:1)
```

## REPL：即时反馈回路

```ts
// packages/cli/src/repl.ts
export async function repl(): Promise<void> {
  const vm = new VM();
  const globals = new Scope(undefined, 'global');     // 跨求值持久的全局环境
  const lines: string[] = [];
  while (true) {
    const line = await prompt(lines.length ? '   … ' : 'mini> ');
    lines.push(line);
    const src = lines.join('\n');
    const { tokens } = tokenize(src);
    const { program } = parse(tokens);
    const { diagnostics, global } = check(program, globals);
    if (diagnostics.some(d => d.code === 'E03xx')) continue;   // 语法错：等下一行续完
    if (diagnostics.length) { printDiags(diagnostics); continue; }
    const proto = compile(program, global);
    const value = vm.run(proto);
    if (value !== UNIT) console.log(`= ${showValue(value)}`);   // echo 结果（unit 不回显）
    globals.absorb(global);                                     // 新定义并入持久环境
    lines.length = 0;
  }
}
```

REPL 的两个技术点：**未闭合输入的续行**（语法错在最后一行且指向 eof → 保留 lines 等下一行——用诊断的位置判断"半句话"）；**全局环境的持久化**（上一行定义的 `fn`/`let` 并入 global scope，下一行可见——本质是"把多次求值缝成一个程序"）。

## 三件套验收用例

```ebnf
# ① fib(25)——递归与调用栈
fn fib(n: number) -> number {
  if (n < 2) { return n; }
  return fib(n - 1) + fib(n - 2);
}
print(fib(25));            # 75025，且 < 200ms（TS 实现的合理区间）

# ② 闭包计数器——upvalue 拆盒
fn counter() {
  let n = 0;
  return fn() { n = n + 1; return n; };    # v1 需 fn 字面量——语法已在此解锁
}
let c = counter();
print(c()); print(c()); print(c());        # 1 2 3

# ③ 高阶函数——运行时回调编译产物
fn map(list, f) { /* v1.1 数组内建 */ }
```

- [ ] fib(25) = 75025，无栈溢出；故意改 `MAX_FRAMES = 8` 验证溢出报错可读。
- [ ] 闭包计数器输出 1 2 3；`counter()` 两次调用产生**独立**计数器（close 语义正确）。
- [ ] map/filter 三例通过（含闭包作谓词）。
- [ ] `mini dis` 对三件套的字节码可读（人能看懂跳转结构）。
- [ ] REPL：多行函数定义、跨行字符串、未闭合续行、`= 回显`、全局持久全通。
- [ ] 快照：三件套的字节码 golden 文件冻结（第七阶段优化要 diff 它们）。

## 里程碑：mini 语言"活"了

```
$ mini run demo.mini
75025
$ echo 'fn add(a,b){return a+b;} print(add(20,22));' | mini repl
= 42
```

字符流 → token → AST → 诊断 → 字节码 → 执行，全链贯通。第六阶段给 VM 装内存管理（对象不再"只生不死"），第七阶段回头优化这套字节码——**它们都以本册的三件套为基准负载**。
