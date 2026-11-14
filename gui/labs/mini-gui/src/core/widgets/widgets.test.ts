import { describe, expect, it } from "vitest";
import { rgba } from "../color";
import { MockMeasurer } from "../text/measurer";
import { RenderTextField } from "../widgets/text-field";
import { RenderVirtualList } from "../widgets/virtual-list";
import { PipelineOwner } from "../render/owner";
import { RenderFlex, FlexDirection } from "../render/flex";
import { keyEvent, pointerEvent } from "../events/events";

const m = new MockMeasurer();

describe("TextField（阶段八深水区）", () => {
  function field(initial = ""): RenderTextField {
    const tf = new RenderTextField(10, m);
    tf.setText(initial);
    tf.focused = true;
    const owner = new PipelineOwner();
    owner.mount(tf, { width: 200, height: 40 }, { tightRoot: false });
    owner.frame();
    return tf;
  }

  it("输入字符追加 + 光标跟随", () => {
    const tf = field();
    tf.onKey(keyEvent(0, 72, 1)); // 'H'
    tf.onKey(keyEvent(0, 105, 2)); // 'i'
    expect(tf.getText()).toBe("Hi");
  });

  it("Backspace 删光标前字符、Delete 删光标后字符", () => {
    const tf = field("abc");
    tf.onKey(keyEvent(0, 269, 1)); // End：光标到末尾 3（程序化聚焦不改光标，初始在 0）
    tf.onKey(keyEvent(0, 263, 2)); // ← 到 2
    tf.onKey(keyEvent(0, 261, 3)); // Delete → "ab"
    expect(tf.getText()).toBe("ab");
    tf.onKey(keyEvent(0, 259, 4)); // Backspace → "a"
    expect(tf.getText()).toBe("a");
  });

  it("Home/End 与方向键移动光标", () => {
    const tf = field("abcd");
    tf.onKey(keyEvent(0, 269, 1)); // End → 4
    tf.onKey(keyEvent(0, 263, 2)); // ← → 3
    tf.onKey(keyEvent(0, 72, 3)); // 'H' 插在 3 → "abcHd"
    expect(tf.getText()).toBe("abcHd");
    tf.onKey(keyEvent(0, 268, 4)); // Home → 0
    tf.onKey(keyEvent(0, 88, 5)); // 'X' → "XabcHd"
    expect(tf.getText()).toBe("XabcHd");
  });

  it("Enter 触发 onSubmit，onChanged 随编辑触发", () => {
    const tf = field();
    const changes: string[] = [];
    let submitted = "";
    tf.onChanged = (t) => changes.push(t);
    tf.onSubmit = (t) => (submitted = t);
    tf.onKey(keyEvent(0, 79, 1)); // 'O'
    tf.onKey(keyEvent(0, 257, 2)); // Enter
    expect(changes).toEqual(["O"]);
    expect(submitted).toBe("O");
  });

  it("点击定位：中点吸附（每字符 6px，x=14 → 光标 2）", () => {
    const tf = field("abcd");
    tf.onPointerDown(pointerEvent(0, 14, 0, 1)); // 14-12(内边距)=2 → 边界 2
    // 直接验证后续编辑落在该光标位
    tf.onKey(keyEvent(0, 88, 2)); // 'X' 插入
    expect(tf.getText()).toBe("abXcd");
  });

  it("未聚焦不消费键盘", () => {
    const tf = field("x");
    tf.focused = false;
    expect(tf.onKey(keyEvent(0, 65, 1))).toBe(false);
    expect(tf.getText()).toBe("x");
  });
});

describe("VirtualList（只构建可见项）", () => {
  const TOTAL = 10000;

  function list(): RenderVirtualList {
    const vl = new RenderVirtualList(40, 10, m);
    const rows: { label: string }[] = [];
    for (let i = 0; i < TOTAL; i++) rows.push({ label: `row ${i}` });
    vl.setRows(rows);
    vl.setRowFactory(
      (_d, _i) => new RowProbe(vl),
      (row, d, i) => ((row as RowProbe).label = `${i}: ${d.label}`),
    );
    const owner = new PipelineOwner();
    owner.mount(vl, { width: 300, height: 200 }, { tightRoot: true });
    owner.frame();
    return vl;
  }

  class RowProbe extends RenderFlex {
    label = "";
    built = 0;
    constructor(vl: RenderVirtualList) {
      super({ direction: FlexDirection.row });
      void vl;
    }
  }

  it("万级行只挂 7 个池行（5 可见 + 2 缓冲）", () => {
    const vl = list();
    expect(vl.liveRows).toBe(7);
    expect(vl.children.length).toBe(7);
  });

  it("滚动 1000 行：池行数量不变，只是重绑（虚拟化生效证明）", () => {
    const vl = list();
    const before = vl.children.slice();
    for (let i = 0; i < 100; i++) vl.handleWheel(1);
    expect(vl.children).toEqual(before); // 同一批节点
    expect(vl.liveRows).toBe(7);
    expect((vl.children[0] as RowProbe).label).toContain("100"); // 第 100 行上下
    expect(vl.maxRowSeen).toBeGreaterThanOrEqual(106);
    expect(vl.maxRowSeen).toBeLessThan(TOTAL); // 从没见过全部行
  });

  it("行复用：滚回顶部，行标签重绑回 0", () => {
    const vl = list();
    vl.handleWheel(50);
    vl.handleWheel(-50);
    vl.update(0); // 清惯性
    expect((vl.children[0] as RowProbe).label).toBe("0: row 0");
  });
});
