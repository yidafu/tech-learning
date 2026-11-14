// 响应式场景：signals 驱动的声明式 UI（计数器 + keyed 列表 + 主题切换）。
// 第七阶段 demo 树 + 无头测试共用（纯 TS）。
// 两种粒度并存：
//   粗粒度：effect(() => comp.update(render())) —— 状态变 → 整树 reconcile（keyed 复用）
//   细粒度：count 的 effect 直接 setText —— 只碰一个 RenderText
import { rgba, type Color } from "../core/color";
import type { TextMeasurer } from "../core/text/measurer";
import { RenderColoredBox } from "../core/render/layout-widgets";
import { FlexDirection, RenderFlex } from "../core/render/flex";
import { PipelineOwner } from "../core/render/owner";
import { RenderText } from "../core/render/text-object";
import { effect, SignalB, SignalList, SignalN } from "../core/reactive/signals";
import { Component, type VNode } from "../core/reactive/vdom";
import type { RenderObject } from "../core/render/render-object";

interface ThemeTokens {
  bg: Color;
  text: Color;
  muted: Color;
}

const LIGHT: ThemeTokens = { bg: rgba(245, 246, 248), text: rgba(31, 35, 40), muted: rgba(89, 99, 110) };
const DARK: ThemeTokens = { bg: rgba(24, 26, 31), text: rgba(230, 237, 243), muted: rgba(145, 152, 161) };

export interface ReactiveScene {
  root: RenderObject;
  owner: PipelineOwner;
  count: SignalN;
  items: SignalList;
  dark: SignalB;
  counterText: RenderText;
  listHost: RenderObject;
  /** 声明式更新波次数（测试观测）。 */
  waves: { value: number };
}

export function buildReactiveScene(measurer: TextMeasurer, fontSize: number, win: { width: number; height: number }): ReactiveScene {
  const count = new SignalN(0);
  const items = new SignalList(["alpha", "beta", "gamma"]);
  const dark = new SignalB(false);
  const waves = { value: 0 };

  const theme = (): ThemeTokens => (dark.get() ? DARK : LIGHT);

  // 细粒度：计数文本只挂一个 effect，直接 setText
  const counterText = new RenderText([{ text: "count: 0" }], { fontSize, color: LIGHT.text }, measurer);
  effect(() => {
    counterText.setText([{ text: `count: ${count.get()}` }]);
  });

  // 粗粒度：整树 reconcile（主题/列表结构变化走这里）
  const listHost = new RenderText([{ text: "" }], { fontSize, color: LIGHT.muted }, measurer); // 占位（结构见下）
  void listHost;

  // 稳定 key：从标签内容派生（demo 内标签唯一）。用下标当 key 会让增删/换序失去身份追踪
  // ——beta(new,key0) 会错配 alpha(old,key0)，节点复用与状态保持全部失效（实测踩过）。
  const keyFor = (label: string): number => {
    let h = 7;
    for (let i = 0; i < label.length; i++) h = h * 31 + (label.charCodeAt(i) % 97);
    return h;
  };

  const render = (): VNode => {
    const t = theme();
    const labels = items.get();
    const kids: VNode[] = labels.map((label) => ({
      kind: "text",
      key: keyFor(label),
      spans: [{ text: `${labels.indexOf(label)}: ${label}` }],
      fontSize,
      color: t.muted,
    }));
    return {
      kind: "row",
      gap: 12,
      children: [
        { kind: "button", label: "-", onClick: () => count.set(count.get() - 1) },
        { kind: "button", label: "+", onClick: () => count.set(count.get() + 1) },
        { kind: "button", label: "add item", onClick: () => items.set(items.get().concat(`item${items.get().length}`)) },
        { kind: "button", label: "remove head", onClick: () => items.set(items.get().slice(1)) },
        { kind: "button", label: "shuffle", onClick: () => {
            const arr = items.get().slice();
            if (arr.length > 1) {
              const head = arr[0] ?? "";
              for (let i = 0; i < arr.length - 1; i++) arr[i] = arr[i + 1] ?? "";
              arr[arr.length - 1] = head;
              items.set(arr);
            }
          } },
        { kind: "button", label: "theme", onClick: () => dark.set(!dark.get()) },
        { kind: "column", gap: 4, children: kids },
      ],
    };
  };

  const comp = new Component(measurer);
  const host = new RenderColoredBox(LIGHT.bg);
  const stack = new RenderFlex({ direction: FlexDirection.column, gap: 12 });
  effect(() => {
    const node = comp.update(render());
    if (node.parent === null) stack.appendChild(node);
    waves.value += 1;
  });
  stack.appendChild(counterText);
  host.appendChild(stack);

  const owner = new PipelineOwner();
  owner.mount(host, win, { tightRoot: true });
  owner.frame();

  // 列表宿主：comp.root（row）的最后一个孩子（column）
  const listColumn = comp.root !== null ? comp.root.children[comp.root.children.length - 1]?.node ?? null : null;

  return { root: host, owner, count, items, dark, counterText, listHost: listColumn ?? host, waves };
}
