---
title: "A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）"
---

## A2. 弹层体系（Popover/Select/Tooltip/DatePicker 的共同地基）

- **floating-ui**：定位计算 + flip/shift/size 中间件；为什么不要自己写定位
- Portal 挂载点与 z-index 治理（多级弹层的层级管理器）
- hover 意图延时（进 100ms 出 300ms）、级联菜单 hover 链保持
- 滚动/resize 时跟随重定位；`useClickOutside`（mousedown 阶段、忽略触发元素、多弹层嵌套豁免）

### A2.1 弹层的四个公共难题

Popover、Select 下拉、Tooltip、DatePicker 面板，长得不同，底层是同一道题：**把一块 UI 放到"另一个元素旁边"，并且在整个生命周期里保持正确**。拆开是四件事：

1. **定位**：初始放在哪（placement × 对齐）；
2. **边界**：视口/滚动容器放不下怎么办（翻转/平移/限高）；
3. **层级与挂载**：怎么不被父级 `overflow: hidden` 裁掉、不被别的元素盖住、z-index 谁高谁低；
4. **时序**：什么时候开（hover 意图）、什么时候关（点外/Esc/滚动）、开了以后怎么跟随（滚动/resize 重算）。

floating-ui 解决 1、2 和 4 的重算部分；Portal 与层级管理器解决 3；意图延时与 click outside 解决 4 的其余部分。逐个来。

### A2.2 computePosition 与中间件机制

**是什么**：floating-ui（前身 Popper.js）把"定位"抽象成一个纯函数：输入参考元素与浮动元素的几何信息，输出浮动元素的 x/y 坐标。`@floating-ui/dom` 包提供底层 `computePosition`，所有上层 API（React hooks、Vue 适配）都构建在它之上。

**中间件机制分步**：

1. 按当前 `placement`（如 `bottom-start`）计算初始坐标：参考元素的哪条边 + 起始/居中/末尾对齐，加上边距；
2. 把坐标依次传给 middleware 链。每个中间件拿到一份状态（含双方 `rects`、当前坐标、当前 placement、`middlewareData`），可以**改坐标、改 placement，或要求 reset 重跑**；
3. 每个中间件的产出写进 `middlewareData.[name]`，后面的中间件与调用方都能读；
4. 全链跑完返回 `{ x, y, placement, middlewareData }`——`placement` 可能与传入不同（被 flip 改过），UI 箭头要跟着它调整。

常用中间件职责表（顺序敏感，通常 offset → flip → shift → size）：

| 中间件 | 职责 | 典型用法 |
|---|---|---|
| `offset(n)` | 沿主轴加间距（弹层与触发器的间隙） | Tooltip 离触发器 6px |
| `flip()` | 当前 placement 溢出时换边（可配 `fallbackPlacements` 候选序） | 底部放不下翻到顶部 |
| `shift()` | 沿轴平移让浮动元素回到边界内（`padding` 留边距，可配 limiter） | 视口左右边缘左右滑移 |
| `size()` | 把可用空间/参考元素尺寸喂给回调，由你设置宽高 | Select 下拉与触发器同宽、最大高度不超过可用空间 |
| `inline()` | 参考元素是行内文本跨行时按光标所在行矩形定位 | 富文本里给某个词加 popover |
| `hide()` | 检测被裁剪/参考元素滚出视口时给出标记，由你隐藏 | Tooltip 跟随元素滚走后消失 |

**手动接入的完整代码**（不用任何 React hook，看清它本质是个几何函数）：

```tsx
// manual-position.ts
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

export function attachFloating(
  trigger: HTMLElement,
  popup: HTMLElement,
  onDetach: (cleanup: () => void) => void
) {
  const update = () => {
    computePosition(trigger, popup, {
      placement: 'bottom-start',
      strategy: 'fixed', // fixed + Portal 挂 body：祖先 overflow/transform 都裁不到（见 A2.5）
      middleware: [
        offset(4),                  // 与触发器空开 4px
        flip({ fallbackPlacements: ['top-start', 'right'] }), // 底部不行翻顶部，再不行转右侧
        shift({ padding: 8 }),      // 左右溢出时平移回来，视口留 8px 呼吸边距
      ],
    }).then(({ x, y }) => {
      // left/top 固定 0，用 transform 移动：走合成器，不触发布局重排
      Object.assign(popup.style, {
        left: '0',
        top: '0',
        transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`, // 取整防亚像素模糊
      });
    });
  };

  // autoUpdate：挂载期间持续调用 update（职责详见 A2.8）
  onDetach(autoUpdate(trigger, popup, update));
}

