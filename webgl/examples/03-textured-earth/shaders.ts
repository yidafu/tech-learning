// 03 纹理地球的着色器（GLSL ES 3.00，attribute 位置与 src/common/geometry.ts 的约定对齐）。
// 对应分册：《02-第二阶段/08-实践-纹理地球.md》第 3 / 4 步。
// 分册为 WebGL1 语法（texture2D / varying），本工程统一用 WebGL2，语义一致。

/** 地球与云层共用的顶点着色器：世界空间位置 / 法线 / UV */
export const earthVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPosition = world.xyz;
  // 自转是纯旋转，法线矩阵 = 模型矩阵左上 3x3；
  // 含非均匀缩放时须用 normalFromMat4（分册注明"别养成习惯"）
  vNormal = mat3(uModel) * aNormal;
  vUv = aUv;
  gl_Position = uViewProjection * world;
}
`;

/** 地球片元：Blinn-Phong + 海洋高光遮罩 + Gamma 校正（sRGB -> 线性 -> 计算 -> sRGB） */
export const earthFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uEarth;
uniform vec3 uLightDirection;   // 指向太阳（平行光）
uniform vec3 uCameraPosition;
out vec4 fragColor;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDirection);
  vec3 V = normalize(uCameraPosition - vWorldPosition);
  vec3 H = normalize(L + V);                       // Blinn-Phong 半程向量

  vec4 texel = texture(uEarth, vUv);
  vec3 albedo = pow(texel.rgb, vec3(2.2));         // (1) sRGB -> 线性
  // 海洋遮罩：程序化地球里海洋蓝色显著高于红绿
  float ocean = smoothstep(0.05, 0.28, texel.b - max(texel.r, texel.g));

  float ndl = max(dot(N, L), 0.0);
  vec3 ambient  = vec3(0.015, 0.02, 0.03) * albedo;  // 很小的环境光，保住夜面细节
  vec3 diffuse  = ndl * albedo;
  float spec = ndl > 0.0 ? pow(max(dot(N, H), 0.0), 80.0) : 0.0;
  vec3 specular = spec * ocean * vec3(1.0, 0.95, 0.85);  // 只有海面晃眼

  vec3 color = ambient + diffuse + specular;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));  // (3) 线性 -> sRGB
  fragColor = vec4(color, 1.0);
}
`;

/** 云层片元：同款漫反射的白云 + 透明混合（夜面云也变暗） */
export const cloudFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uCloud;
uniform vec3 uLightDirection;
uniform float uCloudOpacity;
out vec4 fragColor;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDirection);
  vec4 cloud = texture(uCloud, vUv);
  float ndl = max(dot(N, L), 0.0);
  // 云的亮度：受光的白云 + 极微弱的夜面底光
  vec3 color = vec3(0.98) * (0.06 + 0.94 * ndl);
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  fragColor = vec4(color, cloud.a * uCloudOpacity);
}
`;
