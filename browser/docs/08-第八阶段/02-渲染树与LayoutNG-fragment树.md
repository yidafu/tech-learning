# 渲染树与 LayoutNG：fragment 树

> [← 第八阶段导览](01-导览.md) · 时间线 ⑮。第七阶段结束时，浏览器手里有 DOM、CSSOM 和每个节点的 ComputedStyle——但全是「样式与逻辑」，没有「几何」。这一册讲几何的载体怎么搭：LayoutObject（RenderObject 的现代叫法）怎么和 DOM 对应、display:none 与 visibility:hidden 在树上的真实差异、伪元素与匿名盒这些「DOM 里查不到的盒子」从哪来，以及现代 Blink 布局引擎 LayoutNG 为什么要把布局结果设计成不可变的 fragment 树。

## 1. 四棵树：从逻辑结构到纹理

渲染管线自上而下是四棵树，每棵回答一个不同的问题：

```text
DOM 树             逻辑结构——「页面上有什么内容」
 └─ LayoutObject 树    盒与几何——「每个盒多大、放在哪」（本册主角）
     └─ PaintLayer 树     绘制顺序——「谁先画谁后画、怎么叠加」（04 册）
         └─ 合成层树（cc）     纹理与运动——「哪些位图可以独立动」（04/06 册）
```

| 树 | 谁建 | 数据内容 | 数量级关系 |
|---|---|---|---|
| DOM | HTML 解析器（第七阶段 03 册） | 节点、属性、文档语义 | 一棵全局树 |
| LayoutObject | 布局引擎 | 盒模型、几何、布局状态 | ≈ 可见盒子数，与 DOM 不一一对应 |
| PaintLayer | 绘制准备 | 绘制顺序、叠加上下文、滚动 | 只在需要时创建，远少于 LayoutObject |
| 合成层 | 合成器（cc） | 纹理、变换、裁剪 | 最少，受提升条件控制（04 册） |

每一层向下都是「投影」：下层由上层派生，但**不必一一对应**——这正是本册要掰清楚的三类不对应（display:none、伪元素、匿名盒）。

### 1.5 「渲染树」这个词的考古

老教材讲「渲染树（render tree）= DOM 树 ∪ CSSOM 树，过滤不可见节点」——这是 WebKit 时代 RenderObject 树的通俗说法，作为入门模型可用，但有两个不准：

1. **不是「合并」**：LayoutObject 树不是把两棵树拼起来，而是以 DOM 为骨架、ComputedStyle 为属性重新生成的另一棵树——伪元素和匿名盒会新增 DOM 里不存在的节点，「合并」解释不了它们；
2. **不是「过滤」**：display:none 是「根本没有对应的 LayoutObject」，visibility:hidden 是「LayoutObject 存在但不绘制」——两种「不可见」在树上的形态完全不同，笼统说「过滤掉不可见节点」会掩盖这个关键差异（§3）。

Chrome/Firefox 的公开文档与源码里早已不使用「render tree」这个词；面试里说「渲染树」没错，但能接一句「即 LayoutObject 树，与 DOM 不一一对应」才是准确答案。

## 2. LayoutObject：盒与几何的载体

LayoutObject 是布局引擎的核心对象：每个可见的盒模型实体对应一个。它持有：

- 盒的几何信息（位置、尺寸、padding/border/margin 的计算结果）；
- 指回 DOM 节点的引用（大多数情况）与 ComputedStyle 的引用；
- 布局所需的脏标记（03 册展开）与子树指针。

DOM 节点与 LayoutObject 的对应关系全表：

| DOM 侧 | LayoutObject 侧 | 例 |
|---|---|---|
| 普通元素 + 可见 display | 1 : 1 | `<div>` → LayoutBlockFlow |
| 文本节点 | 1 : 1 | 文本 → LayoutText（连「空白符」都可能有一个） |
| `display:none` 元素及其子树 | 1 : 0 | **不生成 LayoutObject**（§3.5） |
| 伪元素（::before 等） | 0 : 1 | **DOM 里没有节点**（§4） |
| 匿名盒 | 0 : 1 | 布局引擎自造的盒（§4.5） |
| 一个元素被拆成多段（跨行/跨列） | 1 : N | fragment（§5.5） |

LayoutObject 家族速查（名字来自 Blink 源码，认得即可）：

