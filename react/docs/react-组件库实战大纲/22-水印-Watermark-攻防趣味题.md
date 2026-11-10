---
title: "水印 Watermark（★★☆，攻防趣味题）"
---

> 本文是《Lv3 复杂交互组件（公认最考功力）》按小节拆分后的续篇，上一部分见 [21-Carousel-Slider-Rate-ColorPicker.md](21-Carousel-Slider-Rate-ColorPicker.md)。

### 水印 Watermark（★★☆，攻防趣味题）

> 本节骨架（原大纲）：
> - canvas 生成平铺、MutationObserver 防 DOM 删改（antd 源码的攻防博弈，值得一看）

水印是全场最有"攻防趣味"的组件：实现只有两步（canvas 画瓦片、平铺当背景），难的是**防守**——水印本质是一个 DOM 节点，任何用户打开 DevTools 都能删它、改它的 style。antd 源码里就有一段用 MutationObserver 做的"你删我挂、你改我还原"的博弈，值得逐行看。

**第一步：canvas 生成平铺水印。** 思路是画**一块**带留白的"单元瓦片"，导出 dataURL 后交给 CSS `background-repeat: repeat` 无限平铺——而不是用 JS 算坐标画 N 个文字（resize 还得重算，又贵又脆）。注意三个细节：按 `devicePixelRatio` 放大画布防高分屏发糊；先 `translate` 到瓦片中心再 `rotate`，让文字绕自身中心倾斜；瓦片尺寸 = 文字尺寸 + gap，gap 就是"水印密度"旋钮。

**第二步：MutationObserver 攻防。** 观察两组目标：父容器（childList，防"水印节点被删除"）和水印节点自身（attributes，防"被改 opacity/display/背景"）。关键技巧是**还原前先 `disconnect`、还原后重新 `observe`**——否则"我把 style 改回去"这个动作本身又是一条 mutation，观察者自己触发自己，进入死循环。

```tsx
import { useEffect, useRef, type ReactNode } from 'react';

export function Watermark({
  content = '内部资料 · 禁止外传',
  children,
  font = '16px sans-serif',
  color = 'rgba(0, 0, 0, 0.15)',
  rotate = -22,
  gap = [100, 100],
  zIndex = 9,
}: {
  content?: string;
  children?: ReactNode;
  font?: string;
  color?: string;
  rotate?: number;
  gap?: [number, number];
  zIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const gapKey = `${gap[0]}-${gap[1]}`; // 数组 props 转字符串做依赖，避免每次渲染都重绘

  useEffect(() => {
    const container = containerRef.current!;
    const watermark = watermarkRef.current!;
    let backupStyle = ''; // 备份完整 style 串，被篡改时一把还原

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.removedNodes) {
            if (node === watermark) {
              // 防删除：水印被移出 DOM → 重新挂回（重挂会触发一次 childList 变更，
              // 但 observe 已在 draw 里重开，重新挂载这个动作本身被自己观察到也没关系：不是删除）
              container.appendChild(watermark);
              return;
            }
          }
        }
        if (record.type === 'attributes' && record.target === watermark) {
          // 防篡改：opacity/display/backgroundImage 被改 → 还原备份的完整 style
          draw();
          return;
        }
      }
    });

    function draw() {
      // ① 画一块"单元瓦片"：一条倾斜文字 + 四周留白
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = font;
      const textWidth = ctx.measureText(content).width;
      const textHeight = Number.parseInt(font, 10) * 1.4; // 近似行高

      const tileW = gap[0] + textWidth;
      const tileH = gap[1] + textHeight;
      canvas.width = tileW * ratio; // dpr 放大：高分屏不发糊
      canvas.height = tileH * ratio;
      ctx.scale(ratio, ratio);
      ctx.translate(tileW / 2, tileH / 2); // 原点移到瓦片中心，旋转绕文字自身
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(content, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      // ② 平铺：绝对定位 + repeat 背景盖在内容上
      backupStyle = [
        'position: absolute',
        'inset: 0',
        'pointer-events: none', // 不挡业务点击
        `z-index: ${zIndex}`,
        `background-image: url(${dataUrl})`,
        'background-repeat: repeat',
      ].join('; ');

      // ③ 攻防纪律：先停观察 → 改 DOM → 再重开，防止"我还原的动作又触发我"死循环
      observer.disconnect();
      watermark.setAttribute('style', backupStyle);
      observer.observe(container, { childList: true }); // 防删除：盯父容器
      observer.observe(watermark, {
        attributes: true,
        attributeFilter: ['style', 'class'], // 防篡改：盯自己
      });
    }

    draw();
    return () => observer.disconnect();
  }, [content, font, color, rotate, gapKey, zIndex]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {children}
      <div
        ref={watermarkRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex }}
      />
    </div>
  );
}
```