// 用法示例（命令式风格）：
//   const stop = { fn: () => {} };                      // 先准备清理函数容器
//   attachFloating(triggerEl, popupEl, (cleanup) => { stop.fn = cleanup; });
//   popup.classList.add('my-popup');                    // .my-popup 需有 CSS：position: fixed;
//   // 组件卸载时：stop.fn();   // 停掉滚动/resize 监听
```

### A2.3 useFloating 最小接入

React 侧用 `@floating-ui/react` 包（它依赖 `@floating-ui/react-dom`，后者才是 hooks 层；装 `@floating-ui/react` 即全量）。它把 A2.2 的命令式过程包成 refs + styles + 交互 props：

```tsx
// Popover.tsx —— 最小可用的受控 Popover
import * as React from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate, // 关键一行：挂载期间自动重定位（滚动/resize/尺寸变化）
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });

  // 交互行为也是可组合的"中间件"：点击开合、Esc/点外关闭、dialog 语义
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <button ref={refs.setReference} {...getReferenceProps({ onClick: () => setOpen((v) => !v) })}>
        打开弹层
      </button>
      {open && (
        <FloatingPortal> {/* Portal 到 body，躲开祖先裁剪与 z-index（A2.5） */}
          <div
            ref={refs.setFloating}
            style={floatingStyles}   // 已含 position: fixed + transform 定位
            className="popover"
            {...getFloatingProps()}
          >
            {children}
            <button onClick={() => setOpen(false)}>关闭</button>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
```

`refs.setReference` / `refs.setFloating` 是 callback ref，把两个真实 DOM 交给 floating-ui；`floatingStyles` 是算好的定位样式对象。Select 下拉要加 `size` 中间件：

```ts
import { size } from '@floating-ui/dom'; // @floating-ui/react 同名再导出，二选一导入即可

middleware: [
  offset(4),
  flip(),
  shift({ padding: 8 }),
  size({
    padding: 8,
    apply({ rects, elements, availableHeight }) {
      // 宽度跟随触发器；最大高度不超过当前可用空间（选项多时内部滚动）
      Object.assign(elements.floating.style, {
        width: `${rects.reference.width}px`,
        maxHeight: `${Math.max(availableHeight, 160)}px`,
        overflowY: 'auto',
      });
    },
  }),
],
```

### A2.4 为什么不要自己写定位

"自己写个 `getBoundingClientRect` 相加减去 scrollTop 不就行了"——三周后必然在这个清单上阵亡（穷举）：

1. **视口边缘翻转**：你要同时处理 12 种 placement 的四边溢出判定、候选回退顺序、翻转后与 offset 的合成、交叉轴 start/end 对齐（RTL 下还要镜像）。手写版通常只覆盖"下方放不下翻上方"一种，用户把触发器拖到视口右下角时横轴溢出没人管——Select 下拉最后一项直接看不见。`flip` 的溢出判定还要区分"溢出多少以内可接受"（padding）与"完全放不下转 fallback"，这是经验参数的集合。
2. **滚动跟随**：弹层开着的时候页面滚了，`fixed` 元素不会自己动。你要监听所有能让参考元素移动的东西：window scroll、resize、每个滚动容器的 scroll。致命细节：**`scroll` 事件不冒泡**（只有 document 自身滚动会派发到 document），挂在 window 上的冒泡监听收不到内层 `div overflow: auto` 的滚动，必须 `addEventListener('scroll', fn, true)` 走捕获，或者递归遍历祖先逐个挂。`autoUpdate` 的第一职责就是这层捕获监听。
3. **嵌套滚动容器与包含块陷阱**：祖先链上可能有多个 `overflow: auto/hidden`（每个都可能裁剪或滚动）；更阴的是祖先带 `transform / filter / will-change / contain` 时，`position: fixed` 的包含块会从视口变成该祖先——"弹层在带进出场动画的容器里位置乱飘"的经典 bug 就是它。floating-ui 会检测 clipping ancestors 并在计算中处理；自己写大概率连发现这问题都要靠用户工单。
4. 附赠两个小鬼：**亚像素取整**（坐标小数导致文字模糊，所以要 `Math.round`）；**iframe 边界**（组件被嵌进 iframe 时"视口"该算哪个）。

结论：定位计算的边界情况数量远超业务组件本身，这是"用轮子"比"造轮子"收益最大的地方，没有之一。

### A2.5 Portal 挂载点治理

**为什么必须 Portal**：弹层若留在原 DOM 位置，会被祖先的 `overflow: hidden` 裁掉、被祖先的 `z-index` 上下文压住、被 `transform` 祖先劫持 fixed 定位。挂到 `document.body` 下的一孔，三个问题同时消失。

**挂载点不能写死成 body**，因为：全屏滚动的Modal里再开 Select，下拉应该跟着 Modal 的滚动容器（挂 body 会导致下拉不随 Modal 滚动）；局部主题容器（暗色区域）里的弹层要继承主题 class。所以库的标准做法是 **可配置的挂载容器**：antd 叫 `getPopupContainer`（可挂在 ConfigProvider 上全局统一），自建库用 context 提供默认值：

```tsx
// Portal.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';

const PortalContext = React.createContext<HTMLElement | null>(null); // 默认 null → 挂 body

export function PortalProvider({
  container,
  children,
}: {
  container: HTMLElement | (() => HTMLElement);
  children: React.ReactNode;
}) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    // 容器可能是延迟就绪的（比如某个 ref 指向的 div），effect 里再取
    setEl(typeof container === 'function' ? container() : container);
  }, [container]);
  return el ? <PortalContext.Provider value={el}>{children}</PortalContext.Provider> : <>{children}</>;
}

export function Portal({ children }: { children: React.ReactNode }) {
  const ctxContainer = React.useContext(PortalContext);
  const [host] = React.useState(() => {
    if (typeof document === 'undefined') return null; // SSR 守卫（A7）
    return document.createElement('div');             // 每个弹层一个宿主 div，卸载时连同移除
  });

  React.useEffect(() => {
    if (!host) return;
    (ctxContainer ?? document.body).appendChild(host);
    return () => { host.remove(); };                  // 卸载即清理，不留僵尸节点
  }, [host, ctxContainer]);

  return host ? createPortal(children, host) : null;
}
```

注意挂进自定义容器后，`strategy: 'fixed'` 可能失效（容器带 transform 时），此时应换 `strategy: 'absolute'` 并让 autoUpdate 继续跑——这也是"挂载点策略"与"定位策略"必须配套的原因。

### A2.6 z-index 治理：多级弹层层级管理器

**问题**：Modal（z-index 1000）里开 Select，Select 下拉也是 1000——同值时看 DOM 顺序，但两者都 Portal 到 body 下不同宿主 div，顺序不可控。写死"Select 1050、Tooltip 1070"（Bootstrap 的做法）在"Modal 里开 Modal 里再开 Popover"面前破产：第二个 Modal 的 z-index 无论如何配不过第一个 Modal 里的 Popover。

**思路**：全局计数器 + 栈。每打开一层弹层就入栈并领一个递增的 z-index（**后开的总在先开的上面**，符合直觉）；关闭时出栈并回收栈顶。嵌套弹层天然正确：父弹层开子弹层时子层后入栈所以更高。实现：

```tsx
// usePopupLayer.ts —— 弹层层级管理器
import * as React from 'react';

