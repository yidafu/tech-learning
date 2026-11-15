// 流式布局：Flex 的自然延伸——主轴放不下就换行（wrap）。
// 与 RenderFlex 的差别只有一处：主轴摆位时多了「装不下 → 封行」的分叉；
// 封行后每行自成一条「行内主轴」，行与行沿交叉轴堆叠。
//
// 算法（row；column 把主/交叉轴对调，代码里用 isRow 分支，不写两份）：
//   1. 松约束量出每个子的自然尺寸（与 Flex 第 1 步完全相同）
//   2. 贪心装行：cursor=0；空行必收第一个子（哪怕它比容器宽——不收就永远装不下，
//      这个子的超出量记进 mainOverflow）；非空行装不下（cursor + mainGap + w > maxMain）就封行开新行
//   3. 行内摆位：lineAlign 分配行内富余（start/center/end/spaceBetween）；
//      crossAlign 决定子在行高内的纵向位置，stretch 的子按「行高」用紧约束重排第二遍
//   4. 自身尺寸：主轴 = 有界取约束 max（无界取最宽行）；交叉 = Σ(行高 + crossGap)
//
// ScriptC 注意：不用嵌套复合赋值；数组元素访问后做 undefined 检查（strict 模式）。
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";

export const FlowDirection = {
  row: 0,
  column: 1,
} as const;
export type FlowDirectionValue = (typeof FlowDirection)[keyof typeof FlowDirection];

/** 行内主轴对齐（一行装下的子怎么分富余）。 */
export const LineAlign = {
  start: 0,
  center: 1,
  end: 2,
  spaceBetween: 3,
} as const;
export type LineAlignValue = (typeof LineAlign)[keyof typeof LineAlign];

/** 子在行高（行内交叉尺寸）里的纵向对齐。 */
export const FlowCrossAlign = {
  start: 0,
  center: 1,
  end: 2,
  stretch: 3,
} as const;
export type FlowCrossAlignValue = (typeof FlowCrossAlign)[keyof typeof FlowCrossAlign];

export class RenderFlow extends RenderObject {
  direction: FlowDirectionValue;
  lineAlign: LineAlignValue;
  crossAlign: FlowCrossAlignValue;
  /** 同一行相邻子的主轴间距。 */
  mainGap: number;
  /** 行与行之间的交叉间距。 */
  crossGap: number;
  /** 观测口：封出来的行数（换行是否发生的直接证据）。 */
  lineCount = 0;
  /** 观测口：单行内容超出容器主轴的量（>0 即有子被硬塞在自己的一行里）。 */
  mainOverflow = 0;

  constructor(opts?: {
    direction?: FlowDirectionValue;
    lineAlign?: LineAlignValue;
    crossAlign?: FlowCrossAlignValue;
    mainGap?: number;
    crossGap?: number;
  }) {
    super();
    this.direction = opts?.direction ?? FlowDirection.row;
    this.lineAlign = opts?.lineAlign ?? LineAlign.start;
    this.crossAlign = opts?.crossAlign ?? FlowCrossAlign.start;
    this.mainGap = opts?.mainGap ?? 0;
    this.crossGap = opts?.crossGap ?? 0;
  }

