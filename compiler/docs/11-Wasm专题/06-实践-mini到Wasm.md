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

### 子集边界的理由：每一刀都有出处

目标表"不做"一列的每一项都不是随手砍的：

| 不做 | 为什么现在不做 | 什么时候补 |
|---|---|---|
| 闭包/upvalue | 函数值要过函数表、环境要进线性内存——两套机制都还没入场 | 04 册路线图 |
| 字符串/数组 | 堆数据要线性内存布局 + 编组协议（指针 + 长度） | 04 册整套 |
| `%` | wasm 没有 f64 取模指令，要合成序列 | 03 册自测 1 |

反过来看，留下的子集恰好把**每一类指令家族**都踩了一遍：常量、局部变量、算术、比较、逻辑短路、赋值、两种控制流、调用、返回、import——03 册映射表里除堆数据外的每一行都有产物。**子集小而覆盖全**，这是教学编译器与"玩具 demo"的区别：玩具挑好走的路，教学走全每类必经的关口。约 120 行的预算就是这么花掉的。三层结构（程序层 → 函数级 → 字节层）各有一道独立可验的关口：字节层对 02 册的 41 字节默写、函数级对 03 册的映射表、程序层对"索引静态可解析 + 实例化通过"——下文坑清单几乎每条都能归位到某一层的验收缺口，**分层的第一收益就是"错误有家可归"**。

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

### uleb 逐行读：两处"反直觉"都有理由

六行代码里有两处值得停下来问"为什么这样写"：

- **为什么 `do…while` 不是 `while`**：`n = 0` 时也要产出**一个字节** `00`——vector 的个数、索引 0 都是合法且常见的值。`while` 循环体一次不进会返回空数组，0 就从字节流里消失了，下游解析错位。"至少一字节"是变长编码的标准写法（02 册 LEB128 的 do-while 同款）；
- **为什么 `Math.floor(n / 128)` 不是 `n >> 7`**：JS 的位运算是 32 位的，`>>` 会先把数字截成 int32；除法在 double 上完整进行。本册的 uleb 只服务 u32 域（索引、长度），两者等价，但除法写法**不依赖"数字恰好不大"**——类型边界靠写法声明，不靠调用方自觉。`f64le` 用 `DataView` 同理：**端序是显式参数**（`true` = 小端），不赌平台字节序——坑清单第 4 条的疫苗。

### 换种发法：流式装配会怎样

现在的 `section` 是"内容攒齐 → 量长度 → 前置"。假如改成流式（边生成边往输出写），段长度就没了后见之明，只能走第五阶段的老路：**占位 → 算体长 → 回填**——`patchJump` 换个名字回来了：

| 策略 | 长度怎么来 | 代价 | 适用 |
|---|---|---|---|
| 内存攒齐（本册） | 生成完再前置 | 多一份内存副本 | 模块几十~几百 KB，完全够 |
| 流式 + 回填 | 占位、写完回头补 | 回填逻辑的复杂度回归 | 真正超大模块 / 边生成边下发 |
| 两段式（先量后写） | 第一遍只算长度不产出 | 指令生成跑两遍 | 中间态，很少值 |

130/148 字节的量级下内存攒齐毫无悬念——**工程决策的"简单优先"要靠量级支撑，量级变了决策才会变**。

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

### WhileStmt 逐字节对号：模板落到字节

`WhileStmt` 分支压进去的字节，逐个对到 03 册的双层模式图上：

| 字节 | 指令 | 在图上的角色 |
|---|---|---|
| `02 40` | `block`（空结果） | 向前跳的落点（出口） |
| `03 40` | `loop`（空结果） | 向后跳的落点（回头） |
| （cond 字节） | — | `<cond>` |
| `45` | `i32.eqz` | "假则跳"的语义翻转 |
| `0d 01` | `br_if 1` | 条件不成立 → 出 block（深度 1 = 外层） |
| （body 字节） | — | `<body>` |
| `0c 00` | `br 0` | 回 loop 头（深度 0 = 内层） |
| `0b 0b` | 两个 `end` | 收 loop、收 block |

两个深度数字（1 与 0）就是 03 册"深度从内往外数"的运行时刻；模板对成字节后，`break/continue` 只是往里添两条 `br`（选做二）。

