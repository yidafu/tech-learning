/**
 * 大纲章节：阶段 4 工程化
 * 主题：纯函数计算器——add / div（除 0 抛 RangeError）/ compose，供断言与异常测试
 * 运行：npx tsx exercises/vitest-basics/calculator.ts（冒烟）；测试：npx vitest run exercises/vitest-basics/
 * 预期输出：
 *   add(1, 2) = 3
 *   div(10, 4) = 2.5
 *   compose(double, addOne)(5) = 12
 *   div(1, 0) 抛错 -> RangeError: div: 除数不能为 0
 */
export function add(a: number, b: number): number {
  return a + b;
}

// 除 0 抛 RangeError：语义上「0 不在合法除数区间」，比 Error 更精确的子类
export function div(a: number, b: number): number {
  if (b === 0) {
    throw new RangeError('div: 除数不能为 0');
  }
  return a / b;
}

export function double(x: number): number {
  return x * 2;
}

export function addOne(x: number): number {
  return x + 1;
}

// 函数组合：compose(f, g)(x) = f(g(x))——先 g 后 f
export function compose<A, B, C>(f: (x: B) => C, g: (x: A) => B): (x: A) => C {
  return (x: A): C => f(g(x));
}

// —— 冒烟段：tsx 直接运行时自测（vitest 环境下 import.meta.env.MODE === 'test'，跳过）——
const meta = import.meta as ImportMeta & { env?: { MODE?: string } };
if (meta.env?.MODE !== 'test') {
  console.log(`add(1, 2) = ${add(1, 2)}`);
  console.log(`div(10, 4) = ${div(10, 4)}`);
  console.log(`compose(double, addOne)(5) = ${compose(double, addOne)(5)}`);
  try {
    div(1, 0);
  } catch (err) {
    const e = err as RangeError;
    console.log(`div(1, 0) 抛错 -> ${e.name}: ${e.message}`);
  }
}
