---
mdx:
  format: mdx
references:
  - 26-compiler-perspective
  - 07-v8-engine
  - 06-memory-management
  - 03-this-and-prototype
  - 01-types-and-coercion
  - 04-async-programming
---
# 30 · JS 特性的底层实现：与主流语言逐项对比

> 对应大纲：阶段 5 编译原理视角专题（延续笔记 26/27）；回扣阶段 2 笔记 07（hidden class/IC/elements kinds——本文不重复，只引用）、笔记 06（GC 深入）、笔记 03（this 与原型）、笔记 01（类型转换）。
> 一手依据：ECMA-262——Number 类型定义（IEEE 754-2019 binary64）、ToInt32 抽象操作、函数对象的 `[[Environment]]` 与 MakeConstructor/Closure 创建语义、String 类型定义（UTF-16 code unit 序列）、ES2021 新增的 Memory Model 章节（`SharedArrayBuffer` 的 happens-before）；v8.dev 博客（fast-properties、ignition-interpreter、pointer-compression）与 V8 源码 `src/objects/`（string.h 的 ConsString/SlicedString、contexts.h）；JLS §15.12.4.4 与匿名类捕获规则（effectively final）。

## 学习目标

- 能说清 JS 值的机器表示（tagged word：Smi vs HeapObject），并由此解释位运算 32 位截断、2^53 精度坑、±0 这些「语言层怪现象」。
- 能画出闭包的实现结构（函数对象 + `[[Environment]]` + 共享槽位），并对比 C/C++/Java/Python/Rust 各自的捕获策略与生命周期归属。
- 能解释「原型派发 vs vtable」的差异为什么可观察（运行时改原型），以及 IC 如何让动态派发逼近静态速度。
- 能对每个 JS「特性」回答三段式问题：JS 怎么实现 → 主流语言怎么实现 → 差异的根源是什么。

---

## 关键概念

### 0. 总矩阵：特性 × 实现 × 对比

| 特性 | JS 的底层实现 | 主流语言做法 | 差异根源 |
| --- | --- | --- | --- |
| 值的表示 | tagged word：Smi 内嵌 / HeapObject 指针（HeapNumber 装箱） | C/Java：定宽 primitive + 需要时显式装箱（`Integer`） | JS 只有「一种 Number 类型」，没有 primitive/boxed 两套 |
| 对象布局 | hidden class（Map）+ transition 链（笔记 07） | Java/C++：类加载期冻结的字段 offset 布局 | JS 允许任意时刻加/删属性，形状只能运行时追踪 |
| 方法派发 | 原型链查找（每次调用时）+ IC 缓存 | vtable：类加载期构建、offset 固定 | JS 的类是运行时对象，方法体可以随时替换 |
| 闭包 | 函数对象 + `[[Environment]]` 引用共享环境（Context 堆分配） | C++ lambda 捕获方式编译期定；Java 只准 effectively final；Python cell + nonlocal | JS 自动捕获、共享、可变——语义最激进 |
| 字符串 | immutable UTF-16 序列 + ConsString/SlicedString 多形态 | Rust UTF-8 连续内存；Java immutable + StringBuilder | JS 用「延迟扁平化」换拼接速度 |
| GC | 分代（Scavenger + Mark-Compact，增量/并发） | Java 同为分代；Rust/C++ 无 GC；Go 并发三色 | GC 语言在这点上趋同，差异在「对象形状动态 → 记忆集/写屏障压力」 |
| 并发 | 单线程 agent + 宿主事件循环；共享内存仅 `SharedArrayBuffer` + Atomics | Java JMM + 线程/锁；Go goroutine/channel | JS 的内存模型极简：无共享可变状态，就没有数据竞争 |
| 数值运算 | double + ToInt32 截断的位运算 + BigInt 堆对象 | C/Java：int16/32/64、uint、decimal 多套原生定宽类型 | 「一种浮点类型走天下」的网络脚本出身 |

