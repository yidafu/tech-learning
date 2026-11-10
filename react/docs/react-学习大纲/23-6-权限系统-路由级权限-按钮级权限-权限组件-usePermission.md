---
title: "6. 权限系统：路由级权限、按钮级权限（权限组件/usePermission）"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [22-5-国际化-i18n-语言包组织-切换-格式化.md](22-5-国际化-i18n-语言包组织-切换-格式化.md)。

#### 6. 权限系统：路由级权限、按钮级权限（权限组件/usePermission）

**是什么。** 前端权限分两层：**路由级**——没有某模块权限的人进不了那个页面（守卫拦截 + 菜单隐藏）；**按钮级**——进了页面但没有"删除"权限的人看不到/点不了删除按钮。数据模型通常是登录接口返回的权限码数组：`permissions: ['user:list', 'user:create', 'user:delete', '*']`（`*` 表示超管）。

**为什么需要。** 前端权限**不是安全机制**——任何接口层面的越权都必须由服务端校验（用户可以绕过 UI 直接 curl）。前端权限的价值是**体验与效率**：不给用户看一个点了就报 403 的按钮、不给运营展示一辈子用不到的菜单。理解这一点，方案设计的取舍就清晰了：前端做展示层过滤，服务端做真正的鉴权，两边共用同一套权限码字典。

**怎么做（机制分步）。**

*第一步：权限的注入与查询。* 登录成功后拿 `permissions` 数组，塞进一个 Provider；查询用 `Set<string>`（`has` 是 O(1)，权限码几百个时比数组 `includes` 快一个量级），并提供 `has(code)`（单权限）与 `hasAny(codes)`（任一满足）两个查询函数。

*第二步：路由级守卫。* 路由配置里给每个路由加 `meta: { permission: 'user:list' }` 自定义字段；写一个 `RequirePermission` 守卫组件读取 meta 并判断：有权限渲染 `<Outlet/>`（子路由），无权限 `<Navigate to="/403" replace/>`。登录与否用同构的 `RequireAuth` 守卫先拦一层。菜单渲染时用同一份权限数据过滤，保证"菜单里看不到的，URL 也进不去"。

*第三步：按钮级。* 一个 `<Can>` 组件包住受限内容：有权限渲染 children，无权限渲染 fallback（默认不渲染，也可给禁用态按钮）；命令式场景用 `usePermission()` 直接拿 `has` 判断。

**代码示例。** 权限 Provider 与 Hook：

```tsx
// src/permission/index.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

interface PermissionContextValue {
  permissions: ReadonlySet<string>;
  has: (code: string) => boolean;
  hasAny: (codes: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: string[]; // 登录接口返回的权限码，如 ['user:list', 'user:delete', '*']
  children: ReactNode;
}) {
  // Set.has O(1)：权限码多时比数组 includes 快得多；useMemo 避免每次渲染重建
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const has = useCallback(
    (code: string) => permissionSet.has(code) || permissionSet.has('*'), // '*' 为超管通配
    [permissionSet],
  );
  const hasAny = useCallback((codes: string[]) => codes.some(has), [has]);

  const value = useMemo(
    () => ({ permissions: permissionSet, has, hasAny }),
    [permissionSet, has, hasAny],
  );
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission 必须在 PermissionProvider 内使用');
  return ctx;
}
```

`<Can>` 按钮级权限组件：

```tsx
// src/permission/Can.tsx
import type { ReactNode } from 'react';
import { usePermission } from './index';

export function Can({
  permission,
  any,
  fallback = null,
  children,
}: {
  /** 需要的单个权限码 */
  permission?: string;
  /** 满足其中任一即可 */
  any?: string[];
  /** 无权限时的替代渲染（可传禁用按钮、空节点等） */
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { has, hasAny } = usePermission();
  const allowed = any ? hasAny(any) : permission ? has(permission) : true;
  return <>{allowed ? children : fallback}</>;
}
```

路由级：带 `meta` 的路由配置 + 守卫组件：

