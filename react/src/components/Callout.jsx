import React from 'react';

// 供 MDX 静态嵌入使用的提示框组件：构建时渲染为纯 HTML，无客户端运行时开销。
// 用法：<Callout type="tip" title="标题">内容（支持 Markdown 行内语法）</Callout>
const TYPES = ['info', 'tip', 'warning', 'danger'];

export default function Callout({ type = 'info', title, children }) {
  const t = TYPES.includes(type) ? type : 'info';
  return (
    <div className={`callout callout--${t}`}>
      {title && <div className="callout__title">{title}</div>}
      <div className="callout__body">{children}</div>
    </div>
  );
}
