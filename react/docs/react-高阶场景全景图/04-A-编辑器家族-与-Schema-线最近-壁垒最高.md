---
title: "A. 编辑器家族（与 Schema 线最近，壁垒最高）"
---

## A. 编辑器家族（与 Schema 线最近，壁垒最高）

进入逐场景详解之前，先解释族标题里的两个判断。

**"与 Schema 线最近"**：前一份大纲《react-进阶大纲-复杂场景.md》的内核是"schema 树 + 注册表 + 递归渲染器 + Undo/Redo + 拖拽"。编辑器家族是把这套内核推到极限的场景群——富文本的文档树就是一棵 schema 树（节点有 type/attrs/children），ProseMirror 的 Transaction 就是"每笔修改可序列化"的命令通道，块编辑器的块拖拽就是进阶大纲 §1.6 拖拽原理的块级版本。你在低代码平台里做过的画布选中、Setter、撤销栈，在编辑器家族里以更严苛的形态重新出现。所以学 A 族不是开新坑，而是给 Schema 线"回炉淬火"。

**"壁垒最高"**：A 族要同时对抗三样东西——浏览器的原始行为（光标/输入法/撤销，浏览器给了你 `contentEditable` 但没给你控制权）、真正的算法（公式引擎的图算法、白板的计算几何）、以及无限的内容边界情况（粘贴、拖放、双击、折叠）。三样叠起来，市面上能从零做出生产级编辑器的团队屈指可数。也正因为壁垒高，A 族经验是前端领域公认的"越老越值钱"资产。

以下是 A1–A5 的逐场景详解。每个场景统一按六段展开：是什么（画像）→ 为什么难（难点本质）→ 核心技术逐项讲解 → 代表产品及其可学的点 → 入手路径与验收物 → 常见坑。

### A1. 富文本 / 块编辑器（★★★★★）——前端"皇冠明珠"

- **画像**：Notion/飞书文档式编辑器
- **核心技术**：contentEditable 的坑（光标管理、中文 IME、浏览器原生撤销污染）→ ProseMirror 四件套（Schema/State/Transaction/PluginView）→ TipTap 快速开发 → 块编辑器（块拖拽排序、嵌套、`/` 斜杠命令、块级菜单）
- **代表**：Notion、飞书文档、语雀
- **入手**：TipTap 官方 demo 改起 → **ProseMirror 官方 Interactive Guide 必读** → 做一个支持标题/列表/图片/斜杠命令/块拖拽的 mini Notion

#### A1.1 是什么：画像

富文本/块编辑器就是"Notion、飞书文档"里那个东西：用户敲字出字、回车分段、选中变粗，还能插入图片、表格、代码块，输入 `/` 弹出命令菜单，拖住块左侧的手柄给块排序。术语上区分两种形态：

- **富文本编辑器（inline 编辑）**：以"字符流 + 标记（mark）"为主，光标在字符间移动，如早期 Medium 编辑器、论坛发帖框。ProseMirror 是这一形态的学术级答案。
- **块编辑器（block 编辑）**：以"块"为最小操作单元，块可拖拽、可嵌套、可携带任意 props，如 Notion。块编辑器内部每个块又是一个小型富文本编辑器——它是"富文本内核 + 块级结构层"的两层建筑。

现代产品几乎都是后者，但后者建立在前者的地基上，所以学习顺序是先攻 A1 内核（contentEditable + ProseMirror），再上块层。

#### A1.2 为什么难：contentEditable 的三大坑

难点本质一句话：**`contentEditable` 让浏览器替你编辑 DOM，但浏览器编辑的是 DOM，而你的产品需要的是"模型"——两者之间的同步权、决定权全在你手里，而浏览器在每一个细节上跟你抢方向盘。**三大坑逐一拆解，每一坑都配症状、机理与对策。

**坑一：光标管理——DOM 选区与模型位置是两个世界**

是什么：光标（caret）与选区（selection）在浏览器里由 `Selection`/`Range` API 表达，它们描述的是 **DOM 节点与偏移**；而你的编辑器关心的是"模型位置"（第 3 个段落的第 5 个字符之后）。浏览器还允许光标落在你的模型里不存在的地方（两个表格单元格之间、块级元素的边界外），且各家对 Range 的归一化规则不一。

为什么需要重视：任何"光标相关的功能"——工具栏加粗、输入 `/` 弹菜单、显示协作者光标、恢复撤销后的光标——都需要"读写光标位置 + 在模型与 DOM 之间换算位置"。换算错一点，用户看到的就是光标乱跳、选区丢失。

典型的翻车现场：用户选中一段文字，点击工具栏的 B 按钮——按钮一获得焦点，编辑区失焦，**选区当场消失**，加粗操作找不到目标。

```ts
// 翻车复现：点按钮 → 编辑区失焦 → selection 被清空
// 对策一（最常用）：按钮按下时阻止它抢焦点，选区得以保留
function BoldButton({ onBold }: { onBold: () => void }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()} // 关键：阻止按钮获得焦点，编辑区不失焦
      onClick={onBold}
    >
      B
    </button>
  )
}

// 对策二：失焦前保存 Range，执行命令前恢复
let savedRange: Range | null = null
editorEl.addEventListener('selectionchange', () => {
  const sel = document.getSelection()
  if (sel && sel.rangeCount > 0 && editorEl.contains(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange() // 深拷贝，原 Range 会失效
  }
})
function restoreSelection() {
  if (!savedRange) return
  const sel = document.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(savedRange) // 恢复到上一次合法选区
}
```

还有一个高频跨浏览器差异：**由屏幕坐标反查光标位置**（拖拽插入、点击定位都要用）——Chrome/Safari 是非标准的 `caretRangeFromPoint`，Firefox/标准是 `caretPositionFromPoint`：

```ts
function caretFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(x, y) // Blink/WebKit
  }
  const pos = doc.caretPositionFromPoint?.(x, y) // Firefox / 标准
  if (!pos) return null
  const r = document.createRange()
  r.setStart(pos.offsetNode, pos.offset)
  return r
}
```

根本对策（也是 ProseMirror 的核心设计）：**不要让选区游离在模型之外**。把选区纳入文档状态（`state.selection`），DOM 选区只是它的投影；每次更新先用模型位置计算该显示什么，再单向地写到 DOM。这就是"单向数据流"思想在光标上的应用——A1.3 的四件套会看到它如何落地。

**坑二：中文 IME——composition 期间的竞态**

是什么：用拼音/注音输入法打字时，从敲下第一个字母到上屏，浏览器走一遍"组合输入"流程：`compositionstart` → 若干次 DOM 直接变更（预输入文字被浏览器直接插进 DOM）→ `compositionend`（上屏）。**组合期间，DOM 的变更不经过你、也不该被打断。**

为什么难：如果你的编辑器在组合期间做任何"以模型为准重建 DOM"的操作（例如 React 重渲染覆盖了编辑区、你的同步逻辑把预输入节点删了重建），输入法会话会被强制中止——用户正在敲的拼音词组直接丢失，候选框消失。中文用户一天撞几十次，属于"上线即被骂"级别的事故。

```ts
// 组合期守门：用一个标志位把"模型 → DOM"的同步挡在组合期外
let composing = false
editorEl.addEventListener('compositionstart', () => {
  composing = true // 拼音组合开始：浏览器将直接改 DOM
})
editorEl.addEventListener('compositionend', () => {
  composing = false // 组合结束：此刻才允许把 DOM 差异收编进模型
  scheduleSync()     // 统一补一次同步，模型追上 DOM 的最终状态
})

// 所有"要动 DOM"的路径都要先检查这个门
function syncFromModel() {
  if (composing) return // 组合期间：绝不重建 DOM，否则输入法会话被杀
  renderModelToDom()
}
```

机理补充：`compositionend` 的触发时机在各浏览器还有差异（上屏 vs 提交候选），且组合期间的撤销栈记录必须把整段拼音算作一步（半个词的撤销是灾难）。ProseMirror 在内部完成了这套守门（DOM 观察器在组合期挂起、组合结束统一解析变更），这也是"别裸写 contentEditable"最有说服力的理由之一。自研时最小要做到：组合期不碰 DOM、组合结束统一收编、撤销按整段记录。

**坑三：浏览器原生撤销——两本历史互相打架**

是什么：浏览器给 `contentEditable` 区域内置了一本撤销栈（Ctrl/Cmd+Z 走浏览器自己的 history），而你的编辑器必然还有一本自定义历史（模型级命令栈，见前一份大纲 §1.5 的 Undo/Redo 三种实现）。两本历史各自记录、互不知情。

为什么是灾难：用户按 Cmd+Z，浏览器撤销的是"上一次 DOM 变更"——可能是你的程序写 DOM（模型驱动），可能是用户手敲（你还没收编），于是 DOM 变了、模型不知道；再按一次，又轮到你的栈动模型、DOM 由你重绘，浏览器那本栈的锚点全废。表现是"撤销行为随机、光标乱跳、内容莫名消失"。

```ts
// 对策：拦截原生撤销入口，全部改道自定义历史
editorEl.addEventListener('beforeinput', (e) => {
  const inputType = (e as InputEvent).inputType
  if (inputType === 'historyUndo' || inputType === 'historyRedo') {
    e.preventDefault() // 拦下浏览器撤销栈
    inputType === 'historyUndo' ? myHistory.undo() : myHistory.redo() // 走自己的栈
  }
})
```

顺带说明：老一代编辑器靠 `document.execCommand('bold')` 这类 API 实现格式化——该 API 已废弃，行为各浏览器不一，现代方案全部改为"事务改模型 → 模型重绘 DOM"，`execCommand` 一行都不要写。而 `beforeinput` 的 `inputType`（`insertText` / `deleteContentBackward` / `historyUndo`…）是接管输入的正规入口，ProseMirror 内部正是基于它做输入拦截。

三坑合起来的结论：**contentEditable 只应该当作"输入事件的采集器 + 文字渲染的白板"，编辑权必须收回模型层。**这正是 ProseMirror 的立足点。

#### A1.3 核心技术一：ProseMirror 四件套（Schema / State / Transaction / PluginView）

ProseMirror 用四个概念回答"如何把编辑权收回模型层"：Schema 定义模型的合法形态，State 是不可变快照，Transaction 是修改的唯一通道，Plugin/PluginView 是扩展机制。四件逐个讲，然后给一份完整的讲解性代码把四件串起来。

**Schema——模型的"法律"**。是什么：一份声明式定义，规定文档里有哪些节点类型（paragraph、heading、image…）、每种节点的属性（attrs）、什么样的嵌套合法（content 表达式如 `"block+"`）、与 HTML 怎么互转（parseDOM/toDOM）。为什么需要：没有法律，粘贴进来的任意 HTML、用户光标的任意落点都会把文档树变成非法形态，后续所有功能（序列化、协同、校验）无从谈起。contentEditable 三坑的根治都从这里开始——非法位置在 Schema 层就进不了模型。

**State——不可变快照**。是什么：`EditorState` 持有当前文档 `doc`、选区 `selection`、以及各插件的状态，且**不可变**——任何修改都产生新的 State 而非原地修改。为什么需要：不可变性让"撤销"退化为"指回旧 State"，让协同编辑可以按事务粒度合并，让 React 渲染有可靠的相等性判断。这与你熟悉的 Redux 心智完全同构，可以把 EditorState 理解成"编辑器界的 store"。

**Transaction——修改的唯一通道**。是什么：一切变更（打字、加粗、粘贴、程序化修改）都被表达为一个 `Transaction`（tr），它记录若干 step（对文档树的最小操作）以及伴随的选区/滚动/元信息变更。`state.tr` 创建、链式追加操作、`view.dispatch(tr)` 提交。为什么需要：统一通道意味着撤销、协同、审计、时间旅行都能以事务为单位处理——B1 协同编辑（y-prosemirror）正是把 Transaction 翻译成 CRDT 操作。

**Plugin / PluginView——扩展机制**。是什么：插件是一个对象包，可以贡献四样东西——`props`（行为：快捷键、装饰、DOM 属性等）、`state`（随 State 流转的插件私有状态）、`view`（插件在视图层的"代理人"，带 `update/destroy` 生命周期，可以自由操作 DOM）、`key`（插件身份）。为什么需要：没有插件机制，任何功能都得改内核。Decoration（装饰）系统尤其关键——它允许"在不改文档模型的前提下"给视图加东西：占位符、拼写检查下划线、协同光标，全是 Decoration。

一份完整的讲解性代码，四件套全部登场（约 90 行，可直接放进任何 React 项目跑）：

```ts
// pm-core.ts —— ProseMirror 四件套讲解版
import { Schema, Node as PMNode } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'

// ────────────────────────────────────────────────
// ① Schema：模型的"法律"。哪些节点、什么嵌套、怎么和 HTML 互转
// ────────────────────────────────────────────────
export const schema = new Schema({
  nodes: {
    // content 表达式约束嵌套：根必须是 1 个以上块；段落内只能是行内内容
    doc:      { content: 'block+' },
    paragraph: {
      group: 'block', content: 'text*',
      parseDOM: [{ tag: 'p' }],                 // 粘贴 HTML 时：<p> → paragraph
      toDOM: () => ['p', 0],                    // 0 是"内容洞"：子内容渲染到这里
    },
    heading: {
      group: 'block', content: 'text*',
      attrs: { level: { default: 1 } },         // 属性带默认值，序列化时省体积
      parseDOM: [{ tag: 'h1', attrs: { level: 1 } },
                 { tag: 'h2', attrs: { level: 2 } }],
      toDOM: (node) => ['h' + node.attrs.level, 0],
    },
    text: { inline: true },                     // 文字节点：行内、无子节点
  },
})

// ────────────────────────────────────────────────
// ② State：不可变快照 = 文档 + 选区 + 插件状态
// ────────────────────────────────────────────────
// 用 Schema 的工厂函数手搓初始文档（生产中常改用 DOMParser.fromSchema(schema).parse(dom)）。
// 光标默认落在文档开头，无需手工构造 selection；需要时传 selection: TextSelection.atStart(doc)
export function createInitialState(): EditorState {
  const doc = schema.node('doc', null, [
    schema.node('heading', { level: 1 }, schema.text('第一个标题')),
    schema.node('paragraph', null, schema.text('下面的段落')),
  ])
  return EditorState.create({ schema, doc, plugins: [placeholderPlugin, wordCountPlugin] })
}

// ────────────────────────────────────────────────
// ③ Transaction：修改的唯一通道。注意每步都产生新 doc，state 本身不动
// ────────────────────────────────────────────────
export function demoTransaction(state: EditorState): EditorState {
  const tr = state.tr // 从当前 state 创建事务
  // 在当前光标处插入文本（tr 内部会同步移动选区到插入之后）
  tr.insertText('（追加）', tr.selection.from)
  // 把光标所在块改成二级标题：$from.before()/after() = 当前块的起止位置
  const { $from } = tr.selection
  tr.setBlockType($from.before(), $from.after(), schema.nodes.heading, { level: 2 })
  // 事务可以随时查"将生效的文档"——因为 steps 会在 tr.doc 上即时预演
  console.log('事务内预览：', tr.doc.textContent)
  tr.scrollIntoView() // 提交后让选区滚入可视区
  // 提交：产生全新 state（旧 state 保留，供撤销指回）
  return state.apply(tr)
}

// ────────────────────────────────────────────────
// ④ Plugin + PluginView：扩展机制（行为 + 状态 + 视图代理人）
// ────────────────────────────────────────────────
// 4a. 占位符插件：Decoration.widget——不改文档，只在视图上"贴"一个 DOM
const placeholderKey = new PluginKey<DecorationSet>('placeholder')
const placeholderPlugin = new Plugin<DecorationSet>({
  key: placeholderKey,
  state: {
    init: (_, state) => buildPlaceholder(state.doc),
    apply: (tr) => buildPlaceholder(tr.doc), // 每次 tr 后按新 doc 重算装饰
  },
  props: {
    // 视图询问"该显示哪些装饰"时，从插件状态里取
    decorations: (state) => placeholderKey.getState(state),
  },
})
function buildPlaceholder(doc: PMNode): DecorationSet {
  // 文档只有一个空段落时，往 pos 1（第一个块内部起点）挂一个提示词
  if (doc.childCount === 1 && doc.firstChild!.content.size === 0) {
    return DecorationSet.create(doc, [
      Decoration.widget(1, () => {
        const span = document.createElement('span')
        span.textContent = '输入 / 唤起命令…'
        span.style.color = '#94a3b8'
        return span
      }),
    ])
  }
  return DecorationSet.empty
}

// 4b. 字数统计插件：PluginView——带生命周期的视图代理，自由操作真实 DOM
const wordCountKey = new PluginKey<number>('wordCount')
const wordCountPlugin = new Plugin<number>({
  key: wordCountKey,
  state: {
    init: () => 0,
    // 只有 doc 变了才重算；tr.mapping 还能把历史位置映射到新位置（撤销时的关键能力）
    apply: (tr, value) => (tr.docChanged ? tr.doc.textContent.length : value),
  },
  view: (view) => {
    // mount 阶段：创建自己的 DOM，挂在编辑器旁边
    const badge = document.createElement('div')
    badge.textContent = '字数 0'
    view.dom.parentNode?.appendChild(badge)
    return {
      // 每次 state 更新后被调用：读插件状态，刷新自己的 DOM
      update: (v) => { badge.textContent = `字数 ${wordCountKey.getState(v.state)}` },
      // 卸载阶段：必须清理，否则泄漏（对应 React 的 cleanup 心智）
      destroy: () => badge.remove(),
    }
  },
})
```