```tsx
// src/router/index.tsx
import { Navigate } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './guards';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UserListPage } from '../pages/users/UserListPage';
import { UserDetailPage } from '../pages/users/UserDetailPage';
import { RoleListPage } from '../pages/roles/RoleListPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { ForbiddenPage } from '../pages/403';
import { NotFoundPage } from '../pages/404';

// 自定义路由类型：在官方 RouteObject 上扩展 meta 字段（结构类型兼容，useRoutes 直接可用）
interface AppRouteObject {
  path?: string;
  element?: React.ReactNode;
  children?: AppRouteObject[];
  meta?: { permission?: string }; // 路由级权限标记
}

export const routes: AppRouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth><AdminLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'users',
        element: <RequirePermission meta={{ permission: 'user:list' }} />,
        children: [
          { index: true, element: <UserListPage /> },
          { path: ':id', element: <UserDetailPage /> },
        ],
      },
      {
        path: 'roles',
        element: <RequirePermission meta={{ permission: 'role:list' }} />,
        children: [{ index: true, element: <RoleListPage /> }],
      },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];
```

守卫依赖的最小登录态（完整鉴权流程见产出项目的验收标准）：

```tsx
// src/stores/auth.tsx —— 最小登录态：token + 用户信息 + 权限码（阶段 5 会重构为 Zustand）
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  permissions: string[];
  isLoggedIn: boolean;
  login: (token: string, permissions: string[]) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 初始值读 localStorage：刷新后仍处于登录态（401 拦截时统一 logout）
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('permissions') ?? '[]') as string[],
  );

  const login = useCallback((nextToken: string, perms: string[]) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('permissions', JSON.stringify(perms));
    setToken(nextToken);
    setPermissions(perms);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    setToken(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({ token, permissions, isLoggedIn: token !== null, login, logout }),
    [token, permissions, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
```

守卫组件（登录守卫 + 权限守卫，同一套路的两个实例）：

```tsx
// src/router/guards.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/auth';       // 登录态：token + 当前用户信息
import { usePermission } from '../permission';

/** 登录守卫：未登录跳 /login，并记住来源页便于登录后跳回 */
export function RequireAuth() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />; // 放行：继续渲染子路由
}

/** 权限守卫：路由 meta 里声明了 permission 就校验，无权限跳 403 */
export function RequirePermission({ meta }: { meta?: { permission?: string } }) {
  const { has } = usePermission();
  if (meta?.permission && !has(meta.permission)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
```

使用侧（列表页里的删除按钮）：

```tsx
// src/pages/UserListPage.tsx（节选：按钮级权限的使用方式）
import { Can } from '../permission/Can';

export function UserListPage() {
  function deleteUser(id: string) {
    /* 调用删除接口并刷新列表（见 4.2 TanStack Query） */
  }

  return (
    <div>
      {/* 无 user:delete 权限时渲染禁用按钮，用户知道"这里有个操作但我没有权限" */}
      <Can
        permission="user:delete"
        fallback={<button disabled title="没有删除权限">删除</button>}
      >
        <button onClick={() => deleteUser('u_001')}>删除</button>
      </Can>
    </div>
  );
}
```

**常见坑。**

- **症状**：按钮藏了，但用户手敲 URL 直接进了页面。**根因**：只做了按钮级，路由没有 meta 守卫。**修法**：路由级（`RequirePermission`）与按钮级（`Can`）两层都要有，且菜单渲染用同一份权限过滤。
- **症状**：测试同学换账号登录后权限还是上一个账号的。**根因**：`PermissionProvider` 的 `permissions` 只在挂载时取值，退出登录没卸载/更新它。**修法**：把登录态（含 permissions）收敛到一个 Provider/Store，登出时整体重置；权限变化依赖数组要包含 `permissions`。
- **症状**：超管角色所有页面都 403。**根因**：后端给超管返回 `['*']`，前端 `has` 只做了精确匹配。**修法**：`has` 里处理通配 `'*'`（上面实现）；通配规则要和后端约定一致。
- **症状**：权限码字符串散落二十个文件，后端改名后全局崩。**根因**：`'user:delete'` 到处硬编码。**修法**：集中到 `src/permission/codes.ts` 的常量对象（`PERM.USER_DELETE`），改一处生效。
- **症状**：前端把用户挡住了，接口实际也没返回数据，但安全评审还是不过。**根因**：误解了前端权限的定位。**修法**：接受它只是 UX 层；接口鉴权在服务端做，前端永远不承担安全职责。

