import React from 'react';
import { DiceActionBar } from './DiceActionBar';
import { BattleComboSummary } from '../../service/battle/battleEngine';
import { useGameStore } from '../../store/gameStore';
import { Sparkles } from 'lucide-react';

interface ComboBannerProps {
  summary: BattleComboSummary | null;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ summary }) => {
  const phase = useGameStore((state) => state.combatPhase);
  if (phase !== 'CONTROL_PHASE') return null;
  return (
    <div className="combo-banner">
      <DiceActionBar />
      {summary?.activeCombos.map((combo, idx) => (
        <div key={idx} className="combo-badge" title={`${combo.title}：${combo.description}`}>
          <Sparkles style={{ width: '14px', height: '14px', color: '#fbbf24' }} className="animate-spin" />
          <span>{combo.title}</span>
          <span className="combo-desc-tag">{combo.description}</span>
        </div>
      ))}

    </div>
  );
};