  protected performLayout(c: BoxConstraints): void {
    const row = this.direction === FlowDirection.row;
    const maxMain = row ? c.maxWidth : c.maxHeight;
    const minMain = row ? c.minWidth : c.minHeight;
    const maxCross = row ? c.maxHeight : c.maxWidth;
    const minCross = row ? c.minHeight : c.minWidth;
    this.lineCount = 0;
    this.mainOverflow = 0;
    const unbounded = maxMain === Infinity;

    // ---- 1. 量尺寸：主轴无界松约束（与 Flex 的 looseMain 同一先例——量「自然尺寸」，
    //         「子比容器宽」才可观测，溢出才有定义）；交叉轴仍受容器 max 约束 ----
    type Entry = { node: RenderObject; main: number; cross: number };
    const entries: Entry[] = [];
    for (const child of this.children) {
      child.layout({
        minWidth: 0,
        maxWidth: Number.MAX_SAFE_INTEGER,
        minHeight: 0,
        maxHeight: maxCross === Infinity ? Number.MAX_SAFE_INTEGER : maxCross,
      });
      entries.push({ node: child, main: row ? child.width : child.height, cross: row ? child.height : child.width });
    }

    // ---- 2. 贪心装行 ----
    type Line = { indexes: number[]; mainExtent: number; crossExtent: number };
    const lines: Line[] = [];
    let cur: Line = { indexes: [], mainExtent: 0, crossExtent: 0 };
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      const empty = cur.indexes.length === 0;
      const needGap = empty ? 0 : this.mainGap;
      if (!unbounded && !empty && cur.mainExtent + needGap + e.main > maxMain) {
        lines.push(cur);
        cur = { indexes: [], mainExtent: 0, crossExtent: 0 };
      }
      cur.indexes.push(i);
      cur.mainExtent = cur.indexes.length === 1 ? e.main : cur.mainExtent + this.mainGap + e.main;
      if (e.cross > cur.crossExtent) cur.crossExtent = e.cross;
    }
    if (cur.indexes.length > 0) lines.push(cur);
    this.lineCount = lines.length;

    // ---- 3. 摆位：行内主轴分配 + 行内交叉对齐；行沿交叉轴堆叠 ----
    let crossCursor = 0;
    let widest = 0;
    for (const line of lines) {
      if (line.mainExtent > widest) widest = line.mainExtent;
      const slack = unbounded ? 0 : maxMain - line.mainExtent;
      let cursor = 0;
      if (this.lineAlign === LineAlign.center && slack > 0) cursor = slack / 2;
      else if (this.lineAlign === LineAlign.end && slack > 0) cursor = slack;
      const n = line.indexes.length;
      const betweenGap =
        this.lineAlign === LineAlign.spaceBetween && n > 1 && slack > 0 ? slack / (n - 1) : 0;
      for (let k = 0; k < n; k++) {
        const idx = line.indexes[k]!;
        const e = entries[idx]!;
        if (k > 0) cursor += betweenGap > 0 ? betweenGap : this.mainGap;
        const node = e.node;
        // stretch：用「行高」紧约束重排这一遍（与量尺寸那遍约束不同 → 必定真重排）
        if (this.crossAlign === FlowCrossAlign.stretch && e.cross !== line.crossExtent) {
          const tightCross = line.crossExtent;
          if (row) {
            node.layout({
              minWidth: node.width,
              maxWidth: node.width,
              minHeight: tightCross,
              maxHeight: tightCross,
            });
          } else {
            node.layout({
              minWidth: tightCross,
              maxWidth: tightCross,
              minHeight: node.height,
              maxHeight: node.height,
            });
          }
          e.cross = tightCross;
        }
        let crossPos = 0;
        if (this.crossAlign === FlowCrossAlign.center) crossPos = (line.crossExtent - e.cross) / 2;
        else if (this.crossAlign === FlowCrossAlign.end) crossPos = line.crossExtent - e.cross;
        if (row) {
          node.x = cursor;
          node.y = crossCursor + crossPos;
        } else {
          node.x = crossCursor + crossPos;
          node.y = cursor;
        }
        cursor += e.main;
      }
      crossCursor += line.crossExtent + this.crossGap;
    }

    // ---- 4. 自身尺寸 + 溢出记账 ----
    const contentMain = unbounded ? widest : maxMain;
    const mainSize = Math.min(Math.max(contentMain, minMain), unbounded ? Number.MAX_SAFE_INTEGER : maxMain);
    const contentCross = lines.length > 0 ? crossCursor - this.crossGap : 0;
    const crossSize = Math.min(Math.max(contentCross, minCross), maxCross === Infinity ? Number.MAX_SAFE_INTEGER : maxCross);
    if (!unbounded) {
      for (const line of lines) {
        const over = line.mainExtent - maxMain;
        if (over > this.mainOverflow) this.mainOverflow = over;
      }
    }
    if (row) {
      this.setSize(c, { width: mainSize, height: crossSize });
    } else {
      this.setSize(c, { width: crossSize, height: mainSize });
    }
  }
}