const BASE_Z_INDEX = 1000;        // 你的库的层级起点，避开业务常用值
const openLayers = new Set<number>(); // 当前打开的所有层的 z-index 集合
let top = BASE_Z_INDEX;           // 栈顶

function acquireZIndex(): number {
  top += 1;
  openLayers.add(top);
  return top;
}

function releaseZIndex(z: number): void {
  openLayers.delete(z);
  // 栈空则归零；否则回到剩余层的最大值，防止计数器只增不减
  top = openLayers.size === 0 ? BASE_Z_INDEX : Math.max(...openLayers);
}

/** 弹层打开时领号，关闭时归还 */
export function usePopupLayer(open: boolean): number {
  const [zIndex, setZIndex] = React.useState(BASE_Z_INDEX);

  React.useEffect(() => {
    if (!open) return;
    const z = acquireZIndex(); // 打开时入栈：后开的总盖住先开的
    setZIndex(z);
    return () => {
      releaseZIndex(z);        // 关闭出栈（含卸载兜底）
      setZIndex(BASE_Z_INDEX);
    };
  }, [open]);

  return zIndex;
}
```

使用方式：弹层根元素 `style={{ zIndex }}`。antd v5 在此基础上做了工业化版本：按组件类型设基准（弹层类上下文 `useZIndex`），再在基准上自增，保证"Tooltip 永远比 Modal 高"这类产品级约定。另外一个零成本技巧：同一父节点下**后 append 的兄弟天然盖住先 append 的**（同 z-index 时），所以"打开时才 append 宿主 div"本身就自带一层排序——计数器是对跨宿主、跨容器场景的补全。

### A2.7 hover 意图延时与级联链保持

**为什么需要**：鼠标划过触发器去别处，路径上蹭到的每个 Tooltip 都会闪现——噪音。解法是**不对称延时**：进入要快（100ms，真想看的人等不起），离开要慢（300ms，给手滑的人反悔时间）。**级联菜单**（hover 展开子菜单）依赖同一个机制：从父菜单项斜着移到子菜单需要时间，300ms 的关闭宽限 + 子菜单自身 hover 即续命，构成"hover 链"。

完整 hook（进 100ms / 出 300ms，参考与弹层两侧都要挂事件）：

```tsx
// useHoverIntent.ts
import * as React from 'react';

export interface UseHoverIntentOptions {
  openDelay?: number;    // 进入延时，默认 100ms
  closeDelay?: number;   // 离开延时，默认 300ms
  onOpenChange: (open: boolean) => void;
}

export function useHoverIntent({
  openDelay = 100,
  closeDelay = 300,
  onOpenChange,
}: UseHoverIntentOptions) {
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange; // 回调永远用最新的
  }, [onOpenChange]);

  const clearBoth = React.useCallback(() => {
    if (openTimer.current !== null) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  React.useEffect(() => clearBoth, [clearBoth]); // 卸载清计时器（A3 之前最常见的泄漏源）

  return React.useMemo(() => ({
    // 挂在触发器上
    getReferenceProps: () => ({
      onPointerEnter: () => {
        // 进入触发器：先撤销"计划中的关闭"（hover 链续命的关键），再安排打开
        if (closeTimer.current !== null) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        if (openTimer.current === null) {
          openTimer.current = window.setTimeout(() => {
            openTimer.current = null;
            onOpenChangeRef.current(true);
          }, openDelay);
        }
      },
      onPointerLeave: () => {
        // 离开触发器：撤销"计划中的打开"，安排延迟关闭
        if (openTimer.current !== null) {
          window.clearTimeout(openTimer.current);
          openTimer.current = null;
        }
        if (closeTimer.current === null) {
          closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            onOpenChangeRef.current(false);
          }, closeDelay);
        }
      },
    }),
    // 挂在弹层本体上：进入弹层 = 取消关闭；离开弹层 = 再次安排关闭（链式菜单的子级续命）
    getFloatingProps: () => ({
      onPointerEnter: () => {
        if (closeTimer.current !== null) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
      },
      onPointerLeave: () => {
        if (closeTimer.current === null) {
          closeTimer.current = window.setTimeout(() => {
            closeTimer.current = null;
            onOpenChangeRef.current(false);
          }, closeDelay);
        }
      },
    }),
  }), [openDelay, closeDelay, clearBoth]);
}
```

要点：**进入先撤销关闭、离开先撤销打开**——两个计时器互为对偶，才不会出现"进了还关、出了还开"的抖动。300ms 宽限对斜向移动到子菜单经常不够（子菜单离得远时），floating-ui 给的彻底解法是 **safePolygon**：以鼠标当前位置和子菜单的两个近角构成三角形，指针在三角形内就视为"在路上"，整条链不关：

```tsx
// floating-ui 侧的等价能力（对照学习）
import { safePolygon } from '@floating-ui/react';
import { useHover } from '@floating-ui/react';

