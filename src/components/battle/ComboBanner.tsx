import React from 'react';
import { BattleComboSummary } from '../../service/battle/battleEngine';
import { Sparkles, Flame, Zap, Layers } from 'lucide-react';

interface ComboBannerProps {
  summary: BattleComboSummary | null;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ summary }) => {
  if (!summary || summary.activeCombos.length === 0) return null;

  return (
    <div className="combo-banner animate-fadeIn">
      {summary.activeCombos.map((combo, idx) => (
        <div key={idx} className="combo-badge">
          <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} className="animate-spin" />
          <span>{combo.title}</span>
          <span className="combo-desc-tag">{combo.description}</span>
        </div>
      ))}
      {summary.multiplier > 1 && (
        <div className="multiplier-badge">
          <span>總傷加乘 x{summary.multiplier.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};
