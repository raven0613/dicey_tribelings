import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { StickerItem, ElementType } from '../../types/game';
import { Trophy, Flame, Wind, Zap, Snowflake, Circle, Coins, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const RewardModal: React.FC = () => {
  const { combatPhase, rewardStickerOptions, selectStickerReward, advanceToNextNode, currentEnemy, currentNodeIndex } =
    useGameStore();

  const [hasClaimed, setHasClaimed] = React.useState(false);

  React.useEffect(() => {
    setHasClaimed(false);
  }, [combatPhase, currentNodeIndex]);

  React.useEffect(() => {
    if (combatPhase === 'VICTORY' && !currentEnemy?.isBoss) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [combatPhase, currentEnemy?.isBoss]);

  // If not victory, or no reward options, or this was the final boss victory handled by GameOverModal
  if (combatPhase !== 'VICTORY' || rewardStickerOptions.length === 0 || currentEnemy?.isBoss) return null;

  const handleSelectReward = (sticker: StickerItem) => {
    if (hasClaimed) return;
    setHasClaimed(true);
    selectStickerReward(sticker);
  };

  const handleSkipReward = () => {
    if (hasClaimed) return;
    setHasClaimed(true);
    advanceToNextNode();
  };

  const getElementBadge = (elem: ElementType) => {
    switch (elem) {
      case 'fire':
        return <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Flame size={14} /> 火</span>;
      case 'wind':
        return <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wind size={14} /> 風</span>;
      case 'thunder':
        return <span style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={14} /> 雷</span>;
      case 'ice':
        return <span style={{ color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Snowflake size={14} /> 冰</span>;
      default:
        return <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Circle size={14} /> 普</span>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="reward-card">
        {/* Victory Header */}
        <div className="reward-header">
          <div className="victory-badge">
            <div className="victory-icon-box">
              <Trophy size={24} />
            </div>
            <div>
              <div className="victory-title">戰鬥大獲全勝！</div>
              <div className="victory-subtitle">
                擊敗了 {currentEnemy?.name || '強敵'}，獲得了金幣獎勵，請從下方選擇一張骰面貼紙以強化骰池！
              </div>
            </div>
          </div>
        </div>

        {/* Sticker 3-Pick Cards Grid */}
        <div className="reward-options-grid">
          {rewardStickerOptions.map((sticker) => (
            <div
              key={sticker.id}
              onClick={() => handleSelectReward(sticker)}
              className={`reward-option-card ${hasClaimed ? 'disabled' : ''}`}
            >
              {/* Top Type Tag */}
              <div className="card-tag-row">
                <span className={`type-badge ${sticker.isDisposable ? 'disposable' : 'permanent'}`}>
                  {sticker.isDisposable ? '一次性爆發' : '永久改造'}
                </span>
                <span className="rarity-label">
                  {sticker.rarity}
                </span>
              </div>

              {/* Center Value & Element */}
              <div className="card-value-box">
                <div className="main-number">{sticker.baseValue}</div>
                <div>{getElementBadge(sticker.element)}</div>
              </div>

              {/* Title & Description */}
              <div>
                <div className="sticker-name">{sticker.name}</div>
                <div className="sticker-desc">{sticker.description}</div>
              </div>

              {/* Action Prompt */}
              <div className="btn-pick-reward">
                選擇並貼上 →
              </div>
            </div>
          ))}
        </div>

        {/* Footer Skip / Direct Advance */}
        <div className="reward-footer">
          <div className="footer-tip" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Coins size={16} color="#fbbf24" />
            <span>戰利金幣已自動入庫</span>
          </div>

          <button
            onClick={handleSkipReward}
            disabled={hasClaimed}
            className="btn-skip-reward"
          >
            <span>跳過貼紙並前進</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
