import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stages = [
  {
    title: '全链路鸟瞰与度量基础',
    dir: '第一阶段',
    desc: '17 步主时间线与耗时账本、浏览器多进程架构与站点隔离、Network/Performance 面板与性能指标全景——先建总账本，再逐段核账',
    tag: '建全局',
  },
  {
    title: '发起请求之前',
    dir: '第二阶段',
    desc: 'URL 语法与解析、导航决策链（HSTS/Service Worker/缓存/BFCache）、跨进程导航与 commit、站点隔离与 OOPIF',
    tag: '走网络',
  },
  {
    title: '建立连接',
    dir: '第三阶段',
    desc: 'DNS 解析全链路、TCP 三次握手与传输控制、TLS 1.2/1.3 握手与证书验证，最后抓包拆一次真实握手',
    tag: '走网络',
  },
  {
    title: 'HTTP 协议与请求语义',
    dir: '第四阶段',
    desc: 'HTTP/1.1 报文与连接管理、HTTP/2 分帧复用与优先级、HTTP/3 与 QUIC、内容协商与条件请求与 Cookie',
    tag: '走网络',
  },
  {
    title: '服务端与响应回程',
    dir: '第五阶段',
    desc: 'CDN 边缘与回源、负载均衡与反向代理、SSR 与流式生成、压缩分块与连接复用、重定向与失败模式',
    tag: '走网络',
  },
  {
    title: '接收、缓存与调度',
    dir: '第六阶段',
    desc: '网络进程接收流水线、HTTP 缓存体系全解、Service Worker、preload scanner 与资源优先级、脚本 defer/async/module',
    tag: '进浏览器',
  },
  {
    title: '解析与构建',
    dir: '第七阶段',
    desc: '字符解码、HTML 解析器状态机与容错、CSS 解析与 CSSOM、样式计算、V8 执行模型、事件循环与任务调度',
    tag: '进浏览器',
  },
  {
    title: '渲染管线',
    dir: '第八阶段',
    desc: '渲染树与 LayoutNG、布局与格式化上下文、分层与合成层、绘制与栅格化、合成器与 vsync、一帧的完整生命周期',
    tag: '渲染上屏',
  },
  {
    title: '首屏与交互',
    dir: '第九阶段',
    desc: '关键渲染路径、FCP/LCP/CLS/INP 测量原理、加载优化手法手册、输入事件链路、水合与下一代渲染架构',
    tag: '渲染上屏',
  },
  {
    title: '实战与毕业',
    dir: '第十阶段',
    desc: 'Performance 面板全轨道解剖、加载类与渲染类案例复盘集、毕业项目：真实站点全链路测量与优化报告',
    tag: '实战毕业',
  },
];

const readingOrder = [
  { step: '1', label: '建全局', text: '第一阶段建立 17 步主时间线总账本，认清浏览器多进程架构，学会用 DevTools 度量——后面每个阶段都回来核账。' },
  { step: '2', label: '走网络', text: '第二到第五阶段沿请求方向推进：导航决策 → DNS/TCP/TLS 建连 → HTTP 协议 → 服务端生成与响应回程。' },
  { step: '3', label: '进浏览器', text: '第六、七阶段进入浏览器内部：接收与缓存与调度、HTML/CSS/JS 解析与构建，脚本如何变成可执行的数据。' },
  { step: '4', label: '渲染与实战', text: '第八到第十阶段从树到像素再到交互：渲染管线 → 首屏指标与优化 → DevTools 深潜与全链路毕业项目。' },
];

const tagAccent = {
  建全局: 'primary',
  走网络: 'cyan',
  进浏览器: 'green',
  渲染上屏: 'purple',
  实战毕业: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/浏览器与网络原理学习大纲', label: '从学习大纲开始 →' }}
        secondary={{ to: '/docs/第一阶段/导览', label: '直达全景时间线' }}
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
          <Heading as="h2">十个阶段</Heading>
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
