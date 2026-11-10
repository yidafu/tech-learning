---
title: "7. 错误边界 ErrorBoundary + 降级 UI + 组件级上报"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [23-6-权限系统-路由级权限-按钮级权限-权限组件-usePermission.md](23-6-权限系统-路由级权限-按钮级权限-权限组件-usePermission.md)。

#### 7. 错误边界 ErrorBoundary + 降级 UI + 组件级上报

**是什么。** ErrorBoundary 是 React 内置的错误捕获机制：一个**类组件**，通过 `static getDerivedStateFromError` 和 `componentDidCatch` 两个生命周期捕获**子树在渲染期间抛出的异常**，把错误转换为降级 UI，避免整棵应用白屏。

**为什么需要。** 组件 render 期间的任何异常（`undefined.xxx`、map 之前没判空……）会让 React 卸载**整棵组件树**——一个图表组件的数据字段变了，整个后台白屏，用户只能刷新。函数组件与 Hook **无法**实现错误边界（React 官方明确：没有 plan 用 Hook 实现等价物），这是日常开发里你唯一必须写类组件的地方。降级 UI 决定"崩了之后用户看到什么"；上报接入点决定"崩了之后你能不能知道"。

**怎么做（机制分步）。** 两个生命周期各司其职：

- `static getDerivedStateFromError(error)`：在**渲染阶段**调用，返回值 merge 进 state。要求纯函数（不能再抛错、不能有副作用）——它唯一的职责是"让下一次渲染走降级分支"；
- `componentDidCatch(error, info)`：在**提交阶段**调用（此时 DOM 已经是降级 UI），适合副作用——这就是**上报接入点**。`info.componentStack` 是 React 组件堆栈（哪个组件链上炸的），比 `error.stack`（JS 调用栈，生产环境被压缩）更接近问题定位点。

再配合三个工程点：`fallback` 支持"节点或 `(error, reset) => ReactNode` 函数"双形态（函数形态可以渲染重试按钮）；`reset` 清空错误态重渲染 children；边界粒度按"页面级 + 关键 widget 级"两层布置，一个小图表崩了只降级它自己。

最后必须清楚**捕获边界**——ErrorBoundary 捕不到的有：**事件回调里的错误**（`onClick` 中 throw 不经过渲染管线）、**异步代码**（`setTimeout` / Promise reject / `await` 抛错）、**ErrorBoundary 自身**（而非子树）的错误、SSR。这些要靠 `window.onerror` + `unhandledrejection` 全局兜底，React 19 还提供了 `createRoot` 的 `onCaughtError` / `onUncaughtError` 回调统一上报。

**代码示例。** 完整实现：

```tsx
// src/components/ErrorBoundary/index.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * 降级 UI：传节点则原样渲染；
   * 传函数则拿到 error 与 reset（用于渲染"重试"按钮），是最常用的形态
   */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 上报接入点：接到 Sentry / 自建日志平台都从这里进 */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  // 渲染阶段调用：把错误转成 state，让下一次渲染走降级分支。必须纯函数、不能再抛
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  // 提交阶段调用（DOM 已是降级 UI）：副作用唯一合法位置——上报
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // info.componentStack 是组件级堆栈：定位"哪个组件渲染时炸的"比压缩后的 error.stack 更有用
    this.props.onError?.(error, info);
    // 接 Sentry 的示例（解开注释即可）：
    // Sentry.captureException(error, {
    //   contexts: { react: { componentStack: info.componentStack } },
    // });
  }

  // 恢复：清掉错误态，重新渲染 children（配合重试按钮）
  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return fallback(error, this.reset);
      if (fallback !== undefined) return fallback;
      // 内置降级 UI：说明发生了什么 + 给一条出路（错误信息在生产可能不友好，可只展示通用文案）
      return (
        <div role="alert" className="eb-fallback">
          <h2>这块内容出了点问题</h2>
          <p className="eb-message">{error.message}</p>
          <button onClick={this.reset}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

两层布置 + 上报用法：

```tsx
// src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';

