import { describe, expect, it } from "vitest";
import { MockMeasurer } from "../core/text/measurer";
import { buildReactiveScene } from "./reactive-scene";
import { RenderText } from "../core/render/text-object";

const m = new MockMeasurer();
const WIN = { width: 800, height: 450 };

describe("reactive-scene 无头验证", () => {
  it("初始：六个按钮 + 三项列表，计数 0", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    const row = scene.listHost.parent;
    expect(row).not.toBeNull();
    expect(row!.children.length).toBe(7); // 6 按钮 + 1 列表列
    expect(scene.listHost.children.length).toBe(3);
  });

  it("count +1 → counterText 更新（细粒度路径，不动声明式树）", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    const wavesBefore = scene.waves.value;
    scene.count.set(5);
    scene.owner.frame();
    expect(scene.counterText.textLayout?.lines[0]?.pieces[0]?.text).toBe("count: 5");
    expect(scene.waves.value).toBe(wavesBefore); // 粗粒度波没动
  });

  it("items 加一项 → 列表多一行（声明式波触发）", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    scene.items.set(scene.items.get().concat("delta"));
    scene.owner.frame();
    expect(scene.listHost.children.length).toBe(4);
    const last = scene.listHost.children[3] as RenderText;
    expect(last.textLayout?.lines[0]?.pieces[0]?.text).toBe("3: delta");
  });

  it("remove head → 首行消失、其余复用（节点身份不变）", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    const before = scene.listHost.children.slice();
    scene.items.set(scene.items.get().slice(1));
    scene.owner.frame();
    expect(scene.listHost.children.length).toBe(2);
    expect(scene.listHost.children[0]).toBe(before[1]);
    expect(scene.listHost.children[1]).toBe(before[2]);
  });

  it("shuffle（旋转现有标签）→ 全部节点复用、顺序平移", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    const before = scene.listHost.children.slice();
    const cur = scene.items.get();
    scene.items.set(cur.slice(1).concat([cur[0] ?? ""])); // [beta, gamma, alpha]
    scene.owner.frame();
    expect(scene.listHost.children[0]).toBe(before[1]); // key 跟随标签 → 节点整体前移
    expect(scene.listHost.children[1]).toBe(before[2]);
    expect(scene.listHost.children[2]).toBe(before[0]);
    const first = scene.listHost.children[0] as RenderText;
    expect(first.textLayout?.lines[0]?.pieces[0]?.text).toBe("0: beta");
  });

  it("theme 切换 → 列表文字颜色变化（重渲染波）", () => {
    const scene = buildReactiveScene(m, 10, WIN);
    scene.dark.set(true);
    scene.owner.frame();
    scene.owner.frame();
    // 深色主题下列表第一行的颜色换成了 DARK.muted
    const first = scene.listHost.children[0] as RenderText;
    const t = first.textLayout?.lines[0]?.pieces[0];
    expect(t?.color.g).toBe(152); // DARK.muted = rgba(145,152,161)
  });
});
