# 样式计算：级联、匹配与 ComputedStyle

> [← 第七阶段导览](01-导览.md) · 时间线 ⑭。DOM 与 CSSOM 备齐，现在要把「几千条规则」落到「上万个元素」的每一个头上，为每个元素算出一份 **ComputedStyle**——这是渲染像素前最后一步纯计算。这一册回答四个连环问题：匹配为什么右到左？级联到底按什么顺序比？浏览器用什么数据结构避免「每元素×每规则」的全量暴力？以及 `getComputedStyle` 为什么是强制同步布局的第一现场。

## 1. 总账：Style 计算在管线里的位置

```text
DOM 树 + CSSOM 规则集合
        │
        ▼
  ① 匹配：每个元素找出命中它的规则
        │
        ▼
  ② 级联：同一属性多个来源时选出赢家
        │
        ▼
  ③ 补全：继承 + 初始值 → 每个 CSS 属性都有确定值
        │
        ▼
  ComputedStyle（每元素一份）──► 渲染树/Layout（第八阶段）
```

| 输入 | 输出 | 失效 |
|---|---|---|
| DOM 节点、CSSOM 规则、父元素 ComputedStyle | 该元素的 ComputedStyle | DOM 改动 / 样式表变化 / 类名切换……触发「脏」标记重算 |

Performance 面板里的 `Recalculate Style`（浏览器内核里常叫 style recalc / resolve style）就是这一步的 trace 名。它之后 Layout 才有输入——顺序不可颠倒，这解释了为什么「样式没生效」查到最后总是回到这一册。

## 2. 匹配为什么右到左

问题：一条规则 `div a span`，怎么判断它命中哪些元素？两个方向都能做：

| 方向 | 做法 | 代价 |
|---|---|---|
| 左到右 | 从 div 出发沿树往下找 a 再找 span | 根节点一个 div 命中 → 整棵子树全要继续验证，路径数随深度/宽度指数放大 |
| **右到左** | 先找所有 span，再逐个向上验证祖先链 | 候选集 = 文档里 span 的个数，最小化 |

关键的不对称性：**大多数规则命中 0 个元素**。右到左让「最坏候选集」= 最右简单选择器的文档命中数，而左到左让最坏候选集 = 左端选择器的命中数（id/class 之外的 tag 情形轻松上万）。导览自测题第 5 题的答案就在这里：

```text
页面：10000 个元素，其中 3 个 span，div 若干、a 若干
规则 span       → 右端命中 3 个元素，验证结束 → ~3 次起算
规则 a div span → 先命中 3 个 span，每个向上最多验证 2 层祖先 → 十几次比较
（若左到右：从每个 div 出发枚举全部后代路径，量级完全不可控）
```

配套事实：**特异性与匹配成本无关**——`#a .b span` 不比 `span` 匹配得慢；慢的是「候选集大小」，由最右端决定。所以优化口径是「让最右端尽量窄」，而不是「少用层叠」。

什么时候右到左会吃亏？候选集被最右端撑大的场景：`* span`、`.a .b .c .d span` 打在「十万个 span」的页面上，右端候选就是十万——但注意这不是右到左策略的错，**任何**匹配策略都至少要触碰这十万个元素（每条规则命中判定都要落它们头上）。这时正解在源头：给大候选集加一层容器约束（`.list span`）或改用就近结构（`>` 直接子代减少祖先回溯），而不是幻想换个方向。

## 3. 级联算法：谁赢的完整顺序

同一条属性被多个声明命中时，css-cascade-5 的决胜顺序（从先到后，先决出的赢）：

```text
① Origin & Importance
② Context（阴影树等上下文）
③ Element-attached（style 属性）
④ @layer 层序（越后声明越赢）
⑤ Specificity（三元组比大小）
⑥ Order of appearance（后写的赢）
```

①里的 origin 顺序（升序，作者层可覆盖用户层、用户层覆盖 UA 层）：

| 层级 | 普通声明 | !important 声明 |
|---|---|---|
| UA（浏览器默认样式表） | 最弱 | **最强**（important 反转） |
| User（用户自定义样式） | 中 | 强 |
| Author（页面 CSS） | 最强 | 最弱 |

三个高频混淆各配一句：

- **`!important` 不是「最高优先级」**：它先切「层」再比层内——作者 `!important` 输给 UA `!important`（无障碍样式能压过页面的 important）。
- **transition/animation** 在级联之外另有一档（CSS Transitions 规范的 cascading level），比一切普通声明都高——「为什么我的 `!important` 打不过动画」的标准答案。
- **`@layer` 改变的是 ④ 的位置**：层序先于特异性判定，「低特异性层」也能稳定压住「高特异性无层规则」（上一册 §8 的伏笔在此兑现）。

