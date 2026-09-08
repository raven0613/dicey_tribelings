import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DiceNet } from './DiceNet';
import { DiceTabs } from './DiceTabs';
import { Dices, X } from 'lucide-react';

interface DiceInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiceInspectModal: React.FC<DiceInspectModalProps> = ({ isOpen, onClose }) => {
  const { dicePool, creatureBattleState } = useGameStore();
  const [selectedDiceId, setSelectedDiceId] = useState<string>(dicePool[0]?.id || '');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    return () => opener.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDie = dicePool.find((d) => d.id === selectedDiceId) || dicePool[0];
  return (
    <div className="modal-overlay dice-net-overlay dice-inspect-overlay"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="dice-net-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-inspect-title">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Dices size={20} />
            </div>
            <div className="modal-title-box">
              <div className="modal-title" id="dice-inspect-title">骰池庫藏 • 骰面展開圖</div>
              <div className="modal-subtitle">目前持有 {dicePool.length} 顆骰子，查看各面的土人、食物與構築關係</div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="關閉骰面檢視"
          >
            <X size={18} />
          </button>
        </div>

        <DiceTabs dicePool={dicePool} selectedDiceId={currentDie?.id} onSelect={setSelectedDiceId} />

        {currentDie && (
          <div className="dice-net-body">
            <div className="dice-meta-row">
              <span>骰子類型：<strong className="strong-val">{currentDie.dieType} ({currentDie.faces.length} 面)</strong></span>
              <span>儲糧：<strong className="theme-val">{creatureBattleState.storedFood[currentDie.id] ?? 0}</strong></span>
            </div>

            <DiceNet key={currentDie.id} dice={currentDie} />
          </div>
        )}
      </div>
    </div>
  );
};