一个反复出现的模式：**静态语言把决策前移（编译期/类加载期定死），JS 把决策后移（运行时），再用引擎的追踪/缓存/推测把后移的决策「事后固化」**——语义上永远动态，性能上追平静态语言。

### 1. 值的表示：tagged word——「一切都是对象」的真相

V8 里一个 JS 值 = 一个 64 位机器字，最低位做 tag：

```
tag = 0 → Smi（SMAll Integer）：整数直接内嵌在这 64 位里（V8 64 位平台有效载荷 32 位），无堆分配
tag = 1 → HeapObject 指针：指向堆上对象（JSObject、String、HeapNumber、BigInt…）
```

数字若不是 Smi 能装的（超出值域、或带小数），就装箱成 **HeapNumber**（一个只含 double 的堆对象）。三点推论：

1. **位运算截断是规范的静态语义**：CPU 的位运算指令只吃定宽整数，而 JS 的 Number 是 double——ECMA-262 于是规定位运算前先走 **ToInt32**（double → 32 位有符号整数，模 2³² 再解释为有符号）。`2 ** 32 | 0 === 0`、`2 ** 31 | 0 === -2147483648`。C/Java 的位运算作用于原生 int64/uint32 没有这一层。
2. **2^53 精度坑来自 IEEE 754 binary64 的 53 位尾数**：`Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2` 为 true，因为 2⁵³ 附近相邻可表示数的间隔已 > 1。这不是 JS 的怪，是 double 的怪（C 的 `double` 同样如此）；只是 JS 把 double 当唯一数值类型，坑无处可躲。
3. **±0 两个编码**：IEEE 754 里 +0/-0 是不同的位模式。`Object.is(-0, 0)` 为 false 而 `===` 为 true——`Object.is` 存在的意义就是补上「=== 忽略表示层差异」的洞。

对比 Java：`int` 是裸 4 字节、`Integer` 是堆对象，两套类型靠自动拆装箱衔接，泛型还会因擦除拒绝 `List<int>`。JS 反而统一：语言层只有 Number 一种，装箱拆箱全是引擎内部行为（笔记 01 的 boxing 讲的是规范层 wrapper 行为，引擎实际用 tagged word 实现，未必真建 wrapper 对象）。SpiderMonkey/JSC 用另一种策略 **NaN-boxing**（把值藏进 double 的 NaN 位模式里）——「JS 值的表示」是引擎自由度，规范不管；规范只管行为（练习 07 第一节验证的全是规范层后果）。

### 2. 对象与派发：运行时追踪形状 vs 类加载期冻结（回扣笔记 07）

对象布局（hidden class/transition/IC）笔记 07 已深入，这里只补**对比维度**：

- Java/C++ 的对象布局在**类加载/编译期**冻结：字段 offset 写死在方法表与访问指令里，运行时不可变。
- JS 的形状只能**运行时追踪**（transition 链是「事件溯源」式记录），IC 把追踪结果缓存到**每个程序点**。所以 JS 的属性访问最快也要「一次 Map 比较 + 一次 offset 读取」，最好的情况（TurboFan 内联）才等价于 Java 的直接寻址。
- **方法派发的可观察差异**（练习 07 第三节）：Java/C++ 的 vtable 在类加载期冻结，运行时改一个类的所有实例的方法实现是**不存在**的操作；JS 的原型查找发生在每次调用时，`Greeter.prototype.greet = ...` 一行，已创建的实例立即换新实现。own property 覆盖原型、delete 后回落——全是「查找顺序：own → 原型链」的运行时行为。
- 代价与补偿：每次派发都要查链 → IC 把「这个点的历史形状 → handler」缓存起来，热点代码里动态派发同样逼近一条寻址指令。**动态语言的性能故事，一半是「把运行时决策缓存成静态决策」**。

### 3. 闭包：共享环境 vs 各家捕获策略

