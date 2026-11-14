# SSA 构建：支配树、支配边界与 φ

> [返回：第七阶段导览](01-导览.md)
> 对应大纲第 2 条（前半）。第五阶段[中间表示家族](../05-第五阶段/02-中间表示家族.md)留了一句话："SSA 的完整构造第七阶段展开"——本册兑现。目标：从一个普通 CFG 出发，**完整走通 支配树 → 支配边界 → φ 插入 → 重命名 → 销毁 五步**，每步都是可运行的 TS，最后用解释器证明"原 CFG / SSA / 销毁后"三态语义一致（本机 Node 24 实跑，输出为真实运行结果）。IR 与[上一册](02-数据流分析.md)共用。

## 为什么值得为 SSA 造一台机器

非 SSA 的世界里，"变量"是一串槽位，一个名字对应任意多个定值点。于是每个优化都要先回答"这里的 x 是**哪个** x"——靠[数据流分析](02-数据流分析.md)迭代回答，答案还是保守的。SSA（Static Single Assignment）换了一种赌注：**让每个名字只被定义一次**，同名多版本的问题在构造期一次性结清：

```
;; 非 SSA：x 有两个定值点，汇合处读谁？      ;; SSA：x_1/x_2 各一次，汇合处 φ 显式接住
L_then:  x = 1        ; 定值 A              L_then:  x_1 = 1
L_else:  x = 2        ; 定值 B              L_else:  x_2 = 2
L_join:  y = x        ; 读到 A 还是 B？      L_join:  x_3 = φ(x_1, x_2)   ; 按来路取值
                                            y_1  = x_3
```

φ 的运行时语义只有一句话：**进入块时，按实际来路取对应实参的值**。代价是 IR 多了一种指令、构造要一套算法；换来的是：

- **use-def 链是显式的**：`x_3` 的定义唯一，不需要到达定值分析来猜；
- **一大类优化退化为局部图模式匹配**：常量传播变成"φ 两个实参都是 6 → 换成 6"；死代码消除变成"use 链断了的定值直接删"；
- LLVM IR、V8 TurboFan（sea of nodes 是 SSA 的无调度变体）、Java HotSpot、Go 后端全部建在 SSA 上——**现代中端的公共底座**。

## 第一步：支配树（dominator tree）

d 支配 b ⟺ 从入口到 b 的**每条**路径都经过 d。每个可达块的"最近支配者"idom 唯一，idom 的父子关系构成支配树。它回答的问题是"**谁必然在谁之前**"——SSA 重命名沿支配树遍历的根本原因：定值点支配它的所有使用点（否则会有路径"未定义先使用"）。

构造用 Cooper-Harvey-Kennedy（2001）的迭代算法——工程界事实标准，比 Lengauer-Tarjan 简单且在真实编译器里通常更快。核心恒等式：

```text
idom(b) = 最近公共支配者 of { 已处理的 p | p ∈ pred(b) }
```

```ts
function rpo(cfg: Cfg): number[] {             // 深度优先后序的逆序（入口在最前的准拓扑序）
  const seen = new Set<number>(); const post: number[] = [];
  const dfs = (id: number) => {
    if (seen.has(id)) return; seen.add(id);
    for (const s of cfg[id].succ) dfs(s);
    post.push(id);
  };
  dfs(0);
  return [...post].reverse();
}

function dominators(cfg: Cfg): (number | null)[] {
  const order = rpo(cfg);
  const rpoIdx = new Array(cfg.length).fill(-1);      // 块 id → RPO 序号
  order.forEach((id, i) => { rpoIdx[id] = i; });
  const idom: (number | null)[] = new Array(cfg.length).fill(null);
  idom[0] = 0;                                        // 入口支配自己
  const intersect = (a: number, b: number): number => {   // 沿 idom 链上溯找最近公共祖先
    while (a !== b) {
      while (rpoIdx[a] > rpoIdx[b]) a = idom[a]!;    // 序号大的往上爬
      while (rpoIdx[b] > rpoIdx[a]) b = idom[b]!;
    }
    return a;
  };
  let changed = true;
  while (changed) {                                   // 迭代到不动点——上一册 worklist 的再出场
    changed = false;
    for (const id of order) {
      if (id === 0) continue;
      const ps = cfg[id].pred.filter(p => idom[p] !== null);
      if (!ps.length) continue;
      let d = ps[0];
      for (const p of ps.slice(1)) d = intersect(d, p);
      if (idom[id] !== d) { idom[id] = d; changed = true; }
    }
  }
  return idom;
}
```

