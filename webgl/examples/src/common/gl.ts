// 公共 WebGL 辅助：上下文创建、着色器编译链接、canvas 尺寸自适应（dpr）、canvas 纹理上传。
// 提炼自《01-第一阶段/03-第一个WebGL程序.md》2.1 / 2.3，API 命名与分册保持一致。
//
// WebGL2RenderingContext 在类型上是 WebGLRenderingContext 的扩展，
// 因此下方辅助函数的 gl 参数一律声明为 WebGLRenderingContext，两类上下文都能传入。

/** 创建 WebGL1 风格上下文（跑 GLSL ES 1.00 着色器；优先 webgl2 再回退 webgl，与分册一致）。 */
export function createGL1(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const opts = { antialias: true, alpha: false }; // alpha:false 防页面背景混入（分册"常见坑"8）
  const gl =
    (canvas.getContext('webgl2', opts) as WebGL2RenderingContext | null) ??
    canvas.getContext('webgl', opts) ??
    canvas.getContext('experimental-webgl', opts);
  if (!gl) throw new Error('当前浏览器不支持 WebGL');
  return gl as WebGLRenderingContext;
}

/** 创建 WebGL2 上下文（第三阶段起的示例使用：VAO、GLSL ES 3.00、深度纹理）。 */
export function createGL2(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) throw new Error('当前浏览器不支持 WebGL2');
  return gl;
}

/**
 * 编译单个着色器；失败时打出带源码行号的日志并返回 null。
 * type 取 gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER。
 */
export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  name = 'shader',
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`[${name}] 编译失败:\n${gl.getShaderInfoLog(shader) ?? ''}`);
    // 附上带行号的源码，控制台里直接对照报错行
    source.split('\n').forEach((line, i) => {
      console.error(`${String(i + 1).padStart(3)} | ${line}`);
    });
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** 编译 + 链接成完整程序；任何一步失败返回 null（日志已打）。 */
export function createProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource, 'vertex');
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource, 'fragment');
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`[program] 链接失败:\n${gl.getProgramInfoLog(program) ?? ''}`);
    gl.deleteProgram(program);
    return null;
  }
  gl.deleteShader(vs); // 链接完成后 shader 对象可删，program 独立存在
  gl.deleteShader(fs);
  return program;
}

/**
 * 编译 + 链接；失败直接抛异常（详细编译日志已由 compileShader 打到控制台）。
 * 返回类型为非空 WebGLProgram，闭包内使用无需再判空。
 */
export function createProgramOrFail(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram {
  const program = createProgram(gl, vsSource, fsSource);
  if (!program) throw new Error('着色器创建失败，看控制台');
  return program;
}

/**
 * 尺寸自适应：CSS 尺寸 x devicePixelRatio -> 绘图缓冲尺寸，变了才重设并同步 viewport。
 * 返回本帧是否发生了重置（调用方可借此决定是否重算依赖 aspect 的量）。
 */
export function resizeCanvas(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr) || 1;
  const h = Math.floor(canvas.clientHeight * dpr) || 1;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }
  return false;
}

/**
 * 把 canvas 程序化生成的贴图上传为 2 的幂纹理并生成 mipmap。
 * flipY 与球体 UV（v=1 在北极）配套：《02-第二阶段/08-实践-纹理地球.md》第 2 步。
 */
export function uploadCanvasTexture(
  gl: WebGLRenderingContext,
  unit: number,
  source: HTMLCanvasElement,
): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('纹理创建失败');
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}
