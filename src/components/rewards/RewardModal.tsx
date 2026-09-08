import { SkillText } from '../common/SkillText';
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dices, Gift, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';
import { RarityBadge } from '../dice/RarityBadge';

export const RewardModal: React.FC<{ onOpenDiceBag: () => void; inspectingDice: boolean }> = ({ onOpenDiceBag, inspectingDice }) => {
  const { battleRewardOptions, battleRewardPickCount, combatPhase, currentEnemy, currentNodeIndex,
    selectBattleRewards, skipBattleReward } = useGameStore();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => setSelected([]), [currentNodeIndex, combatPhase]);
  useEffect(() => {
    if (combatPhase === 'VICTORY' && battleRewardPickCount > 0)
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  }, [combatPhase, battleRewardPickCount]);
  if (combatPhase !== 'VICTORY' || battleRewardOptions.length === 0) return null;
  const choose = (id: string) => {
    if (battleRewardPickCount === 1) {
      selectBattleRewards(battleRewardOptions.filter((item) => item.id === id));
      return;
    }
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id)
      : current.length < battleRewardPickCount ? [...current, id] : current);
  };
  return <div className="modal-overlay" inert={inspectingDice} aria-hidden={inspectingDice || undefined}>
    <div className="reward-card" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-header"><div className="victory-badge">
        <div className="victory-icon-box"><Trophy size={24} /></div>
        <div><div className="victory-title" id="reward-title">擊敗 {currentEnemy?.name}</div>
          <div className="victory-subtitle">選擇 {battleRewardPickCount} 份戰利品，接著改造骰面。</div></div>
      </div>
        <button type="button" className="btn-view-dice" onClick={onOpenDiceBag}><Dices size={18} />查看骰池</button>
      </div>
      <div className="reward-options-grid">
        {battleRewardOptions.map((option) => <button type="button" key={option.id}
          aria-pressed={selected.includes(option.id)} onClick={() => choose(option.id)} className="reward-option-card">
          {option.kind === 'stickerPack' ? <>
            <div className="card-tag-row"><span className="type-badge pack">貼紙包</span><RarityBadge rarity={option.pack.rarity} /></div>
            <div className="card-value-box"><Gift size={36} /><strong>{option.pack.stickerCount} 張</strong></div>
            <div className="sticker-name">{option.pack.name}</div><div className="sticker-desc"><SkillText text={option.pack.description} /></div>
          </> : <>
            <div className="card-tag-row"><span className="type-badge permanent">永久改造</span><RarityBadge rarity={option.sticker.rarity} /></div>
            <div className="card-value-box"><div className="main-number">{'baseValue' in option.sticker && option.sticker.baseValue}</div>
              <CreatureBadge creature={option.sticker.creature} /></div>
            <div className="sticker-name">{option.sticker.name}</div><div className="sticker-desc"><SkillText text={option.sticker.description} /></div>
          </>}
          <div className="btn-pick-reward">{selected.includes(option.id) ? '✓ 已選取' : battleRewardPickCount === 1 ? '選擇並處理 →' : '選取'}</div>
        </button>)}
      </div>
      <div className="reward-footer">
        <button type="button" onClick={skipBattleReward} className="btn-skip-reward">略過獎勵並前進</button>
        {battleRewardPickCount > 1 && <button type="button" className="btn-primary-modal"
          disabled={selected.length !== battleRewardPickCount}
          onClick={() => selectBattleRewards(battleRewardOptions.filter((item) => selected.includes(item.id)))}>
          領取 {selected.length}/{battleRewardPickCount} 份</button>}
      </div>
    </div>
  </div>;
};
