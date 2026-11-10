---
title: "4. 主题切换（CSS 变量 + data-theme + 持久化）"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [20-3-动画-CSS-transition-状态机-framer-motion-进出场.md](20-3-动画-CSS-transition-状态机-framer-motion-进出场.md)。

#### 4. 主题切换（CSS 变量 + data-theme + 持久化）

**是什么。** 一套完整的主题切换方案由四层组成：**语义化 CSS 变量**做样式层（组件只写 `var(--color-bg)`，不知道具体色值）；**`data-theme` 属性**做开关层（`<html data-theme="dark">` 切换变量取值）；**localStorage** 做持久层（刷新后保持）；**首屏内联脚本**做 FOUC（Flash of Unstyled Content，首屏闪烁）防治层。

**为什么需要。** 如果颜色散落在各组件里写死（`background: '#fff'`），换肤等于全局搜替换，暗色模式根本做不动。CSS 变量把"色值定义"与"色值使用"分离：定义集中在 `:root[data-theme='xxx']` 两套，使用处全部 `var()`。而 FOUC 是指：主题脚本如果放在 React 的 `useEffect` 里执行，浏览器会先用默认亮色渲染几百毫秒（下载/解析 bundle 的时间），暗色用户每次刷新都被白色闪一下眼睛——夜间被闪是用户投诉率最高的暗色模式 bug。

**怎么做（机制分步）。**

*第一步*：颜色全部变量化，按"语义"而非"外观"命名——`--color-bg`（页面底色）、`--color-text`（正文）、`--color-primary`（品牌色），而不是 `--color-white`。命名的语义稳定，加第三套主题时组件一行不改。

*第二步*：默认值挂在 `:root`（亮色），暗色值挂在 `:root[data-theme='dark']`。切换主题只改 `document.documentElement.dataset.theme` 一个属性，DOM 不动、组件不重渲染，浏览器重算变量后整页换色——这是性能最优的换肤方式。

*第三步*：持久化写 localStorage；**首屏读取必须在 React 之前**——在 `index.html` 的 `<head>` 里放一段**内联同步脚本**（不引用外部文件、不 defer/async），它在浏览器渲染任何内容之前执行，把 `data-theme` 设好。CSS 加载时变量就已是暗色，一次闪烁都不会有。默认值策略：没存储过时跟随系统 `prefers-color-scheme`。

*第四步*：React 侧的 `useTheme` 做三件事：初始值**读 DOM**（`document.documentElement.dataset.theme`）而不是再读一遍 localStorage——保证与首屏脚本所见一致；`useEffect` 里同步写 DOM + localStorage；监听 `storage` 事件实现**多标签页同步**（一个标签切了主题，其他标签立即跟上）。

**代码示例。** 先看变量定义：

```css
/* styles/theme.css —— 语义化命名：组件永远只引用语义，不引用具体色值 */
:root,
:root[data-theme='light'] {
  --color-bg: #ffffff;
  --color-bg-elevated: #ffffff; /* 浮层（弹窗/下拉）底色 */
  --color-text: #1f2329;
  --color-text-secondary: #86909c;
  --color-border: #e5e6eb;
  --color-primary: #1677ff;
  --color-danger: #f53f3f;
}
:root[data-theme='dark'] {
  --color-bg: #17171a;
  --color-bg-elevated: #232326;
  --color-text: #e8e8ea;
  --color-text-secondary: #a9a9b0;
  --color-border: #3a3a3f;
  --color-primary: #4096ff;
  --color-danger: #f76560;
}
body {
  background: var(--color-bg);   /* 使用处与主题解耦 */
  color: var(--color-text);
}
```

