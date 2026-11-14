---
mdx:
  format: mdx
---
# 09 · TypeScript 类型收窄（Narrowing）

> 对应大纲：阶段 3.1「基础与类型收窄」
> 配套练习：`exercises/ts-narrowing/01-narrowing-basics.ts` ~ `04-assertion-and-satisfies.ts`

## 学习目标

1. 能讲清「窄化发生在哪一层」：它是 TS 编译器对控制流的分析，**不是运行时存在的机制**
2. 掌握五类原生收窄（typeof / truthiness / 相等性 / in / instanceof）各自的适用面与坑
3. 会写自定义类型谓词 `x is T` 与断言函数 `asserts x is T`，并说清两者差别
4. 会用可辨识联合 + `assertNever` 做穷尽性检查，理解「新增 case 编译器逼你改」的机制
5. 分清 `as` / 双重断言 / `as const` / `satisfies` / 非空断言 `!` 的语义与风险梯度
6. 建立 `unknown` 的使用纪律：先收窄，再使用

## 关键概念

### 1. 窄化的本质：控制流分析，不是运行时机制

一手依据：TS Handbook《Narrowing》开篇——"TypeScript only allows an operation if the type is known to support it... narrow the type down to something more specific"。

- 声明 `let x: string | number` 之后，`x` 的「声明类型」始终是 `string | number`；但在代码的**每个位置**，编译器会根据「到这个位置为止发生了什么」计算一个更精确的「收窄类型」
- 两类输入参与计算：
  - **assignment analysis（赋值分析）**：`let x: string | number = 'a'` 之后、下一次赋值之前，`x` 是 `string`。赋值也会把联合收窄到单个成员——练习 03 的证据函数因此必须把 `s` 声明成参数而不是 `const s: NotDiscriminated = {...}`，否则赋值收窄会让「tag 无法收窄」的报错消失
  - **流敏感（flow-sensitive）分析**：`if` / `switch` / `return` / 循环 / `&&` `||` `??` 等控制流结构，把联合切成「这个分支里还剩哪些成员」
- **窄化只发生在类型系统里**：编译成 JS 后没有任何 `if (typeof x === 'number')` 之外的产物——那个 `if` 本来就是你写的代码；TS 做的只是「顺着你的 if 推理类型」。运行时的值从来不会因为窄化而改变
- 也因此窄化是**保守的**：编译器只在「所有路径都成立」时才收窄。收窄错了顶多让代码啰嗦（再判一次），不会运行时错误；反之，绕过窄化（`as`、`!`）才是运行时事故的来源

一行行走读「到每个位置时 x 的收窄类型」：

```ts live noInline
function f(x: string | number | null): string {
  //            x: string | number | null（声明类型）
  if (x === null) {
    //        x: null
    return 'null';
  }
  //          x: string | number（return 排除了 null 路径）
  if (typeof x === 'number') {
    //      x: number
    return x.toFixed(0);
  }
  //          x: string（只剩最后一个成员）
  return x.toUpperCase();
}
```

赋值分析示例：`let y: string | number = 'a'` 之后、下一次赋值前，`y` 按收窄类型 `string` 用；
`y = 1` 之后变成 `number`。窄化信息跟着赋值走，这是「流敏感」的另一面。

### 2. typeof 守卫与 `typeof null === 'object'` 陷阱

一手依据：Handbook《Narrowing》`typeof` type guards 一节；ECMA-262《The typeof Operator》返回表。

- `typeof x === 'number' | 'string' | 'boolean' | 'bigint' | 'symbol' | 'object' | 'function' | 'undefined'` 八种结果对应切分联合
- 陷阱：ECMA-262 规定 `typeof null === 'object'`（历史包袱：早期实现里 null 与对象共用标签位，规范为兼容固化了它）。后果：
  - `typeof x === 'object'` **不能排除 null**。对 `x: Date | null`，进入该分支后 `x` 仍是 `Date | null`，直接 `x.toISOString()` 报 `'x' is possibly 'null'`
  - 正确姿势：`typeof x === 'object' && x !== null`，或者干脆只用 `x !== null`
- 反向利用：对 `x: string | null`，`typeof x === 'object'` 的分支里 `x` 恰好只剩 `null`（string 的 typeof 是 'string'）

### 3. truthiness 收窄：`if (x)` 切的是 ToBoolean，不是「有没有值」

一手依据：Handbook《Narrowing》Truthiness narrowing；ECMA-262 ToBoolean 语义。

- `if (x)` 之后，`null` / `undefined` 被排除；但 `''`、`0`、`NaN` 在**运行时**同样进不了 then 分支，而**类型上**无法表达「非空 string」「非零 number」——所以 else 分支里 `string | number` 都还在
- 直接后果（高频 bug）：`name || '游客'` 会把空字符串当「没有值」吞掉；语义上只想兜 null/undefined 时必须用 `??`（TS 3.7）
- 类型系统对 truthiness 的表达能力有限是「保守收窄」的典型例子：宁可保留宽类型，不编造不存在的「非空 string」类型

### 4. 相等性收窄：`===` / `!==` / switch 对字面量与空值的切分

一手依据：Handbook《Narrowing》Equality narrowing。

- `x === null`（或 `=== undefined`）把 `null` 从联合中切掉；`switch` 是相等性收窄的语法糖，每个 `case` 分支按字面量收窄
- 字面量成员收窄后是**它自己**：`s: 'idle' | 'loading'` 在 `case 'idle'` 里就是 `'idle'`，赋给 `'loading'` 类型的变量会报错（这本身就是收窄证据，见练习 01 的 icon）
- `==` 也能触发收窄（Handbook 有 `looseEquals` 示例），但工作区代码一律 `===`，此处仅作知识完备

