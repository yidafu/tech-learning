import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const modules = [
  {
    title: '全景与演进',
    dir: 'rn-全景与演进',
    desc: 'RN 技术本质、跨端方案对比（Flutter / Hybrid / Lynx）、版本演进与新旧架构版图',
    tag: '建全局',
  },
  {
    title: '启动流程原理',
    dir: 'rn-启动流程原理',
    desc: 'Android / iOS 启动链路、Bundle 加载与 runApplication、启动优化手段的原理',
    tag: '打地基',
  },
  {
    title: 'JS 引擎与线程模型',
    dir: 'rn-JS引擎与线程模型',
    desc: 'JSC / Hermes / V8 对比、Hermes 字节码与 GC、四线程模型与批量调度',
    tag: '打地基',
  },
  {
    title: 'Bridge 通信原理',
    dir: 'rn-Bridge通信原理',
    desc: '旧架构核心：异步消息队列、JSON 序列化、Native Modules 双向调用链与瓶颈',
    tag: '懂原理',
  },
  {
    title: '渲染原理',
    dir: 'rn-渲染原理',
    desc: '三棵树（Element → Shadow → Native View）、Reconciler 定制、Yoga 布局引擎',
    tag: '懂原理',
  },
  {
    title: '事件系统原理',
    dir: 'rn-事件系统原理',
    desc: '触摸事件从原生到 JS 的链路、Responder 手势仲裁、Gesture Handler 原生化',
    tag: '懂原理',
  },
  {
    title: '新架构 JSI / Fabric',
    dir: 'rn-新架构',
    desc: 'JSI 同步接口层、Fabric 渲染管线、TurboModules 懒加载、Codegen 与迁移',
    tag: '上新架构',
  },
  {
    title: 'Metro 打包与热更新',
    dir: 'rn-Metro打包与热更新',
    desc: 'Metro 三阶段、Bundle 文件结构剖析、require 实现、CodePush 差分与签名',
    tag: '懂工程',
  },
  {
    title: '性能优化原理',
    dir: 'rn-性能优化原理',
    desc: 'Perfetto / DevTools 定位方法论、FlatList / FlashList 虚拟化、掉帧归因',
    tag: '懂工程',
  },
  {
    title: '原理实战',
    dir: 'rn-原理实战',
    desc: '手写 mini-react-native、自定义 TurboModule、Fabric 组件、调试工具链',
    tag: '做实战',
  },
  {
    title: '测试体系',
    dir: 'rn-测试体系',
    desc: 'Jest 预设与组件测试渲染器原理、mock 纪律、Detox / Maestro / Appium 选型',
    tag: '懂工程',
  },
  {
    title: '混合开发',
    dir: 'rn-混合开发',
    desc: 'RN 嵌入既有原生 App：双端集成、多实例与生命周期、混合导航与通信边界',
    tag: '懂工程',
  },
];

const readingOrder = [
  { step: '1', label: '建全局', text: '《全景与演进》先看清 RN 的技术本质与新旧架构版图，建立整体地图。' },
  { step: '2', label: '走主线', text: '启动 → 线程与引擎 → Bridge 通信 → 渲染 → 事件，吃透旧架构的一条龙链路。' },
  { step: '3', label: '上新架构', text: '《新架构》模块对照 JSI / Fabric / TurboModules，理解每一次演进要解决什么。' },
  { step: '4', label: '会实战', text: 'Metro 打包、性能归因、mini-react-native 复刻，把原理落回工程与动手。' },
];

const tagAccent = {
  建全局: 'primary',
  打地基: 'orange',
  懂原理: 'green',
  上新架构: 'purple',
  懂工程: 'cyan',
  做实战: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/rn-全景与演进', label: '从全景开始 →' }}
        secondary={{ to: '/docs/rn-新架构', label: '直达新架构' }}
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
          <Heading as="h2">十二个模块</Heading>
          <FeatureCardGrid
            cards={modules.map((mod) => ({
              title: mod.title,
              desc: mod.desc,
              tag: mod.tag,
              accent: tagAccent[mod.tag] ?? 'primary',
              to: `/docs/${mod.dir}`,
              path: `${mod.dir}/`,
            }))}
          />
        </section>
      </main>
    </Layout>
  );
}
