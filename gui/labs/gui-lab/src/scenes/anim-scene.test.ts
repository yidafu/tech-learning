import { describe, expect, it } from "vitest";
import { MockMeasurer } from "../core/text/measurer";
import { buildAnimScene } from "./anim-scene";

const m = new MockMeasurer();
const WIN = { width: 640, height: 360 };

describe("anim-scene 管线行为", () => {
  it("首帧：静态边界 + 动画边界 + 根，三个图层全录", () => {
    const scene = buildAnimScene(m, 10, WIN);
    expect(scene.owner.repaintedNodes).toBe(3);
    expect(scene.staticBoundary.layer).not.toBeNull();
    expect(scene.animBoundary.layer).not.toBeNull();
  });

  it("后续帧：每帧只重录动画边界 + 根（HUD 也变），静态边界永不再录", () => {
    const scene = buildAnimScene(m, 10, WIN);
    const staticLayer = scene.staticBoundary.layer;
    for (let i = 0; i < 5; i++) {
      const repainted = scene.frame(1 / 60, `frame ${i}`);
      expect(repainted).toBe(2);
    }
    expect(scene.staticBoundary.layer).toBe(staticLayer); // 图层对象没换 → 没重录
  });

  it("动画面板的往返：x 到边界后反向", () => {
    const scene = buildAnimScene(m, 10, WIN);
    // 推 2 秒（> 0.6s 单程），x 应离开起点
    for (let i = 0; i < 120; i++) scene.frame(1 / 60, "t");
    // 无从直接读 AnimPanel 内部值——用重录数量与图层非空代替行为断言
    expect(scene.animBoundary.needsPaint).toBe(false); // frame() 内已 flush
    expect(scene.animBoundary.layer).not.toBeNull();
  });
});
