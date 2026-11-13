import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import FeatureCardGrid from '@site/src/components/site/FeatureCardGrid';

// 语言演练场总览：四种典型计算模型，每种一个可在浏览器直接运行的最小核心实现。
const languages = [
  {
    title: 'λ 演算 · 归约器',
    desc: '三条语法两条规则：α/β-归约、Church 编码、Y 组合子。正则序与应用序一步一个脚印地看。',
    tag: '计算模型',
    accent: 'purple',
    to: '/playground/lambda',
    path: 'playground/lambda',
  },
  {
    title: 'Lisp · 元循环解释器',
    desc: 'S-表达式 + eval/apply：两百行的动态类型函数式语言，闭包、递归、高阶函数全都有。',
    tag: '函数式',
    accent: 'cyan',
    to: '/playground/lisp',
    path: 'playground/lisp',
  },
  {
    title: 'Forth · 栈机',
    desc: '数据栈 + 字典：逆波兰序的极简命令式语言，与第五阶段的字节码 VM 同构对照。',
    tag: '栈式',
    accent: 'green',
    to: '/playground/forth',
    path: 'playground/forth',
  },
  {
    title: 'Prolog · 合一与回溯',
    desc: '事实 + 规则 + 查询：只声明「什么是真的」，引擎负责合一与深度优先回溯搜索。',
    tag: '逻辑式',
    accent: 'orange',
    to: '/playground/prolog',
    path: 'playground/prolog',
  },
];

export default function PlaygroundIndex() {
  return (
    <Layout
      title="语言演练场"
      description="四种典型编程语言的最小核心实现：λ 演算、Lisp、Forth、Prolog，浏览器里直接运行">
      <main className="container margin-vert--lg">
        <Heading as="h1">语言演练场</Heading>
        <p>
          主线 mini 语言之外的第二条腿：挑几种范式最典型的语言，各自实现一个
          <strong>语言核心最小集</strong>——每个解释器两三百行，通读一遍就能装进脑子里。
          换一圈视角再看 mini 语言的每个阶段，很多设计会突然显出「为什么」。
        </p>
        <ol
          style={{
            margin: '0 0 2rem',
            padding: '1rem 1.25rem',
            borderLeft: '4px solid var(--ifm-color-primary)',
            background: 'var(--ifm-color-emphasis-0)',
          }}>
          <li>
            先玩：每个演练场都有现成示例，改几行立刻看结果——<strong>先建立手感再谈理论</strong>。
          </li>
          <li>
            再读：配合 <Link to="/docs/演练场/导览">演练场分册讲解</Link>
            ，看懂每个解释器的核心算法。
          </li>
          <li>
            后拆：完整源码在仓库 <code>compiler/src/playground/</code> 下，四个文件互不依赖。
          </li>
        </ol>
        <FeatureCardGrid cards={languages} />
      </main>
    </Layout>
  );
}
