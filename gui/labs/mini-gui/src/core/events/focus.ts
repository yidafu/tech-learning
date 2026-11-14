// 焦点系统：Tab 遍历 + 键盘事件路由。
// 遍历序 = 树序（深度优先，canFocus 的节点按出现顺序）；键盘事件先给焦点节点，
// 未处理（onKey 返回 false / 无 onKey）则沿父链冒泡，最后由 FocusManager 消化 Tab。
import type { KeyEvent } from "./events";
import type { RenderObject } from "../render/render-object";

/** raylib/Glfw 键码（平台无关地写死一份：Tab=258）。 */
export const KEY_TAB = 258;
export const KEY_SHIFT_LEFT = 340;

export class FocusManager {
  private root: RenderObject | null = null;
  private focusables: RenderObject[] = [];
  private focusIndex = -1;

  /** 当前焦点节点（null = 无焦点）。 */
  focused: RenderObject | null = null;

  /** 观测口：焦点移动日志。 */
  readonly log: string[] = [];

  mount(root: RenderObject): void {
    this.root = root;
    this.focusables = [];
    this.collectFocusables(root);
    this.focusIndex = -1;
    this.focused = null;
  }

  private collectFocusables(node: RenderObject): void {
    if (node.canFocus) this.focusables.push(node);
    for (const child of node.children) {
      this.collectFocusables(child);
    }
  }

  focusableCount(): number {
    return this.focusables.length;
  }

  focusNode(node: RenderObject | null): void {
    const idx = node === null ? -1 : this.focusables.indexOf(node);
    if (node !== null && idx < 0) return; // 不可聚焦的节点不给焦点
    // 管理器侧引用 + 节点侧标志必须同步点亮/熄灭——
    // 之前只记管理器侧，控件自身的 focused 守卫永远不亮（demo08 集成实测抓到）
    const prev = this.focused;
    if (prev !== null && prev !== node) prev.focused = false;
    if (node !== null) node.focused = true;
    this.focusIndex = idx;
    this.focused = node;
    this.log.push(node === null ? "focus:null" : `focus:${this.nodeLabel(node)}`);
  }

  focusNext(): void {
    if (this.focusables.length === 0) return;
    this.focusIndex = (this.focusIndex + 1) % this.focusables.length;
    this.applyIndex();
  }

  focusPrev(): void {
    if (this.focusables.length === 0) return;
    this.focusIndex = this.focusIndex - 1;
    if (this.focusIndex < 0) this.focusIndex = this.focusables.length - 1;
    this.applyIndex();
  }

  private applyIndex(): void {
    const node = this.focusables[this.focusIndex] ?? null;
    this.focused = node;
    this.log.push(node === null ? "focus:none" : `focus:${this.nodeLabel(node)}`);
  }

  private nodeLabel(node: RenderObject): string {
    // RenderBox 有 color 字段可用作测试标签；其余用树内序号
    return `#${this.indexOfNode(this.root, node)}`;
  }

  private indexOfNode(root: RenderObject | null, target: RenderObject): number {
    let counter = 0;
    const walk = (n: RenderObject): boolean => {
      if (n === target) return true;
      counter += 1;
      for (const c of n.children) {
        if (walk(c)) return true;
      }
      return false;
    };
    if (root === null) return -1;
    return walk(root) ? counter : -1;
  }

  /** 键盘事件入口：焦点链冒泡 → 焦点管理器消化 Tab。返回是否有人处理。 */
  dispatchKey(ev: KeyEvent): boolean {
    // Tab 永远先由焦点系统处理（shift+tab 反向）
    if (ev.code === KEY_TAB) {
      if (ev.modifiers.shift) {
        this.focusPrev();
      } else {
        this.focusNext();
      }
      return true;
    }

    // 焦点节点先吃；没吃掉的沿父链冒泡
    let node: RenderObject | null = this.focused;
    while (node !== null) {
      if (node.onKey(ev)) return true;
      node = node.parent;
    }
    return false;
  }
}
