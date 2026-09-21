import { useShallow } from 'zustand/react/shallow';
import { StickerPlacementDialog } from '../stickers/StickerPlacementDialog';
import { MaterialBadge, materialStyle } from '../dice/MaterialBadge';
import { getEffectiveFace } from '../../service/dice/diceFaces';
import { SkillText } from '../common/SkillText';
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dices, Gift, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';
import { RarityBadge } from '../dice/RarityBadge';

export const RewardModal: React.FC<{ onOpenDiceBag: () => void; inspectingDice: boolean }> = ({ onOpenDiceBag, inspectingDice }) => {
  const { battleRewardOptions, battleRewardPickCount, battleRecovery, combatPhase, currentEnemy, currentNodeIndex,
    dicePool, applyBattleRewardSticker, claimBattleRewardPack, skipBattleReward } = useGameStore(useShallow((state) => ({
      battleRewardOptions: state.battleRewardOptions,
      battleRewardPickCount: state.battleRewardPickCount,
      battleRecovery: state.battleRecovery,
      combatPhase: state.combatPhase,
      currentEnemy: state.currentEnemy,
      currentNodeIndex: state.currentNodeIndex,
      dicePool: state.dicePool,
      applyBattleRewardSticker: state.applyBattleRewardSticker,
      claimBattleRewardPack: state.claimBattleRewardPack,
      skipBattleReward: state.skipBattleReward,
    })));
  const [previewId, setPreviewId] = useState<string | null>(null);
  const hasRewards = battleRewardPickCount > 0;
  useEffect(() => setPreviewId(null), [currentNodeIndex, combatPhase]);
  useEffect(() => {
    if (combatPhase === 'VICTORY' && hasRewards)
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  }, [combatPhase, hasRewards]);
  if (combatPhase !== 'VICTORY' || battleRewardOptions.length === 0) return null;
  const preview = battleRewardOptions.find((option) => option.id === previewId);
  const showingPreview = preview?.kind === 'sticker';
  const covered = inspectingDice || showingPreview;
  return <>
    <div className="modal-overlay" inert={covered} aria-hidden={covered || undefined}>
      <div className="reward-card" role="dialog" aria-modal="true" aria-labelledby="reward-title">
        <div className="reward-header"><div className="victory-badge">
          <div className="victory-icon-box"><Trophy className="ui-icon" /></div>
          <div><div className="victory-title" id="reward-title">擊敗 {currentEnemy?.name}</div>
            <div className="victory-subtitle">還可領取 {battleRewardPickCount} 份戰利品・點擊貼紙預覽並覆蓋。{battleRecovery > 0 && ` 首領恢復 +${battleRecovery} HP`}</div></div>
        </div>
          <button type="button" className="btn-view-dice" onClick={() => onOpenDiceBag()}><Dices className="ui-icon" />查看骰池</button>
        </div>

        <div className="reward-options-grid">
          {battleRewardOptions.map((option) => <article key={option.id} className="reward-option-card"
            data-material={option.kind === 'sticker' ? option.sticker.material : undefined}
            style={materialStyle(option.kind === 'sticker' ? option.sticker.material : undefined)}>
            <button type="button" className="reward-option-main" onClick={() => option.kind === 'sticker' ? setPreviewId(option.id) : claimBattleRewardPack(option.id)}>
              {option.kind === 'stickerPack' ? <>
                <div className="card-tag-row"><span className="type-badge pack">貼紙包</span><RarityBadge rarity={option.pack.rarity} /></div>
                <div className="card-value-box"><Gift size={36} /><strong>{option.pack.stickerCount} 張</strong></div>
                <div className="sticker-name">{option.pack.name}</div>
                <div className="sticker-desc"><SkillText text={option.pack.description} /></div>
              </> : <>
                <div className="card-tag-row">
                  <span className="type-badge permanent">
                    永久改造
                  </span>
                  <RarityBadge rarity={option.sticker.rarity} />
                </div>

                <div className="card-value-box">
                  <div className="main-number">{getEffectiveFace(option.sticker).baseValue}</div>
                  <CreatureBadge creature={option.sticker.creature} />
                </div>

                <MaterialBadge material={option.sticker.material} description />
                <div className="sticker-name">{option.sticker.name}</div>
                <div className="sticker-desc"><SkillText text={option.sticker.description} /></div>
              </>}
              <div className="btn-pick-reward">{option.kind === 'sticker' ? '預覽並覆蓋 →' : '領取並開包 →'}</div>
            </button>
          </article>)}
        </div>
        <div className="reward-footer">
          <button type="button" onClick={skipBattleReward} className="btn-skip-reward">略過剩餘獎勵並前進</button>
        </div>
      </div>
    </div>
    {showingPreview && <StickerPlacementDialog key={preview.id} sticker={preview.sticker} dicePool={dicePool}
      subtitle="預覽配置・點擊骰面即領取並覆蓋" exitLabel="返回選其他張"
      onExit={() => setPreviewId(null)}
      onApply={(diceId, faceIndex) => {
        applyBattleRewardSticker(preview.id, diceId, faceIndex);
        setPreviewId(null);
      }} />}
  </>;
};
