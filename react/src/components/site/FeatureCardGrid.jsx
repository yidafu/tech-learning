import React from 'react';
import FeatureCard from './FeatureCard';

// 站群统一首页卡片网格。cards 项即 FeatureCard 的 props。
// 唯一源头 shared/theme/components，由 sync-theme.mjs 同步，勿手改各站副本。
export default function FeatureCardGrid({ cards }) {
  return (
    <div className="card-grid">
      {cards.map((card) => (
        <FeatureCard key={card.title} {...card} />
      ))}
    </div>
  );
}
