---
title: "A3. \"退出动画\"难题（visible/mounted 双状态机）"
---

## A3. "退出动画"难题（visible/mounted 双状态机）

- 关闭时 `visible=false` 但**保持挂载**，播完动画才真正 unmount
- `onTransitionEnd` + timeout 兜底；CSSTransition / AnimatePresence 的原理都是这个
- 动画期间 `pointer-events: none`；列表项退出动画与卸载竞态

### A3.1 问题本质：卸载即消失，动画无处安放

Modal 关闭的需求是"淡出 200ms 再消失"。直觉写法 `visible && <Modal />` 的问题：`visible` 变 false 的那一帧 React 就把 DOM 删了，transition 还没开始元素已经不在了——**动画需要元素活着，而关闭语义要求它死掉**。这两个诉求指向两个不同的状态变量，这就是双状态机的由来：

- `visible`：外部语义状态——"逻辑上开着吗"；
- `mounted`：内部实现状态——"DOM 还在吗"。

### A3.2 双状态机与状态转移表

三个角色：`visible`（props）、`mounted`（内部 state）、动画类名（由 phase 派生）。完整转移表：

| 阶段 | visible | mounted | phase（动画类名依据） | DOM/样式状态 | 进入该阶段的触发 |
|---|---|---|---|---|---|
| 初始关闭 | false | false | `unmounted` | 不在文档中 | — |
| 打开瞬间 | true | true | `enter` | 已挂载，opacity: 0（起始样式） | `setVisible(true)`，同步置 mounted=true |
| 进入过渡 | true | true | `entered` | opacity 0 → 1 过渡中 | 下一帧（双 rAF）切 phase |
| 稳定展示 | true | true | `entered` | opacity 1，过渡完成 | `transitionend`（无需处理） |
| 关闭中 | false | true | `exit` | **保持挂载**，opacity 1 → 0 过渡中 | `setVisible(false)`，mounted 仍为 true |
| 关闭完成 | false | false | `unmounted` | 真正卸载 | `transitionend` 或 timeout 兜底（先到先算） |

两条不变式：**打开路径 mounted 立即变 true（否则第一帧都画不出来）；关闭路径 mounted 必须晚于 visible 至少一个动画时长**。所有进出场动画库的全部秘密就是维护这两条不变式。

### A3.3 useMountTransition 完整实现

结束信号有两个来源，必须处理它们的关系：

- `onTransitionEnd`：精确（CSS 说的时长就是它），但**会冒泡**——弹层内部任何子元素（按钮的背景色过渡、图标的旋转）结束过渡时，事件都会冒泡到弹层根元素，不分辨就提前卸载、动画被腰斩。判据：`e.target === e.currentTarget`（只有目标是"我绑定的这个元素本身"才算数）。
- timeout 兜底：transitionend 有四种"不来"的情况——动画被新的样式变化打断（此时浏览器发的是 `transitioncancel` 而非 end）、元素/祖先 `display: none`、用户开了 `prefers-reduced-motion` 导致时长为 0、组件把 duration 写成 0。兜底时长取 `duration + 余量`。

两者**先到先结算，只结算一次**（竞态兜底：transitionend 先来就撤掉 timer；timer 先来就忽略之后的 end）。

```tsx
// useMountTransition.ts
import * as React from 'react';

export type TransitionPhase = 'unmounted' | 'enter' | 'entered' | 'exit';

/**
 * 可见性与挂载解耦的双状态机。
 * 返回 mounted（要不要渲染）、phase（渲染成什么样式阶段）、handleTransitionEnd（绑给根元素）。
 */
export function useMountTransition(
  visible: boolean,
  duration = 200,
  onExited?: () => void
) {
  const [phase, setPhase] = React.useState<TransitionPhase>(
    visible ? 'enter' : 'unmounted'
  );

  const phaseRef = React.useRef(phase);
  phaseRef.current = phase; // 回调里要读"当前阶段"，不能吃闭包旧值

  const timerRef = React.useRef<number | null>(null);
  const settledRef = React.useRef(false); // 竞态哨兵：结束只结算一次
  const onExitedRef = React.useRef(onExited);
  React.useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  const settle = React.useCallback(() => {
    if (settledRef.current) return;          // transitionend 与 timeout 谁先到谁生效
    settledRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current); // 撤掉另一个信号源
      timerRef.current = null;
    }
    setPhase('unmounted');                   // 真正卸载
    onExitedRef.current?.();                 // 通知调用方"退场完毕"（列表场景要用，见 A3.6）
  }, []);

  React.useEffect(() => {
    if (visible) {
      settledRef.current = false;
      setPhase('enter');
      // 双 requestAnimationFrame：第 1 帧提交 opacity:0 的起始样式，
      // 第 2 帧再切到 entered（opacity:1），浏览器记录过起始值，过渡必然触发。
      // 只用一帧（或 setState 后立即改类名）会"同帧合并"，动画闪跳。
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('entered'));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    // visible=false：本来就没挂载就别启动计时器（防止首帧 false 的组件空跑）
    if (phaseRef.current === 'unmounted') return;

    settledRef.current = false;
    setPhase('exit');                        // 保持挂载，只切样式
    timerRef.current = window.setTimeout(settle, duration + 60); // 兜底：比声明的时长多 60ms 余量
    return () => {
      if (timerRef.current !== null) {       // 依赖变化（如退出中又重开）时撤销旧 timer
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration, settle]);

  // 绑到弹层根元素的 onTransitionEnd
  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return; // ① 子元素的 transitionend 冒泡上来：忽略
      if (phaseRef.current !== 'exit') return;  // ② 只在退出阶段结算（进入阶段结束无事可做）
      settle();
    },
    [settle]
  );

  return { mounted: phase !== 'unmounted', phase, handleTransitionEnd };
}
```

