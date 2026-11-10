---
title: "A7. SSR 与环境兼容"
---

## A7. SSR 与环境兼容

- `useId`（hydration 安全的表单 id 关联：label htmlFor ↔ input id）
- `useLayoutEffect` 的 SSR warning → `useIsomorphicLayoutEffect`
- window/document 守卫； hydration mismatch 的典型来源（随机数/时间）

### A7.1 useId：hydration 安全的唯一 id 生成器

**问题**：组件内部需要把 `<label>` 与 `<input>` 关联起来，必须有个 id。手写 `id={'input-' + Math.random()}` 在服务端与客户端各算一次——hydration 时 React 发现属性不一致直接报错。自增计数器也不行：SSR 是流式/并发的，两端渲染顺序无法保证对齐。

`useId` 的机制：React 在组件树的位置坐标基础上生成 id（React 18 形如 `:r0:`，React 19 形如 `«r0»`），**同一次渲染流程里服务端与客户端对同一组件算出同一个值**——这就是它存在的全部理由。格式细节不要依赖（版本间会变），只当作不透明 token。

```tsx
// TextField.tsx —— label htmlFor ↔ input id 的标准接法
import * as React from 'react';

export function TextField({
  label,
  hint,
  ...inputProps
}: {
  label: string;
  hint?: string;
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'id'>) {
  const id = React.useId();                       // 两侧水合一致：不炸 hydration
  const hintId = hint ? `${id}-hint` : undefined; // 衍生 id 也保持同源
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hintId} {...inputProps} />
      {hint && <p id={hintId}>{hint}</p>}
    </div>
  );
}
```

同一组件渲染多次，id 互不相同；`aria-controls`、`aria-labelledby`、`aria-describedby` 一切"跨元素引用"都走这个模式（A4 的 tab↔panel 互指在真实库里也该用 useId 生成，示例里为可读性用了业务 value）。多 React root 共存（微前端）时用 `createRoot(el, { identifierPrefix: 'app1-' })` 区分前缀。

### A7.2 useIsomorphicLayoutEffect

`useLayoutEffect` 在服务端不执行，React 会打 warning（`useLayoutEffect does nothing on the server…`）——因为 SSR 期间调它没意义，但这警告在生产日志里是噪音。约定俗成的 shim：

```tsx
// useIsomorphicLayoutEffect.ts
import * as React from 'react';

// 服务端（无 window）退化为 useEffect：SSR 上两者都不执行，
// 客户端水合完成后恢复真正的 useLayoutEffect（测量 DOM 后同步重绘的场景）
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
```

使用纪律：组件库里"测量再渲染"的 effect（弹层定位、指示条 FLIP 动画、滚动修正）都应改用它。注意模块顶层的 `typeof window` 判断发生在**模块加载时**——Next.js 的客户端 bundle 里是真 window，服务端 bundle 里是 undefined，分支正确。

### A7.3 window/document 守卫模式

先纠正一个高频误解：**effect 在 SSR 上根本不执行**，所以 effect 里直接用 `window`/`document` 不需要守卫。真正需要守卫的是另外两处：

```tsx
// ① 模块级守卫：模块被服务端 import 时就执行的工具初始化
// if (typeof window !== 'undefined') {
//   setupResizeObserverPolyfill(); // 这类"碰 DOM 的副作用"只在浏览器执行
// }

// ② 渲染期守卫：渲染逻辑要读环境时（最危险，容易造成双端输出不一致）
// function useViewportWidth(): number {
//   return typeof window === 'undefined' ? 0 : window.innerWidth; // 服务端 0，客户端真实值 → mismatch！
// }
```

渲染期读环境的正确姿势是**两阶段渲染**：首帧输出与服务端一致的默认值，effect 里校正为真实值。以响应式断点 hook 为例：

```tsx
// useMediaQuery.ts —— SSR 安全的媒体查询
import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  // 首帧恒为 false：与服务端输出一致，hydration 无 mismatch
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches); // 水合完成后立即校正为真实值（可能闪一下，换来正确性）
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
```

### A7.4 hydration mismatch 的典型来源与修复