### LogicalExpr：right 的指令为什么"住进"臂里

短路 emit 的核心事实：**`e.right` 的字节只出现在一个臂里**——`&&` 的右操作数住在 then 臂，`||` 的住在 else 臂。这不是实现技巧，是**短路语义的字面化**："a 为假就不算 b"翻译成结构就是"b 的指令不在那条执行路径上"。换成扁平发法会怎样：`br_if` 跳过 b 的指令再汇合——需要算好"跳多远"（回填回归），还要处理 b 留在栈上的多余值（两臂同形又被破坏）。结构法把这两个麻烦一起免了：**跳过 = 不在场**，验证器对"两臂同形"的检查天然适配这个模板。这就是 03 册"控制流依赖变成结构依赖"的代码形态。

### AssignExpr 用 tee：一个操作码对应一条语义承诺

`local.tee`（0x22）= `local.set` + 把值**留在栈上**。赋值表达式 `s = s + i` 在 mini 里有值：

- 用 `set`：存完值就没了，要"表达式的值"得再发一条 `local.get`——两条指令、一次重复读；
- 用 `tee`：一条指令，存取同时完成。语句层的 `drop` 随后收尾；赋值若嵌在更大的表达式里（如条件），那份"留"的值直接被外层消费，drop 都省了。

mini 侧的 `SET_LOCAL` + `POP` 与 wasm 的 `tee` + `drop` 是同一个形状：值算好 → 存且留 → 语句层收尾。操作数序也值得看一眼：**先发右值、再 tee**——对应"赋值表达式的值 = 右侧的值"这条语义承诺。若语言定义赋值的值为左值语义（C 家族），emit 就得反过来。**一个操作码的选择背后是一条语言语义的承诺**。

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

### 本模块的索引空间全景

`buildModule` 出的 fib 模块，函数索引与类型索引可以完整列出（右栏字节已给答案）：

| 函数索引 | 是谁 | 类型索引 | 签名 |
|---|---|---|---|
| 0 | `print`（import） | 0 | `(f64) -> ()` |
| 1 | `fib` | 1 | `(f64) -> f64` |
| 2 | `main` | 2 | `() -> ()` |

`funcSec` 的 `uleb(nImp + i)` 与 `expSec` 的 `nImp + fns.indexOf(f)` 都在算"import 先占的偏移"——任何一个写错都过不了实例化。

### 类型段没查重：代价与换种发法

`buildModule` 逐函数生成类型、没有查重表。本模块侥幸没付代价——三个签名恰好互不相同（右栏 type 段 13 字节里的三种形状）；一旦两个函数同签名（比如都导出 `(f64)->f64` 的工具函数），type 段就会带重复字节。换种发法：`Map<签名串, 索引>` 查重，签名串用"参数个数-结果有无"拼接——02 册"type 表去重复用"的工程落点。教学模块不查重的理由也成立：**查重省的是字节不是正确性**，而查重的 key 若漏了结果位，省出来的反而是正确性 bug。

### 为什么导出 main 而不用 start 段

02 册段家族表里有个没用到的 id=8（start 段）：它指定的函数在**实例化时自动执行**。本模块改用"导出 main、宿主手动调"，三条理由：

1. **时序控制权在宿主**：三栏 demo 每次"编译并运行"都走一遍实例化——start 会把"编译"与"执行"焊死在同一次实例化里，REPL 式的反复运行没法做；
2. **结果要能回到宿主**：start 没有"把执行结果交给宿主"的通道；导出函数的调用方（JS）可以拿到返回值、接住 trap；
3. **对称性**：顶层脚本编成导出的 `main` 与普通函数同构（同一条 FnEmitter 路径）——第五阶段"入口也是函数"的决策在 wasm 侧零成本保留。

### 130 字节的构成复核

右栏说"130 字节"——这个数可以逐段算出来（每段 = 1 字节 id + LEB128 长度 + 内容）：

