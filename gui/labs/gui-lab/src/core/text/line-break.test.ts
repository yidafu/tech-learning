import { describe, expect, it } from "vitest";
import { MockMeasurer } from "./measurer";
import { breakLines, chunkify, ellipsize } from "./line-break";

// MockMeasurer：每字符推进 0.6×fontSize → fontSize 10 时每字符 6px，宽度全部可整除推演
const m = new MockMeasurer();
const opts = (width: number) => ({ width, fontSize: 10, measurer: m });

describe("chunkify", () => {
  it("拉丁词 / 空白 / CJK / 换行各成块", () => {
    const chunks = chunkify("hi 你 a\nb");
    expect(chunks.map((c) => c.kind)).toEqual(["word", "space", "cjk", "space", "word", "newline", "word"]);
    expect(chunks.map((c) => c.text)).toEqual(["hi", " ", "你", " ", "a", "\n", "b"]);
  });

  it("源索引与字符一一对应", () => {
    const chunks = chunkify("a b");
    expect(chunks[0]?.srcIndices).toEqual([0]);
    expect(chunks[1]?.srcIndices).toEqual([1]);
    expect(chunks[2]?.srcIndices).toEqual([2]);
  });
});

describe("breakLines（贪心）", () => {
  it("空串产生一行空行", () => {
    expect(breakLines("", opts(60))).toEqual([""]);
  });

  it("词间断行：换行处空白被丢弃", () => {
    expect(breakLines("hello world", opts(30))).toEqual(["hello", "world"]);
  });

  it("恰好放得下就不断（宽度含空格正好等于限制）", () => {
    expect(breakLines("hello world", opts(66))).toEqual(["hello world"]);
  });

  it("长词超行宽按字符硬拆", () => {
    expect(breakLines("abcdefghij", opts(24))).toEqual(["abcd", "efgh", "ij"]);
  });

  it("CJK 字间皆可断", () => {
    expect(breakLines("中文测试文本", opts(12))).toEqual(["中文", "测试", "文本"]);
  });

  it("中西混排：拉丁词内不断、CJK 与拉丁之间可断", () => {
    expect(breakLines("hello 中文 abc", opts(60))).toEqual(["hello 中文", "abc"]);
  });

  it("换行符硬断行", () => {
    expect(breakLines("a\nb", opts(60))).toEqual(["a", "b"]);
  });

  it("行尾空白不占行宽（aa 后跟多空格再 bb，两行各两字符）", () => {
    expect(breakLines("aa   bb", opts(12))).toEqual(["aa", "bb"]);
  });
});

describe("ellipsize", () => {
  it("不超宽原样返回", () => {
    expect(ellipsize("abc", 30, 10, m)).toBe("abc");
  });

  it("超宽截断加省略号（… 宽 18px，可用 30-18=12 → 2 字符）", () => {
    expect(ellipsize("abcdef", 30, 10, m)).toBe("ab...");
  });

  it("极端窄：只剩省略号", () => {
    expect(ellipsize("abcdef", 18, 10, m)).toBe("...");
  });
});