| 类 | 对应盒 |
|---|---|
| LayoutBlockFlow | 块级盒（最常见的块容器） |
| LayoutInline | 行内盒（参与 IFC，03 册） |
| LayoutText | 文本片段 |
| LayoutReplaced 系（LayoutImage 等） | 替换元素（img/canvas/video） |
| LayoutNG 系列算法对象 | Flex/Grid/Table 的布局算法实现（§5） |

样式变化时（第七阶段 05 册的样式计算产出新 ComputedStyle），LayoutObject 收到通知：只改 Paint 相关属性 → 记重绘失效；动了盒模型属性 → 记布局失效，脏位沿树传播，等下一次统一布局（03 册）。**失效传播的分诊逻辑是第七、八阶段之间的接口**：样式计算回答「改了什么值」，渲染管线回答「这个值牵连哪几站」（07 册全表）。

### 2.5 文本节点：最容易被漏算的 LayoutObject

文本在渲染树上的形态比想象中碎，三个要点：

1. **一个 DOM 文本节点 ≠ 一个 LayoutText**：双向文本（bidi）、软换行会把同一段文字拆成多个 LayoutText——「中东语种混排的段落文本节点数翻倍」不是 bug，是 bidi 算法的分段；
2. **空白符也有盒**：`white-space` 默认规则下折叠后的空白仍可能生成 LayoutText；`white-space: pre` 时每个换行都是实打实的盒——富文本编辑器（contenteditable）场景盒数暴涨的常见来源；
3. **文本是布局的开端**：IFC 的行高、基线全部从 LayoutText 出发（03 册），文本节点的数量直接决定行盒构建的成本——「一个 div 一万个字」和「一万个 div 一个字」的布局形态完全不同，后者还要挨个算盒模型。

数盒子的基本功：DevTools Performance 的 Layout 事件详情里能看到受影响的 LayoutObject 数量级；Elements 面板的 DOM 计数永远是「逻辑节点数」——两个数字的差值就是伪元素、匿名盒与文本碎片的总量。

## 3. display:none 与 visibility:hidden：两种「不可见」在树上的差异

面试与工程里最高频的一对概念。差异的根源是它们作用在**不同的阶段**：

```text
display:none    → 样式计算阶段就「出局」：不生成盒 → 不进 LayoutObject 树
visibility:hidden → 盒照常生成、照常参与布局，只在绘制阶段被跳过
```

四棵树的存在性对照：

| 属性 | DOM | LayoutObject | PaintLayer | 合成层 | 占据空间 | 可被选中/响应事件 |
|---|---|---|---|---|---|---|
| display:none | 有 | **无**（子树也无） | 无 | 无 | 否 | 否 |
| visibility:hidden | 有 | 有 | 有（通常共享祖先的） | 无 | **是** | 否（但可被 tab 聚焦的表单? 不参与） |
| opacity:0 | 有 | 有 | 有（必建） | 可能（04 册） | 是 | **是** |
| display:none 但祖先有 will-change | 有 | 无 | — | — | 否 | 否 |

三个工程含义：

1. **display:none 的显隐是「重建」不是「切换」**：从 display:none 改回可见，整棵子树要重新走盒生成 → 布局 → 绘制。列表页「展开一次全部渲染」的卡顿常源于此——这也是虚拟列表（09 阶段）要处理的边界；
2. **visibility:hidden 的元素参与布局**：占位、参与父容器高度计算、参与文档流——「隐藏但留位」语义的正确实现；其**子孙设置 `visibility:visible` 可以恢复显示**（inherit 链的例外），display:none 没有任何子属性能翻案；
3. **display:none 里的东西不加载也不上屏，但 DOM 里还在**：`<template>`、未显示的 modal 内容，查询、事件委托照样能命中——「看不见」≠「不存在」。

顺带一张速查：其他「隐藏」手段的位置。

| 手段 | 参与布局？ | 可交互？ | 语义 |
|---|---|---|---|
| display:none | 否 | 否 | 从渲染树除名 |
| visibility:hidden | 是 | 否 | 看不见但占位 |
| opacity:0 | 是 | 是 | 透明但存在（读屏/焦点可达） |
| content-visibility:auto | 视口外跳过 | 是 | 渲染级懒渲染（09 阶段 06 册） |

### 3.5 display:none 的转场陷阱

