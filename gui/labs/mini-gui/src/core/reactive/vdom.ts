// 声明式组件层：VNode（值描述）→ Element（协调节点）→ RenderObject（渲染树）。
// 第四阶段为了教学简化砍掉了 Element 树；本阶段把它以最小形态补回来——
// 每个协调节点在构建时记下「具体渲染对象」的引用（类型化字段，不用向下转型：
// ScriptC 0.0.35 不支持类值 as 转换，实测 SC1090），协调时直接用具体引用原地更新。
//
// 对照 react 站的 VDOM/Fiber 全量 diff：这里是「同 key/同类型 → 复用 Element 并原地更新，
// 否则重建子树」——细粒度复用，无跨树遍历。
import type { Color } from "../color";
import type { PointerEvent } from "../events/events";
import { RenderBox, RenderPadding, edgeInsets } from "../render/layout-widgets";
import { FlexDirection, RenderExpanded, RenderFlex } from "../render/flex";
import { RenderRepaintBoundary } from "../render/repaint-boundary";
import { RenderText } from "../render/text-object";
import type { RenderObject } from "../render/render-object";
import type { TextMeasurer } from "../text/measurer";
import type { TextSpan } from "../text/text-layout";
import { RenderButton } from "../../scenes/interactive-scene";

export interface VNodeBase {
  /** 列表协调键：同 key 复用节点（状态保留）；缺省按「第一个未用的同类型」匹配。 */
  key?: number | undefined;
}

export interface BoxVNode extends VNodeBase {
  kind: "box";
  width: number;
  height: number;
  color: Color;
  child?: VNode | undefined;
}
export interface TextVNode extends VNodeBase {
  kind: "text";
  spans: TextSpan[];
  fontSize: number;
  color: Color;
  maxLines?: number | undefined;
}
export interface FlexVNode extends VNodeBase {
  kind: "row" | "column";
  gap: number;
  children: VNode[];
}
export interface PaddingVNode extends VNodeBase {
  kind: "padding";
  inset: number;
  child: VNode;
}
export interface ExpandedVNode extends VNodeBase {
  kind: "expanded";
  flex: number;
  child: VNode;
}
export interface BoundaryVNode extends VNodeBase {
  kind: "boundary";
  child: VNode;
}
export interface ButtonVNode extends VNodeBase {
  kind: "button";
  label: string;
  onClick: (() => void) | null;
}

export type VNode =
  | BoxVNode
  | TextVNode
  | FlexVNode
  | PaddingVNode
  | ExpandedVNode
  | BoundaryVNode
  | ButtonVNode;

/**
 * 协调节点：包住一个 RenderObject，并记下它的具体类型（恰好一个非 null）。
 * 身份即复用单元：keyed 列表里保住 Element 就是保住它的渲染对象与其中的状态。
 */
export class VElement {
  vnode: VNode;
  node: RenderObject;
  parent: VElement | null = null;
  children: VElement[] = [];
  // 具体类型槽（构建时恰好一个非 null；协调据此分发，零向下转型）
  box: RenderBox | null = null;
  text: RenderText | null = null;
  flex: RenderFlex | null = null;
  pad: RenderPadding | null = null;
  expanded: RenderExpanded | null = null;
  boundary: RenderRepaintBoundary | null = null;
  button: RenderButton | null = null;

  constructor(vnode: VNode, node: RenderObject) {
    this.vnode = vnode;
    this.node = node;
  }
}

/** 组件：一棵受协调管理的 VElement 子树（root 可挂到任意渲染父节点上）。 */
export class Component {
  root: VElement | null = null;
  private measurer: TextMeasurer;
  /** 渲染树根（VElement.root.node 的快捷访问）。 */
  renderRoot: RenderObject | null = null;

  constructor(measurer: TextMeasurer) {
    this.measurer = measurer;
  }

