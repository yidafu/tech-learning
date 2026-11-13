// 最小数学库：Vec3 / Mat4。
// 提炼自《03-第三阶段/02-数学库minmath.md》的最小集（完整版含 Vec2/Vec4/Quaternion/Mat3
// 与 vitest 单元测试，推导与设计取舍详见分册）。
//
// 全局约定（分册 1.3）：列向量 + 列主序存储，e[c * 4 + r] = 第 r 行第 c 列，
// 平移量住在 e[12..14]，与 uniformMatrix4fv(loc, false, elements) 直接对接；
// 乘法语义 A.multiply(B) = A · B（B 先作用于向量），与 GLSL 的 A * B 一致。

/** 浮点比较与除法保护的阈值 */
export const EPSILON = 1e-10;
/** 角度转弧度 */
export const DEG2RAD = Math.PI / 180;

export function degToRad(deg: number): number {
  return deg * DEG2RAD;
}

/** 三维向量：分量用 number 字段（"向量读给人看，矩阵喂给 GPU"，分册 1.1） */
export class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vec3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vec3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  subtract(v: Vec3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** 叉积：先解构存下 this 的分量，避免边算边覆盖被污染（分册 1.1 的实现细节） */
  cross(v: Vec3): this {
    const { x, y, z } = this;
    this.x = y * v.z - z * v.y;
    this.y = z * v.x - x * v.z;
    this.z = x * v.y - y * v.x;
    return this;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /** 归一化：零向量约定返回零向量而不是 NaN（分册 1.1 的取舍） */
  normalize(): this {
    const len = this.length();
    return len > EPSILON ? this.multiplyScalar(1 / len) : this.set(0, 0, 0);
  }

  /** 点变换（w = 1，受平移影响；仅对仿射矩阵成立，投影请用 transformHomogeneous） */
  applyMat4(m: Mat4): this {
    const e = m.elements;
    const { x, y, z } = this;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12];
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13];
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14];
    return this;
  }

  /** 方向变换（w = 0，平移被忽略），变换后归一化 */
  transformDirection(m: Mat4): this {
    const e = m.elements;
    const { x, y, z } = this;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }

  // ---- 静态版本（显式 out 参数，热路径避免分配，分册 1.1 的双风格取舍） ----

  static subtract(a: Vec3, b: Vec3, out: Vec3 = new Vec3()): Vec3 {
    return out.set(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static cross(a: Vec3, b: Vec3, out: Vec3 = new Vec3()): Vec3 {
    return out.set(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x,
    );
  }
}

/** 四分量齐次坐标（拾取射线的逆投影用；完整版 Vec4 类详见分册） */
export interface Vec4Like {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 完整 4x4 齐次变换（含 w 分量），供透视投影之后的逆变换使用。 */
export function transformHomogeneous(
  m: Mat4,
  x: number,
  y: number,
  z: number,
  w: number,
): Vec4Like {
  const e = m.elements;
  return {
    x: e[0] * x + e[4] * y + e[8] * z + e[12] * w,
    y: e[1] * x + e[5] * y + e[9] * z + e[13] * w,
    z: e[2] * x + e[6] * y + e[10] * z + e[14] * w,
    w: e[3] * x + e[7] * y + e[11] * z + e[15] * w,
  };
}

/** 4x4 矩阵：elements 为列主序 Float32Array，可直接喂给 uniformMatrix4fv。 */
export class Mat4 {
  readonly elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity(): this {
    this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return this;
  }

  copy(m: Mat4): this {
    this.elements.set(m.elements);
    return this;
  }

  clone(): Mat4 {
    return new Mat4().copy(this);
  }

  /** this = this · m（m 先作用于向量），与 GLSL 的 this * m 语义一致 */
  multiply(m: Mat4): this {
    Mat4.multiply(this, this, m);
    return this;
  }

  /** out = a · b；out 允许与 a 或 b 是同一对象（a 的分量已先缓存到局部变量） */
  static multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
    const ae = a.elements;
    const be = b.elements;
    const oe = out.elements;
    const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3];
    const a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7];
    const a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11];
    const a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];
    for (let i = 0; i < 4; i++) {
      const b0 = be[i * 4], b1 = be[i * 4 + 1], b2 = be[i * 4 + 2], b3 = be[i * 4 + 3];
      oe[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
      oe[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      oe[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
      oe[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
    }
    return out;
  }

  /** 平移矩阵：平移量住在第 3 列（e[12..14]） */
  fromTranslation(x: number, y: number, z: number): this {
    this.identity();
    const e = this.elements;
    e[12] = x;
    e[13] = y;
    e[14] = z;
    return this;
  }

  /** 缩放矩阵 */
  fromScaling(x: number, y: number, z: number): this {
    this.identity();
    const e = this.elements;
    e[0] = x;
    e[5] = y;
    e[10] = z;
    return this;
  }

  /** 轴角旋转矩阵（Rodrigues 公式）。正角度 = 从轴正端往原点看逆时针 */
  fromRotation(axis: Vec3, rad: number): this {
    let { x, y, z } = axis;
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < EPSILON) return this.identity();
    x /= len;
    y /= len;
    z /= len;
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;
    const e = this.elements;
    e[0] = x * x * t + c;      e[1] = y * x * t + z * s;  e[2] = x * z * t - y * s;   e[3] = 0;
    e[4] = x * y * t - z * s;  e[5] = y * y * t + c;      e[6] = y * z * t + x * s;   e[7] = 0;
    e[8] = x * z * t + y * s;  e[9] = y * z * t - x * s;  e[10] = z * z * t + c;      e[11] = 0;
    e[12] = 0;                 e[13] = 0;                 e[14] = 0;                  e[15] = 1;
    return this;
  }

  /**
   * localMatrix = T(position) · R(axis, angle) · S(scale)。
   * 完整版用四元数（Mat4.compose(position, quaternion, scale)），推导见分册 1.2；
   * 本最小集用轴角表达姿态，场景图示例（06）依赖此方法。
   */
  fromTRS(position: Vec3, axis: Vec3, angle: number, scale: Vec3): this {
    this.fromRotation(axis, angle);
    const e = this.elements;
    e[0] *= scale.x; e[1] *= scale.x; e[2] *= scale.x;
    e[4] *= scale.y; e[5] *= scale.y; e[6] *= scale.y;
    e[8] *= scale.z; e[9] *= scale.z; e[10] *= scale.z;
    e[12] = position.x;
    e[13] = position.y;
    e[14] = position.z;
    return this;
  }

  transpose(): this {
    const e = this.elements;
    let t: number;
    t = e[1];  e[1] = e[4];  e[4] = t;
    t = e[2];  e[2] = e[8];  e[8] = t;
    t = e[3];  e[3] = e[12]; e[12] = t;
    t = e[6];  e[6] = e[9];  e[9] = t;
    t = e[7];  e[7] = e[13]; e[13] = t;
    t = e[11]; e[11] = e[14]; e[14] = t;
    return this;
  }

  /** this = this 的逆；奇异矩阵返回 null */
  invert(): Mat4 | null {
    return Mat4.invert(this, this);
  }

  /** 通用 4x4 求逆：伴随矩阵法。奇异返回 null。推导详见分册 1.3 */
  static invert(out: Mat4, a: Mat4): Mat4 | null {
    const e = a.elements;
    const o = out.elements;
    const m00 = e[0], m01 = e[4], m02 = e[8],  m03 = e[12];
    const m10 = e[1], m11 = e[5], m12 = e[9],  m13 = e[13];
    const m20 = e[2], m21 = e[6], m22 = e[10], m23 = e[14];
    const m30 = e[3], m31 = e[7], m32 = e[11], m33 = e[15];
    const c00 =  m11 * (m22 * m33 - m23 * m32) - m12 * (m21 * m33 - m23 * m31) + m13 * (m21 * m32 - m22 * m31);
    const c01 = -(m10 * (m22 * m33 - m23 * m32) - m12 * (m20 * m33 - m23 * m30) + m13 * (m20 * m32 - m22 * m30));
    const c02 =  m10 * (m21 * m33 - m23 * m31) - m11 * (m20 * m33 - m23 * m30) + m13 * (m20 * m31 - m21 * m30);
    const c03 = -(m10 * (m21 * m32 - m22 * m31) - m11 * (m20 * m32 - m22 * m30) + m12 * (m20 * m31 - m21 * m30));
    const c10 = -(m01 * (m22 * m33 - m23 * m32) - m02 * (m21 * m33 - m23 * m31) + m03 * (m21 * m32 - m22 * m31));
    const c11 =  m00 * (m22 * m33 - m23 * m32) - m02 * (m20 * m33 - m23 * m30) + m03 * (m20 * m32 - m22 * m30);
    const c12 = -(m00 * (m21 * m33 - m23 * m31) - m01 * (m20 * m33 - m23 * m30) + m03 * (m20 * m31 - m21 * m30));
    const c13 =  m00 * (m21 * m32 - m22 * m31) - m01 * (m20 * m32 - m22 * m30) + m02 * (m20 * m31 - m21 * m30);
    const c20 =  m01 * (m12 * m33 - m13 * m32) - m02 * (m11 * m33 - m13 * m31) + m03 * (m11 * m32 - m12 * m31);
    const c21 = -(m00 * (m12 * m33 - m13 * m32) - m02 * (m10 * m33 - m13 * m30) + m03 * (m10 * m32 - m12 * m30));
    const c22 =  m00 * (m11 * m33 - m13 * m31) - m01 * (m10 * m33 - m13 * m30) + m03 * (m10 * m31 - m11 * m30);
    const c23 = -(m00 * (m11 * m32 - m12 * m31) - m01 * (m10 * m32 - m12 * m30) + m02 * (m10 * m31 - m11 * m30));
    const c30 = -(m01 * (m12 * m23 - m13 * m22) - m02 * (m11 * m23 - m13 * m21) + m03 * (m11 * m22 - m12 * m21));
    const c31 =  m00 * (m12 * m23 - m13 * m22) - m02 * (m10 * m23 - m13 * m20) + m03 * (m10 * m22 - m12 * m20);
    const c32 = -(m00 * (m11 * m23 - m13 * m21) - m01 * (m10 * m23 - m13 * m20) + m03 * (m10 * m21 - m11 * m20));
    const c33 =  m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
    const det = m00 * c00 + m01 * c01 + m02 * c02 + m03 * c03;
    if (Math.abs(det) < 1e-12) return null;
    const inv = 1 / det;
    o[0] = c00 * inv;  o[1] = c01 * inv;  o[2] = c02 * inv;  o[3] = c03 * inv;
    o[4] = c10 * inv;  o[5] = c11 * inv;  o[6] = c12 * inv;  o[7] = c13 * inv;
    o[8] = c20 * inv;  o[9] = c21 * inv;  o[10] = c22 * inv; o[11] = c23 * inv;
    o[12] = c30 * inv; o[13] = c31 * inv; o[14] = c32 * inv; o[15] = c33 * inv;
    return out;
  }

  /**
   * 视图矩阵（世界 -> 相机）：eye 处看向 center，up 为"大致向上"的参考。
   * up 与视线平行时自动换参考轴，避免 NaN（分册 1.3 lookAt 的退化分支）。
   */
  lookAt(eye: Vec3, center: Vec3, up: Vec3): this {
    const z = Vec3.subtract(eye, center).normalize();
    let x = Vec3.cross(up, z);
    if (x.lengthSq() < EPSILON) {
      x = Vec3.cross(new Vec3(0, 0, 1), z);
      if (x.lengthSq() < EPSILON) x = Vec3.cross(new Vec3(1, 0, 0), z);
    }
    x.normalize();
    const y = Vec3.cross(z, x);
    const e = this.elements;
    e[0] = x.x; e[4] = x.y; e[8] = x.z;
    e[1] = y.x; e[5] = y.y; e[9] = y.z;
    e[2] = z.x; e[6] = z.y; e[10] = z.z;
    e[12] = -x.dot(eye);
    e[13] = -y.dot(eye);
    e[14] = -z.dot(eye);
    e[3] = 0;   e[7] = 0;   e[11] = 0;   e[15] = 1;
    return this;
  }

  /** 透视投影：fovY 为垂直视场角（弧度），相机看 -Z，NDC 的 z 范围 [-1, +1] */
  perspective(fovY: number, aspect: number, near: number, far: number): this {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    const e = this.elements;
    e[0] = f / aspect; e[1] = 0;  e[2] = 0;                    e[3] = 0;
    e[4] = 0;          e[5] = f;  e[6] = 0;                    e[7] = 0;
    e[8] = 0;          e[9] = 0;  e[10] = (far + near) * nf;   e[11] = -1;
    e[12] = 0;         e[13] = 0; e[14] = 2 * far * near * nf; e[15] = 0;
    return this;
  }

  /** 正交投影：平行光阴影（08 示例）与 2D 场景用 */
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): this {
    const e = this.elements;
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    e[0] = -2 * lr;  e[1] = 0;       e[2] = 0;        e[3] = 0;
    e[4] = 0;        e[5] = -2 * bt; e[6] = 0;        e[7] = 0;
    e[8] = 0;        e[9] = 0;       e[10] = 2 * nf;  e[11] = 0;
    e[12] = (left + right) * lr;
    e[13] = (top + bottom) * bt;
    e[14] = (far + near) * nf;
    e[15] = 1;
    return this;
  }
}