```tsx
// pm-editor.tsx —— React 绑定：EditorView 的生命周期对齐 useEffect
import { useEffect, useRef } from 'react'
import { EditorView } from 'prosemirror-view'
import { createInitialState } from './pm-core'

export function PmEditor() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let view!: EditorView
    view = new EditorView(hostRef.current!, {
      state: createInitialState(),
      // 事务提交的 React 侧处理：新 state → 一次性更新视图
      // （PM 自己做 DOM diff，只改变化的部分，绝不整棵重建——IME 坑的根治处）
      dispatchTransaction(tr) {
        view.updateState(view.state.apply(tr))
      },
    })
    return () => view.destroy() // 卸载销毁；漏掉这行 = 监听器泄漏 + StrictMode 下双实例
  }, [])

  return (
    <div>
      <div ref={hostRef} className="pm-host" />
    </div>
  )
}
```

四件套协作的完整旅程（一次按键发生什么）——把上面的代码串成时间线：

1. 用户按 `B` 键，浏览器准备在 contentEditable DOM 插入文字；
2. ProseMirror 通过 `beforeinput` 等钩子**拦截**浏览器行为（不让它直接改 DOM）；
3. 把"插入 b"翻译成一个 **Transaction**（`tr.insertText('b')`），其中含合法性与 Schema 校验；
4. `Transaction` 应用到 **State**，得到新 State（旧 State 原地不动，成为撤销候选）；
5. `view.updateState(新 State)` 触发视图 diff：ProseMirror 比较新旧文档，只把变化的那一小段同步到 DOM，并按新 State 的 selection 投影 DOM 光标；
6. 各插件的 `view.update` 与 Decoration 重算被调用（占位符消失、字数 +1）。

对照三坑：第 2 步拦截 + 第 5 步"只 diff 不重建"根治 IME 竞态；selection 进 State（第 5 步单向投影）根治光标漂移；history 插件（prosemirror-history，基于 Transaction 的 steps + invert 机制）配合 `beforeinput` 拦截根治原生撤销。四件套不是四个孤立 API，而是一条把编辑权从浏览器手里收回模型的完整管线。

#### A1.4 核心技术二：TipTap——站在 ProseMirror 肩上的快速开发层

是什么：TipTap 是 ProseMirror 的无头（headless）封装——把"定义 Schema、组装插件、管理视图生命周期"这些过程式劳动，改造成"声明式的 extension 列表 + 链式命令 API"，并官方提供 React 绑定。为什么需要：直接写 ProseMirror 意味着手动处理大量样板（Schema、keymap、history、粘贴规则），TipTap 把 80% 的样板变成一行 `extensions: [StarterKit]`，同时保留逃生舱（`editor.commands`（PM command）、自定义 Node/Mark extension 可下探到原生 Plugin）。

```tsx
// tiptap-editor.tsx —— 10 分钟起步一个带工具栏的富文本
import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function TiptapDemo() {
  const titleRef = useRef<HTMLSpanElement>(null)
  const editor = useEditor({
    extensions: [StarterKit], // 段落/标题/加粗/列表/历史 全家桶
    content: '<h2>你好</h2><p>开始编辑…</p>',
    immediatelyRender: false, // SSR/首屏安全：避免服务端创建 EditorView
    onUpdate: ({ editor }) => {
      // 每次事务提交后触发；注意这里只做轻量副作用，别把内容塞回 state 再受控回灌
      titleRef.current!.textContent = editor.getText().slice(0, 20) || '无标题'
    },
  })

  if (!editor) return null
  return (
    <div>
      <span ref={titleRef}>无标题</span>
      <div className="toolbar">
        {/* onMouseDown preventDefault：A1.2 坑一的标准对策，保住选区 */}
        <button onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

选型建议：产品节奏快、需求是"常规富文本 + 少量定制"——TipTap 起步，遇到天花板再下探 ProseMirror 层；需求是"深度定制文档模型/极致性能"——直接 ProseMirror。两者不冲突，TipTap 的 extension 底层就是 ProseMirror 插件，学的知识完全平移。

#### A1.5 核心技术三：块编辑器——块层四件套（拖拽排序 / 嵌套 / 斜杠命令 / 块菜单）

块层建在富文本内核之上，数据模型通常是一棵块树：

```ts
// 块模型：每个块 = 身份 + 类型 + 属性 + 子块（与低代码的页面 schema 同构！）
type Block = {
  id: string
  type: 'paragraph' | 'heading' | 'todo' | 'image' | 'group'
  props: Record<string, unknown> // heading 的 level、todo 的 checked、image 的 src
  children?: Block[]             // 嵌套：todo 缩进、分组容器
}
```

- **块拖拽排序**：是什么——拖住块手柄，把块（及其子树）移动到另一位置。为什么难——拖拽要跨"块边界"计算落点（放到上面/下面/里面），且拖动中的原块要"半透明占位"。怎么做——用 dnd-kit（前一份大纲 §1.6 精讲过）的 sortable 模式：每个块 `useSortable({ id: block.id })`，落点计算 `over` 指示器区分"插入兄弟"与"成为子块"。最小验收：拖一个 todo 块到另一个 todo 块右侧出现"成为子块"的缩进指示。
- **嵌套**：是什么——块可含子块（列表缩进、页面分组）。实现要点是递归渲染 + 折叠状态（折叠是 UI 态，不写进内容模型）+ 嵌套深度限制（防止用户造出 50 层嵌套压垮布局）。注意拖拽换父时"不能把自己拖进自己的子孙"（树成环），与 A4 连线校验的环检测同源。
- **`/` 斜杠命令**：是什么——输入 `/` 弹出命令面板，选择后插入对应块。机制分步——(1) 监听编辑器更新，检查光标前的文本是否匹配 `/^\/(\w*)$/`；(2) 匹配则弹出浮动面板（位置 = 光标坐标，用 A1.2 的坐标反查或 PM 的 `view.coordsAtPos`）；(3) 面板内键盘上下选择、回车确认；(4) 确认后**先删除触发词再执行插入命令**。TipTap 的 `@tiptap/suggestion` 工具把 (1)(2)(3) 封装成通用 suggestion 机制（@提及、斜杠命令同源）。最小实现示意：

```ts
// 斜杠命令的判定核心（配合任何编辑器内核都一样）
function onEditorUpdate(getTextBeforeCursor: () => string, open: (q: string, close: () => void) => void) {
  const m = getTextBeforeCursor().match(/^\/(\w*)$/) // 光标前只有 /xxx 才触发
  if (m) open(m[1], () => {})                        // 打开面板，携带过滤词
  // 选中命令后：先 deleteRange 掉 "/xxx"，再执行对应插入命令
}
```

- **块级菜单**：是什么——hover 块时出现的手柄（通常六点图标），点开是"复制/删除/转为/拖拽"菜单。实现要点：手柄是**块外浮层**（不属于 contentEditable，避免光标进去），位置跟随块 DOM（`view.nodeDOM(pos)` 反查），点击手柄弹出菜单用 floating-ui 定位（G 族知识）。手柄 `onMouseDown` 一样要 `preventDefault` 保选区。

#### A1.6 代表产品及其可学的点

- **Notion**：块模型的教科书。可学：块的粒度设计（一切都是块，连页面也是块）、`/` 命令的交互分寸（何时弹出、Esc 语义）、块属性的存储形态（块表 + 内容表分离的数据库思路）。
- **飞书文档**：工业级协同富文本。可学：y-prosemirror 在大规模生产的使用方式、评论锚定（选区与评论的绑定如何随编辑保持位置）、富文本与表格/画板的混排边界。
- **语雀**：Markdown 双向编辑的代表。可学：富文本模型与 Markdown 的双向序列化（WYSIWYG ↔ 文本态互转不丢信息），这正是 A5"自研 DSL"的前置知识——编辑器内核 + 文本序列化 = 一门自定义语言。

#### A1.7 入手路径与验收物

按原大纲的路径展开（与引言的 4–6 周节奏对齐）：

1. **第一步（第 1 周前半）**：clone TipTap 官方 demo，加两个自己的扩展——一个自定义 Node（比如"高亮块"），一个斜杠命令（输入 `/hl` 插入高亮块）。目的：跑通"extension 机制 + suggestion 机制"两个关键面。
2. **第二步（第 1 周后半）**：通读 **ProseMirror 官方 Interactive Guide**（必读，原大纲加粗不是偶然）——它以交互方式讲四件套，比任何二手教程准确。边读边把上面 90 行讲解代码手动扩展：加一个 image 节点、一个 custom 选项。
3. **第三步（第 2–4 周）**：做 mini Notion。**验收物清单**：支持标题（1–3 级）/ 无序有序列表 / 图片（粘贴与上传）/ `/` 斜杠命令（至少 5 个命令）/ 块拖拽排序（含嵌套落点）。**完成定义（DoD）**：8 条手测用例全过——中文输入法连续输入不丢字、Cmd+Z 撤销五步后光标位置正确、粘贴外部 HTML 被清洗只保留合法节点、图片块删除可撤销、斜杠命令 Esc 可取消、块拖拽后 id 不变（引用不断）、10 万字符文档输入不卡（每键 < 16ms）、导出 JSON 可重新加载无损。
4. **第 5–6 周**：接进自己的低代码平台做"富文本物料"，或接 B1 做双人协同（进阶方向）。

#### A1.8 常见坑

- **受控思维反噬**：把编辑器内容放进 React state，每键 `setHTML` 再灌回编辑器——光标必然跳、IME 必然丢。对策：编辑器内容非受控，React 只通过 `onUpdate` 单向取值；需要外部改内容时走 `editor.commands.setContent()`，绝不直接改 prop 回灌。
- **StrictMode 双挂载**：开发环境 effect 执行两次，EditorView 创建两次。`useEffect` 的 cleanup 正确 `destroy()` 即可无害通过；反之会出现"两个编辑器叠加、输入错乱"。
- **SSR 直崩**：EditorView/TipTap 都依赖真实 DOM，服务端渲染需 `immediatelyRender: false`（TipTap）或动态 import。
- **粘贴即 XSS**：直接把粘贴的 HTML 插入文档，`<img onerror>` 一类 payload 直接进模型。对策：所有外来 HTML 先过 `DOMParser.fromSchema(schema).parseSlice`——Schema 之外的标签和属性在解析层被丢弃，白名单清洗是唯一正确姿势。
- **大文档全量序列化**：每键 `getHTML()` 存库 = O(全文档) 序列化，大文档必卡。对策：按事务粒度持久化（或 debounce 保存 + 保存时才序列化）。
- **移动端软键盘**：contentEditable 在移动端的工具栏行为、选区手柄各浏览器差异更大，测试矩阵要单列 iOS Safari。

### A2. 电子表格（★★★★★）

- **画像**：Excel/飞书表格，前端复杂度天花板之一
- **核心技术**：二维虚拟滚动（行列双 windowing）、单元格渲染选型（DOM vs Canvas 自绘）、**公式引擎**（单元格依赖图 + 拓扑排序 + 循环引用检测，可 study HyperFormula/Univer 源码）、选区/框选/填充柄/冻结行列、剪贴板与 Excel 互操作（TSV + HTML 双格式）、条件格式、协同（接 B 族）
- **入手**：先做"虚拟滚动 + 单元格编辑"的最小表格，再引入公式依赖图

#### A2.1 是什么：画像

电子表格就是"网页版 Excel"：10 万行 × 200 列的网格、双击编辑单元格、输入 `=A1+B1*2` 出计算结果、框选一片区域拖填充柄批量复制公式、冻结首行首列滚动时表头不动、与真 Excel 互相复制粘贴不丢格式。它是前端复杂度的天花板之一，因为它是唯一一个"同时"要求下列全部能力的场景：二维虚拟化、每格可编辑、内嵌一门公式语言、与桌面软件互操作。

#### A2.2 为什么难：难点本质

本质一句话：**表格是"每格都是一个微型编辑器 × 一格一门的公式语言 × 一整张图的依赖网络"的乘积。**拆开看四个相乘的因子：(1) 规模——百万格的渲染与滚动，逼你放弃 DOM 常规做法；(2) 交互密度——单击选中、双击编辑、拖框选、拉填充柄、右键菜单，一屏之内五套手势状态机；(3) 计算——公式之间互相引用，改一格要按正确顺序重算所有受影响的格子；(4) 互操作——Excel 的剪贴板里同时放着纯文本与富表格两种格式，接不住就是"粘贴全乱"。四个因子两两相乘，难度以平方增长——这就是 ★★★★★ 的由来。

#### A2.3 核心技术一：二维虚拟滚动（行列双 windowing）

是什么：只渲染"可视区 + overscan"内的行列，其余由两个占位尺寸撑出滚动条。为什么需要：10 万行 × 200 列 = 2000 万个潜在 DOM 节点，直接渲染浏览器直接死；即便每格只是一个 `div`，也只能承受几千个。怎么做（机制分步）：(1) 外层滚动容器监听 `scrollTop/scrollLeft`；(2) 由滚动量推算可视行列区间 `[row0, row1] × [col0, col1]`，前后各多算 OVERSCAN 行/列防露白；(3) 内层放一个"总尺寸"的占位块（`ROWS*ROW_H` 高、`COLS*COL_W` 宽）骗出原生滚动条；(4) 可视单元格绝对定位到 `top: row*ROW_H, left: col*COL_W`。

```tsx
// sheet.tsx —— 定宽定高的最小二维虚拟表格（自包含可跑）
import { useMemo, useState } from 'react'

