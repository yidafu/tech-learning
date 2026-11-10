/**
 * 大纲章节：阶段 3.5 类型系统理论——结构类型（structural typing）与名义化技巧
 * 主题：同形状即兼容、多余属性检查只对「新鲜字面量」生效、参数方向证据、brand 名义化
 * 运行：npx tsx exercises/ts-theory/01-structural-typing.ts
 * 类型校验：npx tsc --noEmit --strict --ignoreConfig --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/ts-theory/01-structural-typing.ts
 *   （--ignoreConfig：TypeScript 7 起，目录里存在 tsconfig.json 时给 tsc 显式传文件必须加它，否则报 TS5112）
 * 预期输出：
 *   1a 结构相同即兼容（类型名无关）: 1 2
 *   1b 成员更多的可赋给更少的: 1 2
 *   2 新鲜字面量触发多余属性检查，先落变量则绕过: 间接 / extra=1
 *   2 函数传参位置同理（传变量不检查多余属性）: 渲染 间接
 *   3 参数逆变：更宽的消费者可顶替更窄的位置
 *      logUnknown 收到: string
 *   4a brand 后运行时仍是普通 number: 1001 2001 1002
 *   4b brand 只认「构造函数」签发的值: user-1001
 */

// ────────────────────────────────────────────────────────────
// 1. 结构类型：类型名无关，形状说了算
//    一手依据：TS Handbook《Type Compatibility》——
//    "TypeScript is a structural type system: types are compatible
//     based on their shape, not their name."
// ────────────────────────────────────────────────────────────
interface Point2D {
  x: number;
  y: number;
}
interface LatLon {
  x: number;
  y: number; // 与 Point2D 名字不同、结构完全相同
}
const pt: Point2D = { x: 1, y: 2 };
const ll: LatLon = pt; // OK：可赋值性只看成员逐一比较，不看声明名
console.log('1a 结构相同即兼容（类型名无关）:', ll.x, ll.y);

interface Point3D {
  x: number;
  y: number;
  z: number;
}
const p3: Point3D = { x: 1, y: 2, z: 3 };
const p2: Point2D = p3; // OK：源「更宽」（多一个 z），目标用不到它——宽度子类型
console.log('1b 成员更多的可赋给更少的:', p2.x, p2.y);

// 反方向不行：pt 缺少 z，成员逐一检查（x、y 都有、z 没有）不通过
// @ts-expect-error - Property 'z' is missing in type 'Point2D'
const missing: Point3D = pt;
// 注意：这行在运行时照样执行（tsx 只转译不查类型），missing 实际是 {x:1,y:2}

// ────────────────────────────────────────────────────────────
// 2. 多余属性检查（excess property check）——结构规则的著名例外
//    它不是「结构兼容」判定的一部分，而是针对对象字面量的额外防御：
//    字面量是「新鲜的」（fresh），拼错属性名大概率是 bug，所以宁可报错。
//    一旦先存进变量，freshness 消失，就回到纯结构规则：多余的成员被忽略。
// ────────────────────────────────────────────────────────────
interface Window1 {
  title: string;
}

// 字面量「直接赋值」给标注类型：extra 不在 Window1 中
// 报错本质是 excess property check（TS2353），而非结构不兼容
// @ts-expect-error - Object literal may only specify known properties
const direct: Window1 = { title: '直接', extra: 1 };

const indirect = { title: '间接', extra: 1 }; // 先落变量：推断为 { title: string; extra: number }
const viaVar: Window1 = indirect; // OK：不再是新鲜字面量，extra 被静默忽略
console.log('2 新鲜字面量触发多余属性检查，先落变量则绕过:', viaVar.title, '/', 'extra=' + indirect.extra);

// 函数调用是「直接赋值」的另一种形态：参数位置的字面量同样触发检查
function render(w: Window1): string {
  return `渲染 ${w.title}`;
}
// 实参字面量同样是 fresh 的，多余属性照拦
// @ts-expect-error - Object literal may only specify known properties
render({ title: 'x', extra: 1 });
console.log('2 函数传参位置同理（传变量不检查多余属性）:', render(indirect));

