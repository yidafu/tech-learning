---
title: "Carousel / Slider / Rate / ColorPicker（★★★）"
---

> 本文是《Lv3 复杂交互组件（公认最考功力）》按小节拆分后的续篇，上一部分见 [20-Upload.md](20-Upload.md)。

### Carousel / Slider / Rate / ColorPicker（★★★）

> 本节骨架（原大纲）：
> - Carousel：自动播放（visibilitychange 暂停）、无限循环（clone 首尾）、拖拽切换
> - Slider：pointer capture 拖拽、键盘步进、tooltip 位置换算
> - ColorPicker：HSV 面板拖拽 + 渐变背景计算 + 格式转换

这四个组件是同一个母题的四种变奏：**把连续的几何输入（拖拽的位移、指针的坐标）离散成语义值（页码、数值、星级、颜色）**。它们共用两件内功：pointer 事件体系（`setPointerCapture` + `touch-action: none`）和"比例 ↔ 值"的换算公式。逐个看。

---

#### Carousel：自动播放、无限循环、拖拽切换

**考点 1：自动播放（interval + visibilitychange 暂停）。** 用 `setInterval` 推进页码，但必须处理两个经典缺陷：一是切到后台标签页时浏览器降频计时，回来瞬间连跳好几页；二是后台空转浪费电量。解法是监听 `document.visibilitychange`，隐藏即停、可见即启。同时注意 `setInterval` 回调用**函数式更新** `setIndex(i => i + 1)`，避免闭包捕获过期值。

**考点 2：无限循环（clone 首尾 + 瞬时跳回）。** 如果只是 `index = (index + 1) % n`，从最后一页回到第一页时，轨道会反向扫过全部内容（或无动画地闪跳），视觉穿帮。工业解法是**克隆首尾**，把循环边界藏在克隆页里：

```text
渲染序列：  [末页']   第0页   第1页  ...  第n-1页   [第0页']
序列下标：     0       1      2    ...    n       n+1
                              ▲                ▲
                         正常停在这里      动画滑到这里后：
                         （真实页区间）    ①关过渡 ②瞬移回下标 1 ③下一帧恢复过渡
```

第 n+1 位放的是第 0 页的**克隆**，两者像素级相同。从第 n 页滑到第 n+1 页（动画正常播完），在 `transitionend` 时刻关闭 transition、把 index 瞬改回 1——因为克隆页和真实页长得一模一样，这一帧的"瞬移"用户完全看不见。反向同理（滑到下标 0 的首克隆后跳回 n）。这就是"瞬时跳回"技巧的全部。

**考点 3：拖拽切换（pointer 拖动距离阈值判定）。** pointerdown 记录起点，pointermove 让轨道**跟手位移**（把位移 px 加进 transform），pointerup 时按**拖动行程是否过阈值**决定翻页还是回弹：阈值取 `min(容器宽 × 20%, 80px)`——既要"拖一点就能翻"的灵敏，又要防误触。拖动期间关闭 transition（否则跟手位移会被 0.4s 的过渡拖成"橡皮筋"），松手后恢复。

三个考点合体的完整实现：

```tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export function Carousel({
  children,
  interval = 3000,
}: {
  children: ReactNode[]; // 至少 2 张
  interval?: number;
}) {
  const count = children.length;
  const slides = [children[count - 1], ...children, children[0]]; // clone 首尾
  const total = slides.length; // count + 2

  const [index, setIndex] = useState(1); // 渲染序列下标，初始指向真实第 0 页
  const [animated, setAnimated] = useState(true); // 瞬时跳回时临时关闭过渡
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const start = useCallback(() => {
    stop();
    timerRef.current = window.setInterval(() => setIndex((i) => i + 1), interval);
  }, [interval, stop]);

  // 自动播放：页面不可见时暂停——回来不连跳、后台不空转
  useEffect(() => {
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [start, stop]);

  // 无限循环核心：动画落到克隆页后"关过渡 → 瞬移 → 恢复过渡"
  const handleTransitionEnd = () => {
    if (index === total - 1) {
      setAnimated(false);
      setIndex(1); // 瞬移回真实第 0 页（与尾克隆同貌，视觉无缝）
    } else if (index === 0) {
      setAnimated(false);
      setIndex(total - 2); // 瞬移回真实最后一页
    }
    if (index === 0 || index === total - 1) {
      // 等"无过渡跳变"绘制完成后，再恢复过渡——顺序不能反，否则瞬移也带动画
      requestAnimationFrame(() => setAnimated(true));
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId); // 拖出容器仍持续跟踪
    setDragging(true);
    stop(); // 拖动期间暂停自动播放
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    setDragX(e.clientX - dragStartX.current); // 跟手位移
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const width = containerRef.current?.clientWidth ?? 1;
    const threshold = Math.min(width * 0.2, 80); // 行程阈值：20% 宽或 80px 取小
    if (dx <= -threshold) setIndex((i) => i + 1); // 左拖过阈值 → 下一页
    else if (dx >= threshold) setIndex((i) => i - 1); // 右拖过阈值 → 上一页
    // 未过阈值：dragX 清零 + 恢复过渡 = 自动回弹到当前页
    dragStartX.current = null;
    setDragging(false);
    setDragX(0);
    start();
  };

  // 换算真实页码（供指示点高亮）：克隆位映射回真实边界
  const realIndex = index === 0 ? count - 1 : index === total - 1 ? 0 : index - 1;

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTransitionEnd={handleTransitionEnd}
        style={{
          display: 'flex',
          width: `${total * 100}%`, // 轨道总宽 = 页数 × 容器宽
          // translateX 百分比基准是轨道自身宽度，所以每页步长是 100/total %
          transform: `translateX(calc(${(-index * 100) / total}% + ${dragX}px))`,
          transition: dragging || !animated ? 'none' : 'transform 0.4s ease',
          touchAction: 'none', // 拖动与页面触摸滚动不抢手势
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} style={{ flex: `0 0 ${100 / total}%` }}>
            {slide}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 8, width: '100%', textAlign: 'center' }}>
        {children.map((_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              margin: '0 4px',
              borderRadius: '50%',
              background: i === realIndex ? '#1677ff' : 'rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

Carousel 常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 快速连点箭头后轮播卡在边界 | 连点触发 `transitioncancel`，`onTransitionEnd` 没跑到，瞬时跳回逻辑失守 | 跳回判定别只依赖 transitionend：在 effect 里对越界 index 做一帧兜底校正 |
| 2 | 拖动跟手"发黏" | 拖动中的 `dragX` 位移也被 0.4s transition 平滑了 | 拖动期间 `transition: none`（代码里的 `dragging` 分支） |
| 3 | 切后台再回来一次跳好几页 | 后台 tab 计时器降频堆积，恢复后连环触发 | `visibilitychange` 暂停/恢复 |
| 4 | 移动端拖不动 | 浏览器把横向触摸当作页面滚动，pointermove 被吞 | 轨道上 `touch-action: none` |

---

#### Slider：pointer capture、键盘步进、tooltip 位置换算

**先讲 `setPointerCapture` 的意义**——它是 Pointer Events 相对 Mouse Events 最大的工程红利。不用它，拖拽必须"在元素上 down、到 window 上挂 move/up 再清理"，元素一旦丢失指针（快速甩出、多显示器、被系统手势打断）就拖飞。调用 `el.setPointerCapture(pointerId)` 后，**后续所有该指针的事件都被重定向到这个元素**，无论指针跑到哪里，move/up 照收，直到 `pointerup` 自动释放。于是一套 onPointerDown/Move/Up 挂在同一个元素上就完成了完整拖拽。注意 `pointercancel`（系统打断，如来电、手势切换）也要复位状态。

**键盘步进**直接抄 APG（WAI-ARIA Authoring Practices，见 A5）的 slider 模型：`role="slider"` + `tabIndex={0}` + `aria-valuemin/max/now`；方向键 ±step、PageUp/Down ±10×step、Home/End 到两端，全部 `preventDefault()`（方向键默认会滚动页面）。

**tooltip 位置换算是本考点最常被问的公式。** 直觉写法 `left: ${percent * 100}%` 是错的，因为**手柄有宽度**：手柄中心的可移动范围不是 `[0, W]`，而是 `[thumb/2, W - thumb/2]`（手柄不能溢出轨道两端）。所以：

```text
thumbCenter = percent × (W − thumbW) + thumbW / 2

