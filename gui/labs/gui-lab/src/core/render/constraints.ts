// BoxConstraints：布局协议的通货。
// 协议三句话：
//   ① 父传约束（宽高的 min/max 区间）给子
//   ② 子在约束内返回自己的尺寸
//   ③ 父决定子摆在哪里（x/y 由父设置）
// 值对象 + 纯函数（与 Rect 同理：两端宿主、记录形状匹配都最省心）。
import type { Size } from "../geometry";

export interface BoxConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export function constraints(minW: number, maxW: number, minH: number, maxH: number): BoxConstraints {
  return { minWidth: minW, maxWidth: maxW, minHeight: minH, maxHeight: maxH };
}

/** 紧约束：宽高都被钉死为一个值。 */
export function tight(size: Size): BoxConstraints {
  return { minWidth: size.width, maxWidth: size.width, minHeight: size.height, maxHeight: size.height };
}

/** 松约束：0..size（父「最多这么大」，子自由发挥）。 */
export function loose(size: Size): BoxConstraints {
  return { minWidth: 0, maxWidth: size.width, minHeight: 0, maxHeight: size.height };
}

/** 把 min 放开到 0，max 保持——「你要多大都行，但别超过我」。 */
export function loosen(c: BoxConstraints): BoxConstraints {
  return { minWidth: 0, maxWidth: c.maxWidth, minHeight: 0, maxHeight: c.maxHeight };
}

export function isTight(c: BoxConstraints): boolean {
  return c.minWidth === c.maxWidth && c.minHeight === c.maxHeight;
}

export function widthIsTight(c: BoxConstraints): boolean {
  return c.minWidth === c.maxWidth;
}

export function heightIsTight(c: BoxConstraints): boolean {
  return c.minHeight === c.maxHeight;
}

/** 四边各缩进 inset（Padding 布局器传给子的约束）。 */
export function deflate(c: BoxConstraints, inset: { left: number; top: number; right: number; bottom: number }): BoxConstraints {
  const deflatedW = Math.max(0, c.maxWidth - inset.left - inset.right);
  const deflatedH = Math.max(0, c.maxHeight - inset.top - inset.bottom);
  return {
    minWidth: Math.min(Math.max(0, c.minWidth - inset.left - inset.right), deflatedW),
    maxWidth: deflatedW,
    minHeight: Math.min(Math.max(0, c.minHeight - inset.top - inset.bottom), deflatedH),
    maxHeight: deflatedH,
  };
}

/** 把任意尺寸钳到约束区间（子返回尺寸时的兜底，也是协议合法性的最后防线）。 */
export function constrainSize(c: BoxConstraints, size: Size): Size {
  const w = Math.min(Math.max(size.width, c.minWidth), c.maxWidth);
  const h = Math.min(Math.max(size.height, c.minHeight), c.maxHeight);
  return { width: w, height: h };
}

/** 两套约束取交集（叠加约束的布局器用，如 ConstrainedBox × 父约束）。 */
export function enforce(child: BoxConstraints, parent: BoxConstraints): BoxConstraints {
  return {
    minWidth: Math.min(Math.max(child.minWidth, parent.minWidth), parent.maxWidth),
    maxWidth: Math.min(child.maxWidth, parent.maxWidth),
    minHeight: Math.min(Math.max(child.minHeight, parent.minHeight), parent.maxHeight),
    maxHeight: Math.min(child.maxHeight, parent.maxHeight),
  };
}

export function constraintsEqual(a: BoxConstraints, b: BoxConstraints): boolean {
  return (
    a.minWidth === b.minWidth && a.maxWidth === b.maxWidth &&
    a.minHeight === b.minHeight && a.maxHeight === b.maxHeight
  );
}

/** 约束的字符串表示（测试失败信息友好）。 */
export function constraintsLabel(c: BoxConstraints): string {
  return `w[${c.minWidth.toFixed(1)}..${c.maxWidth.toFixed(1)}] h[${c.minHeight.toFixed(1)}..${c.maxHeight.toFixed(1)}]`;
}