### A3.4 完整组件：带退出动画的 Popup

```tsx
// FadePopup.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useMountTransition } from './useMountTransition';
import { useClickOutside } from './useClickOutside';

const DURATION = 200;

export function FadePopup({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { mounted, phase, handleTransitionEnd } = useMountTransition(visible, DURATION);
  const layerRef = React.useRef<HTMLDivElement>(null);

  // 点外关闭只在"挂载中"启用（clickOutside 需要 ref 就绪）
  useClickOutside(layerRef, onClose, mounted);

  if (!mounted) return null; // 关闭完成：真正卸载

  return createPortal(
    <div
      ref={layerRef}
      onTransitionEnd={handleTransitionEnd}
      className={clsx(
        'fade-popup',
        (phase === 'enter' || phase === 'exit') && 'fade-popup--hidden', // 两端都停在透明
        phase === 'exit' && 'fade-popup--exiting'                        // 退出期：禁点击
      )}
    >
      {children}
      <button onClick={onClose}>关闭</button>
    </div>,
    document.body
  );
}
```

```css
/* fade-popup.css */
.fade-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 1;
  transition: opacity 200ms ease; /* 过渡声明在基类上，两端只改 opacity */
}
.fade-popup--hidden {
  opacity: 0;
}
.fade-popup--exiting {
  pointer-events: none; /* 关键：退出动画期间元素还在且在最上层，不禁点就会挡住下面的交互 */
}
```

`pointer-events: none` 的必要性展开：关闭中（exit）的弹层 DOM 还在、z-index 还很高，用户已经认为它关了去点底下的按钮，结果点到"正在消失的幽灵"上。视觉上它在消失，交互上它必须已经死透——**视觉死亡时间（动画结束）与交互死亡时间（visible=false）分离**，后者必须先行。

### A3.5 与 CSSTransition / AnimatePresence 的原理同构

| 概念 | 本节双状态机 | react-transition-group 的 CSSTransition | framer-motion 的 AnimatePresence |
|---|---|---|---|
| 关闭保挂载 | `mounted` 与 `visible` 解耦 | exit 阶段不卸载子元素 | children 被移除时延迟真正卸载 |
| 阶段类名 | enter/entered/exit | `*-enter` → `*-enter-active` → `*-exit` → `*-exit-active` | 变体（initial/animate/exit）驱动 |
| 结束信号 | transitionend + timeout 竞态结算 | `timeout` prop，或 addEndListener | 动画库自身的完成回调（如 `onAnimationComplete`） |
| 列表推广 | A3.6 的 Toast 列表 | TransitionGroup | AnimatePresence + key |

所以学会这 60 行 hook，再读 CSSTransition 源码（就是在管理这些类名的添加时机：enter 类先挂、下一帧挂 enter-active）和 AnimatePresence 文档（PresenceContext + `safeToRemove` 回调）会有"原来如此"的通透感。反过来，业务里临时要用，直接手写双状态机也比引一个库轻。

### A3.6 列表项退出动画与卸载竞态

单元素的难点是"保持挂载"；列表的难点是**数据删除与动画完成是两个异步时刻**。Toast 队列：`remove(key)` 时数据层恨不得立刻删（数组 splice），动画层需要它再活 300ms。解法：删除分两步——先标 `exiting`（渲染退场样式、`pointer-events: none`），动画时长后真正过滤掉。竞态点：定时器到点时，同 key 的新 toast 可能已经插进来了，不能误删。