CSS 写法（免测量、响应式）：
left: calc((100% - 16px) * 0.4 + 8px);   /* percent=0.4、thumb=16px */
transform: translateX(-50%);              /* 以中心对齐 */
```

两端误差各 `thumbW/2`（本例 8px），percent=0 或 1 时最明显——症状就是"手柄/气泡在两端悬空或溢出"。

完整实现（含 A1 双模式受控）：

```tsx
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const THUMB = 16; // 手柄直径

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 0,
  onChange,
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: number; // 传入即受控（A1 双模式）
  defaultValue?: number;
  onChange?: (v: number) => void;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const percent = (current - min) / (max - min); // 0~1

  const commit = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      setInner(clamped);
      onChange?.(clamped);
    },
    [min, max, onChange],
  );

  // 指针横坐标 → 数值：百分比反算 + 步进对齐
  const setValueFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const snapped = Math.round((min + ratio * (max - min) - min) / step) * step + min;
      commit(Number(snapped.toFixed(6))); // 清除 0.30000000000000004 类浮点残渣
    },
    [min, max, step, commit],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); // 关键：出界不丢事件
    setDragging(true);
    setValueFromClientX(e.clientX); // 点哪跳哪
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    if (e.key in map) {
      e.preventDefault(); // 阻止方向键滚动页面
      commit(current + map[e.key]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(max);
    }
  };

  return (
    <div style={{ position: 'relative', padding: '12px 0', width: 320 }}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => dragging && setValueFromClientX(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)} // 系统打断时复位
        onKeyDown={onKeyDown}
        style={{
          height: 4,
          borderRadius: 2,
          background: '#e5e7eb',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        {/* 已滑过的填充 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent * 100}%`,
            background: '#1677ff',
            borderRadius: 2,
          }}
        />
      </div>
      {/* 手柄：中心位置公式 = percent × (轨道宽 − 手柄宽) + 手柄宽/2 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc((100% - ${THUMB}px) * ${percent} + ${THUMB / 2}px)`,
          transform: 'translate(-50%, -50%)',
          width: THUMB,
          height: THUMB,
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid #1677ff',
          pointerEvents: 'none', // 手柄不抢轨道的指针事件
        }}
      />
      {/* tooltip：与手柄同心，同一公式 */}
      {dragging && (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: `calc((100% - ${THUMB}px) * ${percent} + ${THUMB / 2}px)`,
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {current}
        </div>
      )}
    </div>
  );
}
```

Slider 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 快速拖动到轨道外，数值停在半路 | 没有 pointer capture，出界后 move 不再派发 | `setPointerCapture(pointerId)` |
| 2 | 手柄在两端溢出/悬空 | `left: percent%` 没考虑手柄自身宽度 | `calc((100% − thumbW) × p + thumbW/2)` 公式 |
| 3 | 值出现 0.30000000000000004 | 浮点步进未对齐 | `Math.round(v/step)*step` + `toFixed(6)` |
| 4 | 按方向键页面跟着滚 | 键盘事件未 `preventDefault` | 见代码 onKeyDown |
| 5 | 受控模式拖不动 | 内部 state 与外部 value 打架（违反 A1 纪律） | 有 value 就完全以 value 为准，只回调不藏私 |

---

#### Rate：星级半星的换算

半星不是画了半颗星，而是**两层星星、上层按宽度百分比裁切**。核心换算只有一个：`value / count × 100%` = 覆盖层宽度。value=3.5、count=5 时覆盖 70%——第三颗星恰好露一半，第四第五颗保持灰色。半星的判定输入端同样简单：指针落在某颗星元素坐标的左半边记 `x.5`，右半边记 `x+1`：

```tsx
import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7-6.2-3.7-6.2 3.7 1.6-6.7L2.2 8.9l6.9-.6z" />
    </svg>
  );
}

