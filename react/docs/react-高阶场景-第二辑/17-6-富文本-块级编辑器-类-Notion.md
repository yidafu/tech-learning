---
title: "6. 富文本 / 块级编辑器（类 Notion）"
---

## 6. 富文本 / 块级编辑器（类 Notion）

**基础**：全景图 A1。增量——把 Notion 交互拆成**可实现清单**逐条做。

先定技术底盘，这决定后面九条路线的语言。选 **TipTap**（ProseMirror 内核的 headless 封装）：富文本四座大山——中文输入法（IME）协调、撤销重做、粘贴清洗、协同冲突——ProseMirror 都已经打磨了近十年，TipTap 在其上补齐了 TypeScript 类型、模块化扩展（Extension）和 React 绑定（NodeView/BubbleMenu）。对比项一句话带过：Slate/Lexical 灵活但 IME 与协同要自己趟坑，Plate 是 Slate 的组件层（自带组件多但定制深水区同样深），milkdown 基于 PM 偏 Markdown 场景。**本场景的定位是"产品级块编辑器"，不是"研究编辑器内核"**——内核研究归全景图 A1 的消化任务，这里全部用 PM 生态的现成抽象。

一个贯穿性认知：Notion 的"块"= ProseMirror 的**顶层 Node**（doc 的直接子节点）。你看到的每一段、每个标题、每张图、每个待办，在文档树里都是 `doc.content` 数组的一项。于是"块交互"全部翻译成 Node 级操作：整块选中（NodeSelection）、整块删除（deleteRange）、整块拖动（pos + nodeSize）、块内 UI（NodeView）。

### 实现路线

1. 块模型：每块一个 PM Node；Enter 开新块 / Backspace 合并到上一块 / 跨块选区删除
2. **Markdown 速记**：输入 `# ` 即时转标题（Input Rule）、`- ` 转列表、`[] ` 转待办
3. **Slash 命令**：输入 `/` 弹浮层菜单（floating-ui 定位到光标、模糊搜索、纯键盘导航）
4. **块拖拽**：左侧 ⠿ handle → 拖拽排序/嵌套缩进（放置目标高亮、父子层级缩进提示）
5. 块悬浮工具栏：⠿ + ＋ + 菜单（复制/删除/转换为…）
6. 选区浮动工具栏：选中文本浮出 B/I/U/链接（选区坐标计算）
7. **NodeView**：用 React 渲染块内部 UI（图片上传进度条、代码块语言选择器）
8. 无限嵌套列表与折叠块
9. 协同：y-prosemirror 双人编辑 + 他人光标

### 路线 1：块模型 —— Enter / Backspace / 跨块删除的行为规格

**是什么**。先把文档结构立起来，再把三个最基础的键的行为规格写死——它们是所有块交互的地基，规格含糊，后面每条路线都会在边界情况上翻车。

**为什么需要**。用户对"按 Enter 会发生什么"的预期来自 Notion/Word 十年训练，任何偏离都会被立刻感知。行为规格 = 把这些预期写成可测试的条目。

**文档结构**（JSON 形态直观看一眼）：

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "周会纪要" }] },
    { "type": "paragraph" },
    { "type": "taskList", "content": [
      { "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph" }] }
    ]},
    { "type": "codeBlock", "attrs": { "language": "ts" } }
  ]
}
```

**行为规格表**（默认由 PM/TipTap 扩展提供，自定义点在括号里）：

| 操作 | 规格 |
|---|---|
| 段落中按 Enter | `splitBlock`：光标处一分为二，后半成为新段落；行尾按 Enter 则下方插入空段落 |
| 标题中按 Enter | 新块**回落为段落**（官方 Heading 内置：标题不无限延续） |
| 列表项按 Enter | 同级续一项；**空列表项**按 Enter = 退出列表转段落（lift 语义） |
| Shift+Enter | 硬换行（hardBreak），不新开块 |
| Backspace（块首 + 空块） | 删除本块，光标落上一块末尾 |
| Backspace（块首 + 有内容） | 与上一块合并：类型不同先按 joinBackward 规则降级（标题并入段落成普通文本） |
| Backspace（列表项首） | 先 `liftListItem` 退一级缩进；已是顶层列表项且为空 → 转段落 |
| 跨块选区删除 | `deleteSelection`：整块被选中则块消失；部分选中则该块保留、文本截断；列表结构删除后仍自洽（schema 兜底：listItem 至少含一个 paragraph，不会留下空壳） |

**代码**（验证/定制这些行为的入口——自定义 keymap；其余默认行为建议先全部接受，别重复造）：

```ts
// src/notion-clone/blockKeymap.ts —— 自定义键行为的标准入口
import { Extension } from '@tiptap/core';

export const BlockKeymap = Extension.create({
  name: 'blockKeymap',
  addKeyboardShortcuts() {
    const editor = this.editor;
    return {
      // 例：把"空块按 Backspace"定制为"先转段落再等第二次 Backspace 删除"（更接近 Notion 手感）
      Backspace: () => {
        const { empty, $from } = editor.state.selection;
        const atBlockStart = empty && $from.parentOffset === 0;
        const inEmptyTextblock = empty && $from.parent.content.size === 0;
        if (inEmptyTextblock && $from.parent.type.name !== 'paragraph') {
          // 非段落空块（空标题/空引用）→ 先转段落，而不是直接删除
          return editor.commands.setNode('paragraph');
        }
        if (atBlockStart && editor.isActive('listItem')) {
          // 列表项首：默认已是 lift 语义，这里显式化（返回 false 即交给默认）
          return editor.commands.liftListItem('listItem');
        }
        return false; // 其余情况：交给 PM 默认（合并/删字/删除选区）
      },
      // 例：Cmd+Enter 在任意块上切换待办勾选（Notion 行为）
      'Mod-Enter': () => {
        if (editor.isActive('taskItem')) {
          return editor.commands.updateAttributes('taskItem', { checked: !editor.getAttributes('taskItem').checked });
        }
        return false;
      },
    };
  },
});
```

**常见坑（症状 → 根因 → 修法）**：症状——在待办项按 Enter 有时生成普通段落而不是新待办。根因：taskList/taskItem 扩展没装齐（`@tiptap/extension-task-list` + `@tiptap/extension-task-item` 要成对），schema 里 taskItem 的 `content: 'paragraph block*'` 与续行逻辑都在扩展里。修法：成对安装并在 StarterKit 之外显式注册（v2 的 StarterKit 不含 taskList）；用 `editor.isActive('taskItem')` 在控制台自检 schema 是否到位。

### 路线 2：Markdown 速记 —— Input Rule

**是什么**。行首输入 `# ` 立即变成 H1、`- ` 变无序列表、`[] ` 变待办——机制是 ProseMirror 的 **Input Rule**：监听文本输入，当"刚输入的那段文本"匹配模式时，用一个原子 transaction 把它替换为对应的节点/标记。

**为什么需要**。这是"键盘流用户"的核心效率来源，也是 Markdown 用户迁移的全部心智成本补偿。更重要的是它**免费且安全**：匹配发生在 PM 的事务系统内，自动进 undo 栈、自动协同、自动避开 IME 组合期（PM 输入法协调器的分内事，详见坑 1）。

**怎么做**。TipTap 三种 Input Rule 助手，按目标节点类型选：

