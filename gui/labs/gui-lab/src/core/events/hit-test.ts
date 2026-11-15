// 命中测试：把窗口坐标翻译成「从最深的被命中节点到根」的链。
// 遍历规则：后画的在上（子序 = 绘制序），所以子按逆序试探；命中链自底向上组装。
import type { RenderObject } from "../render/render-object";

export interface HitResult {
  /** 从最深的被命中节点到根。空数组 = 谁都没命中。 */
  chain: RenderObject[];
}

export function hitTest(root: RenderObject, x: number, y: number): HitResult {
  const chain: RenderObject[] = [];
  hitTestNode(root, x, y, chain);
  return { chain };
}

/** 返回 node（或其子树）是否命中；命中时把链自底向上写入 chain。 */
function hitTestNode(node: RenderObject, x: number, y: number, chain: RenderObject[]): boolean {
  // 先问自己：不在自己盒子里，子树免谈（默认 hitTestSelf 是矩形）
  if (!node.hitTestSelf(x, y)) return false;

  // 逆序试子（局部坐标减去自己的偏移；子的 x/y 是相对父的）
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (child === undefined) continue;
    if (hitTestNode(child, x - child.x, y - child.y, chain)) {
      chain.push(node);
      return true;
    }
  }

  // 子没命中：自己是叶子命中（深度优先，链上先放自己）
  chain.push(node);
  return true;
}

/** 链上离根最近（最浅）的实现了某谓词的节点。 */
export function firstInChain(chain: RenderObject[], pred: (n: RenderObject) => boolean): RenderObject | null {
  for (const node of chain) {
    if (pred(node)) return node;
  }
  return null;
}
