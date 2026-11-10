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

### 3）断言匹配器：三个「相等」的差异表

一手依据：Vitest 官方文档《Expect》。

| 匹配器 | 判定规则 | `new Money(100)` vs `{amount:100, currency:'CNY'}` | `{a:undefined,b:2}` vs `{b:2}` |
| --- | --- | --- | --- |
| `toBe` | `Object.is`（引用/值恒等，能区分 `NaN`、`+0/-0`） | 不等（不同引用） | 不等（不同引用） |
| `toEqual` | 递归结构相等；**忽略 undefined 键**；**不比较类（原型）** | **相等** | **相等** |
| `toStrictEqual` | 递归 + **比较原型/类构造器** + **检查 undefined 键** + 稀疏数组 | 不等（原型不同） | 不等（键集合不同） |

推论：对象断言几乎永远不要用 `toBe`（两个字面量永不相等）；需要「防结构漂移」的严格断言（如 API 响应契约）用 `toStrictEqual`；`toEqual` 最常用。实证用例见 `exercises/vitest-basics/calculator.test.ts`（Money 类 + undefined 键双差异构造）。

其他高频：`toThrow(RangeError)` / `toThrow('子串')` / `toThrow(/正则/)`、`toHaveLength`、`toMatchObject`（部分匹配）、`toBeCloseTo`（浮点）。

### 4）异步测试

- 测试函数声明为 `async`，直接 `await`；返回的 Promise 由 Vitest 接管，reject 即失败
- `await expect(promise).resolves.toBe(x)` / `.rejects.toThrow(E)`：把 Promise 的终值/拒绝原因变成断言对象（见 calculator.test.ts）
- `waitFor`（来自 `@vitest/utils`/testing-library 惯例）一句话：**轮询重试断言**直到通过或超时，用于「断言的副作用什么时候到达不确定」的异步场景；能确定时优先精确等待

### 5）钩子与作用域嵌套

`beforeAll/afterAll`（本作用域**一次**）与 `beforeEach/afterEach`（本作用域**每个用例**）：

- 嵌套 describe 时，`beforeEach` 按**外层 → 内层**顺序执行，`afterEach` 反向（内层 → 外层），`beforeAll` 在进入该 describe 时执行一次
- 常见实践：外层 `beforeAll` 造昂贵资源，内层 `beforeEach` 重置状态——每条用例独立（测试间不互相污染是铁律）

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

## 延伸阅读

- Vitest 官方文档《API（expect/vi）》《Mocking》《Testing Types》
- jest 官方文档《Expect》——`toStrictEqual` 语义的原始出处（Vitest 兼容其定义）
- 《Testing JavaScript》/ testing-library 常见问题：`waitFor` 的正确用法
- Martin Fowler《Test Pyramid》（martinfowler.com/bliki/TestPyramid.html）

