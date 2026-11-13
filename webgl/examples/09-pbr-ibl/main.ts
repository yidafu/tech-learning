// 09 基于图像的光照（IBL）：程序化 HDR 天空 -> 四份 IBL 资产 -> PBR 场景合成。
// 对应分册：《05-第五阶段/08-基于图像的光照.md》。
// 场景：前排非金属球、后排金属球，各按粗糙度 0 -> 1 排开；空格切换 IBL 环境光做对比。

import { createGL2, createProgramOrFail, resizeCanvas } from '../src/common/gl';
import {
  createBox, createGpuGeometry, createPlane, createSphere, drawGeometry,
} from '../src/common/geometry';
import type { GpuGeometry } from '../src/common/geometry';
import { OrbitControls, PerspectiveCamera } from '../src/common/controls';
import { degToRad, Mat4, Vec3 } from '../src/common/math';
import { generateIblFromEquirect, requireFloatColorBuffer } from './ibl';
import type { IblAssets } from './ibl';
import { fullscreenVS, pbrFS, pbrVS, skyGenFS, skyboxFS, skyboxVS } from './shaders';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = createGL2(canvas);
requireFloatColorBuffer(gl); // 浮点渲染目标是 IBL 预处理的硬前提

const SUN_DIR = new Vec3(0.55, 0.62, 0.4).normalize(); // 指向太阳（天空生成与直接光共用）

/* ---------- 第 0 步：程序化生成 equirect HDR（1024x512 RGBA16F，零外部素材） ---------- */
const skyProg = createProgramOrFail(gl, fullscreenVS, skyGenFS);
const equirectW = 1024;
const equirectH = 512;
const equirect = gl.createTexture();
if (!equirect) throw new Error('纹理创建失败');
gl.bindTexture(gl.TEXTURE_2D, equirect);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, equirectW, equirectH);
// WRAP_S 必须 REPEAT：经度方向周期，接缝处双线性才能跨界（分册 7.7.2）
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
const skyFbo = gl.createFramebuffer();
if (!skyFbo) throw new Error('FBO 创建失败');
gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, equirect, 0);
const emptyVao = gl.createVertexArray();
gl.disable(gl.DEPTH_TEST);
gl.viewport(0, 0, equirectW, equirectH);
gl.useProgram(skyProg);
gl.uniform3fv(gl.getUniformLocation(skyProg, 'uSunDir'), [SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]);
gl.bindVertexArray(emptyVao);
gl.drawArrays(gl.TRIANGLES, 0, 3);

/* ---------- 第 1~4 步：env cubemap / irradiance / prefilter / BRDF LUT ---------- */
const ibl: IblAssets = generateIblFromEquirect(gl, equirect);

/* ---------- 场景与程序 ---------- */
const pbrProg = createProgramOrFail(gl, pbrVS, pbrFS);
const skyboxProg = createProgramOrFail(gl, skyboxVS, skyboxFS);
const sphereGeo = createGpuGeometry(gl, createSphere(0.5, 48, 24));
const groundGeo = createGpuGeometry(gl, createPlane(1, 1, 1, 1));
const skyboxGeo = createGpuGeometry(gl, createBox(2, 2, 2));

interface Obj {
  geo: GpuGeometry;
  matrix: Mat4;
  albedo: Vec3;
  metallic: number;
  roughness: number;
}

