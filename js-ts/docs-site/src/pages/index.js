import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';

// 与 docusaurus.config.ts 的 STAGE_LABELS 保持一致：[阶段目录, 中文标签]
const stages = [
  ['stage-0-setup', '阶段 0', '环境准备'],
  ['stage-1-js-core', '阶段 1', 'JavaScript 核心机制'],
  ['stage-2-engine-runtime', '阶段 2', '引擎与运行时'],
  ['stage-3-ts-types', '阶段 3', 'TypeScript 类型系统'],
  ['stage-4-engineering', '阶段 4', '工程化'],
  ['stage-5-topics', '阶段 5', '专题深入'],
];

const cards = [
  ...stages.map(([dir, tag, title]) => ({
    title,
    tag,
    accent: 'primary',
    to: `/${dir}`,
    path: `${dir}/`,
  })),
  {
    title: '在线 Playground',
    desc: '浏览器内真实 tsc 类型检查的 live codeblock 练习场',
    tag: '在线练习',
    accent: 'cyan',
    to: '/live-playground',
  },
];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/stage-1-js-core', label: '从核心机制开始 →' }}
        secondary={{ to: '/live-playground', label: '在线 Playground' }}
      />
      <main>
        <section className="container home-section--last">
          <Heading as="h2">学习路线</Heading>
          <FeatureCardGrid cards={cards} />
        </section>
      </main>
    </Layout>
  );
}
