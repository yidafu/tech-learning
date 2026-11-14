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

### patchJump 的算术：回填怎么落笔

`emit` 返回"op 的偏移"就是为回填服务的。回填的语义要与 VM 对齐（04 册的 `f.ip += this.readOperand(f)`——此时 ip 已滑过操作数）：**偏移 = 目标位置 −（跳转指令操作数之后的 ip）**。正向跳转（if/while 出口）的目标在生成时刻未知——体有多长、体内嵌不嵌跳转，都要编完才知道，所以先 `JMP_IF_FALSE 0` 占位、`patchJump` 回填；反向跳转（while 回边）目标已在手上（`here()` 记下循环头），可以当场结算出负偏移。**差一错误是回填的头号 bug**：占位偏移、patchJump 的基准点、VM 侧 ip 的推进时机，三处口径必须一致——写一个 while 循环的对拍用例（出口偏移算出的落点恰好是出口指令），就能把语义钉死。

### 一次编译会话的完整轨迹

把 emit 的颗粒度看到指令级——`let a = 2; print(a * 3 + 1);`（a 在槽 0，常量池 [2, 3, 1, print]，print 为内建引用）：

| emit 事件（AST 节点） | 追加的指令 | code 布局（ip） | constants 变化 |
|---|---|---|---|
| LetDecl a：expr(2) | CONST c0 | 0 CONST 0 | + 2 → 池 [2] |
| 同上：落槽 | SET_LOCAL 0 | 2 SET_LOCAL 0 | — |
| ExprStmt：CallExpr 的 callee | NATIVE c3 | 4 NATIVE 3 | + print → 池 [2, 3, 1, print] |
| 参数 expr(a * 3 + 1)：expr(a) | GET_LOCAL 0 | 6 GET_LOCAL 0 | — |
| … expr(3) | CONST c1 | 8 CONST 1 | + 3 |
| … BinaryExpr * | MUL | 10 MUL | — |
| … expr(1) | CONST c2 | 11 CONST 2 | + 1 |
| … BinaryExpr + | ADD | 13 ADD | — |
| CallExpr 收口 | CALL 1 | 15 CALL 1 | — |
| ExprStmt 收口 | POP | 17 POP | — |

从这张表能读出编译器的"两次兑现"：checker 在 AST 上注记的 `resolvedTo.index` 兑现成 `SET_LOCAL 0` / `GET_LOCAL 0` 的操作数，`inferredType` 兑现成算术指令的选型（本例全是 number 域；若改写 `print(s + "x")` 且 s 是 string，ADD 处会落成 ADD_STR）。常量池的去重也看得见：三个字面量按 `` `${typeof v}:${v}` `` 各占一项——源码里若再写一个 `2`，emit 只会拿到既有索引。

### FnDecl 的编译与函数名的绑定

`FnDecl` 的路线在 stmt 的注释里：**编译子 FnProto → CLOSURE → SET_LOCAL**。对照 03 册 fib 的反汇编：脚本把 CLOSURE 压出的函数值用 `SET_LOCAL 0` 存进脚本帧槽 0——**函数名的绑定就是一条普通的局部变量写入**。函数体内对 `fib` 的自引用（递归）经 checker 解析为 upvalue：GET_UPVALUE 沿 `upvalueDesc`（直接外层、槽 0）指回脚本帧取回函数值，再照常 CALL——递归在字节码层没有任何特殊指令，就是"闭包取自己"。

一个真实的取舍点浮出水面：**互相递归**（A 调 B、B 调 A）要求"编 A 时 B 已存在"。单遍编译器要做到它，得先扫一遍登记函数签名、再编一遍函数体（两遍），或把前置声明写进语言规则。三件套用例刻意只用了自递归（fib），把两遍扫描留作设计练习——JVM 的 class 文件里方法可以互相调用，正是因为 javac 两遍走。**"单遍 + 自递归够用"还是"两遍 + 互相递归"，是语言设计决策，不是实现细节**。

