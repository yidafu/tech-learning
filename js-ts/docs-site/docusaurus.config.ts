// Docusaurus 站点配置（docs-only 模式）
// 笔记本体在 ../notes，本站点只「读取」，不移动、不复制任何笔记文件。
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// 条件逻辑放对象外，对象里只写 plugins: sitePlugins（手册 §5 踩坑：const/if 不能进对象字面量）。
// - docusaurus-graph：全站知识图谱，构建后生成 build/docusaurus-graph.json，
//   边只来自 front matter 的 references/sources（正文链接不参与建边），节点 id = 文件 basename。
//   docsDir 必须显式指向 ../notes：插件默认扫 docs/，本站是 docs-only + path 覆盖布局，缺省值直接 ENOENT。
//   上游坑：遍历目录遇 _ 开头文件是 return 不是 continue——若未来加 _category_.json 等下划线文件，
//   注意它可能让整个目录被漏扫（构建后核对 build/docusaurus-graph.json 节点数 = 笔记数）。
// - rsdoctor：构建产物分析。绝非常开——实测会把构建从 ~80s 拖到 15+ 分钟且进程挂住不退出，
//   必须用环境变量门控，配合 npm run build:analyze 使用。
const sitePlugins: Config['plugins'] = [
  ['docusaurus-graph', {docsDir: '../notes'}],
];
if (process.env.RSDOCTOR === 'true') {
  sitePlugins.push(['@docusaurus/plugin-rsdoctor', {rsdoctorOptions: {mode: 'lite'}}]);
}

