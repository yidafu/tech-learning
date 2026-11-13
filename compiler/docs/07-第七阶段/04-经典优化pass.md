# 经典优化 pass 与管线组织

> [返回：第七阶段导览](01-导览.md)
> 对应大纲第 2 条（后半）。分析（02 册）与 SSA（03 册）都是"给依据"；本册是"动刀"的部分：折叠、传播、消除、内联、窥孔五类经典 pass，以及**它们为什么必须组成管线、按什么顺序跑**。所有代码在本机 Node 24 实跑（输出为真实运行结果），跑在不带 φ 的 TAC CFG 上——正如[第五阶段](../05-第五阶段/02-中间表示家族.md)所说，mini 走的是"字节码 + 保守分析"路线，SSA 版的同一批 pass 只是形态更漂亮，算法灵魂相同。

## pass 分类学：先认清楚手里的刀

| 维度 | 分类 | 例 |
|---|---|---|
| 作用范围 | 局部（块内）/ 全局（CFG）/ 循环 / 过程间 | 窥孔、LVN / 常量传播、DCE / LICM / 内联 |
| 性格 | **转换型**（把代码变好）vs **清理型**（把变好后的残骸扫掉） | 折叠、内联 / DCE、死分支裁剪 |
| 依据 | 确定性等价（怎么变换都合法）vs 分析支撑（依据分析结论才敢换） | 代数化简 / 常量传播、CSE、LICM |

第二行是本册的主线：**转换型 pass 制造机会，清理型 pass 兑现机会，且互相喂饭**——折叠让分支条件变常量 → 死分支裁剪删掉整块 → 块里的定值消失 → 传播的格值变准 → 又能折叠……管线必须**迭代到不动点**。

## 常量折叠：先立规矩

折叠 = 编译期把 `2*3` 算成 `6`。规则看似废话，边界全是坑——**编译器不允许改变可观察行为**（否则正确的程序被优化错）：

- **整数除零**：不折叠，留给运行时报错——mini 的 `DIV` 语义是运行时错误，编译期算掉等于把错误吞了；
- **浮点 `x * 0` 不是 `0`**：`x = NaN` 时 `NaN*0 = NaN`，`x = -1` 时结果是 `-0`（`1/-0 = -∞`，符号可观察）。整数域可以 `x*0 → 0`，浮点域不行——阶段自测考过这题，这里给出机制层面的完整答案；
- 溢出：语言若定义回绕（wasm 的 `i32.add`）可折叠；若定义抛错（Rust debug）则不可——**折叠规则跟着语言语义走，不跟着数学走**。

```ts
const FOLD: Record<string, (a: any, b: any) => number | boolean | null> = {
  add: (a, b) => typeof a === 'number' && typeof b === 'number' ? a + b : null,   // null = 不可折叠
  sub: (a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : null,
  mul: (a, b) => typeof a === 'number' && typeof b === 'number' ? a * b : null,
  lt:  (a, b) => typeof a === 'number' && typeof b === 'number' ? a < b : null,
  gt:  (a, b) => typeof a === 'number' && typeof b === 'number' ? a > b : null,
};
```

## 常量传播 + 死分支裁剪：02 册格理论的变现

折叠只处理"字面量直接相碰"；传播负责把常量**送到**运算跟前。状态是 02 册讲过的三值格 `⊤ → c → ⊥`，meet 逐变量：相等则保持，不同则 ⊥。它就是数据流分析的直接实例化（`Env = Map<变量, 格值>`）：

```ts
type Lat = { k: 'top' } | { k: 'const'; v: number | boolean } | { k: 'bot' };
const meetV = (a: Lat, b: Lat): Lat =>
  a.k === 'top' ? b : b.k === 'top' ? a
  : a.k === 'const' && b.k === 'const' && a.v === b.v ? a : { k: 'bot' };

function evalInstr(d: Instr, env: Map<string, Lat>): Lat {   // 单条指令的抽象求值
  if (d.op === 'const' && d.lit !== undefined) return { k: 'const', v: d.lit };
  if (d.op === 'copy') return env.get(d.srcs[0]) ?? { k: 'top' };
  const f = FOLD[d.op];
  if (!f || !d.dest) return d.dest ? { k: 'bot' } : { k: 'top' };
  const vs = d.srcs.map(s => env.get(s));
  if (vs.some(v => !v || v.k === 'bot')) return { k: 'bot' };
  if (vs.some(v => v.k === 'top')) return { k: 'top' };
  const r = f(...vs.map(v => v!.v));
  return r === null ? { k: 'bot' } : { k: 'const', v: r };
}
// 块内逐步推进 + 块间 worklist 的骨架与 02 册 solve 完全同构，此处从略（完整实现见 07 册工程版）
```

