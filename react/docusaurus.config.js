// @ts-check
// Docusaurus 配置：站点直接位于仓库根目录，docs/ 下为七份大纲。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];
// Rsdoctor 构建分析按需启用：RSDOCTOR=true npm run build
// （instrument 开销大，且其 SDK 会挂住进程不退出，报告写完后需手动 Ctrl-C）
if (process.env.RSDOCTOR === 'true') {
  sitePlugins.push([
    '@docusaurus/plugin-rsdoctor',
    {
      rsdoctorOptions: {
        mode: 'lite',
      },
    },
  ]);
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React 高阶学习课程',
  tagline: '场景驱动的实战大纲：从基础编码到源码复刻',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/react/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/react/',

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

  // live codeblock：```jsx live / ```js live 代码块可在页面内直接运行
  // mermaid：```mermaid 代码块渲染为图表
  themes: ['@docusaurus/theme-live-codeblock', '@docusaurus/theme-mermaid'],

  plugins: sitePlugins,

  // .md 按纯 Markdown 解析（不启用 MDX），历史文档可原样迁移
  markdown: {
    format: 'detect',
    mermaid: true,
    // 历史文档中可能仍有少量坏链，先告警不阻断构建
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'React 高阶学习课程',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          {
            type: 'dropdown',
            label: '大纲导航',
            position: 'left',
            items: [
              { to: '/docs/react-学习大纲', label: '学习大纲（基础）' },
              { to: '/docs/react-进阶大纲-复杂场景', label: '进阶：复杂场景' },
              { to: '/docs/react-高阶场景全景图', label: '高阶场景全景图' },
              { to: '/docs/react-高阶场景-第二辑', label: '高阶场景第二辑' },
              { to: '/docs/react-组件库实战大纲', label: '组件库实战' },
              { to: '/docs/react-源码复刻大纲', label: '源码复刻' },
              { to: '/docs/react-复杂场景-项目复刻', label: '项目复刻手册' },
              { to: '/docs/写作指南-MDX-与在线代码块', label: '写作指南' },
            ],
          },
          {
            type: 'dropdown',
            label: '站群',
            position: 'right',
            items: [
              { label: '站群首页', href: 'https://yidafu.github.io/tech-learning/' },
              { label: '软件架构学习笔记', href: 'https://yidafu.github.io/tech-learning/architecture/' },
              { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
              { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
              { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
              { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
              { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
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
              { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
              { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
              { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
              { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
              { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · React 高阶学习课程 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