### 5. 别名条件与收窄的边界（TS 4.4 / TS 5.4）

一手依据：TS 4.4 发布说明《Control Flow Analysis of Aliased Conditions and Discriminants》（PR #44730）；TS 5.4 发布说明《Preserved Narrowing in Closures Following Last Assignments》。

- **别名条件也认**：把判断存进 const 再 if，TS 4.4 起同样收窄——

  ```ts
  const isString = typeof x === 'string';
  if (isString) {
    return x.length; // x: string，OK
  }
  ```

- **闭包里的 let 收窄会丢**：回调可能在任何时刻执行，期间变量可能被重新赋值，TS（5.4 前）在闭包里一律回退到声明类型——

  ```ts
  let v: string | number = 'a';
  const cb = () => v.length; // 报错：v 在闭包里回退为 string | number
  v = 1;
  ```

- **TS 5.4 的改进**：若变量在「最后一次赋值之后」才被闭包捕获，收窄得以保留（上例把 `v = 1` 挪到 cb 定义之前就合法）
- **数组元素不保留收窄**：`arr[0] === 'a'` 之后下一行 `arr[0]` 又回到原类型（任何函数调用都可能改数组），对象属性收窄则通常保留（TS 假设无副作用时的保守规则）

### 6. in 收窄：按「声明里有没有这个属性」切分

一手依据：Handbook《Narrowing》The `in` operator narrowing。

- `'meow' in animal`：联合中**完全没有**声明 `meow` 的成员被排除（如 `Dog`）；声明了 `meow` 的成员（含可选）留在分支里
- 可选属性的边界：`'tag' in x` 为真时，`x.tag` 的类型**仍是** `number | undefined`，不会因 in 变成必有——因为「声明里有」和「运行时对象上有」是两回事
- 运行时 gap：`{ kind: 'fileA' }`（tag 可选且未写）在运行时 `'tag' in x` 为 false，会走进「else」分支——TS 认为那里只剩 fileB。所以 else 分支里不要反向依赖成员访问，否则类型对了运行时也可能错（练习 01 的 readTag 专门演示）

### 7. instanceof 收窄：原型链查询

一手依据：Handbook《Narrowing》`instanceof` narrowing；ECMA-262 `instanceof` 运算符（沿 `[[GetPrototypeOf]]` 链查找 `RightHandSide.prototype`）。

- `x instanceof Date` 为真的分支里 `x: Date`；假分支里被排除
- 右侧必须是「有 `prototype` 的构造函数」；左侧 narrowing 到「该构造函数的实例类型」（TS 通过查找构造函数的返回类型 `InstanceType<typeof C>` 确定）
- 跨 realm 限制（一句话）：另一个 iframe / worker / `vm` 上下文里的对象的原型链挂在**那个 realm 的**构造函数上，跨 realm `instanceof` 得 false——判断普通对象建议 `typeof` + 结构检查或自定义谓词

### 8. 自定义类型谓词 `x is T`：把收窄能力「声明」出来

一手依据：Handbook《Narrowing》Using type predicates。

- 签名要求：`function isFish(pet: Fish | Bird): pet is Fish`——谓词里的参数名（`pet`）**必须对应**函数的某个参数，TS 靠它知道「返回真时收窄的是哪个变量」
- 与普通 `boolean` 返回的差别：`if (isFish(pet))` 分支里 `pet: Fish`；`if (isFishBoolean(pet))` 分支里 `pet: Fish | Bird`——返回 `boolean` 的函数对编译器只是个条件，不构成收窄证据（练习 02 有并排对照）
- **危险点：TS 只信任谓词声明，完全不验证函数体逻辑**。谓词写反（声明 `pet is Fish`、逻辑测的是 `fly`）照样编译通过，调用点会按 Fish 收窄、运行时炸 `TypeError`。守卫函数必须「声明与逻辑一致」，评审时重点看这类函数
- 函数体内没有特权：访问尚不确定的成员仍需 `as` 一次（`(pet as Fish).swim`），这是谓词的「实现成本」

### 9. 断言函数 `asserts x is T` / `asserts val`

一手依据：TS 3.7 发布说明《Assertion Functions》（PR #32623）；Handbook《Narrowing》Assertion functions。

- 语义差别（与谓词对比记忆）：
  - 谓词函数：`if (isFish(pet)) {...}` —— 只在**为真的分支内**收窄，失败路径由你处理
  - 断言函数：`assertIsFish(pet)` —— **调用点之后的全部代码**视为已收窄；不成立就 throw，失败路径不存在
- 两种形态：
  - `asserts value is string`：把参数收窄到 T（含泛型版 `asserts value is T`，可把 `T | null | undefined` 断成 `T`）
  - `asserts condition`（`asserts val`）：断言「传入的条件为真」，并按条件表达式收窄——`assertTrue(x !== null)` 之后 `x: string`
- 限制（TS 3.7 至今）：断言函数必须有显式 `asserts` 签名；用变量/箭头函数持有断言函数时，该变量需要显式类型注解，否则调用点不认
- 适合场景：参数校验、测试断言、内部不变量（「走到这里说明已经校验过」）；不适合可能「合法为空」的业务分支——那是谓词或联合的场合

### 10. 可辨识联合（discriminated union）与穷尽性检查

一手依据：TS 2.0 发布说明《Tagged union types》（PR #9163）；Handbook《Narrowing》Discriminated unions 与 The `never` type。

