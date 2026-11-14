# 富文本 span 与光标几何：两遍布局和一个真实的映射 bug

> [返回：第三阶段导览](01-导览.md)
> 对应大纲条目：第三阶段 4。span（同一段文字里的不同颜色/字号）与光标几何（offsetToX / xToOffset）是输入框的地基。本册讲两遍布局的完整数据流、`text-layout.ts` 的逐函数走读，以及开发中被测试当场抓住的一个真 bug——断行丢字符导致 span 归属错位。

## 1. 数据模型：块 → 行 → 片段

四层数据结构，自上而下：

```ts
export interface TextSpan {
  text: string;
  color?: Color | undefined;
  /** 本 span 的字号（缺省取块字号）。 */
  fontSize?: number | undefined;
}

export interface TextBlockOptions {
  fontSize: number;          // 块字号：断行与行高的口径
  color: Color;              // 缺省颜色
  width?: number | undefined;    // 可用宽度；wrap/ellipsis 时必须提供
  maxLines?: number | undefined;
  overflow?: Overflow | undefined;       // "wrap" | "clip" | "ellipsis"
  align?: "left" | "center" | "right" | undefined;
  lineHeightRatio?: number | undefined;  // 行高 = 块字号 × 比例；缺省 1.25
}
```

排版产物两层的形状：

```ts
/** 一行里的一个摆放片段（来自某个 span 的一段连续文本）。 */
export interface LaidPiece {
  spanIndex: number;  // 来自第几个 span
  text: string;       // 这一段的文本（行内连续、归属同一 span）
  x: number;          // 相对行的左边界（不是相对块！）
  width: number;
  fontSize: number;   // span 字号（缺省已解析为块字号）
  color: Color;       // span 颜色（缺省已解析为块颜色）
}

export interface LaidLine {
  pieces: LaidPiece[];  // 按 x 递增
  width: number;        // 行内容宽（不含对齐空隙）
}

export interface TextLayout {
  lines: LaidLine[];
  size: Size;             // 全块包围盒
  lineHeight: number;     // round(块字号 × 比例)
  blockFontSize: number;
}
```

注意两条职责线：`TextSpan`/`TextBlockOptions` 是**输入**（样式声明），`LaidPiece`/`LaidLine`/`TextLayout` 是**输出**（几何既成事实）。输出里没有「待定」字段——`fontSize`、`color` 都已解析成确定值，绘制层（paintText）拿到就能用，不必再查缺省。

一个 span 断行后会变成多个 piece（各在一行）；一行也可以有多个 piece（多个 span 同行，或省略号合成段）。**piece 是「span × 行」的交**。

## 2. 两遍布局：数据流全景

```mermaid
graph LR
  A[spans 序列] -->|拼接| B[full 全文<br/>+ owner 每字符归属]
  B -->|breakLinesIndexed| C[BrokenLine[]<br/>text + srcIndices]
  C -->|maxLines / ellipsis| D[行文本 + owners]
  D -->|逐行 run-length 分组| E[pieces: spanIndex/x/width]
  E -->|对齐平移| F[TextLayout]
  F --> G[paintText 绘制]
  F --> H[offsetToX / xToOffset 光标]
```

**第一遍（测宽）**：把所有 span 拼成全文跑断行器，得到每行文本；**第二遍（摆位）**：行内按片段顺序累加 x，每片段记录 `spanIndex → 样式`。

为什么必须两遍：断行决策需要知道「加上这个词会不会超宽」——只能先量完一整行才能定断点；断点定了才能谈「这一行里各片段摆在哪」。一遍做完两件事（边断边摆）会在回溯换行时把已摆的位置全部作废：想象 `"hello world"` 在 40px 宽下先摆了 `hello `（x=0..36），`world` 放不下触发换行——此刻行首 x 归零、空格蒸发、已摆宽度全作废。两遍布局把这个回滚成本归零：第一遍只产出**文本与索引**（轻量、可丢弃），第二遍在定局上摆位，永不回头。

## 3. 第一遍的实现：breakWithSpans 全文走读

### 3.1 拼全文 + owner 数组

```ts
function breakWithSpans(spans, opts, measurer): { text: string; owners: number[] }[] {
  let full = "";
  const owner: number[] = [];
  spans.forEach((span, spanIndex) => {
    for (let i = 0; i < span.text.length; i++) owner.push(spanIndex);
    full += span.text;
  });
```

