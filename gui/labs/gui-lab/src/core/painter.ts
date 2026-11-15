// 绘制层：Painter（带状态的绘制 API）+ 绘制命令 + DisplayList（显示列表）。
//
// 分层：
//   Painter         —— 给框架/控件用的绘制接口：save/restore/translate/clipRect + 各种图元
//   StatefulPainter —— Painter 的唯一实现：维护变换栈与裁剪栈，把相对坐标「烘焙」成绝对坐标命令
//   CommandSink     —— 命令的去处：DisplayList（记录）或后端（RaylibBackend，真正画）
//
// 关键取舍：变换与裁剪在「记录时」烘焙进命令（绝对坐标 + 每条命令自带 clip）。
// 好处是命令自包含、可重放、可断言；代价是命令不再保留树形变换信息（Flutter 选择保留，见分册）。
import type { Color } from "./color";
import { rectIntersect, rectIsEmpty, rectTranslate, type Rect } from "./geometry";

export type TextureId = number;

/** 九宫格切分：四条边距（纹理像素）。四角不变形，四边单向拉伸，中心双向拉伸。 */
export interface NinePatch {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type DrawCmd =
  | { op: "fillRect"; rect: Rect; color: Color; clip: Rect | null }
  | { op: "strokeRect"; rect: Rect; thickness: number; color: Color; clip: Rect | null }
  | { op: "fillRoundedRect"; rect: Rect; radius: number; color: Color; clip: Rect | null }
  | {
      op: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      thickness: number;
      color: Color;
      clip: Rect | null;
    }
  | { op: "fillCircle"; cx: number; cy: number; radius: number; color: Color; clip: Rect | null }
  | { op: "text"; text: string; x: number; y: number; fontSize: number; color: Color; clip: Rect | null }
  | { op: "texture"; texture: TextureId; dest: Rect; tint: Color; clip: Rect | null }
  | {
      op: "ninePatch";
      texture: TextureId;
      patch: NinePatch;
      dest: Rect;
      tint: Color;
      clip: Rect | null;
    };

/**
 * 命令的消费者：显示列表记录它，绘制后端执行它。
 *
 * 注意：这里是抽象类而不是 interface——ScriptC 的类型系统里「类」是名义类型、
 * 「interface/记录」是结构类型，类实例不能当 interface 传（SC2002 实测）。
 * 需要「多个实现类」的多态点一律用抽象类继承；对象字面量才可以匹配 interface。
 */
export abstract class CommandSink {
  abstract execute(cmd: DrawCmd): void;
}

/**
 * 框架内核与控件只认这个接口，不认 raylib。同样是抽象类（原因见 CommandSink 注释）。
 */
export abstract class Painter {
  abstract save(): void;
  abstract restore(): void;
  /** 平移当前坐标系（累加）。 */
  abstract translate(dx: number, dy: number): void;
  /** 与当前裁剪求交；裁剪只会越裁越小，restore 才能放大。 */
  abstract clipRect(r: Rect): void;
  abstract fillRect(r: Rect, color: Color): void;
  abstract strokeRect(r: Rect, thickness: number, color: Color): void;
  abstract fillRoundedRect(r: Rect, radius: number, color: Color): void;
  abstract line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Color): void;
  abstract fillCircle(cx: number, cy: number, radius: number, color: Color): void;
  abstract text(text: string, x: number, y: number, fontSize: number, color: Color): void;
  abstract texture(texture: TextureId, dest: Rect, tint: Color): void;
  abstract ninePatch(texture: TextureId, patch: NinePatch, dest: Rect, tint: Color): void;
  /** 图层合成：把一段局部坐标的显示列表平铺到当前位置（重绘边界的执行路径）。 */
  abstract blit(list: DisplayList): void;
}

interface PaintState {
  dx: number;
  dy: number;
  clip: Rect | null; // 绝对坐标；null = 不裁剪
}

export class StatefulPainter extends Painter {
  private readonly sink: CommandSink;
  private readonly stack: PaintState[] = [];
  private state: PaintState = { dx: 0, dy: 0, clip: null };