- discriminant（tag）的要求：每个成员在**同一字段**上是**不同的字面量**（string / number / boolean 字面量均可；`{ ok: true } | { ok: false }` 也算）。字段是宽 `string` 时无法分辨——`case 'circle'` 排除不了任何成员，分支里还是整个联合（练习 03-discriminated-union.ts 第 5 节的 `NotDiscriminated`）
- switch 对 tag 收窄后，每个 case 里是单个成员，成员专属字段可安全访问
- **穷尽性检查（assertNever 模式）**：

  ```ts
  function area(s: Shape): number {
    switch (s.kind) {
      case 'circle': return Math.PI * s.radius ** 2;
      case 'square': return s.side ** 2;
      case 'rectangle': return s.width * s.height;
      default: {
        const exhaustive: never = s; // 处理完所有成员后 s 是 never，赋值合法
        return assertNever(exhaustive);
      }
    }
  }
  ```

- 「新增 case 时编译器逼你改」的机制：给 `Shape` 加 `{ kind: 'triangle'; ... }` 后，所有走这个模式的函数的 default 分支里 `s` 变成 `triangle`（不再是 `never`），`const exhaustive: never = s` 立刻报 `Type '{ kind: "triangle"; ... }' is not assignable to type 'never'`——**报错点就是漏处理的点**，不需要靠运行时测试去撞
- 穷尽性不写 default 时，TS 也能用「函数缺返回值」间接提示，但 assertNever 模式把提示变成硬错误 + 运行时兜底，是更稳的工程实践

### 11. 断言家族：as / 双重断言 / as const / satisfies / 非空断言 !

一手依据：Handbook《Typescript for JavaScript Programmers》与《Narrowing》；TS 3.4 发布说明《const assertions》（PR #29510）；TS 4.9 发布说明《The satisfies Operator》（PR #47920）。

- **`as T` 是单向信任**：编译器「信你一次」，不做运行时检查。`raw as number` 编译通过，运行时 `raw` 可能是 string，随后 `.toFixed` 炸（练习 04 的翻车现场）。as 的合法面：收窄（`unknown` → 具体类型、联合 → 成员）——即「断言成声明类型的子集」基本安全；「断言成不相关的类型」会被 TS 拒绝（报 2352），这恰恰是保护
- **双重断言 `as unknown as T`**：先擦成 `unknown` 再装回去，绕过 2352 的重叠检查。合理场景基本只有一个——第三方 `.d.ts` 声明错了/窄了，改不了声明又确知运行时形态时的过渡手段；能改类型就改类型，能校验就加运行时校验
- **`as const`（TS 3.4）**：让字面量「不宽化」+ 对象/数组变 readonly：`['red','green'] as const` 是 `readonly ["red","green"]`，`{ port: 443 } as const` 的 `port` 是 `443` 而非 `number`
- **`satisfies T`（TS 4.9）**：校验表达式满足 T，但**保留表达式自己的推断类型**，不像注解那样把属性定型为注解类型：
  - `const a: Theme = { home: '/' }` 后 `a.home: '/' | '/login'`（注解类型，宽度丢了）
  - `const b = { home: '/' } satisfies Theme` 后 `b.home: '/'`（校验过了，字面量留住）
  - 边界：`satisfies` 不等于 `as const`——数字属性仍按常规推断为 `number`（`{ retries: 3 } satisfies Theme` 的 retries 是 number 不是 3）；要「校验 + 全字面量」用 `as const satisfies Theme` 组合
  - 注意对象属性的字符串字面量：只有当注解类型本身含字面量（如 `'/' | '/login'`）时 satisfies 才保留 `'/'`；对 `Record<string, string>` 这种宽上下文，属性自然推断本来就是 string，保留字面量要靠 `as const`（练习 04 有三组对照）
- **非空断言 `!`**：`map.get(k)!` 把 `| undefined` 从类型里抹掉。编译期零成本、运行时零保障——undefined 会静默扩散（算术出 NaN、链式取值 TypeError）。优先 `??`、`?.`、显式判断；`!` 只用在「类型上不可能、编译器无法证明」的地方

### 12. unknown 的收窄路径

一手依据：TS 3.0 发布说明《`unknown` type》（PR #24439）；Handbook《Narrowing》unknown 与 any 的对比。

- `unknown` = 「任何值都可能，但用之前必须先证明」。它是 `any` 的类型安全版本：`any` 双向豁免检查，`unknown` 上取任何成员直接报 `'value' is of type 'unknown'`
- 收窄路径与普通联合一致：`typeof` → `instanceof` → `Array.isArray` → 自定义谓词，一路下去类型逐步具体化：`unknown` → `object` → `Map` / `any[]` → 成员可访问
- 工程纪律：外部输入（`JSON.parse`、fetch、postMessage、第三方 SDK）一律先落 `unknown`，再用守卫/校验函数收窄成具体类型；`any` 只允许出现在「正在还债」的迁移代码里

## 可运行示例

四个练习文件（顶部注释含精确预期输出，先预测再运行对照）：

| 文件 | 覆盖 | 关键输出 |
| --- | --- | --- |
| `exercises/ts-narrowing/01-narrowing-basics.ts` | 五类原生收窄 | `typeof` 排不掉 null 的报错原文；`greet('')` 中 `||` 吞 `''`、`??` 保留 |
| `exercises/ts-narrowing/02-type-guards.ts` | 谓词 / boolean 对照 / asserts / unknown | 谓词写反后 `TypeError: bird.swim is not a function` 的翻车现场 |
| `exercises/ts-narrowing/03-discriminated-union.ts` | 可辨识联合 / assertNever | 漏 case 时 `Type '{ kind: "triangle"; ... }' is not assignable to type 'never'` |
| `exercises/ts-narrowing/04-assertion-and-satisfies.ts` | as / 双重断言 / as const / satisfies / ! | `as number` 运行时 `TypeError`；satisfies 与注解的字面量宽度对照 |