### 3.2 一次级联裁决的完整走查

```css
@layer base, overrides;                      /* ④ 层序：overrides 在后 */

div p   { color: gray; }                     /* 特异性 (0,0,2)，无层 → 未分层区 */
div p   { color: blue !important; }          /* (0,0,2) + important，未分层 */
@layer overrides { p { color: green; } }     /* (0,0,1)，overrides 层 */
#intro p{ color: red; }                      /* (1,0,1)，未分层 */
```

页面：`<div><p id="intro">text</p></div>`（未加动画/inline style），color 裁决：

| 选手 | 层 | important | 特异性 | 胜负 |
|---|---|---|---|---|
| gray | 未分层 | 否 | (0,0,2) | 出局 |
| **blue** | 未分层 | **是** | (0,0,2) | **赢家**——作者 important 是作者层最高档 |
| green | overrides | 否 | (0,0,1) | 出局 |
| red | 未分层 | 否 | (1,0,1) | 出局（特异性最高但没 important） |

把 blue 的 important 去掉 → red 赢（未分层比层序优先于分层，特异性在未分层区内决胜）；再给 p 加 `style="color:cyan"` → cyan 赢（element-attached ③ 排在层与特异性之前）。**每一步裁决都是顺序表 §3 的机械执行**——记住顺序，任何「谁赢」题都能推。

## 4. 继承、初始值与四个「值」

CSS 属性的值在流水线上有四级加工，级联选出的只是第一级：

| 值 | 含义 | 例子（font-size / width） |
|---|---|---|
| Specified value | 级联赢家 + 补默认 | `1.2em` / `auto` |
| Computed value | 相对值解析（不依赖布局的部分） | `1.2em`→`19.2px`（示意）/ `auto` 仍为 auto |
| Used value | 布局参与后的最终值 | 同上 / `auto`→`377px`（示意） |
| Actual value | 设备取整等最后修正 | — |

ComputedStyle 里存的主要是 computed value——**这就是「em 相对父元素」能算但「width:auto 算不出像素」的原因**（后者要等布局，第八阶段 03 册）。继承规则按属性分类：

| 类别 | 例子 | 继承吗 | 非继承时的兜底 |
|---|---|---|---|
| 字体/文本类 | font、color、line-height、text-align | **继承** | — |
| 盒模型类 | width、margin、border、background | 不继承 | initial value（`width:auto`、`margin:0`） |

`inherit`/`initial`/`unset`/`revert` 四个关键字就是对这套机制的手动接管：

| 关键字 | 语义 | 典型用途 |
|---|---|---|
| `inherit` | 强制取父元素 computed value | 恢复被 UA 样式截断的继承链 |
| `initial` | 回到属性初始值 | 清掉意外继承（color 回黑） |
| `unset` | 可继承属性=inherit；不可继承=initial | 「一键归零」按钮样式重置 |
| `revert` | 回滚到**上一层 origin**（作者→用户→UA） | 撤销整个主题层的干扰 |

修主题变量冲突时的精确工具就是后两个——`revert` 的「跨 origin 回滚」是级联 origin 表（§3）的运行时接口。

### 4.5 常见属性的四级值对照

把抽象表落到具体属性上（值是示意，用来说明机制）：

| 属性 | specified | computed | used | 备注 |
|---|---|---|---|---|
| `font-size: 1.2em` | 1.2em | `19.2px`（父 16px） | 同 computed | em 在 computed 阶段解析——「能算但不算布局」 |
| `width: auto` | auto | auto | `377px`（示意） | used 要等布局；ComputedStyle 里仍是 auto |
| `line-height: normal` | normal | 数值化（按字体度量） | 同 computed | 与字体的 metrics 挂钩，跨字体不一致的根源 |
| `color: currentColor` | currentColor | 解析为自身 color 的值 | 同 computed | 自引用属性的展开点 |
| `margin-left: 10%` | 10% | 解析为**包含块宽度**的百分比（示意） | 同 computed | 百分比的参照物在 computed 阶段就确定了 |
| `width: 50%` | 50% | 50%（百分比保留） | 布局后像素 | 宽高类百分比参与布局，computed 不展开 |

这张表的口径统一成一句：**能不碰布局的解析都发生在 computed，碰布局的都推迟到 used**——判断「改这个值会不会强制布局」的第一把尺子。

## 5. 工程优化：规则分桶、祖先过滤器与样式共享