##### 补充：高频坑位补遗

- **症状**：用户手滑（或插件）把 localStorage 里的 `permissions` 改成了 `"undefined"`，应用一刷新就白屏。**根因**：`JSON.parse(localStorage.getItem('permissions') ?? '[]')` 会对 `"undefined"` 抛异常，而它写在 `useState` 初始化器里——抛错发生在 Provider 首次渲染期间，早于任何 ErrorBoundary 挂好，整棵树直接崩。**修法**：持久化数据当不可信输入，读出来先验型：

  ```tsx
  function readPermissions(): string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem('permissions') ?? '[]');
      return Array.isArray(parsed) && parsed.every((p) => typeof p === 'string') ? parsed : [];
    } catch {
      return []; // 旧版本残留、被篡改：一律回退空权限（表现为未登录/无权限，而不是白屏）
    }
  }
  ```

- **症状**：换账号登录后权限还是上一个账号的（原文坑 2 的结构性修法）。两种修法的取舍：
  - **派生式（正解）**：`PermissionProvider` 不自己持有 state，内部直接消费 `useAuth().permissions` 透传给 Context——权限随登录态自然更新，只有一个数据源。权限"热更新"（管理员收回权限的下一毫秒按钮消失）的完整形态见《react-高阶场景-第二辑/19-8-细粒度权限控制.md》路线 2。
  - **key 重挂载（应急）**：`<PermissionProvider key={userId} permissions={permissions}>`——userId 变了整棵子树重挂载，state 全清。简单粗暴，但**子树内部所有 state 一并丢失**（表单半填、滚动位置、展开态），只在无法改造 Provider 层级时使用。
- **症状**：登出后再登录另一个账号，页面"看起来正常"，但控制台能看到上个账号请求过的数据还留在内存（TanStack Query 缓存、已加载的页面 chunk）。**根因**：SPA 登出只重置了 React state，模块缓存与请求缓存不属于 React。**修法**：后台管理类系统登出时直接 `window.location.href = '/login'` 整页刷新——成本最低、最彻底；Query 缓存另配 `queryClient.clear()`。
- **症状**：`<Can any={codes}>` 里 `codes` 是动态拼出来的数组，某次拼出来是空数组，本该"默认隐藏"的按钮反而全亮了——或者反过来全灭了。**根因**：`hasAny([])` 走 `codes.some(has)`，空数组恒为 `false`，"满足任一"在零选项下的语义没有定义清楚，两种预期都有人写。**修法**：在 `hasAny` 入口显式约束（dev 下抛错最响）：

  ```tsx
  const hasAny = useCallback((codes: string[]) => {
    if (process.env.NODE_ENV !== 'production' && codes.length === 0) {
      throw new Error('hasAny([]) 语义未定义：请先确认"空列表=全禁"是不是你想要的，再显式处理');
    }
    return codes.some(has);
  }, [has]);
  ```

- **症状**：接了数据路由（`createBrowserRouter` + `loader`）之后，权限守卫"看起来"还在，但无权限用户点菜单的瞬间，受保护页面的数据请求已经发出去了。**根因**：react-router 6.4+ 的导航流程是**先跑匹配路由的 loader，再渲染 element**——你的 `RequirePermission` 是 element 层的守卫，拦得住渲染拦不住取数。**修法**：受权限保护的路由把校验挪进 loader（无权限时 `throw redirect('/403')`），或权限页干脆不用 loader 取数、回到组件内请求。

##### 补充：权限的工程落地——code review 与 CI 检查清单

**Code review 检查项**（改到相关文件的 PR 逐条过）：