const router = createBrowserRouter(routes); // routes 即上一段导出的路由配置数组

// 统一上报函数：真实项目里换成 Sentry/自建平台的 SDK
export function reportError(error: Error, info: { componentStack?: string | null }): void {
  console.error('[上报]', error, info.componentStack);
  // navigator.sendBeacon('/api/errors', JSON.stringify({ message: error.message, componentStack: info.componentStack }));
}

export default function App() {
  return (
    // 第一层：页面级兜底，任何路由渲染崩溃都不会白屏
    <ErrorBoundary onError={reportError} fallback={<h1>应用出错了，请刷新页面</h1>}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
```

第二层：关键 widget 独立边界——图表崩了只降级图表，页面其余部分照常工作。验证方法：临时把 `RevenueChart` 的数据改成 `undefined as unknown as { revenue: number[] }`，让它的 render 抛错。

```tsx
// src/pages/dashboard/DashboardPage.tsx
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { reportError } from '../../App';

/** 演示用图表组件：这里故意在 render 里抛错，用于验证 widget 级边界 */
function RevenueChart() {
  const data = undefined as unknown as { revenue: number[] }; // 模拟接口返回异常结构
  return <div>{data.revenue.length} 条数据</div>; // 渲染期间抛 TypeError，被下方边界捕获
}

export function DashboardPage() {
  return (
    <main>
      <h1>数据面板</h1>
      <section>
        <ErrorBoundary
          fallback={(error, reset) => (
            <div className="chart-fallback">
              <p>图表加载失败：{error.message}</p>
              <button onClick={reset}>重试</button>
            </div>
          )}
          onError={reportError}
        >
          <RevenueChart /> {/* 这个组件崩了只影响这一块 */}
        </ErrorBoundary>
      </section>
      <p>页面其余部分照常渲染——这就是两层边界的意义</p>
    </main>
  );
}
```

ErrorBoundary 捕不到的部分，用全局监听兜底：

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ① ErrorBoundary 之外的两类漏网之鱼：
//    window.onerror —— 同步错误（如事件回调里 throw，不经过渲染管线）
window.addEventListener('error', (event) => {
  reportError(event.error ?? new Error(event.message), {});
});
//    unhandledrejection —— 没有被 catch 的 Promise 拒绝（含 async/await 抛错）
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {});
});

const container = document.getElementById('root')!;
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ② React 19 起可再挂两个根级回调，与 ErrorBoundary 形成完整上报矩阵：
// createRoot(container, {
//   onCaughtError: (error, errorInfo) => reportError(error, errorInfo),      // 被边界捕获的
//   onUncaughtError: (error, errorInfo) => reportError(error, errorInfo),    // 没被任何边界接住的
// }).render(<App />);
```

**常见坑。**

- **症状**：在 `onClick` / `setTimeout` / `await` 里 throw，ErrorBoundary 没反应。**根因**：它只捕获**子树渲染期间**的错误，事件回调与异步代码不经过渲染管线。**修法**：异步/事件里的错误自己 try/catch；全局兜底 `window.onerror` 与 `unhandledrejection`（见上）。
- **症状**：开发环境一片红色遮罩，以为自己的 ErrorBoundary 没生效。**根因**：开发模式下 React 会额外把未捕获错误抛给 `window`，红色遮罩是开发提示。**修法**：`build` 后预览验证；或在事件回调/渲染里确认确实走了降级分支。
- **症状**：一个小组件崩了整页降级。**根因**：整个应用只有一层边界。**修法**：页面级 + 关键 widget 级两层布置（上面 DashboardPage 的做法）。
- **症状**：生产环境上报的 `error.stack` 全是 `min/a1b2.js:1:23456`，没法定位。**根因**：构建压缩。**修法**：上报 `info.componentStack`（组件堆栈不受压缩影响）+ Source Map 私有化部署回源。
- **症状**：点"重试"后立刻又崩，死循环。**根因**：错误根源是脏数据/接口返回异常结构，重渲染再炸一次。**修法**：`reset` 只对"瞬时渲染错误"有意义；对数据问题，降级 UI 里给"返回首页/刷新"，并在数据层加结构校验。

##### 补充：resetKeys——错误边界的自动复位（react-error-boundary 的核心设计）

**是什么。** 错误一旦被捕获就永远留在 state 里：用户在列表页触发崩溃看到降级 UI，点侧边栏去了别的页面再回来——还是降级 UI，尽管新页面根本不会崩。`resetKeys` 机制：给边界一组"复位键"，任一键变化就自动清错误态。这是社区标准库 react-error-boundary 的核心 API，也最值得自己手写一遍。

**为什么需要。** 手动 `reset` 只覆盖"用户点重试"一条路；而"错误是上下文相关的"这个事实意味着上下文变了（路由、筛选参数、资源 id）错误可能已不成立，边界应该自己知道。

```tsx
// src/components/ErrorBoundary/ResetErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  /** 复位键：任一 key 变化（Object.is 浅比较）就清错误态。只放原始值 */
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
}

export class ResetErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  // 核心增量：props 更新时对比 resetKeys，变化即复位
  componentDidUpdate(prevProps: Props): void {
    if (this.state.error === null) return; // 没在错误态，无需复位
    const changed = this.props.resetKeys?.some(
      (key, i) => !Object.is(key, prevProps.resetKeys?.[i]),
    );
    if (changed) this.setState({ error: null });
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return fallback(error, this.reset);
      if (fallback !== undefined) return fallback;
      return (
        <div role="alert">
          <h2>这块内容出了点问题</h2>
          <button onClick={this.reset}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

典型用法——路由变化自动复位（页面级边界包住路由出口）：

```tsx
import { useLocation } from 'react-router-dom';

function PageErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <ResetErrorBoundary
      resetKeys={[location.pathname, location.search]} // 换页面/换筛选条件都算"上下文变了"
      onError={reportError}
      fallback={<h1>页面出错了，请刷新重试</h1>}
    >
      {children}
    </ResetErrorBoundary>
  );
}
```

**关键取舍。** `Object.is` 是浅比较——`resetKeys` 里只能放原始值（pathname、search、资源 id），放对象则每次渲染都是新引用、错误态形同虚设。另外"复位"只是再给一次渲染机会，不是修复：脏数据错误复位后会立刻再崩一次（回到原文坑 5 的结论），所以复位键的选择标准是"这个值变化后，渲染输入确实可能不同"。

##### 补充：React.lazy 的 chunk 失败——重试、降级与刷新的分层防线

**是什么。** 懒加载页面最常见的线上崩溃不是代码 bug，而是**发版**：用户从昨天开着的标签页点导航，旧 hash 的 chunk 文件已从服务器删除，动态 `import()` 抛错。这个错误会被 `React.lazy` 抛进最近的 ErrorBoundary——如果边界只会显示"应用出错了"，就把一个"刷新即愈"的问题渲染成了故障。

**分层防线**（每层解决一种成因，缺一层就漏一类）：

```tsx
// 第一层：lazyWithRetry——网络抖动 / 弱网导致的偶发失败，重试就能好
import { lazy, type ComponentType } from 'react';

