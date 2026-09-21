import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { Dices } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const DiceUnlockModal: React.FC = () => {
  const { unlockedDiceNotification, dismissDiceNotification } = useGameStore(useShallow((state) => ({
    unlockedDiceNotification: state.unlockedDiceNotification,
    dismissDiceNotification: state.dismissDiceNotification,
  })));
  if (!unlockedDiceNotification) return null;

  return (
    <div className="modal-overlay">
      <div className="dice-unlock-card">
        <div className="modal-icon-badge"><Dices className="ui-icon" /></div>
        <h2>關卡進度獎勵</h2>
        <h3>{unlockedDiceNotification.name}</h3>
        <p>新骰子已永久加入本次冒險的骰池，共 {unlockedDiceNotification.faces.length} 個骰面。</p>
        <button type="button" className="btn-primary-modal" onClick={dismissDiceNotification}>收下骰子</button>
      </div>
    </div>
  );
};