ECMA-262 的结构：函数对象创建时绑定 `[[Environment]]`（外层词法环境引用）；被内层函数捕获的变量进入环境（V8 实现：Context 对象，堆分配）。

```js live noInline
function makeCounter() {
  let n = 0;
  return { inc() { return ++n; }, get() { return n; } };
}
```

`inc` 与 `get` 引用**同一个环境槽位**——一个写、一个读，`c.get()` 能看到 `inc` 的修改（练习 07 第二节实测 2/0/隔离）。关键对比：**「捕获变量还是捕获值」以及「生命周期归谁管」**：

| 语言 | 捕获语义 | 生命周期归属 |
| --- | --- | --- |
| C | 无闭包；栈帧返回即销毁，跨帧要手动传 struct | 程序员（栈） |
| C++ | lambda `[=]` 拷贝 / `[&]` 引用，编译期选定 | 程序员（`[&]` 悬垂是 UB 温床） |
| Java | 只准捕获 effectively final（JLS 强制），实现为拷贝进合成字段 | GC（匿名类对象） |
| Python | 每个外层变量一个 cell；写要 `nonlocal` 声明 | GC（cell） |
| Rust | `move`/`Fn`/`FnMut`/`FnOnce`，编译期决定 + 借用检查 | 编译期证明安全 |
| **JS** | **自动捕获、无声明、闭包间共享同一 binding 且可变** | **GC（环境对象）** |

三个深刻推论：

1. **Java 禁 effectively final 不是实现偷懒，是语义自洽**：拷贝语义下若允许共享可变状态，闭包看到的值和外部会不一致（两个「同一个变量」）。JS 选择了共享语义（真·同一 binding），就必须让变量**逃逸到堆**交给 GC——这就是「闭包变量不能靠栈」的根源，也是 V8 逃逸分析的目标（没被捕获的变量留在栈帧，被捕获才 context allocate）。
2. **Python 的 nonlocal 与 JS 的沉默共享是同一个机制的不同立场**：都是 cell 共享；Python 要求显式声明避免「无意修改外层」，JS 赌你清楚自己在干什么（`let` 的块级作用域 + TDZ 已经缩小了误伤面）。
3. **Rust 是唯一把「捕获语义」做成类型系统讨论对象的语言**（Fn/FnMut/FnOnce 决定调用方式，借用检查决定可行性）；JS 把同样的决策完全交给运行时和 GC。

### 4. 字符串：immutable UTF-16 + 延迟扁平化

- 语言层：String 是 **UTF-16 code unit 的不可变序列**。`"😀".length === 2`（一个 code point 占两个 code unit）——长度/索引按 code unit 计，是表示层的直接后果（对比 Rust 的 UTF-8：按字节计，`chars()` 才是 code point）。
- 实现层：V8 内存形态不止一种——**SeqString**（扁平连续）、**ConsString**（拼接树：只记左右子串指针，拼接 O(1)）、**SlicedString**（切片视图，O(1)）。`s += x` 不是「拷贝整个旧串」（那是老引擎/Java String 的故事），而是建一个 ConsString 节点；扁平化推迟到真正需要连续内存时（取子串比较、传给外部接口）。
- **实测打脸 folklore**：练习 07 第四节，200K 次 `+=` vs `Array.join`——join 仍快（≈1.4–2.7×，波动来自 GC 时机），因为 `+=` 每迭代仍有一次节点分配 + GC 压力，而 join 是 C++ 循环一次性完成。**结论不是「+= 慢」也不是「+= 快」，而是：性能 folklore 的有效范围 = 引擎实现的有效范围，必须实测**。
- 对比：C 的 `char*`（裸指针 + NUL 结尾，长度 O(n)）、Rust `String`（UTF-8 连续缓冲，增长要重新分配）、Java `String` immutable（所以 StringBuilder 是官方正解）。JS 的 cons string 是「语言规定 immutable + 引擎自由选内存形态」组合的典型红利。

