import { describe, expect, it } from "vitest";
import { rgba } from "./color";
import { DisplayList, StatefulPainter } from "./painter";
import { rect } from "./geometry";
import { pixelAt, regionHasColor } from "./pixel-probe";

const RED = rgba(255, 0, 0);
const BLUE = rgba(0, 0, 255);

function paint(fn: (p: StatefulPainter) => void): DisplayList {
  const list = new DisplayList();
  const p = new StatefulPainter(list);
  fn(p);
  return list;
}

describe("pixelAt：无头像素断言", () => {
  it("纯色矩形内取色、外部返回 null（背景）", () => {
    const list = paint((p) => p.fillRect(rect(10, 10, 100, 50), RED));
    expect(pixelAt(list, 50, 30)).toEqual(RED);
    expect(pixelAt(list, 5, 5)).toBeNull();
    expect(pixelAt(list, 110, 30)).toBeNull(); // 右界外（半开）
  });

  it("后画盖前画：从后向前扫描", () => {
    const list = paint((p) => {
      p.fillRect(rect(0, 0, 100, 100), RED);
      p.fillRect(rect(40, 40, 30, 30), BLUE);
    });
    expect(pixelAt(list, 50, 50)).toEqual(BLUE); // 蓝盖红
    expect(pixelAt(list, 10, 10)).toEqual(RED);
  });

  it("圆角矩形：角外取不到（圆角判定）", () => {
    const list = paint((p) => p.fillRoundedRect(rect(0, 0, 40, 40), 10, RED));
    expect(pixelAt(list, 20, 20)).toEqual(RED); // 中心
    expect(pixelAt(list, 1, 1)).toBeNull(); // 左上角圆外
    expect(pixelAt(list, 10, 10)).toEqual(RED); // 圆心延伸线内
  });

  it("圆形覆盖", () => {
    const list = paint((p) => p.fillCircle(50, 50, 20, BLUE));
    expect(pixelAt(list, 50, 50)).toEqual(BLUE);
    expect(pixelAt(list, 50, 68)).toEqual(BLUE); // 半径内
    expect(pixelAt(list, 50, 75)).toBeNull();
  });

  it("描边：只有边带取到色，中心取不到", () => {
    const list = paint((p) => p.strokeRect(rect(10, 10, 80, 60), 2, RED));
    expect(pixelAt(list, 10, 30)).toEqual(RED); // 左边带
    expect(pixelAt(list, 50, 30)).toBeNull(); // 中心空心
  });

  it("裁剪：裁剪外的点视同透明", () => {
    const list = paint((p) => {
      p.save();
      p.clipRect(rect(0, 0, 50, 50));
      p.fillRect(rect(0, 0, 100, 100), RED); // 会被裁到 50×50
      p.restore();
    });
    expect(pixelAt(list, 40, 40)).toEqual(RED);
    expect(pixelAt(list, 60, 40)).toBeNull(); // 裁剪排除
  });

  it("regionHasColor：区域内至少一点命中", () => {
    const list = paint((p) => p.fillRect(rect(20, 20, 10, 10), BLUE));
    expect(regionHasColor(list, rect(0, 0, 40, 40), BLUE)).toBe(true);
    expect(regionHasColor(list, rect(100, 100, 20, 20), BLUE)).toBe(false);
  });
});
