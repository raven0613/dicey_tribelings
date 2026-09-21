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
  const dicePool = useGameStore((state) => state.dicePool);
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
              <Dices className="ui-icon" />
            </div>
            <div className="modal-title-box">
              <div className="modal-title" id="dice-inspect-title">骰池庫藏 • 骰面展開圖</div>
              <div className="modal-subtitle">目前持有 {dicePool.length} 顆骰子，查看骰面與構築關係</div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="關閉骰面檢視"
          >
            <X className="ui-icon" />
          </button>
        </div>

        <DiceTabs dicePool={dicePool} selectedDiceId={currentDie?.id} onSelect={setSelectedDiceId} />

        {currentDie && (
          <div className="dice-net-body">
            <DiceNet key={currentDie.id} dice={currentDie} />
          </div>
        )}
      </div>
    </div>
  );
};