`owner[i]` = 全文第 i 个字符属于第几个 span——一张全局归属表，O(总字符数) 一次建好。后面所有「这个字符是什么颜色/字号」的问题，都先经 `owner[srcIndex]` 查表，再回 `spans[o]` 取样式。

### 3.2 调断行器

```ts
  const width = opts.width ?? Number.MAX_SAFE_INTEGER;
  const raw: BrokenLine[] = breakLinesIndexed(full, { width, fontSize: opts.fontSize, measurer });
  const maxLines = opts.maxLines ?? 0;
```

两个细节：

- **无 width 时行宽取 `MAX_SAFE_INTEGER`**——数学上的「永远放得下」，断行退化为只按换行符切。这正是单行文本（不给 width）的语义
- **断行统一用块字号**——span 各自的字号不参与断行判定（取舍见《03-文本度量》第 5 节的近似表），但**参与第二遍的摆位宽度**（piece 按自己的 fontSize 量）

### 3.3 正常路径：索引 → owner 的翻译

```ts
  const result: { text: string; owners: number[] }[] = [];
  for (const l of raw) {
    const owners: number[] = [];
    for (const si of l.srcIndices) owners.push(owner[si] ?? 0);
    result.push({ text: l.text, owners });
  }
  return result;
```

行文本的每个字符拿着**源索引** `si` 回全局表查归属——`?? 0` 是越界防御。注意这个翻译依赖的前提：`l.srcIndices` 与 `l.text` **逐位对应**。这个前提由《04-断行算法》里 chunkify/breakLinesIndexed 的记账保证——下一节讲它当初是怎么被咬的。

## 4. 真实 bug：断行丢字符，span 归属错位

第一版实现「拼全文 → 断行 → **按位置推算**每字符属于哪个 span」。测试立刻抓住：`"ab cd"` 在窄宽下断成两行后，第二行的 span 归属算错——**因为断行器丢弃了换行处的空格**，第二行行首字符的全局位置比推算者以为的提前了一位，从此每行错一位、越往后错得越多。

修复：断行器亲自记账。`breakLinesIndexed` 返回每行**保留字符的源索引**：

```ts
export interface BrokenLine { text: string; srcIndices: number[] }  // srcIndices[i] = text[i] 在全文的位置
```

span 归属 = `owner[srcIndex]`，丢弃的空白没有索引、天然无归属——位置推算的根本缺陷（试图**重建**已经丢失的信息）被记账消灭（信息在丢弃现场就被**传递**下去）。

> 这是「派生数据不要靠位置推算，要靠记账」的又一次胜利——与第二阶段「clip 存绝对坐标」同一个原则：**当中间层会丢弃/重排元素时，索引必须在丢弃现场传递，不能事后重建**。

防回归的断言在断行册：`chunkify` 的「源索引与字符一一对应」测试一条里 3 处断言，逐块核对 `srcIndices`；本册的「span 归属跨断行保持正确」测试验收最终效果（`"ab"` 红 + `"cd"` 黑 @w12 断成两行，第一行 piece 归 span0 色 RED、第二行归 span1 色 BLACK）。

## 5. maxLines 的两种口径

超行时的两个分支，行为都被测试钉死（同输入 `"aaaa bbbb cccc"` @w30，maxLines=2）：

### 5.1 clip：直接截断

```ts
    if (opts.overflow !== "ellipsis") {
      const clipped = raw.slice(0, maxLines);
      // …逐行翻译 owners…
      return resultClipped;
    }
```

断行器原本产出 `["aaaa","bbbb","cccc"]`，`slice(0,2)` 之后就是 `["aaaa","bbbb"]`——不合成任何字符。测试：`✓ clip：直接截到 maxLines 行`。

### 5.2 ellipsis：合并行 + 重截

```ts
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
```

构造：**末行 = 最后保留行 + 合成空格 + 溢出首行**，然后像单行 ellipsize 一样重截（预算先扣 `...` 的宽度）：

```ts
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
```

手推测试用例（w30、每字符 6px、`...`=18px）：断行 `["aaaa","bbbb","cccc"]`；保留 1 行 `["aaaa"]`；合并 `"bbbb" + " " + "cccc"` = `"bbbb cccc"`；重截预算 30-18=12 → `keep="bb"`；末行 `"bb..."` 宽 12+18=30 顶格。结果 `["aaaa","bb..."]`，行宽 ≤ 30——正是测试断言的两个值。