export function lazyWithRetry(factory: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await factory();
      } catch (error) {
        if (attempt >= 2) throw error; // 重试耗尽：抛给最近的 ErrorBoundary（第二层接手）
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt)); // 300ms → 600ms 退避
      }
    }
  });
}

// 第二层：边界按"错误类型"分流——chunk 失效给"刷新"出口，其余走普通降级
const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Loading chunk',
];
function isChunkError(error: Error): boolean {
  return CHUNK_ERROR_PATTERNS.some((p) => error.message.includes(p));
}

// 页面级边界使用
<ErrorBoundary
  fallback={(error, reset) =>
    isChunkError(error) ? (
      <div role="alert">
        <h2>应用已更新，页面资源已失效</h2>
        <button onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    ) : (
      <div role="alert">
        <h2>页面出了点问题</h2>
        <button onClick={reset}>重试</button>
      </div>
    )
  }
/>
```

第三层是**自动整页刷新（sessionStorage 防死循环）**：不等用户点按钮，识别 chunk 错误消息后 `location.reload()` 拉取最新 HTML 与资源清单，只自动刷一次——完整实现（`reloadOnChunkError` 与三大内核的错误消息模式清单）已在《15-4-4-路由-React-Router-v6-v7.md》懒加载一节的坑 1 展开，此处不重复。

**边界与取舍。** 错误消息匹配依赖浏览器文案，模式清单需要覆盖 Chromium/Safari/Firefox 并随版本维护（这就是 15-4-4 把它做成独立常量的原因）；重试的 `await` 不涉及用户手势（动态 import 无手势要求），可以放心退避。

##### 补充：错误上报的工程落地——去重、采样、卸载不丢

**是什么。** `onError` 回调只是接入口；上报本身要做工程化处理，否则一个死循环崩溃 5 分钟刷掉几万条重复数据、配额爆炸还淹没真问题。四件事：**指纹去重、采样、卸载不丢、带版本号**。

```ts
// src/monitor/reportError.ts —— 生产可用的最小上报器
declare const __APP_RELEASE__: string; // 构建时注入 git short sha（vite: define）

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const recent = new Map<string, number>(); // fingerprint → 上次上报时间