**攻防推演**——把浏览器当棋盘走几个回合：

- 回合 1（攻）：F12 → Elements → 选中水印 div → 按 Delete。**防**：父容器 childList 变更，观察者把节点重新 append 回去。攻击成本：一次按键，被自动化解。
- 回合 2（攻）：不删节点，改 `style="opacity: 0"` 或直接清空 `background-image`。**防**：attributes 监听命中，`draw()` 用备份的完整 style 串整体还原。
- 回合 3（攻）：先在 Console 执行 `MutationObserver.prototype.observe = () => {}`，再删节点。**破防**——原型被拔，观察者全部失明。（浏览器扩展、油猴脚本甚至能在页面脚本执行前注入。）
- 回合 4（攻）：DevTools → Sources → "Deactivate breakpoints" 旁的 **Disable JavaScript**，然后删节点。**破防**——一切 JS 防御的根都被拔了。
- 回合 5（攻，降维）：根本不碰 DOM——截图后用修图工具的"智能消除"抹掉水印，或直接手机翻拍屏幕。**任何 DOM 层防御对此天然无效。**

**为什么前端水印只能防君子**：防御代码与攻击代码运行在**同一台机器、同一个 JS 执行环境**里，且攻击者拥有最终执行权（随时可以禁用你的一切脚本）。这和"前端加密保存密钥不可信"是同一条原理——交付到客户端的代码，客户端永远可以不执行。所以前端水印的真实定位是：**把攻击成本从"一键删除"抬高到"需要懂 DevTools 甚至写脚本"**，拦截随手复制；真要威慑泄露，必须换赛道：

1. **服务端渲染水印**：图片出管时叠加、文档导出 PDF 时盖章、视频转码打标——攻击者拿到的每一份产出都天然带水印，DOM 攻防战根本不发生。
2. **动态内容溯源**：水印文案绑定用户 ID/姓名/时间（甚至做成肉眼难辨的低对比度），即使被截图也能定位泄露者。
3. **频域盲水印**（进阶）：把标识嵌入图像频域系数，肉眼不可见、缩放裁剪压缩后仍可检测——用信号处理对抗像素级攻击。

Watermark 常见坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 高分屏上水印发虚 | canvas 按 CSS 像素画，被拉伸 | 画布尺寸 × devicePixelRatio 再 `ctx.scale` |
| 2 | 水印盖住了按钮点不了 | 忘了 `pointer-events: none` | 水印层加 `pointer-events: none` |
| 3 | 观察者回调无限触发/页面卡死 | 还原 style 的动作又被自己观察到，自激励死循环 | 还原前 `disconnect`，还原后重新 `observe`（antd 同款思路） |
| 4 | 内容区滚动后水印跟着滚走 | 水印放在滚动容器内且非 fixed | 水印层盖在滚动容器的包裹层上（absolute + inset: 0 于外层） |
| 5 | 文字长的水印相邻两行打架 | 瓦片 gap 按短文字估算 | tile 尺寸 = measureText 实测宽 + gap，别写死 |

---

#### 补充：canvas 文字水印的排版工程——measureText 自动换行、dpr 与 pattern 化平铺

**是什么。** 上文第一步画的是"单行短文案"瓦片；真实需求里水印常是多行（用户名 + 工号 + 时间），文案混排 CJK 与 latin，排版层（断行、行高、旋转包围盒）开始有工程量。平铺也有两条实现路线：上文用的 dataURL + `background-repeat`（盖在 DOM 上），以及 canvas 原生的 `createPattern`（水印直接合成进画布，适合"导出图片时统一打标"）。

**为什么值得单列。** 三个坑全出在"度量的坐标系"上：① `measureText` 的结果只在 ctx 状态有效时可信，而**任何对 `canvas.width/height` 的赋值都会把整个 ctx 状态（font/fillStyle/transform）重置回默认**——上文代码在 resize 之后重新设了一遍 font，防的就是这个；② 文字旋转后的包围盒变大（±45° 时取到对角线极值），瓦片若按未旋转尺寸留白，相邻瓦片文字会互相叠影；③ `devicePixelRatio` 放大的是画布物理分辨率，`measureText` 量的永远是逻辑像素，两套单位不能混。

**机制分步。**