### 常量去重的 key 与它的边界

`constIndex` 的 key 是 `` `${typeof v}:${v}` ``（对象走 `fn:${name}`）。三个边界值得知道：

- `-0` 与 `0` 归并成同一项（`String(-0)` 是 `"0"`）——数值上无伤，但若以后做"保留原值的常量折叠"会踩到符号；
- `number:1` 与 `string:1` 天然分开——`typeof` 前缀就是类型防火墙；
- FnProto 走 `fn:${name}` 分支且**先查后插**——同名函数若先后编译，key 相同会错并成同一个索引；这里隐含一条纪律：**函数名必须唯一**（checker 的作用域规则保证）。key 的"碰撞即合并"是有意的（字面量去重），但它对"身份语义"的对象（FnProto）同样生效——所以唯一性约束必须真的成立。

### 赋值与 upvalue 写入的兑现

`AssignExpr` 的骨架在 expr 的注释里：先编右值、再落 `SET_LOCAL`。真正要兑现的是**目标解析**——与 Identifier 读取共用同一个 `resolvedTo`：目标是本帧槽位就发 `SET_LOCAL`，是自由变量就发 `SET_UPVALUE`（写穿闭包盒子，04 册的拆盒方案）。拿验收用例 ② 的 `n = n + 1` 拆开看（n 是 counter 帧槽、内层闭包经 upvalue 引用）：

```
GET_UPVALUE u    ;; 读盒子（或 open 时的栈槽）→ [n]
CONST c          ;; 压 1 → [n, 1]
ADD              ;; [n+1]
SET_UPVALUE u    ;; 弹出写回盒子
```

读与写走**同一条解析路径**（都是 `resolvedTo`），语义上保证"读到的是谁、写回的就是谁"——赋值语义的一致性不需要额外机制，是第四阶段符号解析的顺带红利。语句级的 `let` 与赋值表达式落到同一条指令（SET_LOCAL），差别只在收口方式：let 由声明接管栈、赋值把值留给外层表达式——这正是"表达式留单值"不变式的又一个应用点。

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

### 三个补件的取舍展开

**① 入口脚本也是函数**——这个统一的收益是三倍的：REPL 复用同一个 run 入口（每次输入就是编一个新顶层 FnProto）；栈平衡纪律全程序只有一套（脚本与函数遵守同一条"表达式留单值"）；错误回溯多一层 `<script>` 帧——上面输出里的 `at <script> (fib.mini:7:1)` 就是它的签名。代价几乎为零：顶层 FnProto 的 nLocals 承载全局 let/fn 绑定，REPL 的 `globals.absorb` 再把这层"脚本局部"晋升为持久全局。

**② MAX_FRAMES = 512**——数值本身不重要，重要的是**它保护什么**：死递归每层净增一帧，512 层后触发的是"我们准备的、带回溯的 RuntimeError"，而不是宿主引擎的调用栈溢出（无法定位到 mini 源码）。换算成源码语义：fib(25) 的最大帧深 26（脚本帧 + 25 层递归）——离上限很远；`fn f() { return f(); }` 则每调一次涨一帧，512 次后必然触顶。验收清单里"故意改 MAX_FRAMES = 8 验证溢出报错"正是把上限当成**可注入的测试参数**——保护机制的第一个用户是它自己的测试。

**③ 回溯的采集时机**——RuntimeError 在 VM 层抛出前，沿 `frames` 数组从深到浅收集每帧的 `proto.name` 与源码位置（`FnProto.start` 的简化映射），拼成上面三条的形状。格式对齐主流解释器（Node 的 `at fn (file:line:col)`、JVM 的 `at pkg.Class.method(Source.java:line)`）不是审美偏好，是**让读者用同一套肌肉记忆读所有栈**。教学版省掉行号表的精确映射、用 `start` 兜底——省掉的东西在 03 册"行号表"一段有交代。