传播收集到的常量有两种兑现方式，本册实现合在一个 `foldAndPrune` 里：

1. **算得出常量的指令 → 改写成 `const` 指令**（`t2 = mul(t1,k)` 当 k=3、t1=⊥ 时保持原样——只重写整体可折叠的）；
2. **分支条件是常量 → 删死边**：`br debug`（debug=false）只保留活边，终结指令退化为 `jmp`；随后沿活边做可达性，**不可达块整块删除**——块里就算有 `print` 也删，因为它永远不会执行。

第 2 条是常量传播威力的一半：它不只优化计算，**还优化控制流**，删掉代码后格值又能变准（死块里的定值不再污染汇合点）。完整形态是 SCCP（稀疏条件常量传播），把"边的可达性"也并进 worklist 一起迭代；本册的两步走（先传播后裁剪）是它的可读近似。

## 复制传播与 CSE：局部值编号（LVN）

`a = b; use(a)` → `use(b)`：拷贝只为"改名"付费。块内做一张"名字 → 等价代表"的小表即可。CSE 的局部版 **LVN（local value numbering）** 把它一并解决：给每个计算出的值编号，**同值不同名 → 后者改写成前者的拷贝**：

```ts
function lvn(cfg: Cfg): boolean {
  let changed = false;
  for (const b of cfg) {
    const table = new Map<string, string>();            // 表达式键 → 首次计算的名字
    for (const d of b.instrs) {
      d.srcs = d.srcs.map(s => table.get(s) ?? s);      // 先换等价代表（顺带传播了拷贝）
      if (!d.dest || !FOLD[d.op]) continue;
      const key = `${d.op}(${d.srcs.join(',')})`;
      const hit = table.get(key);
      if (hit !== undefined && hit !== d.dest) {        // 算过 → 改写成拷贝
        d.op = 'copy'; d.srcs = [hit]; changed = true;
      } else if (hit === undefined) {
        table.set(key, d.dest);
      }
    }
  }
  return changed;
}
```

实现只有 15 行，但有三个"真实世界"的注意点：

1. **交换律**：`add(a,b)` 与 `add(b,a)` 键不同却同值——工业 LVN 先把操作数**按值编号排序**再拼键。教学版按键精确匹配，漏掉交换对的代价只是少优化，不会错；
2. **kill 要跟着值编号走**：块内重定义操作数后，涉及旧值的表项作废——本实现靠"srcs 先替换成代表名"间接触发（代表名变了，键就变了），能跑但绕；工业实现给"值"和"名字"分两张表；
3. **全局 CSE** 要 02 册的可用表达式分析把表扛过基本块边界——`B0 算过 gt(a,b)`、两条分支都没改 a/b，汇合处 `gt(a,b)` 才敢复用（02 册 max 的实测输出里 `gt(a,b)` 恰好在两支都可用，就是教科书案例）。

## 死代码消除：mark-sweep，和 GC 同构

DCE 的判据"结果没人读 + 无副作用"由[活跃变量分析](02-数据流分析.md)给出；实现形态是**标记-清除**——和第六阶段 GC 一个模子：