`display:none ↔ display:block` 的切换**不会播放 transition**——中间状态不进树，浏览器无法在两个「存在于树」的状态间插值。现代解法是 `@starting-style` + `transition-behavior: allow-discrete`（让 display 本身可过渡），或者先改 opacity/transform、动画结束后再 display:none。写「淡入淡出弹层」卡住的人，九成卡在这个阶段差上。

## 4. 伪元素：有 LayoutObject、没有 DOM 节点的盒子

伪元素是「由样式生成的盒」：DOM 里查不到，但渲染树里货真价实。这解释了一个经典谜题——为什么 `document.querySelectorAll('*')` 数出来的节点数，和 Performance 面板里 Layout 涉及的盒子数对不上。

| 伪元素 | 生成的盒 | 参与布局 | 备注 |
|---|---|---|---|
| ::before / ::after | 元素的子级盒 | 是 | content 为空时默认不生成（除非 display 非 inline） |
| ::first-line | 一个特殊行盒 | 是 | 只允许少数继承属性；实现上常走「特殊 LayoutObject」 |
| ::first-letter | 一个行内盒 | 是 | 首字下沉的实现载体 |
| ::marker | 列表项标记盒 | 是 | list-item 的标记内容 |
| ::placeholder / ::selection | 内部修饰盒 | 否/绘制层 | 不产生独立布局盒 |

从 JS 侧确实能「摸到」伪元素的样式——`getComputedStyle(el, '::before').content`——但拿不到几何（它没有 DOM 节点，`getBoundingClientRect` 无从谈起）。要测量伪元素尺寸，只能给 ::before 套个真实子元素或换实现。

伪元素还有一个与失效传播相关的特性：**修改 `content` 的值会重建盒**，改 ::before 的 color 则只记绘制失效（07 册的分诊表）。频繁用 ::before 做计数器动画（改 content 数字）的人会发现它又贵又不流畅——content 变化是「重建」级失效，数字动画应改用 `counter-reset` + CSS counter 或直接改文本节点。

### 4.5 匿名盒：布局引擎自造的「隐形盒子」

匿名盒是布局引擎为了满足格式化上下文规则**自己补造**的盒。三类必须认识：

**1. 匿名块盒（anonymous block box）**——块容器里混排了行内内容和块级内容时，行内部分会被包进匿名块：

```html
<div>
  文本 A            ← 与 <p> 兄弟混排
  <p>块级段落</p>
  文本 B
</div>
```

布局结果不是「div 的三段直接排」，而是**三个块**依次排：匿名块(文本A) → p → 匿名块(文本B)。文本 A 和 B 不会同行显示——被规则拆进了两个匿名块。这就是「为什么块级元素一出现，前后的文本就断开了」的机制解释。

**2. 匿名行内盒（anonymous inline box）**——块容器的直接文本 run 各自被包成匿名行内盒，参与行盒构建（03 册 IFC）。一个段落的每一截文本（含标点、被元素打断的部分）都是一个匿名行内盒。

**3. 匿名表格对象**——HTML 解析与 CSS 盒生成都会为残缺表格自动补齐：

```html
<table><tr><td>x</td></tr></table>  <!-- DOM 自动补 tbody（解析器干的） -->
<style>.cell-like { display: table-cell; }</style>  <!-- 父级不是 table-row？补匿名行/表 -->
```

`display:table-cell` 挂在普通 div 上时，布局引擎向上补匿名 table-row、匿名 table——匿名盒可以一层层连锁生成，这也是 table 系 display 的布局比想象中贵的原因之一。

## 5. LayoutNG：不可变的 fragment 树

Blink 的老布局（Legacy Layout）运行了十多年，问题积在架构层：

| Legacy 的问题 | 后果 |
|---|---|
| 布局结果就地可变（直接改对象的 width/position 字段） | 中途被打断 = 状态不一致；结果没法缓存复用 |
| 每种布局算法各写一套失效逻辑 | 增量布局靠补丁，改一处常牵动全局 |
| 布局与失效耦合在对象里 | 难以并行、难以只算子树 |

LayoutNG（2018 年起逐步替换 Legacy，块流/行内/Flex/Grid/Table 先后切换）把布局改写成了**纯函数式的形态**：

```text
输入：盒子树节点 + ConstraintSpace（可用空间、约束条件）
算法：该格式化上下文的 NG 算法（block/inline/flex/grid 各一个）
输出：LayoutResult —— 不可变的 fragment 树
```

三个设计要点：

