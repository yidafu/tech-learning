---
mdx:
  format: mdx
---
# 18 · 测试：Vitest 基础与 Mock 机制

> 对应大纲：阶段 4 工程化 —— 测试：Vitest 基础（describe/it/expect、mock）

## 学习目标

1. 说清 Vitest 的定位（Vite 驱动、jest 兼容）与 jest 的关键差异
2. 精确区分 `toBe` / `toEqual` / `toStrictEqual` 的判定规则，并构造出能区分三者的用例
3. 掌握 mock 三件套：`vi.fn`（假函数）、`vi.spyOn`（包装+恢复）、`vi.mock`（模块替换）——重点是 `vi.mock` 的 hoisting 原理与 `vi.hoisted` 解法
4. 用 fake timers 把「时间」从测试里剥离，确定性测试 debounce 这类定时器代码

**测试金字塔与单测价值一句话**：金字塔（多单测、少集成、更少 E2E）的本质是反馈成本与置信度的权衡——单测毫秒级、失败定位到函数；E2E 分钟级、失败只知道「页面坏了」。单测的核心价值是**快速回归 + 逼你写出可测（可注入、纯函数化）的代码**。

## 关键概念

### 1）Vitest 是什么

一手依据：Vitest 官方文档《Getting Started》《API》《Mocking》《Vi Utility》。

- Vite 生态的测试框架：直接复用 Vite 的转译管线（esbuild），**TS/ESM 开箱即用**，不配 ts-jest/babel
- API 刻意兼容 jest：`describe/it/expect` 几乎无缝迁移，mock 体系换成 `vi.*`

### 2）组织结构：describe / it / test / skip / only

- `test` 与 `it` 是同一函数的别名；`describe` 分组并形成**作用域嵌套**
- `it.skip` / `describe.skip`：跳过（显示为 skipped）；`it.only`：只跑它（调试用）；`it.todo`：占位
- 危险习惯：`only` 忘删就提交——CI 里会「全绿」，因为别的用例根本没跑（Vitest 对 `only` 有提醒，但别依赖提醒）

### 深入 §2：参数化测试——用数据表替代复制粘贴

同一逻辑要测多组输入输出时，`test.each` / `it.each` 用一张数据表生成一组用例（每个数据一行用例、失败时定位到具体行）：

```ts
// 表驱动：语义对错一目了然，加用例 = 加一行数据
it.each([
  ['十秒内连发', 100, 99, []],      // [名称, a 时刻, b 时刻, 期望]
  ['恰好到点', 100, 100, ['x']],
  ['过点触发', 100, 101, ['x']],
])('防抖：%s', (_name, t1, t2, expected) => {
  expect(simulateDebounce(t1, t2)).toEqual(expected);
});
```

三个实践要点：① 模板占位符 `%s` 把数据织进用例名，失败输出直接可读；② 边界值（恰好相等、差一毫秒）应该成对出现在表里——「小于、小于等于的边界」是定时器/区间类逻辑的主要缺陷带；③ 参数化解决「同构用例」的重复，**不同结构的用例别硬塞进同一张表**（否则测试函数里堆满 if 分支，可读性反而下降）。

### 深入 §2 补：隔离模型——文件级隔离、用例级靠钩子

Vitest 默认把**每个测试文件**跑在独立的 worker 与模块环境里：文件 A 里的 `vi.mock`、模块级状态、全局污染（如改过的 `Date.now`）不会泄漏进文件 B。但**同一文件内的用例之间没有这道墙**——`vi.spyOn` 的残留、fake timers 忘恢复、模块级缓存，都会跨用例传染（这就是「单跑绿、全跑红」经典 flake 的来源）。铁律由此而来：**跨文件靠隔离模型兜底，跨用例靠钩子显式清理**（`beforeEach` 里 mockClear/mockReset、`afterEach` 里 `useRealTimers`）。

### 3）断言匹配器：三个「相等」的差异表

一手依据：Vitest 官方文档《Expect》。