export function Rate({
  count = 5,
  allowHalf = false,
  value,
  defaultValue = 0,
  onChange,
}: {
  count?: number;
  allowHalf?: boolean;
  value?: number;
  defaultValue?: number;
  onChange?: (v: number) => void;
}) {
  const [inner, setInner] = useState(defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const current = value ?? inner; // A1 双模式
  const shown = hover ?? current; // 悬停预览优先于已选值

  // 半星判定：当前星元素的左半边 → x.5；右半边 → x+1
  const valueAt = (e: ReactPointerEvent, i: number) => {
    if (!allowHalf) return i + 1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? i + 0.5 : i + 1;
  };

  // 键盘：左右方向按 step 步进（半星模式 step=0.5）
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = allowHalf ? 0.5 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(current + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(current - step);
    }
  };
  const commit = (v: number) => {
    const clamped = Math.min(count, Math.max(0, v));
    setInner(clamped);
    onChange?.(clamped);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setHover(null)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* 底层：灰色满排星星，同时承担全部交互 */}
      <div style={{ display: 'flex', gap: 4, color: '#d1d5db' }}>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            style={{ cursor: 'pointer' }}
            onPointerMove={(e) => setHover(valueAt(e, i))}
            onClick={(e) => commit(valueAt(e, i))}
          >
            <Star />
          </span>
        ))}
      </div>
      {/* 覆盖层：彩色星星，overflow:hidden + 宽度百分比 = 半星的全部秘密 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${(shown / count) * 100}%`,
          overflow: 'hidden',
          pointerEvents: 'none', // 纯视觉层，不挡底层交互
        }}
      >
        <div style={{ display: 'flex', gap: 4, width: 'max-content', color: '#f59e0b' }}>
          {Array.from({ length: count }, (_, i) => (
            <Star key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

两个实现细节值得圈出来：覆盖层内层用了 `width: max-content`——因为外层 `overflow: hidden` 会把 flex 子项压缩变形，`max-content` 让内层保持与底层同宽，裁切才精确；交互全部放在底层（覆盖层 `pointer-events: none`），避免两层星星的点击区域错位。

无障碍补充：antd 的 Rate 实现为 `role="radiogroup"` + 每颗星一个隐藏 radio（可聚焦、可 Tab），键盘模型与上面一致；上面的简化版用容器 `tabIndex` + 方向键也能过基本检查（A5 的原则：先保证键盘可达，再谈完美 aria）。

Rate 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 半星边界判定左右颠倒 | 星内 x 坐标没和自身宽度比，误用了容器坐标 | `e.clientX - rect.left < rect.width / 2` |
| 2 | 覆盖层星星被压扁 | `overflow: hidden` 的容器里 flex 子项被压缩 | 内层 `width: max-content` |
| 3 | hover 离开后高亮闪回旧值 | 没区分 hover 预览态与已选态 | 双状态 `shown = hover ?? current` |
| 4 | value=3.5 时第三颗星全灰 | 覆盖层宽度算成 `value/count` 后取整了 | 保留小数百分比，浏览器支持亚像素裁切 |

---

#### ColorPicker：HSV 面板拖拽、渐变背景计算、格式转换

**为什么拾色器都用 HSV。** RGB 是机器视角（三路信号强度），人挑颜色时想的是"什么色相、多鲜艳、多亮"——HSV 正好：H 色相 0–360（色环）、S 饱和度 0–1（离白多远）、V 明度 0–1（离黑多远）。更妙的是它天然映射 2D 拖拽：**SV 面板是一块矩形**（横轴 S、纵轴 V），**H 是一条色带**。antd ColorPicker、Sketch、Figma 全是这个结构。

**① 坐标 → hsv 的换算公式**（面板拖拽的核心，两行）：

```text
s = (pointerX − rect.left) / rect.width        // 横向比例即饱和度
v = 1 − (pointerY − rect.top) / rect.height    // 纵向比例取反即明度（原点在左上）
```

**② 渐变背景计算——为什么两层 linear-gradient 加一个纯色底，就"是"SV 面板。** 标准画法（注意 CSS 多背景**先写的在上层**）：

```text
第 1 层（最上）: linear-gradient(to top, #000, transparent)      ← 黑，自下而上淡出
第 2 层:        linear-gradient(to right, #fff, transparent)    ← 白，自左向右淡出
第 0 层（底色）: hsl(h, 100%, 50%)                               ← 当前色相的纯色
```

这不是"看起来像"的美术技巧，可以逐通道证明它精确等于 hsvToRgb：面板上任意一点 (s, v) 的合成色 = 纯色相先与白按横向比例 s 混合、再与黑按纵向比例 v 相乘。以 h=0（纯红）为例：顶边从左到右是 白→红，即通道值 `1` 与 `1-s`（对照 hsvToRgb(h, s, 1) 的 `r = c + m = s + (1-s) = 1`、`g = b = 1-s`，逐通道相等）；再向下乘 v（黑层 alpha 为 1−v，合成即顶色 × v，对照公式中全部通道同乘 v）。**两张渐变就是 hsvToRgb 公式的"物理实现"**，所以游标取色和背景渲染天然一致、永不分歧。（严格说浏览器在 sRGB 伽马空间做线性混合，与人眼感知曲线略有出入，但这是所有拾色器的标准做法。）

**③ 格式转换（hex/rgb/hsv 互转）**。四个函数覆盖全部六个方向（hex↔hsv 走 rgb 中转）：

```ts
// hex → rgb（处理 #fff 三位缩写与 #ffffff 六位两种形态）
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) throw new Error(`非法 hex: ${hex}`);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// rgb → hex
export function rgbToHex(r: number, g: number, b: number): string {
  const h = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return `#${h.toUpperCase()}`;
}

// rgb → hsv（h 取 0-360，s/v 取 0-1，与面板坐标一致）
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    // 最大通道决定色相所在扇区，其余两通道之差决定扇区内偏移
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: max === 0 ? 0 : d / max, v: max };
}

// hsv → rgb
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s; // 纯色强度
  const hp = ((h % 360) + 360) % 360 / 60; // 六扇区归一
  const x = c * (1 - Math.abs((hp % 2) - 1)); // 扇区内的过渡通道
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
             [c, 0, x];
  const m = v - c; // 明度补偿：整体向黑（v 减小）或向白（s 减小）平移
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
```

**④ 组件实现**（SV 面板 + Hue 条 + hex 回显，pointer capture 拖拽与 Slider 同构）：

```tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const HUE_GRADIENT =
  'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)';

interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export function ColorPicker({
  value,
  defaultValue = { h: 212, s: 0.9, v: 1 },
  onChange,
}: {
  value?: HSV; // 受控（A1）
  defaultValue?: HSV;
  onChange?: (c: HSV) => void;
}) {
  const [inner, setInner] = useState<HSV>(defaultValue);
  const current = value ?? inner;
  const set = (next: HSV) => {
    setInner(next);
    onChange?.(next);
  };

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const drag = useRef<'sv' | 'hue' | null>(null);

  const applyFromSv = (e: ReactPointerEvent) => {
    const rect = svRef.current!.getBoundingClientRect();
    // 坐标 → hsv：横向比例 = s；纵向比例取反 = v
    const s = clamp01((e.clientX - rect.left) / rect.width);
    const v = 1 - clamp01((e.clientY - rect.top) / rect.height);
    set({ ...current, s, v });
  };
  const applyFromHue = (e: ReactPointerEvent) => {
    const rect = hueRef.current!.getBoundingClientRect();
    const h = clamp01((e.clientX - rect.left) / rect.width) * 360;
    set({ ...current, h });
  };

  const rgb = hsvToRgb(current.h, current.s, current.v);

  return (
    <div style={{ width: 240, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      {/* SV 面板：底色纯 hue + 白/黑两层渐变（见上文公式推导） */}
      <div
        ref={svRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = 'sv';
          applyFromSv(e);
        }}
        onPointerMove={(e) => drag.current === 'sv' && applyFromSv(e)}
        onPointerUp={() => (drag.current = null)}
        style={{
          position: 'relative',
          height: 160,
          borderRadius: 4,
          cursor: 'crosshair',
          touchAction: 'none',
          backgroundColor: `hsl(${current.h}, 100%, 50%)`, // 第 0 层：纯色相
          backgroundImage: [
            'linear-gradient(to top, #000, rgba(0,0,0,0))', // 第 1 层（最上）：黑
            'linear-gradient(to right, #fff, rgba(255,255,255,0))', // 第 2 层：白
          ].join(', '),
        }}
      >
        {/* 游标：位置 = 坐标换算的逆运算 */}
        <div
          style={{
            position: 'absolute',
            left: `${current.s * 100}%`,
            top: `${(1 - current.v) * 100}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue 条：一维渐变，横向即 h */}
      <div
        ref={hueRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = 'hue';
          applyFromHue(e);
        }}
        onPointerMove={(e) => drag.current === 'hue' && applyFromHue(e)}
        onPointerUp={() => (drag.current = null)}
        style={{
          position: 'relative',
          height: 12,
          marginTop: 12,
          borderRadius: 6,
          background: HUE_GRADIENT,
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${(current.h / 360) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            background: `hsl(${current.h}, 100%, 50%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 回显：hsv → rgb → hex 一路转换 */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            border: '1px solid #e5e7eb',
          }}
        />
        <code>{rgbToHex(rgb.r, rgb.g, rgb.b)}</code>
        <code style={{ color: '#6b7280' }}>
          rgb({rgb.r}, {rgb.g}, {rgb.b})
        </code>
      </div>
    </div>
  );
}
```

ColorPicker 常见坑：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 拖到面板左上角不是纯白 | 渐变层顺序错了（白层盖在黑层上） | CSS 多背景先写的在上：黑层写前、白层写后 |
| 2 | 拖到面板底部反而变亮 | 纵轴忘了取反（原点在左上角） | `v = 1 − y比例` |
| 3 | 游标位置与颜色对不上 | 游标 left/top 没做坐标换算的逆运算（s→left、1−v→top） | 见代码游标两处 |
| 4 | h=360 或负数时色相跳变 | 没做模运算 | `((h % 360) + 360) % 360` |
| 5 | `#fff` 三位 hex 解析出 NaN | 只按六位解析 | 见 hexToRgb 的补全逻辑 |

