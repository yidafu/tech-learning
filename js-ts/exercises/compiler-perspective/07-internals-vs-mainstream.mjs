/**
 * 大纲章节：阶段 5 编译原理视角——JS 特性的底层实现 vs 主流语言（笔记 28；V8 引擎地基见笔记 07）
 * 主题：四组「可观察的底层实现」实验——
 *   一、数值表示：唯一的数值类型 = IEEE754 double（Smi/HeapNumber 装箱）；位运算被规范
 *       强制截断为 int32（ToInt32）；+0/-0 两个编码；2^53 处精度坍缩——全是表示层的直接后果
 *   二、闭包实现：捕获的是「变量槽位」不是「值」——多个闭包共享同一环境（[[Environment]]）；
 *       对比 C / C++ / Java / Python / Rust 各自的捕获策略（见各节注释）
 *   三、方法派发：原型查找发生在每次调用时——运行时改原型，已创建实例立即生效；
 *       对比 Java/C++ 的 vtable 在类加载期就冻结
 *   四、字符串实现：immutable UTF-16 序列 + cons string（树状、延迟扁平化）——
 *       「+= 比 join 慢」的 folklore 在现代 V8 里必须重新实测
 * 运行：npx tsx exercises/compiler-perspective/07-internals-vs-mainstream.mjs
 * 预期输出：
 * 1a 0            1b -2147483648     1c true        1d false      1e -Infinity
 * 2a 2            2b 0
 * 3a hello-v2     3b own             3c hello-v2
 * 4a true         4b += / join 耗时比 ≈ 1.4–2.7（GC 时机影响波动；join 更快：true）
 * 4c 2
 */

// ============================================================
// 一、数值表示：Number = IEEE754 double，位运算 = int32
// ============================================================
// V8 的值表示：一个 64 位机器字，低位 tag 区分——
//   tag=0 → Smi（小整数直接内嵌在字里，零堆分配）
//   tag=1 → HeapObject 指针（HeapNumber、String、JSObject……）
// 装箱/拆箱是引擎内部行为，JS 层无感；但它的边界会「漏」到语言层：

// 1a/1b：CPU 的位运算指令只吃定宽整数，所以 ECMA-262 规定位运算前先 ToInt32
//        （把 double 截断为 32 位有符号整数）——截断是规范语义，不是引擎偷懒
console.log("1a", 2 ** 32 | 0);            // 0            —— 2^32 mod 2^32
console.log("1b", 2 ** 31 | 0);            // -2147483648  —— 2^31 翻转符号位

// 1c：double 的 53 位尾数 → MAX_SAFE_INTEGER 之外，相邻可表示数的间隔 > 1：
//     2^53 和 2^53+2 都映射到同一个 double → 等式成立（C/Java 的 int64 无此坑）
console.log("1c", Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2); // true

// 1d/1e：IEEE754 有 +0 与 -0 两个编码——「零有两个」是表示层事实，
//         Object.is 的存在就是为了区分它们（=== 分不出）
console.log("1d", Object.is(-0, 0));       // false
console.log("1e", 1 / -0);                 // -Infinity

// ============================================================
// 二、闭包实现：共享环境槽位（[[Environment]]），不是值拷贝
// ============================================================
// ECMA-262：函数对象创建时捕获 [[Environment]]（外层词法环境的引用）。
// 被捕获的变量放在环境（V8: Context）里——闭包们共享同一个槽位，
// 这就是「捕获变量而非捕获值」的可观察后果：

function makeCounter() {
  let n = 0;
  return {
    inc() { return ++n; },
    get() { return n; },
  };
}
const c1 = makeCounter();
c1.inc();
c1.inc();
console.log("2a", c1.get());               // 2 —— inc 写、get 读：同一个 binding

const c2 = makeCounter();
console.log("2b", c2.get());               // 0 —— 每次调用 makeCounter 建新环境，实例间隔离

