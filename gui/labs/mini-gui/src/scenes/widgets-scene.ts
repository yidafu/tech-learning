// 毕业控件场景：TextField（完整键盘编辑）+ VirtualList（万级行只挂可见池行）。
// 第八阶段 demo 树 + 无头测试共用（纯 TS）。
// 展示三件事：
//   ① TextField 焦点接管后全键盘编辑（第三阶段光标几何的兑现）
//   ② VirtualList 万级行只挂可见池行（liveRows 恒定观测口）
//   ③ 整树无头可断言（root.layout 命令层 + 像素探针，05 册测试方法的落点）
import { rgba } from "../core/color";
import type { TextMeasurer } from "../core/text/measurer";
import type { Painter } from "../core/painter";
import type { RenderObject } from "../core/render/render-object";
import { RenderBox, RenderColoredBox, RenderSizedBox } from "../core/render/layout-widgets";
import { FlexDirection, RenderFlex } from "../core/render/flex";
import { PipelineOwner } from "../core/render/owner";
import { RenderRepaintBoundary } from "../core/render/repaint-boundary";
import { RenderTextField } from "../core/widgets/text-field";
import { RenderVirtualList, type VirtualRowData } from "../core/widgets/virtual-list";
import { FocusManager } from "../core/events/focus";

/** 池行：固定尺寸色块 + 左缘强调条（重绑只改标记位，不重建）。 */
class RowLine extends RenderBox {
  boundLabel = "";

  constructor() {
    super(300, 40, rgba(230, 233, 238));
  }

  /** 重绑：换数据不换节点（池化的核心动作；标签以色块占位，排版见 RenderText）。 */
  rebind(text: string): void {
    this.boundLabel = text;
    this.markNeedsPaint();
  }

  protected paintSelf(p: Painter): void {
    super.paintSelf(p);
    p.fillRect({ x: 0, y: 0, width: 4, height: this.height }, rgba(46, 124, 246));
  }

}

export interface WidgetsScene {
  root: RenderObject;
  owner: PipelineOwner;
  field: RenderTextField;
  list: RenderVirtualList;
  focus: FocusManager;
  /** 每帧推进（虚拟列表惯性）；返回 repaintedNodes。 */
  frame(dt: number): number;
}

export function buildWidgetsScene(
  measurer: TextMeasurer,
  fontSize: number,
  win: { width: number; height: number },
  rowCount: number = 10000,
): WidgetsScene {
  // 文本框：毕业项目「键盘可完整操作」的主角
  const field = new RenderTextField(fontSize, measurer);
  field.setText("edit me");

  // 万级行虚拟列表：行数据在场景侧生成（行工厂/重绑回调由控件回调）
  const rows: VirtualRowData[] = [];
  for (let i = 0; i < rowCount; i++) rows.push({ label: `row ${i}` });
  const list = new RenderVirtualList(40, fontSize, measurer);
  list.setRows(rows);
  list.setRowFactory(
    (): RenderObject => new RowLine(),  // 槽位返回型需精确匹配（ScriptC 运行期校验，宽松赋值会炸）
    (row, d, i) => {
      // ScriptC：闭包内 as 下行撞 ICE（SC9001 实锤）——instanceof 收窄是允许路径
      if (row instanceof RowLine) row.rebind(`${i}: ${d.label}`);
    },
  );

  const col = new RenderFlex({ direction: FlexDirection.column, gap: 12 });
  col.appendChild(field);
  const listHost = new RenderSizedBox({ width: 340, height: 220 }); // 显式定高：Flex 主轴哨兵不让列表自定高
  listHost.appendChild(list);
  const listBoundary = new RenderRepaintBoundary();
  listBoundary.appendChild(listHost);
  col.appendChild(listBoundary);

  const root = new RenderColoredBox(rgba(245, 246, 248));
  root.appendChild(col);

  const owner = new PipelineOwner();
  const focus = new FocusManager();
  owner.mount(root, win, { tightRoot: true });
  focus.mount(root);
  focus.focusNode(field); // demo 默认焦点在输入框
  owner.frame();

  return {
    root,
    owner,
    field,
    list,
    focus,
    frame(dt: number): number {
      list.update(dt); // 惯性推进
      owner.frame();
      return owner.repaintedNodes;
    },
  };
}

