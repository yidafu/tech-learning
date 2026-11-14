import { describe, expect, it } from "vitest";
import { RenderBox } from "../render/layout-widgets";
import { RenderObject } from "../render/render-object";
import { FocusManager, KEY_TAB } from "./focus";
import { keyEvent } from "./events";

class Plain extends RenderObject {
  protected performLayout(_c: import("../render/constraints").BoxConstraints): void {
    // 焦点测试不跑布局
  }
}

function buildTree(): { root: Plain; a: RenderBox; b: RenderBox; nested: RenderBox } {
  const root = new Plain();
  root.width = 400;
  root.height = 300;
  const a = new RenderBox(100, 40);
  const b = new RenderBox(100, 40);
  const container = new Plain();
  const nested = new RenderBox(100, 40);
  a.canFocus = true;
  b.canFocus = true;
  nested.canFocus = true;
  root.appendChild(a);
  root.appendChild(b);
  root.appendChild(container);
  container.appendChild(nested);
  return { root, a, b, nested };
}

describe("焦点系统", () => {
  it("Tab 按树序循环（a → b → nested → a）", () => {
    const { root, a, b, nested } = buildTree();
    const fm = new FocusManager();
    fm.mount(root);
    expect(fm.focusableCount()).toBe(3);
    fm.dispatchKey(keyEvent(0, KEY_TAB, 1));
    expect(fm.focused).toBe(a);
    fm.dispatchKey(keyEvent(0, KEY_TAB, 2));
    expect(fm.focused).toBe(b);
    fm.dispatchKey(keyEvent(0, KEY_TAB, 3));
    expect(fm.focused).toBe(nested);
    fm.dispatchKey(keyEvent(0, KEY_TAB, 4));
    expect(fm.focused).toBe(a); // 循环
  });

  it("Shift+Tab 反向", () => {
    const { root, a, nested } = buildTree();
    const fm = new FocusManager();
    fm.mount(root);
    const shift = keyEvent(0, KEY_TAB, 1);
    shift.modifiers = { shift: true, ctrl: false, alt: false };
    fm.dispatchKey(shift);
    expect(fm.focused).toBe(nested); // 从尾部反向
    fm.focusNode(a);
    fm.dispatchKey(shift);
    expect(fm.focused).toBe(nested);
  });

  it("键事件先给焦点节点，未处理沿父链冒泡", () => {
    const { root, a } = buildTree();
    const got: string[] = [];
    a.setOnKey(() => { got.push("a"); return false; });
    root.setOnKey(() => { got.push("root"); return true; });
    const fm = new FocusManager();
    fm.mount(root);
    fm.focusNode(a);
    const handled = fm.dispatchKey(keyEvent(0, 65, 1)); // 'A'
    expect(handled).toBe(true);
    expect(got).toEqual(["a", "root"]);
  });

  it("onKey 返回 true 阻止冒泡", () => {
    const { root, a } = buildTree();
    const got: string[] = [];
    a.setOnKey(() => { got.push("a"); return true; });
    root.setOnKey(() => { got.push("root"); return true; });
    const fm = new FocusManager();
    fm.mount(root);
    fm.focusNode(a);
    fm.dispatchKey(keyEvent(0, 65, 1));
    expect(got).toEqual(["a"]);
  });

  it("focusNode 拒绝不可聚焦节点", () => {
    const { root } = buildTree();
    const notFocusable = new RenderBox(10, 10);
    root.appendChild(notFocusable);
    const fm = new FocusManager();
    fm.mount(root);
    fm.focusNode(notFocusable);
    expect(fm.focused).toBeNull();
  });
});