`intersect` 的妙处：比较 RPO 序号而不是图结构，把"公共祖先"变成 O(树高) 的双指针爬链。又见 RPO：**按 RPO 迭代，第一轮通常就接近收敛**——和上一册"沿信息流方向排序"是同一个道理，支配信息沿前向边流动。

菱形（B0 分支到 B1/B2 汇合于 B3）的支配树：`idom = [B0, B0, B0, B0]`——B3 的 idom 是 B0 而不是"B1 或 B2"（两条路各缺一个，谁也不支配谁）。循环的支配树见下文实测输出：循环头支配整个环。

## 第二步：支配边界（dominance frontier）

DF(x) = { y | x 支配 y 的某个前驱，但 x 不**严格**支配 y }。白话：**x 的势力范围管不到、却又被 x 的信息绕道抵达的块的入口**。它是 φ 位置的精确答案：

> 变量 v 在块 x 定值，v 的新值能沿边流到所有 x 支配的块（这些块里不需要 φ——那里 v 没有别的版本"顶上来"）。唯一漏出去的口子就是 DF(x)：**只有在那里，来自 x 的值才可能与别的路径上的旧值相遇**。

计算用"汇合点爬链"：只有 ≥2 个前驱的块（汇合点）产出边界；对每个前驱 p，从 p 沿 idom 链爬到 idom(join)，途中每个块都以 join 为边界成员：

```ts
function dominanceFrontiers(cfg: Cfg, idom: (number | null)[]): Set<number>[] {
  const df = cfg.map(() => new Set<number>());
  for (const b of cfg) {
    if (b.pred.length < 2) continue;                  // 只有汇合点产出边界
    for (const p of b.pred) {
      let runner = p;
      while (runner !== idom[b.id]) {                 // 从前驱沿 idom 链爬到 b 的直接支配者
        df[runner].add(b.id);                         // 途中的每个块都以 b 为支配边界成员
        runner = idom[runner]!;
      }
    }
  }
  return df;
}
```

为什么"爬到 idom(join) 为止"：join 的所有前驱以及它们各自的祖先（直到 idom(join)）都不严格支配 join，但都"够得着" join——它们的信息恰好在 join 处可能与其它路径的汇合，正好是 DF 的定义。

## 第三步：φ 插入（迭代支配边界）

对每个变量 v：从它的所有定值块出发，把 φ 放到定值块的 DF 上；**φ 本身是一次新定值**，它的 DF 还要继续放——用 worklist 扩散到不动点：

```ts
function insertPhis(cfg: Cfg, df: Set<number>[]) {
  const defBlocks = new Map<string, Set<number>>();  // 变量 → 定值块集合
  for (const b of cfg) for (const d of b.instrs)
    if (d.dest) {
      if (!defBlocks.has(d.dest)) defBlocks.set(d.dest, new Set());
      defBlocks.get(d.dest)!.add(b.id);
    }
  for (const [v, defs] of defBlocks) {
    const wl = [...defs];                             // worklist：从所有定值块出发
    const hasPhi = new Set<number>();
    while (wl.length) {
      const x = wl.pop()!;
      for (const y of df[x]) {
        if (hasPhi.has(y)) continue;
        cfg[y].phis.push({ dest: v, args: cfg[y].pred.map(from => ({ from, name: v })) }); // 名字占位，下一步回填
        hasPhi.add(y);
        if (!defs.has(y)) wl.push(y);                 // φ 是新定值 → 继续向更外层扩散
      }
    }
  }
}
```