1. **fragment 不可变**：布局结果一旦算出就是只读对象，谁都不许改。要「变」就重新算一份新的——老结果留在原地，正好可以被增量布局复用（「子树没脏就沿用旧 fragment」）；
2. **盒与 fragment 分离**：盒（box）是结构，fragment 是「盒在某次布局里、某个位置上的一次呈现」。一个盒可以产生多个 fragment；
3. **算法彼此解耦**：Flex 算法不知道 Grid 存在，各自对输入/输出的契约负责——新格式化上下文（如 subgrid、masonry 类提案）可以独立接入。

### 5.5 一个盒、多个 fragment：fragment 树与盒树的关系

盒树回答「有哪些盒」，fragment 树回答「这次布局里它们呈现成什么样」。一盒多 fragment 的典型场景：

```text
<div style="width:200px">一段会被折成三行的长文本</div>
   盒：1 个 LayoutBlockFlow
   fragment：3 个行 fragment（每行一个）

<section style="columns:2">长内容</section>
   盒：若干
   fragment：内容被切成列，跨列的盒每列一个 fragment
```

mermaid 直观版：

```mermaid
flowchart LR
  subgraph 盒树（结构）
    B1[div 盒] --> B2[文本盒]
  end
  subgraph fragment 树（某次布局的结果）
    F1[行 fragment 1] --> F2[行 fragment 2] --> F3[行 fragment 3]
  end
  B2 -. 产生 .-> F1
  B2 -. 产生 .-> F2
  B2 -. 产生 .-> F3
```

fragment 树的两个直接收益，把本册与性能话题接起来：

| 收益 | 落点 |
|---|---|
| **增量布局**：脏子树重算，未脏部分沿用旧 fragment | 03 册的局部布局与 thrashing 治理 |
| **布局偏移可测**：新旧两份 fragment 对比几何差 = Layout Shift 的计算基础 | 09 阶段 CLS 指标的实现底座 |
| **潜在并行**：互不依赖的子树可并行布局（仍在演进中） | 多线程布局的架构前提 |

还有一条容易被忽略的间接收益：**布局与绘制解耦得更彻底**。旧架构里布局结果就地可变，绘制阶段读到的几何「取决于布局改到哪一步」；NG 的不可变 fragment 让「布局产出」成为一份完整快照，绘制、Prepaint、合成读取的都是稳定数据——失效传播（07 册）能逐站独立进行，靠的就是每站产物都不可变。

## 6. 现代 Blink 渲染管线：主线程段的地图

把本册放回整条 ⑮ 管线，看每个阶段的产物是什么（这是后续各册的目录）：

| 阶段（主线程） | 产物 | 展开位置 |
|---|---|---|
| 样式计算 | 每节点 ComputedStyle | 第七阶段 05 册 |
| **布局（LayoutNG）** | **fragment 树（不可变）** | 本册 + 03 册 |
| Prepaint / 更新属性树 | transform/clip/effect/scroll 属性树 | 04 册 |
| 绘制（Paint） | display list（绘制指令记录） | 05 册 |
| Commit | 把层树 + 属性树 + display list 交给合成线程 | 06 册 |
| （合成线程侧）栅格化/激活/绘制/GPU 提交 | 位图瓦片 → 合成帧 → 上屏 | 05/06 册 |

进程与线程归属：以上主线程段发生在**渲染进程**（站点隔离：每个站点一个，[第一阶段 03 册](../01-第一阶段/03-浏览器组成-进程线程与站点隔离.md)）；合成线程同属渲染进程，GPU 进程负责跨进程的最终合成——地图在 06 册展开。与自绘框架的对照：`gui/` 站亲手造的「脏控件 + 局部重绘」对应的就是这里的脏标记 + 增量布局，浏览器版本多了「合成」这一站，那是教学框架不会有的复杂度来源。

## 7. 实验

