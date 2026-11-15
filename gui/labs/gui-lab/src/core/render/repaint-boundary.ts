// 重绘边界：isRepaintBoundary = true 的透明容器（布局约束透传，尺寸 = 子）。
// owner.flushPaint 只重记录脏边界；干净边界被父 blit（图层合成）。
import type { BoxConstraints } from "./constraints";
import { RenderObject } from "./render-object";

export class RenderRepaintBoundary extends RenderObject {
  isRepaintBoundary(): boolean {
    return true;
  }

  protected performLayout(c: BoxConstraints): void {
    const child = this.children[0];
    if (child === undefined) {
      this.setSize(c, { width: c.maxWidth, height: c.maxHeight });
      return;
    }
    child.layout(c);
    child.x = 0;
    child.y = 0;
    this.setSize(c, child.size);
  }
}
