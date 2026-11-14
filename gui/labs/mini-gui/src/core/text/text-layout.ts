// 富文本排版：span 序列 → 行布局（两遍：先测宽断行，再逐行摆位）。
// 产出的 TextLayout 同时是绘制源（paintText）与光标几何源（offsetToX / xToOffset）。
//
// maxLines/ellipsis 的实现口径：超过 maxLines 时，把「最后保留行 + 溢出首行」合并后
// 重新截断加省略号；span 归属沿源索引记账，合成字符（空格、...）继承前一个字符的归属。
import type { Color } from "../color";
import type { Size } from "../geometry";
import type { Painter } from "../painter";
import type { TextMeasurer } from "./measurer";
import { breakLinesIndexed, type BrokenLine, type Overflow } from "./line-break";

export interface TextSpan {
  text: string;
  color?: Color | undefined;
  /** 本 span 的字号（缺省取块字号）。 */
  fontSize?: number | undefined;
}

export interface TextBlockOptions {
  fontSize: number;
  color: Color;
  /** 可用宽度；wrap/ellipsis 时必须提供。 */
  width?: number | undefined;
  maxLines?: number | undefined;
  overflow?: Overflow | undefined;
  align?: "left" | "center" | "right" | undefined;
  lineHeightRatio?: number | undefined; // 行高 = 块字号 × 比例；缺省 1.25
}

/** 一行里的一个摆放片段（来自某个 span 的一段连续文本）。 */
export interface LaidPiece {
  spanIndex: number;
  text: string;
  x: number; // 相对行的左边界
  width: number;
  fontSize: number;
  color: Color;
}

export interface LaidLine {
  pieces: LaidPiece[];
  width: number;
}

export interface TextLayout {
  lines: LaidLine[];
  size: Size; // 全块包围盒
  lineHeight: number;
  blockFontSize: number;
}

/** 断行 + 源索引记账 + maxLines/ellipsis。返回每行 (text, 每字符 span 归属)。 */
function breakWithSpans(
  spans: TextSpan[],
  opts: TextBlockOptions,
  measurer: TextMeasurer,
): { text: string; owners: number[] }[] {
  let full = "";
  const owner: number[] = [];
  spans.forEach((span, spanIndex) => {
    for (let i = 0; i < span.text.length; i++) owner.push(spanIndex);
    full += span.text;
  });

  const width = opts.width ?? Number.MAX_SAFE_INTEGER;
  const raw: BrokenLine[] = breakLinesIndexed(full, { width, fontSize: opts.fontSize, measurer });
  const maxLines = opts.maxLines ?? 0;

  if (maxLines > 0 && raw.length > maxLines) {
    if (opts.overflow !== "ellipsis") {
      // clip：直接截断，不做任何合成
      const clipped = raw.slice(0, maxLines);
      const resultClipped: { text: string; owners: number[] }[] = [];
      for (const l of clipped) {
        const owners: number[] = [];
        for (const si of l.srcIndices) owners.push(owner[si] ?? 0);
        resultClipped.push({ text: l.text, owners });
      }
      return resultClipped;
    }

    // ellipsis：末行 = 最后保留行 + 合成空格 + 溢出首行，重新截断加省略号；
    // 空格/省略号归属继承前一字符
    const lines = raw.slice(0, maxLines - 1);
    const lastKept = raw[maxLines - 1] ?? { text: "", srcIndices: [] };
    const overflow = raw[maxLines] ?? { text: "", srcIndices: [] };
    let mergedText = lastKept.text;
    let mergedOwners: number[] = [];
    for (const si of lastKept.srcIndices) mergedOwners.push(owner[si] ?? 0);
    if (mergedText !== "") {
      mergedText += " ";
      mergedOwners.push(mergedOwners.length > 0 ? mergedOwners[mergedOwners.length - 1] ?? 0 : 0);
    }
    mergedText += overflow.text;
    for (const si of overflow.srcIndices) mergedOwners.push(owner[si] ?? 0);

    const dot = measurer.measure("...", opts.fontSize);
    let keep = "";
    for (let i = 0; i < mergedText.length; i++) {
      const next = keep + mergedText.charAt(i);
      if (measurer.measure(next, opts.fontSize) + dot > width) break;
      keep = next;
    }
    const lastOwner = mergedOwners.length > 0 ? mergedOwners[mergedOwners.length - 1] ?? 0 : 0;
    mergedText = keep + "...";
    while (mergedOwners.length > keep.length) mergedOwners.pop();
    for (let i = 0; i < 3; i++) mergedOwners.push(lastOwner);

    const result: { text: string; owners: number[] }[] = [];
    for (const l of lines) {
      const owners: number[] = [];
      for (const si of l.srcIndices) owners.push(owner[si] ?? 0);
      result.push({ text: l.text, owners });
    }
    result.push({ text: mergedText, owners: mergedOwners });
    return result;
  }

  const result: { text: string; owners: number[] }[] = [];
  for (const l of raw) {
    const owners: number[] = [];
    for (const si of l.srcIndices) owners.push(owner[si] ?? 0);
    result.push({ text: l.text, owners });
  }
  return result;
}

