// 无头像素断言：在显示列表上模拟「这点是什么颜色」。
// 原理：从后往前扫命令（后画盖前画），第一个几何覆盖 (x,y) 且无裁剪排除的
// 填充命令决定颜色；被裁剪排除的命令跳过。这是「无窗口也能测像素」的全部实现。
import type { Color } from "./color";
import type { DisplayList } from "./painter";
import { rectContains, rectIsEmpty, rectIntersect, type Rect } from "./geometry";

export interface PixelQuery {
  x: number;
  y: number;
}

/** 点是否被裁剪矩形排除（点不在 clip 内 = 该命令对这点不可见）。 */
function clippedOut(clip: Rect | null, x: number, y: number): boolean {
  if (clip === null) return false;
  return !rectContains(clip, x, y);
}

function circleCovers(cx: number, cy: number, r: number, x: number, y: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** 查询 (x,y) 的最终颜色；没有任何填充覆盖时返回 null（= 背景）。 */
export function pixelAt(list: DisplayList, x: number, y: number): Color | null {
  const cmds = list.commands;
  for (let i = cmds.length - 1; i >= 0; i--) {
    const cmd = cmds[i];
    if (cmd === undefined) continue;
    if (clippedOut(cmd.clip, x, y)) continue;
    switch (cmd.op) {
      case "fillRect":
        if (rectContains(cmd.rect, x, y)) return cmd.color;
        break;
      case "fillRoundedRect": {
        // 圆角判定：四角圆外均不算覆盖（教学近似：只做圆心角区判定）
        const r = cmd.rect;
        const rad = Math.min(cmd.radius, Math.min(r.width, r.height) / 2);
        if (!rectContains(r, x, y)) break;
        const cx = Math.max(r.x + rad, Math.min(x, r.x + r.width - rad));
        const cy = Math.max(r.y + rad, Math.min(y, r.y + r.height - rad));
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rad * rad || (cx === x && cy === y) || dx === 0 || dy === 0) return cmd.color;
        break;
      }
      case "fillCircle":
        if (circleCovers(cmd.cx, cmd.cy, cmd.radius, x, y)) return cmd.color;
        break;
      case "strokeRect": {
        const r = cmd.rect;
        const t = cmd.thickness;
        const outer = { x: r.x - t / 2, y: r.y - t / 2, width: r.width + t, height: r.height + t };
        const inner = { x: r.x + t / 2, y: r.y + t / 2, width: Math.max(0, r.width - t), height: Math.max(0, r.height - t) };
        if (rectContains(outer, x, y) && !rectContains(inner, x, y)) return cmd.color;
        break;
      }
      case "line": {
        // 点到线段距离 ≤ thickness/2 即覆盖
        const dx = cmd.x2 - cmd.x1;
        const dy = cmd.y2 - cmd.y1;
        const len2 = dx * dx + dy * dy;
        let t = len2 === 0 ? 0 : ((x - cmd.x1) * dx + (y - cmd.y1) * dy) / len2;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        const px = cmd.x1 + t * dx;
        const py = cmd.y1 + t * dy;
        const ddx = x - px;
        const ddy = y - py;
        if (ddx * ddx + ddy * ddy <= (cmd.thickness / 2) * (cmd.thickness / 2)) return cmd.color;
        break;
      }
      case "text":
        // 文本像素依赖字形位图——无头模型不模拟字形，返回 null 表示「文本区非纯色」
        return null;
      case "texture":
      case "ninePatch":
        if (cmd.op === "texture" && rectContains(cmd.dest, x, y)) return cmd.tint;
        if (cmd.op === "ninePatch" && rectContains(cmd.dest, x, y)) return cmd.tint;
        break;
    }
  }
  return null;
}

/** 区域内是否「至少有一点」是 color（弱断言；强断言用 pixelAt 逐点）。 */
export function regionHasColor(list: DisplayList, region: Rect, color: Color): boolean {
  const step = 2;
  for (let y = region.y; y < region.y + region.height; y += step) {
    for (let x = region.x; x < region.x + region.width; x += step) {
      const c = pixelAt(list, x, y);
      if (c !== null && c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a) return true;
    }
  }
  return false;
}

/** 防御性导出（测试用）。 */
export { rectIntersect, rectIsEmpty };
