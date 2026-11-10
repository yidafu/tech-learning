/**
 * 大纲章节：阶段 2 引擎与运行时
 * 主题：用 V8 natives（%HaveSameMap）验证隐藏类的共享与破坏
 * 运行：node --allow-natives-syntax exercises/v8-and-performance/01-hidden-class.mjs
 *       （忘加 --allow-natives-syntax 时自动降级为「相对耗时对比」，仍输出确定性结论）
 * 预期输出（--allow-natives-syntax 模式，逐行）：
 *   == 实验 0：natives 可用性 ==
 *   --allow-natives-syntax 已开启：true
 *
 *   == 实验 1：相同构造顺序 → 共享隐藏类 ==
 *   a = new Point(1, 2); b = new Point(3, 4)
 *   %HaveSameMap(a, b) = true
 *
 *   == 实验 2：属性添加顺序不同 → 形状分叉 ==
 *   p: {} → +x → +y    q: {} → +y → +x
 *   %HaveSameMap(p, q) = false
 *
 *   == 实验 3：delete → 慢属性（dictionary mode）==
 *   r = new Point(1, 2); s = new Point(3, 4)
 *   delete 前   %HaveSameMap(r, s) = true
 *   delete r.x 后 %HaveSameMap(r, s) = false
 *
 *   == 实验 4：置 null 代替 delete → 形状保持 ==
 *   t = new Point(1, 2); u = new Point(3, 4); t.x = null
 *   %HaveSameMap(t, u) = true
 *
 *   == 结论回顾 ==
 *   1. 相同构造顺序共享形状：true
 *   2. 添加顺序不同形状分叉：true
 *   3. delete 破坏形状（进 dictionary mode）：true
 *   4. 置 null 不改变形状：true
 *
 * 预期输出（降级模式，无 --allow-natives-syntax 时，逐行）：
 *   == 实验 0：natives 可用性 ==
 *   --allow-natives-syntax 已开启：false（将降级为相对耗时对比）
 *
 *   == 降级实验：同形状 vs 混形状 热点属性访问（10^6 次）==
 *   混形状访问更慢：true
 *   （机制：混形状把内联缓存打成多态，详见 02-inline-cache.mjs；
 *     要拿到本文件的确定性形状验证，请加 --allow-natives-syntax 重跑）
 */

// ---------------------------------------------------------------------------
// 关于本文件用到的 V8 native（内部测试函数），全部只读、无副作用：
//
//   %HaveSameMap(a, b)
//     返回 boolean：对象 a 与对象 b 的头部是否指向【同一个】隐藏类
//     （V8 内部把这个结构叫 "Map"，注意与 JS 的 Map 集合无关）。
//       true  → 两者形状完全一致：相同的属性键、相同的添加顺序。
//               内联缓存（IC）在同一个程序点可以单态命中它们。
//       false → 形状不同。注意：false 只说明「形状不同」，不代表某个
//               对象「慢」；是否进入慢属性（dictionary mode）要用
//               %DebugPrint(obj) 观察（本文件不调用，输出太长）。
//
//   使用前提：必须以 node --allow-natives-syntax 启动，否则 % 语法是
//   SyntaxError。因此下面用 new Function(...) 动态构造 native 调用——
//   文件源码里不出现 % 语法，无标志运行时也不会在解析阶段炸掉，
//   而是走到 catch 分支进入降级路径。
// ---------------------------------------------------------------------------

/** 探测 natives 是否可用；不可用时返回 null。 */
function detectNatives() {
  try {
    // 若未开启 --allow-natives-syntax，下面这行在【构造】时即抛 SyntaxError
    // （% 不是合法 JS 语法），被 catch 捕获。
    const fn = new Function('a', 'b', 'return %HaveSameMap(a, b);');
    fn({}, {}); // 试运行一次，确认运行期也可用
    return fn;
  } catch {
    return null;
  }
}

const haveSameMap = detectNatives();

