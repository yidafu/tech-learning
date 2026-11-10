/**
 * 大纲章节：阶段 2 引擎与运行时
 * 主题：纯逻辑实现 debounce / throttle（leading + trailing），用可控假时钟验证触发序列
 * 运行：npx tsx exercises/v8-and-performance/03-debounce-throttle.ts
 * 预期输出（逐行；全部确定性，不依赖真实时间）：
 *   == 假时钟验证：debounce / throttle（不依赖真实时间）==
 *
 *   === 场景 1：debounce 默认（trailing=true, leading=false, wait=200）===
 *   [t=  0] 调用('a') → 进入等待（计时器到期 t=200）
 *   [t=100] 调用('b') → 等待中：候选='b'，重置计时器到期 t=300
 *   [t=250] 调用('c') → 等待中：候选='c'，重置计时器到期 t=450
 *   [t=450] 触发('c')
 *   断言：触发次数 = 1（期望 1）→ 通过
 *   断言：触发参数 = 'c'（期望 'c'）→ 通过
 *
 *   === 场景 2：debounce leading=true, trailing=true, wait=200 ===
 *   [t=  0] 调用('x') → 冷却外：leading 立即触发，等待重置至 t=200
 *   [t=  0] 触发('x')
 *   [t= 50] 调用('y') → 等待中：候选='y'，重置计时器到期 t=250
 *   [t=250] 触发('y')
 *   断言：触发次数 = 2（期望 2）→ 通过
 *   断言：触发序列 = x,y（期望 x,y）→ 通过
 *
 *   === 场景 3：throttle 默认（leading=true, trailing=true, wait=100）===
 *   [t=  0] 调用('a') → 冷却外：leading 立即触发，冷却至 t=100
 *   [t=  0] 触发('a')
 *   [t= 30] 调用('b') → 冷却中：记录候选
 *   [t= 60] 调用('c') → 冷却中：候选覆盖为 'c'
 *   [t=100] 触发('c')
 *   [t=100] 冷却重开至 t=200（trailing 补发后进入下一窗）
 *   [t=150] 调用('d') → 冷却中：记录候选
 *   [t=200] 触发('d')
 *   [t=200] 冷却重开至 t=300
 *   [t=300] 冷却结束：无候选，仅解锁（不触发）
 *   [t=310] 调用('e') → 冷却外：leading 立即触发，冷却至 t=410
 *   [t=310] 触发('e')
 *   [t=410] 冷却结束：无候选，仅解锁（不触发）
 *   断言：触发次数 = 4（期望 4）→ 通过
 *   断言：触发序列 = a,c,d,e（期望 a,c,d,e）→ 通过
 *
 *   === 场景 4：throttle leading=false, trailing=true, wait=100 ===
 *   [t=  0] 调用('a') → 冷却外但 leading=false：不立即触发，记录候选，冷却至 t=100
 *   [t= 30] 调用('b') → 冷却中：候选覆盖为 'b'
 *   [t=100] 触发('b')
 *   [t=100] 冷却重开至 t=200
 *   [t=150] 调用('c') → 冷却中：记录候选
 *   [t=200] 触发('c')
 *   [t=200] 冷却重开至 t=300
 *   [t=300] 冷却结束：无候选，仅解锁（不触发）
 *   断言：触发次数 = 2（期望 2）→ 通过
 *   断言：触发序列 = b,c（期望 b,c）→ 通过
 *
 *   === 场景 5：debounce leading=true, trailing=false, wait=200 ===
 *   [t=  0] 调用('x') → 冷却外：leading 立即触发，等待至 t=200
 *   [t=  0] 触发('x')
 *   [t= 50] 调用('y') → 等待中：被忽略（trailing=false 不补发），等待顺延至 t=250
 *   [t=100] 调用('z') → 等待中：被忽略，等待顺延至 t=300
 *   [t=300] 等待结束：trailing=false，不补发
 *   断言：触发次数 = 1（期望 1）→ 通过
 *   断言：触发参数 = 'x'（期望 'x'）→ 通过
 *
 *   === 冒烟测试（真实 setTimeout，等待约 100ms）===
 *   调用('hello')，10ms 后再调用('world')，静默 30ms 后应只触发最后一次…
 *   触发次数 = 1（期望 1）
 *   触发参数 = 'world'（期望 'world'）
 *   冒烟结果（debounce 停止调用后只触发 1 次）：true
 *
 *   == 汇总 ==
 *   全部断言通过：true
 */