const ROWS = 100_000, COLS = 500
const ROW_H = 28, COL_W = 100
const VIEW_W = 800, VIEW_H = 500
const OVERSCAN = 3 // 缓冲区：滚动瞬间不露白

// 26 进制列名：0→A, 25→Z, 26→AA（与 Excel 一致，公式引用要用）
function colName(c: number): string {
  let s = ''
  c += 1
  while (c > 0) { s = String.fromCharCode(65 + ((c - 1) % 26)) + s; c = Math.floor((c - 1) / 26) }
  return s
}

export function Sheet() {
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [editing, setEditing] = useState<{ row: number; col: number; draft: string } | null>(null)

  // ① 窗口计算：滚动量 → 可视行列区间。这是虚拟滚动的全部核心，5 行
  const win = useMemo(() => {
    const row0 = Math.max(0, Math.floor(scroll.top / ROW_H) - OVERSCAN)
    const col0 = Math.max(0, Math.floor(scroll.left / COL_W) - OVERSCAN)
    const row1 = Math.min(ROWS, Math.ceil((scroll.top + VIEW_H) / ROW_H) + OVERSCAN)
    const col1 = Math.min(COLS, Math.ceil((scroll.left + VIEW_W) / COL_W) + OVERSCAN)
    return { row0, col0, row1, col1 }
  }, [scroll])

  // ② 生成可视单元格坐标（渲染层只认这个数组，与数据存储解耦）
  const visible = useMemo(() => {
    const out: { row: number; col: number }[] = []
    for (let r = win.row0; r < win.row1; r++)
      for (let c = win.col0; c < win.col1; c++) out.push({ row: r, col: c })
    return out
  }, [win])

  return (
    <div
      style={{ width: VIEW_W, height: VIEW_H, overflow: 'auto', position: 'relative' }}
      onScroll={(e) =>
        setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })
      }
    >
      {/* ③ 占位块：撑出总尺寸，骗出滚动条 */}
      <div style={{ width: COLS * COL_W, height: ROWS * ROW_H, position: 'relative' }}>
        {visible.map(({ row, col }) => {
          const key = `${colName(col)}${row + 1}` // A1 风格的坐标名
          const isEditing = editing && editing.row === row && editing.col === col
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: row * ROW_H, left: col * COL_W, width: COL_W, height: ROW_H,
                borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                padding: '0 6px', lineHeight: `${ROW_H}px`, fontSize: 13,
              }}
              onDoubleClick={() => setEditing({ row, col, draft: '' })}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editing!.draft}
                  onChange={(e) => setEditing({ ...editing!, draft: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                  style={{ width: '100%', height: ROW_H - 4, border: '2px solid #3b82f6' }}
                />
              ) : (
                key // demo：先显示坐标名；接上公式引擎后这里显示计算值
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

进阶两步（此 demo 未含，是练习点）：**动高行**——行高不一时要"行高前缀和数组 + 二分查找"定位 `scrollTop` 对应行；**冻结行列**——把视口拆成左上（固定）/ 左侧冻结列 / 顶部冻结行 / 主滚动区四个区域，共享同一套窗口计算但各自渲染。

#### A2.4 核心技术二：单元格渲染选型（DOM vs Canvas 自绘）

是什么：把"画格子"这件事在 DOM 与 Canvas 之间做选择，或分层混用。为什么需要选择：两条路线各有天花板——DOM 路线交互免费（点击、选中、无障碍全送），但 5000+ 节点滚动就掉帧；Canvas 路线性能无上限（一帧画完几万格），但点击命中、文本编辑、IME 全要自己造。

选型决策表：

| 路线 | 承受规模 | 交互成本 | 适用 |
|---|---|---|---|
| DOM + 虚拟化 | 数千可视格内 | 极低（原生） | 中小表格、快速起步（上面 demo 就是） |
| Canvas 自绘 | 数万~数百万格 | 极高（全手工） | 大数据表、专业电子表格 |
| 混合分层 | 大 | 中 | 主网格 Canvas，编辑浮层/选区框用 DOM 定位覆盖 |

混合分层是成熟产品的主流（含飞书表格类产品）：网格线、文字、背景色全画在 Canvas；编辑中的那个单元格上面叠一个真 `<input>`（这样 IME、光标、选区全是浏览器原生，躲开 A1 全套坑）；选区框、填充柄也用 DOM 绝对定位覆盖层，拖拽手势好写。Canvas 侧唯一新增的功课是**文本排版手工化**：`ctx.fillText` 不会帮你截断溢出、不会做省略号、对齐基线，`measureText` 的结果是布局依据。

#### A2.5 核心技术三：公式引擎（依赖图 + 拓扑排序 + 循环引用检测）

这是 A2 的灵魂，也是原大纲加粗的部分。分四步讲：为什么需要图、怎么建图、怎么排序、怎么检测环。

**为什么需要依赖图**：改了 `A1`，所有引用 `A1` 的格子（直接和间接）都要重算。暴力做法是全表重算——100 万格每次按键全算一遍，不可行。正确做法：从公式里提取"我引用了谁"（前驱），建成一张**单元格依赖图**，改动时只沿图传播重算。

**为什么需要拓扑排序**：`C1 = B1 + 1`，`B1 = A1 * 2`——必须先算 B1 再算 C1。拓扑排序把所有受影响格子排成"被依赖者在前"的线性顺序，照单重算即可。算法用 Kahn（入度剥洋葱）：反复取出"入度为 0"（不再依赖未算完的格子）的节点计算，计算完成后给它的下游减入度。

**为什么需要环检测**：用户输入 `A1 = B1`、`B1 = A1`，两格互指，重算永远排不完。Kahn 算法天然带检测：如果剥完洋葱还有节点没被取出（入度始终 > 0），这些节点必在环上——把它们标为循环引用错误，其余照常计算，**一个环不能污染整张表**。

```ts
// formula.ts —— 教学版公式引擎：建图 + 拓扑排序 + 环检测 + 求值
// 说明：正则抽引用是教学简化；生产实现必须在完整 parser 的 AST 上收集引用，
// 否则字符串字面量 "A1" 会被误当引用。HyperFormula/Univer 即如此。
type Cell = { raw: string; value: number | string }
type Cells = Map<string, Cell> // key 形如 "A1"

const REF = /\$?([A-Z]{1,3})\$?(\d{1,7})/g // 命中 A1 / $B$2 / C$3

// ── 1. 建图：解析每个公式，收集它引用的前驱格子 ──
function buildGraph(cells: Cells): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>()
  for (const [key, cell] of cells) {
    const deps = new Set<string>()
    if (cell.raw.startsWith('=')) {
      for (const m of cell.raw.matchAll(REF)) {
        const dep = `${m[1]}${m[2]}` // 去掉 $ 绝对引用符号后归一化
        if (dep !== key) deps.add(dep) // 自引用（A1 里写 =A1）直接按环处理
      }
    }
    g.set(key, deps)
  }
  return g
}

// ── 2. Kahn 拓扑排序（含环检测）：返回 { 顺序, 环上节点 } ──
function topoSort(g: Map<string, Set<string>>) {
  const inDeg = new Map<string, number>()       // 节点剩余入度
  const successors = new Map<string, Set<string>>() // 前驱 → 后继（反向边，用于传播）
  for (const [k, deps] of g) {
    inDeg.set(k, deps.size)
    for (const d of deps) {
      if (!successors.has(d)) successors.set(d, new Set())
      successors.get(d)!.add(k)
    }
  }
  const queue = [...inDeg].filter(([, d]) => d === 0).map(([k]) => k)
  const order: string[] = []
  while (queue.length) {
    const k = queue.shift()!
    order.push(k)                                 // 入度归零：它依赖的都算完了
    for (const s of successors.get(k) ?? []) {
      const left = inDeg.get(s)! - 1
      inDeg.set(s, left)
      if (left === 0) queue.push(s)
    }
  }
  // 剥不完的就是环：还留着入度的节点必然互相等待
  const cyclic = [...inDeg.keys()].filter((k) => inDeg.get(k)! > 0)
  return { order, cyclic }
}

// ── 3. 求值：按拓扑序逐格计算（教学版用受限 eval；生产用 AST 解释器）──
function evalCell(key: string, cells: Cells) {
  const cell = cells.get(key)!
  if (!cell.raw.startsWith('=')) {
    cell.value = cell.raw === '' ? 0 : Number(cell.raw) || cell.raw
    return
  }
  const expr = cell.raw.slice(1).replace(REF, (_, c: string, r: string) => {
    const v = cells.get(`${c}${r}`)?.value // 引用替换为"已算好的"值
    return typeof v === 'number' ? String(v) : '0'
  })
  try {
    cell.value = Function(`"use strict";return (${expr})`)() // 教学专用，生产禁止
  } catch {
    cell.value = '#ERROR!'
  }
}

// ── 4. 重算入口：改任何格子后调用 ──
export function recompute(cells: Cells): string[] {
  const g = buildGraph(cells)
  const { order, cyclic } = topoSort(g)
  for (const k of cyclic) cells.get(k)!.value = '#CIRCULAR!' // 环上的格子标错，不阻塞他人
  for (const k of order) evalCell(k, cells)
  return cyclic
}

// 用法示例：
// const cells: Cells = new Map([
//   ['A1', { raw: '10', value: 0 }],
//   ['B1', { raw: '=A1*2', value: 0 }],
//   ['C1', { raw: '=B1+A1', value: 0 }],
// ])
// recompute(cells) → C1 = 30；若加入 ['D1',{raw:'=D1+1',...}]，D1 = #CIRCULAR!
```

这份 80 行代码就是 HyperFormula/Univer 的骨架。study 源码时带着四个问题去：(1) 它们的 parser 怎么产出 AST、引用如何在 AST 上收集（答案决定了字符串 `"A1"` 不会被误判）；(2) 引擎如何缓存"变更集"做增量重算（上面是全图重排，工程上要按脏集传播）；(3) 插入/删除行列时引用如何平移（`A1:A10` 在第 5 行前插入行后应变 `A1:A11`——range 变换是表格特有的一座山）；(4) 500+ 内置函数如何注册分发（HyperFormula 用注册表模式，与你的低代码物料注册同构）。

```bash
# 引入成熟引擎（而非自研生产版）：
npm install hyperformula
# 注意 license：GPLv3 开源 / 商业双轨，商用前读授权条款。Univer（Apache-2.0）是替代项。
```

#### A2.6 核心技术四：选区、框选、填充柄、冻结行列

- **选区模型**：是什么——用 `(anchor, focus)` 两个格子坐标表达选区（鼠标按下处为 anchor，拖到处为 focus），矩形 = 两点的 min/max 包络。为什么不用"矩形四值"——Shift+点击扩展选区、Shift+方向键扩格时，anchor 不动 focus 动，两点模型天然支持，四值模型要额外记"扩展方向"。选区是游离于单元格数据之外的交互状态（与 A1 的 selection 同理）。
- **框选手势状态机**：`idle → pressing(记录 anchor) → dragging(focus 跟随 mousemove) → selected(mouseup 定格)`；拖动中要处理"拖出可视区自动滚动"（定时器按边缘距离加速滚动）与"跨过冻结区"的坐标换算。
- **填充柄**：是什么——选区右下角的小方块，拖动它把内容/公式向拖动方向复制 N 格。难点在**相对引用平移**：`B2 = A1*2` 拖到 B3 时公式应变 `A2*2`（相对引用随位移平移），`$A$1`（绝对引用）不变、`$A1`（混合引用）列锁行不锁。实现：复制公式时对每个引用按 (Δrow, Δcol) 平移非锁定分量——这正是 R1C1 表示法（`R[-1]C[-1]`）存在的原因：R1C1 下相对引用在平移前后字面不变。
- **冻结行列**：视口拆四象限（冻结区行/列交叉、冻结行、冻结列、滚动主体），共享滚动状态但冻结区反向钉住。实现要点是三个容器同一套窗口计算参数，只差 `position: sticky` 或独立渲染分支。

#### A2.7 核心技术五：剪贴板与 Excel 互操作（TSV + HTML 双格式）

是什么：从网页表格复制，粘贴进 Excel 要有行列表格；从 Excel 复制，粘贴回网页要带格式。机制：Excel 复制时在剪贴板同时放下 `text/plain`（TSV：Tab 分列、换行分行）与 `text/html`（带样式的 `<table>`）两种格式；粘贴方按能力取用。网页侧实现双写：

```ts
// 复制：同一份数据写两种格式，接收方按能力取最优
export function copySelection(rows: string[][]) {
  const tsv = rows.map((r) => r.join('\t')).join('\n') // Excel 兜底能认的纯文本
  const html = `<table>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')}</table>`
  navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([tsv], { type: 'text/plain' }),
    }),
  ])
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))
}

