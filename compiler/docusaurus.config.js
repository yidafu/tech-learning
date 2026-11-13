// @ts-check
// Docusaurus 配置：编译原理学习站，docs/ 下为学习大纲与八个阶段。

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
const sitePlugins = ['docusaurus-graph'];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '编译原理学习站',
  tagline: '从词法到字节码：用 TypeScript 造一门 mini 语言，吃透 Babel / TypeScript / esbuild 背后的编译原理',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/compiler/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/compiler/',

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

  // mermaid：```mermaid 代码块渲染为图表（笔记中大量使用流水线 / 控制流图）
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
        title: '编译原理学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/编译原理学习大纲', label: '学习大纲', position: 'left' },
          {
            type: 'dropdown',
            label: '八阶段笔记',
            position: 'left',
            items: [
              { to: '/docs/第一阶段/导览', label: '01 · 全局观与语言基础' },
              { to: '/docs/第二阶段/导览', label: '02 · 词法分析' },
              { to: '/docs/第三阶段/导览', label: '03 · 语法分析与 AST' },
              { to: '/docs/第四阶段/导览', label: '04 · 语义分析与类型系统' },
              { to: '/docs/第五阶段/导览', label: '05 · IR 与字节码虚拟机' },
              { to: '/docs/第六阶段/导览', label: '06 · 运行时与内存管理' },
              { to: '/docs/第七阶段/导览', label: '07 · 优化技术' },
              { to: '/docs/第八阶段/导览', label: '08 · 现代编译器实战' },
            ],
          },
          {
            type: 'dropdown',
            label: '演练场',
            position: 'left',
            items: [
              { to: '/playground', label: '总览' },
              { to: '/playground/lambda', label: 'λ 演算 · 归约器' },
              { to: '/playground/lisp', label: 'Lisp · 元循环' },
              { to: '/playground/forth', label: 'Forth · 栈机' },
              { to: '/playground/prolog', label: 'Prolog · 合一与回溯' },
              { to: '/docs/演练场/导览', label: '分册讲解（文档）' },
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
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · 编译原理学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