// ---------------------------------------------------------------------------
// 设计要点：
// 1. debounce / throttle 不直接触碰全局 setTimeout，而是依赖注入 Clock 接口
//    —— 这让「时间」变成可替换的依赖：测试用 FakeClock 手动推进，
//     生产用 RealClock（包装真实 setTimeout）。
// 2. FakeClock.collectTimers + tick(ms)：所有定时器收进数组；tick 推进
//    虚拟时刻，反复取出「到期时刻 <= 目标」的最早定时器同步执行
//   （回调里注册的新定时器若也到期会继续被处理，与真实事件循环语义一致）。
// 3. 实现采用【纯定时器法】（笔记 08 第 4 节的两种路线之一）：
//    - debounce：每次调用 clearTimeout + 重设 → 天然 trailing；
//      leading 需要额外区分「冷却外第一枪」。
//    - throttle：冷却计时器绝不重设，期间只记录候选 → leading + trailing。
//    时间戳法（记录 last，调用时比较 now-last >= wait）可以不靠定时器实现
//    leading，但「停止调用后自动补发最后一次」这件事时间戳法做不到
//    （必须有定时器在冷却结束时醒来）——这是两法的本质差异。
// 4. 语义约定（与 lodash 一致或注明差异）：
//    - debounce：等待期内每次调用都【重置】等待计时器（停了才做）。
//    - throttle：冷却期内调用【不重置】冷却；trailing 补发后【重开】新冷却
//     （连续调用的节流匀速放行）。
// ---------------------------------------------------------------------------

/** 时钟抽象：debounce/throttle 的唯一环境依赖。 */
interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  now(): number;
}

/** 可控假时钟：定时器收集进数组，tick(ms) 推进虚拟时间并同步执行到期回调。 */
class FakeClock implements Clock {
  private time = 0;
  private nextId = 1;
  private timers: Array<{ id: number; at: number; fn: () => void }> = [];

  now(): number {
    return this.time;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = this.nextId++;
    this.timers.push({ id, at: this.time + Math.max(0, ms), fn });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers = this.timers.filter((t) => t.id !== id);
  }

  tick(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      // 找出到期时刻最早且 <= target 的定时器
      let due: { id: number; at: number; fn: () => void } | undefined;
      for (const t of this.timers) {
        if (t.at > target) continue;
        if (due === undefined || t.at < due.at) due = t;
      }
      if (due === undefined) break;
      const job = due; // 供闭包安全引用
      this.timers = this.timers.filter((t) => t.id !== job.id);
      this.time = job.at; // 虚拟时刻跳到到期点（回调里 now() 是准确值）
      job.fn(); // 回调内注册的新定时器若到期，下一轮循环继续处理
    }
    this.time = target;
  }
}

interface DebounceOptions {
  leading?: boolean; // 默认 false：第一次调用不立即执行
  trailing?: boolean; // 默认 true：静默 wait 后补发最后一次
}

/**
 * 防抖：连续调用不断顺延执行，只有「安静 wait 毫秒」才执行最后一次。
 * 语义：停了才做；等待期内每次调用都重置计时器。
 */