---

> 以下四个小节为增补：无缝循环第二实现、Slider 吸附与碰撞、Rate 清空与受控、ColorPicker 精度与 alpha。

#### 补充一：无缝循环的第二实现——translate 修正法与无限轮播索引换算

**是什么。** 无限循环轮播有两条工业路线：前文考点 2 的**首尾克隆法**（渲染 n+2 份、transitionend 瞬移回真实区间）；以及本节的 **translate 修正法**（不克隆任何页片，动画只走"0 → ±100%"这一段固定行程，动画结束后关过渡、归零 transform、并按取模把页片重新摆槽位）。Swiper 的 loop 是克隆一族，embla-carousel 是无克隆一族（位移 + 索引换算）。

**为什么值得单列。** 克隆法要维护 n+2 个渲染项与"渲染 index / 真实页"两套账；修正法把"跳回"彻底消灭，但代价是索引换算必须一次讲清——**无界步数、负数取模、槽位重排**这三件写错任何一件都会闪帧或死锁。

**机制分步：**

1. **无界步数 step**：next 就 `step+1`、prev 就 `step-1`，永不回绕（step 可以是 -3、17 任何整数）。真实页码 `realIndex = mod(step, n)`，指示点高亮与对外回调全用它。
2. **槽位映射**：页片 i 摆在槽位 `slot(i) = mod(i - step, n)`（0 = 视口内，1 = 右一屏，n-1 = 左一屏），绝对定位 `left: slot × 100%`。当前页永远在槽 0，next 的目标页永远在槽 1——动画只需把轨道从 0 平移到 -100%。
3. **修正时刻的账本**（以 next 为例，为什么无闪跳）：动画结束帧（transform=-100%）视口显示的是槽 1 的页片，即逻辑页 `mod(step+1, n)`；修正帧里 step→step+1、transform→0、全部页片按 `mod(i-(step+1), n)` 重摆——刚在视口的那页从槽 1 变槽 0，配合 transform 归零屏幕位置分毫未动；其余页片从一个视口外槽跳到另一个视口外槽，天然不可见；transition:none 与新槽位同一帧生效，不存在中间帧。
4. **与克隆法怎么选**：

| 维度 | 首尾克隆法（前文考点 2） | translate 修正法（本节） |
|---|---|---|
| 渲染项数 | n+2（两份克隆） | n |
| DOM 写入 | 只改 transform | transform + 每页 left（槽位重排） |
| 跳回时机 | transitionend 瞬移 index | transitionend 归零 transform + 重排槽位 |
| 最大风险 | transitioncancel 失守（连点/打断，前文坑 1） | 修正拆成两次提交会闪一帧 |
| 适用 | 页片重、克隆成本可控 | 页片轻或数量多、全程只有 n 个节点 |

拖拽切换与前文完全同构（拖动期 transform 用 px 偏移 + transition none，松手按阈值 `go(±1)`），不再重复。

```tsx
// ModuloCarousel.tsx —— 无克隆的无限循环：无界步数 + 取模槽位
import { useCallback, useEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react';

/** 正模：JS 的 % 对负数返回负值，循环索引一律用它 */
export const mod = (n: number, m: number): number => ((n % m) + m) % m;
/** 无界步数 → 真实页码（指示点高亮、对外回调都用它） */
export const realIndexOf = (step: number, count: number): number => mod(step, count);
/** 页片下标 i 在步数 step 下的槽位：0=视口内，1=右一屏，count-1=左一屏 */
export const slotOf = (i: number, step: number, count: number): number => mod(i - step, count);

export function ModuloCarousel({ children, interval = 3000 }: { children: ReactNode[]; interval?: number }) {
  const count = children.length; // ≥ 2
  const [step, setStep] = useState(0);                 // 无界步数：单调增减，永不回绕
  const [moving, setMoving] = useState<1 | -1 | 0>(0); // 0=idle；±1=正向该方向的一次有界动画

  const go = useCallback((dir: 1 | -1) => setMoving((m) => (m === 0 ? dir : m)), []); // 动画中忽略连点
  // 自动播放 + visibilitychange 暂停（与前文同一套纪律）
  const timerRef = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  useEffect(() => {
    const start = () => { stop(); timerRef.current = window.setInterval(() => go(1), interval); };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [go, interval, stop]);

  /** 修正时刻：step 前进一格 + transform 归零 + 槽位随渲染重排——三者同帧提交，视觉互抵 */
  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform' || moving === 0) return;
    setStep((s) => s + moving); // React 18 自动批处理：与 setMoving 同一次提交
    setMoving(0);
  };

  const realIndex = realIndexOf(step, count);
  if (count < 2) return <div style={{ overflow: 'hidden' }}>{children}</div>; // 单页无循环可言

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <div
        onTransitionEnd={onTransitionEnd}
        style={{
          position: 'relative', width: '100%', height: 200,
          transform: `translateX(${moving === 1 ? '-100%' : moving === -1 ? '100%' : '0%'})`,
          transition: moving === 0 ? 'none' : 'transform 0.4s ease', // 修正帧必须无过渡
        }}
      >
        {children.map((slide, i) => (
          <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', left: `${slotOf(i, step, count) * 100}%` }}>
            {slide}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go(-1)} style={{ position: 'absolute', left: 4, top: '50%' }}>‹</button>
      <button type="button" onClick={() => go(1)} style={{ position: 'absolute', right: 4, top: '50%' }}>›</button>
      <div style={{ position: 'absolute', bottom: 8, width: '100%', textAlign: 'center' }}>
        {children.map((_, i) => (
          <span key={i} style={{ display: 'inline-block', width: 8, height: 8, margin: '0 4px', borderRadius: '50%',
            background: i === realIndex ? '#1677ff' : 'rgba(0,0,0,0.2)' }} />
        ))}
      </div>
    </div>
  );
}
```