### 5. GC：趋同中的一点差异（回扣笔记 06）

GC 语言在这点上高度趋同：V8 与 JVM 都是分代 GC（新生代复制回收 + 老生代标记清除/整理），都有写屏障维护跨代引用，都在「大多数对象朝生夕死」的分代假设上押注。真正的差异不在算法，在**工作负载**：

- JS 对象的**形状动态**（任意时刻加/删属性）意味着隐藏类、property backing store 这些元数据结构随对象频繁变化，GC 扫描的记忆集（remembered set）里「跨代引用」密度更高、写屏障更忙；
- JS 的分配速率天然更高（函数字面量、闭包环境、中间数组随处产生），新生代 Scavenger 的压力远大于典型 JVM 后端服务；
- Rust/C++ 完全绕开：所有权/作用域规则让生命周期编译期确定，代价是把管理成本转嫁给程序员。Go 用并发三色标记换取低暂停，与 V8 的增量标记思路同源。

### 6. 并发模型：单线程 agent + 极简内存模型（一手依据：ECMA-262 Memory Model）

- JS 的执行单元是 **agent**（单线程）+ 宿主事件循环（笔记 04）。没有「两个线程同时改一个对象」——不是靠锁保证的，而是**模型里根本没有并发访问**。
- 唯一的共享内存通道是 **`SharedArrayBuffer` + `Atomics`**，ES2021 起规范正式给出 **Memory Model 章节**（happens-before 关系、`Atomics.store/load` 的 seq-cst 语义）——JS 也有正式的内存模型文档，只是范围被压到极小。
- 对比：Java JMM（volatile/synchronized 的 happens-before 全集）、Go（goroutine + channel「用通信共享内存」）、C++（datasource/memory_order 全谱系）。JS 的设计把「数据竞争」这个静态语言里最难的验证问题**直接从模型里删掉了**——代价是并行计算只能靠 Worker 多 agent + 消息传递，或 SAB 显式同步。

### 7. 差异根源的收束：出身决定架构

把这些差异排成一列，会发现一个共同成因：JS 的出身是**1995 年浏览器里的网络脚本**——

- 加载即执行、不能等编译 → 字节码 + 分层 JIT，而不是 AOT；
- 网页代码要「随手改 DOM 对象的任意属性」→ 对象形状只能运行时追踪；
- 脚本作者不是系统程序员 → 自动捕获闭包、GC 管内存、单线程免数据竞争；
- 一种数值类型省心 → double 走天下（后果：位运算截断、2^53）。

后来者（Java/C#/Go/Rust）都先定静态契约再谈性能；JS 是「先全动态、性能靠引擎事后追」——这条路线能走到今天，靠的正是笔记 07 的整个机制栈：**运行时追踪形状（Map）→ 缓存决策（IC）→ 押注未来（TurboFan speculation）→ 押错回滚（deopt）**。理解了这条主线，各家语言的差异不再是知识点清单，而是一组可推导的设计后果。

---

## 可运行示例

配套练习：`exercises/compiler-perspective/07-internals-vs-mainstream.mjs`（`npx tsx` 直接运行，四节 13 项输出全注释）：

- 第一节：位运算 int32 截断、2^53 精度坍缩、±0 编码——数值表示的规范层后果；
- 第二节：闭包共享环境槽位 + 实例隔离；
- 第三节：运行时改原型立即生效、own 覆盖与回落；
- 第四节：`+=` vs join 实测（结论：join 仍快，folklore 要用当代引擎重测）、UTF-16 长度。

最小感受版（node REPL 直接粘贴）：

```js live noInline
2 ** 31 | 0                       // -2147483648：ToInt32 截断
Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2  // true：2^53 精度坍缩
function mk() { let n = 0; return [() => ++n, () => n]; }
const [inc, get] = mk(); inc(); inc(); get()   // 2：两个闭包共享同一个 binding
class A { hi() { return "v1"; } }
const a = new A();
A.prototype.hi = () => "v2"; a.hi()             // "v2"：派发发生在调用时
"😀".length                                     // 2：UTF-16 code unit 计数
```

