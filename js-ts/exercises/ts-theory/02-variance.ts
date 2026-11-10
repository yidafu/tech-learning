/**
 * 大纲章节：阶段 3.5 类型系统理论——协变 / 逆变 / 双变
 * 主题：Animal/Dog 层级下函数赋值方向合法性矩阵、方法简写 vs 函数属性、数组协变的运行时翻车
 * 运行：npx tsx exercises/ts-theory/02-variance.ts
 * 类型校验：npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-theory/02-variance.ts
 *   （--ignoreConfig：TypeScript 7 起，目录里存在 tsconfig.json 时给 tsc 显式传文件必须加它，否则报 TS5112）
 * 预期输出：
 *   方向矩阵：①返回值协变[合法] ②返回值逆变[非法] ③参数逆变[合法] ④参数协变[非法]
 *   ① Make<Dog> -> Make<Animal> 合法，产出: 旺财 true
 *      Take<Animal> 处理了: 小黑
 *   方法简写（目标侧）双变放行，同样代码换成函数属性即报错：
 *      双变的雷炸了: x.toUpperCase is not a function
 *   数组协变：Animal[] 与 Dog[] 是同一个引用: true 长度 1
 *   push(new Cat(...)) 类型层完全合法，push 后 dogs.length = 2
 *      遍历: 旺财: 去捡球
 *   翻车现场: TypeError - d.fetch is not a function
 */

// ────────────────────────────────────────────────────────────
// 层级：Animal ⊃ Dog / Cat（Dog、Cat 是 Animal 的子类型）
// ────────────────────────────────────────────────────────────
class Animal {
  constructor(public name: string) {}
  speak(): string {
    return `${this.name}: 发声`;
  }
}
class Dog extends Animal {
  fetch(): string {
    return `${this.name}: 去捡球`;
  }
}
class Cat extends Animal {
  meow(): string {
    return `${this.name}: 喵`;
  }
}

// Make<T>：T 只出现在返回值位置（生产者）→ 协变
// Take<T>：T 只出现在参数位置（消费者）→ 逆变
type Make<T> = () => T;
type Take<T> = (x: T) => void;

const makeDog: Make<Dog> = () => new Dog('旺财');
const takeAnimal: Take<Animal> = (a) => console.log('   Take<Animal> 处理了:', a.name);

console.log('方向矩阵：①返回值协变[合法] ②返回值逆变[非法] ③参数逆变[合法] ④参数协变[非法]');

// ① 合法：返回值协变 Make<Dog> -> Make<Animal>
// 逻辑：需要「产出 Animal」的位置，给一个「必然产出 Dog」的函数——Dog 就是 Animal，安全
const makeAnimal: Make<Animal> = makeDog;
console.log('① Make<Dog> -> Make<Animal> 合法，产出:', makeAnimal().name, makeAnimal() instanceof Dog);

// ② 非法：Make<Animal> -> Make<Dog>
// 逻辑：makeAnimal 可能产出 Cat，Cat 不是 Dog，调用方 .fetch() 就崩了
// @ts-expect-error - Make<Animal> is not assignable to Make<Dog>（返回值只能协变，不能逆变）
const remakeDog: Make<Dog> = makeAnimal;

// ③ 合法：参数逆变 Take<Animal> -> Take<Dog>
// 逻辑：需要「处理 Dog」的位置，给一个「什么 Animal 都能处理」的函数——更宽的消费者，安全
const takeDog: Take<Dog> = takeAnimal;
takeDog(new Dog('小黑')); // Dog 安全地流进了 Animal 参数

// ④ 非法：Take<Dog> -> Take<Animal>
// 逻辑：takeDog 只会处理 Dog，接到 Cat 就崩——参数只许逆变（更宽），不许协变（更窄）
// @ts-expect-error - Take<Dog> is not assignable to Take<Animal>（参数只能逆变，不能协变）
const retakeAnimal: Take<Animal> = takeDog;

// ────────────────────────────────────────────────────────────
// 方法简写 vs 函数属性：strictFunctionTypes（TS 2.6）只管后者
// 一手依据：TS 2.6 Release Notes——
//   "The stricter checks apply to all function types, except those
//    originating in method or constructor declarations."
// 历史原因：若方法也严格逆变，Array<T> 等泛型接口立刻由协变变不变，
// Array<Dog> 不能再当 Array<Animal> 用，大量既有代码（含 DOM 回调）会碎一地。
// ────────────────────────────────────────────────────────────
interface MethodTarget {
  sink(x: unknown): void; // 方法简写：参数双变
}
interface FnTarget {
  sink: (x: unknown) => void; // 函数属性：参数严格逆变
}
const narrowFn = (x: string): void => console.log('   narrowFn:', x.toUpperCase());

// 目标成员是方法简写 → 双变检查放行（哪怕源只能吃 string）
const toMethod: MethodTarget = { sink: narrowFn };
// 同样的代码，目标换成函数属性 → 立刻拦下（错误发生在「赋值」这一步，雷被提前排掉）
// @ts-expect-error - Type '(x: string) => void' is not assignable to type '(x: unknown) => void'
const toFnProp: FnTarget = { sink: narrowFn };

console.log('方法简写（目标侧）双变放行，同样代码换成函数属性即报错：');
try {
  toMethod.sink(42); // 类型上完全合法（sink 声明吃 unknown），运行时 narrowFn 拿到 number
} catch (err) {
  console.log('   双变的雷炸了:', (err as Error).message);
}

// ────────────────────────────────────────────────────────────
// 数组协变的运行时风险：Dog[] -> Animal[] 后 push(Cat)
// TS 明知不健全仍选择数组协变（Java/C# 同款妥协），代价见下方翻车现场。
// ────────────────────────────────────────────────────────────
const dogs: Dog[] = [new Dog('旺财')];
const animals: Animal[] = dogs; // 合法：数组对其元素协变
console.log('数组协变：Animal[] 与 Dog[] 是同一个引用:', animals === dogs, '长度', animals.length);

animals.push(new Cat('咪咪')); // 类型层完全合法：Cat 是 Animal（但这个数组「自认为是」Dog[]！）
console.log('push(new Cat(...)) 类型层完全合法，push 后 dogs.length =', dogs.length);

try {
  for (const d of dogs) {
    console.log('   遍历:', d.fetch()); // d 的类型是 Dog——类型在撒谎，第二个元素其实是 Cat
  }
} catch (err) {
  console.log('翻车现场:', (err as Error).name, '-', (err as Error).message);
}

// 推论：只读数组 T[] -> readonly U[]（更窄方向）才是真正安全的协变；
// 可写数组一旦协变，push 就是上面这颗雷。
