// RaylibBackend：DrawCmd 的 raylib 执行器（CommandSink 的平台实现）。
// core 层永远不 import 这个文件；只有 apps 入口把 DisplayList.replay() 指到这里。
import {
  NPATCH_NINE_PATCH,
  beginScissorMode,
  drawCircleV,
  drawLineEx,
  drawRectangleLinesEx,
  drawRectangleRec,
  drawRectangleRounded,
  drawTextEx,
  drawTextureNPatch,
  drawTexturePro,
  endScissorMode,
  getFontDefault,
} from "scriptc-raylib";
import type { Font, Rectangle, Texture, Vector2 } from "scriptc-raylib";
import { rectIsEmpty, type Rect, type Size } from "../core/geometry";
import { sameClip, type DrawCmd, type TextureId, CommandSink } from "../core/painter";

function toRlRect(r: Rect): Rectangle {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function v(x: number, y: number): Vector2 {
  return { x, y };
}

interface RegisteredTexture {
  texture: Texture;
  size: Size;
}

export class RaylibBackend extends CommandSink {
  private readonly textures = new Map<TextureId, RegisteredTexture>();
  private nextId: TextureId = 1;
  private activeClip: Rect | null = null;
  private font: Font;
  /** scissor 状态切换次数（性能观测口，见第六阶段）。 */
  scissorSwitches = 0;

  constructor() {
    super();
    this.font = getFontDefault();
  }

  /** 切换文本绘制字体（与 RaylibMeasurer.switchFont 同步调用，保证测量=绘制）。 */
  setFont(font: Font): void {
    this.font = font;
  }

  /** 注册一张已加载的纹理，返回内核用的不透明 TexId（core 不认 raylib 的 Texture）。 */
  registerTexture(texture: Texture, size: Size): TextureId {
    const id = this.nextId;
    this.nextId += 1;
    this.textures.set(id, { texture, size });
    return id;
  }

  textureSize(id: TextureId): Size {
    const entry = this.textures.get(id);
    if (entry === undefined) throw new Error(`未知纹理 id: ${id}`);
    return entry.size;
  }

  execute(cmd: DrawCmd): void {
    this.applyClip(cmd.clip);
    switch (cmd.op) {
      case "fillRect":
        drawRectangleRec(toRlRect(cmd.rect), cmd.color);
        break;
      case "strokeRect":
        drawRectangleLinesEx(toRlRect(cmd.rect), cmd.thickness, cmd.color);
        break;
      case "fillRoundedRect": {
        const minSide = Math.min(cmd.rect.width, cmd.rect.height);
        // raylib 的 roundness ∈ [0,1]，半径 = roundness × min(w,h) / 2
        const roundness = minSide > 0 ? Math.min((cmd.radius * 2) / minSide, 1) : 0;
        drawRectangleRounded(toRlRect(cmd.rect), roundness, 12, cmd.color);
        break;
      }
      case "line":
        drawLineEx(v(cmd.x1, cmd.y1), v(cmd.x2, cmd.y2), cmd.thickness, cmd.color);
        break;
      case "fillCircle":
        drawCircleV(v(cmd.cx, cmd.cy), cmd.radius, cmd.color);
        break;
      case "text":
        // drawTextEx + spacing 0：与 RaylibMeasurer 的度量口径严格一致（光标几何才对得上）
        drawTextEx(this.font, cmd.text, v(Math.round(cmd.x), Math.round(cmd.y)), Math.round(cmd.fontSize), 0, cmd.color);
        break;
      case "texture": {
        const entry = this.lookup(cmd.texture);
        const source = { x: 0, y: 0, width: entry.size.width, height: entry.size.height };
        drawTexturePro(entry.texture, source, toRlRect(cmd.dest), v(0, 0), 0, cmd.tint);
        break;
      }
      case "ninePatch": {
        const entry = this.lookup(cmd.texture);
        const source = { x: 0, y: 0, width: entry.size.width, height: entry.size.height };
        drawTextureNPatch(
          entry.texture,
          {
            source,
            left: cmd.patch.left,
            top: cmd.patch.top,
            right: cmd.patch.right,
            bottom: cmd.patch.bottom,
            layout: NPATCH_NINE_PATCH,
          },
          toRlRect(cmd.dest),
          v(0, 0),
          0,
          cmd.tint,
        );
        break;
      }
    }
  }

  /** 帧末调用：关掉可能残留的 scissor 状态（begin/endDrawing 之间调用）。 */
  endFrame(): void {
    this.applyClip(null);
  }

  private lookup(id: TextureId): RegisteredTexture {
    const entry = this.textures.get(id);
    if (entry === undefined) throw new Error(`未知纹理 id: ${id}`);
    return entry;
  }

  private applyClip(next: Rect | null): void {
    if (sameClip(this.activeClip, next)) return;
    if (this.activeClip !== null) endScissorMode();
    if (next !== null) {
      if (rectIsEmpty(next)) {
        // 空裁剪：理论到不了这里（上游已剔除），防御性给出 0×0 scissor
        beginScissorMode(0, 0, 0, 0);
      } else {
        beginScissorMode(Math.round(next.x), Math.round(next.y), Math.round(next.width), Math.round(next.height));
      }
    }
    this.activeClip = next;
    this.scissorSwitches += 1;
  }
}
