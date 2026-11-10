---
title: "4.4 路由（React Router v6/v7）"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [14-4-3-列表场景.md](14-4-3-列表场景.md)。

### 4.4 路由（React Router v6/v7）

写路由之前，先花一段话建立 **v6 → v7** 的版本认知，避免在新旧教程之间迷路：

- **包结构合并**：v7 里 `react-router-dom` 并入了 `react-router`，所有 API 从 `react-router` 一个包导入（`npm i react-router`）；`react-router-dom@7` 只剩一层 re-export 兼容垫片，老代码的 `from 'react-router-dom'` 还能跑，但新代码统一写 `from 'react-router'`。
- **数据路由（data router）是唯一主角**：`createBrowserRouter` + `RouterProvider` 从 v6.4 起就是官方主推形态，v7 把它确定为标准用法——路由对象上可以挂 `loader`/`action`/`errorElement`/`lazy` 这些数据层能力，而 `<BrowserRouter>` + `<Routes>` 的纯声明式写法仍可用，但享受不到这些能力（也用不了 4.4.3 的 `useBlocker`）。
- **API 转正与删除**：v6 后期标 `unstable_` 的 API（如 `useBlocker`）在 v7 转正；`usePrompt` 被彻底移除，离开拦截只有 `useBlocker` 一条路。v6 项目若开启了 `future.v7_*` 预警 flag，升级 v7 后行为零变化。
- **升级路径**：v6.4+ 项目基本只需改导入来源；更老的项目先把 `<Routes>` 改成 `createBrowserRouter` 配置数组。本节代码全部按 v7 写法（v6.4+ 几乎逐字兼容）。

#### 1. 路由配置、嵌套路由、`Outlet`、布局路由

**是什么**：路由不再写在 JSX 里，而是用一个对象数组描述整棵路由树，交给 `createBrowserRouter` 创建 router 实例，再用 `<RouterProvider>` 挂载。**布局路由**（layout route）是"不对应独立页面、只提供外壳"的路由（侧边栏、顶栏、面包屑），子路由的页面内容通过 `<Outlet />` 这个占位组件注入。**嵌套路由**即路由对象层层嵌 `children`，URL 的路径段与嵌套层级对应。

**为什么需要**：一是数据路由的所有能力（`loader`、`errorElement`、`lazy`、`useBlocker`）只认对象配置；二是布局与内容解耦后，**子路由切换时外壳不卸载**——顶栏的搜索框输入、侧边栏的展开状态、正在播放的背景音乐都不会因为切页面而丢失；三是导航高亮、面包屑这些"外壳级 UI"天然知道自己处于哪段子路由（配合 `NavLink`、`useLocation`）。

**怎么做（机制分步）**：

1. `createBrowserRouter(routes)` 在应用外部创建 router 实例（**模块级创建一次**，不要放进组件渲染过程）。
2. 匹配 URL 时，React Router 从根到叶算出一条"匹配链"：比如 `/settings/profile` 命中 `Layout → SettingsLayout → ProfilePage` 三层。
3. 渲染链层层嵌套：`Layout` 渲染时把 `<Outlet />` 放在内容区，`Outlet` 里渲染 `SettingsLayout`，它自己的 `<Outlet />` 再渲染 `ProfilePage`。
4. `index: true` 的**索引路由**处理"直接访问父路径本身"（如 `/settings`）的情况，通常用来重定向到默认子页。

**代码示例**（入口 → 路由表 → 两个布局，可直接跑）：

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router'; // v7：统一从 react-router 导入
import { routes } from './routes';
import './index.css';

// 数据路由自带 history 管理，不需要再包 <BrowserRouter>
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

```tsx
// src/routes.tsx
import { Navigate, RouteObject } from 'react-router';
import Layout from './layout/Layout';
import SettingsLayout from './layout/SettingsLayout';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AccountPage from './pages/AccountPage';
import UserDetailPage from './pages/UserDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',                // 一级布局路由：全站外壳（顶栏 + 内容区）
    element: <Layout />,
    children: [
      // 索引路由：访问 / 本身时重定向到 /dashboard（replace 避免多一条历史记录）
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'settings',     // 二级布局路由：设置页专属的左侧菜单
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> }, // 相对路径重定向
          { path: 'profile', element: <ProfilePage /> },               // /settings/profile
          { path: 'account', element: <AccountPage /> },               // /settings/account
        ],
      },
      { path: 'users/:id', element: <UserDetailPage /> }, // 动态参数（4.4.2 展开）
      { path: '*', element: <NotFoundPage /> },           // 兜底 404（4.4.5 展开）
    ],
  },
];
```

```tsx
// src/layout/Layout.tsx
import { NavLink, Outlet } from 'react-router';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'nav nav-active' : 'nav')}
        >
          仪表盘
        </NavLink>
        <NavLink
          to="/settings/profile"
          className={({ isActive }) => (isActive ? 'nav nav-active' : 'nav')}
        >
          设置
        </NavLink>
      </header>
      {/* 子路由内容在这里注入：切子路由时本组件不卸载、state 不丢 */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

```tsx
// src/layout/SettingsLayout.tsx
import { NavLink, Outlet } from 'react-router';

