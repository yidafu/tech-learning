// 虚拟列表：万级行只构建/绘制可见窗口（+缓冲行）。
// 与 ScrollView 的区别：内容不是「先全部建树再裁剪」，而是「按滚动位置动态换行」——
// 行节点复用（池化），数据 → 行 UI 每帧重绑。这是第八阶段「只构建可见项」的落地。
import { clamp } from "../geometry";
import type { Painter } from "../painter";
import type { BoxConstraints } from "../render/constraints";
import { RenderObject } from "../render/render-object";
import type { TextMeasurer } from "../text/measurer";
import type { WheelEvent } from "../events/events";

export interface VirtualRowData {
  label: string;
}

export class RenderVirtualList extends RenderObject {
  private rows: VirtualRowData[] = [];
  private rowHeight: number;
  private fontSize: number;
  private measurer: TextMeasurer;
  private scrollTop = 0;
  private velocity = 0;
  /** 行池：复用的行节点（RenderObject 姿态），数量 = 可见行数 + 缓冲 2。 */
  private pool: RenderObject[] = [];
  /** 观测口：本帧实际挂着的行数（虚拟化是否生效的证明）。 */
  liveRows = 0;
  /** 观测口：滚动到过的最大行 index（测试「只见过可见窗口」用）。 */
  maxRowSeen = -1;
  private makeRow: ((data: VirtualRowData, index: number) => RenderObject) | null = null;
  private bindRow: ((row: RenderObject, data: VirtualRowData, index: number) => void) | null = null;

  constructor(rowHeight: number, fontSize: number, measurer: TextMeasurer) {
    super();
    this.rowHeight = rowHeight;
    this.fontSize = fontSize;
    this.measurer = measurer;
  }

  setRows(rows: VirtualRowData[]): void {
    this.rows = rows;
    this.scrollTop = clamp(this.scrollTop, 0, this.maxScroll());
    this.markNeedsLayout();
  }

  setRowFactory(make: (data: VirtualRowData, index: number) => RenderObject, bind: (row: RenderObject, data: VirtualRowData, index: number) => void): void {
    this.makeRow = make;
    this.bindRow = bind;
    // 池清空重建
    for (const r of this.pool) this.removeChild(r);
    this.pool = [];
    this.markNeedsLayout();
  }

  maxScroll(): number {
    return Math.max(0, this.rows.length * this.rowHeight - this.height);
  }

  visibleRowCount(): number {
    return Math.ceil(this.height / this.rowHeight) + 2; // 上下各 1 行缓冲
  }

  /** 滚动入口（宿主把滚轮指到这里；惯性同 ScrollView 模型）。 */
  handleWheel(dy: number): void {
    this.scrollTop = clamp(this.scrollTop + dy * 40, 0, this.maxScroll());
    this.velocity = dy * 80;
    this.rebind();
    this.markNeedsPaint();
  }

  onWheel(ev: WheelEvent): boolean {
    this.handleWheel(ev.dy);
    return true;
  }

  /** 惯性推进（宿主每帧调用）。 */
  update(dt: number): void {
    if (this.velocity === 0) return;
    this.scrollTop = clamp(this.scrollTop + this.velocity * dt, 0, this.maxScroll());
    const decay = Math.max(0, 1 - 6 * dt);
    this.velocity = this.velocity * decay;
    if (Math.abs(this.velocity) < 4) this.velocity = 0;
    this.rebind();
    this.markNeedsPaint();
  }

  /** 核心：按 scrollTop 计算可见行区间，池化复用 + 重绑数据。 */
  private rebind(): void {
    if (this.makeRow === null || this.bindRow === null) return;
    const first = Math.floor(this.scrollTop / this.rowHeight);
    const need = Math.min(this.visibleRowCount(), this.rows.length);
    // 池扩容
    while (this.pool.length < need) {
      const make = this.makeRow; // ScriptC：字段函数直接 this.fn() 撞 SC1090，读局部再调（事件槽同款）
      if (make === null) return;
      const row = make({ label: "" }, -1);
      this.pool.push(row);
      this.appendChild(row);
    }
    this.liveRows = need;
    for (let i = 0; i < this.pool.length; i++) {
      const row = this.pool[i]!;
      if (i < need) {
        const dataIndex = first + i;
        const data = this.rows[dataIndex];
        if (data !== undefined) {
          row.y = dataIndex * this.rowHeight - this.scrollTop;
          const bind = this.bindRow;
          if (bind !== null) bind(row, data, dataIndex);
          if (dataIndex > this.maxRowSeen) this.maxRowSeen = dataIndex;
          row.width = this.width;
          row.height = this.rowHeight; // 池行不递归 layout（尺寸常量）——记账要记全：漏 height → 全行零高不可见（demo08 截图实抓）
        }
        row.x = 0;
      } else {
        row.y = -10000; // 多余的池行藏到视口外（不参与绘制剔除后自然不可见）
      }
    }
    this.markNeedsPaint();
  }

  protected performLayout(c: BoxConstraints): void {
    // 无界哨兵双判：Infinity 之外，Flex 传子用的是 MAX_SAFE_INTEGER 哨兵——
    // 只判 === Infinity 会把 9e15 当真实高度，可见行数算成全量（demo08 集成实测抓到）
    this.width = c.maxWidth === Infinity || c.maxWidth >= Number.MAX_SAFE_INTEGER ? 300 : c.maxWidth;
    this.height = c.maxHeight === Infinity || c.maxHeight >= Number.MAX_SAFE_INTEGER ? 200 : c.maxHeight;
    this.rebind();
  }

  /** 视口容器：池行是 children，由基类遍历绘制并统一裁剪；本方法只画滚动条。 */
  protected clipsContent(): boolean {
    return true;
  }

  protected paintSelf(p: Painter): void {
    if (this.rows.length === 0 || this.rows.length * this.rowHeight <= this.height) return;
    const trackH = this.height;
    const thumbH = Math.max(24, (this.height / (this.rows.length * this.rowHeight)) * trackH);
    const thumbY = (this.scrollTop / this.maxScroll()) * (trackH - thumbH);
    p.fillRect({ x: this.width - 6, y: thumbY, width: 4, height: thumbH }, { r: 89, g: 99, b: 110, a: 255 });
  }
}