1. **断行做成可注入度量的纯函数**：逐字符累积宽度、超过 `maxWidth` 就断行。默认实现走 canvas `measureText`；测试环境（jsdom 没有 2d context 实现，`measureText` 返回 0/NaN）注入假度量——排版逻辑因此完全可单测。
2. **行高与旋转包围盒**：多行统一 `textBaseline: 'middle'` + 绕块中心对称排布（第 i 行 y = (i − (n−1)/2) × lineHeight），避免逐行基线补偿；文字块 w×h 旋转 θ 后占位 `W = w·|cosθ| + h·|sinθ|`、`H = w·|sinθ| + h·|cosθ|`，瓦片尺寸 = 包围盒 + gap，绘制时先 translate 到瓦片中心再 rotate——与上文单行版同一纪律。
3. **pattern 化**：`ctx.createPattern(tileCanvas, 'repeat')` 得到可直接 fill 的图案对象，`fillRect` 一次铺满目标画布——水印要**合成进导出图片**（前端出图/截图标注）时走这条路，别绕 dataURL 再贴回来；盖在 DOM 上仍走上文 dataURL + background-repeat 路线。

**完整代码。** 排版层（纯逻辑，可测）：

```ts
// watermarkText.ts —— 可测的排版层：断行与旋转包围盒都是纯函数
export interface TileLayoutOptions {
  text: string;
  font: string;      // CSS font 简写，如 '14px sans-serif'
  fontSize: number;  // 行高 = fontSize × lineHeightFactor
  lineHeightFactor?: number; rotateDeg?: number; gapX?: number; gapY?: number;
  maxWidth?: number; // 断行宽度上限（逻辑像素）
  measure?: (text: string, font: string) => number; // 注入式度量：测试给假实现
}

export interface TileLayout {
  lines: string[];
  tileWidth: number; tileHeight: number; // 含 gap 与旋转包围盒（逻辑像素）
  blockWidth: number; blockHeight: number; rotateDeg: number; // 未旋转文字块
}

/** 逐字符断行：CJK/latin 统一策略，显式 \n 换行被尊重 */
export function splitLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of Array.from(text)) { // 按码点遍历，emoji 不被拆成代理对
    if (ch === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    if (current !== '' && measure(current + ch) > maxWidth) {
      lines.push(current); // 超宽即断：单个超宽字符也至少独占一行
      current = ch;
    } else {
      current += ch;
    }
  }
  lines.push(current);
  return lines.filter((l, i) => l !== '' || i === 0); // 清理末尾空行，保留首个空行
}

export function layoutTile(opts: TileLayoutOptions): TileLayout {
  const {
    text, font, fontSize, lineHeightFactor = 1.4, rotateDeg = -22,
    gapX = 90, gapY = 90, maxWidth = 220, measure = defaultMeasure,
  } = opts;
  const lines = splitLines(text, maxWidth, (s) => measure(s, font));
  const blockWidth = Math.max(...lines.map((l) => measure(l, font)), 1);
  const blockHeight = lines.length * fontSize * lineHeightFactor;
  const rad = (Math.abs(rotateDeg) * Math.PI) / 180;
  const rotW = blockWidth * Math.cos(rad) + blockHeight * Math.sin(rad);
  const rotH = blockWidth * Math.sin(rad) + blockHeight * Math.cos(rad);
  return {
    lines, blockWidth, blockHeight, rotateDeg,
    tileWidth: Math.ceil(rotW + gapX),
    tileHeight: Math.ceil(rotH + gapY),
  };
}

// 浏览器默认度量；jsdom 下 ctx 缺失时按等宽估算降级（不能 NaN）
function defaultMeasure(text: string, font: string): number {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}
```

DOM 层（用排版结果画多行瓦片，升级上文实现）：

```tsx
// MultiLineWatermark.tsx —— DOM 层：多行瓦片 + CSS 平铺
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { layoutTile } from './watermarkText';

export function MultiLineWatermark({
  text, fontSize = 14, rotateDeg = -22, gapX = 90, gapY = 90, children,
}: {
  text: string; fontSize?: number; rotateDeg?: number;
  gapX?: number; gapY?: number; children?: ReactNode;
}) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const font = `${fontSize}px sans-serif`;
    const layout = layoutTile({ text, font, fontSize, rotateDeg, gapX, gapY });
    const ratio = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    // 顺序纪律：先定尺寸再设状态——width 赋值会重置整个 ctx；
    // 上文实现是"先测后缩"，故必须在 resize 后重设 font。两种顺序二选一，别混用。
    canvas.width = layout.tileWidth * ratio;
    canvas.height = layout.tileHeight * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.translate(layout.tileWidth / 2, layout.tileHeight / 2);
    ctx.rotate((layout.rotateDeg * Math.PI) / 180);
    ctx.font = font;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineHeight = fontSize * 1.4;
    layout.lines.forEach((line, i) => {
      const y = (i - (layout.lines.length - 1) / 2) * lineHeight; // 绕块中心对称排布
      ctx.fillText(line, 0, y);
    });
    layerRef.current!.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
  }, [text, fontSize, rotateDeg, gapX, gapY]);

  const layerStyle: CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 9,
    pointerEvents: 'none', backgroundRepeat: 'repeat',
  };
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div ref={layerRef} aria-hidden style={layerStyle} />
    </div>
  );
}
```