**为什么要合并而不是直接在 `"bbbb"` 后加 `...`**：直接加得到 `"bbbb..."`，丢掉了「后面还有内容」的信息——用户看不出截断发生在词中间还是词后面。合并重截让省略号前的残影（`bb` 之后原文本是 `bb cccc…`）是真实内容的最后可见片段，这是各框架通行的口径。

**合成字符的归属规则写在现场**：合成空格继承前一字符的 owner（`mergedOwners[last]`）；三个点在 `while` 截平后补 3 份 `lastOwner`——省略号跟着它前面那个字符的颜色。如果不继承，合成字符会掉进 `?? 0` 兜底——单 span 场景看不出错，多 span 场景省略号会突然变色。这正是「记账规则必须在合并现场写明」的含义。

## 6. 第二遍：layoutText 摆位

### 6.1 行高与骨架

```ts
export function layoutText(spans, opts, measurer): TextLayout {
  const blockFontSize = opts.fontSize;
  const lineHeightRatio = opts.lineHeightRatio ?? 1.25;
  const lineHeight = Math.round(blockFontSize * lineHeightRatio);
  const lines = breakWithSpans(spans, opts, measurer);
```

行高在**入口处一次性取整**（`Math.round(10×1.25)=13`），全块统一——paintText 的 y 推进、size.height 都用同一个数，不会出现「第 1 行高 12.5、累计 12.5」的浮点漂移。（注意口径差：`metrics(10).lineHeight` 是未取整的 12.5，`layoutText` 用的才是 13——「行高是排版参数」的又一证据，见《03-文本度量》。）

### 6.2 run-length 分组出 pieces

```ts
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
```

内层是个 **run-length 编码**：把行内连续同 owner 的字符合并成一个 piece。两个测试钉住这一段：

```text
✓ 一行内多 span 依 x 递增      spans=[ab(红), cd(黑)]@w100 → pieces x = [0, 12]，width = [12, 12]
✓ span 归属跨断行保持正确      同 spans@w12 → 两行，第一行唯一 piece = {spanIndex:0, text:"ab", color:RED}
```

`width = measurer.measure(pieceText, fontSize)` 用的是 **span 自己的字号**——第一遍断行按块字号估宽，第二遍摆位按真实字号量宽。等宽 Mock 下两者一致；真字体混排时可能有细微差（已列入《03-文本度量》的近似表）。

### 6.3 块宽与对齐

```ts
  // 块宽 = 最长行的内容宽（不是可用宽）——文本块在布局树里按内容尺寸参与排列，
  // 「占满固定宽」是外层容器（Align/Flex）的职责
  const maxLineWidth = laid.reduce((m, l) => Math.max(m, l.width), 0);
  if (opts.align === "center" || opts.align === "right") {
    const widthLimit = opts.width ?? 0;
    for (const line of laid) {
      const slack = Math.max(0, widthLimit - line.width);
      const dx = opts.align === "center" ? slack / 2 : slack;
      if (dx > 0) {
        for (const piece of line.pieces) piece.x += dx;
      }
    }
  }
```

三个决定：

1. **块宽 = 内容宽**：`size.width` 是最长行的实际内容宽，不是可用宽 width。「占满可用宽」是外层 Align/Flex 的事——文本块自己是 intrinsic size 的信奉者（第四阶段 RenderText 的 `isFixedSize` 建立在这上面）
2. **对齐 = 平移空隙**：每行算 `slack = widthLimit - 行宽`，center 平移一半、right 平移全部。行尾空白早在断行时蒸发（《04》第 8 节），所以 slack 是干净的——**对齐能这么简单，是因为断行器已经把脏东西清掉了**
3. **对齐不改块宽**：平移的是 piece.x；`size.width` 仍取 maxLineWidth 与 widthLimit 无关（本块对齐后若内容窄于可用宽，块还是内容宽）

测试：`✓ 对齐：center 在宽度内平移半份空隙`——`"abc"`（18px）@w60 center → slack=42 → dx=21，断言 `piece.x === 21` 即 `(60-18)/2`。

## 7. 光标几何：输入框的两根支柱

```ts
/** 光标几何：行内第 offset 个字符前的 x 坐标（相对块左边界；offset ∈ [0, len]）。 */
export function offsetToX(layout, lineIndex, offset, measurer): number {
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
```

