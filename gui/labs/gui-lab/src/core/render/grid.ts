// 网格布局：轨道（track）先定型、单元格后入位的两段式算法。
// 与 Flow/Flex 的本质差别：子的位置不靠「逐个排队」，而是先解出一张
// 「列宽 × 行高」表，再把每个子按 (col,row,span) 对号入座、拉伸到格子。
//
// 算法（四步，每步都可手算）：
//   1. 量自然尺寸：全部 cell 用完全松约束量一遍（不知道自己最终多宽，先报内容尺寸）
//   2. 解列宽：fixed 取 px；auto 取「本列 span=1 单元格的最大自然宽」；
//      flex 分「剩余空间 = maxW − fixed − auto − 列间隙」，按 fr 比例向下取整，
//      除不尽的余数按列序逐列 +1（确定性舍入，测试可精确断言）
//   3. 解行高：span=1 的 cell 用「已解列宽的紧约束」重新量高；fixed 行取 px，
//      auto 行取该行 span=1 单元格的最大重排高（跨行格不参与行高解算——教学版限制）
//   4. 入位：每格紧约束 (spanW × spanH) 重排（默认拉伸，同 CSS Grid 的 stretch），
//      x = Σ前列宽 + 列间隙×col；y 同理
//
// 教学版明确不做（分册写取舍）：跨行格参与 auto 行高解算、min/max 轨道、
// 显式网格线命名、密集填充（dense packing）。
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";

export const TrackKind = {
  fixed: 0,
  flex: 1,
  auto: 2,
} as const;
export type TrackKindValue = (typeof TrackKind)[keyof typeof TrackKind];

/** 轨道描述：kind 决定 px / fr 哪个字段生效。用工厂函数构造避免手填错字段。 */
export interface TrackSpec {
  kind: TrackKindValue;
  px: number;
  fr: number;
}

export function fixedTrack(px: number): TrackSpec {
  return { kind: TrackKind.fixed, px, fr: 0 };
}

export function flexTrack(fr: number): TrackSpec {
  return { kind: TrackKind.flex, px: 0, fr };
}

export function autoTrack(): TrackSpec {
  return { kind: TrackKind.auto, px: 0, fr: 0 };
}

/** 单元格包装：声明 (col,row,span)，自身不产生额外几何（同 RenderPositioned 的角色）。 */
export class RenderGridCell extends RenderObject {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;

  constructor(opts: { col: number; row: number; colSpan?: number; rowSpan?: number }, child?: RenderObject) {
    super();
    this.col = opts.col;
    this.row = opts.row;
    this.colSpan = opts.colSpan ?? 1;
    this.rowSpan = opts.rowSpan ?? 1;
    if (child !== undefined) this.appendChild(child);
  }

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

export class RenderGrid extends RenderObject {
  columns: TrackSpec[];
  rows: TrackSpec[];
  columnGap: number;
  rowGap: number;
  /** 观测口：解算后的列宽表（分册手算对照 / 测试断言）。 */
  colWidths: number[] = [];
  /** 观测口：解算后的行高表。 */
  rowHeights: number[] = [];
  /** 观测口：轨道自然宽合计超出容器的量（flex 轨道分不到负空间 → 全部记溢出）。 */
  mainOverflow = 0;

  constructor(opts: { columns: TrackSpec[]; rows?: TrackSpec[]; columnGap?: number; rowGap?: number }) {
    super();
    this.columns = opts.columns;
    this.rows = opts.rows ?? [];
    this.columnGap = opts.columnGap ?? 0;
    this.rowGap = opts.rowGap ?? 0;
  }