### 从最小可跑到三件套的开发顺序

拼装顺序本身就是调试策略——每一步都让 VM 保持"能跑一个最小的程序"：

1. CONST + ADD + RETURN：跑通 `return 1 + 2;`——先验证取指-分发-弹压的骨架；
2. GET/SET_LOCAL + JMP_IF_FALSE：跑通 if 与 while——跳转回填在这里第一次现形；
3. CALL/RETURN + 参数搬迁：跑通 `fib(2)`——调用约定上线；
4. CLOSURE / GET_UPVALUE / SET_UPVALUE + close：跑通计数器——最难的一块，捕、读、关三步逐个验；
5. NATIVE + print/clock：跑通 `print(fib(25))`——运行时与编译产物会师；
6. REPL + `mini dis`：工具化——之后每个 bug 都先 dis 再说。

每一步冻结一个 golden 快照（字节码 + 输出）：**后面的每一步都以"前面的 golden 不变"为回归护栏**——这与第七阶段优化器"改写指令流但 golden 输出不变"是同一条纪律的预演。

### 调试手册：栈失衡的三种症状

emit 与 VM 的合同一旦违约，症状高度可归——三种典型：

| 症状 | 违约点 | 排查入口 |
|---|---|---|
| POP 空栈 | 表达式语句没留值可收（POP 时栈已空） | 查 ExprStmt 收口前后：栈顶有没有东西 |
| 遗留值累积 | 语句编译后栈没回到原深（少一个 POP / SET_LOCAL 收口） | 看 `assertStackBalanced` 的深度差：差几就少收几 |
| 跳进指令中间 | 回填差一：占位、patchJump、VM 三处口径不一致 | dis 里核对 JMP 落点是否为指令起点 |

排查顺序永远是：先 `mini dis` 读"编译器以为它生成了什么"，再手推"VM 会怎么执行它"，两边对不上的那一条指令就是 bug——**先静态对拍，再动态断点**，顺序反了会把时间烧进单步调试。

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

### 续行判定与状态并轨的边界

两个技术点各有一条边界要钉住：

- **续行判定看"错在哪"，不只看"有没有错"**：`E03xx` 且位置指向 eof → 等续行；语法错在**中间**（第 2 行少了括号但第 3 行能合法收尾）→ 当场报错并清空 lines。判据是诊断的位置，不是诊断的个数——这是第三阶段错误恢复的判断在 REPL 里的复用（[第三阶段 · AST 设计与错误恢复](../03-第三阶段/05-AST设计与错误恢复.md)）；
- **absorb 的时机在求值成功之后**：`globals.absorb(global)` 排在 `vm.run` 之后——求值失败（运行时错误）的输入不污染全局环境，上一行定义安然无恙。"把多次求值缝成一个程序"的缝，只缝成功的那几针。

再往前多想一步：REPL 每次都**从全量源码重新 tokenize → parse → check → compile**——不做增量。取舍是刻意的：增量化（只编译新行、缓存旧指令流）要求"指令地址跨会话稳定"，与第七阶段的优化 pass、字节码快照 diff 都会互相纠缠；教学版选"每次一个完整程序"，换来的是**任何一行都走与 `mini run` 完全相同的编译管线**——没有"REPL 特殊语义"这个 bug 温床。真实语言的交互环境在增量与全量之间各有取舍，方向一致：**先保证与脚本模式语义一致，再谈快**。

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

### 三个用例各在测什么

| 用例 | 覆盖机制 | 失败时的典型症状 |
|---|---|---|
| ① fib(25) | 调用约定、参数搬迁、递归压帧、帧深上限 | 结果错 → 弹压次序或 locals 搬迁错；栈溢出 → frames 未随 RETURN 回退 |
| ② 闭包计数器 | CLOSURE 捕获、open/close、SET_UPVALUE | 输出恒 1 → close 没做（读到的永远是初值）；两个计数器串味 → Upvalue 共享出错 |
| ③ map/filter | NATIVE、native 反向调 mini 闭包 | 谓词不生效 → 反向调用没复用同一循环；崩溃 → 栈布局没按 [callee, args] 备好 |