| 段 | id | 长度字节 | 内容构成 | 小计 |
|---|---|---|---|---|
| 文件头 | — | — | 魔数 4 + 版本 4 | 8 |
| type | 1 | `0d`（13） | 个数 1 字节 + 3 个类型（4+5+3 字节） | 15 |
| import | 2 | `0d`（13） | 1 项：`03 'env' 05 'print' 00 00` | 15 |
| function | 3 | `03`（3） | `02 01 02` | 5 |
| export | 7 | `0e`（14） | `fib` 项 6 字节 + `main` 项 7 字节 | 16 |
| code | 10 | `45`（69） | 个数 + fib 体（1+51）+ main 体（1+15） | 71 |

合计 8+15+15+5+16+71 = **130** ✓。三个类型分别是 `60 01 7c 00`（print）、`60 01 7c 01 7c`（fib）、`60 00 00`（main）。**"右栏字节"从此不是天书**：每一格都能这样从结构规则推出来——02 册 41 字节的推演方法在这里原样复用，规模翻了三倍，方法一寸未变。

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

### fib 函数体的 51 字节：逐条拆

fib 的函数体 `0x33` = 51 字节，按 emit 顺序拆开（local 声明 1 字节起步）：

| 字节 | 指令 | 字节数 | 来源 |
|---|---|---|---|
| `00` | 无额外局部声明 | 1 | fib 只用参数 n |
| `20 00` | `local.get 0` | 2 | 条件 `n < 2` 的左 |
| `44 00…00 40` | `f64.const 2` | 9 | 2.0 的小端尾缀 `00 40` |
| `63` | `f64.lt` | 1 | `<` |
| `04 40` | `if`（空结果） | 2 | 03 册直译 |
| `20 00` `0f` `0b` | `local.get 0; return; end` | 4 | 提前 return 模板 |
| `20 00` `44 …f0 3f` `a1` `10 01` | `n−1` → `call 1` | 14 | fib(n−1) |
| `20 00` `44 …00 40` `a1` `10 01` | `n−2` → `call 1` | 14 | fib(n−2) |
| `a0` | `f64.add` | 1 | 两个递归结果相加 |
| `0f` | `return` | 1 | 统一显式 |
| `00` | `unreachable` | 1 | 免疫 fallthru（坑 1） |
| `0b` | `end` | 1 | 函数体收尾 |

加总：1+2+9+1+2+4+14+14+1+1+1+1 = **51** ✓（`0x33`）。三个锚点：**两处 f64 常量按值认字**（2.0 尾缀 `00 40`、1.0 尾缀 `f0 3f`——坑 4 的正面知识）；**`call 1` 而非 `call 0`**——索引空间表里 fib 是 1、print 是 0；**结尾 `0f 00 0b` 三连**——统一显式 return + unreachable 兜底 + end，02/03 册的设计决策在函数体最后 3 字节里会师。main 的 15 字节同法可拆：`00` + `f64.const 25`（9 字节，尾缀 `39 40`——右栏注释 0x4039 的字节化）+ `10 01`（call fib）+ `10 00`（call print）+ `0b`——四条指令、两个静态索引调用，`print(fib(25))` 在 mini 侧的两层 AST 节点到字节层连"找函数"这个动作都不存在。

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

### 基线怎么选，倍率就怎么读

| 对照基线 | 倍率 | 读出什么 |
|---|---|---|
| 裸栈 VM（TS switch 解释） | ~60× | 解释 dispatch 的价格 |
| JIT 稳态的 JS | ~2× | 引擎内联与调用约定的差价（05 册实测二、三） |
| 完整 mini VM（带标签/GC/upvalue） | 只会更大 | 完整运行时的开销叠加在裸版之上 |

三条里没有一条是"wasm 的绝对速度"——**倍率永远是两个数的商，换分母换结论**。写实验笔记时把三行都填上（验收清单的对照实验），比单报一个"60 倍"诚实得多。两处已知偏袒也如实记下：裸版 VM 是解释器的**乐观下限**（60 倍是低估值）；wasm 侧按**稳态**口径算（~2 ms 是热之后的数，05 册：tier-up 只惠及后续调用）。

## 常见坑（每条都实测复现过）