| 匹配器 | 判定规则 | `new Money(100)` vs `{amount:100, currency:'CNY'}` | `{a:undefined,b:2}` vs `{b:2}` |
| --- | --- | --- | --- |
| `toBe` | `Object.is`（引用/值恒等，能区分 `NaN`、`+0/-0`） | 不等（不同引用） | 不等（不同引用） |
| `toEqual` | 递归结构相等；**忽略 undefined 键**；**不比较类（原型）** | **相等** | **相等** |
| `toStrictEqual` | 递归 + **比较原型/类构造器** + **检查 undefined 键** + 稀疏数组 | 不等（原型不同） | 不等（键集合不同） |

推论：对象断言几乎永远不要用 `toBe`（两个字面量永不相等）；需要「防结构漂移」的严格断言（如 API 响应契约）用 `toStrictEqual`；`toEqual` 最常用。实证用例见 `exercises/vitest-basics/calculator.test.ts`（Money 类 + undefined 键双差异构造）。

其他高频：`toThrow(RangeError)` / `toThrow('子串')` / `toThrow(/正则/)`、`toHaveLength`、`toMatchObject`（部分匹配）、`toBeCloseTo`（浮点）。

### 深入 §3：断言面的其余武器

- **`not` 链**：`expect(x).not.toEqual(y)`——所有匹配器都可取反；「相等语义」的三个差异（undefined 键、原型、稀疏数组）在 `not` 下同样成立
- **不对称匹配器（asymmetric matchers）**：`expect.objectContaining({ id: 1 })`、`expect.arrayContaining([1])`、`expect.stringMatching(/user-\d+/)`——只断言「关心的子结构」，其余放行。典型用法是嵌进完整断言里：`expect(result).toEqual({ id: 1, createdAt: expect.any(Date) })`——对时间戳这类不可预测字段用 `expect.any(Date)` 放行，其余字段照常严格比较。注意：不对称匹配器自己是「部分匹配」，别当完整断言用
- **软断言 `expect.soft`**：普通断言失败会立即终止当前用例（后面的断言不执行）；`expect.soft` 收集失败但继续往下走，用例结束时统一报告——适合「一次跑完把所有差异列出来」的场景（如快照式契约核对）。两者返回值都支持后续链式 `.toBe()`，混用时注意 soft 失败不中断这一语义差异

### 4）异步测试

- 测试函数声明为 `async`，直接 `await`；返回的 Promise 由 Vitest 接管，reject 即失败
- `await expect(promise).resolves.toBe(x)` / `.rejects.toThrow(E)`：把 Promise 的终值/拒绝原因变成断言对象（见 calculator.test.ts）
- `waitFor`（来自 `@vitest/utils`/testing-library 惯例）一句话：**轮询重试断言**直到通过或超时，用于「断言的副作用什么时候到达不确定」的异步场景；能确定时优先精确等待

### 深入 §4：异步等待的三档精度

按「副作用到达时机是否确定」选工具，别一律 `waitFor` 兜底：

| 档位 | 工具 | 适用 | 风险 |
| --- | --- | --- | --- |
| 确定时机 | 直接 `await promise` / `await vi.advanceTimersByTimeAsync(n)` | 副作用在可计算的节点到达 | 无——最快且确定 |
| 确定次数的间接等待 | 等一个「完成信号」（`vi.waitFor` + 条件断言、事件 promise） | 到达时机依赖内部队列但终会到达 | 忘了设超时上限会挂死 CI |
| 不确定时机 | `waitFor` 轮询断言 | 与真实时钟/外部资源耦合（集成测试） | 轮询掩盖竞态——通过≠无竞态，只说明「这次跑过去了」 |

`waitFor` 的两个配置直觉：超时要显式给（默认值对 CI 机器速度的假设不可靠）；它内部 flush 微任务，配 fake timers 时用 async 推进配合（`advanceTimersByTimeAsync`），同步推进 + 轮询会互相卡住——「waitFor 卡死」的高频根因是 timers 还在 fake 而推进是同步版。

