// 微型场景图：Node3D（父子变换链 + 双脏标记）。
// 对应分册：《04-第四阶段/03-场景图.md》2.1 / 2.2。
// 与分册版本的差异（均为刻意精简，注释标明出处）：
// - 姿态用"自转轴 + 角度"代替四元数（minmath 最小集不含 Quaternion，见 src/common/math.ts）；
// - 分册的 TRS onChanged 自动标脏改为本文件 updateMatrix() 内的重算 + 显式置脏。

import { Mat4, Vec3 } from '../src/common/math';

/** 场景图节点：局部变换（TRS）+ 缓存矩阵 + 世界矩阵，自上而下合成 */
export class Node3D {
  readonly position = new Vec3(0, 0, 0);
  /** 姿态：轴 + 角（弧度）。完整实现用四元数（rotation），详见分册 2.1.3 */
  readonly rotationAxis = new Vec3(0, 1, 0);
  rotationAngle = 0;
  readonly scale = new Vec3(1, 1, 1);

  /** 缓存的局部矩阵：localMatrix = T · R · S，仅在 matrixNeedsUpdate 时重算 */
  matrix = new Mat4();
  /** 世界矩阵：matrixWorld(子) = matrixWorld(父) × localMatrix(子) */
  matrixWorld = new Mat4();

  parent: Node3D | null = null;
  readonly children: Node3D[] = [];
  readonly name: string;

  /** 渲染附件：非空则在本节点画一个该颜色 / 该尺寸的立方体（演示用） */
  color: Vec3 | null = null;

  /** 局部矩阵脏标记 */
  private matrixNeedsUpdate = true;
  /** 世界矩阵脏标记 */
  private matrixWorldNeedsUpdate = true;

  constructor(name = '') {
    this.name = name;
  }

  add(child: Node3D): this {
    if (child.parent !== null) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    child.matrixWorldNeedsUpdate = true; // 换了父，世界矩阵必变
    return this;
  }

  remove(child: Node3D): this {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
    return this;
  }

  /** 修改 rotationAngle / position 后由调用方触发标脏（分册经 onChanged 自动） */
  setDirty(): void {
    this.matrixNeedsUpdate = true;
  }

  traverse(fn: (node: Node3D) => void): void {
    fn(this);
    for (const child of this.children) child.traverse(fn);
  }

  /** 重算局部矩阵：T × R × S（顺序不可换，理由见分册 2.1.1） */
  updateMatrix(): void {
    this.matrix.fromTRS(this.position, this.rotationAxis, this.rotationAngle, this.scale);
    this.matrixNeedsUpdate = false;
    this.matrixWorldNeedsUpdate = true;
  }

  /**
   * 自上而下更新世界矩阵（先父后子，子拿到的才是父的"新"矩阵）。
   * force 表示"父链已变，本节点必须重算"；本节点世界变了则 force 向整棵子树传播
   * （只重算 P 不传播 = "车轮不跟车身"，分册 2.1.4 的关键设计）。
   */
  updateMatrixWorld(force = false): void {
    if (this.matrixNeedsUpdate) this.updateMatrix();

    if (this.matrixWorldNeedsUpdate || force) {
      if (this.parent === null) {
        this.matrixWorld.copy(this.matrix);
      } else {
        // 世界 = 父世界 × 局部（列主序下右乘）
        Mat4.multiply(this.matrixWorld, this.parent.matrixWorld, this.matrix);
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }

    for (const child of this.children) child.updateMatrixWorld(force);
  }
}
