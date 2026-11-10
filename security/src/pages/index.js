import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

const stages = [
  { n: '01', title: '基础', desc: '网络 / 操作系统 / Linux / Python·C 基础加固', to: '/docs/fundamentals' },
  { n: '02', title: '安全基础概念', desc: 'CIA / 威胁建模 / 漏洞分类 / 密码学与 TLS', to: '/docs/security-concepts' },
  { n: '03', title: 'Web 安全', desc: '注入 / XSS / CSRF·SSRF / 认证与会话 / Burp 与靶场', to: '/docs/web-security' },
  { n: '04', title: '系统与二进制安全', desc: '汇编 / 内存布局 / 溢出与 ROP / 二进制分析工具', to: '/docs/binary-security' },
  { n: '05', title: '网络安全与防御', desc: 'nmap / Wireshark / 防火墙·IDS / 日志与渗透方法论', to: '/docs/network-defense' },
  { n: '06', title: '安全工程', desc: '安全编码 / 供应链 / 密钥管理 / SDLC / 应急响应', to: '/docs/security-engineering' },
  { n: '07', title: 'CTF 实战', desc: 'Web / Pwn / Crypto / Reverse / Misc 方向入门与刷题', to: '/docs/ctf' },
  { n: '08', title: 'Android 安全', desc: '扩展阶段：APK 逆向 / 组件与存储安全 / Frida 动态分析', to: '/docs/android-security' },
  { n: '09', title: '横向专题篇', desc: '跨阶段专题整合：重大 CVE 案例剖析等', to: '/docs/topics' },
  { n: '10', title: '资源索引', desc: '书单 / 课程 / CTF 平台与工具 / Android 安全资源', to: '/docs/resources' },
];

function StageCard({ n, title, desc, to }) {
  return (
    <div className="col col--3 margin-bottom--md">
      <Link to={to} className="card card--variant-default stage-card">
        <div className="card__header">
          <span className="badge badge--primary margin-right--sm">{n}</span>
          <strong>{title}</strong>
        </div>
        <div className="card__body">
          <p>{desc}</p>
        </div>
      </Link>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <header className="hero hero--primary">
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div>
            <Link className="button button--secondary button--lg margin--sm" to="/docs">
              从总索引开始 →
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="container margin-vert--lg">
          <div className="row">
            {stages.map((props) => (
              <StageCard key={props.to} {...props} />
            ))}
          </div>
          <div className="alert alert--warning margin-top--lg" role="alert">
            <strong>合规红线：</strong>所有实验仅限本地隔离靶场（VM / Docker / DVWA / WebGoat 等）或明确授权的环境，不触碰真实第三方系统。
          </div>
        </section>
      </main>
    </Layout>
  );
}