### 5）钩子与作用域嵌套

`beforeAll/afterAll`（本作用域**一次**）与 `beforeEach/afterEach`（本作用域**每个用例**）：

- 嵌套 describe 时，`beforeEach` 按**外层 → 内层**顺序执行，`afterEach` 反向（内层 → 外层），`beforeAll` 在进入该 describe 时执行一次
- 常见实践：外层 `beforeAll` 造昂贵资源，内层 `beforeEach` 重置状态——每条用例独立（测试间不互相污染是铁律）

### 深入 §5：钩子的 async 与执行语义

- **钩子可以是 async 函数**：返回的 Promise 被 Vitest 等待，reject 视为该钩子失败——`beforeEach(async () => { await seedDb(); })` 是标准写法
- **`beforeEach` 失败的语义**：它承担的是「用例前置条件」，前置条件不满足时**该用例不应执行**——所以钩子失败要显式抛出/返回 rejected Promise，让失败落在钩子上而不是让用例跑出一堆误导性断言错误
- **钩子注册的时序约束**：钩子必须在 `describe` 体执行期同步注册（它要挂进当前作用域）——在 `it` 回调里或异步回调里注册钩子会拿到警告或不生效。「钩子没跑」的第一排查项：注册位置是否在作用域体内同步执行
- **嵌套作用域的账**：外层 `beforeEach` 对内层每个用例都执行一次——利用这一点可以把「重置」放外层，内层只加增量准备；反过来 `afterEach` 内层先跑，正好先清理内层新增的状态再清外层的

### 6）Mock 三件套

一手依据：Vitest 官方文档《Mocking》《Vi Utility》。

**`vi.fn`——可编程假函数**：

```ts
const fn = vi.fn((x: number) => x * 2); // 原始实现
fn.mockReturnValue(1);                  // 固定返回值
fn.mockImplementation((x) => x + 1);    // 替换实现
fn.mockResolvedValueOnce(u);            // 一次性返回值（排队消费）
fn.mock.calls;   // 每次调用的参数快照：[[3], [21]]
fn.mock.results; // 每次调用的结果：[{ type: 'return', value: 42 }]
```

配套断言：`toHaveBeenCalledTimes(n)`、`toHaveBeenCalledWith(args)`、`toHaveBeenNthCalledWith(n, args)`。

**`vi.spyOn(obj, 'method')`——替换 + 可恢复**：把对象方法换成 spy（默认透传调用原实现），可再 `.mockImplementation(...)`；`spy.mockRestore()` 恢复**原始实现**。适合「真对象大部分要保真、个别方法要打桩」。

**`vi.mock('./api.ts', factory)`——模块级替换**，也是最容易踩坑的：

- **hoisting 原理**：vitest 在编译期把所有 `vi.mock(...)` 调用**提升到文件最顶部**、先于所有 `import` 执行。原因：ESM 的 `import` 在模块求值前就已加载依赖，mock 若不先于它执行，被测模块拿到的已是真模块——**「先 mock 后 import」是模块替换的实现前提**
- **推论（高频坑）**：factory 里引用**文件顶层稍后声明的变量**会抛 `ReferenceError: Cannot access 'x' before initialization`（TDZ）——提升后的 factory 执行时，那些 const 还没初始化
- **`vi.hoisted` 解法**：它同样被提升，且保证**先于 `vi.mock` 执行**，其返回值可以在 factory 里安全使用：

```ts
const { mockGetUserById, loadedUsers } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  loadedUsers: [] as Array<{ id: number; name: string }>,
}));
vi.mock('./api.ts', () => ({ default: mockGetUserById })); // factory 引用 hoisted 值：合法
```

- factory 必须提供模块的**完整**导出面（这里 `./api.ts` 只有 default 导出）；类型导入在编译期擦除，不受影响
- 不给 factory 时 vitest 自动 mock：导出变 `vi.fn()`（原实现丢弃）——显式 factory 是更可维护的写法

