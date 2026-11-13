// 04 自检页的断言框架与全部用例（main.ts 只负责渲染结果）。
// 三类思路沿用分册《03-第三阶段/02-数学库minmath.md》1.4：
// 黄金值（方向感）/ 性质测试（覆盖面）/ 往返测试（约定一致性）。随机会固定种子保证可复现。

import { EPSILON, Mat4, transformHomogeneous, Vec3 } from '../src/common/math';

export interface CaseResult {
  name: string;
  pass: boolean;
  detail: string;
}
export const results: CaseResult[] = [];

function check(name: string, pass: boolean, detail = ''): void {
  results.push({ name, pass, detail });
}
function close(a: number, b: number, digits = 5): boolean {
  return Math.abs(a - b) < 10 ** -digits;
}
/** 按数学记法（row x col）逐项比对列主序矩阵 */
function matClose(m: Mat4, rows: number[][], digits = 5): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!close(m.elements[c * 4 + r], rows[r][c], digits)) return false;
    }
  }
  return true;
}
/** 固定种子的伪随机数（分册 helpers.ts 的约定：失败可复现） */
let seed = 42;
function rand(min = -1, max = 1): number {
  seed = (seed * 16807) % 2147483647;
  return min + (seed / 2147483647) * (max - min);
}
function randomMat4(): Mat4 {
  const m = new Mat4();
  for (let i = 0; i < 16; i++) m.elements[i] = rand(-2, 2);
  return m;
}
function toRows(m: Mat4): number[][] {
  const e = m.elements;
  const rows: number[][] = [];
  for (let r = 0; r < 4; r++) rows.push([e[r], e[4 + r], e[8 + r], e[12 + r]]);
  return rows;
}