最小 Vitest（索引换算是本节的可测核心）：

```ts
import { describe, expect, it } from 'vitest';
import { mod, realIndexOf, slotOf } from './ModuloCarousel';

it('mod 处理负数与整除；realIndexOf：无界步数映射真实页码', () => {
  expect(mod(-1, 3)).toBe(2);
  expect(mod(-4, 3)).toBe(2);
  expect(mod(3, 3)).toBe(0);
  expect(realIndexOf(0, 5)).toBe(0);
  expect(realIndexOf(7, 5)).toBe(2);
  expect(realIndexOf(-1, 5)).toBe(4);
});

it('slotOf：当前页恒在槽 0，前进后旧末页变左一屏，后退时第 0 页在右一屏', () => {
  expect(slotOf(0, 0, 3)).toBe(0);
  expect(slotOf(1, 0, 3)).toBe(1);
  expect(slotOf(2, 1, 3)).toBe(1); // step=1（第 1 页在视口），第 2 页应为右一屏
  expect(slotOf(0, -1, 3)).toBe(1); // step=-1（第 2 页在视口），第 0 页是它的下一页
});
```

坑表：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 修正瞬间闪一帧 | step 与 moving 拆成两次提交（批处理被打破） | 两个 setState 放同一回调，依赖 React 18 自动批处理 |
| 2 | 快速连点丢帧/没反应 | 连点期间 moving ≠ 0 | 明确策略：忽略（本实现）或缓冲一格 |
| 3 | 负步数算出负的 left | 用了 JS 原生 %（结果保留符号） | 一律走 mod 正模 |
| 4 | transitionend 偶发不触发，轮播卡住 | 父级瞬时 display:none 等打断，事件不派发 | rAF/timeout 兜底校正（同克隆法坑 1 思路） |
| 5 | 单页传进去无限自播 | 没挡 count < 2 | 单页直接原样渲染 |

---

#### 补充二：Slider 吸附与碰撞（marks 吸附、双滑块边界、垂直模式）

**是什么。** 前文 Slider 是单滑块 + 等差 step；本节补三块：**marks 吸附**（值只能落在刻度上）、**双滑块**（range 的两手柄互为边界、不能穿越）、**垂直模式**（坐标轴旋转）。

**为什么难。** 单滑块的"百分比 ↔ 值"公式在三处同时变复杂：吸附目标从等差数列变成"最近 mark"；拖拽对象变成两个且互相约束（clamp 到对方）；坐标轴旋转后 ratio 要取反、定位公式要换轴。三件事叠加才是 antd Slider 的真实形态。

**机制分步：**

1. **marks 吸附**：有 marks 时值域只剩刻度点（antd 语义：marks 存在则 step 可为 null）。实现 = 指针值先夹取，再找最近 mark（键盘则是"跳到相邻 mark"，到两端夹住）。
2. **双滑块碰撞**：拖 start 时上限是 end、拖 end 时下限是 start（允许相等——`<` 与 `<=` 写错会导致两手柄永远无法重合甚至卡死）。点轨道跳转时"择近手柄"：离哪个手柄近就拖哪个，等距选 start。
3. **垂直模式**：ratio = `1 − (clientY − rect.top) / rect.height`（原点在左上，向上为增值）；手柄中心公式换轴：`top: calc((100% − thumb) × (1 − ratio) + thumb/2)`。键盘方向也随之交换（ArrowUp = 增大）。无障碍上每个手柄是独立 `role="slider"`（aria-label 区分"最小值/最大值"，aria-orientation 标方向）。

吸附/碰撞的纯函数（全部可单测）：

```ts
export interface Mark { value: number; label: string }

/** 吸附到最近 mark（marks 非空时值域只有刻度点） */
export function snapToMarks(value: number, marks: Mark[]): number {
  return marks.reduce((best, m) => (Math.abs(m.value - value) < Math.abs(best - value) ? m.value : best)).value;
}
/** 指针原始值 → 合法值：有 marks 吸 marks；否则按 step 对齐并清浮点残渣 */
export function quantize(
  value: number,
  min: number,
  max: number,
  step: number | null,
  marks: Mark[],
): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (marks.length > 0) return snapToMarks(clamped, marks);
  const s = step ?? 1;
  return Number((Math.round((clamped - min) / s) * s + min).toFixed(6));
}
/** 碰撞边界：拖 start 上限是 end，拖 end 下限是 start（允许相等） */
export function clampHandle(value: number, which: 0 | 1, other: number): number {
  return which === 0 ? Math.min(value, other) : Math.max(value, other);
}
/** marks 模式键盘步进：跳到相邻 mark，两端夹住；当前值不在刻度上时先吸附 */
export function stepMark(value: number, marks: Mark[], delta: 1 | -1): number {
  const idx = marks.findIndex((m) => m.value === value);
  if (idx === -1) return snapToMarks(value, marks);
  return marks[Math.min(marks.length - 1, Math.max(0, idx + delta))].value;
}
```

组件（marks + 双滑块 + 垂直，A1 双模式）：