这产出 **minimal SSA**：只放"不同路径的值可能相遇"所必需的 φ。但"必要"不等于"有用"——循环里的临时变量 `t`（在块内定义、块内消费）也会在循环头得到一个**死 φ**（下一节实测会看到，且死 φ 的一个实参可能是"未定义值"）。**pruned SSA** 在插入前先跑一遍[活跃变量分析](02-数据流分析.md)，只对"入口处活跃"的变量放 φ——多用一次分析，换更少的 φ。教科书路线先讲 minimal 是对的：它证明了"φ 的位置可以被精确计算"，pruned 只是加了个过滤器。

## 第四步：重命名（Cytron 算法）

φ 插入后名字还是老的（`x` 有 N 个定值点）。重命名沿**支配树** DFS：每个变量一条版本栈，栈顶 = 当前版本；进入块压入新版本、离开弹出——**定值点支配使用点的保证，让"栈顶就是所见版本"成为定理而不是巧合**：

```ts
function rename(cfg: Cfg, idom: (number | null)[]) {
  const root = (n: string) => n.replace(/_\d+$/, ''); // x_3 → x（剥离版本后缀）
  const children = cfg.map(() => [] as number[]);     // 支配树：idom 的逆映射
  cfg.forEach(b => { if (b.id !== 0 && idom[b.id] !== null) children[idom[b.id]!].push(b.id); });
  const counter = new Map<string, number>();
  const stack = new Map<string, string[]>();
  const newName = (v: string) => {
    const i = counter.get(v) ?? 0;
    counter.set(v, i + 1);
    const name = `${v}_${i}`;
    if (!stack.has(v)) stack.set(v, []);
    stack.get(v)!.push(name);
    return name;
  };
  const cur = (v: string) => stack.get(v)?.at(-1) ?? v;   // 栈空 = 参数/自由变量，用原名
  const renameBlock = (b: Block) => {
    const pushed: string[] = [];
    for (const phi of b.phis) { phi.dest = newName(root(phi.dest)); pushed.push(phi.dest); }
    for (const d of b.instrs) {
      d.srcs = d.srcs.map(cur);                       // 先改 use（读旧版本），再改 def
      if (d.dest) { d.dest = newName(d.dest); pushed.push(d.dest); }
    }
    if (b.term.op === 'br') b.term.cond = cur(b.term.cond);
    if (b.term.op === 'ret') b.term.srcs = b.term.srcs.map(cur);
    for (const s of b.succ)                           // 回填后继 φ 中"来自本块"的实参
      for (const phi of cfg[s].phis) {
        const arg = phi.args.find(a => a.from === b.id);
        if (arg) arg.name = cur(root(phi.dest));      // 本块结束时刻该变量的当前版本
      }
    for (const c of children[b.id]) renameBlock(cfg[c]);
    for (const v of pushed) stack.get(root(v))!.pop(); // 离开块：弹掉本块压入的版本
  };
  renameBlock(cfg[0]);
}
```

两个细节决定成败：

- **φ 实参的回填时机**：φ 的实参属于"某条入边的末端"，语义上是**前驱块结束时刻**的值。所以回填发生在处理前驱块时（取 `cur(v)`），而不是处理 φ 所在块时——写在同一边的话，版本栈的深度是错的。
- **栈空 = 外部定义**：函数参数、闭包变量没有块内定值点，`cur` 返回原名——它们的"单赋值"由函数边界保证。

## 实测：菱形与循环

菱形（`x` 三处定值）与求和循环（`i`/`s` 循环携带）构造 SSA 的真实输出（节选）：

```text
--- diamond · SSA 后 ---
B3 (pred 1,2): ret
    x_3 = φ(x_1←B1, x_2←B2)
    _ = print(x_3)
  idom: B0←B0 B1←B0 B2←B0 B3←B0
  DF:   B0:{} B1:{B3} B2:{B3} B3:{}

--- loop · SSA 后 ---
B1 (pred 0,3): br t_1 ? B2 : B4        ← 循环头
    i_1 = φ(i_0←B0, i_2←B3)            ← 循环携带：初值 + 上一轮
    s_1 = φ(s_0←B0, s_2←B3)
    t_0 = φ(t←B0, t_1←B3)              ← 死 φ（minimal SSA 的代价）
    t2_0 = φ(t2←B0, t2_1←B3)           ← 同上
    t3_0 = φ(t3←B0, t3_1←B3)           ← 同上
    t_1 = lt(i_1,n)
B4 (pred 1): ret s_1                    ← 出口读的是 φ 版本，天然正确
  idom: B0←B0 B1←B0 B2←B1 B3←B2 B4←B1
  DF:   B0:{} B1:{B1} B2:{B1} B3:{B1} B4:{}
```

