/**
 * 大纲章节：阶段 3.3 类型编程——映射类型（同态/非同态、修饰符加减、as 重映射）
 * 主题：手写 6 个映射工具类型 + as 重映射（键改名 / never 过滤键），全部用赋值兼容性与 @ts-expect-error 自证行为正确
 * 运行：npx tsx exercises/ts-type-programming/01-mapped-types.ts
 * 类型校验：npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-type-programming/01-mapped-types.ts
 * 预期输出：
 * {"title":"learn mapped types"}
 * {"id":1,"title":"a","done":false}
 * {"id":1,"title":"b"}
 * {"x":10,"y":2}
 * {"id":3,"title":"c","done":true}
 * {"get":1,"set":2}
 * 1 ts
 * {"name":"a","email":"b"}
 */

// ============================================================
// 一、被加工的源类型
// ============================================================

interface Todo {
  readonly id: number; // readonly 修饰符
  title: string;
  done?: boolean; // 可选修饰符
}

interface Point {
  readonly x: number;
  readonly y: number;
}

// ============================================================
// 二、手写工具类型（与 lib.es5.d.ts 官方实现逐字一致）
// ============================================================

// 同态映射：叠加 ?（等价 +?），readonly 原样复制——Partial 保留 readonly 的全部原理
type MyPartial<T> = { [K in keyof T]?: T[K] };

// 同态映射：-? 摘掉可选，readonly 原样复制
type MyRequired<T> = { [K in keyof T]-?: T[K] };

// 同态映射：+readonly（裸写 readonly 即加法）
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// 同态映射：-readonly 摘掉只读（官方未收录 Mutable，这是社区约定实现）
type MyMutable<T> = { -readonly [K in keyof T]: T[K] };

// K 的约束是 keyof T → 仍按同态处理，保留 readonly/?
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

// 非同态映射：K 与任何 keyof T 无关，产物一律必有、可写
type MyRecord<K extends keyof any, T> = { [P in K]: T };

// ============================================================
// 三、用赋值兼容性自证行为（tsc 严格模式逐条验证）
// ============================================================

// MyPartial：全部可省（含原本 readonly 的 id）
const partialTodo: MyPartial<Todo> = { title: "learn mapped types" };

// MyRequired：done 变为必有
const requiredTodo: MyRequired<Todo> = { id: 1, title: "a", done: false };
// @ts-expect-error - MyRequired 用 -? 摘掉了 done 的可选性，缺 done 必须报错
const missingDone: MyRequired<Todo> = { id: 1, title: "a" };

// MyReadonly：title 也不可写了（运行时 tsx 不查类型，赋值照常执行——类型错误 ≠ 运行时报错）
const ro: MyReadonly<Todo> = { id: 1, title: "b" };

// MyMutable：readonly 的 Point 变可写
const point: MyMutable<Point> = { x: 1, y: 2 };
point.x = 10; // OK：-readonly 生效

// MyPick：只保留选中的键，且保留修饰符
const picked: MyPick<Todo, "id" | "title"> = { id: 3, title: "c" };
// @ts-expect-error - MyPick 的结果里没有 done 属性
picked.done = true; // ← 类型世界报错，但运行时照样执行：tsx 只转译不查类型，
//                    所以底部打印的 picked 实际多了 done:true——这正是「类型只存在于编译期」的实证

// MyRecord：键联合里的每个键都必须提供
const rec: MyRecord<"get" | "set", number> = { get: 1, set: 2 };
// @ts-expect-error - MyRecord<"get" | "set", number> 缺 set 报错
const missingKey: MyRecord<"get" | "set", number> = { get: 1 };

// ============================================================
// 四、as 重映射之一：键改名 `get${Capitalize<K>}`
// ============================================================

type Getters<T> = {
  // keyof T & string：把键收窄成 string（Capitalize 只接受 string）；as 重映射仍是同态映射
  [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K];
};

const getters: Getters<{ id: number; name: string }> = {
  getId: () => 1,
  getName: () => "ts",
};
// @ts-expect-error - 键名是 getName 而不是 getname：Capitalize 精确到首字符大小写
const badGetters: Getters<{ id: number; name: string }> = { getId: () => 1, getname: () => "ts" };

// ============================================================
// 五、as 重映射之二：用 never 过滤键（只留值类型为 string 的属性）
// ============================================================

type OnlyStringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  email: string;
}

const onlyStrings: OnlyStringKeys<Mixed> = { name: "a", email: "b" };
// @ts-expect-error - id 的值类型是 number，键 id 已被映射到 never 丢弃
const badFilter: OnlyStringKeys<Mixed> = { id: 1, name: "a", email: "b" };

// ============================================================
// 六、打印（对照顶部「预期输出」）
// ============================================================

console.log(JSON.stringify(partialTodo));
console.log(JSON.stringify(requiredTodo));
console.log(JSON.stringify(ro));
console.log(JSON.stringify(point));
console.log(JSON.stringify(picked));
console.log(JSON.stringify(rec));
console.log(getters.getId(), getters.getName());
console.log(JSON.stringify(onlyStrings));

// ro.title = "c"; ← 这行会触发类型错误（MyReadonly），故只留在上面注释示例里；运行时其实可以执行
void ro;
void missingDone;
void picked;
void rec;
void badGetters;
void badFilter;