```ts
function dce(cfg: Cfg): boolean {
  const live = new Set<Instr>();                       // 按定值点标记（非 SSA 时同名多定义各自算）
  const defsOf = new Map<string, Instr[]>();
  for (const b of cfg) for (const d of b.instrs)
    if (d.dest) (defsOf.get(d.dest) ?? defsOf.set(d.dest, []).get(d.dest)!).push(d);
  const markVar = (v: string) => {
    for (const d of defsOf.get(v) ?? [])
      if (!live.has(d)) { live.add(d); d.srcs.forEach(markVar); }   // 活的定义传染它读的变量
  };
  for (const b of cfg) {                               // 根集合：副作用指令读的变量
    for (const d of b.instrs) if (d.op === 'print') d.srcs.forEach(markVar);
    if (b.term.op === 'br') markVar(b.term.cond);
    if (b.term.op === 'ret') b.term.srcs.forEach(markVar);
  }
  let changed = false;
  for (const b of cfg) {
    const keep = b.instrs.filter(d => d.dest === null || live.has(d));
    if (keep.length !== b.instrs.length) { b.instrs = keep; changed = true; }
  }
  return changed;
}
```

根是副作用（print/分支条件/返回值），可达性沿 use-def 链传染，扫掉的是"不可达的纯计算"——把根集合换成"栈+全局"，就是第六阶段的标记-清除 GC。**"活"的定义在两个世界里一字不差**；[前端工程对照册](06-前端工程优化对照.md)会把这份同构带到 tree-shaking。

## 内联：优化之母

内联（inlining）= 把 `f(x)` 的调用点展开成函数体。它自己省的只是 CALL 开销，**真正的价值是把过程间的墙拆掉**：展开后，调用者的常量能传播进函数体、函数体的死代码能被整体消除、CSE 的表能横跨调用边界——几乎每一类 pass 都因内联而更强，所以说"内联是优化之母"。

mini 语义下的内联（AST 层面）：

```ts
// fn sq(x: number) -> number { return x * x; }
// sq(a + 1) + sq(b)
//
// ① 参数绑定：调用实参替换形参（重命名防碰撞：sq 体内 x → x_0）
// ② 单 return 展开：return e → 把 e 填回调用点
//    → (a + 1) * (a + 1) + b * b
// ③ 后续 pass 接管：LVN 抓住 (a+1)*(a+1) 的重复、传播/折叠/DCE 照常清扫
```

多 return、递归、体积阈值、调用深度预算——工程内联器一半的代码在做"**值不值得**"的决策：

- **收益**：常量实参（暴露折叠机会）、热点小函数、单行包装函数；
- **代价**：代码膨胀（I-cache 友好性下降）、编译时间、递归无界展开；
- 现代引擎更进一步：**运行时按 profile 内联**（只内联热点路径上见过的 callee 形状）——那是 [JIT 视角册](05-JIT视角.md)的主场。

## 窥孔优化：最便宜也最实用

在目标码（或接近目标的 IR）上开一个小窗口，匹配到模式就替换。它不依赖任何分析，靠的是一张**模式表**：

| 模式 | 替换 | 依据 |
|---|---|---|
| `JMP L; L:` | 删 JMP | 落到下一条 |
| `JMP L1` 且 L1 处是 `JMP L2` | 改 `JMP L2` | 跳转 threading |
| `ADD 0` / `MUL 1` | 删 | 代数恒等 |
| `NOT NOT x` | `x` | 双重否定 |
| 压栈后立即弹出（栈机） | 两条全删 | 栈平衡 |

窥孔是**兜底**：前端 lowering 产生的碎片（第五阶段短路求值模板里的冗余跳转）由它回收。[07 册实践](07-实践-优化pass与收益分析.md)在 mini 字节码上给出完整实现——`CONST x; POP → ε` 这个模式还顺手兜住了死存储消除换出来的 POP 残骸。

## 循环优化一瞥

大纲点到两个循环优化，判据全部来自前两册：

- **LICM（不变量外提）**：`while (c) { y = n*one; }` 中 `n`、`one` 全环不变。判据 = 定值支配所有使用 + 循环内无定值（02 册实测输出里 `n/one` 全图活跃就是信号）。**安全点**：只能外提到**支配循环体的位置**（循环头入口）；若有 `break` 依赖或循环可能零执行，提到循环外可能多算一次——副作用与除零语义决定合法与否；
- **归纳变量简化**：`for i: a[i]` 的地址 `base + i*8` 每轮加 8 递推，乘法变加法、强度削弱；`i` 本身若只用于迭代（无人读），DCE 可再删——一个优化给另一个优化喂饭的循环案例。

