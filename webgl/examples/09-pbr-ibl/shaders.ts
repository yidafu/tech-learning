// 09 IBL 示例的着色器（GLSL ES 3.00）。
// 对应分册：《05-第五阶段/08-基于图像的光照.md》7.2（equirect→cubemap）、7.3（辐照度）、
// 7.4（预过滤）、7.5（BRDF LUT）、7.6（运行时合成）。

/** 全屏三角形（03-后处理管线 2.1.2 的 gl_VertexID 技巧），equirect 生成与 LUT 共用 */
export const fullscreenVS = /* glsl */ `
#version 300 es
out vec2 vUV;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  vUV = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

/** 程序化 HDR 天空：天顶渐变 + 太阳高辐亮度盘（equirect 的 2:1 经纬输入，零外部素材） */
export const skyGenFS = /* glsl */ `
#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;
uniform vec3 uSunDir;
const float PI = 3.14159265359;
void main() {
  // UV -> 经纬 -> 方向（与 equirectFS 的方向 -> 经纬互逆）
  vec2 lonlat = (vUV - 0.5) * vec2(2.0 * PI, PI);
  vec3 d = vec3(cos(lonlat.y) * cos(lonlat.x), sin(lonlat.y), cos(lonlat.y) * sin(lonlat.x));

  vec3 zenith  = vec3(0.16, 0.36, 0.80);
  vec3 horizon = vec3(0.72, 0.77, 0.85);
  vec3 ground  = vec3(0.20, 0.18, 0.16);
  vec3 sky = mix(horizon, zenith, pow(clamp(d.y, 0.0, 1.0), 0.55));
  vec3 col = d.y >= 0.0 ? sky : mix(horizon, ground, pow(clamp(-d.y, 0.0, 1.0), 0.4));

  // 太阳盘 + 大气光晕：HDR 辐亮度量级（260），这是预过滤里高光反射的来源
  float cosSun = dot(d, uSunDir);
  col += vec3(1.0, 0.92, 0.78) * (pow(max(cosSun, 0.0), 1024.0) * 260.0
                                  + pow(max(cosSun, 0.0), 12.0) * 0.8);
  fragColor = vec4(col, 1.0);
}
`;

/** 捕获 pass 顶点：立方体角点即采样方向（三个卷积 pass 共用，分册 7.2.3） */
export const captureVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
out vec3 vDirection;
void main() {
  vDirection = aPosition;
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

/** equirect -> cubemap：方向转经纬 UV 采原图（分册 7.2.3） */
export const equirectFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vDirection;
out vec4 fragColor;
uniform sampler2D uEquirect;
const vec2 INV_ATAN = vec2(0.15915494, 0.31830989); // 1/(2π), 1/π
void main() {
  vec3 d = normalize(vDirection);
  vec2 uv = vec2(atan(d.z, d.x), asin(d.y)) * INV_ATAN + 0.5;
  fragColor = vec4(texture(uEquirect, uv).rgb, 1.0);
}
`;

/** Hammersley + GGX 逆 CDF 采样：预过滤与 BRDF LUT 共用（分册 7.4.2） */
const IMPORTANCE_GLSL = /* glsl */ `
float radicalInverseVdC(uint bits) {
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return float(bits) * 2.3283064365386963e-10; // / 2^32
}
vec2 hammersley(uint i, uint N) {
  return vec2(float(i) / float(N), radicalInverseVdC(i));
}
vec3 importanceSampleGGX(vec2 xi, vec3 N, float roughness) {
  float a = roughness * roughness;
  float phi = 2.0 * 3.14159265359 * xi.x;
  float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  vec3 h = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, N));
  vec3 bitangent = cross(N, tangent);
  return normalize(tangent * h.x + bitangent * h.y + N * h.z);
}
`;

