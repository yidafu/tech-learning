import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { MockMeasurer } from "../text/measurer";
import { PipelineOwner } from "../render/owner";
import { RenderText } from "../render/text-object";
import { RenderBox } from "../render/layout-widgets";
import { RenderButton } from "../../scenes/interactive-scene";
import { Component } from "./vdom";
import type { VNode } from "./vdom";

const m = new MockMeasurer();
const RED = rgba(255, 0, 0);
const BLUE = rgba(0, 0, 255);

function flush(root: import("../render/render-object").RenderObject): PipelineOwner {
  const owner = new PipelineOwner();
  owner.mount(root, { width: 400, height: 300 }, { tightRoot: false });
  owner.frame();
  return owner;
}

describe("Component 基础", () => {
  it("构建 → 文本更新原地复用（节点身份不变）", () => {
    const comp = new Component(m);
    const root = comp.update({ kind: "text", spans: [{ text: "hello" }], fontSize: 10, color: RED });
    const rt = root as RenderText;
    flush(root);
    expect(rt.size.width).toBe(30);
    const same = comp.update({ kind: "text", spans: [{ text: "hello world" }], fontSize: 10, color: RED });
    expect(same).toBe(root); // 同一实例
    flush(root);
    expect(rt.size.width).toBe(66);
  });

  it("顶层类型变化 → 重建", () => {
    const comp = new Component(m);
    const textRoot = comp.update({ kind: "text", spans: [{ text: "a" }], fontSize: 10, color: RED });
    const boxRoot = comp.update({ kind: "box", width: 10, height: 10, color: BLUE });
    expect(boxRoot).not.toBe(textRoot);
    expect(boxRoot).toBeInstanceOf(RenderBox);
  });

  it("样式变化（字号）→ 原地更新；颜色不变时文本变化 → 复用", () => {
    const comp = new Component(m);
    const r1 = comp.update({ kind: "text", spans: [{ text: "a" }], fontSize: 10, color: RED });
    const r2 = comp.update({ kind: "text", spans: [{ text: "a" }], fontSize: 12, color: RED });
    expect(r2).toBe(r1); // 字号变 → setStyle 原地更新（细粒度：不重建）
    flush(r1);
    expect((r1 as RenderText).size.width).toBeCloseTo(7.2, 6); // a 一字  号
    const r3 = comp.update({ kind: "text", spans: [{ text: "ab" }], fontSize: 12, color: RED });
    expect(r3).toBe(r2); // 只变文本 → 复用
  });
});

describe("keyed 列表协调", () => {
  function listVNode(keys: number[], gap = 4): VNode {
    return {
      kind: "row",
      gap,
      children: keys.map((k) => ({ kind: "text", key: k, spans: [{ text: `item${k}` }], fontSize: 10, color: RED }) as VNode),
    };
  }

  it("同 key 复用（删除中间项后其余节点身份不变）", () => {
    const comp = new Component(m);
    const row = comp.update(listVNode([1, 2, 3])) as import("../render/flex").RenderFlex;
    const before = row.children.slice();
    comp.update(listVNode([1, 3]));
    expect(row.children).toHaveLength(2);
    expect(row.children[0]).toBe(before[0]); // key 1 复用
    expect(row.children[1]).toBe(before[2]); // key 3 复用（跨位移动）
    expect(before[1]!.parent).toBeNull(); // key 2 被移除
  });

  it("头插：新 key 插最前，旧节点全部复用", () => {
    const comp = new Component(m);
    const row = comp.update(listVNode([2, 3])) as import("../render/flex").RenderFlex;
    const old0 = row.children[0]!;
    const old1 = row.children[1]!;
    comp.update(listVNode([1, 2, 3]));
    expect(row.children).toHaveLength(3);
    expect(row.children[1]).toBe(old0);
    expect(row.children[2]).toBe(old1);
  });

  it("顺序重排：节点按 key 跟随移动", () => {
    const comp = new Component(m);
    const row = comp.update(listVNode([1, 2, 3])) as import("../render/flex").RenderFlex;
    const n1 = row.children[0]!;
    const n3 = row.children[2]!;
    comp.update(listVNode([3, 1]));
    expect(row.children[0]).toBe(n3);
    expect(row.children[1]).toBe(n1);
  });

  it("无 key 退化为按位同类型复用", () => {
    const comp = new Component(m);
    const row = comp.update({
      kind: "row",
      gap: 4,
      children: [
        { kind: "box", width: 5, height: 5, color: RED },
        { kind: "box", width: 6, height: 6, color: RED },
      ],
    }) as import("../render/flex").RenderFlex;
    const before = row.children.slice();
    comp.update({
      kind: "row",
      gap: 4,
      children: [
        { kind: "box", width: 7, height: 7, color: BLUE },
        { kind: "text", spans: [{ text: "x" }], fontSize: 10, color: RED }, // 类型变了 → 重建
      ],
    });
    expect(row.children[0]).toBe(before[0]); // 同类型复用并更新
    expect((row.children[0] as RenderBox).boxWidth).toBe(7);
    expect(row.children[1]).not.toBe(before[1]);
  });
});

describe("结构与交互", () => {
  it("嵌套结构增量更新（padding→box 尺寸变化只 markNeedsLayout）", () => {
    const comp = new Component(m);
    const root = comp.update({ kind: "padding", inset: 8, child: { kind: "box", width: 10, height: 10, color: RED } });
    const owner = flush(root);
    const before = owner.totalPerformLayouts;
    comp.update({ kind: "padding", inset: 8, child: { kind: "box", width: 20, height: 10, color: RED } });
    owner.frame();
    expect(owner.totalPerformLayouts).toBeGreaterThan(before); // 确实重排了
    const box = (root as import("../render/layout-widgets").RenderPadding).children[0] as RenderBox;
    expect(box.boxWidth).toBe(20);
  });

  it("按钮的 onClick 布线", () => {
    const comp = new Component(m);
    let clicked = 0;
    const root = comp.update({ kind: "button", label: "go", onClick: () => (clicked += 1) });
    const btn = root as RenderButton;
    flush(root);
    btn.onClick({ kind: "pointer", phase: 0, x: 0, y: 0, button: 0, time: 0, modifiers: { shift: false, ctrl: false, alt: false } });
    expect(clicked).toBe(1);
    // 换 onClick → 新闭包生效
    let clicked2 = 0;
    comp.update({ kind: "button", label: "go", onClick: () => (clicked2 += 1) });
    btn.onClick({ kind: "pointer", phase: 0, x: 0, y: 0, button: 0, time: 0, modifiers: { shift: false, ctrl: false, alt: false } });
    expect(clicked2).toBe(1);
    expect(clicked).toBe(1); // 旧闭包不再触发
  });
});
