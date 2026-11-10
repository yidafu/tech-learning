/**
 * 大纲章节：阶段 3.3 类型编程——分布式条件类型
 * 主题：分布式 vs 阻断式对照实验、never 的分发特例、Exclude/Extract 原理复刻、联合过滤 null 的三种写法
 * 运行：npx tsx exercises/ts-type-programming/03-distribution.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-programming/03-distribution.ts
 * 预期输出：
 * 2 2
 * [1,2,3]
 * click,scroll
 */

// ============================================================
// 一、实验器材：同一件事的两种写法
// ============================================================

// 分布式：检查类型 T 是「裸类型参数」→ 联合先拆成员逐个判断，结果再联合
type ToArrayDistributed<T> = T extends any ? T[] : never;

// 阻断式：T 被包进元组，不再是裸参数 → 拿整个联合整体判断
type ToArrayBlocked<T> = [T] extends [any] ? T[] : never;

// 类型层断言工具（type-challenges 惯用法）
type Equal<A, B> = (<T>() => (T extends A ? 1 : 2)) extends (<T>() => (T extends B ? 1 : 2)) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 二、对照实验：分配行为立刻分叉
// ============================================================

// string | number 逐成员分发 → string[] | number[]：数组必须是「纯 string」或「纯 number」
const dist: ToArrayDistributed<string | number> = ["only", "strings"]; // OK：命中 string[] 成员
// @ts-expect-error - string[] | number[] 不接受 string/number 混装数组
const distMixed: ToArrayDistributed<string | number> = ["str", 1];

// 阻断式 → (string | number)[]：元素随便混
const blocked: ToArrayBlocked<string | number> = ["str", 1];

// boolean 的联合本质：裸参数代入 boolean 拆成 true | false
type _b1 = Expect<Equal<ToArrayDistributed<boolean>, true[] | false[]>>;
type _b2 = Expect<Equal<ToArrayBlocked<boolean>, boolean[]>>;

// 运行时印证：类型差异不影响运行（类型擦除），两个数组都能正常用
console.log(dist.length, blocked.length); // 2 2

// ============================================================
// 三、never 的分发特例
// ============================================================

type Cond<T> = T extends string ? "s" : "n";

// 泛型裸 never：never 是「空联合」，逐成员分发一次都不执行 → 直接得到 never
type _n1 = Expect<Equal<Cond<never>, never>>;

// 直接写 never（没有类型参数可分发）：never 可赋值给一切 → 走 true 分支
type _n2 = Expect<Equal<never extends string ? 1 : 2, 1>>;

// 所以判断「T 是不是 never」必须用元组阻断
type IsNever<T> = [T] extends [never] ? true : false;
type _n3 = Expect<Equal<IsNever<never>, true>>;
type _n4 = Expect<Equal<IsNever<string>, false>>;

// ============================================================
// 四、Exclude / Extract 原理复刻：分发 + never 吸收 = 联合过滤
// ============================================================

type MyExclude<T, U> = T extends U ? never : T; // 匹配的成员映射成 never，再被联合吸收
type MyExtract<T, U> = T extends U ? T : never; // 镜像：不匹配的成员变成 never

type _e1 = Expect<Equal<MyExclude<"a" | "b" | "c", "a" | "c">, "b">>;
type _e2 = Expect<Equal<MyExtract<"a" | "b" | "c", "a" | "c">, "a" | "c">>;
type _e3 = Expect<Equal<MyExclude<never, string>, never>>; // 空联合进，never 出
type _e4 = Expect<Equal<MyExtract<string | number, never>, never>>; // 没有成员能匹配 never

// ============================================================
// 五、过滤联合里的 null / undefined 的写法
// ============================================================

// 「过滤 null 与 undefined」三种写法（NonNullable 的语义就是滤掉 nullable）：
// ① Exclude 直滤（分布式 + never 吸收）
type WithoutNullA<T> = MyExclude<T, null | undefined>;
// ② 手写分布式条件
type WithoutNullC<T> = T extends null | undefined ? never : T;
// ③ 内置 NonNullable

type _w1 = Expect<Equal<WithoutNullA<string | null | undefined>, string>>;
type _w3 = Expect<Equal<WithoutNullC<string | null | undefined>, string>>;
// NonNullable 在本机 lib（TS 7）里实现为 T & {}，与 string 品牌不同、但双向可赋值，行为等价：
type _w2a = Expect<NonNullable<string | null | undefined> extends string ? true : false>;
type _w2b = Expect<string extends NonNullable<string | null | undefined> ? true : false>;

// 只想滤 null（保留 undefined）：把 U 写成 null 即可——排除什么由 U 说了算
type _w4 = Expect<Equal<MyExclude<string | null | undefined, null>, string | undefined>>;

// 类型层的过滤对应运行时的守卫：filter 的类型谓词就是 Exclude 的运行时镜像
const ids: (number | null)[] = [1, null, 2, null, 3];
const compact: number[] = ids.filter((v): v is number => v !== null);
console.log(JSON.stringify(compact)); // [1,2,3]

// ============================================================
// 六、Extract 的实际使用：从宽事件表里筛出鼠标事件
// ============================================================

type AllEvents = "click" | "input" | "scroll" | "focus";
type MouseEvents = MyExtract<AllEvents, "click" | "scroll" | "mouseover">; // "click" | "scroll"

const mouseEvents: MouseEvents[] = ["click", "scroll"];
// @ts-expect-error - "input" 不在 Extract 的结果里
const badEvents: MouseEvents[] = ["click", "input"];
console.log(mouseEvents.join(",")); // click,scroll

void distMixed;
void badEvents;