// 对比其他语言的捕获策略（决定性差异：谁负责管理被捕获变量的生命周期）：
//   C        无闭包。栈帧返回即销毁；要跨帧只能手动传 struct 指针（或 UB）
//   C++      lambda 按值 [=] 拷贝 / 按引用 [&] 挂悬垂风险——捕获方式编译期选定，生命周期归程序员
//   Java     匿名类只能捕获 effectively final 变量（JLS 强制）——实现是「拷贝进合成字段」，
//            不允许共享可变状态；想可变得自己包 int[] / AtomicXXX
//   Python   每个外层变量一个 cell；「读」自动，「写」必须 nonlocal 声明——共享但要有仪式
//   Rust     move / Fn / FnMut / FnOnce 在编译期决定捕获方式，借用检查器杜绝悬垂
//   JS       自动捕获、无声明、闭包间共享同一 binding 且可变——共享语义最激进，
//            代价是被捕获变量逃逸到堆、交给 GC 管理生命周期

// ============================================================
// 三、方法派发：每次调用时的原型查找 vs 类加载期冻结的 vtable
// ============================================================
class Greeter {
  greet() { return "hi"; }
}
const g1 = new Greeter();

// 3a：运行时替换原型方法——已经创建的实例 g1 立即获得新实现。
//     Java/C++ 里不存在等价操作：方法表随类加载冻结，改不了
Greeter.prototype.greet = () => "hello-v2";
console.log("3a", g1.greet());             // hello-v2

// 3b/3c：own property 覆盖原型（查找先 own 后原型链）；delete 掉 own 后回落
const g2 = new Greeter();
g2.greet = () => "own";
console.log("3b", g2.greet());             // own
delete g2.greet;
console.log("3c", g2.greet());             // hello-v2 —— 回落到（已被替换的）原型方法

// 代价：动态派发每次要做原型链查找。IC（笔记 07）把它缓存成
// 「一次 Map 比较 + 一次偏移读取」，TurboFan 甚至能内联——
// 动态语言追平静态语言速度的全部秘密：把「运行时决策」事后固化。

// ============================================================
// 四、字符串实现：immutable UTF-16 + cons string（延迟扁平化）
// ============================================================
// V8 字符串是「不可变 UTF-16 code unit 序列」，内存形态有多种：
//   SeqString（扁平连续）/ ConsString（拼接树：只记左右指针，O(1) 拼接）/ SlicedString（切片视图）
// 经典 folklore「+= 是 O(n²)，要用 join」源于「每拼一次就拷贝整个串」的旧实现/其他语言；
// 现代 V8 的 += 是 O(1) 建一个 ConsString 节点，扁平化推迟到真正需要连续内存时——
// 所以必须实测，别背结论：

const N = 200_000;
const CHUNK = "abcdefghij";

function benchAdd() {
  let s = "";
  for (let i = 0; i < N; i++) s += CHUNK;
  return s.length;
}
function benchJoin() {
  const parts = new Array(N).fill(CHUNK);
  const s = parts.join("");
  return s.length;
}
benchAdd(); benchJoin(); // 预热（JIT tier-up）

const t1 = performance.now(); const l1 = benchAdd(); const d1 = performance.now() - t1;
const t2 = performance.now(); const l2 = benchJoin(); const d2 = performance.now() - t2;

console.log("4a", l1 === l2 && l1 === N * CHUNK.length); // true —— 两版计算等价
console.log("4b", `+= / join 耗时比 ≈ ${(d1 / d2).toFixed(2)}（join 更快：${d2 < d1}）`);

// 对比：C 的 char*（裸指针 + '\0'）、Rust 的 String 是 UTF-8 + 增长需重建缓冲、
//       Java String immutable（所以 StringBuilder 才是正解）——
//       JS 的「字符串拼接不慢」是 cons string 这个实现选择的红利，不是语言固有的。
// 代价：ConsString 树访问字符时要先扁平化（O(n)），且 UTF-16 的索引/length 按 code unit 计
//       （emoji 等 astral 字符 length = 2——「按 UTF-16 code unit 计数」的表示层后果）。
console.log("4c", "😀".length);            // 2 —— 一个 code point 占两个 UTF-16 code unit
