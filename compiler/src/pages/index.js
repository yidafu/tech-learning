import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SiteHero from '@site/src/components/site/SiteHero';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stages = [
  {
    title: '编译器全局观与语言基础',
    dir: '第一阶段',
    desc: '流水线全景（词法 → 语法 → 语义 → IR → 优化 → 生成）、前端工具链对照定位、形式语言与文法，搭好 compiler 工程',
    tag: '建全局',
  },
  {
    title: '词法分析',
    dir: '第二阶段',
    desc: '正则 → NFA → DFA 的理论链条，手写 lexer 的工程细节：token 设计、最长匹配、位置追踪与错误恢复',
    tag: '打地基',
  },
  {
    title: '语法分析与 AST',
    dir: '第三阶段',
    desc: '递归下降、Pratt 优先级解析、LR 家族全景；AST 设计与 source span，一次扫描报出多个语法错误',
    tag: '打地基',
  },
  {
    title: '语义分析与类型系统',
    dir: '第四阶段',
    desc: '符号表与作用域树、类型检查与 Hindley-Milner 推导入门，resolve + check 双遍架构与诊断设计',
    tag: '打地基',
  },
  {
    title: '中间表示与字节码虚拟机',
    dir: '第五阶段',
    desc: 'IR 家族（TAC / CFG / SSA）、字节码设计、栈式解释器与闭包 upvalue，跑通函数、递归与高阶函数',
    tag: '造引擎',
  },
  {
    title: '运行时与内存管理',
    dir: '第六阶段',
    desc: '值的表示（tagged pointer / NaN-boxing）、标记-清除 GC、分代假说与三色标记，对照 V8 实测',
    tag: '造引擎',
  },
  {
    title: '优化技术',
    dir: '第七阶段',
    desc: '数据流分析与不动点、SSA 与 φ 函数、常量折叠 / 死代码消除等经典 pass；tree-shaking 与 minify 的编译原理本质',
    tag: '做优化',
  },
  {
    title: '现代编译器与前端工程实战',
    dir: '第八阶段',
    desc: 'Babel 插件开发、mini-lint、tsc 架构、esbuild / SWC 为什么快、WASM 后端选做，毕业项目三选一',
    tag: '做实战',
  },
];

const playground = {
  title: '语言演练场',
  desc: '四种计算模型的最小核心：λ 演算 / Lisp / Forth / Prolog，浏览器里直接跑——换一圈视角看 mini 语言的每个设计为什么如此。',
  tag: '做实战',
};

const readingOrder = [
  { step: '1', label: '建全局', text: '第一阶段先看清编译器流水线全景，知道 Babel / tsc / esbuild 各自在做哪一段。' },
  { step: '2', label: '走前端', text: '第二到四阶段吃透词法、语法、语义三段，把 mini 语言从字符流推进到带类型的 AST。' },
  { step: '3', label: '造引擎', text: '第五、六阶段自研字节码 VM 与 GC，让 mini 语言真正跑起来。' },
  { step: '4', label: '做优化与实战', text: '第七阶段加优化 pass，第八阶段对标真实编译器源码并完成毕业项目。' },
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
        primary={{ to: '/docs/编译原理学习大纲', label: '从学习大纲开始 →' }}
        secondary={{ to: '/docs/第五阶段/导览', label: '直达字节码虚拟机' }}
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
        <section className="container home-section">
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
        <section className="container home-section--last">
          <Heading as="h2">语言演练场</Heading>
          <FeatureCardGrid
            cards={[
              {
                title: playground.title,
                desc: playground.desc,
                tag: playground.tag,
                accent: tagAccent[playground.tag] ?? 'primary',
                to: '/playground',
                path: 'playground/',
              },
            ]}
          />
        </section>
      </main>
    </Layout>
  );
}
