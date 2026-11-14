// @ts-check
// Docusaurus 配置：浏览器与网络原理学习站，docs/ 下为学习大纲与十个阶段。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '浏览器与网络原理学习站',
  tagline: '从敲下 URL 到像素上屏：沿一次真实请求走完 DNS、TCP/TLS、HTTP、CDN、缓存、解析、渲染管线全程，吃透浏览器与网络的每一层',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/browser/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/browser/',

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

  // mermaid：```mermaid 代码块渲染为图表（笔记中大量使用导航流程 / 握手时序 / 渲染管线图）
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
        title: '浏览器与网络原理学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/浏览器与网络原理学习大纲', label: '学习大纲', position: 'left' },
          {
            type: 'dropdown',
            label: '十阶段笔记',
            position: 'left',
            items: [
              { to: '/docs/第一阶段/导览', label: '01 · 全链路鸟瞰与度量' },
              { to: '/docs/第二阶段/导览', label: '02 · 导航与浏览器决策' },
              { to: '/docs/第三阶段/导览', label: '03 · 建立连接（DNS/TCP/TLS）' },
              { to: '/docs/第四阶段/导览', label: '04 · HTTP 协议与语义' },
              { to: '/docs/第五阶段/导览', label: '05 · 服务端与响应回程' },
              { to: '/docs/第六阶段/导览', label: '06 · 接收、缓存与调度' },
              { to: '/docs/第七阶段/导览', label: '07 · 解析与构建' },
              { to: '/docs/第八阶段/导览', label: '08 · 渲染管线' },
              { to: '/docs/第九阶段/导览', label: '09 · 首屏与交互' },
              { to: '/docs/第十阶段/导览', label: '10 · 实战与毕业' },
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
              { label: 'GUI 框架原理学习站', href: 'https://yidafu.github.io/tech-learning/gui/' },
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
              { label: 'GUI 框架原理学习站', href: 'https://yidafu.github.io/tech-learning/gui/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · 浏览器与网络原理学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