/** 漫反射辐照度卷积：经纬网格版，存 E/π（分册 7.3.2） */
export const irradianceFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vDirection;
out vec4 fragColor;
uniform samplerCube uEnvironment;
const float PI = 3.14159265359;
const float SAMPLE_DELTA = 0.025;
void main() {
  vec3 N = normalize(vDirection);
  vec3 up    = abs(N.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 right = normalize(cross(up, N));
  vec3 newUp = cross(N, right);

  vec3 sum = vec3(0.0);
  float count = 0.0;
  for (float phi = 0.0; phi < 2.0 * PI; phi += SAMPLE_DELTA) {
    for (float theta = 0.0; theta < 0.5 * PI; theta += SAMPLE_DELTA) {
      vec3 tangent = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
      vec3 dir = right * tangent.x + newUp * tangent.y + N * tangent.z;
      sum += texture(uEnvironment, dir).rgb * cos(theta) * sin(theta);
      count += 1.0;
    }
  }
  fragColor = vec4(PI * sum / count, 1.0); // 存 E/π：运行时直接乘 albedo
}
`;

/** 镜面预过滤：GGX 重要性采样卷积，逐 mip 渲染（分册 7.4.3） */
export const prefilterFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vDirection;
out vec4 fragColor;
uniform samplerCube uEnvironment;
uniform float uRoughness;
const uint SAMPLE_COUNT = 128u;
${IMPORTANCE_GLSL}
void main() {
  vec3 N = normalize(vDirection);
  vec3 V = N; // split-sum 假设：V = R = N
  vec3 prefiltered = vec3(0.0);
  float totalWeight = 0.0;
  for (uint i = 0u; i < SAMPLE_COUNT; ++i) {
    vec2 xi = hammersley(i, SAMPLE_COUNT);
    vec3 H = importanceSampleGGX(xi, N, uRoughness);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);
    float NdotL = max(dot(N, L), 0.0);
    if (NdotL > 0.0) {
      prefiltered += textureLod(uEnvironment, L, 0.0).rgb * NdotL;
      totalWeight += NdotL;
    }
  }
  fragColor = vec4(prefiltered / max(totalWeight, 1e-4), 1.0);
}
`;

/** BRDF 积分查找表：x 轴 NdotV、y 轴 roughness，输出 (A, B)（分册 7.5.2） */
export const brdfLutVS = fullscreenVS;
export const brdfLutFS = /* glsl */ `
#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;
const float PI = 3.14159265359;
const uint SAMPLE_COUNT = 1024u;
${IMPORTANCE_GLSL}
float geometrySchlickGGX(float NdotX, float k) {
  return NdotX / (NdotX * (1.0 - k) + k);
}
float geometrySmith(float NdotV, float NdotL, float roughness) {
  float k = (roughness * roughness) / 2.0; // IBL 版的 k（直接光照是 (r+1)^2/8）
  return geometrySchlickGGX(NdotV, k) * geometrySchlickGGX(NdotL, k);
}
void main() {
  float NdotV = vUV.x;
  float roughness = vUV.y;
  vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
  vec3 N = vec3(0.0, 0.0, 1.0);
  float A = 0.0;
  float B = 0.0;
  for (uint i = 0u; i < SAMPLE_COUNT; ++i) {
    vec2 xi = hammersley(i, SAMPLE_COUNT);
    vec3 H = importanceSampleGGX(xi, N, roughness);
    vec3 L = normalize(2.0 * dot(V, H) * H - V);
    float NdotL = max(L.z, 0.0);
    float NdotH = max(H.z, 0.0);
    float VdotH = max(dot(V, H), 0.0);
    if (NdotL > 0.0) {
      float G = geometrySmith(NdotV, NdotL, roughness);
      float GVis = (G * VdotH) / max(NdotH * NdotV, 1e-4);
      float Fc = pow(1.0 - VdotH, 5.0);
      A += (1.0 - Fc) * GVis;
      B += Fc * GVis;
    }
  }
  fragColor = vec4(A, B, 0.0, 1.0) / float(SAMPLE_COUNT); // RG16F: R=A, G=B
}
`;

/** PBR 场景顶点：与 08 示例同构（世界位置 + 世界法线） */
export const pbrVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
out vec3 vWorldPos;
out vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uViewProjection * world;
}
`;

/** PBR 场景片元：Cook-Torrance 直接光照 + IBL 环境光照 + ACES（分册 7.6.1） */
export const pbrFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec3 vNormal;

uniform vec3  uCamPos;
uniform vec3  uLightDir;
uniform vec3  uLightColor;
uniform vec3  uAlbedo;
uniform float uMetallic;
uniform float uRoughness;

uniform samplerCube uIrradiance;
uniform samplerCube uPrefilter;
uniform sampler2D   uBrdfLut;
uniform float uMaxPrefilterLod;
uniform float uIblIntensity;

out vec4 fragColor;
const float PI = 3.14159265359;

float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  return a2 / (PI * denom * denom);
}
float geometrySchlickGGX(float NdotX, float k) {
  return NdotX / (NdotX * (1.0 - k) + k);
}
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0; // 直接光照的 k
  return geometrySchlickGGX(max(dot(N, V), 0.0), k)
       * geometrySchlickGGX(max(dot(N, L), 0.0), k);
}
vec3 fresnelSchlick(float HdotV, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - HdotV, 5.0);
}
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}
vec3 acesFilm(vec3 x) {
  // Narkowicz 2015 拟合（03-后处理管线 2.4.3）
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(V + L);
  float NdotV = max(dot(N, V), 1e-4);
  vec3 F0 = mix(vec3(0.04), uAlbedo, uMetallic);

  // ---- 直接光照（04-PBR入门 3.2.4 原样） ----
  float NdotL = max(dot(N, L), 0.0);
  float D = distributionGGX(N, H, uRoughness);
  float G = geometrySmith(N, V, L, uRoughness);
  vec3  F = fresnelSchlick(max(dot(H, V), 0.0), F0);
  vec3 specular = (D * G * F) / max(4.0 * NdotV * NdotL, 1e-4);
  vec3 kD = (vec3(1.0) - F) * (1.0 - uMetallic);
  vec3 lambert = uAlbedo / PI;
  vec3 direct = (kD * lambert + specular) * uLightColor * NdotL;

  // ---- IBL 环境光照（分册 7.6） ----
  vec3 Fenv = fresnelSchlickRoughness(NdotV, F0, uRoughness);
  vec3 kS = Fenv;
  vec3 kDenv = (vec3(1.0) - kS) * (1.0 - uMetallic);

  vec3 irradiance = texture(uIrradiance, N).rgb;                 // 漫反射一次采样
  vec3 diffuseIBL = irradiance * uAlbedo;

  vec3 R = reflect(-V, N);
  vec3 prefiltered = textureLod(uPrefilter, R, uRoughness * uMaxPrefilterLod).rgb;
  vec2 brdf = texture(uBrdfLut, vec2(NdotV, uRoughness)).rg;
  vec3 specularIBL = prefiltered * (F0 * brdf.x + brdf.y);

  vec3 ambient = (kDenv * diffuseIBL + specularIBL) * uIblIntensity;

  vec3 color = direct + ambient;
  color = acesFilm(color);
  color = pow(color, vec3(1.0 / 2.2)); // 线性 -> sRGB 近似
  fragColor = vec4(color, 1.0);
}
`;

/** 天空盒：顶点位置即方向，丢视图平移 + xyww 压深度（06-雾效与天空盒 5.2/5.3） */
export const skyboxVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uProj;
uniform mat4 uView;
out vec3 vDir;
void main() {
  vDir = aPosition;
  gl_Position = (uProj * mat4(mat3(uView)) * vec4(aPosition, 1.0)).xyww;
}
`;

export const skyboxFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vDir;
out vec4 fragColor;
uniform samplerCube uSkybox;
vec3 acesFilm(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec3 color = texture(uSkybox, normalize(vDir)).rgb;
  color = acesFilm(color);
  color = pow(color, vec3(1.0 / 2.2));
  fragColor = vec4(color, 1.0);
}
`;