// 粘贴：优先取 text/html（保格式），无则降级 text/plain 按 TSV 切分
export async function pasteFromClipboard(): Promise<string[][]> {
  const items = await navigator.clipboard.read()
  const item = items[0]
  if (item.types.includes('text/html')) {
    const blob = await item.getType('text/html')
    const doc = new DOMParser().parseFromString(await blob.text(), 'text/html')
    return [...doc.querySelectorAll('tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent ?? '')
    )
  }
  const text = await (await item.getType('text/plain')).text()
  return text.split('\n').map((line) => line.split('\t'))
}
```

条件格式（规则引擎：值 → 样式映射，随重算刷新）与协同（接 B1，Yjs 有官方表格示例）在此不展开，思路与前面章节同构。

#### A2.8 代表产品及其可学的点

- **Excel/飞书表格**：交互标杆。可学：手势状态机的完备性（框选与拖动的冲突消解、双击进入编辑的时机）、填充柄对用户心智的顺应。
- **HyperFormula（HANDSONTABLE 出品）**：公式引擎开源实现，500+ 函数。可学：上述四问——AST 引用收集、增量重算、range 平移、函数注册表。
- **Univer（dream-num 出品）**：TS 实现的全套表格/文档/幻灯。可学：sheet 的整体架构分层（内核/渲染/交互/UI 四层怎么切）、Canvas 与 DOM 混合渲染的工程化。

#### A2.9 入手路径与验收物

按原大纲："先做'虚拟滚动 + 单元格编辑'的最小表格，再引入公式依赖图"。

1. **第一步（第 1 周）**：跑通 A2.3 的二维虚拟滚动 demo，补上"单击选中单格 + Shift 扩展 + 双击编辑 + Enter 下移一格"。验收物：10 万行滚动帧率稳定、编辑回车后焦点自动落到下一格。
2. **第二步（第 2 周）**：实现 A2.5 公式引擎（建图/拓扑/环检测/求值四函数），接到表格：单元格显示计算值、`#CIRCULAR!` 红字。验收物：构造三层依赖链改源头，下游按序刷新；构造 A1↔B1 互引环，两格标错但表内其他公式照常。
3. **第三步（第 3–4 周）**：填充柄（相对引用平移）+ 冻结首行首列 + TSV/HTML 双格式剪贴板。验收物：网页表格与 Excel 互贴往返各一次格式不丢。
4. **第 5–6 周（进阶）**：把 DOM 渲染换成 Canvas 主网格 + DOM 编辑浮层，或接 HyperFormula 替换自研引擎并对比行为。

#### A2.10 常见坑

- **编辑态单元格被虚拟化卸载**：正在编辑的格子滚出 overscan 区，input 连同草稿一起被卸载。对策：编辑态强制纳入渲染窗口（窗口计算时合并 `editing` 坐标），或编辑浮层独立于虚拟层。
- **插入/删除行后公式错位**：第 5 行前删一行，`B10 = A10` 若不变平移就指错数据。对策：所有引用按位移平移、range 按区间收缩/扩张，引用转换必须有专门模块与完整测试表（这是公式引擎里测试量最大的部分）。
- **只写 `text/plain` 丢格式**：粘贴到 Excel 全挤一列。对策：双格式双写（A2.7）。
- **全图重排卡死**：每键全量建图+排序，千格以上明显卡。对策：缓存图结构、变更只从脏格子沿后继边传播（Kahn 只在结构变化时跑）。
- **单击/双击/框选手势打架**：单击触发选中、快速两次单击又该进入编辑，状态机不严谨会出现"双击变成框选起点"。对策：手势用单一状态机管理（press → click / dblclick / drag 三分支），别用三个独立事件监听各自为政。
- **行高前缀和漂移**：动高行的前缀和用浮点累加，几万行后误差累积导致滚动错位。对策：前缀和取整存储，或增量校正。

### A3. 画布 / 白板编辑器（★★★★☆）

- **画像**：Figma/Excalidraw/海报编辑器/流程图
- **核心技术**：渲染选型（SVG 交互易 vs Canvas 性能强 vs 分层混合）、**坐标变换**（世界坐标↔屏幕坐标、zoom/pan 矩阵）、命中检测（几何计算 + R-tree 空间索引）、框选/多选/对齐吸附（吸附线算法）、组合成组、命令栈 undo/redo、脏矩形与分层渲染、导出（PNG/SVG）
- **代表**：Figma、Excalidraw、ProcessOn、稿定设计
- **入手**：用原生 Canvas 或 react-konva 做一个支持画矩形/选中/拖动/缩放画布的白板

#### A3.1 是什么：画像

白板编辑器是"无限画布 + 图形对象"的编辑工具：画矩形/椭圆/箭头/文字，选中它们拖动、缩放、旋转，画布本身可以无限平移缩放，多选对齐吸附，编组解组，Ctrl+Z 撤销，最后导出 PNG/SVG。Figma（设计工具）、Excalidraw（手绘风白板）、ProcessOn（流程图）、稿定设计（海报编辑器）是四个形态变体，内核完全一致。

#### A3.2 为什么难：难点本质

本质一句话：**白板把"屏幕上的像素"与"文档里的图形"解耦成两个坐标系，你的每一行交互代码都在两个坐标系之间穿梭，任何一处忘了变换就是 bug。**加之图形数量上千后，"每次重绘全量重画"和"每次命中遍历全表"都不可行，必须引入脏矩形与空间索引。A3 的难是数学的难（矩阵、几何）+ 数据结构的难（R-tree）+ 渲染工程的难（分层），三块都不难在 API。

#### A3.3 核心技术一：渲染选型（SVG vs Canvas vs 分层混合）

| 方案 | 交互 | 性能 | 适用 |
|---|---|---|---|
| SVG | 事件/无障碍/选中样式原生免费，DOM 可调试 | 千级元素后 DOM 布局重 | 流程图、<1000 图形 |
| Canvas | 全手工（命中检测自造） | 数万~数十万图元 | 白板、海报、Figma 类 |
| 分层混合 | 各层各取所长 | 最优 | 成熟产品标配 |

分层混合的做法：多个叠放的 canvas 各司其职——底层静态网格（几乎不重绘）、中层图形内容（脏矩形局部重绘）、顶层交互反馈（选区框、吸附线、拖拽幽灵），交互时只重绘顶层，内容层不动。react-konva 是 Canvas 上的声明式封装（Stage/Layer/Rect 组件化，内置命中检测与 Transformer 变换手柄），起步用它可以把精力先集中在坐标变换；原生 Canvas 则一切自主，练习价值最大。

#### A3.4 核心技术二：坐标变换（世界坐标 ↔ 屏幕坐标，zoom/pan 矩阵）

**是什么**：图形的 x/y 存在"世界坐标系"（无限大、原点任意），屏幕只是这个世界经"缩放 + 平移"后的一个取景框。视口状态用三元组 `(scale, panX, panY)` 表达。

**为什么需要**：没有这层抽象，"放大后拖动图形""缩放画布后框选"全都算不对——事件给你的是屏幕像素，图形存的是世界坐标，两边必须换算。

**怎么做（机制与公式）**：

世界 → 屏幕（渲染时用，即 2D 仿射矩阵 `M = T(pan) · S(scale)` 的展开）：

```text
screenX = worldX · scale + panX
screenY = worldY · scale + panY

矩阵形式（canvas 的 setTransform(a,b,c,d,e,f) 即此矩阵）：
┌ screenX ┐   ┌ scale   0    panX ┐ ┌ worldX ┐
│ screenY │ = │  0    scale  panY │ │ worldY │
└   1    ┘   └   0      0     1  ┘ └   1   ┘
```
<!-- 保留原 ASCII 图:此处本质是数学公式与仿射矩阵排版,Mermaid 无等价图表类型(转图表会丢失公式的字符级排版与矩阵行列对应语义),故不做替换 -->

屏幕 → 世界（命中检测时用，即逆矩阵 `M⁻¹ = S(1/scale) · T(-pan)`）：

```text
worldX = (screenX − panX) / scale
worldY = (screenY − panY) / scale
```

**以鼠标为锚缩放**（最难也最常用的一条）：滚轮缩放时，鼠标指向的那个世界点在缩放前后必须钉在原地，否则图形"从手下跑掉"。设鼠标屏幕坐标 p、原视口 v、新缩放比 scale'：

```text
k = scale' / scale
panX' = p.x − (p.x − panX) · k
panY' = p.y − (p.y − panY) · k
```

```ts
// viewport.ts —— 视口三函数：全部坐标变换就这三个
export type Viewport = { scale: number; panX: number; panY: number }
export type Pt = { x: number; y: number }

export function worldToScreen(p: Pt, v: Viewport): Pt {
  return { x: p.x * v.scale + v.panX, y: p.y * v.scale + v.panY }
}
export function screenToWorld(p: Pt, v: Viewport): Pt {
  return { x: (p.x - v.panX) / v.scale, y: (p.y - v.panY) / v.scale }
}
// 滚轮缩放：保持锚点下的世界点不动
export function zoomAt(p: Pt, v: Viewport, nextScale: number): Viewport {
  const k = nextScale / v.scale
  return {
    scale: nextScale,
    panX: p.x - (p.x - v.panX) * k,
    panY: p.y - (p.y - v.panY) * k,
  }
}
```

渲染时利用 canvas 的矩阵能力，可以"设置一次变换、全程按世界坐标作画"（连 dpr 一并处理）：

```ts
// 渲染骨架：dpr 处理 + 视口矩阵，之后所有 drawXxx 都直接用世界坐标
function applyViewport(ctx: CanvasRenderingContext2D, v: Viewport) {
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)       // 先抵消高分屏缩放
  ctx.translate(v.panX, v.panY)                // 再平移
  ctx.scale(v.scale, v.scale)                  // 最后缩放
  // 等价于 setTransform(dpr*v.scale, 0, 0, dpr*v.scale, dpr*v.panX, dpr*v.panY)
}
```

#### A3.5 核心技术三：命中检测（几何计算 + R-tree 空间索引）

**是什么**：给定世界坐标点 p，找出它落在哪些图形上；给定期望误差（线宽容差），找出"点中了哪条线"。

**为什么需要**：Canvas 没有 DOM 事件，点击/悬停/框选全靠自算；几百个图形时暴力遍历尚可，上万个时每次 mousemove 全表检测必然掉帧。

**怎么做（几何判定，逐形状）**：

```text
矩形（轴对齐，世界坐标）：x ∈ [rx, rx+w] 且 y ∈ [ry, ry+h]
矩形（旋转 θ）：先把点逆旋转回图形局部系再按轴对齐判定
椭圆：((px−cx)/rx)² + ((py−cy)/ry)² ≤ 1
线段（含容差 tol）：点到线段距离 ≤ tol（见下方代码）
多边形：射线法（见下方代码）
```

```ts
// hit.ts —— 三种基础命中检测
export type Pt = { x: number; y: number }

// 图形的最小接口：外包盒 + 自命中 + 平移（拖动 / 命令栈都要用）
export interface Shape {
  id: string
  x: number; y: number; w: number; h: number // 外包盒（世界坐标）
  hit(p: Pt, tol: number): boolean           // 精确命中（各自形状自己判）
  translate(dx: number, dy: number): void    // 平移（命令的 do/undo 依赖它）
}

// 点到线段距离：先投影求最近点，再算欧氏距离（不能只算到直线的距离！）
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  // t 是投影参数，clamp 到 [0,1] 把"垂足"限制在线段内
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  const closest = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.hypot(p.x - closest.x, p.y - closest.y)
}

// 射线法判断点在多边形内：水平射线与多边形边界交点数为奇数则在内
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].y, yj = poly[j].y
    if ((yi > p.y) !== (yj > p.y) &&                       // 边跨越了射线高度
        p.x < ((poly[j].x - poly[i].x) * (p.y - yi)) / (yj - yi) + poly[i].x) {
      inside = !inside                                     // 交点计数翻转
    }
  }
  return inside
}

// 从后往前找命中（后绘制者在上，先命中）
export function hitTest(p: Pt, shapes: Shape[], tol: number): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapes[i].hit(p, tol)) return shapes[i]
  }
  return null
}
```

**R-tree 空间索引**：图形上万时，先外包盒（bounding box）粗筛再做精确几何判定。R-tree 把外包盒组织成分层区域，查询复杂度从 O(n) 降到近似 O(log n)：

```ts
// 空间索引：rbush（多数白板/地图项目的选择）
import RBush from 'rbush'

type ShapeBBox = { id: string; minX: number; minY: number; maxX: number; maxY: number } // rbush 约定四字段

// Shape 的外包盒 → rbush 记录（rbush 只认 minX/minY/maxX/maxY 四字段）
function toBBox(s: Shape): ShapeBBox {
  return { id: s.id, minX: s.x, minY: s.y, maxX: s.x + s.w, maxY: s.y + s.h }
}

const index = new RBush<ShapeBBox>()
// 初始/大变更：load 批量构建（比逐条 insert 快得多）
index.load(shapes.map(toBBox))
// 单图形移动：remove 旧 + insert 新（rbush 无原地更新）
function onShapeMoved(s: ShapeBBox) {
  index.remove(s)          // 按对象引用移除
  index.insert(updated(s)) // 插入新 bbox
}
// 命中查询：先取候选集（几个），再逐个精确几何判定
const candidates = index.search({ minX: x - 4, minY: y - 4, maxX: x + 4, maxY: y + 4 })
const hit = candidates.length ? preciseHitTest(worldPt, candidates) : null
// 框选查询：选区矩形与外包盒相交的全部图形
const inMarquee = index.search({ minX, minY, maxX, maxY })
```

#### A3.6 核心技术四：框选、多选、对齐吸附、成组

- **框选**：拖出虚线矩形（交互顶层画布），`index.search(矩形)` 相交即选中；按住 Shift 追加。吸附线算法：拖动中的图形实时与"其他图形的 6 条参考线"（左/中/右 x 值，上/中/下 y 值）比较，差值小于 ε（如 6/scale——注意容差要除以 scale，换算到世界坐标）就吸附并画出洋红色辅助线。
- **多选与对齐**：多选集合的公共外包盒做对齐/分布（左对齐 = 各图形 x 置为集合 minX）；每个对齐操作是一个命令（见下）。
- **组合成组**：组是"变换的容器"——子图形坐标存为相对父级的局部系，组自带平移/旋转/缩放矩阵，组变换作用时全部子图形跟随。这与 A3.4 的视口矩阵同构（局部系 → 父系 → 世界系的矩阵连乘），理解了视口变换，成组就是把它嵌套一层。

#### A3.7 核心技术五：命令栈 undo/redo、脏矩形与分层渲染、导出

**命令栈**（前一份大纲 §1.5 讲过三种实现，白板最适合"命令模式"——每个操作带 do/undo 逆操作）：

```ts
// history.ts —— 命令模式的最小实现：所有编辑操作先包成 Command 再执行
export interface Command {
  label: string
  do(): void
  undo(): void
}
export class History {
  private done: Command[] = []
  private undone: Command[] = []
  exec(cmd: Command) {
    cmd.do()
    this.done.push(cmd)   // 新操作清空重做栈（线性历史，不可分叉）
    this.undone = []
  }
  undo() { const c = this.done.pop(); c?.undo(); if (c) this.undone.push(c) }
  redo() { const c = this.undone.pop(); c?.do(); if (c) this.done.push(c) }
}

// 拖动一个矩形的命令：undo 就是移回原位
function makeMoveCmd(shape: Shape, dx: number, dy: number): Command {
  return {
    label: 'move',
    do: () => shape.translate(dx, dy),
    undo: () => shape.translate(-dx, -dy),
  }
}
```

**脏矩形与分层渲染**：图形改动只标记自己外包盒为脏，下一帧只 `clearRect` 脏区域并重绘与脏区相交的图形；交互反馈（选框、吸附线）放独立顶层画布，拖拽全程不碰内容层。两招叠加，千级图形的拖动帧率立稳。

**导出**：PNG——按内容外包盒尺寸（×2 抗糊）建离屏 canvas，设视口矩阵后复用同一套渲染函数重绘，`canvas.toBlob` 落盘；SVG——遍历图形树生成 `<svg>` 标记（或 `XMLSerializer` 序列化既有 SVG 层），注意字体内联（未内联的字体在别人机器上会退化为默认字体）。

#### A3.8 代表产品及其可学的点

- **Figma**：天花板。可学：渲染管线的取舍（C++/WASM 渲染 + WebGL）、多选/编组/约束系统的交互设计、协同光标与编辑器的结合（B1）。
- **Excalidraw**：开源白板最佳学习对象。可学：手绘风线条生成（rough.js）、元素模型与场景序列化、Canvas 分层实践、本地优先存储。
- **ProcessOn / 稿定设计**：垂类变体。可学：流程图的连线正交路由（A4 也会遇到）、海报编辑器的模板化（与低代码 schema 思想相通）。

#### A3.9 入手路径与验收物

第一步（原大纲）：用原生 Canvas 或 react-konva 做一个白板，验收物按能力递进：(1) 画矩形（工具栏切到矩形工具，拖拽画出）；(2) 选中拖动（点击命中已有矩形，拖动跟随，用 A3.5 的命中检测）；(3) 缩放画布（滚轮 zoomAt 锚点缩放 + 空格拖拽平移）；(4) 命令栈撤销（Ctrl+Z 撤销画矩形与拖动）。DoD：缩放 400% 后拖动图形不跳位（逆变换正确）、500 个矩形拖动 60fps、连续撤销 10 步画面与初态一致、导出 PNG 与视口所见一致。第 3–4 周再加：椭圆/箭头/文字、框选多选、对齐吸附、编组、R-tree 索引（构造 1 万图形对比有无索引的命中耗时）。

#### A3.10 常见坑

- **高分屏发糊**：canvas 的 `width/height`（物理像素）没乘 `devicePixelRatio`，只设了 CSS 尺寸。对策：`canvas.width = cssW * dpr` 并在矩阵里乘 dpr（A3.4 骨架已含）。
- **缩放后命中错位**：命中检测忘了先把鼠标坐标 `screenToWorld`，拿着屏幕坐标去比世界坐标。症状是"放大后点不中/点错"。
- **容差没除 scale**：线宽容差 4px 在 400% 缩放下应为世界系 1px，写死 4 世界单位后放大后"点线太灵敏"。
- **getBoundingClientRect 坐标混用**：canvas 有 border/padding 时 `clientX - rect.left` 不等于画布内坐标。对策：布局归零（canvas 不设 border）或在换算时统一减去偏移。
- **全量重绘**：每次 mousemove 重画所有图形，千级即卡。对策：脏矩形 + 分层（A3.7）。
- **导出 SVG 字体走样**：没内联字体文件。对策：导出前把用到的字体 base64 进 `<style>`，或提示用户导出 PNG。

### A4. 节点编排画布（★★★☆☆）

- **画像**：n8n/Dify 式工作流，AI 时代的当红场景
- **核心技术**：@xyflow/react（React Flow）：自定义节点/边、连线规则校验（类型约束）、自动布局（dagre/ELK）、小地图、缩放平移、**运行态可视化**（节点状态流转、流式高亮）、变量面板
- **入手**：做一个"输入→处理→输出"三节点工作流，带校验与运行态

#### A4.1 是什么：画像

节点编排画布就是 n8n、Dify、Coze 的工作流编辑页：画布上摆节点，节点带输入输出锚点（Handle），从锚点拉线连接成有向流程图，画布可缩放平移，配小地图，点"运行"后节点按执行顺序依次点亮。它是 A3 的几何内核 + React Flow 的工程化封装 + 业务语义（节点类型系统、连线校验、运行态）的三层产物。AI 时代它成了当红场景——每个 LLM 应用编排平台（Dify/Coze/LangFlow）的编辑器都是它。

#### A4.2 为什么难：难点本质

A4 本体只有 ★★★☆☆——React Flow 把 A3 的坐标变换、命中、框选、缩放全部封装掉了，你不再手写矩阵。它的难在两处业务侧：一是**约束系统**（什么节点能连什么节点：类型匹配、禁止自环、禁止成环、只能一进多出……连线规则的校验与提示），二是**运行态可视化**（Agent 运行时节点状态高频变化——排队/执行中/成功/失败 + 流式 token 数滚动——`setNodes` 风暴下的性能与正确性）。前者是图论小题，后者是 React 性能题（正是 React 相关度①层的原因）。

#### A4.3 核心技术一：React Flow（@xyflow/react）的节点 / 边 / 自动布局

**数据模型**：节点 `{ id, type, position, data }`、边 `{ id, source, target, sourceHandle?, targetHandle? }`。两个数组是受控状态——React Flow 不藏状态，一切增删改经你之手（`onNodesChange` 回调 + `applyNodeChanges` 应用）。

**自定义节点**：注册式渲染（与前一份大纲的物料注册表同构）——`nodeTypes = { step: StepNode }` 传给 ReactFlow，节点数据里 `type: 'step'` 就用你的组件渲染；`Handle` 组件声明锚点（type=target 是入锚、source 是出锚）。

**自动布局**：dagre 把"节点 + 边"的图按层级（rank）排布——从入度 0 的节点起分层，同层上下排、层间左右排，消减边交叉。ELK 是更强的替代（支持更多约束）。布局结果是"每个节点一个中心坐标"，要转成 React Flow 要的左上角坐标。

一份完整可跑的讲解性代码（自定义节点 + 校验连线 + dagre 布局 + 运行态点亮）：

```tsx
// workflow.tsx —— 三节点工作流：布局 + 校验 + 运行态
import { useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

// ── 1. 自定义节点：状态描边色 + 左入右出两个锚点 ──
type StepStatus = 'idle' | 'running' | 'done' | 'error'
function StepNode({ data }: NodeProps) {
  const { label, status } = data as { label: string; status: StepStatus }
  const border = { idle: '#94a3b8', running: '#f59e0b', done: '#22c55e', error: '#ef4444' }[status]
  return (
    <div style={{ border: `2px solid ${border}`, borderRadius: 8, padding: '8px 14px', background: '#fff', minWidth: 120 }}>
      <Handle type="target" position={Position.Left} />   {/* 入锚点：别的边连到这里 */}
      <div>{label}</div>
      <Handle type="source" position={Position.Right} />   {/* 出锚点：从这里拉出边 */}
    </div>
  )
}
const nodeTypes = { step: StepNode } // 必须模块级常量：组件内重建 = 每帧重挂载所有节点

// ── 2. dagre 自动布局：图 → 有序坐标 ──
function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 }) // 从左到右；层间距 80
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 60 })) // 需要估宽高
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const { x, y } = g.node(n.id) // dagre 给的是中心点
    return { ...n, position: { x: x - 80, y: y - 30 } } // 转左上角
  })
}

const initialNodes: Node[] = [
  { id: 'input', type: 'step', position: { x: 0, y: 0 }, data: { label: '输入', status: 'idle' } },
  { id: 'process', type: 'step', position: { x: 0, y: 0 }, data: { label: '处理', status: 'idle' } },
  { id: 'output', type: 'step', position: { x: 0, y: 0 }, data: { label: '输出', status: 'idle' } },
]
const initialEdges: Edge[] = [
  { id: 'e1', source: 'input', target: 'process' },
  { id: 'e2', source: 'process', target: 'output' },
]

export default function Workflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes(initialNodes, initialEdges))
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // ── 3. 连线校验：拦截非法连接（isValidConnection 拖拽时实时反馈）──
  const isValidConnection = useCallback((c: Connection) => {
    if (c.source === c.target) return false                       // 禁自环
    // 禁成环：沿 target 的下游走，若能回到 source 则拒绝（DFS）
    const downstream = (id: string, seen = new Set<string>()): boolean => {
      if (id === c.source) return true
      if (seen.has(id)) return false
      seen.add(id)
      return edges.filter((e) => e.source === id).some((e) => downstream(e.target, seen))
    }
    return !downstream(c.target)
  }, [edges])

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge(c, eds)) // 校验通过（isValidConnection 已挡）才到这里
  }, [setEdges])

  // ── 4. 运行态可视化：按拓扑顺序依次 running → done ──
  const run = () => {
    const order = ['input', 'process', 'output']
    const setStatus = (id: string, status: StepStatus) =>
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)))
    order.forEach((id, i) => {
      setTimeout(() => {
        setStatus(id, 'running')
        setTimeout(() => setStatus(id, 'done'), 600)
      }, i * 800)
    })
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <button onClick={run} style={{ marginBottom: 8 }}>运行</button>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} isValidConnection={isValidConnection}
        nodeTypes={nodeTypes} fitView
      >
        <Background /> <Controls /> <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

**其余要点**：小地图（MiniMap）与缩放平移（Controls + 触控板手势）开箱即用；**变量面板**是 Dify 式产品的标配侧栏——展示"上游节点输出变量可被下游引用"，本质是把图执行后的产物做成树形选择器，复用 G 族的树组件。

#### A4.4 代表产品及其可学的点

- **n8n**：开源工作流自动化标杆。可学：节点类型系统的设计（trigger 普通节点/action/ 子流程）、几百种节点插件的注册机制（与 D1 插件化相通）。
- **Dify / Coze**：LLM 编排平台。可学：节点运行态与调试面板（单节点输入输出检视）、变量引用面板、版本对比。它们的编辑器正是本场景的完整答案，且 F2 会在此基础上讲流式更新调度。

#### A4.5 入手路径与验收物

按原大纲："做一个'输入→处理→输出'三节点工作流，带校验与运行态"。上面代码即第一周目标。验收物：三节点两连线，拖拽从 process 拉到 input 时连线被拒（成环校验生效）、点击运行后三节点依次点亮 amber → green、刷新页面布局不乱（dagre 结果持久化）。DoD：连线校验覆盖自环/成环/重复边三例；运行态轮播不重绘未变化节点（React DevTools Profiler 验证）。第二周起扩展：自定义边（带标签/条件分支）、ELK 布局对比、变量面板、接入 F2 的流式输出。

#### A4.6 常见坑

- **nodeTypes 写在组件内**：每次渲染新对象字面量，React Flow 视为"新节点类型"警告 + 全节点重挂载。对策：模块级常量或 `useMemo`。
- **受控不彻底**：只传 `nodes` 不传 `onNodesChange`/`applyNodeChanges`，节点拖不动或位置回弹。React Flow 是受控模型，两条回调缺一不可。
- **高频 setNodes 全量 map**：流式运行态每秒几十次 `nodes.map(...)` 生成全新数组，几百节点时每次 diff 全树。对策：状态更新用 requestAnimationFrame 合帧（一秒最多 N 次落账）；节点组件 `memo` 只依赖 `data`。
- **布局与手动拖动打架**：每次数据变化都重跑 dagre，用户手动摆的位置被覆盖。对策：只在用户点"自动整理"或结构变化时布局，位置持久化后尊重手动位置。
- **dagre 大图变慢**：上千节点布局秒级。对策：换 ELK 的分层布局并异步跑（Web Worker），或只布局受影响的子图。
- **边重叠不可读**：无约束的自由连线在大图上糊成一团。对策：dagre 消减交叉 + `type: 'smoothstep'` 正交边 + 边 label。

### A5. 在线代码编辑器 / 自研 DSL（★★★★☆）

- **画像**：Monaco/CodeMirror 深度定制（前一份大纲只覆盖了 JSON 场景）
- **核心技术**：自定义语言（Monarch tokenizer / CodeMirror 的 Lezer 语法）：高亮/补全/错误提示；LSP 进浏览器（monaco-languageclient）；多文件 Tab + 虚拟文件系统；TS Worker 类型提示
- **代表**：CodeSandbox、StackBlitz、JSON Schema 编辑器（你的第 5 章）
- **入手**：为自己的低代码协议写一个 DSL（高亮 + 补全 + 校验），反哺第 5 章 JSON 编辑器

#### A5.1 是什么：画像

Monaco（VSCode 同源编辑器）与 CodeMirror 6 的深度定制：给自己的领域语言做语法高亮、智能补全、实时错误提示；多文件 Tab 与虚拟文件系统；浏览器里跑 TS 类型检查。前一份大纲第 5 章已经用 `@monaco-editor/react` 做过 JSON 场景（JSON 自带语言支持，几乎零定制）；本场景更进一步——**自定义语言**，即你的低代码协议有自己的语法（或 JSON 方言），要让它像一门正经语言那样被编辑：高亮、补全、报错。

#### A5.2 为什么难：难点本质

本质一句话：**编辑器的语言能力是分层的（着色 → 语法树 → 语言服务），难点在于分层选对——想在着色层解决语义问题、或反过来用语言服务做高亮，都会掉进性能与复杂度的坑。**三层各自是什么、该放什么，是本场景的全部认知框架；此外多文件状态（model 生命周期）与 Worker 调度是工程难点。

#### A5.3 核心技术一：语言能力三层架构（Monarch / Lezer / LSP）

先把三层摆清楚（这是"分层"考点本身）：

| 层 | 是什么 | 做什么 | 不做什么 |
|---|---|---|---|
| 着色层：Monarch（Monaco）/ Lezer highlight（CodeMirror） | 正则状态机 / 增量语法树的样式标注 | 高亮、括号配对着色 | 不懂语义 |
| 语法层：Lezer（CodeMirror 6 的增量 parser） | 手写增量 LR 解析器 | 语法树、折叠范围、结构化导航 | 不做跨文件 |
| 语义层：LSP（Language Server Protocol） | 独立进程的语言服务，JSON-RPC 通信 | 补全/悬停/跳转/诊断/重命名 | 不关心编辑器是谁 |

**为什么分层**：着色必须每键全量快（正则/增量树，微秒级），语义必须慢而准（类型系统，百毫秒级）——两种性能曲线只能分层。企图在 keypress 路径上跑类型检查，输入即卡死。

**Monarch**（Monaco 的声明式 tokenizer）：一组"状态 → 正则规则 → token 类型"的表。给低代码协议的 JSON 方言做高亮：

```ts
// monach-lang.ts —— Monarch：给低代码协议 JSON 方言的着色规则
import * as monaco from 'monaco-editor'

monaco.languages.register({ id: 'lowcode' })

monaco.languages.setMonarchTokensProvider('lowcode', {
  tokenizer: {
    root: [
      // 协议关键字段名（后跟冒号的字符串）单独着色，一眼看出结构字段
      [/"(component|props|children|events|bind|if|for)"(?=\s*:)/, 'type.identifier'],
      [/"(?:[^"\\]|\\.)*"/, 'string'],                 // 普通字符串（含转义）
      [/\b(?:true|false|null)\b/, 'keyword'],          // 字面量
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],  // 数字
      [/[{}[\]]/, '@brackets'],                        // 括号配对（编辑器内置行为联动）
      [/:/, 'delimiter'], [/,/, 'delimiter'],          // 分隔符
      [/[ \t\r\n]+/, 'white'],                         // 空白（必须吃掉，否则死循环）
    ],
  },
})
```

补全在同一层用 provider 注册（提供"输入 `"` 后建议哪些字段名"）：