**两个进阶姿势**：

```ts
// ① partial mock：保留模块其他真实导出，只替换个别成员
vi.mock('./api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, default: vi.fn() }; // User 接口等其他导出保持真实
});

// ② vi.mocked：给「其实是 mock 的导入」补上 mock 属性的类型提示
import getUserById from './api';
vi.mocked(getUserById).mockResolvedValue(alice); // 没有 vi.mocked 则需要 as 断言
```

partial mock 的适用场景：模块里既有纯工具函数又有网络请求，只想打桩后者；全量 factory 会迫使你复述整个导出面，模块一改测试就崩（脆弱测试的来源）。

**清理三兄弟差异**（本工作区 Vitest 5 实证）：

| 方法 | 清调用记录 | 清实现 | 适用 |
| --- | --- | --- | --- |
| `mockClear()` | 是 | 否 | 每个用例后只想清历史 |
| `mockReset()` | 是 | 是——**恢复到 `vi.fn(impl)` 的原始实现**（jest 语义是改成无实现，注意差异） | 彻底复位 |
| `mockRestore()` | 是 | 是——**恢复被 spyOn 替换的原方法** | 只对 spy 有意义 |

### 深入 §6：vi.mock 的作用域、doMock 变体与「为什么不能 spyOn 模块导出」

- **`vi.mock` 是文件级、静态的**：注册发生在提升期（文件顶部），**整个测试文件**内该模块的所有 import 都拿到 mock 版本；不存在「这条用例 mock、下条用例用真模块」的表达方式——需要那种粒度时，拆成两个测试文件（利用文件级隔离）
- **`vi.doMock`（及 `vi.doUnmock`）是它的非提升变体**：不提升、按书写顺序生效，配合**动态 `import()`** 可以做到「先 mock、再加载、逐用例换实现」：

```ts
vi.doMock('./config.ts', () => ({ flag: 'A' }));
const { run } = await import('./feature.ts'); // 此刻加载的 feature 拿到 flag 'A'
vi.doMock('./config.ts', () => ({ flag: 'B' })); // 重新注册，对下次加载生效
const { run: runB } = await import('./feature.ts'); // runB 所在的新实例拿到 'B'
```

代价：放弃静态 import 的提升缓存语义，每个用例要手动 import——所以 `vi.mock` + `vi.hoisted` 仍是默认选择，`doMock` 留给「同一文件内多套 mock 配置」的特殊场景。
- **为什么模块导出不能 `vi.spyOn`**：spyOn 的本质是**改写对象属性**；而 ESM 的导出绑定是只读视图、命名空间对象整体冻结（笔记 16 的机制：规范把 Module Namespace 属性定义为不可写不可配置）——根本挂不上去。这不是 Vitest 的限制而是 ESM 语义，也是 `vi.mock` 必须工作在**模块加载层**（提升到 import 之前拦截）而非运行时打桩的原因。能 spyOn 的对象是「普通对象的方法」：模块内部导出的对象、类的实例、全局对象（`document`、`location`）等
- **自动 mock 与 `__mocks__` 目录**：`vi.mock('./api.ts')` 无 factory 时自动把导出替换为 `vi.fn()`；配合 `__mocks__/api.ts` 可以给模块提供手写 mock 工厂（`vi.mock('./api.ts')` 会自动采用）——手写 factory 内联在测试文件里可读性更好，`__mocks__` 适合多文件共享同一 mock 的场景

### 7）fake timers：测 debounce

一手依据：Vitest 官方文档《API → vi.useFakeTimers / advanceTimersByTimeAsync》。

```ts
vi.useFakeTimers();                    // 接管 setTimeout/clearTimeout/Date 等
log('a'); log('b'); log('c');
await vi.advanceTimersByTimeAsync(99); // 把虚拟时钟拨到 99ms——真实时间只过了微秒
expect(calls).toEqual([]);
await vi.advanceTimersByTimeAsync(1);  // 拨到 100ms：只有 'c' 存活
expect(calls).toEqual(['c']);
vi.useRealTimers();                    // afterEach 里恢复，避免污染其他用例
```