- 语义：**第 offset 个字符「之前」的 x**。offset=0 是行首、offset=len 是行尾、offset=len+5 也按行尾（`return line.width`）——「行尾再往右」没有更多边界，钳到行尾。这个语义对「光标在行尾按右键 → 跳下一行行首」的编辑器交互刚好够用
- 实现是**前缀和**：在 piece 序列里找 offset 落在哪个 piece（`offset <= consumed + len`），在 piece 内部再量一次前缀（`measure(piece.text.slice(0, local))`）
- 前缀度量是缓存友好调用（《06-文本缓存》的前缀链）

```ts
/** 命中几何：x → 最近的光标 offset（落在字符中点右侧则取其后边界）。 */
export function xToOffset(layout, lineIndex, x, measurer): number {
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
```

- **中点吸附**：x 落在字符「内部」并不对应任何合法光标位——光标只能站在字符之间。规则是落在字符前半段（`x < charX + adv/2`）取前边界，后半段取后边界
- 每字符一次 `advanceAt`（前缀差分）——绑定层 GlyphInfo 读不出 advance 的直接后果（见《02-字体与字形》《06-文本缓存》）
- 超出 x 一路走过所有字符，返回 `consumed` = 行尾 offset

全部光标断言（`"hello"`，fontSize=10，每字符 6px，中点在 3/9/15/21/27）：

```text
✓ offsetToX：每个字符边界 0,6,12,18,24,30        （offset 0..5 全遍历）
✓ xToOffset：落在字符中点左侧取前边界            2.9→0、3.1→1、0→0、29→5
✓ 超出 x 按行尾                                  999→5
✓ 往返稳定：offset → x → offset 不动              0..5 全遍历
✓ 跨片段：行内两个 span 的光标仍连续             ab|cd 的 offset2 边界 = 12
                                                x=16（落在 d 前半段中点 15 之后）→ offset 3
```

「往返稳定」是这套几何的**核心不变量**：`xToOffset(offsetToX(o)) === o` 对所有合法 o 成立。它把「光标位置」从浮点 x 坐标提升为离散 offset——编辑器状态机只存 offset，每帧用 offsetToX 重算渲染位置，永不累积误差。

「跨片段连续」防的错：span 边界（ab|cd）处若两段各算各的，offset 2（ab 之后）与 offset 2（cd 之前）可能给出两个 x。实现上因为第二遍摆位是**行内统一累加 x**，边界天然共享同一个 12。

**中点吸附在 RTL 下不成立**（思考题口径）：从右向左的文本里前缀和方向反了，「前边界」在视觉右侧；且双向混排（阿拉伯数字嵌西文）需要 Unicode 双向算法先分段。第五阶段不做 RTL，这条如实记为边界。

## 8. 绘制：paintText 与黄金断言

```ts
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
```

薄到几乎没有逻辑：行 y 逐行推进（`li * lineHeight`）、片段 x 用摆位结果、样式取 piece 已解析的值。`piece.text !== ""` 守卫空片段（ellipsize 的 keep 可能为空）不发命令。

黄金断言（`paintText` + translate 烘焙一起验）：

```text
✓ 按行按片段发 text 命令，坐标绝对化
  translate(100,50) 后 paintText(layout, 5, 10)：
  ab(RED)   → { text:"ab", x:105, y:60,  fontSize:10, color:RED,   clip:null }
  cd(BLACK) → { text:"cd", x:105, y:73,  fontSize:10, color:BLACK, clip:null }   // y: 60+13
```

两行两命令；第二行 y=60+13（行高 13 从这刻起就是「公开契约」）；translate 被第二阶段的 StatefulPainter 烘焙进绝对坐标——文本层不感知变换栈。

## 9. 接线：RenderText 与 demo

`RenderText`（`core/render/text-object.ts`）把这套引擎接到 RenderObject 树：

- `isFixedSize() = true`：文本尺寸只由内容与 max 宽决定——固定尺寸型节点，天然布局边界（第四阶段布局协议的前哨）
- `performLayout`：约束有界（`c.maxWidth !== Infinity`）就把 `opts.width` 设为 maxWidth 走 wrap；无界则不设 width（断行退化成按换行符切，见 3.2 节）
- `setText(spans)` 是改文本的唯一入口，自动 `markNeedsLayout()`——第六阶段脏标记的接入点
- `paintSelf` 调 `paintText(p, this.lastLayout, 0, 0)`，布局结果缓存在节点上

