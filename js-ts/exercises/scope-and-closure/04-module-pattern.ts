/**
 * 大纲章节：阶段 1.2 作用域与闭包
 * 主题：IIFE 模块模式（私有状态 + 最小暴露 + 参数依赖注入）与闭包持有大对象的泄漏模式、两种修复（作用域收窄 / 置 null）
 * 运行：npx tsx exercises/scope-and-closure/04-module-pattern.ts
 * 预期输出：
 * [1] stepBy(3) = 3
 * [1] 再 stepBy(7) = 10
 * [1] typeof steps.validate = undefined
 * [1] stepBy(99) 被拒绝：invalid step: 99
 * [2] #001, #002, #003
 * [3] find("record-009") 命中 10 条
 * [3] leakyIndex.reportUsage() = queries = 1
 * [4] 作用域收窄：total = 1000，head = record-0000 | record-0001 | record-0002
 * [5] dispose 前 size = 100
 * [5] dispose 后 size = 0
 */

// =============================================================================
// 读法提示：
// IIFE（立即调用函数表达式）用函数作用域当"墙"：墙内的 let/函数 都是私有绑定，
// return 的对象是唯一公开接口 —— 这就是 ES Module 出现前的"模块模式"。
// ES Module 之后，每个文件本身就是一个模块作用域（Module Environment Record），
// 顶层声明不再泄漏到全局；IIFE 圈私有作用域的历史使命结束，
// 但"闭包持有状态 + 暴露最小接口"的模式依旧是私有化的标准思路之一。
// =============================================================================

// -----------------------------------------------------------------------------
// [1] IIFE 模块模式：私有状态 total、私有函数 validate，只暴露 stepBy / value
// 最小暴露原则：校验规则不导出 —— 外界无法绕过 stepBy 里的校验直接改 total
// -----------------------------------------------------------------------------
const steps = (function () {
  let total = 0; // 私有状态：外界没有任何语法路径能直接读写
  function validate(step: number): boolean {
    // 私有函数：只被 stepBy 内部使用，不进入返回对象
    return Number.isInteger(step) && step > 0 && step <= 10;
  }
  return {
    stepBy(step: number): number {
      if (!validate(step)) throw new Error(`invalid step: ${step}`);
      total += step;
      return total;
    },
    value(): number {
      return total;
    },
  };
})();

console.log(`[1] stepBy(3) = ${steps.stepBy(3)}`);
console.log(`[1] 再 stepBy(7) = ${steps.stepBy(7)}`);
// validate 不在返回对象上：它不是属性，而是环境记录里的私有绑定
console.log(`[1] typeof steps.validate = ${typeof (steps as Record<string, unknown>).validate}`);
try {
  steps.stepBy(99); // 绕过接口直接改状态不可能；非法参数在接口内部被校验拦截
} catch (e) {
  console.log(`[1] stepBy(99) 被拒绝：${(e as Error).message}`);
}

// -----------------------------------------------------------------------------
// [2] 依赖注入：依赖通过 IIFE 参数传入，模块内部不需要任何全局变量
// （换一种编号格式？只改注入的实参，模块实现一行不动）
// -----------------------------------------------------------------------------
const sequencer = (function (format: (n: number) => string) {
  let seq = 0; // format 与 seq 都被 next 闭包持有
  return {
    next(): string {
      seq += 1;
      return format(seq);
    },
  };
})((n: number): string => `#${String(n).padStart(3, "0")}`);

console.log(`[2] ${sequencer.next()}, ${sequencer.next()}, ${sequencer.next()}`);

