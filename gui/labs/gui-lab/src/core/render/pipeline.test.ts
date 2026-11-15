import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { DisplayList, StatefulPainter, type Painter } from "../painter";
import { PipelineOwner } from "./owner";
import { RenderBox, RenderColoredBox } from "./layout-widgets";
import { RenderFlex } from "./flex";
import { RenderRepaintBoundary } from "./repaint-boundary";
import type { RenderObject } from "./render-object";

/** 统计 paintSelf 调用次数的探针盒子。 */
class ProbeBox extends RenderBox {
  paintCount = 0;
  constructor(w: number, h: number) {
    super(w, h, rgba(9, 9, 9));
  }
  protected paintSelf(p: Painter): void {
    this.paintCount += 1;
    super.paintSelf(p);
  }
}

/** 两块被 RepaintBoundary 包住的静态面板（探针在面板深处）。 */
function buildTree(): {
  root: RenderObject;
  owner: PipelineOwner;
  left: RenderRepaintBoundary;
  right: RenderRepaintBoundary;
  leftProbe: ProbeBox;
  rightProbe: ProbeBox;
} {
  const root = new RenderColoredBox(rgba(1, 1, 1));
  const row = new RenderFlex({});
  const left = new RenderRepaintBoundary();
  const right = new RenderRepaintBoundary();
  const leftProbe = new ProbeBox(100, 100);
  const rightProbe = new ProbeBox(80, 60); // 异尺寸：让「按尺寸找命令」能区分左右探针
  left.appendChild(leftProbe);
  right.appendChild(rightProbe);
  row.appendChild(left);
  row.appendChild(right);
  root.appendChild(row);
  const owner = new PipelineOwner();
  owner.mount(root, { width: 400, height: 300 }, { tightRoot: false });
  owner.frame();
  return { root, owner, left, right, leftProbe, rightProbe };
}

describe("脏标记管线与重绘边界", () => {
  it("首帧：两个边界 + 根都记录图层，探针各画一次", () => {
    const { owner, leftProbe, rightProbe } = buildTree();
    expect(owner.repaintedNodes).toBe(3); // left + right + root
    expect(leftProbe.paintCount).toBe(1);
    expect(rightProbe.paintCount).toBe(1);
    expect(leftProbe.parent?.layer).not.toBeNull();
  });

  it("无变化帧：零重录、零 paintSelf", () => {
    const { owner, leftProbe, rightProbe } = buildTree();
    owner.frame();
    expect(owner.repaintedNodes).toBe(0);
    expect(leftProbe.paintCount).toBe(1);
    expect(rightProbe.paintCount).toBe(1);
  });

  it("左面板变化：只有左边界 + 根重录，右探针不再画（图层合成）", () => {
    const { owner, left, leftProbe, rightProbe, root } = buildTree();
    leftProbe.markNeedsPaint();
    owner.frame();
    expect(owner.repaintedNodes).toBe(2); // left（深）+ root（祖先链），right 不动
    expect(left.needsPaint).toBe(false);
    expect(leftProbe.paintCount).toBe(2); // 左子树真的重画了
    expect(rightProbe.paintCount).toBe(1); // 右子树被 blit，没跑 paint 逻辑
    expect(root.needsPaint).toBe(false);
  });

  it("重录后的根图层包含左面板新内容（blit 拷贝命令）", () => {
    const { owner, leftProbe, root } = buildTree();
    const colorBefore = (root.layer as DisplayList).commands.length;
    leftProbe.markNeedsPaint();
    owner.frame();
    const colorAfter = (root.layer as DisplayList).commands.length;
    expect(colorAfter).toBe(colorBefore); // blit 是命令拷贝：根图层命令数不变
  });

  it("布局失效级联绘制失效（setText/重排 → 重画）", () => {
    const { owner, leftProbe } = buildTree();
    leftProbe.boxWidth = 120;
    leftProbe.markNeedsLayout();
    owner.frame();
    expect(leftProbe.paintCount).toBe(2); // 重排过 → 必重画
  });

  it("绘制坐标与命中坐标一致：子盒的命令烘焙在绝对位置", () => {
    // 直接构建：盒子 (100,50) 尺寸 30×20，paint 后命令应落在 (100,50)
    // （注意：不走 layout 时 width/height 需手动就位，RenderBox 构造参数是期望值）
    const box = new RenderBox(30, 20, rgba(5, 5, 5));
    box.x = 100;
    box.y = 50;
    box.width = 30;
    box.height = 20;
    const list = new DisplayList();
    const painter = new StatefulPainter(list);
    box.paint(painter);
    expect(list.commands[0]).toMatchObject({
      op: "fillRect",
      rect: { x: 100, y: 50, width: 30, height: 20 },
    });
  });

  it("干净边界子树被 blit 到子偏移处（绝对位置不因合成而漂移）", () => {
    const { owner, root, right, rightProbe } = buildTree();
    const row = root.children[0] as import("./flex").RenderFlex;
    void row;
    const findProbeRect = (w: number): { x: number; y: number } | null => {
      const cmds = (root.layer as DisplayList).commands;
      for (const c of cmds) {
        if (c.op === "fillRect" && c.rect.width === w && c.rect.height === rightProbe.height) {
          return { x: c.rect.x, y: c.rect.y };
        }
      }
      return null;
    };
    // 右面板在行内 x=100（左面板宽 100）——blit 必须把它的命令平移到 100
    const before = findProbeRect(rightProbe.width);
    expect(before).toEqual({ x: right.x, y: right.y });
    rightProbe.markNeedsPaint();
    owner.frame();
    const after = findProbeRect(rightProbe.width);
    expect(after).toEqual({ x: right.x, y: right.y }); // 重录前后位置一致
    expect(right.x).toBe(100); // 防退化：右面板确有非零偏移
  });
});