const hover = useHover(context, {
  delay: { open: 100, close: 300 }, // 与上面的手写参数一致
  handleClose: safePolygon(),       // 三角形安全区：斜着移动到子菜单不关
});
```

### A2.8 autoUpdate 的职责

弹层打开后世界还在动：页面滚动、窗口缩放、内容图片加载把参考元素挤走、弹层自身内容变化改变高度。`autoUpdate(reference, floating, update)` 在挂载期间持续触发 `update`，返回清理函数。它监听的东西：

1. **祖先滚动**：对参考元素的每个滚动祖先挂 `scroll` 监听（capture 阶段——因为 scroll 不冒泡，A2.4 讲过）；
2. **祖先与两元素自身的尺寸变化**：`ResizeObserver`（图片加载、字体切换、内容增删都会触发）；
3. **window resize**：视口变化重算（flip/shift 的结论可能整个反转）；
4. 可选 `animationFrame: true`：每帧重算（参考元素被 CSS animation 持续移动时的兜底，成本高，别默认开）。

React 侧就是 A2.3 里那行 `whileElementsMounted: autoUpdate`。它返回的清理函数会被 floating-ui 在卸载时调用，所以不会泄漏监听。

### A2.9 useClickOutside 的完整实现

**三个细节先讲清楚，再上代码**：

- **为什么 mousedown 而不是 click**：其一，click 的目标是 mousedown 与 mouseup 元素的共同祖先——在弹层里按下、拖到外面松手，click 会落在弹层外的元素上，纯 click 方案会把"拖选弹层内文本"误判为外部点击而关门；其二，mousedown 先于 focus/blur 与一切 click 逻辑发生，关门动作不会和"焦点已经移进去又被关掉"打架；其三，click 更容易被别的库 `preventDefault` 吞掉，mousedown 语义更底层、干扰更少。
- **忽略触发元素**：点触发器开弹层的那一下，如果同一事件既被触发器的 onClick 翻转 open、又被 clickOutside 关一次，就会开合打架。用 mousedown 方案后天然规避大半，但严谨实现仍要把触发元素纳入"不算外部"的判定（下面代码通过把触发器一并 contains 检查）。
- **多弹层嵌套豁免**：点子菜单（它也是一个注册过的弹层）不该把父弹层关掉——维护一个"当前打开弹层集合"，点击落在**任何**已注册弹层内就视为内部点击。

```tsx
// useClickOutside.ts
import * as React from 'react';

/** 全局：当前打开的所有弹层根节点（多弹层嵌套豁免的数据基础） */
const openLayers = new Set<HTMLElement>();

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: (event: MouseEvent) => void,
  enabled = true
) {
  const handlerRef = React.useRef(onOutside);
  React.useEffect(() => {
    handlerRef.current = onOutside; // 回调最新化，避免闭包过期
  }, [onOutside]);

  React.useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    openLayers.add(el); // 注册自己：其它层的豁免判定能看见我

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // ① 点在自己内部 → 不管
      if (el.contains(target)) return;
      // ② 点在其它已打开弹层内（子菜单/子弹层）→ 豁免：那是"那一层"的内部点击
      for (const layer of openLayers) {
        if (layer !== el && layer.contains(target)) return;
      }
      // ③ 真正的外部点击
      handlerRef.current(e);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      openLayers.delete(el); // 注销（StrictMode 双挂载/卸载也安全：Set 去重）
    };
  }, [enabled, ref]);
}
```

使用约定：`enabled` 与弹层挂载同步开（`useClickOutside(layerRef, close, open)`），保证 `ref.current` 已经挂好。floating-ui 的 `useDismiss(context)` 把这套逻辑（外加 Esc、焦点原因判定）做成了声明式版本，能力对照着学即可。

### A2.10 常见坑

1. **弹层闪烁开关**。症状：点击触发器，弹层开了立刻关。根因：触发器 onClick 用 click 开层，clickOutside 的 mousedown 先把上一次的层关了/或同一事件被两处处理，时序纠缠。修法：统一事件相位——外部关闭用 mousedown，开合用 click，且开层那一刻的事件不再交给 clickOutside（A2.9 的判定顺序已处理）。
2. **`overflow: hidden` 容器里弹层被裁**。症状：Select 放在卡片里，下拉只有一条缝。根因：没走 Portal，或 Portal 挂到了带裁剪的容器。修法：默认挂 body + `strategy: 'fixed'`；必须跟随滚动容器时挂进容器并改 `strategy: 'absolute'`（A2.5）。
3. **子菜单 hover 不稳定**。症状：移向子菜单途中父层关闭。根因：只有固定的 closeDelay，没有安全区。修法：加 safePolygon（或手写三角形判定）；同时检查 getFloatingProps 是否真的挂到了弹层根元素上（挂在子元素上等于没续命）。
4. **z-index 军备竞赛**。症状：业务页写了 `z-index: 99999` 盖住你的 Modal。根因：层级靠魔法数。修法：库内计数器治理（A2.6）+ 文档声明库的层级起点（如 1000），并提供 `zIndex` prop 作为逃生舱。

### A2.11 滚动容器感知与边界翻转策略

**是什么**：A2.2 的 `flip` 默认以"裁剪祖先 + 视口"为溢出判定基准。但两类产品需求超出了这个默认：① 弹层挂进滚动容器（A2.5 的 `getPopupContainer` 形态）时，翻转与限高的基准应该是**容器**而不是视口——别遮住容器里的固定表头、别溢出卡片边界；② 挂 body 的 Tooltip，锚点被容器滚出可视区时应该整体消失（而不是贴着容器边缘跟着挤）。本节把"边界"从 floating-ui 的默认策略掰开，给出可单测的容器翻转决策。

**为什么难**：

1. Portal 到 body 之后，滚动容器对弹层**不构成裁剪**（弹层不在它的子树里），floating-ui 的 clipping ancestors 检测不到它——翻转判定退化成纯视口，与产品预期不符；
2. 坐标系混乱：锚点的 `getBoundingClientRect` 是视口坐标，容器的也是视口坐标，判定"锚点相对容器还有多少余量"必须先做一次坐标系换算，而容器自身可能也在被页面滚动；
3. 嵌套滚动容器（卡片在长页里，卡片内还有内滚）取哪一层？答案固定：**最近的 `overflow != visible` 祖先**。

**机制**：

1. 决策器是纯函数：输入"锚点相对容器的矩形 + 容器可视矩形 + 弹层尺寸 + 首选方向"，输出 `placement / 是否 end 对齐 / 双侧都溢出（该收缩而不是翻转）"；
2. 换算在 hook 里做：`anchorRect.top - containerRect.top` 得到相对坐标；
3. 监听容器 `scroll`（rAF 合并，惯性滚动不掉帧）+ window resize；
4. 锚点滚出容器的判定交给 floating-ui 的 `hide` 中间件（挂 body 场景），两套机制互补不重复。