export const groups: Array<{ title: string; run: () => void }> = [
  {
    title: 'Vec3 基础',
    run: () => {
      const c = new Vec3(1, 0, 0).cross(new Vec3(0, 1, 0));
      check('叉积 x × y = z（右手系）', close(c.x, 0) && close(c.y, 0) && close(c.z, 1));
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(4, 5, 6);
      check('点积 a·b = 32', close(a.dot(b), 32));
      const sum = a.clone().add(b);
      check('clone().add() 不污染原对象（别名约定）', close(sum.x, 5) && close(a.x, 1));
      const zero = new Vec3(0, 0, 0).normalize();
      check('归一化零向量返回 (0,0,0) 而不是 NaN',
        zero.x === 0 && zero.y === 0 && zero.z === 0);
    },
  },
  {
    title: 'Mat4.multiply',
    run: () => {
      seed = 42;
      const m = randomMat4();
      const i = new Mat4();
      check('单位矩阵是乘法单位元：I·M = M', matClose(new Mat4().copy(i).multiply(m), toRows(m)));
      const t = new Mat4().fromTranslation(1, 2, 3);
      const s = new Mat4().fromScaling(2, 2, 2);
      check('黄金值：T(1,2,3)·S(2,2,2)（先缩放后平移）', matClose(
        new Mat4().copy(t).multiply(s),
        [[2, 0, 0, 1], [0, 2, 0, 2], [0, 0, 2, 3], [0, 0, 0, 1]],
      ));
      let assoc = true;
      for (let n = 0; n < 20; n++) {
        const a = randomMat4();
        const b = randomMat4();
        const c = randomMat4();
        const left = new Mat4().copy(a).multiply(b).multiply(c);
        const right = new Mat4().copy(a).multiply(new Mat4().copy(b).multiply(c));
        if (!matClose(left, toRows(right))) assoc = false;
      }
      check('结合律 (A·B)·C = A·(B·C)（随机 20 组）', assoc);
      const ts = new Mat4().copy(t).multiply(s).elements[12];
      const st = new Mat4().copy(s).multiply(t).elements[12];
      check('不可交换：T·S 平移仍为 1，S·T 平移被放大为 2', close(ts, 1) && close(st, 2));
    },
  },
  {
    title: 'fromRotation（轴角旋转）',
    run: () => {
      const r = new Mat4().fromRotation(new Vec3(0, 0, 1), Math.PI / 2);
      const v = new Vec3(1, 0, 0).applyMat4(r);
      check('绕 Z 轴 90 度：X 轴单位向量被转到 Y 轴',
        close(v.x, 0) && close(v.y, 1) && close(v.z, 0));
      seed = 7;
      let orthogonal = true;
      for (let n = 0; n < 20; n++) {
        const axis = new Vec3(rand(), rand(), rand()).normalize();
        const rot = new Mat4().fromRotation(axis, rand(-Math.PI, Math.PI));
        const prod = new Mat4().copy(rot).multiply(rot.clone().transpose());
        if (!matClose(prod, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])) {
          orthogonal = false;
        }
      }
      check('正交性质 R·R^T = I（随机轴、随机角 20 组）', orthogonal);
    },
  },
  {
    title: 'Mat4.lookAt（视图矩阵）',
    run: () => {
      const view = new Mat4().lookAt(new Vec3(0, 0, 0), new Vec3(0, 0, -1), new Vec3(0, 1, 0));
      check('eye 在原点、看 -Z、up=+Y 时 view 是单位矩阵', matClose(view,
        [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]));
      const eye = new Vec3(3, 4, 5);
      const target = new Vec3(1, 0, -2);
      const v = new Mat4().lookAt(eye, target, new Vec3(0, 1, 0));
      const eyeInCam = eye.clone().applyMat4(v);
      const tInCam = target.clone().applyMat4(v);
      check('往返：view 把 eye 送到原点',
        close(eyeInCam.x, 0) && close(eyeInCam.y, 0) && close(eyeInCam.z, 0));
      check('往返：target 落在相机前方 -Z 轴上',
        close(tInCam.x, 0) && close(tInCam.y, 0) && tInCam.z < 0);
    },
  },
  {
    title: 'Mat4.perspective（透视投影）',
    run: () => {
      const P = new Mat4().perspective(Math.PI / 2, 1, 1, 100); // 可手算的解析参数
      const e = P.elements;
      check('解析黄金值：cot(45)/aspect、cot(45)、-1 在 e[11]（第 3 行第 2 列）',
        close(e[0], 1) && close(e[5], 1) && close(e[10], (100 + 1) / (1 - 100))
        && close(e[11], -1) && close(e[14], (2 * 100 * 1) / (1 - 100)) && close(e[15], 0));
      const nearH = transformHomogeneous(P, 0, 0, -1, 1); // 相机看 -Z：near=1 处 z=-1
      const farH = transformHomogeneous(P, 0, 0, -100, 1);
      check('near 平面映射到 NDC z = -1，far 到 +1（透视除法手算，不用实现自证）',
        close(nearH.z / nearH.w, -1) && close(farH.z / farH.w, 1));
      const corner = transformHomogeneous(P, 1, 1, -1, 1); // fov=90、aspect=1：near 半宽=1
      check('near 平面角点映射到 NDC 四角 (±1, ±1)',
        close(corner.x / corner.w, 1) && close(corner.y / corner.w, 1));
    },
  },
  {
    title: 'Mat4.invert（求逆）',
    run: () => {
      seed = 99;
      let roundTrip = true;
      for (let n = 0; n < 10; n++) {
        const m = randomMat4();
        const inv = Mat4.invert(new Mat4(), m);
        if (!inv) { roundTrip = false; break; }
        const prod = new Mat4().copy(m).multiply(inv);
        if (!matClose(prod, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])) {
          roundTrip = false;
        }
      }
      check('往返：M·M⁻¹ = I（随机 10 组）', roundTrip);
      const inv = Mat4.invert(new Mat4(), new Mat4().fromTranslation(1, 2, 3));
      check('黄金值：平移的逆是反向平移', inv !== null
        && close(inv.elements[12], -1) && close(inv.elements[13], -2)
        && close(inv.elements[14], -3));
      check(`EPSILON 阈值存在且为正（${EPSILON}）`, EPSILON > 0);
    },
  },
];