hydration 的契约：服务端 HTML 与客户端首次渲染的 DOM 必须**逐节点一致**。任何"服务端算不出、客户端才算得出"的值都是隐患。对照表：

| 来源 | 症状（控制台） | 根因 | 修复 |
|---|---|---|---|
| `Math.random()`/uuid | attribute/class mismatch | 双端各随一次机 | 渲染期只用确定性值；随机值放 effect；id 用 useId |
| `Date.now()`/`toLocaleString()` | text content mismatch | 毫秒必然不同；时区/语言环境不同 | 展示型时间用 `suppressHydrationWarning` 或 effect 填充 |
| `localStorage` 主题类 | class 不一致 | 服务端没有存储 | 首帧内联脚本（A9.3）或两阶段渲染 |
| 时区/货币格式化 | 文本不同 | 服务端容器常是 UTC，客户端是用户时区 | 格式化移到 effect；或服务端注入用户 locale |
| 渲染期读 `window.innerWidth` 分支 | 结构不同 | A7.3 ② | 首帧默认值 + effect 校正 |
| 浏览器插件改 DOM | 属性被插（`data-*`） | 与组件库无关的外因 | 无痕模式复现定位；不要拿 suppress 掩盖 |
| 非法 HTML 嵌套 | 服务端能出、客户端炸 | `<p>` 里渲染 `<div>` 等 | 改用合法结构（`<div>` 套 `<div>`） |

时间戳的标准处理（展示型"天然不一致"允许客户端值胜出）：

```tsx
// Timestamp.tsx
import * as React from 'react';

export function Timestamp({ ts }: { ts: number }) {
  return (
    // suppressHydrationWarning 只忽略"本元素文本/属性"的水合差异，客户端值生效；
    // 它是"此处确实双端不同"的显式声明，不是万能橡皮擦
    <time suppressHydrationWarning>
      {typeof document === 'undefined' ? '' : new Date(ts).toLocaleString('zh-CN')}
    </time>
  );
}
```

### A7.5 常见坑

1. **`useState` 惰性初始化里读环境**。症状：`useState(() => localStorage.getItem(...))` 在 SSR 报 `localStorage is not defined`。根因：初始化器在服务端渲染期也执行。修法：`typeof window` 守卫 + 接受首帧差异（配合 effect 校正），或值只在 effect 里读。
2. **以为 effect 需要守卫，加了一堆 `if (typeof window)`**。症状：代码噪音。根因：误解 A7.3。修法：删掉 effect 内守卫，把守卫留给模块级与渲染期。
3. **useId 的值当 CSS 选择器用**。症状：样式失效（React 18 的 `:r0:` 冒号在选择器里非法）。根因：依赖了格式细节。修法：用属性选择器或包一层自己控制的 class；React 19 的 `«r0»` 格式同理别解析。

### A7.6 useId 的完整边界与 hydration 不匹配排查清单

A7.1 解决了"label↔input 关联"这一种用法，但"id"在组件库里其实有四种需求，useId 只覆盖其中一种。这一节先把需求面铺全，再给水合不匹配的系统性排查流程——A7.4 是"来源对照表"（查表），这里是"操作流程"（照做）。

**useId 的稳定边界只有一条**：同一次页面加载内，服务端与客户端对同一树位置算出同一个值。由此推出它覆盖不了的三种需求：

| id 的需求 | useId 够吗 | 正确方案 |
|---|---|---|
| 页面生命周期内的跨元素引用（label/aria） | 够 | `useId`（A7.1 模板） |
| 刷新后仍稳定（URL 锚点、e2e 选择器、存库） | 不够：刷新后 React 重新分配 | 业务数据派生，或库暴露显式 `id` prop |
| 多 React root 唯一（微前端） | 不够：两个 root 都从 r0 开始 | `identifierPrefix`，且必须双端同配 |
| 服务端生成、两端消费（iframe 通信、埋点关联） | 不覆盖 | 服务端生成后经 props/context 注入 |

机制层面三条需要说死，它们分别对应三个高频事故：

