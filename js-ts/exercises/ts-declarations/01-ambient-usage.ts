/**
 * 大纲章节：阶段 3.6 声明文件与模块解析
 * 主题：消费 shapes.d.ts 的环境声明——import type、默认导出类 new、Array.prototype.last
 * 运行：npx tsx exercises/ts-declarations/01-ambient-usage.ts
 * 类型校验：npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-declarations/shapes.d.ts exercises/ts-declarations/01-ambient-usage.ts
 *   （--ignoreConfig：TypeScript 7 起，目录里存在 tsconfig.json 时给 tsc 显式传文件必须加它，否则报 TS5112；
 *    两个文件必须一起传：01-ambient-usage.ts 里的 import 依赖 shapes.d.ts 提供的环境模块）
 * 预期输出：
 *   createCircle: circle 1
 *   area(circle r=1): 3.1416
 *   area(square s=3): 9
 *   默认导出类 new: ShapeLib(demo)
 *   Array.prototype.last: 3 undefined
 */

// import type：只取类型，转译后整行被擦除——
// 所以 'untyped-shapes' 并不存在也照样能运行（运行时不解析它）。
// 用普通 import 则会在运行时报 ERR_MODULE_NOT_FOUND（Node 真的去解析模块了）。
import type { Circle, CircleOptions, Shape } from 'untyped-shapes';
import type ShapeLib from 'untyped-shapes'; // 默认导出（类）的类型侧：ShapeLib 即实例类型

// ────────────────────────────────────────────────────────────
// 如果删掉 shapes.d.ts 会发生什么？（本工作区实测）
//   类型层：两个 import type 立刻报
//           TS2307: Cannot find module 'untyped-shapes' or its corresponding type declarations.
//           随后 Shape/Circle 等类型全部失守（如 switch 的 never 穷尽检查跟着报 TS2322）。
//           [1,2,3].last() 不受影响——因为 declare global 写在本文件里；
//           若把 Array augmentation 也放进 shapes.d.ts，删掉后它同样会报
//           TS2339: Property 'last' does not exist on type 'number[]'。
//   运行时：什么都不受影响（实测照常运行）——import type 被擦除，
//           下面的 mock 与 polyfill 全在本文件里。
//   这正是环境声明的本质：它只为编译器服务，运行时世界对它一无所知。
// ────────────────────────────────────────────────────────────

// declare global 必须写在「模块文件」里（本文件有 import，是模块），这是它和
// shapes.d.ts（全局脚本，只能用顶层 interface 合并）分工的原因——详见 shapes.d.ts 注释。
declare global {
  interface Array<T> {
    last(): T | undefined;
  }
}

// ────────────────────────────────────────────────────────────
// 运行时 mock：真实场景中这些实现来自 node_modules/untyped-shapes 的 JS 代码。
// 环境声明只提供「类型」，运行时行为必须由库自己（或这里的 mock）提供。
// 注解签名直接照抄声明——声明与实现靠结构类型对齐。
// ────────────────────────────────────────────────────────────
const area: (s: Shape) => number = (s) => {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;
    case 'square':
      return s.side ** 2;
    default: {
      const exhausted: never = s; // 穷尽检查：声明里的联合消费同样适用（见 03-never-unknown.ts）
      return exhausted;
    }
  }
};

const createCircle = (opts: CircleOptions): Circle => ({ kind: 'circle', radius: opts.radius });

class ShapeLibImpl {
  constructor(readonly name: string) {}
  describe(): string {
    return `ShapeLib(${this.name})`;
  }
}
// 结构类型在起作用：ShapeLibImpl 的形状满足声明里的默认导出类（name、describe 对得上），
// 无需 as 断言，直接把构造器赋给「new (name) => ShapeLib」类型即可
const ShapeLibCtor: new (name: string) => ShapeLib = ShapeLibImpl;

// polyfill：声明给了 Array.prototype.last 的类型，运行时行为要自己补上
if (typeof Array.prototype.last !== 'function') {
  Array.prototype.last = function last<T>(this: T[]): T | undefined {
    return this.length === 0 ? undefined : this[this.length - 1];
  };
}

// ────────────────────────────────────────────────────────────
// 消费：全部走 shapes.d.ts 提供的类型
// ────────────────────────────────────────────────────────────
const circle: Circle = createCircle({ radius: 1, unit: 'px' }); // 选项对象：unit 可选
console.log('createCircle:', circle.kind, circle.radius);

console.log('area(circle r=1):', area(circle).toFixed(4)); // π ≈ 3.1416
console.log('area(square s=3):', area({ kind: 'square', side: 3 })); // 字面量按 Shape 联合检查

const lib = new ShapeLibCtor('demo'); // 「默认导出类 new」：用 mock 构造器，实例类型来自声明
console.log('默认导出类 new:', lib.describe());

console.log('Array.prototype.last:', [1, 2, 3].last(), [].last()); // 3 undefined——augmentation 生效