1. **数盒子 vs 数节点**：建 1000 个 div 的页面，`document.querySelectorAll('*').length` 记下节点数；Performance 录制加载，看 Layout 事件的自描（会列出受影响对象数量级）。给一半加 `::before{content:'x'}` 再录——节点数不变，Layout 涉及的盒变多，这就是伪元素在树上的存在证据。
2. **display:none 的重建成本**：页面放 5000 个列表项容器默认 `display:none`，按钮切换为可见。Performance 里看切换瞬间的 Recalculate Style + Layout 时长；再对比 `visibility:hidden` 切换 `visibility:visible`——只有绘制失效，Layout 段基本消失。
3. **visibility:hidden 的占位验证**：父容器下放一个 visibility:hidden 的 100px 高块，`document.body.scrollHeight` 与删掉它对比——高度没变，占位实锤。
4. **伪元素样式可达性**：`getComputedStyle(document.querySelector('.demo'), '::before').content` 返回生成的 content 字符串；Elements 面板里伪元素以 `::before` 节点显示（可点选、看盒模型），但 DOM 断点/选择器查询永远选不中它——「在树上、不在 DOM」的双面性。
5. **匿名块盒验证**：§4.5 的混排 HTML，用 DevTools 检查「文本 A」和「文本 B」的盒模型面板——两者的边界框垂直堆叠，之间隔着 p。想强制同行？把 p 改成 inline，或者接受两个匿名块的现实。
6. **盒膨胀系数盘点**：对自己负责的页面算一次「DOM 节点数 / Layout 事件涉及对象数」的比值（见 §8.5 问答），记录基线——比值异常膨胀的页面往往藏着海量伪元素或空盒。
7. **文本碎片观察**：`document.querySelector('p').firstChild` 拿到一个文本节点，但 Performance 的 Layout 详情里该段落可能对应多个文本对象（bidi/断行）——「1 个节点 N 个盒」的最小实证。

## 8. 常见误区

1. **「渲染树是 DOM 和 CSSOM 合并出来的」**：是重新生成的另一棵树，且因伪元素/匿名盒**比 DOM 多、因 display:none 比 DOM 少**——不是简单投影。
2. **「display:none 只是不画，性能上和 visibility:hidden 差不多」**：差的量级是「布局是否存在」：display:none 无布局参与；visibility:hidden 全量参与。切回显示时前者重建子树、后者只补绘制。
3. **「伪元素是虚拟的，不占渲染开销」**：::before/::after 是真实布局盒，参与重排重绘；改 content 是重建级失效。
4. **「DOM 节点数 = 页面布局开销」**：盒数 ≥ 可见节点数（伪元素、匿名盒、文本节点都要算），fragment 数又 ≥ 盒数（断行/跨列）。三个数字分别对应内存、布局、绘制的量级。
5. **「LayoutNG 是新布局算法」**：它是布局**架构**（输入→算法→不可变输出），CSS 布局规则一条没变——变的是引擎怎么算、怎么缓存、怎么增量。
6. **「display:none 的子元素设置 visibility:visible 能显示出来」**：display 在样式计算就出局，子孙根本没有盒，没有任何属性能翻案；能翻案的是 visibility（§3 对照表）。
7. **「opacity:0 等价于 visibility:hidden」**：前者透明但可交互、必建 PaintLayer（04 册），常被误用于「隐藏时还想接收点击」——语义上它是「透明」不是「隐藏」。
8. **「LayoutNG 上线后布局规则变了」**：CSS 布局语义一字未改——变的只有引擎的算法组织与数据结构。任何「NG 下 margin 合并行为不一样」的说法都值得怀疑，先复现再下结论。
9. **「文本节点不重要」**：文本是最碎的 LayoutObject 来源（bidi 分段、空白符盒），富文本/编辑器场景的布局成本大头常在文本而非元素——数盒子的习惯要从第一课养成（§2.5）。

### 8.5 常见问答

**Q：怎么从 JS 侧知道某个元素「有没有盒」？**
没有直接 API。间接办法：`getBoundingClientRect()` 返回全零（且祖先无 transform 干扰）暗示没有盒；或对比 `offsetParent` 为 null（display:none 或 fixed 祖先链断裂时）。面试口径说结论：**display:none 与 fixed 会让 offsetParent 为 null**，这是最接近「盒是否存在」的探针。

**Q：`<template>`、`hidden` 属性、`aria-hidden` 各作用在哪棵树？**
`<template>` 根本不进 DOM 主树（惰性模板，第七阶段 03 册）；`hidden` 属性 ≈ `display:none`（四棵树只剩 DOM）；`aria-hidden` 只影响可访问性树，四棵渲染树照旧——三者作用层完全不同，混用会出「看不见但读屏能读到」「看得见但语义缺失」的错配。

