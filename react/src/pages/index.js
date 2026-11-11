import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const outlines = [
  {
    title: '学习大纲（基础）',
    dir: 'react-学习大纲',
    desc: '阶段 0–10 全基础，场景驱动版，12–14 周',
    tag: '打基础',
  },
  {
    title: '进阶大纲：复杂场景',
    dir: 'react-进阶大纲-复杂场景',
    desc: 'Schema 驱动的复杂业务场景：动态表单 / 设计器 / 仪表盘 / JSON 编辑器 / 低代码',
    tag: '上难度',
  },
  {
    title: '高阶场景全景图',
    dir: 'react-高阶场景全景图',
    desc: '7 大族群 23 个高阶场景选型地图',
    tag: '扩视野',
  },
  {
    title: '高阶场景第二辑',
    dir: 'react-高阶场景-第二辑',
    desc: '搭建器族 6 场景 + 权限 / 主题 / 国际化 + SaaS 毕业项目',
    tag: '扩视野',
  },
  {
    title: '组件库实战大纲',
    dir: 'react-组件库实战大纲',
    desc: 'Part A 内功 → Lv1–Lv4 组件阶梯 → Part C 工程化',
    tag: '练功力',
  },
  {
    title: '源码复刻大纲',
    dir: 'react-源码复刻大纲',
    desc: 'didact 式 mini React，M1–M10 里程碑，约 5 周',
    tag: '懂原理',
  },
  {
    title: '项目复刻手册',
    dir: 'react-复杂场景-项目复刻',
    desc: '复杂场景项目级复刻：拖拽仪表盘 / 低代码平台整合',
    tag: '做项目',
  },
];

const readingOrder = [
  { step: '1', label: '打基础', text: '《学习大纲》阶段 0–4（必须），阶段 5–8 按需。' },
  { step: '2', label: '上难度', text: '《进阶大纲：复杂场景》—— schema 内核是后面所有场景的公共底座。' },
  { step: '3', label: '扩视野', text: '《高阶场景全景图》选方向，《高阶场景第二辑》吃透搭建器族与 SaaS 三件套。' },
  { step: '4', label: '练功力', text: '《组件库实战大纲》Part A → Lv 阶梯，与场景线并行。' },
  { step: '5', label: '懂原理', text: '《源码复刻大纲》可随时穿插，复刻完回头看前五份会更透。' },
];

const tagAccent = {
  打基础: 'primary',
  上难度: 'purple',
  扩视野: 'cyan',
  练功力: 'orange',
  懂原理: 'green',
  做项目: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/react-学习大纲', label: '从基础开始 →' }}
        secondary={{ to: '/docs/react-高阶场景全景图', label: '浏览场景全景图' }}
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
          <Heading as="h2">七份大纲</Heading>
          <FeatureCardGrid
            cards={outlines.map((outline) => ({
              title: outline.title,
              desc: outline.desc,
              tag: outline.tag,
              accent: tagAccent[outline.tag] ?? 'primary',
              to: `/docs/${outline.dir}`,
              path: `${outline.dir}/`,
            }))}
          />
        </section>
      </main>
    </Layout>
  );
}