1. **id 什么时候会变**：树位置变化（兄弟节点增删、条件渲染分支切换）会让 useId 的返回值跟着变。所以它是"渲染期标识"，不是"持久标识"——存库、写 URL、跨会话引用都是错的用法。
2. **identifierPrefix 必须双端同配**。`hydrateRoot(el, <App />, { identifierPrefix: 'app1-' })` 只配客户端一处，服务端 HTML 里的 id 就没有前缀——"为了修多 root 冲突加的前缀，反而制造了整批 mismatch"。
3. **为什么老式计数器（react-uid 一类 `useIncrementalId`）在流式 SSR 下必错**：流式渲染中"完成渲染的顺序"不等于"组件在树中的位置"，而双端 id 的对齐依据恰恰是树位置。React 内部按树坐标分配 id，这是 useId 无法被简单模拟的根本原因。

库组件的标准接法是"id 可被外部接管，useId 只做兜底"：

```tsx
// Field.tsx —— 外部可传 id（锚点/测试需要稳定 id 时），否则 useId 兜底
import * as React from 'react';

export interface FieldProps {
  id?: string; // 显式 id：外部需要"刷新后稳定"的标识时传入
  label: string;
  children: (args: { id: string }) => React.ReactNode;
}

export function Field({ id: idProp, label, children }: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId; // 同一个 id 分发给 label 与内部控件
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {children({ id })} {/* render props：库不预设控件结构，但 id 的生成与分发由库统一管 */}
    </div>
  );
}
```

微前端多 root 场景的入口配置（把"双端同配"落成代码）：

```tsx
// app1/entry.client.tsx —— 客户端
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('app1')!, <App1 />, {
  identifierPrefix: 'app1-',
});
```

```ts
// app1/entry.server.ts —— 服务端：同一个前缀，漏配即 mismatch
renderToPipeableStream(<App1 />, {
  identifierPrefix: 'app1-',
});
```

多库共存时的最后一道防线是**开发期重复 id 检测**——identifierPrefix 依赖每个库都自觉配置，检测则能把"漏配"变成显式警告而不是神秘 bug：

```tsx
// useUniqueId.ts —— 包装 useId：开发期检测同文档 id 冲突（生产零成本）
import * as React from 'react';

const registry = new Set<string>();

export function useUniqueId(): string {
  const id = React.useId();

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (registry.has(id)) {
      console.warn(`[ui] 检测到重复 id "${id}"：是否存在未配 identifierPrefix 的多 root？`);
    } else {
      registry.add(id);
    }
    return () => { registry.delete(id); };
  }, [id]);

  return id;
}
```

注意它只在浏览器 effect 里跑（服务端不执行 effect，注册表天然只属于客户端一份），且 `NODE_ENV` 判断让生产构建直接摇空——这是"诊断代码不进产物"的标准写法（A9.4 的 sideEffects 同款思想）。

**hydration 不匹配排查清单**（按序执行，每步有明确产出物）：

1. **拿到差异**。开发模式下 React 19 会在报错里直接给出不匹配节点的属性/文本 diff（React 18 只给树路径不给 diff）。生产模式没有这些信息——复现必须在 dev 或 staging 以开发模式跑。产出物：报错里的组件树路径（`<div>` → `<form>` → …）。

   ```text
   React 19 开发态水合报错（节选示意，非逐字）：
   A tree hydrated but some attributes of the server rendered HTML
   didn't match the client properties. This diff is a fixable bug...
     <input className="..." value="...">
   +   value="120"        ← 差异属性以 +/- 标出：一眼看出"谁和谁没对上"
   -   value=""
   ```

2. **沿路径定位组件**。报错里只有 DOM 标签名，把它映射回组件要"从最外层容器往里数"。DevTools 的 DOM 高亮能加速；注意 `data-testid` 这类测试锚点本身别用 useId 生成（回到需求表第 2 行）。产出物：嫌疑组件清单，通常一两个。
3. **分类来源**。进嫌疑组件找 A7.4 表格的七类模式：随机/时间/存储/渲染期环境读取/非法嵌套/浏览器插件。找到即修，修法回到对应行。
4. **按判据选修复模式**（不是按偏好）：
   - 双端**本应**一致、只是实现错了 → 修实现（id 换 useId、删掉渲染期的环境读取）；
   - 双端**天然**不同（展示时间、随机验证码） → `suppressHydrationWarning`（只管本元素的文本/属性）或"占位 + effect 填值"；
   - 首帧依赖客户端环境（视口、存储） → 两阶段渲染（A7.3）或 useSyncExternalStore（A7.7）。
