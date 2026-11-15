// 约束布局：等式求解器（教学版 = Cassowary 的「等式 + 依赖序」子集）。
// 模型：
//   变量：每个子的 left / top / width / height（right/bottom/centerX/centerY 是派生量）
//   方程：每条锚点边是一条线性方程   child.边 = 参照.边 + offset   （参照 = 父 或 兄弟）
//   解法（手算表，纵横两轴同构）：
//     A. 已知宽 Wd：
//        A1 left 给了   → L = 参照值，R = L + Wd
//        A2 right 给了  → R = 参照值，L = R − Wd
//        A3 center 给了 → C = 参照值，L = C − Wd/2
//        三者全缺 → 报错（有尺寸没位置，无解）
//     B. 宽未知（width<0 且 percentWidth<=0）：
//        B1 left+right   → Wd = R − L（拉伸）
//        B2 left+center  → Wd = 2(C − L)
//        B3 right+center → Wd = 2(R − C)
//        锚点不足两个 → 报错（欠约束）
//   依赖序：锚点可指向兄弟 → Kahn 工作清单：反复扫，凡参照齐了的先解；
//     一整轮无进展 → 必有循环或悬空 id → 抛错（谁参与循环，错误信息点名）
//
// 与 Flex/Stack 的分工（分册展开）：Flex 管「排」，约束管「贴」——
// 边贴边、贴父居中、按百分比拉伸这类「几何合同」用约束表达最直接。
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";

export const Side = {
  left: 0,
  right: 1,
  centerX: 2,
  top: 3,
  bottom: 4,
  centerY: 5,
} as const;
export type SideValue = (typeof Side)[keyof typeof Side];

/** 锚点引用：id 为空串 = 父容器；offset 可正可负（向内为负，如 right-8）。 */
export interface AnchorRef {
  id: string;
  side: SideValue;
  offset: number;
}

export function anchor(id: string, side: SideValue, offset = 0): AnchorRef {
  return { id, side, offset };
}

const PARENT = "";

export class RenderConstrained extends RenderObject {
  id: string;
  left: AnchorRef | null;
  right: AnchorRef | null;
  centerX: AnchorRef | null;
  top: AnchorRef | null;
  bottom: AnchorRef | null;
  centerY: AnchorRef | null;
  /** -1 = 不定（交给两条锚点边解出来）。 */
  width: number;
  height: number;
  /** 0..1：>0 时尺寸 = 父尺寸 × 百分比（优先于 width/height 字段）。 */
  percentWidth: number;
  percentHeight: number;

  constructor(
    opts: {
      id: string;
      left?: AnchorRef | null;
      right?: AnchorRef | null;
      centerX?: AnchorRef | null;
      top?: AnchorRef | null;
      bottom?: AnchorRef | null;
      centerY?: AnchorRef | null;
      width?: number;
      height?: number;
      percentWidth?: number;
      percentHeight?: number;
    },
    child?: RenderObject,
  ) {
    super();
    this.id = opts.id;
    this.left = opts.left ?? null;
    this.right = opts.right ?? null;
    this.centerX = opts.centerX ?? null;
    this.top = opts.top ?? null;
    this.bottom = opts.bottom ?? null;
    this.centerY = opts.centerY ?? null;
    this.width = opts.width ?? -1;
    this.height = opts.height ?? -1;
    this.percentWidth = opts.percentWidth ?? 0;
    this.percentHeight = opts.percentHeight ?? 0;
    if (child !== undefined) this.appendChild(child);
  }

  /** 透传约束给子（位置与尺寸由 RenderConstraint 解出后紧约束下发）。 */
  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: c.maxWidth, height: c.maxHeight });
      return;
    }
    child.layout(c);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}

/** 解算中间结果（水平/垂直两轴同构，用同一张表）。 */
interface Solved {
  id: string;
  l: number;
  t: number;
  w: number;
  h: number;
}

export class RenderConstraint extends RenderObject {
  /** 观测口：工作清单跑了几轮（依赖链深度 +1；循环时是错误前的轮数）。 */
  solvePasses = 0;