朴素实现是「每元素 × 每规则」，一万个元素 × 五千条规则 = 五千万次尝试——浏览器的真实做法是三件套：

**① 规则哈希分桶（RuleSet）**：解析期（上一册 §3 的最右选择器）就把全部规则按**最右简单选择器**分进哈希桶：

```text
id 桶：    #nav       → { #nav ... }
class 桶： .btn:hover  → { .btn:hover ... }
tag 桶：   a           → { a ... }
通用桶：   * / 无最右键的规则 → 少量，单独线性扫
```

匹配一个元素时只取它 id/class/tag 对应的桶——「试过的规则数」从全量缩到「与该元素键相关的少数几桶」。

**② 祖先过滤器（Bloom filter）**：规则若含祖先/前缀选择器（`div a span` 的 `div a` 部分），把这个规则「可能需要的祖先特征」装进一个按元素子树维护的 Bloom filter。元素匹配带前缀的规则前先问过滤器：「我上方存在过 class=x / 标签=y 吗？」——大概率「否」，直接跳过整条规则。假阳性存在（Bloom filter 性质），但**只多做无用验证、不会漏匹配**。

**③ ComputedStyle 共享（style sharing）**：兄弟/近邻元素若「同标签名、id 类状态一致、被规则命中情况一致、无独有样式依赖（如 nth-child 依赖）」，可复用同一份 ComputedStyle——列表页、表格行这类重复结构受益最大；用 Elements 面板选中两个列表项看 Computed 面板完全一致，就是共享生效的可见证据（实现细节各家不同，机制方向一致）。

| 优化 | 省掉什么 | 何时失效 |
|---|---|---|
| 分桶 | 全量规则尝试 | 最右键是通配/属性选择器 |
| 祖先过滤器 | 无效的祖先链验证 | 前缀全部命中（此时本就该验证） |
| 样式共享 | 重复子树的重算 | 元素带 nth-child/属性依赖等「独有上下文」 |

三件套的协作视角：**分桶砍「规则的量」，过滤器砍「祖先验证的量」，共享砍「元素的量」**——同一个「缩小候选集」思想在三个维度上的应用，与右到左匹配（§2）一脉相承。

## 6. getComputedStyle 与强制同步布局第一现场

`getComputedStyle(el)` 返回的**不是快照，是「按需现算」的视图**：

```js
const cs = getComputedStyle(el);
cs.color;        // 读这一下才触发计算（若该元素样式是脏的）
```

关键在于：**部分属性（width/offsetHeight 等布局相关值）要布局结果才能给出**——若此刻布局是脏的，读它就强制把 layout 立刻跑掉。这就是**强制同步布局（forced synchronous layout）**，Performance 面板里那个刺眼的紫色 `Layout` 块夹在 JS 中间的形态：

```js
// 经典反模式：读写交错 100 次
for (let i = 0; i < 100; i++) {
  el.style.width = box.offsetWidth + 1 + 'px';  // 读 → 强制 layout；写 → 布局变脏
  // 下一轮 offsetHeight 读 → 又强制 layout……100 次布局
}
// 正解：先全部读，再全部写
const w = box.offsetWidth;
for (let i = 0; i < 100; i++) el.style.width = w + i + 'px';
// 攒到帧尾，浏览器自动合并为一次布局（第八阶段 07 册的帧预算视角）
```

「第一现场」的含义：第八阶段的 layout thrashing 治理（[第八阶段 03 册](../08-第八阶段/03-布局-盒模型-格式化上下文与布局抖动.md)）根子全在这——**Style 计算与布局的失效边界**就画在「读了要布局的值」这一行上。本册先把现场认下来，治理手段在第八阶段展开。

### 6.5 「读什么会炸」清单：强制布局的触发面

不是所有 `getComputedStyle` 读取都强制布局——按属性分类记：

| 读取 | 触发强制布局？ | 原因 |
|---|---|---|
| `cs.color` / `cs.fontSize` 等纯样式值 | 否（最多触发 style 重算） | computed value 就够 |
| `cs.width`（auto 元素） | **是**（若布局脏） | 要 used value 必须布局 |
| `el.offsetWidth` / `offsetHeight` 系列 | **是** | 布局结果 |
| `el.getBoundingClientRect()` | **是** | 布局结果 |
| `el.clientWidth/scrollTop` 系 | **是** | 布局结果 |

纪律版本：**JS 里凡「读布局值的 API」都要假设它会强制布局**；与「写样式」交错出现就是 thrashing 的配方。

## 7. 失效与重算：为什么改一个类不全页重算

