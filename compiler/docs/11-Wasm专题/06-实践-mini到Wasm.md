# 实践：mini → Wasm 编译器

> [返回：Wasm 专题导览](01-导览.md)
> 收官：把前五册拼起来——**零依赖、手写字节**，把 mini 的 number 子集编译成真实 `.wasm`，在浏览器/Node 里跑出结果。这就是第八阶段[毕业项目 C](../08-第八阶段/01-导览.md) 的核：一个"mini 源码 → wat → 运行结果"三栏 demo。本册代码全部实测跑通（fib → 75025、sum → 5050），共约 120 行。

## 目标与架构

| | 输入 | 输出 |
|---|---|---|
| 语言子集 | `number`/`bool` 字面量、局部变量与赋值、`if/else`、`while`、具名函数调用、`print`（import） | 一个合法的 wasm 模块（`Uint8Array`），导出每个函数与 `main`（顶层脚本） |
| 不做 | 闭包/upvalue（04 册路线图）、字符串、数组（04 册）、`%`（03 册合成） | — |

三层的分层与 02 册的段结构一一对应：

```text
compileToWasm(program)               程序层:两遍扫描(先索引后 emit)
  └─ FnEmitter(decl)                 函数级:AST → 指令字节(03 册的映射表)
      └─ uleb / f64le / section      字节级:LEB128、f64 小端、段装配(02 册)
```

## 字节层：LEB128 与段装配

```ts
// packages/wasm/src/bytes.ts
export function uleb(n: number): number[] {            // 无符号 LEB128:每字节 7 位,高位=续
  const out: number[] = [];
  do { let b = n & 0x7f; n = Math.floor(n / 128); if (n) b |= 0x80; out.push(b); } while (n);
  return out;
}
export const f64le = (x: number): number[] => {        // f64 的 8 字节小端(与平台无关)
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, x, true);       // true = 小端
  return [...b];
};
const vec = (items: number[][]): number[] => [...uleb(items.length), ...items.flat()];   // vector = 个数 + 元素
const str = (s: string): number[] => [...uleb(s.length), ...Array.from(s, c => c.charCodeAt(0))];  // 名字都是 ASCII
const section = (id: number, body: number[]): number[] => [id, ...uleb(body.length), ...body];
```

02 册的疑问在这里落地：**没有"回填"**——段长度是把内容全部生成好之后再前置的（`section` 先收 `body` 再拼 `uleb(body.length)`）。第五阶段 `patchJump` 那种"占位 → 算体长 → 回填"的写法只在流式输出（往文件里边写边算）才需要。

## 函数级：AST → 指令字节

字段名与第三/五阶段完全一致（`s.init`、`e.resolvedTo.index`、`e.inferredType`……），checker 的注记第三次兑现：