1. **`fallthru` 验证失败**：`if/else` 两臂都 `return` 的函数，结尾不补 `unreachable` 直接被拒——报错 `expected 1 elements on the stack for fallthru, found 0`。checker 知道走不到，验证器不知道；对有返回值的函数统一补 `0x00` 一劳永逸；
2. **unit 调用后 drop**：`print(x)` 的调用没有返回值，`drop` 反而验证失败——用 `inferredType` 分派；
3. **忘声明局部**：`let` 槽位没进函数头的局部声明 → `invalid local index: 1`。本册 `slot()` 顺手记账的写法让"声明"永远不会漏；
4. **f64 端序**：`setFloat64(0, x, true)` 的 `true` 不能省——大端平台会产出"读不回自己"的常量；
5. **以 `WebAssembly.compile` 为准做验证**：wabt 的 `parseWat`（文本路线）不做完整验证，"两臂都 return"这种错误它能放过、引擎当场拒收——CLI 的 `wasm-validate` 与实例化才是裁决；
6. **写给自己的坑（解释器侧）**：定长编码的 VM 里每条指令的步进必须与编码一致——`CALL fn argc` 占 3 格，步进写了 4，结果不是崩溃而是**静默 NaN**（ip 错位后把操作数当指令执行）。反汇编/trace 是唯一救星——第五阶段"反汇编器是第一个调试器"在 wasm 后端升级成 `wasm2wat`。

### 坑的共同形状：契约断在层与层之间

六个坑不是六种独立倒霉，它们共享一个形状——**两套机器对同一条契约的理解不一致**：

| 坑 | 断在哪个接缝 | 02/03 册的对应机制 |
|---|---|---|
| fallthru 验证失败 | emit 的栈认知 ↔ 验证器的栈推演 | 装载期验证（类型栈） |
| unit 后 drop | mini 的"语句收尾"习惯 ↔ wasm 的块结果类型 | blocktype 与签名 |
| 忘声明局部 | 槽位使用 ↔ 函数头声明 | code 段 locals 在指令之前 |
| f64 端序 | 生成端字节序 ↔ 消费端字节序 | 8 字节小端定长 |
| wabt 放行 / 引擎拒收 | 文本工具的宽容 ↔ 引擎的严格 | 验证以实例化为准 |
| VM 步进错位 | 编码宽度 ↔ 步进常数 | 定长编码的取指循环 |

读法：接缝错误在单侧测试里**不可见**（每侧都自洽），只有端到端跑起来才炸——这正是验收清单坚持"端到端 + 浏览器"两个口径的原因。排障顺序因此固定：**先分段（哪条接缝）、再对表（02/03 册的规则）、最后才改代码**；报错没有行号时按 05 册的调试循环走（`wasm-validate` 定位偏移 → `wasm2wat` 看字节被理解成什么）。

## 与其他册的连接

- 41 字节与段规则的出处：[02-二进制格式与WAT](02-二进制格式与WAT.md)——本册 bytes.ts 的规范底稿；
- 指令映射与控制流模板：[03-表达式与结构化控制流](03-表达式与结构化控制流.md)——FnEmitter 的翻译词典；
- 堆数据与互操作的下一步（闭包/数组/字符串的入场券）：[04-线性内存与JS互操作](04-线性内存与JS互操作.md)；
- wabt 四件套、wasm-opt 与性能口径：[05-工具链与性能真相](05-工具链与性能真相.md)；
- 毕业项目 C 的验收标准：[第八阶段 · 导览](../08-第八阶段/01-导览.md)；
- 60 倍的另一半（解释器为什么慢）：[第五阶段 · 解释器实现](../05-第五阶段/04-解释器实现.md)。

## 自测

1. `uleb` 为什么必须 do-while？`n = 0` 时 while 版会产出什么、下游会怎么坏？
2. 本模块的函数索引空间怎么排？`call 1` 的 1 与 `uleb(nImp + i)` 里的 `nImp` 各是什么？
3. 130 字节的逐段构成不看书算一遍；哪两个数字与右栏的 `0d`/`0x45` 对上？
4. fib 函数体 51 字节里 `0f 00 0b` 三连各是什么？去掉 `00` 会发生什么（坑 1 的报错原文）？
5. `tee` 与 `set` 在"赋值嵌进条件"的场景下各会怎样？为什么说一个操作码的选择背后是一条语义承诺？
6. 为什么导出 main 而不用 start 段？三个理由里哪一条与三栏 demo 的交互形态直接相关？

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