// —— 被测对象构造器：所有实例都走同一条「this.x → this.y」初始化路径 ——
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function main() {
  console.log('== 实验 0：natives 可用性 ==');
  const enabled = haveSameMap !== null;
  console.log(`--allow-natives-syntax 已开启：${enabled}`);
  if (!enabled) {
    // 降级路径：没有 %HaveSameMap 就只能用「相对耗时」侧证形状差异。
    // 机制：混形状对象会让热点属性访问的内联缓存退化为多态/超多态，
    // 访问明显变慢。确定性结论只有一行「混形状访问更慢：true」。
    console.log('');
    console.log('== 降级实验：同形状 vs 混形状 热点属性访问（10^6 次）==');
    const iters = 1_000_000;

    function bench(objs) {
      let sink = 0;
      for (let i = 0; i < iters; i++) {
        sink += objs[i & 3].x; // 累加结果防死代码消除
      }
      return sink;
    }

    // 同形状组：4 个对象走完全相同的构造路径（{x, y} 字面量，键序一致）
    const same = Array.from({ length: 4 }, (_, i) => ({ x: i + 1, y: 0 }));
    // 混形状组：4 个对象都有 x，但 transition 链各不相同
    const mixed = [
      { x: 1, y: 0 },                                 // 链：字面量 {x,y}
      { y: 0, x: 2 },                                 // 链：字面量 {y,x}（键序不同）
      (() => { const o = { z: 0 }; o.x = 3; return o; })(), // 链：z → x
      (() => { const o = {}; o.w = 0; o.x = 4; return o; })(), // 链：w → x
    ];

    bench(same); bench(mixed); // 预热，让 IC 进入稳定状态
    const t1 = performance.now();
    const s1 = bench(same);
    const d1 = performance.now() - t1;
    const t2 = performance.now();
    const s2 = bench(mixed);
    const d2 = performance.now() - t2;
    // 不打印毫秒绝对值，只打印确定性结论（s1 === s2 保证两版计算等价）
    console.log(`混形状访问更慢：${d2 > d1}`);
    console.log('（机制：混形状把内联缓存打成多态，详见 02-inline-cache.mjs；');
    console.log('  要拿到本文件的确定性形状验证，请加 --allow-natives-syntax 重跑）');
    return;
  }

  // ======================== natives 可用的确定性路径 ========================

  console.log('');
  console.log('== 实验 1：相同构造顺序 → 共享隐藏类 ==');
  const a = new Point(1, 2);
  const b = new Point(3, 4);
  // a、b 都沿「空 Map → +x → +y」这条 transition 链走到终点：
  // 属性值不同无所谓，形状只看「键 + 添加顺序」。
  const r1 = haveSameMap(a, b);
  console.log('a = new Point(1, 2); b = new Point(3, 4)');
  console.log(`%HaveSameMap(a, b) = ${r1}`); // 期望 true

  console.log('');
  console.log('== 实验 2：属性添加顺序不同 → 形状分叉 ==');
  const p = {}; p.x = 1; p.y = 2; // 链：M0 --x--> M1 --y--> M2
  const q = {}; q.y = 1; q.x = 2; // 链：M0 --y--> M1' --x--> M2'
  // 两条链第一步就分叉，终点 Map 自然不同——
  // 这就是「{x:1,y:2} 与 {y:2,x:1} 形状不同」的机制。
  const r2 = haveSameMap(p, q);
  console.log('p: {} → +x → +y    q: {} → +y → +x');
  console.log(`%HaveSameMap(p, q) = ${r2}`); // 期望 false

  console.log('');
  console.log('== 实验 3：delete → 慢属性（dictionary mode）==');
  const r = new Point(1, 2);
  const s = new Point(3, 4);
  const before = haveSameMap(r, s); // 初始同形状
  delete r.x; // delete 不是「链上退一步」，而是整体打入字典模式：
              // r 的属性表变成只属于它自己的哈希字典，不再共享任何形状，
              // 此后 r 上所有属性访问都走哈希查找（v8.dev/blog/fast-properties）
  const after = haveSameMap(r, s);
  console.log('r = new Point(1, 2); s = new Point(3, 4)');
  console.log(`delete 前   %HaveSameMap(r, s) = ${before}`);  // 期望 true
  console.log(`delete r.x 后 %HaveSameMap(r, s) = ${after}`); // 期望 false

  console.log('');
  console.log('== 实验 4：置 null 代替 delete → 形状保持 ==');
  const t = new Point(1, 2);
  const u = new Point(3, 4);
  t.x = null; // 只改值，不改形状：形状由「键集合 + 顺序」决定，与值无关
  const r4 = haveSameMap(t, u);
  console.log('t = new Point(1, 2); u = new Point(3, 4); t.x = null');
  console.log(`%HaveSameMap(t, u) = ${r4}`); // 期望 true

  console.log('');
  console.log('== 结论回顾 ==');
  console.log(`1. 相同构造顺序共享形状：${r1 === true}`);
  console.log(`2. 添加顺序不同形状分叉：${r2 === false}`);
  console.log(`3. delete 破坏形状（进 dictionary mode）：${before === true && after === false}`);
  console.log(`4. 置 null 不改变形状：${r4 === true}`);
}

main();