- [ ] 新增路由挂了 `meta.permission`；确实公开的页面显式写 `meta: {}`，表达"有意公开"而不是"忘了配"；
- [ ] 触发 mutation 的按钮（增/删/改/导出）全部过 `<Can>`，fallback 是隐藏还是禁用态与产品确认过；
- [ ] 权限码只引用 `codes.ts` 常量（`PERM.USER_DELETE`），没有新出现的字面量；
- [ ] 菜单项来自路由表派生，没有人手往菜单组件里加第二份配置（单一数据源的完整展开见第二辑 19-8 路线 3）；
- [ ] 退出登录走了整体重置（含缓存清理或整页刷新），不是只清了 token。

**CI 检查项**（机器兜底人眼漏掉的）：

```yaml
# 权限码字面量检查：permission="xxx"（字符串字面量）即失败——引用常量的写法是 permission={PERM.X}
- name: permission-literal-check
  run: |
    if grep -rn 'permission="' src --include='*.tsx' --include='*.ts'; then
      echo "权限码必须引用 codes.ts 常量，禁止字面量"; exit 1
    fi
```

或用 ESLint 在编码期拦截（更早失败）：

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "JSXOpeningElement[name.name='Can'] JSXAttribute[name.name='permission'] Literal",
        "message": "permission 必须引用 src/permission/codes.ts 的常量，禁止字面量权限码"
      }
    ]
  }
}
```

**监控埋点**——权限系统上线后最值钱的信号是"谁被挡在了哪"：

```tsx
// 403 页曝光打点：目标是路径 + 缺的权限码。
// 突增通常不是用户乱试 URL，而是"权限配置漏了"或"菜单与路由 meta 不一致"——都能在用户投诉前发现
export function ForbiddenPage() {
  const location = useLocation();
  const state = location.state as { requiredPermission?: string } | null;
  useEffect(() => {
    tracker.track('permission_403_view', {
      path: location.pathname,
      requiredPermission: state?.requiredPermission ?? 'unknown',
    });
  }, [location.pathname, state]);
  return <div>没有访问权限，请联系管理员开通。</div>;
}
```

配套动作：`RequirePermission` 跳转时把权限码塞进 `state`（`<Navigate to="/403" state={{ requiredPermission: meta.permission }} replace />`），埋点才有数据可带。

**测试账号矩阵**：E2E 至少三个账号各跑一遍核心路径——只读账号（全链路无 mutation 按钮）、部分权限账号（验证隐藏/禁用态）、`['*']` 超管账号（验证通配）。权限 bug 几乎都出在"权限组合"上，单账号自测测不出来。

##### 补充：自测题

1. 前端权限的定位是什么？为什么安全评审不会因为"前端已经隐藏了按钮"而放行？
   要点：前端权限是体验/效率层——不给用户点了就 403 的入口；产物可被反编译、请求可被重放、DevTools 可改 state，接口鉴权必须服务端独立做。
2. `has` 为什么用 `Set` 而不是数组？`'*'` 通配在前端怎么处理，要注意什么？
   要点：`Set.has` O(1)，权限码几百个时比 `includes` 快一个量级；`has` 里同时查精确码与 `'*'`；通配语义必须与后端约定一致，否则超管在前端能看、接口却 403。
3. "用户手敲 URL 直接进了页面"是哪一层漏了？"按钮点了报 403"又是哪一层漏了？
   要点：前者缺路由级守卫（meta.permission + RequirePermission）；后者缺按钮级（`<Can>`）——两层互补，菜单还要用同一份权限过滤，保证"看不到的也进不去"。
4. 换账号后权限残留的根因？派生式 Provider 与 key 重挂载两种修法的取舍？
   要点：Provider 的 permissions 只在挂载时取值；派生式单一数据源但要求改造层级，key 重挂载一行搞定但丢子树全部 state。
5. `<Can>` 的 fallback 什么时候用 `null`（隐藏）什么时候用禁用态按钮？
   要点：产品决策不是技术决策——隐藏适合"该角色完全无关"的能力（减少噪音）；禁用 + title 提示适合"存在但未授权"的能力（可发现性、引导申请权限）。
6. 为什么菜单、路由守卫、面包屑要从同一份路由配置派生？
   要点：三处长得像、分属三个文件，人工维护必然漂移，"菜单可见但点击 403"就是典型事故形态；单一数据源的完整实现见第二辑 19-8 路线 3。