`advanceTimersByTimeAsync` 与同步版 `advanceTimersByTime` 的差别：async 版会在推进过程中 **flush 微任务**，回调里再 `await` 也能等到 settle——测「异步回调的防抖」必须用它。完整实现见 `exercises/vitest-basics/debounce.test.ts`（防抖实现本体在同目录 `debounce.ts`）。

### 深入 §7：fake timers 的配置面与确定性检查

```ts
vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); // 只接管指定的计时 API
vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));                  // 把虚拟时钟锚定到确定时刻
vi.getTimerCount();  // 当前虚拟时钟上还挂着的定时器数量——用例结束前应为 0
vi.useRealTimers();
```

- **`toFake` 的取舍**：全量接管最省心，但会把 `queueMicrotask`、`performance.now` 等一起冻结——只 fake 被测代码用到的 API，可以让无关的异步机制保持真实行为
- **`setSystemTime` 与 `Date.now`**：被接管的 `Date` 读到的是虚拟时钟——「按时间分支」的代码（缓存过期、token 有效期）都能确定性测试；不接管 fake timers 时也可单独用 `setSystemTime` 只锚定时钟
- **`getTimerCount()` 是清理检查器**：用例结束时虚拟时钟上还有挂起的定时器 = 泄漏（要么逻辑漏了 clearTimeout，要么忘了恢复）——把它写进 afterEach 断言是「测试本身也被验证」的廉价手段

### 8）覆盖率 provider 与 jest 差异

- 覆盖率：provider `v8`（V8 原生插桩，快、默认行为略宽松）vs `istanbul`（转译期插桩，慢一点、统计更保守精确）。`--coverage` 即开箱
- 与 jest 差异速查表：

| 维度 | jest | Vitest |
| --- | --- | --- |
| 转译 | babel-jest / ts-jest 配置链 | 复用 Vite/esbuild，零配置 |
| ESM/TS | 历史包袱重（jest 29 的 ESM 仍是实验态） | 原生一等公民 |
| Mock 模块 | `jest.mock` + `babel-plugin-jest-hoist` | `vi.mock` + 自己的 hoist 机制（含 `vi.hoisted`） |
| mockReset 语义 | 清实现（变 undefined） | **恢复 `vi.fn(impl)` 原始实现**（本工作区实证） |
| 运行模型 | 默认多进程 worker | 默认多线程 pool（更省内存） |
| 与 Vite 项目 | 配置两套（jest.config + vite.config） | 与 Vite 共享一套配置 |

### 深入 §8：mock 最小化原则——把边界画在「外部世界」

mock 的成本常被低估：每个 mock 都是**你替依赖写的一份行为假设**，依赖真实行为变了，mock 不会变——测试全绿但生产挂掉，就是 mock 与现实脱节。原则：**mock 边界画在「程序与外部世界的交界」**（网络、时钟、随机数、文件系统、第三方服务），**不要 mock 程序内部的函数**。

- **内部函数 mock 掉 = 把被测单元切碎**：`vi.mock('./utils.ts')` 之后测的不再是「这个函数的正确性」，而是「这个函数在某种假想 utils 行为下的胶水逻辑」——utils 真实行为一变，胶水测试依旧全绿
- **重构脆弱性**：内部 mock 按模块路径寻址，重命名文件/搬目录立刻炸一片测试——测试本该保护重构，反而拦住重构
- **判据一句话**：mock 掉之后，测试失败还能不能阻止你发布坏代码？能，才值得 mock
- **金字塔的落地映射**：本笔记的 vitest 技巧（断言/mock/timers）覆盖单测与轻集成两层；「少而慢」的 E2E 属于另一套工具链（浏览器驱动），mock 策略（网络拦截）也完全不同——不要用单测的 mock 思维套 E2E

