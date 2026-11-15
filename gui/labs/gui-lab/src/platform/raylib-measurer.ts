// raylib 文本度量器：measureTextEx 驱动。
// 关键约定：测量与绘制必须用同一 spacing（这里统一 0），否则光标几何与实际绘制错位。
// 绑定层 GlyphInfo 是不透明句柄（读不到 advance 字段），字符推进只能前缀差分——
// 好在 TextMeasurer 基类已做缓存，重复前缀不再穿透。
import { getFontDefault, measureTextEx } from "scriptc-raylib";
import type { Font } from "scriptc-raylib";
import type { TextMetrics } from "../core/text/measurer";
import { TextMeasurer } from "../core/text/measurer";

export const TEXT_SPACING = 0;

export class RaylibMeasurer extends TextMeasurer {
  private font: Font;

  constructor(font?: Font) {
    super();
    this.font = font ?? getFontDefault();
  }

  /** 换字体后必须调用：宽度缓存全部失效。 */
  switchFont(font: Font): void {
    this.font = font;
    this.clearCache();
  }

  protected measureRaw(text: string, fontSize: number): number {
    return measureTextEx(this.font, text, fontSize, TEXT_SPACING).x;
  }

  metrics(fontSize: number): TextMetrics {
    // 默认位图字体没有可读的基线元数据（句柄不透明），按教学近似：
    // ascent ≈ 字号、descent ≈ 0.25×字号、行高 1.25×字号
    return {
      lineHeight: fontSize * 1.25,
      ascent: fontSize,
      descent: fontSize * 0.25,
    };
  }
}