  protected performLayout(c: BoxConstraints): void {
    if (c.maxWidth === Infinity || c.maxHeight === Infinity) {
      throw new Error("约束布局容器需要有界尺寸（约束是相对父尺寸解的）");
    }
    this.setSize(c, { width: c.maxWidth, height: c.maxHeight });
    const W = this.width;
    const H = this.height;

    // ---- 收集未解节点 ----
    type Pending = { node: RenderConstrained };
    const pending: Pending[] = [];
    for (const child of this.children) {
      if (child instanceof RenderConstrained) pending.push({ node: child });
    }
    const solved: Solved[] = [];
    this.solvePasses = 0;

    const findSolved = (id: string): Solved | null => {
      for (const s of solved) {
        if (s.id === id) return s;
      }
      return null;
    };

    /** 参照边的数值：父用容器几何，兄弟用已解结果。 */
    const refValue = (ref: AnchorRef, horizontal: boolean): number | null => {
      if (ref.id === PARENT) {
        const size = horizontal ? W : H;
        if (ref.side === Side.left || ref.side === Side.top) return ref.offset;
        if (ref.side === Side.right || ref.side === Side.bottom) return size + ref.offset;
        return size / 2 + ref.offset; // center
      }
      const s = findSolved(ref.id);
      if (s === null) return null;
      let v: number;
      if (horizontal) {
        if (ref.side === Side.left) v = s.l;
        else if (ref.side === Side.right) v = s.l + s.w;
        else v = s.l + s.w / 2;
      } else {
        if (ref.side === Side.top) v = s.t;
        else if (ref.side === Side.bottom) v = s.t + s.h;
        else v = s.t + s.h / 2;
      }
      return v + ref.offset;
    };

    /** 解一个节点的一根轴。返回 false = 参照没齐（等下一轮）。 */
    const solveAxis = (
      node: RenderConstrained,
      horizontal: boolean,
      out: { pos: number; size: number },
    ): boolean => {
      const lead = horizontal ? node.left : node.top;
      const trail = horizontal ? node.right : node.bottom;
      const center = horizontal ? node.centerX : node.centerY;
      const sizeHint = horizontal ? node.width : node.height;
      const percent = horizontal ? node.percentWidth : node.percentHeight;

      // 尺寸先定型
      let size = -1;
      if (percent > 0) {
        size = Math.floor((horizontal ? W : H) * percent);
      } else if (sizeHint >= 0) {
        size = sizeHint;
      }

      const leadV = lead !== null ? refValue(lead, horizontal) : null;
      const trailV = trail !== null ? refValue(trail, horizontal) : null;
      const centerV = center !== null ? refValue(center, horizontal) : null;
      if ((lead !== null && leadV === null) || (trail !== null && trailV === null) || (center !== null && centerV === null)) {
        return false; // 有锚点但它的参照还没解出来
      }

      if (size >= 0) {
        if (leadV !== null) {
          out.pos = leadV;
          out.size = size;
          return true;
        }
        if (trailV !== null) {
          out.pos = trailV - size;
          out.size = size;
          return true;
        }
        if (centerV !== null) {
          out.pos = centerV - size / 2;
          out.size = size;
          return true;
        }
        throw new Error(`约束欠定：#${node.id} 的${horizontal ? "水平" : "垂直"}边一个锚都没有（有尺寸没位置）`);
      }
      // 尺寸未知：两条边解出来（B1/B2/B3）
      if (leadV !== null && trailV !== null) {
        out.pos = leadV;
        out.size = trailV - leadV;
        return true;
      }
      if (leadV !== null && centerV !== null) {
        out.pos = leadV;
        out.size = 2 * (centerV - leadV);
        return true;
      }
      if (trailV !== null && centerV !== null) {
        out.size = 2 * (trailV - centerV);
        out.pos = trailV - out.size;
        return true;
      }
      throw new Error(`约束欠定：#${node.id} 的${horizontal ? "水平" : "垂直"}尺寸没来源（给 width 或至少两条锚边）`);
    };

    // ---- Kahn 工作清单：参照齐一个解一个；一轮无进展 = 循环/悬空 ----
    while (pending.length > 0) {
      this.solvePasses += 1;
      let progressed = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        const item = pending[i]!;
        const node = item.node;
        const hOut = { pos: 0, size: 0 };
        const vOut = { pos: 0, size: 0 };
        if (!solveAxis(node, true, hOut)) continue;
        if (!solveAxis(node, false, vOut)) continue;
        node.layout({ minWidth: hOut.size, maxWidth: hOut.size, minHeight: vOut.size, maxHeight: vOut.size });
        node.x = hOut.pos;
        node.y = vOut.pos;
        solved.push({ id: node.id, l: hOut.pos, t: vOut.pos, w: hOut.size, h: vOut.size });
        pending.splice(i, 1);
        progressed = true;
      }
      if (!progressed) {
        const names = pending.map((p) => `#${p.node.id}`).join(", ");
        throw new Error(`约束循环或悬空引用：${names}（互相引用的锚点永远等不到参照）`);
      }
    }
  }
}
