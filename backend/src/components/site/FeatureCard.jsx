import React from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

// 卡片强调色（--card-accent）：primary 为站群蓝，其余五色用于区分内容分组
const ACCENTS = ['primary', 'purple', 'cyan', 'orange', 'green', 'rose'];

// 站群统一首页卡片：整卡可点，tag / desc / path 均可选。
// 唯一源头 shared/theme/components，由 sync-theme.mjs 同步，勿手改各站副本。
export default function FeatureCard({ title, desc, tag, accent = 'primary', to, href, path }) {
  const color = ACCENTS.includes(accent) ? accent : 'primary';
  return (
    <Link className={`feature-card feature-card--${color}`} to={to} href={href}>
      {tag && <div className="feature-card__tag">{tag}</div>}
      <Heading as="h3" className="feature-card__title">
        {title}
      </Heading>
      {desc && <p className="feature-card__desc">{desc}</p>}
      {path && <div className="feature-card__path">{path}</div>}
    </Link>
  );
}
