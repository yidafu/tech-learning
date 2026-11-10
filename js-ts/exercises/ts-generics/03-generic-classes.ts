/**
 * 大纲章节：阶段 3.2 泛型深入（泛型类）
 * 主题：Stack<T>/Queue<T> 方法封装、静态成员不能引用类级类型参数、运行时类型擦除验证
 * 运行：npx tsx exercises/ts-generics/03-generic-classes.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-generics/03-generic-classes.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [Stack] from([10,20])：size => 2
 * [Stack] pop, pop => 20, 10
 * [Stack] 空栈 pop => undefined
 * [Queue] enqueue a,b 后 dequeue 三次 => a, b, undefined
 * [擦除] s1.constructor === s2.constructor => true
 * [擦除] Stack.name => Stack
 * [擦除] typeof Stack => function
 * [擦除] 实例自有属性 => items
 * [擦除] s1 instanceof Stack, s2 instanceof Stack => true, true
 * [擦除] typeof runtimeValue（声明为 Stack<number> | string）=> object
 */

// ================================================================
// 1. 泛型类：类型参数绑定到「实例类型」
// ================================================================
// 内部字段私有，外部只能通过方法访问（不暴露内部字段，便于保持不变量）
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  size(): number {
    return this.items.length;
  }

  // 静态方法【用自己的】类型参数 U（与类级 T 无关）——这是合法写法：
  // 泛型工厂：从已有序列构建实例
  static from<U>(items: readonly U[]): Stack<U> {
    const stack = new Stack<U>();
    for (const item of items) {
      stack.push(item);
    }
    return stack;
  }
}

class Queue<T> {
  private head = 0; // 出队指针，避免 shift 的 O(n) 搬移
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head];
    this.head += 1;
    return item;
  }

  size(): number {
    return this.items.length - this.head;
  }
}

// ================================================================
// 2. 静态成员引用类级类型参数：直接被禁止
// ================================================================
// 原因：class 语法在运行时产生「一个构造函数 + 一个 prototype」。
// 静态成员挂在构造函数（类这一侧）上，而 T 只出现在【实例类型】一侧——
// 运行时 Stack<number> 和 Stack<string> 共用同一个构造函数，静态一侧根本没有 T 可用，
// 所以 TS 直接报错，而不是给一个运行时无法兑现的承诺：
class WithStaticEvidence<T> {
  private items: T[] = [];

  // 报错原文：Static members cannot reference class type parameters.
  // @ts-expect-error - Static members cannot reference class type parameters.
  static identityOf(x: T): T { return x; }
}

// ================================================================
// 3. 实例类型不兼容 + 调用约束的编译期证据（本函数不会被调用）
// ================================================================

function classLevelEvidence(): void {
  const numberStack = new Stack<number>();
  numberStack.push(1);

  // 证据 1：实例类型绑定 T —— push 只接受 number
  // 报错原文：Argument of type 'string' is not assignable to parameter of type 'number'.
  // @ts-expect-error - Argument of type 'string' is not assignable to parameter of type 'number'.
  numberStack.push('3');

  // 证据 2：Stack<number> 与 Stack<string> 是不同的实例类型
  //（类含私有字段时比较按「名义」进行，结构相同也不行）
  // 报错原文（两行）：
  //   Type 'Stack<number>' is not assignable to type 'Stack<string>'.
  //   Type 'number' is not assignable to type 'string'.
  // @ts-expect-error - Type 'Stack<number>' is not assignable to type 'Stack<string>'.
  const mixup: Stack<string> = numberStack;
  void mixup;
}

// ================================================================
// 4. 泛型是编译期的：类型擦除验证
// ================================================================

const stack = Stack.from([10, 20]);
const queue = new Queue<string>();
queue.enqueue('a');
queue.enqueue('b');

// new Stack<number>()：无实参可推断类型参数时，显式传参的典型位置
const s1 = new Stack<number>();
const s2 = new Stack<string>();
s1.push(1);
s2.push('one');

// 声明看起来带着类型参数，运行时只剩普通值：
const runtimeValue: Stack<number> | string = s1;

// ================================================================
// 运行验证
// ================================================================

console.log(`[Stack] from([10,20])：size => ${stack.size()}`);
console.log(`[Stack] pop, pop => ${stack.pop()}, ${stack.pop()}`);
console.log(`[Stack] 空栈 pop => ${stack.pop()}`);
console.log(`[Queue] enqueue a,b 后 dequeue 三次 => ${queue.dequeue()}, ${queue.dequeue()}, ${queue.dequeue()}`);
console.log(`[擦除] s1.constructor === s2.constructor => ${s1.constructor === s2.constructor}`);
console.log(`[擦除] Stack.name => ${Stack.name}`);
console.log(`[擦除] typeof Stack => ${typeof Stack}`);
console.log(`[擦除] 实例自有属性 => ${Object.getOwnPropertyNames(s1).join(',')}`);
console.log(`[擦除] s1 instanceof Stack, s2 instanceof Stack => ${s1 instanceof Stack}, ${s2 instanceof Stack}`);
console.log(`[擦除] typeof runtimeValue（声明为 Stack<number> | string）=> ${typeof runtimeValue}`);

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
