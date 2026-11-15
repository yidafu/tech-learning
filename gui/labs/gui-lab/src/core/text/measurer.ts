// 文本度量抽象：断行与排版只依赖这个抽象类，具体实现可以是
//  - RaylibMeasurer（平台层，measureTextEx 前缀差分）
//  - MockMeasurer（测试，等宽假想字体，数值完全确定）
//
// 为什么需要缓存：绑定层的 GlyphInfo 是不透明句柄（读不到 advance 字段），
// 字符推进只能用「前缀宽度差分」求，一条 n 字符的行是 O(n²) 次度量——
// 没有缓存的断行器在大文本上会立刻变慢（见《06-文本缓存》实测）。
export interface TextMetrics {
  lineHeight: number;
  ascent: number;
  descent: number;
}

export abstract class TextMeasurer {
  private readonly widthCache = new Map<string, number>();
  /** 缓存命中数（观测口，测试/分册用）。 */
  cacheHits = 0;
  /** 绕过缓存的真实度量次数（观测口）。 */
  rawMeasures = 0;

  /** 单行文本宽度（像素）。子类实现时与绘制端使用同一 spacing。 */
  protected abstract measureRaw(text: string, fontSize: number): number;

  /** 行高相关度量（随字体与字号变化）。 */
  abstract metrics(fontSize: number): TextMetrics;

  measure(text: string, fontSize: number): number {
    if (text === "") return 0;
    const key = `${fontSize}:${text}`;
    const hit = this.widthCache.get(key);
    if (hit !== undefined) {
      this.cacheHits += 1;
      return hit;
    }
    const w = this.measureRaw(text, fontSize);
    this.rawMeasures += 1;
    this.widthCache.set(key, w);
    return w;
  }

  /** text[index] 在上下文中的推进宽度（前缀差分；等宽字体下与位置无关）。 */
  advanceAt(text: string, index: number, fontSize: number): number {
    const before = this.measure(text.slice(0, index), fontSize);
    const withCh = this.measure(text.slice(0, index + 1), fontSize);
    return withCh - before;
  }

  /** 清空缓存（换字体时调用；TextMeasurer 不持有字体，由使用方通知）。 */
  clearCache(): void {
    this.widthCache.clear();
  }
}

/** 测试用假想等宽字体：advance = 0.6×fontSize，行高 1.25×，全部可整除推演。 */
export class MockMeasurer extends TextMeasurer {
  static readonly ADVANCE_RATIO = 0.6;
  static readonly LINE_HEIGHT_RATIO = 1.25;

  protected measureRaw(text: string, fontSize: number): number {
    return text.length * fontSize * MockMeasurer.ADVANCE_RATIO;
  }

  metrics(fontSize: number): TextMetrics {
    return {
      lineHeight: fontSize * MockMeasurer.LINE_HEIGHT_RATIO,
      ascent: fontSize,
      descent: fontSize * 0.25,
    };
  }
}