- `textblockTypeInputRule`：改变**当前文本块**的类型（`# ` → heading）；
- `wrappingInputRule`：把当前块**包进**一个容器节点（`- ` → bulletList>listItem、`> ` → blockquote）；
- `nodeInputRule`：替换为一个独立节点（`---` → 分割线，官方已内置）。

`#`、`-`、`` ``` ``、`>`、`1.` 这些官方扩展已经内置；下面代码讲清机制并补齐 `[] ` 待办速记：

```ts
// src/notion-clone/markdownShorthands.ts
import { Extension, textblockTypeInputRule, wrappingInputRule } from '@tiptap/core';

export const MarkdownShorthands = Extension.create({
  name: 'markdownShorthands',
  addInputRules() {
    const nodes = this.editor.schema.nodes;
    return [
      // `> ` → 引用块：wrapping（把当前段落包进 blockquote）
      wrappingInputRule({ find: /^\s*>\s$/, type: nodes.blockquote! }),
      // `1. ` / `23. ` → 有序列表（序号交给列表自身维护，不需要捕获回填）
      wrappingInputRule({ find: /^(\d+)\.\s$/, type: nodes.orderedList! }),
      // `[] `/`[x] `/`[X] ` → 待办：捕获组带出勾选状态
      wrappingInputRule({
        find: /^\s*\[( |x|X)?\]\s$/,
        type: nodes.taskItem!,
        getAttributes: (match) => ({
          checked: match[1] ? match[1].toLowerCase() === 'x' : false,
        }),
      }),
      // 机制展示：把官方 Heading 的规则抄出来——textblockTypeInputRule 改的是块类型
      // （heading 官方已内置，这行只是让你看清 `# ` → heading 是怎么发生的）
      textblockTypeInputRule({
        find: /^(#{1,6})\s$/,
        type: nodes.heading!,
        getAttributes: (match) => ({ level: match[1]?.length ?? 1 }),
      }),
    ];
  },
});
```

要点：`find` 必须以 `\s$`（刚敲下的那个空格）收尾——Input Rule 匹配的是"从块首到光标"的文本，空格是触发器；`getAttributes` 的 `match` 就是 `find` 的捕获组数组，正则分组怎么设计、属性就怎么来。

**常见坑（症状 → 根因 → 修法）**：症状——`[x] ` 在**非空段落**中间输入时也触发，把整段错误地包成待办。根因：`find` 没锚定块首（少了 `^\s*`），或匹配了"光标前的所有文本"里恰好含有模式的子串。修法：模式一律 `^` 锚定块首 + 明确以触发空格结尾；测试用例覆盖"块中间输入"与"中文后跟 `# `" 两种边界。

### 路线 3：Slash 命令 —— floating-ui 定位 + 模糊搜索 + 纯键盘导航

**是什么**。输入 `/` 在光标处弹出命令浮层（插入图片/表格/代码块、转标题…），继续输入即过滤，↑↓ 选择、Enter 执行、Esc 关闭。TipTap 侧用官方 `@tiptap/suggestion` 工具（它就是为 Slash/@ 提及这类"字符触发浮层"设计的），浮层定位用 `@floating-ui/dom`。

**为什么需要**。块编辑器的功能入口有三种：菜单栏（低效）、右键（藏得深）、Slash（键盘流直达 + 可发现性好）。Notion、飞书文档、Craft 全都收敛到 Slash，因为它同时解决"插入什么"和"转成什么"两类意图。

**怎么做（机制分步）**：

1. `Suggestion` 负责监听字符 `/`：给出 `range`（要删掉的 `/query` 区间）、`query`、`view`、生命周期回调（onStart/onUpdate/onKeyDown/onExit）；
2. `render` 适配器负责浮层的生死与定位：创建容器 → React 渲染菜单 → **虚拟锚点**（光标处的零宽矩形，`view.coordsAtPos(range.from)`）交给 `computePosition`，`flip + shift` 中间件处理边缘翻转；
3. 命中执行：先 `deleteRange(range)` 删掉 `/query`，再执行条目的命令；
4. 键盘导航：Suggestion 会把按键先交给 `onKeyDown`，菜单组件用 `useImperativeHandle` 暴露处理器，返回 `true` 表示已消费（↑↓Enter），`false` 放行给编辑器。

**代码**。命令清单与模糊搜索：

```ts
// src/notion-clone/slash/items.ts
import type { Editor } from '@tiptap/core';

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  keywords: string[]; // 拼音/英文别名，模糊搜索语料
  command: (editor: Editor) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', title: '标题 1', description: '大节标题', keywords: ['h1', 'heading', 'biaoti'],
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2', title: '标题 2', description: '小节标题', keywords: ['h2', 'heading', 'biaoti'],
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'todo', title: '待办列表', description: '可勾选的任务项', keywords: ['todo', 'task', 'daiban'],
    command: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'bullet', title: '无序列表', description: '圆点列表', keywords: ['bullet', 'list', 'liebiao'],
    command: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'quote', title: '引用', description: '引用块', keywords: ['quote', 'yinyong'],
    command: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', title: '代码块', description: '带高亮的代码', keywords: ['code', 'daima'],
    command: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'image', title: '图片', description: '上传或拖入图片', keywords: ['image', 'tupian', 'img'],
    command: (e) => e.chain().focus().setImageBlock().run() }, // setImageBlock 来自路线 7 的自定义扩展
  { id: 'divider', title: '分割线', description: '水平分隔', keywords: ['divider', 'hr'],
    command: (e) => e.chain().focus().setHorizontalRule().run() },
];

/** 轻量模糊搜索：前缀 > 包含 > 关键词前缀 > 首字母缩写，四级打分 */
export function fuzzyFilter(query: string, items: SlashItem[]): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items
    .map((it) => {
      const title = it.title.toLowerCase();
      let score = -1;
      if (title.startsWith(q)) score = 100;
      else if (title.includes(q)) score = 70;
      else if (it.keywords.some((k) => k.toLowerCase().startsWith(q))) score = 60;
      else {
        // 首字母缩写：query 每个字符都能在关键词首字母集合中找到（bd → 便签/待办）
        const initials = it.keywords.map((k) => k[0] ?? '').join('');
        if ([...q].every((c) => initials.includes(c))) score = 40;
      }
      return { it, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}
```

菜单组件（纯键盘导航 + active 项滚动跟随）：

```tsx
// src/notion-clone/slash/SlashMenu.tsx
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { fuzzyFilter, SLASH_ITEMS, type SlashItem } from './items';

export interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SuggestionProps<SlashItem>>(
  ({ query, command }, ref) => {
    const filtered = useMemo(() => fuzzyFilter(query, SLASH_ITEMS), [query]);
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setActive(0), [query]); // 查询变化重置选中项
    useEffect(() => {
      // active 项滚进可视区：长列表键盘导航不"盲选"
      listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.isComposing) return false; // ★ IME 守卫：组合期间的按键不归菜单（见坑 1）
          const n = Math.max(filtered.length, 1);
          if (event.key === 'ArrowDown') { setActive((i) => (i + 1) % n); return true; }
          if (event.key === 'ArrowUp') { setActive((i) => (i - 1 + n) % n); return true; }
          if (event.key === 'Enter') {
            const item = filtered[active];
            if (item) command(item); // command 回调内会先 deleteRange('/query') 再执行（见扩展装配）
            return true;
          }
          if (event.key === 'Escape') return false; // 交给 Suggestion 关闭
          return false;
        },
      }),
      [active, filtered, command],
    );

    return (
      <div ref={listRef} className="slash-menu">
        {filtered.length === 0 && <div className="slash-empty">没有匹配的命令</div>}
        {filtered.map((item, i) => (
          <button
            key={item.id}
            data-index={i}
            className={i === active ? 'slash-item active' : 'slash-item'}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => e.preventDefault()} // ★ 防止点击使编辑器失焦（浮层点击经典坑）
            onClick={() => command(item)}
          >
            <strong>{item.title}</strong>
            <span className="slash-desc">{item.description}</span>
          </button>
        ))}
      </div>
    );
  },
);
SlashMenu.displayName = 'SlashMenu';
```

floating-ui 渲染适配器与扩展装配：

```tsx
// src/notion-clone/slash/render.tsx —— Suggestion 的 render 适配器（官方 demo 用 tippy，这里换 floating-ui）
import { createElement, createRef, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { computePosition, flip, shift } from '@floating-ui/dom';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { SlashMenu, type SlashMenuHandle } from './SlashMenu';
import type { SlashItem } from './items';

export function slashRender() {
  let root: Root | null = null;
  let el: HTMLElement | null = null;
  let menuRef: RefObject<SlashMenuHandle | null> = createRef();

  const position = (props: SuggestionProps<SlashItem>) => {
    if (!el) return;
    // ★ 虚拟锚点：光标处的零宽矩形。coordsAtPos 返回 {left, top, right, bottom}
    const coords = props.view.coordsAtPos(props.range.from);
    const anchor = {
      getBoundingClientRect: () => ({
        width: 0, height: 0,
        top: coords.top, bottom: coords.bottom,
        left: coords.left, right: coords.right,
        x: coords.left, y: coords.top,
        toJSON: () => ({}),
      }) as DOMRect,
    };
    computePosition(anchor, el, {
      placement: 'bottom-start',
      middleware: [flip(), shift({ padding: 8 })], // 底部放不下翻上方；左右出界平移
    }).then(({ x, y }) => {
      if (el) Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    });
  };

  return {
    onStart(props: SuggestionProps<SlashItem>) {
      el = document.createElement('div');
      Object.assign(el.style, { position: 'fixed', zIndex: '1000', left: '0px', top: '0px' });
      document.body.appendChild(el);
      root = createRoot(el);
      menuRef = createRef();
      root.render(createElement(SlashMenu, { ...props, ref: menuRef }));
      position(props);
    },
    onUpdate(props: SuggestionProps<SlashItem>) {
      root?.render(createElement(SlashMenu, { ...props, ref: menuRef }));
      position(props); // 继续输入时光标移动，浮层跟随
    },
    onKeyDown(props: SuggestionKeyDownProps): boolean {
      return menuRef.current?.onKeyDown(props) ?? false;
    },
    onExit() {
      root?.unmount();
      el?.remove();
      root = null;
      el = null;
    },
  };
}
```

```ts
// src/notion-clone/slash/slashExtension.ts
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { slashRender } from './render';
import { SLASH_ITEMS, type SlashItem } from './items';

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',                            // 触发字符（行中/行首均可，Notion 行为）
        items: () => SLASH_ITEMS,             // 过滤交给菜单组件（也可在此按 query 过滤）
        command: ({ editor, range, props }: { editor: import('@tiptap/core').Editor; range: { from: number; to: number }; props: SlashItem }) => {
          editor.chain().focus().deleteRange(range).run(); // ① 先删掉 '/query' 文本
          props.command(editor);                                 // ② 再执行条目动作
        },
        render: slashRender,
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion<SlashItem>({ ...this.options.suggestion, editor: this.editor })];
  },
});
```

**常见坑（症状 → 根因 → 修法）**：症状——鼠标点菜单项，编辑器失焦、命令作用在了错误位置。根因：点击按钮触发 mousedown → 编辑器 blur → selection 丢失，而 `command` 里的 chain 依赖编辑器选区。修法：菜单项 `onMouseDown={(e) => e.preventDefault()}`（阻止焦点转移，上面代码已内置），并且命令一律 `editor.chain().focus()...` 显式回焦。

### 路线 4：块拖拽 —— ⠿ handle、放置目标高亮、嵌套缩进

**是什么**。鼠标悬停块左侧出现 ⠿ 把手，按住拖动：块之间出现蓝色放置线/目标块高亮；松手完成排序；拖到目标块左侧缩进档位上松手则形成嵌套（Notion 的父子层级）。

**为什么需要**。长文档里"把这段挪到上面第三段后面"用剪切粘贴要 5 次操作且不可视；拖拽是 1 次且全程所见即所得。这是块编辑器区别于传统富文本的招牌交互。

**怎么做（机制分步）**。用 ProseMirror 插件 + Decoration 实现，三块拼图：

1. **Widget Decoration**：给每个顶层块头部挂一个不可编辑的 ⠿ div（`draggable`、`contentEditable=false`）。注意 widget 的 DOM 构造函数能拿到 `view`——dragstart 时就能 dispatch 元数据。
2. **拖拽协议**：dragstart 把"源块的 pos"写进 `dataTransfer`；dragover 用 `view.posAtCoords` 算落点 → 找到落点所在的顶层块 → 按指针在块内的纵向位置决定 before/after → dispatch plugin meta 更新高亮；drop 时删旧插新（**删除导致的 pos 偏移要补偿**）。
3. **高亮**：`Decoration.node` 给目标块挂 class；嵌套缩进 = drop 后按悬停的水平档位执行 N 次 `sinkListItem`（列表场景）或包进容器块（通用块场景需要目标类型支持 `content: 'block+'`，与路线 8 的折叠块共用这套容器）。

**代码**（顶层块排序 + 高亮的完整插件；嵌套缩进给接入点）：

```ts
// src/notion-clone/blockDrag.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface DragState {
  dragging: { pos: number } | null;
  dropTarget: { pos: number; place: 'before' | 'after' | 'inside' } | null; // inside = 嵌套意图
}

export const blockDragKey = new PluginKey<DragState>('blockDrag');

export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',
  addProseMirrorPlugins() {
    return [
      new Plugin<DragState>({
        key: blockDragKey,
        state: {
          init: () => ({ dragging: null, dropTarget: null }),
          apply(tr, value) {
            const meta = tr.getMeta(blockDragKey) as Partial<DragState> | undefined;
            return meta ? { ...value, ...meta } : value; // 拖拽不改文档，pos 无需 map
          },
        },
        props: {
          decorations(state) {
            const st = blockDragKey.getState(state)!;
            const decos: Decoration[] = [];
            // ① 每个顶层块头挂 ⠿ widget
            state.doc.forEach((node, offset) => {
              decos.push(
                Decoration.widget(
                  offset,
                  (view) => {
                    const handle = document.createElement('div');
                    handle.className = 'block-drag-handle';
                    handle.draggable = true;
                    handle.contentEditable = 'false'; // 装饰性 DOM 必须退出 contentEditable
                    handle.textContent = '⠿';
                    handle.addEventListener('dragstart', (ev) => {
                      ev.dataTransfer?.setData('application/x-block-pos', String(offset));
                      if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
                      view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: { pos: offset } }));
                    });
                    return handle;
                  },
                  { side: -1 }, // 挂在块首之前
                ),
              );
            });
            // ② 放置目标高亮
            if (st.dragging && st.dropTarget) {
              const node = state.doc.nodeAt(st.dropTarget.pos);
              if (node) {
                decos.push(
                  Decoration.node(st.dropTarget.pos, st.dropTarget.pos + node.nodeSize, {
                    class: st.dropTarget.place === 'inside' ? 'block-drop-inside' : 'block-drop-target',
                  }),
                );
              }
            }
            return DecorationSet.create(state.doc, decos);
          },
          handleDOMEvents: {
            dragover: (view, event) => {
              const e = event as DragEvent;
              const st = blockDragKey.getState(view.state)!;
              if (!st.dragging) return false;
              e.preventDefault(); // 允许 drop
              const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
              if (!coords) return true;
              let targetOffset = -1;
              view.state.doc.forEach((node, offset) => {
                if (coords.pos >= offset && coords.pos < offset + node.nodeSize) targetOffset = offset;
              });
              if (targetOffset < 0 || targetOffset === st.dragging.pos) return true;
              const dom = view.nodeDOM(targetOffset) as HTMLElement | null;
              if (!dom) return true;
              const rect = dom.getBoundingClientRect();
              // 落点判定：块左缘 24px 缩进带 = 嵌套（inside）；否则按纵向上下半区 = before/after
              const place: 'before' | 'after' | 'inside' =
                e.clientX < rect.left + 24 ? 'inside'
                : e.clientY > rect.top + rect.height / 2 ? 'after'
                : 'before';
              if (!st.dropTarget || st.dropTarget.pos !== targetOffset || st.dropTarget.place !== place) {
                view.dispatch(view.state.tr.setMeta(blockDragKey, { dropTarget: { pos: targetOffset, place } }));
              }
              return true;
            },
            drop: (view, event) => {
              const e = event as DragEvent;
              const st = blockDragKey.getState(view.state)!;
              if (!st.dragging) return false;
              e.preventDefault();
              const target = st.dropTarget;
              if (!target) {
                view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
                return true;
              }
              const from = st.dragging.pos;
              const node = view.state.doc.nodeAt(from);
              const targetNode = view.state.doc.nodeAt(target.pos);
              if (!node || !targetNode) return true;
              // 删旧 → 插新；删除使目标 pos 前移时补偿
              const shift = from < target.pos ? node.nodeSize : 0;
              const base = target.pos - shift;
              const insertPos = target.place === 'before' ? base : base + targetNode.nodeSize;
              const tr = view.state.tr;
              tr.delete(from, from + node.nodeSize);
              tr.insert(insertPos, node);
              // 嵌套（inside）：把刚插入的块包成 目标块的"子"——
              // PM 里"任意块可嵌套"的通用落地 = 包进 bulletList>listItem（listItem 收 block 组的任意块）
              if (target.place === 'inside') {
                const { bulletList, listItem } = view.state.doc.type.schema.nodes;
                if (bulletList && listItem) {
                  tr.wrap(insertPos, insertPos + node.nodeSize, [{ type: bulletList }, { type: listItem }]);
                }
              }
              view.dispatch(tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
              return true;
            },
            dragend: (view) => {
              view.dispatch(view.state.tr.setMeta(blockDragKey, { dragging: null, dropTarget: null }));
              return false;
            },
          },
        },
      }),
    ];
  },
});
```

配套样式与嵌套缩进接入点：

```css
/* src/notion-clone/block-editor.css */
.ProseMirror > * { position: relative; }        /* 每个顶层块成为把手的定位上下文 */
.block-drag-handle {
  position: absolute; left: -36px; top: 2px;
  width: 26px; height: 20px; line-height: 20px; text-align: center;
  color: #bbb; cursor: grab; opacity: 0; user-select: none; transition: opacity .12s;
}
.ProseMirror > *:hover > .block-drag-handle { opacity: 1; }
.block-drag-handle:active { cursor: grabbing; }
.block-drop-target { outline: 2px solid #1890ff; outline-offset: 2px; background: #f0f7ff; }
.block-drop-inside { box-shadow: inset 0 0 0 2px #722ed1; background: #f9f0ff; } /* 嵌套目标：紫色内框 */
```

```ts
// 多级嵌套（进阶）：上面的 inside 落点只包一层；要按"悬停 x 的缩进档位"决定层级，
// 在 drop 的 wrap 之后，把选区放进刚移动的块内，再执行 (档位-1) 次 sinkListItem：
const contentLeft = editor.view.dom.getBoundingClientRect().left;
const level = Math.max(1, Math.floor((e.clientX - contentLeft) / 36)); // 36px 一档
for (let i = 1; i < level; i++) {
  editor.chain().focus().sinkListItem('listItem').run(); // 选区已在被移动块内，每层一次 sink
}
// 通用容器块的嵌套（toggle/章节等接受 content: 'block+' 的自定义节点）同理：
// wrap 的目标类型从 bulletList/listItem 换成你的容器节点即可。
```

生产提示：TipTap v2.5+ 官方提供了 `@tiptap/extension-drag-handle` 与 `@tiptap/extension-global-drag-handle`，把上面这套插件工程化（虚拟化、多点触控、嵌套判定都更完善）——自研一遍的意义在于理解它调不通时该怎么修。

**常见坑（症状 → 根因 → 修法）**：症状——把块 A 拖到紧随其后的块 B 后面，结果顺序没变或 B 消失了。根因：先插后删/先删后插的 pos 补偿写错——插入使源块 pos 偏移，删除位置随之错位，误删了邻居。修法：固定"先删后插"次序并只做一次补偿（`shift = from < target.pos ? node.nodeSize : 0`）；用 `tr.mapping` 也可（删完后 `tr.mapping.map(target.pos)`），但两种补偿**不要混用**。测试用例：相邻上移、相邻下移、跨半文档移动三例必须全绿。

### 路线 5：块悬浮工具栏 —— ⠿ + ＋ + 菜单

**是什么**。光标进入某块时，块左侧浮出一列小按钮：⠿（拖拽把手，即路线 4）、＋（在下方插入空块）、⧉ 复制块、H 转标题、🗑 删除块、"转换为…"菜单。

**为什么需要**。块级操作（整块复制/删除/换类型）在选区模型里没有自然入口（选区是文本级的）；悬浮工具栏把"块"作为一等操作对象暴露出来，与 Slash（插入）、Bubble（文本格式化）三者分工。

**怎么做**。定位公式：`view.nodeDOM($from.before(1))` 拿到当前顶层块的 DOM → `getBoundingClientRect()` → 相对编辑器容器（`position: relative`）绝对定位到块左侧。监听 `selectionUpdate` + `transaction` 更新。

**代码**：

```tsx
// src/notion-clone/BlockToolbar.tsx
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface BlockInfo { top: number; left: number; pos: number; }

export function BlockToolbar({
  editor, containerRef,
}: {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [info, setInfo] = useState<BlockInfo | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { state, view } = editor;
      const { $from } = state.selection;
      const container = containerRef.current;
      if (!container) return;
      // 光标所在最外层块（depth=1）的起点 pos：$from.before(1) 是"块"的地址
      const topPos = $from.before(1);
      const topNode = state.doc.nodeAt(topPos);
      const dom = view.nodeDOM(topPos) as HTMLElement | null;
      if (!dom || !topNode) { setInfo(null); return; }
      const blockRect = dom.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setInfo({
        top: blockRect.top - containerRect.top,
        left: blockRect.left - containerRect.left - 56, // 悬在块左侧留白
        pos: topPos,
      });
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update); // 滚动/输入都会触发 transaction，顺带覆盖滚动跟随
    return () => { editor.off('selectionUpdate', update); editor.off('transaction', update); };
  }, [editor, containerRef]);

  if (!info || !editor) return null;
  const node = editor.state.doc.nodeAt(info.pos);
  const nodeSize = node?.nodeSize ?? 0;

  const duplicate = () => {
    if (!node) return;
    editor.chain().focus().insertContentAt(info.pos + nodeSize, node.toJSON()).run(); // JSON 克隆插到身后
  };
  const remove = () => editor.chain().focus().deleteRange({ from: info.pos, to: info.pos + nodeSize }).run();
  const insertBelow = () => editor.chain().focus()
    .insertContentAt(info.pos + nodeSize, { type: 'paragraph' }).run();

  return (
    <div style={{ position: 'absolute', top: info.top, left: info.left, display: 'flex', gap: 2, opacity: 0.55 }}>
      <button title="拖拽排序（路线 4 把手）">⠿</button>
      <button title="下方插入块" onClick={insertBelow}>＋</button>
      <button title="复制块" onClick={duplicate}>⧉</button>
      <button title="转为 H2" onClick={() => editor.chain().focus().setNode('heading', { level: 2 }).run()}>H</button>
      <button title="删除块" onClick={remove}>🗑</button>
    </div>
  );
}
// 编辑器容器：<div ref={containerRef} style={{ position: 'relative' }}> 才能让上面的绝对定位生效
```

**常见坑（症状 → 根因 → 修法）**：症状——工具栏位置在滚动后漂移/定格在旧位置。根因：只监听了 `selectionUpdate`，滚动不改变选区。修法：加 `transaction` 监听（PM 滚动伴随 transaction 的 scrollIntoView），或容器 `scroll` 事件里强制重算（生产建议用 floating-ui 的 `autoUpdate`，它把 scroll/resize/DOM 变动全包了）。

### 路线 6：选区浮动工具栏 —— 选区坐标计算与滚动跟随

**是什么**。选中一段文字，选区上方浮出 B/I/U/链接 小条。选区消失，小条隐藏。

**为什么需要**。格式化是富文本第一高频操作；顶部固定工具栏要把视线拽离文本，浮动工具栏贴着操作对象。

**怎么做（坐标计算）**。核心是 `view.coordsAtPos`：给一个文档 pos，返回该光标位置的**视口坐标**矩形。选区两端各取一次，包络出选区矩形，工具条定位于其上方居中。滚动跟随 = 容器 scroll 时重算（坐标是视口系的，滚动即失效）。

**代码**（手写版，理解原理；生产可直接用 BubbleMenu 组件）：

```tsx
// src/notion-clone/BubbleToolbar.tsx
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export function BubbleToolbar({ editor }: { editor: Editor | null }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) { setPos(null); return; }
      // ★ 选区两端坐标：to 传 side=-1 取"终点前侧"，跨行选区时包络矩形更贴近直觉
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to, -1);
      const centerX = (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2;
      const top = Math.min(start.top, end.top) - 44; // 工具条高 ~36 + 间距 8
      setPos({ left: centerX, top });
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    // ★ 滚动跟随：coordsAtPos 是视口坐标，容器一滚就过期
    const scroller = editor.view.dom.closest('.notion-scroll') ?? document.scrollingElement ?? document;
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editor]);

  if (!pos || !editor) return null;
  const btn = (label: string, title: string, onClick: () => void, active = false) => (
    <button key={title} title={title} onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} /* 同 Slash：防止失焦 */
      style={{ border: 'none', background: active ? '#e6f4ff' : 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 4 }}>
      {label}
    </button>
  );
  return (
    <div style={{
      position: 'fixed', left: pos.left, top: Math.max(pos.top, 8),
      transform: 'translateX(-50%)', background: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,.14)', borderRadius: 6, padding: 4,
      display: 'flex', gap: 2, zIndex: 900,
    }}>
      {btn(<b>B</b>, '加粗', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn(<i>I</i>, '斜体', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn(<u>U</u>, '下划线', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      {btn('🔗', '链接', () => {
        const url = window.prompt('链接地址');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }, editor.isActive('link'))}
    </div>
  );
}
```

生产捷径（TipTap 自带组件，v2 从 `@tiptap/react` 导出；v3 迁至 `@tiptap/react/menus`）：

```tsx
import { BubbleMenu } from '@tiptap/react';

<BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
  {/* 同上按钮组：shouldShow / tippy 选项控制出现条件 */}
</BubbleMenu>
```

**常见坑（症状 → 根因 → 修法）**：症状——跨行选区时工具条定位到两行之间的"中缝"，或全选时飞到页面外。根因：`coordsAtPos(from)` 与 `coordsAtPos(to)` 分别在首行行首和末行行尾，二者包络可能覆盖整页；`side` 参数取错侧时视觉跳跃。修法：`to` 用 `side: -1`；跨行/块时改用 `window.getSelection().getRangeAt(0).getBoundingClientRect()`（浏览器原生选区矩形，跨行时浏览器给的是视觉包络），两种来源互为兜底。

### 路线 7：NodeView —— 用 React 渲染块内部

**是什么**。ProseMirror 允许任意节点用自定义 UI 渲染，TipTap 的 `ReactNodeViewRenderer` 把这块 UI 变成 React 组件：块外壳（NodeViewWrapper）+ 可编辑内容区（NodeViewContent）+ 周边任意 React 交互。两个经典应用：图片块（上传进度条）、代码块（语言选择器）。

**为什么需要**。纯 PM 渲染的节点只能是"标签+属性"，做不了进度条、下拉框这类富交互；把块内部交给 React，等于给文档树开了一个 React 世界的洞——上传中的进度是 React state，落库的 src 是文档 attr，边界清晰（attr 变更走 `updateAttributes`，进 undo/协同；UI 态不进文档）。

**怎么做（机制分步）**：

1. 定义 Node：`atom: true`（图片块整块选中，内部无文本位）；attributes 声明进文档 schema；
2. `addNodeView: () => ReactNodeViewRenderer(组件)`；
3. 组件收到 `NodeViewProps`：`node`（只读文档节点）、`updateAttributes`（写 attr，产生 transaction）、`selected`（块是否被选中，画选中框用）、`deleteNode`；
4. 装饰性控件（按钮、select）必须 `contentEditable={false}`，否则点击会破坏文档选区。

**代码**。图片块（含上传进度条）：

```tsx
// src/notion-clone/ImageBlock.tsx
import { useRef } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,          // 整块选中/删除/拖动，内部不参与文本编辑
  draggable: true,
  addAttributes: () => ({
    src: { default: null },
    status: { default: 'idle' },  // idle | uploading | done | error：UI 态存 attr，协同端可见"对方在传图"
    progress: { default: 0 },     // 0-100
  }),
  parseHTML: () => [{ tag: 'img[data-type="image-block"]' }],
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes({ 'data-type': 'image-block' }, HTMLAttributes)];
  },
  addCommands() {
    return {
      // 供 Slash 命令调用：在光标处插入一个待上传的图片块
      setImageBlock: () => ({ commands }: import('@tiptap/core').CommandProps) =>
        commands.insertContent({ type: this.name }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function ImageBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const src = node.attrs.src as string | null;
  const status = node.attrs.status as string;
  const progress = node.attrs.progress as number;

  const upload = async (file: File) => {
    updateAttributes({ status: 'uploading', progress: 0 });
    try {
      const url = await uploadFile(file, (pct) => updateAttributes({ progress: pct }));
      updateAttributes({ src: url, status: 'done', progress: 100 });
    } catch {
      updateAttributes({ status: 'error' });
    }
  };

  return (
    <NodeViewWrapper className="image-block" data-selected={selected || undefined}>
      {src ? (
        <img src={src} alt="" style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
          style={{ border: '1px dashed #d9d9d9', borderRadius: 6, padding: 24, textAlign: 'center', cursor: 'pointer' }}
        >
          {status === 'uploading' ? (
            <>
              <div style={{ height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#1890ff', transition: 'width .2s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>上传中 {progress}%</div>
            </>
          ) : status === 'error' ? (
            <span style={{ color: '#ff4d4f', fontSize: 13 }}>上传失败，点击重试</span>
          ) : (
            <span style={{ color: '#999', fontSize: 13 }}>点击选择或拖入图片</span>
          )}
        </div>
      )}
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void upload(f); }}
      />
    </NodeViewWrapper>
  );
}

/** XHR 上传：fetch 没有 upload progress，进度条必须用 XMLHttpRequest */
function uploadFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve((JSON.parse(xhr.responseText) as { url: string }).url);
      else reject(new Error(`上传失败：HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('网络错误'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
```

代码块语言选择器（语法高亮交给 `@tiptap/extension-code-block-lowlight` 的 decoration 插件，NodeView 只加 UI 壳）：

```tsx
// src/notion-clone/CodeBlock.tsx
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

const lowlight = createLowlight(common);

const LANGUAGES = ['ts', 'js', 'json', 'bash', 'css', 'html', 'python', 'go', 'rust', 'sql'];

export const NotionCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight });

function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string) || 'ts';
  return (
    <NodeViewWrapper as="pre" className="code-block">
      <select
        contentEditable={false} /* ★ 下拉必须退出编辑区 */
        value={language}
        onChange={(e) => updateAttributes({ language: e.target.value })}
        className="code-lang-select"
      >
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      {/* 高亮 spans 由 lowlight 的 ProseMirror decorations 注入 contentDOM，与 React 无关 */}
      <NodeViewContent as="code" />
    </NodeViewWrapper>
  );
}
```

**常见坑（症状 → 根因 → 修法）**：症状——点击语言下拉，代码块内容被清空/光标跳丢。根因：select 没有 `contentEditable={false}`，点击被 PM 当作文档交互处理。修法：NodeView 内**一切装饰性控件**显式 `contentEditable={false}`；包裹它们的 `NodeViewWrapper` 天然隔离（contentDOM 只在 `NodeViewContent` 处）。

### 路线 8：无限嵌套列表与折叠块

**是什么**。两层能力：① 列表可无限嵌套（Tab 降级/Shift+Tab 升级），PM schema 的 `listItem content: 'paragraph block*'` 天然支持；② 折叠块：点击标题/列表项左侧三角，其下属内容收起——文档数据不变，只是视觉隐藏。

**为什么需要**。嵌套列表是文档信息结构的骨架；折叠是长文档导航的刚需。关键认知：**折叠必须是"视图状态"而不是"文档编辑"**——用 CSS 隐藏（Decoration 加 class）而不是从文档删节点，否则协同端会收到一场"把别人内容全删了"的假编辑风暴。

**怎么做**。嵌套：装好 list 扩展即得（Tab/Shift+Tab 是内置快捷键），`@tiptap/extension-list-keymap` 可以让 Backspace/Enter 在列表里的行为更贴近 Notion。折叠：plugin state 存"已折叠的标题 pos 集合"（本地状态，不进文档），decorations 给"标题 + 其覆盖范围"挂 class，CSS `display: none`。**pos 必须随文档编辑 mapping**（这也是坑 3 的正面教材）。

**代码**：

```ts
// src/notion-clone/foldHeadings.ts —— 折叠块：plugin state + decorations + CSS 隐藏
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface FoldState {
  folded: Set<number>;      // 已折叠标题的 pos（本地视图状态，不进文档）
  decos: DecorationSet;
}
export const foldKey = new PluginKey<FoldState>('foldHeadings');

