// @ts-check
// Docusaurus 配置：WebGL 与 3D 框架学习站，docs/ 下为学习大纲与六个阶段。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'WebGL 与 3D 框架学习站',
  tagline: '从零吃透 WebGL 渲染原理，自研一个迷你 3D 框架：数学库、场景图、渲染器到 Three.js 对标',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/webgl/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/webgl/',

  // 内容为中文，站点默认语言即中文，无需 i18n 目录
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // 站群统一约定：链接失效只告警不阻断（见 shared/README.md）
  onBrokenLinks: 'warn',

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],

  // mermaid：```mermaid 代码块渲染为图表（笔记中大量使用架构图 / 流程图）
  themes: ['@docusaurus/theme-live-codeblock', '@docusaurus/theme-mermaid'],

  plugins: sitePlugins,

  // .md 按纯 Markdown 解析（不启用 MDX），便于后续内容增补
  markdown: {
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'WebGL 与 3D 框架学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/WebGL与3D框架学习大纲', label: '学习大纲', position: 'left' },
          {
            type: 'dropdown',
            label: '六阶段笔记',
            position: 'left',
            items: [
              { to: '/docs/第一阶段/导览', label: '01 · 渲染管线与 WebGL 入门' },
              { to: '/docs/第二阶段/导览', label: '02 · WebGL 核心渲染技术' },
              { to: '/docs/第三阶段/导览', label: '03 · 自研数学库与引擎雏形' },
              { to: '/docs/第四阶段/导览', label: '04 · 框架架构与工程化' },
              { to: '/docs/第五阶段/导览', label: '05 · 进阶渲染与性能' },
              { to: '/docs/第六阶段/导览', label: '06 · 源码对标与毕业项目' },
              { to: '/docs/数学专题/线性代数深化', label: '附 · 数学专题' },
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
              { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
              { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
              { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
              { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
              { label: 'GUI 框架原理学习站', href: 'https://yidafu.github.io/tech-learning/gui/' },
              { label: '浏览器与网络原理学习站', href: 'https://yidafu.github.io/tech-learning/browser/' },
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
              { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
              { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
              { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
              { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
              { label: 'GUI 框架原理学习站', href: 'https://yidafu.github.io/tech-learning/gui/' },
              { label: '浏览器与网络原理学习站', href: 'https://yidafu.github.io/tech-learning/browser/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · WebGL 与 3D 框架学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