---

## 易错点与面试高频

1. **「JS 里一切都是对象」——不准确**：值是 tagged word，Smi 直接内嵌整数不经过堆；「一切皆对象」是行为层（属性访问的动态性）的说法，不是实现层。
2. **「位运算 32 位是引擎偷懒」——是规范语义**（ToInt32 抽象操作），因为 CPU 位运算指令需要定宽整数而 Number 是 double。
3. **「Java 闭包和 JS 闭包差不多」——语义不同**：Java 拷贝（所以强制 effectively final）、JS 共享（所以变量逃逸到堆）。判断题抓「同一个变量」还是「变量的副本」。
4. **「原型查找很慢所以 JS 方法调用慢」——过时**：IC 缓存后热点派发 ≈ 一次 Map 比较 + offset 读取，TurboFan 能内联；慢的是 megamorphic 的程序点（笔记 07）。
5. **「字符串拼接必须用 join」——folklore 过期**：cons string 让 `+=` 是 O(1) 摊销，但每迭代仍有节点分配；实测 join 仍快 1.4–2.7×，结论是「别背结论、要实测」，不是反转。
6. **「JS 没有内存模型」——错**：ES2021 起有正式 Memory Model 章节，只是范围限定在 SAB + Atomics；主线程模型（无并发访问）不需要它。
7. **面试高频问法**：「JS 的数字在内存里怎么表示」「闭包为什么会内存泄漏（= 环境逃逸到堆 + 引用滞留）」「JS 和 Java 的继承/派发差异」「为什么 JS 单线程还能并行（Worker/agent + SAB）」「为什么 JS 的 Number 都是小数（Smi/HeapNumber）」。答题骨架：值表示 → 环境共享 → 运行时派发 + IC → 模型极简，收尾落在「动态语义 + 引擎事后固化」主线。

---

## 输出预测题

### 题 1（表示层后果三连）

```js live noInline
console.log(2 ** 32 | 0);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(Object.is(-0, 0), 1 / -0);
console.log(" ".length, " ".length);
```

逐行说明输出与「表示层」的因果。

### 题 2（闭包共享语义）

```js live noInline
function make() {
  let n = 0;
  return [() => ++n, () => n, () => { n = 10; }];
}
const [inc, get, set] = make();
inc(); inc(); set(); console.log(get());

const [inc2, get2] = make();
inc2(); console.log(get2());
```

① 两次 `console.log` 各输出什么？② 如果这是 Java 匿名类捕获（允许修改的假想版），两次输出会是什么？为什么 Java 干脆禁止捕获非 final 变量？

### 题 3（动态派发的观察）

```js live noInline
class Repo { find() { return "v1"; } }
const r = new Repo();
Repo.prototype.find = () => "v2";
console.log(r.find());
```

① 输出什么？② 把这套代码翻成 Java，等价操作存在吗？为什么？③ 引擎靠什么机制让 ① 的这种动态派发在热点代码里仍保持高速？

（答案见文末）

---

## 延伸阅读

- ECMA-262——Number/String 类型定义（binary64、UTF-16 code unit）、ToInt32、函数对象 `[[Environment]]`、ES2021 Memory Model（SAB happens-before）
- v8.dev/blog/fast-properties、ignition-interpreter、pointer-compression——值表示与指针压缩（Smi 有效载荷在压缩模式下是 31 位）
- V8 源码 `src/objects/string.h`（ConsString/SlicedString 类注释）、`src/objects/contexts.h`（Context = 环境实现）
- JLS §15.12.4.4 与《Effective Java》Item 24（匿名类与 effectively final 的动机）
- Rust Reference（closure 捕获与 Fn trait 家族）；Python Reference（closures 与 nonlocal）
- 回扣笔记 07（hidden class/IC/elements kinds）、06（GC 分代）、03（this/原型）、04（事件循环）、01（boxing）
- v8.dev/blog/pointer-compression —— tagged word 在 64 位平台的内存代价与压缩方案