两个数学注记（不是实测，是算术）：fib(25) 的**最大帧深 26**（脚本帧 + 25 层递归）；**总调用次数 242785**——递归调用数满足 C(n) = C(n−1) + C(n−2) + 1，解得 C(n) = 2·F(n+1) − 1，而 F(26) = 121393。这两个数解释了"为什么 512 的帧深上限够用"与"< 200ms 的耗时区间是否合理"的底账——它们只依赖语言语义，与 TS 实现速度无关。

快照（golden）的意义在此刻兑现：三件套的字节码冻结后，第七阶段每改一个优化 pass，先跑三件套对 golden diff——**"优化不改语义"的证据，就是这三份字节码的语义等价**（指令流可以变，输出与栈行为不能变）。

### 实现取舍清单（一页版）

把散在各册的取舍收进一张表——每行都是"另一条路也通，但 mini 选了这边"：

| 决策点 | mini v1 的选择 | 备选路线 | 选这边的一句话理由 |
|---|---|---|---|
| 指令集形态 | 栈式 34 条 | 寄存器式（Lua 5） | 编译器简单第一；与 JVM/CPython 同构便于对照 |
| 操作数容器 | TS `number[]` | `Uint8Array` + 定宽编码 | 免掉编码宽度层，聚焦语义 |
| 跳转编码 | 相对偏移 + 占位回填 | 绝对地址 / 标签表 | 优化阶段搬动指令块时改动面小 |
| 常量池 | 拼串 key 去重 | 不去重 / 哈希池 | 实现十行；为 CSE 预留索引稳定性 |
| 类型分派 | 编译期选指令（ADD/ADD_STR） | 运行时判型 | 静态类型红利的直接兑现 |
| upvalue | 拆盒（方案 B） | 环境链（方案 A） | 访问 O(1)、GC 面小；难点收在 close |
| 错误传播 | TS 异常 + 回溯采集 | Result 逐层传 | 教学代码路径短；正常路径纪律不变 |
| 帧深上限 | 固定 512、可注入 | 动态扩容 | 可读报错 + 可测试 |
| REPL 策略 | 全量重编译 | 增量指令流拼接 | 与 `mini run` 语义严格一致 |

### 验收怎么跑

- `mini run demo.mini` 跑三件套源文件——里程碑的两个输出行就是锚点；
- `mini dis fib.mini` 逐函数核对跳转结构与常量池（人要能看懂"跳转成对、落点是指令起点"）；
- `echo '<一行程序>' | mini repl` 验证回显与全局持久（里程碑第二行的 `= 42`）；
- 把 MAX_FRAMES 改小后重跑死递归，验证溢出回溯可读——改回来再跑一遍 fib，确认三件套无恙。

每一条都对得上，才算"里程碑"里那句话成立：mini 语言活了。

## 里程碑：mini 语言"活"了

```
$ mini run demo.mini
75025
$ echo 'fn add(a,b){return a+b;} print(add(20,22));' | mini repl
= 42
```

字符流 → token → AST → 诊断 → 字节码 → 执行，全链贯通。第六阶段给 VM 装内存管理（对象不再"只生不死"），第七阶段回头优化这套字节码——**它们都以本册的三件套为基准负载**。

## 常见误区