运行与校验（在工作区根目录）：

```bash
npx tsx exercises/ts-narrowing/01-narrowing-basics.ts
npx tsc --noEmit --ignoreConfig --strict --target es2022 --module esnext \
  --moduleResolution bundler --lib es2022,dom exercises/ts-narrowing/01-narrowing-basics.ts
```

> tsc ≥ 7 的注意：命令行指定单文件且当前目录有 `tsconfig.json` 时报 TS5112，需加 `--ignoreConfig`（tsc 5.x 不需要）。文件里所有 `@ts-expect-error` 都带了报错原文——把它临时删掉再跑 tsc，就能亲眼看到这条错误。

最小对照示例（谓词 vs 断言函数）：

```ts live noInline
// 谓词：只影响为真的分支
function isFish(pet: Fish | Bird): pet is Fish {
  return typeof (pet as Fish).swim === 'function';
}

// 断言函数：影响调用点之后的所有代码
function assertIsFish(pet: Fish | Bird): asserts pet is Fish {
  if (!isFish(pet)) throw new Error('不是鱼');
}

function feed(pet: Fish | Bird): string {
  assertIsFish(pet);       // 之后 pet: Fish
  if (isFish(pet)) { /* 这里也是 Fish */ }
  return pet.swim();
}
```

## 易错点与面试高频

1. **「窄化是运行时机制吗？」**——不是。它是编译器顺着控制流对变量类型的推理；产物里没有任何窄化痕迹。面试标准答法：声明类型不变，各位置有「收窄类型」，依据是赋值分析 + 流敏感分析
2. `typeof x === 'object'` 排不掉 null（ECMA-262 规定 `typeof null === 'object'`），需配 `x !== null`
3. `x || default` 会吞 `''` / `0` / `NaN`；只兜空值用 `x ?? default`
4. `in` 收窄对**可选属性**不生效：分支里属性仍是 `T | undefined`，且运行时可选属性可能真的不存在
5. 谓词写错编译器不负责：`x is T` 是声明不是验证；守卫函数是评审重点
6. 谓词 vs 断言函数：分支内收窄 vs 调用点之后全收窄（后者失败即 throw）
7. 可辨识联合的 tag 必须是字面量；宽 `string` 字段无法收窄
8. assertNever 模式的价值：新增联合成员时，漏改的 switch 在编译期暴露，而不是运行时 `undefined` 满天飞
9. `as` 可能是谎言（编译通过、运行时炸）；双重断言只用于改不了的声明；`satisfies` 校验而不加宽（TS 4.9）；`as const` 保字面量 + readonly；`!` 零保障
10. `unknown` vs `any`：unknown 强制先收窄，any 双向豁免——外部输入一律 unknown

## 输出预测题

先自己写出答案，再运行验证（不许先看文末答案）。

**题 1**：不运行代码，回答三问。

```ts live noInline
function f(x: string | null): number | string {
  if (typeof x === 'object') {
    return 'object!';
  }
  return x.length;
}

console.log(f(null));
console.log(f('hi'));
```

1. `return x.length` 这一行，tsc 报不报错？为什么？
2. `if` 为真的分支里，`x` 的收窄类型是什么？
3. 两行 console.log 分别输出什么？

**题 2**：判断输出与编译结果。

```ts live noInline
function greet(name: string | null, count?: number): string {
  const a = name || 'anon';
  const b = count ?? 10;
  const c = count || 10;
  return `${a}/${b}/${c}`;
}
console.log(greet('', 0));

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; a: number };
function label(s: Shape): string {
  switch (s.kind) {
    case 'circle':
      return `c:${s.r}`;
    default: {
      const rest: never = s; // ← tsc 对这一行报不报错？
      return `s:${(rest as { a: number }).a}`;
    }
  }
}
console.log(label({ kind: 'square', a: 2 }));
```

1. `greet('', 0)` 输出什么？
2. `const rest: never = s;` 报不报错？如果报，报错信息是什么类型层面的事实？

## 预测题答案

**题 1**

1. 不报错。`x: string | null`，`typeof null === 'object'` 而 `typeof 'hi' === 'string'`；`typeof x === 'object'` 为真的分支只剩 `null`，为假的分支（排除法）只剩 `string`，所以 `x.length` 合法
2. `null`（不是 object 类型——联合里没有 object 成员，`'object'` 只匹配到 null）
3. `object!` 和 `2`

**题 2**

1. `anon/0/10`：`''` 和 `0` 都是 falsy，`||` 把它们换成默认值；`??` 只兜 `null` / `undefined`，`0` 被保留
2. 报错。switch 只处理了 `circle`，default 分支里 `s` 的收窄类型是 `{ kind: 'square'; a: number }` 而不是 `never`，赋给 `never` 报 `Type '{ kind: "square"; a: number; }' is not assignable to type 'never'`——这正是 assertNever 模式用来抓漏 case 的机制

## 延伸阅读

- TS Handbook · Narrowing（一手主线，本文大部分术语的出处）：[https://www.typescriptlang.org/docs/handbook/narrowing.html](https://www.typescriptlang.org/docs/handbook/narrowing.html)
- TS Handbook · Functions（函数签名、可赋值性背景）：[https://www.typescriptlang.org/docs/handbook/functions.html](https://www.typescriptlang.org/docs/handbook/functions.html)
- ECMA-262 · The typeof Operator（typeof null === 'object' 的一手依据）：[https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-typeof-operator)
- TS 3.7 Assertion Functions（断言函数引入）：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html)
- TS 3.4 const assertions（as const 引入）：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html)
- TS 4.9 satisfies Operator：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- TS 2.0 Tagged union types（可辨识联合引入）：[https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html)
- 下一笔记：`notes/stage-3-ts-types/10-ts-generics.md`（阶段 3.2 泛型深入）

