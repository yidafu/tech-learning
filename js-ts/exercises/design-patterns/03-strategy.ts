/**
 * 大纲章节：阶段 5 专题深入 —— 设计模式（Strategy 策略模式）
 * 主题：类继承实现 vs union + 函数记录表实现，同需求对照 + 扩展成本演示
 * 运行：npx tsx exercises/design-patterns/03-strategy.ts
 * 预期输出：
 * --- 1) 版本 A：继承 + 多态（经典 Strategy）---
 * [none] 120 -> 120
 * [vip] 120 -> 96
 * [full-reduction] 120 -> 100
 * --- 2) 版本 B：union + 函数记录表（现代 TS 惯用法）---
 * [none] 120 -> 120
 * [vip] 120 -> 96
 * [full-reduction] 120 -> 100
 * [black-friday] 120 -> 84
 * ↑ black-friday 是新增策略：union +1 个字面量、表 +1 行，旧代码零改动
 * --- 3) 扩展成本对照 ---
 * 版本 A 新增策略：新建子类，继承基类契约（类文件数量随策略线性增长）
 * 版本 B 新增策略：改 1 个类型 + 1 行表项；漏写表项会被 Record 在编译期拦下（见源码）
 */

// ---------------------------------------------------------------------------
// 1) 版本 A：类继承实现策略模式（《Design Patterns》原著写法）
//    意图：把每种算法封装成独立的类，让算法的变化独立于使用它的客户端。
//    在 TS 里的问题：策略只是一段「输入 price 输出 number」的纯计算，
//    为它建类/继承层级是重量级手段 —— 类在这里没有承载任何状态。
// ---------------------------------------------------------------------------

abstract class DiscountStrategy {
  abstract calc(price: number): number;
}

class NoDiscount extends DiscountStrategy {
  calc(price: number): number {
    return price;
  }
}

class VipDiscount extends DiscountStrategy {
  calc(price: number): number {
    return price * 0.8;
  }
}

class FullReduction extends DiscountStrategy {
  calc(price: number): number {
    return price >= 100 ? price - 20 : price;
  }
}

class PriceCalculatorA {
  #strategy: DiscountStrategy;
  constructor(strategy: DiscountStrategy) {
    this.#strategy = strategy;
  }
  setStrategy(strategy: DiscountStrategy): void {
    this.#strategy = strategy;
  }
  finalPrice(price: number): number {
    return this.#strategy.calc(price);
  }
}

console.log('--- 1) 版本 A：继承 + 多态（经典 Strategy）---');
const calcA = new PriceCalculatorA(new NoDiscount());
for (const [kind, strategy] of [
  ['none', new NoDiscount()],
  ['vip', new VipDiscount()],
  ['full-reduction', new FullReduction()],
] as const) {
  calcA.setStrategy(strategy);
  console.log(`[${kind}] 120 -> ${calcA.finalPrice(120)}`);
}

// ---------------------------------------------------------------------------
// 2) 版本 B：union + 函数记录表（现代 TS 更优替代）
//    - 策略名收进可辨识联合（discriminated union），非法策略名编译期就报错；
//    - 表是 Record<策略名, 函数>：值全是「一进一出的纯函数」，无需类与 this；
//    - 「组合优于继承」在 TS 里的具体体现：用「数据（union）+ 函数表」的组合
//      表达变化点，而不是靠继承链扩展。
// ---------------------------------------------------------------------------

type DiscountKind = 'none' | 'vip' | 'full-reduction' | 'black-friday';

const STRATEGIES: Record<DiscountKind, (price: number) => number> = {
  none: (price) => price,
  vip: (price) => price * 0.8,
  'full-reduction': (price) => (price >= 100 ? price - 20 : price),
  'black-friday': (price) => price * 0.7,
};

function calcPrice(kind: DiscountKind, price: number): number {
  return STRATEGIES[kind](price);
}

console.log('--- 2) 版本 B：union + 函数记录表（现代 TS 惯用法）---');
for (const kind of ['none', 'vip', 'full-reduction', 'black-friday'] as const) {
  console.log(`[${kind}] 120 -> ${calcPrice(kind, 120)}`);
}
console.log('↑ black-friday 是新增策略：union +1 个字面量、表 +1 行，旧代码零改动');

// 非法策略名：编译期拦截（包成只编译不调用的箭头，避免运行期真的查表崩溃）
// @ts-expect-error - 'vip-2' 不在 DiscountKind 联合里
const wrong = () => calcPrice('vip-2', 120);
void wrong;

// 漏写表项：Record 要求每个 key 都有值 —— 「新增 union 忘补表」在编译期暴露。
// 故意只写 2 个 key：报错被下面的 @ts-expect-error 吞掉，用它证明「确实会报错」。
type PartialKind = 'none' | 'vip' | 'missing-one';
// @ts-expect-error - Property 'missing-one' is missing：Record 的完备性检查
const incomplete: Record<PartialKind, (price: number) => number> = {
  none: (price) => price,
  vip: (price) => price,
};

console.log('--- 3) 扩展成本对照 ---');
console.log('版本 A 新增策略：新建子类，继承基类契约（类文件数量随策略线性增长）');
console.log('版本 B 新增策略：改 1 个类型 + 1 行表项；漏写表项会被 Record 在编译期拦下（见源码）');
void incomplete;

export {};