function debounce(
  fn: (arg: string) => void,
  wait: number,
  clock: Clock,
  options: DebounceOptions = {},
): (arg: string) => void {
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;
  let timerId: number | undefined;
  let pendingArg: string | undefined; // 等待期内最后一次调用的参数

  return (arg: string): void => {
    const wasIdle = timerId === undefined;
    if (wasIdle && leading) {
      fn(arg); // 冷却外第一枪：立即执行
    } else if (wasIdle && !leading && !trailing) {
      return; // 退化配置（leading=false 且 trailing=false）：永远不触发
    }
    // 记候选：leading 首枪本身不再作为候选；其余调用都记（供 trailing）
    if (trailing && !(wasIdle && leading)) {
      pendingArg = arg;
    }
    // debounce 核心：每次调用都重置等待
    if (timerId !== undefined) clock.clearTimeout(timerId);
    timerId = clock.setTimeout(() => {
      timerId = undefined;
      if (trailing && pendingArg !== undefined) {
        const toFire = pendingArg;
        pendingArg = undefined;
        fn(toFire);
      } else {
        pendingArg = undefined;
      }
    }, wait);
  };
}

interface ThrottleOptions {
  leading?: boolean; // 默认 true：窗口开始立即执行
  trailing?: boolean; // 默认 true：窗口结束补发最后一次
}

/**
 * 节流：任意 wait 窗口内最多执行一次。
 * 冷却计时器一经开启绝不重设；trailing 补发后重开新冷却（匀速放行）。
 */
function throttle(
  fn: (arg: string) => void,
  wait: number,
  clock: Clock,
  options: ThrottleOptions = {},
): (arg: string) => void {
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;
  let timerId: number | undefined; // 非 undefined = 冷却中
  let pendingArg: string | undefined; // 冷却期内最后一次调用的参数

  const armCooldown = (): void => {
    timerId = clock.setTimeout(() => {
      timerId = undefined; // 先解锁：让到期回调里看到「冷却已结束」
      if (trailing && pendingArg !== undefined) {
        const toFire = pendingArg;
        pendingArg = undefined;
        fn(toFire);
        armCooldown(); // trailing 补发 = 进入新的冷却窗口（连续节流）
      } else {
        pendingArg = undefined; // 冷却结束且无候选：仅解锁，不重开
      }
    }, wait);
  };

  return (arg: string): void => {
    if (timerId === undefined) {
      if (leading) {
        fn(arg); // 冷却外 + leading：立即执行
        armCooldown();
        return;
      }
      // 冷却外 + leading=false：不立即执行，等本窗结束补发
      pendingArg = arg;
      armCooldown();
      return;
    }
    // 冷却中：绝不重置冷却计时器，只记录候选 —— 节流与防抖的分水岭
    pendingArg = arg;
  };
}

// ---------------------------------------------------------------------------
// 验证脚本：事件表 + 断言
// ---------------------------------------------------------------------------

let failedCount = 0;

function assert(condition: boolean, message: string): void {
  console.log(`断言：${message}${condition ? '→ 通过' : '→ 失败'}`);
  if (!condition) failedCount++;
}

const fmt = (t: number, msg: string): string =>
  `[t=${String(t).padStart(3, ' ')}] ${msg}`;

interface FireRecord {
  t: number;
  arg: string;
}

/** 造一个会往事件表 lines 里打印触发行的回调，并记录 fires。 */
function makeRecorder(clock: Clock, lines: string[], fires: FireRecord[]): (arg: string) => void {
  return (arg: string) => {
    lines.push(fmt(clock.now(), `触发('${arg}')`));
    fires.push({ t: clock.now(), arg });
  };
}

const printLines = (lines: string[]): void => {
  for (const line of lines) console.log(line);
};

const summary = (fires: FireRecord[]): string =>
  fires.map((f) => f.arg).join(',');