## 可运行示例

`npx vitest run exercises/vitest-basics/`，21 个用例全绿，覆盖本笔记全部知识点：

| 文件 | 覆盖 |
| --- | --- |
| `exercises/vitest-basics/calculator.ts` + `calculator.test.ts` | 三相等差异（Money 类/undefined 键）、toThrow、resolves/rejects、嵌套 describe |
| `exercises/vitest-basics/api.ts` + `userService.ts` + `userService.test.ts` | `vi.mock` 工厂 + `vi.hoisted`、`vi.fn` 记录、`vi.spyOn` 恢复、mockReset 语义 |
| `exercises/vitest-basics/debounce.ts` + `debounce.test.ts` | fake timers + `advanceTimersByTimeAsync` 测防抖 |

## 易错点与面试高频

- **`toEqual` 不是深比较的 `toBe`**：它额外**忽略 undefined 键与类信息**——测 API 契约要 `toStrictEqual`，否则 `undefined` 字段悄悄漂移不会被发现
- **对象用 `toBe` 几乎必挂**；反过来验证「同一引用」时 `toBe` 是唯一选择
- **`vi.mock` 工厂里引用外部变量报 TDZ**：先说 hoisting 原理，再给 `vi.hoisted`——面试标准答案
- **`mockClear` / `mockReset` / `mockRestore` 混用**：清理不彻底导致用例间耦合（flake 的头号来源）；`beforeEach` 里选对层级
- **fake timers 忘 `useRealTimers`**：后面所有依赖真实时间的测试全部冻结
- **异步用例忘 return/await**：测试「瞬间通过」但断言从未执行（Vitest 对空 Promise 用例有检测，但显式 await 是纪律）
- 高频面试题：「怎么测防抖/节流」（fake timers）；「模块 mock 的原理」（hoist 到 import 前）；「toEqual 与 toStrictEqual 的两个差异」
- **文件间隔离、用例间靠人**：别把「单文件跑绿」当成「清理做对了」——同文件内 mock/timers/全局污染照样跨用例传染
- **模块导出不能 spyOn**：ESM 命名空间只读（笔记 16 机制），`vi.mock` 是唯一模块级入口——「spyOn 不生效」先确认对象是不是模块导出面
- **`getTimerCount()` 收尾断言**：虚拟时钟上残留定时器 = 泄漏；fake timers 忘恢复的最好检测器
- **不对称匹配器是部分匹配**：`objectContaining` 放行的字段不参与断言——把它当完整断言用会漏检
- **内部函数 mock 掉了测试就失去保护力**：mock 边界画在外部世界（网络/时钟/随机），重命名模块路径导致的大面积 mock 失败正是过度 mock 的信号

## 输出预测题

### 题 1（匹配器判定）

```ts live noInline
class P { constructor(public v: number = 1) {} }
const a = new P();
const b = new P();
const c = { v: 1 };
const d = { v: 1, extra: undefined };
```

判断以下每条断言通过与否：`expect(a).toBe(b)`；`expect(a).toEqual(b)`；`expect(a).toEqual(c)`；`expect(a).toStrictEqual(c)`；`expect(c).toEqual(d)`；`expect(c).toStrictEqual(d)`。

### 题 2（mock hoisting）

```ts
import { createUserService } from './userService';
const fake = vi.fn();
vi.mock('./api.ts', () => ({ default: fake }));
```

上面代码大概率会抛什么错？根因是什么？给出两种修复方式。

### 题 3（清理时序与泄漏诊断）

```ts
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
});

it('调用一次后 100ms 触发', async () => {
  const spy = vi.fn();
  schedule(spy, 100);            // 内部 setTimeout(spy, 100)
  await vi.advanceTimersByTimeAsync(100);
  expect(spy).toHaveBeenCalledTimes(1);
});

it('100ms 内取消则不触发', () => {
  const spy = vi.fn();
  const cancel = schedule(spy, 100);
  cancel();
  // ① 这里直接断言 spy 没被调用，断言可信吗？为什么？
  expect(spy).not.toHaveBeenCalled();
  // ② 怎么写出「确定不再触发」的断言？
});
```