```ts
// 低代码协议字段补全：位置感知——只在"键位"触发，值位给物料名
monaco.languages.registerCompletionItemProvider('lowcode', {
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
      startColumn: word.startColumn, endColumn: word.endColumn,
    }
    const suggestions: monaco.languages.CompletionItem[] = [
      {
        label: 'component', kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: '"component": "${1:input}"', // snippet 占位符，Tab 跳转
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: '物料类型', range,
      },
      {
        label: 'bind', kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: '"bind": "${1:state.field}"',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: '状态绑定表达式', range,
      },
    ]
    return { suggestions }
  },
})
```

**Lezer**（CodeMirror 6 的语法层）：与 Monarch 的根本差异——Lezer 产出**真正的增量语法树**（增量解析：只重析变化影响的区间，大文件编辑恒定开销），语法用 `.grammar` 文件声明式描述、构建期生成 parser：

```text
// lowcode.grammar —— Lezer 语法文件（构建期由 @lezer/generator 编译成 JS parser）
@top File { Block }

Block { "{" (Prop ("," Prop)*)? "}" }
Prop { Ident ":" Value }
Value { Number | String | Boolean | Block | Array }
Array { "[" (Value ("," Value)*)? "]" }

@tokens {
  Ident { @asciiLetter (@asciiLetter | @digit | "-")* }
  String { '"' (![\"\\] | '\\' _)* '"' }
  Number { @digit+ ("." @digit+)? }
  Boolean { "true" | "false" }
  space { @whitespace+ }
}

@skip { space }
```

