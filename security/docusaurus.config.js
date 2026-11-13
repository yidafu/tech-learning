// @ts-check

const sitePlugins = [];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '安全学习笔记',
  tagline: '计算机安全学习工作区 · 防御导向 · 从基础到 CTF 实战',
  favicon: 'img/favicon.svg',
  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/security/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/security/',

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
    mermaid: true,
    // 3.10 起 onBrokenMarkdownLinks 移到这里（顶层位置已废弃）
    hooks: { onBrokenMarkdownLinks: 'warn' },
  },

  themes: ['@docusaurus/theme-mermaid'],
  plugins: sitePlugins,

  themeConfig: /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
    navbar: {
      title: '安全学习笔记',
      logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
      items: [
        { to: '/', label: '首页', position: 'left' },
        { to: '/docs', label: '总索引', position: 'left' },
        {
          type: 'dropdown',
          label: '阶段目录',
          position: 'left',
          items: [
            // 用路由字符串 to: 而不是 type:'doc'，避免 docId 解析报错
            { to: '/docs/fundamentals', label: '1 · 基础' },
            { to: '/docs/security-concepts', label: '2 · 安全基础概念' },
            { to: '/docs/web-security', label: '3 · Web 安全' },
            { to: '/docs/binary-security', label: '4 · 系统与二进制安全' },
            { to: '/docs/network-defense', label: '5 · 网络安全与防御' },
            { to: '/docs/security-engineering', label: '6 · 安全工程' },
            { to: '/docs/ctf', label: '7 · CTF 实战' },
            { to: '/docs/android-security', label: '8 · Android 安全' },
            { to: '/docs/topics', label: '横向专题篇' },
            { to: '/docs/resources', label: '资源索引' },
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
            { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
            { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
            { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
            { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} yidafu · 安全学习笔记 · 用 Docusaurus 构建 · 仅用于本地隔离靶场或明确授权环境的防御性学习`,
    },
  }),
};

module.exports = config;
