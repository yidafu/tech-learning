// 贪心断行：把文本切成「可断块」（chunk），再逐块装箱。
// 断行机会：
//   - 空白后（拉丁词间）——换行时行尾空白丢弃、行首空白吞掉
//   - 每个 CJK 字符之后——字间皆可断
//   - 换行符——硬断行
// 已知简化（教学口径，分册里写明）：
//   - 以 UTF-16 码元为单位；代理对（emoji）可能被拆开
//   - 拉丁长词超出行宽时按字符硬拆（不禁则、不做 Knuth-Plass 最优化）
//
// 关键设计：breakLinesIndexed 额外返回每个保留字符的源索引——
// 断行会丢弃字符（换行处空白、换行符），富文本按「位置推算 span 归属」必然错位，
// 必须由断行器亲自记账。
import type { TextMeasurer } from "./measurer";

export type Overflow = "wrap" | "clip" | "ellipsis";

const CJK_START = 0x2e80;
const CJK_END = 0x9fff;

export function isCJK(codeUnit: number): boolean {
  // 覆盖 CJK 部首/符号/汉字主流区段；片假名/谚文等边角按「非 CJK」处理（可断性退化，不致错）
  return codeUnit >= CJK_START && codeUnit <= CJK_END;
}

export function isSpace(codeUnit: number): boolean {
  return codeUnit === 0x20 || codeUnit === 0x09;
}

/** 可断块：一段同类别、不可再分的字符序列（CJK 单字与换行符自成一块）。 */
export interface Chunk {
  text: string;
  kind: "word" | "space" | "cjk" | "newline";
  /** 块内字符在源文本中的索引。 */
  srcIndices: number[];
}

export function chunkify(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let buf = "";
  let idx: number[] = [];
  let kind: Chunk["kind"] | null = null;

  const flush = (): void => {
    if (kind !== null && buf !== "") {
      chunks.push({ text: buf, kind, srcIndices: idx });
    }
    buf = "";
    idx = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    let k: Chunk["kind"];
    if (c === 0x0a) k = "newline";
    else if (isSpace(c)) k = "space";
    else if (isCJK(c)) k = "cjk";
    else k = "word";

    if (k === "cjk" || k === "newline") {
      flush(); // CJK 单字与换行符自成一块
      chunks.push({ text: text.charAt(i), kind: k, srcIndices: [i] });
      kind = null;
      continue;
    }
    if (kind !== k) {
      flush();
      kind = k;
    }
    buf += text.charAt(i);
    idx.push(i);
  }
  flush();
  return chunks;
}

export interface BreakOptions {
  width: number;
  fontSize: number;
  measurer: TextMeasurer;
}

/** 断行结果的行：文本 + 每个保留字符的源索引。 */
export interface BrokenLine {
  text: string;
  srcIndices: number[];
}

/** 贪心断行（带源索引记账）。 */
export function breakLinesIndexed(text: string, opts: BreakOptions): BrokenLine[] {
  const lines: BrokenLine[] = [];
  let curText = "";
  let curIdx: number[] = [];
  let pendingSpaceText = "";
  let pendingSpaceIdx: number[] = [];

  const pushLine = (): void => {
    lines.push({ text: curText, srcIndices: curIdx });
    curText = "";
    curIdx = [];
    pendingSpaceText = "";
    pendingSpaceIdx = [];
  };

  for (const chunk of chunkify(text)) {
    if (chunk.kind === "newline") {
      pushLine();
      continue;
    }

    const chunkWidth = opts.measurer.measure(chunk.text, opts.fontSize);
    const curWidth = opts.measurer.measure(curText + pendingSpaceText, opts.fontSize);
    const lineEmpty = curText === "" && pendingSpaceText === "";
    const fits = curWidth + chunkWidth <= opts.width;

    if (fits) {
      if (chunk.kind === "space") {
        // 空白挂起：可能是本行行尾，也可能在换行时被丢弃
        if (curText !== "" || pendingSpaceText !== "") {
          pendingSpaceText += chunk.text;
          for (const si of chunk.srcIndices) pendingSpaceIdx.push(si);
        }
      } else {
        curText += pendingSpaceText + chunk.text;
        for (const si of pendingSpaceIdx) curIdx.push(si);
        for (const si of chunk.srcIndices) curIdx.push(si);
        pendingSpaceText = "";
        pendingSpaceIdx = [];
      }
      continue;
    }

    // 放不下：
    if (chunk.kind === "space") {
      pendingSpaceText = ""; // 行尾空白直接丢（连同索引）
      pendingSpaceIdx = [];
      continue;
    }
    if (chunk.kind === "word" && chunkWidth > opts.width) {
      // 长词本身超行宽：按字符硬拆（先把已有内容成行）
      if (curText !== "") pushLine();
      let piece = "";
      let pieceIdx: number[] = [];
      for (let i = 0; i < chunk.text.length; i++) {
        const next = piece + chunk.text.charAt(i);
        if (opts.measurer.measure(next, opts.fontSize) > opts.width && piece !== "") {
          lines.push({ text: piece, srcIndices: pieceIdx });
          piece = chunk.text.charAt(i);
          pieceIdx = [chunk.srcIndices[i] ?? i];
        } else {
          piece = next;
          pieceIdx.push(chunk.srcIndices[i] ?? i);
        }
      }
      curText = piece; // 剩余部分作为新行开头继续装
      curIdx = pieceIdx;
      continue;
    }
    if (lineEmpty) {
      // CJK 单字超宽也必须收下，否则死循环（一个字就是最小单位）
      curText = chunk.text;
      curIdx = chunk.srcIndices.slice();
      continue;
    }
    pushLine();
    curText = chunk.text; // 常规换行：这块成为新行首
    curIdx = chunk.srcIndices.slice();
  }
  pushLine();
  return lines;
}

/** 贪心断行（只要文本）。 */
export function breakLines(text: string, opts: BreakOptions): string[] {
  const lines = breakLinesIndexed(text, opts);
  const out: string[] = [];
  for (const l of lines) out.push(l.text);
  return out;
}

/** 省略号截断：把一行裁到 width - "..." 宽度以内，再接上 "..."。 */
export function ellipsize(line: string, width: number, fontSize: number, measurer: TextMeasurer): string {
  const dot = measurer.measure("...", fontSize);
  if (measurer.measure(line, fontSize) <= width) return line;
  let keep = "";
  for (let i = 0; i < line.length; i++) {
    const next = keep + line.charAt(i);
    if (measurer.measure(next, fontSize) + dot > width) break;
    keep = next;
  }
  return keep + "...";
}