/** 指纹 = 错误名+消息 与组件堆栈第一帧：同一处代码崩溃归为同一指纹 */
function fingerprint(error: Error, componentStack?: string | null): string {
  const firstFrame =
    componentStack?.split('\n').find((line) => line.trim().startsWith('in'))?.trim() ?? '';
  return `${error.name}:${error.message}|${firstFrame}`;
}

export function reportError(error: Error, info: { componentStack?: string | null }): void {
  const fp = fingerprint(error, info.componentStack);
  const now = Date.now();
  if (now - (recent.get(fp) ?? 0) < DEDUP_WINDOW_MS) return; // 同指纹 5 分钟只报一次
  recent.set(fp, now);

  const body = JSON.stringify({
    fingerprint: fp,
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
    release: __APP_RELEASE__, // 没有版本号的错误数据回答不了"哪个版本开始崩的"
    url: location.href,
    ts: now,
  });

  // sendBeacon：页面卸载中也能送达（fetch 会被浏览器取消）；不可用时退 fetch keepalive
  const ok = navigator.sendBeacon?.('/api/errors', new Blob([body], { type: 'application/json' }));
  if (!ok) {
    void fetch('/api/errors', { method: 'POST', body, keepalive: true }).catch(() => undefined);
  }

  console.error('[上报]', error, info.componentStack); // 开发环境仍然要看控制台
}
```

**检查清单**（接入监控时逐条对照）：

- [ ] **指纹去重**：`message + componentStack 首帧` 做指纹，同指纹窗口期内（5 分钟）只报一次，配额留给新问题；
- [ ] **采样**：新版本发布后头 10 分钟全量采样（最可能出问题的窗口），稳态降到 10%——按 release 维度配置，而不是全局一刀切；
- [ ] **卸载不丢**：`sendBeacon` 优先、`fetch keepalive` 兜底（见上）；纯 `fetch` 在"用户当场关页面"时会丢最后一批错误；
- [ ] **版本号必带**：release 注入 git sha，回滚后旧错误自动归零是验证回滚成功的旁证；
- [ ] **指标看板**：边界捕获数 / 未捕获数、降级 UI 曝光率、reset 成功率（reset 后 60s 内无同指纹新错误）——只收数据不看板的监控等于没有；
- [ ] **面包屑最小集**：错误发生前的最近一次路由跳转、最近一次 mutation 描述，由调用方在 `onError` 里拼进上下文字段，定位"用户做了什么导致的"全靠它。