四件事值得盯住看：

1. **循环头在自己的 DF 里**（`B1:{B1}`）——回边让"块支配自己直达的路径"不成立，这正是循环携带变量必须有 φ 的图论原因；
2. `i_1 = φ(i_0←B0, i_2←B3)` 的两个实参：**入口初值 + 上一轮的值**——φ 把"迭代"编码成了数据流；
3. 死 φ 的实参 `t←B0` 里 `t` 连版本号都没有（栈空回退原名）——"未定义值"在 minimal SSA 里就这样显形，pruned SSA 会把它们整个去掉；
4. `ret s_1` 读的是 φ 版本：**出口处的"最终值"就是 φ 名字本身**，不需要任何"循环退出时变量是谁"的特判。

## 第五步：销毁 SSA（out-of-SSA）

机器不认识 φ。销毁的朴素想法：`x_3 = φ(x_1←B1, x_2←B2)` 拆成"在每个前驱末尾补 `x_3 ← x_1` / `x_3 ← x_2`"。但**同一个前驱末尾的一组拷贝是并行语义**（同时读所有源、再写所有目标）——顺序执行会踩坏还没读的值：

```text
并行拷贝 {a←b, b←a}（交换）      顺序执行 a←b; b←a → a、b 都是旧 b —— 错
                                正确序:  tmp←b; b←a; a←tmp
```

顺序化算法：**能发的先发，全堵死就是环、用临时变量断开**：

```ts
interface Copy { dst: string; src: string }
function seqCopies(copies: Copy[]): Copy[] {
  const pending = new Map(copies.map(c => [c.dst, c.src]));
  const out: Copy[] = [];
  let tmpN = 0;
  while (pending.size) {
    const ready = [...pending].find(([dst]) => ![...pending.values()].includes(dst));
    if (ready) {                                     // dst 没被任何剩余拷贝当源读 → 现在写它安全
      out.push({ dst: ready[0], src: ready[1] });
      pending.delete(ready[0]);
    } else {                                         // 全堵死 = 交换环：先救出一个源
      const [dst, src] = [...pending][0];
      const t = `_tmp${tmpN++}`;
      out.push({ dst: t, src });                     // tmp ← src（保住旧值）
      pending.set(dst, t);
    }
  }
  return out;
}

function outOfSSA(cfg: Cfg) {
  for (const b of cfg) {
    const byPred = new Map<number, Copy[]>();
    for (const phi of b.phis)
      for (const arg of phi.args) {                  // 每条入边补一份 dst ← src
        if (!byPred.has(arg.from)) byPred.set(arg.from, []);
        byPred.get(arg.from)!.push({ dst: phi.dest, src: arg.name });
      }
    b.phis = [];
    for (const [p, copies] of byPred)
      for (const c of seqCopies(copies)) cfg[p].instrs.push({ op: 'copy', dest: c.dst, srcs: [c.src] });
  }
}
```

实测（真实运行结果）：链 `{x1←x2, y1←x1}` 产出 `y1←x1; x1←x2`（**必须先发 y1←x1**，否则 x1 的新值污染 y1）；环 `{a←b, b←a}` 产出 `_tmp0←b; b←a; a←_tmp0`。判据值得背下来：**ready = 目标不再是任何剩余拷贝的源**（不是"源不是别人的目标"——那是反的）。

销毁后会留下一堆 `x_1 = copy(x_0)` 式的冗余拷贝（菱形实测输出里就有），工业实现接一趟**拷贝折叠 + 寄存器合并（coalescing）**收拾干净——那已经踏入寄存器分配的领地。教学版直接把拷贝链交给[下一册的 pass 管线](04-经典优化pass.md)：复制传播 + DCE 恰好能清掉大部分（04 册有实测）。

## 三态语义一致性：构造是否正确的最终裁判

