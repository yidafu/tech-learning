// 12 级联阴影示例的着色器（GLSL ES 3.00）。
// 对应分册：《05-第五阶段/11-级联阴影CSM.md》10.4（级联下的 bias 与接缝）、
// 10.5.2（选级与采样）。

/** 阴影 pass 顶点：与 08 示例相同——只把顶点变换到"某一级"的光源裁剪空间 */
export const shadowVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uLightVP;      // 当前级的 lightProj * lightBasis
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

/** 主 pass 顶点：正常 MVP，额外输出视深（选级用，分册 10.5.2） */
export const mainVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat4 uView;
out vec3 vWorldPos;
out vec3 vNormal;
out float vViewDepth;   // -(view.z)：到相机的前向距离，恒为正
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vViewDepth = -(uView * world).z;
  gl_Position = uViewProjection * world;
}
`;

/**
 * 主 pass 片元：按视深选级 -> 随级缩放的 bias + 法线偏移 -> 3x3 PCF，
 * 级间用 blend band 过渡（分册 10.4.3）。
 * 级联核心思路：uLightVP / uNormalOffset / uBiasScale 都是"每级一份"的数组，
 * 采样同一张深度纹理数组的不同层。
 */
export const mainFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec3 vNormal;
in float vViewDepth;

uniform sampler2DArrayShadow uShadowMap;  // 3 层深度纹理数组（比较模式）
uniform mat4  uLightVP[3];       // 每级 lightProj * lightBasis
uniform vec3  uLightDir;         // 指向光源的单位向量
uniform vec3  uCameraPosition;
uniform vec3  uBaseColor;
uniform float uTexelSize;        // 1.0 / SHADOW_SIZE
uniform float uSplitFar[3];      // 各级视深上限（正距离）
uniform float uNearDepth;        // 相机 near（级 0 的段首）
uniform float uNormalOffset[3];  // 各级法线偏移（世界单位 = 纹素尺寸 x 系数）
uniform float uBiasTexelNdc[3];  // 各级"一个纹素"折算的 NDC 深度（随级缩放）
uniform float uBlendBand;        // 级间过渡带（占该级深度区间的比例）
uniform float uShadowEnabled;    // 空格开关
uniform float uShowCascadeTint;  // C 键：按级染色调试

out vec4 fragColor;

// 视深落在哪一段（分册 10.5.2 的选级比较）
int pickCascade() {
  if (vViewDepth < uSplitFar[0]) return 0;
  if (vViewDepth < uSplitFar[1]) return 1;
  return 2;
}

// 第 c 级采样：法线偏移 + 随级缩放的坡度 bias + 3x3 PCF
float sampleCascade(int c, vec3 N, vec3 L) {
  // 法线偏移：采样点沿法线抬离表面一段（世界单位，随该级纹素尺寸放大）
  vec3 pos = vWorldPos + N * uNormalOffset[c];
  vec4 sc = uLightVP[c] * vec4(pos, 1.0);
  vec3 proj = sc.xyz * 0.5 + 0.5;   // 正交投影 w 恒为 1，透视除法可省（但留着无害）
  // 超出本级光锥：不在管辖内，按无阴影（否则 CLAMP 把边缘纹素铺开成黑边）
  if (proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0 || proj.z > 1.0)
    return 1.0;
  // 坡度感知 bias：误差 ≈ 纹素尺寸 x tanθ，故以"纹素的 NDC 深度"为单位随级缩放
  float texelNdc = uBiasTexelNdc[c];
  float bias = max(2.0 * texelNdc * (1.0 - dot(N, L)), 0.25 * texelNdc);
  // 3x3 PCF：9 次硬件比较求平均（先比较后平均）
  float shadow = 0.0;
  for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
      vec2 offset = vec2(float(x), float(y)) * uTexelSize;
      // sampler2DArrayShadow：vec4(uv, 层号, 参考深度)——层号是坐标，可动态选
      shadow += texture(uShadowMap, vec4(proj.xy + offset, float(c), proj.z - bias));
    }
  }
  return shadow / 9.0;
}

float calcShadow(vec3 N, vec3 L) {
  int c = pickCascade();
  float s = sampleCascade(c, N, L);
  // 级间过渡：接近本级上限时与下一级按比例混合，隐藏 seam（分册 10.4.3）
  if (c < 2) {
    float segNear = uNearDepth;
    if (c > 0) segNear = uSplitFar[c - 1];
    float t = (uSplitFar[c] - vViewDepth) / (uSplitFar[c] - segNear); // 1=段首 0=段尾
    if (t < uBlendBand) {
      float w = smoothstep(0.0, uBlendBand, t);   // 段尾处 w=0，完全切到下一级
      s = mix(sampleCascade(c + 1, N, L), s, w);
    }
  }
  return s;
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

  // 调试染色：近级偏红、中级偏绿、远级偏蓝，直接看到各级覆盖范围
  if (uShowCascadeTint > 0.5) {
    int c = pickCascade();
    vec3 tint = c == 0 ? vec3(1.25, 0.55, 0.5)
             : (c == 1 ? vec3(0.55, 1.15, 0.6) : vec3(0.55, 0.7, 1.3));
    color *= tint;
  }
  fragColor = vec4(color, 1.0);
}
`;

/** 调试线框（每级光锥的 NDC 盒）：位置直接给世界坐标 */
export const debugVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uViewProjection;
void main() {
  gl_Position = uViewProjection * vec4(aPosition, 1.0);
}
`;

export const debugFS = /* glsl */ `
#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 fragColor;
void main() { fragColor = vec4(uColor, 1.0); }
`;