FOUC 防治的核心——`index.html` 的内联阻塞脚本：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>后台管理系统</title>
    <link rel="stylesheet" href="/src/styles/theme.css" />
    <script>
      // 必须内联且同步执行：这段代码在任何 CSS/首帧渲染之前跑完，
      // data-theme 已就位，暗色用户刷新时不会先闪白屏（FOUC）
      (function () {
        try {
          var stored = localStorage.getItem('theme'); // 用户上次的选择
          var theme =
            stored === 'light' || stored === 'dark'
              ? stored
              : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark' // 没选过：跟随系统
                : 'light';
          document.documentElement.dataset.theme = theme;
        } catch (e) {
          /* localStorage 被禁用（隐私模式）时静默降级为默认亮色 */
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`useTheme` Hook（含多标签页同步）：

```tsx
// hooks/useTheme.ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

// 初始值读 DOM 而不是 localStorage：首屏脚本已经把 dataset.theme 设好，
// 直接读它保证 React 首帧与用户看到的完全一致
function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'; // SSR 环境兜底
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // theme 变化 → 同步到 DOM（驱动 CSS 变量切换）与 localStorage（下次首屏可读到）
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* 隐私模式下存储失败可接受 */
    }
  }, [theme]);

  // 多标签页同步：其他标签页改了 localStorage 会触发本页的 storage 事件
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggle };
}
```

切换按钮组件：

```tsx
// components/ThemeToggle.tsx
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {theme === 'dark' ? '🌙 暗色' : '☀️ 亮色'}
    </button>
  );
}
```

**常见坑。**

- **症状**：暗色用户每次刷新都先闪一下白屏。**根因**：切主题写在 React 的 `useEffect` 里——bundle 下载解析的几百毫秒里页面已经是亮色。**修法**：`index.html` 内联同步脚本（见上），这段代码不属于 React，也无法属于 React。
- **症状**：切了主题，个别组件颜色不变。**根因**：这些组件里硬编码了 `#fff`/`rgba(0,0,0,.5)` 之类的字面色值，绕过了变量体系。**修法**：全部改成语义变量；评审时用 grep 查十六进制色值可以兜底。
- **症状**：系统是暗色，但应用打开是亮色。**根因**：默认值写死 `'light'`，没有走 `prefers-color-scheme`。**修法**：首屏脚本里的三段式（存储值 → 系统偏好 → 默认亮色）。
- **症状**：两个标签页主题不同步。**根因**：只写了 localStorage，没监听 `storage` 事件（该事件只在**其他**标签页修改时触发，本页不触发）。**修法**：见 `useTheme` 的第二个 effect。
- **症状**：改成三态选择（亮/暗/跟随系统）后行为错乱。**根因**：把解析后的 `'dark'` 存进了 localStorage，"跟随系统"状态丢失，且系统切换主题时不再联动。**修法**：localStorage 存 `'light' | 'dark' | 'system'` 三态，渲染时再解析为实际主题，并监听 `matchMedia('(prefers-color-scheme: dark)')` 的 `change` 事件。

##### 补充：三态主题（亮 / 暗 / 跟随系统）完整实现

**是什么。** 把上面的修法落成完整代码：**preference（用户偏好）与 resolved（实际渲染主题）分离**——存储与多标签页同步都针对三态 preference；只有 resolved 才写进 `data-theme` 驱动 CSS 变量。用户选了"跟随系统"后，系统在暗色与亮色之间切换时页面实时联动。

**代码示例。**

```tsx
// hooks/usePreferredTheme.ts
import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

// 模块级只建一次 MediaQueryList；systemDark 变化是 resolved 变化的第二条来源
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');

/** 解析是纯函数：preference + 系统暗色 → 实际主题。三态与二态的耦合只发生在这一行 */
function resolve(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

/** 读取即校验：localStorage 里可能是旧版本的 'blue'、被手改的乱串——白名单外的值一律回退 */
function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function usePreferredTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => darkMq.matches);

  // 跟随系统的核心：系统切主题的瞬间（含 macOS 自动切换）触发 change
  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    darkMq.addEventListener('change', onChange);
    return () => darkMq.removeEventListener('change', onChange);
  }, []);

  const resolved = resolve(preference, systemDark);

  // 只有 resolved 才碰 DOM：preference='system' 且系统切暗时，这里同样会被驱动
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, next); // 存三态偏好，不是解析结果
    } catch {
      /* 隐私模式 */
    }
    setPreferenceState(next);
  }, []);

  // 多标签页：storage 同步 preference，各标签页各自 resolve（系统状态天然一致）
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
        setPreferenceState(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { preference, resolved, setPreference };
}
```

设置页的三选一控件（`aria-pressed` 让读屏器感知当前项）：

```tsx
// components/ThemeSetting.tsx
import { usePreferredTheme } from '../hooks/usePreferredTheme';

export function ThemeSetting() {
  const { preference, setPreference } = usePreferredTheme();
  return (
    <div role="group" aria-label="主题模式">
      {(['light', 'dark', 'system'] as const).map((value) => (
        <button key={value} aria-pressed={preference === value} onClick={() => setPreference(value)}>
          {value === 'light' ? '亮色' : value === 'dark' ? '暗色' : '跟随系统'}
        </button>
      ))}
    </div>
  );
}
```

首屏脚本同步升级为三态（替换原双态版本里的三段式）：

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var pref =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : 'system';
      var theme =
        pref === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : pref;
      document.documentElement.dataset.theme = theme;
    } catch (e) {}
  })();
</script>
```

**关键取舍。** `resolved` 不单独存——任何时刻都能由 preference + 系统状态推导，存了反而引入第三份会漂移的数据；React 侧初始值仍**读 DOM 而不是 localStorage**（沿用原文原则），preference 的初始值在首屏脚本写入 DOM 后再读也来得及。

##### 补充：运行时品牌色切换（租户可选主题色）

**是什么。** SaaS 场景：租户管理员选一个品牌色，全站的按钮、链接、高亮即时变色并持久化——不重新构建、不改两套主题文件。做法是把品牌色拆成 HSL 三个分量变量，派生色（hover/禁用/选中）用 `color-mix()` 从主色**计算**出来，暗色下只调整亮度分量。

**为什么这样做。** 如果品牌色的 hover 态写死一个 hex，每种品牌色都要人肉配一套派生色，租户自选色就无从谈起。`color-mix(in srgb, 主色 88%, black)` 让派生关系变成"公式"：换主色，全家自动重算。

```css
/* styles/brand.css */
:root {
  --brand-h: 215; /* 色相 */
  --brand-s: 90%; /* 饱和度 */
  --brand-l: 47%; /* 亮度 */
  --color-primary: hsl(var(--brand-h) var(--brand-s) var(--brand-l));
  /* 派生色全部由公式计算：换主色零改动 */
  --color-primary-hover: color-mix(in srgb, var(--color-primary) 88%, black);
  --color-primary-active: color-mix(in srgb, var(--color-primary) 76%, black);
  --color-primary-disabled: color-mix(in srgb, var(--color-primary) 35%, var(--color-bg));
}
:root[data-theme='dark'] {
  /* 暗色不换色相：抬亮度、稍降饱和，保证在深底上"亮"得出来 */
  --color-primary: hsl(var(--brand-h) calc(var(--brand-s) * 0.85) 62%);
}
```

切换逻辑（存"分量"而非原始 hex，首屏脚本无需任何转换逻辑就能注入）：

```tsx
// hooks/useBrandColor.ts
import { useCallback, useEffect, useState } from 'react';

