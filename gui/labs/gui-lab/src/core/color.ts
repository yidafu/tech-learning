// 颜色：RGBA（0~255，与 raylib 一致）。调色板集中定义，控件不得写死颜色。

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function rgba(r: number, g: number, b: number, a = 255): Color {
  return { r, g, b, a };
}

/** 按比例混合两个颜色（t=0 返回 from，t=1 返回 to），动画渐变用。 */
export function lerpColor(from: Color, to: Color, t: number): Color {
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
    a: Math.round(from.a + (to.a - from.a) * t),
  };
}

/** demo 浅色调色板：阶段二起所有 demo 与控件默认样式都从这里取色。 */
export const PALETTE = {
  bg: rgba(245, 246, 248),
  surface: rgba(255, 255, 255),
  surfaceAlt: rgba(238, 241, 245),
  border: rgba(209, 217, 226),
  text: rgba(31, 35, 40),
  textMuted: rgba(89, 99, 110),
  accent: rgba(46, 124, 246),
  accentSoft: rgba(46, 124, 246, 40),
  ok: rgba(54, 179, 126),
  warn: rgba(222, 164, 12),
  danger: rgba(225, 85, 84),
} as const;