① 第二个用例的断言有什么漏洞？② 给出两种让断言变得确定的方法。③ 整个文件跑完（第三个用例开始前）存在什么泄漏风险？

## 预测题答案

### 题 1 答案

- `expect(a).toBe(b)`：**不通过**——`Object.is`，两个实例是不同引用
- `expect(a).toEqual(b)`：通过——递归结构相同、同类同构
- `expect(a).toEqual(c)`：通过——toEqual **不比较原型/类**，`{v:1}` 结构相同即可
- `expect(a).toStrictEqual(c)`：**不通过**——toStrictEqual 检查类构造器（`P.prototype` ≠ `Object.prototype`）
- `expect(c).toEqual(d)`：通过——toEqual **忽略 undefined 键**
- `expect(c).toStrictEqual(d)`：**不通过**——undefined 键也算键集合差异

### 题 2 答案

抛 `ReferenceError: Cannot access 'fake' before initialization`。根因：vitest 把 `vi.mock` 提升到文件最顶部（先于 `import './userService'` 执行——否则模块早已加载真实现，mock 无从插入），此时 `const fake` 尚未初始化（TDZ）。修复一：`vi.hoisted(() => vi.fn())` 声明 `fake`（它被提升且先于 `vi.mock` 执行）。修复二：不用外部变量，直接在 factory 内部创建 mock 并通过 `vi.mocked(importedFn)` 或在被测模块行为上断言；需要共享引用时用 `import { vi } from 'vitest'` + `vi.mocked(getUserById)` 取回工厂里的那个 mock。（本工作区 `exercises/vitest-basics/userService.test.ts` 采用修复一。）

### 题 3 答案

① **不可信**：此刻只是「还没到 100ms」，定时器还挂在虚拟时钟上——后续任何时间推进都可能触发它。「现在没被调用」不等于「永远不会被调用」，这是时间类断言的经典漏洞（对照笔记 35 题 1 的 drain 陷阱：只看当前状态、不看未来时序）。
② 两种方法：**推进虚拟时钟越过触发点**——`await vi.advanceTimersByTimeAsync(100)`（或同步版，回调纯同步时够用）后断言 `toHaveBeenCalledTimes(0)`；或 **`expect(vi.getTimerCount()).toBe(0)`**——cancel 之后定时器必须已从时钟上摘除，数量归零即是「不可能再触发」的结构性证据（第二种更直接验证了 cancel 的职责）。
③ 泄漏风险有两处：**fake timers 没有 `vi.useRealTimers()`**——`afterEach` 只清了 mock 调用记录，虚拟时钟带进下一个用例，真实时间语义从此冻结（fake timers 忘恢复是全绿假象的高发来源）；第一个用例触发的定时器虽然已消化，但若用例失败在 advance 之前，挂起的定时器同样滞留。修复：`afterEach` 里补 `vi.useRealTimers()`（也可加 `expect(vi.getTimerCount()).toBe(0)` 做守门断言）。

## 延伸阅读

- Vitest 官方文档《API（expect/vi）》《Mocking》《Testing Types》
- jest 官方文档《Expect》——`toStrictEqual` 语义的原始出处（Vitest 兼容其定义）
- 《Testing JavaScript》/ testing-library 常见问题：`waitFor` 的正确用法
- Martin Fowler《Test Pyramid》（martinfowler.com/bliki/TestPyramid.html）
- Vitest 官方文档《Configuration》——文件隔离、clearMocks/restoreMocks 等自动清理开关
- Vitest 官方文档《Mocking → doMock》与《Vi Utility》（setSystemTime/getTimerCount 的完整清单）
- 呼应：`notes/stage-4-engineering/16-modules-esm-cjs.md`（ESM 只读绑定 → spyOn 无法替换模块导出的机制根源）