Vitest（注入假度量，排版层不需要浏览器）：

```ts
// watermarkText.test.ts
import { describe, expect, it } from 'vitest';
import { layoutTile, splitLines } from './watermarkText';

const mono = (s: string) => s.length * 10; // 每字符 10px 的假字体

describe('splitLines', () => {
  it('超宽断行', () => {
    expect(splitLines('abcdefghij', 50, mono)).toEqual(['abcde', 'fghij']);
  });
  it('尊重显式换行符', () => {
    expect(splitLines('ab\ncd', 100, mono)).toEqual(['ab', 'cd']);
  });
  it('单个超宽字符也至少占一行', () => {
    expect(splitLines('x', 1, mono)).toEqual(['x']);
  });
});

describe('layoutTile 旋转包围盒', () => {
  const tile = (rotateDeg: number) => layoutTile({
    text: 'abcd', font: '14px sans-serif', fontSize: 14,
    rotateDeg, gapX: 0, gapY: 0, maxWidth: 100, measure: (s) => mono(s),
  });
  it('45° 时包围盒大于未旋转块；0° 时等于未旋转块', () => {
    expect(tile(45).blockWidth).toBe(40);
    expect(tile(45).tileWidth).toBeGreaterThan(tile(45).blockWidth); // 40·cos45° + h·sin45° > 40
    expect(tile(0).tileWidth).toBe(tile(0).blockWidth);
  });
});
```

坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 改完 canvas.width 后 fillText 字体变回默认 | width/height 赋值重置整个 ctx 状态 | resize 后重设 font/fillStyle/transform；或尺寸先行（上文与本文各选一种，别混） |
| 2 | 旋转 ±45° 时相邻瓦片文字叠影 | 瓦片按未旋转包围盒留白 | 瓦片尺寸按旋转包围盒 `w·|cosθ| + h·|sinθ|` 计算 |
| 3 | 多行水印逐行偏移越走越歪 | 每行手工补基线、累计半像素误差 | 统一 textBaseline + 绕块中心对称排布 |
| 4 | Vitest 里排版结果全 NaN | jsdom 无 2d context，measureText 返回 0/NaN | 度量注入化，测试里给假实现 |
| 5 | 开了 dpr 反而更糊 | 只放大画布尺寸没 `ctx.scale(ratio, ratio)` | 物理像素 ×ratio 与逻辑绘制 scale(ratio) 必须成对出现 |

---

#### 补充：防篡改的工程化——节点重建策略、互查 watchdog 与能力边界声明

**是什么。** 上文给了攻防推演与"disconnect → 还原 → 重 observe"的纪律；这里把防篡改抽成可复用的守卫（不限于水印），补两条增量：**节点重建策略**（比属性还原更强）与**多实例互查**；最后把"前端防不住开发工具"写成一份能直接放进组件文档的诚实边界声明。antd 同主题的源码带读见 [33-D2](33-D2-antd-工程化与细节功力-Wave-波纹-两个汉字空格-Watermark.md)。

**为什么值得单列。** 属性还原是"把被改的改回去"，攻击者可以再改——双方在同一个 microtask 队列里无限乒乓；节点重建（丢弃旧节点、全新创建并挂回）保证**水印节点的引用与属性永远来自库**，攻击者摸到的永远是一个即将退役的节点。互查 watchdog 把"观察者本身被拔"也纳入被观察面——单实例的 observer 被 `MutationObserver.prototype.observe = () => {}` 拔掉就全盲，两个实例互相盯着对方的存在性，攻击成本再抬一档。

**机制分步。**

1. **守卫面**：观察两处——容器 `childList`（水印被删）、水印节点 `attributes`（style/class 被改）；"容器整体被摘出文档"MutationObserver 看不见（观察不到祖先），用 `isConnected` 低频轮询兜底。
2. **还原 vs 重建**：任何命中都**重建整个节点**（`replaceWith(fresh)`）而非把属性改回去；重建后必须对新节点重新 `observe`——observe 绑定的是节点实例，不是选择器；重建动作自身会产生 mutation，纪律升级为"重建期间 `rebuilding` 旗子 + disconnect/observeAll 收口"（上文 disconnect 纪律的结构化版本）。
3. **时序真相（能力边界第一条）**：MutationObserver 回调在 **microtask** 里批量执行——攻击者的同步代码块（删除后立刻同步截图，如 html2canvas 同步读 DOM）跑完之前回调还没 flush，**那张图里没有水印**。这不是实现 bug，是事件循环的物理规律：防御必然滞后攻击至少一个 microtask。

**完整代码。**