---

## 机制深一层：控制流分析的五条实测边界

正文 §1 到 §5 给了收窄的模型与主要特性，这一节把「模型在哪些地方停下来」用本机 tsc 5.9.3（`--strict`）实测刻度尺量出来。每条边界先给最小实验形态，再给实测结果——全部真跑过，命令同正文可运行示例一节。

**边界一：函数调用不擦属性收窄，赋值才擦。** 对属性收窄最常见的担忧是「中间隔了个函数调用会不会失效」。实测：不会。

```ts
type P = { x: string | number };
function take(o: P): void { void o; }
function f(o: P): void {
  if (typeof o.x === 'string') {
    take(o);        // 把整个对象递给别的函数
    o.x.length;     // 实测：无报错——收窄仍在
  }
}
```

真正擦掉收窄的是对属性本身的赋值：同一段代码把 `take(o)` 换成 `o.x = 1`，下一行立刻报 TS2339（`Property 'length' does not exist on type 'number'`）。可选属性的 truthiness 收窄同样跨调用存活（`if (q.s)` 之后隔一个调用再访问 `q.s.length` 无报错）。这条边界让「先判后用」的直列代码可以放心写；危险只来自赋值，而赋值在你的代码里，不在被调函数的黑盒里。

**边界二：闭包回退看「最后一次赋值」与「作用域」两个条件。** 正文 §5 说 TS 5.4 起「最后赋值之后再创建闭包则收窄保留」，实测补两个精度点：

1. 判定只看**变量自己的**最后一次赋值：闭包创建在最后一次赋值之后 → 保留；创建之后还有赋值 → 丢失，回退到联合（TS2339）；
2. 这条规则**在函数体与模块顶层有效，在全局脚本顶层无效**：同样的 `let t: string | number = 'a'; t = 'b'; const cb = () => { t.length; }`——放进函数体或带 `export {}` 的模块顶层都通过，放在无 export 的脚本顶层却报 TS2339。脚本顶层的 let 是真全局，任何其他脚本都可能插一句赋值，分析器对它一律保守。把顶层实验代码包进函数，是让 5.4 规则生效的最简单办法。

**边界三：元素访问收窄看索引稳定性。** TS 4.7 起对带方括号的元素访问做控制流分析（Release Notes 小节 "Control-Flow Analysis for Bracketed Element Access"）。实测边界：

- 字面量或 const 索引 + const 数组：收窄成立，且**跨调用存活**——`typeof arr[0] === 'string'` 之后隔一句 `arr.push('d')`、甚至把数组递给别的函数，再访问 `arr[0].length` 都不报错；
- `let` 索引：即使从未重新赋值，收窄也不成立（`typeof arr[i] === 'string'` 之后的 `arr[i].length` 报 TS2339）。

分析器的立场可以概括成一句话：它信任「不可再赋值的绑定」，其余一律按可能被改写处理——宁可让你少一层保护，也不为不稳定的索引冒险。

**边界四：try / catch 是「状态回退 + 出口汇流」。** 实测三连：

```ts
let x: string | null = null;
try {
  x = 'abc';
} catch {
  x.length;            // 实测 TS18047: 'x' is possibly 'null'
}
console.log(x.length); // 实测 TS18047 同样报错
```

catch 子句里 x 回退到**声明类型** `string | null`——try 内任何一行都可能抛出后跳进 catch，抛出点之前的赋值不保证发生过。try/catch 整体走完后，控制流是「try 正常出口」与「catch 出口」两股汇流：前者 x 是 string，后者是 `string | null`，汇流取并集，所以最后一行照样 possibly null。catch 不是「重新判断一次」的地方，是回到最宽状态的地方。

**边界五：赋值分析只作用于局部绑定，强度足以收窄到 never。** 两个实测形态：

```ts
let x: string | null = null;
if (x !== null) {
  x.length; // 实测 TS2339: Property 'length' does not exist on type 'never'
}
```

初值是 null，赋值分析把 x 收窄成 null；`x !== null` 为真的分支里「只能是 null 却要求非 null」，集合为空，即 never。报错信息里的 never 就是赋值分析的直接证据。对照：把同样的判断写进函数、对**参数**做 `if (v !== null)`，分支里一切正常——参数没有「已知的初始赋值」，不参与赋值分析。正文说练习 03 的证据函数必须把 s 声明成参数，根子就在这条边界：const 声明的字面量对象会让赋值分析直接钉死收窄结果，实验就失效了。

顺带一条 TS 4.4 的实证补充：别名条件与别名判别式同样生效——`const isStr = typeof w === 'string'` 之后 `if (isStr)` 收窄成立；`const k = s.kind` 之后 `switch (k)` 对 s 按 tag 收窄也成立（均实测无报错）。把判断抽成 const 不是收窄的敌人，只要抽的是 const 而不是 let。

## 工程三陷阱：收窄失效的三种事故形态