```ts
// packages/wasm/src/emit.ts —— 只列 dispatch,指令映射见 03 册
const F64 = 0x7c;
const BIN: Record<string, number> = {
  '+': 0xa0, '-': 0xa1, '*': 0xa2, '/': 0xa3,                    // f64 算术
  '<': 0x63, '>': 0x64, '<=': 0x65, '>=': 0x66, '==': 0x61, '!=': 0x62,  // f64 比较 → i32
};
const slotOf = (node: any): number => node.symbol.index;         // checker 的槽位(参数在前,从 0 连续)

class FnEmitter {
  code: number[] = [];
  private maxSlot = -1;
  constructor(private fnOf: (name: string) => number, private paramCount: number) {}
  get localCount(): number { return Math.max(0, this.maxSlot - this.paramCount + 1); }  // 参数之后都是局部
  private slot(n: number): number[] { if (n > this.maxSlot) this.maxSlot = n; return uleb(n); }

  stmt(s: Stmt): void {
    switch (s.type) {
      case 'LetDecl':
        this.expr(s.init);
        this.code.push(0x21, ...this.slot(slotOf(s)));                    // local.set
        return;
      case 'ExprStmt':
        this.expr(s.expression);
        if (s.expression.inferredType?.kind !== 'unit') this.code.push(0x1a);  // drop:有值才收
        return;
      case 'ReturnStmt':
        if (s.value) this.expr(s.value);
        this.code.push(0x0f);                                             // return(统一显式)
        return;
      case 'Block':   s.body.forEach(x => this.stmt(x)); return;
      case 'IfStmt':
        this.expr(s.cond);
        this.code.push(0x04, 0x40);                                       // if(无结果)
        s.then.body.forEach(x => this.stmt(x));
        if (s.else) { this.code.push(0x05); this.stmt(s.else); }
        this.code.push(0x0b);
        return;
      case 'WhileStmt':                                                    // 03 册双层模式
        this.code.push(0x02, 0x40, 0x03, 0x40);                           // block { loop {
        this.expr(s.cond);
        this.code.push(0x45, 0x0d, 1);                                    //   i32.eqz; br_if 1
        s.then.body.forEach(x => this.stmt(x));
        this.code.push(0x0c, 0, 0x0b, 0x0b);                              //   br 0 } }
        return;
    }
  }
  expr(e: Expr): void {
    switch (e.type) {
      case 'NumberLiteral': this.code.push(0x44, ...f64le(e.value)); return;             // f64.const
      case 'BoolLiteral':   this.code.push(0x41, e.value ? 1 : 0); return;               // i32.const
      case 'Identifier':    this.code.push(0x20, ...this.slot(e.resolvedTo.index)); return;   // local.get
      case 'UnaryExpr':
        this.expr(e.operand);
        this.code.push(e.op === '-' ? 0x9a : 0x45);   // f64.neg / i32.eqz('!')
        return;
      case 'BinaryExpr':
        this.expr(e.left); this.expr(e.right);
        this.code.push(BIN[e.op]);
        return;
      case 'LogicalExpr':   // 短路(03 册模板):a&&b = if a then b else 0;a||b = if a then 1 else b
        this.expr(e.left);
        this.code.push(0x04, 0x7f);                                        // if (result i32)
        if (e.op === '&&') this.expr(e.right); else this.code.push(0x41, 1);
        this.code.push(0x05);
        if (e.op === '&&') this.code.push(0x41, 0); else this.expr(e.right);
        this.code.push(0x0b);
        return;
      case 'AssignExpr':
        this.expr(e.right);
        this.code.push(0x22, ...this.slot(slotOf(e.target)));              // local.tee:存且留值
        return;
      case 'CallExpr':
        e.args.forEach(a => this.expr(a));
        this.code.push(0x10, ...uleb(this.fnOf(e.callee.name)));           // call
        return;
    }
  }
}
```

四个设计点：

1. **`localCount` 先内后外**：局部声明排在函数体最前面，但数量要等 emit 完才知道——所以不在构造时声明，而是 `slot()` 顺手记录最大槽位、getter 现算。忘了声明会得到 `invalid local index`（实测报错，比调试 NaN 舒心多了）；
2. **`drop` 有条件**：`print(...)` 调用（unit）后栈上没有值，drop 反而验证失败——03 册"`inferredType` 驱动 emit"的落点；
3. **`return` 统一显式**：函数末尾的 `return fib(..)+fib(..)` 不依赖"栈顶即返回值"的隐式语义，emit 一律压 `0x0f`——少一种特殊情况，多一条指令，值；
4. **`tee` 接住赋值表达式**：`s = s + i` 作为表达式有值，`local.tee`（存且留栈）+ 语句层 `drop` 正好凑成 mini 的 `SET_LOCAL` + `POP`。

## 模块层与程序层：两遍扫描

