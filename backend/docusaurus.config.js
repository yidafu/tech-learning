// @ts-check
// Docusaurus 配置：后端开发学习站（Kotlin + Spring Boot），docs/ 下为学习大纲与十二个阶段。

// 部署路径：GitHub Pages 项目站子目录，PWA 的 manifest scope / start_url / 图标都必须带这段前缀
const BASE_PATH = '/tech-learning/backend/';

// docusaurus-graph：构建后生成文档关系图（build/docusaurus-graph.json，站点右上角入口）
// plugin-pwa：Service Worker 预缓存整站，供 iPad「添加到主屏幕」后离线阅读。
// offlineModeActivationStrategies 显式用 'always'：iOS 上 appInstalled / standalone 探测并不可靠，
// 一旦某次启动没判定为独立模式，就不会触发预缓存，表现为「装了却离线打不开」。
const sitePlugins = [
  'docusaurus-graph',
  [
    '@docusaurus/plugin-pwa',
    {
      debug: false,
      offlineModeActivationStrategies: ['always'],
      pwaHead: [
        { tagName: 'link', rel: 'manifest', href: `${BASE_PATH}manifest.json` },
        { tagName: 'link', rel: 'icon', href: `${BASE_PATH}img/favicon.svg` },
        { tagName: 'link', rel: 'apple-touch-icon', href: `${BASE_PATH}img/apple-touch-icon.png` },
        { tagName: 'meta', name: 'theme-color', content: '#df4588' },
        { tagName: 'meta', name: 'mobile-web-app-capable', content: 'yes' },
        { tagName: 'meta', name: 'apple-mobile-web-app-capable', content: 'yes' },
        { tagName: 'meta', name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { tagName: 'meta', name: 'apple-mobile-web-app-title', content: '后端学习' },
      ],
    },
  ],
];

const SITE_BASE = 'https://yidafu.github.io/tech-learning';

// 站群导航：新站加进 SITES 后，navbar 下拉与 footer 自动同步
const SITES = [
  { label: '站群首页', href: `${SITE_BASE}/` },
  { label: '软件架构学习笔记', href: `${SITE_BASE}/architecture/` },
  { label: 'React 高阶学习课程', href: `${SITE_BASE}/react/` },
  { label: 'JS/TS 深度学习笔记', href: `${SITE_BASE}/js-ts/` },
  { label: '可观测性学习站', href: `${SITE_BASE}/observability/` },
  { label: '安全学习笔记', href: `${SITE_BASE}/security/` },
  { label: 'RN 原理学习站', href: `${SITE_BASE}/react-native/` },
  { label: 'WebGL 与 3D 框架学习站', href: `${SITE_BASE}/webgl/` },
  { label: '编译原理学习站', href: `${SITE_BASE}/compiler/` },
  { label: 'GUI 框架原理学习站', href: `${SITE_BASE}/gui/` },
  { label: '浏览器与网络原理学习站', href: `${SITE_BASE}/browser/` },
];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '后端开发学习站',
  tagline: 'Kotlin + Spring Boot：从一次 HTTP 请求进容器，到单服务生产化，再到微服务与大型应用',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/backend/
  url: 'https://yidafu.github.io',
  baseUrl: BASE_PATH,

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

  // mermaid：```mermaid 代码块渲染为图表（笔记中大量使用请求时序 / 事务边界 / 服务拓扑图）
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
        title: '后端开发学习站',
        logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
        items: [
          { to: '/', label: '首页', position: 'left' },
          { to: '/docs/后端开发学习大纲', label: '学习大纲', position: 'left' },
          {
            type: 'dropdown',
            label: '十二阶段笔记',
            position: 'left',
            items: [
              { to: '/docs/第一阶段/导览', label: '01 · 全景与工程地基' },
              { to: '/docs/第二阶段/导览', label: '02 · Kotlin 服务端工程化' },
              { to: '/docs/第三阶段/导览', label: '03 · Spring 容器与启动原理' },
              { to: '/docs/第四阶段/导览', label: '04 · Web 层与接口契约' },
              { to: '/docs/第五阶段/导览', label: '05 · 数据层：SQL / 池 / 持久化' },
              { to: '/docs/第六阶段/导览', label: '06 · 事务、锁与一致性' },
              { to: '/docs/第七阶段/导览', label: '07 · 缓存与异步消息' },
              { to: '/docs/第八阶段/导览', label: '08 · 并发模型深潜' },
              { to: '/docs/第九阶段/导览', label: '09 · 安全与鉴权' },
              { to: '/docs/第十阶段/导览', label: '10 · 质量、可观测性与生产化' },
              { to: '/docs/第十一阶段/导览', label: '11 · 微服务与大型应用' },
              { to: '/docs/第十二阶段/导览', label: '12 · 毕业项目：单体到微服务' },
            ],
          },
          {
            type: 'dropdown',
            label: '站群',
            position: 'right',
            items: SITES,
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '站群导航',
            items: SITES,
          },
        ],
        copyright: `© ${new Date().getFullYear()} yidafu · 后端开发学习站 · 用 Docusaurus 构建`,
      },
    }),
};

module.exports = config;