const objects: Obj[] = [
  { // 地面：绕 X 轴 -90° 把朝 +Z 的平面放平（法线转向 +Y）
    geo: groundGeo,
    matrix: new Mat4().fromTRS(new Vec3(0, 0, 0), new Vec3(1, 0, 0), degToRad(-90), new Vec3(18, 18, 1)),
    albedo: new Vec3(0.3, 0.28, 0.26),
    metallic: 0,
    roughness: 0.9,
  },
];
for (let i = 0; i < 7; i++) {
  const x = (i - 3) * 1.3;
  objects.push({ // 前排：非金属，粗糙度 0 -> 1（IBL 漫反射渐变 + 高光从锐到糊）
    geo: sphereGeo,
    matrix: new Mat4().fromTRS(new Vec3(x, 0.5, -1.2), new Vec3(0, 1, 0), 0, new Vec3(1, 1, 1)),
    albedo: new Vec3(0.75, 0.2, 0.16),
    metallic: 0,
    roughness: i / 6,
  });
  objects.push({ // 后排：金属（albedo 即 F0，金色），粗糙度 0 -> 1（天空反射从镜面到哑光）
    geo: sphereGeo,
    matrix: new Mat4().fromTRS(new Vec3(x, 0.5, 1.2), new Vec3(0, 1, 0), 0, new Vec3(1, 1, 1)),
    albedo: new Vec3(1.0, 0.77, 0.34),
    metallic: 1,
    roughness: i / 6,
  });
}

const camera = new PerspectiveCamera(50, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.5, 0);
controls.minRadius = 3;
controls.maxRadius = 15;

let iblEnabled = 1.0;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') iblEnabled = iblEnabled > 0.5 ? 0 : 1;
});

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.clearColor(0.1, 0.11, 0.15, 1);

const vp = new Mat4();
let prev = performance.now();

function frame(now: number): void {
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  controls.update(dt);
  resizeCanvas(gl, canvas);
  camera.setAspect(canvas.width / canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  vp.copy(camera.updateProjectionMatrix()).multiply(camera.updateViewMatrix());

  // ---- 不透明物体：直接光照 + IBL ----
  gl.useProgram(pbrProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(pbrProg, 'uViewProjection'), false, vp.elements);
  gl.uniform3fv(gl.getUniformLocation(pbrProg, 'uCamPos'),
    [camera.position.x, camera.position.y, camera.position.z]);
  gl.uniform3fv(gl.getUniformLocation(pbrProg, 'uLightDir'), [SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]);
  gl.uniform3fv(gl.getUniformLocation(pbrProg, 'uLightColor'), [3.0, 2.85, 2.6]);
  gl.uniform1f(gl.getUniformLocation(pbrProg, 'uIblIntensity'), iblEnabled);
  gl.uniform1f(gl.getUniformLocation(pbrProg, 'uMaxPrefilterLod'), ibl.maxPrefilterLod);
  gl.uniform1i(gl.getUniformLocation(pbrProg, 'uIrradiance'), 0);
  gl.uniform1i(gl.getUniformLocation(pbrProg, 'uPrefilter'), 1);
  gl.uniform1i(gl.getUniformLocation(pbrProg, 'uBrdfLut'), 2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, ibl.irradiance);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, ibl.prefilter);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ibl.brdfLut);

  for (const obj of objects) {
    gl.uniformMatrix4fv(gl.getUniformLocation(pbrProg, 'uModel'), false, obj.matrix.elements);
    gl.uniform3fv(gl.getUniformLocation(pbrProg, 'uAlbedo'), [obj.albedo.x, obj.albedo.y, obj.albedo.z]);
    gl.uniform1f(gl.getUniformLocation(pbrProg, 'uMetallic'), obj.metallic);
    // roughness 留 0.05 的下限：完全 0 的高光在该采样数下会出现亮点（分册 7.7.1）
    gl.uniform1f(gl.getUniformLocation(pbrProg, 'uRoughness'), Math.max(obj.roughness, 0.05));
    drawGeometry(gl, obj.geo);
  }

  // ---- 天空盒最后画：LEQUAL + 不写深度 + 关剔除（从盒内看绕序是反的，06 分册 5.3）----
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);
  gl.useProgram(skyboxProg);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'uProj'),
    false, camera.updateProjectionMatrix().elements);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'uView'),
    false, camera.updateViewMatrix().elements);
  gl.uniform1i(gl.getUniformLocation(skyboxProg, 'uSkybox'), 3);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, ibl.envCube);
  drawGeometry(gl, skyboxGeo);
  gl.depthMask(true);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.CULL_FACE);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
