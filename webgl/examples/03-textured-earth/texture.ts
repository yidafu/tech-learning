// 程序化纹理：用 canvas 2D 生成地球贴图与云贴图（零外部素材）。
// 对应分册：《02-第二阶段/08-实践-纹理地球.md》第 2 步（makeEarthCanvas / makeCloudCanvas）。
// 尺寸取 2 的幂（1024x512），WebGL 下 mipmap 与 REPEAT 才合法。

/** 固定种子的伪随机数生成器（LCG）：结果可复现 */
export function lcg(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** 地球：海洋渐变底 + 随机大陆椭圆团 + 极冠 */
export function makeEarthCanvas(w = 1024, h = 512): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2d 上下文获取失败');
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, '#123a6d');
  sea.addColorStop(0.5, '#1b58a6');
  sea.addColorStop(1, '#123a6d');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);
  const rand = lcg(7);
  for (let i = 0; i < 70; i++) {
    // 大陆：随机椭圆团（绿为主、沙漠色点缀）
    const x = rand() * w;
    const y = h * 0.15 + rand() * h * 0.7;
    const rw = 18 + rand() * 95;
    const rh = 9 + rand() * 42;
    ctx.fillStyle = rand() > 0.3 ? '#3f7a3a' : '#a6894f';
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e9f2f8'; // 极冠（极区留纯色，藏住 UV 球极点"漩涡"）
  ctx.fillRect(0, 0, w, h * 0.055);
  ctx.fillRect(0, h * 0.945, w, h * 0.055);
  return c;
}

/** 云层：透明底 + 白色径向渐变云团（RGBA，alpha 就是云的厚度） */
export function makeCloudCanvas(w = 1024, h = 512): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2d 上下文获取失败');
  const rand = lcg(13);
  for (let i = 0; i < 90; i++) {
    const x = rand() * w;
    const y = h * 0.1 + rand() * h * 0.8;
    const r = 14 + rand() * 62;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}
