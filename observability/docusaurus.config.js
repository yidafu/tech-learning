// @ts-check

const sitePlugins = [];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '可观测性学习站',
  tagline: 'Metrics · Logging · Tracing —— 面向开发者的可观测性系统学习笔记与动手实验',
  favicon: 'img/favicon.svg',
  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/observability/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/observability/',

  // 中文内容站点：默认语言即中文，无需 i18n 目录
  i18n: { defaultLocale: 'zh-Hans', locales: ['zh-Hans'] },

  // 站群统一约定：链接失效只告警不阻断（见 shared/README.md）
  onBrokenLinks: 'warn',

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: { sidebarPath: require.resolve('./sidebars.js') },
        blog: false,
        // 必须注册，否则 src/css/custom.css 不会被打包（不报错、静默失效）
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],

  // 关键：.md 按纯 Markdown 解析（不走 MDX），存量笔记零改动迁移
  markdown: {
    format: 'detect',
    // 3.10 起 onBrokenMarkdownLinks 移到这里（顶层位置已废弃）
    hooks: { onBrokenMarkdownLinks: 'warn' },
    // mermaid 图（阶段 0/4 笔记与 lab00/lab04 共 8 个图）
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],
  plugins: sitePlugins,

  themeConfig: /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
    navbar: {
      title: '可观测性学习站',
      logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
      items: [
        { to: '/', label: '首页', position: 'left' },
        {
          type: 'dropdown',
          label: '学习笔记',
          position: 'left',
          items: [
            // 用路由字符串 to: 而不是 type:'doc'，避免 docId 解析报错
            { to: '/docs/notes/concepts', label: '阶段 0 · 概念基础' },
            { to: '/docs/notes/metrics', label: '阶段 1 · 指标 Metrics' },
            { to: '/docs/notes/logging', label: '阶段 2 · 日志 Logging' },
            { to: '/docs/notes/tracing', label: '阶段 3 · 链路追踪 Tracing' },
            { to: '/docs/notes/integration', label: '阶段 4 · 整合与告警' },
            { to: '/docs/notes/production', label: '阶段 5 · 生产进阶' },
            { to: '/docs/notes/system-design', label: '阶段 6 · 系统设计' },
          ],
        },
        {
          type: 'dropdown',
          label: '动手实验',
          position: 'left',
          items: [
            { to: '/docs/labs/lab00-otel-collector-basics', label: 'lab00 · OTel Collector 入门' },
            { to: '/docs/labs/lab01-prometheus-grafana', label: 'lab01 · Prometheus + Grafana' },
            { to: '/docs/labs/lab02-loki-vector-logging', label: 'lab02 · Loki + Vector 日志' },
            { to: '/docs/labs/lab03-otel-tracing-jaeger', label: 'lab03 · OTel Tracing + Jaeger' },
            { to: '/docs/labs/lab04-three-pillars', label: 'lab04 · 三支柱整合' },
            { to: '/docs/labs/lab05-sampling-and-profiling', label: 'lab05 · 采样与剖析' },
          ],
        },
        {
          type: 'dropdown',
          label: '站群',
          position: 'right',
          items: [
            { label: '站群首页', href: 'https://yidafu.github.io/tech-learning/' },
            { label: '软件架构学习笔记', href: 'https://yidafu.github.io/tech-learning/architecture/' },
            { label: 'React 高阶学习课程', href: 'https://yidafu.github.io/tech-learning/react/' },
            { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
            { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
            { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
            { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
            { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
          ],
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '站群导航',
          items: [
            { label: '站群首页', href: 'https://yidafu.github.io/tech-learning/' },
            { label: '软件架构学习笔记', href: 'https://yidafu.github.io/tech-learning/architecture/' },
            { label: 'React 高阶学习课程', href: 'https://yidafu.github.io/tech-learning/react/' },
            { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
            { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
            { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
            { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
            { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} yidafu · 可观测性学习站 · 用 Docusaurus 构建`,
    },
  }),
};

module.exports = config;
