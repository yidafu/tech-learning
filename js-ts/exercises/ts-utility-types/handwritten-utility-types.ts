/**
 * 大纲章节：阶段 3.4 内置工具类型源码级理解（配合阶段 3.3 的映射/条件/infer 机制）
 * 主题：集中手写 15 个工具类型（Partial/Required/Readonly/Mutable/Pick/Omit/Record/Exclude/Extract/
 *       NonNullable/Parameters/ConstructorParameters/ReturnType/InstanceType/Awaited），
 *       每个附一句原理注释；文件底部是可运行 demo
 * 运行：npx tsx exercises/ts-utility-types/handwritten-utility-types.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-utility-types/handwritten-utility-types.ts
 * 预期输出：
 * a
 * c@d.e
 * y
 * pk
 * om
 * 0 99
 * b a nn
 * hi tsx! hi tsx!
 * [1,2] 1
 * changed
 * {"id":7,"name":"ts"}
 */

// ============================================================
// 一、15 个手写工具类型（与官方源码逐字一致，行号指本机 lib.es5.d.ts）
// ============================================================

// ① Partial（lib.es5.d.ts:1585）：同态映射叠加 ?（等价 +?）——readonly 被原样复制
export type MyPartial<T> = { [K in keyof T]?: T[K] };

// ② Required（lib.es5.d.ts:1592）：同态映射 -? 摘掉可选；readonly 不受影响
export type MyRequired<T> = { [K in keyof T]-?: T[K] };

// ③ Readonly（lib.es5.d.ts:1599）：同态映射 +readonly（裸写 readonly 即加法）
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// ④ Mutable（官方未收录，社区约定实现）：同态映射 -readonly 摘掉只读
export type MyMutable<T> = { -readonly [K in keyof T]: T[K] };

// ⑤ Exclude（lib.es5.d.ts:1620）：裸类型参数分布式逐成员判断，匹配者映射成 never 再被联合吸收
export type MyExclude<T, U> = T extends U ? never : T;

// ⑥ Extract（lib.es5.d.ts:1625）：Exclude 的镜像——不匹配者变 never
export type MyExtract<T, U> = T extends U ? T : never;

// ⑦ Pick（lib.es5.d.ts:1606）：K 的约束是 keyof T → 按同态处理，保留 readonly/?
export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

// ⑧ Omit 严格版：借道同态 MyPick 保修饰符；K extends keyof T 让拼错键名直接报错
//    （官方 Omit 的 K 约束是 keyof any，允许传入不存在的键）
export type MyOmit<T, K extends keyof T> = MyPick<T, MyExclude<keyof T, K>>;

// ⑨ Record（lib.es5.d.ts:1613）：非同态映射——K 与任何 keyof T 无关，产物一律必有、可写；keyof any = string | number | symbol
export type MyRecord<K extends keyof any, T> = { [P in K]: T };

// ⑩ NonNullable（经典条件实现；本机 TS 7 的 lib 改成了 T & {}，对常规联合行为等价）
export type MyNonNullable<T> = T extends null | undefined ? never : T;

// ⑪ Parameters（lib.es5.d.ts:1640）：infer 在 rest 参数位置——整体推断为参数元组（含标签与可选性）
export type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// ⑫ ConstructorParameters（lib.es5.d.ts:1645）：构造器版；abstract new 兼容抽象类
export type MyConstructorParameters<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: infer P) => any ? P : never;

// ⑬ ReturnType（lib.es5.d.ts:1650）：infer 在返回值位置（协变）；假分支官方就写的 any
export type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// ⑭ InstanceType（lib.es5.d.ts:1655）：构造器 new 的产物即实例类型
export type MyInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer R ? R : any;

// ⑮ Awaited（lib.es5.d.ts:1570）：递归解包 thenable，模拟 await 的语义（含嵌套 Promise 拍平）
export type MyAwaited<T> =
  T extends null | undefined ? T : // null/undefined 原样返回（兼容非 strictNullChecks）
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? // 有可调用 then 的对象才算 thenable
    F extends ((value: infer V, ...args: infer _) => any) ? // 从 onfulfilled 挖第一个参数
      MyAwaited<V> : // 递归解包
    never : // then 的形参不可调用 → never
  T; // 非对象 / 非 thenable → 原样返回

