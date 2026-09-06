import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Coins, Gift, Trophy } from 'lucide-react';
import { BattleRewardOption } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const RewardModal: React.FC = () => {
  const {
    battleRewardOptions,
    combatPhase,
    currentEnemy,
    currentNodeIndex,
    selectBattleReward,
    skipBattleReward,
  } = useGameStore();
  const [hasClaimed, setHasClaimed] = React.useState(false);

  React.useEffect(() => setHasClaimed(false), [combatPhase, currentNodeIndex]);
  React.useEffect(() => {
    if (combatPhase === 'VICTORY' && !currentEnemy?.isBoss) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  }, [combatPhase, currentEnemy?.isBoss]);

  if (combatPhase !== 'VICTORY' || battleRewardOptions.length === 0 || currentEnemy?.isBoss) return null;

  const choose = (option: BattleRewardOption) => {
    if (hasClaimed) return;
    setHasClaimed(true);
    selectBattleReward(option);
  };

  return (
    <div className="modal-overlay">
      <div className="reward-card">
        <div className="reward-header">
          <div className="victory-badge">
            <div className="victory-icon-box"><Trophy size={24} /></div>
            <div>
              <div className="victory-title">VICTORY</div>
              <div className="victory-subtitle">
                擊敗了 {currentEnemy?.name ?? '強敵'}。選擇一份戰利品，永久貼紙會立即進入黏貼流程。
              </div>
            </div>
          </div>
        </div>

        <div className="reward-options-grid">
          {battleRewardOptions.map((option) => {
            if (option.kind === 'stickerPack') {
              return (
                <button type="button" key={option.id} onClick={() => choose(option)} className={`reward-option-card pack-option ${hasClaimed ? 'disabled' : ''}`} disabled={hasClaimed}>
                  <div className="card-tag-row"><span className="type-badge pack">貼紙包</span><span className="rarity-label">{option.pack.rarity}</span></div>
                  <div className="card-value-box"><Gift size={42} /><strong>{option.pack.stickerCount} 張</strong></div>
                  <div><div className="sticker-name">{option.pack.name}</div><div className="sticker-desc">{option.pack.description}</div></div>
                  <div className="btn-pick-reward">選擇並開啟 →</div>
                </button>
              );
            }
            const { sticker } = option;
            return (
              <button type="button" key={option.id} onClick={() => choose(option)} className={`reward-option-card ${hasClaimed ? 'disabled' : ''}`} disabled={hasClaimed}>
                <div className="card-tag-row"><span className="type-badge permanent">永久改造</span><span className="rarity-label">{sticker.rarity}</span></div>
                <div className="card-value-box"><div className="main-number">{sticker.baseValue}</div><CreatureBadge creature={sticker.creature} /></div>
                <div><div className="sticker-name">{sticker.name}</div><div className="sticker-desc">{sticker.description}</div></div>
                <div className="btn-pick-reward">選擇並處理 →</div>
              </button>
            );
          })}
        </div>

        <div className="reward-footer">
          <div className="footer-tip"><Coins size={16} color="#fbbf24" /><span>戰利金幣已自動入庫</span></div>
          <button type="button" onClick={skipBattleReward} disabled={hasClaimed} className="btn-skip-reward">
            跳過獎勵並前進<ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