5. **固化回归**。把该组件加进 hydrate 冒烟测试（C6 有最小实现：renderToString + hydrate 一致性断言），防止后续改版回归。

**排查实录**（把清单走一遍）。某中台接入方反馈"列表页偶发整页重渲、首屏闪一下"，按五步走：

1. dev 模式复现：报错指向 `<table>` 里某 `<td>` 的文本差异，diff 显示服务端为 `--`、客户端为 `1,204`；
2. 沿路径定位：该 `<td>` 由 Ellipsis 包着金额展示组件——嫌疑组件锁定为金额列的渲染函数；
3. 分类来源：千分位格式化用了 `Intl.NumberFormat`，服务端容器 locale 是 `en-US`，浏览器是 `zh-CN`——落进 A7.4 表格"时区/货币格式化"一行；
4. 选修复模式：这里要拆两半——**展示**（"1,204"）双端天然不同，走 `suppressHydrationWarning`；**计算依据**（排序键）必须双端一致，改为用原始数值排序，格式化只在展示层做；
5. 固化回归：给金额列加 hydrate 冒烟用例，并在用例里显式 mock 双端 locale 差异。

这个实录里最值得记的是第 4 步的拆分：**同一个值的"展示形态"可以双端不同，"计算依据"必须双端一致**。很多团队把两件事混在一个格式化值里，才觉得 mismatch "无解"。

常见坑：

1. **useId 值当持久标识**。症状：URL 锚点/收藏链接刷新后失效。根因：刷新后 React 按新的树重新分配 id。修法：持久标识必须来自业务数据；需要稳定 id 的场景给组件传显式 `id`（上面的 Field 模式）。
2. **identifierPrefix 只配了一端**。症状：接入微前端后 id 全线 mismatch。根因：机制第 2 条。修法：renderToPipeableStream 与 hydrateRoot 两侧同配。
3. **suppressHydrationWarning 用在结构不一致处**。症状：加了还是报 mismatch，或 DOM 结构错乱。根因：它只豁免"本元素的文本与属性"，子树的结构差异不在豁免范围。修法：结构差异必须两阶段渲染；suppress 只留给"双端天然不同"的叶子值。

### A7.7 SSR 下的弹层与全局监听：isomorphic 兼容层

A2 的弹层体系在组件库里是 SSR 事故最集中的部件，它有四类浏览器依赖：Portal 容器、document/window 事件监听、matchMedia 等外部状态、DOM 测量。A7.2/A7.3 给了单点工具（shim、两阶段渲染），这一节把它们组装成一套兼容层，说清每一层该用哪个工具：

| 依赖 | 发生阶段 | 兼容策略 | 工具 |
|---|---|---|---|
| Portal 容器（document.body） | 渲染期 | 容器放 state，effect 里创建；容器就绪前不渲染 Portal | usePortalContainer |
| document/window 事件 | effect | effect 本不在服务端执行，无需守卫；封装只管清理 | useDocumentEvent |
| 外部状态（matchMedia/online/storage） | 渲染期消费 | 订阅交给 React，双端快照显式分离 | useSyncExternalStore |
| DOM 测量（定位/指示条） | layout effect | shim + "测量结果不进首帧 HTML" | useIsomorphicLayoutEffect（A7.2） |

**第一层：Portal 容器**。两种典型错法：渲染期直接 `createPortal(<X />, document.body)`——服务端没有 document，当场抛错；模块顶层 `const overlay = document.createElement('div')`——服务端只要 import 这个模块就炸（A7.3 ① 的具体化）。正确做法是"容器进 state，effect 里创建"：