```ts
// useWatermarkGuard.ts —— 通用防篡改守卫：重建策略 + isConnected 兜底
export interface GuardSpec {
  /** 创建全新水印节点（库拥有引用与属性，攻击者改的永远是旧节点） */
  createNode: () => HTMLElement;
  container: HTMLElement; // 挂载点
  onRebuilt?: (node: HTMLElement, reason: 'removed' | 'tampered' | 'reconnected') => void;
}

export function attachWatermarkGuard(spec: GuardSpec): () => void {
  const { container, createNode, onRebuilt } = spec;
  let node = createNode();
  container.appendChild(node);
  let disposed = false;
  let rebuilding = false;

  const observer = new MutationObserver((records) => {
    if (disposed || rebuilding) return;
    for (const r of records) {
      const tampered = r.type === 'attributes' && r.target === node;
      const removed = r.type === 'childList'
        && Array.from(r.removedNodes).includes(node);
      if (tampered || removed) {
        rebuild(tampered ? 'tampered' : 'removed');
        return;
      }
    }
  });

  function rebuild(reason: 'removed' | 'tampered' | 'reconnected') {
    rebuilding = true; // 重建自身的 mutation 不再响应
    observer.disconnect();
    const fresh = createNode();
    node.replaceWith(fresh); // 旧节点（连同篡改）整体退役
    if (!fresh.isConnected) container.appendChild(fresh);
    node = fresh;
    observeAll(); // 关键：observe 绑定节点实例，新节点要重新观察
    rebuilding = false;
    onRebuilt?.(node, reason);
  }

  function observeAll() {
    observer.observe(container, { childList: true });
    observer.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  observeAll();
  // 祖先被摘除是 MutationObserver 的盲区：低频轮询 isConnected 兜底
  const timer = window.setInterval(() => {
    if (!disposed && !node.isConnected) rebuild('reconnected');
  }, 2000);

  return () => { // 卸载纪律：停观察、停轮询、移节点
    disposed = true;
    observer.disconnect();
    window.clearInterval(timer);
    node.remove();
  };
}
```

在 React 组件中装配（替换上文实现里手写的 observer 段落；副作用全在 `useEffect` = 仅客户端执行）：

```tsx
import { useEffect, useRef } from 'react';
import { attachWatermarkGuard } from './useWatermarkGuard';

export function GuardedWatermark({ backgroundImage }: { backgroundImage: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const createNode = () => {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('style',
        `position:absolute;inset:0;pointer-events:none;z-index:9;` +
        `background-image:url(${backgroundImage});background-repeat:repeat`);
      return el;
    };
    return attachWatermarkGuard({ createNode, container: containerRef.current! });
  }, [backgroundImage]);
  return <div ref={containerRef} style={{ position: 'relative' }} />;
}
```

Vitest（jsdom 自带 MutationObserver）：

```ts
// useWatermarkGuard.test.ts —— vitest environment: 'jsdom'
import { describe, expect, it } from 'vitest';
import { attachWatermarkGuard } from './useWatermarkGuard';

const flush = () => new Promise((r) => setTimeout(r, 0)); // 等 microtask 批量回调

function setup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let created = 0;
  const dispose = attachWatermarkGuard({
    container,
    createNode: () => {
      created += 1;
      const el = document.createElement('div');
      el.setAttribute('data-mark', `node-${created}`);
      el.setAttribute('style', 'position:absolute;inset:0');
      return el;
    },
  });
  return { container, dispose };
}

describe('attachWatermarkGuard', () => {
  it('节点被删 → 自动重挂，且是新实例', async () => {
    const { container, dispose } = setup();
    const first = container.firstElementChild as HTMLElement;
    first.remove();
    await flush();
    const second = container.firstElementChild as HTMLElement;
    expect(second).not.toBe(first);                            // 重建而非复活旧节点
    expect(second.getAttribute('data-mark')).toBe('node-2');
    dispose();
  });

  it('style 被篡改 → 整节点重建，篡改随旧节点退役', async () => {
    const { container, dispose } = setup();
    (container.firstElementChild as HTMLElement).setAttribute('style', 'display:none');
    await flush();
    const second = container.firstElementChild as HTMLElement;
    expect(second.getAttribute('style')).not.toBe('display:none');
    dispose();
  });
});
```

互查 watchdog 的增量说明：把 `attachWatermarkGuard` 起两份、在 `onRebuilt` 里互查对方节点的 `isConnected` 并代为重建，即组成 A/B 互查；再往上还能嵌套"哨兵观察哨兵"——**每加一层都只是抬成本，不是修漏洞**，业务里别无限套娃。

**能力边界声明**（建议原文进组件文档的"安全须知"小节）。本组件的防篡改**只拦截"不改代码的手动操作"**（DevTools 面板里删节点/改样式），把攻击成本从一次按键抬高到写脚本：