写一个 30 行的 TAC 解释器（φ 的语义：进块时按来路取实参），对"原 CFG / SSA / 销毁后"跑同一组输入：

```text
diamond  c=true/false : 三态执行轨迹一致，print(2)/print(1) 各按分支正确
loop     n=3 / n=0    : 原=[B0 B1 B2 B3 B1 B2 B3 B1 B2 B3 B1 B4 ret(3)]
                        SSA=[同上]  销毁=[同上]  → OK 三态一致
```

`n=0`（循环零次执行）这个用例专门打 φ 的软肋：零迭代时循环携带 φ 取的全部是入口实参——`ret(0)` 三态一致证明 φ 的"按来路取值"在边界情况下也对。**SSA 构造器的测试方法论就这一句话：不比中间形态长得对不对，比三态执行结果一不一样**；再往上一层，就是随机程序 + 随机输入的差分测试。

## 工业界的 SSA

- **LLVM IR**：SSA 为主干，alloca/load/store 给可变变量留了后门（前端偷懒的逃生通道，mem2reg pass 再把它提升成 φ）；
- **V8 TurboFan 的 sea of nodes**：SSA 值 + 显式控制依赖子图，指令无序、调度后置（[第五阶段](../05-第五阶段/02-中间表示家族.md)形态⑤）——φ 的角色由"节点 + 控制输入"承担；
- **GVN（全局值编号）**：在 SSA 上把"算过一样的表达式"指到同一个名字——φ 让它从数据流问题退化成哈希查表，[04 册](04-经典优化pass.md)的 LVN 是它的局部版。

## 自测

1. 菱形的 `idom(B3) = B0`。如果汇合块只有一个前驱（比如把 else 分支删掉），B3 的 idom 会变成谁？DF 表怎么变？
2. 循环头的 DF 包含自己。用"绕过支配"的白话解释：为什么 `while` 的回边必然造成这个结果？它和"循环携带变量必须有 φ"是什么关系？
3. minimal SSA 在循环头给块内临时变量 `t` 也放了 φ。pruned SSA 靠哪个数据流分析、在什么判断下跳过它？这个 φ 的哪个实参暴露了"未定义值"？
4. 重命名为什么必须沿支配树而不是 CFG 的任意 DFS？给一个反例：沿 CFG DFS 重命名，某个 use 会读到什么错误版本？
5. `seqCopies` 的 ready 判据换成"源不是任何剩余拷贝的目标"会怎样？对 `{x1←x2, y1←x1}` 跑一遍，产出的顺序哪里错了？
6. 解释器验证三态一致时，为什么必须包含"循环零次执行"的用例？它检验的是 φ 的哪条语义边？

## 附：SSA 的三条读心术：看到 φ 该立刻想到什么

构建学完之后，真正日日有用的是"读别人的 SSA"——IR dump 里满眼 φ，三条反射直接决定阅读速度：

1. **φ 的实参数 = 前驱数，漏一个前驱就是漏一条语义边**。读到只有两个实参的 φ 却身处三前驱块，立刻查"哪条边被合并了"（优化 pass 常删边但忘删 φ 实参——这是真实编译器的经典 bug 类别）；
2. **φ 实参按前驱顺序对应，但"顺序"取决于前驱列表的存储顺序**——不同 dump 工具的前驱顺序不同（RPO 序、块号序），读之前先确认该工具的约定。本册解释器验证之所以强调"三态一致"，就是逼着你把"顺序约定"从隐性知识变成显性检查；
3. **φ 链（φ 指向另一个 φ）通常意味着"值经过了两轮合流"**——嵌套循环/多级分支的特征形状。读到 φ 链先画"哪两轮合流"，再看外层 φ 的实参是不是内层 φ——支配树的层次直接对应 φ 链的层次。

三条合起来还有一个工程推论：**SSA 是"读"远多于"写"的表示**——你大概率不会手写 SSA 构建器（LLVM/Cranelift 都内置了），但读 IR dump 的能力决定你能不能做 pass 级调试。第七阶段的实验（07 册的逐 pass dump）练的就是这个：能对着 φ 读出"这一版与上一版差在哪"，优化器的调试就入门了。