```ts
// computeContainerPlacement.ts —— 纯函数：以滚动容器为基准的翻转决策
export type SidePlacement = 'bottom-start' | 'top-start' | 'bottom-end' | 'top-end';

export interface Rect { top: number; bottom: number; left: number; right: number }

export interface ContainerPlacementInput {
  /** 锚点相对容器的矩形（视口坐标相减得到，见 hook） */
  anchor: Rect;
  /** 容器的可视矩形（原点系：0,0 起） */
  container: { top: number; bottom: number; left: number; right: number };
  popupSize: { width: number; height: number };
  offset: number;
  preferred: SidePlacement;
}

export interface ContainerPlacementResult {
  placement: SidePlacement;
  /** 交叉轴溢出：锚点右缘 + 弹层宽 > 容器右缘 → 改 end 对齐 */
  crossAlignEnd: boolean;
  /** 主轴双侧都放不下：调用方应转"收缩 maxHeight"策略（通常配 size 中间件） */
  overflowBoth: boolean;
}

export function computeContainerPlacement(
  input: ContainerPlacementInput
): ContainerPlacementResult {
  const { anchor, container, popupSize, offset, preferred } = input;
  const vertical = preferred.startsWith('bottom') ? 'bottom' : 'top';
  const crossAlignEnd = anchor.left + popupSize.width > container.right;

  const spaceBelow = container.bottom - anchor.bottom - offset;
  const spaceAbove = anchor.top - container.top - offset;
  const need = popupSize.height;

  // 翻转规则：首选侧放不下、且对侧更宽裕 → 翻；双侧都比较 → 取大者（翻转表的可读写法）
  let resolved: 'bottom' | 'top' = vertical;
  if (vertical === 'bottom' && spaceBelow < need && spaceAbove > spaceBelow) resolved = 'top';
  if (vertical === 'top' && spaceAbove < need && spaceBelow > spaceAbove) resolved = 'bottom';

  const align = crossAlignEnd || preferred.endsWith('end') ? 'end' : 'start';
  return {
    placement: `${resolved}-${align}` as SidePlacement,
    crossAlignEnd,
    overflowBoth: (resolved === 'bottom' ? spaceBelow : spaceAbove) < need,
  };
}
```

```tsx
// useContainerAwarePlacement.ts —— 挂进滚动容器的弹层：滚动/缩放时以容器为基准重判
import * as React from 'react';
import {
  computeContainerPlacement,
  type ContainerPlacementResult,
  type SidePlacement,
} from './computeContainerPlacement';

export function useContainerAwarePlacement(
  open: boolean,
  refs: {
    anchor: React.RefObject<HTMLElement | null>;
    container: React.RefObject<HTMLElement | null>;
    popup: React.RefObject<HTMLElement | null>;
  },
  preferred: SidePlacement,
  onChange: (result: ContainerPlacementResult) => void
) {
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  React.useEffect(() => {
    if (!open) return;
    const anchor = refs.anchor.current;
    const container = refs.container.current;
    const popup = refs.popup.current;
    if (!anchor || !container || !popup) return;

    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const cRect = container.getBoundingClientRect();
      const aRect = anchor.getBoundingClientRect();
      // 视口坐标 → 相对容器坐标（容器自身可能正被页面滚动带着走，所以每次现算）
      onChangeRef.current(
        computeContainerPlacement({
          anchor: {
            top: aRect.top - cRect.top,
            bottom: aRect.bottom - cRect.top,
            left: aRect.left - cRect.left,
            right: aRect.right - cRect.left,
          },
          container: { top: 0, bottom: cRect.height, left: 0, right: cRect.width },
          popupSize: { width: popup.offsetWidth, height: popup.offsetHeight },
          offset: 4,
          preferred,
        })
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(evaluate); // 惯性滚动：一帧最多评一次
    };

    evaluate();
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      container.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [open, refs, preferred]);
}
```

挂 body 场景的"锚点滚出即隐藏"用 `hide` 中间件（不必手写）：

```ts
import { flip, hide, offset } from '@floating-ui/dom';

// Tooltip 挂 body：锚点被任意裁剪祖先滚出 → middlewareData.hide.referenceHidden = true
const middleware = [offset(6), flip(), hide({ strategy: 'referenceHidden' })];
// 渲染侧：const { hide: hideData } = middlewareData;
// hideData.referenceHidden === true 时给弹层 visibility: hidden（保留布局，避免闪烁重排）
```

`hide` 的两种 strategy 语义：`referenceHidden` 看**锚点**是否被裁（Tooltip 用——锚点都看不见了提示无意义）；`escaped` 看**弹层自身**是否溢出边界（Select 下拉用——宁可整体隐藏不留半截）。

最小测试（决策表的三个关键分支）：