const config: Config = {
  title: 'JS/TS 深度学习笔记',
  tagline: '从「会用」到「深度理解」',
  favicon: 'img/favicon.svg',

  // 部署到 GitHub Pages 项目站：https://yidafu.github.io/tech-learning/js-ts/
  url: 'https://yidafu.github.io',
  baseUrl: '/tech-learning/js-ts/',

  // 中文内容站点：默认语言即中文（影响 <html lang> 与无障碍）
  i18n: { defaultLocale: 'zh-Hans', locales: ['zh-Hans'] },

  // 笔记正文里常出现裸的 TS 语法（如 Array<T>、import 语句示例）。
  // 默认 MDX 模式会把 <T> 当 JSX 解析导致构建报错；
  // format: 'detect' 让 .md 按纯 Markdown 解析（.mdx 才启用 MDX）。
  markdown: {
    format: 'detect',
    // mermaid：```mermaid 代码块渲染成图（.md 直接可用，Markdown 层能力，无需 MDX）
    mermaid: true,
    hooks: {
      // 笔记里的相对链接（如指向 ../exercises/xxx.ts）不强制通过校验，只警告
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // 站内文档链接失效也只警告，不中断构建
  onBrokenLinks: 'warn',

  // live codeblock + mermaid 图表渲染
  themes: ['@docusaurus/theme-live-codeblock', '@docusaurus/theme-mermaid'],

  plugins: sitePlugins,

  presets: [
    [
      'classic',
      {
        docs: {
          // 关键：文档目录直接指向 ../notes（相对于本目录 docs-site/）
          path: '../notes',
          // 文档挂在根路由 /（docs-only 模式），打开首页即见笔记
          routeBasePath: '/',
          // 侧边栏自动生成：notes/ 按阶段子目录分组（stage-0-setup … stage-5-topics），
          // 每个子目录成为一个分类；文件名数字前缀（00-、01-…）只决定排序，
          // 不进入 doc id / URL（Docusaurus 自动剥离）。
          // 各阶段分类在此统一改中文标签，并挂一个该阶段的目录索引页；
          // 最外层再包一层「全部笔记」（站点首页由 src/pages/index.js 提供）。
          // 新增笔记放进对应阶段子目录即自动出现。
          sidebarItemsGenerator: async ({
            defaultSidebarItemsGenerator,
            ...args
          }) => {
            const items = (await defaultSidebarItemsGenerator(args)) as Array<{
              type: string;
              id?: string;
              label?: string;
              items?: Array<{type: string; id?: string}>;
            }>;

            // 阶段子目录 → 分类标签（同时用作该阶段索引页标题）
            const STAGE_LABELS: Record<string, string> = {
              'stage-0-setup': '阶段 0 · 环境准备',
              'stage-1-js-core': '阶段 1 · JavaScript 核心机制',
              'stage-2-engine-runtime': '阶段 2 · 引擎与运行时',
              'stage-3-ts-types': '阶段 3 · TypeScript 类型系统',
              'stage-4-engineering': '阶段 4 · 工程化',
              'stage-5-topics': '阶段 5 · 专题深入',
            };
            // 阶段 1 内部顺序：补充笔记紧跟其基础篇（29 → 03 之后、31 → 04 之后），里程碑殿后。
            // 注意：doc id 里的文件名数字前缀已被 Docusaurus 剥离，所以键用剥前缀后的 id
            const STAGE1_ORDER: Record<string, number> = {
              'types-and-coercion': 0,
              'scope-and-closure': 1,
              'this-and-prototype': 2,
              'prototype-chain-supplement': 3, // 29，深化补充紧跟 03
              'async-programming': 4,
              'async-supplement': 5, // 31，深化补充紧跟 04
              'es2015-plus': 6,
              'memory-management': 7,
              'milestone-implementations': 8, // 25，里程碑殿后
            };

            const stage1Rank = (id: string) => {
              const base = id.split('/').pop() ?? '';
              return STAGE1_ORDER[base] ?? 9; // 新增笔记自动排在末尾
            };

            const stageCategories = items.map((item) => {
              if (item.type !== 'category') return item;
              // 用子项 doc id 的首段识别该分类对应哪个阶段子目录
              const dir = item.items
                ?.map((child) => (child.type === 'doc' ? child.id?.split('/')[0] : ''))
                .find((d) => d !== undefined && d in STAGE_LABELS);
              if (!dir) return item;
              const ordered =
                dir === 'stage-1-js-core' && item.items
                  ? [...item.items].sort(
                      (a, b) => stage1Rank(a.id ?? '') - stage1Rank(b.id ?? ''),
                    )
                  : item.items;
              return {
                ...item,
                label: STAGE_LABELS[dir],
                items: ordered,
                link: {
                  type: 'generated-index',
                  slug: dir,
                  title: STAGE_LABELS[dir],
                },
              };
            });

            return [
              {
                type: 'category',
                label: '全部笔记',
                collapsible: false,
                items: stageCategories,
                // 站点首页由 src/pages/index.js 提供（站群统一模板），
                // 这里不再用 slug: '/' 抢占根路由
                link: {
                  type: 'generated-index',
                  title: 'JS/TS 深度学习笔记',
                },
              },
            ];
          },
        },
        // 不需要博客
        blog: false,
        // 站群统一主题（源头 shared/theme/custom.css，由 sync-theme.mjs 同步）
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ] as Config['presets'],

  themeConfig: {
    navbar: {
      title: 'JS/TS 深度学习笔记',
      logo: { alt: 'tech-learning 站群 logo', src: 'img/logo.svg' },
      items: [
        { to: '/', label: '首页', position: 'left' },
        { to: '/live-playground', label: 'Playground', position: 'left' },
        {
          type: 'dropdown',
          label: '站群',
          position: 'right',
          items: [
            { label: '站群首页', href: 'https://yidafu.github.io/tech-learning/' },
            { label: '软件架构学习笔记', href: 'https://yidafu.github.io/tech-learning/architecture/' },
            { label: 'React 高阶学习课程', href: 'https://yidafu.github.io/tech-learning/react/' },
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
            { label: '可观测性学习站', href: 'https://yidafu.github.io/tech-learning/observability/' },
            { label: '安全学习笔记', href: 'https://yidafu.github.io/tech-learning/security/' },
            { label: 'RN 原理学习站', href: 'https://yidafu.github.io/tech-learning/react-native/' },
            { label: 'WebGL 与 3D 框架学习站', href: 'https://yidafu.github.io/tech-learning/webgl/' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} yidafu · JS/TS 深度学习笔记 · 用 Docusaurus 构建`,
    },
    prism: {
      // 代码块高亮补充 TypeScript 语言
      additionalLanguages: ['typescript'],
    },
  } satisfies Config.ThemeConfig,
};

export default config;