**Q：SPA 切页用 v-if（display:none 同款）还是 v-show（visibility/opacity 同款）？**
对照本册：v-if 重建子树（首次切换贵、后续占内存少），v-show 保盒（切换便宜、常驻内存）。高频切换用保盒方案，低频大子树用重建方案——这层权衡与浏览器无关，是「树上有没有盒」的通用问题，`gui/` 站的框架实现里同样要选。

**Q：怎么估算一个页面「盒数」的量级？**
粗算公式：可见元素数 + 文本节点数 + 伪元素/匿名盒估计。DevTools Elements 面板的节点统计给第一项；Performance 的 Layout 事件详情给布局涉及对象数——两者相除的比值稳定在什么量级，就是该页面的「盒膨胀系数」，页面间可比。

## 9. 自测题

1. 画出四棵树的包含关系，各自回答一个什么问题？「渲染树」这个词指哪棵？它和 DOM 为什么不一一对应？
2. display:none 与 visibility:hidden 的节点，分别在 DOM/LayoutObject/PaintLayer/合成层四棵树的哪些上存在？谁占空间、谁能响应事件？
3. 为什么 display:none → visible 的切换会触发整棵子树重建？visibility 的切换为什么不会？各自的 trace 特征是什么？
4. `::before` 在 DOM 树和 LayoutObject 树上分别是什么状态？JS 侧怎么读到它的样式？为什么读不到它的几何？
5. 匿名块盒在什么条件下生成？「div 里文本和块级元素混排」的布局结果是什么？为什么两段文本不可能同行？
6. `display:table-cell` 挂在普通 div 上会连带生成哪些匿名对象？这解释了 table 系 display 的什么成本？
7. LayoutNG 的输入和输出各是什么？「fragment 不可变」给增量布局带来什么好处？
8. 盒树和 fragment 树的关系是什么？什么场景下一个盒对应多个 fragment？Layout Shift 的测量用到了哪棵树？
9. Legacy Layout 的哪三个架构问题推动了 LayoutNG？「不可变输出」怎么同时服务缓存与并行两个目标？
10. 改伪元素的 `content` 和改它的 `color`，失效传播分别走到哪一站？（提示：07 册分诊表，先建立直觉。）
11. 一个 DOM 文本节点为什么可能对应多个 LayoutText？这对富文本编辑器场景意味着什么？

## 10. 自查清单

| # | 检查 | 工具 | 异常指向 |
|---|---|---|---|
| 1 | 页面 DOM 节点数与盒数量级心里有数？ | Performance Layout 事件自描 + 节点统计 | 对不上 → 伪元素/匿名盒/文本节点没算 |
| 2 | 弹层显隐用的哪对属性？ | 代码审查 | 需要「淡入淡出」却用 display 直切 = 转场陷阱（§3.5） |
| 3 | 大列表折叠展开是否在重建子树？ | Performance：切换瞬间 Layout 时长 | 全量重建 → 考虑 visibility/虚拟化 |
| 4 | 隐藏元素是否还需要占位/交互语义？ | 代码审查 | visibility:hidden 不响应事件，需要交互应换 opacity/裁剪方案 |
| 5 | 伪元素有没有被用于高频改动？ | 代码审查 | 改 content 做动画 = 重建级失效，换 CSS counter/文本节点 |
| 6 | 页面的「盒膨胀系数」有没有基线？ | §7 实验 6 | 无基线 = 布局成本变化无法归因 |
| 7 | SPA 切页的保盒/重建选择有没有理由？ | 代码审查 | 高频切换走重建 = 无谓的子树重建 |
| 8 | 隐藏语义三层（display/hidden/aria-hidden）用对了吗？ | 代码审查 | 作用层错配 = 读屏/视觉不一致（§8.5） |

## 11. 延伸

- 下一册：[03-布局-盒模型-格式化上下文与布局抖动](03-布局-盒模型-格式化上下文与布局抖动.md)——LayoutObject 树搭好后几何怎么算：盒模型、BFC/IFC、Flex/Grid 算法概览，以及脏标记与 layout thrashing 的治理。
- 上游：样式计算与 ComputedStyle 在[第七阶段导览](../07-第七阶段/01-导览.md)（其 05 册是失效分诊的起点）；进程/线程归属在[第一阶段 03 册](../01-第一阶段/03-浏览器组成-进程线程与站点隔离.md)。
- 自绘框架对照：脏控件与局部重绘的同构问题，`gui/` 站渲染调度部分亲手造一遍。
