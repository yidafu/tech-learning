// 软件架构学习笔记阅读站点配置（Docusaurus，迁移自 VitePress 2026-11-04；
// 2026-11-07 站点根上移至仓库根，与笔记同层，不再有 docusaurus/ 子目录）
//
// 笔记源文件在仓库根（软件架构学习大纲.md、示例项目场景/、01-第一阶段/ ~ 06-第六阶段/），
// 以相对符号链接挂入 docs/，站点只做挂载与渲染；docs/ 只放符号链接，勿把笔记写入。
// `NN-` 数字前缀由 Docusaurus 自动解析为侧边栏顺序，并从 id/标题/URL 中剥离
// （目录名同理：01-第一阶段/ 的 URL 段是 /第一阶段/）。
//
// 五个关键点（①②③ 原设计决策，④⑤ 迁移排坑实录）：
// ① markdown.format: 'md' —— 全部笔记按纯 Markdown 解析（不走 MDX），
//    87 万字正文免受 JSX 花括号/尖括号影响；GFM（表格/删除线等）默认开启；
// ② onBrokenLinks: 'warn' —— 笔记中存在指向 .kt 示例、示例目录等非页面资源的链接，
//    宽容处理（等价旧站 ignoreDeadLinks）；
// ③ docs.routeBasePath: '/' —— 文档挂在站点根（/第一阶段/…），与 copy-samples.mjs
//    拷入 static/ 的 Kotlin 示例路径（/第一阶段/NNa-示例-…/*.kt）对齐，站内 .kt 链接可直接下载；
//    static/ 下的目录名必须是剥离 `NN-` 前缀后的 URL 段，否则相对链接解析不到。
// ④ package.json 不要写 "type": "module" —— Docusaurus 构建管线按 CJS 加载项目内生成物
//    （.docusaurus/registry.js 含 require.resolveWeak），写了会报
//    "require.resolveWeak is not a function"（官方已知问题，facebook/docusaurus#11326）；
//    需要 ESM 的文件用 .mjs 扩展名（本配置与 sidebars.mjs 即如此）。
// ⑤ resolve.symlinks: false —— 笔记以章节目录符号链接挂入 docs/，webpack 默认把模块解析到
//    真实路径（工作区根），与 docs 插件按 @site/docs/… 符号链接形态生成的元数据文件哈希对不上，
//    SSG 会全量报 "Cannot read properties of undefined (reading 'id')"；
//    关闭后模块资源保持在 docs/ 路径下，与元数据/include 匹配（等价旧站 preserveSymlinks: true）。
//
// 2026-11-06 参照另一项目的 Docusaurus 搭建手册（DOCUSAURUS-SETUP.md）补的三项增强：
// ⑥ theme.customCss 必须在 preset 里注册——不注册时 src/css/custom.css 不打包也不报错；
//    custom.css 钉住根背景色，防新版 Infima 的透明背景在嵌入式 webview 里透出黑底；
// ⑦ @docusaurus/theme-mermaid + markdown.mermaid: true —— ```mermaid 代码块在纯 MD 模式下直接渲染成图；
// ⑧ 知识图谱 /graph —— 本地插件 plugins/link-graph.mjs 以正文 .md 相对链接建边；未用手册推荐的
//    docusaurus-graph（需往笔记注入 frontmatter、每页同步加载 CDN 脚本，详见该插件头注释）。
//
// 中文 UI 文案：defaultLocale: 'zh-Hans'，主题自带简体中文翻译，无需 i18n 目录。

import linkGraph from './plugins/link-graph.mjs'

// 六阶段导航入口（阶段名 ↔ 导览页 slug）：目录为 NN-<阶段名>/、导览页文件为 01-<slug>.md，
// 两者的 `NN-` 前缀都会被剥离，所以 URL 是 /<阶段名>/<slug>
const stages = [
  ['第一阶段', '架构思维与设计基础'],
  ['第二阶段', '经典架构模式'],
  ['第三阶段', '分布式系统核心技术'],
  ['第四阶段', '架构方法论'],
  ['第五阶段', '工程化与运维视角'],
  ['第六阶段', '实战与案例分析'],
]

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '软件架构学习笔记',
  tagline: '六阶段软件架构学习笔记阅读站点',
  favicon: 'img/favicon.svg',
  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/architecture/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/architecture/',
  onBrokenLinks: 'warn',
  onDuplicateRoutes: 'warn',
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },
  markdown: {
    // ① markdown.format: 'md' —— 全部笔记按纯 Markdown 解析（不走 MDX），
    //    87 万字正文免受 JSX 花括号/尖括号影响；GFM（表格/删除线等）默认开启。
    //    （站群统一约定是 'detect'，本站因笔记体量有意保留 'md'，见 shared/README.md）
    format: 'md',
    mermaid: true,
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.mjs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  plugins: [
    // 见上方关键点 ⑤：符号链接挂载的笔记必须保持符号链接路径形态（模块资源路径与
    // docs 插件生成的元数据哈希、mdx-loader include 匹配都依赖路径形态一致）
    () => ({
      name: 'symlinked-content-keep-paths',
      configureWebpack() {
        return { resolve: { symlinks: false } }
      },
    }),
    // 见上方关键点 ⑧
    linkGraph,
  ],
  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: false,
        language: ['en', 'zh'],
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/',
      },
    ],
  ],
  themeConfig: {
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    navbar: {
      title: '软件架构学习笔记',
      logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
      items: [
        { to: '/', label: '首页', position: 'left' },
        { to: '/软件架构学习大纲', label: '大纲', position: 'left' },
        {
          type: 'dropdown',
          label: '六阶段笔记',
          position: 'left',
          items: stages.map(([stage, slug]) => ({
            to: `/${stage}/${slug}`,
            label: `${stage}：${slug}`,
          })),
        },
        { to: '/示例项目场景/导览', label: '示例项目场景', position: 'left' },
        { to: '/graph', label: '知识图谱', position: 'left' },
        {
          type: 'dropdown',
          label: '站群',
          position: 'right',
          items: [
            { label: '站群首页', href: 'https://yidafu.github.io/tech-learning/' },
            { label: 'React 高阶学习课程', href: 'https://yidafu.github.io/tech-learning/react/' },
            { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
            { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
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
            { label: 'React 高阶学习课程', href: 'https://yidafu.github.io/tech-learning/react/' },
            { label: 'JS/TS 深度学习笔记', href: 'https://yidafu.github.io/tech-learning/js-ts/' },
            { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
            { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
            { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
            { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
            { label: '编译原理学习站', href: 'https://yidafu.github.io/tech-learning/compiler/' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} yidafu · 软件架构学习笔记 · 用 Docusaurus 构建`,
    },
  },
}

export default config
