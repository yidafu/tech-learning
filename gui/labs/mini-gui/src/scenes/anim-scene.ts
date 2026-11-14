// 动画场景：静态面板（被 blit 的干净边界）vs 动画面板（每帧重录的边界）+ HUD。
// 第六阶段 demo 树 + 无头测试共用（纯 TS）。
import { PALETTE, rgba } from "../core/color";
import type { Painter } from "../core/painter";
import type { BoxConstraints } from "../core/render/constraints";
import { RenderObject } from "../core/render/render-object";
import { AnimatedValue, Curves } from "../core/animation";
import { PipelineOwner } from "../core/render/owner";
import { RenderColoredBox } from "../core/render/layout-widgets";
import { FlexDirection, RenderFlex } from "../core/render/flex";
import { RenderRepaintBoundary } from "../core/render/repaint-boundary";
import { RenderText } from "../core/render/text-object";
import type { TextMeasurer } from "../core/text/measurer";

/** 动画面板：方块左右往返（隐式动画）+ 圆呼吸（弹性曲线）。 */
class AnimPanel extends RenderObject {
  private animX = new AnimatedValue(10, 0.6, Curves.easeInOut);
  private radius = new AnimatedValue(20, 1.2, Curves.elasticOut);
  private xDir = 1;

  protected performLayout(_c: BoxConstraints): void {
    this.width = 300;
    this.height = 200;
  }

  protected isFixedSize(): boolean {
    return true;
  }

  /** 每帧推进（dt 秒）；到位自动反向。 */
  tick(dt: number): void {
    if (!this.animX.tick(dt)) {
      this.xDir = -this.xDir;
      this.animX.set(this.xDir > 0 ? 10 : 200);
    }
    if (!this.radius.tick(dt)) {
      this.radius.set(this.radius.target > 25 ? 18 : 30);
    }
    this.markNeedsPaint();
  }

  protected paintSelf(p: Painter): void {
    p.fillRoundedRect({ x: 0, y: 0, width: this.width, height: this.height }, 10, PALETTE.surface);
    p.fillRect({ x: this.animX.current, y: 40, width: 60, height: 60 }, PALETTE.accent);
    p.fillCircle(230, 140, this.radius.current, PALETTE.ok);
  }
}

export interface AnimScene {
  root: RenderObject;
  owner: PipelineOwner;
  staticBoundary: RenderRepaintBoundary;
  animBoundary: RenderRepaintBoundary;
  hud: RenderText;
  /** 推进一帧（动画 + 管线）；返回本帧重录节点数。 */
  frame(dt: number, hudText: string): number;
}

export function buildAnimScene(measurer: TextMeasurer, fontSize: number, win: { width: number; height: number }): AnimScene {
  const staticBoundary = new RenderRepaintBoundary();
  const staticPanel = new RenderText(
    [{ text: "static panel (blitted, painted once)" }],
    { fontSize, color: PALETTE.textMuted },
    measurer,
  );
  staticBoundary.appendChild(staticPanel);

  const animBoundary = new RenderRepaintBoundary();
  const animPanel = new AnimPanel();
  animBoundary.appendChild(animPanel);

  const row = new RenderFlex({ direction: FlexDirection.row, gap: 16 });
  row.appendChild(staticBoundary);
  row.appendChild(animBoundary);

  const hud = new RenderText([{ text: "" }], { fontSize, color: PALETTE.text }, measurer);

  const root = new RenderColoredBox(rgba(245, 246, 248));
  const col = new RenderFlex({ direction: FlexDirection.column, gap: 12 });
  col.appendChild(row);
  col.appendChild(hud);
  root.appendChild(col);

  const owner = new PipelineOwner();
  owner.mount(root, win, { tightRoot: true });
  owner.frame();

  return {
    root,
    owner,
    staticBoundary,
    animBoundary,
    hud,
    frame(dt: number, hudText: string): number {
      animPanel.tick(dt);
      hud.setText([{ text: hudText }]);
      owner.frame();
      return owner.repaintedNodes;
    },
  };
}