```tsx
// ToastList.tsx
import * as React from 'react';
import clsx from 'clsx';

interface ToastItem {
  key: string;
  content: string;
  exiting?: boolean; // 退场标记：样式上消失，数据上还在
}

const EXIT_MS = 300;

export function ToastList() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((content: string) => {
    const key = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { key, content }]);
    // 自动销毁：到点若还在（未被手动关、未被复用），走 remove
    window.setTimeout(() => remove(key), 3000);
  }, []);

  const remove = React.useCallback((key: string) => {
    // 第一步：只标 exiting，DOM 保留播动画
    setItems((prev) => prev.map((t) => (t.key === key && !t.exiting ? { ...t, exiting: true } : t)));
    // 第二步：动画时长后真正移除。过滤条件带 exiting，防止同 key 的新 toast 被误删（竞态兜底）
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => !(t.key === key && t.exiting)));
    }, EXIT_MS);
  }, []);

  return (
    <div className="toast-list">
      {items.map((t) => (
        <div
          key={t.key}
          className={clsx('toast', t.exiting && 'toast--exiting')}
          onClick={() => remove(t.key)} // 点击提前关
        >
          {t.content}
        </div>
      ))}
      <button onClick={() => push('新消息')}>push</button>
    </div>
  );
}
```

```css
/* toast.css */
.toast {
  animation: toast-in 200ms ease;
}
.toast--exiting {
  animation: toast-out 300ms ease forwards; /* forwards 停在终态，等 JS 卸载 */
  pointer-events: none;                      /* 退场期不可交互（同 A3.4） */
}
@keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes toast-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-8px); } }
```

这里用 CSS animation 而非 transition（列表项不需要"从当前值反向过渡"的通用性，入场出场各自独立更省心），所以结束信号也可以用 `onAnimationEnd`，但 timeout 兜底的纪律不变。

### A3.7 常见坑

1. **退出动画偶发不播**。症状：有时淡出有时直接消失。根因：transitionend 被子元素事件提前触发（未判 `e.target !== e.currentTarget`）或 `display: none` 打断。修法：A3.3 的两道判定 + timeout 兜底。
2. **进入动画不播（元素直接以终态出现）**。根因：起始样式与终态样式在同一帧内被浏览器合并（React 18 批处理下 setState 后立即改类名就是一帧）。修法：双 `requestAnimationFrame`（A3.3），或读 `getComputedStyle` 强制样式回流后再切。
3. **快速开关竞态**。症状：退出中再点开，弹层卡在透明或直接消失。根因：旧的 exit timer 还在跑，把新打开的层卸载了。修法：effect cleanup 撤 timer（A3.3 已内置）+ `settledRef` 保证单次结算；打开路径先把 settled 复位为 false。
4. **动画期间挡住下层交互**。根因：忘了 `pointer-events: none`。修法：A3.4 的 `--exiting` 类；Modal 全屏遮罩同理。

### ⚠️ 分水岭警示（原文：这是初级与高级组件代码最显眼的分水岭）

为什么这一节被标成分水岭？因为它是**第一个"组件状态机必须大于用户心智模型"的地方**：用户心智里"关闭"是一个瞬间动作，而组件实现里"关闭"是一个 200ms 的过程（关闭中 → 关闭完成），期间要处理点击穿透、焦点还回（A4）、数据保留与列表竞态。初级代码只有 `visible` 一个布尔，于是出现闪没、挡点击、Toast 队列错乱；高级代码把它展开成显式状态机，一切边角都有明确的转移路径。**面试时让对方写一个"带淡出的 Modal"，能不能先画出 A3.2 那张表，十秒钟就能分层。**

### A3.8 状态机形式化：显式转移表与穷举测试

**是什么**：A3.3 的状态迁移散落在 effect、setTimeout、事件回调三处，"exit 中又收到 SHOW"这类边角只能靠手测回归。本节把双状态机改写成 xstate 风格的**显式转移表**——`transition(state, event)` 变成纯函数，4 状态 × 4 事件一共 16 条组合可以穷举单测；非法转移不再靠 `settledRef` 这类哨兵兜住，而是被表**结构性吸收**。

**为什么难**：