---

## 预测题答案

### 题 1

- `0`：位运算前先 ToInt32（规范静态语义），2³² 模 2³² 归零。
- `true`：binary64 尾数 53 位，2⁵³ 处相邻可表示数间隔 = 2，`+1` 与 `+2` 落到同一个 double。表示层（尾数宽度）直接决定算术层。
- `false, -Infinity`：IEEE 754 有 +0/-0 两个编码，`Object.is` 按「SameValue」区分；`===` 把两个零视为相等，`1/-0` 的符号计算暴露了 -0 的存在。
- `1, 1`：字符串是 UTF-16 code unit 序列，BMP 内字符各占 1 个 code unit；若换成 emoji（astral 区）则 length 为 2。

### 题 2

- ① 第一处 `10`（set 直接改共享槽位 n）；第二处 `1`（make() 第二次调用建了**新环境**，实例间隔离）。
- ② 假想 Java 版两次都是…… 第一处取决于「捕获」的实现：Java 是拷贝进合成字段，`set` 改的是它自己那份副本，`get` 读不到 → 第一处输出 `2`；第二处输出 `1`（两个匿名类对象各自持有独立副本，但这次恰好相同）。**这正是 Java 强制 effectively final 的原因**：拷贝语义下允许修改会造成「多个闭包里的『同一个变量』互不同步」的语义混乱；JS 用共享语义（真·同一 binding）+ 堆分配环境避免了混乱，代价是被捕获变量全部逃逸到堆、交给 GC。

### 题 3

- ① `"v2"`。方法派发是调用时的原型链查找，不缓存于实例——已创建的实例 r 立即获得新实现。
- ② 不存在。Java 的方法表（vtable）在类加载期构建且不可变，字节码里 `invokevirtual` 通过固定槽位派发；运行时替换一个类所有实例的方法实现没有对应 API（只能子类覆盖或反射到实现细节层面，均非等价）。
- ③ 内联缓存（IC）：程序点缓存「历史 Map → 派发 handler」，热点代码里派发收敛为一次 Map 比较 + offset 读取；TurboFan 进一步按 feedback 推测并内联，推测失效则 deopt 回退（笔记 07 的 speculation/deopt 闭环）。

## 附：引擎内部 × 主流方案的映射速查（收尾增补）

本册把"引擎内部机制"与"主流语言/运行时方案"做对读，收尾把对读压成一张可背的映射表：

| 引擎内部机制 | 主流方案里的对应 | 一句话同构点 |
|---|---|---|
| 隐藏类（Shapes）与 IC | JVM 的 invokedHierarchy/类加载期方法表 | 结构稳定则派发可静态化 |
| 分层执行（Ignition→Maglev→TurboFan） | JVM 分层编译（C1→C2）、.NET Tiered JIT | 冷代码便宜跑、热代码贵编译 |
| Orinoco 增量/并发 GC | JVM G1/ZGC、Go 非分代混合屏障 | 停顿预算驱动的回收调度 |
| 内联缓存（IC 四态） | CPython 3.11+ 的 adaptive interpreter | "猜类型 + 失败回退"的同构 |
| 去优化（deopt） | JVM 的 uncommon trap | 推测失败的保险机制 |
| inline requires / 惰性加载 | ESM 顶层 await、dynamic import | 把"什么时候编译/执行"变成可调度项 |

读表的用法：引擎机制不再孤立——每一条都能在另一门运行时里找到亲戚，"为什么这样设计"的论证在两个生态里共享同一套约束（停顿、预热、派发成本）。这也是本册标题"internals vs mainstream"的正解：不是对立，是**同一问题域的两份实现目录**。

### 收尾自测（增补）

