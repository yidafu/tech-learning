/**
 * 大纲章节：阶段 3.3 类型编程——模板字面量类型（与映射类型、条件类型组合）
 * 主题：路由联合 `${'/' | '/about'}` 玩法、get/set 前缀方法表推导、EventName → handler 名生成、UnionAll 拼接；
 *       运行时生成对应对象并打印验证
 * 运行：npx tsx exercises/ts-type-programming/04-template-literal.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-programming/04-template-literal.ts
 * 预期输出：
 * /about
 * 1 ts
 * 9
 * onClick,onFocus
 * onClick
 * a-c|a-d|b-c|b-d
 * CLICK Click
 */

// 类型层断言工具
type Equal<A, B> = (<T>() => (T extends A ? 1 : 2)) extends (<T>() => (T extends B ? 1 : 2)) ? true : false;
type Expect<T extends true> = T;

// ============================================================
// 一、路由联合：占位符里的联合自动做笛卡尔积展开
// ============================================================

// `${'/' | '/about'}` 与 '/a'+'/about' 字面量拼接等价：占位符是联合 → 结果是所有组合
type Route = `${"/" | "/about"}`;
type _r0 = Expect<Equal<Route, "/" | "/about">>;

const r1: Route = "/about";
// @ts-expect-error - "/home" 不在 Route 的字面量联合里
const r2: Route = "/home";

// ${number} 是「任意数字串」的模式：合法值无限多，但仍是精确类型
type UserRoute = `users/${number}`;
const u1: UserRoute = "users/42";
// @ts-expect-error - 参数段必须是数字字面量
const u2: UserRoute = "users/abc";

// 反向解析：用 infer 把参数段挖出来（得到的是 `${number}` 模式本身）
type RouteParam<R extends string> = R extends `users/${infer Id}` ? Id : never;
type _r1 = Expect<Equal<RouteParam<UserRoute>, `${number}`>>;

// ============================================================
// 二、get/set 前缀方法表：映射类型造对象 + as 重映射造键名
// ============================================================

type Props = { id: number; name: string };

type Getters<T> = {
  [K in keyof T & string as `get${Capitalize<K & string>}`]: () => T[K]; // keyof T & string：Capitalize 只吃 string
};
type Setters<T> = {
  [K in keyof T & string as `set${Capitalize<K & string>}`]: (v: T[K]) => void;
};
type Accessors<T> = Getters<T> & Setters<T>;

const state: Props = { id: 1, name: "ts" };

const acc: Accessors<Props> = {
  getId: () => state.id,
  getName: () => state.name,
  setId: (v) => { state.id = v; },
  setName: (v) => { state.name = v; },
};
const badAcc: Accessors<Props> = {
  getId: () => 1,
  getName: () => "x",
  setId: (v) => void v,
  setName: (v) => void v,
  // @ts-expect-error - 方法表的键由模板字面量精确生成，是 getId 不是 getID（错误恰好落在这一行）
  getID: () => 1,
};

console.log(r1); // /about
console.log(acc.getId(), acc.getName()); // 1 ts
acc.setId(9);
console.log(acc.getId()); // 9

// ============================================================
// 三、EventName → handler 名：泛型收窄让 on('click') 只产出 onClick
// ============================================================

type EventName = "click" | "focus";
type HandlerTable<E extends string> = {
  [K in E as `on${Capitalize<K>}`]: (payload: string) => void;
};

const handlers: HandlerTable<EventName> = {
  onClick: (payload) => console.log("click:", payload),
  onFocus: (payload) => console.log("focus:", payload),
};
console.log(Object.keys(handlers).join(",")); // onClick,onFocus（插入顺序）

// 运行时没有「类型魔法」：键名的大写逻辑必须手写，再用断言对齐回模板字面量类型
function on<E extends EventName>(event: E, cb: (payload: string) => void): HandlerTable<E> {
  const key = `on${event[0].toUpperCase()}${event.slice(1)}`;
  const table = {} as HandlerTable<E>;
  // 泛型键（keyof T 形态）的写入位置会收缩成交叉类型，编译器无法证明 cb 可赋值；
  // 运行时这只是普通对象赋值，借道宽松的 Record 视图完成（又一个「运行时/类型层各行其是」的例子）
  (table as unknown as Record<string, (payload: string) => void>)[key] = cb;
  return table;
}

const clickOnly = on("click", (p) => console.log("click:", p));
// @ts-expect-error - on('click') 的返回类型只有 onClick，没有 onFocus
const noFocus: keyof typeof clickOnly = "onFocus";
console.log(Object.keys(clickOnly).join(",")); // onClick

// ============================================================
// 四、UnionAll：联合拼接（模板占位符的笛卡尔积即「全组合」）
// ============================================================

type UnionAll<A extends string, B extends string> = `${A}-${B}`;
type Combos = UnionAll<"a" | "b", "c" | "d">; // "a-c" | "a-d" | "b-c" | "b-d"
type _u0 = Expect<Equal<Combos, "a-c" | "a-d" | "b-c" | "b-d">>;

const combos: Combos[] = ["a-c", "a-d", "b-c", "b-d"];
// @ts-expect-error - "a-e" 不在笛卡尔积里（B 的联合里没有 e）
const badCombo: Combos = "a-e";
console.log(combos.join("|")); // a-c|a-d|b-c|b-d

// ============================================================
// 五、四个内置字符串操作类型与运行时的对应
// ============================================================

type _s1 = Expect<Equal<Uppercase<"click">, "CLICK">>;
type _s2 = Expect<Equal<Capitalize<"click">, "Click">>;
type _s3 = Expect<Equal<Uncapitalize<"Click">, "click">>;
type _s4 = Expect<Equal<Lowercase<"CLICK">, "click">>;

console.log("click".toUpperCase(), "click"[0].toUpperCase() + "click".slice(1)); // CLICK Click

void r2;
void u2;
void badAcc;
void noFocus;
void badCombo;