  /** 首次挂载或后续更新：diff 增量应用到渲染树；顶层类型变化才整树重建。 */
  update(v: VNode): RenderObject {
    if (this.root === null) {
      this.root = mount(v, null, this.measurer);
      this.renderRoot = this.root.node;
      return this.root.node;
    }
    if (this.root.vnode.kind !== v.kind) {
      // 顶层类型变化：整树重建（挂接方负责换子；这里直接替换 root）
      this.root = mount(v, null, this.measurer);
      this.renderRoot = this.root.node;
      return this.root.node;
    }
    updateElement(this.root, v, this.measurer);
    this.root.vnode = v;
    return this.root.node;
  }
}

// ---- 挂载 ----
function mount(v: VNode, parent: VElement | null, m: TextMeasurer): VElement {
  let el: VElement;
  switch (v.kind) {
    case "box": {
      const box = new RenderBox(v.width, v.height, v.color);
      el = new VElement(v, box);
      el.box = box;
      break;
    }
    case "text": {
      const opts: import("../render/text-object").RenderTextOptions = { fontSize: v.fontSize, color: v.color };
      if (v.maxLines !== undefined) opts.maxLines = v.maxLines;
      const text = new RenderText(v.spans, opts, m);
      el = new VElement(v, text);
      el.text = text;
      break;
    }
    case "row":
    case "column": {
      const flex = new RenderFlex({
        direction: v.kind === "row" ? FlexDirection.row : FlexDirection.column,
        gap: v.gap,
      });
      el = new VElement(v, flex);
      el.flex = flex;
      break;
    }
    case "padding": {
      const pad = new RenderPadding(edgeInsets(v.inset));
      el = new VElement(v, pad);
      el.pad = pad;
      break;
    }
    case "expanded": {
      const exp = new RenderExpanded(v.flex, placeholderLeaf());
      el = new VElement(v, exp);
      el.expanded = exp;
      break;
    }
    case "boundary": {
      const b = new RenderRepaintBoundary();
      el = new VElement(v, b);
      el.boundary = b;
      break;
    }
    case "button": {
      const btn = new RenderButton(v.label, 16, m, v.onClick === null ? undefined : v.onClick);
      el = new VElement(v, btn);
      el.button = btn;
      break;
    }
  }
  el.parent = parent;
  // 子挂载（expanded 的 child 走包装节点的孩子槽）
  if (v.kind === "box" && v.child !== undefined) attachChild(el, v.child, m);
  else if (v.kind === "padding") attachChild(el, v.child, m);
  else if (v.kind === "expanded") attachChild(el, v.child, m);
  else if (v.kind === "boundary") attachChild(el, v.child, m);
  else if (v.kind === "row" || v.kind === "column") {
    for (const c of v.children) attachChild(el, c, m);
  }
  return el;
}

function attachChild(el: VElement, v: VNode, m: TextMeasurer): void {
  const child = mount(v, el, m);
  el.children.push(child);
  el.node.appendChild(child.node);
}

/** Expanded 构造时需要先有一个子占位（随后立即被 attachChild 替换）。 */
function placeholderLeaf(): RenderObject {
  return new RenderBox(0, 0, { r: 0, g: 0, b: 0, a: 0 });
}