// ============================================================
// 二、可运行 demo（对照顶部「预期输出」逐行验证）
// ============================================================

interface Profile {
  readonly id: number;
  name: string;
  email?: string;
}

// ① Partial：全部可省（readonly id 仍被保留为 readonly）
const partialProfile: MyPartial<Profile> = { name: "a" };

// ② Required：email 变必有
const requiredProfile: MyRequired<Profile> = { id: 1, name: "b", email: "c@d.e" };
// @ts-expect-error - MyRequired 摘掉了 email 的 ?，缺 email 报错
const missingEmail: MyRequired<Profile> = { id: 1, name: "x" };

// ③ Readonly：全部只读
const readonlyProfile: MyReadonly<Profile> = { id: 1, name: "b" };
// @ts-expect-error - MyReadonly 的 name 不可写
readonlyProfile.name = "y";

// ④ Mutable：把 ③ 的产物再变可写
const mutableProfile: MyMutable<MyReadonly<Profile>> = { id: 1, name: "n" };
mutableProfile.name = "changed";

// ⑦ Pick：只挑两个键，修饰符保留（id 仍 readonly）
const picked: MyPick<Profile, "id" | "name"> = { id: 2, name: "pk" };

// ⑧ Omit 严格版：键名受 keyof Profile 检查
const omitted: MyOmit<Profile, "id"> = { name: "om" };
// @ts-expect-error - "emaill" 拼错了，不在 keyof Profile 里（官方 Omit 不会报这一行）
type TypoOmit = MyOmit<Profile, "emaill">;

// ⑨ Record：精确键表
const range: MyRecord<"min" | "max", number> = { min: 0, max: 99 };

// ⑤⑥⑩ 联合过滤三兄弟
const excluded: MyExclude<"a" | "b" | "c", "a" | "c"> = "b";
const extracted: MyExtract<"a" | "b" | "c", "a" | "c"> = "a";
const nonNullable: MyNonNullable<string | null | undefined> = "nn";
// @ts-expect-error - MyNonNullable 之后不能再赋 null
const badNullable: MyNonNullable<string | null> = null;

// ⑪⑬ 参数与返回值：元组可以原样 spread 回函数
function greet(name: string, punct = "!"): string {
  return `hi ${name}${punct}`;
}
const greetArgs: MyParameters<typeof greet> = ["tsx", "!"];
const greetResult: MyReturnType<typeof greet> = greet(...greetArgs);

// ⑫⑭ 构造器参数与实例类型
class Point {
  constructor(public x: number, public y: number) {}
}
const pointArgs: MyConstructorParameters<typeof Point> = [1, 2];
const pointInstance: MyInstanceType<typeof Point> = new Point(...pointArgs);

// ⑮ Awaited：async 函数 → Promise<User> → User
async function loadUser(): Promise<{ id: number; name: string }> {
  return { id: 7, name: "ts" };
}
const user: MyAwaited<MyReturnType<typeof loadUser>> = await loadUser();

// ---- 打印（顺序即顶部预期输出） ----
console.log(partialProfile.name); // a
console.log(requiredProfile.email); // c@d.e
console.log(readonlyProfile.name); // y —— 初始化是 "b"，但上面那行类型报错的赋值在运行时照常执行（tsx 不查类型）
console.log(picked.name); // pk
console.log(omitted.name); // om
console.log(range.min, range.max); // 0 99
console.log(excluded, extracted, nonNullable); // b a nn
console.log(greet(...greetArgs), greetResult); // hi tsx! hi tsx!
console.log(JSON.stringify(pointArgs), pointInstance.x); // [1,2] 1
console.log(mutableProfile.name); // changed
console.log(JSON.stringify(user)); // {"id":7,"name":"ts"}

void missingEmail;
void badNullable;
void readonlyProfile;