// ────────────────────────────────────────────────────────────
// 3. 函数参数方向的证据：逆变（完整矩阵见 02-variance.ts）
//    Consumer<A> 能赋给 Consumer<B> 的条件：将来传给 B 的实参都要能安全流进 A——
//    即「源参数要比目标参数更宽」。这就是参数逆变。
// ────────────────────────────────────────────────────────────
type Consumer<T> = (v: T) => void;

const logUnknown: Consumer<unknown> = (v) => console.log('   logUnknown 收到:', typeof v);
const logString: Consumer<string> = logUnknown; // OK：unknown 消费者比 string 消费者宽，顶替它绝对安全
console.log('3 参数逆变：更宽的消费者可顶替更窄的位置');
logString('abc'); // 运行时证明：string 安全地流进了 unknown 参数

const logStrOnly: Consumer<string> = (v) => void v.length;
// 逆变方向不满足：string 消费者接不住 unknown 位（调用方可能传 42）
// @ts-expect-error - Type 'Consumer<string>' is not assignable to type 'Consumer<unknown>'
const unsafe: Consumer<unknown> = logStrOnly;

// 双变的证据（为什么有些代码没被拦）：目标成员用「方法简写」声明 → 参数走双变检查
interface MethodSink {
  sink(x: unknown): void; // 方法简写
}
interface FnSink {
  sink: (x: unknown) => void; // 函数属性
}
const narrowFn = (x: string): void => void x.length;
const toMethod: MethodSink = { sink: narrowFn }; // 编译通过：目标是方法 → 双变（TS 2.6 的兼容性妥协）
// 同样的代码，目标换成函数属性 → strictFunctionTypes 下严格逆变，立刻拦下
// @ts-expect-error - (x: string) => void 不能赋给 (x: unknown) => void
const toFnProp: FnSink = { sink: narrowFn };

// ────────────────────────────────────────────────────────────
// 4. brand 模式：在结构类型系统里「造出」名义类型
//    TS 没有内置 nominal typing，用交叉类型打一个编译期标记即可。
//    运行时零开销：__brand 只存在于类型层，擦除后就是普通 number。
// ────────────────────────────────────────────────────────────
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<number, 'UserId'>;
type OrderId = Brand<number, 'OrderId'>;

// 构造函数是唯一的「签发入口」：用 as 完成一次受控的越狱
const makeUserId = (raw: number): UserId => raw as UserId;
const makeOrderId = (raw: number): OrderId => raw as OrderId;

const uid = makeUserId(1001);
const oid = makeOrderId(2001);
console.log('4a brand 后运行时仍是普通 number:', uid, oid, uid + 1); // 交叉含 number，算术运算照常可用

function userName(id: UserId): string {
  return `user-${id}`;
}
console.log('4b brand 只认「构造函数」签发的值:', userName(uid));

// 下面三行的 @ts-expect-error 是名义化的全部价值——
// 没有它们，UserId 和 OrderId 都是 number，可以随便混用（这正是 bug 的来源）
// （三行运行时都照常执行且无副作用——类型错误只存在于编译期）

// 裸 number 没有 __brand，进不了 UserId
// @ts-expect-error - Type 'number' is not assignable to type 'UserId'
const rawNumber: UserId = 1001;

// __brand 'UserId' 与 'OrderId' 字面量不同：同结构（底层都是 number）也不可互赋
// @ts-expect-error - Type 'UserId' is not assignable to type 'OrderId'
const wrongOrder: OrderId = uid;

// OrderId 不是 UserId：参数位同样被 brand 拦住
// @ts-expect-error - Argument of type 'OrderId' is not assignable to parameter of type 'UserId'
userName(oid);

// 已知弱点：字符串 '__brand' 全局同名会互相兼容；更严格可改用 declare const + unique symbol