```bash
# 构建期把 .grammar 编译为增量 parser（进 package.json 的构建脚本）
npx lezer-generator src/lowcode.grammar -o src/lowcode.grammar.js
```

```ts
// 语法树接入 CodeMirror：LRLanguage 包装 parser
import { LRLanguage } from '@codemirror/language'
import { parser } from './lowcode.grammar.js'

export const lowcodeLanguage = LRLanguage.define({
  parser,
  languageData: { commentTokens: { line: '//' } },
})
```

有了语法树，折叠范围、结构化选取、错误定位（parser 报出的错误区间）都顺理成章——这是 Monarch 正则给不了的能力。

**LSP 进浏览器**（monaco-languageclient）：是什么——VSCode 的语言服务协议（Language Server Protocol）原本是"编辑器进程 ↔ 语言服务器进程"的 JSON-RPC 协议；monaco-languageclient 把 Monaco 变成 LSP 客户端，语言服务器可以跑在服务端、经 WebSocket 桥接（配合 `vscode-ws-jsonrpc`），也有 WASM 形态跑在浏览器。为什么需要——一门语言的分析逻辑（解析/类型/诊断/补全）写一次，VSCode、Vim、Emacs、你的网页编辑器全都能用；自研 DSL 接 LSP 生态等于白拿整个工具链。协议核心消息形态（收到诊断长什么样）：

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/publishDiagnostics",
  "params": {
    "uri": "file:///page.lowcode",
    "diagnostics": [
      {
        "range": {
          "start": { "line": 2, "character": 4 },
          "end":   { "line": 2, "character": 11 }
        },
        "severity": 1,
        "message": "未知物料类型：Inputx（你是想找 input 吗？）"
      }
    ]
  }
}
```

生命周期一句话：客户端 `initialize`（交换能力）→ `didOpen`/`didChange` 增量同步文档 → 服务端 `publishDiagnostics` 主动推送错误 → 用户补全时客户端 `completion` 请求。对低代码 DSL，量力而行：高亮用 Monarch/Lezer（前端本地）、"未知物料/非法 props"校验可以直接在 Monaco marker API 上做（参考第 5 章 JSON Schema 校验的思路），语义复杂了再上 LSP。

#### A5.4 核心技术二：多文件 Tab + 虚拟文件系统 + TS Worker

**多文件 Tab**：Monaco 的一个"文档"是一个 model（`monaco.editor.createModel(value, language, uri)`），一个编辑器实例可随时 `editor.setModel(model)` 切换——Tab 切换的原理就是切 model，光标/撤销历史都挂在 model 上不丢。虚拟文件系统 = 一个 `Map<uri, model>`，加上树形文件面板；跨文件能力（TS import 解析、重命名）都靠"同 URI 空间里有别的 model"成立。

```ts
// tabs.ts —— 多文件管理：model 即文档，Tab 切换即 setModel
import * as monaco from 'monaco-editor'

const vfs = new Map<string, monaco.editor.ITextModel>()

export function openFile(uri: string, content: string, editor: monaco.editor.IStandaloneCodeEditor) {
  const existing = monaco.editor.getModel(monaco.Uri.parse(uri))
  const model =
    existing ??
    monaco.editor.createModel(content, 'lowcode', monaco.Uri.parse(uri)) // 同 URI 幂等
  vfs.set(uri, model)
  editor.setModel(model) // 切 Tab = 切 model，光标与撤销历史都在 model 上保留
}

export function closeFile(uri: string) {
  const model = vfs.get(uri)
  vfs.delete(uri)
  model?.dispose() // 必须释放：model 持有 undo 历史/ decorations，泄漏大户
}
```

**TS Worker 类型提示**：Monaco 内置 TS 语言服务 Worker，可给你的 DSL 的 JSON 配置提供类型检查——把协议类型声明注入环境：

```ts
// 把低代码协议的 TS 类型喂给 Monaco 的 TS 服务，编辑 .ts 配置文件时获得类型提示
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  `
  interface PageNode { component: 'input' | 'select' | 'grid'; props?: Record<string, unknown> }
  interface PageSchema { version: 1; children: PageNode[] }
  `,
  'file:///lowcode-schema.d.ts', // 三斜线引用或同根目录即可被解析
)
```

#### A5.5 代表产品及其可学的点

- **CodeSandbox**：在线 IDE 定义者。可学：虚拟文件系统与浏览器内构建（衔接 D4 的 sandpack）、多 Tab 状态管理。
- **StackBlitz**：WebContainer 路线（D4 详解）。可学：把 Node 搬进浏览器后编辑器与运行时的协作。
- **JSON Schema 编辑器（你的第 5 章）**：本场景的直接前作。可学/反哺：第 5 章的"JSON + Schema 校验 + 自定义 marker"是本场景的退化形式——本场景把"语言"从 JSON 换成你的 DSL，校验从 JSON Schema 换成 Lezer parser + LSP。

#### A5.6 入手路径与验收物

按原大纲："为自己的低代码协议写一个 DSL（高亮 + 补全 + 校验），反哺第 5 章 JSON 编辑器"。分三步：

1. **第一步（第 1 周）**：取第 5 章的 JSON 编辑器，注册 `lowcode` 语言的 Monarch 规则（A5.3 代码），让 component/bind 等协议字段着色。验收物：打开任一低代码页面 schema，结构字段一眼可辨。
2. **第二步（第 2 周）**：加补全（协议字段 + 物料名清单）与错误提示（未知 component 标红，用 `monaco.editor.setModelMarkers`）。验收物：打错物料名即时红线，悬停有提示文案。
3. **第三步（第 3–4 周）**：两选一——(a) CodeMirror 6 + Lezer 重做一遍（体会有语法树的编辑器差别，折叠/结构导航）；(b) 接 LSP：用简单的 WS 服务端把校验逻辑挪到"语言服务器"，经 monaco-languageclient 供诊断。验收物（DoD）：三个文件 Tab 切换不丢撤销历史；关闭 Tab 后 memory 里 model 数量归零（DevTools 验证）；10000 行 DSL 编辑着色无可感延迟。

#### A5.7 常见坑

- **Monaco 体积爆炸**：直接 import 把几 MB 打进主包。对策：`@monaco-editor/react` 默认 CDN 懒加载（loader），或手动 dynamic import + MonacoEnvironment 配置。
- **Worker 配置缺失**：报错 "You must define a function MonacoEnvironment.getWorker"——TS/JSON 语言服务在 Worker 里跑，打包器需要专门配置（monaco-editor-webpack-plugin 或手写 getWorker）。这是 Monaco 接入的第一坑。
- **model 不 dispose**：每次打开文件都 createModel，同一 URI 会直接抛错（URI 必须唯一）；关闭 Tab 不 dispose 则 undo 历史与装饰常驻内存。对策：VFS 统一管理（A5.4 的 openFile/closeFile 模式）。
- **Monarch 忘写空白规则**：`[/[ \t\r\n]+/, 'white']` 漏掉后 tokenizer 在同一位置无法前进，编辑器假死或高亮错乱。
- **正则回溯灾难**：复杂贪婪正则（如嵌套字符串匹配）在长行上指数回溯，输入卡顿。着色规则要宁拆勿贪。
- **补全不填 range**：suggestion 缺 range 时插入位置错乱（插到行首）。每个 suggestion 都带 `model.getWordUntilPosition` 算出的 range。
- **CodeMirror 6 心智不适应**：它把语言/主题/快捷键全做成 extension 组合，没有"配置对象"心智。入门先读官方 example 迷你集，别按 Monaco 经验硬套。

---

以上 A1–A5 覆盖了编辑器家族全部五个场景。回到族标题的两个判断收束：**与 Schema 线最近**——A1 的文档树与 Transaction、A4 的节点注册、A5 的协议 DSL，处处是前一份大纲内核的进阶形态；**壁垒最高**——每个场景都要求你下探到浏览器输入管线（A1）、图算法（A2）、计算几何（A3）、图可视化工程（A4）、编译器分层（A5）其中至少一层。族内建议顺序 A4（最易，先赢一局）→ A1（内核，投入最重）→ 按方向选 A2/A3/A5。B 族及以后的场景在后续章节展开，其中 B1 协同编辑是 A1/A2/A3 完成后的天然下一步。

### 补充一：音视频时间轴编辑器——把"时间"搬上轨道（★★★☆☆）

A1–A5 是本族在"23 个场景"里的正编。编辑器家族还有几个高频"近亲场景"，工程上迟早会撞上：音视频时间轴、批注与评论锚定、大纲/思维导图编辑器。它们各自挂靠已有的深挖章节（B3 的云剪辑管线、A1 的富文本内核、14-6 的协同结构化建模），本节起补三个，给的都是"入门路线 + 关键机制"，不复述已展开的内容。

**画像**：剪映 Web 版、Descript、播客剪辑工具的"下半屏"——多条轨道横向铺开，片段（clip）排布其上，播放头（playhead）随预览视频移动；拖片段、拉左右边缘裁剪、S 分割、边缘互相吸附、Ctrl+滚轮缩放时间轴。同构场景：动效工具的关键帧面板（theatre.js / AE）、甘特式排期表、直播导播台——凡是把"时间"映射成横轴的一维画布，机制完全同源。B3 讲过"云剪辑"的编解码半边（WebCodecs 管线），本节补的是交互半边：**时间轴本身就是一个小型编辑器，模型、坐标变换、命令栈一样不少**。

#### 为什么难：三个与 A1–A5 不同的难点

1. **媒体时钟与帧时钟的竞态**。播放头必须严格等于 `video.currentTime`。用自己的累加器推播放头（"每帧 += dt"）必然漂移：暂停、seek、倍速、卡帧（视频解码跟不上时 currentTime 会原地停顿）每一种都会让自算时钟与真实媒体状态脱节。唯一正确做法：**媒体时钟是唯一权威，rAF 只是采样器**。
2. **一维坐标 + 可变缩放**。时间↔像素的换算是 A3.4 视口变换的一维版本，但多了一个"刻度尺"：缩放 600 倍（全片概览 → 逐帧细看）时，刻度线粒度必须自适应（1 帧 / 1 秒 / 30 秒 / 5 分钟），否则要么挤成一团黑线要么满屏空白。
3. **同一块区域三种手势**。片段本体是"拖动"、左右 8px 热区是"裁剪"、顶部刻度尺是"scrub（拖动定位播放头）"。手势判定错了，用户想裁剪却把片段拖走了。这要求一个明确的手势状态机，而不是三个各自为政的事件监听（与 A2.10 手势打架坑同源）。

#### 关键机制一：数据模型——三组时间解耦

一个片段携带三个时间量，混淆它们是新手第一坑：

```ts
// timeline-model.ts —— 时间轴数据模型：srcIn / start / duration 三元组
export type TrackKind = 'video' | 'audio' | 'subtitle'

export interface Clip {
  id: string
  trackId: string
  srcIn: number    // 素材内起点：本片段从"素材文件"的第几秒开始取用
  start: number    // 时间轴起点：本片段摆在"成片时间线"的第几秒
  duration: number // 时长：三个量里唯一的"尺寸"，srcIn + duration ≤ 素材总时长
  label: string
}

export interface Track {
  id: string
  kind: TrackKind
  clips: Clip[]
}
```

为什么要解耦：**裁剪（trim）改变的是"取用窗口"，拖动（drag）改变的是"摆放位置"，两者完全正交**。左缘裁入 2 秒 = `srcIn += 2, start += 2, duration -= 2`（窗口右移、时长缩短、时间轴位置跟着挪，看起来"左边缘不动、内容被吃掉"）；拖动只改 `start`。若模型里只存"素材起点 + 结束点"，裁剪和拖动的语义就会搅在一起，撤销栈也理不清。增删片段走命令栈（A3.7 的 `History` 直接复用，每个操作带 do/undo）。

#### 关键机制二：播放头同步——媒体时钟是唯一权威

```ts
// 播放头同步的三条纪律：
// 1) 只读 video.currentTime，绝不自累加时间；
// 2) 每帧直写 DOM（style.transform），不 setState——60fps 的 React 渲染纯属浪费；
// 3) scrub（拖刻度尺）= 写 video.currentTime，播放头、预览画面、时间码自动全部跟随。
```

进阶一档可以用 `video.requestVideoFrameCallback`（按"解码出的帧"回调，比 rAF 更贴合画面，且天然在暂停/seek 时不触发），但 rAF 轮询是最普适的兜底，教学版用它即可。

#### 最小可行实现：带拖动 / 裁剪 / 吸附 / 缩放 / scrub 的多轨时间轴

```tsx
// MiniTimeline.tsx —— 自包含可跑；onChange 抛出不可变新数组，接 A3.7 命令栈即可获得撤销
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, RefObject } from 'react'

const TRACK_H = 52
const RULER_H = 24
const EDGE_PX = 8   // 裁剪热区宽度
const SNAP_PX = 8   // 吸附判定半径（像素）
const MIN_DUR = 0.2 // 片段最小时长（秒）
const ZOOM_MIN = 6, ZOOM_MAX = 600 // pxPerSec 上下限：全片概览 ~ 逐帧

const timeToPx = (t: number, s: number) => t * s
const pxToTime = (x: number, s: number) => x / s
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function fmt(t: number): string {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'drag'; clipId: string; grabOffset: number } // 拖动：记录"按下点距片段头"的时间差
  | { kind: 'trim-in'; clipId: string }
  | { kind: 'trim-out'; clipId: string }