function scenario1(): void {
  console.log('=== 场景 1：debounce 默认（trailing=true, leading=false, wait=200）===');
  const clock = new FakeClock();
  const lines: string[] = [];
  const fires: FireRecord[] = [];
  const debounced = debounce(makeRecorder(clock, lines, fires), 200, clock);

  debounced('a');
  lines.push(fmt(0, "调用('a') → 进入等待（计时器到期 t=200）"));
  clock.tick(100);
  debounced('b');
  lines.push(fmt(100, "调用('b') → 等待中：候选='b'，重置计时器到期 t=300"));
  clock.tick(150);
  debounced('c');
  lines.push(fmt(250, "调用('c') → 等待中：候选='c'，重置计时器到期 t=450"));
  clock.tick(200); // t: 250 → 450，t=450 计时器到期，触发 'c'

  printLines(lines);
  assert(fires.length === 1, `触发次数 = ${fires.length}（期望 1）`);
  assert(summary(fires) === 'c', `触发参数 = '${summary(fires)}'（期望 'c'）`);
  console.log('');
}

function scenario2(): void {
  console.log('=== 场景 2：debounce leading=true, trailing=true, wait=200 ===');
  const clock = new FakeClock();
  const lines: string[] = [];
  const fires: FireRecord[] = [];
  const debounced = debounce(makeRecorder(clock, lines, fires), 200, clock, {
    leading: true,
    trailing: true,
  });

  lines.push(fmt(0, "调用('x') → 冷却外：leading 立即触发，等待重置至 t=200"));
  debounced('x'); // 冷却外 + leading：立即触发，等待至 t=200
  clock.tick(50);
  debounced('y'); // 等待中：候选 'y'，重置至 t=250
  lines.push(fmt(50, "调用('y') → 等待中：候选='y'，重置计时器到期 t=250"));
  clock.tick(200); // t=250 触发 'y'

  printLines(lines);
  assert(fires.length === 2, `触发次数 = ${fires.length}（期望 2）`);
  assert(summary(fires) === 'x,y', `触发序列 = ${summary(fires)}（期望 x,y）`);
  console.log('');
}

function scenario3(): void {
  console.log('=== 场景 3：throttle 默认（leading=true, trailing=true, wait=100）===');
  const clock = new FakeClock();
  const lines: string[] = [];
  const fires: FireRecord[] = [];
  const throttled = throttle(makeRecorder(clock, lines, fires), 100, clock);

  lines.push(fmt(0, "调用('a') → 冷却外：leading 立即触发，冷却至 t=100"));
  throttled('a');
  clock.tick(30);
  throttled('b');
  lines.push(fmt(30, "调用('b') → 冷却中：记录候选"));
  clock.tick(30); // t=60
  throttled('c');
  lines.push(fmt(60, "调用('c') → 冷却中：候选覆盖为 'c'"));
  clock.tick(40); // t=100：trailing 补发 'c'，冷却重开至 t=200
  lines.push(fmt(100, '冷却重开至 t=200（trailing 补发后进入下一窗）'));
  clock.tick(50); // t=150
  throttled('d');
  lines.push(fmt(150, "调用('d') → 冷却中：记录候选"));
  clock.tick(50); // t=200：补发 'd'，冷却重开至 t=300
  lines.push(fmt(200, '冷却重开至 t=300'));
  clock.tick(100); // t=300：无候选，仅解锁
  lines.push(fmt(300, '冷却结束：无候选，仅解锁（不触发）'));
  clock.tick(10); // t=310
  lines.push(fmt(310, "调用('e') → 冷却外：leading 立即触发，冷却至 t=410"));
  throttled('e'); // 冷却外：立即触发
  clock.tick(100); // t=410：无候选，仅解锁
  lines.push(fmt(410, '冷却结束：无候选，仅解锁（不触发）'));

  printLines(lines);
  assert(fires.length === 4, `触发次数 = ${fires.length}（期望 4）`);
  assert(summary(fires) === 'a,c,d,e', `触发序列 = ${summary(fires)}（期望 a,c,d,e）`);
  console.log('');
}

