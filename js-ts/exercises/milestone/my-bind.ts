/**
 * 大纲章节：阶段 1 里程碑（this 四规则 → bind 的规范语义）
 * 主题：手写 Function.prototype.bind（myBind）——BoundFunctionCreate 的 JS 近似实现
 * 测试：npx vitest run exercises/milestone/my-bind.test.ts
 * 运行：npx tsx exercises/milestone/my-bind.ts
 */

/**
 * 手写 bind。规范依据：ECMA-262
 *   - §10.4.1.3 BoundFunctionCreate：bound 函数捕获 target / thisArg / 前置参数，
 *     其 [[Call]] 忽略调用时的 this，固定用捕获的 thisArg；
 *     其 [[Construct]]（new bound()）忽略 thisArg，等价于 new target(...全部参数)
 *   - §20.2.3.2 Function.prototype.bind 步骤 14-17：
 *     bound.length = max(target.length - 已绑定参数个数, 0)（先截断为整数）
 *     bound.name  = 'bound ' + target.name（SetFunctionName 的 prefix 机制）
 */
export function myBind(target: Function, thisArg: any, ...boundArgs: any[]): Function {
  // wrapper 是普通函数：与原生 bound function 的差异在于它有 prototype 属性。
  // new 调用时 wrapper 自己的 [[Construct]] 会以 wrapper.prototype 创建实例 this，
  // 再把 this 交给 target 使用——所以底部把 wrapper.prototype 指向 target.prototype。
  const bound = function (this: any, ...callArgs: any[]): any {
    // 参数拼接：前置参数在前，本次调用参数在后（§10.4.1.3 [[Call]] 步骤 3）
    const args = boundArgs.concat(callArgs);

    if (new.target !== undefined) {
      // [[Construct]] 路径（new bound()）：
      // this 已是以 bound.prototype（= target.prototype）为原型的新对象，
      // thisArg 被完全忽略（§10.4.1.3 [[Construct]]：根本不引用 [[BoundThis]]）。
      // target 以 this 为 receiver 执行；返回对象则替代 this（myNew 同款语义）。
      const result = target.apply(this, args);
      return result instanceof Object ? result : this;
    }

    // [[Call]] 路径（普通调用）：this 固定为捕获的 thisArg，无论调用时 this 是什么
    return target.apply(thisArg, args);
  };

  // 原生 bound 函数没有 prototype 属性，其 [[Construct]] 会把 newTarget 换成 target
  // （§10.4.1.3 步骤 2 SameValue(F, newTarget) → newTarget = target），
  // 于是实例原型取 target.prototype；且 @@hasInstance 委托给 target（§20.2.3.5）。
  // wrapper 无法删除 prototype，最接近的做法：与 target 共享同一个原型对象 →
  // instanceof target 与 instanceof bound 同时成立（原生两者都为 true）。
  (bound as any).prototype = (target as any).prototype;

  // §20.2.3.2 步骤 14-15：L = max(min(targetLen, 2^53-1) - boundArgs.length, 0)
  // target.length 只统计第一个默认参数/剩余参数之前的形参个数，且不可靠（可被 defineProperty 改写）
  const targetLength = typeof (target as any).length === 'number' ? (target as any).length : 0;
  Object.defineProperty(bound, 'length', {
    value: Math.max(Math.trunc(targetLength) - boundArgs.length, 0),
    writable: false,
    enumerable: false,
    configurable: true,
  });

  // §20.2.3.2 步骤 16-17 / SetFunctionName：name 加 'bound ' 前缀
  Object.defineProperty(bound, 'name', {
    value: 'bound ' + ((target as any).name ?? ''),
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return bound as Function;
}

export default myBind;

// —————————————————— demo（tsx 冒烟）——————————————————

/** 供 npx tsx 直接运行的冒烟演示；测试文件不依赖它 */
export function demo(): void {
  console.log('--- myBind demo ---');

  // 1. 普通 this 绑定 + 预置参数
  const counter = {
    factor: 10,
    scale(this: any, bonus: number, x: number) {
      return (x + bonus) * this.factor;
    },
  };
  const scaleWith5 = myBind(counter.scale, counter, 5) as (x: number) => number;
  console.log('scaleWith5(3) =', scaleWith5(3)); // (3+5)*10 = 80

  // 2. 连续 bind 不改 this：第一次 bind 的 thisArg 永远生效
  const fakeThis = { factor: 999 };
  const rebound = myBind(scaleWith5 as unknown as Function, fakeThis) as (x: number) => number;
  console.log('rebound(3) =', rebound(3)); // 仍走 counter.factor → 80，fakeThis 被忽略

  // 3. new 调用：thisArg 被忽略，实例以 target.prototype 为原型
  function Point(this: any, x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  (Point as any).prototype.describe = function (this: any) {
    return `(${this.x}, ${this.y})`;
  };
  const BoundPoint = myBind(Point, { x: 'ignored', y: 'ignored' }, 1) as any;
  const p = new BoundPoint(2);
  console.log('new BoundPoint(2):', (p as any).describe(), 'instanceof Point:', p instanceof Point);

  // 4. length / name（BoundFunctionCreate / SetFunctionName）
  const raw = function threeArgs(a: number, b: number, c: number) {
    return a + b + c;
  };
  const partially = myBind(raw, null, 1);
  console.log('length:', partially.length, 'name:', (partially as any).name); // 2, 'bound threeArgs'
}

demo();
