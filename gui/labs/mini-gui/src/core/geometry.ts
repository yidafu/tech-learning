// 几何原语：Rect / Size / Offset 与矩形运算。
// 坐标约定：一律逻辑像素，左上为原点，y 向下（与 raylib 一致）。

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

export function rectFromSize(origin: Offset, size: Size): Rect {
  return { x: origin.x, y: origin.y, width: size.width, height: size.height };
}

export function rectRight(r: Rect): number {
  return r.x + r.width;
}

export function rectBottom(r: Rect): number {
  return r.y + r.height;
}

export function rectIsEmpty(r: Rect): boolean {
  return r.width <= 0 || r.height <= 0;
}

export function rectTranslate(r: Rect, dx: number, dy: number): Rect {
  return { x: r.x + dx, y: r.y + dy, width: r.width, height: r.height };
}

/** 向外扩张 d（负数即收缩），四边同量。 */
export function rectInflate(r: Rect, d: number): Rect {
  return { x: r.x - d, y: r.y - d, width: r.width + d * 2, height: r.height + d * 2 };
}

/** 求交；不相交时得到空矩形（宽或高为负），调用方用 rectIsEmpty 判断。 */
export function rectIntersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(rectRight(a), rectRight(b));
  const bottom = Math.min(rectBottom(a), rectBottom(b));
  return { x, y, width: right - x, height: bottom - y };
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < rectRight(r) && y >= r.y && y < rectBottom(r);
}

/** 点是否命中矩形（浮点半开区间，右下边不算命中）。 */
export function rectHitTest(r: Rect, px: number, py: number): boolean {
  return rectContains(r, px, py);
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