function scenario4(): void {
  console.log('=== 场景 4：throttle leading=false, trailing=true, wait=100 ===');
  const clock = new FakeClock();
  const lines: string[] = [];
  const fires: FireRecord[] = [];
  const throttled = throttle(makeRecorder(clock, lines, fires), 100, clock, {
    leading: false,
    trailing: true,
  });

  throttled('a');
  lines.push(fmt(0, "调用('a') → 冷却外但 leading=false：不立即触发，记录候选，冷却至 t=100"));
  clock.tick(30);
  throttled('b');
  lines.push(fmt(30, "调用('b') → 冷却中：候选覆盖为 'b'"));
  clock.tick(70); // t=100：补发 'b'，重开至 t=200
  lines.push(fmt(100, '冷却重开至 t=200'));
  clock.tick(50); // t=150
  throttled('c');
  lines.push(fmt(150, "调用('c') → 冷却中：记录候选"));
  clock.tick(50); // t=200：补发 'c'，重开至 t=300
  lines.push(fmt(200, '冷却重开至 t=300'));
  clock.tick(100); // t=300：无候选，仅解锁
  lines.push(fmt(300, '冷却结束：无候选，仅解锁（不触发）'));

  printLines(lines);
  assert(fires.length === 2, `触发次数 = ${fires.length}（期望 2）`);
  assert(summary(fires) === 'b,c', `触发序列 = ${summary(fires)}（期望 b,c）`);
  console.log('');
}

function scenario5(): void {
  console.log('=== 场景 5：debounce leading=true, trailing=false, wait=200 ===');
  const clock = new FakeClock();
  const lines: string[] = [];
  const fires: FireRecord[] = [];
  const debounced = debounce(makeRecorder(clock, lines, fires), 200, clock, {
    leading: true,
    trailing: false,
  });

  lines.push(fmt(0, "调用('x') → 冷却外：leading 立即触发，等待至 t=200"));
  debounced('x'); // 冷却外 + leading：立即触发；trailing=false 不记候选
  clock.tick(50);
  debounced('y'); // 等待中被忽略，但等待仍顺延（防抖重置语义）
  lines.push(fmt(50, "调用('y') → 等待中：被忽略（trailing=false 不补发），等待顺延至 t=250"));
  clock.tick(50); // t=100
  debounced('z');
  lines.push(fmt(100, "调用('z') → 等待中：被忽略，等待顺延至 t=300"));
  clock.tick(200); // t=300：等待结束，无补发
  lines.push(fmt(300, '等待结束：trailing=false，不补发'));

  printLines(lines);
  assert(fires.length === 1, `触发次数 = ${fires.length}（期望 1）`);
  assert(summary(fires) === 'x', `触发参数 = '${summary(fires)}'（期望 'x'）`);
  console.log('');
}

/** 冒烟测试：同一套 debounce 换上真实 setTimeout，验证真实环境行为一致。 */
async function smokeTest(): Promise<void> {
  console.log('=== 冒烟测试（真实 setTimeout，等待约 100ms）===');
  const realClock: Clock = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    now: () => Date.now(),
  };
  const fires: string[] = [];
  const debounced = debounce((arg) => fires.push(arg), 30, realClock);

  console.log("调用('hello')，10ms 后再调用('world')，静默 30ms 后应只触发最后一次…");
  debounced('hello');
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  debounced('world');
  await new Promise<void>((resolve) => setTimeout(resolve, 80)); // 10+80=90ms > 30ms，必然已触发

  assert(fires.length === 1, `触发次数 = ${fires.length}（期望 1）`);
  const fired = fires.length > 0 ? fires[0] : '';
  assert(fired === 'world', `触发参数 = '${fired}'（期望 'world'）`);
  console.log(`冒烟结果（debounce 停止调用后只触发 1 次）：${fires.length === 1 && fired === 'world'}`);
}

async function main(): Promise<void> {
  console.log('== 假时钟验证：debounce / throttle（不依赖真实时间）==');
  console.log('');
  scenario1();
  scenario2();
  scenario3();
  scenario4();
  scenario5();
  await smokeTest();
  console.log('');
  console.log('== 汇总 ==');
  console.log(`全部断言通过：${failedCount === 0}`);
}

main().catch((err: unknown) => {
  console.error('意外错误：', err);
});
