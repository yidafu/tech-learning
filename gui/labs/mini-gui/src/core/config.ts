// 运行配置：demo 的回归开关都走环境变量。
// 放在 core 是因为 ScriptC 原生产物与 Node 测试进程里 process.env 都可用（已实测）。

/** 读一个可选的数字环境变量；未设置、空串或不是有限数字时返回 fallback。 */
export function envNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** 把单调增长的路程折成 [left, left+len] 内的往返坐标（demo 动画用）。 */
export function pingPong(distance: number, left: number, len: number): number {
  if (len <= 0) return left;
  const cycle = distance % (len * 2);
  return left + (cycle <= len ? cycle : len * 2 - cycle);
}