**陷阱一：收窄是「位置属性」，跨函数不传递。** 触发场景：调用方写了 `if (isUser(u))` 再把 u 传给 `processUser(u)`，而 `processUser` 的参数声明是宽类型（User 与 Guest 的联合），函数体里直接按 User 用——函数体内编译报错，有人顺手把参数改成宽类型加 `as`，或把外层判断删了。根因：收窄绑定在具体代码位置的控制流上，函数边界把类型还原成声明类型；调用点的收窄救不了函数体内部。规避：参数类型直接声明成收窄后的窄类型，让「没判就调」在调用点报错；确需宽进严出的，helper 内部第一行先收窄（`if (!isUser(u)) return` 或断言函数）。`Array.prototype.filter` 配谓词能把**结果数组**的元素类型收窄而原数组不变（实测：`mixed.filter((x): x is string => ...)` 的返回是 `string[]`，`mixed[0]` 仍是 `string | number`），是「想要收窄后的集合」时最干净的写法。

**陷阱二：`in` 检查可选字段造成分支错位、静默吞数据。** 触发场景：接口演进取消了 tag 必填（`tag?: string`），旧数据没有 tag 字段。代码里 `if ('tag' in x)` 想分流新旧格式——旧数据全部走 else 分支，被当成新格式处理，字段全 undefined；类型全程绿色。根因有两层：其一（实测），`'tag' in o` 为真时 `o.tag` 仍是 `string | undefined`（TS18048 possibly undefined）——in 只证「声明里有」，不证「此刻必有值」；其二，in 为假也不证「值一定缺」——可选字段可以存在于对象上而值为 undefined，运行时 in 看的是键在不在。两层 gap 叠起来，「用 in 猜版本」的代码两头都不牢。规避：判别字段永远必填、永远是字面量类型；格式分流的判断交给 schema 校验（校验产出收窄后的类型）或谓词函数，再配 assertNever 兜底。

**陷阱三：断言在重构后静默失效。** 触发场景：原代码 `if (typeof x === 'string') { use(x as string) }`，重构把 if 挪进别的函数，调用点的 `as string` 留下了——编译通过，判断已经不在同一控制流里。`!` 同理：`map.get(k)!` 的前提「一定存在」原本由上文的 set 保证，重构挪走 set 之后 `!` 还在原地。根因：as 与 `!` 是编译期的一次性豁免，不跟着控制流走；删掉判断不会让断言报错，豁免继续生效。规避：每处非空断言与 as 都要求注释写明依赖的前提；优先换成会随控制流失效的等价物——`??` 默认值、`?.` 可选链、显式 if、谓词函数。这些等价物在前提消失时，会把问题暴露成编译错误或清晰的运行时分支，而不是静默放行。

## 手推配方：手工计算任意 if / switch 的收窄类型

面试与排查都用得上：给定一段带守卫的代码，纸笔算出每个位置的收窄类型。六步：

1. **列声明类型**：写下每个相关绑定的声明类型 D，这是所有计算的起点；
2. **维护真路径集合 S**：初始 `S = D`。进入分支对真路径计算，离开分支后对假路径继续（假路径通常取 S 减去被排除的成员）；
3. **按守卫种类切集合**，规则表：`typeof x === 't'` 按 ECMA-262 的八种返回值映射成员（object 档注意 null 同档）；`'k' in x` 按「声明里有没有 k」切；`x === 字面量` 只留可等于该字面量的成员；`x instanceof C` 留与 `InstanceType<typeof C>` 匹配的成员；谓词函数按声明切；真值性 `if (x)` 只去掉 null 与 undefined（falsy 的 0、`''`、NaN 在类型层不可切分，正文 §3）；
4. **剪枝**：return、throw、continue、break 让对应路径不再参与后续汇流——正文 §1 的三连 return 就是靠这一步把 `string | number | null` 逐级剪成 string；
5. **处理赋值与调用**：赋值把流类型改成右值的类型；函数调用按边界一不动局部变量与属性的收窄；数组元素访问按边界三看索引是否稳定；
6. **处理闭包**：捕获的 let 按「闭包创建是否在最后一次赋值之后」与「所在作用域是否脚本顶层」决定保留或回退声明类型（边界二）。

示例（每行注释即手工推演结果，全部经 tsc 5.9.3 验证）：

```ts
function g(x: string | number | null): void {
  if (x == null) return;   // 剪掉 null 路径
  if (typeof x === 'number') {
    x.toFixed();           // x: number
  } else {
    x.toUpperCase();       // x: string（number 进了 then，假路径只剩 string）
  }
}
```

推演时最常见的三个错漏：忘了假路径是「补集」（算成从头再判一遍）；忘了 catch 回退与汇流（边界四）；把 truthiness 当成「判空」（它判的是 ToBoolean）。对着这份清单逐个位置报出类型，哪一处讲不出，就回去看对应边界。

## code review 检查单：收窄相关评审 10 条

- [ ] 守卫函数的**声明与逻辑一致**吗？`x is T` 是声明不是验证，谓词写反照样编译通过（正文 §8），这是收窄相关最危险的一类代码。
- [ ] 可辨识联合的判别字段是**必填的字面量类型**吗？宽 string 或可选 tag 都会让 switch 失去分辨力（正文 §10 与陷阱二）。
- [ ] 每个 switch 联合处理函数都有 assertNever 式 default 吗？要求新增成员时编译器在漏改处硬报错。
- [ ] 有没有把「调用方判过」当函数体内的前提？参数类型应声明成收窄后的类型，helper 内部自行收窄（陷阱一）。
- [ ] 每处 `!` 与 `as` 都有注释说明依赖的前提吗？能换成 `??`、`?.`、显式判断或谓词吗（陷阱三）？
- [ ] `x || default` 里的 x 可能是 `''` 或 `0` 吗？合法 falsy 值必须用 `??`（正文 §3）。
- [ ] catch 变量按 unknown 纪律处理了吗？先 `instanceof Error` 再取 message，不裸取属性（正文 §12）。
- [ ] 对 `arr[i]` 的收窄假设成立吗？要求索引是字面量或 const、数组绑定是 const（边界三），否则别依赖。
- [ ] 外部输入（JSON.parse、fetch、postMessage）是否先落 unknown、再走守卫链，而不是 any 加 as（正文 §12）？
- [ ] 闭包里捕获的 let 是否满足「创建在最后一次赋值之后」且不在脚本顶层（边界二）？满足不了就在闭包开头重新判断。