```tsx
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { clampHandle, quantize, stepMark, type Mark } from './rangeSliderMath';

const THUMB = 16;

export function RangeSlider({
  min = 0, max = 100, step = 1, marks = [], vertical = false, value, defaultValue = [0, 100], onChange,
}: {
  min?: number; max?: number; step?: number | null; marks?: Mark[]; vertical?: boolean;
  value?: [number, number]; defaultValue?: [number, number]; onChange?: (v: [number, number]) => void;
}) {
  const [inner, setInner] = useState<[number, number]>(defaultValue);
  const current = value ?? inner; // A1：受控时完全以 value 为准
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<0 | 1 | null>(null);
  const ratioOf = (v: number) => (v - min) / (max - min);

  const valueFromPointer = (e: ReactPointerEvent<HTMLDivElement>): number => {
    const rect = trackRef.current!.getBoundingClientRect();
    const raw = vertical ? 1 - (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width; // 垂直：向上为增大
    return quantize(min + Math.min(1, Math.max(0, raw)) * (max - min), min, max, step, marks);
  };

  const commit = (which: 0 | 1, next: number) => {
    const clamped = clampHandle(next, which, current[which === 0 ? 1 : 0]); // 碰撞边界
    const pair: [number, number] = which === 0 ? [clamped, current[1]] : [current[0], clamped];
    setInner(pair); onChange?.(pair);
  };

  const onTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = valueFromPointer(e);
    const which: 0 | 1 = Math.abs(v - current[0]) <= Math.abs(v - current[1]) ? 0 : 1; // 择近手柄
    setDrag(which); commit(which, v);
  };

  const thumbKey = (which: 0 | 1) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const forward = vertical ? 'ArrowUp' : 'ArrowRight'; // 垂直模式方向交换
    const backward = vertical ? 'ArrowDown' : 'ArrowLeft';
    let next: number | undefined;
    if (e.key === forward) next = marks.length > 0 ? stepMark(current[which], marks, 1) : current[which] + (step ?? 1);
    else if (e.key === backward) next = marks.length > 0 ? stepMark(current[which], marks, -1) : current[which] - (step ?? 1);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === undefined) return;
    e.preventDefault(); // 阻止方向键滚动页面
    commit(which, next);
  };

  const pos = (v: number): string =>
    vertical
      ? `calc((100% - ${THUMB}px) * ${1 - ratioOf(v)} + ${THUMB / 2}px)` // 垂直：top 公式，值越大越靠上
      : `calc((100% - ${THUMB}px) * ${ratioOf(v)} + ${THUMB / 2}px)`;    // 水平：left 公式（前文考点推导）
  const rangeStart = Math.min(ratioOf(current[0]), ratioOf(current[1]));
  const rangeEnd = Math.max(ratioOf(current[0]), ratioOf(current[1]));

  return (
    <div style={{ display: 'inline-block', position: 'relative', width: vertical ? 24 : 320, height: vertical ? 240 : 24 }}>
      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        onPointerMove={(e) => drag !== null && commit(drag, valueFromPointer(e))}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        style={{
          position: 'absolute', borderRadius: 2, background: '#e5e7eb', cursor: 'pointer', touchAction: 'none',
          ...(vertical ? { left: 4, top: 12, bottom: 12, width: 4 } : { top: 10, left: 12, right: 12, height: 4 }),
        }}
      >
        {/* 选中区间：垂直用 top/height，水平用 left/width */}
        <div style={
            vertical
              ? { position: 'absolute', left: 0, width: '100%', borderRadius: 2, background: '#1677ff', top: `${(1 - rangeEnd) * 100}%`, height: `${(rangeEnd - rangeStart) * 100}%` }
              : { position: 'absolute', top: 0, height: '100%', borderRadius: 2, background: '#1677ff', left: `${rangeStart * 100}%`, width: `${(rangeEnd - rangeStart) * 100}%` }
          }
        />
        {/* marks 刻度标签：按 ratioOf(m.value) 在对应轴定位小字号 label（垂直 top / 水平 left），略 */}
      </div>
      {/* 双手柄：各自可聚焦、各自键盘步进（APG slider 模型 × 2），也各自可拖 */}
      {([0, 1] as const).map((which) => (
        <div
          key={which}
          role="slider"
          tabIndex={0}
          aria-label={which === 0 ? '最小值' : '最大值'}
          aria-valuemin={min} aria-valuemax={max} aria-valuenow={current[which]}
          aria-orientation={vertical ? 'vertical' : 'horizontal'}
          onKeyDown={thumbKey(which)}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(which); commit(which, valueFromPointer(e)); }}
          onPointerMove={(e) => drag === which && commit(which, valueFromPointer(e))}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          style={{
            position: 'absolute', width: THUMB, height: THUMB, borderRadius: '50%', background: '#fff',
            border: `2px solid ${drag === which ? '#0958d9' : '#1677ff'}`, cursor: 'grab', touchAction: 'none',
            ...(vertical
              ? { left: '50%', top: pos(current[which]), transform: 'translate(-50%, -50%)' }
              : { top: '50%', left: pos(current[which]), transform: 'translate(-50%, -50%)' }),
          }}
        />
      ))}
    </div>
  );
}
```

最小 Vitest：

```ts
import { describe, expect, it } from 'vitest';
import { clampHandle, quantize, stepMark, type Mark } from './rangeSliderMath';

const marks: Mark[] = [
  { value: 0, label: '0' }, { value: 25, label: '¼' }, { value: 60, label: '60' }, { value: 100, label: '满' },
];

it('quantize：marks 存在时吸附最近刻度（先夹取）；无 marks 时按 step 对齐清浮点残渣', () => {
  expect(quantize(18, 0, 100, null, marks)).toBe(25);
  expect(quantize(70, 0, 100, null, marks)).toBe(60);
  expect(quantize(120, 0, 100, null, marks)).toBe(100);
  expect(quantize(0.30000000000000004, 0, 1, 0.1, [])).toBe(0.3);
});

it('clampHandle：双滑块互为边界且允许相等', () => {
  expect(clampHandle(80, 0, 60)).toBe(60); // start 撞 end 上限
  expect(clampHandle(10, 1, 40)).toBe(40); // end 撞 start 下限
  expect(clampHandle(60, 0, 60)).toBe(60); // 允许重合
  expect(clampHandle(30, 0, 60)).toBe(30); // 未碰撞原样通过
});

it('stepMark：键盘在 marks 间跳格，两端夹住', () => {
  expect(stepMark(25, marks, 1)).toBe(60);
  expect(stepMark(0, marks, -1)).toBe(0); // 已在头，不再后退
});
```

坑表：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 两手柄重合后再也拖不动其中一个 | 择近判定用严格 <，重合时永远选同一侧 | 等距固定选 start + clamp 允许相等 |
| 2 | marks 模式拖出非刻度值 | 只做了 step 对齐没做 marks 吸附 | quantize 优先走 marks 分支 |
| 3 | 垂直模式值的方向反了 | ratio 忘了取反（原点在左上） | 垂直分支统一 `1 − ratio` |
| 4 | 手柄/区间在垂直模式溢出轨道 | 只换了一个轴的公式 | 定位统一用 `(100% − thumb) × p + thumb/2`，两轴各写一份 |
| 5 | 方向键一次动两个手柄 | 键盘挂在容器上没区分手柄 | 每手柄独立 role=slider + onKeyDown |

---

#### 补充三：Rate 半星清空与受控边界（再点同星清零、hover 与 value）

**是什么。** antd Rate 的 `allowClear` 语义：已选 3 星时再点第 3 颗星（半星模式按半区粒度——当前 2.5 时点第 3 颗左半区），值清为 0。前文 Rate 实现了半星判定与 hover 预览，本节补"清空"与"受控"两块边角。

**为什么难。** "点击"与"提交"不再一一对应——同一次点击可能提交 0；受控组件里清空是 `onChange(0)`，UI 能否真的归零取决于父组件是否把 value 置 0（0 是合法值）；而清空判定如果拿"预览值（hover）"去比较，会发生"每次点击都清空"的灾难——点击瞬间 hover 恒等于 clicked。

**机制分步：**

1. **判定函数**：`resolveRateClick(current, clicked, allowClear)`——clicked 与**已提交值 current** 相等且非 0 → 提交 0；否则提交 clicked。半星模式下 clicked 本身就是 x.5 / x+1 粒度，比较自然按半区对齐。
2. **hover 的角色**：hover 只驱动视觉预览（`shown = hover ?? current`），永远不参与清空判定。
3. **受控边界**：非受控时组件自己落值；受控时只 `onChange(0)`，父组件回填 value=0 后 UI 才归零。父组件若写 `value || 3` 之类的兜底，星星永远清不掉——这是 A1 纪律问题（见 [02-A1-受控-非受控双模式-30-行-hook-处处要用.md](02-A1-受控-非受控双模式-30-行-hook-处处要用.md)：受控不回显的 bug）。
4. **键盘**：方向键步进（半星 step=0.5）并 clamp 到 [0, count]；Backspace/Delete 清零是常见增强（antd 未内置，自定义需注明）。