export const FoldHeadings = Extension.create({
  name: 'foldHeadings',
  addProseMirrorPlugins() {
    return [
      new Plugin<FoldState>({
        key: foldKey,
        state: {
          init: () => ({ folded: new Set<number>(), decos: DecorationSet.empty }),
          apply(tr, value, _old, newState) {
            // ① pos 随 mapping 平移：编辑后折叠点必须跟着走（否则折叠错位/失效）
            const folded = new Set<number>();
            for (const pos of value.folded) {
              const mapped = tr.mapping.map(pos, -1);
              const node = newState.doc.resolve(mapped).nodeAfter;
              if (node?.type.name === 'heading') folded.add(mapped); // 标题被删/转型 → 丢弃该折叠态
            }
            // ② 显式切换（来自 handleClick 的 meta）
            const meta = tr.getMeta(foldKey) as { toggle?: number } | undefined;
            if (meta?.toggle !== undefined) {
              folded.has(meta.toggle) ? folded.delete(meta.toggle) : folded.add(meta.toggle);
            }
            // ③ 重建 decorations：每个折叠标题算一次"覆盖范围"，成本 ∝ 折叠数而非文档长度
            const decos: Decoration[] = [];
            for (const pos of folded) {
              const $pos = newState.doc.resolve(pos);
              const headingSize = $pos.nodeAfter?.nodeSize ?? 0;
              const level = ($pos.nodeAfter?.attrs.level as number) ?? 1;
              let end = newState.doc.content.size;
              newState.doc.nodesBetween(pos + headingSize, newState.doc.content.size, (n, offset) => {
                // 覆盖到"下一个同级或更高级标题"为止
                if (n.type.name === 'heading' && (n.attrs.level as number) <= level && offset > pos) {
                  end = Math.min(end, offset);
                }
              });
              decos.push(Decoration.node(pos, pos + headingSize, { class: 'heading-folded' }));
              if (end > pos + headingSize) {
                decos.push(Decoration.node(pos + headingSize, end, { class: 'heading-body-folded' }));
              }
            }
            return { folded, decos: DecorationSet.create(newState.doc, decos) };
          },
        },
        props: {
          decorations(state) { return foldKey.getState(state)?.decos ?? DecorationSet.empty; },
          // 点击标题块的起始 pos → 切换折叠（生产换成块首的三角按钮 widget）
          handleClick: (view, pos) => {
            const node = view.state.doc.nodeAt(pos);
            const $pos = view.state.doc.resolve(pos);
            if (node?.type.name === 'heading' && pos === $pos.before()) {
              view.dispatch(view.state.tr.setMeta(foldKey, { toggle: pos }));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
```

```css
/* 折叠块的本质：视图层隐藏，文档一个字节不动 */
.heading-body-folded { display: none; }
.heading-folded::before { content: '▸'; margin-right: 6px; color: #999; }
```

**常见坑（症状 → 根因 → 修法）**：症状——折叠一段后在别处打字，折叠的内容突然弹出来/折叠跳到别的标题上。根因：折叠态存的是**绝对 pos**，编辑使 pos 过期，没有随 `tr.mapping` 平移。修法：见上面 ①——`tr.mapping.map(pos, -1)` 后还要校验"映射后仍然是标题"，被删/被转换的折叠点直接丢弃。

### 路线 9：协同 —— y-prosemirror 双人编辑 + 他人光标

**是什么**。两个浏览器同时编辑同一文档：字符级实时同步、互不覆盖（CRDT）、能看到对方名字牌和光标、离线编辑重连自动合入。技术栈：Yjs（CRDT 内核）+ y-prosemirror（PM 绑定）+ TipTap 的两个封装扩展（Collaboration / CollaborationCursor）+ 一个连接层（y-websocket 自建、Hocuspocus 自托管、或商业托管）。

**为什么需要**。块编辑器的主战场是协作文档；而且协同不是"最后加上的功能"——undo、光标、选区在协同下都有专门语义（本地 undo 不能撤销别人的输入），第一天就要选对架构。

**怎么做（代码 + 要点）**：

```tsx
// src/notion-clone/CollabEditor.tsx
import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
// 上文各路线的扩展也在此一并注册（SlashCommand、BlockDragHandle、ImageBlock…）

export function CollabEditor({ room, user }: { room: string; user: { name: string; color: string } }) {
  // Y.Doc/Provider 必须保持引用稳定：绝不能放进 useState 每次渲染重建
  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('wss://collab.example.com', room, ydoc);
    return { ydoc, provider };
  }, [room]);

  useEffect(() => () => { provider.destroy(); ydoc.destroy(); }, [provider, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),   // ★ 必须关掉内置 undo：双 history 会撕碎 CRDT 状态
      Placeholder.configure({ placeholder: "输入 '/' 唤起命令…" }),
      Collaboration.configure({ document: ydoc }),        // = y-prosemirror 的 ySyncPlugin
      CollaborationCursor.configure({ provider, user }),  // = yCursorPlugin：他人光标/名字牌
    ],
    editorProps: { attributes: { class: 'notion-editor' } },
  });

  // undo/redo 走协同扩展提供的命令（背后是 Y.UndoManager：只回滚"自己"的编辑）
  // editor.chain().focus().undo().run() / editor.chain().focus().redo().run()

  return (
    <div className="notion-scroll" style={{ maxWidth: 720, margin: '0 auto' }}>
      {editor && <EditorContent editor={editor} />}
    </div>
  );
}
```

五个要点（面试高频）：① **相对位置**——CRDT 的位置锚定在邻居字符上而非绝对偏移，两人同时在同段插字互不丢；② **undo 语义**——Y.UndoManager 只撤销自己的操作，且可配置 `trustedOrigins` 让"程序化写入"（如 AI 插入）不污染用户撤销栈；③ **awareness 瞬态**——光标/选区/在线名单走 awareness（不持久化、断线即逝），文档数据走 Y.Doc（持久化）；④ **离线**——断网照常编辑，本地 Y.Doc 缓存（IndexedDB 可选 y-indexeddb），重连自动 merge；⑤ **服务端无脑转发**——自建 y-websocket/Hocuspocus 只需要广播消息，不理解文档（CRDT 的精髓：一致性计算全在客户端）。

**常见坑（症状 → 根因 → 修法）**：症状——双人编辑时对方的光标渲染成"一长条选区"或位置漂移。根因：CollaborationCursor 没配 user（名字/颜色缺失时退化渲染），或与 `editorProps.decorations` 里自己的全量 decorations 冲突（光标也是 decorations，被你的整组 set 覆盖）。修法：用 `Plugin` 维护的独立 DecorationSet（走 `.map()`，见坑 3 与路线 8 的写法），不要在 editorProps 里整组覆盖 decorations。

### 难点与坑

- ⚠️ **中文 IME 组合期间 Input Rule 误触发**——症状 → 根因 → 修法：

  症状：用拼音输入"标题"二字，敲到中间态（如拼音串 "biaoti" 某刻显示成 "b"）时页面突然把整块变成了标题；或候选框开着按 Enter 选词，结果 Slash 菜单把 Enter 消费了、执行了命令。根因：IME 组合（composition）期间，浏览器每个按键仍派发 keydown，且 `event.isComposing === true`、`keyCode === 229`；ProseMirror 内核的 input rule 和命令系统会正确跳过组合期（它有专门的输入法协调器），**但你自己的代码不会**——extension 的 `addKeyboardShortcuts`、Slash 菜单的 keydown、window 级监听，都会在组合期间照常触发。修法：给所有自定义键盘路径加同一道闸：

  ```ts
  // 判定：composition 期间的事件特征是 isComposing=true 或 keyCode=229（Safari 老版本只给 229）
  export const isComposingEvent = (e: KeyboardEvent) => e.isComposing || e.keyCode === 229;

  // 用法一：Suggestion 菜单的 onKeyDown（Slash 菜单就是在这里吃掉 Enter 的）
  // SlashMenu 里已经内置：组合期的按键一律不消费，还给浏览器继续选词
  onKeyDown: ({ event }) => {
    if (isComposingEvent(event)) return false;
    if (event.key === 'Enter') { /* ...执行选中项 */ return true; }
    return false;
  },

  // 用法二：window 级自定义快捷键/浮层（Bubble 工具栏等）
  window.addEventListener('keydown', (e) => {
    if (isComposingEvent(e)) return; // 组合期不消费、不 preventDefault
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openQuickFind(); }
  });

  // 用法三：React 组件层维护组合状态（需要连续判定时比单事件判断更稳）
  import { useEffect, useState } from 'react';
  export function useIsComposing() {
    const [composing, setComposing] = useState(false);
    useEffect(() => {
      const on = () => setComposing(true);
      const off = () => setComposing(false);
      window.addEventListener('compositionstart', on);
      window.addEventListener('compositionend', off);
      return () => {
        window.removeEventListener('compositionstart', on);
        window.removeEventListener('compositionend', off);
      };
    }, []);
    return composing;
  }
  ```

  三条纪律：组合期间**不消费按键**（上面的闸）、**不 preventDefault**（会打断候选框）、**不 dispatch transaction**（PM 正在缓冲组合文本，外部写入会与提交时序赛跑）。
- ⚠️ **粘贴 Excel/Word 富文本清洗（白名单 schema）**——症状 → 根因 → 修法：

  症状：从 Excel 粘一段，文档里出现成百上千个 `<span>`、字号/字体全乱；从 Word 粘贴带出 `mso-*` 私有样式与隐藏元素；偶尔还有整段内容凭空消失。根因：PM 的 schema 本身就是白名单（未知标签解析时会被丢弃或拆解），但两个漏洞让它失效：① 某些扩展的 `parseHTML` 规则太宽（`tag: 'span'`、getAttrs 透传 style/class），把垃圾当合法内容收进来；② 拆解顺序问题——`<o:p>`、条件注释这类 Office 私有标签被"拆出子树"后其中的 style 级联污染后续解析。修法分两层：

  ```ts
  // 第一层：粘贴 HTML 进编辑器前先做 DOM 白名单清洗（编辑器 props）
  import { sanitizePastedHTML } from './sanitizePaste';

  const editor = useEditor({
    editorProps: {
      transformPastedHTML: (html) => sanitizePastedHTML(html), // ★ 粘贴专用管道，不影响本编辑器自身 HTML
    },
  });
  ```

  ```ts
  // src/notion-clone/sanitizePaste.ts —— DOM 白名单清洗：标签级 + 属性级
  const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'A', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
  ]);
  const DROP_WITH_SUBTREE = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE', 'O:P']);
  const ALLOWED_ATTRS: Record<string, Set<string>> = {
    A: new Set(['href']),            // 链接只留 href（target/rel 由编辑器补）
    TD: new Set(['colspan', 'rowspan']), // 表格只留跨度
    TH: new Set(['colspan', 'rowspan']),
  };

  export function sanitizePastedHTML(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walk = (el: Element): void => {
      for (const child of Array.from(el.children)) { // 快照：改结构不影响迭代
        if (DROP_WITH_SUBTREE.has(child.tagName)) { child.remove(); continue; }
        if (!ALLOWED_TAGS.has(child.tagName)) {
          // 不在白名单：保留子树（文字不能丢），把自己拆掉；拆完重扫本层（新上来的元素还没过审）
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          walk(el);
          return;
        }
        for (const attr of Array.from(child.attributes)) {
          if (!ALLOWED_ATTRS[child.tagName]?.has(attr.name)) child.removeAttribute(attr.name); // style/class/on* 全清
        }
        walk(child);
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }
  ```

  第二层：schema 收口——每个自定义扩展的 `parseHTML` 规则加 `getAttributes` 白名单（只取需要的属性），并且永远不要透传 `style`。Excel 的"纯文本列"粘贴路径再补一条：无格式粘贴（⌘⇧V）引导或 `clipboardTextParser` 兜底。
- ⚠️ **超长文档性能（避免全量 decorations）**——症状 → 根因 → 修法：

  症状：文档几百块后，每敲一个字卡 100–300ms，且卡顿随文档长度线性增长；协同开启时更明显。根因三连：① 某插件（常见是自写的"给每块加 class/decoration"）在 `apply()` 里**每次事务都对全文档重建 DecorationSet**——O(块数)，输入又是高频事务，二者相乘；② 代码里每次 update 都 `editor.getHTML()/getJSON()`（克隆整棵树，O(n) 且产生大字符串）做副作用（同步预览/字数统计）；③ 语法高亮（lowlight）对未变化的代码块重复 parse。修法：

  ```ts
  // ① DecorationSet 的正道：增量 map + 局部重建（路线 8 的 FoldHeadings 是完整模板）
  apply(tr, value, _old, newState) {
    // 先随编辑平移，O(受影响 decoration 数)：
    let decos = value.decos.map(tr.mapping, tr.doc);
    const meta = tr.getMeta(myKey);
    if (meta?.dirtyRange) {
      // 只在"受影响的范围"重建：clear 该区间的旧 decorations，再对新区间 create
      decos = decos.remove(decos.find(meta.dirtyRange.from, meta.dirtyRange.to));
      decos = decos.add(newState.doc, buildDecosFor(newState.doc, meta.dirtyRange));
    }
    return { ...value, decos };
  }

  // ② 副作用别用 getHTML：字数统计直接数 doc
  const words = editor.state.doc.textContent.length;
  // 需要局部数据时用 nodesBetween 而不是全树克隆：
  editor.state.doc.nodesBetween(from, to, (node) => { /* 只扫区间 */ });

  // ③ 高亮缓存：以"代码块文本 hash + language"为 key 缓存 parse 结果，未变不重算
  ```

  验证方法：React Profiler + Performance 面板录一次键入，长事务应全部落在 `apply`/`DecorationSet.create` 之外；文档 500 块时单次键入的 JS 耗时应与 5 块时同数量级。

### ✅ 产出：验收清单

一个可用的类 Notion 块编辑器，逐条验收：

- [ ] 块模型：Enter/Backspace/跨块删除按行为规格表全绿（空标题转段落、列表 lift、跨块删除结构自洽三例必测）
- [ ] Markdown 速记：`# `/`- `/`1. `/`> `/`[] `/`[x] ` 全部即时转换；块中间输入不误触发；中文 IME 全程无干扰
- [ ] Slash：`/` 触发、模糊搜索（拼音/英文缩写可搜到）、↑↓ 循环高亮、Enter 执行、Esc 关闭、空 query 显示全量；点击菜单项编辑器不失焦
- [ ] 块拖拽：⠿ 悬停出现；拖拽时目标块高亮（上/下半区判定）；相邻上移/下移/远距离移动三例排序正确；列表内 Tab/Shift+Tab 嵌套升降级
- [ ] 块悬浮工具栏：⠿/＋/复制/转 H2/删除五动作正确；随滚动跟随不漂移
- [ ] 选区工具栏：选中浮出、取消隐藏；跨行选区定位正确；B/I/U/链接生效且按钮态同步
- [ ] NodeView：图片块上传进度条实时更新、上传完成 src 落文档（undo 一步可回滚整个插入）；代码块语言下拉切换后高亮即时变化；装饰控件不破坏编辑
- [ ] 嵌套与折叠：列表三层嵌套 + Backspace 逐级退出；标题折叠/展开后内容零丢失；折叠态在编辑后不错位
- [ ] 协同：双浏览器实编互见；对方光标/名字牌渲染；undo 只回滚自己的操作；断网编辑重连合入
- [ ] 粘贴：Excel 表格进来自带结构无样式污染；Word 文档粘贴白名单清洗后干净；⌘⇧V 纯文本路径可用
- [ ] 性能：500 块文档键入无可感知卡顿（Performance 面板验证无全量 DecorationSet 重建）

### 对标：TipTap 官方示例（逐个 demo 复刻）、Notion 交互逐条拆解

- **TipTap 官方示例**：本章 80% 的交互在官方文档/示例里都有可运行版本，复刻路径按依赖排序：Basic（StarterKit + 占位符）→ Markdown Shortcuts（看清 input rule 默认行为）→ Slash Commands（官方 demo 用 tippy，我们换成 floating-ui 正是理解 render 适配器的练习）→ Bubble/Floating Menu → Task List → Code Block Lowlight → Drag Handle（v2.5+ 官方扩展，对照路线 4 的手写版找差距）→ Collaboration（官方有 y-websocket 演示房间，双开浏览器即可测）。复刻纪律：**每个 demo 先抄后改**——抄通后再按 Notion 行为改判定细节，比凭空写省一个数量级时间。进阶阅读：每个 `@tiptap/extension-*` 包的源码都在几百行以内，是"如何写一个 PM 扩展"的最佳范文。
- **Notion 交互逐条拆解**：拿真 Notion 当验收基准，逐条对照——Enter 在标题/列表/待办三种块的行为、Backspace 空块三连退（待办→列表→段落→删除）、块拖拽的缩进档位提示线、选区工具栏的浮动延迟、Slash 的分组与排序。拆解方法：每个交互写三行记录（触发条件 / 预期结果 / 我的实现差在哪），这份 diff 清单就是本章的毕业答辩材料。