```ts
// computeContainerPlacement.test.ts
import { describe, expect, it } from 'vitest';
import { computeContainerPlacement } from './computeContainerPlacement';

const BASE = {
  container: { top: 0, bottom: 400, left: 0, right: 300 },
  popupSize: { width: 100, height: 80 },
  offset: 4,
  preferred: 'bottom-start' as const,
};

describe('computeContainerPlacement', () => {
  it('下方余量充足：保持首选方向', () => {
    const r = computeContainerPlacement({ ...BASE, anchor: { top: 10, bottom: 40, left: 10, right: 60 } });
    expect(r.placement).toBe('bottom-start');
    expect(r.overflowBoth).toBe(false);
  });

  it('下方放不下且上方更宽裕：翻到 top', () => {
    const r = computeContainerPlacement({ ...BASE, anchor: { top: 20, bottom: 380, left: 10, right: 60 } });
    expect(r.placement).toBe('top-start');
  });

  it('锚点贴容器右缘：交叉轴改 end 对齐', () => {
    const r = computeContainerPlacement({ ...BASE, anchor: { top: 10, bottom: 40, left: 250, right: 295 } });
    expect(r.placement).toBe('bottom-end');
    expect(r.crossAlignEnd).toBe(true);
  });

  it('双侧都放不下：报 overflowBoth，交由调用方收缩高度', () => {
    const r = computeContainerPlacement({
      ...BASE,
      container: { top: 0, bottom: 100, left: 0, right: 300 },
      anchor: { top: 40, bottom: 60, left: 10, right: 60 },
    });
    expect(r.overflowBoth).toBe(true);
  });
});
```

坑：

1. **容器矩形的边框口径**。症状：翻转判定总差 1-2px 抖动。根因：`getBoundingClientRect` 含 border，`clientHeight` 含 padding 不含 border，两套口径混用。修法：一个模块内统一用 `getBoundingClientRect`（换算时两边同源，border 误差自动抵消）；把口径写进注释。
2. **只听容器 scroll 不够**。症状：页面滚动时容器带着锚点走，弹层不动。根因：容器自身没滚，是**页面**在滚。修法：window scroll 也要挂（上面代码已挂 resize，scroll 同理加上），或干脆保留 `autoUpdate` 让它管跟随、本节只管翻转基准——两套机制是互补关系，不是替代。
3. **iOS 惯性滚动的延迟关闭**。症状：快速滑动时 Tooltip 跟着锚点"甩"。根因：scroll 事件节流用了 setTimeout。修法：rAF 合并（上面 `schedule` 的写法），不要 timer 节流。

### A2.12 Select 虚拟化改造的接入点

**是什么**：虚拟滚动的数学（撑高条 + translateY + 视口窗口）在 13 号文档考点 4 与 23 号文档已完整讲过，不重复。本节只回答一个问题：**把现成的虚拟列表"接进弹层体系"要动哪五个接缝**。这是真实改造中最容易漏的部分——数学对了、接缝错了，症状是"键盘导航滚不到、打开定位不对、高亮项读屏不播报"。

五个接入点（先背清单再动手）：

1. **滚动容器归属**：`overflow` 容器必须是 listbox 本身（Portal 宿主里那一个），不要再包一层——键盘滚动的 scrollTop 写入目标、size 中间件的高度约束目标、`onScroll` 监听目标三者必须是同一个节点；
2. **高度契约**：`size` 中间件的 `apply` 把 `maxHeight` 设到宿主，listbox 用 `height: 100%` 接住——弹层可用高度与虚拟视口高度是同一个值的两面；
3. **打开时定位**：弹层打开瞬间把选中项滚到视口中央（`block: 'center'`），**不能用 `scrollIntoView`**（原因见坑 1）；
4. **键盘驱动滚动**：高亮变化 → 用数学算 scrollTop（`nearest` 语义：视口内不动，出视口才滚）；
5. **高亮行渲染保证**：渲染窗口 = 视口 ± overscan，且必须并入高亮行——`aria-activedescendant` 指向的节点必须在 DOM（A5.8 深挖这个契约）。

```ts
// scrollToIndex.ts —— 定位数学：不依赖 scrollIntoView 的两个纯函数
export interface ScrollTarget {
  index: number;
  itemHeight: number;
  viewportHeight: number;
}

/** 精确定位：目标项滚动到视口指定位置 */
export function computeScrollTop(
  { index, itemHeight, viewportHeight }: ScrollTarget,
  block: 'start' | 'center' = 'center'
): number {
  const itemTop = index * itemHeight;
  return block === 'start'
    ? itemTop
    : itemTop - (viewportHeight - itemHeight) / 2;
}

/** nearest 语义：已在视口内返回 null（不动，不打扰用户）；出视口返回目标 scrollTop */
export function ensureVisible(
  { index, itemHeight, viewportHeight }: ScrollTarget,
  scrollTop: number
): number | null {
  const top = index * itemHeight;
  const bottom = top + itemHeight;
  if (top < scrollTop) return top;                                 // 视口上方 → 顶对齐
  if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight; // 下方 → 底对齐
  return null;
}
```