1. 隐式状态机的竞态防御是"打补丁"式的：A3.3 用 `settledRef` 保证单次结算、用 cleanup 撤 timer——每加一个入口就要想一遍"所有状态都会怎样"；
2. 库规模上去后（Modal/Drawer/Toast/Collapse 各一套），没有转移表就无法做"改一处、全量回归"；
3. 状态机的真正价值不在写时，在读时：新维护者看一张 16 格的表，十秒钟建立全部心智模型（这正是 A3.2 表格的代码化）。

**机制**：

1. 状态与事件都是字面量联合类型；转移表是 `Record<状态, Partial<Record<事件, 状态>>>`；
2. `undefined` 表示非法转移：开发期报警 + **保持原状态**——迟到的信号（timer 先到后又来 transitionend）天然无害化；
3. reducer 纯函数化（`useReducer(transition, init)`），一切副作用（rAF、timer、事件绑定）留在 effect——"事件发射器"与"状态裁判"分离。

```ts
// mountTransitionMachine.ts —— 纯函数状态机：显式转移表
export type MountState = 'unmounted' | 'enter' | 'entered' | 'exit';
export type MountEvent =
  | { type: 'SHOW' }   // visible: false → true
  | { type: 'FRAME' }  // 双 rAF 到达：起始样式已提交，可切终态
  | { type: 'HIDE' }   // visible: true → false
  | { type: 'END' };   // transitionend 或 timeout 兜底：动画播完

/**
 * 转移表：[当前状态][事件] → 下一状态；缺项 = 非法转移（保持原状态并报警）。
 * 读法示例：exit + SHOW → enter（退出中重开，续接见 A3.9）；
 *          exit + END → unmounted（正常退场完成）；
 *          unmounted + HIDE → 缺项（首帧就是 false 的组件空跑，直接忽略）。
 */
export const transitions: Record<
  MountState,
  Partial<Record<MountEvent['type'], MountState>>
> = {
  unmounted: { SHOW: 'enter' },
  enter: { FRAME: 'entered', HIDE: 'exit' },
  entered: { HIDE: 'exit' },
  exit: { END: 'unmounted', SHOW: 'enter' },
};

export function transition(state: MountState, event: MountEvent): MountState {
  const next = transitions[state][event.type];
  if (next === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[mountTransition] 非法转移：${state} + ${event.type}（已忽略，保持 ${state}）`);
    }
    return state; // 竞态被表吸收：迟到/多余信号不产生任何状态变化
  }
  return next;
}
```

```tsx
// useMountTransitionMachine.ts —— 转移表驱动：副作用全部收进"事件发射器"
import * as React from 'react';
import { transition, type MountState } from './mountTransitionMachine';

export function useMountTransitionMachine(visible: boolean, duration = 200) {
  const [state, dispatch] = React.useReducer(transition, visible ? 'enter' : 'unmounted');
  const stateRef = React.useRef<MountState>(state);
  stateRef.current = state;

  React.useEffect(() => {
    if (visible) {
      dispatch({ type: 'SHOW' });
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => dispatch({ type: 'FRAME' }));
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    dispatch({ type: 'HIDE' }); // unmounted + HIDE 是非法转移 → 自动忽略（等价 A3.3 的判空守卫）
    const t = window.setTimeout(() => dispatch({ type: 'END' }), duration + 60);
    return () => window.clearTimeout(t);
  }, [visible, duration]);

  const handleTransitionEnd = React.useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return; // 子元素冒泡不算（A3.3 同款判定）
      if (stateRef.current === 'exit') dispatch({ type: 'END' });
    },
    []
  );

  return { mounted: state !== 'unmounted', phase: state, handleTransitionEnd };
}
```

注意一个结构性改进：A3.3 里"transitionend 先到就撤 timer"的竞态代码消失了——timer 照常触发，但那时状态已是 `unmounted`，`unmounted + END` 是非法转移被忽略。**先到先结算**变成了**后到者无效**，语义等价而实现零成本。

穷举测试（状态机最值的测试写法——16 格全量快照）：

```ts
// mountTransitionMachine.test.ts
import { describe, expect, it } from 'vitest';
import { transition, type MountEvent, type MountState } from './mountTransitionMachine';

const STATES: MountState[] = ['unmounted', 'enter', 'entered', 'exit'];
const EVENTS: MountEvent[] = [
  { type: 'SHOW' }, { type: 'FRAME' }, { type: 'HIDE' }, { type: 'END' },
];