```tsx
// usePortalContainer.ts —— SSR 安全的弹层容器
import * as React from 'react';

export function usePortalContainer(
  getTarget: () => HTMLElement = () => document.body,
): HTMLElement | null {
  // 首帧（服务端与客户端水合帧）都是 null → Portal 不渲染 → 双端一致
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-portal', ''); // 治理标记：A2.5 挂载点治理的抓手
    getTarget().appendChild(el);
    setContainer(el);
    return () => {
      el.remove(); // 卸载即清理，弹层容器不残留；StrictMode 双挂载下跑两遍也幂等
    };
  }, [getTarget]);

  return container;
}
```

一个工程细节：`getTarget` 在依赖数组里，调用方必须传稳定引用（`useCallback` 包住或提为常量），否则每次渲染都卸载重建容器——弹层内容被反复重挂，A3 的进入动画全部重播。

**第二层：document/window 事件**。A2.9 的 useClickOutside 在 effect 里 addEventListener——这已经是 SSR 安全的（effect 不在服务端执行），要补的只是工程化：把"目标 + 事件名 + handler + 开关"收敛成一个 hook，清理永不遗漏：

```tsx
// useDocumentEvent.ts —— 统一的 document/window 监听
import * as React from 'react';

export function useDocumentEvent(
  target: Document | Window,
  type: string,
  listener: EventListener,
  enabled = true,
): void {
  React.useEffect(() => {
    if (!enabled) return;
    target.addEventListener(type, listener);
    return () => target.removeEventListener(type, listener); // A6.2 的顺序问题靠"清理对称"兜底
  }, [target, type, listener, enabled]);
}
```

弹层的 `open` 状态也天然安全：初值 `false` 双端一致，开启只会发生在客户端事件之后。

**第三层：外部状态**。A7.3 的 useMediaQuery 用"state 初值 false + effect 校正"手写了不 mismatch，但 React 18 起有专门 API：`useSyncExternalStore` 把"订阅外部源"变成 React 管理的事，双端快照显式分离：

```tsx
// useMediaQuery.ts —— useSyncExternalStore 版（对照 A7.3 手写版）
import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange); // 返回清理函数：订阅协议
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches, // 客户端快照：实时值
    () => false,                            // 服务端快照：SSR 场景必须提供，漏写直接抛错
  );
}
```

与手写版的三点差别：不 mismatch 由 React 保证（水合期间用 getServerSnapshot，订阅建立后才切到客户端快照）；getSnapshot 必须幂等——同样状态返回同一个值，否则 React 会死循环重渲（这里返回布尔天然幂等；返回对象/数组要自己缓存）；"首帧 false、订阅后校正"的闪动依旧存在——这不是 API 能消除的，布局要能容忍它，或者干脆用 CSS 媒体查询承接（Lv1-4 的断点变量链就是那条路）。

**第四层：测量**。A7.2 的 shim 管住了 hook 选择，弹层侧再加一条纪律：**测量结果只能影响"挂载之后才存在的东西"**——弹层定位、指示条位移都发生在 effect 之后，天然满足；会影响首帧结构/尺寸的测量（如 Lv1-1 的按钮宽度）必须走两阶段。四层组合后的 Dialog 骨架：

```tsx
// Dialog.tsx —— SSR 安全弹层骨架（省略动画与焦点管理，见 A3/A4）
import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePortalContainer } from './usePortalContainer';

export function Dialog({
  open,
  children,
}: {
  open: boolean;
  children?: React.ReactNode;
}) {
  const container = usePortalContainer();
  if (!open || !container) return null; // 容器未就绪的水合帧：不渲染
  return createPortal(
    <div role="dialog" aria-modal="true">{children}</div>,
    container,
  );
}
```

注意即使业务初始 `open={true}`：服务端渲染时容器是 null，输出里没有弹层；客户端水合帧同样是 null——双端一致，effect 后弹层才出现。这是正确行为（弹层是交互产物），不是要修的 bug。

把四层收成一份"上线前 60 秒自查"（对库里每个弹层类组件问四句）：

- 模块顶层有没有 document/window 访问？（有 → 移进 effect）
- 首帧渲染路径上有没有"读环境决定结构"的分支？（有 → 两阶段渲染）
- effect 之外的 matchMedia/全局监听还有吗？（有 → useDocumentEvent / useSyncExternalStore）
- 水合帧与服务端输出是否逐节点一致？（跑 C6 冒烟，不要靠肉眼）

