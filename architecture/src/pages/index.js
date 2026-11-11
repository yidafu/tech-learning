import React from 'react'
import Layout from '@theme/Layout'
import Heading from '@theme/Heading'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import SiteHero from '@site/src/components/site/SiteHero'
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid'

// 与 docusaurus.config.mjs 的 stages 保持一致：[阶段名, 导览页 slug] → URL /<阶段名>/<slug>
const stages = [
  ['第一阶段', '架构思维与设计基础'],
  ['第二阶段', '经典架构模式'],
  ['第三阶段', '分布式系统核心技术'],
  ['第四阶段', '架构方法论'],
  ['第五阶段', '工程化与运维视角'],
  ['第六阶段', '实战与案例分析'],
]

const cards = [
  {
    title: '学习大纲',
    desc: '六阶段学习路线总览：目标、阶段划分与建议节奏',
    tag: '总览',
    accent: 'purple',
    to: '/软件架构学习大纲',
  },
  ...stages.map(([stage, slug], i) => ({
    title: stage,
    desc: slug,
    tag: `阶段 ${i + 1}`,
    accent: 'primary',
    to: `/${stage}/${slug}`,
  })),
  {
    title: '示例项目场景',
    desc: '订单系统 / 工单中心 / 低代码平台等专题场景档案，贯穿各阶段',
    tag: '实战',
    accent: 'green',
    to: '/示例项目场景/导览',
  },
  {
    title: '知识图谱',
    desc: '全站笔记关系力导向图，按链接密度发现知识枢纽',
    tag: '图谱',
    accent: 'cyan',
    to: '/graph',
  },
]

export default function Home() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/软件架构学习大纲', label: '打开学习大纲 →' }}
        secondary={{ to: '/graph', label: '查看知识图谱' }}
      />
      <main>
        <section className="container home-section--last">
          <Heading as="h2">学习路线</Heading>
          <FeatureCardGrid cards={cards} />
        </section>
      </main>
    </Layout>
  )
}