- **"编译器写完就等于能跑"**——emit 与 VM 是一份合同的双方：栈效果、调用约定、偏移语义三处口径不一致，哪边"看起来对"都没用；对拍（dis + 手推）是唯一仲裁；
- **"栈平衡是运行时的事"**——它是编译器的合同义务（两条不变式），VM 只负责违约时崩得难看。开发期断言放在 emit 侧而不是 VM 侧，就是这个道理；
- **"回填差一跑起来也没事"**——差一的跳转多数情况"碰巧"落在相邻指令上，小用例全绿、大程序随机崩；对拍用例要覆盖正向、反向、嵌套三种跳转；
- **"REPL 是小功能"**——续行判定、全局并轨、错误隔离，每一件都是语义决策；REPL 行为与脚本模式不一致是最难查的一类 bug（同一个程序两个答案）；
- **"验收 = 看输出对不对"**——输出对只是第一层；栈平衡、帧深回退、upvalue close、golden 可 diff，四层都过才算"活"；
- **"golden 快照是负担"**——它是第七阶段的启动资本：没有冻结的字节码，"优化改对了"与"优化改坏了"无法区分。快照的价值随阶段推进而上涨；
- **"内建函数可以绕过栈协议"**——native 走同一 CALL 才能共享帧深保护与错误回溯；旁路实现迟早在 map/filter 反向调用时撞上栈失衡。

## 与其他册的连接

- 编译器的输入契约（AST 注记、槽位分配）：[第四阶段 · 符号表与作用域](../04-第四阶段/02-符号表与作用域.md)、[第四阶段 · 检查器工程化与实践](../04-第四阶段/05-检查器工程化与实践.md)；
- 指令集与反汇编器的定稿：[03-字节码设计](03-字节码设计.md)；解释循环与调用约定：[04-解释器实现](04-解释器实现.md)；lowering 模板与偏移推演：[02-中间表示家族](02-中间表示家族.md)；
- 续行判定吃的错误恢复机制：[第三阶段 · AST 设计与错误恢复](../03-第三阶段/05-AST设计与错误恢复.md)；
- 本册交付的 VM 的下一站（对象头与 GC）：[第六阶段 · 运行时对象模型](../06-第六阶段/02-运行时对象模型.md)；
- 以三件套为基准负载的优化 pass 与收益分析：[第七阶段 · 实践-优化pass与收益分析](../07-第七阶段/07-实践-优化pass与收益分析.md)；
- 同一门语言的第二个后端（wasm）：[Wasm 专题 · 实践-mini到Wasm](../11-Wasm专题/06-实践-mini到Wasm.md)。

## 自测

1. patchJump 的偏移公式是什么？它与 VM 侧 `f.ip += readOperand(f)` 的哪个时刻对齐？正向与反向跳转的结算时机差在哪？
2. `let a = 2; print(a * 3 + 1);` 的 emit 轨迹表里，常量池四项各是什么？若把表达式改成 `print(s + "x")`（s 是 string），CALL 前的算术指令会换成哪条、常量池多了什么？
3. fib 体内对 `fib` 的自引用走哪条取值路径？改成两个函数互相递归，编译器结构要做什么让步？
4. MAX_FRAMES = 512 保护的是什么？fib(25) 的最大帧深是多少、怎么算出来的？
5. REPL 续行的判据是什么？`globals.absorb` 为什么放在 `vm.run` 之后？
6. 三个验收用例分别给"调用约定 / upvalue 拆盒 / native 反向调用"覆盖了什么？"闭包计数器输出恒 1"指向哪个机制没做？
7. 两条栈不变式分别约束什么？违反第一条的三种典型症状是什么（提示：POP、遗留值、跳进指令中间）？
8. 实现取舍清单里，"REPL 全量重编译"买到了什么？若要增量化，会和哪两个后续阶段的机制纠缠？
9. `n = n + 1` 编译成哪四条指令？`n` 是外层自由变量时读与写各走哪条指令、解析自哪个注记？
10. 栈失衡的三种症状各指向什么违约？为什么排查顺序是"先 dis 对拍、后动态断点"？

（答不出就回到对应小节的推演再读一遍；三件套跑不过时，先 `mini dis` 再看 VM case——顺序不能反。）
