// 10 SSAO 示例的着色器（GLSL ES 3.00）。
// 对应分册：《05-第五阶段/09-屏幕空间环境光遮蔽.md》8.2（G-buffer）、8.4（遮蔽计算）、
// 8.5（模糊）、8.6（光照合成）。所有计算在视空间进行。

/** 全屏三角形（03-后处理管线 2.1.2 的 gl_VertexID 技巧），SSAO/模糊/合成三个 pass 共用 */
export const fullscreenVS = /* glsl */ `
#version 300 es
out vec2 vUV;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  vUV = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

/** G-buffer 顶点：输出视空间位置与法线（分册 8.2.2） */
export const gbufferVS = /* glsl */ `
#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uViewProjection;
out vec3 vViewPos;
out vec3 vViewNormal;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vec4 view = uView * world;
  vViewPos = view.xyz;
  // 本示例全部为旋转 + 等比缩放，mat3 级联够用；非均匀缩放须用 normalFromMat4
  vViewNormal = mat3(uView) * mat3(uModel) * aNormal;
  gl_Position = uViewProjection * world;
}
`;

/** G-buffer 片元：MRT 双输出（附件 0 位置、附件 1 法线，都是视空间） */
export const gbufferFS = /* glsl */ `
#version 300 es
precision highp float;
in vec3 vViewPos;
in vec3 vViewNormal;
layout(location = 0) out vec4 oViewPos;
layout(location = 1) out vec4 oViewNormal;
void main() {
  oViewPos = vec4(vViewPos, 1.0);
  oViewNormal = vec4(normalize(vViewNormal), 1.0);
}
`;

/** SSAO 遮蔽计算：64 半球采样核 x 每像素随机旋转（分册 8.4） */
export const ssaoFS = /* glsl */ `
#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uPosition;   // 视空间位置
uniform sampler2D uNormal;     // 视空间法线
uniform sampler2D uNoise;      // 4x4 旋转噪声（REPEAT 平铺）
uniform vec2  uNoiseScale;     // 屏幕尺寸 / 4.0
uniform vec3  uSamples[64];    // 半球采样核（视空间，法线朝 +Z）
uniform mat4  uProjection;
uniform float uRadius;
uniform float uBias;

void main() {
  vec3 fragPos = texture(uPosition, vUV).xyz;
  vec3 normal = normalize(texture(uNormal, vUV).rgb);

  // 1) 该像素的随机 TBN：噪声向量对法线 Gram-Schmidt 正交化
  vec3 rvec = texture(uNoise, vUV * uNoiseScale).xyz;
  vec3 tangent = normalize(rvec - normal * dot(rvec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);

  // 2) 半球采样 -> 投影回屏幕 -> 比深度
  float occlusion = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 samplePos = TBN * uSamples[i];
    samplePos = fragPos + samplePos * uRadius;

    vec4 offset = uProjection * vec4(samplePos, 1.0);
    offset.xy /= offset.w;
    offset.xy = offset.xy * 0.5 + 0.5;

    float sampleDepth = texture(uPosition, offset.xy).z;
    // rangeCheck：深度差超过半径的算背景，不计入（防远处物体造成幻影遮挡）
    float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(fragPos.z - sampleDepth));
    occlusion += step(samplePos.z + uBias, sampleDepth) * rangeCheck;
  }
  occlusion = 1.0 - occlusion / 64.0;
  fragColor = vec4(vec3(occlusion), 1.0);
}
`;

/** 4x4 盒滤波去噪：噪声是高频、结构是低频，不认边缘的均值就够（分册 8.5） */
export const blurFS = /* glsl */ `
#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D uOcclusion;
uniform vec2 uTexelSize;
void main() {
  float result = 0.0;
  vec2 offset = uTexelSize * 2.0; // 步进 2 个纹素：覆盖 4x4 邻域
  for (int x = -2; x < 2; ++x) {
    for (int y = -2; y < 2; ++y) {
      result += texture(uOcclusion, vUV + vec2(float(x), float(y)) * offset).r;
    }
  }
  fragColor = vec4(vec3(result / 16.0), 1.0);
}
`;

/** 光照合成：G-buffer 重着色，AO 只乘环境光（分册 8.6）；uDebugAo=1 时直接显示遮蔽缓冲 */
export const lightingFS = /* glsl */ `
#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uPosition;
uniform sampler2D uNormal;
uniform sampler2D uAo;            // 模糊后的遮蔽图
uniform vec3  uLightDirView;      // 平行光方向（视空间）
uniform vec3  uLightColor;
uniform float uAoEnabled;         // 0/1：空格开关
uniform float uDebugAo;           // 0/1：V 键查看遮蔽缓冲

void main() {
  float ao = texture(uAo, vUV).r;
  if (uDebugAo > 0.5) {
    fragColor = vec4(vec3(ao), 1.0);
    return;
  }
  ao = mix(1.0, ao, uAoEnabled);

  vec3 fragPos = texture(uPosition, vUV).xyz;
  vec3 normal = normalize(texture(uNormal, vUV).rgb);

  // 视空间里相机在原点
  vec3 viewDir = normalize(-fragPos);
  vec3 lightDir = normalize(uLightDirView);
  vec3 halfDir = normalize(lightDir + viewDir);

  float ndl = max(dot(normal, lightDir), 0.0);
  float ndh = max(dot(normal, halfDir), 0.0);

  vec3 baseColor = vec3(0.62, 0.60, 0.58);
  vec3 ambient = baseColor * 0.4 * ao;               // <- AO 只乘环境光
  vec3 diffuse = baseColor * ndl;
  vec3 specular = vec3(0.25) * pow(ndh, 32.0);

  vec3 color = ambient + (diffuse + specular) * uLightColor;
  fragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}
`;