describe('mountTransitionMachine 转移表', () => {
  it('穷举 4×4 全部组合：合法转移按表走，非法转移保持原状态', () => {
    const snapshot: Record<string, string> = {};
    for (const s of STATES) {
      for (const e of EVENTS) {
        snapshot[`${s}+${e.type}`] = transition(s, e);
      }
    }
    expect(snapshot).toEqual({
      'unmounted+SHOW': 'enter', 'unmounted+FRAME': 'unmounted',
      'unmounted+HIDE': 'unmounted', 'unmounted+END': 'unmounted',
      'enter+SHOW': 'enter', 'enter+FRAME': 'entered',
      'enter+HIDE': 'exit', 'enter+END': 'enter',
      'entered+SHOW': 'entered', 'entered+FRAME': 'entered',
      'entered+HIDE': 'exit', 'entered+END': 'entered',
      'exit+SHOW': 'enter', 'exit+FRAME': 'exit',
      'exit+HIDE': 'exit', 'exit+END': 'unmounted',
    });
  });

  it('关键路径：开 → 进 → 稳 → 关 → 卸', () => {
    let s: MountState = 'unmounted';
    s = transition(s, { type: 'SHOW' });
    s = transition(s, { type: 'FRAME' });
    s = transition(s, { type: 'HIDE' });
    s = transition(s, { type: 'END' });
    expect(s).toBe('unmounted');
  });

  it('竞态吸收：退出中重开后，迟到的 END 不再卸载', () => {
    let s: MountState = 'exit';
    s = transition(s, { type: 'SHOW' });
    expect(s).toBe('enter');
    expect(transition(s, { type: 'END' })).toBe('enter'); // 迟到信号被非法转移规则忽略
  });
});
```

与 xstate 的对照：xstate 在这张表之上加的是 `context`（扩充值，如当前 duration）、`guards`（条件转移）、`invoke`（把 timeout 变成 actor、自动收发事件）与可视化。什么时候值得引入：输入源超过三个（visible、键盘、网络状态、resize）或需要状态图沟通时。本节的 16 格表是 xstate 的最小内核——先把表写清楚，再决定要不要上机器库。

坑：

1. **副作用写进 reducer**。症状：reducer 里 setTimer / 操作 DOM，StrictMode 下双调用、调试器里状态不可序列化。修法：reducer 只裁判，副作用全部住在 effect（"事件发射器"层）。
2. **非法转移报警被无视**。它不是噪音——每一条都是真实竞态的现场记录。出现 `exit + FRAME` 说明 FRAME 的 rAF 没被 cleanup；出现 `enter + END` 说明 timer 泄漏。把它当 CI 噪音关掉等于拆掉烟雾报警器。
3. **转移表用枚举数字**。症状：报错信息里只看到 `2 + 3`。修法：状态与事件一律字符串字面量（上面写法），错误信息自带可读性，快照测试也稳定。

### A3.9 动画中断的续接策略

**是什么**：退出动画播到 60% 时用户重开——正确行为是**从 60% 处续接回去**（反向淡入），而不是闪到透明再从头入场。A3.3 的实现里这条路径（exit 中 SHOW → enter）状态已经对了，但视觉续接取决于动画技术选型：CSS transition 天然续接；CSS animation 必须手工把"当前计算值"写回起点；WAAPI 则有现成的倒放 API。

**为什么难**：

1. transition 的续接是浏览器隐式做的——"当前计算值就是新过渡的起点"，很多人不知道这个特性，反而在 JS 里先把 opacity 重置成 0，把天然续接破坏成闪跳；
2. animation 重启永远从头播（`@keyframes` 不感知当前值），中断点信息必须自己搬运（getComputedStyle 或 CSS 变量）；
3. 中断点对 opacity 是一个数，对 transform 是一个矩阵——矩阵没法拼进 `from` 关键帧，位移类动画的续接基本只能靠 transition 或 WAAPI。

三个策略按优先级：

**策略一：transition（默认选型，零成本续接）**。A3.4 的 FadePopup 类名体系已经具备：`--hidden`（opacity: 0）与默认态（opacity: 1）之间切换，transition 声明在基类上。exit 中重开时移除 `--hidden` 类，浏览器从中断点的计算值过渡回 1——**不要在 JS 里写任何内联 opacity**。验证方法：DevTools 的 Animations 面板回放，中断续接的曲线起点应是 0.6 一类的中值而不是 0。

**策略二：animation + getComputedStyle 续接**。列表退场（A3.6 的 toast-out）用的是 animation，中断重入时把当前值写进 CSS 变量：

```tsx
// resumeAnimation.ts —— CSS animation 的中断续接：当前计算值写回起点
export function resumeFadeIn(el: HTMLElement) {
  const current = getComputedStyle(el).opacity; // 中断点的真实值，如 "0.6"
  el.style.setProperty('--fade-from', current);
  el.classList.remove('is-exiting');
  void el.offsetWidth; // 强制回流：让"移除退场类"先提交，避免同名 animation 不重启
  el.classList.add('is-entering');
}
```

```css
/* resumeFadeIn 配套：起点来自 CSS 变量，中断点被搬进关键帧 */
.fade-layer.is-entering {
  animation: fade-resume-in 200ms ease;
}
@keyframes fade-resume-in {
  from { opacity: var(--fade-from, 0); }
  to   { opacity: 1; }
}
```

**策略三：WAAPI（动画对象在手，续接是 API 调用）**。适合 JS 驱动的复杂动画（Drawer 的多段位移）：

```ts
// waapiResume.ts —— 用 WAAPI 管理的动画：倒放即续接
export function reverseCurrent(el: HTMLElement): void {
  el.getAnimations().forEach((anim) => {
    // commitStyles 把当前帧写回内联样式（要求动画声明了 fill，如 forwards），
    // 防止后续 cancel 时样式瞬移回动画前状态
    anim.commitStyles();
    if (anim instanceof CSSAnimation) anim.persist(); // 保住已提交样式不被样式系统回收
    anim.playbackRate = -anim.playbackRate; // 退出中重开 = 倒放回去
    anim.play();
  });
}
```

完整接线（把续接接进 A3.8 的状态机——"exit 中 SHOW 回 enter"状态层已就绪，视觉层零特判）：

```tsx
// FadeLayer.tsx —— 中断续接的最终形态：续接全部交给 transition，JS 只管类名
import * as React from 'react';
import { useMountTransitionMachine } from './useMountTransitionMachine';

