/**
 * 大纲章节：阶段 3.1 基础与类型收窄（可辨识联合）
 * 主题：discriminant 字面量字段 + switch 收窄 + assertNever 穷尽性检查 + 新增 case 的编译器保护
 * 运行：npx tsx exercises/ts-narrowing/03-discriminated-union.ts
 * 类型校验：npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-narrowing/03-discriminated-union.ts
 *   （tsc >= 7 在「命令行指定文件 + cwd 有 tsconfig.json」时报 TS5112，必须加 --ignoreConfig 才会做单文件检查；tsc 5.x 无此参数可去掉）
 * 预期输出：
 * [switch] area(circle r=1) => 3.141592653589793
 * [switch] area(square a=4) => 16
 * [switch] area(rect 3x5) => 15
 * [describe] describe(square) => 正方形 a=4
 * [boolean] unpack(ok:true) => 成功: ping
 * [boolean] unpack(ok:false) => 失败: timeout
 * [漏 case] areaV2(triangle) 运行时兜底 => 未处理的可辨识成员: {"kind":"triangle","base":4,"height":3}
 */

// ================================================================
// 1. 可辨识联合：tag 字面量字段 + switch 收窄
// ================================================================
// 一手依据：TS 2.0 发布说明《Tagged union types》；Handbook《Narrowing》: Discriminated unions
// discriminant 的要求：每个成员在同一个字段上是【不同的字面量】（string/number/boolean 字面量）
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      // 此处 s: { kind: 'circle'; radius: number }
      return Math.PI * s.radius ** 2;
    case 'square':
      // 此处 s: { kind: 'square'; side: number }
      return s.side ** 2;
    case 'rectangle':
      // 此处 s: { kind: 'rectangle'; width: number; height: number }
      return s.width * s.height;
  }
}

// ================================================================
// 2. 穷尽性检查：default 分支赋给 never（assertNever 模式）
// ================================================================

function assertNever(value: never): never {
  throw new Error(`未处理的可辨识成员: ${JSON.stringify(value)}`);
}

function describe(s: Shape): string {
  switch (s.kind) {
    case 'circle':
      return `圆形 r=${s.radius}`;
    case 'square':
      return `正方形 a=${s.side}`;
    case 'rectangle':
      return `矩形 ${s.width}x${s.height}`;
    default: {
      // 三个 case 都处理完后，这里 s: never —— 下面的赋值合法
      const exhaustive: never = s; // 若将来 Shape 新增成员而这里没加 case，这行立刻编译报错
      return assertNever(exhaustive);
    }
  }
}

// ================================================================
// 3. 场景演练：联合新增了 triangle，但忘了在新函数里处理
// ================================================================

type ShapeV2 =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number };

// areaV2 从旧代码复制而来，忘了补 case 'triangle'。
// default 里 s 是 triangle（不是 never），`const unhandled: never = s` 立刻报错——
// 编译器逼你回来补 case，这正是 assertNever 模式的价值。
// 这里用 @ts-expect-error 压制报错，是为了让本文件能继续演示「运行时兜底」：
function areaV2(s: ShapeV2): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2;
    case 'square':
      return s.side ** 2;
    default: {
      // 报错原文：Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
      // （没有压制指令时，tsc 直接拒绝编译，直到你补上 case 'triangle'）
      // @ts-expect-error - Type '{ kind: "triangle"; base: number; height: number; }' is not assignable to type 'never'.
      const unhandled: never = s;
      return assertNever(unhandled); // 运行时兜底：抛出带现场信息的错误
    }
  }
}

// ================================================================
// 4. boolean 字面量也能当 discriminant
// ================================================================

type FetchResult = { ok: true; data: string } | { ok: false; error: string };

function unpack(r: FetchResult): string {
  if (r.ok === true) {
    // 此处 r: { ok: true; data: string }
    return `成功: ${r.data}`;
  }
  // 此处 r: { ok: false; error: string }
  return `失败: ${r.error}`;
}

// ================================================================
// 5. 可辨识字段的边界：tag 必须是可分辨的字面量
// ================================================================

type NotDiscriminated =
  | { kind: string; radius: number } // kind: string —— 不是字面量！
  | { kind: string; side: number };

// 编译期证据（本函数不会被调用）：
// kind 是宽 string 时，case 'circle' 排除不了任何成员（一个 string 完全可能等于 'circle'），
// s 在 case 分支里仍是整个联合，访问成员直接报错。
// 注意：s 必须是参数——如果写 `const s: NotDiscriminated = { kind: 'circle', ... }`，
// 赋值收窄（assignment narrowing）会先把 s 收窄到单个成员，就演示不出这个报错了。
function evidenceKindMustBeLiteral(s: NotDiscriminated): void {
  switch (s.kind) {
    case 'circle':
      // 此处 s: NotDiscriminated（没有收窄！）
      // 报错原文（两行）：
      //   Property 'radius' does not exist on type 'NotDiscriminated'.
      //   Property 'radius' does not exist on type '{ kind: string; side: number; }'.
      // @ts-expect-error - Property 'radius' does not exist on type 'NotDiscriminated'.
      const r: number = s.radius;
      return void r;
    default:
      return;
  }
}

// ================================================================
// 运行验证
// ================================================================

console.log(`[switch] area(circle r=1) => ${area({ kind: 'circle', radius: 1 })}`);
console.log(`[switch] area(square a=4) => ${area({ kind: 'square', side: 4 })}`);
console.log(`[switch] area(rect 3x5) => ${area({ kind: 'rectangle', width: 3, height: 5 })}`);
console.log(`[describe] describe(square) => ${describe({ kind: 'square', side: 4 })}`);
console.log(`[boolean] unpack(ok:true) => ${unpack({ ok: true, data: 'ping' })}`);
console.log(`[boolean] unpack(ok:false) => ${unpack({ ok: false, error: 'timeout' })}`);
try {
  areaV2({ kind: 'triangle', base: 4, height: 3 });
} catch (error) {
  console.log(`[漏 case] areaV2(triangle) 运行时兜底 => ${(error as Error).message}`);
}

// export {}：把本文件变成独立 module，顶层标识符不与其他练习文件的全局作用域冲突
//（工作区多份练习并行存在时的项目级 tsc 需要；对本文件自身的运行与单文件校验无影响）
export {};