1. 表中哪一行最能直接解释"V8 冷启动慢、跑久变快"？说出对应的 JVM 同构。
2. 隐藏类退化（delate property / shape 链分叉）在主流方案表里对应哪类派发成本回升？
3. CPython 3.11 的 adaptive interpreter 与 IC 四态的"guess + miss + fallback"逐阶段对照，各对应哪个状态？
4. 你项目里有一处"热点函数被反复 deopt"的传闻：按本册的映射表，第一步排查什么？（负载形状）

### 映射表的三个使用禁忌（避免"懂了"变"误解"）

- **同构不等于同参数**：CPython 的 adaptive 与 V8 IC 同构，但 CPython 没有分层编译的全套——同构点只能解释"设计思想"，不能搬"性能数字"；
- **版本时效强**：引擎机制表每隔一个大版本就可能重排（Maglev 加入改了分层），引用时带版本号；
- **别拿机制当理由**："因为 V8 用隐藏类所以代码要这么写"只在热路径成立——冷路径的书写风格不欠引擎任何债。

三条禁忌的共同底色：映射表是**理解工具**不是**行为规范**——它回答"为什么引擎这样设计"，不直接回答"你的业务代码该怎么写"。后者请走性能测量的正道（[36 册](../stage-2-engine-runtime/36-performance-engineering.md)）。

收尾一句话：引擎内部机制学的不是"V8 秘籍"，是**运行时设计的公共问题清单**——派发、分层、回收、取消，每个生态各自作答，映射表就是答案的对照本。

### 补充：映射表的第 7 行（留给未来）

引擎与运行时的映射表是活的——新机制出现就补一行。当下值得预告的两个方向：类型感知的 JIT 进一步下沉（TS 直接进引擎的讨论从未停过）、WasmGC 让"另一种值表示"进入 JS 引擎的堆（[compiler 站 Wasm 专题](../../compiler/docs/11-Wasm专题/01-导览.md) 有整册对照）。表会长大，问法不变："这个新机制防什么错、买什么快、付什么代价？"

### 收尾自测（增补）

5. 第 7 行的两个预告方向各自"买什么快、付什么代价"？用本册的账单格式各写一行。

### 映射表补遗：三条"错位亲戚"

有些机制在对方生态里没有精确对应，但有"解决同类问题的不同答案"——错位亲戚同样有对照价值：

- V8 隐藏类 ↔ Python 的 `__slots__`：都是"固定形状换派发速度"，一个动态推断、一个显式声明；
- deopt uncommon trap ↔ Java 的 OSR（栈上替换）：都是"冷热切换的纠偏机制"，方向相反（一个降级一个升级）；
- Node 的 let run 微任务清底 ↔ Go 调度器的协作式让出：都在回答"长任务怎么不堵死别人"，一个靠队列相位、一个靠显式 yield。

三行补遗把映射表从"一一对应"扩展成"问题域对照"——这正是本册标题里 vs 的正确读法。

错位亲戚的读法再压一句：**先问"双方各自在防什么错"，再比答案**——机制不同但问题相同的三行，恰恰是"问题域独立性"的最强证据，也是跨生态学习（比如 JS 工程师读 JVM 调优资料）能直接迁移的原因。

### 表格使用的一句话备忘（最终）

映射表（6 行）+ 错位亲戚（3 行）= 9 个对照点，覆盖运行时设计的九个主要问题域；记住问题域比记住对应关系重要——新引擎出现时，用问题域找它的位置，而不是等对照表更新。

最后一问留给动手：挑映射表任意一行，在对方生态里跑一次最小的验证实验（如 JVM 侧 `javap -c` 看一个虚调用）——映射表从"读过的表"变成"验证过的表"，才算你的。

至此本册完整：机制册（内部）+ 映射表（对照）+ 错位亲戚（问题域）+ 动手验证（落地）四层齐备——"internals vs mainstream"的 vs 从此读作"互为镜像"。