## 输出预测题（进阶）

先写答案再验证；三题全部经 tsc 5.9.3 实测，收据写在解析里。

**题 1**（赋值分析的强度与边界）：

```ts
let x: string | null = null;
if (x !== null) {
  x.length; // A：报不报错？报的话错误信息里是什么类型？
}

function f(v: string | null) {
  if (v !== null) {
    console.log(v.length); // B：报不报错？
  }
}
```

**题 2**（catch 回退与出口汇流）：

```ts
let y: string | null = null;
try {
  y = 'abc';
} catch {
  y.length; // C
}
console.log(y.length); // D
```

**题 3**（元素访问收窄的索引稳定性）：

```ts
const arr: (string | number)[] = ['a', 1];
if (typeof arr[0] === 'string') {
  arr[0].length; // E
}
let i = 0;
if (typeof arr[i] === 'string') {
  arr[i].length; // F
}
```

## 进阶预测题答案

**题 1**：A 报错，错误信息是 `Property 'length' does not exist on type 'never'`——初值 null 经赋值分析把 x 收窄成 null，`x !== null` 为真意味着「只能是 null 却要求非 null」，空集即 never。B 不报错：参数 v 没有已知的初始赋值，不参与赋值分析，`if (v !== null)` 正常把它收窄成 string。A 与 B 的对照就是边界五：赋值分析只作用于局部绑定，而且强到能收出 never。

**题 2**：C 报 TS18047（`'y' is possibly 'null'`）：catch 子句里 y 回退到声明类型 `string | null`（边界四），try 里的赋值不保证发生过。D 同样报 TS18047：try/catch 结束点是「正常走完」与「catch 兜底」两股控制流的汇流处，并集仍是 `string | null`。两句都错才是正确答案——「在 catch 里或 try 之后直接用」正是收窄假设的高发翻车点。

**题 3**：E 不报错：const 数组加字面量索引命中 TS 4.7 的元素访问控制流分析，且该收窄跨数组方法调用存活（边界三实测）。F 报 TS2339：`let` 索引即使从未重新赋值，分析器也不信任它——收窄只认「不可再赋值的索引」。两行的唯一差别是绑定方式，这是「收窄保守性」最干净的切片。

## 收尾自测（增补）

1. 边界一到边界五，各自的触发条件与不触发场景各复述一遍；哪些是版本行为（TS 4.4 / 4.7 / 5.4），哪些是恒定规则？
2. 陷阱一至陷阱三各对应哪条边界？每条事故链里「类型全绿但已经错了」的环节发生在哪一步？
3. 手推配方第 3 步的规则表里，哪几类守卫能切掉 null？哪几类切不掉？为什么 `if (x)` 切不掉 falsy 的原始值成员？
4. 把正文练习 03 的要求（证据函数必须把 s 声明成参数）与边界五连起来复述——为什么用 const 声明的字面量对象做实验，tag 收窄的对照就会失效？

---

## 规范原文对照：收窄的三句一手原文与解读

三句原文分别来自 TS Handbook《Narrowing》与 ECMA-262，解读接住本册实测。读原文的方法同 11 册：先记结论，再对限定词。

**原文一（收窄的定义）。** Handbook《Narrowing》：

> "TypeScript follows possible paths of execution that our programs can take to analyze the most specific possible type of a value at a given position. It looks at these special checks (called type guards) and assignments, and the process of refining types to more specific types than declared is called narrowing."

解读：一句话钉死三件事——「at a given position」（收窄是位置属性，陷阱一的规范依据）；「type guards 与 assignments」两类输入（手推配方第 3 步与边界五的出处）；「比声明类型更具体的精炼过程」（「声明类型不变、各位置有收窄类型」的口述标准答案直接来自这句）。同页还有一句值得背：

> "When a variable is analyzed, control flow can split off and re-merge over and over again, and that variable can be observed to have a different type at each point."

「split off and re-merge」就是边界四汇流的原文依据：catch 出口与正常出口合并时取并集，不是实现细节，是控制流模型的自然推论。面试被问「收窄是运行时机制吗」，把这两句英文背下来再翻译，比任何中文二手总结都有说服力。

**原文二（typeof 的一手表格）。** ECMA-262《The typeof Operator》给出返回值表：Null 档返回 `"object"`，与 Undefined、Boolean、Number、String、BigInt、Symbol、Function 各占一行。解读：`typeof null === 'object'` 不是浏览器 bug，是规范文本本身——收窄因此必须把 null 与真正的对象类型同档对待（正文 §2 的陷阱与边界五的 never 收据都建立在这一点上）。这条也是「TS 收窄忠实于运行时语义」的最好例证：分析器没有替你修正历史包袱，只是把规范定义的等价类如实映射成集合运算；你想修正它，得自己写谓词。

**原文三（谓词的引入动机）。** Handbook《Narrowing》type predicates 一节开头：

> "We've worked with existing JavaScript constructs to handle narrowing so far, however sometimes you want more direct control over how types change throughout your code."