- 以下方式均可在不同程度上绕过，且**无法在前端修复**：Console 先拔 `MutationObserver.prototype.observe` 再删节点；DevTools 的 Disable JavaScript；Sources 面板的 Local Overrides 直接改写库源码后刷新；同步删除 + 同步截图（microtask 空窗，机制第 3 步）；以及根本不碰 DOM 的翻拍与修图。
- 需要真实威慑力的场景请换赛道：服务端出图/导出时打标、内容绑定用户 ID 溯源、（进阶）频域盲水印。前端水印的合理定位是"防随手复制"，不是"防定向攻击"。

坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 重建一次后再删不再重建 | observer 绑定旧节点实例 | 每次重建后对新节点重新 `observe`（代码里的 `observeAll`） |
| 2 | rebuild 递归触发/卡死 | 重建自身的 mutation 被自己响应 | `rebuilding` 旗子 + disconnect/observeAll 收口 |
| 3 | 容器被整体摘走毫无反应 | MutationObserver 观察不到祖先被删 | `isConnected` 低频轮询兜底（成本与延迟的折中） |
| 4 | 攻击者同步删除后立刻截图，图里没水印 | observer 回调在 microtask，同步代码后才 flush | 承认边界（见声明）；要害场景走服务端水印 |
| 5 | SSR 首帧报 document is not defined | 守卫在模块顶层/渲染期执行 | 全部副作用收进 `useEffect`（仅客户端执行） |

---

#### 补充：覆盖容器策略——局部 absolute、包裹层与 fixed 全屏的取舍

**是什么。** "水印盖在哪"是 Watermark 的第一个 API 决策：盖**某个区域**（局部容器）、盖住**滚动区外层**（内容滚、水印不动），还是盖**整个视口**（fixed 全屏）。三条路线对应三种产品语义。

**为什么值得单列。** 上文实现默认"局部容器 + absolute"，坑 4 已踩过"水印放进滚动容器被滚走"；全屏路线还有两个新雷：**fixed 的 transform 祖先退化**（祖先带 transform/filter/perspective 时 fixed 退化成相对该祖先定位——与弹层体系同一根坑，见 [03-A2-弹层体系](03-A2-弹层体系-Popover-Select-Tooltip-DatePicker.md)）和 **z-index 语义决策**（水印在弹层之上还是之下是产品问题，不是技术问题）。

**机制分步。**

1. **三种结构**：局部 absolute（与内容同容器、随内容滚，卡片级标注）；包裹层 absolute（`relative 包裹层 > 水印层 + 滚动容器`——上文坑 4 的结构性正解）；fixed 全屏 + Portal（挂 `document.body`，视口级覆盖，与容器滚动无关）。三条路线都必须 `pointer-events: none`（否则挡住一切交互），顺手补 `user-select: none`，显式声明零成本。
2. **z-index 决策**：水印要压过页面内容（默认 9 量级），是否压过 Modal/Select 弹层取决于语义——"弹层内容也属保密范围"→ 水印高于弹层；"截图主体是页面、弹层是操作层"→ 低于弹层。自研库把决定显式交给 `zIndex` prop，并把默认值的理由写进文档。
3. **fixed 的工程细节**：祖先 transform 退化 → Portal 到 body 一劳永逸；`inset: 0` 的 fixed 层由 CSS 布局自动覆盖视口，**不需要监听 resize**——"resize 重算"的担忧只存在于"JS 算坐标画 N 个文字"的方案，瓦片 repeat 化后天然免疫。

**完整代码**（三路线收拢成一个 `mode` prop）：

```tsx
// OverlayWatermark.tsx —— mode: 'inline' | 'wrapper' | 'fullscreen'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function OverlayWatermark({
  text, mode = 'inline', zIndex = 9, children,
}: {
  text: string;
  mode?: 'inline' | 'wrapper' | 'fullscreen';
  zIndex?: number;
  children?: ReactNode;
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [mounted, setMounted] = useState(false); // SSR：Portal 只在客户端启用
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const ratio = window.devicePixelRatio || 1;
    const w = 160;
    const h = 120;
    const canvas = document.createElement('canvas');
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-22 * Math.PI) / 180);
    Object.assign(ctx, {
      font: '14px sans-serif',
      fillStyle: 'rgba(0, 0, 0, 0.12)',
      textAlign: 'center',
      textBaseline: 'middle',
    });
    ctx.fillText(text, 0, 0);
    setDataUrl(canvas.toDataURL('image/png'));
  }, [text]);

  const layerStyle: CSSProperties = {
    position: mode === 'fullscreen' ? 'fixed' : 'absolute',
    inset: 0, zIndex,
    pointerEvents: 'none', // 穿点击：水印层永远不是事件目标
    userSelect: 'none',
    backgroundImage: `url(${dataUrl})`,
    backgroundRepeat: 'repeat',
  };

  if (mode === 'fullscreen') {
    // Portal 到 body：躲开一切 transform/filter 祖先对 fixed 的退化
    return mounted ? createPortal(<div aria-hidden style={layerStyle} />, document.body) : null;
  }
  // wrapper：水印在内容外层（内容滚、水印不动，上文坑 4 的结构性修法）；
  // inline：水印与内容同容器（与上文实现一致）
  const layerFirst = mode === 'wrapper';
  return (
    <div style={{ position: 'relative' }}>
      {layerFirst ? <div aria-hidden style={layerStyle} /> : null}
      {children}
      {!layerFirst ? <div aria-hidden style={layerStyle} /> : null}
    </div>
  );
}
```

坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 全屏水印只盖首屏、随页面滚动 | fixed 的祖先带 transform/filter，退化为相对定位 | Portal 到 body（或清理祖先 transform） |
| 2 | 打开 Modal 后截图无水印 | 水印 z-index 低于弹层，语义没做决策 | `zIndex` 显式交给业务，文档写清两档语义 |
| 3 | 全屏水印在 SSR 报 body 不存在 | 渲染期访问 document | `mounted` 旗子，Portal 在 effect 后启用 |
| 4 | 局部水印盖住了弹出的下拉 | 下拉 portal 到 body、水印 zIndex 更高 | 弹层一律 body 级 + 水印默认低于弹层栈 |

---

#### 补充：暗水印/盲水印——LSB 简版实现、取证定位与和可见水印的分工

**是什么。** 可见水印盖在内容"上面"；暗水印（盲水印）把标识**藏进内容像素里**——最简版是 LSB（Least Significant Bit，最低有效位）隐写：把消息比特写进 RGB 通道的最低位，每通道亮度最多变化 1/255，人眼不可分辨。可见水印给"看图的人"，暗水印给"事后取证的系统"。

**为什么值得单列。** 它回答可见水印回答不了的问题——**截图被裁剪、可见水印被抹掉之后，还能不能定位泄露者**。同时它是上文"能力边界"话题的正面延伸：LSB 弱（缩放/有损压缩即毁）、频域盲水印强但要信号处理；前端能做且值得做的是 LSB 级原理实现（与对服务端方案的判断力），不高估也不玄化。

**机制分步。**

1. **编码**：消息 → UTF-8 字节流，前置 4 字节魔数 `WM1:` + 4 字节大端长度头；逐像素取 1 bit 只写 R 通道（`bit ? |1 : &~1`），alpha 一律不碰。
2. **等分块多份**：像素序列均分成 `repeats` 块、每块开头嵌一份完整拷贝——解码端无须先验消息长度就能按块边界定位每一份的头；裁掉/涂抹一块，多数表决仍可恢复。
3. **解码**：逐块读 64 bit 头 → 魔数不对跳过；魔数对了按长度头读全文 → 对所有有效份做多数表决。魔数全灭返回 `null`（没嵌过或已毁）。
4. **致命局限**：LSB 活在无损世界里——JPEG 有损压缩、双线性缩放、图片服务重编码都会整段摧毁 LSB，链路必须 PNG/WebP 无损端到端；要对抗有损处理得上频域（DCT/DWT 系数）方案——上文"换赛道"清单第 3 条的正主。

**完整代码**（纯函数、结构化 `RasterData`，Vitest 无需浏览器）：