// ---- 原地更新 ----
function updateElement(el: VElement, v: VNode, m: TextMeasurer): void {
  el.vnode = v;
  if (el.box !== null && v.kind === "box") {
    const box = el.box;
    if (box.boxWidth !== v.width || box.boxHeight !== v.height) {
      box.boxWidth = v.width;
      box.boxHeight = v.height;
      box.markNeedsLayout();
    }
    if (box.color !== v.color) {
      box.color = v.color;
      box.markNeedsPaint();
    }
    reconcileChild(el, v.child ?? null, m);
    return;
  }
  if (el.text !== null && v.kind === "text") {
    const text = el.text;
    // 细粒度路线（Solid 式）：样式就地赋值（setStyle 内部同值短路），不重建节点
    text.setStyle({ fontSize: v.fontSize, color: v.color });
    if (v.maxLines !== undefined) text.setStyle({ maxLines: v.maxLines });
    text.setText(v.spans);
    return;
  }
  if (el.flex !== null && (v.kind === "row" || v.kind === "column")) {
    const flex = el.flex;
    if (flex.gap !== v.gap) {
      flex.gap = v.gap;
      flex.markNeedsLayout();
    }
    reconcileChildren(el, v.children, m);
    return;
  }
  if (el.pad !== null && v.kind === "padding") {
    const pad = el.pad;
    if (pad.insets.left !== v.inset) {
      pad.insets = edgeInsets(v.inset);
      pad.markNeedsLayout();
    }
    reconcileChild(el, v.child, m);
    return;
  }
  if (el.expanded !== null && v.kind === "expanded") {
    const exp = el.expanded;
    if (exp.flex !== v.flex) {
      exp.flex = v.flex;
      exp.markNeedsLayout();
    }
    reconcileChild(el, v.child, m);
    return;
  }
  if (el.boundary !== null && v.kind === "boundary") {
    reconcileChild(el, v.child, m);
    return;
  }
  if (el.button !== null && v.kind === "button") {
    const btn = el.button;
    if (btn.label !== v.label) {
      btn.label = v.label;
      btn.markNeedsLayout();
    }
    // 不写三元压缩：SC2003 对「(unknown)=>void | null」联合重标记报错，两分支显式写
    const click = v.onClick;
    if (click === null) {
      btn.setOnClick(null);
    } else {
      btn.setOnClick((_ev: PointerEvent) => {
        click();
      });
    }
    return;
  }
}

/** 单子协调：同类型原地更新，否则换子（含文本样式变化引起的重建）。 */
function reconcileChild(el: VElement, v: VNode | null, m: TextMeasurer): void {
  const existing = el.children[0] ?? null;
  if (v === null) {
    if (existing !== null) detachChild(el, existing);
    return;
  }
  if (existing === null) {
    attachChild(el, v, m);
    return;
  }
  if (existing.vnode.kind !== v.kind) {
    detachChild(el, existing);
    attachChild(el, v, m);
    return;
  }
  updateElement(existing, v, m);
  existing.vnode = v;
}

/**
 * keyed 列表协调：同 key（双方无 key 则按位同类型）复用 VElement；顺序重排；
 * 消失的卸载、新增的挂载。复用 = 身份不变（焦点、动画状态得以保留）。
 */
function reconcileChildren(el: VElement, newKids: VNode[], m: TextMeasurer): void {
  const oldEls = el.children.slice();
  const used: boolean[] = [];
  for (let j = 0; j < oldEls.length; j++) used.push(false);

  const kept: VElement[] = [];

  for (const nv of newKids) {
    let matched = -1;
    for (let j = 0; j < oldEls.length; j++) {
      if (used[j]) continue;
      const oe = oldEls[j]!;
      if (oe.vnode.kind !== nv.kind) continue;
      if (nv.key !== undefined || oe.vnode.key !== undefined) {
        if (oe.vnode.key !== nv.key) continue; // 任一方带 key：必须相等才复用
      }
      matched = j;
      break;
    }
    if (matched >= 0) {
      used[matched] = true;
      const keptEl = oldEls[matched]!;
      updateElement(keptEl, nv, m);
      keptEl.vnode = nv;
      kept.push(keptEl);
    } else {
      kept.push(mount(nv, el, m));
    }
  }

  // 卸载未复用的
  for (let j = 0; j < oldEls.length; j++) {
    if (!used[j]) detachElement(el, oldEls[j]!);
  }

  // 重排：clear + 按新序挂回（渲染树上 remove+append 保持父指针）
  for (const child of el.children.slice()) {
    el.node.removeChild(child.node);
  }
  el.children = [];
  for (const child of kept) {
    el.children.push(child);
    child.parent = el;
    el.node.appendChild(child.node);
  }
  el.node.markNeedsLayout();
}

function detachChild(el: VElement, child: VElement): void {
  el.node.removeChild(child.node);
  const idx = el.children.indexOf(child);
  if (idx >= 0) el.children.splice(idx, 1);
  child.parent = null;
}

function detachElement(el: VElement, child: VElement): void {
  detachChild(el, child);
}
