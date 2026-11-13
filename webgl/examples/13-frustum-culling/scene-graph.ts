// 可剔除场景图：06-scene-graph 的 Node3D 最小复活版 + 每节点的世界 AABB
// 与子树计数，收集阶段在节点粒度做视锥测试。
// 对应分册：《05-第五阶段/12-视锥剔除与场景管理.md》11.3（层次剔除语义）。
// 与 06 的差异（均为本示例的主题服务）：
// - 附 localAabb / worldAabb：叶子 = 几何包围盒，组 = 构建时的子树并集；
// - updateMatrixWorld 顺带保守重算世界 AABB（旋转会让盒变大，见 frustum.ts）；
// - collectVisible 实现层次剔除：父盒在锥外剪整棵子树，否则子节点逐个再测。

import { Mat4, Vec3 } from '../src/common/math';
import type { GpuGeometry } from '../src/common/geometry';
import { aabbIntersectsFrustum, transformAabb } from './frustum';
import type { Aabb, Plane } from './frustum';

/** 场景图节点：局部变换（TRS）+ 双脏标记 + 包围盒 + 叶子渲染附件 */
export class CullNode {
  readonly position = new Vec3(0, 0, 0);
  readonly rotationAxis = new Vec3(0, 1, 0);
  rotationAngle = 0;
  readonly scale = new Vec3(1, 1, 1);

  matrix = new Mat4();
  matrixWorld = new Mat4();

  parent: CullNode | null = null;
  readonly children: CullNode[] = [];
  readonly name: string;

  /** 渲染附件：非空则为叶子，画该几何 + 颜色 */
  geo: GpuGeometry | null = null;
  readonly color = new Vec3(0.7, 0.72, 0.76);

  /** 本节点局部空间包围盒：叶子建节点时给；组节点用 enclose 聚合子树 */
  readonly localAabb: Aabb = { min: new Vec3(), max: new Vec3() };
  /** 世界空间 AABB：matrixWorld 更新后保守重算（剔除测试用它） */
  readonly worldAabb: Aabb = { min: new Vec3(), max: new Vec3() };

  /** 子树内叶子数（被整树剪掉时统计"省了多少"用） */
  leafCount = 0;
  /** 子树节点总数（含自己） */
  subtreeNodes = 1;

  private matrixNeedsUpdate = true;
  private matrixWorldNeedsUpdate = true;

  constructor(name = '') {
    this.name = name;
  }

  add(child: CullNode): this {
    if (child.parent !== null) child.parent.remove(child);
    child.parent = this;
    this.children.push(child);
    child.matrixWorldNeedsUpdate = true;
    return this;
  }

  remove(child: CullNode): this {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
    return this;
  }

  /** 改 position / rotationAngle / scale 后调用（06 的 Node3D 同款约定） */
  setDirty(): void {
    this.matrixNeedsUpdate = true;
  }

  /** 把一个"局部空间中的盒"并入自己的局部包围盒（构建组节点时用） */
  enclose(min: Vec3, max: Vec3): void {
    this.localAabb.min.set(
      Math.min(this.localAabb.min.x, min.x),
      Math.min(this.localAabb.min.y, min.y),
      Math.min(this.localAabb.min.z, min.z),
    );
    this.localAabb.max.set(
      Math.max(this.localAabb.max.x, max.x),
      Math.max(this.localAabb.max.y, max.y),
      Math.max(this.localAabb.max.z, max.z),
    );
  }

  /** 构建完成后调用一次：自底向上聚合 leafCount / subtreeNodes */
  refreshCounts(): void {
    this.leafCount = this.geo ? 1 : 0;
    this.subtreeNodes = 1;
    for (const c of this.children) {
      c.refreshCounts();
      this.leafCount += c.leafCount;
      this.subtreeNodes += c.subtreeNodes;
    }
  }

  /** 深度优先遍历 */
  traverse(fn: (node: CullNode) => void): void {
    fn(this);
    for (const c of this.children) c.traverse(fn);
  }

  /**
   * 自上而下更新世界矩阵（先父后子），随后把局部盒保守变换到世界。
   * force 语义与 06 相同：父链变了必须整枝重算。
   */
  updateMatrixWorld(force = false): void {
    if (this.matrixNeedsUpdate) {
      this.matrix.fromTRS(this.position, this.rotationAxis, this.rotationAngle, this.scale);
      this.matrixNeedsUpdate = false;
      this.matrixWorldNeedsUpdate = true;
    }

    if (this.matrixWorldNeedsUpdate || force) {
      if (this.parent === null) {
        this.matrixWorld.copy(this.matrix);
      } else {
        Mat4.multiply(this.matrixWorld, this.parent.matrixWorld, this.matrix);
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }

    transformAabb(this.matrixWorld, this.localAabb, this.worldAabb);

    for (const c of this.children) c.updateMatrixWorld(force);
  }
}

export interface CullStats {
  /** 实际做了 AABB-视锥测试的节点数 */
  testedNodes: number;
  /** 因祖先盒在锥外被整棵跳过、连测试都免了的节点数 */
  prunedNodes: number;
  /** 本帧入列渲染的叶子 */
  drawnLeaves: number;
  /** 本帧剔除掉的叶子（含子树剪枝与叶子级剔除） */
  culledLeaves: number;
}

/**
 * 层次剔除收集（分册 11.3.2 的语义）：
 * - 节点世界 AABB 在锥外 → 剪掉整棵子树（后代的包围盒再大也必然在外的假设
 *   来自"组盒是子树并集"——子树全被它包着）；
 * - 在锥内或与锥相交 → 本节点若是叶子则入列，子节点逐个再测
 *   （父不剔除 ≠ 子可见：组盒与锥相交时，孩子可能整批在外）。
 */
export function collectVisible(
  node: CullNode,
  planes: Plane[],
  out: CullNode[],
  stats: CullStats,
): void {
  stats.testedNodes += 1;
  if (!aabbIntersectsFrustum(planes, node.worldAabb)) {
    stats.prunedNodes += node.subtreeNodes - 1; // 除已测试的本节点，整棵免测
    stats.culledLeaves += node.leafCount;
    return;
  }
  if (node.geo) out.push(node);
  for (const c of node.children) collectVisible(c, planes, out, stats);
}
