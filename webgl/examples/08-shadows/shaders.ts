// 08 阴影示例的着色器（GLSL ES 3.00）。
// 对应分册：《05-第五阶段/02-阴影与PCF软阴影.md》1.1.4（两 pass 着色器）与 1.3.3（完整阴影着色器）。

/** Pass 1（阴影 pass）：只负责把顶点变换到光源裁剪空间，片元着色器可为空 */
export const shadowVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uLightVP;      // lightProj * lightView
uniform mat4 uModel;
void main() {
  gl_Position = uLightVP * uModel * vec4(aPosition, 1.0);
}
`;

/** WebGL2 要求片元着色器必须存在，空实现即可 */
export const shadowFS = /* glsl */ `
#version 300 es
precision mediump float;
void main() {}
`;

/** Pass 2（主 pass）顶点：正常 MVP，额外输出光源裁剪空间坐标（保留 w） */
export const mainVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat4 uLightVP;
out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vShadowCoord;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vShadowCoord = uLightVP * world;  // 同一个矩阵，两 pass 各用一次
  gl_Position = uViewProjection * world;
}
`;

/** Pass 2 片元：Blinn-Phong + 坡度感知 bias + 3x3 PCF（分册 1.3.3 原版） */
export const mainFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vShadowCoord;

uniform sampler2DShadow uShadowMap;   // 比较模式深度纹理
uniform vec3  uLightDir;              // 指向光源的单位向量
uniform vec3  uCameraPosition;
uniform vec3  uBaseColor;
uniform float uShadowTexelSize;       // 1.0 / SHADOW_SIZE
uniform float uShadowEnabled;         // 0/1：空格开关，对比有无阴影

out vec4 fragColor;

float calcShadow(vec3 normal, vec3 lightDir) {
  // 1) 透视除法 + NDC [-1,1] -> [0,1]
  vec3 proj = vShadowCoord.xyz / vShadowCoord.w;
  proj = proj * 0.5 + 0.5;
  // 2) 超出光锥范围：不在本张 shadow map 管辖内，按无阴影处理
  if (proj.z > 1.0 || proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0)
    return 1.0;
  // 3) 坡度感知 bias：角度越掠射（dot 越小），垫得越多（1.2.2 的推导结论）
  float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
  // 4) 3x3 PCF：9 次硬件比较求平均（先比较后平均，"先平均再比较"没有物理意义）
  float shadow = 0.0;
  for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
      vec2 offset = vec2(float(x), float(y)) * uShadowTexelSize;
      shadow += texture(uShadowMap, vec3(proj.xy + offset, proj.z - bias));
    }
  }
  return shadow / 9.0;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPosition - vWorldPos);
  vec3 H = normalize(L + V);

  float ndl = max(dot(N, L), 0.0);
  vec3 ambient  = uBaseColor * 0.18;
  vec3 diffuse  = uBaseColor * ndl;
  float spec = pow(max(dot(N, H), 0.0), 40.0);
  vec3 specular = vec3(0.9) * spec;

  float shadow = mix(1.0, calcShadow(N, L), uShadowEnabled);
  vec3 color = ambient + (diffuse + specular) * shadow;
  fragColor = vec4(color, 1.0);
}
`;
