/**
 * 大纲章节：阶段 3.3 类型编程——条件类型与 infer
 * 主题：手写 MyReturnType/MyParameters/MyInstanceType/MyAwaited/UnboxPromise（递归解包）+ infer 元组/模板字面量位置，
 *       并用「类型安全的函数转发」证明：类型对了，运行时才对得上
 * 运行：npx tsx exercises/ts-type-programming/02-conditional-infer.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-programming/02-conditional-infer.ts
 * 预期输出：
 * calling with [1,2]
 * 3
 * calling with [1,"x"]
 * 1 2
 * 9
 * {"id":7,"name":"ts"}
 * GET users
 * true
 */

// top-level await 要求本文件是 ESM 模块（tsc 的 TS1375 检查），空导出即可
export {};

// ============================================================
// 一、手写类型（与 lib.es5.d.ts 官方实现逐字一致）
// ============================================================

// infer 在返回值位置（协变）；假分支是 any：官方就是这么写的
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// infer 在 rest 参数位置：整体推断为一个元组（含标签与可选性）
type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// infer 在构造器返回位置：new 的产物即实例类型
type MyInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;

// 官方 Awaited 逐字版：三段嵌套条件 + 递归，模拟 await 对 thenable 链的拆解
type MyAwaited<T> =
  T extends null | undefined ? T : // ① null/undefined 原样返回（兼容非 strictNullChecks）
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? // ② 可调用 then 的对象才算 thenable
    F extends ((value: infer V, ...args: infer _) => any) ? // ③ 从 onfulfilled 挖第一个参数
      MyAwaited<V> : // ④ 递归解包
    never : // ⑤ then 存在但形参不可调用 → never
  T; // ⑥ 非对象 / 非 thenable → 原样返回

// Promise 专用简化版：只认真正的 Promise 包装，递归到底
type UnboxPromise<T> = T extends Promise<infer V> ? UnboxPromise<V> : T;

// ============================================================
// 二、infer 的另外两个位置：元组末位 / 模板字面量模式
// ============================================================

// 元组位置：头部是 rest 模式，挖出末位元素
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

// 模板字面量位置：按 "METHOD /path" 的模式拆出两段字符串字面量
type ParseEndpoint<S extends string> =
  S extends `${infer Method} /${infer Path}` ? { method: Method; path: Path } : never;

// ============================================================
// 三、类型层自证（tsc 检查；运行时无对应物）
// ============================================================

type Equal<A, B> = (<T>() => (T extends A ? 1 : 2)) extends (<T>() => (T extends B ? 1 : 2)) ? true : false;
type Expect<T extends true> = T;

type _t1 = Expect<Equal<MyReturnType<() => "r">, "r">>;
type _t2 = Expect<Equal<MyParameters<(a: number, b?: string) => void>, [a: number, b?: string]>>;
type _t3 = Expect<Equal<UnboxPromise<Promise<Promise<number>>>, number>>;
type _t4 = Expect<Equal<MyAwaited<Promise<Promise<number>> | string>, number | string>>;
type _t5 = Expect<Equal<Last<[string, number, boolean]>, boolean>>;
type _t6 = Expect<Equal<ParseEndpoint<"GET /users">, { method: "GET"; path: "users" }>>;

// ============================================================
// 四、运行时验证：类型驱动函数表（类型对了运行时才对）
// ============================================================

// 1) 类型安全的调用转发：参数与返回值全部由 infer 推导，写错实参在编译期就拦下
function logCall<F extends (...args: any[]) => unknown>(fn: F, ...args: MyParameters<F>): MyReturnType<F> {
  console.log("calling with", JSON.stringify(args));
  return fn(...args) as MyReturnType<F>;
}

const add = (a: number, b: number) => a + b;
console.log(logCall(add, 1, 2)); // 先打印 calling with [1,2]，再打印返回值 3
// @ts-expect-error - 实参类型由 MyParameters<typeof add> = [a: number, b: number] 决定，第二位必须是 number
// 这行在类型层被拦下，但 tsx 只转译不查类型，运行时照样执行——所以下方还会多打印一行 calling with [1,"x"]
logCall(add, 1, "x");

// 2) MyInstanceType：从构造器类型反解实例类型
class Counter {
  count = 0;
  inc(): number {
    this.count += 1;
    return this.count;
  }
}
const counter: MyInstanceType<typeof Counter> = new Counter();
console.log(counter.inc(), counter.inc()); // 1 2

// 3) UnboxPromise：类型上是嵌套 Promise，运行时值只有一层（Promise.resolve 天然拍平），await 两边语义一致
const nestedPromise: Promise<Promise<number>> = Promise.resolve(9) as unknown as Promise<Promise<number>>;
const unboxed: UnboxPromise<typeof nestedPromise> = await nestedPromise;
console.log(unboxed); // 9

// 4) MyAwaited + MyReturnType 组合：async 函数 → Promise<User> → User
async function loadUser(): Promise<{ id: number; name: string }> {
  return { id: 7, name: "ts" };
}
type User = MyAwaited<MyReturnType<typeof loadUser>>; // { id: number; name: string }
const user: User = await loadUser();
console.log(JSON.stringify(user)); // {"id":7,"name":"ts"}

// 5) 模板字面量 infer：解析结果精确到字面量
const endpoint: ParseEndpoint<"GET /users"> = { method: "GET", path: "users" };
// @ts-expect-error - method 的类型是字面量 "GET"，"POST" 不可赋值
const wrongMethod: ParseEndpoint<"GET /users"> = { method: "POST", path: "users" };
console.log(endpoint.method, endpoint.path); // GET users

// 6) 元组末位 infer：Last<[string, number, boolean]> = boolean
const last: Last<[string, number, boolean]> = true;
// @ts-expect-error - 末位是 boolean，赋 string 报错
const lastBad: Last<[string, number, boolean]> = "x";
console.log(last); // true

void wrongMethod;
void lastBad;
