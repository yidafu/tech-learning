// Flex 布局：Row / Column。
// 算法（一遍）：
//   1. 非弹性子先按「主轴松、交叉轴按 crossAxisAlignment」排布，得各自主轴占用
//   2. 剩余空间按 flex 比例分给弹性子（Expanded）
//   3. 主轴尺寸 = 约束钳制后的内容尺寸；交叉轴尺寸 = 子最大交叉尺寸（stretch 时为约束 max）
//   4. 按主轴对齐摆位子；记录溢出标志（mainOverflow）
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";

export const FlexDirection = {
  row: 0,
  column: 1,
} as const;
export type FlexDirectionValue = (typeof FlexDirection)[keyof typeof FlexDirection];

export const MainAxisAlign = {
  start: 0,
  center: 1,
  end: 2,
  spaceBetween: 3,
} as const;
export type MainAxisAlignValue = (typeof MainAxisAlign)[keyof typeof MainAxisAlign];

export const CrossAxisAlign = {
  start: 0,
  center: 1,
  end: 2,
  stretch: 3,
} as const;
export type CrossAxisAlignValue = (typeof CrossAxisAlign)[keyof typeof CrossAxisAlign];

/** 弹性子包装：flex>0 的子参与剩余空间分配。 */
export class RenderExpanded extends RenderObject {
  flex: number;

  constructor(flex: number, child: RenderObject) {
    super();
    this.flex = flex;
    this.appendChild(child);
  }

  protected performLayout(c: BoxConstraints): void {
    // Flex 直接布局被包装的子并把自己的约束透传（Expanded 自身不产生额外几何）
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: 0, height: 0 });
      return;
    }
    child.layout(c);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}

export class RenderFlex extends RenderObject {
  direction: FlexDirectionValue;
  mainAxisAlign: MainAxisAlignValue;
  crossAxisAlign: CrossAxisAlignValue;
  gap: number;
  /** 主轴内容超出约束 max 的量（>0 即溢出，测试断言用）。 */
  mainOverflow = 0;

  constructor(opts?: {
    direction?: FlexDirectionValue;
    mainAxisAlign?: MainAxisAlignValue;
    crossAxisAlign?: CrossAxisAlignValue;
    gap?: number;
  }) {
    super();
    this.direction = opts?.direction ?? FlexDirection.row;
    this.mainAxisAlign = opts?.mainAxisAlign ?? MainAxisAlign.start;
    this.crossAxisAlign = opts?.crossAxisAlign ?? CrossAxisAlign.start;
    this.gap = opts?.gap ?? 0;
  }

  private isRow(): boolean {
    return this.direction === FlexDirection.row;
  }

  /** 主轴方向的松约束（子自由取宽/高）。 */
  private looseMain(c: BoxConstraints, crossTight: number | null): BoxConstraints {
    if (this.isRow()) {
      return {
        minWidth: 0,
        maxWidth: Number.MAX_SAFE_INTEGER, // 主轴不限（Flex 来定分配）
        minHeight: crossTight ?? c.minHeight,
        maxHeight: crossTight ?? c.maxHeight,
      };
    }
    return {
      minWidth: crossTight ?? c.minWidth,
      maxWidth: crossTight ?? c.maxWidth,
      minHeight: 0,
      maxHeight: Number.MAX_SAFE_INTEGER,
    };
  }

  private flexChildConstraints(c: BoxConstraints, mainExtent: number, crossTight: number | null): BoxConstraints {
    if (this.isRow()) {
      return { minWidth: mainExtent, maxWidth: mainExtent, minHeight: crossTight ?? 0, maxHeight: crossTight ?? c.maxHeight };
    }
    return { minWidth: crossTight ?? 0, maxWidth: crossTight ?? c.maxWidth, minHeight: mainExtent, maxHeight: mainExtent };
  }

