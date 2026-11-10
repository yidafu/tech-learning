/**
 * 大纲章节：阶段 1.2 作用域与闭包
 * 主题：闭包 = 函数 + [[Environment]] —— 计数器状态私有化、独立闭包 vs 共享闭包、闭包捕获的是「变量」不是「值」、银行账户模块模式
 * 运行：npx tsx exercises/scope-and-closure/02-closure-counter.ts
 * 预期输出：
 * [1] 独立闭包：A = 1，B = 1
 * [2] 共享闭包：increment x2 再 decrement 一次 = 1
 * [2] count 是不是返回对象的属性：false
 * [3] 闭包创建后多次修改变量：lateRead() = 42
 * [3] cell.get() = a
 * [3] set("b") 之后 cell.get() = b
 * [4] 存入 50：成功：余额 ¥150.00
 * [4] 取出 30：成功：余额 ¥120.00
 * [4] 取出 1000：拒绝：余额不足（当前 ¥120.00）
 * [4] 存入 -5：拒绝：无效金额 ¥-5.00
 * [4] 余额 = 120
 * [4] 流水 1：开户：小美 开户余额 100
 * [4] 流水 2：存入 ¥50.00
 * [4] 流水 3：取出 ¥30.00
 */

// =============================================================================
// 读法提示：
// 闭包不是特殊语法 —— 每个函数对象都携带 [[Environment]]（出生时的环境记录）。
// 本文件的每个现象都在回答同一个问题：
// 「这个函数的 [[Environment]] 指向哪一次调用创建的环境记录？记录里有哪些绑定？」
// =============================================================================

interface Counter {
  increment(): number;
  decrement(): number;
  value(): number;
}

// -----------------------------------------------------------------------------
// [1] 独立闭包：createCounter 每被调用一次，就 NewFunctionEnvironment 生成一个
// 全新的环境记录 —— 两次调用的 count 是两个互不相干的绑定
// -----------------------------------------------------------------------------
function createCounter(): Counter {
  let count = 0; // count 存在「这一次调用」的环境记录里（堆上），不是返回对象的属性
  return {
    increment: (): number => ++count,
    decrement: (): number => --count,
    value: (): number => count,
  };
}

const independentA = createCounter();
const independentB = createCounter(); // 第二次调用 → 第二个环境记录 → 第二个 count
independentA.increment();
independentA.increment();
independentA.decrement(); // A 自己的环境：0 → 1 → 2 → 1
independentB.increment(); // B 自己的环境：0 → 1，与 A 无关
console.log(`[1] 独立闭包：A = ${independentA.value()}，B = ${independentB.value()}`);

// -----------------------------------------------------------------------------
// [2] 共享闭包：同一次调用里产出的多个函数，[[Environment]] 指向同一个环境记录
// -----------------------------------------------------------------------------
function createSharedCounter(): Counter {
  let count = 0;
  // 下面三个函数声明都在同一次调用的环境里创建 —— 读写的是同一个 count 绑定
  function increment(): number {
    return ++count;
  }
  function decrement(): number {
    return --count;
  }
  function value(): number {
    return count;
  }
  return { increment, decrement, value };
}

const shared = createSharedCounter();
shared.increment(); // count: 0 → 1
shared.increment(); // count: 1 → 2
shared.decrement(); // count: 2 → 1 —— decrement 看得到 increment 的写入
console.log(`[2] 共享闭包：increment x2 再 decrement 一次 = ${shared.value()}`);

// 顺带证明：count 不在返回对象上，而在环境记录里 —— 属性查找永远找不到它
// （私有性不是"约定"，是语言层面"没有路径可达"）
console.log(`[2] count 是不是返回对象的属性：${"count" in shared}`);

// -----------------------------------------------------------------------------
// [3] 闭包捕获的是「变量（绑定）」，不是「值快照」
// -----------------------------------------------------------------------------
function captureDemo(): () => number {
  let n = 1;
  const read = (): number => n; // read.[[Environment]] 里的 n 是"格子"本身，不是数字 1
  n = 2; // 修改发生在闭包创建之后、返回之前
  n = 42;
  return read; // 外层函数返回了，n 依然活着（被 read 引用的环境记录持有）
}
const lateRead = captureDemo();
console.log(`[3] 闭包创建后多次修改变量：lateRead() = ${lateRead()}`); // 42，不是 1

// 外层函数返回之后，通过另一个闭包写入，读闭包同样可见（共享同一环境记录）
interface Cell {
  get(): string;
  set(v: string): string;
}
function createCell(initial: string): Cell {
  let v = initial;
  return {
    get: (): string => v,
    set: (next: string): string => {
      v = next; // 写的是环境记录里的 v
      return v;
    },
  };
}
const cell = createCell("a");
console.log(`[3] cell.get() = ${cell.get()}`);
cell.set("b");
console.log(`[3] set("b") 之后 cell.get() = ${cell.get()}`); // get 与 set 共享 v

// -----------------------------------------------------------------------------
// [4] 银行账户模块模式：balance 与流水完全私有，只能走带校验的公开接口
// -----------------------------------------------------------------------------
interface BankAccount {
  deposit(amount: number): string;
  withdraw(amount: number): string;
  balance(): number;
  statement(): readonly string[];
}

function createAccount(owner: string, opening: number): BankAccount {
  let bal = opening; // 私有状态：余额 —— 外界没有任何语法路径能直接改它
  const log: string[] = [`开户：${owner} 开户余额 ${opening}`]; // 私有状态：流水
  const money = (n: number): string => `¥${n.toFixed(2)}`; // 私有工具函数（最小暴露原则：不导出）

  return {
    deposit(amount: number): string {
      if (!Number.isFinite(amount) || amount <= 0) return `拒绝：无效金额 ${money(amount)}`;
      bal += amount;
      log.push(`存入 ${money(amount)}`);
      return `成功：余额 ${money(bal)}`;
    },
    withdraw(amount: number): string {
      if (!Number.isFinite(amount) || amount <= 0) return `拒绝：无效金额 ${money(amount)}`;
      if (amount > bal) return `拒绝：余额不足（当前 ${money(bal)}）`; // 校验逻辑只能写在这里：状态进不来，规则出不去
      bal -= amount;
      log.push(`取出 ${money(amount)}`);
      return `成功：余额 ${money(bal)}`;
    },
    balance(): number {
      return bal;
    },
    statement(): readonly string[] {
      return [...log]; // 返回副本，外部改不到私有流水
    },
  };
}

const acct = createAccount("小美", 100);
console.log(`[4] 存入 50：${acct.deposit(50)}`);
console.log(`[4] 取出 30：${acct.withdraw(30)}`);
console.log(`[4] 取出 1000：${acct.withdraw(1000)}`);
console.log(`[4] 存入 -5：${acct.deposit(-5)}`);
console.log(`[4] 余额 = ${acct.balance()}`);
acct.statement().forEach((line: string, idx: number): void => {
  console.log(`[4] 流水 ${idx + 1}：${line}`);
});