demo（`apps/03-text.ts`）把光标两根支柱变成可玩的一行字：

```ts
if (isMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
  caretOffset = xToOffset(caretLine, 0, mouse.x - CARET_X0, measurer);  // 命中 → offset
}
// …
if (Math.floor(elapsed * 2) % 2 === 0) {          // 每秒闪一次（1Hz 方波）
  const cx = CARET_X0 + offsetToX(caretLine, 0, caretOffset, measurer);  // offset → x
  p.fillRect(rect(cx, CARET_Y0, 2, 26), PALETTE.accent);                 // 2×26 竖条
}
```

状态只存 `caretOffset`（离散），每帧重算 x——「往返稳定」保证点击后光标站得住。退出时打印 `caretOffset roundtrip=true` 做冒烟验证。第五阶段的 TextField（选区、编辑、滚动跟随）全部建立在这两个函数与这条不变量上。

## 10. 常见误区

| 误区 | 真相 | 出处 |
|---|---|---|
| span 断行后可按位置推算归属 | 断行丢字符，位置推算必错位——必须源索引记账 | 第 4 节（真 bug） |
| 省略号绘制时再加 | 省略号占宽度预算，进度量；合成字符归属要现场写明 | 第 5 节 |
| 对齐会改变文本块的 size.width | 对齐只平移 piece.x；块宽永远是内容宽 | 6.3 |
| offsetToX 返回屏幕绝对坐标 | 相对块左边界；demo 里手动加 CARET_X0 | 第 7 节 |
| xToOffset 能给出「字符中间」的位置 | 光标位只在字符之间；中点吸附取最近边界 | 第 7 节 |
| 两遍布局是性能优化 | 是正确性结构：断行有回溯（换行），摆位必须在定局上进行 | 第 2 节 |
| maxLines 的 ellipsis 直接截最后保留行加 ... | 要合并溢出首行重截，残影才是真实内容 | 5.2 |
| 行高从 metrics() 里读 | layoutText 入口 round(块字号×比例) 才是口径（13 ≠ 12.5） | 6.1 |

## 11. 本册小结

- 数据流：spans → full+owner → 断行（srcIndices）→ owners → run-length 分 pieces → 对齐平移 → TextLayout
- 两遍布局：先测宽断行（可回溯、轻量），再在定局上摆位（不回头）
- 真 bug 教训：中间层丢字符时，索引必须在丢弃现场传递——`BrokenLine.srcIndices` 是契约
- ellipsis 合并行 + 合成字符继承前字符归属；clip 是纯 slice
- 光标几何两根支柱 + 往返稳定不变量；中点吸附、超界钳制、跨 span 连续
- paintText 零逻辑薄层；RenderText 固定尺寸 + setText 标脏

## 自测

1. 两遍布局里，第一遍的输出是什么？第二遍为什么不能顺便把行也断了？
2. span 归属为什么不能按「位置减去丢弃数」推算？你的方案在 `a␣␣␣b`（三个空格丢俩）下对吗？
3. ellipsis 合并行时，合成空格继承前字符归属——如果不继承，会出什么错？构造一个多 span 的具体反例。
4. `offsetToX(layout, line, len+5)` 返回什么？这个语义对「行尾光标 + 换行」有什么用？
5. 推算：spans = `[ab(红), cd(黑)]`，块字号 10，width=12。画出两行的 pieces（spanIndex/x/width 各是多少）。
6. 推算：同 spans 但 width=100。一行内两个 piece 的 x 各是多少？offsetToX(offset=2) 呢？
7. 推算：`"click"`（fontSize=10）的 xToOffset(8.9)、xToOffset(9.1)、xToOffset(15) 各是几？（中点在 3/9/15/21/27；注意 15 恰好等于中点时走哪边）
8. `xToOffset` 的「中点吸附」在 RTL（从右向左）文本下还成立吗？差在哪一步？
9. maxLines=2、overflow=ellipsis、`"aaaa bbbb cccc"`@w30：写出 mergedText、keep、末行文本与宽度，并说明 owners 数组长度为什么与文本等长。
10. 对齐 center 时 `size.width` 变了吗？「占满可用宽」该由谁负责？这和第四阶段哪个布局协议概念挂钩？
