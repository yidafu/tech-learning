// PerspectiveCamera 与 OrbitControls（轨道相机控制器）。
// 提炼自《03-第三阶段/03-引擎最小核心.md》2.2：
// 相机 = view/projection 两个矩阵；轨道相机用球坐标（theta/phi/radius）参数化位置，
// 滚轮指数缩放、阻尼用帧率无关的指数平滑 k = 1 - e^(-lambda * delta)。

import { DEG2RAD, Mat4, Vec3 } from './math';

/** 透视相机：fov/aspect/near/far 四参数 + 脏标记的投影矩阵缓存 */
export class PerspectiveCamera {
  readonly position = new Vec3(0, 0, 5);
  readonly target = new Vec3(0, 0, 0); // 相机注视点（lookAt 用）
  readonly up = new Vec3(0, 1, 0);     // 大致向上的参考轴

  /** 垂直视场角（弧度存储；构造函数收角度） */
  fov: number;
  aspect: number;
  near: number;
  far: number;

  readonly projectionMatrix = new Mat4();
  readonly viewMatrix = new Mat4();
  private projectionDirty = true;

  constructor(fovYDegrees = 60, aspect = 1, near = 0.1, far = 100) {
    this.fov = fovYDegrees * DEG2RAD;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  /** resize 时调用；aspect 未变则不动脏标记 */
  setAspect(aspect: number): void {
    if (aspect === this.aspect) return;
    this.aspect = aspect;
    this.projectionDirty = true;
  }

  /** 脏标记版：参数没变直接复用上次结果 */
  updateProjectionMatrix(): Mat4 {
    if (this.projectionDirty) {
      this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far);
      this.projectionDirty = false;
    }
    return this.projectionMatrix;
  }

  /** 世界 -> 相机。position/target/up 变化后调用 */
  updateViewMatrix(): Mat4 {
    return this.viewMatrix.lookAt(this.position, this.target, this.up);
  }
}

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/** 轨道控制器：拖拽沿球面滑动、滚轮改变半径，带帧率无关阻尼 */
export class OrbitControls {
  /** 轨道中心（世界坐标） */
  readonly target = new Vec3(0, 0, 0);

  minRadius = 1;
  maxRadius = 20;
  /** 极角范围：留出极点余量，phi 触到 0 或 PI 会退化 */
  minPhi = 0.05;
  maxPhi = Math.PI - 0.05;

  /** 旋转灵敏度：每像素弧度 */
  rotateSpeed = 0.005;
  /** 缩放灵敏度：滚轮 delta 的指数系数 */
  zoomSpeed = 0.001;
  /** 阻尼强度 lambda（越大跟得越紧；0 = 无阻尼直接到位） */
  damping = 8;

  // 实际状态（带阻尼地追赶目标状态）
  private theta = 0.4; // 方位角：绕 +Y，从 +Z 起算
  private phi = 1.1;   // 极角：从 +Y（正上方）向下量
  private radius = 6;
  // 目标状态（输入事件直接改这里）
  private targetTheta = 0.4;
  private targetPhi = 1.1;
  private targetRadius = 6;

  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly element: HTMLElement,
  ) {
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerUp);
    this.element.addEventListener('pointercancel', this.onPointerUp);
    // passive 下 preventDefault 无效，必须显式关闭
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('wheel', this.onWheel);
    this.element.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    // 捕获指针：拖出元素边界后仍能收到 move/up，不丢拖拽
    this.element.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    // 向右拖 = 相机向左绕（theta 减小）；手感反了就改正负号
    this.targetTheta -= dx * this.rotateSpeed;
    this.targetPhi -= dy * this.rotateSpeed;
    this.targetPhi = clamp(this.targetPhi, this.minPhi, this.maxPhi);
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.dragging = false;
    this.element.releasePointerCapture(e.pointerId);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    // 指数缩放：每格滚轮改变相同的"比例"。deltaY > 0（下滚）= 拉远
    const factor = Math.exp(e.deltaY * this.zoomSpeed);
    this.targetRadius = clamp(this.targetRadius * factor, this.minRadius, this.maxRadius);
  };

  private onContextMenu = (e: Event): void => e.preventDefault();

  /** 每帧、渲染前调用：阻尼收敛 + 球坐标写回相机 position/target */
  update(delta: number): void {
    if (this.damping > 0) {
      const k = 1 - Math.exp(-this.damping * delta);
      this.theta += (this.targetTheta - this.theta) * k;
      this.phi += (this.targetPhi - this.phi) * k;
      this.radius += (this.targetRadius - this.radius) * k;
    } else {
      this.theta = this.targetTheta;
      this.phi = this.targetPhi;
      this.radius = this.targetRadius;
    }
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta),
    );
    this.camera.target.copy(this.target);
  }
}