```ts
// packages/wasm/src/module.ts
const IMPORTS = [{ module: 'env', name: 'print', paramCount: 1 }];    // (f64) -> (),函数索引 0

export function buildModule(fns: WasmFn[]): Uint8Array {
  const nImp = IMPORTS.length;
  const type = (pc: number, hasResult: boolean): number[] =>
    [0x60, ...vec(Array.from({ length: pc }, () => [F64])), ...vec(hasResult ? [[F64]] : [])];
  const types = [...IMPORTS.map(i => type(i.paramCount, false)), ...fns.map(f => type(f.paramCount, f.hasResult))];
  const impSec  = IMPORTS.map(i => [...str(i.module), ...str(i.name), 0x00, 0]);          // env.print
  const funcSec = fns.map((_, i) => uleb(nImp + i));                                      // 类型索引:导入在前
  const expSec  = fns.filter(f => f.exported).map(f => [...str(f.name), 0x00, ...uleb(nImp + fns.indexOf(f))]);
  const bodies  = fns.map(f => {
    const locals = f.localCount ? [[...uleb(f.localCount), F64]] : [];
    const body = [...vec(locals), ...f.code, 0x0b];                                       // 局部 + 指令 + end
    return [...uleb(body.length), ...body];
  });
  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,                                       // \0asm + version 1
    ...section(1, vec(types)), ...section(2, vec(impSec)), ...section(3, vec(funcSec)),
    ...section(7, vec(expSec)), ...section(10, vec(bodies)),
  ]);
}

export function compileToWasm(program: Program): Uint8Array {
  const decls = program.body.filter(d => d.type === 'FnDecl') as FnDecl[];
  const script = program.body.filter(d => d.type !== 'FnDecl') as Stmt[];
  const idx = new Map<string, number>();
  decls.forEach((d, i) => idx.set(d.name, IMPORTS.length + i));      // 第一遍:先定索引
  const emit = (d: FnDecl): WasmFn => {
    const e = new FnEmitter(n => n === 'print' ? 0 : idx.get(n)!, d.params.length);
    d.body.body.forEach(s => e.stmt(s));
    if (d.retType) e.code.push(0x00);       // unreachable:免疫"所有路径都提前 return"(02 册的坑)
    return { name: d.name, paramCount: d.params.length, hasResult: !!d.retType, exported: true,
             code: e.code, localCount: e.localCount };
  };
  const main = new FnEmitter(n => n === 'print' ? 0 : idx.get(n)!, 0);   // 顶层脚本 = 导出的 main
  script.forEach(s => main.stmt(s));
  return buildModule([...decls.map(emit),
    { name: 'main', paramCount: 0, hasResult: false, exported: true, code: main.code, localCount: main.localCount }]);
}
```

两遍扫描是必须的：`fib` 的函数体里调用 `fib` 自己（还有前向引用），而 `call` 要的是**静态索引**——先把所有函数名定索引，再逐个 emit 函数体。对照 mini 后端：`CLOSURE f` 靠常量池在运行时解析，wasm 把同样的信息在**编译期**结清。顶层脚本沿用第五阶段"入口也是函数"的决策，编成导出的 `main`。

运行只有一行：

```ts
const bytes = compileToWasm(program);                               // program 来自 parser + checker
const { instance } = await WebAssembly.instantiate(bytes,
  { env: { print: (x) => console.log(x) } });                       // import 在这一刻链接
(instance.exports as any).main();                                   // 75025
```

## 端到端三栏：fib

左栏 mini 源码、中栏 `wasm2wat` 反汇编、右栏实产字节（130 字节）：

```text
fn fib(n: number) -> number {          (func $fib (export "fib") (param f64) (result f64)     00 61 73 6d 01 00 00 00
  if (n < 2) { return n; }               local.get 0                                             01 0d 03 60 01 7c 00
  return fib(n - 1)                      f64.const 2                                            60 01 7c 01 7c 60 00 00
       + fib(n - 2);                     f64.lt                                                 02 0d 01 03 65 6e 76 05
}                                        if                                                     70 72 69 6e 74 00 00
print(fib(25));                            local.get 0                                         03 03 02 01 02
                                           return                                              07 0e 02 03 66 69 62
                                         end                                                    00 01 04 6d 61 69 6e
                                         local.get 0                                           00 02 0a 45 02 33 00
                                         f64.const 1                                           20 00 44 00 …
                                         f64.sub
                                         call 1                                                ;; 调用方(main)里:
                                         local.get 0                                           44 00 00 00 00 00 00
                                         f64.const 2                                           39 40 10 01 10 00 0b
                                         f64.sub
                                         call 1                                                ;; f64.const 25 = 0x4039
                                         f64.add                                               ;; call 1(fib) / call 0(print)
                                         return)
```

右栏三个可读片段：`65 6e 76 05 70 72 69 6e 74` 是 `env`+`print`（import 段）；`03 66 69 62` 是导出名 `fib`；结尾 `10 01 10 00` 是 **`call 1`（fib）+ `call 0`（print）**——main 的全部工作。`fib(25) = 75025`，Node 与浏览器同码同果。

