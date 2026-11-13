// 几何生成器（纯数据）与 WebGL2 VAO 上传。
// 提炼自《03-第三阶段/03-引擎最小核心.md》2.3 / 2.4：
// 生成器输出纯数据（不碰 GL，可测试），attribute 位置用约定固定：
//   location 0 = aPosition(3)，location 1 = aNormal(3)，location 2 = aUv(2)
// 布局选分离数组而非交错缓冲：好读好写，交错的显存局部性优化详见分册。

/** 生成的纯数据契约：位置 / 法线 / UV / 索引 */
export interface GeometryData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint16Array;
}

/** 平面（朝 +Z，中心在原点，可细分）。从 +Z 看顶点逆时针 */
export function createPlane(
  width = 1,
  height = 1,
  widthSegments = 1,
  heightSegments = 1,
): GeometryData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= heightSegments; iy++) {
    const v = iy / heightSegments;
    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments;
      positions.push(u * width - width / 2, v * height - height / 2, 0);
      normals.push(0, 0, 1);
      uvs.push(u, v);
    }
  }
  const stride = widthSegments + 1;
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c); // b-a 沿 +X，c-a 沿 +Y，叉积朝 +Z
    }
  }
  return pack(positions, normals, uvs, indices);
}

/** 长方体：每面独立 4 顶点（法线/UV 是"面属性"，共享 8 角点会被平均成错误光照），24 顶点 36 索引 */
export function createBox(width = 1, height = 1, depth = 1): GeometryData {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  // 每面四角点按"从外部看逆时针"排列
  const faces: Array<{
    normal: [number, number, number];
    corners: Array<[number, number, number]>;
  }> = [
    { normal: [0, 0, 1],  corners: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },     // +Z
    { normal: [0, 0, -1], corners: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] }, // -Z
    { normal: [1, 0, 0],  corners: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },     // +X
    { normal: [-1, 0, 0], corners: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] }, // -X
    { normal: [0, 1, 0],  corners: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },     // +Y
    { normal: [0, -1, 0], corners: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] }, // -Y
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const quadUv: Array<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const face of faces) {
    const base = positions.length / 3;
    face.corners.forEach((corner, i) => {
      positions.push(corner[0], corner[1], corner[2]);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
      uvs.push(quadUv[i][0], quadUv[i][1]);
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return pack(positions, normals, uvs, indices);
}

/**
 * UV 球（经纬分段法）：法线 = 归一化位置，v=1 在北极（配合上传纹理时 FLIP_Y）。
 * 经度有 ws+1 列：第 0 与第 ws 列位置重合、u 分别为 0 与 1，是贴图无缝环绕的关键。
 */
export function createSphere(
  radius = 1,
  widthSegments = 32,
  heightSegments = 16,
): GeometryData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= heightSegments; iy++) {
    const v = iy / heightSegments;
    const phi = v * Math.PI; // 极角：0 = 北极（+Y），PI = 南极
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments;
      const theta = u * Math.PI * 2;
      const nx = -Math.cos(theta) * sinPhi;
      const ny = cosPhi;
      const nz = Math.sin(theta) * sinPhi;
      positions.push(radius * nx, radius * ny, radius * nz);
      normals.push(nx, ny, nz);
      uvs.push(u, 1 - v);
    }
  }
  const stride = widthSegments + 1;
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = iy * stride + ix + 1;
      const b = iy * stride + ix;
      const c = (iy + 1) * stride + ix;
      const d = (iy + 1) * stride + ix + 1;
      if (iy !== 0) indices.push(a, b, d); // 极点行退化三角形跳过
      if (iy !== heightSegments - 1) indices.push(b, c, d);
    }
  }
  return pack(positions, normals, uvs, indices);
}

function pack(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
): GeometryData {
  if (positions.length / 3 > 65535) {
    throw new Error('顶点数超过 Uint16 索引上限 65535，请降低分段数');
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/** GeometryData 的 GPU 侧宿主：VAO 收纳全部 attribute 绑定与 IBO */
export interface GpuGeometry {
  readonly vao: WebGLVertexArrayObject;
  readonly indexCount: number;
}

/** 上传 GeometryData：建 VAO + 三个 VBO + IBO。IBO 绑定必须在 VAO 绑定期间完成 */
export function createGpuGeometry(gl: WebGL2RenderingContext, data: GeometryData): GpuGeometry {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('VAO 创建失败');
  gl.bindVertexArray(vao);
  setAttribute(gl, 0, data.positions, 3);
  setAttribute(gl, 1, data.normals, 3);
  setAttribute(gl, 2, data.uvs, 2);
  const ibo = gl.createBuffer();
  if (!ibo) throw new Error('IBO 创建失败');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, indexCount: data.indices.length };
}

function setAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  values: Float32Array,
  size: number,
): void {
  const vbo = gl.createBuffer();
  if (!vbo) throw new Error('VBO 创建失败');
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

/** 绘制：一句 bindVertexArray 恢复全部绑定 */
export function drawGeometry(gl: WebGL2RenderingContext, geo: GpuGeometry): void {
  gl.bindVertexArray(geo.vao);
  gl.drawElements(gl.TRIANGLES, geo.indexCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
}
