import { useStoryStore } from '../../store/storyStore';
import { useShallow } from 'zustand/react/shallow';
import { CHAPTER_END_NODE, ROUTE_CONFIG } from '../../configs/regions/mapConfig';
import { BATTLE_LIMIT } from '../../configs/battleConfig';
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Skull, Trophy, House } from 'lucide-react';
import confetti from 'canvas-confetti';

export const GameOverModal: React.FC = () => {
  const { combatPhase, dicePool, equipments, currentNodeIndex, leader, mapNodes, creatureBattleState, playerHp } = useGameStore(useShallow((state) => ({
    combatPhase: state.combatPhase,
    dicePool: state.dicePool,
    equipments: state.equipments,
    currentNodeIndex: state.currentNodeIndex,
    leader: state.enemies[0],
    mapNodes: state.mapNodes,
    creatureBattleState: state.creatureBattleState,
    playerHp: state.playerHp,
  })));

  const returnToMenu = useStoryStore(state => state.returnToMenu);
  const timedOut = creatureBattleState.round >= BATTLE_LIMIT.rounds && playerHp > 0;
  const isDefeat = combatPhase === 'DEFEAT';
  const isFinalVictory = combatPhase === 'VICTORY' && leader?.isBoss && mapNodes[currentNodeIndex].id === CHAPTER_END_NODE && mapNodes[currentNodeIndex].completed;

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
          className={`game-over-icon-box ${isFinalVictory ? 'victory' : 'defeat'
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
            {isFinalVictory ? ROUTE_CONFIG.chapterTitle : timedOut ? '戰鬥回合耗盡' : '冒險中途倒下...'}
          </div>
          <div className="game-over-desc">
            {isFinalVictory
              ? ROUTE_CONFIG.chapterDescription
              : timedOut ? ` ${BATTLE_LIMIT.rounds} 回合內未能擊敗敵人，本次冒險結束。` : '骰運與戰術在最後一刻失衡，整備心情再次挑戰吧！'}
          </div>
        </div>

        {/* Run Stats */}
        <div className="stats-summary-card">
          <div className="stat-row">
            <span className="label">抵達節點：</span>
            <span className="val">第 {mapNodes.filter((node) => node.completed).length + Number(!mapNodes[currentNodeIndex].completed)} 格</span>
          </div>
          <div className="stat-row">
            <span className="label">骰池規模：</span>
            <span className="val-amber">{dicePool.length} 顆骰子</span>
          </div>
          <div className="stat-row">
            <span className="label">持有裝備：</span>
            <span className="val-indigo">{equipments.length} 件</span>
          </div>
        </div>

        <button
          onClick={returnToMenu}
          className="btn-return-menu"
        >
          <House className="ui-icon" />
          <span>回到主選單</span>
        </button>
      </div>
    </div>
  );
};
