// UI 字体装载：优先加载含 CJK 的系统字体（全 ASCII + CJK 样本码点），失败回退默认字体。
// 教训（03 demo 实测）：只传 loadCodepoints(sample) 的话，不在样本里的 ASCII 字符会丢字形；
// 默认位图字体走 drawTextEx 会挤压变形——所以「能用就换 TTF、码点带全 ASCII」是硬要求。
import { fileExists, getFontDefault, loadCodepoints, loadFontEx, type Font } from "scriptc-raylib";

const FONT_CANDIDATES = [
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", // macOS
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", // Linux 常见
];

/** CJK 样本：demo/控件会用到的汉字集合（不够时按需扩充，或换成全量加载）。 */
export const CJK_SAMPLE =
  "中文混排测试：把一段中文与 English 混在一起，贪心断行要按「字」断开而不是按空格。" +
  "可滚动列表标签按钮点击计数焦点滚动动画静态面板帧统计秒像素行";

/** 全 ASCII 可打印区 + CJK 样本的码点表（去重）。 */
export function uiCodepoints(): number[] {
  const set = new Set<number>();
  for (let c = 32; c <= 126; c++) set.add(c);
  for (const c of loadCodepoints(CJK_SAMPLE)) set.add(c);
  const out: number[] = [];
  for (const c of set) out.push(c);
  return out;
}

export interface UiFont {
  font: Font;
  /** 是否为加载的系统字体（false = raylib 默认位图字体，ASCII 之外不可用）。 */
  isSystemFont: boolean;
}

/** 找不到系统字体时回退默认字体（demo 文案需保持 ASCII）。 */
export function loadUiFont(fontSize = 32): UiFont {
  const codepoints = uiCodepoints();
  for (const path of FONT_CANDIDATES) {
    if (fileExists(path)) {
      return { font: loadFontEx(path, fontSize, codepoints, codepoints.length), isSystemFont: true };
    }
  }
  return { font: getFontDefault(), isSystemFont: false };
}