const KEY = 'brand-hsl'; // 存 "215,90%,47%"：首屏脚本 split 一下就能用
const FALLBACK = '215,90%,47%';

function apply(vars: string) {
  const [h, s, l] = vars.split(',');
  const root = document.documentElement;
  root.style.setProperty('--brand-h', h);
  root.style.setProperty('--brand-s', s);
  root.style.setProperty('--brand-l', l);
}

export function useBrandColor() {
  const [brand, setBrand] = useState(() => localStorage.getItem(KEY) ?? FALLBACK);

  useEffect(() => {
    apply(brand);
    try {
      localStorage.setItem(KEY, brand);
    } catch {
      /* 隐私模式 */
    }
  }, [brand]);

  const setBrand = useCallback((hex: string) => {
    // hex → hsl 由 JS 算好再存分量（转换函数此处省略，任何 hexToHsl 实现皆可）
    const { h, s, l } = hexToHsl(hex);
    setBrand(`${h},${s}%,${l}%`);
  }, []);

  return { brand, setBrand };
}
```

首屏注入（放在主题脚本之后，同一次解析内完成，无闪烁；存的就是分量，脚本零转换逻辑）：

```html
<script>
  (function () {
    try {
      var p = (localStorage.getItem('brand-hsl') || '').split(',');
      if (p.length === 3) {
        var s = document.documentElement.style;
        s.setProperty('--brand-h', p[0]);
        s.setProperty('--brand-s', p[1]);
        s.setProperty('--brand-l', p[2]);
      }
    } catch (e) {}
  })();
</script>
```

**边界。** `color-mix()` 是 Baseline 2023 特性，旧内核不认——CSS 里未知函数整条声明失效，静态 fallback 变量默认值就能接住。另一个硬约束是**对比度**：品牌色作为文字色时须与背景保持 WCAG ≥ 4.5:1，选色器里用相对亮度公式实时校验并警示，别等用户投诉"字看不清"。

##### 补充：高频坑位补遗

- **症状**：点切换的一瞬间，全页几十个元素各自过渡到新配色，五颜六色闪一遍。**根因**：全局样式写了 `* { transition: background-color .2s, color .2s }`，切主题变成"全员动画"。**修法**：颜色过渡默认不启用，切换时先禁再换：

  ```ts
  function switchTheme(next: string) {
    const root = document.documentElement;
    root.classList.add('theme-switching'); // .theme-switching * { transition: none !important; }
    root.dataset.theme = next;
    // 双 rAF 后移除：新配色已按"无过渡"生效，移除类不会再触发过渡
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove('theme-switching')),
    );
  }
  ```

- **症状**：暗色模式下，手机浏览器地址栏/状态栏还是一片白。**根因**：`<meta name="theme-color">` 没跟随切换，它控制的是浏览器 UI 框架的颜色。**修法**：CSS 里放两条 media 变体（`media="(prefers-color-scheme: dark)"`）或 JS 切主题时同步 `meta[name="theme-color"]` 的 content。
- **症状**：自己写的组件都变暗了，第三方组件库（antd 的 Table、Modal）还是白底黑字。**根因**：组件库有自己的 token 系统，不读你的 CSS 变量。**修法**：antd 用 `ConfigProvider` 的 `theme.darkAlgorithm` + token 映射你的语义变量；毕设项目里会实际接一次。
- **症状**：暗色下阴影/遮罩层要么看不见要么脏成一团。**根因**：阴影写死 `rgba(0,0,0,.15)`——暗色底上黑色阴影对比度趋近于零。**修法**：把 `--shadow-color`、`--overlay` 也纳入语义变量，两套主题各给取值（暗色常用更深的黑 + 更低透明度，遮罩甚至要反向提亮）。
- **症状**：切换按钮点击后没反应，检查发现 `dataset.theme` 变成了 `"blue"`。**根因**：localStorage 被旧版本代码或用户手改写入了非法值，代码没校验直接写入 DOM，CSS 选择器 `:root[data-theme='dark']` 全部失配。**修法**：读取处一律白名单校验（见 `readPreference`），非法值回退默认——持久化数据永远当不可信输入处理。

