/**
 * 大纲章节：阶段 1 里程碑（new 的四步本质）
 * 主题：手写 new（myNew）——OrdinaryCreateFromConstructor + [[Construct]] 的三步拆解
 * 测试：npx vitest run exercises/milestone/my-new.test.ts
 * 运行：npx tsx exercises/milestone/my-new.ts
 */

/**
 * 手写 new。规范依据：ECMA-262
 *   - §9.2.2 [[Construct]]（构造调用）：
 *       步骤 5.a OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%")
 *       → 以 newTarget.prototype 为原型创建空对象（即这里的 Ctor.prototype）
 *       步骤 5.b 以该对象为 this 调用构造器
 *       步骤 5.d 构造器返回对象 → 用返回值；返回原始值 → 用 this
 *   - §9.2.1 [[Call]] 步骤 2：class 构造器带 [[IsClassConstructor]] 内部标记，
 *       经 call/apply 直接调用 → TypeError（这就是 myNew 不能用于 class 的原因）
 *
 * @param Ctor 构造器（仅限普通 function；class 请用 new / Reflect.construct）
 * @param args 传给构造器的参数
 */
export function myNew<T>(Ctor: new (...args: any[]) => T, ...args: any[]): T {
  // 第一步：以 Ctor.prototype 为原型创建新对象。
  // new 表达式的 newTarget 就是 Ctor 本身，所以 OrdinaryCreateFromConstructor 取 Ctor.prototype
  const instance = Object.create(Ctor.prototype) as T;

  // 第二步：以 instance 为 this 调用构造器。
  // 注意：这是 [[Call]] 而非 [[Construct]]，所以 class 构造器会在这里抛 TypeError
  const result = (Ctor as any).apply(instance, args);

  // 第三步：构造器返回对象 → 采纳返回值；返回原始值（含 undefined）→ 忽略，用 this
  return result instanceof Object ? (result as T) : instance;
}

export default myNew;

// —————————————————— demo（tsx 冒烟）——————————————————

/** 供 npx tsx 直接运行的冒烟演示；测试文件不依赖它 */
export function demo(): void {
  console.log('--- myNew demo ---');

  // 1. 正常构造：属性 + 原型方法
  function Animal(this: any, name: string) {
    this.name = name;
    // new.target：new 表达式中等于构造器本身；
    // myNew 内部走 apply（[[Call]]），所以这里是 undefined
    console.log('  new.target in myNew =', new.target === undefined ? 'undefined' : new.target.name);
  }
  (Animal as any).prototype.speak = function (this: any) {
    return `I am ${this.name}`;
  };
  // 带 this 参数的 function 声明没有构造签名，显式转换成构造器类型
  const AnimalCtor = Animal as unknown as new (name: string) => any;
  const a = myNew(AnimalCtor, 'cat');
  console.log('  instance:', a.speak(), '| instanceof Animal:', a instanceof Animal);

  // 2. 构造器返回对象 → 覆盖 this
  const replacement = { tag: 'replaced' };
  function ReturnsObject(this: any) {
    this.junk = 'discarded';
    return replacement;
  }
  const ReturnsObjectCtor = ReturnsObject as unknown as new () => any;
  console.log('  返回对象覆盖:', myNew(ReturnsObjectCtor) === replacement);

  // 3. 构造器返回原始值 → 被忽略，仍返回 this
  function ReturnsPrimitive(this: any) {
    this.kept = true;
    return 42; // 原始值：new 语义里被忽略
  }
  const c = myNew(ReturnsPrimitive as unknown as new () => any);
  console.log('  返回原始值被忽略:', c.kept === true && c !== 42);

  // 4. class 构造器不能被 apply 调用：[[IsClassConstructor]]（§9.2.1 [[Call]] 步骤 2）
  class Modern {
    v: number;
    constructor(v: number) {
      this.v = v;
    }
    double(): number {
      return this.v * 2;
    }
  }
  try {
    myNew(Modern as unknown as new (...args: any[]) => Modern, 1);
  } catch (e) {
    console.log('  class 不能走 apply:', (e as TypeError).constructor.name, '-', (e as Error).message);
  }

  // 5. new.target 与 Reflect.construct 对比：
  //    Reflect.construct 是 [[Construct]] 的显式入口——new.target 正确传入，class 可用；
  //    还能指定 newTarget 来换实例原型（myNew 的 Object.create 做不到的第三维玩法）
  const m = Reflect.construct(Modern, [21]);
  console.log('  Reflect.construct(Modern,[21]):', m instanceof Modern, m.double());
  const m2 = Reflect.construct(Modern, [5], Animal as unknown as new () => object);
  console.log('  换 newTarget → 原型来自 Animal:', m2 instanceof Animal, '| instanceof Modern:', m2 instanceof Modern);
}

demo();
