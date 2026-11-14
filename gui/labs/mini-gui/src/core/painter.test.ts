import { describe, expect, it } from "vitest";
import { rgba } from "./color";
import { rect } from "./geometry";
import { DisplayList, StatefulPainter } from "./painter";

const RED = rgba(255, 0, 0);

function painterWithList(): { p: StatefulPainter; list: DisplayList } {
  const list = new DisplayList();
  return { p: new StatefulPainter(list), list };
}

describe("变换烘焙", () => {
  it("translate 把相对坐标烘焙成绝对坐标", () => {
    const { p, list } = painterWithList();
    p.translate(10, 20);
    p.fillRect(rect(0, 0, 5, 5), RED);
    expect(list.commands).toEqual([
      { op: "fillRect", rect: { x: 10, y: 20, width: 5, height: 5 }, color: RED, clip: null },
    ]);
  });

  it("save/restore 恢复平移与裁剪", () => {
    const { p, list } = painterWithList();
    p.translate(10, 20);
    p.save();
    p.translate(5, 5);
    p.clipRect(rect(0, 0, 100, 100));
    p.fillRect(rect(0, 0, 1, 1), RED); // 绝对 (15,25)，clip=(15,25,100,100)
    p.restore();
    p.fillRect(rect(0, 0, 1, 1), RED); // 绝对 (10,20)，无 clip
    expect(list.commands.map((c) => c.op)).toEqual(["fillRect", "fillRect"]);
    expect(list.commands[0]).toMatchObject({ rect: { x: 15, y: 25 }, clip: { x: 15, y: 25, width: 100, height: 100 } });
    expect(list.commands[1]).toMatchObject({ rect: { x: 10, y: 20 }, clip: null });
  });

  it("restore 不配对 save 直接抛错（宁可早炸不可静默错画）", () => {
    const { p } = painterWithList();
    expect(() => p.restore()).toThrow(/没有配对的 save/);
  });
});

describe("裁剪栈", () => {
  it("嵌套 clipRect 求交，只裁越小", () => {
    const { p, list } = painterWithList();
    p.clipRect(rect(0, 0, 100, 100));
    p.translate(50, 50);
    p.clipRect(rect(0, 0, 100, 100)); // 绝对 (50,50,100,100)，交出 (50,50,50,50)
    p.fillRect(rect(0, 0, 10, 10), RED);
    expect(list.commands[0]?.clip).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it("完全落在裁剪外的矩形被剔除", () => {
    const { p, list } = painterWithList();
    p.clipRect(rect(0, 0, 50, 50));
    p.fillRect(rect(100, 100, 10, 10), RED); // 在裁剪外
    p.fillRect(rect(40, 40, 20, 20), RED); // 与裁剪搭边，保留
    expect(p.culled).toBe(1);
    expect(list.commands).toHaveLength(1);
    expect(list.commands[0]).toMatchObject({ rect: { x: 40, y: 40, width: 20, height: 20 } });
  });

  it("空裁剪下文本也被粗剔除", () => {
    const { p, list } = painterWithList();
    p.clipRect(rect(0, 0, 10, 10));
    p.clipRect(rect(20, 20, 5, 5)); // 与上面不相交 → 空
    p.text("hello", 0, 0, 16, RED);
    expect(p.culled).toBe(1);
    expect(list.commands).toHaveLength(0);
  });
});

describe("DisplayList", () => {
  it("replay 保序透传到目标", () => {
    const { p, list } = painterWithList();
    p.fillRect(rect(0, 0, 1, 1), RED);
    p.fillCircle(3, 3, 2, RED);
    const target = new DisplayList();
    list.replay(target);
    expect(target.commands).toEqual(list.commands);
  });

  it("countByOp 统计", () => {
    const { p, list } = painterWithList();
    p.fillRect(rect(0, 0, 1, 1), RED);
    p.fillRect(rect(1, 1, 1, 1), RED);
    p.fillCircle(3, 3, 2, RED);
    expect(list.countByOp().get("fillRect")).toBe(2);
    expect(list.countByOp().get("fillCircle")).toBe(1);
  });

  it("clipSwitches 统计裁剪状态切换", () => {
    const { p, list } = painterWithList();
    p.save();
    p.clipRect(rect(0, 0, 10, 10));
    p.fillRect(rect(0, 0, 1, 1), RED); // clip A
    p.fillRect(rect(1, 1, 1, 1), RED); // clip A（不切换）
    p.save();
    p.clipRect(rect(2, 2, 5, 5));
    p.fillRect(rect(2, 2, 1, 1), RED); // clip B（切换）
    p.restore();
    p.fillRect(rect(3, 3, 1, 1), RED); // 回到 clip A（切换）
    p.restore();
    p.fillRect(rect(4, 4, 1, 1), RED); // 无 clip（切换）
    expect(list.clipSwitches()).toBe(4);
  });
});