```tsx
// useVirtualListBox.ts —— 弹层 × 虚拟列表的接缝层
import * as React from 'react';
import { computeScrollTop, ensureVisible } from './scrollToIndex';

export interface VirtualListBoxParams {
  itemHeight: number;
  count: number;
  highlightedIndex: number;
  /** 打开瞬间要定位到的索引（通常是选中项）；-1 表示不需要 */
  initialIndex: number;
  overscan?: number;
}

export function useVirtualListBox({
  itemHeight, count, highlightedIndex, initialIndex, overscan = 5,
}: VirtualListBoxParams) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  // 渲染窗口：视口 ± overscan，且强制并入高亮行（接入点 5）
  const viewportHeight = viewportRef.current?.clientHeight ?? 0;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(
    count - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
  );
  const renderRange: [number, number] = [
    Math.min(start, highlightedIndex),
    Math.max(end, highlightedIndex),
  ];

  // 接入点 3：挂载（= 打开）时定位到 initialIndex
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || initialIndex < 0) return;
    vp.scrollTop = computeScrollTop(
      { index: initialIndex, itemHeight, viewportHeight: vp.clientHeight },
      'center'
    );
    setScrollTop(vp.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时定位一次
  }, []);

  // 接入点 4：键盘高亮变化 → nearest 滚动
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const target = ensureVisible(
      { index: highlightedIndex, itemHeight, viewportHeight: vp.clientHeight },
      vp.scrollTop
    );
    if (target !== null) {
      vp.scrollTop = target; // 直接设置：键盘导航要即时跟手，不做平滑
    }
    setScrollTop(vp.scrollTop); // 高亮在视口内也要同步 state（窗口计算依赖 scrollTop）
  }, [highlightedIndex, itemHeight]);

  const onScroll = React.useCallback(() => {
    const vp = viewportRef.current;
    if (vp) setScrollTop(vp.scrollTop);
  }, []);

  return { viewportRef, renderRange, totalHeight: count * itemHeight, onScroll };
}
```

```tsx
// VirtualListBox.tsx —— 渲染层：撑高条 + 偏移（与 A2.3 的 Popover 组合即为完整 Select 弹层）
import * as React from 'react';
import { useVirtualListBox } from './useVirtualListBox';

export function VirtualListBox(props: {
  itemHeight: number;
  count: number;
  highlightedIndex: number;
  initialIndex: number;
  renderItem: (index: number) => React.ReactNode;
}) {
  const { viewportRef, renderRange, totalHeight, onScroll } = useVirtualListBox(props);
  const [start] = renderRange;
  const rows = Array.from(
    { length: renderRange[1] - renderRange[0] + 1 },
    (_, i) => props.renderItem(renderRange[0] + i)
  );

  return (
    <div
      ref={viewportRef}
      role="listbox"
      tabIndex={-1}
      onScroll={onScroll}
      style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}
    >
      {/* 撑高条：滚动条长度 = 全量；偏移块：translateY 定位渲染窗口 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * props.itemHeight}px)` }}>{rows}</div>
      </div>
    </div>
  );
}
```

最小测试（两个纯函数的边界）：

```ts
// scrollToIndex.test.ts
import { describe, expect, it } from 'vitest';
import { computeScrollTop, ensureVisible } from './scrollToIndex';

describe('虚拟列表定位数学', () => {
  it('center：目标项落在视口中央', () => {
    // 1000 项 × 32px，视口 320px，定位第 500 项：500*32 - (320-32)/2 = 15856
    expect(computeScrollTop({ index: 500, itemHeight: 32, viewportHeight: 320 }, 'center'))
      .toBe(15856);
  });

  it('ensureVisible：视口内不动（返回 null），出视口才滚', () => {
    const t = { index: 3, itemHeight: 32, viewportHeight: 320 };
    expect(ensureVisible(t, 64)).toBeNull();       // 第 3 项在 [64, 384) 内
    expect(ensureVisible(t, 0)).toBeNull();        // 也在 [0, 320) 内
    expect(ensureVisible({ ...t, index: 20 }, 64)).toBe(20 * 32 + 32 - 320); // 下方 → 底对齐 352
    expect(ensureVisible({ ...t, index: 1 }, 128)).toBe(32);                 // 上方 → 顶对齐
  });
});
```

坑：

1. **`scrollIntoView` 连滚外层**。症状：按方向键，弹层滚了、页面也跟着滚。根因：浏览器会把**所有可滚祖先**都滚一遍让元素完全可见（`scrollIntoView` 的默认义务），弹层虽 Portal 到 body，body/页面仍是它的滚动祖先。修法：全部用 `scrollTop` 数学（本节两个函数）；实在要用就 `scrollIntoView({ block: 'nearest', preventScroll: true })` 后自己滚容器。
2. **`overscroll-behavior: contain` 没加**。症状：列表滚到底继续滚，页面开始动（滚动链）。修法：viewport 样式加 `overscrollBehavior: 'contain'`（上面代码已带）。
3. **打开时 `clientHeight` 为 0**。症状：首次定位滚到错误位置。根因：effect 执行时布局未稳定（size 中间件的 `apply` 还没跑完）。修法：双 rAF 后再定位，或用 `ResizeObserver` 首次回调触发定位。
4. **`virtual` 开关的降级**。不定高选项（分组标题、多行描述）导致定高数学失效时，学 antd 提供 `virtual={false}` 逃生舱，同时键盘滚动退回 `scrollIntoView + preventScroll`——两个模式都要在验收清单里过一遍。

### A2.13 弹层嵌套链：Select 里开 DatePicker 与 z-index 上下文

**是什么**：真实的嵌套不是"两个独立弹层"，而是**弹层内容里再开弹层**：Select 的选项行是"自定义日期"，点开 DatePicker；Popover 里的按钮挂 Tooltip。此时三个问题必须沿"链"处理：定位锚（子弹层的锚在父浮层内部）、关闭语义（Esc 只关最顶层、点外只关链外的层）、层级上下文（子弹层的 z-index 地基来自父弹层——不是全局计数器一个数就能管平的）。

**为什么难**：

1. 锚在浮层内：父浮层关闭/重定位，子弹层必须跟着关/重算——锚点的生命周期被父层持有；
2. Esc 双重关闭：父层与子弹层各自在 document 挂 keydown，一次 Esc 两层都关。A2.9 的 `openLayers` 集合解决了"点外豁免"，但 Esc 是另一套机制，需要一个**栈**；
3. context 穿越 Portal：React context 沿组件树传播、Portal 只搬 DOM（12 号文档 Lv2 已确认这个特性）——`ZIndexContext` 的 Provider 若挂错位置（比如挂在 React 树之外或 body 宿主上），子弹层读到的是 0。

**机制**：

1. **Esc 栈**（全局单例）：每层弹层打开时 push 自己的 handler；Esc 触发**栈顶**并 `stopPropagation`，其余层不响应；
2. **关闭联动**：父层关闭时先关子层（链式持有）——防止子弹层的锚点被卸载后变成孤儿浮层；
3. **层级地基**：父弹层把自己的 zIndex 通过 Context 传进弹层内容，子弹层取 `max(全局序列, 父地基 + 步进)`——全局计数器（A2.6）管"叠开"，context 地基管"嵌套"，两个正交约束取大者（12 号文档 Lv2 考点六的 `useZIndex` 就是这个组合的工业化版）。

```ts
// escapeStack.ts —— 全局 Esc 栈：后开者先关，且一次只关一层
type EscHandler = (e: KeyboardEvent) => void;