SSA 上的循环优化（loop-rotate、indvar canonicalization）是 LLVM middle-end 的重头戏，思路同源、机器更贵——此处点到为止，Mini 不实现（列入 07 册选做）。

## 管线：组织起来，迭代到不动点

单看每个 pass 都简单，**难在顺序**（phase ordering 是 NP 难的开放问题），工程答案朴素：

1. **信息流向决定粗顺序**：内联最先（拆墙）→ 传播/折叠（产生常量与死代码）→ CSE/复制传播（合并）→ DCE 最后扫尾；
2. **不猜一轮够不够，直接迭代到不动点**：任何 pass 报告了变化就整体再跑一轮；
3. **pass manager 管依赖与预算**：LLVM 新 PM 按 pass 明确声明分析依赖（谁要 AAResults、谁要 DominatorTree），分析结果按需缓存失效——教学版一个 for 循环足矣：

```ts
function pipeline(cfg: Cfg): number {
  let round = 0;
  let changed = true;
  while (changed && round < 10) {
    round++;
    changed = false;
    changed = foldAndPrune(cfg, constProp(cfg)) || changed;   // 传播+折叠+死分支裁剪
    changed = copyProp(cfg) || changed;
    changed = lvn(cfg) || changed;
    changed = dce(cfg) || changed;
  }
  return round;
}
```

一个吃满所有 pass 的例子（`k=3`、`debug=false`、`t3` 与 `t1` 同式、死分支、无用计算），实测 **2 轮到不动点**：

```text
--- 优化前 ---
B0: k = const 3; debug = const false; t1 = mul(a,a); t2 = mul(t1,k);
    t3 = mul(a,a); w = const 2;            br debug → [B2, B1]
B1: d1 = add(t2,hundred); print(d1)        ← 死分支（debug 恒假）
B2: r = add(t2,t3); dead = add(r,r); print(r); ret r

--- 优化后（2 轮到不动点） ---
B0: k = const 3; t1 = mul(a,a); t2 = mul(t1,k); t3 = copy(t1); jmp → [B1]
B1: r = add(t2,t3); print(r); ret r

可观察行为: 前=[print(64) ret(64)]  后=[print(64) ret(64)] → OK 语义一致
（块号因删除不可达块而变化，不计入对照）
```

逐条对账：`debug` 与死分支一起消失；`w`、`dead` 被 DCE 清掉；`t3` 被 LVN 改写成 `copy(t1)`；`t2 = mul(t1, k)` 保留（t1 未知，只把 k 传播到位——**传播停在格值的 ⊥ 处，不多走一步**）。

第二个例子接[上一册](03-SSA构建.md)的摊子：SSA 销毁留下的拷贝链，同一个管线清理后 `s = add(a0, b0)` 一条留下（`b1 = copy(b0)` 无读者，DCE 删除；`a1 = copy(a0)` 被复制传播穿透）——实测 `ret(42)` 前后一致。**转换 pass 之间互相喂饭的具体形态，就在这两个例子里**。

## 自测

1. 为什么整数 `x*0 → 0` 合法而浮点不合法？分别给出 `x` 的取值使两种语言的浮点 `x*0` 不等于 `0`。
2. 常量传播的格 meet 里，`⊤ ∧ ⊥ = ⊥` 而不是 `⊤`——从"没见过"和"见过但不是常量"的语义差别解释为什么。
3. LVN 的键 `add(a,b)` 与 `add(b,a)` 不同值吗？给出工业实现"按值编号排序操作数"仍不安全的运算符类别（提示：减法不行吗？浮点加法的交换有例外吗）。
4. DCE 的根集合为什么必须包含分支条件，而不仅是有副作用的调用？漏掉它哪个用例会优化错？
5. 内联 `sq(sq(a))` 两层之后，哪些后续 pass 各自吃到什么红利？如果 sq 体积是 500 行呢？
6. 管线为什么把 DCE 放在最后而不是最先？"转换 pass 报告变化就重跑一轮"的停止条件为什么必然停？
