import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import Playground from './Playground';
import styles from './Playground.module.css';

// 单个语言演练场页面的外壳：返回链 + 标题 + 语法速览 + Playground 本体。
export default function LanguagePage({ lang }) {
  const docsHref = `/docs/演练场/${lang.docSlug}`;
  return (
    <Layout title={`演练场 · ${lang.title}`} description={lang.tagline}>
      <main className="container margin-vert--lg">
        <div className="margin-bottom--sm">
          <Link to="/playground">← 语言演练场</Link>
          <span style={{ margin: '0 0.75rem', color: 'var(--ifm-color-emphasis-300)' }}>|</span>
          <Link to={docsHref}>讲解文档 →</Link>
        </div>
        <Heading as="h1">{lang.title}</Heading>
        <p>{lang.tagline}</p>
        <div className={styles.cheatsheet}>
          <div className={styles.cheatsheetTitle}>语法速览</div>
          <ul className={styles.cheatsheetList}>
            {lang.cheatsheet.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <Playground lang={lang} />
      </main>
    </Layout>
  );
}
