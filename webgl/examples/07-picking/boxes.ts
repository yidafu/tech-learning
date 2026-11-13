// 07 拾取示例的场景数据：8 个立方体的名称 / 颜色 / 摆放 / 自转参数。
// 纯数据抽离出 main.ts，保持主文件聚焦拾取逻辑。
import { Vec3 } from '../src/common/math';

export interface BoxDef {
  name: string;
  color: Vec3;
  position: Vec3;
  size: number;
  spinSpeed: number; // 弧度/秒（正负即方向）
  phase: number;     // 初始相位
}

export default [
  { name: 'red',    color: new Vec3(0.91, 0.30, 0.30), position: new Vec3(0, 0.4, 0),    size: 1.0, spinSpeed: 0.4,  phase: 0.0 },
  { name: 'green',  color: new Vec3(0.38, 0.83, 0.37), position: new Vec3(2.1, 0.3, 0.6), size: 0.6, spinSpeed: -0.7, phase: 1.2 },
  { name: 'blue',   color: new Vec3(0.30, 0.52, 0.95), position: new Vec3(-2.0, 0.3, 0.9),size: 0.6, spinSpeed: 0.9,  phase: 2.4 },
  { name: 'yellow', color: new Vec3(0.95, 0.78, 0.25), position: new Vec3(0.9, 0.2, -1.9),size: 0.5, spinSpeed: -1.1, phase: 0.6 },
  { name: 'purple', color: new Vec3(0.55, 0.27, 0.68), position: new Vec3(-1.2, 0.2, -2.1),size: 0.5, spinSpeed: 1.3,  phase: 3.0 },
  { name: 'cyan',   color: new Vec3(0.30, 0.78, 0.83), position: new Vec3(2.2, 0.2, -1.6),size: 0.45, spinSpeed: -0.5, phase: 1.8 },
  { name: 'orange', color: new Vec3(0.95, 0.55, 0.25), position: new Vec3(-2.6, 0.15, -0.8),size: 0.35, spinSpeed: 0.8, phase: 2.2 },
  { name: 'pink',   color: new Vec3(0.91, 0.45, 0.62), position: new Vec3(1.2, 0.15, 2.1),size: 0.35, spinSpeed: -1.4, phase: 4.1 },
] as BoxDef[];
