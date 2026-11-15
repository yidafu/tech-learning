import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';

// 站群统一首页 Hero：站名 + tagline + 可选双按钮。
// 唯一源头 shared/theme/components，由 sync-theme.mjs 同步，勿手改各站副本。
// primary/secondary 形如 { to: '/docs/xxx', label: '从基础开始 →' }，secondary 可用 href 指外链。
export default function SiteHero({ primary, secondary }) {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className="hero hero--primary hero--landing">
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        {(primary || secondary) && (
          <div className="hero__buttons">
            {primary && (
              <Link className="button button--secondary button--lg" to={primary.to}>
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link
                className="button button--outline button--lg hero__button-ghost"
                to={secondary.to}
                href={secondary.href}>
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