export function layoutText(spans: TextSpan[], opts: TextBlockOptions, measurer: TextMeasurer): TextLayout {
  const blockFontSize = opts.fontSize;
  const lineHeightRatio = opts.lineHeightRatio ?? 1.25;
  const lineHeight = Math.round(blockFontSize * lineHeightRatio);
  const lines = breakWithSpans(spans, opts, measurer);

  const laid: LaidLine[] = lines.map(({ text, owners }) => {
    const pieces: LaidPiece[] = [];
    let x = 0;
    let i = 0;
    while (i < text.length) {
      const o = owners[i] ?? 0;
      let j = i + 1;
      while (j < text.length && (owners[j] ?? 0) === o) j++;
      const pieceText = text.slice(i, j);
      const span = spans[o] ?? { text: "" };
      const fontSize = span.fontSize ?? blockFontSize;
      const color = span.color ?? opts.color;
      const width = measurer.measure(pieceText, fontSize);
      pieces.push({ spanIndex: o, text: pieceText, x, width, fontSize, color });
      x += width;
      i = j;
    }
    return { pieces, width: x };
  });

  // 块宽 = 最长行的内容宽（不是可用宽）——文本块在布局树里按内容尺寸参与排列，
  // 「占满固定宽」是外层容器（Align/Flex）的职责
  const maxLineWidth = laid.reduce((m, l) => Math.max(m, l.width), 0);
  if (opts.align === "center" || opts.align === "right") {
    const widthLimit = opts.width ?? 0;
    for (const line of laid) {
      const slack = Math.max(0, widthLimit - line.width);
      const dx = opts.align === "center" ? slack / 2 : slack;
      if (dx > 0) {
        for (const piece of line.pieces) {
          piece.x += dx;
        }
      }
    }
  }

  return {
    lines: laid,
    size: { width: maxLineWidth, height: laid.length * lineHeight },
    lineHeight,
    blockFontSize,
  };
}

/** 绘制一个已排版的文本块（origin 为块左上角，行 y 逐行推进）。 */
export function paintText(p: Painter, layout: TextLayout, x: number, y: number): void {
  for (let li = 0; li < layout.lines.length; li++) {
    const line = layout.lines[li];
    if (line === undefined) continue;
    const lineY = y + li * layout.lineHeight;
    for (const piece of line.pieces) {
      if (piece.text !== "") {
        p.text(piece.text, x + piece.x, lineY, piece.fontSize, piece.color);
      }
    }
  }
}

/** 行内文本（跨片段拼接）。 */
export function lineText(line: LaidLine): string {
  let s = "";
  for (const piece of line.pieces) s += piece.text;
  return s;
}

/** 光标几何：行内第 offset 个字符前的 x 坐标（相对块左边界；offset ∈ [0, len]）。 */
export function offsetToX(layout: TextLayout, lineIndex: number, offset: number, measurer: TextMeasurer): number {
  const line = layout.lines[lineIndex];
  if (line === undefined) return 0;
  let consumed = 0;
  for (const piece of line.pieces) {
    const len = piece.text.length;
    if (offset <= consumed + len) {
      const local = offset - consumed;
      return piece.x + measurer.measure(piece.text.slice(0, local), piece.fontSize);
    }
    consumed += len;
  }
  return line.width; // 超出按行尾
}

/** 命中几何：x → 最近的光标 offset（落在字符中点右侧则取其后边界）。 */
export function xToOffset(layout: TextLayout, lineIndex: number, x: number, measurer: TextMeasurer): number {
  const line = layout.lines[lineIndex];
  if (line === undefined) return 0;
  let consumed = 0;
  for (const piece of line.pieces) {
    let charX = piece.x;
    for (let i = 0; i < piece.text.length; i++) {
      const adv = measurer.advanceAt(piece.text, i, piece.fontSize);
      if (x < charX + adv / 2) return consumed + i;
      charX += adv;
    }
    consumed += piece.text.length;
  }
  return consumed;
}
