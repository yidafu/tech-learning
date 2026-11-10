import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const phases = [
  {
    n: '阶段 0',
    title: '概念基础',
    desc: '可观测性 vs 监控、三大支柱、OpenTelemetry 基本概念与 Collector 架构',
    to: '/docs/notes/concepts',
    lab: '/docs/labs/lab00-otel-collector-basics',
    labLabel: 'lab00 · OTel Collector 入门',
  },
  {
    n: '阶段 1',
    title: '指标 Metrics',
    desc: 'Prometheus 数据模型、PromQL、exporter 埋点、Grafana 可视化与告警',
    to: '/docs/notes/metrics',
    lab: '/docs/labs/lab01-prometheus-grafana',
    labLabel: 'lab01 · Prometheus + Grafana',
  },
  {
    n: '阶段 2',
    title: '日志 Logging',
    desc: '结构化日志、Loki / ELK / ClickHouse 选型、采集器（Vector / Fluent Bit）',
    to: '/docs/notes/logging',
    lab: '/docs/labs/lab02-loki-vector-logging',
    labLabel: 'lab02 · Loki + Vector 日志',
  },
  {
    n: '阶段 3',
    title: '链路追踪 Tracing',
    desc: 'trace/span 模型、context 传播（W3C Trace Context）、OTel SDK + Collector、Jaeger / Tempo',
    to: '/docs/notes/tracing',
    lab: '/docs/labs/lab03-otel-tracing-jaeger',
    labLabel: 'lab03 · OTel Tracing + Jaeger',
  },
  {
    n: '阶段 4',
    title: '整合与告警',
    desc: '三大支柱关联（exemplars、日志带 trace_id）、统一仪表盘、SLO 与错误预算、Alertmanager',
    to: '/docs/notes/integration',
    lab: '/docs/labs/lab04-three-pillars',
    labLabel: 'lab04 · 三支柱整合',
  },
  {
    n: '阶段 5',
    title: '生产进阶',
    desc: '采样策略、高基数问题、持续性能剖析（Pyroscope）、eBPF、Kubernetes 可观测性',
    to: '/docs/notes/production',
    lab: '/docs/labs/lab05-sampling-and-profiling',
    labLabel: 'lab05 · 采样与剖析',
  },
  {
    n: '阶段 6',
    title: '系统设计（收官）',
    desc: '从零设计一个可观测系统：总体架构与容量、SDK 设计、接入管道、存储后端、查询与告警',
    to: '/docs/notes/system-design',
    lab: null,
    labLabel: 'lab06 规划中',
  },
];

const references = [
  { name: 'OpenTelemetry', href: 'https://opentelemetry.io/docs/' },
  { name: 'Prometheus', href: 'https://prometheus.io/docs/' },
  { name: 'Grafana Loki', href: 'https://grafana.com/docs/loki/' },
  { name: 'Jaeger', href: 'https://www.jaegertracing.io/docs/' },
  { name: 'Google SRE Books', href: 'https://sre.google/books/' },
];

function PhaseCard({ phase }) {
  return (
    <div className="col col--6 margin-bottom--lg">
      <div className="card card--variant-elevation height-100%">
        <div className="card__header">
          <span className="badge badge--primary">{phase.n}</span>{' '}
          <h3 style={{ display: 'inline' }}>{phase.title}</h3>
        </div>
        <div className="card__body">
          <p>{phase.desc}</p>
        </div>
        <div className="card__footer">
          <Link className="button button--primary button--sm" to={phase.to}>
            阅读笔记
          </Link>{' '}
          {phase.lab ? (
            <Link className="button button--secondary button--sm" to={phase.lab}>
              {phase.labLabel}
            </Link>
          ) : (
            <span className="badge badge--secondary">{phase.labLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <header className="hero hero--primary hero-banner">
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className="margin-top--md">
            <Link className="button button--secondary button--lg margin-right--sm" to="/docs/notes/concepts">
              从概念开始 →
            </Link>
            <Link className="button button--outline button--secondary button--lg" to="/docs/labs/lab00-otel-collector-basics">
              直接动手跑 lab
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="container margin-vert--xl">
          <h2>学习路线（6 阶段 + 收官设计）</h2>
          <p>
            每个阶段先读笔记，再跑对应 lab。实验一律 <code>podman compose</code>{' '}
            一键运行，环境要求与前置条件见各 lab 的 README。
          </p>
          <div className="row">
            {phases.map((phase) => (
              <PhaseCard key={phase.n} phase={phase} />
            ))}
          </div>
        </section>
        <section className="container margin-vert--xl">
          <h2>建议学习顺序</h2>
          <ol>
            <li>
              <strong>阶段 0 → 1 → 2 → 3</strong> 顺序学习：概念 → 三大支柱逐个击破，每个阶段先读笔记，再跑对应 lab。
            </li>
            <li>
              <strong>阶段 4</strong> 是收获阶段：把三大支柱关联起来（trace_id 串联日志与指标、exemplars、统一仪表盘），并落地
              SLO 与告警。
            </li>
            <li>
              <strong>阶段 5</strong> 按需深入：采样、高基数、持续剖析、eBPF、K8s 场景。
            </li>
            <li>
              <strong>阶段 6</strong> 收官复盘：站在"自己造一个"的架构师视角，把 0–5 的组件翻转为设计决策；面试冲刺可只读各篇"面试题小结"。
            </li>
          </ol>
        </section>
        <section className="container margin-vert--xl">
          <h2>参考资料（权威入口）</h2>
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