  /** 发往 sink 的命令数。 */
  emitted = 0;
  /** 因完全落在裁剪区外而被丢弃的命令数（只对有明确包围盒的图元做剔除）。 */
  culled = 0;

  constructor(sink: CommandSink) {
    super();
    this.sink = sink;
  }

  get saveDepth(): number {
    return this.stack.length;
  }

  save(): void {
    this.stack.push({ dx: this.state.dx, dy: this.state.dy, clip: this.state.clip });
  }

  restore(): void {
    const prev = this.stack.pop();
    if (prev === undefined) {
      throw new Error("Painter.restore() 没有配对的 save()");
    }
    this.state = prev;
  }

  translate(dx: number, dy: number): void {
    // 不写 this.state.dx += dx：嵌套接收者上的复合赋值在 scriptc 0.0.35 不支持（SC1090）
    this.state.dx = this.state.dx + dx;
    this.state.dy = this.state.dy + dy;
  }

  clipRect(r: Rect): void {
    const abs = rectTranslate(r, this.state.dx, this.state.dy);
    this.state.clip = this.state.clip === null ? abs : rectIntersect(this.state.clip, abs);
  }

  fillRect(r: Rect, color: Color): void {
    const rect = this.abs(r);
    if (this.cullRect(rect)) return;
    this.emit({ op: "fillRect", rect, color, clip: this.state.clip });
  }

  strokeRect(r: Rect, thickness: number, color: Color): void {
    const rect = this.abs(r);
    if (this.cullRect(rect)) return;
    this.emit({ op: "strokeRect", rect, thickness, color, clip: this.state.clip });
  }

  fillRoundedRect(r: Rect, radius: number, color: Color): void {
    const rect = this.abs(r);
    if (this.cullRect(rect)) return;
    this.emit({ op: "fillRoundedRect", rect, radius, color, clip: this.state.clip });
  }

