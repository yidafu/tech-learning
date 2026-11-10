---
title: "3. 动画：CSS transition 状态机、framer-motion 进出场、列表 FLIP（AnimatePresence）"
---

> 本文是《阶段 4：高频业务场景 ⭐实战核心（3 周）》按小节拆分后的续篇，上一部分见 [19-2-拖拽排序-dnd-kit-列表拖拽-多容器移动.md](19-2-拖拽排序-dnd-kit-列表拖拽-多容器移动.md)。

#### 3. 动画：CSS transition 状态机、framer-motion 进出场、列表 FLIP（AnimatePresence）

**是什么。** 进出场动画的本质矛盾：**React 卸载组件是同步删 DOM，而动画需要元素"活着"一段时间播完**。两个解法：手写"CSS transition 状态机"（理解原理），或用 framer-motion 的 `AnimatePresence`（生产标配）。列表 FLIP（First-Last-Invert-Play）则解决"删除中间项时，后面兄弟项平滑上移"这类**位置变化动画**。

**为什么需要。** 没有 exit 动画时，弹窗、抽屉、Toast 是"瞬间消失"，用户眼睛跟不上因果（我刚点了什么？东西去哪了？）。动画在这里不是装饰，而是**操作反馈的延续**——研究共识是 100~300ms 的过渡能显著提升"因果可感知性"。而 FLIP 之于列表：`filter` 掉一项后 DOM 重排是瞬移的，用户丢失了"哪个元素去了哪"的追踪线索。

**怎么做（机制分步）。**

*CSS transition 状态机*。把一个组件的可见性拆成**可见性**（要不要渲染）与**过渡阶段**（enter / entering / exit）两个正交状态：

```text
show=true  → phase: enter（挂载，初始样式：透明）→ 下一帧 entering（目标样式：不透明，transition 触发）
show=false → phase: exit（回到透明样式）→ onTransitionEnd 后才真正卸载（phase: exited 返回 null）
```

关键点：从 `enter` 切到 `entering` 必须等浏览器**完成一次样式计算与绘制**——连续同步两次 setState，浏览器会把两次样式合并渲染，transition 不触发。用**双 `requestAnimationFrame`**（比 `setTimeout(0)` 可靠）保证中间那一帧被绘制。卸载同理反过来：不能直接条件渲染掉，要先切 `exit` 样式、监听 `transitionend` 再移除。

*framer-motion*。`motion.div` 组件把 `initial / animate / exit` 三个样式集映射到三个阶段；`<AnimatePresence>` 的职责只有一件事——**跟踪直接子组件的卸载**：子元素被移除时不立即删 DOM，先播 `exit` 动画再删。所以"条件渲染必须写在 `AnimatePresence` 的直接子级上"是铁律。

*列表 FLIP*。给每个列表项加 `layout` 属性：framer-motion 在每次提交后测量元素新旧位置（First/Last），先施加反向 transform（Invert，元素视觉上留在原位），再补间到 0（Play）。中间项被删、其余项上移的动画全自动。`mode="popLayout"` 让被删除的元素脱离文档流播 exit，兄弟项的 FLIP 与其并行动画，不会互相顶撞。

安装：

```bash
npm i framer-motion
```

**代码示例。** 先手写 CSS 状态机（原理）：

```tsx
// components/CssTransition.tsx
import { ReactNode, useEffect, useRef, useState } from 'react';

type Phase = 'enter' | 'entering' | 'exit' | 'exited';

/**
 * CSS transition 状态机：
 * enter（初始样式）→ 下一帧 entering（目标样式，transition 被触发）
 * show=false → exit（过渡回初始样式）→ onTransitionEnd 后才真正卸载
 */
export function CssTransition({ show, children }: { show: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(show ? 'entering' : 'exited');
  // 保存待取消的 rAF 句柄：show 快速切换时丢弃过期的切相请求
  const rafRef = useRef<number | null>(null);

  function cancelPendingRaf() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  useEffect(() => {
    if (show) {
      setPhase('enter');
      // 双 rAF：确保 enter 样式先被绘制一帧，再切 entering，transition 才能触发
      const raf1 = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setPhase('entering'));
      });
      rafRef.current = raf1;
    } else {
      setPhase((p) => (p === 'exited' ? 'exited' : 'exit'));
    }
    return cancelPendingRaf;
  }, [show]);

  if (phase === 'exited') return null;

  const className =
    phase === 'enter' ? 'fade fade-enter' // 初始态：透明 + 下移 8px
    : phase === 'entering' ? 'fade fade-entering' // 目表态：不透明 + 归位，transition 生效
    : 'fade fade-exit'; // 出场：回到透明 + 下移

  // 出场动画播完，真正卸载
  function handleTransitionEnd() {
    if (phase === 'exit') setPhase('exited');
  }

  return (
    <div className={className} onTransitionEnd={handleTransitionEnd}>
      {children}
    </div>
  );
}
```

