/**
 * 大纲章节：阶段 3.6 声明文件与模块解析
 * 主题：给假想的无类型 JS 库 "untyped-shapes" 整体补环境声明（ambient declaration）
 * 说明：.d.ts 只描述类型、不产生任何运行时代码——import 它的文件在编译后不含一行来自本文件的 JS。
 * 类型校验：npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-declarations/shapes.d.ts exercises/ts-declarations/01-ambient-usage.ts
 *   （--ignoreConfig：TypeScript 7 起，目录里存在 tsconfig.json 时给 tsc 显式传文件必须加它，否则报 TS5112；
 *    shapes.d.ts 与 01-ambient-usage.ts 必须一起传：环境声明要进入同一个编译程序才生效）
 * 预期输出：（本文件不运行，不产生输出；运行验证见 01-ambient-usage.ts）
 */

// ────────────────────────────────────────────────────────────
// 情形 A：给无类型 JS 库整体补声明——declare module '包名' { ... }
//
// 关键机制（一条规则决定本文件怎么写）：
//   文件是「全局脚本」（无顶层 import/export）时，declare module 'x' {} 是
//   **环境模块声明**——凭空声明一个模块的类型，x 不需要真实存在；
//   文件是「模块」（有顶层 import/export）时，declare module 'x' {} 变成
//   **模块增强（augmentation）**——x 必须能被解析到，否则 import 处报 TS2307。
// 所以本文件刻意不含任何顶层 import/export，保持全局脚本身份。
//
// 常见踩坑（都在本工作区验证过）：
//   给本文件加一行 export {} → 'untyped-shapes' 变成无法解析的 augmentation，
//   01-ambient-usage.ts 的 import 立刻报 TS2307: Cannot find module 'untyped-shapes'。
// ────────────────────────────────────────────────────────────
declare module 'untyped-shapes' {
  // —— 命名导出的类型：接口在环境声明里同样可以继承、可以组成联合 ——
  export interface Circle {
    readonly kind: 'circle';
    readonly radius: number;
  }
  export interface Square {
    readonly kind: 'square';
    readonly side: number;
  }
  /** 可辨识联合：消费方可以用 switch(s.kind) + never 穷尽检查安全消费 */
  export type Shape = Circle | Square;

  /** 选项对象模式：必填项收到顶层，可选项用 ?，代替长长的位置参数 */
  export interface CircleOptions {
    radius: number;
    unit?: 'px' | 'cm';
  }

  // —— 命名导出的函数：只写签名（参数名+类型+返回值），不写函数体 ——
  export function area(s: Shape): number;
  export function createCircle(opts: CircleOptions): Circle;

  // —— 默认导出的类：环境类成员不写实现，结尾直接分号 ——
  export default class ShapeLib {
    constructor(name: string); // 构造器签名：new ShapeLib('xxx')
    readonly name: string;
    describe(): string;
  }
}

// ────────────────────────────────────────────────────────────
// 情形 B：全局 Array augmentation——给所有数组加 last() 实例方法
//
// 这里有一个「同一文件鱼与熊掌」的限制（本工作区验证过的三个报错）：
//   1. 本文件是全局脚本 → 顶层写 declare global 报
//      TS2669: Augmentations for the global scope can only be directly
//      nested in external modules or ambient module declarations.
//   2. 塞进 declare module 'untyped-shapes' 内部 → 报
//      TS1038: A 'declare' modifier cannot be used in an already ambient context.
//   3. 给本文件加 export {} 变模块后 declare global 合法了，但上面的
//      declare module 又失效（变成 augmentation），TS2307 回来了。
// 结论：环境模块声明（要脚本文件）与 declare global（要模块文件）不能同居一个文件。
// 因此本文件用「全局脚本里的顶层 interface 合并」给 Array 打补丁——
// 全局作用域中的 interface Array<T> 声明会与 lib 里已有的声明合并（declaration merging）；
// declare global 的写法放在 01-ambient-usage.ts（它是模块文件，写法合法）。
// ────────────────────────────────────────────────────────────
interface Array<T> {
  /** 返回最后一个元素；空数组返回 undefined */
  last(): T | undefined;
}
