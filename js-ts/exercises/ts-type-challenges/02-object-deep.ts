/**
 * 大纲章节：阶段 3 里程碑——类型体操（对象两题：DeepPartial / Mutable）
 * 主题：递归映射的函数排除分支、修饰符算术（-readonly / ?）、递归出口同族原则
 * 运行：npx tsx exercises/ts-type-challenges/02-object-deep.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-challenges/02-object-deep.ts
 * 预期输出：
 * deepPartialSample = {"server":{}} —— 运行时：只填一层（深层全可选）
 * Mutable 后可写: 9（frozen 同样写法则被 tsc 拦截）
 */

export {};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、DeepPartial：函数必须先排除（否则 keyof 函数 ≈ never，映射成 {} 毁掉函数）
// ============================================================

type DeepPartial<T> =
  T extends (...args: never[]) => unknown
    ? T // 函数：原样返回（never[] 参数是逆变技巧：能匹配一切函数）
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> } // 对象：递归 + ?
      : T; // 原始类型：出口

type Config = {
  server: { host: string; port: number };
  retry: { times: number; backoff: (ms: number) => void };
};

type _t1 = Expect<Equal<DeepPartial<Config>, {
  server?: { host?: string; port?: number } | undefined;
  retry?: { times?: number; backoff?: ((ms: number) => void) | undefined } | undefined;
}>>;
// backoff 保持函数类型——没有第一条分支它会被映射成 {}（keyof 函数是 never）

// 数组走同态映射：带 ? 的映射连数组元素也一起可选化（string → string | undefined）
// 探针实证：DeepPartial<{list: string[]}> = { list?: (string | undefined)[] | undefined }
type _t2 = Expect<Equal<DeepPartial<{ list: string[] }>, { list?: (string | undefined)[] | undefined }>>;

// ============================================================
// 二、Mutable<T>：Readonly 的镜像（修饰符算术 -readonly）
// ============================================================

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type Frozen = { readonly id: number; readonly tags: string[] };
type Thawed = Mutable<Frozen>;
type _t3 = Expect<Equal<Thawed, { id: number; tags: string[] }>>;

// 修饰符按维度独立：-readonly 不动 ?（可选仍可选）
type _t4 = Expect<Equal<Mutable<{ readonly a: 1; readonly b?: 2 }>, { a: 1; b?: 2 }>>;

// ============================================================
// 三、递归出口同族原则（易错点实验）
// ============================================================

// Flatten 输出元组 → 出口是 []；若错写成 never，中途混入 never 会污染联合（元组语境直接报类型不匹配）。
// StringToUnion 输出联合 → 出口是 never（联合中被吸收，无害）。见 03 文件。
// 对象递归的出口是「原始类型原样返回 T」——三个出口类型各不相同，没有万能出口。

// ============================================================
// 四、运行时对照
// ============================================================

// DeepPartial 的运行时对应：Partial 覆盖配置合并（只填深层一角）
const deepPartialSample: DeepPartial<Config> = { server: {} }; // 深层全可选，能只填 server 层
console.log(`deepPartialSample = ${JSON.stringify(deepPartialSample)} —— 运行时：只填一层（深层全可选）`);

// Mutable 的运行时对应：Mutable 之后可以改了（类型层放行）
const obj: Thawed = { id: 1, tags: ['a'] };
obj.id = 9; // 若 obj: Frozen，这里报 Cannot assign to 'id' because it is a read-only property

// 对照：readonly 原型下禁止写入（@ts-expect-error 必须命中报错，否则 tsc 报 unused）
const frozen: Frozen = { id: 1, tags: [] };
// @ts-expect-error —— readonly 属性不可写：Cannot assign to 'id' because it is a read-only property
frozen.id = 9;
console.log(`Mutable 后可写: ${obj.id}（frozen 同样写法则被 tsc 拦截）`);