  protected performLayout(c: BoxConstraints): void {
    this.mainOverflow = 0;
    const crossMax = this.isRow() ? c.maxHeight : c.maxWidth;
    const crossMin = this.isRow() ? c.minHeight : c.minWidth;
    const mainMax = this.isRow() ? c.maxWidth : c.maxHeight;
    const mainMin = this.isRow() ? c.minWidth : c.minHeight;
    const crossTight = this.crossAxisAlign === CrossAxisAlign.stretch && crossMax !== Infinity ? crossMax : null;

    // ---- 1. 非弹性子先布局 ----
    type Entry = { node: RenderObject; expanded: RenderExpanded | null };
    const entries: Entry[] = [];
    let fixedMain = 0;
    let nonFlexCount = 0;
    for (const child of this.children) {
      if (child instanceof RenderExpanded) {
        entries.push({ node: child, expanded: child });
      } else {
        child.layout(this.looseMain(c, crossTight));
        fixedMain += this.isRow() ? child.width : child.height;
        nonFlexCount += 1;
        entries.push({ node: child, expanded: null });
      }
    }

    const gapTotal = this.gap * Math.max(0, this.children.length - 1);

    // ---- 2. 弹性子分配剩余空间 ----
    let totalFlex = 0;
    for (const e of entries) {
      if (e.expanded !== null) totalFlex += e.expanded.flex;
    }
    if (totalFlex > 0 && mainMax === Infinity) {
      throw new Error("Flex 在无界主轴上不能使用 Expanded（永远分不到头）");
    }
    const free = mainMax - fixedMain - gapTotal;
    if (free < 0) this.mainOverflow = -free;
    const distributable = Math.max(0, free);
    let flexMainTotal = 0;
    for (const e of entries) {
      if (e.expanded === null) continue;
      const mainExtent = Math.floor((distributable * e.expanded.flex) / totalFlex);
      e.expanded.layout(this.flexChildConstraints(c, mainExtent, crossTight));
      flexMainTotal += this.isRow() ? e.expanded.width : e.expanded.height;
    }

    // ---- 3. 自己的尺寸 ----
    const contentMain = fixedMain + gapTotal + flexMainTotal;
    const mainSize = Math.min(Math.max(contentMain, mainMin), mainMax === Infinity ? Number.MAX_SAFE_INTEGER : mainMax);
    let crossContent = 0;
    for (const e of entries) {
      const cr = this.isRow() ? e.node.height : e.node.width;
      if (cr > crossContent) crossContent = cr;
    }
    const crossSize = Math.min(Math.max(crossContent, crossMin), crossMax === Infinity ? Number.MAX_SAFE_INTEGER : crossMax);

    // ---- 4. 摆位 ----
    const slack = Math.max(0, mainSize - contentMain);
    let cursor = 0;
    const between = this.children.length > 1 ? this.children.length - 1 : 1;
    if (this.mainAxisAlign === MainAxisAlign.center) cursor = slack / 2;
    else if (this.mainAxisAlign === MainAxisAlign.end) cursor = slack;
    else if (this.mainAxisAlign === MainAxisAlign.spaceBetween && this.children.length > 1) {
      // cursor 保持 0，间距在元素间注入
      const betweenGap = slack / between;
      let first = true;
      for (const e of entries) {
        const nodeMain = this.isRow() ? e.node.width : e.node.height;
        if (!first) cursor += betweenGap;
        this.placeChild(e.node, cursor, crossSize);
        cursor += nodeMain;
        first = false;
      }
      this.setSizeByAxis(c, mainSize, crossSize);
      return;
    }

    let seen = 0;
    for (const e of entries) {
      if (seen > 0) cursor += this.gap;
      const nodeMain = this.isRow() ? e.node.width : e.node.height;
      this.placeChild(e.node, cursor, crossSize);
      cursor += nodeMain;
      seen += 1;
    }
    this.setSizeByAxis(c, mainSize, crossSize);
  }

  private placeChild(node: RenderObject, mainPos: number, crossSize: number): void {
    const crossExtent = this.isRow() ? node.height : node.width;
    let crossPos = 0;
    if (this.crossAxisAlign === CrossAxisAlign.center) crossPos = (crossSize - crossExtent) / 2;
    else if (this.crossAxisAlign === CrossAxisAlign.end) crossPos = crossSize - crossExtent;
    // stretch / start 都是 0（stretch 的子已被拉到 crossSize）
    if (this.isRow()) {
      node.x = mainPos;
      node.y = crossPos;
    } else {
      node.x = crossPos;
      node.y = mainPos;
    }
  }

  private setSizeByAxis(c: BoxConstraints, mainSize: number, crossSize: number): void {
    if (this.isRow()) {
      this.setSize(c, { width: mainSize, height: crossSize });
    } else {
      this.setSize(c, { width: crossSize, height: mainSize });
    }
  }
}