解读：内置守卫（typeof、in、instanceof）本质是「借用 JS 运行时语义做类型层推断」；遇到语义在 JS 里、名字不在守卫清单里的判断（正则匹配、schema 校验、协议检查），就需要 `x is T` 把推断权手动接管过来。这正是正文 §8「把收窄能力声明出来」的规范语境——也顺带解释了为什么声明不验证：接管之后，正确性责任从规范移交给了函数作者，评审自然要盯住守卫函数。

## 排查速查表：收窄失效症状速查（本机实测口径）

全部症状在 tsc 5.9.3 `--strict` 下实测复现过：

| 症状（报错或行为） | 触发场景 | 根因 | 处置 |
| --- | --- | --- | --- |
| TS2339 且类型显示 `never` | 对初值已定死的 let 做互斥判断 | 赋值分析收窄成空集（边界五） | 别对字面量初值变量做矛盾判断；实验代码改用参数 |
| TS2339 回退到联合类型 | 闭包内访问捕获的 let | 创建后仍有赋值，或脚本顶层（边界二） | 挪进函数体、先赋值后建闭包，或闭包内重判 |
| TS18047 possibly null | catch 子句里、try/catch 之后 | 回退与汇流（边界四） | 在这两个位置重新判断或加守卫 |
| TS18048 possibly undefined | `in` 为真后访问可选字段 | in 只证声明有、不证此刻有（陷阱二） | 可选字段先 `??` 或再判一次空 |
| TS2339 只出现在 `arr[i]` 上 | 索引是 let 变量 | 元素收窄只认稳定索引（边界三） | 索引改 const 或字面量，或先存局部 const 再判断 |
| TS18046 `'v' is of type 'unknown'` | 对 unknown 取属性或做运算 | unknown 单向豁免（正文 §12） | 走 typeof、instanceof、谓词收窄链 |
| 无报错但运行时炸 | 谓词写反、断言前提被重构掉 | 声明不验证、断言不跟控制流（正文 §8、陷阱三） | 检查单第 1、5 条；给每处断言写前提注释 |
| 类型全绿但走错分支 | 可选 tag 配 in 分流 | 运行时键存在性与类型声明脱节（陷阱二） | tag 必填 + 校验函数 + assertNever |

排查心法与 14 册同源：先看错误信息里的**类型**（never、联合、unknown、possibly X 各自指向一条边界），再看**位置**（闭包、catch、元素访问是三大高发区），最后才怀疑编译器。八行症状对应五条边界加两条纪律，逐行对号入座，比推倒重写守卫快得多。

## 输出预测题（补充）：谓词的作用范围与 in 的未列出属性

**题 4**（谓词收窄的生效范围）：

```ts
const mixed: (string | number)[] = ['a', 1, 'b'];
const strs = mixed.filter((x): x is string => typeof x === 'string');
strs[0].toUpperCase();   // G
mixed[0].toUpperCase();  // H
```

两行各报不报错？为什么 filter 的返回类型变了、原数组没变？

**答案**：G 不报错，H 报 TS2339（`Property 'toUpperCase' does not exist on type 'string | number'`）。机制：`Array.prototype.filter` 的签名对谓词函数有专门重载——回调是 `(x): x is string` 时，返回类型从 `(string | number)[]` 变成 `string[]`；这是一次**新数组的类型转换**，发生在 filter 表达式所在的位置。原数组 mixed 的声明类型没有被触碰，它的每个位置仍是联合——谓词收窄与所有收窄一样是位置属性（边界一的同源规则），不会顺着引用回写到原对象。工程含义：想要「收窄后的集合」用 filter 加谓词；想要「原地断言」用断言函数或显式判断；想让原变量本身变窄，只能重新声明或重新赋值（赋值分析会接住）。

**题 5**（`in` 对未列出属性的收窄，TS 4.9）：

```ts
interface Config { url: string }
declare const c: Config;
if ('timeout' in c) {
  c.timeout; // I：这行报不报错？通过的话是什么类型？
}
```

**答案**：不报错，`c.timeout` 是 `unknown`。TS 4.9 Release Notes 的 "Unlisted Property Narrowing with the in Operator" 一节规定：对声明里**不存在**的属性做 in 检查时，类型不再原样保留，而是与 `Record<'timeout', unknown>` 求交叉——于是访问放行，但拿到的只有 unknown。这个设计的分寸值得体会：既不撒谎说该属性存在且类型明确，也不像 4.9 之前那样直接拒绝访问，把「继续收窄」的责任留给作者（正文 §12 的 unknown 纪律正好接上）。对照记忆：属性在声明里**存在但可选**时，行为完全不同——in 为真仍是 `T | undefined`（陷阱二的实测收据）。同一运算符、两种声明状态、两种收窄策略，这是「in 语义」最完整的考试范围。最后把两道题并成一句复述：**谓词与 in 都是「在某处为某值做证」的工具，证词只在那一份证据处生效**；想让类型在别处也成立，要么在那里重新举证（再判一次），要么让类型系统直接从证据源（常量表、校验函数返回值）推导。

## 册末补记

本册全部增量内容可以压成一句话：**收窄是编译器在「位置」上对「控制流可达状态」的保守计算**——位置、控制流、保守，三个词各自给出本章增量的一半。排查任何「为什么不收窄」，先问三个词里哪个出了问题：位置错了（收窄跨不过函数与闭包边界）；控制流断了（try/catch 回退与汇流、闭包回退到声明类型）；还是计算本来就保守（元素访问只认稳定索引、脚本顶层一律不信任）。五个实测错误码（TS2339、TS18046、TS18047、TS18048、TS4104）与两条纪律（谓词声明必须与逻辑一致、每处断言必须写前提）是这句话的全部注脚——背句子，再背注脚，面试与排查就都有抓手了。