```tsx
import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

/** 点击结算：再点同值 → 清零（antd allowClear 语义）；半星按半区粒度自然对齐 */
export function resolveRateClick(current: number, clicked: number, allowClear: boolean): number {
  if (allowClear && clicked > 0 && clicked === current) return 0;
  return clicked;
}

function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7-6.2-3.7-6.2 3.7 1.6-6.7L2.2 8.9l6.9-.6z" />
    </svg>
  );
}

export function RateClear({ count = 5, allowHalf = false, allowClear = true, value, defaultValue = 0, onChange }: {
  count?: number; allowHalf?: boolean; allowClear?: boolean;
  value?: number; defaultValue?: number; onChange?: (v: number) => void;
}) {
  const [inner, setInner] = useState(defaultValue); // defaultValue 只在首渲染消费（A1）
  const [hover, setHover] = useState<number | null>(null);
  const current = value ?? inner;
  const shown = hover ?? current; // hover 仅预览；清空判定绝不使用 shown

  // 结构化参数：PointerEvent（hover）与 MouseEvent（click）都满足
  const valueAt = (e: { clientX: number; currentTarget: EventTarget & Element }, i: number): number => {
    if (!allowHalf) return i + 1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? i + 0.5 : i + 1; // 前文同款半区判定
  };

  const commit = (next: number) => {
    setInner(next);   // 非受控：自己落
    onChange?.(next); // 受控：父组件决定 value 是否跟（不跟就不动——A1 纪律）
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = allowHalf ? 0.5 : 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp' ? current + step :
      e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? current - step :
      e.key === 'Backspace' || e.key === 'Delete' ? 0 : undefined; // 清空的键盘通道（增强）
    if (next === undefined) return;
    e.preventDefault(); commit(Math.min(count, Math.max(0, next))); // clamp：步进/清空都不可越界
  };

  return (
    <div tabIndex={0} role="radiogroup" aria-label="评分" aria-valuenow={current}
      onKeyDown={onKeyDown} onPointerLeave={() => setHover(null)}
      style={{ position: 'relative', display: 'inline-flex', outline: 'none' }}>
      {/* 底层灰星承担交互；覆盖层按 shown 裁切（前文同款双层结构）。点击结算：判定基准是 current（已提交值） */}
      <div style={{ display: 'flex', gap: 4, color: '#d1d5db' }}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} style={{ cursor: 'pointer' }} onPointerMove={(e) => setHover(valueAt(e, i))}
            onClick={(e) => commit(resolveRateClick(current, valueAt(e, i), allowClear))}>
            <Star />
          </span>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, width: `${(shown / count) * 100}%`, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 4, width: 'max-content', color: '#f59e0b' }}>
          {Array.from({ length: count }, (_, i) => <Star key={i} />)}
        </div>
      </div>
    </div>
  );
}
```

最小 Vitest：

```ts
import { describe, expect, it } from 'vitest';
import { resolveRateClick } from './RateClear';

it('再点同星/同半区清零；邻半区与不同星正常提交', () => {
  expect(resolveRateClick(3, 3, true)).toBe(0);
  expect(resolveRateClick(2.5, 2.5, true)).toBe(0);
  expect(resolveRateClick(2.5, 3, true)).toBe(3);
  expect(resolveRateClick(3, 2.5, true)).toBe(2.5);
  expect(resolveRateClick(1, 4, true)).toBe(4);
});

it('allowClear 关闭时同星也提交；0 值防御（clicked 实际恒 > 0）', () => {
  expect(resolveRateClick(3, 3, false)).toBe(3);
  expect(resolveRateClick(0, 0, true)).toBe(0);
});
```

坑表：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 再点同星没反应 | 没实现 allowClear 判定 | resolveRateClick |
| 2 | 每次点击都被清空 | 判定拿了 hover/shown 比（点击瞬间 hover === clicked 恒真） | 判定基准必须是 current |
| 3 | 受控模式清不掉 | onChange(0) 后父组件没回填 value=0（`value \|\| 默认` 类写法把 0 吞了） | A1 纪律：0 是合法值 |
| 4 | 清空回调传了 undefined / 空串 | 把"空"当 falsy 处理 | 固定提交数字 0，表单校验才不炸 |
| 5 | 键盘步进出现负分/超满分 | 没做 clamp | commit 前 clamp 到 [0, count] |

---

#### 补充四：ColorPicker 色彩模型精度与 alpha 通道（互转丢失、坐标映射、HSVA）

**是什么。** 三个工程边角：HSV↔RGB↔HEX 互转的精度丢失与"单一事实源"纪律；SV 面板/游标坐标映射的细节修正；alpha 通道加入后的模型（HSVA）、hex 形态（4/8 位）与透明底渲染（棋盘格）。

**为什么值得单列。** 前文已给出四组转换函数与面板公式，但"输入 #FF0000 拖一下面板变成 #FE0000"这类漂移 bug 的根源——**往返转换不幂等**——只有把精度问题讲透才能根治；alpha 则是转换函数族从 3 维到 4 维的整体扩展，hex 解析形态多了一倍。

**机制分步：**

1. **精度丢失的根源**：HSV 是连续浮点，RGB 是 8bit 整数（256 级量化）。`hsv → rgb` 必然四舍五入，`rgb → hsv` 再回来时 s/v 有 ≤ 1/255 级误差、h 有 ±1° 级误差。好在误差**一回合内收敛**（第二次往返起恒等），不会无限放大——真正的 bug 来自把往返写进渲染回路，每帧累积。
2. **根治：单一事实源 + 稳定化**。内部状态只存 HSVA；rgb/hex 全是投影（渲染时现算）；外部输入 hex 转成 hsva 存。再配 canonical 化：落库前先 `hsv → rgb → hsv` 走一遍，保证"同一 rgb 对应唯一 hsv"，游标位置与色值回显从此互相咬合。
3. **面板坐标映射的两个修正**（前文实现的工程补丁）：
   - 游标渲染位置要与取色计算互逆，但**游标有直径**——贴边时以中心定位会溢出面板半宽被裁掉；换用与 Slider 手柄同款的 `left: calc((100% − 12px) × s + 6px)`（12 = 游标直径），top 同理。
   - h 条两端 360 与 0 是同一色相：落端即归零（前文 mod 公式已覆盖），输入框侧要拒绝用户敲出 360。
4. **alpha 通道**：hex 形态 `#RRGGBBAA`（8 位）与 `#RGBA`（4 位缩写）；透明底渲染用棋盘格（`repeating-conic-gradient` 一层即可）垫底，颜色层以 `hsl(h 100% 50% / a)` 叠加；Alpha 滑轨背景 = `linear-gradient(to right, transparent, 当前纯色)` 垫棋盘格；手柄也垫棋盘格，否则 alpha=0 时手柄自身颜色失真。alpha 序列化时量化到 2 位 hex（1/255 级）。

