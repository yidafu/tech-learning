import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stages = [
  {
    title: '全局观与第一个窗口',
    dir: '第一阶段',
    desc: 'GUI 框架分层全景、保留模式与立即模式、主流框架架构地图、raylib 的定位与 ScriptC 工具链，跑通第一个原生窗口',
    tag: '建全局',
  },
  {
    title: '绘制层',
    dir: '第二阶段',
    desc: '把 raylib 原语包成平台无关的 Painter API：颜色与矩形、圆角与裁剪、变换与 z 序、图片与九宫格、显示列表',
    tag: '打地基',
  },
  {
    title: '文本与排版',
    dir: '第三阶段',
    desc: '字形与字体加载、文本度量、贪心断行、富文本 span 与省略号，为输入框做好几何地基',
    tag: '打地基',
  },
  {
    title: '控件树与布局',
    dir: '第四阶段',
    desc: 'Widget 树与 RenderObject 树分层、约束向下尺寸向上的单遍布局协议、盒模型、Row/Column/Stack、重布局边界',
    tag: '造引擎',
  },
  {
    title: '事件与交互',
    dir: '第五阶段',
    desc: '输入事件规范化、命中测试、捕获与冒泡、按压状态机、焦点链与 Tab 导航、手势识别、滚动容器',
    tag: '造引擎',
  },
  {
    title: '渲染管线与调度',
    dir: '第六阶段',
    desc: '帧循环与脏标记、脏矩形局部重绘的取舍、图层与合成、重绘边界、Ticker 与动画曲线、帧时间与绘制数度量',
    tag: '做优化',
  },
  {
    title: '声明式与响应式层',
    dir: '第七阶段',
    desc: 'signals 细粒度响应式（依赖追踪与传播）、声明式组件 API 与树协调、keyed 列表更新、生命周期、主题 token',
    tag: '做实战',
  },
  {
    title: '工程化与毕业项目',
    dir: '第八阶段',
    desc: '控件库补全（Button/TextField/ListView/Dialog）、虚拟列表、HiDPI、无头像素断言测试，对标 Flutter/Qt/Slint/egui，毕业项目三选一',
    tag: '做实战',
  },
];

const readingOrder = [
  { step: '1', label: '建全局', text: '第一阶段看清 GUI 框架的分层与 raylib 的位置——它是图形库不是框架，缺的每一层都由我们亲手补上。' },
  { step: '2', label: '打地基', text: '第二、三阶段做绘制层与文本排版，把像素和字形真正握在手里。' },
  { step: '3', label: '造引擎', text: '第四、五阶段建控件树、布局协议与事件系统，框架内核成形。' },
  { step: '4', label: '做优化与实战', text: '第六阶段做脏区重绘与动画调度，第七阶段加 signals 声明式层，第八阶段完成毕业项目。' },
];

const tagAccent = {
  建全局: 'primary',
  打地基: 'cyan',
  造引擎: 'green',
  做优化: 'purple',
  做实战: 'rose',
};

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="首页" description={siteConfig.tagline}>
      <SiteHero
        primary={{ to: '/docs/GUI框架学习大纲', label: '从学习大纲开始 →' }}
        secondary={{ to: '/docs/第一阶段/导览', label: '直达第一个窗口' }}
      />
      <main>
        <section className="container home-section">
          <Heading as="h2">建议阅读顺序</Heading>
          <ol className="reading-order">
            {readingOrder.map((item) => (
              <li key={item.step} className="reading-order__item">
                <span className="reading-order__step">{item.step}</span>
                <span className="reading-order__label">{item.label}</span>
                <span className="reading-order__text">{item.text}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="container home-section--last">
          <Heading as="h2">八个阶段</Heading>
          <FeatureCardGrid
            cards={stages.map((stage) => ({
              title: stage.title,
              desc: stage.desc,
              tag: stage.tag,
              accent: tagAccent[stage.tag] ?? 'primary',
              to: `/docs/${stage.dir}/导览`,
              path: `${stage.dir}/`,
            }))}
          />
        </section>
      </main>
    </Layout>
  );
}
