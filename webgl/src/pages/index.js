import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stages = [
  {
    title: '渲染管线与 WebGL 入门',
    dir: '第一阶段',
    desc: '管线全局观、第一个 WebGL 程序、GLSL 基础与图形学数学（MVP 手写），零依赖画出自转公转立方体',
    tag: '打地基',
  },
  {
    title: 'WebGL 核心渲染技术',
    dir: '第二阶段',
    desc: '几何与索引绘制、纹理、渲染状态与测试、光照、FBO 离屏渲染与 WebGL2 特性，实践纹理地球与 FBO 视频播放器',
    tag: '打地基',
  },
  {
    title: '自研数学库与引擎雏形',
    dir: '第三阶段',
    desc: '手写 minmath（向量 / 矩阵 / 四元数）与引擎最小核心：渲染循环、轨道相机、Geometry 生成器，用自研 API 重写地球 demo',
    tag: '做自研',
  },
  {
    title: '框架架构与工程化',
    dir: '第四阶段',
    desc: '分层架构、场景图、材质与着色器系统、拾取交互动画与资源管理，工程化定名发布 npm 包（重点阶段）',
    tag: '做自研',
  },
  {
    title: '进阶渲染与性能',
    dir: '第五阶段',
    desc: '阴影与 PCF 软阴影、后处理管线、PBR 入门、粒子 instancing 实战、天空盒与性能优化（drawcall / 合批 / 抓帧）',
    tag: '懂进阶',
  },
  {
    title: '源码对标与毕业项目',
    dir: '第六阶段',
    desc: 'Three.js 源码研读（渲染器状态机 / shader chunk）、Babylon / regl / Oasis 生态对比、毕业项目需求书与里程碑',
    tag: '做毕业',
  },
];

const readingOrder = [
  { step: '1', label: '打地基', text: '第一、二阶段吃透 WebGL API 与渲染管线，所有 demo 单文件手写、零依赖。' },
  { step: '2', label: '做自研', text: '第三、四阶段把散装代码沉淀为 minmath 数学库 + 迷你引擎，定名发布 npm 包。' },
  { step: '3', label: '懂进阶', text: '第五阶段补齐阴影、后处理、PBR 与性能优化，知道真实引擎强在哪。' },
  { step: '4', label: '做毕业', text: '第六阶段对照 Three.js 源码查漏补缺，用自研框架完成可交互毕业场景。' },
];

const tagAccent = {
  打地基: 'cyan',
  做自研: 'green',
  懂进阶: 'purple',
  做毕业: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/第一阶段/导览', label: '从渲染管线开始 →' }}
        secondary={{ to: '/docs/第六阶段/导览', label: '直达毕业项目' }}
      />
      <main>
        <section className="container home-section">
          <Heading as="h2">建议阅读顺序</Heading>
          <ol className="reading-order">
            {readingOrder.map((item) => (
              <li key={item.step} className="reading-order__item">
                <span className="reading-order__step">{item.step}</span>
                <span className="reading-order__label">{item.label}</span>
                <span className="reading-order__text">{item.text}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="container home-section--last">
          <Heading as="h2">六个阶段</Heading>
          <FeatureCardGrid
            cards={stages.map((stage) => ({
              title: stage.title,
              desc: stage.desc,
              tag: stage.tag,
              accent: tagAccent[stage.tag] ?? 'primary',
              to: `/docs/${stage.dir}/导览`,
              path: `${stage.dir}/`,
            }))}
          />
        </section>
      </main>
    </Layout>
  );
}