`CssTransition` 配套样式：

```css
/* CssTransition 配套样式：transition 声明在基类上，三个阶段只切换"值" */
.fade {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-enter,
.fade-exit {
  opacity: 0;
  transform: translateY(8px);
}
.fade-entering {
  opacity: 1;
  transform: translateY(0);
}
```

framer-motion 版弹窗进出场（等价于上面整个状态机的两行声明）：

```tsx
// components/FadeModal.tsx
import { AnimatePresence, motion } from 'framer-motion';

export function FadeModal({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    // AnimatePresence 监听直接子组件的挂载/卸载：卸载时先播 exit 再删 DOM
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-mask"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-body"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{title}</h3>
            <button onClick={onClose}>关闭</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

列表 FLIP（AnimatePresence + `layout`，删除中间项时后面项平滑上移）：

```tsx
// components/FlipTaskList.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Task {
  id: number;
  title: string;
}

export function FlipTaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: '写周报' },
    { id: 2, title: '复盘会议' },
    { id: 3, title: '发版' },
  ]);
  const [title, setTitle] = useState('');

  function add() {
    if (!title.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now(), title: title.trim() }]);
    setTitle('');
  }

  return (
    <div className="task-list-wrap">
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="新任务"
        />
        <button onClick={add}>添加</button>
      </div>
      <ul className="task-list">
        {/* initial={false}：初次加载不播进场，只有后续变化才动画 */}
        {/* mode="popLayout"：被删项脱离文档流播 exit，兄弟项的 layout 动画与它并行不顶撞 */}
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            // layout 属性即 FLIP：每次提交后测量新旧位置差，先反向 transform 再补间归零
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="task-item"
            >
              {task.title}
              <button
                onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                aria-label={`删除 ${task.title}`}
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
```

**常见坑。**

- **症状**：CSS 版状态机进场动画不播，元素直接出现。**根因**：`enter` 与 `entering` 在同一次渲染批次里被合并，浏览器没机会绘制初始样式。**修法**：双 `requestAnimationFrame` 再切目标态（上面实现），或改用 framer-motion 的 `initial/animate`。
- **症状**：framer-motion 的 `exit` 完全不生效，组件瞬间消失。**根因**：条件渲染没有写在 `AnimatePresence` 的**直接子级**上（比如在更外层 if 掉了整个 AnimatePresence，或子级没 `key`）。**修法**：`<AnimatePresence>{open && <motion.div key="modal" .../>}</AnimatePresence>` 这个结构不能变。
- **症状**：初次进入页面，整页列表齐刷刷播了一遍进场动画，很吵。**根因**：默认 `initial` 动画在首挂载也会播。**修法**：`<AnimatePresence initial={false}>`。
- **症状**：FLIP 列表动画"飞来飞去"，元素乱窜。**根因**：`key` 用 index 或不稳定值，React 复用错元素，位置测量张冠李戴。**修法**：稳定 id 作 key——这条与 dnd-kit、虚拟列表的 key 规范是同一条。
- **症状**：`transitionend` 触发后组件闪了一下。**根因**：子元素（比如按钮 hover）的 `transitionend` 冒泡上来被当成容器动画结束。**修法**：在 handler 里校验 `e.target === e.currentTarget`，或只用 framer-motion 免疫这类时序问题。

##### 补充：多方向抽屉与步骤切换——custom 传参与 mode="wait"

**是什么。** framer-motion 的两个进阶机制：`custom` 把组件外部的动态参数（最典型的是**方向**）传给 variants——包括**正在退场的元素**也能拿到最新值；`mode="wait"` 让 `AnimatePresence` 先等旧元素完全退场，再挂载新元素，两者不同屏。

**为什么需要。** 抽屉（Drawer）从右侧滑入、关闭时要滑回右侧；但同一个抽屉组件可能从左、从上打开——退场动画的样式是在卸载那一刻确定的，如果方向写死在 variants 里就只剩一个方向可退。`custom` 解决"退场参数过期"：普通 props 更新不到正在退场的元素（见补充三坑 5），而挂在 `AnimatePresence` 上的 `custom` 会广播给退场中的克隆。`mode="wait"` 解决步骤切换器/详情页"上一条下一条"的场景：默认 `sync` 模式下新旧两块内容同时在场，普通文档流里会互相顶撞出跳动。

**代码示例。** 多方向抽屉：

```tsx
// components/DirectionDrawer.tsx
import type { ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';

type Direction = 'left' | 'right' | 'top';

// 函数形态的 variants（dynamic variants）：接收 custom（方向）返回样式
const drawerVariants: Variants = {
  enter: (dir: Direction) => ({
    x: dir === 'left' ? '-100%' : dir === 'right' ? '100%' : '0%',
    y: dir === 'top' ? '-100%' : '0%',
  }),
  center: { x: '0%', y: '0%' },
  exit: (dir: Direction) => ({
    x: dir === 'left' ? '-100%' : dir === 'right' ? '100%' : '0%',
    y: dir === 'top' ? '-100%' : '0%',
  }),
};

export function DirectionDrawer({
  open,
  direction,
  onClose,
  title,
  children,
}: {
  open: boolean;
  direction: Direction;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    // custom 写在 AnimatePresence 上：正在退场的抽屉也能拿到"最新方向"
    <AnimatePresence custom={direction}>
      {open && (
        <motion.div className="drawer-mask" onClick={onClose}>
          <motion.div
            className={`drawer drawer-${direction}`}
            custom={direction} // 子元素也要传：进场时读的是自己的 custom
            variants={drawerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={title}
          >
            <header>
              <h3>{title}</h3>
              <button onClick={onClose} aria-label="关闭">×</button>
            </header>
            <div className="drawer-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

步骤切换器（`mode="wait"`，方向感知的左右滑动）：

```tsx
// components/StepWizard.tsx
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function StepWizard({
  step,
  direction,
  children,
}: {
  step: number;
  direction: 1 | -1; // 1=前进向左滑出，-1=后退向右滑出
  children: ReactNode;
}) {
  return (
    // mode="wait"：旧的先退干净，新的才进场；initial={false} 首挂载不播
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={step} // 步骤号变 = 换了一个元素，触发 exit + enter
        custom={direction}
        variants={{
          enter: (dir: 1 | -1) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (dir: 1 | -1) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**关键取舍。** `mode="wait"` 的总时长 = exit + enter（约 0.36s），步骤多时节奏拖沓——轮播图、信息流这类高频切换反而用默认 `sync` + 绝对定位错开新旧位置。`custom` 必须同时写在 `AnimatePresence` 与 `motion` 子元素上：前者服务退场元素，后者服务在场元素，漏一边就会出现"进场对了退场方向不对"的诡异表现。

##### 补充：动画性能的量化与治理——只动 transform / opacity

**是什么。** 浏览器渲染管线是 style → layout → paint → composite 四段。动画期间每帧改 `width/top/left/margin` 这类**几何属性**会从 layout 段整段重跑（重排），主线程一忙就掉帧；只改 `transform` 与 `opacity` 则只走最后的合成段（GPU 完成），主线程再卡动画照样 60fps。framer-motion 的 `layout`（FLIP）本质也是把位置变化换算成 `transform` 补间。

**怎么量化（三步）。**

1. Chrome DevTools → Performance → 录制，操作动画 3~5 秒，停止；
2. 看帧率条：绿色 60fps 为健康，标黄标红的帧点开看耗时；
3. 火焰图找紫色 Layout 块：**每一帧都有 Layout = 动画属性选错了**；同时开 React Profiler 录制，确认动画期间没有 React commit——动画应由 framer-motion/CSS 驱动，若每帧触发 setState（比如用 `onAnimationFrame` 更新 state 画进度条），Profiler 会每帧亮起，这本身就是性能 bug。

**优化前后对比。** 200 行列表项的展开动画：

```css
/* 反例：动画几何属性——每帧重排，Performance 录制约 40~50fps，紫色 Layout 块连成片 */
.row-collapsible { transition: height 200ms ease; }

/* 正例：动画 transform——只走合成段，同场景 60fps，Layout 块消失 */
.row-collapsible { transition: transform 200ms ease; transform-origin: top; }
.row-collapsible.is-collapsed { transform: scaleY(0); }
```

`will-change: transform` 可以把元素提前提升为独立合成层，但**不要常驻**——每层都要占显存，几十个列表项全加等于内存翻倍；只在动画前加、动画结束移除（或干脆交给 framer-motion 自动管理）。

**可访问性。** 动效是"多数人的体验、少数人的负担"：前庭障碍用户会被位移动画引发不适。全局方案一行——framer-motion 的 `MotionConfig` 在应用根部统一降级：

```tsx
import { MotionConfig } from 'framer-motion';

// reducedMotion="user"：系统开了"减弱动态效果"时，transform/layout 动画自动改为瞬时切换
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

CSS 侧的等价兜底与全站 motion token 的体系化做法，见《react-组件库实战大纲/04-A3-退出动画-难题-visible-mounted-双状态机.md》（含 reduced-motion 导致 `transitionend` 不来的 timeout 兜底）与《react-高阶场景全景图/06-C-图形与可视化.md》。

##### 补充：高频坑位补遗

- **症状**：给 `AnimatePresence` 的直接子级外面包了一层普通 `div`（为了统一加 className），exit 不再触发。**根因**：`AnimatePresence` 只追踪**直接子级**的挂卸，那层 `div` 一直都在，里面的 `motion.div` 卸载它感知不到。**修法**：

  ```tsx
  // ✗ <AnimatePresence><div className="wrap">{open && <motion.div exit={...} />}</div></AnimatePresence>
  // ✓ 让 motion 元素自己当这层：<motion.div className="wrap" exit={...} />
  ```

- **症状**：Tab 切换内容不播进出场。**根因**：外层 `motion.div` 的 `key` 写死（`key="content"`），`AnimatePresence` 认为是同一个元素在换 children，没有卸载事件。**修法**：`key` 绑定会变化的标识（`key={tabId}`），让切换表现为"旧元素卸载 + 新元素挂载"。
- **症状**：删除外层卡片时，卡片内部自己增删的小标签的 exit 不播。**根因**：`AnimatePresence` 只管一层——内层条件渲染的进出场需要内层再包一个 `AnimatePresence`。**修法**：嵌套结构就嵌套 `AnimatePresence`，各管一层；外层退场时 variants 会沿组件树传播，两层动画可叠加。
- **症状**：CSS 状态机版本卡死——元素透明度停在 0 但永远不卸载。**根因**：`transitionend` 不会来的情况不止冒泡一种：动画被新样式打断时浏览器发的是 `transitioncancel`；元素或祖先被设 `display: none`；duration 被覆盖为 0。只监听 `end` 就永久停在 exit 相位。**修法**：timeout 兜底（时长 + 50ms 余量）保证一定卸载，`end` 只是提前触发：

  ```tsx
  useEffect(() => {
    if (phase !== 'exit') return;
    const timer = window.setTimeout(() => setPhase('exited'), 200 + 50);
    return () => window.clearTimeout(timer);
  }, [phase]);
  ```

  四种"不来"的完整清单见《react-组件库实战大纲/04-A3-退出动画-难题-visible-mounted-双状态机.md》。
- **症状**：正在退场的列表项显示了"已经删除"的数据（比如删除后又立刻重命名了它）。**根因**：退场中的元素是移除时的快照，父组件后续更新不会再同步给它——这是 `AnimatePresence` 的设计而非 bug。**修法**：exit 动画只用 opacity/scale 这类"不表达数据"的属性，别让退场元素承担展示新数据的职责；或把 exit 时长压短（≤200ms）缩小错窗口。