const stack: EscHandler[] = [];

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (top) {
    e.stopImmediatePropagation(); // 只让栈顶响应：同在 document 的其它监听（含别的弹层）不再连锁
    top(e);
  }
}

if (typeof document !== 'undefined') {
  // 捕获阶段挂载：抢在业务可能的 document 冒泡监听之前（A6.2 的顺序结论）
  document.addEventListener('keydown', onKeyDown, true);
}

/** 弹层打开期间注册自己的 Esc 处理；返回注销函数（弹层关闭/卸载时调用） */
export function pushEscHandler(handler: EscHandler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i !== -1) stack.splice(i, 1);
  };
}
```

```tsx
// useEscClose.ts —— 弹层接入 Esc 栈
import * as React from 'react';
import { pushEscHandler } from './escapeStack';

export function useEscClose(open: boolean, onClose: () => void) {
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    return pushEscHandler((e) => {
      e.preventDefault();
      onCloseRef.current();
    });
  }, [open]);
}
```

```tsx
// NestedPopup.tsx —— 嵌套弹层基座：锚在父浮层内 + 层级地基 + Esc 栈
import * as React from 'react';
import { useEscClose } from './useEscClose';
import { usePopupLayer } from './usePopupLayer';         // A2.6 的全局计数器
import { ZIndexContext } from '../modal/zIndex';         // Lv2 考点六的层级上下文

export function NestedPopup({
  open,
  onClose,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** 锚元素：可以在父浮层内部（嵌套链的物理起点） */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const parentZ = React.useContext(ZIndexContext); // 父弹层给的地基；顶层弹层为 0
  const sequenceZ = usePopupLayer(open);           // 全局序列号（叠开正确性）
  const zIndex = Math.max(sequenceZ, parentZ + 10); // 嵌套 + 叠开两个约束取大

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEscClose(open, onClose);

  // 父层关闭联动：本层锚点一旦脱离文档（父浮层先关了），立即自杀
  React.useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      const anchor = anchorRef.current;
      if (anchor && !anchor.isConnected) onCloseRef.current();
    }, 200); // 轮询是最朴素的实现；更优解是父层关闭时显式调 closeAllChildren()
    return () => window.clearInterval(timer);
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    // Provider 必须包在弹层内容的 JSX 上：context 沿 React 树传播，
    // 挂到 body 宿主 div 上等于没挂（React 树之外，A2.13 机制 3 的反例）
    <ZIndexContext.Provider value={zIndex}>
      <div style={{ position: 'fixed', zIndex }}>{children}</div>
    </ZIndexContext.Provider>
  );
}
```

"Select 里开 DatePicker"的接线要点：DatePicker 面板的 `anchorRef` 指向 listbox 里那一行；面板 Portal 到**同一链的层**（继承 ZIndexContext）；listbox 的 keydown 处理器开头加一条豁免——`if (datepickerPanel.contains(e.target)) return`，否则方向键会被 listbox 的键盘导航抢走，日历没法用（坑 3 的现场）。

最小测试（Esc 栈的后进先出）：

```ts
// escapeStack.test.ts
import { describe, expect, it, vi } from 'vitest';
import { pushEscHandler } from './escapeStack';

const esc = () =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

describe('escapeStack', () => {
  it('Esc 只触发栈顶；逐层释放后轮到下一层', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const offOuter = pushEscHandler(outer);
    const offInner = pushEscHandler(inner);

    esc();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    offInner();
    esc();
    expect(outer).toHaveBeenCalledTimes(1);
    offOuter();
  });

  it('注销函数幂等：重复调用不误删后注册的层', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = pushEscHandler(a);
    pushEscHandler(b);
    offA();
    offA(); // StrictMode/竞态下 cleanup 可能被调两次
    esc();
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });
});
```

坑：

1. **一次 Esc 连关两层**。症状：DatePicker 里按 Esc，Select 也关了。根因：两层各自挂 document keydown（A2.9 只治理了点外，没治理 Esc）。修法：全局 Esc 栈（本节），或 floating-ui `useDismiss` 的内置 escapeKeydown 栈（能力对照：它还区分"焦点原因"关闭）。
2. **Provider 挂在 Portal 外**。症状：子弹层 z-index 与父层相同，被父层盖住。根因：`ZIndexContext.Provider` 挂在了 `createPortal(children, host)` 的 host 上或组件返回值之外——React 树里根本没包住弹层内容。修法：Provider 永远包"弹层渲染的 JSX 本身"（上面代码的注释位置）。
3. **父层键盘导航吃掉子层面板的方向键**。症状：Select 里开的 DatePicker 日历按方向键没反应或同时移动了 Select 高亮。根因：listbox 的 keydown 是容器级监听，事件从日历冒泡上来。修法：键盘处理入口判 `子层 DOM.contains(e.target)` 直接 return；这本质是 A6.2 事件顺序问题在嵌套弹层的化身。