「样式变了→Recalculate Style」的粒度由**失效传播**决定，浏览器的标配机制是失效集合（invalidation sets / descendant invalidation）：

```text
规则 .a .b 改变（.a 被加上）时
  → 浏览器维护「class=.a 出现时应标记哪些后代失效」的倒排索引
  → 只把带 .b 特征的后代标记为「样式脏」，其余元素不动
```

| 改动 | 失效范围（典型） |
|---|---|
| 改叶子的 color | 该元素自己 |
| 加/删祖先类（影响后代选择器） | 按失效索引标记的部分后代 |
| 改样式表本身（追加规则） | 范围更大，可能整树 |

trace 观察：`Recalculate Style` 块的大小与「Change count / elements affected」直接对应——**全树重算与局部重算在 trace 上一眼可辨**，这是判断「样式改动代价」的第一指标。

## 8. 实验

1. **Recalculate Style 基线**：Performance 面板录一次普通加载，找到 `Recalculate Style` 块；看 summary 里的 elements affected 与 self time——这就是本册的全程可视化（面板用法详见[第十阶段 02 册](../10-第十阶段/02-DevTools深潜-Performance全轨道解剖.md)）。
2. **强制同步布局复现**：跑 §6 反模式 100 次循环，Performance 面板看「Layout 块被 JS 块夹心」的锯齿形态；改成先读后写，数 Layout 块次数对比（示意：100 → 1 量级）。
3. **级联裁决手推 + 验证**：把 §3.2 的五方竞争页面实际跑一遍，逐个注释掉一方用 Computed 面板核对赢家——先手推再看，顺序表才算真的会背。
4. **unset/revert 语义**：给可继承与不可继承属性分别设 unset，观察行为分叉；用 revert 演示「回滚到 UA 样式」。
5. **失效范围观察**：在万级元素列表页上，单独 toggle 一个叶子类 vs toggle 一个祖先类，对比两次 `Recalculate Style` 的 affected 数量——失效索引的可视化证据。
6. **「读什么会炸」清单验证**：对同一元素分别读 `cs.color` 与 `el.offsetHeight`（布局脏状态下），trace 里看后者强制出 Layout 块、前者没有。

## 9. 常见误区

1. **「特异性的数值大小决定一切」**：特异性只是级联第 ⑤ 步；origin/importance、layer、出现顺序都可能在其之前决出胜负——「为什么我的 !important 输了」的答案几乎总在 ①③④。
2. **「右到左匹配是因为从左到右算不出」**：两边都算得出；右到左赢在**候选集最小化**——绝大多数规则命中 0 元素，从最窄一端起步。
3. **「选择器写得短就是快」**：匹配成本由最右端候选集决定；`span` 在十万 span 的页面比 `#app .list span` 慢——「短=快」是把「特异性」误当成「成本」。
4. **「getComputedStyle 返回缓存快照」**：它是按需现算的视图，读到布局相关属性且布局脏时**当场强制布局**——循环里读它等于循环里摆 Layout。
5. **「ComputedStyle 里有像素级的 width」**：它存 computed value，`width:auto` 的像素值要等布局（used value）；在 JS 里要像素请读 `getBoundingClientRect`/offset 系，并接受其强制布局代价。
6. **「样式共享/优化是我要写的代码」**：三件套全是引擎内部机制；开发者能做的是不破坏它的前提——避免无谓的祖先选择器爆炸、别让重复结构长出「独有上下文」。
7. **「`!important` 用来盖过动画」**：动画/过渡在级联之外更高的档（§3）；盖动画要用 animation 自身的暂停/覆盖或改 keyframes，不是堆 important。

## 10. 常见问答

**Q：为什么有时候改样式不触发 Recalculate Style？**
值没变不等于没算——trace 里块不出现通常是「失效范围=0」（改动对任何元素无影响）或「依赖优化把等值写合并」；反之块大不大看 affected 数。用「改 → 看 affected」做「改动代价」体检是标准动作。

**Q：CSS 变量（custom properties）在哪一步解析？**
变量本身在 computed value 阶段解析继承（它也是属性、也走级联），但**使用它的属性**在「变量值就绪后」再取值——因此 `var()` 有运行时求值成分，主题切换改一个变量能波及大量元素，失效面大是它的固有代价，不是 bug。

**Q：inline style 的 style 属性优先级怎么放进顺序表？**
element-attached 档（§3 的 ③）：高于一切普通 author 声明（含未分层高特异性），低于 author `!important`。所以「`!important` 盖 inline style」成立，而「特异性再高的选择器也盖不过 style 属性」。

