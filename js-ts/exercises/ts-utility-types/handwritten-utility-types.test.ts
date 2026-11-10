/**
 * 大纲章节：阶段 3.4 内置工具类型源码级理解
 * 主题：用 vitest + expectTypeOf 对 15 个手写工具类型逐个断言「与官方版行为一致」，
 *       覆盖修饰符（readonly/可选）、never/any 函数、重载函数等边界
 * 运行：npx vitest run exercises/ts-utility-types/
 * 类型校验：expectTypeOf 的断言在类型层生效——本文件通过严格类型检查时断言才真正被验证
 *   （本工作区无 node_modules，测试文件请交给 vitest 运行；编辑器里 expectTypeOf 断言随语言服务即时检查）
 * 预期输出：
 * ✓ exercises/ts-utility-types/handwritten-utility-types.test.ts (7 tests)
 * Test Files  1 passed (1)
 *      Tests  7 passed (7)
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  MyAwaited,
  MyConstructorParameters,
  MyExclude,
  MyExtract,
  MyInstanceType,
  MyMutable,
  MyNonNullable,
  MyOmit,
  MyParameters,
  MyPartial,
  MyPick,
  MyReadonly,
  MyRecord,
  MyRequired,
  MyReturnType,
} from "./handwritten-utility-types";

interface Foo {
  readonly a: number; // readonly 修饰符
  b?: string; // 可选修饰符
  c: boolean;
}

// 严格版 MyOmit 的「键名受检」边界：拼错键名直接编译错误（官方 Omit 因 K extends keyof any 不会报）
// @ts-expect-error - "d" 不在 keyof Foo 中
type TypoKey = MyOmit<Foo, "d">;

describe("同态映射家族：与官方版逐个等价（修饰符保留）", () => {
  it("MyPartial ≡ Partial：叠加 ?，readonly 原样复制", () => {
    expectTypeOf<MyPartial<Foo>>().toEqualTypeOf<Partial<Foo>>();
    expectTypeOf<Partial<Foo>>().toEqualTypeOf<MyPartial<Foo>>(); // 双向：避免单向侥幸
  });

  it("MyRequired ≡ Required：-? 摘掉可选，readonly 不受影响", () => {
    expectTypeOf<MyRequired<Foo>>().toEqualTypeOf<Required<Foo>>();
  });

  it("MyReadonly ≡ Readonly：+readonly，? 保留", () => {
    expectTypeOf<MyReadonly<Foo>>().toEqualTypeOf<Readonly<Foo>>();
  });

  it("MyMutable：-readonly 摘掉只读，? 保留（官方无对应，断言手写目标）", () => {
    expectTypeOf<MyMutable<Foo>>().toEqualTypeOf<{ a: number; b?: string; c: boolean }>();
  });

  it("MyPick ≡ Pick：K 的约束是 keyof T → 仍按同态处理", () => {
    expectTypeOf<MyPick<Foo, "a" | "b">>().toEqualTypeOf<Pick<Foo, "a" | "b">>();
    // 只挑一个键：readonly a 被保留（赋值兼容性自证）
    expectTypeOf<MyPick<Foo, "a">>().toEqualTypeOf<{ readonly a: number }>();
  });

  it("MyOmit（严格版）≡ Omit：借道同态 Pick，修饰符保留一致", () => {
    expectTypeOf<MyOmit<Foo, "c">>().toEqualTypeOf<Omit<Foo, "c">>();
    expectTypeOf<MyOmit<Foo, "c">>().toEqualTypeOf<{ readonly a: number; b?: string }>();
  });

  it("MyRecord ≡ Record：非同态，产物必有、可写", () => {
    expectTypeOf<MyRecord<"x" | "y", number>>().toEqualTypeOf<Record<"x" | "y", number>>();
    // 边界：空键联合 → 空对象
    expectTypeOf<MyRecord<never, string>>().toEqualTypeOf<Record<never, string>>();
    // keyof any = string | number | symbol：数字键也接受
    expectTypeOf<MyRecord<1 | 2, boolean>>().toEqualTypeOf<Record<1 | 2, boolean>>();
  });
});

describe("条件类型家族：分布式行为与官方一致", () => {
  it("MyExclude / MyExtract：联合过滤结果一致", () => {
    expectTypeOf<MyExclude<"a" | "b" | "c", "a" | "c">>().toEqualTypeOf<Exclude<"a" | "b" | "c", "a" | "c">>();
    expectTypeOf<MyExtract<"a" | "b" | "c", "a" | "c">>().toEqualTypeOf<Extract<"a" | "b" | "c", "a" | "c">>();
  });

  it("边界：never 进空联合分发得 never；boolean 被拆成 true | false", () => {
    expectTypeOf<MyExclude<never, string>>().toEqualTypeOf<Exclude<never, string>>();
    expectTypeOf<MyExclude<never, string>>().toEqualTypeOf<never>();
    expectTypeOf<MyExclude<boolean, boolean>>().toEqualTypeOf<Exclude<boolean, boolean>>();
    expectTypeOf<MyExclude<boolean, boolean>>().toEqualTypeOf<never>(); // true、false 双双被排除
  });

  it("MyNonNullable ≡ NonNullable：常规联合上行为一致", () => {
    expectTypeOf<MyNonNullable<string | null | undefined>>().toEqualTypeOf<string>();
    expectTypeOf<MyNonNullable<{ x: 1 } | null>>().toEqualTypeOf<NonNullable<{ x: 1 } | null>>();
  });
});

describe("函数/构造器家族：infer 位置与边界行为一致", () => {
  const fn = (x: number, y?: string) => true;

  it("MyParameters / MyReturnType ≡ 官方（元组含可选参数）", () => {
    expectTypeOf<MyParameters<typeof fn>>().toEqualTypeOf<Parameters<typeof fn>>();
    expectTypeOf<MyParameters<typeof fn>>().toEqualTypeOf<[x: number, y?: string]>();
    expectTypeOf<MyReturnType<typeof fn>>().toEqualTypeOf<ReturnType<typeof fn>>();
    expectTypeOf<MyReturnType<typeof fn>>().toEqualTypeOf<boolean>();
  });

  it("边界 any：Parameters<any> = unknown[]，ReturnType<any> = any", () => {
    expectTypeOf<MyParameters<any>>().toEqualTypeOf<Parameters<any>>();
    expectTypeOf<MyParameters<any>>().toEqualTypeOf<unknown[]>();
    expectTypeOf<MyReturnType<any>>().toEqualTypeOf<ReturnType<any>>();
    expectTypeOf<MyReturnType<any>>().toEqualTypeOf<any>();
  });

  it("边界 never：空联合分发，真假分支都不走", () => {
    expectTypeOf<MyParameters<never>>().toEqualTypeOf<Parameters<never>>();
    expectTypeOf<MyParameters<never>>().toEqualTypeOf<never>();
    expectTypeOf<MyReturnType<never>>().toEqualTypeOf<ReturnType<never>>();
    expectTypeOf<MyReturnType<never>>().toEqualTypeOf<never>();
  });

  it("边界重载：只匹配最后一个重载", () => {
    interface Overloaded {
      (x: string): number;
      (x: number, y?: boolean): string;
    }
    expectTypeOf<MyParameters<Overloaded>>().toEqualTypeOf<Parameters<Overloaded>>();
    expectTypeOf<MyParameters<Overloaded>>().toEqualTypeOf<[x: number, y?: boolean]>();
    expectTypeOf<MyReturnType<Overloaded>>().toEqualTypeOf<ReturnType<Overloaded>>();
    expectTypeOf<MyReturnType<Overloaded>>().toEqualTypeOf<string>();
  });

  it("构造器：ConstructorParameters / InstanceType ≡ 官方", () => {
    class Point {
      constructor(public x: number, public y: number) {}
    }
    expectTypeOf<MyConstructorParameters<typeof Point>>().toEqualTypeOf<ConstructorParameters<typeof Point>>();
    expectTypeOf<MyConstructorParameters<typeof Point>>().toEqualTypeOf<[x: number, y: number]>();
    expectTypeOf<MyInstanceType<typeof Point>>().toEqualTypeOf<InstanceType<typeof Point>>();
    // 泛型类：无调用上下文时类型参数落到约束（unknown）
    class Box<T> {
      constructor(public value: T) {}
    }
    expectTypeOf<MyInstanceType<typeof Box>>().toEqualTypeOf<InstanceType<typeof Box>>();
    expectTypeOf<MyConstructorParameters<typeof Box>>().toEqualTypeOf<[value: unknown]>();
  });
});

describe("MyAwaited ≡ Awaited：递归解包与分发", () => {
  it("嵌套 Promise 拍平到值", () => {
    expectTypeOf<MyAwaited<Promise<Promise<number>>>>().toEqualTypeOf<Awaited<Promise<Promise<number>>>>();
    expectTypeOf<MyAwaited<Promise<Promise<number>>>>().toEqualTypeOf<number>();
  });

  it("联合分发：每个成员独立判断", () => {
    expectTypeOf<MyAwaited<Promise<number> | string | null>>().toEqualTypeOf<Awaited<Promise<number> | string | null>>();
    expectTypeOf<MyAwaited<Promise<number> | string | null>>().toEqualTypeOf<number | string | null>();
  });

  it("特殊值：void 与 null 原样返回", () => {
    expectTypeOf<MyAwaited<Promise<void>>>().toEqualTypeOf<void>();
    expectTypeOf<MyAwaited<null>>().toEqualTypeOf<Awaited<null>>();
    expectTypeOf<MyAwaited<null>>().toEqualTypeOf<null>();
  });
});

describe("运行时自证：手写类型的产物真的能当官方类型用", () => {
  it("MyPartial 对象可只填部分字段", () => {
    const p: MyPartial<Foo> = { b: "x" };
    expect(p).toEqual({ b: "x" });
  });

  it("MyParameters 元组可 spread 回原函数", () => {
    const f = (a: number, b: string) => `${a}${b}`;
    const args: MyParameters<typeof f> = [1, "x"];
    expect(f(...args)).toBe("1x");
  });
});
