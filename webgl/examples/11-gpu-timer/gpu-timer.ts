// GPU 帧计时：EXT_disjoint_timer_query_webgl2 的分阶段封装。
// 对应分册：《05-第五阶段/10-GPU性能度量与剖析.md》9.2.3。
// 协议纪律：结果异步（数帧后可用），读取前先查 QUERY_RESULT_AVAILABLE 与
// GPU_DISJOINT_EXT（disjoint 时全部作废）；查询对象走池化复用。

export interface GpuSectionTime { name: string; ms: number; frame: number }

/** TS 内置 DOM 类型不含此扩展接口，按 Khronos 规范 IDL 手工声明 */
export interface EXTDisjointTimerQueryWebGL2 {
  readonly TIME_ELAPSED_EXT: 0x88bf; // 34919
  readonly TIMESTAMP_EXT: 0x8e28;   // 36424
  readonly GPU_DISJOINT_EXT: 0x8fbb; // 36795
  readonly QUERY_COUNTER_BITS_EXT: 0x8864;
  queryCounterEXT(query: WebGLQuery, target: GLenum): void;
}

export class GpuFrameTimer {
  /** 扩展不可用时整个模块退化为 no-op（调用方据此显示降级提示） */
  readonly available: boolean;
  disjointCount = 0;

  private readonly ext: EXTDisjointTimerQueryWebGL2 | null;
  private readonly pool: WebGLQuery[] = [];
  private current: { name: string; query: WebGLQuery }[] = [];
  private pending: { name: string; query: WebGLQuery; frame: number }[] = [];
  private frame = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as EXTDisjointTimerQueryWebGL2 | null;
    this.available = this.ext !== null;
  }

  beginFrame(): void {
    this.frame++;
    this.current.length = 0;
  }

  /** 在 pass 的绘制调用之前调用；begin/end 必须像括号一样配对（同 target 不能嵌套） */
  begin(name: string): void {
    if (!this.ext) return;
    const gl = this.gl;
    const query = this.pool.pop() ?? gl.createQuery();
    if (!query) return;
    gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.current.push({ name, query });
  }

  end(): void {
    if (!this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }

  /** 帧提交完成后调用：本帧查询转入待回收队列 */
  endFrame(): void {
    if (!this.ext) return;
    for (const s of this.current) this.pending.push({ ...s, frame: this.frame });
    this.current.length = 0;
  }

  /** 每帧调用一次：收割已完成的测量（毫秒）。disjoint 时丢弃全部并返回 null */
  poll(): GpuSectionTime[] | null {
    if (!this.ext) return null;
    const gl = this.gl;
    if (gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
      this.disjointCount++;
      for (const p of this.pending) this.pool.push(p.query); // 查询对象可复用
      this.pending.length = 0;
      return null;
    }
    const done: GpuSectionTime[] = [];
    const waiting: typeof this.pending = [];
    for (const p of this.pending) {
      if (gl.getQueryParameter(p.query, gl.QUERY_RESULT_AVAILABLE)) {
        // GLuint64 纳秒（JS number 安全），除以 1e6 得毫秒
        const ns = gl.getQueryParameter(p.query, gl.QUERY_RESULT) as number;
        done.push({ name: p.name, ms: ns / 1e6, frame: p.frame });
        this.pool.push(p.query);
      } else {
        waiting.push(p);
      }
    }
    this.pending = waiting;
    return done.length > 0 ? done : null;
  }
}
