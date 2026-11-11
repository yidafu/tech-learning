import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';

const phases = [
  {
    n: '阶段 0',
    title: '概念基础',
    desc: '可观测性 vs 监控、三大支柱、OpenTelemetry 基本概念与 Collector 架构',
    to: '/docs/notes/concepts',
    lab: 'lab00 · OTel Collector 入门',
  },
  {
    n: '阶段 1',
    title: '指标 Metrics',
    desc: 'Prometheus 数据模型、PromQL、exporter 埋点、Grafana 可视化与告警',
    to: '/docs/notes/metrics',
    lab: 'lab01 · Prometheus + Grafana',
  },
  {
    n: '阶段 2',
    title: '日志 Logging',
    desc: '结构化日志、Loki / ELK / ClickHouse 选型、采集器（Vector / Fluent Bit）',
    to: '/docs/notes/logging',
    lab: 'lab02 · Loki + Vector 日志',
  },
  {
    n: '阶段 3',
    title: '链路追踪 Tracing',
    desc: 'trace/span 模型、context 传播（W3C Trace Context）、OTel SDK + Collector、Jaeger / Tempo',
    to: '/docs/notes/tracing',
    lab: 'lab03 · OTel Tracing + Jaeger',
  },
  {
    n: '阶段 4',
    title: '整合与告警',
    desc: '三大支柱关联（exemplars、日志带 trace_id）、统一仪表盘、SLO 与错误预算、Alertmanager',
    to: '/docs/notes/integration',
    lab: 'lab04 · 三支柱整合',
  },
  {
    n: '阶段 5',
    title: '生产进阶',
    desc: '采样策略、高基数问题、持续性能剖析（Pyroscope）、eBPF、Kubernetes 可观测性',
    to: '/docs/notes/production',
    lab: 'lab05 · 采样与剖析',
  },
  {
    n: '阶段 6',
    title: '系统设计（收官）',
    desc: '从零设计一个可观测系统：总体架构与容量、SDK 设计、接入管道、存储后端、查询与告警',
    to: '/docs/notes/system-design',
    lab: 'lab06 规划中',
  },
];

const readingOrder = [
  { step: '1', label: '阶段 0–3', text: '顺序学习：概念 → 三大支柱逐个击破，每个阶段先读笔记，再跑对应 lab。' },
  { step: '2', label: '阶段 4', text: '收获阶段：把三大支柱关联起来（trace_id 串联日志与指标、exemplars、统一仪表盘），并落地 SLO 与告警。' },
  { step: '3', label: '阶段 5', text: '按需深入：采样、高基数、持续剖析、eBPF、K8s 场景。' },
  { step: '4', label: '阶段 6', text: '收官复盘：站在「自己造一个」的架构师视角，把 0–5 的组件翻转为设计决策；面试冲刺可只读各篇「面试题小结」。' },
];

const references = [
  { name: 'OpenTelemetry', href: 'https://opentelemetry.io/docs/' },
  { name: 'Prometheus', href: 'https://prometheus.io/docs/' },
  { name: 'Grafana Loki', href: 'https://grafana.com/docs/loki/' },
  { name: 'Jaeger', href: 'https://www.jaegertracing.io/docs/' },
  { name: 'Google SRE Books', href: 'https://sre.google/books/' },
];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/notes/concepts', label: '从概念开始 →' }}
        secondary={{ to: '/docs/labs/lab00-otel-collector-basics', label: '直接动手跑 lab' }}
      />
      <main>
        <section className="container home-section">
          <Heading as="h2">学习路线（6 阶段 + 收官设计）</Heading>
          <p>
            每个阶段先读笔记，再跑对应 lab。实验一律 <code>podman compose</code>{' '}
            一键运行，环境要求与前置条件见各 lab 的 README。
          </p>
          <FeatureCardGrid
            cards={phases.map((phase) => ({
              title: phase.title,
              desc: phase.desc,
              tag: phase.n,
              accent: 'primary',
              to: phase.to,
              path: phase.lab,
            }))}
          />
        </section>
        <section className="container home-section">
          <Heading as="h2">建议学习顺序</Heading>
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
          <Heading as="h2">参考资料（权威入口）</Heading>
          <ul>
            {references.map((ref) => (
              <li key={ref.href}>
                <a href={ref.href} target="_blank" rel="noopener noreferrer">
                  {ref.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Layout>
  );
}