// -----------------------------------------------------------------------------
// [3] 泄漏模式（模拟）：bigCache 被环境记录持有，而暴露的"小方法"根本不需要它
//
// 引用链（谁拽着大数组不放）：
//   leakyIndex 对象 → find / reportUsage 两个函数
//     → 两者的 [[Environment]] 指向同一次 IIFE 调用的环境记录
//       → 环境记录的 bigCache 槽 → 1000 个字符串的数组
//
// 只要 leakyIndex（或它的任何一个方法）活着，整个环境记录可达，
// bigCache 就算只被 find 用到，也必须陪葬 —— 这就是"闭包间接持有"。
// 生产对应物：一次查询的全量结果被某个长期存在的工具对象无意记住。
// -----------------------------------------------------------------------------
const leakyIndex = (function () {
  const bigCache: string[] = Array.from({ length: 1000 }, (_: number, idx: number): string => `record-${String(idx).padStart(4, "0")}`);
  let queries = 0;
  return {
    find(prefix: string): number {
      queries += 1;
      return bigCache.reduce((acc: number, item: string): number => acc + (item.startsWith(prefix) ? 1 : 0), 0);
    },
    // reportUsage 完全不需要 bigCache —— 但它共享同一个环境记录，间接延长大数组的寿命
    reportUsage(): string {
      return `queries = ${queries}`;
    },
  };
})();

console.log(`[3] find("record-009") 命中 ${leakyIndex.find("record-009")} 条`); // record-0090 ~ record-0099 共 10 条
console.log(`[3] leakyIndex.reportUsage() = ${leakyIndex.reportUsage()}`);

// -----------------------------------------------------------------------------
// [4] 修复一 · 作用域收窄：把大对象的生命周期限制在"构建阶段"，
// 闭包只捕获算好的小结果 —— 大对象在 buildSummary 返回后不再可达
// -----------------------------------------------------------------------------
const safeIndex = (function () {
  // buildSummary 是独立函数：bigCache 存在于它这次调用的环境记录里，
  // 返回值（小对象）不引用 bigCache → 调用结束、记录无人引用 → 可回收
  function buildSummary(): { total: number; head: string[] } {
    const bigCache = Array.from({ length: 1000 }, (_: number, idx: number): string => `record-${String(idx).padStart(4, "0")}`);
    return { total: bigCache.length, head: bigCache.slice(0, 3) }; // 只留摘要，不留全量
  }
  const summary = buildSummary(); // 全量数据在这行之后已不可达
  let queries = 0;
  return {
    total(): number {
      queries += 1;
      return summary.total; // 闭包只捕获 summary（小对象）
    },
    head(): readonly string[] {
      return summary.head;
    },
    usage(): string {
      return `queries = ${queries}`;
    },
  };
})();

console.log(`[4] 作用域收窄：total = ${safeIndex.total()}，head = ${safeIndex.head().join(" | ")}`);

// -----------------------------------------------------------------------------
// [5] 修复二 · 主动置 null：环境记录没法消灭，但可以把它到大数据的引用剪断
// （适合"用完后确实不再需要、但模块本身还要活着"的场景，比如缓存失效）
// -----------------------------------------------------------------------------
const disposableCache = (function () {
  // 类型标注 string[] | null：这个槽将来可能被清空
  let data: string[] | null = Array.from({ length: 100 }, (_: number, idx: number): string => `item-${idx}`);
  return {
    size(): number {
      return data?.length ?? 0; // 置 null 后按"没有数据"处理
    },
    dispose(): void {
      data = null; // 剪断环境记录 → 大数组的引用；数组从此不可达，等待 GC
    },
  };
})();

console.log(`[5] dispose 前 size = ${disposableCache.size()}`);
disposableCache.dispose();
console.log(`[5] dispose 后 size = ${disposableCache.size()}`);

// -----------------------------------------------------------------------------
// 与 ES Module 的关系（本文件本身就是 ESM，无代码，只有结论）：
// 1. 这个文件整体就是一个模块作用域：上面所有 const（steps/sequencer/...）
//    都不进入全局 —— 在别的文件里 typeof steps 是 "undefined"（未声明），
//    私有性由"文件边界"提供，不再需要 IIFE 的函数作用域当墙。
// 2. IIFE 模式仍然有它的位置：单文件内的局部私有（多个小模块互不干扰）、
//    不依赖打包器的零构建脚本，以及理解闭包的最佳教具。
// -----------------------------------------------------------------------------
