import { defineConfig } from 'vite';

// 多页面入口：每个示例一个 html，逐个列出（构建产物按目录分布在 dist/ 下）。
// 用 new URL(..., import.meta.url).pathname 解析路径，避免依赖 @types/node。
const r = (html: string): string => new URL(`./${html}`, import.meta.url).pathname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: r('index.html'),
        helloTriangle: r('01-hello-triangle/index.html'),
        orbitCube: r('02-orbit-cube/index.html'),
        texturedEarth: r('03-textured-earth/index.html'),
        minmathTest: r('04-minmath-test/index.html'),
        orbitControls: r('05-orbit-controls/index.html'),
        sceneGraph: r('06-scene-graph/index.html'),
        picking: r('07-picking/index.html'),
        shadows: r('08-shadows/index.html'),
        pbrIbl: r('09-pbr-ibl/index.html'),
        ssao: r('10-ssao/index.html'),
        gpuTimer: r('11-gpu-timer/index.html'),
        csm: r('12-csm/index.html'),
        frustumCulling: r('13-frustum-culling/index.html'),
      },
    },
  },
});
