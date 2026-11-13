// @ts-check
// Docusaurus 配置：ReactNative 原理学习站，docs/ 下为十二个原理模块。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ReactNative 原理学习站',
  tagline: '从启动、通信、渲染到新架构：拆解 ReactNative 的底层工作原理',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/react-native/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/react-native/',

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

  // mermaid：```mermaid 代码块渲染为图表（原理站大量使用架构图 / 时序图）
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
        title: 'ReactNative 原理学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          {
            type: 'dropdown',
            label: '模块导航',
            position: 'left',
            items: [
              { to: '/docs/rn-全景与演进', label: '01 · 全景与演进' },
              { to: '/docs/rn-启动流程原理', label: '02 · 启动流程原理' },
              { to: '/docs/rn-JS引擎与线程模型', label: '03 · JS 引擎与线程模型' },
              { to: '/docs/rn-Bridge通信原理', label: '04 · Bridge 通信原理' },
              { to: '/docs/rn-渲染原理', label: '05 · 渲染原理' },
              { to: '/docs/rn-事件系统原理', label: '06 · 事件系统原理' },
              { to: '/docs/rn-新架构', label: '07 · 新架构 JSI/Fabric' },
              { to: '/docs/rn-Metro打包与热更新', label: '08 · Metro 打包与热更新' },
              { to: '/docs/rn-性能优化原理', label: '09 · 性能优化原理' },
              { to: '/docs/rn-原理实战', label: '10 · 原理实战' },
              { to: '/docs/rn-测试体系', label: '11 · 测试体系' },
              { to: '/docs/rn-混合开发', label: '12 · 混合开发' },
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
              { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
              { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
              { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
              { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · ReactNative 原理学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