export function MiniTimeline({
  tracks, duration, videoRef, onChange,
}: {
  tracks: Track[]
  duration: number
  videoRef: RefObject<HTMLVideoElement | null>
  onChange: (next: Track[]) => void
}) {
  const [pxPerSec, setPxPerSec] = useState(40)
  const [gesture, setGesture] = useState<Gesture>({ kind: 'none' })
  const scrollRef = useRef<HTMLDivElement>(null)
  const laneRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const timecodeRef = useRef<HTMLSpanElement>(null)
  const scrubbingRef = useRef(false)

  // ── 播放头：rAF 采样媒体时钟，直写 DOM ──
  useEffect(() => {
    let raf = 0
    let lastLabel = 0
    const tick = () => {
      const video = videoRef.current
      if (video && playheadRef.current) {
        playheadRef.current.style.transform =
          `translateX(${timeToPx(video.currentTime, pxPerSec)}px)`
        if (performance.now() - lastLabel > 250) { // 时间码 4 次/秒，足够人眼阅读
          lastLabel = performance.now()
          if (timecodeRef.current) timecodeRef.current.textContent = fmt(video.currentTime)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoRef, pxPerSec])

  // ── 缩放：Ctrl+滚轮（触控板捏合手势在浏览器里就表现为 ctrl+wheel），以鼠标为锚 ──
  // 注意必须用原生监听：React 17+ 的 onWheel 是被动监听，preventDefault 无效（见文末坑 1）
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // 普通滚轮交给原生横向滚动
      e.preventDefault()
      const next = clamp(pxPerSec * (e.deltaY < 0 ? 1.15 : 1 / 1.15), ZOOM_MIN, ZOOM_MAX)
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left                          // 鼠标在视口内的位置
      const anchorTime = pxToTime(el.scrollLeft + cursorX, pxPerSec) // 鼠标当前指向的时间点
      el.scrollLeft = timeToPx(anchorTime, next) - cursorX           // 锚点钉在原地（A3.4 zoomAt 的一维版）
      setPxPerSec(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pxPerSec])

  const laneX = (e: { clientX: number }) =>
    e.clientX - laneRef.current!.getBoundingClientRect().left

  // ── 吸附：候选点 = 其他片段的起止边缘 ∪ {0, 播放头}；容差以"像素"定义再换算回时间 ──
  const snap = (time: number, excludeId: string): number => {
    const pts = [0]
    const video = videoRef.current
    if (video) pts.push(video.currentTime)
    for (const t of tracks)
      for (const c of t.clips)
        if (c.id !== excludeId) pts.push(c.start, c.start + c.duration)
    let best = time
    let dist = SNAP_PX / pxPerSec
    for (const p of pts) {
      const d = Math.abs(p - time)
      if (d < dist) { best = p; dist = d }
    }
    return best
  }

  // ── 手势入口：pointer capture 保证拖出片段/拖出窗口事件不断流 ──
  const onClipDown = (e: RPointerEvent<HTMLDivElement>, c: Clip) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const x = laneX(e)
    const local = x - timeToPx(c.start, pxPerSec) // 按下点在片段内的横向偏移
    const w = timeToPx(c.duration, pxPerSec)
    if (local < EDGE_PX) setGesture({ kind: 'trim-in', clipId: c.id })
    else if (local > w - EDGE_PX) setGesture({ kind: 'trim-out', clipId: c.id })
    else setGesture({ kind: 'drag', clipId: c.id, grabOffset: pxToTime(x, pxPerSec) - c.start })
  }

  const onClipMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture
    if (g.kind === 'none') return
    const t = pxToTime(laneX(e), pxPerSec)
    const mapClip = (c: Clip): Clip => {
      if (c.id !== g.clipId) return c
      if (g.kind === 'drag') {
        return { ...c, start: Math.max(0, snap(t - g.grabOffset, c.id)) }
      }
      if (g.kind === 'trim-in') { // 裁入：窗口起点右移，时长等量缩短
        const shift = clamp(snap(t, c.id) - c.start, 0, c.duration - MIN_DUR)
        return { ...c, start: c.start + shift, srcIn: c.srcIn + shift, duration: c.duration - shift }
      }
      const end = Math.max(c.start + MIN_DUR, snap(t, c.id)) // 裁出：只改时长
      return { ...c, duration: end - c.start }
    }
    onChange(tracks.map((tr) => ({ ...tr, clips: tr.clips.map(mapClip) })))
  }

  // ── 刻度尺 scrub：写媒体时钟，播放头/预览/时间码一起跟随 ──
  const scrubTo = (e: RPointerEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clamp(pxToTime(laneX(e), pxPerSec), 0, v.duration || 0)
  }

  const width = timeToPx(duration, pxPerSec) + 200

  return (
    <div ref={scrollRef} style={{ width: 720, height: 300, overflowX: 'auto', overflowY: 'hidden' }}>
      <div ref={laneRef} style={{ position: 'relative', width, height: RULER_H + tracks.length * TRACK_H, touchAction: 'none' }}>
        {/* 刻度尺：按下/拖动 = scrub */}
        <div
          style={{ position: 'absolute', top: 0, left: 0, width, height: RULER_H, cursor: 'ew-resize', borderBottom: '1px solid #cbd5e1', fontSize: 10, color: '#64748b' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrubbingRef.current = true; scrubTo(e) }}
          onPointerMove={(e) => { if (scrubbingRef.current) scrubTo(e) }}
          onPointerUp={() => { scrubbingRef.current = false }}
        >
          <span ref={timecodeRef} style={{ position: 'sticky', left: 4 }}>00:00.00</span>
        </div>
        {/* 轨道与片段 */}
        {tracks.map((track, ti) => (
          <div key={track.id} style={{ position: 'absolute', top: RULER_H + ti * TRACK_H, left: 0, width, height: TRACK_H, borderTop: '1px dashed #e2e8f0' }}>
            {track.clips.map((c) => (
              <div
                key={c.id}
                onPointerDown={(e) => onClipDown(e, c)}
                onPointerMove={onClipMove}
                onPointerUp={() => setGesture({ kind: 'none' })}
                onPointerCancel={() => setGesture({ kind: 'none' })}
                style={{
                  position: 'absolute',
                  left: timeToPx(c.start, pxPerSec),
                  width: Math.max(timeToPx(c.duration, pxPerSec), 2),
                  top: 4, height: TRACK_H - 12, borderRadius: 6,
                  background: track.kind === 'video' ? '#3b82f6' : track.kind === 'audio' ? '#10b981' : '#f59e0b',
                  color: '#fff', fontSize: 11, lineHeight: `${TRACK_H - 12}px`, paddingLeft: 6,
                  overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'grab',
                  userSelect: 'none', // 拖拽期间不让浏览器进入文本选择状态
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        ))}
        {/* 播放头：只由 rAF 直写 transform，从不进入 React 状态 */}
        <div ref={playheadRef} style={{ position: 'absolute', top: 0, left: 0, width: 1, height: '100%', background: '#ef4444', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}
```

大约 190 行拿到"可拖、可裁、可吸附、可缩放、播放头联动"的最小时间轴。骨架上继续长肉的方向：**波形渲染**（`decodeAudioData` 解码音频 → 峰值数组按像素列缓存 → 时间轴上逐列画竖线，缩放时按新粒度重算）；**虚拟化**（万级片段只渲染可视区，复用 A2.3 的窗口计算）；**专业编辑语义**（ripple——删除后右侧整体前移补洞；roll——相邻两片段共享一个切点，拖它等于同时裁 A 的出点和 B 的入点）。

#### 选型与学习路径

生态现实：**没有成熟的"React 时间轴组件库"**。remotion 是"用 React 写视频渲染"（渲染侧而非剪辑侧），theatre.js 是动效时间轴（心智同源，可借它的交互设计），opentimelinejs 对接影视工业的 OTIO 交换格式（认知即可）。所以本场景默认路线是自研，这恰是它作为练习的价值：

1. **第 1 周**：跑通上面的 MiniTimeline，接上真实 `<video>`（随便一个 mp4），验收：scrub 时画面与播放头同步、Ctrl+滚轮缩放不跳锚、拖动有吸附。
2. **第 2 周**：接 A3.7 命令栈获得撤销；加 S 分割（按播放头位置一刀两断：`duration = t - start` 生成新片段 `start: t, srcIn: srcIn + (t - start), duration: 原尾`）；加波形。
3. **第 3–4 周**：多轨虚拟化 + ripple/roll 语义；进阶接 B3 的 WebCodecs 预览（时间轴负责"什么时候放什么"，预览器负责"这一帧怎么合成"）。

#### 常见坑

- **React 的 onWheel 里 preventDefault 无效**：症状——Ctrl+滚轮缩放时页面整体滚动/缩放，控制台报 "Unable to preventDefault inside passive event listener"。原因——React 17 起把 wheel/touch 类事件注册为被动监听。修法——用 `useEffect` + `el.addEventListener('wheel', fn, { passive: false })` 原生注册（上面代码即如此）。
- **播放头自累加时间**：症状——暂停后播放头还在走、seek 后播放头与画面脱节。原因——用自己的 `dt` 累加代替媒体时钟。修法——只读 `video.currentTime`。
- **吸附容差写死成秒**：症状——缩放到很密时"磁力"过强、很远时吸不上。原因——容差应该以"像素"定义再除以 `pxPerSec` 换算（与 A3.10 容差除 scale 同源）。
- **裁剪出非法片段**：症状——`duration ≤ 0` 或 `srcIn + duration` 超出素材长度，播放/导出崩溃。修法——裁入/裁出都 clamp 到 `MIN_DUR` 与素材边界（上面代码的 `clamp(..., 0, c.duration - MIN_DUR)`）。
- **播放头走 setState**：症状——时间轴一开，React DevTools 里每秒 60 次提交，输入卡顿。修法——ref 直写 transform；时间码这类文本降到 4 次/秒。
- **拖拽触发浏览器原生行为**：症状——拖片段时变成文本选择或触发 dragimage。修法——容器 `touchAction: 'none'`（声明不交给浏览器滚动手势）、片段 `userSelect: 'none'`、`onPointerDown` 里 `preventDefault`。

### 补充二：批注与评论锚定——挂在"会动的内容"上的对话（★★★☆☆）

**画像**：飞书/Google Docs 里选中一段字 → 加评论 → 正文出现黄色高亮 + 侧栏出现评论卡；此后无论谁继续编辑文档（在被评文字前插入十行、删掉周围段落），高亮都要"跟着内容走"；被评文字整段被删时，评论不能消失也不能错位，而是变成"原文已删除"。变体：PDF 划词批注、白板图形批注、表格区域批注、审批流里的"签批意见"（同意/驳回 + 定位到具体段落）。A1.6 讲飞书可学点时点过"评论锚定"这个名，本节把它展开成可实现的机制。

#### 为什么难：锚定的对象会动，而评论是静态数据

评论是持久化数据（要进数据库、要发通知），它引用的是"文档某处"。但文档是活的：本地编辑、协同远端编辑、撤销重做，都会让"第 120 个字符"这种引用失效。难的根源一句话：**评论系统是"文档的旁挂数据"，主数据每变一次，旁挂数据的引用就得跟着迁移一次**。三个具体困难：

1. **位置引用的脆弱性**：存绝对偏移（from=120），别人在开头插一个字就全错位；存 DOM 路径（XPath），换一次渲染结构就全丢；
2. **渲染的借位**：高亮不属于文档内容（进文档就会污染协同流与导出），必须借 A1.3 的 Decoration 机制"贴"在视图上；
3. **失效要有明确语义**：被评区间被删空，`from === to`，这时评论是什么状态、侧栏怎么显示、恢复了内容要不要"复活"，都要定义成状态机而不是 undefined 行为。

#### 关键机制一：三种锚点模型，按内容形态选

| 内容形态 | 锚点模型 | 存什么 | 失效判定 |
|---|---|---|---|
| 富文本流 | 文本区间锚 | 相对位置（协同）或可平移区间（单机） | 解析后 `from >= to` |
| 结构化文档（块/节点/表格区域） | 语义锚 | 块 id / `(sheetId, range)` | 目标块被删除（id 查无） |
| PDF / 白板 / 图片 | 几何锚 | `(页码, 归一化矩形)` 或 `图形 id + 相对偏移` | 页不存在 / 图形被删 |

语义锚最稳（块 id 是身份不是位置），几何锚在缩放旋转下要用归一化坐标（除以页面宽高），文本区间锚最难、也最常见——下面以它为主。

#### 关键机制二：ProseMirror 的 mapping——位置随编辑自动平移

单机场景下，ProseMirror 的每个 `Transaction` 自带 `tr.mapping`（A1.3 讲过"tr.mapping 能把历史位置映射到新位置"），这正是锚定要的能力。一份自包含的评论锚定插件：

```ts
// commentAnchor.ts —— 锚点存插件状态：创建（meta 命令）→ 平移（mapping）→ 高亮（Decoration）
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node as PMNode } from 'prosemirror-model'

export interface CommentAnchor {
  id: string
  from: number
  to: number
  dead: boolean // true = 被评文本已删空：侧栏显示"原文已删除"，评论保留可展开
}

interface AnchorState {
  anchors: CommentAnchor[]
  decos: DecorationSet
}

export const commentKey = new PluginKey<AnchorState>('comment-anchors')

function highlight(doc: PMNode, anchors: CommentAnchor[]): DecorationSet {
  const items = anchors
    .filter((a) => !a.dead && a.to > a.from)
    .map((a) => Decoration.inline(a.from, a.to, {
      class: 'comment-hl',            // 黄色背景由 CSS 提供，不进文档模型
      'data-comment-id': a.id,        // 侧栏互跳的事件委托靠它
    }))
  return DecorationSet.create(doc, items)
}

export const commentPlugin = new Plugin<AnchorState>({
  key: commentKey,
  state: {
    init: (): AnchorState => ({ anchors: [], decos: DecorationSet.empty }),
    apply(tr: Transaction, prev: AnchorState): AnchorState {
      // ① 命令通道：从选区创建锚点（setMeta 走 A1.3 的"修改经 Transaction"原则）
      const added = tr.getMeta(commentKey) as CommentAnchor | undefined
      let anchors = added ? [...prev.anchors, added] : prev.anchors

      // ② 核心：锚点随任何编辑平移——本地打字、粘贴、撤销、协同远端修改都是 Transaction
      anchors = anchors.map((a) => {
        if (a.dead) return a
        // assoc 参数：from 取 -1（贴左）、to 取 +1（贴右）——
        // 恰好在锚点边界上的插入不会把锚点撑开
        const from = tr.mapping.map(a.from, -1)
        const to = tr.mapping.map(a.to, 1)
        return { ...a, from, to, dead: from >= to }
      })
      return { anchors, decos: highlight(tr.doc, anchors) }
    },
  },
  props: {
    decorations: (state) => commentKey.getState(state)?.decos,
  },
})

/** 从当前选区创建评论锚点（返回 tr 交给 view.dispatch） */
export function addCommentFromSelection(state: EditorState, id: string): Transaction | null {
  const { from, to, empty } = state.selection
  if (empty) return null // 没有选区就没有可锚定的区间
  return state.tr.setMeta(commentKey, { id, from, to } satisfies CommentAnchor)
}

/** 侧栏 → 正文：滚到锚点并高亮选中 */
export function revealAnchor(state: EditorState, anchor: CommentAnchor): Transaction {
  const target = anchor.dead
    ? TextSelection.create(state.doc, Math.min(anchor.from, state.doc.content.size))
    : TextSelection.create(state.doc, anchor.from, anchor.to)
  return state.tr.setSelection(target).scrollIntoView()
}
```

要点回顾：锚点活在**插件状态**里随 State 流转（A1.3 不可变快照思想的直接受益者——撤销一个 Transaction，mapping 自动把锚点退回原位）；高亮走 **Decoration**（不改文档模型，导出/协同零污染）；`dead` 是一等状态而非异常。

#### 关键机制三：协同场景用 Yjs 相对位置

接上 B1 协同后，"位置"不能再是绝对偏移——两端的编辑历史不同，各自的 `from` 语义不一致。Yjs 给了现成的答案：**相对位置（RelativePosition）把锚点绑在"邻居字符"上而非数组偏移上**，解析时自动落到原字符旁边（17-6 路线 9 讲并发插入不丢字用的就是同一机制）：

```ts
// comment-anchor-yjs.ts —— 协同版锚定：存库用相对位置，渲染时解析回区间
import * as Y from 'yjs'

export interface CollabAnchor {
  id: string
  relFrom: Y.RelativePosition // 序列化用 Y.encodeRelativePositionToJSON / ...FromJSON
  relTo: Y.RelativePosition
}

export function createAnchor(ydoc: Y.Doc, id: string, from: number, to: number): CollabAnchor {
  const ytext = ydoc.getText('body')
  return {
    id,
    relFrom: Y.createRelativePositionFromTypeIndex(ytext, from), // 锚在 from 处的"字符身份"上
    relTo: Y.createRelativePositionFromTypeIndex(ytext, to),
  }
}

export function resolveAnchor(ydoc: Y.Doc, a: CollabAnchor): { from: number; to: number; dead: boolean } {
  const absFrom = Y.createAbsolutePositionFromRelativePosition(a.relFrom, ydoc)
  const absTo = Y.createAbsolutePositionFromRelativePosition(a.relTo, ydoc)
  if (!absFrom || !absTo) return { from: 0, to: 0, dead: true } // 锚定的字符已不存在
  const from = Math.min(absFrom.index, absTo.index)
  const to = Math.max(absFrom.index, absTo.index)
  return { from, to, dead: from >= to }
}
```

评论本体（作者/内容/回复/时间）存独立的 `Y.Map` 或后端接口，**绝不塞进文档树**——它是旁挂数据，不是内容。这份模型与 14-6 选修一的"结构化建模"原则一致。

双向定位（点击侧栏卡 → `revealAnchor` 滚动选中；点击正文高亮 → 打开侧栏对应卡并高亮卡片）用事件委托最省：

```ts
// 正文高亮 → 侧栏：DOM 事件委托（Decoration 渲染出的 span 带 data-comment-id）
editor.view.dom.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-comment-id]')
  if (el) setActiveCommentId(el.getAttribute('data-comment-id')) // 驱动侧栏滚动/高亮
})
```

签批（审批）场景是语义锚的直接应用：意见锚定到块 id（不是字符区间），附带状态机 `草稿 → 审批中 → 通过/驳回`，驳回时可跳转到对应块。前端只负责锚定与呈现，流转逻辑在服务端。

#### 选型与学习路径

1. **第 1 周**：在 A1/17-6 完成的 TipTap 编辑器上加 `commentPlugin`（TipTap 下可包成 extension，`addProseMirrorPlugins` 返回上面的插件），做最小闭环：选中 → 评论 → 高亮 → 编辑前文 → 验证高亮跟随 → 删空 → 变 dead。验收物：侧栏卡片与正文高亮互跳，撤销创建评论的输入后高亮消失。
2. **第 2 周**：接 B1 协同改造为相对位置版（上面的 `createAnchor/resolveAnchor`），三端同时编辑验证锚点不漂移。
3. **第 3–4 周**：重叠评论的染色（多个评论交叠时用底部色条 + 边框区分，别叠加半透明背景——三层叠完就是黑色）、评论回复线程、resolved 折叠态。对标产品：Google Docs（锚定体验天花板）、Liveblocks 的 Comments 模块（B1 服务端选型里提过，看它把评论做成了产品化模块）。

#### 常见坑

- **锚点存 XPath / CSS 选择器**：症状——换一次主题/包一层容器全部评论失联。原因——DOM 结构是渲染的实现细节，不是身份。修法——锚模型三选一（区间/语义/几何），绝不引用 DOM。
- **高亮做成 mark 写进文档**：症状——导出的文档带着"评论高亮"，协同端收到"别人在给内容染色"的假编辑，评论删除后高亮残留。修法——Decoration（本节插件已是），mark 只用于用户真正施加的格式。
- **失效当异常处理**：症状——删掉被评文字，侧栏对应卡直接消失或抛错。修法——`dead` 是正常状态：显示"原文已删除"，若 undo 恢复文字，mapping 会让它自动复活。
- **重叠评论叠加半透明背景**：症状——两三条评论交叠处文字不可读。修法——背景色只取一层，其余评论用下划线/边框/色点区分，hover 切换激活。
- **每次 transaction 全量重建 DecorationSet**：症状——评论多 + 文档长时输入卡顿（与 17-6 性能坑同型）。修法——`decos = prev.decos.map(tr.mapping, tr.doc)` 增量平移，只有 anchors 集合变化时才重建。
- **协同端各存各的绝对 from**：症状——A 端看着在第三段、B 端跳到第五段。修法——相对位置（本节机制三），绝对位置只在渲染瞬间解析。

### 补充三：思维导图 / 大纲编辑器——树形内容的双投影（★★★☆☆）

**画像**：Workflowy、幕布、flomo 式大纲工具——一列无限缩进的条目，纯键盘流（Enter 新建、Tab 缩进、Shift+Tab 升级、上下移动、折叠）；一键切成思维导图视图（XMind/幕布的"导图模式"），同一份数据以树形布局铺开，仍可编辑。它与 17-6 的"文档内嵌套列表"是两回事：那边嵌套列表是富文本文档里的一种节点（归 ProseMirror 管），这边**整个应用就是一棵大纲树**，数据层与视图层都是围绕树专门设计的。

#### 为什么难

1. **键盘即结构**：大纲编辑器 90% 的修改来自五个结构操作（缩进/升级/分裂/合并/移动），每个操作都改变树形拓扑，都必须可撤销、可与协同合并——数据模型选错（见机制一），这五件事件件是苦役。
2. **移动子树的环约束**：把一个节点拖进自己的后代 = 树成环，数据当场损坏（与 A1.5 块拖拽、A4 连线校验的环检测同一道题）。
3. **一份语义、两种投影**：列表视图和导图视图必须永远一致——它们只能同源于一个数据层，各自维护一份状态必然漂移。
4. **折叠的边界**：折叠是 UI 态不是内容（17-6 讲过"折叠用 Decoration 隐藏而不是删节点"，同一原则），但它直接影响列表的行投影与虚拟化。

#### 关键机制一：扁平模型——顺序只存在父节点的 children 数组里

反例先行：用嵌套 JSON（`{ text, children: [...] }`）当状态，任何一次移动子树都是"深层定位 + 摘除 + 插入 + 整棵树拷贝"，O(深度) 的路径重建、不可变更新写起来惨不忍睹，协同（Yjs）更是无从建模。正解是扁平化：

```ts
// outline.ts —— 扁平大纲模型：节点进 Map，顺序挂父节点
export interface OutlineNode {
  id: string
  text: string
  parentId: string     // 根节点为 ROOT_ID；顶层条目的 parent 就是 ROOT_ID
  children: string[]   // 有序子节点 id——顺序信息只存在这里
  collapsed: boolean   // 折叠是 UI 态：序列化内容时可丢弃，本地另存
}

export type OutlineDoc = Map<string, OutlineNode>
export const ROOT_ID = 'root'

/** copy-on-write 更新单个节点，返回新 Map（immer 的极简替代） */
function withNode(doc: OutlineDoc, id: string, patch: Partial<OutlineNode>): OutlineDoc {
  return new Map(doc).set(id, { ...doc.get(id)!, ...patch })
}
```

移动子树 = 改三处引用（摘出旧父的 children、推进新父的 children、改自己的 parentId），**子树本身一个字节都不用动**——children 是 id 引用，id 走到哪子树跟到哪。协同建模顺理成章：节点 = `Y.Map`、children = `Y.Array`（14-6 选修一的结构化建模正例）。

五个结构操作中的两个核心（其余同型）：

```ts
/** Tab 缩进：投入"前一个兄弟"门下（幕布语义：层首不可缩进） */
export function indent(doc: OutlineDoc, id: string): OutlineDoc {
  const node = doc.get(id)!
  const parent = doc.get(node.parentId)!
  const i = parent.children.indexOf(id)
  if (i <= 0) return doc // 没有前兄弟：已在层首
  const prevId = parent.children[i - 1]

  let next = withNode(doc, node.parentId, {
    children: parent.children.filter((c) => c !== id), // 从原父摘出
  })
  const prev = next.get(prevId)!
  next = withNode(next, prevId, { children: [...prev.children, id] }) // 成为前兄弟的末子
  return withNode(next, id, { parentId: prevId })
}

/** Shift+Tab 升级：成为父亲的下一个兄弟 */
export function deindent(doc: OutlineDoc, id: string): OutlineDoc {
  const node = doc.get(id)!
  if (node.parentId === ROOT_ID) return doc // 顶层不可再升
  const parent = doc.get(node.parentId)!
  const grandId = parent.parentId
  const grand = doc.get(grandId)!
  const gi = grand.children.indexOf(parent.id)

  let next = withNode(doc, parent.id, {
    children: parent.children.filter((c) => c !== id),
  })
  const g = next.get(grandId)!
  next = withNode(next, grandId, {
    children: [...g.children.slice(0, gi + 1), id, ...g.children.slice(gi + 1)], // 插到原父之后
  })
  return withNode(next, id, { parentId: grandId })
}
```

（moveUp/moveDown——兄弟数组内换位，与 split——Enter 时当前节点从光标处断开文本、后半成为下一兄弟且子树归属前半（幕布语义）——这两个操作的写法与 indent/deindent 完全同型，留作练习。）

#### 关键机制二：折叠与"行投影"——列表视图是一次数组化

列表视图渲染的不是树，是 `visibleRows(doc)`：先序遍历、跳过折叠子树，得到一维行数组。虚拟滚动（E1/G 族）直接吃这个数组，`key` 用节点 id：

```ts
/** 可见行投影：先序遍历，折叠的子树整支跳过 */
export function visibleRows(doc: OutlineDoc): string[] {
  const rows: string[] = []
  const walk = (id: string) => {
    for (const childId of doc.get(id)!.children) {
      rows.push(childId)
      if (!doc.get(childId)!.collapsed) walk(childId)
    }
  }
  walk(ROOT_ID)
  return rows
}
```

拖拽移动（把 A 拖到 B 上/下/里）落点判定与 A1.5 块拖拽同构，只需多一条环校验：`isDescendant(doc, targetId, draggedId)` 为真则拒绝（从 dragged 沿 parentId 向上走，撞到 target 即成环）。

#### 关键机制三：导图投影——d3.tree 布局，数据不变只换渲染

思维导图 = 同一个 `OutlineDoc` 换一套几何投影。树布局用 d3-hierarchy 的 Reingold–Tilford "tidy" 算法（同层节点对齐、父子居中、最小间距），**布局是纯函数：树进、坐标出**，与渲染解耦：

```tsx
// MindmapView.tsx —— 大纲数据的导图投影：d3.tree + SVG（节点数百级 SVG 完全够，见 C1.1 分级）
import { useMemo } from 'react'
import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy'
import { linkHorizontal } from 'd3-shape'
import type { OutlineDoc, OutlineNode } from './outline'

const NODE_H = 28   // 兄弟间的纵向间距（d3.tree 的 nodeSize[0]）
const LEVEL_W = 180 // 层级间的横向间距（nodeSize[1]）

const linkPath = linkHorizontal<HierarchyPointNode<OutlineNode>, HierarchyPointNode<OutlineNode>>()
  .x((d) => d.y) // 注意：横向树——深度走 x 轴，同层排布走 y 轴
  .y((d) => d.x)

export function MindmapView({ doc }: { doc: OutlineDoc }) {
  const root = useMemo(() => {
    const h = hierarchy(doc.get('root')!, (n: OutlineNode) =>
      n.children.map((c) => doc.get(c)!),
    )
    return tree<OutlineNode>().nodeSize([NODE_H, LEVEL_W])(h)
  }, [doc])

  const links = root.links()
  return (
    <svg width={960} height={640} style={{ overflow: 'visible' }}>
      <g transform="translate(40, 320)">
        {links.map((l, i) => (
          <path key={i} d={linkPath(l)!} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
        ))}
        {root.descendants().map((n) => (
          <g key={n.data.id} transform={`translate(${n.y},${n.x})`}>
            <rect x={-6} y={-14} width={Math.max(n.data.text.length * 13 + 12, 40)} height={NODE_H - 8}
              rx={6} fill={n.data.id === 'root' ? '#1e293b' : '#f1f5f9'} stroke="#cbd5e1" />
            <text x={0} y={4} fontSize={12} fill={n.data.id === 'root' ? '#fff' : '#0f172a'}>
              {n.data.text || '…'}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
```

经典思维导图的"根节点左右分叉"= 把 children 按序分成两半，各跑一次 `d3.tree`，一侧镜像（x 取负）再平移拼合——两次布局、一次渲染，仍是纯投影。导图上的点击展开/收起直接改 `collapsed`，两个视图自动同步（同一份数据）。

#### 选型与学习路径

1. **第 1 周**：纯键盘大纲——扁平模型 + indent/deindent/split + `visibleRows` 虚拟列表。验收物：连续 Tab/Shift+Tab 十次结构符合幕布语义，每步可撤销（命令栈复用 A3.7）。
2. **第 2 周**：加导图投影（上面代码），加拖拽移动 + 环校验。验收物：列表里折叠一章，导图同步收起；把父节点拖进自己的子孙被拒。
3. **第 3–4 周**：接 B1 协同（`Y.Map` 节点 + `Y.Array` children），双视图三端一致性验证。对标：Workflowy（键盘流鼻祖）、幕布（双投影代表）、tldraw 的 arrows + 16-5 无限画布（若要做"自由画布式导图"）。

#### 常见坑

- **嵌套 JSON 当状态**：症状——每个结构操作都要递归克隆整棵树，代码里到处 `deepClone`，协同无从下手。修法——扁平模型（机制一），这是本场景的第一设计决策。
- **折叠写进内容模型**：症状——我折叠一章，协同学的文档"少了一章"（假删除风暴，17-6 同款坑）；导出内容带折叠。修法——`collapsed` 是 UI 态：本地存储/awareness 同步，内容序列化时剥离。
- **Tab 不 preventDefault**：症状——按 Tab 焦标跳出了编辑框，缩进没发生。修法——keydown 里识别结构键先 `e.preventDefault()` 再执行操作。
- **布局每次渲染重算**：症状——导图每次输入都整体跳一下（d3.tree 结果不稳定感）。修法——`useMemo([doc])` 缓存布局；更进一步：布局结果按节点 id 持久化，局部变更只重排受影响子树（A4"布局与手动拖动打架"坑的同款修法）。
- **列表用数组下标当 key**：症状——移动节点后输入焦点/动画错位。修法——key 用节点 id（`visibleRows` 返回的正是 id）。
- **导图节点数不设上限还用 SVG**：症状——几千节点的导图滚动掉帧。修法——按 C1.1 渲染分级切 Canvas，或限制导图渲染的树深（折叠点以下不投影）。

---

## 附:ASCII 图替换清单

本文档图形化改版,原 ASCII 字符图与 Mermaid 图表对应关系如下:

| 原图位置 / 标题 | 处理结果 |
| --- | --- |
| A3.4 坐标变换:世界→屏幕公式与仿射矩阵(setTransform 矩阵排版) | 保留原图(数学公式与矩阵形式,Mermaid 无等价图表类型,转图表会丢失矩阵排版的字符级语义) |

