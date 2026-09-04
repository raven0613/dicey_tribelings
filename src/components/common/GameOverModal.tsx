import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Skull, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

export const GameOverModal: React.FC = () => {
  const { combatPhase, restartGame, dicePool, equipments, currentNodeIndex, currentEnemy } = useGameStore();

  const isDefeat = combatPhase === 'DEFEAT';
  const isFinalVictory = combatPhase === 'VICTORY' && currentEnemy?.isBoss;

  React.useEffect(() => {
    if (isFinalVictory) {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
      });
    }
  }, [isFinalVictory]);

  if (!isDefeat && !isFinalVictory) return null;

  return (
    <div className="modal-overlay">
      <div className="game-over-card">
        {/* Icon Header */}
        <div
          className={`game-over-icon-box ${
            isFinalVictory ? 'victory' : 'defeat'
          }`}
        >
          {isFinalVictory ? (
            <Trophy size={40} />
          ) : (
            <Skull size={40} />
          )}
        </div>

        <div>
          <div className={`game-over-title ${isFinalVictory ? 'victory' : 'defeat'}`}>
            {isFinalVictory ? '通關大勝利！通關全境！' : '冒險中途倒下...'}
          </div>
          <div className="game-over-desc">
            {isFinalVictory
              ? '你成功擊敗了「骰之支配者」，用自製的強大骰池掌控了命運！'
              : '骰運與戰術在最後一刻失衡，整備心情再次挑戰吧！'}
          </div>
        </div>

        {/* Run Stats */}
        <div className="stats-summary-card">
          <div className="stat-row">
            <span className="label">抵達節點：</span>
            <span className="val">第 {currentNodeIndex + 1} 格</span>
          </div>
          <div className="stat-row">
            <span className="label">骰池規模：</span>
            <span className="val-amber">{dicePool.length} 顆骰子</span>
          </div>
          <div className="stat-row">
            <span className="label">持有裝備遺物：</span>
            <span className="val-indigo">{equipments.length} 件</span>
          </div>
        </div>

        <button
          onClick={restartGame}
          className="btn-restart"
        >
          <RotateCcw size={16} />
          <span>重新開始冒險 (New Run)</span>
        </button>
      </div>
    </div>
  );
};