export default function SettingsLayout() {
  return (
    <div className="settings">
      <aside>
        <NavLink to="profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          个人资料
        </NavLink>
        <NavLink to="account" className={({ isActive }) => (isActive ? 'active' : '')}>
          账号安全
        </NavLink>
        {/* 注意 to="profile" 是相对路径：相对当前路由 /settings 解析为 /settings/profile */}
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
```

顺带两个 v7 风格说明：`element: <Layout />` 也可以写成 `Component: Layout`（属性风格，效果相同，可按团队喜好统一）；嵌套子路由的 `path` 不以 `/` 开头时自动拼接父路径，`'profile'` 挂在 `'settings'` 下就是 `/settings/profile`。

**常见坑**：

1. **访问 `/settings` 页面只有菜单没有内容**。症状：左侧菜单渲染了，右侧空白。根因：`/settings` 匹配到布局路由本身，但布局的 `Outlet` 里没有任何子路由可渲染——没配 `index` 索引路由。修法：加 `{ index: true, element: <Navigate to="profile" replace /> }`，让"访问父路径"有确定的去向。
2. **在组件渲染过程中调用 `createBrowserRouter`**。症状：路由状态（滚动位置、location state）随机丢失，或每次父组件渲染路由器被重建。根因：router 实例被当成"渲染产物"创建，`createBrowserRouter` 应在整个应用生命周期里只执行一次。修法：放到模块顶层（如 `routes.ts` 旁的 `router.ts`），组件只消费 `<RouterProvider router={router} />`。
3. **子路由 `path` 拼接错误**。症状：访问 `/settings/profile` 404。根因：子路由写了 `path: '/settings/profile'`（以 `/` 开头表示完整绝对路径，虽然恰好等价，但把同一段路径维护在两处，父路径改名时必漏）；或拼错成 `path: 'settings/profile'` 挂在了别处。修法：团队统一约定——嵌套路由一律用**相对路径**，只有根路由用 `/`。
4. **以为布局会随子路由切换重挂载**。症状：想当然把"每次进页面都要重置的筛选条件"放在布局组件里，结果没重置。根因：布局路由在子路由间切换时**保持挂载**（这正是它的价值）。修法：页面级一次性状态放子路由页面组件里，或用 `useEffect` 依赖 location 清理。

---

#### 2. 动态参数 `:id`、查询参数读写

**是什么**：路径里的变量段（`/users/:id`）通过 `useParams()` 读取；`?` 之后的查询参数（`?tab=logs&page=2`）通过 `useSearchParams()` 读写。两者语义不同：**路径参数标识"哪一个资源"（必填、参与路由匹配），查询参数描述"资源的哪个视图"（可选、不影响匹配哪个组件）**。

**为什么需要**：详情页（`/users/:id`）、多 Tab 的详情（`?tab=`）、可分享的列表筛选（4.3 整节的底座）都建立在这两个 API 上。关键认知：`useParams` 返回的每个值类型都是 `string | undefined`——路由配置里的 `:id` 只是"可能有"，TypeScript 不会替你保证它存在，**使用前必须收窄**。

**怎么做（机制分步）**：

1. 路由表声明 `path: 'users/:id'`，匹配 `/users/42` 时 `useParams()` 得到 `{ id: '42' }`——注意是**字符串** `"42"`，没有自动转数字。
2. 组件先校验再使用：缺失、非数字直接渲染兜底 UI，不发请求。
3. 参数变化（`/users/1` → `/users/2`）**不会卸载组件**，只会让 `useParams` 的返回值变化——数据要靠 `useEffect` 依赖 `id` 重新拉取。
4. 查询参数用 `useSearchParams()`，它返回 `[searchParams, setSearchParams]`：`get`/`getAll` 读，`setSearchParams` 写（对象形式**整体替换**、函数形式增量改，坑同 4.3.1）。

**代码示例**：

```tsx
// src/pages/UserDetailPage.tsx
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

interface UserDetail {
  id: number;
  name: string;
  email: string;
}

const TABS = ['overview', 'logs', 'security'] as const;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>(); // 类型：string | undefined，永远不能直接当 string 用

  // ---- 路径参数：先收窄再使用 ----
  const userId = Number(id);
  if (!id || !Number.isInteger(userId) || userId < 1) {
    // 兜底要在发请求之前：/users/abc、/users/0 都不允许往下走
    return <p>无效的用户 ID</p>;
  }

  // ---- 查询参数：读 ----
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'overview'; // 缺省值兜底
  const tags = searchParams.getAll('tags'); // 同名多值：?tags=vip&tags=beta → ['vip', 'beta']

  // ---- 查询参数：写（函数式，保留其他参数）----
  const switchTab = (t: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', t);
        return next;
      },
      { replace: true }, // 切 Tab 不产生历史记录，后退直接离开详情页
    );
  };

  // ---- 参数变化时重新取数：组件不会因 id 变化而卸载，必须靠依赖驱动 ----
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<UserDetail>)
      .then((json) => {
        setUser(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setUser(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [userId]); // /users/1 → /users/2 时这里重新执行

  return (
    <div>
      <nav>
        {TABS.map((t) => (
          <button key={t} aria-current={tab === t ? 'tab' : undefined} onClick={() => switchTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {loading && <p>加载中…</p>}
      {user && (
        <>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <p>
            当前 Tab：{tab}；标签：{tags.join(', ') || '无'}
          </p>
          {/* 列表页 → 详情页的链接写法：模板字符串拼 id */}
          <Link to="/users">返回列表</Link>
        </>
      )}
    </div>
  );
}
```

**常见坑**：

1. **`/users/1` 切到 `/users/2`，页面数据还是 1 号用户的**。症状：列表点不同行进详情，第一次正确，第二次开始内容"卡"在上一个用户；或者表单输入框残留上一个用户的值。根因：同一路由匹配同一组件，**参数变化只触发重渲染、不触发重新挂载**，`useState` 初始值不会重算。修法（三选一）：数据用 `useEffect([id])` 重拉（如上）；纯 UI 态在 `useEffect` 里随 `id` 重置；最粗暴的是给页面组件加 `key={id}` 强制整个子树重建——简单有效，代价是丢失所有内部状态与滚动位置，表单类详情页用它反而正确。
2. **`useParams()` 返回 `undefined` 导致白屏**。症状：控制台 `TypeError: Cannot read properties of undefined`，页面空白。根因：`const { id } = useParams()` 后直接 `fetch(`/api/users/${id}`)` 或 `id.toString()`，而该组件被复用到了不带 `:id` 的路由上，或路由表写错。修法：像上面一样在使用前收窄类型并渲染兜底；开启 TS 的 `noUncheckedIndexedAccess` 类严格选项有助于在编译期暴露。
3. **把查询参数当数字用没做校验**：`Number(searchParams.get('page'))` 得 `NaN` 继续参与计算。与 4.3.1 坑 2 同根同修——URL 一切皆外部输入。
4. **`setSearchParams({ tab: 'logs' })` 丢掉了 `tags` 等其他参数**。对象形式是整体替换，不是 merge。修法：函数式更新（本节与 4.3.1 已示范），把这个规则写进团队 ESLint 约定或封装 `useQueryParam(key)` 工具 hook。

---

#### 3. 编程式导航、离开拦截（表单未保存提示）

**是什么**：`useNavigate()` 在 JS 代码里执行跳转（登录成功后、提交后、定时跳转、`navigate(-1)` 回退）；离开拦截（`useBlocker`）在用户**试图离开当前页**时先拦下来，弹确认框——典型场景是表单有未保存的修改。

**为什么需要**：声明式导航（`<Link>`）覆盖不了"跳转发生在逻辑之后"的场景；而表单页如果没有离开拦截，用户误点侧边栏或后退键，半页输入瞬间蒸发——这是真实用户投诉率最高的一类事故。

**怎么做（机制分步）**：

1. `useNavigate()` 返回 `navigate` 函数：`navigate('/path')` 压栈跳转；`navigate('/path', { replace: true })` 替换当前记录（登录后、保存成功后用）；`navigate(-1)` 等价浏览器后退；`navigate('/path', { state: {...} })` 携带跳转附言，目标页用 `useLocation().state` 读取。
2. `useBlocker(blockerFunction)`：函数返回 `true` 时，本次导航被挂起，`blocker.state` 变为 `'blocked'`；调 `blocker.proceed()` 放行、`blocker.reset()` 取消并回到 `'idle'`。
3. **两道防线缺一不可**：`useBlocker` 只能拦**路由器管的导航**（应用内跳转、后退键）；浏览器刷新、关闭标签页、跳转外站路由器无能为力，要配 `useBeforeUnload`（对原生 `beforeunload` 事件的封装）。
4. 确认 UI 自己画（或用 4.5.2 的 confirm），原生 `confirm()` 虽然能用但样式不可控、阻塞主线程，生产上一般不用。

**代码示例**（完整编辑页：脏检查 + 双重拦截 + 确认弹层）：

```tsx
// src/pages/ArticleEditPage.tsx
import { useState } from 'react';
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router';

export default function ArticleEditPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const isDirty = title !== savedTitle; // 脏判断：当前值 ≠ 最后一次保存值

  // 防线一：拦截应用内导航（含后退键）。
  // 注意：useBlocker 只能在 createBrowserRouter 数据路由下使用
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // 防线二：拦截刷新 / 关闭标签 / 跳外站（浏览器原生能力，文案由浏览器决定）
  useBeforeUnload((e) => {
    if (isDirty) {
      e.preventDefault(); // 标准触发方式
      e.returnValue = ''; // 旧版 Chrome 必须设置 returnValue 才会弹确认
    }
  });

  const save = async () => {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSavedTitle(title); // 先把"干净基线"更新，isDirty 变 false
    navigate('/articles'); // 再跳转，此时不会再被自己拦住
  };

  return (
    <div>
      <h1>编辑文章</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        style={{ width: 320 }}
      />
      <button onClick={save}>保存并返回</button>

      {/* blocker.state 为 blocked 时渲染确认弹层（样式可用 4.5.1 的 Modal） */}
      {blocker.state === 'blocked' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <p>有未保存的修改，确定要离开吗？</p>
            <button onClick={() => blocker.proceed()}>放弃修改并离开</button>
            <button onClick={() => blocker.reset()}>留在此页</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

`useBlocker` 的边界必须心里有数：

- **只在数据路由下可用**。路由用 `<BrowserRouter>` 挂载时调用它会直接抛错——这不是 bug，是设计：拦截导航需要路由器接管 history，只有 `createBrowserRouter` 做得到。
- **拦不住刷新、关标签、跳外站**，这些交给 `useBeforeUnload`（原生弹窗，文案不可定制）；两道防线拦截的是不同世界。
- `blocker.state` 有三个值：`'idle'`（未拦截）、`'blocked'`（等待用户决定）、`'proceeding'`（已放行、目标路由加载中）。确认弹层只在 `blocked` 时出现。
- 保存成功后**先更新脏标记再导航**（见 `save` 的顺序），否则会被自己的拦截器拦住，用户刚保存完又看到"未保存"提示。
- 配合 react-hook-form 时，脏判断用 `formState.isDirty`，提交成功后它自动回到干净态（`isSubmitSuccessful` 后 reset），思路与上面的 `savedTitle` 基线完全一致。

**常见坑**：

1. **在 render 里调用 `navigate()`**。症状：控制台报 "Cannot update a component while rendering a different component" 或不跳转。根因：render 阶段只能产生"渲染结果"，不能触发副作用（导航本质是 state 更新）。修法：render 中的条件跳转用组件 `<Navigate to="..." replace />`；事件回调和 `useEffect` 里才用 `navigate()`。
2. **登录成功后忘了 `replace`**。症状：登录 → 首页，按后退回到登录页，再后退才退出，或配合鉴权重定向形成"登录页↔首页"循环。根因：登录页这条历史记录不该存在。修法：`navigate(redirectTarget, { replace: true })`。
3. **`navigate` 传参用查询字符串硬塞复杂对象**。症状：URL 又长又乱、对象还要序列化反序列化。修法：不进 URL 的"跳转附言"用 `navigate('/path', { state: { from: detail } })`，目标页 `const state = useLocation().state as { from?: string } | null` 读取；会话结束即失、刷新仍保留（history state 存在浏览器会话里）——但注意**它不出现在地址栏，不可分享**，需要分享的信息必须走查询参数。
4. **`useBlocker` 传了恒为 `true` 的值**。症状：保存成功后跳转也被拦。根因：拦截条件没有和"脏"状态联动。修法：条件里显式带上 `isDirty`（如上），或用函数形式精确比较 `currentLocation` / `nextLocation`。

---

#### 4. 路由懒加载 `lazy()` + Suspense、加载骨架

**是什么**：把每个路由的页面组件拆成独立的 JS 包（chunk），用户访问到该路由时才下载并执行。两种写法：React 的 `lazy()` + `<Suspense>`（组件级通用方案），或 React Router 的路由级 `lazy` 属性（数据路由专属，还能顺带懒加载 `loader`）。

**为什么需要**：后台系统动辄五六十个页面，首屏用户只用到登录页一个。不拆包时所有页面代码打进首屏 bundle，白屏时间随页面数线性增长；Vite 对动态 `import()` 自动做代码分割，路由是天然的分界线——**路由级分割是收益/成本比最高的优化**，通常一行改动换首包减半。

**怎么做（机制分步）**：

1. 把页面组件的静态 `import` 改成 `lazy(() => import('./pages/XxxPage'))`——`import()` 返回 Promise，首次需要组件时才去下载 chunk。
2. 懒组件不能直接渲染（可能还没加载完），必须包在 `<Suspense fallback={...}>` 里：加载期间显示 fallback。
3. fallback 放在**布局路由的内容区**（包住 `<Outlet />`），这样加载新页面时顶栏侧栏保持不动，只有内容区显示骨架——这是"局部加载"的正确粒度。
4. 骨架屏（Skeleton）与最终页面**结构对齐**（头部一条 + 三行卡片），避免内容到达时布局跳变。

**代码示例**：

```tsx
// src/layout/Layout.tsx（改造：内容区包 Suspense）
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { PageSkeleton } from './PageSkeleton';

export default function Layout() {
  return (
    <div className="app-shell">
      <header>
        <NavLink to="/dashboard">仪表盘</NavLink>
        <NavLink to="/settings/profile">设置</NavLink>
      </header>
      <main>
        {/* 加载期间：外壳不动，内容区显示骨架屏 */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
```

```tsx
// src/layout/PageSkeleton.tsx
export function PageSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="页面加载中">
      {/* 骨架与真实页面同构：标题一行 + 内容三行，减少加载完成时的布局跳动 */}
      <div className="skeleton-bar" style={{ width: '30%', height: 24 }} />
      <div className="skeleton-bar" style={{ width: '100%', marginTop: 16 }} />
      <div className="skeleton-bar" style={{ width: '90%' }} />
      <div className="skeleton-bar" style={{ width: '60%' }} />
    </div>
  );
}
```

```css
/* src/index.css */
.skeleton-bar {
  height: 14px;
  border-radius: 4px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: skeleton-wave 1.2s ease infinite; /* 微光扫过，明确告诉用户"在加载" */
}
@keyframes skeleton-wave {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
```

路由级 `lazy` 的写法（与 `React.lazy` 二选一，数据路由推荐）：

```tsx
// src/routes.tsx（节选）：路由级懒加载
import { RouteObject } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />, // 布局不懒加载：首屏立刻要有
    children: [
      {
        path: 'dashboard',
        // 模块的 default export 会被当作该路由的组件
        lazy: () => import('./pages/DashboardPage'),
      },
      {
        path: 'settings/profile',
        // 需要同时懒加载非组件导出（如 loader）时，返回路由属性对象：
        lazy: async () => {
          const { default: Component, loader } = await import('./pages/ProfilePage');
          return { Component, loader };
        },
      },
    ],
  },
];
```

两种方式怎么选：`React.lazy` 粒度自由（任何组件都能懒）、Suspense fallback 位置自定；路由级 `lazy` 少一层样板、能懒加载 `loader` 等 route 属性。实际项目里**页面级用路由 `lazy`，页面内超重的局部组件（图表编辑器、富文本）再用 `React.lazy`** 是常见组合。另一个 v7 细节：路由切换默认被包在 `startTransition` 里，慢的路由加载不会阻塞用户继续操作旧页面，体验上"点了没反应"的卡顿感比手动 `lazy` 时代轻得多。

**常见坑**：

1. **发版后旧页面点击导航报 "Failed to fetch dynamically imported module"**。症状：用户从昨天开着的标签页里点菜单，白屏或报错。根因：新版本部署后，旧的 chunk 文件名（带 hash）已不存在，浏览器按旧地址取 404。修法：在错误兜底里识别动态导入失败并整页刷新一次（拉到最新 HTML 与资源清单）：

```tsx
// src/utils/reloadOnChunkError.ts
export function reloadOnChunkError(message: string) {
  const patterns = [
    'Importing a module script failed',
    'Failed to fetch dynamically imported module',
    'Loading chunk',
  ];
  if (patterns.some((p) => message.includes(p))) {
    const key = 'chunk-reloaded';
    // sessionStorage 防止刷新后仍失败造成死循环：只自动刷一次
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
    return true;
  }
  return false;
}
```

（在 4.4.5 的 `errorElement` 错误页里对 `error.message` 调用它即可。）

2. **骨架屏闪烁**。症状：chunk 已被缓存，加载 20ms 就完成，骨架屏闪一下又消失，观感比直接白一下更差。根因：fallback 对"极快加载"没有消抖。修法：给骨架加最短展示时间（如用 state 让 fallback 至少停留 300ms），或依赖 v7 默认的 `startTransition` 行为（慢加载不再立刻切 fallback，旧页面保持可交互）。取舍在于：闪烁是视觉问题，不修也不影响功能。
3. **懒加载粒度过细**。症状：首屏没变大，但每次点页面都要等两三个 chunk 串行加载（页面 chunk → 页面里 lazy 的图表 → 图表里 lazy 的依赖）。根因：把 `lazy` 当免费优化到处撒。修法：以"路由"为单位分割；重组件单独分割；评估依赖关系避免请求瀑布（Vite 构建分析面板看 chunk 依赖图）。
4. **懒加载页面的默认导出写成了具名导出**。症状：控制台报 "lazy: Component must not be undefined" 之类的错。根因：`lazy: () => import('./pages/X')` 与 `React.lazy(() => import('./pages/X'))` 都约定模块有 **default export**。修法：页面组件 `export default function XxxPage()`；确实只有具名导出时，写成 `import('./pages/X').then(m => ({ default: m.XxxPage }))`。

---

#### 5. 鉴权路由（ProtectedRoute）、404、错误路由（errorElement）

**是什么**：三类"非正常页面流"的路由设施——鉴权路由（未登录访问受保护页时重定向到登录页，登录后回跳）、404（URL 匹配不到任何路由）、错误路由（路由渲染或数据加载抛异常时的兜底 UI，`errorElement`）。

**为什么需要**：鉴权放在每个页面里手写是重复且易漏的（总有新页面忘了加），统一在路由层拦截是唯一可维护的做法；404 与错误页则是"最后一道防线"——没有它们，用户看到的是白屏加一串控制台报错，而 `errorElement` 相比手写 ErrorBoundary 的优势是**能拿到路由上下文里的错误对象**（状态码、loader 错误），可以区分"404 没找到"和"500 服务器炸了"。

**怎么做（机制分步）**：

1. ProtectedRoute 做成**无 path 的布局路由**：自身只负责判断，通过则渲染 `<Outlet />`（子路由们），不通过渲染 `<Navigate to="/login" />`。
2. 鉴权是**三态**（checking / authed / unauth）而非两态——刷新页面时要先异步确认登录态，这个窗口期必须显示 loading，否则会"闪跳登录页"。
3. 重定向到登录页时用 `state` 记住"用户本来想去哪"，登录成功后跳回去。
4. 404 用 `path: '*'` 通配路由兜底；数据路由里任何 render/loader 抛出的错误冒泡到**最近的 `errorElement`**，错误页用 `useRouteError` 拿错误对象、`isRouteErrorResponse` 判断是否是带状态码的 `Response`。

**代码示例**（鉴权 → 路由表 → 登录回跳 → 错误页）：

```tsx
// src/auth/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

/** 三态鉴权守卫：以布局路由形态包裹一组需要登录的子路由 */
export function ProtectedRoute() {
  const { status, user } = useAuth(); // status: 'checking' | 'authed' | 'unauth'
  const location = useLocation();

  if (status === 'checking') {
    return <p>正在确认登录状态…</p>; // 刷新时的鉴权请求期：不能闪跳登录页
  }
  if (status === 'unauth' || !user) {
    // state 记住来路，登录后回跳；replace 让登录页不进历史，后退不会回到受保护页
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />; // 已登录：渲染子路由
}

/** 按钮级/页面级角色权限：包在具体页面外 */
export function RequireRole({
  role,
  children,
}: {
  role: 'admin' | 'member';
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user?.roles.includes(role)) {
    return <p>403：你的角色无权访问该页面</p>;
  }
  return <>{children}</>;
}
```

```tsx
// src/routes.tsx（鉴权 + 404 + errorElement 的完整骨架）
import { Navigate, RouteObject } from 'react-router';
import { ProtectedRoute, RequireRole } from './auth/ProtectedRoute';
import Layout from './layout/Layout';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RouteErrorPage from './pages/RouteErrorPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />, // 根级错误兜底：任何子路由的错误最后都会到这
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <ProtectedRoute />, // 无 path 布局路由：只做鉴权，不改 URL 结构
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          {
            path: 'admin',
            element: (
              <RequireRole role="admin">
                <AdminPage />
              </RequireRole>
            ),
          },
        ],
      },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <RouteErrorPage /> }, // 404 兜底也复用错误页（下方处理 404 分支）
    ],
  },
];
```

```tsx
// src/pages/LoginPage.tsx（登录成功回跳的关键三行）
import { useLocation, useNavigate } from 'react-router';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onLoginSuccess = () => {
    navigate(from, { replace: true }); // 回到用户原本想去的页；replace 甩掉登录页历史
  };
  return <button onClick={onLoginSuccess}>模拟登录成功</button>;
}
```

```tsx
// src/pages/RouteErrorPage.tsx（404 与错误路由统一处理）
import { isRouteErrorResponse, Link, useLocation, useRouteError } from 'react-router';
import { reloadOnChunkError } from '../utils/reloadOnChunkError';

export default function RouteErrorPage() {
  const error = useRouteError(); // 错误对象：可能是 Response、Error 或任意抛出值
  const location = useLocation();

  // 发版后旧 chunk 加载失败：自动刷新一次拉新资源（见 4.4.4 坑 1）
  if (error instanceof Error && reloadOnChunkError(error.message)) {
    return <p>正在刷新页面以加载最新版本…</p>;
  }

  if (isRouteErrorResponse(error)) {
    // loader 或组件里 throw new Response(null, { status: 404 }) 会走到这里
    if (error.status === 404) {
      return (
        <div>
          <h1>404</h1>
          <p>页面不存在：{location.pathname}</p>
          <Link to="/">回首页</Link>
        </div>
      );
    }
    return (
      <div>
        <h1>出错了 {error.status}</h1>
        <p>{error.statusText || '服务器开小差了'}</p>
        <Link to="/">回首页</Link>
      </div>
    );
  }

  if (error instanceof Error) {
    // 组件渲染抛出的 JS 异常
    return (
      <div>
        <h1>页面渲染出错</h1>
        <p>{error.message}</p>
        <Link to="/">回首页</Link>
      </div>
    );
  }
  return <h1>未知错误</h1>;
}
```

生产里一个常用技巧：详情页数据不存在时，直接 `throw new Response(null, { status: 404 })`（在 `loader` 里或组件里都行，数据路由都会把它交给最近的 `errorElement`），错误页统一渲染"404 页面不存在"——**用错误流替代每个页面自己写 if-else 空态**，路由结构即错误处理结构。`errorElement` 支持**就近捕获**：给某段子路由配更具体的 `errorElement`，就只接管那段的错误，其余继续冒泡到根级。

**常见坑**：

1. **鉴权只写了两态，刷新时闪跳登录页**。症状：已登录用户按 F5，页面先闪一下登录页又跳回来；或 worse，回跳时 `state.from` 丢了落在首页。根因：登录态存 token 时，刷新后需要异步验证（调 `/api/me`），验证返回前 `user` 是 `null`，两态逻辑把它当"未登录"。修法：`status: 'checking' | 'authed' | 'unauth'` 三态（如上），checking 期间渲染占位，不做任何重定向。
2. **在 render 里调用 `navigate('/login')` 做鉴权跳转**。症状：控制台警告且行为不可预期。根因：见 4.4.3 坑 1——render 阶段不能触发副作用。修法：条件跳转一律渲染 `<Navigate to="/login" replace />` 组件，让 React 在提交阶段处理。
3. **`path: '*'` 与嵌套路由的位置关系导致 404 页"丢外壳"**。症状：某些路径的 404 没有侧边栏、页面完全裸奔。根因：`'*'` 挂在根路由 children 下时，404 出现在根布局内（有外壳）；如果项目在多处（每个布局路由下）都放了 `'*'`， deepest 匹配优先，行为依路径而异。修法：约定只在需要外壳的层级放 `'*'`；要求"布局内 404"就放该布局 children 里，要求"全屏 404"就挂在根级、放在 `Layout` 之外的同级。
4. **errorElement 一处没配，生产环境直接显示 React Router 内置错误页**。症状：用户看到框架自带的深色错误页（开发态带堆栈，生产态也有兜底文案），显得产品"坏了"。根因：数据路由没配 `errorElement` 时走默认错误界面。修法：至少给根路由配一个统一的 `errorElement`；再按需给关键子树配就近的错误页。
5. **404 判断只依赖 `'*'` 兜底，详情页不存在的 ID 却渲染了空壳**。症状：`/users/99999999` 匹配到 `:id` 路由，页面渲染出来但数据全空——用户以为"这个用户真的存在但没内容"。根因：路由匹配成功 ≠ 资源存在。修法：请求返回 404 时 `throw new Response(null, { status: 404 })`，让错误页接管（见上文技巧）。

---

#### 6. loader 数据预取：把"取数"搬进路由层（`useLoaderData` + `useNavigation` + `shouldRevalidate`）

**是什么**：数据路由允许把每个路由的取数函数直接挂在路由对象上（`loader`）：导航发生时，React Router 先执行 loader 拿到数据、再渲染对应组件，组件里用 `useLoaderData()` 直接读结果——取数与导航同步发生，而不是"先渲染组件、组件挂载后再发请求"。

**为什么需要**：4.4.2 的手写版（`useEffect` + `fetch`）有两个结构性短板。其一，**取数晚一拍**：组件先挂载、effect 再执行，用户先看到空屏或骨架、再等请求返回；loader 在导航阶段就并行发出请求，`useNavigation()` 还能免费给出全局"正在导航"状态，顶部进度条一行代码。其二，**错误处理分散**：每个页面自己 try/catch 写空态；loader 里抛出的错误直接进入 4.4.5 的 `errorElement` 错误流，`throw new Response(null, { status: 404 })` 一个写法全站复用。

**怎么做（机制分步）**：

1. 路由对象挂 `loader`，参数解构出 `params` / `request`；返回值就是数据（直接 `return` 一个 Promise，框架会等它落定）。
2. 组件用 `useLoaderData()` 读；TypeScript 写 `useLoaderData() as UserDetail` 收窄，或 `useLoaderData<typeof loader>()` 直接继承 loader 的返回值类型。
3. `Layout` 里用 `useNavigation()` 拿全局导航状态：`navigation.state` 为 `'idle' | 'loading' | 'submitting'`，loading 时渲染顶部进度条——所有路由共用一个加载指示，不用每个页面自己写。
4. 悬停预取：给列表里的链接加 `<Link prefetch="intent">`，鼠标悬停约 150ms 即预取目标路由的模块与 loader 数据，用户点击时数据已就绪、页面"秒开"。
5. 重验证控制：默认情况下**路径参数与查询串的变化都会重跑 loader**——`?tab=` 这种纯 UI 参数会引发无意义的重复请求，用 `shouldRevalidate` 跳过。

**代码示例**（4.4.2 的详情页改造为 loader 版）：

```tsx
// src/routes.tsx（节选）：loader 版详情路由
import type { LoaderFunctionArgs, RouteObject } from 'react-router';

async function userDetailLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/users/${params.id}`);
  if (res.status === 404) {
    throw new Response(null, { status: 404 }); // 走 4.4.5 的 errorElement，错误页统一渲染"页面不存在"
  }
  if (!res.ok) {
    throw new Response(null, { status: res.status }); // 5xx 同样交给错误流
  }
  return res.json() as Promise<UserDetail>;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'users/:id',
        loader: userDetailLoader,
        Component: UserDetailPage, // 属性风格，等价于 element: <UserDetailPage />
        // 仅 ?tab= 变化时跳过重验证：loader 只关心 id，不关心 tab
        shouldRevalidate: ({ currentUrl, nextUrl }) => {
          const strip = (href: string) => {
            const u = new URL(href);
            u.searchParams.delete('tab');
            return u.href;
          };
          return strip(currentUrl.href) !== strip(nextUrl.href);
        },
      },
    ],
  },
];
```

```tsx
// src/pages/UserDetailPage.tsx（loader 版：取数代码整个消失）
import { Link, useLoaderData, useSearchParams } from 'react-router';

export default function UserDetailPage() {
  const user = useLoaderData() as UserDetail; // 导航完成时数据已在手，没有 loading 分支
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'overview';
  // 切换 Tab 的代码与 4.4.2 相同；因为 shouldRevalidate 跳过了，切 Tab 不再触发任何请求
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <p>当前 Tab：{tab}</p>
      {/* prefetch="intent"：悬停即预取目标路由的模块与 loader 数据，点击秒开 */}
      <Link to="/users" prefetch="intent">返回列表</Link>
    </div>
  );
}
```

```tsx
// src/layout/Layout.tsx（节选）：全局导航进度条
import { NavLink, Outlet, useNavigation } from 'react-router';

export default function Layout() {
  const navigation = useNavigation();
  return (
    <div className="app-shell">
      {/* 任何路由导航（含 loader 取数、懒加载 chunk）期间都显示，全站共用 */}
      {navigation.state === 'loading' && <div className="top-progress" aria-hidden />}
      <header>{/* 导航同 4.4.1 */}</header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

```css
/* src/index.css（追加载入条样式） */
.top-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #1677ff;
  transform-origin: left;
  animation: top-progress-slide 1s ease-in-out infinite;
}
@keyframes top-progress-slide {
  0% { transform: scaleX(0); }
  50% { transform: scaleX(0.7); }
  100% { transform: scaleX(1); }
}
```

**取舍**：loader 不是银弹。交互驱动的取数（搜索联想、按钮点一下拉数据）依然属于 `useEffect`/TanStack Query 的地盘（4.2.2）；loader 适合"URL 决定数据"的页面级取数。两者可以共存：页面主体走 loader，页面内的列表筛选走查询参数 + TanStack Query。在 loader 里读登录态做重定向的权限玩法，见第 23 号权限篇。

**本条新增的坑**：

1. **在 loader 里调 hooks 或 setState**。loader 是普通异步函数，运行在组件树之外——没有 hooks 上下文，也不能改 React 状态；影响 UI 的途径只有返回数据与抛错两条。
2. **以为切 `?tab=` 不会重跑 loader**。默认会——查询串变化也算一次新的导航请求。高频 UI 参数要么用 `shouldRevalidate` 跳过（如上），要么这类参数干脆放组件 state、不进 URL（代价是不可分享，4.4.2 的取舍）。
3. **StrictMode 下 loader 看起来跑了两次**。开发模式的双调用是 React 的检查机制，生产只跑一次——所以 loader 必须幂等（GET 语义），绝不要在里面做写操作。

---

#### 7. 高频坑位补遗：组件树外导航、高亮泄漏、滚动残留、大小写

1. **axios 拦截器 / 工具函数里跳登录页，报 "useNavigate may be used only in the context of a \<Router\> component"**。症状：401 响应后页面不跳转，控制台抛错。根因：`useNavigate` 是 hook，依赖 Router 的 React 上下文，组件树外（请求封装、事件总线、全局错误处理）没有这个上下文。修法：`createBrowserRouter` 返回的 router 实例自带命令式导航 API——把实例提到独立模块，任何 JS 代码都能调：

```tsx
// src/router.ts —— router 实例单独成模块（main.tsx 只负责挂载）
import { createBrowserRouter } from 'react-router';
import { routes } from './routes';

export const router = createBrowserRouter(routes);

// src/api/client.ts —— 组件树外的导航入口
import { router } from '../router';

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    router.navigate('/login', { replace: true }); // ✓ 实例方法，不依赖 React 上下文
    throw new Error('未登录');
  }
  return (await res.json()) as T;
}
```

2. **NavLink 前缀高亮泄漏：`/` 永远高亮**。症状：顶栏"首页"在任何页面都是激活态，或者"设置"入口在所有设置子页都高亮让你分不清当前在哪。根因：`NavLink` 默认按**路径段前缀**判活——`to="/settings"` 在 `/settings/profile` 也算 active（这是导航联动的正当用法），但 `to="/"` 是万物前缀，于是永远高亮。修法：精确匹配的入口加 `end`：

```tsx
<NavLink to="/" end>首页</NavLink>        {/* end：仅精确匹配 / 时高亮 */}
<NavLink to="/settings">设置</NavLink>    {/* 不加 end：/settings/* 下保持高亮（联动） */}
```

3. **换页后滚动位置残留**。症状：长列表滚到底部 → 点进详情页，详情页从中间位置开始；或者详情页返回列表，滚动位置回到了顶部（用户失去位置）。根因：SPA 切换路由不会自动重置或恢复滚动，`document` 的滚动位置跨路由共享。修法：数据路由在根布局渲染一次 `<ScrollRestoration />`——它按 location 记录滚动位置，后退/前进时恢复原位，新导航重置到顶部：

```tsx
import { ScrollRestoration } from 'react-router';

export default function Layout() {
  return (
    <div className="app-shell">
      {/* ...外壳结构同 4.4.1 */}
      <ScrollRestoration /> {/* 全应用只放这一处（根布局内） */}
    </div>
  );
}
```

4. **路由匹配不区分大小写，`/Dashboard` 与 `/dashboard` 是同一个页面**。症状：用户手输 `/Users/42` 也能打开详情页，但 `NavLink` 高亮逻辑、埋点口径、SEO canonical 把两个 URL 当成不同页面，数据分裂。根因：`caseSensitive` 默认 `false`。修法：路由表统一加 `caseSensitive: true`，入口层对含大写的 pathname 做 301 式重定向（小写化后 `replace`）；至少也要在埋点里对 `pathname.toLowerCase()` 归一。

---

#### 8. 自测题与面试题

1. **v6 升 v7，哪些代码必须动？哪些不用动？**
   要点：开启过 `future.v7_*` 预警 flag 的 v6.4+ 项目行为零变化，主要是把导入源从 `react-router-dom` 换成 `react-router`；`usePrompt` 已删除，离开拦截只有 `useBlocker` 一条路且要求数据路由；更老的 `<Routes>` 项目先迁 `createBrowserRouter` 配置数组再谈升级。
2. **布局路由在子路由切换时为什么保持挂载？什么时候反而要用 `key` 破坏这个行为？**
   要点：匹配链中布局层不变则组件实例不卸载，`useState` 初始值不重算；表单类详情页复用同一组件、参数变化导致旧数据残留时，`key={id}` 强制重建子树最省心，代价是丢内部状态与滚动位置（4.4.2 坑 1）。
3. **`useBlocker` 与 `useBeforeUnload` 各拦什么？为什么两道防线缺一不可？**
   要点：前者拦路由器接管的应用内导航与后退键（仅数据路由可用）；后者拦刷新/关标签/跳外站（原生 `beforeunload`，文案不可定制）。两个事件集合不相交，只设一道必有漏洞。
4. **loader 取数与组件内 `useEffect` 取数怎么选？**
   要点：URL 决定数据的页面级取数走 loader（导航即并行取数、`useNavigation` 全局加载态、错误进 `errorElement`）；交互驱动的取数走组件/TanStack Query；两者可在同一页面共存分工。
5. **发版后用户从旧标签页点导航白屏，怎么自愈？**
   要点：旧 chunk 的 hash 文件名已被新部署删除，动态 `import()` 404；在 `errorElement` 里匹配 "Failed to fetch dynamically imported module" 等错误文案，用 sessionStorage 防死循环地整页刷新一次（4.4.4 坑 1）。
6. **鉴权守卫为什么必须三态？两态会发生什么？**
   要点：刷新后登录态要异步验证，验证期 user 为 null；两态把它当未登录，已登录用户 F5 会闪跳登录页；`checking` 态渲染占位不做重定向，登录成功后带 `state.from` 回跳并 `replace`（4.4.5）。
