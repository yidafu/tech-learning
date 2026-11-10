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