  protected performLayout(c: BoxConstraints): void {
    const maxW = c.maxWidth;
    const widthBounded = maxW !== Infinity;
    this.mainOverflow = 0;

    type Cell = { node: RenderGridCell; natW: number; natH: number };
    const cells: Cell[] = [];
    for (const child of this.children) {
      if (child instanceof RenderGridCell) {
        child.layout({ minWidth: 0, maxWidth: Number.MAX_SAFE_INTEGER, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER });
        cells.push({ node: child, natW: child.width, natH: child.height });
      }
    }

    // ---- 2. 解列宽 ----
    const nCols = this.columns.length;
    const gapTotal = this.columnGap * Math.max(0, nCols - 1);
    const autoOf = (j: number): number => {
      let m = 0;
      for (const cell of cells) {
        if (cell.node.col === j && cell.node.colSpan === 1 && cell.natW > m) m = cell.natW;
      }
      return m;
    };
    let used = gapTotal;
    let flexTotal = 0;
    const widths: number[] = [];
    for (let j = 0; j < nCols; j++) {
      const t = this.columns[j]!;
      if (t.kind === TrackKind.fixed) {
        widths.push(t.px);
        used += t.px;
      } else if (t.kind === TrackKind.auto || !widthBounded) {
        // 无界宽度里 flex 没有分摊基数 → 退化为 auto（教学规则，分册写明）
        const w = autoOf(j);
        widths.push(w);
        used += w;
      } else {
        widths.push(0); // flex 先占位，下一步统一分
        flexTotal += t.fr;
      }
    }
    let leftover = widthBounded ? maxW - used : 0;
    if (leftover < 0) {
      this.mainOverflow = -leftover;
      leftover = 0;
    }
    if (flexTotal > 0 && widthBounded) {
      // 基础配额：向下取整；余数按列序逐列 +1（确定性舍入）
      let given = 0;
      for (let j = 0; j < nCols; j++) {
        const t = this.columns[j]!;
        if (t.kind === TrackKind.flex) {
          const w = Math.floor((leftover * t.fr) / flexTotal);
          widths[j] = w;
          given += w;
        }
      }
      let rem = leftover - given;
      for (let j = 0; j < nCols && rem > 0; j++) {
        const t = this.columns[j]!;
        if (t.kind === TrackKind.flex) {
          widths[j] = widths[j]! + 1;
          rem -= 1;
        }
      }
    }
    this.colWidths = widths;

    // ---- 3. 解行高：span=1 的 cell 用已解列宽紧约束重量 ----
    const spanW = (cell: RenderGridCell): number => {
      let w = 0;
      for (let j = cell.col; j < cell.col + cell.colSpan; j++) {
        if (j > cell.col) w += this.columnGap;
        w += widths[j] ?? 0;
      }
      return w;
    };
    const autoH: number[] = [];
    for (const cell of cells) {
      const w = spanW(cell.node);
      cell.node.layout({ minWidth: w, maxWidth: w, minHeight: 0, maxHeight: Number.MAX_SAFE_INTEGER });
      if (cell.node.rowSpan === 1) {
        // 行定高只看 rowSpan=1 的格子：列跨格按「跨列总宽」定形参与；
        // 行跨格的高度横跨多行、没法单行记账 → 不参与（教学版限制，分册写明）
        const r = cell.node.row;
        const h = cell.node.height;
        while (autoH.length <= r) autoH.push(0);
        if (h > autoH[r]!) autoH[r] = h;
      }
    }
    const nRows = Math.max(this.rows.length, autoH.length);
    const heights: number[] = [];
    for (let r = 0; r < nRows; r++) {
      const t = this.rows[r];
      if (t !== undefined && t.kind === TrackKind.fixed) {
        heights.push(t.px);
      } else {
        heights.push(autoH[r] ?? 0);
      }
    }
    this.rowHeights = heights;

    // ---- 4. 入位：每格紧约束拉伸到格 box，位置 = Σ前列宽/行高 + 间隙 ----
    const spanH = (cell: RenderGridCell): number => {
      let h = 0;
      for (let r = cell.row; r < cell.row + cell.rowSpan; r++) {
        if (r > cell.row) h += this.rowGap;
        h += heights[r] ?? 0;
      }
      return h;
    };
    const colX = (col: number): number => {
      let x = 0;
      for (let j = 0; j < col; j++) x += (widths[j] ?? 0) + this.columnGap;
      return x;
    };
    const rowY = (row: number): number => {
      let y = 0;
      for (let r = 0; r < row; r++) y += (heights[r] ?? 0) + this.rowGap;
      return y;
    };
    for (const cell of cells) {
      const w = spanW(cell.node);
      const h = spanH(cell.node);
      cell.node.layout({ minWidth: w, maxWidth: w, minHeight: h, maxHeight: h });
      cell.node.x = colX(cell.node.col);
      cell.node.y = rowY(cell.node.row);
    }

    // ---- 自身尺寸 ----
    let gridW = gapTotal;
    for (const w of widths) gridW += w;
    let gapRowsTotal = this.rowGap * Math.max(0, nRows - 1);
    let gridH = gapRowsTotal;
    for (const h of heights) gridH += h;
    this.setSize(c, { width: gridW, height: gridH });
  }
}