常见坑：

1. **模块顶层建容器**。症状：Next.js 服务端启动即 `document is not defined`。根因：`const overlay = document.createElement('div')` 写在模块顶层，服务端 import 就执行。修法：容器创建移进 effect（usePortalContainer），或改为首次使用时惰性创建。
2. **useSyncExternalStore 漏写 getServerSnapshot**。症状：SSR 直接抛 `Missing getServerSnapshot`。根因：第三参数在纯客户端场景可选，SSR 场景必填。修法：三参齐全，返回与服务端渲染一致的初值。
3. **为了"SSR 首帧就有弹层"在渲染期找容器**。症状：服务端 HTML 有弹层、客户端水合帧没有 → mismatch。根因：渲染期读 DOM（A7.3 ②）。修法：接受两阶段；服务端确实要渲染的"弹层类"内容（错误横幅等）不该走 Portal，直接内联渲染。

### A7.8 水合错误应急：onRecoverableError 的收集与上报

前几节都在"防"，这一节讲"防不住时如何知道"。`createRoot`/`hydrateRoot` 接受 `onRecoverableError` 回调：**每当 React 自行恢复错误——水合不匹配（丢弃服务端 HTML 整树重渲）、服务端渲染错误被客户端兜底（含 Suspense 边界的客户端补渲染）——都会调用它**。《学习大纲》阶段 8 给过三个错误回调的骨架（onUncaught/onCaught/onRecoverable），本节只深化"水合错误监控"这一角：组件库作者要回答"我的库在接入方的生产环境里制造了多少水合事故"，唯一的数据通道就是它。

版本差异先列表（决定采集代码怎么写）：

| | React 18 | React 19 |
|---|---|---|
| 回调签名 | `(error: Error) => void` | `(error: unknown, errorInfo: { componentStack?: string; digest?: string }) => void` |
| 水合不匹配的报错内容 | 组件树路径 | 直接给出属性/文本 diff（A7.6 排查清单第 1 步的依据） |
| 原始错误 | 无 | 可能挂在 `error.cause` 上 |
| 与服务端日志的关联 | 无 | `renderToPipeableStream` 的 `onError` 返回字符串 → 客户端 `errorInfo.digest` 收到同一字符串 |

生产级采集器要解决四个问题：**去重**（一次水合事故可能触发多条同类错误）、**分级**（水合错误算缺陷，Suspense 兜底恢复不算事故）、**采样**（报警不风暴）、**关联**（componentStack 定位组件、digest 对上服务端日志）：

```ts
// recoverableErrorReporter.ts —— 生产级 onRecoverableError 采集器
interface ReportRecord {
  key: string;           // 去重键：错误特征 + 组件栈首几帧
  count: number;         // 窗口内聚合计数
  digest?: string;       // 服务端错误关联符
  componentStack?: string;
}

/** 水合类错误按消息特征识别：只匹配稳定片段，不匹配整句（React 的措辞随版本变） */
function isHydrationError(message: string): boolean {
  return (
    message.includes('hydrat') ||      // "hydrated but..." / "Hydration failed"
    message.includes('did not match') ||
    message.includes('server rendered')
  );
}

export function createRecoverableErrorReporter(
  send: (records: ReportRecord[]) => void,
  { sampleRate = 0.1 }: { sampleRate?: number } = {},
) {
  const seen = new Map<string, ReportRecord>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (seen.size === 0) return;
    const batch = [...seen.values()];
    seen.clear();
    send(batch);
  };

  return (
    error: unknown,
    errorInfo: { componentStack?: string; digest?: string },
  ) => {
    if (Math.random() > sampleRate) return; // 采样按"会话内首次"判断即可，被采中的会话仍全量去重

    // React 19 起 error 是 unknown，收窄后再取 message
    const err = error instanceof Error ? error : new Error(String(error));
    const firstFrame =
      errorInfo.componentStack?.split('\n').slice(0, 4).join('\n') ?? ''; // 栈首几帧足以定位组件
    const kind = isHydrationError(err.message) ? 'hydration' : 'recoverable';
    const key = `${kind}|${err.message}|${firstFrame}`;

    const prev = seen.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      seen.set(key, { key, count: 1, digest: errorInfo.digest, componentStack: errorInfo.componentStack });
    }

    if (!timer) timer = setTimeout(flush, 3000); // 3 秒窗口聚合，避免逐条上报
  };
}
```