export function FadeLayer({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  const { mounted, phase, handleTransitionEnd } = useMountTransitionMachine(visible, 200);
  if (!mounted) return null;

  return (
    // enter 与 exit 都停在透明端（--hidden），entered 是不透明端。
    // transition 声明在基类：无论从哪个方向切类名，浏览器都以"当前计算值"为起点——
    // exit 播到 60% 时重开，切回 hidden→默认的路径，天然从 0.6 续接回 1。
    <div
      onTransitionEnd={handleTransitionEnd}
      className={phase === 'entered' ? 'fade-layer' : 'fade-layer fade-layer--hidden'}
      style={phase === 'exit' ? { pointerEvents: 'none' } : undefined}
    >
      {children}
    </div>
  );
}
```

```css
/* fade-layer.css —— 注意：没有任何 JS 写 opacity，全部经类名（续接的前提） */
.fade-layer {
  opacity: 1;
  transition: opacity 200ms ease;
}
.fade-layer--hidden {
  opacity: 0;
}
```

中断时序速查（review 时逐行对照的 checklist）：

| 时刻 | visible | phase | 元素 opacity | 用户看到 |
|---|---|---|---|---|
| t0 退出播到 60% | false | exit | 0.6 | 正在变淡 |
| t1 用户重开 | true | enter（A3.8 的中断转移） | 0.6（类已切、值未跳） | 无闪跳 |
| t2 下一帧起 | true | entered | 0.6 → 1 过渡中 | 从 60% 处淡回 |
| 反例：JS 重置了 opacity | true | enter | 0（内联样式强写） | 闪白一帧再入场 |

中断的 transform 陷阱展开：续接对 transform 的困难在于"中断点矩阵"——`getComputedStyle` 拿到的是 `matrix(1, 0, 0, 1, 0, -37.2)` 这样的合成结果，它无法拆回 `translateY(-37.2px)` 再拼进关键帧（旋缩平移混合后更没戏）。工程结论：**需要续接的动画属性优先 transition（浏览器做插值），只在"整段独立播放"的场合用 animation**；JS 动画库（framer-motion/WAAPI）能续接是因为它们自己持有动画的参数化表示（from/to/progress），矩阵从未被真正"读回"。

测试策略：jsdom 没有 CSSOM 动画实现（getComputedStyle 不计算 transition、getAnimations 不存在），单测层只测状态机（A3.8 的转移表已覆盖"exit + SHOW → enter"）；视觉续接属于 C 篇视觉回归（Chromatic/Playwright 截图对比中断帧）的辖区——分层测试，别用 jsdom 硬上。

坑：

1. **中断重开闪白**。症状：重开瞬间元素消失一帧再淡入。根因：JS 在重开路径里把 opacity 重置成 0（内联样式覆盖了类名体系的天然续接）。修法：删掉重置逻辑，样式只经类名（策略一的全部纪律就这一句）。
2. **animation 重启没生效**。症状：remove/add 同一个类，动画不重播。根因：同一帧内类名先删后加，浏览器合并处理。修法：`void el.offsetWidth` 强制回流（策略二代码），或用 `animation: none` 闪断一帧。
3. **倒放播完后的残留**。症状：WAAPI 倒放到 enter 终态后元素闪烁。根因：`commitStyles` 在 fill 为 none 时是无效调用，cancel 后样式跳回。修法：动画声明 `fill: 'forwards'`；`persist()` 只对 CSSAnimation 存在（JS 的 `el.animate()` 产生的动画不受样式回收影响，不需要 persist）。
4. **prefers-reduced-motion**。用户开了减少动效时 duration 为 0，所有续接逻辑退化为"直接跳终态"——这不该报错也不该播动画。A3.3 的 timeout 兜底会立即结算，转移表不需要特判，但 getComputedStyle 读到的可能已是终态值，续接起点自然变成 1——行为正确，无需处理（知道它为什么对，才能睡得着）。

### A3.10 AnimatePresence 对标拆解：手写 MiniAnimatePresence

**是什么**：A3.5 用对照表说明了 framer-motion 的 AnimatePresence 与双状态机同构；A3.6 用"两步删除"解决了列表退场。本节做源码级拆解并手写一个约 90 行的 `MiniAnimatePresence`，把 AnimatePresence 的三个核心概念——**children diff、PresenceContext、safeToRemove**——落到可运行的代码上。它解决的是 React 的一个"结构性拒绝"：React 的渲染是快照式的，本轮 render 里消失的 child 直接被卸载，框架不提供"先播动画再卸载"的钩子。

**为什么难**：

1. 拦截时机必须在 **render 期间**——如果等 effect 里发现"child 没了"，DOM 已经被卸载，动画无从谈起；
2. "退出中的 child"用的是**旧 element**（本轮 props 里的 children 已经没有它了），要自己留档；
3. "动画播完再卸载"意味着卸载决策要再触发一次渲染——`safeToRemove` 的本质就是"从保留区删除后 setState"。

**机制**：

1. **留档**：一个 `Map<key, element>` 保存"上一轮渲染过的所有 element"（含正在退出的）；
2. **diff 发生在 render 里**：本轮 children 的 key 集合 vs 留档——消失的 key 转入"退出区"（继续用旧 element 渲染，React 不会卸载它）；退出区里又出现的 key 移出（中断续接，A3.9）；
3. **PresenceContext**：退出区的 child 包上 `{ isPresent: false, onExitComplete }`——child 自己负责播 exit 动画，播完调 `onExitComplete`；
4. **safeToRemove**：`onExitComplete` 的实现 = 从退出区删 key + 从留档删 key + setState → 下一轮渲染不再包含它 → React 这才真正卸载。

```tsx
// MiniAnimatePresence.tsx —— 列表退场的最小内核（对照 framer-motion 的同名组件）
import * as React from 'react';

interface PresenceContextValue {
  isPresent: boolean;
  onExitComplete: () => void;
}

const PresenceContext = React.createContext<PresenceContextValue>({
  isPresent: true,
  onExitComplete: () => {},
});

export const usePresence = () => React.useContext(PresenceContext);

export function MiniAnimatePresence({ children }: { children: React.ReactNode }) {
  const currentChildren = React.Children.toArray(children).filter(
    React.isValidElement
  ) as React.ReactElement[];
  const currentKeys = new Set(currentChildren.map((c) => String(c.key)));

  // 留档：上一轮渲染过的所有 element（含退出中的）。ref 存放，渲染期更新（见机制 1）
  const keptRef = React.useRef<Map<string, React.ReactElement>>(new Map());
  for (const c of currentChildren) keptRef.current.set(String(c.key), c);

  // 退出区：state 驱动（它的变更要触发重渲染才能最终卸载，ref 不行）
  const [exiting, setExiting] = React.useState<Map<string, React.ReactElement>>(
    () => new Map()
  );

  // ② diff 必须发生在 render 里：本轮消失的 key 立即用旧 element 补渲染，React 才不会卸载它。
  //    effect 里做就晚了——DOM 已删。渲染期 setState（仅限自身组件）是 React 认可的模式。
  const disappeared: string[] = [];
  for (const key of keptRef.current.keys()) {
    if (!currentKeys.has(key) && !exiting.has(key)) disappeared.push(key);
  }
  const resumed: string[] = [];
  for (const key of exiting.keys()) {
    if (currentKeys.has(key)) resumed.push(key); // 退出中又回来：中断续接（A3.9）
  }
  if (disappeared.length > 0 || resumed.length > 0) {
    setExiting((prev) => {
      const next = new Map(prev);
      for (const key of disappeared) next.set(key, keptRef.current.get(key)!);
      for (const key of resumed) next.delete(key);
      return next;
    });
  }

  // ④ safeToRemove：动画播完的 child 调它，触发"真正的卸载"
  const onExitComplete = React.useCallback((key: string) => {
    setExiting((prev) => {
      if (!prev.has(key)) return prev; // 幂等：transitionend 与兜底 timer 都会调
      const next = new Map(prev);
      next.delete(key);
      keptRef.current.delete(key); // 留档同步删除：下一轮渲染不再补它
      return next;
    });
  }, []);

  const wrap = (element: React.ReactElement, isPresent: boolean) => (
    <PresenceContext.Provider
      key={String(element.key)}
      value={{
        isPresent,
        onExitComplete: isPresent ? () => {} : () => onExitComplete(String(element.key)),
      }}
    >
      {element}
    </PresenceContext.Provider>
  );

  // ③ 渲染 = 本轮 children（isPresent=true）+ 退出区旧 children（isPresent=false）
  return (
    <>
      {currentChildren.map((c) => wrap(c, true))}
      {[...exiting.entries()].map(([key, el]) => wrap(el, false))}
    </>
  );
}
```

```tsx
// FadeListItem.tsx —— 消费方：isPresent 变 false 时播退场，播完调 onExitComplete
import * as React from 'react';
import { usePresence } from './MiniAnimatePresence';

export function FadeListItem({ children }: { children: React.ReactNode }) {
  const { isPresent, onExitComplete } = usePresence();
  const itemRef = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    if (isPresent) return;
    const el = itemRef.current;
    if (!el) return;
    el.classList.add('is-exiting');

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== e.currentTarget) return; // 冒泡判定纪律同 A3.3
      onExitComplete();
    };
    el.addEventListener('transitionend', onEnd);
    const t = window.setTimeout(onExitComplete, 300 + 60); // 兜底纪律同 A3.3：先到先结算
    return () => {
      window.clearTimeout(t);
      el.removeEventListener('transitionend', onEnd);
    };
  }, [isPresent, onExitComplete]);

  return (
    <li ref={itemRef} className="fade-item" style={{ transition: 'opacity 300ms ease' }}>
      {children}
    </li>
  );
}
```

与 framer-motion 的能力差距清单（也是它的源码在补什么）：

| AnimatePresence 能力 | 我们的 Mini 版 | framer-motion 的做法 |
|---|---|---|
| `mode="wait"`（等全部退完再进） | 无 | 用 exiting 数组长度 gate 新 children 的下发 |
| `popLayout`（退出项脱离布局流） | 无 | 退出项 `position: absolute` + FLIP 补位 |
| `initial={false}`（首挂载不播入场） | 无（首挂即 isPresent=true，本来也不播） | 同语义，显式控制 |
| 动画参数化（exit 变体、spring） | child 自己写 CSS | motion 组件持有动画引擎 |
| key 冲突防御 | 无（靠调用方） | dev 期检测重复 key |

坑：

1. **直接子级没有稳定 key**。症状：列表一变，全列表闪退场。根因：diff 靠 key，key 缺失（用索引当 key 且有删除）时 React 复用错位。修法：`AnimatePresence` 的直接子级必须带**业务 key**——文档里这句话要加粗。
2. **child 不接 onExitComplete → 永不卸载**。症状：退场动画播完元素还在（透明但占位），内存与僵尸 DOM 累积。修法：库层面给保底超时（如 exit 时长 × 2 后强制 safeToRemove）；文档写明"放入 Presence 的组件必须消费 usePresence"。
3. **StrictMode 双渲染下的 diff 幂等**。症状：开发环境偶发"应退场的项直接消失"。根因：渲染期 diff 副作用（keptRef 更新、setExiting）在双渲染下执行两次——keptRef 是幂等的（set 同 key 无感），setExiting 的 updater 也是幂等的（disappeared 只在第一次为非空，第二次 exiting 已含该 key）。**保持 diff 操作幂等是能过 StrictMode 的前提**，改这段代码时别引入"第一次才算数"的逻辑。
4. **与 useMountTransition 的分工**。单实例开合（Modal）用 A3.3/A3.8 的 hook 更轻；列表增删（Toast/Tags/TodoList）才需要 Presence——两者不是替代关系，AnimatePresence 源码里单个 child 的退场走的也是同构的双状态机。