## 同一个 fib：解释与编译的 60 倍

把 fib 的 mini 字节码（第五阶段风格）交给一个 30 行的裸栈 VM（switch 解释循环）跑，与 wasm 后端产物同机对照（Apple arm64 / Node 24 / V8 13.6）：

| 后端 | fib(30) 耗时 | 倍率 |
|---|---|---|
| mini 栈 VM（TS 解释，裸版：无 closure/类型标签/GC） | ~138 ms | — |
| wasm（本册产物，热） | ~2 ms | **~60×** |
| JS 递归（JIT 对照） | ~5 ms | wasm 再快 ~2× |

三点解读：

1. **60 倍 = 解释 dispatch 的价格**。解释器每条指令都要：取指、switch 分派、检查、步进——而 wasm 字节码经引擎编译后就是机器码，`f64.sub` 直接一条指令。差距不在算法（同一个 fib），在**执行模型**；
2. **裸版 VM 已经是解释器的乐观下限**（没有 Value 标签分派、没有 upvalue、没有 GC 检查）——完整 mini VM 只会更慢，差距只会更大。这就是第五阶段验收标准 `fib(25) < 200ms` 的另一面：它量的是解释器的水位线；
3. 对照 [05 册](05-工具链与性能真相.md)：wasm 对 JIT 的 JS 是 2 倍，对解释器是 60 倍——**"换后端"的收益取决于你原来的基线**。

## 常见坑（每条都实测复现过）

1. **`fallthru` 验证失败**：`if/else` 两臂都 `return` 的函数，结尾不补 `unreachable` 直接被拒——报错 `expected 1 elements on the stack for fallthru, found 0`。checker 知道走不到，验证器不知道；对有返回值的函数统一补 `0x00` 一劳永逸；
2. **unit 调用后 drop**：`print(x)` 的调用没有返回值，`drop` 反而验证失败——用 `inferredType` 分派；
3. **忘声明局部**：`let` 槽位没进函数头的局部声明 → `invalid local index: 1`。本册 `slot()` 顺手记账的写法让"声明"永远不会漏；
4. **f64 端序**：`setFloat64(0, x, true)` 的 `true` 不能省——大端平台会产出"读不回自己"的常量；
5. **以 `WebAssembly.compile` 为准做验证**：wabt 的 `parseWat`（文本路线）不做完整验证，"两臂都 return"这种错误它能放过、引擎当场拒收——CLI 的 `wasm-validate` 与实例化才是裁决；
6. **写给自己的坑（解释器侧）**：定长编码的 VM 里每条指令的步进必须与编码一致——`CALL fn argc` 占 3 格，步进写了 4，结果不是崩溃而是**静默 NaN**（ip 错位后把操作数当指令执行）。反汇编/trace 是唯一救星——第五阶段"反汇编器是第一个调试器"在 wasm 后端升级成 `wasm2wat`。

## 验收清单

- [ ] `fib(25)` 端到端：mini 源码 → 130 字节模块 → 浏览器 console 打出 75025（Node 与浏览器同码）。
- [ ] `sum(100)`（含 while + let + 赋值）：148 字节，输出 5050。
- [ ] 两臂 return 的函数（如 `fn g(a) { if (a < 3) { return 10; } else { return 20; } }`）：通过验证，输出正确。
- [ ] 三栏 demo 页：左 mini 源码、中 `wasm2wat`、右运行结果——毕业项目 C 的验收形态。
- [ ] 对照实验：`fib(30)` 在你的完整 mini VM vs wasm 后端，数据表进实验笔记。
- [ ] 选做一：`%` 的合成指令序列（03 册自测 1）。
- [ ] 选做二：`break/continue` → `br 1`/`br 0`（03 册已给映射）。

## 里程碑

至此 mini 有了两个后端：自家 VM（解释执行、带 GC、可 REPL）与 wasm（编译执行、零依赖、浏览器原生）。第五阶段埋下的"m 前端 × n 后端"从口号变成两次真实的 emit 代码；而 02~05 册的格式、互操作与性能真相，让你对"第二个后端为什么长这样"有了从字节到工程的完整答案。下一站：回到主线收官——把整个八阶段的产出拼成毕业项目。