  line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Color): void {
    if (this.clipIsEmpty()) return this.cull();
    const { dx, dy } = this.state;
    this.emit({
      op: "line",
      x1: x1 + dx,
      y1: y1 + dy,
      x2: x2 + dx,
      y2: y2 + dy,
      thickness,
      color,
      clip: this.state.clip,
    });
  }

  fillCircle(cx: number, cy: number, radius: number, color: Color): void {
    const bounds = this.abs({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 });
    if (this.cullRect(bounds)) return;
    this.emit({
      op: "fillCircle",
      cx: cx + this.state.dx,
      cy: cy + this.state.dy,
      radius,
      color,
      clip: this.state.clip,
    });
  }

  text(text: string, x: number, y: number, fontSize: number, color: Color): void {
    // 文本宽度要等第三阶段的度量器才知道，这里只做「裁剪区为空」的粗剔除
    if (this.clipIsEmpty()) return this.cull();
    this.emit({
      op: "text",
      text,
      x: x + this.state.dx,
      y: y + this.state.dy,
      fontSize,
      color,
      clip: this.state.clip,
    });
  }

  texture(texture: TextureId, dest: Rect, tint: Color): void {
    const rect = this.abs(dest);
    if (this.cullRect(rect)) return;
    this.emit({ op: "texture", texture, dest: rect, tint, clip: this.state.clip });
  }

  ninePatch(texture: TextureId, patch: NinePatch, dest: Rect, tint: Color): void {
    const rect = this.abs(dest);
    if (this.cullRect(rect)) return;
    this.emit({ op: "ninePatch", texture, patch, dest: rect, tint, clip: this.state.clip });
  }

  /**
   * 图层合成（第六阶段）：把一段以「图层局部坐标」记录的显示列表平铺到当前位置。
   * 两件事都要做：① 命令几何平移 (dx,dy)；② clip 是图层坐标 → 平移后与当前裁剪求交，
   * 命令无 clip → 继承当前裁剪。（首版漏了 ①，动画面板画在 (0,0) 盖住静态文本——截图实抓。）
   */
  blit(list: DisplayList): void {
    const { dx, dy } = this.state;
    for (const cmd of list.commands) {
      const c = cmd.clip;
      let clip: Rect | null;
      if (c === null) {
        clip = this.state.clip;
      } else {
        const moved = rectTranslate(c, dx, dy);
        clip = this.state.clip === null ? moved : rectIntersect(this.state.clip, moved);
      }
      // 不写 { ...cmd, clip }：对联合类型做对象展开没有静态表示（SC2011 实测），
      // 按判别字段逐型重建，同时平移几何
      switch (cmd.op) {
        case "fillRect":
          this.sink.execute({ op: "fillRect", rect: rectTranslate(cmd.rect, dx, dy), color: cmd.color, clip });
          break;
        case "strokeRect":
          this.sink.execute({ op: "strokeRect", rect: rectTranslate(cmd.rect, dx, dy), thickness: cmd.thickness, color: cmd.color, clip });
          break;
        case "fillRoundedRect":
          this.sink.execute({ op: "fillRoundedRect", rect: rectTranslate(cmd.rect, dx, dy), radius: cmd.radius, color: cmd.color, clip });
          break;
        case "line":
          this.sink.execute({ op: "line", x1: cmd.x1 + dx, y1: cmd.y1 + dy, x2: cmd.x2 + dx, y2: cmd.y2 + dy, thickness: cmd.thickness, color: cmd.color, clip });
          break;
        case "fillCircle":
          this.sink.execute({ op: "fillCircle", cx: cmd.cx + dx, cy: cmd.cy + dy, radius: cmd.radius, color: cmd.color, clip });
          break;
        case "text":
          this.sink.execute({ op: "text", text: cmd.text, x: cmd.x + dx, y: cmd.y + dy, fontSize: cmd.fontSize, color: cmd.color, clip });
          break;
        case "texture":
          this.sink.execute({ op: "texture", texture: cmd.texture, dest: rectTranslate(cmd.dest, dx, dy), tint: cmd.tint, clip });
          break;
        case "ninePatch":
          this.sink.execute({ op: "ninePatch", texture: cmd.texture, patch: cmd.patch, dest: rectTranslate(cmd.dest, dx, dy), tint: cmd.tint, clip });
          break;
      }
      this.emitted += 1;
    }
  }

  private abs(r: Rect): Rect {
    return rectTranslate(r, this.state.dx, this.state.dy);
  }

  private clipIsEmpty(): boolean {
    return this.state.clip !== null && rectIsEmpty(this.state.clip);
  }

  /** 包围盒与裁剪区无交集则剔除；返回 true 表示已剔除。 */
  private cullRect(bounds: Rect): boolean {
    const clip = this.state.clip;
    if (clip === null) return false;
    if (rectIsEmpty(clip) || rectIsEmpty(rectIntersect(clip, bounds))) {
      this.cull();
      return true;
    }
    return false;
  }

  private cull(): void {
    this.culled += 1;
  }

  private emit(cmd: DrawCmd): void {
    this.emitted += 1;
    this.sink.execute(cmd);
  }
}

/** 显示列表：把命令存下来，之后可以整段重放到任意后端。 */
export class DisplayList extends CommandSink {
  commands: DrawCmd[] = [];

  execute(cmd: DrawCmd): void {
    this.commands.push(cmd);
  }

  replay(target: CommandSink): void {
    for (const cmd of this.commands) {
      target.execute(cmd);
    }
  }

  clear(): void {
    // 不写 this.commands.length = 0：给 .length 赋值在 scriptc 0.0.35 不支持（SC1090）
    this.commands = [];
  }

  /** 按 op 统计命令数（调试/回归用）。 */
  countByOp(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const cmd of this.commands) {
      counts.set(cmd.op, (counts.get(cmd.op) ?? 0) + 1);
    }
    return counts;
  }

  /** 相邻命令的裁剪区发生变化的次数——后端要为此切换 scissor 状态。 */
  clipSwitches(): number {
    let switches = 0;
    let prev: Rect | null = null;
    for (const cmd of this.commands) {
      if (!sameClip(prev, cmd.clip)) {
        switches += 1;
        prev = cmd.clip;
      }
    }
    return switches;
  }
}

export function sameClip(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