```ts
// colorAlpha.ts —— alpha 扩展与稳定化（hsvToRgb / rgbToHsv 复用前文实现）
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface HSVA { h: number; s: number; v: number; a: number } // h:0-360，s/v/a:0-1
export interface RGBA { r: number; g: number; b: number; a: number }

export function hsvaToRgba({ h, s, v, a }: HSVA): RGBA {
  const { r, g, b } = hsvToRgb(h, s, v);
  return { r, g, b, a: clamp01(a) };
}
export function rgbaToHsva({ r, g, b, a }: RGBA): HSVA {
  const { h, s, v } = rgbToHsv(r, g, b);
  return { h, s, v, a: clamp01(a) };
}

/** 8 位 hexa（#RRGGBBAA），alpha 量化到 1/255 级 */
export function rgbaToHexa({ r, g, b, a }: RGBA): string {
  const rgb = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  const alpha = Math.round(clamp01(a) * 255).toString(16).padStart(2, '0');
  return `#${(rgb + alpha).toUpperCase()}`;
}
/** 解析 #RGB / #RGBA / #RRGGBB / #RRGGBBAA 四种形态 */
export function hexaToRgba(input: string): RGBA {
  let raw = input.replace('#', '').trim();
  if (raw.length === 3 || raw.length === 4) raw = raw.split('').map((c) => c + c).join(''); // 缩写展开
  if (!/^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) throw new Error(`非法 hex: ${input}`);
  const n = parseInt(raw, 16);
  const hasAlpha = raw.length === 8;
  return {
    r: hasAlpha ? (n >>> 24) & 255 : (n >>> 16) & 255,
    g: hasAlpha ? (n >>> 16) & 255 : (n >>> 8) & 255,
    b: hasAlpha ? (n >>> 8) & 255 : n & 255,
    a: hasAlpha ? (n & 255) / 255 : 1,
  };
}

/** 稳定化：先投影到 rgb（整数域）再回 hsv——同一 rgb 唯一 hsv，游标与回显不再漂移 */
export function canonicalHsva(c: HSVA): HSVA {
  return rgbaToHsva(hsvaToRgba(c));
}
```

Alpha 滑轨（与前文 Hue 条同构的一维拖拽，底与手柄都垫棋盘格）：

```tsx
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const CHECKER = 'repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 0 0 / 12px 12px'; // 透明示意

export function AlphaSlider({ color, value = 1, onChange }: {
  color: string; value?: number; onChange?: (a: number) => void; // color = 当前纯色（不含 alpha）
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const apply = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = ref.current!.getBoundingClientRect();
    onChange?.(Number(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)).toFixed(4)));
  };
  return (
    <div ref={ref} role="slider" aria-label="透明度" aria-valuemin={0} aria-valuemax={1} aria-valuenow={value} tabIndex={0}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); apply(e); }}
      onPointerMove={(e) => dragging && apply(e)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      style={{ position: 'relative', height: 12, borderRadius: 6, cursor: 'pointer', background: CHECKER }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 6, backgroundImage: `linear-gradient(to right, transparent, ${color})` }} />
      {/* 手柄也垫棋盘格：alpha=0 时手柄不发黑；left 用同款手柄中心公式 */}
      <div style={{ position: 'absolute', top: '50%', left: `calc((100% - 16px) * ${value} + 8px)`, transform: 'translate(-50%, -50%)',
        width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 2px rgba(0,0,0,0.5)', background: CHECKER }} />
    </div>
  );
}
```

接进前文 ColorPicker 的增量（SV 面板底色带 alpha、状态换 HSVA）：

```tsx
import { useState } from 'react';
import { AlphaSlider } from './AlphaSlider';
import { hsvaToRgba, rgbaToHexa, type HSVA } from './colorAlpha';

function ColorPickerWithAlpha() {
  const [c, setC] = useState<HSVA>({ h: 212, s: 0.9, v: 1, a: 1 }); // 内部只存 HSVA（单一事实源）
  const rgb = hsvaToRgba(c);
  return (
    <div style={{ width: 240 }}>
      {/* SV 面板：容器垫棋盘格（同 CHECKER），底色带 alpha——hsl(h 100% 50% / a)，白黑两层渐变不变 */}
      <div style={{ height: 160, background: 'repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 0 0 / 12px 12px' }}>
        <div style={{ height: '100%', backgroundColor: `hsl(${c.h} 100% 50% / ${c.a})`,
          backgroundImage: 'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))' }} />
      </div>
      <AlphaSlider color={rgbaToHexa({ ...rgb, a: 1 })} value={c.a} onChange={(a) => setC({ ...c, a })} />
      <code>{rgbaToHexa(rgb)}</code>
    </div>
  );
}
```

最小 Vitest：

```ts
import { describe, expect, it } from 'vitest';
import { canonicalHsva, hexaToRgba, rgbaToHexa, type HSVA } from './colorAlpha';
// hsvToRgb / rgbToHsv 来自前文实现

it('往返误差被量化锁死：每通道 ≤1，且第二回合起恒等（不累积）', () => {
  const once = hsvToRgb(208, 0.7255, 1); // ≈ [70, 170, 255] 族，第一回合可能差 1
  const twice = hsvToRgb(...Object.values(rgbToHsv(once.r, once.g, once.b)) as [number, number, number]);
  expect([twice.r, twice.g, twice.b]).toEqual([once.r, once.g, once.b]);
});

it('canonicalHsva 稳定化幂等：一次之后不再变', () => {
  const fixed = canonicalHsva({ h: 210, s: 0.6789, v: 0.9123, a: 1 } as HSVA);
  expect(canonicalHsva(fixed)).toEqual(fixed);
});

it('hexa 四形态解析与 rgba↔hexa 往返（alpha 量化到 1/255 级）', () => {
  expect(hexaToRgba('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  expect(hexaToRgba('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
  const rgba = { r: 18, g: 52, b: 86, a: 0.5 };
  expect(hexaToRgba(rgbaToHexa(rgba))).toEqual({ ...rgba, a: 128 / 255 });
  expect(() => hexaToRgba('#12345')).toThrow();
});
```

坑表：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 输入 #FF0000 拖一下变 #FE0000 | 每次 onChange 都做 hex→hsv→hex 往返，量化误差写进状态 | 单一事实源（只存 HSVA）+ canonicalHsva 落库前稳定化 |
| 2 | #RRGGBBAA 解析出 NaN | hexToRgb 只认 3/6 位 | hexaToRgba 四形态 + 正则校验 |
| 3 | alpha=0 时预览一片黑/白 | 颜色层直接垫在纯色背景上，看不出透明 | 棋盘格垫底 + `hsl(… / a)` 叠色 |
| 4 | 游标贴边被裁一半 | left/top 用纯百分比，没做半宽修正 | `calc((100% − d) × s + d/2)` |
| 5 | 判两个颜色相等用了 hsv 浮点 === | s/v 是浮点、h 取整时机不一 | 都投影到 rgb 整数域再比 |