```ts
// lsbWatermark.ts —— LSB 暗水印：等分块嵌入 / 提取 / 多数表决
export interface RasterData {
  data: Uint8ClampedArray; // RGBA，每像素 4 字节
  width: number;
  height: number;
}

const MAGIC = Uint8Array.of(0x57, 0x4d, 0x31, 0x3a); // "WM1:"

function bytesToBits(bytes: Uint8Array): number[] {
  // 每字节高位在前展开成 8 个 bit
  return Array.from(bytes, (b) => Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1)).flat();
}

function readBits(image: RasterData, startPixel: number, count: number): number[] {
  const bits: number[] = [];
  for (let i = 0; i < count; i++) bits.push(image.data[(startPixel + i) * 4] & 1); // 只读 R 通道
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const out = new Uint8Array(bits.length >> 3);
  for (let i = 0; i < out.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    out[i] = byte;
  }
  return out;
}

function hasMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 8
    && bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1]
    && bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3];
}

/** 嵌入：[魔数 4B | 长度 4B | 正文] 逐 bit 写 R 通道 LSB，等分块各嵌一份 */
export function embedLSB(image: RasterData, message: string, repeats = 3): RasterData {
  const body = new TextEncoder().encode(message); // 长度按字节算，中文/emoji 天然正确
  const payload = new Uint8Array(8 + body.length);
  payload.set(MAGIC, 0);
  new DataView(payload.buffer).setUint32(4, body.length); // 大端长度头
  payload.set(body, 8);

  const bits = bytesToBits(payload);
  const pixels = image.width * image.height;
  const block = Math.floor(pixels / repeats);
  if (bits.length > block) {
    throw new Error(`容量不足：单份需 ${bits.length} 个像素位，每块仅 ${block}`);
  }
  const data = new Uint8ClampedArray(image.data); // 复制，不动原图
  for (let r = 0; r < repeats; r++) {
    const base = r * block; // 等分块：第 r 份住第 r 块开头，解码端可盲定位
    for (let i = 0; i < bits.length; i++) {
      const idx = (base + i) * 4;
      data[idx] = bits[i] ? data[idx] | 1 : data[idx] & 0xfe;
    }
  }
  return { data, width: image.width, height: image.height };
}

/** 提取：逐块读头校验魔数，有效份多数表决；全部无效返回 null */
export function extractLSB(image: RasterData, repeats = 3): string | null {
  const pixels = image.width * image.height;
  const block = Math.floor(pixels / repeats);
  const votes = new Map<string, number>();
  for (let r = 0; r < repeats; r++) {
    const base = r * block;
    const head = bitsToBytes(readBits(image, base, 64));
    if (!hasMagic(head)) continue; // 这块没嵌过/已毁，看下一块
    const len = new DataView(head.buffer).getUint32(4);
    const bitLen = (8 + len) * 8;
    if (bitLen > block || base + bitLen > pixels) continue; // 长度头损坏，跳过
    const bytes = bitsToBytes(readBits(image, base, bitLen));
    const text = new TextDecoder().decode(bytes.subarray(8));
    votes.set(text, (votes.get(text) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [text, n] of votes) {
    if (n > bestN) {
      best = text;
      bestN = n;
    }
  }
  return best;
}
```

Vitest：

```ts
// lsbWatermark.test.ts
import { describe, expect, it } from 'vitest';
import { embedLSB, extractLSB, type RasterData } from './lsbWatermark';

function solidRaster(w: number, h: number, fill = 128): RasterData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return { data, width: w, height: h };
}

describe('LSB 暗水印', () => {
  it('roundtrip：嵌入后可完整提取（含中文）', () => {
    const marked = embedLSB(solidRaster(64, 64), 'uid:10086 张三 2026-11-06');
    expect(extractLSB(marked)).toBe('uid:10086 张三 2026-11-06');
  });

  it('等分块多数表决：毁掉第一块仍可恢复', () => {
    const marked = embedLSB(solidRaster(64, 64), 'uid:10086', 3);
    // 把第一块开头 200 个像素的 R 通道 LSB 清零（模拟裁剪/涂抹毁头）
    for (let i = 0; i < 200; i++) marked.data[i * 4] &= 0xfe;
    expect(extractLSB(marked, 3)).toBe('uid:10086');
  });

  it('未嵌水印 → null', () => {
    expect(extractLSB(solidRaster(64, 64))).toBeNull();
  });

  it('容量不足 → 抛错', () => {
    expect(() => embedLSB(solidRaster(4, 4), 'a'.repeat(50), 1)).toThrow(/容量不足/);
  });
});
```

**取证用途与分工**。落地链路：内容绑定用户 ID/时间 → 出图时 `embedLSB` → 图随业务外发 → 泄露图回流入取证脚本 `extractLSB` → 定位到人。要诚实的一点：**纯 DOM 页面做不到给"用户看到的像素"嵌 LSB**（浏览器渲染不经过你的 canvas），前端的真实落点是"自己导出的 canvas 截图/生成图"；网页级取证请回服务端出图。与可见水印的分工：

| | 可见水印 | LSB 暗水印（本节） | 频域盲水印 |
|---|---|---|---|
| 作用 | 威慑：降低随手传播 | 溯源：泄露后定位人 | 溯源且抗攻击 |
| 抗抹除 | 差（DOM/像素层可除） | 差（缩放/有损压缩即毁） | 强（裁剪压缩后仍可检测） |
| 实现位置 | 前端/服务端皆可 | 前端可做原理版 | 服务端/离线管线 |
| 成本 | 低 | 低 | 高（信号处理） |

坑（症状 → 根因 → 修法）：

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 存成 JPEG 再提取 → null | 有损压缩整段摧毁 LSB | 端到端 PNG/WebP 无损；要抗压缩上频域方案 |
| 2 | 裁掉一角就提取失败 | 单份嵌入无冗余 | 等分块多份 + 多数表决（默认 repeats = 3） |
| 3 | display-p3 画布提取失败 | 重解码经过色彩空间转换，低位被改 | `getContext('2d', { colorSpace: 'srgb' })` 固定 sRGB |
| 4 | 消息含 emoji 提取出乱码 | 长度头按 string.length 而不是字节数算 | 长度一律用 `TextEncoder` 的字节数（代码同款） |