**Q：SVG 的 presentation attributes（`fill="red"` 这类写法）排在哪？**
作者 origin 里**特异性最低**的一档——低于任何选择器（连 `*` 都能盖过它），但高于 UA 默认。这是它和 inline style 的关键区别：后者在 element-attached 档几乎无敌，前者是作者层垫底。主题覆盖 SVG 颜色时因此格外好用。

**Q：`:hover` 这类状态切换的成本怎么估？**
它是一次「元素失效 + 局部重算」：影响面取决于带 `:hover` 的规则是否会牵连后代（`.card:hover .title` 会在 hover 时标记 title 失效）。列表页每行的 hover 规则若带后代选择器，鼠标扫过整列 = 一串局部重算——trace 里表现为鼠标轨迹上的密集小块。

**Q：`font-size` 改了为什么连 `margin` 都像变了？**
继承链 + em 依赖：margin 若用 em，随 font-size 联动；而 font-size 本身可继承——改一个祖先的 font-size 失效的是「整条子树的所有 em 相关属性」。这是「改动小、失效大」的典型：单位选择（em vs px）就是失效面选择，CSS 写下第一笔时失效代价已经定了。

## 11. 自测题

1. Style 计算的三步是什么？输入输出各是什么？trace 里的名字？
2. 右到左匹配的完整理由？「10000 元素只有 3 个 span」的两个选择器分别要验证多少条路径？
3. 写出级联决胜的六步顺序；作者 `!important` 与 UA `!important` 谁赢？
4. 手推 §3.2：去掉 blue 的 important 后谁赢？给 p 加 inline style 后谁赢？
5. transition/animation 在级联里的位置？由此解释「动画期间改不过样式」。
6. `@layer` 在级联顺序表的哪一步？它怎么让低特异性规则稳定压过高特异性？
7. 四个「值」各是什么？为什么 ComputedStyle 里的 width 可能仍是 auto？
8. `unset` 对可继承与不可继承属性的行为分叉？`revert` 与 `initial` 的本质区别？
9. 规则分桶的键是什么？祖先过滤器为什么「不会漏匹配」？
10. 样式共享的失效条件举三个；为什么 nth-child 会破坏共享？
11. 「读什么会炸」清单：哪些 API 会强制布局？纪律版本的那句话是什么？
12. 改叶子类与改祖先类，失效范围差在哪？靠什么机制做到「不全树重算」？
13. CSS 变量的失效代价为什么天然偏大？（提示：var() 的运行时求值面。）
14. SVG presentation attribute 排在级联的哪一档？它与 inline style 的档位差？
15. 「能不碰布局的解析都发生在 computed」——用 `margin-left:10%` 与 `width:50%` 各举一例。
16. em 单位为什么是「失效面选择」？改祖先 font-size 会失效什么？

## 12. 自查清单

| # | 检查 | 工具 | 异常指向 |
|---|---|---|---|
| 1 | 无「读写交错」的样式循环？ | 代码 review + Performance | 强制同步布局锯齿 |
| 2 | Recalculate Style 是局部重算？ | Performance 面板 affected 数 | 祖先类滥用触发大范围失效 |
| 3 | 关键裁决用 layer/origin 而非 specificity 军备竞赛？ | CSSOM/级联实验 | 特异性数字越堆越高 |
| 4 | 列表类重复结构没被 nth-child 打碎共享？ | Computed 面板对照 | 同构元素样式重算翻倍 |
| 5 | unset/revert/initial 用对场景？ | Computed 面板验证 | 主题变量回滚失控 |
| 6 | 需要像素值时知道在读 used value？ | trace 中 JS 内 Layout 块 | 隐性强制布局 |
| 7 | CSS 变量改动范围有意识收敛？ | Performance affected 数 | 主题切换全页重算 |
| 8 | 祖先 font-size 类改动有失效面预估？ | trace 的 affected 数 | em 链式失效波及全子树 |

## 13. 延伸

- 下一册：[06-V8执行模型-从源码到优化机器码](06-V8执行模型-从源码到优化机器码.md)——样式与 DOM 都备齐，该跑代码了：V8 的四层流水线、内联缓存与去优化。
- ComputedStyle 之后像素怎么画出来（渲染树、Layout、合成）是[第八阶段 01 导览](../08-第八阶段/01-导览.md)的全部内容；布局抖动的治理清单在[第八阶段 03 册](../08-第八阶段/03-布局-盒模型-格式化上下文与布局抖动.md)，渲染类案例复盘在[第十阶段 04 册](../10-第十阶段/04-案例复盘集-渲染类.md)。