```tsx
// entry.client.tsx —— 接入
import { hydrateRoot } from 'react-dom/client';
import { createRecoverableErrorReporter } from './recoverableErrorReporter';

const reportRecoverable = createRecoverableErrorReporter((batch) => {
  // 对接监控平台：水合错误建议按 key 聚合看趋势，而非逐条建工单
  navigator.sendBeacon?.('/api/client-errors', JSON.stringify(batch));
});

hydrateRoot(document.getElementById('root')!, <App />, {
  onRecoverableError: reportRecoverable,
});
```

服务端侧的 digest 关联（React 19）：让服务端渲染错误带上短指纹，客户端收到时能对上服务端日志：

```ts
// entry.server.ts —— onError 返回的字符串会成为客户端 errorInfo.digest
renderToPipeableStream(<App />, {
  onError(error) {
    const digest = `SR-${Date.now().toString(36)}`; // 生产应换成接入方日志系统的 trace id
    logServerError(error, digest);
    return digest; // 返回字符串 = 下发 digest；返回 undefined 则不下发
  },
});
```

React 18 接入方的适配差异：18 的回调签名只有 `error` 一个参数（没有 errorInfo/digest），也没有 onCaughtError/onUncaughtError 两个同伴——采集器要做一层薄适配：

```ts
// 18/19 双版本签名兼容：第二参数可选，18 下收窄为空对象
const reportRecoverable = createRecoverableErrorReporter(send, { sampleRate: 0.1 });

const onRecoverableError = (
  error: unknown,
  errorInfo?: { componentStack?: string; digest?: string },
) => reportRecoverable(error, errorInfo ?? {});

// React 18：hydrateRoot(el, <App />, { onRecoverableError }) —— 第二参数由 React 19 提供，18 不会传
```

还要管理预期：18 下水合不匹配的报错只有组件路径、没有属性 diff，componentStack 也可能缺失——分级只能靠 message 特征。这也是坑 3 结论（"零水合错误"的保证放 CI、不放线上文案匹配）在 18 项目的加权理由。

组件库文档里值得直接写明的定级建议：`kind === 'hydration'` 且占比持续偏高 → 组件库缺陷，请提 issue 并附 componentStack；非水合的 recoverable 多为 Suspense 兜底/懒加载恢复，属正常噪音，默认只计数不报警。

常见坑：

1. **生产环境"看不到"水合错误**。症状：用户侧首屏白闪、整树重渲变慢，控制台与监控系统都干净。根因：默认行为只是 console.error，打在用户浏览器里。修法：onRecoverableError 在生产同样触发，必须显式接采集器；开发态 React 默认已打到控制台，可不重复接。
2. **把所有 recoverable 当事故**。症状：上线后报警风暴。根因：服务端渲染错误的客户端兜底（含 Suspense 边界补渲染）同样走该回调。修法：isHydrationError 分级 + 采样 + 按 key 聚合看趋势。
3. **依赖报错文案做精确匹配**。症状：React 升级后过滤器全部失效。根因：错误 message 不是稳定 API（React 18 与 19 的水合报错措辞就完全不同）。修法：只匹配稳定片段（'hydrat' / 'did not match'），精确分类交给 componentStack 与 digest；"零水合错误"的保证放在 CI 里（C6 的 hydrate 冒烟），不放线上文案匹配。
4. **卸载前丢批**。症状：水合错误发生在用户秒进秒出的页面上，监控无记录。根因：采集器的 3 秒批量窗口还没到，页面已经关了。修法：监听 `pagehide`（比 unload 可靠）立即 flush；上报通道用 `navigator.sendBeacon`（本节示例即是），它在卸载阶段也能把请求发出。
