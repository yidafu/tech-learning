// @ts-check
// Docusaurus 配置：GUI 框架原理学习站，docs/ 下为学习大纲与八个阶段。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'GUI 框架原理学习站',
  tagline: '从像素到组件：用 TypeScript 驱动 raylib，造一个自绘 GUI 框架，吃透窗口、绘制、布局、事件与响应式背后的核心概念',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/gui/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/gui/',

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

  // mermaid：```mermaid 代码块渲染为图表（笔记中大量使用分层架构图 / 帧流水线）
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
        title: 'GUI 框架原理学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/GUI框架学习大纲', label: '学习大纲', position: 'left' },
          {
            type: 'dropdown',
            label: '八阶段笔记',
            position: 'left',
            items: [
              { to: '/docs/第一阶段/导览', label: '01 · 全局观与第一个窗口' },
              { to: '/docs/第二阶段/导览', label: '02 · 绘制层' },
              { to: '/docs/第三阶段/导览', label: '03 · 文本与排版' },
              { to: '/docs/第四阶段/导览', label: '04 · 控件树与布局' },
              { to: '/docs/第五阶段/导览', label: '05 · 事件与交互' },
              { to: '/docs/第六阶段/导览', label: '06 · 渲染管线与调度' },
              { to: '/docs/第七阶段/导览', label: '07 · 声明式与响应式层' },
              { to: '/docs/第八阶段/导览', label: '08 · 工程化与毕业项目' },
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
              { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
              { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
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
              { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
              { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
              { label: '浏览器与网络原理学习站', href: 'https://yidafu.github.io/tech-learning/browser/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · GUI 框架原理学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
